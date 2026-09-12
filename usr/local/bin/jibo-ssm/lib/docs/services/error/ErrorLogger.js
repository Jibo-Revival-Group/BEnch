    /**
     * @param log {Log} the logger to use when an error gets added or removed
     */

    /**
     * @param errors {Array<JiboError>} an array of errors to add. only unique errors are added
     * @return {boolean} true if any of the errors in the array are added, false otherwise
     */

    /**
     * @param error {JiboError} the error to add. it will only be added if it has not already been added or had been previously removed
     * @return {boolean} true if the error was successfully added, false otherwise
     */

    /**
     * @param errors {Array<JiboError>} an array of errors to remove
     * @return {boolean} true if any of the errors in the array have been removed, false otherwise
     */

    /**
     * @param error {JiboError} the error to remove.
     * @return {boolean} true if the error was successfully removed (if it was present in the first place), false otherwise
     */

    /**
     * @param error {JiboError} the error to search for
     * @return {boolean} true if the error is currently registered. false otherwise
     */