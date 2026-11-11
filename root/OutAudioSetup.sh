#! /bin/sh
# Only for the Avionics Board for the moment

HEADPHONE_VOL="117"
DAC_VOL="127"

DEV="hw:TLV320DAC3100"

#numid=11,iface=MIXER,name='Headphone Driver Gain'
#  ; type=INTEGER,access=rw---R--,values=2,min=0,max=9,step=0
#  : values=0,0
#  | dBscale-min=0.00dB,step=1.00dB,mute=0
#amixer -D $DEV cset numid=11 7
amixer -D $DEV cset numid=11 0

#numid=1,iface=MIXER,name='DAC Switch'
#  ; type=BOOLEAN,access=rw------,values=2
#  : values=off,off
amixer -D $DEV cset numid=1 on

#numid=7,iface=MIXER,name='DACL Route'
#  ; type=ENUMERATED,access=rw------,values=1,items=3
#  ; Item #0 'Off'
#  ; Item #1 'Mixer'
#  ; Item #2 'Driver'
#  : values=1
amixer -D $DEV cset numid=7 1

#numid=8,iface=MIXER,name='DACR Route'
#  ; type=ENUMERATED,access=rw------,values=1,items=3
#  ; Item #0 'Off'
#  ; Item #1 'Mixer'
#  ; Item #2 'Driver'
#  : values=1
amixer -D $DEV cset numid=8 1

#numid=2,iface=MIXER,name='DAC Volume'
#  ; type=INTEGER,access=rw---R--,values=2,min=0,max=48,step=0
#  : values=31,31
#  | dBscale-min=0.00dB,step=0.49dB,mute=0
#amixer -D $DEV cset numid=2 33
amixer -D $DEV cset numid=2 $DAC_VOL

#numid=5,iface=MIXER,name='Headphone Switch'
#  ; type=BOOLEAN,access=rw------,values=2
#  : values=on,on
amixer -D $DEV cset numid=5 on

#numid=6,iface=MIXER,name='Headphone Volume'
#  ; type=INTEGER,access=rw---R--,values=2,min=0,max=117,step=0
#  : values=67,67
#  | dBrange-
#    rangemin=0,,rangemax=1
#      | dBscale-min=-78.30dB,step=6.10dB,mute=0
#    rangemin=2,,rangemax=3
#      | dBscale-min=-68.70dB,step=2.50dB,mute=0
#    rangemin=4,,rangemax=5
#      | dBscale-min=-64.30dB,step=1.60dB,mute=0
#    rangemin=6,,rangemax=7
#      | dBscale-min=-60.20dB,step=1.90dB,mute=0
#    rangemin=8,,rangemax=9
#      | dBscale-min=-56.70dB,step=1.40dB,mute=0
#    rangemin=10,,rangemax=26
#      | dBscale-min=-54.20dB,step=0.53dB,mute=0
#    rangemin=27,,rangemax=33
#      | dBscale-min=-45.20dB,step=0.58dB,mute=0
#    rangemin=34,,rangemax=48
#      | dBscale-min=-41.70dB,step=0.50dB,mute=0
#    rangemin=49,,rangemax=81
#      | dBscale-min=-34.10dB,step=0.50dB,mute=0
#    rangemin=82,,rangemax=117
#      | dBscale-min=-17.50dB,step=0.50dB,mute=0
#amixer -D $DEV cset numid=6 83
amixer -D $DEV cset numid=6 $HEADPHONE_VOL

#numid=5,iface=MIXER,name='Headphone Switch'
#  ; type=BOOLEAN,access=rw------,values=2
#  : values=on,on
amixer -D $DEV cset numid=5 on

#numid=12,iface=MIXER,name='Headphone Driver Switch'
#  ; type=BOOLEAN,access=rw------,values=2
#  : values=on,on
amixer -D $DEV cset numid=12 on

# speaker-test -Dhw:2 -D $DEV
# aplay -Dhw:2 <wav-file>
