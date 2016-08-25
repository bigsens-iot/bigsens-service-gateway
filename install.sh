#!/bin/bash

DIR=/etc/systemd/system/
NAME=bs-core
LOGROTATE=/etc/logrotate.d/bigsens
LOGDIR=/var/log/bigsens

# create /etc/machine-id
systemd-machine-id-setup

# prepare for logger
if [ ! -d $LOGDIR ]; then
	 mkdir $LOGDIR
fi

if [ ! -e $LOGROTATE ]; then
    cat > $LOGROTATE << EOM
    /var/log/bigsens/*.log {
        daily         # or weekly 
    	missingok
    	rotate 5
    	compression
	}
	EOM
	logrotate $LOGROTATE
fi

cat /var/lib/logrotate/status | grep bigsens

# service manifest
if [ ! -e $DIR$NAME".service" ]; then
cat > $DIR$NAME".service" << EOF
[Unit]
Description=Bigsens Core Gateway service

[Service]
ExecStart=/usr/local/bin/node /root/bs-core/index.js
Restart=always
RestartSec=10                       # Restart service after 10 seconds if node service crashes
#StandardOutput=syslog              # Output to syslog
#StandardError=syslog               # Output to syslog
SyslogIdentifier=bs-core
Environment=NODE_ENV=production PORT=13777

[Install]
WantedBy=multi-user.target
EOF
fi

# start service
systemctl enable $NAME".service"
systemctl start $NAME".service"
systemctl daemon-reload
systemctl status $NAME
