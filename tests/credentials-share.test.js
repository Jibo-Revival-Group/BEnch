'use strict';
// Be (BEacon calendar/commute) runs as jibo-skill and must read credentials.json: root-owned, group jibo-skill, 0640,
// whether the bootstrap created it, the old PM left it world-writable (0777), or an earlier BEnch made it 0600.
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
        assert.strictEqual(stat.mode & 511, 416, label + ': mode 0640');
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
    console.log('credentials.json is readable by Be (jibo-skill group) and nobody else' + (asRoot ? '' : ' (owner/group checked only as root)'));
} finally { child.spawnSync('rm', ['-rf', root]); }
