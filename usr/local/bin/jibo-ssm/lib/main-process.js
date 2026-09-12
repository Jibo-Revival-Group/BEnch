(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mainProcess = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function instantiateService(ServiceClass, options, rootDir) {
    return new ServiceClass(options, rootDir);
}
exports.instantiateService = instantiateService;

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_log_1 = require("jibo-log");
const log = new jibo_log_1.Log('SSM');
exports.default = log;

},{"jibo-log":undefined}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const findRoot = require("find-root");
const jibo_client_framework_1 = require("jibo-client-framework");
const jibo_log_1 = require("jibo-log");
const log_1 = require("../../log");
jibo_log_1.Log.processName = "ssm";
class MainProcess {
    constructor() {
        if (process.versions['electron'] && !global['window']) {
            const root = findRoot(__dirname);
            require(path.join(root, 'startup/deprecated'));
            return;
        }
        jibo_client_framework_1.SystemManagerClient.createInstance('127.0.0.1', 8585);
        log_1.default.debug('Started');
        this.killRunningSkills();
    }
    killRunningSkills() {
        log_1.default.info('Checking for running skills');
        jibo_client_framework_1.SystemManagerClient.instance.list((err, records) => {
            if (err) {
                log_1.default.warn('System Manager error. Now initializing SSM.', err);
                return this.makeSSM();
            }
            for (let i = 0; i < records.length; i++) {
                if (records[i].running) {
                    log_1.default.info('Terminating ', records[i].name);
                    jibo_client_framework_1.SystemManagerClient.instance.terminate(records[i].name, (err) => {
                        log_1.default.info('Initializing SSM');
                        this.makeSSM();
                    });
                    return;
                }
            }
            log_1.default.info('No skill to shut down. Initializing SSM');
            this.makeSSM();
        });
    }
    makeSSM() {
        log_1.default.debug('makeSSM');
        const root = findRoot(__dirname);
        const TcpProxy = require(path.join(root, 'lib/skills-service-manager')).default.TcpProxy;
        new TcpProxy(9222, 9191).start();
        if (process.versions['electron']) {
            new TcpProxy(10223, 12345).start();
        }
        require(path.join(root, 'startup'));
    }
}
function default_1() {
    return new MainProcess();
}
exports.default = default_1;

},{"../../log":2,"find-root":undefined,"jibo-client-framework":undefined,"jibo-log":undefined,"path":undefined}],4:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const jibo_service_framework_1 = require("jibo-service-framework");
const fs = require("fs");
const Async_1 = require("../../../utils/Async");
const jibo_service_framework_2 = require("jibo-service-framework");
const processes = [
    'electron',
    'jibo',
    'pulseaudio',
    'lib/expression-process'
];
const logDir = '/var/log';
const logPath = path.join(logDir, 'monitoring.log');
class ReporterService extends jibo_service_framework_1.HTTPService {
    constructor(options, rootDir) {
        super('monitor-reporter', options, rootDir);
        this.stopped = false;
        this.initialized = false;
        if (ReporterService._instance) {
            throw new Error('Cannot instantiate ReporterService more than once');
        }
        ReporterService._instance = this;
        this.addReport = this.addReport.bind(this);
    }
    static get instance() {
        return ReporterService._instance;
    }
    init(callback) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            jibo_service_framework_2.RegistryClient.createInstance('127.0.0.1', 8181);
            yield Async_1.default.get(cb => _super("init").call(this, cb));
            this.client = new jibo_service_framework_1.WSClient(`ws://127.0.0.1:4111/info/process`);
            this.initialized = true;
            const oldLogPath = path.join(logDir, `monitoring-${Date.now()}.log`);
            const exists = yield Async_1.default.get2(cb => fs.exists(logPath, cb));
            if (exists) {
                yield Async_1.default.get(cb => fs.rename(logPath, oldLogPath, cb));
            }
            callback();
            this.start();
        });
    }
    routes(url) {
        super.routes(url);
        url.post('/report', this.addReport);
    }
    addReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const frame = yield this.parseRequest(req);
            yield Async_1.default.get(cb => fs.appendFile(logPath, JSON.stringify(frame) + '\n', cb));
        });
    }
    addEvent(eventName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized) {
                return;
            }
            const frame = {
                type: 'event',
                ts: Date.now(),
                data: eventName
            };
            yield Async_1.default.get(cb => fs.appendFile(logPath, JSON.stringify(frame) + '\n', cb));
        });
    }
    stop() {
        this.stopped = true;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            while (!this.stopped) {
                const data = yield Async_1.default.get2(cb => this.client.once('message', cb));
                const frame = {
                    type: 'processes',
                    ts: Date.now(),
                    total_cpu_jiffies: data.total_cpu_jiffies,
                    data: []
                };
                for (let i = 0; i < data.processes.length; i++) {
                    const process = data.processes[i];
                    for (let j = 0; j < processes.length; j++) {
                        if (process.cmdname.indexOf(processes[j]) >= 0) {
                            frame.data.push(process);
                        }
                    }
                }
                yield Async_1.default.get(cb => fs.appendFile(logPath, JSON.stringify(frame) + '\n', cb));
            }
        });
    }
    parseRequest(req) {
        return new Promise((resolve, reject) => {
            let body = "";
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                let data;
                try {
                    data = JSON.parse(body);
                    resolve(data);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
}
exports.default = ReporterService;

},{"../../../utils/Async":6,"fs":undefined,"jibo-service-framework":undefined,"path":undefined}],5:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const MainProcess_1 = require("./MainProcess");
const ReporterService_1 = require("./reporter/ReporterService");
const Async_1 = require("../../utils/Async");
const SSMService_1 = require("../../SSMService");
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.argv[3] === '--reporter') {
            SSMService_1.instantiateService(ReporterService_1.default, { port: 10101 }, 'reporter-service');
            yield Async_1.default.get(cb => ReporterService_1.default.instance.init(cb));
        }
        console.log('pre create main');
        MainProcess_1.default();
    });
}
start();

},{"../../SSMService":1,"../../utils/Async":6,"./MainProcess":3,"./reporter/ReporterService":4}],6:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyCallback = () => { return; };
class Async {
    static get(exec) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                exec((error, data) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(data);
                });
            });
        });
    }
    static get2(exec) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                exec((data) => {
                    resolve(data);
                });
            });
        });
    }
    static all(promises, max) {
        return __awaiter(this, void 0, void 0, function* () {
            let results = [];
            while (promises.length > 0) {
                const temp = yield Promise.all(promises.splice(0, max));
                results = results.concat(temp);
            }
            return results;
        });
    }
}
exports.default = Async;

},{}]},{},[5])(5)
});

//# sourceMappingURL=main-process.js.map
