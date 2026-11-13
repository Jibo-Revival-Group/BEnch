'use strict';
// Release repair re-downloads damaged or missing system and skill files from the release Jibo is on,
// checked against that release's git file list, and leaves robot-specific files alone.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
var child = require('child_process');
var bench = process.env.BENCH || path.resolve(__dirname, '..');
var rr = require(path.join(bench, 'usr/local/lib/jibo/release-repair'));

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-repair-'));
function sh(cmd, cwd) { var r = child.spawnSync('sh', ['-c', cmd], { cwd: cwd, encoding: 'utf8' }); assert.strictEqual(r.status, 0, cmd + ': ' + r.stderr); return r.stdout; }
function put(file, data, mode) { sh('mkdir -p "' + path.dirname(file) + '"'); fs.writeFileSync(file, data); if (mode) { fs.chmodSync(file, mode); } }

try {
    // The release: a git repo whose `git ls-tree -r -l` is the file list on the GitHub release.
    var repo = path.join(tmp, 'BEnch');
    put(repo + '/usr/local/bin/tool', '#!/bin/sh\necho tool\n', 493);
    put(repo + '/usr/local/lib/a file.js', 'module.exports = 1;\n');
    put(repo + '/usr/local/etc/body.json', '{"factory":true}\n');
    put(repo + '/tests/x.test.js', 'test\n');
    put(repo + '/usr/local/devtools/only-in-git.js', 'dev\n');
    sh('git init -q && git add -A && git -c user.name=t -c user.email=t@t commit -qm r', repo);
    var list = sh('git ls-tree -r -l HEAD', repo);

    // The robot: same files, installed at version 13.0.7.
    var root = path.join(tmp, 'robot');
    put(root + '/usr/local/bin/jibo-service-version', '#!/bin/sh\necho "Jibo Service Version: Release-13.0.7-20261111"\n', 493);
    ['usr/local/bin/tool', 'usr/local/lib/a file.js', 'usr/local/etc/body.json'].forEach(function (p) {
        put(root + '/' + p, fs.readFileSync(repo + '/' + p), fs.statSync(repo + '/' + p).mode & 511);
    });
    var part = { repo: 'BEnch', base: '/', include: /^usr\/local\//, exclude: /^usr\/local\/(etc|var)\// };
    var urls = [], bad = {};
    function fetch(url, dest) {
        urls.push(url);
        if (/files\.txt$/.test(url)) { fs.writeFileSync(dest, list); return true; }
        var rel = decodeURIComponent(url.split('/BEnch/v13.0.7/')[1]);
        if (!fs.existsSync(repo + '/' + rel)) { return false; }
        fs.writeFileSync(dest, bad[rel] || fs.readFileSync(repo + '/' + rel));
        return true;
    }
    var opts = { root: root, tmp: tmp, fetch: fetch };

    var r = rr.repairPart(part, opts);
    assert.strictEqual(r.tag, 'v13.0.7');
    assert.strictEqual(r.checked, 3, 'only release files under /usr/local, without etc/ (robot-specific) or tests/');
    assert.deepStrictEqual(r.damaged, [], 'an intact install needs nothing, and a folder installs never had is not damage');
    assert.ok(/\/BEnch\/releases\/download\/v13\.0\.7\/files\.txt$/.test(urls[0]), 'the list comes from the installed release');

    // Damage: a corrupted file, a missing file, and a changed robot-specific config.
    fs.writeFileSync(root + '/usr/local/bin/tool', '#!/bin/sh\necho t\0\0\0\n');
    fs.unlinkSync(root + '/usr/local/lib/a file.js');
    fs.writeFileSync(root + '/usr/local/etc/body.json', '{"calibrated":42}\n');

    r = rr.repairPart(part, Object.assign({ dryRun: true }, opts));
    assert.deepStrictEqual(r.damaged.sort(), ['usr/local/bin/tool', 'usr/local/lib/a file.js']);
    assert.ok(!fs.existsSync(root + '/usr/local/lib/a file.js'), 'a dry run changes nothing');

    bad['usr/local/bin/tool'] = 'not the release\n';
    r = rr.repairPart(part, opts);
    assert.strictEqual(r.repaired, 1); assert.strictEqual(r.failed, 1);
    assert.strictEqual(fs.readFileSync(root + '/usr/local/lib/a file.js', 'utf8'), 'module.exports = 1;\n', 'a missing file comes back');
    assert.ok(urls.some(function (u) { return /\/BEnch\/v13\.0\.7\/usr\/local\/lib\/a%20file\.js$/.test(u); }), 'paths are URL-encoded');
    assert.strictEqual(fs.readFileSync(root + '/usr/local/bin/tool', 'utf8'), '#!/bin/sh\necho t\0\0\0\n', 'a download that fails its hash replaces nothing');
    assert.deepStrictEqual(fs.readdirSync(root + '/usr/local/bin').sort(), ['jibo-service-version', 'tool'], 'no temp file left behind');

    delete bad['usr/local/bin/tool'];
    r = rr.repairPart(part, opts);
    assert.strictEqual(r.repaired, 1);
    assert.strictEqual(fs.readFileSync(root + '/usr/local/bin/tool', 'utf8'), '#!/bin/sh\necho tool\n');
    assert.strictEqual(fs.statSync(root + '/usr/local/bin/tool').mode & 511, 493, 'executables stay executable');
    assert.strictEqual(fs.readFileSync(root + '/usr/local/etc/body.json', 'utf8'), '{"calibrated":42}\n', 'robot-specific config is never replaced');

    // Too many differences means the wrong release or a half-done update: nothing is touched.
    var many = '';
    for (var i = 0; i <= rr.MAX_REPAIRS; i++) { many += '100644 blob ' + ('0000000000000000000000000000000000000' + (100 + i)).slice(-40) + '      9\tusr/local/lib/f' + i + '\n'; }
    list = many;
    r = rr.repairPart(part, opts);
    assert.ok(r.tooMany); assert.strictEqual(r.repaired, 0);
    assert.ok(!fs.existsSync(root + '/usr/local/lib/f0'), 'nothing was downloaded');

    // Offline or a release without a list: skipped, not an error.
    assert.strictEqual(rr.repairPart(part, { root: root, tmp: tmp, fetch: function () { return false; } }), null);
    // Git's blob hash.
    put(tmp + '/h', 'hello\n');
    assert.strictEqual(rr.blobHash(tmp + '/h'), 'ce013625030ba8dba906f756967f9e9ca394464a');
    console.log('release repair ok');
} finally {
    child.spawnSync('rm', ['-rf', tmp]);
}
