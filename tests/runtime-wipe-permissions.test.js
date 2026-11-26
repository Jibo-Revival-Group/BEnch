'use strict';
// After a factory reset, SSM recreates Knowledge/Photos/Recordings as root 0750; the root bootstrap must reopen them for Be.
var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var runtime = require('../usr/local/lib/jibo/runtime-state');
if (process.getuid() !== 0) { console.log('skipped: needs root'); process.exit(0); }
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'jibo-wipe-perm-'));
try {
    ['/opt/jibo/Knowledge', '/opt/jibo/Photos', '/opt/jibo/Recordings'].forEach(function (d) {
        fs.mkdirSync(root + d, { recursive: true }); fs.chmodSync(root + d, 0o750);
    });
    fs.mkdirSync(root + '/var/jibo/keys', { recursive: true }); fs.chmodSync(root + '/var/jibo/keys', 0o700);
    runtime.ensure({ root: root, credentials: false });
    ['/opt/jibo/Knowledge', '/opt/jibo/Photos', '/opt/jibo/Recordings'].forEach(function (d) {
        assert.strictEqual(fs.statSync(root + d).mode & 0o777, 0o777, d);
    });
    assert.strictEqual(fs.statSync(root + '/var/jibo/keys').mode & 0o777, 0o700, 'keys stay private');
    console.log('wiped folders reopened for Be; keys stay private');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
