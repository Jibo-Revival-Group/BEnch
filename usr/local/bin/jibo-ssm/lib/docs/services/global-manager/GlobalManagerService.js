/**
 * @description
 * This class handles incoming requests to subscribe to global commands and manages
 * the state of those commands by accepting not only the command to which a skill
 * wants to subscribe and keeping track of all of the different global event stacks,
 * but also maintains knowledge of which skill subscribed to that global.
 * Because this service also handles relaunching and launching skills, at each skill
 * launch (or relaunch) it automatically unsubscribes that skill from the global event
 * stacks, so state is maintained across skill instances.
 * @class GlobalManagerService
 */

    /**
     * Map from global command to whether jibo can handle it
     * @type {Map<GlobalCommand, boolean>}
     * @readonly
     */

    /**
     * Event to let other parts of SSM know we have fired a skillRelaunch
     * @type {TypedEvent<jibo.jetstream.types.ListenResult>}
     * @readonly
     */

    /**
     * Event to let other parts of SSM know we have gotten a global event
     * @type {TypedEvent<jibo.jetstream.types.ListenResult>}
     * @readonly
     */

    /**
     * Given a global command, returns whether or not the jibo module has registered to handle it.
     * @param {GlobalCommand} command to query if jibo module has said it can handle
     * @returns {Boolean} returns whether or not the jibo module can handle the global command.
     * @private
     */

    /**
     * Parse out global command subscribers
     * @param req {JiboServerRequest} the request data to be processed.
     * @param res {JiboServerResponse} the response to send through WS.
     * @private
     */

    /**
     * Cleanly shut down listeners and kill the current skill and relaunch
     * @param req {JiboServerRequest} the request data to be processed.
     * @param res {JiboServerResponse} the response to send through WS.
     * @private
     */

    /**
     * Wrapper to create a return type
     * @param status {string} status of response
     * @param message {string} accompanying message of response
     * @param id {string} listener id if applicable
     * @param data {data} result of web request
     * @private
     */