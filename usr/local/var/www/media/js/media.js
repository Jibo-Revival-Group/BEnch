//=============================================================================
// Preview GUI
PreviewGUI= function(div) {
    var buttonStart = document.createElement("button");
    buttonStart.textContent = "Start Preview";
    buttonStart.onclick = function() {
        var data = JSON.parse(textareaRequest.value);
        
        $.ajax({
            url: "http://"+window.location.host+"/media/preview/control",
            type: "POST",
            dataType: "json",
            data: JSON.stringify(data),
            success: function() {
                // nothing...
            },
            error: function(xhr, status, error) {
                alert("Error: " + error);
            }
        });
    }
    
    var buttonStop = document.createElement("button");
    buttonStop.textContent = "Stop Preview";
    buttonStop.onclick = function() {
        var data = {
            enable : false
        };
        $.ajax({
            url: "http://"+window.location.host+"/media/preview/control",
            type: "POST",
            dataType: "json",
            data: JSON.stringify(data),
            success: function() {
                // nothing...
            },
            error: function(xhr, status, error) {
                alert("Error: " + error);
            }
        });
    }
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get prvw info";
    buttonGet.onclick = function() {
        $.ajax({
            url: "http://"+window.location.host+"/media/preview/control",
            type: "GET",
        })
        .done(function(data) {
            textareaReady.value = JSON.stringify(data, null, 2);
        })
        .fail(function(xhr, status, error) {
            alert("Error: " + error);
        })
    }
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 10;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    var defaultRequest = {
        enable : true,
        camera : 0,
        flip:"none",
        window : {
            height : 360,
            width : 640,
            x : 100,
            y : 200
        }
    };
    
    var textareaReady = document.createElement("textarea")
    textareaReady.rows = 10;
    textareaReady.cols = 40;
    textareaReady.spellcheck = false;
    textareaReady.readOnly = true;

    textareaRequest.value = JSON.stringify(defaultRequest,null,2);
    
    div.appendChild(buttonStart);
    div.appendChild(buttonStop);
    div.appendChild(buttonGet);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaReady);
}

//=============================================================================
// Stream GUI
StreamingGUI= function(div) {
    var video = document.createElement("video");
    video.autoplay = true;
    video.load();
    var buttonStart = document.createElement("button");
    buttonStart.textContent = "Start streaming";
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 1;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = false;

    buttonStart.onclick = function() {
        var url = "http://"+window.location.host+ "/media/streaming/start";
        var delay = 1000;
        var data = JSON.parse('{ "enable":true}');
        var jqxhr = $.post(url,JSON.stringify(data),setTimeout(function(obj){
            video.src = "http://"+window.location.hostname + ":5000";
            console.log("Got video")
        }, delay));
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        }, "json");
    }
    
    var buttonStop = document.createElement("button");
    buttonStop.textContent = "Stop Streaming";
    buttonStop.onclick = function() {
        var url = "http://"+window.location.host+ "/media/streaming/control";
        var data = JSON.parse('{ "enable":false}');
        var jqxhr = $.post(url,JSON.stringify(data),function(obj){
            video.src = "";
            console.log("Stop video")
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            console.log("Failed to get video");
        });
        jqxhr.always(function(msg){
        }, "json");
    }
    
    div.appendChild(buttonStart);
    div.appendChild(buttonStop);
    div.appendChild(video);
    div.appendChild(textareaResponse);

}

//=============================================================================
// Streaming From URL GUI
StreamingFromURLGUI= function(div) {
    var textareaHost = document.createElement("textarea");
    textareaHost.id = "uri";
    textareaHost.rows = 1;
    textareaHost.cols = 100;
    textareaHost.spellcheck = false;
    textareaHost.readOnly = false;

    var textareaServerResponse = document.createElement("textarea");
    textareaServerResponse.rows = 1;
    textareaServerResponse.cols = 40;
    textareaServerResponse.spellcheck = false;
    textareaServerResponse.readOnly = false;

    var buttonStart = document.createElement("button");
    buttonStart.textContent = "Start Streaming";
    buttonStart.onclick = function() {
        var data = {
            enable : true,
            uri : document.getElementById("uri").value
        };
        var url="http://"+window.location.host+"/media/streamingfromurl/start";
        var jqxhr = $.post(url,JSON.stringify(data),function(obj){
            console.log("Got video")
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            textareaServerResponse.value = jqxhr.status + " " + 
                jqxhr.statusText;
        });
        jqxhr.always(function(msg){
        }, "json");
    }

    var buttonStop = document.createElement("button");
    buttonStop.textContent = "Stop Streaming";
    buttonStop.onclick = function() {
        var data = {
            enable : false,
            uri : ""
        };
        url = "http://"+window.location.host+"/media/streamingfromurl/control";
        var jqxhr = $.post(url,JSON.stringify(data),function(obj){
            console.log("Stop video")
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            console.log("Failed to get video");
        });
        jqxhr.always(function(msg){
        }, "json");
    }
    
    div.appendChild(document.createTextNode(
        "Please enter the video location: "));
    div.appendChild(textareaHost);
    div.appendChild(document.createElement("br"));
    div.appendChild(buttonStart);
    div.appendChild(buttonStop);
    div.appendChild(textareaServerResponse);
}

//=============================================================================
// Recording GUI
RecordGUI= function(div) {
    var buttonStart = document.createElement("button");
    buttonStart.textContent = "Start Recording";
    buttonStart.onclick = function() {
        var data = JSON.parse(textareaRecordingRequest.value);
        
        $.ajax({
            url: "http://"+window.location.host+"/media/recording/start",
            type: "POST",
            dataType: "json",
            data: JSON.stringify(data),
            success: function(response) {
                textareaRecordingResponse.value = JSON.stringify(response, null, 2)
            },
            error: function(xhr, status, error) {
                alert("Error: " + error);
            }
        });
    }
    
    var buttonStop = document.createElement("button");
    buttonStop.textContent = "Stop Recording";
    buttonStop.onclick = function() {
        $.ajax({
            url: "http://"+window.location.host+"/media/recording/control?id=%s&cmd=%s",
            data: {
                id: 0,
                cmd:"stop"
            },
            type: "POST",
            success: function(data) {
                // nothing...
            },
            error: function(xhr, status, error) {
                alert("Error: " + error);
            }
        });
    }
    
    var textareaRecordingRequest = document.createElement("textarea");
    textareaRecordingRequest.rows = 10;
    textareaRecordingRequest.cols = 40;
    textareaRecordingRequest.spellcheck = false;
    textareaRecordingRequest.readOnly = false;
    
    var defaultRequest = {
        audioRec : {
            volume : 1,
            source : 'MediaIn'
        },
        videoRec : {
            height : 360,
            width : 640,
            camera : 0,
            flip:"horizontal-flip"
        },
        meta :{
            
        }
    };
    
    textareaRecordingRequest.value = JSON.stringify(defaultRequest,null,2);
    
    var textareaRecordingResponse = document.createElement("textarea")
    textareaRecordingResponse.rows = 10;
    textareaRecordingResponse.cols = 40;
    textareaRecordingResponse.spellcheck = false;
    textareaRecordingResponse.readOnly = true;
    
    div.appendChild(buttonStart);
    div.appendChild(buttonStop);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRecordingRequest);
    div.appendChild(textareaRecordingResponse);
}

//=============================================================================
// Playback GUI
PlaybackGUI= function(div) {
    
    var buttonPlayback = document.createElement("button");
    buttonPlayback.textContent = "Start Playback";
    buttonPlayback.onclick = function() {
        var data = JSON.parse(textareaPlaybackRequest.value);
        
        $.ajax({
            url: "http://"+window.location.host+"/media/recording/play",
            type: "POST",
            dataType: "json",
            data: JSON.stringify(data),
        })
        .done(function(data) {
            textareaPlaybackResponse.value = JSON.stringify(data, null, 2);
        })
        .fail(function(xhr, status, error) {
            alert("Error: " + error);
        })
    }
    
    var textareaPlaybackRequest = document.createElement("textarea");
    textareaPlaybackRequest.rows = 10;
    textareaPlaybackRequest.cols = 40;
    textareaPlaybackRequest.spellcheck = false;
    textareaPlaybackRequest.readOnly = false;
    
    var defaultPlaybackRequest = {
        source : 'XXXXXX',
        audio : {
            volume : 1
        }
    };
    
    textareaPlaybackRequest.value = JSON.stringify(defaultPlaybackRequest,null,2);
    
    var textareaPlaybackResponse = document.createElement("textarea")
    textareaPlaybackResponse.rows = 10;
    textareaPlaybackResponse.cols = 40;
    textareaPlaybackResponse.spellcheck = false;
    textareaPlaybackResponse.readOnly = true;
    
    div.appendChild(buttonPlayback);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaPlaybackRequest);
    div.appendChild(textareaPlaybackResponse);
}

//=============================================================================
// Photo GUI
PhotoGUI= function(div) {
    var photo = new Image();
    
    var buttonConnect = document.createElement("button");
    buttonConnect.textContent = "Connect";
    
    var buttonDisconnect = document.createElement("button");
    buttonDisconnect.textContent = "Disconnect";
    
    var buttonPhoto = document.createElement("button");
    buttonPhoto.textContent = "Take Photo";
    
    var buttonReset = document.createElement("button");
    buttonReset.textContent = "Reset";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 20;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    var defaultRequest = { 
        camera: 0, 
        type: 2,
        filters: [
            {
                kind: 'undistort',
                config: {
                }
            },
            {
                kind: 'flip',
                config : {
                    method: 1
                }
            }
        ]
    };

    textareaRequest.value = JSON.stringify(defaultRequest,null,2);
    
    var textareaReady = document.createElement("textarea")
    textareaReady.rows = 20;
    textareaReady.cols = 40;
    textareaReady.spellcheck = false;
    textareaReady.readOnly = false;
    
    var socket = null;
    buttonConnect.onclick = function() {
        socket = new WebSocket(
            "ws://" + window.location.host + "/media/photo/notifications");
            socket.onopen = function() { }
            socket.onmessage = function(msg) {
            try {
                var obj = JSON.parse(msg.data);
                textareaReady.value = JSON.stringify(obj, null, 2);
            } catch (err) {
                console.log(err);
            }
        }
        socket.onerror = function() { }
        socket.onclose = function() { }
    };
    
    buttonDisconnect.onclick = function() {
        socket.close();
    };
    
    buttonPhoto.onclick = function() {
        var url = "http://"+window.location.host+"/media/photo"
        var data = JSON.parse(textareaRequest.value);
        var jqxhr = $.post(url,JSON.stringify(data),function(obj){
            console.log("Got Image");
            photo.src = url+"?id="+obj.id;
        });
        jqxhr.done(function(msg){
        });
        jqxhr.fail(function(msg){
            console.log("Failed to get image");
        });
        jqxhr.always(function(msg){
        }, "json");
    };
    
    buttonReset.onclick = function() {
        textareaRequest.value = JSON.stringify(defaultRequest,null,2);
        textareaReady.value = "";
        photo.src = "";
    };
    
    div.appendChild(buttonConnect);
    div.appendChild(buttonDisconnect);
    div.appendChild(buttonPhoto);
    div.appendChild(buttonReset)
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaReady);
    div.appendChild(document.createElement("br"));
    div.appendChild(photo);
    
}

//=============================================================================
// Search Photo GUI
SearchPhotoGUI = function(div) {
    var textareaSearch = document.createElement("textarea");
    textareaSearch.rows = 20;
    textareaSearch.cols = 50;
    textareaSearch.spellcheck = false;
    textareaSearch.readOnly = false;

    var textareaGet = document.createElement("textarea");
    textareaGet.rows = 20;
    textareaGet.cols = 50;
    textareaGet.spellcheck = false;
    textareaGet.readOnly = true;

    var buttonSearch = document.createElement("button");
    buttonSearch.textContent = "Search Photo";

    var buttonReset = document.createElement("button");
    buttonReset.textContent = "Reset";

    buttonSearch.onclick = function () {
    var data = JSON.parse(textareaSearch.value);

    $.ajax({
            url: "http://"+window.location.host+"/media/photo/list",
            type: "GET",
            dataType: "json",
            data: JSON.stringify(data),
            success: function(obj) {
                textareaGet.value = JSON.stringify(obj, null, 2);
            },
            error: function(xhr, status, error) {
                alert("Error: " + error);
            }
        });
    };

    buttonReset.onclick = function () {
    textareaSearch.value = "";
    textareaGet.value = "";
    };

    div.appendChild(textareaSearch);
    div.appendChild(textareaGet);
    div.appendChild(document.createElement("br"));
    div.appendChild(buttonSearch);
    div.appendChild(buttonReset);
    
}

//=============================================================================
// Search Recording GUI
SearchRecordingGUI = function(div) {
    var textareaSearch = document.createElement("textarea");
    textareaSearch.rows = 20;
    textareaSearch.cols = 50;
    textareaSearch.spellcheck = false;
    textareaSearch.readOnly = false;

    var textareaGet = document.createElement("textarea");
    textareaGet.rows = 20;
    textareaGet.cols = 50;
    textareaGet.spellcheck = false;
    textareaGet.readOnly = true;

    var buttonSearch = document.createElement("button");
    buttonSearch.textContent = "Search Recording";

    var buttonReset = document.createElement("button");
    buttonReset.textContent = "Reset";

    buttonSearch.onclick = function () {
    var data = JSON.parse(textareaSearch.value);

    $.ajax({
        url: "http://"+window.location.host+"/media/recording/list",
        type: "GET",
        dataType: "json",
        data: JSON.stringify(data),
        success: function(obj) {
            textareaGet.value = JSON.stringify(obj, null, 2);
        },
        error: function(xhr, status, error) {
            alert("Error: " + error);
        }
        });
    };

    buttonReset.onclick = function () {
        textareaSearch.value = "";
        textareaGet.value = "";
    };

    div.appendChild(textareaSearch);
    div.appendChild(textareaGet);
    div.appendChild(document.createElement("br"));
    div.appendChild(buttonSearch);
    div.appendChild(buttonReset);
    
}

//=============================================================================
// Misc GUI
MiscGUI= function(div) {
    
    var buttonPostCommand = document.createElement("button");
    buttonPostCommand.textContent = "Send Post Command";
    buttonPostCommand.onclick = function() {
        var data = JSON.parse(textareaRequest.value);
        
        $.ajax({
            url: "http://"+window.location.host+textareaPath.value,
            type: "POST",
            dataType: "json",
            data: JSON.stringify(data),
        })
        .done(function(data) {
            textareaResponse.value = JSON.stringify(data, null, 2);
        })
        .fail(function(xhr, status, error) {
            alert("Error: " + error);
        })
    }
    var buttonGetCommand = document.createElement("button");
    buttonGetCommand.textContent = "Send Get Command";
    buttonGetCommand.onclick = function() {
        var data = JSON.parse(textareaRequest.value);
        
        $.ajax({
            url: "http://"+window.location.host+textareaPath.value,
            type: "GET",
            dataType: "json",
            data: JSON.stringify(data),
        })
        .done(function(data) {
            textareaResponse.value = JSON.stringify(data, null, 2);
        })
        .fail(function(xhr, status, error) {
            alert("Error: " + error);
        })
    }
    
    var textareaPath = document.createElement("textarea");
    textareaPath.rows = 1;
    textareaPath.cols = 40;
    textareaPath.spellcheck = false;
    textareaPath.readOnly = false;
    textareaPath.value = "/media/";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 10;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    var defaultRequest = {
        param1 : 'value1',
        param2 : 'value2',
        param3 : 'value3'
    };
    
    textareaRequest.value = JSON.stringify(defaultRequest,null,2);
    
    var textareaResponse = document.createElement("textarea")
    textareaResponse.rows = 10;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    
    div.appendChild(buttonPostCommand);
    div.appendChild(buttonGetCommand);
    div.appendChild(textareaPath);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
}

//=============================================================================
// Store Photo GUI
StorePhotoGUI = function(div) {
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 20;
    textareaRequest.cols = 50;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;

    var textareaStoredPhoto = document.createElement("textarea");
    textareaStoredPhoto.rows = 20;
    textareaStoredPhoto.cols = 50;
    textareaStoredPhoto.spellcheck = false;
    textareaStoredPhoto.readOnly = true;

    var defaultRequest = { 
        id: "", 
        thumbnails: 
        {
            mobile : [80,80],
            robot : [330,330]
        }
    };

    textareaRequest.value = JSON.stringify(defaultRequest,null,2);

    var buttonStorePhoto = document.createElement("button");
    buttonStorePhoto.textContent = "Store Photo";

    var buttonReset = document.createElement("button");
    buttonReset.textContent = "Reset";

    buttonStorePhoto.onclick = function() {
        var url = "http://"+window.location.host+"/media/photo/store"
        var data =  JSON.parse(textareaRequest.value);
        var jqxhr = $.post(url,JSON.stringify(data),function(obj){
            console.log("Request to store photo and thumbnails");
            textareaStoredPhoto.value = JSON.stringify(obj, null, 2);
        });
        jqxhr.done(function(){});
        jqxhr.fail(function(msg){
            console.log("Failed to store photo and thumbnails: "+
            msg.responseText);
        });
        jqxhr.always(function(){});
    }

    buttonReset.onclick = function () {
        textareaRequest.value = "";
        textareaStoredPhoto.value = "";
    };

    div.appendChild(buttonStorePhoto);
    div.appendChild(buttonReset);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaStoredPhoto);
    
}

//=============================================================================
// Photo Get GUI
PhotoGetGUI = function(div) {
    var textareaSearch = document.createElement("textarea");
    textareaSearch.rows = 20;
    textareaSearch.cols = 50;
    textareaSearch.spellcheck = false;
    textareaSearch.readOnly = false;

    var textareaGet = document.createElement("textarea");
    textareaGet.rows = 20;
    textareaGet.cols = 50;
    textareaGet.spellcheck = false;
    textareaGet.readOnly = true;

    var buttonSearch = document.createElement("button");
    buttonSearch.textContent = "Get Photo";

    var buttonReset = document.createElement("button");
    buttonReset.textContent = "Reset";

    buttonSearch.onclick = function() {
        var url = "http://"+window.location.host+"/media/photo/get"
        var data =  JSON.parse(textareaSearch.value);
        var jqxhr = $.get(url,JSON.stringify(data),function(obj){
            console.log("Request to find a photo/thumbnail");
            textareaGet.value = JSON.stringify(obj, null, 2);
        });
        jqxhr.done(function(){});
        jqxhr.fail(function(msg){
            console.log("Failed to get the photo/thumbnail: "+
            msg.responseText);
        });
        jqxhr.always(function(){});
    }

    buttonReset.onclick = function () {
        textareaSearch.value = "";
        textareaGet.value = "";
    };

    div.appendChild(buttonSearch);
    div.appendChild(buttonReset);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaSearch);
    div.appendChild(textareaGet);
}

//=============================================================================
// Main Function
$(document).ready(function() {
    
    this.root = $("#root")[0];
    
    //var div = document.createElement("div");
    //this.cameraControls = new MiscGUI(div);
    //this.root.appendChild(div);
    
    this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    this.cameraControls = new PreviewGUI(div);
    this.root.appendChild(div);

    this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    this.cameraControls = new StreamingGUI(div);
    this.root.appendChild(div);
    
    this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    this.cameraControls = new StreamingFromURLGUI(div);
    this.root.appendChild(div);
    
    this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    this.cameraControls = new RecordGUI(div);
    this.root.appendChild(div);
    
    this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    this.cameraControls = new PlaybackGUI(div);
    this.root.appendChild(div);
    
    this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    this.cameraControls = new PhotoGUI(div);
    this.root.appendChild(div);
    
    this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    this.cameraControls = new StorePhotoGUI(div);
    this.root.appendChild(div);

    this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    this.cameraControls = new PhotoGetGUI(div);
    this.root.appendChild(div);

    this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    this.cameraControls = new SearchPhotoGUI(div);
    this.root.appendChild(div);

    this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    this.cameraControls = new SearchRecordingGUI(div);
    this.root.appendChild(div);
    
});