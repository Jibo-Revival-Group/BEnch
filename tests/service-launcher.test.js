'use strict';
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), child = require('child_process');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'jibo-launcher-'));
function remove(dir) { fs.readdirSync(dir).forEach(function (name) { fs.unlinkSync(path.join(dir, name)); }); fs.rmdirSync(dir); }
try {
    var bootstrap = path.join(root, 'bootstrap');
    fs.writeFileSync(bootstrap, '#!/bin/sh\nprintf "%s\\n" "$@" > "$BOOTSTRAP_LOG"\nexit "${BOOTSTRAP_STATUS:-0}"\n', { mode: 493 });
    var mic = path.join(root, 'mic');
    fs.writeFileSync(mic, '#!/bin/sh\necho mic >> "$BOOTSTRAP_LOG.mic"\nexit 1\n', { mode: 493 });
    var wrapper = path.join(root, 'launcher');
    fs.writeFileSync(wrapper, fs.readFileSync(path.join(__dirname, '../usr/local/bin/jibo-service-start'), 'utf8')
        .replace(/\/usr\/local\/bin\/jibo-runtime-bootstrap/g, bootstrap).replace(/\/usr\/local\/bin\/jibo-mic-access/g, mic));
    var env = Object.assign({}, process.env, { BOOTSTRAP_LOG: path.join(root, 'log'), BOOTSTRAP_STATUS: '0' });
    var result = child.spawnSync('sh', [wrapper, 'ssm', '/bin/sh', '-c', 'echo $$; printf "%s\\n" "$@"', 'fixture', 'spaces in argument', '$(literal)'], { env: env, encoding: 'utf8' });
    assert.strictEqual(result.status, 0);
    assert.strictEqual(Number(result.stdout.split('\n')[0]), result.pid, 'exec preserves the supervised PID');
    assert.deepEqual(result.stdout.trim().split('\n').slice(1), ['spaces in argument', '$(literal)']);
    assert.strictEqual(fs.readFileSync(env.BOOTSTRAP_LOG, 'utf8'), '--service\nssm\n--knowledge\n');
    assert.strictEqual(fs.readFileSync(env.BOOTSTRAP_LOG + '.mic', 'utf8'), 'mic\n', 'skills get the mic before SSM starts; its failure does not stop SSM');
    env.BOOTSTRAP_STATUS = '1';
    result = child.spawnSync('sh', [wrapper, 'asr', '/bin/sh', '-c', 'echo unexpected'], { env: env, encoding: 'utf8' });
    assert.strictEqual(result.status, 1);
    assert.strictEqual(result.stdout, '');
    assert.strictEqual(fs.readFileSync(env.BOOTSTRAP_LOG, 'utf8'), '--service\nasr\n');
    fs.unlinkSync(env.BOOTSTRAP_LOG + '.mic');
    // audio: the speaker path is set even when the OS's /root/OutAudioSetup.sh is missing (a robot went silent).
    fs.writeFileSync(path.join(root, 'amixer'), '#!/bin/sh\nprintf "%s|" "$@" >> "$BOOTSTRAP_LOG.amixer"; echo >> "$BOOTSTRAP_LOG.amixer"\n', { mode: 493 });
    env.BOOTSTRAP_STATUS = '0'; env.PATH = root + ':' + process.env.PATH;
    result = child.spawnSync('sh', [wrapper, 'audio', '/bin/echo', 'started'], { env: env, encoding: 'utf8' });
    assert.strictEqual(result.stdout, 'started\n');
    var set = fs.readFileSync(env.BOOTSTRAP_LOG + '.amixer', 'utf8').trim().split('\n');
    ['DACL Route|1', 'DAC Switch|on,on', 'Headphone Driver Switch|on,on', 'Headphone Volume|117,117', 'Headphone Switch|on,on'].forEach(function (want) {
        assert(set.some(function (line) { return line === '-c|TLV320DAC3100|-q|cset|name=' + want + '|'; }), 'sets ' + want);
    });
    fs.unlinkSync(env.BOOTSTRAP_LOG + '.amixer');
    env.PATH = process.env.PATH;
    var config = require('../usr/local/etc/jibo-system-manager.json');
    config.SystemManager.service.services.forEach(function (service) {
        if (service.name === 'resolv-watcher' || service.name === 'jibo-bluetooth') {
            assert.strictEqual(service.executable, '/usr/local/bin/' + service.name);
            assert.deepEqual(service.modes.default.arguments, []);
            return;
        }
        assert.strictEqual(service.executable, '/usr/local/bin/jibo-service-start');
        Object.keys(service.modes).forEach(function (mode) {
            var args = service.modes[mode].arguments;
            if (args) {
                assert.strictEqual(args[0], service.name === 'media-manager' ? 'media' : service.name);
                assert(/^\/usr\//.test(args[1]));
            }
        });
    });
    console.log('Service preparation, exec/PID/arguments, failures and managed modes passed');
} finally { remove(root); }
