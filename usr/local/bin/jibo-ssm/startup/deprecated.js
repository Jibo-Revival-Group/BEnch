const path = require('path');
const findRoot = require('find-root');
const {BrowserWindow, app, ipcMain} = require('electron');
const ready = () => {
    const skillWindow = new BrowserWindow({
        x: 0,
        y: 0,
        show: false,
        width: 100,
        height: 100,
        backgroundColor: '#000000',
        frame: false
    });
    const indexPath = path.join(findRoot(__dirname), 'index.html');
    skillWindow.loadURL('file://' + indexPath);
};
if(!app.isReady()) {
    app.once('ready', ready);
}
else {
    ready();
}
ipcMain.on('get-pid', (event) => {
    event.sender.send('set-pid', process.pid);
});