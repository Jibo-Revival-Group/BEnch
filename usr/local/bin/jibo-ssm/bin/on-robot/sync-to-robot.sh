#!/bin/sh

# Syncs the skills-service-manager's code to a robot.

# Parse the arguments to check for --no-ignores flag
# as well as an optional robots name
force=false
skipStage=false
for i in "$@"
do
case $i in
    --force)
    force=true
    shift
    ;;
    --skipStage)
    skipStage=true
    shift
    ;;
    *)
    robotName="${i}" # specified robot
    ;;
esac
done

function error {
    # Colorize the output
    echo "\n\033[0;91m$1\033[0m\n"
    exit 1
}

# Get the default robot's hostname from args or jibo cli
if [[ -z `which jibo` ]]; then error "Failed to find jibo cli; did you forget to link it?"; fi
robotHost=`./bin/utils/get-robot-host.sh $robotName`;
if [[ -z $robotHost ]]; then error "Failed to get default robot; did you forget to add one?"; fi

# Ensure we can connect to the robot
ssh -q -o ConnectTimeout=2 root@$robotHost exit
if [[ $? != 0 ]]; then error "Cannot connect to $robotHost"; fi
echo "\nSuccessfully connected to $robotHost"

if ! $skipStage ; then
    echo "\nStaging files for the sync...\n"
    # Run SyncIgnore to generate a list of files
    syncStage=$(node ./bin/utils/resolve-sync.js);
    if $force ; then
        # Remove the existing staging folder
        node $syncStage --force --silent
    else
        # Stage the assets
        node $syncStage --silent
    fi
fi

# No staged directory? Bail out with error
if [ ! -d "./.staged" ]; then error "Error: Directory ./.staged does not exist. Stopping"; fi

# Make SSM-related folders writeable; this will succeed even if the command
# does not exist (e.g. RTM2 robots), since the filesystem would already be
# read-write in that case
./bin/mount-rw.sh $robotHost

# Copy over stuff to /user/local/bin/jibo-ssm
echo "\nSyncing jibo-ssm changes...\n\033[0;90m";
remotePath=/usr/local/bin/jibo-ssm/
rsync --archive \
    --checksum \
    --delete \
    --force \
    --human-readable \
    --no-group \
    --no-owner \
    --no-perms \
    ./.staged/ \
    root@$robotHost:$remotePath
if [[ $? != 0 ]]; then error "Error syncing jibo-ssm"; fi

# Copy necessary configs to /usr/local/etc/jibo-ssm
echo "\033[0mSyncing jibo-ssm configs...\033[0;90m";
rsync --archive \
    --checksum \
    --delete \
    --exclude '*' \
    --force \
    --human-readable \
    --include '*/' \
    --include 'jibo-ssm*.json' \
    --no-group \
    --no-owner \
    --no-perms \
    --quiet \
    ./configs/ \
    root@$robotHost:/usr/local/etc/jibo-ssm/
if [[ $? != 0 ]]; then error "Error syncing jibo-ssm configs"; fi
echo "\033[0m"

# Fix root ownership under /usr/local
ssh root@$robotHost 'chown -R root:root /usr/local/bin/jibo-ssm'
if [[ $? != 0 ]]; then error "Error setting permissions"; fi

# Fix permissions for the skills main process
ssh root@$robotHost 'chmod -R go+rX /usr/local/bin/jibo-ssm'
if [[ $? != 0 ]]; then error "Error setting permissions"; fi

# Reset any ssm folders that should be, back to read-only
./bin/mount-ro.sh $robotHost

# Report success
echo "\n\033[0;32mDone.\n\033[0m";
