export declare const USE_CHECKSUM: boolean;
export declare const CHECKSUMS_FILE = ".checksums";
export interface FileDetails {
    timestamp: string;
    checksum: string;
    size: number;
}
export interface FileDetailsMap {
    [fileName: string]: FileDetails;
}
export interface Logger {
    debug(...args: any[]): any;
    log?(...args: any[]): any;
    info(...args: any[]): any;
    warn(...args: any[]): any;
    error(...args: any[]): any;
}
export default class Common {
    private static _verboseLog;
    private static _start;
    private static _logger;
    static getHostPort(url: string): {
        host: string;
        port: number;
    };
    static setLogger(logger: Logger): void;
    static setVerbose(enable?: boolean): void;
    static debug(...args: any[]): void;
    static info(...args: any[]): void;
    static warn(...args: any[]): void;
    static error(...args: any[]): void;
    static startTimer(str: any): void;
    static endTimer(): void;
    static getAllFileDetails(directory: string): Promise<FileDetailsMap>;
    static getTotalFileSize(files: string[]): Promise<number>;
    static getTotalPathSize(path: string): Promise<number>;
    private static _getFileDetails(filename);
    private static _existsAndDir(filePath);
    private static _dirsOnly(filesAndDirs);
    private static _existsAndFile(filePath);
    private static _filesOnly(filesAndDirs);
    private static _findFilesRecursive(dir);
}
