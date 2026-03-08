import os

print('This application creates the wserver.ini file')

local_config_file = 'wserver.ini'

config_template = '''
[INFLUXDB]
url             .URL for the InfluxDB server
organization    .Organization name
token           .Read access token for 'wind' and 'weather' buckets
'''

if os.access(local_config_file, os.R_OK):
    response = input(f'{local_config_file} already exists - overwrite? ')
    if not response.startswith(('Y','y')):
        exit('creation aborted')

with open(local_config_file, 'w', encoding='utf-8') as config_fd:
    for line in config_template.splitlines():
        if line.strip() == '':
            continue
        if line[0]=='[':
            config_fd.write(line + '\n')
            print(f'section {line}')
            continue
        item = line.split()[0]
        item_help = line[line.index('.')+1:]
        value = input(f'{item_help} = ')
        config_fd.write(f'{item} = {value}\n')

exit('File creation complete')
