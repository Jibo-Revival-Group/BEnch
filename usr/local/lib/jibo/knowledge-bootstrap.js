'use strict';

// Only the pre-service bootstrap opens databases here; SSM owns live writers.
var fs = require('fs');
var path = require('path');
var runtime = require('./runtime-state');
var namespaces = ['/jibo/loop', '/jibo/robot', '/jibo/holidays', '/jibo/media', '/jibo/location'];

function initialize(options, callback) {
    var opts = options || {};
    var root = opts.root ? path.resolve(opts.root) : '';
    var base = runtime.directory(root + '/opt/jibo/Knowledge');
    var lock = path.join(base, '.bootstrap-lock');
    var started = Date.now();
    function acquire() {
        try { fs.mkdirSync(lock, 0o700); }
        catch (err) {
            if (err.code !== 'EEXIST') { callback(err); return; }
            try {
                var owner = Number(fs.readFileSync(path.join(lock, 'pid'), 'utf8'));
                try { process.kill(owner, 0); }
                catch (error) {
                    if (error.code !== 'ESRCH') { throw error; }
                    fs.unlinkSync(path.join(lock, 'pid'));
                    fs.rmdirSync(lock);
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // A creator may be between mkdir and publishing its PID.
                    try {
                        if (Date.now() - fs.statSync(lock).mtime.getTime() > 30000) { fs.rmdirSync(lock); }
                    } catch (ignored) { /* creator released it */ }
                } else { callback(error); return; }
            }
            if (Date.now() - started > 30000) { callback(new Error('KB bootstrap lock timeout')); return; }
            setTimeout(acquire, 25);
            return;
        }
        fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
        seed();
    }
    function seed() {
        var Database, originalRoot;
        var finished = false;
        function finish(err) {
            if (finished) { if (err) { throw err; } return; }
            finished = true;
            if (Database) { Database.getRootDirectory = originalRoot; }
            fs.unlinkSync(path.join(lock, 'pid'));
            fs.rmdirSync(lock);
            callback(err);
        }
        try {
            var kb = opts.kb || require('../../bin/jibo-ssm/node_modules/jibo-kb');
            Database = kb.KnowledgeDatabase;
            originalRoot = Database.getRootDirectory;
            Database.getRootDirectory = function () { return base; };
            // Register the SDK's own robot/loop node classes.
            new kb.KnowledgeBase();
            var pending = namespaces.slice();
            function next(err) {
                if (finished) { return; }
                if (err) { finish(err); return; }
                if (!pending.length) { finish(); return; }
                try {
                    var name = pending.shift();
                    var db = new Database(name);
                    var filename = Database.getKbFilename(name);
                    runtime.directory(path.dirname(filename));
                    // Existing databases belong to SSM; preserve their bytes.
                    try {
                        if (fs.statSync(filename).size > 0) {
                            // Validate the native JSONL store without NeDB compaction
                            // rewriting existing data during preparation.
                            fs.readFileSync(filename, 'utf8').split('\n').forEach(function (line) {
                                if (!line.trim()) { return; }
                                var value;
                                try { value = JSON.parse(line); }
                                catch (error) { throw new Error('Malformed Knowledge database: ' + filename); }
                                if (!value || typeof value !== 'object' || Array.isArray(value)) {
                                    throw new Error('Malformed Knowledge database: ' + filename);
                                }
                            });
                            next(); return;
                        }
                    } catch (error) { if (error.code !== 'ENOENT') { throw error; } }
                    db.init(next);
                } catch (error) { finish(error); }
            }
            next();
        } catch (err) { finish(err); }
    }
    acquire();
}
module.exports = { initialize: initialize, namespaces: namespaces };
