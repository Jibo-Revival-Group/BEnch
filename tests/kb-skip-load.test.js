'use strict';
// Loading jibo-kb takes ~3 s on Jibo and runs twice a boot. When every database already exists the Knowledge
// bootstrap must finish without loading it; when one is missing it still loads it and creates the database.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), child = require('child_process');
var script = path.join(__dirname, '../usr/local/lib/jibo/knowledge-bootstrap.js');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-skip-load-'));
var hook = path.join(root, 'hook.js');
fs.writeFileSync(hook, "var M = require('module'), load = M._load;\n" +
    "M._load = function (request) { if (/jibo-kb$/.test(request)) { require('fs').writeFileSync(process.env.KB_LOADED, '1'); } return load.apply(this, arguments); };\n");
var marker = path.join(root, 'loaded');
function run() {
    try { fs.unlinkSync(marker); } catch (e) {}
    var r = child.spawnSync(process.execPath, ['--require', hook, script, JSON.stringify({ root: root })],
        { env: Object.assign({}, process.env, { KB_LOADED: marker }), encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    return fs.existsSync(marker);
}
try {
    var kb = path.join(root, 'opt/jibo/Knowledge/jibo');
    ['loop', 'robot', 'holidays', 'media', 'location'].forEach(function (name) {
        fs.mkdirSync(path.join(kb, name), { recursive: true });
        fs.writeFileSync(path.join(kb, name, 'nodes'), '{"_id":"' + name + '"}\n');
    });
    assert.strictEqual(run(), false, 'all databases present: jibo-kb is not loaded');
    fs.unlinkSync(path.join(kb, 'holidays', 'nodes'));
    assert.strictEqual(run(), true, 'a missing database: jibo-kb is loaded');
    assert(fs.statSync(path.join(kb, 'holidays', 'nodes')).size > 0, 'and the database is created');
    console.log('Knowledge bootstrap skips loading jibo-kb when nothing needs creating');
} finally { child.spawnSync('rm', ['-rf', root]); }
