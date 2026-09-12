// =============================================================================
// Utility functions

var rgba = function(r,g,b,a) {
    return "rgba("+r+","+g+","+b+","+a+")";
}

//=============================================================================
//Camera Calibration GUI
CameraCalibrationGUI = function(div) {
    var root = div;
    
    var heading = document.createElement("h2");
    heading.textContent = "Camera Calibration";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 1;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    textareaRequest.value = 0
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get";
    buttonGet.onclick = function() {
        var url = "http://"+window.location.host+"/lps/camera/calibration?"+
            "cameraId="+textareaRequest.value;
        var jqxhr = $.get(url,function(obj){
            textareaResponse.value = JSON.stringify(obj,null,2)
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    }
    
    div.appendChild(heading);
    div.appendChild(buttonGet);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaResponse);
};

//=============================================================================
// Mode GUI
ModeGUI = function(div) {
    var root = div;
    
    var heading = document.createElement("h2");
    heading.textContent = "Mode";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 5;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 5;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get";
    buttonGet.onclick = function() {
        var url = "http://"+window.location.host+"/lps/mode"
        var jqxhr = $.get(url,function(obj){
            textareaResponse.value = JSON.stringify(obj,null,2)
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    }
    
    var buttonSet = document.createElement("button");
    buttonSet.textContent = "Set";
    buttonSet.onclick = function() {
        var url = "http://"+window.location.host+"/lps/mode"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    }
    
    div.appendChild(heading);
    div.appendChild(buttonGet);
    div.appendChild(buttonSet);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
};

//=============================================================================
// EntityConfig Debug GUI
EntityConfigGUI = function(div) {
    var root = div;
    
    var heading = document.createElement("h2");
    heading.textContent = "Entity Configuration (debug)";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 40;
    textareaRequest.cols = 80;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 40;
    textareaResponse.cols = 80;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get";
    buttonGet.onclick = function() {
        var url = "http://"+window.location.host+"/lps/entity/config"
        var jqxhr = $.get(url,function(obj){
            textareaResponse.value = JSON.stringify(obj,null,2)
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    }
    
    var buttonSet = document.createElement("button");
    buttonSet.textContent = "Set";
    buttonSet.onclick = function() {
        var url = "http://"+window.location.host+"/lps/entity/config"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    }
    
    
    textareaRequest.addEventListener("keydown", function(event) {
        if (event.ctrlKey && event.keyCode == 13){
            buttonSet.click();
        }
    });
            
    var labelSet = document.createElement("p");
    labelSet.textContent = "Ctrl+Enter to call set config";
    
    div.appendChild(heading);
    div.appendChild(buttonGet);
    div.appendChild(buttonSet);
    div.appendChild(labelSet);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
}


//=============================================================================
// LightingGUI
LightingGUI = function(div) {
    var root = div;
    var div = document.createElement("div");
    div.style.width="300px";
    div.style.height="300px";
    root.appendChild(div);
    
    var MAX_DATA_POINTS = 200;
    
    var seriesLightingLevel = []
    var seriesLightingQuality = []
    
    var plot = $.plot(div,[],{
        seriesLightingLevel: { shadowSize: 0 },
        legend: { position : "nw", show:true},
        yaxes: [
            { min: 0, max: 2, show: true, position: "left" },
            { min: 0, max: 1, show: true, position: "right" }
            ],
        xaxis: { show: true }
    });
    
    var div = document.createElement("div");
    div.appendChild(document.createTextNode("Legend: "));
    var list = document.createElement("ul");
    var item = document.createElement("li");
    item.appendChild(document.createTextNode("Left Axis: Lighting Level"));
    list.appendChild(item);
    var item = document.createElement("li");
    item.appendChild(document.createTextNode("Right Axis: Lighting Quality"));
    list.appendChild(item);
    var item = document.createElement("li");
    item.appendChild(document.createTextNode("Bottom Axis: Timestamp"));
    list.appendChild(item);
    div.appendChild(list);
    root.appendChild(div);
    
    this.update = function(data){
        
        var sectors = data.awareness.sectors.slice();
        
        // sort by timestamp
        best = sectors.reduce(function(a,b) { 
            tA = a.lightingLevel.ts[0]*1000000 + a.lightingLevel.ts[1]
            tB = b.lightingLevel.ts[0]*1000000 + b.lightingLevel.ts[1]
            if (tA > tB)
                return a
            else
                return b;
        });
        
        var x = (best.lightingLevel.ts[0] * 1000000 +
            best.lightingLevel.ts[1]) / 1000000;
        var y = best.lightingLevel.value
            
        seriesLightingLevel.push([x,y]);
        while (seriesLightingLevel.length > MAX_DATA_POINTS)
            seriesLightingLevel.shift()
        
        // sort by timestamp
        best = sectors.reduce(function(a,b) { 
            tA = a.lightingQuality.ts[0]*1000000 + a.lightingQuality.ts[1]
            tB = b.lightingQuality.ts[0]*1000000 + b.lightingQuality.ts[1]
            if (tA > tB)
                return a
            else
                return b;
        });
        
        var x = (best.lightingQuality.ts[0] * 1000000 +
            best.lightingQuality.ts[1]) / 1000000;
        var y = best.lightingQuality.value
            
        seriesLightingQuality.push([x,y]);
        while (seriesLightingQuality.length > MAX_DATA_POINTS)
            seriesLightingQuality.shift()
        
        try {
            var datasets = []
            datasets.push({
                label:'Lighting Level',
                data:seriesLightingLevel,
                yaxis:1
            });
            
            datasets.push({
                label:'Lighting Quality',
                data:seriesLightingQuality,
                yaxis:2
            });
            
            plot.setData(datasets)
            plot.setupGrid()
            plot.draw()
        } catch(err){
            console.log(err)
        }
    };
};


//=============================================================================
// Recorder GUI
RecorderGUI= function(div) {
    
    var heading = document.createElement("h2");
    heading.textContent = "Recorder";
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 1;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonStart = document.createElement("button");
    buttonStart.textContent = "Start";
    buttonStart.onclick = function() {
        var url = "http://"+window.location.host+"/lps/record/start"
        var jqxhr = $.post(url,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    };
    
    var buttonStop = document.createElement("button");
    buttonStop.textContent = "Stop";
    buttonStop.onclick = function() {
        var url = "http://"+window.location.host+"/lps/record/stop"
        var jqxhr = $.post(url,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    };
    
    // Calls "GET" and downloads the zip file
    var buttonDownload = document.createElement("button");
    buttonDownload.textContent = "Download";
    buttonDownload.onclick = function() {
        window.location = "http://"+window.location.host+"/lps/record/download"
    };
    
    // Calls "POST" and clears the on robot data
    var buttonClear = document.createElement("button");
    buttonClear.textContent = "Clear";
    buttonClear.onclick = function() {
        var url = "http://"+window.location.host+"/lps/record/clear"
        var jqxhr = $.post(url,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    };
    
    div.appendChild(heading);
    div.appendChild(buttonStart);
    div.appendChild(buttonStop);
    div.appendChild(buttonDownload);
    div.appendChild(buttonClear);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaResponse);
}

//=============================================================================
//Player GUI
PlayerGUI= function(div) {
    
    var heading = document.createElement("h2");
    heading.textContent = "Player";
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 1;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonStart = document.createElement("button");
    buttonStart.textContent = "Start";
    buttonStart.onclick = function() {
        var url = "http://"+window.location.host+"/lps/play/start"
        var jqxhr = $.post(url,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    };
    
    var buttonStop = document.createElement("button");
    buttonStop.textContent = "Stop";
    buttonStop.onclick = function() {
        var url = "http://"+window.location.host+"/lps/play/stop"
        var jqxhr = $.post(url,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    };
    
    var form = document.createElement("form");
    var input = document.createElement("input");
    input.type = "file";
    var button = document.createElement("input");
    button.type = "button";
    button.value = "Upload";
    
    form.appendChild(input);
    form.appendChild(document.createElement("br"));
    form.appendChild(button);
    
    button.onclick = function() {
        var fd = new FormData(form);
        fd.append('file',input.files[0]);
        var jqxhr = $.ajax({
            url: "http://"+window.location.host+"/lps/play/upload",
            data: fd,
            processData: false,
            contentType: false,
            cache: false,
            type: "POST",
            success: function(data, status, jqXHR){
                textareaResponse.value = 
                    jqXHR.status + " " + jqXHR.statusText;
            },
            fail: function(jqXHR, textStatus, errorThrown){
                textareaResponse.value = 
                    jqXHR.status + " " + jqXHR.statusText;
            },
            always: function(msg){  },
            // Deprecated functions
            done: function(data, status, jqXHR){
                textareaResponse.value = 
                    jqXHR.status + " " + jqXHR.statusText;
            },
            error: function(jqXHR, textStatus, errorThrown){ 
                textareaResponse.value = 
                    jqXHR.status + " " + jqXHR.statusText;
            } 
        });
    }
    
    
    div.appendChild(heading);
    div.appendChild(buttonStart);
    div.appendChild(buttonStop);
    div.appendChild(form);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaResponse);
}

//=============================================================================
// Face Training GUI
FaceTrainingGUI= function(div) {
    
    var heading = document.createElement("h2");
    heading.textContent = "Face Training";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 10;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    var value = {name:"Foobar", kind:"face", index:0}; 
    textareaRequest.value = JSON.stringify(value,null,2);
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonTrain = document.createElement("button");
    buttonTrain.textContent = "Train";
    buttonTrain.onclick = function() {
        var url = "http://"+window.location.host+"/lps/identity/train"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            try {
                var value = "";
                if (msg.responseJSON){
                    value = JSON.stringify(msg.responseJSON,null,2);
                } else if (msg.responseText){
                    value = msg.responseText;
                }
                textareaResponse.value = value;
            } catch (err) {
                textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
            }
        });
        jqxhr.always(function(msg){
        });
    }
    
    div.appendChild(heading);
    div.appendChild(buttonTrain);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
};

//=============================================================================
// Detection GUI
DetectionGUI= function(div, id) {
    this.div = div;
    this.div.style.width="300px";
    
    var cameraId = id;
    
    this.update = function(data){
        while(this.div.firstChild){
            this.div.removeChild(this.div.firstChild);
        }
        
        for (var i = 0; i < data.entities.length; ++i){
            var entity = data.entities[i]
            for (var j = 0; j < entity.parts.length; ++j){
                var part = entity.parts[j].value;
                for (var k = 0; k < part.detections.length; ++k){
                    var detection = part.detections[k];
                    if (detection.cameraId != cameraId){
                        continue;
                    }
                    var did = k;
                    var pid = part.id;
                    var eid = entity.id;
                    
                    // Prep the canvas to draw everything
                    var canvas = document.createElement("canvas");
                    canvas.width = 300;
                    canvas.height = 300;
                    var context = canvas.getContext("2d");
                    this.div.appendChild(canvas);
                    
                    // Load the image
                    var url = "http://"+window.location.host+"/lps/detection?"+
                        "entityId="+eid+
                        "&partId="+pid+
                        "&detectionId="+did+
                        "&cachebuster="+((new Date()).getTime());
                    var image = new Image()
                    image.src = url;
                    
                    image.onload = function() {
                        // Adjust the canvas to match the image size
                        canvas.width = image.width;
                        canvas.height = image.height;

                        // Draw the image
                        context.drawImage(image,0,0);
                        
                        // Draw any detection points
            if (detection.imagePoints) {
                            for (var l = 0; l < detection.imagePoints.length; ++l){
                var imagePoint = detection.imagePoints[l];
                            
                var x = imagePoint.point.x - detection.chipDetails.rect.left;
                var y = imagePoint.point.y - detection.chipDetails.rect.top;
                var r = 5;
                var id = imagePoint.id;
                            
                // Draw Circle
                context.beginPath();
                context.lineWidth = "1";
                context.strokeStyle="rgba(255,0,0,1.0)";
                context.arc(x,y,r, 0,2*Math.PI);
                context.stroke();
                            
                // Draw Id
                context.textAlign = "center";
                context.textBaseline = "bottom";
                context.font = "bold 10px Arial";
                context.fillStyle = "rgba(0,255,0,1.0)"
                context.fillText(id.toString(), x, y);
                            }
            }
                    }
                }
            }
        }
    }
}

//=============================================================================
// Barcode GUI
BarcodeGUI= function(div) {
    var heading = document.createElement("h2");
    heading.textContent = "Barcodes";
    
    var textarea = document.createElement("textarea");
    textarea.rows = 10;
    textarea.cols = 80;
    textarea.spellcheck = false;
    textarea.readOnly = true;
    textarea.disabled = true;
    
    var button = document.createElement("button");
    button.textContent = "Request barcode";
    button.onclick = function() {
        var url = "http://"+window.location.host+"/lps/barcode"
        var jqxhr = $.get(url,function(obj){
            console.log("Got Barcodes");
            textarea.value = JSON.stringify(obj, null, 2);
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            console.log("Failed to get barcodes");
        });
        jqxhr.always(function(msg){
        }, "json");
    }
    div.appendChild(heading);
    div.appendChild(button);
    div.appendChild(document.createElement("br"));
    div.appendChild(textarea);
}

//=============================================================================
// Full Faces GUI
FullFacesGUI= function(div) {
    
    var heading = document.createElement("h2");
    heading.textContent = "Full Face Detection";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 10;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    var value = {camera_id: 0 };
    textareaRequest.value = JSON.stringify(value,null,2);
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonDetect = document.createElement("button");
    buttonDetect.textContent = "Detect";
    buttonDetect.onclick = function() {
        var url = "http://"+window.location.host+"/lps/faces"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj) {
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText + 
                JSON.stringify(obj, null, 2);
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    }
    
    
    div.appendChild(heading);
    div.appendChild(buttonDetect);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
    div.appendChild(document.createElement("br"));
};

//=============================================================================
// Demand Detect GUI:
DemandDetectGUI= function(div) {
    
    var heading = document.createElement("h2");
    heading.textContent = "Demand Face Detection";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 10;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    var value = {camera_id: 0,
        roi: {
            left: 0,
            top: 0,
            right: 640,
            bottom: 360
        },
        redetect: false };

    textareaRequest.value = JSON.stringify(value,null,2);
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonDetect = document.createElement("button");
    buttonDetect.textContent = "Detect";
    buttonDetect.onclick = function() {
        var url = "http://"+window.location.host+"/lps/demand_detect"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj) {
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText + 
                JSON.stringify(obj, null, 2);
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    }
    
    
    div.appendChild(heading);
    div.appendChild(buttonDetect);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
    div.appendChild(document.createElement("br"));
};



//=============================================================================
// Camera Buttons
CameraButtons = function(div, camera, controls) {
    var camera = camera;
    var dist = 5;
    var ORIGIN = new THREE.Vector3(0,0,0);
    
  //=====================
    // Home Button
    var buttonHome = document.createElement("button");
    buttonHome.textContent = "Home";
    buttonHome.onclick = function() {
        controls.reset();
    };
    div.appendChild(buttonHome);
    
    //=====================
    // X Axis
    var buttonXPos = document.createElement("button");
    buttonXPos.textContent = "X+";
    buttonXPos.onclick = function() {
        camera.position.set(dist,0,0);
        camera.up.set(0,0,1);
        camera.lookAt(ORIGIN);
    };
    div.appendChild(buttonXPos);
    
    var buttonXNeg = document.createElement("button");
    buttonXNeg.textContent = "X-";
    buttonXNeg.onclick = function() {
        camera.position.set(-dist,0,0);
        camera.up.set(0,0,1);
        camera.lookAt(ORIGIN);
    };
    div.appendChild(buttonXNeg);
    
    //=====================
    // Y Axis
    var buttonYPos = document.createElement("button");
    buttonYPos.textContent = "Y+";
    buttonYPos.onclick = function() {
        camera.position.set(0,dist,0);
        camera.up.set(0,0,1);
        camera.lookAt(ORIGIN);
    };
    div.appendChild(buttonYPos);
    
    var buttonYNeg = document.createElement("button");
    buttonYNeg.textContent = "Y-";
    buttonYNeg.onclick = function() {
        camera.position.set(0,-dist,0);
        camera.up.set(0,0,1);
        camera.lookAt(ORIGIN);
    };
    div.appendChild(buttonYNeg);
    
    //=====================
    // Z Axis
    var buttonZPos = document.createElement("button");
    buttonZPos.textContent = "Z+";
    buttonZPos.onclick = function() {
        camera.position.set(0,0,dist);
        camera.up.set(1,0,0);
        camera.lookAt(ORIGIN);
    };
    div.appendChild(buttonZPos);
    
    var buttonZNeg = document.createElement("button");
    buttonZNeg.textContent = "Z-";
    buttonZNeg.onclick = function() {
        camera.position.set(0,0,-dist);
        camera.up.set(1,0,0);
        camera.lookAt(ORIGIN);
    };
    div.appendChild(buttonZNeg);
}

//=============================================================================
// Tracking Canvas
TrackingCanvas = function(div, id) {
    this.div = div;
    var cameraId = id;
    
    var canvas = document.createElement("canvas");
    canvas.width = 1280/2;
    canvas.height = 720/2;
    var context = canvas.getContext("2d");
    
    div.appendChild(canvas);
    
    var image = new Image();
    
    var current = null;
    
    this.update = function(data) {
        current = data;
    };

    // caches the recently received channel data in a self explanatory hash 
    // structure
    var currentChannel = {
        exposureBuffer: null,
        exposureParameters: null,
        exposureStatsParams: null,
        searches: {}
    };

    this.updateChannelSearches = function (channelData) {
        var now = performance.now();
        currentChannel.searches[now] = {
            time: now,
            data: channelData
        };
        setTimeout(() => {
            delete currentChannel.searches[now];
        }, 300);
    }
    this.updateChannelParams = function (channelData) {
        currentChannel.exposureParameters = channelData;
    };
    this.updateChannelBinary = function (channelData) {
        // channelData is a blob
        currentChannel.exposureBuffer = channelData;
    };
    this.updateChannelParamsExposureStats = function (channelData) {
        currentChannel.exposureStatsParams = channelData;
    }
    
    var visibility = {
        "Face Detections":true,
        "Face Search":true,
//        "Image Points": false,
        "Face Tracks":true,
        "Motion Detections":true,
        "Motion Tracks":true,
        "Predictions":true,
        "Exposure Metering": true,
        "Exposure Region Statistics": false,
        "Fused Confidence": false
    };

    var regionDisplayMax = 0;
    image.onload = function(){
        // Draw the current one
        try {
            context.drawImage(image,0,0,canvas.width,canvas.height);
        } catch (err){
            // Ignore the error; means that we got an empty image
            return;
        }
        
        // NOTE: Debug images are half-size grey scale, so double them to get
        // back into camera image coordinates 
        
        // Don't do anything if we have no current data
        if (current === null){
            return;
        }
        
        // Draw the tracking information we have
        var data = current;

        if (visibility["Exposure Region Statistics"] &&
            currentChannel.exposureStatsParams)
        {
            // render squares, modulate the red channel based on the weight.
            var width = currentChannel.exposureStatsParams.width;
            var height = currentChannel.exposureStatsParams.height;
            var max = currentChannel.exposureStatsParams.data.reduce(
                (a, b) => Math.max(a,b)
            , 0);
            regionDisplayMax += (max - regionDisplayMax) * 0.05;
            var scaleUpX = canvas.width / width;
            var scaleUpY = canvas.height / height;
            for (var ii = 0; ii < height; ++ii) {
                for (var jj = 0; jj < width; ++jj) {
                    var v =
                        currentChannel.exposureStatsParams.data[jj * width + ii]
                        / regionDisplayMax * 255.0;
                    v = v.toFixed();
                    context.setLineDash([]);
                    context.lineWidth = "2";
                    // console.log("v", v);
                    // console.log("v, 0, 0, 0.5", rgba(v, 0, 0, 0.5));
                    context.beginPath();
                    context.strokeStyle = rgba(v, 100, v, 0.8);
                    context.rect(
                        jj * scaleUpX + 2, ii * scaleUpY + 2,
                        scaleUpX - 2, scaleUpY - 2);
                    context.stroke();
                }
            }
        }

        // Want to draw the raster buffer using the image data method (which is 
        // the most efficient), but, we cannot do this because of CORS tainting 
        // of the canvas image content. So, we actually end up drawing 
        // rectangles for each of the meter points...

        if (visibility["Exposure Metering"] && currentChannel.exposureParameters) {
            var exposureTA = new Uint8Array(currentChannel.exposureBuffer);

            // the image is a 1/16 of the camera resolution setting. The canvas 
            // dimension is already 1/2 of that. So, the scale is 1/8. the scale 
            // factor is its inverse.
            var width = currentChannel.exposureParameters.bufferDims.width;
            var height = currentChannel.exposureParameters.bufferDims.height;

            var scaleUpX = canvas.width / width;
            var scaleUpY = canvas.height / height;
            console.assert(scaleUpX == scaleUpY,
                "scale up factor should be 1:1, but it isnt.");
            for (var ii=0; ii<height; ++ii) {
                for (var jj=0; jj<width; ++jj) {
                    // this takes the value and puts it into the range 128 
                    // ~ 255, this is so we can still see the brightness of the 
                    // boxes, but not have the color be so dark.
                    var v = exposureTA[ii * width + jj]/2;
                    var value = v + 128;
                    if (v) {
                        var vv = value.toFixed();
                        context.fillStyle = rgba(vv, vv, (value/3).toFixed(), 0.7);
                        context.fillRect(jj * scaleUpX + 2, ii * scaleUpY + 2, 4, 4);
                    }
                }
            }
        }

        // Draw searches
        if (visibility["Face Search"]) {
            Object.keys(currentChannel.searches).map(function (k){
                var dat = currentChannel.searches[k].data;
                var search = dat.searchRegion;
                var scaleUp = dat.searchScaledUp;
                context.beginPath();
                context.lineWidth = "4";
                context.setLineDash([3]);
                context.strokeStyle = rgba(255,scaleUp ? 150 : 0,255,1.0);
                // array of values in this order: left, top, width, height
                context.rect(
                    search[0],
                    search[1],
                    search[2],
                    search[3]
                );
                context.stroke();
                context.setLineDash([]);
            });
        }

        // Draw detections
        for (var i = 0; i < data.detections.length; ++i){
            if (data.detections[i].cameraId != cameraId){
                continue;
            }
            var detection = data.detections[i];
        
            var source = detection.sourceRect;
            var hScale = canvas.width / (source.right - source.left);
            var vScale = canvas.height / (source.bottom - source.top);
            
            if (detection.kind === "face" && !visibility["Face Detections"])
                continue;
            if (detection.kind === "motion" && !visibility["Motion Detections"])
                continue;
            
            
            // Draw detection
            var left = detection.chipDetails.rect.left * hScale + source.left;
            var right = detection.chipDetails.rect.right * hScale + source.left;
            var top = detection.chipDetails.rect.top * vScale + source.top;
            var bottom = detection.chipDetails.rect.bottom * vScale + source.top;
            
            var x = left;
            var y = top;
            var w = right - left;
            var h = bottom - top;
            
            // Draw rectangle
            context.beginPath();
            context.lineWidth = "4";
            context.setLineDash([5]);
            if (detection.kind === "face"){
                context.strokeStyle = rgba(0,255,0,1.0);
            } else if (detection.kind === "motion") {
                context.strokeStyle = rgba(0,0,255,1.0);
            } else {
                context.strokeStyle = rgba(255,255,255,1.0);
            }
            context.rect(x,y,w,h);
            context.stroke();
            context.setLineDash([]);
        }
        
        // Draw entities
        for (var i = 0; i < data.entities.length; ++i){
            var entity = data.entities[i];
            var identity = null;
            // Use new ID Summary:
            if (!entity.id_summary){
                identity = {name:"unknown",kind:"invalid",confidence:0.0}
            } else {
                identity = entity.id_summary;
            }
            
            for (var j = 0; j < entity.parts.length; ++j){
                var part = entity.parts[j] 
                var key = part.key;
                
                if (key === "head" && !visibility["Face Tracks"])
                    continue;
                if (key === "motion" && !visibility["Motion Tracks"])
                    continue;
                
                for (var k = 0; k < part.value.trackers.length; ++k){
                    var tracker = part.value.trackers[k];
                    
                    // Skip trackers that are not used with this camera
                    if (tracker.cameraId != cameraId){
                        continue;
                    }
                    
                    if (!tracker.inFOV){
                        continue;
                    }
                    
                    var hScale = (canvas.width / tracker.imageSize.x);
                    var vScale = (canvas.height / tracker.imageSize.y);
                    
                    //=========================================================
                    // Draw Predictions
                    if (visibility["Predictions"]){
                        var left = tracker.predictedRectangle.left * hScale;
                        var right = tracker.predictedRectangle.right * hScale;
                        var top = tracker.predictedRectangle.top * vScale;
                        var bottom = tracker.predictedRectangle.bottom * vScale;
                        
                        var x = left;
                        var y = top;
                        var w = right - left;
                        var h = bottom - top;
                        
                        var cx = x + w/2;
                        var cy = y + h/2;
                        var vx = tracker.velocity.x * hScale;
                        var vy = tracker.velocity.y * vScale;
                        
                        var alpha = 1.0;
                        if (tracker.occluded){
                            alpha = 0.5;
                        }

                        // Draw rectangle
                        context.beginPath();
                        context.lineWidth = "4";
                        context.setLineDash([1]);
                        if (key === "head"){
                            var cLow = Math.trunc(0*tracker.confidence);
                            var cHigh = Math.trunc(255*tracker.confidence);
                            context.strokeStyle = rgba(cLow,cHigh,cLow,alpha);
                        }else if (key === "motion"){
                            context.strokeStyle = rgba(0,0,255,alpha);
                        }else{
                            context.strokeStyle = rgba(255,255,255,alpha);
                        }
                        context.rect(x,y,w,h);
                        context.stroke();
                        context.setLineDash([]);
                    }
                    
                    //=========================================================
                    // Draw Actual
                    
                    var left = tracker.rectangle.left * hScale;
                    var right = tracker.rectangle.right * hScale;
                    var top = tracker.rectangle.top * vScale;
                    var bottom = tracker.rectangle.bottom * vScale;
                    
                    var x = left;
                    var y = top;
                    var w = right - left;
                    var h = bottom - top;
                    
                    var cx = x + w/2;
                    var cy = y + h/2;
                    var vx = tracker.velocity.x * hScale;
                    var vy = tracker.velocity.y * vScale;
                    
                    var alpha = 1.0;
                    if (tracker.occluded){
                        alpha = 0.5;
                    }

                    // Draw rectangle
                    context.beginPath();
                    context.lineWidth = "4";
                    if (key === "head"){
                        var cLow = Math.trunc(0*tracker.confidence);
                        var cHigh = Math.trunc(255*tracker.confidence);
                        context.strokeStyle = rgba(cLow,cHigh,cLow,alpha);
                    }else if (key === "motion"){
                        context.strokeStyle = rgba(0,0,255,alpha);
                    }else{
                        context.strokeStyle = rgba(255,255,255,alpha);
                    }
                    context.rect(x,y,w,h);
                    context.stroke();
                    
                    // Draw Velocity
                    context.beginPath();
                    context.lineWidth = "2";
                    context.strokeStyle=rgba(255,0,0,alpha);
                    context.moveTo(cx,cy);
                    context.lineTo(cx+vx, cy+vy);
                    context.stroke();
                    
                    context.moveTo(0,0);
                    
            //                    if (visibility["Image Points"]){
            // No longer sending points by default.
            if (false) {
                    // Draw Points
                        for (var l = 0; l < tracker.points.length; ++l){
                            var imagePoint = tracker.points[l];
                            var radius = 5;
    
                            // Draw Circle
                            context.beginPath();
                            context.lineWidth = "1";
                            context.strokeStyle="rgba(255,0,0,1.0)";
                            context.arc(imagePoint.point.x * hScale,
                                    imagePoint.point.y * vScale, 
                                    radius, 0,2*Math.PI);
                            context.stroke();
                            
                            // Draw Id
                            context.textAlign = "center";
                            context.textBaseline = "bottom";
                            context.font = "bold 10px Arial";
                            context.fillStyle = "rgba(0,255,0,1.0)"
                            context.fillText(imagePoint.id.toString(),
                                    imagePoint.point.x * hScale,
                                    imagePoint.point.y * vScale);
                        }
                    }
                    
                    /* TODO: Remove outdated/dead code 
                    // Draw Part Name
                    context.textAlign = "center";
                    context.textBaseline = "middle";
                    context.font = "30px Arial";
                    context.fillStyle = rgba(255,255,0,alpha);
                    context.fillText(tracker.name,cx,cy);
                    */
                    
                    // Draw Entity Name
                    if (key === "head"){
                        context.textAlign = "left";
                        context.textBaseline = "bottom";
                        context.font = "bold 20px Arial";
                        context.fillStyle = rgba(255,255,0,alpha);
                        context.fillText(identity.name + (visibility["Fused Confidence"] ? ": "+
                            identity.confidence.toFixed(3) : ""), x, y);
                    }
                    
                    // Id:
                    context.textAlign = "left";
                    context.textBaseline = "top";
                    context.font = "10px Arial";
                    context.fillStyle = rgba(0,255,255,alpha);
                    context.fillText("("+entity.id + ", "
                        +part.value.id+", "+tracker.id+")", left, bottom);
                    
                    // Tags:
                    context.textAlign = "left";
                    context.textBaseline = "middle";
                    context.font = "12px Arial";
                    context.fillStyle = rgba(250, 150, 80, alpha);
                    for (var tt = 0; tt < entity.tags.length; ++tt) {
                        context.fillText(entity.tags[tt].key + ":" +
                            entity.tags[tt].value.tag.toString(),
                            right + 5, top + 5 + 15 * tt);
                    }
                }
            }
        }
    };
    
    image.onerror = function() { };
    
    // Locate the media service url
    var media_service = "";
    var getMediaServiceURL = function() {
        var url = "http://"+window.location.hostname+":8181/registry";
        var data = {camera: cameraId, type:1 };
        var jqxhr = $.get(url,function(obj){
            var records = obj.records;
            for (var ii = 0; ii < records.length; ++ii){
                var record = records[ii];
                if (record.name == "media"){
                    media_service = 
                        "http://"+record.host+":"+record.port+"/media/photo";
                    break;
                }
            }
        });
        jqxhr.done(function(){ });
        jqxhr.fail(function(){ });
        jqxhr.always(function(){  });
    };
    getMediaServiceURL();
    
    var loop = function() {
        if (image.complete){
            var url = media_service;
            var data = {camera: cameraId, type:1, undistort:false};
            var jqxhr = $.post(url,JSON.stringify(data),function(obj){
                image.src = url+"?id="+obj.id;
            });
            jqxhr.done(function(){ });
            jqxhr.fail(function(){ });
            jqxhr.always(function(){  });
        } else {
            return
        }
    }
    
    var interval = null;
    this.start = function(){
        if (interval == null){
            interval = setInterval(loop,100);
        } else { 
            return;
        }
    }
    this.stop = function(){
        if (interval == null){
            return
        } else { 
            clearInterval(interval);
            interval = null;
        }
    }
    
    this.setVisible = function(key, visible){
        visibility[key] = visible;
    };
    this.getVisible = function(key){
        if (key in visibility)
            return visibility[key]
        else
            return false;
    }
};

//=============================================================================
// Camera
Camera = function(data) {
    
    var fov = data.fov.y * (180 / Math.PI);
    var aspect = data.width / data.height;
    var near = 0.25;
    var far = 5.0;
    this.model = new THREE.Object3D();
    var camera = new THREE.PerspectiveCamera(fov,aspect,near,far);
    var helper = new THREE.CameraHelper(camera);
    
    this.model.add(camera);
    this.model.add(helper);
    
    this.update = function(data){
        var fov = data.fov.y * (180 / Math.PI);
        var aspect = data.width / data.height;
        var near = 0.25;
        var far = 5.0;

        // TODO: Figure out why these are not affecting the camera display
        camera.fov = fov;
        camera.aspect = aspect;
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
        
        camera.position.set(0, 0, 0);
        camera.rotation.set(0, 0, 0);
        camera.updateMatrix();
        
        // Rotate to our world's basis
        var rX = new THREE.Matrix4().makeRotationX(Math.PI / 2.0);
        var rY = new THREE.Matrix4();
        var rZ = new THREE.Matrix4().makeRotationY(-Math.PI / 2.0);
        var r = new THREE.Matrix4();
        r.multiply(rX);
        r.multiply(rY);
        r.multiply(rZ);
        camera.applyMatrix(r);

        // Transform this.camera
        var m = data.transform;
        var xform = new THREE.Matrix4();
        xform.set(
            m.n11, m.n12, m.n13, m.n14,
            m.n21, m.n22, m.n23, m.n24,
            m.n31, m.n32, m.n33, m.n34,
            m.n41, m.n42, m.n43, m.n44
        );
        camera.applyMatrix(xform);
    };
    this.update(data);
};

//=============================================================================
// Entity
Entity = function(data) {
    var extent = data.extent;
    
    var geometry = new THREE.BoxGeometry(1,1,1);
    var material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true
    });
    var cube = new THREE.Mesh(geometry, material);
    var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0), 1, 0xff0000);
    var axis = new THREE.AxisHelper(1.5);
    
    axis.material.linewidth = 5;
    
    this.model = new THREE.Object3D();
    this.model.add(cube);
    // TODO: Enable this when we have more than 1 part inside an entity
    // otherwise, it's just confusing to see two axes.
//    this.model.add(axis);
    this.model.add(arrow);
    
    this.update = function(data){
        var id = data.id;
        var conf = data.confidence;
        var pos = data.position;
        var rot = data.orientation;
        var extent = data.extent;
        var sta = data.static;
        var vis = data.occluded;
        var vel = data.velocity;
        
        this.model.position.set(pos.x, pos.y, pos.z);
        this.model.rotation.set(rot.x, rot.y, rot.z);
        this.model.scale.set(extent.x, extent.y, extent.z);
        this.model.visible = !vis;

        var velocity = new THREE.Vector3(vel.x, vel.y, vel.z);
        var dir = velocity.clone();
        dir.normalize();
        
        var scalar = Math.min(extent.x,extent.y,extent.z);
        scalar = Math.abs(scalar) > 0.00001 ?  1.0/scalar : 1.0;
        
        var len = scalar*velocity.length();
        arrow.setDirection(dir);
        if (len < Number.EPSILON) {
            arrow.visible = false;
        } else {
            arrow.visible = true;
            arrow.setLength(len, len/5, len/5);
        }
    };
    this.update(data);
};

//=============================================================================
// Part
Part = function(key, data) {

    var color = new THREE.Color(0xffffff);
    if (key === "head"){
        color = new THREE.Color(0x00ff00);
    }
    else if (key === "motion"){
        color = new THREE.Color(0x0000ff);
    }

    var geometry = new THREE.BoxGeometry(1,1,1);
    var material = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true
    });
    this.model = new THREE.Object3D();
    var cube = new THREE.Mesh(geometry, material);
    var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0), 1, 0xff0000);
    var axis = new THREE.AxisHelper(1.5);
    axis.material.linewidth = 5;
    
    this.model.add(cube);
    this.model.add(axis);
    this.model.add(arrow);

    this.update = function(data) {
        var id = data.id;
        var conf = data.confidence;
        var vis = data.occluded;
        var pos = data.tracker.position;
        var rot = data.tracker.rotation;
        var vel = data.tracker.velocity;
        var ang = data.tracker.angVelocity;
        var extent = data.extent;
        
        this.model.position.set(pos.x, pos.y, pos.z);
        this.model.rotation.set(rot.x, rot.y, rot.z);
        this.model.scale.set(extent.x, extent.y, extent.z);
        this.model.visible = !vis;

        var velocity = new THREE.Vector3(vel.x, vel.y, vel.z);
        var dir = velocity.clone();
        dir.normalize();
        
        var scalar = Math.min(extent.x,extent.y,extent.z);
        scalar = Math.abs(scalar) > 0.00001 ?  1.0/scalar : 1.0;
        
        var len = scalar*velocity.length();
        arrow.setDirection(dir);
        if (len < Number.EPSILON) {
            arrow.visible = false;
        } else {
            arrow.visible = true;
            arrow.setLength(len, len/5, len/5);
        }
    }
    this.update(data);
};

//=============================================================================
// Rays Object
Rays = function(data) {

    this.model = new THREE.Object3D();
    var rays = [];

    this.update = function(data) {
        // Remove all the rays since there are no IDs on the input data
        for (var i = 0; i < this.model.children.length; ++i)
            this.model.remove(this.model.children[i]);
        
        for (var i = 0; i < data.length; ++i){
            var ray = data[i];
            var dir = new THREE.Vector3(ray.dir.x, ray.dir.y, ray.dir.z);
            var arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(0, 0, 0), 1, 0xffff00);
                arrow.setDirection(dir.normalize());
                arrow.setLength(5.0, 0.25, 0.25);
                arrow.position.set(ray.origin.x, ray.origin.y, ray.origin.z);
            this.model.add(arrow);
        }
    };
    this.update(data);
};

Sector = function(data, timestamp){
    var AGE_ATTENUATION = 10.0;
    var SEGMENTS = 10;
    
    var Measurement = function(data, timestamp, arc, start, end, color) {
        this.model = new THREE.Object3D();
        
        var color = new THREE.Color(color);
        var zero = new THREE.Color(0,0,0);
        
        var innerRadius = start;
        var outerRadius = end;
        var thetaSegments = SEGMENTS;
        var phiSegments = SEGMENTS;
        var thetaStart = arc.start;
        var thetaLength = arc.end-arc.start;
        var geometry = new THREE.RingGeometry(innerRadius, outerRadius, 
            thetaSegments, phiSegments, thetaStart, thetaLength);
        
        var material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: false,
            opacity: 0.0,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        var mesh = new THREE.Mesh(geometry, material);
        
        this.model.add(mesh);
        
        this.update = function(data, timestamp) {
            // Get the Age in floating point seconds
            var now = timestamp[0]*1000000 + timestamp[1];
            var then = data.ts[0]*1000000 + data.ts[1];
            var age = (now - then)/100000;
            
            mesh.material.opacity = 1 - (age/AGE_ATTENUATION);
            
            // Set the color as a linear interpolation between a "zero" color
            // and the user set color
            mesh.material.color.copy(zero);
            mesh.material.color.lerp(color, data.value);
        }
        this.update(data, timestamp);
    }
    
    var Bounds = function(innerRadius, outerRadius, startAngle, endAngle) {
        this.model = new THREE.Object3D();
        
        var v1 = new THREE.Vector3(Math.cos(startAngle),Math.sin(startAngle),0);
        v1.normalize();
        var v2 = new THREE.Vector3(Math.cos(endAngle),Math.sin(endAngle),0);
        v2.normalize();
        
        var material = new THREE.LineBasicMaterial( {
            color: 0xffffff,
            linewidth: 5,
            linecap: "round",
            linejoin: "round", 
            vertexColors: THREE.NoColors,
            fog: false
        });
        
        var curve = new THREE.EllipseCurve(0, 0, innerRadius, innerRadius, 
            startAngle, endAngle, false, 0);
        var points = curve.getSpacedPoints(SEGMENTS);
        var path = new THREE.Path();
        var geometry = path.createGeometry(points);
        var line = new THREE.Line(geometry, material);
        
        this.model.add(line);
        
        var curve = new THREE.EllipseCurve(0, 0, outerRadius, outerRadius, 
            startAngle, endAngle, false, 0);
        var points = curve.getSpacedPoints(SEGMENTS);
        var path = new THREE.Path();
        var geometry = path.createGeometry(points);
        var line = new THREE.Line(geometry, material);
        
        this.model.add(line);
        
        var p1 = new THREE.Vector3();
        var p2 = new THREE.Vector3();
        p1.copy(v1);
        p2.copy(v1);
        p1.setLength(innerRadius);
        p2.setLength(outerRadius);
        var curve = new THREE.LineCurve3(p1, p2);
        var points = curve.getSpacedPoints(SEGMENTS);
        var path = new THREE.Path();
        var geometry = path.createGeometry(points);
        var line = new THREE.Line(geometry, material);
        
        this.model.add(line);
        
        var p1 = new THREE.Vector3();
        var p2 = new THREE.Vector3();
        p1.copy(v2);
        p2.copy(v2);
        p1.setLength(innerRadius);
        p2.setLength(outerRadius);
        var curve = new THREE.LineCurve3(p1, p2);
        var points = curve.getSpacedPoints(SEGMENTS);
        var path = new THREE.Path();
        var geometry = path.createGeometry(points);
        var line = new THREE.Line(geometry, material);
        
        this.model.add(line);
    }
    
    var Label = function(id, arc, distance) {
        this.model = new THREE.Object3D();
        geometry = new THREE.TextGeometry(""+id, {
            size: 0.5,
            height: 0.01,
            curveSegments: 12,
            bevelEnabled: false,
            bevelThickness: 10,
            bevelSize: 8,
        });
        
        var material = new THREE.MeshBasicMaterial({color: 0xffffff})
        
        var mesh = new THREE.Mesh(geometry, material);
        
        var angle = (arc.start + arc.end)/2;
        var vector = new THREE.Vector3(Math.cos(angle),Math.sin(angle),0);
        vector.setLength(distance);
        
        var theta = angle - Math.PI/2;
        mesh.rotation.set(0,0,theta);
        mesh.position.set(vector.x, vector.y, vector.z);
        
        this.model.add(mesh);
    }
    
    this.model = new THREE.Object3D();
    

    var activity = new Measurement(
        data.activity, timestamp, data.arc, 2, 2.75, 0xff0000);
    var audioLevel = new Measurement(
        data.audioLevel, timestamp, data.arc, 2.75, 3.5, 0x00ff00);
    var lightingLevel = new Measurement(
        data.lightingLevel, timestamp, data.arc, 3.5, 4.25, 0x0000ff);
    var lightingQuality = new Measurement(
        data.lightingQuality, timestamp, data.arc, 4.25, 5, 0x00ffff);
    
    var bounds = new Bounds(2,5, data.arc.start, data.arc.end);
    
    var text = new Label(data.id, data.arc, 5.5);
    
    this.model.add(activity.model);
    this.model.add(audioLevel.model);
    this.model.add(lightingLevel.model);
    this.model.add(lightingQuality.model);
    this.model.add(bounds.model)
    this.model.add(text.model);
    
    this.update = function(data, timestamp) {
        activity.update(data.activity, timestamp)
        audioLevel.update(data.audioLevel, timestamp)
        lightingLevel.update(data.lightingLevel, timestamp)
        lightingQuality.update(data.lightingQuality, timestamp)
    }
    this.update(data, timestamp);
};

//==============================================================================
// Detections with 3D information
Detection = function(data){
    
    var geometry = new THREE.BoxGeometry(1,1,1);
    var material = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        wireframe: true,
        wireframeLinewidth: 5
    });
    var cube = new THREE.Mesh(geometry, material);
    var axis = new THREE.AxisHelper(1.5);
    axis.material.linewidth = 5;
    
    this.model = new THREE.Object3D();
    this.model.add(cube);
    this.model.add(axis);
    
    this.update = function(data){
        var conf = data.confidence;
        var pos = data.position;
        var rot = data.orientation;
        var extent = data.extent;
        var kind = data.kind
        
        this.model.position.set(pos.x, pos.y, pos.z);
        this.model.rotation.set(rot.x, rot.y, rot.z);
        this.model.scale.set(extent.x, extent.y, extent.z);
        this.model.visible = true;
    };
    this.update(data);
}

Awareness = function(){
    var sectors = {};
    
    this.model = new THREE.Object3D();
    
    this.update = function(data, timestamp){
        var ids = [];
        if (!data)
            return;
        if (!data.sectors)
            return;
        
        for (var i = 0; i < data.sectors.length; ++i){
            var id = data.sectors[i].id;
            if ( !(id in sectors) ){
                sectors[id] = new Sector(data.sectors[i], timestamp);
                this.model.add(sectors[id].model);
            } else {
                sectors[id].update(data.sectors[i], timestamp);
            }
            ids.push(id.toString());
        }
        for (var id in sectors){
            if (sectors.hasOwnProperty(id) && $.inArray(id, ids) == -1){
                this.model.remove(sectors[id].model);
                delete sectors[id];
            }
        }
    }
}

//=============================================================================
// Audio Entity
AudioEntity = function(data) {

    //var extent = data.confidence;
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        wireframe: true
    });
    this.model = new THREE.Object3D();
    var cube = new THREE.Mesh(geometry, material);
    
    this.model.add(cube);
   
    this.update = function(data) {
        //var id = data.id;
        //var conf = data.confidence;
        var pos = data.position;
        cube.position.set(pos.x, pos.y, pos.z);
        cube.rotation.set(0, 0, 0);
        var extent = (data.confidence * 0.5) + 0.25;
        cube.scale.x = extent;
        cube.scale.y = extent;
        cube.scale.z = extent;
        if (data.confidence >= 0.75) {
            cube.material.color.setHex(0xff0000);
        } else if (data.confidence >= 0.5) {
            cube.material.color.setHex(0xffff00);
        } else {
            cube.material.color.setHex(0x00ffff);
        }
        //cube.visible = true;
    }
    this.update(data);
};

//=============================================================================
// Scene (parallel to THREE.js scene)
Scene = function(){
    this.root = new THREE.Scene();
    
    var axis = new THREE.AxisHelper(1.75);
    axis.material.linewidth = 3;
    this.root.add(axis);

    var grid = new THREE.GridHelper(5, 1);
    grid.setColors(0, 0);
    grid.rotateX(Math.PI / 2.0)
    this.root.add(grid);
    
    var cameras = {};
    var entities = {};
    var parts = {};
    var rays = {};
    var audioEntities = {}; 
    var sectors = {};
    var detections = [];
    
    var awareness = new Awareness();
    this.root.add(awareness.model);
    
    this.update = function(data) {
        // TODO: Delete anything not present in the data
        
        // Update the cameras, removing any that are not present anymore
        var ids = [];
        for (var i = 0; i < data.cameras.length; ++i){
            var id = data.cameras[i].id;
            if ( !(id in cameras) ){
                cameras[id] = new Camera(data.cameras[i]);
                this.root.add(cameras[id].model);
            } else {
                cameras[id].update(data.cameras[i]);
            }
            ids.push(id.toString());
        }
        for (var id in cameras){
            if (cameras.hasOwnProperty(id) && $.inArray(id, ids) == -1){
                this.root.remove(cameras[id].model);
                delete cameras[id];
            }
        }
        
        // Update the entities
        var ids = [];
        for (var i = 0; i < data.entities.length; ++i){
            var id = data.entities[i].id;
            if ( !(id in entities) ){
                entities[id] = new Entity(data.entities[i]);
                this.root.add(entities[id].model);
            } else {
                entities[id].update(data.entities[i]);
            }
            ids.push(id.toString());
        }
        for (var id in entities){
            if (entities.hasOwnProperty(id) && $.inArray(id, ids) == -1){
                this.root.remove(entities[id].model);
                delete entities[id];
            }
        }
        
        // Update the parts
        var ids = [];
        for (var i = 0; i < data.entities.length; ++i){
            var entity = data.entities[i]
            for (var j = 0; j < entity.parts.length; ++j){
                var id = entity.parts[j].value.id;
                if ( !(id in parts) ){
                    parts[id] = new Part(entity.parts[j].key,
                        entity.parts[j].value);
                    this.root.add(parts[id].model);
                } else {
                    parts[id].update(entity.parts[j].value);
                }
                ids.push(id.toString());
            }
        }
        for (var id in parts){
            if (parts.hasOwnProperty(id) && $.inArray(id, ids) == -1){
                this.root.remove(parts[id].model);
                delete parts[id];
            }
        }
        
        // Update the rays
        // Note that we get the IDs for the rays from the associated part id
        var ids = [];
        for (var i = 0; i < data.entities.length; ++i){
            var entity = data.entities[i]
            for (var j = 0; j < entity.parts.length; ++j){
                var part = entity.parts[j].value;
                var id = part.id;
                if ( !(id in rays) ){
                    rays[id] = new Rays(part.rays);
                    this.root.add(rays[id].model);
                } else {
                    rays[id].update(part.rays);
                }
                ids.push(id.toString());
            }
        }
        for (var id in rays){
            if (rays.hasOwnProperty(id) && $.inArray(id, ids) == -1){
                this.root.remove(rays[id].model);
                delete rays[id];
            }
        }
        
        awareness.update(data.awareness, data.ts);
        
        // TODO: Add detection drawing back in after making it more efficient:
        // TODO: We could also draw the image chip as a planar face
        
//        // Update the detections that have 3D info
//        // Note that they have no unique IDs, so we create and destroy 
//        // everything on every update.
//        // Remove old detections
//        for (var i = 0; i < detections.length; ++i){
//            this.root.remove(detections[i].model);
//        }
//        
//        // Clear the array
//        detections.length = 0;
//        
//        // Add new detections
//        for (var i = 0; i < data.detections.length; ++i){
//            detection = new Detection(data.detections[i]);
//            this.root.add(detection.model);
//            detections.push(detection);
//        }
    };

    this.audioUpdate = function(data) {
        var ids = [];
        for (var i=0; i<data.entities.length; ++i) {
            var entity = data.entities[i];
            var id = entity.id;
            if ( !(id in audioEntities) ) {
                audioEntities[id] = new AudioEntity(entity);
                this.root.add(audioEntities[id].model);
            } else {
                audioEntities[id].update(entity);
            }
            ids.push(entity.id.toString());
        }
        for (var id in audioEntities) {
            if (audioEntities.hasOwnProperty(id) && $.inArray(id, ids) == -1) {
                this.root.remove(audioEntities[id].model);
                delete audioEntities[id];
            }
        }
    };
};
Scene.prototype.constructor = Scene;

//=============================================================================
// Viewer3D
Viewer3D = function(div)
{
    var _this = this;
    var root = div;
    
    var HEIGHT = 480;
    var WIDTH = 640;
    var CLEAR_COLOR = 0x222222;
    var ORIGIN = new THREE.Vector3(0, 0, 0);
    var FPS = 15;
    
    var camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.x = 5;
    camera.position.y = 5;
    camera.position.z = 5;
    camera.lookAt(ORIGIN);
    
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);
    renderer.setClearColor(CLEAR_COLOR);
    
    var controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.enabled = true;
    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 2.0;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.noRotate = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    
    var stats = new Stats();
    
    var table = document.createElement("table");
    table.border = 1;
    table.cellPadding = 10;
    table.cellSpacing = 3;
    root.appendChild(table);
    
    var row = table.insertRow();
    
    // 3D Viewer Cell
    var cell = row.insertCell();
    cell.appendChild(renderer.domElement);
    
    // Buttons and Legend Cell
    var cell = row.insertCell();
    
    var div = document.createElement("div");
    var cameraButtons = new CameraButtons(div, camera, controls);
    cell.appendChild(div);
    cell.appendChild(document.createElement("br"));
    cell.appendChild(stats.domElement);
    cell.appendChild(document.createElement("br"));
    
    // Viewer Legend
    var div = document.createElement("div");
    div.appendChild(document.createTextNode("Legend: "));
    var list = document.createElement("ul");
    var item = document.createElement("li");
    item.appendChild(document.createTextNode("opacity: measurement age"));
    list.appendChild(item);
    var item = document.createElement("li");
    item.appendChild(document.createTextNode(
        "darkness: measurement magnitude (low = dark, high = color)"));
    list.appendChild(item);
    var item = document.createElement("li");
    item.appendChild(document.createTextNode("red: activity level"));
    list.appendChild(item);
    var item = document.createElement("li");
    item.appendChild(document.createTextNode("green: audio level"));
    list.appendChild(item)
    var item = document.createElement("li");
    item.appendChild(document.createTextNode("blue: lighting level"));
    list.appendChild(item);
    div.appendChild(list);
    cell.appendChild(div);
    
    // Graphs
    var cell = row.insertCell();
    
    var div = document.createElement("div");
    cell.appendChild(div)
    this.lightingLevelGUI = new LightingGUI(div);
    
    
    // NOTE: Patrick Doran - 2016/04/07: The TrackballControls domElement
    // must be connected to the document when constructed or when you 
    // explicitly call "handleResize" because it calculates the size of the 
    // screen using information from these other dom elements. In this case, 
    // the div connections are as follows:
    // document -> TrackingGUI.root -> Viewer3D.root -> renderer -> controls
    controls.handleResize();
    
    // Create the scene
    this.scene = new Scene();
    
    // Main Render Loop
    var then = performance.now();
    var interval = 1000 / FPS;

    function render() {
        var now = performance.now();
        if ((now - then) > interval) {
            then = now;
            stats.begin();
            controls.update();
            renderer.render(_this.scene.root, camera);
            stats.end();
        }
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
    
    
    this.update = function(data){
        this.scene.update(data)
        this.lightingLevelGUI.update(data)
    };
    
    this.setVisible = function(name, value){
        this.scene.setVisible(name,value);
    }
};

RawDataGUI = function(div)
{
    var heading = document.createElement("h2");
    heading.textContent = "Raw Data";
    
    var visualTextArea = document.createElement("textarea");
    visualTextArea.rows = 40;
    visualTextArea.cols = 80;
    visualTextArea.spellcheck = false;
    visualTextArea.readOnly = true;
    visualTextArea.disabled = true;
    
    var audioTextArea = document.createElement("textarea");
    audioTextArea.rows = 40;
    audioTextArea.cols = 80;
    audioTextArea.spellcheck = false;
    audioTextArea.readOnly = true;
    audioTextArea.disabled = true;

    div.appendChild(heading);
    div.appendChild(visualTextArea);
    div.appendChild(audioTextArea);
    
    this.visualUpdate = function(obj) {
        visualTextArea.value = JSON.stringify(obj, null, 2);
    }
    
    this.audioUpdate = function(obj) {
        audioTextArea.value = JSON.stringify(obj, null, 2);
    }
}

SpeakersGUI = function(div)
{
    var root = div;

    var table = document.createElement("table");
    table.border = 1;
    table.cellPadding = 10;
    table.cellSpacing = 3;
    
    var heading = document.createElement("h2");
    heading.textContent = "Speakers";
    heading.align = "center";
    
    root.appendChild(heading);
    root.appendChild(table);

    this.update = function(obj) 
    {
        var speakers = obj.recent_speakers;

        //robot_time is the time, in s, since
        //the robot booted up (uptime)
        var robot_time_s = obj.ts[0];

        while(table.rows.length > 0){
            table.deleteRow(0);
        }

        //create recent speaker table
        var header = table.createTHead();
        var row = header.insertRow(0);
        row.insertCell(0).innerHTML = "Name";
        row.insertCell(1).innerHTML = "ID";
        row.insertCell(2).innerHTML = "Last spoke (s ago)";

        //collect recent speakers to populate table
        for(var i=0; i < speakers.length; i++){
            var row = table.insertRow(i+1);
            row.insertCell(0).innerHTML = speakers[i].id.name;
            row.insertCell(1).innerHTML = speakers[i].entity;
            row.insertCell(2).innerHTML = 
                Math.abs(speakers[i].timestamp[0] - robot_time_s);
        }
    };
};

PresenceGUI = function(div)
{
    var root = div;
 
    var table = document.createElement("table");
    table.border = 1;
    table.cellPadding = 10;
    table.cellSpacing = 3;
    
    var heading = document.createElement("h2");
    heading.textContent = "Presence";
    heading.align = "center";
    
    root.appendChild(heading);
    root.appendChild(table);

    this.update = function(obj) 
    {
        var presence = obj.presence.presence;

        //clear table before repopulating
        while(table.rows.length > 0){
            table.deleteRow(0);
        }

        //create presence entity table
        var header = table.createTHead();
        var row = header.insertRow(0);
        row.insertCell(0).innerHTML = "Name";
        row.insertCell(1).innerHTML = "Confidence";
        row.insertCell(2).innerHTML = "Present";

        //collect all entities in presence array to populate table
        for(var i=0; i < presence.length; i++){
            var row = table.insertRow(i+1);
            row.insertCell(0).innerHTML = presence[i].name;
            row.insertCell(1).innerHTML = presence[i].confidence;
            row.insertCell(2).innerHTML = presence[i].present;
        }
    };
};

TrackingGUI = function(div)
{
    var root = div;
    
    //====================================================
    // Viewer 3D
    var div = document.createElement("div");
    root.appendChild(div);
    var viewer3D = new Viewer3D(div);
    
    root.appendChild(document.createElement("hr"));
    
    //====================================================
    // Controls for Tracking Canvas
    var controls = document.createElement("div");
    root.appendChild(controls)
    
    //====================================================
    // Tracking Canvases
    var table = document.createElement("table");
    table.border = 1;
    table.cellPadding = 10;
    table.cellSpacing = 3;
    root.appendChild(table);
    
    //====================================================
    // Row of camera images
    var row = table.insertRow();
    
    var div = document.createElement("div");
    var tracking0 = new TrackingCanvas(div, 0);
    var cell = row.insertCell();
    cell.appendChild(div);
    
    var div = document.createElement("div");
    var tracking1 = new TrackingCanvas(div, 1);
    var cell = row.insertCell();
    cell.appendChild(div);
    
    //====================================================
    // Row of camera labels
    var row = table.insertRow();
    
    var label = document.createElement("p");
    label.textContent = "camera 0";
    var cell = row.insertCell();
    cell.style.textAlign = 'center';
    cell.appendChild(label)
    
    var label = document.createElement("p");
    label.textContent = "camera 1";
    var cell = row.insertCell();
    cell.style.textAlign = 'center';
    cell.appendChild(label)
    
    //====================================================
    // TODO: Rows of Face Detections
    var row = table.insertRow();
    
    // TODO: Too many tracks cause this to freak out the browser
    var div = document.createElement("div");
    var detections0 = new DetectionGUI(div, 0);
    var cell = row.insertCell();
    cell.appendChild(div);
    
    var div = document.createElement("div");
    var detections1 = new DetectionGUI(div, 1);
    var cell = row.insertCell();
    cell.appendChild(div);

    //====================================================
    // Recent speaker and presence tables
    root.appendChild(document.createElement("hr"));

    var table = document.createElement("table");
    table.border = 0;
    table.cellPadding = 3;
    table.cellSpacing = 3;
    root.appendChild(table);
    
    var row = table.insertRow();

    var cell = row.insertCell();
    cell.style.verticalAlign = "top";
    var div = document.createElement("div");
    var presenceGUI = new PresenceGUI(div);
    cell.appendChild(div);

    var cell = row.insertCell();
    cell.style.verticalAlign = "top";
    var div = document.createElement("div");
    var speakersGUI = new SpeakersGUI(div);
    cell.appendChild(div);

    //====================================================
    // Div of controls
    var genCheckBox = function(name) {
        var cb = document.createElement("input");
        var label = document.createElement("label");
        cb.type = "checkbox";
        cb.id = name;
        label.htmlFor = name;
        label.textContent = name;
        cb.checked = tracking0.getVisible(name);
        cb.onclick = function(){
//             viewer3d.setVisible(name,cb.checked);
            tracking0.setVisible(name,cb.checked);
            tracking1.setVisible(name,cb.checked);
        }
        
        cb.onclick()
        
        controls.appendChild(cb)
        controls.appendChild(label)
    }
    
    genCheckBox("Face Search")
    genCheckBox("Face Detections")
    genCheckBox("Face Tracks")
    genCheckBox("Motion Detections")
    genCheckBox("Motion Tracks")
//    genCheckBox("Image Points")
    genCheckBox("Predictions")
    genCheckBox("Exposure Metering")
    genCheckBox("Exposure Region Statistics")
    genCheckBox("Fused Confidence")
    
    //====================================================
    // Functions
    this.visualUpdate = function(obj) 
    {
        viewer3D.update(obj);
        tracking0.update(obj);
//        detections0.update(obj);
        tracking1.update(obj);
//        detections1.update(obj);
        presenceGUI.update(obj);
        speakersGUI.update(obj);
    }
    
    this.audioUpdate = function(obj)
    {
        viewer3D.scene.audioUpdate(obj);
    }
    this.channelUpdate = function (data, channelName) {
        switch (channelName) {
            case "CapDevCUDAExpStat":
                var json = JSON.parse(data);
                // console.log("json", json);
                (   json.cameraIndex == 0 ? tracking0 :
                    json.cameraIndex == 1 ? tracking1 : null
                ).updateChannelParamsExposureStats(json);
                break;
            case "CapDevCUDAExpMeta":
                // when channelData is a string, it has to be valid JSON
                var json = JSON.parse(data);
                switch (json.type) {
                    case "Metering Metadata":
                        // intentially call a method on null (which throws) if 
                        // cameraIndex is not 0 or 1
                        [tracking0, tracking1][json.cameraIndex]
                            .updateChannelParams(json);
                        break;
                }
                break;
            case "PFSearchRegion":
                var json = JSON.parse(data);
                [tracking0, tracking1][json.cameraIndex]
                    .updateChannelSearches(json);
                break;
            case "CapDevCUDAExp_0":
                tracking0.updateChannelBinary(data);
                break;
            case "CapDevCUDAExp_1":
                tracking1.updateChannelBinary(data);
                break;
        }
    }
    
    this.start = function()
    {
        tracking0.start();
        tracking1.start();
    }
    
    this.stop = function()
    {
        tracking0.stop();
        tracking1.stop();
    }
}

//=============================================================================
// Main Function
$(document).ready(function() {
    var root = $("#root")[0];
    
    var div = document.createElement("div");
    var buttonConnect = document.createElement("button");
    buttonConnect.textContent = "Connect";
    var buttonDisconnect = document.createElement("button");
    buttonDisconnect.textContent = "Disconnect";
    div.appendChild(buttonConnect);
    div.appendChild(buttonDisconnect);
    root.appendChild(div);

    div = document.createElement("div");
    var buttonImageConnect = document.createElement("button");
    buttonImageConnect.textContent = "Image Connect";
    var buttonImageDisconnect = document.createElement("button");
    buttonImageDisconnect.textContent = "Image Disconnect";
    div.appendChild(buttonImageConnect);
    div.appendChild(buttonImageDisconnect);
    root.appendChild(div);
    
    root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    root.appendChild(div);
    var trackingGUI = new TrackingGUI(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    var faceGUI = new FaceTrainingGUI(div);
    root.appendChild(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    var fullFacesGUI = new FullFacesGUI(div);
    root.appendChild(div);

    root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    var demandDetectGUI = new DemandDetectGUI(div);
    root.appendChild(div);

    root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    var barcodeGUI = new BarcodeGUI(div);
    root.appendChild(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    var modeGUI = new ModeGUI(div);
    root.appendChild(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    var recorderGUI = new RecorderGUI(div);
    root.appendChild(div);
    
    var div = document.createElement("div");
    var playerGUI = new PlayerGUI(div);
    root.appendChild(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    var cameraCalibrationGUI = new CameraCalibrationGUI(div);
    root.appendChild(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    var entityConfigGUI = new EntityConfigGUI(div);
    root.appendChild(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    var rawDataGUI = new RawDataGUI(div);
    root.appendChild(div);
    
    var visualSocket = null;
    var audioSocket = null;
    var channelSockets = [];

    // mirrors config/lps.json
    var channels = [
        "PFSearchRegion",
        "CapDevCUDAExpMeta",
        "CapDevCUDAExpStat",
        "CapDevCUDAExp_0",
        "CapDevCUDAExp_1"
    ];

    var disconnected = false;
    var channelSocketConnectionTimeout;
    function connectCameraChannelSockets () {
        if (disconnected) { return; }
        channelSockets = channels.map(function (channel) {
            var channelSocket = new WebSocket(
                "ws://" + window.location.host + "/lps/channel/" + channel);
            channelSocket.binaryType = 'arraybuffer';
            channelSocket.onopen = function() {
                console.log("connected to channel " + channel);
            }
            channelSocket.onmessage = function (msg) {
                trackingGUI.channelUpdate(msg.data, channel);
            };
            channelSocket.onclose = function () {
                clearTimeout(channelSocketConnectionTimeout);

                // close all of the sockets when one disconnects, because we 
                // are about to schedule the reconnection on all of them.
                channelSockets.map(function (channelSocket) {
                    channelSocket.close();
                });
                channelSocketConnectionTimeout =
                    setTimeout(connectCameraChannelSockets, 1000);
            };
            return channelSocket;
        });
    }

    var visualSocketConnectionTimeout;
    var connectVisualSocket = function() {
        if (disconnected) { return; }
        visualSocket = new WebSocket(
            "ws://" + window.location.host + "/lps/visual_awareness");
        visualSocket.onopen = function() {
        }
        visualSocket.onmessage = function(msg) {
            try{
                var obj = JSON.parse(msg.data);
                rawDataGUI.visualUpdate(obj);
                trackingGUI.visualUpdate(obj);
            } catch(err){
                // This is here because we were getting a SyntaxError from
                // parsing the msg data.
            }
        }
        visualSocket.onerror = function() { }
        visualSocket.onclose = function() {
            clearTimeout(visualSocketConnectionTimeout);
            visualSocketConnectionTimeout = setTimeout(connectVisualSocket, 1000);
        }
    }
    
    
    var audioSocketConnectionTimeout;
    var connectAudioSocket = function() {
        if (disconnected) { return; }
        audioSocket = new WebSocket(
            "ws://" + window.location.host + "/lps/audible_awareness");
        audioSocket.onopen = function() {
        }
        audioSocket.onmessage = function(msg) {
            var obj = JSON.parse(msg.data);
            rawDataGUI.audioUpdate(obj);
            trackingGUI.audioUpdate(obj);
        }
        audioSocket.onerror = function() { }
        audioSocket.onclose = function() {
            clearTimeout(audioSocketConnectionTimeout);
            audioSocketConnectionTimeout = setTimeout(connectAudioSocket, 1000);
        }
    }
    
    buttonConnect.onclick = function() {
        buttonDisconnect.click();
        disconnected = false;
        connectVisualSocket();
        connectAudioSocket();
        connectCameraChannelSockets();
        trackingGUI.start();
    };
    
    buttonDisconnect.onclick = function() {
        disconnected = true;
        console.log("Disconnect");
        if (visualSocket) visualSocket.close();
        if (audioSocket) audioSocket.close();
        channelSockets.map(function (channelSocket) {
            channelSocket.close();
        });
        trackingGUI.stop();
    };
    
    buttonConnect.click()

    buttonImageDisconnect.onclick = function () {
        trackingGUI.stop();
    }
    buttonImageConnect.onclick = function () {
        trackingGUI.start();
    }
});
