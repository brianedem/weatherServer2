import configparser
from flask import Flask, send_file
import influxdb_client

# obtain configuration options
local_config_file = 'wserver.ini'
system_config_file = '/usr/local/etc/wserver.ini'

config = configparser.ConfigParser()
for config_file in (local_config_file, system_config_file):
    if file_read := config.read(config_file):
        break
else:
    exit('Error: missing configuration file')

# influxdb setup
section_name = 'INFLUXDB'
try:
    influx_config = config[section_name]
except KeyError:
    exit(f'[{section_name}] section of {config_file} missing')
try:
    token = influx_config['token']
    org = influx_config['organization']
    url = influx_config['url']
except KeyError as a:
    exit(f'Unable to fine {a} in [{section_name}] section of {config_file}')

client = influxdb_client.InfluxDBClient(
    url=url,
    token=token,
    org=org
)
query_api = client.query_api()

# flask setup
app = Flask(__name__)

@app.route('/')
def index():
    return send_file('static/index.html')

@app.route("/weather.data")
def current_weather():
    ############## /weather.data #################################
    ##############################################################
    # SELECT * FROM WeatherData ORDER BY date DESC LIMIT 1;
    # includes 'wind' (as windspeed), 'wind_5_max' (as gust)
    query = 'from(bucket:"weather")\
    |> range(start: -2m)\
    |> filter(fn:(r) => r._measurement == "observation")\
    |> last()'

    resultL = query_api.query(org=org, query=query)

    values = {'date': resultL[0].records[0].get_time().astimezone().strftime("%Y-%m-%d %H:%M")}
    for table in resultL:
        for record in table.records:
            values[record.get_field()] = record.get_value()

    # TODO remap gust to wind5max or perform MAX query on rapid_wind
    values['wind5max'] = values.pop('gust')

    #print(values)

    ##############################################################
    # SELECT * FROM WindData ORDER BY date DESC LIMIT 1;
    queryW = 'from(bucket:"wind")\
    |> range(start: -2m)\
    |> filter(fn:(r) => r._measurement == "rapid_wind")\
    |> last()'  # direction, speed

    resultW = query_api.query(org=org, query=queryW)
    valuesW = {}
    for table in resultW:
        for record in table.records:
            valuesW[record.get_field()] = record.get_value()
    valuesW['windspeed'] = valuesW.pop('speed')
    values.update(valuesW)

#   print(valuesW)

    ##############################################################
    # SELECT SUM(rainfall) FROM WeatherData WHERE date>= CURRENT_DATE();
    query = 'import "timezone"\
    option location = timezone.location(name:"America/Los_Angeles")\
    from(bucket:"weather")\
    |> range(start: today())\
    |> filter(fn:(r) => r._measurement == "observation")\
    |> filter(fn:(r) => r._field == "rainfall")\
    |> sum()'

    resultR = query_api.query(org=org, query=query)
    rainfall = resultR[0].records[0].get_value()

    values['rainfall'] = rainfall
#   print(f'{rainfall=}')

    ##############################################################
    # SELECT MIN(temperature) FROM WeatherData WHERE date>= CURRENT_DATE();
    query = 'import "timezone"\
    option location = timezone.location(name:"America/Los_Angeles")\
    from(bucket:"weather")\
    |> range(start: today())\
    |> filter(fn:(r) => r._measurement == "observation")\
    |> filter(fn:(r) => r._field == "temperature")\
    |> min()'

    resultt = query_api.query(org=org, query=query)
    min_temperature = resultt[0].records[0].get_value()

    values['min_temp'] = min_temperature
#   print(f'{min_temperature=}')

    ##############################################################
    # SELECT MAX(temperature) FROM WeatherData WHERE date>= CURRENT_DATE();
    query = 'import "timezone"\
    option location = timezone.location(name:"America/Los_Angeles")\
    from(bucket:"weather")\
    |> range(start: today())\
    |> filter(fn:(r) => r._measurement == "observation")\
    |> filter(fn:(r) => r._field == "temperature")\
    |> max()'

    resultT = query_api.query(org=org, query=query)
    max_temperature = resultT[0].records[0].get_value()

    values['max_temp'] = max_temperature
#   print(f'{max_temperature=}')

#   print(values)

    return values

@app.route("/week.data")
def week_data():
    ############## /week.data #################################
    ##############################################################
    # SELECT * FROM WeatherData WHERE date >= addtime(now(), '-7 00:00:00')
    query = 'from(bucket:"weather")\
    |> range(start: -7d)\
    |> filter(fn:(r) => r._measurement == "observation")\
    |> aggregateWindow(every: 1h, fn: mean)'

    tables = query_api.query(org=org, query=query)

    # build the structure to collect the data
    name_remap = {
        'temperature': 'temperatures',
        'pressure': 'pressures',
        'humidity': 'humidities',
        'rainfall': 'rainfalls',
        'battery': 'batteries'
    }
    data = {'dates': []}
    table_subset = []
    for table in tables:
        field = table.records[0].get_field()
        if field in name_remap:
            table_subset.append(table)
            data[name_remap[field]] = []

    for rows in zip(*table_subset):
        row_timestamp = rows[0].get_time()
        data['dates'].append(row_timestamp.astimezone().strftime("%Y-%m-%d %H:%M:%S"))
        for row in rows:
            data[name_remap[row.get_field()]].append(row.get_value())
            if row.get_time() != row_timestamp:
                breakpoint()
                pass
    return data
