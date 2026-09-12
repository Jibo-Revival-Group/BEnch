/**
 * @description
 * Handles the update loop and timing events.
 * ```
 * let jibo = require('jibo');
 * jibo.timer.on('update', (elapsed) => {
 *     // do update
 * });
 * ```
 * @class Timer
 */

    /**
     * Fires when timer pause state changes.
     * @event Timer#pause
     * @param {boolean} pause true if currently paused, false if resumed from stop.
     */

    /**
     * Fires when sound is resumed.
     * @event Timer#resumed
     */

    /**
     * Fires when sound is paused.
     * @event Timer#paused
     */

    /**
     * Fires every requestAnimationFrame. Should be considered
     * the main update "loop." All skills should use this for frame updates.
     * @event Timer#update
     * @param {int} elapse The time in milliseconds since the last frame update.
     */

    /**
     * Starts the update loop.
     * @method Timer#start
     */

    /**
     * Stops the update loop.
     * @method Timer#stop
     */

    /**
     * Updates loop callback.
     * @method Timer#update
     * @private
     */

    /**
     * Pauses loop callback.
     * @name Timer#paused
     * @type {Boolean}
     * @readOnly
     */

    /**
     * Works just like `window.setTimeout` but respects the pause.
     * state of jibo.timer.
     * @method  Timer#setTimeout
     * @param {Function} callback    The callback function, passes one argument which is the DelayedCall instance.
     * @param {int}   delay       The time in milliseconds or the number of frames (useFrames must be true).
     * @param {Boolean}   [useFrames=false]   If the delay is frames (true) or milliseconds (false).
     * @param {Boolean}   [autoDestroy=true] If the DelayedCall object should be destroyed after completing.
     * @return {DelayedCall} The object for pausing, restarting, destroying etc.
     */

    /**
     * Works just like `window.setInterval` but respects the pause.
     * state of jibo.timer.
     * @method  Timer#setInterval
     * @param {Function} callback    The callback function, passes one argument which is the DelayedCall instance.
     * @param {int}   delay       The time in milliseconds or the number of frames (useFrames must be true).
     * @param {Boolean}   [useFrames=false]   If the delay is frames (true) or milliseconds (false).
     * @return {DelayedCall} The object for pausing, restarting, destroying etc.
     */

    /**
     * Destroys the timer object.
     * @method Timer#destroy
     * @private
     */