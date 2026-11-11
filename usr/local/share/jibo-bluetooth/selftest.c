/* Host self-test of jibo_bluetooth.c's audio path (run by ./build.sh BTS --selftest):
 * RTP/SBC packets -> handle_media -> SBC decoder -> pipe to "aplay", where "aplay" is `cat > out.raw`.
 * build.sh then compares out.raw with ffmpeg's decode of the same SBC. */
#include <stdarg.h>
#include <unistd.h>
static int fake_execl(const char * path, const char * arg, ...){ (void) path; (void) arg; return execlp("sh", "sh", "-c", "cat > out.raw", (char *) 0); }
#define execl fake_execl
#define main jibo_main
#include "jibo_bluetooth.c"
#undef main
#undef execl
int main(void){
    static uint8_t sbc_data[200000], pkt[1024];
    FILE * f = fopen("tone.sbc", "rb"); size_t n = fread(sbc_data, 1, sizeof(sbc_data), f); fclose(f);
    const size_t FRAME = 120; /* 44.1 kHz stereo, 16 blocks, 8 subbands, bitpool 54 */
    sbc = btstack_sbc_decoder_bluedroid_init_instance(&sbc_context);
    sbc->configure(&sbc_context, SBC_MODE_STANDARD, &handle_pcm, NULL);
    int k = 0;
    for (size_t pos = 0; pos + 5 * FRAME <= n; pos += 5 * FRAME, k++){
        int csrc = (k == 3); /* one packet with a CSRC entry, to check the header skip */
        memset(pkt, 0, 16);
        pkt[0] = 0x80 | csrc;
        int hdr = 12 + 4 * csrc;
        pkt[hdr] = 5; /* SBC payload header: 5 frames */
        memcpy(pkt + hdr + 1, sbc_data + pos, 5 * FRAME);
        handle_media(1, pkt, hdr + 1 + 5 * FRAME);
        usleep(2000); /* packets arrive over time on a real link */
    }
    handle_media(1, pkt, 5); /* too short: ignored, no crash */
    sleep(1);
    aplay_stop();
    sleep(1);
    printf("packets %d rate %d\n", k, 44100);
    return 0;
}
