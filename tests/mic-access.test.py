"""jibo-mic-access: shares the ASR service's mic dsnoop (SysV shm + semaphore, mode 600) with group audio and makes
MediaIn the default ALSA input for the skills user. Uses real SysV objects with the robot's key; run as root."""
import ctypes
import ctypes.util
import grp
import importlib.machinery
import importlib.util
import os
import pathlib
import tempfile

SCRIPT = str(pathlib.Path(__file__).resolve().parent.parent / 'usr/local/bin/jibo-mic-access')
spec = importlib.util.spec_from_loader('mic', importlib.machinery.SourceFileLoader('mic', SCRIPT))
mic = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mic)

libc = ctypes.CDLL(ctypes.util.find_library('c'), use_errno=True)
IPC_CREAT, IPC_EXCL, IPC_RMID = 0o1000, 0o2000, 0
key = mic.AS_SINK_KEY + 0x1d06  # the robot's as_sink key (576344)
shm = libc.shmget(key, 488, IPC_CREAT | IPC_EXCL | 0o600)
sem = libc.semget(key, 1, IPC_CREAT | IPC_EXCL | 0o600)
other = libc.shmget(mic.AS_SINK_KEY + 0x10000, 488, IPC_CREAT | IPC_EXCL | 0o600)  # someone else's segment
assert min(shm, sem, other) >= 0, ctypes.get_errno()


def mode(table, ident):
    for line in open('/proc/sysvipc/' + table).read().splitlines()[1:]:
        cols = line.split()
        if int(cols[1]) == ident: return int(cols[2], 8) & 0o777


try:
    audio = grp.getgrnam('audio').gr_gid
    with tempfile.TemporaryDirectory() as home:
        assert mic.main(['--home', home, '--wait', '0']) == 0
        assert mode('shm', shm) == 0o660 and mode('sem', sem) == 0o660
        assert mode('shm', other) == 0o600, 'other segments untouched'
        buf = ctypes.create_string_buffer(256)
        assert libc.shmctl(shm, mic.IPC_STAT, buf) == 0 and ctypes.c_uint32.from_buffer(buf, 8).value == audio
        rc = pathlib.Path(home, '.asoundrc')
        assert 'slave.pcm "MediaIn"' in rc.read_text() and 'sdk_faders' in rc.read_text()
        assert oct(rc.stat().st_mode & 0o777) == oct(0o644)
        # Runs again on every SSM restart: idempotent, and the file is not rewritten.
        before = rc.stat().st_mtime_ns
        assert mic.main(['--home', home, '--wait', '0']) == 0 and rc.stat().st_mtime_ns == before
    libc.shmctl(shm, IPC_RMID, None); libc.semctl(sem, 0, IPC_RMID); shm = sem = -1
    with tempfile.TemporaryDirectory() as home:
        assert mic.main(['--home', home, '--wait', '0']) == 1, 'no dsnoop yet: reported, not fatal'
        assert pathlib.Path(home, '.asoundrc').exists()
    print('jibo-mic-access: dsnoop shared with audio, .asoundrc written once, missing dsnoop reported')
finally:
    for ident in (shm, other):
        if ident >= 0: libc.shmctl(ident, IPC_RMID, None)
    if sem >= 0: libc.semctl(sem, 0, IPC_RMID)
