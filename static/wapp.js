    // Model
let data = null;
const weekData = new Map()

async function weather_refresh() {
    let response = await fetch('weather.data');
    data = await response.json();
    setTimeout(weather_refresh, 5000);
    updateUI();
}
const charts = [ "temperature", "pressure", "rainfall", "battery" ];
async function weekly_refresh() {
    for (const chart of charts) {
        let response = await fetch('week.'+chart);
        weekData.set(chart, await response.json());
    }
    setTimeout(weekly_refresh, 3600*1000);
    updateHistoryUI();
}
    // metric to imperial unit conversion
function c2f(c) {
    return(32+c*1.8)
}
function mm2in(mm) {
    return(mm/25.4)
}
function mps2mph(mps) {
    return(mps*2.237)
}
    // view (kind of)
function updateUI() {
    if (!data) return;

        // update text information
    document.getElementById("date").innerHTML = data.date;
    document.getElementById("temperature").innerHTML = c2f(data.temperature).toFixed(1);
    document.getElementById("temp_low").innerHTML = c2f(data.min_temp).toFixed(1);
    document.getElementById("temp_hi").innerHTML = c2f(data.max_temp).toFixed(1);
    document.getElementById("pressure").innerHTML = data.pressure.toFixed(2);
    document.getElementById("humidity").innerHTML = data.humidity.toFixed(0);
    document.getElementById("rainfall").innerHTML = mm2in(data.rainfall).toFixed(2);
    document.getElementById("windspeed").innerHTML = mps2mph(data.windspeed).toFixed(0);
    document.getElementById("wind5max").innerHTML = mps2mph(data.wind5max).toFixed(0);
    document.getElementById("direction").innerHTML = data.direction.toFixed(0);
    document.getElementById("battery").innerHTML = data.battery.toFixed(3);
    document.getElementById("rssi").innerHTML = data.rssi.toFixed(1);

        // update guages
    gaugeUpdate('temperature', c2f(data.temperature).toFixed(0));
    gaugeUpdate('humidity', data.humidity.toFixed(0));
    gaugeUpdate('pressure', data.pressure.toFixed(0));
    gaugeUpdate('windspeed', data.windspeed.toFixed(0));
    dirUpdate(data.direction.toFixed(0));
}

function updateHistoryUI() {
    if (weekData.size==0) return;

        // update historical charts
    var rainfallSum = 0;
    var rainfallRate = 0;
    var lastRain = null;

    // process each chart in turn
    for ([measurement,values] of weekData) {

        // remove existing data from dataTable
        existing_row_count = history[measurement].data.getNumberOfRows();
        if (existing_row_count  > 0) {
            history[measurement].data.removeRows(0, existing_row_count);
        }

        // convert data from server to required format and populate dataTable
        for (value of values) {
            // server provides a ISO timestamp local to the weather station (no offset)
            var jsDate = new Date(value[0]);
            if (measurement == 'rainfall') {
                rainfallSum += value[1]
                if (value[1]!=0) {
                    if (lastRain) {
                        rainfallRate = value[1]/(jsDate - lastRain)*1000*60*60;
                    }
                    lastRain = jsDate;
                }
                if (lastRain && (jsDate-lastRain)>(1000*60*60)) {
                    rainfallRate = 0;
                    lastRain = null;
                }
                history[measurement].data.addRows([[jsDate, mm2in(rainfallSum), mm2in(rainfallRate)]]);
            }
            else {
                history[measurement].data.addRows([[jsDate, value[1]]]);
            }
        }
        history[measurement].chart.draw(history[measurement].data, history[measurement].options);
    }
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
    data.addColumn('number', 'Rate');
    data.addColumn('number', 'Rainfall');   // this will be drawn on top of rate
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
            0: {
                color: 'red'
            },
            1: {                // we want rainfall to be the same color as the other charts
                color: 'blue'
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
