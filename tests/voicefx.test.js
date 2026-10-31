'use strict';
// 5x1 voice effects: launcher wiring for the TTS service and the jibo_voicefx LADSPA plugin's DSP.
var assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), child = require('child_process');
var root = fs.mkdtempSync(path.join(os.tmpdir(), 'jibo-voicefx-'));
var alsaDir = path.join(__dirname, '../usr/local/share/ttsservice/alsa');
function removeTree(p) { if (fs.lstatSync(p).isDirectory()) { fs.readdirSync(p).forEach(function (n) { removeTree(path.join(p, n)); }); fs.rmdirSync(p); } else { fs.unlinkSync(p); } }
try {
    // 1. jibo-service-start sets HOME (so ALSA loads the voicefx .asoundrc) for tts only, and only when installed.
    var plugin = path.join(root, 'jibo_voicefx.so'), rc = path.join(root, 'alsa', '.asoundrc');
    fs.mkdirSync(path.join(root, 'alsa'));
    var bootstrap = path.join(root, 'bootstrap');
    fs.writeFileSync(bootstrap, '#!/bin/sh\nexit 0\n', { mode: 493 });
    var wrapper = path.join(root, 'launcher');
    fs.writeFileSync(wrapper, fs.readFileSync(path.join(__dirname, '../usr/local/bin/jibo-service-start'), 'utf8')
        .replace(/\/usr\/local\/bin\/jibo-runtime-bootstrap/g, bootstrap)
        .replace(/\/usr\/local\/lib\/ladspa\/jibo_voicefx\.so/g, plugin)
        .replace(/\/usr\/local\/share\/ttsservice\/alsa\/\.asoundrc/g, rc)
        .replace(/HOME=\/usr\/local\/share\/ttsservice\/alsa/g, 'HOME=' + path.join(root, 'alsa')));
    var env = Object.assign({}, process.env, { HOME: '/original-home' });
    function home(service) { return child.spawnSync('sh', [wrapper, service, '/bin/sh', '-c', 'echo $HOME'], { env: env, encoding: 'utf8' }).stdout.trim(); }
    assert.strictEqual(home('tts'), '/original-home', 'Without the plugin installed, TTS starts exactly as before');
    fs.writeFileSync(plugin, ''); fs.writeFileSync(rc, '');
    assert.strictEqual(home('tts'), path.join(root, 'alsa'), 'TTS loads the voice-effects ALSA chain');
    assert.strictEqual(home('asr'), '/original-home', 'Other services are untouched');

    // 2. The shipped ALSA chain points at the shipped plugin.
    var asoundrc = fs.readFileSync(path.join(alsaDir, '.asoundrc'), 'utf8');
    assert(/pcm\.!TTSOut\s*\{[^}]*slave\.pcm "tts_voicefx"/.test(asoundrc));
    assert(/label jibo_voicefx/.test(asoundrc) && /path "\/usr\/local\/lib\/ladspa"/.test(asoundrc) && /slave\.pcm "tts_faders"/.test(asoundrc));
    assert(fs.statSync(path.join(__dirname, '../usr/local/lib/ladspa/jibo_voicefx.so')).size > 1000);

    // 3. DSP: build the plugin source for this host and measure a 200 Hz tone through it.
    var cc = ['cc', 'gcc'].filter(function (c) { return child.spawnSync(c, ['--version']).status === 0; })[0];
    if (!cc) { console.log('SKIP plugin DSP check: no C compiler'); }
    else {
        var fx = path.join(root, 'fx.txt'), so = path.join(root, 'host.so'), harness = path.join(root, 'harness');
        var build = child.spawnSync(cc, ['-O2', '-shared', '-fPIC', '-DFX_FILE="' + fx + '"', '-o', so, path.join(alsaDir, 'jibo_voicefx.c')], { encoding: 'utf8' });
        assert.strictEqual(build.status, 0, build.stderr);
        fs.writeFileSync(harness + '.c', [
            '#include <stdio.h>', '#include <math.h>', '#include <dlfcn.h>',
            'typedef struct { unsigned long id; const char *label; int p; const char *n,*m,*c; unsigned long pc; const int *pd; const char *const *pn; const void *ph; void *impl;',
            '  void *(*inst)(const void*,unsigned long); void (*conn)(void*,unsigned long,float*); void (*act)(void*); void (*run)(void*,unsigned long); } D;',
            'int main(int c, char **v) { void *l = dlopen(v[1], RTLD_NOW); const D *d = ((const D *(*)(unsigned long))dlsym(l, "ladspa_descriptor"))(0);',
            '  static float in[96000], out[96000]; int i; for (i = 0; i < 96000; i++) in[i] = 0.5f * sinf(2 * M_PI * 200 * i / 48000.0f);',
            '  void *h = d->inst(d, 48000); d->act(h); for (i = 0; i < 96000; i += 1024) { d->conn(h, 0, in + i); d->conn(h, 1, out + i); d->run(h, i + 1024 > 96000 ? 96000 - i : 1024); }',
            '  double last = -1, lo = 1e9, hi = 0, peak = 0; for (i = 48001; i < 96000; i++) { if (fabs(out[i]) > peak) peak = fabs(out[i]);',
            '    if (out[i-1] < 0 && out[i] >= 0) { double t = i - 1 + out[i-1] / (out[i-1] - out[i]); if (last > 0) { double f = 48000 / (t - last); if (f < lo) lo = f; if (f > hi) hi = f; } last = t; } }',
            '  printf("%.3f %.3f %.3f\\n", 12 * log2(hi / 200), 12 * log2(200 / lo), peak); return 0; }'].join('\n'));
        assert.strictEqual(child.spawnSync(cc, ['-O2', '-o', harness, harness + '.c', '-ldl', '-lm'], { encoding: 'utf8' }).status, 0);
        function measure(content) {
            if (content === null) { if (fs.existsSync(fx)) { fs.unlinkSync(fx); } } else { fs.writeFileSync(fx, content); }
            return child.spawnSync(harness, [so], { encoding: 'utf8' }).stdout.trim().split(' ').map(Number);
        }
        var r = measure(null); assert(r[0] < 0.01 && r[1] < 0.01 && Math.abs(r[2] - 0.5) < 0.01, 'No settings file: untouched ' + r);
        r = measure('1 5.5 1\n'); assert(Math.abs(r[0] - 1) < 0.08 && Math.abs(r[1] - 1) < 0.08, '1 semitone vibrato ' + r);
        r = measure('0.5 3 0.4\n'); assert(Math.abs(r[0] - 0.5) < 0.06 && Math.abs(r[2] - 0.2) < 0.01, 'Half-semitone vibrato at 40% volume ' + r);
        r = measure('9 99 7\n'); assert(r[0] < 0.01 && Math.abs(r[2] - 0.5) < 0.01, 'Out-of-range settings are ignored ' + r);
        r = measure('garbage'); assert(r[0] < 0.01 && Math.abs(r[2] - 0.5) < 0.01, 'Unreadable settings are ignored ' + r);
    }
    console.log('Voice effects launcher wiring, ALSA chain and plugin DSP passed');
} finally { removeTree(root); }
