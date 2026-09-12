#!/bin/sh

# Parse the arguments to check for --no-ignores flag
# as well as an optional robots name
for i in "$@"
do
case $i in
    --force)
    shift
    ;;
    --skipStage)
    shift
    ;;
    *)
    robotName="${i}" # specified robot
    ;;
esac
done

# Get the default robot's hostname from args or jibo cli
robotHost=`./bin/utils/get-robot-host.sh $robotName`

# Stops any running skill
echo "Stopping SSM and any running skill(s)..."
# This one command kills SSM, MMS, and Exp, and SSM kills skills on startup
ssh root@$robotHost pkill -f "jibo-ssm"
echo "System Manager is restarting the SSM"
