#!/usr/bin/env python3
"""Build Jibo's os OTA package from BEnch's root filesystem.

Git keeps file contents and symlinks, but not owners, most modes, setuid, device nodes or empty
directories, so os-files.tsv lists every os entry with those (and each file's sha256).

  tools/pack-os.py --check                 tree and os-files.tsv agree
  tools/pack-os.py --refresh               after editing os files: update hashes, add new files, drop removed ones
  tools/pack-os.py OUT.tar                 stock-format package: ./filesystem.tar.bz2 inside a tar

Not os: README.md, tests/, tools/, os-files.tsv, and /usr/local (services, packed separately).
"""
import hashlib
import io
import os
import stat
import sys
import tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TSV = 'os-files.tsv'
NOT_OS = ('.git', '.gitattributes', '.github', 'README.md', 'tests', 'tools', TSV)


def is_os(path):
    return path.split('/')[0] not in NOT_OS and not path.startswith('usr/local/')


def sha256(full):
    digest = hashlib.sha256()
    with open(full, 'rb') as handle:
        for block in iter(lambda: handle.read(1 << 20), b''):
            digest.update(block)
    return digest.hexdigest()


def read_tsv(root):
    entries = {}
    with open(os.path.join(root, TSV)) as handle:
        for line in handle:
            if line.startswith('#'):
                continue
            path, kind, mode, uid, gid, extra = line.rstrip('\n').split('\t')
            entries[path] = [kind, int(mode, 8), int(uid), int(gid), extra]
    return entries


def write_tsv(root, entries):
    with open(os.path.join(root, TSV), 'w') as out:
        out.write('# path\ttype\tmode\tuid\tgid\tsha256 (file) | target (link) | major,minor (device)\n')
        for path in sorted(entries):
            kind, mode, uid, gid, extra = entries[path]
            out.write('%s\t%s\t%04o\t%d\t%d\t%s\n' % (path, kind, mode, uid, gid, extra))


def tree(root):
    """Every os path in the working tree -> (type, link target or None)."""
    found = {}
    for folder, dirs, files in os.walk(root):
        rel_folder = os.path.relpath(folder, root)
        for name in dirs + files:
            path = name if rel_folder == '.' else rel_folder + '/' + name
            if not is_os(path):
                if name in dirs:
                    dirs.remove(name)
                continue
            st = os.lstat(os.path.join(root, path))
            kind = 'l' if stat.S_ISLNK(st.st_mode) else 'd' if stat.S_ISDIR(st.st_mode) else 'f' if stat.S_ISREG(st.st_mode) else '?'
            found[path] = (kind, os.readlink(os.path.join(root, path)) if kind == 'l' else None)
            if kind == 'l' and name in dirs:
                dirs.remove(name)  # don't follow
    return found


def problems(root, entries, hashes=True):
    found, bad = tree(root), []
    for path, (kind, mode, uid, gid, extra) in sorted(entries.items()):
        if kind in 'cb':
            continue  # device nodes exist only in the package
        if path not in found:
            if kind == 'd':
                continue  # git drops empty directories; the package makes them
            bad.append('missing from tree: ' + path)
        elif found[path][0] != kind:
            bad.append('type %s in tree, %s in %s: %s' % (found[path][0], kind, TSV, path))
        elif kind == 'l' and found[path][1] != extra:
            bad.append('link target differs: ' + path)
        elif kind == 'f' and hashes and sha256(os.path.join(root, path)) != extra:
            bad.append('content differs (run --refresh after editing): ' + path)
    bad += ['not in %s (run --refresh): %s' % (TSV, p) for p in sorted(set(found) - set(entries))]
    return bad


def refresh(root):
    entries, found = read_tsv(root), tree(root)
    for path in list(entries):
        if entries[path][0] in 'cb' or (entries[path][0] == 'd' and path not in found):
            continue
        if path not in found:
            del entries[path]
    for path, (kind, target) in found.items():
        full = os.path.join(root, path)
        if path not in entries:
            mode = 0o777 if kind == 'l' else 0o755 if kind == 'd' or os.stat(full).st_mode & 0o100 else 0o644
            entries[path] = [kind, mode, 0, 0, '']
        entries[path][0] = kind
        entries[path][4] = target if kind == 'l' else sha256(full) if kind == 'f' else ''
    write_tsv(root, entries)
    return entries


def pack(root, out):
    entries = read_tsv(root)
    bad = problems(root, entries)
    if bad:
        raise SystemExit('\n'.join(bad[:50]))
    fs = io.BytesIO()
    with tarfile.open(fileobj=fs, mode='w:bz2', format=tarfile.GNU_FORMAT) as tar:
        top = tarfile.TarInfo('.')
        top.type, top.mode = tarfile.DIRTYPE, 0o755
        tar.addfile(top)
        for path in sorted(entries):
            kind, mode, uid, gid, extra = entries[path]
            info = tarfile.TarInfo('./' + path)
            info.mode, info.uid, info.gid, info.mtime = mode, uid, gid, 1794441600  # fixed time: same tree, same package
            full = os.path.join(root, path)
            if kind == 'f':
                info.size = os.path.getsize(full)
                with open(full, 'rb') as handle:
                    tar.addfile(info, handle)
                continue
            if kind == 'd':
                info.type = tarfile.DIRTYPE
            elif kind == 'l':
                info.type, info.linkname = tarfile.SYMTYPE, extra
            else:
                info.type = tarfile.CHRTYPE if kind == 'c' else tarfile.BLKTYPE
                info.devmajor, info.devminor = map(int, extra.split(','))
            tar.addfile(info)
    data = fs.getvalue()
    with tarfile.open(out, 'w', format=tarfile.GNU_FORMAT) as package:
        top = tarfile.TarInfo('./')
        top.type, top.mode, top.mtime = tarfile.DIRTYPE, 0o755, 1794441600
        package.addfile(top)
        info = tarfile.TarInfo('./filesystem.tar.bz2')
        info.size, info.mode, info.mtime = len(data), 0o644, 1794441600
        package.addfile(info, io.BytesIO(data))
    print('%s: %d entries, %d bytes' % (out, len(entries), os.path.getsize(out)))


def main(argv):
    root = os.environ.get('BENCH_ROOT', ROOT)
    if argv == ['--check']:
        bad = problems(root, read_tsv(root))
        print('\n'.join(bad) or 'ok')
        return 1 if bad else 0
    if argv == ['--refresh']:
        print('%d entries' % len(refresh(root)))
        return 0
    if len(argv) == 1 and not argv[0].startswith('-'):
        pack(root, argv[0])
        return 0
    raise SystemExit(__doc__)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
