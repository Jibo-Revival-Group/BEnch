function Tests(textarea) {
    var _this = this;
    _this.textarea = textarea
    
    _this.width = 0;
    _this.height = 0;
    
    _this.INDENT = 2;
    this.DEFAULT_CONTROLS = {
        format : 3,
        width : 672,
        height : 380,
        hFlip : true,
        vFlip : true,
        ae: {
            lock : false,
            manual : false,
            time : {
                low : 0.0016666,
                high : 0.066666
            },
            regions : [ ],
            manualExposure: 100000,
            manualGain: 1.0,
            ev: 0
        },
        outputBuffers: [],
        outputBuffersConfIndex: 2,
        awb: {
            lock : false,
            manual: false,
            regions : [ ],
            manualRedGain: 1024,
            manualBlueGain: 1024,
            gammaRed: 0.7,
            gammaGreen: 0.7,
            gammaBlue: 0.7
        }
    };
    
    this.reset = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testResolution672x380= function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = 672;
        controls.height = 380;
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testResolution1280x720= function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = 1280;
        controls.height = 720;
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    
    this.testResolution1920x1080= function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = 1920;
        controls.height = 1080;
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    
    this.testResolution2688x1520= function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = 2688;
        controls.height = 1520;
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    
    this.testAwbLock = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.awb.lock = true;
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAeLock = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.ae.lock = true;
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAeTime = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.ae.time.low  = 1/60;
        controls.ae.time.high  = 1/30;
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAeRegionCenter = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left: (_this.width / 2) - 31,
                top: (_this.height / 2) - 31,
                right: (_this.width / 2) + 31,
                bottom: (_this.height / 2) + 31
            }
        }
        controls.ae.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAeRegionLeft = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : 0,
                right : _this.width/2,
                bottom : _this.height
            }
        };
        controls.ae.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAeRegionTop = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : 0,
                right : _this.width,
                bottom : _this.height/2
            }
        };
        controls.ae.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAeRegionRight = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left : _this.width/2,
                top : 0,
                right : _this.width,
                bottom : _this.height
            }
        };
        controls.ae.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAeRegionBottom = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : _this.height/2,
                right : _this.width,
                bottom : _this.height
            }
        };
        controls.ae.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAeRegionCorners = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        
        // Top, Left corner
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : 0,
                right : _this.width * 0.25,
                bottom : _this.height * 0.25
            }
        };
        controls.ae.regions.push(region);
        
        // Top, Right corner
        region = {
            weight : 1.0,
            rect : {
                left : _this.width * 0.75,
                top : 0,
                right : _this.width,
                bottom : _this.height * 0.25,
            }
        };
        controls.ae.regions.push(region);
        
        // Bottom, Left corner
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : _this.height * 0.75,
                right : _this.width * 0.25,
                bottom : _this.height
            }
        };
        controls.ae.regions.push(region);
        
        // Bottom, Right corner
        region = {
            weight : 1.0,
            rect : {
                left : _this.width * 0.75,
                top : _this.height * 0.75,
                right : _this.width,
                bottom : _this.height
            }
        };
        controls.ae.regions.push(region);
        
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    
    
    this.testAwbRegionCenter = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left: (_this.width / 2) - 31,
                top: (_this.height / 2) - 31,
                right: (_this.width / 2) + 31,
                bottom: (_this.height / 2) + 31
            }
        }
        controls.awb.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAwbRegionLeft = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : 0,
                right : _this.width/2,
                bottom : _this.height
            }
        };
        controls.awb.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAwbRegionTop = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : 0,
                right : _this.width,
                bottom : _this.height/2
            }
        };
        controls.awb.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAwbRegionRight = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left : _this.width/2,
                top : 0,
                right : _this.width,
                bottom : _this.height
            }
        };
        controls.awb.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAwbRegionBottom = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : _this.height/2,
                right : _this.width,
                bottom : _this.height
            }
        };
        controls.awb.regions.push(region);
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    this.testAwbRegionCorners = function(){
        controls = JSON.parse(JSON.stringify(_this.DEFAULT_CONTROLS));
        controls.width = _this.width;
        controls.height = _this.height;
        
        // Top, Left corner
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : 0,
                right : _this.width * 0.25,
                bottom : _this.height * 0.25
            }
        };
        controls.awb.regions.push(region);
        
        // Top, Right corner
        region = {
            weight : 1.0,
            rect : {
                left : _this.width * 0.75,
                top : 0,
                right : _this.width,
                bottom : _this.height * 0.25,
            }
        };
        controls.awb.regions.push(region);
        
        // Bottom, Left corner
        region = {
            weight : 1.0,
            rect : {
                left : 0,
                top : _this.height * 0.75,
                right : _this.width * 0.25,
                bottom : _this.height
            }
        };
        controls.awb.regions.push(region);
        
        // Bottom, Right corner
        region = {
            weight : 1.0,
            rect : {
                left : _this.width * 0.75,
                top : _this.height * 0.75,
                right : _this.width,
                bottom : _this.height
            }
        };
        controls.awb.regions.push(region);
        
        _this.textarea.value = JSON.stringify(controls,null,_this.INDENT);
    };
    
    this.reset();
};

function TestsGUI(div, cameraId){
    var _this = this;
    _this.div = div;
    _this.textarea = document.createElement("textarea");
    _this.textarea.setAttribute('class', 'controls');
    _this.textarea.setAttribute('id', 'controls' + cameraId);
    _this.textarea.rows = 25;
    _this.textarea.cols = 40;
    _this.textarea.spellcheck = false;
    _this.select = document.createElement("select");
    
    _this.div.appendChild(_this.textarea);
    _this.div.appendChild(document.createElement("hr"));
    _this.div.appendChild(_this.select);
    
    _this.tests = new Tests(_this.textarea);
    
    this.getControls = function() {
        return JSON.parse(_this.tests.textarea.value);
    };
    this.setControls = function(control) {
        _this.tests.textarea.value = JSON.stringify(control.controls, null, 2);
    }
    
    this.update = function(frame){
        _this.tests.width = frame.width;
        _this.tests.height = frame.height;
    }
    
    _this.select.onchange = function() {
        var test = _this.select.value;
        _this.tests[test]();
    };
    for (var p in _this.tests){
        if(typeof _this.tests[p] === "function") {
            option = new Option()
            option.text = p;
            _this.select.add(option);
        }
    };
};

function RawDataGUI(div) {
    var _this = this;
    _this.div = div;
    _this.textarea = document.createElement("textarea");
    _this.textarea.rows = 25;
    _this.textarea.cols = 40;
    _this.textarea.spellcheck = false;
    
    _this.div.appendChild(_this.textarea);
    
    this.update = function(frame){
        var tmp = {};
        for(var k in frame) tmp[k] = frame[k];
        delete tmp.data;
        _this.textarea.value = JSON.stringify(tmp,null,2);
    }
};

function ColorHistogramPlot(div,color) {
    var _this = this;
    var COLOR_MAX = 255;
    
    var mPlot = $.plot(div,[],{
        series: { 
            shadowSize: 0
        },
        legend: { position : "ne", show:true},
        yaxes: [ 
            { 
                show: true, 
                position: "left"
            },
            ],
        xaxis: { min: 0, max: COLOR_MAX, show: true },
        colors: [ color ]
    });
    
    var mode;
    var modeV = 0;
    this.update = function(samples, channelName, color_plot) {
        buckets = [];
        
        // Initialize to 0
        for (var i = 0; i < COLOR_MAX; ++i){
            buckets[i] = 0;
        }
        
        modeV = 0;
        // Count samples for each value
        for (var i = 0; i < samples.length; ++i){
            buckets[samples[i]]++;
            if (buckets[samples[i]] > modeV) {
                modeV = buckets[samples[i]];
                mode = samples[i];
            }
        }
        
        // Create structed data for the plot
        data = []
        for (var i = 0; i <= COLOR_MAX; ++i){
            data.push([i,buckets[i]]);
        }
        
        var datasets = [];
        datasets.push({
            color: color_plot,
            label: channelName + " (mode = " + mode + ")",
            data: data,
            bars: { show: true, fill: 1.0, lineWidth:0},
            lines: { show: false },
            yaxis: 1
        });
        mPlot.setData(datasets);
        mPlot.setupGrid();
        mPlot.draw(); 
    };
};

function WhiteBalancePlot(div) {
    var _this = this;
    var MAX_DATA_POINTS = 200;
    
    var mPlot = $.plot(div,[],{
        series: { shadowSize: 0 },
        legend: { position : "nw", show:true},
        yaxes: [ 
            { 
                min: 0,
//                 max: 5,
                show: true, 
                position: "left",
            }
            ],
        xaxis: { min: 0, max: MAX_DATA_POINTS, show: true }
    });
    var mWbGains = [];
    for (var i = 0; i < MAX_DATA_POINTS; ++i){
        mWbGains.push([0,0,0,0]);
    }
    
    this.update = function(frame){
        mWbGains.push(frame.feedback.autoWhiteBalanceGains);
        if (mWbGains.length > MAX_DATA_POINTS)
            mWbGains.shift(); 
        
        datasets = [];
        labels = ["R","GR","GB","B"];
        colors = ["red","green","yellow","blue"];
        for (var j = 0; j < 4; ++j){
            data = [];
            for (var i = 0; i < mWbGains.length; ++i){
                data.push([i,mWbGains[i]["value"+j] ]);
            }
            datasets.push({
                label: "WbGain["+labels[j]+"]",
                data: data,
                color: colors[j],
                yaxis: 1
            });
        }
        mPlot.setData(datasets);
        mPlot.setupGrid();
        mPlot.draw();
    };
};


function ExposurePlot(div) {
    var _this = this;
    var MAX_DATA_POINTS = 200;
    
    var mPlot = $.plot(div,[],{
        series: { shadowSize: 0 },
        legend: { position : "nw", show:true},
        yaxes: [ 
            { 
                min: 0,
//                 max: 5,
                show: true, 
                position: "left"
            },
            { 
                min: 0,
//                 max: 0.05,
                show: true,
                position: "right", alignTicksWithAxis:"right"
            }
            ],
        xaxis: { min: 0, max: MAX_DATA_POINTS, show: true }
    });
    
    var mAutoExposureGain = [];
    var mAutoExposureTime = [];
    for (var i = 0; i < MAX_DATA_POINTS; ++i){
        mAutoExposureGain.push(undefined);
        mAutoExposureTime.push(undefined);
    }
    
    this.update = function(frame){
        mAutoExposureGain.push(frame.feedback.autoExposureGain);
        if (mAutoExposureGain.length > MAX_DATA_POINTS)
            mAutoExposureGain.shift();
        
        mAutoExposureTime.push(frame.feedback.autoExposureTime);
        if (mAutoExposureTime.length > MAX_DATA_POINTS)
            mAutoExposureTime.shift();
        
        datasets = [];
        data = [];
        for (var i = 0; i < mAutoExposureGain.length; ++i){
            data.push([i,mAutoExposureGain[i]]);
        }
        datasets.push({
            label: "AutoExposureGain",
            data: data,
            yaxis: 1
        });
        
        data = [];
        for (var i = 0; i < mAutoExposureTime.length; ++i){
            data.push([i,mAutoExposureTime[i]]);
        }
        datasets.push({
            label: "AutoExposureTime",
            data: data,
            yaxis: 2
        });
        
        mPlot.setData(datasets);
        mPlot.setupGrid();
        mPlot.draw();
    };
};

function clampFloor(v, l, h) {
    return Math.floor(Math.min(Math.max(v, l), h));
}
function ImageGUI(parent) {
    var _this = this;
    
    var mCanvas = document.createElement("canvas");
    parent.appendChild(mCanvas);
    var mContext = mCanvas.getContext("2d");
    
    var mImage = new Image;
    
    _this.mSampleData = [];
    
    var sampleXOff = 0, sampleYOff = 0, boxHalf = 15,
        width = 672, height = 380, scale = 0.5;
    var lastX, lastY, dragging = false;
    function moveListener(e) {
        if (lastX !== undefined && dragging) {
            sampleXOff = clampFloor(
                sampleXOff + (e.clientX - lastX),
                - width * scale / 2 + boxHalf,
                width * scale / 2 - boxHalf);
            sampleYOff = clampFloor(
                sampleYOff + (e.clientY - lastY),
                - height * scale / 2 + boxHalf,
                height * scale / 2 - boxHalf);
        }
        lastX = e.clientX;
        lastY = e.clientY;
    }
    function upListener() {
        dragging = false;
        lastX = undefined;
        lastY = undefined;
        document.removeEventListener('mouseup', upListener);
        document.removeEventListener('mousemove', moveListener);
    }
    mCanvas.addEventListener('mousedown', function() {
        dragging = true;
        document.addEventListener('mouseup', upListener);
        document.addEventListener('mousemove', moveListener);
    });
    mCanvas.addEventListener('wheel', function(e) {
        boxHalf = clampFloor(
            boxHalf - e.deltaY,
            1,
            Math.min(width * scale, height * scale)
        );
        e.preventDefault();
    });

    this.update = function(frame){
        
        height = frame.height;
        width = frame.width;
        scale = frame.scale
        
        mImage .src = "data:image/jpeg;base64, " + frame.data;
        
        mCanvas.height = height * scale;
        mCanvas.width = width * scale;
        mContext.drawImage(mImage,0,0);
        
        //==================================
        // Create sample data for histograms
        var maxH = height * scale;
        var maxW = width * scale;
        var x0 = Math.max(width  * scale * 0.5 - boxHalf + sampleXOff, 0);
        var x1 = Math.min(width  * scale * 0.5 + boxHalf + sampleXOff, maxW);
        var y0 = Math.max(height * scale * 0.5 - boxHalf + sampleYOff, 0);
        var y1 = Math.min(height * scale * 0.5 + boxHalf + sampleYOff, maxH);
        var w = x1 - x0;
        var h = y1 - y0;
        _this.mSampleData = mContext.getImageData(x0,y0,w,h).data;
        
        // Draw the sample region after sampling the image so as to not alter
        // the data before sampling it.
        mContext.beginPath();
        mContext.lineWidth = "2";
        mContext.strokeStyle="rgba(0,255,0,1.0)";
        mContext.rect(x0,y0,w,h);
        mContext.stroke();
    
        //================================
        // Draw Auto Exposure Regions
        for (var i = 0; i < frame.feedback.autoExposureRegions.length; ++i){
            region = frame.feedback.autoExposureRegions[i];
            rect = region.rect;
            weight = region.weight;
            var x = rect.left * scale;
            var y = rect.top * scale;
            var w = (rect.right - rect.left) * scale;
            var h = (rect.bottom - rect.top) * scale;
            
            mContext.beginPath();
            mContext.lineWidth = "1";
            mContext.strokeStyle="rgba(255,0,0,1.0)";
            mContext.rect(x,y,w,h);
            mContext.stroke();
        }
        //================================
        // Draw Auto White Balance Regions
        for (var i = 0; i < frame.feedback.autoWhiteBalanceRegions.length; ++i){
            region = frame.feedback.autoWhiteBalanceRegions[i];
            rect = region.rect;
            weight = region.weight;
            var x = rect.left * scale;
            var y = rect.top * scale;
            var w = (rect.right - rect.left) * scale;
            var h = (rect.bottom - rect.top) * scale;
            
            mContext.beginPath();
            mContext.lineWidth = "1";
            mContext.strokeStyle="rgba(255,255,255,1.0)";
            mContext.rect(x,y,w,h);
            mContext.stroke();
        }
    };
    
    this.sample = function(){
        return _this.mSampleData;
    };
};

function FrameGUI(parent, cameraId) {
    // TODO Move this parenting to somewhere else
    var _this = this;
    _this.cameraId = cameraId;
    var table = document.createElement("table");
    parent.appendChild(table);
    
    var CELL_WIDTH = 320;
    var CELL_HEIGHT = 180;
    
    table.border = 1;
    table.cellPadding = 10;
    table.cellSpacing = 3;
    
    var row_1 = table.insertRow();
    
    var cell_span_1 = row_1.insertCell();
    cell_span_1.rowSpan = 2;
    this.label = document.createElement("p");
    this.label.style.transform = "rotate(90deg)";
    this.label.style.height = "100%";
    this.label.style.width = "100%";
    cell_span_1.appendChild(this.label);

    var col_sliders = row_1.insertCell();
    col_sliders.rowSpan = 2;
    var col_sliders_res_picker = document.createElement('div');
    col_sliders_res_picker.setAttribute('class', 'output-picker-container');
    var resPicker = document.createElement('select');
    resPicker.setAttribute('id', 'res-picker' + cameraId);
    resPicker.addEventListener('change', function (ev) {
        var target = ev.target.selectedOptions[0];
        var width = Number(target.getAttribute('data-res-width'));
        var height = Number(target.getAttribute('data-res-height'));
        // modify the textarea contents which should already be populated with 
        // the current camera controls state.
        var ta = document.getElementById('controls' + cameraId);
        var val = JSON.parse(ta.value);
        val.height = Number(height);
        val.width = Number(width);
        ta.value = JSON.stringify(val, null, 2);
        $("#buttonApply").click();
    });
    col_sliders_res_picker.appendChild(resPicker);
    var col_sliders_outputConfig_picker = document.createElement('div');
    col_sliders_outputConfig_picker.setAttribute('class', 'output-picker-container');
    var outputConfigPicker = document.createElement('select');
    outputConfigPicker.setAttribute('id', 'output-config-picker' + cameraId);
    outputConfigPicker.addEventListener('change', function (ev) {
        var target = ev.target.selectedOptions[0];
        var newOutputConfIndex = target.getAttribute('data-config-index');
        // modify the textarea contents which should already be populated with 
        // the current camera controls state.
        var ta = document.getElementById('controls' + cameraId);
        var val = JSON.parse(ta.value);
        val.outputBuffersConfIndex = Number(newOutputConfIndex);
        // also need to clear out the buffers spec which has been put into 
        // place and which will override the integral config value, if 
        // specified.
        val.outputBuffers = [];
        ta.value = JSON.stringify(val, null, 2);
        $("#buttonApply").click();
    });
    col_sliders_outputConfig_picker.appendChild(outputConfigPicker);
    var col_sliders_output_picker = document.createElement('div');
    col_sliders_output_picker.setAttribute('class', 'output-picker-container');
    var outputPicker = document.createElement('select');
    outputPicker.setAttribute('id', 'output-picker' + cameraId);
    outputPicker.addEventListener('change', function (ev) {
        var target = ev.target.selectedOptions[0];
        document.socket.send(JSON.stringify({
            outputLevel: target.getAttribute('data-outputLevel'),
            outputType: target.getAttribute('data-outputType'),
            cameraId: cameraId,
            type: 'outputBuffer'
        }, null, 2));
    });
    col_sliders_output_picker.appendChild(outputPicker);
    var col_sliders_container = document.createElement('div');
    col_sliders_container.setAttribute('class', 'slider-container');
    makeSlider(col_sliders_container, "awb.manualRedGain", {
        value: 1,
        min: 0,
        max: 4,
        step: 0.001
    }, cameraId, true);
    makeSlider(col_sliders_container, "awb.manualBlueGain", {
        value: 1,
        min: 0,
        max: 4,
        step: 0.001
    }, cameraId, true);
    makeSlider(col_sliders_container, "ae.manualGain", {
        value: 2,
        min: 0,
        max: 16,
        step: 0.01
    }, cameraId, true);
    makeSlider(col_sliders_container, "ae.manualExposure", {
        value: 0.016667,
        min: 0,
        max: 0.0666667,
        step: 0.0005
    }, cameraId, true);
    makeSlider(col_sliders_container, "ae.ev", {
        value: 0,
        min: -0.3,
        max: 0.8,
        step: 0.01
    }, cameraId);

    makeSlider(col_sliders_container, "awb.gammaRed", {
        value: 0.5,
        min: 0.3,
        max: 1,
        step: 0.005
    }, cameraId);
    makeSlider(col_sliders_container, "awb.gammaGreen", {
        value: 0.5,
        min: 0.3,
        max: 1,
        step: 0.005
    }, cameraId);
    makeSlider(col_sliders_container, "awb.gammaBlue", {
        value: 0.5,
        min: 0.3,
        max: 1,
        step: 0.005
    }, cameraId);
    makeSlider(col_sliders_container, "awb.gammaCr", {
        value: 0.78,
        min: 0.6,
        max: 1,
        step: 0.0025
    }, cameraId);
    makeSlider(col_sliders_container, "awb.gammaCb", {
        value: 0.78,
        min: 0.6,
        max: 1,
        step: 0.0025
    }, cameraId);
    col_sliders.appendChild(col_sliders_res_picker);
    col_sliders.appendChild(col_sliders_outputConfig_picker);
    col_sliders.appendChild(col_sliders_output_picker);
    col_sliders.appendChild(col_sliders_container);
    
    var cell_1_2 = row_1.insertCell();
    cell_1_2.align = "center";
    this.imageGUI = new ImageGUI(cell_1_2);
    
    var cell_1_3 = row_1.insertCell();
    var div = document.createElement("div");
    div.style.width="320px";
    div.style.height="180px";
    cell_1_3.appendChild(div);
    this.exposurePlot = new ExposurePlot(div);
    
    var cell_1_4 = row_1.insertCell();
    var div = document.createElement("div");
    div.style.width="320px";
    div.style.height="180px";
    cell_1_4.appendChild(div);
    this.whiteBalancePlot = new WhiteBalancePlot(div);
    
    var row_2 = table.insertRow();
    
    var cell_2_2 = row_2.insertCell();
    var div = document.createElement("div");
    div.style.width="320px";
    div.style.height="180px";

    cell_2_2.setAttribute('style', 'white-space: normal; text-align: right');
    var manualButtons = document.createElement('div');
    manualButtons.setAttribute('style', 'display: block')

    function makeButton(description, field) {
        var btn = document.createElement('button');
        var fieldNamePath = field.split('.');
        btn.innerHTML = description;
        btn.setAttribute('id', field + 'Btn' + cameraId);
        btn.onclick = function () {
            var ta = document.getElementById('controls' + cameraId);
            var val = JSON.parse(ta.value);
            for (
                var f = val, i = 0;
                i < fieldNamePath.length - 1;
                f = f[fieldNamePath[i++]]
            );
            var lastFnp = fieldNamePath[fieldNamePath.length - 1];
            f[lastFnp] = !f[lastFnp];
            btn.setAttribute('class', f[lastFnp] ? 'on': '');
            ta.value = JSON.stringify(val, null, 2);
            $('#buttonApply').click();
        };
        return btn;
    }

    manualButtons.appendChild(makeButton('Exposure Manual', 'ae.manual'));
    manualButtons.appendChild(makeButton('Exposure Lock', 'ae.lock'));
    manualButtons.appendChild(makeButton('White Balance Manual', 'awb.manual'));
    manualButtons.appendChild(makeButton('White Balance Lock', 'ae.lock'));

    cell_2_2.appendChild(manualButtons);
    cell_2_2.appendChild(div);
    this.redColorHistogramPlot = new ColorHistogramPlot(div,"red");
    
    var cell_2_3 = row_2.insertCell();
    var div = document.createElement("div");
    div.style.width="320px";
    div.style.height="180px";
    cell_2_3.appendChild(div);
    this.greenColorHistogramPlot = new ColorHistogramPlot(div,"green");
    
    var cell_2_4 = row_2.insertCell();
    var div = document.createElement("div");
    div.style.width="320px";
    div.style.height="180px";
    cell_2_4.appendChild(div);
    this.blueColorHistogramPlot = new ColorHistogramPlot(div,"blue");
    
    var cell_span_5 = row_1.insertCell();
    cell_span_5.rowSpan = 2;
    var div = document.createElement("div");
    cell_span_5.appendChild(div);
    this.rawDataGUI = new RawDataGUI(div);
    
    var cell_span_6 = row_1.insertCell();
    cell_span_6.rowSpan = 2;
    var div = document.createElement("div");
    cell_span_6.appendChild(div);
    this.testsGUI = new TestsGUI(div, cameraId);
    
    this.update = function(frame){
        _this.label.textContent = ""+frame.cameraId;
        _this.imageGUI.update(frame);
        _this.exposurePlot.update(frame);
        _this.whiteBalancePlot.update(frame);
        
        samples = _this.imageGUI.sample();
        var red = [];
        var green = [];
        var blue = [];
        var Y = [];
        var U = [];
        var V = [];

        if (document.getElementById('yuvCheckbox').checked) {
            // convert pixels to YUV and histogram that...
            for (i = 0; i < samples.length; i+=4){
                var r = samples[i] / 255.0;
                var g = samples[i+1] / 255.0;
                var b = samples[i+2] / 255.0;
                Y.push(Math.floor((0.299 * r + 0.587 * g + 0.114 * b) * 255));
                U.push(Math.floor((-0.1687 * r - 0.3313 * g + 0.5 * b) * 255 + 127));
                V.push(Math.floor((0.5 * r - 0.4187 * g - 0.0813 * b) * 255 + 127));
            }
            _this.redColorHistogramPlot.update(Y, "Y", 'black');
            _this.greenColorHistogramPlot.update(U, "U", 'blue');
            _this.blueColorHistogramPlot.update(V, "V", 'red');
        } else {
            for (i = 0; i < samples.length; i+=4){
                red.push(   samples[i  ]);
                green.push( samples[i+1]);
                blue.push(  samples[i+2]);
            }
            _this.redColorHistogramPlot.update(red, "red", "red");
            _this.greenColorHistogramPlot.update(green, "green", "green");
            _this.blueColorHistogramPlot.update(blue, "blue", "blue");
        }

        _this.rawDataGUI.update(frame);
        
        _this.testsGUI.update(frame);
    };
    
    this.getControls = function() {
        retval = {}
        retval.cameraId = _this.cameraId;
        retval.controls = _this.testsGUI.getControls();
        return retval;
    }
    this.setControls = function(arg) {
        _this.testsGUI.setControls(arg);
    }
};

function makeSlider(container, fieldName, fields, cameraId, toSetManual) {
    var input = document.createElement("input");
    var inputContainer = document.createElement("div");
    var label = document.createElement("div");
    label.innerHTML = fieldName;
    label.setAttribute("class", "slider-label");
    inputContainer.setAttribute("class", "slider-inner-container");
    input.setAttribute("type", "range");
    input.setAttribute("title", fieldName);
    input.setAttribute("orient", "vertical");
    input.setAttribute("id", fieldName);
    for (var field in fields) {
        input.setAttribute(field, fields[field]);
    }
    input.onchange = function (e) {
        var ta = document.getElementById('controls' + cameraId);
        var val = JSON.parse(ta.value);
        var fieldNamePath = fieldName.split('.');
        if (toSetManual){
            val[fieldNamePath[fieldNamePath.length - 2]].manual = true;
            document.getElementById(fieldNamePath[fieldNamePath.length - 2] + '.manualBtn' + cameraId)
                .setAttribute('class', 'on');
        }
        for (
            var field = val, i = 0;
            i < fieldNamePath.length - 1;
            field = field[fieldNamePath[i++]]
        );
        field[fieldNamePath[fieldNamePath.length - 1]] = Number(this.value);
        input.setAttribute("title", fieldName + ' = ' + this.value);
        ta.value = JSON.stringify(val, null, 2);
        $('#buttonApply').click();
    }
    inputContainer.appendChild(label);
    inputContainer.appendChild(input);
    container.appendChild(inputContainer);
}

function levelDescription(level) {
    return level === 0 ? 'Full ' :
        level === 1 ? 'Half ' :
        level === 2 ? 'Quarter ' :
        level === 3 ? 'Eighth ' :
        level === 4 ? 'Sixteenth ' :
        level === -1 ? 'Subimage ' :
        level === -2 ? '' :
        '!!! ';
}

window.jiboDeferredInit = [];
$(document).ready(function() { 
    var _this = this;
    
    var displays = {};
    
    $("#buttonConnect")[0].onclick = function() {
        _this.socket = new WebSocket("ws://"+window.location.host+"/camera");
        _this.socket.onopen = function() {
            console.log("Port open!");
            _this.socket.send(JSON.stringify({
                type: "controlsInit"
            }));
        };
        _this.socket.onmessage = function (msg) {
            var obj = JSON.parse(msg.data);
            switch (obj.type) {
                case "frames":
                var frames = obj.frames;
                for (var i = 0; i < frames.length; ++i){
                    var frame = frames[i];
                    var key = frame.cameraId;
                    var display = null;
                    if (key in displays) {
                        display = displays[key];
                    } else {
                        displays[key] = new FrameGUI($("#divCameras")[0], key);
                        display = displays[key];
                    }
                    display.update(frame);
                }
                while(window.jiboDeferredInit.length) {
                    window.jiboDeferredInit.pop()();
                }
                break;
                case "controlsInit":
                    // controlsInit also contains output type enum and 
                    // capabilities. we use these to figure out how to populate 
                    // the select camera state pickers.
                    window.jiboFrameOutputTypeNames = obj.outputTypeNames;
                    window.jiboOutputConfigDescriptions = obj.outputConfigDescriptions;
                    var caps = obj.capabilities;
                    window.jiboDeferredInit.push(function () {
                        for (key in caps) {
                            var cap = caps[key].capabilities;
                            for (var i in cap.dimensions) {
                                var select = document.getElementById('res-picker' + key);
                                var option = document.createElement('option');
                                option.innerHTML = cap.dimensions[i].width + "x" + cap.dimensions[i].height;
                                option.setAttribute('data-res-width', cap.dimensions[i].width);
                                option.setAttribute('data-res-height', cap.dimensions[i].height);
                                select.appendChild(option);
                            }
                            for (i in cap.outputBuffersConfig) {
                                // console.log("cap.outputBuffers[i]", cap.outputBuffersConfig[i]);
                                var select = document.getElementById('output-config-picker' + key);
                                var option = document.createElement('option');
                                option.innerHTML = window.jiboOutputConfigDescriptions[i].value;
                                option.setAttribute('data-config-index', i);
                                select.appendChild(option);
                            }
                        }
                    });
                    // no break here, fall through!
                case "controls":
                    var controls = obj.controls;
                    Object.keys(displays).forEach( function(key) {
                        var control = controls[key];
                        displays[key].setControls(control);
                    });

                    // update the output buffer choices
                    window.jiboDeferredInit.push(function () {
                        for (key in controls) {
                            var select = document.getElementById('output-picker' + key);
                            while (select.firstChild) {
                                select.removeChild(select.lastChild);
                            }
                            controls[key].controls.outputBuffers.forEach(function (e, i) {
                                var option = document.createElement('option');
                                option.innerHTML = levelDescription(e.outputLevel) + window.jiboFrameOutputTypeNames[e.outputType].value;
                                option.setAttribute('data-outputLevel', e.outputLevel);
                                option.setAttribute('data-outputType', e.outputType);
                                select.appendChild(option);
                            });
                        }
                    });
                break;
                default:
                    console.error("unknown socket message from the server", controls);
                break;
            }
        }
        _this.socket.onerror = function() {
            console.log("Port error");
        }
        _this.socket.onclose = function() {
            console.log("Port closed!");
        }
    };
    
    $("#buttonDisonnect")[0].onclick = function() {
        _this.socket.close();
    };
    
    $("#buttonApply")[0].onclick = function() {
        console.log("Apply!");
        
        var controls = {};
        controls.devices=[];
        Object.keys(displays).forEach( function(key) {
            try {
                controls.devices.push(displays[key].getControls());
            } catch (err) {
                alert(err)
                return;
            }
        });
        
        var url = "http://"+window.location.host+"/apply";
        var dataType = "string";
        var success = function(data, textStatus, jqXHR) {
            console.log("Success!");
        }
        $.post(url, JSON.stringify(controls), success, dataType);
    };
});

