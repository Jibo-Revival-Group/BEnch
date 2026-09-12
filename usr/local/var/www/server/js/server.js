// =============================================================================
// Notifications
NotificationsGUI = function(div) {
    var root = div;
    
    //=====================================
    // Heading
    var heading = document.createElement("h2");
    heading.textContent = "Notifications";
    
    //=====================================
    // Notification Listening GUI
    var buttonStartListening = document.createElement("button");
    buttonStartListening.textContent = "Start Listening";
    var buttonStopListening = document.createElement("button");
    buttonStopListening.textContent = "Stop Listening";
    
    var textareaNotifications = document.createElement("textarea");
    textareaNotifications.rows = 40;
    textareaNotifications.cols = 80;
    textareaNotifications.spellcheck = false;
    textareaNotifications.readOnly = true;
    textareaNotifications.disabled = true;
    
    var textareaStatus = document.createElement("textarea");
    textareaStatus.rows = 3;
    textareaStatus.cols = 40;
    textareaStatus.spellcheck = false;
    textareaStatus.readOnly = true;
    textareaStatus.disabled = true;
    
    var socketNotifications = null;
    var socketStatus = null;
    var connect = function() {
        socketNotifications = new WebSocket(
            "ws://" + window.location.host + "/server/notifications");
        socketNotifications.onopen = function() {
        }
        socketNotifications.onmessage = function(msg) {
            try{
                var obj = JSON.parse(msg.data);
                textareaNotifications.value = JSON.stringify(obj, null, 2);
            } catch(err){
                textareaNotifications.value = err;
            }
        }
        socketNotifications.onerror = function() { }
        socketNotifications.onclose = function() {
            setTimeout(function() { connect(); }, 1000);
        }
        
        socketStatus = new WebSocket(
            "ws://" + window.location.host + "/server/notifications/status");
        socketStatus.onopen = function() {
        }
        socketStatus.onmessage = function(msg) {
            try{
                var obj = JSON.parse(msg.data);
                textareaStatus.value = JSON.stringify(obj, null, 2);
            } catch(err){
                textareaStatus.value = err;
            }
        }
        socketStatus.onerror = function() { }
        socketStatus.onclose = function() {
            setTimeout(function() { connect(); }, 1000);
        }
    }
    var disconnect = function() {
        if (socketNotifications == null)
            return;
        socketNotifications.onclose = function() {};
        socketNotifications.close();
        socketNotifications = null;
        
        if (socketStatus == null)
            return;
        socketStatus.onclose = function() {};
        socketStatus.close();
        socketStatus = null;
    };
    
    buttonStartListening.onclick = function() {
        disconnect();
        connect();
    };
    
    buttonStopListening.onclick = function() {
        disconnect();
    };
    buttonStartListening.click();

    root.appendChild(heading);
    root.appendChild(document.createElement("br"));
    root.appendChild(buttonStartListening);
    root.appendChild(buttonStopListening);
    root.appendChild(document.createElement("br"));
    root.appendChild(textareaStatus);
    root.appendChild(document.createElement("br"));
    root.appendChild(textareaNotifications);
};

//=============================================================================
// Main Function
$(document).ready(function() {
    var root = $("#root")[0];

    var div = document.createElement("div");
    root.appendChild(div);
    var notificationsGUI = new NotificationsGUI(div);
});
