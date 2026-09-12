Jibo Sync
=========

Some sample code for (incrementally) syncing an entire directory over HTTP

Setup
-----
```bash
$ yarn link .
```

Contributing
------------
```bash
$ yarn install
$ gulp
```


Usage
-----

For API-version, run node ./lib/main.js (see main.js).

For CLI-version, coming soon...



To use
------
Call `createServer` from one process (server); call `uploadToServer` from another process (client).

If you want to exclude certain files and/or directories, you can add a `.syncignore` file in the source directory.
Syntax is similar to that of .gitignore and .npmignore files (uses minimatch).


TODO
----
- clean options
- Don't allow more than 1 upload to same destination directory
- Interrupted upload

NICE TO HAVES
-------------
- Delete empty directories (add dir path checksums)
- Upload to temp directory to not leave partially uploaded state?
