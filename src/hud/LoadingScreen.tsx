import { useEffect, useState } from 'react';
import './loading.css';

const SEEN_KEY = 'mc-loaded';

const TIPS = [
  'Press 1–9 to jump between screens',
  'Use the arrow keys to walk to the next screen',
  'Press F3 for debug info',
  'Press Esc to return to the title screen',
  'Every screen you visit is remembered',
];

let firstVisitCache: boolean | undefined;
// Cached so React StrictMode's double-invoked initializers see the same answer.
function firstVisit(): boolean {
  if (firstVisitCache === undefined) firstVisitCache = checkFirstVisit();
  return firstVisitCache;
}

function checkFirstVisit(): boolean {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage unavailable: show it once per page load */
  }
  return true;
}

function prefersReduced() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** "Loading terrain…" screen, shown on the first visit of a browser session. */
export function LoadingScreen() {
  const [show] = useState(firstVisit);
  const [reduced] = useState(prefersReduced);
  const [phase, setPhase] = useState<'loading' | 'out' | 'done'>(show ? 'loading' : 'done');
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));

  const total = reduced ? 250 : 1200;
  const fade = reduced ? 80 : 400;

  useEffect(() => {
    if (!show) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const tipId = reduced ? 0 : window.setInterval(() => setTip((i) => (i + 1) % TIPS.length), 600);
    const outId = window.setTimeout(() => setPhase('out'), total);
    const doneId = window.setTimeout(() => setPhase('done'), total + fade);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tipId);
      clearTimeout(outId);
      clearTimeout(doneId);
    };
  }, [show, reduced, total, fade]);

  if (phase === 'done') return null;
  const pct = Math.round(progress * 100);
  // Snap the fill to 20 "pixel" steps so it grows blockily.
  const stepped = Math.floor(progress * 20) * 5;

  return (
    <div
      className={`loading${phase === 'out' ? ' is-out' : ''}`}
      style={{ ['--loading-fade' as string]: `${fade}ms` }}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="loading__inner">
        <p className="loading__title">Loading terrain…</p>
        <div
          className="loading__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="loading__fill" style={{ width: `${stepped}%` }} />
        </div>
        <p className="loading__pct">{pct}%</p>
        <p className="loading__tip" key={tip}>
          Tip: {TIPS[tip]}
        </p>
      </div>
    </div>
  );
}
