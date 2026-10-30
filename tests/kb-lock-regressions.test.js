'use strict';
// Regressions for the pre-3.1.7 PID-lock reaper: an empty/garbage/pre-boot PID must not
// block SSM, and the in-process reaper must never delete a live owner's lock.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
var child = require('child_process');
var bench = process.env.BENCH || path.resolve(__dirname, '..');
var boot = path.join(bench, 'usr/local/bin/jibo-runtime-bootstrap');

function staleLock(label, pidText, mtime) {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-lock-'));
    try {
        assert.strictEqual(child.spawnSync(process.execPath, [boot, '--root', root, '--knowledge']).status, 0);
        var lock = root + '/opt/jibo/Knowledge/.bootstrap-lock';
        fs.mkdirSync(lock); fs.writeFileSync(lock + '/pid', pidText);
        if (mtime) { fs.utimesSync(lock + '/pid', mtime, mtime); }
        var r = child.spawnSync(process.execPath, [boot, '--root', root, '--service', 'ssm', '--knowledge'],
            { encoding: 'utf8', timeout: 10000 });
        assert.strictEqual(r.status, 0, label + ': ' + r.stderr);
        assert(!fs.existsSync(lock), label + ': stale lock removed');
    } finally { child.spawnSync('rm', ['-rf', root]); }
}
staleLock('empty pid file (power loss)', '');
staleLock('garbage pid file', 'xx');
// PID 1 is always live; a pid file older than this boot means the owner died before reboot.
staleLock('pid reused after reboot', '1', new Date(0));

// Deterministic interleaving: B reads a dead PID, A reaps and re-acquires with its live PID.
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-race-'));
var base = root + '/opt/jibo/Knowledge', lock = base + '/.bootstrap-lock';
child.spawnSync('mkdir', ['-p', lock]);
fs.writeFileSync(lock + '/pid', '2147483646');
var A = child.spawn('sleep', ['30']);
var realRead = fs.readFileSync, fired = false, seeded = false;
fs.readFileSync = function (p) {
    var v = realRead.apply(fs, arguments);
    if (!fired && String(p) === lock + '/pid') {
        fired = true;
        fs.unlinkSync(lock + '/pid'); fs.rmdirSync(lock); fs.mkdirSync(lock); fs.writeFileSync(lock + '/pid', String(A.pid));
    }
    return v;
};
var kb = { KnowledgeDatabase: function () { this.init = function (cb) { cb(); }; },
    KnowledgeBase: function () { seeded = true; } };
kb.KnowledgeDatabase.getKbFilename = function (n) { return base + '/jibo' + n.slice(5) + '/nodes'; };
require(path.join(bench, 'usr/local/lib/jibo/knowledge-bootstrap')).initialize({ root: root, kb: kb }, function () {
    fs.readFileSync = realRead;
    try {
        assert(!seeded, 'B must not seed while live owner A holds the lock');
        assert.strictEqual(realRead(lock + '/pid', 'utf8'), String(A.pid), 'A keeps its lock');
        console.log('Empty, garbage and pre-boot PID locks recover; a live owner\'s lock is never stolen');
    } finally { A.kill(); child.spawnSync('rm', ['-rf', root]); }
});
