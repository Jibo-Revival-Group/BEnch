// Run with: node tests/homeassistant-relay.test.js
// Load the production methods without starting the bundled robot services.
function runTests(source, assert, Buffer) {
    const start = source.indexOf('    _readHomeAssistantPairing() {');
    const end = source.indexOf('    subscribeToCommonEvents(', start);
    assert(start >= 0 && end > start);
    const methods = source.slice(start, end);
    let passed = 0;
    const valid = { password: 'secret', haIp: '192.0.2.1', webhookId: 'private' };
    function fixture(files) {
        const timers = new Map();
        const requests = [];
        const logs = [];
        let timerId = 0;
        const logger = {};
        ['info', 'warn', 'error'].forEach(level => {
            logger[level] = (...args) => logs.push(args.join(' '));
        });
        const transport = {
            request(options, callback) {
                const handlers = {};
                const req = {
                    options, callback, handlers, destroyed: false,
                    on(event, handler) { handlers[event] = handler; },
                    write(payload) { this.payload = payload; },
                    end() {},
                    destroy() {
                        this.destroyed = true;
                        if (handlers.error) { handlers.error({ code: 'ECONNRESET' }); }
                    }
                };
                requests.push(req);
                return req;
            }
        };
        const fakeRequire = name => name === 'fs' ? {
            readFileSync(path) {
                if (!(path in files)) { throw new Error('ENOENT'); }
                return files[path];
            }
        } : transport;
        const Robot = new Function('require', 'Buffer', 'log_1', 'setTimeout', 'clearTimeout',
            'return class {' + methods + '}')(fakeRequire, Buffer, { default: logger },
            (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
            id => timers.delete(id));
        const robot = new Robot();
        robot.createHubOptions = () => ({ hostname: 'api.example.test', port: '443' });
        return { robot, requests, timers, logs };
    }
    const path = '/opt/jibo/Knowledge/beacon/homeassistant.json';
    const backup = '/opt/tmp/beacon/homeassistant.json';
    const command = { command: 'lights_off_current_room', requestId: 'request-1', callbackToken: 'token' };
    function results(f) {
        const values = [];
        f.robot._postHomeAssistantResult = (data, text) => values.push(JSON.parse(text));
        return values;
    }
    function response(req, text, statusCode) {
        const handlers = {};
        req.callback({ statusCode, on(event, handler) { handlers[event] = handler; } });
        handlers.data(Buffer.from(text));
        handlers.end();
        return handlers;
    }
    // Missing and incomplete pairing must produce a result, never silently drop a command.
    for (const files of [{}, { [path]: '{}' }, { [path]: 'invalid JSON' }]) {
        const f = fixture(files), values = results(f);
        f.robot._forwardHomeAssistantCommand(command);
        assert.strictEqual(values[0].message, 'pairing_required');
        assert.strictEqual(f.requests.length, 0);
        passed++;
    }
    {
        const f = fixture({ [path]: '{}', [backup]: JSON.stringify(valid) });
        assert.deepStrictEqual(f.robot._readHomeAssistantPairing(), valid);
        passed++;
    }
    {
        const f = fixture({ [path]: JSON.stringify(valid) }), values = results(f);
        f.robot._forwardHomeAssistantCommand(command);
        response(f.requests[0], '{"status":"ok"}', 200);
        assert.strictEqual(values[0].status, 'ok');
        assert.strictEqual(f.timers.size, 0);
        // A later socket error must not duplicate the result.
        f.requests[0].handlers.error({ code: 'ECONNRESET' });
        assert.strictEqual(values.length, 1);
        assert(!f.logs.join(' ').includes('secret'));
        assert(!f.logs.join(' ').includes('private'));
        passed++;
    }
    {
        const f = fixture({ [path]: JSON.stringify(valid) }), values = results(f);
        f.robot._forwardHomeAssistantCommand(command);
        Array.from(f.timers.values())[0].fn();
        assert.strictEqual(values[0].message, 'timeout');
        assert.strictEqual(values.length, 1);
        assert(f.requests[0].destroyed);
        passed++;
    }
    {
        const f = fixture({ [path]: JSON.stringify(valid) }), values = results(f);
        f.robot._forwardHomeAssistantCommand(command);
        f.requests[0].handlers.error({ code: 'ECONNREFUSED' });
        assert.strictEqual(values[0].message, 'disconnected');
        assert.strictEqual(f.timers.size, 0);
        passed++;
    }
    {
        const f = fixture({ [path]: JSON.stringify(valid) }), values = results(f);
        f.robot._forwardHomeAssistantCommand(command);
        response(f.requests[0], '{"status":"error","message":"auth_failed"}', 401);
        assert.strictEqual(values[0].message, 'auth_failed');
        passed++;
    }
    {
        const f = fixture({});
        f.robot._postHomeAssistantResult(command, 'not JSON');
        assert.strictEqual(JSON.parse(f.requests[0].payload).message, 'bad_result');
        // Callback timeout closes the request and logs its request ID.
        Array.from(f.timers.values())[0].fn();
        assert(f.requests[0].destroyed);
        assert(f.logs.some(line => line.includes('callback timed out requestId=request-1')));
        passed++;
    }
    {
        const f = fixture({});
        f.robot._postHomeAssistantResult(command, '{"status":"ok"}');
        f.requests[0].callback({ statusCode: 200, resume() {} });
        assert.strictEqual(f.timers.size, 0);
        assert(f.logs.some(line => line.includes('httpStatus=200')));
        assert(!f.logs.join(' ').includes('token'));
        passed++;
    }
    return passed;
}
if (typeof module !== 'undefined') { module.exports = runTests; }
if (typeof require !== 'undefined' && require.main === module) {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(path.join(__dirname,
        '../usr/local/bin/jibo-ssm/lib/skills-service-manager.js'), 'utf8');
    console.log(runTests(source, require('assert'), Buffer) + ' robot relay tests passed');
}
