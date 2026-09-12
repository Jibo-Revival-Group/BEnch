// =============================================================================
// Utility functions
var rgba = function(r,g,b,a) {
    return "rgba("+r+","+g+","+b+","+a+")";
}

//=============================================================================
// Train GUI
TrainGUI= function(div) {
    var form = document.createElement("form");
    form.id = "form";
    
    var inputFile = document.createElement("input");
    inputFile.form = form.id;
    inputFile.type = "file";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.form = form.id;
    textareaRequest.rows = 10;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    var value = {name:"Foobar", kind:"face"}; 
    textareaRequest.value = JSON.stringify(value,null,2);
    
    var inputButton = document.createElement("input");
    inputButton.form = form.id;
    inputButton.type = "button";
    inputButton.value = "Train";
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    inputButton.onclick = function() {
        var fd = new FormData(form);
        fd.append('file',inputFile.files[0]);
        fd.append('json',new Blob(
            [JSON.stringify(JSON.parse(textareaRequest.value))],
            { type:"application/json"}
            )
        );
        var jqxhr = $.ajax({
            url: "http://"+window.location.host+"/identity/train",
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
    
    div.appendChild(inputButton);
    div.appendChild(document.createElement("br"));
    div.appendChild(inputFile);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
    
}

//=============================================================================
// Recognize GUI
RecognizeGUI= function(div) {
    var form = document.createElement("form");
    form.id = "form";
    
    var inputFile = document.createElement("input");
    inputFile.form = form.id;
    inputFile.type = "file";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.form = form.id;
    textareaRequest.rows = 10;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    var value = {kind:"face"};
    textareaRequest.value = JSON.stringify(value,null,2);
    
    var inputButton = document.createElement("input");
    inputButton.form = form.id;
    inputButton.type = "button";
    inputButton.value = "Recognize";
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    inputButton.onclick = function() {
        var fd = new FormData(form);
        fd.append('file',inputFile.files[0]);
        fd.append('json',new Blob(
            [JSON.stringify(JSON.parse(textareaRequest.value))],
            { type:"application/json"}
            )
        );
        var jqxhr = $.ajax({
            url: "http://"+window.location.host+"/identity/recognize",
            data: fd,
            processData: false,
            contentType: false,
            cache: false,
            type: "POST",
            success: function(data, status, jqXHR){
                textareaResponse.value = JSON.stringify(data, null, 2);
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
    
    div.appendChild(inputButton);
    div.appendChild(document.createElement("br"));
    div.appendChild(inputFile);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
}

//=============================================================================
// Upload GUI
UploadGUI= function(div) {
    var form = document.createElement("form");
    form.id = "form";
    
    var inputFile = document.createElement("input");
    inputFile.form = form.id;
    inputFile.type = "file";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.form = form.id;
    textareaRequest.rows = 10;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    var value = {kind:"face"};
    textareaRequest.value = JSON.stringify(value,null,2);
    
    var inputButton = document.createElement("input");
    inputButton.form = form.id;
    inputButton.type = "button";
    inputButton.value = "Upload";
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    inputButton.onclick = function() {
        var fd = new FormData(form);
        fd.append('file',inputFile.files[0]);
        fd.append('json',new Blob(
            [JSON.stringify(JSON.parse(textareaRequest.value))],
            { type:"application/json"}
            )
        );
        var jqxhr = $.ajax({
            url: "http://"+window.location.host+"/identity/upload",
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
    
    div.appendChild(inputButton);
    div.appendChild(document.createElement("br"));
    div.appendChild(inputFile);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
}

//=============================================================================
// CRUD GUI (Create Read Update Delete)
CRUD_GUI= function(div) {
    
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
    
    var buttonCreate = document.createElement("button");
    buttonCreate.textContent = "Create";
    buttonCreate.onclick = function() {
        var url = "http://"+window.location.host+"/identity/create"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    }
    
    var buttonRemove = document.createElement("button");
    buttonRemove.textContent = "Remove";
    buttonRemove.onclick = function() {
        var url = "http://"+window.location.host+"/identity/remove"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    }
    
    var buttonForget = document.createElement("button");
    buttonForget.textContent = "Forget";
    buttonForget.onclick = function() {
        var url = "http://"+window.location.host+"/identity/forget"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    }
    
    var buttonList = document.createElement("button");
    buttonList.textContent = "List";
    buttonList.onclick = function() {
        var url = "http://"+window.location.host+"/identity/list"
        var jqxhr = $.get(url,function(obj){
            textareaResponse.value = JSON.stringify(obj, null, 2);
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    };
    
    var buttonPending = document.createElement("button");
    buttonPending.textContent = "Pending";
    buttonPending.onclick = function() {
        var url = "http://"+window.location.host+"/identity/pending"
        var jqxhr = $.get(url,function(obj){
            textareaResponse.value = JSON.stringify(obj, null, 2);
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        });
    };
    
    var canvas = document.createElement("canvas");
    canvas.height = 100;
    canvas.width = 100;
    var context = canvas.getContext("2d");
    
    var buttonQuery = document.createElement("button");
    buttonQuery.textContent = "Query";
    buttonQuery.onclick = function() {
        var params = JSON.parse(textareaRequest.value);
        params.cachebuster = (new Date()).getTime();
        var url = "http://"+window.location.host
            + "/identity/photo?" + $.param(params);
        var image = new Image()
        image.src = url;
        image.onload = function() {
            // Adjust the canvas to match the image size
            canvas.width = image.width;
            canvas.height = image.height;

            try {
                // Draw the image
                context.drawImage(image,0,0);
            } catch (err){
                console.error(err);
                return;
            }

            var url = "http://"+window.location.host
                + "/identity/detection?" + $.param(params);

            var jqxhr = $.get(url,function(obj){
                var detection = obj.detection;
                
                var left = detection.chipDetails.rect.left;
                var right = detection.chipDetails.rect.right;
                var top = detection.chipDetails.rect.top;
                var bottom = detection.chipDetails.rect.bottom;
                
                var x = left;
                var y = top;
                var w = right - left;
                var h = bottom - top;
                
                // Draw detection rectangle
                
                context.beginPath();
                context.lineWidth = "4";
                if (detection.kind === "face"){
                    context.strokeStyle = rgba(0,255,0,1.0);
                } else if (detection.kind === "motion") {
                    context.strokeStyle = rgba(0,0,255,1.0);
                } else {
                    context.strokeStyle = rgba(255,255,255,1.0);
                }
                context.rect(x,y,w,h);
                context.stroke();
                
                // Draw any detection points
                for (var l = 0; l < detection.imagePoints.length; ++l){
                    var imagePoint = detection.imagePoints[l];
                    
                    var x = imagePoint.point.x ;
                    var y = imagePoint.point.y;
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
                
            });
            jqxhr.done(function(msg){ });
            jqxhr.fail(function(msg){ });
            jqxhr.always(function(msg){ });
        };
    };
    
    // Calls "GET" and downloads the zip file
    var buttonDownload = document.createElement("button");
    buttonDownload.textContent = "Download";
    buttonDownload.onclick = function() {
        var params = JSON.parse(textareaRequest.value);
        params.cachebuster = (new Date()).getTime();
        var url = "http://"+window.location.host
            + "/identity/download?" + $.param(params);
        
        window.location = url;
    };
    
    var buttonRetrain = document.createElement("button");
    buttonRetrain.textContent = "Retrain";
    buttonRetrain.onclick = function() {
        var url = "http://"+window.location.host+"/identity/retrain"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
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
    
    var buttonClear = document.createElement("button");
    buttonClear.textContent = "Clear GUI";
    buttonClear.onclick = function() {
        var value = {name:"Foobar", kind:"face", index:0}; 
        textareaRequest.value = JSON.stringify(value,null,2);
        textareaResponse.value = "";
        canvas.width = 100;
        canvas.height = 100;
        context.clearRect(0,0,canvas.width,canvas.height);
    }
    
    div.appendChild(buttonCreate);
    div.appendChild(buttonRemove);
    div.appendChild(buttonForget);
    div.appendChild(buttonList);
    div.appendChild(buttonPending);
    div.appendChild(buttonQuery);
    div.appendChild(buttonDownload);
    div.appendChild(buttonRetrain);
    div.appendChild(buttonClear);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
    div.appendChild(document.createElement("br"));
    div.appendChild(canvas);
}

//=============================================================================
// Face Training GUI
FaceTrainingGUI= function(div) {
    
    var heading = document.createElement("h2");
    heading.textContent = "Face Training";
    
    var divCRUD = document.createElement("div");
    var guiCRUD = new CRUD_GUI(divCRUD);
    
    var divTrain = document.createElement("div");
    var guiTrain = new TrainGUI(divTrain);
    
    var divRecognize = document.createElement("div");
    var guiRecognize = new RecognizeGUI(divRecognize);
    
    var divUpload = document.createElement("div");
    var guiUpload = new UploadGUI(divUpload);
    
    //==========================
    // Face Training GUI Layout
    div.appendChild(heading);
    div.appendChild(document.createElement("br"));
    div.appendChild(divCRUD);
    div.appendChild(document.createElement("br"));
    div.appendChild(divTrain);
    div.appendChild(document.createElement("br"));
    div.appendChild(divRecognize);
    div.appendChild(document.createElement("br"));
    div.appendChild(divUpload);
};

//=============================================================================
// Main Function
$(document).ready(function() {
    var root = $("#root")[0];
    
    var heading = document.createElement("h1");
    heading.textContent = "Identity Service";
    root.appendChild(heading);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    var faceGUI = new FaceTrainingGUI(div);
    root.appendChild(div);
});
