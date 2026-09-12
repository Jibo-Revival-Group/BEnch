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
const util_1 = require("../util/util");
const log_1 = require("../util/log");
const log = log_1.default.createChild('Storage');
const fs = require("fs");
const path = require("path");
class Storage {
    constructor(base) {
        this.base = base || __dirname;
    }
    load(name) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('load ' + name);
            const buf = yield util_1.default.readFile(path.normalize(this.base + '/' + name + '.json'), { encoding: 'utf8' });
            return buf.toString('utf8');
        });
    }
    save(name, body) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('save ' + name);
            yield util_1.default.writeFile(path.normalize(this.base + '/' + name + '.json'), body);
        });
    }
    loadSync(name) {
        log.debug('load ' + name);
        const buf = fs.readFileSync(path.normalize(this.base + '/' + name + '.json'), { encoding: 'utf8' });
        return buf; //.toString('utf8');
    }
    saveSync(name, body) {
        log.debug('save ' + name);
        fs.writeFileSync(path.normalize(this.base + '/' + name + '.json'), body);
    }
}
exports.default = Storage;
