'use strict';
var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var child = require('child_process');
var runtime = require('../usr/local/lib/jibo/runtime-state');
var bootstrap = path.resolve(__dirname, '../usr/local/bin/jibo-runtime-bootstrap');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'jibo-bootstrap-'));
function file(name) { return root + name; }
function json(name) { return JSON.parse(fs.readFileSync(file(name), 'utf8')); }
function remove(dir) {
    if (fs.statSync(dir).isDirectory()) {
        fs.readdirSync(dir).forEach(function (name) { remove(path.join(dir, name)); });
        fs.rmdirSync(dir);
    } else { fs.unlinkSync(dir); }
}
function run(args) {
    return child.spawnSync(process.execPath, [bootstrap, '--root', root].concat(args || []), { encoding: 'utf8' });
}
function concurrent() {
    return new Promise(function (resolve, reject) {
        var process = child.spawn(global.process.execPath, [bootstrap, '--root', root, '--knowledge']);
        var error = '';
        process.stderr.on('data', function (data) { error += data; });
        process.on('error', reject);
        process.on('exit', function (status) { if (status) { reject(new Error(error)); } else { resolve(); } });
    });
}
var originals = {};
try {
    runtime.directory(file('/var/jibo/lps'));
    ['/var/jibo/identity.json', '/var/jibo/mode.json', '/var/jibo/lps/CameraModelParamsL.json'].forEach(function (name) {
        originals[name] = JSON.stringify({ fixture: name }); fs.writeFileSync(file(name), originals[name]);
    });
    assert.strictEqual(run(['--knowledge']).status, 0);
    var creds = json('/var/jibo/credentials.json');
    assert(/^local-[a-f0-9]+$/.test(creds.accessKeyId));
    assert(creds.secretAccessKey.length >= 32);
    assert.strictEqual(creds.region, 'api');
    assert.strictEqual(creds.endpoint, 'http://joap.5x1.com:80');
    assert.strictEqual(fs.statSync(file('/var/jibo/credentials.json')).mode & 511, 384);
    assert.strictEqual(fs.statSync(file('/var/jibo/keys')).mode & 511, 448);
    assert.strictEqual(fs.statSync(file('/opt/jibo/Knowledge/beacon/units.json')).mode & 511, 438);
    assert.strictEqual(json('/opt/jibo/Knowledge/beacon/units.json').temperature, 'fahrenheit');
    assert.strictEqual(json('/opt/jibo/Knowledge/beacon/camera-stream-settings.json').enabled, true);
    assert(!fs.existsSync(file('/opt/jibo/Knowledge/beacon/homeassistant.json')));
    ['/opt/jibo/Photos', '/opt/jibo/Recordings', '/var/jibo/identity/faces', '/var/jibo/asr/namelearning_temp'].forEach(function (name) {
        assert(fs.statSync(file(name)).isDirectory());
    });
    ['loop', 'robot', 'holidays', 'media', 'location'].forEach(function (name) {
        var filename = '/opt/jibo/Knowledge/jibo/' + name + '/nodes';
        var nodes = fs.readFileSync(file(filename), 'utf8').trim().split('\n').map(JSON.parse);
        assert.strictEqual(nodes.filter(function (n) { return n.type === 'root'; }).length, 1);
        assert.deepEqual(nodes[0].data, {});
        originals[filename] = fs.readFileSync(file(filename), 'utf8');
    });
    originals['/var/jibo/credentials.json'] = fs.readFileSync(file('/var/jibo/credentials.json'), 'utf8');
    assert.strictEqual(run(['--knowledge']).status, 0);
    var store = file('/opt/jibo/Knowledge/jibo/loop/nodes');
    var savedStore = fs.readFileSync(store, 'utf8');
    fs.writeFileSync(store, 'malformed database');
    assert.strictEqual(run(['--knowledge']).status, 1);
    assert.strictEqual(fs.readFileSync(store, 'utf8'), 'malformed database');
    fs.writeFileSync(store, savedStore);
    var staleLock = file('/opt/jibo/Knowledge/.bootstrap-lock');
    fs.mkdirSync(staleLock);
    fs.writeFileSync(path.join(staleLock, 'pid'), '2147483647');
    assert.strictEqual(run(['--knowledge']).status, 0, 'Interrupted bootstrap locks recover');
    assert(!fs.existsSync(staleLock));
    Object.keys(originals).forEach(function (name) { assert.strictEqual(fs.readFileSync(file(name), 'utf8'), originals[name]); });
    remove(file('/opt/jibo/Knowledge/jukebox'));
    runtime.ensure({ root: root, service: 'beam', credentials: false });
    assert(fs.statSync(file('/opt/jibo/Knowledge/jukebox/music')).isDirectory());
    var credentialPath = file('/var/jibo/credentials.json');
    // A damaged credentials.json (e.g. 0 bytes after power loss) warns but must not block any service or S04.
    ['{bad', '', '[]', '{}'].forEach(function (damaged) {
        fs.writeFileSync(credentialPath, damaged);
        [[], ['--service', 'body'], ['--service', 'ssm', '--knowledge']].forEach(function (args) {
            var bad = run(args);
            assert.strictEqual(bad.status, 0, JSON.stringify(damaged) + ' ' + args.join(' ') + ': ' + bad.stderr);
            assert(/warning/.test(bad.stderr));
            assert(!bad.stderr.includes('secretAccessKey'));
        });
        assert.strictEqual(fs.readFileSync(credentialPath, 'utf8'), damaged, 'Damaged credentials are never overwritten');
    });
    fs.writeFileSync(credentialPath, '');
    var launcher = fs.readFileSync(path.resolve(__dirname, '../usr/local/bin/jibo-service-start'), 'utf8')
        .replace(/\/usr\/local\/bin\/jibo-runtime-bootstrap/g, process.execPath + ' ' + bootstrap + ' --root ' + root);
    var started = child.spawnSync('sh', ['-c', launcher, 'jibo-service-start', 'audio', 'echo', 'audio started'], { encoding: 'utf8' });
    assert.strictEqual(started.status, 0, started.stderr);
    assert.strictEqual(started.stdout, 'audio started\n');
    fs.writeFileSync(credentialPath, originals['/var/jibo/credentials.json']);
    var unitsPath = file('/opt/jibo/Knowledge/beacon/units.json');
    fs.writeFileSync(unitsPath, '{"temperature":"celsius","extra":"preserve"}');
    runtime.ensure({ root: root });
    assert.strictEqual(json('/opt/jibo/Knowledge/beacon/units.json').extra, 'preserve');
    fs.writeFileSync(unitsPath, 'malformed');
    assert.strictEqual(run(['--service', 'ssm']).status, 0, 'A damaged units.json is read as Fahrenheit, not fatal');
    assert.strictEqual(fs.readFileSync(unitsPath, 'utf8'), 'malformed');
    fs.unlinkSync(unitsPath);
    fs.chmodSync(file('/opt/jibo/Knowledge'), 320);
    assert.strictEqual(run().status, 1);
    fs.chmodSync(file('/opt/jibo/Knowledge'), 511);
    // Concurrent first starts must publish one credential set and one KB root.
    fs.unlinkSync(credentialPath);
    remove(file('/opt/jibo/Knowledge/jibo'));
} catch (err) { remove(root); throw err; }
Promise.all([concurrent(), concurrent(), concurrent(), concurrent()]).then(function () {
    ['loop', 'robot', 'holidays', 'media', 'location'].forEach(function (name) {
        var nodes = fs.readFileSync(file('/opt/jibo/Knowledge/jibo/' + name + '/nodes'), 'utf8').trim().split('\n').map(JSON.parse);
        assert.strictEqual(nodes.filter(function (n) { return n.type === 'root'; }).length, 1);
    });
    assert(json('/var/jibo/credentials.json').secretAccessKey);
    console.log('Fresh state, preservation, missing-data repair, failures and concurrent startup passed');
    remove(root);
}).catch(function (err) { if (fs.existsSync(root)) { remove(root); } console.error(err); global.process.exitCode = 1; });
