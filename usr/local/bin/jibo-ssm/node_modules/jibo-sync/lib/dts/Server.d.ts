/// <reference types="node" />
import http = require('http');
import { Logger } from './Common';
export default class Server {
    static _server: http.Server;
    static _port: number;
    static _uploadDir: string;
    static _setOwner: any;
    static _sizeLimit: number;
    static start(port: number, dest: string, setOwner: string, sizeLimit: number, verbose?: boolean, logger?: Logger): Promise<number>;
    static stop(): Promise<string>;
    private static _handleRequest(req, res);
    private static _readJSONBody<T>(req);
    private static _writeStatus(res, httpStatus, contentType);
    private static _sendStatus(res, httpStatus);
    private static _sendResponse(res, httpStatus, obj);
    private static _getChecksum(req, res);
    private static _setOwnership(directory, owner);
    private static _upload(req, res);
    private static _untar(stream, directory);
    private static _delete(req, res);
    private static _closeServer(req, res);
    private static _pingServer(req, res);
    private static _testSize(req, res);
}
