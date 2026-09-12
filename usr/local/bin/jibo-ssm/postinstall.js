"use strict";
const download = require('@jibo/parser-download');

// Download the parser
// is this is needed to internally hoist the SSM
const options = {
    version: '2.4.0',
    type: '50',
    rename: true,
    verbose: process.argv.indexOf('-v') > -1,
};
download(options, err => {
    if (err) {
        console.error(err);
    }
});
