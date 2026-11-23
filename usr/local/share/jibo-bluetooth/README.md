# jibo-bluetooth: Jibo as a Bluetooth speaker

Jibo has a TI WiLink 8 (wl18xx) whose Bluetooth core sits on `/dev/ttyTHS2` (RTS/CTS, enable on GPIO 80).
Nothing in Jibo's 2017 software uses it except the factory test (`bt_mfg.sh` with TI's `SS1BTPM`).
`/usr/local/bin/jibo-bluetooth` runs the radio with BTstack and makes Jibo a Bluetooth speaker (A2DP sink).

- **Off by default.** Turn it on in Settings › Bluetooth or with the Bluetooth button in the shortcut shade.
  It's on while `/var/jibo/bluetooth/enabled` exists. When off, the chip's enable line is low.
- **When on,** Jibo is discoverable as "Jibo (<robot name>)" and shown as a loudspeaker, so iPhones list him.
  - Pairing is Just Works with no PIN, like any speaker. Very old phones that ask for a PIN get 0000.
  - Pairings are kept in `/var/jibo/bluetooth/btstack.tlv`.
- **When a phone connects:**
  - Jibo plays `connected.wav` ("The Bluetooth device is connected successfully").
  - The phone's audio (SBC) is decoded and piped into `aplay -D MediaOut`.
  - BEam (`beacon/lib/bluetooth.js`) puts him in Bluetooth mode (`@be/bluetooth`): the Bluetooth badge on
    screen, a blue light ring, and no "Hey Jibo". Tap the screen and confirm to disconnect.
  - The phone's volume slider (AVRCP absolute volume, 0-127) and Jibo's volume (1-10) follow each other.

The system manager starts it (`jibo-system-manager.json`, like `resolv-watcher`).

## Control socket

`/tmp/jibo-bluetooth.sock` takes one line and answers one JSON line.

- `status`: enabled, powered, name, connected, address, device, playing, volume, volumeSeq, absoluteVolume.
- `on`: turn Bluetooth on.
- `off`: turn Bluetooth off.
- `disconnect`: disconnect the connected phone.
- `volume 0-127`: set the volume shown on the phone's slider.

## Debugging

For a packet log readable by Wireshark, `touch /var/jibo/bluetooth/log` and restart it. The log goes to
`/tmp/jibo-bluetooth.pklg`.

## Build

    ./build.sh TIInit_11.8.32.bts               # copy the file from a robot's /lib/firmware/
    ./build.sh TIInit_11.8.32.bts --selftest    # host test of the audio path (selftest.c), needs gcc and ffmpeg

The script fetches BTstack at a pinned commit, converts TI's init script with BTstack's
`convert_bts_init_scripts.py`, and builds statically with `arm-linux-gnueabihf-gcc`. It writes
`../../bin/jibo-bluetooth`.

BTstack's license allows non-commercial use only; commercial use needs a license from BlueKitchen.
