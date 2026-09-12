/**
 * Parse in a way that is guaranteed to return either a value or undefined
 * @param  text     String to parse from
 * @param  regex    RegEx to parse with, or null to skip parsing
 * @param  cb       Callback to apply with results
 *
 * @return          Result of callback or undefined
 * @throws          NoThrow
 */