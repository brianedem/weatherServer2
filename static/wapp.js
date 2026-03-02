    // Model
let data = null;
let weekData = null;

async function weather_refresh() {
    let response = await fetch('weather.data');
    data = await response.json();
    setTimeout(weather_refresh, 5000);
    updateUI();
}
async function weekly_refresh() {
    let response = await fetch('week.data');
    weekData = await response.json();
    setTimeout(weekly_refresh, 3600*1000);
    updateHistoryUI();
}
    // view (kind of)
function updateUI() {
    if (!data) return;

        // update text information
    document.getElementById("date").innerHTML = data.date;
    document.getElementById("temperature").innerHTML = (32+data.temperature*1.8).toFixed(1);
    document.getElementById("temp_low").innerHTML = (32+data.min_temp*1.8).toFixed(1);
    document.getElementById("temp_hi").innerHTML = (32+data.max_temp*1.8).toFixed(1);
    document.getElementById("pressure").innerHTML = data.pressure.toFixed(2);
    document.getElementById("humidity").innerHTML = data.humidity.toFixed(0);
    document.getElementById("rainfall").innerHTML = data.rainfall.toFixed(2);
    document.getElementById("windspeed").innerHTML = data.windspeed.toFixed(0);
    document.getElementById("wind5max").innerHTML = data.wind5max.toFixed(0);
    document.getElementById("direction").innerHTML = data.direction.toFixed(0);
    document.getElementById("battery").innerHTML = data.battery.toFixed(3);
    document.getElementById("rssi").innerHTML = data.rssi.toFixed(1);

        // update guages
    gaugeUpdate('temperature', (32+data.temperature*1.8).toFixed(0));
    gaugeUpdate('humidity', data.humidity.toFixed(0));
    gaugeUpdate('pressure', data.pressure.toFixed(0));
    gaugeUpdate('windspeed', data.windspeed.toFixed(0));
    dirUpdate(data.direction.toFixed(0));
}

function updateHistoryUI() {
    if (!weekData) return;

        // remove existing data - we need to overwrite old data
    if (history.battery.data.getNumberOfRows() > 0) {
        // console.log("removing rows", history.battery.data.getNumberOfRows());
        history.battery.data.removeRows(0, history.battery.data.getNumberOfRows());
        // console.log(history.battery.data.getNumberOfRows());
        history.pressure.data.removeRows(0, history.pressure.data.getNumberOfRows());
        history.temperature.data.removeRows(0, history.temperature.data.getNumberOfRows());
        history.rainfall.data.removeRows(0, history.rainfall.data.getNumberOfRows());
    }

        // update historical charts
    var rainfallSum = 0;
    var rainfallRate = 0;
    var lastRain = null;
    for (var i=0; i<weekData.dates.length; i++) {
        var dateParts = weekData.dates[i].split("-");
        var timeParts = dateParts[2].substr(3).split(":");
        var jsDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2].substr(0,2),timeParts[0],timeParts[1],timeParts[2]);
        history.battery.data.addRows([[jsDate, weekData.batteries[i]]]);
        history.pressure.data.addRows([[jsDate, weekData.pressures[i]]]);
        history.temperature.data.addRows([[jsDate, weekData.temperatures[i]*1.8+32]]);
        rainfallSum += weekData.rainfalls[i];
        if (weekData.rainfalls[i]!=0) {
            if (lastRain) {
                rainfallRate = weekData.rainfalls[i]/(jsDate - lastRain)*1000*60*60;
            }
            lastRain = jsDate;
        }
        if (lastRain && (jsDate-lastRain)>(1000*60*60)) {
            rainfallRate = 0;
            lastRain = null;
        }
        history.rainfall.data.addRows([[jsDate, rainfallSum, rainfallRate]]);
    }
    history.battery.chart.draw(history.battery.data, history.battery.options);
    history.pressure.chart.draw(history.pressure.data, history.pressure.options);
    history.temperature.chart.draw(history.temperature.data, history.temperature.options);
    history.rainfall.chart.draw(history.rainfall.data, history.rainfall.options);
}
    // main code
var gauges = new Object;
var history = new Object;
    // load google charts packages and have load completion asynchronously trigger chart setup
google.charts.load('current', {packages: ['corechart','gauge']});
google.charts.setOnLoadCallback(drawChart);

    // function called after google charts packages have loaded
function drawChart() {
        // weather gauges - temperature
    var data = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['Temp', 70]
    ]);
    var options = {
        width: 400, height:120,
        max: 120, min:-20,
        minorTicks:5
    };
    var chart = new google.visualization.Gauge(document.getElementById('tempGuage'));
    gauges.temperature = {data: data, options: options, chart: chart}

        // weather gauges - humidity
    var data = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['Humidity', 50]
    ]);
    var options = {
        width: 400, height:120,
        minorTicks:5
    };
    var chart = new google.visualization.Gauge(document.getElementById('humidityGuage'));
    gauges.humidity = {data: data, options: options, chart: chart}

        // weather gauges - pressure
    var data = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['Pressure', 1000]
    ]);
    var options = {
        width: 400, height:120,
        //minorTicks:100,
        max: 1100, min:850
    };
    var chart = new google.visualization.Gauge(document.getElementById('pressureGauge'));
    gauges.pressure = {data: data, options: options, chart: chart}

        // weather gauges - windspeed
    var data = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['Windspeed', 5]
    ]);
    var options = {
        width: 400, height:120,
            max: 50, min:0
    };
    var chart = new google.visualization.Gauge(document.getElementById('windspeedGauge'));
    gauges.windspeed = {data: data, options: options, chart: chart}

    weather_refresh();

        // battery voltage history
    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Date');
    data.addColumn('number', 'Voltage');
    var options = {
        width: 800, height:130,
        chartArea: {
            left: "7%",
            top: "4%",
            height: "85%",
            width: "80%"
        },
        hAxis: {
            textPosition: 'none'
        }
    }
    var chart = new google.visualization.LineChart(document.getElementById('battery_history'));
    history.battery = {data: data, options: options, chart: chart};

        // pressure history
    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Date');
    data.addColumn('number', 'Pressure');
    var options = {
        width: 800, height:130,
        chartArea: {
            left: "7%",
            top: "3%",
            height: "85%",
            width: "80%"
        },
        hAxis: {
            textPosition: 'none'
        }
    }
    var chart = new google.visualization.LineChart(document.getElementById('pressure_history'));
    history.pressure = {data: data, options: options, chart: chart};
    
        // temperature history
    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Date');
    data.addColumn('number', 'Temperature');
    var options = {
        width: 800, height:130,
        chartArea: {
            left: "7%",
            top: "3%",
            height: "85%",
            width: "80%"
        },
        hAxis: {
            textPosition: 'none'
        }
    }
    var chart = new google.visualization.LineChart(document.getElementById('temperature_history'));
    history.temperature = {data: data, options: options, chart: chart};
    
        // rainfall history
    var data = new google.visualization.DataTable();
    data.addColumn('datetime', 'Date');
    data.addColumn('number', 'Rainfall');
    data.addColumn('number', 'Rate');
    var options = {
        width: 800, height:200,
        chartArea: {
            left: "7%",
            top: "3%",
            width: "80%"
        },
        hAxis: {
            textPosition: 'none'
        },
        trendlines: {
            1: {        // rate overwrites rainfall - make less significant
                lineWidth: 1,   // default is 2
                opacity: 0.5    // default is 1.0 (opaque)
            }
        },
        hAxis: {
            format: 'E',
            showTextEvery: 4
        }
    }
    var chart = new google.visualization.LineChart(document.getElementById('rainfall_history'));
    history.rainfall = {data: data, options: options, chart: chart};

    weekly_refresh();
}

    // This routine is called after gauges have been defined and data is available
function gaugeUpdate(gauge, value) {
    if (gauges[gauge]!=undefined) {
        gauges[gauge].data.setValue(0, 1, value);
        gauges[gauge].chart.draw(gauges[gauge].data, gauges[gauge].options);
    }
}

    // Google Charts does not provide a gauge suitable for wind direction
    // the following routines provide an approximate copy of the Google gauge style
function drawFace(ctx, radius) {
    ctx.beginPath();
    ctx.arc(0,0,radius,0,2*Math.PI);
    ctx.fillStyle = '#C8C8C8';  // #C8C8C8 - gray, #DEDEDE - light gray, #F7F7F7 - white
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0,0,0.95*radius,0,2*Math.PI);
    ctx.fillStyle = '#DEDEDE';  // C8C8C8 - gray, #DEDEDE - light gray
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0,0,0.85*radius,0,2*Math.PI);
    ctx.fillStyle = '#F7F7F7';  // C8C8C8 - gray, #DEDEDE - light gray
    ctx.fill();

}
    // applies the text legion to the face
function drawNSEW(ctx, radius) {
    var ang;
    var num;
    ctx.font = radius * 0.2 + "px arial";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for(num=0; num<4; num++) {
        ang = num * Math.PI / 2;
        ctx.fillStyle = "black";
        letter = "NESW"[num];
        ctx.rotate(ang);
        ctx.translate(0, -radius * 0.7);
        ctx.rotate(-ang);
        ctx.fillText(letter,0,0); //num.toString(),0,0);
        ctx.rotate(ang);
        ctx.translate(0, radius * 0.7);
        ctx.rotate(-ang);
    }
}
    // draws the pointer to the face
function dirUpdate(value) {
    var canvas = document.getElementById('directionGuage');
    if (canvas.getContext) {
        var ctx = canvas.getContext('2d');
        ctx.height = 120;
        ctx.width = 120;
        var size = 120;

        ctx.translate(size/2,size/2);
        radius = size/2 - 8;
        drawFace(ctx, radius);
        drawNSEW(ctx, radius);

        // pointer
        ctx.beginPath();
        ctx.save();
        var pos = value*Math.PI/180;
//        console.log(value, pos);

        ctx.rotate(pos);
        ctx.moveTo(-2,0);
        ctx.lineTo(0,-(radius*0.75));
        ctx.lineTo(2,0);
        ctx.lineTo(0,(radius*0.3));
        ctx.lineTo(-2,0);
        ctx.strokeStyle = "#CC401F" // darker red
        ctx.stroke();
        ctx.fillStyle = '#E37155';  // lighter red
        ctx.fill();
        ctx.rotate(-pos);
        ctx.restore();

        // center cap
        ctx.beginPath();
        ctx.arc(0,0,8,0,2*Math.PI);
        ctx.stroke();
        ctx.fillStyle = '#4684EE';  // blueish to match center of google gauges
        ctx.fill();
        ctx.translate(-60,-60);
    
    }

}
