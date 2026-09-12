(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jiboDofArbiter = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_log_1 = require("jibo-log");
jibo_log_1.Log.processName = 'exp';
exports.default = new jibo_log_1.Log('SSM.Svc.Exp.DA');

},{"jibo-log":undefined}],2:[function(require,module,exports){
"use strict";
/**
 * @author jg
 */
Object.defineProperty(exports, "__esModule", { value: true });
const animation_utilities_1 = require("animation-utilities");
const OwnerInfo_1 = require("./OwnerInfo");
const DOFArbiterPriorityPolicy_1 = require("./DOFArbiterPriorityPolicy");
const DOFEventDispatcher_1 = require("./DOFEventDispatcher");
const log_1 = require("../log");
/**
 * INTERNAL ONLY CLASS
 *
 * The DOFArbiter tracks use of the robot's dofs, and can arbitrate amongst conflicting users.  Each "requester"
 * can have a priority, and its requests can be denied or cancelled by DOF use of higher priority requesters.  Using the
 * animation-utilities functions directly auto-assigns a label of "Direct".  "Direct" requests will never be denied,
 * so the priority assigned to "Direct" will only affect whether other users will be allowed to interrupt its motions,
 * which differs from other elements of the priority config which control both motion initiation and interruption.
 * Because of this, giving "Direct" anything other than the highest priority may create confusing behavior.
 *
 * To be fully deniable/interruptible via the arbitration provided here, use playAnimation and startLookat provided
 * here rather than the animation-utilities alternatives.
 *
 * The DOFArbiter installs a global listener into animation-utilities to catch the start
 * of every animation and lookat.  When an animation/lookat starts through animation utilities, we mark
 * its dofs as assigned to its instance (or to no instance, as transient, for instance-less single-frame uses).
 * Initially every instance is marked as requested by Direct.
 *
 * If the motion command was initialized here through planAnimation/startLookat, the dofs will be re-assigned from
 * "Direct" to the provided requester before the end of the function.
 *
 * @example
 *
 *   DOFArbiter.playAnimation(builder, owner, options)
 *       if(dofs are available to this requester)
 *           update builderToOwner map
 *           instance = builder.play()
 *               fires global "ADDED" event (this happens within the stack of builder.play())
 *                   choose owner from builderToOwnerMap, or "Direct" if not present
 *                   "markInUseByInstance()" assigns dofs to instance and owner
 *           //Not anymore, now assigned correctly in markInUseByInstance.  //"updateOwnerByInstance()" Re-assigns dofs associated with "instance" to "owner"
 *           //dofs now owned by "owner", will auto-release with the end of "instance"
 *       return
 *
 * @namespace jibo.dofarbiter
 * @intdocs
 */
class DOFArbiter {
    constructor() {
        this.debug = false;
        /**
         * This owner is assigned to motions that go through animation utilities directly, bypassing this API
         * @type {string}
         */
        this.directRequester = "Direct";
        /**
         * The main animation layer; we only track ownership over this layer.
         * @type {string}
         */
        this.mainAnimationLayer = "default";
        /**
         * The period of time to keep ownership with previous owner after instance expires; the goal is to allow
         * an owner a small buffer to respond to the instance ending and trigger a followup motion without
         * ownership changing.
         *
         * @type {number}
         */
        this.graceExpiryPeriodS = -0.001; //release immediately for now
        this.defaultOptions = {
            allOrNothing: true
        };
        this.animationUtilities = null;
    }
    /**
     * @method jibo.dofarbiter#init
     * @param {AnimationUtilities} animationUtilities
     * @param {?PriorityConfig} [priorityConfig] optional configuration for the priorities of requesters
     */
    init(animationUtilities, priorityConfig) {
        if (this.animationUtilities === null) {
            this.animationUtilities = animationUtilities;
            this.dofOwners = new Map();
            this.instanceToDOF = new Map();
            this.builderToOwner = new Map();
            this.ownershipListeners = new Map();
            this.ownershipListenersInOrder = [];
            this.eventDispatcher = DOFEventDispatcher_1.default.getInstance();
            if (priorityConfig === null || priorityConfig === undefined) {
                priorityConfig = {
                    priorityForDirectUsers: 5,
                    priorityForUnknownLabels: 2,
                    priorityEntries: [{ owner: "Attention", priority: 1 }]
                };
            }
            this.policy = new DOFArbiterPriorityPolicy_1.DOFArbiterPriorityPolicy(priorityConfig, this.directRequester);
            let dofNames = this.animationUtilities.getRobotInfo().getDOFNames();
            for (let i = 0; i < dofNames.length; i++) {
                let dofName = dofNames[i];
                this.dofOwners.set(dofName, new OwnerInfo_1.OwnershipInformation(dofName));
            }
            this.defaultBuilder = this.animationUtilities.createAnimationBuilderFromPose("DA centerRobot", this.animationUtilities.getRobotInfo().getDefaultDOFValues(), dofNames);
            setInterval(this.update.bind(this), 100);
            animationUtilities.addGlobalAnimationListener(this.globalAnimationEventHandler.bind(this));
            animationUtilities.addGlobalLookatListener(this.globalLookatEventHandler.bind(this));
        }
        else {
            log_1.default.warn("Initialized multiple times!");
        }
    }
    /**
     * Update state, should be called periodically
     * @method jibo.dofarbiter#update
     */
    update() {
        let curTime = animation_utilities_1.Clock.currentTime();
        //TODO: only check on validly expiring dofs, which we could have in an instance queue
        let iter = this.dofOwners.values(); //don't use for of for optimizer
        let nextVal;
        let newlyFreedDOFs = [];
        while (!(nextVal = iter.next()).done) {
            let info = nextVal.value;
            if (info.ownershipStatus === OwnerInfo_1.OwnershipStatusFlag.TIMED_RELEASE) {
                if (curTime.subtract(info.releasedAt) > this.graceExpiryPeriodS) {
                    if (this.debug) {
                        log_1.default.debug(`TIMED_RELEASE for ${info.dof} (owner  ${info.owner}) expiring, releasing`);
                    }
                    info.ownershipStatus = OwnerInfo_1.OwnershipStatusFlag.AVAILABLE;
                    info.owner = null;
                    info.ownerInstance = null;
                    info.releasedAt = null;
                    newlyFreedDOFs.push(info.dof);
                }
            }
        }
        if (newlyFreedDOFs.length > 0) {
            //notify all listeners, priority high to low
            for (let i = this.ownershipListenersInOrder.length - 1; i >= 0; i--) {
                let owner = this.ownershipListenersInOrder[i];
                let listeners = this.ownershipListeners.get(owner);
                if (listeners !== undefined) {
                    for (let j = 0; j < listeners.length; j++) {
                        listeners[j].dofsAvailable(newlyFreedDOFs);
                    }
                }
            }
        }
        this.eventDispatcher.dispatchQueuedEvents();
    }
    /**
     * Try to play this animation; animation may play, play partially, or not play based on current
     * ownership of dofs and policy.
     * @method jibo.dofarbiter#playAnimation
     * @param {AnimationBuilder} builder - the builder to play
     * @param {jibo.dofarbiter.OwnerIdentifier} requester - the identifier of the requesting party (used by arbitration policy)
     * @param {jibo.dofarbiter.DOFOptions} [options] - options that can be taken into account during arbitration
     * @returns {AnimationInstance} instance if intending to play or partially play, null if not intending to play
     */
    playAnimation(builder, requester, options) {
        if (builder.layer !== "default") {
            //we are only arbitrating default-layer builders; others are played immediately as-is
            return builder.play();
        }
        if (options === null || options === undefined) {
            options = this.defaultOptions;
        }
        let desiredDOFs = builder.getDOFs();
        let dofsToUse = this.policy.acquire(requester, desiredDOFs, this.dofOwners, options);
        if (this.debug) {
            log_1.default.debug(`Anim requester:  ${requester}  is going to be allowed (${dofsToUse}) of (${desiredDOFs})`);
        }
        else {
            log_1.default.debug(`Anim requester:  ${requester}  acquired ${dofsToUse.length} DOFs.`);
        }
        builder.setDOFs(dofsToUse);
        this.builderToOwner.set(builder, requester);
        let instance = builder.play(); //Doing this even if no DOFs available to fire "cancelled" on the builder
        this.builderToOwner.delete(builder);
        if (instance !== null) {
            // this.updateOwnerByInstance(requester, instance); //now should happen correctly in global callback
        }
        else {
            log_1.default.warn("Got null anim instance!");
        }
        builder.setDOFs(desiredDOFs); //restore desired dofs
        this.eventDispatcher.dispatchQueuedEvents();
        if (dofsToUse.length > 0) {
            return instance;
        }
        else {
            // log.debug(`Rejecting ${requester}`);
            return null;
        }
    }
    /**
     * @method jibo.dofarbiter#startLookat
     * @param {LookatBuilder} builder - the builder to play
     * @param {jibo.dofarbiter.OwnerIdentifier} requester - the identifier of the requesting party (used by arbitration policy)
     * @param {THREE.Vector3} target - lookat target
     * @param {jibo.dofarbiter.DOFOptions} [options] - options that can be taken into account during arbitration
     * @returns {LookatInstance} instance if intending to play or partially play, null if not intending to play
     */
    startLookat(builder, requester, target, options) {
        if (options === null || options === undefined) {
            options = this.defaultOptions;
        }
        let desiredDOFs = builder.getDOFs();
        let dofsToUse = this.policy.acquire(requester, desiredDOFs, this.dofOwners, options);
        if (this.debug) {
            log_1.default.debug(`LookAt requester:  ${requester}  is going to be allowed (${dofsToUse}) of (${desiredDOFs})`);
        }
        else {
            log_1.default.debug(`LookAt requester:  ${requester}  acquired requested DOFs.`);
        }
        builder.setDOFs(dofsToUse);
        this.builderToOwner.set(builder, requester);
        let instance = builder.startLookat(target); //Doing this even if no DOFs available to fire "cancelled" on the builder
        this.builderToOwner.delete(builder);
        if (instance !== null) {
            // this.updateOwnerByInstance(requester, instance); //now should happen correctly in global callback
        }
        else {
            log_1.default.warn("Got null lookAt instance!");
        }
        builder.setDOFs(desiredDOFs); //restore desired dofs
        this.eventDispatcher.dispatchQueuedEvents();
        if (dofsToUse.length > 0) {
            return instance;
        }
        else {
            return null;
        }
    }
    /**
     * Restore the robot to its default pose, respecting current base orientation.
     * Centering may occur fully, partially, or not at all based on current ownership of dofs and policy.
     *
     * Optional arguments allow specification of which DOFs to include in the centering behavior and
     * whether the centering behavior should restore the robot to its global "home" orientation. By default, the
     * centering behavior will include all DOFs and will preserve the robot's current local orientation.
     * @method jibo.dofarbiter#centerRobot
     * @param {jibo.dofarbiter.OwnerIdentifier} requester - The identifier of the requesting party (used by arbitration policy).
     * @param {jibo.animate.DOFSet} [whichDOFs] - Set of DOFs to restore to default position. Defaults to all DOFs.
     * @param {boolean} [centerGlobally=false] - If `true`, also restores the robot to its global "home" orientation.
     * @param {Function} [completionCallback] - Called when centering behavior completes or is interrupted.
     */
    centerRobot(requester, whichDOFs = null, centerGlobally = false, completionCallback = null) {
        if (whichDOFs === null) {
            whichDOFs = this.animationUtilities.dofs.ALL;
        }
        let desiredDOFs = whichDOFs.getDOFs();
        let options = {
            allOrNothing: false
        };
        let dofsToUse = this.policy.acquire(requester, desiredDOFs, this.dofOwners, options);
        if (this.debug) {
            log_1.default.debug(`CenterRobot requester:  ${requester}  is going to be allowed (${dofsToUse}) of (${desiredDOFs})`);
        }
        else {
            log_1.default.debug(`CenterRobot requester:  ${requester}  acquired requested DOFs.`);
        }
        if (dofsToUse.length > 0) {
            let animBuilder = this.defaultBuilder.getCleanCopy();
            animBuilder.setDOFs(dofsToUse);
            let builderCount = 1;
            let resetBase = centerGlobally && dofsToUse.indexOf(this.animationUtilities.dofs.BASE.getDOFs()[0]) > -1;
            let lookatBuilder = null;
            if (resetBase) {
                lookatBuilder = this.animationUtilities.createLookatBuilder();
                lookatBuilder.setDOFs(this.animationUtilities.dofs.BASE);
                builderCount++;
            }
            if (completionCallback) {
                let builderFinished = function () {
                    builderCount--;
                    if (builderCount === 0) {
                        completionCallback();
                    }
                };
                animBuilder.on("CANCELLED", builderFinished);
                animBuilder.on("STOPPED", builderFinished);
                if (lookatBuilder) {
                    lookatBuilder.on("CANCELLED", builderFinished);
                    lookatBuilder.on("STOPPED", builderFinished);
                }
            }
            this.builderToOwner.set(animBuilder, requester);
            let animInstance = animBuilder.play();
            this.builderToOwner.delete(animBuilder);
            if (animInstance === null) {
                log_1.default.warn("centerRobot got null anim instance!");
            }
            if (lookatBuilder) {
                this.builderToOwner.set(lookatBuilder, requester);
                let lookatInstance = lookatBuilder.startLookat([1.0, 0.0, 0.0]);
                this.builderToOwner.delete(lookatBuilder);
                if (lookatInstance === null) {
                    log_1.default.warn("centerRobot got null lookAt instance!");
                }
            }
            this.eventDispatcher.dispatchQueuedEvents();
        }
        else {
            // we didn't acquire any DOFs, notify the completionCallback
            if (completionCallback) {
                completionCallback();
            }
        }
    }
    /**
     * Restore the robot to its default pose, respecting current base orientation.
     * Centering may occur fully, partially, or not at all based on current ownership of dofs and policy.
     *
     * "requestor" priority will be used to seize the DOFs for this operation, but the operation will otherwise
     * be performed at "trustee" priority.
     *
     * Optional arguments allow specification of which DOFs to include in the centering behavior,
     * whether the centering behavior should restore the robot to its global "home" orientation, and allow filtering
     * set of DOFs based on most recent owner. By default, the centering behavior will include all DOFs and will
     * preserve the robot's current local orientation.
     *
     * @method jibo.dofarbiter#centerWithHybridPriority
     * @param {jibo.dofarbiter.OwnerIdentifier} requester - The identifier of the requesting party, only DOFs available to this party will be considered for centering.
     * @param {jibo.dofarbiter.OwnerIdentifier} trustee - This will be the identifier used for the ongoing centering operation (relevant for those that try to interrupt).
     * @param {jibo.animate.DOFSet} [desiredDOFSet] - Set of DOFs to consider. Defaults to all DOFs.
     * @param {jibo.dofarbiter.OwnerIdentifier[]} onlyForOwners - If provided, will only center the subset of desiredDOFs currently or most recently owned by these owners.
     * @param {boolean} [centerGlobally=false] - If `true`, also restores the robot to its global "home" orientation.
     * @param {Function} [completionCallback] - Called when centering behavior completes or is interrupted.
     */
    centerWithHybridPriority(requester, trustee, desiredDOFSet = null, onlyForOwners = null, centerGlobally = false, completionCallback) {
        if (desiredDOFSet === null) {
            desiredDOFSet = this.animationUtilities.dofs.ALL;
        }
        let useDOFs = desiredDOFSet.getDOFs();
        if (onlyForOwners !== null) {
            useDOFs = this.getDOFsMostRecentlyOwnedBy(useDOFs, onlyForOwners);
        }
        //filter based on who we can take
        useDOFs = this.policy.acquire(requester, useDOFs, this.dofOwners, { allOrNothing: false });
        //now we have subset of dofs available to requester
        //assign those dofs to trustee, so all will be available to traditional center robot call
        let dofChanges = this.markAsUsedByTransient(trustee, useDOFs);
        this.eventDispatcher.queueEvent(this.notifyListenersOfDOFLoss, this, [dofChanges.dofLosses]);
        this.eventDispatcher.queueEvent(this.notifyListenerOfDOFGain, this, [dofChanges.dofGains.owner, dofChanges.dofGains.dofs]);
        //we will not have any dof changes when we call centerRobot, as we've just assigned the exact set it will grab
        //so, queue these dof changes for transmission
        //could potentially send out dofs-released here or at end
        this.centerRobot(trustee, this.animationUtilities.dofs.ALL.createFromDofs(useDOFs), centerGlobally, completionCallback);
    }
    /**
     * Attempt to claim the provided dofs under responsibility of the provided instance.
     * Instance should not be null, as the dofs will be waiting to be released by STOPPED/CANCELLED
     * from that instance.  This will only claim dofs that are available according to the policy;
     * the set of dofs actually claimed will be returned.
     *
     * NOTE: Even if zero dofs are returned, we still expect a STOPPED/CANCELLED event for this instance, so caller
     * should still .play or .start etc.
     * @method jibo.dofarbiter#attemptToClaimForInstance
     * @param {jibo.dofarbiter.OwnerIdentifier} requester
     * @param {any} instance
     * @param {string[]} desiredDOFs
     * @param {jibo.dofarbiter.DOFOptions} [options]
     * @returns {string[]}
     */
    attemptToClaimForInstance(requester, instance, desiredDOFs, options) {
        if (options === null || options === undefined) {
            options = this.defaultOptions;
        }
        let dofsToUse = this.policy.acquire(requester, desiredDOFs, this.dofOwners, options);
        this.markInUseByInstance(requester, instance, dofsToUse);
        return dofsToUse;
    }
    /**
     *
     * @method jibo.dofarbiter#getAvailable
     * @param {jibo.dofarbiter.OwnerIdentifier} requester
     * @param {any} instance
     * @param {string[]} desiredDOFs
     * @param {jibo.dofarbiter.DOFOptions} [options]
     * @returns {string[]}
     */
    getAvailable(requester, desiredDOFs, options) {
        if (options === null || options === undefined) {
            options = this.defaultOptions;
        }
        let availableDOFs = this.policy.acquire(requester, desiredDOFs, this.dofOwners, options);
        return availableDOFs;
    }
    /**
     *
     * @method jibo.dofarbiter#getDofsInUse
     * @param requester {jibo.dofarbiter.OwnerIdentifier}
     * @returns {string[]}
     */
    getDofsInUse(requester) {
        //if this is frequent could also store the reverse map.
        let dofsInUse = [];
        let iter = this.dofOwners.values(); //don't use for of for optimizer
        let nextVal;
        while (!(nextVal = iter.next()).done) {
            let info = nextVal.value;
            if (info.owner === requester) {
                dofsInUse.push(info.dof);
            }
        }
        return dofsInUse;
    }
    /**
     *
     * @method jibo.dofarbiter#addListener
     * @param forEventsForOwner {jibo.dofarbiter.OwnerIdentifier}
     * @param listener {jibo.dofarbiter.DOFOwnershipListener}
     * @returns {string[]}
     */
    addListener(forEventsForOwner, listener) {
        let listenersForOwner = this.ownershipListeners.get(forEventsForOwner);
        if (listenersForOwner === undefined) {
            listenersForOwner = [];
            this.ownershipListeners.set(forEventsForOwner, listenersForOwner);
        }
        if (listenersForOwner.indexOf(listener) < 0) {
            listenersForOwner.push(listener);
            this.ownershipListenersInOrder = this.policy.ownerPriorityOrder(Array.from(this.ownershipListeners.keys()));
        }
    }
    /**
     *
     * @method jibo.dofarbiter#removeListener
     * @param forEventsForOwner {jibo.dofarbiter.OwnerIdentifier}
     * @param listener {jibo.dofarbiter.DOFOwnershipListener}
     * @returns {string[]}
     */
    removeListener(forEventsForOwner, listener) {
        let listenersForOwner = this.ownershipListeners.get(forEventsForOwner);
        if (listenersForOwner !== undefined) {
            let index = listenersForOwner.indexOf(listener);
            if (index >= 0) {
                listenersForOwner.splice(index, 1);
                //remove empty arrays completely from map
                if (listenersForOwner.length === 0) {
                    this.ownershipListeners.delete(forEventsForOwner);
                }
                this.ownershipListenersInOrder = this.policy.ownerPriorityOrder(Array.from(this.ownershipListeners.keys()));
            }
        }
    }
    /**
     * Get the subset of the provided dofs which are most recently owned by the provided owners
     *
     * @method jibo.dofarbiter#getDOFsMostRecentlyOwnedBy
     * @param desiredDOFs {string[]} - returned list will the subset of this list that match the provided owners
     * @param onlyForOwners {jibo.dofarbiter.OwnerIdentifier[]} - returned list will only include dofs most recently owned by these owners
     * @returns {string[]}
     * @private
     */
    getDOFsMostRecentlyOwnedBy(desiredDOFs, onlyForOwners) {
        let filteredDOFs = [];
        for (let i = 0; i < desiredDOFs.length; i++) {
            let dof = desiredDOFs[i];
            let ownershipInfo = this.dofOwners.get(dof);
            let mostRecentOwner = ownershipInfo.mostRecentOwner;
            for (let j = 0; j < onlyForOwners.length; j++) {
                if (mostRecentOwner === onlyForOwners[j]) {
                    filteredDOFs.push(dof);
                    break;
                }
            }
        }
        return filteredDOFs;
    }
    /**
     *
     * @method jibo.dofarbiter#notifyListenersOfDOFLoss
     * @param dofLosses {DOFLosses}
     * @private
     */
    notifyListenersOfDOFLoss(dofLosses) {
        let ownersLosingDOFs = Object.keys(dofLosses);
        for (let i = 0; i < ownersLosingDOFs.length; i++) {
            let owner = ownersLosingDOFs[i];
            let listenersForOwner = this.ownershipListeners.get(owner);
            if (listenersForOwner !== undefined) {
                let dofsLost = dofLosses[owner];
                for (let j = 0; j < listenersForOwner.length; j++) {
                    listenersForOwner[j].dofsLost(owner, dofsLost);
                }
            }
        }
    }
    /**
     *
     * @method jibo.dofarbiter#notifyListenerOfDOFGain
     * @param ownerGaining {jibo.dofarbiter.OwnerIdentifier}
     * @param dofsBeingGained {stringp[]}
     * @private
     */
    notifyListenerOfDOFGain(ownerGaining, dofsBeingGained) {
        let listenersForOwner = this.ownershipListeners.get(ownerGaining);
        if (listenersForOwner !== undefined) {
            for (let i = 0; i < listenersForOwner.length; i++) {
                listenersForOwner[i].dofsGained(ownerGaining, dofsBeingGained);
            }
        }
    }
    //not needed anymore, as markInUseByInstance will be provided the correct requester through builderToOwner map
    ///**
    // * Change all the dofs owned by instance to be labeled by requester.  Intended to be called
    // * by {@link playAnimation} and {@link startLookat}, after the global event fires which will
    // * assign instance ownership, but before the function exits.
    // *
    // * @param requester
    // * @param instance
    // */
    //private updateOwnerByInstance(requester:OwnerIdentifier, instance:any){
    //	let dofs = this.instanceToDOF.get(instance);
    //	if(dofs !== null){
    //		for(let i = 0; i < dofs.length; i++){
    //			let info = this.dofOwners.get(dofs[i]);
    //			if(info.ownerInstance !== instance){
    //				console.log("DOFArbiter Error, expected all dofs claimed by instance "+(instance!==null?instance.getName():"null")+" to be still owned by it at \"updateOwnerByInstance()\" time, but "+dofs[i]+" isn't");
    //			}else {
    //				info.owner = requester;
    //			}
    //		}
    //	}else{
    //		console.log("DOFArbiter Error, instance not recognized!");
    //	}
    //}
    /**
     * Mark in use; they will be marked ACTIVE_AUTO, and the instance will be save to use for later release or labeling.
     * @method jibo.dofartbiter#markInUseByInstance
     * @param requester {jibo.dofarbiter.OwnerIdentifier}
     * @param instance {any}
     * @param dofsToUse {string[]}
     * @return {DOFChanges}
     * @private
     */
    markInUseByInstance(requester, instance, dofsToUse) {
        let dofLosses = {};
        let dofsGained = [];
        this.instanceToDOF.set(instance, dofsToUse); //even if we have no dofs, this will work; cancelled will be generated (through dispatcher), and we will free the zero dofs in callback
        for (let i = 0; i < dofsToUse.length; i++) {
            let dofToUse = dofsToUse[i];
            let info = this.dofOwners.get(dofToUse);
            if (info.owner !== requester) {
                dofsGained.push(dofToUse);
                if (info.owner !== null) {
                    if (dofLosses[info.owner] === undefined) {
                        dofLosses[info.owner] = [];
                    }
                    dofLosses[info.owner].push(dofToUse);
                }
            }
            info.owner = requester;
            info.mostRecentOwner = requester;
            info.ownerInstance = instance;
            info.ownershipStatus = OwnerInfo_1.OwnershipStatusFlag.ACTIVE_AUTO;
            info.releasedAt = null;
        }
        return { dofLosses: dofLosses, dofGains: { owner: requester, dofs: dofsGained } };
    }
    /**
     * Mark in use by transient; they will be marked TIMED_RELEASE, to expire
     * after a time period, since there is no owner to hold/release them
     * @method jibo.dofartbiter#markAsUsedByTransient
     * @param requester {jibo.dofarbiter.OwnerIdentifier}
     * @param dofsToUse {string[]}
     * @return {DOFChanges}
     * @private
     */
    markAsUsedByTransient(requester, dofsToUse) {
        let dofLosses = {};
        let dofsGained = [];
        let curTime = animation_utilities_1.Clock.currentTime();
        for (let i = 0; i < dofsToUse.length; i++) {
            let dofToUse = dofsToUse[i];
            let info = this.dofOwners.get(dofToUse);
            if (info.owner !== requester) {
                dofsGained.push(dofToUse);
                if (info.owner !== null) {
                    if (dofLosses[info.owner] === undefined) {
                        dofLosses[info.owner] = [];
                    }
                    dofLosses[info.owner].push(dofToUse);
                }
            }
            info.owner = requester;
            info.mostRecentOwner = requester;
            info.ownershipStatus = OwnerInfo_1.OwnershipStatusFlag.TIMED_RELEASE;
            info.ownerInstance = null;
            info.releasedAt = curTime;
        }
        return { dofLosses: dofLosses, dofGains: { owner: requester, dofs: dofsGained } };
    }
    /**
     * This handler should be installed to get events from the animationUtilities instance.
     * When ADDED, we mark the dofs and the responsible instance; we expect to get a STOPPED/CANCELLED
     * for EVERY instance that comes into this function.  If this is an animation being played through
     * {@link playAnimation}, then the the playAnimation function will label this instance with the requester's
     * id right after this event, before the playAnimation call stack exits.
     * @method jibo.dofarbiter#globalAnimationEventHandler
     * @param eventName {string}
     * @param instance {jibo.animate.AnimationInstance}
     * @param payload {any}
     * @private
     */
    globalAnimationEventHandler(eventName, instance, payload) {
        if (payload.layer === this.mainAnimationLayer || eventName !== "ADDED") {
            this.globalEventHandler(eventName, instance, payload);
        }
    }
    /**
     *
     * @method jibo.dofarbiter#globalLookatEventHandler
     * @param eventName {string}
     * @param instance {jibo.animate.LookatInstance}
     * @param payload {any}
     * @private
     */
    globalLookatEventHandler(eventName, instance, payload) {
        this.globalEventHandler(eventName, instance, payload);
    }
    /**
     *
     * @method jibo.dofarbiter#globalEventHandler
     * @param eventName {string}
     * @param instance {any}
     * @param payload {any}
     * @private
     */
    globalEventHandler(eventName, instance, payload) {
        if (eventName === "ADDED") {
            let dofs = payload.dofs;
            let requester = this.directRequester;
            let dofChanges;
            /**
             * true if we are being called directly though animation-utilities, set false if we are being called
             * through DOFArbiter playAnimation/startLookat APIs
             * @type {boolean}
             */
            let directCall;
            if (payload['instant']) {
                directCall = true; //currently transient usage is only direct
                dofChanges = this.markAsUsedByTransient(requester, dofs);
                if (this.debug) {
                    log_1.default.debug(`Global ADDED:, marking in-use TRANSIENTLY by ${(directCall ? "DIRECT" : "DA-Managed")} requester: ${requester}, description: ${payload["instant"]} (${dofs})`);
                }
            }
            else {
                //if we are playing this builder through playAnimation or startLookat, our builder will be installed
                //in builderToOwner pointing to the correct requester.
                let assignedOwner = this.builderToOwner.get(instance.getBuilder());
                if (assignedOwner !== undefined) {
                    directCall = false;
                    requester = assignedOwner;
                }
                else {
                    directCall = true;
                }
                dofChanges = this.markInUseByInstance(requester, instance, dofs);
                if (this.debug) {
                    log_1.default.debug(`Global ADDED:, marking in-use by ${(directCall ? "DIRECT" : "DA-Managed")} requester: ${requester}, instance: ${(instance !== null ? instance.getName() : "null")} (${dofs})`);
                }
            }
            if (directCall) {
                //if we were called directly, we'll send out the event now
                this.notifyListenersOfDOFLoss(dofChanges.dofLosses);
                this.notifyListenerOfDOFGain(dofChanges.dofGains.owner, dofChanges.dofGains.dofs);
            }
            else {
                //otherwise, we'll queue for dispatch at the end of playAnimation/startLookat
                this.eventDispatcher.queueEvent(this.notifyListenersOfDOFLoss, this, [dofChanges.dofLosses]);
                this.eventDispatcher.queueEvent(this.notifyListenerOfDOFGain, this, [dofChanges.dofGains.owner, dofChanges.dofGains.dofs]);
            }
        }
        else if (eventName === "CANCELLED" || eventName === "STOPPED") {
            //we will get any cancelled/stopped _after_ the corresponding ADDED above; thus we do not need to queue
            //any dof-lost events here, as any dofs will already have been considered lost when the newcomer gets ADDED.
            let relatedDOFs = this.instanceToDOF.get(instance);
            let didAnyRelease = false;
            if (relatedDOFs !== undefined && relatedDOFs !== null) {
                if (this.debug) {
                    log_1.default.debug(`Clearing ownership (${eventName}) of all dofs for instance: ${(instance !== null ? instance.getName() : "null")}, at most ${relatedDOFs.length}`);
                }
                for (let i = 0; i < relatedDOFs.length; i++) {
                    let relatedDOF = relatedDOFs[i];
                    let info = this.dofOwners.get(relatedDOF);
                    if (info.ownerInstance === instance) {
                        if (this.debug) {
                            log_1.default.debug(`Clearing ACTIVE_AUTO status of dof ${relatedDOF} to TIMED_RELEASE, owned by ${info.owner}`);
                        }
                        if (info.ownershipStatus === OwnerInfo_1.OwnershipStatusFlag.ACTIVE_AUTO) {
                            info.ownershipStatus = OwnerInfo_1.OwnershipStatusFlag.TIMED_RELEASE;
                            info.releasedAt = animation_utilities_1.Clock.currentTime();
                            didAnyRelease = true;
                        }
                    }
                    else {
                        if (this.debug) {
                            log_1.default.debug(`Not modifying status of dof ${relatedDOF} as it is no longer associated with this instance`);
                        }
                    }
                }
                this.instanceToDOF.delete(instance);
            }
            else {
                log_1.default.debug(`Error, got ${eventName} for instance ${(instance !== null ? instance.getName() : "null")} which is unregistered`);
            }
            if (didAnyRelease) {
                //immediately cause the auto-release of dofs if they have timed out
                //TODO: handle this better (straight to AVAILABLE when desired)?
                this.update();
            }
        }
    }
}
exports.default = DOFArbiter;

},{"../log":1,"./DOFArbiterPriorityPolicy":3,"./DOFEventDispatcher":4,"./OwnerInfo":5,"animation-utilities":undefined}],3:[function(require,module,exports){
"use strict";
/**
 * @author jg
 * Copyright 2016 IF Robots LLC
 */
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
/**
 * @class DOFArbiterPriorityPolicy
 * @memberof jibo.dofarbiter
 * @intdocs
 */
class DOFArbiterPriorityPolicy {
    constructor(config, directCommandsLabel) {
        this.priorityMap = new Map();
        this.debug = false;
        this.debugPrintFailedGrab = false; //for when you want to only print on the failed dof grab
        this.unknownRequesterIDPriority = config.priorityForUnknownLabels;
        this.priorityMap = new Map();
        for (let i = 0; i < config.priorityEntries.length; i++) {
            this.priorityMap.set(config.priorityEntries[i].owner, config.priorityEntries[i].priority);
        }
        this.priorityMap.set(directCommandsLabel, config.priorityForDirectUsers);
    }
    /**
     * @method jibo.dofarbiter.DOFArbiterPriorityPolicy#acquire
     * @description Check which dofs can be used by requester.  Dofs which are available for use by requester will be returned.
     * @param {jibo.dofarbiter.OwnerIdentifier} requester - the requester
     * @param {string[]} dofs - the desired dofs
     * @param {Map} dofOwners - Map of `string` to `OwnershipInformation`. Structure with the current dof ownership information
     * @param {jibo.dofarbiter.DOFOptions} options - options that might affect this request
     * @return {string[]} the subset of provided dofs that are available for immediate acquisition
     */
    acquire(requester, dofs, dofOwners, options) {
        let allowedDOFs = [];
        let deniedDOFs = [];
        let deniedDOFOwners = new Set();
        let newPriority = this.priorityMap.get(requester);
        if (this.debug) {
            log_1.default.debug(`Requester ${requester} has priority ${newPriority} ${(newPriority === undefined ? `(= ${this.unknownRequesterIDPriority})` : "")}`);
        }
        if (newPriority === undefined) {
            newPriority = this.unknownRequesterIDPriority;
        }
        for (let i = 0; i < dofs.length; i++) {
            let currentOwnerInfo = dofOwners.get(dofs[i]);
            if (!currentOwnerInfo) {
                // this should _never_ happen
                log_1.default.warn(`No ownership info found for dof ${dofs[i]} requested by ${requester}; all requested DOFs: [${dofs}]`);
                let currentDOFOwners = [];
                let iter = dofOwners.entries(); //don't use for of for optimizer
                let nextEntry;
                while (!(nextEntry = iter.next()).done) {
                    let dofName = nextEntry.value[0];
                    let info = nextEntry.value[1];
                    if (info) {
                        currentDOFOwners.push(`${dofName}: ${info.owner} (${(info.ownerInstance && info.ownerInstance.getName ? info.ownerInstance.getName() : "")})`);
                    }
                    else {
                        currentDOFOwners.push(`${dofName}: empty info (${info})`);
                    }
                }
                log_1.default.warn(`Current ownership info for all known DOFs: [${currentDOFOwners}]`);
                log_1.default.warn(`Request will be rejected; stack is: ${new Error().stack}`);
                return [];
            }
            if (this.debug) {
                log_1.default.debug(`Current owner for ${dofs[i]} is ${currentOwnerInfo.owner}, priority: ${(currentOwnerInfo.owner === null ? "N/A" : this.priorityMap.get(currentOwnerInfo.owner))}`);
            }
            let currentPriority;
            if (currentOwnerInfo.owner === requester ||
                currentOwnerInfo.owner === null ||
                (currentPriority = this.priorityMap.get(currentOwnerInfo.owner)) < newPriority ||
                (currentPriority === undefined && this.unknownRequesterIDPriority < newPriority)) {
                //dof is either not owned, owned by us, or owned by something with less priority than us
                allowedDOFs.push(dofs[i]);
            }
            else {
                if (this.debug || this.debugPrintFailedGrab) {
                    log_1.default.debug(`Requester ${requester} denied dof ${dofs[i]}, owned by ${currentOwnerInfo.owner} (${(currentOwnerInfo.ownerInstance && currentOwnerInfo.ownerInstance.getName ? currentOwnerInfo.ownerInstance.getName() : "")}) with priority ${currentPriority} ${(currentPriority === undefined ? `(=${this.unknownRequesterIDPriority})` : "")}`);
                }
                deniedDOFs.push(dofs[i]);
                deniedDOFOwners.add(`(${currentOwnerInfo.owner}, ${((currentOwnerInfo.ownerInstance && currentOwnerInfo.ownerInstance.getName) ? currentOwnerInfo.ownerInstance.getName() : currentOwnerInfo.owner)}, ` +
                    `${(currentPriority === undefined ? this.unknownRequesterIDPriority : currentPriority)})`);
            }
        }
        // At least one dof is not included
        if (deniedDOFs.length > 0) {
            if (options.allOrNothing) {
                if (newPriority >= this.unknownRequesterIDPriority) {
                    log_1.default.info(`Requester:  ${requester}  was rejected because DOFs:  [${deniedDOFs}]  are held by owners:  [${Array.from(deniedDOFOwners)}]`);
                }
                allowedDOFs = [];
            }
            else {
                if (newPriority >= this.unknownRequesterIDPriority) {
                    log_1.default.info(`Requester:  ${requester}  did not receive DOFs:  [${deniedDOFs}]  because they are held by owners:  [${Array.from(deniedDOFOwners)}]`);
                }
            }
        }
        return allowedDOFs;
    }
    /**
     * Generate a list of owners in priority order, low to high, including only the owners
     * passed in.
     * @method jibo.dofarbiter.DOFArbiterPriorityPolicy#ownerPriorityOrder
     * @param {OwnerIdentifier[]} owners - owners to list in order
     * @returns {OwnerIdentifier[]} in order (low to high) of owners based on priority
     */
    ownerPriorityOrder(owners) {
        let ownersWithPriority = [];
        for (let i = 0; i < owners.length; i++) {
            let owner = owners[i];
            let ownerPriority = this.priorityMap.get(owner);
            if (ownerPriority === undefined) {
                ownerPriority = this.unknownRequesterIDPriority;
            }
            ownersWithPriority.push({ owner: owner, priority: ownerPriority });
        }
        ownersWithPriority.sort(function (a, b) { return a.priority - b.priority; });
        let ownersInOrder = [];
        for (let i = 0; i < ownersWithPriority.length; i++) {
            ownersInOrder.push(ownersWithPriority[i].owner);
        }
        return ownersInOrder;
    }
}
exports.DOFArbiterPriorityPolicy = DOFArbiterPriorityPolicy;

},{"../log":1}],4:[function(require,module,exports){
"use strict";
/**
 * Queue DOF events until the end of the DOF operations so callbacks will
 * not happen within DOFArbiter stack while structures are being updated
 *
 * @author jg
 */
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
let _instance = null;
let _locked = false;
/**
 * @class DOFEventDispatcher
 * @memberof jibo.dofarbiter
 * @intdocs
 */
class DOFEventDispatcher {
    constructor() {
        this.eventQueue = [];
        if (_locked) {
            throw Error("Use 'getInstance()'");
        }
    }
    /**
     * Get the singleton instance.  Will always be the same instance, ok to cache.
     * @method jibo.dofarbiter.DOFEventDispatcher#getInstance
     * @returns {DOFEventDispatcher}
     */
    static getInstance() {
        return _instance;
    }
    /**
     * @method jibo.dofarbiter.DOFEventDispatcher#queueEvent
     * @param {Function} theFunction - function or method to call
     * @param {any} theObject - the "this" object associated with this method.  null is fine if method doesn't need "this"
     * @param {any[]} theArgs - array o <-- really guys?
     */
    queueEvent(theFunction, theObject, theArgs) {
        if (theFunction === null || theFunction === undefined) {
            log_1.default.warn(`Error, null/undefined function queued!\n ${new Error().stack}`);
        }
        this.eventQueue.push({ f: theFunction, o: theObject, a: theArgs });
    }
    /**
     * @method jibo.dofarbiter.DOFEventDispatcher#dispatchQueuedEvents
     * @description Dispatch all the queued events
     */
    dispatchQueuedEvents() {
        for (let i = 0; i < this.eventQueue.length; i++) {
            let e = this.eventQueue[i];
            e.f.apply(e.o, e.a);
        }
        this.eventQueue.length = 0;
    }
}
exports.default = DOFEventDispatcher;
_instance = new DOFEventDispatcher();
_locked = true;

},{"../log":1}],5:[function(require,module,exports){
"use strict";
/**
 * @author jg
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @typedef OwnershipStatusFlag
 * @memberof jibo.dofarbiter
 * @prop AVAILABLE not in use
 * @prop ACTIVE_AUTO In use, in auto mode (waiting for instance to end, will release to TIMED_RELEASE at that point)
 * @prop ACTIVE_LOCKED In use, in manual mode (will not release without explicit command, not tied to an instance's lifecycle)
 * @prop TIMED_RELEASE Still marked as in use, but on countdown to release.  Will automatically release to AVAILABLE after a
 * 											fixed time from entering this mode.
 */
var OwnershipStatusFlag;
(function (OwnershipStatusFlag) {
    OwnershipStatusFlag[OwnershipStatusFlag["AVAILABLE"] = 0] = "AVAILABLE";
    OwnershipStatusFlag[OwnershipStatusFlag["ACTIVE_AUTO"] = 1] = "ACTIVE_AUTO";
    OwnershipStatusFlag[OwnershipStatusFlag["ACTIVE_LOCKED"] = 2] = "ACTIVE_LOCKED";
    OwnershipStatusFlag[OwnershipStatusFlag["TIMED_RELEASE"] = 3] = "TIMED_RELEASE";
})(OwnershipStatusFlag = exports.OwnershipStatusFlag || (exports.OwnershipStatusFlag = {}));
/**
 * @class OwnershipInformation
 * @memberof jibo.dofarbiter
 * @param dof {string}
 * @intdocs
 */
class OwnershipInformation {
    constructor(dof) {
        this.dof = dof;
        this.owner = null;
        this.ownershipStatus = OwnershipStatusFlag.AVAILABLE;
        this.releasedAt = null;
    }
}
exports.OwnershipInformation = OwnershipInformation;

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DOFArbiter_1 = require("./DOFArbiter");
exports.DOFArbiter = DOFArbiter_1.default;

},{"./DOFArbiter":2}],7:[function(require,module,exports){
/**
 * @type {DOFArbiter}
 */
let DOFArbiter = require("./main");
module.exports = DOFArbiter;

},{"./main":6}]},{},[7])(7)
});

//# sourceMappingURL=jibo-dof-arbiter.js.map
