/**
 * A class for handling OTA checking, downloading and installing.
 *
 * @class OTAUpdater
 * @private
 */

    /**
     * Requests a backup of robot files. This call implies immediate callback
     * return and user is required to check backup-status to know if backup completed.
     * (Errors are stored in KB.)
     * @param {Function} callback Function
     */

    /**
     * Checks for OTA updates with given filter
     * @param {Function} callback Function
     */

    /**
     * Triggers a backup, an OTA download and install if packages exist.
     * @param {Function} callback Function
     */

    /**
     * Log backup error
     * @returns {boolean}
     */

    /**
     * Backup helper
     * @param {Function} callback Function
     */

    /**
     * Checks if current environment is ready to start backup/OTA (download or installation).
     * @param {Function} callback Function
     */