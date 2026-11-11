# jibo-bluetooth: Jibo as a Bluetooth speaker

Jibo has a TI WiLink 8 (wl18xx) whose Bluetooth core sits on `/dev/ttyTHS2` (RTS/CTS, enable on GPIO 80).
Nothing in Jibo's 2017 software uses it except the factory test (`bt_mfg.sh` with TI's `SS1BTPM`).
`/usr/local/bin/jibo-bluetooth` runs the radio with BTstack and makes Jibo a Bluetooth speaker (A2DP sink):

- He's always discoverable as "Jibo", shown as a loudspeaker, so phones (iPhone too) list him in their
  Bluetooth settings.
- Pairing is Just Works with no PIN, like any speaker. Very old phones that ask for a PIN get 0000.
  Pairings are kept in `/var/jibo/bluetooth/btstack.tlv`.
- When a phone connects, Jibo plays `connected.wav` ("The Bluetooth device is connected successfully").
- The phone's audio (SBC) is decoded and piped into `aplay -D MediaOut`, so it plays at Jibo's media volume.

The system manager starts it (`jibo-system-manager.json`, like `resolv-watcher`). If the radio doesn't
start, it stays up and logs why.

For a packet log readable by Wireshark, `touch /var/jibo/bluetooth/log` and restart it. The log goes to
`/tmp/jibo-bluetooth.pklg`.

## Build

    ./build.sh TIInit_11.8.32.bts               # copy the file from a robot's /lib/firmware/
    ./build.sh TIInit_11.8.32.bts --selftest    # host test of the audio path (selftest.c), needs gcc and ffmpeg

The script fetches BTstack at a pinned commit, converts TI's init script with BTstack's
`convert_bts_init_scripts.py`, and builds statically with `arm-linux-gnueabihf-gcc`. It writes
`../../bin/jibo-bluetooth`.

BTstack's license allows non-commercial use only; commercial use needs a license from BlueKitchen.
