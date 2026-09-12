"use strict";
/*
  TODO: Delete this file, import 'jibo-service-framework/lib/dts/DataTypes'

  This file is copied whole cloth from: 'jibo-service-framework/lib/dts/DataTypes'
  which is not avaialable at present, because it is not exported at the moment.

  At any point in the future, feel free to replace all references to this file
  with the appropriate import.

  -- Lyle Moffitt
*/
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @class ServiceError
 * @param platformErrorKey {string} Platform error key expected by platform error services
 * @param value {ErrorValue} Value of error for platform key. See expected format below.
 * @description Format of error expected by errors service
 */
class ServiceError {
    constructor(platformErrorKey, value) {
        this.key = platformErrorKey;
        this.value = value;
    }
}
exports.ServiceError = ServiceError;
/**
 * @typedef ErrorType
 * @property UNKNOWN {number} Unknown error type.
 * @property EVENT {number} Event error type.
 * @property RECOVERABLE {number} Recoverable error type.
 * @description Types of errors to be reported
 */
var ErrorType;
(function (ErrorType) {
    ErrorType[ErrorType["UNKNOWN"] = 0] = "UNKNOWN";
    ErrorType[ErrorType["EVENT"] = 1] = "EVENT";
    ErrorType[ErrorType["RECOVERABLE"] = 2] = "RECOVERABLE";
})(ErrorType = exports.ErrorType || (exports.ErrorType = {}));
/**
 * @typedef ErrorStatus
 * @property UNKNOWN {number} Unknown status.
 * @property BROKEN {number} Broken status.
 * @property FIXED {number} Fixed status.
 * @description Status of errors to be reported.
 */
var ErrorStatus;
(function (ErrorStatus) {
    ErrorStatus[ErrorStatus["UNKNOWN"] = 0] = "UNKNOWN";
    ErrorStatus[ErrorStatus["BROKEN"] = 1] = "BROKEN";
    ErrorStatus[ErrorStatus["FIXED"] = 2] = "FIXED";
})(ErrorStatus = exports.ErrorStatus || (exports.ErrorStatus = {}));
/**
 * @class ErrorValue
 * @param error {ErrorValue} an error to copy into this instance of ErrorValue
 * @description Value for each error expected by errors service
 */
class ErrorValue {
    constructor(name, type, status, count, oldest, newest) {
        this.name = name;
        this.type = type;
        this.status = status;
        this.count = count;
        this.oldest = oldest;
        this.newest = newest;
    }
}
exports.ErrorValue = ErrorValue;
/**
 * @interface ServiceErrors
 * @description Format by which platform errors service expects an
 * array of errors to be reported.
 */
class ServiceErrors {
    constructor(errors) {
        this.entries = [];
        if (errors) {
            errors.forEach((err) => {
                this.entries.push(err);
            });
        }
    }
}
exports.ServiceErrors = ServiceErrors;
