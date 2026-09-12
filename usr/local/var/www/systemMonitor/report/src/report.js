ReportGUI = function(div) {

    var reportTable = document.getElementById("reportTable");
    reportTable.rows = 12;
    reportTable.cols = 120;
    reportTable.spellcheck = false;
    reportTable.readOnly = true;
    reportTable.disabled = true;
    reportTable.value = "";

    function genSystemInfo(data) {
        reportTable.value = reportTable.value +
            "Signing key: " + data.sysinfo[0].sysfs_public_key + "\n";
        reportTable.value = reportTable.value +
            "ODM_PRODUCTION_MODE: " + data.sysinfo[0].odm_production_mode + "\n";
        reportTable.value = reportTable.value +
            "WiFi Mac address: " + data.sysinfo[0].mac_address + "\n";
        reportTable.value = reportTable.value +
            "Board ID: " + data.sysinfo[0].board_id + "\n";
        reportTable.value = reportTable.value + 
            "Activeroot: " + data.sysinfo[0].activeroot + "\n";
        reportTable.value = reportTable.value +
            "uname -a: " + data.sysinfo[0].uname;
    }

    function genModeInfo(data) {
        reportTable.value = reportTable.value +
            "Jibo's mode: " + data.mode + "\n";
    }

    function genIdentityInfo(data) {
         reportTable.value = reportTable.value +
            "Jibo's identity: " + data.name + "\n";
         reportTable.value = reportTable.value +
            "Jibo's serial number: " + data.serial_number + "\n";
         reportTable.value = reportTable.value +
            "Jibo's cpuid: " + data.cpuid + "\n";
    }

    function genVersionInfo(data) {
        reportTable.value = reportTable.value +
            data.version + "\n";

    }

    var sysinfo_request = new XMLHttpRequest();
    var sysinfo_url = "http://"+window.location.host+"/info/system";
    sysinfo_request.open("GET", sysinfo_url, true);
    sysinfo_request.send();

    sysinfo_request.onreadystatechange = function() {
        if(sysinfo_request.readyState == 4 &&
            sysinfo_request.status == 200) {
                genSystemInfo(JSON.parse(sysinfo_request.responseText));
            }
    };

    var mode_request = new XMLHttpRequest();
    var mode_url = "http://"+window.location.hostname+":8585/mode";
    mode_request.open("GET", mode_url, true);
    mode_request.send();

    mode_request.onreadystatechange = function() {
        if(mode_request.readyState == 4 &&
            mode_request.status == 200) {
                genModeInfo(JSON.parse(mode_request.responseText));
            }
    };
    var identity_request = new XMLHttpRequest();
    var identity_url = "http://"+window.location.hostname+":8585/identity";
    identity_request.open("GET", identity_url, true);
    identity_request.send();

    identity_request.onreadystatechange = function() {
        if(identity_request.readyState == 4 &&
            identity_request.status == 200) {
                genIdentityInfo(JSON.parse(identity_request.responseText));
            }
    };

    var version_request = new XMLHttpRequest();
    var version_url = "http://"+window.location.hostname+":8585/version";
    version_request.open("GET", version_url, true);
    version_request.send();

    version_request.onreadystatechange = function() {
        if(version_request.readyState == 4 &&
            version_request.status == 200) {
                genVersionInfo(JSON.parse(version_request.responseText));
            }
    };

    root.appendChild(document.createElement("br"));
    root.appendChild(reportTable);
};

//============================================================================
// Main Function
$(document).ready(function() {

    var _this = this;

    _this.root = $("#root")[0];

    var div = document.createElement("div");
    _this.ReportGUI - new ReportGUI(div);
    _this.root.appendChild(div);
});
