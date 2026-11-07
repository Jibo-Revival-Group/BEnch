'use strict';

// Only the pre-service bootstrap opens databases here; SSM owns live writers.
var fs = require('fs');
var path = require('path');
var runtime = require('./runtime-state');
var namespaces = ['/jibo/loop', '/jibo/robot', '/jibo/holidays', '/jibo/media', '/jibo/location'];
var SKIP_DIRS = { 'beacon': true, '5x1-release-backups': true, 'assets': true };
// shortcut: bigger databases are not checked at startup (memory, and SSM's 60 s launch window); stream them if one ever needs repair.
var MAX_REPAIR_BYTES = 64 * 1024 * 1024;

// Synchronous so the message survives process.exit even when stderr is a pipe; syslog so it shows in /var/log/messages.
function report(message, opts) {
    try { fs.writeSync(2, '[bootstrap] ' + message + '\n'); } catch (e) {}
    if (opts && opts.root) { return; }
    try { require('child_process').spawnSync('/usr/bin/logger', ['-t', 'jibo-kb-bootstrap', message]); } catch (e) {}
}

function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function parseRecord(text) { try { var v = JSON.parse(text); return isRecord(v) ? v : null; } catch (e) { return null; } }

// NeDB records (and its index markers); nested objects inside a cut-off record are not records.
function isDatabaseRecord(value) {
    return isRecord(value) && (value._id !== undefined || value.$$indexCreated !== undefined || value.$$deleted !== undefined);
}
var RECORD_START = /\{"(_id|\$\$)/g;

// Pull every complete record out of a damaged line: NUL padding, "{a}{b}" with a lost newline, a cut-off record.
function salvage(line) {
    var found = [], from = 0, match;
    // shortcut: damaged lines over 16 MB are dropped, not scanned; real records are at most hundreds of KB.
    if (line.length > 16 * 1048576) { return found; }
    while (from < line.length) {
        RECORD_START.lastIndex = from;
        match = RECORD_START.exec(line);
        if (!match) { break; }
        var start = match.index;
        var depth = 0, quoted = false, escaped = false, end = -1;
        for (var i = start; i < line.length && end < 0; i++) {
            var c = line[i];
            if (quoted) {
                if (escaped) { escaped = false; } else if (c === '\\') { escaped = true; } else if (c === '"') { quoted = false; }
            } else if (c === '"') { quoted = true; }
            else if (c === '{') { depth++; }
            else if (c === '}' && --depth === 0) { end = i; }
        }
        var record = end < 0 ? null : parseRecord(line.slice(start, end + 1));
        if (record && !isDatabaseRecord(record)) { record = null; }
        if (record) { found.push(JSON.stringify(record)); from = end + 1; } else { from = start + 1; }
    }
    return found;
}

// Keeps every valid record and everything salvageable from damaged lines; the original is kept beside it.
function repairFile(filename) {
    var raw = fs.readFileSync(filename), kept = [], damaged = 0, salvaged = 0;
    raw.toString('utf8').split('\n').forEach(function (line) {
        if (!line.trim()) { return; }
        if (parseRecord(line)) { kept.push(line); return; }
        damaged++;
        var parts = salvage(line);
        salvaged += parts.length;
        kept = kept.concat(parts);
    });
    if (!damaged) { return null; }
    var mode = fs.statSync(filename).mode & 511;
    var backup = filename + '.damaged-' + new Date().toISOString().replace(/[:.]/g, '-');
    var tmp = filename + '.repair';
    // The original stays in place until the rename; a failed write (e.g. disk full) leaves no partial files.
    try {
        fs.writeFileSync(backup, raw); fs.chmodSync(backup, mode);
        fs.writeFileSync(tmp, kept.length ? kept.join('\n') + '\n' : ''); fs.chmodSync(tmp, mode);
        var fd = fs.openSync(tmp, 'r'); fs.fsyncSync(fd); fs.closeSync(fd);
    } catch (err) {
        try { fs.unlinkSync(tmp); } catch (e) {}
        try { fs.unlinkSync(backup); } catch (e) {}
        throw err;
    }
    fs.renameSync(tmp, filename);
    return { damaged: damaged, salvaged: salvaged, kept: kept.length, backup: backup };
}

// Interaction memory: greetings look back at most 6 days; keep 2 weeks plus each person's last 3 events.
// Same rule as noteEvent in BEam's jibo-interaction-memory.
var HISTORY_KEEP_MS = 14 * 86400000, HISTORY_KEEP_PER_PERSON = 3;
function pruneHistory(history, now) {
    var seen = {}, kept = [];
    for (var i = history.length - 1; i >= 0; i--) {
        var e = history[i], keep = now - Number(e && e.timestamp) <= HISTORY_KEEP_MS;
        ((e && e.description && e.description.personIDs) || []).forEach(function (id) {
            seen[id] = (seen[id] || 0) + 1;
            if (seen[id] <= HISTORY_KEEP_PER_PERSON) { keep = true; }
        });
        if (keep) { kept.push(e); }
    }
    return kept.reverse();
}

// NeDB appends the whole history record on every save and only compacts when it loads the file, which it can't once
// the file is too big (931 MB seen). Keep the newest copy of each record, with its history pruned.
function compactInteractionMemory(file, now) {
    var latest = {}, order = [], stat = fs.statSync(file), tmp = file + '.compact', out;
    function keep(key, line) { if (!(key in latest)) { order.push(key); } latest[key] = line; }
    function take(record) {
        if (record.$$deleted) { delete latest[record._id]; return; }
        keep(record.$$indexCreated ? '$$index ' + record.$$indexCreated.fieldName : record._id, JSON.stringify(record));
    }
    require('./kb-deep-repair').eachLine(file, function (line) {
        if (line === null || !line.trim()) { return; }
        // Fast path for the ~300 KB copies: id from the prefix; a line cut off mid-record doesn't end in "}".
        var m = /^\{"_id":"([^"]*)"/.exec(line);
        if (m && line[line.length - 1] === '}') { keep(m[1], line); return; }
        var record = parseRecord(line);
        if (record && isDatabaseRecord(record)) { take(record); return; }
        salvage(line).forEach(function (part) { take(JSON.parse(part)); });
    });
    var kept = 0;
    try {
        out = fs.openSync(tmp, 'w', stat.mode & 511);
        order.forEach(function (key) {
            if (!(key in latest)) { return; }
            var line = latest[key], record = parseRecord(line);
            if (!record) { return; }
            if (record.type === 'history' && record.data && Array.isArray(record.data.history)) {
                record.data.history = pruneHistory(record.data.history, now);
                line = JSON.stringify(record);
            }
            fs.writeSync(out, line + '\n'); kept++;
        });
        fs.fsyncSync(out); fs.closeSync(out); out = null;
        fs.chmodSync(tmp, stat.mode & 511);
        fs.renameSync(tmp, file);
    } catch (err) {
        if (out !== null && out !== undefined) { try { fs.closeSync(out); } catch (e) {} }
        try { fs.unlinkSync(tmp); } catch (e) {}
        throw err;
    }
    return { before: stat.size, after: fs.statSync(file).size, kept: kept };
}

// Every Knowledge database is a "nodes" JSON-lines file; repair them all before SSM opens them.
function repairTree(dir, opts) {
    var names;
    try { names = fs.readdirSync(dir); } catch (e) { report('cannot read ' + dir + ': ' + e.message, opts); return; }
    names.forEach(function (name) {
        var file = path.join(dir, name), stat;
        try { stat = fs.lstatSync(file); } catch (e) { return; }
        if (stat.isDirectory()) { if (!SKIP_DIRS[name]) { repairTree(file, opts); } return; }
        if (name !== 'nodes' || !stat.isFile()) { return; }
        if (stat.size > MAX_REPAIR_BYTES && path.basename(dir) === 'interactionmemory') {
            try {
                var c = compactInteractionMemory(file, Date.now());
                report('compacted ' + file + ': ' + c.before + ' -> ' + c.after + ' bytes, ' + c.kept + ' record(s)', opts);
            } catch (e) { report('could not compact ' + file + ': ' + e.message, opts); }
            return;
        }
        if (stat.size > MAX_REPAIR_BYTES) { report('not checked (too large, ' + stat.size + ' bytes): ' + file, opts); return; }
        try {
            var result = repairFile(file);
            if (result) {
                report('repaired ' + file + ': ' + result.damaged + ' damaged line(s), ' + result.salvaged +
                    ' record(s) recovered from them, ' + result.kept + ' kept; original saved as ' + result.backup, opts);
            }
        } catch (e) { report('could not repair ' + file + ': ' + e.message, opts); }
    });
}

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
            repairTree(base, opts);
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
                    // Existing databases belong to SSM (already repaired above); don't let NeDB compact them here.
                    try {
                        if (fs.statSync(filename).size > 0) { next(); return; }
                    } catch (error) { if (error.code !== 'ENOENT') { throw error; } }
                    db.init(next);
                } catch (error) { finish(error); }
            }
            next();
        } catch (err) { finish(err); }
    }
    acquire();
}
module.exports = { initialize: initialize, namespaces: namespaces, repairFile: repairFile, salvage: salvage,
    pruneHistory: pruneHistory, compactInteractionMemory: compactInteractionMemory,
    report: report, SKIP_DIRS: SKIP_DIRS, MAX_REPAIR_BYTES: MAX_REPAIR_BYTES };


// Run by jibo-runtime-bootstrap under flock, so no supported initializer can
// hold the old directory lock now; legacy ones end at the OTA reboot.
if (require.main === module) {
    try {
        var options = JSON.parse(process.argv[2]);
        var root = options.root ? path.resolve(options.root) : '';
        // SSM's startup removes this marker once it is up; still present = the last launch never finished.
        var pending = root + '/run/jibo-ssm-pending', deepDone = root + '/run/jibo-kb-deep-repair.done';
        if (options.service === 'ssm') {
            if (fs.existsSync(pending) && !fs.existsSync(deepDone)) {
                // Hand over to the deep repair; it waits for this flock, so SSM stays down until it finishes.
                report('SSM did not start last time; running a deep Knowledge check', options);
                var deep = require('child_process').spawn('/usr/bin/flock', ['-w', '1800', root + '/var/jibo/.knowledge-bootstrap-flock',
                    process.execPath, path.join(__dirname, 'kb-deep-repair.js'), JSON.stringify(options)], { detached: true, stdio: 'ignore' });
                deep.unref();
                process.exit(1);
            }
            try { fs.writeFileSync(pending, String(Date.now())); } catch (e) {}
        }
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
            if (err) { report('KB initialization failed: ' + err.message, options); }
            process.exit(err ? 1 : 0);
        });
    } catch (err) { report('KB initialization failed: ' + err.message); process.exit(1); }
}
