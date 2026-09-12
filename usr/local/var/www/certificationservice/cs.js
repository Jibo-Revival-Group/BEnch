function turn_on() {
    console.log("TURN ON");
    $("#on")[0].disabled = true;
    $.ajax({
        type: "POST",
        url: "/calibrator/on",
        dataType: "json",
        success: function(data) {
            console.log("Got", data);
            update_state();
        },
        error: function(xhr, status, error) {
            console.log("ERROR", status, error);
            alert("Error: " + error);
            update_state();
        }
    });
}

function turn_off() {
    console.log("TURN OFF");
    $("#off")[0].disabled = true;
    $("#configure")[0].disabled = true;
    $.ajax({
        type: "POST",
        url: "/calibrator/off",
        dataType: "json",
        success: function(data) {
            console.log("Got", data);
            update_state();
        },
        error: function(xhr, status, error) {
            console.log("ERROR", status, error);
            alert("Error: " + error);
            update_state();
        }
    });
}


function to_milli(dbm) {
    var dbm_step = 0.125;
    return 1000 * Math.floor(dbm/dbm_step) * dbm_step;
}

function to_dbm(milli) {
    return 0.001 * milli;
}

function submit_config() {
    var cfg = {
        channel: parseInt(widgets.channel.value),
        band: parseInt(widgets.band.value),
        bandwidth: parseInt(widgets.bandwidth.value),
        power: to_milli(parseFloat(widgets.power.value)),
        antenna: parseInt(widgets.antenna.value),
        serving: parseInt(widgets.serving.value),
        channel_limit: widgets.channel_limit.value == "true",
        gain_calculate: parseInt(widgets.gain_calculate.value),
        packet_delay: parseInt(widgets.packet_delay.value),
        tx_rate: parseInt(widgets.tx_rate.value),
        data_field_size: parseInt(widgets.data_field_size.value),
        num_packets: parseInt(widgets.num_packets.value),
        guard_interval: parseInt(widgets.guard_interval.value),
        diversity_5g: parseInt(widgets.diversity_5g.value)
    };
    $("#configure")[0].disabled = true;
    console.log("SUBMIT", cfg);
    $.ajax({
        type: "POST",
        url: "/calibrator/configure",
        dataType: "json",
        data: JSON.stringify(cfg),
        success: function(data) {
            console.log("Got", data);
            update_config(data);
            $("#configure")[0].disabled = false;
        },
        error: function(xhr, status, error) {
            console.log("ERROR", status, error);
            alert("Error: " + error);
            update_state();
        }
    });
}

function update_config(config) {
    console.log("update config", config);
    widgets.channel.value = config.channel;
    widgets.band.value = config.band;
    widgets.bandwidth.value = config.bandwidth;
    widgets.power.value = to_dbm(config.power);
    widgets.antenna.value = config.antenna;
    widgets.serving.value = config.serving;
    widgets.channel_limit.value = config.channel_limit;
    widgets.gain_calculate.value = config.gain_calculate;
    widgets.packet_delay.value = config.packet_delay;
    widgets.tx_rate.value = config.tx_rate;
    widgets.data_field_size.value = config.data_field_size;
    widgets.num_packets.value = config.num_packets;
    widgets.guard_interval.value = config.guard_interval;
    widgets.diversity_5g.value = config.diversity_5g;
}

function update_state() {
    console.log("update state");
    $.ajax({
        type: "GET",
        url: "/calibrator",
        dataType: "json",
        success: function(data) {
            $("#on")[0].disabled = data.on;
            $("#off")[0].disabled = !data.on;
            $("#configure")[0].disabled = !data.on;
            for (var key in widgets) {
                widgets[key].disabled = !data.on;
            }
            if (data.configured) {
                update_config(data.config);
            }
        },
        error: function(xhr, status, error) {
            console.log("ERROR", status, error);
        }
    });
}

function setup_debug_websocket() {
    var host = window.location.host;
    var socket = new WebSocket("ws://"+host+"/debug");
    socket.onopen = function() {
        console.log("Debug websocket opened!");
    }
    socket.onmessage = function(msg) {
        console.log("Debug websocket:", msg);
        var tarea = $("#debugWS");
        var txt = tarea.val();
        txt += msg.data;
        tarea.val(txt);
        var bottom = tarea.prop("scrollHeight") - tarea.height();
        tarea.prop("scrollTop", bottom);
    }
    socket.onclose = function() {
        console.log("Debug websocket closed!");
        setTimeout(setup_debug_websocket, 1000);
    }
}

var widgets = {};

function main() {
    console.log("DO THE THINGS!");

    widgets.channel = $("#channel")[0];
    widgets.band = $("#band")[0];
    widgets.bandwidth = $("#bandwidth")[0];
    widgets.power = $("#power")[0];
    widgets.antenna = $("#antenna")[0];
    widgets.serving = $("#serving")[0];
    widgets.channel_limit = $("#channel_limit")[0];
    widgets.gain_calculate = $("#gain_calculate")[0];
    widgets.packet_delay = $("#packet_delay")[0];
    widgets.tx_rate = $("#tx_rate")[0];
    widgets.data_field_size = $("#data_field_size")[0];
    widgets.num_packets = $("#num_packets")[0];
    widgets.guard_interval = $("#guard_interval")[0];
    widgets.diversity_5g = $("#diversity_5g")[0];

    var on_btn = $("#on");
    on_btn.on("click", turn_on);

    var off_btn = $("#off");
    off_btn.on("click", turn_off);

    var cfg_btn = $("#configure");
    cfg_btn.on("click", submit_config);

    update_state();

    setup_debug_websocket();
}

$(document).ready(main);
