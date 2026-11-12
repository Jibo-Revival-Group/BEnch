# BEnch

> **Part of [5x1](https://www.5x1.com), the free public Jibo server and the easiest and quickest way for beginners to revive Jibo: unlike other services, there is no account to set up, and no self-hosting.** BEnch is the robot's system software (os and services) that 5x1 installs and updates.
> New to Jibo revival? Start with [How do I revive my Jibo?](https://www.5x1.com/revive-jibo.html) and the [setup guide](https://jibo.guide). See also [Is 5x1 safe?](https://www.5x1.com/is-5x1-safe.html) and the [privacy policy](https://www.5x1.com/privacy.html).
The entire non-Skill JiboOS

Version is saved in Jibo-Service-Version and CANNOT change the byte size or else big bad. DO NOT USE VSCODE OR ANY OTHER CODE EDITOR OR ELSE ALL 5,000 JIBOS IN THE WORLD WILL DIE!!! THIS IS BAD BAD BAD AND WE DON'T WANT THAT OR ELSE IT WILL BE VERY BAD AND IRREVERSABLE!!!!!!!!!!!!!!!

## os (the root filesystem)

Everything outside `/usr/local` here (`bin`, `etc`, `lib`, `usr/bin`, `usr/lib`, ...) is Jibo's os,
unpacked like the services. It is stock 13.0.0 with 5x1's changes, released as os 13.0.7:

- no firewall (`etc/init.d/S21firewall` removed)
- Let's Encrypt's root (`etc/ssl/certs/isrgrootx1.pem`, also in `ca-certificates.crt`) for api.5x1.com
- the os's `jibo-server-client` accepts that certificate and uses api.5x1.com
- `etc/init.d/S04jibo-bootstrap` runs `jibo-runtime-bootstrap --knowledge` before services start
- `usr/bin/jibo-version` says 13.0.7 (the same version as the services)

Git can't keep owners, setuid, device nodes or empty folders, so `os-files.tsv` lists every os entry
with its type, mode, owner and sha256. After editing os files:

```sh
python3 tools/pack-os.py --refresh        # update os-files.tsv (new files get root and 644/755)
python3 tools/pack-os.py --check          # tree and os-files.tsv agree
python3 tools/pack-os.py bench-os.tar     # the os OTA package (./filesystem.tar.bz2 in a tar)
python3 tests/os-files.test.py
```

An os update reformats the root partition, so anything edited by hand on a robot outside
`/usr/local` and `/opt` is replaced by these files.

## Command-line tools

`usr/local/bin/nano` (GNU nano 8.6, GPLv3, source: https://www.nano-editor.org/dist/v8/nano-8.6.tar.xz) and
`usr/local/bin/fastfetch` (2.71.0, MIT) are static ARM builds, because Jibo's glibc is too old for current
ones. nano has xterm-256color, screen/tmux-256color, alacritty and vt100 built in, since Jibo only ships
xterm/linux terminfo. Rebuild with `tools/build-nano-fastfetch.sh`.

## Local runtime initialization

`jibo-runtime-bootstrap` creates missing runtime directories and defaults without
changing robot mode, factory identity, or calibration. Existing credentials and
settings are validated and preserved. Missing credentials get random local
values with region `api` and endpoint `http://joap.5x1.com:80`; these are sufficient
for local startup, not evidence of a paired cloud account.

```sh
jibo-runtime-bootstrap                         # prepare all service storage
jibo-runtime-bootstrap --service asr           # prepare one service's storage
jibo-runtime-bootstrap --root /tmp/robot-test --knowledge
```

`--knowledge` initializes absent KB stores using the existing `jibo-kb` API. It
validates existing JSONL stores without rewriting them. Run it before SSM starts,
not against a live KB writer. Boot and PM invoke it before services; the SSM
launcher invokes it on restarts. Concurrent initializers serialize KB creation.
KB readiness uses local data while cloud synchronization runs in the background.

KB bootstrap uses `/usr/bin/flock -w 30` on the permanent
`/var/jibo/.knowledge-bootstrap-flock` file; do not remove or replace that file.
While holding flock, a leftover `.bootstrap-lock` (empty, dead, malformed, or
from before this boot) is removed. Only a live owner from this boot or
unexpected entries are preserved and fail closed. Existing KB stores are not
removed.

This recovery assumes stock reboot-based services OTA: the reboot ends old
processes and S72 applies the update before S76 and S78 start services. Every
earlier BEach S04 hook, if installed, must finish before S72 replaces the code.
Every subsequent KB initializer must use the new `jibo-runtime-bootstrap` CLI,
including BEach boot/install. Old launchers, direct module calls, mixed-version
starts, custom boot ordering, and rollback without equivalent quiescence are
outside this boundary; flock cannot exclude them. Do not run initialization
against a live SSM KB writer. The lock file must remain on a trusted local
filesystem with working flock semantics.

PM installs the early `S04jibo-bootstrap` boot hook. System-manager launches its
managed services through `jibo-service-start SERVICE EXECUTABLE [ARGS...]`, which
prepares storage and uses `exec` to retain process IDs, signals, and arguments.
Native binaries and their version bytes are unchanged.

The standalone `usr/local/lib/jibo/runtime-state.js` helper is also shipped in
BEam so a skill installation can initialize its own storage independently. New
user-data directories/settings are writable by the skill runtime; credential
files are mode 0600 and new key directories are mode 0700. Malformed existing
files and unwritable required paths fail with a path diagnostic; they are never
replaced with blank data. Missing factory calibration is not synthesized.

Tests (also run with the robot's Node 6 runtime):

```sh
node tests/runtime-bootstrap.test.js
node tests/offline-kb-startup.test.js
node tests/service-launcher.test.js
node tests/homeassistant-relay.test.js
```
