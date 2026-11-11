"""BEnch's os (the root filesystem outside /usr/local): os-files.tsv matches the tree, 5x1's os edits are in it,
and tools/pack-os.py keeps owners, modes, setuid, devices and empty directories that git drops."""
import importlib.util
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tarfile
import tempfile

sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('pack_os', str(ROOT / 'tools/pack-os.py'))
pack_os = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack_os)

# The real tree agrees with os-files.tsv (contents included).
entries = pack_os.read_tsv(str(ROOT))
assert pack_os.problems(str(ROOT), entries) == [], pack_os.problems(str(ROOT), entries)[:10]

# 5x1's os edits (what PM used to make by hand).
assert 'etc/init.d/S21firewall' not in entries and not (ROOT / 'etc/init.d/S21firewall').exists(), 'no firewall'
assert entries['etc/init.d/S04jibo-bootstrap'][:2] == ['f', 0o755]
assert '/usr/local/bin/jibo-runtime-bootstrap --knowledge' in (ROOT / 'etc/init.d/S04jibo-bootstrap').read_text()
cert = (ROOT / 'etc/ssl/certs/isrgrootx1.pem').read_text()
assert 'BEGIN CERTIFICATE' in cert and cert in (ROOT / 'etc/ssl/certs/ca-certificates.crt').read_text()
assert entries['etc/ssl/certs/4042bcee.0'] == ['l', 0o777, 0, 0, 'isrgrootx1.pem']
client = ROOT / 'usr/lib/node_modules/@jibo/jibo-server-client/lib'
assert 'rejectUnauthorized: true' not in (client / 'http/node.js').read_text()
assert json.loads((client / 'region_config.json').read_text())['patterns']['globalSSL']['endpoint'] == 'https://api.5x1.com'
assert b'Release-13.0.7-' in (ROOT / 'usr/bin/jibo-version').read_bytes()
assert entries['bin/busybox'][1] == 0o4755, 'setuid kept'
assert entries['dev/console'][0] == 'c'
assert not any(path.startswith('usr/local/') for path in entries), 'services are not os'
assert 'etc/init.d/S76openjibo-bootstrap' not in entries

# Packing a small tree: metadata comes from the tsv, edits are caught, the package has the stock layout.
work = tempfile.mkdtemp(prefix='pack-os-')
try:
    tree = os.path.join(work, 'BEnch')
    os.makedirs(tree + '/bin')
    os.makedirs(tree + '/usr/local/bin')
    os.makedirs(tree + '/tests')
    with open(tree + '/bin/busybox', 'w') as f:
        f.write('busybox\n')
    os.symlink('busybox', tree + '/bin/sh')
    with open(tree + '/usr/local/bin/service', 'w') as f:
        f.write('services are packed separately\n')
    with open(tree + '/os-files.tsv', 'w') as f:
        f.write('# header\nbin\td\t0755\t0\t0\t\nbin/busybox\tf\t4755\t0\t0\tx\nbin/sh\tl\t0777\t0\t0\tbusybox\n'
                'dev\td\t0755\t0\t0\t\ndev/console\tc\t0622\t0\t0\t5,1\nproc\td\t0555\t0\t0\t\nrun/dbus\td\t0755\t1002\t1002\t\n')
    env = dict(os.environ, BENCH_ROOT=tree)
    tool = [sys.executable, str(ROOT / 'tools/pack-os.py')]
    check = subprocess.run(tool + ['--check'], env=env, capture_output=True, text=True)
    assert check.returncode == 1 and 'content differs' in check.stdout, check.stdout
    subprocess.run(tool + ['--refresh'], env=env, check=True, capture_output=True)
    assert subprocess.run(tool + ['--check'], env=env, capture_output=True).returncode == 0
    with open(tree + '/bin/new-tool', 'w') as f:
        f.write('#!/bin/sh\n')
    os.chmod(tree + '/bin/new-tool', 0o755)
    check = subprocess.run(tool + ['--check'], env=env, capture_output=True, text=True)
    assert 'not in os-files.tsv (run --refresh): bin/new-tool' in check.stdout, check.stdout
    subprocess.run(tool + ['--refresh'], env=env, check=True, capture_output=True)
    out = os.path.join(work, 'os.tar')
    subprocess.run(tool + [out], env=env, check=True, capture_output=True)
    with tarfile.open(out) as package:
        assert [name.rstrip('/') for name in package.getnames()] == ['.', './filesystem.tar.bz2'], package.getnames()
        package.extract('./filesystem.tar.bz2', work, filter='fully_trusted')
    with tarfile.open(os.path.join(work, 'filesystem.tar.bz2')) as fs:
        got = {m.name: m for m in fs}
    assert got['./bin/busybox'].mode == 0o4755 and got['./bin/busybox'].isreg()
    assert got['./bin/sh'].issym() and got['./bin/sh'].linkname == 'busybox'
    assert got['./dev/console'].ischr() and (got['./dev/console'].devmajor, got['./dev/console'].devminor) == (5, 1)
    assert got['./proc'].isdir() and got['./proc'].mode == 0o555, 'empty directories git cannot keep'
    assert (got['./run/dbus'].uid, got['./run/dbus'].gid) == (1002, 1002)
    assert got['./bin/new-tool'].mode == 0o755 and got['./bin/new-tool'].uid == 0
    assert not any(name.startswith(('./usr/local/', './tests', './os-files')) for name in got)
finally:
    shutil.rmtree(work)
print('os-files ok')
