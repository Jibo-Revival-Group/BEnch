/* jibo_voicefx: LADSPA mono effect on Jibo's TTS output (ALSA "TTSOut" chain).
 * Vibrato (sine-modulated delay line) and volume. Parameters come from a text file
 * written by BEacon's voice manager, re-read ~10x/s while speech plays:
 *   <vibrato depth in semitones> <vibrato speed in Hz> <volume multiplier>
 * Missing/unreadable file = no effect. No libm and only old glibc symbols (robot: glibc 2.21). */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef float LADSPA_Data;
typedef void *LADSPA_Handle;
typedef int LADSPA_PortDescriptor;
typedef int LADSPA_PortRangeHintDescriptor;
typedef struct { LADSPA_PortRangeHintDescriptor HintDescriptor; LADSPA_Data LowerBound, UpperBound; } LADSPA_PortRangeHint;
typedef struct _LADSPA_Descriptor {
    unsigned long UniqueID; const char *Label; int Properties; const char *Name, *Maker, *Copyright;
    unsigned long PortCount; const LADSPA_PortDescriptor *PortDescriptors; const char * const *PortNames;
    const LADSPA_PortRangeHint *PortRangeHints; void *ImplementationData;
    LADSPA_Handle (*instantiate)(const struct _LADSPA_Descriptor *, unsigned long);
    void (*connect_port)(LADSPA_Handle, unsigned long, LADSPA_Data *);
    void (*activate)(LADSPA_Handle);
    void (*run)(LADSPA_Handle, unsigned long);
    void (*run_adding)(LADSPA_Handle, unsigned long);
    void (*set_run_adding_gain)(LADSPA_Handle, LADSPA_Data);
    void (*deactivate)(LADSPA_Handle);
    void (*cleanup)(LADSPA_Handle);
} LADSPA_Descriptor;
#define PORT_INPUT 1
#define PORT_OUTPUT 2
#define PORT_AUDIO 8
#define HARD_RT 4

#ifndef FX_FILE
#define FX_FILE "/opt/jibo/Knowledge/beacon/voices/fx.txt"
#endif
#define BUF 4096          /* delay line, power of two */
#define TAB 2048          /* sine table */
#define MAX_SWING 1500.0f /* samples */
#define TWO_PI 6.283185307179586

typedef struct {
    LADSPA_Data *in, *out;
    float buf[BUF]; unsigned w;
    float sr, phase, swing, gain;           /* current (smoothed) values */
    float t_swing, t_gain, t_inc;           /* targets from the file */
    unsigned long until_read;
} Fx;

static float sine[TAB + 1];

static void read_params(Fx *f) {
    float depth = 0, hz = 0, vol = 1; FILE *fp = fopen(FX_FILE, "r");
    if (fp) { if (fscanf(fp, "%f %f %f", &depth, &hz, &vol) != 3) { depth = 0; hz = 0; vol = 1; } fclose(fp); }
    if (!(depth >= 0 && depth <= 4)) depth = 0;
    if (!(hz >= 0.1f && hz <= 20)) { hz = 5; depth = 0; }
    if (!(vol >= 0 && vol <= 2)) vol = 1;
    /* pitch ratio swing r = 2^(depth/12)-1 ~= depth*ln2/12 (+ 2nd order); delay swing A = r*sr/(2*pi*hz) */
    { double x = depth * 0.0577622650466621; double r = x + x * x / 2 + x * x * x / 6;
      double a = r * f->sr / (TWO_PI * hz); f->t_swing = a > MAX_SWING ? MAX_SWING : (float)a; }
    f->t_inc = (float)(hz * TAB / f->sr);
    f->t_gain = vol;
}

static LADSPA_Handle instantiate(const LADSPA_Descriptor *d, unsigned long sr) {
    Fx *f = (Fx *)calloc(1, sizeof(Fx)); (void)d;
    if (!f) return NULL;
    f->sr = (float)sr; f->gain = 1; read_params(f); f->swing = f->t_swing; f->gain = f->t_gain;
    return f;
}
static void connect_port(LADSPA_Handle h, unsigned long p, LADSPA_Data *d) { Fx *f = (Fx *)h; if (p == 0) f->in = d; else f->out = d; }
static void activate(LADSPA_Handle h) { Fx *f = (Fx *)h; memset(f->buf, 0, sizeof f->buf); f->w = 0; f->until_read = 0; }

static void run(LADSPA_Handle h, unsigned long n) {
    Fx *f = (Fx *)h; unsigned long i;
    for (i = 0; i < n; i++) {
        float x = f->in[i], y, d, s, frac; int k; unsigned r0;
        if (f->until_read == 0) { read_params(f); f->until_read = (unsigned long)(f->sr / 10); } else f->until_read--;
        f->swing += (f->t_swing - f->swing) * 0.0002f;   /* ~0.1 s glide: no clicks on change */
        f->gain += (f->t_gain - f->gain) * 0.001f;
        f->buf[f->w & (BUF - 1)] = x;
        if (f->swing < 0.05f && f->t_swing == 0) { y = x; }
        else {
            f->phase += f->t_inc; if (f->phase >= TAB) f->phase -= TAB;
            k = (int)f->phase; frac = f->phase - k; s = sine[k] + (sine[k + 1] - sine[k]) * frac;
            d = 2 + f->swing + f->swing * s;               /* delay in samples, always >= 2 */
            r0 = (unsigned)d; frac = d - r0;
            { float a = f->buf[(f->w - r0) & (BUF - 1)], b = f->buf[(f->w - r0 - 1) & (BUF - 1)]; y = a + (b - a) * frac; }
        }
        f->out[i] = y * f->gain; f->w++;
    }
}
static void cleanup(LADSPA_Handle h) { free(h); }

static const LADSPA_PortDescriptor ports[2] = { PORT_INPUT | PORT_AUDIO, PORT_OUTPUT | PORT_AUDIO };
static const char * const names[2] = { "Input", "Output" };
static const LADSPA_PortRangeHint hints[2] = { { 0, 0, 0 }, { 0, 0, 0 } };
static const LADSPA_Descriptor desc = { 0x5a51, "jibo_voicefx", HARD_RT, "Jibo voice effects (vibrato, volume)", "5x1", "MIT",
    2, ports, names, hints, NULL, instantiate, connect_port, activate, run, NULL, NULL, NULL, cleanup };

const LADSPA_Descriptor *ladspa_descriptor(unsigned long i) {
    if (sine[TAB / 4] == 0) {  /* sine table by rotation; step computed from Taylor series (no libm) */
        double t = TWO_PI / TAB, c = 1 - t * t / 2 + t * t * t * t / 24 - t * t * t * t * t * t / 720,
               sn = t - t * t * t / 6 + t * t * t * t * t / 120 - t * t * t * t * t * t * t / 5040, x = 1, y = 0; int j;
        for (j = 0; j <= TAB; j++) { sine[j] = (float)y; { double nx = x * c - y * sn; y = x * sn + y * c; x = nx; } }
    }
    return i == 0 ? &desc : NULL;
}
