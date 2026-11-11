#! /bin/sh
# Only for the Avionics Board at the moment

FL_VOL="96"
FC_VOL="96"
FR_VOL="96"
RL_VOL="96"
RC_VOL="96"
RR_VOL="96"
REFL_VOL="96"
REFR_VOL="96"

FL_PGA_VOL="12"
FC_PGA_VOL="12"
FR_PGA_VOL="12"
RL_PGA_VOL="12"
RC_PGA_VOL="12"
RR_PGA_VOL="12"
REFL_PGA_VOL="18"
REFR_PGA_VOL="18"

DEV="hw:ADC"

#numid=1,iface=MIXER,name='A ADC1 Preamp'
#  ; type=INTEGER,access=rw---R--,values=2,min=0,max=2,step=0
#  : values=1,1
#  | dBscale-min=0.00dB,step=10.00dB,mute=0
amixer -D $DEV cset numid=1 1

#numid=2,iface=MIXER,name='A ADC2 Preamp'
#  ; type=INTEGER,access=rw---R--,values=2,min=0,max=2,step=0
#  : values=1,1
#  | dBscale-min=0.00dB,step=10.00dB,mute=0
amixer -D $DEV cset numid=2  1

#numid=13,iface=MIXER,name='B ADC1 Preamp'
#  ; type=INTEGER,access=rw---R--,values=2,min=0,max=2,step=0
#  : values=1,1
#  | dBscale-min=0.00dB,step=10.00dB,mute=0
amixer -D $DEV cset numid=13 1

#numid=14,iface=MIXER,name='B ADC2 Preamp'
#  ; type=INTEGER,access=rw---R--,values=2,min=0,max=2,step=0
#  : values=1,1
#  | dBscale-min=0.00dB,step=10.00dB,mute=0
amixer -D $DEV cset numid=14 1

# arecord -D default:CARD=ADC -f S16_LE -c 8 <filename.wav>

amixer -D $DEV cset iface=MIXER,name='A ADC1 Digital Volume' $FL_VOL,$FC_VOL
amixer -D $DEV cset iface=MIXER,name='A ADC2 Digital Volume' $FR_VOL,$RL_VOL
amixer -D $DEV cset iface=MIXER,name='B ADC1 Digital Volume' $RC_VOL,$RR_VOL
amixer -D $DEV cset iface=MIXER,name='B ADC2 Digital Volume' $REFL_VOL,$REFR_VOL

amixer -D $DEV cset iface=MIXER,name='A ADC1 Digital Boost' 0,0
amixer -D $DEV cset iface=MIXER,name='A ADC2 Digital Boost' 0,0
amixer -D $DEV cset iface=MIXER,name='B ADC1 Digital Boost' 0,0
amixer -D $DEV cset iface=MIXER,name='B ADC2 Digital Boost' 0,0

amixer -D $DEV cset iface=MIXER,name='A ADC1 PGA Volume' $FL_PGA_VOL,$FC_PGA_VOL
amixer -D $DEV cset iface=MIXER,name='A ADC2 PGA Volume' $FR_PGA_VOL,$RL_PGA_VOL
amixer -D $DEV cset iface=MIXER,name='B ADC1 PGA Volume' $RC_PGA_VOL,$RR_PGA_VOL
amixer -D $DEV cset iface=MIXER,name='B ADC2 PGA Volume' $REFL_PGA_VOL,$REFR_PGA_VOL

amixer -D $DEV cset iface=MIXER,name='A ADC1 Preamp' 2,2
amixer -D $DEV cset iface=MIXER,name='A ADC2 Preamp' 2,2
amixer -D $DEV cset iface=MIXER,name='B ADC1 Preamp' 2,2
amixer -D $DEV cset iface=MIXER,name='B ADC2 Preamp' 0,0

amixer -D $DEV cset iface=MIXER,name='A ADC1 Invert Polarity' 0,0
amixer -D $DEV cset iface=MIXER,name='A ADC2 Invert Polarity' 0,0
amixer -D $DEV cset iface=MIXER,name='B ADC1 Invert Polarity' 0,0
amixer -D $DEV cset iface=MIXER,name='B ADC2 Invert Polarity' 1,1
