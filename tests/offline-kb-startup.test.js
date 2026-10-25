'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var source = fs.readFileSync(path.join(__dirname, '../usr/local/bin/jibo-ssm/lib/skills-service-manager.js'), 'utf8');
var log = { info: function () {}, error: function () {}, iferr: function () {} };
function Parent() {}
Parent.prototype.init = function (done) { done(); };
[
    ['HolidayManager', '_preloadHolidayModel', '_holidaysSize', '_syncWithCloud'],
    ['RobotManager', '_preloadRobotModel', '_robotSize', '_syncWithCloud'],
    ['MediaListManager', '_preloadMediaModel', '_mediaSize', 'storePhoto']
].forEach(function (entry) {
    var start = source.indexOf('    init(callback)', source.indexOf('class ' + entry[0] + ' extends'));
    var end = source.indexOf('    ' + entry[3] + '(', start);
    assert(start > 0 && end > start);
    var model = { begin: function () { return model; } };
    var Constructor = new Function('Parent', 'KBClient_1', 'log', 'KB_SLICE_NAME',
        'return class extends Parent {' + source.slice(start, end) + '};')(
        Parent, { default: { createModel: function () { return model; } } }, log, '/jibo/fixture');
    var manager = new Constructor();
    manager.enableCloud = true;
    manager[entry[1]] = function (done) { done(); };
    manager[entry[2]] = function () { return 0; };
    var cloudDone, called = 0, timers = 0;
    manager._syncWithCloud = function (done) { assert.strictEqual(called, 1); cloudDone = done; };
    manager._createClients = function (done) { done(); };
    manager._syncOnNotification = function () {};
    manager._startSyncTimer = function () { timers++; };
    manager._startUploadTimer = function () {};
    manager.init(function () { called++; });
    assert.strictEqual(called, 1, entry[0] + ' must become ready while cloud is stalled');
    cloudDone();
    assert.strictEqual(called, 1, entry[0] + ' must not finish twice');
    assert.strictEqual(timers, 1, entry[0] + ' retains cloud synchronization');
});
var start = source.indexOf('    _initCredentials(callback)', source.indexOf('class SyncManager extends'));
var end = source.indexOf('    _networkIsRequired(callback)', start);
var errors = [];
var Constructor = new Function('crypto', 'jibo_service_clients_1', 'jibo_server_1', 'log', 'ErrorService_1', 'NO_SYNC_SERVER_ERROR',
    'return class SyncManager {' + source.slice(start, end) + '};')(
    require('crypto'), { systemManager: { getCredentials: function (done) { done(null, { accessKeyId: 'local', secretAccessKey: 'local' }); } } },
    { JSC: { config: { update: function () {} } } }, Object.assign({ warn: function () {} }, log),
    { default: { instance: { addError: function (error) { errors.push(error); } } } }, 'offline');
var manager = new Constructor(), networkDone, called = 0;
manager._networkIsRequired = function (done) { networkDone = done; };
manager._initCredentials(function () { called++; });
assert.strictEqual(called, 1, 'Local credentials must not wait for Account#get');
networkDone(new Error('Offline'));
assert.strictEqual(called, 1);
assert.deepEqual(errors, ['offline']);
console.log('Empty KB caches and credentials initialize before cloud replies; background sync is preserved');
