import os
import pathlib
import signal
import subprocess
import tempfile
import time

NODE = os.environ.get('NODE', 'node')  # use a Node 6 binary, like the robot
CLI = str(pathlib.Path(__file__).resolve().parent.parent / 'usr/local/bin/jibo-runtime-bootstrap')

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    cmd = [NODE, CLI, '--root', tmp, '--knowledge']
    def run():
        return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
    assert run().returncode == 0
    base = root / 'opt/jibo/Knowledge'
    lock = base / '.bootstrap-lock'
    store = base / 'jibo/loop/nodes'
    original = store.read_bytes()
    lock.mkdir(mode=0o700)
    (lock / 'pid').write_text('2147483647')
    workers = [subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(4)]
    for worker in workers:
        out, err = worker.communicate(timeout=45)
        assert worker.returncode == 0, (out, err)
    assert store.read_bytes() == original and not lock.exists()
    # Dead, empty, malformed and pre-boot owners are recovered under flock.
    for content in ('', '0', 'not-a-pid', '2147483647'):
        lock.mkdir(mode=0o700)
        (lock / 'pid').write_text(content)
        assert run().returncode == 0, content
        assert not lock.exists() and store.read_bytes() == original
    lock.mkdir(mode=0o700)
    (lock / 'pid').write_text(str(os.getpid()))
    os.utime(lock / 'pid', (1, 1))  # live PID reused after reboot
    assert run().returncode == 0 and not lock.exists()
    lock.mkdir(mode=0o700)
    assert run().returncode == 0 and not lock.exists()
    # A live owner from this boot (legacy initializer) is never stolen.
    lock.mkdir(mode=0o700)
    (lock / 'pid').write_text(str(os.getpid()))
    assert run().returncode != 0 and (lock / 'pid').read_text() == str(os.getpid())
    (lock / 'pid').unlink()
    lock.rmdir()
    lock.mkdir(mode=0o700)
    (lock / 'pid').write_text('2147483647')
    (lock / 'extra').write_text('preserve')
    assert run().returncode != 0 and (lock / 'extra').read_text() == 'preserve'
    (lock / 'pid').unlink()
    (lock / 'extra').unlink()
    lock.rmdir()
    # Keep the real Node importer busy parsing a valid existing database.
    data = b'{"fixture":"' + b'x' * 500 + b'"}\n'
    store.write_bytes(data * 200000)
    worker = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    deadline = time.monotonic() + 20
    pidfile = lock / 'pid'
    while time.monotonic() < deadline:
        try:
            pid = int(pidfile.read_text())
            os.kill(pid, signal.SIGKILL)
            break
        except (FileNotFoundError, ValueError, ProcessLookupError):
            if worker.poll() is not None:
                raise AssertionError('importer exited before SIGKILL')
            time.sleep(0.001)
    else:
        raise AssertionError('importer did not acquire PID lock')
    worker.communicate(timeout=15)
    assert lock.is_dir()
    assert run().returncode == 0
    assert not lock.exists() and store.stat().st_size == len(data) * 200000
    print('Node 6: concurrent stale recovery, fail-closed locks, SIGKILL retry, existing data passed')
