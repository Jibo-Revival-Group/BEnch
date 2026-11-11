#!/bin/sh

# udhcpc script edited by Tim Riker <Tim@Rikers.org>

DHCP_EVENT=$1
[ -z "$DHCP_EVENT" ] && echo "Error: should be called from udhcpc" && exit 1

RESOLV_CONF="/run/resolv.conf"
[ -e $RESOLV_CONF ] || touch $RESOLV_CONF

DEFAULT_DNS=$(cat << EOF
8.8.8.8
8.8.4.4
EOF
)

PROC_NAME="udhcpc.$(basename $0)"
PROC_PID=$$
log_info(){
	logger \
		--priority info     \
		--id=$PROC_PID      \
		--tag $PROC_NAME    \
		$@
}

prime_dns_servers(){
	TMPFILE=$(mktemp)
	cat $RESOLV_CONF > $TMPFILE
	for DNS_SERVER in $DEFAULT_DNS ; do
		if [[ $(grep -c "$DNS_SERVER" $TMPFILE) -lt 1 ]] ; then
			log_info "$DHCP_EVENT: Restoring DNS server $DNS_SERVER to $RESOLV_CONF"
			echo "nameserver $DNS_SERVER" >> $TMPFILE
		fi
	done
	chmod 644 $TMPFILE
	mv -f $TMPFILE $RESOLV_CONF
	# rm -f $TMPFILE 
}

case "$DHCP_EVENT" in
	deconfig)
		prime_dns_servers
		;;

	renew|bound)
		prime_dns_servers
		;;
esac


exit 0
