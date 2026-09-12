 /**
  * @class SkillsService
  * @extends HTTPWSService
  */

    /**
     * @method SkillsService#routes
     * @param {Router} url
     */

    /**
     * @method SkillsService#launch
     * @param skillName {string}
     * @param parse {any}
     * @param callback {function}
     */

    /**
     * Terminate currently running skill
     * @method SkillsService#terminate
     * @param [error] {Error}
     * @return string
     */

    /**
     * Called when a client sends a message over WebSocket
     * @param command {any}
     * @param client {WebSocket}
     * @method SkillsService#onMessage
     */

    /**
     * Overrides onWipeRequest() method in HTTPService. Wipes the data in the
     * skill users' home directories.
     *
     * @method SkillsService#onWipeRequest
     * @param req {JiboServerRequest} request to service
     * @param res {JiboServerResponse} response to send from service.
     * @protected
     */