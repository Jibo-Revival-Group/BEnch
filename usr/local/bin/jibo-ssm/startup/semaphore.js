var sem = require('node-semaphore');
var pid = process.pid;
console.log('SEMAPHORE', 'pid', pid);
var s = sem.Semaphore('/jibo-startup-' + pid + '.event');
s.post();