'use strict';
// BEefy sends changes that need beta robot code only when the robot's CONTEXT has general.beta; only the robot at
// exactly 192.168.7.165 adds it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../usr/local/bin/jibo-ssm/lib/skills-service-manager.js'), 'utf8');
const start = src.indexOf('    _markBetaContext(context) {');
const end = src.indexOf('    _markHomeAssistantContext(context) {');
assert.ok(start > 0 && end > start, 'method found');
assert.strictEqual(src.split('this._markBetaContext(context);').length - 1, 2, 'turn and proactive CONTEXT are both marked');

function marked(addresses, context) {
    const os = { networkInterfaces: () => ({ lo: [{ family: 'IPv4', address: '127.0.0.1' }],
        wlan0: addresses.map((address) => ({ family: address.indexOf(':') >= 0 ? 'IPv6' : 'IPv4', address: address })) }) };
    const Ssm = new Function('require', 'return class {\n' + src.slice(start, end) + '\n};')((name) => {
        assert.strictEqual(name, 'os'); return os;
    });
    return new Ssm()._markBetaContext(context);
}

assert.deepStrictEqual(marked(['192.168.7.165'], { general: { release: '3.1.8' } }).general, { release: '3.1.8', beta: true });
assert.deepStrictEqual(marked(['fe80::1', '192.168.7.165'], {}).general, { beta: true });
['192.168.7.16', '192.168.7.1650', '192.168.7.115', '10.0.0.165', '192.168.17.165'].forEach((address) => {
    assert.deepStrictEqual(marked([address], { general: { release: '3.1.8' } }).general, { release: '3.1.8' }, address);
});
assert.strictEqual(marked(['192.168.7.165'], null), null);
console.log('PASS only the robot at exactly 192.168.7.165 tags its CONTEXT as beta');
