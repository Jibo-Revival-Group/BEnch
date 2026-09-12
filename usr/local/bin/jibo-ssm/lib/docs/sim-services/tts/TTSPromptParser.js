/**
 * @class TTSPromptParser
 */

    /**
     * Parses SSML input text.
     * Produces simple text output and simulated token times
     * Token times include wait caused by <break> tags
     * @param {string} text Input text (optionally SSML)
     * @returns {Array} first element is the simple prompt, second is the token list
     * @method TTSPromptParser#createPromptAndTokens
     */

    /**
     * Extracts space delimited word tokens from clean text
     * @param {string} text
     * @param {number} [startTime=0]
     * @param {Token[]} [tokens=[]]
     * @returns {Array} end time and tokens
     * @method TTSPromptParser#_extractWordTokens
     */

    /**
     * Extracts clean text from xml tree
     * @param {Object} xmlNode
     * @returns {Array} prompt and tokens
     * @method TTSPromptParser#_extractTextFromXML
     */