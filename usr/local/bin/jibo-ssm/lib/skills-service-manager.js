(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.skillsServiceManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_expression_client_1 = require("jibo-expression-client");
const BodyClient_1 = require("./clients/BodyClient");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const jibo_service_framework_1 = require("jibo-service-framework");
const async = require("async");
const services = require("jibo-service-clients");
const jetstream_client_1 = require("@jibo/jetstream-client");
const log_1 = require("./log");
const prfy = jibo_cai_utils_1.PromiseUtils.promisify;
const prfyTo = jibo_cai_utils_1.PromiseUtils.promisifyTo;
class ClientInitializer {
    static expression(record) {
        return (done) => {
            jibo_expression_client_1.expression.init(record.port, {})
                .then(() => done())
                .catch(err => done(err));
        };
    }
    static jetstream(record) {
        return (done) => {
            jetstream_client_1.api.init({ hostname: record.host, port: record.port }, log_1.default)
                .then(() => done())
                .catch(err => done(err));
        };
    }
    static getClientInits(serviceNames, callback) {
        const jiboServiceClients = [];
        const inits = [];
        async.each(serviceNames, (name, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const record = yield ClientInitializer._waitForService(name);
                switch (record.name) {
                    case 'expression':
                        inits.push(ClientInitializer.expression(record));
                        break;
                    case 'jetstream':
                        inits.push(ClientInitializer.jetstream(record));
                        break;
                    case 'body':
                        BodyClient_1.default.createInstance('127.0.0.1', record.port);
                    case 'audio':
                    case 'media':
                    case 'media-manager':
                    case 'wifi':
                        jiboServiceClients.push(record);
                        break;
                }
                callback();
            }
            catch (e) {
                callback(e);
            }
        }), err => {
            if (err) {
                return callback(err);
            }
            inits.push((done) => {
                services.init({}, jiboServiceClients, done);
            });
            callback(null, inits);
        });
    }
    static _waitForService(service) {
        return __awaiter(this, void 0, void 0, function* () {
            let attempts = 0;
            while (attempts++ < 120) {
                const [getErr, record] = yield prfyTo(cb => jibo_service_framework_1.RegistryClient.instance.getRecordByName(service, cb));
                if (getErr) {
                    yield prfy(cb => setTimeout(cb, 500));
                }
                else {
                    return record;
                }
            }
            throw new Error(`Giving up waiting for ${service} service after one minute`);
        });
    }
}
exports.default = ClientInitializer;

},{"./clients/BodyClient":11,"./log":20,"@jibo/jetstream-client":undefined,"async":undefined,"jibo-cai-utils":undefined,"jibo-expression-client":undefined,"jibo-service-clients":undefined,"jibo-service-framework":undefined}],2:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const FactoryDeps_1 = require("./FactoryDeps");
const Analytics_1 = require("./utils/analytics/Analytics");
require("./background");
const BackgroundUtilsManager_1 = require("./utils/BackgroundUtilsManager");
const ClientInitializer_1 = require("./ClientInitializer");
const SSMService_1 = require("./SSMService");
const KBService_1 = require("./services/kb/KBService");
const jibo_log_1 = require("jibo-log");
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("./log");
const RegistryService_1 = require("./sim-services/registry/RegistryService");
const ServiceClients = require("jibo-service-clients");
const Version_1 = require("./utils/Version");
const async = require("async");
const childProcess = require("child_process");
const findRoot = require("find-root");
const Orchestrator = require("orchestrator");
const path = require("path");
var spawnSync = childProcess.spawnSync;
jibo_log_1.Log.processName = 'ssm';
const log = log_1.default.createChild('Factory');
class Factory {
    constructor(conf, rootDir, mode) {
        if (conf.logging) {
            try {
                jibo_log_1.Log.loadConfig(conf.logging);
            }
            catch (err) {
                console.error('Error loading logging config', err);
            }
        }
        this._createOrchestrator();
        this._instantiateServices(conf.services, rootDir);
        this._addRegistryServiceTask(conf.RegistryService, rootDir);
        this._addRegistryClientTask(conf.RegistryClient, conf.RegistryService);
        this._addSimulatedServicesInitTasks(conf.services);
        this._addSharedClientsTask(conf.platformVersion);
        this._addPlatformClientsTask();
        this._addRealServicesInitTasks();
        this._addSyncManagersTask();
        this._addNotificationsDispatcherTask();
        this._addLateClientsTask();
        this._addAnalyticsTask();
        this._addBackgroundUtilsTask(conf.services, mode);
        this._addAllTask();
    }
    init(callback) {
        log.info('Starting orchestrator');
        this._orchestrator.start('All', callback);
    }
    _createOrchestrator() {
        log.info('Creating orchestrator');
        this._orchestrator = new Orchestrator();
        this._orchestrator.onAll(event => {
            const message = `Orchestrator: ${event.src} ${event.task}: ${event.message}`;
            if (event.src === 'err') {
                log.error(message, event.err);
            }
            else if (['not_found', 'recursion'].includes(event.src)) {
                log.error(message);
            }
            else {
                log.info(message);
            }
        });
    }
    _instantiateServices(services, rootDir) {
        log.info('Creating service instances');
        log.debug(services);
        Object.keys(services).forEach(serviceName => {
            log.debug('Creating instance of', serviceName);
            const service = FactoryDeps_1.REAL_SERVICES[serviceName] || FactoryDeps_1.SIMULATED_SERVICES[serviceName];
            const options = services[serviceName];
            log.debug(service.name);
            SSMService_1.instantiateService(service, options, rootDir);
        });
    }
    _addRegistryServiceTask(serviceOpts, rootDir) {
        log.info('Adding registry service task to orchestrator');
        this._orchestrator.add('RegistryService', (done) => {
            if (serviceOpts) {
                const options = serviceOpts;
                SSMService_1.instantiateService(RegistryService_1.default, options, rootDir);
                RegistryService_1.default.instance.init(done);
            }
            else {
                done();
            }
        });
    }
    _getRegistryHost(registryClient) {
        log.info('Getting registry host');
        let host = '127.0.0.1';
        if (registryClient) {
            if (registryClient.host) {
                host = registryClient.host;
            }
            else {
                const getHostNameScriptPath = path.join(findRoot(__dirname), 'bin/utils/get-robot-host.sh');
                host = spawnSync(getHostNameScriptPath)
                    .stdout.toString().trim();
                log.debug(host);
            }
        }
        return host;
    }
    _addRegistryClientTask(registryClient, registryService) {
        log.info('Adding registry client task to orchestrator');
        this._orchestrator.add('RegistryClient', ['RegistryService'], (done) => {
            if (!registryService && !registryClient) {
                return done(new Error('Config must specify either RegistryClient or RegistryService'));
            }
            const host = this._getRegistryHost(registryClient);
            const port = registryService
                ? RegistryService_1.default.instance.port
                : registryClient.port;
            jibo_service_framework_1.RegistryClient.createInstance(host, port);
            done();
        });
    }
    _addSimulatedServicesInitTasks(services) {
        Object.keys(FactoryDeps_1.SIMULATED_SERVICES).forEach(name => {
            log.info(`Adding simulated-service ${name} init task to orchestrator`);
            const serviceDeps = FactoryDeps_1.SIMULATED_SERVICE_DEPS[name] || [];
            const allDeps = ['RegistryClient', ...serviceDeps];
            this._orchestrator.add(name, allDeps, (done) => {
                if (services[name]) {
                    log.debug(`Starting init for ${name}`);
                    FactoryDeps_1.SIMULATED_SERVICES[name].instance.init(done);
                }
                else {
                    done();
                }
            });
        });
    }
    _addSharedClientsTask(platformVersion) {
        log.info('Adding shared platform-service clients task to orchestrator');
        this._orchestrator.add('SharedClients', ['RegistryClient', 'SystemManagerService'], (done) => {
            jibo_service_framework_1.RegistryClient.instance.getRecordByName('system-manager', (err, sysMgrRec) => {
                if (err) {
                    return done(new Error('Could not find system-manager in registry.'));
                }
                ServiceClients.init({}, [{
                        name: sysMgrRec.name,
                        host: jibo_service_framework_1.RegistryClient.instance.host,
                        port: sysMgrRec.port,
                    }], (error) => {
                    if (error) {
                        done(error);
                    }
                    else {
                        jibo_service_framework_1.SystemManagerClient.createInstance(sysMgrRec.host, sysMgrRec.port);
                        Version_1.versionCheck(platformVersion, done);
                    }
                });
            });
        });
    }
    _addPlatformClientsTask() {
        log.info('Adding platform-service clients task to orchestrator');
        this._orchestrator.add('PlatformClients', FactoryDeps_1.PLATFORM_CLIENTS_DEPS, (done) => {
            ClientInitializer_1.default.getClientInits(FactoryDeps_1.PLATFORM_CLIENTS, (err, tasks) => {
                if (err) {
                    log.error('Critical error getting initializers for early service clients', err);
                    return done(err);
                }
                async.parallel(tasks, done);
            });
        });
    }
    _addServiceInitTask(Service, deps = []) {
        log.info(`Adding ${Service.name} init task to orchestrator`);
        const fullDeps = ['PlatformClients', ...deps];
        this._orchestrator.add(Service.name, fullDeps, (done) => {
            if (Service.instance) {
                log.debug(`Starting init for ${Service.name}`);
                Service.instance.init((err) => {
                    done(err);
                });
            }
            else {
                done();
            }
        });
    }
    _addRealServicesInitTasks() {
        log.info('Adding real services init tasks to orchestrator');
        Object.keys(FactoryDeps_1.REAL_SERVICES).forEach(name => {
            this._addServiceInitTask(FactoryDeps_1.REAL_SERVICES[name], FactoryDeps_1.REAL_SERVICE_DEPS[name]);
        });
    }
    _addSyncManagersTask() {
        log.info('Adding sync managers task to orchestrator');
        this._orchestrator.add('SyncManagers', ['ErrorService', 'KBService'], (done) => {
            KBService_1.default.instance.initSyncManagers(err => {
                done();
            });
        });
    }
    _addNotificationsDispatcherTask() {
        log.info('Adding NotificationsDispatcher task to orchestrator');
        this._orchestrator.add('NotificationsDispatcher', ['NotificationsService', 'ServerService'], (done) => {
            jibo_service_framework_1.NotificationsDispatcher.instance.init((err) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    return done(err);
                }
                try {
                    yield jibo_log_1.Log.handleLogLevelNotifications(jibo_service_framework_1.NotificationsDispatcher.instance, true);
                }
                catch (err) {
                    log.error('Failed to set up log level notification handler', err);
                    return done(err);
                }
                done();
            }));
        });
    }
    _addLateClientsTask() {
        log.info('Adding late clients task to orchestrator');
        this._orchestrator.add('LateClients', FactoryDeps_1.LATE_CLIENTS_DEPS, (done) => {
            ClientInitializer_1.default.getClientInits(FactoryDeps_1.LATE_CLIENTS, (err, tasks) => {
                if (err) {
                    log.error('Critical error getting initializers for late service clients', err);
                    return done(err);
                }
                async.parallel(tasks, done);
            });
        });
    }
    _addAnalyticsTask() {
        log.info('Adding analytics task to orchestrator');
        this._orchestrator.add('Analytics', FactoryDeps_1.ALL_CLIENTS_AND_SERVICES, (done) => {
            log.info('Initilizing analytics');
            const analytics = Analytics_1.default.createInstance();
            analytics.init(() => {
                log.info('Analytics initialized');
                done();
            });
        });
    }
    _addBackgroundUtilsTask(services, mode) {
        log.info('Adding BackgroundUtils task to orchestrator');
        this._orchestrator.add('BackgroundUtils', FactoryDeps_1.ALL_CLIENTS_AND_SERVICES, (done) => {
            log.info('Initilizing background utilities');
            BackgroundUtilsManager_1.default.initAll(mode, services.SkillsService
                ? services.SkillsService.startSkill
                : undefined);
            log.info('Background utilities initialized');
            done();
        });
    }
    _addAllTask() {
        log.info('Adding All (ending) task to orchestrator');
        this._orchestrator.add('All', FactoryDeps_1.ALL_TASKS);
    }
}
exports.default = Factory;

},{"./ClientInitializer":1,"./FactoryDeps":3,"./SSMService":4,"./background":5,"./log":20,"./services/kb/KBService":45,"./sim-services/registry/RegistryService":96,"./utils/BackgroundUtilsManager":105,"./utils/Version":109,"./utils/analytics/Analytics":110,"async":undefined,"child_process":undefined,"find-root":undefined,"jibo-log":undefined,"jibo-service-clients":undefined,"jibo-service-framework":undefined,"orchestrator":undefined,"path":undefined}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AudioServiceSim_1 = require("./sim-services/audio/AudioServiceSim");
require("./background");
const BodyService_1 = require("./sim-services/body/BodyService");
const DevShell_1 = require("./services/dev-shell/DevShell");
const ErrorService_1 = require("./services/error/ErrorService");
const ExpressionService_1 = require("./services/expression/ExpressionService");
const EventPlayback_1 = require("./sim-services/event-playback/EventPlayback");
const GlobalManagerService_1 = require("./services/global-manager/GlobalManagerService");
const KBService_1 = require("./services/kb/KBService");
const LPSService_1 = require("./sim-services/lps/LPSService");
const MediaManagerService_1 = require("./services/media-manager/MediaManagerService");
const MediaService_1 = require("./sim-services/media/MediaService");
const NotificationsService_1 = require("./services/notifications/NotificationsService");
const PerformanceService_1 = require("./services/performance/PerformanceService");
const PerformanceServiceSim_1 = require("./sim-services/performance/PerformanceServiceSim");
const RemoteService_1 = require("./services/remote/RemoteService");
const SchedulerService_1 = require("./services/scheduler/SchedulerService");
const SecureTransferServiceSim_1 = require("./sim-services/secure-transfer/SecureTransferServiceSim");
const SecurityControllerService_1 = require("./services/security-controller/SecurityControllerService");
const ServerService_1 = require("./sim-services/server/ServerService");
const SkillsService_1 = require("./services/skills/SkillsService");
const SkillsServiceSim_1 = require("./sim-services/skills/SkillsServiceSim");
const SystemManagerService_1 = require("./sim-services/system-manager/SystemManagerService");
const SystemMonitoringServiceSim_1 = require("./sim-services/system-monitoring/SystemMonitoringServiceSim");
const TTSService_1 = require("./sim-services/tts/TTSService");
const JetstreamServiceSim_1 = require("./sim-services/jetstream/JetstreamServiceSim");
const WifiService_1 = require("./services/wifi/WifiService");
exports.REAL_SERVICES = {
    DevShell: DevShell_1.default,
    ErrorService: ErrorService_1.default,
    ExpressionService: ExpressionService_1.default,
    GlobalManagerService: GlobalManagerService_1.default,
    KBService: KBService_1.default,
    MediaManagerService: MediaManagerService_1.default,
    NotificationsService: NotificationsService_1.default,
    PerformanceService: PerformanceService_1.default,
    RemoteService: RemoteService_1.default,
    SchedulerService: SchedulerService_1.default,
    SecurityControllerService: SecurityControllerService_1.default,
    SkillsService: SkillsService_1.default,
    WifiService: WifiService_1.default,
};
exports.REAL_SERVICE_DEPS = {
    DevShell: ['SkillsService', 'TTSService', 'WifiService'],
    ErrorService: ['KBService'],
    GlobalManagerService: ['LateClients'],
    MediaManagerService: ['MediaService'],
    RemoteService: ['GlobalManagerService', 'SecurityControllerService'],
    SchedulerService: ['GlobalManagerService', 'KBService'],
    SecurityControllerService: ['NotificationsDispatcher', 'ServerService'],
    SkillsService: ['GlobalManagerService', 'PerformanceService'],
    WifiService: ['ErrorService'],
};
exports.SIMULATED_SERVICES = {
    AudioServiceSim: AudioServiceSim_1.default,
    BodyService: BodyService_1.default,
    EventPlayback: EventPlayback_1.default,
    LPSService: LPSService_1.default,
    MediaService: MediaService_1.default,
    PerformanceServiceSim: PerformanceServiceSim_1.default,
    SecureTransferServiceSim: SecureTransferServiceSim_1.default,
    ServerService: ServerService_1.default,
    SkillsServiceSim: SkillsServiceSim_1.default,
    SystemManagerService: SystemManagerService_1.default,
    SystemMonitoringServiceSim: SystemMonitoringServiceSim_1.default,
    TTSService: TTSService_1.default,
    JetstreamServiceSim: JetstreamServiceSim_1.default
};
exports.SIMULATED_SERVICE_DEPS = {
    EventPlayback: [AudioServiceSim_1.default.name, BodyService_1.default.name, LPSService_1.default.name],
    SkillsServiceSim: [GlobalManagerService_1.default.name],
    TTSService: [PerformanceService_1.default.name],
};
exports.PLATFORM_CLIENTS = ['body'];
exports.PLATFORM_CLIENTS_DEPS = [
    'SharedClients',
    BodyService_1.default.name,
    LPSService_1.default.name,
];
exports.LATE_CLIENTS = [
    'audio',
    'expression',
    'media-manager',
    'wifi',
    'media',
    'jetstream',
];
exports.LATE_CLIENTS_DEPS = [
    'AudioServiceSim',
    'ExpressionService',
    'MediaManagerService',
    'WifiService',
    'JetstreamServiceSim'
];
exports.ALL_CLIENTS_AND_SERVICES = [
    ...Object.keys(exports.REAL_SERVICES),
    ...Object.keys(exports.SIMULATED_SERVICES),
    'LateClients',
    'NotificationsDispatcher',
    'PlatformClients',
    'RegistryClient',
    'RegistryService',
    'SharedClients',
];
exports.ALL_TASKS = [
    ...exports.ALL_CLIENTS_AND_SERVICES,
    'Analytics',
    'BackgroundUtils',
    'SyncManagers',
];

},{"./background":5,"./services/dev-shell/DevShell":21,"./services/error/ErrorService":28,"./services/expression/ExpressionService":34,"./services/global-manager/GlobalManagerService":42,"./services/kb/KBService":45,"./services/media-manager/MediaManagerService":52,"./services/notifications/NotificationsService":53,"./services/performance/PerformanceService":54,"./services/remote/RemoteService":56,"./services/scheduler/SchedulerService":61,"./services/security-controller/SecurityControllerService":63,"./services/skills/SkillsService":65,"./services/wifi/WifiService":67,"./sim-services/audio/AudioServiceSim":80,"./sim-services/body/BodyService":83,"./sim-services/event-playback/EventPlayback":85,"./sim-services/jetstream/JetstreamServiceSim":87,"./sim-services/lps/LPSService":92,"./sim-services/media/MediaService":94,"./sim-services/performance/PerformanceServiceSim":95,"./sim-services/secure-transfer/SecureTransferServiceSim":97,"./sim-services/server/ServerService":98,"./sim-services/skills/SkillsServiceSim":99,"./sim-services/system-manager/SystemManagerService":100,"./sim-services/system-monitoring/SystemMonitoringServiceSim":101,"./sim-services/tts/TTSService":103}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function instantiateService(ServiceClass, options, rootDir) {
    return new ServiceClass(options, rootDir);
}
exports.instantiateService = instantiateService;

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./location/LocationManager");
require("./screen/ScreenScheduler");

},{"./location/LocationManager":7,"./screen/ScreenScheduler":10}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WifiService_1 = require("../../services/wifi/WifiService");
const querystring = require("querystring");
const crypto = require("crypto");
const URLSafeBase64 = require("urlsafe-base64");
const log_1 = require("../log");
const log = log_1.default.createChild('Location');
const GOOGLE_API_KEY = 'AIzaSyA-oFAphgwxCBys-mouBuVQ6gI3yP4TaU8';
const GOOGLE_MAPS_CRYPTO_KEY = 'Ri2CIo95Sa7dlwft5tQPixUtnPo=';
function getLocation() {
    return getNetworks()
        .then((networkList) => {
        return getLocationFromGoogle(networkList);
    });
}
exports.getLocation = getLocation;
function getLocationFromGoogle(networkList) {
    return new Promise((resolve, reject) => {
        const wifiAccessPoints = [];
        for (let i = 0; i < networkList.length; ++i) {
            if (!networkList[i]) {
                continue;
            }
            const scan = networkList[i].split(/\s+/);
            wifiAccessPoints.push({
                macAddress: scan[0],
                signalStrength: parseInt(scan[2])
            });
        }
        log.info(`Asking Google where we are with ${wifiAccessPoints.length} access points`);
        const body = { wifiAccessPoints, considerIp: true };
        const query = querystring.stringify({ key: GOOGLE_API_KEY });
        const url = `https://www.googleapis.com/geolocation/v1/geolocate?${query}`;
        const request = new XMLHttpRequest();
        request.open('POST', url, true);
        request.responseType = 'json';
        request.timeout = 10000;
        request.addEventListener('timeout', () => { reject('XHR Timeout'); }, false);
        request.addEventListener('error', () => { reject('XHR Error'); }, false);
        request.addEventListener('abort', () => { reject('XHR Aborted'); }, false);
        request.addEventListener('load', () => {
            if (request.status === 200) {
                const location = request.response.location;
                resolve(geocodeWithGoogle(location.lat, location.lng));
            }
            else {
                if (request.response && request.response.error) {
                    reject(request.response.error.message);
                }
                else {
                    reject('Invalid response');
                }
            }
        }, false);
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send(JSON.stringify(body));
    });
}
function geocodeWithGoogle(lat, lng) {
    return new Promise((resolve, reject) => {
        let endpoint = "/maps/api/geocode/json?";
        let options = {
            latlng: `${lat},${lng}`,
            client: "gme-jiboinc"
        };
        options["signature"] = generateGoogleSignature(GOOGLE_MAPS_CRYPTO_KEY, endpoint + querystring.stringify(options));
        let url = "https://maps.googleapis.com" + endpoint + querystring.stringify(options);
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'json';
        request.timeout = 10000;
        request.addEventListener('timeout', () => { reject('XHR Timeout'); }, false);
        request.addEventListener('error', () => { reject('XHR Error'); }, false);
        request.addEventListener('abort', () => { reject('XHR Aborted'); }, false);
        request.addEventListener('load', () => {
            if (request.status === 200) {
                let finalLocation = {
                    lat,
                    lng,
                    fetchSuccess: true,
                    fetchedAt: Date.now(),
                    isUserSet: false
                };
                const results = request.response.results;
                for (let i = 0; i < results.length; ++i) {
                    const locTypes = results[i].types;
                    if (locTypes.indexOf('street_address') === -1 &&
                        locTypes.indexOf('political') === -1) {
                        continue;
                    }
                    const components = results[i].address_components;
                    for (let j = 0; j < components.length; ++j) {
                        const types = components[j].types;
                        if (types.indexOf('sublocality') !== -1) {
                            finalLocation.city = components[j].long_name;
                            continue;
                        }
                        if (types.indexOf('locality') !== -1) {
                            finalLocation.city = components[j].long_name;
                            continue;
                        }
                        if (types.indexOf('administrative_area_level_1') !== -1) {
                            finalLocation.state = components[j].long_name;
                            finalLocation.stateAbbr = components[j].short_name;
                            continue;
                        }
                        if (types.indexOf('country') !== -1) {
                            finalLocation.countryCode = components[j].short_name;
                            finalLocation.country = components[j].long_name;
                            continue;
                        }
                    }
                    break;
                }
                resolve(finalLocation);
            }
            else {
                if (request.response && request.response.error) {
                    reject(request.response.error.message);
                }
                else {
                    reject('Invalid response');
                }
            }
        }, false);
        request.send();
    });
}
exports.geocodeWithGoogle = geocodeWithGoogle;
function getNetworks() {
    return WifiService_1.default.instance.getScanResults();
}
function generateGoogleSignature(key, req) {
    let privateKeyInBuffer = URLSafeBase64.decode(key);
    let hashInABuffer = crypto.createHmac('sha1', privateKeyInBuffer).update(req).digest();
    let hashEncodedWebSafe = URLSafeBase64.encode(hashInABuffer);
    return hashEncodedWebSafe;
}

},{"../../services/wifi/WifiService":67,"../log":9,"crypto":undefined,"querystring":undefined,"urlsafe-base64":undefined}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KBClient_1 = require("../../clients/KBClient");
const jibo_service_clients_1 = require("jibo-service-clients");
const log_1 = require("../log");
const log = log_1.default.createChild('LocationManager');
const Location_1 = require("./Location");
const Timezone_1 = require("./Timezone");
const KBService_1 = require("../../services/kb/KBService");
const WifiService_1 = require("../../services/wifi/WifiService");
const ErrorService_1 = require("../../services/error/ErrorService");
const SchedulerService_1 = require("../../services/scheduler/SchedulerService");
const jibo_client_framework_1 = require("jibo-client-framework");
const BackgroundUtilsManager_1 = require("../../utils/BackgroundUtilsManager");
let resetDateCache;
try {
    resetDateCache = require('reset-date-cache');
}
catch (e) {
    log.warn(`error loading reset-date-cache:`, (e.message || e));
    resetDateCache = null;
}
const GEO_LOCATION_ERROR = 'T1-Geolocation_failed';
const KB_SLICE_NAME = '/jibo/location';
const DATA_TOO_FRESH = 1000 * 60 * 30;
const DATA_TOO_OLD = 1000 * 60 * 60 * 24 * 14;
class LocationManager {
    static get instance() {
        return LocationManager._instance;
    }
    static init() {
        const instance = LocationManager._instance = new LocationManager();
        instance.init(() => {
            if (!WifiService_1.default.instance || !ErrorService_1.default.instance) {
                return;
            }
            WifiService_1.default.instance.verifyConnection().then((err) => {
                if (err) {
                    log.info('on init, wifi or internet not ready - waiting for state change');
                    WifiService_1.default.instance.on('internet-connected', instance._onWifiConnected);
                    return;
                }
                KBClient_1.default.robot.events.robotUpdated.on(instance._onRobotUpdated);
                log.info('on init, wifi and internet verified - getting location');
                instance.getTimezone(true)
                    .then((timezone) => {
                    SchedulerService_1.default.instance.addJob('0 30 2 * * *', instance._checkForChangedTimezone);
                });
            }, (error) => {
                log.info('on init, wifi or internet not ready - waiting for state change');
                WifiService_1.default.instance.on('internet-connected', instance._onWifiConnected);
            });
        });
    }
    static areLocationsEqual(loc1, loc2) {
        return loc1.lat === loc2.lat && loc1.lng === loc2.lng && loc1.isUserSet === loc2.isUserSet;
    }
    constructor(enableCloud = true) {
        this.httpUrl = 'http://127.0.0.1:' + KBService_1.default.instance.port;
        this.enableCloud = enableCloud;
        this._onWifiConnected = this._onWifiConnected.bind(this);
        this._checkForChangedTimezone = this._checkForChangedTimezone.bind(this);
        this._onRobotUpdated = this._onRobotUpdated.bind(this);
    }
    init(callback) {
        this.model = KBClient_1.default.createModel(KB_SLICE_NAME, this.httpUrl);
        this.isIntDev = new Promise((resolve) => {
            jibo_service_clients_1.systemManager.getMode((err, data) => {
                resolve(data === 'int-developer');
            });
        });
        this._preloadLocationModel(() => {
            log.info("KB Model Intialized");
            if (callback) {
                callback();
            }
        });
    }
    getTimezone(refreshLocation = false) {
        return this._getLocation(refreshLocation)
            .then((location) => {
            this._logIfIntDev(`Looking up timezone for ${location.lat}, ${location.lng} now`);
            return Timezone_1.lookUpTimezone(location.lat, location.lng);
        })
            .then((timezone) => {
            return this._saveTimezone(timezone);
        })
            .catch((err) => {
            log.warn('error when looking up timezone, not setting system timezone: ' + (err.message || err));
            return null;
        });
    }
    setTimezone(tzId, offset) {
        if (!tzId || !offset) {
            this.help();
            return;
        }
        try {
            const [, hours, minutes] = /^([+-]\d\d):(\d\d)$/.exec(offset);
            const offsetUTC = parseInt(hours) * 60 * 60 * 1000 + parseInt(minutes) * 60 * 1000;
            const name = 'MANUALLY SET';
            const id = tzId;
            const timezone = {
                offsetUTC,
                name,
                id,
                __type: 'Timezone'
            };
            this._saveTimezone(timezone);
        }
        catch (e) {
            this.help();
            return;
        }
    }
    resetTimezone() {
        const jobId = SchedulerService_1.default.instance.addJob('*/2 * * * *', () => {
            this._checkForChangedTimezone();
            SchedulerService_1.default.instance.removeJob(jobId);
        });
    }
    breakLocation() {
        const tempLoad = this.model.load;
        this.model.load = (id) => {
            return Promise.reject('Forcing a KB failure!');
        };
        const tempScan = WifiService_1.default.instance.getScanResults;
        WifiService_1.default.instance.getScanResults = () => Promise.reject(new Error('Forcing a WIFI failure!'));
        this.getTimezone(true).then(() => {
            WifiService_1.default.instance.getScanResults = tempScan;
            this.model.load = tempLoad;
        });
    }
    help() {
        console.log('Location Manager QA/Debug Commands:');
        console.info('locationManager.resetTimezone(): sets up a cron job for 2 minutes from now to run the regular checking of timezone for the current latitude/longitude.');
        console.info('locationManager.setTimezone(timezoneId, offset): Manually set the timezone of the robot with data from https://en.wikipedia.org/wiki/List_of_tz_database_time_zones');
        console.log('timezoneId should be a value from the TZ column. offset should be a value from the UTC offset OR the UTC DST offset column.');
        console.warn('NOTE: The system time is set only via timezoneId, so please only enable DST if that timezone is currently in DST, otherwise date/time math may be out of sync.');
        console.info('locationManager.breakLocation(): Causes the LocationManager to fail a location fetch, so that it will trigger the corresponding error in the error system.');
    }
    _logIfIntDev(...params) {
        this.isIntDev.then((isIntDev) => {
            if (isIntDev) {
                log.info(...params);
            }
        });
    }
    _onWifiConnected() {
        KBClient_1.default.robot.events.robotUpdated.on(this._onRobotUpdated);
        log.info('internet now connected - getting location and canceling wait');
        WifiService_1.default.instance.removeListener('internet-connected', this._onWifiConnected);
        this.getTimezone(true)
            .then((timezone) => {
            SchedulerService_1.default.instance.addJob('0 30 2 * * *', this._checkForChangedTimezone);
        });
    }
    _checkForChangedTimezone() {
        this.getTimezone();
    }
    _onRobotUpdated() {
        KBClient_1.default.robot.loadRoot().then((robotNode) => {
            return this.model.load(this.rootNode.getEdges('home'))
                .then((nodes) => {
                if (robotNode.data.locationOverride) {
                    if (!nodes || !nodes.length ||
                        !LocationManager.areLocationsEqual(robotNode.data.locationOverride, nodes[0].data)) {
                        ErrorService_1.default.instance.removeError(GEO_LOCATION_ERROR);
                        this._logIfIntDev('Overriding location with ', robotNode.data.locationOverride);
                        log.info('User overrode location');
                        const location = Object.assign({
                            fetchSuccess: false,
                            isUserSet: true
                        }, robotNode.data.locationOverride);
                        return Promise.resolve(location)
                            .then((location) => {
                            if (!location.countryCode) {
                                return Location_1.geocodeWithGoogle(location.lat, location.lng)
                                    .then((location) => {
                                    location.fetchSuccess = false;
                                    location.isUserSet = true;
                                    return location;
                                });
                            }
                            return location;
                        })
                            .then((location) => {
                            return this._saveLocation(location);
                        })
                            .then((location) => {
                            this._logIfIntDev(`Looking up timezone for ${location.lat}, ${location.lng} on update`);
                            return Timezone_1.lookUpTimezone(location.lat, location.lng);
                        })
                            .then((timezone) => {
                            return this._saveTimezone(timezone);
                        })
                            .catch((err) => {
                            log.warn('error when looking up timezone, not setting system timezone: ' + (err.message || err));
                            return null;
                        });
                    }
                }
                else {
                    if (nodes && nodes.length && nodes[0].data.isUserSet) {
                        log.info('User cleared location override');
                        nodes[0].data.fetchSuccess = false;
                        nodes[0].data.isUserSet = false;
                        return nodes[0].save().then(() => {
                            return this.getTimezone(true);
                        });
                    }
                }
            });
        });
    }
    _preloadLocationModel(callback) {
        this.model.loadRoot((err, rootNode) => {
            this.rootNode = rootNode;
            callback();
        });
    }
    _getLocation(refreshLocation) {
        return this.model.load(this.rootNode.getEdges('home'))
            .then((nodes) => {
            if (!nodes || !nodes[0] || !nodes[0].data || nodes.length > 1) {
                log.debug('_getLocation, no node!');
                return this._learnAndSaveLocation();
            }
            const data = nodes[0].data;
            if (data.isUserSet) {
                return data;
            }
            log.debug(`_getLocation - time since update vs DATA_TOO_FRESH: ${Date.now() - data.fetchedAt} > ${DATA_TOO_FRESH}; fetchSuccess: ${data.fetchSuccess}`);
            if (!data.fetchSuccess || !data.fetchedAt || !data.countryCode ||
                Date.now() - data.fetchedAt > DATA_TOO_OLD ||
                (refreshLocation && Date.now() - nodes[0].updated > DATA_TOO_FRESH)) {
                log.info('Fetching location data');
                return this._learnAndSaveLocation(data);
            }
            else {
                log.info('Previous location data is considered new enough, is being reused');
                return data;
            }
        }, (err) => {
            return this._learnAndSaveLocation();
        });
    }
    _learnAndSaveLocation(prevLocation) {
        return Location_1.getLocation()
            .then((location) => {
            this._logIfIntDev('Location fetched from Google: ', location);
            ErrorService_1.default.instance.removeError(GEO_LOCATION_ERROR);
            return location;
        })
            .catch((err) => {
            log.warn('error while getting location, falling back to previous location or Boston - ' + (err.message || err));
            if (!prevLocation || !prevLocation.fetchSuccess) {
                ErrorService_1.default.instance.addError(GEO_LOCATION_ERROR);
            }
            if (prevLocation) {
                return prevLocation;
            }
            return {
                city: 'Boston',
                state: 'Massachusetts',
                stateAbbr: 'MA',
                country: 'usa',
                countryCode: 'US',
                lat: 42.354416,
                lng: -71.054287,
                fetchSuccess: false,
                isUserSet: false
            };
        })
            .then((location) => {
            return this._saveLocation(location);
        });
    }
    _saveLocation(location) {
        let makeNodeProm;
        if (this.rootNode.getEdges('home').length > 1) {
            this.rootNode.clearEdges('home');
        }
        if (this.rootNode.getEdges('home').length === 0) {
            makeNodeProm = new Promise((resolve, reject) => {
                const node = this.model.createNode('location', location);
                this.rootNode.addEdges(node, 'home');
                resolve(node);
            });
        }
        else {
            makeNodeProm = this.model.load(this.rootNode.getEdges('home'))
                .then((nodes) => {
                nodes[0].data = location;
                return nodes[0];
            });
        }
        return makeNodeProm.then((node) => {
            return Promise.all([node.save(), this.rootNode.save()]);
        }).then(() => {
            return location;
        });
    }
    _saveTimezone(timezone) {
        let makeNodeProm;
        if (this.rootNode.getEdges('timezone').length === 0) {
            makeNodeProm = new Promise((resolve, reject) => {
                const node = this.model.createNode('timezone', {});
                this.rootNode.addEdges(node, 'timezone');
                resolve(node);
            });
        }
        else {
            makeNodeProm = this.model.load(this.rootNode.getEdges('timezone'))
                .then((nodes) => {
                return nodes[0];
            });
        }
        let prevData;
        return makeNodeProm.then((node) => {
            prevData = node.data;
            log.info('comparing current KB timezone to fetched timezone: ', prevData, timezone);
            if (prevData.offsetUTC !== timezone.offsetUTC || prevData.id !== timezone.id) {
                log.info('KB timezone is updated');
                node.data = timezone;
            }
            else {
                log.info('KB timezone has not changed');
            }
            return node;
        })
            .then((node) => {
            return new Promise((resolve) => {
                jibo_client_framework_1.SystemManagerClient.instance.getTimeZone((err, currentZone) => {
                    const dateTZOffset = new Date().getTimezoneOffset() * 60 * 1000;
                    const tzOffsetsMatch = Math.abs(dateTZOffset - timezone.offsetUTC) < 1;
                    if ((currentZone === timezone.id) && tzOffsetsMatch) {
                        return resolve(node);
                    }
                    jibo_client_framework_1.SystemManagerClient.instance.setTimeZone(timezone.id, (err) => {
                        if (err) {
                            log.warn('Error when setting system timezone to ' + timezone.id + ': ' + (err.message || err));
                        }
                        else {
                            log.info(`Successfully set system timezone: ${timezone.id}`);
                        }
                        if (resetDateCache) {
                            try {
                                process.env.TZ = timezone.id;
                                resetDateCache();
                            }
                            catch (e) {
                                log.warn('Unable to reset date cache after changing the timezone');
                            }
                        }
                        resolve(node);
                    });
                });
            });
        })
            .then((node) => {
            log.info(`System time with timezone offset: ${new Date().toString()}`);
            return Promise.all([node.save(), this.rootNode.save()]);
        }).then(() => {
            return timezone;
        });
    }
}
BackgroundUtilsManager_1.default.register(() => {
    setTimeout(() => {
        LocationManager.init();
    }, 5000);
}, 'location');
exports.default = LocationManager;

},{"../../clients/KBClient":14,"../../services/error/ErrorService":28,"../../services/kb/KBService":45,"../../services/scheduler/SchedulerService":61,"../../services/wifi/WifiService":67,"../../utils/BackgroundUtilsManager":105,"../log":9,"./Location":6,"./Timezone":8,"jibo-client-framework":undefined,"jibo-service-clients":undefined,"reset-date-cache":undefined}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const querystring = require("querystring");
const GOOGLE_API = 'AIzaSyA-oFAphgwxCBys-mouBuVQ6gI3yP4TaU8';
function lookUpTimezone(lat, lng) {
    return new Promise((resolve, reject) => {
        const query = querystring.stringify({
            key: GOOGLE_API,
            timestamp: Math.floor(Date.now() / 1000),
            location: `${lat},${lng}`
        });
        const url = `https://maps.googleapis.com/maps/api/timezone/json?${query}`;
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'json';
        request.timeout = 10000;
        request.addEventListener('timeout', () => { reject('XHR Timeout'); }, false);
        request.addEventListener('error', () => { reject('XHR Error'); }, false);
        request.addEventListener('abort', () => { reject('XHR Aborted'); }, false);
        request.addEventListener('load', () => {
            if (request.status === 200 && request.response && request.response.status === 'OK') {
                const results = request.response;
                const offsetUTC = (results.rawOffset + results.dstOffset) * 1000;
                const name = results.timeZoneName;
                const id = results.timeZoneId;
                const timezone = {
                    offsetUTC,
                    name,
                    id,
                    __type: 'Timezone'
                };
                resolve(timezone);
            }
            else {
                let error = 'Invalid response';
                if (request.response) {
                    if (request.response.error) {
                        error = request.response.error;
                    }
                    else if (request.response.error_message) {
                        error = request.response.status + ': ' + request.response.error_message;
                    }
                    else if (request.response.status) {
                        error = request.response.status;
                    }
                }
                reject(error);
            }
        }, false);
        request.send();
    });
}
exports.lookUpTimezone = lookUpTimezone;

},{"querystring":undefined}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Background');

},{"../log":20}],10:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const BackgroundUtilsManager_1 = require("../../utils/BackgroundUtilsManager");
const BodyClient_1 = require("../../clients/BodyClient");
const log_1 = require("../log");
const TIME_TO_BLANK = 1000 * 5 * 60;
const log = log_1.default.createChild('ScreenScheduler');
class ScreenScheduler {
    static start(restartOnly = false) {
        if (restartOnly && !ScreenScheduler._started) {
            return;
        }
        log.info('starting screen timeout timer');
        ScreenScheduler._started = true;
        clearTimeout(ScreenScheduler._timeoutId);
        ScreenScheduler._timeoutId = setTimeout(() => {
            log.info('Screen timed out - turning off');
            BodyClient_1.default.instance.setScreen('off');
            ScreenScheduler._headTouchOn();
        }, TIME_TO_BLANK);
    }
    static stopTimerAndTurnOn() {
        return __awaiter(this, void 0, void 0, function* () {
            ScreenScheduler._started = false;
            clearTimeout(ScreenScheduler._timeoutId);
            ScreenScheduler._headTouchOff();
            yield BodyClient_1.default.instance.setScreen('on');
        });
    }
    static _headTouchOn() {
        BodyClient_1.default.instance.removeListener('touched', ScreenScheduler._onHeadTouched);
        BodyClient_1.default.instance.once('touched', ScreenScheduler._onHeadTouched);
    }
    static _headTouchOff() {
        BodyClient_1.default.instance.removeListener('touched', ScreenScheduler._onHeadTouched);
    }
    static _onHeadTouched() {
        return __awaiter(this, void 0, void 0, function* () {
            log.info('onHeadTouched - turning screen on');
            yield BodyClient_1.default.instance.setScreen('on');
            if (ScreenScheduler._started) {
                ScreenScheduler._headTouchOff();
                ScreenScheduler.start();
            }
        });
    }
}
ScreenScheduler._started = false;
exports.default = ScreenScheduler;
BackgroundUtilsManager_1.default.register((mode, startSkill) => {
    if (mode && mode.indexOf('developer') > -1 && !startSkill) {
        ScreenScheduler.start();
    }
}, 'screen');

},{"../../clients/BodyClient":11,"../../utils/BackgroundUtilsManager":105,"../log":9}],11:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const Async_1 = require("../utils/Async");
const log_1 = require("./log");
const log = log_1.default.createChild('Body');
class BodyClient extends jibo_service_framework_1.HTTPClient {
    constructor(host, port) {
        super(host, port);
        this.host = host;
        this.port = port;
        BodyClient._instance = this;
        this._onTouchMessage = this._onTouchMessage.bind(this);
        this._clientTouch = new jibo_service_framework_1.WSClient(`ws://127.0.0.1:${port}/touch`);
        this._clientTouch.on('message', this._onTouchMessage);
        this._onPowerMessage = this._onPowerMessage.bind(this);
        this._clientPower = new jibo_service_framework_1.WSClient(`ws://127.0.0.1:${port}/power`);
        this._clientPower.on('message', this._onPowerMessage);
        this._clientPower.on('error', () => {
            log.warn(`Error opening power state socket in SSM`);
        });
    }
    static createInstance(host, port) {
        return new BodyClient(host, port);
    }
    static get instance() {
        return BodyClient._instance;
    }
    getScreen() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield Async_1.default.get(cb => {
                this.get('/screen', (err, res) => {
                    if (err) {
                        log.warn('Problem getting screen state', err);
                    }
                    else {
                        log.debug(`Got screen state: ${state}`);
                    }
                    cb(err, res);
                });
            });
            return state;
        });
    }
    setScreen(state) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Async_1.default.get(cb => {
                this.postJSON('/screen', { screen: state }, (err, res) => {
                    if (err) {
                        log.warn(`Problem setting screen state to ${state}`, err);
                    }
                    else {
                        log.debug(`Set screen state to ${state}`);
                    }
                    cb(err, res);
                });
            });
        });
    }
    _onTouchMessage(data) {
        if (data.changed.length > 0) {
            for (let i = 0; i < data.changed.length; i++) {
                if (data.pad_state[data.changed[i]]) {
                    log.debug('touched');
                    this.emit('touched');
                    return;
                }
            }
        }
        else {
            log.debug('touched, with no data');
        }
    }
    get pluggedIn() {
        const pluggedIn = this._powerState.source === 'EXTERNAL';
        log.debug(pluggedIn ? 'plugged in' : 'not plugged in');
        return pluggedIn;
    }
    _onPowerMessage(data) {
        log.debug('got power message:', data);
        this._powerState = data;
    }
}
exports.default = BodyClient;

},{"../utils/Async":104,"./log":18,"jibo-service-framework":undefined}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("./log");
const log = log_1.default.createChild('DevShell');
class DevShellClient extends jibo_service_framework_1.HTTPClient {
    constructor(host, port) {
        super(host, port);
        this.host = host;
        this.port = port;
        DevShellClient._instance = this;
    }
    static createInstance(host, port) {
        return new DevShellClient(host, port);
    }
    resetProxy(serverPort, callback) {
        this.postJSON(`/reset-proxy/${serverPort}`, {}, (err, res) => {
            log.iferr(err, 'Error posting');
            callback(err);
        });
    }
}
exports.default = DevShellClient;

},{"./log":18,"jibo-service-framework":undefined}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("./log");
const log = log_1.default.createChild('DevTools');
class DevToolsClient extends jibo_service_framework_1.HTTPClient {
    constructor(host, port) {
        super(host, port);
        this.host = host;
        this.port = port;
        DevToolsClient._instance = this;
    }
    static createInstance(host, port) {
        return new DevToolsClient(host, port);
    }
    getJson(callback) {
        this.get('/json', (err, json) => {
            log.iferr(err, 'Error getting /json');
            if (!err) {
                log.debug('Got JSON', json);
            }
            callback(err, json);
        });
    }
}
exports.default = DevToolsClient;

},{"./log":18,"jibo-service-framework":undefined}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_kb_1 = require("jibo-kb");
exports.default = new jibo_kb_1.KnowledgeBase();

},{"jibo-kb":undefined}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_1 = require("./data");
function callAsync(callback, ...args) {
    process.nextTick(() => {
        callback(...args);
    });
}
class config {
    static update(params) {
        console.log('SSC config.updaate', params);
    }
}
class Account {
    update(params, callback) {
        console.log('SSC Account.update', params);
        callAsync(callback, null);
    }
    get(params, callback) {
        if (!params.ids) {
            callAsync(callback, null, [data_1.default.accounts[1]]);
        }
        else {
            callAsync(callback, null, data_1.default.accounts);
        }
    }
}
class Loop {
    list(params, callback) {
        if (!callback && typeof params === 'function') {
            callback = params;
            params = null;
        }
        callAsync(callback, null, data_1.default.loopList);
    }
    setEnrollment(params, callback) {
        callAsync(callback, null);
    }
    suspendLoop(params, callback) {
        callAsync(callback, null);
    }
    updatePhoneticName(params, callback) {
        callAsync(callback, null);
    }
}
class Media {
    constructor() {
        this.mediaList = [];
    }
    create(params, callback) {
        let media = {};
        Object.assign(media, params);
        media.url = data_1.default.tinyjiboimage;
        this.mediaList.push(media);
        callAsync(callback, null);
    }
    list(params, callback) {
        callAsync(callback, null, this.mediaList);
    }
    get(params, callback) {
        let data = [];
        params.paths.forEach((path) => {
            this.mediaList.forEach((media) => {
                if (media.path === path) {
                    data.push(media);
                }
            });
        });
        let err;
        if (!data.length) {
            err = new Error('not found');
            err.name = 'EnoentError';
        }
        callAsync(callback, err, data);
    }
    remove(params, callback) {
        if (params && params.paths) {
            let i = this.mediaList.length;
            while (i--) {
                if (params.paths.includes(this.mediaList[i].path)) {
                    this.mediaList.splice(i, 1);
                }
            }
        }
        callAsync(callback, null, {});
    }
}
class Notification {
    connect(params, callback) {
        class Hub {
            on(name, callback) {
                return;
            }
        }
        let hub = new Hub();
        callAsync(callback, null, hub);
    }
}
class Person {
    listHolidays(params, callback) {
        callAsync(callback, null, data_1.default.holidays);
    }
}
class Robot {
    getRobot(params, callback) {
        callAsync(callback, null, data_1.default.robot);
    }
}
class Key {
}
class JSC {
}
JSC.config = config;
JSC.Account = Account;
JSC.Key = Key;
JSC.Loop = Loop;
JSC.Media = Media;
JSC.Notification = Notification;
JSC.Person = Person;
JSC.Robot = Robot;
exports.JSC = JSC;

},{"./data":16}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data = {
    tinyjiboimage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QBARXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAACKADAAQAAAABAAAACAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgACAAIAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAQEBAQEBAgEBAgMCAgIDBAMDAwMEBQQEBAQEBQYFBQUFBQUGBgYGBgYGBgcHBwcHBwgICAgICQkJCQkJCQkJCf/bAEMBAQEBAgICBAICBAkGBQYJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCf/dAAQAAf/aAAwDAQACEQMRAD8A/STxL+y5/wAFqX/4KbQftH+Bdaa88JtqVrHepPqKwW1laIjRXNmNNeItcJNKUmhuYpNqRZVxwQP292/8FG/XRP8AyH/hX3RpX/Iy6n/vR/8AoC119fsuD41rQlUVSjCfvNrmTfKml7sddILpHofxtmngpg8RSw8sPi69BqmlL2U1D2kk2nVqWg+erPTnm9ZWXY//2Q==',
    accounts: [
        { id: '58653248893333001195fde6',
            email: 'jibotestloop1@jibo.com',
            lastName: 'Jetson',
            firstName: 'George',
            gender: 'male',
            birthday: 220924800000,
            isActive: true,
            roles: ['user'],
            photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653248893333001195fde61489597840424',
            facebookConnected: false,
            messagingAllowed: false },
        { id: '5865326e893333001195fde7',
            isActive: true,
            roles: ['user'],
            facebookConnected: false,
            messagingAllowed: true },
        { id: '58653270bf9cbd0010321510',
            email: 'jibotestloop1+jane@jibo.com',
            lastName: 'Jetson',
            firstName: 'Jane',
            gender: 'female',
            birthday: 444528000000,
            isActive: true,
            roles: ['user'],
            photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653270bf9cbd00103215101489597749677',
            facebookConnected: false,
            messagingAllowed: false },
        { id: '58653270893333001195fde9',
            email: 'jibotestloop1+judy@jibo.com',
            lastName: 'Jetson',
            firstName: 'Judy',
            gender: 'female',
            birthday: 983577600000,
            isActive: true,
            roles: ['user'],
            photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653270893333001195fde91489597973020',
            facebookConnected: false,
            messagingAllowed: false },
        { id: '58653271bf9cbd0010321511',
            email: 'jibotestloop1+elroy@jibo.com',
            lastName: 'Jetson',
            firstName: 'Elroy',
            gender: 'male',
            birthday: 1065139200000,
            isActive: true,
            roles: ['user'],
            photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653271bf9cbd00103215111489598210548',
            facebookConnected: false,
            messagingAllowed: false },
        { id: '58653271893333001195fdea',
            email: 'jibotestloop1+rosie@jibo.com',
            lastName: 'Jetson',
            firstName: 'Rosie',
            gender: 'female',
            birthday: 953251200000,
            isActive: true,
            roles: ['user'],
            photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653271893333001195fdea1489597466931',
            facebookConnected: false,
            messagingAllowed: false },
        { id: '58653272bf9cbd0010321512',
            email: 'jibotestloop1+astro@jibo.com',
            lastName: 'Jetson',
            firstName: 'Astro',
            gender: 'male',
            birthday: 953078400000,
            isActive: true,
            roles: ['user'],
            photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653272bf9cbd00103215121489597172106',
            facebookConnected: false,
            messagingAllowed: false }
    ],
    loopList: [
        { id: '5865326e893333001195fde8',
            name: 'TestLoop',
            owner: '58653248893333001195fde6',
            robot: '5865326e893333001195fde7',
            robotFriendlyId: 'Fake-Not-Real-Jibo',
            members: [{ id: '58af35ef37b5e9ad4c096166',
                    loopId: '5865326e893333001195fde8',
                    accountId: '58653248893333001195fde6',
                    account: { email: 'jibotestloop1@jibo.com',
                        firstName: 'George',
                        lastName: 'Jetson',
                        gender: 'male',
                        birthday: 220924800000,
                        photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653248893333001195fde61489597840424' },
                    enrolled: { face: true, voice: true },
                    status: 'accepted',
                    type: 'incoming',
                    phoneticName: 'ghoti',
                    created: 1492555269275 },
                { id: '58af35ef37b5e9ad4c096168',
                    loopId: '5865326e893333001195fde8',
                    accountId: '58653270bf9cbd0010321510',
                    account: { email: 'jibotestloop1+jane@jibo.com',
                        firstName: 'Jane',
                        lastName: 'Jetson',
                        gender: 'female',
                        birthday: 444528000000,
                        photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653270bf9cbd00103215101489597749677' },
                    enrolled: { face: true, voice: false },
                    status: 'accepted',
                    type: 'outgoing',
                    created: 1492555269275 },
                { id: '58af35ef37b5e9ad4c096169',
                    loopId: '5865326e893333001195fde8',
                    accountId: '58653270893333001195fde9',
                    account: { email: 'jibotestloop1+judy@jibo.com',
                        firstName: 'Judy',
                        lastName: 'Jetson',
                        gender: 'female',
                        birthday: 983577600000,
                        photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653270893333001195fde91489597973020' },
                    enrolled: { face: false, voice: true },
                    status: 'accepted',
                    type: 'outgoing',
                    created: 1492555269275 },
                { id: '58af35ef37b5e9ad4c09616a',
                    loopId: '5865326e893333001195fde8',
                    accountId: '58653271bf9cbd0010321511',
                    account: { email: 'jibotestloop1+elroy@jibo.com',
                        firstName: 'Elroy',
                        lastName: 'Jetson',
                        gender: 'male',
                        birthday: 1065139200000,
                        photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653271bf9cbd00103215111489598210548' },
                    enrolled: { face: false, voice: false },
                    status: 'accepted',
                    type: 'outgoing',
                    created: 1492555269274 },
                { id: '58af35ef37b5e9ad4c09616b',
                    loopId: '5865326e893333001195fde8',
                    accountId: '58653271893333001195fdea',
                    account: { email: 'jibotestloop1+rosie@jibo.com',
                        firstName: 'Rosie',
                        lastName: 'Jetson',
                        gender: 'female',
                        birthday: 953251200000,
                        photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653271893333001195fdea1489597466931' },
                    enrolled: { face: false, voice: false },
                    status: 'accepted',
                    type: 'outgoing',
                    created: 1492555269274 },
                { id: '58af35ef37b5e9ad4c09616c',
                    loopId: '5865326e893333001195fde8',
                    accountId: '58653272bf9cbd0010321512',
                    account: { email: 'jibotestloop1+astro@jibo.com',
                        firstName: 'Astro',
                        lastName: 'Jetson',
                        gender: 'male',
                        birthday: 953078400000,
                        photoUrl: 'https://s3.amazonaws.com/com.jibo.stg.services/account/58653272bf9cbd00103215121489597172106' },
                    enrolled: { face: false, voice: false },
                    status: 'accepted',
                    type: 'outgoing',
                    created: 1492555269274 },
                { id: '591f2c2cc4fe4600156a81a6',
                    loopId: '5865326e893333001195fde8',
                    accountId: '5865326e893333001195fde7',
                    account: {},
                    enrolled: { face: false, voice: false },
                    status: 'accepted',
                    type: 'outgoing',
                    created: 1495215148087 }],
            isSuspended: false,
            created: 1483027054877,
            updated: 1495215148090 }
    ],
    holidays: [
        { id: '599dd0a45c0c9a000fb38a23',
            eventId: '7a94e07009a9f4f38dac283ddb307d6e16bbfca7d0b87637e10989c46088ad31',
            name: 'MLK Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-01-16',
            endDate: '2017-01-16',
            created: 1503514788569 },
        { id: '599dd0a45c0c9a000fb38a23',
            eventId: '3cb18542d36dec692e590f36a2f967d92ebdf5c03032f01c9bb9ed06caccb5dd',
            name: 'MLK Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-01-15',
            endDate: '2018-01-15',
            created: 1503514788569 },
        { id: '599dd0a45c0c9a000fb38a24',
            eventId: '7ac684a16913d29de0080b378e46af108be9206b33deb51db2f14896087c88bd',
            name: 'President\'s Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-02-20',
            endDate: '2017-02-20',
            created: 1503514788585 },
        { id: '599dd0a45c0c9a000fb38a24',
            eventId: 'd6ead13d0b5d78bee276f9f940b9185083c8b0c6cce6010e1c2d2a2928b7f91e',
            name: 'President\'s Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-02-19',
            endDate: '2018-02-19',
            created: 1503514788585 },
        { id: '599dd0a45c0c9a000fb38a25',
            eventId: 'c119213a58da8d101a997a35c0538b1a1ede4727594ea2feb241227106cdb002',
            name: 'Tax Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-04-17',
            endDate: '2017-04-17',
            created: 1503514788588 },
        { id: '599dd0a45c0c9a000fb38a25',
            eventId: 'e329a89a533f7e988b1038271b0ad04e79fb29878a28b729ffaede87117e75e8',
            name: 'Tax Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-04-17',
            endDate: '2018-04-17',
            created: 1503514788588 },
        { id: '599dd0a45c0c9a000fb38a26',
            eventId: '3066e36b113c8800286fa3539ea1f47e10927139f5dbf26fe025f603e03cff31',
            name: 'Memorial Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-05-29',
            endDate: '2017-05-29',
            created: 1503514788592 },
        { id: '599dd0a45c0c9a000fb38a26',
            eventId: 'cbd9991b17b4b845a437220740d2eb3cc61b073ab09ae222754e9df818852f44',
            name: 'Memorial Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-05-28',
            endDate: '2018-05-28',
            created: 1503514788592 },
        { id: '599dd0a45c0c9a000fb38a27',
            eventId: '3278e13f11d93db5ede123df6e1319f610b1c21150abbae04097a09fed6348a1',
            name: 'Flag Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-06-14',
            endDate: '2017-06-14',
            created: 1503514788593 },
        { id: '599dd0a45c0c9a000fb38a27',
            eventId: 'cd2a87acbc1dba0fd8af3bc27e56429178fd83ef250c422047bf6029587f9b13',
            name: 'Flag Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-06-14',
            endDate: '2018-06-14',
            created: 1503514788593 },
        { id: '599dd0a45c0c9a000fb38a28',
            eventId: 'e81adf0903b892d0d0c435c21476635c8c737048ec8955b1b8c511095b2bfb3c',
            name: 'Independence Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-07-04',
            endDate: '2017-07-04',
            created: 1503514788594 },
        { id: '599dd0a45c0c9a000fb38a28',
            eventId: 'aeb36ea18e23c65bd02d7c39a4335def0f521dcef2e4dc21c3a5e48c6e623e1b',
            name: 'Independence Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-07-04',
            endDate: '2018-07-04',
            created: 1503514788594 },
        { id: '599dd0a45c0c9a000fb38a29',
            eventId: 'ee99af4bec41c8081565401bfdbf4c9411c219dc52ebf897a7143b0a23d85d45',
            name: 'Labor Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-09-04',
            endDate: '2017-09-04',
            created: 1503514788602 },
        { id: '599dd0a45c0c9a000fb38a29',
            eventId: 'e6c492fdca005d0f738c6aca480f941016bec8a4cd2b5f9027912dee82970deb',
            name: 'Labor Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-09-03',
            endDate: '2018-09-03',
            created: 1503514788602 },
        { id: '599dd0a45c0c9a000fb38a2a',
            eventId: '7fc20e762b4de67186d22326dd5e791f52040d699f5b230c528ebf20ac6b391f',
            name: 'Veterans Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-11-11',
            endDate: '2017-11-11',
            created: 1503514788603 },
        { id: '599dd0a45c0c9a000fb38a2a',
            eventId: '54baa1d0322877b209a2354ee69224d9a9dc65c56a9e2a267dca6adb932f750e',
            name: 'Veterans Day',
            category: 'national',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-11-11',
            endDate: '2018-11-11',
            created: 1503514788603 },
        { id: '599dd0a45c0c9a000fb38a2b',
            eventId: 'd1e5031c6fb66a58699bb4ad9a59c8e7633394ff92b1276f9857869a242dfe00',
            name: 'New Year\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-01-01',
            endDate: '2017-01-01',
            created: 1503514788606 },
        { id: '599dd0a45c0c9a000fb38a2b',
            eventId: '339aaf23a283dc3e9a71202dbe04d0c34579859d78ac05970a7e8eb1e31e8fd8',
            name: 'New Year\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-01-01',
            endDate: '2018-01-01',
            created: 1503514788606 },
        { id: '599dd0a45c0c9a000fb38a2c',
            eventId: 'b0efcf9b3a459ceee60ea3253fe3229707f5f8fdc45ca92b64823604c40d9aef',
            name: 'Groundhog Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-02-02',
            endDate: '2017-02-02',
            created: 1503514788608 },
        { id: '599dd0a45c0c9a000fb38a2c',
            eventId: '41d5a63dfce2d11b189122312a3f245999f7f32a0b744e3ede495a7cd95efe60',
            name: 'Groundhog Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-02-02',
            endDate: '2018-02-02',
            created: 1503514788608 },
        { id: '599dd0a45c0c9a000fb38a2d',
            eventId: '4bed5f7156ecc3b0196fc409cee990a1fdc99b2e1c2f2be0c588ebf4fbc9b577',
            name: 'Valentine\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-02-14',
            endDate: '2017-02-14',
            created: 1503514788609 },
        { id: '599dd0a45c0c9a000fb38a2d',
            eventId: 'e1f05afe9bbc3c4e0f4f1315a512aa96ff9de0624d5c066253f0b9b74d2ab0db',
            name: 'Valentine\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-02-14',
            endDate: '2018-02-14',
            created: 1503514788609 },
        { id: '599dd0a45c0c9a000fb38a2e',
            eventId: '7af861c11ed77d5349b31bdde23408ce0397e2401c8e7e40454609482f43da57',
            name: 'St. Patrick\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-03-17',
            endDate: '2017-03-17',
            created: 1503514788614 },
        { id: '599dd0a45c0c9a000fb38a2e',
            eventId: 'b14a6c69909fcb56b268d6da92c31efad9d6fd1008a253f4783dc3dac37dd48d',
            name: 'St. Patrick\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-03-17',
            endDate: '2018-03-17',
            created: 1503514788614 },
        { id: '599dd0a45c0c9a000fb38a2f',
            eventId: '4c7dcf0e4244b9bf55440ce7c7ad507d599cdc44e20c0acd23a7cf0f883e4a31',
            name: 'April Fool\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-04-01',
            endDate: '2017-04-01',
            created: 1503514788617 },
        { id: '599dd0a45c0c9a000fb38a2f',
            eventId: 'f464dda8cdbc4058479f3c7cf0020978e93e97a025ec2959a3c0f1801692d0c7',
            name: 'April Fool\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-04-01',
            endDate: '2018-04-01',
            created: 1503514788617 },
        { id: '599dd0a45c0c9a000fb38a30',
            eventId: '96227bed7f7419d0c05c15a17899f49bb96426ceace4e6367b463321ea6ab149',
            name: 'Cinco de Mayo',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-05-05',
            endDate: '2017-05-05',
            created: 1503514788621 },
        { id: '599dd0a45c0c9a000fb38a30',
            eventId: 'd8cfcdbff29c6dc928048c75dabefdb0c0571b452cc606bd633ac9896f5dfab6',
            name: 'Cinco de Mayo',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-05-05',
            endDate: '2018-05-05',
            created: 1503514788621 },
        { id: '599dd0a45c0c9a000fb38a31',
            eventId: 'e322049f07a59fdb35ce08c00ecf457f8841e6ca64092d706076ad83c7016315',
            name: 'Mother\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-05-14',
            endDate: '2017-05-14',
            created: 1503514788623 },
        { id: '599dd0a45c0c9a000fb38a31',
            eventId: '0bf91422436b044e2746ab5f560b980c03935c05b3bf164f35bbb85d9d4e68e1',
            name: 'Mother\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-05-13',
            endDate: '2018-05-13',
            created: 1503514788623 },
        { id: '599dd0a45c0c9a000fb38a32',
            eventId: 'a46e5ba3e76c526edc7884072cda686d1c316823612f906ee062f8873d0ae556',
            name: 'Father\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-06-18',
            endDate: '2017-06-18',
            created: 1503514788625 },
        { id: '599dd0a45c0c9a000fb38a32',
            eventId: '87a33a245f8aa6045f46920b9edbf30df47cd75348e310b1f20e8fec2143efbb',
            name: 'Father\'s Day',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-06-17',
            endDate: '2018-06-17',
            created: 1503514788625 },
        { id: '599dd0a45c0c9a000fb38a33',
            eventId: 'ac7fea780ee02b36f05258fa5c7d0a488b4c05d314675afc06d980f937b65f25',
            name: 'Halloween',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-10-31',
            endDate: '2017-10-31',
            created: 1503514788626 },
        { id: '599dd0a45c0c9a000fb38a33',
            eventId: '2c51a4ed71e31190c94d092db60e1752bd35da216e20e32880bd0c1983139ecd',
            name: 'Halloween',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-10-31',
            endDate: '2018-10-31',
            created: 1503514788626 },
        { id: '599dd0a45c0c9a000fb38a34',
            eventId: '0d6a13e3725035780c2f12abe690586a4fc5bb13b5b129fd93d683fa70a404d5',
            name: 'Thanksgiving',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-11-23',
            endDate: '2017-11-23',
            created: 1503514788630 },
        { id: '599dd0a45c0c9a000fb38a34',
            eventId: 'a9435b6e9132992bdd643e0ba08ed702922438a04383d46a7101af766f84a5a0',
            name: 'Thanksgiving',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-11-22',
            endDate: '2018-11-22',
            created: 1503514788630 },
        { id: '599dd0a45c0c9a000fb38a35',
            eventId: '6cee1e5f3613c2335bdf5974a49b39108daee3d68625345feca32b8cda12c75f',
            name: 'New Year\'s Eve',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2017-12-31',
            endDate: '2017-12-31',
            created: 1503514788636 },
        { id: '599dd0a45c0c9a000fb38a35',
            eventId: '7c4b76a50f7fcd915ae15dc4a3077dd176595bd23e1c6c7e8eacbcd56b18e0cb',
            name: 'New Year\'s Eve',
            category: 'public',
            loopId: '5865326e893333001195fde8',
            isEnabled: true,
            date: '2018-12-31',
            endDate: '2018-12-31',
            created: 1503514788636 },
        { id: '599dd0a45c0c9a000fb38a36',
            eventId: '48f160bdd867a2d7c515a964fd02587eb001f03657b13c34556d8770b4f50d92',
            name: 'Ash Wednesday',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-03-01',
            endDate: '2017-03-01',
            created: 1503514788639 },
        { id: '599dd0a45c0c9a000fb38a36',
            eventId: 'be88f3db743b036048f300f1487c509d69ecc6428fc837d342f175095067ae44',
            name: 'Ash Wednesday',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-02-14',
            endDate: '2018-02-14',
            created: 1503514788639 },
        { id: '599dd0a45c0c9a000fb38a37',
            eventId: '8d69691d93d7df180cdda73fa7e15c40c3ce978ab80a3e781be61c4b84775f49',
            name: 'Good Friday',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-04-14',
            endDate: '2017-04-14',
            created: 1503514788640 },
        { id: '599dd0a45c0c9a000fb38a37',
            eventId: '5a971aae56887ec471445f81c6b2a100caa0c026b8e7c17b93392256b625d531',
            name: 'Good Friday',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-03-30',
            endDate: '2018-03-30',
            created: 1503514788640 },
        { id: '599dd0a45c0c9a000fb38a38',
            eventId: '94a8648c11601f7621f76d720f2179bba43b628d8c195003843b45d895217535',
            name: 'Palm Sunday',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-04-09',
            endDate: '2017-04-09',
            created: 1503514788650 },
        { id: '599dd0a45c0c9a000fb38a38',
            eventId: 'af891775000a83404cac4bc43bcad0afe9445cf2b78b27ddba2f5854a5be0aa1',
            name: 'Palm Sunday',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-03-25',
            endDate: '2018-03-25',
            created: 1503514788650 },
        { id: '599dd0a45c0c9a000fb38a39',
            eventId: '60b7054abacd3ec32f80bc068fc52bd0db2561005418244c26f704c90521be72',
            name: 'Easter',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-04-16',
            endDate: '2017-04-16',
            created: 1503514788654 },
        { id: '599dd0a45c0c9a000fb38a39',
            eventId: '08abb907a297374fe6a32a44cdf99b2eb6977b80a36dd093dd41be6bbdf3881c',
            name: 'Easter',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-04-01',
            endDate: '2018-04-01',
            created: 1503514788654 },
        { id: '599dd0a45c0c9a000fb38a3a',
            eventId: '09422b5f6d51773c7185d5ed3d0932f4bcaa6bc0f80c2f565f0fd88d2a306cec',
            name: 'Christmas',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-12-25',
            endDate: '2017-12-25',
            created: 1503514788660 },
        { id: '599dd0a45c0c9a000fb38a3a',
            eventId: '6cb73a1ceaab2257836cff8e9ee000ea42b24d745f6c2b18ce09fbee2decbfb2',
            name: 'Christmas',
            category: 'cultural',
            subcategory: 'christian',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-12-25',
            endDate: '2018-12-25',
            created: 1503514788660 },
        { id: '599dd0a45c0c9a000fb38a3b',
            eventId: '86caa73af4ccd2b7879342737cd0685e13de68f5987e231a06f11cb5d1c16794',
            name: 'Ramadan',
            category: 'cultural',
            subcategory: 'islamic',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-05-26',
            endDate: '2017-06-25',
            created: 1503514788661 },
        { id: '599dd0a45c0c9a000fb38a3b',
            eventId: 'c3384b3f35736c8b3ee653fcc5da6c48366efe7d64ca7532986b01646e8e5a40',
            name: 'Ramadan',
            category: 'cultural',
            subcategory: 'islamic',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-05-15',
            endDate: '2018-06-14',
            created: 1503514788661 },
        { id: '599dd0a45c0c9a000fb38a3c',
            eventId: '78ad73d65a8eb8b0f1a4a7d7ea63d1c1ab220259bf283f84c0e8578bb2d18382',
            name: 'Eid-al-Fitr',
            category: 'cultural',
            subcategory: 'islamic',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-06-25',
            endDate: '2017-06-25',
            created: 1503514788673 },
        { id: '599dd0a45c0c9a000fb38a3c',
            eventId: '204735c8fc475b4dd851096a53cb4b441aa32d29bd20e6c86a02bb68048a281b',
            name: 'Eid-al-Fitr',
            category: 'cultural',
            subcategory: 'islamic',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-06-15',
            endDate: '2018-06-15',
            created: 1503514788673 },
        { id: '599dd0a45c0c9a000fb38a3d',
            eventId: 'bad9e23685abeccba54d933eebfb7bb4c0aadb8fb5011b0eff5ec9cf348fcb17',
            name: 'Purim',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-03-11',
            endDate: '2017-03-12',
            created: 1503514788674 },
        { id: '599dd0a45c0c9a000fb38a3d',
            eventId: 'ae77078a19bf83bc6ad45447932a5b75e292545b1a899089c5383d4f66d9373d',
            name: 'Purim',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-02-28',
            endDate: '2018-03-01',
            created: 1503514788674 },
        { id: '599dd0a45c0c9a000fb38a3e',
            eventId: '9219f7957af11f08a04b43d18b926437361cff25067387ba30ba7237223969b4',
            name: 'Passover',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-04-10',
            endDate: '2017-04-18',
            created: 1503514788684 },
        { id: '599dd0a45c0c9a000fb38a3e',
            eventId: 'a2e63edf479ed708819aeed0825b980a341737ca8f1041acdfa2011baeb87478',
            name: 'Passover',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-03-30',
            endDate: '2018-04-07',
            created: 1503514788684 },
        { id: '599dd0a45c0c9a000fb38a3f',
            eventId: '25203316a5fb6c8aaccbd3f649b0c48fb7edc8eb7ac1c992f1e89047f465a075',
            name: 'Rosh Hashanah',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-09-20',
            endDate: '2017-09-22',
            created: 1503514788695 },
        { id: '599dd0a45c0c9a000fb38a3f',
            eventId: 'cbb1e4fb05ff0af6ba59c103cf29c961a87d96c9d60268f8687bcf2a711780eb',
            name: 'Rosh Hashanah',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-09-09',
            endDate: '2018-09-11',
            created: 1503514788695 },
        { id: '599dd0a45c0c9a000fb38a40',
            eventId: '306411dc3a68611ea2f26d5cb7d0660c1135fb3f8a5e895edaa48c678ae5d7e1',
            name: 'Yom Kippur',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-09-29',
            endDate: '2017-09-30',
            created: 1503514788698 },
        { id: '599dd0a45c0c9a000fb38a40',
            eventId: '8f83d2cc5988d6f81f7900e67043d0ee0250b5888d51e58e075568a281b91cfa',
            name: 'Yom Kippur',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-09-18',
            endDate: '2018-09-19',
            created: 1503514788698 },
        { id: '599dd0a45c0c9a000fb38a41',
            eventId: 'b2cb05d111a37e242cdb0720fb41978fa0557bd5543b2cbd962d5a50d19236e1',
            name: 'Sukkot',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-10-04',
            endDate: '2017-10-11',
            created: 1503514788701 },
        { id: '599dd0a45c0c9a000fb38a41',
            eventId: '0db86c84fc7172163c13b5c1025b1b8a70ed3279ff3165d79084f7c29a8603c6',
            name: 'Sukkot',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-09-23',
            endDate: '2018-09-30',
            created: 1503514788701 },
        { id: '599dd0a45c0c9a000fb38a42',
            eventId: '66020aee8a2133a00d69aee7a3abae5cb1b5efbadf096073a470644bd6ea2a86',
            name: 'Hanukkah',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-12-12',
            endDate: '2017-12-20',
            created: 1503514788703 },
        { id: '599dd0a45c0c9a000fb38a42',
            eventId: 'e5b5714c752a1cf0200c40e6bc0acb7629a854fcddd36a822ac67098ac52b837',
            name: 'Hanukkah',
            category: 'cultural',
            subcategory: 'hebrew',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-12-02',
            endDate: '2018-12-10',
            created: 1503514788703 },
        { id: '599dd0a45c0c9a000fb38a43',
            eventId: '1a35fa7778d94fe93e89fba077092549b6601faf613a689018b3bfbf8a2b6caf',
            name: 'Kwanzaa',
            category: 'cultural',
            subcategory: 'african',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-12-26',
            endDate: '2018-01-01',
            created: 1503514788705 },
        { id: '599dd0a45c0c9a000fb38a43',
            eventId: '3bf878696392657f681c43dc950a1c5817205dfd6330301e8ee9b96f36befa9d',
            name: 'Kwanzaa',
            category: 'cultural',
            subcategory: 'african',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-12-26',
            endDate: '2019-01-01',
            created: 1503514788705 },
        { id: '599dd0a45c0c9a000fb38a44',
            eventId: 'a61790d493995d6ee07b476db0eea46fa489dcfe8c13b73f8de293b3c37aa359',
            name: 'Chinese New Year',
            category: 'cultural',
            subcategory: 'chinese',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2017-01-28',
            endDate: '2017-01-28',
            created: 1503514788711 },
        { id: '599dd0a45c0c9a000fb38a44',
            eventId: 'fbe812f56406c1ef58e0c0cb5052959ed2c2d69633f46fdf05410ac2349cc096',
            name: 'Chinese New Year',
            category: 'cultural',
            subcategory: 'chinese',
            loopId: '5865326e893333001195fde8',
            isEnabled: false,
            date: '2018-02-16',
            endDate: '2018-02-16',
            created: 1503514788711 },
        { id: '58af36ac03d0fa0010e9e148',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d63c',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c096166',
            isEnabled: true,
            date: '1977-01-01',
            endDate: '1977-01-01',
            created: 1487877804706 },
        { id: '58af36ac03d0fa0010e9e149',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d630',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c096168',
            isEnabled: true,
            date: '1984-02-02',
            endDate: '1984-02-02',
            created: 1487877804723 },
        { id: '58af36ac03d0fa0010e9e14a',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d631',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c096169',
            isEnabled: true,
            date: '2001-03-03',
            endDate: '2001-03-03',
            created: 1487877804726 },
        { id: '58af36ac03d0fa0010e9e14b',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d632',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c09616a',
            isEnabled: true,
            date: '2003-10-03',
            endDate: '2003-10-03',
            created: 1487877804729 },
        { id: '58af36ac03d0fa0010e9e14c',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d633',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c09616b',
            isEnabled: true,
            date: '2000-03-17',
            endDate: '2000-03-17',
            created: 1487877804730 },
        { id: '58af36ac03d0fa0010e9e14d',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d634',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c09616c',
            isEnabled: true,
            date: '2000-03-15',
            endDate: '2000-03-15',
            created: 1487877804731 },
        { id: '58af36ac03d0fa0010e9e14e',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d635',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c096166',
            isEnabled: true,
            date: '1977-01-01',
            endDate: '1977-01-01',
            created: 1487877804733 },
        { id: '58af36ac03d0fa0010e9e14f',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d636',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c096168',
            isEnabled: true,
            date: '1984-02-02',
            endDate: '1984-02-02',
            created: 1487877804735 },
        { id: '58af36ac03d0fa0010e9e150',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d637',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c096169',
            isEnabled: true,
            date: '2001-03-03',
            endDate: '2001-03-03',
            created: 1487877804736 },
        { id: '58af36ac03d0fa0010e9e151',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d638',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c09616a',
            isEnabled: true,
            date: '2003-10-03',
            endDate: '2003-10-03',
            created: 1487877804738 },
        { id: '58af36ac03d0fa0010e9e152',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d639',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c09616b',
            isEnabled: true,
            date: '2000-03-17',
            endDate: '2000-03-17',
            created: 1487877804740 },
        { id: '58af36ac03d0fa0010e9e153',
            eventId: 'da1ae16d8de4487c434360eab05331f998431c6681857841e685966cce49d63a',
            category: 'birthday',
            loopId: '5865326e893333001195fde8',
            memberId: '58af35ef37b5e9ad4c09616c',
            isEnabled: true,
            date: '2000-03-15',
            endDate: '2000-03-15',
            created: 1487877804743 },
    ],
    robot: {
        id: 'Fake-Not-Real-Jibo',
        payload: {
            avatar: 2,
            serialNumber: 'd4561660-3a79-441e-9b24-3f4800a3f368',
            platform: '7.1.1',
            connectedAt: 1496239558492,
            SSID: 'WiFiNetworkName',
        },
        updated: 1498492962389,
        created: 1471288263073
    },
};
exports.default = data;

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
try {
    if (process.env.JIBO_JSCMODE === 'SIMULATOR') {
        console.warn('JIBO_JSCMODE=SIMULATOR mode, forcing use of simulator server client');
        throw new Error('forcing use of simulator server client');
    }
    exports.JSC =
        require('@jibo/jibo-server-client');
}
catch (err) {
    console.warn('using simulated server client');
    exports.JSC = require('./JiboServerClient').JSC;
}

},{"./JiboServerClient":15,"@jibo/jibo-server-client":undefined}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Client');

},{"../log":20}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_client_framework_1 = require("jibo-client-framework");
const jibo_service_clients_1 = require("jibo-service-clients");
class GetConfig {
    getConfig(callback) {
        jibo_client_framework_1.SystemManagerClient.createInstance('127.0.0.1', 8585);
        jibo_service_clients_1.systemManager.httpInterface = 'http://127.0.0.1:8585';
        jibo_service_clients_1.systemManager.getMode((error, mode) => {
            if (error) {
                return callback(error);
            }
            callback(null, `/usr/local/etc/jibo-ssm/jibo-ssm-${mode}.json`, mode);
        });
    }
}
exports.default = GetConfig;

},{"jibo-client-framework":undefined,"jibo-service-clients":undefined}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_log_1 = require("jibo-log");
const log = new jibo_log_1.Log('SSM');
exports.default = log;

},{"jibo-log":undefined}],21:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_expression_client_1 = require("jibo-expression-client");
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_service_clients_1 = require("jibo-service-clients");
const log_1 = require("./log");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const SkillsService_1 = require("../skills/SkillsService");
const jibo_client_framework_1 = require("jibo-client-framework");
const child_process_1 = require("child_process");
const TcpProxy_1 = require("./TcpProxy");
const JetstreamServiceSim_1 = require("../../sim-services/jetstream/JetstreamServiceSim");
const TTSService_1 = require("../../sim-services/tts/TTSService");
const fs = require("fs");
const JiboSync = require("jibo-sync");
const path = require("path");
const rimraf = require("rimraf");
const uuidv4 = require("uuid/v4");
const RunMode_1 = require("../../utils/RunMode");
var TcpProxy_2 = require("./TcpProxy");
exports.TcpProxy = TcpProxy_2.TcpProxy;
const TTSPromptParser_1 = require("../../sim-services/tts/TTSPromptParser");
const prfyTo = jibo_cai_utils_1.PromiseUtils.promisifyTo;
global.JetstreamServiceSim = JetstreamServiceSim_1.default;
class DevShell extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('dev-shell', options, rootDir);
        this._syncSkill = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.info('Syncing skill');
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            const dest = path.join(this._skillDest, data.dirName);
            const verbose = true;
            log_1.default.debug('creating sync server', this._syncPort, dest, verbose);
            const jiboSyncLog = log_1.default.createChild('Server');
            try {
                this._syncPort = yield JiboSync.createServer(this._syncPort, dest, this._skillUser, this._skillLimit, verbose, jiboSyncLog);
            }
            catch (err) {
                return this._sendError(res, err);
            }
            log_1.default.debug(`Sync server started successfully on port ${this._syncPort}`);
            this.sendJson(res, 'Sync server started successfully');
        });
        this._startSkill = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.debug('Starting skill called');
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            log_1.default.debug('_startSkill got parsed request', data);
            let skillName = data.dirName;
            log_1.default.debug(`Checking if skill ${skillName} exists`);
            const [skillListErr, skillList] = yield prfyTo(cb => jibo_client_framework_1.SystemManagerClient.instance.list(cb));
            if (skillListErr) {
                log_1.default.warn('Error getting skill list', skillListErr);
                return this._sendError(res, `Error getting list of skills`);
            }
            const skill = skillList.find(skill => skill.name === skillName);
            if (!skill) {
                log_1.default.info(`Skill ${skillName} not found`);
                return this._sendError(res, `Skill ${skillName} not found`, 404);
            }
            log_1.default.debug('Calling SkillsService.instance.launch', skillName);
            const [launchErr] = yield prfyTo(cb => SkillsService_1.default.instance.launch(skillName, {}, cb));
            if (launchErr) {
                log_1.default.warn(`Error starting ${skillName}`, launchErr);
                return this._sendError(res, `Error starting "${skillName}"\n${launchErr.message || launchErr}`);
            }
            log_1.default.debug(`Skill "${skillName}" started successfully`);
            this.sendJson(res, `Skill "${skillName}" started successfully`);
        });
        this._stopSkill = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.debug('Stopping skill');
            const [terminateErr] = yield prfyTo(cb => SkillsService_1.default.instance.terminate(cb));
            if (terminateErr) {
                log_1.default.warn('Skill stop failed', terminateErr);
                return this._sendError(res, `Error stopping: ${terminateErr}`);
            }
            log_1.default.debug('Stopped skill successfully');
            this.sendJson(res, 'Stopped skill successfully.');
        });
        this._deleteSkill = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.info('Deleting skill');
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            const name = data.dirName;
            const dest = path.join(this._skillDest, name);
            const [accessErr] = yield prfyTo(cb => fs.access(dest, fs.constants.W_OK, cb));
            if (accessErr) {
                const message = `Skill ${name} not installed.`;
                log_1.default.info(message, accessErr);
                this._sendError(res, message, 400);
            }
            const [rimrafErr] = yield prfyTo(cb => rimraf(dest, cb));
            if (rimrafErr) {
                const message = `Error deleting skill ${name}`;
                log_1.default.error(message, rimrafErr);
                return this._sendError(res, message);
            }
            if (name.startsWith('@')) {
                const nsDir = path.resolve(path.join(dest, '..'));
                const [nsListErr, nsList] = yield prfyTo(cb => fs.readdir(nsDir, cb));
                if (nsListErr) {
                    const message = `Skill removed, but could not read contents of namespace dir ${nsDir}`;
                    log_1.default.warn(message, nsListErr);
                    return this._sendError(res, message);
                }
                if (nsList.length < 1) {
                    const [rmdirErr] = yield prfyTo(cb => fs.rmdir(nsDir, cb));
                    if (rmdirErr) {
                        const message = `Skill removed, but could not remove empty namespace dir ${nsDir}`;
                        log_1.default.warn(message, rmdirErr);
                        return this._sendError(res, message);
                    }
                }
                else {
                    log_1.default.info(`Namespace dir ${nsDir} is not empty, so leaving it in place`);
                }
            }
            log_1.default.debug(`Skill ${name} deleted successfully.`);
            this.sendJson(res, 'Skill deleted successfully.');
        });
        this._deleteAllSkills = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.info("Deleting all skills");
            const [rimrafErr] = yield prfyTo(cb => rimraf(this._skillDest, cb));
            if (rimrafErr) {
                const message = 'Error deleting all skills';
                log_1.default.error(message, rimrafErr);
                this._sendError(res, message);
            }
            const message = 'All skills deleted successfully.';
            log_1.default.debug(message);
            this.sendJson(res, message);
        });
        this._diskSpace = (req, res) => {
            log_1.default.info('Retrieving disk space');
            const command = path.join(this.rootDir, this._sdkDest + 'disk-space.sh');
            const proc = child_process_1.spawn('sh', [`${command}`, `${this._skillDest}`]);
            let data = `not found: ${command}`;
            proc.stdout.on('data', (_data) => {
                data = _data;
            });
            proc.on('exit', () => {
                const message = `Diskspace Usage [${this._skillDest}]:\n\n`;
                log_1.default.debug(message, data);
                this.sendJson(res, `${message} ${data}`);
            });
        };
        this._reboot = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            if (data.mode) {
                log_1.default.debug(`Setting robot mode to ${data.mode}.`);
                const [setModeErr] = yield prfyTo(cb => jibo_service_clients_1.systemManager.setMode(data.mode, cb));
                if (setModeErr) {
                    const message = `Could not set mode to ${data.mode}.`;
                    log_1.default.error(message, setModeErr);
                    return this._sendError(res, message);
                }
                log_1.default.info(`Set robot mode to ${data.mode}.`);
            }
            log_1.default.info('Rebooting');
            const [rebootErr] = yield prfyTo(cb => jibo_service_clients_1.systemManager.reboot(cb));
            if (rebootErr) {
                const message = 'Error trying to reboot';
                log_1.default.warn(message, rebootErr);
                return this._sendError(res, message);
            }
            log_1.default.debug('Rebooting...');
            this.sendJson(res, 'Rebooting...');
        });
        this._poweroff = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.info('Powering off');
            const [powerOffErr] = yield prfyTo(cb => jibo_service_clients_1.systemManager.poweroff(cb));
            if (powerOffErr) {
                const message = 'Error trying to power off';
                log_1.default.warn(message, powerOffErr);
                return this._sendError(res, message);
            }
            log_1.default.debug('Powering off...');
            this.sendJson(res, 'Powering off...');
        });
        this._getVersion = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.info('Retrieving version');
            const [versionErr, version] = yield prfyTo(cb => jibo_service_clients_1.systemManager.getVersion(cb));
            if (versionErr) {
                const message = 'Error trying to get version';
                log_1.default.warn(message, versionErr);
                return this._sendError(res, message);
            }
            this.sendJson(res, version);
        });
        this._index = (req, res) => {
            log_1.default.info('Indexing');
            return jibo_expression_client_1.expression.indexRobot()
                .then(result => {
                log_1.default.debug('Index result', result);
                if (result === 'FAULT') {
                    throw new Error('Problem indexing robot.');
                }
                const message = result === 'SUCCEEDED'
                    ? 'Robot is indexed.'
                    : 'Robot indexing timed out.';
                this.sendJson(res, message);
            })
                .catch(err => {
                const message = 'Problem indexing robot.';
                log_1.default.error(message, err);
                this._sendError(res, message);
            });
        };
        this._getVolume = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.info('Getting volume');
            const [volumeErr, volume] = yield prfyTo(cb => jibo_service_clients_1.system.getMasterVolume(cb));
            if (volumeErr) {
                const message = 'Could not get volume';
                log_1.default.warn(message, volumeErr);
                return this._sendError(res, message);
            }
            log_1.default.warn(`Master volume is ${volume.toFixed(2)} [0.0-1.0]`);
            this.sendJson(res, `${volume.toFixed(2)} [0.0-1.0]`);
        });
        this._setVolume = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.info('Setting volume');
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                this._sendError(res, parseErr, 400);
            }
            const volume = data.volume;
            const [volumeErr] = yield prfyTo(cb => jibo_service_clients_1.system.setMasterVolume(volume, cb));
            if (volumeErr) {
                const message = 'Cannot set master volume';
                log_1.default.warn(message, volumeErr);
                return this._sendError(res, `${message} (${volumeErr})`);
            }
            log_1.default.warn('Master volume set', volume.toFixed(2));
            this.sendJson(res, volume.toFixed(2));
        });
        this._checkForUpdates = (req, res) => __awaiter(this, void 0, void 0, function* () {
            log_1.default.info('Checking for updates');
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                this._sendError(res, parseErr, 400);
            }
            const [checkErr, updates] = yield prfyTo(cb => jibo_service_clients_1.systemManager.checkForUpdates(cb, data.filter));
            if (checkErr) {
                log_1.default.warn('System Manager checkForUpdates failed', checkErr);
                return this._sendError(res, checkErr.message || checkErr);
            }
            if (!updates) {
                const message = 'Service temporarily unavilable';
                log_1.default.warn(message);
                return this._sendError(res, message);
            }
            const ids = updates.map(update => `\n${update.id}: ${update.changes}${update.downloaded ? ' [DOWNLOADED]' : ''}`).join('');
            const msg = `Found ${updates.length} update${updates.length === 1 ? '' : 's'}${ids}`;
            log_1.default.info(msg, updates);
            this.sendJson(res, { msg, updates });
        });
        this._downloadUpdates = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            log_1.default.info('Downloading updates', data);
            yield new Promise((resolve, reject) => {
                jibo_service_clients_1.systemManager.downloadUpdates(data, (dlErr, dlData) => {
                    if (dlErr) {
                        log_1.default.warn('Error downloading OTA updates', dlErr);
                        this._sendError(res, `Error downloading OTA updates: ${dlErr.message || dlErr}`);
                        return reject();
                    }
                    if (dlData.status === 'failed') {
                        log_1.default.warn('Download failed', dlData.reason);
                        this._sendError(res, dlData.reason);
                        return reject();
                    }
                    log_1.default.debug('Download update', dlData);
                    if (dlData.status === 'downloading') {
                        if (this._otaSocket) {
                            log_1.default.debug('Sending websocket update');
                            this.sendWsJson(this._otaSocket, dlData);
                        }
                    }
                    else {
                        log_1.default.info('OTA updates downloaded', dlData);
                        this.sendJson(res, dlData);
                        resolve();
                    }
                });
            });
        });
        this._installUpdates = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            log_1.default.info('Installing updates', data);
            const [updateErr] = yield prfyTo(cb => jibo_service_clients_1.systemManager.installUpdates(data, cb));
            if (updateErr) {
                const message = 'Error installing OTA updates';
                log_1.default.warn(message, updateErr);
                return this._sendError(res, message);
            }
            log_1.default.debug('OTA updates installing');
            this.sendJson(res, 'Installing OTA updates! Robot will reboot a handful of times in between installations. Go get a snack.');
        });
        this._resetProxy = (req, res) => {
            let serverPort = req.params.serverPort;
            log_1.default.debug(`Resetting proxy server on port ${serverPort}`);
            TcpProxy_1.TcpProxy.closeAllSocketsForServer(serverPort);
            this.finishNoContent(res);
        };
        this._wifiList = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [err, networks] = yield prfyTo(cb => jibo_service_clients_1.wifi.getSavedNetworks(cb));
            if (err) {
                const message = 'Error getting list of WiFi networks';
                log_1.default.warn(message, err);
                return this._sendError(res, new Error(message));
            }
            return this.sendJson(res, networks);
        });
        this._wifiCurrent = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [err, network] = yield prfyTo(cb => jibo_service_clients_1.wifi.getCurrentNetwork(cb));
            if (err) {
                const message = 'Error getting current WiFi network';
                log_1.default.warn(message, err);
                return this._sendError(res, new Error(message));
            }
            return this.sendJson(res, network);
        });
        this._wifiVerify = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [err, message] = yield prfyTo(cb => jibo_service_clients_1.wifi.verifyConnection(cb));
            if (err) {
                const message = 'Error verifying current WiFi network';
                log_1.default.warn(message, err);
                return this._sendError(res, new Error(message));
            }
            return this.sendJson(res, message);
        });
        this._wifiSelect = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            if (!data.ssid) {
                return this._sendError(res, new Error('ssid is required'), 400);
            }
            const [getErr, networks] = yield prfyTo(cb => jibo_service_clients_1.wifi.getSavedNetworks(cb));
            if (getErr) {
                const message = 'Error getting existing WiFi networks';
                log_1.default.warn(message, getErr);
                return this._sendError(res, new Error(message));
            }
            const existingNetwork = networks.find(network => network.ssid === data.ssid);
            if (!existingNetwork) {
                const message = `WiFi network ${data.ssid} not found`;
                log_1.default.warn(message);
                return this._sendError(res, new Error(message), 400);
            }
            if (existingNetwork.current) {
                const message = `WiFi network ${data.ssid} is already selected`;
                log_1.default.info(message);
                return this._sendError(res, new Error(message), 400);
            }
            const [selectErr] = yield prfyTo(cb => jibo_service_clients_1.wifi.selectNetwork(data.ssid, cb));
            if (selectErr) {
                const message = 'Error selecting WiFi network';
                log_1.default.warn(message, selectErr);
                return this._sendError(res, new Error(message));
            }
            return this.finishNoContent(res);
        });
        this._wifiAdd = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            const { dns1, dns2, gateway, netmask, pswd, ssid, staticIP, } = data;
            const hidden = 0;
            const staticSettings = data.staticIP
                ? { staticIP, gateway, netmask, dns1, dns2 }
                : null;
            const networkType = staticSettings ? 1 : 0;
            const security = pswd && pswd.length > 0 ? 'WPA-PSK' : 'NONE';
            const wifiConfig = {
                hidden,
                networkType,
                pswd,
                security,
                ssid,
                staticSettings,
            };
            const [getErr, networks] = yield prfyTo(cb => jibo_service_clients_1.wifi.getSavedNetworks(cb));
            if (getErr) {
                const message = 'Error getting existing WiFi networks';
                log_1.default.warn(message, getErr);
                return this._sendError(res, new Error(message));
            }
            const existingNetwork = networks.find(network => wifiConfig.ssid === network.ssid);
            if (existingNetwork) {
                log_1.default.debug('removing network before adding because new SSID matches old SSID');
                const [removeErr] = yield prfyTo(cb => jibo_service_clients_1.wifi.removeNetwork(existingNetwork.ssid, cb));
                if (removeErr) {
                    log_1.default.warn('Error removing existing WiFi network', removeErr);
                }
            }
            const [currentNetworkErr, currentNetwork] = yield prfyTo(cb => jibo_service_clients_1.wifi.getCurrentNetwork(cb));
            if (currentNetworkErr) {
                log_1.default.warn('Error getting current WiFi network', currentNetworkErr);
            }
            const [addErr] = yield prfyTo(cb => jibo_service_clients_1.wifi.addNetwork(wifiConfig, 30, cb));
            if (addErr) {
                const message = 'Error adding new WiFi network';
                log_1.default.warn(message, addErr);
                if (currentNetwork) {
                    const [reconnectErr] = yield prfyTo(cb => jibo_service_clients_1.wifi.selectNetwork(currentNetwork.ssid, cb));
                    if (reconnectErr) {
                        log_1.default.warn(`Error reconnecting to old network ${currentNetwork.ssid}`, reconnectErr);
                    }
                }
                return this._sendError(res, new Error(message));
            }
            const [connectedErr, connected] = yield prfyTo(cb => jibo_service_clients_1.wifi.verifyConnection(cb));
            if (connectedErr) {
                log_1.default.warn('Error verifying connection', connectedErr);
            }
            if (currentNetwork && !connected) {
                const [reconnectErr] = yield prfyTo(cb => jibo_service_clients_1.wifi.selectNetwork(currentNetwork.ssid, cb));
                if (reconnectErr) {
                    log_1.default.warn(`Error reconnecting to old network ${currentNetwork.ssid}`, reconnectErr);
                }
            }
            this.finishNoContent(res);
        });
        this._wifiRemove = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [parseErr, data] = yield prfyTo(cb => this.parseBody(req, cb));
            if (parseErr) {
                return this._sendError(res, parseErr, 400);
            }
            if (!data.ssid) {
                return this._sendError(res, new Error('ssid is required'), 400);
            }
            const [getErr, networks] = yield prfyTo(cb => jibo_service_clients_1.wifi.getSavedNetworks(cb));
            if (getErr) {
                const message = 'Error getting existing WiFi networks';
                log_1.default.warn(message, getErr);
                return this._sendError(res, new Error(message));
            }
            if (!networks.find(network => network.ssid === data.ssid)) {
                const message = `WiFi network ${data.ssid} not found`;
                log_1.default.warn(message);
                return this._sendError(res, new Error(message), 400);
            }
            const [currentErr, currentNetwork] = yield prfyTo(cb => jibo_service_clients_1.wifi.getCurrentNetwork(cb));
            if (currentErr) {
                const message = 'Error getting current WiFi network';
                log_1.default.warn(message, currentErr);
                return this._sendError(res, new Error(message));
            }
            if (currentNetwork.ssid === data.ssid) {
                const message = `Cannot delete ${data.ssid} because it is the currently-connected network`;
                log_1.default.info(message);
                return this._sendError(res, new Error(message), 400);
            }
            const [removeErr] = yield prfyTo(cb => jibo_service_clients_1.wifi.removeNetwork(data.ssid, cb));
            if (removeErr) {
                const message = 'Error removing WiFi network';
                log_1.default.warn(message, removeErr);
                return this._sendError(res, new Error(message));
            }
            return this.finishNoContent(res);
        });
        this._say = (words, heyJibo, speaker, speakerId) => {
            TTSService_1.default.instance.setMode(TTSPromptParser_1.TTSPlaybackMode.Test);
            words = words.toLowerCase().trim().replace(/[\|&;\$%@"#<>\(\)\+,?.]/g, "");
            if (heyJibo) {
                JetstreamServiceSim_1.default.instance.onWordsReceived({
                    words: "hey jibo",
                    final: false,
                    speaker: speaker,
                    speakerId: speakerId
                });
                words = "hey jibo " + words;
            }
            JetstreamServiceSim_1.default.instance.onWordsReceived({
                words: words,
                final: true,
                speaker: speaker,
                speakerId: speakerId
            });
            global.chatView.refs.chat.messageHandler({
                words: words,
                speaker: speakerId
            });
            log_1.default.debug(`Attempting to generate speech:`, words, speakerId);
        };
        this._speak = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const [parseErr, json] = yield prfyTo(cb => this.parseBody(req, cb));
                if (parseErr) {
                    throw new Error("Couldn't parse payload");
                }
                this._say(json.words, json.heyJibo, json.speaker, json.speakerId);
                this.sendJson(res, {
                    success: true
                });
            }
            catch (error) {
                this._sendError(res, error);
            }
        });
        this._execute = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const [parseErr, json] = yield prfyTo(cb => this.parseBody(req, cb));
                if (parseErr) {
                    throw new Error("Couldn't parse payload");
                }
                this._sendExecuteMessage(json.script, (result) => {
                    this.sendJson(res, {
                        result: result.result,
                        success: result.success,
                        error: result.error
                    });
                });
            }
            catch (error) {
                this._sendError(res, error);
            }
        });
        if (DevShell._instance) {
            throw new Error('Cannot instantiate DevShell more than once');
        }
        log_1.default.debug('constructor', options);
        DevShell._instance = this;
        this._skillDest = options.skillDest;
        this._skillUser = options.skillUser;
        this._skillLimit = options.skillLimit;
        this._sdkDest = options.sdkDest;
        this._syncPort = options.syncPort;
        this._otaSocket = null;
        this._autobotSocket = null;
        this._executeCallbacks = [];
        log_1.default.info('Instantiated');
    }
    static get instance() {
        return DevShell._instance;
    }
    init(callback) {
        log_1.default.debug('init');
        super.init((err) => {
            if (err) {
                log_1.default.warn('Error during init', err);
                return callback(err);
            }
            this.server.timeout = 0;
            log_1.default.info('Initialized');
            callback();
        });
    }
    routes(url) {
        super.routes(url);
        if (process.env.RUNMODE === RunMode_1.default.RunMode.SIMULATOR) {
            url.post('/speak', this._speak);
        }
        url.post('/execute', this._execute);
        if (process.env.RUNMODE === RunMode_1.default.RunMode.ON_ROBOT) {
            url.post('/check-update', this._checkForUpdates);
            url.post('/delete-skill', this._deleteSkill);
            url.post('/delete-all', this._deleteAllSkills);
            url.post('/diskspace', this._diskSpace);
            url.post('/download-update', this._downloadUpdates);
            url.post('/getvolume', this._getVolume);
            url.post('/index', this._index);
            url.post('/install-update', this._installUpdates);
            url.post('/run', this._startSkill);
            url.post('/poweroff', this._poweroff);
            url.post('/reboot', this._reboot);
            url.post('/reset-proxy/:serverPort', this._resetProxy);
            url.post('/setvolume', this._setVolume);
            url.post('/stop', this._stopSkill);
            url.post('/sync-skill', this._syncSkill);
            url.post('/version', this._getVersion);
            url.post('/wifi-list', this._wifiList);
            url.post('/wifi-current', this._wifiCurrent);
            url.post('/wifi-verify', this._wifiVerify);
            url.post('/wifi-select', this._wifiSelect);
            url.post('/wifi-add', this._wifiAdd);
            url.post('/wifi-remove', this._wifiRemove);
        }
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        if (client.url === '/download-update') {
            log_1.default.debug('Opening OTA download socket');
            this._otaSocket = client;
        }
        else if (client.url === '/autobot') {
            this._autobotSocket = client;
        }
    }
    onClose(client) {
        if (client === this._otaSocket) {
            log_1.default.debug('Closing OTA download socket');
            this._otaSocket = undefined;
        }
        if (client === this._autobotSocket) {
            this._autobotSocket = null;
        }
    }
    onMessage(command, client) {
        if (command.command === 'execute') {
            this._sendExecuteMessage(command.script, (result) => {
                if (this._autobotSocket) {
                    this.sendWsJson(this._autobotSocket, {
                        command: 'execute-result',
                        result: result.result,
                        success: result.success,
                        error: result.error
                    });
                }
            });
        }
        else if (command.command === 'speak') {
            this._say(command.words, command.heyJibo, command.speaker, command.speakerId);
            this.sendWsJson(client, {
                command: 'speak-result',
                success: true
            });
        }
        else if (command.command === 'execute-result') {
            this._executeCallbacks[command.id](command);
        }
        else if (command.command === 'autobot-log') {
            if (this._autobotSocket) {
                this.sendWsJson(this._autobotSocket, command);
            }
        }
        return;
    }
    _sendError(res, err, statusCode = 500) {
        this.finish(res, err, null, null, statusCode);
    }
    _sendExecuteMessage(script, cb) {
        const id = uuidv4();
        this.connections.forEach((connection) => {
            if (connection === this._autobotSocket || connection === this._otaSocket) {
                return;
            }
            this.sendWsJson(connection, {
                command: "execute",
                id,
                script
            });
        });
        log_1.default.debug(`Attempting to execute remote skill script: ${script}`);
        this._executeCallbacks[id] = (result) => {
            cb(result);
            delete this._executeCallbacks[id];
        };
    }
}
exports.default = DevShell;

},{"../../sim-services/jetstream/JetstreamServiceSim":87,"../../sim-services/tts/TTSPromptParser":102,"../../sim-services/tts/TTSService":103,"../../utils/RunMode":108,"../skills/SkillsService":65,"./TcpProxy":22,"./log":23,"child_process":undefined,"fs":undefined,"jibo-cai-utils":undefined,"jibo-client-framework":undefined,"jibo-expression-client":undefined,"jibo-service-clients":undefined,"jibo-service-framework":undefined,"jibo-sync":undefined,"path":undefined,"rimraf":undefined,"uuid/v4":undefined}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const EventEmitter = require("events");
const log_1 = require("./log");
const log = log_1.default.createChild('TcpProxy');
class ProxyClient extends EventEmitter {
    constructor(targetPort, serverSocket) {
        super();
        this.targetPort = targetPort;
        this.serverSocket = serverSocket;
    }
    start(callback) {
        this.clientSocket = net.connect({
            host: '0.0.0.0',
            port: this.targetPort
        });
        this.clientSocket.on('close', () => {
            this.emit('close', this);
            log.debug(`ProxyClient for port ${this.targetPort} closed`);
        });
        this.clientSocket.on('error', err => log.debug(`ProxyClient for port ${this.targetPort} error`, err));
        this.clientSocket.on('end', () => log.debug(`ProxyClient for port ${this.targetPort} ended`));
        this.clientSocket.pipe(this.serverSocket);
        this.serverSocket.pipe(this.clientSocket);
        if (callback) {
            callback();
        }
    }
    destroySockets() {
        if (this.clientSocket) {
            try {
                this.clientSocket.destroy();
            }
            catch (e) {
                log.debug('problem destroying client socket, ignoring');
            }
            this.clientSocket = null;
        }
        if (this.serverSocket) {
            try {
                this.serverSocket.destroy();
            }
            catch (e) {
                log.debug('problem destroying server socket, ignoring');
            }
            this.serverSocket = null;
        }
    }
}
class TcpProxy {
    constructor(targetPort, serverPort) {
        this.targetPort = targetPort;
        this.serverPort = serverPort;
    }
    static addClient(client, serverPort) {
        TcpProxy.clientList[serverPort] = TcpProxy.clientList[serverPort] || [];
        TcpProxy.clientList[serverPort].push(client);
    }
    static removeClient(client, serverPort) {
        TcpProxy.clientList[serverPort] = TcpProxy.clientList[serverPort].filter(element => element !== client);
    }
    static closeAllSocketsForServer(serverPort) {
        const list = TcpProxy.clientList[serverPort];
        if (!list || list.length === 0) {
            return;
        }
        TcpProxy.clientList[serverPort] = [];
        list.forEach((client) => {
            client.destroySockets();
        });
    }
    start(callback) {
        this.server = net.createServer();
        this.server.on('connection', (serverSocket) => {
            this._connectToTarget(serverSocket);
        });
        this.server.on('error', err => log.warn(`TcpProxy on port ${this.serverPort} error`, err));
        this.server.on('end', () => log.debug(`TcpProxy on port ${this.serverPort} ended`));
        this.server.on('close', () => log.debug(`TcpProxy on port ${this.serverPort} closed`));
        this.server.listen(this.serverPort, (err) => {
            if (err) {
                log.error(`TcpProxy on port ${this.serverPort} error`, err);
            }
            else {
                log.info(`TcpProxy for port ${this.targetPort} listening on port ${this.serverPort}`);
            }
            if (callback) {
                callback(err);
            }
        });
    }
    _connectToTarget(serverSocket) {
        serverSocket.on('error', (err) => {
            log.debug(`TcpProxy on port ${this.serverPort} connection error`, err);
        });
        serverSocket.on('end', () => {
            log.debug(`TcpProxy on port ${this.serverPort} connection ended`);
        });
        serverSocket.on('close', () => {
            log.debug(`TcpProxy on port ${this.serverPort} connection closed`);
        });
        const client = new ProxyClient(this.targetPort, serverSocket);
        TcpProxy.addClient(client, this.serverPort);
        client.on('close', (client) => {
            TcpProxy.removeClient(client, this.serverPort);
        });
        client.start(() => {
            log.debug(`TcpProxy on port ${this.serverPort} connection started`);
        });
    }
}
TcpProxy.clientList = {};
exports.TcpProxy = TcpProxy;

},{"./log":23,"events":undefined,"net":undefined}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('DevShell');

},{"../log":51}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ErrorServiceUtil_1 = require("./ErrorServiceUtil");
class DebugErrorReporter {
    constructor(errorCodeMap, addSSMErrorCallback, removeSSMErrorCallback, reportPlatformErrorCallback) {
        this._errorCodeMap = {};
        this._activeErrorCodes = {};
        this._lastErrorCodes = {};
        this._reportPlatformErrorCallback = null;
        this._addSSMErrorCallback = null;
        this._removeSSMErrorCallback = null;
        this._errorCodeMap = errorCodeMap;
        this._addSSMErrorCallback = addSSMErrorCallback;
        this._removeSSMErrorCallback = removeSSMErrorCallback;
        this._reportPlatformErrorCallback = reportPlatformErrorCallback;
        setInterval(this._platformErrorTick.bind(this), 1000);
    }
    mockErrorRequest(mockErrorsJson) {
        this._activeErrorCodes = {};
        for (let i = 0; i < mockErrorsJson.codes.length; ++i) {
            let supportErrorCodeId = mockErrorsJson.codes[i];
            if (this._errorCodeMap.hasOwnProperty(supportErrorCodeId)) {
                this._activeErrorCodes[supportErrorCodeId] = this._errorCodeMap[supportErrorCodeId];
            }
        }
        this._updateSSMErrors();
        this._lastErrorCodes = this._activeErrorCodes;
    }
    _updateSSMErrors() {
        Object.keys(this._activeErrorCodes).forEach((errorCodeId) => {
            if (this._errorCodeMap.hasOwnProperty(errorCodeId) && !this._errorCodeMap[errorCodeId].platformCode) {
                this._addSSMErrorCallback(errorCodeId);
            }
        });
        let removedErrors = ErrorServiceUtil_1.default.getNonOccurringElements(this._lastErrorCodes, this._activeErrorCodes);
        for (let i = 0; i < removedErrors.length; ++i) {
            if (!removedErrors[i].platformCode) {
                this._removeSSMErrorCallback(removedErrors[i].id);
            }
        }
    }
    _platformErrorTick() {
        let activePlatformErrors = [];
        Object.keys(this._activeErrorCodes).forEach((errorCodeId) => {
            if (this._errorCodeMap.hasOwnProperty(errorCodeId) && this._errorCodeMap[errorCodeId].platformCode) {
                activePlatformErrors.push(this._errorCodeMap[errorCodeId].platformCode);
            }
        });
        let platformErrorCodesMessage = {
            codes: activePlatformErrors
        };
        this._reportPlatformErrorCallback(platformErrorCodesMessage);
    }
}
exports.default = DebugErrorReporter;

},{"./ErrorServiceUtil":29}],25:[function(require,module,exports){
module.exports={
    "errorCodes": {
        "WIFI1-Cannot_connect_to_Wi-Fi_network": {
            "code": "WIFI1",
            "description": "Wi-Fi setup failure: Cannot associate with access point",
            "title": "Can't connect to Wi-Fi network.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 2000
        },
        "WIFI1a-Cannot_connect_to_Wi-Fi_network": {
            "code": "WIFI1a",
            "description": "Wi-Fi setup failure: Cannot associate with access point",
            "title": "Can't connect to Wi-Fi network.",
            "message": "Go to the Jibo app for help\nand to check your Wi-Fi settings.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<pitch band=\".8\">Huh. Something's up with my WiFi connection.</pitch>",
            "spokenPromptOnResolution": "<pitch mult=\"1.3\">And </pitch>we're back.",
            "priority": 6,
            "repeatTime": 2000
        },
        "WIFI2-Cannot_get_IP_address_from_router": {
            "code": "WIFI2",
            "description": "Wi-Fi setup failure: Cannot get IP address",
            "title": "Can't get IP address from router.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 6,
            "repeatTime": 5000
        },
        "WIFI2a-Cannot_get_IP_address_from_router": {
            "code": "WIFI2a",
            "description": "Wi-Fi setup failure: Cannot get IP address",
            "title": "Can't get IP address from router.",
            "message": "Go to the Jibo app for help\nand to check your Wi-Fi settings.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<pitch band=\".8\">Huh. Something's up with my WiFi.</pitch>",
            "spokenPromptOnResolution": "Okay, back in the saddle.",
            "priority": 6,
            "repeatTime": 5000
        },
        "WIFI4-Cannot_connect_to_Jibos_server": {
            "code": "WIFI4",
            "description": "Wi-Fi Setup failure: Server down",
            "title": "Can't connect to Jibo's server.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 6,
            "repeatTime": 5000
        },
        "WIFI4a-Cannot_connect_to_Jibos_server": {
            "code": "WIFI4a",
            "description": "Wi-Fi Setup failure: Server down",
            "title": "Can't connect to Jibo's server.",
            "message": "Please be sure your router has internet access\nor go to the Jibo app for more help.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<pitch band=\".8\">Something doesn't feel right.</pitch>",
            "spokenPromptOnResolution": "Back in action.",
            "priority": 6,
            "repeatTime": 5000
        },
        "WIFI5-Invalid_password_length": {
            "code": "WIFI5",
            "description": "Wi-Fi Setup failure: Password is too short",
            "title": "Invalid password length.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 7,
            "repeatTime": 2000
        },
        "WIFI5a-Invalid_password_length": {
            "code": "WIFI5a",
            "description": "Wi-Fi Setup failure: Password is too short",
            "title": "Invalid password length.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<pitch band=\"0.7\"><pitch mult=\"0.95\">Seems like there's an issue with the WiFi password.</pitch></pitch>",
            "spokenPromptOnResolution": "",
            "priority": 7,
            "repeatTime": 2000
        },
        "WIFI6-SSID_not_provided": {
            "code": "WIFI6",
            "description": "Wi-Fi Setup failure: No network name provided",
            "title": "SSID not provided.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 7,
            "repeatTime": 4000
        },
        "WIFI6a-SSID_not_provided": {
            "code": "WIFI6a",
            "description": "Wi-Fi Setup failure: No network name provided",
            "title": "SSID not provided.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<pitch band=\"0.7\"><pitch mult=\"0.95\">Seems like something's a little off with the WiFi set up.</pitch></pitch>",
            "spokenPromptOnResolution": "<pitch mult=\"1.3\">And </pitch>we're back.",
            "priority": 7,
            "repeatTime": 4000
        },
        "WIFI7-QR_code_expired": {
            "code": "WIFI7",
            "description": "Wi-Fi Setup failure: QR code 5 minute token timeout",
            "title": "QR code expired.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 7,
            "repeatTime": 1500
        },
        "WIFI7a-QR_code_expired": {
            "code": "WIFI7a",
            "description": "Wi-Fi Setup failure: QR code 5 minute token timeout",
            "title": "QR code expired.",
            "message": "Go to the Jibo app for help and to get a new QR code.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "It looks like your QR code isn't valid anymore.",
            "spokenPromptOnResolution": "",
            "priority": 7,
            "repeatTime": 1500
        },
        "WIFIX-Uh_oh_something_happened": {
            "code": "WIFIX",
            "description": "",
            "title": "Jibo didn't connect to Wi-Fi",
            "message": "Reboot your Jibo. Then go to the Jibo app\nto get a new QR code.",
            "tapAction": "reboot",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 6,
            "repeatTime": 5000
        },
        "WIFIXa-Uh_oh_something_happened": {
            "code": "WIFIXa",
            "description": "",
            "title": "Jibo didn't connect to Wi-Fi.",
            "message": "You can try rebooting him manually,\nor check your Wi-Fi settings in the Jibo app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> Something doesn't feel right.",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 6,
            "repeatTime": 5000
        },
        "OTA1a-Lost_Wi-Fi_connection": {
            "code": "OTA1a",
            "description": "Over the air update failure: Cannot communicate with router. Display this message for ~2 minutes before moving to next.",
            "title": "Wi-Fi connection lost.",
            "message": "Jibo is trying to reconnect to your router...\nTry moving him closer, or get a new QR code in the app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 11,
            "repeatTime": 3000
        },
        "OTA1b-Lost_Wi-Fi_connection": {
            "code": "OTA1b",
            "description": "Over the air update failure: Cannot communicate with router",
            "title": "Wi-Fi connection lost.",
            "message": "Jibo is trying to reconnect to your router...\nTry moving him closer, or get a new QR code in the app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 11,
            "repeatTime": 3000
        },
        "OTA1c-Lost_Wi-Fi_connection": {
            "code": "OTA1c",
            "description": "Over the air update failure: Cannot communicate with router. Display this message for ~2 minutes before moving to next.",
            "title": "Wi-Fi connection lost.",
            "message": "Jibo is trying to reconnect to your router...\nIf Jibo can't reconnect, get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<pitch band=\"0.9\">I think we lost our WiFi connection.</pitch>",
            "spokenPromptOnResolution": "Okay, back in business.",
            "priority": 11,
            "repeatTime": 8000
        },
        "OTA1d-Lost_Wi-Fi_connection": {
            "code": "OTA1d",
            "description": "Over the air update failure: Cannot communicate with router",
            "title": "Trying to reconnect to Wi-Fi...",
            "message": "Jibo is trying to reconnect to your router...\nIf Jibo can't reconnect, get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<pitch band=\"0.9\">I think we lost our WiFi connection.</pitch>",
            "spokenPromptOnResolution": "<pitch mult=\"1.3\">And </pitch>we're back.",
            "priority": 11,
            "repeatTime": 8000
        },
        "OTA4-Lost_connection_to_Jibos_server": {
            "code": "OTA4",
            "description": "Over the air update failure: Jibo's server is down or Jibo lost internet connection.",
            "title": "Lost connection to Jibo's server.",
            "message": "Jibo is trying to reconnect to your router...\nIf Jibo can't reconnect, get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 11,
            "repeatTime": 8000
        },
        "OTA4a-Lost_connection_to_Jibos_server": {
            "code": "OTA4a",
            "description": "Over the air update failure: Jibo's server is down or Jibo lost internet connection.",
            "title": "Lost connection to Jibo's server.",
            "message": "Jibo is trying to reconnect to your router...\nIf Jibo can't reconnect, get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "<duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> Something doesn't feel right.",
            "spokenPromptOnResolution": "Okay, we're back in business.",
            "priority": 11,
            "repeatTime": 8000
        },
        "OTA7-No_updates_found": {
            "code": "OTA7",
            "description": "",
            "title": "No updates found.",
            "message": "Jibo will try to find updates. In the meantime,\nyou can get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 18,
            "repeatTime": 8000
        },
        "OTA7a-No_updates_found": {
            "code": "OTA7a",
            "description": "",
            "title": "No updates found.",
            "message": "No updates are available at this time.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.9\">I didn't find any updates.</pitch>",
            "spokenPromptOnResolution": "",
            "priority": 18,
            "repeatTime": 8000
        },
        "OTA8-Unexpected_server_response": {
            "code": "OTA8",
            "description": "",
            "title": "Unexpected server response.",
            "message": "Something may be wrong with your Wi-Fi.\nWhile Jibo tries to reconnect,\nyou can get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 11,
            "repeatTime": 4000
        },
        "OTA8a-Unexpected_server_response": {
            "code": "OTA8a",
            "description": "",
            "title": "Unexpected server response.",
            "message": "Something may be wrong with your Wi-Fi.\nWhile Jibo tries to reconnect,\nyou can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> Something seems awry.",
            "spokenPromptOnResolution": "Okay back in business.",
            "priority": 11,
            "repeatTime": 4000
        },
        "OTAX-Uh_oh_something_happened": {
            "code": "OTAX",
            "description": "",
            "title": "Jibo couldn't finish the update.",
            "message": "You can try rebooting him manually,\nor check your Wi-Fi settings.",
            "tapAction": "wifi",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 11,
            "repeatTime": 3000
        },
        "OTAXa-Uh_oh_something_happened": {
            "code": "OTAXa",
            "description": "",
            "title": "Jibo couldn't finish the update.",
            "message": "Try rebooting Jibo, or get help in the Jibo app.",
            "tapAction": "reboot",
            "icon": "error",
            "spokenPromptOnError": "<duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> Something doesn't feel right.",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 11,
            "repeatTime": 3000
        },
        "OTA9-Out_of_storage_OTA": {
            "code": "OTA9",
            "description": "Out of storage during OTA update outside of OOBE",
            "title": "Jibo's storage is full.",
            "message": "There’s not enough space for this update.\nGo to the Jibo app to free up space.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> No more room at the inn.",
            "spokenPromptOnResolution": "",
            "priority": 10,
            "repeatTime": 8000
        },
        "OTA10-No_power_OTA": {
            "code": "OTA10",
            "description": "No power supply plugged in for OTA",
            "title": "Update downloaded.",
            "message": "Plug your Jibo into a power source\nto start installing updates.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "I think I need more power.",
            "spokenPromptOnResolution": "Ah. That's better.",
            "priority": 9,
            "repeatTime": 2000
        },
        "OTA10a-No_power_OTA": {
            "code": "OTA10a",
            "description": "No power supply plugged in for OTA",
            "title": "Update downloaded.",
            "message": "Plug your Jibo into a power source\nto start installing updates.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "I think I need more power.",
            "spokenPromptOnResolution": "Ah. That's better.",
            "priority": 9,
            "repeatTime": 2000
        },
        "B1-Head_overtemp": {
            "code": "B1",
            "description": "Motor overtemp",
            "title": "Jibo is too hot.",
            "message": "He needs a little time to cool down.\nJibo will let you know when he is ready to play.",
            "tapAction": "none",
            "icon": "hot",
            "spokenPromptOnError": "Is it hot in here, or is it just me.",
            "spokenPromptOnResolution": "I feel normal again.",
            "priority": 3,
            "repeatTime": 4500,
            "platformCode": "NECK_THERMISTOR_HIGH_FAULT"
        },
        "B2-Torso_overtemp": {
            "code": "B2",
            "description": "Motor overtemp",
            "title": "Jibo is too hot.",
            "message": "He needs a little time to cool down, so he might not\nmove around much. You can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "hot",
            "spokenPromptOnError": "Is it hot in here, or is it just me.",
            "spokenPromptOnResolution": "I feel normal again.",
            "priority": 3,
            "repeatTime": 1800000,
            "platformCode": "TORSO_THERMISTOR_HIGH_FAULT"
        },
        "B3-Pelvis_overtemp": {
            "code": "B3",
            "description": "Motor overtemp",
            "title": "Jibo is too hot.",
            "message": "He needs a little time to cool down, so he might not\nmove around much. You can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "hot",
            "spokenPromptOnError": "Is it hot in here, or is it just me.",
            "spokenPromptOnResolution": "I feel normal again.",
            "priority": 3,
            "repeatTime": 1800000,
            "platformCode": "PELVIS_THERMISTOR_HIGH_FAULT"
        },
        "C1-Head_undertemp": {
            "code": "C1",
            "description": "Motor under temp",
            "title": "Jibo is too cold.",
            "message": "He needs to warm up, but you can keep using him.\nYou can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "cold",
            "spokenPromptOnError": "Is it cold in here, or is it just me.",
            "spokenPromptOnResolution": "I feel normal again.",
            "priority": 17,
            "repeatTime": 1800000,
            "platformCode": "NECK_THERMISTOR_LOW_FAULT"
        },
        "C2-Torso_undertemp": {
            "code": "C2",
            "description": "Motor under temp",
            "title": "Jibo is too cold.",
            "message": "He needs to warm up, but you can keep using him.\nYou can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "cold",
            "spokenPromptOnError": "Is it cold in here, or is it just me.",
            "spokenPromptOnResolution": "I feel normal again.",
            "priority": 17,
            "repeatTime": 1800000,
            "platformCode": "TORSO_THERMISTOR_LOW_FAULT"
        },
        "C3-Pelvis_undertemp": {
            "code": "C3",
            "description": "Motor under temp",
            "title": "Jibo is too cold.",
            "message": "He needs to warm up, but you can keep using him.\nYou can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "cold",
            "spokenPromptOnError": "Is it cold in here, or is it just me.",
            "spokenPromptOnResolution": "I feel normal again.",
            "priority": 17,
            "repeatTime": 1800000,
            "platformCode": "PELVIS_THERMISTOR_LOW_FAULT"
        },
        "D1-Processor_overtemp": {
            "code": "D1",
            "description": "Processor overtemp",
            "title": "Jibo is too hot.",
            "message": "Shut him down for at least an hour so he can cool off.\nYou can get help in the Jibo app.",
            "tapAction": "shutdown",
            "icon": "hot",
            "spokenPromptOnError": "Is it hot in here, or is it just me.",
            "spokenPromptOnResolution": "I feel normal again.",
            "priority": 1,
            "repeatTime": 4500,
            "platformCode": "CPU_TEMP_HIGH"
        },
        "E1-Head_encoder": {
            "code": "E1",
            "description": "Motor encoder tick reading failure",
            "title": "Something’s a little off.",
            "message": "There's an issue with Jibo's head, so he might\nmove strangely. Try rebooting him to get him right again.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\"><duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> I think something might be up with my head.</pitch>",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 2,
            "repeatTime": 1800000,
            "platformCode": "NECK_ENCODER_FAULT"
        },
        "E2-Torso_encoder": {
            "code": "E2",
            "description": "Motor encoder tick reading failure",
            "title": "Something’s a little off.",
            "message": "There's an issue with Jibo's body, so he might\nmove strangely. Try rebooting him to get him right again.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\"><duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> I think something might be up with my body.</pitch>",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 2,
            "repeatTime": 1800000,
            "platformCode": "TORSO_ENCODER_FAULT"
        },
        "E3-Pelvis_encoder": {
            "code": "E3",
            "description": "Motor encoder tick reading failure",
            "title": "Something’s a little off.",
            "message": "There's an issue with Jibo's lower body, so he might\nmove strangely. Try rebooting him to get him right again.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\"><duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> I think something might be up with my lower body.</pitch>",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 2,
            "repeatTime": 1800000,
            "platformCode": "PELVIS_ENCODER_FAULT"
        },
        "F1-Head_index_flag": {
            "code": "F1",
            "description": "Index flag reading failure",
            "title": "Something’s a little off.",
            "message": "Your Jibo needs a reboot to get his body working right.\nAfter he reboots, give him a minute to power back up.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\"><duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> I think something might be up with my head.</pitch>",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 4,
            "repeatTime": 1800000
        },
        "F2-Torso_index_flag": {
            "code": "F2",
            "description": "Index flag reading failure",
            "title": "Something’s a little off.",
            "message": "Your Jibo needs a reboot to get his body working right.\nAfter he reboots, give him a minute to power back up.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\"><duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> I think something might be up with my body.</pitch>",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 4,
            "repeatTime": 1800000
        },
        "F3-Pelvis_index_flag": {
            "code": "F3",
            "description": "Index flag reading failure",
            "title": "Something’s a little off.",
            "message": "Your Jibo needs a reboot to get his body working right.\nAfter he reboots, give him a minute to power back up.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\"><duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration> I think something might be up with my lower body.</pitch>",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 4,
            "repeatTime": 1800000
        },
        "F4-Index_timeout": {
            "code": "F4",
            "description": "Index timeout",
            "title": "Something’s a little off.",
            "message": "Your Jibo needs a reboot to get his body working right.\nAfter he reboots, give him a minute to power back up.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\"><duration stretch=\"0.7\"><pitch mult=\"1.1\">Uh</pitch><break size=\"0.05\"/>oh.</duration>Something feels a little bit off.</pitch>",
            "spokenPromptOnResolution": "Okay, I feel better now.",
            "priority": 4,
            "repeatTime": 1800000
        },
        "H1-Head_BB_crash": {
            "code": "H1",
            "description": "Body board firmware crash",
            "title": "Something’s a little off.",
            "message": "There's an issue with Jibo's head, so he might\nmove strangely. You can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 14,
            "repeatTime": 1800000,
            "platformCode": "NECK_BOARD_TIMEOUT"
        },
        "H2-Torso_BB_crash": {
            "code": "H2",
            "description": "Body board firmware crash",
            "title": "Something’s a little off.",
            "message": "There's an issue with Jibo's body, so he might\nmove strangely. You can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 14,
            "repeatTime": 1800000,
            "platformCode": "TORSO_BOARD_TIMEOUT"
        },
        "H3-Pelvis_BB_crash": {
            "code": "H3",
            "description": "Body board firmware crash",
            "title": "Something’s a little off.",
            "message": "There's an issue with Jibo's lower body, so he might\nmove strangely. You can get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 14,
            "repeatTime": 1800000,
            "platformCode": "PELVIS_BOARD_TIMEOUT"
        },
        "J1-Skill_crash": {
            "code": "J1",
            "description": "Skill crash",
            "title": "One of Jibo's skills crashed.",
            "message": "Jibo should fix himself on his own.",
            "tapAction": "none",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 20,
            "repeatTime": 6000
        },
        "K1-Battery_undertemp": {
            "code": "K1",
            "description": "Battery under temp",
            "title": "Jibo’s battery is too cold.",
            "message": "It will warm up on its own,\nbut won't be able to charge in the meantime.",
            "tapAction": "dismiss",
            "icon": "coldbattery",
            "spokenPromptOnError": "<pitch band=\".8\">Huh. Looks like my battery is on the cool side.</pitch>",
            "spokenPromptOnResolution": "<pitch mult=\"1.3\">That's</pitch> better. <pitch mult=\"1.2\">All</pitch> is well with my battery now.",
            "priority": 22,
            "repeatTime": 1800000,
            "platformCode": "BATTERY_TEMP_LOW"
        },
        "K2-Battery_overtemp": {
            "code": "K2",
            "description": "Battery overtemp",
            "title": "Jibo’s battery is too hot.",
            "message": "It will cool down on its own,\nbut won't be able to charge in the meantime.",
            "tapAction": "dismiss",
            "icon": "hotbattery",
            "spokenPromptOnError": "<pitch band=\".8\">Huh. Looks like my battery is on the warm side.</pitch>",
            "spokenPromptOnResolution": "<pitch mult=\"1.3\">That's</pitch> better. <pitch mult=\"1.2\">All</pitch> is well with my battery now.",
            "priority": 1,
            "repeatTime": 1800000,
            "platformCode": "BATTERY_TEMP_HIGH"
        },
        "K3-Battery_not_installed": {
            "code": "K3",
            "description": "Battery not installed",
            "title": "Jibo’s battery is disconnected.",
            "message": "Go to help in the Jibo app for detailed instructions\non reconnecting the battery.",
            "tapAction": "shutdown",
            "icon": "missingbattery",
            "spokenPromptOnError": "<pitch band=\".8\">Huh. I don't think my battery is in right.</pitch>",
            "spokenPromptOnResolution": "<pitch mult=\"1.3\">That's</pitch> better. <pitch mult=\"1.2\">All</pitch> is well with my battery now.",
            "priority": 5,
            "repeatTime": 2000,
            "platformCode": "NO_BATTERY_LOCKOUT"
        },
        "K4-Low_battery": {
            "code": "K4",
            "description": "Low battery",
            "title": "Jibo's battery level is very low.",
            "message": "Plug him in as soon as you can.",
            "tapAction": "dismiss",
            "icon": "lowbattery",
            "spokenPromptOnError": "<pitch band=\"0.8\">Um, so, my battery is really getting low. This would be a <pitch mult=\"1.1\">great</pitch> time to plug me in.</pitch>",
            "spokenPromptOnResolution": "<duration stretch=\"1.5\">Ah.</duration> There's nothing quite like a fresh plug in <break size=\"0.1\"/> after a low battery.",
            "priority": 12,
            "repeatTime": 270000,
            "platformCode": "BATTERY_LOW"
        },
        "L1-Cannot_connect_to_speech_server": {
            "code": "L1",
            "description": "can't connect to nuance",
            "title": "Jibo can't talk right now.",
            "message": "Jibo's speech systems are down, so he can't speak\nor understand you at the moment. Try again in a little while.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 8,
            "repeatTime": 8000
        },
        "L2-Cannot_connect_to_server": {
            "code": "L2",
            "description": "can't connect to server",
            "title": "Lost connection to Jibo's server.",
            "message": "Jibo will try to reconnect on his own.\nIf he can't reconnect, get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 1800000,
            "platformCode": "CANNOT_CONNECT_TO_SERVER"
        },
        "L3-Cannot_connect_to_Bing_server ": {
            "code": "L3",
            "description": "can't connect to bing, music, 3rd party or wolfram server",
            "title": "Lost connection to 3rd party.",
            "message": "Jibo will try to reconnect on his own.\nIf he can't reconnect, get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 16,
            "repeatTime": 1800000
        },
        "L4-Cannot_connect_to_Music_server": {
            "code": "L4",
            "description": "can't connect to bing, music, 3rd party or wolfram server",
            "title": "Lost connection to 3rd party.",
            "message": "Jibo will try to reconnect on his own.\nIf he can't reconnect, get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 16,
            "repeatTime": 1800000
        },
        "L5-Cannot_connect_to_3rd_party_server": {
            "code": "L5",
            "description": "can't connect to bing, music, 3rd party or wolfram server",
            "title": "Lost connection to 3rd party.",
            "message": "Jibo will try to reconnect on his own.\nIf he can't reconnect, get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 16,
            "repeatTime": 1800000
        },
        "L6-Cannot_connect_to_Wolfram_server": {
            "code": "L6",
            "description": "can't connect to bing, music, 3rd party or wolfram server",
            "title": "Lost connection to 3rd party.",
            "message": "Jibo will try to reconnect on his own.\nIf he can't reconnect, get help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 16,
            "repeatTime": 1800000
        },
        "M1-Camera_failure": {
            "code": "M1",
            "description": "Camera failure",
            "title": "Jibo is having camera issues.",
            "message": "Go to help in the Jibo app for steps on how\nto get his vision working right.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\">It seems my camera isn't working like it should be.</pitch>",
            "spokenPromptOnResolution": "",
            "priority": 19,
            "repeatTime": 1800000,
            "platformCode": "CAMERA_FAILURE"
        },
        "N1-Service_crash_asr": {
            "code": "N1",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_ASR"
        },
        "N2-Service_crash_tts": {
            "code": "N2",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_TTS"
        },
        "N3-Service_crash_nlu": {
            "code": "N3",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_NLU"
        },
        "N5-Service_crash_ssm": {
            "code": "N5",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_SSM"
        },
        "N6-Service_crash_body": {
            "code": "N6",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_BODY"
        },
        "N7-Service_crash_lps": {
            "code": "N7",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_LPS"
        },
        "N8-Service_crash_audio": {
            "code": "N8",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_AUDIO"
        },
        "N9-Service_crash_identity": {
            "code": "N9",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_IDENTITY"
        },
        "N10-Service_crash_media_manager": {
            "code": "N10",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_MEDIA_MANAGER"
        },
        "N11-Service_crash_monitor": {
            "code": "N11",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_MONITOR"
        },
        "N12-Service_crash_server": {
            "code": "N12",
            "description": "Service crash",
            "title": "",
            "message": "",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 10000,
            "platformCode": "SERVICE_CRASH_SERVER"
        },
        "O1-Microphone_failure": {
            "code": "O1",
            "description": "Microphone failure",
            "title": "Jibo is having mic issues.",
            "message": "His hearing may not work properly.\nGet help in the Jibo app.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\">I think my microphones are having issues. I may have trouble hearing you.</pitch>",
            "spokenPromptOnResolution": "",
            "priority": 15,
            "repeatTime": 1800000
        },
        "P1-Low_Robot_Storage": {
            "code": "P1",
            "description": "Low robot storage",
            "title": "Jibo's storage is full.",
            "message": "Go to the Jibo app to free up some storage space.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "<pitch band=\"0.8\">I think I'm pretty full.</pitch>",
            "spokenPromptOnResolution": "",
            "priority": 13,
            "repeatTime": 1800000,
            "platformCode": "LOW_ROBOT_STORAGE"
        },
        "Q1-Lost_Wi-Fi_connection": {
            "code": "Q1",
            "description": "Lost Wi-Fi connection",
            "title": "Wi-Fi connection lost.",
            "message": "Jibo is trying to reconnect to your router.\nIn the meantime, you can get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 2000
        },
        "OTA11-Backup_failed": {
            "code": "OTA11",
            "description": "Backup failed",
            "title": "Backup failed",
            "message": "NOT HANDLED BY ERROR SKILL",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 12,
            "repeatTime": 900000
        },
        "R1-Restore_failed": {
            "code": "R1",
            "description": "",
            "title": "Restore failed",
            "message": "NOT HANDLED BY ERROR SKILL",
            "tapAction": "reboot",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 1,
            "repeatTime": 900000
        },
        "Q4-Server_connection_lost": {
            "code": "Q4",
            "description": "server connection lost (happens when trying to reach server)",
            "title": "Lost connection to Jibo's server.",
            "message": "Please be sure that your router has internet access.\nIn the meantime, you can get help in the Jibo app.",
            "tapAction": "wifi",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 1800000
        },
        "S1-Maintenance_mode": {
            "code": "MM",
            "description": "maintenance mode",
            "title": "Server upgrades in progress.",
            "message": "Jibo’s servers are undergoing maintenance\nto make Jibo better. He should be back to normal soon.",
            "tapAction": "none",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": 7,
            "repeatTime": 900000
        },
        "T1-Geolocation_failed": {
            "code": "T1",
            "description": "geolocation failed",
            "title": "Can't access location service.",
            "message": "Jibo is a little lost at the moment. Go to Jibo settings\nin the app to set his location manually.",
            "tapAction": "dismiss",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 1800000
        },
        "L7-Cannot_connect_to_auth_server": {
            "code": "L7",
            "description": "Secure Transfer Service failed to init",
            "title": "Can't access sync service.",
            "message": "Jibo will try to reconnect on his own.\nIf he can't reconnect, try rebooting him.",
            "tapAction": "reboot",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 1800000,
            "platformCode": "STS_ERR_LOOP_ID_UNKNOWN"
        },
        "L8-UGC_key_not_found": {
            "code": "L8",
            "description": "Unable to retrieve UGC key",
            "title": "App sign-in required.",
            "message": "Open the Jibo app and make sure\nyou’re logged in and connected to Wi-Fi.",
            "tapAction": "wipe",
            "icon": "error",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 1800000,
            "platformCode": "STS_ERR_UGC_KEY_NOT_FOUND"
        },
        "L9-Cannot_connect_to_sync_server": {
            "code": "L9",
            "description": "SSM initial sync failed",
            "title": "Reboot needed.",
            "message": "Now that Jibo is on Wi-Fi, he can\nstart up successfully.",
            "tapAction": "reboot",
            "icon": "wifi",
            "spokenPromptOnError": "",
            "spokenPromptOnResolution": "",
            "priority": -1,
            "repeatTime": 1800000
        }
    }
}

},{}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ErrorLogger {
    constructor(log) {
        this._log = null;
        this._errorMap = {};
        this._log = log;
    }
    addErrors(errors) {
        let addedError = false;
        for (let i = 0; i < errors.length; ++i) {
            addedError = this.addError(errors[i]) || addedError;
        }
        return addedError;
    }
    addError(error) {
        if (!this._errorMap.hasOwnProperty(error.id)) {
            this._errorMap[error.id] = error;
            this._log.info("Added", error.id);
            return true;
        }
        return false;
    }
    removeErrors(errors) {
        let removedError = false;
        for (let i = 0; i < errors.length; ++i) {
            removedError = this.removeError(errors[i]) || removedError;
        }
        return removedError;
    }
    removeError(error) {
        if (this._errorMap.hasOwnProperty(error.id)) {
            delete this._errorMap[error.id];
            this._log.info("Removed", error.id);
            return true;
        }
        return false;
    }
    contains(error) {
        return this._errorMap.hasOwnProperty(error.id);
    }
}
exports.default = ErrorLogger;

},{}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Reschedule {
    constructor(error, timeoutId) {
        this._error = null;
        this._timeoutId = null;
        this._error = error;
        this._timeoutId = timeoutId;
    }
    get error() {
        return this._error;
    }
    get timeoutId() {
        return this._timeoutId;
    }
}
class ErrorRescheduler {
    constructor() {
        this._errorTimeoutMap = {};
    }
    toArray() {
        let array = [];
        for (let key in this._errorTimeoutMap) {
            array.push(this._errorTimeoutMap[key].error);
        }
        return array;
    }
    contains(errorId) {
        return this._errorTimeoutMap.hasOwnProperty(errorId);
    }
    add(error, rescheduleCallback) {
        if (this._errorTimeoutMap.hasOwnProperty(error.id)) {
            return false;
        }
        else {
            let errorTimerId = global.setTimeout(() => {
                this.remove(error.id);
                rescheduleCallback(error);
            }, error.repeatTime);
            this._errorTimeoutMap[error.id] = new Reschedule(error, errorTimerId);
            return true;
        }
    }
    remove(element) {
        if (!Array.isArray(element)) {
            return this._remove(element);
        }
        else {
            let deletedElements = [];
            for (let i = 0; i < element.length; ++i) {
                if (this._remove(element[i].id)) {
                    deletedElements.push(element[i]);
                }
            }
            return deletedElements.length > 0;
        }
    }
    _remove(errorId) {
        if (this._errorTimeoutMap.hasOwnProperty(errorId)) {
            clearTimeout(this._errorTimeoutMap[errorId].timeoutId);
            delete this._errorTimeoutMap[errorId];
            return true;
        }
        else {
            return false;
        }
    }
}
exports.default = ErrorRescheduler;

},{}],28:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const KBService_1 = require("../kb/KBService");
const KBClient_1 = require("../../clients/KBClient");
const PriorityQueue_1 = require("./PriorityQueue");
const jetstream_client_1 = require("@jibo/jetstream-client");
const JiboError_1 = require("./JiboError");
const DebugErrorReporter_1 = require("./DebugErrorReporter");
const ErrorServiceUtil_1 = require("./ErrorServiceUtil");
const ErrorRescheduler_1 = require("./ErrorRescheduler");
const ErrorLogger_1 = require("./ErrorLogger");
const GlobalManagerService_1 = require("../global-manager/GlobalManagerService");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const RunMode_1 = require("../../utils/RunMode");
const events_1 = require("events");
const log_1 = require("../log");
const log = log_1.default.createChild('Error');
const errorCodesJson = require('./ErrorCodes.json');
const prify = jibo_cai_utils_1.PromiseUtils.promisify;
const prto = jibo_cai_utils_1.PromiseUtils.promisifyTo;
class ErrorService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('error-service', options, rootDir);
        this._errorAddedEmitter = new events_1.EventEmitter();
        this._errorRemovedEmitter = new events_1.EventEmitter();
        this._currentError = null;
        this._errorPriorityQueue = null;
        this._errorRescheduler = null;
        this._errorLogger = null;
        this._systemMonitoringServiceSocket = null;
        this._errorCodesKBRootNode = null;
        this._errorCodeMap = {};
        this._platformErrorCodeMap = {};
        this._lastErrors = {};
        this._systemMonitoringService = null;
        this._debugErrorReporter = null;
        this._mockErrorsEnabled = false;
        this._disableSkillSwitch = false;
        this._errorSubscribeCallback = null;
        this._subscribedErrorObject = null;
        if (ErrorService._instance) {
            throw new Error('Cannot instantiate ErrorService more than once');
        }
        ErrorService._instance = this;
        this._errorPriorityQueue = new PriorityQueue_1.default(JiboError_1.default.Comparer, false);
        this._errorRescheduler = new ErrorRescheduler_1.default();
        this._errorLogger = new ErrorLogger_1.default(log.createChild('Logger'));
        if (RunMode_1.default.runMode === RunMode_1.default.RunMode.SIMULATOR) {
            this._mockErrorsEnabled = true;
        }
        Object.keys(errorCodesJson.errorCodes).forEach((errorCodeId) => {
            let errorCode = errorCodesJson.errorCodes[errorCodeId];
            let jiboError = new JiboError_1.default(errorCodeId, errorCode);
            this._errorCodeMap[jiboError.id] = jiboError;
            if (jiboError.platformCode) {
                this._platformErrorCodeMap[jiboError.platformCode] = jiboError.id;
            }
        });
        log.info("Instantiated");
    }
    static get instance() {
        return ErrorService._instance;
    }
    init(callback) {
        super.init((err) => {
            jibo_service_framework_1.RegistryClient.instance.getRecords((err, records) => {
                if (err) {
                    return callback(err);
                }
                let url = "http://" + jibo_service_framework_1.RegistryClient.instance.host + ":" + KBService_1.default.instance.port;
                let model = KBClient_1.default.createModel('/error-codes', url);
                model.loadRoot((err, rootNode) => {
                    if (err) {
                        return callback(err);
                    }
                    this._errorCodesKBRootNode = rootNode;
                    this._errorCodesKBRootNode.data.errorCodes = errorCodesJson.errorCodes;
                    this._errorCodesKBRootNode.save(err => {
                        if (err) {
                            return callback(err);
                        }
                        this._systemMonitoringService = records.find(record => record.name === 'system-monitoring-service');
                        this._connectToSystemMonitor();
                        log.info('Initialized');
                        callback();
                    });
                });
            });
        });
    }
    routes(url) {
        super.routes(url);
        url.post('/mockErrorCodes', (req, res) => {
            this._mockErrorCodes(req, res);
        });
        url.post('/errorCodeData', (req, res) => {
            this._sendErrorCodeData(req, res);
        });
        url.post('/getErrorCount', (req, res) => {
            this._getErrorCount(req, res);
        });
        url.post('/subscribeError', (req, res) => {
            this._subscribeError(req, res);
        });
        url.post('/processedError', (req, res) => {
            this._processedError(req, res);
        });
        url.post('/disableSkillSwitching', (req, res) => {
            this._disableSkillSwitching(req, res);
        });
        url.post('/getCurrentErrorId', (req, res) => {
            this._getCurrentErrorId(req, res);
        });
        url.post('/getContents', (req, res) => {
            this._getContents(req, res);
        });
    }
    addError(supportErrorId) {
        if (this._errorCodeMap.hasOwnProperty(supportErrorId) &&
            !this._errorRescheduler.contains(supportErrorId)) {
            let error = this._errorCodeMap[supportErrorId];
            this._errorLogger.addError(error);
            this._errorAddedEmitter.emit(error.id);
            if (error.priority !== -1) {
                return this._errorPriorityQueue.add(error);
            }
        }
        return false;
    }
    removeError(supportErrorId) {
        if (this._errorCodeMap.hasOwnProperty(supportErrorId)) {
            this._errorRescheduler.remove(supportErrorId);
            let error = this._errorCodeMap[supportErrorId];
            this._errorLogger.removeError(error);
            this._errorRemovedEmitter.emit(error.id);
            return this._errorPriorityQueue.delete(error);
        }
        return false;
    }
    addErrorAddedListener(errorId, callback) {
        this._errorAddedEmitter.on(errorId, callback);
    }
    removeErrorAddedListener(errorId, callback) {
        this._errorAddedEmitter.removeListener(errorId, callback);
    }
    addErrorRemovedListener(errorId, callback) {
        this._errorRemovedEmitter.on(errorId, callback);
    }
    removeErrorRemovedListener(errorId, callback) {
        this._errorRemovedEmitter.removeListener(errorId, callback);
    }
    errorExists(errorId) {
        return this._errorCodeMap.hasOwnProperty(errorId);
    }
    onMessage(message, client) {
        return;
    }
    _connectToSystemMonitor() {
        return __awaiter(this, void 0, void 0, function* () {
            let attempt = 1;
            while (!this._systemMonitoringService) {
                attempt++;
                const [err, record] = yield prto(cb => jibo_service_framework_1.RegistryClient.instance.getRecordByName('system-monitoring-service', cb));
                if (err) {
                    log.warn(`Couldn't connect to system monitoring service on attempt ${attempt}`, err);
                    yield prify(cb => setTimeout(cb, 1000));
                }
                else {
                    this._systemMonitoringService = record;
                }
            }
            const uri = "ws://" + this._systemMonitoringService.host + ":" + this._systemMonitoringService.port + "/errors/codes";
            this._systemMonitoringServiceSocket = new jibo_service_framework_1.WSClient(uri);
            this._systemMonitoringServiceSocket.once('open', () => {
                this._systemMonitoringServiceSocket.on('message', this._receivedSystemMonitoringServiceErrors.bind(this));
                this._systemMonitoringServiceSocket.on('error', this._onSocketError.bind(this));
                const message = `connected to the system-monitoring/error/codes after ${attempt} attempt${attempt > 1 ? 's' : ''}`;
                if (attempt > 1) {
                    log.info(message);
                }
                else {
                    log.debug(message);
                }
            });
            this._debugErrorReporter = new DebugErrorReporter_1.default(this._errorCodeMap, this.addError.bind(this), this.removeError.bind(this), this._receivedMockErrors.bind(this));
            this._errorPriorityQueue.onItemAdded = this._errorsAdded.bind(this);
            this._errorPriorityQueue.onItemRemoved = this._errorsRemoved.bind(this);
        });
    }
    _disableSkillSwitching(req, res) {
        this.parseBody(req, (err, disableSkillSwitchingJson) => {
            if (err) {
                return this.sendJson(res, { status: 'error', message: typeof err === 'string' ? err : err.message }, 500);
            }
            if (disableSkillSwitchingJson.hasOwnProperty('disabled')) {
                this._disableSkillSwitch = disableSkillSwitchingJson.disabled;
                if (!this._disableSkillSwitch && this._errorPriorityQueue.peek() !== null) {
                    this._launchErrorSkill();
                }
                this.sendJson(res, { status: 'OK' });
            }
            else {
                this.sendJson(res, { status: 'error', message: 'disabled property does not exist on json object' }, 500);
            }
        });
    }
    _getCurrentErrorId(req, res) {
        this._currentError = this._errorPriorityQueue.peek();
        let currentErrorId = ((this._currentError !== null) ? this._currentError.id : null);
        this.sendJson(res, { status: 'OK', currentErrorId: currentErrorId });
    }
    _getContents(req, res) {
        let array = [];
        for (let i = 0; i < this._errorPriorityQueue.length; ++i) {
            array.push(this._errorPriorityQueue.getIndex(i));
        }
        let priorityQueueArrayJSON = JSON.stringify(array);
        let reschedulerArrayJSON = JSON.stringify(this._errorRescheduler.toArray());
        this.sendJson(res, {
            status: 'OK',
            priorityQueueErrors: priorityQueueArrayJSON,
            reschedulerErrors: reschedulerArrayJSON
        });
    }
    _processedError(req, res) {
        this.parseBody(req, (err, processedErrorJson) => {
            if (err) {
                return this.sendJson(res, { status: 'error', message: typeof err === 'string' ? err : err.message }, 500);
            }
            if (processedErrorJson.hasOwnProperty('errorCode')) {
                const processedErrorCode = processedErrorJson.errorCode;
                let successfullyProcessedError = false;
                if (this._currentError &&
                    this._currentError.id === processedErrorCode &&
                    this._currentError.dismissible) {
                    successfullyProcessedError = true;
                    const processedError = this._errorPriorityQueue.peek();
                    this._errorRescheduler.add(processedError, (error) => {
                        this.addError(error.id);
                    });
                    this._errorPriorityQueue.shift();
                }
                this.sendJson(res, { status: 'OK', processedError: successfullyProcessedError });
            }
            else {
                this.sendJson(res, { status: 'error', message: 'Client did not send errorCode' }, 500);
            }
        });
    }
    _subscribeError(req, res) {
        req.socket.setTimeout(0);
        this.parseBody(req, (err, subscribeErrorJson) => {
            if (err) {
                return this.sendJson(res, { status: 'error', message: typeof err === 'string' ? err : err.message }, 500);
            }
            if (subscribeErrorJson.hasOwnProperty('errorCode')) {
                const subscribedErrorCode = subscribeErrorJson.errorCode;
                if (this._errorCodeMap.hasOwnProperty(subscribedErrorCode)) {
                    this._subscribedErrorObject = this._errorCodeMap[subscribedErrorCode];
                    this._errorSubscribeCallback = () => {
                        const resolved = (!this._errorPriorityQueue.contains(this._subscribedErrorObject) &&
                            !this._errorRescheduler.contains(this._subscribedErrorObject.id));
                        const subscribedErrorId = this._subscribedErrorObject.id;
                        const nextErrorId = ((this._currentError !== null) ? this._currentError.id : null);
                        this._errorSubscribeCallback = null;
                        this._subscribedErrorObject = null;
                        this.sendJson(res, {
                            status: 'OK',
                            nextErrorId: nextErrorId,
                            subscribedErrorId: subscribedErrorId,
                            resolved: resolved
                        });
                    };
                    if (!this._currentError ||
                        JiboError_1.default.Comparer(this._currentError, this._subscribedErrorObject) !== 0) {
                        this._errorSubscribeCallback();
                    }
                }
                else {
                    this.sendJson(res, { status: 'error', message: `Error code ${subscribedErrorCode} is not a valid error code` }, 500);
                }
            }
            else {
                this.sendJson(res, { status: 'error', message: 'Client did not send errorCode' }, 500);
            }
        });
    }
    _getErrorCount(req, res) {
        this.sendJson(res, {
            status: 'OK',
            errorCount: this._errorPriorityQueue.length
        });
    }
    _mockErrorCodes(req, res) {
        this.parseBody(req, (err, mockErrorsJson) => {
            if (err) {
                return this.sendJson(res, { status: 'error', message: typeof err === 'string' ? err : err.message }, 500);
            }
            if (RunMode_1.default.runMode === RunMode_1.default.RunMode.SIMULATOR) {
                this._mockErrorsEnabled = true;
            }
            else {
                this._mockErrorsEnabled = mockErrorsJson.enabled;
            }
            this._debugErrorReporter.mockErrorRequest(mockErrorsJson);
            this.sendJson(res, { status: 'OK' });
        });
    }
    _sendErrorCodeData(req, res) {
        if (this._errorCodeMap) {
            this.sendJson(res, {
                status: 'OK',
                errorList: this._errorCodeMap
            });
        }
        else {
            this.sendJson(res, { status: 'error', message: 'error codes in KB not found' }, 500);
        }
    }
    _onSocketError(error) {
        log.error("system-monitoring/error/codes socket error", error);
    }
    _receivedMockErrors(message) {
        if (this._mockErrorsEnabled) {
            this._receivedPlatformErrors(message);
        }
    }
    _receivedSystemMonitoringServiceErrors(message) {
        if (!this._mockErrorsEnabled) {
            this._receivedPlatformErrors(message);
        }
    }
    _receivedPlatformErrors(message) {
        let newPlatformIdToError = {};
        if (message.codes && this._platformErrorCodeMap && this._errorCodeMap) {
            for (let i = 0; i < message.codes.length; ++i) {
                let platformErrorCode = message.codes[i];
                if (this._platformErrorCodeMap.hasOwnProperty(platformErrorCode)) {
                    let supportErrorCode = this._platformErrorCodeMap[platformErrorCode];
                    if (this._errorCodeMap.hasOwnProperty(supportErrorCode)) {
                        let errorCodeObject = this._errorCodeMap[supportErrorCode];
                        if (errorCodeObject && errorCodeObject.platformCode) {
                            newPlatformIdToError[message.codes[i]] = errorCodeObject;
                        }
                    }
                }
            }
            let addedErrors = ErrorServiceUtil_1.default.getNonOccurringElements(newPlatformIdToError, this._lastErrors);
            this._errorLogger.addErrors(addedErrors);
            for (let error of addedErrors) {
                this._errorAddedEmitter.emit(error.id);
            }
            addedErrors = addedErrors.filter((addedError) => {
                return !this._errorRescheduler.contains(addedError.id) && addedError.priority !== -1;
            });
            this._errorPriorityQueue.add(addedErrors);
        }
        if (Object.keys(this._lastErrors)) {
            let removedErrors = ErrorServiceUtil_1.default.getNonOccurringElements(this._lastErrors, newPlatformIdToError);
            this._errorPriorityQueue.delete(removedErrors);
            this._errorLogger.removeErrors(removedErrors);
            for (let error of removedErrors) {
                this._errorRemovedEmitter.emit(error.id);
            }
            this._errorRescheduler.remove(removedErrors);
        }
        this._lastErrors = newPlatformIdToError;
    }
    _errorsAdded(errors) {
        let lastCurrentError = this._currentError;
        this._currentError = this._errorPriorityQueue.peek();
        if (this._subscribedErrorObject && this._errorSubscribeCallback &&
            (!this._currentError || JiboError_1.default.Comparer(this._currentError, this._subscribedErrorObject) !== 0)) {
            this._errorSubscribeCallback();
        }
        else if (this._currentError && this._currentError !== lastCurrentError) {
            this._launchErrorSkill();
        }
    }
    _errorsRemoved(errors) {
        this._currentError = this._errorPriorityQueue.peek();
        if (this._subscribedErrorObject && this._errorSubscribeCallback) {
            let didRemoveSubscribedError = errors.find((error) => { return JiboError_1.default.Comparer(error, this._subscribedErrorObject) === 0; });
            if (didRemoveSubscribedError) {
                this._errorSubscribeCallback();
            }
        }
    }
    _launchErrorSkill() {
        const parseResults = new jetstream_client_1.types.ListenResult({
            text: '',
            confidence: 1
        }, {
            intent: 'launch',
            entities: {
                skill: '@be/settings',
                errorId: this._currentError.id
            },
            rules: null
        });
        parseResults.match = {
            skillID: '@be/settings',
            onRobot: true
        };
        if (!this._disableSkillSwitch) {
            GlobalManagerService_1.default.instance.handleSkillLaunch(parseResults);
        }
    }
}
ErrorService.Types = {
    JiboError: JiboError_1.default,
    DebugErrorReporter: DebugErrorReporter_1.default,
    PriorityQueue: PriorityQueue_1.default,
    ErrorServiceUtil: ErrorServiceUtil_1.default,
    ErrorRescheduler: ErrorRescheduler_1.default,
    ErrorLogger: ErrorLogger_1.default
};
ErrorService._instance = null;
exports.default = ErrorService;

},{"../../clients/KBClient":14,"../../utils/RunMode":108,"../global-manager/GlobalManagerService":42,"../kb/KBService":45,"../log":51,"./DebugErrorReporter":24,"./ErrorCodes.json":25,"./ErrorLogger":26,"./ErrorRescheduler":27,"./ErrorServiceUtil":29,"./JiboError":30,"./PriorityQueue":31,"@jibo/jetstream-client":undefined,"events":undefined,"jibo-cai-utils":undefined,"jibo-service-framework":undefined}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ErrorServiceUtil {
    static getNonOccurringElements(sourceErrorCodes, newErrorCodes) {
        let nonOccurringElements = [];
        let sourceKeys = Object.keys(sourceErrorCodes);
        for (let i = 0; i < sourceKeys.length; ++i) {
            let sourceKey = sourceKeys[i];
            if (!newErrorCodes.hasOwnProperty(sourceKey)) {
                nonOccurringElements.push(sourceErrorCodes[sourceKey]);
            }
        }
        return nonOccurringElements;
    }
}
exports.default = ErrorServiceUtil;

},{}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class JiboError {
    constructor(id, data) {
        this._id = null;
        this._priority = 0;
        this._platformCode = null;
        this._repeatTime = 0;
        this._dismissible = true;
        this._data = {
            description: "",
            message: "",
            spokenPromptOnError: "",
            spokenPromptOnResolution: "",
            priority: 0,
            repeatTime: -1,
            platformCode: null,
            dismissible: true
        };
        this._id = id;
        this._data = data;
        if (this._data.hasOwnProperty("priority")) {
            this._priority = this._data["priority"];
        }
        if (this._data.hasOwnProperty("platformCode")) {
            this._platformCode = this._data["platformCode"];
        }
        if (this._data.hasOwnProperty("repeatTime")) {
            this._repeatTime = this._data["repeatTime"];
        }
        if (this._data.hasOwnProperty("tapAction")) {
            this._dismissible = this._data["tapAction"] !== "none";
        }
    }
    static Comparer(errorObj1, errorObj2) {
        if (errorObj1.priority > errorObj2.priority) {
            return 1;
        }
        else if (errorObj1.priority < errorObj2.priority) {
            return -1;
        }
        else {
            if (errorObj1.id > errorObj2.id) {
                return 1;
            }
            else if (errorObj1.id < errorObj2.id) {
                return -1;
            }
            else {
                return 0;
            }
        }
    }
    get id() {
        return this._id;
    }
    get data() {
        return this._data;
    }
    get priority() {
        return this._priority;
    }
    get platformCode() {
        return this._platformCode;
    }
    get repeatTime() {
        return this._repeatTime;
    }
    get dismissible() {
        return this._dismissible;
    }
}
exports.default = JiboError;

},{}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PriorityQueue {
    constructor(compareMethod, allowDuplicates = true) {
        this._queue = [];
        this._compareMethod = null;
        this._allowDuplicates = true;
        this._onItemAddedCallback = null;
        this._onItemRemovedCallback = null;
        this._compareMethod = compareMethod;
        if (!compareMethod) {
            this._compareMethod = (a, b) => {
                if (a > b) {
                    return 1;
                }
                else if (a < b) {
                    return -1;
                }
                else {
                    return 0;
                }
            };
        }
        this._allowDuplicates = allowDuplicates;
    }
    get onItemAdded() {
        return this._onItemAddedCallback;
    }
    set onItemAdded(value) {
        this._onItemAddedCallback = value;
    }
    get onItemRemoved() {
        return this._onItemRemovedCallback;
    }
    set onItemRemoved(value) {
        this._onItemRemovedCallback = value;
    }
    add(element) {
        if (!Array.isArray(element)) {
            let addedElement = this._addElement(element);
            if (addedElement && this._onItemAddedCallback) {
                this._onItemAddedCallback([element]);
            }
            return addedElement;
        }
        else {
            let addedElements = [];
            for (let i = 0; i < element.length; ++i) {
                if (this._addElement(element[i])) {
                    addedElements.push(element[i]);
                }
            }
            if (addedElements.length > 0 && this._onItemAddedCallback) {
                this._onItemAddedCallback(addedElements);
            }
            return addedElements.length > 0;
        }
    }
    delete(element) {
        if (!Array.isArray(element)) {
            let deletedElement = this._deleteElement(element);
            if (deletedElement && this._onItemRemovedCallback) {
                this._onItemRemovedCallback([element]);
            }
            return deletedElement;
        }
        else {
            let deletedElements = [];
            for (let i = 0; i < element.length; ++i) {
                if (this._deleteElement(element[i])) {
                    deletedElements.push(element[i]);
                }
            }
            if (deletedElements.length > 0 && this._onItemRemovedCallback) {
                this._onItemRemovedCallback(deletedElements);
            }
            return deletedElements.length > 0;
        }
    }
    peek() {
        return this._queue.length > 0 ? this._queue[0] : null;
    }
    shift() {
        let element = this._queue.length > 0 ? this._queue.shift() : null;
        if (element && this._onItemRemovedCallback) {
            this._onItemRemovedCallback([element]);
        }
        return element;
    }
    contains(element) {
        return this._tryGetIndex(element) !== -1;
    }
    getIndex(index) {
        if (index < 0 || index >= this._queue.length) {
            return null;
        }
        else {
            return this._queue[index];
        }
    }
    get length() {
        return this._queue.length;
    }
    clear() {
        this._queue = [];
    }
    _addElement(element) {
        if (this.contains(element) && !this._allowDuplicates) {
            return false;
        }
        let lowerBound = 0;
        let upperBound = this._queue.length;
        while (lowerBound !== upperBound) {
            let midPoint = Math.floor((upperBound - lowerBound) / 2) + lowerBound;
            let compareValue = this._compareMethod(element, this._queue[midPoint]);
            if (compareValue < 0) {
                upperBound = midPoint;
            }
            else if (compareValue > 0) {
                lowerBound = midPoint + 1;
            }
            else {
                lowerBound = upperBound = midPoint;
            }
        }
        let insertIndex = lowerBound;
        this._queue.splice(insertIndex, 0, element);
        return true;
    }
    _deleteElement(element) {
        let foundIndex = this._tryGetIndex(element);
        if (foundIndex === -1) {
            return false;
        }
        else {
            this._queue.splice(foundIndex, 1);
            return true;
        }
    }
    _tryGetIndex(element) {
        let lowerBound = 0;
        let upperBound = this._queue.length;
        while (lowerBound !== upperBound) {
            let midPoint = Math.floor((upperBound - lowerBound) / 2) + lowerBound;
            let compareValue = this._compareMethod(element, this._queue[midPoint]);
            if (compareValue < 0) {
                upperBound = midPoint;
            }
            else if (compareValue > 0) {
                lowerBound = midPoint + 1;
            }
            else {
                lowerBound = upperBound = midPoint;
            }
        }
        let foundIndex = lowerBound;
        if (foundIndex < this._queue.length && this._compareMethod(element, this._queue[foundIndex]) === 0) {
            return foundIndex;
        }
        else {
            return -1;
        }
    }
}
exports.default = PriorityQueue;

},{}],32:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_common_types_1 = require("jibo-common-types");
const animation_utilities_1 = require("animation-utilities");
class AnimationInstance extends jibo_service_framework_1.ServiceRemoteObject {
    constructor(options, builder, id, dofArbiter, cacheName) {
        super(options);
        this.builder = builder;
        this.dofArbiter = dofArbiter;
        this.cacheName = cacheName;
        this.timeFinishedInteraction = null;
        this.timeCacheDeleted = null;
        this.wasRejected = false;
        this.onBuilderStopped = this.onBuilderStopped.bind(this);
        this.onEvent = this.onEvent.bind(this);
        this.onCancelled = this.onCancelled.bind(this);
        this.onStarted = this.onStarted.bind(this);
    }
    play(requestor = 'Behavior') {
        return __awaiter(this, void 0, void 0, function* () {
            this.addBuilderListeners();
            this.instance = this.dofArbiter.playAnimation(this.builder, requestor);
            this.removeBuilderListeners();
            if (this.instance) {
                return jibo_common_types_1.PlayStatus.OK;
            }
            else {
                this.wasRejected = true;
                setImmediate(() => {
                    this.emit(AnimationInstance.EVENT, AnimationInstance.REJECTED);
                });
                return jibo_common_types_1.PlayStatus.REJECTED;
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.instance) {
                this.instance.stop();
            }
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.instance) {
                this.instance.setPaused(true);
            }
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.instance) {
                this.instance.setPaused(false);
            }
        });
    }
    destroy() {
        this.remove();
    }
    notifyCacheDeleted(cacheName) {
        if (cacheName === this.cacheName) {
            this.timeCacheDeleted = animation_utilities_1.Clock.currentTime();
        }
    }
    addBuilderListeners() {
        this.builder.on(AnimationInstance.STOPPED, this.onBuilderStopped);
        this.builder.on(AnimationInstance.EVENT, this.onEvent);
        this.builder.on(AnimationInstance.CANCELLED, this.onCancelled);
        this.builder.on(AnimationInstance.STARTED, this.onStarted);
    }
    removeBuilderListeners() {
        this.builder.off(AnimationInstance.STOPPED, this.onBuilderStopped);
        this.builder.off(AnimationInstance.EVENT, this.onEvent);
        this.builder.off(AnimationInstance.CANCELLED, this.onCancelled);
        this.builder.off(AnimationInstance.STARTED, this.onStarted);
    }
    onBuilderStopped(event, instance, payload) {
        this.emit(AnimationInstance.EVENT, AnimationInstance.STOPPED);
        this.instance = undefined;
        this.timeFinishedInteraction = animation_utilities_1.Clock.currentTime();
    }
    onCancelled(event, instance, payload) {
        if (!this.wasRejected) {
            this.emit(AnimationInstance.EVENT, AnimationInstance.CANCELLED);
        }
        this.instance = undefined;
        this.timeFinishedInteraction = animation_utilities_1.Clock.currentTime();
    }
    onEvent(event, instance, payload) {
        this.emit(AnimationInstance.EVENT, payload.eventName, payload.payload);
    }
    onStarted(event, instance, payload) {
        this.emit(AnimationInstance.EVENT, AnimationInstance.STARTED);
    }
}
AnimationInstance.STARTED = 'STARTED';
AnimationInstance.STOPPED = 'STOPPED';
AnimationInstance.EVENT = 'EVENT';
AnimationInstance.CANCELLED = 'CANCELLED';
AnimationInstance.REJECTED = 'REJECTED';
exports.default = AnimationInstance;

},{"animation-utilities":undefined,"jibo-common-types":undefined,"jibo-service-framework":undefined}],33:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_common_types_1 = require("jibo-common-types");
const animation_utilities_1 = require("animation-utilities");
const fs = require("fs");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const uuid = require("uuid");
const AnimationInstance_1 = require("./AnimationInstance");
const IndexRobot_1 = require("./IndexRobot");
const AttentionHandle_1 = require("./handles/AttentionHandle");
const AcquireHandle_1 = require("./handles/AcquireHandle");
const AwaitFaceHandle_1 = require("./handles/AwaitFaceHandle");
const log_1 = require("./log");
class BuilderCache extends jibo_cai_utils_1.CacheManager {
}
exports.BuilderCache = BuilderCache;
class EmitterDelegate {
    constructor(expression) {
        this.expression = expression;
    }
    display(timestamp, dofValues, metadata) {
        this.expression.emit('dofs', timestamp, dofValues, metadata);
        const featuresRaw = this.expression.animate.getKinematicFeatures();
        const features = {
            base: featuresRaw.Base,
            eye: featuresRaw.Eye,
            head: featuresRaw.Head,
        };
        this.expression.emit('kinematics', features);
    }
}
class Expression extends jibo_service_framework_1.ServiceRemoteObject {
    constructor(base, animate, dofArbiter, attention, timeline, robotInfo) {
        super({ base, instanceId: jibo_common_types_1.ExpressionIds.EXPRESSION });
        this.animate = animate;
        this.dofArbiter = dofArbiter;
        this.attention = attention;
        this.cache = new BuilderCache();
        this.instanceRetainTimeCacheDeleted = 15;
        this.instanceRetainTimeFinishedInteraction = 15;
        this.acquireRetainTimeFinishedInteraction = 15;
        this.awaitRetainTimeFinishedInteraction = 15;
        this.attentionModeRetainTimeFinishedInteraction = 1;
        this._doCenterRobotOnDisconnect = true;
        this.printInstanceCacheSizeInterval = 200;
        this.printInstanceCacheSizeThreshold = 200;
        this.printInstanceCacheSizeLastPrintedTime = null;
        timeline.addOutput(new animation_utilities_1.AuxOutput(robotInfo, new EmitterDelegate(this)));
        this.printInstanceCacheSizeLastPrintedTime = animation_utilities_1.Clock.currentTime().add(-this.printInstanceCacheSizeInterval);
        this.startInstanceCleanup();
    }
    setSkillRoot(root) {
        return __awaiter(this, void 0, void 0, function* () {
            this.skillRoot = root;
            process.chdir(root);
        });
    }
    createAnimation(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const createAnimResult = yield this.createAnimationFromOptions(options);
            return createAnimResult.instantiateResult;
        });
    }
    createAndPlayAnimation(options, requestor) {
        return __awaiter(this, void 0, void 0, function* () {
            const createAnimResult = yield this.createAnimationFromOptions(options);
            const playResult = yield createAnimResult.animationInstance.play(requestor);
            return {
                instantiateResult: createAnimResult.instantiateResult,
                playResult: playResult
            };
        });
    }
    setDOFs(dofIntersect, dofUnion, animData) {
        dofIntersect = dofIntersect || null;
        dofUnion = dofUnion || null;
        let dofNamesPresent = [];
        let animationLength = -1;
        let channels = animData.content.channels;
        let newChannels = [];
        for (let i = 0; i < channels.length; i++) {
            let channel = channels[i];
            let dofName = channel.dofName;
            if (dofIntersect === null || dofIntersect.hasDOF(dofName)) {
                newChannels.push(channel);
                dofNamesPresent.push(dofName);
            }
            if (channel.length > animationLength) {
                animationLength = channel.length;
            }
        }
        animData.content.channels = newChannels;
        if (animationLength < 0) {
            animationLength = 1;
        }
        if (dofUnion !== null) {
            let defaultValues = this.animate.getRobotInfo().getDefaultDOFValues();
            let toAddAsDefault = dofUnion.minus(dofUnion.createFromDofs(dofNamesPresent));
            let toAddArray = toAddAsDefault.getDOFs();
            for (let i = 0; i < toAddArray.length; i++) {
                let dofName = toAddArray[i];
                let channel = {
                    "dofName": dofName,
                    "times": [
                        0.0
                    ],
                    "values": [
                        defaultValues[dofName]
                    ],
                    "length": animationLength
                };
                animData.content.channels.push(channel);
            }
        }
    }
    destroyCaches(cacheNames) {
        return __awaiter(this, void 0, void 0, function* () {
            let instanceIter = this.base.cache.objectToId.keys();
            let instanceVal;
            while (!(instanceVal = instanceIter.next()).done) {
                let sro = instanceVal.value;
                if (sro instanceof AnimationInstance_1.default) {
                    if (cacheNames instanceof Array) {
                        for (let i = 0; i < cacheNames.length; i++) {
                            sro.notifyCacheDeleted(cacheNames[i]);
                        }
                    }
                    else {
                        sro.notifyCacheDeleted(cacheNames);
                    }
                }
            }
            if (typeof cacheNames === 'string') {
                this.cache.removeCache(cacheNames);
            }
            else if (cacheNames instanceof Array) {
                cacheNames.forEach((cacheName) => {
                    this.cache.removeCache(cacheName);
                });
            }
        });
    }
    setAttentionMode(mode) {
        return __awaiter(this, void 0, void 0, function* () {
            this.attention.setMode(mode);
        });
    }
    pushAttentionMode(mode) {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = this.attention.pushMode(mode);
            if (handle === null) {
                throw new Error("Unknown AttentionMode \"" + mode + "\" passed to pushAttentionMode()");
            }
            const remoteHandle = new AttentionHandle_1.default({ base: this.base, owner: this.callee }, handle);
            return {
                instanceId: remoteHandle.instanceId
            };
        });
    }
    getAttentionMode(mode) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.attention.getMode();
        });
    }
    acquireTarget(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const remoteHandle = new AcquireHandle_1.default({ base: this.base, owner: this.callee }, options, this.attention);
            return {
                instanceId: remoteHandle.instanceId
            };
        });
    }
    awaitFace(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const remoteHandle = new AwaitFaceHandle_1.default({ base: this.base, owner: this.callee }, options, this.attention);
            return {
                instanceId: remoteHandle.instanceId
            };
        });
    }
    centerRobot(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.centerGlobally === undefined) {
                options.centerGlobally = false;
            }
            let dofs = this.animate.dofs.ALL;
            if (options.dofs) {
                dofs = dofs.createFromDofs(options.dofs);
            }
            yield jibo_cai_utils_1.PromiseUtils.promisify(cb => this.dofArbiter.centerRobot(options.requestor, dofs, options.centerGlobally, cb), false);
        });
    }
    cleanup(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let dofs = this.animate.dofs.ALL;
            if (options.dofs) {
                dofs = dofs.createFromDofs(options.dofs);
            }
            if (options.trustee === undefined) {
                options.trustee = "Cleanup";
            }
            yield jibo_cai_utils_1.PromiseUtils.promisify(cb => this.dofArbiter.centerWithHybridPriority(options.requestor, options.trustee, dofs, options.owners, false, cb), false);
        });
    }
    indexRobot() {
        return __awaiter(this, void 0, void 0, function* () {
            const indexer = new IndexRobot_1.default();
            return yield indexer.index();
        });
    }
    setLEDColor(colors) {
        return __awaiter(this, void 0, void 0, function* () {
            this.animate.setLEDColor(colors);
        });
    }
    acceptEmotionState(currentEmotionValues, nearestEmotionName, nearestEmotionValues) {
        return __awaiter(this, void 0, void 0, function* () {
            this.attention.acceptEmotionState(currentEmotionValues, nearestEmotionName, nearestEmotionValues);
        });
    }
    blink(interrupt) {
        return __awaiter(this, void 0, void 0, function* () {
            this.animate.blink(interrupt);
        });
    }
    doCenterRobotOnDisconnect(allow) {
        return __awaiter(this, void 0, void 0, function* () {
            this._doCenterRobotOnDisconnect = allow;
        });
    }
    isPerformingShutdownPose() {
        return this._doCenterRobotOnDisconnect;
    }
    destroy() {
        return;
    }
    getDofsFromAnim(animData) {
        let dofs = [];
        let channels = animData.content.channels;
        for (let channel of channels) {
            dofs.push(channel.dofName);
        }
        return dofs;
    }
    transformAnimObject(options, animData) {
        let scales = options.scale;
        if (scales) {
            let i;
            let channels = animData.content.channels;
            for (let channel of channels) {
                let channelValues = channel.values;
                let dofName = channel.dofName;
                if (dofName in scales) {
                    let scale = scales[dofName];
                    let length = channelValues.length;
                    for (i = 0; i < length; i++) {
                        channelValues[i] *= scale;
                    }
                }
            }
        }
    }
    transformAnimLayers(options, animData) {
        let disableAudio = options.mutes && options.mutes.AUDIO !== undefined && options.mutes.AUDIO === false;
        if (disableAudio) {
            let events = animData.content.events;
            for (let i = 0; i < events.length; i++) {
                let event = events[i];
                if (event.eventName === 'play-audio') {
                    events.splice(i--, 1);
                }
            }
        }
    }
    getIntersectionDofs(options) {
        let mutes = options.mutes || {};
        let dofs = this.animate.dofs.ALL.createFromDofs(options.dofs);
        for (let mute in mutes) {
            if (mutes[mute] === false && mute !== 'AUDIO') {
                dofs = dofs.minus(this.animate.dofs[mute]);
            }
        }
        return dofs;
    }
    getUnionDofs(options) {
        let mutes = options.mutes || {};
        let dofs = this.arrayToDOFSet([]);
        for (let mute in mutes) {
            if (mutes[mute] === true && mute !== 'AUDIO') {
                dofs = dofs.plus(this.animate.dofs[mute]);
            }
        }
        return dofs;
    }
    arrayToDOFSet(dofsArray) {
        const dofs = this.animate.dofs.ALL;
        return dofs.createFromDofs(dofsArray);
    }
    startInstanceCleanup() {
        setInterval(() => {
            let instanceIter = this.base.cache.objectToId.keys();
            let instanceVal;
            let curTime = animation_utilities_1.Clock.currentTime();
            let initialSize = this.base.cache.objectToId.size;
            let ani = 0, aqh = 0, afh = 0, ath = 0;
            while (!(instanceVal = instanceIter.next()).done) {
                let sro = instanceVal.value;
                if (sro instanceof AnimationInstance_1.default) {
                    ani++;
                    let ai = sro;
                    if ((ai.timeCacheDeleted !== null && curTime.subtract(ai.timeCacheDeleted) > this.instanceRetainTimeCacheDeleted) ||
                        (ai.timeFinishedInteraction !== null && curTime.subtract(ai.timeFinishedInteraction) > this.instanceRetainTimeFinishedInteraction)) {
                        ai.destroy();
                    }
                }
                else if (sro instanceof AcquireHandle_1.default) {
                    aqh++;
                    let ah = sro;
                    if (ah.timeFinishedInteraction !== null && curTime.subtract(ah.timeFinishedInteraction) > this.acquireRetainTimeFinishedInteraction) {
                        ah.destroy();
                    }
                }
                else if (sro instanceof AwaitFaceHandle_1.default) {
                    afh++;
                    let af = sro;
                    if (af.timeFinishedInteraction !== null && curTime.subtract(af.timeFinishedInteraction) > this.awaitRetainTimeFinishedInteraction) {
                        af.destroy();
                    }
                }
                else if (sro instanceof AttentionHandle_1.default) {
                    ath++;
                    let ah = sro;
                    if (ah.timeFinishedInteraction !== null && curTime.subtract(ah.timeFinishedInteraction) > this.attentionModeRetainTimeFinishedInteraction) {
                        ah.destroy();
                    }
                }
            }
            let finalSize = this.base.cache.objectToId.size;
            if (initialSize > this.printInstanceCacheSizeThreshold || finalSize > this.printInstanceCacheSizeThreshold) {
                if (curTime.subtract(this.printInstanceCacheSizeLastPrintedTime) > this.printInstanceCacheSizeInterval) {
                    log_1.default.info("Expression Handle-Cache " + initialSize + " (anim:" + ani + " lookFace:" + aqh + " waitFace:" + afh + " attnMode:" + ath + ") -> " + finalSize);
                    this.printInstanceCacheSizeLastPrintedTime = curTime;
                }
            }
        }, 1000);
    }
    createAnimationFromOptions(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.data) {
                try {
                    const data = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => fs.readFile(options.src, 'utf8', cb));
                    options.data = JSON.parse(data);
                }
                catch (e) {
                    throw new Error(`Could not load or parse anim file at ${options.src}\n${e.message}`);
                }
            }
            if (!options.dofs) {
                options.dofs = this.getDofsFromAnim(options.data);
            }
            const intersectionDofs = this.getIntersectionDofs(options);
            const unionDofs = this.getUnionDofs(options);
            this.setDOFs(intersectionDofs, unionDofs, options.data);
            this.transformAnimObject(options, options.data);
            this.transformAnimLayers(options, options.data);
            const builder = this.animate.createAnimationBuilderFromData(options.data, options.path);
            this.setBuilderOptions(builder, options);
            if (options.cacheName === undefined) {
                options.cacheName = "";
            }
            const id = options.path + '##' + uuid.v4();
            return this.createAnimationInstance(builder, id, builder.getDOFs(), options.cacheName);
        });
    }
    createAnimationInstance(builder, id, dofs, cacheName) {
        const animInstance = new AnimationInstance_1.default({ base: this.base, owner: this.callee }, builder, id, this.dofArbiter, cacheName);
        const instantiateResult = {
            instanceId: animInstance.instanceId,
            state: { id, dofs }
        };
        return {
            animationInstance: animInstance,
            instantiateResult: instantiateResult
        };
    }
    setBuilderOptions(builder, options) {
        if (options.speed !== undefined) {
            builder.setSpeed(options.speed);
        }
        if (options.loops !== undefined) {
            builder.setNumLoops(options.loops);
        }
        if (options.layer !== undefined) {
            builder.setLayer(options.layer);
        }
    }
}
exports.default = Expression;

},{"./AnimationInstance":32,"./IndexRobot":35,"./handles/AcquireHandle":37,"./handles/AttentionHandle":38,"./handles/AwaitFaceHandle":39,"./log":41,"animation-utilities":undefined,"fs":undefined,"jibo-cai-utils":undefined,"jibo-common-types":undefined,"jibo-service-framework":undefined,"uuid":undefined}],34:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_service_framework_2 = require("jibo-service-framework");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const animation_utilities_1 = require("animation-utilities");
const animation_utilities_2 = require("animation-utilities");
const animation_utilities_3 = require("animation-utilities");
const Expression_1 = require("./Expression");
const jibo_dof_arbiter_1 = require("jibo-dof-arbiter");
const jibo_attention_manager_1 = require("jibo-attention-manager");
const Jibo_1 = require("./attention/Jibo");
const jibo_common_types_1 = require("jibo-common-types");
const log_1 = require("./log");
class ExpressionService extends jibo_service_framework_1.RemoteService {
    static get instance() {
        return ExpressionService._instance;
    }
    constructor(options, staticDir) {
        super('expression', options, staticDir);
        if (ExpressionService._instance) {
            throw new Error('Cannot instantiate ExpressionService more than once');
        }
        ExpressionService._instance = this;
        log_1.default.info('Instantiated');
    }
    init(callback) {
        super.init((err) => {
            if (err) {
                return callback(err);
            }
            this._init()
                .then(res => callback())
                .catch(callback);
        });
    }
    onClose(client) {
        super.onClose(client);
        this.expression.setAttentionMode(jibo_common_types_1.AttentionMode.OFF);
        if (this.expression.isPerformingShutdownPose()) {
            this.expression.centerRobot({ requestor: 'Test', centerGlobally: true }).then(() => {
                this.emit('system-reset');
            });
        }
        else {
            this.emit('system-reset');
        }
        this.expression.cache = new Expression_1.BuilderCache();
    }
    _init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initAnimUtils();
            yield this.initDOFArbiter();
            yield this.initAttention();
            this.expression = new Expression_1.default(this, this.animate, this.dofArbiter, this.attention, this.timeline, this.robotInfo);
        });
    }
    initAnimUtils() {
        return __awaiter(this, void 0, void 0, function* () {
            const auLog = log_1.default.createChild('AU');
            animation_utilities_3.slog.wrapLog(auLog.debug.bind(auLog), auLog.info.bind(auLog), auLog.warn.bind(auLog), auLog.error.bind(auLog));
            const config = new animation_utilities_1.JiboConfig();
            this.robotInfo = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => animation_utilities_2.RobotInfo.createInfo(config, cb), false);
            this.timeline = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => animation_utilities_2.TimelineBuilder.createTimeline(this.robotInfo, cb), false);
            this.animate = animation_utilities_2.animate.createAnimationUtilities();
            this.animate.init(this.timeline, this.robotInfo);
            return this.connectToBody();
        });
    }
    connectToBody() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const record = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => jibo_service_framework_2.RegistryClient.instance.getRecordByName('body', cb));
                const uri = "ws:" + record.host + ":" + record.port;
                const clock = this.timeline.getClock();
                this.bodyOutput = new animation_utilities_1.body.BodyPosVelOutput(clock, this.robotInfo, uri, true, 33);
                const ledOutput = new animation_utilities_1.LEDOutput(clock, this.robotInfo, uri, true, 33);
                this.timeline.addOutput(this.bodyOutput);
                this.timeline.addOutput(ledOutput);
                this.animate.MODALITY_NAME = animation_utilities_2.animate.MODALITY_NAME;
                this.animate.trajectory = animation_utilities_2.animate.trajectory;
                this.animate.AnimationEventType = animation_utilities_2.animate.AnimationEventType;
                this.animate.LookatEventType = animation_utilities_2.animate.LookatEventType;
                this.lazyInitCheck = null;
            }
            catch (err) {
                log_1.default.warn('Issue connecting to body.  Will try again when service is requested', err);
                if (!this.lazyInitCheck) {
                    this.lazyInitCheck = (callback) => {
                        if (!this.bodyOutput) {
                            this.connectToBody().then(() => callback(null), err => callback(err));
                        }
                        else {
                            callback(null);
                        }
                    };
                }
            }
        });
    }
    initDOFArbiter() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                priorityForUnknownLabels: 5,
                priorityForDirectUsers: 10,
                priorityEntries: [
                    { owner: 'LowTest', priority: 1 },
                    { owner: 'Cleanup', priority: 2 },
                    { owner: 'Attention', priority: 3 },
                    { owner: 'Behavior', priority: 5 },
                    { owner: 'EmbodiedSpeech', priority: 5 },
                    { owner: 'EmbodiedListen', priority: 7 },
                    { owner: 'AttentionCommand', priority: 7 },
                    { owner: 'BargeIn', priority: 8 },
                    { owner: 'Test', priority: 9 }
                ]
            };
            this.dofArbiter = new jibo_dof_arbiter_1.DOFArbiter();
            this.dofArbiter.init(this.animate, config);
        });
    }
    initAttention() {
        return __awaiter(this, void 0, void 0, function* () {
            const jeebo = new Jibo_1.default(this.robotInfo, this.animate, this.dofArbiter);
            yield jeebo.init();
            this.attention = new jibo_attention_manager_1.AttentionManager(jeebo);
        });
    }
}
exports.default = ExpressionService;

},{"./Expression":33,"./attention/Jibo":36,"./log":41,"animation-utilities":undefined,"jibo-attention-manager":undefined,"jibo-cai-utils":undefined,"jibo-common-types":undefined,"jibo-dof-arbiter":undefined,"jibo-service-framework":undefined}],35:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ExpressionService_1 = require("./ExpressionService");
const jibo_common_types_1 = require("jibo-common-types");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const log_1 = require("./log");
const log = log_1.default.createChild('IndexRobot');
class IndexRobot {
    constructor() {
        this.resumeMotionControlTimeoutMillis = 15000;
    }
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => this._index(cb), false);
            return result;
        });
    }
    _index(callback) {
        if (process.env.RUNMODE !== 'ON_ROBOT') {
            return callback(jibo_common_types_1.IndexRobotResult.SUCCEEDED);
        }
        const bodyOutput = ExpressionService_1.default.instance.bodyOutput;
        log.debug("Robot will index now, pausing body output!");
        bodyOutput.setPaused(true);
        const motionInterface = bodyOutput.getMotionInterface();
        const dofs = motionInterface.getMotionDOFNames();
        const prevDofs = [];
        for (let i = 0; i < dofs.length; i++) {
            let dofState = motionInterface.getState(dofs[i]);
            if (dofState) {
                prevDofs.push(dofState.getIndexCount());
            }
        }
        let counter = 100;
        const interval = setInterval(() => {
            counter--;
            if (counter < 0) {
                clearInterval(interval);
                this._resumeMotionControl(jibo_common_types_1.IndexRobotResult.TIMEOUT, callback);
                return;
            }
            if (!motionInterface.isConnected()) {
                return;
            }
            let allIndexed = true;
            for (let i = 0; i < dofs.length; i++) {
                const dofState = motionInterface.getState(dofs[i]);
                if (!dofState.isIndexed() || (prevDofs[i] === dofState.getIndexCount())) {
                    allIndexed = false;
                    break;
                }
            }
            if (allIndexed) {
                clearInterval(interval);
                this._resumeMotionControl(jibo_common_types_1.IndexRobotResult.SUCCEEDED, callback);
                return;
            }
            else if (motionInterface.hasLockout() || motionInterface.hasFault()) {
                clearInterval(interval);
                this._resumeMotionControl(jibo_common_types_1.IndexRobotResult.FAULT, callback);
                return;
            }
            for (let i = 0; i < dofs.length; i++) {
                const dofState = motionInterface.getState(dofs[i]);
                if (dofState.isIndexed() && (prevDofs[i] !== dofState.getIndexCount())) {
                    motionInterface.setCommand(dofs[i], 4, [0], null, 1, null);
                }
                else {
                    motionInterface.setCommand(dofs[i], 4, [-1], null, 1, null);
                }
            }
            motionInterface.sendCommand();
        }, 100);
    }
    _resumeMotionControl(indexingResult, callback) {
        const resumeMotionControlTimeoutHandle = setTimeout(() => {
            if (indexingResult === jibo_common_types_1.IndexRobotResult.SUCCEEDED) {
                log.warn("Indexing succeeded, but resuming motion control timed out, returning TIMEOUT.");
                callback(jibo_common_types_1.IndexRobotResult.TIMEOUT);
            }
            else if (indexingResult === jibo_common_types_1.IndexRobotResult.TIMEOUT) {
                log.warn("Indexing timed out, and resuming motion control timed out as well, returning TIMEOUT.");
                callback(jibo_common_types_1.IndexRobotResult.TIMEOUT);
            }
            else {
                log.warn("Indexing encountered a fault, and resuming motion control timed out, returning FAULT.");
                callback(jibo_common_types_1.IndexRobotResult.FAULT);
            }
        }, this.resumeMotionControlTimeoutMillis);
        ExpressionService_1.default.instance.bodyOutput.setPaused(false, () => {
            clearTimeout(resumeMotionControlTimeoutHandle);
            callback(indexingResult);
        });
    }
}
exports.default = IndexRobot;

},{"./ExpressionService":34,"./log":41,"jibo-cai-utils":undefined,"jibo-common-types":undefined}],36:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_cai_utils_1 = require("jibo-cai-utils");
const jibo_service_framework_1 = require("jibo-service-framework");
const services = require("jibo-service-clients/lib/expression-service-clients");
class Jibo {
    constructor(robotInfo, animate, dofArbiter) {
        this.robotInfo = robotInfo;
        this.animate = animate;
        this.dofArbiter = dofArbiter;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lps = services.lps;
            const record = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => jibo_service_framework_1.RegistryClient.instance.getRecordByName('lps', cb));
            yield jibo_cai_utils_1.PromiseUtils.promisify(cb => {
                services.init({}, [record], cb);
            });
        });
    }
}
exports.default = Jibo;

},{"jibo-cai-utils":undefined,"jibo-service-clients/lib/expression-service-clients":undefined,"jibo-service-framework":undefined}],37:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_common_types_1 = require("jibo-common-types");
const animation_utilities_1 = require("animation-utilities");
const log_1 = require("./log");
const log = log_1.default.createChild('Acquire');
class AcquireHandle extends jibo_service_framework_1.ServiceRemoteObject {
    constructor(superOptions, options, attention) {
        super(superOptions);
        this.options = options;
        this.attention = attention;
        this.timeFinishedInteraction = null;
        this.waitForPromise();
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.acquireHandle) {
                this.acquireHandle.cancel();
                yield this.acquireHandle.promise;
            }
            else {
                log.debug("cancel called on already-done AquireHandle");
            }
        });
    }
    destroy() {
        if (this.acquireHandle) {
            this.acquireHandle.cancel();
        }
        if (this.attentionHandle) {
            this.attentionHandle.release();
        }
        this.acquireHandle = undefined;
        this.attentionHandle = undefined;
        this.remove();
    }
    waitForPromise() {
        return __awaiter(this, void 0, void 0, function* () {
            this.attentionHandle = this.attention.pushMode(jibo_common_types_1.AttentionMode.COMMAND);
            this.acquireHandle = this.attention.attendToTarget(this.options.position, this.options.entity);
            const result = yield this.acquireHandle.promise;
            if (this.isDestroyed) {
                return;
            }
            const status = result.status;
            if (this.attentionHandle) {
                this.attentionHandle.release();
                this.attentionHandle = undefined;
            }
            setImmediate(() => {
                this.sendMessage('onPromise', [status], true);
            });
            this.acquireHandle = undefined;
            this.timeFinishedInteraction = animation_utilities_1.Clock.currentTime();
        });
    }
}
exports.default = AcquireHandle;

},{"./log":40,"animation-utilities":undefined,"jibo-common-types":undefined,"jibo-service-framework":undefined}],38:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const animation_utilities_1 = require("animation-utilities");
const log_1 = require("./log");
const log = log_1.default.createChild('Attention');
class AttentionHandle extends jibo_service_framework_1.ServiceRemoteObject {
    constructor(options, handle) {
        super(options);
        this.handle = handle;
        this.timeFinishedInteraction = null;
    }
    release() {
        return __awaiter(this, void 0, void 0, function* () {
            let result = false;
            if (this.handle) {
                result = this.handle.release();
            }
            else {
                log.warn("release called on already-done AttentionHandle!");
            }
            this.handle = undefined;
            this.timeFinishedInteraction = animation_utilities_1.Clock.currentTime();
            return result;
        });
    }
    destroy() {
        if (this.handle) {
            log.debug('DESTROYING ATTENTION HANDLE');
            this.handle.release();
            this.handle = undefined;
        }
        this.remove();
    }
}
exports.default = AttentionHandle;

},{"./log":40,"animation-utilities":undefined,"jibo-service-framework":undefined}],39:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const animation_utilities_1 = require("animation-utilities");
const log_1 = require("./log");
const log = log_1.default.createChild('AwaitFace');
class AwaitFaceHandle extends jibo_service_framework_1.ServiceRemoteObject {
    constructor(superOptions, options, attention) {
        super(superOptions);
        this.options = options;
        this.attention = attention;
        this.timeFinishedInteraction = null;
        this.waitForPromise();
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.awaitHandle) {
                this.awaitHandle.cancel();
            }
            else {
                log.debug("Cancel called on already-done AwaitFaceHandle");
            }
            this.awaitHandle = undefined;
            this.timeFinishedInteraction = animation_utilities_1.Clock.currentTime();
        });
    }
    destroy() {
        if (this.awaitHandle) {
            this.awaitHandle.cancel();
        }
        this.awaitHandle = undefined;
        this.remove();
    }
    waitForPromise() {
        return __awaiter(this, void 0, void 0, function* () {
            this.awaitHandle = this.attention.awaitFace(this.options.timeout, this.options.maxAngle, this.options.fullSearchTime);
            const result = yield this.awaitHandle.promise;
            if (this.isDestroyed) {
                return;
            }
            yield this.sendMessage('onPromise', [result], true);
            this.awaitHandle = undefined;
            this.timeFinishedInteraction = animation_utilities_1.Clock.currentTime();
        });
    }
}
exports.default = AwaitFaceHandle;

},{"./log":40,"animation-utilities":undefined,"jibo-service-framework":undefined}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Handles');

},{"../log":41}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../../services/log");
exports.default = log_1.default.createChild('Exp');

},{"../../services/log":51}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_common_types_1 = require("jibo-common-types");
const SkillsService_1 = require("../skills/SkillsService");
const SkillsServiceSim_1 = require("../../sim-services/skills/SkillsServiceSim");
const jibo_typed_events_1 = require("jibo-typed-events");
const jetstream_client_1 = require("@jibo/jetstream-client");
const log_1 = require("../log");
exports.log = log_1.default.createChild('GlobalService');
const GLOBAL_RULES = ['globals/global_commands_launch'];
class GlobalManagerService extends jibo_service_framework_1.HTTPWSService {
    static get instance() {
        return GlobalManagerService._instance;
    }
    constructor(options, rootDir) {
        super('global-manager', options, rootDir);
        if (GlobalManagerService._instance) {
            throw new Error('Cannot instantiate GlobalManagerService more than once');
        }
        GlobalManagerService._instance = this;
        this.onSetGlobal = this.onSetGlobal.bind(this);
        this.handleSkillLaunch = this.handleSkillLaunch.bind(this);
        this.skillRelaunch = new jibo_typed_events_1.Event('Skill relaunch sent through socket.');
        this.globalEvent = new jibo_typed_events_1.Event('Global event sent through socket.');
        this.globalHandlers = new Map();
        Object.keys(jibo_common_types_1.GlobalCommand).forEach((command) => {
            exports.log.debug('handling', command);
            this.globalHandlers.set(jibo_common_types_1.GlobalCommand[command], false);
        });
        exports.log.info('Instantiated');
    }
    init(callback) {
        super.init((err) => {
            jetstream_client_1.api.unsubscribeAllGlobals()
                .catch((err) => {
                exports.log.info('Unable to unsubscribe globals when starting up', err);
            })
                .then(() => {
                jetstream_client_1.api.events.skillSwitch.on(this.handleSkillLaunch);
                this.globalRuleToken = jetstream_client_1.api.setHotwordMode(jetstream_client_1.api.types.HotwordListenMode.Custom_NLU_Added, GLOBAL_RULES);
                this.globalRuleToken.match.on((result) => {
                    this.onGlobalParse(result);
                });
                exports.log.info("Initialized");
                callback(err);
            });
        });
    }
    routes(url) {
        super.routes(url);
        url.post('/global', (req, res) => {
            this.onSetGlobal(req, res);
        });
        url.post('/clean_relaunch', (req, res) => {
            this.onCleanRelaunch(req, res);
        });
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        if (client.url === '/globals') {
            this.globalSocket = client;
        }
    }
    sendWsJson(client, json) {
        if (client) {
            return super.sendWsJson(client, json);
        }
        else {
            return Promise.resolve(false);
        }
    }
    onMessage(command, client) {
        return;
    }
    onClose() {
        this.globalSocket = undefined;
    }
    handleSkillLaunch(result) {
        exports.log.debug('handling skill launch', result);
        const instance = SkillsService_1.default.instance || SkillsServiceSim_1.default.instance;
        let skillName;
        let parse;
        if (result instanceof jetstream_client_1.types.ListenResult) {
            skillName = result.match.skillID;
            parse = result;
        }
        else {
            skillName = result.onRobot ? result.skillID : '@be/nimbus';
            let matchPayload = {
                skillID: skillName,
                onRobot: result.onRobot,
                isProactive: result.isProactive,
                skipSurprises: result.skipSurprises,
            };
            if (!result.onRobot) {
                matchPayload.cloudSkill = result.skillID;
            }
            const data = result.data || { asr: null, nlu: null };
            parse = new jetstream_client_1.types.ListenResult(data.asr, data.nlu, matchPayload);
            parse.transID = result.transID;
        }
        if (instance &&
            instance.currentSkill && (instance.currentSkill.name === skillName ||
            instance.currentSkill.name.startsWith('@be/'))) {
            exports.log.debug('Emitting skillRelaunch');
            this.skillRelaunch.emit(parse);
            let body = this.returnType('OK', 'skill-relaunch', '', parse);
            this.sendWsJson(this.globalSocket, body);
        }
        else {
            exports.log.debug('Emitting launch');
            let body = this.returnType('OK', 'skill-launch', '', parse);
            this.sendWsJson(this.globalSocket, body);
        }
        return;
    }
    onGlobalParse(data) {
        exports.log.debug("onGlobalParse");
        let intent = data.result.nlu.intent;
        if (intent.match(/^volume/)) {
            intent = 'volume';
        }
        const result = new jetstream_client_1.types.ListenResult(data.result.asr, data.result.nlu);
        const command = jibo_common_types_1.GlobalCommandMap.get(intent);
        if (!command) {
            return;
        }
        else if (this.canHandleGlobal(command)) {
            exports.log.debug("Letting skill handle global", intent);
            this.emitGlobal(command, result);
        }
        else {
            exports.log.debug("default global behavior for ", intent);
            switch (command) {
                case jibo_common_types_1.GlobalCommand.STOP:
                    result.match = {
                        skillID: '@be/idle',
                        onRobot: true
                    };
                    this.handleSkillLaunch(result);
                    break;
                case jibo_common_types_1.GlobalCommand.HELP:
                    result.match = {
                        skillID: '@be/friendly-tips',
                        onRobot: true
                    };
                    this.handleSkillLaunch(result);
                    break;
                case jibo_common_types_1.GlobalCommand.SLEEP:
                    result.match = {
                        skillID: '@be/idle',
                        onRobot: true
                    };
                    this.handleSkillLaunch(result);
                    break;
                case jibo_common_types_1.GlobalCommand.PAUSE:
                    result.match = {
                        skillID: '@be/idle',
                        onRobot: true
                    };
                    this.handleSkillLaunch(result);
                    break;
                case jibo_common_types_1.GlobalCommand.HOLDON:
                    result.match = {
                        skillID: '@be/idle',
                        onRobot: true
                    };
                    this.handleSkillLaunch(result);
                    break;
                case jibo_common_types_1.GlobalCommand.WHATCANIDO:
                    result.match = {
                        skillID: '@be/friendly-tips',
                        onRobot: true
                    };
                    this.handleSkillLaunch(result);
                    break;
                case jibo_common_types_1.GlobalCommand.VOLUME:
                    exports.log.info("not yet setting volume in SSM");
                    this.sendNonInterrupting();
                    break;
                case jibo_common_types_1.GlobalCommand.OVERHERE:
                    this.sendNonInterrupting();
                    break;
                case jibo_common_types_1.GlobalCommand.TURNAROUND:
                case jibo_common_types_1.GlobalCommand.TURNAWAY:
                    result.match = {
                        skillID: '@be/idle',
                        onRobot: true
                    };
                    this.handleSkillLaunch(result);
                    break;
                default:
                    exports.log.error('Unrecognized global command: ', command);
                    this.sendNonInterrupting();
                    break;
            }
        }
    }
    canHandleGlobal(command) {
        exports.log.debug(`getting canHandle ${command} which is ${this.globalHandlers.get(command)}`);
        return this.globalHandlers.get(command);
    }
    emitGlobal(command, globalResults) {
        exports.log.debug('emitting global', globalResults);
        this.globalEvent.emit(globalResults);
        let body = this.returnType('OK', 'global', '', globalResults);
        this.sendWsJson(this.globalSocket, body);
    }
    sendNonInterrupting() {
        let body = this.returnType('OK', 'non-interrupting-global', '', {});
        this.sendWsJson(this.globalSocket, body);
    }
    onSetGlobal(req, res) {
        let rawData = '';
        req.on('data', (chunk) => {
            rawData += chunk;
        });
        req.on('end', () => {
            let data;
            try {
                data = JSON.parse(rawData);
            }
            catch (e) {
                exports.log.warn('Unable to parse set global JSON:', rawData);
                let body = this.returnType('ERROR', 'Unable to parse request', '', {});
                this.sendJson(res, JSON.stringify(body), 400);
                return;
            }
            this.globalHandlers.set(data.action, data.canHandle);
            let body = this.returnType('OK', JSON.stringify(data.action + ':' + data.canHandle), '', {});
            this.sendJson(res, JSON.stringify(body), 200);
        });
    }
    onCleanRelaunch(req, res) {
        req.on('data', (chunk) => {
        });
        req.on('end', () => {
            const data = {
                onRobot: true,
                skillID: '@be/idle',
                data: new jetstream_client_1.types.ListenResult({
                    text: 'stop',
                    confidence: 1
                }, {
                    intent: 'stop',
                    rules: null,
                    entities: {}
                })
            };
            this.handleSkillLaunch(data);
            let body = this.returnType('OK', null, '', {});
            this.sendJson(res, JSON.stringify(body), 200);
        });
    }
    returnType(status, message, id, data) {
        let body = {
            status: status,
            message: message,
            id: id,
            result: data || {},
            moreinfo: ''
        };
        return body;
    }
}
exports.default = GlobalManagerService;

},{"../../sim-services/skills/SkillsServiceSim":99,"../log":51,"../skills/SkillsService":65,"@jibo/jetstream-client":undefined,"jibo-common-types":undefined,"jibo-service-framework":undefined,"jibo-typed-events":undefined}],43:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jetstream_client_1 = require("@jibo/jetstream-client");
const log_1 = require("./log");
const log = log_1.default.createChild('EnrollmentLoopInformer');
class EnrollmentLoopInformer {
    update(loop) {
        return __awaiter(this, void 0, void 0, function* () {
            let currentLoopIds = [];
            let speakersToDelete = [];
            loop.forEach((user) => {
                if (user.data.status !== 'declined' && user.data.status !== 'removed') {
                    currentLoopIds.push(user._id);
                }
            });
            const enrolled = yield jetstream_client_1.api.getEnrolledSpeakers();
            enrolled.forEach((speaker) => {
                if (currentLoopIds.indexOf(speaker) === -1) {
                    log.info('deleting enrolled speaker with loop id', speaker);
                    speakersToDelete.push(speaker);
                }
            });
            for (const speaker of speakersToDelete) {
                try {
                    yield jetstream_client_1.api.removeSpeakerModel(speaker);
                }
                catch (err) {
                    log.warn(`Unable to remove speaker model for speaker with loop id ${speaker}`, err);
                }
            }
        });
    }
}
exports.default = EnrollmentLoopInformer;

},{"./log":50,"@jibo/jetstream-client":undefined}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_kb_1 = require("jibo-kb");
const jibo_server_1 = require("../../clients/jibo-server");
const SyncManager_1 = require("./SyncManager");
const KBClient_1 = require("../../clients/KBClient");
const log_1 = require("./log");
const log = log_1.default.createChild('Holiday');
const SYNC_PERIODIC_SECONDS = 6 * 3600;
const KB_SLICE_NAME = '/jibo/holidays';
const KB_LOOP_NAME = '/jibo/loop';
class HolidayManager extends SyncManager_1.default {
    constructor(httpUrl, enableCloud = true) {
        super(httpUrl, 'holidays', SYNC_PERIODIC_SECONDS * 1000, enableCloud);
    }
    init(callback) {
        super.init((err) => {
            log.iferr(err, 'super.init()');
            if (err) {
                callback(err);
            }
            else {
                let baseModel = KBClient_1.default.createModel(KB_SLICE_NAME, this.httpUrl);
                this.model = baseModel.begin();
                this._preloadHolidayModel(() => {
                    log.info('local cached holidays loaded, count: ', this._holidaysSize());
                    if (SyncManager_1.default.canSkipFullSync) {
                        log.info('doing first full sync in the background');
                        callback();
                        callback = () => { return; };
                    }
                    if (this.enableCloud) {
                        log.info('starting holiday cloud syncing...');
                        this._syncWithCloud(() => {
                            log.info('local holidays count after syncing: ', this._holidaysSize());
                            callback();
                            this._syncOnNotification('HolidayUpdated');
                            this._startSyncTimer();
                        });
                    }
                    else {
                        callback();
                    }
                });
            }
        });
    }
    _syncWithCloud(callback) {
        this._setupClients();
        this._startTimer();
        this._lookupLoopId((err, loopId) => {
            if (!err) {
                this.personClient.listHolidays({ loopId: loopId }, (err, data) => {
                    this._endTimer('JSC server call Person#listHolidays()');
                    log.iferr(err, 'JSC server call Person#listHolidays()');
                    if (!err) {
                        this._applyHolidayChanges(data, (err, changed) => {
                            log.iferr(err, '_applyHolidayChanges');
                            callback(err, changed);
                        });
                    }
                    else {
                        callback(err);
                    }
                });
            }
            else {
                callback(err);
            }
        });
    }
    _updated(callback) {
        log.info('holiday list was updated; emitting a HolidayUpdated event');
        this.emit('HolidayUpdated');
        process.nextTick(callback);
    }
    _preloadHolidayModel(callback) {
        this.model.loadRoot((err, rootNode) => {
            log.iferr(err, 'model.loadRoot');
            this.rootNode = rootNode;
            this.model.loadLayers(rootNode, 'holiday', (err) => {
                log.iferr(err, 'loadLayers holiday');
                callback();
            });
        });
    }
    _fetchHolidays() {
        return this.model.fetch(this.rootNode.getEdges('holiday'));
    }
    _holidaysSize() {
        let holidays = this._fetchHolidays();
        return holidays.length;
    }
    _setupClients() {
        if (!this.personClient) {
            this.personClient = new jibo_server_1.JSC.Person();
        }
    }
    _lookupLoopId(callback) {
        let loop = new jibo_kb_1.Model(KB_LOOP_NAME, this.httpUrl);
        loop.loadRoot((err, root) => {
            log.iferr(err, 'loop.loadRoot');
            if (!err) {
                callback(null, root.data.id);
            }
            else {
                callback(err);
            }
        });
    }
    _applyHolidayChanges(cloudHolidays, callback) {
        let model = this.model;
        let rootNode = this.rootNode;
        let newHolidays = [];
        let sameHolidays = [];
        let removeHolidays = [];
        let eventIds = {};
        let localHolidays = this._fetchHolidays();
        cloudHolidays.forEach((cloudHoliday) => {
            if (!cloudHoliday.eventId) {
                log.warn('holiday record missing eventId, skipping it', cloudHoliday);
                return;
            }
            if (eventIds[cloudHoliday.eventId]) {
                log.warn('holiday record has a duplicate eventId, skipping it', cloudHoliday);
                return;
            }
            eventIds[cloudHoliday.eventId] = true;
            let found = false;
            for (let i = 0; i < localHolidays.length; i++) {
                let localHoliday = localHolidays[i];
                if (cloudHoliday.eventId === localHoliday._id) {
                    sameHolidays.push(cloudHoliday);
                    found = true;
                    break;
                }
            }
            if (!found) {
                newHolidays.push(cloudHoliday);
            }
        });
        localHolidays.forEach((localHoliday) => {
            let found = false;
            for (let i = 0; i < cloudHolidays.length; i++) {
                let cloudHoliday = cloudHolidays[i];
                if (cloudHoliday.eventId === localHoliday._id) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                removeHolidays.push(localHoliday);
            }
        });
        let holidaysChanged = false;
        let newHolidayIds = newHolidays.map((holiday) => { return holiday.eventId; });
        model.load(newHolidayIds, (err) => {
            log.iferr(err, 'model.load');
            newHolidays.forEach((newHoliday) => {
                let oldNode = this.model.fetch(newHoliday.eventId, true);
                let newNode;
                if (oldNode) {
                    newNode = oldNode;
                }
                else {
                    newNode = new jibo_kb_1.Node('holiday');
                    newNode._id = newHoliday.eventId;
                    this.model.pool[0].adoptNodeAsOurOwn(newNode);
                    this.model.cache.add(newNode);
                }
                this._applyCloudHolidayToLocalHoliday(newHoliday, newNode);
                rootNode.addEdges(newNode, 'holiday');
                holidaysChanged = true;
            });
            sameHolidays.forEach((sameHoliday) => {
                let sameNode = this.model.fetch(sameHoliday.eventId);
                let changed = this._applyCloudHolidayToLocalHoliday(sameHoliday, sameNode);
                if (changed) {
                    holidaysChanged = true;
                }
            });
            removeHolidays.forEach((removeLocalHoliday) => {
                rootNode.removeEdges(removeLocalHoliday, 'holiday');
                holidaysChanged = true;
            });
            if (holidaysChanged) {
                log.info('holidays changed. saving...');
                this.model.saveLayers(rootNode, 'holiday', (err) => {
                    log.iferr(err, 'model.saveLayers');
                    log.info('finished saving holidays');
                    log.debug('new holidays', this._fetchHolidays());
                    callback(null, holidaysChanged);
                });
            }
            else {
                callback();
            }
        });
    }
    _applyCloudHolidayToLocalHoliday(cloudHoliday, localHolidayNode) {
        let changed = this._syncObjectStrict(cloudHoliday, localHolidayNode.data);
        return changed;
    }
}
exports.default = HolidayManager;

},{"../../clients/KBClient":14,"../../clients/jibo-server":17,"./SyncManager":49,"./log":50,"jibo-kb":undefined}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const querystring = require("querystring");
const onFinished = require("on-finished");
const tarFs = require("tar-fs");
const fsextra = require("fs-extra");
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_service_clients_1 = require("jibo-service-clients");
const jibo_kb_1 = require("jibo-kb");
const LoopManager_1 = require("./LoopManager");
const HolidayManager_1 = require("./HolidayManager");
const MediaListManager_1 = require("./MediaListManager");
const RobotManager_1 = require("./RobotManager");
const KBClient_1 = require("../../clients/KBClient");
const log_1 = require("./log");
const ENABLE_CLOUD_LOOP_SYNCING = true;
class KBService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('kb', options, rootDir);
        if (KBService._instance) {
            throw new Error('Cannot instantiate KBService more than once');
        }
        KBService._instance = this;
        this.kbdbs = {};
        this.queue = {};
        this.blockedRequestObject = {
            semaphores: [0, 0],
            queue: [],
            getUrls: null,
        };
        this.blockedRequestObject.getUrls = () => {
            let urls = [];
            for (let i = 0; i < this.blockedRequestObject.queue.length; i++) {
                let entry = this.blockedRequestObject.queue[i];
                if (!entry.handled) {
                    urls.push(entry.url);
                }
            }
            return urls;
        };
        log_1.default.info('Instantiated');
    }
    static get instance() {
        return KBService._instance;
    }
    init(callback) {
        super.init((err) => {
            if (err) {
                log_1.default.error('Error initializing HTTPService object', err);
            }
            else {
                log_1.default.info('Initialized');
            }
            KBClient_1.default.init({ host: '127.0.0.1', port: this.port }, (err) => {
                if (err) {
                    log_1.default.error('Error initializing KB client', err);
                }
                else {
                    log_1.default.info('KB client initialized');
                }
                return callback(err);
            });
        });
    }
    initSyncManagers(callback) {
        jibo_service_clients_1.systemManager.getMode((mode) => {
            if (mode === 'oobe') {
                log_1.default.info('KB service startup skipped in "oobe" mode');
                return callback();
            }
            let url = 'http://127.0.0.1:' + this.port;
            // BEacon owns the household roster; cloud seed must not rewrite /jibo/loop.
            this.loopManager = new LoopManager_1.default(url, false);
            this.loopManager.init(err => {
                if (err) {
                    log_1.default.error('Error initializing loop manager', err);
                }
                else {
                    log_1.default.info('Loop manager initialized');
                }
                this.robotManager = new RobotManager_1.default(url, ENABLE_CLOUD_LOOP_SYNCING);
                this.robotManager.init(err => {
                    if (err) {
                        log_1.default.error('Error initializing robot manager', err);
                    }
                    else {
                        log_1.default.info('Robot manager initialized');
                    }
                    this.holidayManager = new HolidayManager_1.default(url, ENABLE_CLOUD_LOOP_SYNCING);
                    this.holidayManager.init(err => {
                        if (err) {
                            log_1.default.error('Error initializing holiday manager', err);
                        }
                        else {
                            log_1.default.info('Holiday manager initialized');
                        }
                        this.mediaListManager = new MediaListManager_1.default(url, ENABLE_CLOUD_LOOP_SYNCING);
                        this.mediaListManager.init(err => {
                            if (err) {
                                log_1.default.error('Error initializing media list manager', err);
                            }
                            else {
                                log_1.default.info('Media list manager initialized');
                            }
                            this._registerManagerEvents();
                            callback();
                        });
                    });
                });
            });
        });
    }
    attachKBDB(req, res, callback) {
        if (req.params.kbname) {
            let kbName = querystring.unescape(req.params.kbname);
            if (this.kbdbs[kbName]) {
                req.params.kbdb = this.kbdbs[kbName];
                callback();
            }
            else {
                KBClient_1.default.databaseManager.exists(kbName, (err, exists) => {
                    if (err) {
                        if (!err) {
                            err = new Error('KB slice ' + kbName + ' does not exist, create it first');
                        }
                        res.statusCode = 500;
                        res.end(err.toString());
                    }
                    else {
                        if (this.queue[kbName]) {
                            log_1.default.debug('queueing up pending request for kb slice', kbName);
                            this.queue[kbName].push({ req: req, callback: callback });
                        }
                        else {
                            this.queue[kbName] = [{ req: req, callback: callback }];
                            let kbdb = new jibo_kb_1.KnowledgeDatabase(kbName);
                            log_1.default.debug('initing kbdb[' + kbName + ']');
                            kbdb.init((err) => {
                                log_1.default.iferr(err);
                                if (!err) {
                                    this.kbdbs[kbName] = kbdb;
                                }
                                this._processQueue(err, kbName);
                                delete this.queue[kbName];
                            });
                        }
                    }
                });
            }
        }
    }
    attachLoopKBDB(req, res, callback) {
        req.params.kbname = '/jibo/loop';
        this.attachKBDB(req, res, callback);
    }
    attachMediaListSlice(req, res, callback) {
        req.params.kbname = '/jibo/media-list';
        this.attachKBDB(req, res, callback);
    }
    routes(url) {
        super.routes(url);
        url.get('/v1/kb/:kbname/node/load/:id', (req, res) => {
            this.attachKBDB(req, res, () => {
                this.load(req, res);
            });
        });
        url.post('/v1/kb/:kbname/node/load', (req, res) => {
            this.attachKBDB(req, res, () => {
                this.loadList(req, res);
            });
        });
        url.get('/v1/kb/:kbname/node/loadRoot', (req, res) => {
            this.attachKBDB(req, res, () => {
                this.loadRoot(req, res);
            });
        });
        url.post('/v1/kb/:kbname/node/save', (req, res) => {
            this.attachKBDB(req, res, () => {
                this.save(req, res);
            });
        });
        url.delete('/v1/kb/:kbname/node/remove/:id', (req, res) => {
            this.attachKBDB(req, res, () => {
                this.remove(req, res);
            });
        });
        url.get('/v1/kb/:kbname/asset/:filename', (req, res) => {
            this.attachKBDB(req, res, () => {
                this.getAsset(req, res);
            });
        });
        url.post('/v1/kb/:kbname/asset/:filename', (req, res) => {
            this.attachKBDB(req, res, () => {
                this.addAsset(req, res);
            });
        });
        url.delete('/v1/kb/:kbname/asset/:filename', (req, res) => {
            this.attachKBDB(req, res, () => {
                this.removeAsset(req, res);
            });
        });
        url.post('/v1/kb/:kbname/create', (req, res) => {
            this.createSlice(req, res);
        });
        url.get('/v1/kb/:kbname/exists', (req, res) => {
            this.existsSlice(req, res);
        });
        url.delete('/v1/kb/:kbname/remove/yesiamsure', (req, res) => {
            this.removeSlice(req, res);
        });
        url.delete('/v1/removeall/yesiamsure', (req, res) => {
            this.removeKbEverything(req, res);
        });
        url.post('/v1/loop/updatePhoneticName', (req, res) => {
            this.attachLoopKBDB(req, res, () => {
                this.loopUpdatePhoneticName(req, res);
            });
        });
        url.post('/v1/loop/enrollment', (req, res) => {
            this.attachLoopKBDB(req, res, () => {
                this.loopSetEnrollment(req, res);
            });
        });
        url.post('/v1/loop/suspend', (req, res) => {
            this.attachLoopKBDB(req, res, () => {
                this.loopSuspend(req, res);
            });
        });
        url.get('/v1/loop/haskeybackup/:loopId', (req, res) => {
            this.attachLoopKBDB(req, res, () => {
                this.hasKeyBackup(req, res);
            });
        });
        url.post('/v1/media/storePhoto', (req, res) => {
            this.mediaStorePhoto(req, res);
        });
        url.post('/v1/media/downloadThumbnails', (req, res) => {
            this.mediaDownloadThumbnails(req, res);
        });
        url.post('/v1/media/downloadPhoto', (req, res) => {
            this.mediaDownloadPhoto(req, res);
        });
        url.post('/v1/media/deletePhoto', (req, res) => {
            this.mediaDeletePhoto(req, res);
        });
        url.post('/test', (req, res) => {
            this.testRequest(req, res);
        });
        this.setupRequestInterceptor();
    }
    setupRequestInterceptor() {
        this.app.use((req, res, next) => {
            let requestType = KBService.REGULAR_REQUEST;
            if (req.url.indexOf('/_M_/system/backup') === 0 ||
                req.url.indexOf('/_M_/system/restore') === 0 ||
                req.url.indexOf('/_M_/system/wipe') === 0) {
                requestType = KBService.BACKUP_RESTORE_REQUEST;
            }
            onFinished(res, () => {
                this.endRequestClearSemaphores(requestType);
            });
            let newReqObj = {
                type: requestType,
                fn: next,
                url: req.url,
                handled: false
            };
            this.blockedRequestObject.queue.push(newReqObj);
            if (this.blockedRequestObject.semaphores[requestType] === 0) {
                this._processBlockedRequests();
                this._cleanRequestQueue();
            }
        });
    }
    load(req, res) {
        let kbdb = req.params.kbdb;
        let _id = req.params.id;
        kbdb.load(_id, (err, node) => {
            log_1.default.iferr(err, 'kb.load');
            this.sendJson(res, node);
        });
    }
    loadList(req, res) {
        let kbdb = req.params.kbdb;
        let _ids = req.body;
        kbdb.loadList(_ids, (err, nodes) => {
            log_1.default.iferr(err, 'kb.loadList');
            if (Array.isArray(nodes) && Array.isArray(_ids) && nodes.length === _ids.length) {
                log_1.default.debug(`loaded ${nodes.length} nodes`);
            }
            this.sendJson(res, nodes);
        });
    }
    loadRoot(req, res) {
        let kbdb = req.params.kbdb;
        kbdb.loadRoot((err, node) => {
            log_1.default.iferr(err, 'kb.load');
            this.sendJson(res, node, err ? 500 : null);
        });
    }
    save(req, res) {
        let kbdb = req.params.kbdb;
        let node = new jibo_kb_1.Node(null, null, req.body);
        kbdb.adoptNodeAsOurOwn(node);
        node.save((err) => {
            log_1.default.iferr(err, 'node.save');
            this.finish(res, err);
        });
    }
    remove(req, res) {
        let kbdb = req.params.kbdb;
        let _id = req.params.id;
        kbdb.remove(_id, (err) => {
            log_1.default.iferr(err, 'node.remove');
            this.finish(res, err);
        });
    }
    createAssetInstance(req) {
        let kbdb = req.params.kbdb;
        let filename = req.params.filename;
        let rootDir = kbdb.getDirectory();
        let asset = new jibo_kb_1.Asset(filename);
        asset.setRootDir(rootDir);
        return asset;
    }
    getAsset(req, res) {
        let asset = this.createAssetInstance(req);
        let filename = asset.fullFilenameOrURL();
        this.sendFile(res, filename);
    }
    addAsset(req, res) {
        let asset = this.createAssetInstance(req);
        asset.save(req, (err) => {
            this.finish(res, err);
        });
    }
    removeAsset(req, res) {
        let asset = this.createAssetInstance(req);
        asset.remove((err) => {
            this.finish(res, err);
        });
    }
    createSlice(req, res) {
        let kbName = querystring.unescape(req.params.kbname);
        KBClient_1.default.databaseManager.create(kbName, (err, created) => {
            if (err) {
                throw err;
            }
            else {
                this.sendJson(res, { created: created });
            }
        });
    }
    existsSlice(req, res) {
        let kbName = querystring.unescape(req.params.kbname);
        KBClient_1.default.databaseManager.exists(kbName, (err, exists) => {
            if (err) {
                throw err;
            }
            else {
                this.sendJson(res, { exists: exists });
            }
        });
    }
    removeSlice(req, res) {
        let kbName = querystring.unescape(req.params.kbname);
        if (kbName === '/jibo/loop' && this.loopManager) {
            this.loopManager.shutdown((err) => {
                log_1.default.iferr(err);
                if (err) {
                    throw err;
                }
                this.loopManager = null;
                this.removeSlice(req, res);
            });
        }
        else {
            Object.keys(this.kbdbs).forEach((name) => {
                if ((kbName === name) || (name.startsWith(kbName + '/'))) {
                    delete this.kbdbs[kbName];
                    KBClient_1.default.databaseManager.release(kbName);
                }
            });
            let directory = jibo_kb_1.KnowledgeDatabase.getKbDirectory(kbName);
            directory = path.normalize(directory);
            if (directory.length < 8) {
                throw new Error('not comfortable with kb slice directory name ' + directory);
            }
            else {
                log_1.default.info('removing kb slice', directory);
                rimraf(directory, { disableGlob: true }, (err) => {
                    this.finish(res, err);
                });
            }
        }
    }
    removeKbEverything(req, res) {
        this.loopManager.shutdown((err) => {
            log_1.default.iferr(err);
            if (err) {
                throw err;
            }
            this.loopManager = null;
            this.kbdbs = null;
            let rootDirectory = jibo_kb_1.KnowledgeDatabase.getRootDirectory();
            rootDirectory = path.normalize(rootDirectory);
            if (rootDirectory.length < 8) {
                throw new Error('not comfortable with kb root directory name ' + rootDirectory);
            }
            else {
                log_1.default.warn('removing the entire kb at', rootDirectory);
                rimraf(rootDirectory, { disableGlob: true }, (err) => {
                    if (err) {
                        throw err;
                    }
                    fs.mkdir(rootDirectory, (err) => {
                        this.finish(res, err);
                    });
                });
            }
        });
    }
    loopUpdatePhoneticName(req, res) {
        if (req.body && req.body._id) {
            log_1.default.debug('loop updatePhoneticName', req.body._id);
        }
        let params = req.body;
        let acceptableFields = ['loopId', 'id', 'phoneticName'];
        Object.keys(params).forEach((field) => {
            if (acceptableFields.indexOf(field) < 0) {
                throw new Error('unacceptable field in account update: ' + field);
            }
        });
        this.loopManager.loopUpdatePhoneticName(params, (err) => {
            this.finish(res, err);
        });
    }
    loopSetEnrollment(req, res) {
        if (req.body && req.body._id) {
            log_1.default.debug('loop set enrollment', req.body._id);
        }
        let params = req.body;
        let acceptableFields = ['loopId', 'id', 'face', 'voice'];
        Object.keys(params).forEach((field) => {
            if (acceptableFields.indexOf(field) < 0) {
                throw new Error('unacceptable field in loop set enrollment:' + field);
            }
        });
        this.loopManager.loopSetEnrollment(params, (err) => {
            this.finish(res, err);
        });
    }
    loopSuspend(req, res) {
        if (req.body && req.body._id) {
            log_1.default.debug('loop suspend', req.body._id);
        }
        let params = req.body;
        let acceptableFields = ['loopId'];
        Object.keys(params).forEach((field) => {
            if (acceptableFields.indexOf(field) < 0) {
                throw new Error('unacceptable field in loop set enrollment:' + field);
            }
        });
        this.loopManager.loopSuspend(params, (err) => {
            this.finish(res, err);
        });
    }
    hasKeyBackup(req, res) {
        this.loopManager.hasKeyBackup(req.params.loopId, (err, hasBackup) => {
            this.sendJson(res, { hasKeyBackup: hasBackup });
        });
    }
    mediaStorePhoto(req, res) {
        if (req.body && req.body.id) {
            log_1.default.debug('media store photo', req.body.id);
        }
        let data = req.body;
        this.mediaListManager.storePhoto(data, (err, response) => {
            if (err) {
                throw err;
            }
            else {
                this.sendJson(res, response);
            }
        });
    }
    mediaDownloadThumbnails(req, res) {
        if (req.body && req.body.ids) {
            log_1.default.debug('media download thumbnails', req.body.ids);
        }
        let params = req.body;
        this.mediaListManager.downloadThumbnails(params.ids, params.type, (err) => {
            this.finish(res, err);
        });
    }
    mediaDownloadPhoto(req, res) {
        if (req.body && req.body.id) {
            log_1.default.debug('media download photo', req.body.id);
        }
        let params = req.body;
        this.mediaListManager.downloadPhoto(params.id, params.type, (err) => {
            this.finish(res, err);
        });
    }
    mediaDeletePhoto(req, res) {
        if (req.body && req.body.id) {
            log_1.default.debug('media delete photo', req.body.id);
        }
        let params = req.body;
        this.mediaListManager.deletePhoto(params.id, (err) => {
            this.finish(res, err);
        });
    }
    onMessage(command, client) {
        return;
    }
    onBackupRequest(req, res) {
        let params = req.body;
        let backupDirectory = params.directory;
        let finishFunc = (code) => {
            this.sendJson(res, {}, code);
        };
        try {
            fsextra.ensureDirSync(backupDirectory);
        }
        catch (err) {
            log_1.default.error('error creating backup directory', err);
            finishFunc(500);
            return;
        }
        let backupFile = path.join(backupDirectory, 'kb-backup.tar');
        let kbDirectory = jibo_kb_1.KnowledgeDatabase.getRootDirectory();
        if (params.dataDirectory) {
            kbDirectory = params.dataDirectory;
        }
        kbDirectory = path.normalize(kbDirectory);
        rimraf(backupFile, { disableGlob: true }, (err) => {
            if (err) {
                log_1.default.warn('Error removing backup file ', err);
                finishFunc(500);
            }
            let fsStream = fs.createWriteStream(backupFile);
            fsStream.on('error', (error) => {
                log_1.default.error('Error backing up Knowledge Base service', error);
                finishFunc(500);
            });
            fsStream.on('finish', (error) => {
                if (error) {
                    log_1.default.error('Error backing up Knowledge Base service', error);
                    finishFunc(500);
                }
                else {
                    finishFunc(204);
                }
            });
            tarFs.pack(kbDirectory)
                .pipe(fsStream);
        });
        return;
    }
    onRestoreRequest(req, res) {
        Object.keys(this.kbdbs).forEach((name) => {
            delete this.kbdbs[name];
            KBClient_1.default.databaseManager.release(name);
        });
        let params = req.body;
        let backupDirectory = params.directory;
        let kbDirectory = jibo_kb_1.KnowledgeDatabase.getRootDirectory();
        if (params.dataDirectory) {
            kbDirectory = params.dataDirectory;
        }
        let finishFunc = (code) => {
            fs.mkdir(kbDirectory, (err) => {
                this.sendJson(res, {}, code);
            });
        };
        try {
            fsextra.ensureDirSync(backupDirectory);
        }
        catch (err) {
            log_1.default.error('error creating backup directory', err);
            finishFunc(500);
            return;
        }
        let backupFile = path.join(backupDirectory, 'kb-backup.tar');
        kbDirectory = path.normalize(kbDirectory);
        rimraf(kbDirectory, { disableGlob: true }, (err) => {
            if (err) {
                log_1.default.error('Error removing KB data folder ', err);
                finishFunc(500);
            }
            let fsStream = fs.createReadStream(backupFile);
            fsStream.pipe(tarFs.extract(kbDirectory))
                .on('finish', (err) => {
                if (err) {
                    log_1.default.error('Problem extracting tar stream', err);
                    finishFunc(500);
                }
                else {
                    finishFunc(204);
                }
            });
            fsStream.on('error', (err) => {
                if (err) {
                    log_1.default.error('problem with POST stream', err);
                    finishFunc(500);
                }
            });
        });
        return;
    }
    onWipeRequest(req, res) {
        Object.keys(this.kbdbs).forEach((name) => {
            delete this.kbdbs[name];
            KBClient_1.default.databaseManager.release(name);
        });
        let params = req.body;
        let kbDirectory = jibo_kb_1.KnowledgeDatabase.getRootDirectory();
        if (params.dataDirectory) {
            kbDirectory = params.dataDirectory;
        }
        kbDirectory = path.normalize(kbDirectory);
        let err;
        try {
            rimraf.sync(kbDirectory, { disableGlob: true });
        }
        catch (e) {
            err = e;
        }
        let finishFunc = (code) => {
            fs.mkdir(kbDirectory, (err) => {
                if (err) {
                    log_1.default.error('Error making directory ', kbDirectory);
                }
                this.sendJson(res, {}, code);
            });
        };
        if (err) {
            log_1.default.error('Error removing KB data folder', err);
            finishFunc(500);
        }
        finishFunc(204);
    }
    _registerManagerEvents() {
        this.mediaListManager.on('MediaListChanged', () => {
            log_1.default.debug('MediaListChanged event received from MediaListManager, broadcasting to WebSocket');
            this.broadcast('"MediaListChanged"');
        });
        this.holidayManager.on('HolidayChanged', () => {
            log_1.default.debug('HolidayChanged event received from HolidayManager, broadcasting to WebSocket');
            this.broadcast('"HolidayChanged"');
        });
        this.robotManager.on('RobotUpdated', () => {
            log_1.default.debug('RobotUpdated event received from RobotManager, broadcasting to WebSocket');
            this.broadcast('"RobotUpdated"');
        });
    }
    testRequest(req, res) {
        let params = req.body;
        let timeOut = 0;
        if (params.timer) {
            timeOut = params.timer;
        }
        setTimeout(() => {
            this.sendJson(res, {}, 204);
        }, timeOut);
    }
    endRequestClearSemaphores(requestType) {
        if (requestType === KBService.REGULAR_REQUEST) {
            this._setBlockingSemaphore(KBService.BACKUP_RESTORE_REQUEST, false);
        }
        else if (requestType === KBService.BACKUP_RESTORE_REQUEST) {
            this._setBlockingSemaphore(KBService.REGULAR_REQUEST, false);
            this._setBlockingSemaphore(KBService.BACKUP_RESTORE_REQUEST, false);
        }
    }
    _processQueue(err, kbName) {
        let queue = this.queue[kbName];
        if (queue.length > 1) {
            log_1.default.debug('processing pending requests for', kbName);
        }
        let first = true;
        while (queue.length > 0) {
            let pending = queue.shift();
            pending.req.params.kbdb = this.kbdbs[kbName];
            if (first) {
                pending.callback(err);
                first = false;
            }
            else {
                pending.callback();
            }
        }
    }
    _setBlockingSemaphore(type, val) {
        let delta = (val) ? 1 : -1;
        this.blockedRequestObject.semaphores[type] = this.blockedRequestObject.semaphores[type] + delta;
        if (this.blockedRequestObject.semaphores[type] < 0) {
            log_1.default.warn('unmatched semaphore decrement');
        }
        if (this.blockedRequestObject.semaphores[type] === 0) {
            this._processBlockedRequests();
        }
        return true;
    }
    _processBlockedRequests() {
        for (let i = 0; i < this.blockedRequestObject.queue.length; i++) {
            let entry = this.blockedRequestObject.queue[i];
            if (this.blockedRequestObject.semaphores[entry.type] === 0) {
                if (!entry.handled) {
                    entry.handled = true;
                    if (entry.type === KBService.REGULAR_REQUEST) {
                        this._setBlockingSemaphore(KBService.BACKUP_RESTORE_REQUEST, true);
                    }
                    else if (entry.type === KBService.BACKUP_RESTORE_REQUEST) {
                        this._setBlockingSemaphore(KBService.REGULAR_REQUEST, true);
                        this._setBlockingSemaphore(KBService.BACKUP_RESTORE_REQUEST, true);
                    }
                    entry.fn();
                }
            }
        }
    }
    _cleanRequestQueue() {
        let newQueue = [];
        for (let i = 0; i < this.blockedRequestObject.queue.length; i++) {
            let entry = this.blockedRequestObject.queue[i];
            if (!entry.handled) {
                newQueue.push(entry);
            }
        }
        this.blockedRequestObject.queue = newQueue;
    }
}
KBService.REGULAR_REQUEST = 0;
KBService.BACKUP_RESTORE_REQUEST = 1;
KBService.NUM_REQUEST_TYPES = 2;
exports.default = KBService;

},{"../../clients/KBClient":14,"./HolidayManager":44,"./LoopManager":46,"./MediaListManager":47,"./RobotManager":48,"./log":50,"fs":undefined,"fs-extra":undefined,"jibo-kb":undefined,"jibo-service-clients":undefined,"jibo-service-framework":undefined,"on-finished":undefined,"path":undefined,"querystring":undefined,"rimraf":undefined,"tar-fs":undefined}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const url = require("url");
const axios_1 = require("axios");
const async = require("async");
const jibo_kb_1 = require("jibo-kb");
const jibo_server_1 = require("../../clients/jibo-server");
const KBClient_1 = require("../../clients/KBClient");
const SyncManager_1 = require("./SyncManager");
const EnrollmentLoopInformer_1 = require("./EnrollmentLoopInformer");
const log_1 = require("./log");
const log = log_1.default.createChild('Loop');
const PERIODIC_SECONDS = 60;
const KB_SLICE_NAME = '/jibo/loop';
var Gender;
(function (Gender) {
    Gender["male"] = "male";
    Gender["female"] = "female";
    Gender["other"] = "other";
})(Gender = exports.Gender || (exports.Gender = {}));
class LoopManager extends SyncManager_1.default {
    constructor(httpUrl, enableCloud = true) {
        super(httpUrl, 'loop', PERIODIC_SECONDS * 1000, enableCloud);
        this.loopInformers = [];
    }
    init(callback) {
        log.info('initing LoopManager');
        super.init((err) => {
            log.iferr(err, 'super.init');
            if (err) {
                callback(err);
            }
            else {
                this._initCredentials((err) => {
                    let baseModel = KBClient_1.default.createModel(KB_SLICE_NAME, this.httpUrl);
                    this.model = baseModel.begin();
                    this._preloadLoopModel(() => {
                        log.info('local cached loop loaded, members: ', this._loopSize());
                        this._setupLoopInformers(() => {
                            this._updateLoopInformers(() => {
                                const lastCredentialsHash = this.rootNode.data.lastFullSyncCredentialsHash;
                                this._setupCanSkipFullSync(lastCredentialsHash);
                                if (err || SyncManager_1.default.canSkipFullSync) {
                                    log.info('doing first full sync in the background');
                                    callback();
                                    callback = () => { return; };
                                }
                                if (this.enableCloud) {
                                    log.info('starting loop cloud syncing...');
                                    this._syncWithCloud(() => {
                                        let size = this._loopSize();
                                        log.info('local loop members: ', size);
                                        if (size === 0) {
                                            log.error('This robot does not have a loop!');
                                        }
                                        this._syncOnNotification('AccountUpdated');
                                        this._syncOnNotification('LoopUpdated');
                                        this._updateLoopInformers((err) => {
                                            log.iferr(err, 'error updating loop informers');
                                            callback();
                                        });
                                        this._startSyncTimer();
                                    });
                                }
                                else {
                                    if (this._loopSize() === 0) {
                                        log.error('This robot does not have a loop!');
                                    }
                                    callback();
                                }
                            });
                        });
                    });
                });
            }
        });
    }
    shutdown(callback) {
        this._notDuringSyncing((done) => {
            delete this.model;
            this.isShutdown = true;
            callback(null);
        });
    }
    accountUpdate(params, callback) {
        let account = new jibo_server_1.JSC.Account();
        this._notDuringSyncing((done) => {
            account.update(params, (err, data) => {
                log.iferr(err, 'JSC.Acount.update');
                if (err) {
                    done();
                    callback(err);
                }
                else {
                    let user = this.model.fetch(params._id);
                    if (!user) {
                        done();
                        callback(err);
                    }
                    else {
                        Object.keys(params).forEach((field) => {
                            if (field !== '_id') {
                                user.data[field] = params[field];
                            }
                        });
                        user.save((err) => {
                            done();
                            callback(err);
                        });
                    }
                }
            });
        });
    }
    loopUpdatePhoneticName(params, callback) {
        let loop = new jibo_server_1.JSC.Loop();
        this._notDuringSyncing((done) => {
            loop.updatePhoneticName(params, (err, data) => {
                log.iferr(err, 'JSC.Loop.updatePhoneticName');
                if (err) {
                    done();
                    callback(err);
                }
                else {
                    let user = this.model.fetch(params.id);
                    if (!user) {
                        done();
                        callback(err);
                    }
                    else {
                        user.data.phoneticName = params.phoneticName;
                        user.save((err) => {
                            done();
                            callback(err);
                        });
                    }
                }
            });
        });
    }
    loopSetEnrollment(params, callback) {
        let loop = new jibo_server_1.JSC.Loop();
        this._notDuringSyncing((done) => {
            loop.setEnrollment(params, (err, data) => {
                log.iferr(err, 'JSC.Loop.setEnrollment');
                if (err) {
                    done();
                    callback(err);
                }
                else {
                    let user = this.model.fetch(params.id);
                    if (!user) {
                        done();
                        callback(err);
                    }
                    else {
                        ['face', 'voice'].forEach((field) => {
                            if (field in params) {
                                user.data.enrolled = user.data.enrolled || {};
                                user.data.enrolled[field] = params[field];
                            }
                        });
                        user.save((err) => {
                            done();
                            callback(err);
                        });
                    }
                }
            });
        });
    }
    loopSuspend(params, callback) {
        let loop = new jibo_server_1.JSC.Loop();
        this._notDuringSyncing((done) => {
            loop.suspendLoop(params, (err, data) => {
                log.iferr(err, 'JSC.Loop.loopSuspend');
                done();
                callback(err);
            });
        });
    }
    hasKeyBackup(loopId, callback) {
        let keyClient = new jibo_server_1.JSC.Key();
        keyClient.restore({ passwordHash: 'X', loopId: loopId }, (err, data) => {
            let hasKeyBackup;
            if (err) {
                if (err.code === 'BACKUP_PASSWORD_WRONG') {
                    hasKeyBackup = true;
                }
                else {
                    hasKeyBackup = false;
                }
            }
            else {
                hasKeyBackup = true;
            }
            callback(null, hasKeyBackup);
        });
    }
    _syncWithCloud(callback) {
        this._setupClients();
        this._setupRobotAccountId((err) => {
            if (err) {
                this._errorOnce('_setupRobotAccountId ' + err.toString());
            }
            if (!err) {
                this._startTimer();
                this.loopClient.list({}, (err, data) => {
                    this._endTimer('JSC server call Loop#list()');
                    log.iferr(err, 'JSC server call Loop#list()');
                    if (!err) {
                        this._logLoopListPayload(data);
                        if (this._isLoopGood(data)) {
                            let loop = data[0];
                            this._filterOutInvitedChildren(loop);
                            this._applyLoopChanges(loop, (applyErr, changed) => {
                                log.iferr(applyErr, '_applyLoopChanges');
                                this._recordSyncDiagnostics(applyErr ? applyErr.message : null, loop, () => {
                                    callback(applyErr, changed);
                                });
                            });
                        }
                        else {
                            const badLoop = (data && data[0]) ? data[0] : null;
                            const reason = 'no loop';
                            this._recordSyncDiagnostics(reason, badLoop, () => {
                                callback(new Error(reason));
                            });
                        }
                    }
                    else {
                        this._recordSyncDiagnostics(err.toString(), null, () => {
                            callback(err);
                        });
                    }
                });
            }
            else {
                this._recordSyncDiagnostics(err.toString(), null, () => {
                    callback(err);
                });
            }
        });
    }
    _updated(callback) {
        this.emit('LoopUpdated');
        this._updateLoopInformers(callback);
    }
    _preloadLoopModel(callback) {
        log.info('loading root node');
        this.model.loadRoot((err, rootNode) => {
            log.iferr(err, 'model.loadRoot');
            this.rootNode = rootNode;
            this.model.loadLayers(rootNode, ['owner', 'user'], (err) => {
                log.iferr(err, 'loadLayers owner, user');
                callback();
            });
        });
    }
    _fetchLoop() {
        return this.model.fetch(this.rootNode.getEdges('user'));
    }
    _loopSize() {
        let loop = this._fetchLoop();
        return loop.length;
    }
    _setupLoopInformers(callback) {
        this.loopInformers.push(new EnrollmentLoopInformer_1.default());
        if (this.enableCloud && this.onRobot) {
            this._setupClients();
            this._setupRobotAccountId((err) => {
                log.iferr(err, '_setupRobotAccountId');
                setImmediate(callback);
            });
        }
        else {
            setImmediate(callback);
        }
    }
    _updateLoopInformers(callback) {
        const loop = this._fetchLoop();
        Promise.all(this.loopInformers.map(informer => informer.update(loop)))
            .catch((err) => {
            log.warn('Unable to update loop informers', err);
        })
            .then(() => callback());
    }
    _isLoopGood(data) {
        if (!data || !Number.isInteger(data.length) || data.length === 0) {
            log.error('JSC Loop#list() account ' + this.robotAccountId + ' does not have a loop');
            return false;
        }
        if (data.length !== 1) {
            log.error('JSC Loop#list() account ' + this.robotAccountId + ' is returning multiple loops');
            return false;
        }
        let loop = data[0];
        let members = loop.members;
        if (!members || !Number.isInteger(members.length) || members.length === 0) {
            // Keep rejecting empty rosters — applying them would prune the local KB —
            // but log every tick so the failure is visible in ssm/BEacon diagnostics.
            log.error('JSC server call Loop#list() loop has no members', {
                loopId: loop.id,
                owner: loop.owner,
                robot: loop.robot,
                memberCount: members ? members.length : 0
            });
            return false;
        }
        let loopAccountIds = loop.members.map(element => element.accountId);
        if (!loopAccountIds.includes(loop.owner)) {
            log.warn('JSC server call Loop#list() owner not in loop for robot ' + this.robotAccountId, {
                owner: loop.owner,
                memberAccountIds: loopAccountIds
            });
        }
        if (!loopAccountIds.includes(loop.robot)) {
            log.warn('JSC server call Loop#list() robot ' + this.robotAccountId + ' not in loop', {
                robot: loop.robot,
                memberAccountIds: loopAccountIds
            });
        }
        return true;
    }
    _logLoopListPayload(data) {
        const loops = Array.isArray(data) ? data : [];
        const summaries = loops.map((loop) => {
            const members = Array.isArray(loop.members) ? loop.members : [];
            return {
                id: loop.id,
                owner: loop.owner,
                robot: loop.robot,
                memberCount: members.length,
                members: members.map((member) => ({
                    id: member.id,
                    type: member.type,
                    accountId: member.accountId,
                    status: member.status
                }))
            };
        });
        log.info('Loop#list() payload', { loopCount: loops.length, loops: summaries });
    }
    _filterOutInvitedChildren(loop) {
        if (!loop || !Array.isArray(loop.members)) {
            return;
        }
        loop.members = loop.members.filter((member) => {
            const account = member && member.account;
            if (!(account && account.isChild && member.status === 'invited')) {
                return true;
            }
            else {
                log.debug('filtering out pending loop member', member.id);
                return false;
            }
        });
    }
    _setupClients() {
        if (!this.loopClient) {
            this.loopClient = new jibo_server_1.JSC.Loop();
        }
        if (!this.accountClient) {
            this.accountClient = new jibo_server_1.JSC.Account();
        }
    }
    _setupRobotAccountId(callback) {
        if (!this.robotAccountId) {
            this.robotAccountId = this.rootNode.data.robot;
            log.debug('robot id via rootNode', this.robotAccountId);
            if (!this.robotAccountId) {
                this._startTimer();
                this.accountClient.get({}, (err, data) => {
                    this._endTimer('JSC server call Account#get()');
                    if (err) {
                        this._errorOnce('JSC server call Account#get() ' + err.toString());
                    }
                    if (!err) {
                        if (!data || !data.length) {
                            this._errorOnce('JSC server call Account#get() did not return our account details');
                            callback(new Error('could not lookup our account'));
                        }
                        else if (data.length !== 1) {
                            this._errorOnce('JSC server call Account#get() returned unexpected multiple results');
                            callback(new Error('could not lookup our account'));
                        }
                        else {
                            this.robotAccountId = data[0].id;
                            log.debug('robot id via JSC', this.robotAccountId);
                            callback();
                        }
                    }
                    else {
                        callback(err);
                    }
                });
            }
            else {
                setImmediate(callback);
            }
        }
        else {
            setImmediate(callback);
        }
    }
    _applyLoopChanges(cloudLoop, callback) {
        if (!this.enableCloud) {
            log.info('loop cloud sync disabled; skipping _applyLoopChanges');
            callback(null, false);
            return;
        }
        try {
            let model = this.model;
            let rootNode = this.rootNode;
            // Reload from disk so BEacon writes are visible and saveLayers cannot
            // drop newly added user edges from a stale in-memory cache.
            model.loadLayers(rootNode, ['owner', 'user', 'robot'], (reloadErr) => {
                try {
                    log.iferr(reloadErr, 'loadLayers before _applyLoopChanges');
                    this._applyLoopChangesAfterReload(cloudLoop, callback);
                }
                catch (applyErr) {
                    log.error('_applyLoopChanges after reload threw', applyErr);
                    callback(applyErr);
                }
            });
        }
        catch (applyErr) {
            log.error('_applyLoopChanges threw before loadLayers', applyErr);
            callback(applyErr);
        }
    }
    _isCloudRobotMember(cloudLoopEntry) {
        return !!(cloudLoopEntry && cloudLoopEntry.type === 'robot');
    }
    _isLocalHumanMember(localLoopNode) {
        if (!localLoopNode) {
            return false;
        }
        const data = localLoopNode.data || {};
        if (data.type === 'robot') {
            return false;
        }
        if (data.type === 'owner' || data.type === 'member') {
            return true;
        }
        // UserNode.isJibo is !data.firstName — humans always have a first name.
        return !!data.firstName;
    }
    _applyLoopChangesAfterReload(cloudLoop, callback) {
        let model = this.model;
        let rootNode = this.rootNode;
        let newLoop = [];
        let sameLoop = [];
        let loopNodes = this._fetchLoop();
        cloudLoop.members.forEach((cloudLoopEntry) => {
            let found = false;
            for (let i = 0; i < loopNodes.length; i++) {
                let loopNode = loopNodes[i];
                if (cloudLoopEntry.id === loopNode._id) {
                    sameLoop.push(cloudLoopEntry);
                    found = true;
                    break;
                }
            }
            if (!found) {
                newLoop.push(cloudLoopEntry);
            }
        });
        // BEacon owns household membership. Never prune local humans who are
        // absent from the cloud roster (cloud only seeds owner + robot).
        let loopChanged = false;
        loopChanged = this._applyCloudLoopToLocalLoopRootNode(cloudLoop, rootNode);
        let memberIdsByAccountId = {};
        cloudLoop.members.forEach((member) => {
            if (member.accountId) {
                memberIdsByAccountId[member.accountId] = member.id;
            }
        });
        rootNode.clearEdges(['owner', 'robot']);
        let ownerMemberId = memberIdsByAccountId[cloudLoop.owner];
        if (!ownerMemberId) {
            const ownerByType = cloudLoop.members.find((member) => member && member.type === 'owner');
            ownerMemberId = ownerByType && ownerByType.id;
        }
        if (typeof ownerMemberId === 'string' && ownerMemberId.length > 0) {
            rootNode.addEdges(ownerMemberId, 'owner');
        }
        else {
            log.warn('Loop sync: could not resolve owner member id; skipping owner edge', {
                owner: cloudLoop.owner,
                memberAccountIds: Object.keys(memberIdsByAccountId)
            });
        }
        let robotMemberId = memberIdsByAccountId[cloudLoop.robot];
        if (!robotMemberId) {
            const robotByType = cloudLoop.members.find((member) => member && member.type === 'robot');
            robotMemberId = robotByType && robotByType.id;
        }
        if (typeof robotMemberId === 'string' && robotMemberId.length > 0) {
            rootNode.addEdges(robotMemberId, 'robot');
        }
        else {
            log.warn('Loop sync: could not resolve robot member id; skipping robot edge', {
                robot: cloudLoop.robot,
                memberAccountIds: Object.keys(memberIdsByAccountId)
            });
        }
        let newLoopMemberIds = newLoop.map((member) => { return member.id; });
        model.load(newLoopMemberIds, (err) => {
            try {
                log.iferr(err, 'model.load');
                newLoop.forEach((newLoopEntry) => {
                    let oldNode = this.model.fetch(newLoopEntry.id, true);
                    let newNode;
                    if (oldNode) {
                        newNode = oldNode;
                    }
                    else {
                        newNode = this._createNodeWithId(newLoopEntry.id, this.model, 'user');
                    }
                    let account = newLoopEntry.account || {};
                    // New cloud seed members (owner/robot) take cloud values once.
                    this._applyCloudLoopMemberAndAccountToLocalLoopNode(newLoopEntry, account, newNode, {
                        localWins: false
                    });
                    rootNode.addEdges(newNode, 'user');
                    loopChanged = true;
                });
                sameLoop.forEach((sameLoopEntry) => {
                    let sameNode = this.model.fetch(sameLoopEntry.id);
                    let account = sameLoopEntry.account || {};
                    let localWins = this._isLocalHumanMember(sameNode) &&
                        !this._isCloudRobotMember(sameLoopEntry);
                    let changed = this._applyCloudLoopMemberAndAccountToLocalLoopNode(sameLoopEntry, account, sameNode, {
                        localWins: localWins
                    });
                    if (changed) {
                        loopChanged = true;
                    }
                });
                this._syncLoopPhotos((photoErr, changed) => {
                    try {
                        if (changed) {
                            loopChanged = true;
                        }
                        if (!rootNode.data.lastFullSyncTimestamp) {
                            log.info('adding credentials hash to unchanged loop');
                            loopChanged = true;
                        }
                        if (loopChanged) {
                            log.info('loop changed. saving...');
                            rootNode.data.lastFullSyncTimestamp = Number(new Date());
                            rootNode.data.lastFullSyncCredentialsHash = SyncManager_1.default.credentialsHash;
                            this.model.saveLayers(rootNode, 'user', (saveErr) => {
                                log.iferr(saveErr, 'model.saveLayers');
                                log.info('finished saving loop');
                                log.debug('new loop', rootNode.getEdges('user'));
                                callback(saveErr || null, loopChanged);
                            });
                        }
                        else {
                            callback(null, false);
                        }
                    }
                    catch (photoApplyErr) {
                        log.error('_applyLoopChanges photo finalize threw', photoApplyErr);
                        callback(photoApplyErr);
                    }
                });
            }
            catch (loadApplyErr) {
                log.error('_applyLoopChanges model.load callback threw', loadApplyErr);
                callback(loadApplyErr);
            }
        });
    }
    _recordSyncDiagnostics(errorMessage, cloudLoop, callback) {
        const done = typeof callback === 'function' ? callback : () => { return; };
        if (!this.rootNode || !this.model) {
            done();
            return;
        }
        try {
            const rootNode = this.rootNode;
            const data = rootNode.data || (rootNode.data = {});
            const attemptTs = Number(new Date());
            const nextError = errorMessage ? String(errorMessage) : null;
            const nextCount = cloudLoop && Array.isArray(cloudLoop.members) ? cloudLoop.members.length : null;
            const prevError = (typeof data.lastSyncErrorMessage === 'undefined') ? null : data.lastSyncErrorMessage;
            const prevCount = (typeof data.lastCloudMemberCount === 'undefined') ? null : data.lastCloudMemberCount;
            // Persist when the outcome changes, on first write, or while failing so BEacon
            // shows a fresh attempt time. Skip disk churn on repeated identical successes.
            let shouldSave = (prevError !== nextError) ||
                (prevCount !== nextCount) ||
                !data.lastSyncAttemptTimestamp ||
                !!nextError;
            data.lastSyncAttemptTimestamp = attemptTs;
            data.lastSyncErrorMessage = nextError;
            data.lastCloudMemberCount = nextCount;
            if (!shouldSave) {
                done();
                return;
            }
            this.model.saveLayers(rootNode, 'user', (err) => {
                log.iferr(err, 'saveLayers sync diagnostics');
                done();
            });
        }
        catch (diagErr) {
            log.warn('Unable to persist loop sync diagnostics', diagErr);
            done();
        }
    }
    _applyCloudLoopToLocalLoopRootNode(cloudLoop, localLoopRootNode) {
        let loopFields = [
            'id',
            'name',
            'owner',
            'robot',
            'robotFriendlyId',
            'created',
            'updated'
        ];
        let changed = this._syncObject(cloudLoop, localLoopRootNode.data, loopFields);
        return changed;
    }
    _applyCloudLoopMemberAndAccountToLocalLoopNode(cloudLoopEntry, cloudAccount, localLoopNode, options) {
        const localWins = !!(options && options.localWins);
        // When localWins, BEacon owns profile fields — only sync structural/enrollment metadata.
        let loopMemberFields = [
            'id',
            'loopId',
            'accountId',
            'account',
            'enrolled',
            'status',
            'type',
            'agreementId',
            'legalGuardianId',
            'created'
        ];
        if (!localWins) {
            loopMemberFields = loopMemberFields.concat(['nickname', 'phoneticName']);
        }
        let accountFields = [
            'email',
            'birthday',
            'facebookAccessToken',
            'isChild',
            'phoneNumber',
            'messagingAllowed'
        ];
        if (!localWins) {
            accountFields = accountFields.concat([
                'firstName',
                'lastName',
                'gender',
                'photoUrl'
            ]);
        }
        let fieldsToRename = {
            'nickname': 'nickName'
        };
        let changed1 = this._syncObject(cloudLoopEntry, localLoopNode.data, loopMemberFields, fieldsToRename);
        let changed2 = this._syncObject(cloudAccount || {}, localLoopNode.data, accountFields);
        return changed1 || changed2;
    }
    _syncLoopPhotos(callback) {
        let changed = false;
        const loop = this._fetchLoop();
        let tasks = [];
        loop.forEach((user) => {
            const photoUrl = user.data.photoUrl;
            const photoAsset = user.getAssets('photo')[0];
            const isHttpPhoto = typeof photoUrl === 'string' &&
                (photoUrl.indexOf('http://') === 0 || photoUrl.indexOf('https://') === 0);
            if (isHttpPhoto) {
                const urlParts = url.parse(photoUrl);
                const pathParts = path.parse(urlParts.pathname);
                const urlFile = pathParts.name;
                const urlExt = pathParts.ext;
                let assetFilename = `${urlFile}.photo${urlExt}`;
                if (!photoAsset || photoAsset.filename() !== assetFilename) {
                    const oldAssets = user.getAssets('photo');
                    oldAssets.forEach((oldAsset) => {
                        tasks.push((done) => {
                            user.removeAsset(oldAsset, done);
                        });
                    });
                    tasks.push((done) => {
                        const newAsset = new jibo_kb_1.Asset(assetFilename);
                        newAsset.setRootDir(user.getKb().getDirectory());
                        axios_1.default.get(photoUrl, { responseType: 'arraybuffer' })
                            .then(res => {
                            newAsset.save(res.data);
                            user.addAssets(newAsset);
                            changed = true;
                        })
                            .catch(err => {
                            log.error('newAsset.save', err);
                        })
                            .then(() => done());
                    });
                }
            }
            // Never delete a local BEacon photo just because cloud has no photoUrl.
        });
        async.series(tasks, () => {
            callback(null, changed);
        });
    }
}
exports.default = LoopManager;

},{"../../clients/KBClient":14,"../../clients/jibo-server":17,"./EnrollmentLoopInformer":43,"./SyncManager":49,"./log":50,"async":undefined,"axios":undefined,"jibo-kb":undefined,"path":undefined,"url":undefined}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const jibo_kb_1 = require("jibo-kb");
const KBClient_1 = require("../../clients/KBClient");
const jibo_service_clients_1 = require("jibo-service-clients");
const jibo_server_1 = require("../../clients/jibo-server");
const SyncManager_1 = require("./SyncManager");
const log_1 = require("./log");
const log = log_1.default.createChild('MediaList');
const performance = {
    now: () => {
        const time = process.hrtime();
        return time[0] * 1000 + time[1] / 1000000;
    }
};
const SYNC_PERIODIC_SECONDS = 60 * 60 * 2;
const UPLOAD_PERIODIC_SECONDS = 60 * 5;
const NOTIFICATIONS_FLUSH_PERIOD = 10000;
const KB_SLICE_NAME = '/jibo/media';
const KB_LOOP_NAME = '/jibo/loop';
class MediaListManager extends SyncManager_1.default {
    constructor(httpUrl, enableCloud = true) {
        super(httpUrl, 'media list', SYNC_PERIODIC_SECONDS * 1000, enableCloud);
    }
    init(callback) {
        super.init((err) => {
            log.iferr(err, 'super.init()');
            if (err) {
                callback(err);
            }
            else {
                let baseModel = KBClient_1.default.createModel(KB_SLICE_NAME, this.httpUrl);
                this.model = baseModel.begin();
                this._preloadMediaModel((err) => {
                    if (err) {
                        log.error('Error preloading media model', err);
                    }
                    else {
                        log.info('local cached media list loaded, count: ', this._mediaSize());
                    }
                    if (SyncManager_1.default.canSkipFullSync) {
                        log.info('doing first full sync in the background');
                        callback();
                        callback = () => { return; };
                    }
                    if (this.enableCloud) {
                        log.info('starting media list cloud syncing...');
                        this._syncWithCloud(() => {
                            log.info('local media list count after syncing: ', this._mediaSize());
                            this._createClients((err) => {
                                if (err) {
                                    log.error('error initing service clients', err);
                                }
                                else {
                                    log.info('service clients created successfully');
                                }
                                this._syncOnNotification('MediaCreated');
                                this._syncOnNotification('MediaDeleted');
                                callback();
                                this._startSyncTimer();
                                this._startUploadTimer();
                            });
                        });
                    }
                    else {
                        callback();
                    }
                });
            }
        });
    }
    storePhoto(data, callback) {
        this._setupLoopAndOwnerId((err) => {
            if (err) {
                callback(err);
            }
            else {
                let contentIDs = [];
                contentIDs.push(data.id);
                Object.keys(data.thumbnails).forEach((name) => {
                    contentIDs.push(data.thumbnails[name]);
                });
                let mediaType = jibo_service_clients_1.mediaManager.MediaType.image;
                this.mediaManagerClient.adopt(contentIDs, mediaType, (err) => {
                    if (err) {
                        callback(err);
                    }
                    else {
                        let photoNode = this._createNodeWithId(data.id, this.model, 'media');
                        photoNode.data = {
                            path: data.id,
                            type: mediaType,
                            loopId: this.loopId,
                            accountId: this.ownerId,
                            isDeleted: false,
                            isEncrypted: true,
                            created: photoNode.created
                        };
                        this.rootNode.addEdges(photoNode, 'media');
                        this.rootNode.addEdges(photoNode, 'pending-upload');
                        let thumbNodes = [];
                        Object.keys(data.thumbnails).forEach((name) => {
                            let id = data.thumbnails[name];
                            let thumbNode = this._createNodeWithId(id, this.model, 'media');
                            thumbNode.data = {
                                path: id,
                                type: name,
                                reference: photoNode._id,
                                loopId: this.loopId,
                                accountId: this.ownerId,
                                isDeleted: false,
                                isEncrypted: true,
                                created: thumbNode.created
                            };
                            thumbNodes.push(thumbNode);
                            thumbNode.addEdges(photoNode, 'reference');
                            this.rootNode.addEdges(thumbNode, 'media');
                            this.rootNode.addEdges(thumbNode, 'pending-upload');
                            photoNode.addEdges(thumbNode, name);
                        });
                        let tasks = [];
                        tasks.push((done) => {
                            photoNode.save(done);
                        });
                        thumbNodes.forEach((thumbNode) => {
                            tasks.push((done) => {
                                thumbNode.save(done);
                            });
                        });
                        tasks.push((done) => {
                            this.rootNode.save(done);
                        });
                        async.series(tasks, (err) => {
                            if (err) {
                                callback(err);
                            }
                            else {
                                let response = {
                                    id: data.id,
                                    url: `${this.proxyUrl}/proxy/media/photo/get?id=${data.id}`,
                                    thumbnails: data.thumbnails
                                };
                                callback(null, response);
                                process.nextTick(() => {
                                    this._processPendingCloudActions();
                                });
                            }
                        });
                    }
                });
            }
        });
    }
    deletePhoto(id, callback) {
        this._setupLoopAndOwnerId((err) => {
            if (err) {
                callback(err);
            }
            else {
                let isDeletedNodes = [];
                let photoNode = this.model.fetch(id);
                if (photoNode) {
                    isDeletedNodes.push(photoNode);
                }
                const mediaList = this._fetchMedia();
                mediaList.forEach((media) => {
                    if (media.data.reference && media.data.reference === id) {
                        isDeletedNodes.push(media);
                    }
                });
                this.rootNode.addEdges(isDeletedNodes, 'pending-delete');
                let tasks = [];
                isDeletedNodes.forEach((isDeletedNode) => {
                    tasks.push((done) => {
                        isDeletedNode.data.isDeleted = true;
                        log.debug('setting the isDeleted flag for media node', isDeletedNode._id);
                        isDeletedNode.save(done);
                    });
                });
                tasks.push((done) => {
                    this.rootNode.save(done);
                });
                async.series(tasks, (err) => {
                    if (err) {
                        callback(err);
                    }
                    else {
                        callback(null);
                        process.nextTick(() => {
                            this._processPendingCloudActions();
                        });
                    }
                });
            }
        });
    }
    downloadThumbnails(ids, mediaType, callback) {
        ids.forEach((id) => {
            this.mediaManagerClient.download(id, false, mediaType, (err) => {
                log.iferr(err, 'mediaManagerClient.download');
                callback(err);
            });
        });
    }
    downloadPhoto(id, mediaType, callback) {
        this.mediaManagerClient.download(id, true, mediaType, (err) => {
            log.iferr(err, 'mediaManagerClient.download');
            callback(err);
        });
    }
    _syncWithCloud(callback) {
        this._setupClients();
        this._startTimer();
        this._setupLoopAndOwnerId((err) => {
            if (!err) {
                this._getFullMediaList(this.loopId, (err, data) => {
                    this._endTimer('JSC server call Media#list() (all pages)');
                    log.iferr(err, 'JSC server call Media#list() (all pages)');
                    if (!err) {
                        this._applyMediaChanges(data, (err, changed) => {
                            log.iferr(err, '_applyMediaChanges');
                            callback(err, changed);
                        });
                    }
                    else {
                        callback(err);
                    }
                });
            }
            else {
                callback(err);
            }
        });
    }
    _updated(callback) {
        log.info('media list was updated; emitting a MediaListChanged event');
        this.emit('MediaListChanged');
        process.nextTick(callback);
    }
    _processPendingCloudActions() {
        if (this.uploadHappening) {
            this.uploadAgain = true;
        }
        else {
            let pendingUploadIds = this.rootNode.getEdges('pending-upload');
            let pendingDeleteIds = this.rootNode.getEdges('pending-delete');
            if (pendingUploadIds.length || pendingDeleteIds.length) {
                this._cancelUploadTimer();
                this.uploadHappening = true;
                this._suspendNotifications((resumeNotifications) => {
                    let tasks = [];
                    if (pendingUploadIds.length) {
                        tasks.push((done) => { this._processPendingUploads(pendingUploadIds, done); });
                    }
                    if (pendingDeleteIds.length) {
                        tasks.push((done) => { this._processPendingDeletions(pendingDeleteIds, done); });
                    }
                    async.series(tasks, () => {
                        setTimeout(() => {
                            resumeNotifications();
                            this._notDuringSyncing((done) => {
                                let timer = performance.now();
                                this._syncWithCloud((err) => {
                                    let elapsed = Math.round(performance.now() - timer);
                                    log.info('_processPendingCloudActions _syncWithCloud (' + this._mediaSize() + ' nodes) took ' + elapsed + 'ms');
                                    log.iferr(err, '_syncWithCloud');
                                    done();
                                    this.uploadHappening = false;
                                    this._startUploadTimer();
                                    if (this.uploadAgain) {
                                        this.uploadAgain = false;
                                        process.nextTick(() => {
                                            this._processPendingCloudActions();
                                        });
                                    }
                                    else {
                                        this.emit('_cloudDone');
                                    }
                                });
                            });
                        }, NOTIFICATIONS_FLUSH_PERIOD);
                    });
                });
            }
        }
    }
    _processPendingUploads(pendingUploadIds, callback) {
        let tasks = [];
        pendingUploadIds.forEach((pendingUploadId) => {
            tasks.push((done) => {
                let pendingUpload = this.model.fetch(pendingUploadId);
                if (pendingUpload) {
                    let immediate = true;
                    let keeplocal = true;
                    let mediaType = pendingUpload.data.type;
                    let reference = pendingUpload.data.reference || null;
                    this.mediaManagerClient.upload(pendingUpload._id, immediate, keeplocal, mediaType, reference, (err) => {
                        if (err) {
                            log.warn('could not upload photo, will try again', pendingUpload._id, err);
                            done();
                        }
                        else {
                            log.info('uploaded', pendingUpload._id);
                            this.rootNode.removeEdges(pendingUpload, 'pending-upload');
                            this.rootNode.save((err) => {
                                log.iferr(err, 'media root node save');
                                done();
                            });
                        }
                    });
                }
                else {
                    log.error('pending upload node not found, giving up', pendingUploadId);
                    this.rootNode.removeEdges(pendingUploadId, 'pending-upload');
                    this.rootNode.save((err) => {
                        log.iferr(err, 'media root node save');
                        done();
                    });
                }
            });
        });
        log.info('uploading', tasks.length, 'photo' + (tasks.length === 1 ? '' : 's'));
        let timer = performance.now();
        async.series(tasks, () => {
            let elapsed = Math.round(performance.now() - timer);
            log.info('photo uploads took ' + elapsed + 'ms');
            this.emit('_storePhoto');
            callback();
        });
    }
    _processPendingDeletions(pendingDeleteIds, callback) {
        let tasks = [];
        let pendingUploadIds = this.rootNode.getEdges('pending-upload');
        pendingDeleteIds.forEach((pendingDeleteId) => {
            if (pendingUploadIds.includes(pendingDeleteId)) {
                log.warn('skipping pending delete until it has been uploaded', pendingDeleteId);
                return;
            }
            tasks.push((done) => {
                let pendingDelete = this.model.fetch(pendingDeleteId);
                if (!pendingDelete) {
                    log.error('pending delete node not found, giving up', pendingDeleteId);
                    this.rootNode.removeEdges(pendingDeleteId, 'pending-delete');
                    this.rootNode.save((err) => {
                        log.iferr(err, 'media root node save');
                        return done();
                    });
                }
                let immediate = true;
                let deleteLocal = false;
                let deleteRemote = true;
                let mediaType = jibo_service_clients_1.mediaManager.MediaType.image;
                this.mediaManagerClient.delete(pendingDeleteId, immediate, deleteLocal, deleteRemote, mediaType, (err) => {
                    if (err) {
                        log.error('could not delete photo photo', pendingDeleteId, err);
                        return done();
                    }
                    this.rootNode.removeEdges(pendingDelete, 'pending-delete');
                    this.rootNode.save((err) => {
                        log.iferr(err, 'media root node save');
                        done();
                    });
                });
            });
        });
        log.info('deleting', tasks.length, 'photo' + (tasks.length === 1 ? '' : 's'));
        let timer = performance.now();
        async.series(tasks, () => {
            let elapsed = Math.round(performance.now() - timer);
            log.info('photo deletions took ' + elapsed + 'ms');
            this.emit('_deletePhoto');
            callback();
        });
    }
    _startUploadTimer() {
        this.uploadTimer = global.setTimeout(() => { this._processPendingCloudActions(); }, UPLOAD_PERIODIC_SECONDS * 1000);
    }
    _cancelUploadTimer() {
        if (this.uploadTimer) {
            clearTimeout(this.uploadTimer);
            this.uploadTimer = undefined;
        }
    }
    _getFullMediaList(loopId, callback) {
        let list = [];
        let nextPage = (before) => {
            this.mediaClient.list({ loopIds: [loopId], before: before }, (err, data) => {
                if (err) {
                    callback(err);
                }
                else {
                    if (data.length) {
                        list = data.concat(list);
                        nextPage(data[0].created);
                    }
                    else {
                        callback(null, list);
                    }
                }
            });
        };
        nextPage();
    }
    _preloadMediaModel(callback) {
        this.model.loadRoot((err, rootNode) => {
            this.rootNode = rootNode;
            if (err) {
                log.error('model.loadRoot', err);
                return callback(err);
            }
            else {
                this.model.loadLayers(rootNode, 'media', (err) => {
                    log.iferr(err, 'loadLayers media');
                    callback();
                });
            }
        });
    }
    _fetchMedia() {
        return this.model.fetch(this.rootNode.getEdges('media'));
    }
    _mediaSize() {
        let media = this._fetchMedia();
        return media.length;
    }
    _setupClients() {
        if (!this.mediaClient) {
            this.mediaClient = new jibo_server_1.JSC.Media();
        }
    }
    _setupLoopAndOwnerId(callback) {
        if (this.loopId) {
            process.nextTick(callback);
        }
        else {
            let loop = new jibo_kb_1.Model(KB_LOOP_NAME, this.httpUrl);
            loop.loadRoot((err, root) => {
                log.iferr(err, 'loop.loadRoot');
                if (!err) {
                    this.loopId = root.data.id;
                    this.ownerId = root.getEdges('owner')[0];
                }
                callback(err);
            });
        }
    }
    _applyMediaChanges(cloudMediaList, callback) {
        let model = this.model;
        let rootNode = this.rootNode;
        let newMedia = [];
        let sameMedia = [];
        let removeMedia = [];
        let mediaChanged = false;
        let hangingEdges = false;
        let localMediaList = this._fetchMedia();
        let pendingUploadIds = this.rootNode.getEdges('pending-upload');
        let pendingDeleteIds = this.rootNode.getEdges('pending-delete');
        cloudMediaList.forEach((cloudMedia) => {
            let found = false;
            for (let i = 0; i < localMediaList.length; i++) {
                let localMedia = localMediaList[i];
                if (!localMedia) {
                    mediaChanged = true;
                    continue;
                }
                if (cloudMedia.path === localMedia._id) {
                    sameMedia.push(cloudMedia);
                    found = true;
                    break;
                }
            }
            if (!found) {
                newMedia.push(cloudMedia);
            }
        });
        localMediaList.forEach((localMedia) => {
            if (!localMedia) {
                hangingEdges = true;
                return;
            }
            if (pendingDeleteIds.includes(localMedia._id)) {
                if (!localMedia.data.isDeleted) {
                    localMedia.data.isDeleted = true;
                    mediaChanged = true;
                }
            }
            if (pendingUploadIds.includes(localMedia._id)) {
                return;
            }
            let found = false;
            for (let i = 0; i < cloudMediaList.length; i++) {
                let cloudMedia = cloudMediaList[i];
                if (cloudMedia.path === localMedia._id) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                removeMedia.push(localMedia);
            }
        });
        if (hangingEdges) {
            log.warn('media list had edges with no nodes, removing hanging edges');
            mediaChanged = true;
        }
        let newMediaIds = newMedia.map((media) => { return media.path; });
        model.load(newMediaIds, (err) => {
            log.iferr(err, 'model.load');
            newMedia.forEach((media) => {
                let oldNode = this.model.fetch(media.path, true);
                let newNode;
                if (oldNode) {
                    newNode = oldNode;
                }
                else {
                    newNode = this._createNodeWithId(media.path, this.model, 'media');
                }
                this._applyCloudMediaToLocalMedia(media, newNode);
                mediaChanged = true;
            });
            sameMedia.forEach((media) => {
                let sameNode = this.model.fetch(media.path);
                let changed = this._applyCloudMediaToLocalMedia(media, sameNode);
                if (changed) {
                    mediaChanged = true;
                }
            });
            removeMedia.forEach((removeLocalMedia) => {
                mediaChanged = true;
            });
            if (mediaChanged) {
                rootNode.removeEdges(rootNode.getEdges('media'), 'media');
                cloudMediaList.forEach((cloudMedia) => {
                    rootNode.addEdges(cloudMedia.path, 'media');
                });
                pendingUploadIds.forEach((pendingUploadId) => {
                    rootNode.addEdges(pendingUploadId, 'media');
                });
            }
            let edgesChanged = this._setupThumbnailEdges();
            if (edgesChanged) {
                mediaChanged = true;
            }
            if (mediaChanged) {
                log.info('media list changed. saving...');
                this.model.saveLayers(rootNode, 'media', (err) => {
                    log.iferr(err, 'model.saveLayers');
                    let chain = Promise.resolve();
                    removeMedia.forEach((node) => {
                        chain.then(node.remove());
                    });
                    chain.then(() => {
                        log.info('finished saving media list');
                        callback(null, mediaChanged);
                    });
                });
            }
            else {
                callback();
            }
        });
    }
    _applyCloudMediaToLocalMedia(cloudMedia, localMediaNode) {
        let changed = this._syncObjectStrict(cloudMedia, localMediaNode.data);
        return changed;
    }
    _setupThumbnailEdges() {
        let changed = false;
        const mediaList = this._fetchMedia();
        mediaList.forEach((media) => {
            if (media.data.reference) {
                let original = this.model.fetch(media.data.reference);
                if (!original) {
                    log.warn('can not find original media for thumbnail, skipping', media._id);
                }
                else {
                    let oldReferences = media.getEdges('reference');
                    if (!oldReferences.length) {
                        media.addEdges(original, 'reference');
                        changed = true;
                    }
                    else {
                        if (oldReferences.length !== 1 || oldReferences[0] !== original._id) {
                            media.removeEdges(oldReferences, 'reference');
                            media.addEdges(original, 'reference');
                            changed = true;
                        }
                    }
                }
            }
        });
        mediaList.forEach((media) => {
            let newEdgesSet = {};
            mediaList.forEach((newReference) => {
                if (newReference.data.reference === media._id) {
                    let mediaType = newReference.data.type;
                    if (!mediaType) {
                        log.warn('thumbnail missing media type, skipping', newReference._id);
                    }
                    else {
                        if (mediaType === 'reference' && !this.issuedReferenceMediaTypeWarning) {
                            log.warn('there is at least one media item with media type "reference"', newReference._id);
                            this.issuedReferenceMediaTypeWarning = true;
                        }
                        if (newEdgesSet[mediaType]) {
                            log.warn('media has multiple thumbnails with same media type', mediaType, media._id, newReference._id);
                        }
                        newEdgesSet[mediaType] = newEdgesSet[mediaType] || [];
                        newEdgesSet[mediaType].push(newReference._id);
                    }
                }
            });
            let newEdgeTypes = Object.keys(newEdgesSet);
            if (newEdgeTypes.length) {
                let oldEdgeTypes = Object.keys(media.edges || {});
                newEdgeTypes.forEach((newEdgeType) => {
                    if (!oldEdgeTypes.includes(newEdgeType)) {
                        media.addEdges(newEdgesSet[newEdgeType], newEdgeType);
                        changed = true;
                    }
                    else {
                        let oldEdges = media.getEdges(newEdgeType);
                        let newEdges = newEdgesSet[newEdgeType];
                        let needsUpdate = false;
                        if (oldEdges.length !== newEdges.length) {
                            needsUpdate = true;
                        }
                        else {
                            for (let i = 0; i < oldEdges.length; i++) {
                                if (oldEdges[i] !== newEdges[i]) {
                                    needsUpdate = true;
                                    break;
                                }
                            }
                        }
                        if (needsUpdate) {
                            media.removeEdges(oldEdges, newEdgeType);
                            media.addEdges(newEdges, newEdgeType);
                            changed = true;
                        }
                    }
                });
                oldEdgeTypes.forEach((oldEdgeType) => {
                    if (oldEdgeType !== 'reference' || !media.data.reference) {
                        if (!newEdgeTypes.includes(oldEdgeType)) {
                            media.removeEdges(media.getEdges(oldEdgeType), oldEdgeType);
                            changed = true;
                        }
                    }
                });
            }
            else {
                let oldEdgeTypes = Object.keys(media.edges || {});
                oldEdgeTypes.forEach((oldEdgeType) => {
                    if (oldEdgeType !== 'reference' || !media.data.reference) {
                        media.removeEdges(media.getEdges(oldEdgeType), oldEdgeType);
                        changed = true;
                    }
                });
            }
        });
        return changed;
    }
    _createClients(callback) {
        this._getServiceRecord('media', (err, record) => {
            log.iferr(err, 'SyncManager._getServiceRecord');
            if (!err) {
                this.mediaUrl = `http://${record.host}:${record.port}/media`;
            }
            this._getServiceRecord('media-manager', (err, record) => {
                log.iferr(err, 'SyncManager._getServiceRecord');
                this.mediaManagerClient = jibo_service_clients_1.mediaManager;
                this.mediaManagerClient.init(record, log_1.default, (err) => {
                    log.iferr(err, 'SyncManager._mediaManagerClient.init');
                    this._getServiceRecord('media-proxy', (err, record) => {
                        log.iferr(err, 'SyncManager._getServiceRecord');
                        if (!err) {
                            this.proxyUrl = `http://${record.host}:${record.port}`;
                        }
                        callback();
                    });
                });
            });
        });
    }
}
exports.default = MediaListManager;

},{"../../clients/KBClient":14,"../../clients/jibo-server":17,"./SyncManager":49,"./log":50,"async":undefined,"jibo-kb":undefined,"jibo-service-clients":undefined}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_kb_1 = require("jibo-kb");
const jibo_server_1 = require("../../clients/jibo-server");
const SyncManager_1 = require("./SyncManager");
const KBClient_1 = require("../../clients/KBClient");
const log_1 = require("./log");
const log = log_1.default.createChild('Robot');
const SYNC_PERIODIC_SECONDS = 6 * 3600;
const KB_SLICE_NAME = '/jibo/robot';
const KB_LOOP_NAME = '/jibo/loop';
class RobotManager extends SyncManager_1.default {
    constructor(httpUrl, enableCloud = true) {
        super(httpUrl, 'robot properties', SYNC_PERIODIC_SECONDS * 1000, enableCloud);
    }
    init(callback) {
        super.init((err) => {
            log.iferr(err, 'super.init()');
            if (err) {
                callback(err);
            }
            else {
                this.model = KBClient_1.default.createModel(KB_SLICE_NAME, this.httpUrl);
                this._preloadRobotModel(() => {
                    log.info('local cached robot properties loaded, count: ', this._robotSize());
                    if (SyncManager_1.default.canSkipFullSync) {
                        log.info('doing first full sync in the background');
                        callback();
                        callback = () => { return; };
                    }
                    if (this.enableCloud) {
                        log.info('starting robot properties cloud syncing...');
                        this._syncWithCloud(() => {
                            log.info('local robot properties count after syncing: ', this._robotSize());
                            this._syncOnNotification('RobotUpdated');
                            callback();
                            this._startSyncTimer();
                        });
                    }
                    else {
                        callback();
                    }
                });
            }
        });
    }
    _syncWithCloud(callback) {
        this._setupClients();
        this._startTimer();
        this._lookupRobotId((err, robotId) => {
            if (!err) {
                this.robotClient.getRobot({ id: robotId }, (err, data) => {
                    this._endTimer('JSC server call Robot#getRobot()');
                    log.iferr(err, 'JSC server call Robot#getRobot()');
                    if (!err) {
                        this._applyRobotChanges(data, (err, changed) => {
                            log.iferr(err, '_applyRobotChanges');
                            callback(err, changed);
                        });
                    }
                    else {
                        callback(err);
                    }
                });
            }
            else {
                callback(err);
            }
        });
    }
    _updated(callback) {
        log.info('robot properties updated; emitting a RobotChanged event');
        this.emit('RobotUpdated');
        process.nextTick(callback);
    }
    _preloadRobotModel(callback) {
        this.model.loadRoot((err, rootNode) => {
            log.iferr(err, 'model.loadRoot');
            this.rootNode = rootNode;
            callback();
        });
    }
    _robotSize() {
        if (!this.rootNode || !this.rootNode.data) {
            return 0;
        }
        return Object.keys(this.rootNode.data).length;
    }
    _setupClients() {
        if (!this.robotClient) {
            this.robotClient = new jibo_server_1.JSC.Robot();
        }
    }
    _lookupRobotId(callback) {
        let loop = new jibo_kb_1.Model(KB_LOOP_NAME, this.httpUrl);
        loop.loadRoot((err, root) => {
            log.iferr(err, 'loop.loadRoot');
            if (!err) {
                log.debug('using robot id', root.data.robotFriendlyId);
                callback(null, root.data.robotFriendlyId);
            }
            else {
                callback(err);
            }
        });
    }
    _applyRobotChanges(cloudRobot, callback) {
        let rootNode = this.rootNode;
        let newData = {};
        Object.assign(newData, cloudRobot.payload);
        newData.id = cloudRobot.id;
        newData.updated = cloudRobot.updated;
        newData.created = cloudRobot.created;
        let changed = false;
        if (!this._deepEqual(newData, rootNode.data)) {
            rootNode.data = newData;
            changed = true;
        }
        if (changed) {
            log.info('robot changed. saving...');
            rootNode.save((err) => {
                log.iferr(err, 'rootNode.save');
                log.info('finished saving robot');
                log.debug('new robot properties', rootNode.data);
                callback(null, changed);
            });
        }
        else {
            callback();
        }
    }
}
exports.default = RobotManager;

},{"../../clients/KBClient":14,"../../clients/jibo-server":17,"./SyncManager":49,"./log":50,"jibo-kb":undefined}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const crypto = require("crypto");
const events_1 = require("events");
const jibo_kb_1 = require("jibo-kb");
const jibo_service_clients_1 = require("jibo-service-clients");
const jibo_server_1 = require("../../clients/jibo-server");
const jibo_service_framework_1 = require("jibo-service-framework");
const Debouncer_1 = require("../../utils/Debouncer");
const ErrorService_1 = require("../error/ErrorService");
const log_1 = require("./log");
const log = log_1.default.createChild('SyncManager');
const SLOW_API_TRIGGER = 3 * 1000;
const NOTIFICATIONS_DEBOUNCE_PERIOD = 5 * 1000;
const NOTIFICATIONS_DEBOUNCE_MAX_SPAN = 60 * 1000;
const NO_SYNC_SERVER_ERROR = 'L9-Cannot_connect_to_sync_server';
class SyncManager extends events_1.EventEmitter {
    constructor(httpUrl, name, syncingPeriod, enableCloud = true) {
        super();
        this.httpUrl = httpUrl;
        this.name = name;
        this.syncingPeriod = syncingPeriod;
        this.enableCloud = enableCloud;
        this.queue = [];
        this.pauseDepth = 0;
        this.notificationsDebouncer = new Debouncer_1.default(NOTIFICATIONS_DEBOUNCE_PERIOD, NOTIFICATIONS_DEBOUNCE_MAX_SPAN);
    }
    init(callback) {
        this.onRobot = this._onRobot();
        callback();
    }
    shutdown(callback) {
        this._notDuringSyncing((done) => {
            this.isShutdown = true;
            callback(null);
        });
    }
    _initCredentials(callback) {
        if (SyncManager.credentialsInited) {
            process.nextTick(callback);
        }
        else {
            log.info('Getting credentials');
            jibo_service_clients_1.systemManager.getCredentials((err, credentials) => {
                if (err) {
                    log.warn('Error initializing credentials!');
                    callback(err);
                }
                else {
                    log.info('Credentials found, updating JSC');
                    jibo_server_1.JSC.config.update(credentials);
                    SyncManager.credentialsInited = true;
                    const hash = crypto.createHash('sha256');
                    hash.update(JSON.stringify(credentials));
                    SyncManager.credentialsHash = hash.digest('base64');
                    this._networkIsRequired((err) => {
                        if (err) {
                            ErrorService_1.default.instance.addError(NO_SYNC_SERVER_ERROR);
                        }
                        callback(err);
                    });
                }
            });
        }
    }
    _networkIsRequired(callback) {
        const accountClient = new jibo_server_1.JSC.Account({ maxRetries: 1 });
        accountClient.get({}, (err, data) => {
            log.iferr(err, 'JSC server call Account#get() while testing network');
            if (!err || err.statusCode) {
                if (err) {
                    log.warn('Account#get() err, but we got a statusCode so reporting that the network is up');
                }
                else {
                    log.info('reporting the network is up');
                }
                callback();
            }
            else {
                log.warn('reporting the network is down');
                callback(err);
            }
        });
    }
    _setupCanSkipFullSync(lastCredentialsHash) {
        if (SyncManager.canSkipFullSync !== undefined) {
            log.warn('_setupCanSkipFullSync was already called, ignoring');
            return;
        }
        SyncManager.canSkipFullSync = false;
        if (!SyncManager.credentialsHash) {
            log.warn('_setupCanSkipFullSync must be called after _initCredentials');
            return;
        }
        if (!lastCredentialsHash) {
            log.info('no previous sync done, requiring a full sync');
            return;
        }
        if (lastCredentialsHash !== SyncManager.credentialsHash) {
            log.info('credentials do not match, requiring a full sync');
            return;
        }
        log.info('things look good, setting the can skip full sync flag');
        SyncManager.canSkipFullSync = true;
        return;
    }
    _syncOnNotification(eventName) {
        log.info(`registering for "${eventName}" notifications`);
        jibo_service_framework_1.NotificationsDispatcher.instance.on(eventName, (message) => {
            this.notificationsDebouncer.trigger(() => {
                log.info(`got a notification named "${eventName}"`, message);
                if (!this.notificationsSuspended) {
                    this._syncASAP();
                }
                else {
                    log.info(`notifications are suspended, ignoring notification ${eventName}`);
                }
            });
        });
    }
    _suspendNotifications(callback) {
        this.notificationsSuspended = true;
        callback(() => {
            this.notificationsSuspended = false;
        });
    }
    _startSyncTimer(quietly) {
        quietly = quietly === undefined ? false : quietly;
        if (!quietly) {
            let seconds = (Math.round((this.syncingPeriod / 1000) * 10) / 10);
            log.info(`setting ${this.name} sync with cloud every ${seconds} seconds.`);
        }
        this.syncTimer = global.setTimeout(() => { this._syncASAP(true); }, this.syncingPeriod);
    }
    _syncASAP(quietly = false) {
        this._notDuringSyncing((done) => {
            if (!quietly) {
                log.info(`syncing ${this.name} with cloud...`);
            }
            this.syncing = true;
            this._syncWithCloud((err, changed) => {
                if (changed) {
                    this._updated(() => {
                        this.syncing = false;
                        done();
                        this._finishSyncing();
                    });
                }
                else {
                    this.syncing = false;
                    done();
                    this._finishSyncing();
                }
            });
        });
    }
    _finishSyncing() {
        this._startSyncTimer(true);
        while (this.queue.length > 0) {
            let pending = this.queue.shift();
            pending();
        }
    }
    _pauseSyncTimer() {
        log.info(`pausing ${this.name} syncing`);
        if (this.pauseDepth === 0) {
            if (this.syncTimer) {
                clearTimeout(this.syncTimer);
                this.syncTimer = undefined;
            }
            this.pauseDepth = 1;
        }
        else if (this.pauseDepth < 0) {
            log.error('pauseDepth is < 0, something is broken!');
        }
        else {
            this.pauseDepth += 1;
        }
    }
    _resumeSyncTimer() {
        log.info(`resuming ${this.name} syncing`);
        if (this.pauseDepth) {
            this.pauseDepth -= 1;
            if (this.pauseDepth === 0) {
                if (!this.syncTimer) {
                    this._startSyncTimer(true);
                }
            }
        }
    }
    _notDuringSyncing(callback) {
        if (this.isShutdown) {
            throw Error('tried to use ${this.name} manager after shutdown');
        }
        if (!this.syncing) {
            this._pauseSyncTimer();
            setImmediate(() => {
                callback(() => {
                    this._resumeSyncTimer();
                });
            });
        }
        else {
            this.queue.push(() => {
                this._pauseSyncTimer();
                callback(() => {
                    this._resumeSyncTimer();
                });
            });
        }
    }
    _syncObject(source, target, fields, renames) {
        let changed = false;
        fields.forEach((sourceField) => {
            let targetField = sourceField;
            if (renames) {
                targetField = renames[sourceField] || sourceField;
            }
            if (source.hasOwnProperty(sourceField)) {
                if (!this._deepEqual(source[sourceField], target[targetField])) {
                    target[targetField] = source[sourceField];
                    changed = true;
                }
            }
            else if (target.hasOwnProperty(targetField)) {
                delete target[targetField];
                changed = true;
            }
        });
        return changed;
    }
    _syncObjectStrict(source, target) {
        let changed = false;
        Object.keys(source).forEach((field) => {
            if (source.hasOwnProperty(field)) {
                if (!this._deepEqual(source[field], target[field])) {
                    target[field] = source[field];
                    changed = true;
                }
            }
            else if (target.hasOwnProperty(field)) {
                delete target[field];
                changed = true;
            }
        });
        return changed;
    }
    _getServiceRecord(serviceName, callback) {
        jibo_service_framework_1.RegistryClient.instance.getRecords((err, records) => {
            if (err) {
                callback(err);
            }
            else if (!records) {
                callback(new Error('no records from registry'));
            }
            else {
                let found = false;
                for (let i = 0; i < records.length; i++) {
                    if (records[i].name === serviceName) {
                        found = true;
                        callback(null, records[i]);
                        break;
                    }
                }
                if (!found) {
                    callback(new Error('no record for service "' + serviceName + '" found in registry'));
                }
            }
        });
    }
    _createNodeWithId(id, model, type) {
        let node = new jibo_kb_1.Node(type);
        node._id = id;
        model.pool[0].adoptNodeAsOurOwn(node);
        model.cache.add(node);
        return (node);
    }
    _checkStatusCode(err, res, message = null) {
        if (!err) {
            if (res.statusCode < 200 || res.statusCode > 299) {
                let description = 'HTTP Error Code ' + res.statusCode;
                if (message) {
                    description += message;
                }
                err = new Error(description);
            }
        }
        return err;
    }
    _deepEqual(value1, value2) {
        try {
            assert.deepEqual(value1, value2);
        }
        catch (error) {
            if (error.name !== "AssertionError") {
                throw error;
            }
            return false;
        }
        return true;
    }
    _errorOnce(errorMessage) {
        if (!this.pastErrors) {
            this.pastErrors = [];
        }
        if (this.pastErrors.indexOf(errorMessage) < 0) {
            log.error(errorMessage);
            this.pastErrors.push(errorMessage);
        }
    }
    _startTimer() {
        this.cloudTimer = process.hrtime();
    }
    _endTimer(apiCallName) {
        if (this.cloudTimer) {
            const diff = process.hrtime(this.cloudTimer);
            let elapsed = diff[0] * 1000 + diff[1] / 1000000;
            if (elapsed > SLOW_API_TRIGGER) {
                log.warn(apiCallName, 'was slow (' + elapsed + 'ms)');
            }
        }
    }
    _onRobot() {
        return (process.platform === 'linux' && process.arch === 'arm' && fs.existsSync('/var/jibo'));
    }
}
exports.default = SyncManager;

},{"../../clients/jibo-server":17,"../../utils/Debouncer":106,"../error/ErrorService":28,"./log":50,"assert":undefined,"crypto":undefined,"events":undefined,"fs":undefined,"jibo-kb":undefined,"jibo-service-clients":undefined,"jibo-service-framework":undefined}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('KB');

},{"../log":51}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Svc');

},{"../log":20}],52:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const fs = require("fs");
const https = require("https");
const jibo_log_1 = require("jibo-log");
const mkdirp = require("mkdirp");
const path = require("path");
const rimraf = require("rimraf");
const lsdashlart_1 = require("../../utils/lsdashlart");
const Debouncer_1 = require("../../utils/Debouncer");
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_server_1 = require("../../clients/jibo-server");
const log_1 = require("../log");
const log = log_1.default.createChild('MMS');
const CACHE_MAX_SIZE = 100 * 1024 * 1024;
const CACHE_MIN_FREE = 25 * 1024 * 1024;
const CACHE_SWEEP_DEBOUNCE_PERIOD = 1 * 1000;
const CACHE_SWEEP_DEBOUNCE_MAX_SPAN = 10 * 1000;
const CACHE_NOT_ON_ROBOT_FACTOR = 0.25;
class MediaManagerService extends jibo_service_framework_1.HTTPService {
    static get instance() {
        return MediaManagerService._instance;
    }
    constructor(options, rootDir) {
        super('media-manager', options, rootDir);
        if (MediaManagerService._instance) {
            throw new Error('Cannot instantiate MediaManagerService more than once');
        }
        MediaManagerService._instance = this;
        this._cacheMaxSize = CACHE_MAX_SIZE;
        this._cacheMinFree = CACHE_MIN_FREE;
        this._cacheSweepDebouncer = new Debouncer_1.default(CACHE_SWEEP_DEBOUNCE_PERIOD, CACHE_SWEEP_DEBOUNCE_MAX_SPAN);
        log.info('Instantiated');
    }
    init(callback) {
        super.init((err) => __awaiter(this, void 0, void 0, function* () {
            jibo_service_framework_1.NotificationsDispatcher.instance.init((err) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    return log.error('Error initializing NotificationsDispatcher', err);
                }
                try {
                    yield jibo_log_1.Log.handleLogLevelNotifications(jibo_service_framework_1.NotificationsDispatcher.instance);
                }
                catch (err) {
                    log.error('Failed to set up log level notification handler', err);
                }
            }));
            if (err) {
                callback(err);
            }
            else {
                if (!this._onRobot) {
                    log.info('not on robot, adjusting cache by factor', CACHE_NOT_ON_ROBOT_FACTOR);
                    this._cacheMaxSize = this._cacheMaxSize * CACHE_NOT_ON_ROBOT_FACTOR;
                    this._cacheMinFree = this._cacheMinFree * CACHE_NOT_ON_ROBOT_FACTOR;
                }
                this._registerExtraServiceName('media-proxy', (err) => {
                    if (err) {
                        callback(err);
                    }
                    else {
                        this._cacheSweepNeeded();
                        log.info('Initialized');
                        callback(err);
                    }
                });
            }
        }));
    }
    routes(url) {
        super.routes(url);
        url.post('/media-manager/adopt', this._onAdopt.bind(this));
        url.post('/media-manager/upload', this._onUpload.bind(this));
        url.post('/media-manager/download', this._onDownload.bind(this));
        url.post('/media-manager/delete', this._onDelete.bind(this));
        url.get('/proxy/media/photo/get', (req, res) => {
            this._onPhotoGet(req, res);
        });
    }
    destroy() {
        super.destroy();
        clearInterval(this._extraIntervalId);
        this._cacheSweepDebouncer.destroy();
    }
    setCacheParams(cacheMaxSize, cacheMinFree) {
        this._cacheMaxSize = cacheMaxSize;
        this._cacheMinFree = cacheMinFree;
    }
    onWipeRequest(req, res) {
        let dir = this._mediaRootDir;
        this._removeDir(dir, (err1) => {
            log.iferr(err1, 'error removing directory', dir);
            this._ensureDir(dir);
            dir = this._mediaRecordingsRootDir;
            this._removeDir(dir, (err2) => {
                log.iferr(err2, 'error removing directory', dir);
                this._ensureDir(dir);
                this.finishNoContent(res, 204, err1 || err2);
            });
        });
    }
    _onUpload(req, res) {
        let params = req.body;
        let uploadFilename = this._uploadFilename(params);
        let cacheFilename = this._cacheFilename(params);
        log.info('_onUpload', params);
        this._setupJSCClients();
        this._setupLoopId((err) => {
            if (!err) {
                fs.stat(uploadFilename, (err, stats) => {
                    let newErr;
                    if (err) {
                        newErr = new Error('stat failed ' + uploadFilename + ' ' + err);
                        log.error(newErr);
                        this.finish(res, newErr);
                    }
                    else if (!stats.isFile()) {
                        newErr = new Error('not a file ' + uploadFilename);
                        log.error(newErr);
                        this.finish(res, newErr);
                    }
                    else {
                        let rstream = fs.createReadStream(uploadFilename);
                        this._encryptStream(rstream, (err, rstream) => {
                            let createParams = {
                                loopId: this._loopId,
                                body: rstream,
                                path: params.contentID,
                                type: params.type,
                                isEncrypted: true,
                                reference: params.reference ? params.reference : undefined
                            };
                            if (this._noEncryption) {
                                createParams.isEncrypted = false;
                            }
                            this._jscMediaClient.create(createParams, (err, data) => {
                                log.iferr(err, 'Media#create');
                                if (!err) {
                                    if (!params.keepLocal) {
                                        fs.unlink(uploadFilename, (err) => {
                                            log.iferr(err, 'could not unlink file', uploadFilename);
                                            this.finishNoContent(res, 204);
                                        });
                                    }
                                    else {
                                        fs.rename(uploadFilename, cacheFilename, (err) => {
                                            log.iferr(err, 'could not move file into cache dir', uploadFilename);
                                            this.finishNoContent(res, 204);
                                        });
                                    }
                                }
                            });
                        });
                    }
                });
            }
            else {
                this.finish(res, err);
            }
        });
    }
    _onAdopt(req, res) {
        let params = req.body;
        log.info('_onAdopt', params);
        let contentIDs = params.contentIDs;
        let mediaType = params.mediaType;
        let adoptIt = (id, done) => {
            let adoptFilename = this._adoptFilename({ type: mediaType, contentID: id });
            let uploadFilename = this._uploadFilename({ type: mediaType, contentID: id });
            log.info(`adopting content id ${id}, moving file ${adoptFilename} to ${uploadFilename}`);
            fs.rename(adoptFilename, uploadFilename, (err) => {
                log.iferr(err, 'error moving file', adoptFilename);
                done(err);
            });
        };
        async.map(contentIDs, adoptIt, (err) => {
            log.iferr(err, 'problem adopting files in the media photo dir', this._mediaAdoptDir);
            if (err) {
                this.finish(res, err);
            }
            else {
                this.finishNoContent(res, 204);
            }
        });
    }
    _onDownload(req, res) {
        let params = req.body;
        let filename = this._cacheFilename(params);
        fs.stat(filename, (err, stats) => {
            if (!err) {
                log.info('File already exists', filename);
                this.finishNoContent(res, 204);
            }
            else {
                this._downloadFromCloud(params, (err) => {
                    if (err) {
                        if (err.name === 'EnoentError') {
                            this.finish(res, null, 'not found', null, 404);
                        }
                        else {
                            this.finish(res, err);
                        }
                    }
                    else {
                        this.finishNoContent(res, 204);
                    }
                });
            }
        });
    }
    _onDelete(req, res) {
        let params = req.body;
        let adoptFilename = this._adoptFilename(params);
        let cacheFilename = this._cacheFilename(params);
        let uploadFilename = this._uploadFilename(params);
        if (params.deleteLocal) {
            let found = false;
            found = found || this._removeFileIfExists(adoptFilename);
            found = found || this._removeFileIfExists(cacheFilename);
            found = found || this._removeFileIfExists(uploadFilename);
            if (!found) {
                log.error('local media file not found, could not delete locally for id', params.contentID);
            }
        }
        if (params.deleteRemote) {
            this._setupJSCClients();
            this._jscMediaClient.remove({ paths: [params.contentID] }, (err, data) => {
                if (err) {
                    log.error('failed to delete (with error)', params.contentID, err);
                }
                else if (data.length === 0) {
                    log.error('failed to delete', params.contentID);
                }
                else {
                    log.info('successful deletion', params.contenID);
                }
                this.finishNoContent(res, 204);
            });
        }
        else {
            this.finishNoContent(res, 204);
        }
    }
    _downloadFromCloud(params, callback) {
        let downloadFilename = this._cacheFilename(params, true);
        let filename = this._cacheFilename(params);
        this._setupJSCClients();
        this._getMediaRecord(params.contentID, (err, mediaRecord) => {
            if (err) {
                log.error('error getting file from server', params.contentID, err);
                callback(err);
            }
            else {
                if (mediaRecord) {
                    let file = fs.createWriteStream(downloadFilename, { encoding: 'binary' });
                    file.on('finish', () => {
                        fs.rename(downloadFilename, filename, (err) => {
                            log.info('finished downloading', params.contentID);
                            if (err) {
                                log.error(err, 'fs.rename ' + downloadFilename + ', ' + filename);
                            }
                            this._cacheSweepNeeded();
                            callback(err);
                        });
                    });
                    if (mediaRecord.url.startsWith('data:')) {
                        this._decodeDataUrl(mediaRecord.url, (buffer) => {
                            file.write(buffer);
                            file.end();
                        });
                    }
                    else {
                        https.get(mediaRecord.url, (response) => {
                            this._decryptStream(response, mediaRecord.isEncrypted, params.contentID, (err, stream) => {
                                stream.pipe(file);
                            });
                        });
                    }
                }
                else {
                    let err = new Error('could not download, file does not exist on server ' + params.contentID);
                    err.name = 'EnoentError';
                    log.error(err);
                    callback(err);
                }
            }
        });
    }
    _onPhotoGet(req, res, secondTry) {
        let id = req.query.id;
        let mediaType = 'image';
        let cacheFilename = this._cacheFilename({ type: mediaType, contentID: id });
        let uploadFilename = this._uploadFilename({ type: mediaType, contentID: id });
        fs.open(cacheFilename, 'r', (err, fd) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    fs.open(uploadFilename, 'r', (err, fd) => {
                        if (err) {
                            if (err.code === 'ENOENT') {
                                if (!secondTry) {
                                    this._downloadFromCloud({ type: mediaType, contentID: id }, (err) => {
                                        if (err) {
                                            let newErr = new Error('download failed ' + id + ' ' + err);
                                            log.error(newErr);
                                            if (err.name === 'EnoentError') {
                                                this.finish(res, null, 'not found', null, 404);
                                            }
                                            else {
                                                this.finish(res, newErr);
                                            }
                                        }
                                        else {
                                            this._onPhotoGet(req, res, true);
                                        }
                                    });
                                }
                                else {
                                    let err = new Error('could not find file after downloading it from cloud!');
                                    log.error(err);
                                    this.finish(res, err);
                                }
                            }
                            else {
                                let newErr = new Error('error opening file ' + uploadFilename + ' ' + err);
                                log.error(newErr);
                                this.finish(res, newErr);
                            }
                        }
                        else {
                            let data = fs.createReadStream(null, { fd: fd });
                            res.setHeader('Content-Type', 'image/jpeg');
                            data.pipe(res);
                        }
                    });
                }
                else {
                    let newErr = new Error('error opening file ' + cacheFilename + ' ' + err);
                    log.error(newErr);
                    this.finish(res, newErr);
                }
            }
            else {
                let data = fs.createReadStream(null, { fd: fd });
                res.setHeader('Content-Type', 'image/jpeg');
                data.pipe(res);
            }
        });
    }
    _cacheSweepNeeded() {
        this._cacheSweepDebouncer.trigger((done) => {
            this._doCacheSweep(() => {
                this.emit('_cacheSweep');
                done();
            });
        });
    }
    _doCacheSweep(callback) {
        log.info(`sweeping media photo cache (max size ${this._cacheMaxSize} min free ${this._cacheMinFree})`);
        lsdashlart_1.default(this._mediaCacheDir, (err, files) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    log.info('the photos directory does not exist yet', this._mediaCacheDir);
                }
                else {
                    log.error('problem reading the photos cache directory', this._mediaCacheDir, err);
                }
                callback();
            }
            else {
                let bytesUsed = 0;
                files.forEach((file) => {
                    bytesUsed += file.stat.size;
                });
                log.info('media photo cache using', bytesUsed, 'bytes in', files.length, 'files');
                if (bytesUsed > this._cacheMaxSize) {
                    const targetSize = this._cacheMaxSize - this._cacheMinFree;
                    const bytesToFree = bytesUsed - targetSize;
                    let deleteThese = [];
                    let deleteBytes = 0;
                    while (files.length && deleteBytes < bytesToFree) {
                        let victim = files.shift();
                        deleteThese.push(victim);
                        deleteBytes += victim.stat.size;
                    }
                    const bytesLeft = bytesUsed - deleteBytes;
                    log.info('removing', deleteThese.length, 'files from the media photo cache freeing', deleteBytes, 'bytes');
                    log.debug('leaving', bytesLeft, 'used which is', targetSize - bytesLeft, 'less than the target size of', targetSize);
                    let unlinkIt = (file, done) => {
                        log.info('deleting file', file.filename, file.stat.mtime.getTime());
                        fs.unlink(file.filename, (err) => {
                            log.iferr(err, 'error deleting file', file.filename);
                            done(err);
                        });
                    };
                    async.map(deleteThese, unlinkIt, (err) => {
                        log.iferr(err, 'problem deleting files in the media photo cache dir', this._mediaCacheDir);
                        callback();
                    });
                }
                else {
                    process.nextTick(callback);
                }
            }
        });
    }
    _getMediaRecord(id, callback) {
        this._jscMediaClient.get({ paths: [id] }, (err, data) => {
            log.iferr(err, 'Media#get');
            if (err || data === null || data.length === 0) {
                callback(err);
            }
            else {
                let mediaRecord;
                for (let i = 0; i < data.length; i++) {
                    if (data[i].path === id) {
                        mediaRecord = data[i];
                        break;
                    }
                }
                callback(null, mediaRecord);
            }
        });
    }
    _encryptStream(stream, callback) {
        if (this._noEncryption) {
            process.nextTick(() => { callback(null, stream); });
        }
        else {
            this._setupSymmetricKey((err) => {
                if (err) {
                    callback(err);
                }
                else {
                    let params = { Key: this._symmetricKey, Body: stream };
                    let encStream = this._jscKeyClient.encryptSymmetricStream(params);
                    callback(null, encStream);
                }
            });
        }
    }
    _decryptStream(stream, isEncrypted, id, callback) {
        if (!isEncrypted || this._noEncryption) {
            if (isEncrypted) {
                log.warn('cannot decrypt encrypted media item', id);
            }
            process.nextTick(() => {
                callback(null, stream);
            });
        }
        else {
            this._setupSymmetricKey((err) => {
                if (err) {
                    callback(err);
                }
                else {
                    let params = { Key: this._symmetricKey, Body: stream };
                    let decStream = this._jscKeyClient.decryptSymmetricStream(params);
                    callback(null, decStream);
                }
            });
        }
    }
    _setupSymmetricKey(callback) {
        this._setupLoopId((err) => {
            if (err) {
                callback(err);
            }
            else {
                if (this._symmetricKey) {
                    process.nextTick(callback);
                }
                else {
                    this._jscKeyClient.loadSymmetricKey({ loopId: this._loopId }, (err, symmKey) => {
                        if (err || symmKey === null) {
                            if (!err) {
                                err = new Error('loaded key was null');
                            }
                            log.error('failed to load key', err);
                        }
                        else {
                            this._symmetricKey = symmKey;
                        }
                        callback(err);
                    });
                }
            }
        });
    }
    _setupLoopId(callback) {
        this._setupJSCClients();
        if (this._loopId) {
            process.nextTick(callback);
        }
        else {
            const loopClient = new jibo_server_1.JSC.Loop();
            loopClient.list((err, data) => {
                if (err) {
                    callback(err);
                }
                else if (!data || data.length === 0) {
                    callback(new Error('failed to lookup loop id, no loop'));
                }
                else if (data.length > 1) {
                    callback(new Error('multiple loops found, can not deal with this.'));
                }
                else {
                    this._loopId = data[0].id;
                    callback();
                }
            });
        }
    }
    _setupJSCClients() {
        if (!this._jscMediaClient) {
            let filename;
            if (this._onRobot) {
                filename = '/var/jibo/credentials.json';
            }
            else {
                filename = path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'credentials.json');
            }
            let credentials;
            try {
                let data = fs.readFileSync(filename, 'utf8');
                credentials = JSON.parse(data);
            }
            catch (e) {
                log.error('could not read/parse credentials file', filename);
            }
            if (credentials) {
                jibo_server_1.JSC.config.update(credentials);
            }
            this._jscMediaClient = new jibo_server_1.JSC.Media();
        }
        if (!this._jscKeyClient) {
            this._jscKeyClient = new jibo_server_1.JSC.Key();
            this._setupJSCKeys();
        }
    }
    _setupJSCKeys() {
        if (!this._keyDir) {
            if (this._onRobot) {
                this._keyDir = '/var/jibo/keys';
                this._noEncryption = false;
            }
            else {
                this._keyDir = path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'keys');
                if (fs.existsSync(path.join(this._keyDir, 'keypair.json'))
                    && this._jscKeyClient.loadSymmetricKey) {
                    this._noEncryption = false;
                }
                else {
                    this._noEncryption = true;
                }
            }
            jibo_server_1.JSC.Key.prototype.storage = {
                load: (name, callback) => {
                    let filename = path.join(this._keyDir, name + '.json');
                    fs.readFile(filename, { encoding: 'utf8' }, callback);
                },
                save: (name, value, callback) => {
                    let filename = path.join(this._keyDir, name + '.json');
                    fs.writeFile(filename, value, callback);
                }
            };
        }
    }
    _registerExtraServiceName(extraName, callback) {
        const REFRESH_DURATION = 10000;
        const TTL = 30;
        this._extraRecord = {
            name: extraName,
            host: '127.0.0.1',
            port: this.port,
            path: '/',
            ttl: TTL,
            tls: ''
        };
        jibo_service_framework_1.RegistryClient.instance.deleteRecord(this._extraRecord, (error) => {
            if (error) {
                log.error('RegistryClient.deleteRecord', error);
            }
            jibo_service_framework_1.RegistryClient.instance.addNewRecord(this._extraRecord, (error) => {
                this._extraIntervalId = setInterval(this._extraRefresh.bind(this), REFRESH_DURATION);
                callback();
            });
        });
    }
    _extraRefresh() {
        jibo_service_framework_1.RegistryClient.instance.editRecord(this._extraRecord, (error) => {
            if (error) {
                log.info('readding registry record', this._extraRecord);
                jibo_service_framework_1.RegistryClient.instance.addNewRecord(this._extraRecord, () => {
                    return;
                });
            }
            else {
                return;
            }
        });
    }
    _adoptFilename(params) {
        let extension = this._fileExtension(params.type);
        return path.join(this._mediaAdoptDir, params.contentID + extension);
    }
    _uploadFilename(params) {
        let extension = this._fileExtension(params.type);
        return path.join(this._mediaUploadDir, params.contentID + extension);
    }
    _cacheFilename(params, download = false) {
        let extension = this._fileExtension(params.type);
        if (download) {
            return path.join(this._mediaCacheDir, '.DL.' + params.contentID + extension);
        }
        else {
            return path.join(this._mediaCacheDir, params.contentID + extension);
        }
    }
    _fileExtension(type) {
        let extension = '';
        if (type === 'recording') {
            extension = '.mp4';
        }
        if (type === 'image' ||
            type === 'thumb' ||
            type === 'thumb_robot') {
            extension = '.jpg';
        }
        return extension;
    }
    _decodeDataUrl(url, callback) {
        let matches = url.match(/^data:(.+);base64,(.*)$/);
        let buffer;
        if (!matches) {
            log.error('bad data url, unable to decode', url.substr(0, 30), '(truncated to 30 chars in log output)');
            buffer = '';
        }
        else {
            let mime = matches[1];
            let data = matches[2];
            if (mime !== 'image/jpeg') {
                log.warn('data url with mime type other than image/jpeg is unsupported');
            }
            buffer = new Buffer(data, 'base64');
        }
        process.nextTick(() => {
            callback(buffer);
        });
    }
    get _mediaRootDir() {
        if (!this.__mediaRootDir) {
            if (this._onRobot) {
                this.__mediaRootDir = '/opt/jibo/Photos';
            }
            else {
                this.__mediaRootDir =
                    path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'photos');
            }
        }
        this._ensureDir(this.__mediaRootDir);
        return this.__mediaRootDir;
    }
    get _mediaAdoptDir() {
        return this._mediaRootDir;
    }
    get _mediaUploadDir() {
        if (!this.__mediaUploadDir) {
            this.__mediaUploadDir = path.join(this._mediaRootDir, 'upload');
        }
        this._ensureDir(this.__mediaUploadDir);
        return this.__mediaUploadDir;
    }
    get _mediaCacheDir() {
        if (!this.__mediaCacheDir) {
            this.__mediaCacheDir = path.join(this._mediaRootDir, 'cache');
        }
        this._ensureDir(this.__mediaCacheDir);
        return this.__mediaCacheDir;
    }
    get _mediaRecordingsRootDir() {
        if (!this.__mediaRecordingsRootDir) {
            if (this._onRobot) {
                this.__mediaRecordingsRootDir = '/opt/jibo/Recordings';
            }
            else {
                this.__mediaRecordingsRootDir =
                    path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'recordings');
            }
            this._ensureDir(this.__mediaRecordingsRootDir);
        }
        return this.__mediaRecordingsRootDir;
    }
    _ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            mkdirp.sync(dir);
        }
    }
    _removeDir(dir, callback) {
        let err;
        dir = path.normalize(dir);
        if (dir.length < 8) {
            err = new Error('not comfortable removing media directory ' + dir);
        }
        else {
            log.warn('removing the entire media directory at', dir);
            try {
                rimraf.sync(dir, { disableGlob: true });
            }
            catch (e) {
                err = e;
            }
        }
        process.nextTick(() => callback(err));
    }
    _removeFileIfExists(filename) {
        let err;
        let stats;
        try {
            stats = fs.statSync(filename);
        }
        catch (e) {
            err = e;
        }
        if (err && err.code === 'ENOENT') {
            return false;
        }
        if (err || !stats) {
            log.error('error stating local file', filename, err);
            return false;
        }
        if (!stats.isFile()) {
            log.error('not a file', filename);
            return false;
        }
        try {
            fs.unlinkSync(filename);
        }
        catch (e) {
            err = e;
        }
        log.iferr(err, 'error unlinking file');
        return true;
    }
    get _onRobot() {
        if (this.__onRobot === undefined) {
            this.__onRobot = (process.platform === 'linux'
                && process.arch === 'arm'
                && fs.existsSync('/var/jibo'));
        }
        return this.__onRobot;
    }
}
exports.default = MediaManagerService;

},{"../../clients/jibo-server":17,"../../utils/Debouncer":106,"../../utils/lsdashlart":111,"../log":51,"async":undefined,"fs":undefined,"https":undefined,"jibo-log":undefined,"jibo-service-framework":undefined,"mkdirp":undefined,"path":undefined,"rimraf":undefined}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require('uuid');
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../log");
const log = log_1.default.createChild('Notifications');
class NotificationsService extends jibo_service_framework_1.HTTPWSService {
    static get instance() {
        return NotificationsService._instance;
    }
    constructor(options, rootDir) {
        super('notifications', options, rootDir);
        if (NotificationsService._instance) {
            throw new Error('Cannot instantiate NotificationsService more than once');
        }
        NotificationsService._instance = this;
        this._queue = [];
        log.info("Instantiated");
    }
    init(callback) {
        super.init((err) => {
            log.info('Initialized');
            callback(err);
        });
    }
    onMessage(command, client) {
        return;
    }
    onConnection(client, request) {
        super.onConnection(client, request);
    }
    routes(url) {
        super.routes(url);
        url.post('/notifications', (req, res) => {
            this.createNotification(req, res);
        });
        url.put('/notifications/:id', (req, res) => {
            this.updateNotification(req, res);
        });
        url.get('/notifications', (req, res) => {
            this.getAllNotifications(req, res);
        });
        url.delete('/notifications/:id', (req, res) => {
            this.deleteNotification(req, res);
        });
        url.delete('/notifications', (req, res) => {
            this.deleteAllNotifications(req, res);
        });
    }
    createNotification(req, res) {
        req.body.id = uuid.v4();
        this._queue.push(req.body);
        this.sendJson(res, req.body, 200);
        this.notifyEmit('notification-created', req.body);
    }
    updateNotification(req, res) {
        const notification = this._queue.find(notification => notification.id === req.params.id);
        if (notification === undefined) {
            this.sendJson(res, {}, 404);
            return;
        }
        notification.type = req.body.type ? req.body.type : notification.type;
        notification.title = req.body.title ? req.body.title : notification.title;
        notification.description = req.body.description ? req.body.description : notification.description;
        this.sendJson(res, notification, 200);
        this.notifyEmit('notification-updated', notification);
    }
    getAllNotifications(req, res) {
        let body = this._queue;
        this.sendJson(res, body, 200);
    }
    deleteNotification(req, res) {
        const notificationIndex = this._queue.findIndex(notification => notification.id === req.params.id);
        if (notificationIndex === -1) {
            this.sendJson(res, {}, 404);
            return;
        }
        this._queue.splice(notificationIndex, 1);
        this.sendJson(res, {}, 200);
        this.notifyEmit('notification-deleted', req.params.id);
    }
    deleteAllNotifications(req, res) {
        this._queue = [];
        this.sendJson(res, {}, 200);
        this.notifyEmit('notifications-all-deleted', undefined);
    }
    notifyEmit(eventName, event) {
        this.emit(eventName, event);
        this.connections.forEach((websocket) => {
            this.sendWsJson(websocket, {
                eventName,
                event
            });
        });
    }
}
exports.default = NotificationsService;

},{"../log":51,"jibo-service-framework":undefined,"uuid":undefined}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../log");
const PerformanceServiceSim_1 = require("../../sim-services/performance/PerformanceServiceSim");
class PerformanceService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('performance', options, rootDir);
        this._log = log_1.default.createChild('PerformanceService');
        if (PerformanceService._instance) {
            throw new Error('Cannot instantiate PerformanceService more than once');
        }
        PerformanceService._instance = this;
        this._baseTime = Date.now();
        const time = process.hrtime();
        this._baseTime -= time[0] * 1000 + time[1] / 1000000;
        this._log.info('Instantiated');
    }
    static get instance() {
        if (PerformanceService._instance) {
            return PerformanceService._instance;
        }
        return PerformanceServiceSim_1.default.instance;
    }
    init(callback) {
        super.init((error) => {
            if (error) {
                return callback(error);
            }
            this._log.info('Initialized');
            callback();
        });
    }
    routes(url) {
        super.routes(url);
        url.post('/log', (req, res) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => {
                let message;
                try {
                    message = JSON.parse(data);
                }
                catch (e) {
                    this._log.warn('Performance service cannot parse ', data);
                    return this.sendJson(res, {
                        status: 'error',
                        message: 'could not parse json',
                        json: data,
                    }, 400);
                }
                this.log(message.time, message.type, message.description);
                this.sendJson(res, { status: 'OK' });
            });
        });
    }
    log(time, type, description) {
        this.connections.forEach((client) => {
            this.sendWsJson(client, {
                time,
                type,
                description: description || '',
            });
        });
    }
    now() {
        const time = process.hrtime();
        return this._baseTime + time[0] * 1000 + time[1] / 1000000;
    }
    onMessage(message, client) {
        this._log.log('onMessage', message);
        if (message.type === 'time-ping') {
            this.sendWsJson(client, {
                time: this.now(),
                type: 'time-pong',
                description: message.description
            });
        }
    }
}
exports.default = PerformanceService;

},{"../../sim-services/performance/PerformanceServiceSim":95,"../log":51,"jibo-service-framework":undefined}],55:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const WebSocket = require("ws");
const http = require("http");
const Router = require("router");
const finalhandler = require("finalhandler");
const AssetServer_1 = require("./assets/AssetServer");
const log_1 = require("./log");
const timer = require("application-metrics");
const log = log_1.default.createChild('ConnectionManager');
const EXTERNAL_PORT = 8160;
const HEARTBEAT_TIME = 10 * 1000;
const FLATLINE_TIME = 20 * 1000;
class ConnectionManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.webServer = null;
        this.wsServer = null;
        this.webSocket = null;
        this.nextPing = null;
        this.checkHeartbeatInterval = null;
        this.lastMessageTime = 0;
        this.onRequest = this.onRequest.bind(this);
        this.onConnection = this.onConnection.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.checkForPulse = this.checkForPulse.bind(this);
        this.sendPing = this.sendPing.bind(this);
        this.onPong = this.onPong.bind(this);
    }
    static dispose() {
        if (this._instance) {
            this._instance.cleanup();
            this._instance = undefined;
        }
    }
    static get instance() {
        if (!ConnectionManager._instance) {
            ConnectionManager._instance = new ConnectionManager();
        }
        return ConnectionManager._instance;
    }
    listen(assets, isInSim) {
        return __awaiter(this, void 0, void 0, function* () {
            const router = new Router();
            this.webServer = http.createServer((req, res) => {
                router(req, res, finalhandler(req, res));
            });
            router.post('/request', this.onRequest);
            router.get(AssetServer_1.ASSET_PATH + ':url', assets.handleAssetRequest);
            this.webServer.listen(EXTERNAL_PORT, isInSim ? '127.0.0.1' : '0.0.0.0', 10, () => {
                console.log('REMOTE SERVICE LISTENING ON PORT ', this.webServer.address().port);
            });
            this.wsServer = new WebSocket.Server({
                server: this.webServer
            });
            this.wsServer.on('connection', this.onConnection);
        });
    }
    close(code, reason) {
        if (this.webSocket) {
            this.webSocket.removeListener('close', this.onClose);
            this.webSocket.close(code, reason);
            setTimeout(() => {
                this.cleanup(true);
            }, 3);
        }
    }
    reset() {
        this.cleanup(true);
    }
    send(message) {
        return new Promise((resolve, reject) => {
            if (this.webSocket) {
                if (typeof message !== 'string') {
                    message = JSON.stringify(message);
                }
                this.webSocket.send(message, (err) => {
                    if (err) {
                        log.warn('Remote send failure:', err);
                        this.webSocket.terminate();
                        reject();
                        return;
                    }
                    resolve();
                });
            }
        });
    }
    onRequest(req, res) {
        timer.start('onRequest');
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            let data;
            try {
                data = JSON.parse(chunk);
            }
            catch (e) {
                log.warn('Unable to parse command mode request', e);
                let response = '{"accept": false}';
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Length', response.length.toString());
                res.statusCode = 200;
                res.end(response);
                return;
            }
            log.debug('accepting command mode request');
            this.appData = data;
            let response = '{"accept": true}';
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Length', response.length.toString());
            res.statusCode = 200;
            res.end(response);
        });
    }
    onConnection(ws) {
        log.debug('Command Performance : time to connect after request : ' + timer.stop('onRequest') + 'ms');
        this.webSocket = ws;
        ws.on('message', this.onMessage);
        this.lastMessageTime = Date.now();
        this.checkHeartbeatInterval = setInterval(this.checkForPulse, HEARTBEAT_TIME);
        this.sendPing();
        ws.on('pong', this.onPong);
        ws.on('close', this.onClose);
        this.emit('connected', this.appData);
        this.appData = undefined;
        log.info('websocket connected');
    }
    sendPing() {
        if (this.webSocket) {
            this.nextPing = null;
            try {
                this.webSocket.ping();
            }
            catch (e) {
                this.webSocket.terminate();
            }
        }
    }
    onPong() {
        this.lastMessageTime = Date.now();
        if (this.nextPing) {
            clearTimeout(this.nextPing);
        }
        this.nextPing = setTimeout(this.sendPing, HEARTBEAT_TIME);
    }
    checkForPulse() {
        if (Date.now() - this.lastMessageTime >= FLATLINE_TIME) {
            if (this.webSocket) {
                this.webSocket.terminate();
            }
        }
    }
    onMessage(message) {
        this.lastMessageTime = Date.now();
        if (this.nextPing) {
            clearTimeout(this.nextPing);
        }
        this.nextPing = setTimeout(this.sendPing, HEARTBEAT_TIME);
        this.emit('message', message);
    }
    onClose(code) {
        const endSession = code === 1000;
        log.info(`websocket client closed, sent code: ${code}, will end session: ${endSession}`);
        this.cleanup(endSession);
    }
    cleanup(isNormal = true) {
        clearInterval(this.checkHeartbeatInterval);
        clearInterval(this.nextPing);
        this.cleanupWebSocket(isNormal);
        if (this.wsServer) {
            this.wsServer.removeAllListeners();
            this.wsServer.close();
            this.wsServer = null;
        }
        if (this.webServer) {
            this.webServer.close();
            this.webServer = null;
        }
    }
    cleanupWebSocket(isNormal = true) {
        if (this.webSocket) {
            try {
                this.emit('disconnected', isNormal);
            }
            catch (e) {
                log.warn('Error during disconnect emit', e);
            }
            this.webSocket.removeAllListeners();
            if (this.webSocket.readyState === this.webSocket.OPEN) {
                this.webSocket.close();
            }
            this.webSocket = null;
        }
    }
}
ConnectionManager._instance = null;
exports.default = ConnectionManager;

},{"./assets/AssetServer":57,"./log":60,"application-metrics":undefined,"events":undefined,"finalhandler":undefined,"http":undefined,"router":undefined,"ws":undefined}],56:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const jetstream_client_1 = require("@jibo/jetstream-client");
const GlobalManagerService_1 = require("../global-manager/GlobalManagerService");
const ConnectionManager_1 = require("./ConnectionManager");
const AssetServer_1 = require("./assets/AssetServer");
const RunMode_1 = require("../../utils/RunMode");
const log_1 = require("./log");
const log = log_1.default.createChild('RemoteService');
class RemoteService extends jibo_service_framework_1.HTTPWSService {
    static get instance() {
        return RemoteService._instance;
    }
    get localSocket() {
        return this.connections[0];
    }
    constructor(options, rootDir) {
        super('remote', options, rootDir);
        if (RemoteService._instance) {
            throw new Error('Cannot instantiate RemoteService more than once');
        }
        RemoteService._instance = this;
        this.assetServer = new AssetServer_1.default();
        log.info('Instantiated');
    }
    onMessage(command, client) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = typeof command === 'string' ? JSON.parse(command) : command;
                if (message.type === 'message') {
                    switch (message.status) {
                        case 'handleAsset':
                        case 'cancelAsset':
                            this.assetServer.handleMessage(message);
                            break;
                        case 'close':
                            ConnectionManager_1.default.instance.close(message.code, message.reason);
                            break;
                        case 'launchSkill':
                            log.info('Redirecting to skill');
                            const launch = new jetstream_client_1.types.ListenResult(message.result.asr, message.result.nlu, message.result.match);
                            GlobalManagerService_1.default.instance.handleSkillLaunch(launch);
                            break;
                    }
                    return;
                }
                try {
                    yield ConnectionManager_1.default.instance.send(command);
                }
                catch (e) {
                    const message = {
                        type: 'message',
                        status: 'sendError',
                        message: command
                    };
                    this.localSocket.send(JSON.stringify(message));
                }
            }
            catch (e) {
                log.warn('could not parse message from skill side', e);
            }
        });
    }
    init(callback) {
        super.init((err) => {
            if (err) {
                return callback(err);
            }
            ConnectionManager_1.default.instance.on('connected', (appData) => {
                log.info('on connected');
                const message = {
                    type: 'message',
                    status: 'connected',
                    appData: appData
                };
                this.localSocket.send(JSON.stringify(message));
            });
            ConnectionManager_1.default.instance.on('disconnected', (isComplete) => {
                log.info('on disconnected');
                if (this.localSocket) {
                    const message = {
                        type: 'message',
                        status: 'disconnected',
                        wasError: !isComplete
                    };
                    this.localSocket.send(JSON.stringify(message));
                }
                this.assetServer.removeAll();
                setTimeout(() => {
                    ConnectionManager_1.default.instance.listen(this.assetServer, RunMode_1.default.runMode === RunMode_1.default.RunMode.SIMULATOR);
                }, 10);
            });
            ConnectionManager_1.default.instance.on('message', (command) => {
                this.localSocket.send(command);
            });
            ConnectionManager_1.default.instance.listen(this.assetServer, RunMode_1.default.runMode === RunMode_1.default.RunMode.SIMULATOR);
            log.info('Initialized');
            callback();
        });
    }
}
exports.default = RemoteService;

},{"../../utils/RunMode":108,"../global-manager/GlobalManagerService":42,"./ConnectionManager":55,"./assets/AssetServer":57,"./log":60,"@jibo/jetstream-client":undefined,"jibo-service-framework":undefined}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const VideoStreamer_1 = require("./VideoStreamer");
const PhotoHoster_1 = require("./PhotoHoster");
exports.ASSET_PATH = '/assets/';
class AssetServer {
    constructor() {
        this.urlHandlers = new Map();
        this.handleAssetRequest = this.handleAssetRequest.bind(this);
    }
    handleAssetRequest(req, res) {
        const url = req.params.url;
        if (!this.urlHandlers.has(url)) {
            res.statusCode = 404;
            res.end();
            return;
        }
        this.urlHandlers.get(url).handleRequest(res);
    }
    removeHandlerForId(id) {
        if (!this.urlHandlers.has(id)) {
            return;
        }
        const handler = this.urlHandlers.get(id);
        handler.stop();
        this.urlHandlers.delete(id);
    }
    handleMessage(message) {
        const assetUrl = message.asset.assetUrl;
        const id = assetUrl.replace(exports.ASSET_PATH, '');
        switch (message.status) {
            case 'cancelAsset':
                this.removeHandlerForId(id);
                break;
            case 'handleAsset':
                if (this.urlHandlers.has(id)) {
                    return;
                }
                switch (message.asset.type) {
                    case 'video':
                        const streamer = new VideoStreamer_1.default();
                        this.urlHandlers.set(id, streamer);
                        streamer.start(message.asset, () => {
                            this.removeHandlerForId(id);
                        });
                        break;
                    case 'photo':
                        const hoster = new PhotoHoster_1.default();
                        this.urlHandlers.set(id, hoster);
                        hoster.start(message.asset, () => {
                            this.removeHandlerForId(id);
                        });
                        break;
                }
                break;
        }
    }
    removeAll() {
        for (const id in this.urlHandlers) {
            this.removeHandlerForId(id);
        }
    }
}
exports.default = AssetServer;

},{"./PhotoHoster":58,"./VideoStreamer":59}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const stream = require("stream");
const AVAILABILITY_TIMEOUT = 10000;
class PhotoHostewr {
    constructor() {
        this.ongoingResponse = null;
        this.pipedImage = null;
        this.isSending = false;
        this.selfEndCallback = null;
        this.photoUrl = null;
        this.timeout = null;
    }
    start(request, selfEndCallback) {
        this.selfEndCallback = selfEndCallback;
        this.photoUrl = request.photoUrl;
        this.fetchPhoto();
        this.timeout = setTimeout(() => {
            this.selfEndCallback();
        }, AVAILABILITY_TIMEOUT);
    }
    handleRequest(res) {
        if (this.ongoingResponse) {
            res.statusCode = 404;
            res.end();
            return;
        }
        clearTimeout(this.timeout);
        this.isSending = true;
        this.ongoingResponse = res;
        if (this.pipedImage) {
            this.pipeImage();
        }
        res.on('complete', (response) => {
            if (!this.isSending) {
                return;
            }
            this.isSending = false;
            this.pipedImage = null;
            this.selfEndCallback();
        });
    }
    stop() {
        clearTimeout(this.timeout);
        if (this.ongoingResponse) {
            this.ongoingResponse.end();
            this.ongoingResponse = null;
        }
        if (this.pipedImage) {
            this.pipedImage.unpipe();
            this.pipedImage = null;
        }
        this.isSending = false;
        this.selfEndCallback = null;
    }
    fetchPhoto() {
        axios_1.default.get(this.photoUrl, { responseType: 'stream' }).then(response => {
            this.pipedImage = new stream.PassThrough();
            response.data.pipe(this.pipedImage);
            if (this.ongoingResponse) {
                this.pipeImage();
            }
        }, err => {
            if (this.ongoingResponse) {
                this.ongoingResponse.statusCode = 503;
                this.ongoingResponse.end();
            }
            this.selfEndCallback();
        });
    }
    pipeImage() {
        this.pipedImage.pipe(this.ongoingResponse);
    }
}
exports.default = PhotoHostewr;

},{"axios":undefined,"stream":undefined}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const httpAdapter = require("axios/lib/adapters/http");
const jibo_service_clients_1 = require("jibo-service-clients");
const jibo_command_protocol_1 = require("jibo-command-protocol");
const BOUNDARY = 'VideoBoundary';
const AVAILABILITY_TIMEOUT = 10000;
class VideoStreamer {
    constructor() {
        this.nextImagePath = null;
        this.ongoingResponse = null;
        this.pipedImage = null;
        this.isRunning = false;
        this.isSending = false;
        this.selfEndCallback = null;
        this.photoMode = null;
        this.timeout = null;
        this.onPhotoTaken = this.onPhotoTaken.bind(this);
    }
    start(request, selfEndCallback) {
        this.selfEndCallback = selfEndCallback;
        this.isRunning = true;
        switch (request.videoType) {
            case jibo_command_protocol_1.VideoType.Debug:
                this.photoMode = jibo_service_clients_1.media.PhotoType.DEBUG;
                break;
            case jibo_command_protocol_1.VideoType.Normal:
                this.photoMode = jibo_service_clients_1.media.PhotoType.PREVIEW;
                break;
        }
        this.takeNextPhoto();
        this.timeout = setTimeout(() => {
            this.selfEndCallback();
        }, AVAILABILITY_TIMEOUT);
    }
    handleRequest(res) {
        if (this.ongoingResponse) {
            res.statusCode = 404;
            res.end();
            return;
        }
        clearTimeout(this.timeout);
        this.ongoingResponse = res;
        res.writeHead(200, {
            'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
            'Cache-Control': 'no-cache',
            'Connection': 'close',
            'Pragma': 'no-cache'
        });
        this.sendBoundary();
        this.writeFile(this.nextImagePath);
    }
    stop() {
        clearTimeout(this.timeout);
        if (this.ongoingResponse) {
            this.ongoingResponse.end();
            this.ongoingResponse = null;
        }
        if (this.pipedImage) {
            this.pipedImage.unpipe();
            this.pipedImage.removeAllListeners();
            this.pipedImage = null;
        }
        this.isRunning = false;
        this.selfEndCallback = null;
    }
    takeNextPhoto() {
        jibo_service_clients_1.media.takePhoto(jibo_service_clients_1.media.CameraID.LEFT, this.photoMode, [], false, this.onPhotoTaken);
    }
    onPhotoTaken(err, response) {
        if (!this.isRunning) {
            return;
        }
        if (err) {
            console.log('take photo error: ', err);
            this.selfEndCallback();
            return;
        }
        if (response) {
            this.writeFile(jibo_service_clients_1.media.getPreviewUrl(response.id));
        }
    }
    sendBoundary() {
        this.ongoingResponse.write(`--${BOUNDARY}\r\n`);
    }
    writeFile(path) {
        if (!this.isRunning) {
            return;
        }
        if (this.isSending || !this.ongoingResponse) {
            this.nextImagePath = path;
            return;
        }
        this.takeNextPhoto();
        this.nextImagePath = null;
        this.isSending = true;
        let hasStarted = false;
        axios_1.default.get(path, {
            responseType: 'stream',
            adapter: httpAdapter,
        }).then(response => {
            const stream = response.data;
            this.pipedImage = stream;
            stream.on('data', (chunk) => {
                if (!this.isRunning) {
                    return;
                }
                if (!hasStarted) {
                    this.ongoingResponse.write(`Content-Type: image/jpeg\r\n`);
                    this.ongoingResponse.write(`Content-Length:${response.headers['content-length']}\r\n\r\n`);
                    hasStarted = true;
                }
                this.ongoingResponse.write(new Buffer(chunk));
            });
            stream.on('end', () => {
                if (!this.isRunning) {
                    return;
                }
                this.isSending = false;
                this.pipedImage = null;
                this.sendBoundary();
                if (this.nextImagePath) {
                    this.writeFile(this.nextImagePath);
                }
            });
        }).catch(err => {
            console.log('ERROR WRITING FILE', err);
            this.selfEndCallback();
        });
    }
}
exports.default = VideoStreamer;

},{"axios":undefined,"axios/lib/adapters/http":undefined,"jibo-command-protocol":undefined,"jibo-service-clients":undefined}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Remote');

},{"../log":51}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const OTAUpdater_1 = require("../../utils/OTAUpdater");
const jetstream_client_1 = require("@jibo/jetstream-client");
const GlobalManagerService_1 = require("../global-manager/GlobalManagerService");
const Scheduler = require("node-schedule");
const uuid = require("uuid");
const log_1 = require("../log");
const jibo_service_clients_1 = require("jibo-service-clients");
const log = log_1.default.createChild('Scheduler');
class SchedulerService extends jibo_service_framework_1.HTTPService {
    constructor(options, rootDir) {
        super('scheduler', options, rootDir);
        this.options = options;
        if (SchedulerService._instance) {
            throw new Error('Cannot instantiate SchedulerService more than once');
        }
        SchedulerService._instance = this;
        OTAUpdater_1.default.createInstance(log, options.otaFilter);
        log.info("Instantiated");
    }
    static get instance() {
        return SchedulerService._instance;
    }
    init(callback) {
        super.init((error) => {
            if (error) {
                return callback(error);
            }
            OTAUpdater_1.default.instance.init(() => {
                log.info('Initialized');
                callback();
            });
            jibo_service_clients_1.systemManager.onShutdown.once(this._launchShutdownAnimation.bind(this));
        });
    }
    routes(url) {
        super.routes(url);
        url.post('/ota-update', (req, res) => {
            let chunk = "";
            req.on('data', data => chunk += data);
            req.on('end', () => {
                OTAUpdater_1.default.instance.downloadAndInstall((error) => {
                    if (error) {
                        return this.sendJson(res, { status: 'Error', message: error.message }, 500);
                    }
                    return this.sendJson(res, { status: 'OK' });
                });
            });
        });
        url.post('/download-status', (req, res) => {
            let chunk = "";
            req.on('data', data => chunk += data);
            req.on('end', () => {
                OTAUpdater_1.default.instance.downloadStatus((error, data) => {
                    if (error) {
                        return this.sendJson(res, { status: 'Error', message: error.message }, 500);
                    }
                    return this.sendJson(res, { status: 'OK', data });
                });
            });
        });
        url.post('/backup-status', (req, res) => {
            let chunk = "";
            req.on('data', data => chunk += data);
            req.on('end', () => {
                OTAUpdater_1.default.instance.backupStatus((error, data) => {
                    if (error) {
                        return this.sendJson(res, { status: 'Error', message: error.message }, 500);
                    }
                    return this.sendJson(res, { status: 'OK', data });
                });
            });
        });
        url.post('/backup-robot', (req, res) => {
            let chunk = "";
            req.on('data', data => chunk += data);
            req.on('end', () => {
                OTAUpdater_1.default.instance.backupRobot(true, (error) => {
                    if (error) {
                        return this.sendJson(res, { status: 'Error', message: error.message }, 500);
                    }
                    return this.sendJson(res, { status: 'OK' });
                });
            });
        });
        url.post('/check-updates', (req, res) => {
            let chunk = "";
            req.on('data', data => chunk += data);
            req.on('end', () => {
                OTAUpdater_1.default.instance.checkForUpdates((error, data) => {
                    if (error) {
                        return this.sendJson(res, { status: 'Error', message: error.message }, 500);
                    }
                    return this.sendJson(res, { status: 'OK', data });
                });
            });
        });
        url.post('/add', (req, res) => {
            this._addJob(req, res);
        });
        url.post('/remove', (req, res) => {
            this._removeJob(req, res);
        });
        url.post('/list', (req, res) => {
            this._listJobs(req, res);
        });
        url.post('/has-job', (req, res) => {
            this._hasJob(req, res);
        });
    }
    addJob(schedule, func) {
        let jobId = uuid.v4();
        let job = Scheduler.scheduleJob(jobId, schedule, func);
        let msg = 'Successfully scheduled job';
        if (!job) {
            msg = 'Could not schedule job';
            jobId = null;
        }
        log.info(msg, schedule, jobId);
        return jobId;
    }
    removeJob(jobId) {
        let success = Scheduler.cancelJob(jobId);
        let msg = 'Successfully removed job';
        if (!success) {
            msg = 'Could not cancel job';
        }
        log.info(msg, jobId);
        return success;
    }
    removeAllJobs(callback) {
        let list = this.listJobs();
        let errList = null;
        for (let jobId in list) {
            let success = this.removeJob(jobId);
            if (!success) {
                let temp = " " + jobId;
                errList += temp;
            }
        }
        callback(errList ? Error("Error removing jobs: " + errList) : null);
    }
    listJobs() {
        return Scheduler.scheduledJobs;
    }
    hasJob(jobId) {
        return this.listJobs().hasOwnProperty(jobId);
    }
    _addJob(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            try {
                let data = JSON.parse(chunk);
                if (!data.schedule || !data.skillData) {
                    return this.sendJson(res, { status: 'error', message: 'could not schedule job because did not specify schedule and/or skill launch data' }, 500);
                }
                let jobId = this.addJob(data.schedule, this._trigger.bind(this, data.skillData));
                if (jobId !== null) {
                    return this.sendJson(res, { status: 'OK', job: jobId });
                }
                else {
                    return this.sendJson(res, { status: 'error', message: 'could not schedule job' }, 500);
                }
            }
            catch (e) {
                log.warn('Scheduler._addJob cannot parse ', chunk);
                this.sendJson(res, { status: 'error', message: 'could not parse json', json: chunk }, 400);
            }
        });
    }
    _trigger(skillData) {
        let parseResults = new jetstream_client_1.types.ListenResult({
            text: '',
            confidence: 1
        }, {
            intent: skillData.intent,
            entities: {
                skill: skillData.skill,
                domain: skillData.domain
            },
            rules: null
        });
        parseResults.match = {
            skillID: skillData.skill,
            onRobot: true
        };
        log.info('Trigger job', skillData);
        GlobalManagerService_1.default.instance.handleSkillLaunch(parseResults);
    }
    _removeJob(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            try {
                let data = JSON.parse(chunk);
                let success = this.removeJob(data.jobId);
                if (success) {
                    return this.sendJson(res, { status: 'OK' });
                }
                this.sendJson(res, { error: 'Error removing job' }, 500);
            }
            catch (e) {
                log.warn('Scheduler._removeJob cannot parse ', chunk);
                this.sendJson(res, { status: 'error', message: 'could not parse json', json: chunk }, 400);
            }
        });
    }
    _listJobs(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            const jobs = this.listJobs();
            this.sendJson(res, { status: 'OK', jobs });
        });
    }
    _hasJob(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            try {
                let data = JSON.parse(chunk);
                if (this.hasJob(data.jobId)) {
                    let list = this.listJobs();
                    return this.sendJson(res, { status: 'OK', jobData: list[data.jobId] });
                }
                else {
                    return this.sendJson(res, { status: 'OK', jobData: null });
                }
            }
            catch (e) {
                console.warn('Scheduler._hasJob cannot parse ', chunk);
                this.sendJson(res, { status: 'error', message: 'could not parse json', json: chunk }, 400);
            }
        });
    }
    _launchShutdownAnimation() {
        this._trigger({
            skill: '@be/settings',
            domain: 'settings',
            intent: 'shutdownAnimation'
        });
    }
}
exports.default = SchedulerService;

},{"../../utils/OTAUpdater":107,"../global-manager/GlobalManagerService":42,"../log":51,"@jibo/jetstream-client":undefined,"jibo-service-clients":undefined,"jibo-service-framework":undefined,"node-schedule":undefined,"uuid":undefined}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connect = require("connect");
const https = require("https");
const Router = require("router");
const events_1 = require("events");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const log_1 = require("../log");
const log = log_1.default.createChild('HTTPSTLSService');
const prify = jibo_cai_utils_1.PromiseUtils.promisify;
class HTTPSTLSService extends events_1.EventEmitter {
    static get _onRobot() {
        let runMode = process.env.runMode || process.env.RUNMODE;
        if (!runMode && process.platform === 'linux' && process.arch === 'arm') {
            runMode = 'ON_ROBOT';
        }
        return runMode === 'ON_ROBOT';
    }
    constructor(name, options) {
        super();
        this.name = name;
        this.options = options;
    }
    init(callback) {
        this.app = connect();
        this.router = new Router();
        this.routes(this.router);
        this.app.use(this.router);
        const httpsOptions = {
            key: this.options.key,
            cert: this.options.cert,
            ca: this.options.ca,
            requestCert: true,
        };
        this.server = https.createServer(httpsOptions, this.app);
        Promise.resolve(this.options.port)
            .then(port => {
            if (this.options.port !== 0 && this.options.port !== port) {
                log.warn(`Requested port ${this.options.port} unavailable; listening on ${port} instead`);
            }
            const hostname = '0.0.0.0';
            return prify(cb => this.server.listen(port, hostname, cb))
                .then(() => {
                this.emit('serverStartup');
                this.port = this.server.address().port;
            })
                .catch(err => {
                log.error(`Can't listen on port ${this.options.port}`, err);
                throw err;
            });
        })
            .then(() => {
            log.info(`${this.name} service listening on port ${this.options.port}`);
            callback();
        })
            .catch(err => callback(err));
    }
    close() {
        this.server.close();
    }
    get port() {
        return this.options.port ? this.options.port : 0;
    }
    set port(value) {
        this.options.port = value;
    }
    routes(url) {
    }
    finish(res, err, data, contentType, statusCode = 200) {
        if (err) {
            const body = err.toString();
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Content-Length', Buffer.byteLength(body).toString());
            res.statusCode =
                !statusCode || statusCode === 200 ? 500 : statusCode;
            return res.end(body);
        }
        if (statusCode === 204 || !data) {
            res.statusCode = 204;
            res.setHeader('Content-Length', '0');
            return res.end();
        }
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        res.setHeader('Content-Length', Buffer.byteLength(data).toString());
        res.statusCode = statusCode < 1 ? 200 : statusCode;
        res.end(data);
    }
    finishNoContent(res, status, err) {
        this.finish(res, err, null, null, 204);
    }
    sendJson(res, json, statusCode = 200) {
        let err;
        if (typeof json !== 'string') {
            try {
                json = JSON.stringify(json);
            }
            catch (e) {
                log.error('JSON.stringify: ', e);
                json = null;
                err = e;
            }
        }
        this.finish(res, err, json, 'application/json', statusCode);
    }
    destroy(callback) {
        if (this.server.listening) {
            this.server.close(callback);
        }
        else {
            if (callback) {
                callback();
            }
        }
    }
}
exports.HTTPSTLSService = HTTPSTLSService;

},{"../log":51,"connect":undefined,"events":undefined,"https":undefined,"jibo-cai-utils":undefined,"router":undefined}],63:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const axios_1 = require("axios");
const jibo_server_1 = require("../../clients/jibo-server");
const jibo_log_1 = require("jibo-log");
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_service_framework_2 = require("jibo-service-framework");
const SecurityServer_1 = require("./SecurityServer");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const log_1 = require("../log");
const log = log_1.default.createChild('SCS');
const EXTERNAL_PORT = 7160;
const INTERNAL_PORT = 8160;
const COMMAND_SOCKET_CONNECTION_TIMEOUT = 60 * 1000;
var DynamicFirewallMode;
(function (DynamicFirewallMode) {
    DynamicFirewallMode["off"] = "off";
    DynamicFirewallMode["remote_operation"] = "remote_operation";
})(DynamicFirewallMode || (DynamicFirewallMode = {}));
var RunMode;
(function (RunMode) {
    RunMode["SIMULATOR"] = "SIMULATOR";
    RunMode["REMOTELY"] = "REMOTELY";
    RunMode["ON_ROBOT"] = "ON_ROBOT";
    RunMode["UNIT_TESTS"] = "UNIT_TESTS";
})(RunMode || (RunMode = {}));
var SCSState;
(function (SCSState) {
    SCSState[SCSState["INITING"] = 0] = "INITING";
    SCSState[SCSState["STOPPED"] = 1] = "STOPPED";
    SCSState[SCSState["STARTING"] = 2] = "STARTING";
    SCSState[SCSState["RUNNING"] = 3] = "RUNNING";
    SCSState[SCSState["STOPPING"] = 4] = "STOPPING";
})(SCSState || (SCSState = {}));
class SecurityControllerService {
    static get instance() {
        return SecurityControllerService._instance;
    }
    constructor(options, rootDir) {
        if (SecurityControllerService._instance) {
            throw new Error('Cannot instantiate SecurityControllerService more than once');
        }
        SecurityControllerService._instance = this;
        log.info('Instantiated');
    }
    init(callback) {
        log.info('Inititalizing');
        if (this.state !== undefined) {
            let err = new Error('SCS init seems to have been called more than once');
            log.error(err);
            return callback(err);
        }
        this.state = SCSState.INITING;
        this._attemptNotificationsDispatcherInit();
        this._setupJSCClients();
        this._closeFirewall(callback);
        log.info('Initialized');
    }
    _attemptNotificationsDispatcherInit() {
        jibo_service_framework_1.NotificationsDispatcher.instance.init((err) => __awaiter(this, void 0, void 0, function* () {
            if (err) {
                log.info('Error initializing NotificationsDispatcher (will try again)', err);
                setTimeout(() => this._attemptNotificationsDispatcherInit(), 500);
            }
            else {
                log.info('NotificationsDispatcher inited.');
                try {
                    yield jibo_log_1.Log.handleLogLevelNotifications(jibo_service_framework_1.NotificationsDispatcher.instance);
                }
                catch (err) {
                    log.error('Failed to set up log level notification handler', err);
                }
                this.state = SCSState.STOPPED;
                log.info('registering for "RomConnectionRequested" notifications');
                jibo_service_framework_1.NotificationsDispatcher.instance.on('RomConnectionRequested', this._handleCommandRequestNotification.bind(this));
                log.info('registering for "CommandRequest" notifications');
                jibo_service_framework_1.NotificationsDispatcher.instance.on('CommandRequest', this._handleCommandRequestNotification.bind(this));
            }
        }));
    }
    _handleCommandRequestNotification(commandRequest) {
        log.warn('CommandRequest notification', commandRequest);
        let url = `http://127.0.0.1:${INTERNAL_PORT}/request`;
        let params = commandRequest;
        if (this.cancelToken) {
            this.cancelToken.cancel();
            this.cancelToken = null;
        }
        this.cancelToken = new jibo_cai_utils_1.CancelTokenSession();
        this.cancelToken.wrap(axios_1.default.post(url, params)).then((res) => __awaiter(this, void 0, void 0, function* () {
            this.cancelToken = null;
            if (!res.data) {
                log.error('empty response from aco to command controller');
                return;
            }
            log.debug('posted aco to command controller and it replied', res.data);
            if (res.data.accept) {
                if (this.state !== SCSState.STOPPED) {
                    this.state = SCSState.STOPPING;
                    this._stopSecurityServer();
                    this.state = SCSState.STOPPED;
                }
                this._callROMSetupServer((err, data) => {
                    if (err) {
                        log.error('error calling ROM#serverSetup, not starting security server');
                    }
                    else {
                        this._startSecurityServer(data.private, data.cert, commandRequest.certFingerprint);
                    }
                });
            }
        }), err => {
            this.cancelToken = null;
            log.error('error posting aco to command controller', err);
        });
    }
    _startSecurityServer(serverPrivateKey, serverCertificate, clientFingerprint) {
        this.state = SCSState.STARTING;
        const securityOptions = {
            port: EXTERNAL_PORT,
            commandControllerPort: INTERNAL_PORT,
            key: serverPrivateKey,
            cert: serverCertificate,
            clientFingerprint,
        };
        this.securityServer = new SecurityServer_1.SecurityServer(securityOptions);
        this.securityServer.on('serverStartup', () => {
            this._openFirewall(() => {
                this.state = SCSState.RUNNING;
            });
        });
        this._startTimeout();
        this.securityServer.on('commandSocketConnected', () => this._clearTimeout());
        this.securityServer.on('commandSocketDisconnected', () => this._closeFirewallStopSecurityServer());
        this.securityServer.on('invalidCertificate', () => this._onInvalidCertificate());
        this.securityServer.init((err) => {
            if (err) {
                log.error('error starting SecurityServer', err);
            }
            else {
                log.info('SecurityServer started on port', this.securityServer.port);
            }
            if (process._getActiveHandles) {
                try {
                    log.info('open socket count is', process._getActiveHandles().length);
                }
                catch (e) {
                }
            }
        });
    }
    _startTimeout() {
        this._clearTimeout();
        this.connectionTimeout = global.setTimeout(() => this._closeFirewallStopSecurityServer(), COMMAND_SOCKET_CONNECTION_TIMEOUT);
    }
    _clearTimeout() {
        if (this.connectionTimeout) {
            global.clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
    _onInvalidCertificate() {
        log.info('invalid certificate, connection rejected');
    }
    _closeFirewallStopSecurityServer() {
        log.debug('_closeFirewallStopSecurityServer');
        this.state = SCSState.STOPPING;
        this._clearTimeout();
        this._closeFirewall();
        this._stopSecurityServer();
        this.state = SCSState.STOPPED;
    }
    _stopSecurityServer() {
        log.debug('_stopSecurityServer');
        this._clearTimeout();
        if (this.securityServer) {
            this.securityServer.shutdown();
            this.securityServer.destroy();
            this.securityServer = null;
            log.info('SecurityServer shut down');
        }
    }
    _callROMSetupServer(callback) {
        let ipAddress = this._getOurIPAddress();
        if (!ipAddress) {
            log.error('could not determine our ip address');
            return;
        }
        log.debug('our ip address is', ipAddress);
        this.jscROMClient.setupServer({ ipAddress }, (err, data) => {
            if (err) {
                log.error('error calling ROM.setupServer()', err);
            }
            callback(err, data);
        });
    }
    get state() {
        return this.__state;
    }
    set state(value) {
        this.__state = value;
        log.debug('state set to', SCSState[this.__state]);
    }
    _getOurIPAddress() {
        let interfaces = os.networkInterfaces();
        let oneInterface;
        if (this._onRobot) {
            oneInterface = interfaces['wlan0'];
        }
        else {
            oneInterface = interfaces['en0'];
        }
        let ipAddress;
        oneInterface.forEach((address) => {
            if (address.family === 'IPv4') {
                ipAddress = address.address;
            }
        });
        return ipAddress;
    }
    _closeFirewall(callback) {
        this._setDynamicFirewallMode(DynamicFirewallMode.off, (err) => {
            log.iferr(err, 'error while closing firewall');
            if (callback) {
                callback(err);
            }
        });
    }
    _openFirewall(callback) {
        this._setDynamicFirewallMode(DynamicFirewallMode.remote_operation, (err) => {
            log.iferr(err, 'error while opening command port on firewall');
            if (callback) {
                callback(err);
            }
        });
    }
    _setDynamicFirewallMode(dynamicFirewallMode, callback) {
        this._setupSystemManagerURL((err) => {
            if (err) {
                if (callback) {
                    callback(err);
                }
                return;
            }
            let url = this.systemManagerURL + '/dynamic_firewall';
            let params = { mode: dynamicFirewallMode };
            axios_1.default.post(url, params).then(res => {
                log.debug('_setDynamicFirewallMode response', res.data);
                if (callback) {
                    callback(null);
                }
            }, err => {
                log.error('error setting dynamic firewall mode to ', dynamicFirewallMode, err);
                if (callback) {
                    callback(err);
                }
            });
        });
    }
    _setupSystemManagerURL(callback) {
        if (this.systemManagerURL) {
            return process.nextTick(callback);
        }
        jibo_service_framework_2.RegistryClient.instance.getRecordByName('system-manager', (err, record) => {
            if (err) {
                let err = new Error('Could not find system-manager in registry.');
                log.error(err);
                return callback(err);
            }
            this.systemManagerURL = `http://127.0.0.1:${record.port}`;
            callback();
        });
    }
    _setupJSCClients() {
        let filename;
        if (this._onRobot) {
            filename = '/var/jibo/credentials.json';
        }
        else {
            filename = path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'credentials.json');
        }
        let credentials;
        try {
            let data = fs.readFileSync(filename, 'utf8');
            credentials = JSON.parse(data);
        }
        catch (e) {
            log.error('could not read/parse credentials file', filename);
        }
        if (credentials) {
            jibo_server_1.JSC.config.update(credentials);
            this.jscROMClient = new jibo_server_1.JSC.ROM();
        }
    }
    get _onRobot() {
        let runMode = process.env.runMode || process.env.RUNMODE;
        if (!runMode && process.platform === 'linux' && process.arch === 'arm') {
            runMode = RunMode.ON_ROBOT;
        }
        return (runMode === RunMode.ON_ROBOT);
    }
}
exports.default = SecurityControllerService;

},{"../../clients/jibo-server":17,"../log":51,"./SecurityServer":64,"axios":undefined,"fs":undefined,"jibo-cai-utils":undefined,"jibo-log":undefined,"jibo-service-framework":undefined,"os":undefined,"path":undefined}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpProxy = require("http-proxy");
const HTTPSTLSService_1 = require("./HTTPSTLSService");
const log_1 = require("../log");
const log = log_1.default.createChild('SecurityServer');
class SecurityServer extends HTTPSTLSService_1.HTTPSTLSService {
    constructor(options) {
        super('security-controller', options);
        this.clientFingerprint = options.clientFingerprint;
        this.commandControllerPort = options.commandControllerPort;
        if (!this.clientFingerprint || !this.commandControllerPort) {
            throw new Error('missing required parameter');
        }
        this.socketSet = new Set();
    }
    init(callback) {
        super.init((err) => {
            if (err) {
                callback(err);
            }
            else {
                this.server.on('secureConnection', this._validateSocket.bind(this));
                this.app.use(this._validateRequest.bind(this));
                this.server.on('upgrade', (req, socket, head) => this._onUpgrade(req, socket, head));
                this.server.on('connection', (socket) => this._trackAllSockets(socket));
                let targetUrl = `http://127.0.0.1:${this.commandControllerPort}`;
                this.proxy = httpProxy.createProxyServer({ target: targetUrl });
                this.proxy.on('close', () => this._webSocketClosed());
                this.proxy.on('proxyReq', (proxyReq, req, res, options) => {
                    this._trackAllSockets(proxyReq.socket);
                    this._trackAllSockets(req.socket);
                });
                this.proxy.on('proxyReqWs', (proxyReqWs, req, res, options) => {
                    this._trackAllSockets(req.socket);
                });
                this.proxy.on('error', (err, req, res) => {
                    log.error('error on proxy connection', err);
                });
                callback();
            }
        });
    }
    shutdown() {
        this.removeAllListeners();
        this.destroyAllSockets();
    }
    destroyAllSockets() {
        this.socketSet.forEach((connection) => {
            connection.end();
            connection.destroy();
        });
        this.socketSet.clear();
    }
    destroy() {
        super.destroy();
    }
    routes(url) {
        url.get('/assets/*', (req, res) => this._proxySideChannel(req, res));
    }
    _proxySideChannel(req, res) {
        if (this.commandConnected) {
            this.proxy.web(req, res);
        }
        else {
            res.errorCode = 403;
            res.end();
        }
    }
    _onUpgrade(req, socket, head) {
        if (req.url === '/') {
            if (!this.commandConnected) {
                this.proxy.ws(req, socket, head);
                this.commandConnected = true;
                this.emit('commandSocketConnected');
                socket.on('close', () => this._webSocketClosed());
                socket.on('error', () => this._webSocketClosed());
            }
            else {
                socket.destroy();
            }
        }
        else {
            socket.destroy();
        }
    }
    _trackAllSockets(socket) {
        this.socketSet.add(socket);
        const removeSocket = () => {
            log.debug('removing socket from set');
            this.socketSet.delete(socket);
            log.debug('socket removed');
        };
        socket.on('close', removeSocket);
        socket.on('error', removeSocket);
    }
    _webSocketClosed() {
        this.commandConnected = false;
        this.emit('commandSocketDisconnected');
    }
    _validateSocket(socket) {
        let clientCert = this._getCertificate(socket);
        if (!this._validateCertificate(clientCert)) {
            log.warn('rejecting this tls connection');
            socket.destroy();
            this.emit('invalidCertificate');
        }
    }
    _validateRequest(req, res, next) {
        let clientCert = this._getCertificate(req.socket);
        if (!this._validateCertificate(clientCert)) {
            log.warn('rejecting this http connection');
            next(new Error('client certificate did not validate'));
            this.emit('invalidCertificate');
        }
        else {
            next();
        }
    }
    _validateCertificate(clientCert) {
        if (!clientCert) {
            log.warn('client certificate not provided');
            return false;
        }
        if (!clientCert.fingerprint) {
            log.warn('problem checking client fingerprint');
            return false;
        }
        if (clientCert.fingerprint.toUpperCase() !== this.clientFingerprint.toUpperCase()) {
            log.warn('client certificate mismatch');
            return false;
        }
        return true;
    }
    _getCertificate(socket) {
        let clientCert = socket.getPeerCertificate();
        if (Object.keys(clientCert).length === 0) {
            clientCert = null;
        }
        return clientCert;
    }
}
exports.SecurityServer = SecurityServer;

},{"../log":51,"./HTTPSTLSService":62,"http-proxy":undefined}],65:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const DevToolsClient_1 = require("../../clients/DevToolsClient");
const DevShellClient_1 = require("../../clients/DevShellClient");
const GlobalManagerService_1 = require("../global-manager/GlobalManagerService");
const log_1 = require("../log");
const PerformanceService_1 = require("../performance/PerformanceService");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const ScreenScheduler_1 = require("../../background/screen/ScreenScheduler");
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_client_framework_1 = require("jibo-client-framework");
const async = require("async");
const findRoot = require("find-root");
const fs = require("fs");
const parallel = require("async-parallel");
const path = require("path");
const rimraf = require("rimraf");
const jetstream_client_1 = require("@jibo/jetstream-client");
const log = log_1.default.createChild('Skills');
const prfyTo = jibo_cai_utils_1.PromiseUtils.promisifyTo;
class SkillsService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('skills-service', options, rootDir);
        this.options = options;
        if (SkillsService._instance) {
            throw new Error('Cannot instantiate SkillsService more than once');
        }
        SkillsService._instance = this;
        log.info("Instantiated");
    }
    static get instance() {
        return SkillsService._instance;
    }
    init(callback) {
        super.init((error) => {
            if (error) {
                return callback(error);
            }
            ScreenScheduler_1.default.stopTimerAndTurnOn().then(() => {
                this.terminate((error) => {
                    if (error) {
                        log.warn(`Could not terminate running skill`, error);
                    }
                    if (!this.options.startSkill) {
                        log.info('initialized');
                        return callback();
                    }
                    if (this.options.singleSkill) {
                        log.warn("SSM operating in single skill mode");
                        jibo_client_framework_1.SystemManagerClient.instance.getSkillRecordByName(this.options.startSkill, (error, skillRecord) => {
                            if (error) {
                                return callback(error);
                            }
                            if (!skillRecord) {
                                return callback(new Error(`Skill ${this.options.startSkill} not found`));
                            }
                            this.launch(this.options.startSkill, {}, callback);
                        });
                    }
                });
            });
        });
    }
    routes(url) {
        super.routes(url);
        url.get('/skill/list', (req, res) => {
            jibo_client_framework_1.SystemManagerClient.instance.list((error, skills) => {
                if (error) {
                    return this.sendJson(res, { error: error.message }, 500);
                }
                this.sendJson(res, { skills: skills });
            });
        });
        url.get('/devtools', (req, res) => {
            DevToolsClient_1.default.createInstance('127.0.0.1', 9191).getJson((err, json) => {
                this.sendJson(res, json);
            });
        });
        url.get('/ssm-devtools', (req, res) => {
            jibo_client_framework_1.SystemManagerClient.instance.getMode((error, mode) => {
                if (error) {
                    this.sendJson(res, { error: error.message }, 500);
                    log.error('Error getting mode to determine if we should enable the SSM dev-tools proxy', error);
                    return;
                }
                if (mode === 'int-developer') {
                    DevToolsClient_1.default.createInstance('127.0.0.1', 12345).getJson((err, json) => {
                        this.sendJson(res, json);
                    });
                }
                else {
                    this.sendJson(res, { error: 'Not found' }, 404);
                    return;
                }
            });
        });
        url.get('/version', (req, res) => {
            const root = findRoot(__dirname);
            const packageInfo = require(path.join(root, 'package.json'));
            this.sendJson(res, { version: packageInfo.version });
        });
        url.post('/launch-dev', (req, res) => {
            let chunk = "";
            req.on('data', (data) => {
                chunk += (data);
            });
            req.on('end', () => {
                let data;
                try {
                    data = JSON.parse(chunk);
                }
                catch (e) {
                    this.sendJson(res, {
                        Status: 'ERROR',
                        Message: 'Invalid request from launch. Request body is not valid JSON'
                    }, 200);
                    return;
                }
                log.info('attempting to run skill', data.command);
                this.launch(data.command, {}, (error) => {
                    if (error) {
                        log.error('error running skill', data.command, error);
                        this.sendJson(res, {
                            Status: 'ERROR',
                            Message: 'Skill "' + data.command + '" does not exist or could not be launched. Make sure to run `jibo sync`'
                        }, 200);
                    }
                    else {
                        log.info('System Manager launched skill', data.command);
                        this.sendJson(res, {
                            Status: 'OK',
                            Message: 'Skill "' + data.command + '" started successfully'
                        }, 200);
                    }
                });
            });
        });
        url.get('/mode', (req, res) => {
            jibo_client_framework_1.SystemManagerClient.instance.getMode((error, mode) => {
                if (error) {
                    return this.sendJson(res, { error: error.message }, 500);
                }
                this.sendJson(res, { mode, electron: !!global['window'] });
            });
        });
        url.post('/terminate', (req, res) => {
            let chunk = "";
            req.on('data', (data) => {
                chunk += (data);
            });
            req.on('end', () => {
                let data;
                try {
                    data = JSON.parse(chunk);
                }
                catch (e) {
                    this.sendJson(res, {
                        Status: 'ERROR',
                        Message: 'Invalid request from launch. Request body is not valid JSON'
                    }, 200);
                    return;
                }
                jibo_client_framework_1.SystemManagerClient.instance.terminate(data.command, (error) => {
                    log.info('screen scheduler timer: skills service post terminate');
                    this.emit('show');
                    ScreenScheduler_1.default.start();
                    this.currentSkill = null;
                    this.finishNoContent(res);
                });
            });
        });
        url.post('/reset-proxy/:serverPort', (req, res) => {
            let serverPort = req.params.serverPort;
            DevShellClient_1.default.createInstance('127.0.0.1', 8686).resetProxy(serverPort, (err) => {
                this.finishNoContent(res);
            });
        });
    }
    launch(skillName, parse, callback) {
        PerformanceService_1.default.instance.log(Date.now(), 'JiboLaunch');
        const launch = (skill) => {
            this.currentSkill = skill;
            jibo_client_framework_1.SystemManagerClient.instance.launch(skill.name, (error) => {
                if (error) {
                    log.error('Unable to reset NLU memory', error);
                    return callback(error);
                }
                ScreenScheduler_1.default.stopTimerAndTurnOn().then(() => {
                    callback();
                }).catch((error) => {
                    callback(error);
                });
            });
        };
        log.info(`Launching skill, getting skill record from SystemManager`);
        jibo_client_framework_1.SystemManagerClient.instance.getSkillRecordByName(skillName, (error, skill) => {
            PerformanceService_1.default.instance.log(Date.now(), 'JiboLaunchGetSkillRecordByName');
            if (error) {
                log.error(`During launch(), failed to get skill record`, error);
                return callback(error);
            }
            log.info(`During launch(), got skill record for ${skillName}`);
            if (this.currentSkill) {
                log.info(`Going to launch ${skillName} but need to terminate ${this.currentSkill.name} first`);
                jibo_client_framework_1.SystemManagerClient.instance.terminate(this.currentSkill.name, (error) => {
                    PerformanceService_1.default.instance.log(Date.now(), 'JiboLaunchTerminateCurrentSkill');
                    if (error) {
                        log.warn('error terminating current skill', this.currentSkill, error);
                    }
                    launch(skill);
                });
            }
            else {
                launch(skill);
            }
        });
    }
    terminate(callback) {
        if (this.currentSkill) {
            return jibo_client_framework_1.SystemManagerClient.instance.terminate(this.currentSkill.name, (err) => {
                if (err) {
                    log.warn('Error terminating skills', err);
                }
                this.currentSkill = null;
                this._doneTerminate(err, callback);
            });
        }
        jibo_client_framework_1.SystemManagerClient.instance.list((err, skills) => {
            if (err) {
                return callback(err);
            }
            const runningSkills = skills.filter(skill => skill.running);
            async.each(runningSkills, (skill, done) => {
                log.info(`Terminating unknown, running skill ${skill.name}`);
                jibo_client_framework_1.SystemManagerClient.instance.terminate(skill.name, done);
            }, err => {
                if (err) {
                    log.warn('Error terminating skills', err);
                }
                this._doneTerminate(err, callback);
            });
        });
    }
    onMessage(command, client) {
        if (command.command === 'initDone') {
            log.info(this.currentSkill.name, 'launched and initialized');
            this.emit('hide');
            this.sendWsJson(client, {
                command: 'show'
            });
        }
        else if (command.command === 'finished') {
            if (this.currentSkill.name === '@be/be') {
                const relaunchResults = new jetstream_client_1.types.ListenResult(null, null, {
                    skillID: '@be/idle',
                    onRobot: true
                });
                GlobalManagerService_1.default.instance.handleSkillLaunch(relaunchResults);
            }
        }
    }
    onWipeRequest(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let errors = false;
            const [homeDirErr, homeFileNames] = yield prfyTo(cb => fs.readdir('/opt/home', cb));
            const homeFiles = homeFileNames.map(file => path.join('/opt/home', file));
            if (homeDirErr) {
                res.statusCode = 500;
                const message = 'Error reading list of home directories';
                log.error(message, homeDirErr);
                return res.end(message);
            }
            const homeDirs = yield parallel.filter(homeFiles, (file) => __awaiter(this, void 0, void 0, function* () {
                const [statsErr, stats] = yield prfyTo(cb => fs.stat(file, cb));
                if (statsErr) {
                    log.warn(`Error getting stats for ${file}`, statsErr);
                    errors = true;
                    return false;
                }
                return stats.isDirectory();
            }));
            yield parallel.each(homeDirs, (homeDir) => __awaiter(this, void 0, void 0, function* () {
                const [filesErr, fileNames] = yield prfyTo(cb => fs.readdir(homeDir, cb));
                const files = fileNames.map(file => path.join(homeDir, file));
                if (filesErr) {
                    res.statusCode = 500;
                    const message = `Error reading list of files in ${homeDir}`;
                    log.warn(message, filesErr);
                    errors = true;
                    return;
                }
                yield parallel.each(files, (file) => __awaiter(this, void 0, void 0, function* () {
                    const [rmErr] = yield prfyTo(cb => rimraf(file, cb));
                    if (rmErr) {
                        log.warn(`Error removing ${file}`, rmErr);
                        errors = true;
                    }
                }), 2);
            }), 1);
            log.info(`Wiped contents of home directories, with${errors ? '' : 'out'} errors.`);
            res.writeHead(204, null, { 'Content-Length': '0' });
            res.end();
        });
    }
    _doneTerminate(err, callback) {
        log.info('screen scheduler timer: skills service class api');
        ScreenScheduler_1.default.start();
        this.emit('show');
        callback(err);
    }
}
exports.default = SkillsService;

},{"../../background/screen/ScreenScheduler":10,"../../clients/DevShellClient":12,"../../clients/DevToolsClient":13,"../global-manager/GlobalManagerService":42,"../log":51,"../performance/PerformanceService":54,"@jibo/jetstream-client":undefined,"async":undefined,"async-parallel":undefined,"find-root":undefined,"fs":undefined,"jibo-cai-utils":undefined,"jibo-client-framework":undefined,"jibo-service-framework":undefined,"path":undefined,"rimraf":undefined}],66:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ActiveScan_1 = require("./scanning/ActiveScan");
const ErrorCode_1 = require("./scanning/ErrorCode");
const ErrorService_1 = require("../error/ErrorService");
const NetworkManager_1 = require("./scanning/NetworkManager");
const log_1 = require("./log");
const StatusHandler_1 = require("./scanning/StatusHandler");
const jibo_client_framework_1 = require("jibo-client-framework");
const https = require("https");
const fs = require("fs");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const promisify = jibo_cai_utils_1.PromiseUtils.promisify;
const log = log_1.default.createChild("WiFiManager");
const TEST_JIBO_SERVER = false;
const SAVED_INTERFACE_PATH = '/var/etc/networks.conf';
const STATUS_INTERVAL = 1000;
const VERIFY_DELAY = 15000;
const FAILED_VERIFY_INTERVAL = 10000;
const NO_INTERNET_ERROR = 'Q4-Server_connection_lost';
const NO_WIFI_ERROR = 'Q1-Lost_Wi-Fi_connection';
const SERVER_SERVICE_ERROR = 'L2-Cannot_connect_to_server';
const BG_SCAN_SETTINGS = {
    Aggressive: [15, -45, 100],
    Medium: [30, -75, 120],
    Relaxed: [60, -95, 300]
};
const AA_SCAN_SETTINGS = {
    Aggressive: 5,
    Medium: 10,
    Relaxed: 20
};
class WiFiManager {
    constructor(_wifiService) {
        this.inProgress = false;
        this.networkManager = new NetworkManager_1.default();
        this.statusHandler = new StatusHandler_1.default();
        this.activeScan = new ActiveScan_1.default();
        this.tempNetworks = null;
        this.scanData = null;
        this.connecting = false;
        this.connected = false;
        this._wifiService = _wifiService;
        this.syncedTime = false;
        this._jiboServerUrl = 'google.com';
        this.serviceSocket = null;
        this.nextVerify = null;
    }
    init(cb) {
        const sm = jibo_client_framework_1.SystemManagerClient.instance;
        const socketUrl = `ws:${sm.host}:${sm.port}/wifi/messages`;
        this.serviceSocket = new jibo_client_framework_1.WSClient(socketUrl);
        this.serviceSocket.on('error', (err) => {
            log.warn("error connecting to /wifi/messages socket", err);
        });
        this.serviceSocket.on('message', (message) => {
            log.debug('Message from /wifi/messages socket', message.message);
            this.activeScan.handleWSMessage(message.message);
            this.statusHandler.handleWSMessage(message.message);
        });
        sm.getCredentials((err, data) => {
            log.info("Internet verification url is " + this._jiboServerUrl);
            const settings = BG_SCAN_SETTINGS.Medium;
            jibo_client_framework_1.SystemManagerClient.instance.bgScan(settings[0], settings[1], settings[2], (err) => {
                if (err) {
                    log.warn('Error setting bg scan:', err);
                }
                this.activeScan.listen(AA_SCAN_SETTINGS.Relaxed, this.scanResultsCB.bind(this));
            });
            this.statusListen(2500);
            let errSvc = ErrorService_1.default.instance;
            if (errSvc.errorExists(NO_WIFI_ERROR) && errSvc.errorExists(NO_INTERNET_ERROR) && errSvc.errorExists(SERVER_SERVICE_ERROR)) {
                errSvc.addErrorAddedListener(SERVER_SERVICE_ERROR, this._verifyServerError.bind(this));
                errSvc.addErrorRemovedListener(SERVER_SERVICE_ERROR, this._resolveServerError.bind(this));
                cb();
            }
            else {
                cb(new Error('Required WiFi Error Codes not found!'));
            }
        });
    }
    addNetwork() {
        this.connecting = true;
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.addNetwork(cb));
    }
    removeNetwork(networkId, ssid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.removeNetwork(networkId, cb));
            yield this._removeInterfaceSetting(ssid);
            yield promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.saveConfig(cb));
        });
    }
    disconnect() {
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.disconnect(cb));
    }
    getScanResults() {
        return this.activeScan.scanResults();
    }
    pollStats() {
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.signalPoll(cb));
    }
    scan() {
        return this.activeScan.scan();
    }
    getSavedNetworks() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.networkManager.getNetworks();
            let networkArray = [];
            const networks = data.split('\n');
            for (let i = 0; i < networks.length; ++i) {
                let data = networks[i].split('\t');
                const _network = data[1];
                if (_network) {
                    const _index = data[0];
                    const _current = (data[3] === '[CURRENT]');
                    const _enabled = (!data[3].includes('[DISABLED]'));
                    networkArray.push({
                        index: _index,
                        ssid: _network,
                        current: _current,
                        enabled: _enabled
                    });
                }
            }
            return networkArray;
        });
    }
    selectNetwork(networkID, networkData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!networkData) {
                const networkData = yield this.getSavedNetworks();
                const foundNetwork = networkData.find((item) => item.index === networkID);
                if (!foundNetwork) {
                    return Promise.reject(new Error('Network not found'));
                }
                const data = yield this._getInterfaceSettings(foundNetwork.ssid);
                if (data) {
                    try {
                        yield this._configureNetworkSettings(NetworkType.STATIC, data);
                    }
                    catch (error) {
                        yield this._removeInterfaceSetting(networkID);
                        return Promise.reject(error);
                    }
                    yield this.adjustStatusPolling(networkID);
                    return "success";
                }
                else {
                    yield this._configureNetworkSettings(NetworkType.DHCP, null);
                    yield this.adjustStatusPolling(networkID);
                    return 'success';
                }
            }
            else {
                try {
                    yield this._saveInterfaceSettings(networkData);
                }
                catch (e) {
                    log.error("Save Interface Settings Failure");
                    return Promise.reject(e);
                }
                if (networkData.networkType === NetworkType.DHCP) {
                    try {
                        yield this._configureNetworkSettings(NetworkType.DHCP, null);
                    }
                    catch (error) {
                        log.error("DHCP Failure Settings!");
                        return Promise.reject(error);
                    }
                    yield this.adjustStatusPolling(networkID);
                    return 'success';
                }
                else if (networkData.networkType === NetworkType.STATIC) {
                    log.info("Setting network as a static network!");
                    const data = yield this.getSavedNetworks();
                    const foundNetwork = data.some((item) => item.ssid === networkData.ssid);
                    if (foundNetwork) {
                        try {
                            yield this._configureNetworkSettings(NetworkType.STATIC, networkData.staticSettings);
                        }
                        catch (error) {
                            yield this._removeInterfaceSetting(networkData.ssid);
                            return Promise.reject(error);
                        }
                        yield this.adjustStatusPolling(networkID);
                        return 'success';
                    }
                    else {
                        return Promise.reject(new Error("Could not select network " + networkData.ssid));
                    }
                }
            }
        });
    }
    verifyConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.nextVerify) {
                clearTimeout(this.nextVerify);
                this.nextVerify = null;
            }
            let data;
            try {
                data = yield this.status();
            }
            catch (err) {
                return new ErrorCode_1.default(666, "BAD THINGS ARE HAPPENING: " + err);
            }
            if (data.indexOf('COMPLETED') === -1) {
                return new ErrorCode_1.default(1, "Did not connect to the Access Point");
            }
            if (data.indexOf('ip_address=') === -1) {
                return new ErrorCode_1.default(2, "Could Not Obtain IP Address");
            }
            if (TEST_JIBO_SERVER) {
                try {
                    yield this._checkJiboServers();
                }
                catch (err) {
                    log.debug("VerifyConnection #3 (Jibo Servers): " + err);
                    this._wifiService.emit("internet-disconnected");
                    ErrorService_1.default.instance.addError(NO_INTERNET_ERROR);
                    if (!this.nextVerify) {
                        this.nextVerify = setTimeout(() => this.verifyConnection(), FAILED_VERIFY_INTERVAL);
                    }
                    return new ErrorCode_1.default(4, "Cannot Ping Jibo Servers");
                }
                log.debug("VerifyConnection #3 (Jibo Servers): OK");
                this._wifiService.emit("internet-connected");
                ErrorService_1.default.instance.removeError(NO_INTERNET_ERROR);
                if (this.nextVerify) {
                    clearTimeout(this.nextVerify);
                    this.nextVerify = null;
                }
                return null;
            }
            else {
                return null;
            }
        });
    }
    setNetwork(networkId, options) {
        let cmd;
        if (options.ssid) {
            cmd = networkId + " ssid " + '\"' + options.ssid + '\"';
        }
        else if (options.hidden) {
            cmd = networkId + " scan_ssid 1";
        }
        else if (options.psk) {
            cmd = networkId + " psk " + '\"' + options.psk + '\"';
        }
        else if (options.security) {
            switch (options.security) {
                case ('WPA-PSK'):
                    cmd = networkId + " key_mgmt WPA-PSK";
                    break;
                case ('WPA2-PSK'):
                    cmd = networkId + " key_mgmt WPA-PSK";
                    break;
                case ('OPEN'):
                    cmd = networkId + " key_mgmt NONE";
                    break;
            }
        }
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.setNetwork(cmd, cb));
    }
    status() {
        return this.statusHandler.status();
    }
    statusListen(interval) {
        this.statusHandler.listen(interval, this.statusCB.bind(this));
    }
    networkProfiles() {
        return this.networkManager.getContainer();
    }
    saveNetwork(networkID) {
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.saveConfig(cb));
    }
    adjustStatusPolling(networkID) {
        return __awaiter(this, void 0, void 0, function* () {
            this.connecting = true;
            this.statusListen(STATUS_INTERVAL);
            yield promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.selectNetwork(networkID, cb));
            yield promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.enableNetwork(networkID, cb));
        });
    }
    _isInterfaceEqual(lhs, rhs) {
        return (lhs.method === rhs.method) &&
            (lhs.address === rhs.address) &&
            (lhs.network === rhs.network) &&
            (lhs.netmask === rhs.netmask) &&
            (lhs.broadcast === rhs.broadcast) &&
            (lhs.gateway === rhs.gateway) &&
            (lhs.dns === rhs.dns);
    }
    _getDNSString(staticSettings) {
        let dnsStr = "";
        if (staticSettings) {
            if (staticSettings.dns1) {
                dnsStr += staticSettings.dns1;
            }
            if (staticSettings.dns2) {
                if (staticSettings.dns1) {
                    dnsStr += " ";
                }
                dnsStr += staticSettings.dns2;
            }
        }
        return dnsStr;
    }
    _configureNetworkSettings(type, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            let typeStr = (type === NetworkType.DHCP ? "dhcp" : "static");
            const currentInterface = yield promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.getInterface(cb));
            let newInterface = {
                method: typeStr,
                address: (settings ? settings.staticIP : ""),
                network: "",
                netmask: (settings ? settings.netmask : ""),
                broadcast: "",
                gateway: (settings ? settings.gateway : ""),
                dns: this._getDNSString(settings)
            };
            if (!this._isInterfaceEqual(currentInterface, newInterface)) {
                try {
                    const msg = yield this._setInterface(typeStr, settings);
                    return "Network settings updated. [" + msg + "]";
                }
                catch (error) {
                    log.error("setInterface error; reverting to dhcp", error);
                    yield this._setInterface("dhcp", null);
                    throw error;
                }
            }
            else {
                return "Network settings are the same. Do not need to update.";
            }
        });
    }
    _setInterface(_type, staticSettings) {
        let dnsStr = this._getDNSString(staticSettings);
        let interfaceData = {
            method: _type,
            address: (staticSettings ? staticSettings.staticIP : ""),
            network: "",
            netmask: (staticSettings ? staticSettings.netmask : ""),
            broadcast: "",
            gateway: (staticSettings ? staticSettings.gateway : ""),
            dns: dnsStr
        };
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.setInterface(interfaceData, cb));
    }
    _saveInterfaceSettings(networkData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (networkData.staticSettings && networkData.staticSettings.staticIP) {
                let data = {};
                if (fs.existsSync(SAVED_INTERFACE_PATH)) {
                    data = JSON.parse(fs.readFileSync(SAVED_INTERFACE_PATH, 'utf8'));
                }
                data[networkData.ssid] = {
                    staticIP: networkData.staticSettings.staticIP,
                    gateway: networkData.staticSettings.gateway,
                    netmask: networkData.staticSettings.netmask,
                    dns1: networkData.staticSettings.dns1,
                    dns2: networkData.staticSettings.dns2
                };
                yield promisify((cb) => fs.writeFile(SAVED_INTERFACE_PATH, JSON.stringify(data), 'utf8', cb));
            }
            else {
            }
        });
    }
    _getInterfaceSettings(ssid) {
        return new Promise((resolve, reject) => {
            fs.readFile(SAVED_INTERFACE_PATH, 'utf8', (err, strData) => {
                if (err) {
                    return resolve(null);
                }
                try {
                    let data = JSON.parse(strData);
                    if (data.hasOwnProperty(ssid)) {
                        resolve(data[ssid]);
                    }
                    else {
                        resolve(null);
                    }
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    _removeInterfaceSetting(ssid) {
        return new Promise((resolve, reject) => {
            fs.readFile(SAVED_INTERFACE_PATH, 'utf8', (err, strData) => {
                if (err) {
                    return resolve();
                }
                try {
                    let data = JSON.parse(strData);
                    if (data.hasOwnProperty(ssid)) {
                        delete data[ssid];
                        fs.writeFile(SAVED_INTERFACE_PATH, JSON.stringify(data), 'utf8', (err) => {
                            return err ? reject(err) : resolve();
                        });
                    }
                    else {
                        resolve();
                    }
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    scanResultsCB(data) {
        if (data && (data.split('\n').length > 2)) {
            if (!this.connecting && !this.connected && !this.inProgress) {
                this._wifiService.sendSocketData('scan_results_populated', data);
            }
        }
        else {
            log.info('scanResultsCB() - data not long enough: ', data);
        }
    }
    statusCB(state) {
        this.connected = (state === StatusHandler_1.WIFI_STATES.CONNECTED);
        if (this.connected) {
            ErrorService_1.default.instance.removeError(NO_WIFI_ERROR);
        }
        else {
            setTimeout(() => {
                if (!this.connected) {
                    ErrorService_1.default.instance.addError(NO_WIFI_ERROR);
                }
            }, StatusHandler_1.INTERVAL_DISCONNECTED + 1000);
        }
        this.connecting = false;
        if (!this.inProgress) {
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                const err = yield this.verifyConnection();
                if (err) {
                    this._wifiService.sendError(err);
                    this.connected = false;
                }
            }), VERIFY_DELAY);
        }
    }
    _checkJiboServers() {
        return new Promise((resolve, reject) => {
            if (!this._jiboServerUrl) {
                return reject("Do not have a jibo server url to check!");
            }
            let options = {
                host: this._jiboServerUrl,
                path: '/'
            };
            let req = https.get(options, (res) => {
                let temp = '';
                res.on('data', function (chunk) {
                    temp += chunk;
                }).on('error', function (e) {
                    reject(e.message);
                }).on('end', function () {
                    resolve();
                });
            });
            req.on('error', (e) => {
                if (!this.syncedTime) {
                    log.info("Attempting to sync time...");
                    jibo_client_framework_1.SystemManagerClient.instance.syncTime((error) => {
                        if (!error) {
                            this.syncedTime = true;
                        }
                        reject(e);
                    });
                }
                else {
                    reject(e);
                }
            });
            req.on('socket', function (socket) {
                socket.setTimeout(15000);
                socket.on('timeout', function () {
                    req.abort();
                });
            });
        });
    }
    _verifyServerError() {
        this.verifyConnection().catch((err) => {
            log.info('Completed connection verification on ServerService connectivity loss ', err);
        });
    }
    _resolveServerError() {
        ErrorService_1.default.instance.removeError(NO_INTERNET_ERROR);
    }
}
var NetworkType;
(function (NetworkType) {
    NetworkType[NetworkType["DHCP"] = 0] = "DHCP";
    NetworkType[NetworkType["STATIC"] = 1] = "STATIC";
})(NetworkType = exports.NetworkType || (exports.NetworkType = {}));
exports.default = WiFiManager;

},{"../error/ErrorService":28,"./log":68,"./scanning/ActiveScan":69,"./scanning/ErrorCode":70,"./scanning/NetworkManager":72,"./scanning/StatusHandler":74,"fs":undefined,"https":undefined,"jibo-cai-utils":undefined,"jibo-client-framework":undefined}],67:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const WifiManager_1 = require("./WifiManager");
const ErrorCode_1 = require("./scanning/ErrorCode");
const RunMode_1 = require("../../utils/RunMode");
const jibo_client_framework_1 = require("jibo-client-framework");
const IFconfigService_1 = require("./stats/IFconfigService");
const PingService_1 = require("./stats/PingService");
const SpeedTestService_1 = require("./stats/SpeedTestService");
const log_1 = require("./log");
const fs = require("fs");
let startVerifyTime = 0;
const corruptPacketCounterFilePath = '/sys/kernel/debug/ieee80211/phy0/wlcore/corrupted_packets';
const reassociationThrottleTime = 15000;
class WifiService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('wifi', options, rootDir);
        this.options = options;
        if (WifiService._instance) {
            throw new Error('Cannot instantiate WifiService more than once');
        }
        WifiService._instance = this;
        this._wifiMgr = new WifiManager_1.default(this);
        this._eventSocket = null;
        this._lastReassociationTime = null;
        log_1.default.info('Instantiated');
    }
    static get instance() {
        return WifiService._instance;
    }
    init(callback) {
        super.init((error) => {
            if (error) {
                return callback(error);
            }
            if (RunMode_1.default.runMode === RunMode_1.default.RunMode.ON_ROBOT) {
                this._monitorWifiErrorSysLog();
            }
            this._wifiMgr.init(err => {
                if (err) {
                    log_1.default.error('Error initializing WiFiManager', err);
                }
                else {
                    log_1.default.info('Initialized');
                }
                if (!this._pingService) {
                    this._pingService = new PingService_1.PingService();
                }
                if (!this._ifconfigService) {
                    this._ifconfigService = new IFconfigService_1.IFconfigService();
                }
                if (!this._speedTestService) {
                    this._speedTestService = new SpeedTestService_1.SpeedTestService();
                }
                callback();
            });
        });
    }
    routes(url) {
        super.routes(url);
        url.post('/remove_all', (req, res) => {
            this._onRemoveAll(req, res);
        });
        url.post('/remove_network', (req, res) => {
            this._onRemoveNetwork(req, res);
        });
        url.post('/select_network', (req, res) => {
            this._onSelectNetwork(req, res);
        });
        url.post('/add_network', (req, res) => {
            this._onAddNetwork(req, res);
        });
        url.post('/get_current_network', (req, res) => {
            this._onGetCurrentNetwork(req, res);
        });
        url.post('/get_saved_networks', (req, res) => {
            this._onGetSavedNetworks(req, res);
        });
        url.post('/verify_connection', (req, res) => {
            this._onVerifyConnection(req, res);
        });
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        if (client.url === '/wifi_events') {
            this._eventSocket = client;
        }
    }
    onClose(client) {
        if (client === this._eventSocket) {
            this._eventSocket = undefined;
        }
    }
    onMessage(command, client) {
        return;
    }
    sendSocketData(_eventName, _data) {
        if (this._eventSocket) {
            let socketData = {
                eventName: _eventName,
                data: _data
            };
            this.sendWsJson(this._eventSocket, socketData);
        }
    }
    sendError(_data) {
        this.sendSocketData("error", _data);
        log_1.default.warn("error:", _data);
    }
    verifyConnection() {
        return this._wifiMgr.verifyConnection();
    }
    getScanResults() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._wifiMgr.scan();
            }
            catch (err) {
                return Promise.reject(new Error("Error scanning: " + err));
            }
            let data;
            try {
                data = yield this._wifiMgr.getScanResults();
            }
            catch (err) {
                return Promise.reject(new Error("Error scanning results:" + err));
            }
            let results = data.split('\n');
            if (results.length > 1) {
                results.shift();
                for (let i = results.length - 1; i >= 0; --i) {
                    if (!results[i]) {
                        results.pop();
                    }
                    else {
                        break;
                    }
                }
                return results;
            }
            else {
                return [];
            }
        });
    }
    getCurrentNetwork() {
        return __awaiter(this, void 0, void 0, function* () {
            const statsData = yield this._wifiMgr.status();
            let stats = {
                ssid: '',
                strength: 0,
                speed: 0,
                ip_address: ''
            };
            if (statsData.indexOf('wpa_state=COMPLETED') > -1) {
                let splitData = statsData.split('\n');
                let len = splitData.length;
                for (let i = 0; i < len; i++) {
                    if (splitData[i].indexOf('ssid=') > -1) {
                        stats.ssid = splitData[i].split('=')[1];
                    }
                    else if (splitData[i].indexOf('ip_address=') > -1) {
                        stats.ip_address = splitData[i].split('=')[1];
                    }
                }
                const pollData = yield this._wifiMgr.pollStats();
                splitData = pollData.split('\n');
                let rssi = null;
                len = splitData.length;
                for (let i = 0; i < len; i++) {
                    if (splitData[i].indexOf('RSSI') > -1) {
                        if (!rssi) {
                            rssi = parseInt(splitData[i].split('=')[1]);
                        }
                    }
                    else if (splitData[i].indexOf('AVG_RSSI') > -1) {
                        rssi = parseInt(splitData[i].split('=')[1]);
                    }
                    else if (splitData[i].indexOf('LINKSPEED') > -1) {
                        stats.speed = parseInt(splitData[i].split('=')[1]);
                    }
                }
                if (rssi) {
                    if (rssi > -50) {
                        stats.strength = 100;
                    }
                    else {
                        stats.strength = (rssi + 100) * 2;
                    }
                }
                return stats;
            }
            else {
                throw new Error("Not Connected");
            }
        });
    }
    onHealth(req, res) {
        let data = {
            ssid: null,
            strength: null,
            speed: null,
            ip_address: null,
            error: null,
            ping: undefined,
            config: undefined,
            speedtest: undefined,
        };
        const tm_max = (30 - 1) * 1000;
        const timeout = (promise, tm) => {
            return Promise.race([
                new Promise((res, rej) => setTimeout(() => rej(`Timeout after: ${tm}ms`), tm)),
                promise
            ]);
        };
        Promise.all([
            timeout(this._pingService.gatherResults(), tm_max)
                .then(val => data.ping = val)
                .catch(err => data.ping = err),
            timeout(this._ifconfigService.gatherResults(), tm_max)
                .then(val => data.config = val)
                .catch(err => data.config = err),
            timeout(this._speedTestService.gatherResults(), tm_max)
                .then(val => data.speedtest = val)
                .catch(err => data.speedtest = err),
            timeout(this.getCurrentNetwork(), tm_max)
                .then((netStats) => Object.assign(data, netStats))
                .catch((err) => data.error = err.message)
        ]).then(vals => {
            log_1.default.debug('resolving onHealth');
            this.sendJson(res, data, 200);
        }).catch(vals => {
            log_1.default.debug('rejecting onHealth');
            this.sendJson(res, vals, 200);
        });
    }
    _onVerifyConnection(req, res) {
        req.on('data', () => { });
        req.on('end', () => {
            this._wifiMgr.verifyConnection().then((error) => {
                if (error) {
                    return this.sendJson(res, error, 500);
                }
                this.sendJson(res, { status: 'OK' });
            }, (realError) => {
                log_1.default.warn('verifyConnection rejected unexpectedly', realError);
                this.sendJson(res, { status: 'error', message: realError.stack || realError }, 500);
            });
        });
    }
    _onRemoveAll(req, res) {
        req.on('data', () => { });
        req.on('end', () => {
            this._removeAllNetworks().then(() => {
                this.sendJson(res, { status: 'OK' });
            }, (error) => {
                this.sendJson(res, { error: error.stack || error }, 500);
            });
        });
    }
    _onRemoveNetwork(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            let data;
            try {
                data = JSON.parse(chunk);
                this._removeNetwork(data.ssid).then(() => {
                    this.sendJson(res, { status: 'OK' });
                }, (error) => {
                    this.sendJson(res, { error: error.stack || error }, 500);
                });
            }
            catch (e) {
                log_1.default.warn('_onRemoveNetwork cannot parse ', chunk);
                this.sendJson(res, { status: 'error', message: 'could not parse json', json: chunk }, 400);
            }
        });
    }
    _onSelectNetwork(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            let data;
            try {
                data = JSON.parse(chunk);
                this._selectNetwork(data.ssid).then(() => {
                    this.sendJson(res, { status: 'OK' });
                }, (error) => {
                    this.sendJson(res, { error: error.stack || error }, 500);
                });
            }
            catch (e) {
                log_1.default.warn('_onSelectNetwork cannot parse ', chunk);
                this.sendJson(res, { status: 'error', message: 'could not parse json', json: chunk }, 400);
            }
        });
    }
    _onAddNetwork(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            let data;
            try {
                data = JSON.parse(chunk);
                this._addNetwork(data.networkData, data.minVerifyTime).then((error) => {
                    if (error) {
                        return this.sendJson(res, error, 500);
                    }
                    this.sendJson(res, { status: 'OK' });
                }, (realError) => {
                    log_1.default.warn('_addNetwork rejected unexpectedly', realError);
                    this._wifiMgr.inProgress = false;
                    this.sendJson(res, { status: 'error', message: realError || realError }, 500);
                });
            }
            catch (e) {
                log_1.default.warn('_onAddNetwork cannot parse ', chunk);
                this.sendJson(res, { status: 'error', message: 'could not parse json', json: chunk }, 400);
            }
        });
    }
    _onGetCurrentNetwork(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            this.getCurrentNetwork().then((_stats) => {
                this.sendJson(res, { status: 'OK', stats: _stats });
            }, (error) => {
                this.sendJson(res, { error: error.stack || error }, 500);
            });
        });
    }
    _onGetSavedNetworks(req, res) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            this._wifiMgr.getSavedNetworks().then((data) => {
                this.sendJson(res, { status: 'OK', networks: data });
            }, (error) => {
                return this.sendJson(res, { error: error.stack || error }, 500);
            });
        });
    }
    _removeAllNetworks() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._wifiMgr.getSavedNetworks();
            if (data) {
                yield Promise.all(data.map((item) => this._wifiMgr.removeNetwork(item.index, item.ssid)));
            }
        });
    }
    _removeNetwork(ssid) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._wifiMgr.getSavedNetworks();
            let networkID = this._getNetworkID(ssid, data);
            if (networkID) {
                yield this._wifiMgr.removeNetwork(networkID, ssid);
            }
            else {
                return Promise.reject(new Error(ssid + " is not currently saved"));
            }
        });
    }
    _selectNetwork(ssid) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._wifiMgr.getSavedNetworks();
            let networkID = this._getNetworkID(ssid, data);
            if (networkID) {
                yield this._wifiMgr.selectNetwork(networkID, null);
                yield this._wifiMgr.saveNetwork(networkID);
            }
            else {
                return Promise.reject(new Error(ssid + " is not currently saved"));
            }
        });
    }
    _getNetworkID(ssid, data) {
        let foundNetworkId = null;
        const networkLen = data.length;
        for (let idx = 0; idx < networkLen; idx++) {
            if (data[idx].ssid === ssid) {
                foundNetworkId = data[idx].index;
                break;
            }
        }
        return foundNetworkId;
    }
    _addNetwork(networkData, minVerifyTime) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._wifiMgr.inProgress) {
                return new Promise((resolve, reject) => {
                    let timer = setInterval(() => {
                        if (!this._wifiMgr.inProgress) {
                            clearInterval(timer);
                            resolve(this._addNetwork(networkData, minVerifyTime));
                        }
                        else {
                            log_1.default.info("Currently in process of adding network. Please wait!");
                        }
                    }, 1000);
                });
            }
            log_1.default.info("addNetwork is starting");
            this._wifiMgr.inProgress = true;
            if (!networkData.ssid) {
                this._wifiMgr.inProgress = false;
                let error = new ErrorCode_1.default(6, "No SSID Specified");
                this.sendError(error);
                return error;
            }
            if (!networkData.pswd) {
                networkData.security = "OPEN";
            }
            else if (networkData.pswd.length > 7 && networkData.pswd.length < 64) {
                networkData.security = "WPA-PSK";
            }
            else {
                this._wifiMgr.inProgress = false;
                let error = new ErrorCode_1.default(5, "Invalid password length! Must be at least 8 characters and less than 64 characters");
                this.sendError(error);
                return error;
            }
            let networks;
            try {
                networks = yield this._wifiMgr.getSavedNetworks();
            }
            catch (error) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(666, error.message);
            }
            let networkID = this._getNetworkID(networkData.ssid, networks);
            if (networkID) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(666, networkData.ssid + " already exists...not adding");
            }
            let data;
            try {
                data = yield this._wifiMgr.addNetwork();
            }
            catch (err) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(666, "No access to wpa_cli " + err);
            }
            let stringId = data.match(/\d+/)[0];
            try {
                this._wifiMgr.scan();
            }
            catch (err) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(666, "Error Scanning! " + err);
            }
            try {
                data = yield this._wifiMgr.getScanResults();
            }
            catch (err) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(666, "Error retrieving Scan Results...");
            }
            if (data.indexOf(networkData.ssid) > -1) {
                log_1.default.info("network is NOT hidden!");
                networkData.hidden = 0;
            }
            else {
                log_1.default.info("network is hidden!");
                networkData.hidden = 1;
            }
            try {
                yield this._setNetwork(stringId, networkData);
            }
            catch (err) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(1, "Could not set network! " + err);
            }
            try {
                yield this._wifiMgr.saveNetwork(stringId);
            }
            catch (err) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(666, "Could not save network! " + err);
            }
            try {
                yield this._wifiMgr.selectNetwork(stringId, networkData);
            }
            catch (err) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(1, "Could not select network! " + err);
            }
            try {
                yield this._wifiMgr.saveNetwork(stringId);
            }
            catch (err) {
                this._wifiMgr.inProgress = false;
                return new ErrorCode_1.default(666, "Could not save network! " + err);
            }
            if (minVerifyTime && minVerifyTime > 0) {
                log_1.default.info("Verifying network...");
                startVerifyTime = 0;
                let verifyTimer = setInterval(() => {
                    startVerifyTime++;
                }, 1000);
                try {
                    const errCode = yield this._verify(minVerifyTime);
                    clearInterval(verifyTimer);
                    startVerifyTime = 0;
                    this._wifiMgr.inProgress = false;
                    if (errCode) {
                        log_1.default.info('Verify network failed!', errCode);
                        this.sendError(errCode);
                        return errCode;
                    }
                    else {
                        log_1.default.info('Verify network succeeded!');
                        return null;
                    }
                }
                catch (e) {
                    clearInterval(verifyTimer);
                    throw e;
                }
            }
            else {
                this._wifiMgr.inProgress = false;
                return null;
            }
        });
    }
    _setNetwork(stringId, networkData) {
        return __awaiter(this, void 0, void 0, function* () {
            let options = {
                ssid: networkData.ssid,
                psk: null,
                security: null,
                hidden: null
            };
            yield this._wifiMgr.setNetwork(stringId, options);
            log_1.default.info("Successfully added SSID " + networkData.ssid);
            if (networkData.pswd.length > 0) {
                options = {
                    ssid: null,
                    psk: networkData.pswd,
                    security: null,
                    hidden: null
                };
                yield this._wifiMgr.setNetwork(stringId, options);
                log_1.default.info("Successfully added PSK");
                options = {
                    ssid: null,
                    psk: null,
                    security: networkData.security,
                    hidden: null
                };
                yield this._wifiMgr.setNetwork(stringId, options);
                log_1.default.info("Successfully added Security");
                if (networkData.hidden === 1) {
                    options = {
                        ssid: null,
                        psk: null,
                        security: null,
                        hidden: networkData.hidden
                    };
                    try {
                        yield this._wifiMgr.setNetwork(stringId, options);
                        log_1.default.info("Successfully set (hidden) network!");
                    }
                    catch (err) {
                        return Promise.reject(new Error("Failed to set hidden SSID!"));
                    }
                }
                else {
                    log_1.default.info("Successfully set network!");
                    return;
                }
            }
            else if (networkData.pswd.length === 0) {
                let options = {
                    ssid: null,
                    psk: null,
                    security: networkData.security,
                    hidden: null
                };
                yield this._wifiMgr.setNetwork(stringId, options);
                if (networkData.hidden === 1) {
                    let options = {
                        ssid: null,
                        psk: null,
                        security: null,
                        hidden: networkData.hidden
                    };
                    try {
                        yield this._wifiMgr.setNetwork(stringId, options);
                        return;
                    }
                    catch (err) {
                        return Promise.reject(new Error("Failed to set hidden SSID!"));
                    }
                }
                else {
                    return;
                }
            }
            else {
                return Promise.reject(new Error("Invalid PSK Settings!"));
            }
        });
    }
    _verify(minVerifyTime) {
        return __awaiter(this, void 0, void 0, function* () {
            const err = yield this._wifiMgr.verifyConnection();
            if (err) {
                if (startVerifyTime > minVerifyTime) {
                    return err;
                }
                else {
                    return this._verify(minVerifyTime);
                }
            }
            return null;
        });
    }
    _monitorWifiErrorSysLog() {
        try {
            fs.watchFile(corruptPacketCounterFilePath, (curr) => {
                try {
                    if (curr.isFile() && curr.size > 0) {
                        this._readFirstLine(corruptPacketCounterFilePath)
                            .then((firstLine) => {
                            if (firstLine !== "0" &&
                                (!this._lastReassociationTime ||
                                    Date.now() - this._lastReassociationTime >= reassociationThrottleTime)) {
                                this._lastReassociationTime = Date.now();
                                log_1.default.info("Reassociating with wpa_supplicant");
                                jibo_client_framework_1.SystemManagerClient.instance.sendWifiRequest("POST", "/wifi/wpa", JSON.stringify({
                                    "command": "REASSOCIATE"
                                }), (err, response) => {
                                    if (err) {
                                        log_1.default.error("Error reassociating with wpa_supplicant: ", err);
                                    }
                                    else {
                                        log_1.default.info("Reassociating with wpa_supplicant complete: ", JSON.stringify(response));
                                    }
                                });
                            }
                        })
                            .catch((err) => {
                            log_1.default.error(`Error when attmping to read file ${corruptPacketCounterFilePath}: `, err);
                        });
                    }
                }
                catch (err) {
                    log_1.default.error("Error when sending a reassociate command to wpa_supplicant", err);
                }
            });
        }
        catch (err) {
            log_1.default.warn(`Error trying to watch file ${corruptPacketCounterFilePath}: `, err);
            setTimeout(() => {
                this._monitorWifiErrorSysLog();
            }, 10000);
        }
    }
    _readFirstLine(filepath) {
        return new Promise((resolve, reject) => {
            let readStream = fs.createReadStream(filepath, { encoding: 'utf8' });
            let totalString = '';
            let currentPos = 0;
            let index = 0;
            readStream.on('data', function (chunk) {
                index = chunk.indexOf('\n');
                totalString += chunk;
                if (index !== -1) {
                    readStream.close();
                }
                else {
                    currentPos += chunk.length;
                }
            })
                .on('close', function () {
                readStream.removeAllListeners();
                resolve(totalString.slice(0, currentPos + index));
            })
                .on('error', function (err) {
                readStream.removeAllListeners();
                reject(err);
            });
        });
    }
}
exports.default = WifiService;

},{"../../utils/RunMode":108,"./WifiManager":66,"./log":68,"./scanning/ErrorCode":70,"./stats/IFconfigService":75,"./stats/PingService":77,"./stats/SpeedTestService":78,"fs":undefined,"jibo-client-framework":undefined,"jibo-service-framework":undefined}],68:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('WiFi');

},{"../log":51}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Scan_1 = require("./Scan");
const jibo_client_framework_1 = require("jibo-client-framework");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const promisify = jibo_cai_utils_1.PromiseUtils.promisify;
const log_1 = require("../log");
const log = log_1.default.createChild("ActiveScan");
const SCAN_RESULTS = /^<3>CTRL-EVENT-SCAN-RESULTS/;
class ActiveScan extends Scan_1.default {
    constructor() {
        super();
        this.listener = null;
    }
    handleWSMessage(message) {
        if (SCAN_RESULTS.test(message)) {
            this._fetchResults();
            if (this.listener) {
                this.scanResults().then(this.listener);
            }
        }
    }
    scan() {
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.scan(cb));
    }
    listen(interval, listener) {
        this.listener = listener;
        jibo_client_framework_1.SystemManagerClient.instance.activeAutoScan(interval, (err) => {
            if (err) {
                log.warn('Error setting active auto scan:', err);
            }
        });
    }
    stopListener() {
        this.listener = null;
    }
}
exports.default = ActiveScan;

},{"../log":68,"./Scan":73,"jibo-cai-utils":undefined,"jibo-client-framework":undefined}],70:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ErrorCode {
    constructor(code, description) {
        this.code = code;
        if (description) {
            this.description = description;
        }
    }
}
exports.ErrorCode = ErrorCode;
exports.default = ErrorCode;

},{}],71:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class NetworkContainer {
    constructor() {
        this.container = {};
    }
    addNewNetworkProfile(data) {
        if (data.split('\t').length === 4) {
            let prof = new NetworkProfile(data);
            if ((prof.ssid !== null) && !this.container.hasOwnProperty(prof.ssid)) {
                this.container[prof.ssid] = prof;
            }
        }
    }
    getBestNetwork() {
        return __awaiter(this, void 0, void 0, function* () {
            let best_network = new NetworkProfile('a');
            let found = false;
            for (let key in this.container) {
                if (this.container[key].active === 1 && !this.container[key].tried) {
                    if (this.container[key].rssi < best_network.rssi) {
                        best_network = this.container[key];
                        found = true;
                    }
                }
            }
            if (!found) {
                for (let key in this.container) {
                    this.container[key].tried = false;
                }
            }
            return best_network;
        });
    }
    updateWiFiProfiles(data) {
        return __awaiter(this, void 0, void 0, function* () {
            let split_lines = data.split('\n');
            for (let i = 0; i < split_lines.length; ++i) {
                let tab_line = split_lines[i].split('\t');
                if (tab_line.length === 5) {
                    if (this.container.hasOwnProperty(tab_line[4])) {
                        this.container[tab_line[4]].rssi = tab_line[2];
                        this.container[tab_line[4]].active = 1;
                        this.container[tab_line[4]].freq = tab_line[1];
                    }
                }
            }
            return this.container;
        });
    }
}
exports.NetworkContainer = NetworkContainer;
class NetworkProfile {
    constructor(data) {
        this.ssid = null;
        this.rssi = null;
        this.freq = null;
        this.active = null;
        this.networkID = null;
        this.tried = false;
        if (data.charAt(0) >= '0' && data.charAt(0) <= '9') {
            let split_line = data.split('\t');
            this.ssid = split_line[1];
            this.networkID = split_line[0];
        }
    }
}
exports.NetworkProfile = NetworkProfile;

},{}],72:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const NetworkHelper_1 = require("./NetworkHelper");
const jibo_client_framework_1 = require("jibo-client-framework");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const promisify = jibo_cai_utils_1.PromiseUtils.promisify;
class NetworkManager {
    constructor() {
        this.networkContainer = new NetworkHelper_1.NetworkContainer();
    }
    getNetworks() {
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.listNetworks(cb));
    }
    getContainer() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.networkContainer;
        });
    }
    updateProfiles(data1) {
        return __awaiter(this, void 0, void 0, function* () {
            let split_data = data1.split('\n');
            for (let i = 0; i < split_data.length; ++i) {
                this.networkContainer.addNewNetworkProfile(split_data[i]);
            }
            for (let key in this.networkContainer.container) {
                if (data1.indexOf(key) === -1) {
                    delete this.networkContainer.container[key];
                }
            }
            return this.networkContainer;
        });
    }
    connectToNetwork(networkProfile) {
        console.log("y");
    }
}
exports.default = NetworkManager;

},{"./NetworkHelper":71,"jibo-cai-utils":undefined,"jibo-client-framework":undefined}],73:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_client_framework_1 = require("jibo-client-framework");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const promisify = jibo_cai_utils_1.PromiseUtils.promisify;
class Scan {
    constructor() {
        this.results = null;
    }
    scanResults() {
        if (!this.results) {
            this._fetchResults();
        }
        return this.results;
    }
    _fetchResults() {
        this.results = promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.scanResults(cb));
    }
}
exports.default = Scan;

},{"jibo-cai-utils":undefined,"jibo-client-framework":undefined}],74:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_client_framework_1 = require("jibo-client-framework");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const promisify = jibo_cai_utils_1.PromiseUtils.promisify;
const log_1 = require("../log");
const log = log_1.default.createChild("StatusHandler");
var WIFI_STATES;
(function (WIFI_STATES) {
    WIFI_STATES[WIFI_STATES["INIT"] = -1] = "INIT";
    WIFI_STATES[WIFI_STATES["SCANNING"] = 0] = "SCANNING";
    WIFI_STATES[WIFI_STATES["AUTHENTICATING"] = 1] = "AUTHENTICATING";
    WIFI_STATES[WIFI_STATES["FOUR_WAY_HANDSHAKE"] = 2] = "FOUR_WAY_HANDSHAKE";
    WIFI_STATES[WIFI_STATES["CONNECTED"] = 3] = "CONNECTED";
    WIFI_STATES[WIFI_STATES["DISCONNECTED"] = 4] = "DISCONNECTED";
})(WIFI_STATES = exports.WIFI_STATES || (exports.WIFI_STATES = {}));
const WIFI_STATE_STRINGS = {
    [WIFI_STATES.INIT]: 'INIT',
    [WIFI_STATES.SCANNING]: 'SCANNING',
    [WIFI_STATES.AUTHENTICATING]: 'AUTHENTICATING',
    [WIFI_STATES.FOUR_WAY_HANDSHAKE]: '4WAY_HANDSHAKE',
    [WIFI_STATES.CONNECTED]: 'COMPLETED',
    [WIFI_STATES.DISCONNECTED]: 'DISCONNECTED'
};
const INTERVAL_CONNECTED = 15000;
exports.INTERVAL_DISCONNECTED = 5000;
const INTERVAL_BUSY = 1000;
const SCAN_COUNT_BEFORE_DISCONNECT = 5;
const CONNECTED_MESSAGE = /^\s?<3>CTRL-EVENT-CONNECTED/;
class StatusHandler {
    constructor() {
        this.lastState = WIFI_STATES.INIT;
        this.listener = null;
        this.stateChangeCallback = null;
        this.assumedConnected = false;
        this.scanCount = 0;
        this.onInterval = this.onInterval.bind(this);
        this.statusCB = this.statusCB.bind(this);
    }
    handleWSMessage(message) {
        if (message.match(CONNECTED_MESSAGE)) {
            this.lastState = WIFI_STATES.CONNECTED;
            this.assumedConnected = true;
            this.scanCount = 0;
            if (this.stateChangeCallback) {
                this.stateChangeCallback(this.lastState);
            }
            this.adjustPollRate();
        }
    }
    status() {
        return promisify((cb) => jibo_client_framework_1.SystemManagerClient.instance.wifiStatus(cb));
    }
    listen(interval, listener) {
        this.stateChangeCallback = listener;
        this.setInterval(interval);
    }
    stopListener() {
        clearInterval(this.listener);
    }
    setInterval(interval) {
        if (this.listener) {
            clearInterval(this.listener);
        }
        this.listener = setInterval(this.onInterval, interval);
    }
    onInterval() {
        jibo_client_framework_1.SystemManagerClient.instance.wifiStatus(this.statusCB);
    }
    statusCB(err, data) {
        if (err) {
            log.error("statusCB error: " + err);
            return;
        }
        let tempState = WIFI_STATES.INIT;
        if (data.indexOf(WIFI_STATE_STRINGS[WIFI_STATES.SCANNING]) > -1) {
            tempState = WIFI_STATES.SCANNING;
        }
        else if (data.indexOf(WIFI_STATE_STRINGS[WIFI_STATES.AUTHENTICATING]) > -1) {
            tempState = WIFI_STATES.AUTHENTICATING;
        }
        else if (data.indexOf(WIFI_STATE_STRINGS[WIFI_STATES.FOUR_WAY_HANDSHAKE]) > -1) {
            tempState = WIFI_STATES.FOUR_WAY_HANDSHAKE;
        }
        else if (data.indexOf(WIFI_STATE_STRINGS[WIFI_STATES.CONNECTED]) > -1) {
            tempState = WIFI_STATES.CONNECTED;
        }
        else if (data.indexOf(WIFI_STATE_STRINGS[WIFI_STATES.DISCONNECTED]) > -1) {
            tempState = WIFI_STATES.DISCONNECTED;
        }
        this.stateCB(tempState);
    }
    stateCB(currentState) {
        let adjustRate = false;
        let doCallback = false;
        if (this.lastState === WIFI_STATES.SCANNING && currentState !== WIFI_STATES.SCANNING) {
            this.scanCount = 0;
        }
        switch (currentState) {
            case WIFI_STATES.INIT:
                adjustRate = true;
                break;
            case WIFI_STATES.SCANNING:
                switch (this.lastState) {
                    case WIFI_STATES.SCANNING:
                        if (++this.scanCount === SCAN_COUNT_BEFORE_DISCONNECT) {
                            this.assumedConnected = false;
                            doCallback = true;
                        }
                        break;
                    case WIFI_STATES.INIT:
                    case WIFI_STATES.CONNECTED:
                        adjustRate = true;
                        break;
                }
                break;
            case WIFI_STATES.CONNECTED:
                doCallback = !this.assumedConnected;
                this.assumedConnected = true;
                if (this.lastState !== WIFI_STATES.CONNECTED) {
                    adjustRate = true;
                }
                break;
            case WIFI_STATES.DISCONNECTED:
                doCallback = this.assumedConnected;
                this.assumedConnected = false;
                switch (this.lastState) {
                    case WIFI_STATES.SCANNING:
                    case WIFI_STATES.CONNECTED:
                        adjustRate = true;
                        break;
                }
                break;
        }
        this.lastState = currentState;
        if (doCallback && this.stateChangeCallback) {
            this.stateChangeCallback(currentState);
        }
        if (adjustRate) {
            this.adjustPollRate();
        }
    }
    adjustPollRate() {
        switch (this.lastState) {
            case WIFI_STATES.CONNECTED:
                this.setInterval(INTERVAL_CONNECTED);
                break;
            case WIFI_STATES.DISCONNECTED:
                this.setInterval(exports.INTERVAL_DISCONNECTED);
                break;
            default:
                this.setInterval(INTERVAL_BUSY);
                break;
        }
    }
}
exports.default = StatusHandler;

},{"../log":68,"jibo-cai-utils":undefined,"jibo-client-framework":undefined}],75:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
const log = log_1.default.createChild("IFconfigService");
const os_1 = require("os");
const StatusRunner_1 = require("./StatusRunner");
const ParseHelper_1 = require("./ParseHelper");
const DEFAULT_INTERFACE = 'wlan0';
const DEFAULT_ARGS = [
    'IFACE'
];
const SHELL_COMMAND = 'ifconfig';
class IFconfigService {
    constructor(iface) {
        this._createProcess(`ifconfig${iface ? '@' + iface : ''}`, this._generateDescriptor(iface));
    }
    gatherResults() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._process.refresh();
        });
    }
    _createProcess(name, desc) {
        if (this._process) {
            log.warn(`ignoring service creation for '${name}': already exists`);
            return;
        }
        try {
            this._process = new StatusRunner_1.StatusProcess(desc, name);
            return this._process;
        }
        catch (err) {
            log.warn(`ignoring service creation for '${name}': `, err);
        }
    }
    _generateDescriptor(addr = DEFAULT_INTERFACE, args = DEFAULT_ARGS) {
        return {
            cmd: SHELL_COMMAND,
            args: args.map((i) => (i === 'IFACE') ? addr : i),
            parser: this._parser
        };
    }
    _parser(res) {
        let ret;
        if (!res.stdout || res.code) {
            ret = { error: {
                    code: res.code,
                    error: res.error,
                    msg: res.stderr,
                } };
        }
        else {
            const text = res.stdout;
            const flag_ln = text.match(/^(\s+)(([A-Z]+\s)+)\s+MTU:(\d+)\s+Metric:(\d+)/m);
            const RX_pkt_ln = text.match(/^(\s+)RX (packets[\S ]+)$/m);
            const TX_pkt_ln = text.match(/^(\s+)TX (packets[\S ]+)$/m);
            ret = { data: {
                    inet: ParseHelper_1.safeParse(text, /inet addr:([\d\.]+)/, m => m[1]),
                    bcast: ParseHelper_1.safeParse(text, /Bcast:([\d\.]+)/, m => m[1]),
                    mask: ParseHelper_1.safeParse(text, /Mask:([\d\.]+)/, m => m[1]),
                    inet6: ParseHelper_1.safeParse(text, /inet6 addr:\s([\d\w:%\/]+)/, m => m[1]),
                    flags: ParseHelper_1.safeParse(flag_ln[2], null, (m) => m.split(' ').filter(i => i)),
                    MTU: ParseHelper_1.safeParse(flag_ln[4], null, parseInt),
                    metric: ParseHelper_1.safeParse(flag_ln[5], null, parseInt),
                    RX: {
                        packets: ParseHelper_1.safeParse(RX_pkt_ln[2], /packets:(\d+)/, m => parseInt(m[1])),
                        errors: ParseHelper_1.safeParse(RX_pkt_ln[2], /errors:(\d+)/, m => parseInt(m[1])),
                        dropped: ParseHelper_1.safeParse(RX_pkt_ln[2], /dropped:(\d+)/, m => parseInt(m[1])),
                        overruns: ParseHelper_1.safeParse(RX_pkt_ln[2], /overruns:(\d+)/, m => parseInt(m[1])),
                        bytes: ParseHelper_1.safeParse(text, /RX bytes:(\d+)/, m => parseInt(m[1])),
                        load: 0,
                    },
                    TX: {
                        packets: ParseHelper_1.safeParse(TX_pkt_ln[2], /packets:(\d+)/, m => parseInt(m[1])),
                        errors: ParseHelper_1.safeParse(TX_pkt_ln[2], /errors:(\d+)/, m => parseInt(m[1])),
                        dropped: ParseHelper_1.safeParse(TX_pkt_ln[2], /dropped:(\d+)/, m => parseInt(m[1])),
                        overruns: ParseHelper_1.safeParse(TX_pkt_ln[2], /overruns:(\d+)/, m => parseInt(m[1])),
                        bytes: ParseHelper_1.safeParse(text, /TX bytes:(\d+)/, m => parseInt(m[1])),
                        load: 0,
                    },
                } };
            ret.data.RX.load = ret.data.RX.bytes / os_1.uptime() || undefined;
            ret.data.TX.load = ret.data.TX.bytes / os_1.uptime() || undefined;
        }
        return ret;
    }
}
exports.IFconfigService = IFconfigService;

},{"../log":68,"./ParseHelper":76,"./StatusRunner":79,"os":undefined}],76:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function safeParse(text, regex, cb) {
    if (!text) {
        return undefined;
    }
    const result = regex ? text.match(regex) : text;
    if (!result) {
        return undefined;
    }
    try {
        return cb(result);
    }
    catch (e) {
        return undefined;
    }
}
exports.safeParse = safeParse;

},{}],77:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
const log = log_1.default.createChild("PingService");
const StatusRunner_1 = require("./StatusRunner");
const ParseHelper_1 = require("./ParseHelper");
const DOMAIN_LIST = {
    DNS: '8.8.8.8',
    API: 'api.jibo.com',
    ASR: 'speech.googleapis.com',
};
const PING_INTERVAL = 5;
const PING_TIMEOUT = Math.ceil((60 * 60) / PING_INTERVAL);
const DEFAULT_ARGS = [
    '-i', `${PING_INTERVAL}`,
    '-c', `${PING_TIMEOUT}`,
];
const SHELL_COMMAND = 'ping';
class PingService {
    constructor(addr) {
        if (!PingService.processList) {
            PingService.processList = [];
        }
        for (let name of Object.keys(DOMAIN_LIST)) {
            this._createProcess('Ping@' + name, this._generateDescriptor(DOMAIN_LIST[name]));
        }
        for (let ip of (addr || [])) {
            this._createProcess('Ping@' + ip, this._generateDescriptor(ip));
        }
    }
    gatherResults() {
        return __awaiter(this, void 0, void 0, function* () {
            let results = {};
            for (let proc of PingService.processList) {
                let stat = yield proc.refresh()
                    .then(val => val)
                    .catch(err => err);
                results[proc.name] = stat;
            }
            return results;
        });
    }
    _createProcess(name, desc) {
        let contained = PingService.processList.find((p) => p.name.includes(name));
        if (!contained) {
            log.debug(`no existing ping for '${name}' found: creating`);
            let proc = new StatusRunner_1.StatusProcess(desc, name);
            PingService.processList.push(proc);
            return proc;
        }
        else {
            log.warn(`ignoring service creation for '${name}': already exists`);
            return contained;
        }
    }
    _generateDescriptor(addr, args = DEFAULT_ARGS) {
        return {
            cmd: SHELL_COMMAND,
            args: args.concat([addr]),
            parser: this._parser
        };
    }
    _parser(res) {
        const body = res.stdout || '';
        const summaryHeader = body.match(/--- (\S+) ping statistics ---/);
        if (summaryHeader) {
            const stats = body.match(/min\/avg\/max\/\S+dev\s+=\s+(\d+\.\d*)\/(\d+\.\d*)\/(\d+\.\d*)\/(\d+\.\d*)\s+ms/);
            return { data: {
                    addr: summaryHeader[1] || undefined,
                    tx: ParseHelper_1.safeParse(body, /(\d+)\s+packets transmitted/, (m) => parseInt(m[1])),
                    rx: ParseHelper_1.safeParse(body, /(\d+)\s+(packets\s+)?received/, (m) => parseInt(m[1])),
                    loss: ParseHelper_1.safeParse(body, /(\d+\.?\d*)%\s+packet loss/, (m) => parseFloat(m[1])),
                    time: ParseHelper_1.safeParse(body, /time\s+(\d+)ms/, (m) => parseFloat(m[1])),
                    min: ParseHelper_1.safeParse(stats[1], null, parseFloat),
                    avg: ParseHelper_1.safeParse(stats[2], null, parseFloat),
                    max: ParseHelper_1.safeParse(stats[3], null, parseFloat),
                    dev: ParseHelper_1.safeParse(stats[4], null, parseFloat),
                } };
        }
        else {
            return { error: {
                    code: res.code,
                    error: res.error,
                    msg: res.stderr,
                } };
        }
    }
}
exports.PingService = PingService;

},{"../log":68,"./ParseHelper":76,"./StatusRunner":79}],78:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
const log = log_1.default.createChild("SpeedTest");
const SpeedTest = require('speedtest-net');
const DEFAULT_OPTIONS = {
    maxTime: 0,
    serverId: "5906",
};
class SpeedTestService {
    constructor(options) {
        this._options = options || DEFAULT_OPTIONS;
        this._speed = undefined;
        this._promise = undefined;
    }
    gatherResults() {
        return __awaiter(this, void 0, void 0, function* () {
            let newPromise = undefined;
            if (this._options.maxTime === 0) {
                newPromise = new Promise((resolve, reject) => {
                    reject({
                        error: 'Disabled'
                    });
                });
            }
            else {
                newPromise = new Promise((resolve, reject) => {
                    this._speed = SpeedTest(this._options);
                    this._speed.on('data', (data) => {
                        log.debug('data: ', data);
                        resolve({
                            data: data
                        });
                    });
                    this._speed.on('error', (err) => {
                        log.debug('error: ', err);
                        reject({
                            error: err
                        });
                    });
                });
            }
            this._promise = newPromise;
            return newPromise;
        });
    }
}
exports.SpeedTestService = SpeedTestService;

},{"../log":68,"speedtest-net":undefined}],79:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_cai_utils_1 = require("jibo-cai-utils");
const child_process_1 = require("child_process");
const log_1 = require("../log");
const log = log_1.default.createChild('StatusRunner');
var jibo_cai_utils_2 = require("jibo-cai-utils");
exports.ProcessResult = jibo_cai_utils_2.ProcessResult;
class StatusResult {
}
exports.StatusResult = StatusResult;
class StatusDescriptor {
}
exports.StatusDescriptor = StatusDescriptor;
class StatusProcess {
    constructor(desc, name) {
        if (!StatusProcess._sema4) {
            StatusProcess._sema4 = new Set();
        }
        this._desc = desc;
        this._status = undefined;
        this._name = (name || desc.cmd).replace('.', '_');
        this._log = log.createChild(this._name);
        process.on('SIGINT', () => {
            this._log.info(`received SIGINT: stopping process with pid:${this._proc.pid}`);
            this.stop();
        });
        this.start(this._desc);
    }
    get descriptor() {
        return Object.freeze(this._desc);
    }
    get status() {
        return Object.freeze(this._status);
    }
    get name() {
        return this._name;
    }
    start(desc) {
        this._log.debug('starting process');
        if (StatusProcess._sema4.has(this.name)) {
            this._log.error(`process with name '${this.name}' is already running`);
            throw new Error(`Duplicated process request: ${this.name}`);
        }
        else {
            StatusProcess._sema4.add(this.name);
        }
        if (desc) {
            this._desc = desc;
        }
        this._promiseData = new Promise((resolve, reject) => {
            this._res = undefined;
            this._proc = child_process_1.spawn(this._desc.cmd, this._desc.args, this._desc.options);
            let res = new jibo_cai_utils_1.ProcessResult();
            this._proc.stdout.on('data', (data) => {
                res.stdout = new Buffer(data).toString('utf8', 0);
                this._log.debug('stdout: ', res.stdout);
            });
            this._proc.stderr.on('data', (data) => {
                res.stderr = new Buffer(data).toString('utf8', 0);
                this._log.debug('stderr: ', res.stderr);
            });
            this._proc.on('error', (err) => {
                res.error = err;
                res.code = err.code;
                this._log.debug('error: ', res.error);
                this._status = this._desc.parser(this._res = res);
                this._log.debug('result: ', this._status);
                reject(this.status);
            });
            this._proc.on('close', (code) => {
                res.code = code;
                this._log.debug('close: ', res.code);
                StatusProcess._sema4.delete(this.name);
                try {
                    this._status = this._desc.parser(this._res = res);
                    this._log.debug('result: ', this._status);
                    if (code === 0) {
                        resolve(this.status);
                    }
                    else {
                        reject(this.status);
                    }
                }
                catch (err) {
                    this._status = { error: err };
                    reject(this.status);
                }
            });
            if (this._desc.input) {
                this._proc.stdin.write(this._desc.input);
            }
        });
        return this._promiseData;
    }
    stop() {
        if (!this._res && !this._proc.killed) {
            this._log.debug('killing process');
            this._proc.kill('SIGINT');
            return true;
        }
        else {
            return false;
        }
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            this._log.debug('refresh status');
            if (this.stop()) {
                const ret = yield Promise.race([this._promiseData])
                    .then(res => res)
                    .catch(err => err);
                this.start();
                this._log.debug('new status: ', ret);
                return ret;
            }
            else {
                this.start();
                const ret = yield Promise.race([this._promiseData])
                    .then(res => res)
                    .catch(err => err);
                this._log.debug('new status: ', ret);
                return ret;
            }
        });
    }
    autoUpdate(seconds) {
        if (this._timer) {
            this._log.debug('clearing update timer');
            clearTimeout(this._timer);
        }
        if (seconds < 1) {
            this._log.debug('stopping auto update');
            return;
        }
        this._log.info(`setting auotUpdate: period = ${seconds}s`);
        this._timer = setInterval(() => {
            this.refresh();
        }, seconds * 1000);
    }
}
exports.StatusProcess = StatusProcess;

},{"../log":68,"child_process":undefined,"jibo-cai-utils":undefined}],80:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../log");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const log = log_1.default.createChild('Audio');
const prfyTo = jibo_cai_utils_1.PromiseUtils.promisifyTo;
class AudioServiceSim extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('audio', options, rootDir);
        this.inputEnergyClients = [];
        this._debugState = {
            injectWhiteNoise: false,
            injectSine: false,
        };
        this._diagState = {
            diags: [
                {
                    name: 'name',
                    type: 0,
                    writable: true,
                    value: [0, 0],
                },
            ]
        };
        this._beam = (req, res) => {
            this.finishNoContent(res);
        };
        this._beamState = (req, res) => {
            const beamState = {
                ts: [0, 0],
                manual_override: false,
                selection: 0,
            };
            this.sendJson(res, beamState);
        };
        this._beamInfo = (req, res) => {
            const beamInfo = {
                ts: [0, 0],
                manual_override: false,
                selection: 0,
                beams: [{
                        center: 0,
                        range: 0,
                    }],
            };
            this.sendJson(res, beamInfo);
        };
        this._debugGet = (req, res) => {
            this.sendJson(res, this._debugState);
        };
        this._debugPost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [err, debugState] = yield prfyTo(cb => this.parseBody(req, cb));
            if (err) {
                return this.finish(res, null, err);
            }
            this._debugState = debugState;
            this.finishNoContent(res);
        });
        this._diagGet = (req, res) => {
            this.sendJson(res, this._diagState);
        };
        this._diagPost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const [err, diagStateIn] = yield prfyTo(cb => this.parseBody(req, cb));
            if (err) {
                return this.finish(res, null, err);
            }
            diagStateIn.diags.forEach(diagIn => {
                const existingDiag = this._diagState.diags.find(diag => diag.name === diagIn.name);
                if (existingDiag) {
                    Object.assign(existingDiag, diagIn);
                }
                else {
                    this._diagState.diags.push(Object.assign({}, diagIn));
                }
            });
            this.finishNoContent(res);
        });
        if (AudioServiceSim._instance) {
            throw new Error('Cannot instantiate AudioServiceSim more than once');
        }
        AudioServiceSim._instance = this;
        log.info("Instantiated");
    }
    static get instance() {
        return AudioServiceSim._instance;
    }
    init(callback) {
        super.init((err) => {
            log.info('Initialized');
            callback(err);
        });
    }
    routes(url) {
        super.routes(url);
        url.post('/beam', this._beam);
        url.get('/beam/state', this._beamState);
        url.get('/beam/info', this._beamInfo);
        url.get('/debug', this._debugGet);
        url.post('/debug', this._debugPost);
        url.get('/diag', this._diagGet);
        url.post('/diag', this._diagPost);
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        switch (client.url) {
            case '/input_energy':
                this.inputEnergyClients.push(client);
                break;
        }
    }
    onMessage(command, client) {
        return;
    }
    onClose(client) {
        if (this.inputEnergyClients.indexOf(client) > -1) {
            this.inputEnergyClients.splice(this.inputEnergyClients.indexOf(client), 1);
        }
    }
    pause() {
        log.info('Pausing AudioService');
    }
    resume() {
        log.info('Resuming AudioService');
    }
}
exports.default = AudioServiceSim;

},{"../log":90,"jibo-cai-utils":undefined,"jibo-service-framework":undefined}],81:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AxisState {
    constructor() {
        this.ts = [0, 0];
        this.pos = 0;
        this.inc_pos = 0;
        this.vel = 0;
        this.cur = 0;
        this.pwm = 0;
        this.status = 1;
        this.vel_limit = 10;
        this.acc_limit = 10;
        this.cur_limit = 10;
        this.mode = 4;
        this.ref = 0;
        this.ticks = 0;
    }
}
exports.default = AxisState;

},{}],82:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const animation_utilities_1 = require("animation-utilities");
class AxisVelocityControllerSim {
    constructor(initialPosition, velocity, initialTime) {
        this.initialPosition = initialPosition;
        this.velocity = velocity;
        this.initialTime = initialTime;
        if (initialTime === null || initialTime === undefined) {
            initialTime = animation_utilities_1.Clock.currentTime();
        }
        this.initialTime = initialTime;
    }
    getPosition(time) {
        if (time === null || time === undefined) {
            time = animation_utilities_1.Clock.currentTime();
        }
        let secondsElapsed = time.subtract(this.initialTime);
        return this.initialPosition + this.velocity * secondsElapsed;
    }
    getVelocity() {
        return this.velocity;
    }
}
exports.default = AxisVelocityControllerSim;

},{"animation-utilities":undefined}],83:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const animation_utilities_1 = require("animation-utilities");
const BodyState_1 = require("./BodyState");
const AxisVelocityControllerSim_1 = require("./AxisVelocityControllerSim");
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../log");
let log = log_1.default.createChild('Body');
const performance = {
    now: () => {
        const time = process.hrtime();
        return time[0] * 1000 + time[1] / 1000000;
    }
};
class SimController {
    constructor() {
        this.pelvis = new AxisVelocityControllerSim_1.default(0, 0);
        this.torso = new AxisVelocityControllerSim_1.default(0, 0);
        this.neck = new AxisVelocityControllerSim_1.default(0, 0);
    }
}
class BodyService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('body', options, rootDir);
        this.stateSocketList = [];
        this.touchSocketList = [];
        this.commandSocketList = [];
        this.ledSocketList = [];
        this.ledState = [0, 0, 0];
        this.state = new BodyState_1.default();
        this.simControllers = new SimController();
        if (BodyService._instance) {
            throw new Error('Cannot instantiate BodyService more than once');
        }
        BodyService._instance = this;
        this.update = this.update.bind(this);
        log.info("Instantiated");
    }
    static get instance() {
        return BodyService._instance;
    }
    init(callback) {
        super.init((err) => {
            this.updateLoop = setTimeout(this.update, 100);
            log.info('Initialized');
            callback(err);
        });
    }
    reset() {
        this.state = new BodyState_1.default();
        this.simControllers = new SimController();
    }
    pause() {
        if (this.updateLoop) {
            log.info('Pausing BodyService');
            clearTimeout(this.updateLoop);
            this.updateLoop = null;
        }
    }
    resume() {
        if (!this.updateLoop) {
            log.info('Resuming BodyService');
            this.updateLoop = setTimeout(this.update, 100);
        }
    }
    onMessage(command, client) {
        if (client.url === '/axis_command') {
            this.onAxisCommand(command);
        }
        else if (client.url === '/led_command') {
            this.onLEDCommand(command);
        }
    }
    onClose(client) {
        if (this.commandSocketList.indexOf(client) > -1) {
            this.commandSocketList.splice(this.commandSocketList.indexOf(client), 1);
        }
        else if (this.ledSocketList.indexOf(client) > -1) {
            this.ledSocketList.splice(this.ledSocketList.indexOf(client), 1);
        }
        else if (this.stateSocketList.indexOf(client) > -1) {
            this.stateSocketList.splice(this.stateSocketList.indexOf(client), 1);
        }
        else if (this.touchSocketList.indexOf(client) > -1) {
            this.touchSocketList.splice(this.touchSocketList.indexOf(client), 1);
        }
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        if (request.url === '/axis_state') {
            this.stateSocketList.push(client);
        }
        else if (request.url === '/axis_command') {
            this.commandSocketList.push(client);
        }
        else if (request.url === '/led_command') {
            this.ledSocketList.push(client);
        }
        else if (request.url === '/touch') {
            this.touchSocketList.push(client);
        }
        this.sendState();
    }
    onAxisCommand(data) {
        this.lastUpdate = performance.now();
        let localTime = animation_utilities_1.Clock.currentTime();
        let simControllers = this.simControllers;
        for (let dof of Object.keys(simControllers)) {
            if (data[dof].mode === 4) {
                simControllers[dof] = new AxisVelocityControllerSim_1.default(simControllers[dof].getPosition(localTime), data[dof].value[0], localTime);
            }
            else if (data[dof].mode === 5) {
                simControllers[dof] = new animation_utilities_1.TrajectoryControllerSim(simControllers[dof].getPosition(localTime), simControllers[dof].getVelocity(localTime), localTime);
                simControllers[dof].updateCommand(data[dof].value[1], data[dof].value[0], data[dof].value[2], data[dof].acc_limit, data[dof].vel_limit, localTime);
            }
            else if (data[dof].mode === 7) {
                simControllers[dof] = new animation_utilities_1.PosVelControllerSim(simControllers[dof].getPosition(localTime), simControllers[dof].getVelocity(localTime), localTime);
                simControllers[dof].updateCommand(data[dof].value[1], data[dof].value[0], data[dof].acc_limit, data[dof].vel_limit, localTime);
            }
            else {
                simControllers[dof] = new AxisVelocityControllerSim_1.default(simControllers[dof].getPosition(localTime), 0, localTime);
            }
        }
        this.updateState();
        this.sendState();
    }
    onLEDCommand(data) {
        if (data.color && Array.isArray(data.color) && data.color.length === 3) {
            this.ledState = data.color;
        }
    }
    updateState() {
        let localTime = animation_utilities_1.Clock.currentTime();
        let updatedRecently = (performance.now() - this.lastUpdate) < 500;
        for (let dof of Object.keys(this.simControllers)) {
            if (updatedRecently) {
                this.state[dof].vel = this.simControllers[dof].getVelocity(localTime);
            }
            else {
                this.state[dof].vel = 0.0;
            }
            this.state[dof].pos = this.simControllers[dof].getPosition(localTime);
        }
    }
    sendState() {
        if (this.updateLoop && this.stateSocketList.length > 0) {
            let ts = animation_utilities_1.Clock.currentTime()._timestamp;
            this.state.neck.ts = ts;
            this.state.torso.ts = ts;
            this.state.pelvis.ts = ts;
            this.state.ts = ts;
            for (let stateSocket of this.stateSocketList) {
                this.sendWsJson(stateSocket, this.state);
            }
        }
    }
    update() {
        this.updateLoop = setTimeout(this.update, 100);
        let dofs = {
            topSection_r: this.state.neck.pos,
            middleSection_r: this.state.torso.pos,
            bottomSection_r: this.state.pelvis.pos,
            lightring_redChannelBn_r: this.ledState[0],
            lightring_greenChannelBn_r: this.ledState[1],
            lightring_blueChannelBn_r: this.ledState[2]
        };
        this.emit('update', dofs);
    }
}
exports.default = BodyService;

},{"../log":90,"./AxisVelocityControllerSim":82,"./BodyState":84,"animation-utilities":undefined,"jibo-service-framework":undefined}],84:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AxisState_1 = require("./AxisState");
class BodyState {
    constructor() {
        this.ts = [0, 0];
        this.pelvis = new AxisState_1.default();
        this.torso = new AxisState_1.default();
        this.neck = new AxisState_1.default();
    }
}
exports.default = BodyState;

},{"./AxisState":81}],85:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events = require("events");
const fs = require("fs");
const getHomeDir = require("os-homedir");
const log_1 = require("./log");
const parallel = require("async-parallel");
const path = require("path");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const robot_boot_time_1 = require("../../utils/robot-boot-time");
const FactoryDeps_1 = require("../../FactoryDeps");
const DEFAULT_PATH = path.join(getHomeDir(), 'Desktop', 'recordings');
const promisify = jibo_cai_utils_1.PromiseUtils.promisify;
class EventPlayback extends events.EventEmitter {
    constructor(options, rootDir) {
        super();
        this._tick = () => __awaiter(this, void 0, void 0, function* () {
            const tickStart = Date.now();
            yield this._refillQueues();
            try {
                const elapsedTime = Date.now() - this._playbackStart;
                let emitted = false;
                this._recordings.forEach(recording => {
                    emitted = EventPlayback._emitPastEvents(this._recordingStart, elapsedTime, recording, recording.service, recording.sockets) || emitted;
                });
                if (emitted) {
                    this.emit('progress', elapsedTime);
                }
                if (this._recordings.some(recording => recording.emitted < recording.eventFiles.length)) {
                    const tickTime = Date.now() - tickStart;
                    const updateTime = this._updateLoopTimeout - tickTime;
                    this._playbackLoop = setTimeout(this._tick, updateTime);
                }
                else {
                    this._playbackStop = Date.now();
                    this._ended(elapsedTime);
                }
            }
            catch (err) {
                log_1.default.error('Error emitting events', err, err.list);
                this.resumeServices();
                this.emit('error', err.list && err.list[0].message || err.message);
            }
        });
        if (EventPlayback._instance) {
            throw new Error('Cannot instantiate EventPlayback more than once');
        }
        EventPlayback._instance = this;
        this._recordingDefinitions = options.recordings || {};
        this._concurrentReads = options.concurrentReads || 1;
        this._queueSize = options.queueSize || 100;
        this._timeConfigFile = options.timeConfigFile;
        this._updateLoopTimeout = options.updateLoopTimeout || 10;
        log_1.default.info('Instantiated');
        log_1.default.debug('Recording definitions:', this._recordingDefinitions);
    }
    static get instance() {
        return this._instance;
    }
    debug() {
        this.load().then(() => this.start(), err => log_1.default.error('Error with the load:', err, err.list));
    }
    init(callback) {
        this._recordingTypes = Object.keys(this._recordingDefinitions)
            .map(name => {
            const definition = this._recordingDefinitions[name];
            const serviceName = definition.service;
            const service = FactoryDeps_1.SIMULATED_SERVICES[serviceName].instance;
            const sockets = definition.sockets;
            const subdir = definition.subdir;
            const tsEpochMillis = definition.tsEpochMillis;
            const tsProp = definition.tsProp;
            return { name, service, sockets, subdir, tsEpochMillis, tsProp };
        });
        global.EventPlayback = this;
        log_1.default.info('Initialized');
        callback();
    }
    load(recordingsPath = DEFAULT_PATH) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(recordingsPath, this._timeConfigFile);
            const timeConfig = JSON.parse(yield promisify(cb => fs.readFile(filePath, 'utf-8', cb)));
            this._rbTimeOffset =
                timeConfig.robot_utc_time - timeConfig.robot_boot_time;
            const loader = (recordings, recordingType) => __awaiter(this, void 0, void 0, function* () {
                const recording = yield this._loadRecording(path.join(recordingsPath, recordingType.subdir), recordingType);
                log_1.default.info(`loaded ${recording.name} which has ${recording.eventFiles.length} events and start time of ${recording.startTs}`);
                return [...recordings, recording];
            });
            this._recordings = yield parallel.reduce(this._recordingTypes, loader, [], this._concurrentReads);
            this._recordingStart = this._recordings.reduce((earliest, recording) => recording.startTs < earliest ? recording.startTs : earliest, Number.MAX_VALUE);
            this.emit('loaded');
            log_1.default.info(`loaded ${this._recordings.length} types of recordings`);
            log_1.default.info(`Earliest start time: ${this._recordingStart}`);
            log_1.default.debug('Recordings:', this._recordings.map(recording => recording.name));
        });
    }
    start() {
        this.stop();
        this._recordings.forEach(recording => recording.emitted = 0);
        this.pauseServices();
        this._playbackStart = Date.now();
        this._playbackLoop = setTimeout(this._tick, this._updateLoopTimeout);
        log_1.default.info(`Event playback started: ${this._playbackStart}`);
        this.emit('started');
    }
    pause() {
        if (this._playbackLoop) {
            clearTimeout(this._playbackLoop);
            this.emit('paused');
        }
    }
    resume() {
        if (!this._playbackLoop) {
            this._playbackLoop =
                setTimeout(this._tick, this._updateLoopTimeout);
            this.emit('resumed');
        }
    }
    stop() {
        if (this._playbackLoop) {
            clearTimeout(this._playbackLoop);
            this.resumeServices();
            this.emit('stopped', Date.now() - this._playbackStart);
        }
    }
    pauseServices() {
        this._uniqueServices.forEach(service => {
            service.pause();
        });
    }
    resumeServices() {
        this._uniqueServices.forEach(service => {
            service.resume();
        });
    }
    static _getNested(obj, path, sep = '.') {
        const reducer = (obj, property) => obj[property];
        return path
            .replace('[', sep)
            .replace(']', '')
            .split(sep)
            .reduce(reducer, obj);
    }
    _loadRecording(dir, recordingType) {
        return __awaiter(this, void 0, void 0, function* () {
            const dirContents = yield promisify(cb => fs.readdir(dir, cb));
            const eventFiles = yield parallel.filter(dirContents, (dirContent) => __awaiter(this, void 0, void 0, function* () { return (yield promisify(cb => fs.stat(path.join(dir, dirContent), cb))).isFile() && dirContent.endsWith('.json'); }), this._concurrentReads);
            eventFiles.sort(function (fileA, fileB) {
                const a = parseInt(fileA.replace(/[^\d.]/g, ''));
                const b = parseInt(fileB.replace(/[^\d.]/g, ''));
                return a - b;
            });
            const eventQueue = yield this._fillQueue(dir, [], eventFiles, 0, this._queueSize, recordingType.tsEpochMillis, recordingType.tsProp);
            return {
                dir,
                emitted: 0,
                eventFiles,
                eventQueue,
                lastTs: eventQueue[eventQueue.length - 1].ts,
                loaded: eventQueue.length,
                name: recordingType.name,
                service: recordingType.service,
                sockets: recordingType.sockets,
                startTs: eventQueue[0].ts,
                tsEpochMillis: recordingType.tsEpochMillis,
                tsProp: recordingType.tsProp,
            };
        });
    }
    _fillQueue(dir, queue, files, offset, toFill, tsEpochMillis, tsProp) {
        return __awaiter(this, void 0, void 0, function* () {
            const toRead = files.slice(offset, offset + toFill);
            const newEvents = yield parallel.map(toRead, (file) => __awaiter(this, void 0, void 0, function* () {
                const filepath = path.join(dir, file);
                log_1.default.debug(`Loading in ${filepath}`);
                const stringContent = yield promisify(cb => fs.readFile(filepath, 'utf-8', cb));
                const content = JSON.parse(stringContent);
                const ts = tsEpochMillis
                    ? EventPlayback._getNested(content, tsProp)
                    : (robot_boot_time_1.rbTimeToMs(EventPlayback._getNested(content, tsProp)) + this._rbTimeOffset);
                return { content, ts, filepath };
            }), this._concurrentReads);
            return [...queue, ...newEvents];
        });
    }
    get _uniqueServices() {
        return this._recordingTypes
            .map(recording => recording.service)
            .filter((service, index, services) => services.indexOf(service) === index);
    }
    _refillQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield Promise.all(this._recordings.map((recording) => __awaiter(this, void 0, void 0, function* () {
                    const remainingEvents = recording.eventFiles.length - recording.loaded;
                    if (remainingEvents) {
                        const toFill = Math.min(remainingEvents, this._queueSize - recording.eventQueue.length);
                        recording.eventQueue = yield this._fillQueue(recording.dir, recording.eventQueue, recording.eventFiles, recording.loaded, toFill, recording.tsEpochMillis, recording.tsProp);
                        const lastEvent = recording.eventQueue[recording.eventQueue.length - 1];
                        recording.lastTs = lastEvent.ts;
                        recording.loaded = recording.loaded + toFill;
                    }
                })));
            }
            catch (err) {
                log_1.default.error('Error refilling the queue', err, err.list);
                this.resumeServices();
                this.emit('error', err.list && err.list[0].message || err.message);
            }
        });
    }
    static _emitPastEvents(recordingStart, elapsedTime, recording, service, sockets) {
        const webSockets = Array.isArray(service[sockets]) ? service[sockets]
            : service[sockets] ? [service[sockets]]
                : [];
        if (!webSockets.length) {
            log_1.default.warn(`No client connections to ${service.name}`);
            return;
        }
        const eventsToEmit = [];
        recording.eventQueue.every(event => {
            const recordingDiff = event.ts - recordingStart;
            const inPast = recordingDiff < elapsedTime;
            log_1.default.debug('filepath ', event.filepath);
            log_1.default.debug(`diff < elapsedTime ${recordingDiff} < ${elapsedTime} evaluates to ${inPast}`);
            if (inPast) {
                eventsToEmit.push(event);
            }
            return inPast;
        });
        eventsToEmit.forEach(event => {
            log_1.default.debug(`Emitting filepath: ${event.filepath}`);
            log_1.default.debug('Emitting content', event.content);
            webSockets.forEach(socket => service.sendWsJson(socket, event.content));
            recording.emitted++;
        });
        recording.eventQueue = recording.eventQueue.slice(eventsToEmit.length);
        return eventsToEmit.length > 0;
    }
    _ended(elapsedTime) {
        log_1.default.info(`Event playback finished: ${this._playbackStop}`);
        this._recordingStop = this._recordings.reduce((latest, recording) => recording.lastTs > latest ? recording.lastTs : latest, 0);
        log_1.default.info(`Latest stop time: ${this._recordingStop}`);
        const recordingDuration = this._recordingStop - this._recordingStart;
        log_1.default.info(`Recording duration was: ${recordingDuration}`);
        const playbackDurationMs = this._playbackStop - this._playbackStart;
        log_1.default.info(`Playback duration was: ${playbackDurationMs}`);
        this._recordings.forEach(recording => {
            log_1.default.info(`${recording.name} recording failed to emit ${recording.loaded - recording.emitted} events and in its queue ${recording.eventQueue.length} remaining events`);
        });
        this.resumeServices();
        this.emit('ended', elapsedTime);
    }
}
exports.default = EventPlayback;

},{"../../FactoryDeps":3,"../../utils/robot-boot-time":112,"./log":86,"async-parallel":undefined,"events":undefined,"fs":undefined,"jibo-cai-utils":undefined,"os-homedir":undefined,"path":undefined}],86:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../../services/log");
exports.default = log_1.default.createChild('EventPlayback');

},{"../../services/log":51}],87:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const hub_client_1 = require("@jibo/hub-client");
const jetstream_client_1 = require("@jibo/jetstream-client");
const RegistryService_1 = require("../registry/RegistryService");
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_client_framework_1 = require("jibo-client-framework");
const jibo_typed_events_1 = require("jibo-typed-events");
const Turns_1 = require("./Turns");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const log_1 = require("./log");
var State;
(function (State) {
    State["CONNECTING_TO_CONTEXT"] = "CONNECTING_TO_CONTEXT";
    State["IDLE"] = "IDLE";
    State["GLOBAL_TURN"] = "GLOBAL_TURN";
    State["LOCAL_TURN"] = "LOCAL_TURN";
    State["VOICE_ENROLLMENT_TURN"] = "VOICE_ENROLLMENT_TURN";
    State["PRONUNCIATION_TURN"] = "PRONUNCIATION_TURN";
    State["WAITING_FOR_HUB"] = "WAITING_FOR_HUB";
    State["ERROR"] = "ERROR";
})(State = exports.State || (exports.State = {}));
var HJMode;
(function (HJMode) {
    HJMode["NORMAL_HJ"] = "NORMAL_HJ";
    HJMode["IGNORE_HJ"] = "IGNORE_HJ";
    HJMode["ONLY_HJ"] = "ONLY_HJ";
})(HJMode || (HJMode = {}));
const DEFAULT_LOCAL_TURN_TIMEOUTS = {
    sosTimeout: 6,
    maxSpeechTimeout: 15
};
const GLOBAL_TURN_TIMEOUTS = {
    sosTimeout: 4,
    maxSpeechTimeout: 15
};
const YES_NO_EOS = [
    'yes',
    'yep',
    'yeppers',
    'yeah',
    'sure',
    'no',
    'nah',
    'nope',
];
const HUB_OPTIONS = {
    hostname: 'localhost',
    path: null,
    port: 9000,
    auth: {
        secret: 'dev-hub-token-secret',
        credentials: {
            id: 'foo',
            accessKeyId: 'foo',
            secretAccessKey: 'foo',
            friendlyId: 'foo'
        }
    }
};
const CONTEXT_MSG = {
    runtime: {
        location: null,
        loop: null,
        character: null,
        perception: null,
        dialog: null
    },
    skill: null,
    general: {
        lang: undefined,
        remoteAddress: undefined,
        release: 'RELEASE_NOT_FOUND',
        accountID: undefined,
        robotID: undefined
    }
};
class Events extends jibo_typed_events_1.EventContainer {
    constructor() {
        super(...arguments);
        this.localTurnStarted = new jibo_typed_events_1.Event(`Starting local turn`);
        this.hjHeard = new jibo_typed_events_1.Event('Heard Hey Jibo');
    }
}
exports.Events = Events;
class JetstreamServiceSim extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('jetstream', options, rootDir);
        this.events = new Events();
        this.eventsClientSockets = [];
        this.vadClientSockets = [];
        this.state = State.IDLE;
        this.hjMode = HJMode.NORMAL_HJ;
        this.activeGlobalRules = [];
        this.activeExclusiveGlobalRules = [];
        this.timedOutWatingForContext = false;
        this.requestIDCounter = 0;
        this.wordsRecievedQueue = new jibo_cai_utils_1.PromiseQueue();
        this.jsOptions = options;
        JetstreamServiceSim._instance = this;
    }
    static get instance() {
        return JetstreamServiceSim._instance;
    }
    init(callback) {
        super.init((err) => {
            if (err) {
                callback(err);
            }
            else {
                this.connectToContextService();
                callback();
            }
        });
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        if (client.url === '/events') {
            this.eventsClientSockets.push(client);
        }
        else if (client.url === '/vad') {
            this.vadClientSockets.push(client);
        }
    }
    routes(url) {
        super.routes(url);
        url.post('/proactive/trigger', (req, res) => {
            this.prepareResponse(res);
            this.onProactiveTrigger(req, res);
        });
        url.post('/listen/mimic_global_turn', (req, res) => {
            this.prepareResponse(res);
            this.onMimicGlobalTurn(req, res);
        });
        url.post('/listen/start_local_turn', (req, res) => {
            this.prepareResponse(res);
            this.onStartLocalTurn(req, res);
        });
        url.post('/listen/cancel_local_turn', (req, res) => {
            this.prepareResponse(res);
            this.onCancelLocalTurn(req, res);
        });
        url.post('/listen/update_local_turn', (req, res) => {
            this.prepareResponse(res);
            this.onUpdateLocalTurn(req, res);
        });
        url.post('/listen/subscribe_global', (req, res) => {
            this.prepareResponse(res);
            this.onSubscribeGlobal(req, res);
        });
        url.post('/listen/unsubscribe_global', (req, res) => {
            this.prepareResponse(res);
            this.onUnsubscribeGlobal(req, res);
        });
        url.post('/listen/set_hj_mode', (req, res) => {
            this.prepareResponse(res);
            this.onSetHJMode(req, res);
        });
        url.post('/listen/get_hj_mode', (req, res) => {
            this.prepareResponse(res);
            this.onGetHJMode(req, res);
        });
        url.post('/listen/cancel_any_turn', (req, res) => {
            this.prepareResponse(res);
            this.onCancelAnyTurn(req, res);
        });
        url.post('/listen/unsubscribe_all_globals', (req, res) => {
            this.prepareResponse(res);
            this.onUnsubscribeAllGlobals(req, res);
        });
        url.post('/listen/start_enrollment_turn', (req, res) => {
            this.prepareResponse(res);
            this.onStartEnrollmentTurn(req, res);
        });
        url.post('/enroll/create_speaker_model', (req, res) => {
            this.prepareResponse(res);
            this.onCreateSpeakerModel(req, res);
        });
        url.post('/enroll/remove_speaker_model', (req, res) => {
            this.prepareResponse(res);
            this.onRemoveSpeakerModel(req, res);
        });
        url.post('/enroll/get_utterance_count', (req, res) => {
            this.prepareResponse(res);
            this.onGetUtteranceCount(req, res);
        });
        url.post('/enroll/get_enrolled_speakers', (req, res) => {
            this.prepareResponse(res);
            this.onGetEnrolledSpeakers(req, res);
        });
        url.post('/pronunciation/init_pronunciation_learning', (req, res) => {
            this.prepareResponse(res);
            this.onInitPronunciationLearning(req, res);
        });
        url.post('/listen/start_pronunciation_learning_turn', (req, res) => {
            this.prepareResponse(res);
            this.onStartPronunciationTurn(req, res);
        });
    }
    onWordsReceived(speech) {
        return __awaiter(this, void 0, void 0, function* () {
            this.wordsRecievedQueue.add(() => __awaiter(this, void 0, void 0, function* () {
                const text = speech.words.trim().toLowerCase();
                const containsHJ = (text.indexOf('hey jibo') >= 0);
                switch (this.state) {
                    case State.IDLE:
                        if (containsHJ && this.hjMode !== HJMode.IGNORE_HJ) {
                            yield this.startSpeechTurn({ speech, global: true });
                            yield this.updateSpeechTurn({ speech, global: true });
                        }
                        else if (text !== 'hey') {
                            log_1.default.warn(`Ignoring simulator text since no local listen session is active: `, speech.words);
                        }
                        break;
                    case State.LOCAL_TURN:
                        if (containsHJ) {
                            yield this.cancelSpeechTurn();
                            this.state = State.GLOBAL_TURN;
                            yield this.startSpeechTurn({ speech, global: true });
                        }
                    case State.GLOBAL_TURN:
                    case State.VOICE_ENROLLMENT_TURN:
                    case State.PRONUNCIATION_TURN:
                        yield this.updateSpeechTurn({ speech, global: this.state === State.GLOBAL_TURN });
                        break;
                    default:
                        log_1.default.warn(`Ignoring simulator text since we are not in a valid state '${this.state}': `, speech.words);
                }
            }));
        });
    }
    pause() {
        this.paused = true;
    }
    resume() {
        this.paused = false;
    }
    writeToJetStreamClient(event, suppressedEvents = []) {
        if (suppressedEvents.indexOf(event.type) >= 0) {
            return;
        }
        if (!this.paused) {
            const msg = JSON.stringify(event);
            this.eventsClientSockets.forEach(socket => socket.send(msg));
        }
    }
    onClose(client) {
        super.onClose(client);
        const eventsIndex = this.eventsClientSockets.indexOf(client);
        if (eventsIndex > -1) {
            this.eventsClientSockets.splice(eventsIndex, 1);
        }
        const vadIndex = this.vadClientSockets.indexOf(client);
        if (vadIndex > -1) {
            this.vadClientSockets.splice(vadIndex, 1);
        }
    }
    onMessage(command, client) {
        return;
    }
    cancelSpeechTurn() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.activeTurn) {
                this.activeTurn.close();
                this.activeTurn = null;
                this.state = State.IDLE;
            }
        });
    }
    getActiveGlobals(launchToAppend = []) {
        const reducer = (arr, item) => {
            arr.push(...item.rules);
            return arr;
        };
        if (this.activeExclusiveGlobalRules.length) {
            return this.activeExclusiveGlobalRules.reduce(reducer, []);
        }
        return this.activeGlobalRules.reduce(reducer, []).concat(launchToAppend);
    }
    startSpeechTurn(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            log_1.default.info(`startSpeechTurn `, options);
            let turn = this.activeTurn;
            const targetState = options.global ? State.GLOBAL_TURN : State.LOCAL_TURN;
            this.state = targetState;
            if (turn) {
                log_1.default.warn(`Hub session was already open when starting '${targetState}', stopping`);
                turn.close();
                turn = null;
            }
            log_1.default.info(`Starting '${this.state}'`);
            const requestID = options.global ? jetstream_client_1.types.GLOBAL_REQUEST : options.requestID;
            let suppressed = [];
            if (options.mimicGlobalOptions) {
                suppressed = options.mimicGlobalOptions.suppressedEvents;
            }
            else if (options.turnOptions) {
                suppressed = options.turnOptions.suppressedEvents;
            }
            if (options.global) {
                this.writeToJetStreamClient({
                    type: jetstream_client_1.types.ServiceEventType.HJ_HEARD,
                    requestID: requestID,
                    transID: '',
                    ts: Date.now(),
                    data: undefined
                }, suppressed);
                this.events.hjHeard.emit();
                if (this.hjMode === HJMode.ONLY_HJ && !options.mimicGlobalOptions) {
                    this.state = State.IDLE;
                    return;
                }
            }
            const listenOptions = {
                hotphrase: !!options.global,
                rules: options.global ? this.getActiveGlobals('launch') : this.getActiveGlobals(),
                mode: jetstream_client_1.types.ListenMessageMode.CLIENT_ASR,
                lang: 'en-US'
            };
            let earlyEOS;
            if (options.turnOptions) {
                if (options.turnOptions.ignoreGlobalRules) {
                    listenOptions.rules = [];
                }
                if (options.turnOptions.nluRules) {
                    listenOptions.rules = listenOptions.rules.concat(options.turnOptions.nluRules);
                }
                if (options.turnOptions.earlyEOS && options.turnOptions.earlyEOS.length) {
                    earlyEOS = options.turnOptions.earlyEOS;
                    if (earlyEOS.includes('$YESNO')) {
                        earlyEOS.splice(earlyEOS.indexOf('$YESNO'), 1, ...YES_NO_EOS);
                    }
                }
                if (options.turnOptions.clientNLU) {
                    options.nlu = options.turnOptions.clientNLU;
                    listenOptions.mode = jetstream_client_1.types.ListenMessageMode.CLIENT_NLU;
                }
                else if (options.turnOptions.clientASR) {
                    options.speech = {
                        words: options.turnOptions.clientASR,
                        final: true,
                        speaker: null,
                        speakerId: null,
                    };
                }
            }
            else if (options.mimicGlobalOptions) {
                if (options.mimicGlobalOptions.clientNLU) {
                    options.nlu = options.mimicGlobalOptions.clientNLU;
                    listenOptions.mode = jetstream_client_1.types.ListenMessageMode.CLIENT_NLU;
                }
                else if (options.mimicGlobalOptions.clientASR) {
                    options.speech = {
                        words: options.mimicGlobalOptions.clientASR,
                        final: true,
                        speaker: null,
                        speakerId: null,
                    };
                }
            }
            log_1.default.info(`Starting Hub session with options: `, listenOptions);
            const hubOptions = this.createHubOptions('/listen');
            const session = yield hub_client_1.Client.startListenSession(hubOptions, listenOptions);
            this.subscribeToCommonEvents(session, requestID, suppressed);
            const timeoutOpts = Object.assign({ earlyEOS }, options.global ? GLOBAL_TURN_TIMEOUTS : DEFAULT_LOCAL_TURN_TIMEOUTS, options.global ? {} : options.turnOptions);
            turn = this.activeTurn = new Turns_1.HubListenTurn(options.global ? State.GLOBAL_TURN : State.LOCAL_TURN, requestID, session, timeoutOpts, this);
            session.events.on('SOS', () => {
                log_1.default.info(`Received from hub 'SOS'`);
                this.writeToJetStreamClient({
                    type: jetstream_client_1.types.ServiceEventType.SOS,
                    requestID: requestID,
                    transID: session.transactionID,
                    ts: Date.now(),
                    data: undefined
                }, suppressed);
            });
            session.events.on('EOS', () => {
                log_1.default.info(`Received from hub 'EOS'`);
                this.writeToJetStreamClient({
                    type: jetstream_client_1.types.ServiceEventType.EOS,
                    requestID: requestID,
                    transID: session.transactionID,
                    ts: Date.now(),
                    data: undefined
                }, suppressed);
            });
            session.events.on('LISTEN', (data) => {
                log_1.default.info(`Received from hub 'LISTEN': `, data);
                let globalOverride = false;
                if (this.activeTurn && this.activeTurn.type === State.LOCAL_TURN && data.nlu && data.nlu.rules && data.nlu.rules.length) {
                    if (!this.ruleListContainsARule(options.turnOptions.nluRules, data.nlu.rules)) {
                        log_1.default.info('Local turn did not match a global rule, overriding as a global listen');
                        globalOverride = true;
                    }
                }
                if (globalOverride) {
                    this.writeToJetStreamClient({
                        type: jetstream_client_1.types.ServiceEventType.TURN_RESULT,
                        requestID: requestID,
                        transID: session.transactionID,
                        ts: Date.now(),
                        data: {
                            global: false,
                            status: jetstream_client_1.types.TurnResultType.INTERRUPTED
                        }
                    }, suppressed);
                    this.writeToJetStreamClient({
                        type: jetstream_client_1.types.ServiceEventType.TURN_RESULT,
                        requestID: jetstream_client_1.types.GLOBAL_REQUEST,
                        transID: session.transactionID,
                        ts: Date.now(),
                        data: {
                            global: true,
                            status: jetstream_client_1.types.TurnResultType.SUCCEEDED,
                            result: {
                                asr: data.asr,
                                nlu: data.nlu,
                                match: data.match
                            }
                        }
                    });
                }
                else {
                    this.writeToJetStreamClient({
                        type: jetstream_client_1.types.ServiceEventType.TURN_RESULT,
                        requestID: requestID,
                        transID: session.transactionID,
                        ts: Date.now(),
                        data: {
                            global: !!options.global,
                            status: jetstream_client_1.types.TurnResultType.SUCCEEDED,
                            result: {
                                asr: data.asr,
                                nlu: data.nlu,
                                match: data.match
                            }
                        }
                    }, suppressed);
                }
            });
            this.writeToJetStreamClient({
                type: jetstream_client_1.types.ServiceEventType.TURN_STARTED,
                transID: session.transactionID,
                requestID: requestID,
                ts: Date.now(),
                data: undefined,
            }, suppressed);
            const speakers = (options.speech && options.speech.speakerId) ? {
                accepted: [{
                        id: options.speech.speakerId,
                        high_confidence: true,
                        score: 1
                    }]
            } : undefined;
            if (speakers) {
                this.writeToJetStreamClient({
                    type: jetstream_client_1.types.ServiceEventType.SPEAKER_ID,
                    transID: session.transactionID,
                    requestID: requestID,
                    ts: Date.now(),
                    data: {
                        snr: 1,
                        speakers: speakers.accepted.map(accepted => {
                            return {
                                speaker: accepted.id,
                                score: accepted.score,
                                accepted: true,
                                high_confidence: accepted.high_confidence
                            };
                        })
                    }
                });
            }
            const context = Object.assign({}, CONTEXT_MSG, yield this.getContext(speakers));
            if (turn !== this.activeTurn) {
                return;
            }
            log_1.default.debug('Sending context message to hub', context);
            session.writeContext(context);
            yield this.updateSpeechTurn(options);
        });
    }
    updateSpeechTurn(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            log_1.default.info(`updateSpeechTurn `, options);
            let turn = this.activeTurn;
            if (turn) {
                try {
                    const complete = yield turn.update(options, this);
                    if (complete) {
                        this.activeTurn = null;
                        this.state = State.IDLE;
                    }
                }
                catch (error) {
                    log_1.default.error(error);
                    this.writeToJetStreamClient({
                        type: jetstream_client_1.types.ServiceEventType.ERROR,
                        transID: turn.transactionID,
                        requestID: turn.requestID,
                        ts: Date.now(),
                        data: {
                            message: error.message
                        }
                    });
                    this.activeTurn = null;
                    this.state = State.IDLE;
                }
            }
            else {
                log_1.default.error(`No active session`);
            }
        });
    }
    connectToContextService() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.timedOutWatingForContext) {
                return Promise.reject(`Timed out earlier when searching for Context Service`);
            }
            const oldState = this.state;
            this.state = State.CONNECTING_TO_CONTEXT;
            log_1.default.info(`Starting to look for the context service`);
            return new Promise((resolve, reject) => {
                let startTime = Date.now();
                let contextSrvCheckInterval = setInterval(() => {
                    const record = RegistryService_1.default.instance.registry.records.find(r => (r.name === 'context'));
                    if (record) {
                        log_1.default.info(`Found Context service at port ${record.port} after ${Date.now() - startTime} ms`);
                        clearInterval(contextSrvCheckInterval);
                        this.state = oldState;
                        this.contextClient = new jibo_client_framework_1.HTTPClient('127.0.0.1', record.port);
                        resolve();
                    }
                    else if (Date.now() - startTime > 20000) {
                        clearInterval(contextSrvCheckInterval);
                        this.state = State.ERROR;
                        this.timedOutWatingForContext = true;
                        reject(new Error(`Timeout in Jetstream sim waiting for context service`));
                    }
                }, 100);
            });
        });
    }
    getContext(speakers, omitLoop = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.contextClient) {
                    reject(new Error(`Context client not ready`));
                }
                else {
                    this.contextClient.sendRequest('POST', '/context', JSON.stringify({ speakers, omitLoop }), (error, response) => {
                        if (error) {
                            if (error.message.indexOf('ECONNREFUSED') >= 0) {
                                log_1.default.warn(`Context service down, trying to reconnect`);
                                this.connectToContextService()
                                    .then(() => this.getContext(speakers, omitLoop))
                                    .then(resolve)
                                    .catch(reject);
                            }
                            else {
                                reject(new Error(`Error retrieving context: ${error.message}`));
                            }
                        }
                        else {
                            resolve(response);
                        }
                    });
                }
            });
        });
    }
    createRequestID() {
        return `rid:${this.requestIDCounter++}`;
    }
    prepareResponse(res) {
        res.setHeader('Content-Type', 'application/json');
    }
    onProactiveTrigger(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            log_1.default.info(`Got proactive trigger request`);
            const requestID = this.createRequestID();
            res.end(JSON.stringify({
                requestID,
            }));
            const hubOptions = this.createHubOptions('/proactive');
            try {
                this.activeProactiveSession = yield hub_client_1.Client.startProactiveSession(hubOptions, req.body);
                this.subscribeToCommonEvents(this.activeProactiveSession, requestID);
                this.activeProactiveSession.events.on('PROACTIVE', (data) => {
                    log_1.default.info(`Received from hub 'PROACTIVE': `, data);
                    this.writeToJetStreamClient({
                        type: jetstream_client_1.types.ServiceEventType.PROACTIVE,
                        requestID: requestID,
                        transID: this.activeProactiveSession.transactionID,
                        ts: Date.now(),
                        data: data
                    });
                });
                const context = Object.assign({}, CONTEXT_MSG, yield this.getContext());
                log_1.default.debug('Sending context message to hub', context);
                this.activeProactiveSession.writeContext(context);
            }
            catch (error) {
                const transID = this.activeProactiveSession ? this.activeProactiveSession.transactionID : null;
                this.emitError(error, transID, requestID);
            }
        });
    }
    subscribeToCommonEvents(session, requestID, suppressed) {
        session.events.on('SKILL_ACTION', (data) => {
            log_1.default.info(`Received from hub 'SKILL_ACTION': `, data);
            this.writeToJetStreamClient({
                type: jetstream_client_1.types.ServiceEventType.SKILL_ACTION,
                requestID: requestID,
                transID: session.transactionID,
                ts: Date.now(),
                data
            }, suppressed);
        });
        session.events.on('SKILL_REDIRECT', (data) => {
            log_1.default.info(`Received from hub 'SKILL_REDIRECT': `, data);
            this.writeToJetStreamClient({
                type: jetstream_client_1.types.ServiceEventType.SKILL_REDIRECT,
                requestID: requestID,
                transID: session.transactionID,
                ts: Date.now(),
                data
            }, suppressed);
        });
        session.events.on('ERROR', error => log_1.default.error(error));
    }
    createHubOptions(path) {
        const options = Object.assign({}, HUB_OPTIONS, { path });
        if (process.env.JetstreamSim_hubHost) {
            options.hostname = process.env.JetstreamSim_hubHost;
        }
        else if (this.jsOptions.hubHost) {
            options.hostname = this.jsOptions.hubHost;
        }
        const envHubPort = Number.parseInt(process.env.JetstreamSim_hubPort);
        if (Number.isFinite(envHubPort)) {
            options.port = envHubPort;
        }
        else if (typeof this.jsOptions.hubPort === 'number') {
            options.port = this.jsOptions.hubPort;
        }
        const secretToUse = process.env.ETCO_server_hubTokenSecret || this.jsOptions.secret;
        if (secretToUse && (typeof options.auth !== 'string')) {
            options.auth.secret = secretToUse;
        }
        return options;
    }
    emitError(error, transID, requestID) {
        log_1.default.error(error);
        this.writeToJetStreamClient({
            type: jetstream_client_1.types.ServiceEventType.ERROR,
            transID: transID,
            requestID: requestID,
            ts: Date.now(),
            data: JSON.stringify({
                message: error.message
            })
        });
    }
    onMimicGlobalTurn(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            log_1.default.info(`onMimicGlobalTurn: `, req.body);
            const requestID = this.createRequestID();
            res.end(JSON.stringify({
                requestID
            }));
            yield this.cancelSpeechTurn();
            this.state = State.GLOBAL_TURN;
            yield this.startSpeechTurn({ turnOptions: req.body, global: true, requestID });
        });
    }
    onStartLocalTurn(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            log_1.default.info(`onStartLocalTurn: `, req.body);
            if (this.state === State.IDLE) {
                const requestID = this.createRequestID();
                res.end(JSON.stringify({
                    requestID
                }));
                yield this.startSpeechTurn({ turnOptions: req.body, requestID });
                this.events.localTurnStarted.emit();
            }
            else {
                log_1.default.info(`Skipping since state is not Idle: '${this.state}'`);
                res.statusCode = 503;
                res.statusMessage = 'BUSY';
                res.end(JSON.stringify({}));
            }
        });
    }
    onCancelLocalTurn(req, res) {
        log_1.default.info(`onCancelLocalTurn: `, req.body);
        if (this.activeTurn && this.state !== State.GLOBAL_TURN) {
            const activeRequestID = this.activeTurn.requestID;
            if (!req.body.requestID) {
                log_1.default.warn(`Missing requestID`);
            }
            else if (req.body.requestID !== activeRequestID) {
                log_1.default.warn(`Supplied requestID '${req.body.requestID}' not equal to active requestID '${activeRequestID}'`);
            }
            else {
                this.activeTurn.close();
                this.activeTurn = null;
                this.state = State.IDLE;
            }
        }
        else if (!this.activeTurn) {
            log_1.default.warn(`No active local session to cancel`);
        }
        else {
            log_1.default.warn(`Can't cancel local turn in state '${this.state}'`);
        }
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({}));
    }
    onUpdateLocalTurn(req, res) {
        log_1.default.info(`onUpdateLocalTurn: `, req.body);
        if (this.activeTurn && this.state === State.LOCAL_TURN) {
            const activeRequestID = this.activeTurn.requestID;
            if (!req.body.requestID) {
                log_1.default.warn(`Missing requestID`);
            }
            else if (req.body.requestID !== activeRequestID) {
                log_1.default.warn(`Supplied requestID '${req.body.requestID}' not equal to active requestID '${activeRequestID}'`);
            }
            else if (!req.body.clientNLU && !req.body.clientASR) {
                log_1.default.warn(`Request did not contain clientNLU or clientASR`, req.body);
            }
            else {
                const body = req.body;
                const speech = {};
                if (body.clientNLU) {
                    speech.nlu = body.clientNLU;
                }
                else {
                    speech.speech = {
                        words: body.clientASR,
                        final: true,
                        speaker: null,
                        speakerId: null,
                    };
                }
                this.updateSpeechTurn(speech);
            }
        }
        if (!this.activeTurn) {
            log_1.default.warn(`No active local session to update`);
        }
        else {
            log_1.default.warn(`Can't update local turn in state '${this.state}'`);
        }
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({}));
    }
    onSubscribeGlobal(req, res) {
        log_1.default.info(`onSubscribeGlobal: `, req.body);
        const requestID = String(this.requestIDCounter++);
        const body = req.body;
        const sub = {
            rules: body.nluRules,
            requestID
        };
        if (body.exclusive) {
            this.activeExclusiveGlobalRules.push(sub);
        }
        else {
            this.activeGlobalRules.push(sub);
        }
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({ requestID }));
    }
    onUnsubscribeGlobal(req, res) {
        log_1.default.info(`onUnsubscribeGlobal: `, req.body);
        const requestID = req.body.requestID;
        let index = this.activeGlobalRules.findIndex(item => item.requestID === requestID);
        if (index > -1) {
            this.activeGlobalRules.splice(index, 1);
        }
        index = this.activeExclusiveGlobalRules.findIndex(item => item.requestID === requestID);
        if (index > -1) {
            this.activeExclusiveGlobalRules.splice(index, 1);
        }
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({}));
    }
    onUnsubscribeAllGlobals(req, res) {
        log_1.default.info(`onUnsubscribeAllGlobals: `, req.body);
        this.activeGlobalRules.length = 0;
        this.activeExclusiveGlobalRules.length = 0;
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({}));
    }
    onSetHJMode(req, res) {
        const mode = req.body.mode;
        if (mode === HJMode.IGNORE_HJ || mode === HJMode.NORMAL_HJ || mode === HJMode.ONLY_HJ) {
            this.hjMode = mode;
            res.statusCode = 200;
            res.statusMessage = 'OK';
            res.end(JSON.stringify({}));
        }
        else {
            const message = `Invalid HJ mode`;
            log_1.default.warn(message, mode);
            res.statusCode = 400;
            res.statusMessage = message;
            res.end(JSON.stringify({
                status: 'Failure'
            }));
        }
    }
    onGetHJMode(req, res) {
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({
            mode: this.hjMode
        }));
    }
    onCancelAnyTurn(req, res) {
        if (this.activeTurn) {
            this.activeTurn.close();
            this.activeTurn = null;
        }
        this.state = State.IDLE;
        const message = 'OK';
        res.statusCode = 200;
        res.statusMessage = message;
        res.end(JSON.stringify({
            status: message
        }));
    }
    ruleListContainsARule(list, comparison) {
        if (!list || !list.length || !comparison || !comparison.length) {
            return false;
        }
        for (let i = 0; i < comparison.length; ++i) {
            if (list.includes(comparison[i])) {
                return true;
            }
        }
        return false;
    }
    onStartEnrollmentTurn(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            log_1.default.info(`onStartEnrollmentTurn: `, req.body);
            if (this.state === State.IDLE) {
                const requestID = this.createRequestID();
                res.end(JSON.stringify({
                    requestID
                }));
                this.state = State.VOICE_ENROLLMENT_TURN;
                this.activeTurn = new Turns_1.EnrollmentTurn(requestID, req.body);
            }
            else {
                log_1.default.info(`Skipping since state is not Idle: '${this.state}'`);
                res.statusCode = 503;
                res.statusMessage = 'BUSY';
                res.end(JSON.stringify({}));
            }
        });
    }
    onCreateSpeakerModel(req, res) {
        log_1.default.info(`onCreateSpeakerModel: `, req.body);
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({}));
    }
    onRemoveSpeakerModel(req, res) {
        log_1.default.info(`onRemoveSpeakerModel: `, req.body);
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({}));
    }
    onGetUtteranceCount(req, res) {
        log_1.default.info(`onGetUtteranceCount: `, req.body);
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({ utterance_count: 0 }));
    }
    onGetEnrolledSpeakers(req, res) {
        log_1.default.info(`onGetEnrolledSpeakers: `, req.body);
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({ speakers: [] }));
    }
    onInitPronunciationLearning(req, res) {
        log_1.default.info(`onInitPronunciationLearning: `, req.body);
        this.currentWordToLearn = req.body.word_to_learn;
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.end(JSON.stringify({}));
    }
    onStartPronunciationTurn(req, res) {
        log_1.default.info(`onStartPronunciationTurn: `, req.body);
        if (this.state === State.IDLE && this.currentWordToLearn === req.body.word_to_learn) {
            const requestID = this.createRequestID();
            res.end(JSON.stringify({
                requestID
            }));
            this.state = State.PRONUNCIATION_TURN;
            this.activeTurn = new Turns_1.PronunciationTurn(requestID, req.body);
        }
        else {
            log_1.default.info(`Skipping since state is not Idle: '${this.state}'`);
            res.statusCode = 503;
            res.statusMessage = 'BUSY';
            res.end(JSON.stringify({}));
        }
    }
}
exports.default = JetstreamServiceSim;

},{"../registry/RegistryService":96,"./Turns":88,"./log":89,"@jibo/hub-client":undefined,"@jibo/jetstream-client":undefined,"jibo-cai-utils":undefined,"jibo-client-framework":undefined,"jibo-service-framework":undefined,"jibo-typed-events":undefined}],88:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jetstream_client_1 = require("@jibo/jetstream-client");
const JetstreamServiceSim_1 = require("./JetstreamServiceSim");
const log_1 = require("./log");
const log = log_1.default.createChild('Turns');
class Turn {
    constructor(type, id) {
        this.type = type;
        this.requestID = id;
    }
}
exports.Turn = Turn;
class HubListenTurn extends Turn {
    get global() {
        return this.type === JetstreamServiceSim_1.State.GLOBAL_TURN;
    }
    get transactionID() {
        return this.session.transactionID;
    }
    constructor(type, id, session, timeouts, sim) {
        super(type, id);
        this.timeout = this.timeout.bind(this);
        this.sim = sim;
        this.session = session;
        if (timeouts.earlyEOS) {
            this.earlyEOS = timeouts.earlyEOS.map((word) => {
                return new RegExp(`\\b${word}\\b`);
            });
        }
        else {
            this.earlyEOS = null;
        }
        this.maxSpeechTimeout = timeouts.maxSpeechTimeout * 1000;
        this.hasSpeech = false;
        const sosTimeout = timeouts.sosTimeout * 1000;
        this.activeTimeout = setTimeout(this.timeout, sosTimeout);
    }
    close() {
        this.clearTimeout();
        return this.session.close();
    }
    update(options, sim) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.nlu) {
                this.clearTimeout();
                log.info(`Received final nlu, sending fake NLU to hub`);
                this.session.writeClientNLU(options.nlu);
                yield this.session.transactionDone;
                log.info(`Hub transaction completed`);
                return true;
            }
            else if (options.speech) {
                let words = options.speech.words;
                if (options.global) {
                    words = words.replace('hey jibo', '').trim();
                }
                if (words.length && !this.hasSpeech) {
                    this.hasSpeech = true;
                    this.clearTimeout();
                    this.activeTimeout = setTimeout(this.timeout, this.maxSpeechTimeout);
                }
                if (!options.speech.final && this.earlyEOS) {
                    options.speech.final = this.earlyEOS.some(regex => regex.test(words));
                }
                if (options.speech.final && words.length > 1) {
                    this.clearTimeout();
                    log.info(`Received final speech, sending fake ASR to hub`);
                    this.session.writeClientASR(words);
                    yield this.session.transactionDone;
                    log.info(`Hub transaction completed`);
                    return true;
                }
            }
            return false;
        });
    }
    timeout() {
        this.sim.writeToJetStreamClient({
            type: jetstream_client_1.types.ServiceEventType.TURN_RESULT,
            requestID: this.requestID,
            transID: this.session.transactionID,
            ts: Date.now(),
            data: {
                global: this.type === JetstreamServiceSim_1.State.GLOBAL_TURN,
                status: jetstream_client_1.types.TurnResultType.TIMEOUT
            }
        });
        this.sim.cancelSpeechTurn();
    }
    clearTimeout() {
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
    }
}
exports.HubListenTurn = HubListenTurn;
class EnrollmentTurn extends Turn {
    constructor(id, options) {
        super(JetstreamServiceSim_1.State.VOICE_ENROLLMENT_TURN, id);
        this.speaker = options.speakerID;
        this.hjCount = options.number_of_utterances;
        this.totalCount = this.goodCount = 0;
    }
    close() {
    }
    update(options, sim) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.speech || !options.speech.final) {
                return false;
            }
            const words = options.speech.words;
            let output;
            if (words.includes('hey jibo')) {
                this.goodCount++;
                this.totalCount++;
                output = {
                    speaker: this.speaker,
                    snr: 0,
                    accepted: true,
                    problems: [],
                    good_utterance_count: this.goodCount,
                    total_utterance_count: this.totalCount,
                    final: this.goodCount === this.hjCount
                };
            }
            else {
                this.totalCount++;
                const problems = [];
                if (words === '') {
                    problems.push('NOT_SPEECH_LIKE');
                }
                else {
                    problems.push('POOR_SNR');
                }
                output = {
                    speaker: this.speaker,
                    snr: 0,
                    accepted: false,
                    problems,
                    good_utterance_count: this.goodCount,
                    total_utterance_count: this.totalCount,
                    final: this.goodCount === this.hjCount
                };
            }
            sim.writeToJetStreamClient({
                type: jetstream_client_1.types.ServiceEventType.SPEAKER_ENROLLMENT,
                transID: undefined,
                requestID: this.requestID,
                ts: Date.now(),
                data: output
            });
            const complete = this.goodCount === this.hjCount;
            if (complete) {
                sim.writeToJetStreamClient({
                    type: jetstream_client_1.types.ServiceEventType.TURN_RESULT,
                    transID: undefined,
                    requestID: this.requestID,
                    ts: Date.now(),
                    data: {
                        global: false,
                        status: jetstream_client_1.types.TurnResultType.SUCCEEDED,
                        result: {}
                    }
                });
            }
            return complete;
        });
    }
}
exports.EnrollmentTurn = EnrollmentTurn;
class PronunciationTurn extends Turn {
    constructor(id, options) {
        super(JetstreamServiceSim_1.State.PRONUNCIATION_TURN, id);
        this.wordToLearn = options.word_to_learn;
    }
    close() {
    }
    update(options, sim) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.speech || !options.speech.final) {
                return false;
            }
            const words = options.speech.words;
            if (words.toLowerCase() === this.wordToLearn.toLowerCase()) {
                sim.writeToJetStreamClient({
                    type: jetstream_client_1.types.ServiceEventType.TURN_RESULT,
                    transID: undefined,
                    requestID: this.requestID,
                    ts: Date.now(),
                    data: {
                        global: false,
                        status: jetstream_client_1.types.TurnResultType.SUCCEEDED,
                        message: words
                    }
                });
            }
            else {
                sim.writeToJetStreamClient({
                    type: jetstream_client_1.types.ServiceEventType.TURN_RESULT,
                    transID: undefined,
                    requestID: this.requestID,
                    ts: Date.now(),
                    data: {
                        global: false,
                        status: jetstream_client_1.types.TurnResultType.FAILED,
                        message: 'wrong word'
                    }
                });
            }
            return true;
        });
    }
}
exports.PronunciationTurn = PronunciationTurn;

},{"./JetstreamServiceSim":87,"./log":89,"@jibo/jetstream-client":undefined}],89:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
const log = log_1.default.createChild('Jetstream');
exports.default = log;

},{"../log":90}],90:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Sim');

},{"../log":20}],91:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const VisualAwareness_1 = require("./VisualAwareness");
let audioEntityIndex = 0;
class AudioEntity {
    constructor(type = 0) {
        this.position = new VisualAwareness_1.Point3();
        this.confidence = 1;
        this.type = type;
        const now = process.hrtime();
        this.ts = [now[0], Math.round(now[1] / 1000)];
        this.id = audioEntityIndex++;
    }
    updatePosition(point) {
        this.position.x = point.x;
        this.position.y = point.y;
        this.position.z = point.z;
    }
}
exports.AudioEntity = AudioEntity;
class AudioAwareness {
    constructor() {
        this.entities = [];
    }
}
exports.default = AudioAwareness;

},{"./VisualAwareness":93}],92:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const VisualAwareness_1 = require("./VisualAwareness");
const AudioAwareness_1 = require("./AudioAwareness");
const VisualAwareness_2 = require("./VisualAwareness");
const AudioAwareness_2 = require("./AudioAwareness");
const VisualAwareness_3 = require("./VisualAwareness");
const jibo_service_framework_1 = require("jibo-service-framework");
const animation_utilities_1 = require("animation-utilities");
const log_1 = require("../log");
const log = log_1.default.createChild('LPS');
const performance = {
    now: () => {
        const time = process.hrtime();
        return time[0] * 1000 + time[1] / 1000000;
    }
};
class LPSService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('lps', options, rootDir);
        this.visualAwareness = new VisualAwareness_1.default();
        this.audioAwareness = new AudioAwareness_1.default();
        if (LPSService._instance) {
            throw new Error('Cannot instantiate LPSService more than once');
        }
        LPSService._instance = this;
        this.onBarcode = this.onBarcode.bind(this);
        this.onDemandDetect = this.onDemandDetect.bind(this);
        this.onFaces = this.onFaces.bind(this);
        this.update = this.update.bind(this);
        log.info("Instantiated");
    }
    static get instance() {
        return LPSService._instance;
    }
    init(callback) {
        super.init((err) => {
            this.lastUpdate = performance.now();
            this.updateLoop = setTimeout(this.update, 100);
            log.info('Initialized');
            callback(err);
        });
    }
    pause() {
        if (this.updateLoop) {
            log.info('Pausing LPSService');
            clearTimeout(this.updateLoop);
            this.updateLoop = null;
        }
    }
    resume() {
        if (!this.updateLoop) {
            log.info('Resuming LPSService');
            this.updateLoop = setTimeout(this.update, 100);
        }
    }
    getVisualEntityFromId(id) {
        let ent;
        this.visualAwareness.entities.forEach((entity) => {
            if (entity.id === id) {
                ent = entity;
            }
        });
        return ent;
    }
    triggerSimulatedHJEvent() {
        const audioEntity = new AudioAwareness_2.AudioEntity(1);
        const fakePos = new VisualAwareness_3.Point3();
        fakePos.x = 1;
        fakePos.y = 0;
        fakePos.z = 0.7;
        audioEntity.updatePosition(fakePos);
        if (!this.oneTimeAudioAwareness) {
            this.oneTimeAudioAwareness = new AudioAwareness_1.default();
        }
        this.oneTimeAudioAwareness.entities.push(audioEntity);
    }
    triggerAudioEvent(position) {
        let audioEntity = new AudioAwareness_2.AudioEntity();
        audioEntity.updatePosition(position);
        audioEntity.confidence = 100;
        this.audioAwareness.entities.push(audioEntity);
        this.currentAudioId = audioEntity.id;
        this.emit('audio-event-start', position, audioEntity.id);
    }
    triggerAudioEventEnd() {
        let tempId = this.currentAudioId;
        this.emit('audio-event-end', tempId);
        setTimeout(() => {
            this.removeAudioEntityById(tempId);
        }, 3000);
    }
    getAudioEntityFromId(id) {
        for (let i = 0; i < this.audioAwareness.entities.length; i++) {
            if (this.audioAwareness.entities[i].id === id) {
                return this.audioAwareness.entities[i];
            }
        }
    }
    getAudioEntities() {
        return this.audioAwareness.entities;
    }
    removeAudioEntityById(id) {
        let iter = -1;
        for (let i = 0; i < this.audioAwareness.entities.length; i++) {
            if (this.audioAwareness.entities[i].id === id) {
                iter = i;
                break;
            }
        }
        if (iter !== -1) {
            this.audioAwareness.entities.splice(iter, 1);
            return true;
        }
        return false;
    }
    onVisualEntityAudio(id) {
        let visualEntity = this.getVisualEntityFromId(id);
        this.triggerAudioEvent(visualEntity.position);
    }
    setTargetId(id, value) {
        this.visualAwareness.entities.forEach((entity) => {
            if (entity.id === id) {
                entity.id = value;
            }
        });
    }
    getEntities() {
        return this.visualAwareness.entities;
    }
    updateTarget(target) {
        let ent = this.getVisualEntityFromId(target.id);
        if (!ent) {
            ent = new VisualAwareness_2.Entity(target);
            this.visualAwareness.entities.push(ent);
        }
        let ts = animation_utilities_1.Clock.currentTime()._timestamp;
        let needVATSUpdate = ent.updatePosition(target, ts);
        if (needVATSUpdate) {
            this.visualAwareness.updateTimestamp(ts);
        }
        this.emit('update', target);
    }
    removeEntity(id) {
        let index;
        for (let i = 0; i < this.visualAwareness.entities.length; i++) {
            if (this.visualAwareness.entities[i].id === id) {
                index = i;
                break;
            }
        }
        if (index || index === 0) {
            this.visualAwareness.entities.splice(index, 1);
        }
    }
    onMessage(command, client) {
        return;
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        if (client.url === '/lps/visual_awareness') {
            this.visualSocket = client;
        }
        else if (client.url === '/lps/audible_awareness') {
            this.audibleSocket = client;
        }
    }
    onClose(client) {
        if (client === this.audibleSocket) {
            this.audibleSocket = undefined;
        }
        else if (client === this.visualSocket) {
            this.visualSocket = undefined;
        }
    }
    routes(url) {
        super.routes(url);
        url.post('/lps/barcode', this.onBarcode);
        url.post('/lps/demand_detect', this.onDemandDetect);
        url.post('/lps/faces', this.onFaces);
    }
    onFaces(req, res) {
        res.writeHead(200, { 'Content-Type': 'json' });
        res.end(JSON.stringify(this.visualAwareness.entities));
    }
    onBarcode(req, res) {
        this.finishNoContent(res, 200);
    }
    onDemandDetect(req, res) {
        res.writeHead(200, { 'Content-Type': 'json' });
        res.end(0);
    }
    update(force = false) {
        this.updateLoop = setTimeout(this.update, 100);
        let now = performance.now();
        if (now - this.lastUpdate >= 100 || force) {
            this.lastUpdate = now;
            if (this.visualSocket) {
                this.sendWsJson(this.visualSocket, this.visualAwareness);
            }
            if (this.audibleSocket) {
                if (this.oneTimeAudioAwareness) {
                    this.oneTimeAudioAwareness.entities =
                        this.oneTimeAudioAwareness.entities.concat(this.audioAwareness.entities);
                    this.sendWsJson(this.audibleSocket, this.oneTimeAudioAwareness);
                    this.oneTimeAudioAwareness = null;
                }
                else {
                    this.sendWsJson(this.audibleSocket, this.audioAwareness);
                }
            }
        }
    }
}
exports.default = LPSService;

},{"../log":90,"./AudioAwareness":91,"./VisualAwareness":93,"animation-utilities":undefined,"jibo-service-framework":undefined}],93:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let entityIndex = 0;
class Point2 {
    constructor(point) {
        this.x = 0;
        this.y = 0;
        if (point) {
            this.x = point.x;
            this.y = point.y;
        }
    }
}
exports.Point2 = Point2;
class Point3 extends Point2 {
    constructor(point) {
        super(point);
        this.z = 0;
        if (point) {
            this.z = point.z;
        }
    }
}
exports.Point3 = Point3;
class Ray {
    constructor(target) {
        this.origin = new Point3();
        this.dir = new Point3();
        this.cameraId = 0;
        this.tag = "";
        this.timestamp = [0, 0];
        this.dir.x = target.x;
        this.dir.y = target.y;
        this.dir.z = target.z;
    }
}
exports.Ray = Ray;
class Tracker3D {
    constructor() {
        this.position = new Point3();
        this.rotation = new Point3();
        this.velocity = new Point3();
        this.angVelocity = new Point3();
    }
}
exports.Tracker3D = Tracker3D;
class Covariance {
    constructor() {
        this.n11 = 0;
        this.n12 = 0;
        this.n21 = 0;
        this.n22 = 0;
    }
}
exports.Covariance = Covariance;
class Rectangle {
    constructor() {
        this.left = 0;
        this.top = 0;
        this.right = 0;
        this.bottom = 0;
    }
}
exports.Rectangle = Rectangle;
class Tracker2D {
    constructor(target) {
        this.id = 0;
        this.cameraId = 0;
        this.confidence = 0;
        this.covariance = new Covariance();
        this.rectangle = new Rectangle();
        this.velocity = new Point2();
        this.inFOV = true;
        this.occluded = false;
        this.lastUpdate = [0, 0];
        this.name = '';
        this.needModelUpdate = false;
        this.id = (target.id === undefined) ? 0 : target.id;
    }
}
exports.Tracker2D = Tracker2D;
class TagEntry {
    constructor() {
        this.ts = [0, 0];
        this.confidence = 0;
    }
}
exports.TagEntry = TagEntry;
class Tag {
}
exports.Tag = Tag;
class Detection {
    constructor() {
        this.confidence = 1;
        this.timestamp = [0, 0];
    }
}
exports.Detection = Detection;
class PartEntry {
    constructor(target) {
        this.id = 0;
        this.confidence = 0;
        this.occluded = false;
        this.tracker = new Tracker3D();
        this.extent = new Point3();
        this.rays = [];
        this.trackers = [];
        this.detections = [];
        this.id = (target.id === undefined) ? 0 : target.id;
        this.rays = [new Ray(target)];
        this.trackers = [new Tracker2D(target)];
        this.detections = [new Detection()];
    }
}
exports.PartEntry = PartEntry;
class Part {
    constructor(target) {
        this.key = "";
        this.value = new PartEntry(target);
    }
}
exports.Part = Part;
class Entity {
    constructor(target) {
        this.id = 0;
        this.confidence = 1;
        this.description = '';
        this.orientation = new Point3();
        this.extent = new Point3();
        this.static = false;
        this.occluded = false;
        this.in_fov = false;
        this.last_measured = [0, 0];
        this.tags = [];
        this.parts = [];
        this.id = target.id === undefined ? entityIndex++ : target.id;
        this.position = new Point3(target);
        this.parts = [new Part(target)];
        this.confidence = 1.0;
        this.description = "vision";
    }
    updatePosition(point, timestamp) {
        let newPos = false;
        if (this.position.x !== point.x ||
            this.position.y !== point.y ||
            this.position.z !== point.z) {
            newPos = true;
        }
        this.position.x = point.x;
        this.position.y = point.y;
        this.position.z = point.z;
        this.parts[0].value.rays[0].dir.x = point.x;
        this.parts[0].value.rays[0].dir.y = point.y;
        this.parts[0].value.rays[0].dir.z = point.z;
        function copyTS(dest) {
            dest[0] = timestamp[0];
            dest[1] = timestamp[1];
        }
        if (newPos) {
            copyTS(this.last_measured);
            let ray = this.parts[0].value.rays[0];
            copyTS(ray.timestamp);
            let tracker = this.parts[0].value.trackers[0];
            copyTS(tracker.lastUpdate);
            let detection = this.parts[0].value.detections[0];
            copyTS(detection.timestamp);
        }
        return newPos;
    }
}
exports.Entity = Entity;
class VisualAwareness {
    constructor() {
        this.ts = [0, 0];
        this.entities = [];
    }
    addTarget(target) {
        this.entities.push(new Entity(target));
    }
    updateTimestamp(timestamp) {
        this.ts[0] = timestamp[0];
        this.ts[1] = timestamp[1];
    }
}
exports.default = VisualAwareness;

},{}],94:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const findRoot = require("find-root");
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_server_1 = require("../../clients/jibo-server");
const fs = require("fs");
const mkdirp = require("mkdirp");
const uuid = require("uuid");
const jimp = require("jimp");
const async = require("async");
const log_1 = require("../log");
const log = log_1.default.createChild('MediaService');
class MediaService extends jibo_service_framework_1.HTTPService {
    constructor(options, rootDir) {
        super('media', options, rootDir);
        this.options = options;
        if (MediaService._instance) {
            throw new Error('Cannot instantiate MediaService more than once');
        }
        MediaService._instance = this;
        this.onPhoto = this.onPhoto.bind(this);
        this.onPhotoStore = this.onPhotoStore.bind(this);
        this.onPhotoGet = this.onPhotoGet.bind(this);
        this.contentIds = [];
        this.recordings = [];
        log.info('Instantiated');
    }
    static get instance() {
        return MediaService._instance;
    }
    init(callback) {
        super.init((err) => {
            log.info('Initialized');
            callback(err);
        });
    }
    routes(url) {
        super.routes(url);
        url.post('/media/photo', this.onPhoto);
        url.get('/media/photo', this.onPhotoGet);
        url.post('/media/photo/store', this.onPhotoStore);
        url.get('/media/photo/get', this.onPhotoGet);
        url.post('/media/recording/start', this.onRecordingStart.bind(this));
        url.post('/media/recording/control', this.onRecordingStop.bind(this));
        url.post('/media/recording/play', this.onRecordingPlay.bind(this));
    }
    getRequestData(req, callback) {
        let chunk = "";
        if (req.readable) {
            req.on('data', data => chunk += data);
            req.on('end', () => {
                let data;
                let err;
                try {
                    data = JSON.parse(chunk);
                }
                catch (e) {
                    err = e;
                }
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, data);
                }
            });
        }
        else {
            callback(null, req.body);
        }
    }
    get mediaRootDir() {
        let root = path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'photos');
        return root;
    }
    writeImage(id, filePath, size, callback) {
        let filename = path.join(this.mediaRootDir, `${id}.jpg`);
        jimp.read(filePath, (err, image) => {
            if (err) {
                return callback(err);
            }
            image.resize(size[0], size[1]).write(filename, callback);
        });
    }
    onPhoto(req, res) {
        let contentId = uuid.v4();
        this.contentIds.push(contentId);
        let json = {
            id: contentId,
            width: 1920,
            height: 1080,
            expiration: Date.now() + (60 * 1000),
            stored: false
        };
        this.lastPicturePath = this.getFakeSourceFilename(contentId);
        this.sendJson(res, json, 200);
    }
    onPhotoStore(req, res) {
        this.getRequestData(req, (err, data) => {
            this.emit('on-photo-store', data);
            let contentId;
            let img;
            if (data.buffer) {
                contentId = uuid.v4();
                img = data.buffer;
            }
            else if (data.id) {
                contentId = data.id;
                if (this.contentIds.indexOf(contentId) >= 0) {
                    let filename = this.getFakeSourceFilename(contentId);
                    img = fs.readFileSync(filename);
                    for (let n = this.contentIds.length; n > 0; n--) {
                        if (this.contentIds[n - 1] === contentId) {
                            this.contentIds.splice(n - 1, 1);
                        }
                    }
                }
                else {
                    return this.sendJson(res, { error: 'unknown content id' }, 500);
                }
            }
            else {
                return this.sendJson(res, { error: 'must specify buffer or id' }, 500);
            }
            this.photoStore(contentId, img, data.thumbnails, (err, ret) => {
                if (err) {
                    this.sendJson(res, { error: err.message }, 500);
                }
                else {
                    this.sendJson(res, ret, 200);
                }
            });
        });
    }
    photoStore(contentId, img, thumbnails, callback) {
        if (!fs.existsSync(this.mediaRootDir)) {
            mkdirp.sync(this.mediaRootDir);
        }
        let ret = {
            id: contentId,
            thumbnails: {}
        };
        let filename = path.join(this.mediaRootDir, `${ret.id}.jpg`);
        fs.writeFile(filename, img, { encoding: 'base64' }, (err) => {
            if (err) {
                return callback(err);
            }
            let tasks = [];
            Object.keys(thumbnails).forEach((thumbKey) => {
                const id = uuid.v4();
                ret.thumbnails[thumbKey] = id;
                tasks.push((cb) => {
                    this.writeImage(id, filename, thumbnails[thumbKey], cb);
                });
            });
            async.parallel(tasks, (err) => {
                if (err) {
                    return callback(err);
                }
                if (this.options.serverMediaService) {
                    this.updateMedia(ret, (err) => {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, ret);
                    });
                }
                else {
                    callback(null, ret);
                }
            });
        });
    }
    getUploadPhotoFunction(loopId, photoId, type, reference) {
        return (done) => {
            const filename = path.join(this.mediaRootDir, `${photoId}.jpg`);
            fs.readFile(filename, (err, data) => {
                if (err) {
                    return done(err);
                }
                const params = {
                    loopId,
                    body: data,
                    path: photoId,
                    type
                };
                if (reference) {
                    params.reference = reference;
                }
                const media = new jibo_server_1.JSC.Media();
                media.create(params, done);
            });
        };
    }
    updateMedia(photos, callback) {
        const loop = new jibo_server_1.JSC.Loop();
        loop.list((err, data) => {
            if (err || !data || data.length === 0) {
                return callback();
            }
            const loopId = data[0].id;
            async.series([
                this.getUploadPhotoFunction(loopId, photos.id, 'image'),
                this.getUploadPhotoFunction(loopId, photos.thumbnails['mobile'], 'thumb', photos.id)
            ], callback);
        });
    }
    onPhotoGet(req, res) {
        let id = req.query.id;
        let filename;
        if (this.contentIds.indexOf(id) >= 0) {
            filename = this.getFakeSourceFilename(id);
        }
        else {
            filename = path.join(this.mediaRootDir, `${id}.jpg`);
        }
        let img = fs.readFileSync(filename);
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': img.length });
        res.end(img, 'binary');
    }
    onRecordingStart(req, res) {
        const time = new Date(), recording = {
            options: req.body,
            startTime: Date.now(),
            id: time.toISOString().substring(0, 10) + ":" +
                time.toISOString().substring(11, 19) +
                uuid.v4() + "." +
                ((req.body.video) ? "AV" : "AX")
        };
        this.recordings.push(recording);
        this.sendJson(res, { id: recording.id }, 200);
        this.emit('recording-start', recording);
    }
    onRecordingStop(req, res) {
        this.sendJson(res, {}, 200);
        this.emit('recording-stop');
    }
    onRecordingPlay(req, res) {
        this.sendJson(res, {}, 200);
        this.emit('recording-play', req.body);
    }
    getFakeSourceFilename(contentId) {
        let num = (contentId[0] & 0x3) + 1;
        return path.join(findRoot(__dirname), `resources/images/pic${num}.jpg`);
    }
}
exports.default = MediaService;

},{"../../clients/jibo-server":17,"../log":90,"async":undefined,"find-root":undefined,"fs":undefined,"jibo-service-framework":undefined,"jimp":undefined,"mkdirp":undefined,"path":undefined,"uuid":undefined}],95:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../log");
class PerformanceServiceSim extends jibo_service_framework_1.HTTPService {
    constructor(options, rootDir) {
        super('performance', options, rootDir);
        this.options = options;
        this._log = log_1.default.createChild('PerformanceService');
        if (PerformanceServiceSim._instance) {
            throw new Error('Cannot instantiate PerformanceServiceSim more than once');
        }
        PerformanceServiceSim._instance = this;
        this._log.info('Instantiated');
    }
    static get instance() {
        return PerformanceServiceSim._instance;
    }
    init(callback) {
        this._log.info('Initialized');
        callback();
    }
    log(time, type, description) {
        return;
    }
}
exports.default = PerformanceServiceSim;

},{"../log":90,"jibo-service-framework":undefined}],96:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../log");
const log = log_1.default.createChild('Registry');
let initalEntries = [];
class RegistryService extends jibo_service_framework_1.HTTPService {
    static get instance() {
        return RegistryService._instance;
    }
    constructor(options, rootDir) {
        super('registry', options, rootDir);
        if (RegistryService._instance) {
            throw new Error('Cannot instantiate RegistryService more than once');
        }
        this.registry = new Registry(initalEntries);
        RegistryService._instance = this;
        log.info("Instantiated");
    }
    routes(url) {
        url.get('/registry', (req, res) => {
            this.sendJson(res, this.registry);
        });
        url.put('/registry', (req, res) => {
            let entry = req.body;
            this.registry.put(entry);
            this.finishNoContent(res);
        });
        url.post('/registry', (req, res) => {
            let entry = req.body;
            if (!this.registry.get(entry.name)) {
                this.finish(res, new Error('error during POST: no such entry ' + entry.name));
            }
            else {
                if (this.registry.post(entry)) {
                    log.info('updating registry entry for', entry.name);
                }
                this.finishNoContent(res);
            }
        });
        url.delete('/registry', (req, res) => {
            let entry = req.body;
            this.registry.delete(entry.name);
            this.finishNoContent(res);
        });
    }
}
class Registry {
    constructor(initialEntries = []) {
        this.records = [];
        if (initialEntries) {
            for (let i = 0; i < initialEntries.length; i++) {
                this.put(initialEntries[i]);
            }
        }
    }
    get(name) {
        for (let i = 0; i < this.records.length; i++) {
            if (name === this.records[i].name) {
                return this.records[i];
            }
        }
        return null;
    }
    put(entry) {
        if (!this.get(entry.name)) {
            this.records.push(entry);
            return true;
        }
        return false;
    }
    post(entry) {
        for (let i = 0; i < this.records.length; i++) {
            if (entry.name === this.records[i].name) {
                return this.updateRecord(this.records[i], entry);
            }
        }
        return false;
    }
    delete(name) {
        for (let i = 0; i < this.records.length; i++) {
            if (name === this.records[i].name) {
                this.records.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    updateRecord(current, update) {
        const significantChange = current.host !== update.host ||
            current.port !== update.port ||
            current.path !== update.path;
        if (significantChange) {
            current.host = update.host;
            current.port = update.port;
            current.path = update.path;
        }
        current.ttl = update.ttl;
        current.tls = update.tls;
        return significantChange;
    }
}
exports.default = RegistryService;

},{"../log":90,"jibo-service-framework":undefined}],97:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
const log_1 = require("../log");
class SecureTransferServiceSim extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('secure-transfer', options, rootDir);
        this._log = log_1.default.createChild('STS');
        this._isUGCKeyReadyToggle = false;
        this._hasBackupDataToggle = false;
        if (SecureTransferServiceSim._instance) {
            throw new Error('Cannot instantiate SecureTransferServiceSim more than once');
        }
        SecureTransferServiceSim._instance = this;
        this._log.info("Instantiated");
    }
    static get instance() {
        return SecureTransferServiceSim._instance;
    }
    init(callback) {
        super.init((err) => {
            this._log.info('Initialized');
            callback(err);
        });
    }
    onMessage(message, client) {
        return;
    }
    toggleBackupDataExists(dataExists) {
        this._hasBackupDataToggle = dataExists;
    }
    toggleUGCKeyReady(isReady) {
        this._isUGCKeyReadyToggle = isReady;
    }
    routes(url) {
        super.routes(url);
        url.get('/UGCKeyReady', (req, res) => {
            this._isUGCKeyReady(req, res);
        });
        url.get('/hasBackupData', (req, res) => {
            this._hasBackupData(req, res);
        });
    }
    _isUGCKeyReady(req, res) {
        try {
            this.sendJson(res, { status: 'OK', isReady: this._isUGCKeyReadyToggle }, 200);
        }
        catch (ex) {
            this.sendJson(res, { status: 'error', message: ex }, 500);
        }
    }
    _hasBackupData(req, res) {
        try {
            this.sendJson(res, { status: 'OK', isReady: this._hasBackupDataToggle }, 200);
        }
        catch (ex) {
            this.sendJson(res, { status: 'error', message: ex }, 500);
        }
    }
}
SecureTransferServiceSim._instance = null;
exports.default = SecureTransferServiceSim;

},{"../log":90,"jibo-service-framework":undefined}],98:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_server_1 = require("../../clients/jibo-server");
const log_1 = require("../log");
const log = log_1.default.createChild('Server');
class ServerService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('server', options, rootDir);
        this.options = options;
        if (ServerService._instance) {
            throw new Error('Cannot instantiate ServerService more than once');
        }
        ServerService._instance = this;
        this.notificationsClients = [];
        this.statusClients = [];
        log.info('Instatiated');
    }
    static get instance() {
        return ServerService._instance;
    }
    init(callback) {
        super.init((err) => {
            if (!err) {
                this._initCredentials((err) => {
                    if (err) {
                        log.info('could not get credentials or identity, server-service simulator not starting');
                        callback();
                    }
                    else {
                        this._setupClients();
                        let params = { deviceId: this.deviceId };
                        this.jscNotificationClient.connect(params, (err, hub) => {
                            log.iferr(err);
                            if (!err) {
                                log.info('jsc notification client connected');
                                hub.on('message', (message) => {
                                    this.messageReceived(message);
                                });
                                log.info('Initialized');
                            }
                            callback(err);
                        });
                    }
                });
            }
            else {
                callback(err);
            }
        });
    }
    onMessage(command, client) {
        return;
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        if (client.url === '/server/notifications') {
            this.notificationsClients.push(client);
        }
        else if (client.url === '/server/notifications/status') {
            this.statusClients.push(client);
        }
        else {
            log.warn('do not know what to do with this client socket', client.url);
        }
    }
    onClose(client) {
        let i;
        while (i = this.notificationsClients.indexOf(client) > -1) {
            this.notificationsClients.splice(i, 1);
        }
        while (i = this.statusClients.indexOf(client) > -1) {
            this.statusClients.splice(i, 1);
        }
    }
    routes(url) {
        super.routes(url);
    }
    messageReceived(message) {
        if (this.notificationsClients.length) {
            this.notificationsClients.forEach((client) => {
                this.sendWsJson(client, message);
            });
        }
        else {
            log.warn('no notificationsClients! ignoring message');
        }
    }
    _initCredentials(callback) {
        log.info('getting credentials');
        this._getCredentials((err, credentials) => {
            if (!err) {
                log.info('credentials found, updating JSC');
                jibo_server_1.JSC.config.update(credentials);
                this._getIdentity((err, identity) => {
                    if (!err) {
                        this.deviceId = identity.name;
                    }
                    callback(err);
                });
            }
            else {
                callback(err);
            }
        });
    }
    _setupClients() {
        if (!this.jscNotificationClient) {
            this.jscNotificationClient = new jibo_server_1.JSC.Notification();
        }
    }
    _getCredentials(callback) {
        let filename = path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'credentials.json');
        this._readJSON(filename, callback);
    }
    _getIdentity(callback) {
        let filename = path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'identity.json');
        this._readJSON(filename, callback);
    }
    _readJSON(filename, callback) {
        fs.readFile(filename, 'utf8', (err, json) => {
            if (err) {
                callback(err);
            }
            else {
                let data;
                try {
                    data = JSON.parse(json);
                }
                catch (e) {
                    err = e;
                }
                log.iferr(err, `The file ${filename} has invalid JSON`);
                callback(err, data);
            }
        });
    }
}
exports.default = ServerService;

},{"../../clients/jibo-server":17,"../log":90,"fs":undefined,"jibo-service-framework":undefined,"path":undefined}],99:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const findRoot = require("find-root");
const GlobalManagerService_1 = require("../../services/global-manager/GlobalManagerService");
const jibo_service_framework_1 = require("jibo-service-framework");
class SkillsServiceSim extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('skills-service', options, rootDir);
        this.options = options;
        if (SkillsServiceSim._instance) {
            throw new Error('Cannot instantiate SkillsServiceSim more than once');
        }
        this.currentSkill = {
            name: "@be/be",
            path: "/"
        };
        SkillsServiceSim._instance = this;
    }
    static get instance() {
        return SkillsServiceSim._instance;
    }
    init(callback) {
        super.init(callback);
    }
    onMessage(command, client) {
        this.emit('command', command, client);
        if (command.command === 'initDone') {
            if (this.options.skillsBaseDir) {
                let skillPath = this.options.skillsBaseDir;
                let packagePath = path.join(this.options.skillsBaseDir, 'package.json');
                if (fs.statSync(skillPath).isDirectory() && fs.existsSync(packagePath)) {
                    let packageJson = require(packagePath);
                    this.currentSkill.name = packageJson.name;
                    this.currentSkill.path = skillPath;
                    this.sendWsJson(client, {
                        command: 'show'
                    });
                }
            }
            else {
                this.sendWsJson(client, {
                    command: 'show'
                });
            }
        }
        else if (command.command === 'finished') {
            if (this.currentSkill.name === '@be/be') {
                let relaunchResults = {};
                relaunchResults.nlu = {
                    entities: {
                        skill: '@be/idle'
                    }
                };
                relaunchResults.status = "GOT-PARSE";
                GlobalManagerService_1.default.instance.handleSkillLaunch(relaunchResults);
            }
        }
    }
    routes(url) {
        super.routes(url);
        url.get('/version', (req, res) => {
            const root = findRoot(__dirname);
            const packageInfo = require(path.join(root, 'package.json'));
            this.sendJson(res, { version: packageInfo.version });
        });
    }
}
exports.default = SkillsServiceSim;

},{"../../services/global-manager/GlobalManagerService":42,"find-root":undefined,"fs":undefined,"jibo-service-framework":undefined,"path":undefined}],100:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const jibo_service_framework_1 = require("jibo-service-framework");
const fs = require("fs");
const uuid = require("uuid");
const async = require("async");
const log_1 = require("../log");
const log = log_1.default.createChild('SystemManager');
const DEFAULT_TESTING_CREDENTIALS = {
    secretAccessKey: 'W5dxPYfmdGTETneE1LeuIcp8aCXrgr4eomrfW50s',
    accessKeyId: '3MRGwcKUvQuAk8Hsl7Xp',
    region: 'stg-entrypoint'
};
const OLD_TESTING_CREDENTIALS_SECRET_ACCESS_KEY = 'EdNNKxicwehgIXhlLM4Nb1L66NZC6NXTLhVRuyCs';
class SystemManagerService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('system-manager', options, rootDir);
        this.onBackup = (req, res) => {
            log.debug('onBackup');
            this.doBackupOrRestoreOp("backup", (code) => {
                log.debug('Backup complete', code);
                this.sendJson(res, {}, code);
            });
        };
        this.onWipe = (req, res) => {
            log.debug('onWipe');
            this.doBackupOrRestoreOp("wipe", (code) => {
                log.debug('Wipe complete', code);
                this.sendJson(res, {}, code);
            });
        };
        this.onRestore = (req, res) => {
            log.debug('onRestore');
            this.doBackupOrRestoreOp("restore", (code) => {
                log.debug('Restore complete', code);
                this.sendJson(res, {}, code);
            });
        };
        this.onGetCredentials = (req, res) => {
            log.debug('onGetCredentials');
            let filename = path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'credentials.json');
            fs.readFile(filename, 'utf8', (err, data) => {
                let credentials;
                if (err && err.code === 'ENOENT') {
                    log.debug('No credentials.json; writing one...');
                    err = null;
                    credentials = DEFAULT_TESTING_CREDENTIALS;
                    fs.writeFileSync(filename, JSON.stringify(credentials, null, 4));
                    log.debug('credentials.json written', credentials);
                }
                else {
                    try {
                        credentials = JSON.parse(data);
                        log.debug('Read credentials.json', credentials);
                    }
                    catch (e) {
                        log.error(`The credentials file has invalid JSON at ${filename}`);
                    }
                    if (credentials && credentials.secretAccessKey === OLD_TESTING_CREDENTIALS_SECRET_ACCESS_KEY) {
                        log.debug('Old testing credentials key; writing new one...');
                        credentials = DEFAULT_TESTING_CREDENTIALS;
                        fs.writeFileSync(filename, JSON.stringify(credentials, null, 4));
                        log.debug('credentials.json written', credentials);
                    }
                }
                if (credentials) {
                    this.sendJson(res, credentials);
                }
            });
        };
        this.onSetCredentials = (req, res) => {
            log.debug('onSetCredentials');
            this.sendJson(res, {}, 204);
        };
        this.onGetIdentity = (req, res) => {
            log.debug('onGetIdentity');
            this.sendJson(res, {
                "guid": uuid.v4(),
                "name": 'opal-sage-victor-valley',
                "cpuid": uuid.v4(),
                "wifi_mac": uuid.v4()
            });
        };
        this.onGetMode = (req, res) => {
            log.debug('onGetMode');
            this.sendJson(res, {
                mode: 'normal'
            });
        };
        this.onSetMode = (req, res) => {
            log.debug('onSetMode');
            this.sendJson(res, {}, 204);
        };
        this.onGetVersion = (req, res) => {
            log.debug('onGetVersion');
            this.sendJson(res, {
                version: 'Jibo Release Version: Release-3.1.0\n'
            });
        };
        this.onReboot = (req, res) => {
            log.debug('onReboot');
            this.sendJson(res, {}, 204);
        };
        this.onPoweroff = (req, res) => {
            log.debug('onPoweroff');
            this.sendJson(res, {}, 204);
        };
        this.onForceLogs = (req, res) => {
            log.debug('onForceLogs');
            this.sendJson(res, {
                result: 'success'
            }, 200);
        };
        this.onWifi = (req, res) => {
            log.debug('onWifi');
            this.sendJson(res, { response: 'COMPLETED;ip_address=' });
        };
        this.onGetDynamicFirewall = (req, res) => {
            log.debug('onGetDynamicFirewall', this.dynamicFirewallMode);
            this.sendJson(res, { mode: this.dynamicFirewallMode });
        };
        this.onSetDynamicFirewall = (req, res) => {
            this.dynamicFirewallMode = req.params.mode;
            log.debug('onSetDynamicFirewall', this.dynamicFirewallMode);
            this.sendJson(res, { mode: this.dynamicFirewallMode });
        };
        if (SystemManagerService._instance) {
            throw new Error('Cannot instantiate SystemManagerService more than once');
        }
        log.debug('constructor', options, rootDir);
        SystemManagerService._instance = this;
        log.info('Instantiated');
    }
    static get instance() {
        return SystemManagerService._instance;
    }
    init(callback) {
        super.init((err) => {
            log.info('Initialized');
            callback(err);
        });
    }
    routes(url) {
        super.routes(url);
        url.get('/credentials', this.onGetCredentials);
        url.post('/credentials', this.onSetCredentials);
        url.get('/identity', this.onGetIdentity);
        url.get('/mode', this.onGetMode);
        url.post('/mode', this.onSetMode);
        url.get('/version', this.onGetVersion);
        url.post('/system/wipe', this.onWipe);
        url.post('/system/backup', this.onBackup);
        url.post('/system/restore', this.onRestore);
        url.post('/power/off', this.onPoweroff);
        url.post('/power/reboot', this.onReboot);
        url.post('/logs/upload', this.onForceLogs);
        url.post('/wifi/wpa', this.onWifi);
        url.get('/dynamic_firewall', this.onGetDynamicFirewall);
        url.post('/dynamic_firewall', this.onSetDynamicFirewall);
    }
    onMessage(command, client) {
        return;
    }
    getRequestData(req, callback) {
        let chunk = "";
        req.on('data', data => chunk += data);
        req.on('end', () => {
            try {
                let data = JSON.parse(chunk);
                callback(null, data);
            }
            catch (e) {
                callback(e);
            }
        });
    }
    doBackupOrRestoreOp(opType, callback) {
        log.debug('doBackupOrRestoreOp', opType);
        jibo_service_framework_1.RegistryClient.instance.getRecords((error, records) => {
            if (error) {
                log.warn('Could not get records', error);
                callback(500);
            }
            let tasks = [];
            for (let i = 0; i < records.length; i++) {
                let record = records[i];
                let opFolder = path.join(process.env.HOME || process.env.USERPROFILE, '.jibo', 'backup', record.name);
                let data = { 'directory': opFolder };
                if (record.name !== 'system-manager') {
                    tasks.push((cb) => {
                        const request = new XMLHttpRequest();
                        let postString = '/_M_/system/' + opType;
                        request.open('POST', `http://${record.host}:${record.port}${postString}`, true);
                        request.setRequestHeader('Content-Type', 'application/json');
                        request.onreadystatechange = () => {
                            if (request.readyState === 4) {
                                log.debug("status is ", request.status);
                                cb();
                            }
                        };
                        request.send(JSON.stringify(data));
                    });
                }
            }
            async.parallel(tasks, (err) => {
                if (err) {
                    log.warn('Could not complete doBackupOrRestoreOp', err);
                    callback(500);
                }
                else {
                    log.debug('doBackupOrRestoreOp complete');
                    callback(204);
                }
            });
        });
    }
}
exports.default = SystemManagerService;

},{"../log":90,"async":undefined,"fs":undefined,"jibo-service-framework":undefined,"path":undefined,"uuid":undefined}],101:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_framework_1 = require("jibo-service-framework");
class SystemMonitoringServiceSim extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('system-monitoring-service', options, rootDir);
        if (SystemMonitoringServiceSim._instance) {
            throw new Error('Cannot instantiate SystemMonitoringServiceSim more than once');
        }
        SystemMonitoringServiceSim._instance = this;
    }
    static get instance() {
        if (!SystemMonitoringServiceSim._instance) {
            console.error("system monitoring service sim instance not created");
        }
        return SystemMonitoringServiceSim._instance;
    }
    onMessage(message, client) {
        console.log("SystemMonitoringServiceSim::OnMessage");
    }
}
SystemMonitoringServiceSim._instance = null;
exports.default = SystemMonitoringServiceSim;

},{"jibo-service-framework":undefined}],102:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_node_xml_1 = require("jibo-node-xml");
var TTSPlaybackMode;
(function (TTSPlaybackMode) {
    TTSPlaybackMode["Incremental"] = "Incremental";
    TTSPlaybackMode["Instant"] = "Instant";
    TTSPlaybackMode["Test"] = "Test";
})(TTSPlaybackMode = exports.TTSPlaybackMode || (exports.TTSPlaybackMode = {}));
const PlaybackSpeed = {
    [TTSPlaybackMode.Incremental]: {
        words: 0.3,
        pauses: 0.2,
        comma: 0.12,
        punct: 0.3
    },
    [TTSPlaybackMode.Test]: {
        words: 0.3,
        pauses: 0.2,
        comma: 0.12,
        punct: 0.3
    },
    [TTSPlaybackMode.Instant]: {
        words: 0.0003,
        pauses: 0.0002,
        comma: 0.00012,
        punct: 0.0003
    }
};
class TTSPromptParser {
    constructor(mode = TTSPlaybackMode.Instant) {
        this.mode = mode;
    }
    static _isNonCommaPunctuation(character) {
        return TTSPromptParser._isOtherPunctuation(character) ||
            TTSPromptParser._isEndPunctuation(character);
    }
    static _isOtherPunctuation(character) {
        return (character === '...') ||
            (character === ';') ||
            (character === ':');
    }
    static _isCommaPunctuation(character) {
        return (character === ',');
    }
    static _isEndPunctuation(character) {
        return (character === '.') ||
            (character === '?') ||
            (character === '!');
    }
    static _createBreakToken(startTime, duration) {
        return TTSPromptParser._createToken('<break>', startTime, duration);
    }
    static _createAudioBreakToken(startTime, duration) {
        return TTSPromptParser._createToken('<audioBreak>', startTime, duration);
    }
    static _createSayAsToken(startTime, duration) {
        return TTSPromptParser._createToken('<say-as>', startTime, duration);
    }
    static _createPauseToken(startTime, duration) {
        return TTSPromptParser._createToken('[lpau]', startTime, duration);
    }
    static _createToken(name, startTime, duration) {
        return {
            name: name,
            start: startTime,
            end: Math.round(100 * (startTime + duration)) / 100
        };
    }
    static hasEndPunctuation(tokens) {
        const lastToken = tokens[tokens.length - 1].name;
        const lastSymbol = lastToken[lastToken.length - 1];
        return TTSPromptParser._isEndPunctuation(lastToken) ||
            TTSPromptParser._isEndPunctuation(lastSymbol);
    }
    createPromptAndTokens(text) {
        let prompt;
        let xml;
        let tokens;
        let endTime;
        try {
            xml = jibo_node_xml_1.Parser.parseXML(text);
        }
        catch (e) {
            console.error(`Error parsing TTS prompt: `, e);
        }
        if (xml) {
            [prompt, tokens] = this._extractTextFromXML(xml);
        }
        else {
            [endTime, tokens] = this._extractWordTokens(text);
            if (tokens && tokens.length > 0 && !TTSPromptParser.hasEndPunctuation(tokens)) {
                tokens.push(TTSPromptParser._createPauseToken(endTime, PlaybackSpeed[this.mode].pauses));
            }
            prompt = text;
        }
        if (!tokens && prompt.length === 0) {
            tokens = [];
        }
        return [prompt, tokens];
    }
    _extractWordTokens(text, startTime = 0, tokens = []) {
        let t = startTime;
        let wordDuration;
        text.split(' ').forEach(word => {
            word = word.trim();
            if (TTSPromptParser._isCommaPunctuation(word)) {
                wordDuration = PlaybackSpeed[this.mode].comma;
            }
            else if (TTSPromptParser._isNonCommaPunctuation(word)) {
                wordDuration = PlaybackSpeed[this.mode].punct;
            }
            else {
                wordDuration = PlaybackSpeed[this.mode].words;
            }
            tokens.push({
                name: word.toLowerCase(),
                start: Math.round(100 * t) / 100,
                end: Math.round(100 * (t + wordDuration)) / 100
            });
            t = Math.round(100 * (t + wordDuration)) / 100;
        });
        return [t, tokens];
    }
    _extractTextFromXML(xmlNode) {
        let strArray = [];
        let tokens = [];
        const endTime = this._extractTextFromXMLRecursive(xmlNode, strArray, 0, tokens);
        if (tokens && tokens.length > 0 && !TTSPromptParser.hasEndPunctuation(tokens)) {
            tokens.push(TTSPromptParser._createPauseToken(endTime, PlaybackSpeed[this.mode].pauses));
        }
        return [strArray.join(' '), tokens];
    }
    _extractTextFromXMLRecursive(xmlNode, strArray, startTime, tokens) {
        let size = 0;
        let endTime = startTime;
        const nodeType = xmlNode.type.toLowerCase();
        if (nodeType === 'text') {
            let val = xmlNode.value.trim();
            strArray.push(val);
            [endTime, tokens] = this._extractWordTokens(val, startTime, tokens);
        }
        else if (nodeType === 'break') {
            try {
                size = Number.parseFloat(xmlNode.getAttribute('size'));
            }
            catch (e) {
                console.log(`Couldn't parse 'size' attribute of break tag: `, e);
            }
            if (size > 0) {
                if (this.mode === TTSPlaybackMode.Instant) {
                    size = PlaybackSpeed[TTSPlaybackMode.Instant].pauses;
                }
                tokens.push(TTSPromptParser._createBreakToken(endTime, size));
                endTime = Math.round(100 * (endTime + size)) / 100;
            }
        }
        else if (nodeType === 'audiobreak') {
            let src;
            try {
                src = xmlNode.getAttribute('src');
            }
            catch (e) {
                console.log(`Couldn't parse 'src' attribute of audioBreak tag: `, e);
            }
            if (src !== undefined) {
                if (this.mode === TTSPlaybackMode.Instant) {
                    size = PlaybackSpeed[TTSPlaybackMode.Instant].pauses;
                }
                else {
                    size = 0.5;
                }
                tokens.push(TTSPromptParser._createAudioBreakToken(endTime, size));
                endTime = Math.round(100 * (endTime + size)) / 100;
            }
        }
        else if (nodeType === 'say-as') {
            let word;
            try {
                word = xmlNode.getAttribute('spell');
            }
            catch (e) {
                console.log(`Couldn't parse 'spell' attribute of say-as tag: `, e);
            }
            if (word) {
                Array.prototype.push.apply(strArray, word.split(''));
                const letterCount = word.length;
                if (this.mode === TTSPlaybackMode.Instant) {
                    size = PlaybackSpeed[TTSPlaybackMode.Instant].words;
                }
                else {
                    size = PlaybackSpeed[TTSPlaybackMode.Incremental].words;
                }
                size *= letterCount;
                tokens.push(TTSPromptParser._createSayAsToken(endTime, size));
                endTime = Math.round(100 * (endTime + size)) / 100;
            }
        }
        xmlNode.forEachChild(child => {
            endTime = this._extractTextFromXMLRecursive(child, strArray, endTime, tokens);
        });
        return endTime;
    }
}
exports.TTSPromptParser = TTSPromptParser;

},{"jibo-node-xml":undefined}],103:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const jibo_service_framework_1 = require("jibo-service-framework");
const TTSPromptParser_1 = require("./TTSPromptParser");
const pos_1 = require("pos");
const log_1 = require("../log");
const PerformanceService_1 = require("../../services/performance/PerformanceService");
const log = log_1.default.createChild('TTS');
const performance = {
    now: () => {
        const time = process.hrtime();
        return time[0] * 1000 + time[1] / 1000000;
    }
};
const Regexs = {
    ids: /(?:^|\s)[a-z0-9-]{8,45}(?:$|\s)/ig,
    number: /[0-9]*\.[0-9]+|[0-9]+(?=\W)/ig,
    space: /\s+/ig,
    unblank: /\S/,
    email: /[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](?:\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](?:-?\.?[a-zA-Z0-9])*(?:\.[a-zA-Z](?:-?[a-zA-Z0-9])*)+/gi,
    urls: /(?:https?:\/\/)(?:[\da-z\.-]+)\.(?:[a-z\.]{2,6})(?:[\/\w\.\-\?#]*)*\/?/ig,
    punctuation: /[\.]{3}|[\/\.\,\?\!\"\:\;\$\(\)\#]/ig
};
class TokenWorker extends events_1.EventEmitter {
    constructor(tokens, ttsService, realTime, res) {
        super();
        this.tokens = tokens;
        this.ttsService = ttsService;
        this.realTime = realTime;
        this.res = res;
        this._stopped = false;
        this.update = this.update.bind(this);
        this.ttsService.emit('sending-tokens');
    }
    stop() {
        this._stopped = true;
        this.ttsService.sendJson(this.res, {
            Status: 'OK',
            Message: 'Speaking TTS'
        }, 204);
    }
    start() {
        this._startTime = performance.now();
        this.update();
    }
    update() {
        if (!this._stopped) {
            let delta = performance.now() - this._startTime;
            let speed = this.realTime ? 1000 : 1;
            if (delta > this.tokens[0].start * speed) {
                let token = this.tokens.shift();
                this.ttsService.emit('token', token.name);
            }
            if (this.tokens.length === 0) {
                this.ttsService.sendWsJson(this.ttsService.tokensSocket, this.ttsService.returnType('', 0, 'STOP'));
                PerformanceService_1.default.instance.log(Date.now(), 'TTS', 'SPEAK_REQUEST_COMPLETE');
                this.stop();
                this.emit('stop');
                this.removeAllListeners();
            }
            else {
                setImmediate(this.update);
            }
        }
    }
}
class TTSService extends jibo_service_framework_1.HTTPWSService {
    constructor(options, rootDir) {
        super('tts', options, rootDir);
        this.mode = TTSPromptParser_1.TTSPlaybackMode.Incremental;
        if (TTSService._instance) {
            throw new Error('Cannot instantiate TTSService more than once');
        }
        TTSService._instance = this;
        this.lexer = new pos_1.Lexer();
        this.lexer.regexs = [Regexs.urls, Regexs.ids, Regexs.number, Regexs.space, Regexs.email, Regexs.punctuation];
        this.tagger = new pos_1.Tagger();
        log.info("Instantiated");
    }
    static get instance() {
        return TTSService._instance;
    }
    setMode(mode) {
        let _mode = TTSPromptParser_1.TTSPlaybackMode[mode] || TTSPromptParser_1.TTSPlaybackMode.Incremental;
        if (!_mode) {
            _mode = TTSPromptParser_1.TTSPlaybackMode.Incremental;
            console.warn(`Invalid TTS playback mode '${mode}', using '${_mode}'`);
        }
        this.mode = _mode;
    }
    toggleDevMode() {
        console.warn(`Deprecated, please use 'setMode'`);
        if (this.mode !== TTSPromptParser_1.TTSPlaybackMode.Incremental) {
            this.mode = TTSPromptParser_1.TTSPlaybackMode.Incremental;
        }
        else {
            this.mode = TTSPromptParser_1.TTSPlaybackMode.Instant;
        }
    }
    init(callback) {
        super.init((err) => {
            log.info('Initialized');
            callback(err);
        });
    }
    onMessage(command, client) {
        return;
    }
    onConnection(client, request) {
        super.onConnection(client, request);
        if (client.url === '/tts_tokens') {
            this.tokensSocket = client;
        }
        else if (client.url === '/tts_phones') {
            this.phonesSocket = client;
        }
    }
    routes(url) {
        super.routes(url);
        url.post('/tts_token_times', (req, res) => {
            this.onTokenTimes(req, res);
        });
        url.post('/tts_speak', (req, res) => {
            this.onSpeak(req, res);
        });
        url.get('/tts_stop', (req, res) => {
            this.onStop(req, res);
        });
        url.post('/tts_lex', (req, res) => {
            this.onGetPOSTokens(req, res);
        });
        url.post('/tts_pos_tagging', (req, res) => {
            this.onGetPOSTags(req, res);
        });
    }
    returnType(word, ts, status) {
        return {
            token: word,
            timestamp: ts,
            status: status,
            moreinfo: []
        };
    }
    onTokenTimes(req, res) {
        req.on('data', (chunk) => {
            let data = JSON.parse(chunk);
            const parser = new TTSPromptParser_1.TTSPromptParser(this.mode);
            const promptTokens = parser.createPromptAndTokens(data.prompt);
            let body = {
                tokentimes: {
                    tokens: promptTokens[1]
                }
            };
            this.sendJson(res, body, 200);
        });
    }
    onSpeak(req, res) {
        req.on('data', (chunk) => {
            let data = JSON.parse(chunk);
            this.stopCurrentWorker();
            const parser = new TTSPromptParser_1.TTSPromptParser(this.mode);
            const promptTokens = parser.createPromptAndTokens(data.prompt);
            const realTime = (this.mode === TTSPromptParser_1.TTSPlaybackMode.Incremental);
            if (promptTokens[1].length) {
                this.currentWorker = new TokenWorker(promptTokens[1], this, realTime, res);
                this.currentWorker.on('stop', () => {
                    this.currentWorker.removeAllListeners();
                    this.currentWorker = null;
                });
                this.currentWorker.start();
            }
            else {
                let body = {
                    statusText: "Error: No prompt provided to TTS speak"
                };
                this.sendJson(res, body, 500);
            }
        });
    }
    stopCurrentWorker() {
        if (this.currentWorker) {
            this.currentWorker.stop();
            this.currentWorker.removeAllListeners();
            this.currentWorker = null;
        }
        this.emit('stop');
    }
    onStop(req, res) {
        let body = {
            Status: 'OK',
            Message: 'Stopping TTS'
        };
        this.sendJson(res, body, 200);
        this.stopCurrentWorker();
        this.sendWsJson(this.tokensSocket, this.returnType('', 0, 'STOP'));
    }
    onGetPOSTokens(req, res) {
        req.on('data', (chunk) => {
            res.setHeader('Content-Type', 'json');
            try {
                let data = JSON.parse(chunk);
                if (data.text || data.text === "") {
                    let tokens = this.lexer.lex(data.text);
                    let result = {
                        tokens: tokens
                    };
                    res.statusCode = 200;
                    res.end(JSON.stringify(result));
                }
                else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({
                        error: "Missing input property `text`"
                    }));
                }
            }
            catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({
                    error: "Failed to parse the input"
                }));
            }
        });
    }
    onGetPOSTags(req, res) {
        req.on('data', (chunk) => {
            res.setHeader('Content-Type', 'json');
            try {
                let data = JSON.parse(chunk);
                if (data.tokens) {
                    let tokentags = this.tagger.tag(data.tokens);
                    let result = {
                        tokentags: tokentags
                    };
                    res.statusCode = 200;
                    res.end(JSON.stringify(result));
                }
                else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({
                        error: "Missing input property `tokens`"
                    }));
                }
            }
            catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({
                    error: "Failed to parse the input"
                }));
            }
        });
    }
}
TTSService.TTSPromptParser = TTSPromptParser_1.TTSPromptParser;
exports.default = TTSService;

},{"../../services/performance/PerformanceService":54,"../log":90,"./TTSPromptParser":102,"events":undefined,"jibo-service-framework":undefined,"pos":undefined}],104:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyCallback = () => { return; };
class Async {
    static get(exec) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                exec((error, data) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(data);
                });
            });
        });
    }
    static get2(exec) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                exec((data) => {
                    resolve(data);
                });
            });
        });
    }
    static all(promises, max) {
        return __awaiter(this, void 0, void 0, function* () {
            let results = [];
            while (promises.length > 0) {
                const temp = yield Promise.all(promises.splice(0, max));
                results = results.concat(temp);
            }
            return results;
        });
    }
}
exports.default = Async;

},{}],105:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BackgroundUtilsManager {
    constructor() {
        this._initFunctions = {};
        this._initialized = false;
    }
    register(callback, id) {
        if (this._initialized) {
            console.warn(`BackgroundUtilsManager is registering ${id} after initialization. Please consider how/when code is being included.`);
            callback();
        }
        if (this._initFunctions.hasOwnProperty(id)) {
            console.error(`BackgroundUtilsManager is registering ${id} when that id has already been used. This callback will not be called.`);
            return;
        }
        this._initFunctions[id] = callback;
    }
    initAll(mode, startSkill) {
        Object.keys(this._initFunctions).forEach(id => {
            const callback = this._initFunctions[id];
            try {
                callback(mode, startSkill);
            }
            catch (e) {
                console.error(`Error when initializing ${id}:`);
                console.log('%c', 'color:red', e);
            }
        });
    }
}
exports.default = new BackgroundUtilsManager();

},{}],106:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Debouncer {
    constructor(debouncePeriod, debounceMaxSpan, defaultFn) {
        this.debouncePeriod = debouncePeriod;
        this.debounceMaxSpan = debounceMaxSpan;
        this.fn = defaultFn;
    }
    trigger(fn) {
        fn = fn || this.fn;
        if (!fn) {
            throw new Error('no function given to debounce');
        }
        if (this.inProcess) {
            this.triggerAgain = true;
        }
        else {
            this._clearTimeout();
            let elapsed = 0;
            if (!this.start) {
                this.start = Date.now();
            }
            else {
                elapsed = Math.round(Date.now() - this.start);
            }
            if (elapsed > this.debounceMaxSpan) {
                this.start = 0;
                process.nextTick(() => {
                    this._execute(fn);
                });
            }
            else {
                this.timeout = setTimeout(() => {
                    this.timeout = false;
                    this.start = 0;
                    this._execute(fn);
                }, this.debouncePeriod);
            }
        }
    }
    destroy() {
        this._clearTimeout();
    }
    _execute(fn) {
        if (fn.length === 0) {
            fn();
        }
        else {
            this.inProcess = true;
            fn(() => {
                this.inProcess = false;
                if (this.triggerAgain) {
                    this.triggerAgain = false;
                    this.trigger(fn);
                }
            });
        }
    }
    _clearTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = false;
        }
    }
}
exports.Debouncer = Debouncer;
exports.default = Debouncer;

},{}],107:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KBClient_1 = require("../clients/KBClient");
const WifiService_1 = require("../services/wifi/WifiService");
const KBService_1 = require("../services/kb/KBService");
const BodyClient_1 = require("../clients/BodyClient");
const Analytics_1 = require("./analytics/Analytics");
const jibo_service_clients_1 = require("jibo-service-clients");
const OTA_KB = '/ota';
const PLUG_ERROR = 'OTA10';
const WIFI_ERROR = 'OTA1';
const INTERNET_ERROR = 'OTA4';
const BACKUP_ERROR = 'OTA11';
const BACKUP_OTA_ERROR = 'OTA12';
const UHOH_ERROR = 'OTAX';
const MAX_BACKUP_FAILURES = 3;
const OTA_FAILURE = 'OTA Failure';
const OTA_ATTEMPTED = 'OTA Attempted';
class OTAUpdater {
    constructor(log, otaFilter) {
        this._log = null;
        this._otaFilter = "";
        this._kbm = null;
        if (OTAUpdater._instance) {
            throw new Error('OTAUpdater is a singleton');
        }
        this._log = log.createChild("OTAUpdater");
        this._otaFilter = otaFilter;
        OTAUpdater._instance = this;
        this._kbm = null;
        this._resetDLStatus();
        this._backingUp = false;
        this._backingBeforeUpdate = false;
        const deets = (this._otaFilter && (this._otaFilter.length > 0) ? ("with filter " + this._otaFilter) : "");
        this._log.info("Initialized", deets);
    }
    static createInstance(log, otaFilter) {
        if (!OTAUpdater.instance) {
            return new OTAUpdater(log, otaFilter);
        }
        return OTAUpdater.instance;
    }
    static get instance() {
        return OTAUpdater._instance;
    }
    init(callback) {
        const kbUrl = 'http://127.0.0.1:' + KBService_1.default.instance.options.port;
        try {
            this._kbm = KBClient_1.default.createModel(OTA_KB, kbUrl);
        }
        catch (e) {
            this._doError(e);
            return callback();
        }
        this._kbm.loadRoot((error, root) => {
            if (error || !root || !root.data) {
                this._doError("Couldn't load backup/OTA root KB on attempt install");
                return callback();
            }
            root.data.updatesAvailable = false;
            root.save((error) => {
                if (error) {
                    this._doError("Couldn't save backup/OTA post-downloading status");
                }
                callback();
            });
        });
    }
    downloadStatus(callback) {
        if (!this._downloadStatus.updates || (this._downloadStatus.updates.length === 0)) {
            return callback(null, null);
        }
        callback(null, this._downloadStatus);
    }
    backupStatus(callback) {
        callback(null, (this._backingUp || this._backingBeforeUpdate));
    }
    backupRobot(immediate, callback) {
        this._doLog('Starting backup!');
        callback();
        this._backupHelper((error, maxErrors) => {
            if (error) {
                this._doError(error);
                this._kbm.loadRoot((error, root) => {
                    if (error || !root || !root.data) {
                        this._doError(new Error("Couldn't load backup/OTA root KB to save backup error"));
                    }
                    else if (!maxErrors) {
                        root.data.error = BACKUP_ERROR;
                        root.save((err) => {
                            if (err) {
                                this._doError("Couldn't save backup error code in KB");
                            }
                        });
                    }
                });
            }
            else {
                this._doLog('Robot backup successful.');
            }
        });
    }
    checkForUpdates(callback) {
        jibo_service_clients_1.systemManager.checkForUpdates(callback, this._otaFilter);
    }
    downloadAndInstall(callback) {
        this._backingBeforeUpdate = true;
        this._resetDLStatus();
        this._doLog('Starting backup/ota update!');
        this._analyticsEvent(OTA_ATTEMPTED);
        this._isReady((error) => {
            if (error) {
                this._analyticsEvent(OTA_FAILURE);
                this._backingBeforeUpdate = false;
                return callback(error);
            }
            callback();
            this._backupIfOTA((error) => {
                if (error) {
                    this._analyticsEvent(OTA_FAILURE);
                    this._backingBeforeUpdate = false;
                    return this._doError(error);
                }
                this._kbm.loadRoot((error, kbRoot) => {
                    if (error || !kbRoot || !kbRoot.data) {
                        this._analyticsEvent(OTA_FAILURE);
                        this._backingBeforeUpdate = false;
                        const msg = new Error("Couldn't load backup/OTA root KB on OTA attempt");
                        return this._doError(msg);
                    }
                    this._startNextDownload((error, ids) => {
                        if (error) {
                            this._resetDLStatus();
                            this._doError(error);
                            this._analyticsEvent(OTA_FAILURE);
                            this._backingBeforeUpdate = false;
                            WifiService_1.default.instance.verifyConnection().then((error) => {
                                if (error && error.code) {
                                    kbRoot.data.error = (error.code === 1 ? WIFI_ERROR : INTERNET_ERROR);
                                }
                                else {
                                    kbRoot.data.error = UHOH_ERROR;
                                }
                                kbRoot.save((err) => {
                                    if (err) {
                                        this._doError("Couldn't save OTA download error status");
                                    }
                                });
                            });
                            return;
                        }
                        kbRoot.data.updatesAvailable = false;
                        kbRoot.save((error) => {
                            if (error) {
                                const msg = new Error("Couldn't save OTA post-downloading status");
                                this._doError(msg);
                                this._analyticsEvent(OTA_FAILURE);
                                return;
                            }
                            this._isReady((error) => {
                                if (error) {
                                    this._analyticsEvent(OTA_FAILURE);
                                    return;
                                }
                                if (this._log) {
                                    this._log.warn('Starting OTA installation:', this._otaFilter, ids);
                                }
                                jibo_service_clients_1.systemManager.installUpdates({ ids }, (error) => {
                                    if (error) {
                                        this._doError(error);
                                        this._analyticsEvent(OTA_FAILURE);
                                        return;
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    }
    _analyticsEvent(event) {
        if (Analytics_1.default && Analytics_1.default.instance && Analytics_1.default.instance.logEvent) {
            Analytics_1.default.instance.logEvent(event);
        }
        else {
            this._doError(`No handler found for Analytics event: ${event}`);
        }
    }
    _logBackupError(root) {
        if (!root.data.backupErrorCount || isNaN(root.data.backupErrorCount)) {
            root.data.backupErrorCount = 0;
        }
        root.data.backupErrorCount = root.data.backupErrorCount + 1;
        this._doLog(new Error("Backup error count: " + root.data.backupErrorCount));
        if (root.data.backupErrorCount >= MAX_BACKUP_FAILURES) {
            root.data.backupErrorCount = 0;
            this._doLog(new Error("Hit max backup errors; resetting backup error count"));
            return true;
        }
        return false;
    }
    _backupHelper(callback) {
        this._kbm.loadRoot((error, root) => {
            if (error || !root || !root.data) {
                return callback(new Error("Couldn't load backup/OTA root KB: " + error), false);
            }
            if (this._backingUp) {
                let maxError = this._logBackupError(root);
                root.save((error) => {
                    if (error) {
                        this._doError(new Error("Couldn't save backup/OTA root KB: " + error));
                    }
                    callback(new Error("Cannot instantiate a backup while a backup is already running!"), maxError);
                });
            }
            else {
                this._backingUp = true;
                jibo_service_clients_1.systemManager.backup((backupErr) => {
                    let maxError = false;
                    if (backupErr) {
                        maxError = this._logBackupError(root);
                    }
                    else {
                        root.data.backupErrorCount = 0;
                    }
                    root.save((error) => {
                        let errMsg = null;
                        if (error) {
                            errMsg = new Error("Couldn't save backup/OTA root KB: " + error);
                        }
                        this._backingUp = false;
                        callback((backupErr ? backupErr : errMsg), maxError);
                    });
                });
            }
        });
    }
    _isReady(callback) {
        this._kbm.loadRoot((error, root) => {
            if (error || !root || !root.data) {
                const msg = new Error("Couldn't load backup/OTA root KB on attempt install");
                this._doError(msg);
                return callback(msg);
            }
            if (!BodyClient_1.default.instance.pluggedIn) {
                root.data.error = PLUG_ERROR;
                let msg = new Error(root.data.error + ": Couldn't start backup/OTA process cause not plugged in");
                root.save((error) => {
                    if (error) {
                        msg = new Error(root.data.error + ": Couldn't save backup/OTA plug error status");
                        this._doError(msg);
                    }
                    return callback(msg);
                });
            }
            else {
                WifiService_1.default.instance.getCurrentNetwork().then((currentNetwork) => {
                    if (!currentNetwork || currentNetwork.ssid === undefined) {
                        throw "No network!";
                    }
                    WifiService_1.default.instance.verifyConnection().then((error) => {
                        if (error) {
                            if (error.code) {
                                root.data.error = (error.code === 1 ? WIFI_ERROR : INTERNET_ERROR);
                            }
                            else {
                                root.data.error = UHOH_ERROR;
                            }
                            let msg = new Error(root.data.error + ": Couldn't start backup/OTA process cause no internet: " + error);
                            this._doError(msg);
                            root.save((err) => {
                                if (err) {
                                    msg = new Error(root.data.error + ": Couldn't save backup/OTA internet error status");
                                    this._doError(msg);
                                }
                                return callback(msg);
                            });
                        }
                        else {
                            callback(null);
                        }
                    });
                }).catch((error) => {
                    root.data.error = WIFI_ERROR;
                    let msg = new Error(root.data.error + ": Couldn't start backup/OTA process cause no WiFi: " + error);
                    this._doError(msg);
                    root.save((error) => {
                        if (error) {
                            msg = new Error(root.data.error + ": Couldn't save backup/OTA wifi error status");
                            this._doError(msg);
                        }
                        return callback(msg);
                    });
                });
            }
        });
    }
    _backupIfOTA(callback) {
        this.checkForUpdates((error, data) => {
            if (error || !data) {
                const msg = error ? error : 'SystemManager service temporarily unavailable.';
                return callback(new Error(msg));
            }
            const count = data.length;
            if (count === 0) {
                return callback(new Error('No updates found. No backing up is necessary.'));
            }
            this._doLog('Skipping pre-OTA backup');
            return callback();
            this._backupHelper((bkError, maxError) => {
                if (bkError) {
                    if (maxError) {
                        this._doLog('Backup failed but letting OTA through');
                        callback();
                    }
                    else {
                        this._kbm.loadRoot((error, root) => {
                            if (error || !root || !root.data) {
                                this._doError(new Error('Could not load backup/OTA root KB to save backup error: ' + error));
                                callback(new Error('Could not OTA as backup failed; ' + bkError));
                            }
                            else {
                                root.data.error = BACKUP_OTA_ERROR;
                                root.save((err) => {
                                    if (err) {
                                        this._doError('Could not save backup error code in KB');
                                    }
                                    callback(new Error('Could not OTA as backup failed; ' + bkError));
                                });
                            }
                        });
                    }
                }
                else {
                    callback();
                }
            });
        });
    }
    _startNextDownload(callback) {
        this.checkForUpdates((error, data) => {
            this._resetDLStatus();
            if (error || !data) {
                const msg = error ? error : 'Service temporarily unavailable.';
                return callback(new Error(msg));
            }
            const count = data.length;
            if (count === 0) {
                return callback(new Error('No updates found.'));
            }
            if (this._backingBeforeUpdate) {
                this._backingBeforeUpdate = false;
            }
            let nextId = [];
            let doneIds = [];
            for (let i = 0; i < count; i++) {
                if (data[i].downloaded) {
                    doneIds.push(data[i].id);
                }
                else if (nextId.length === 0) {
                    nextId.push(data[i].id);
                }
            }
            if (nextId.length > 0) {
                this._doLog('Starting ota download: ' + nextId);
                this._downloadStatus.updates = data.slice();
                jibo_service_clients_1.systemManager.downloadUpdates({ ids: nextId }, (err, dlData) => {
                    this._downloadStatus.status = Object.assign({}, dlData);
                    if (err || dlData.status === 'failed' || dlData.error) {
                        this._resetDLStatus();
                        const msg = (err || dlData.reason || dlData.error);
                        return callback(new Error('Error downloading OTA updates: ' + msg));
                    }
                    if (dlData.status === 'finished') {
                        this._startNextDownload(callback);
                    }
                });
            }
            else {
                this._resetDLStatus();
                callback(null, doneIds);
            }
        });
    }
    _resetDLStatus() {
        this._downloadStatus = {
            updates: [],
            status: null
        };
    }
    _doLog(msg) {
        if (this._log) {
            this._log.info(msg);
        }
    }
    _doError(msg) {
        if (this._log) {
            this._log.warn(msg);
        }
    }
}
OTAUpdater._instance = null;
exports.default = OTAUpdater;

},{"../clients/BodyClient":11,"../clients/KBClient":14,"../services/kb/KBService":45,"../services/wifi/WifiService":67,"./analytics/Analytics":110,"jibo-service-clients":undefined}],108:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RunMode {
    static get runMode() {
        let runMode = process.env.runMode || process.env.RUNMODE;
        if (!runMode && process.platform === 'linux' && process.arch === 'arm') {
            runMode = RunMode.RunMode.ON_ROBOT;
        }
        return runMode;
    }
}
RunMode.RunMode = {
    SIMULATOR: "SIMULATOR",
    REMOTELY: "REMOTELY",
    ON_ROBOT: "ON_ROBOT",
    UNIT_TESTS: "UNIT_TESTS"
};
exports.default = RunMode;

},{}],109:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_service_clients_1 = require("jibo-service-clients");
let semver = require('semver');
function versionCheck(versionToCheck, callback) {
    if (!versionToCheck) {
        callback();
        return;
    }
    jibo_service_clients_1.systemManager.getVersion((error, currentVersion) => {
        if (error) {
            callback(error);
            return;
        }
        let errorMsg = undefined;
        if (!semver.satisfies(currentVersion, versionToCheck)) {
            errorMsg = "Current SSM version requires platform version " + versionToCheck + " but your current version is " + currentVersion + "!";
        }
        callback(errorMsg);
    });
}
exports.versionCheck = versionCheck;

},{"jibo-service-clients":undefined,"semver":undefined}],110:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SegmentAnalytics = require("@jibo/analytics-node");
const jibo_service_clients_1 = require("jibo-service-clients");
const RunMode_1 = require("../RunMode");
const findRoot = require("find-root");
const path = require("path");
const log_1 = require("../../log");
const log = log_1.default.createChild('Analytics');
class Analytics {
    static createInstance() {
        return new Analytics();
    }
    static get instance() {
        return Analytics._instance;
    }
    constructor() {
        this._context = {
            ssm_version: "",
            be_version: "",
            platform_version: "",
            release_version: ""
        };
        this._robotName = null;
        Analytics._instance = this;
    }
    init(callback) {
        jibo_service_clients_1.systemManager.getMode((err, data) => {
            let segmentKey = "Iw6EWJHfEfZqZWUstvcmPFBl752zVqTg";
            if (data && data !== 'int-developer') {
                segmentKey = "eKTraeQ8jzBijVo5oIP6fvERY616XexN";
            }
            if (RunMode_1.default.runMode === RunMode_1.default.RunMode.SIMULATOR) {
                this._segmentAnalytics = {
                    LOG_TO_CONSOLE: false,
                    track: function (data) {
                        if (this.LOG_TO_CONSOLE) {
                            console.log('SegmentAnalytics Debugging: tracked ', data);
                        }
                    },
                    identify: function (data) {
                        if (this.LOG_TO_CONSOLE) {
                            console.log('SegmentAnalytics Debugging: identified ', data);
                        }
                    }
                };
            }
            else {
                this._segmentAnalytics = new SegmentAnalytics(segmentKey);
                if ('sinon' in global) {
                    this._segmentAnalytics.queue.push = function () { };
                }
            }
            log.info("Adding segment instance", segmentKey);
            jibo_service_clients_1.systemManager.getIdentity((err, data) => {
                if (data) {
                    this._robotName = data.name;
                }
                this._initContext(callback);
            });
        });
    }
    logEvent(event, properties = {}) {
        if (this._segmentAnalytics) {
            properties.robot_name = this._robotName;
            properties.event_hour = new Date().getHours();
            this._segmentAnalytics.track({
                userId: "SSM",
                event: event,
                properties: properties,
                context: this._context,
                timestamp: new Date()
            });
        }
        else {
            throw new Error('Analytics: logEvent requires a valid segmentAnalytics instance.');
        }
    }
    _initContext(done) {
        try {
            this._context.release_version = require('/opt/jibo/Jibo/Skills/jibo-tbd/package.json').version;
        }
        catch (err) {
            log.warn('no full-stack release number found', err);
            this._context.release_version = '8.67.5309';
        }
        try {
            this._context.be_version = require('/opt/jibo/Jibo/Skills/@be/be/package.json').version;
        }
        catch (err) {
            log.warn('no Be version number found', err);
            this._context.be_version = '8.67.5309';
        }
        const root = findRoot(__dirname);
        const packageInfo = require(path.join(root, 'package.json'));
        this._context.ssm_version = packageInfo.version;
        jibo_service_clients_1.systemManager.getVersion((err, platformVersion) => {
            if (err || !platformVersion) {
                log.warn('no platform version number found', err);
                this._context.platform_version = '8.67.5309';
            }
            else {
                this._context.platform_version = platformVersion;
            }
            done();
        });
    }
}
exports.default = Analytics;

},{"../../log":20,"../RunMode":108,"/opt/jibo/Jibo/Skills/@be/be/package.json":undefined,"/opt/jibo/Jibo/Skills/jibo-tbd/package.json":undefined,"@jibo/analytics-node":undefined,"find-root":undefined,"jibo-service-clients":undefined,"path":undefined}],111:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');
const async = require('async');
const lsdashlart = (dir, callback) => {
    fs.readdir(dir, (err, list) => {
        if (err) {
            callback(err);
        }
        else {
            let fullnames = list.map((file) => {
                return path.join(dir, file);
            });
            let doStat = (fullname, callback) => {
                fs.lstat(fullname, (err, stat) => {
                    callback(err, { filename: fullname, stat: stat });
                });
            };
            async.map(fullnames, doStat, (err, files) => {
                if (!err && files) {
                    files.sort((a, b) => { return a.stat.mtime.getTime() - b.stat.mtime.getTime(); });
                }
                callback(err, files);
            });
        }
    });
};
exports.default = lsdashlart;

},{"async":undefined,"fs":undefined,"path":undefined}],112:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function rbDiffMs(start, end) {
    const startMs = rbTimeToMs(start);
    const endMs = rbTimeToMs(end);
    return endMs - startMs;
}
exports.rbDiffMs = rbDiffMs;
function rbTimeToMs(robotTime) {
    return robotTime[0] * 1e3 + robotTime[1] * 1e-3;
}
exports.rbTimeToMs = rbTimeToMs;
function rbTimesSort(times) {
    if (!times || !times.length) {
        return null;
    }
    times.sort((left, right) => {
        const leftMs = rbTimeToMs(left);
        const rightMs = rbTimeToMs(right);
        return leftMs - rightMs;
    });
    return times;
}
exports.rbTimesSort = rbTimesSort;

},{}],113:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let WebSocket = require('ws');
global.WebSocket = WebSocket;
const Factory_1 = require("./Factory");
const jibo_service_framework_1 = require("jibo-service-framework");
const TTSService_1 = require("./sim-services/tts/TTSService");
const LPSService_1 = require("./sim-services/lps/LPSService");
const NotificationsService_1 = require("./services/notifications/NotificationsService");
const JetstreamServiceSim_1 = require("./sim-services/jetstream/JetstreamServiceSim");
const BodyService_1 = require("./sim-services/body/BodyService");
const GlobalManagerService_1 = require("./services/global-manager/GlobalManagerService");
const SkillsService_1 = require("./services/skills/SkillsService");
const MediaService_1 = require("./sim-services/media/MediaService");
const MediaManagerService_1 = require("./services/media-manager/MediaManagerService");
const KBService_1 = require("./services/kb/KBService");
const WifiService_1 = require("./services/wifi/WifiService");
const SchedulerService_1 = require("./services/scheduler/SchedulerService");
const DevShell_1 = require("./services/dev-shell/DevShell");
const Debouncer_1 = require("./utils/Debouncer");
const GetConfig_1 = require("./init/GetConfig");
const ErrorService_1 = require("./services/error/ErrorService");
const SecureTransferServiceSim_1 = require("./sim-services/secure-transfer/SecureTransferServiceSim");
const SecurityControllerService_1 = require("./services/security-controller/SecurityControllerService");
const ExpressionService_1 = require("./services/expression/ExpressionService");
const RemoteService_1 = require("./services/remote/RemoteService");
const ScreenScheduler_1 = require("./background/screen/ScreenScheduler");
const log_1 = require("./log");
exports.default = {
    Factory: Factory_1.default,
    TTSService: TTSService_1.default,
    RegistryClient: jibo_service_framework_1.RegistryClient,
    HTTPWSService: jibo_service_framework_1.HTTPWSService,
    HTTPService: jibo_service_framework_1.HTTPService,
    LPSService: LPSService_1.default,
    NotificationsService: NotificationsService_1.default,
    BodyService: BodyService_1.default,
    JetstreamServiceSim: JetstreamServiceSim_1.default,
    SkillsService: SkillsService_1.default,
    GlobalManagerService: GlobalManagerService_1.default,
    MediaService: MediaService_1.default,
    MediaManagerService: MediaManagerService_1.default,
    KBService: KBService_1.default,
    WifiService: WifiService_1.default,
    SchedulerService: SchedulerService_1.default,
    TcpProxy: DevShell_1.TcpProxy,
    Debouncer: Debouncer_1.default,
    GetConfig: GetConfig_1.default,
    ErrorService: ErrorService_1.default,
    SecureTransferServiceSim: SecureTransferServiceSim_1.default,
    SecurityControllerService: SecurityControllerService_1.default,
    ExpressionService: ExpressionService_1.default,
    RemoteService: RemoteService_1.default,
    ScreenScheduler: ScreenScheduler_1.default,
    rootLog: log_1.default
};
function start() {
    require('./main-process/index');
}
exports.start = start;

},{"./Factory":2,"./background/screen/ScreenScheduler":10,"./init/GetConfig":19,"./log":20,"./main-process/index":undefined,"./services/dev-shell/DevShell":21,"./services/error/ErrorService":28,"./services/expression/ExpressionService":34,"./services/global-manager/GlobalManagerService":42,"./services/kb/KBService":45,"./services/media-manager/MediaManagerService":52,"./services/notifications/NotificationsService":53,"./services/remote/RemoteService":56,"./services/scheduler/SchedulerService":61,"./services/security-controller/SecurityControllerService":63,"./services/skills/SkillsService":65,"./services/wifi/WifiService":67,"./sim-services/body/BodyService":83,"./sim-services/jetstream/JetstreamServiceSim":87,"./sim-services/lps/LPSService":92,"./sim-services/media/MediaService":94,"./sim-services/secure-transfer/SecureTransferServiceSim":97,"./sim-services/tts/TTSService":103,"./utils/Debouncer":106,"jibo-service-framework":undefined,"ws":undefined}]},{},[113])(113)
});

//# sourceMappingURL=skills-service-manager.js.map
