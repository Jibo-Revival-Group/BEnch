#!/bin/sh

# Get the default robot's hostname from args or jibo cli
robotHost=`./bin/utils/get-robot-host.sh $1`;

# SSH into the default robot
echo "SSHing into $robotHost. (To disconnect, type 'exit')";
ssh root@$robotHost
