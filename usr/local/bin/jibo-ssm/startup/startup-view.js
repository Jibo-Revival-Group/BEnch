'use strict';

const x11 = require("x11");
const ssm = require('../lib/skills-service-manager').default;

const States = {
    Loading: 0,
    Success: 1,
    Error: 2
};

/**
 * Wraps the GUI
 * @class StartupView
 */
class StartupView {
    constructor() {
        this.X = null;
        this.wid = null;
        this.gc = null;
        this._mode = 'normal';
        this._readyCallback = null;
        this._loadCounter = -1;
        const NUM_POINTS = 12;
        this._loadPoints = this._generateCirclePoints(1280/2, 720/2, 75, NUM_POINTS).slice(0, NUM_POINTS * 2);
        this._loadInterval = null;
        this._state = States.Loading;
        this._error = null;
        
        this.createWindow();
    }
    
    createWindow() {
        x11.createClient((err, display) => {
            if (err) {
                console.log(err);
            } else {
                this.X = display.client;
                const root = display.screen[0].root;
                this.wid = this.X.AllocID();
                this.X.CreateWindow(
                    this.wid, root,
                    0, 0, 1280, 720,
                    0, 0, 0, 0,
                    {
                        eventMask: x11.eventMask.Exposure
                    });
                this.X.MapWindow(this.wid);

                this.gc = this.X.AllocID();
                this.X.CreateGC(this.gc, this.wid, {foreground:0xffffff, background:0, lineWidth: 20, capStyle:2});
                
                this.X.on("event", (ev) => {
                    //if we are getting events after we've cleaned up our X client, ignore them
                    if (!this.X) {
                        return;
                    }
                    if (ev.type == 12) {
                        //we'll get this event ("Expose") when our X11 window is ready, and when
                        //the screen turns on. Sometimes we'll be required to redraw our window
                        //after the screen turns back on
                        switch (this._state) {
                            case States.Success:
                                this._drawSuccess();
                                break;
                            case States.Error:
                                this._drawError();
                                break;
                            case States.Loading:
                                //only start drawing loader if this is during initialization
                                if (!this.alive) {
                                    this._drawLoader();
                                }
                                break;
                        }
                        this.alive = true;
                        //we also want to tell the ScreenScheduler to start the timer, as the
                        //screen can get woken up by screen touch
                        ssm.ScreenScheduler.start(true);
                    }
                });

                //for debugging while changing how this renders - don't expect it to happen normally
                // this.X.on("error", (e) => {
                //     console.log("X11 error:", e);
                // });
            }
        });
    }
    
    complete(error) {
        if (error) {
            this._error = error;
            this._state = States.Error;
        } else {
            this._state = States.Success;
        }
        
        if (!this.alive) {
            //if no window, then do nothing
            return;
        }
        if (this._state === States.Success) {
            this._drawSuccess();
        } else {
            this._drawError();
        }
    }

    /**
     * Current developer mode, "developer", "int-developer", "normal"
     * @name mode
     * @type {String}
     */
    set mode(mode) {
        if (mode !== 'developer' && mode !== 'int-developer') {
            // handle other modes like oobe, normal, etc
            mode = 'normal';
        }
        this._mode = mode;
    }
    
    show() {
        this.createWindow();
    }
    
    hide() {
        if (!this.alive) {
            return;
        }
        //cancel load interval
        if (this._loadInterval) {
            clearInterval(this._loadInterval);
        }
        //remove the window
        this.X.DestroyWindow(this.wid);
        this.X.KillClient(this.X.display);
        this.alive = false;
        this.wid = null;
        this.gc = null;
        this.X = null;
    }
    
    _drawLoader() {
        //start drawing the loading dots
        this._loadInterval = setInterval(() => {
            if (++this._loadCounter >= this._loadPoints.length) {
                this._loadCounter = -1;
                this._clearScreen();
            } else {
                const count = this._loadCounter;
                //grab just the point we want to draw, as previous draws stay on
                //screen
                const point = this._loadPoints.slice(count * 2, (count + 1) * 2);
                //turn it into a very short line
                point.push(point[0] + 1, point[1]);
                this.X.PolyLine(0, this.wid, this.gc, point);
            }
        }, 500);
    }
    
    _drawSuccess() {
        //cancel load interval
        if (this._loadInterval) {
            clearInterval(this._loadInterval);
            this._clearScreen();
        }
        //nothing gets to be on screen if not in int-developer mode or developer mode
        if (this._mode !== 'int-developer' && this._mode !== 'developer') {
            return;
        }
        //change to green
        this.X.ChangeGC(this.gc, {foreground:this._mode === 'developer' ? 0x00d4f0 : 0x00ff00, lineWidth:10});
        //draw circle
        this.X.PolyLine(0, this.wid, this.gc, this._generateCirclePoints(1280/2, 720/2, 250, 35));
        //draw check
        this.X.ChangeGC(this.gc, {lineWidth:15});
        this.X.PolyLine(0, this.wid, this.gc, this._generateCheckPoints(1280/2, 720/2, 200));
    }
    
    _drawError() {
        //cancel load interval
        if (this._loadInterval) {
            clearInterval(this._loadInterval);
            this._clearScreen();
        }
        //nothing gets to be on screen if not in int-developer mode or developer mode
        if (this._mode !== 'int-developer' && this._mode !== 'developer') {
            return;
        }
        const error = this._error;
        const message = typeof error === 'string' ? error : error.message;
        this.X.PolyText8(this.wid, this.gc, 500, 650, [message]);
        //change to red
        this.X.ChangeGC(this.gc, {foreground:0xee0000, lineWidth:10});
        //draw circle
        this.X.PolyLine(0, this.wid, this.gc, this._generateCirclePoints(1280/2, 720/2, 250, 35));
        //draw X
        this.X.ChangeGC(this.gc, {lineWidth:15});
        const xPoints = this._generateXPoints(1280/2, 720/2, 110);
        //split X points in half to do each line separately
        this.X.PolyLine(0, this.wid, this.gc, xPoints.slice(0, 4));
        this.X.PolyLine(0, this.wid, this.gc, xPoints.slice(4, 8));
    }
    
    _clearScreen() {
        //I'd trust ClearArea more, but it doesn't seem to do anything
        //this.X.ClearArea(this.wid, 0, 0, 1280, 720, 0);
        this.X.ChangeGC(this.gc, {foreground:0x000000});
        this.X.PolyFillRectangle(this.wid, this.gc, [0, 0, 1280, 720]);
        this.X.ChangeGC(this.gc, {foreground:0xffffff});
    }
    
    _generateCirclePoints(centerX, centerY, radius, numPoints) {
        let output = [];
        for (let i = 0; i < numPoints; ++i) {
            const angle = i / numPoints * 2 * Math.PI;
            output.push(Math.round(centerX + Math.cos(angle) * radius),
                        Math.round(centerY + Math.sin(angle) * radius));
        }
        //connect to the first point
        output.push(output[0], output[1]);
        return output;
    }
    
    _generateCheckPoints(centerX, centerY, size) {
        let output = [];
        centerX -= Math.round(size * 0.22);
        //top left
        output.push(Math.round(centerX - size * 0.35),
                    Math.round(centerY - size * 0.2));
        //bottom center
        output.push(centerX,
                    Math.round(centerY + size * 0.3));
        //top right
        output.push(Math.round(centerX + size * 0.95),
                    Math.round(centerY - size * 0.5));
        return output;
    }
    
    _generateXPoints(centerX, centerY, size) {
        let output = [];
        //top left
        output.push(centerX - size,
                    centerY - size);
        //bottom right
        output.push(centerX + size,
                    centerY + size);
        //top right
        output.push(centerX + size,
                    centerY - size);
        //bottom left
        output.push(centerX - size,
                    centerY + size);
        return output;
    }
}

module.exports = StartupView;
