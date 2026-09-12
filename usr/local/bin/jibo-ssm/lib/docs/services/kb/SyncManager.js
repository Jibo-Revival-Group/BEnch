/** Base class for the syncing managers (Loop, Media, Holidays...).
 *
 * @class SyncManager
 * @param {string} httpUrl Url to the KB service
 */

    /** Stop syncing.
     * @method SyncManager#shutdown
     * @param {Function} callback Called when done
     */

    /** Make sure the credentials have been set once. Use the system
     * manager to get the credentials and init the JSC with them.
     */

    /** Register for notifications events with the given
     * eventName. Sync with the cloud when that notification is
     * triggered.
     */

    /** Starts the cloud syncing process. Schedules it to happen every
     * `syncingPeriod` milliseconds. While cloud sycing is happening,
     * routines that are wrapped by `_notDuringSyncing()` are queued up
     * to be executed once syncing has finished.
     * @param {boolean} quietly Optional parameter to suppress initial message
     */

    /** Sync as soon as possible.
     */

    /** Finish a periodic sync cycle and schedule the next one.
     */

    /** Stop the timer for the next upcoming cloud sync
     */

    /** Reschedule the timer for cloud syncing
     */

    /** Make the target object match the source object based in the
     * given list of fields. Any other fields in the terget are left
     * alone. An optional list of fields to be renamed on the target
     * can be provided.
     */

    /** Make the target object match the source object strictly. Any
     * fields on the target object that are not on the source object
     * will be removed.
     */

    /** Fetch a service registry record by name.
     */

    /** Check the status code of an HTTP call and generate an error
     * object if it is not in the 2xx range.
     */

    /** Compare two values and see if they match. Recursively checks
     * child objects and array members too.
     */

    /** Issue an error once. Keep track of the error strings issued so
     * we won't repeat an error message if it exactly matches a
     * previous error.
     *
     * Since some managers try to sync in the background as frequently
     * as every 15 seconds, we don't want to overload the logs with
     * repeating messages when there is something wrong with the
     * server or account.
     *
     * param {string} errorMessage The error string to issue or suppress
     * @private
     */

    /** Start the slow cloud call watch timer.
     */

    /** Finish the slow cloud call watch timer and report if it
     * took too long.
     */

    /** Determine if we are running on the robot or in the simulator.
     *
     * @returns {boolean} `true` if on robot.
     * @private
     */