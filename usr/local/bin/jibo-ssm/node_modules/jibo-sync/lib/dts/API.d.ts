import Command from './Command';
import { Logger } from './Common';
/**
 * Options for the API.uploadToServer method
 * @interface UploadOptions
 */
export interface UploadOptions {
    /**
     * The URL to which to connect
     * @name UploadOptions~url
     * @type {string}
     */
    url: string;
    /**
     * Directory to upload
     * @name UploadOptions~dir
     * @type {string}
     */
    dir: string;
    /**
     * Whether or not to auto-close when completed
     * @name UploadOptions~close
     * @type {boolean}
     */
    close?: boolean;
    /**
     * Whether or not to force regenerating sync ignores
     * @name UploadOptions~force
     * @type {boolean}
     */
    force?: boolean;
    /**
     * Whether or not to enable verbose debugging
     * @name UploadOptions~verbose
     * @type {boolean}
     */
    verbose?: boolean;
    /**
     * Whether or not to fetch dependencies externally from npm
     * @name UploadOptions~external
     * @type {boolean}
     */
    external?: boolean;
}
/**
 * The API exposed by the jibo-sync NPM package
 * @class API
 */
export default class API {
    /**
     * Expose the Command class, so library users can use it
     * @name API.Command
     * @type {typeof}
     * @static
     */
    static readonly Command: typeof Command;
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
    static createServer(port: number, dest: string, user: string, limit: number, verbose?: boolean, logger?: Logger): Promise<number>;
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
    static uploadToServer(options: UploadOptions): Promise<string>;
    /**
     * Close the server port
     * @method API.closeServer
     * @static
     * @param {string} url The URL of the server to close
     * @return {string} An informative message
     */
    static closeServer(url: string): Promise<string>;
    /**
     * Call this to stop an in-progress upload
     * @method API.stop
     * @static
     */
    static stop(): void;
}
