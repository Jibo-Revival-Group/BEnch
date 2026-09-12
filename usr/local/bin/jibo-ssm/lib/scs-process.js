(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.scsProcess = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
const events_1 = require("events");
const SecurityControllerService_1 = require("../../services/security-controller/SecurityControllerService");
const SSMService_1 = require("../../SSMService");
const log_1 = require("../../services/log");
const log = log_1.default.createChild('SCS');
class SCSProcess extends events_1.EventEmitter {
    constructor() {
        super();
        SSMService_1.instantiateService(SecurityControllerService_1.default);
        SecurityControllerService_1.default.instance.init((err) => {
            log.iferr(err, 'error initing SecurityControllerService');
            let sem = require('node-semaphore');
            log.debug('SEMAPHORE', 'pid', process.pid);
            let s = sem.Semaphore('/jibo-startup-' + process.pid + '.event');
            s.post();
            log.info('SCS Started');
        });
    }
}
function default_1() {
    return new SCSProcess();
}
exports.default = default_1;

},{"../../SSMService":1,"../../services/log":8,"../../services/security-controller/SecurityControllerService":10,"events":undefined,"node-semaphore":undefined}],7:[function(require,module,exports){
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
const jibo_client_framework_1 = require("jibo-client-framework");
const SCSProcess_1 = require("./SCSProcess");
const jibo_log_1 = require("jibo-log");
jibo_log_1.Log.processName = 'scs';
const log_1 = require("../../services/log");
const log = log_1.default.createChild('SCS');
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        jibo_service_framework_1.RegistryClient.createInstance('127.0.0.1', 8181);
        const record = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => jibo_service_framework_1.RegistryClient.instance.getRecordByName('system-manager', cb));
        jibo_client_framework_1.SystemManagerClient.createInstance('127.0.0.1', record.port);
        const mode = yield jibo_cai_utils_1.PromiseUtils.promisify(cb => jibo_client_framework_1.SystemManagerClient.instance.getMode(cb));
        const configPath = `/usr/local/etc/jibo-ssm/jibo-ssm-${mode}.json`;
        const config = require(configPath);
        yield jibo_log_1.Log.loadConfig(config.logging);
        log.info('pre create scs');
        SCSProcess_1.default();
    });
}
exports.start = start;
const SecurityControllerService_1 = require("../../services/security-controller/SecurityControllerService");
exports.default = {
    SecurityControllerService: SecurityControllerService_1.default,
};

},{"../../services/log":8,"../../services/security-controller/SecurityControllerService":10,"./SCSProcess":6,"jibo-cai-utils":undefined,"jibo-client-framework":undefined,"jibo-log":undefined,"jibo-service-framework":undefined}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../log");
exports.default = log_1.default.createChild('Svc');

},{"../log":5}],9:[function(require,module,exports){
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

},{"../log":8,"connect":undefined,"events":undefined,"https":undefined,"jibo-cai-utils":undefined,"router":undefined}],10:[function(require,module,exports){
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

},{"../../clients/jibo-server":4,"../log":8,"./SecurityServer":11,"axios":undefined,"fs":undefined,"jibo-cai-utils":undefined,"jibo-log":undefined,"jibo-service-framework":undefined,"os":undefined,"path":undefined}],11:[function(require,module,exports){
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

},{"../log":8,"./HTTPSTLSService":9,"http-proxy":undefined}]},{},[7])(7)
});

//# sourceMappingURL=scs-process.js.map
