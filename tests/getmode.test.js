'use strict';
// jibo-getmode (shell) prints what Jibo's original node script printed, for what jibo-setmode writes and for bad files.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), child = require('child_process');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'getmode-'));
var modeFile = path.join(root, 'mode.json'), script = path.join(root, 'getmode');
fs.writeFileSync(script, fs.readFileSync(path.join(__dirname, '../usr/bin/jibo-getmode'), 'utf8').split('/var/jibo/mode.json').join(modeFile));
function run(content) {
    if (content === null) { try { fs.unlinkSync(modeFile); } catch (e) {} } else { fs.writeFileSync(modeFile, content); }
    var r = child.spawnSync('sh', [script], { encoding: 'utf8' });
    return r.status + ' ' + r.stdout.trim();
}
try {
    ['normal', 'oobe', 'ota', 'int-developer'].forEach(function (m) {
        assert.strictEqual(run(JSON.stringify({ mode: m })), '0 ' + m);           // what jibo-setmode writes
    });
    assert.strictEqual(run('{\n    "mode": "ota"\n}\n'), '0 ota');
    assert.strictEqual(run(null), '1 ERROR: failed to parse ' + modeFile);
    assert.strictEqual(run(''), '1 ERROR: failed to parse ' + modeFile);
    assert.strictEqual(run('{"mo'), '1 ERROR: failed to parse ' + modeFile);
    console.log('jibo-getmode: modes and unreadable files passed');
} finally { child.spawnSync('rm', ['-rf', root]); }
