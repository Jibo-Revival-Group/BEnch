HealthGUI = function(div){
    var root = div;
    
    //=====================================
    // Heading
    var heading = document.createElement("h2");
    heading.textContent = "Health Monitor";
    
    var textareaWebsocket = document.createElement("textarea");
    textareaWebsocket.rows = 20;
    textareaWebsocket.cols = 60;
    textareaWebsocket.spellcheck = false;
    textareaWebsocket.readOnly = true;
    textareaWebsocket.disabled = true;
    
    var textareaResponse = document.createElement("textarea");
    textareaResponse.rows = 20;
    textareaResponse.cols = 60;
    textareaResponse.spellcheck = false;
    textareaResponse.readOnly = true;
    textareaResponse.disabled = true;
    
    var buttonConnect = document.createElement("button");
    buttonConnect.textContent = "Connect";
    var buttonDisconnect = document.createElement("button");
    buttonDisconnect.textContent = "Disconnect";
    
    var buttonGet = document.createElement("button");
    buttonGet.textContent = "Get Health";
    buttonGet.onclick = function() {
        var url = "http://"+window.location.host+"/health"
        var jqxhr = $.get(url,function(obj){
            textareaResponse.value = JSON.stringify(obj, null, 2);
        });
        jqxhr.done(function(msg){ });
        jqxhr.fail(function(msg){
            textareaResponse.value = 
                jqxhr.status + " " + jqxhr.statusText;
        });
        jqxhr.always(function(msg){ });
    };
    
    var socketEntries = null;
    var socketCodes = null;
    var connect = function() {
        socketEntries = new WebSocket(
            "ws://" + window.location.host + "/health/status");
        socketEntries.onopen = function() {
        }
        socketEntries.onmessage = function(msg) {
            try{
                var obj = JSON.parse(msg.data);
                textareaWebsocket.value = JSON.stringify(obj, null, 2);
            } catch(err){
                textareaWebsocket.value = err;
            }
        }
        socketEntries.onerror = function() { }
        socketEntries.onclose = function() {
            setTimeout(function() { connect(); }, 1000);
        }
    }
    var disconnect = function() {
        if (socketEntries == null)
            return;
        socketEntries.onclose = function() {};
        socketEntries.close();
        socketEntries = null;
    };
    
    buttonConnect.onclick = function() {
        disconnect();
        connect();
    };
    
    buttonDisconnect.onclick = function() {
        disconnect();
    };
    buttonConnect.click();

    root.appendChild(heading);
    root.appendChild(document.createElement("br"));
    root.appendChild(buttonConnect);
    root.appendChild(buttonDisconnect);
    root.appendChild(buttonGet);
    root.appendChild(document.createElement("br"));
    root.appendChild(textareaWebsocket);
    root.appendChild(textareaResponse);
};

ErrorBusGUI = function(div){
    var root = div;
    
    //=====================================
    // Heading
    var heading = document.createElement("h2");
    heading.textContent = "Error Bus";
    
    var textareaEntries = document.createElement("textarea");
    textareaEntries.rows = 20;
    textareaEntries.cols = 60;
    textareaEntries.spellcheck = false;
    textareaEntries.readOnly = true;
    textareaEntries.disabled = true;
    
    var textareaCodes = document.createElement("textarea");
    textareaCodes.rows = 20;
    textareaCodes.cols = 60;
    textareaCodes.spellcheck = false;
    textareaCodes.readOnly = true;
    textareaCodes.disabled = true;
    
    var buttonStartListening = document.createElement("button");
    buttonStartListening.textContent = "Start Listening";
    var buttonStopListening = document.createElement("button");
    buttonStopListening.textContent = "Stop Listening";
    
    var socketEntries = null;
    var socketCodes = null;
    var connect = function() {
        socketEntries = new WebSocket(
            "ws://" + window.location.host + "/errors/list");
        socketEntries.onopen = function() {
        }
        socketEntries.onmessage = function(msg) {
            try{
                var obj = JSON.parse(msg.data);
                textareaEntries.value = JSON.stringify(obj, null, 2);
            } catch(err){
                textareaEntries.value = err;
            }
        }
        socketEntries.onerror = function() { }
        socketEntries.onclose = function() {
            setTimeout(function() { connect(); }, 1000);
        }
        
        socketCodes = new WebSocket(
            "ws://" + window.location.host + "/errors/codes");
        socketCodes.onopen = function() {
        }
        socketCodes.onmessage = function(msg) {
            try{
                var obj = JSON.parse(msg.data);
                textareaCodes.value = JSON.stringify(obj, null, 2);
            } catch(err){
                textareaCodes.value = err;
            }
        }
        socketCodes.onerror = function() { }
        socketCodes.onclose = function() {
            setTimeout(function() { connect(); }, 1000);
        }
    }
    var disconnect = function() {
        if (socketEntries == null)
            return;
        socketEntries.onclose = function() {};
        socketEntries.close();
        socketEntries = null;
        
        if (socketCodes == null)
            return;
        socketCodes.onclose = function() {};
        socketCodes.close();
        socketCodes = null;
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
    root.appendChild(textareaEntries);
    root.appendChild(textareaCodes);
};

//=============================================================================
// StorageGUI
StorageGUI = function(div){
    this.div = div;

    // Dynamically generate directory size plot
    function genStoragePlot(storage_data) {
        // http://www.chartjs.org/docs/#bar-chart-introduction
        var ctx = document.getElementById("storageChart").getContext("2d");
        var myPieChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["Jibo", "Knowledge", "Photos", "Recordings", "Skills", "tmp"],
                datasets: [{
                    label: 'Size of directories (in MB)',
                    data: [
                        storage_data.usage[0].size / 1024.0 / 1024.0,
                        storage_data.usage[1].size / 1024.0 / 1024.0,
                        storage_data.usage[2].size / 1024.0 / 1024.0,
                        storage_data.usage[3].size / 1024.0 / 1024.0,
                        storage_data.usage[4].size / 1024.0 / 1024.0,
                        storage_data.usage[5].size / 1024.0 / 1024.0],
                    backgroundColor: [
                        '#5E47D1',
                        '#DF362F',
                        '#FBC230',
                        '#6BC137',
                        '#FF8921',
                        '#1CC1D9'
                    ],
                    borderColor: [
                        '#EB0032',
                        '#6BC137',
                        '#8952D6',
                        '#495361',
                        '#3C78D6',
                        '#00AB75'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero:true
                        }
                    }]
                }
            }
        });
    }

    // Dynamically generate mount size plot
    function genMountPlot(mount_data) {
        // http://www.chartjs.org/docs/#bar-chart-introduction
        var temp = mount_data.mounts;

        var ctx = document.getElementById("mountChart").getContext("2d");
        var myPieChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [String(temp[0].name)+", "+String(temp[0].path),
                        String(temp[1].name)+", "+String(temp[1].path),
                        String(temp[2].name)+", "+String(temp[2].path),
			            String(temp[5].name)+", "+String(temp[5].path),
			            String(temp[7].name)+", "+String(temp[7].path),
			            String(temp[8].name)+", "+String(temp[8].path),
			            String(temp[9].name)+", "+String(temp[9].path),
			            String(temp[10].name)+", "+String(temp[10].path)],
                datasets: [{
                    label: 'Free space on mounts (in GB)',
                    data: [
                        temp[0].free / 1024.0 / 1024.0 / 1000.0,
                        temp[1].free / 1024.0 / 1024.0 / 1000.0,
			            temp[2].free / 1024.0 / 1024.0 / 1000.0,
			            temp[5].free / 1024.0 / 1024.0 / 1000.0,
			            temp[7].free / 1024.0 / 1024.0 / 1000.0,
			            temp[8].free / 1024.0 / 1024.0 / 1000.0,
			            temp[9].free / 1024.0 / 1024.0 / 1000.0,
			            temp[10].free / 1024.0 / 1024.0 / 1000.0],
                    backgroundColor: [
                        '#5E47D1',
                        '#8952D6',
			            '#AD2B80',
			            '#FD362F',
			            '#FF5B24',
			            '#FF8921',
			            '#3C78D6',
			            '#00AB75'
                    ],
                    borderColor: [
                        '#FBC230',
                        '#8EDD40',
			            '#6BC137',
			            '#FF8921',
			            '#FF5B24',
			            '#FD362F',
			            '#EB0032',
			            '#FC2D80'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero:true
                        }
                    }]
                }
            }
        });
    }

    // Here, we generate a new HTTP request which
    // Queries the semantic memory API and gets the JSON data
    // At which asynchronous point, the chart above is
    // Dynamically generated
    var storage_request = new XMLHttpRequest();
    var storage_url = "http://"+window.location.host+"/storage/semantic";
    storage_request.open("GET", storage_url, true);
    storage_request.send();
    storage_request.onreadystatechange = function () {
        if(storage_request.readyState == 4 &&
            storage_request.status == 200) {
            // Send data to function to generate plot
            genStoragePlot(JSON.parse(storage_request.responseText));
        }
    };

    // Here, we generate a new HTTP request which
    // Queries the mount size API and gets the JSON data
    // At which asynchronous point, the chart above is
    // Dynamically generated
    var mount_request = new XMLHttpRequest();
    var mount_url = "http://"+window.location.host+"/storage/mounts";
    mount_request.open("GET", mount_url, true);
    mount_request.send();
    mount_request.onreadystatechange = function() {
        if(mount_request.readyState == 4 &&
            mount_request.status == 200){
            //send data to generate plot
            genMountPlot(JSON.parse(mount_request.responseText));
        }
    };
}

//=============================================================================
// Load Average GUI
LoadAverageGUI = function(div){
    this.div = div;

    var loadavg_socket = null;
    var buttonLoadAvg = document.getElementById("loadAverageButtonConnect");
    var buttonLoadDisc = document.getElementById("loadAverageButtonDisconnect");

    buttonLoadAvg.pressed = false;

    // Plot load average data
    function genLoadAvgPlot(loadavg_data) {

        var delay_ratio = document.getElementById("delay_ratio");
        delay_ratio.innerHTML = "Delay ratio: " + loadavg_data.delay_ratio;

        //dataPoint
        var dataList = [];
        for(var i = 0; i < loadavg_data.listsize; i++){
            dataList.push({
                x:loadavg_data.xvalList[i],
                y:loadavg_data.loadavgList[i][0]
            });
        }

        var ctx = document.getElementById("loadAverageChart");
        CanvasJS.addColorSet("JiboColors",
                [
                    "#1CC1D9",
                    "#5E47D1",
                    "#3C78D6"
                ]);

        var chart = new CanvasJS.Chart(ctx, {
            title:{
                text: "Load Average Plot"
            },
            colorSet: "JiboColors",
            data: [{
                type: "line",
                dataPoints: dataList
            }],
            axisX:{
                suffix: "s"
            },
            width: 1000
        });
        chart.render();
    }

    buttonLoadAvg.onclick = function() {
        if(!buttonLoadAvg.pressed){
            buttonLoadAvg.pressed = true;
            console.log("Load average clicked button");
            loadavg_socket = new WebSocket("ws://"+window.location.host+"/info/loadavg");

            loadavg_socket.onopen = function() {
                console.log("Load average socket open");
            }

            loadavg_socket.onmessage = function(msg) {
                try {
                    var obj = JSON.parse(msg.data);
                    genLoadAvgPlot(obj);

                } catch (err) {
                    console.log(err);
                }
            }

            loadavg_socket.onerror = function() {
                console.log("Load average socket error");
            }
            loadavg_socket.onclose = function() {
                console.log("Load average socket closed");
                buttonLoadAvg.pressed = false;
            }
        }
    };

    buttonLoadDisc.onclick = function() {
        console.log("Load average socket disconnect");
        loadavg_socket.close();
    }

}

//=============================================================================
// Memory Usage GUI
MemoryUsageGUI = function(div){
    this.div = div;

    var memusage_socket = null;
    var buttonMemUsage = document.getElementById("memoryUsageButtonConnect");
    var buttonMemDisc = document.getElementById("memoryUsageButtonDisconnect");

    buttonMemUsage.pressed = false;

    var dataList_freeram = [];
    var dataList_bufferram = [];

    //plot memory usage function data
    function genMemUsagePlot(memusage_data,
                            dataList_freeram,
                            datalist_buferram) {

        //limit length of lists to 2 minutes of data
        if(dataList_freeram.length > 120) {
            dataList_freeram.shift();
        }
        if(dataList_bufferram.length > 120) {
            dataList_bufferram.shift();
        }

        //cache x value to access only once
        var xval = memusage_data.x;

        //push data to lists before plotting
        dataList_freeram.push({
            x: xval,
            y: memusage_data.freeram / 1024.0 / 1024.0
        });

        dataList_bufferram.push({
            x: xval,
            y: memusage_data.bufferram / 1024.0 / 1024.0
        });

        var ctx = document.getElementById("memoryUsageChart");
        CanvasJS.addColorSet("JiboColors",
                [
                    "#1CC1D9",
                    "#5E47D1",
                    "#3C78D6"
                ]);

        var chart = new CanvasJS.Chart(ctx, {
            title: {
                text: "Available Memory Plot"
            },
            colorSet: "JiboColors",
            axisX: {
                suffix: "s"
            },
            axisY: {
                suffix: " MB"
            },
            data: [
            {
                type: "line",
                name: "Free RAM (available)",
                showInLegend: true,
                dataPoints: dataList_freeram
            },
            {
                type: "line",
                name: "Buffer RAM (available)",
                showInLegend: true,
                dataPoints: dataList_bufferram
            }
            ],
            width: 1000
        });
        chart.render();
    }

    buttonMemUsage.onclick = function() {
        if(!buttonMemUsage.pressed){
            buttonMemUsage.pressed = true;
            console.log("Memory usage clicked button");
            memusage_socket = new WebSocket("ws://"+window.location.host+"/info/memory");

            memusage_socket.onopen = function() {
                console.log("Memory usage socket open");
            }

            memusage_socket.onmessage = function(msg) {
                try {
                    var obj = JSON.parse(msg.data);
                    genMemUsagePlot(obj,
                                dataList_freeram,
                                dataList_bufferram);
                } catch (err) {
                    console.log(err);
                }
            }

            memusage_socket.onerror = function() {
                console.log("Memory usage socket error");
            }

            memusage_socket.onclose = function() {
                console.log("Memory usage socket closed");
                buttonMemUsage.pressed = false;
            }
        }
    };

    buttonMemDisc.onclick = function() {
        console.log("Memory usage socket disconnect");
        memusage_socket.close();

        //clear data
        dataList_freeram = [];
        dataList_bufferram = [];
    }
}

//=============================================================================
// CPU Usage GUI
CPUUsageGUI = function(div) {
    this.div = div;

    var cpuusage_socket = null;
    var buttonCPUUsage = document.getElementById("CPUUsageButtonConnect");
    var buttonCPUDisc = document.getElementById("CPUUsageButtonDisconnect");

    var cpuinfo_cur_freq = document.getElementById("cpu2");
    var cpuinfo_max_freq = document.getElementById("cpu1");
    var cpuinfo_min_freq = document.getElementById("cpu3");
    var scaling_cur_freq = document.getElementById("cpu6");
    var scaling_governor = document.getElementById("cpu4");
    var scaling_max_freq = document.getElementById("cpu5");
    var scaling_min_freq = document.getElementById("cpu7");
    var gpu_max_freq = document.getElementById("gpu_freq1");
    var gpu_cur_freq_p = document.getElementById("gpu_freq2");
    var gpu_min_freq = document.getElementById("gpu_freq3");

    buttonCPUUsage.pressed = false;

    var total_jiffies_1 = [0,0,0,0,0];
    var total_jiffies_2 = [0,0,0,0,0];
    var work_jiffies_1 = [0,0,0,0,0];
    var work_jiffies_2 = [0,0,0,0,0];

    var dataList0 = [];
    var dataList1 = [];
    var dataList2 = [];
    var dataList3 = [];
    var dataList4 = [];

    var cpu_scaling_freq = [];
    var gpu_cur_freq = [];
    var gpu_util = [];

    function genCPUStatsPlot(cpustats_data,
                        cpu_scaling_freq,
                        gpu_cur_freq,
                        gpu_util){

        var cpu_stats = cpustats_data.cpu_stats;
        var gpu_stats = cpustats_data.gpu_freq;
        var gpu_util_val  = cpustats_data.gpu_util;

        cpuinfo_cur_freq.innerHTML = "CPU current frequency: " +
            parseInt(cpu_stats[0].cpuinfo_cur_freq)/1000 + "MHz";
        cpuinfo_max_freq.innerHTML = "CPU max frequency: 2.22GHz";
        cpuinfo_min_freq.innerHTML = "CPU min frequency: 51MHz";
        scaling_cur_freq.innerHTML = "CPU current scaling frequency: " +
            parseInt(cpu_stats[0].scaling_cur_freq)/1000 + "MHz";
        scaling_governor.innerHTML = "CPU scaling governor: " +
            cpu_stats[0].scaling_governor;
        scaling_max_freq.innerHTML = "CPU scaling max frequency: 1.94GHz";
        scaling_min_freq.innerHTML = "CPU scaling min frequency: 312MHz";
        gpu_max_freq.innerHTML = "GPU max frequency: 852MHz";
        gpu_cur_freq_p.innerHTML = "GPU current frequency: " +
            parseInt(gpu_stats)/1000.0/1000.0 + "MHz";
        gpu_min_freq.innerHTML = "GPU min frequency: 72 MHz";

        var scaling_frequency_mhz = parseInt(cpu_stats[0].scaling_cur_freq)/1000;
        var gpu_frequency_mhz = parseInt(gpu_stats)/1000.0/1000.0;
        var gpu_util_const = parseInt(gpu_util_val);

        var xval = cpustats_data.x;

        if(cpu_scaling_freq.length > 120){
            cpu_scaling_freq.shift();
        }
        if(gpu_cur_freq.length > 120){
            gpu_cur_freq.shift();
        }
        if(gpu_util.length > 120){
            gpu_util.shift();
        }

        cpu_scaling_freq.push({
            x: xval,
            y: scaling_frequency_mhz
        });

        gpu_cur_freq.push({
            x: xval,
            y: gpu_frequency_mhz
        });

        gpu_util.push({
            x: xval,
            y: gpu_util_const
        });

        var ctx = document.getElementById("cpuStatsChart");

        CanvasJS.addColorSet("JiboColors",
            [
                "#1CC1D9",
                "#5E47D1"
            ]);

        var chart = new CanvasJS.Chart(ctx, {
            title: {
                text: "CPU Scaling/GPU Frequency"
            },
            colorSet: "JiboColors",
            axisX: {
                suffix: "s"
            },
            axisY: {
                suffix: "MHz"
            },
            data: [
            {
                type: "line",
                name: "CPU scaling frequency",
                showInLegend: true,
                dataPoints: cpu_scaling_freq
            },
            {
                type: "line",
                name: "GPU frequency",
                showInLegend: true,
                dataPoints: gpu_cur_freq
            }
            ],
            width: 900
        });

        chart.render();

        var ctx2 = document.getElementById("gpuUtilChart");

        var chart2 = new CanvasJS.Chart(ctx2, {
        
            title: {
                text: "GPU Utilization"
            },
            colorSet: "JiboColors",
            axisX: {
                suffix: "s"
            },
            data: [
            {
                type: "line",
                name: "GPU utilizaztion",
                showInLegend: true,
                dataPoints: gpu_util
            }
            ],
            width: 900
        });
        chart2.render();
    }


    function genCPUUsagePlot(cpuusage_data,
                            total_jiffies_1,
                            total_jiffies_2,
                            work_jiffies_1,
                            work_jiffies_2,
                            dataList0,
                            datalist1,
                            dataList2,
                            dataList3,
                            dataList4){

        var cpu_data = cpuusage_data.cpu_usage.split(",");

        var work_over_period = [0,0,0,0,0];
        var total_over_period = [0,0,0,0,0];
        var cpu_perc = [0,0,0,0,0];

        for(var i = 0; i < 5; i++){
            var split_data = cpu_data[i].split(/\ +/);

            var sum_tot = 0;
            for(var j = 1; j < 8; j++){
                sum_tot += parseInt(split_data[j]);
            }

            var sum_work = 0;
            for(var k = 1; k < 4; k++){
                sum_work += parseInt(split_data[k]);
            }

            total_jiffies_2[i] = sum_tot;
            work_jiffies_2[i] = sum_work;

            work_over_period[i] = work_jiffies_2[i] - work_jiffies_1[i];
            total_over_period[i] = total_jiffies_2[i] - total_jiffies_1[i];

            cpu_perc[i] = 1.0 * work_over_period[i] / total_over_period[i] * 100.0;

            work_jiffies_1[i] = work_jiffies_2[i];
            total_jiffies_1[i] = total_jiffies_2[i];
        }
        var xval = cpuusage_data.x;

        if(dataList0.length > 120) {
            dataList0.shift();
        }
        if(dataList1.length > 120) {
            dataList1.shift();
        }
        if(dataList2.length > 120) {
            dataList2.shift();
        }
        if(dataList3.length > 120) {
            dataList3.shift();
        }
        if(dataList4.length > 120) {
            dataList4.shift();
        }
        dataList0.push({
            x: xval,
            y: cpu_perc[0]
        });
        dataList1.push({
            x: xval,
            y: cpu_perc[1]
        });
        dataList2.push({
            x: xval,
            y: cpu_perc[2]
        });
        dataList3.push({
            x: xval,
            y: cpu_perc[3]
        });
        dataList4.push({
            x: xval,
            y: cpu_perc[4]
        });

        var ctx = document.getElementById("cpuUsageChart");

        CanvasJS.addColorSet("JiboColors",
                [
                    "#1CC1D9",
                    "#5E47D1",
                    "#3C78D6",
                    "#FC2D80",
                    "#00AB75"
                ]);

        var chart = new CanvasJS.Chart(ctx, {
            title: {
                text: "CPU Usage Plot"
            },
            colorSet: "JiboColors",
            axisX: {
                suffix: "s"
            },
            data: [
            {
                type: "line",
                name: "CPU total",
                showInLegend: true,
                dataPoints: dataList0
            },
            {
                type: "line",
                name: "CPU 0",
                showInLegend: true,
                dataPoints: dataList1
            },
            {
                type: "line",
                name: "CPU 1",
                showInLegend: true,
                dataPoints: dataList2
            },
            {
                type: "line",
                name: "CPU 2",
                showInLegend: true,
                dataPoints: dataList3
            },
            {
                type: "line",
                name: "CPU 3",
                showInLegend: true,
                dataPoints: dataList4
            }
           ],
            width: 900
        });

        chart.render();
    }

    buttonCPUUsage.onclick = function() {
        if(!buttonCPUUsage.pressed){
            buttonCPUUsage.pressed = true;
            //clear data
            total_jiffies_1 = [];
            total_jiffies_2 = [];
            work_jiffies_1 = [];
            work_jiffies_2 = [];
            dataList0 = [];
            dataList1 = [];
            dataList2 = [];
            dataList3 = [];
            dataList4 = [];
            cpu_scaling_freq = [];
            gpu_cur_freq = [];
            gpu_util = [];

            console.log("CPU usage clicked button");
            cpuusage_socket = new WebSocket("ws://"+window.location.host+"/info/cpu");

            cpuusage_socket.onopen = function() {
                console.log("CPU usage socket open");
            }

            cpuusage_socket.onmessage = function(msg) {
                try {
                    var obj = JSON.parse(msg.data);

                    genCPUStatsPlot(obj,
                                    cpu_scaling_freq,
                                    gpu_cur_freq,
                                    gpu_util);

                    genCPUUsagePlot(obj,
                                total_jiffies_1,
                                total_jiffies_2,
                                work_jiffies_1,
                                work_jiffies_2,
                                dataList0,
                                dataList1,
                                dataList2,
                                dataList3,
                                dataList4);
                } catch (err) {
                    console.log(err);
                }
            }

            cpuusage_socket.onerror = function() {
                console.log("CPU usage socket error");
            }

            cpuusage_socket.onclose = function() {
                console.log("CPU usage socket closed");
                buttonCPUUsage.pressed = false;
            }
        }
    };

    buttonCPUDisc.onclick = function() {
        console.log("CPU usage socket disconnect");
        cpuusage_socket.close();
        //clear data
        total_jiffies_1 = [];
        total_jiffies_2 = [];
        work_jiffies_1 = [];
        work_jiffies_2 = [];
        dataList0 = [];
        dataList1 = [];
        dataList2 = [];
        dataList3 = [];
        dataList4 = [];
    }
}

//=============================================================================
// NetworkLoad GUI
NetworkLoadGUI = function(div){
    this.div = div;

    var network_socket = null;
    var buttonNetworkLoad = document.getElementById("NetworkLoadConnect");
    var buttonNetworkDisc = document.getElementById("NetworkLoadDisconnect");

    buttonNetworkLoad.pressed = false;

    var dataList_wlan0r = [];
    var datalist_eth0r = [];
    var dataList_wlan0t = [];
    var dataList_eth0t = [];

    // wsendcurr wsendprev wtranscurr wtransprev,
    // esendcurr esendprev etranscurr etransprev, firstPlot
    var wlan0eth0 = [0,0,0,0,0,0,0,0,1];

    // plot network load data
    function genNetworkLoadPlot(networkload_data,
                                dataList_wlan0r,
                                dataList_eth0r,
                                dataList_wlan0t,
                                dataList_eth0t,
                                wlan0eth0){
        var network_data = networkload_data.network.split(",");

        var wlan0_curr = 0;
        var eth0_curr = 0;

        for(var i = 0; i < network_data.length; i++){
            var net_obj = network_data[i].trim().split(/\ +/);
            if(net_obj[0] == "wlan0:"){
                wlan0eth0[0] = parseInt(net_obj[1]);
                wlan0eth0[2] = parseInt(net_obj[9]);

            }
            else if(net_obj[0] == "eth0:"){
                wlan0eth0[4] = parseInt(net_obj[1]);
                wlan0eth0[6] = parseInt(net_obj[9]);
            }
        }

        // If first plot, set prev = curr to prevent plot spike
        if(wlan0eth0[8]){
            wlan0eth0[3] = wlan0eth0[2];
            wlan0eth0[1] = wlan0eth0[0];
            wlan0eth0[5] = wlan0eth0[4];
            wlan0eth0[7] = wlan0eth0[6];
            //set to false
            wlan0eth0[8] = 0;
        }
        //calculate difference
        // NOTE: /2.0 becuase sending at 2Hz
        var wlan0_rec = (wlan0eth0[2] - wlan0eth0[3]) / 1024.0 / 1024.0 / 2.0;
        var wlan0_tran = (wlan0eth0[0] - wlan0eth0[1]) / 1024.0 / 1024.0 / 2.0;
        var eth0_rec = (wlan0eth0[4] - wlan0eth0[5]) / 1024.0 / 1024.0 / 2.0;
        var eth0_tran = (wlan0eth0[6] - wlan0eth0[7]) / 1024.0 / 1024.0 / 2.0;

        /*console.log("wlan: rec: " + wlan0_rec.toFixed(3) + 
                    " tran: " + wlan0_tran.toFixed(3));
        console.log("eth: rec: " + eth0_rec.toFixed(3) + 
                    " tran: " + eth0_tran.toFixed(3));
        */
        // /2.0 because sending at 2Hz
        var xval = networkload_data.x / 2.0;

        if(dataList_wlan0r.length > 30){
            dataList_wlan0r.shift();
        }
        if(dataList_eth0r.length > 30){
            dataList_eth0r.shift();
        }
        if(dataList_wlan0t.length > 30){
            dataList_wlan0t.shift();
        }
        if(dataList_eth0t.length > 30){
            dataList_eth0t.shift();
        }

        dataList_wlan0r.push({
            x: xval,
            y: wlan0_tran
        });
        dataList_wlan0t.push({
            x: xval,
            y: wlan0_rec
        });
        dataList_eth0r.push({
            x: xval,
            y: eth0_rec
        });
        dataList_eth0t.push({
            x: xval,
            y: eth0_tran
        });

        var ctx = document.getElementById("networkLoadChart");

        CanvasJS.addColorSet("JiboColors",
                [
                    "#1CC1D9",
                    "#5E47D1",
                    "#3C78D6",
                    "#FC2D80",
                    "#00AB75"
                ]);

        var chart = new CanvasJS.Chart(ctx, {
            title: {
                text: "Network Load Chart"
            },
            colorSet: "JiboColors",
            axisX: {
                suffix: "s"
            },
            axisY: {
                suffix: "MB/s"
            },
            data: [
                {
                    type: "line",
                    showInLegend: true,
                    dataPoints: dataList_wlan0r,
                    name: "wlan0 receive"
                },
                {
                    type: "line",
                    showInLegend: true,
                    dataPoints: dataList_wlan0t,
                    name: "wlan0 transmit"
                },
                {
                    type: "line",
                    showInLegend: true,
                    dataPoints: dataList_eth0r,
                    name: "eth0 receive"
                },
                {
                    type: "line",
                    showInLegend: true,
                    dataPoints: dataList_eth0t,
                    name: "eth0 transmit"
                }
            ],
            width: 900
        });

        chart.render();

        //UPDATE CURR AND PREV VALUES
        wlan0eth0[1] = wlan0eth0[0];
        wlan0eth0[3] = wlan0eth0[2];
        wlan0eth0[5] = wlan0eth0[4];
        wlan0eth0[7] = wlan0eth0[6];
    }

    buttonNetworkLoad.onclick = function() {
        if(!buttonNetworkLoad.pressed){
            buttonNetworkLoad.pressed = true;

            //clear data
            dataList_wlan0r = [];
            dataList_eth0r = [];
            dataList_wlan0t = [];
            dataList = eth0t = [];

            console.log("Network load clicked button");
            network_socket = new WebSocket("ws://"+window.location.host+"/info/network");

            network_socket.onopen = function(){
                console.log("Network load socket open");
            }

            network_socket.onmessage = function(msg) {
                try {
                    var obj = JSON.parse(msg.data);
                    genNetworkLoadPlot(obj,
                                    dataList_wlan0r,
                                    dataList_eth0r,
                                    dataList_wlan0t,
                                    dataList_eth0t,
                                    wlan0eth0);
                } catch(err) {
                    console.log(err);
                }
            }

            network_socket.onerror = function() {
                console.log("Network load socket error");
            }

            network_socket.onclose = function() {
                console.log("Network load socket close");
                buttonNetworkLoad.pressed = false;
            }
        }
    };

    buttonNetworkDisc.onclick = function() {
        console.log("Network load socket disconnect");
        network_socket.close();
        //clear data
        dataList_wlan0r = [];
        dataList_eth0r = [];
        dataList_wlan0t = [];
        dataList_eth0t = [];
    }
}

//=============================================================================
// ProcessList GUI
ProcessListGUI = function(div) {
    this.div = div;

    var process_socket = null;
    var buttonProcessList = document.getElementById("ProcessListConnect");
    var buttonProcessDisc = document.getElementById("ProcessListDisconnect");

    var proc_table = document.getElementById("ProcessListTable");

    buttonProcessList.pressed = false;

    var processDispList = ["jibo", "electron", "pulseaudio"];
    var processMemList = [];
    var memoryList = [];
    var xVal = 0;

    var prev_process_list = [];

    //Plot RSS memory usage for input process
    function plotProcessMem(process_data, memoryList, xVal){
        var processes = process_data.processes;

        var jibo_process_list = [];

        //Currently, only plot one process at a time to track
        // TODO: Future, add ability to plot multiple plots
        var process_to_plot = null;

        //get pids of relevant processes
        for(var i = 0; i < processes.length; i++) {
            for(var j = 0; j < processDispList.length; j++){
                if(processes[i].name.includes(processDispList[j])){
                    jibo_process_list.push(i);
                }
            }
        }

        // jibo_process_list now contains ALL processes running on Jibo
        // and we will now select, for each inputed process to plot the memory
        // the actual process from jibo_process_list
        for(var i = 0; i < processMemList.length; i++){
            for(var k = 0; k < jibo_process_list.length; k++){
                if(processes[jibo_process_list[k]].name.includes(processMemList[i])){
                    //console.log("matched process: " + processes[jibo_process_list[k]].name);
                    process_to_plot = jibo_process_list[k];
                }
            }
        }
        if(process_to_plot != null){

            // Limit to one day of data
            if(memoryList.length > 28800){
                memoryList.shift();
            }
            memoryList.push({
                x: xVal,
                y: processes[process_to_plot].vm_rss / 1024.0
            });

            var ctx = document.getElementById("rssChart");

            CanvasJS.addColorSet("JiboColors",
                [
                    "#1CC1D9",
                    "#5E47D1",
                    "#3C78D6"
                ]);

            var chart = new CanvasJS.Chart(ctx, {
                title: {
                    text: "Process RSS Memory Usage"
                },

                colorSet: "JiboColors",

                axisX: {
                    suffix: "s"
                },
                axisY: {
                    suffix: "MB"
                },
                data: [
                {
                    type: "line",
                    showInLegend: true,
                    dataPoints: memoryList,
                    name: processes[process_to_plot].name
                }
                ],
                width: 900
            });
            chart.render();
        }
    }


    //parse process list information and display
    function displayProcessList(process_data,
                                processDispList,
                                prev_process_list){

        //parse out values from list to display nicely
        var processes = process_data.processes;
        //console.log("length: " + prev_process_list.processes.length);
        if(prev_process_list.processes){
            var prev_processes = prev_process_list.processes;
        }else{return;}

        var jibo_list = [];
        var prev_jibo_list = [];

        //get pids of relevant processes
        for(var i = 0; i < processes.length; i++) {
            for(var j = 0; j < processDispList.length; j++){
                if(processes[i].name.includes(processDispList[j])){
                    // Store desired process in list
                    jibo_list.push(processes[i]);
                }
                if(prev_processes){
                    if(prev_processes[i].name.includes(processDispList[j])){
                        prev_jibo_list.push(prev_processes[i]);    
                    }
                }
            }
        }
        // SORT LIST BY MEMORY
        jibo_list.sort( function (a, b) {
            return b.vm_rss - a.vm_rss
        });
        prev_jibo_list.sort( function (a, b){
            return b.vm_rss - a.vm_rss
        });

        // CLEAR TABLE
        while(proc_table.rows.length > 0) {
            proc_table.deleteRow(0);
        }

        //table heading
        var header = proc_table.createTHead();
        var row = header.insertRow(0);
        row.insertCell(0).innerHTML = "Process name (cmd line arguments)";
        row.insertCell(1).innerHTML = "Memory (Vsize, RSS)";
        row.insertCell(2).innerHTML = "ID (parent ID)";
        row.insertCell(-1).innerHTML = "CPU (%)";

        //iterate over each relevant function and concatenate
        for(var i = 0; i < jibo_list.length; i++){

            var proc_row = proc_table.insertRow(i+1);

            //NAME
            var p_name = jibo_list[i].name;

            //Insert in table
            var col_name = proc_row.insertCell(0);
            col_name.style.columnWidth = 50;
            col_name.innerHTML = p_name + " (" + 
                jibo_list[i].cmdname + ")";

            //SIZE
            var p_size = jibo_list[i].vsize / 1024.0 / 1024.0;
            p_size = p_size.toFixed(1);

            var rss_size = jibo_list[i].vm_rss /1024.0;
            rss_size = rss_size.toFixed(1);

            //Insert in table
            var col_size = proc_row.insertCell(1);
            col_size.style.columnWidth = "600px";
            col_size.innerHTML = p_size + "MB, " + rss_size + "MB";

            //PROCESS ID
            var p_tid = jibo_list[i].tid;

            //Insert in table
            var col_tid = proc_row.insertCell(2);
            col_tid.style.columnWidth = "400px";
            col_tid.innerHTML = p_tid + " (" + jibo_list[i].ppid + ")";

            //UTIME
            var p_utime = jibo_list[i].utime;

            //Insert in table
            var col_pcpu = proc_row.insertCell(-1);

            //* http://stackoverflow.com/questions/1420426/
            //* calculating-cpu-usage-of-a-process-in-linux/1424556#1424556
            
            //calculate indiv. process time from /proc/PID/stat
            // This value is the summation of individual process
            // time on the CPU, provided by the kernel
            var prev_total_time =  prev_jibo_list[i].utime +
                                    prev_jibo_list[i].stime +
                                    prev_jibo_list[i].cutime +
                                    prev_jibo_list[i].cstime;

            var cur_total_time = jibo_list[i].utime +
                                    jibo_list[i].stime +
                                    jibo_list[i].cutime +
                                    jibo_list[i].cstime;

            //calculate total current jiffies for whole system/CPU
            var curr_tot_jiffies = process_data.total_cpu_jiffies;
            curr_tot_jiffies = curr_tot_jiffies.split(/\ +/);
            var curr_sum = 0;
            for(var j = 1; j < 8; j++){
                curr_sum += parseInt(curr_tot_jiffies[j]);
            }

            //calculate total previous jiffies for whole system/CPU
            var prev_tot_jiffies = prev_process_list.total_cpu_jiffies;
            prev_tot_jiffies = prev_tot_jiffies.split(/\ +/);
            var prev_sum = 0;
            for(var j = 1; j < 8; j++){
                prev_sum += parseInt(prev_tot_jiffies[j]);
            }

            // The percentage for each process is a difference 
            // between the last measurement and current measurement
            // of process "jiffies", divided by the total number of 
            // jiffies (aka fraction of CPU usage)
            var jiff_diff = cur_total_time - prev_total_time;
            var time_diff = curr_sum - prev_sum;

            var cpu_usage = (jiff_diff * 100.0 / time_diff);

            // Multiply by 4 because Jibo is a 4 core system
            cpu_usage = 4.0*cpu_usage.toFixed(1); 
            col_pcpu.innerHTML = cpu_usage;
        }
    }

    var buttonProcessText = document.getElementById("processTextButton");
    var buttonProcMemText = document.getElementById("processMemoryButton");
    var buttonProcMemRemove = document.getElementById("processMemRemoveButton");

    // clear process to plot memory list
    buttonProcMemRemove.onclick = function() {
        processMemList = [];
    }

    // On press, add process to list of processes to plot memory
    buttonProcMemText.onclick = function() {
        var temp = String(document.getElementById("ProcMemText").value);
        if(!processMemList.includes(temp) && temp.length > 0){
            processMemList.push(temp);
            memoryList = [];
        }
    }

    // On press, add process to list of processes to display
    buttonProcessText.onclick = function() {
        var temp = String(document.getElementById("ProcessText").value);
        if(!processDispList.includes(temp) && temp.length > 0){
            processDispList.push(temp);
        }
    }

    buttonProcessList.onclick = function() {
        if(!buttonProcessList.pressed){
            buttonProcessList.pressed = true;

            //clear data

            console.log("Process list clicked button");
            process_socket = new WebSocket("ws://"+window.location.host+"/info/process");

            process_socket.onopen = function(){
                console.log("Process list socket open");
            }

            process_socket.onmessage = function(msg) {
                var obj;
                try {
                    obj = JSON.parse(msg.data);
                    //console.log(obj);
                    xVal = xVal + 3;
                    plotProcessMem(obj,
                            memoryList,
                            xVal);

                    displayProcessList(obj,
                           processDispList,
                           prev_process_list);
                } catch(err) {
                    console.log(err);
                }
                // update from last time;
                prev_process_list = obj;
            }

            process_socket.onerror = function(){
                console.log("Process list socket error");
            }

            process_socket.onclose = function(){
                console.log("Process list socket close");
                buttonProcessList.pressed = false;
            }
        }
    }

    buttonProcessDisc.onclick = function(){
        console.log("Process list socket disconnect");
        process_socket.close();
        while(proc_table.rows.length > 0) {
            proc_table.deleteRow(0);
        }
        processMemList = [];
        memoryList = [];
    }
}
//=============================================================================
// SystemInfoGUI
SystemInfoGUI = function(div) {
    this.div = div;

    var sysInfoButton = document.getElementById("systemInfoButton");
    var sysInfoTable = document.getElementById("systemInfoTable");

    sysInfoButton.onclick = function() {
        while(sysInfoTable.rows.length > 0){
            sysInfoTable.deleteRow(0);
        }
        var temp = document.getElementById("sysInfoTableDiv");
        temp.style.paddingBottom = "0px";
    }

    //Generate logic related to system information API
    function genSystemInfo(sysinfo_data){

        var sys0 = sysinfo_data.sysinfo[0];
        //table heading
        var header = sysInfoTable.createTHead();
        var row = header.insertRow(0);
        row.insertCell(0).innerHTML = "System info name";
        row.insertCell(1).innerHTML = "System info value";

        var row1, row2, row3, row4, row5, row6, row7, row8, row9;
        var  row10, row11, row12, row12, row14, row15, row16, row17;
        var row18;

        var rowList = [row1, row2, row3, row4,
                        row5, row6, row7, row8,
                        row9, row10, row11, row12,
                        row12, row14, row15, row16,
                        row17, row18];

        var infoNameList = ["CPU ID",
                            "MAC address",
                            "/etc/public_key",
                            "/sysfs/public_key",
                            "odm_production_mode",
                            "jtag_disable",
                            "device_key",
                            "ignore_dev_sel_straps",
                            "modalias",
                            "odm_lock",
                            "odm_reserved",
                            "pkc_disable",
                            "sec_boot_dev_cfg",
                            "sec_boot_dev_sel",
                            "secure_boot_key",
                            "sw_reserved",
                            "vp8_enable",
                            "/wlan0/operstate"
                            ];

        var valueList = [sys0.cpu_id,
                        sys0.mac_address,
                        sys0.etc_public_key,
                        sys0.sysfs_public_key,
                        sys0.odm_production_mode,
                        sys0.jtag_disable,
                        sys0.device_key,
                        sys0.ignore_dev_sel_straps,
                        sys0.modalias,
                        sys0.odm_lock,
                        sys0.odm_reserved,
                        sys0.pkc_disable,
                        sys0.sec_boot_dev_cfg,
                        sys0.sec_boot_dev_sel,
                        sys0.secure_boot_key,
                        sys0.sw_reserved,
                        sys0.vp8_enable,
                        sys0.operstate
                        ];

        for(var i = 1; i <= valueList.length; i++){
            rowList[i] = sysInfoTable.insertRow(i);
            rowList[i].insertCell(0).innerHTML = infoNameList[i-1];
            rowList[i].insertCell(1).innerHTML = valueList[i-1];
        }
    }

    // HTTP Request
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
}

//=============================================================================
// PerformanceGUI
PerformanceGUI = function(div) {

    var perfButton = document.getElementById("perfButton");
}

//=============================================================================
// Main Function
$(document).ready(function() {
    var _this = this;

    _this.root = $("#root")[0];

    var div = document.createElement("div");
    _this.SystemInfoGUI = new SystemInfoGUI(div);
    _this.root.appendChild(div);

    var div = document.createElement("div");
    _this.storageGUI = new StorageGUI(div);
    _this.root.appendChild(div);

    var div = document.createElement("div");
    _this.loadAverageGUI = new LoadAverageGUI(div);
    _this.root.appendChild(div);

    var div = document.createElement("div");
    _this.memoryUsageGUI = new MemoryUsageGUI(div);
    _this.root.appendChild(div);

    var div = document.createElement("div");
    _this.cpuUsageGUI = new CPUUsageGUI(div);
    _this.root.appendChild(div);

    var div = document.createElement("div");
    _this.networkLoadGUI = new NetworkLoadGUI(div);
    _this.root.appendChild(div);

    var div = document.createElement("div");
    _this.processListGUI = new ProcessListGUI(div);
    _this.root.appendChild(div);
    
    var div = document.createElement("div");
    _this.healthGUI = new HealthGUI(div);
    _this.root.appendChild(div);
    
    var div = document.createElement("div");
    _this.errorBusGUI = new ErrorBusGUI(div);
    _this.root.appendChild(div);

    var div = document.createElement("div");
    _this.performanceGUI = new PerformanceGUI(div);
    _this.root.appendChild(div);
});
