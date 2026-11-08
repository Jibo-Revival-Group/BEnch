'use strict';
// The loop manager runs with cloud sync off (BEacon owns the household). A BEacon loop edit through SSM
// (phonetic name, enrollment) pauses and resumes its sync timer; resuming used to start the 60 s timer
// anyway, and that sync saved SSM's boot-time loop root over BEacon's, unlinking everyone added since
// boot ("my loop members disappeared"). Runs SSM's real SyncManager timer methods.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const file = process.argv[2] ||
    path.join(__dirname, '../usr/local/bin/jibo-ssm/lib/skills-service-manager.js');
const src = fs.readFileSync(file, 'utf8');
const start = src.indexOf('    _startSyncTimer(quietly) {');
const end = src.indexOf('    _notDuringSyncing(callback) {', start);
const tail = src.indexOf('\n    }\n', end) + 7;
assert(start > 0 && end > start && tail > end, 'found the SyncManager timer methods');
const log = { info() {}, warn() {}, error() {} };
const timers = [];
const fakeGlobal = { setTimeout(fn, ms) { timers.push(ms); return { ms: ms }; } };
const Timers = new Function('log', 'global', 'setImmediate', 'return class {' + src.slice(start, tail) + '};')(
    log, fakeGlobal, (fn) => fn());

function manager(enableCloud) {
    const m = new Timers();
    Object.assign(m, { name: 'loop', syncingPeriod: 60000, enableCloud: enableCloud, pauseDepth: 0, queue: [] });
    m._syncASAP = () => { throw new Error('synced'); };
    return m;
}

// Cloud off (the loop): a loop edit pauses and resumes, and no sync timer starts.
const loop = manager(false);
loop._notDuringSyncing((done) => done());
assert.deepStrictEqual(timers, [], 'no sync timer for a manager with cloud sync off');
assert.strictEqual(loop.syncTimer, undefined);

// Cloud on (robot, holidays, media): unchanged, resuming starts the periodic sync.
const robot = manager(true);
robot._notDuringSyncing((done) => done());
assert.deepStrictEqual(timers, [60000], 'cloud managers still schedule their sync');
console.log('PASS a cloud-off loop manager never starts a sync timer; cloud managers still do');
