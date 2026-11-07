'use strict';
// When SSM's last launch never finished, startup hands over to a deep repair that streams through
// every Knowledge database, including ones too big for the normal startup check.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
var child = require('child_process');
var bench = process.env.BENCH || path.resolve(__dirname, '..');
var boot = path.join(bench, 'usr/local/bin/jibo-runtime-bootstrap');
var deep = require(path.join(bench, 'usr/local/lib/jibo/kb-deep-repair'));

var root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-deep-'));
function sleep(ms) { child.spawnSync('sleep', [String(ms / 1000)]); }
try {
    var kb = root + '/opt/jibo/Knowledge';
    function write(rel, data) {
        var file = path.join(kb, rel);
        child.spawnSync('mkdir', ['-p', path.dirname(file)]);
        fs.writeFileSync(file, data); fs.chmodSync(file, 416);
        return file;
    }

    // Streaming: lines across 1 MB read chunks, multi-byte characters on the boundary, an overlong line.
    var long = [];
    for (var i = 0; i < 40000; i++) { long.push(JSON.stringify({ _id: 'r' + i, name: 'caf\u00e9 \u{1F431} ' + i })); }
    var big = write('jibo/interactionmemory/nodes', long.join('\n') + '\n' + new Array(deep.MAX_LINE + 100000).join('x') + '\n{"_id":"tail"}\n{"_id":"cut');
    var seen = 0, overlong = 0;
    deep.eachLine(big, function (line) { if (line === null) { overlong++; } else if (line) { seen++; } });
    assert.strictEqual(overlong, 1, 'an overlong line is reported once');
    assert.strictEqual(seen, 40002, 'every other line is read, across chunk boundaries');
    assert(deep.isDamaged(big));

    var original = fs.readFileSync(big);
    var r = deep.repairLarge(big);
    var ids = fs.readFileSync(big, 'utf8').trim().split('\n').map(function (l) { return JSON.parse(l)._id; });
    assert.strictEqual(ids.length, 40001, 'all good records kept');
    assert.strictEqual(ids[0], 'r0'); assert.strictEqual(ids[40000], 'tail');
    assert.strictEqual(fs.readFileSync(big, 'utf8').split('\n')[1], long[1], 'kept lines keep their bytes (UTF-8 intact)');
    assert.strictEqual(r.damaged, 2);
    assert(fs.readFileSync(r.backup).equals(original), 'the original is the backup, byte for byte');
    assert.strictEqual(fs.statSync(big).mode & 511, 416, 'permissions kept');
    assert(!deep.isDamaged(big));

    // A failed write puts the original back and leaves nothing half-written.
    var fail = write('radio/nodes', '{"_id":"a"}\n\u0000\u0000\n');
    var realWrite = fs.writeSync;
    fs.writeSync = function (fd) { if (fd > 2) { var e = new Error('ENOSPC'); e.code = 'ENOSPC'; throw e; } return realWrite.apply(fs, arguments); };
    try { assert.throws(function () { deep.repairLarge(fail); }, /ENOSPC/); } finally { fs.writeSync = realWrite; }
    assert.strictEqual(fs.readFileSync(fail, 'utf8'), '{"_id":"a"}\n\u0000\u0000\n');
    assert.deepStrictEqual(fs.readdirSync(path.dirname(fail)), ['nodes']);
    fs.unlinkSync(fail); fs.rmdirSync(path.dirname(fail));

    // Whole flow through the real startup step.
    child.spawnSync('mkdir', ['-p', root + '/run']);
    var damagedBig = write('jibo/huge/nodes', '{"_id":"m1"}\n{"_id":"m2"}\u0000\u0000\u0000\n');
    fs.truncateSync(damagedBig, 64 * 1024 * 1024 + 4096);   // too big for the normal startup check
    function start() { return child.spawnSync(process.execPath, [boot, '--root', root, '--service', 'ssm', '--knowledge'], { encoding: 'utf8', timeout: 30000 }); }
    var first = start();
    assert.strictEqual(first.status, 0, 'first launch is a normal startup: ' + first.stderr);
    assert(/not checked \(too large/.test(first.stderr));
    assert(fs.existsSync(root + '/run/jibo-ssm-pending'), 'launch marked pending until SSM reports it is up');

    // SSM never reported in: the next launch hands over to the deep repair and keeps SSM down.
    var second = start();
    assert.strictEqual(second.status, 1, 'SSM waits for the deep repair');
    assert(/deep Knowledge check/.test(second.stderr), second.stderr);
    for (var t = 0; t < 200 && !fs.readdirSync(path.dirname(damagedBig)).some(function (n) { return /damaged-/.test(n); }); t++) { sleep(100); }
    var third = start();   // waits on the flock until the deep repair is done
    assert.strictEqual(third.status, 0, 'SSM starts after the deep repair: ' + third.stderr);
    assert.deepStrictEqual(fs.readFileSync(damagedBig, 'utf8').trim().split('\n').map(function (l) { return JSON.parse(l)._id; }), ['m1', 'm2'],
        'records in the big database are kept');
    assert(fs.existsSync(root + '/run/jibo-kb-deep-repair.done'));

    // Still not starting for another reason: no second deep scan this boot.
    var fourth = start();
    assert.strictEqual(fourth.status, 0);
    assert(!/deep Knowledge check/.test(fourth.stderr), 'deep repair runs at most once per boot');
    console.log('Failed SSM launch triggers a streaming deep Knowledge repair of every database, once per boot');
} finally { child.spawnSync('rm', ['-rf', root]); }
