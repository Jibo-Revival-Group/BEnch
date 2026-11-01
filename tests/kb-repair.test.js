'use strict';
// A power cut can leave any Knowledge database ("nodes" JSON lines) with a damaged line. Startup must
// repair every one, keep every record it can, keep the original, and still start SSM.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
var child = require('child_process');
var bench = process.env.BENCH || path.resolve(__dirname, '..');
var boot = path.join(bench, 'usr/local/bin/jibo-runtime-bootstrap');
var salvage = require(path.join(bench, 'usr/local/lib/jibo/knowledge-bootstrap')).salvage;

assert.deepStrictEqual(salvage('{"_id":"a"}{"_id":"b"}'), ['{"_id":"a"}', '{"_id":"b"}'], 'lost newline');
assert.deepStrictEqual(salvage('\u0000\u0000{"_id":"c","n":"x}{y"}'), ['{"_id":"c","n":"x}{y"}'], 'NUL padding, braces in strings');
assert.deepStrictEqual(salvage('{"_id":"d","path":"/opt/jib{"_id":"e"}'), ['{"_id":"e"}'], 'cut-off record, then the next one');
assert.deepStrictEqual(salvage('{"_id":"f","n":'), [], 'cut-off record alone');
assert.deepStrictEqual(salvage('[1,2]'), [], 'not a record');
assert.deepStrictEqual(salvage('{"_id":"h","data":{"history":[{"description":{"a":1},"t":2},{"t":3}],"x":'), [],
    'pieces nested inside a cut-off record are not records');
assert.deepStrictEqual(salvage('{"_id":"h","data":{"items":[{"t":1}],"x":{"_id":"i","n":1}'), ['{"_id":"i","n":1}'],
    'a record-shaped piece is kept (it was written as one)');

var root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-repair-'));
try {
    var kb = root + '/opt/jibo/Knowledge';
    function write(rel, text, mode) {
        var file = path.join(kb, rel);
        child.spawnSync('mkdir', ['-p', path.dirname(file)]);
        fs.writeFileSync(file, text); fs.chmodSync(file, mode || 416);
        return file;
    }
    var good = ['{"_id":"p1","type":"photo","name":"cat {1}.jpg"}', '{"_id":"p2","type":"photo"}'];
    var mediaText = good[0] + '\n\u0000\u0000\u0000\n' + good[1] + '{"_id":"p3","type":"video"}\n{"_id":"p4","ty';
    var media = write('jibo/media/nodes', mediaText);
    var skill = write('skills/be/gallery/mims/nodes', '{"_id":"m1"}\n{"_id":"m2"\n');
    var cleanText = '{"_id":"l1","firstName":"Zane"}\n';
    var loop = write('jibo/loop/nodes', cleanText);
    var past = new Date(2020, 0, 1); fs.utimesSync(loop, past, past);
    var beacon = write('beacon/nodes', '{broken', 420);
    var big = write('jibo/interactionmemory/nodes', '{broken');
    fs.truncateSync(big, 64 * 1024 * 1024 + 1);

    var r = child.spawnSync(process.execPath, [boot, '--root', root, '--service', 'ssm', '--knowledge'], { encoding: 'utf8', timeout: 20000 });
    assert.strictEqual(r.status, 0, 'SSM startup continues after repair: ' + r.stderr);

    var lines = fs.readFileSync(media, 'utf8').trim().split('\n').map(function (l) { return JSON.parse(l)._id; });
    assert.deepStrictEqual(lines, ['p1', 'p2', 'p3'], 'every complete media record is kept, in order');
    assert.strictEqual(fs.readFileSync(media, 'utf8').split('\n')[0], good[0], 'undamaged lines keep their exact bytes');
    assert.strictEqual(fs.statSync(media).mode & 511, 416, 'permissions kept');
    var backups = fs.readdirSync(path.dirname(media)).filter(function (n) { return /^nodes\.damaged-/.test(n); });
    assert.strictEqual(backups.length, 1);
    assert.strictEqual(fs.readFileSync(path.join(path.dirname(media), backups[0]), 'utf8'), mediaText, 'original saved byte for byte');
    assert(/repaired .*jibo\/media\/nodes: 3 damaged line\(s\), 2 record\(s\) recovered/.test(r.stderr), r.stderr);

    assert.strictEqual(fs.readFileSync(skill, 'utf8'), '{"_id":"m1"}\n', 'skill databases are repaired too');
    assert.strictEqual(fs.readFileSync(loop, 'utf8'), cleanText, 'healthy databases are untouched');
    assert.strictEqual(fs.statSync(loop).mtime.getTime(), past.getTime(), 'healthy databases are not rewritten');
    assert.strictEqual(fs.readFileSync(beacon, 'utf8'), '{broken', 'BEacon files are not Knowledge databases');
    assert.strictEqual(fs.statSync(big).size, 64 * 1024 * 1024 + 1, 'huge databases are skipped, not loaded');
    assert(/not checked \(too large/.test(r.stderr), 'skipping a huge database is logged');
    assert.strictEqual(fs.readdirSync(path.dirname(big)).length, 1);


    var again = child.spawnSync(process.execPath, [boot, '--root', root, '--service', 'ssm', '--knowledge'], { encoding: 'utf8', timeout: 20000 });
    assert.strictEqual(again.status, 0);
    assert(!/repaired/.test(again.stderr), 'a repaired database needs no second repair');
    // Disk full while repairing: the original stays, and no partial backup or repair file is left.
    var full = write('radio/nodes', '{"_id":"r1"}\n\u0000\u0000\n');
    var realWrite = fs.writeFileSync, calls = 0;
    fs.writeFileSync = function (file) { if (++calls === 2) { var e = new Error('ENOSPC'); e.code = 'ENOSPC'; throw e; } return realWrite.apply(fs, arguments); };
    try { assert.throws(function () { require(path.join(bench, 'usr/local/lib/jibo/knowledge-bootstrap')).repairFile(full); }, /ENOSPC/); }
    finally { fs.writeFileSync = realWrite; }
    assert.strictEqual(fs.readFileSync(full, 'utf8'), '{"_id":"r1"}\n\u0000\u0000\n', 'original untouched after a failed repair');
    assert.deepStrictEqual(fs.readdirSync(path.dirname(full)), ['nodes'], 'no partial files left');
    console.log('Damaged Knowledge databases are repaired at startup, keeping every recoverable record and the original');
} finally { child.spawnSync('rm', ['-rf', root]); }
