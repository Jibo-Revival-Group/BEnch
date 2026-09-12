"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Log = require("jibo-log");
Log.loadConfig({
    logUncaughtExceptions: true,
    logUnhandledRejections: true,
    outputs: {
        console: {
            outputFileAndLine: false,
            outputLevel: true,
        },
        syslog: {
            port: 514,
            target: '127.0.0.1',
            outputFileAndLine: false
        },
        file: {
            filename: 'sts.log'
        }
    },
    namespaces: {
        '': {
            console: 'info',
            syslog: 'info',
            file: 'none',
        }
    }
});
Log.processName = 'STS';
Log.topLevelNamespace = 'P';
const log = new Log('secure-transfer-service');
exports.default = log;
