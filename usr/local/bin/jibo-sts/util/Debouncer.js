"use strict";
//NOTE: This code copied from sdk/packages/skills-service-manager/src/utils/Debouncer.ts
Object.defineProperty(exports, "__esModule", { value: true });
/** Only execute a function once for multiple closely spaced
 * trigger events.  Triggers closer than `debouncePeriod`
 * milliseconds together will resolve to one execution of the
 * function, unless `debounceMaxSpan` milliseconds is exceeded in
 * which case the function will be executed anyways (a fail safe
 * in case there is an endless stream of closely spaced trigger
 * events).
 */
class Debouncer {
    /**
      @param {debouncePeriod} number
        The amount of time to wait for additional trigger events before executing.
      @param {debounceMaxSpan} number
        After this amount of time stop waiting and execute on the trigger anyways.
      @param {defaultFn} Function (optional)
        Default function to execute on a trigger event.
  
      Given a continuous stream of trigger events, effectively executes at a
      frequency of bounded between:
        Upper: (1 / debouncePeriod)
        Lower: (1 / debounceMaxSpan)
      */
    constructor(debouncePeriod, debounceMaxSpan, defaultFn) {
        this.debouncePeriod = debouncePeriod;
        this.debounceMaxSpan = debounceMaxSpan;
        this.fn = defaultFn;
    }
    trigger(fn) {
        fn = fn || this.fn;
        if (!fn) {
            throw new Error('no function given to debounce');
        }
        // if an async function is currently executing,
        // flip the flag that says we need to do it again
        // when it's finished (after the debounce period)
        if (this.inProcess) {
            this.triggerAgain = true; // execute() checks this when async fn is finished
        }
        else {
            // reset the timeout, we are going to cue it up again below
            this._clearTimeout();
            // compute how long we've been debouncing this series of bounces
            let elapsed = 0;
            if (!this.start) {
                this.start = Date.now();
            }
            else {
                elapsed = Math.round(Date.now() - this.start);
            }
            // check if this series has gone too long
            if (elapsed > this.debounceMaxSpan) {
                // been debouncing too long, execute
                this.start = 0;
                process.nextTick(() => {
                    // go!
                    this._execute(fn);
                });
            }
            else {
                // not too long yet, wait for bouncing to stop
                this.timeout = setTimeout(() => {
                    this.timeout = false;
                    this.start = 0;
                    // go!
                    this._execute(fn);
                }, this.debouncePeriod);
            }
        }
    }
    halt() {
        this._clearTimeout();
    }
    _execute(fn) {
        if (fn.length === 0) {
            // synchronous
            fn();
        }
        else {
            // asynchronous, must take a done() callback as first parameter
            this.inProcess = true;
            fn(() => {
                this.inProcess = false;
                if (this.triggerAgain) {
                    this.triggerAgain = false;
                    // note that you can't change the function on trigger again
                    this.trigger(fn);
                }
            });
        }
    }
    _clearTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = false;
        }
    }
}
exports.Debouncer = Debouncer;
exports.default = Debouncer;
