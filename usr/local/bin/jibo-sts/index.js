"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SecureTransferService_1 = require("./service/SecureTransferService");
const path = require("path");
const events_1 = require("events");
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("./util/log");
const log = log_1.default.createChild('Process');
/** Get the STS up and running

The Secure Transfer Service (STS) basically only does two things:

1) Initializing itself; this means acquiring FOUR things (in order):
  1.1) Credentials: These come from OOBE and should always be on a normal
    mode robot. It is needed to make any JSC (server) API call
  1.2) LoopID: This is the account identifier and is need to talk to others in
    the loop and to make JSC API calls
  1.3) KeyPair: This is a public/private key used for encrypted communication
  1.4) SymmetricKey: (aka UGC Key) This is used to encrypt/decrypt user
    data (like backups and photos)

2) Service requests; these come in THREE forms:
  2.1) Incoming Requests: These happen whenever another member of the loop asks
    something of us (usually a the UGC Key)
  2.2) Outgoing Requests: These (hopefully) provoke a response from another
    member of the loop, so we can get what we need from them (usually a UGC Key)
  2.3) HTTP Requests: These come from Top of Stack (ToS). They mostly just
    want to know if we have what the need (usually the UGC Key or backup data)
*/
class STSProcess extends events_1.EventEmitter {
    constructor() {
        super();
        // Set where we will host HTML files for the debug page
        let httpRoot = path.join(__dirname, 'static/secure-transfer-service');
        // Start servicing requests on the specified port
        SecureTransferService_1.default.createInstance({ port: 8485 }, httpRoot);
        // Create a connection to the Registry Service
        jibo_service_framework_1.RegistryClient.createInstance('127.0.0.1', 8181);
        // Begin the (long) initialization process
        SecureTransferService_1.default.instance.init((err) => {
            log.iferr(err, 'Error initializing STS');
            /* Once we have finished the first pass of initialization, we must
                drop the Semaphore so than the next services can start it's init.
              The SSM (and it's skills, including BE) depends on STS to be ready, in
                order for itself to function.
            */
            let sem = require('node-semaphore');
            log.debug('SEMAPHORE', 'pid', process.pid);
            let s = sem.Semaphore('/jibo-startup-' + process.pid + '.event');
            s.post();
            log.debug('STS started');
            // process.abort();
        });
    }
}
new STSProcess();
