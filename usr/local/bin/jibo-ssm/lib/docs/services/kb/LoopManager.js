/** Synchronize the loop in the KB with the cloud, one-way.
 * Polls the cloud server in the background every 2 hours and
 * adds/removes/updates loop members as needed. Forces the loop to
 * match the cloud, all local loop changes will (eventually) be
 * overwritten by the LoopManager.
 *
 * Also informs the NLU and ASR services of all the names (and
 * associated ids) of the loop members upon startup, and again each
 * time anything in the loop changes.
 *
 * @class LoopManager
 * @param {string} httpUrl Url to the KB service
 * @param {boolean} [enableCloud=true] Enables the cloud checking. If
 * false, no cloud calls will be done. The NLU will still be informed
 * of the loop member names for whatever loop information is found
 * cached in the KB. The ASR service will *not* be informed.
 */

    /** Stop syncing and release the kb model.
     * @param {Function} callback Called when done
     * @method LoopManager#shutdown
     */

    /** Update account info locally and in the cloud.
     * Pauses cloud syncing, waits until any in-progress sycing is
     * finished, then updates the cloud and the local kb. Syncing is
     * then resumed.
     * @method LoopManager#accountUpdate
     * @param {object} params Account update parameters as defined by
     * jibo-server-clinet Account#update()
     * @param {function} callback Called when done
     */

    /** Update phoneticName locally and in the cloud.  Pauses cloud
     * syncing, waits until any in-progress sycing is finished, then
     * updates the cloud and the local kb. Syncing is then resumed.
     * @method LoopManager#loopUpdatePhoneticName
     * @param {object} params updatePhoneticName parameters as defined by
     * jibo-server-clinet Loop#updatePhoneticName()
     * @param {function} callback Called when done
     */

    /** Update enrollment flags locally and in the cloud.
     * Pauses cloud syncing, waits until any in-progress sycing is
     * finished, then updates the cloud and the local kb. Syncing is
     * then resumed.
     * @method LoopManager#loopSetEnrollment
     * @param {object} params Enrollment parameters as defined by
     * jibo-server-clinet Loop#setEnrollment()
     * @param {function} callback Called when done
     */

    /** Suspends the loop in the cloud.
     * Pauses cloud syncing, waits until any in-progress sycing is
     * finished, then updates the cloud and the local kb. Syncing is
     * then resumed.
     * @method LoopManager#loopSuspend
     * @param {object} params Enrollment parameters as defined by
     * jibo-server-clinet Loop#setEnrollment()
     * @param {function} callback Called when done
     */

    /** Check if the loop has a backup of the key.
     * @method LoopManager#hasKeyBackup
     * @param {object} params Enrollment parameters as defined by
     * jibo-server-clinet Loop#setEnrollment()
     * @param {function} callback Called when done
     */

    /** filter out kids whose parent/guardian has not accepted the agreement, aka 'pending'
     */