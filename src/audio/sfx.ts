// Synthesized sound effects (Web Audio API) — no asset files.
// The AudioContext is created lazily on first play, which always happens
// inside a user gesture, so browsers allow it.

const MUTE_KEY = 'mc-muted';

let ctx: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<(m: boolean) => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type ToneOpts = {
  freq: number;
  to?: number; // glide target frequency
  dur: number; // seconds
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function tone({ freq, to, dur, type = 'square', gain = 0.06, delay = 0 }: ToneOpts) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.05, filterFreq = 1200, delay = 0) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  /** UI button click */
  click() {
    tone({ freq: 520, to: 380, dur: 0.06, gain: 0.05 });
    noise(0.03, 0.03, 3000);
  },
  /** Hotbar slot change */
  select() {
    tone({ freq: 880, dur: 0.04, type: 'triangle', gain: 0.04 });
  },
  /** XP orb pickup */
  xp() {
    const f = 1200 + Math.random() * 600;
    tone({ freq: f, to: f * 1.2, dur: 0.08, type: 'sine', gain: 0.05 });
  },
  /** Level up fanfare */
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', gain: 0.05, delay: i * 0.09 }));
  },
  /** Chest open: woody creak */
  chest() {
    tone({ freq: 140, to: 90, dur: 0.22, type: 'sawtooth', gain: 0.04 });
    noise(0.18, 0.05, 600);
  },
  /** Book page turn */
  page() {
    noise(0.12, 0.06, 2400);
  },
  /** Item pop / pickup */
  pop() {
    tone({ freq: 300, to: 900, dur: 0.07, type: 'sine', gain: 0.06 });
  },
  /** Error / locked */
  deny() {
    tone({ freq: 160, dur: 0.12, type: 'square', gain: 0.04 });
  },
  /** Portal/whoosh for big transitions */
  portal() {
    tone({ freq: 90, to: 360, dur: 0.6, type: 'sine', gain: 0.05 });
    noise(0.5, 0.025, 800);
  },
};

export type SfxName = keyof typeof sfx;

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn(m));
}

export function onMuteChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
