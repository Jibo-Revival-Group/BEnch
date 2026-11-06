'use strict';
// JiboSync (BEacon › Etc): copy one person's face and voice enrollment between robots.
// These files are root-only, so BEacon (uid 2000) asks jibo-sync-helper, which uses this module.
const fs = require('fs');
const path = require('path');

const ID_RE = /^[A-Za-z0-9-]{1,64}$/;
const FILE_RE = /^[A-Za-z0-9._-]{1,200}$/;
const MAX_SUBJECTS = 16; // jibo-identity-service.json manager.max_subjects

function paths (root) {
    const r = root || '';
    return {
        identity: r + '/var/jibo/identity',
        deepid: r + '/var/jibo/identity/deepid',
        data: r + '/var/jibo/identity/deepid.data',
        faces: r + '/var/jibo/identity/faces',
        index: r + '/var/jibo/identity/faces/index.json',
        backup: r + '/var/jibo/identity/.jibosync-prev',
        audio: r + '/var/jibo/asr/sensory_data_td/audio',
        pending: r + '/var/jibo/asr/sensory_data_td/pending_audio'
    };
}

function checkId (id) {
    if (!ID_RE.test(String(id || ''))) throw new Error('bad person id');
    return String(id);
}
function checkFile (name) {
    if (!FILE_RE.test(String(name || '')) || name === '.' || name === '..') throw new Error('bad file name');
    return String(name);
}

// deepid.data (cereal binary): u32 example count, u64 subject count, one block per subject
// (u64-length strings key, name, u64 count + crop paths, then opaque embeddings), then u64 count + keys.
function u64 (buf, o) { return buf.readUInt32LE(o) + buf.readUInt32LE(o + 4) * 0x100000000; }
function str (buf, o) {
    const n = u64(buf, o);
    if (n > 4096 || o + 8 + n > buf.length) return null;
    return { value: buf.toString('utf8', o + 8, o + 8 + n), end: o + 8 + n };
}
function isKeyAt (buf, o, key) {
    const s = str(buf, o);
    return !!s && ID_RE.test(s.value) && (key == null || s.value === key) ? s : null;
}

function readDeepId (buf) {
    if (!buf || buf.length < 12) return [];
    const n = u64(buf, 4);
    const blocks = [];
    let o = 12;
    for (let i = 0; i < n; i++) {
        const key = isKeyAt(buf, o);
        const name = key && isKeyAt(buf, key.end, key.value);
        if (!name) throw new Error('deepid.data: subject ' + i + ' not found');
        let p = name.end;
        const count = u64(buf, p); p += 8;
        const crops = [];
        for (let c = 0; c < count; c++) {
            const s = str(buf, p);
            if (!s) throw new Error('deepid.data: bad crop path');
            crops.push(s.value); p = s.end;
        }
        // The embeddings are opaque: the block ends where the next subject (or the key trailer) starts.
        let end = -1;
        for (let q = p; q + 16 <= buf.length; q++) {
            const k = isKeyAt(buf, q);
            if (k && i + 1 < n && isKeyAt(buf, k.end, k.value)) { end = q; break; }
            if (i + 1 === n && u64(buf, q) === n && isKeyAt(buf, q + 8, blocks.length ? blocks[0].key : key.value)) { end = q; break; }
        }
        if (end < 0) throw new Error('deepid.data: end of subject ' + i + ' not found');
        blocks.push({ key: key.value, name: name.value, crops: crops, tail: buf.slice(p, end) });
        o = end;
    }
    return blocks;
}

function writeDeepId (blocks) {
    const parts = [];
    const u32b = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v, 0); return b; };
    const u64b = (v) => { const b = Buffer.alloc(8); b.writeUInt32LE(v % 0x100000000, 0); b.writeUInt32LE(Math.floor(v / 0x100000000), 4); return b; };
    const strb = (s) => { const b = Buffer.from(s, 'utf8'); return Buffer.concat([u64b(b.length), b]); };
    parts.push(u32b(blocks.reduce((sum, b) => sum + b.crops.length, 0)), u64b(blocks.length));
    blocks.forEach((b) => {
        parts.push(strb(b.key), strb(b.name), u64b(b.crops.length));
        b.crops.forEach((c) => parts.push(strb(c)));
        parts.push(b.tail);
    });
    parts.push(u64b(blocks.length));
    blocks.forEach((b) => parts.push(strb(b.key)));
    return Buffer.concat(parts);
}

function readJson (file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) {
        if (err.code === 'ENOENT') return fallback;
        throw err;
    }
}
function listDir (dir) {
    try { return fs.readdirSync(dir); } catch (err) { return []; }
}
function writeAtomic (file, data, mode) {
    const tmp = file + '.jibosync-tmp';
    fs.writeFileSync(tmp, data, { mode: mode || 0o640 });
    fs.renameSync(tmp, file);
}
function ensureDir (dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, 0o750);
}

// Recording names start with their ISO time: 2026-09-16T19.22.17.002Z.enroll.<id>....GOOD.pcm
function recordingTime (name) {
    const m = /^(\d{4}-\d\d-\d\dT\d\d)\.(\d\d)\.(\d\d(?:\.\d+)?)Z/.exec(name);
    return m ? Date.parse(m[1] + ':' + m[2] + ':' + m[3] + 'Z') || 0 : 0;
}

/** Who has a face or voice here, and when it was last enrolled (ms): { faces: {id: {examples, last}}, voices: {id: {stamp}} }. */
function summary (root) {
    const P = paths(root);
    const faces = {};
    (readJson(P.index, { subjects: [] }).subjects || []).forEach((s) => {
        const data = s.value.ptr_wrapper.data || {};
        const ex = data.examples || [];
        if (ex.length) faces[s.key] = { examples: ex.length, last: Math.max.apply(null, ex.map((e) => (e.timestamp && e.timestamp[0]) || 0)) * 1000 };
    });
    const voices = {};
    listDir(P.audio).forEach((id) => {
        if (!ID_RE.test(id)) return;
        const times = listDir(path.join(P.audio, id)).filter((f) => /\.GOOD\.pcm$/.test(f)).map(recordingTime);
        if (times.length) voices[id] = { stamp: Math.max.apply(null, times) };
    });
    return { faces: faces, voices: voices };
}

/** One person's face and voice files, ready to send to another robot (base64). */
function exportPerson (root, id) {
    const P = paths(root);
    checkId(id);
    let face = null;
    const index = readJson(P.index, { subjects: [] });
    const subject = (index.subjects || []).find((s) => s.key === id);
    const blocks = fs.existsSync(P.data) ? readDeepId(fs.readFileSync(P.data)) : [];
    const block = blocks.find((b) => b.key === id);
    if (subject && block) {
        const data = subject.value.ptr_wrapper.data;
        face = {
            subject: data,
            block: writeDeepId([block]).toString('base64'),
            crops: block.crops.map((c) => {
                if (c.indexOf('/var/jibo/identity/deepid/' + id + '/') !== 0) throw new Error('unexpected crop path');
                return { name: path.basename(c), data: fs.readFileSync((root || '') + c).toString('base64') };
            }),
            frames: (data.examples || []).map((e) => ({ name: e.examples, data: fs.readFileSync(path.join(P.faces, checkFile(e.examples))).toString('base64') }))
        };
    }
    const pcms = listDir(path.join(P.audio, id)).filter((f) => /\.GOOD\.pcm$/.test(f)).sort();
    const voice = pcms.length ? { pcms: pcms.map((f) => ({ name: f, data: fs.readFileSync(path.join(P.audio, id, f)).toString('base64') })) } : null;
    return { id: id, face: face, voice: voice };
}

/**
 * Install exported people under local ids: item = { id (local), from (exported id), face?, voice? }.
 * Face: replaces that subject in faces/index.json + deepid.data (crop paths renamed to the local id).
 * Voice: stages the recordings in pending_audio/<id>; BEacon then calls createSpeakerModel(id) and commitVoice.
 * Returns the ids whose face changed (the identity service must reload) and the ids staged for voice.
 */
function importPeople (root, items) {
    const P = paths(root);
    const faceIds = [];
    const voiceIds = [];
    const withFace = items.filter((it) => it.face);
    if (withFace.length) {
        const index = readJson(P.index, { subjects: [] });
        let blocks = fs.existsSync(P.data) ? readDeepId(fs.readFileSync(P.data)) : [];
        const subjects = (index.subjects || []).map((s) => s.value.ptr_wrapper.data);
        withFace.forEach((it) => {
            const id = checkId(it.id);
            const from = checkId(it.from || it.id);
            const incoming = readDeepId(Buffer.from(it.face.block, 'base64'));
            if (incoming.length !== 1 || incoming[0].key !== from) throw new Error('face data for ' + from + ' is not one subject');
            const dir = path.join(P.deepid, id);
            const block = incoming[0];
            block.key = id; block.name = id;
            block.crops = block.crops.map((c) => '/var/jibo/identity/deepid/' + id + '/' + checkFile(path.basename(c)));
            const subject = JSON.parse(JSON.stringify(it.face.subject));
            subject.name = id;
            const old = subjects.findIndex((s) => s.name === id);
            // Frames share one folder, and the identity service deletes a removed person's frames: a frame name
            // another person here already uses gets this person's own copy, so removing one never deletes the other's.
            const taken = {};
            subjects.forEach((s, i) => { if (i !== old) (s.examples || []).forEach((e) => { taken[e.examples] = true; }); });
            const frames = it.face.frames.map((f) => ({ name: taken[checkFile(f.name)] ? id + '-' + f.name : f.name, from: f.name, data: f.data }));
            (subject.examples || []).forEach((e) => {
                const f = frames.filter((x) => x.from === e.examples)[0];
                if (f) e.examples = f.name;
            });
            if (old < 0 && subjects.length >= MAX_SUBJECTS) throw new Error('this Jibo already knows ' + MAX_SUBJECTS + ' faces');
            // Files first, index last: an interrupted import leaves the old index pointing at old files.
            ensureDir(P.deepid); ensureDir(dir);
            const keepCrops = block.crops.map((c) => path.basename(c));
            it.face.crops.forEach((c) => fs.writeFileSync(path.join(dir, checkFile(c.name)), Buffer.from(c.data, 'base64'), { mode: 0o640 }));
            listDir(dir).forEach((f) => { if (keepCrops.indexOf(f) < 0) fs.unlinkSync(path.join(dir, f)); });
            ensureDir(P.faces);
            frames.forEach((f) => fs.writeFileSync(path.join(P.faces, checkFile(f.name)), Buffer.from(f.data, 'base64'), { mode: 0o640 }));
            if (old >= 0) {
                const keep = (subject.examples || []).map((e) => e.examples);
                (subjects[old].examples || []).forEach((e) => {
                    if (keep.indexOf(e.examples) < 0) { try { fs.unlinkSync(path.join(P.faces, checkFile(e.examples))); } catch (err) { /* already gone */ } }
                });
                subjects[old] = subject;
            } else {
                subjects.push(subject);
            }
            const b = blocks.findIndex((x) => x.key === id);
            if (b >= 0) blocks[b] = block; else blocks.push(block);
            faceIds.push(id);
        });
        // Keep the previous index and data so a bad import can be put back by hand.
        ensureDir(P.backup);
        [P.index, P.data].forEach((f) => { if (fs.existsSync(f)) fs.writeFileSync(path.join(P.backup, path.basename(f)), fs.readFileSync(f), { mode: 0o640 }); });
        blocks = subjects.map((s) => blocks.find((b) => b.key === s.name)).filter(Boolean);
        writeAtomic(P.data, writeDeepId(blocks));
        writeAtomic(P.index, JSON.stringify({ subjects: subjects.map((s, i) => ({ key: s.name, value: { ptr_wrapper: { id: 0x80000001 + i, data: s } } })) }));
    }
    items.filter((it) => it.voice).forEach((it) => {
        const id = checkId(it.id);
        const from = checkId(it.from || it.id);
        const dir = path.join(P.pending, id);
        ensureDir(P.pending); ensureDir(dir);
        listDir(dir).forEach((f) => fs.unlinkSync(path.join(dir, f)));
        it.voice.pcms.forEach((p) => {
            const name = checkFile(p.name).split(from).join(id);
            fs.writeFileSync(path.join(dir, name), Buffer.from(p.data, 'base64'), { mode: 0o640 });
        });
        voiceIds.push(id);
    });
    return { faceIds: faceIds, voiceIds: voiceIds };
}

/**
 * After createSpeakerModel(id) built the voice model from the staged recordings, keep them where the
 * robot's own enrollment keeps them (audio/<id>), so this robot reports the voice and can pass it on.
 */
function commitVoice (root, id) {
    const P = paths(root);
    checkId(id);
    const from = path.join(P.pending, id);
    const to = path.join(P.audio, id);
    const files = listDir(from).filter((f) => FILE_RE.test(f));
    if (!files.length) throw new Error('no staged recordings for ' + id);
    ensureDir(P.audio); ensureDir(to);
    listDir(to).forEach((f) => fs.unlinkSync(path.join(to, f)));
    files.forEach((f) => fs.renameSync(path.join(from, f), path.join(to, f)));
    return { id: id, recordings: files.length };
}

/** After the voice model dropped this person: no recordings left behind (the summary reads them as a voice). */
function forgetVoice (root, id) {
    const P = paths(root);
    checkId(id);
    let removed = 0;
    [path.join(P.pending, id), path.join(P.audio, id)].forEach((dir) => {
        listDir(dir).forEach((f) => { fs.unlinkSync(path.join(dir, f)); removed++; });
        try { fs.rmdirSync(dir); } catch (err) { /* already gone */ }
    });
    return { id: id, removed: removed };
}

module.exports = { paths, readDeepId, writeDeepId, summary, exportPerson, importPeople, commitVoice, forgetVoice, MAX_SUBJECTS };
