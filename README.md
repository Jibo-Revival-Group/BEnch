# BEnch
The entire non-Skill JiboOS

Version is saved in Jibo-Service-Version and CANNOT change the byte size or else big bad. DO NOT USE VSCODE OR ANY OTHER CODE EDITOR OR ELSE ALL 5,000 JIBOS IN THE WORLD WILL DIE!!! THIS IS BAD BAD BAD AND WE DON'T WANT THAT OR ELSE IT WILL BE VERY BAD AND IRREVERSABLE!!!!!!!!!!!!!!!

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
