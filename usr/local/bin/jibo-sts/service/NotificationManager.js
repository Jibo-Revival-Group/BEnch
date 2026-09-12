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
const events_1 = require("events");
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../util/log");
const log = log_1.default.createChild('NotificationManager');
class NotificationManager extends events_1.EventEmitter {
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const record = yield this._getServiceRecord('server');
            const url = `ws://${record.host}:${record.port}`;
            this._setupSockets(url);
        });
    }
    _processNotification(message) {
        log.info('process notification:', message.payload.name);
        // AccountUpdated notification message has sensitive info; drop it
        if (message.payload.name === 'AccountUpdated') {
            return;
        }
        if (message && message.payload && message.payload.name) {
            log.debug('emitting', message.payload.name, message.payload.payload);
            this.emit(message.payload.name, message.payload.payload);
        }
    }
    _processStatus(message) {
        // NOTE: this intentionally ignores status of 0 ("Invalid")
        if (message && message.status) {
            // status reports stream out at 1Hz. only emit events on status changes.
            if (message.status !== this.lastStatus) {
                this.lastStatus = message.status;
                this.emit('StatusChanged', message.status);
                if (message.status === 1) {
                    this.emit('StatusConnected');
                }
                if (message.status === 2) {
                    this.emit('StatusDisconnected');
                }
            }
        }
    }
    _setupSockets(url) {
        if (!this.notificationsSocket) {
            let socketUrl = url + '/server/notifications';
            this.notificationsSocket = new jibo_service_framework_1.WSClient(socketUrl);
            this.notificationsSocket.on('message', this._processNotification.bind(this));
            this.notificationsSocket.on('error', err => {
                log.warn('Got WS error', err);
            });
        }
        if (!this.statusSocket) {
            let socketUrl = url + '/server/notifications/status';
            this.statusSocket = new jibo_service_framework_1.WSClient(socketUrl);
            this.statusSocket.on('message', this._processStatus.bind(this));
            this.statusSocket.on('error', err => {
                log.warn('Got WS status error', err);
            });
        }
    }
    _getServiceRecord(serviceName) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                jibo_service_framework_1.RegistryClient.instance.getRecords((err, records) => {
                    if (err) {
                        throw err;
                    }
                    if (!records) {
                        throw new Error('no records from registry');
                    }
                    const targetRecord = records.find(record => record.name === serviceName);
                    if (!targetRecord) {
                        throw new Error('no record for service "' + serviceName + '" found in registry');
                    }
                    log.debug('Got service record', targetRecord);
                    resolve(targetRecord);
                });
            });
        });
    }
}
exports.NotificationManager = NotificationManager;
