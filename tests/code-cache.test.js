'use strict';
// V8 code cache for require(): same results with and without it, reused on the next run, never runs stale code
// for a changed file (even one with the same length and mtime), and refuses directories others could write.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), child = require('child_process');
var hook = path.join(__dirname, '../usr/local/lib/jibo/code-cache.js');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'code-cache-'));
var cache = path.join(root, 'cache'), mod = path.join(root, 'mod.js'), main = path.join(root, 'main.js');
function run(extraEnv) {
    var r = child.spawnSync(process.execPath, ['-r', hook, main], { encoding: 'utf8',
        env: Object.assign({}, process.env, { JIBO_CODE_CACHE_DIR: cache }, extraEnv || {}) });
    assert.strictEqual(r.status, 0, r.stderr);
    return r.stdout.trim();
}
function entries() { try { return fs.readdirSync(path.join(cache, String(process.getuid()))); } catch (e) { return []; } }
try {
    fs.writeFileSync(main, "var m = require('./mod'); console.log(m.value + ' ' + (require.resolve('./mod') === __dirname + '/mod.js') + ' ' + (module.id === '.') + ' ' + typeof require.cache);\n");
    fs.writeFileSync(mod, "exports.value = 'one';\n");
    var stamp = new Date(2026, 0, 1);
    fs.utimesSync(mod, stamp, stamp);
    var expected = run({ JIBO_CODE_CACHE: '0' });
    assert.strictEqual(expected, 'one true true object');
    assert.deepStrictEqual(entries(), [], 'JIBO_CODE_CACHE=0 turns it off');
    if (process.getuid() !== 0) {
        // As a normal user the root-owned parent can't exist here; the hook must quietly do nothing.
        assert.strictEqual(run(), expected);
        assert.deepStrictEqual(entries(), []);
        console.log('code cache: skipped safely when not root (run as root for the full test)');
        return;
    }
    assert.strictEqual(run(), expected, 'first run fills the cache');
    var stat = fs.lstatSync(cache);
    assert.strictEqual(stat.mode & parseInt('1777', 8), parseInt('1777', 8), 'parent is sticky and world-usable');
    assert.strictEqual(fs.lstatSync(path.join(cache, '0')).mode & parseInt('777', 8), parseInt('700', 8), 'own directory is private');
    assert.strictEqual(entries().length, 2, 'one entry per module');
    var before = entries().map(function (n) { return fs.readFileSync(path.join(cache, '0', n)).toString('hex'); }).sort();
    assert.strictEqual(run(), expected, 'second run uses the cache');
    assert.deepStrictEqual(entries().map(function (n) { return fs.readFileSync(path.join(cache, '0', n)).toString('hex'); }).sort(), before, 'and leaves it alone');
    // Same length, same mtime, different code: must run the new code.
    fs.writeFileSync(mod, "exports.value = 'two';\n");
    fs.utimesSync(mod, stamp, stamp);
    assert.strictEqual(run(), 'two true true object', 'changed source is never run from stale cached code');
    // A damaged entry is ignored and rewritten.
    entries().forEach(function (n) { fs.writeFileSync(path.join(cache, '0', n), Buffer.alloc(64, 7)); });
    assert.strictEqual(run(), 'two true true object');
    // A cache directory others could write is not used.
    fs.chmodSync(path.join(cache, '0'), parseInt('777', 8));
    entries().forEach(function (n) { fs.unlinkSync(path.join(cache, '0', n)); });
    assert.strictEqual(run(), 'two true true object');
    assert.deepStrictEqual(entries(), [], 'world-writable cache directory: not used');
    fs.chmodSync(path.join(cache, '0'), parseInt('700', 8));
    // Electron's renderer wraps modules with extra process/global/Buffer parameters (Be runs there).
    fs.writeFileSync(path.join(root, 'electron.js'), "require('module').wrap = function (c) { return '(function (exports, require, module, __filename, __dirname, process, global, Buffer) { return function (exports, require, module, __filename, __dirname) { ' + c + '\\n}.call(this, exports, require, module, __filename, __dirname); });'; };\n");
    fs.writeFileSync(mod, "exports.value = typeof process.versions + typeof global + typeof Buffer;\n");
    var e = child.spawnSync(process.execPath, ['-r', hook, '-r', path.join(root, 'electron.js'), main], { encoding: 'utf8', env: Object.assign({}, process.env, { JIBO_CODE_CACHE_DIR: cache }) });
    assert.strictEqual(e.stdout.trim(), 'objectobjectfunction true true object', e.stderr);
    // Syntax errors are reported like plain Node.
    fs.writeFileSync(mod, 'exports.value = ;\n');
    var r = child.spawnSync(process.execPath, ['-r', hook, main], { encoding: 'utf8', env: Object.assign({}, process.env, { JIBO_CODE_CACHE_DIR: cache }) });
    assert.notStrictEqual(r.status, 0);
    assert(/SyntaxError/.test(r.stderr) && r.stderr.indexOf(mod) >= 0, r.stderr);
    console.log('code cache: reuse, stale-source, damaged-entry, permission and syntax-error checks passed');
} finally { child.spawnSync('rm', ['-rf', root]); }
