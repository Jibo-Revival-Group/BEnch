'use strict';
// Release repair: checks Jibo's installed BEnch services (/usr/local) and BEam skills (@be/be, jibo-tbd)
// against the release he is on, and re-downloads any file that is damaged or missing.
//
// The release's file list ("files.txt" on its GitHub release: `git ls-tree -r -l <tag>` output) gives each
// file's git blob hash. Good copies come from the same tag on raw.githubusercontent.com and are checked
// against that hash before they replace anything. Run by kb-deep-repair when Jibo failed to start, or by
// hand: node /usr/local/lib/jibo/release-repair.js ['{"dryRun":true}' to only list what differs]
var fs = require('fs'), path = require('path'), crypto = require('crypto'), child = require('child_process');

var GITHUB = 'https://github.com/Jibo-Revival-Group/';
var RAW = 'https://raw.githubusercontent.com/Jibo-Revival-Group/';
// More differences than this means the wrong release or a half-done update: that needs PM, not file repair.
var MAX_REPAIRS = 300;

var PARTS = [
    // Robot-specific and runtime files under /usr/local stay as they are (body config, Wi-Fi, state).
    // The speech models in share/asr differ between working robots, so they are left alone too, and so are
    // the backups BEaker's packer leaves out (EXCLUDE_SUFFIXES in pack_bench_system.py).
    { repo: 'BEnch', base: '/', include: /^usr\/local\//, mount: '/usr/local',
        exclude: /^usr\/local\/(etc|var|share\/asr)\/|\.(openjibo-orig|openjibo\.orig|pre-beam-ota|point-at-server\.bak)$/ },
    // BEacon can replace the eye textures; those are the user's choice, not damage.
    { repo: 'BEam', base: '/opt/jibo/Jibo/Skills/', include: /^(@be\/be|jibo-tbd)\//,
        exclude: /^@be\/be\/node_modules\/animation-utilities\/res\/geometry-config\/P1\.0\/textures\// }
];

function report(message, opts) {
    try { fs.writeSync(2, '[release-repair] ' + message + '\n'); } catch (e) {}
    if (opts && opts.root) { return; }
    try { child.spawnSync('/usr/bin/logger', ['-t', 'jibo-release-repair', message]); } catch (e) {}
}

function version(part, root) {
    try {
        if (part.repo === 'BEnch') {
            var out = child.spawnSync(root + '/usr/local/bin/jibo-service-version', [], { encoding: 'utf8' }).stdout || '';
            var m = /Release-(\d+\.\d+\.\d+)/.exec(out);
            return m ? m[1] : null;
        }
        return JSON.parse(fs.readFileSync(root + '/opt/jibo/Jibo/Skills/jibo-tbd/package.json', 'utf8')).version || null;
    } catch (e) { return null; }
}

// Downloads url to dest; returns true on success. Jibo's curl is what PM uses too (-k: old CA store).
function curl(url, dest) {
    return child.spawnSync('curl', ['-fsSL', '-k', '--retry', '2', '--max-time', '300', '-o', dest, url]).status === 0;
}

// Git's blob hash, so the release's file list needs no extra hashing step.
// Read in chunks: whole-file reads of big models and media run Jibo out of memory.
function blobHash(file) {
    var fd = fs.openSync(file, 'r'), buf = Buffer.alloc ? Buffer.alloc(1048576) : new Buffer(1048576), n;
    var hash = crypto.createHash('sha1').update('blob ' + fs.fstatSync(fd).size + '\0');
    try { while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) { hash.update(buf.slice(0, n)); } }
    finally { fs.closeSync(fd); }
    return hash.digest('hex');
}

// `git ls-tree -r -l` lines: "<mode> blob <sha1> <size>\t<path>". Symlinks and submodules are skipped.
function parseList(text) {
    var files = [];
    text.split('\n').forEach(function (line) {
        var m = /^(100644|100755) blob ([0-9a-f]{40}) +(\d+)\t(.+)$/.exec(line);
        if (m) { files.push({ mode: m[1] === '100755' ? 493 : 420, hash: m[2], size: Number(m[3]), path: m[4] }); }
    });
    return files;
}

function isGood(file, entry) {
    try {
        var st = fs.lstatSync(file);
        return st.isFile() && st.size === entry.size && blobHash(file) === entry.hash;
    } catch (e) { return false; }
}

function isMountedReadOnly(point, root) {
    if (root) { return false; }
    try {
        return fs.readFileSync('/proc/mounts', 'utf8').split('\n').some(function (l) {
            var f = l.split(' ');
            return f[1] === point && /(^|,)ro(,|$)/.test(f[3]);
        });
    } catch (e) { return false; }
}

// Checks one part (BEnch or BEam). Returns { checked, damaged: [paths], repaired, failed } or null when skipped.
function repairPart(part, opts) {
    var root = opts.root ? path.resolve(opts.root) : '';
    var fetch = opts.fetch || curl;
    var ver = version(part, root);
    if (!ver) { report(part.repo + ': installed version unknown; skipped', opts); return null; }
    var tag = 'v' + ver, tmp = (opts.tmp || '/opt/tmp') + '/release-repair-' + part.repo + '.txt';
    child.spawnSync('mkdir', ['-p', path.dirname(tmp)]);
    if (!fetch(GITHUB + part.repo + '/releases/download/' + tag + '/files.txt', tmp)) {
        report(part.repo + ' ' + tag + ': no file list (offline, or this release has none); skipped', opts);
        return null;
    }
    var list = parseList(fs.readFileSync(tmp, 'utf8')).filter(function (e) {
        return part.include.test(e.path) && !(part.exclude && part.exclude.test(e.path));
    });
    try { fs.unlinkSync(tmp); } catch (e) {}
    if (!list.length) { report(part.repo + ' ' + tag + ': empty file list; skipped', opts); return null; }
    // A missing file counts only where its folder exists: releases carry whole folders (dev tools, tests)
    // that installs never had, and Jibo works without them.
    var damaged = list.filter(function (e) {
        var file = root + part.base + e.path;
        return !isGood(file, e) && (fs.existsSync(file) || fs.existsSync(path.dirname(file)));
    });
    var result = { tag: tag, checked: list.length, damaged: damaged.map(function (e) { return e.path; }), repaired: 0, failed: 0 };
    if (!damaged.length) { report(part.repo + ' ' + tag + ': all ' + list.length + ' files OK', opts); return result; }
    if (opts.dryRun) {
        report(part.repo + ' ' + tag + ': ' + damaged.length + ' damaged or missing: ' + result.damaged.slice(0, 20).join(', '), opts);
        return result;
    }
    if (damaged.length > MAX_REPAIRS) {
        report(part.repo + ' ' + tag + ': ' + damaged.length + ' files differ, too many to repair file by file; run PM to reinstall', opts);
        result.tooMany = true;
        return result;
    }
    var remount = part.mount && isMountedReadOnly(part.mount, root);
    if (remount) { child.spawnSync('mount', ['-o', 'remount,rw', part.mount]); }
    try {
        damaged.forEach(function (e) {
            var file = root + part.base + e.path, temp = path.join(path.dirname(file), '.' + path.basename(file) + '.repair');
            var url = RAW + part.repo + '/' + tag + '/' + e.path.split('/').map(encodeURIComponent).join('/');
            child.spawnSync('mkdir', ['-p', path.dirname(file)]);
            if (fetch(url, temp) && isGood(temp, e)) {
                fs.chmodSync(temp, e.mode);
                fs.renameSync(temp, file);
                result.repaired++;
                report('repaired ' + part.base + e.path, opts);
            } else {
                try { fs.unlinkSync(temp); } catch (err) {}
                result.failed++;
                report('could not download a good copy of ' + part.base + e.path, opts);
            }
        });
    } finally {
        if (remount) { child.spawnSync('sync'); child.spawnSync('mount', ['-o', 'remount,ro', part.mount]); }
    }
    report(part.repo + ' ' + tag + ': ' + result.repaired + ' of ' + damaged.length + ' damaged or missing files repaired', opts);
    return result;
}

// After a failed start Wi-Fi may still be coming up; give it two minutes.
function waitForNetwork() {
    for (var i = 0; i < 12; i++) {
        if (child.spawnSync('curl', ['-fsSI', '-k', '--max-time', '10', 'https://github.com']).status === 0) { return true; }
        child.spawnSync('sleep', ['10']);
    }
    return false;
}

function run(opts) {
    opts = opts || {};
    if (opts.waitForNetwork && !waitForNetwork()) { report('offline; file check skipped', opts); return []; }
    return (opts.parts || PARTS).map(function (part) {
        try { return repairPart(part, opts); } catch (e) { report(part.repo + ': repair failed: ' + e.message, opts); return null; }
    });
}

module.exports = { run: run, repairPart: repairPart, parseList: parseList, blobHash: blobHash, PARTS: PARTS, MAX_REPAIRS: MAX_REPAIRS };

if (require.main === module) {
    var results = run(process.argv[2] ? JSON.parse(process.argv[2]) : {});
    process.exit(results.some(function (r) { return r && (r.failed || r.tooMany); }) ? 1 : 0);
}
