/** Synchronize the media list in the cloud with a copy in the
 * KB. Syncing is one-way. Polls the cloud server in the background
 * once a minute adds/removes/updates the media kb slice as
 * needed. Forces the local copy to match the cloud, all local changes
 * will (eventually) be overwritten by what is in the cloud.
 *
 * @class MediaListManager
 * @param {string} httpUrl Url to the KB service
 * @param {boolean} [enableCloud=true] Enables the cloud checking. If
 * false, no cloud calls will be done.
 */

    /** Update the KB to reflect the cloud changes
     * from a photo stored with `jibo.media.storePhoto()`.
     * Currently just causes a full sync of the media list.
     * @method MediaListManager#storePhoto
     * @param {Function} [callback] Called when done.
     */

    /** Update the KB to reflect the cloud changes from deleting a
     * photo.  Currently just causes a full sync of the media list.
     * @method MediaListManager#deletePhoto
     * @param {Function} [callback] Called when done.
     */

    /** Server side version of `jibo.kb.media.downloadThumbnails()`.
     * Download a list of thumbnails to the local image store.
     * Downloads are stored via the media manager service, no local
     * update of the KB is needed.
     * @method MediaListManager#downloadThumbnails
     * @param {string[]} ids Array of thumnails Content IDs to download.
     * @param {string} mediaType Enumerated type of media.
     * @param {Function} [callback] Called when done.
     */

    /** Server side version of `jibo.kb.media.downloadPhoto()`.
     * Download a photo to the local image store.
     * Downloads are stored via the media manager service, no local
     * update of the KB is needed.
     * @method MediaListManager#downloadPhoto
     * @param {string} id Content ID of photo to download.
     * @param {string} mediaType Enumerated type of media.
     * @param {Function} [callback] Called when done.
     */