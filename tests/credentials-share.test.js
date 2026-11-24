'use strict';
// Be (BEacon calendar/commute, Server tab) runs as jibo-skill and must read and write credentials.json and the jetstream
// config: root-owned, group jibo-skill, 0660, whether the bootstrap created it, the old PM left it 0777, or it was 0600.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), child = require('child_process');
var runtime = require('../usr/local/lib/jibo/runtime-state');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'creds-share-'));
var file = root + '/var/jibo/credentials.json';
var asRoot = typeof process.getuid === 'function' && process.getuid() === 0;
try {
    fs.mkdirSync(root + '/etc');
    fs.writeFileSync(root + '/etc/group', 'root:x:0:\njibo-skill:x:2000:\nvideo:x:28:jibo-skill\n');
    function check(label) {
        var stat = fs.statSync(file);
        assert.strictEqual(stat.mode & 511, 432, label + ': mode 0660');
        if (asRoot) { assert.strictEqual(stat.uid, 0, label + ': root owns it'); assert.strictEqual(stat.gid, 2000, label + ': group jibo-skill'); }
    }
    runtime.credentials(root);
    check('created');
    var keys = JSON.parse(fs.readFileSync(file, 'utf8'));
    fs.chmodSync(file, 511);
    runtime.credentials(root);
    check('old PM 0777');
    fs.chmodSync(file, 384);
    runtime.credentials(root);
    check('earlier 0600');
    assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).secretAccessKey, keys.secretAccessKey, 'keys untouched');
    // The jetstream config (BEacon's hub setting) on a full bootstrap.
    file = root + '/usr/local/etc/jibo-jetstream-service.json';
    fs.mkdirSync(root + '/usr'); fs.mkdirSync(root + '/usr/local'); fs.mkdirSync(root + '/usr/local/etc');
    fs.writeFileSync(file, '{}', { mode: 488 });
    runtime.ensure({ root: root, service: 'asr', credentials: false });
    assert.strictEqual(fs.statSync(file).mode & 511, 488, 'a service start leaves it');
    runtime.ensure({ root: root, credentials: false });
    check('jetstream config');
    console.log('credentials.json and the jetstream config are read/write for Be (jibo-skill group) only' + (asRoot ? '' : ' (owner/group checked only as root)'));
} finally { child.spawnSync('rm', ['-rf', root]); }
