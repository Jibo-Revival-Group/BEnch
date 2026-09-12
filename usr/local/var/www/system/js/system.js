//=============================================================================
// PowerGUI
PowerGUI = function(div){
    this.div = div;
    
    var heading = document.createElement("h3");
    heading.textContent = "Power GUI";
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 5;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    textareaResponse.value = "";
    
    var buttonPowerOff = document.createElement("button");
    buttonPowerOff.textContent = "Power Off";
    buttonPowerOff.onclick = function() {
        var url = "http://"+window.location.host+"/power/off"
        var data = "";
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    };
    
    var buttonReboot = document.createElement("button");
    buttonReboot.textContent = "Reboot";
    buttonReboot.onclick = function() {
        var url = "http://"+window.location.host+"/power/reboot"
        var data = "";
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    };
    
    div.appendChild(heading);
    div.appendChild(buttonPowerOff);
    div.appendChild(buttonReboot);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaResponse);
}

//=============================================================================
// ServiceGUI
ServiceGUI = function(div){
    this.div = div;
    
    var textareaRequest = document.createElement("textarea");
    textareaRequest.rows = 16;
    textareaRequest.cols = 40;
    textareaRequest.spellcheck = false;
    textareaRequest.readOnly = false;
    textareaRequest.disabled = false;
    textareaRequest.value = JSON.stringify({ services: ["ssm"] }, null, 2);
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 16;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    textareaResponse.value = "";
    
    var buttonList= document.createElement("button");
    buttonList.textContent = "List";
    buttonList.onclick = function() {
        var url = "http://"+window.location.host+"/service/list"
        var jqxhr = $.get(url,function(obj){
            textareaResponse.value = JSON.stringify(obj,null,2)
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    };
    
    var buttonStart = document.createElement("button");
    buttonStart.textContent = "Start";
    buttonStart.onclick = function() {
        var url = "http://"+window.location.host+"/service/start"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    };
    
    var buttonStop = document.createElement("button");
    buttonStop.textContent = "Stop";
    buttonStop.onclick = function() {
        var url = "http://"+window.location.host+"/service/stop"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    };
    
    var buttonRestart = document.createElement("button");
    buttonRestart.textContent = "Restart";
    buttonRestart.onclick = function() {
        var url = "http://"+window.location.host+"/service/restart"
        var data = textareaRequest.value;
        var jqxhr = $.post(url,data,function(obj){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    };
    
    var heading = document.createElement("h2");
    heading.textContent = "Service GUI";
    
    div.appendChild(heading);
    div.appendChild(buttonList);
    div.appendChild(buttonStart);
    div.appendChild(buttonStop);
    div.appendChild(buttonRestart);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaRequest);
    div.appendChild(textareaResponse);
};

//=============================================================================
// ServiceManagementGUI
ServiceManagementGUI = function(div){
    this.div = div;
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 4;
    textareaResponse.cols = 40;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    textareaResponse.value = "";
    
    var buttonWipe= document.createElement("button");
    buttonWipe.textContent = "Wipe";
    buttonWipe.onclick = function() {
        var url = "http://"+window.location.host+"/system/wipe"
        var jqxhr = $.ajax({
            url:url,
            type:"POST",
            success: function(obj, textStatus, xhr){
                textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
            },
            error: function(jqxhr, textStatus, errorThrow){
                textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
            },
        });
    };
    
    var buttonBackup= document.createElement("button");
    buttonBackup.textContent = "Backup";
    buttonBackup.onclick = function() {
        var url = "http://"+window.location.host+"/system/backup"
        var jqxhr = $.ajax({
            url:url,
            type:"POST",
            success: function(obj, textStatus, xhr){
                textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
            },
            error: function(jqxhr, textStatus, errorThrow){
                textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
            },
        });
    };
    
    var buttonRestore= document.createElement("button");
    buttonRestore.textContent = "Restore";
    buttonRestore.onclick = function() {
        var url = "http://"+window.location.host+"/system/restore"
        var jqxhr = $.ajax({
            url:url,
            type:"POST",
            success: function(obj, textStatus, xhr){
                textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
            },
            error: function(jqxhr, textStatus, errorThrow){
                textareaResponse.value = jqxhr.status + " " + jqxhr.statusText;
            },
        });
    };
    
    var buttonClear = document.createElement("button");
    buttonClear.textContent = "Clear GUI";
    buttonClear.onclick = function() {
        textareaResponse.value = "";
    };
    
    var label = document.createTextNode("Service Management GUI");
    var header = document.createElement("H3");
    header.appendChild(label);
    
    div.appendChild(header);
    div.appendChild(buttonWipe);
    div.appendChild(buttonBackup);
    div.appendChild(buttonRestore);
    div.appendChild(buttonClear);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaResponse);
};

//=============================================================================
// StorageGUI
StorageGUI = function(div){
    this.div = div;
    
    var textareaMounts = document.createElement("textarea");
    textareaMounts.rows = 25;
    textareaMounts.cols = 80;
    textareaMounts.spellcheck = false;
    textareaMounts.readOnly = false;
    textareaMounts.value = "";
    
    var buttonMounts= document.createElement("button");
    buttonMounts.textContent = "Get Mounts";
    buttonMounts.onclick = function() {
        var url = "http://"+window.location.host+"/storage/mounts"
        var jqxhr = $.ajax({
            url:url,
            type:"GET",
            success: function(obj, textStatus, xhr){
                textareaMounts.value = JSON.stringify(obj,null,2);
            },
        });
    };
    
    var textareaSemantic = document.createElement("textarea");
    textareaSemantic.rows = 25;
    textareaSemantic.cols = 80;
    textareaSemantic.spellcheck = false;
    textareaSemantic.readOnly = false;
    textareaSemantic.value = "";
    
    var buttonSemantic= document.createElement("button");
    buttonSemantic.textContent = "Get Semantic";
    buttonSemantic.onclick = function() {
        var url = "http://"+window.location.host+"/storage/semantic"
        var jqxhr = $.ajax({
            url:url,
            type:"GET",
            success: function(obj, textStatus, xhr){
                textareaSemantic.value = JSON.stringify(obj,null,2);
            },
        });
    };
    
    var label = document.createTextNode("Storage GUI");
    var header = document.createElement("H3");
    header.appendChild(label);
    
    div.appendChild(header);
    div.appendChild(buttonMounts);
    div.appendChild(buttonSemantic);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaMounts);
    div.appendChild(textareaSemantic);
};

//=============================================================================
// SkillGUI

//"/skill/list"
// "/skill/list"
// "/skill/launch"
// "/skill/terminate"
SkillGUI = function(div){
    this.div = div;
    
    var textareaList = document.createElement("textarea");
    textareaList.rows = 10;
    textareaList.cols = 80;
    textareaList.spellcheck = false;
    textareaList.readOnly = true;
    
    var buttonRefresh = document.createElement("button");
    buttonRefresh.textContent = "Refresh";
    buttonRefresh.onclick = function() {
        var url = "http://"+window.location.host+"/skill/refresh"
        var jqxhr = $.ajax({
            url:url,
            type:"POST",
            success: function(obj, textStatus, xhr){},
        });
    };
    
    var buttonList = document.createElement("button");
    buttonList.textContent = "List";
    buttonList.onclick = function() {
        var url = "http://"+window.location.host+"/skill/list"
        var jqxhr = $.ajax({
            url:url,
            type:"GET",
            success: function(obj, textStatus, xhr){
                textareaList.value = JSON.stringify(obj,null,2);
            },
        });
    };
    
    var textareaSkill = document.createElement("textarea");
    textareaSkill.rows = 5;
    textareaSkill.cols = 40;
    textareaSkill.spellcheck = false;
    textareaSkill.readOnly = false;
    textareaSkill.value = JSON.stringify({
        name:"diagnostics",
        context:"{}"
    },null,2);
    
    var buttonLaunch = document.createElement("button");
    buttonLaunch.textContent = "Launch";
    buttonLaunch.onclick = function() {
        var url = "http://"+window.location.host+"/skill/launch"
        var data = JSON.stringify(JSON.parse(textareaSkill.value));
        var jqxhr = $.ajax({
            url:url,
            type:"POST",
            data : data,
            success: function(obj, textStatus, xhr){
                console.log("launched");
            },
        });
    };
    
    var buttonTerminate = document.createElement("button");
    buttonTerminate.textContent = "Terminate";
    buttonTerminate.onclick = function() {
        var url = "http://"+window.location.host+"/skill/terminate"
        var data = JSON.stringify(JSON.parse(textareaSkill.value));
        var jqxhr = $.ajax({
            url:url,
            type:"POST",
            data : data,
            success: function(obj, textStatus, xhr){
                console.log("terminated");
            },
        });
    };
    
    var label = document.createTextNode("Skill GUI");
    var header = document.createElement("H3");
    header.appendChild(label);
    
    div.appendChild(header);
    div.appendChild(buttonRefresh);
    div.appendChild(document.createElement("br"));
    div.appendChild(buttonList);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaList);
    div.appendChild(document.createElement("br"));
    div.appendChild(buttonLaunch);
    div.appendChild(buttonTerminate);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaSkill);
}

//=============================================================================
// SessionGUI

//"/session/request"
//"/session/delete/<token>"
//"/session/current"
//"/session/list"

SessionGUI = function(div) {
    this.div = div;
    
    this.RequestGUI = function(div){
        var textareaSkill = document.createElement("textarea");
        textareaSkill.rows = 1;
        textareaSkill.cols = 80;
        textareaSkill.spellcheck = false;
        textareaSkill.readOnly = false;
        textareaSkill.placeholder = "Skill Token";
        
        var textareaSession = document.createElement("textarea");
        textareaSession.rows = 5;
        textareaSession.cols = 80;
        textareaSession.spellcheck = false;
        textareaSession.readOnly = true;
        textareaSession.placeholder = "Session Token";
        
        var button = document.createElement("button");
        button.textContent = "Send";
        button.onclick = function() {
            var url = "http://"+window.location.host+"/session/request"
            var token = textareaSkill.value;
            var jqxhr = $.ajax({
                url:url,
                type:"GET",
                headers : {"Jibo-Authenticate":token},
                success: function(obj){
                    textareaSession.value = JSON.stringify(obj, null, 2);
                }
            });
        };
        
        var buttonClear = document.createElement("button");
        buttonClear.textContent = "Clear";
        buttonClear.onclick = function() {
            textareaSkill.value = "";
            textareaSession.value = "";
        };
        
        var label = document.createTextNode("Request GUI");
        var header = document.createElement("H3");
        header.appendChild(label);
        
        div.appendChild(header);
        div.appendChild(buttonClear)
        div.appendChild(button);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaSkill);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaSession);
    }
    
    this.CurrentGUI = function(div){
        var textareaManager = document.createElement("textarea");
        textareaManager.rows = 1;
        textareaManager.cols = 80;
        textareaManager.spellcheck = false;
        textareaManager.readOnly = false;
        textareaManager.placeholder = "Manager Token";
        
        var textareaSession = document.createElement("textarea");
        textareaSession.rows = 5;
        textareaSession.cols = 80;
        textareaSession.spellcheck = false;
        textareaSession.readOnly = false;
        textareaSession.placeholder = "Session Token";
        
        var textareaStatus = document.createElement("textarea");
        textareaStatus.rows = 10;
        textareaStatus.cols = 80;
        textareaStatus.spellcheck = false;
        textareaStatus.readOnly = true;
        textareaStatus.placeholder = "Status";
        
        var buttonGetCurrent = document.createElement("button");
        buttonGetCurrent.textContent = "Get Current";
        buttonGetCurrent.onclick = function() {
            var managerToken = textareaManager.value; 
            var url = "http://"+window.location.host+"/session/current"
            var jqxhr = $.ajax({
                url:url,
                type:"GET",
                headers : {"Jibo-Authenticate":managerToken},
                dataType : "json",
                success: function(obj, textStatus, xhr){
                    textareaStatus.value = JSON.stringify(obj,null,2);
                }
            });
        };
        
        var buttonSetCurrent = document.createElement("button");
        buttonSetCurrent.textContent = "Set Current";
        buttonSetCurrent.onclick = function() {
            var managerToken = textareaManager.value; 
            var url = "http://"+window.location.host+"/session/current"
            var data = JSON.stringify(JSON.parse(textareaSession.value));
            var jqxhr = $.ajax({
                url:url,
                type:"POST",
                headers : {"Jibo-Authenticate":managerToken},
                data : data,
                success: function(obj, textStatus, xhr){
                    textareaStatus.value = JSON.stringify(obj,null,2);
                },
            });
        };
        
        var buttonClear = document.createElement("button");
        buttonClear.textContent = "Clear";
        buttonClear.onclick = function() {
            textareaManager.value = "";
            textareaSession.value = "";
            textareaStatus.value = "";
        };
        
        var label = document.createTextNode("Current GUI");
        var header = document.createElement("H3");
        header.appendChild(label);
        
        div.appendChild(header);
        div.appendChild(buttonClear);
        div.appendChild(buttonGetCurrent);
        div.appendChild(buttonSetCurrent);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaManager);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaSession);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaStatus);
    }
    
    this.DeleteGUI = function(div){
        var textareaManager = document.createElement("textarea");
        textareaManager.rows = 1;
        textareaManager.cols = 80;
        textareaManager.spellcheck = false;
        textareaManager.readOnly = false;
        textareaManager.placeholder = "Manager Token";
        
        var textareaSession = document.createElement("textarea");
        textareaSession.rows = 5;
        textareaSession.cols = 80;
        textareaSession.spellcheck = false;
        textareaSession.readOnly = false;
        textareaSession.placeholder = "Session Token";
        
        var textareaStatus = document.createElement("textarea");
        textareaStatus.rows = 1;
        textareaStatus.cols = 80;
        textareaStatus.spellcheck = false;
        textareaStatus.readOnly = true;
        textareaStatus.placeholder = "Status";
        
        var button = document.createElement("button");
        button.textContent = "Send";
        button.onclick = function() {
            var managerToken = textareaManager.value; 
            var url = "http://"+window.location.host+"/session/delete"
            var data = JSON.stringify(JSON.parse(textareaSession.value));
            var jqxhr = $.ajax({
                url:url,
                type:"POST",
                headers : {"Jibo-Authenticate":managerToken},
                data : data,
                success: function(obj, textStatus, xhr){},
                complete: function(xhr, textStatus){
                    textareaStatus.value = xhr.status;
                }
            });
        };
        
        var buttonClear = document.createElement("button");
        buttonClear.textContent = "Clear";
        buttonClear.onclick = function() {
            textareaManager.value = "";
            textareaSession.value = "";
            textareaStatus.value = "";
        };
        
        var label = document.createTextNode("Delete GUI");
        var header = document.createElement("H3");
        header.appendChild(label);
        
        div.appendChild(header);
        div.appendChild(button);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaManager);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaSession);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaStatus);
    }
    
    this.ListGUI = function(div){
        var textareaManager = document.createElement("textarea");
        textareaManager.rows = 1;
        textareaManager.cols = 80;
        textareaManager.spellcheck = false;
        textareaManager.readOnly = false;
        textareaManager.placeholder = "Manager Token";
        
        var textareaResponse = document.createElement("textarea");
        textareaResponse.rows = 10;
        textareaResponse.cols = 80;
        textareaResponse.spellcheck = false;
        textareaResponse.readOnly = true;
        textareaResponse.placeholder = "Response";
        
        var button = document.createElement("button");
        button.textContent = "Send";
        button.onclick = function() {
            var managerToken = textareaManager.value; 
            var url = "http://"+window.location.host+"/session/list"
            var jqxhr = $.ajax({
                url:url,
                type:"GET",
                headers : {"Jibo-Authenticate":managerToken},
                success: function(obj, textStatus, xhr){
                    textareaResponse.value = JSON.stringify(obj,null,2);
                }
            });
        };
        
        var buttonClear = document.createElement("button");
        buttonClear.textContent = "Clear";
        buttonClear.onclick = function() {
            textareaManager.value = "";
            textareaResponse.value = "";
        };
        
        var label = document.createTextNode("List GUI");
        var header = document.createElement("H3");
        header.appendChild(label);
        
        div.appendChild(header);
        div.appendChild(button);
        div.appendChild(buttonClear);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaManager);
        div.appendChild(document.createElement("br"));
        div.appendChild(textareaResponse);
    }
    
    var child = document.createElement("div");
    var requestGUI = new this.RequestGUI(child);
    this.div.appendChild(child);
    
    this.div.appendChild(document.createElement("hr"));
    
    var child = document.createElement("div");
    var CurrentGUI = new this.CurrentGUI(child);
    this.div.appendChild(child);
    
    this.div.appendChild(document.createElement("hr"));
    
    var child = document.createElement("div");
    var deleteGUI = new this.DeleteGUI(child);
    this.div.appendChild(child);
    
    this.div.appendChild(document.createElement("hr"));
    
    var child = document.createElement("div");
    var listGUI = new this.ListGUI(child);
    this.div.appendChild(child);
}

//=============================================================================
// WifiGUI
WifiGUI= function(div) {
    var textareaArgs = document.createElement("textarea");
    textareaArgs = document.createElement("textarea");
    textareaArgs.rows = 20;
    textareaArgs.cols = 60;
    textareaArgs.spellcheck = false;
    textareaArgs.readOnly = false;
    textareaArgs.value = JSON.stringify({
        command:"STATUS-VERBOSE"
    }, null, 2);
    
    var textareaRaw = document.createElement("textarea");
    textareaRaw = document.createElement("textarea");
    textareaRaw.rows = 20;
    textareaRaw.cols = 60;
    textareaRaw.spellcheck = false;
    textareaRaw.readOnly = true;
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 20;
    textareaResponse.cols = 60;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = false;
    
    var textareaMessages = document.createElement("textarea");
    textareaMessages = document.createElement("textarea");
    textareaMessages.rows = 20;
    textareaMessages.cols = 60;
    textareaMessages.spellcheck = false;
    textareaMessages.readOnly = false;
    
    var buttonSend = document.createElement("button");
    buttonSend.textContent = "Send";
    buttonSend.onclick = function() {
        var url = "http://"+window.location.host+"/wifi/wpa"
        var data = JSON.stringify(JSON.parse(textareaArgs.value));
        var jqxhr = $.post(url,data,function(obj){
            textareaRaw.value = JSON.stringify(obj, null, 2);
            textareaResponse.value = obj.response
        }, "json");
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){ });
        jqxhr.always(function(msg){ }, "json");
    };
    
    var buttonClear = document.createElement("button");
    buttonClear.textContent = "Clear";
    buttonClear.onclick = function() {
        textareaRaw.value = "";
        textareaResponse.value = "";
    };
    
    
    var socket = null;
    var buttonConnect = document.createElement("button");
    buttonConnect.textContent = "Connect";
    buttonConnect.onclick = function() {
        socket = new WebSocket(
            "ws://" + window.location.host + "/wifi/messages");
        socket.onopen = function() {
        }
        socket.onmessage = function(msg) {
            try {
                var obj = JSON.parse(msg.data);
                textareaMessages.value = JSON.stringify(obj,null,2);
            } catch (err) {
                console.log(err);
            }
        }
        socket.onerror = function() {
            console.log("Port error");
        }
        socket.onclose = function() {
            console.log("Port closed!");
        }
    };

    var buttonDisconnect = document.createElement("button");
    buttonDisconnect.textContent = "Disconnect";
    buttonDisconnect.onclick = function() {
        socket.close();
    };
    
    
    var textareaAdvancedRequest = document.createElement("textarea");
    textareaAdvancedRequest = document.createElement("textarea");
    textareaAdvancedRequest.rows = 30;
    textareaAdvancedRequest.cols = 60;
    textareaAdvancedRequest.spellcheck = false;
    textareaAdvancedRequest.readOnly = false;
    textareaAdvancedRequest.value = JSON.stringify({}, null, 2);
    
    var textareaAdvancedResponse = document.createElement("textarea");
    textareaAdvancedResponse = document.createElement("textarea");
    textareaAdvancedResponse.rows = 30;
    textareaAdvancedResponse.cols = 60;
    textareaAdvancedResponse.spellcheck = false;
    textareaAdvancedResponse.readOnly = false;
    
    var buttonAdvancedGet = document.createElement("button");
    buttonAdvancedGet.textContent = "Get";
    buttonAdvancedGet.onclick = function() {
        var url = "http://"+window.location.host+"/wifi/interface"
        var jqxhr = $.get(url,function(obj){
            textareaAdvancedResponse.value = JSON.stringify(obj, null, 2);
        }, "json");
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){ });
        jqxhr.always(function(msg){ }, "json");
    };
    
    var buttonAdvancedSet = document.createElement("button");
    buttonAdvancedSet.textContent = "Set";
    buttonAdvancedSet.onclick = function() {
        var url = "http://"+window.location.host+"/wifi/interface"
        var data = JSON.stringify(JSON.parse(textareaAdvancedRequest.value));
        var jqxhr = $.post(url,data,function(obj){
        }, "json");
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){ });
        jqxhr.always(function(msg){ }, "json");
    };
    
    var headerWifi = document.createElement("H3");
    headerWifi.appendChild(document.createTextNode("Wifi"));
    
    var headerMessages = document.createElement("H3");
    headerMessages.appendChild(document.createTextNode("Messages"));
    
    var headerAdvanced = document.createElement("H3");
    headerAdvanced.appendChild(document.createTextNode("Advanced Wifi"));
    
    div.appendChild(headerWifi);
    div.appendChild(buttonSend);
    div.appendChild(buttonClear);
    div.appendChild(buttonConnect);
    div.appendChild(buttonDisconnect);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaArgs);
    div.appendChild(textareaRaw);
    div.appendChild(document.createElement("br"));
    div.appendChild(headerMessages);
    div.appendChild(textareaResponse);
    div.appendChild(textareaMessages);
    div.appendChild(document.createElement("br"));
    div.appendChild(headerAdvanced);
    div.appendChild(buttonAdvancedGet);
    div.appendChild(buttonAdvancedSet);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaAdvancedResponse);
    div.appendChild(textareaAdvancedRequest);
    
}

//=============================================================================
// VersionGUI
VersionGUI= function(div) {
    var textarea = document.createElement("textarea");
    textarea.rows = 5;
    textarea.cols = 80;
    textarea.spellcheck = false;
    textarea.readOnly = true;
    textarea.value = "";
    var button = document.createElement("button");
    button.textContent = "Get Version";
    button.onclick = function() {
        var url = "http://"+window.location.host+"/version"
        var jqxhr = $.get(url,function(obj){
            textarea.value = JSON.stringify(obj, null, 2);
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };
    
    div.appendChild(button);
    div.appendChild(document.createElement("br"));
    div.appendChild(textarea);
}

//=============================================================================
// IdentityGUI
IdentityGUI= function(div) {
     var textarea = document.createElement("textarea");
     textarea.rows = 7;
     textarea.cols = 80;
     textarea.spellcheck = false;
     textarea.readOnly = true;
     textarea.value = "";
     var button = document.createElement("button");
     button.textContent = "Get Identity";
     button.onclick = function() {
         var url = "http://"+window.location.host+"/identity";
         var jqxhr = $.get(url,function(obj){
             textarea.value = JSON.stringify(obj, null, 2);
         }, "json");
         jqxhr.done(function(msg){});
         jqxhr.fail(function(msg){});
         jqxhr.always(function(msg){});
     };
     
     div.appendChild(button);
     div.appendChild(document.createElement("br"));
     div.appendChild(textarea);
}

//=============================================================================
//TimeGUI
TimeGUI= function(div) {
    
    var buttonSynchronize = document.createElement("button");
    buttonSynchronize.textContent = "Synchronize time";
    buttonSynchronize.onclick = function() {
        var url = "http://"+window.location.host+"/time/synchronize"
        var data = JSON.stringify({})
        var jqxhr = $.post(url,data,function(obj){
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };
    
    var textareaCurrentTime = document.createElement("textarea");
    textareaCurrentTime.rows = 5;
    textareaCurrentTime.cols = 80;
    textareaCurrentTime.spellcheck = false;
    textareaCurrentTime.readOnly = true;
    textareaCurrentTime.value = "";
    
    var buttonCurrentTime = document.createElement("button");
    buttonCurrentTime.textContent = "Get current time";
    buttonCurrentTime.onclick = function() {
        var url = "http://"+window.location.host+"/time/current"
        var jqxhr = $.get(url,function(obj){
            textareaCurrentTime.value = JSON.stringify(obj, null, 2);
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };
    
    var textareaGetTimezone = document.createElement("textarea");
    textareaGetTimezone.rows = 5;
    textareaGetTimezone.cols = 40;
    textareaGetTimezone.spellcheck = false;
    textareaGetTimezone.readOnly = true;
    textareaGetTimezone.value = "";
    
    var textareaSetTimezone = document.createElement("textarea");
    textareaSetTimezone.rows = 5;
    textareaSetTimezone.cols = 40;
    textareaSetTimezone.spellcheck = false;
    textareaSetTimezone.readOnly = false;
    textareaSetTimezone.value = JSON.stringify({
        timezone: "Etc/UTC"
    }, null, 2);
    
    var buttonGetTimezone = document.createElement("button");
    buttonGetTimezone.textContent = "Get timezone";
    buttonGetTimezone.onclick = function() {
        var url = "http://"+window.location.host+"/time/zone"
        var jqxhr = $.get(url,function(obj){
            textareaGetTimezone.value = JSON.stringify(obj, null, 2);
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };
    
    var buttonSetTimezone = document.createElement("button");
    buttonSetTimezone.textContent = "Set timezone";
    buttonSetTimezone.onclick = function() {
        var url = "http://"+window.location.host+"/time/zone"
        var data = JSON.stringify(JSON.parse(textareaSetTimezone.value));
        var jqxhr = $.post(url,data,function(obj){
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };
    
    div.appendChild(buttonCurrentTime)
    div.appendChild(buttonSynchronize)
    div.appendChild(document.createElement("br"))
    div.appendChild(textareaCurrentTime)
    div.appendChild(document.createElement("br"))
    div.appendChild(buttonGetTimezone);
    div.appendChild(buttonSetTimezone);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaGetTimezone);
    div.appendChild(textareaSetTimezone);
}

//=============================================================================
//CredentialsGUI
CredentialsGUI= function(div) {
    var textareaGet = document.createElement("textarea");
    textareaGet.rows = 5;
    textareaGet.cols = 40;
    textareaGet.spellcheck = false;
    textareaGet.readOnly = true;
    textareaGet.value = "";
    
    var textareaSet = document.createElement("textarea");
    textareaSet.rows = 5;
    textareaSet.cols = 40;
    textareaSet.spellcheck = false;
    textareaSet.readOnly = false;
    textareaSet.value = JSON.stringify({
        accessKeyId: "foo", 
        secretAccessKey: "bar", 
        region: "qux" 
    }, null, 2);
    
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get credentials";
    buttonGet.onclick = function() {
        var url = "http://"+window.location.host+"/credentials"
        var jqxhr = $.get(url,function(obj){
            textareaGet.value = JSON.stringify(obj, null, 2);
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };
    
    var buttonSet = document.createElement("button");
    buttonSet.textContent = "Set credentials";
    buttonSet.onclick = function() {
        var url = "http://"+window.location.host+"/credentials"
        var data = JSON.stringify(JSON.parse(textareaSet.value));
        var jqxhr = $.post(url,data,function(obj){
            // TODO: display response to post
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };
    
    div.appendChild(buttonGet);
    div.appendChild(buttonSet);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaGet);
    div.appendChild(textareaSet);
}

//=============================================================================
// ModeGUI
ModeGUI= function(div) {
  var textareaGet = document.createElement("textarea");
  textareaGet.rows = 5;
  textareaGet.cols = 40;
  textareaGet.spellcheck = false;
  textareaGet.readOnly = true;
  textareaGet.value = "";
  
  var textareaSet = document.createElement("textarea");
  textareaSet.rows = 5;
  textareaSet.cols = 40;
  textareaSet.spellcheck = false;
  textareaSet.readOnly = false;
  textareaSet.value = JSON.stringify({
      mode: "identified",
  }, null, 2);
  
  
  var buttonGet = document.createElement("button");
  buttonGet.textContent = "Get mode";
  buttonGet.onclick = function() {
      var url = "http://"+window.location.host+"/mode"
      var jqxhr = $.get(url,function(obj){
          textareaGet.value = JSON.stringify(obj, null, 2);
      }, "json");
      jqxhr.done(function(msg){});
      jqxhr.fail(function(msg){});
      jqxhr.always(function(msg){});
  };
  
  var buttonSet = document.createElement("button");
  buttonSet.textContent = "Set mode";
  buttonSet.onclick = function() {
      var url = "http://"+window.location.host+"/mode"
      var data = JSON.stringify(JSON.parse(textareaSet.value));
      var jqxhr = $.post(url,data,function(obj){
          // TODO: display response to post
      }, "json");
      jqxhr.done(function(msg){});
      jqxhr.fail(function(msg){});
      jqxhr.always(function(msg){});
  };
  
  div.appendChild(buttonGet);
  div.appendChild(buttonSet);
  div.appendChild(document.createElement("br"));
  div.appendChild(textareaGet);
  div.appendChild(textareaSet);
}

//=============================================================================
// UpdateGUI
UpdateGUI = function(div) {
    var textareaGet = document.createElement("textarea");
    textareaGet.rows = 20;
    textareaGet.cols = 40;
    textareaGet.spellcheck = false;
    textareaGet.readOnly = true;
    textareaGet.value = "";
    
    var textareaSet = document.createElement("textarea");
    textareaSet.rows = 20;
    textareaSet.cols = 40;
    textareaSet.spellcheck = false;
    textareaSet.readOnly = false;
    textareaSet.value = JSON.stringify({
        ids: [""]
    }, null, 2);

    var textareaResp = document.createElement("textarea");
    textareaResp.rows = 20;
    textareaResp.cols = 40;
    textareaResp.spellcheck = false;
    textareaResp.readOnly = true;
    textareaResp.value = "";

    var textareaFilter = document.createElement("textarea");
    textareaFilter.id = "textareaFilter";
    textareaFilter.spellcheck = false;
    textareaFilter.readOnly = false;
    textareaFilter.rows = 1;
    textareaFilter.cols = 20;
    textareaFilter.value = "";

    var filterLabel = document.createElement("label");
    filterLabel.htmlFor = "textareaFilter";
    filterLabel.innerHTML = "Filter";

    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get Updates";
    buttonGet.onclick = function() {
        textareaGet.value = "";
        var url = "http://"+window.location.host+"/update/" + textareaFilter.value;
        var jqxhr = $.get(url, function(obj) {
            textareaGet.value = JSON.stringify(obj, null, 2);
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };

    function parseDLStatus(data) {
        var openBrace = data.indexOf("{", 0);
        if (openBrace < 0) {
            return null;
        }
        var closeBrace = data.indexOf("}", openBrace);
        if (closeBrace < 0) {
            return null;
        }
        var end = closeBrace + 1;
        var obj = data.substring(openBrace, end);
        try {
            obj = JSON.parse(obj);
        } catch (err) {
            return null;
        }
        return {data: obj, end: end};
    }
    
    var buttonDL = document.createElement("button");
    buttonDL.textContent = "Download Updates";
    buttonDL.onclick = function() {
        var url = "http://"+window.location.host+"/update"
        var num_dls = JSON.parse(textareaSet.value).ids.length;
        var data = JSON.stringify(JSON.parse(textareaSet.value));
        textareaResp.value = "";

        var statuses = [];
        for (var ii=0; ii<num_dls; ++ii) {
            statuses.push({});
        }
        var done_count = 0;

        var xhr = new XMLHttpRequest();
        xhr.onerror = function() { console.log("XHR Fatal Error"); };
        var last_idx = 0;
        xhr.onreadystatechange = function() {
            try {
                if (xhr.readyState > 2) {
                    //console.log("responsetext: ", xhr.responseText);
                    var text = xhr.responseText.substring(last_idx);
                    var s = parseDLStatus(text);
                    while (s !== null) {
                        last_idx += s.end;
                        statuses[done_count] = s.data;
                        if (s.data.status == "failed" || s.data.status == "finished") {
                            done_count++;
                        }
                        textareaResp.value = JSON.stringify(statuses, null, 2);
                        text = xhr.responseText.substring(last_idx);
                        s = parseDLStatus(text);
                    }
                }
            } catch (err) {
                console.log(err);
            }
        };
        xhr.open("PUT", url, true);
        xhr.send(data);
    };

    var buttonApply = document.createElement("button");
    buttonApply.textContent = "Apply Updates";
    buttonApply.onclick = function() {
        textareaResp.value = "";
        var url = "http://"+window.location.host+"/update"
        var data = JSON.stringify(JSON.parse(textareaSet.value));
        var jqxhr = $.post(url,data,function(obj){
            if (obj) {
                textareaResp.value = JSON.stringify(obj, null, 2);
            }
        }, "json");
        jqxhr.done(function(msg){});
        jqxhr.fail(function(msg){});
        jqxhr.always(function(msg){});
    };

    var label = document.createTextNode("Update GUI");
    var header = document.createElement("H3");
    header.appendChild(label);
    
    div.appendChild(header);
    div.appendChild(textareaFilter);
    div.appendChild(filterLabel);
    div.appendChild(buttonGet);
    div.appendChild(buttonDL);
    div.appendChild(buttonApply);
    div.appendChild(document.createElement("br"));
    div.appendChild(textareaGet);
    div.appendChild(textareaSet);
    div.appendChild(textareaResp);
}

//=============================================================================
// System Notifications GUI

SysNotifyGUI = function(div) {
    var label = document.createTextNode("System Notification GUI");
    var header = document.createElement("H3");
    header.appendChild(label);
    div.appendChild(header);

    var buttonConnect = document.createElement("button");
    buttonConnect.textContent = "Connect";
    buttonConnect.onclick = function() {
        socket = new WebSocket(
            "ws://" + window.location.host + "/system_notifications");
        socket.onopen = function() {
        }
        socket.onmessage = function(msg) {
            try {
                var obj = JSON.parse(msg.data);
                textarea.value = JSON.stringify(obj,null,2);
            } catch (err) {
                console.log(err);
            }
        }
        socket.onerror = function() {
            console.log("Port error");
        }
        socket.onclose = function() {
            console.log("Port closed!");
        }
    };
    div.appendChild(buttonConnect);

    var buttonDisconnect = document.createElement("button");
    buttonDisconnect.textContent = "Disconnect";
    buttonDisconnect.onclick = function() {
        socket.close();
    };
    div.appendChild(buttonDisconnect);

    div.appendChild(document.createElement("br"));

    var textarea = document.createElement("textarea");
    textarea.rows = 25;
    textarea.cols = 80;
    textarea.spellcheck = false;
    textarea.readOnly = true;
    textarea.value = "";
    div.appendChild(textarea);
}

//=============================================================================
// Logs GUI

LogsGUI = function(div) {
    var label = document.createTextNode("Logs GUI");
    var header = document.createElement("H3");
    header.appendChild(label);
    div.appendChild(header);

    var buttonUpload = document.createElement("button");
    buttonUpload.textContent = "Upload Logs";
    buttonUpload.onclick = function() {
        textarea.value = "";
        var url = "http://" + window.location.host + "/logs/upload";
        $.post(url, null, function(obj) {
            textarea.value = JSON.stringify(obj, null, 2);
        });
    };
    div.appendChild(buttonUpload);

    div.appendChild(document.createElement("br"));

    var textarea = document.createElement("textarea");
    textarea.rows = 5;
    textarea.cols = 80;
    textarea.spellcheck = false;
    textarea.readOnly = true;
    textarea.value = "";
    div.appendChild(textarea);
}

//=============================================================================
// Main Function
$(document).ready(function() {
    var _this = this;

    _this.root = $("#root")[0];

    var div = document.createElement("div");
    _this.versionGUI = new VersionGUI(div);
    _this.root.appendChild(div);
    
    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.identityGUI = new IdentityGUI(div);
    _this.root.appendChild(div);
    
    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.credentialsGUI = new CredentialsGUI(div);
    _this.root.appendChild(div);

    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.modeGUI = new ModeGUI(div);
    _this.root.appendChild(div);

    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.timeGUI = new TimeGUI(div);
    _this.root.appendChild(div);

    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.serviceManagementGUI = new ServiceManagementGUI(div);
    _this.root.appendChild(div);

    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.skillGUI = new SkillGUI(div);
    _this.root.appendChild(div);
    
    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.sessionGUI = new SessionGUI(div);
    _this.root.appendChild(div);
    
    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.wifiGUI = new WifiGUI(div);
    _this.root.appendChild(div);
    
    _this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    _this.updateGUI = new UpdateGUI(div);
    _this.root.appendChild(div);
    
    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.storageGUI = new StorageGUI(div);
    _this.root.appendChild(div);
    
    _this.root.appendChild(document.createElement("hr"));
    
    var div = document.createElement("div");
    _this.serviceGUI = new ServiceGUI(div);
    _this.root.appendChild(div);

    _this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    _this.sysNotifyGUI = new SysNotifyGUI(div);
    _this.root.appendChild(div);

    _this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    _this.logsGUI = new LogsGUI(div);
    _this.root.appendChild(div);
    
    _this.root.appendChild(document.createElement("hr"));

    var div = document.createElement("div");
    _this.powerGUI = new PowerGUI(div);
    _this.root.appendChild(div);
    
});
