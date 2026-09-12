/** Only execute a function once for multiple closely spaced
 * trigger events.  Triggers closer than `debouncePeriod`
 * milliseconds together will resolve to one execution of the
 * function, unless `debounceMaxSpan` milliseconds is exceeded in
 * which case the function will be executed anyways (a fail safe
 * in case there is an endless stream of closely spaced trigger
 * events).
 */