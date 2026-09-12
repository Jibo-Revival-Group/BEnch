    /**
     * Final Speed summary
     */

        /**
         * download bandwidth in megabits per second
         */

        /**
         * upload bandwidth in megabits per second
         */

        /**
         * unadjusted download bandwidth in bytes per second
         */

        /**
         * unadjusted upload bandwidth in bytes per second
         */

    /**
     * Client info (from the robot)
     */

        /**
         * ip of client
         */

        /**
         * latitude of client
         */

        /**
         * longitude of client
         */

        /**
         * client's isp
         */

        /**
         * some kind of rating
         */

        /**
         * another rating, which is always 0 it seems
         */

        /**
         * avg download speed by all users of this isp in Mbps
         */

        /**
         * same for upload
         */

    /**
     * Server info (who we test against)
     */

        /**
         * test server url
         */

        /**
         * latitude of server
         */

        /**
         * longitude of server
         */

        /**
         * name of a location, usually a city, but can be anything
         */

        /**
         * name of the country
         */

        /**
         * country code
         */

        /**
         * who pays for the test server
         */

        /**
         * distance from client to server (SI)
         */

        /**
         * distance from client to server (Imperial)
         */

        /**
         * how long it took to download a small file from the server, in ms
         */

        /**
         * the id of the server
         */

/**
 * Options to use in SpeedTest constructor
 */

    /**
     * The proxy for upload or download, support http and https (example : "http://proxy:3128")
     */

    /**
     * The maximum length of a single test run (upload or download)
     */

    /**
     * The number of close servers to ping to find the fastest one
     */

    /**
     * The number of servers to run a download test on. The fastest is used for the upload test and the fastest result is reported at the end.
     */

    /**
     * Headers to send to speedtest.net
     */

    /**
     * (Visual only) Pass a truthy value to allow the run to output results to the console in addition to showing progress, or a function to be used instead of console.log.
     */

    /**
     * ID of the server to restrict the tests against.
     */

    /**
     * URL to obtain the list of servers available for speed test. (default: http://www.speedtest.net/speedtest-servers-static.php)
     */