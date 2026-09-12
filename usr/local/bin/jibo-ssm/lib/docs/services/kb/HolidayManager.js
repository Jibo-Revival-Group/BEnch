/**
 * @description Synchronize the holiday list in the cloud with a copy in the
 * KB. Syncing is one-way. Polls the cloud server in the background
 * every 6 hours and adds/removes/updates the holiday kb slice as
 * needed. Forces the local copy to match the cloud, all local changes
 * will (eventually) be overwritten by what is in the cloud.
 *
 * @class HolidayManager
 * @param {string} httpUrl Url to the KB service
 * @param {boolean} [enableCloud=true] Enables the cloud checking. If false, no cloud calls will be done.
 */