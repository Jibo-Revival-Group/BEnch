"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../util/log");
const log = log_1.default.createChild('ErrorManager');
const DataTypes_1 = require("./DataTypes"); //TODO: import from JSF (blocked by: JIBO-5723)
const Storage_1 = require("../client/Storage");
const Debouncer_1 = require("./Debouncer");
const STORAGE_BASE = '/tmp';
const STORAGE_NAME = 'sts-error-bus';
var ErrorName;
(function (ErrorName) {
    ErrorName[ErrorName["UGC_ERROR"] = 0] = "UGC_ERROR";
    ErrorName[ErrorName["LOOP_ERROR"] = 1] = "LOOP_ERROR";
    ErrorName[ErrorName["CREDENTIAL_ERROR"] = 2] = "CREDENTIAL_ERROR";
    ErrorName[ErrorName["INIT_ERROR"] = 3] = "INIT_ERROR";
})(ErrorName = exports.ErrorName || (exports.ErrorName = {}));
class ErrorManager {
    constructor() {
        if (!ErrorManager.storage) {
            ErrorManager.storage = new Storage_1.default(STORAGE_BASE);
        }
        if (!ErrorManager.errors || !ErrorManager.errors.length) {
            try {
                let value = ErrorManager.storage.loadSync(STORAGE_NAME);
                try {
                    ErrorManager.errors = JSON.parse(value);
                }
                catch (e) {
                    ErrorManager.errors = [null, null, null, null];
                }
            }
            catch (e) {
                ErrorManager.storage.saveSync(STORAGE_NAME, JSON.stringify([null, null, null, null]));
            }
        }
        if (!ErrorManager.saveScheduler) {
            ErrorManager.saveScheduler = new Debouncer_1.default(500, // Wait up to a 0.5 seconds for another trigger
            5000, // Wait no more than 5 seconds before executing
            () => {
                ErrorManager.storage.saveSync(STORAGE_NAME, JSON.stringify(ErrorManager.errors));
            });
        }
    }
    /// get time in [sec,ms]
    getTime() {
        let tm = process.hrtime();
        return [tm[0], Math.floor(tm[1] / 1000)];
    }
    ErrorName2String(name) {
        const map = [
            /*
            UGC_ERROR: The UGC (symmetric key) is presently unknown
            */
            'STS_ERR_UGC_KEY_NOT_FOUND',
            /*
            LOOP_ERROR: The loop is presently unknown
            */
            'STS_ERR_LOOP_ID_UNKNOWN',
            /*
            CREDENTIAL_ERROR: The credentials.json file was not found
            */
            'STS_ERR_CREDENTIALS_NOT_FOUND',
            /*
              INIT_ERROR: Super class failed to init, or some other myserious problem
            */
            'STS_ERR_INIT_FAIL'
        ];
        return map[name];
    }
    /** Creates an error on the error bus or updates it. A file is used as
    the persistence layer.
    */
    setError(name, type, status) {
        log.debug(`setError( name:${this.ErrorName2String(name)}, type:${type}, status:${status} )`);
        if (ErrorManager.errors[name]) {
            ErrorManager.errors[name] = new DataTypes_1.ErrorValue(this.ErrorName2String(name), type, status, ErrorManager.errors[name].count + 1, ErrorManager.errors[name].oldest, this.getTime());
        }
        else {
            ErrorManager.errors[name] = new DataTypes_1.ErrorValue(this.ErrorName2String(name), type, status, 1, //count starts at 1 when creating the error
            this.getTime(), this.getTime());
        }
        ErrorManager.saveScheduler.trigger();
    }
    markBroken(name) {
        log.debug(`markBroken( name:${this.ErrorName2String(name)} )`);
        this.setError(name, DataTypes_1.ErrorType.RECOVERABLE, DataTypes_1.ErrorStatus.BROKEN);
    }
    markFixed(name) {
        log.debug(`markFixed( name:${this.ErrorName2String(name)} )`);
        if (this.isBroken(name))
            this.setError(name, DataTypes_1.ErrorType.RECOVERABLE, DataTypes_1.ErrorStatus.FIXED);
    }
    isBroken(name) {
        if (ErrorManager.errors[name]) {
            return (ErrorManager.errors[name].status === DataTypes_1.ErrorStatus.BROKEN);
        }
        else {
            return false;
        }
    }
    /** Creates a report of all erros suitable for putting on the error bus.
  
    empty: {"entries":[]}
    */
    reportErrors(callback) {
        let errorList = [];
        ErrorManager.storage.load(STORAGE_NAME)
            .then((loadValue) => {
            let errorFile = JSON.parse(loadValue);
            for (let errorItem of errorFile) {
                if (errorItem) {
                    errorList.push(new DataTypes_1.ServiceError(errorItem.name, errorItem));
                }
            }
            return callback(new DataTypes_1.ServiceErrors(errorList));
        })
            .catch((reason) => {
            ErrorManager.saveScheduler.trigger();
            return callback(new DataTypes_1.ServiceErrors());
        });
    }
}
ErrorManager.errors = [null, null, null, null];
exports.ErrorManager = ErrorManager;
