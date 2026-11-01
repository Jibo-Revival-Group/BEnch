'use strict';
// Deep Knowledge repair, started by knowledge-bootstrap when the previous SSM launch never finished.
// Streams through every database (including ones too big for the startup check), shows a repair
// screen while it fixes damage, and never loses the original. Run under the Knowledge flock.
var fs = require('fs'), path = require('path'), child = require('child_process');
var StringDecoder = require('string_decoder').StringDecoder;
var bootstrap = require('./knowledge-bootstrap');

// Real records reach hundreds of KB (interaction history); anything past this is damage.
var MAX_LINE = 16 * 1048576;

function isRecordLine(line) {
    try { var v = JSON.parse(line); return !!v && typeof v === 'object' && !Array.isArray(v); } catch (e) { return false; }
}

// Calls onLine(text) per line, or onLine(null) for a line longer than MAX_LINE (treated as damaged).
function eachLine(file, onLine) {
    var fd = fs.openSync(file, 'r'), buf = Buffer.alloc(1048576), decoder = new StringDecoder('utf8');
    var rest = '', skipping = false, n;
    try {
        while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
            var text = rest + decoder.write(buf.slice(0, n));
            if (skipping) {
                var nl = text.indexOf('\n');
                if (nl < 0) { rest = ''; continue; }
                text = text.slice(nl + 1); skipping = false;
            }
            var parts = text.split('\n');
            rest = parts.pop();
            for (var i = 0; i < parts.length; i++) { if (onLine(parts[i].length > MAX_LINE ? null : parts[i]) === false) { return; } }
            if (rest.length > MAX_LINE) { if (onLine(null) === false) { return; } rest = ''; skipping = true; }
        }
        rest += decoder.end();
        if (rest && !skipping) { onLine(rest); }
    } finally { fs.closeSync(fd); }
}

function isDamaged(file) {
    var damaged = false;
    eachLine(file, function (line) {
        if (line === null || (line.trim() && !isRecordLine(line))) { damaged = true; return false; }
    });
    return damaged;
}

function freeBytes(dir) {
    var r = child.spawnSync('df', ['-k', dir], { encoding: 'utf8' });
    var fields = String(r.stdout || '').trim().split('\n').pop().trim().split(/\s+/);
    var kb = Number(fields[fields.length - 3]);
    return isFinite(kb) ? kb * 1024 : 0;
}

// Big files: the original becomes the backup (no full copy) and the repaired file streams out of it.
function repairLarge(file) {
    var stat = fs.statSync(file), mode = stat.mode & 511;
    if (freeBytes(path.dirname(file)) < stat.size + 16 * 1048576) {
        throw new Error('not enough free space to repair (' + stat.size + ' bytes needed)');
    }
    var backup = file + '.damaged-' + new Date().toISOString().replace(/[:.]/g, '-'), tmp = file + '.repair';
    fs.renameSync(file, backup);
    var damaged = 0, salvaged = 0, kept = 0, out;
    try {
        out = fs.openSync(tmp, 'w', mode);
        var write = function (line) { fs.writeSync(out, line + '\n'); kept++; };
        eachLine(backup, function (line) {
            if (line !== null && !line.trim()) { return; }
            if (line !== null && isRecordLine(line)) { write(line); return; }
            damaged++;
            if (line !== null) { bootstrap.salvage(line).forEach(function (s) { salvaged++; write(s); }); }
        });
        fs.fsyncSync(out); fs.closeSync(out); out = null;
        fs.chmodSync(tmp, mode);
        fs.renameSync(tmp, file);
    } catch (err) {
        if (out !== null && out !== undefined) { try { fs.closeSync(out); } catch (e) {} }
        try { fs.unlinkSync(tmp); } catch (e) {}
        fs.renameSync(backup, file);
        throw err;
    }
    return { damaged: damaged, salvaged: salvaged, kept: kept, backup: backup };
}

function databases(dir, list) {
    var names;
    try { names = fs.readdirSync(dir); } catch (e) { return list; }
    names.forEach(function (name) {
        var file = path.join(dir, name), stat;
        try { stat = fs.lstatSync(file); } catch (e) { return; }
        if (stat.isDirectory()) { if (!bootstrap.SKIP_DIRS[name]) { databases(file, list); } }
        else if (name === 'nodes' && stat.isFile()) { list.push({ file: file, size: stat.size }); }
    });
    return list;
}

function showScreen(opts) {
    if (opts.root || opts.noScreen) { return null; }
    try {
        var screen = child.spawn('/usr/bin/electron/electron', [path.join(__dirname, 'kb-repair-screen')], {
            stdio: 'ignore',
            env: { DISPLAY: ':0', XAUTHORITY: '/tmp/.Xauthority', XDG_CONFIG_HOME: '/run/kb-repair-screen', HOME: '/run', KB_REPAIR_PID: String(process.pid) }
        });
        screen.on('error', function () {});
        child.spawnSync('sleep', ['3']);   // let it paint before the disk-heavy work starts
        return screen;
    } catch (e) { return null; }
}

function run(opts) {
    opts = opts || {};
    var root = opts.root ? path.resolve(opts.root) : '';
    var base = root + '/opt/jibo/Knowledge', screen = null, repaired = 0;
    // Small files first: a damaged one is found quickly and the screen comes up sooner.
    databases(base, []).sort(function (a, b) { return a.size - b.size; }).forEach(function (db) {
        try {
            if (!isDamaged(db.file)) { return; }
            if (!screen) { bootstrap.report('Knowledge database damaged; repairing: ' + db.file, opts); screen = showScreen(opts) || true; }
            var r = db.size > bootstrap.MAX_REPAIR_BYTES ? repairLarge(db.file) : bootstrap.repairFile(db.file);
            if (r) {
                repaired++;
                bootstrap.report('repaired ' + db.file + ': ' + r.damaged + ' damaged line(s), ' + r.salvaged +
                    ' record(s) recovered from them, ' + r.kept + ' kept; original saved as ' + r.backup, opts);
            }
        } catch (e) { bootstrap.report('could not repair ' + db.file + ': ' + e.message, opts); }
    });
    if (screen && screen !== true) { try { screen.kill(); } catch (e) {} }
    if (!repaired) { bootstrap.report('deep Knowledge check found no damage', opts); }
    return repaired;
}

module.exports = { run: run, repairLarge: repairLarge, isDamaged: isDamaged, eachLine: eachLine, MAX_LINE: MAX_LINE };

if (require.main === module) {
    var opts = process.argv[2] ? JSON.parse(process.argv[2]) : {};
    // Once per boot, written first: even a crash here must not turn into a deep scan every minute.
    try { fs.writeFileSync((opts.root ? path.resolve(opts.root) : '') + '/run/jibo-kb-deep-repair.done', String(Date.now())); } catch (e) {}
    try { run(opts); } catch (e) { bootstrap.report('deep Knowledge repair failed: ' + e.message, opts); }
}
