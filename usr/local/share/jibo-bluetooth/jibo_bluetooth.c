/*
 * jibo-bluetooth (BEnch): Jibo as a Bluetooth speaker, on BTstack, talking straight to the WiLink 8's Bluetooth core.
 *
 * Always discoverable as "Jibo" (an audio device, so iPhones list it too) and pairs without a PIN, like any speaker.
 * When a phone connects, Jibo says "The Bluetooth device is connected successfully" (connected.wav), then plays
 * its A2DP (SBC) audio through Jibo's media output: decoded PCM is piped into `aplay -D MediaOut`.
 *
 * Hardware (device tree "tibt"): /dev/ttyTHS2, RTS/CTS, enable on GPIO 80; TI's init script is compiled in
 * (bluetooth_init_wl18xx_11.8.32.c, converted from the robot's /lib/firmware/TIInit_11.8.32.bts).
 * TI's own SS1BTPM must not run at the same time (nothing starts it).
 */
#define BTSTACK_FILE__ "jibo_bluetooth.c"

#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#include "btstack.h"
#include "btstack_chipset_cc256x.h"
#include "btstack_run_loop_posix.h"
#include "btstack_signal.h"
#include "btstack_tlv_posix.h"
#include "btstack_uart.h"
#include "classic/btstack_link_key_db_tlv.h"
#include "classic/btstack_sbc_bluedroid.h"
#include "hci_transport_h4.h"
#include "hci_dump_posix_fs.h"

#define STATE_DIR  "/var/jibo/bluetooth"
#define TLV_PATH   STATE_DIR "/btstack.tlv"
#define CHIME      "/usr/local/share/jibo-bluetooth/connected.wav"
#define GPIO       "80"

static hci_transport_config_uart_t uart_config = {
    HCI_TRANSPORT_CONFIG_UART, 115200, 0, BTSTACK_UART_FLOWCONTROL_ON, "/dev/ttyTHS2", BTSTACK_UART_PARITY_OFF
};
static btstack_packet_callback_registration_t hci_cb;
static btstack_tlv_posix_t tlv_context;
static bool shutting_down;

static uint8_t sdp_a2dp_sink[150];
/* any SBC configuration; bitpool 2-53 as in BTstack's a2dp_sink_demo */
static const uint8_t sbc_capabilities[] = { 0xFF, 0xFF, 2, 53 };
static uint8_t sbc_configuration[4];

static btstack_sbc_decoder_bluedroid_t sbc_context;
static const btstack_sbc_decoder_t * sbc;

static pid_t aplay_pid;
static int aplay_fd = -1, aplay_rate;

/* ---------- audio out ---------- */

static void aplay_stop(void){
    if (aplay_fd >= 0){ close(aplay_fd); aplay_fd = -1; }
    if (aplay_pid > 0){ kill(aplay_pid, SIGTERM); aplay_pid = 0; } /* stop now, don't play out the buffer */
    aplay_rate = 0;
}

static void aplay_start(int rate){
    int fds[2];
    char r[16];
    if (pipe(fds)) return;
    snprintf(r, sizeof(r), "%d", rate);
    pid_t pid = fork();
    if (pid == 0){
        dup2(fds[0], 0); close(fds[0]); close(fds[1]);
        execl("/usr/bin/aplay", "aplay", "-q", "-D", "MediaOut", "-t", "raw", "-f", "S16_LE", "-c", "2", "-r", r, (char *) NULL);
        _exit(127);
    }
    close(fds[0]);
    if (pid < 0){ close(fds[1]); return; }
    /* never block the Bluetooth loop: if aplay falls behind, drop audio instead */
    fcntl(fds[1], F_SETFL, O_NONBLOCK);
    aplay_pid = pid; aplay_fd = fds[1]; aplay_rate = rate;
}

static void handle_pcm(int16_t * data, int frames, int channels, int rate, void * context){
    UNUSED(context);
    if (channels != 2) return; /* the decoder always outputs stereo */
    if (rate != aplay_rate){ aplay_stop(); aplay_start(rate); }
    if (aplay_fd >= 0 && write(aplay_fd, data, (size_t) frames * 4) < 0) {} /* full pipe: drop this block */
}

/* shortcut: plays as it arrives (no jitter buffer or clock-drift correction); add one if users hear dropouts. */
static void handle_media(uint8_t seid, uint8_t * packet, uint16_t size){
    UNUSED(seid);
    /* RTP header (12 bytes + 4 per CSRC), then the SBC media payload header (1 byte), then SBC frames */
    if (size < 13) return;
    int pos = 12 + 4 * (packet[0] & 0x0f) + 1;
    if (pos >= size) return;
    sbc->decode_signed_16(&sbc_context, 0, packet + pos, size - pos);
}

static void play_chime(void){
    if (fork() == 0){
        execl("/usr/bin/aplay", "aplay", "-q", "-D", "MediaOut", CHIME, (char *) NULL);
        _exit(127);
    }
}

/* ---------- A2DP ---------- */

static void a2dp_handler(uint8_t type, uint16_t channel, uint8_t * packet, uint16_t size){
    UNUSED(channel); UNUSED(size);
    if (type != HCI_EVENT_PACKET || hci_event_packet_get_type(packet) != HCI_EVENT_A2DP_META) return;
    bd_addr_t addr;
    switch (hci_event_a2dp_meta_get_subevent_code(packet)){
        case A2DP_SUBEVENT_SIGNALING_CONNECTION_ESTABLISHED:
            if (a2dp_subevent_signaling_connection_established_get_status(packet) != ERROR_CODE_SUCCESS) break;
            a2dp_subevent_signaling_connection_established_get_bd_addr(packet, addr);
            printf("Phone connected: %s\n", bd_addr_to_str(addr));
            play_chime();
            break;
        case A2DP_SUBEVENT_STREAM_STARTED:
            sbc->configure(&sbc_context, SBC_MODE_STANDARD, &handle_pcm, NULL);
            printf("Playing\n");
            break;
        case A2DP_SUBEVENT_STREAM_SUSPENDED:
        case A2DP_SUBEVENT_STREAM_RELEASED:
            aplay_stop();
            printf("Stopped\n");
            break;
        case A2DP_SUBEVENT_SIGNALING_CONNECTION_RELEASED:
            aplay_stop();
            printf("Phone disconnected\n");
            break;
        default:
            break;
    }
}

/* ---------- radio ---------- */

static void gpio_write(const char * file, const char * value){
    char path[64]; snprintf(path, sizeof(path), "/sys/class/gpio/gpio" GPIO "/%s", file);
    int fd = open(path, O_WRONLY); if (fd < 0) return;
    if (write(fd, value, strlen(value)) < 0) {}
    close(fd);
}

/* Reset the Bluetooth core: enable low 1 s, high, then 1.5 s for it to boot (measured on .165). */
static void power_cycle(void){
    if (access("/sys/class/gpio/gpio" GPIO, F_OK) != 0){
        int fd = open("/sys/class/gpio/export", O_WRONLY);
        if (fd >= 0){ if (write(fd, GPIO, strlen(GPIO)) < 0) {} close(fd); }
    }
    gpio_write("direction", "out");
    gpio_write("value", "0"); usleep(1000000);
    gpio_write("value", "1"); usleep(1500000);
}

static void hci_handler(uint8_t type, uint16_t channel, uint8_t * packet, uint16_t size){
    UNUSED(channel); UNUSED(size);
    if (type != HCI_EVENT_PACKET) return;
    switch (hci_event_packet_get_type(packet)){
        case BTSTACK_EVENT_POWERON_FAILED:
            printf("Bluetooth controller didn't start\n"); /* stay up: exiting makes the system manager log a crash */
            break;
        case BTSTACK_EVENT_STATE:
            if (btstack_event_state_get_state(packet) == HCI_STATE_WORKING){
                bd_addr_t local; gap_local_bd_addr(local);
                printf("Bluetooth speaker on: %s\n", bd_addr_to_str(local));
            } else if (btstack_event_state_get_state(packet) == HCI_STATE_OFF && shutting_down){
                btstack_tlv_posix_deinit(&tlv_context);
                exit(0);
            }
            break;
        case HCI_EVENT_COMMAND_COMPLETE:
            if (hci_event_command_complete_get_command_opcode(packet) == HCI_OPCODE_HCI_READ_LOCAL_VERSION_INFORMATION){
                uint16_t manufacturer = little_endian_read_16(packet, 10), lmp = little_endian_read_16(packet, 12);
                if (manufacturer != BLUETOOTH_COMPANY_ID_TEXAS_INSTRUMENTS_INC || lmp != btstack_chipset_cc256x_lmp_subversion()){
                    printf("Unexpected controller (manufacturer 0x%04x, LMP subversion 0x%04x)\n", manufacturer, lmp);
                    hci_power_control(HCI_POWER_OFF);
                    break;
                }
                uart_config.baudrate_main = 921600;
                hci_set_chipset(btstack_chipset_cc256x_instance());
            }
            break;
        case HCI_EVENT_PIN_CODE_REQUEST: { /* only very old phones ask; speakers use 0000 */
            bd_addr_t addr; hci_event_pin_code_request_get_bd_addr(packet, addr);
            gap_pin_code_response(addr, "0000");
            break;
        }
        default:
            break;
    }
}

static void trigger_shutdown(void){
    shutting_down = true;
    alarm(3); /* if the controller never confirms power-off, SIGALRM ends us anyway */
    aplay_stop();
    hci_power_control(HCI_POWER_OFF);
}

int main(int argc, const char * argv[]){
    UNUSED(argc); UNUSED(argv);
    setvbuf(stdout, NULL, _IOLBF, 0);
    signal(SIGCHLD, SIG_IGN); /* aplay children reap themselves */
    signal(SIGPIPE, SIG_IGN);
    mkdir(STATE_DIR, 0700);

    power_cycle();
    if (access(STATE_DIR "/log", F_OK) == 0){ /* debugging: touch it for a packet log readable by Wireshark */
        hci_dump_posix_fs_open("/tmp/jibo-bluetooth.pklg", HCI_DUMP_PACKETLOGGER);
        hci_dump_init(hci_dump_posix_fs_get_instance());
    }

    btstack_memory_init();
    btstack_run_loop_init(btstack_run_loop_posix_get_instance());
    hci_init(hci_transport_h4_instance_for_uart(btstack_uart_posix_instance()), (void *) &uart_config);
    const btstack_tlv_t * tlv = btstack_tlv_posix_init_instance(&tlv_context, TLV_PATH);
    btstack_tlv_set_instance(tlv, &tlv_context);
    hci_set_link_key_db(btstack_link_key_db_tlv_get_instance(tlv, &tlv_context));
    btstack_signal_register_callback(SIGINT, &trigger_shutdown);
    btstack_signal_register_callback(SIGTERM, &trigger_shutdown);
    hci_cb.callback = &hci_handler;
    hci_add_event_handler(&hci_cb);

    l2cap_init();
    sdp_init();
    a2dp_sink_init();
    a2dp_sink_register_packet_handler(&a2dp_handler);
    a2dp_sink_register_media_handler(&handle_media);
    if (!a2dp_sink_create_stream_endpoint(AVDTP_AUDIO, AVDTP_CODEC_SBC, sbc_capabilities, sizeof(sbc_capabilities),
                                          sbc_configuration, sizeof(sbc_configuration))) return 1;
    a2dp_sink_create_sdp_record(sdp_a2dp_sink, sdp_create_service_record_handle(), AVDTP_SINK_FEATURE_MASK_SPEAKER, NULL, NULL);
    sdp_register_service(sdp_a2dp_sink);
    sbc = btstack_sbc_decoder_bluedroid_init_instance(&sbc_context);

    gap_set_local_name("Jibo");
    gap_set_class_of_device(0x240414); /* Audio/Rendering service, Audio/Video: loudspeaker */
    gap_ssp_set_io_capability(SSP_IO_CAPABILITY_NO_INPUT_NO_OUTPUT);
    gap_ssp_set_auto_accept(1); /* Just Works, like any speaker */
    gap_set_bondable_mode(1);
    gap_discoverable_control(1);
    gap_connectable_control(1);

    hci_power_control(HCI_POWER_ON);
    btstack_run_loop_execute();
    return 0;
}
