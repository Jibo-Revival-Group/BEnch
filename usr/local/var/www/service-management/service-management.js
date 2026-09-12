LoggingGUI = function(div) {
    var root = div;
    
    var heading = document.createElement("h2");
    heading.textContent = "Logging GUI";
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 20;
    textareaRequest.cols = 60;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 20;
    textareaResponse.cols = 60;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get";
    buttonGet.onclick = function() {
        var url = "http://"+window.location.host+"/_M_/logging"
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
        var url = "http://"+window.location.host+"/_M_/logging"
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
    div.appendChild(textareaResponse);
    div.appendChild(textareaRequest);
};

ErrorGUI = function(div) {
    var root = div;
    
    var heading = document.createElement("h2");
    heading.textContent = "Error GUI";
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 60;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get";
    buttonGet.onclick = function() {
        var url = "http://"+window.location.host+"/_M_/errors"
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
    div.appendChild(textareaResponse);
};

HealthGUI = function(div) {
    var root = div;
    
    var heading = document.createElement("h2");
    heading.textContent = "Health GUI";
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 10;
    textareaResponse.cols = 60;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get";
    buttonGet.onclick = function() {
        var url = "http://"+window.location.host+"/_M_/health"
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
    div.appendChild(textareaResponse);
};

BackupWipeRestoreGUI = function(div) {
    var root = div;
    
    var heading = document.createElement("h2");
    heading.textContent = "Backup/Wipe/Restore GUI";
    
    var defaultRequestValue = JSON.stringify({
        directory:"/opt/tmp"
    }, null, 2);
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 5;
    textareaRequest.cols = 60;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    textareaRequest.value = defaultRequestValue;
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 5;
    textareaResponse.cols = 60;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonBackup = document.createElement("button");
    buttonBackup.textContent = "Backup";
    buttonBackup.onclick = function() {
        var url = "http://"+window.location.host+"/_M_/system/backup"
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
    
    var buttonWipe = document.createElement("button");
    buttonWipe.textContent = "Wipe";
    buttonWipe.onclick = function() {
        var url = "http://"+window.location.host+"/_M_/system/wipe"
        var data = "";
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    }
    
    var buttonRestore = document.createElement("button");
    buttonRestore.textContent = "Restore";
    buttonRestore.onclick = function() {
        var url = "http://"+window.location.host+"/_M_/system/restore"
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
    
    var buttonClear = document.createElement("button");
    buttonClear.textContent = "Clear GUI";
    buttonClear.onclick = function() {
        textareaResponse.value = defaultRequestValue;
    };
    
    div.appendChild(heading);
    div.appendChild(buttonBackup);
    div.appendChild(buttonWipe);
    div.appendChild(buttonRestore);
    div.appendChild(buttonClear);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
   
};

//=============================================================================
// Main Function
$(document).ready(function() {
    var root = $("#root")[0];
    
    var div = document.createElement("div");
    
    var heading = document.createElement("h2");
    heading.textContent = "Service Management Interface";
    div.appendChild(heading);
    root.appendChild(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    root.appendChild(div);
    var bwrGUI = new BackupWipeRestoreGUI(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    root.appendChild(div);
    var loggingGUI = new LoggingGUI(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    root.appendChild(div);
    var healthGUI = new HealthGUI(div);
    
    root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    root.appendChild(div);
    var errorsGUI = new ErrorGUI(div);
    
    root.appendChild(document.createElement("hr"));
   
});
