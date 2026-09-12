(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboAttentionManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Bakery = AnimationUtilities.ui.Bakery;
var ModalityHandler = require("./ModalityHandler");
var TrackedSensory = require("./TrackedSensory");
var SensoryRecord = require("./SensoryRecord");
var slog = AnimationUtilities.slog;
var channel = "ATTENTION";
/**
 * @param {MotorMotionMonitor} motionTracker
 * @constructor
 * @extends ModalityHandler
 */
var ALWakeModalityHandler = function (motionTracker) {
    ModalityHandler.call(this);
    /**
     * @type {MotorMotionMonitor}
     */
    this.motionTracker = motionTracker;
    this.confidenceThreshold = 0;
    this.heightFloor = -1;
};
ALWakeModalityHandler.prototype = Object.create(ModalityHandler.prototype);
ALWakeModalityHandler.prototype.constructor = ALWakeModalityHandler;
/**
 * @param {SensoryRecord} sensoryRecord
 * @returns {boolean}
 * @override
 */
ALWakeModalityHandler.prototype.isValid = function (sensoryRecord) {
    if (sensoryRecord.raw.type !== 1) {
        slog(channel, "ALWakeModalityHandler: Unexpected packet type: " + JSON.stringify(sensoryRecord.raw));
        return false;
    }
    if (sensoryRecord.position === null) {
        slog(channel, "ALWakeModalityHandler: unexpected wake record format (no position)");
        return false;
    }
    var rejectMovingAudio = Bakery.getBoolean("Reject WAKE during motion", false, "SensoryFilters");
    var rejectMovingAudioRecoveryTime = Bakery.getFloat("Reject WAKE recovery time", 0, 2, 0.7, "SensoryFilters");
    var confidence = sensoryRecord.confidence;
    var confidenceOK = confidence >= Bakery.getFloat("Confidence Threshold (WAKE)", 0, 1, this.confidenceThreshold, "SensoryFilters");
    var motionOK = !rejectMovingAudio || this.motionTracker.timeSinceMoving() >= rejectMovingAudioRecoveryTime;
    return (confidenceOK && motionOK);
};
/**
 * @param {SensoryRecord} sensoryRecord
 * @override
 */
ALWakeModalityHandler.prototype.accept = function (sensoryRecord) {
    var minHeight = Bakery.getFloat("Localized-Wake Height Floor", -1, 1, this.heightFloor, "SensoryFilters");
    if (sensoryRecord.position.z < minHeight) {
        sensoryRecord.position.z = minHeight;
    }
    var trackedSensory = new TrackedSensory(SensoryRecord.SensoryType.WAKE);
    trackedSensory.incorporateSensorReport(sensoryRecord);
    trackedSensory.wakeAt = sensoryRecord.receivedAt;
    this.tracked.length = 0;
    this.tracked.push(trackedSensory);
};
module.exports = ALWakeModalityHandler;

},{"./ModalityHandler":9,"./SensoryRecord":12,"./TrackedSensory":15,"animation-utilities":undefined}],2:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var SimpleAnimGenerator = require("./SimpleAnimGenerator");
var slog = require("animation-utilities").slog;
var channel = "ATTENTION";
//var channelFromValue = function(dofName, value){
//	return {
//		"dofName": dofName,
//		"times": [
//			0.0
//		],
//		"values": [
//			value
//		],
//		"length": 0.1
//	};
//};
//
//var animFromColor = function(name, r, g, b){
//	return {
//		"header": {
//			"fileType": "DOFAnimation",
//			"version": "0.002",
//			"creationTime": new Date().getTime()
//		},
//		"content": {
//			"name": name,
//			"channels": [
//				channelFromValue("eye_redChannelBn_r", r),
//				channelFromValue("eye_greenChannelBn_r", g),
//				channelFromValue("eye_blueChannelBn_r", b)
//			]
//		}
//	};
//};
/**
 *
 * @param {AnimationUtilities} animationUtilities
 * @param {string} name
 * @param {number} r - 0 to 1
 * @param {number} g - 0 to 1
 * @param {number} b - 0 to 1
 * @returns {AnimationBuilder}
 */
var builderFromColor = function (animationUtilities, name, r, g, b) {
    var builder = animationUtilities.createAnimationBuilderFromData(SimpleAnimGenerator.animFromColor(name, r, g, b, "lightring"), "./animations", name);
    builder.setTransitionIn(null);
    return builder;
};
var AttentionDebugStateVisualizer = function (animationUtilities, dofArbiter, emChannel) {
    /**
     * @type {AnimationUtilities}
     * @private
     */
    this._animationUtilities = animationUtilities;
    /**
     * @type {DOFArbiter}
     * @private
     */
    this._dofArbiter = dofArbiter;
    /**
     * @type {string}
     * @private
     */
    this._emChannel = emChannel;
    /**
     * @type {?string}
     * @private
     */
    this._displayingState = null;
    /**
     * @type {AnimationBuilder}
     * @private
     */
    //this._displayFaceTracking = builderFromColor(this._animationUtilities, "Face Track Vis", 1, 1, 0.6);
    this._displayFaceTracking = builderFromColor(this._animationUtilities, "Face Track Vis", 0, 1, 0);
    /**
     * @type {AnimationBuilder}
     * @private
     */
    //this._displayMotionTracking = builderFromColor(this._animationUtilities, "Motion Track Vis", 0.5, 1, 0.6);
    this._displayMotionTracking = builderFromColor(this._animationUtilities, "Motion Track Vis", 0, 0, 1);
    /**
     * @type {AnimationBuilder}
     * @private
     */
    //this._displaySoundTracking = builderFromColor(this._animationUtilities, "Sound Track Vis", 0.6, 0.6, 1);
    this._displaySoundTracking = builderFromColor(this._animationUtilities, "Sound Track Vis", 1, 0, 1);
    /**
     * @type {AnimationBuilder}
     * @private
     */
    //this._displayDisengage = builderFromColor(this._animationUtilities, "Disengage Vis", 1, 1, 0.75);
    this._displayDisengage = builderFromColor(this._animationUtilities, "Disengage Vis", 1, 1, 0);
    /**
     * @type {AnimationBuilder}
     * @private
     */
    //this._displayingNothing = builderFromColor(this._animationUtilities, "No Vis", 1, 1, 1);
    this._displayingNothing = builderFromColor(this._animationUtilities, "No Vis", 0, 0, 0);
};
/**
 * @param {string} state
 * @param {boolean} [force] - if true, displays the state regardless of lastState (Defaults to false).  for resuming from unknown robot configuration.
 */
AttentionDebugStateVisualizer.prototype.handleState = function (state, force) {
    if (this._displayingState !== state || force === true) {
        if (state === "FACE") {
            this._dofArbiter.playAnimation(this._displayFaceTracking, this._emChannel);
            //console.log("Displaying face color");
        }
        else if (state === "MOTION") {
            this._dofArbiter.playAnimation(this._displayMotionTracking, this._emChannel);
            //console.log("Displaying motion color");
        }
        else if (state === "SOUND") {
            this._dofArbiter.playAnimation(this._displaySoundTracking, this._emChannel);
            //console.log("Displaying sound color");
        }
        else if (state === "DISENGAGE") {
            this._dofArbiter.playAnimation(this._displayDisengage, this._emChannel);
            //console.log("Displaying disengage");
        }
        else if (state === null) {
            this._dofArbiter.playAnimation(this._displayingNothing, this._emChannel);
            //console.log("Displaying no color");
        }
        else {
            slog(channel, "AttentionDebugStateVisualizer: Unknown debug state:" + state);
        }
        this._displayingState = state;
    }
};
module.exports = AttentionDebugStateVisualizer;

},{"./SimpleAnimGenerator":14,"animation-utilities":undefined}],3:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var slog = AnimationUtilities.slog;
var eventQueue = [];
var AttentionEventDispatcher = {
    /**
     *
     * @param {Function} theFunction
     * @param {?Object} theObject
     * @param {Array} theArgs
     */
    queueEvent: function (theFunction, theObject, theArgs) {
        if (theFunction == null) {
            slog.error("AttentionEventDispatcher: Error, null/undefined function queued!\n" + new Error().stack);
        }
        //console.log("AttentionEventDispatcher:pushing f:"+theFunction+", o:"+theObject+", a:"+JSON.stringify(theArgs));
        eventQueue.push({ f: theFunction, o: theObject, a: theArgs });
    },
    /**
     * Dispatch all events queued
     */
    dispatchQueuedEvents: function () {
        for (var i = 0; i < eventQueue.length; i++) {
            var e = eventQueue[i];
            //console.log("applying e.f:"+ e.f+", e.o:"+ e.o+", e.a:"+ JSON.stringify(e.a));
            e.f.apply(e.o, e.a);
        }
        eventQueue.length = 0;
    }
};
module.exports = AttentionEventDispatcher;

},{"animation-utilities":undefined}],4:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var SimpleAnimGenerator = require("./SimpleAnimGenerator");
/**
 *
 * @param {AnimationUtilities} animationUtilities
 * @param {DOFArbiter} dofArbiter
 * @param {string} emChannel
 * @constructor
 */
var AttentionEyeRecessor = function (animationUtilities, dofArbiter, emChannel) {
    /**
     * @type {AnimationUtilities}
     * @private
     */
    this._animationUtilities = animationUtilities;
    /**
     * @type {DOFArbiter}
     * @private
     */
    this._dofArbiter = dofArbiter;
    /**
     * @type {string}
     * @private
     */
    this._emChannel = emChannel;
    this._recessedBuilder = animationUtilities.createAnimationBuilderFromData(SimpleAnimGenerator.animFromAlphaAndScale("Recessed", 0.87, 0.95, animationUtilities.getRobotInfo()));
    this._recessedBuilder.setSpeed(0);
    this._recessedBuilder.getTransitionIn().setLimits(animationUtilities.getRobotInfo().getEyeDOFNames(), 20, 10);
    //this._recessedBuilder.setStopOrient(false);
    this._defaultBuilder = animationUtilities.createAnimationBuilderFromData(SimpleAnimGenerator.animFromAlphaAndScale("Default", 1, 1, animationUtilities.getRobotInfo()));
    this._defaultBuilder.getTransitionIn().setLimits(animationUtilities.getRobotInfo().getEyeDOFNames(), 20, 40);
    //this._defaultBuilder.setStopOrient(false);
    /**
     * @type {LookatEventCallback}
     * @private
     */
    this._startedListener = this.lookStarted.bind(this);
    /**
     * @type {LookatEventCallback}
     * @private
     */
    this._endedListener = this.lookEnded.bind(this);
    /**
     *
     * @type {THREE.Vector3}
     * @private
     */
    this._lastTarget = null;
    /**
     *
     * @type {THREE.Vector3}
     * @private
     */
    this._currentTarget = null;
    /**
     *
     * @type {number}
     * @private
     */
    this._recessionThreshold = 0;
    /**
     *
     * @type {boolean}
     * @private
     */
    this._isRecessed = false;
};
/**
 *
 * @param {number} threshold
 */
AttentionEyeRecessor.prototype.setRecessionThreshold = function (threshold) {
    this._recessionThreshold = threshold;
};
/**
 * @param {?THREE.Vector3} lastTarget
 * @param {THREE.Vector3} currentTarget
 */
AttentionEyeRecessor.prototype.notifyTargets = function (lastTarget, currentTarget) {
    this._lastTarget = lastTarget;
    this._currentTarget = currentTarget;
};
/**
 *
 */
AttentionEyeRecessor.prototype.shouldRecess = function () {
    //var r = (this._lastTarget===null || this._lastTarget.distanceTo(this._currentTarget) > this._recessionThreshold);
    var r = (this._lastTarget === null || this._lastTarget.angleTo(this._currentTarget) > this._recessionThreshold);
    //todo: we could use angle from an "average head pivot" location if available instead of from base.
    return r;
};
/**
 * @param {LookatBuilder} builder
 */
AttentionEyeRecessor.prototype.attachToBuilder = function (builder) {
    builder.on("STARTED", this._startedListener);
    builder.on("STOPPED", this._endedListener);
    builder.on("CANCELLED", this._endedListener);
    builder.on("TARGET_REACHED", this._endedListener);
};
/**
 *
 * @param {string} eventName
 * @param {LookatInstance} instance
 * @param {Object} payload
 */
AttentionEyeRecessor.prototype.lookStarted = function (eventName, instance, payload) {
    if (this.shouldRecess()) {
        //console.log("Look started event");
        var recessInstance = this._dofArbiter.playAnimation(this._recessedBuilder, this._emChannel);
        if (recessInstance !== null) {
            this._isRecessed = true;
        }
    }
};
/**
 *
 * @param {string} eventName
 * @param {LookatInstance} instance
 * @param {Object} payload
 */
AttentionEyeRecessor.prototype.lookEnded = function (eventName, instance, payload) {
    //console.log("Stop Recession:"+eventName);
    if (this._isRecessed) {
        this._dofArbiter.playAnimation(this._defaultBuilder, this._emChannel);
        this._isRecessed = false;
    }
};
/**
 * Gets the recession target state: true means we are recessing or are recessed; false means we are un-recessing or are un-recessed.
 * @returns {boolean}
 */
AttentionEyeRecessor.prototype.getIsRecessed = function () {
    return this._isRecessed;
};
module.exports = AttentionEyeRecessor;

},{"./SimpleAnimGenerator":14}],5:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var SensoryStore = require("./SensoryStore");
var SensoryRecord = require("./SensoryRecord");
var AnimationUtilities = require("animation-utilities");
var Clock = AnimationUtilities.Clock;
var Bakery = AnimationUtilities.ui.Bakery;
var JSONBaker = AnimationUtilities.ui.JSONBaker;
var RemoteVisualizerConnection = require("./remote/RemoteVisualizerConnection");
var DataConverter = require("./DataConverter");
var AttentionDebugStateVisualizer = require("./AttentionDebugStateVisualizer");
var THREE = AnimationUtilities.THREE;
var MotorMotionMonitor = require("./MotorMotionMonitor");
var AttentionEyeRecessor = require("./AttentionEyeRecessor");
var findRoot = require("find-root");
var SensoryLogController = require("./log/SensoryLogController");
var slog = AnimationUtilities.slog;
var AttentionEventDispatcher = require("./AttentionEventDispatcher");
var FaceAwaiter = require("./actions/FaceAwaiter");
//var SimpleSearchIterator = require("./actions/SimpleSearchIterator");
var TridentSearchIterator = require("./actions/TridentSearchIterator");
var AttendHandle = require("./actions/AttendHandle");
var ResultStatus = require("./actions/ResultStatus");
var LPSConnection = require("./actions/LPSConnection");
var AttentionModeStack = require("./AttentionModeStack");
var LookConfig = require("./lookconfig/LookConfig");
var LookConfigSlow = require("./lookconfig/LookConfigSlow");
var LookConfigSlowDown = require("./lookconfig/LookConfigSlowDown");
var LookConfigShort = require("./lookconfig/LookConfigShort");
var LookConfigDisengage = require("./lookconfig/LookConfigDisengage");
var LookConfigUncommitted = require("./lookconfig/LookConfigUncommitted");
var LookConfigEyeVision = require("./lookconfig/LookConfigEyeVision");
var LookConfigEyeVisionEngaged = require("./lookconfig/LookConfigEyeVisionEngaged");
var LookConfigEyeVisionMenu = require("./lookconfig/LookConfigEyeVisionMenu");
var LookConfigRelaxed = require("./lookconfig/LookConfigRelaxed");
var channel = "ATTENTION";
var DADefaultChannel = "Attention";
var DACommandChannel = "AttentionCommand";
/**
 * @description
 * Jibo's Attention Manager - Internal Only
 *
 * ```
 * var jibo = require("jibo");
 * jibo.attention.setMode(jibo.attention.Mode.IDLE);
 * ```
 * @namespace jibo.attention
 * @intdocs
 */
/**
 * @description Enum of attention modes.
 * @name jibo.attention.Mode
 * @type Enum
 * @property {string} OFF - Off.
 * @property {string} IDLE - Idle.
 * @property {string} RELAXED - Relaxed.
 * @property {string} NAP - Nap.
 * @property {string} DISENGAGE - Transient disengage.
 * @property {string} ENGAGED - Engaged.
 * @property {string} SPEAKING - Speaking.
 * @property {string} FIXATED - Fixated.
 * @property {string} ATTRACTABLE - Attractable.
 * @property {string} MENU - Menu display mode.
 * @property {string} COMMAND - Direct command mode.
 */
var Mode = {
    OFF: "OFF",
    IDLE: "IDLE",
    RELAXED: "RELAXED",
    NAP: "NAP",
    DISENGAGE: "DISENGAGE",
    ENGAGED: "ENGAGED",
    SPEAKING: "SPEAKING",
    FIXATED: "FIXATED",
    ATTRACTABLE: "ATTRACTABLE",
    MENU: "MENU",
    COMMAND: "COMMAND"
};
/**
 * @description Callback for attention events.
 * @callback jibo.attention#AttentionListener
 * @param {jibo.attention.EventType} eventType - Name of event
 * @param {jibo.attention.AttentionEventInfo} info - Event info payload
 */
/**
 * @description Info object that comes along with attention events.
 * @typedef {Object} jibo.attention.AttentionEventInfo
 * @property {?THREE.Vector3} position - Position of the "hey jibo". Present for `STARTED_HEY_JIBO` and `FINISHED_HEY_JIBO`.
 * @property {?boolean} interrupted - `true` if interrupted, `false` if motion completed. Present for `FINISHED_HEY_JIBO`.
*/
/**
 * @description Enum of events fired by AttentionManager. When a Hey Jibo occurs, either `IGNORED_HEY_JIBO` or `STARTED_HEY_JIBO`
 * will be fired. If `IGNORED_HEY_JIBO` is fired, there will be no further events for this Hey Jibo.
 * If `STARTED_HEY_JIBO` is fired, there will be a corresponding `FINISHED_HEY_JIBO` (check the info object's
 * `interrupted` field to see if the response finished successfully or was interrupted).
 *
 * See {@link jibo.attention.AttentionEventInfo} for into on the data presented along with the event
 *
 * @name jibo.attention.EventType
 * @type Enum
 * @property {string} IGNORED_HEY_JIBO - Fired when a Hey Jibo will be ignored (no rule to process in current mode, no localization data, etc.).
 * @property {string} STARTED_HEY_JIBO - Fired when a Hey Jibo will be acted upon.  Expect a followup `FINISHED_HEY_JIBO`.
 * @property {string} FINISHED_HEY_JIBO - Fired when we have finished acting upon a Hey Jibo.
 */
var EventType = {
    /**
     * Fired when a Hey Jibo will be ignored (no rule to process in current mode, no localization data, etc.)
     */
    IGNORED_HEY_JIBO: "IGNORED_HEY_JIBO",
    /**
     * Fired when a Hey Jibo will be acted upon.  Expect a followup FINISHED_HEY_JIBO.
     */
    STARTED_HEY_JIBO: "STARTED_HEY_JIBO",
    /**
     * Fired when we have finished acting upon a Hey Jibo.
     */
    FINISHED_HEY_JIBO: "FINISHED_HEY_JIBO"
};
var RulesState = function () {
    /**
     * @type {boolean}
     */
    this.lookClaimed = false;
};
RulesState.prototype.clear = function () {
    this.lookClaimed = false;
};
/**
 * Find a random point near target, with a limit as to how much horizontal distance to go,
 * and a limit on the absolute range of the vertical angle (Vertical not related to target).
 * @param {THREE.Vector3} targetPoint - Defines center of the area we will be choosing a point in.
 * @param {number} maxAngleAround - Max angle left (or right) around the circle to travel from center.
 * @param {number} minAngleVertical - Min angle from horizontal plane for the new point (0 means horizontal, +PI/2 means vertical).
 * @param {number} maxAngleVertical - Max angle from horizontal plane for the new point (0 means horizontal, +PI/2 means vertical).
 * @returns {THREE.Vector3}
 */
var randomPointNearAbsoluteVertical = function (targetPoint, maxAngleAround, minAngleVertical, maxAngleVertical) {
    var angleAround = (Math.random() - 0.5) * 2 * maxAngleAround;
    var verticalAngle = (Math.random() * (maxAngleVertical - minAngleVertical)) + minAngleVertical;
    var newTarget = new THREE.Vector3().copy(targetPoint);
    var vertical = new THREE.Vector3(0, 0, 1);
    newTarget.projectOnPlane(vertical);
    if (newTarget.length() < 0.001) {
        return null;
    }
    newTarget.applyAxisAngle(vertical, angleAround);
    newTarget.setLength(1.5);
    var temp = vertical.cross(newTarget).normalize();
    newTarget.applyAxisAngle(temp, -verticalAngle);
    return newTarget;
};
/**
 * Find a random point near target, with a limit as to how much horizontal/vertical distance to go.
 * @param {THREE.Vector3} targetPoint - Defines center of the area we will be choosing a point in.
 * @param {number} maxAngleAround - Max angle left (or right) around the circle to travel from center.
 * @param {number} maxAngleVertical - Max angle to go up or down from center.
 * @returns {THREE.Vector3}
 */
var randomPointNearRelativeVertical = function (targetPoint, maxAngleAround, maxAngleVertical) {
    var angleAround = (Math.random() - 0.5) * 2 * maxAngleAround;
    var angleVert = (Math.random() - 0.5) * 2 * maxAngleVertical;
    var newTarget = new THREE.Vector3().copy(targetPoint);
    var vertical = new THREE.Vector3(0, 0, 1);
    var horizontal = new THREE.Vector3(0, 0, 1).cross(newTarget);
    if (horizontal.length() < 0.001) {
        return null;
    }
    newTarget.applyAxisAngle(horizontal, angleVert);
    newTarget.applyAxisAngle(vertical, angleAround);
    newTarget.setLength(1.5);
    return newTarget;
};
/**
 * Interesting state from current perception data
 * @typedef {Object.<string,TrackedSensory>} PerceptionState
 * @property {?TrackedSensory} newHeyJibo - record representing a heyJibo that is in a recent time window and is more recent than any heyJibo's that have been orientation toward
 * @property {?TrackedSensory} heyJibo - a record representing the most recent heyJibo
 * @property {?TrackedSensory} mostWeightyAudio - a record representing the weighted audio localization
 * @property {TrackedSensory[]} trackedFaces - an array of tracked face records in recent time window
 * @property {TrackedSensory[]} trackedMotions - an array of tracked motion records in a recent time window.
 * @property {?TrackedSensory} primaryFace - a record representing the primaryFace
 * @private
 */
/**
 * Recent attention command history
 * @typedef {Object.<string,THREE.Vector3>} RecentAttentionHistory
 * @property {?THREE.Vector3} lastEyeTarget - location of last eye look target that was acted on.
 * @property {?THREE.Vector3} lastBodyTarget - location of last body look target that was acted on.
 * @property {?THREE.Vector3} lastHeyJiboTarget - location of last "hey jibo" target that was acted on.
 * @property {?THREE.Vector3} initialCenter - initial "center" to use as return point when there have been no "hey jibo"'s.
 * @property {?AttentionRule} lastFullLookRule - the rule that triggered the last full-body look motion.
 * @property {?LookConfig} lastFullLookConfig - the LookConfig used in the last full-body look motion.
 * @property {?AttentionRule} lastEyeLookRule - the rule that triggered the last eye-look look motion (will be same as lastFullLookRule if last look was full-body).
 * @property {?LookConfig} lastEyeLookConfig - the LookConfig used in the last eye-look look motion (will be same as lastFullLookConfig if last look was full-body).
 * @private
 */
/**
 * Filter used in AttentionRules to lock out firing based on history data
 * e.g., never fire eye dart if we're in a body configuration resulting from a lazy look
 *
 * @interface AttentionHistoryFilter
 * @private
 */
/**
 * @function
 * @name AttentionHistoryFilter#checkHistory
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {boolean} true if history passes this filter
 */
/**
 * Rule Update Result
 * @typedef {Object.<string,THREE.Vector3>} RuleUpdateResult
 * @property {?THREE.Vector3} target - rule target
 * @property {boolean} initLookat - target is new, requiring lookat command
 * @private
 */
/**
 *
 * @param {LookConfig[]} lookConfigs
 * @param {boolean} requirePresent - true to require one of these configs, false to require none of these configs
 * @constructor
 * @implements AttentionHistoryFilter
 */
var LastFullLookConfigFilter = function (lookConfigs, requirePresent) {
    this.lookConfigs = lookConfigs;
    this.requirePresent = requirePresent;
};
/**
 *
 * @param {RecentAttentionHistory} recentAttentionHistory
 */
LastFullLookConfigFilter.prototype.checkHistory = function (recentAttentionHistory) {
    var anyPresent = false;
    for (var i = 0; i < this.lookConfigs.length; i++) {
        if (this.lookConfigs[i] === recentAttentionHistory.lastFullLookConfig) {
            anyPresent = true;
            break;
        }
    }
    return this.requirePresent === anyPresent;
};
/**
 * @param {string} name
 * @param {number} lockTime
 * @param {boolean} isHeyJibo
 * @param {LookConfig} lookatConfig - (will be === checked for equivalence across rules, use same instances)
 * @param {number|number[]} minIdleTime - require idle time, or a 2 element array of min/max required idle time.
 * @param {boolean} selfResetsIdle
 * @param {?AttentionHistoryFilter} historyFilter
 * @param {string} [trackDisplayName=null] - name of the tracking mode, e.g. SOUND, FACE to visualize
 * @constructor
 */
var AttentionRule = function (name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName) {
    /**
     * @type {number}
     */
    this.lockTime = lockTime;
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {Time}
     */
    this.firedAt = null;
    /**
     * During periods where we could fire (no higher rule has superceded us), this value
     * will be non-null and indicate the start time of the period where to could have fired.
     * (Useful for rules that want to do something after a period of idleness)
     * @type {Time}
     */
    this.activeIdleStart = null;
    /**
     * @type {THREE.Vector3}
     */
    this.lastTarget = null;
    /**
     * @type {boolean}
     */
    this.isHeyJibo = isHeyJibo;
    /**
     * @type {LookConfig}
     */
    this.lookatConfig = lookatConfig;
    /**
     * @type {string}
     */
    this.trackDisplayName = null;
    if (trackDisplayName != null) {
        this.trackDisplayName = trackDisplayName;
    }
    /**
     * @type {number}
     */
    this.minRequiredIdle = 0;
    /**
     * @type {number}
     */
    this.maxRequiredIdle = 0;
    /**
     * @type {?number}
     */
    this.currentRequiredIdle = null;
    if (Array.isArray(minIdleTime)) {
        this.minRequiredIdle = minIdleTime[0];
        this.maxRequiredIdle = minIdleTime[1];
    }
    else {
        this.minRequiredIdle = minIdleTime;
        this.maxRequiredIdle = minIdleTime;
    }
    /**
     * @type {AttentionHistoryFilter}
     */
    this.historyFilter = historyFilter;
    /**
     * @type {boolean}
     */
    this.selfResetsIdle = selfResetsIdle;
    /**
     * @type {RuleUpdateResult}
     */
    this.updateResult = {
        target: null,
        initLookat: false
    };
    /**
     * @type {boolean}
     */
    this.enabled = true;
    /**
     * @type {function}
     */
    this.succeededHandler = null;
    /**
     * @type {function}
     */
    this.interruptedHandler = null;
    /**
     * @type {undefined|string}
     */
    this.logLevel = undefined;
};
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RulesState} rulesState
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?RuleUpdateResult}
 */
AttentionRule.prototype.update = function (time, tracks, rulesState, recentAttentionHistory) {
    var enabled = Bakery.getBoolean(this.name + " enabled", this.enabled, "ATPolicy");
    var lockTime = Bakery.getFloat(this.name + " lockTime", 0, 10, this.lockTime, "ATPolicy");
    var minRequiredIdle = Bakery.getFloat(this.name + " minRequiredIdle", 0, 10, this.minRequiredIdle, "ATPolicy");
    var maxRequiredIdle = Bakery.getFloat(this.name + " maxRequiredIdle", 0, 30, this.maxRequiredIdle, "ATPolicy");
    var currentRequiredIdle = this.currentRequiredIdle;
    if (!enabled || rulesState.lookClaimed) {
        this.reset();
    }
    else {
        if (lockTime > 0 && this.firedAt !== null && time.subtract(this.firedAt) < lockTime && this.lastTarget !== null) {
            this.updateResult.initLookat = false;
            this.updateResult.target = this.lastTarget;
            return this.updateResult;
        }
        else {
            if (this.activeIdleStart === null) {
                this.activeIdleStart = time;
            }
            if (currentRequiredIdle === null) {
                if (maxRequiredIdle === minRequiredIdle) {
                    currentRequiredIdle = minRequiredIdle;
                }
                else {
                    currentRequiredIdle = Math.random() * (maxRequiredIdle - minRequiredIdle) + minRequiredIdle;
                }
                this.currentRequiredIdle = currentRequiredIdle;
            }
            if (currentRequiredIdle === 0 || time.subtract(this.activeIdleStart) >= currentRequiredIdle) {
                //we are eligible in terms of idle time and lock time etc. to reselect
                //check if our filter allows (check here so it's once per target selection, and doesn't interrupt out lock,
                //which would happen if filter happened in the "enabled" clause, because filter criteria changes once we fire)
                if (this.historyFilter === null || this.historyFilter.checkHistory(recentAttentionHistory) === true) {
                    var t = this.getTarget(time, tracks, recentAttentionHistory);
                    if (t != null) {
                        t = t.clone(); //lock it in, may still be pointing to a rep of a tracked sensory or other.
                        this.currentRequiredIdle = null;
                        this.lastTarget = t;
                        this.firedAt = time;
                        if (this.selfResetsIdle) {
                            this.activeIdleStart = null; //reset idle time when we activate, just as we would for a parent activating.
                        }
                        this.updateResult.initLookat = true;
                        this.updateResult.target = t;
                        return this.updateResult;
                    }
                }
            }
        }
    }
    return null;
};
AttentionRule.prototype.reset = function () {
    this.lastTarget = null;
    this.firedAt = null;
    this.activeIdleStart = null;
    //slog(channel, "Resetting "+this.name+" at "+Clock.currentTime());
};
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 */
AttentionRule.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    return null;
};
AttentionRule.prototype.notifyDidFire = function () {
};
/**
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleHeyJibo = function (name, lockTime, minIdle, lookConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, true, lookConfig, minIdle, true, null, null);
};
AttentionRuleHeyJibo.prototype = Object.create(AttentionRule.prototype);
AttentionRuleHeyJibo.prototype.constructor = AttentionRuleHeyJibo;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleHeyJibo.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    if (tracks.newHeyJibo !== null) {
        //slog(channel, "ATTENTION: Doing hey jibo");
        return tracks.newHeyJibo.position;
    }
    else {
        return null;
    }
};
/**
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleCommandLook = function (name, lockTime, minIdle, lookConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookConfig, minIdle, true, null, null);
    /**
     * @type {THREE.Vector3}
     * @private
     */
    this._target = null;
    /**
     *
     * @type {AttendHandle}
     * @private
     */
    this._attendHandle = null;
    /**
     * @type {function}
     * @private
     */
    this.succeededHandler = null;
    /**
     * @type {function}
     * @private
     */
    this.interruptedHandler = null;
    /**
     *
     * @type {function}
     * @private
     */
    this._promiseResolve = null;
};
AttentionRuleCommandLook.prototype = Object.create(AttentionRule.prototype);
AttentionRuleCommandLook.prototype.constructor = AttentionRuleCommandLook;
/**
 *
 * @param {ResultStatus} status
 */
AttentionRuleCommandLook.prototype.resolveCompletion = function (status) {
    slog(channel, "attendToTarget Command Look resolving with status:" + status);
    if (this._attendHandle !== null) {
        var result = { status: status };
        var handle = this._attendHandle;
        this._attendHandle = null;
        this._target = null;
        handle.result = result;
        this._promiseResolve(result);
        this._promiseResolve = null;
    }
    else {
        slog(channel, "attendToTarget Command Look Resolved Twice!", slog.Levels.WARN);
    }
};
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleCommandLook.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    var target = null;
    if (this._target !== null) {
        //slog(channel, "ATTENTION: Doing command look!");
        target = this._target;
        //this._target = null;
    }
    return target;
};
/**
 *
 * @param {THREE.Vector3} target
 * @return {AttendHandle}
 */
AttentionRuleCommandLook.prototype.setCommand = function (target) {
    if (this._attendHandle !== null) {
        this.resolveCompletion(ResultStatus.INTERRUPTED);
    }
    var attendHandle = new AttendHandle();
    attendHandle.promise = new Promise((resolve, reject) => {
        this._promiseResolve = resolve;
    });
    attendHandle.cancel = () => {
        if (this._attendHandle === attendHandle && this._target !== null) {
            // safe to cancel since we have not yet activated
            this.resolveCompletion(ResultStatus.CANCELLED);
        }
    };
    this._target = target;
    this._attendHandle = attendHandle;
    this.succeededHandler = () => {
        setTimeout(() => {
            if (this._attendHandle === attendHandle) {
                this.resolveCompletion(ResultStatus.SUCCEEDED);
            }
        }, 0);
    };
    this.interruptedHandler = () => {
        setTimeout(() => {
            if (this._attendHandle === attendHandle) {
                this.resolveCompletion(ResultStatus.INTERRUPTED);
            }
        }, 0);
    };
    return attendHandle;
};
AttentionRuleCommandLook.prototype.reset = function () {
    AttentionRule.prototype.reset.call(this);
    if (this._target !== null) {
        slog(channel, "attendToTarget Command Look reset after command but before activating!  Sending Cancelled");
        this.resolveCompletion(ResultStatus.CANCELLED);
    }
    this._target = null;
    //slog(channel, "Resetting "+this.name+" at "+Clock.currentTime());
};
AttentionRuleCommandLook.prototype.notifyDidFire = function () {
    AttentionRule.prototype.notifyDidFire.call(this);
    this._target = null;
    slog(channel, "attendToTarget Command Look rule has fired!");
};
/**
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleLookAway = function (name, lockTime, minIdle, aroundRotation, downRotation, lookConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookConfig, minIdle, true, null, "DISENGAGE");
    this._downRotation = downRotation;
    this._aroundRotation = aroundRotation;
};
AttentionRuleLookAway.prototype = Object.create(AttentionRule.prototype);
AttentionRuleLookAway.prototype.constructor = AttentionRuleLookAway;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleLookAway.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    var currentTarget = null;
    //slog(channel, "ATTENTION: Doing look away");
    if (tracks.heyJibo !== null && tracks.heyJibo.position !== null) {
        currentTarget = tracks.heyJibo.position;
    }
    else if (recentAttentionHistory.lastBodyTarget !== null) {
        currentTarget = recentAttentionHistory.lastBodyTarget;
    }
    else {
        currentTarget = recentAttentionHistory.initialCenter;
    }
    //generate a simple "down and to the side" from the current main target.
    //rotate the target down around (vertical cross target) and then around vertical
    //this will rotate it from jibo-zero, rather than jibo-head, but should produce a fine target
    var around = new THREE.Vector3(0, 0, 1);
    /** @type{THREE.Vector3} */
    var down = new THREE.Vector3().crossVectors(around, currentTarget).normalize();
    if (down.lengthSq() < 0.001) {
        slog(channel, "ATTENTION: error computing look-away for currentTarget, not doing it");
        return null;
    }
    var sign = Math.random() > 0.5 ? 1 : -1;
    var newTarget = new THREE.Vector3().copy(currentTarget);
    newTarget.applyAxisAngle(down, this._downRotation);
    newTarget.applyAxisAngle(around, this._aroundRotation * sign);
    return newTarget;
};
/**
 * @description Trigger criteria for AttentionRuleSound
 * @typedef {Object} jibo.attention.AttentionSoundTriggerCriteria
 * @property {AttentionRuleSound.ActivityType} activity - Require at least this level of activity.
 * @property {number} confidence - require at least this confidence.
 */
/**
 *
 * @param {string} name
 * @param {number} lockTime
 * @param {number|number[]} minIdle
 * @param {boolean} selfResetsIdle
 * @param {AttentionSoundTriggerCriteria[]} triggerCriteria
 * @param {LookConfig} lookConfig
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleSound = function (name, lockTime, minIdle, selfResetsIdle, triggerCriteria, lookConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookConfig, minIdle, selfResetsIdle, null, "SOUND");
    this.triggerCriteria = triggerCriteria;
};
AttentionRuleSound.prototype = Object.create(AttentionRule.prototype);
AttentionRuleSound.prototype.constructor = AttentionRuleSound;
AttentionRuleSound.ActivityType = {
    /** fires only if activity is "prolonged" */
    PROLONGED: "PROLONGED",
    /** fires only if activity is heavy or prolonged*/
    HEAVY: "HEAVY",
    /** fires for light, heavy, and prolonged activity */
    LIGHT: "LIGHT",
    /** fires regardless of activity level */
    ANY: "ANY"
};
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleSound.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    // var useConfidenceThreshold = Bakery.getFloat(this.name+" sound confidence threshold", 0, 2, this.confidenceThreshold, "ATPolicy");
    var audioTrack = tracks.mostWeightyAudio;
    var accept = false;
    if (audioTrack !== null && time.subtract(audioTrack.lastIncorporatedReport) < 1) {
        for (var i = 0; i < this.triggerCriteria.length; i++) {
            var tc = this.triggerCriteria[i];
            if (audioTrack.confidence > tc.confidence) {
                //accept if:
                // activity=ANY
                // activity=LIGHT && (prolonged > 1 || heavy > 1 || light > 1)
                // activity=HEAVY && (prolonged > 1 || heavy > 1)
                // activity=PROLONGED && (prolonged > 1)
                if (tc.activity === AttentionRuleSound.ActivityType.ANY) {
                    accept = true;
                    // console.log("Accepting ["+i+"]"+this.name+" on ANY, confidence="+audioTrack.confidence+" activity light="+audioTrack.lightActivityTracker+", heavy="+audioTrack.heavyActivityTracker+", prolonged="+audioTrack.prolongedActivityTracker);
                }
                else if (tc.activity === AttentionRuleSound.ActivityType.PROLONGED && (audioTrack.prolongedActivityTracker > 1)) {
                    accept = true;
                    // console.log("Accepting ["+i+"]"+this.name+" on PROLONGED, confidence="+audioTrack.confidence+" activity light="+audioTrack.lightActivityTracker+", heavy="+audioTrack.heavyActivityTracker+", prolonged="+audioTrack.prolongedActivityTracker);
                }
                else if (tc.activity === AttentionRuleSound.ActivityType.HEAVY && (audioTrack.prolongedActivityTracker > 1 ||
                    audioTrack.heavyActivityTracker > 1)) {
                    accept = true;
                    // console.log("Accepting ["+i+"]"+this.name+" on HEAVY, confidence="+audioTrack.confidence+" activity light="+audioTrack.lightActivityTracker+", heavy="+audioTrack.heavyActivityTracker+", prolonged="+audioTrack.prolongedActivityTracker);
                }
                else if (tc.activity === AttentionRuleSound.ActivityType.LIGHT && (audioTrack.prolongedActivityTracker > 1 ||
                    audioTrack.heavyActivityTracker > 1 ||
                    audioTrack.lightActivityTracker > 1)) {
                    accept = true;
                    // console.log("Accepting ["+i+"]"+this.name+" on LIGHT, confidence="+audioTrack.confidence+" activity light="+audioTrack.lightActivityTracker+", heavy="+audioTrack.heavyActivityTracker+", prolonged="+audioTrack.prolongedActivityTracker);
                }
                if (accept) {
                    break;
                }
            }
        }
    }
    if (accept) {
        //slog(channel, "ATTENTION: Doing sound");
        return audioTrack.position;
    }
    else {
        return null;
    }
};
/**
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleBoredomLook = function (name, lockTime, minIdle, boredomReturnToCenterPercent, randomLookHorizontalMax, randomLookMinVerticalAngle, randomLookMaxVerticalAngle, useLastBodyAsCenter, lookatConfig, relativeVertical, historyFilter) {
    var useLookConfig = lookatConfig;
    this.lookatConfigs = null;
    if (Array.isArray(lookatConfig)) {
        useLookConfig = lookatConfig[0];
        this.lookatConfigs = lookatConfig;
    }
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, useLookConfig, minIdle, true, historyFilter, null);
    this.boredomReturnToHeyJiboPercentage = boredomReturnToCenterPercent;
    this.randomLookAroundHorizontalAngle = randomLookHorizontalMax;
    this.randomLookMinVerticalAngle = randomLookMinVerticalAngle;
    this.randomLookMaxVerticalAngle = randomLookMaxVerticalAngle;
    this.useLastBodyAsCenter = useLastBodyAsCenter;
    this.relativeVertical = relativeVertical;
};
AttentionRuleBoredomLook.prototype = Object.create(AttentionRule.prototype);
AttentionRuleBoredomLook.prototype.constructor = AttentionRuleBoredomLook;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleBoredomLook.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    var boredomReturnToHeyJiboPercentage = Bakery.getFloat(this.name + " return to hey jibo percentage", 0, 1, this.boredomReturnToHeyJiboPercentage, "ATPolicy");
    var maxAngleAround = Bakery.getFloat(this.name + " random look horizontal angle limit", 0, 3, this.randomLookAroundHorizontalAngle, "ATPolicy");
    var minAngleVertical = Bakery.getFloat(this.name + " random look min vertical angle", -1, 1.4, this.randomLookMinVerticalAngle, "ATPolicy");
    var maxAngleVertical = Bakery.getFloat(this.name + " random look max vertical angle", -1, 1.4, this.randomLookMaxVerticalAngle, "ATPolicy");
    var useLastBodyAsCenter = Bakery.getBoolean(this.name + " random look use last body as center", this.useLastBodyAsCenter, "ATPolicy");
    var relativeVertical = Bakery.getBoolean(this.name + " vertical is relative to target", this.relativeVertical, "ATPolicy");
    /** @type {THREE.Vector3} */
    var center = recentAttentionHistory.initialCenter;
    if (useLastBodyAsCenter) {
        if (recentAttentionHistory.lastBodyTarget !== null) {
            center = recentAttentionHistory.lastBodyTarget;
        }
    }
    else {
        if (tracks.heyJibo !== null && tracks.heyJibo.position !== null) {
            center = tracks.heyJibo.position;
            //this will be the last heyJibo we heard, although we may not have oriented towards it yet
            //(for example if it came in while we were off)  recentAttentionHistory.lastHeyJiboTarget would be the last oriented towards
        }
    }
    if (Math.random() <= boredomReturnToHeyJiboPercentage) {
        //look back to center
        if (recentAttentionHistory.lastBodyTarget !== null && center.distanceTo(recentAttentionHistory.lastBodyTarget) < 0.001 //&&
        ) {
            //if our last body target is center, no need to look again (unless last eye target was not center, then we do do it!)
            return null;
        }
        else {
            //slog(channel, "ATTENTION: Boredom, returning body to hey jibo via "+this.name+" @" + time);
            return center;
        }
    }
    else {
        //slog(channel, "ATTENTION: Boredom, looking randomly "+this.name+ " @"+time);
        if (this.lookatConfigs !== null) {
            var select = Math.floor(Math.random() * this.lookatConfigs.length);
            this.lookatConfig = this.lookatConfigs[select];
        }
        if (relativeVertical) {
            return randomPointNearRelativeVertical(center, maxAngleAround, maxAngleVertical);
        }
        else {
            return randomPointNearAbsoluteVertical(center, maxAngleAround, minAngleVertical, maxAngleVertical);
        }
    }
};
/**
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleEyeFace = function (name, lockTime, minIdle, targetVelocityConstant, lookConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookConfig, minIdle, false, null, "FACE");
    this.targetVelocityConstant = targetVelocityConstant;
};
AttentionRuleEyeFace.prototype = Object.create(AttentionRule.prototype);
AttentionRuleEyeFace.prototype.constructor = AttentionRuleEyeFace;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleEyeFace.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    if (tracks.trackedFaces !== null && tracks.trackedFaces.length > 0) {
        var targetVelocityConstant = Bakery.getFloat(this.name + " target velocity constant", 0, 4, this.targetVelocityConstant, "ATPolicy");
        /** @type {TrackedSensory} */
        var bestTarget = null;
        var minTargetAge = Number.MAX_VALUE;
        for (var i = 0; i < tracks.trackedFaces.length; i++) {
            var track = tracks.trackedFaces[i];
            var targetAge = time.subtract(track.lastIncorporatedReport);
            if (this.lastTarget !== null) {
                targetAge += this.lastTarget.distanceTo(track.position) / targetVelocityConstant;
            }
            if (targetAge < minTargetAge) {
                minTargetAge = targetAge;
                bestTarget = track;
            }
        }
        if (bestTarget) {
            //slog(channel, "ATTENTION: Doing "+this.name);
            return bestTarget.position;
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
};
/**
 * @extends AttentionRule
 * @constructor
 */
var AttentionRulePrimaryFace = function (name, lockTime, minIdle, lookConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookConfig, minIdle, false, null, "FACE");
};
AttentionRulePrimaryFace.prototype = Object.create(AttentionRule.prototype);
AttentionRulePrimaryFace.prototype.constructor = AttentionRulePrimaryFace;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRulePrimaryFace.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    if (tracks.primaryFace) {
        //slog(channel, "ATTENTION: Doing "+this.name);
        return tracks.primaryFace.position;
    }
    else {
        return null;
    }
};
/**
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleEyeMotion = function (name, lockTime, minIdle, targetVelocityConstant, filterOnTrackAge, minTrackAge, maxTrackAge, lookConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookConfig, minIdle, false, null, "MOTION");
    this.targetVelocityConstant = targetVelocityConstant;
    this.filterOnTrackAge = filterOnTrackAge;
    this.minTrackAge = minTrackAge;
    this.maxTrackAge = maxTrackAge;
};
AttentionRuleEyeMotion.prototype = Object.create(AttentionRule.prototype);
AttentionRuleEyeMotion.prototype.constructor = AttentionRuleEyeMotion;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleEyeMotion.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    if (tracks.trackedMotions !== null && tracks.trackedMotions.length > 0) {
        var targetVelocityConstant = Bakery.getFloat(this.name + " target velocity constant", 0, 4, this.targetVelocityConstant, "ATPolicy");
        if (this.filterOnTrackAge) {
            this.minTrackAge = Bakery.getFloat(this.name + " min track age", 0, 15, this.minTrackAge, "ATPolicy");
            this.maxTrackAge = Bakery.getFloat(this.name + " max track age", 0, 30, this.maxTrackAge, "ATPolicy");
        }
        /** @type {TrackedSensory} */
        var bestTarget = null;
        var minTargetAge = Number.MAX_VALUE;
        for (var i = 0; i < tracks.trackedMotions.length; i++) {
            var track = tracks.trackedMotions[i];
            if (this.filterOnTrackAge) {
                var trackAge = time.subtract(track.creationTime);
                if (trackAge < this.minTrackAge || trackAge > this.maxTrackAge) {
                    continue;
                }
            }
            var targetAge = time.subtract(track.lastIncorporatedReport);
            if (this.lastTarget !== null) {
                targetAge += this.lastTarget.distanceTo(track.position) / targetVelocityConstant;
            }
            if (targetAge < minTargetAge) {
                minTargetAge = targetAge;
                bestTarget = track;
            }
        }
        if (bestTarget) {
            //slog(channel, "ATTENTION: Doing "+this.name);
            return bestTarget.position;
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
};
/**
 * Recenters eye to look at body target if: body target is more distant (position) from eye target that provided distance, OR
 * body angle is more distant (angle) from eye target than provided angle.  If either is null, that criteria is ignore.
 * (e.g., if both are null, we will never recenter.
 *
 * @param {string} name - name of this rule
 * @param {number} lockTime - lock time
 * @param {number|number[]} minIdle - min idle
 * @param {?number} eyeBodyDeltaPosThreshold - distance that counts as eye already looking at body target (and thus no return is necessary).  null means no distance triggers a recenter
 * @param {?number} eyeBodyDeltaAngleThreshold - angle that counts as already looking at the body target (and thus no return is necessary).  null means no angle triggers a recenter
 * @param {LookConfig} lookatConfig - the look config
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleEyeReturn = function (name, lockTime, minIdle, eyeBodyDeltaPosThreshold, eyeBodyDeltaAngleThreshold, lookatConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookatConfig, minIdle, true, null, null);
    this._eyeBodyDeltaPosThreshold = eyeBodyDeltaPosThreshold;
    this._eyeBodyDeltaAngleThreshold = eyeBodyDeltaAngleThreshold;
};
AttentionRuleEyeReturn.prototype = Object.create(AttentionRule.prototype);
AttentionRuleEyeReturn.prototype.constructor = AttentionRuleEyeReturn;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleEyeReturn.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    if (recentAttentionHistory.lastBodyTarget !== null && recentAttentionHistory.lastEyeTarget !== null) {
        if ((this._eyeBodyDeltaPosThreshold !== null && recentAttentionHistory.lastEyeTarget.distanceTo(recentAttentionHistory.lastBodyTarget) > this._eyeBodyDeltaPosThreshold) ||
            (this._eyeBodyDeltaAngleThreshold !== null && recentAttentionHistory.lastEyeTarget.angleTo(recentAttentionHistory.lastBodyTarget) > this._eyeBodyDeltaAngleThreshold)) {
            //slog(channel, "ATTENTION: Doing Eye Return "+this.name);
            return recentAttentionHistory.lastBodyTarget;
        }
        else {
            //we're already looking there!
            return null;
        }
    }
    else {
        return null;
    }
};
/**
 * Intended to be used in conjunction with an attentive look (centering) and a filter that only fires
 * when we've done non-commital looks beforehand; thus, this rule will commit us (center body).
 *
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleBodyCommit = function (name, lockTime, minIdle, lookatConfig, filter) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookatConfig, minIdle, true, filter, null);
};
AttentionRuleBodyCommit.prototype = Object.create(AttentionRule.prototype);
AttentionRuleBodyCommit.prototype.constructor = AttentionRuleBodyCommit;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleBodyCommit.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    if (recentAttentionHistory.lastBodyTarget !== null) {
        //slog(channel, "ATTENTION: Doing Body Commit");
        return recentAttentionHistory.lastBodyTarget;
    }
};
/**
 *
 * @param {string} name
 * @param {number|number[]} minIdle
 * @param {BlinkDelegate} blinker
 * @param {number} [speed]
 * @constructor
 * @extends AttentionRule
 */
var AttentionRuleBlinkOccasionally = function (name, minIdle, blinker, speed) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, 0, false, null, minIdle, true, null, null);
    this.blinker = blinker;
    this.speed = speed;
};
AttentionRuleBlinkOccasionally.prototype = Object.create(AttentionRule.prototype);
AttentionRuleBlinkOccasionally.prototype.constructor = AttentionRuleBlinkOccasionally;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RulesState} rulesState
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?RuleUpdateResult}
 */
AttentionRuleBlinkOccasionally.prototype.update = function (time, tracks, rulesState, recentAttentionHistory) {
    var enabled = Bakery.getBoolean(this.name + " enabled", this.enabled, "ATPolicy");
    var minRequiredIdle = Bakery.getFloat(this.name + " minRequiredIdle", 0, 10, this.minRequiredIdle, "ATPolicy");
    var maxRequiredIdle = Bakery.getFloat(this.name + " maxRequiredIdle", 0, 30, this.maxRequiredIdle, "ATPolicy");
    var currentRequiredIdle = this.currentRequiredIdle;
    //TODO: consolidate with base class update?
    if (!enabled) {
        this.reset();
    }
    else {
        if (this.activeIdleStart === null) {
            this.activeIdleStart = time;
        }
        if (currentRequiredIdle === null) {
            if (maxRequiredIdle === minRequiredIdle) {
                currentRequiredIdle = minRequiredIdle;
            }
            else {
                currentRequiredIdle = Math.random() * (maxRequiredIdle - minRequiredIdle) + minRequiredIdle;
            }
            this.currentRequiredIdle = currentRequiredIdle;
        }
        if (time.subtract(this.activeIdleStart) > currentRequiredIdle) {
            this.blinker.blink(null, this.speed);
            slog(channel, "Doing Occasional Blink (" + this.currentRequiredIdle + ")", this.logLevel);
            this.currentRequiredIdle = null;
            this.firedAt = time;
            if (this.selfResetsIdle) {
                this.activeIdleStart = null; //reset idle time when we activate, just as we would for a parent activating.
            }
            return null;
        }
    }
    return null;
};
AttentionRuleBlinkOccasionally.prototype.reset = function () {
    AttentionRule.prototype.reset.call(this);
};
/**
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleSwitchMode = function (name, lockTime, minIdle, newMode, attentionManager) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, null, minIdle, true, null, null);
    this.newMode = newMode;
    this.attentionManager = attentionManager;
};
AttentionRuleSwitchMode.prototype = Object.create(AttentionRule.prototype);
AttentionRuleSwitchMode.prototype.constructor = AttentionRuleSwitchMode;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleSwitchMode.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    var self = this;
    setTimeout(function () {
        self.attentionManager.setMode(self.newMode);
    }, 0);
    return null;
};
/**
 *
 * @param {string} name
 * @param {number} minIdleTime
 * @param {number} maxIdleTime
 * @param {number} minHoldTime
 * @param {number} maxHoldTime
 * @param {AnimationUtilities} animate
 * @param {string[]} postureURLs
 * @param {string} centerURL
 * @constructor
 * @extends AttentionRule
 */
var AttentionRuleShiftOccasionally = function (name, minIdleTime, maxIdleTime, minHoldTime, maxHoldTime, animate, postureURLs, centerURL) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, 0, false, null, minIdleTime, true, null, null);
    this.maxIdleTime = maxIdleTime; //TODO: need to be update/fixed for integrated max/min idle
    this.minHoldTime = minHoldTime;
    this.maxHoldTime = maxHoldTime;
    this.animate = animate;
    this.currentIdleInterval = null;
    this.currentHoldInterval = null;
    this.postureBuilders = [];
    this.centerBuilder = null;
    this.dataLoaded = false;
    var self = this;
    var loadPostureBuilder = function (url) {
        animate.createAnimationBuilder(url, function (builder) {
            builder.setLayer("posture");
            self.postureBuilders.push(builder);
            self.dataLoaded = self.centerBuilder !== null && self.postureBuilders.length === postureURLs.length;
        });
    };
    for (var i = 0; i < postureURLs.length; i++) {
        loadPostureBuilder(postureURLs[i]);
    }
    animate.createAnimationBuilder(centerURL, function (builder) {
        builder.setLayer("posture");
        self.centerBuilder = builder;
        self.dataLoaded = self.centerBuilder !== null && self.postureBuilders.length === postureURLs.length;
    });
};
AttentionRuleShiftOccasionally.prototype = Object.create(AttentionRule.prototype);
AttentionRuleShiftOccasionally.prototype.constructor = AttentionRuleShiftOccasionally;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RulesState} rulesState
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?RuleUpdateResult}
 */
AttentionRuleShiftOccasionally.prototype.update = function (time, tracks, rulesState, recentAttentionHistory) {
    if (!this.dataLoaded) {
        return null;
    }
    var enabled = Bakery.getBoolean(this.name + " enabled", this.enabled, "ATPolicy");
    var minRequiredIdle = Bakery.getFloat(this.name + " minRequiredIdle", 0, 10, this.minRequiredIdle, "ATPolicy");
    var maxRequiredIdle = Bakery.getFloat(this.name + " maxRequiredIdle", 0, 30, this.maxRequiredIdle, "ATPolicy");
    var minHoldTime = Bakery.getFloat(this.name + " minHoldTime", 0, 10, this.minHoldTime, "ATPolicy");
    var maxHoldTime = Bakery.getFloat(this.name + " maxHoldTime", 0, 30, this.maxHoldTime, "ATPolicy");
    if (!enabled || rulesState.lookClaimed) {
        this.reset();
    }
    else {
        if (this.currentRequiredIdle === null) {
            this.currentRequiredIdle = Math.random() * (maxRequiredIdle - minRequiredIdle) + minRequiredIdle;
        }
        if (this.currentHoldInterval === null) {
            this.currentHoldInterval = Math.random() * (maxHoldTime - minHoldTime) + minHoldTime;
        }
        if (this.activeIdleStart === null) {
            this.activeIdleStart = time;
        }
        if (this.firedAt === null && time.subtract(this.activeIdleStart) > this.currentIdleInterval) {
            var builder = this.postureBuilders[Math.floor(Math.random() * this.postureBuilders.length)];
            builder.play();
            slog(channel, "ATTENTION: Doing Occasional Shift", this.logLevel);
            this.firedAt = time;
        }
        else if (this.firedAt !== null && time.subtract(this.firedAt) > this.currentHoldInterval) {
            slog(channel, "ATTENTION: Returning From Occasional Shift", this.logLevel);
            this.reset();
        }
    }
    return null;
};
AttentionRuleShiftOccasionally.prototype.reset = function () {
    AttentionRule.prototype.reset.call(this);
    if (!this.dataLoaded) {
        return;
    }
    this.centerBuilder.play();
    this.currentRequiredIdle = null;
    this.currentHoldInterval = null;
};
/**
 * Recenters the body to look at the most recent body target, optionally mapped to a standard height or height range.
 *
 * @param {string} name - name of this rule
 * @param {number} lockTime - lock time
 * @param {number|number[]} minIdle - min idle
 * @param {number|number[]} standardHeight - standard height or height range, null for no height mapping
 * @param {LookConfig} lookatConfig - the look config
 * @extends AttentionRule
 * @constructor
 */
var AttentionRuleBodyReturn = function (name, lockTime, minIdle, standardHeight, lookatConfig) {
    //name, lockTime, isHeyJibo, lookatConfig, minIdleTime, selfResetsIdle, historyFilter, trackDisplayName
    AttentionRule.call(this, name, lockTime, false, lookatConfig, minIdle, true, null, null);
    /** @type {number[]} */
    this.standardHeightRange = null;
    if (standardHeight !== null && standardHeight !== undefined) {
        if (typeof standardHeight === 'number') {
            this.standardHeightRange = [standardHeight, standardHeight];
        }
        else {
            this.standardHeightRange = standardHeight;
        }
    }
};
AttentionRuleBodyReturn.prototype = Object.create(AttentionRule.prototype);
AttentionRuleBodyReturn.prototype.constructor = AttentionRuleBodyReturn;
/**
 * @param {Time} time
 * @param {PerceptionState} tracks
 * @param {RecentAttentionHistory} recentAttentionHistory
 * @return {?THREE.Vector3}
 * @override
 */
AttentionRuleBodyReturn.prototype.getTarget = function (time, tracks, recentAttentionHistory) {
    if (recentAttentionHistory.lastBodyTarget !== null) {
        /** @type {THREE.Vector3} */
        var target = recentAttentionHistory.lastBodyTarget.clone();
        if (this.standardHeightRange !== null) {
            var targetHeight = target.z;
            target.setZ(0);
            if (target.lengthSq() < 0.0001) {
                target.set(1, 0, 0);
            }
            target.setLength(1);
            targetHeight = Math.max(this.standardHeightRange[0], Math.min(this.standardHeightRange[1], targetHeight));
            target.setZ(targetHeight);
        }
        return target;
    }
    else {
        return null;
    }
};
/**
 *
 * @param {AnimationUtilities} animate
 * @param {object} glService - jibo GL service
 * @param {object} lps - jibo LPS service
 * @param {AttentionManager} attentionManager - the attention manager
 * @param {DOFArbiter} dofArbiter - the attention manager
 * @param {boolean} [doRemoteVis] - true to enable remote visualization/debug
 * @param {object} [configData] - config data object
 */
var install = function (animate, glService, lps, attentionManager, dofArbiter, doRemoteVis, configData) {
    // initialize the bakery
    var baker = new JSONBaker(configData);
    Bakery.init(baker);
    var remoteVisualizerConnection = null;
    var sensoryLogController = null;
    if (doRemoteVis) {
        attentionManager._sensoryStore.setDebug(true);
        sensoryLogController = new SensoryLogController(attentionManager._sensoryStore);
        remoteVisualizerConnection = new RemoteVisualizerConnection(animate, attentionManager, sensoryLogController, dofArbiter, DADefaultChannel);
    }
    //setInterval(attentionManager.update.bind(attentionManager), 33);
    setInterval(function () {
        if (sensoryLogController === null || !sensoryLogController.getBlockLiveData()) {
            attentionManager.getDataConverter().acceptAudioLocalization(lps.audioData);
            attentionManager.getDataConverter().acceptVision(lps.motionData);
        }
        if (sensoryLogController !== null) {
            sensoryLogController.update();
        }
        attentionManager.update();
        if (remoteVisualizerConnection !== null) {
            remoteVisualizerConnection.update();
        }
    }, 33);
    var expressionListener = {
        dofsLost: function (ownerWhoLostDOFs, dofsLost) {
            attentionManager.handleLossOfActiveDOFs(ownerWhoLostDOFs, dofsLost);
        },
        dofsGained: function (ownerWhoLostDOFs, dofsLost) {
        },
        dofsAvailable: function (dofsAvailable) {
        }
    };
    //we are now getting HJ through the localized audio stream
    //if(glService===null || glService===undefined) {
    //	slog(channel, 'AttentionManager initted without glService.  glservce='+glService);
    //}else{
    //	glService.events.hjHeard.on((data) => {
    //		if(sensoryLogController === null || !sensoryLogController.getBlockLiveData()) {
    //			slog(channel, "AttentionManager Got HeyJibo!");
    //			attentionManager.getDataConverter().acceptWakeWord(data);
    //		}
    //	});
    //}
    dofArbiter.addListener(DADefaultChannel, expressionListener);
    dofArbiter.addListener(DACommandChannel, expressionListener);
};
/**
 *
 * @param {jibo} jibo
 * @param {boolean} [doRemoteVis] - true to enable remote visualization/debug
 * @param {object} [configData] - config data object
 * @constructor
 */
var AttentionManager = function (jibo, doRemoteVis, configData) {
    var robotInfo = jibo.animate.getRobotInfo();
    var animate = jibo.animate;
    var glService = jibo.gl;
    var lps = jibo.lps;
    var dofArbiter = jibo.dofArbiter;
    /**
     * @description Provides access to the attention modes as enum.
     * @type jibo.attention.Mode
     * @name jibo.attention#Mode
     * @private
     */
    this.Mode = Mode;
    /**
     * @description Provides access to the attention events as enum.
     * @type jibo.attention.EventType
     * @name jibo.attention#EventType
     * @private
     */
    this.EventType = EventType;
    /**
     * @description Provides access to the Result Status as enum.
     * @type jibo.attention.ResultStatus
     * @name jibo.attention#ResultStatus
     * @private
     */
    this.ResultStatus = ResultStatus;
    /**
     * @type {Mode}
     * @private
     */
    this._mode = Mode.OFF;
    /**
     * @type {MotorMotionMonitor}
     * @private
     */
    this._motionTracker = new MotorMotionMonitor(["bottomSection_r", "middleSection_r", "topSection_r"], animate);
    /**
     * @type {SensoryStore}
     * @protected
     */
    this._sensoryStore = new SensoryStore(this._motionTracker);
    /**
     * @type {AttentionModeStack}
     * @protected
     */
    this._attentionStack = new AttentionModeStack(this._processSetMode.bind(this), this._mode);
    /**
     * @type {RobotInfo}
     * @protected
     */
    this._robotInfo = robotInfo;
    /** @type {Object.<EventType,AttentionListener[]>} */
    /** @private */
    this._eventHandlers = {};
    /**
     * @type {AnimationUtilities}
     * @private
     */
    this._animate = null;
    if (animate != null) {
        this._animate = animate;
    }
    this._dofArbiter = dofArbiter;
    /**
     * @type {Time}
     */
    this._ignoreHeyJibosAtOrBefore = null;
    /**
     * @type {THREE.Vector3}
     */
    this._initialCenter = new THREE.Vector3(1, 0, 0.6);
    /**
     * @private
     * @type {LookatInstance}
     * */
    this._lookatInstance = null;
    /**
     * True when the active lookat instance (_lookatInstance), the one that
     * would have its target updated if appropriate, has lost dofs.  Instead of updating the target,
     * a new instance should be created next time it's needed.
     *
     * @type {boolean}
     * @private
     */
    this._currentInstanceIsMissingDOFs = false;
    /**
     * Dofs required by the current instance.  Generally body+eye_translate, or eye_translate only.
     * This is used to determine if the current instance is missing dofs.
     *
     * @type {string[]}
     * @private
     */
    this._currentInstanceRequiredDOFs = [];
    /**
     * LookConfig of the current instance.
     *
     * @type {LookConfig}
     * @private
     */
    this._currentInstanceLookConfig = null;
    /**
     * Rule that has last caused a look, used to track rule switching
     *
     * @type {AttentionRule}
     * @private
     */
    this._ruleThatHasLastFired = null;
    /**
     * Track status of having printed the no-dofs warning so we'll get it once
     * per interval instead of continuously until success
     *
     * @type {boolean}
     * @private
     */
    this._havePrintedAttentionNoDOFsWarning = false;
    /**
     *
     * @type {LookResultStatus[]}
     * @private
     */
    this._lookResultStatus = [];
    /**
     * @type {DataConverter}
     * @private
     */
    this._dataConverter = new DataConverter(this._sensoryStore, this, true);
    /**
     * @type {AttentionDebugStateVisualizer}
     * @private
     */
    this._debugStateVisualizer = null;
    /**
     * @type {boolean}
     * @private
     */
    this._enableDebugStateVisualizer = false;
    /**
     * @type {AttentionEyeRecessor}
     * @private
     */
    this._eyeRecessor = new AttentionEyeRecessor(this._animate, this._dofArbiter, DADefaultChannel);
    /**
     * This will be set to true when a wake is received; if a rule starts a look based on the wake
     * data, it should clear this flag.  If this flag is set after processing all rules, the update
     * function should send out a IGNORED_HEY_JIBO event and clear this flag.
     *
     * In the case where IGNORED_HEY_JIBO is sent out, we will ensure that any wake's in the data store
     * will not trigger redundant activity/further events by updating _ignoreHeyJibosAtOrBefore to
     * current time.
     *
     * @type {boolean}
     * @private
     */
    this._needToFireOnNewWake = false;
    /**
     * @type {AttentionRuleHandler}
     * @private
     */
    this._ruleChangedListener = null;
    /**
     * @type {Array.<FaceAwaiter>}
     * @private
     */
    this._faceAwaiters = [];
    if (this._animate !== null) {
        var attentionDebugStateVisualizer = new AttentionDebugStateVisualizer(this._animate, this._dofArbiter, DADefaultChannel);
        this._debugStateVisualizer = attentionDebugStateVisualizer.handleState.bind(attentionDebugStateVisualizer);
    }
    /**
     * @type {string}
     * @private
     */
    this._resourceRoot = findRoot(__dirname) + "/res/";
    //LookConfigs will be instance compared (===) to see if we need to start a new lookat
    //  so, we will share instances between the rules
    var lookConfigDefaultEyeOnly = new LookConfig("DefaultEye", robotInfo, true, false); //eye only
    var lookConfigDefault = new LookConfig("Default", robotInfo, false, true); //body
    var lookConfigDefaultSquareBase = new LookConfig("Default", robotInfo, false, false); //body
    var lookConfigSlow = new LookConfigSlow("Slow", robotInfo, false, true); //body
    var lookConfigSlowDown = new LookConfigSlowDown("SlowDown", robotInfo, false, true); //body
    var lookConfigSlowEyeOnly = new LookConfigSlow("SlowEye", robotInfo, true, false); //eye only
    var lookConfigShort = new LookConfigShort("Short", robotInfo, false); //eye only
    var lookConfigDisengage = new LookConfigDisengage("Disengage", robotInfo); //body
    var lookConfigUncommitted = new LookConfigUncommitted("Uncommitted", robotInfo, true); //body
    var lookConfigVisionFace = new LookConfigEyeVision("EyeVision:Face", robotInfo, "FACE", false, true, true); //body
    var lookConfigVisionFaceShift = new LookConfigEyeVision("EyeVision:FaceShift", robotInfo, "FACE", false, true, true); //body
    lookConfigVisionFaceShift.trunkConfigLHSolutionPolicy = "FARTHEST";
    var lookConfigVisionFaceEngaged = new LookConfigEyeVisionEngaged("EyeVision:FaceEngaged", robotInfo, "FACE", false, true, false); //body
    var lookConfigVisionFaceMenu = new LookConfigEyeVisionMenu("EyeVision:FaceMenu", robotInfo, "FACE", false, true, true); //body
    var lookConfigVisionMotion = new LookConfigEyeVision("EyeVision:Motion", robotInfo, "MOTION", false, true, true); //body
    var lookConfigVisionMotionEyeOnly = new LookConfigEyeVision("EyeVision:MotionEye", robotInfo, "MOTION", true, false, false); //eye only
    var lookConfigRelaxed = new LookConfigRelaxed("Relaxed", robotInfo, true); //body
    var lookConfigCommand = new LookConfig("Command", robotInfo, false, true); //body
    lookConfigCommand.continuous = false;
    lookConfigCommand.dofArbiterChannel = DACommandChannel;
    var requiredDOFsForBlink = animate.dofs.EYE.getDOFs();
    var blinker = {
        blink: (interrupt, speed) => {
            if (dofArbiter.getAvailable(DADefaultChannel, requiredDOFsForBlink, null).length === requiredDOFsForBlink.length) {
                animate.blink(interrupt, speed);
            }
        }
    };
    /**
     * @type {Object.<string,AttentionRule[]>}
     * @private
     */
    this._rules = {
        OFF: [],
        IDLE: [
            //new AttentionRuleHeyJibo("Idle Hey Jibo", 0.5, 0, lookConfigDefault), 					//body
            new AttentionRuleSound("Idle Body Sound", 1.5, 2, false, [{ confidence: 0.36, activity: AttentionRuleSound.ActivityType.ANY }, { confidence: 0.13, activity: AttentionRuleSound.ActivityType.HEAVY }], lookConfigDefault),
            new AttentionRuleSound("Idle Body Rare Sound", 1.5, 8, true, [{ confidence: 0.06, activity: AttentionRuleSound.ActivityType.LIGHT }], lookConfigDefault),
            new AttentionRuleEyeMotion("Idle Eye Recent Motion", 0.0, 0.7, 1.0, true, 1, 4, lookConfigVisionMotionEyeOnly),
            new AttentionRuleEyeFace("Idle Face", 0.0, 0.7, 1.0, lookConfigVisionFaceShift),
            new AttentionRuleEyeMotion("Idle Motion", 0.0, 0.7, 1.0, false, 0, 0, lookConfigVisionMotion),
            new AttentionRuleSound("Idle Body Very Rare Sound", 1.5, 10, true, [{ confidence: 0.08, activity: AttentionRuleSound.ActivityType.ANY }], lookConfigDefault),
            new AttentionRuleSound("Idle Eye Sound", 0.1, 2, false, [{ confidence: 0.06, activity: AttentionRuleSound.ActivityType.LIGHT }, { confidence: 0.09, activity: AttentionRuleSound.ActivityType.ANY }], lookConfigDefaultEyeOnly),
            //new AttentionRuleShiftOccasionally("Idle Shift", 0, 15, 3, 10, this._animate, [this._resourceRoot+"animations/skew-middle.anim"], this._resourceRoot+"animations/center-posture.anim"),  finish idle-time refactor for this rule before enabling
            new AttentionRuleBoredomLook("Idle Boredom Big", 0.5, [6, 13], 0.3, 1, 0.2, 0.8, false, [lookConfigSlow, lookConfigUncommitted], false, null),
            new AttentionRuleBoredomLook("Idle Boredom Little", 0.5, [0.9, 5], 0.0, 0.08, 0.0, 0.08, true, lookConfigShort, true, new LastFullLookConfigFilter([lookConfigDisengage, lookConfigUncommitted, lookConfigRelaxed], false)),
            //new AttentionRuleBodyCommit("Idle Boredom Commit", 0.5, [3, 9], lookConfigSlow, new LastFullLookConfigFilter([lookConfigDisengage, lookConfigUncommitted], true)),			//body
            new AttentionRuleEyeReturn("Idle Eye Return", 0.2, 5, 0.001, null, lookConfigSlowEyeOnly),
            new AttentionRuleEyeReturn("Idle Far Eye Return", 0.2, [0.6, 1], null, 0.075, lookConfigSlowEyeOnly),
            new AttentionRuleBlinkOccasionally("Idle Blink Occasionally", [3, 13], blinker)
        ],
        RELAXED: [
            new AttentionRuleSound("Relaxed Body Sound", 1.5, 2, false, [{ confidence: 0.36, activity: AttentionRuleSound.ActivityType.ANY }, { confidence: 0.13, activity: AttentionRuleSound.ActivityType.HEAVY }], lookConfigDefault),
            new AttentionRuleSound("Relaxed Body Rare Sound", 1.5, 8, true, [{ confidence: 0.06, activity: AttentionRuleSound.ActivityType.LIGHT }], lookConfigDefault),
            new AttentionRuleEyeMotion("Relaxed Eye Recent Motion", 0.0, 0.7, 1.0, true, 1, 4, lookConfigVisionMotionEyeOnly),
            new AttentionRuleEyeFace("Relaxed Face", 0.0, 0.7, 1.0, lookConfigVisionFace),
            new AttentionRuleEyeMotion("Relaxed Motion", 0.0, 0.7, 1.0, false, 0, 0, lookConfigVisionMotion),
            new AttentionRuleSound("Relaxed Body Very Rare Sound", 1.5, 10, true, [{ confidence: 0.08, activity: AttentionRuleSound.ActivityType.ANY }], lookConfigDefault),
            new AttentionRuleSound("Relaxed Eye Sound", 0.1, 2, false, [{ confidence: 0.06, activity: AttentionRuleSound.ActivityType.LIGHT }, { confidence: 0.09, activity: AttentionRuleSound.ActivityType.ANY }], lookConfigDefaultEyeOnly),
            //new AttentionRuleShiftOccasionally("Relaxed Shift", 0, 15, 3, 10, this._animate, [this._resourceRoot+"animations/skew-middle.anim"], this._resourceRoot+"animations/center-posture.anim"),  finish idle-time refactor for this rule before enabling
            new AttentionRuleBoredomLook("Relaxed Boredom Big", 0.5, [6, 13], 0.3, 1, 0.2, 0.8, false, [lookConfigSlow, lookConfigUncommitted], false, null),
            new AttentionRuleBoredomLook("Relaxed Boredom Little", 0.5, [0.9, 8], 0.0, 0.08, 0.0, 0.08, true, lookConfigShort, true, new LastFullLookConfigFilter([lookConfigDisengage, lookConfigUncommitted, lookConfigRelaxed], false)),
            //new AttentionRuleBodyCommit("Relaxed Boredom Commit", 0.5, [3, 9], lookConfigSlow, new LastFullLookConfigFilter([lookConfigDisengage, lookConfigUncommitted], true)),			//body
            new AttentionRuleEyeReturn("Relaxed Eye Return", 0.2, 5, 0.001, null, lookConfigSlowEyeOnly),
            new AttentionRuleEyeReturn("Relaxed Far Eye Return", 0.2, [0.6, 1], null, 0.075, lookConfigSlowEyeOnly),
            new AttentionRuleBlinkOccasionally("Relaxed Blink Occasionally", [3, 13], blinker)
        ],
        NAP: [],
        ENGAGED: [
            //new AttentionRuleHeyJibo("Engaged Hey Jibo", 0.5, 0, lookConfigDefault), 					//body
            new AttentionRulePrimaryFace("Engaged Primary Face", 0.0, 0.7, lookConfigVisionFace),
            //new AttentionRuleEyeFace("Engaged Face", 0.0, 0.7, 1.0, lookConfigVisionFace),		//body
            new AttentionRuleSound("Engaged Body Sound", 1.5, 2, false, [{ confidence: 0.42, activity: AttentionRuleSound.ActivityType.ANY }, { confidence: 0.13, activity: AttentionRuleSound.ActivityType.PROLONGED }], lookConfigDefault),
            //new AttentionRuleEyeMotion("Engaged Eye Recent Motion", 0.0, 0.7, 1.0, true, 1, 4, lookConfigVisionMotionEyeOnly),		//eye only
            //new AttentionRuleEyeMotion("Engaged Motion", 0.0, 0.7, 1.0, false, 0, 0, lookConfigVisionMotion),					//body
            new AttentionRuleSound("Engaged Eye Sound", 0.1, 2, false, [{ confidence: 0.06, activity: AttentionRuleSound.ActivityType.LIGHT }, { confidence: 0.09, activity: AttentionRuleSound.ActivityType.ANY }], lookConfigDefaultEyeOnly),
            new AttentionRuleEyeReturn("Engaged Eye Return", 0.2, 5, 0.001, null, lookConfigSlowEyeOnly),
            new AttentionRuleEyeReturn("Engaged Far Eye Return", 0.2, [0.6, 1], null, 0.075, lookConfigSlowEyeOnly) //eye only
        ],
        SPEAKING: [
            new AttentionRulePrimaryFace("Speaking Primary Face", 0.0, 0.7, lookConfigVisionFace) //body
        ],
        FIXATED: [
            new AttentionRuleHeyJibo("Fixated Hey Jibo", 0.5, 0, lookConfigDefault),
            new AttentionRuleEyeFace("Fixated Face", 0.0, 0.7, 1.0, lookConfigVisionFace),
            new AttentionRuleEyeReturn("Fixated Eye Return", 0.2, 5, 0.001, null, lookConfigSlowEyeOnly),
            new AttentionRuleEyeReturn("Fixated Far Eye Return", 0.2, [0.6, 1], null, 0.075, lookConfigSlowEyeOnly) //eye only
        ],
        DISENGAGE: [
            new AttentionRuleSwitchMode("Disengage Back To Idle", 0, 4.3, "IDLE", this),
            new AttentionRuleLookAway("Disengaged Look Away", 6, 0, Math.PI / 5, Math.PI / 17, lookConfigDisengage) //body
        ],
        ATTRACTABLE: [
            new AttentionRuleSound("Attractable Body Sound", 1.5, 2, false, [{ confidence: 0.36, activity: AttentionRuleSound.ActivityType.ANY }, { confidence: 0.13, activity: AttentionRuleSound.ActivityType.HEAVY }], lookConfigDefault),
            //new AttentionRuleEyeMotion("Attractable Eye Recent Motion", 0.0, 0.7, 1.0, true, 1, 4, lookConfigVisionMotionEyeOnly),		//eye only
            new AttentionRuleEyeMotion("Attractable Motion", 0.0, 0, 1.0, false, 0, 0, lookConfigVisionMotion),
            new AttentionRuleEyeFace("Attractable Face", 0.0, 0.7, 1.0, lookConfigVisionFace),
            //new AttentionRuleEyeSound("Attractable Eye Sound", 0.1, 2, 0.32, false, lookConfigDefaultEyeOnly),								//eye only
            new AttentionRuleSound("Attractable Body Rare Sound", 1.5, 1, true, [{ confidence: 0.06, activity: AttentionRuleSound.ActivityType.LIGHT }], lookConfigDefault),
            new AttentionRuleEyeReturn("Attractable Eye Return", 0.2, 5, 0.001, null, lookConfigSlowEyeOnly),
            new AttentionRuleEyeReturn("Attractable Far Eye Return", 0.2, [0.6, 1], null, 0.075, lookConfigSlowEyeOnly),
        ],
        MENU: [
            new AttentionRulePrimaryFace("Menu Primary Face", 0.0, 0.7, lookConfigVisionFaceMenu),
            new AttentionRuleBodyReturn("Menu Body Return", 0.5, 3, 0.73, lookConfigSlow) //body
        ],
        COMMAND: [
            new AttentionRuleCommandLook("Command Look", 0.0, 0, lookConfigCommand)
        ]
    };
    //configure most of the idle/relaxed rules to be "debug" log level
    var quietRules = [this._rules.IDLE, this._rules.RELAXED];
    for (var m = 0; m < quietRules.length; m++) {
        var ruleSet = quietRules[m];
        for (var d = 0; d < ruleSet.length; d++) {
            var theRule = ruleSet[d];
            if (!(theRule instanceof AttentionRuleEyeFace)) {
                theRule.logLevel = slog.Levels.DEBUG;
            }
        }
    }
    /**
     * @type {AttentionRuleCommandLook}
     * @private
     */
    this._commandRule = this._rules[Mode.COMMAND][0];
    /**
     * @type {RulesState}
     * @private
     */
    this._rulesState = new RulesState();
    /**
     *
     * @type {RecentAttentionHistory}
     * @private
     */
    this._attentionCommandHistory = {
        lastEyeTarget: null,
        lastBodyTarget: null,
        lastHeyJiboTarget: null,
        initialCenter: this._initialCenter,
        lastFullLookRule: null,
        lastFullLookConfig: null,
        lastEyeLookRule: null,
        lastEyeLookConfig: null
    };
    this._lookatConfigs = {
        lookConfigDefaultEyeOnly,
        lookConfigDefault,
        lookConfigDefaultSquareBase,
        lookConfigSlow,
        lookConfigSlowDown,
        lookConfigSlowEyeOnly,
        lookConfigShort,
        lookConfigDisengage,
        lookConfigUncommitted,
        lookConfigVisionFace,
        lookConfigVisionFaceShift,
        lookConfigVisionFaceEngaged,
        lookConfigVisionFaceMenu,
        lookConfigVisionMotion,
        lookConfigVisionMotionEyeOnly,
        lookConfigRelaxed,
        lookConfigCommand
    };
    /**
     * @type {THREE.Vector3}
     * @private
     */
    this._lastCommandTarget = null;
    /**
     * @type {number}
     * @private
     */
    this._lastCommandEntityIndex = null;
    /**
     * @type {number}
     * @private
     */
    this._primaryFaceIndex = null;
    /**
     * @private
     * @type {AnimationBuilder}
     */
    this._defaultBuilder = null;
    if (this._animate !== null) {
        var self = this;
        this._animate.createAnimationBuilder(this._resourceRoot + "animations/jibo-default.anim", function (builder) {
            self._defaultBuilder = builder;
        });
    }
    this._lpsConnection = new LPSConnection(lps);
    install(animate, glService, lps, this, dofArbiter, doRemoteVis, configData);
};
AttentionManager.Mode = Mode;
AttentionManager.EventType = EventType;
AttentionManager.ResultStatus = ResultStatus;
/**
 * Set whether the color of the eye is changed to visualize current track information.
 *
 * @param enable - true to enable.  defaults to true
 */
AttentionManager.prototype.setEnableEyeColorStateVisualizer = function (enable) {
    if (enable !== this._enableDebugStateVisualizer) {
        this._enableDebugStateVisualizer = enable;
        if (!this._enableDebugStateVisualizer) {
            if (this._debugStateVisualizer != null) {
                this._debugStateVisualizer(null);
            }
        }
    }
};
AttentionManager.prototype.displayTrackState = function (trackState) {
    if (this._enableDebugStateVisualizer) {
        if (this._debugStateVisualizer != null) {
            this._debugStateVisualizer(trackState);
        }
    }
};
/**
 * @callback VisualizeDebugState
 * @param {string} trackState - "FACE", "SOUND", (null for no state)
 * @param {boolean} [force] - if true, displays the state regardless of lastState (Defaults to false).  for resuming from unknown robot configuration.
 * @private
 */
/**
 * @param {VisualizeDebugState} visualizerFunction
 */
AttentionManager.prototype.setDebugVisualizer = function (visualizerFunction) {
    this._debugStateVisualizer = visualizerFunction;
};
/**
 * Command the attention system to attend to a specified target.
 * Returns a cancellable handle with a promise that will resolve when the target is reached or the command is cancelled/interrupted.
 * This command is only supported when the system is in COMMAND mode; the command will be immediately cancelled otherwise.
 * @method jibo.attention#attendToTarget
 * @param {THREE.Vector3|number[]} position - Position of target (may be null if entity is provided).
 * @param {?} entity - Target entity, may be null if position is provided.  If position and entity are both provided/valid, entity will be used.
 * @return {jibo.attention.AttendHandle} The cancellable command handle.
 */
AttentionManager.prototype.attendToTarget = function (position, entity) {
    slog(channel, "Received attendToTarget request");
    var target;
    if (position === null || position === undefined) {
        //something, get from entity
        target = new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z);
    }
    else if (Array.isArray(position)) {
        target = new THREE.Vector3(position[0], position[1], position[2]);
    }
    else {
        target = new THREE.Vector3(position.x, position.y, position.z);
    }
    /**
     * @type {AttendHandle}
     */
    var attendHandle = this._commandRule.setCommand(target);
    if (this._mode !== Mode.COMMAND) {
        slog(channel, "Cancelling attendToTarget because we are not in COMMAND mode!");
        attendHandle.cancel();
    }
    else {
        this._lastCommandTarget = target;
        if (entity && entity.id !== null && entity.id !== undefined) {
            this._lastCommandEntityIndex = entity.id;
        }
        else {
            this._lastCommandEntityIndex = null;
        }
    }
    //clear the primary face at the end of the attendToTarget to start new face acquisition
    attendHandle.promise.then(() => {
        //slog(channel, "attendToTarget clearing primaryFace for new acquisition");
        this._primaryFaceIndex = null;
    });
    return attendHandle;
};
/**
 * Asynchronously wait for a face to appear.
 * Returns a cancellable handle with a promise that will resolve when a face is detected or timeout is reached.
 * Faces that are already in view "count" - so, the command may resolve quickly if people are already present.
 * @method jibo.attention#awaitFace
 * @param {number} timeout - Timeout in seconds; if no face is found in this time, the promise will resolve with status "TIMEOUT".  0 will not wait at all, only currently existing data provided.
 * @param {number} [maxAngle=0] - Maximum allowed angle (radians) from forward to face.  Faces outside this angle are not considered. 0 for no limit (default).
 * @param {number} [fullSearchTime=0] - Time to complete full scan from 0 to maxAngle.  0 to search full maxAngle range immediately (default).
 * @param {boolean} [doDemandDetect=true] - If true and timeout window is sufficiently long (timeout > 0.5s), forces the LPS to run face detection on the current field of vision.
 * @param {boolean} [timeoutEarlyIfDemandFindsNoFaces=true] - If true, the promise is allowed to timeout early if the LPS demand-detect runs and finds no faces.
 * @return {jibo.attention.AwaitFaceHandle} The cancellable command handle.
 */
AttentionManager.prototype.awaitFace = function (timeout, maxAngle, fullSearchTime, doDemandDetect, timeoutEarlyIfDemandFindsNoFaces) {
    var currentTime = Clock.currentTime();
    if (maxAngle === undefined || maxAngle === null) {
        maxAngle = 0;
    }
    if (fullSearchTime === undefined || fullSearchTime === null) {
        fullSearchTime = 0;
    }
    if (doDemandDetect === undefined || doDemandDetect === null) {
        doDemandDetect = true;
    }
    if (timeoutEarlyIfDemandFindsNoFaces === undefined || timeoutEarlyIfDemandFindsNoFaces === null) {
        timeoutEarlyIfDemandFindsNoFaces = true;
    }
    var awaiter = new FaceAwaiter(currentTime, timeout, maxAngle, fullSearchTime, this._animate, this._lpsConnection, doDemandDetect, timeoutEarlyIfDemandFindsNoFaces);
    this._faceAwaiters.push(awaiter);
    return awaiter.getHandle();
};
/**
 * Retrieve an iterator that can be used to search for interaction partners.
 * @method jibo.attention#getSearchIterator
 * @return {jibo.attention.SearchIterator} An iterator that will provide a sequence of search targets.
 */
AttentionManager.prototype.getSearchIterator = function () {
    var kinematicFeatures = this._animate.getKinematicFeatures();
    var eyeFeature = kinematicFeatures["Eye"];
    var worldLookTarget = eyeFeature.direction.clone().setLength(2).add(eyeFeature.position);
    slog(channel, "Starting search from (" + worldLookTarget.x + ", " + worldLookTarget.y + ", " + worldLookTarget.z + ")");
    return new TridentSearchIterator(worldLookTarget);
};
/**
 * Set the mode governing the attention system's behavior.  This mode will clear any mode stack
 * present from pushMode, and also will become the base mode that takes over when all pushMode elements
 * are released.
 *
 * @method jibo.attention#setMode
 * @param {jibo.attention.Mode} mode - The new attention system mode: IDLE, ENGAGED, SPEAKING, OFF, etc.
 */
AttentionManager.prototype.setMode = function (mode) {
    if (this._rules[mode] == null) {
        slog(channel, "AttentionManager.setMode() called with unknown mode: \"" + mode + "\"", slog.Levels.WARN);
        return false;
    }
    else {
        this._attentionStack.setPermanentMode(mode);
        return true;
    }
};
/**
 * Set the mode governing the attention system's behavior for a bounded time period.
 * Returns an AttentionModeHandle which MUST have release() called on it when caller is finished
 * with the mode.
 *
 * Modes are maintained in a stack: the most recent call to pushMode will always win, and when
 * a handle is released it will drop down to mode of the highest non-released mode.
 *
 * Mode stack is fully cleared when setMode is called, and that mode becomes the base mode
 * for when a stack is fully released.
 *
 * @method jibo.attention#pushMode
 * @param {jibo.attention.Mode} mode - The new attention system mode: IDLE, ENGAGED, SPEAKING, OFF, etc.
 * @return {jibo.attention.AttentionModeHandle} The handle for this mode request. MUST call `release()` on this handle when finished. null if invalid mode
 */
AttentionManager.prototype.pushMode = function (mode) {
    if (this._rules[mode] == null) {
        slog(channel, "AttentionManager.pushMode() called with unknown mode: \"" + mode + "\"", slog.Levels.WARN);
        return null;
    }
    else {
        return this._attentionStack.pushMode(mode);
    }
};
/**
 * Change the mode of the AttentionManager; should be called only internally as a result
 * of AttentionModeStack operations.
 *
 * @param {jibo.attention.Mode} mode - The new attention system mode: IDLE, ENGAGED, SPEAKING, OFF, etc.
 * @private
 */
AttentionManager.prototype._processSetMode = function (mode) {
    var r;
    if (mode === Mode.OFF && this._mode !== Mode.OFF) {
        // stop active lookats
        for (var i = 0; i < this._lookResultStatus.length; i++) {
            if (!this._lookResultStatus[i].stopped) {
                this._lookResultStatus[i].instance.stop();
                this._lookResultStatus[i].stopped = true;
            }
        }
        this._lookatInstance = null;
        this._currentInstanceIsMissingDOFs = false;
        this._currentInstanceRequiredDOFs = [];
        this._currentInstanceLookConfig = null;
        this._havePrintedAttentionNoDOFsWarning = false;
        this._ruleThatHasLastFired = null;
    }
    if (mode !== this._mode) {
        slog(channel, "Attention Mode changed from " + this._mode + " to " + mode);
        //reset outgoing/incoming rules
        for (r = 0; r < this._rules[this._mode].length; r++) {
            this._rules[this._mode][r].reset();
        }
        for (r = 0; r < this._rules[mode].length; r++) {
            this._rules[mode][r].reset();
        }
        //clear tracked audio localization data
        this._sensoryStore.clearTracked(SensoryRecord.SensoryType.AUDIO_LOCALIZATION);
        //if(mode === Mode.ENGAGED){ //now we do this at the end of the attendToTarget
        //	// clear primary face
        //	this._primaryFaceIndex = null;
        //}
    }
    this._mode = mode;
};
/**
 * Get the current mode of the attention system.
 * @method jibo.attention#getMode
 * @returns {jibo.attention.Mode} The current attention system mode.
 */
AttentionManager.prototype.getMode = function () {
    return this._mode;
};
/**
 * @returns {DataConverter}
 */
AttentionManager.prototype.getDataConverter = function () {
    return this._dataConverter;
};
/**
 * Should be called whenever a wake work comes in, even if it doesn't make it into a persistent
 * entry into the sensory store.
 *
 * @param {SensoryRecord} sensoryRecord
 */
AttentionManager.prototype.notifyWakeHappened = function (sensoryRecord) {
    this._needToFireOnNewWake = true;
};
/**
 * Inform the attention manager of the current state of the emotion system.
 * @method jibo.attention#acceptEmotionState
 * @param {Object<string,number>} currentEmotionValues - The emotion values associated with the current emotion system state.
 * @param {string} nearestEmotionName - The name of the labeled emotion closest to the current emotion system state.
 * @param {Object<string,number>} nearestEmotionValues - The emotion values of the labeled emotion closest to the current state.
 * @intdocs
 */
AttentionManager.prototype.acceptEmotionState = function (currentEmotionValues, nearestEmotionName, nearestEmotionValues) {
    //slog(channel, "Received emotion state: "+JSON.stringify(currentEmotionValues)+", "+nearestEmotionName+", "+JSON.stringify(nearestEmotionValues));
};
/**
 * Add a listener for the specified event type.
 * @method jibo.attention#addListener
 * @param {jibo.attention.EventType} eventType - The event type to listen for.
 * @param {jibo.attention#AttentionListener} listener - The listener.
 */
AttentionManager.prototype.addListener = function (eventType, listener) {
    /** @type {AttentionListener[]} */
    var handlersForType = this._eventHandlers[eventType];
    if (!handlersForType) {
        handlersForType = [];
        this._eventHandlers[eventType] = handlersForType;
    }
    if (handlersForType.indexOf(listener) === -1) {
        handlersForType.push(listener);
    }
};
/**
 * Remove a listener for the specified event type.
 * @method jibo.attention#removeListener
 * @param {jibo.attention.EventType} eventType - The event type.
 * @param {jibo.attention#AttentionListener} listener - The listener.
 */
AttentionManager.prototype.removeListener = function (eventType, listener) {
    /** @type {AttentionListener[]} */
    var handlersForType = this._eventHandlers[eventType];
    if (handlersForType) {
        var index = handlersForType.indexOf(listener);
        if (index !== -1) {
            handlersForType.splice(index, 1);
        }
    }
};
/**
 *
 * @param {LookatInstance} instance
 * @param {THREE.Vector3} target
 * @param {function} reachedHandler
 * @param {function} interruptedHandler
 * @param {boolean} isHeyJibo
 * @constructor
 */
var LookResultStatus = function (instance, target, reachedHandler, interruptedHandler, isHeyJibo) {
    this.instance = instance;
    this.target = target;
    this.reachedHandler = reachedHandler;
    this.interruptedHandler = interruptedHandler;
    this.isHeyJibo = isHeyJibo;
    this.stopped = false;
};
var processLookResult = function (lrh, target, interrupted, attentionManager) {
    if (interrupted === false && lrh.reachedHandler !== null) {
        lrh.reachedHandler(lrh.target);
        lrh.reachedHandler = null; //null out reached/interrupted, we have reached and thus are done with both
        lrh.interruptedHandler = null;
    }
    if (interrupted === true && lrh.interruptedHandler !== null) {
        lrh.interruptedHandler(lrh.target);
        lrh.reachedHandler = null; //null out reached/interrupted, we have been interrupted and thus are done with both
        lrh.interruptedHandler = null;
    }
    if (lrh.isHeyJibo === true) {
        attentionManager.fireEvent(EventType.FINISHED_HEY_JIBO, {
            position: target,
            interrupted: interrupted
        }, false);
        lrh.isHeyJibo = false; //processed HJ, clear it out so we won't process again
    }
};
/**
 * called whenever a single look trajectory is finished, process custom listeners and HJ events
 *
 * @param {LookatInstance} instance
 * @param {THREE.Vector3} target
 * @param {boolean} interrupted
 */
AttentionManager.prototype.handleLookFinished = function (instance, target, interrupted) {
    for (var i = 0; i < this._lookResultStatus.length; i++) {
        var lrh = this._lookResultStatus[i];
        if (lrh.instance === instance) {
            processLookResult(lrh, target, interrupted, this);
        }
    }
};
/**
 * called whenever an instance is ending (STOPPED/CANCELLED). fire off any remaining events and
 * remove it from the list.
 *
 * @param {LookatInstance} instance
 * @param {boolean} interrupted
 */
AttentionManager.prototype.handleInstanceFinished = function (instance, interrupted) {
    for (var i = this._lookResultStatus.length - 1; i >= 0; i--) {
        var lrh = this._lookResultStatus[i];
        if (lrh.instance === instance) {
            processLookResult(lrh, null, interrupted, this);
            lrh.stopped = true;
            this._lookResultStatus.splice(i, 1);
        }
    }
    if (instance === this._lookatInstance) {
        this._currentInstanceIsMissingDOFs = true;
    }
};
/**
 *
 * @param {EventType} eventType
 * @param {AttentionEventInfo} info
 * @param {boolean} useDispatch - true to dispatch event (use if we are generating events during our update), false to fire immediately
 */
AttentionManager.prototype.fireEvent = function (eventType, info, useDispatch) {
    /** @type {AttentionListener[]} */
    var handlersForType = this._eventHandlers[eventType];
    if (handlersForType) {
        for (var i = 0; i < handlersForType.length; i++) {
            if (useDispatch) {
                AttentionEventDispatcher.queueEvent(handlersForType[i], null, [eventType, info]);
            }
            else {
                handlersForType[i](eventType, info);
            }
        }
    }
};
/**
 *
 * @param {string} channelWhoLostDOFs
 * @param {string[]} dofsLost
 */
AttentionManager.prototype.handleLossOfActiveDOFs = function (channelWhoLostDOFs, dofsLost) {
    if (this._currentInstanceLookConfig && this._currentInstanceLookConfig.dofArbiterChannel === channelWhoLostDOFs) {
        for (var li = 0; li < dofsLost.length; li++) {
            for (var ri = 0; ri < this._currentInstanceRequiredDOFs.length; ri++) {
                if (dofsLost[li] === this._currentInstanceRequiredDOFs[ri]) {
                    //console.log("Invalidating old look because we've lost "+dofsLost[li]);
                    this._currentInstanceIsMissingDOFs = true;
                    return;
                }
            }
        }
    }
};
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @param {LookConfig} lookatConfig
 */
AttentionManager.prototype.configureNewBuilder = function (lookatBuilder, lookatConfig) {
    var dofs = lookatConfig.getDOFs();
    if (this._eyeRecessor !== null && lookatConfig.doRecession && Bakery.getBoolean("Allow Any Eye Recession", true, "ATMotion")) {
        this._eyeRecessor.attachToBuilder(lookatBuilder);
    }
    lookatBuilder.setContinuousMode(lookatConfig.continuous);
    if (dofs !== null) {
        lookatBuilder.setDOFs(dofs);
    }
    lookatConfig.configureBuilder(lookatBuilder);
    lookatBuilder.on(this._animate.LookatEventType.TARGET_REACHED, (eventName, instance, data) => {
        this.handleLookFinished(instance, data.target, false);
    });
    lookatBuilder.on(this._animate.LookatEventType.TARGET_SUPERSEDED, (eventName, instance, data) => {
        this.handleLookFinished(instance, data.target, true);
    });
    lookatBuilder.on(this._animate.LookatEventType.STOPPED, (eventName, instance, data) => {
        this.handleInstanceFinished(instance, data.interrupted);
    });
    lookatBuilder.on(this._animate.LookatEventType.CANCELLED, (eventName, instance, data) => {
        this.handleInstanceFinished(instance, true);
    });
};
//TMING var lookStartTotal = 0;
//TMING var lookStartCount = 0;
//TMING var createBuilderTotal = 0;
//TMING var createBuilderCount = 0;
/**
 *
 * @param {THREE.Vector3} position
 * @param {boolean} isHeyJibo
 * @param {LookConfig} lookatConfig
 * @param {THREE.Vector3} lastTarget
 * @param {?function} lookSucceededListener
 * @param {?function} lookInterruptedListener
 * @param {AttentionRule} rule
 */
AttentionManager.prototype.setTarget = function (position, isHeyJibo, lookatConfig, lastTarget, lookSucceededListener, lookInterruptedListener, rule) {
    var newLook = this._currentInstanceIsMissingDOFs ||
        lookatConfig !== this._currentInstanceLookConfig ||
        !lookatConfig.continuous ||
        isHeyJibo || Bakery.getBoolean("Every Lookat New", false, "AttentionDebug") ||
        lookSucceededListener !== null || lookInterruptedListener !== null;
    //always do new look for hey jibo for easier event strategy below
    //if(this._currentInstanceIsMissingDOFs){
    //	console.log("starting a new look because we've lost require dofs");
    //}
    var dofs = lookatConfig.getDOFs();
    var body = !lookatConfig.eyeOnly;
    var torsoEnabled = lookatConfig.torsoEnabled;
    var dofArbiterChannel = lookatConfig.dofArbiterChannel;
    /**
     * Will be true at the end of function if we actually caused any look behavior
     * (The reason we may not is if we don't have the dofs)
     * @type {boolean}
     */
    var didTriggerTargetChange = false;
    /**
     * this._currentInstanceIsMissingDOFs will be updated by the logic here; we want to remember
     * the initial state coming in for the use of the printouts at the end
     * @type {boolean}
     */
    var weWereMissingDOFs = this._currentInstanceIsMissingDOFs;
    if (this._lookatInstance === null || newLook) {
        var availableDOFs = this._dofArbiter.getAvailable(dofArbiterChannel, dofs, null); //default is allOrNothing
        if (availableDOFs.length === dofs.length) {
            //TMING var createStart = Clock.currentTime();
            /** @type {LookatBuilder} */
            var lookatBuilder = lookatConfig.cachedBuilder;
            if (lookatBuilder === null || Bakery.getBoolean("Every Lookat New", false, "AttentionDebug")) {
                lookatBuilder = this._animate.createLookatBuilder();
                this.configureNewBuilder(lookatBuilder, lookatConfig);
                lookatConfig.cachedBuilder = lookatBuilder;
                //console.log("making new builder for config!"+lookatConfig.name);
            }
            else {
                //console.log("using cached builder for config!"+lookatConfig.name);
            }
            //TMING var createEnd = Clock.currentTime();
            //TMING createBuilderCount++;
            //TMING if(createBuilderCount > 5) {
            //TMING 	createBuilderTotal += createEnd.subtract(createStart);
            //TMING 	console.log("CreateLook " + (createEnd.subtract(createStart) * 1000).toFixed(3) + "ms, avg=" + (createBuilderTotal / (createBuilderCount-5) * 1000).toFixed(3) + "ms, total=" + createBuilderTotal.toFixed(3) + "s (" + (createBuilderCount-5) + ")");
            //TMING }else{
            //TMING 	console.log("CreateLook " + (createEnd.subtract(createStart) * 1000).toFixed(3) + "ms, pre-counted:(" + createBuilderCount + ")");
            //TMING }
            if (this._eyeRecessor !== null && lookatConfig.doRecession && Bakery.getBoolean("Allow Any Eye Recession", true, "ATMotion")) {
                this._eyeRecessor.setRecessionThreshold(lookatConfig.recessionThreshold);
                this._eyeRecessor.notifyTargets(lastTarget, position);
            }
            if (isHeyJibo) {
                this.fireEvent(EventType.STARTED_HEY_JIBO, { position: position }, true);
                if (!this._needToFireOnNewWake) {
                    slog.error("AttentionManager unexpected state: firing on hey-jibo, but _needToFireOnNewWake not set.");
                }
                this._needToFireOnNewWake = false;
            }
            //TMING var lookStartStart = Clock.currentTime();
            this._lookatInstance = this._dofArbiter.startLookat(lookatBuilder, dofArbiterChannel, position, null); //default is allOrNothing
            //TMING var lookStartEnd = Clock.currentTime();
            //TMING lookStartCount++;
            //TMING if(lookStartCount > 5) {
            //TMING 	lookStartTotal += lookStartEnd.subtract(lookStartStart);
            //TMING 	console.log("StartLook " + (lookStartEnd.subtract(lookStartStart) * 1000).toFixed(3) + "ms, avg=" + (lookStartTotal / (lookStartCount-5) * 1000).toFixed(3) + "ms, total=" + lookStartTotal.toFixed(3) + "s (" + (lookStartCount-5) + ")");
            //TMING }else{
            //TMING 	console.log("StartLook " + (lookStartEnd.subtract(lookStartStart) * 1000).toFixed(3) + "ms, pre-counted:(" + lookStartCount + ")");
            //TMING }
            if (this._lookatInstance !== null) {
                this._lookResultStatus.push(new LookResultStatus(this._lookatInstance, position, lookSucceededListener, lookInterruptedListener, isHeyJibo));
                this._currentInstanceIsMissingDOFs = false;
                this._currentInstanceRequiredDOFs = dofs;
                this._currentInstanceLookConfig = lookatConfig;
                didTriggerTargetChange = true;
                if (body && !torsoEnabled && this._defaultBuilder !== null) {
                    var torsoDOFName = this._robotInfo.getDOFSet("BODY").getDOFs()[1];
                    this._defaultBuilder.setDOFs([torsoDOFName]);
                    this._dofArbiter.playAnimation(this._defaultBuilder, dofArbiterChannel, null); //default is allOrNothing
                }
                rule.notifyDidFire();
            }
            else {
                slog.warn("Unexpected: Attention Manager got 0 dofs from DOF Arbiter when starting a lookat");
            }
        }
        else {
            if (!this._havePrintedAttentionNoDOFsWarning) {
                slog(channel, "AttentionManager not trying to do lookat, we have no dofs!!");
                this._havePrintedAttentionNoDOFsWarning = true;
            }
            //if(lookInterruptedListener){
            //	lookInterruptedListener();
            //}
            //console.log("Skipping creation of lookat since we cannot access required dofs");
        }
    }
    else {
        if (this._eyeRecessor !== null && this._currentInstanceLookConfig !== null && this._currentInstanceLookConfig.doRecession) {
            if (Bakery.getBoolean("Allow Any Eye Recession", true, "ATMotion")) {
                this._eyeRecessor.notifyTargets(lastTarget, position);
                this._eyeRecessor.lookStarted();
            }
        }
        this._lookatInstance.updateTarget(position);
        didTriggerTargetChange = true;
    }
    if (didTriggerTargetChange) {
        if (this._ruleChangedListener !== null) {
            this._ruleChangedListener.switchedRule(rule.name, Clock.currentTime());
        }
        if (rule !== this._ruleThatHasLastFired) {
            slog(channel, "Switched Attention Rule:" + rule.name, rule.logLevel);
        }
        else if (weWereMissingDOFs) {
            //we are gaining back dofs but aren't changing rules, so let's print out the re-assertion since we won't print a rule-change
            slog(channel, "Asserting attention rule after interruption: " + rule.name);
        }
        this._ruleThatHasLastFired = rule;
        this._havePrintedAttentionNoDOFsWarning = false; //clear this flag when we ever succeed to look, we are no longer in that failed state
    }
};
/**
 *
 * @param {SensoryStore} sensoryStore
 * @param {Time} currentTime
 * @param {Time} timestampOfLastUsedHeyJibo
 * @param {number} primaryFaceIndex
 * return {PerceptionState}
 */
AttentionManager.prototype.assembleData = function (sensoryStore, currentTime, timestampOfLastUsedHeyJibo) {
    var i;
    var mostRecentHeyJibo = null;
    var trackedWake = sensoryStore.getTracked(SensoryRecord.SensoryType.WAKE);
    if (trackedWake.length > 0 && trackedWake[0].hasOwnProperty("wakeAt")) {
        mostRecentHeyJibo = trackedWake[0];
    }
    var validNewHeyJibo = null;
    if (mostRecentHeyJibo !== null &&
        currentTime.subtract(mostRecentHeyJibo.wakeAt) < Bakery.getFloat("IDLE Hey-is-New time", 0, 10, 2, "ATPolicy") &&
        (timestampOfLastUsedHeyJibo === null || mostRecentHeyJibo.wakeAt.isGreater(timestampOfLastUsedHeyJibo))) {
        validNewHeyJibo = mostRecentHeyJibo;
    }
    var allTrackedFaces = sensoryStore.getTracked(SensoryRecord.SensoryType.VISION);
    var trackedFaces = [];
    var primaryFace = null;
    for (i = 0; i < allTrackedFaces.length; i++) {
        if (currentTime.subtract(allTrackedFaces[i].lastIncorporatedReport) < Bakery.getFloat("Face Min Recency", 0, 5, 0.3, "ATPolicy")) {
            trackedFaces.push(allTrackedFaces[i]);
        }
        if (allTrackedFaces[i].id === this._primaryFaceIndex) {
            primaryFace = allTrackedFaces[i];
        }
    }
    if (primaryFace === null) {
        // select primary face
        if (this._lastCommandEntityIndex !== null) {
            for (i = 0; i < allTrackedFaces.length; i++) {
                if (allTrackedFaces[i].id === this._lastCommandEntityIndex) {
                    this._primaryFaceIndex = allTrackedFaces[i].id;
                    slog(channel, "Primary face selected (entity match): " + this._primaryFaceIndex);
                    primaryFace = allTrackedFaces[i];
                    break;
                }
            }
        }
        if (primaryFace === null && this._lastCommandTarget !== null) {
            var closestFace = null;
            var minDistance = Number.MAX_VALUE;
            for (i = 0; i < allTrackedFaces.length; i++) {
                if (currentTime.subtract(allTrackedFaces[i].lastIncorporatedReport) < Bakery.getFloat("Face Min Recency", 0, 5, 0.3, "ATPolicy")) {
                    var distance = allTrackedFaces[i].position.distanceTo(this._lastCommandTarget);
                    if (distance < minDistance) {
                        closestFace = allTrackedFaces[i];
                        minDistance = distance;
                    }
                }
            }
            if (closestFace !== null) {
                this._primaryFaceIndex = closestFace.id;
                slog(channel, "Primary face selected (position based): " + this._primaryFaceIndex);
                primaryFace = closestFace;
            }
        }
    }
    var trackedMotions = [];
    var allTrackedMotions = sensoryStore.getTracked(SensoryRecord.SensoryType.MOTION);
    for (i = 0; i < allTrackedMotions.length; i++) {
        if (currentTime.subtract(allTrackedMotions[i].lastIncorporatedReport) < Bakery.getFloat("Motion Min Recency", 0, 5, 0.3, "ATPolicy")) {
            trackedMotions.push(allTrackedMotions[i]);
        }
    }
    var mostWeighty = null;
    var trackedAudio = sensoryStore.getTracked(SensoryRecord.SensoryType.AUDIO_LOCALIZATION);
    for (i = 0; i < trackedAudio.length; i++) {
        if (currentTime.subtract(trackedAudio[i].lastIncorporatedReport) < 1 &&
            (mostWeighty === null || trackedAudio[i].confidence > mostWeighty.confidence)) {
            mostWeighty = trackedAudio[i];
        }
    }
    return { newHeyJibo: validNewHeyJibo, heyJibo: mostRecentHeyJibo, mostWeightyAudio: mostWeighty, trackedFaces: trackedFaces, trackedMotions: trackedMotions, primaryFace: primaryFace };
};
AttentionManager.prototype.update = function () {
    var i;
    var overrideMode = Bakery.getFloat("Override Mode", -1, 8, -1, "AttentionDebug");
    if (overrideMode >= 0) {
        var m = Math.floor(overrideMode);
        var modeName = Object.keys(Mode)[m];
        this.setMode(modeName);
    }
    var state = this._rulesState;
    state.clear();
    /** @type {RecentAttentionHistory} */
    var attentionCommandHistory = this._attentionCommandHistory;
    var currentTime = Clock.currentTime();
    this._sensoryStore.update();
    /** @type {PerceptionState} */
    var tracks = this.assembleData(this._sensoryStore, currentTime, this._ignoreHeyJibosAtOrBefore);
    var rules = this._rules[this._mode];
    for (i = 0; i < rules.length; i++) {
        var rule = rules[i];
        var ruleResult = rule.update(currentTime, tracks, state, attentionCommandHistory);
        if (ruleResult !== null) {
            if (state.lookClaimed) {
                throw new Error("Rule " + rule.name + " claimed look but it is already claimed!");
            }
            state.lookClaimed = true;
            var eyeOnly = rule.lookatConfig.eyeOnly;
            if (ruleResult.initLookat === true) {
                if (rule.isHeyJibo) {
                    slog(channel, "We're initing a lookat that counts as \"hey jibo\" for rule " + rule.name);
                }
                //update any config values
                rule.lookatConfig.updateValues();
                this.setTarget(ruleResult.target, rule.isHeyJibo, rule.lookatConfig, attentionCommandHistory.lastEyeTarget, rule.succeededHandler, rule.interruptedHandler, rule);
                attentionCommandHistory.lastEyeTarget = ruleResult.target;
                attentionCommandHistory.lastEyeLookRule = rule;
                attentionCommandHistory.lastEyeLookConfig = rule.lookatConfig;
                if (!eyeOnly) {
                    attentionCommandHistory.lastBodyTarget = ruleResult.target;
                    attentionCommandHistory.lastFullLookRule = rule;
                    attentionCommandHistory.lastFullLookConfig = rule.lookatConfig;
                }
            }
            if (rule.isHeyJibo && ruleResult.initLookat === true) {
                this._ignoreHeyJibosAtOrBefore = currentTime;
                attentionCommandHistory.lastHeyJiboTarget = ruleResult.target;
            }
            this.displayTrackState(rule.trackDisplayName);
        }
    }
    if (this._needToFireOnNewWake) {
        //we need to fire on a new wake, but none of the rules handled it.
        //we should fire off an IGNORED_HEY_JIBO and update state so any existing
        //wakes never trigger a rule in the future.
        this.fireEvent(EventType.IGNORED_HEY_JIBO, {}, true);
        this._ignoreHeyJibosAtOrBefore = currentTime;
        this._needToFireOnNewWake = false;
    }
    //Disable eye recession before we receive TARGET_REACHED if eye joints are complete.  comment out this whole block to revert to previous behavior
    if (this._lookatInstance !== null && this._eyeRecessor !== null && this._eyeRecessor.getIsRecessed()) {
        if (this._lookatInstance.getBuilder().motionLookat != null && this._lookatInstance.getBuilder().motionLookat.getDistanceRemaining(["eyeSubRootBn_t", "eyeSubRootBn_t_2"]) < 0.001) {
            //NOTE: this distance constant should be less than the deadzone of the eye, otherwise it might stay recessed for a bit in some cases
            //console.log("Ending recessing due to eye distance close at "+currentTime.toString());
            this._eyeRecessor.lookEnded();
        }
    }
    for (i = this._faceAwaiters.length - 1; i >= 0; i--) {
        var keepGoing = this._faceAwaiters[i].update(currentTime, tracks);
        if (!keepGoing) {
            this._faceAwaiters.splice(i, 1);
        }
    }
    AttentionEventDispatcher.dispatchQueuedEvents();
};
module.exports = AttentionManager;

},{"./AttentionDebugStateVisualizer":2,"./AttentionEventDispatcher":3,"./AttentionEyeRecessor":4,"./AttentionModeStack":6,"./DataConverter":8,"./MotorMotionMonitor":11,"./SensoryRecord":12,"./SensoryStore":13,"./actions/AttendHandle":17,"./actions/FaceAwaiter":19,"./actions/LPSConnection":20,"./actions/ResultStatus":21,"./actions/TridentSearchIterator":23,"./log/SensoryLogController":25,"./lookconfig/LookConfig":28,"./lookconfig/LookConfigDisengage":29,"./lookconfig/LookConfigEyeVision":30,"./lookconfig/LookConfigEyeVisionEngaged":31,"./lookconfig/LookConfigEyeVisionMenu":32,"./lookconfig/LookConfigRelaxed":33,"./lookconfig/LookConfigShort":34,"./lookconfig/LookConfigSlow":35,"./lookconfig/LookConfigSlowDown":36,"./lookconfig/LookConfigUncommitted":37,"./remote/RemoteVisualizerConnection":49,"animation-utilities":undefined,"find-root":undefined}],6:[function(require,module,exports){
/**
 * @author jg
 */
"use strict";
/**
 * @class AttentionModeHandle
 * @memberof jibo.attention
 */
var AttentionModeHandle = function (myMode, attentionStack) {
    this.mode = myMode;
    this.attentionStack = attentionStack;
    this.isReleased = false;
};
/**
 * Call `release()` to indicate that this mode is no longer desired by the requester
 * @method jibo.attention.AttentionModeHandle#release
 * @return {boolean} `true` iff handle is currently the controlling handle (i.e., release caused a mode change)
 */
AttentionModeHandle.prototype.release = function () {
    var didChangeMode = false;
    if (this.isReleased) {
        console.log("AttentionModeStack Error, a single mode (" + this.mode + ") was released twice!");
    }
    else {
        this.isReleased = true;
        didChangeMode = this.attentionStack._releaseHandle(this);
    }
    return didChangeMode;
};
/**
 * @method jibo.attention.AttentionModeHandle#getMode
 * @returns {jibo.attention.Mode}
 */
AttentionModeHandle.prototype.getMode = function () {
    return this.mode;
};
/**
 * @callback jibo.attention#setModeCallback
 * @param {jibo.attention.Mode} mode
 * @intdocs
 */
/**
 * @param {jibo.attention#setModeCallback} modeHandler
 * @constructor
 * @intdocs
 */
var AttentionModeStack = function (modeHandler, initialMode) {
    /** @type {setModeCallback} */
    this.modeHandler = modeHandler;
    /** @type {Array.<AttentionModeHandle>} */
    this.modeStack = [];
    this.modeStack[0] = new AttentionModeHandle(initialMode, this);
};
/**
 * @param {jibo.attention.Mode} mode
 * @return {jibo.attention.Mode} the new mode that AttentionManager should switch to
 */
AttentionModeStack.prototype.setPermanentMode = function (mode) {
    this.modeStack.length = 0;
    this.modeStack[0] = new AttentionModeHandle(mode, this);
    this.modeHandler(mode);
};
/**
 * @param {jibo.attention.Mode} mode
 * @returns {jibo.attention.AttentionModeHandle}
 * @intdocs
 */
AttentionModeStack.prototype.pushMode = function (mode) {
    var attentionModeHandle = new AttentionModeHandle(mode, this);
    this.modeStack.push(attentionModeHandle);
    this.modeHandler(mode);
    if (this.modeStack.length > 20) {
        console.log("AttentionModeStack Error: Stack depth is " + this.modeStack.length + ", likely someone is not releasing their handles after calling pushMode()");
    }
    return attentionModeHandle;
};
/**
 * @param {AttentionModeHandle} handle
 * @return {boolean} true if mode is on top (causing a mode change), false if mode was not on top (no mode change immediately caused)
 * @private
 */
AttentionModeStack.prototype._releaseHandle = function (handle) {
    var didChangeMode = false;
    var index = this.modeStack.indexOf(handle);
    if (index === 0) {
        console.log("AttentionModeStack Error, someone tried to release the base mode");
    }
    else if (index > 0) {
        var weAreOnTop = (index === this.modeStack.length - 1);
        //remove this handle
        this.modeStack.splice(index, 1);
        if (weAreOnTop) {
            //if we're on top, setMode to our parent's mode
            var newTop = this.modeStack[this.modeStack.length - 1];
            this.modeHandler(newTop.getMode());
            didChangeMode = true;
        }
    }
    return didChangeMode;
};
module.exports = AttentionModeStack;

},{}],7:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Clock = AnimationUtilities.Clock;
var Bakery = AnimationUtilities.ui.Bakery;
var ModalityHandler = require("./ModalityHandler");
var TrackedSensory = require("./TrackedSensory");
var SensoryRecord = require("./SensoryRecord");
/**
 *
 * @param {MotorMotionMonitor} motionTracker
 * @constructor
 * @extends ModalityHandler
 */
var AudioModalityHandler = function (motionTracker) {
    ModalityHandler.call(this);
    /**
     * @type {MotorMotionMonitor}
     */
    this.motionTracker = motionTracker;
    /**
     * @type {number}
     */
    this.distanceThreshold = 0.3;
    /**
     * @type {number}
     */
    this.confidenceThreshold = 0.06;
    /**
     * @type {Time}
     */
    this.lastIncomingAudioTime = null;
    /**
     * @type {Number}
     */
    this.lastIncomingAudioValue = 0;
    /**
     * @type {number}
     */
    this.backgroundNoiseLevel = 0;
    /**
     * @type {number}
     */
    this.backgroundNoiseFilter = 0.985; //992
    /**
     * @type {number}
     */
    this.backgroundNoiseRatio = 1.9;
    /**
     * decay per 1/10th of a second iteration
     * @type {number}
     */
    this.lightActivityFilter = (1 - 0.077589);
    /**
     * paired with light activity filter to create threshold at 1.0
     * @type {number}
     */
    this.lightActivityAccum = 0.47010;
    /**
     * decay per 1/10th of a second iteration
     * @type {number}
     */
    this.heavyActivityFilter = (1 - 0.061381);
    /**
     * paired with heavy activity filter to create threshold at 1.0
     * @type {number}
     */
    this.heavyActivityAccum = 0.36389;
    /**
     * decay per 1/10th of a second iteration
     * @type {number}
     */
    this.prolongedActivityFilter = (1 - 0.024762);
    /**
     * paired with prolonged activity filter to create threshold at 1.0
     * @type {number}
     */
    this.prolongedActivityAccum = 0.13370;
    /**
     * @type {Time}
     */
    this.lastUpdateTime = Clock.currentTime();
};
AudioModalityHandler.prototype = Object.create(ModalityHandler.prototype);
AudioModalityHandler.prototype.constructor = AudioModalityHandler;
/**
 * @param {SensoryRecord} sensoryRecord
 * @returns {boolean}
 * @override
 */
AudioModalityHandler.prototype.isValid = function (sensoryRecord) {
    // only accept type 0 events
    if (sensoryRecord.raw.type !== 0) {
        console.log("AudioModalityHandler: Unexpected packet type: " + JSON.stringify(sensoryRecord.raw));
        return false;
    }
    var accept = true;
    var processedConfidence = sensoryRecord.confidence;
    var useConfidenceThreshold = Bakery.getFloat("Confidence Threshold (Audio)", 0, 1, this.confidenceThreshold, "SensoryFilters");
    var backgroundNoiseRequiredRatio = Bakery.getFloat("Background Required Ratio", 0, 4, this.backgroundNoiseRatio, "SensoryFilters");
    if (this.backgroundNoiseLevel * backgroundNoiseRequiredRatio > useConfidenceThreshold) {
        useConfidenceThreshold = this.backgroundNoiseLevel * backgroundNoiseRequiredRatio;
    }
    if (accept && processedConfidence < useConfidenceThreshold) {
        accept = false;
    }
    //There is a decay filter on audio confidence values upstream (values go up quickly, and fall slowly).
    // But, we want to use the unfiltered values when determining how long a sound is, otherwise all sounds
    // seem quite long, since the decay keeps the confidence up for a significant period (decay is
    // at a rate of ~0.884 per 100ms).
    //
    // It is fairly easy to remove the decay filter, so we are doing that removal here for now.
    // Eventually it would make sense to have access to the unfiltered confidence values directly, then
    // this whole block can be removed, and the unfiltered value could be used directly.
    //
    if (accept && Bakery.getBoolean("Reject Decay Samples (Audio)", true, "SensoryFilters")) {
        //not quite right to do this rejection globally instead of per-blob, but we'll rely on fact that we
        // get only 1 audio every 100ms update; if there were more per update, (parallel tracks)
        // we should move this computation into the spatial blobs, and track lastIncomingAudioTime and
        // lastIncomingAudioValue per blob.  As we only get 1 blob at a time, this strategy works fine, because,
        // for any new confidence value, either:
        //   a) it's the same audio source as last time, in which case these constants apply correctly, or
        //   b) it's a different source: the predicted value is unlikely to match/reject it, and could only completely
        //       reject it if it was a single frame sound (otherwise it will get picked up next update as usual)
        var lastTime = this.lastIncomingAudioTime;
        if (lastTime === null) {
            lastTime = sensoryRecord.reportedTS;
        }
        var timeSinceLast = sensoryRecord.reportedTS.subtract(lastTime);
        var iterations = timeSinceLast * 10;
        var decayPredicts = this.lastIncomingAudioValue * Math.pow(0.884, iterations); //0.884 computed experimentally
        var epsilon = 0.02;
        if (Math.abs(processedConfidence - decayPredicts) < decayPredicts * epsilon) {
            //value is close to the "Decay-Predicted" value; we will not accept
            accept = false;
            processedConfidence = 0;
        }
        // else{
        // 	console.log("Accepting as non-decay confidence "+processedConfidence);
        // }
    }
    if (this.debug) {
        sensoryRecord._backgroundNoiseLevel = this.backgroundNoiseLevel;
        sensoryRecord._backgroundNoiseThreshold = this.backgroundNoiseLevel * backgroundNoiseRequiredRatio;
        sensoryRecord._thresholdUsed = useConfidenceThreshold;
        sensoryRecord._rejectedAsDecay = (processedConfidence === 0 && sensoryRecord.confidence !== 0);
    }
    var backgroundNoiseFilter = Bakery.getFloat("Background Noise Filter", 0, 1, this.backgroundNoiseFilter, "SensoryFilters");
    this.backgroundNoiseLevel = this.backgroundNoiseLevel * backgroundNoiseFilter + processedConfidence * (1 - backgroundNoiseFilter);
    this.lastIncomingAudioTime = sensoryRecord.reportedTS;
    this.lastIncomingAudioValue = sensoryRecord.confidence;
    var rejectMovingAudio = Bakery.getBoolean("Reject audio during motion", true, "SensoryFilters");
    var rejectMovingAudioRecoveryTime = Bakery.getFloat("Reject moving audio recovery time", 0, 2, 0.7, "SensoryFilters");
    if (accept) {
        if (rejectMovingAudio && this.motionTracker.timeSinceMoving() < rejectMovingAudioRecoveryTime) {
            accept = false;
        }
        else {
            accept = true;
        }
    }
    else {
        accept = false;
    }
    return accept;
};
/**
 * @param {SensoryRecord} sensoryRecord
 * @override
 */
AudioModalityHandler.prototype.accept = function (sensoryRecord) {
    /**
     * @type {TrackedSensory}
     */
    var matching = null;
    var raiseAudio = Bakery.getFloat("Audio Raise From Mouth", 0, 0.4, 0.1, "SensoryFilters");
    sensoryRecord.position.z += raiseAudio;
    var minHeight = Bakery.getFloat("Localized-Audio Height Floor", -1, 1, -0.1, "SensoryFilters");
    if (sensoryRecord.position.z < minHeight) {
        sensoryRecord.position.z = minHeight;
    }
    this.distanceThreshold = Bakery.getFloat("Distance Threshold (Audio)", 0, 1, this.distanceThreshold, "SensoryFilters");
    var distanceThresholdSquared = this.distanceThreshold * this.distanceThreshold;
    for (var i = 0; i < this.tracked.length; i++) {
        var dx = sensoryRecord.position.x - this.tracked[i].position.x;
        var dy = sensoryRecord.position.y - this.tracked[i].position.y;
        var distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < distanceThresholdSquared) {
            matching = this.tracked[i];
            break;
        }
    }
    if (matching === null) {
        matching = new TrackedSensory(SensoryRecord.SensoryType.AUDIO_LOCALIZATION);
        matching.slowFilter = 0.3;
        matching.fastFilter = 1;
        this.tracked.push(matching);
        matching.lightActivityTracker = this.lightActivityAccum;
        matching.heavyActivityTracker = this.heavyActivityAccum;
        matching.prolongedActivityTracker = this.prolongedActivityAccum;
        // console.log("Into new blob");
    }
    else {
        matching.lightActivityTracker += this.lightActivityAccum;
        matching.heavyActivityTracker += this.heavyActivityAccum;
        matching.prolongedActivityTracker += this.prolongedActivityAccum;
        if (matching.lightActivityTracker > 1.7) {
            matching.lightActivityTracker = 1.7;
        }
        if (matching.heavyActivityTracker > 1.7) {
            matching.heavyActivityTracker = 1.7;
        }
        if (matching.prolongedActivityTracker > 1.7) {
            matching.prolongedActivityTracker = 1.7;
        }
        // console.log("Into existing blob, light:"+matching.lightActivityTracker+", heavy:"+matching.heavyActivityTracker+", prolonged:"+matching.prolongedActivityTracker);
    }
    matching.confidence = sensoryRecord.confidence;
    matching.incorporateSensorReport(sensoryRecord);
};
/**
 * @override
 */
AudioModalityHandler.prototype.update = function () {
    // if(this.tracked.length > 5){
    // 	console.log("Tracking "+this.tracked.length+" audios!");
    // }
    //ModalityHandler.prototype.update.call(this);
    var i;
    var curTime = Clock.currentTime();
    var dt = curTime.subtract(this.lastUpdateTime);
    var lightDecayForDT = Math.pow(this.lightActivityFilter, dt * 10.0); //filters are designed as if to decay once per 100ms
    var heavyDecayForDT = Math.pow(this.heavyActivityFilter, dt * 10.0);
    var prolongedDecayForDT = Math.pow(this.prolongedActivityFilter, dt * 10.0);
    for (i = 0; i < this.tracked.length; i++) {
        //would prefer a voting buffer, but not sure we have the CPU.
        //this is a way to get a similar effect if we are careful with our decay and thresholds.
        this.tracked[i].lightActivityTracker *= lightDecayForDT;
        this.tracked[i].heavyActivityTracker *= heavyDecayForDT;
        this.tracked[i].prolongedActivityTracker *= prolongedDecayForDT;
    }
    this.lastUpdateTime = curTime;
    var horizontalMerge2 = Math.pow(Bakery.getFloat("HorizontalMerge", 0, 1, 0.2, "SensoryFilters"), 2);
    for (i = 0; i < this.tracked.length; i++) {
        var t1x = this.tracked[i].position.x;
        var t1y = this.tracked[i].position.y;
        for (var j = i + 1; j < this.tracked.length; j++) {
            var dx = this.tracked[j].position.x - t1x;
            var dy = this.tracked[j].position.y - t1y;
            if ((dx * dx + dy * dy) < horizontalMerge2) {
                var keep, clear;
                if (this.tracked[j].position.z < this.tracked[i].position.z) {
                    keep = i;
                    clear = j;
                }
                else {
                    keep = j;
                    clear = i;
                }
                this.tracked[keep].confidence = Math.max(this.tracked[keep].confidence, this.tracked[clear].confidence);
                // console.log("Merging in light:"+this.tracked[clear].lightActivityTracker+", heavy:"+this.tracked[clear].heavyActivityTracker+", prolonged "+this.tracked[clear].heavyActivityTracker);
                this.tracked[keep].lightActivityTracker += this.tracked[clear].lightActivityTracker; //adding is not exact for these fields...
                this.tracked[keep].heavyActivityTracker += this.tracked[clear].heavyActivityTracker;
                this.tracked[keep].prolongedActivityTracker += this.tracked[clear].prolongedActivityTracker;
                this.tracked[keep].matches += this.tracked[clear].matches;
                this.tracked[clear].lightActivityTracker = 0;
                this.tracked[clear].heavyActivityTracker = 0;
                this.tracked[clear].prolongedActivityTracker = 0;
                this.tracked[clear].confidence = 0;
                this.tracked[clear].matches = 0;
            }
        }
    }
    //cull older than 5 seconds.  do not call if it's got "wakeAt"!
    i = 0;
    while (i < this.tracked.length) {
        var last = this.tracked[i].lastIncorporatedReport;
        if (last != null && Clock.currentTime().subtract(last) > 5 && !this.tracked[i].hasOwnProperty("wakeAt")) {
            this.tracked.splice(i, 1);
        }
        else {
            i++;
        }
    }
};
module.exports = AudioModalityHandler;

},{"./ModalityHandler":9,"./SensoryRecord":12,"./TrackedSensory":15,"animation-utilities":undefined}],8:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var SensoryRecord = require("./SensoryRecord");
var AnimationUtilities = require("animation-utilities");
var THREE = AnimationUtilities.THREE;
var Time = AnimationUtilities.Time;
var Clock = AnimationUtilities.Clock;
/**
 * Convert data from various raw forms into standardized SensoryRecords, add them to the sensory store
 * @param {SensoryStore} sensoryStore
 * @param {AttentionManager} attentionManager - used only to notify that a hey-jibo came in, for its support of notifying client even when hey-jibo's are otherwise ignored
 * @param {boolean} [passWakeFromLocalization=false] - true to create WAKE type events from the audio localization stream
 * @constructor
 */
var DataConverter = function (sensoryStore, attentionManager, passWakeFromLocalization) {
    if (passWakeFromLocalization === undefined || passWakeFromLocalization === null) {
        passWakeFromLocalization = false;
    }
    this._sensoryStore = sensoryStore;
    /** @type {Time} */
    this._lastVisionTimestamp = null;
    /** @type {Time} */
    this._lastAudioLocalizationTimestamp = null;
    /** @type {Time} */
    this._lastLocalizedWakeTimestamp = null;
    /** @type {AttentionManager} */
    this._attentionManager = attentionManager || null;
    /**
     * True to pass in the wake data encoded in the audio localization stream as WAKE records
     * @type {boolean}
     * @private
     */
    this._passWakeFromLocalization = passWakeFromLocalization;
};
DataConverter.prototype.acceptAudioLocalization = function (data) {
    /**
     * @type {Time}
     */
    var thisTS;
    //console.log("audio:"+JSON.stringify(data, null, "\t"));
    for (var aei = 0; aei < data.entities.length; aei++) {
        var entity = data.entities[aei];
        /**
         * @type {SensoryType}
         */
        var sensoryType = null;
        //check TS against last for the type.  set sensoryType if it's a valid, new packet.
        if (entity.type === 0) {
            thisTS = new Time(entity.ts[0], entity.ts[1]);
            if (this._lastAudioLocalizationTimestamp === null || thisTS.isGreater(this._lastAudioLocalizationTimestamp)) {
                sensoryType = SensoryRecord.SensoryType.AUDIO_LOCALIZATION;
                this._lastAudioLocalizationTimestamp = thisTS;
            }
        }
        else if (entity.type === 1 && this._passWakeFromLocalization) {
            thisTS = new Time(entity.ts[0], entity.ts[1]);
            if (this._lastLocalizedWakeTimestamp === null || thisTS.isGreater(this._lastLocalizedWakeTimestamp)) {
                sensoryType = SensoryRecord.SensoryType.WAKE;
                this._lastLocalizedWakeTimestamp = thisTS;
            }
        }
        //sensory type is set, so we've decided its a valid, new packet.
        if (sensoryType !== null) {
            var sr = new SensoryRecord(sensoryType, new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z), entity, Clock.currentTime(), thisTS, entity.id, entity.confidence);
            if (sensoryType === SensoryRecord.SensoryType.WAKE) {
                this._notifyWakeHappened(sr);
            }
            this._sensoryStore.addData(sr);
        }
    }
};
DataConverter.prototype.acceptVision = function (data) {
    var dataTimestamp = new Time(data.ts[0], data.ts[1]);
    if (this._lastVisionTimestamp === null || !this._lastVisionTimestamp.equals(dataTimestamp)) {
        this._lastVisionTimestamp = dataTimestamp;
        var entities = data.entities;
        //console.log("vision:"+JSON.stringify(entities, null, "\t"));
        for (var vei = 0; vei < entities.length; vei++) {
            var sensoryType = SensoryRecord.SensoryType.VISION;
            if (entities[vei].description === "motion") {
                sensoryType = SensoryRecord.SensoryType.MOTION;
            }
            var sr = new SensoryRecord(sensoryType, new THREE.Vector3(entities[vei].position.x, entities[vei].position.y, entities[vei].position.z), entities[vei], Clock.currentTime(), dataTimestamp, entities[vei].id, entities[vei].confidence);
            this._sensoryStore.addData(sr);
        }
    }
};
DataConverter.prototype.acceptWakeWord = function (data) {
    //console.log("Hey Jibo!!");
    //console.log("wake:"+JSON.stringify(data, null, "\t"));
    var sr = new SensoryRecord(SensoryRecord.SensoryType.WAKE, null, data, Clock.currentTime(), null, null, null);
    this._notifyWakeHappened(sr);
    this._sensoryStore.addData(sr);
};
/**
 * @param {SensoryRecord} sensoryRecord;
 * @private
 */
DataConverter.prototype._notifyWakeHappened = function (sensoryRecord) {
    if (this._attentionManager !== null) {
        //notify attention manager of this record, so that it can send out an event
        //(either IGNORED_HEY_JIBO or STARTED_HEY_JIBO) even if the record doesn't get merged/acted upon
        //(no localization, etc.)
        this._attentionManager.notifyWakeHappened(sensoryRecord);
    }
};
module.exports = DataConverter;

},{"./SensoryRecord":12,"animation-utilities":undefined}],9:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Clock = AnimationUtilities.Clock;
var ModalityHandler = function () {
    /**
     * @type {TrackedSensory[]}
     */
    this.tracked = [];
    /**
     * @type {boolean}
     */
    this.debug = false;
};
/**
 * @param {SensoryRecord} sensoryRecord
 * @returns {boolean}
 */
ModalityHandler.prototype.isValid = function (sensoryRecord) {
    return true;
};
/**
 * @param {SensoryRecord} sensoryRecord
 */
ModalityHandler.prototype.accept = function (sensoryRecord) {
};
/**
 *
 */
ModalityHandler.prototype.update = function () {
    //cull older than 5 seconds
    var i = 0;
    while (i < this.tracked.length) {
        var last = this.tracked[i].lastIncorporatedReport;
        if (last != null && Clock.currentTime().subtract(last) > 5) {
            this.tracked.splice(i, 1);
        }
        else {
            i++;
        }
    }
};
/**
 * @returns {TrackedSensory[]}
 */
ModalityHandler.prototype.getTracked = function () {
    return this.tracked;
};
ModalityHandler.prototype.clearTracked = function () {
    this.tracked = [];
};
module.exports = ModalityHandler;

},{"animation-utilities":undefined}],10:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Time = AnimationUtilities.Time;
var Bakery = AnimationUtilities.ui.Bakery;
var ModalityHandler = require("./ModalityHandler");
var TrackedSensory = require("./TrackedSensory");
var SensoryRecord = require("./SensoryRecord");
var THREE = AnimationUtilities.THREE;
/**
 *
 * @param {MotorMotionMonitor} motionTracker
 * @constructor
 * @extends ModalityHandler
 */
var MotionModalityHandler = function (motionTracker) {
    ModalityHandler.call(this);
    /**
     * @type {MotorMotionMonitor}
     */
    this.motionTracker = motionTracker;
    /**
     * @type {number}
     */
    this.confidenceThreshold = 0;
    /**
     * @type {number}
     */
    this.distanceThreshold = 0.0;
};
MotionModalityHandler.prototype = Object.create(ModalityHandler.prototype);
MotionModalityHandler.prototype.constructor = MotionModalityHandler;
/**
 * @param {SensoryRecord} sensoryRecord
 * @returns {boolean}
 * @override
 */
MotionModalityHandler.prototype.isValid = function (sensoryRecord) {
    var r = sensoryRecord.raw;
    if (sensoryRecord.confidence < Bakery.getFloat("Confidence Threshold (Motion)", 0, 1, this.confidenceThreshold, "SensoryFilters")) {
        return false;
    }
    var rejectMovingData = Bakery.getBoolean("Reject motion data during motion", false, "SensoryFilters");
    var rejectMovingDataRecoveryTime = Bakery.getFloat("Reject moving motion data recovery time", 0, 6, 4, "SensoryFilters");
    if (rejectMovingData && this.motionTracker.timeSinceMoving() < rejectMovingDataRecoveryTime) {
        return false;
    }
    //seem to have a ray only if currently being tracked.
    //ray seems more accurate than position
    var ray = null;
    var rect = null;
    /** @type {Time} */
    var trackerUpdateTimestamp = null;
    /** @type {Time} */
    var detectionTimestamp = null;
    /** @type {boolean} */
    var inFOV = false;
    if (r.parts.length > 0) {
        var part = r.parts[0];
        if (part.value.rays.length > 0) {
            ray = part.value.rays[0];
        }
        if (part.value.trackers.length > 0) {
            var tracker = part.value.trackers[0];
            rect = tracker.rectangle;
            if (tracker.lastUpdate) {
                trackerUpdateTimestamp = Time.createFromTimestamp(tracker.lastUpdate);
            }
            inFOV = tracker.inFOV;
        }
        if (part.value.detections.length > 0) {
            var detection = part.value.detections[0];
            if (detection.timestamp) {
                detectionTimestamp = Time.createFromTimestamp(detection.timestamp);
            }
        }
    }
    var requireDetection = Bakery.getBoolean("Require Motion Detection", false, "SensoryFilters");
    if (requireDetection) {
        if (trackerUpdateTimestamp === null || detectionTimestamp === null) {
            return false;
        }
        else {
            var detectionAge = trackerUpdateTimestamp.subtract(detectionTimestamp);
            if (detectionAge > Bakery.getFloat("Max Motion Detection Age", 0, 15, 6, "SensoryFilters")) {
                return false;
            }
        }
    }
    var requireRay = Bakery.getBoolean("Require Motion Ray", false, "SensoryFilters");
    if (requireRay) {
        if (ray === null) {
            return false;
        }
        else if (Bakery.getBoolean("Use Ray Instead of position (Motion)", false, "SensoryFilters")) {
            var newPos = new THREE.Vector3(ray.origin.x, ray.origin.y, ray.origin.z);
            var d = new THREE.Vector3(ray.dir.x, ray.dir.y, ray.dir.z);
            d.multiplyScalar(2);
            newPos.add(d);
            sensoryRecord.position = newPos;
        }
    }
    var requireFOV = Bakery.getBoolean("Require Motion In FOV", true, "SensoryFilters");
    if (requireFOV && !inFOV) {
        return false;
    }
    var requireRect = Bakery.getBoolean("Require Motion Rect", false, "SensoryFilters");
    if (requireRect) {
        if (rect != null) {
            var height = Math.abs(rect.top - rect.bottom);
            if (height > Bakery.getFloat("Min Height Motion", 0, 500, 100, "SensoryFilters") &&
                height < Bakery.getFloat("Max Height Motion", 0, 1000, 500, "SensoryFilters")) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    else {
        return true;
    }
};
/**
 * @param {SensoryRecord} sensoryRecord
 * @override
 */
MotionModalityHandler.prototype.accept = function (sensoryRecord) {
    /**
     * @type {TrackedSensory}
     */
    var matching = null;
    var i;
    for (i = 0; i < this.tracked.length; i++) {
        if (this.tracked[i].id === sensoryRecord.id) {
            matching = this.tracked[i];
            break;
        }
    }
    this.distanceThreshold = Bakery.getFloat("Distance Threshold (Motion)", 0, 10, this.distanceThreshold, "SensoryFilters");
    if (matching === null) {
        for (i = 0; i < this.tracked.length; i++) {
            if (this.tracked[i].position.distanceTo(sensoryRecord.position) < this.distanceThreshold) {
                matching = this.tracked[i];
                break;
            }
        }
    }
    if (matching === null) {
        matching = new TrackedSensory(SensoryRecord.SensoryType.MOTION);
        matching.id = sensoryRecord.id;
        this.tracked.push(matching);
    }
    matching.slowFilter = Bakery.getFloat("Slow Filter (Motion)", 0, 1, 1, "SensoryFilters");
    matching.fastFilter = Bakery.getFloat("Fast Filter (Motion)", 0, 1, 1, "SensoryFilters");
    matching.incorporateSensorReport(sensoryRecord);
    matching.id = sensoryRecord.id;
};
module.exports = MotionModalityHandler;

},{"./ModalityHandler":9,"./SensoryRecord":12,"./TrackedSensory":15,"animation-utilities":undefined}],11:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Clock = AnimationUtilities.Clock;
/**
 *
 * @param {string[]} monitorDOFs
 * @param {string[]} animationUtilities
 * @constructor
 */
var MotorMotionMonitor = function (monitorDOFs, animationUtilities) {
    /**
     * @type {AnimationUtilities}
     * @private
     */
    this._animationUtilities = animationUtilities;
    /**
     * @type {number[]}
     * @private
     */
    this._realPose = new Array(monitorDOFs.length);
    /**
     * @type {number[]}
     * @private
     */
    this._lastPose = new Array(monitorDOFs.length);
    /**
     * @type {Object.<string, number>}
     * @private
     */
    this._dofsToIndex = {};
    for (var i = 0; i < monitorDOFs.length; i++) {
        this._dofsToIndex[monitorDOFs[i]] = i;
        this._realPose[i] = 0;
        this._lastPose[i] = 0;
    }
    /**
     * @type {number}
     * @private
     */
    this._epsilon = 0.02;
    /**
     * @type {boolean}
     * @private
     */
    this._moving = false;
    /**
     * @type {Time}
     * @private
     */
    this._lastMotionTime = null;
    if (this._animationUtilities != null) {
        this.registerForMotion();
    }
};
MotorMotionMonitor.prototype.update = function () {
    var moving = false;
    for (var i = 0; i < this._realPose.length; i++) {
        var delta = Math.abs(this._realPose[i] - this._lastPose[i]);
        if (delta > this._epsilon) {
            moving = true;
        }
        //console.log("Delta:"+delta);
        this._lastPose[i] = this._realPose[i];
    }
    if (moving) {
        this._lastMotionTime = Clock.currentTime();
    }
    this._moving = moving;
};
/**
 * @returns {boolean}
 */
MotorMotionMonitor.prototype.isMoving = function () {
    return this._moving;
};
/**
 * Seconds since last motion (0 to infinity)
 * @returns {number}
 */
MotorMotionMonitor.prototype.timeSinceMoving = function () {
    if (this._moving) {
        return 0;
    }
    else if (this._lastMotionTime != null) {
        return Clock.currentTime().subtract(this._lastMotionTime);
    }
    else {
        return Number.POSITIVE_INFINITY;
    }
};
MotorMotionMonitor.prototype.registerForMotion = function () {
    var self = this;
    var outputs = this._animationUtilities.timeline.getOutputs();
    var infoListener = function (bodyInfo) {
        self._realPose[self._dofsToIndex[bodyInfo.dofName]] = bodyInfo.observedPosition;
    };
    for (var i = 0; i < outputs.length; i++) {
        if (outputs[i].addInfoListener !== undefined) {
            outputs[i].addInfoListener(infoListener);
        }
    }
};
module.exports = MotorMotionMonitor;

},{"animation-utilities":undefined}],12:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var THREE = AnimationUtilities.THREE;
var Time = AnimationUtilities.Time;
/**
 * @enum {string}
 */
var SensoryType = {
    AUDIO_LOCALIZATION: "AUDIO_LOCALIZATION",
    MOTION: "MOTION",
    VISION: "VISION",
    WAKE: "WAKE"
};
/**
 *
 * @param {SensoryType} type
 * @param {THREE.Vector3} position
 * @param {object} rawData
 * @param {Time} receivedAt
 * @param {Time} reportedTS
 * @param {?} [id]
 * @param {?number} [confidence]
 * @constructor
 */
var SensoryRecord = function (type, position, rawData, receivedAt, reportedTS, id, confidence) {
    /**
     * @type {SensoryType}
     */
    this.type = type;
    /**
     * @type {THREE.Vector3}
     */
    this.position = null;
    if (position != null) {
        this.position = position;
    }
    this.raw = rawData;
    /**
     * @type {Time}
     */
    this.receivedAt = receivedAt;
    /**
     * @type {Time}
     */
    this.reportedTS = reportedTS;
    /**
     * @type {?}
     */
    this.id = id;
    /**
     * @type {?number}
     */
    this.confidence = confidence;
};
SensoryRecord.SensoryType = SensoryType;
/**
 * @param json data for sensory record
 * @returns {SensoryRecord}
 */
SensoryRecord.createFromJSON = function (json) {
    var position = null;
    if (json.position != null) {
        position = new THREE.Vector3(json.position.x, json.position.y, json.position.z);
    }
    var receivedAt = null;
    if (json.receivedAt != null) {
        receivedAt = new Time(json.receivedAt._timestamp[0], json.receivedAt._timestamp[1]);
    }
    var reportedTS = null;
    if (json.reportedTS != null) {
        reportedTS = new Time(json.reportedTS._timestamp[0], json.reportedTS._timestamp[1]);
    }
    return new SensoryRecord(json.type, position, json.raw, receivedAt, reportedTS, json.id, json.confidence);
};
module.exports = SensoryRecord;

},{"animation-utilities":undefined}],13:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var SensoryRecord = require("./SensoryRecord");
var VisionModalityHandler = require("./VisionModalityHandler");
var MotionModalityHandler = require("./MotionModalityHandler");
var AudioModalityHandler = require("./AudioModalityHandler");
var ALWakeModalityHandler = require("./ALWakeModalityHandler");
/** @interface SensoryListener */
/**
 * @function
 * @name SensoryListener#rawDataAdded
 * @param {SensoryRecord} rawRecord
 * @param {boolean} passedFilter
 */
/**
 *
 * @function
 * @name SensoryListener#notifyCurrentTracked
 * @param {TrackedSensory[]} allTrackedData
 */
/**
 *
 * @param {MotorMotionMonitor} motionTracker
 * @constructor
 */
var SensoryStore = function (motionTracker) {
    /**
     * Should be null if empty to allow skipping various loops during add/update
     * @type {SensoryListener[]}
     */
    this.sensoryListeners = null;
    /**
     * @type {MotorMotionMonitor}
     */
    this.motionTracker = motionTracker;
    /**
     * @type {Object.<SensoryType, ModalityHandler>}
     */
    this.modalityHanders = {};
    this.modalityHanders[SensoryRecord.SensoryType.AUDIO_LOCALIZATION] = new AudioModalityHandler(motionTracker);
    this.modalityHanders[SensoryRecord.SensoryType.MOTION] = new MotionModalityHandler(motionTracker);
    this.modalityHanders[SensoryRecord.SensoryType.VISION] = new VisionModalityHandler(motionTracker);
    this.modalityHanders[SensoryRecord.SensoryType.WAKE] = new ALWakeModalityHandler(motionTracker);
};
SensoryStore.prototype.setDebug = function (debug) {
    var handlerTypes = Object.keys(this.modalityHanders);
    for (var i = 0; i < handlerTypes.length; i++) {
        this.modalityHanders[handlerTypes[i]].debug = debug;
    }
};
/**
 *
 * @param {SensoryListener} sensoryListener
 */
SensoryStore.prototype.addSensoryListener = function (sensoryListener) {
    if (this.sensoryListeners === null) {
        this.sensoryListeners = [];
    }
    if (this.sensoryListeners.indexOf(sensoryListener) < 0) {
        this.sensoryListeners.push(sensoryListener);
    }
};
/**
 *
 * @param {SensoryListener} sensoryListener
 */
SensoryStore.prototype.removeSensoryListener = function (sensoryListener) {
    if (this.sensoryListeners !== null) {
        var index = this.sensoryListeners.indexOf(sensoryListener);
        if (index >= 0) {
            this.sensoryListeners.splice(index, 1);
            if (this.sensoryListeners.length === 0) {
                this.sensoryListeners = null;
            }
        }
    }
};
/**
 *
 * @param {SensoryRecord} sensoryRecord
 */
SensoryStore.prototype.addData = function (sensoryRecord) {
    var handler = this.modalityHanders[sensoryRecord.type];
    var ok = false;
    if (handler != null) {
        ok = handler.isValid(sensoryRecord);
    }
    if (this.sensoryListeners !== null) {
        for (var i = 0; i < this.sensoryListeners.length; i++) {
            this.sensoryListeners[i].rawDataAdded(sensoryRecord, ok);
        }
    }
    if (ok) {
        handler.accept(sensoryRecord);
    }
};
SensoryStore.prototype.update = function () {
    var i;
    if (this.motionTracker != null) {
        this.motionTracker.update();
    }
    var modalityKeys = Object.keys(this.modalityHanders);
    var allTracked = [];
    for (i = 0; i < modalityKeys.length; i++) {
        this.modalityHanders[modalityKeys[i]].update();
        if (this.sensoryListeners !== null) {
            allTracked = allTracked.concat(this.modalityHanders[modalityKeys[i]].getTracked());
        }
    }
    if (this.sensoryListeners != null) {
        for (i = 0; i < this.sensoryListeners.length; i++) {
            this.sensoryListeners[i].notifyCurrentTracked(allTracked);
        }
    }
};
/**
 *
 * @param {SensoryType} [modality] only data from provided modality if present
 */
SensoryStore.prototype.getTracked = function (modality) {
    if (modality == null) {
        var allTracked = [];
        var modalityKeys = Object.keys(this.modalityHanders);
        for (var i = 0; i < modalityKeys.length; i++) {
            allTracked = allTracked.concat(this.modalityHanders[modalityKeys[i]].getTracked());
        }
        return allTracked;
    }
    else {
        return this.modalityHanders[modality].getTracked();
    }
};
/**
 * @param {SensoryType} [modality] clear data from the given modality; if unspecified, clear all data
 */
SensoryStore.prototype.clearTracked = function (modality) {
    if (modality === null || modality === undefined) {
        var modalityKeys = Object.keys(this.modalityHanders);
        for (var i = 0; i < modalityKeys.length; i++) {
            this.modalityHanders[modalityKeys[i]].clearTracked();
        }
    }
    else {
        this.modalityHanders[modality].clearTracked();
    }
};
module.exports = SensoryStore;

},{"./ALWakeModalityHandler":1,"./AudioModalityHandler":7,"./MotionModalityHandler":10,"./SensoryRecord":12,"./VisionModalityHandler":16}],14:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var SimpleAnimGenerator = {
    channelFromValue: function (dofName, value) {
        return {
            "dofName": dofName,
            "times": [
                0.0
            ],
            "values": [
                value
            ],
            "length": 0.1
        };
    },
    animFromColor: function (name, r, g, b, dofPrefix) {
        dofPrefix = dofPrefix || "eye";
        return {
            "header": {
                "fileType": "DOFAnimation",
                "version": "0.002",
                "creationTime": new Date().getTime()
            },
            "content": {
                "name": name,
                "channels": [
                    SimpleAnimGenerator.channelFromValue(dofPrefix + "_redChannelBn_r", r),
                    SimpleAnimGenerator.channelFromValue(dofPrefix + "_greenChannelBn_r", g),
                    SimpleAnimGenerator.channelFromValue(dofPrefix + "_blueChannelBn_r", b)
                ]
            }
        };
    },
    animFromColorAndScale: function (name, r, g, b, scale, robotInfo) {
        /**
         * @type {Object.<string, Object>}
         */
        var defaultVals = robotInfo.getDefaultDOFValues();
        /**
         * @type {string[]}
         */
        var eyeDeformerNames = robotInfo.getDOFSet("EYE_DEFORM").getDOFs();
        var channels = [
            SimpleAnimGenerator.channelFromValue("eye_redChannelBn_r", r),
            SimpleAnimGenerator.channelFromValue("eye_greenChannelBn_r", g),
            SimpleAnimGenerator.channelFromValue("eye_blueChannelBn_r", b)
        ];
        for (var i = 0; i < eyeDeformerNames.length; i++) {
            var dofName = eyeDeformerNames[i];
            channels.push(SimpleAnimGenerator.channelFromValue(dofName, defaultVals[dofName] * scale));
        }
        return {
            "header": {
                "fileType": "DOFAnimation",
                "version": "0.002",
                "creationTime": new Date().getTime()
            },
            "content": {
                "name": name,
                "channels": channels
            }
        };
    },
    animFromAlphaAndScale: function (name, a, scale, robotInfo) {
        /**
         * @type {Object.<string, Object>}
         */
        var defaultVals = robotInfo.getDefaultDOFValues();
        /**
         * @type {string[]}
         */
        var eyeDeformerNames = robotInfo.getDOFSet("EYE_DEFORM").getDOFs();
        var channels = [
            SimpleAnimGenerator.channelFromValue("eye_alphaChannelBn_r", a)
        ];
        for (var i = 0; i < eyeDeformerNames.length; i++) {
            var dofName = eyeDeformerNames[i];
            channels.push(SimpleAnimGenerator.channelFromValue(dofName, defaultVals[dofName] * scale));
        }
        return {
            "header": {
                "fileType": "DOFAnimation",
                "version": "0.002",
                "creationTime": new Date().getTime()
            },
            "content": {
                "name": name,
                "channels": channels
            }
        };
    }
};
module.exports = SimpleAnimGenerator;

},{}],15:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Clock = AnimationUtilities.Clock;
var THREE = AnimationUtilities.THREE;
var TrackedSensory = function (type) {
    /**
     * @type {SensoryType}
     */
    this.type = type;
    /**
     * @type {THREE.Vector3}
     */
    this.position = null;
    /**
     * @type {THREE.Vector3}
     */
    this.fastPosition = null;
    /**
     * @type {Time}
     */
    this.creationTime = Clock.currentTime();
    /**
     * @type {Time}
     */
    this.lastIncorporatedReport = null;
    /**
     * @type {number}
     */
    this.slowFilter = 0.05;
    /**
     * @type {number}
     */
    this.fastFilter = 0.2;
    /**
     * @type {number}
     */
    this.matches = 0;
};
TrackedSensory.prototype.incorporateSensorReport = function (sensorReport) {
    if (this.position === null) {
        this.position = new THREE.Vector3().copy(sensorReport.position);
    }
    else {
        this.position.lerp(sensorReport.position, this.slowFilter);
    }
    if (this.fastPosition === null) {
        this.fastPosition = new THREE.Vector3().copy(sensorReport.position);
    }
    else {
        this.fastPosition.lerp(sensorReport.position, this.fastFilter);
    }
    this.lastIncorporatedReport = Clock.currentTime();
    this.matches++;
};
module.exports = TrackedSensory;

},{"animation-utilities":undefined}],16:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Time = AnimationUtilities.Time;
var Bakery = AnimationUtilities.ui.Bakery;
var ModalityHandler = require("./ModalityHandler");
var TrackedSensory = require("./TrackedSensory");
var SensoryRecord = require("./SensoryRecord");
var THREE = AnimationUtilities.THREE;
/**
 *
 * @param {MotorMotionMonitor} motionTracker
 * @constructor
 * @extends ModalityHandler
 */
var VisionModalityHandler = function (motionTracker) {
    ModalityHandler.call(this);
    /**
     * @type {MotorMotionMonitor}
     */
    this.motionTracker = motionTracker;
    /**
     * @type {number}
     */
    this.confidenceThreshold = 0.3;
    /**
     * @type {number}
     */
    this.distanceThreshold = 0.0;
};
VisionModalityHandler.prototype = Object.create(ModalityHandler.prototype);
VisionModalityHandler.prototype.constructor = VisionModalityHandler;
/**
 * @param {SensoryRecord} sensoryRecord
 * @returns {boolean}
 * @override
 */
VisionModalityHandler.prototype.isValid = function (sensoryRecord) {
    var r = sensoryRecord.raw;
    if (sensoryRecord.confidence < Bakery.getFloat("Confidence Threshold (Face)", 0, 1, this.confidenceThreshold, "SensoryFilters")) {
        return false;
    }
    var rejectMovingData = Bakery.getBoolean("Reject face data during motion", false, "SensoryFilters");
    var rejectMovingDataRecoveryTime = Bakery.getFloat("Reject moving face data recovery time", 0, 2, 0.7, "SensoryFilters");
    if (rejectMovingData && this.motionTracker.timeSinceMoving() < rejectMovingDataRecoveryTime) {
        return false;
    }
    //seem to have a ray only if currently being tracked.
    var ray = null;
    var rect = null;
    /** @type {Time} */
    var trackerUpdateTimestamp = null;
    /** @type {Time} */
    var detectionTimestamp = null;
    /** @type {boolean} */
    var inFOV = false;
    if (r.parts.length > 0) {
        var part = r.parts[0];
        if (part.value.rays.length > 0) {
            ray = part.value.rays[0];
        }
        if (part.value.trackers.length > 0) {
            var tracker = part.value.trackers[0];
            rect = tracker.rectangle;
            if (tracker.lastUpdate) {
                trackerUpdateTimestamp = Time.createFromTimestamp(tracker.lastUpdate);
            }
            inFOV = tracker.inFOV;
        }
        if (part.value.detections.length > 0) {
            var detection = part.value.detections[0];
            if (detection.timestamp) {
                detectionTimestamp = Time.createFromTimestamp(detection.timestamp);
            }
        }
    }
    if (!inFOV || !ray || !rect) {
        return false;
    }
    if (Bakery.getBoolean("Require Face Detection", false, "SensoryFilters")) {
        if (trackerUpdateTimestamp === null || detectionTimestamp === null) {
            return false;
        }
        else {
            var detectionAge = trackerUpdateTimestamp.subtract(detectionTimestamp);
            if (detectionAge > Bakery.getFloat("Max Face Detection Age", 0, 30, 15, "SensoryFilters")) {
                return false;
            }
        }
    }
    if (Bakery.getBoolean("Use Ray Instead of position", false, "SensoryFilters")) {
        var newPos = new THREE.Vector3(ray.origin.x, ray.origin.y, ray.origin.z);
        var d = new THREE.Vector3(ray.dir.x, ray.dir.y, ray.dir.z);
        d.multiplyScalar(2);
        newPos.add(d);
        sensoryRecord.position = newPos;
    }
    if (Bakery.getBoolean("Enforce Face Height", false, "SensoryFilters")) {
        var motionTrackerHeight = Math.abs(rect.top - rect.bottom);
        if (!(motionTrackerHeight > Bakery.getFloat("Min Height Face", 0, 500, 10, "SensoryFilters") &&
            motionTrackerHeight < Bakery.getFloat("Max Height Face", 0, 1000, 500, "SensoryFilters"))) {
            return false;
        }
    }
    sensoryRecord.position = this.adjustGaze(sensoryRecord.position, ray, rect, 1);
    return true;
};
/**
 * @param {THREE.Vector3} position
 * @param {Ray} ray
 * @param {Rectangle} rect
 * @param {number} fudgeFactor
 * @returns {THREE.Vector3} modified position
 *
 * Ray and Rectangle are from VisualAwareness.ts.

 * fudgeFactor can be any real number; the scale is calibrated like this:
 *  0: remain the center of the tracking rectangle
 * .5: adjust to halfway in-between the center and top
 *  1: adjust to the top of the tracking rectangle
*/
VisionModalityHandler.prototype.adjustGaze = function (position, ray, rect, fudgeFactor) {
    // Sometimes the rectangle which is supposed to track the face
    // also includes the chest, when exposed skin is visible
    // there.  Looking at the center of a head+chest rectangle can
    // be socially inappropriate, especially if the person is very
    // close to the robot.  It is possible that future
    // improvements to face tracking will reliably exclude chests,
    // but in the meantime this code adjusts Jibo's gaze toward
    // the top of the rectangle.  People generally don't notice if
    // someone is looking slightly above their eyes, especially if
    // far away, so hopefully any over-compensation will go
    // unnoticed.
    // 3D situation, Jibo and a person:
    //
    //   (    E  )                  F
    //  (       )                   P
    // (       )                   \C/
    // |       |                    |
    // |       |                   / \
    // |___O___|
    // 2D camera image
    // --------------------------------------      ^
    // |                                    |      |
    // |          ---------                 |      |
    // |          |  FACE |                 |      |
    // |          |       |                 |      |
    // |          |   X   |                 | verticalCameraPixels
    // |          | CHEST |                 |      |
    // |          |       |                 |      |
    // |          ---------                 |      |
    // |           ^rect                    |      |
    // |                                    |      |
    // --------------------------------------      V
    // 0,0 is upper left
    // E = Jibo eye (camera)
    // O = Origin of robot coordinate system
    // F = Actual face
    // C = Actual chest
    // P = Original position, the centroid of the
    //  "face" cube. (Cube boundares are set by "extent" in the
    //  sensoryRecord, but it is currently hard-coded to be .25m
    //  on all sides, and does not correlate with the 3D
    //  projection of rect).
    // X = center of rect, 2D equivalent of P
    // 2D data in camera coordinates:
    // * rect: Corners of the box where the face (and possibly
    //   chest) is seen in the 2D coordinates of the camera image.
    // 3D data in robot coordinates:
    // * position: Vector from O to P.  The output of this function is
    //   P' (not shown), which is slightly higher than P and hopefully
    //   close enough to Face and far enough from Chest to be socially
    //   appropriate without noticeably looking over the person's
    //   head.
    // * ray: ray.origin is the vector O to E (camera location).
    //   ray.dir (rayDirection) is a unit vector pointing from E to P.
    //   The length of the ray is meaningless; depth info must be
    //   recovered from position,
    // STEP 1.  Figure out the angle we need to adjust upward.
    // This is based on the 2D rectangle in camera coordinates
    // that the tracking blob sees.  We don't need to know the
    // distance away the tracked entity is to determine the angle.
    // We know how wide of an angle the field of view of the
    // camera is, and we can just use the appropriate proportion.
    // These are not available in the sensoryRecord, but this hack
    // is temporary so just hard-wiring for now.
    const verticalCameraAngle = 0.86;
    // 0.86 radians, determined empirically by Jesse and Matt Berlin,
    // because the numbers reported on-robot seem to be incorrect.
    const verticalCameraPixels = 360;
    let rectangleVerticalPixels = Math.abs(rect.top - rect.bottom);
    let correctiveCameraRatio = rectangleVerticalPixels / verticalCameraPixels;
    // .5 is because we're going from the center of the 2D
    // rectangle to the top, instead of the bottom to the top
    // (cutting the rectangle in half).
    let correctiveAngle = correctiveCameraRatio * verticalCameraAngle * fudgeFactor * .5;
    // STEP 2.  Apply this angle to position.  (In code elsewhere,
    // position is used for pointing Jibo's head but rays are
    // ignored, which is why we're not bothering to return those.)
    let worldUp = new THREE.Vector3(0, 0, 1);
    let localRight = new THREE.Vector3().copy(ray.dir);
    // .cross() modifies in place!
    localRight = localRight.cross(worldUp);
    if (localRight.lengthSq() < 0.0001) {
        // ray is straight up; this is a bit of a pathological case
        // and we don't need to adjust Jibo's gaze.
        return position;
    }
    localRight.normalize();
    // Make a Quaternion that describes the desired rotation
    let rotateUp = new THREE.Quaternion().setFromAxisAngle(localRight, correctiveAngle);
    // Rotate the ray direction upwards
    let newRay = new THREE.Vector3().copy(ray.dir).applyQuaternion(rotateUp);
    // Recalculate "position" by adding the vector from robot zero
    // to the camera ("ray" origin) to the vector that is the
    // adjusted "ray" direction scaled to the distance from the
    // robot origin to the original position.  Holding this
    // distance constant means "position" moves along the sphere
    // of points equidistant from the camera.  This moves the x-y
    // "on the ground" coordinates of the face slightly, which is
    // incorrect if they are standing straight up and down but
    // more accurate if they are leaning forward.  But the "on the
    // ground" position was uncertain anyway and most importantly
    // irrelevant for pointing Jibo's head, which is the only
    // thing we expect the adjusted direction to be used for.
    let rayOrigin = new THREE.Vector3().copy(ray.origin);
    let targetDistance = position.clone().sub(rayOrigin).length();
    newRay.setLength(targetDistance);
    let newPosition = newRay.add(rayOrigin);
    return newPosition;
};
/**
 * @param {SensoryRecord} sensoryRecord
 * @override
 */
VisionModalityHandler.prototype.accept = function (sensoryRecord) {
    /**
     * @type {TrackedSensory}
     */
    var matching = null;
    var i;
    for (i = 0; i < this.tracked.length; i++) {
        if (this.tracked[i].id === sensoryRecord.id) {
            matching = this.tracked[i];
            break;
        }
    }
    this.distanceThreshold = Bakery.getFloat("Distance Threshold (Face)", 0, 1, this.distanceThreshold, "SensoryFilters");
    if (matching === null) {
        for (i = 0; i < this.tracked.length; i++) {
            if (this.tracked[i].position.distanceTo(sensoryRecord.position) < this.distanceThreshold) {
                matching = this.tracked[i];
                break;
            }
        }
    }
    if (matching == null) {
        matching = new TrackedSensory(SensoryRecord.SensoryType.VISION);
        matching.id = sensoryRecord.id;
        this.tracked.push(matching);
    }
    matching.slowFilter = Bakery.getFloat("Slow Filter (Face)", 0, 1, 1, "SensoryFilters");
    matching.fastFilter = Bakery.getFloat("Fast Filter (Face)", 0, 1, 1, "SensoryFilters");
    matching.incorporateSensorReport(sensoryRecord);
    matching.id = sensoryRecord.id;
};
module.exports = VisionModalityHandler;

},{"./ModalityHandler":9,"./SensoryRecord":12,"./TrackedSensory":15,"animation-utilities":undefined}],17:[function(require,module,exports){
/**
 * @author jg
 */
"use strict";
/**
 * @description Result object for the attend to target command.
 * @typedef {Object} jibo.attention.AttendHandle~AttendResult
 * @property {jibo.attention.ResultStatus} status - The result of the command.
 */
/**
 * Cancellable handle for the attend to target command.
 * @class AttendHandle
 * @memberof jibo.attention
 */
var AttendHandle = function () {
    /**
     * @description The promise which will resolve when the command completes or is cancelled/interrupted.
     * @name jibo.attention.AttendHandle#promise
     * @type {Promise<jibo.attention.AttendHandle~AttendResult>}
     */
    this.promise = null;
    /**
     * @description The result of the command, which will be null until the promise resolves.
     * @name jibo.attention.AttendHandle#result
     * @type {jibo.attention.AttendHandle~AttendResult}
     */
    this.result = null;
};
/**
 * Cancel the command if it is still in progress.
 * The promise will resolve with status "CANCELLED".
 * @method jibo.attention.AttendHandle#cancel
 */
AttendHandle.prototype.cancel = function () {
};
module.exports = AttendHandle;

},{}],18:[function(require,module,exports){
/**
 * @author jg
 */
"use strict";
/**
 * @description Result object for the await face command.
 * @typedef {Object} jibo.attention.AwaitFaceHandle~AwaitFaceResult
 * @property {jibo.attention.ResultStatus} status - The result of the command.
 * @property {?} entity - Entity of face if status is SUCCEEDED.
 * @property {THREE.Vector3} position - Position of face if status is SUCCEEDED.
 * @property {number} angle - Total angle offset from current forward to face if status is SUCCEEDED.
 */
/**
 * Cancellable handle for the await face command.
 * @class AwaitFaceHandle
 * @memberof jibo.attention
 */
var AwaitFaceHandle = function () {
    /**
     * @description The promise which will resolve when the command completes, times out, or is otherwise interrupted.
     * @name jibo.attention.AwaitFaceHandle#promise
     * @type {Promise<jibo.attention.AwaitFaceHandle~AwaitFaceResult>}
     */
    this.promise = null;
    /**
     * @description The result of the command, which will be null until the promise resolves.
     * @name jibo.attention.AwaitFaceHandle#result
     * @type {jibo.attention.AwaitFaceHandle~AwaitFaceResult}
     */
    this.result = null;
};
/**
 * Cancel the command if it is still in progress.
 * The promise will resolve with status "CANCELLED".
 * @method jibo.attention.AwaitFaceHandle#cancel
 */
AwaitFaceHandle.prototype.cancel = function () {
};
module.exports = AwaitFaceHandle;

},{}],19:[function(require,module,exports){
/**
 * @author jg
 */
"use strict";
var AwaitFaceHandle = require("./AwaitFaceHandle");
var ResultStatus = require("./ResultStatus");
var AnimationUtilities = require("animation-utilities");
var slog = AnimationUtilities.slog;
/**
 *
 * @param {Time} currentTime
 * @param {number} timeout
 * @param {number} maxAngle
 * @param {number} fullSearchTime
 * @param {AnimationUtilities} animate
 * @param {LPSConnection} lpsConnection
 * @param {boolean} doDemandDetect
 * @param {boolean} timeoutEarlyIfDemandFindsNoFaces
 * @constructor
 */
var FaceAwaiter = function (currentTime, timeout, maxAngle, fullSearchTime, animate, lpsConnection, doDemandDetect, timeoutEarlyIfDemandFindsNoFaces) {
    /**
     * @type {Time}
     * @private
     */
    this._startTime = currentTime;
    /**
     * @type {number}
     * @private
     */
    this._timeout = timeout;
    /**
     * @type {number}
     * @private
     */
    this._maxAngle = maxAngle;
    /**
     * @type {number}
     * @private
     */
    this._fullSearchTime = fullSearchTime;
    /**
     * @type {AnimationUtilities}
     * @private
     */
    this._animate = animate;
    /**
     * @type {LPSConnection}
     * @private
     */
    this._lpsConnection = lpsConnection;
    /**
     * @type {number}
     * @private
     */
    this._minRecency = 0.1;
    /**
     * @type {boolean}
     * @private
     */
    this._timeoutImmediatelyIfDemandFindsNoone = timeoutEarlyIfDemandFindsNoFaces;
    /**
     * @type {boolean}
     * @private
     */
    this._doDemandDetect = doDemandDetect;
    /**
     * @type {boolean}
     * @private
     */
    this._demandFacesFoundNoFaces = false;
    /**
     * @type {function}
     * @private
     */
    this._promiseResolve = null;
    /**
     * @type {jibo.attention.AwaitFaceHandle}
     * @private
     */
    this._awaitHandle = new AwaitFaceHandle();
    this._awaitHandle.promise = new Promise((resolve, reject) => {
        this._promiseResolve = resolve;
    });
    this._awaitHandle.cancel = () => {
        this.resolveCompletion(ResultStatus.CANCELLED, null, null, null);
    };
};
/**
 *
 * @param {ResultStatus} status
 * @param {?} entity
 * @param {?THREE.Vector3} position
 * @param {?number} angle
 */
FaceAwaiter.prototype.resolveCompletion = function (status, entity, position, angle) {
    if (this._awaitHandle != null) {
        var result = { status: status, entity: entity, position: position, angle: angle };
        var handle = this._awaitHandle;
        this._awaitHandle = null;
        handle.result = result;
        this._promiseResolve(result);
        this._promiseResolve = null;
    }
};
/**
 * @return {jibo.attention.AwaitFaceHandle}
 */
FaceAwaiter.prototype.getHandle = function () {
    return this._awaitHandle;
};
/**
 * @param {PerceptionState} perceptionState
 * @param {Time} currentTime
 * @return {boolean} true to keep active, false to cull (this awaiter is done, does not need more updates)
 */
FaceAwaiter.prototype.update = function (currentTime, perceptionState) {
    if (this._awaitHandle === null) {
        return false;
    }
    var kinematicFeatures = this._animate.getKinematicFeatures();
    var eyePos = kinematicFeatures["Eye"].position;
    var eyeDir = kinematicFeatures["Eye"].direction;
    var enforceMaxAngle = this._maxAngle !== 0;
    var currentMaxAngle = this._maxAngle;
    if (enforceMaxAngle && this._fullSearchTime > 0) {
        var alpha = Math.max(0, Math.min(1, currentTime.subtract(this._startTime) / this._fullSearchTime));
        currentMaxAngle = this._maxAngle * alpha;
    }
    var faces = perceptionState.trackedFaces;
    /** @type {TrackedSensory} */
    var winningFace = null;
    /** @type {Number} */
    var winningFaceAngle = Number.MAX_VALUE;
    for (var i = 0; i < faces.length; i++) {
        var face = faces[i];
        //check validity of recency
        if (currentTime.subtract(face.lastIncorporatedReport) > this._minRecency) {
            continue;
        }
        //check validity of angle
        var angle = face.position.clone().sub(eyePos).angleTo(eyeDir);
        if (enforceMaxAngle && angle > currentMaxAngle) {
            continue;
        }
        if (angle < winningFaceAngle) {
            winningFace = face;
            winningFaceAngle = angle;
        }
    }
    if (winningFace !== null) {
        var entity = { id: winningFace.id, position: winningFace.position.clone() };
        this.resolveCompletion(ResultStatus.SUCCEEDED, entity, winningFace.position.clone(), winningFaceAngle);
        return false;
    }
    else if (currentTime.subtract(this._startTime) > this._timeout) {
        this.resolveCompletion(ResultStatus.TIMEOUT, null, null, null);
        return false;
    }
    else if (this._timeoutImmediatelyIfDemandFindsNoone && this._demandFacesFoundNoFaces) {
        slog("ATTENTION", "Exiting await-face with timeout at dt " + currentTime.subtract(this._startTime) + " < timeout " + this._timeout + " because demandFaces found no faces");
        this.resolveCompletion(ResultStatus.TIMEOUT, null, null, null);
        return false;
    }
    if (this._timeout > 0.5 && this._doDemandDetect === true && this._lpsConnection !== null) {
        this._doDemandDetect = false;
        this._lpsConnection.demandFaceDetect((numFacesDetected) => {
            slog("ATTENTION", "Demand Face Detect found " + numFacesDetected + " faces");
            if (numFacesDetected === 0) {
                this._demandFacesFoundNoFaces = true;
            }
        });
    }
    return true;
};
module.exports = FaceAwaiter;

},{"./AwaitFaceHandle":18,"./ResultStatus":21,"animation-utilities":undefined}],20:[function(require,module,exports){
/**
 * @author jg
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var slog = AnimationUtilities.slog;
/**
 * @param {object} lps - jibo LPS service
 */
var LPSConnection = function (lps) {
    this.lps = lps;
};
// var sendRequest = function(url, data, listener){
// 	var request = new XMLHttpRequest();
// 	request.open("POST", url, true); // true === async
// 	// force it to be form data type and accepts all media
// 	request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
// 	request.setRequestHeader('Accept', '*/*');
// 	request.onreadystatechange = () => {
// 		// console.log("request.readyState|status = " + request.readyState + " | " + request.status);
// 		// request is complete
// 		if(request.readyState === 4) {
// 			// "OK" status
// 			if(request.status === 200) {
// 				if (request.response) {
// 					// success!
// 					let response = JSON.parse(request.response);
// 					listener(null, response);
// 					// console.log("Got response (XMLHTTP)")
// 				}
// 				else {
// 					listener('No data received lps service', null);
// 				}
// 			}
// 			else {
// 				// failure if anything else
// 				let msg = 'LPS service unavailable';
// 				if(request.statusText !== undefined && request.statusText !== "") {
// 					msg = request.statusText;
// 				}
// 				listener(msg, null);
// 			}
// 		}
// 	};
// 	//console.log("Sending POST request (XMLHTTP)");
// 	request.send(JSON.stringify(data));
// };
/**
 * @callback jibo.attention#FaceDetectDemandCallback
 * @param {number} detections (-1 on error)
 * @intdocs
 */
/**
 *
 * @param {jibo.attention#FaceDetectDemandCallback} resultHandler
 * @intdocs
 */
LPSConnection.prototype.demandFaceDetect = function (resultHandler) {
    this.lps.demandDetect(0, false, (err, res) => {
        if (err) {
            slog("ATTENTION", "Error during 'jibo.lps.demandDetect': " + err);
            resultHandler(-1);
        }
        else {
            resultHandler(res);
        }
    });
};
module.exports = LPSConnection;

},{"animation-utilities":undefined}],21:[function(require,module,exports){
/**
 * @author jg
 */
"use strict";
/**
 * @description Enum of result statuses.
 * @name jibo.attention.ResultStatus
 * @type Enum
 * @property {string} SUCCEEDED - Command succeeded.
 * @property {string} TIMEOUT - Command timeout exceeded.
 * @property {string} INTERRUPTED - Command interrupted.
 * @property {string} CANCELLED - Command cancelled by issuer.
 */
var ResultStatus = {
    SUCCEEDED: "SUCCEEDED",
    TIMEOUT: "TIMEOUT",
    INTERRUPTED: "INTERRUPTED",
    CANCELLED: "CANCELLED"
};
module.exports = ResultStatus;

},{}],22:[function(require,module,exports){
/**
 * @author jg
 */
"use strict";
/**
 * An iterator that provides a sequence of search targets.
 * @class SearchIterator
 * @memberof jibo.attention
 */
var SearchIterator = function () {
};
/**
 * Get the next target in the search.
 * @method jibo.attention.SearchIterator#nextTarget
 * @return {THREE.Vector3} The next target, or null if there are no more targets.
 */
SearchIterator.prototype.nextTarget = function () {
};
module.exports = SearchIterator;

},{}],23:[function(require,module,exports){
/**
 * @author jg
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var THREE = AnimationUtilities.THREE;
var slog = AnimationUtilities.slog;
var SearchIterator = require("./SearchIterator");
var CHANNEL = "ATTENTION";
/**
 *
 * @param {THREE.Vector3} currentTarget
 * @constructor
 * @extends jibo.attention.SearchIterator
 */
var TridentSearchIterator = function (currentTarget) {
    SearchIterator.call(this);
    /**
     * @type {THREE.Vector3}
     * @private
     */
    this._initialTarget = currentTarget;
    /**
     * @type {number}
     * @private
     */
    this._targetNumber = 0;
};
TridentSearchIterator.prototype = Object.create(SearchIterator.prototype);
TridentSearchIterator.prototype.constructor = TridentSearchIterator;
/**
 * @override
 * @return THREE.Vector3
 */
TridentSearchIterator.prototype.nextTarget = function () {
    //start with initialTargetFlat
    var newTarget = this._initialTarget.clone().projectOnPlane(new THREE.Vector3(0, 0, 1));
    //let's have it be at 2m
    newTarget.setLength(2);
    var angle = 0;
    if (this._targetNumber % 4 === 0) {
        angle = Math.PI / 4.8;
    }
    else if (this._targetNumber % 4 === 1) {
        angle = -Math.PI / 4.8;
    }
    else if (this._targetNumber % 4 === 2) {
        angle = -Math.PI;
    }
    else if (this._targetNumber % 4 === 3) {
        angle = 0;
    }
    var rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
    //rotate by 120
    newTarget.applyQuaternion(rotation);
    //random height
    var height = (Math.random() * 0.4) + 0.7;
    newTarget.add(new THREE.Vector3(0, 0, height));
    slog(CHANNEL, "Trident iterator returning target (" + newTarget.x + ", " + newTarget.y + ", " + newTarget.z + "), started (" + this._initialTarget.x + ", " + this._initialTarget.y + ", " + this._initialTarget.z + "), num " + this._targetNumber);
    this._targetNumber++;
    return newTarget;
};
module.exports = TridentSearchIterator;

},{"./SearchIterator":22,"animation-utilities":undefined}],24:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var AttentionLog = {};
/**
 * Logging function returned by createLog; pass it JSON'able objects to log
 * @callback AttentionLog~loggingFunction
 * @param {object} info to log - will be JSON'ified
 */
/**
 * Callback to accept an entire log (as array) when logs read in through loadLog
 * @callback AttentionLog~logAcceptor
 * @param {object[]} log data read in
 */
/**
 * @param {string} filename
 * @return {loggingFunction}
 */
AttentionLog.createLog = function (filename) {
    var fs = "fs";
    fs = require(fs);
    var attentionStream = fs.createWriteStream(filename);
    var first = true;
    return function (info) {
        if (first) {
            first = false;
        }
        else {
            attentionStream.write(",\n");
        }
        attentionStream.write(JSON.stringify(info));
    };
};
/**
 * @param {string} filename
 * @param {logAcceptor} cb
 */
AttentionLog.loadLog = function (filename, cb) {
    var FileTools = AnimationUtilities.core.FileTools;
    FileTools.loadText(filename, function (error, data) {
        if (error) {
            cb(error, null);
        }
        else {
            var infoArray = null;
            try {
                var infoString = "[" + data + "]";
                infoArray = JSON.parse(infoString);
            }
            catch (e) {
                cb(e, null);
            }
            cb(null, infoArray);
        }
    });
};
module.exports = AttentionLog;

},{"animation-utilities":undefined}],25:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var SensoryLogger = require("./SensoryLogger");
var SensoryLogDataSource = require("./SensoryLogDataSource");
/**
 * @param {SensoryStore} sensoryStore
 * @constructor
 */
var SensoryLogController = function (sensoryStore) {
    /**
     * @type {SensoryStore}
     * @private
     */
    this._sensoryStore = sensoryStore;
    /**
     * @type {boolean}
     * @private
     */
    this._blockLiveData = false;
    /**
     *
     * @type {?SensoryLogger}
     * @private
     */
    this._sensoryLogger = new SensoryLogger(sensoryStore);
    /**
     *
     * @type {?SensoryLogDataSource}
     * @private
     */
    this._sensoryLogDataSource = new SensoryLogDataSource();
    /**
     * @type {boolean}
     * @private
     */
    this._respectFilter = false;
    /**
     * Used to block live data always during play time regardless of permanent blockLiveData flag
     * @type {boolean}
     * @private
     */
    this._isPlaying = false;
};
/**
 * @param {string} filename
 */
SensoryLogController.prototype.startLogging = function (filename) {
    this._sensoryLogger.startLogging(filename);
};
SensoryLogController.prototype.stopLogging = function () {
    this._sensoryLogger.stopLogging();
};
SensoryLogController.prototype.startPlayingLog = function (filename) {
    this._sensoryLogDataSource.playLog(filename);
};
SensoryLogController.prototype.stopPlayingLog = function () {
    this._sensoryLogDataSource.stop();
};
/**
 * @param {boolean} block
 */
SensoryLogController.prototype.setBlockLiveData = function (block) {
    this._blockLiveData = block;
};
/**
 * @returns {boolean}
 */
SensoryLogController.prototype.getBlockLiveData = function () {
    return this._blockLiveData || this._isPlaying;
};
/**
 * @returns {?PlayingStatus}
 */
SensoryLogController.prototype.getLogPlaybackStatus = function () {
    return this._sensoryLogDataSource.getPlayStatus();
};
SensoryLogController.prototype.update = function () {
    /**
     * @type {?PlayingStatus}
     */
    var playStatus = this._sensoryLogDataSource.getPlayStatus();
    if (playStatus !== null && playStatus.playing) {
        this._isPlaying = true;
        /** @type {SensoryRecord[]} */
        var newRecords = this._sensoryLogDataSource.getNewRecords(this._respectFilter);
        if (newRecords !== null && newRecords.length > 0) {
            for (var i = 0; i < newRecords.length; i++) {
                this._sensoryStore.addData(newRecords[i]);
            }
        }
    }
    else {
        this._isPlaying = false;
    }
};
module.exports = SensoryLogController;

},{"./SensoryLogDataSource":26,"./SensoryLogger":27}],26:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AttentionLog = require("./AttentionLog");
var SensoryRecord = require("../SensoryRecord");
var Clock = require("animation-utilities").Clock;
/**
 * Record describing a recorded sensory record
 * @typedef {object} RecordedSensoryRecord
 * @property {SensoryRecord} record
 * @property {boolean} passedFilter
 * @property {Time} originalReceiptTime - starts at record.receivedAt; kept seperately because we will modify record.receivedAt to fit current timescale
 */
/**
 * Description of current playing status
 * @typedef {object} PlayingStatus
 * @property {boolean} playing - true if playing, false if not playing
 * @property {string} logFileName - name of filename being played
 * @property {number} time - current play time (seconds relative to log start)
 * @property {number} duration - duration of log
 */
/**
 * Loads a sensory log and can present its data iteratively at real-time speed.
 * First call "playLog" with a filename to load, then every update call getNewRecords()
 * to retrieve the records that should be played since the last call.  Each record
 * will only be returned once.  The records will have their "receivedAt" time
 * modified to be in the "live" clock timebase.
 *
 * @constructor
 */
var SensoryLogDataSource = function () {
    /**
     * @type {?RecordedSensoryRecord[]}
     * @private
     */
    this._logData = null;
    /**
     * @type {?string}
     * @private
     */
    this._logFileName = null;
    /**
     * @type {?Time}
     * @private
     */
    this._recordedDataStartTime = null;
    /**
     * @type {?Time}
     * @private
     */
    this._recordedDataEndTime = null;
    /**
     * In current "live" timebase, the time the current playback started
     * @type {?Time}
     * @private
     */
    this._playStartTime = null;
    /**
     * Corresponds with _indexForCachedTime to speed up searching for sequential data.  In timebase of recording.
     * @type {?Time}
     * @private
     */
    this._cachedTime = null;
    /**
     * @type {number}
     * @private
     */
    this._indexForCachedTime = 0;
    /**
     * For iterative reading (getNewRecords()), track time of last read so we know what the new interval is.  Time is in current "live" timebase
     * @type {?Time}
     * @private
     */
    this._lastIterativeReadTime = null;
};
SensoryLogDataSource.prototype.resetState = function () {
    this._logData = null;
    this._recordedDataStartTime = null;
    this._recordedDataEndTime = null;
    this._playStartTime = null;
    this._cachedTime = null;
    this._indexForCachedTime = 0;
    this._lastIterativeReadTime = null;
    this._logFileName = null;
};
SensoryLogDataSource.prototype.playLog = function (filename) {
    var self = this;
    /*
     * @param {{record:object, passedFilter:boolean}[]} logData
     */
    var logAcceptor = function (error, logData) {
        //clear out old data either way
        self.resetState();
        if (error !== null) {
            console.log("SensoryLogDataSource:Error loading log \"" + filename + "\": " + error);
        }
        else {
            if (logData != null && logData.length > 0) {
                self._logData = [];
                for (var i = 0; i < logData.length; i++) {
                    var sensoryJSON = logData[i];
                    /** @type {SensoryRecord} */
                    var sr = SensoryRecord.createFromJSON(sensoryJSON.record);
                    self._logData.push({
                        record: sr,
                        passedFilter: sensoryJSON.passedFilter,
                        originalReceiptTime: sr.receivedAt
                    });
                }
                self._recordedDataStartTime = self._logData[0].record.receivedAt;
                self._recordedDataEndTime = self._logData[self._logData.length - 1].record.receivedAt;
                self._playStartTime = Clock.currentTime();
                self._lastIterativeReadTime = self._playStartTime;
                self._logFileName = filename;
                console.log("SensoryLogDataSource:Starting to play a log of length " + self._recordedDataEndTime.subtract(self._recordedDataStartTime));
            }
            else {
                console.log("SensoryLogDataSource:Not playing log (missing or 0 length) " + filename);
            }
        }
    };
    AttentionLog.loadLog(filename, logAcceptor);
};
SensoryLogDataSource.prototype.stop = function () {
    this.resetState();
};
/**
 * Get the name of the current log file being played.
 * @return {string} - name of current log file being played, null if none
 */
SensoryLogDataSource.prototype.getLogFileName = function () {
    return this._logFileName;
};
/**
 * Get the status of the log playback.
 * @return {?PlayingStatus} playing status, null if no log selected.
 */
SensoryLogDataSource.prototype.getPlayStatus = function () {
    if (this._logFileName !== null) {
        var time = this._lastIterativeReadTime.subtract(this._playStartTime);
        var duration = this._recordedDataEndTime.subtract(this._recordedDataStartTime);
        return {
            time: time,
            duration: duration,
            logFileName: this._logFileName,
            playing: (duration > 0) && time < duration
        };
    }
    else {
        return null;
    }
};
/**
 * Return the index for the first record whose time is greater or equal to time.
 * Search starting from startingIndex.
 * @param {Time} time
 * @param {number} startingIndex
 * @param {RecordedSensoryRecord[]} records
 * @return {number} return the index or -1 if none found
 */
var indexForTimeSearchForward = function (time, startingIndex, records) {
    for (var i = startingIndex; i < records.length; i++) {
        if (records[i].originalReceiptTime.isGreaterOrEqual(time)) {
            return i;
        }
    }
    return -1;
};
/**
 * @param {Time} oldStartTime
 * @param {Time} newStartTime
 * @param {RecordedSensoryRecord[]} inplaceRecords
 */
var convertTimeBase = function (oldStartTime, newStartTime, inplaceRecords) {
    for (var i = 0; i < inplaceRecords.length; i++) {
        inplaceRecords[i].record.receivedAt = newStartTime.add(inplaceRecords[i].originalReceiptTime.subtract(oldStartTime));
    }
};
/**
 * Get the records in this time range (range of original times, ie recording time)
 * @param {Time} startTime - start time of range, inclusive
 * @param {Time} endTime - end time of range, exclusive
 * @return {RecordedSensoryRecord[]}
 */
SensoryLogDataSource.prototype.getRecordsInTimeRange = function (startTime, endTime) {
    if (this._logData !== null) {
        var startFromIndex = 0;
        //use cached index if it works
        if (this._cachedTime !== null && startTime.isGreaterOrEqual(this._cachedTime)) {
            startFromIndex = this._indexForCachedTime;
        }
        else {
            console.log("Need to do full search for time " + startTime + ", is not greater than cached " + this._cachedTime);
        }
        var foundIndex = indexForTimeSearchForward(startTime, startFromIndex, this._logData);
        if (foundIndex !== -1) {
            /**
             * @type {RecordedSensoryRecord[]}
             */
            var matching = [];
            for (var i = foundIndex; i < this._logData.length; i++) {
                if (endTime.isGreater(this._logData[i].originalReceiptTime)) {
                    matching.push(this._logData[i]);
                    //console.log("\tAdding "+this._logData[i].originalReceiptTime);
                    //advance our cache for next time
                    this._cachedTime = this._logData[i].originalReceiptTime;
                    this._indexForCachedTime = i;
                }
                else {
                    break;
                }
            }
            return matching;
        }
    }
    return null;
};
/**
 *
 * @param {boolean} respectFilter
 * @returns {SensoryRecord[]}
 */
SensoryLogDataSource.prototype.getNewRecords = function (respectFilter) {
    if (this._logData !== null) {
        let curTime = Clock.currentTime();
        //delta to start of interval
        var deltaToStart = this._lastIterativeReadTime.subtract(this._playStartTime);
        //delta to end of interval
        var deltaToEnd = curTime.subtract(this._playStartTime);
        //original time base start time
        var startTime = this._recordedDataStartTime.add(deltaToStart);
        //original time base end time
        var endTime = this._recordedDataStartTime.add(deltaToEnd);
        /** @type {RecordedSensoryRecord[]} */
        var recordedRecords = this.getRecordsInTimeRange(startTime, endTime);
        convertTimeBase(this._recordedDataStartTime, this._playStartTime, recordedRecords);
        /**
         * @type {SensoryRecord[]}
         */
        var records = [];
        for (var i = 0; i < recordedRecords.length; i++) {
            if (!respectFilter || recordedRecords[i].passedFilter) {
                records.push(recordedRecords[i].record);
            }
        }
        this._lastIterativeReadTime = curTime;
        return records;
    }
    return null;
};
module.exports = SensoryLogDataSource;

},{"../SensoryRecord":12,"./AttentionLog":24,"animation-utilities":undefined}],27:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AttentionLog = require("./AttentionLog");
/**
 * @implements {SensoryListener}
 * @param {SensoryStore} sensoryStore
 * @constructor
 */
var SensoryLogger = function (sensoryStore) {
    /**
     * @type {SensoryStore}
     * @private
     */
    this._sensoryStore = sensoryStore;
    /**
     * @type {?loggingFunction}
     * @private
     */
    this._activeLog = null;
    /**
     * @type {?string}
     * @private
     */
    this._logFileName = null;
};
SensoryLogger.prototype.startLogging = function (filename) {
    this._activeLog = AttentionLog.createLog(filename);
    this._logFileName = filename;
    this._sensoryStore.addSensoryListener(this);
};
SensoryLogger.prototype.stopLogging = function () {
    this._sensoryStore.removeSensoryListener(this);
    this._activeLog = null;
    this._logFileName = null;
};
/**
 * implementation of SensoryListener#rawDataAdded
 * @param {SensoryRecord} rawRecord
 * @param {boolean} passedFilter
 */
SensoryLogger.prototype.rawDataAdded = function (rawRecord, passedFilter) {
    if (this._activeLog !== null) {
        this._activeLog({ record: rawRecord, passedFilter: passedFilter });
    }
};
/**
 * Get the name of the current target log file.
 * @return {string} - name of current log file target, null if none
 */
SensoryLogger.prototype.getCurrentLogTarget = function () {
    return this._logFileName;
};
/**
 * implementation of SensoryListener#notifyCurrentTracked
 *
 * We don't need to do anything with this data here.
 *
 * @param {TrackedSensory[]} allTrackedData
 */
SensoryLogger.prototype.notifyCurrentTracked = function (allTrackedData) { }; // eslint-disable-line no-unused-vars
module.exports = SensoryLogger;

},{"./AttentionLog":24}],28:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Bakery = AnimationUtilities.ui.Bakery;
var DADefaultChannel = "Attention";
/**
 * @param {RobotInfo} robotInfo
 * @return {number[]} - x,y limits to keep the eye edge from passing the screen edge
 */
var computeLimits = function (robotInfo) {
    var eyeHalfWidth = Math.abs(robotInfo.getDefaultDOFValues()["vertexJoint1_t"]);
    var eyeHalfHeight = Math.abs(robotInfo.getDefaultDOFValues()["vertexJoint1_t_2"]);
    var screenWidth = robotInfo.getEyeScreenInfo().getWidth();
    var screenHeight = robotInfo.getEyeScreenInfo().getHeight();
    var xLimitNormal = Math.max(0, screenWidth / 2 - eyeHalfWidth);
    var yLimitNormal = Math.max(0, screenHeight / 2 - eyeHalfHeight);
    //var eyeSizeOverride = Bakery.getFloat("Eye Size", 1, 800, 600, "Eye Size Test");
    //if(Bakery.getBoolean("Override Eye Size PX", false, "Eye Size Test")){
    //	xLimitNormal = Math.max(0, screenWidth/2 - eyeHalfWidth * eyeSizeOverride/600.0);
    //	yLimitNormal = Math.max(0, screenHeight/2 - eyeHalfHeight * eyeSizeOverride/600.0);
    //}
    //console.log("XY Limits: "+xLimitNormal+", "+yLimitNormal);
    return [xLimitNormal, yLimitNormal];
};
/**
 *
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {boolean} eyeOnly
 * @param {boolean} levelHead
 * @constructor
 */
var LookConfig = function (name, robotInfo, eyeOnly, levelHead) {
    this.name = name;
    this.doWindupOvershoot = true;
    this.doSaccadeBlink = true;
    this.doRecession = true;
    /**
     * @type {RobotInfo}
     */
    this.robotInfo = robotInfo;
    /**
     * If doRecession is true, this value represents the min distance required to initiate a recession.
     * Distance must be greater than threshold to init a recession.
     * @type {number}
     */
    this.recessionThreshold = 0;
    /**
     * True to use eye only for the look, false to also use motors
     * @type {boolean}
     */
    this.eyeOnly = eyeOnly;
    this.levelHead = levelHead || false;
    /**
     * True to use the torso (assuming we're not eye only) in the look motion; false to keep torso centered.
     * @type {boolean}
     */
    this.torsoEnabled = true;
    /**
     * @type {boolean}
     */
    this.continuous = true;
    /**
     * @type {string}
     */
    this.dofArbiterChannel = DADefaultChannel;
    var limits = computeLimits(robotInfo);
    /**
     * @type {number}
     */
    this.normalEyeLimitX = limits[0];
    /**
     * @type {number}
     */
    this.normalEyeLimitY = limits[1];
    /**
     *
     * @type {LookatBuilder}
     */
    this.cachedBuilder = null;
    //make static list of possible dof sets to return from getDOFs() based on flags
    this._allDOFs = robotInfo.getDOFSet("EYE_TRANSLATE").plus("BODY").getDOFs();
    this._eyeOnlyDOFs = robotInfo.getDOFSet("EYE_TRANSLATE").getDOFs();
    this._allWithoutTorsoDOFs = robotInfo.getDOFSet("EYE_TRANSLATE").getDOFs();
    this._allWithoutTorsoDOFs.push(robotInfo.getDOFSet("BODY").getDOFs()[0]);
    this._allWithoutTorsoDOFs.push(robotInfo.getDOFSet("BODY").getDOFs()[2]);
};
LookConfig.prototype.updateValues = function () {
    this.doWindupOvershoot = Bakery.getBoolean("LC:" + this.name + " do windup/overshoot", this.doWindupOvershoot, "ATMotion");
    this.doSaccadeBlink = Bakery.getBoolean("LC:" + this.name + " do saccade blink", this.doSaccadeBlink, "ATMotion");
    this.doRecession = Bakery.getBoolean("LC:" + this.name + " do recession", this.doRecession, "ATMotion");
    this.eyeOnly = Bakery.getBoolean("LC:" + this.name + " eye only", this.eyeOnly, "ATMotion");
    this.torsoEnabled = Bakery.getBoolean("LC:" + this.name + " torso enabled", this.torsoEnabled, "ATMotion");
};
/**
 * @param lookatBuilder
 */
LookConfig.prototype.lookatConfigEyeWindupOvershoot = function (lookatBuilder) {
    var eyeConfig = lookatBuilder.getLookatNodeConfig("Eye");
    eyeConfig.WPTargetDeltaToTriggerNewWindup = Bakery.getFloat("Eye Windup Trigger On Target Delta", 0, 10, 0.2, "ATMotion");
    eyeConfig.WPMaxAllowedTriggerSpeed = Bakery.getFloat("Eye Windup min trigger speed", 0, 1, 0.005, "ATMotion");
    eyeConfig.WPMinAllowedTriggerDistance = Bakery.getFloat("Eye Windup min trigger distance", 0, 1, 0.01, "ATMotion");
    eyeConfig.WPMaxAllowedTriggerDistance = Bakery.getFloat("Eye Windup max trigger distance", 0, 100000, 100000, "ATMotion");
    eyeConfig.WMWindupDistanceRatio = eyeConfig.WPOvershootDistanceRatio = Bakery.getFloat("Eye windup distance ratio", 0, 2, 0.05, "ATMotion");
    eyeConfig.WPWindupMinDistance = eyeConfig.WPOvershootMinDistance = Bakery.getFloat("Eye windup min distance", 0, 0.1, 0.001, "ATMotion");
    eyeConfig.WPWindupMaxDistance = eyeConfig.WPOvershootMaxDistance = Bakery.getFloat("Eye windup max distance", 0, 0.1, 0.002, "ATMotion");
    var eyeXDofConfig = lookatBuilder.getLookatDOFConfig("eyeSubRootBn_t");
    eyeXDofConfig.min = Math.min(0, -this.normalEyeLimitX + eyeConfig.WPWindupMaxDistance);
    eyeXDofConfig.max = Math.max(0, this.normalEyeLimitX - eyeConfig.WPWindupMaxDistance);
    var eyeYDofConfig = lookatBuilder.getLookatDOFConfig("eyeSubRootBn_t_2");
    eyeYDofConfig.min = Math.min(0, -this.normalEyeLimitY + eyeConfig.WPWindupMaxDistance);
    eyeYDofConfig.max = Math.max(0, this.normalEyeLimitY - eyeConfig.WPWindupMaxDistance);
};
/**
 * @param lookatBuilder
 */
LookConfig.prototype.lookatConfigSaccadeBlink = function (lookatBuilder) {
    var eyeConfig = lookatBuilder.getLookatNodeConfig("Eye");
    eyeConfig.BPTriggerDelta = Bakery.getFloat("Saccade Blink trigger distance", 0, 0.1, 0.007, "ATMotion");
    eyeConfig.BPOnlyAtOrAfterWindupPhase = Bakery.getFloat("Saccade Blink wait until windup phase", 0, 4, 4, "ATMotion");
};
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @abstract
 */
LookConfig.prototype.configureBuilder = function (lookatBuilder) {
    if (this.levelHead) {
        lookatBuilder.setLookatConfig("LEVEL_HEAD");
        if (!this.torsoEnabled) {
            console.log("Level head selected for LookatConfig " + this.name + " but torso was disabled, enabling it");
            this.torsoEnabled = true;
        }
    }
    if (this.doWindupOvershoot && Bakery.getBoolean("Do Any Eye Windup", true, "ATMotion")) {
        this.lookatConfigEyeWindupOvershoot(lookatBuilder);
    }
    if (this.doSaccadeBlink && Bakery.getBoolean("Do Any Saccade Blink", true, "ATMotion")) {
        this.lookatConfigSaccadeBlink(lookatBuilder);
    }
};
LookConfig.prototype.getDOFs = function () {
    if (this.eyeOnly) {
        return this._eyeOnlyDOFs;
    }
    else if (this.torsoEnabled) {
        return this._allDOFs;
    }
    else {
        return this._allWithoutTorsoDOFs;
    }
};
module.exports = LookConfig;

},{"animation-utilities":undefined}],29:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var LookConfigSlow = require("./LookConfigSlow");
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @constructor
 * @extends LookConfigSlow
 */
var LookConfigDisengage = function (name, robotInfo) {
    LookConfigSlow.call(this, name, robotInfo, false, false);
};
LookConfigDisengage.prototype = Object.create(LookConfigSlow.prototype);
LookConfigDisengage.prototype.constructor = LookConfigDisengage;
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @override
 */
LookConfigDisengage.prototype.configureBuilder = function (lookatBuilder) {
    LookConfigSlow.prototype.configureBuilder.call(this, lookatBuilder);
    //disable base and torso for now
    var baseConfig = lookatBuilder.getLookatNodeConfig("BaseLookatNode");
    baseConfig.TPTDLimitInner = baseConfig.TPTDLimitOuter = 10000;
    baseConfig.TPTDMoveImmediatelyPastOuter = false;
    //var torsoConfig = lookatBuilder.getLookatNodeConfig("TorsoLookatNode");
    //torsoConfig.TPTDLimitInner = torsoConfig.TPTDLimitOuter = 10000;
    //torsoConfig.TPTDMoveImmediatelyPastOuter = false;
    var topConfig = lookatBuilder.getLookatNodeConfig("TopLookatNode");
    topConfig.TAUndershootDistance = 0.33;
    //slog(channel, "Set TAUndershootDistance to "+topConfig.TAUndershootDistance);
};
module.exports = LookConfigDisengage;

},{"./LookConfigSlow":35}],30:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var LookConfig = require("./LookConfig");
var AnimationUtilities = require("animation-utilities");
var Bakery = AnimationUtilities.ui.Bakery;
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {string} modalityName
 * @param {boolean} eyeOnly
 * @param {boolean} torsoEnabled
 * @param {boolean} levelHead
 * @constructor
 * @extends LookConfig
 */
var LookConfigEyeVision = function (name, robotInfo, modalityName, eyeOnly, torsoEnabled, levelHead) {
    LookConfig.call(this, name, robotInfo, eyeOnly, levelHead);
    this.modalityName = modalityName;
    this.torsoEnabled = torsoEnabled;
    this.recessionThreshold = 0.4; //~22 degrees
    this.trunkConfigTPTDLimitInner = Math.PI / 12;
    this.trunkConfigTPTDLimitOuter = Math.PI / 4;
    this.trunkConfigTPTDAccumInner = 0.5;
    this.trunkConfigTPTDAccumOuter = 2;
    this.trunkConfigTPTDMoveImmediatelyPastOuter = false;
    this.trunkConfigTPTMTDeadZone = 0.01;
    this.trunkConfigTPTMTDeadTime = 0.01;
    this.trunkConfigTPTMTDeadVelocity = 0.18;
    this.trunkConfigLHSolutionPolicy = "CLOSEST";
    this.baseConfigTPTDLimitInner = Math.PI / 6;
    this.baseConfigTPTDLimitOuter = Math.PI / 2;
    this.baseConfigTPTDAccumInner = 0.2;
    this.baseConfigTPTDAccumOuter = 0.5;
    this.baseConfigTPTDMoveImmediatelyPastOuter = false;
    this.torsoConfigTPTDLimitInner = Math.PI / 18;
    this.torsoConfigTPTDLimitOuter = Math.PI / 6;
    this.torsoConfigTPTDAccumInner = 0;
    this.torsoConfigTPTDAccumOuter = 0;
    this.torsoConfigTPTDMoveImmediatelyPastOuter = true;
    this.topConfigTPTDLimitInner = Math.PI / 50;
    this.topConfigTPTDLimitOuter = Math.PI / 5;
    this.topConfigTPTDAccumInner = 0.12;
    this.topConfigTPTDAccumOuter = 1;
    this.topConfigTPTDMoveImmediatelyPastOuter = true;
};
LookConfigEyeVision.prototype = Object.create(LookConfig.prototype);
LookConfigEyeVision.prototype.constructor = LookConfigEyeVision;
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @override
 */
LookConfigEyeVision.prototype.configureBuilder = function (lookatBuilder) {
    LookConfig.prototype.configureBuilder.call(this, lookatBuilder);
    var eyeConfig = lookatBuilder.getLookatNodeConfig("Eye");
    eyeConfig.acceleration = Bakery.getFloat("Eye accel: " + this.modalityName, 0, 5, 0.4, "ATMotion");
    eyeConfig.TPTDLimitInner = Bakery.getFloat("Eye dead zone: " + this.modalityName, 0, 0.1, 0.00006, "ATMotion");
    eyeConfig.TPTDLimitOuter = eyeConfig.TPTDLimitInner;
    eyeConfig.TPTDAccumInner = 0;
    eyeConfig.TPTDAccumOuter = 0;
    eyeConfig.TPTDMoveImmediatelyPastOuter = true;
    eyeConfig.TPTMTDeadZone = eyeConfig.TPTDLimitInner;
    eyeConfig.TPTMTDeadTime = Bakery.getFloat("Eye dead time: " + this.modalityName, 0, 0.5, 0.05, "ATMotion");
    eyeConfig.TPTMTDeadVelocity = Bakery.getFloat("Eye dead velocity: " + this.modalityName, 0, 10, 0.001, "ATMotion");
    if (!this.eyeOnly) {
        var trunkConfig = lookatBuilder.getLookatNodeConfig("TrunkLookatNode");
        //trunkConfig.TPTDLimitInner = trunkConfig.TPTDLimitOuter = 10000;
        trunkConfig.TPTDLimitInner = this.trunkConfigTPTDLimitInner;
        trunkConfig.TPTDLimitOuter = this.trunkConfigTPTDLimitOuter;
        trunkConfig.TPTDAccumInner = this.trunkConfigTPTDAccumInner;
        trunkConfig.TPTDAccumOuter = this.trunkConfigTPTDAccumOuter;
        trunkConfig.TPTDMoveImmediatelyPastOuter = this.trunkConfigTPTDMoveImmediatelyPastOuter;
        trunkConfig.TPTMTDeadZone = this.trunkConfigTPTMTDeadZone;
        trunkConfig.TPTMTDeadTime = this.trunkConfigTPTMTDeadTime;
        trunkConfig.TPTMTDeadVelocity = this.trunkConfigTPTMTDeadVelocity;
        trunkConfig.LHSolutionPolicy = this.trunkConfigLHSolutionPolicy;
        var baseConfig = lookatBuilder.getLookatNodeConfig("BaseLookatNode");
        //baseConfig.TPTDLimitInner = baseConfig.TPTDLimitOuter = 10000;
        baseConfig.TPTDLimitInner = this.baseConfigTPTDLimitInner;
        baseConfig.TPTDLimitOuter = this.baseConfigTPTDLimitOuter;
        baseConfig.TPTDAccumInner = this.baseConfigTPTDAccumInner;
        baseConfig.TPTDAccumOuter = this.baseConfigTPTDAccumOuter;
        baseConfig.TPTDMoveImmediatelyPastOuter = this.baseConfigTPTDMoveImmediatelyPastOuter;
        var torsoConfig = lookatBuilder.getLookatNodeConfig("TorsoLookatNode");
        //torsoConfig.TPTDLimitInner = torsoConfig.TPTDLimitOuter = 10000;
        torsoConfig.TPTDLimitInner = this.torsoConfigTPTDLimitInner;
        torsoConfig.TPTDLimitOuter = this.torsoConfigTPTDLimitOuter;
        torsoConfig.TPTDAccumInner = this.torsoConfigTPTDAccumInner;
        torsoConfig.TPTDAccumOuter = this.torsoConfigTPTDAccumOuter;
        torsoConfig.TPTDMoveImmediatelyPastOuter = this.torsoConfigTPTDMoveImmediatelyPastOuter;
        torsoConfig.TPTPMoveIfParentMoves = true;
        var topConfig = lookatBuilder.getLookatNodeConfig("TopLookatNode");
        topConfig.TPTDLimitInner = this.topConfigTPTDLimitInner;
        topConfig.TPTDLimitOuter = this.topConfigTPTDLimitOuter;
        topConfig.TPTDAccumInner = this.topConfigTPTDAccumInner;
        topConfig.TPTDAccumOuter = this.topConfigTPTDAccumOuter;
        topConfig.TPTDMoveImmediatelyPastOuter = this.topConfigTPTDMoveImmediatelyPastOuter;
        topConfig.TPTPMoveIfParentMoves = true;
        //topConfig.TPTMTDeadZone = eyeConfig.TPTDLimitInner;
        //topConfig.TPTMTDeadTime = Bakery.getFloat("Eye dead time: "+this.modalityName, 0, 0.5, 0.05, "ATMotion");
        //topConfig.TPTMTDeadVelocity = Bakery.getFloat("Eye dead velocity: "+this.modalityName, 0, 10, 0.001, "ATMotion");
        //topConfig.TAUndershootDistance = Math.PI/12;
    }
};
module.exports = LookConfigEyeVision;

},{"./LookConfig":28,"animation-utilities":undefined}],31:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var LookConfigEyeVision = require("./LookConfigEyeVision");
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {string} modalityName
 * @param {boolean} eyeOnly
 * @param {boolean} torsoEnabled
 * @param {boolean} levelHead
 * @constructor
 * @extends LookConfig
 */
var LookConfigEyeVisionEngaged = function (name, robotInfo, modalityName, eyeOnly, torsoEnabled, levelHead) {
    LookConfigEyeVision.call(this, name, robotInfo, modalityName, eyeOnly, torsoEnabled, levelHead);
    this.trunkConfigTPTDLimitInner = Math.PI / 18;
    this.trunkConfigTPTDLimitOuter = Math.PI / 6;
    this.trunkConfigTPTDAccumInner = 2;
    this.trunkConfigTPTDAccumOuter = 4;
    this.trunkConfigTPTDMoveImmediatelyPastOuter = true;
    this.baseConfigTPTDLimitInner = Math.PI / 12;
    this.baseConfigTPTDLimitOuter = Math.PI / 6;
    this.baseConfigTPTDAccumInner = 2;
    this.baseConfigTPTDAccumOuter = 4;
    this.baseConfigTPTDMoveImmediatelyPastOuter = true;
    this.torsoConfigTPTDLimitInner = Math.PI / 18;
    this.torsoConfigTPTDLimitOuter = Math.PI / 6;
    this.torsoConfigTPTDAccumInner = 0;
    this.torsoConfigTPTDAccumOuter = 0;
    this.torsoConfigTPTDMoveImmediatelyPastOuter = true;
    this.topConfigTPTDLimitInner = Math.PI / 50;
    this.topConfigTPTDLimitOuter = Math.PI / 5;
    this.topConfigTPTDAccumInner = 1;
    this.topConfigTPTDAccumOuter = 4;
    this.topConfigTPTDMoveImmediatelyPastOuter = true;
};
LookConfigEyeVisionEngaged.prototype = Object.create(LookConfigEyeVision.prototype);
LookConfigEyeVisionEngaged.prototype.constructor = LookConfigEyeVisionEngaged;
module.exports = LookConfigEyeVisionEngaged;

},{"./LookConfigEyeVision":30}],32:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var LookConfigEyeVision = require("./LookConfigEyeVision");
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {string} modalityName
 * @param {boolean} eyeOnly
 * @param {boolean} torsoEnabled
 * @param {boolean} levelHead
 * @constructor
 * @extends LookConfig
 */
var LookConfigEyeVisionMenu = function (name, robotInfo, modalityName, eyeOnly, torsoEnabled, levelHead) {
    LookConfigEyeVision.call(this, name, robotInfo, modalityName, eyeOnly, torsoEnabled, levelHead);
    this.trunkConfigTPTDLimitInner = Math.PI / 12;
    this.trunkConfigTPTDLimitOuter = Math.PI / 4;
    this.trunkConfigTPTDAccumInner = 0.5;
    this.trunkConfigTPTDAccumOuter = 2;
    this.trunkConfigTPTDMoveImmediatelyPastOuter = false;
    this.trunkConfigTPTMTDeadZone = 0.01;
    this.trunkConfigTPTMTDeadTime = 0.01;
    this.trunkConfigTPTMTDeadVelocity = 0.18;
    this.baseConfigTPTDLimitInner = Math.PI / 6;
    this.baseConfigTPTDLimitOuter = Math.PI / 2;
    this.baseConfigTPTDAccumInner = 0.2;
    this.baseConfigTPTDAccumOuter = 0.5;
    this.baseConfigTPTDMoveImmediatelyPastOuter = false;
    this.torsoConfigTPTDLimitInner = Math.PI / 18;
    this.torsoConfigTPTDLimitOuter = Math.PI / 6;
    this.torsoConfigTPTDAccumInner = 0;
    this.torsoConfigTPTDAccumOuter = 0;
    this.torsoConfigTPTDMoveImmediatelyPastOuter = true;
    this.topConfigTPTDLimitInner = Math.PI / 50;
    this.topConfigTPTDLimitOuter = Math.PI / 5;
    this.topConfigTPTDAccumInner = 0.12;
    this.topConfigTPTDAccumOuter = 1;
    this.topConfigTPTDMoveImmediatelyPastOuter = true;
};
LookConfigEyeVisionMenu.prototype = Object.create(LookConfigEyeVision.prototype);
LookConfigEyeVisionMenu.prototype.constructor = LookConfigEyeVisionMenu;
module.exports = LookConfigEyeVisionMenu;

},{"./LookConfigEyeVision":30}],33:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
//var LookConfigSlow = require("./LookConfigSlow");
var LookConfigEyeVision = require("./LookConfigEyeVision");
//var LookConfig= require("./LookConfig");
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {boolean} levelHead
 * @constructor
 * @extends LookConfigEyeVision
 */
var LookConfigRelaxed = function (name, robotInfo, levelHead) {
    LookConfigEyeVision.call(this, name, robotInfo, "relaxed", false, true, levelHead);
    this.trunkConfigTPTDLimitInner = Math.PI / 180 * 32;
    this.trunkConfigTPTDLimitOuter = Math.PI / 180 * 70;
    this.trunkConfigTPTDAccumInner = 0.2;
    this.trunkConfigTPTDAccumOuter = 2;
    this.trunkConfigTPTDMoveImmediatelyPastOuter = true;
    this.trunkConfigTPTMTDeadZone = Math.PI / 180 * 8;
    this.trunkConfigTPTMTDeadTime = 0.01;
    this.trunkConfigTPTMTDeadVelocity = Math.PI / 180 * 13;
    //this.baseConfigTPTDLimitInner = Math.PI/6;
    //this.baseConfigTPTDLimitOuter = Math.PI/2;
    //this.baseConfigTPTDAccumInner = 0.2;
    //this.baseConfigTPTDAccumOuter = 0.5;
    //this.baseConfigTPTDMoveImmediatelyPastOuter = false;
    //
    //this.torsoConfigTPTDLimitInner = Math.PI/18;
    //this.torsoConfigTPTDLimitOuter = Math.PI/6;
    //this.torsoConfigTPTDAccumInner = 0;
    //this.torsoConfigTPTDAccumOuter = 0;
    //this.torsoConfigTPTDMoveImmediatelyPastOuter = true;
    this.topConfigTPTDLimitInner = Math.PI / 180 * 5;
    this.topConfigTPTDLimitOuter = Math.PI / 180 * 5;
    this.topConfigTPTDAccumInner = 0.12;
    this.topConfigTPTDAccumOuter = 2;
    this.topConfigTPTDMoveImmediatelyPastOuter = true;
};
LookConfigRelaxed.prototype = Object.create(LookConfigEyeVision.prototype);
LookConfigRelaxed.prototype.constructor = LookConfigRelaxed;
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @override
 */
LookConfigRelaxed.prototype.configureBuilder = function (lookatBuilder) {
    LookConfigEyeVision.prototype.configureBuilder.call(this, lookatBuilder);
    //LookConfig.prototype.configureBuilder.call(this, lookatBuilder);
    lookatBuilder.getLookatNodeConfig("TrunkLookatNode").WTADown = Math.PI / 180 * 7;
    lookatBuilder.getLookatNodeConfig("TrunkLookatNode").acceleration = 0.9;
    lookatBuilder.getLookatNodeConfig("BaseLookatNode").acceleration = 1;
    lookatBuilder.getLookatNodeConfig("TorsoLookatNode").acceleration = 0.8;
    lookatBuilder.getLookatNodeConfig("TopLookatNode").acceleration = 1.1;
    lookatBuilder.getLookatNodeConfig("Eye").acceleration = 0.33;
    var trunkConfig = lookatBuilder.getLookatNodeConfig("TrunkLookatNode");
    trunkConfig.TAUndershootDistance = 0.0;
    //trunkConfig.TAUndershootDistance = 0.7;
    var baseConfig = lookatBuilder.getLookatNodeConfig("BaseLookatNode");
    baseConfig.TAUndershootDistance = 0.66;
    var torsoConfig = lookatBuilder.getLookatNodeConfig("TorsoLookatNode");
    torsoConfig.TAUndershootDistance = 0.30;
    var topConfig = lookatBuilder.getLookatNodeConfig("TopLookatNode");
    topConfig.TAUndershootDistance = 0.43;
    //topConfig.TAUndershootDistance = 0.5;
};
module.exports = LookConfigRelaxed;

},{"./LookConfigEyeVision":30}],34:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var LookConfig = require("./LookConfig");
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {boolean} levelHead
 * @constructor
 * @extends LookConfig
 */
var LookConfigShort = function (name, robotInfo, levelHead) {
    LookConfig.call(this, name, robotInfo, true, levelHead);
    this.doSaccadeBlink = false;
    this.doRecession = false;
};
LookConfigShort.prototype = Object.create(LookConfig.prototype);
LookConfigShort.prototype.constructor = LookConfigShort;
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @override
 */
LookConfigShort.prototype.configureBuilder = function (lookatBuilder) {
    LookConfig.prototype.configureBuilder.call(this, lookatBuilder);
    lookatBuilder.getLookatNodeConfig("TrunkLookatNode").acceleration = 4;
    lookatBuilder.getLookatNodeConfig("BaseLookatNode").acceleration = 5;
    lookatBuilder.getLookatNodeConfig("TorsoLookatNode").acceleration = 4;
    lookatBuilder.getLookatNodeConfig("TopLookatNode").acceleration = 5;
    lookatBuilder.getLookatNodeConfig("Eye").acceleration = 1.7;
};
module.exports = LookConfigShort;

},{"./LookConfig":28}],35:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var LookConfig = require("./LookConfig");
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {boolean} eyeOnly
 * @param {boolean} levelHead
 * @constructor
 * @extends LookConfig
 */
var LookConfigSlow = function (name, robotInfo, eyeOnly, levelHead) {
    LookConfig.call(this, name, robotInfo, eyeOnly, levelHead);
};
LookConfigSlow.prototype = Object.create(LookConfig.prototype);
LookConfigSlow.prototype.constructor = LookConfigSlow;
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @override
 */
LookConfigSlow.prototype.configureBuilder = function (lookatBuilder) {
    LookConfig.prototype.configureBuilder.call(this, lookatBuilder);
    lookatBuilder.getLookatNodeConfig("TrunkLookatNode").acceleration = 0.8;
    lookatBuilder.getLookatNodeConfig("BaseLookatNode").acceleration = 1;
    lookatBuilder.getLookatNodeConfig("TorsoLookatNode").acceleration = 0.8;
    lookatBuilder.getLookatNodeConfig("TopLookatNode").acceleration = 1;
    lookatBuilder.getLookatNodeConfig("Eye").acceleration = 0.33;
};
module.exports = LookConfigSlow;

},{"./LookConfig":28}],36:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var LookConfigSlow = require("./LookConfigSlow");
// var LookConfig = require("./LookConfig");
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {boolean} eyeOnly
 * @param {boolean} levelHead
 * @constructor
 * @extends LookConfig
 */
var LookConfigSlowDown = function (name, robotInfo, eyeOnly, levelHead) {
    LookConfigSlow.call(this, name, robotInfo, eyeOnly, levelHead);
};
LookConfigSlowDown.prototype = Object.create(LookConfigSlow.prototype);
LookConfigSlowDown.prototype.constructor = LookConfigSlowDown;
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @override
 */
LookConfigSlowDown.prototype.configureBuilder = function (lookatBuilder) {
    LookConfigSlow.prototype.configureBuilder.call(this, lookatBuilder);
    lookatBuilder.getLookatNodeConfig("TrunkLookatNode").WTADown = Math.PI / 180 * 14;
};
module.exports = LookConfigSlowDown;

},{"./LookConfigSlow":35}],37:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var LookConfigSlow = require("./LookConfigSlow");
/**
 * @param {string} name
 * @param {RobotInfo} robotInfo
 * @param {boolean} levelHead
 * @constructor
 * @extends LookConfigSlow
 */
var LookConfigUncommitted = function (name, robotInfo, levelHead) {
    LookConfigSlow.call(this, name, robotInfo, false, levelHead);
};
LookConfigUncommitted.prototype = Object.create(LookConfigSlow.prototype);
LookConfigUncommitted.prototype.constructor = LookConfigUncommitted;
/**
 *
 * @param {LookatBuilder} lookatBuilder
 * @override
 */
LookConfigUncommitted.prototype.configureBuilder = function (lookatBuilder) {
    LookConfigSlow.prototype.configureBuilder.call(this, lookatBuilder);
    var trunkConfig = lookatBuilder.getLookatNodeConfig("TrunkLookatNode");
    trunkConfig.TAUndershootDistance = 0.20;
    //trunkConfig.TPTDLimitInner = baseConfig.TPTDLimitOuter = 10000;
    //trunkConfig.TPTDMoveImmediatelyPastOuter = false;
    var baseConfig = lookatBuilder.getLookatNodeConfig("BaseLookatNode");
    baseConfig.TAUndershootDistance = 0.33;
    //baseConfig.TPTDLimitInner = baseConfig.TPTDLimitOuter = 10000;
    //baseConfig.TPTDMoveImmediatelyPastOuter = false;
    var torsoConfig = lookatBuilder.getLookatNodeConfig("TorsoLookatNode");
    torsoConfig.TAUndershootDistance = 0.15;
    //torsoConfig.TPTDLimitInner = torsoConfig.TPTDLimitOuter = 10000;
    //torsoConfig.TPTDMoveImmediatelyPastOuter = false;
    var topConfig = lookatBuilder.getLookatNodeConfig("TopLookatNode");
    topConfig.TAUndershootDistance = 0.33;
    //slog(channel, "Set TAUndershootDistance to "+topConfig.TAUndershootDistance);
};
module.exports = LookConfigUncommitted;

},{"./LookConfigSlow":35}],38:[function(require,module,exports){
/**
 * @author mattb
 */
"use strict";
var slog = require("animation-utilities").slog;
var channel = "ATTENTION";
/**
 * @param {AttentionServer} attentionServer
 * @param {AttentionManager} attentionManager
 * @constructor
 */
var AttentionModeHandler = function (attentionServer, attentionManager) {
    /**
     * @type {?Mode}
     * @private
     */
    this._lastReportedMode = null;
    /**
     * @type {AttentionManager}
     * @private
     */
    this._attentionManager = attentionManager;
    /**
     * @type {AttentionServer}
     * @private
     */
    this._attentionServer = attentionServer;
    attentionServer.registerHandler("ChangeMode", function (type, data) {
        if (data.switchToMode) {
            var newMode = data.switchToMode;
            slog(channel, "Switching to attention mode " + newMode + " based on remote request");
            attentionManager.setMode(newMode);
        }
    });
};
AttentionModeHandler.prototype.update = function () {
    var m = this._attentionManager.getMode();
    if (m !== this._lastReportedMode) {
        this._lastReportedMode = m;
        this._attentionServer.sendData("CurrentMode", { currentMode: m });
    }
};
module.exports = AttentionModeHandler;

},{"animation-utilities":undefined}],39:[function(require,module,exports){
"use strict";
/**
 *
 * @param {AttentionServer} attentionServer
 * @param {AttentionManager} attentionManager
 * @constructor
 */
var AttentionRuleHandler = function (attentionServer, attentionManager) {
    /**
     * @type {AttentionServer}
     * @private
     */
    this._attentionServer = attentionServer;
    /**
     * @type {AttentionManager}
     * @private
     */
    this._attentionManager = attentionManager;
};
AttentionRuleHandler.prototype.switchedRule = function (newRule, curTime) {
    this._attentionServer.sendData("AttentionRuleSwitched", {
        rule: newRule,
        time: curTime
    });
};
module.exports = AttentionRuleHandler;

},{}],40:[function(require,module,exports){
"use strict";
var WebSocketServer = require("websocket-without-native").server;
var http = require("http");
var slog = require("animation-utilities").slog;
var channel = "ATTENTION";
/**
 * @callback MessageHandler
 * @param {string} type
 * @param {?} data
 */
/**
 *
 * @constructor
 */
var AttentionServer = function () {
    this.connections = [];
    this.info = {};
    this.info.realPose = {};
    /**
     * @type {Object.<string, MessageHandler[]>}
     */
    this.handlers = {};
    slog(channel, "creating attention server");
    var port = 9197;
    var server = http.createServer(function (request, response) {
        slog(channel, (new Date()) + " Attention Server is listening on port " + port);
        response.writeHead(404);
        response.end();
    });
    server.listen(port, function () {
        console.log((new Date()) + " Attention Server is listening on port " + port);
    });
    var wsServer = new WebSocketServer({ httpServer: server, autoAcceptConnections: false });
    var self = this;
    wsServer.on('request', function (request) {
        var connection = request.accept(null, request.origin);
        slog(channel, (new Date()) + " AttentionServer: Connection accepted.");
        self.connections.push(connection);
        connection.on('message', function (message) {
            if (message.type === 'utf8') {
                try {
                    var messageData = JSON.parse(message.utf8Data);
                    //slog(channel, "got message: "+messageData);
                    if (messageData.hasOwnProperty("type")) {
                        self.fireHandlers(messageData.type, messageData.data);
                    }
                }
                catch (e) {
                    slog(channel, "JSON parse failed on incoming message: " + message + " error: " + e);
                }
            }
            else if (message.type === 'binary') {
                slog(channel, 'Ignoring binary message');
            }
        });
        // eslint-disable-next-line no-unused-vars
        connection.on('close', function (reasonCode, description) {
            slog(channel, (new Date()) + " AttentionServer: Peer disconnected.");
            if (self.connections.indexOf(connection) > -1) {
                self.connections.splice(self.connections.indexOf(connection), 1);
            }
        });
    });
};
/**
 * @returns {boolean}
 */
AttentionServer.prototype.hasClients = function () {
    return this.connections.length > 0;
};
AttentionServer.prototype.sendData = function (type, data) {
    var packet = { type: type, data: data };
    for (var i = 0; i < this.connections.length; i++) {
        var connection = this.connections[i];
        connection.send(JSON.stringify(packet));
    }
};
AttentionServer.prototype.fireHandlers = function (type, data) {
    if (this.handlers[type] != null) {
        for (var i = 0; i < this.handlers[type].length; i++) {
            this.handlers[type][i](type, data);
        }
    }
};
/**
 *
 * @param {string} type
 * @param {MessageHandler} handler
 */
AttentionServer.prototype.registerHandler = function (type, handler) {
    if (this.handlers[type] == null) {
        this.handlers[type] = [];
    }
    this.handlers[type].push(handler);
};
/**
 *
 * @param {string} type
 * @param {MessageHandler} handler
 */
AttentionServer.prototype.removeHandler = function (type, handler) {
    if (this.handlers[type] != null) {
        var index = this.handlers[type].indexOf(handler);
        if (index >= 0) {
            this.handlers[type].splice(index, 1);
        }
        else {
            slog(channel, "Error, asked to remove AS handler (" + type + "), but it was not registered");
        }
        if (this.handlers[type].length === 0) {
            delete (this.handlers[type]);
        }
    }
    else {
        slog(channel, "Error, asked to remove AS handler (" + type + "), but it was not registered");
    }
};
module.exports = AttentionServer;

},{"animation-utilities":undefined,"http":undefined,"websocket-without-native":undefined}],41:[function(require,module,exports){
"use strict";
/**
 *
 * @param {AttentionServer} attentionServer
 * @param {AnimationUtilities} animate
 * @constructor
 */
var BodyStreamer = function (attentionServer, animate) {
    this.realPose = null;
    this.attentionServer = attentionServer;
    this.animate = animate;
    var self = this;
    var outputs = this.animate.timeline.getOutputs();
    for (var i = 0; i < outputs.length; i++) {
        if (outputs[i].addInfoListener !== undefined) {
            //jshint -W083
            outputs[i].addInfoListener(function (bodyInfo) {
                if (self.realPose === null) {
                    self.realPose = {};
                }
                self.realPose[bodyInfo.dofName] = bodyInfo.observedPosition;
            });
            //jshint +W083
        }
    }
};
BodyStreamer.prototype.update = function () {
    if (this.realPose !== null) {
        this.attentionServer.sendData("RealPose", this.realPose);
    }
};
module.exports = BodyStreamer;

},{}],42:[function(require,module,exports){
"use strict";
/**
 *
 * @param {AttentionServer} attentionServer
 * @param {AttentionManager} attentionManager
 * @constructor
 */
var CommandLookStreamer = function (attentionServer, attentionManager) {
    /**
     * @type {AttentionServer}
     * @private
     */
    this._attentionServer = attentionServer;
    /**
     * @type {AttentionManager}
     * @private
     */
    this._attentionManager = attentionManager;
};
CommandLookStreamer.prototype.update = function () {
    this._attentionServer.sendData("CommandLookInfo", {
        lastTarget: this._attentionManager._lastCommandTarget,
        lastCommandEntityIndex: this._attentionManager._lastCommandEntityIndex,
        lastCommandPrimaryFaceIndex: this._attentionManager._primaryFaceIndex,
        commandLastFired: (this._attentionManager._ruleThatHasLastFired ? this._attentionManager._ruleThatHasLastFired.name === "Command Look" : false)
    });
};
module.exports = CommandLookStreamer;

},{}],43:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
/**
 * Runs on robot to handle anim requests for remote attention debugging
 *
 * @param {AttentionServer} attentionServer
 * @param {AnimationUtilities} animate
 * @constructor
 */
var DoAnimHandler = function (attentionServer, animate) {
    var configureAndPlay = function (builder, data) {
        if (data.layer != null) {
            builder.setLayer(data.layer);
        }
        if (data.dofs != null) {
            builder.setDOFs(data.dofs);
        }
        if (data.speed != null) {
            builder.setSpeed(data.speed);
        }
        builder.play();
    };
    /** @type {AttentionDebugStateVisualizer} */
    attentionServer.registerHandler("PlayAnimation", function (type, data) {
        if (data.data != null) {
            var builder = animate.createAnimationBuilderFromData(data.data, data.parentDir, null);
            if (builder) {
                configureAndPlay(builder, data);
            }
            else {
                console.log("Failed to make builder from data");
            }
        }
        else {
            animate.createAnimationBuilder(data.filename, function (builder) {
                if (builder) {
                    configureAndPlay(builder, data);
                }
                else {
                    console.log("Failed to make builder for file " + data.filename);
                }
            });
        }
    });
};
module.exports = DoAnimHandler;

},{}],44:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AttentionDebugStateVisualizer = require("../AttentionDebugStateVisualizer");
/**
 * Runs on robot to handle remote color requests for remote attention debugging
 *
 * @param {AttentionServer} attentionServer
 * @constructor
 */
var DoColorHandler = function (attentionServer, animate) {
    /** @type {AttentionDebugStateVisualizer} */
    var attentionStateVisualizer = new AttentionDebugStateVisualizer(animate);
    attentionServer.registerHandler("DoDebugState", function (type, data) {
        attentionStateVisualizer.handleState(data.state, data.force);
    });
};
module.exports = DoColorHandler;

},{"../AttentionDebugStateVisualizer":2}],45:[function(require,module,exports){
/**
 * @author mattb
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Bakery = AnimationUtilities.ui.Bakery;
/**
 * @param {AttentionServer} attentionServer
 * @param animate
 * @param {Object.<string,LookConfig>} lookatConfigs
 * @param {AttentionManager} attentionManager
 * @param {DOFArbiter} dofArbiter
 * @param {string} emChannel
 * @constructor
 */
var DoLookHandler = function (attentionServer, animate, lookatConfigs, attentionManager, dofArbiter, emChannel) {
    /** @type {LookatInstance} */
    var lookatInstance = null;
    attentionServer.registerHandler("DoLook", function (type, data) {
        if (lookatInstance === null || data.newLook) {
            /** @type {LookatBuilder} */
            var lookatBuilder = animate.createLookatBuilder();
            lookatBuilder.setContinuousMode(true);
            if (data.dofs) {
                lookatBuilder.setDOFs(data.dofs);
            }
            if (data.disengage) {
                lookatConfigs.lookConfigDisengage.configureBuilder(lookatBuilder);
            }
            else {
                lookatConfigs.lookConfigDefault.configureBuilder(lookatBuilder);
            }
            if (data.innerEyeDistanceX) {
                //This is not allowed under non-debug operation; we're permanently modifying the geometry info
                console.log("Permanently modifying inner eye X to " + data.innerEyeDistanceX);
                lookatBuilder.constructor.LookatDOFGeometryConfig.EyeLeftRight.InternalDistance = data.innerEyeDistanceX;
            }
            if (data.innerEyeDistanceY) {
                //This is not allowed under non-debug operation; we're permanently modifying the geometry info
                console.log("Permanently modifying inner eye Y to " + data.innerEyeDistanceY);
                lookatBuilder.constructor.LookatDOFGeometryConfig.EyeUpDown.InternalDistance = data.innerEyeDistanceY;
            }
            if (data.eyeColorDebug != null) {
                attentionManager.setEnableEyeColorStateVisualizer(data.eyeColorDebug);
            }
            if (Bakery.getBoolean("Do Eye Recession", true, "ATMotion")) {
                attentionManager._eyeRecessor.attachToBuilder(lookatBuilder); //TODO: NOOO
            }
            lookatInstance = dofArbiter.startLookat(lookatBuilder, emChannel, data.target);
            //lookatInstance = lookatBuilder.startLookat(data.target);
        }
        else {
            lookatInstance.updateTarget(data.target);
        }
    });
};
module.exports = DoLookHandler;

},{"animation-utilities":undefined}],46:[function(require,module,exports){
"use strict";
var SensoryRecord = require("../SensoryRecord");
/**
 * Make sure to register this as a SensoryStore's listener!
 * sensoryStore.addSensoryListener(parsedSensoryStreamer);
 * @param {AttentionServer} attentionServer
 * @constructor
 * @implements SensoryListener
 */
var ParsedSensoryStreamer = function (attentionServer) {
    /**
     * @type {AttentionServer}
     * @private
     */
    this._attentionServer = attentionServer;
    /**
     * Reduce data in records before sending.  Will send all keys except "raw"
     * @type {boolean}
     * @private
     */
    this._sendLightRecords = true;
};
/**
 *
 * @param {SensoryRecord} rawRecord
 * @param {boolean} passedFilter
 * @override
 */
ParsedSensoryStreamer.prototype.rawDataAdded = function (rawRecord, passedFilter) {
    if (this._attentionServer.hasClients()) {
        //don't do this extra work if there are no clients
        var recordToSend = rawRecord;
        if (this._sendLightRecords) {
            recordToSend = new SensoryRecord(null, null, null, null, null);
            var keys = Object.keys(rawRecord);
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (k !== "raw") {
                    recordToSend[k] = rawRecord[k];
                }
            }
        }
        this._attentionServer.sendData("RawDataAdded", { record: recordToSend, passed: passedFilter });
    }
};
/**
 *
 * @param {TrackedSensory[]} allTrackedData
 * @override
 */
ParsedSensoryStreamer.prototype.notifyCurrentTracked = function (allTrackedData) {
    this._attentionServer.sendData("TrackedData", allTrackedData);
};
module.exports = ParsedSensoryStreamer;

},{"../SensoryRecord":12}],47:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AttentionManager = require("../AttentionManager");
var slog = require("animation-utilities").slog;
var channel = "ATTENTION";
/**
 * @param {RobotInfo} robotInfo
 * @param {SensoryVisualizer} [sensoryVisualizer]
 * @param {SocketClient} [attentionSocket]
 * @constructor
 * @extends AttentionManager
 */
var RemoteAttentionManager = function (robotInfo, sensoryVisualizer, attentionSocket) {
    AttentionManager.call(this, robotInfo, sensoryVisualizer);
    this._attentionSocket = attentionSocket;
    var self = this;
    attentionSocket.registerHandler("AudioLocation", function (type, data) {
        //console.log("audio:"+JSON.stringify(data, null, "\t"));
        //for(var aei = 0; aei < data.entities.length; aei++){
        //	var sr = new SensoryRecord(
        //		SensoryRecord.SensoryType.AUDIO_LOCALIZATION,
        //		new THREE.Vector3(data.entities[aei].position.x, data.entities[aei].position.y, data.entities[aei].position.z),
        //		data.entities[aei],
        //		Clock.currentTime(),
        //		new Time(data.entities[aei].ts[0], data.entities[aei].ts[1])
        //	);
        //	self._sensoryStore.addData(sr);
        //}
        self.getDataConverter().acceptAudioLocalization(data);
    });
    attentionSocket.registerHandler("VisionData", function (type, entities) {
        //console.log("vision:"+JSON.stringify(entities, null, "\t"));
        //for(var vei = 0; vei < entities.length; vei++){
        //	var sr = new SensoryRecord(
        //		SensoryRecord.SensoryType.VISION,
        //		new THREE.Vector3(entities[vei].position.x, entities[vei].position.y, entities[vei].position.z),
        //		entities[vei],
        //		Clock.currentTime(),
        //		null
        //	);
        //	self._sensoryStore.addData(sr);
        //}
        self.getDataConverter().acceptVision(entities);
    });
    attentionSocket.registerHandler("HeyJibo", function (type, data) {
        //console.log("Hey Jibo!!");
        //console.log("vision:"+JSON.stringify(data, null, "\t"));
        //var sr = new SensoryRecord(
        //	SensoryRecord.SensoryType.WAKE,
        //	null,
        //	data,
        //	Clock.currentTime(),
        //	null
        //);
        //self._sensoryStore.addData(sr);
        self.getDataConverter().acceptWakeWord(data);
    });
    attentionSocket.registerHandler("RealPose", function (type, data) {
        var poseKeys = Object.keys(data);
        var tracker = self._motionTracker;
        for (var p = 0; p < poseKeys.length; p++) {
            var dofName = poseKeys[p];
            var index = tracker._dofsToIndex[dofName];
            tracker._realPose[index] = data[dofName];
        }
    });
};
RemoteAttentionManager.prototype = Object.create(AttentionManager.prototype);
RemoteAttentionManager.prototype.constructor = RemoteAttentionManager;
/**
 * @param {string} trackState
 * @override
 */
RemoteAttentionManager.prototype.displayTrackState = function (trackState) {
    var data = { state: trackState };
    this._attentionSocket.sendData("DoDebugState", data);
};
/**
 * @param {THREE.Vector3} position
 * @param {boolean} body
 * @param {boolean} isHeyJibo
 * @param {boolean} [slow=false]
 * @override
 */
RemoteAttentionManager.prototype.setTarget = function (position, body, isHeyJibo, slow) {
    var lookCommand = {};
    lookCommand.target = position.toArray();
    lookCommand.newLook = body !== this._lastBody;
    if (lookCommand.newLook) {
        slog(channel, "Requesting **NEW** lookat!");
    }
    if (!body) {
        lookCommand.dofs = this._robotInfo.getDOFSet("EYE_ROOT").getDOFs();
    }
    this._lastBody = body;
    //console.log("newlook:"+JSON.stringify(lookCommand));
    this._attentionSocket.sendData("DoLook", lookCommand);
};
module.exports = RemoteAttentionManager;

},{"../AttentionManager":5,"animation-utilities":undefined}],48:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Clock = AnimationUtilities.Clock;
/**
 *
 * @param {AttentionServer} attentionServer
 * @param {SensoryLogController} logController
 * @constructor
 */
var RemoteLogController = function (attentionServer, logController) {
    attentionServer.registerHandler("LogControl", function (type, data) {
        var command = data.command;
        var filename = data.filename;
        //working around issue with polyfilled XMLHttpRequest (make "local" work in the same way)
        if (filename && !filename.includes("/")) {
            console.log("Converting log filename " + filename + " to " + filename);
            filename = process.cwd() + "/" + filename;
        }
        if (command === "StartRecording") {
            console.log("RemoteLogController attempting to start record to log file " + filename);
            logController.startLogging(filename);
        }
        else if (command === "StopRecording") {
            console.log("RemoteLogController attempting to stop recording");
            logController.stopLogging();
        }
        else if (command === "StartPlayback") {
            console.log("RemoteLogController attempting to start playing log file " + filename);
            logController.startPlayingLog(filename);
        }
        else if (command === "StopPlayback") {
            console.log("RemoteLogController attempting to stop playing log");
            logController.stopPlayingLog();
        }
        else if (command === "SetBlockLive") {
            var blockLive = data.blocklive === true;
            console.log("RemoteLogController attempting to set blocklive to " + blockLive);
            logController.setBlockLiveData(blockLive);
        }
    });
    /**
     *
     * @type {SensoryLogController}
     * @private
     */
    this._logController = logController;
    /**
     * @type {AttentionServer}
     * @private
     */
    this._attentionServer = attentionServer;
    this._lastStatusTime = null;
};
RemoteLogController.prototype.update = function () {
    var curTime = Clock.currentTime();
    if (this._lastStatusTime === null || curTime.subtract(this._lastStatusTime) > 0.5) {
        var status = this._logController.getLogPlaybackStatus();
        var blockLive = this._logController.getBlockLiveData();
        this._attentionServer.sendData("LogStatus", { playStatus: status, blockLive: blockLive });
        this._lastStatusTime = curTime;
    }
};
module.exports = RemoteLogController;

},{"animation-utilities":undefined}],49:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AttentionServer = require("./AttentionServer");
var BodyStreamer = require("./BodyStreamer");
var ParsedSensoryStreamer = require("./ParsedSensoryStreamer");
var DoLookHandler = require("./DoLookHandler");
var DoColorHandler = require("./DoColorHandler");
var DoAnimHandler = require("./DoAnimHandler");
var AttentionModeHandler = require("./AttentionModeHandler");
var RemoteLogController = require("./RemoteLogController");
var CommandLookStreamer = require("./CommandLookStreamer");
var AttentionRuleHandler = require("./AttentionRuleHandler");
/** @interface HasUpdate */
/**
 * @function
 * @name HasUpdate#update
 */
/**
 * @param {AnimationUtilities} animate
 * @param {AttentionManager} attentionManager
 * @param {SensoryLogController} logController
 * @param {DOFArbiter} dofArbiter
 * @param {string} emChannel
 * @constructor
 */
var RemoteVisualizerConnection = function (animate, attentionManager, logController, dofArbiter, emChannel) {
    /**
     * @type {HasUpdate[]}
     * @private
     */
    this._updateables = [];
    /**
     * @type {AttentionServer}
     * @private
     */
    this._attentionServer = new AttentionServer();
    /**
     * @type {BodyStreamer}
     * @private
     */
    this._bodyStreamer = new BodyStreamer(this._attentionServer, animate);
    this._updateables.push(this._bodyStreamer);
    ///**
    // * @type {SensoryStreamer}
    // * @private
    // */
    //this._sensoryStreamer = new SensoryStreamer(this._attentionServer, jibo);
    //this._updateables.push(this._sensoryStreamer);
    /**
     * @type {ParsedSensoryStreamer}
     * @private
     */
    this._parsedSensoryStreamer = new ParsedSensoryStreamer(this._attentionServer);
    attentionManager._sensoryStore.addSensoryListener(this._parsedSensoryStreamer);
    /**
     * @type {RemoteLogController}
     * @private
     */
    this._remoteLogController = new RemoteLogController(this._attentionServer, logController);
    this._updateables.push(this._remoteLogController);
    /**
     * @type {DoLookHandler}
     * @private
     */
    this._doLookHandler = new DoLookHandler(this._attentionServer, animate, attentionManager._lookatConfigs, attentionManager, dofArbiter, emChannel);
    /**
     * @type {DoColorHandler}
     * @private
     */
    this._doColorHandler = new DoColorHandler(this._attentionServer, animate);
    /**
     * @type {DoAnimHandler}
     * @private
     */
    this._doAnimHandler = new DoAnimHandler(this._attentionServer, animate);
    /**
     * @type {?AttentionModeHandler}
     * @private
     */
    this._attentionModeHandler = null;
    /**
     * @type {?AttentionModeHandler}
     * @private
     */
    this._commandLookStreamer = null;
    if (attentionManager != null) {
        this._attentionModeHandler = new AttentionModeHandler(this._attentionServer, attentionManager);
        this._updateables.push(this._attentionModeHandler);
        this._commandLookStreamer = new CommandLookStreamer(this._attentionServer, attentionManager);
        this._updateables.push(this._commandLookStreamer);
        this._attentionRuleHandler = new AttentionRuleHandler(this._attentionServer, attentionManager);
        attentionManager._ruleChangedListener = this._attentionRuleHandler;
    }
};
RemoteVisualizerConnection.prototype.update = function () {
    for (var u = 0; u < this._updateables.length; u++) {
        this._updateables[u].update();
    }
};
module.exports = RemoteVisualizerConnection;

},{"./AttentionModeHandler":38,"./AttentionRuleHandler":39,"./AttentionServer":40,"./BodyStreamer":41,"./CommandLookStreamer":42,"./DoAnimHandler":43,"./DoColorHandler":44,"./DoLookHandler":45,"./ParsedSensoryStreamer":46,"./RemoteLogController":48}],50:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var AnimationUtilities = require("animation-utilities");
var Clock = AnimationUtilities.Clock;
var THREE = AnimationUtilities.THREE;
var Bakery = AnimationUtilities.ui.Bakery;
var AnchoredTargetVisualizer = AnimationUtilities.graphics.AnchoredTargetVisualizer;
var GLTextOverlayPool = AnimationUtilities.graphics.GLTextOverlayPool;
var SensoryRecord = require("../SensoryRecord");
var GLLinePool = AnimationUtilities.graphics.GLLinePool;
/**
 * @type {THREE.Vector3}
 */
var groundPlaneNormal = new THREE.Vector3(0, 0, 1);
var ATObject = function (scene) {
    /**
     * @type {AnchoredTargetVisualizer}
     */
    this.vis = new AnchoredTargetVisualizer(groundPlaneNormal);
    this.vis.installRendererIntoScene(scene);
    if (Bakery.getBoolean("Draw Text", false, "DataVis")) {
        this.textVis = new GLTextOverlayPool(scene);
    }
    else {
        this.textVis = null;
    }
    this.scene = scene;
    this.text = null;
    this.position = null;
};
/**
 *
 * @param {THREE.Vector3} position
 * @return {ATObject}
 */
ATObject.prototype.setPosition = function (position) {
    this.position = position;
    this.vis.setPosition(position);
    this.lastUpdatedTime = Clock.currentTime();
    return this;
};
ATObject.prototype.showText = function (text) {
    this.text = text;
};
ATObject.prototype.release = function () {
    this.vis.removeRendererFromScene(this.scene);
    if (this.textVis !== null) {
        this.textVis.removeFromScene(this.scene);
    }
};
ATObject.prototype.update = function (cullTime) {
    var age = Math.min(1, Math.max(0, Clock.currentTime().subtract(this.lastUpdatedTime) / cullTime));
    var recency = Math.pow(1 - age, 2);
    //console.log("age:"+age);
    this.vis.setBrightness(recency);
    this.vis.setLineWidth(Math.max(0.5, recency * 10));
    if (this.text != null && this.textVis !== null) {
        this.textVis.returnAllLeased();
        this.textVis.lease3D(this.text, this.position.x, this.position.y, this.position.z);
    }
};
var ATObjectStore = function () {
    /**
     * @type {ATObject[]}
     */
    this.atObjects = [];
    /**
     * @type {number}
     */
    this.cullTime = 5;
};
ATObjectStore.prototype.noteObject = function (atObject) {
    //merge?
    this.atObjects.push(atObject);
};
ATObjectStore.prototype.update = function () {
    this.cullOld();
    for (var i = 0; i < this.atObjects.length; i++) {
        this.atObjects[i].update(this.cullTime);
    }
};
ATObjectStore.prototype.cullOld = function () {
    var curTime = Clock.currentTime();
    var i = 0;
    while (i < this.atObjects.length) {
        if (curTime.subtract(this.atObjects[i].lastUpdatedTime) > this.cullTime) {
            this.atObjects[i].release();
            this.atObjects.splice(i, 1);
        }
        else {
            i++;
        }
    }
};
/**
 *
 * @param {BasicScene} scene
 * @constructor
 */
var SensoryVisualizer = function (scene) {
    /**
     * @type {BasicScene}
     */
    this.scene = scene;
    /**
     * @type {ATObjectStore}
     */
    this.objectStore = new ATObjectStore();
    /**
     * @type {GLTextOverlayPool}
     */
    this.globalSpeechPrinter = new GLTextOverlayPool(this.scene);
    /**
     * @type {GLTextOverlayPool}
     */
    this.trackedDataPrinter = new GLTextOverlayPool(this.scene);
    /**
     * @type {GLTextOverlayPool}
     */
    this.commandInfoPrinter = new GLTextOverlayPool(this.scene);
    /**
     * @type {GLTextOverlayPool}
     */
    this.ruleInfoPrinter = new GLTextOverlayPool(this.scene);
    /**
     * @type {GLLinePool}
     */
    this.trackedDataLines = new GLLinePool(this.scene, 100);
    this.trackedDataLines.setLineWidth(3);
    /**
     * @type {AnchoredTargetVisualizer[]}
     */
    this.trackedAnchors = [];
    this.commandLookATV = new AnchoredTargetVisualizer(groundPlaneNormal);
    this.commandLookATV.installRendererIntoScene(this.scene);
    this.commandLookATV.setLineWidth(8);
    this.commandLookATV.setBaseColor(new THREE.Color(0, 1, 0));
    this.attentionRuleSwitches = [];
    setInterval(() => {
        //display a list of all recent attention rule swaps, fade from red to black with recency
        this.ruleInfoPrinter.returnAllLeased();
        var curTime = Clock.currentTime();
        for (var i = 0; i < this.attentionRuleSwitches.length; i++) {
            var rIndex = this.attentionRuleSwitches.length - 1 - i;
            var rule = this.attentionRuleSwitches[rIndex];
            var dt = curTime.subtract(rule.receivedAt);
            var r = Math.min(1, Math.max(0, 2 - dt));
            var rs = Math.round(r * 0xff).toString(16);
            if (rs.length < 2) {
                rs = "0" + rs;
            }
            this.ruleInfoPrinter.lease2D(rule.rule, scene._width - 300, 10 + i * 19, rs + "0000", 18);
            if (dt > 7) {
                this.attentionRuleSwitches.splice(rIndex, 1);
            }
        }
    }, 100);
};
/**
 * @param {SensoryRecord} sensoryRecord
 * @param {boolean} passedFilter
 */
SensoryVisualizer.prototype.showRaw = function (sensoryRecord, passedFilter) {
    var obj;
    var drawRawVision = Bakery.getBoolean("Show Raw Vision", false, "DataVis");
    var drawRawMotion = Bakery.getBoolean("Show Raw Motion", false, "DataVis");
    var drawRawAudio = Bakery.getBoolean("Show Raw Audio", false, "DataVis");
    var drawRawWake = Bakery.getBoolean("Show Raw Wake", true, "DataVis");
    var drawOnlyFiltered = Bakery.getBoolean("Draw only Filtered", true, "DataVis");
    if (passedFilter || !drawOnlyFiltered) {
        if (sensoryRecord.type === SensoryRecord.SensoryType.AUDIO_LOCALIZATION && drawRawAudio) {
            obj = new ATObject(this.scene).setPosition(new THREE.Vector3(sensoryRecord.position.x, sensoryRecord.position.y, sensoryRecord.position.z));
            obj.vis.setBaseColor(new THREE.Color(1, 0, 0.2));
            obj.showText("AUDIO[" + sensoryRecord.id + "]<br>Confidence:" + sensoryRecord.confidence);
            this.objectStore.noteObject(obj);
        }
        else if (sensoryRecord.type === SensoryRecord.SensoryType.VISION && drawRawVision) {
            obj = new ATObject(this.scene).setPosition(new THREE.Vector3(sensoryRecord.position.x, sensoryRecord.position.y, sensoryRecord.position.z));
            obj.vis.setBaseColor(new THREE.Color(0, 1, 0.2));
            obj.showText("VIDEO[" + sensoryRecord.id + "]<br>Confidence:" + sensoryRecord.confidence);
            this.objectStore.noteObject(obj);
        }
        else if (sensoryRecord.type === SensoryRecord.SensoryType.MOTION && drawRawMotion) {
            obj = new ATObject(this.scene).setPosition(new THREE.Vector3(sensoryRecord.position.x, sensoryRecord.position.y, sensoryRecord.position.z));
            obj.vis.setBaseColor(new THREE.Color(0, 0.2, 1));
            obj.showText("MOTION[" + sensoryRecord.id + "]<br>Confidence:" + sensoryRecord.confidence);
            this.objectStore.noteObject(obj);
        }
        else if (sensoryRecord.type === SensoryRecord.SensoryType.WAKE && drawRawWake) {
            var l1 = this.globalSpeechPrinter.lease2D("HEY JIBO", 20, 20, "#ff0000", 50);
            //var l2 = this.globalSpeechPrinter.lease2D("<pre>" + JSON.stringify(sensoryRecord.raw, null, "\t") + "</pre>", 20, 80, "#ff0000", 12);
            var self = this;
            setTimeout(function () {
                self.globalSpeechPrinter.returnLeased(l1);
                //self.globalSpeechPrinter.returnLeased(l2);
            }, 3500);
        }
    }
};
/**
 * @function
 * @param {SensoryRecord} sensoryRecord
 * @param {boolean} passedFilter
 */
SensoryVisualizer.prototype.rawDataAdded = SensoryVisualizer.prototype.showRaw;
/**
 * @param {string} attentionRule
 */
SensoryVisualizer.prototype.notifyAttentionRuleSwitched = function (attentionRuleData) {
    attentionRuleData.receivedAt = Clock.currentTime();
    this.attentionRuleSwitches.push(attentionRuleData);
};
/**
 * Draws the trackedSensory, clears last drawing of tracked sensory
 * @param {TrackedSensory[]} trackedSensory
 */
SensoryVisualizer.prototype.drawTracked = function (trackedSensory) {
    while (trackedSensory.length > this.trackedAnchors.length) {
        var additional = new AnchoredTargetVisualizer(groundPlaneNormal);
        additional.installRendererIntoScene(this.scene);
        additional.setLineWidth(4);
        this.trackedAnchors.push(additional);
    }
    this.trackedDataPrinter.returnAllLeased();
    this.trackedDataLines.returnAllLeased();
    var used = 0;
    var drawText = Bakery.getBoolean("Draw Text", false, "DataVis");
    if (Bakery.getBoolean("Show Tracked Data", true, "DataVis")) {
        while (used < trackedSensory.length) {
            this.trackedAnchors[used].setPosition(trackedSensory[used].position);
            if (drawText) {
                this.trackedDataPrinter.lease3D("WIGGLY " + trackedSensory[used].matches, trackedSensory[used].fastPosition.x, trackedSensory[used].fastPosition.y, trackedSensory[used].fastPosition.z);
            }
            if (trackedSensory[used].type === SensoryRecord.SensoryType.AUDIO_LOCALIZATION || trackedSensory[used].type === SensoryRecord.SensoryType.WAKE) {
                this.trackedAnchors[used].setBaseColor(new THREE.Color(0.7, 0.7, 0.7));
                if (drawText) {
                    var activityString = "none";
                    if (trackedSensory[used].prolongedActivityTracker > 1) {
                        activityString = "PROLONGED";
                        console.log("Prolonged match @ " + trackedSensory[used].confidence + " bg:" + trackedSensory[used].backgroundNoiseLevel);
                    }
                    else if (trackedSensory[used].heavyActivityTracker > 1) {
                        activityString = "HEAVY";
                        console.log("Heavy match @ " + trackedSensory[used].confidence + " bg:" + trackedSensory[used].backgroundNoiseLevel);
                    }
                    else if (trackedSensory[used].lightActivityTracker > 1) {
                        activityString = "LIGHT";
                        console.log("Light match @ " + trackedSensory[used].confidence + " bg:" + trackedSensory[used].backgroundNoiseLevel);
                    }
                    this.trackedDataPrinter.lease3D("<br>Confidence:" + trackedSensory[used].confidence.toFixed(2) + "<br>Activity:" + activityString, trackedSensory[used].fastPosition.x, trackedSensory[used].fastPosition.y, trackedSensory[used].fastPosition.z);
                }
                var useConfidence;
                if (trackedSensory[used].type === SensoryRecord.SensoryType.WAKE) {
                    useConfidence = 1;
                }
                else {
                    useConfidence = trackedSensory[used].confidence;
                }
                this.trackedDataLines.leaseLine(trackedSensory[used].position, new THREE.Vector3().copy(trackedSensory[used].position).add(new THREE.Vector3(0, 0, useConfidence)), new THREE.Color(0, 1, 0));
                if (trackedSensory[used].hasOwnProperty("wakeAt")) {
                    this.trackedDataPrinter.lease3D("<br><BR>HEYY!:", trackedSensory[used].fastPosition.x, trackedSensory[used].fastPosition.y, trackedSensory[used].fastPosition.z, "#ff0000");
                }
            }
            else if (trackedSensory[used].type === SensoryRecord.SensoryType.VISION) {
                this.trackedAnchors[used].setBaseColor(new THREE.Color(0.7, 0.7, 0));
            }
            else if (trackedSensory[used].type === SensoryRecord.SensoryType.MOTION) {
                this.trackedAnchors[used].setBaseColor(new THREE.Color(0.7, 0, 0.7));
            }
            used++;
        }
    }
    //hide unused
    while (used < this.trackedAnchors.length) {
        this.trackedAnchors[used].setPosition(null);
        used++;
    }
};
/**
 * @function
 * @param {{lastTarget:THREE.Vector3, lastCommandEntityIndex:number, lastCommandPrimaryFaceIndex:number, commandLastFired:boolean}} commandLookInfo
 */
SensoryVisualizer.prototype.notifyCommandLookInfo = function (commandLookInfo) {
    this.commandInfoPrinter.returnAllLeased();
    if (commandLookInfo.lastTarget) {
        var p = new THREE.Vector3(commandLookInfo.lastTarget.x - 0.005, commandLookInfo.lastTarget.y, commandLookInfo.lastTarget.z - 0.005);
        this.commandLookATV.setPosition(p);
        if (commandLookInfo.commandLastFired) {
            this.commandInfoPrinter.lease3D("COMMAND Active!", p.x, p.y, p.z, "00a0a0");
        }
    }
    else {
        this.commandLookATV.setPosition(null);
    }
};
/**
 * @function
 * @param {TrackedSensory[]} trackedSensory
 */
SensoryVisualizer.prototype.notifyCurrentTracked = SensoryVisualizer.prototype.drawTracked;
SensoryVisualizer.prototype.update = function () {
    this.objectStore.cullTime = Bakery.getFloat("Visualizer Raw Data Display Time", 0, 20, this.objectStore.cullTime, "DataVis");
    this.objectStore.update();
};
module.exports = SensoryVisualizer;

},{"../SensoryRecord":12,"animation-utilities":undefined}],51:[function(require,module,exports){
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
"use strict";
var slog = require("animation-utilities").slog;
var channel = "ATTENTION";
/**
 * @callback MessageHandler
 * @param {string} type
 * @param {?} data
 */
/**
 * @param {string} address
 * @constructor
 */
var SocketClient = function (address) {
    this.connected = false;
    /**
     * @type {Object.<string, MessageHandler[]>}
     */
    this.handlers = {};
    var self = this;
    var messageHandler = function (event) {
        self.connected = true;
        var packet = null;
        try {
            packet = JSON.parse(event.data);
        }
        catch (e) {
            slog(channel, "JSON parse failed on SocketClient incoming message: " + event.data + " error: " + e, slog.Levels.WARN);
        }
        //slog(channel, "got data: "+event.data);
        if (packet !== null && packet.hasOwnProperty("type")) {
            self.fireHandlers(packet.type, packet.data);
        }
    };
    var closeHandler = function (closeEvent) {
        slog(channel, "Socket Closed (code:" + closeEvent.code + ", reason:" + closeEvent.reason + ", " + (closeEvent.clean ? "cleanly" : "uncleanly") + ")");
        setTimeout(createSocket, 3000);
    };
    var errorHandler = function (errorEvent) {
        //slog(channel, "Socket Error");
    };
    var createSocket = function () {
        if (self.attentionSocket) {
            self.attentionSocket.onmessage = null;
            self.attentionSocket.onclose = null;
            self.attentionSocket.onerror = null;
        }
        self.attentionSocket = new WebSocket(address);
        self.attentionSocket.onmessage = messageHandler;
        self.attentionSocket.onclose = closeHandler;
        self.attentionSocket.onerror = errorHandler;
    };
    createSocket();
};
SocketClient.prototype.sendData = function (type, data) {
    var packet = { type: type, data: data };
    this.attentionSocket.send(JSON.stringify(packet));
};
SocketClient.prototype.fireHandlers = function (type, data) {
    if (this.handlers[type] != null) {
        for (var i = 0; i < this.handlers[type].length; i++) {
            this.handlers[type][i](type, data);
        }
    }
};
/**
 *
 * @param {string} type
 * @param {MessageHandler} handler
 */
SocketClient.prototype.registerHandler = function (type, handler) {
    if (this.handlers[type] == null) {
        this.handlers[type] = [];
    }
    this.handlers[type].push(handler);
};
/**
 *
 * @param {string} type
 * @param {MessageHandler} handler
 */
SocketClient.prototype.removeHandler = function (type, handler) {
    if (this.handlers[type] != null) {
        var index = this.handlers[type].indexOf(handler);
        if (index >= 0) {
            this.handlers[type].splice(index, 1);
        }
        else {
            slog(channel, "Error, asked to remove SC handler (" + type + "), but it was not registered");
        }
        if (this.handlers[type].length === 0) {
            delete (this.handlers[type]);
        }
    }
    else {
        slog(channel, "Error, asked to remove SC handler (" + type + "), but it was not registered");
    }
};
/**
 * @returns {boolean}
 */
SocketClient.prototype.hasConnected = function () {
    return this.connected;
};
module.exports = SocketClient;

},{"animation-utilities":undefined}],52:[function(require,module,exports){
"use strict";
var findRoot = require("find-root");
if (global._attentionutilities_singleton) {
    module.exports = global._attentionutilities_singleton;
}
else {
    /** @type {AttentionManager} */
    module.exports.AttentionManager = require("./AttentionManager");
    module.exports.sensory = {
        DataConverter: require("./DataConverter"),
        SensoryRecord: require("./SensoryRecord")
    };
    module.exports.remote = {
        /** @type {RemoteAttentionManager} */
        RemoteAttentionManager: require("./remote/RemoteAttentionManager"),
        /** @type {SocketClient} */
        SocketClient: require("./remote/SocketClient"),
        /** @type {SensoryVisualizer} */
        SensoryVisualizer: require("./remote/SensoryVisualizer"),
        ///** @type {AttentionServer} */
        //AttentionServer: require("./remote/AttentionServer"),
        ///** @type {VisStreamer} */
        //VisStreamer: require("./remote/VisStreamer"),
        ///** @type {DoLookHandler} */
        //DoLookHandler: require("./remote/DoLookHandler"),
        ///** @type {DoColorHandler} */
        //DoColorHandler: require("./remote/DoColorHandler"),
        ///** @type {AttentionModeHandler} */
        //AttentionModeHandler: require("./remote/AttentionModeHandler"),
        /** @type {RemoteVisualizerConnection} */
        RemoteVisualizerConnection: require("./remote/RemoteVisualizerConnection")
    };
    var configRoot = findRoot(__dirname) + "/config/";
    module.exports.config = {
        "mostly-face": require(configRoot + "mostly-face"),
        "mostly-motion": require(configRoot + "mostly-motion")
    };
    global._attentionutilities_singleton = module.exports;
}

},{"./AttentionManager":5,"./DataConverter":8,"./SensoryRecord":12,"./remote/RemoteAttentionManager":47,"./remote/RemoteVisualizerConnection":49,"./remote/SensoryVisualizer":50,"./remote/SocketClient":51,"find-root":undefined}]},{},[52])(52)
});

//# sourceMappingURL=jibo-attention-manager.js.map
