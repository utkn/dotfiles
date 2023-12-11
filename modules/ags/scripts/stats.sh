#!/bin/sh

# https://gist.github.com/walm/e084e5184bc14da9ddbe#file-1_server-stats-json-sh

echo -n '{'

# memory as "mem": { "current": 800, "total": 1024, "load", 82 } where amount is in MB and load in %
free -m | awk 'NR==2{printf "\"mem\": { \"current\":%d, \"total\":%d, \"load\": %.2f }", $3,$2,$3*100/$2 }'

echo -n ','

# diska as "disk": { "current": 6, "total": 40, "used": 19 } where amount is in GB and used in %
df -h | awk '$NF=="/"{printf "\"disk\": { \"current\":%d, \"total\":%d, \"used\": %d }", $3,$2,$5}'

echo -n ','

# cpu as "cpu": { "load": 40 } where load is in %
top -bn1 | grep load | awk '{printf "\"cpu\": { \"load\": %.2f }", $(NF-2)}'

echo -n '}'
