# Original background music + transition sounds for the Attendefy video.
# Pure synthesis with numpy (no samples) -> free to use.
# usage: python3 music.py out.wav duration_seconds scene_starts(comma) [ding_times(comma)]
import sys, wave
import numpy as np

SR = 44100
out, DUR = sys.argv[1], float(sys.argv[2])
SCENES = [float(x) for x in sys.argv[3].split(',')]
DINGS  = [float(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 and sys.argv[4] else []
N = int(DUR * SR)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

BPM = 100.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def lowpass(x, cutoff):
    # one-pole low-pass, cutoff may be an array
    a = np.exp(-2 * np.pi * np.broadcast_to(cutoff, x.shape) / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y

def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i+len(sig)] += sig * gain * (1 - max(pan, 0))
    R[i:i+len(sig)] += sig * gain * (1 + min(pan, 0))

# Progression (vi - IV - I - V in C): Am, F, C, G — one chord per bar
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]
BASS   = [45, 41, 48, 43]

# ── Pad: detuned saws, slowly opening filter ──
pad = np.zeros(N)
nbars = int(np.ceil(DUR / BAR)) + 1
for b in range(nbars):
    s0 = int(b * BAR * SR); s1 = min(N, int((b + 1) * BAR * SR) + int(0.3 * SR))
    if s0 >= N: break
    tt = np.arange(s1 - s0) / SR
    seg = np.zeros(s1 - s0)
    for n in CHORDS[b % 4]:
        for det in (-0.12, 0.0, 0.12):
            f = midi(n + 12) * 2 ** (det / 12)
            seg += 2 * ((tt * f) % 1.0) - 1
    env = np.minimum(1, tt / 0.6) * np.minimum(1, (len(tt) / SR - tt) / 0.35 + 0.0001)
    pad[s0:s1] += seg * env / 9
cut = 600 + 1400 * np.clip(t / 12, 0, 1)
pad = lowpass(pad, cut)
L += pad * 0.26; R += pad * 0.26

# ── Pluck arpeggio (8th notes), enters at scene 2 ──
def pluck(f, dur=0.45):
    tt = np.arange(int(dur * SR)) / SR
    s = np.sin(2*np.pi*f*tt) + 0.35*np.sin(2*np.pi*2*f*tt) + 0.12*np.sin(2*np.pi*3*f*tt)
    return s * np.exp(-tt * 9)
ARP = [0, 1, 2, 1, 2, 0, 1, 2]
arp_start = SCENES[1] if len(SCENES) > 1 else 4
k = 0
step = BEAT / 2
x = np.ceil(arp_start / step) * step
while x < DUR - 2.0:
    bar = int(x // BAR)
    notes = CHORDS[bar % 4]
    n = notes[ARP[k % 8]] + 12
    add(pluck(midi(n)), x, 0.11, pan=(0.35 if k % 2 else -0.35))
    x += step; k += 1

# ── Bass (on each beat, from scene 3) ──
bass_start = SCENES[2] if len(SCENES) > 2 else 10
x = np.ceil(bass_start / BEAT) * BEAT
while x < DUR - 2.0:
    bar = int(x // BAR)
    f = midi(BASS[bar % 4])
    tt = np.arange(int(BEAT * 0.9 * SR)) / SR
    s = np.sin(2*np.pi*f*tt) * np.exp(-tt * 3) * np.minimum(1, tt / 0.01)
    add(s, x, 0.30)
    x += BEAT

# ── Soft kick + hat (from scene 3 to the last scene) ──
def kick():
    tt = np.arange(int(0.35 * SR)) / SR
    f = 50 + 90 * np.exp(-tt * 30)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt * 9)
def hat():
    tt = np.arange(int(0.06 * SR)) / SR
    nz = rng.standard_normal(len(tt)); nz = nz - lowpass(nz, 6000)
    return nz * np.exp(-tt * 60)
drum_end = SCENES[-1] if SCENES else DUR
x = np.ceil(bass_start / BEAT) * BEAT
i = 0
while x < drum_end - 0.2:
    if i % 2 == 0: add(kick(), x, 0.20)
    add(hat(), x + BEAT / 2, 0.05, pan=0.2)
    x += BEAT; i += 1

# ── Whoosh at every scene change ──
def whoosh(d=0.9):
    tt = np.arange(int(d * SR)) / SR
    nz = rng.standard_normal(len(tt))
    sweep = 300 + 5000 * np.sin(np.pi * tt / d) ** 2
    s = lowpass(nz, sweep) - lowpass(nz, sweep * 0.25)
    return s * np.sin(np.pi * tt / d) ** 2
for s in SCENES[1:]:
    add(whoosh(), s - 0.45, 0.55, pan=0.0)

# ── Soft "ding" (bell) for highlights ──
def ding(f=1318.5):
    tt = np.arange(int(1.2 * SR)) / SR
    s = np.sin(2*np.pi*f*tt) + 0.4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6)
    return s * np.exp(-tt * 4) * np.minimum(1, tt / 0.004)
for d in DINGS:
    add(ding(), d, 0.10)

# ── Master: fade in/out, normalise ──
fade = np.minimum(1, t / 1.5) * np.minimum(1, (DUR - t) / 2.5)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max(), 1e-9)
L = L / peak * 0.89; R = R / peak * 0.89
pcm = (np.stack([L, R], axis=1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out, f'{DUR:.1f}s')
