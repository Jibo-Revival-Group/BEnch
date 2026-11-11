#!/bin/sh
# Builds /usr/local/bin/jibo-bluetooth from jibo_bluetooth.c on BTstack's POSIX port (static, so the 2017 glibc doesn't matter).
# Usage: ./build.sh TIInit_11.8.32.bts [--selftest]   (copy the .bts from a robot's /lib/firmware/)
# Needs git, python3 and arm-linux-gnueabihf-gcc; --selftest also needs gcc and ffmpeg (see selftest.c).
set -e
BTS=$(realpath "${1:?usage: $0 TIInit_11.8.32.bts}")
HERE=$(cd "$(dirname "$0")" && pwd)
BTSTACK_COMMIT=9edb5d82ea6ec4466a393415d65030929330acdf
W=$(mktemp -d)
trap 'rm -rf "$W"' EXIT
git -C "$W" init -q btstack
git -C "$W/btstack" fetch -q --depth 1 https://github.com/bluekitchen/btstack.git "$BTSTACK_COMMIT"
git -C "$W/btstack" checkout -q FETCH_HEAD
cp -r "$W/btstack/port/posix-h4" "$W/port"
cd "$W/port"
python3 ../btstack/chipset/cc256x/convert_bts_init_scripts.py "$BTS" bluetooth_init_wl18xx_11.8.32.c >/dev/null
cp "$HERE/jibo_bluetooth.c" "$HERE/selftest.c" .
sed -i 's#^BTSTACK_ROOT ?= ../..#BTSTACK_ROOT ?= ../btstack#; s#\tbluetooth_init_cc2564C_1.5.c \\#\tbluetooth_init_wl18xx_11.8.32.c \\#' Makefile
sed -i '/btstack_audio_portaudio.c/d' Makefile
sed -i 's#^include ${BTSTACK_ROOT}/chipset/cc256x/Makefile.inc##; s#^include ${BTSTACK_ROOT}/chipset/bcm/Makefile.inc##' Makefile
cat >> Makefile <<'EOF'

JIBO_DROP = main.o btstack_main_config.o btstack_stdin_posix.o wav_util.o btstack_audio.o
JIBO_OBJ = $(filter-out ${JIBO_DROP},${CORE_OBJ}) ${COMMON_OBJ} ${CLASSIC_OBJ} ${SDP_CLIENT} ${SBC_CODEC_OBJ} ${AVDTP_OBJ}
jibo_bluetooth: ${JIBO_OBJ} jibo_bluetooth.o
	${CC} $^ ${CFLAGS} ${LDFLAGS} -o $@
selftest: ${JIBO_OBJ} selftest.o
	${CC} $^ ${CFLAGS} ${LDFLAGS} -o $@
EOF
if [ "$2" = --selftest ]; then
    ffmpeg -loglevel error -f lavfi -i "sine=f=440:r=44100:d=2,aformat=channel_layouts=stereo" -c:a sbc -b:a 328k -f sbc tone.sbc
    ffmpeg -loglevel error -i tone.sbc -f s16le ref.raw
    make -s -j"$(nproc)" CC=gcc LDFLAGS=-lpthread selftest >/dev/null
    ./selftest
    python3 - <<'PY'
import array
a = array.array('h', open('out.raw', 'rb').read()); b = array.array('h', open('ref.raw', 'rb').read())
n = min(len(a), len(b)); assert n > 0.95 * len(b), 'audio missing: %d of %d samples' % (n, len(b))
dot = sum(x * y for x, y in zip(a[:n], b[:n])); na = sum(x * x for x in a[:n]); nb = sum(y * y for y in b[:n])
c = dot / (na * nb) ** 0.5; assert c > 0.99, 'decoded audio differs from ffmpeg (correlation %.3f)' % c
print('selftest ok: %d samples, correlation %.4f' % (n, c))
PY
    exit 0
fi
make -s -j"$(nproc)" CC=arm-linux-gnueabihf-gcc LDFLAGS="-lpthread -static" jibo_bluetooth >/dev/null
arm-linux-gnueabihf-strip -o "$HERE/../../bin/jibo-bluetooth" jibo_bluetooth
echo "built $(realpath "$HERE/../../bin/jibo-bluetooth")"
