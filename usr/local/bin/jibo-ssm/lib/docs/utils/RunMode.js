    /**
     * Enum of RunMode types.
     *
     * ```
     * jibo.RunMode.SIMULATOR
     * ```
     *
     * @typedef module:jibo.Runtime#RunMode
     * @prop {string} SIMULATOR Running in the simulator.
     * @prop {string} REMOTELY Running in remote mode.
     * @prop {string} ON_ROBOT Running on the robot.
     * @prop {string} UNIT_TESTS Running in dev mode, no SSM.
     */

        /** Running in the simulator. */

        /** Running in remote mode. */

        /** Running on the robot. */

        /** Running in dev mode, no SSM */

    /**
     * Stores which mode the current skill is running. It can be: `jibo.RunMode.SIMULATOR`, `jibo.RunMode.REMOTELY`, or `jibo.RunMode.ON_ROBOT`.
     *
     * ```
     * let jibo = require('jibo');
     * if( jibo.runMode === jibo.RunMode.SIMULATOR ){
     *   // ...
     * }
     * ```
     * @name module:jibo.Runtime.runMode
     * @type {RunMode}
     * @readOnly
     */