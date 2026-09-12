    /**
     * Use to trigger a manual close originating from robot (i.e. head touch exit, inactivity timeout)
     * @param code 
     * @param reason 
     */

    /**
     * Use for manual clean up, unlike close does not provide websocket with close code or reason
     */

    /**
     * send messages along the external websocket
     * @param message 
     */

    /**
     * Used by SCS (Security Controller Service) to signal a new connection is coming in
     * Method decides if connection attempt is OK and replies with response
     */

    /**
     * Handler for WebSocket.Server 'connection' event
     * Stores the given WebSocket and adds handlers for its events
     * @param ws 
     */

    /**
     * Handler for 'message' emit from webSocket connecting to SCS
     * @param code 
     */

    /**
     * Handler for 'close' emit from webSocket connecting to SCS
     * Checks code to determine if close was purposeful or in error, calls cleanup which closes connections
     * @param {number} code - a 1000 indicate a purposeful close, anythig else will be considered as a close due to error
     */

    /**
     * Clears heartbeat interval, emits `disconnected`, removes listeners and closes sockets and servers connect to SCS
     * @param isNormal 
     */