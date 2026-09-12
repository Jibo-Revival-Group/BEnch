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
const JSC = require("@jibo/jibo-server-client");
const Storage_1 = require("../client/Storage");
const log_1 = require("../util/log");
const log = log_1.default.createChild('CredentialStore');
class CredentialStore {
    constructor(path) {
        this.storage = new Storage_1.default(path);
        this.data = undefined;
    }
    /** Synchronously load credentials file
      @returns Credentials
      @throws [ENOENT] if file not found
      @throws [JSON Parse Error] if file corrupted
      */
    loadSync() {
        log.debug('CredentialStore.loadSync');
        let buffer = this.storage.loadSync('credentials');
        let parsed = JSON.parse(buffer);
        log.info('CredentialStore.data.accessKeyId: ', parsed.accessKeyId);
        return this.data = parsed;
    }
    /** Blocking load credentials file
      @returns Credentials
      */
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('CredentialStore.load');
            let buffer = yield this.storage.load('credentials');
            let parsed = JSON.parse(buffer);
            log.info('CredentialStore.data.accessKeyId: ', parsed.accessKeyId);
            return this.data = parsed;
        });
    }
    /** Check if the loaded credentials have the necessary fields filled out.
      If the credentials are not loaded yet, read them in.
      @returns  [True] if suitable for use with JSC
                [False] if empty or missing values
      @throws   NEVER
      */
    filledOut() {
        log.debug('CredentialStore.filledOut');
        try {
            // Check to see if the credentials have been loaded yet, if not do so
            if (!this.data) {
                // load the credentials file and populate the cache (this.data)
                this.loadSync();
                // By this point this.data is now loaded
                // Pre-check assumptions. Key may not exist.
                log.iferr(!this.data.secretAccessKey, 'CredentialStore.filledOut error: ', 'secretAccessKey is undefined');
                log.iferr(!this.data.accessKeyId, 'CredentialStore.filledOut error: ', 'accessKeyId is undefined');
                log.iferr(!this.data.region, 'CredentialStore.filledOut error: ', 'region is undefined');
            }
            // Perform primary check. If length is non-zero, it's "filled out"
            return (this.data.secretAccessKey.length > 0 &&
                this.data.accessKeyId.length > 0 &&
                this.data.region.length > 0);
        }
        catch (e) {
            log.error('CredentialStore.filledOut error: ', e);
            return false;
        }
    }
    /** Update global JSC with credentials.
  
      After this call, all JSC API calls can be made without credentials supplied.
      Supplying credentials anyway will override it for the specific client.
      */
    authorizeJSC() {
        log.debug('CredentialStore.authorizeJSC');
        JSC.config.update(this.data);
    }
}
exports.CredentialStore = CredentialStore;
