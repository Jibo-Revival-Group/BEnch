'use strict';
// SSM launches Be without waiting for the expression client (expression is up only ~3.5 s after lps), while the
// tasks that use every client (Analytics, BackgroundUtils) still wait for it.
var assert = require('assert'), fs = require('fs'), path = require('path');
var src = fs.readFileSync(path.join(__dirname, '../usr/local/bin/jibo-ssm/lib/skills-service-manager.js'), 'utf8');
function list(name) {
    var m = src.match(new RegExp('exports\\.' + name + ' = \\[([\\s\\S]*?)\\];'));
    assert(m, name);
    return m[1];
}
assert(!/'expression'|'media'/.test(list('LATE_CLIENTS')), 'expression and lps\'s media are not late clients (SkillsService waits for those)');
assert(/'ExpressionClient'/.test(list('ALL_CLIENTS_AND_SERVICES')), 'Analytics/BackgroundUtils still wait for it');
assert(/this\._addExpressionClientTask\(\);/.test(src), 'task is added');
assert(/_addExpressionClientTask\(\) \{[\s\S]*?getClientInits\(\['expression', 'media'\]/.test(src), 'and initializes the expression client');
console.log('SSM launches Be without waiting for the expression client');
