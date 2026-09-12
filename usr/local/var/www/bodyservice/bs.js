var bs = (function($){

    function timeFromTs(ts) {
        return ts[0] + ts[1]/1000000;
    }

    function BodyState() {
        this.axisState = [];
        this.imuState = [];
        this.touchState = [];
        this.powerState = [];
        this.miscState = [];
        this.initIndexCountState = [];
        this.storedInitIndexCount = false;
        this.maxHistory = 500;
    }

    BodyState.prototype = {
        constructor: BodyState,
        appendInitIndexCount: function(state){
            if(!this.storedInitIndexCount){
                this.initIndexCountState.push(state);
                this.storedInitIndexCount = true;
            }
        },
        appendAxisState: function(state) {
            this.axisState.push(state);
            if (this.axisState.length > this.maxHistory) {
                this.axisState.shift();
            }
        },
        appendImuState: function(state) {
            this.imuState.push(state);
            if (this.imuState.length > this.maxHistory) {
                this.imuState.shift();
            }
        },
        appendTouchState: function(state) {
            this.touchState.push(state);
            if (this.touchState.length > this.maxHistory) {
                this.touchState.shift();
            }
        },
        appendPowerState: function(state) {
            this.powerState.push(state);
            if (this.powerState.length > this.maxHistory) {
                this.powerState.shift();
            }
        },
        appendMiscState: function(state) {
            this.miscState.push(state);
            if (this.miscState.length > this.maxHistory) {
                this.miscState.shift();
            }
        },
        getInitIndexCount: function() {
            if(this.axisState.length == 0) return null;
            return this.initIndexCountState;
        },
        getAxisState: function() {
            if (this.axisState.length === 0) return null;
            return this.axisState[this.axisState.length-1];
        },
        getImuState: function() {
            if (this.imuState.length === 0) return null;
            return this.imuState[this.imuState.length-1];
        },
        getTouchState: function() {
            if (this.touchState.length === 0) return null;
            return this.touchState[this.touchState.length-1];
        },
        getPowerState: function() {
            if (this.powerState.length === 0) return null;
            return this.powerState[this.powerState.length-1];
        },
        getMiscState: function() {
            if (this.miscState.length === 0) return null;
            return this.miscState[this.miscState.length-1];
        },
        getAxisData: function() {
            return this.axisState;
        },
        getPelvisData: function() {
            var data = [];
            for (var i=0; i<this.axisState.length; i++) {
                data.push(this.axisState[i].pelvis);
            }
            return data;
        },
        getTorsoData: function() {
            var data = [];
            for (var i=0; i<this.axisState.length; i++) {
                data.push(this.axisState[i].torso);
            }
            return data;
        },
        getNeckData: function() {
            var data = [];
            for (var i=0; i<this.axisState.length; i++) {
                data.push(this.axisState[i].neck);
            }
            return data;
        }
    };

    function PlotAxis(name, dataFunc) {
        this.show = false;
        this.name = name;
        this.dataFunc = dataFunc;
        this.normalize = false;
        this.data = [];
    };

    PlotAxis.prototype = {
        constructor: PlotAxis,
        updateData: function() {
            this.data = this.dataFunc();
        },
        plotData: function() {
            var data = [];
            if (this.normalize) {
                var max = 1;
                $.each(this.data, function(_, d) {
                    var ad = Math.abs(d[1]);
                    if (ad > max) {
                        max = ad;
                    }
                });

                $.each(this.data, function(_, d) {
                    data.push([d[0], d[1]/max]);
                });
            } else {
                data = this.data;
            }
            return {
                label: this.name,
                data: data
            };
        }
    };

    function AxisPlot(attachId, axes) {
        this.plot = $.plot(attachId, [], {
            series: {
                shadowSize: 0
            },
            yaxis: {
                min: -5,
                max: 5,
                zoomRange: [0.01, 65536]
            },
            pan: {
                interactive: true
            },
            zoom: {
                interactive: true
            }
        });

        this.paused = true;
        this.normalized = false;

        this.period = 33; /* ms */

        this.axes = axes;

        this.showPos = false;
        this.showVel = false;
        this.showAcc = false;
        this.showCur = false;
        this.showPwm = false;
        this.showVelLimit = false;
        this.showAccLimit = false;
        this.showCurLimit = false;
        this.showRef = false;
        this.showTicks = false;
    }

    AxisPlot.prototype = {
        constructor: AxisPlot,
        draw: function() {
            this.setAxisData(!this.paused);
            if (!this.paused) {
                // clear out pan/zoom imposed limits
                var opts = this.plot.getAxes().xaxis.options;
                opts.min = null;
                opts.max = null;
            }
            this.plot.setupGrid();
            this.plot.draw();
            setTimeout(function() { this.draw(); }.bind(this), this.period);
        },
        pause: function() {
            this.paused = !this.paused;
            if (!this.paused) { 
                this.draw();
            }
            return this.paused;
        },
        normalize: function() {
            this.normalized = !this.normalized;
            for (var i=0; i<this.axes.length; i++) {
                this.axes[i].normalize = this.normalized;
            }
            if (this.normalized) {
                var opts = this.plot.getAxes().yaxis.options;
                opts.min = -1;
                opts.max = 1;
            }
            return this.normalized;
        },
        setAxisData: function(update) {
            var data = [];
            $.each(this.axes, function(_, axis) {
                if (update) {
                    axis.updateData();
                }
                if (axis.show) {
                    data.push(axis.plotData());
                }
            });
            this.plot.setData(data);
        }
    };

    function PauseResumeButton(attachId, plot) {
        this.plot = plot;
        this.button = $("<button>", {text: "Resume"}); 
        this.button.click(function() {
            if (this.plot.pause()) {
                this.button.text("Resume");
            } else {
                this.button.text("Pause");
            }
        }.bind(this));
        $(attachId).append(this.button);
    };

    function NormalizeButton(attachId, plot) {
        this.plot = plot;
        this.button = $("<button>", {text: "Normalize"}); 
        this.button.click(function() {
            if (this.plot.normalize()) {
                this.button.text("Denormalize");
            } else {
                this.button.text("Normalize");
            }
        }.bind(this));
        $(attachId).append(this.button);
    }

    function AxisToggle(attachId, axis) {
        this.axis = axis;
        var id = axis.name + "Box";
        var label = axis.name + ":";
        this.toggle = $("<input>", {type: "checkbox", id: id});
        this.label = $("<label>", {for: id, text: label});
        $(attachId).append(this.label, this.toggle);
        this.toggle.click(function() {
            this.axis.show = this.toggle.prop("checked");
        }.bind(this));
    };

    function AxisSelector(attachId, axisSet) {
        this.axisSet = axisSet;
        this.selected = 0;
        this.selector = $("<select>", {value: this.selected});
        for (var i=0; i<this.axisSet.length; i++) {
            var set = this.axisSet[i];
            this.selector.append($("<option>", {value: i, text: set.name}));
        }
        this.selector.change(function() {
            this.selected = $(this).val();
        });
    };

    AxisSelector.prototype = {
        constructor: AxisSelector,
        get: function() {
            return this.axisSet[this.selected];
        }
    };

    return {
        BodyState: BodyState,
        timeFromTs: timeFromTs,
        PlotAxis: PlotAxis,
        AxisPlot: AxisPlot,
        PauseResumeButton: PauseResumeButton,
        NormalizeButton: NormalizeButton,
        AxisToggle: AxisToggle,
        AxisSelector: AxisSelector,
    };
})(jQuery);

var state = new bs.BodyState();

function makeAxisPlot() {

    function getAxisData() {
        var val = $("#axisSelect").prop("value");
        if (val == "pelvis") {
            return state.getPelvisData();
        } else if (val == "torso") {
            return state.getTorsoData();
        } else if (val == "neck") {
            return state.getNeckData();
        } else {
            console.log("Unexpected axis select value", val);
            return [];
        }
    };

    var posAxis = new bs.PlotAxis("pos", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.pos]);
        });
        return out;
    });

    var incPosAxis = new bs.PlotAxis("inc_pos", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.inc_pos]);
        });
        return out;
    });

    var velAxis = new bs.PlotAxis("vel", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.vel]);
        });
        return out;
    });

    var curAxis = new bs.PlotAxis("cur", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.cur]);
        });
        return out;
    });

    var pwmAxis = new bs.PlotAxis("pwm", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.pwm]);
        });
        return out;
    });

    var vlimAxis = new bs.PlotAxis("vel_limit", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.vel_limit]);
        });
        return out;
    });

    var alimAxis = new bs.PlotAxis("acc_limit", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.acc_limit]);
        });
        return out;
    });

    var climAxis = new bs.PlotAxis("cur_limit", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.cur_limit]);
        });
        return out;
    });

    var refAxis = new bs.PlotAxis("ref", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.ref]);
        });
        return out;
    });

    var refPosAxis = new bs.PlotAxis("ref_pos", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.ref_pos]);
        });
        return out;
    });

    var refAccAxis = new bs.PlotAxis("ref_acc", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.ref_acc]);
        });
        return out;
    });

    var tickAxis = new bs.PlotAxis("ticks", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.ticks]);
        });
        return out;
    });

    var intAxis = new bs.PlotAxis("integrator", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.integrator]);
        });
        return out;
    });

    var limAxis = new bs.PlotAxis("limiter_mode", function() {
        var data = getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.limiter_mode]);
        });
        return out;
    });

    var trqAxis = new bs.PlotAxis("limiter_torque", function() {
        var data = state.getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.limiter_torque]);
        });
        return out;
    });

    var atrqAxis = new bs.PlotAxis("limiter_lookahead_torque", function() {
        var data = state.getAxisData();
        var out = [];
        $.each(data, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.limiter_lookahead_torque]);
        });
        return out;
    });

    var axes = [
        posAxis,
        incPosAxis,
        velAxis,
        curAxis,
        pwmAxis,
        vlimAxis,
        alimAxis,
        climAxis,
        refAxis,
        refPosAxis,
        refAccAxis,
        tickAxis,
        intAxis,
        limAxis,
        trqAxis,
        atrqAxis
    ];

    var plot = new bs.AxisPlot("#axisplot", axes);

    var pauseBtn = new bs.PauseResumeButton("#axisControls", plot);
    var normBtn = new bs.NormalizeButton("#axisControls", plot);

    $.each(axes, function(_, axis) {
        var toggle = new bs.AxisToggle("#axisControls", axis);
    });

    plot.draw();
}

function makeImuPlot() {
    var accXAxis = new bs.PlotAxis("acc x", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.acc[0]]);
        });
        return out;
    });

    var accYAxis = new bs.PlotAxis("acc y", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.acc[1]]);
        });
        return out;
    });

    var accZAxis = new bs.PlotAxis("acc z", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.acc[2]]);
        });
        return out;
    });

    var gyroXAxis = new bs.PlotAxis("gyro x", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.gyro[0]]);
        });
        return out;
    });

    var gyroYAxis = new bs.PlotAxis("gyro y", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.gyro[1]]);
        });
        return out;
    });

    var gyroZAxis = new bs.PlotAxis("gyro z", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.gyro[2]]);
        });
        return out;
    });

    var upXAxis = new bs.PlotAxis("up x", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.up[0]]);
        });
        return out;
    });

    var upYAxis = new bs.PlotAxis("up y", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.up[1]]);
        });
        return out;
    });

    var upZAxis = new bs.PlotAxis("up z", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.up[2]]);
        });
        return out;
    });

    var movingAxis = new bs.PlotAxis("moving", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            var val = 0;
            if (d.moving) {
                val = 1;
            }
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var raw_accXAxis = new bs.PlotAxis("raw_acc x", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.raw_acc[0]]);
        });
        return out;
    });

    var raw_accYAxis = new bs.PlotAxis("raw_acc y", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.raw_acc[1]]);
        });
        return out;
    });

    var raw_accZAxis = new bs.PlotAxis("raw_acc z", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.raw_acc[2]]);
        });
        return out;
    });

    var raw_gyroXAxis = new bs.PlotAxis("raw_gyro x", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.raw_gyro[0]]);
        });
        return out;
    });

    var raw_gyroYAxis = new bs.PlotAxis("raw_gyro y", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.raw_gyro[1]]);
        });
        return out;
    });

    var raw_gyroZAxis = new bs.PlotAxis("raw_gyro z", function() {
        var out = [];
        $.each(state.imuState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.raw_gyro[2]]);
        });
        return out;
    });

    var axes = [
        accXAxis,
        accYAxis,
        accZAxis,
        gyroXAxis,
        gyroYAxis,
        gyroZAxis,
        upXAxis,
        upYAxis,
        upZAxis,
        movingAxis,
        raw_accXAxis,
        raw_accYAxis,
        raw_accZAxis,
        raw_gyroXAxis,
        raw_gyroYAxis,
        raw_gyroZAxis,
    ];

    var plot = new bs.AxisPlot("#imuplot", axes);

    var pauseBtn = new bs.PauseResumeButton("#imuControls", plot);
    $.each(axes, function(_, axis) {
        var toggle = new bs.AxisToggle("#imuControls", axis);
    });

    plot.draw();
}

function makeTouchPlot() {
    var touchedAxis = new bs.PlotAxis("touched", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = 0;
            if (d.touched) {
                val = 1;
            }
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var pad0Axis = new bs.PlotAxis("pad 0", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = 0;
            if (d.pad_state[0]) {
                val = 1;
            }
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var pad1Axis = new bs.PlotAxis("pad 1", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = 0;
            if (d.pad_state[1]) {
                val = 1;
            }
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var pad2Axis = new bs.PlotAxis("pad 2", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = 0;
            if (d.pad_state[2]) {
                val = 1;
            }
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var pad3Axis = new bs.PlotAxis("pad 3", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = 0;
            if (d.pad_state[3]) {
                val = 1;
            }
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var pad4Axis = new bs.PlotAxis("pad 4", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = 0;
            if (d.pad_state[4]) {
                val = 1;
            }
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var pad5Axis = new bs.PlotAxis("pad 5", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = 0;
            if (d.pad_state[5]) {
                val = 1;
            }
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var raw0Axis = new bs.PlotAxis("raw 0", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = d.raw_count[0];
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var raw1Axis = new bs.PlotAxis("raw 1", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = d.raw_count[1];
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var raw2Axis = new bs.PlotAxis("raw 2", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = d.raw_count[2];
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var raw3Axis = new bs.PlotAxis("raw 3", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = d.raw_count[3];
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var raw4Axis = new bs.PlotAxis("raw 4", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = d.raw_count[4];
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var raw5Axis = new bs.PlotAxis("raw 5", function() {
        var out = [];
        $.each(state.touchState, function(_, d) {
            var val = d.raw_count[5];
            out.push([bs.timeFromTs(d.ts), val]);
        });
        return out;
    });

    var axes = [
        touchedAxis,
        pad0Axis,
        pad1Axis,
        pad2Axis,
        pad3Axis,
        pad4Axis,
        pad5Axis,
        raw0Axis,
        raw1Axis,
        raw2Axis,
        raw3Axis,
        raw4Axis,
        raw5Axis
    ];

    var plot = new bs.AxisPlot("#touchplot", axes);
    plot.period = 100;

    var pauseBtn = new bs.PauseResumeButton("#touchControls", plot);
    $.each(axes, function(_, axis) {
        var toggle = new bs.AxisToggle("#touchControls", axis);
    });

    plot.draw();
}

function makePowerPlot() {
    var vsysAxis = new bs.PlotAxis("vsys", function() {
        var out = [];
        $.each(state.powerState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.vsys]);
        });
        return out;
    });

    var capAxis = new bs.PlotAxis("capacity", function() {
        var out = [];
        $.each(state.powerState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.battery.capacity]);
        });
        return out;
    });

    var mcapAxis = new bs.PlotAxis("max_capacity", function() {
        var out = [];
        $.each(state.powerState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.battery.max_capacity]);
        });
        return out;
    });

    var tempAxis = new bs.PlotAxis("temp", function() {
        var out = [];
        $.each(state.powerState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.battery.temp]);
        });
        return out;
    });
    
    var chgAxis = new bs.PlotAxis("charge_rate", function() {
        var out = [];
        $.each(state.powerState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.battery.charge_rate]);
        });
        return out;
    });

    var axes = [
        vsysAxis,
        capAxis,
        mcapAxis,
        tempAxis,
        chgAxis
    ];

    var plot = new bs.AxisPlot("#powerplot", axes);
    plot.period = 1000;

    var pauseBtn = new bs.PauseResumeButton("#powerControls", plot);
    $.each(axes, function(_, axis) {
        var toggle = new bs.AxisToggle("#powerControls", axis);
    });

    plot.draw();
}

function makeMiscPlot() {
    var mTempAxis = new bs.PlotAxis("main_board_temp", function() {
        var out = [];
        $.each(state.miscState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.main_board_temp]);
        });
        return out;
    });

    var cTempAxis = new bs.PlotAxis("cpu_temp", function() {
        var out = [];
        $.each(state.miscState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.cpu_temp]);
        });
        return out;
    });

    var iTempAxis = new bs.PlotAxis("intake_temp", function() {
        var out = [];
        $.each(state.miscState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.intake_temp]);
        });
        return out;
    });

    var eTempAxis = new bs.PlotAxis("exhaust_temp", function() {
        var out = [];
        $.each(state.miscState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.exhaust_temp]);
        });
        return out;
    });

    var nTempAxis = new bs.PlotAxis("neck_motor_temp", function() {
        var out = [];
        $.each(state.miscState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.neck_motor_temp]);
        });
        return out;
    });

    var tTempAxis = new bs.PlotAxis("torso_motor_temp", function() {
        var out = [];
        $.each(state.miscState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.torso_motor_temp]);
        });
        return out;
    });

    var pTempAxis = new bs.PlotAxis("pelvis_motor_temp", function() {
        var out = [];
        $.each(state.miscState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.pelvis_motor_temp]);
        });
        return out;
    });

    var hatchAxis = new bs.PlotAxis("hatch_open", function() {
        var out = [];
        $.each(state.miscState, function(_, d) {
            out.push([bs.timeFromTs(d.ts), d.hatch_open]);
        });
        return out;
    });

    var axes = [
        mTempAxis,
        cTempAxis,
        iTempAxis,
        eTempAxis,
        nTempAxis,
        tTempAxis,
        pTempAxis,
        hatchAxis
    ];

    var plot = new bs.AxisPlot("#miscplot", axes);
    plot.period = 1000;

    var pauseBtn = new bs.PauseResumeButton("#miscControls", plot);
    $.each(axes, function(_, axis) {
        var toggle = new bs.AxisToggle("#miscControls", axis);
    });

    plot.draw();
}

function connectState() {
    var host = window.location.host;
    var socket = new WebSocket("ws://"+host+"/axis_state");
    socket.onopen = function() {
        console.log("Axis state socket open!");
    };
    socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        state.appendAxisState(data);
        var init_index_count = [data.neck.index_count,
                                data.torso.index_count,
                                data.pelvis.index_count];
        state.appendInitIndexCount(init_index_count);
        $("#axisState").val(JSON.stringify(data, null, 4));
        updateAxisStatus();
    };
    socket.onclose = function() {
        console.log("Axis state socket close!");
        setTimeout(function() { connectState(); }, 3000);
    };
}

function connectCmd() {
    function makeCmdSocket() {
        var host = window.location.host;
        var socket = new WebSocket("ws://"+host+"/axis_command");
        socket.onopen = function() {
            console.log("Axis command socket open!");
        };
        socket.onmessage = function(msg) {
            console.log("Got command message: " + msg.data);
        };
        socket.onclose = function() {
            console.log("Axis command socket close!");
            //setTimeout(function() { connectCmd(); }, 3000);
        };
        return socket;
    };

    var socket = makeCmdSocket();

    function buildCmd() {
        var astate = state.getAxisState();
        if (astate === null) {
            return;
        }

        var vpelvis = {
            mode : lastpmode,
            value : lastp,
            vel_limit : 10,
            acc_limit : parseFloat($("#pelvisAcc").val()),
            cur_limit : astate.pelvis.cur_limit
        };
        var vtorso = {
            mode : lasttmode,
            value : lastt,
            vel_limit : 10,
            acc_limit : parseFloat($("#torsoAcc").val()),
            cur_limit : astate.torso.cur_limit
        };
        var vneck = {
            mode : lastnmode,
            value : lastn,
            vel_limit : 10,
            acc_limit : parseFloat($("#neckAcc").val()),
            cur_limit : astate.neck.cur_limit
        };
        var data = {
            ts : [astate.ts[0], astate.ts[1]],
            pelvis : vpelvis,
            torso : vtorso,
            neck : vneck
        };
        return JSON.stringify(data);
    }

    function buildSinCmd() {
        var astate = state.getAxisState();
        if (astate === null) {
            return;
        }

        var period = parseFloat($("#patPeriod").val());
        if (isNaN(period)) {
            period = 1;
        }

        var pv = lastp[0];
        var tv = lastt[0];
        var nv = lastn[0];
        var t = new Date().getTime()/1000;
        var s = Math.sin(t/period * Math.PI * 2);
        var psin = pv * s;
        var tsin = tv * s;
        var nsin = nv * s;
        //console.log("buildSinCmd: " + psin + ", " + tsin + ", " + nsin);

        var vpelvis = {
            mode : 4,
            value : [psin],
            vel_limit : astate.pelvis.vel_limit,
            acc_limit : Math.min(parseFloat($("#pelvisAcc").val()), astate.pelvis.acc_limit),
            cur_limit : astate.pelvis.cur_limit
        };
        var vtorso = {
            mode : 4,
            value : [tsin],
            vel_limit : astate.torso.vel_limit,
            acc_limit : Math.min(parseFloat($("#torsoAcc").val()), astate.torso.acc_limit),
            cur_limit : astate.torso.cur_limit
        };
        var vneck = {
            mode : 4,
            value : [nsin],
            vel_limit : astate.neck.vel_limit,
            acc_limit : Math.min(parseFloat($("#neckAcc").val()), astate.neck.acc_limit),
            cur_limit : astate.neck.cur_limit
        };
        var data = {
            ts : [astate.ts[0], astate.ts[1]],
            pelvis : vpelvis,
            torso : vtorso,
            neck : vneck
        };
        return JSON.stringify(data);
    }


    var loopcmd = false;
    var sqtime = new Date().getTime()/1000;
    var lastp = [0];
    var lastt = [0];
    var lastn = [0];
    var lastpmode = 0;
    var lasttmode = 0;
    var lastnmode = 0;

    var doLoop = function() {
        //console.log("doLoop");
        var timeout = 33;
        var now = new Date().getTime()/1000;
        var pat = parseInt($("#cmdPat").val());
        var period = parseFloat($("#patPeriod").val());
        if (isNaN(period)) {
            period = 1;
        }
        var cmd = null;
        if (pat == 0) { // none
            cmd = buildCmd();
        } else if (pat == 1) { // flip
            if ((now - sqtime) > period) {
                lastp[0] = -lastp[0];
                lastt[0] = -lastt[0];
                lastn[0] = -lastn[0];
                sqtime = now;
            }
            cmd = buildCmd();
        } else if (pat == 2) { // sine
            cmd = buildSinCmd();
        } else if (pat == 3) { // index
            var initCount = state.getInitIndexCount();
            var astate = state.getAxisState();

            var n_indexed = (initCount[0][0] != astate.neck.index_count);
            var t_indexed = (initCount[0][1] != astate.torso.index_count);
            var p_indexed = (initCount[0][2] != astate.pelvis.index_count);

            if (!p_indexed) {
                $("#pelvisMode").val(4);
                $("#pelvisCmd").val(-1);
            } else {
                $("#pelvisMode").val(0);
                $("#pelvisCmd").val(0);
            }
            if (!t_indexed) {
                $("#torsoMode").val(4);
                $("#torsoCmd").val(-1);
            } else {
                $("#torsoMode").val(0);
                $("#torsoCmd").val(0);
            }
            if (!n_indexed) {
                $("#neckMode").val(4);
                $("#neckCmd").val(-1);
            } else {
                $("#neckMode").val(0);
                $("#neckCmd").val(0);
            }
            $("#cmdBtn").click();
            cmd = buildCmd();
            if (p_indexed && t_indexed && n_indexed) {
                state.initIndexCountState[0][0] = astate.neck.index_count;
                state.initIndexCountState[0][1] = astate.torso.index_count;
                state.initIndexCountState[0][2] = astate.pelvis.index_count;
                $("#stopBtn").click();
            }
        }
        if (socket.readyState != WebSocket.OPEN) {
            socket = makeCmdSocket();
            timeout = 3000;
        } else {
            if (cmd != null) {
                socket.send(cmd);
            }
        }
        if (loopcmd) {
            setTimeout(doLoop, timeout);
        }
    };

    $("#cmdBtn").click(function() {
        function getVal(value) {
            var vf = parseFloat(value);
            if (isNaN(vf)) {
                // better be an array already
                return JSON.parse(value);
            } else {
                return [vf];
            }
        }

        lastp = getVal($("#pelvisCmd").val());
        lastt = getVal($("#torsoCmd").val());
        lastn = getVal($("#neckCmd").val());
        lastpmode = parseInt($("#pelvisMode").val());
        lasttmode = parseInt($("#torsoMode").val());
        lastnmode = parseInt($("#neckMode").val());
        //cmd = buildCmd();
        if (!loopcmd) {
            loopcmd = true;
            doLoop();
        }
    });

    $("#stopBtn").click(function() {
        /*
        $("#pelvisMode").val("0");
        $("#pelvisCmd").val("0");
        $("#pelvisRange").val("0");
        $("#torsoMode").val("0");
        $("#torsoCmd").val("0");
        $("#torsoRange").val("0");
        $("#neckMode").val("0");
        $("#neckCmd").val("0");
        $("#neckRange").val("0");
        */
        $("#cmdPat").val("0");
        $("#cmdBtn").click();
        loopcmd = false;
    });

    $("#testBtn").click(function() {
        $("#pelvisMode").val("4");
        $("#pelvisCmd").val("3");
        $("#pelvisRange").val("3");

        $("#torsoMode").val("4");
        $("#torsoCmd").val("-3");
        $("#torsoRange").val("-3");

        $("#neckMode").val("4");
        $("#neckCmd").val("3");
        $("#neckRange").val("3");

        $("#cmdPat").val("1");
        $("#patPeriod").val("5");

        $("#cmdBtn").click();
    });

    $("#pelvisCmd").keyup(function(e) {
        if (e.keyCode == 13) {
            $("#cmdBtn").click();
        }
    });

    $("#torsoCmd").keyup(function(e) {
        if (e.keyCode == 13) {
            $("#cmdBtn").click();
        }
    });

    $("#neckCmd").keyup(function(e) {
        if (e.keyCode == 13) {
            $("#cmdBtn").click();
        }
    });

    $("#pelvisRange").change(function() {
        var astate = state.getAxisState();
        if (astate === null) {
            return;
        }
        var mode = $("#pelvisMode").val();
        var lim = 1;
        if (mode === "4") {
            lim = astate.pelvis.vel_limit;
        } else if (mode === "6") {
            lim = astate.pelvis.cur_limit;
        }
        var newval = $(this).val() * 0.01 * lim;
        $("#pelvisCmd").val(newval);
        $("#cmdBtn").click();
    });

    $("#torsoRange").change(function() {
        var astate = state.getAxisState();
        if (astate === null) {
            return;
        }
        var mode = $("#torsoMode").val();
        var lim = 1;
        if (mode === "4") {
            lim = astate.torso.vel_limit;
        } else if (mode === "6") {
            lim = astate.torso.cur_limit;
        }
        var newval = $(this).val() * 0.01 * lim;
        $("#torsoCmd").val(newval);
        $("#cmdBtn").click();
    });

    $("#neckRange").change(function() {
        var astate = state.getAxisState();
        if (astate === null) {
            return;
        }
        var mode = $("#neckMode").val();
        var lim = 1;
        if (mode === "4") {
            lim = astate.neck.vel_limit;
        } else if (mode === "6") {
            lim = astate.neck.cur_limit;
        }
        var newval = $(this).val() * 0.01 * lim;
        $("#neckCmd").val(newval);
        $("#cmdBtn").click();
    });
}

function computePR(up) {
    var pr = { pitch: 0, roll: 0};
    pr.pitch = Math.atan2(-up[0], up[2]) * 180/Math.PI;
    pr.roll = Math.atan2(up[1], up[2]) * 180/Math.PI;
    return pr;
}

function connectIMU() {
    var host = window.location.host;
    var socket = new WebSocket("ws://"+host+"/imu");
    socket.onopen = function() {
        console.log("IMU state socket open!");
    };
    socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        state.appendImuState(data);
        $("#imustate").text(JSON.stringify(data, null, 2));
        var pr = computePR(data.up);
        $("#imu_hpr").text("Pitch: " +  pr.pitch.toFixed(2) + " deg, Roll: " + pr.roll.toFixed(2) + " deg");
    };
    socket.onclose = function() {
        console.log("IMU state socket close!");
        setTimeout(function() { connectIMU(); }, 3000);
    };
}

function connectTouch() {
    var host = window.location.host;
    var socket = new WebSocket("ws://"+host+"/touch");
    socket.onopen = function() {
        console.log("Touch state socket open!");
    };
    socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        state.appendTouchState(data);
        $("#touch").html($("<p>").text(JSON.stringify(data, null, 2)));
    };
    socket.onclose = function() {
        console.log("Touch state socket close!");
        setTimeout(function() { connectTouch(); }, 3000);
    };
}

function connectPower() {
    var host = window.location.host;
    var socket = new WebSocket("ws://"+host+"/power");
    socket.onopen = function() {
        console.log("Power state socket open!");
    };
    socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        state.appendPowerState(data);
        $("#power").html($("<p>").text(JSON.stringify(data, null, 2)));
    };
    socket.onclose = function() {
        console.log("Power state socket close!");
        setTimeout(function() { connectPower(); }, 3000);
    };
}

function connectMisc() {
    var host = window.location.host;
    var socket = new WebSocket("ws://"+host+"/misc");
    socket.onopen = function() {
        console.log("Misc state socket open!");
    };
    socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        state.appendMiscState(data);
        $("#misc").html($("<p>").text(JSON.stringify(data, null, 2)));
    };
    socket.onclose = function() {
        console.log("Misc state socket close!");
        setTimeout(function() { connectMisc(); }, 3000);
    };
}

function connectLEDState() {
    var host = window.location.host;
    var socket = new WebSocket("ws://"+host+"/led_state");
    socket.onopen = function() {
        console.log("LED state socket open!");
    };
    socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        $("#ledState").html($("<p>").text(JSON.stringify(data, null, 2)));
    };
    socket.onclose = function() {
        console.log("LED state socket close!");
        setTimeout(function() { connectLEDState(); }, 3000);
    };
}

function connectLEDCmd() {
    function makeCmdSocket() {
        var host = window.location.host;
        var socket = new WebSocket("ws://"+host+"/led_command");
        socket.onopen = function() {
            console.log("LED command socket open!");
        };
        socket.onmessage = function(msg) {
            console.log("Got command message: " + msg.data);
        };
        socket.onclose = function() {
            console.log("LED command socket close!");
        };
        return socket;
    };

    var socket = makeCmdSocket();

    var ledCmd = null;

    var doLoop = function() {
        if (socket.readyState !== WebSocket.OPEN) {
            if (socket.readyState !== WebSocket.CONNECTING) {
                socket = makeCmdSocket();
            }
            setTimeout(doLoop, 1000);
            return;
        }
        if (ledCmd) {
            socket.send(JSON.stringify(ledCmd));
        }
        setTimeout(doLoop, 100);
    };

    doLoop();

    $("#ledBtn").click(function() {
        var cmd = {
            ts: [0, 0],
            color: [parseFloat($("#ledRedCmd").val()),
                    parseFloat($("#ledGreenCmd").val()),
                    parseFloat($("#ledBlueCmd").val())],
            rate_limit: [parseFloat($("#leddRedCmd").val()),
                         parseFloat($("#leddGreenCmd").val()),
                         parseFloat($("#leddBlueCmd").val())]
        };

        console.log("Set LED Command: " + JSON.stringify(cmd));
        ledCmd = cmd;
    });
}

function connectSettings() {
    $("#refreshSettings").click(function() {
        $.ajax({
            type: "GET",
            url: "/settings",
            dataType: "json",
            success: function(data) {
                $("#lcdBacklight").val(data.lcd_backlight);
                $("#fanSpeed").val(data.fan_speed);
                $("#fanMode").val(data.fan_mode);
            },
            error: function(xhr, status, error) {
                console.log("ERROR " + status + " " + error);
            }
        });
    });

    $("#submitSettings").click(function() {
        var settings = {
            lcd_backlight: parseFloat($("#lcdBacklight").val()),
            fan_speed: parseFloat($("#fanSpeed").val()),
            fan_mode: parseInt($("#fanMode").val())
        };
        $.ajax({
            type: "POST",
            url: "/settings",
            dataType: "json",
            data: JSON.stringify(settings),
            success: function() {
            },
            error: function(xhr, status, error) {
                console.log("ERROR " + status + " " + error);
            }
        });
    });

    $("#lcdBacklight").keyup(function(e) {
        if (e.keyCode == 13) {
            $("#submitSettings").click();
        }
    });

    $("#fanSpeed").keyup(function(e) {
        if (e.keyCode == 13) {
            $("#submitSettings").click();
        }
    });

    $("#refreshSettings").click();
}

function connectFaults() {
    $("#refreshFaults").click(function() {
        $.ajax({
            type: "GET",
            url: "/faults",
            dataType: "json",
            success: function(data) {
                $("#faultState").text(JSON.stringify(data));
            },
            error: function(xhr, status, error) {
                console.log("ERROR " + status + " " + error);
            }
        });
    });

    $("#refreshFaults").click();
}

function connectScreen() {
    $("#refreshScreenBlank").click(function() {
        $.ajax({
            type: "GET",
            url: "/screen",
            dataType: "json",
            success: function(data) {
                $("#screenBlank").text(JSON.stringify(data));
            },
            error: function(xhr, status, error) {
                console.log("ERROR " + status + " " + error);
            }
        });
    });


    $("#screenOn").click(function() {
	var command = {
	    "screen": "on"
	};
	$.ajax({type: "POST",
		url: "/screen",
		dataType: "json",
		data: JSON.stringify(command),
		success: function(data) {
                    $("#screenBlank").text(JSON.stringify(data));
		},
		error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
		}
	       });
    });

    $("#screenOff").click(function() {
	var command = {
	    "screen": "off"
	};
	$.ajax({type: "POST",
		url: "/screen",
		dataType: "json",
		data: JSON.stringify(command),
		success: function(data) {
                    $("#screenBlank").text(JSON.stringify(data));
		},
		error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
		}
	       });
	});

    $("#refreshScreenBlank").click();
}

function modeToStr(mode) {
    if (mode === 0) {
        return "NONE";
    } else if (mode === 1) {
        return "LIMP";
    } else if (mode === 2) {
        return "BRAKE";
    } else if (mode === 3) {
        return "PWM";
    } else if (mode === 4) {
        return "VEL";
    } else if (mode === 5) {
        return "TRAJ";
    } else if (mode === 6) {
        return "TRQ";
    } else if (mode === 7) {
        return "POS_VEL";
    }
}

function statusToStr(status) {
    var str = "";
    if (status & 0x01) {
        str += "INDEXED ";
    }
    if (status & 0x02) {
        str += "ENABLED ";
    }
    if (status & 0x04) {
        str += "BRAKED ";
    }
    if (status & 0x08) {
        str += "MOVING ";
    }
    if (status & 0x10) {
        str += "STALLED ";
    }
    if (status & 0x20) {
        str += "TIMEOUT ";
    }
    if (status & 0x40) {
        str += "FAULT ";
    }
    if (str.length === 0) {
        str = "NONE";
    }
    return str;
}

function faultToStr(fault) {
    var str = "";
    if (fault & 0x01) {
        str += "POWER ";
    }
    if (fault & 0x02) {
        str += "STALL ";
    }
    if (fault & 0x04) {
        str += "ENCODER ";
    }
    if (fault & 0x08) {
        str += "ENCODER_BACKWARDS ";
    }
    if (fault & 0x10) {
        str += "THERMISTOR ";
    }
    if (str.length === 0) {
        str = "NONE";
    }
    return str;
}

function lockoutToStr(lockout) {
    var str = "";
    if (lockout & 0x01) {
        str += "NO_BATTERY ";
    }
    if (lockout & 0x02) {
        str += "NOT_UPRIGHT ";
    }
    if (lockout & 0x04) {
        str += "FALLING ";
    }
    if (str.length === 0) {
        str = "NONE";
    }
    return str;
}

function limiterToStr(limiter) {
    var str = "";
    if (limiter === -1) {
        str = "DISABLED";
    } else if (limiter === 0) {
        str = "OK";
    } else if (limiter === 1) {
        str = "APPROACHING_LIMIT";
    } else if (limiter === 2) {
        str = "EXCEEDING_LIMIT";
    } else if (limiter === 3) {
        str = "UNINDEXED";
    } else if (limiter === 4) {
        str = "AXIS_FAULT";
    } else {
        str = "UNKNOWN";
    }
    return str;
}

function updateAxisStatus() {
    var astate = state.getAxisState();
    var lstate = lockoutToStr(astate.lockout);
    var pelvisMode = modeToStr(astate.pelvis.mode);
    var pelvisStat = statusToStr(astate.pelvis.status);
    var pelvisFault = faultToStr(astate.pelvis.fault_status);
    var pelvisLimit = limiterToStr(astate.pelvis.limiter_mode);
    var ps = $("#pelvisStatus");
    ps.text("Pelvis Mode: " + pelvisMode +
            " | Status: " + pelvisStat +
            " | Faults: " + pelvisFault +
            " | Lockout: " + lstate +
            " | Limiter: " + pelvisLimit);
    var torsoMode = modeToStr(astate.torso.mode);
    var torsoStat = statusToStr(astate.torso.status);
    var torsoFault = faultToStr(astate.torso.fault_status);
    var torsoLimit = limiterToStr(astate.torso.limiter_mode);
    var ts = $("#torsoStatus");
    ts.text("Torso Mode: " + torsoMode +
            " | Status: " + torsoStat +
            " | Faults: " + torsoFault +
            " | Lockout: " + lstate +
            " | Limiter: " + torsoLimit);
    var neckMode = modeToStr(astate.neck.mode);
    var neckStat = statusToStr(astate.neck.status);
    var neckFault = faultToStr(astate.neck.fault_status);
    var neckLimit = limiterToStr(astate.neck.limiter_mode);
    var ns = $("#neckStatus");
    ns.text("Neck Mode: " + neckMode +
            " | Status: " + neckStat +
            " | Faults: " + neckFault +
            " | Lockout: " + lstate +
            " | Limiter: " + neckLimit);
}

function initMotorSettings() {
    $("#ms_select").change(function() {
        $("#ms_refresh").click();
    });

    $("#ms_refresh").click(function() {
        $.ajax({
            type: "GET",
            url: "/axis_tuning",
            dataType: "json",
            success: updateMotorSettings,
            error: function(xhr, status, error) {
                console.log("ERROR " + status + " " + error);
            }
        });
    });

    $("#ms_commit").click(function() {
        $.ajax({
            type: "POST",
            url: "/axis_tuning",
            dataType: "json",
            data: packMotorSettings(),
            success: function() {
            },
            error: function(xhr, status, error) {
                console.log("ERROR " + status + " " + error);
            }
        });
    });
}

var motorSettings = null;

function updateMotorSettings(data) {
    motorSettings = data;

    var axis = $("#ms_select").val();
    var a = null;
    if (axis == "pelvis") {
        a = data.pelvis;
    } else if (axis == "torso") {
        a = data.torso;
    } else if (axis == "neck") {
        a = data.neck;
    }
    $("#ms_kP").val(a.kP);
    $("#ms_kI").val(a.kI);
    $("#ms_kD").val(a.kD);
    $("#ms_kFv").val(a.kFv);
    $("#ms_kFa").val(a.kFa);
    $("#ms_iLimit").val(a.iLimit);
    $("#ms_outLimit").val(a.outLimit);
    $("#ms_kV").val(a.kV);
    $("#ms_rMotor").val(a.rMotor);
    $("#ms_ticksPerRev").val(a.ticksPerRev);
    $("#ms_velFilter").val(a.velFilter);
}

function packMotorSettings() {
    if (motorSettings === null) {
        return;
    }
    var data = motorSettings;
    var axis = $("#ms_select").val();
    var a = null;
    if (axis == "pelvis") {
        a = data.pelvis;
    } else if (axis == "torso") {
        a = data.torso;
    } else if (axis == "neck") {
        a = data.neck;
    }
    a.kP = parseFloat($("#ms_kP").val());
    a.kI = parseFloat($("#ms_kI").val());
    a.kD = parseFloat($("#ms_kD").val());
    a.kFv = parseFloat($("#ms_kFv").val());
    a.kFa = parseFloat($("#ms_kFa").val());
    a.iLimit = parseFloat($("#ms_iLimit").val());
    a.outLimit = parseFloat($("#ms_outLimit").val());
    a.kV = parseFloat($("#ms_kV").val());
    a.rMotor = parseFloat($("#ms_rMotor").val());
    a.ticksPerRev = parseFloat($("#ms_ticksPerRev").val());
    a.velFilter = parseFloat($("#ms_velFilter").val());
    return JSON.stringify(data);
}

function getAxisInfo() {
    $.ajax({
        type: "GET",
        url: "/axis_info",
        dataType: "json",
        success: function(data) {
            $("#axis_info").text(JSON.stringify(data, null, 2));
        },
        error: function(xhr, status, error) {
            console.log("ERROR " + status + " " + error);
        }
    });
}
