'use strict';
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), child = require('child_process');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'resolv-watchguard-'));
var script = path.join(__dirname, '../usr/local/bin/resolv-watcher');
function run(file, mode, extraEnv) {
    var result = child.spawnSync('/bin/sh', [script], { env: Object.assign({}, process.env, { RESOLV_FILE: file, RESOLV_WATCH_ONCE: mode || '1' }, extraEnv || {}), encoding: 'utf8' });
    assert.strictEqual(result.status, 0, result.stderr || (result.error && result.error.message) || 'watcher command failed');
}
function content(file) { return fs.readFileSync(file); }
try {
    var target = path.join(root, 'target'), file = path.join(root, 'resolv.conf');
    fs.writeFileSync(file, ''); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, '  \n\t\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, 'search example.test\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, 'search example.test\nnameserver 1.1.1.1 # keep\n'); run(file, '1', { PATH: '' });
    assert.strictEqual(content(file).toString(), 'search example.test\nnameserver 1.1.1.1 # keep\n');
    fs.writeFileSync(file, 'nameserver invalid\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, 'nameserver\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, 'nameserver 256.1.1.1\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, 'nameserver 2001:4860:4860::8888\n'); run(file);
    assert.strictEqual(content(file).toString(), 'nameserver 2001:4860:4860::8888\n');
    fs.writeFileSync(file, 'nameserver 2001:4860:4860:0:0:0:0:8888\n'); run(file);
    assert.strictEqual(content(file).toString(), 'nameserver 2001:4860:4860:0:0:0:0:8888\n');
    fs.writeFileSync(file, 'nameserver ::ffff:192.0.2.1\n'); run(file);
    assert.strictEqual(content(file).toString(), 'nameserver ::ffff:192.0.2.1\n');
    fs.writeFileSync(file, 'nameserver 1:2:3:4:5:6:192.0.2.1\n'); run(file);
    assert.strictEqual(content(file).toString(), 'nameserver 1:2:3:4:5:6:192.0.2.1\n');
    fs.writeFileSync(file, 'nameserver ::192.0.2.1\n'); run(file);
    assert.strictEqual(content(file).toString(), 'nameserver ::192.0.2.1\n');
    fs.writeFileSync(file, 'nameserver 1:2:3:4:5:6:7:192.0.2.1\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, 'nameserver 192.0.2.1:1:2:3:4:5:6\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, 'nameserver 2001:::1\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(file, 'nameserver 2001::1::2\n'); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.unlinkSync(file); run(file);
    assert.deepStrictEqual(content(file), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    fs.writeFileSync(target, 'nameserver 9.9.9.9\n'); fs.unlinkSync(file); fs.symlinkSync(target, file);
    run(file); assert.strictEqual(fs.lstatSync(file).isSymbolicLink(), true);
    assert.strictEqual(content(target).toString(), 'nameserver 9.9.9.9\n');
    fs.writeFileSync(target, ''); run(file);
    assert.strictEqual(fs.lstatSync(file).isSymbolicLink(), true);
    assert.deepStrictEqual(content(target), Buffer.from('nameserver 8.8.8.8\nnameserver 8.8.4.4\n'));
    var config = require('../usr/local/etc/jibo-system-manager.json');
    assert(config.SystemManager.service.services.some(function (s) {
        return s.name === 'resolv-watcher' && s.order === 0 && s.executable === '/usr/local/bin/resolv-watcher' && s.modes.default.enabled === true;
    }), 'resolver watchguard starts as a managed service');
    console.log('DNS watchguard byte, restore, preservation, symlink, and manager config tests passed');
} finally {
    [file, target].forEach(function (p) { try { fs.unlinkSync(p); } catch (_) {} });
    fs.rmdirSync(root);
}
