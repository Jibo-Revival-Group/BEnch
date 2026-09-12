(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.skillsMainProcess = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_log_1 = require("jibo-log");
const log = new jibo_log_1.Log('SSM');
exports.default = log;

},{"jibo-log":undefined}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const jibo_log_1 = require("jibo-log");
const log_1 = require("../../log");
jibo_log_1.Log.processName = "skill";
const log = log_1.default.createChild("SkillsMainProcess");
log.debug('skills-main-process.ts');
class RendererController {
    constructor(registryHost, indexPath, context) {
        this.registryHost = registryHost;
        this.indexPath = indexPath;
        this.context = context;
        this.onReady = this.onReady.bind(this);
        this.onInit = this.onInit.bind(this);
        this.onFinished = this.onFinished.bind(this);
        this.onGetContext = this.onGetContext.bind(this);
        this.onCrashed = this.onCrashed.bind(this);
        electron_1.ipcMain.on('get-context', this.onGetContext);
        electron_1.ipcMain.on('init-done', this.onInit);
        electron_1.app.once('ready', this.onReady);
    }
    onCrashed() {
        log.warn('Renderer process crashed. Restarting.');
        this.window.reload();
    }
    onReady() {
        log.info('App Ready', this.indexPath);
        this.window = new electron_1.BrowserWindow({
            show: false,
            x: 0,
            y: 0,
            width: RendererController.WIDTH,
            height: RendererController.HEIGHT,
            frame: false
        });
        this.window.webContents.on('crashed', this.onCrashed);
        this.window.loadURL('file://' + this.indexPath);
        this.window.setSize(RendererController.WIDTH, RendererController.HEIGHT);
    }
    onFinished() {
        electron_1.app.quit();
    }
    onInit() {
        this.window.show();
        this.window.focus();
        this.window.setPosition(0, 0);
    }
    onGetContext(event) {
        log.info('Get context called');
        event.sender.send('set-context', {
            registryHost: this.registryHost,
            runMode: process.env.RUNMODE,
            token: '',
            context: this.context
        });
    }
}
RendererController.WIDTH = 1281;
RendererController.HEIGHT = 721;
function default_1(registryHost, indexPath, context) {
    return new RendererController(registryHost, indexPath, context);
}
exports.default = default_1;

},{"../../log":1,"electron":undefined,"jibo-log":undefined}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MainProcess_1 = require("./MainProcess");
let registryHost = process.argv[3];
let indexPath = process.argv[4];
let context;
if (process.argv.length === 6) {
    try {
        context = JSON.parse(process.argv[5]);
    }
    catch (e) {
        console.error('could not parse context', process.argv[5]);
    }
}
MainProcess_1.default(registryHost, indexPath, context);

},{"./MainProcess":2}]},{},[3])(3)
});

//# sourceMappingURL=skills-main-process.js.map
