(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mmsProcess = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function instantiateService(ServiceClass, options, rootDir) {
    return new ServiceClass(options, rootDir);
}
exports.instantiateService = instantiateService;

},{}],2:[function(require,module,exports){
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

},{"./data":3}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"./JiboServerClient":2,"@jibo/jibo-server-client":undefined}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jibo_log_1 = require("jibo-log");
const log = new jibo_log_1.Log('SSM');
exports.default = log;

},{"jibo-log":undefined}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const findRoot = require("find-root");
const events_1 = require("events");
const SSMService_1 = require("../../SSMService");
const MediaManagerService_1 = require("../../services/media-manager/MediaManagerService");
const log_1 = require("../../services/log");
const log = log_1.default.createChild('MMS');
class MMSProcess extends events_1.EventEmitter {
    constructor() {
        super();
        let httpRoot = path.join(findRoot(__dirname), 'static/media-manager-service');
        SSMService_1.instantiateService(MediaManagerService_1.default, { port: 8488 }, httpRoot);
        MediaManagerService_1.default.instance.init((err) => {
            log.iferr(err, 'error initing MediaManagerService');
            let sem = require('node-semaphore');
            log.debug('SEMAPHORE', 'pid', process.pid);
            let s = sem.Semaphore('/jibo-startup-' + process.pid + '.event');
            s.post();
            log.info('MMS Started');
        });
    }
}
function default_1() {
    return new MMSProcess();
}
exports.default = default_1;

},{"../../SSMService":1,"../../services/log":8,"../../services/media-manager/MediaManagerService":9,"events":undefined,"find-root":undefined,"node-semaphore":undefined,"path":undefined}],7:[function(require,module,exports){
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
const jibo_cai_utils_1 = require("jibo-cai-utils");
const MMSProcess_1 = require("./MMSProcess");
const jibo_log_1 = require("jibo-log");
jibo_log_1.Log.processName = 'mms';
const log_1 = require("../../services/log");
const log = log_1.default.createChild('MMS');
function start() {
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
        log.info('pre create mms');
        MMSProcess_1.default();
    });
}
start();

},{"../../services/log":8,"./MMSProcess":6,"jibo-cai-utils":undefined,"jibo-log":undefined,"jibo-service-framework":undefined}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Svc');

},{"../log":5}],9:[function(require,module,exports){
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

},{"../../clients/jibo-server":4,"../../utils/Debouncer":10,"../../utils/lsdashlart":11,"../log":8,"async":undefined,"fs":undefined,"https":undefined,"jibo-log":undefined,"jibo-service-framework":undefined,"mkdirp":undefined,"path":undefined,"rimraf":undefined}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"async":undefined,"fs":undefined,"path":undefined}]},{},[7])(7)
});

//# sourceMappingURL=mms-process.js.map
