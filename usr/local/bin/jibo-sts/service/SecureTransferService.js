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
const fs = require("fs");
const rimraf = require("rimraf");
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../util/log");
const log = log_1.default.createChild('Service');
const path = require("path");
const Exchange_1 = require("../exchange/Exchange");
const Debouncer_1 = require("../util/Debouncer");
const ErrorManager_1 = require("../util/ErrorManager");
const CredentialStore_1 = require("../client/CredentialStore");
const INIT_PERIOD = 20000;
class SecureTransferService extends jibo_service_framework_1.HTTPService {
    constructor(options, rootDir) {
        super('secure-transfer', options, rootDir);
        this.keypath = '/var/jibo/keys';
        this.exchange = undefined;
        SecureTransferService._instance = this;
        this.errorManager = new ErrorManager_1.ErrorManager();
        this.credentialStore = new CredentialStore_1.CredentialStore('/var/jibo');
        this.scheduleUGCrequest = new Debouncer_1.default(INIT_PERIOD, INIT_PERIOD);
        this.scheduleInit = new Debouncer_1.default(INIT_PERIOD, INIT_PERIOD);
        this.initFinished = false;
    }
    static createInstance(options, rootDir) {
        return new SecureTransferService(options, rootDir);
    }
    static get instance() {
        return SecureTransferService._instance;
    }
    /** Repeatedly attempt to initialize until successful.
  
    Initializing itself is most of what the STS does. It can take forever or a
    few seconds. It's a complicated sequence, in which each step must be done
    correctly before the next can begin. IT MUST NEVER FAIL.
  
    To initialize correctly, we must acquiring FOUR things in order:
      1) Credentials: If you don't have it, you didn't do OOBE right. This is
        REQUIRED in order to make any JSC (server) call.
      2) LoopID: JSC (server) tells us what account we belong to. We need to know
        this in order to know who to trust. (Hint: Trust no one).
      3) KeyPair: You can just create this (easy, right?), but if the other loop
        members don't know what your public key is, they can't talk to you.
      4) SymmetricKey: (aka UGC Key) This is the big one. It's the hardest to get,
        and basically the entire point of everything. JSC will tell you if you
        can make it up yourself, but if they don't you have to beg another loop
        member.
  
    Most of initialization actually happens in @see Exchange#init. This function
     is basically responsible for keeping track of progress and restarting
     when it fails.
    */
    attemptInit() {
        log.debug('attemptInit');
        // Check the status of everything and mark errors
        let ready = this.checkIfReady();
        if (ready.status === false) {
            log.info('Still initializing: ', ready.message);
        }
        // Try to load and validate credentials
        try {
            // Does the credentials file exist? (throw if not)
            this.credentialStore.loadSync();
            // Are the credentials filledOut out?
            if (!this.credentialStore.filledOut()) {
                throw new Error('Credentials exist but are blank');
            }
            else {
                // Credentials are loaded and valid, continue to exchange init
                this.errorManager.markFixed(ErrorManager_1.ErrorName.CREDENTIAL_ERROR);
                log.debug('Credentials loaded successfully');
            }
        }
        catch (err) {
            this.errorManager.markBroken(ErrorManager_1.ErrorName.CREDENTIAL_ERROR);
            return this.restartInit(err);
        }
        ;
        // Start the Exchange services
        if (!this.exchange) {
            this.exchange = new Exchange_1.default(Object.assign({ path: this.keypath }, this.credentialStore.data));
        }
        this.exchange.init()
            .then(() => {
            // Check that the status of everything so that it can all be marked fixed
            let ready = this.checkIfReady();
            /* ------------------------------------------------------------------
            OMG! We're finally done! WE DID IT. We actually finished the init!
    
            ... Lets hope nothing changes.
            */
            this.initFinished = true;
            log.info('Successfully completed STS initialization!');
        })
            .catch((err) => {
            this.errorManager.markBroken(ErrorManager_1.ErrorName.INIT_ERROR);
            return this.restartInit(err);
        });
    }
    init(callback) {
        // initialize the service superclass
        super.init((err) => {
            if (err) {
                // If there was an error in superclass init, note it
                this.errorManager.markBroken(ErrorManager_1.ErrorName.INIT_ERROR);
                callback(err);
            }
            else {
                log.debug('service init start');
                // Here we go with big init!
                this.attemptInit();
                // we should initialize some data here (read stuff from disk?) but do
                // not make any calls to the server *synchronously* from here.
                log.debug('service init end');
                callback();
            }
        });
    }
    /** Check if all the components of the STS are ready and report the first
      in the initialization sequence to be missing.
      @return {status} [true] if all parts are ready, [false] otherwise
      @return {message} A message to log about the component missing
      @return {component} The name of the component
     */
    checkIfReady() {
        // Assume true for defualt response
        let response = {
            status: true,
            message: 'Everything is fine',
            component: 'N/A'
        };
        // Check that credentials have been loaded
        if (!this.credentialStore.filledOut()) {
            this.errorManager.markBroken(ErrorManager_1.ErrorName.CREDENTIAL_ERROR);
            return {
                status: false,
                message: "Credentials not valid or filled out",
                component: 'Credentials',
            };
        }
        else {
            this.errorManager.markFixed(ErrorManager_1.ErrorName.CREDENTIAL_ERROR);
        }
        // Check that exchange has been initialized
        if (!this.exchange) {
            return {
                status: false,
                message: "Exchange client not initialized",
                component: 'Exchange',
            };
        }
        // Check that loop has been loaded
        if (!this.exchange.cache.loopId) {
            this.errorManager.markBroken(ErrorManager_1.ErrorName.LOOP_ERROR);
            return {
                status: false,
                message: 'LoopID is not cached',
                component: 'Loop',
            };
        }
        else {
            this.errorManager.markFixed(ErrorManager_1.ErrorName.LOOP_ERROR);
        }
        // Check that UGC has been acquired
        if (!this.exchange.cache.symmetricKey) {
            this.errorManager.markBroken(ErrorManager_1.ErrorName.UGC_ERROR);
            return {
                status: false,
                message: 'UGC Key is not cached',
                component: 'UGC',
            };
        }
        else {
            this.errorManager.markFixed(ErrorManager_1.ErrorName.UGC_ERROR);
        }
        // If everything is good, mark that we finish initialization
        this.errorManager.markFixed(ErrorManager_1.ErrorName.INIT_ERROR);
        // Return the defualt response
        return response;
    }
    /** Spawn off another call to attemptInit later; Return Immediately
    */
    restartInit(reason) {
        log.info('Restarting STS init: ', reason.message || reason);
        this.scheduleInit.trigger(() => {
            try {
                this.attemptInit();
            }
            catch (err) {
                log.error('attemptInit Failed: ', err.message || err);
            }
        });
    }
    /** Stop STS initialization and revert it's data as much as possible
     */
    stopInit(reason) {
        log.info('Stopping STS init: ', reason);
        // Stop scheduleInit
        this.scheduleInit.halt();
        this.scheduleInit.trigger(() => this.scheduleInit.halt());
        // Stop scheduleUGCrequest
        this.scheduleUGCrequest.halt();
        this.scheduleUGCrequest.trigger(() => this.scheduleUGCrequest.halt());
        // Delete the exchange and all it's data
        delete this.exchange;
    }
    /* ----------------- HTTP Routes and Handlers -------------------- */
    routes(url) {
        super.routes(url);
        // These are comsumed by ToS in Restore & First Contact
        url.get('/UGCKeyReady', this._onUGCKeyReady.bind(this));
        url.get('/hasBackupData', this._onHasBackupData.bind(this));
        // These are for internal use only
        url.get('/initProgress', this._onInitProgress.bind(this));
        url.get('/cache', this._onCache.bind(this));
    }
    /** Wipe all the keys when requested; Restart initialization afterwards
  
    Services all requests to '/_M_/wipe'
    */
    onWipeRequest(req, res) {
        let dir = path.normalize(this.keypath);
        // this is conceptually more of an info log, but wipe is drastic enough to
        // justify warning for indicating it.
        log.warn(`onWipeRequest: removing keypath dir ${dir}`);
        try {
            // Remove the keypath directory and all it's contents
            //    (same as `rm -rf ${keypath}`)
            rimraf.sync(dir, { disableGlob: true });
            // Recreate the directory
            fs.mkdir(dir, (err) => {
                log.iferr(err, `onWipeRequest: error in mkdir after wipe of ${dir}`);
                // Report success
                this.finishNoContent(res, 204, err);
            });
        }
        catch (err) {
            // In the event of a failure, report failure
            log.iferr(err, `onWipeRequest: rimraf on keypath dir ${dir} failed`);
            this.finish(res, err);
        }
        // Stop everything
        this.stopInit('Wipe requested');
        //TODO: Make sure no init happens *ever* once wipe is called
    }
    /** Report errors collected through ErrorManager to the error bus
  
      Services all requests to '/_M_/errors'
     */
    onErrors(req, res) {
        log.debug('_onErrors');
        this.errorManager.reportErrors((data) => {
            this.sendJson(res, data, 200);
        });
    }
    /** Check that the UGC Key is ready; re-request if not present
  
    Services all requests to '/UGCKeyReady'
     */
    _onUGCKeyReady(req, res) {
        log.debug('_onUGCKeyReady');
        // Check that everything necessary is ready before proceeding
        let response = this.checkIfReady();
        // We do not require that UGC key be ready (obviously)
        if (response.status === false && response.component !== 'UGC') {
            log.info('_onUGCKeyReady failed: ' + response.message);
            this.sendJson(res, { status: 'error', message: response.message }, 500);
            return;
        }
        // Query the filesystem (ground truth)
        this.exchange.keyPresent(this.exchange.cache.loopId)
            .then((value) => {
            if (value) {
                this.sendJson(res, { status: 'OK', isReady: true }, 200);
                this.scheduleUGCrequest.halt();
            }
            else {
                this.sendJson(res, { status: 'OK', isReady: false }, 200);
            }
            return value;
        })
            .catch((value) => {
            const msg = "keyPresent value (promise fail condition)";
            log.warn(msg, value);
            this.sendJson(res, { status: 'error', message: msg }, 500);
        })
            .then((value) => {
            if (value) {
                return;
            }
            // Schedule the key to be requested if we don't have it.
            // FIXME: Get this under test
            this.scheduleUGCrequest.trigger(() => __awaiter(this, void 0, void 0, function* () {
                yield this.exchange.requestKeyIfRequired();
            }));
        });
    }
    /** Check that Backups exist; re-request UGC Key if not present
  
      Services all requests to '/hasBackupData'
     */
    _onHasBackupData(req, res) {
        log.debug('_onHasBackupData');
        // Check that everything necessary is ready before proceeding
        let response = this.checkIfReady();
        // We do not require that UGC key be ready
        // ... though it will be needed to decrypt the backup
        // If we didn't have the UGC Key, proactively ask for it again
        if (response.status === false && response.component === 'UGC') {
            this.scheduleUGCrequest.trigger(() => __awaiter(this, void 0, void 0, function* () {
                yield this.exchange.requestKeyIfRequired();
            }));
        }
        // Check if any other condition may cause this call to fail
        if (response.status === false && response.component !== 'UGC') {
            log.info('_onHasBackupData failed: ' + response.message);
            this.sendJson(res, { status: 'error', message: response.message }, 500);
            return;
        }
        // Load the credentials and make the JSC calls
        this.credentialStore.load()
            .then((cred) => {
            var backupClient = new JSC.Backup(cred);
            return backupClient
                .list({ loopId: this.exchange.cache.loopId })
                .promise();
        })
            .then((list) => {
            log.debug("Backup Data: ", list);
            this.sendJson(res, { status: 'OK', isReady: !!list.length }, 200);
        }, (err) => {
            if (err) {
                log.error(JSON.stringify(err));
            }
            this.sendJson(res, { status: 'error', message: err }, 500);
        })
            .catch((err) => {
            if (err) {
                log.error(JSON.stringify(err));
            }
            this.sendJson(res, { status: 'error', message: err }, 500);
        });
    }
    /** Report initialization progress
  
      Services all requests to '/initProgress'
     */
    _onInitProgress(req, res) {
        log.debug('_onInitProgress');
        let response = this.checkIfReady();
        this.sendJson(res, response, 200);
    }
    /** Report the internal cache state
  
      Services all requests to '/cache'
     */
    _onCache(req, res) {
        log.debug('_onCache');
        if (this.exchange && this.exchange.cache) {
            this.sendJson(res, this.exchange.cache, 200);
        }
        else {
            this.sendJson(res, {}, 500);
        }
    }
}
exports.default = SecureTransferService;
