'use strict';
// V8 code cache for require() (Node 6 / Electron 1.4). Jibo's CPU spends seconds compiling the same JavaScript on
// every boot; V8 can save the compiled code and reuse it, so compile time is paid once per file version.
//
// Safety: compiled code runs with the loading process's rights, so each user gets its own cache directory that only
// it can write (/var/lib/jibo-code-cache/<uid>, mode 0700), inside a root-owned sticky parent. If anything about the
// directories looks wrong the cache is simply not used. Entries are checked against a SHA-1 of the source, so a
// changed file is never run from stale cached code; V8 also rejects data from another V8 version or that is damaged.
// JIBO_CODE_CACHE=0 turns it off.
var Module = require('module'), vm = require('vm'), fs = require('fs'), path = require('path'), crypto = require('crypto');

var ROOT = process.env.JIBO_CODE_CACHE_DIR || '/var/lib/jibo-code-cache';

function cacheDir() {
    if (process.env.JIBO_CODE_CACHE === '0' || typeof process.getuid !== 'function') { return null; }
    var uid = process.getuid(), dir = path.join(ROOT, String(uid)), stat;
    try {
        if (uid === 0) { try { fs.mkdirSync(ROOT, parseInt('1777', 8)); fs.chmodSync(ROOT, parseInt('1777', 8)); } catch (e) {} }
        stat = fs.lstatSync(ROOT);
        // Root-owned and sticky: nobody else can rename or replace another user's directory.
        if (!stat.isDirectory() || stat.uid !== 0 || !(stat.mode & parseInt('1000', 8))) { return null; }
        try { fs.mkdirSync(dir, parseInt('700', 8)); } catch (e) {}
        stat = fs.lstatSync(dir);
        if (!stat.isDirectory() || stat.uid !== uid || (stat.mode & parseInt('077', 8))) { return null; }
        return dir;
    } catch (e) { return null; }
}

function install(dir) {
    var compile = Module.prototype._compile;
    Module.prototype._compile = function (content, filename) {
        var source = Module.wrap(content.replace(/^#!.*/, ''));
        var hash = crypto.createHash('sha1').update(source).digest();
        var file = path.join(dir, crypto.createHash('sha1').update(filename).digest('hex'));
        var cached = null, script;
        try {
            var data = fs.readFileSync(file);
            if (data.length > 20 && data.slice(0, 20).equals(hash)) { cached = data.slice(20); }
        } catch (e) {}
        try {
            script = new vm.Script(source, { filename: filename, cachedData: cached || undefined, produceCachedData: !cached });
        } catch (e) { return compile.call(this, content, filename); }   // syntax errors: let Node report them as usual
        if ((!cached || script.cachedDataRejected) && script.cachedData) {
            var temporary = file + '.' + process.pid;
            try { fs.writeFileSync(temporary, Buffer.concat([hash, script.cachedData]), { mode: parseInt('600', 8) }); fs.renameSync(temporary, file); }
            catch (e) { try { fs.unlinkSync(temporary); } catch (e2) {} }
        }
        var fn = script.runInThisContext({ displayErrors: true }), self = this;
        function require(id) { return self.require(id); }
        require.resolve = function (request) { return Module._resolveFilename(request, self); };
        require.main = process.mainModule;
        require.extensions = Module._extensions;
        require.cache = Module._cache;
        // Electron's renderer wrapper also takes process, global and Buffer; plain Node ignores them.
        return fn.call(self.exports, self.exports, require, self, filename, path.dirname(filename), process, global, Buffer);
    };
}

var dir = cacheDir();
if (dir) { install(dir); }
module.exports = { dir: dir };
