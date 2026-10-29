'use strict';
var fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
var bootstrap = require('../usr/local/lib/jibo/knowledge-bootstrap');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-stale-'));
var base = path.join(root, 'opt/jibo/Knowledge');
fs.mkdirSync(path.join(root, 'opt')); fs.mkdirSync(path.join(root, 'opt/jibo')); fs.mkdirSync(base);
var lock = path.join(base, '.bootstrap-lock'), pid = path.join(lock, 'pid');
fs.mkdirSync(lock); fs.writeFileSync(pid, '2147483647');
var kill = process.kill, result;
process.kill = function () {
    fs.unlinkSync(pid); fs.rmdirSync(lock);
    fs.mkdirSync(lock); fs.writeFileSync(pid, String(process.pid));
    var err = new Error('old owner exited'); err.code = 'ESRCH'; throw err;
};
try {
    bootstrap.initialize({root: root}, function (err) { result = err; });
    assert(result, 'stale owner must fail closed');
    assert.strictEqual(fs.readFileSync(pid, 'utf8'), String(process.pid), 'replacement owner must remain');
    fs.unlinkSync(pid);
    var now = Date.now;
    Date.now = function () { Date.now = function () { return 31000; }; return 0; };
    try {
        result = null;
        bootstrap.initialize({root: root}, function (err) { result = err; });
        assert(result, 'unknown lock must time out');
        assert(fs.existsSync(lock), 'unknown lock must remain');
    } finally { Date.now = now; }
    console.log('Replacement live and unknown locks preserved');
} finally {
    process.kill = kill;
    if (fs.existsSync(pid)) { fs.unlinkSync(pid); } fs.rmdirSync(lock); fs.rmdirSync(base);
    fs.rmdirSync(path.join(root, 'opt/jibo')); fs.rmdirSync(path.join(root, 'opt')); fs.rmdirSync(root);
}
