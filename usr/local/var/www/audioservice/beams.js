
// return a 6-array of the form [x1, y1, z1, x2, y2, z2] defining the bounding box of the beam search locations.
function getBeamBoundingBox(locations)
{
    var xmin   = 1e6;
    var ymin   = 1e6;
    var zmin   = 1e6;
    var xmax   = -1e6;
    var ymax   = -1e6;
    var zmax   = -1e6;
    for (var i = 0; i <  locations.length; i++) {
        l = locations[i];
        if (l[0] < xmin) { xmin = l[0]; }
        if (l[1] < ymin) { ymin = l[1]; }
        if (l[2] < zmin) { zmin = l[2]; }
        if (l[0] > xmax) { xmax = l[0]; }
        if (l[1] > ymax) { ymax = l[1]; }
        if (l[2] > zmax) { zmax = l[2]; }
    }
    return new Array(xmin, ymin, zmin, xmax, ymax, zmax);
}

function drawBox(ctx, xmin, ymin, xmax, ymax, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(xmin,ymin);
    ctx.lineTo(xmin,ymax);
    ctx.lineTo(xmax,ymax);
    ctx.lineTo(xmax,ymin);
    ctx.lineTo(xmin,ymin);
    ctx.strokeStyle=strokeStyle;
    ctx.stroke();
}

function drawBeam(ctx, x, y, r, color) {
        ctx.beginPath();
        ctx.arc(x,y,r,0,2*Math.PI);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
//        var grd = ctx.createRadialGradient(x, y, 0, x, y, r);
//        grd.addColorStop(0, "#8ed6ff");
//        grd.addColorStop(1, "#ffffff");
//        ctx.fillStyle = grd;
//        ctx.fill();
//        ctx.lineWidth = 0;
//        ctx.strokeStyle="blue";
        // ctx.stroke();
}

//
// given coord transform M(x1..x2) -> (y1..y2), return y=M(x)
function interpolate(x1, x2, y1, y2, x) {
    var m = (y2-y1)/(x2-x1);
    // y2 = m x2 + b   
    // y1 = m x1 + b
    var b = y1 - m * x1;
    var y = m * x + b;
    return y;
}

//
// convert array of mm to cm
function mmToCm(v) {
    var y = new Array();
    for (var i=0; i<v.length; i++) {
	mm = v[i];
	cm = v[i] / 10;
	cm = Math.round(cm);
	//console.log("[" + i + "]" + mm + " mm -> " + cm + "cm");
	y[i] = cm;
    }
    return y;
}

function remapBeam(location, beams_space_bounding_box, canvas, border, confidence) {
    // alert("location = " + location.join(", ") + ", bounding box = " + beams_space_bounding_box.join(","));
    beam_x = location[0];
    beam_y = location[1];
    
    beam_min_x = beams_space_bounding_box[0];
    beam_min_y = beams_space_bounding_box[1];
    beam_max_x = beams_space_bounding_box[3];
    beam_max_y = beams_space_bounding_box[4];
    canvas_x = interpolate(beam_min_x, beam_max_x, border, canvas.width-border , beam_x);
    canvas_y = interpolate(beam_min_y, beam_max_y, border, canvas.height-border, beam_y);
    canvas_x = canvas.width-canvas_x;
    // convert confidence (from 0-32767) to a radius (3px to  10% of min of width/height)
    confidence -= 51;
    if (confidence <= 0) { confidence = 1; };
    var r = Math.log(confidence);
    var r1 = Math.log(1.);
    var r2 = Math.log(32767.);
    var cr1 = 0;
    var min_w_or_h = (canvas.width < canvas.height)?canvas.width : canvas.height;
    var cr2 = (1.0 * min_w_or_h - 2*border) * 0.1;
    var radius = interpolate(r1, r2, cr1, cr2, r);
    if (radius < 3) { radius = 3;  }
    return [canvas_x, canvas_y, radius];
}

function drawBeamI(i, locations, confidences, color, ctx, canvas) {
    var l = remapBeam(locations[i], window._beam_bounding_box_, canvas, 20, confidences[i]);
    var x = l[0];
    var y = l[1];
    var r = l[2];
    drawBeam(ctx, x, y, r, color);
}

/*function drawBeamSubband(i, locations, confidences, color, ctx, canvas) {
    var l = remapBeam(locations[i], window._beam_bounding_box_, canvas, 20, confidences[i]);
    var x = l[0] + 50;
    var y = l[1];
    var r = l[2];
    drawBeam(ctx, x, y, r, color);
}*/

function drawMicrophones(beam_bounding_box, mic_locations_cm, canvas, ctx) {
    var mic_bounding_box = new Array();
    mic_bounding_box = getBeamBoundingBox(mic_locations_cm);
    //console.log("mic bounding box min (x,y)= "+mic_bounding_box[0]+","+mic_bounding_box[1]);
    //console.log("mic bounding box max (x,y)= "+mic_bounding_box[3]+","+mic_bounding_box[4]);
    
    var canvas_min_x;
    var canvas_min_y;
    var canvas_max_x;
    var canvas_max_x;
    var border = 20;
    
    var outer_pad = 5;
    canvas_min_x = interpolate(beam_bounding_box[0], beam_bounding_box[3], border, canvas.width-border, mic_bounding_box[0]-outer_pad);
    canvas_max_x = interpolate(beam_bounding_box[0], beam_bounding_box[3], border, canvas.width-border, mic_bounding_box[3]+outer_pad);
    canvas_min_y = interpolate(beam_bounding_box[1], beam_bounding_box[4], border, canvas.height-border, mic_bounding_box[1]-outer_pad);
    canvas_max_y = interpolate(beam_bounding_box[1], beam_bounding_box[4], border, canvas.height-border, mic_bounding_box[4]+outer_pad);
    drawBox(ctx, canvas_min_x, canvas_min_y, canvas_max_x, canvas_max_y,"gray");

    outer_pad = 0;
    canvas_min_x = interpolate(beam_bounding_box[0], beam_bounding_box[3], border, canvas.width-border, mic_bounding_box[0]-outer_pad);
    canvas_max_x = interpolate(beam_bounding_box[0], beam_bounding_box[3], border, canvas.width-border, mic_bounding_box[3]+outer_pad);
    canvas_min_y = interpolate(beam_bounding_box[1], beam_bounding_box[4], border, canvas.height-border, mic_bounding_box[1]-outer_pad);
    canvas_max_y = interpolate(beam_bounding_box[1], beam_bounding_box[4], border, canvas.height-border, mic_bounding_box[4]+outer_pad);
    drawBox(ctx, canvas_min_x, canvas_min_y, canvas_max_x, canvas_max_y,"gray");
}

function getVariables(var_list, user_callback) {
    var url = "/diag?" + var_list.join("&");
    $.ajax({
        type: "GET",
        url: url,
        dataType: "json",
        success: function(data) {
            //console.log("got", data);
            var subdata = {};
            $.each(data.diags, function(_, d) {
                subdata[d.name] = d.value;
            });
            user_callback(subdata);
        },
        error: function(xhr, status, error) {
            console.log("ERROR " + status + " " + error);
        }
    });
}

var worldWinner = [];

function setWorldWinner(winner) {
    worldWinner = winner;
}

var hotphraseWinner = [];

function setHotphraseWinner(winner) {
    hotphraseWinner = winner;
}

function drawDisplay() {
    // This function grabs the num microphones, grabs the microphone confidences, and winner, then paints them all on the canvas.
    var variables = new Array("fdsearch_best_beam_index", "fdsearch_confidence_state");
    getVariables(variables, function (data)  {
        var txt = document.getElementById("activeBeam");
        
        var c=document.getElementById("myCanvas");
        c.width = c.width; // this clears the canvas... 
        var ctx=c.getContext("2d");
        var confidences = data["fdsearch_confidence_state"];
        var winner      = data["fdsearch_best_beam_index"][0];
        var num_beams    = window._num_beams_;
        var locations   = window._beam_locations_;


        //txt.innerHTML = "Winning Beam=" +winner + ", conf = " + confidences[winner];// + ", [" + confidences.join(",") + "]";
	drawMicrophones(window._beam_bounding_box_, window._mic_locations_cm_, c, ctx);
        for (var i = 0; i < num_beams; i++) {
            var isWorldWinner = false;
            for (var j=0; j < worldWinner.length; ++j) {
                if (worldWinner[j] == i) {
                    isWorldWinner = true;
                }
            }
            var isHotphraseWinner = false;
            for (var j=0; j< hotphraseWinner.length; ++j) {
                if (hotphraseWinner[j] == i) {
                    isHotphraseWinner = true;
                }
            }
            if (winner != i && !isWorldWinner && !isHotphraseWinner) {
                drawBeamI(i, locations, confidences, "#000000", ctx, c);
                //drawBeamSubband(i, locations, confidences, "#000000", ctx, c);
            }
        }
        drawBeamI(winner, locations, confidences, "#FF0000", ctx, c);
        for (var i=0; i<worldWinner.length; ++i) {
            drawBeamI(worldWinner[i], locations, confidences, "#0000FF", ctx, c);
        }
        for (var i=0; i<hotphraseWinner.length; ++i) {
            drawBeamI(hotphraseWinner[i], locations, confidences, "#00FF00", ctx, c);
        }
        //drawBeamSubband(winner, locations, confidences, "#FF0000", ctx, c);


        setTimeout(drawDisplay, 50);// draw the microphones every 100ms
    });
}

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

function getInitialData() {
    getVariables(new Array("mmfx_num_microphones", "fdsearch_num_beams_to_search"), function(data) {
        var num_mics  = data["mmfx_num_microphones"][0];
        window._num_mics_ = num_mics;
        var num_beams  = data["fdsearch_num_beams_to_search"][0];
        window._num_beams_ = num_beams;
	
	//
	// get mic locations (x,y,z) in mm
	getVariables(new Array("mmfx_microphone_locations_mm"), function(data) {
	    var mic_locations_mm = new Array();
	    var mic_locations_cm = new Array();
	    window._mic_locations_cm_ = new Array();

	    for (var i=0; i < window._num_mics_; i++) {
		//console.log("(x,y,z) = " + data["mmfx_microphone_locations_mm"][6*i] +","+ data["mmfx_microphone_locations_mm"][6*i + 1] +","+ data["mmfx_microphone_locations_mm"][6*i + 2]);
		mic_locations_mm[i] = Array(data["mmfx_microphone_locations_mm"][6*i],data["mmfx_microphone_locations_mm"][6*i + 1],data["mmfx_microphone_locations_mm"][6*i + 2]);

		window._mic_locations_cm_[i] = mmToCm(mic_locations_mm[i]);
	    }

	});
		     
        var beam_loc_vars = new Array();
        for (var i = 0; i < num_beams; i++) {
	    beam_loc_vars.push("fdsearch_beam_xyz_" + zeroPad(i,3));
        }
        getVariables(beam_loc_vars, function (data) {
            window._beam_locations_ = new Array();
            for (var i = 0 ; i < window._num_beams_; i++) {
                window._beam_locations_[i] = data["fdsearch_beam_xyz_" + zeroPad(i,3)];
            }
            window._beam_bounding_box_ = getBeamBoundingBox(window._beam_locations_);
	    //console.log("beam bounding box min (x,y)= "+window._beam_bounding_box_[0]+","+window._beam_bounding_box_[1]);
	    //console.log("beam bounding box max (x,y)= "+window._beam_bounding_box_[3]+","+window._beam_bounding_box_[4]);
            setTimeout(drawDisplay, 100);// draw the microphones every 100ms
        });
    });
}

window.onload = function() 
{
    getInitialData();
}
