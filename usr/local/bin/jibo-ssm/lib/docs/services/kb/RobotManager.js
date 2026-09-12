/**
 * @description Synchronize the robot properties in the cloud with a
 * copy in the KB. Syncing is one-way. Polls the cloud server in the
 * background every 6 hours and adds/removes/updates the robot kb
 * slice as needed. Forces the local copy to match the cloud, all
 * local changes will (eventually) be overwritten by the cloud.
 *
 * @class RobotManager
 * @param {string} httpUrl Url to the KB service
 * @param {boolean} [enableCloud=true] Enables the cloud checking. If false, no cloud calls will be done.
 */