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
const typed_promisify_1 = require("typed-promisify");
const timers_1 = require("timers");
const fs = require("fs");
const crypto = require("crypto");
let boundedFunctionCache = {};
exports.default = {
    delay: (time) => new Promise(resolve => { timers_1.setTimeout(resolve, time); }),
    readFile: typed_promisify_1.promisify(fs.readFile),
    writeFile: typed_promisify_1.promisify(fs.writeFile),
    randomBytes: typed_promisify_1.promisify(crypto.randomBytes),
    /** Callback later with setTimeout; route all exceptions to error handler
    @param {cb_fn}   Function Callback function
    @param {err_fn}  Function Error handler
    @param {delay}   Number Delay in ms to wait before calling
    */
    safeCallback: (params) => {
        return timers_1.setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            try {
                // Try and call the (potentially-throwing) function
                yield params.cb_fn();
            }
            catch (e) {
                // If it throws schedule the error handler
                params.err_fn(e);
            }
            // If delay is not provided default to zero
        }), params.delay || 0);
    },
};
