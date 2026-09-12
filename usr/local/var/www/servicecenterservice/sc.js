function go() {
    var selected = $("#test_select")[0].value;
    var operation = $("#op_select")[0].value;
    $.ajax({
        type: operation,
        url: selected,
        dataType: "json",
        data: $("#input_txt")[0].value,
        success: function(data) {
            console.log("Got", data);
            $("#results_txt")[0].value = JSON.stringify(data, null, 2);
            // XXX special case for camera test
            if (selected == "/test/camera" && operation == "POST") {
                $("#results_img")[0].src = "/test/camera?id=" + data.id;
            }
        },
        error: function(xhr, status, error) {
            console.log("ERROR", status, error);
            alert("Error: " + error);
        }
    });
}

function main() {
    console.log("DO THE THINGS!");

    var go_btn = $("#go");
    go_btn.on("click", go);
}

$(document).ready(main);
