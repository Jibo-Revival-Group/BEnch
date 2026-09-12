
/* The Jetstream Debug Page */

/* A reconnecting Websocket */

function WebSocketClient(url) {
    this.number = 0;	// Message number
    this.autoReconnectInterval = 1 * 1000;	// ms
    this.givenDisconnect = false;
    if (url) {
        this.open(url);
    }
}
WebSocketClient.prototype.open = function (url) {
    this.url = url;
    this.instance = new WebSocket(this.url);
    this.instance.onopen = (e) => {
        this.givenDisconnect = false;
        this.onopen(e);
    };
    this.instance.onmessage = (data, flags) => {
        this.number++;
        this.onmessage(data, flags, this.number);
    };
    this.instance.onclose = (e) => {
        switch (e) {
            case 1000:	// CLOSE_NORMAL
                console.log("WebSocket: closed");
                break;
            default:	// Abnormal closure
                this.reconnect(e);
                break;
        }
        this.onclose(e);
        if (!this.givenDisconnect) {
            this.givenDisconnect = true
            this.ondisconnect(e);
        }
    };
    this.instance.onerror = (e) => {
        switch (e.code) {
            case 'ECONNREFUSED':
                this.reconnect(e);
                break;
            default:
                this.onerror(e);
                break;
        }
    };
}
WebSocketClient.prototype.send = function (data, option) {
    try {
        this.instance.send(data, option);
    } catch (e) {
        this.instance.emit('error', e);
    }
}
WebSocketClient.prototype.reconnect = function (e) {
    console.log(`WebSocketClient: retry in ${this.autoReconnectInterval}ms`, e);
    var that = this;
    setTimeout(function () {
        console.log("WebSocketClient: reconnecting...");
        that.open(that.url);
    }, this.autoReconnectInterval);
}
WebSocketClient.prototype.onopen = function (e) { console.log("WebSocketClient: open", arguments); }
WebSocketClient.prototype.onmessage = function (data, flags, number) { console.log("WebSocketClient: message", arguments); }
WebSocketClient.prototype.onerror = function (e) { console.log("WebSocketClient: error", arguments); }
WebSocketClient.prototype.onclose = function (e) { console.log("WebSocketClient: closed", arguments); }
WebSocketClient.prototype.ondisconnect = function (e) { console.log("WebSocketClient: disconnected", arguments); }

/* The Jetstream Debug Page */

var ipaddr = window.location.href.split('/')[2]
var wsIn = new WebSocketClient(`ws://${ipaddr}/debug/hub_incoming`);
var wsOut = new WebSocketClient(`ws://${ipaddr}/debug/hub_outgoing`);
var wsEvents = new WebSocketClient(`ws://${ipaddr}/events`);
var wsRecorder = new WebSocketClient(`ws://${ipaddr}/events`);
var wsListenLoop = new WebSocketClient(`ws://${ipaddr}/debug/listenloop`);
var wsHttpWatch = new WebSocketClient(`ws://${ipaddr}/debug/http_watch`);

var break_string = "---------------------------------"
var incoming_type = '';
keepLog = false;
var recTime = 2000;
var record_clicked = false;
//---
var hubOut_type = '';
var event_type = '';
var b64enc;

//=============================================================================
// Main Title
pageTitle = function (div) {
    var div_label = document.createTextNode("JetStream Service");
    var div_title = document.createElement("H1");
    div_title.appendChild(div_label);

    div.appendChild(div_title);
    div.appendChild(document.createElement("hr"));
}

//=============================================================================
// Clear All
clearAllGUI = function (div) {
    this.div = div;
    var buttonClearAll = document.createElement("button");
    buttonClearAll.textContent = "ClearAll";
    buttonClearAll.onclick = function () {
        document.getElementById('httpWatchText').value = '';
        document.getElementById('hubInText').value = '';
        document.getElementById('hubOutText').value = '';
        document.getElementById('jetEventText').value = '';
        document.getElementById('listenLoopText').value = '';
    };

    div.appendChild(buttonClearAll);
    div.appendChild(document.createElement("hr"));

}

OutputText = function (area, text) {
    var textArea = document.getElementById(area);
    textArea.value = textArea.value + text + '\n';
    textArea.scrollTop = textArea.scrollHeight;
}

ClearText = function (area) {
    var textArea = document.getElementById(area);
    textArea.value = '';
    textArea.scrollTop = textArea.scrollHeight;
}

Connect = (area) => {
    OutputText(area, '        CONNECTED ****    ' + Date());
};

Disconnect = (area) => {
    OutputText(area, '**** DISCONNECTED      ' + Date());
}

//=============================================================================
// HTTP Watch
httpWatchGUI = function (div, ws) {
    this.div = div;
    var area = 'httpWatchText';
    event_div(this.div, "/debug/http_watch", area);

    ws.onopen = () => { Connect(area); }
    ws.ondisconnect = () => { Disconnect(area); }
    ws.onmessage = (event) => {
        OutputText(area, event.data);
    };
}

//=============================================================================
// Hub Incoming
hubINGUI = function (div, ws) {
    this.div = div;
    var area = 'hubInText';
    event_div(this.div, "/debug/hub_incoming", area, "hubInCheck");

    ws.onopen = () => { Connect(area); }
    ws.ondisconnect = () => { Disconnect(area); }
    ws.onmessage = (event) => {
        if (this.clear_next_hub_in) {
            box = document.getElementById('hubInCheck');
            if (box.checked) {
                ClearText(area);
            } else {
                OutputText(area, getBreakString() + '\n');
            }
        }
        json = JSON.parse(event.data);
        this.clear_next_hub_in = json.final;
        OutputText(area, event.data);
    };

}

//=============================================================================
// Hub Outgoing
hubOUTGUI = function (div, ws) {
    this.div = div;
    var area = 'hubOutText';
    event_div(this.div, "/debug/hub_outgoing", area, "hubOutCheck");

    ws.onopen = () => { Connect(area); }
    ws.ondisconnect = () => { Disconnect(area); }
    ws.onmessage = (event) => {
        box = document.getElementById('hubOutCheck');
        if (this.clear_next_hub_out) {
            if (box.checked) {
                ClearText(area);
            } else {
                OutputText(area, getBreakString() + '\n');
            }
        }
        json = JSON.parse(event.data);
        this.clear_next_hub_out = json.type == 'CONTEXT';
        OutputText(area, event.data);
    };


}

//=============================================================================
// Jetstream Events to Skills
jetEvents = function (div, ws) {
    this.div = div;
    var area = 'jetEventText';
    event_div(this.div, "/events", area, "jetEventCheck");

    ws.onopen = () => { Connect(area); }
    ws.ondisconnect = () => { Disconnect(area); }
    ws.onmessage = (event) => {
        if (this.clear_next_event) {
            box = document.getElementById('jetEventCheck');
            if (box.checked) {
                ClearText(area);
            } else {
                OutputText(area, getBreakString() + '\n');
            }
        }
        json = JSON.parse(event.data);
        this.clear_next_event = json.type == 'TURN_RESULT';
        OutputText(area, event.data);
    };

}

//=============================================================================
// Listen Loop
listenLoop = function (div, ws) {
    this.div = div;
    var area = 'listenLoopText';
    event_div(this.div, "/debug/listenloop", area, "listenLoopCheck");

    ws.onopen = () => { Connect(area); }
    ws.ondisconnect = () => { Disconnect(area); }
    ws.onmessage = (event) => {
        json = JSON.parse(event.data);
        this.clear_next_event = json.type == 'JM_START_LOCAL_TURN' || json.type == 'JM_RECOG_HJ_EVENT';

        if (this.clear_next_listenloop) {
            box = document.getElementById('listenLoopCheck');
            if (box.checked) {
                ClearText(area);
            } else {
                OutputText(area, getBreakString() + '\n');
            }
        }
        OutputText(area, event.data);
    };
}


mimicMic = function (div) {
    this.div = div;
    // var b64enc;
    var label = document.createTextNode("Mimic Input with local file");
    var header = document.createElement("H4");
    header.appendChild(label);

    var textareaUpload = document.createElement("textarea");
    textareaUpload.rows = 2;
    textareaUpload.cols = 120;
    textareaUpload.spellcheck = false;
    textareaUpload.readOnly = true;

    // File Upload
    var file = document.createElement('input');
    file.setAttribute('type', 'file');
    file.onclick = function () {
        this.value = null;
    }
    file.onchange = function () {
        var reader = new FileReader();
        console.log("eeeep");
        reader.onload = function () {
            console.log("oooop");
            var binary = '';
            var buffer = reader.result;
            var bytes = new Uint8Array(buffer);
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            b64enc = window.btoa(binary);
        };
        reader.readAsArrayBuffer(this.files[0]);
        buttonMimic.disabled = false;
    }

    // MimicMic button
    var buttonMimic = document.createElement("button");
    buttonMimic.disabled = true;
    buttonMimic.textContent = "MimicMic";
    buttonMimic.onclick = function () {

        var json = {
            "audio": b64enc
        };

        var jqxhr = $.ajax({
            url: "http://" + window.location.host + "/listen/mimic_mic_input",
            data: JSON.stringify(json),
            processData: false,
            contentType: false,
            cache: false,
            type: "POST",
            success: function (data, status, jqXHR) {
                textareaUpload.value = JSON.stringify(data);
            },
            fail: function (jqXHR, textStatus, errorThrown) {
                textareaUpload.value =
                    jqXHR.status + " " + jqXHR.statusText;
            },
            always: function (msg) { },
        });
    }

    div.appendChild(header);
    div.appendChild(textareaUpload);
    div.appendChild(document.createElement("br"));
    div.appendChild(file);
    div.appendChild(buttonMimic);
}


//=============================================================================
// Record

record = function (div) {
    this.div = div;
    var b64enc;
    var label = document.createTextNode("Record file");
    var header = document.createElement("H4");
    header.appendChild(label);
    // Name - Time - Format textareas
    var nameTable = createLabelInputTxt("Name", "in_name");
    var timeTable = createLabelInputTxt("Time", "in_time");
    var formatTable = createLabelInputTxt("Format", "in_format");
    // Record button
    var buttonRecord = document.createElement("button");
    buttonRecord.textContent = "Record";
    buttonRecord.id = 'record_button'
    payload = {
        'name': 'debug',
        'format': 'pcm'
    };
    buttonRecord.onclick = function () {
        buttonRecord.disabled = true;
        payload.time = recTime;
        var jqxhr = $.ajax({
            url: "http://" + window.location.host + "/listen/start_recording",
            data: JSON.stringify(payload),
            processData: false,
            contentType: false,
            cache: false,
            type: "POST",
            success: function (data, status, jqXHR) {
                if (status === 'success') {
                    record_clicked = true;
                }
            },
            fail: function (jqXHR, textStatus, errorThrown) {
                textareaUpload.value =
                    jqXHR.status + " " + jqXHR.statusText;
            },
            always: function (msg) { },
        });

    };

    // Save button
    var buttonSave = document.createElement("button");
    buttonSave.textContent = "Save";
    buttonSave.id = 'save_button';
    buttonSave.disabled = true;
    payload = {
        'name': "debug"
    };
    buttonSave.onclick = function () {
        var file_name = getTextAreaValue('in_name') + ".pcm";
        var jqxhr = $.ajax({
            url: "http://" + window.location.host + "/listen/retrieve_recording",
            data: JSON.stringify(payload),
            processData: false,
            contentType: false,
            cache: false,
            type: "POST",
            success: function (data, status, jqXHR) {
                // Save file
                var audio = JSON.parse(data);
                var bytes = base64ToArrayBuffer(audio.audio);
                saveByteArray([bytes], file_name);
                record_clicked = false;
                resetButtonsState();
            },
            fail: function (jqXHR, textStatus, errorThrown) {

            },
            always: function (msg) { },
        });
    };

    var table = document.createElement('table');
    var r = table.insertRow(0);
    var c1 = r.insertCell(0);
    c1.appendChild(buttonRecord);
    var c2 = r.insertCell(1);
    c2.appendChild(buttonSave);
    var c3 = r.insertCell(2);
    checkBox = document.createElement('input');
    checkBox.type = 'checkbox';
    checkBox.id = 'eosCheck';
    var checkbox_label = document.createElement('label');
    checkbox_label.htmlFor = "eosCheck";
    checkbox_label.innerHTML = 'Stop REC on EoS';
    checkbox_label.style.fontSize = '12px';
    checkBox.onclick = function () {
        rec_time = document.getElementById('in_time');
        if (checkBox.checked) {
            rec_time.value = 'eos';
            rec_time.disabled = true;
        } else {
            rec_time.value = '2000';
            rec_time.disabled = false;
        }
    };
    c3.appendChild(checkbox_label);
    c3.appendChild(checkBox);

    div.appendChild(header);
    input_div = document.createElement('div');
    input_div.appendChild(nameTable);
    input_div.appendChild(timeTable);
    input_div.appendChild(formatTable);
    div.appendChild(input_div);
    div.appendChild(table);


    /**
     * Helper functions (x2) to save the data
     */
    function base64ToArrayBuffer(base64) {
        var binaryString = window.atob(base64);
        var binaryLen = binaryString.length;
        var bytes = new Uint8Array(binaryLen);
        for (var i = 0; i < binaryLen; i++) {
            var ascii = binaryString.charCodeAt(i);
            bytes[i] = ascii;
        }
        return bytes;
    }

    var saveByteArray = (function () {
        var a = document.createElement("a");
        div.appendChild(a);
        a.style = "display: none";
        return function (data, name) {
            var blob = new Blob(data, { type: "octet/stream" }),
                url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = name;
            a.click();
            window.URL.revokeObjectURL(url);
        };
    }());
}

function getBreakString() {
    return break_string + Date() + break_string;
}

function getTextAreaValue(id) {
    return document.getElementById(id).value;
}


function createLabelInputTxt(label, id) {
    var table = document.createElement('table');
    var r = table.insertRow(0);
    var c1 = r.insertCell(0);
    var aux = '<label>' + label + '</label>'
    c1.innerHTML = aux;
    var c2 = r.insertCell(1);
    if (id == 'in_time') {
        aux = '<input type="text" id="' + id + '" onchange="checkMaxTime()">';
    } else {
        aux = '<input type="text" id="' + id + '">';
    }
    c2.innerHTML = aux;
    return table
}

function checkMaxTime() {
    console.log("malaka");
    rec_time = document.getElementById('in_time');
    if (rec_time.value > 60000) {
        rec_time.value = 60000;
        alert('Maximum recording time is 60 seconds');
    }
    if (checkBox.checked) {
        recTime = 60000;
    } else {
        recTime = rec_time.value;
    }
}

function enableSaveButton(state) {
    btn = document.getElementById("save_button");
    if (statement == true) {
        setTimeout(function () {
            btn.disabled = false;
        }, 2000);
    } else {
        btn.disabled = true;
    }
}

function resetButtonsState() {
    save_btn = document.getElementById("save_button");
    record_btn = document.getElementById("record_button");
    save_btn.disabled = true;
    record_btn.disabled = false;
}

// WS callback for detecting the eos during recording.
wsRecorder.onopen = function () {
    console.log("Connected to 'Recorder'. ");
};

wsRecorder.onmessage = function (event) {
    json = JSON.parse(event.data);
    incoming_type = json.type;
    if ((incoming_type === "EOS") && (record_clicked == true)) {
        btn = document.getElementById("save_button");
        eosBox = document.getElementById('eosCheck');
        if (!eosBox.checked) {
            setTimeout(function () {
                btn.disabled = false;
            }, 2000);
        } else {
            console.log('eeeeeep');
            btn.disabled = false;
            btn.click();
        }
    }
};


function event_div(div, title, textID, checkID) {
    var labelTXT = "Clear log at turn start";
    // Header
    var div_label = document.createTextNode(title);
    var div_title = document.createElement("H4");
    div_title.appendChild(div_label);
    // textarea
    var textAreaMsg = document.createElement('textarea');
    textAreaMsg.id = textID;
    textAreaMsg.rows = 10;
    textAreaMsg.cols = 120;
    textAreaMsg.setAttribute("class", "expander");
    textAreaMsg.spellcheck = false;
    textAreaMsg.readOnly = true;
    // checkbox
    if (checkID) {
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkID;
        var checkbox_label = document.createElement('label');
        checkbox_label.htmlFor = checkID;
        checkbox_label.innerHTML = labelTXT;
        checkbox_label.style.fontSize = '12px';
        checkbox.checked = false;
    }
    // Button
    var buttonClear = document.createElement("button");
    buttonClear.textContent = "Clear";
    buttonClear.onclick = function () {
        textAreaMsg.value = '';
    };
    // Table
    var table = document.createElement('table');
    var r = table.insertRow(0);
    var c3 = r.insertCell(0);
    c3.appendChild(buttonClear);
    if (checkID) {
        var c1 = r.insertCell(1);
        c1.appendChild(checkbox);
        var c2 = r.insertCell(2);
        c2.appendChild(checkbox_label);
    }

    div.appendChild(div_title);
    div.appendChild(textAreaMsg);
    div.appendChild(table);
    div.appendChild(document.createElement("hr"));
}

//=============================================================================
// Main Function
$(document).ready(function () {
    var _this = this;

    _this.root = $("#root")[0];
    var div = document.createElement("div");
    _this.pageTitle = new pageTitle(div);
    _this.clearAllGUI = new clearAllGUI(div);
    _this.httpWatchGUI = new httpWatchGUI(div, wsHttpWatch);
    _this.jetEvents = new jetEvents(div, wsEvents);
    _this.listenLoop = new listenLoop(div, wsListenLoop);
    _this.hubINGUI = new hubINGUI(div, wsIn);
    _this.hubOUTGUI = new hubOUTGUI(div, wsOut);
    _this.clearAllGUI2 = new clearAllGUI(div);
    _this.mimicMic = new mimicMic(div);
    _this.record = new record(div);

    _this.root.appendChild(div);

    document.getElementById('in_format').value = 'pcm';
    document.getElementById('in_time').value = recTime;

});