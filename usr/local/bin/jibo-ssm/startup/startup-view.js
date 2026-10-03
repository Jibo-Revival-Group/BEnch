'use strict';

const x11 = require("x11");
const Jimp = require('jimp');
const ssm = require('../lib/skills-service-manager').default;

const States = {
    Loading: 0,
    Success: 1,
    Error: 2
};

const SCREEN_W = 1280;
const SCREEN_H = 720;
const TITLE = 'Skills Service Manager is Ready';
const SUBTITLE = 'WAITING FOR SKILL TO BEGIN...';
const MAX_TITLE_WIDTH = 1000;
const CHECK_COLOR = 0x5fb34eff;
const BLACK = 0x000000ff;

function measureText(font, text, spacing) {
    let width = 0;
    spacing = spacing || 0;
    for (let i = 0; i < text.length; i++) {
        const glyph = font.chars[text[i]];
        if (!glyph) {
            continue;
        }
        const next = text[i + 1];
        const kern = next && font.kernings[text[i]] && font.kernings[text[i]][next]
            ? font.kernings[text[i]][next]
            : 0;
        width += (glyph.xadvance || 0) + kern;
        if (spacing && i < text.length - 1) {
            width += spacing;
        }
    }
    return width;
}

function printText(image, font, x, y, text, spacing) {
    spacing = spacing || 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const glyph = font.chars[ch];
        if (!glyph) {
            continue;
        }
        if (ch !== ' ') {
            image.print(font, x, y, ch);
        }
        const next = text[i + 1];
        const kern = next && font.kernings[ch] && font.kernings[ch][next]
            ? font.kernings[ch][next]
            : 0;
        x += (glyph.xadvance || 0) + kern;
        if (spacing && i < text.length - 1) {
            x += spacing;
        }
    }
}

function wrapTitle(font, text, maxWidth, firstMax) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    let limit = firstMax;
    for (let i = 0; i < words.length; i++) {
        const test = line ? line + ' ' + words[i] : words[i];
        if (line && measureText(font, test) > limit) {
            lines.push(line);
            line = words[i];
            limit = maxWidth;
        } else {
            line = test;
        }
    }
    if (line) {
        lines.push(line);
    }
    return lines;
}

function fillCircle(image, cx, cy, radius, color) {
    const cr = (color >>> 24) & 255;
    const cg = (color >>> 16) & 255;
    const cb = (color >>> 8) & 255;
    const rInt = Math.ceil(radius);
    for (let y = -rInt; y <= rInt; y++) {
        for (let x = -rInt; x <= rInt; x++) {
            const coverage = radius + 0.5 - Math.sqrt(x * x + y * y);
            if (coverage <= 0) {
                continue;
            }
            const alpha = coverage > 1 ? 1 : coverage;
            const px = Math.round(cx + x);
            const py = Math.round(cy + y);
            if (px < 0 || py < 0 || px >= image.bitmap.width || py >= image.bitmap.height) {
                continue;
            }
            const existing = image.getPixelColor(px, py);
            const er = (existing >>> 24) & 255;
            const eg = (existing >>> 16) & 255;
            const eb = (existing >>> 8) & 255;
            const rr = Math.round(cr * alpha + er * (1 - alpha));
            const rg = Math.round(cg * alpha + eg * (1 - alpha));
            const rb = Math.round(cb * alpha + eb * (1 - alpha));
            image.setPixelColor(((rr << 24) | (rg << 16) | (rb << 8) | 0xff) >>> 0, px, py);
        }
    }
}

function strokeLine(image, x0, y0, x1, y1, radius, color) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy)));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        fillCircle(image, x0 + dx * t, y0 + dy * t, radius, color);
    }
}

function drawCheck(image, ix, iy, size) {
    const radius = size / 2 - 1;
    fillCircle(image, ix + size / 2, iy + size / 2, radius, CHECK_COLOR);
    const x0 = ix + size * 0.22;
    const y0 = iy + size * 0.52;
    const x1 = ix + size * 0.42;
    const y1 = iy + size * 0.72;
    const x2 = ix + size * 0.78;
    const y2 = iy + size * 0.30;
    strokeLine(image, x0, y0, x1, y1, Math.max(2, size * 0.07), BLACK);
    strokeLine(image, x1, y1, x2, y2, Math.max(2, size * 0.07), BLACK);
}

/**
 * Raster of the SSM 8.0.0 int-developer ready panel, centered on 1280x720.
 * @param {Function} JimpImage
 * @param {Object} titleFont
 * @param {Object} subFont
 * @returns {Object}
 */
function buildReadyImage(JimpImage, titleFont, subFont) {
    const image = new JimpImage(SCREEN_W, SCREEN_H, BLACK);
    const titleSize = titleFont.info.size || 64;
    const iconSize = Math.round(titleSize * 0.7);
    const iconGap = Math.round(titleSize * 0.2);
    const titleLineHeight = titleFont.common.lineHeight;
    const subLineHeight = subFont.common.lineHeight;
    const titleMargin = Math.round(titleSize * 0.5);
    const letterSpacing = Math.round((subFont.info.size || 32) * 0.15);
    const titleWidth = measureText(titleFont, TITLE);
    const lines = titleWidth + iconSize + iconGap <= MAX_TITLE_WIDTH
        ? [TITLE]
        : wrapTitle(titleFont, TITLE, MAX_TITLE_WIDTH, MAX_TITLE_WIDTH - iconSize - iconGap);
    const blockHeight = lines.length * titleLineHeight + titleMargin + subLineHeight;
    let y = Math.round((SCREEN_H - blockHeight) / 2);

    lines.forEach((line, index) => {
        const textWidth = measureText(titleFont, line);
        if (index === 0) {
            const rowWidth = iconSize + iconGap + textWidth;
            const x = Math.round((SCREEN_W - rowWidth) / 2);
            const iconY = y + Math.round((titleLineHeight - iconSize) / 2);
            drawCheck(image, x, iconY, iconSize);
            printText(image, titleFont, x + iconSize + iconGap, y, line, 0);
        } else {
            const x = Math.round((SCREEN_W - textWidth) / 2);
            printText(image, titleFont, x, y, line, 0);
        }
        y += titleLineHeight;
    });

    y += titleMargin;
    const subWidth = measureText(subFont, SUBTITLE, letterSpacing);
    const subX = Math.round((SCREEN_W - subWidth) / 2);
    const subImage = new JimpImage(SCREEN_W, subLineHeight, 0x00000000);
    printText(subImage, subFont, subX, 0, SUBTITLE, letterSpacing);
    subImage.scan(0, 0, SCREEN_W, subLineHeight, function (px, py, idx) {
        if (this.bitmap.data[idx + 3]) {
            this.bitmap.data[idx] = 0x99;
            this.bitmap.data[idx + 1] = 0x99;
            this.bitmap.data[idx + 2] = 0x99;
        }
    });
    image.composite(subImage, 0, y);
    return image;
}

function imageToZPixmap(image) {
    const src = image.bitmap.data;
    const out = Buffer.alloc(src.length);
    for (let i = 0; i < src.length; i += 4) {
        out[i] = src[i + 2];
        out[i + 1] = src[i + 1];
        out[i + 2] = src[i];
        out[i + 3] = 255;
    }
    return out;
}

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
        this._fonts = null;
        this._fontError = null;
        this._readyPixmap = null;
        this._depth = 24;

        this._loadFonts();
        this.createWindow();
    }

    _loadFonts() {
        Promise.all([
            Jimp.loadFont(Jimp.FONT_SANS_64_WHITE),
            Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
        ]).then(fonts => {
            this._fonts = {title: fonts[0], sub: fonts[1]};
            if (this._state === States.Success && this.alive && this.X) {
                this._drawSuccess();
            }
        }).catch(err => {
            console.log(err);
            this._fontError = err;
            if (this._state === States.Success && this.alive && this.X) {
                this._drawSuccess();
            }
        });
    }
    
    createWindow() {
        x11.createClient((err, display) => {
            if (err) {
                console.log(err);
            } else {
                this.X = display.client;
                const root = display.screen[0].root;
                this._depth = display.screen[0].root_depth || 24;
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
            this._loadInterval = null;
            this._clearScreen();
        }
        //nothing gets to be on screen if not in int-developer mode or developer mode
        if (this._mode !== 'int-developer' && this._mode !== 'developer') {
            return;
        }
        if (!this.X) {
            return;
        }
        if (this._fontError || !this._fonts) {
            if (this._fontError) {
                this._drawReadyFallback();
            }
            return;
        }
        if (!this._readyPixmap) {
            try {
                this._readyPixmap = imageToZPixmap(buildReadyImage(Jimp, this._fonts.title, this._fonts.sub));
            } catch (err) {
                console.log(err);
                this._fontError = err;
                this._drawReadyFallback();
                return;
            }
        }
        this.X.PutImage(2, this.wid, this.gc, SCREEN_W, SCREEN_H, 0, 0, 0, this._depth, this._readyPixmap);
    }

    _drawReadyFallback() {
        this._clearScreen();
        this.X.ChangeGC(this.gc, {foreground:0xffffff});
        this.X.PolyText8(this.wid, this.gc, 400, 340, [TITLE]);
        this.X.ChangeGC(this.gc, {foreground:0x999999});
        this.X.PolyText8(this.wid, this.gc, 400, 380, [SUBTITLE]);
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

StartupView.buildReadyImage = buildReadyImage;
module.exports = StartupView;
