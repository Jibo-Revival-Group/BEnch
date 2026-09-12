/**
 * Structured results of process output
 */

/**
 * A description of how to update a status from a shell command.
 * @param T Type of status data
 */

    /**
     * chell command to execute
     */

    /**
     * Arguments of the shell command
     */

    /**
     * Additional options to use when creating the process (optional)
     * @see child_process.SpawnOptions
     */

    /**
     * Parser to convert the process output into structured results
     */

/**
 * Class for gathing status from an external CLI process. There are two kinds of
 * processes: fast and slow.
 * - Fast process: This takes a (relatively) small amount of time to run and
 *      is expected to quit on its own.
 * - Slow process: This is expected to run for as long as possible and will
 *      need to be killed to gather results.
 * @param {StatusDescriptor<T>} desc Description of how to update the status.
 */

    /**
     * Fetch the descriptor for this process.
     * @return Frozen copy of the descriptor
     */

    /**
     * Fetch the status returned from the process
     * @return Frozen copy of the stat
     */

    /**
     * Start the process. Don't use this unless you explicitly called stop() before.
     * @param desc [description]
     */

    /**
     * Stop the process if it is running.
     * @return  Did the process need to be killed?
     *          [true]  It was a slow process.
     *          [false] It was a fast process.
     */

    /**
     * Refresh the status. Return results of most recent run. Runs again before
     * returning if deemed fast enough.
     * @return {Promise<StatusResult<T>>} The parsed status.
     *
     */

    /**
     * Autoamtically update the status on some period.
     * @param seconds   Period between updates in seconds; minimum 1 second.
     *                  Less will cancel all updates.
     */