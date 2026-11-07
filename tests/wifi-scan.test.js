'use strict';
// SSM WifiService /get_scan_results turns wpa_cli scan_results into the list Settings › New Wi-Fi shows.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../usr/local/bin/jibo-ssm/lib/skills-service-manager.js'), 'utf8');
assert.ok(src.indexOf("url.post('/get_scan_results'") > 0, 'route is registered');
const start = src.indexOf('    static parseScanResults(');
const end = src.indexOf('    _onGetSavedNetworks(');
const WifiService = new Function('return class WifiService {\n' + src.slice(start, end) + '\n};')();

const lines = [
    'aa:aa:aa:aa:aa:01\t2437\t-71\t[WPA2-PSK-CCMP][ESS]\tHome',
    'aa:aa:aa:aa:aa:02\t5180\t-48\t[WPA2-PSK-CCMP][ESS]\tHome',
    'aa:aa:aa:aa:aa:03\t2412\t-60\t[ESS]\tCoffee Shop',
    'aa:aa:aa:aa:aa:04\t2412\t-80\t[WPA2-PSK-CCMP][ESS]\t',
    'aa:aa:aa:aa:aa:05\t2462\t-66\t[WPA2-PSK-CCMP][ESS]\tZane\\xe2\\x80\\x99s Wi-Fi',
    'aa:aa:aa:aa:aa:06\t2462\t-90\t[WEP][ESS]\t\\x00\\x00',
    'aa:aa:aa:aa:aa:07\t5745\t-40\t[RSN-SAE-CCMP][MESH]\tHome'
];
assert.deepStrictEqual(WifiService.parseScanResults(lines).map(n => [n.ssid, n.signal, n.secure]), [
    ['Home', -48, true],
    ['Coffee Shop', -60, false],
    ['Zane\u2019s Wi-Fi', -66, true]
]);
assert.deepStrictEqual(WifiService.parseScanResults(undefined), []);
console.log('PASS wifi scan results: strongest copy of each network, hidden and mesh ones dropped, names decoded');
