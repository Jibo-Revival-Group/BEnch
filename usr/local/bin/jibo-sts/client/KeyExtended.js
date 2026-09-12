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
const Storage_1 = require("./Storage");
const util_1 = require("../util/util");
const JSC = require("@jibo/jibo-server-client");
const NodeRSA = require("node-rsa");
const log_1 = require("../util/log");
const log = log_1.default.createChild('KeyExtended');
const crypto = require("crypto");
const constants = require("constants");
const CIPHER_NAME = 'aes-256-cbc';
const RSA_KEY_SIZE = 2048;
const SYMM_KEY_SIZE = 32;
class KeyExtended {
    constructor(options) {
        this.client = new JSC.Key(options);
        this.storage = new Storage_1.default(options.path);
    }
    createRsaKeys() {
        const key = new NodeRSA({ b: RSA_KEY_SIZE });
        const keyPair = {
            PrivateKey: key.exportKey('private'),
            PublicKey: key.exportKey('public')
        };
        if (!this.hasPemHeader(keyPair.PublicKey)) {
            log.error('Created invalid key pair');
        }
        return keyPair;
    }
    encryptCommonKey(body, publicKey) {
        if (!publicKey) {
            throw new Error('Public key is required');
        }
        if (!body) {
            throw new Error('Body is required');
        }
        return this.encryptRsa(body, publicKey);
    }
    decryptCommonKey(body, privateKey) {
        if (!body) {
            throw new Error('Body is required');
        }
        if (!privateKey) {
            throw new Error('Private key is required');
        }
        return this.decryptRsa(body, privateKey);
    }
    encryptRsa(body, key) {
        return crypto.publicEncrypt({
            key,
            padding: constants.RSA_PKCS1_PADDING
        }, new Buffer(body, 'base64'));
    }
    decryptRsa(body, key) {
        try {
            return crypto.privateDecrypt({ key, padding: constants.RSA_PKCS1_PADDING }, new Buffer(body, 'base64'));
        }
        catch (e) {
            log.error('privateDecrypt threw. Likely a payload/key mismatch.', e);
            throw e; // unrecoverable
        }
    }
    getIv(key) {
        let positions = [2, 4, 6, 8, 31, 29, 27, 25, 9, 11, 13, 15, 24, 22, 20, 18];
        let iv = new Buffer(positions.length);
        for (let i = 0; i < positions.length; i++) {
            iv[i] = key[positions[i]];
        }
        return iv;
    }
    encryptSymmetric(params, callback) {
        if (!params.Key) {
            return callback('Key is required');
        }
        if (!params.Body) {
            return callback('Body is required');
        }
        let binaryKey = new Buffer(params.Key, 'base64');
        let cipher = crypto.createCipheriv(CIPHER_NAME, binaryKey, this.getIv(binaryKey));
        let crypted = cipher.update(params.Body, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return callback(null, crypted);
    }
    encryptSymmetricStream(body, key) {
        if (!body) {
            throw new Error('Body is required');
        }
        if (!key) {
            throw new Error('Key is required');
        }
        const binaryKey = new Buffer(key, 'base64');
        const stream = crypto.createCipheriv(CIPHER_NAME, binaryKey, this.getIv(binaryKey));
        return body.pipe(stream);
    }
    decryptSymmetric(params, callback) {
        if (!params.Key) {
            return callback('Key is required');
        }
        if (!params.Body) {
            return callback('Body is required');
        }
        let binaryKey = new Buffer(params.Key, 'base64');
        let decipher = crypto.createDecipheriv(CIPHER_NAME, binaryKey, this.getIv(binaryKey));
        let dec = decipher.update(params.Body, 'hex', 'utf8');
        dec += decipher.final('utf8');
        callback(null, dec);
    }
    decryptSymmetricStream(body, key) {
        if (!body) {
            throw new Error('Body is required');
        }
        if (!key) {
            throw new Error('Key is required');
        }
        const binaryKey = new Buffer(key, 'base64');
        const stream = crypto.createDecipheriv(CIPHER_NAME, binaryKey, this.getIv(binaryKey));
        return body.pipe(stream);
    }
    /** Loads or creates the key pair: never throws.
     */
    loadOrCreateKeyPair() {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('loadOrCreateKeyPair');
            return yield this.storage.load('keypair')
                .then((pairResult) => {
                if (!pairResult) {
                    throw new Error('KeyPair is empty');
                }
                else {
                    return JSON.parse(pairResult);
                }
            })
                .catch((err) => {
                if (err.code === 'ENOENT') {
                    log.info('KeyPair does not exist');
                }
                else if (err.message.match(/JSON/)) {
                    log.error('Previously saved key pair could not be parsed');
                }
                else if (err.message.match(/empty/)) {
                    log.error('Zero-length key pair found!');
                }
                else {
                    log.error('Cannot read previously saved key pair');
                }
            })
                .then((result) => __awaiter(this, void 0, void 0, function* () {
                if (result) {
                    return result;
                }
                else {
                    const createResult = this.createRsaKeys();
                    const jsonResult = JSON.stringify(createResult);
                    yield this.storage.save('keypair', jsonResult);
                    return createResult;
                }
            }))
                .catch(err => {
                // An error here is unrecoverable, so we're just logging it ;)
                log.error(err);
            });
        });
    }
    addPemHeader(key) {
        let cleanKey = this.removePemHeader(key);
        let keyInChunks = cleanKey.match(/.{1,64}/g);
        return ''
            + '-----BEGIN PUBLIC KEY-----'
            + '\n' + keyInChunks.join('\n') + '\n'
            + '-----END PUBLIC KEY-----';
    }
    removePemHeader(key) {
        if (!this.hasPemHeader(key)) {
            return key;
        }
        else {
            return key
                .replace('-----BEGIN PUBLIC KEY-----', '')
                .replace('-----END PUBLIC KEY-----', '')
                .replace(/\n/g, '');
        }
    }
    hasPemHeader(key) {
        if (key.match(/-----BEGIN PUBLIC KEY-----/) !== null) {
            return true;
        }
        if (key.match(/-----END PUBLIC KEY-----/) !== null) {
            return true;
        }
        return false;
    }
    requestSymmetricKey(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!loopId) {
                throw new Error('loopId parameter is required');
            }
            const pairResult = yield this.loadOrCreateKeyPair();
            return yield this.createRequest({
                publicKey: this.removePemHeader(pairResult.PublicKey),
                loopId
            });
        });
    }
    shareSymmetricKey(loopId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!loopId) {
                throw new Error('loopId is required parameter');
            }
            if (!id) {
                throw new Error('id is required parameter');
            }
            const symmResult = yield this.storage.load('symmetric-' + loopId);
            const getResult = yield this.getRequest({ id });
            const commonResult = this.encryptCommonKey(symmResult, this.addPemHeader(getResult.publicKey));
            return yield this.share({
                id,
                encryptedKey: commonResult.toString('base64')
            });
        });
    }
    createSymmetricKey(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('createSymmetricKey: ' + loopId);
            if (!loopId) {
                throw new Error('loopId is required parameter');
            }
            // Check that Key doesn't currently exist before creating
            let symmResult;
            try {
                symmResult = yield this.storage.load('symmetric-' + loopId);
            }
            catch (e) {
                // This error is fine
            }
            if (symmResult) {
                throw new Error('Symmetric key already exists');
            }
            const buffer = yield util_1.default.randomBytes(SYMM_KEY_SIZE);
            const token = buffer.toString('base64');
            yield this.storage.save('symmetric-' + loopId, token);
            return token;
        });
    }
    loadSymmetricKey(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('loadSymmetricKey: ' + loopId);
            if (!loopId) {
                throw new Error('loopId is required parameter');
            }
            let loaded = yield this.storage.load('symmetric-' + loopId);
            if (loaded) {
                return loaded;
            }
            else {
                throw new Error('Empty file load');
            }
        });
    }
    /** Loads or creates the symmetric key: never throws.
     */
    loadOrCreateSymmetricKey(loopId) {
        return __awaiter(this, void 0, void 0, function* () {
            let loadResult;
            try {
                loadResult = yield this.loadSymmetricKey(loopId);
            }
            catch (e) {
                loadResult = yield this.createSymmetricKey(loopId);
            }
            return loadResult;
        });
    }
    saveSymmetricKey(loopId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('saveSymmetricKey');
            if (!loopId) {
                throw new Error('loopId is required parameter');
            }
            if (!id) {
                throw new Error('id is required parameter');
            }
            const getResult = yield this.getRequest({ id });
            const pairResult = yield this.loadOrCreateKeyPair();
            const decResult = this.decryptCommonKey(getResult.encryptedKey, pairResult.PrivateKey);
            const symmetricKey = decResult.toString('base64');
            yield this.storage.save('symmetric-' + loopId, symmetricKey);
            return symmetricKey;
        });
    }
    shouldCreate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.client.shouldCreate(params).promise();
            log.debug('JSC#shouldCreate ' + JSON.stringify(result));
            return result;
        });
    }
    createRequest(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.client.createRequest(params).promise();
            log.debug('JSC#createRequest ', result);
            return result;
        });
    }
    getRequest(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.client.getRequest(params).promise();
            log.debug('JSC#getRequest ', result);
            return result;
        });
    }
    listIncomingRequests(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const requests = yield this.client.listIncomingRequests(params).promise();
            log.debug('JSC#listIncomingRequests ', requests);
            return requests;
        });
    }
    share(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.client.share(params).promise();
            log.debug('JSC#share ', result);
            return result;
        });
    }
    listBinaryRequests(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.client.listBinaryRequests(params).promise();
            log.debug('JSC#listBinaryRequests ', result);
            return result;
        });
    }
    shareBinary(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.client.shareBinary(params).promise();
            log.debug('JSC#shareBinary ', result);
            return result;
        });
    }
}
exports.KeyExtended = KeyExtended;
