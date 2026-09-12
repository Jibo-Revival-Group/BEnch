(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.expressionProcess = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function instantiateService(ServiceClass, options, rootDir) {
    return new ServiceClass(options, rootDir);
}
exports.instantiateService = instantiateService;

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_log_1 = require("jibo-log");
const log = new jibo_log_1.Log('SSM');
exports.default = log;

},{"jibo-log":undefined}],3:[function(require,module,exports){
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
global.realThree = true;
const xmlhttprequest_1 = require("xmlhttprequest");
global.XMLHttpRequest = xmlhttprequest_1.default;
const jibo_service_framework_1 = require("jibo-service-framework");
const jibo_cai_utils_1 = require("jibo-cai-utils");
const ExpressionService_1 = require("../../services/expression/ExpressionService");
const SSMService_1 = require("../../SSMService");
const WebSocket = require("ws");
const jibo_log_1 = require("jibo-log");
global.WebSocket = WebSocket;
jibo_log_1.Log.processName = 'exp';
const log_1 = require("../../services/log");
const log = log_1.default.createChild('Exp');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        jibo_service_framework_1.RegistryClient.createInstance('127.0.0.1', 8181);
        const record = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => jibo_service_framework_1.RegistryClient.instance.getRecordByName('system-manager', cb));
        jibo_service_framework_1.SystemManagerClient.createInstance('127.0.0.1', record.port);
        const mode = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => jibo_service_framework_1.SystemManagerClient.instance.getMode(cb));
        const configPath = `/usr/local/etc/jibo-ssm/jibo-ssm-${mode}.json`;
        const config = require(configPath);
        if (config.logging) {
            try {
                yield jibo_log_1.Log.loadConfig(config.logging);
            }
            catch (err) {
                console.error('Error loading config', err);
            }
        }
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
        global.expression = SSMService_1.instantiateService(ExpressionService_1.default, {
            port: 10015,
        }, __dirname);
        try {
            let pid = process.pid;
            if (process.argv.indexOf('--pid') >= 0) {
                pid = parseInt(process.argv[3]);
            }
            yield jibo_cai_utils_1.PromiseUtils.promisify(cb => ExpressionService_1.default.instance.init(cb));
            const sem = require('node-semaphore');
            const s = sem.Semaphore('/jibo-startup-' + process.pid + '.event');
            s.post();
            log.info('Finished initialization reporting pid', pid);
        }
        catch (e) {
            log.error('Could not initialize expression service', e);
        }
    });
}
main();

},{"../../SSMService":1,"../../services/expression/ExpressionService":6,"../../services/log":14,"jibo-cai-utils":undefined,"jibo-log":undefined,"jibo-service-framework":undefined,"node-semaphore":undefined,"ws":undefined,"xmlhttprequest":undefined}],4:[function(require,module,exports){
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

},{"animation-utilities":undefined,"jibo-common-types":undefined,"jibo-service-framework":undefined}],5:[function(require,module,exports){
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

},{"./AnimationInstance":4,"./IndexRobot":7,"./handles/AcquireHandle":9,"./handles/AttentionHandle":10,"./handles/AwaitFaceHandle":11,"./log":13,"animation-utilities":undefined,"fs":undefined,"jibo-cai-utils":undefined,"jibo-common-types":undefined,"jibo-service-framework":undefined,"uuid":undefined}],6:[function(require,module,exports){
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

},{"./Expression":5,"./attention/Jibo":8,"./log":13,"animation-utilities":undefined,"jibo-attention-manager":undefined,"jibo-cai-utils":undefined,"jibo-common-types":undefined,"jibo-dof-arbiter":undefined,"jibo-service-framework":undefined}],7:[function(require,module,exports){
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

},{"./ExpressionService":6,"./log":13,"jibo-cai-utils":undefined,"jibo-common-types":undefined}],8:[function(require,module,exports){
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

},{"jibo-cai-utils":undefined,"jibo-service-clients/lib/expression-service-clients":undefined,"jibo-service-framework":undefined}],9:[function(require,module,exports){
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

},{"./log":12,"animation-utilities":undefined,"jibo-common-types":undefined,"jibo-service-framework":undefined}],10:[function(require,module,exports){
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

},{"./log":12,"animation-utilities":undefined,"jibo-service-framework":undefined}],11:[function(require,module,exports){
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

},{"./log":12,"animation-utilities":undefined,"jibo-service-framework":undefined}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Handles');

},{"../log":13}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../../services/log");
exports.default = log_1.default.createChild('Exp');

},{"../../services/log":14}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Svc');

},{"../log":2}]},{},[3])(3)
});

//# sourceMappingURL=expression-process.js.map
