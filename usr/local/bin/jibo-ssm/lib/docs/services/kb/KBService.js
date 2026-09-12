    /**
     * Sets up a handler that captures any incoming HTTP requests. Normally, the calling of next()
     * will allow the requests to go on to their proper handlers, such as the POST routes. Sometimes,
     * we want to delay this, in order to give an operation time to finish. This takes advantage of
     * the "middleware"/"connect" feature of Node.js
     *
     * There are two basic types of requests, regular and backup/restore. Regular requests *can*
     * defer backup/restore requests, but don't have to. Backup/restore requests will always defer
     * both regular requests and other backup/restore requests. A blocking operation must set
     * a semaphore for each request type to be deferred.
     */

    /** Unload a given kb slice from memory and remove it from disk.
     * Also removes any sub-kbs inside this slice. For example, if you
     * remove '/jibo', that would also remove '/jibo/loop', '/jibo/settings'
     * and all other kb slices under '/jibo'.
     */

    /** Unload all kb slices from memory, stop the Loop Manager, and
     * delete the ENTIRE KNOWLEDGEBASE!
     */

    /**
     * Overrides onBackupRequest() method in HTTPService. Backs up all knowledge
     * base files into tar archives, which goes into the appropriate backup
     * folder.
     *
     * @method KBService#onBackupRequest
     * @param req {JiboServerRequest} request to service
     * @param res {JiboServerResponse} response to send from service.
     * @protected
     */

    /**
     * Overrides onRestoreRequest() method in HTTPService. Restores all knowledge
     * base files from tar archive into KB's data folder
     *
     * @method KBService#onRestoreRequest
     * @param req {JiboServerRequest} request to service
     * @param res {JiboServerResponse} response to send from service.
     * @protected
     */

    /**
     * Overrides onWipeRequest() method in HTTPService. Wipes the data of the KB
     * service.
     *
     * @method KBService#onWipeRequest
     * @param req {JiboServerRequest} request to service
     * @param res {JiboServerResponse} response to send from service.
     * @protected
     */

    /**
     * This is a function for testing purposes. If 'timer' value is provided
     * with the JSON data, the fake "operation" here will take that long to
     * finish before sending back a 204 code.
     *
     * @param  {JiboServerRequest}  req request to service
     * @param  {JiboServerResponse} res response to send from service
     */

    /** Continue all the requests that were pending while we were
     * initing the kb slice.  The first call in the queue is the
     * initial request that started the whole process.
     */

    /**
     * If semaphore is set for an incoming request of a certain type, requests of
     * that type won't be run until the semaphore is lowered again. Instead, they'll
     * be queued up.
     * @param  {number}  type Type of requests to block
     * @param  {boolean} val  true to set semaphore; false to clear
     * @return {boolean}      false if semaphore was already set
     */

    /**
     * Run any blocked requests, if their semaphores have been lowered. It's
     * possible that running a deferred request will raise the semaphore again,
     * so this will be taken into account.
     *
     * Important: this is a reentrant method
     */

    /**
     * Remove all request entries that have been handled. This can't be done in
     * _processBlockedRequests() because that function is reentrant.
     */