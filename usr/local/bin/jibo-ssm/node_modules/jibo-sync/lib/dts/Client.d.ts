export default class Client {
    static sync(url: string, directory: string, force: boolean, verbose: boolean, external: boolean): Promise<string>;
    private static _getClientList(directory, force, verbose, external);
    /**
     * Stage files for syncing. This copies all the files to a .staged folder
     * within the current project and then yarn installs only the production files
     * any symlinked dependencies are also copied.
     *
     * @param  {string} directory  Path of package to search
     * @param  {boolean} force If true, run full search, don't used cached file
     * @param  {boolean} verbose    If true, print extra debug information
     * @param  {boolean} external    If true, force external dependencies
     * @return {Promise}            Array of packages
     */
    private static _stageFiles(directory, force, verbose, external);
    private static _getUpdateList(clientList, serverList);
    private static _sync(host, port, directory, deletes, updates, updateSize);
    private static _delete(host, port, deletes);
    private static _update(host, port, updates, directory, updateSize);
}
