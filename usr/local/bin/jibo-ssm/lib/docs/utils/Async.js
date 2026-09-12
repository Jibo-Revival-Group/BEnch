    /**
     * Turns a node style callback into an async Promise. For example
     * ```
     * import fs = require('fs');
     * async function getContents(path:string):Promise<string> {
     *      const contents:string = await Async.get<string>(cb => fs.readFile(path, cb));
     *      return contents;
     * }
     * ```
     */

    /**
     * Turns a function with a callback into an async Promise. The difference is that
     * this callback does not expect a node style callback like `(error:Error, data:T) => void`.
     * Instead it expects `(data:T) => void`.
     */

    /**
     * Same a Promise.all, except it will only run a max number of promises
     * in parallel at a time. This is useful for CPU heavy operations.
     * @param  {Promise[]} promises The array of promises
     * @param  {number}         max      Max number of promises that can be run in parallel.
     * @return {Promise[]}          An array of results.
     */