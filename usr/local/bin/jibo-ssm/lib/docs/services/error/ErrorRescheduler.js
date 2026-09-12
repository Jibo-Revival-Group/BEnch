    /**
     * returns an array representation of all present JiboError objects
     *
     * @return {Array<JiboError>} an array of all present JiboError objects
     */

    /**
     * A method to check for the presence of an error by id
     *
     * @param errorId {string} the error to search for
     * @return {boolean} true if the error is present / false otherwise
     */

    /**
     * Add an error associated with a callback which is called based on the error's repeatTime property
     *
     * @param error {JiboError} the error add
     * @param rescheduleCallback {Function} the method which is called after the error's repeatTime has passed from now
     * @return {boolean} true if the error has been successfully added to the rescheduler / false otherwise
     */

    /**
     * Remove the error from the rescheduler which prevents the callback from being called
     *
     * @param errors {Array<JiboError>} an array with the the errors to add
     * @return {boolean} true if at least one error has been successfully removed from the rescheduler / false otherwise
     */

    /**
     * @param errorId {string} the errorId for the error to remove
     * @return {boolean} true if at least one error has been successfully removed from the rescheduler / false otherwise
     */