// Background music for the 3D world. Starts on the first take-off (a click, so browsers allow it),
// loops quietly, fades in and out, and follows the site-wide sound toggle.
import { isMuted, onMuteChange } from '../audio/sfx';

const SRC = `${import.meta.env.BASE_URL}audio/danny.mp3`;
const VOLUME = 0.32;

let el: HTMLAudioElement | null = null;
let started = false;
let fade = 0;

function fadeTo(target: number, ms: number, then?: () => void) {
  if (!el) return;
  cancelAnimationFrame(fade);
  const a = el;
  const from = a.volume;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = from + (target - from) * k;
    if (k < 1) fade = requestAnimationFrame(step);
    else then?.();
  };
  fade = requestAnimationFrame(step);
}

function play() {
  if (!el || isMuted() || document.hidden) return;
  void el.play().then(
    () => fadeTo(VOLUME, 2500),
    () => {
      /* blocked or file missing: stay silent */
    },
  );
}

function pause() {
  if (!el || el.paused) return;
  fadeTo(0, 400, () => el?.pause());
}

/** Call from a user gesture. Safe to call more than once. */
export function startMusic() {
  if (started) return;
  started = true;
  el = new Audio(SRC);
  el.loop = true;
  el.volume = 0;
  el.preload = 'auto';
  onMuteChange((m) => (m ? pause() : play()));
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  play();
}
