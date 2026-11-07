'use strict';
// Interaction memory: NeDB appended the whole history record on every save until the file was too big to load
// (931 MB on .165). Startup compacts it and keeps 2 weeks of history plus each person's last 3 events.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
var child = require('child_process');
var bench = process.env.BENCH || path.resolve(__dirname, '..');
var bootstrap = require(path.join(bench, 'usr/local/lib/jibo/knowledge-bootstrap'));
var DAY = 86400000, now = Date.UTC(2026, 10, 7);
function ev(daysAgo, people, skill) {
    var d = { skillName: skill || '@be/greetings' };
    if (people) { d.personIDs = people; }
    return { description: d, timestamp: now - daysAgo * DAY };
}

var history = [ev(400, ['a']), ev(300, ['a']), ev(200, ['a']), ev(100, ['a']), ev(90, ['b']), ev(60, ['a', 'b']),
    ev(30), ev(20, ['c']), ev(15), ev(13), ev(2, ['a'])];
var kept = bootstrap.pruneHistory(history, now);
assert.deepStrictEqual(kept.map(function (e) { return (now - e.timestamp) / DAY; }), [100, 90, 60, 20, 13, 2],
    'older than 2 weeks goes, except each person\'s last 3 (a: 2, 60, 100; b: 60, 90; c: 20); order kept');
assert.deepStrictEqual(bootstrap.pruneHistory([], now), []);

var root = fs.mkdtempSync(path.join(os.tmpdir(), 'im-compact-'));
try {
    var dir = root + '/opt/jibo/Knowledge/jibo/interactionmemory', file = dir + '/nodes';
    child.spawnSync('mkdir', ['-p', dir]);
    var rootRec = '{"_id":"r","data":{},"type":"root","edges":{"history":["h"],"stats":["s"]}}';
    var old = [];
    for (var i = 0; i < 2500; i++) { old.push(ev(3000 - i, ['a'], '@be/x' + i)); }
    function historyLine(events) { return JSON.stringify({ _id: 'h', data: { history: events }, type: 'history' }); }
    var fd = fs.openSync(file, 'w', 416);
    fs.writeSync(fd, rootRec + '\n{"$$indexCreated":{"fieldName":"type"}}\n{"_id":"gone","type":"x"}\n');
    var copy = historyLine(old) + '\n';
    while (fs.fstatSync(fd).size <= bootstrap.MAX_REPAIR_BYTES) { fs.writeSync(fd, copy); }
    fs.writeSync(fd, '{"_id":"s","data":{"userSkillLaunchCounts":{"a":{"@be/greetings":5}}},"type":"stats"}\n');
    fs.writeSync(fd, historyLine(old.concat([ev(1, null, '@be/clock')])) + '\n{"$$deleted":true,"_id":"gone"}\n');
    fs.writeSync(fd, historyLine(old).slice(0, 5000) + '\n');   // cut off by a power loss
    fs.closeSync(fd);

    var r = child.spawnSync(process.execPath, [path.join(bench, 'usr/local/bin/jibo-runtime-bootstrap'), '--root', root,
        '--service', 'ssm', '--knowledge'], { encoding: 'utf8', timeout: 120000 });
    assert.strictEqual(r.status, 0, r.stderr);
    assert(/compacted .*interactionmemory\/nodes/.test(r.stderr), r.stderr);
    var lines = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepStrictEqual(lines.map(function (l) { return l._id || '$$index'; }), ['r', '$$index', 'h', 's'],
        'one copy of each record; deleted record gone');
    var h = lines[2].data.history;
    assert.deepStrictEqual(h.map(function (e) { return e.description.skillName; }), ['@be/x2497', '@be/x2498', '@be/x2499', '@be/clock'],
        'newest complete copy (not the cut-off one), pruned to a\'s last 3 plus the recent event');
    assert(fs.statSync(file).size < 4096);
    assert.strictEqual(fs.statSync(file).mode & 511, 416, 'permissions kept');
    assert.deepStrictEqual(fs.readdirSync(dir), ['nodes'], 'no temp or backup files left');
} finally { child.spawnSync('rm', ['-rf', root]); }
console.log('PASS interaction memory is compacted and pruned to 2 weeks plus each person\'s last 3');
