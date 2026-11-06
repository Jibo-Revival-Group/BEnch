'use strict';
// JiboSync store: one robot's face + voice enrollment exported and installed on another robot.
// Run with Node 6: NODE=/root/node6/.../node tests/jibo-sync-store.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const childProcess = require('child_process');
const store = require('../usr/local/lib/jibo/jibo-sync-store.js');

function tmpRoot (name) {
    const r = fs.mkdtempSync(path.join(os.tmpdir(), 'jibosync-' + name + '-'));
    ['/var/jibo/identity/deepid', '/var/jibo/identity/faces', '/var/jibo/asr/sensory_data_td/audio',
        '/var/jibo/asr/sensory_data_td/pending_audio'].forEach((d) => mkdirp(r + d));
    return r;
}
function mkdirp (d) { if (!fs.existsSync(d)) { mkdirp(path.dirname(d)); fs.mkdirSync(d); } }
function tail (seed) {
    const b = Buffer.alloc(741);
    for (let i = 0; i < b.length; i++) b[i] = (i * 31 + seed * 7) & 0xff; // opaque embedding bytes
    return b;
}
// A robot with face subjects (5 crops + 5 frames each) and optional voice recordings.
function robot (name, people) {
    const r = tmpRoot(name);
    const P = store.paths(r);
    const blocks = [];
    const subjects = [];
    people.forEach((p, n) => {
        const crops = [];
        mkdirp(path.join(P.deepid, p.id));
        for (let i = 0; i < 5; i++) {
            const crop = p.id + '-crop' + i + '.png';
            fs.writeFileSync(path.join(P.deepid, p.id, crop), 'png ' + p.id + ' ' + i);
            crops.push('/var/jibo/identity/deepid/' + p.id + '/' + crop);
            fs.writeFileSync(path.join(P.faces, p.id + '-frame' + i + '.jpg'), 'jpg ' + p.id + ' ' + i);
        }
        blocks.push({ key: p.id, name: p.id, crops: crops, tail: tail(n + p.id.length) });
        subjects.push({ name: p.id, examples: [0, 1, 2, 3, 4].map((i) => ({ timestamp: [p.last || 1000, i], examples: p.id + '-frame' + i + '.jpg', detection: { confidence: 1.5 } })) });
        if (p.voice) {
            mkdirp(path.join(P.audio, p.id));
            [1, 2].forEach((i) => fs.writeFileSync(path.join(P.audio, p.id, '2026-09-16T19.22.1' + i + '.000Z.enroll.' + p.id + '.gid-x.1.GOOD.pcm'), 'pcm ' + p.id + i));
        }
    });
    fs.writeFileSync(P.data, store.writeDeepId(blocks));
    fs.writeFileSync(P.index, JSON.stringify({ subjects: subjects.map((s, i) => ({ key: s.name, value: { ptr_wrapper: { id: 0x80000001 + i, data: s } } })) }));
    return r;
}

const a = robot('a', [{ id: 'alice-a', voice: true, last: 2000 }, { id: 'bob-a' }]);
const b = robot('b', [{ id: 'carol-b' }, { id: 'alice-b', last: 1000 }]);
const PB = store.paths(b);

// Summary: who has a face / voice and when it was enrolled.
const sumA = store.summary(a);
assert.deepStrictEqual(Object.keys(sumA.faces), ['alice-a', 'bob-a']);
assert.deepStrictEqual(sumA.faces['alice-a'], { examples: 5, last: 2000000 });
assert.deepStrictEqual(sumA.voices, { 'alice-a': { stamp: Date.parse('2026-09-16T19:22:12.000Z') } });

// Export Alice from robot A: face (index subject, deepid block, crops, frames) and voice recordings.
const alice = JSON.parse(JSON.stringify(store.exportPerson(a, 'alice-a')));
assert.strictEqual(alice.face.crops.length, 5);
assert.strictEqual(alice.face.frames.length, 5);
assert.strictEqual(alice.voice.pcms.length, 2);
assert.strictEqual(store.exportPerson(a, 'bob-a').voice, null, 'no recordings = no voice');
assert.throws(() => store.exportPerson(a, '../etc'), /bad person id/);

// Install her on robot B under B's own id for the same person (replacing B's older face).
const oldFrames = fs.readdirSync(PB.faces).filter((f) => f.indexOf('alice-b') === 0);
const result = store.importPeople(b, [{ id: 'alice-b', from: 'alice-a', face: alice.face, voice: alice.voice }]);
assert.deepStrictEqual(result, { faceIds: ['alice-b'], voiceIds: ['alice-b'] });
const blocks = store.readDeepId(fs.readFileSync(PB.data));
assert.deepStrictEqual(blocks.map((x) => x.key), ['carol-b', 'alice-b'], 'Carol is kept, Alice replaced in place');
assert.ok(blocks[1].crops.every((c) => c.indexOf('/var/jibo/identity/deepid/alice-b/alice-a-crop') === 0), 'crop paths point at the local id');
assert.strictEqual(Buffer.compare(blocks[1].tail, store.readDeepId(Buffer.from(alice.face.block, 'base64'))[0].tail), 0, 'embeddings copied verbatim');
assert.deepStrictEqual(fs.readdirSync(path.join(PB.deepid, 'alice-b')).sort(), [0, 1, 2, 3, 4].map((i) => 'alice-a-crop' + i + '.png'), 'old crops removed');
const index = JSON.parse(fs.readFileSync(PB.index, 'utf8'));
assert.deepStrictEqual(index.subjects.map((s) => [s.key, s.value.ptr_wrapper.id, s.value.ptr_wrapper.data.name]),
    [['carol-b', 0x80000001, 'carol-b'], ['alice-b', 0x80000002, 'alice-b']]);
assert.strictEqual(index.subjects[1].value.ptr_wrapper.data.examples[0].timestamp[0], 2000, 'newer face examples');
oldFrames.forEach((f) => assert.ok(!fs.existsSync(path.join(PB.faces, f)), 'replaced frames are deleted: ' + f));
assert.strictEqual(fs.readFileSync(path.join(PB.faces, 'alice-a-frame0.jpg'), 'utf8'), 'jpg alice-a 0');
assert.ok(fs.existsSync(path.join(PB.faces, 'carol-b-frame0.jpg')), "other people's frames stay");
assert.deepStrictEqual(fs.readdirSync(path.join(PB.pending, 'alice-b')).sort(),
    ['2026-09-16T19.22.11.000Z.enroll.alice-b.gid-x.1.GOOD.pcm', '2026-09-16T19.22.12.000Z.enroll.alice-b.gid-x.1.GOOD.pcm'], 'recordings staged under the local id');
// createSpeakerModel leaves the recordings in pending_audio (seen on a real robot): commitVoice moves them
// to audio/<id>, where the summary looks, so the next sync doesn't send the same voice again.
assert.strictEqual(store.summary(b).voices['alice-b'], undefined);
assert.deepStrictEqual(store.commitVoice(b, 'alice-b'), { id: 'alice-b', recordings: 2 });
assert.deepStrictEqual(fs.readdirSync(path.join(PB.pending, 'alice-b')), []);
assert.strictEqual(store.summary(b).voices['alice-b'].stamp, Date.parse('2026-09-16T19:22:12.000Z'));
assert.throws(() => store.commitVoice(b, 'alice-b'), /no staged recordings/);
assert.deepStrictEqual(store.forgetVoice(b, 'alice-b'), { id: 'alice-b', removed: 2 });
assert.ok(!fs.existsSync(path.join(PB.audio, 'alice-b')) && !fs.existsSync(path.join(PB.pending, 'alice-b')));
assert.strictEqual(store.summary(b).voices['alice-b'], undefined);
assert.ok(fs.existsSync(path.join(PB.backup, 'deepid.data')) && fs.existsSync(path.join(PB.backup, 'index.json')), 'previous files kept');

// The same frames under a second person here (e.g. renamed on one robot) get their own file names,
// because the identity service deletes a removed person's frames (seen on a real robot).
const twin = robot('twin', [{ id: 'zane-1' }]);
const zane = store.exportPerson(twin, 'zane-1');
store.importPeople(twin, [{ id: 'zane-2', from: 'zane-1', face: zane.face }]);
const twinIndex = JSON.parse(fs.readFileSync(store.paths(twin).index, 'utf8')).subjects;
const framesOf = (k) => twinIndex.filter((s) => s.key === k)[0].value.ptr_wrapper.data.examples.map((e) => e.examples);
assert.deepStrictEqual(framesOf('zane-1'), [0, 1, 2, 3, 4].map((i) => 'zane-1-frame' + i + '.jpg'));
assert.deepStrictEqual(framesOf('zane-2'), [0, 1, 2, 3, 4].map((i) => 'zane-2-zane-1-frame' + i + '.jpg'));
framesOf('zane-2').forEach((f) => assert.strictEqual(fs.readFileSync(path.join(store.paths(twin).faces, f), 'utf8'), 'jpg zane-1 ' + f.slice(-5, -4)));

// A new person is appended; the identity service's 16-face limit is enforced; file names are checked.
const bob = store.exportPerson(a, 'bob-a');
store.importPeople(b, [{ id: 'bob-a', face: bob.face }]);
assert.deepStrictEqual(store.readDeepId(fs.readFileSync(PB.data)).map((x) => x.key), ['carol-b', 'alice-b', 'bob-a']);
const full = robot('full', Array.apply(null, Array(16)).map((_, i) => ({ id: 'p' + i })));
assert.throws(() => store.importPeople(full, [{ id: 'bob-a', face: bob.face }]), /already knows 16 faces/);
assert.doesNotThrow(() => store.importPeople(full, [{ id: 'p3', from: 'bob-a', face: bob.face }]), 'replacing at the limit is fine');
const evil = JSON.parse(JSON.stringify(bob.face));
evil.frames[0].name = '../../../etc/passwd';
assert.throws(() => store.importPeople(b, [{ id: 'bob-a', face: evil }]), /bad file name/);
assert.throws(() => store.importPeople(b, [{ id: 'x/y', voice: alice.voice }]), /bad person id/);

// The helper serves the same over HTTP on 127.0.0.1 (identity reload is skipped for a test root).
const node = process.execPath;
const helper = childProcess.spawn(node, ['-e', fs.readFileSync(path.join(__dirname, '../usr/local/bin/jibo-sync-helper'), 'utf8')
    .replace('#!/usr/bin/node', '').replace("require('/usr/local/lib/jibo/jibo-sync-store.js')", 'require(' + JSON.stringify(path.join(__dirname, '../usr/local/lib/jibo/jibo-sync-store.js')) + ')')],
{ env: Object.assign({}, process.env, { JIBO_SYNC_ROOT: a, JIBO_SYNC_HELPER_PORT: '0', JIBO_SYNC_HELPER_READY: '1' }) });
helper.stdout.once('data', (line) => {
    const port = Number(String(line).split(' ')[1]);
    http.get({ host: '127.0.0.1', port: port, path: '/export?id=alice-a' }, (res) => {
        let text = '';
        res.on('data', (d) => { text += d; });
        res.on('end', () => {
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(JSON.parse(text).voice.pcms.length, 2);
            const body = JSON.stringify({ items: [{ id: 'dana-a', from: 'bob-a', face: bob.face }] });
            const req = http.request({ host: '127.0.0.1', port: port, path: '/import', method: 'POST' }, (r2) => {
                let t2 = '';
                r2.on('data', (d) => { t2 += d; });
                r2.on('end', () => {
                    helper.kill();
                    assert.strictEqual(r2.statusCode, 200, t2);
                    assert.deepStrictEqual(JSON.parse(t2).faceIds, ['dana-a']);
                    assert.ok(fs.existsSync(path.join(store.paths(a).deepid, 'dana-a')));
                    console.log('jibo-sync-store ok');
                });
            });
            req.end(body);
        });
    });
});
helper.on('exit', (code) => { if (code && code !== 143 && code !== null) { console.error('helper exited', code); process.exit(1); } });
