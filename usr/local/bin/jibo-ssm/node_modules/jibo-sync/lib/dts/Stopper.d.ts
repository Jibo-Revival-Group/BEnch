/// <reference types="node" />
import { EventEmitter } from 'events';
export default class Stopper extends EventEmitter {
    private _doStop;
    stop(): void;
    readonly doStop: boolean;
    reset(): void;
}
