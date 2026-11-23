#!/bin/sh
# Rebuilds usr/local/bin/nano and usr/local/bin/fastfetch: static 32-bit ARM, because Jibo's glibc (2.21)
# is too old for current builds. Needs arm-linux-gnueabihf-gcc, cmake, and the host's tic/infocmp.
# Usage: tools/build-nano-fastfetch.sh   (from the BEnch root; work happens in $TMPDIR)
set -e
BENCH=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d)
P=$W/armroot
cd "$W"
curl -fsSL https://ftp.gnu.org/gnu/ncurses/ncurses-6.5.tar.gz | tar xz
curl -fsSL https://www.nano-editor.org/dist/v8/nano-8.6.tar.xz | tar xJ
curl -fsSL https://github.com/fastfetch-cli/fastfetch/archive/refs/tags/2.71.0.tar.gz | tar xz

# Jibo only has xterm/linux terminfo; build the common SSH terminal types into nano.
(cd ncurses-6.5 && ./configure --host=arm-linux-gnueabihf --prefix="$P" --without-shared --without-cxx \
    --without-cxx-binding --without-ada --without-progs --without-tests --without-manpages --enable-widec \
    --with-default-terminfo-dir=/usr/share/terminfo --with-terminfo-dirs=/usr/share/terminfo \
    --with-fallbacks=xterm-256color,screen-256color,tmux-256color,alacritty,vt100 \
    --with-tic-path=/usr/bin/tic --with-infocmp-path=/usr/bin/infocmp > /dev/null \
    && make -j8 > /dev/null && make install.libs install.includes > /dev/null)

# glibc 2.43 makes bsearch/qsort/... macros; gnulib redeclares them, so parenthesize the names.
for f in nano-8.6/lib/*.in.h; do sed -i -E 's/^(_GL_EXTERN_C [a-z_]+ \**)([a-z_]+) \(/\1(\2) (/' "$f"; done
(cd nano-8.6 && CFLAGS="-std=gnu17 -O2" CPPFLAGS="-I$P/include -I$P/include/ncursesw" LDFLAGS="-L$P/lib -static" \
    ./configure --host=arm-linux-gnueabihf --prefix=/usr/local --disable-nls --disable-libmagic > /dev/null \
    && make -j8 -C lib > /dev/null && make -j8 -C src > /dev/null)
arm-linux-gnueabihf-strip -o "$BENCH/usr/local/bin/nano" nano-8.6/src/nano

mkdir fastfetch-2.71.0/build
(cd fastfetch-2.71.0/build && cmake .. -DCMAKE_SYSTEM_NAME=Linux -DCMAKE_SYSTEM_PROCESSOR=armv7l \
    -DCMAKE_C_COMPILER=arm-linux-gnueabihf-gcc -DCMAKE_BUILD_TYPE=Release -DCMAKE_EXE_LINKER_FLAGS=-static \
    -DBUILD_FLASHFETCH=OFF -DBUILD_TESTS=OFF -DENABLE_SYSTEM_YYJSON=OFF > /dev/null && make -j8 fastfetch > /dev/null)
arm-linux-gnueabihf-strip -o "$BENCH/usr/local/bin/fastfetch" fastfetch-2.71.0/build/fastfetch

rm -rf "$W"
file "$BENCH/usr/local/bin/nano" "$BENCH/usr/local/bin/fastfetch"
