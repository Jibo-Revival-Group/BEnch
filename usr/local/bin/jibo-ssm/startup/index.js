'use strict';

//first add the robot's global module search path to the global paths
require('module').globalPaths.push('/usr/lib/node_modules/');

const path = require('path');
const ssm = require('../lib/skills-service-manager').default;
const GetConfig = ssm.GetConfig;
const StartupView = require('./startup-view');
const view = new StartupView();

const log = ssm.rootLog.createChild('Startup');

function postSemaphore() {
    //TODO: REMOVE DEPRECATION
    //if still running in electron, start a child process to do the semaphore, because it has
    //a non-JS dependency
    if (process.versions.electron) {
        const ipcRenderer = require('electron').ipcRenderer;
        const spawn = require('child_process').spawn;
        ipcRenderer.once('set-pid', function(sender, pid) {
            /*const child = */spawn('node', [path.join(__dirname, 'semaphore.js'), pid], {
                env: {
                    NODE_PATH: '/usr/lib/node_modules/'
                }
            });
        });
        ipcRenderer.send('get-pid');
    } else {
        require('./semaphore');
    }
}

const getter = new GetConfig();
getter.getConfig(function(error, configPath, mode) {
    view.mode = mode;
    if (error) {
        postSemaphore();
        view.complete(error);
        return log.error('Could not get config path: ', error);
    }
    try {
        const config = require(configPath);
        const Factory = require('../lib/skills-service-manager').default.Factory;
        const factory = new Factory(config, path.join(__dirname, '..'), mode);
        factory.init(function(error) {
            if (error) {
                view.complete(error);
                log.error('Factory initialization failed:', error);
            }
            else {
                view.complete();
                //listen to events from the skills service for when skills are stopped/started
                //in int-developer mode
                const skills = ssm.SkillsService.instance;
                skills.on('show', () => {
                    view.show();
                });
                skills.on('hide', () => {
                    view.hide();
                });
            }
            postSemaphore();
        });
    }
    catch(error) {
        log.error('Error. Maybe in identified mode?', error);
        view.complete(error);
        postSemaphore();
    }

});
