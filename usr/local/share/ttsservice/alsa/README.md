# 5x1 voice effects for Jibo's TTS

`jibo-service-start` starts `jibo-tts-service` with `HOME` set to this folder, so ALSA also loads
`.asoundrc` here. It routes TTS audio (`TTSOut`) through the LADSPA plugin
`/usr/local/lib/ladspa/jibo_voicefx.so` before the stock TTS fader:

    TTSOut (plug) -> tts_voicefx (ladspa: jibo_voicefx) -> tts_voicefx_out (plug) -> tts_faders

The plugin adds vibrato (a sine-modulated delay line) and volume. BEacon's custom voices write the
settings to `/opt/jibo/Knowledge/beacon/voices/fx.txt` as `<vibrato semitones> <vibrato Hz> <volume>`;
the plugin re-reads it about 10 times a second while Jibo speaks. No file means no effect.
Pitch, speed and formants are applied by the TTS engine itself (BEam `beacon/lib/voice-tts.js`).

Build (from `jibo_voicefx.c`, needs only glibc 2.4-2.7 symbols, no libm):

    arm-linux-gnueabihf-gcc -std=gnu99 -O2 -shared -fPIC -fno-stack-protector -U_FORTIFY_SOURCE \
      -march=armv7-a -mfpu=vfpv3-d16 -mfloat-abi=hard -Wl,--hash-style=both \
      -o jibo_voicefx.so jibo_voicefx.c && arm-linux-gnueabihf-strip jibo_voicefx.so
