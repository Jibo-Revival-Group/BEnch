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
                    // shortcut: stale locks need manual removal, upgrade when exclusion can be proven.
                    callback(new Error('KB bootstrap stale lock requires manual removal')); return;
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // A creator may be between mkdir and publishing its PID.
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


// Run by jibo-runtime-bootstrap under flock, so no supported initializer can
// hold the old directory lock now; legacy ones end at the OTA reboot.
if (require.main === module) {
    try {
        var options = JSON.parse(process.argv[2]);
        var root = options.root ? path.resolve(options.root) : '';
        var lock = root + '/opt/jibo/Knowledge/.bootstrap-lock';
        var stat;
        try { stat = fs.lstatSync(lock); }
        catch (err) { if (err.code !== 'ENOENT') { throw err; } }
        if (stat) {
            var entries = stat.isDirectory() ? fs.readdirSync(lock) : null;
            if (!entries || entries.length > 1 || (entries.length === 1 && entries[0] !== 'pid')) {
                throw new Error('Unknown KB bootstrap lock');
            }
            if (entries.length) {
                var pidFile = path.join(lock, 'pid');
                var pidStat = fs.lstatSync(pidFile);
                if (!pidStat.isFile()) { throw new Error('Unknown KB bootstrap lock owner'); }
                var text = fs.readFileSync(pidFile, 'utf8');
                var boot = Number(/^btime (\d+)$/m.exec(fs.readFileSync('/proc/stat', 'utf8'))[1]) * 1000;
                // Before this boot the owner is gone even if its PID was reused.
                if (/^[1-9][0-9]{0,9}$/.test(text) && pidStat.mtime.getTime() >= boot) {
                    try { process.kill(Number(text), 0); throw new Error('KB bootstrap lock owner is live'); }
                    catch (err) { if (err.code !== 'ESRCH') { throw err; } }
                }
                fs.unlinkSync(pidFile);
            }
            fs.rmdirSync(lock);
        }
        initialize(options, function (err) {
            if (err) { console.error('[bootstrap] KB initialization failed: ' + err.message); }
            process.exit(err ? 1 : 0);
        });
    } catch (err) { console.error('[bootstrap] KB initialization failed: ' + err.message); process.exit(1); }
}
