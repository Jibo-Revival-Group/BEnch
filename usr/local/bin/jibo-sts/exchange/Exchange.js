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
const KeyExtended_1 = require("../client/KeyExtended");
const Storage_1 = require("../client/Storage");
const NotificationManager_1 = require("../service/NotificationManager");
const util_1 = require("../util/util");
const log_1 = require("../util/log");
const log = log_1.default.createChild('Exchange');
const request = require("request");
const ErrorManager_1 = require("../util/ErrorManager");
const REQUEST_TIMEOUT = 2 * 3600 * 1000; // 2 hours
const REQUEST_POLL_DELAY = 10 * 1000; // 10 seconds
const INCOMING_POLL_DELAY = 30 * 60 * 1000; // 30 minutes
class Exchange {
    constructor(options) {
        // Save the options for later
        this.options = options;
        // Defer potentially-throwing construction to connect()
        this.keyClient = undefined;
        this.loopClient = undefined;
        this.notificationManager = undefined;
        this.errorManager = undefined;
        this.credentialStore = new Storage_1.default('/var/jibo');
        // Cached values
        this.cache = {
            loopId: '',
            keyPair: undefined,
            symmetricKey: undefined,
            credentials: {
                accessKeyId: options.accessKeyId,
                secretAccessKey: options.secretAccessKey,
                region: options.region
            }
        };
    }
    /** Connect to deferred components
      @throws When KeyExtended or JSC throws (probably due to network problems)
     */
    connect(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let resolved = Object.assign({}, this.options, options);
            if (!this.errorManager) {
                this.errorManager = new ErrorManager_1.ErrorManager();
            }
            if (!this.notificationManager) {
                this.notificationManager = new NotificationManager_1.NotificationManager();
            }
            if (!this.keyClient) {
                try {
                    this.keyClient = new KeyExtended_1.KeyExtended(resolved);
                }
                catch (err) {
                    log.error('Key Service initialization failed: ', err);
                    this.errorManager.markBroken(ErrorManager_1.ErrorName.UGC_ERROR);
                    throw err;
                }
            }
            if (!this.loopClient) {
                try {
                    this.loopClient = new JSC.Loop(resolved);
                }
                catch (err) {
                    log.error('JSC Loop initialization failed: ', err);
                    this.errorManager.markBroken(ErrorManager_1.ErrorName.LOOP_ERROR);
                    throw err;
                }
            }
        });
    }
    /** Initialize the exchange sub-service
  
      This includes (in order):
        - Connect to JSC
        - Get loopId
        - Make KeyPair
        - Start serving server notifications
        - Acquire UGC Key
        - Start polling for incoming requests
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('exchange init');
            // Connect to network (and other) services
            yield this.connect(this.options)
                .catch(err => {
                this.errorManager.markBroken(ErrorManager_1.ErrorName.INIT_ERROR);
                throw err;
            });
            // Acquire loop ID
            const loopId = yield this.acquireLoopId()
                .catch(err => {
                this.errorManager.markBroken(ErrorManager_1.ErrorName.LOOP_ERROR);
                throw err;
            })
                .then(loop => {
                this.errorManager.markFixed(ErrorManager_1.ErrorName.LOOP_ERROR);
                return loop;
            });
            // Acquire Key Pair
            this.cache.keyPair = yield this.keyClient.loadOrCreateKeyPair();
            // Subscribe to notifications
            log.debug('subscribe to notifications');
            yield this.notificationManager.init();
            this.subscribeToNotifications();
            // Acquire Symmetric Key
            let symmetricKey = yield this.keyPresent(loopId)
                .catch(err => {
                this.errorManager.markBroken(ErrorManager_1.ErrorName.UGC_ERROR);
                throw err;
            })
                .then(key => {
                this.errorManager.markFixed(ErrorManager_1.ErrorName.UGC_ERROR);
                return key;
            });
            // Should also check if key is correct. But I would like to do it in
            // a way that does not involve retrieving the full key again.
            if (!symmetricKey) {
                this.errorManager.markBroken(ErrorManager_1.ErrorName.UGC_ERROR);
                this.cache.symmetricKey = yield this.createOrRequestSymmetricKey(loopId);
            }
            if (yield this.keyPresent(loopId)) {
                this.errorManager.markFixed(ErrorManager_1.ErrorName.UGC_ERROR);
            }
            // Poll to service any incoming requests
            util_1.default.safeCallback({
                cb_fn: () => __awaiter(this, void 0, void 0, function* () { return yield this.pollIncoming(loopId); }),
                err_fn: (err) => log.error(err),
            });
        });
    }
    /** Get the LoopID through JSC and cache it
      @throws When JSC doesn't report exactly one loop
      */
    acquireLoopId() {
        return __awaiter(this, void 0, void 0, function* () {
            let loops;
            try {
                loops = yield this.loopClient.list().promise();
            }
            catch (e) {
                log.warn(`Unable to get loop list from JSC: ${e.code}: ${e.message}`);
                throw e;
            }
            if (loops.length === 0) {
                // Loop is most likely suspended
            }
            if (loops.length !== 1) {
                throw new Error(`Expected one loop in list (returned: ${loops.length})`);
            }
            this.cache.loopId = loops[0].id;
            return this.cache.loopId;
        });
    }
    /** Poll for requests from other loop members
     */
    pollIncoming(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            // initialize tracking structure
            if (this.pollingInProgress === undefined) {
                this.pollingInProgress = {};
            }
            // exit if already polling
            if (this.pollingInProgress[loopId]) {
                return;
            }
            //TODO: report error if we ever see multiple loops
            // begin polling
            log.debug('pollIncoming: ', loopId);
            this.pollingInProgress[loopId] = true;
            try {
                // exit if polling is halted externally
                while (this.pollingInProgress[loopId]) {
                    yield this.processIncomingKeyRequests(loopId);
                    yield this.processIncomingBinaryRequests(loopId);
                    yield util_1.default.delay(INCOMING_POLL_DELAY);
                }
            }
            catch (err) {
                // If an exception occurs, just start polling again later
                this.pollingInProgress[loopId] = false;
                log.error('Error while polling incoming: ', err);
                util_1.default.safeCallback({
                    cb_fn: () => __awaiter(this, void 0, void 0, function* () { return yield this.pollIncoming(loopId); }),
                    err_fn: (err) => log.error(err),
                    delay: INCOMING_POLL_DELAY,
                });
            }
        });
    }
    /** Poll for a response to a request sent to another loop member
     */
    pollForRequest(id) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('pollForRequest');
            const startedPollingAt = Date.now();
            let processedKey = undefined;
            while (Date.now() < startedPollingAt + REQUEST_TIMEOUT) {
                processedKey = yield this.processSharedKey(id);
                if (processedKey) {
                    this.cache.symmetricKey = processedKey;
                    return this.cache.symmetricKey;
                }
                yield util_1.default.delay(REQUEST_POLL_DELAY);
            }
            if (!processedKey) {
                throw new Error('Unable to get symmetric loop key in reasonable time');
            }
        });
    }
    requestKeyIfRequired() {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.keyRequired(this.cache.loopId)) {
                yield this.requestAndPollForSymmetricKey(this.cache.loopId)
                    .catch(err => {
                    log.error(err);
                    throw err;
                });
            }
        });
    }
    createOrRequestSymmetricKey(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('createOrRequestSymmetricKey: ', loopId);
            // If key already exists, we don't need to create or request it
            const existingKey = yield this.keyPresent(loopId);
            if (existingKey) {
                return existingKey;
            }
            // If key is required:
            if (yield this.keyRequired(loopId)) {
                // ... get it from another member of the loop
                return yield this.requestAndPollForSymmetricKey(loopId);
            }
            else {
                // ... create it
                return yield this.keyClient.createSymmetricKey(loopId);
            }
        });
    }
    /** Request the key from the other loop members and start polling for the
      response. Polling may take as long as REQUEST_TIMEOUT to return.
    */
    requestAndPollForSymmetricKey(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('requestAndPollForSymmetricKey: ', loopId);
            const request = yield this.keyClient.requestSymmetricKey(loopId);
            // Start polling for key (fallback for KeyShared notification)
            return yield this.pollForRequest(request.id);
        });
    }
    /** Either loads the symmetric key or returns empty string: never throws
    */
    keyPresent(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Think about this carefully before enabling it
            // Return the cached value if it was previously loaded; ignore the disk.
            // if(this.cache.symmetricKey){
            //   return this.cache.symmetricKey;
            // }
            try {
                this.cache.symmetricKey = yield this.keyClient.loadSymmetricKey(loopId);
                return this.cache.symmetricKey;
            }
            catch (e) {
                log.warn('Key not present: ', e.message);
                // If we don't have symmetric key, we can't share it
                return '';
            }
        });
    }
    /** Key is 'required' if it is not available locally and it should not be created.
      - If TRUE, you must request it.
      - If FALSE, it either exists or you may create it.
    */
    keyRequired(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.keyPresent(loopId)) {
                log.debug('keyRequired: ', false);
                return false;
            }
            else {
                const shouldCreateResult = yield this.keyClient.shouldCreate({ loopId });
                log.debug('keyRequired: ', !shouldCreateResult.shouldCreate);
                return !shouldCreateResult.shouldCreate;
            }
        });
    }
    /* -------------------- Notification Handler Block --------------------- */
    subscribeToNotifications() {
        this.notificationManager.on('KeyNeeded', message => {
            log.debug('KeyNeeded event: ', message);
            this.handleKeyNeeded(message.loopId).catch(e => {
                log.error('Error processing KeyNeeded', e);
            });
        });
        this.notificationManager.on('KeyShared', message => {
            log.debug('KeyShared event: ', message);
            this.handleKeyShared(message.id).catch(e => {
                log.error('Error processing KeyShared', e);
            });
        });
        this.notificationManager.on('KeyTimout', message => {
            log.debug('KeyTimout event: ', message);
            this.handleKeyTimeout(message.id).catch(e => {
                log.error('Error processing KeyTimout', e);
            });
        });
        this.notificationManager.on('BinaryNeeded', message => {
            log.debug('BinaryNeeded event: ', message);
            this.handleBinaryNeeded(message.loopId).catch(e => {
                log.error('Error processing BinaryNeeded', e);
            });
        });
    }
    handleKeyNeeded(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.processIncomingKeyRequests(loopId);
        });
    }
    handleKeyShared(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.processSharedKey(id);
        });
    }
    handleKeyTimeout(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.processKeyTimeout(id);
        });
    }
    handleBinaryNeeded(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.processIncomingBinaryRequests(loopId);
        });
    }
    /* --------------------     Process Key Block      --------------------- */
    processIncomingKeyRequests(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('processIncomingKeyRequests');
            if (!(yield this.keyPresent(loopId))) {
                log.warn('Dropping key request: missing UGC key');
                return;
            }
            const requests = yield this.keyClient.listIncomingRequests({ loopId });
            for (let request of requests) {
                yield this.keyClient.shareSymmetricKey(request.loopId, request.id);
            }
        });
    }
    processSharedKey(id) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('processSharedKey');
            const request = yield this.keyClient.getRequest({ id });
            if (!request.encryptedKey) {
                log.warn('Attempt to process request without encrypted key');
                return undefined;
            }
            // We check for PEM headers on public keys, but don't require them
            if (!this.keyClient.hasPemHeader(request.publicKey)) {
                log.info('Received request without PEM header: ', request.publicKey);
            }
            const keyPair = yield this.keyClient.loadOrCreateKeyPair();
            if (this.keyClient.removePemHeader(request.publicKey)
                !== this.keyClient.removePemHeader(keyPair.PublicKey)) {
                throw new Error('Public key mismatch while processing shared key');
            }
            let oldSymmetric = yield this.keyPresent(request.loopId);
            let newSymmetric = yield this.keyClient.saveSymmetricKey(request.loopId, request.id);
            if ((oldSymmetric !== '') && (newSymmetric !== oldSymmetric)) {
                log.warn('Replacing old symmetric key with new one');
            }
            this.cache.symmetricKey = newSymmetric;
            this.errorManager.markFixed(ErrorManager_1.ErrorName.UGC_ERROR);
            return this.cache.symmetricKey;
        });
    }
    processKeyTimeout(id) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('processSharedKey');
            const request = yield this.keyClient.getRequest({ id });
            // Reject if loopID does not match our associated loop
            if (this.cache.loopId && request.loopId !== this.cache.loopId) {
                // This should never happen
                log.warn('Received KeyTimout for wrong loop: ', this.cache.loopId, ' != ', request.loopId);
                return;
            }
            /* We may be seeing a timeout for one of two reasons:
                1) We stopped servicing incoming requests.
                2) A request we sent out was unanswered
            */
            // If we stopped servicing incoming, restart polling
            util_1.default.safeCallback({
                cb_fn: () => __awaiter(this, void 0, void 0, function* () { return yield this.pollIncoming(request.loopId); }),
                err_fn: (err) => log.error(err),
            });
            // If our request was dropped, re-request
            if (yield this.keyRequired(request.loopId)) {
                yield this.requestAndPollForSymmetricKey(request.loopId);
            }
        });
    }
    processIncomingBinaryRequests(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('processIncomingBinaryRequests');
            let symmetricKey = yield this.keyPresent(loopId);
            if (!symmetricKey) {
                log.warn('Dropping binary request: missing UGC key');
                return;
            }
            const requests = yield this.keyClient.listBinaryRequests({ loopId });
            for (let req of requests) {
                yield this.keyClient.shareBinary({
                    id: req.id,
                    body: this.keyClient.decryptSymmetricStream(request(req.encryptedUrl), symmetricKey)
                });
            }
        });
    }
}
exports.default = Exchange;
