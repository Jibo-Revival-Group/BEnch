(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboSync = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
const Client_1 = require("./Client");
const Server_1 = require("./Server");
const Stopper_1 = require("./Stopper");
const Command_1 = require("./Command");
const Common_1 = require("./Common");
const stopper = new Stopper_1.default();
/**
 * The API exposed by the jibo-sync NPM package
 * @class API
 */
class API {
    /**
     * Expose the Command class, so library users can use it
     * @name API.Command
     * @type {typeof}
     * @static
     */
    static get Command() {
        return Command_1.default;
    }
    /**
     * Async method to create the jibo-sync server
     *
     * ```
     * var jiboSync = require("jibo-sync");
     * jiboSync.createServer()
     * ```
     * @method API.createServer
     * @static
     * @param {number} port The port on which to listen
     * @param {string} dest The destination directory for synced files
     * @param {boolean} [verbose] Turn on verbose debugging messages
     * @param {Logger} [logger] Replace the console with a custom logger
     * @return {string} An informative message
     */
    static createServer(port, dest, user, limit, verbose, logger) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const determinedPort = yield Server_1.default.start(port, dest, user, limit, verbose, logger);
                Common_1.default.info(`Sync server listening on port ${determinedPort}. Press CTRL+C or call stop() to exit.`);
                return determinedPort;
            }
            catch (err) {
                Common_1.default.info(err);
                throw err;
            }
        });
    }
    /**
     * Upload to jibo-sync server
     *
     * ```
     * var jiboSync = require("jibo-sync");
     * jiboSync.uploadToServer()
     * ```
     * @method API.updateToServer
     * @static
     * @param {UploadOptions} options The collection of options
     * @return {string} An informative message
     */
    static uploadToServer(options) {
        return __awaiter(this, void 0, void 0, function* () {
            stopper.reset();
            // If options boolean params are left undefined, set then to false
            options.close = !!options.close;
            options.verbose = !!options.verbose;
            options.force = !!options.force;
            options.external = !!options.external;
            const msg = yield Client_1.default.sync(options.url, options.dir, options.force, options.verbose, options.external);
            if (options.close) {
                yield Client_1.default.done(options.url);
                return msg;
            }
            return msg;
        });
    }
    /**
     * Close the server port
     * @method API.closeServer
     * @static
     * @param {string} url The URL of the server to close
     * @return {string} An informative message
     */
    static closeServer(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Client_1.default.done(url);
        });
    }
    /**
     * Call this to stop an in-progress upload
     * @method API.stop
     * @static
     */
    static stop() {
        stopper.stop();
    }
}
exports.default = API;

},{"./Client":2,"./Command":3,"./Common":4,"./Server":7,"./Stopper":8}],2:[function(require,module,exports){
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
const chalk = require("chalk");
const fs = require("fs");
const Meter = require("stream-meter");
const path = require("path");
const progress = require("progress-stream");
const ProgressBar = require("progress");
const tarFs = require("tar-fs");
const zlib = require("zlib");
const axios_1 = require("axios");
const Common_1 = require("./Common");
const FailErrors_1 = require("./FailErrors");
const PromiseUtils_1 = require("./PromiseUtils");
const Stopper_1 = require("./Stopper");
const jibo_sync_stage_1 = require("jibo-sync-stage");
const stopper = new Stopper_1.default();
const prify = PromiseUtils_1.PromiseUtils.promisify;
class Client {
    static sync(url, directory, force, verbose, external) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            // Update verbose flag
            Common_1.default.setVerbose(verbose);
            // Extract host IP and port from url
            const { host, port } = Common_1.default.getHostPort(url);
            const resolvedPath = Client._resolvePath(directory);
            const stagedDir = path.join(resolvedPath, jibo_sync_stage_1.SyncStage.FOLDER);
            Common_1.default.debug(chalk.white.bold.underline(`Working directory: ${chalk.white(resolvedPath)}\n`));
            // Get list of staged client files and list of files on server
            Common_1.default.startTimer('Getting client and server file lists');
            const [clientList, serverList] = yield Promise.all([
                Client._getClientList(resolvedPath, force, verbose, external),
                Client._getServerList(host, port),
            ]);
            Common_1.default.endTimer();
            // Get update list
            Common_1.default.startTimer('Generating delete and update lists');
            const { deletes, updates, updateSize } = yield Client._getUpdateList(clientList, serverList);
            Common_1.default.endTimer();
            // Add checksums file to files to upload, to optimize next update
            const checksumFile = path.join(stagedDir, Common_1.CHECKSUMS_FILE);
            yield prify(cb => fs.writeFile(checksumFile, JSON.stringify(clientList), cb));
            updates.push(Common_1.CHECKSUMS_FILE);
            // Upload
            yield Client._sync(host, port, stagedDir, deletes, updates, updateSize);
            return `Completed in ${(Date.now() - start) / 1000} seconds`;
        });
    }
    /**
     * Compute the absolute path of a source directory
     * @method Client._resolvePath
     * @static
     * @param {string} path Path passed by the user
     * @return {string} The absolute path version of the directory
     * @private
     */
    static done(url) {
        return __awaiter(this, void 0, void 0, function* () {
            // Set up the request
            const { host, port } = Common_1.default.getHostPort(url);
            let data;
            try {
                const body = yield axios_1.default.post(`http://${host}:${port}/close`);
                data = body.data;
            }
            catch (err) {
                throw new Error(`Invalid request to close sync server. ${err.message}`);
            }
            return data;
        });
    }
    /**
     * Compute the absolute path of a source directory
     * @method Client._resolvePath
     * @param {string} path Path passed by the user
     * @return {string} The absolute path version of the directory
     * @private
     */
    static _resolvePath(path) {
        // Use the current directory if no path was provided
        return typeof path === 'string' ? path : '.';
    }
    /**
     * Async function to get the list of file paths, and their checksums, on
     * the server, for later comparison with the list of files on the client
     * @method Client._getServerList
     * @param {string} host The hostname of the server
     * @param {number} port The port on which to communication with the server
     * @return {Promise<FileDetailsMap>} Checksum for each file path
     * @private
     */
    static _getServerList(host, port) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = yield axios_1.default.post(`http://${host}:${port}/checksum`, {
                method: 'POST',
                json: true,
            });
            const serverList = body.data;
            if (stopper.doStop) {
                throw new Error(FailErrors_1.default.STOPPED);
            }
            return serverList;
        });
    }
    static _getClientList(directory, force, verbose, external) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Client._stageFiles(directory, force, verbose, external);
            const stagedPath = path.join(directory, jibo_sync_stage_1.SyncStage.FOLDER);
            const clientList = yield Common_1.default.getAllFileDetails(stagedPath);
            if (stopper.doStop) {
                throw new Error(FailErrors_1.default.STOPPED);
            }
            return clientList;
        });
    }
    /**
     * Stage files for syncing. This copies all the files to a .staged folder
     * within the current project and then yarn installs only the production files
     * any symlinked dependencies are also copied.
     *
     * @param  {string} directory  Path of package to search
     * @param  {boolean} force If true, run full search, don't used cached file
     * @param  {boolean} verbose    If true, print extra debug information
     * @param  {boolean} external    If true, force external dependencies
     * @return {Promise}            Array of packages
     */
    static _stageFiles(directory, force, verbose, external) {
        if (stopper.doStop) {
            return Promise.reject(FailErrors_1.default.STOPPED);
        }
        if (force) {
            Common_1.default.debug(chalk.white('Force existing staged files.'));
        }
        if (external) {
            Common_1.default.debug(chalk.white('Force use of external dependencies'));
        }
        const stage = new jibo_sync_stage_1.SyncStage(directory, { force, silent: true, external });
        return stage.start();
    }
    // private static async _assertEnoughSpace(
    //     host: string,
    //     port: number,
    //     directory: string,
    //     clientList: FileDetailsMap,
    // ): Promise<void> {
    //     Common.debug('asserting there\'s enough disk space');
    //     const files = Object.keys(clientList).map(file => path.resolve(directory, file));
    //     const size = await Common.getTotalFileSize(files);
    //     Common.debug('total size', size);
    //     await axios.post<FileDetailsMap>(
    //         `http://${host}:${port}/testsize`,
    //         {size},
    //     );
    // }
    static _getUpdateList(clientList, serverList) {
        if (stopper.doStop) {
            throw new Error(FailErrors_1.default.STOPPED);
        }
        // Determine update/delete list
        const updates = [];
        let updateSize = 0;
        const add = fileName => {
            updates.push(fileName);
            updateSize += clientList[fileName].size;
        };
        const clientFiles = Object.keys(clientList);
        const serverFiles = Object.keys(serverList);
        clientFiles.forEach(fileName => {
            const serverFilesIndex = serverFiles.indexOf(fileName);
            if (serverFilesIndex > -1) {
                const clientCompare = Common_1.USE_CHECKSUM
                    ? clientList[fileName].checksum
                    : clientList[fileName].timestamp;
                const serverCompare = Common_1.USE_CHECKSUM
                    ? serverList[fileName].checksum
                    : serverList[fileName].timestamp;
                if (serverCompare !== clientCompare) {
                    // Check sums differ; add to update list
                    add(fileName);
                }
                // remove entry from server list because we already visited it
                serverFiles.splice(serverFilesIndex, 1);
            }
            else {
                // Doesn't exist on server; add to update list
                add(fileName);
            }
        });
        // Whatever is left in serverFiles is now the delete list
        return { deletes: serverFiles, updates, updateSize };
    }
    static _sync(host, port, directory, deletes, updates, updateSize) {
        return __awaiter(this, void 0, void 0, function* () {
            if (stopper.doStop) {
                throw new Error(FailErrors_1.default.STOPPED);
            }
            if (deletes.length === 0 && updates.length === 0) {
                Common_1.default.debug(chalk.gray('Everything is already up to date.'));
                return { size: 0, compressed: 0 };
            }
            yield Client._delete(host, port, deletes);
            if (stopper.doStop) {
                throw new Error(FailErrors_1.default.STOPPED);
            }
            return yield Client._update(host, port, updates, directory, updateSize);
        });
    }
    static _delete(host, port, deletes) {
        return __awaiter(this, void 0, void 0, function* () {
            if (deletes.length > 0) {
                Common_1.default.startTimer(`Deleting ${deletes.length} file${deletes.length === 1 ? '' : 's'}`);
                yield axios_1.default.post(`http://${host}:${port}/delete`, { deletes });
                Common_1.default.endTimer();
            }
            else {
                Common_1.default.debug(chalk.gray('No files to remove'));
            }
        });
    }
    static _update(host, port, updates, directory, updateSize) {
        return __awaiter(this, void 0, void 0, function* () {
            // Then send the update list
            if (updates.length < 1) {
                Common_1.default.debug(chalk.gray('All files already up-to-date'));
                return { size: 0, compressed: 0 };
            }
            const message = `Updating ${updates.length} file${updates.length === 1 ? '' : 's'}`;
            Common_1.default.startTimer(message);
            const tarStream = tarFs.pack(directory, {
                entries: updates,
                dereference: true,
            });
            const bar = new ProgressBar(`${message} [:bar] Elapsed :elapseds | ETA :etas`, {
                total: updateSize,
                complete: '█',
                incomplete: '-',
                clear: true,
                width: (process.stdout.columns || 79) - message.length - 30,
            });
            const progressStream = progress({ length: updateSize });
            progressStream.on('progress', prog => bar.tick(prog.delta));
            const compressedMeter = new Meter();
            const stream = tarStream
                .pipe(progressStream)
                .pipe(zlib.createGzip({ level: 6 }))
                .pipe(compressedMeter);
            stream.on('error', (err) => {
                throw err;
            });
            yield axios_1.default.post(`http://${host}:${port}/upload`, stream, {
                maxContentLength: Number.MAX_VALUE,
                // Ten minutes seems reasonable
                timeout: 600000,
            });
            stopper.once('stop', () => {
                stream.abort();
                throw new Error(FailErrors_1.default.STOPPED);
            });
            process.stdout.write(`${message} ... `);
            Common_1.default.endTimer();
            return { size: updateSize, compressed: compressedMeter.bytes };
        });
    }
}
exports.default = Client;

},{"./Common":4,"./FailErrors":5,"./PromiseUtils":6,"./Stopper":8,"axios":undefined,"chalk":undefined,"fs":undefined,"jibo-sync-stage":undefined,"path":undefined,"progress":undefined,"progress-stream":undefined,"stream-meter":undefined,"tar-fs":undefined,"zlib":undefined}],3:[function(require,module,exports){
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
const path = require("path");
const API_1 = require("./API");
/**
 * Commandline executable
 * @class Command
 */
class Command {
    constructor(binDir) {
        this.allowedCommands = [
            ["create-server", "[port] [dest] [--verbose]", "Create a sync server on current IP with specified port and designated destination directory"],
            ["start", "[url] [source] [--verbose] [--regenerateIgnoreList]", "Sync source directory to specified server url (ip:port)"]
        ];
        this.allowedOptions = [
            ["-h", "--help", "Output usage information"],
            ["-V", "--version", "Output the version number"]
        ];
        this.rootPath = path.dirname(binDir);
        this.parse();
    }
    parse() {
        return __awaiter(this, void 0, void 0, function* () {
            // process.argv for options first
            let firstArg = process.argv[2];
            // check for help
            const usage = [this.allowedOptions[0][0], this.allowedOptions[0][1]];
            if (usage.includes(firstArg)) {
                this.printUsage();
                return true;
            }
            // check for version
            const packageInfo = require(path.join(this.rootPath, 'package.json'));
            const version = [this.allowedOptions[1][0], this.allowedOptions[1][1]];
            if (version.includes(firstArg)) {
                console.log(`\n${packageInfo.version}\n`);
                return true;
            }
            // Find the command the user is trying to initiate
            const args = process.argv.slice(3, process.argv.length);
            const command = this.allowedCommands.find(c => c[0] === firstArg);
            if (command) {
                try {
                    const msg = yield this.processCommand(command[0], args);
                    console.log(`\n${msg}\n`);
                    return true;
                }
                catch (err) {
                    console.log(`\n${err}`);
                    this.printUsage();
                    return false;
                }
            }
            this.printUsage();
            return false;
        });
    }
    printUsage() {
        let rightCol = 40;
        console.log("\n  Usage: sync [options] [command]\n\n");
        console.log("  Commands:\n");
        this.allowedCommands.forEach((command) => {
            let spaceCount = rightCol - command[0].length - command[1].length;
            if (spaceCount <= 0) {
                spaceCount = 4;
            }
            let spaces = '';
            for (let i = 0; i < spaceCount; i++) {
                spaces += ' ';
            }
            console.log(`    ${command[0]} ${command[1]}${spaces}${command[2]}`);
        });
        console.log("\n  Options:\n");
        this.allowedOptions.forEach((option) => {
            let sep = ', ';
            let spaceCountOpt = rightCol - option[0].length - option[1].length - sep.length;
            if (spaceCountOpt <= 0) {
                spaceCountOpt = 4;
            }
            let spacesOpt = '';
            for (let i = 0; i < spaceCountOpt; i++) {
                spacesOpt += ' ';
            }
            console.log(`    ${option[0]}${sep}${option[1]} ${spacesOpt}${option[2]}`);
        });
        console.log('');
    }
    processCommand(command, args, verbose = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let regenerateIgnoreList = false;
            let message;
            switch (command) {
                case 'create-server':
                    const port = yield API_1.default.createServer(parseInt(args[0]), args[1], null, 0, verbose);
                    message = `Sync server listening on port ${port}. Press CTRL+C or call stop() to exit.`;
                    break;
                case 'start':
                    for (let a = args.length - 1; a > 1; a--) {
                        if (args[a] === '--regenerateIgnoreList') {
                            regenerateIgnoreList = args[a + 1] === 'true';
                        }
                    }
                    message = yield API_1.default.uploadToServer({
                        url: args[0],
                        dir: args[1],
                        close: false,
                        force: regenerateIgnoreList,
                        verbose,
                    });
                    break;
                default:
                    message = `Undefined command: ${command}`;
            }
            return message;
        });
    }
}
exports.default = Command;

},{"./API":1,"path":undefined}],4:[function(require,module,exports){
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
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const util = require("util");
const chalk = require("chalk");
const Parallel = require("async-parallel");
const Stopper_1 = require("./Stopper");
const FailErrors_1 = require("./FailErrors");
const PromiseUtils_1 = require("./PromiseUtils");
const jibo_sync_stage_1 = require("jibo-sync-stage");
const jibo_sync_stage_2 = require("jibo-sync-stage");
// Global flag for which method to generate update list (checksum vs timestamps)
exports.USE_CHECKSUM = true;
exports.CHECKSUMS_FILE = '.checksums';
const prify = PromiseUtils_1.PromiseUtils.promisify;
const stopper = new Stopper_1.default();
class Common {
    static getHostPort(url) {
        // extract host and port from url; return as object if found; otherwise undefined is returned
        let strArray = url.split(':');
        if (strArray.length !== 2) {
            Common.info(chalk.red(`Url is not specified as [IP:port]: ${url}`));
            return undefined;
        }
        let host = strArray[0];
        // check we have a numerical port defined
        let port = Number(strArray[1]); // decimal conversion
        if (isNaN(port)) {
            Common.info(chalk.red(`Invalid port defined ${port}`));
            return undefined;
        }
        return {
            host: host,
            port: port,
        };
    }
    static setLogger(logger) {
        Common._logger = logger;
    }
    static setVerbose(enable) {
        Common._verboseLog = !!enable;
    }
    static debug(...args) {
        if (Common._verboseLog) {
            if (Common._logger.debug) {
                Common._logger.debug.apply(Common._logger, args);
            }
            else if (Common._logger.log) {
                Common._logger.log.apply(Common._logger, args);
            }
        }
    }
    static info(...args) {
        Common._logger.info.apply(Common._logger, args);
    }
    static warn(...args) {
        Common._logger.warn.apply(Common._logger, args);
    }
    static error(...args) {
        Common._logger.error.apply(Common._logger, args);
    }
    static startTimer(str) {
        process.stdout.write(chalk.white(str) + ' ... ');
        Common._start = Date.now();
    }
    static endTimer() {
        Common.info(chalk.white('done.'), chalk.gray(jibo_sync_stage_2.utils.timeToString(Date.now() - Common._start)));
        Common._start = null;
    }
    static getAllFileDetails(directory) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!directory) {
                throw new Error(FailErrors_1.default.NO_DIRECTORY);
            }
            if (!(yield prify(h => fs.exists(directory, h), false))) {
                return {};
            }
            const stats = yield prify(h => fs.stat(directory, h));
            if (!stats.isDirectory()) {
                throw new Error(`Directory ${jibo_sync_stage_1.SyncStage.FOLDER} does not exist.`);
            }
            // get an array of the files within the directory
            const list = (yield Common._findFilesRecursive(directory))
                .map(filePath => path.relative(directory, filePath));
            // now loop through the list to get our checksums
            const detailsList = {};
            yield Parallel.each(list, (file) => __awaiter(this, void 0, void 0, function* () {
                if (stopper.doStop) {
                    throw new Error(FailErrors_1.default.STOPPED);
                }
                const details = yield Common._getFileDetails(path.join(directory, file));
                if (details) {
                    // then actually store it in a consistent way:
                    // representing directories in unix-style
                    detailsList[file.replace(/\\/g, '/')] = details;
                }
            }), { concurrency: 5 });
            return detailsList;
        });
    }
    static getTotalFileSize(files) {
        return __awaiter(this, void 0, void 0, function* () {
            const sizes = stats => stats.map(stat => stat.size);
            const sum = numbers => numbers.reduce((a, b) => a + b, 0);
            const stats = yield Parallel.map(files, file => prify(h => fs.stat(file, h)));
            return sum(sizes(stats));
        });
    }
    static getTotalPathSize(path) {
        return __awaiter(this, void 0, void 0, function* () {
            return Common.getTotalFileSize(yield Common._findFilesRecursive(path));
        });
    }
    // Asynchronously load file and get checksum hash value
    static _getFileDetails(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!filename) {
                return null;
            }
            let stats;
            try {
                stats = yield prify(h => fs.stat(path.normalize(filename), h));
            }
            catch (err) {
                Common.info(chalk.red(`Error getting checksum for ${filename}`, err));
                return null;
            }
            const fileDetails = {
                timestamp: null,
                checksum: null,
                size: stats ? stats.size : 0,
            };
            if (stats) {
                const date = stats.mtime;
                let time;
                if (util.isDate(date)) {
                    // convert to 123.456 UNIX timestamp
                    time = date.getTime() / 1000;
                    // truncate it
                    time = time < 0 ? Math.ceil(time) : Math.floor(time);
                    fileDetails.timestamp = time.toString();
                }
                else {
                    Common.info(chalk.red(`Error getting checksum for ${filename}: invalid stats.mtime`));
                }
            }
            else {
                Common.info(chalk.red(`Error getting checksum for ${filename}: no stats`));
            }
            if (exports.USE_CHECKSUM) {
                try {
                    const data = yield prify(h => fs.readFile(path.normalize(filename), h));
                    if (data) {
                        let cksum = crypto.createHash('md5');
                        cksum.update(data);
                        fileDetails.checksum = cksum.digest('hex');
                    }
                    else {
                        Common.info(chalk.red(`Error getting checksum for ${filename}: no data`));
                    }
                }
                catch (err) {
                    Common.info(chalk.red(`Error getting checksum for ${filename}`, err));
                }
            }
            return fileDetails;
        });
    }
    static _existsAndDir(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stat = yield prify(h => fs.lstat(filePath, h));
                return stat.isDirectory();
            }
            catch (err) {
                Common.info(chalk.red(`Error getting file info on ${filePath}; skipping..`), err);
                return false;
            }
        });
    }
    static _dirsOnly(filesAndDirs) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Parallel.filter(filesAndDirs, (filePath) => __awaiter(this, void 0, void 0, function* () { return yield Common._existsAndDir(filePath); }), { concurrency: 5 });
        });
    }
    static _existsAndFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ignore stale checksums file - we add a replacement to the end
                if (path.basename(filePath) === exports.CHECKSUMS_FILE) {
                    return false;
                }
                const stat = yield prify(h => fs.lstat(filePath, h));
                return stat.isFile();
            }
            catch (err) {
                Common.info(chalk.red(`Error getting file info on ${filePath}; skipping..`), err);
                return false;
            }
        });
    }
    static _filesOnly(filesAndDirs) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Parallel.filter(filesAndDirs, (filePath) => __awaiter(this, void 0, void 0, function* () { return yield Common._existsAndFile(filePath); }), { concurrency: 5 });
        });
    }
    static _findFilesRecursive(dir) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get all the files/directories in the current dir
            const filesAndDirs = (yield prify(h => fs.readdir(dir, h)))
                .map(filePath => path.join(dir, filePath));
            if (stopper.doStop) {
                throw new Error(FailErrors_1.default.STOPPED);
            }
            // Get list of files only; this will be the return value
            const filesInDir = yield Common._filesOnly(filesAndDirs);
            if (stopper.doStop) {
                throw new Error(FailErrors_1.default.STOPPED);
            }
            const subdirs = yield Common._dirsOnly(filesAndDirs);
            if (stopper.doStop) {
                throw new Error(FailErrors_1.default.STOPPED);
            }
            // Loop recursively through the each subdirectory, adding results
            // of each subdir to the list of files to return to caller
            const filesInEachSubDir = yield Parallel.map(subdirs, (subdir) => __awaiter(this, void 0, void 0, function* () {
                if (stopper.doStop) {
                    throw new Error(FailErrors_1.default.STOPPED);
                }
                return yield Common._findFilesRecursive(subdir);
            }), { concurrency: 5 });
            if (stopper.doStop) {
                throw new Error(FailErrors_1.default.STOPPED);
            }
            // Concatenate files from this directory and each subdirectory
            return filesInEachSubDir.reduce((files, subDirFiles) => files.concat(subDirFiles), filesInDir);
        });
    }
}
Common._verboseLog = false;
Common._start = null;
Common._logger = console;
exports.default = Common;

},{"./FailErrors":5,"./PromiseUtils":6,"./Stopper":8,"async-parallel":undefined,"chalk":undefined,"crypto":undefined,"fs":undefined,"jibo-sync-stage":undefined,"path":undefined,"util":undefined}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    NO_PORT_SPECIFIED: 'NO_PORT_SPECIFIED',
    CANNOT_CONNECT: 'CANNOT_CONNECT',
    NO_DIRECTORY: 'No directory was specified. Aborting checksum.',
    ERROR: 'ERROR',
    STOPPED: 'STOPPED',
};

},{}],6:[function(require,module,exports){
"use strict";
/**
 * @fileOverview
 *
 * Created on 5/12/16.
 * @author Siggi Orn <siggi@jibo.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
class PromiseUtils {
    static promisify(func, firstParamError = true) {
        return new Promise((resolve, reject) => {
            func((error, result) => {
                if (firstParamError) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                }
                else {
                    resolve(error);
                }
            });
        });
    }
}
exports.PromiseUtils = PromiseUtils;

},{}],7:[function(require,module,exports){
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
const exec = require('child_process').exec;
const fs = require("fs");
const fsExtra = require("fs-extra");
const http = require("http");
const HttpStatus = require("http-status-codes");
const Meter = require("stream-meter");
const Parallel = require("async-parallel");
const path = require("path");
const tarFs = require("tar-fs");
const zlib = require("zlib");
const Common_1 = require("./Common");
const PromiseUtils_1 = require("./PromiseUtils");
const URLUPLOAD = '/upload';
const URLDELETE = '/delete';
const URLCHECKSUM = '/checksum';
const URLCLOSE = '/close';
const URLPING = '/ping';
const URLTESTSIZE = '/testsize';
const prify = PromiseUtils_1.PromiseUtils.promisify;
class Server {
    static start(port, dest, setOwner, sizeLimit, verbose, logger) {
        return __awaiter(this, void 0, void 0, function* () {
            if (logger) {
                Common_1.default.setLogger(logger);
            }
            Common_1.default.setVerbose(verbose);
            if (isNaN(port)) {
                throw new Error('\nInvalid port defined: ${Server._port}');
            }
            Server._uploadDir = dest;
            Server._setOwner = setOwner;
            Server._sizeLimit = sizeLimit;
            Common_1.default.setVerbose(verbose);
            if (logger) {
                Common_1.default.setLogger(logger);
            }
            // check if server is already running
            if (Server._server) {
                Common_1.default.info(`Sync server already listening on port ${Server._port}`);
                return Server._port;
            }
            else {
                Server._server = http.createServer(Server._handleRequest);
                // setting socket time out to 0 to disable (default was 2 mins)
                Server._server.timeout = 0;
                try {
                    yield prify(cb => Server._server.listen(port, '0.0.0.0', cb));
                }
                catch (err) {
                    Server._port = null;
                    Server._server = undefined;
                    throw err;
                }
                Server._port = Server._server.address().port;
                return Server._port;
            }
        });
    }
    static stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (Server._server) {
                Server._server.close();
                Server._server = undefined;
                const port = Server._port;
                Server._port = null;
                return `Server closed on port ${port}`;
            }
            throw new Error('No server to close');
        });
    }
    // function which handles requests and send response
    static _handleRequest(req, res) {
        // only handling POST requests
        if (req.method !== 'POST') {
            return;
        }
        switch (req.url) {
            case URLUPLOAD: {
                Server._upload(req, res);
                break;
            }
            case URLDELETE: {
                Server._delete(req, res);
                break;
            }
            case URLCHECKSUM: {
                Server._getChecksum(req, res);
                break;
            }
            case URLCLOSE: {
                Server._closeServer(req, res);
                break;
            }
            case URLPING: {
                Server._pingServer(req, res);
                break;
            }
            case URLTESTSIZE: {
                Server._testSize(req, res);
                break;
            }
            default: {
                Server._sendStatus(res, HttpStatus.NOT_FOUND);
                break;
            }
        }
    }
    static _readJSONBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
    static _writeStatus(res, httpStatus, contentType) {
        res.writeHead(httpStatus, HttpStatus.getStatusText(httpStatus), { 'Content-Type': contentType });
    }
    static _sendStatus(res, httpStatus) {
        Server._writeStatus(res, httpStatus, 'text/plain');
        res.end();
    }
    static _sendResponse(res, httpStatus, obj) {
        Server._writeStatus(res, httpStatus, 'application/json');
        res.write(JSON.stringify(obj));
        res.end();
    }
    static _getChecksum(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let stringifiedChecksums;
            const checksumsFile = path.resolve(Server._uploadDir, Common_1.CHECKSUMS_FILE);
            try {
                if (yield prify(cb => fs.exists(checksumsFile, cb), false)) {
                    stringifiedChecksums = yield prify(cb => fs.readFile(checksumsFile, 'utf-8', cb));
                }
            }
            catch (err) {
                Common_1.default.warn(`Problem reading ${Common_1.CHECKSUMS_FILE}`, err);
            }
            if (!stringifiedChecksums) {
                try {
                    const details = yield Common_1.default.getAllFileDetails(Server._uploadDir);
                    stringifiedChecksums = JSON.stringify(details);
                }
                catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.write(JSON.stringify(err.toString()));
                    return res.end();
                }
            }
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': stringifiedChecksums.length,
            });
            res.write(stringifiedChecksums);
            res.end();
        });
    }
    static _setOwnership(directory, owner) {
        return __awaiter(this, void 0, void 0, function* () {
            if (owner) {
                const parentDir = path.normalize(path.join(directory, '..'));
                const dirToSet = path.basename(parentDir).startsWith('@')
                    ? parentDir
                    : directory;
                try {
                    yield prify(cb => exec(`chown -R ${owner}:wheel ${dirToSet}`, cb));
                    Common_1.default.info(`Ownership set to ${owner}:wheel`);
                }
                catch (err) {
                    Common_1.default.info(`Error setting ownership to ${owner}:wheel`, err);
                    throw err;
                }
            }
        });
    }
    static _upload(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            Common_1.default.info('Receiving upload...');
            let startTime = Date.now();
            const checksumsFile = path.resolve(Server._uploadDir, Common_1.CHECKSUMS_FILE);
            try {
                if (yield prify(cb => fs.exists(checksumsFile, cb), false)) {
                    yield prify(cb => fsExtra.remove(checksumsFile, cb));
                }
            }
            catch (err) {
                Common_1.default.warn(`Problem deleting ${Common_1.CHECKSUMS_FILE}`, err);
            }
            const { bytes, compressed } = yield Server._untar(req, Server._uploadDir);
            yield Server._setOwnership(Server._uploadDir, Server._setOwner);
            Common_1.default.info(`\ttook ${(Date.now() - startTime) / 1000} secs`);
            Common_1.default.info(`\t${bytes} bytes uploaded (${compressed} compressed)`);
            res.writeHead(204, "OK", { 'Content-Type': 'text/plain' });
            res.end();
        });
    }
    static _untar(stream, directory) {
        return __awaiter(this, void 0, void 0, function* () {
            yield prify(cb => fsExtra.ensureDir(directory, cb));
            let sizeMeter = new Meter();
            let compressedMeter = new Meter();
            // all dirs and files should be readable
            let extractOpts = { dmode: 0o750, fmode: 0o640 };
            try {
                yield prify(cb => stream.pipe(compressedMeter)
                    .pipe(zlib.createGunzip())
                    .pipe(sizeMeter)
                    .pipe(tarFs.extract(directory, extractOpts))
                    .on('finish', cb)
                    .on('error', err => {
                    Common_1.default.info('problem with POST stream', err);
                    throw err;
                }));
            }
            catch (err) {
                Common_1.default.info('Problem extracting tar stream', err);
                throw err;
            }
            return { bytes: sizeMeter.bytes, compressed: compressedMeter.bytes };
        });
    }
    static _delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            Common_1.default.info('Receiving delete request...');
            let startTime = Date.now();
            let data;
            try {
                data = yield Server._readJSONBody(req);
            }
            catch (error) {
                return Server._sendResponse(res, HttpStatus.BAD_REQUEST, 'Invalid delete request. Request body is not valid JSON');
            }
            const checksumsFile = path.resolve(Server._uploadDir, Common_1.CHECKSUMS_FILE);
            try {
                if (yield prify(cb => fs.exists(checksumsFile, cb), false)) {
                    yield prify(cb => fsExtra.remove(checksumsFile, cb));
                }
            }
            catch (err) {
                Common_1.default.warn(`Problem deleting ${Common_1.CHECKSUMS_FILE}`, err);
            }
            try {
                yield Parallel.each(data.deleteList, (file) => __awaiter(this, void 0, void 0, function* () {
                    const filePath = path.resolve(Server._uploadDir, file);
                    yield prify(cb => fsExtra.remove(filePath, cb));
                }), { concurrency: 5 });
            }
            catch (err) {
                Common_1.default.info('Error executing deletes', err);
                return Server._sendStatus(res, HttpStatus.INTERNAL_SERVER_ERROR);
            }
            Server._sendStatus(res, HttpStatus.OK);
            Common_1.default.info('\ttook ' + (Date.now() - startTime) / 1000 + ' secs');
        });
    }
    static _closeServer(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const msg = yield Server.stop();
                Common_1.default.info(msg);
                Server._sendResponse(res, HttpStatus.OK, msg);
            }
            catch (err) {
                Common_1.default.info(err);
                Server._sendResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, err);
            }
        });
    }
    static _pingServer(req, res) {
        Server._sendStatus(res, HttpStatus.NO_CONTENT);
    }
    static _testSize(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Server._sizeLimit === 0) {
                Server._sendStatus(res, HttpStatus.OK);
                return;
            }
            let body;
            try {
                body = yield Server._readJSONBody(req);
            }
            catch (err) {
                console.error(err);
                Server._sendResponse(res, HttpStatus.BAD_REQUEST, {
                    Status: 'ERROR',
                    Message: 'Invalid testsize request. Request body is not valid JSON',
                });
            }
            const clientDirSize = body.size;
            console.log(`source directory size ${clientDirSize}`);
            try {
                const parentDirSize = yield Common_1.default.getTotalPathSize(path.join(Server._uploadDir, '..'));
                console.log(`total directory size ${parentDirSize}`);
                const targetDirSize = yield Common_1.default.getTotalPathSize(Server._uploadDir);
                console.log('target directory size', targetDirSize);
                const notTargetDirSize = parentDirSize - targetDirSize;
                console.log('outside target dir size', notTargetDirSize);
                const totalSizeIfSynced = notTargetDirSize + clientDirSize;
                console.log('total directory size if synced', totalSizeIfSynced);
                console.log('size limit', Server._sizeLimit);
                Server._sendStatus(res, totalSizeIfSynced <= Server._sizeLimit
                    ? HttpStatus.OK
                    : HttpStatus.INSUFFICIENT_STORAGE);
            }
            catch (err) {
                console.error(err);
                Server._sendStatus(res, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        });
    }
}
Server._uploadDir = '.';
Server._setOwner = null;
Server._sizeLimit = 0;
exports.default = Server;

},{"./Common":4,"./PromiseUtils":6,"async-parallel":undefined,"child_process":undefined,"fs":undefined,"fs-extra":undefined,"http":undefined,"http-status-codes":undefined,"path":undefined,"stream-meter":undefined,"tar-fs":undefined,"zlib":undefined}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
class Stopper extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this._doStop = false;
    }
    stop() {
        this._doStop = true;
        this.emit('stop');
    }
    get doStop() {
        return this._doStop;
    }
    reset() {
        this.removeAllListeners();
        this._doStop = false;
    }
}
exports.default = Stopper;

},{"events":undefined}],9:[function(require,module,exports){
"use strict";
const API_1 = require("./API");
module.exports = API_1.default;

},{"./API":1}]},{},[9])(9)
});

//# sourceMappingURL=jibo-sync.js.map
