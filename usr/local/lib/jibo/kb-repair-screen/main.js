'use strict';
// Full-screen repair notice shown while kb-deep-repair runs (SSM and the Be renderer are not up yet).
var electron = require('electron'), path = require('path'), fs = require('fs');
var app = electron.app;
app.on('ready', function () {
    var win = new electron.BrowserWindow({ x: 0, y: 0, width: 1280, height: 720, frame: false, show: false, backgroundColor: '#000000' });
    win.loadURL('file://' + path.join(__dirname, 'index.html'));
    win.webContents.on('did-finish-load', function () {
        win.show(); win.focus(); win.setPosition(0, 0);
        // Test hook: save a picture of the screen.
        if (process.env.KB_SCREEN_SHOT) {
            setTimeout(function () {
                win.capturePage(function (image) { fs.writeFileSync(process.env.KB_SCREEN_SHOT, image.toPNG()); });
            }, 1500);
        }
    });
});
app.on('window-all-closed', function () { app.quit(); });
// Never outlive the repair: if it exits or dies, close so the screen cannot cover Jibo's face.
var parent = Number(process.env.KB_REPAIR_PID);
if (parent) {
    setInterval(function () { try { process.kill(parent, 0); } catch (e) { app.quit(); } }, 2000);
}
