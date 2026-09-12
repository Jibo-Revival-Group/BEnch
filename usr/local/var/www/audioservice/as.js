var as = (function($) {
    function SEDiag(attachObj, json) {
        this.name = json.name;
        this.type = json.type;
        this.writable = json.writable;

        var id = this.name + "Diag";

        attachObj.append($("<td>", {text: this.name}));

        this.valueBox = $("<input>", {type: "text", disabled: !this.writable, id: id, style: "width:180pt"});
        attachObj.append($("<td>").append(this.valueBox));
        this.setValue(json.value);

        if (this.writable && json.type != 0) { 
            // doesn't support setting char type
            this.setBtn = $("<button>", {text: "Set Value"});
            this.setBtn.click(function() {
                function getVal(value) {
                    var vf = parseFloat(value);
                    if (isNaN(vf)) {
                        // better be an array already
                        return JSON.parse(value);
                    } else {
                        return [vf];
                    }
                }
                $.ajax({
                    type: "POST",
                    url: "/diag",
                    dataType: "json",
                    data: JSON.stringify({
                        diags: [ { name: this.name, value: getVal(this.valueBox.val()) } ]
                    }),
                    success: function() {
                    },
                    error: function(xhr, status, error) {
                        console.log("ERROR " + status + " " + error);
                    }
                });
            }.bind(this));
            attachObj.append($("<td>").append(this.setBtn));

            this.valueBox.keyup(function(e) {
                if (e.keyCode == 13) {
                    this.setBtn.click();
                }
            }.bind(this));
        } else {
            attachObj.append($("<td>"));
        }
    };

    function filterNaN(data, type) {
        return data.replace(/NaN/g, "0.0");
    };

    SEDiag.prototype = {
        constructor: SEDiag,
        setValue: function(data) {
            var val = null;
            if (this.type == 0) {
                // char
                val = String.fromCharCode.apply(null, data);
            } else {
                // everything else
                val = JSON.stringify(data);
            }
            this.valueBox.val(val);
        },
        updateValue: function(callback) {
            $.ajax({
                type: "GET",
                url: "/diag?"+this.name,
                dataType: "json",
                dataFilter: filterNaN,
                success: function(data) {
                    this.setValue(data);
                    callback(data);
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }
    };

    function SEDiags(attachObj) {
        this.diags = [];

        this.table = $("<table>", {border: "0"});

        $.ajax({
            type: "GET",
            url: "/diag",
            dataType: "json",
            dataFilter: filterNaN,
            success: function(data) {
                $.each(data.diags, function(_, d) {
                    var row = $("<tr>");
                    this.table.append(row);
                    this.diags.push(new SEDiag(row, d));
                }.bind(this));
            }.bind(this),
            error: function(xhr, status, error) {
                console.log("ERROR " + status + " " + error);
            }
        });

        var rdiv = $("<div>");

        this.refresh = $("<button>", {id: "seRefresh", text: "Refresh Values"});
        this.refresh.click(function() {
            $.ajax({
                type: "GET",
                url: "/diag",
                dataType: "json",
                dataFilter: filterNaN,
                success: function(data) {
                    $.each(data.diags, function(_, d) {
                        for (var i=0; i<this.diags.length; i++) {
                            if (this.diags[i].name == d.name) {
                                this.diags[i].setValue(d.value);
                            }
                        }
                    }.bind(this));
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }.bind(this));
        rdiv.append(this.refresh);

        this.loop = $("<input>", {type: "checkbox", id: "seDiagRefreshLoop"});
        function doLoop() {
            var loop = this.loop.prop("checked");
            if (loop) {
                this.refresh.click();
                setTimeout(doLoop.bind(this), 5000);
            }
        };
        this.loop.change(doLoop.bind(this));
        rdiv.append(this.loop);
        var label = $("<label>", {for: "seDiagRefreshLoop", text: "Loop"});
        rdiv.append(label);

        attachObj.append(rdiv);
        attachObj.append(this.table);
    };

    function Mode(attachObj) {
        this.modeLabel = $("<label>", {for: "modeBox", id: "modeLabel", text: "Mode"});
        attachObj.append(this.modeLabel);

        this.modeBox = $("<select>", {id: "modeBox"});
        this.modeBox.append($("<option>", {value: "0", text: "SPEECH_RECOGNITION"}));
        this.modeBox.append($("<option>", {value: "1", text: "TELEPRESENCE"}));
        this.modeBox.append($("<option>", {value: "2", text: "MUSIC"}));
        attachObj.append(this.modeBox);

        this.refresh = $("<button>", {id: "modeRefresh", text: "Refresh"});
        this.refresh.click(function() {
            $.ajax({
                type: "GET",
                url: "/mode",
                dataType: "json",
                success: function(data) {
                    this.modeBox.val(data.mode);
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }.bind(this));
        attachObj.append(this.refresh);

        this.set = $("<button>", {id: "modeSet", text: "Set Mode"});
        this.set.click(function() {
            $.ajax({
                type: "POST",
                url: "/mode",
                dataType: "json",
                data: JSON.stringify({
                    mode: parseInt(this.modeBox.val()),
                    suppressNoise: false
                }),
                success: function() {
                },
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }.bind(this));
        attachObj.append(this.set);
    };

    function Log(attachId) {
        this.logging = null;
        this.btn = $("<button>", {id: "logBtn"});
        this.btn.click(function() {
            $.ajax({
                type: "POST",
                url: "/log",
                dataType: "json",
                data: JSON.stringify({
                    logging: !this.logging
                }),
                success: function() {
                    this.updateState();
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }.bind(this));
        attachId.append(this.btn);
        this.updateState();
    };

    Log.prototype = {
        constructor: Log,
        updateState: function() {
            $.ajax({
                type: "GET",
                url: "/log",
                dataType: "json",
                success: function(data) {
                    this.logging = data.logging;
                    if (this.logging) {
                        this.btn.text("Stop Logging");
                    } else {
                        this.btn.text("Start Logging");
                    }
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }
    };

    function AudioPlot(attachObj, uri, channels) {
        this.uri = uri;
        this.channels = channels;
        this.loop = false;
        this.socket = null;

        this.plotdata = [];
        this.maxHistory = 3000;
        this.show = [];
        this.refreshGrid = false;

        for (var c=0; c<this.channels; c++) {
            this.plotdata.push({label: "ch" + (c+1), data: []});
            this.show.push(true);
        }
        for (var i=0; i<this.maxHistory; i++) {
            for (var c=0; c<this.channels; c++) {
                this.plotdata[c].data.push([i, 0]);
            }
        }

        this.plot = $.plot(attachObj, this.plotdata, {
            series: {
                shadowSize: 0
            },
            xaxis: {
                zoomRange: false,
                panRange: false
            },
            yaxis: {
                min: -32768,
                max: 32768,
                zoomRange: [100, 65536],
                panRange: false
            },
            zoom: {
                interactive: true
            },
            pan: {
                interactive: true
            }
        });
    };

    AudioPlot.prototype = {
        constructor: AudioPlot,
        draw: function() {
            for (var i=0; i<this.maxHistory; i++) {
                for (var c=0; c<this.channels; c++) {
                    this.plotdata[c].data[i][0] = i;
                }
            }
            
            var data = [];
            for (var c=0; c<this.channels; c++) {
                if (this.show[c]) {
                    data.push(this.plotdata[c]);
                }
            }

            this.plot.setData(data);
            if (this.refreshGrid) {
                this.plot.setupGrid();
                this.refreshGrid = false;
            }
            this.plot.draw();

            if (this.loop) {
                setTimeout(function() { this.draw(); }.bind(this), 67);
            }
        },
        setupSocket: function() {
            var host = window.location.host;
            var uri = this.uri;
            this.socket = new WebSocket("ws://"+host+uri);
            this.socket.onopen = function() {
                console.log(uri + " socket open!");
            };
            this.socket.onmessage = function(msg) {
                var reader = new FileReader();
                reader.addEventListener("loadend", function() {
                    var view = new Int16Array(reader.result);
                    //console.log(this.uri + " got " + view.length);
                    for (var c=0; c<this.channels; c++) {
                        var samples_per_channel = Math.floor(view.length/this.channels);
                        for (var i=0; i<samples_per_channel; i++) {
                            this.plotdata[c].data.push([-1, view[c*samples_per_channel + i]]);
                            if (this.plotdata[c].data.length > this.maxHistory) {
                                this.plotdata[c].data.shift();
                            }
                        }
                    }
                }.bind(this));
                reader.readAsArrayBuffer(msg.data);
            }.bind(this);
            this.socket.onclose = function() {
                console.log(uri + " socket close!");
            }
        },
        start: function() {
            this.setupSocket();
            this.loop = true;
            this.draw();
        },
        stop: function() {
            this.loop = false;
            this.socket.close();
            this.socket = null;
        },
        setShows: function(shows) {
            for (var i=0; i<Math.min(shows.length, this.show.length); i++) {
                this.show[i] = shows[i];
            }
            this.refreshGrid = true;
        },
        setShow: function(index, show) {
            this.show[index] = show;
            this.refreshGrid = true;
        }
    };

    function PlotControls(attachObj, plot) {
        this.plot = plot;
        var label = "Start";
        if (this.plot.loop) {
            label = "Stop";
        }
        this.btn = $("<button>", {id: plot.uri + "Btn", text: label});
        this.btn.click(function() {
            if (!this.plot.loop) {
                this.plot.start();
                this.btn.text("Stop");
            } else {
                this.plot.stop();
                this.btn.text("Start");
            }
        }.bind(this));
        attachObj.append(this.btn);

        for (var c=0; c<this.plot.channels; c++) {
            var id = this.plot.uri + "Ch" + (c+1) + "En";
            var ckbox = $("<input>", {type: "checkbox", id: id, checked: this.plot.show[c]});
            ckbox.prop("channel", c);
            ckbox.click(function() {
                console.log("set show: " + $(this).prop("channel") + ", " + $(this).prop("checked"));
                plot.setShow($(this).prop("channel"), $(this).prop("checked"));
            });
            var chname = "ch" + (c+1);
            var lbl = $("<label>", {for: id, text:  chname});
            attachObj.append(ckbox);
            attachObj.append(lbl);
        }
    };

    function MixerControls(attachObj) {
        var label = $("<label>", {for: "masterDiv", text: "Master"});
        attachObj.append(label);
        var masterDiv = $("<div>", {id:"masterDiv", class:"mixer"});
        attachObj.append(masterDiv);

        this.masterRecord = $("<input>", {type:"range", id:"masterRecordRange", min:"0", max:"1", step:"0.05"});
        this.masterRecord.change(function() {
            this.setAll();
        }.bind(this));
        masterDiv.append(this.masterRecord);
        var label = $("<label>", {for: "masterRecordRange", text: "Record"});
        masterDiv.append(label);

        this.masterPlayback = $("<input>", {type:"range", id:"masterPlaybackRange", min:"0", max:"1", step:"0.05"});
        this.masterPlayback.change(function() {
            this.setAll();
        }.bind(this));
        masterDiv.append(this.masterPlayback);
        var label = $("<label>", {for: "masterPlaybackRange", text: "Playback"});
        masterDiv.append(label);

        this.masterMute = $("<input>", {type:"checkbox", id:"masterMute"});
        this.masterMute.change(function() {
            this.setAll();
        }.bind(this));
        masterDiv.append(this.masterMute);
        var label = $("<label>", {for: "masterMute", text: "Mute"});
        masterDiv.append(label);

        var label = $("<label>", {for: "skillsDiv", text: "Skills"});
        attachObj.append(label);
        var skillsDiv = $("<div>", {id:"skillsDiv"});
        attachObj.append(skillsDiv);

        this.skillsRecord = $("<input>", {type:"range", id:"skillsRecordRange", min:"0", max:"1", step:"0.05"});
        this.skillsRecord.change(function() {
            this.setAll();
        }.bind(this));
        skillsDiv.append(this.skillsRecord);
        var label = $("<label>", {for: "skillsRecordRange", text: "Record"});
        skillsDiv.append(label);

        this.skillsPlayback = $("<input>", {type:"range", id:"skillsPlaybackRange", min:"0", max:"1", step:"0.05"});
        this.skillsPlayback.change(function() {
            this.setAll();
        }.bind(this));
        skillsDiv.append(this.skillsPlayback);
        var label = $("<label>", {for: "skillsPlaybackRange", text: "Playback"});
        skillsDiv.append(label);

        this.skillsMute = $("<input>", {type:"checkbox", id:"skillsMute"});
        this.skillsMute.change(function() {
            this.setAll();
        }.bind(this));
        skillsDiv.append(this.skillsMute);
        var label = $("<label>", {for: "skillsMute", text: "Mute"});
        skillsDiv.append(label);

        var label = $("<label>", {for: "asrDiv", text: "ASR"});
        attachObj.append(label);
        var asrDiv = $("<div>", {id:"asrDiv"});
        attachObj.append(asrDiv);

        this.asrRecord = $("<input>", {type:"range", id:"asrRecordRange", min:"0", max:"1", step:"0.05"});
        this.asrRecord.change(function() {
            this.setAll();
        }.bind(this));
        asrDiv.append(this.asrRecord);
        var label = $("<label>", {for: "asrRecordRange", text: "Record"});
        asrDiv.append(label);

        this.asrPlayback = $("<input>", {type:"range", id:"asrPlaybackRange", min:"0", max:"1", step:"0.05"});
        this.asrPlayback.change(function() {
            this.setAll();
        }.bind(this));
        asrDiv.append(this.asrPlayback);
        var label = $("<label>", {for: "asrPlaybackRange", text: "Playback"});
        asrDiv.append(label);

        this.asrMute = $("<input>", {type:"checkbox", id:"asrMute"});
        this.asrMute.change(function() {
            this.setAll();
        }.bind(this));
        asrDiv.append(this.asrMute);
        var label = $("<label>", {for: "asrMute", text: "Mute"});
        asrDiv.append(label);

        var label = $("<label>", {for: "ttsDiv", text: "TTS"});
        attachObj.append(label);
        var ttsDiv = $("<div>", {id:"ttsDiv"});
        attachObj.append(ttsDiv);

        this.ttsRecord = $("<input>", {type:"range", id:"ttsRecordRange", min:"0", max:"1", step:"0.05"});
        this.ttsRecord.change(function() {
            this.setAll();
        }.bind(this));
        ttsDiv.append(this.ttsRecord);
        var label = $("<label>", {for: "ttsRecordRange", text: "Record"});
        ttsDiv.append(label);

        this.ttsPlayback = $("<input>", {type:"range", id:"ttsPlaybackRange", min:"0", max:"1", step:"0.05"});
        this.ttsPlayback.change(function() {
            this.setAll();
        }.bind(this));
        ttsDiv.append(this.ttsPlayback);
        var label = $("<label>", {for: "ttsPlaybackRange", text: "Playback"});
        ttsDiv.append(label);

        this.ttsMute = $("<input>", {type:"checkbox", id:"ttsMute"});
        this.ttsMute.change(function() {
            this.setAll();
        }.bind(this));
        ttsDiv.append(this.ttsMute);
        var label = $("<label>", {for: "ttsMute", text: "Mute"});
        ttsDiv.append(label);

        var label = $("<label>", {for: "mediaDiv", text: "Media"});
        attachObj.append(label);
        var mediaDiv = $("<div>", {id:"mediaDiv"});
        attachObj.append(mediaDiv);

        this.mediaRecord = $("<input>", {type:"range", id:"mediaRecordRange", min:"0", max:"1", step:"0.05"});
        this.mediaRecord.change(function() {
            this.setAll();
        }.bind(this));
        mediaDiv.append(this.mediaRecord);
        var label = $("<label>", {for: "mediaRecordRange", text: "Record"});
        mediaDiv.append(label);

        this.mediaPlayback = $("<input>", {type:"range", id:"mediaPlaybackRange", min:"0", max:"1", step:"0.05"});
        this.mediaPlayback.change(function() {
            this.setAll();
        }.bind(this));
        mediaDiv.append(this.mediaPlayback);
        var label = $("<label>", {for: "mediaPlaybackRange", text: "Playback"});
        mediaDiv.append(label);

        this.mediaMute = $("<input>", {type:"checkbox", id:"mediaMute"});
        this.mediaMute.change(function() {
            this.setAll();
        }.bind(this));
        mediaDiv.append(this.mediaMute);
        var label = $("<label>", {for: "mediaMute", text: "Mute"});
        mediaDiv.append(label);

        this.getAll();
    };

    MixerControls.prototype = {
        constructor: MixerControls,
        getAll: function() {
            $.ajax({
                type: "GET",
                url: "/mixer",
                dataType: "json",
                success: function(data) {
                    this.masterRecord.val(data.master.recordVolume);
                    this.masterPlayback.val(data.master.playbackVolume);
                    this.masterMute.prop("checked", data.master.mute);
                    this.skillsRecord.val(data.skills.recordVolume);
                    this.skillsPlayback.val(data.skills.playbackVolume);
                    this.skillsMute.prop("checked", data.skills.mute);
                    this.asrRecord.val(data.asr.recordVolume);
                    this.asrPlayback.val(data.asr.playbackVolume);
                    this.asrMute.prop("checked", data.asr.mute);
                    this.ttsRecord.val(data.tts.recordVolume);
                    this.ttsPlayback.val(data.tts.playbackVolume);
                    this.ttsMute.prop("checked", data.tts.mute);
                    this.mediaRecord.val(data.media.recordVolume);
                    this.mediaPlayback.val(data.media.playbackVolume);
                    this.mediaMute.prop("checked", data.media.mute);
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        },
        setAll: function() {
            var settings = {
                master: {
                    recordVolume: parseFloat(this.masterRecord.val()),
                    playbackVolume: parseFloat(this.masterPlayback.val()),
                    mute: this.masterMute.prop("checked")
                },
                skills: {
                    recordVolume: parseFloat(this.skillsRecord.val()),
                    playbackVolume: parseFloat(this.skillsPlayback.val()),
                    mute: this.skillsMute.prop("checked")
                },
                asr: {
                    recordVolume: parseFloat(this.asrRecord.val()),
                    playbackVolume: parseFloat(this.asrPlayback.val()),
                    mute: this.asrMute.prop("checked")
                },
                tts: {
                    recordVolume: parseFloat(this.ttsRecord.val()),
                    playbackVolume: parseFloat(this.ttsPlayback.val()),
                    mute: this.ttsMute.prop("checked")
                },
                media: {
                    recordVolume: parseFloat(this.mediaRecord.val()),
                    playbackVolume: parseFloat(this.mediaPlayback.val()),
                    mute: this.mediaMute.prop("checked")
                }
            };
            $.ajax({
                type: "POST",
                url: "/mixer",
                dataType: "json",
                data: JSON.stringify(settings),
                success: function() {
                },
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }
    };

    function SEDebugControls(attachObj) {
        this.whInjBox = $("<input>", {type:"checkbox", id:"whInjBox"});
        this.whInjBox.change(function() {
            this.setAll();
        }.bind(this));
        attachObj.append(this.whInjBox);
        var label = $("<label>", {for: "whInjBox", text: "Inject White Noise"});
        attachObj.append(label);

        this.siInjBox = $("<input>", {type:"checkbox", id:"siInjBox"});
        this.siInjBox.change(function() {
            this.setAll();
        }.bind(this));
        attachObj.append(this.siInjBox);
        var label = $("<label>", {for: "siInjBox", text: "Inject Sine Wave"});
        attachObj.append(label);
    };

    SEDebugControls.prototype = {
        constructor: SEDebugControls,
        setAll: function() {
            $.ajax({
                type: "POST",
                url: "/debug",
                dataType: "json",
                data: JSON.stringify({
                    injectWhiteNoise: this.whInjBox.prop("checked"),
                    injectSine: this.siInjBox.prop("checked")
                }),
                success: function() {
                },
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }
    };

    function LevelState(attachObj) {
        this.mic_levels = null;
        this.span = $("<span>", {id: "levelSpan"});
        attachObj.append(this.span);

        setTimeout(function() { this.doLoop(); }.bind(this), 1000);
    };

    LevelState.prototype = {
        constructor: LevelState,
        doLoop: function() {
            $.ajax({
                type: "GET",
                url: "/levels",
                dataType: "json",
                success: function(data) {
                    this.mic_levels = data.mic_levels;
                    this.draw();
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }.bind(this)
            });
            setTimeout(function() { this.doLoop(); }.bind(this), 1000);
        },
        draw: function() {
            var txt = "";
            for (var i=0; i<this.mic_levels.length; i++) {
                txt += "mic" + (i+1) + ": " + Math.round(this.mic_levels[i]) + ", ";
            }
            //this.span.text(JSON.stringify(this.mic_levels));
            this.span.text(txt);
        }
    };

    function LocationConfig() {
        this.locations = null;

        $.ajax({
            type: "GET",
            url: "/loc_cfg",
            dataType: "json",
            success: function(data) {
                this.locations = data.locations;
                this.computeAzEl();
            }.bind(this),
            error: function(xhr, status, error) {
                console.log("ERROR " + status + " " + error);
            }
        });
    };

    LocationConfig.prototype = {
        constructor: LocationConfig,
        computeAzEl: function() {
            for (var i=0; i<this.locations.length; ++i) {
                var loc = this.locations[i];
                var mag = Math.sqrt(Math.pow(loc.x, 2) 
                        + Math.pow(loc.y, 2) + Math.pow(loc.z, 2));
                var az = Math.atan2(loc.y, loc.x);
                var el = Math.PI/2 - Math.acos(loc.z/mag);
                this.locations[i].az = az;
                this.locations[i].el = el;
            }
        }
    };

    function LocationState(attachObj) {
        this.locDiv = $("<div>", {id: "locDiv", style: "color:blue;"});
        attachObj.append(this.locDiv);
        this.hotDiv = $("<div>", {id: "locHotDiv", style: "color:green;"});
        attachObj.append(this.hotDiv);
        var host = window.location.host;
        this.config = new LocationConfig();
        this.data = null;
        this.hotphraseData = null;
        this.socket = new WebSocket("ws://"+host+"/detection");
        this.socket.onopen = function() {
            console.log("Location state socket open");
        };
        this.socket.onmessage = function(msg) {
            if (!this.config.locations) {
                console.log("Warning: No locations yet...");
                return;
            }

            var data = JSON.parse(msg.data);

            function dataToStr(data) {
                var txt = "TS: " + JSON.stringify(data.ts);
                for (var ii=0; ii<data.location.possibilities.length; ++ii) {
                    txt += " { ";
                    var l = data.location.possibilities[ii];
                    var loc = l.position;
                    var cfd = l.confidence;
                    var mag = Math.sqrt(Math.pow(loc.x, 2) 
                            + Math.pow(loc.y, 2) + Math.pow(loc.z, 2));
                    var az = Math.atan2(loc.y, loc.x);
                    var el = Math.PI/2 - Math.acos(loc.z/mag);
                    // az/el to degrees
                    az *= 180/Math.PI;
                    el *= 180/Math.PI;
                    txt += " Ch: " + JSON.stringify(l.channels) 
                        + " Loc: [" 
                        + loc.x.toFixed(2) + "," 
                        + loc.y.toFixed(2) + "," 
                        + loc.z.toFixed(2) + "]" 
                        + " Conf: " + cfd.toFixed(2) 
                        + " Az: " + az.toFixed(2) + " deg" 
                        + " El: " + el.toFixed(2) + " deg"
                        + " ";
                    txt += " } ";
                }
                return txt;
            };

            function dataToChannels(data) {
                var channels = [];
                for (var ii=0; ii<data.location.possibilities.length; ++ii) {
                    var l = data.location.possibilities[ii];
                    Array.prototype.push.apply(channels, l.channels);
                }
                return channels;
            };

            if (data.type == "near_talker") {
                this.locDiv.text(dataToStr(data));
                this.data = data;
                setWorldWinner(dataToChannels(data));
                // XXX HACK. Using the fact that we always get near_talker
                // events to expire hotphrase events
                if (this.hotphraseData) {
                    if ((data.ts[0] - this.hotphraseData.ts[0]) > 9) {
                        setHotphraseWinner([]);
                    }
                }
            } else if (data.type == "hotphrase") {
                this.hotDiv.text(dataToStr(data));
                this.hotphraseData = data;
                console.log("ASR event:", data);
                setHotphraseWinner(dataToChannels(data));
            } else if (data.type == "speaker_id") {
                console.log("LocationState: got speaker_id:", data);
            } else {
                console.log("LocationState: Unexpected type:", data.type);
            }

        }.bind(this);
        this.socket.onclose = function() {
            console.log("Location state socket close");
        }
    };

    function FilterState(attachObj) {
        this.stateBox = $("#filterState");
        this.canvas = $("#filterCanvas");
        this.width = this.canvas.width();
        this.height = this.canvas.height();
        this.ctx = this.canvas[0].getContext("2d");
        this.radius = 20;
        this.info = null;
        this.state = null;

        this.getInfo();
        this.getState();
    };

    FilterState.prototype = {
        constructor: FilterState,
        fixAngle: function(angle) {
            return Math.PI - angle;
        },
        drawCircle: function() {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.translate(this.width/2, this.height/2);
            this.ctx.strokeStyle = "#000000";
            this.ctx.fillStyle = "#000000";
            this.ctx.arc(0, 0, this.radius, 0, 2*Math.PI);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();
        },
        drawCone: function(center, range) {
            var length = Math.min(this.width, this.height) * 0.5;

            // port edge
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.translate(this.width/2, this.height/2);
            this.ctx.rotate(this.fixAngle(center+range/2));
            this.ctx.strokeStyle = "#FF0000";
            this.ctx.fillStyle = "#FF0000";
            this.ctx.moveTo(this.radius, 1);
            this.ctx.lineTo(length, 1);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();

            // starboard edge
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.translate(this.width/2, this.height/2);
            this.ctx.rotate(this.fixAngle(center-range/2));
            this.ctx.strokeStyle = "#00FF00";
            this.ctx.fillStyle = "#00FF00";
            this.ctx.moveTo(this.radius, -1);
            this.ctx.lineTo(length, -1);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();
        },
        draw: function() {
            this.ctx.clearRect(0, 0, this.width, this.height);
            this.drawCircle();
            if (this.info !== null && this.state !== null) {
                var beam = this.info.beams[this.state.selection];
                var center = beam.center;
                var range = beam.range;
                this.drawCone(center, range);

                var str = "Beam selected: " + this.state.selection;
                if (this.state.manual_override) {
                    str += " (manual)";
                } else {
                    str += " (auto)";
                }
                str += ", center: " + center + ", range: " + range;
                this.stateBox.text(str);
            }
        },
        getInfo: function() {
            // only need info once
            $.ajax({
                type: "GET",
                url: "/beam/info",
                dataType: "json",
                success: function(data) {
                    this.info = data;
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                    setTimeout(getInfo.bind(this), 1000);
                }.bind(this)
            });
        },
        getState: function() {
            // get state repeatedly
            $.ajax({
                type: "GET",
                url: "/beam/state",
                dataType: "json",
                success: function(data) {
                    this.state = data;
                    window.requestAnimationFrame(
                            function() { this.draw(); }.bind(this));
                    setTimeout(function() { this.getState(); }.bind(this), 100);
                }.bind(this),
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                    setTimeout(function() { this.getState(); }.bind(this), 100);
                }.bind(this)
            });
        }
    };

    function EnergyState(attachObj) {
        this.text = $("<textarea>", {
            rows: 15, cols: 30, spellcheck: false, readOnly: true, value: ""
        });
        attachObj.append(this.text);

        this.canvas = $("<canvas>", {
            id: "energyCanvas", style: "border:1px solid #000000;"
        });
        this.canvas.prop({width: 200, height: 200});
        attachObj.append(this.canvas);

        this.width = this.canvas.width();
        this.height = this.canvas.height();
        this.ctx = this.canvas[0].getContext("2d");
        this.data = null;
        var host = window.location.host;
        var uri = "/input_energy";
        this.socket = new WebSocket("ws://"+host+uri);
        this.socket.onopen = function() {
            console.log(uri + " socket open!");
        };
        this.socket.onmessage = function(msg) {
            this.data = JSON.parse(msg.data);
            this.text.text(JSON.stringify(this.data, null, 2));
            this.drawCanvas();
        }.bind(this);
        this.socket.onclose = function() {
            console.log(uri + " socket close!");
        };
    };

    EnergyState.prototype = {
        constructor: EnergyState,
        drawCanvas: function() {
            this.ctx.clearRect(0, 0, this.width, this.height);
            function filt(db) {
                var filt_db = 3;
                return 100 + Math.round(db/filt_db)*filt_db;
            };
            this.drawCircle(filt(this.data.db_rms), "#000000");
            this.drawCircle(filt(this.data.db_low), "#0000a0");
            this.drawCircle(filt(this.data.db_mid), "#00a000");
            this.drawCircle(filt(this.data.db_high), "#a00000");
        },
        drawCircle: function(radius, color) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.translate(this.width/2, this.height/2);
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = "#000000";
            this.ctx.arc(0, 0, radius, 0, 2*Math.PI);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();
        }
    };

    function Errors(attachObj) {
        this.text = $("<textarea>", {
            rows: 10, cols: 80, spellcheck: false, readOnly: true, value: ""
        });
        var this_ = this;
        attachObj.append(this.text);
        function doIt() {
            $.ajax({
                type: "GET",
                url: "/_M_/errors",
                dataType: "json",
                success: function(data) {
                    var dout = {};
                    for (var ii=0; ii<data.entries.length; ++ii) {
                        ee = data.entries[ii];
                        dout[ee.key] = ee.value.count;
                    }
                    this_.text.text(JSON.stringify(dout, null, 2));
                },
                error: function(xhr, status, error) {
                    console.log("ERROR " + status + " " + error);
                }
            });
        }
        doIt();
        setInterval(doIt, 4000);
    };

    function StreamState(attachObj) {
        this.text = $("<textarea>", {
            rows: 15, cols: 30, spellcheck: false, readOnly: true, value: ""
        });
        attachObj.append(this.text);

        var host = window.location.host;
        var uri = "/stream_state";
        this.socket = new WebSocket("ws://"+host+uri);
        this.socket.onopen = function() {
            console.log(uri + " socket open!");
        };
        this.socket.onmessage = function(msg) {
            this.data = JSON.parse(msg.data);
            this.text.text(JSON.stringify(this.data, null, 2));
        }.bind(this);
        this.socket.onclose = function() {
            console.log(uri + " socket close!");
        };
    };

    return {
        SEDiag: SEDiag,
        SEDiags: SEDiags,
        Mode : Mode,
        Log : Log,
        AudioPlot: AudioPlot,
        PlotControls: PlotControls,
        MixerControls: MixerControls,
        SEDebugControls: SEDebugControls,
        LevelState: LevelState,
        LocationConfig: LocationConfig,
        LocationState: LocationState,
        FilterState: FilterState,
        EnergyState: EnergyState,
        Errors: Errors,
        StreamState: StreamState
    };
})(jQuery);
