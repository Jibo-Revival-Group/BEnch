'use strict';
// Be (Electron) can die under SSM: an alsa-lib assertion (snd_pcm_area_copy) aborted it while a skill kept reopening
// the mic, "Skill @be/be exited with code 0", and nothing relaunched it, so the screen stayed black until a reboot.
// Runs SSM's real SkillsService.relaunchIfDead.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '../usr/local/bin/jibo-ssm/lib/skills-service-manager.js');
const src = fs.readFileSync(file, 'utf8');
const start = src.indexOf('    relaunchIfDead() {');
const end = src.indexOf('    terminate(callback) {', start);
assert(start > 0 && end > start, 'found SkillsService.relaunchIfDead');
let skills = [];
const system = { list: cb => cb(null, skills) };
const Service = new Function('jibo_client_framework_1', 'log', 'return class {' + src.slice(start, end) + '};')(
    { SystemManagerClient: { instance: system } }, { warn() {}, error() {} });

const ssm = new Service(), launched = [];
ssm.launch = (name, parse, cb) => { launched.push(name); ssm.currentSkill = { name: name }; cb(); };
ssm.currentSkill = { name: '@be/be' };

skills = [{ name: '@be/be', running: true }];
ssm.relaunchIfDead();
assert.deepStrictEqual(launched, [], 'a running Be is left alone');

skills = [{ name: '@be/be', running: false }];
ssm.relaunchIfDead();
assert.deepStrictEqual(launched, ['@be/be'], 'a dead Be is relaunched');
ssm.relaunchIfDead(); ssm.relaunchIfDead(); ssm.relaunchIfDead();
assert.strictEqual(launched.length, 3, 'at most 3 relaunches in 10 minutes (a crash loop stops)');

ssm.relaunches = [Date.now() - 700000]; launched.length = 0;
ssm.relaunchIfDead();
assert.deepStrictEqual(launched, ['@be/be'], 'old relaunches no longer count');

ssm.currentSkill = null; launched.length = 0;
ssm.relaunchIfDead();
assert.deepStrictEqual(launched, [], 'a skill stopped on purpose (SSM terminate clears currentSkill) stays stopped');
console.log('PASS SSM relaunches a dead Be, at most 3 times in 10 minutes, and never one it stopped');
