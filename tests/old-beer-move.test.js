'use strict';
// The old PM's skills backup (Skills/old-BEer) is moved beside Skills on a full bootstrap, contents intact, never
// over an existing /opt/jibo/old-BEer; other services' runs leave it alone.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), child = require('child_process');
var runtime = require('../usr/local/lib/jibo/runtime-state');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'old-beer-'));
var skills = root + '/opt/jibo/Jibo/Skills', from = skills + '/old-BEer', to = root + '/opt/jibo/old-BEer';
try {
    fs.mkdirSync(from + '/@be/be', { recursive: true });
    fs.writeFileSync(from + '/@be/be/package.json', '{"name":"@be/be"}');
    runtime.ensure({ root: root, service: 'asr', credentials: false });
    assert(fs.existsSync(from), 'a service start leaves it');
    runtime.ensure({ root: root, credentials: false });
    assert(!fs.existsSync(from), 'moved out of Skills');
    assert.strictEqual(fs.readFileSync(to + '/@be/be/package.json', 'utf8'), '{"name":"@be/be"}', 'backup kept intact');
    fs.mkdirSync(from);
    fs.writeFileSync(from + '/second', 'x');
    runtime.ensure({ root: root, credentials: false });
    assert(fs.existsSync(from + '/second') && !fs.existsSync(to + '/second'), 'never replaces an existing backup');
    runtime.ensure({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'old-beer-none-')), credentials: false });   // none: no error
    console.log('old-BEer backup moved out of Skills');
} finally { child.spawnSync('rm', ['-rf', root]); }
