/**
 * A class for delaying a call through the application, instead of relying on setInterval() or
 * setTimeout().
 *
 * @class DelayedCall
 * @param {function} callback The function to call when the delay has completed.
 * @param {int} delay The time to delay the call, in milliseconds (or optionally frames).
 * @param {Object|Boolean} [options=false] The options to use or repeat value.
 * @param {Boolean} [options.repeat=false] `true` if the DelayedCall should automatically repeat itself when
 *                              completed.
 * @param {Boolean} [options.autoDestroy=true] `true` if the DelayedCall should clean itself up when completed.
 * @param {Boolean} [options.useFrames=false] `true` if the DelayedCall should use frames instead of
 *                                 milliseconds for the delay.
 */

        /**
         * The root timer.
         * @private
         * @type {Timer}
         * @name DelayedCall#parent
         */

        /**
         * The function to call when the delay is completed.
         * @private
         * @type {function}
         * @name  DelayedCall#_callback
         */

        /**
         * The delay time, in milliseconds.
         * @private
         * @type {int}
         * @name  DelayedCall#_delay
         */

        /**
         * The timer counting down from _delay, in milliseconds.
         * @private
         * @type {int}
         * @name  DelayedCall#_timer
         */

        /**
         * `true` if the DelayedCall should repeat itself automatically.
         * @private
         * @type {Boolean}
         * @name  DelayedCall#_repeat
         * @default false
         */

        /**
         * `true` if the DelayedCall should destroy itself after completing
         * @private
         * @type {Boolean}
         * @name  DelayedCall#_autoDestroy
         * @default true
         */

        /**
         * `true` if the DelayedCall should use frames instead of milliseconds for the delay.
         * @private
         * @type {Boolean}
         * @name  DelayedCall#_useFrames
         * @default false
         */

        /**
         * `true` if the DelayedCall is currently paused (not stopped).
         * @private
         * @type {Boolean}
         * @name  DelayedCall#_paused
         */

    /**
     * The callback supplied to the Application for an update each frame.
     * @private
     * @method  DelayedCall#update
     * @param {int} elapsed The time elapsed since the previous frame.
     */

    /**
     * Restarts the DelayedCall, whether it is running or not.
     * @method  DelayedCall#restart
     */

    /**
     * Stops the DelayedCall, without destroying it.
     * @method  DelayedCall#stop
     */

    /**
     * `true` if enabled for updates, `false` otherwise.
     * @private
     * @type {Boolean}
     * @name DelayedCall#enabled
     */

    /**
     * `true` if the DelayedCall is paused, `false` otherwise.
     * @type {Boolean}
     * @name  DelayedCall#paused
     */

    /**
     * Stops and cleans up the DelayedCall. Do not use it after calling.
     * @method  DelayedCall#destroy
     */