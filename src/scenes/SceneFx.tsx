import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Effect } from './sceneEffects';
import { makeRand } from './types';
import './scenefx.css';

type Box = { left: number; top: number; width: number; height: number };

/** Box an image occupies inside `parent` under object-fit: cover. */
function coverBox(pw: number, ph: number, iw: number, ih: number): Box {
  const s = Math.max(pw / iw, ph / ih);
  const width = iw * s;
  const height = ih * s;
  return { left: (pw - width) / 2, top: (ph - height) / 2, width, height };
}

type SceneFxProps = {
  effects: Effect[];
  imageSize: { w: number; h: number };
};

/** Renders per-image animation effects, aligned to the background image's real (cropped) position. */
export function SceneFx({ effects, imageSize }: SceneFxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [mark, setMark] = useState<{ x: number; y: number } | null>(null);
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fx');

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const update = () => setBox(coverBox(parent.clientWidth, parent.clientHeight, imageSize.w, imageSize.h));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [imageSize.w, imageSize.h]);

  // ?fx mode: Alt+click (or plain click on empty background) shows the image coordinates.
  useEffect(() => {
    if (!debug) return;
    const onClick = (e: MouseEvent) => {
      const el = ref.current?.querySelector('.fx-box') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
      const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
      setMark({ x, y });
      void navigator.clipboard?.writeText(`x: ${x}, y: ${y}`).catch(() => {});
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [debug]);

  return (
    <div ref={ref} className="fx-root" aria-hidden="true">
      {box && (
        <div className="fx-box" style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
          {effects.map((fx, i) => (
            <FxItem key={i} fx={fx} seed={i + 1} boxW={box.width} />
          ))}
          {debug && mark && (
            <div className="fx-mark" style={{ left: `${mark.x}%`, top: `${mark.y}%` }}>
              x: {mark.x}, y: {mark.y} (copied)
            </div>
          )}
        </div>
      )}
      {debug && <div className="fx-debug-hint">FX mode: click anywhere to get image coordinates</div>}
    </div>
  );
}

function FxItem({ fx, seed, boxW }: { fx: Effect; seed: number; boxW: number }) {
  switch (fx.type) {
    case 'glow':
      return (
        <div
          className={`fx-glow fx-glow--${fx.mode ?? 'pulse'}`}
          style={
            {
              left: `${fx.x}%`,
              top: `${fx.y}%`,
              width: `${fx.size}%`,
              '--fx-color': fx.color,
              '--fx-strength': fx.strength ?? 0.8,
              // stagger so neighbouring glows don't beat in sync
              animationDelay: `-${((seed * 0.731) % 3.2).toFixed(2)}s`,
              ...(fx.period ? { animationDuration: `${fx.period}s` } : {}),
            } as CSSProperties
          }
        />
      );
    case 'smoke': {
      const w = fx.width ?? 3;
      const puff = Math.max(6, Math.round((boxW * w) / 100 / 2.2));
      return (
        <div
          className="fx-smoke"
          style={
            {
              left: `${fx.x}%`,
              top: `${fx.y}%`,
              width: `${w}%`,
              height: `${fx.height ?? 25}%`,
              '--fx-color': fx.color ?? 'rgba(200, 200, 205, 0.55)',
              '--fx-puff': `${puff}px`,
            } as CSSProperties
          }
        >
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} style={{ animationDelay: `${(i * 0.62).toFixed(2)}s`, left: `${(i * 37) % 60}%` }} />
          ))}
        </div>
      );
    }
    case 'rays': {
      const spread = fx.spread ?? 30;
      const beams = 5;
      return (
        <div
          className="fx-rays"
          style={
            {
              left: `${fx.x}%`,
              top: `${fx.y}%`,
              '--fx-color': fx.color ?? 'rgba(255, 236, 190, 0.5)',
              '--fx-strength': fx.strength ?? 0.6,
              '--fx-len': `${fx.length ?? 90}%`,
            } as CSSProperties
          }
        >
          {Array.from({ length: beams }, (_, i) => {
            const a = (fx.angle ?? 0) - spread / 2 + (spread * i) / (beams - 1);
            return (
              <span
                key={i}
                style={{ transform: `rotate(${-a}deg)`, animationDelay: `${i * 1.3}s`, width: `${3 + ((i * 7) % 5)}%` }}
              />
            );
          })}
        </div>
      );
    }
    case 'particles':
      return <ParticleField kind={fx.kind} region={fx.region ?? [0, 0, 100, 100]} count={fx.count ?? 30} colors={fx.colors} seed={seed} />;
    case 'shimmer': {
      const [x, y, w, h] = fx.region;
      return (
        <div
          className="fx-shimmer"
          style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, '--fx-color': fx.color ?? 'rgba(255,255,255,0.35)' } as CSSProperties}
        />
      );
    }
    case 'glints':
      return <Glints path={fx.path} region={fx.region} count={fx.count ?? 24} spread={fx.spread ?? 1} color={fx.color ?? '#fff6d8'} size={fx.size} seed={seed} />;
    case 'bubbles': {
      const n = fx.count ?? 6;
      return (
        <div
          className="fx-bubbles"
          style={{ left: `${fx.x}%`, top: `${fx.y}%`, width: `${fx.width ?? 2}%`, height: `${fx.height ?? 8}%`, '--fx-color': fx.color ?? 'rgba(255,255,255,0.8)' } as CSSProperties}
        >
          {Array.from({ length: n }, (_, i) => (
            <span key={i} style={{ left: `${(i * 41) % 90}%`, animationDelay: `${((i * 0.53) % 2.4).toFixed(2)}s`, animationDuration: `${(1.8 + ((i * 0.37) % 1.2)).toFixed(2)}s` }} />
          ))}
        </div>
      );
    }
    case 'flow': {
      const [x, y, w, h] = fx.region;
      return (
        <div
          className="fx-flow"
          style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, '--fx-color': fx.color ?? 'rgba(255, 200, 80, 0.55)', '--fx-speed': `${(2.4 / (fx.speed ?? 1)).toFixed(2)}s` } as CSSProperties}
        />
      );
    }
    case 'caustics': {
      const [x, y, w, h] = fx.region;
      return (
        <div
          className="fx-caustics"
          style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, '--fx-color': fx.color ?? 'rgba(200, 255, 250, 0.5)', '--fx-strength': fx.strength ?? 0.5 } as CSSProperties}
        />
      );
    }
    case 'fog':
      return (
        <div
          className="fx-fog"
          style={
            {
              top: `${fx.y}%`,
              height: `${fx.height}%`,
              ...(fx.width !== undefined ? { left: `${fx.x ?? 0}%`, width: `${fx.width}%` } : {}),
              '--fx-color': fx.color ?? 'rgba(220, 225, 235, 1)',
              '--fx-strength': fx.strength ?? 0.25,
            } as CSSProperties
          }
        />
      );
  }
}

// ---------- Glints along a path ----------

function pointAlong(path: [number, number][], t: number): [number, number] {
  const lens = path.slice(1).map(([x, y], i) => Math.hypot(x - path[i][0], y - path[i][1]));
  let d = t * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) {
      const k = lens[i] ? d / lens[i] : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
    }
    d -= lens[i];
  }
  return path[path.length - 1];
}

type GlintsProps = { path?: [number, number][]; region?: [number, number, number, number]; count: number; spread: number; color: string; size?: number; seed: number };

function Glints({ path, region, count, spread, color, size, seed }: GlintsProps) {
  const rand = makeRand(seed * 104729);
  const items = Array.from({ length: count }, () => {
    const [x, y]: [number, number] =
      path && path.length > 1
        ? pointAlong(path, rand())
        : region
          ? [region[0] + rand() * region[2], region[1] + rand() * region[3]]
          : [rand() * 100, rand() * 100];
    return {
      x: x + (rand() - 0.5) * spread * 2,
      y: y + (rand() - 0.5) * spread,
      delay: rand() * 3.2,
      dur: 1.8 + rand() * 1.8,
      size: size ?? (rand() < 0.3 ? 3 : 2),
    };
  });
  return (
    <>
      {items.map((g, i) => (
        <span
          key={i}
          className="fx-glint"
          style={
            {
              left: `${g.x}%`,
              top: `${g.y}%`,
              '--fx-color': color,
              '--fx-size': `${g.size}px`,
              animationDelay: `${g.delay.toFixed(2)}s`,
              animationDuration: `${g.dur.toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

// ---------- Particles (pixel squares on a low-res canvas) ----------

type Kind = Extract<Effect, { type: 'particles' }>['kind'];

const KINDS: Record<Kind, { colors: string[]; vx: number; vy: number; sway: number; size: [number, number]; twinkle?: boolean; glow?: boolean }> = {
  fireflies: { colors: ['#e8ff8a', '#fff1a0', '#c8ff70'], vx: 2, vy: -1.5, sway: 8, size: [1, 1], twinkle: true, glow: true },
  embers: { colors: ['#ff8a2a', '#ffcc4a', '#ff5a1a'], vx: 2, vy: -14, sway: 3, size: [1, 1], twinkle: true, glow: true },
  petals: { colors: ['#ffc4e1', '#ff9ad5', '#ffe3f1'], vx: 9, vy: 12, sway: 6, size: [1, 2] },
  snow: { colors: ['#ffffff', '#e8f0ff'], vx: 3, vy: 10, sway: 4, size: [1, 1] },
  dust: { colors: ['#ffe6b0', '#fff5dc'], vx: 2, vy: -1, sway: 4, size: [1, 1], twinkle: true },
  spores: { colors: ['#c8ff9a', '#ffe680', '#ffffff'], vx: 1, vy: 4, sway: 5, size: [1, 1], twinkle: true },
  sparkles: { colors: ['#ffffff', '#e3c8ff', '#ff9aff'], vx: 0, vy: -4, sway: 3, size: [1, 1], twinkle: true, glow: true },
  souls: { colors: ['#55ffff', '#2ad4d4', '#9ffcff'], vx: 0, vy: -6, sway: 4, size: [1, 2], twinkle: true, glow: true },
  leaves: { colors: ['#5d9c3a', '#7cbd4e', '#3f7d2a'], vx: 8, vy: 9, sway: 7, size: [1, 2] },
};

function ParticleField({ kind, region, count, colors, seed }: { kind: Kind; region: [number, number, number, number]; count: number; colors?: string[]; seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [x, y, w, h] = region;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const cfg = KINDS[kind];
    const rand = makeRand(seed * 7919 + kind.length);
    const parts = Array.from({ length: count }, () => ({
      x: rand(),
      y: rand(),
      phase: rand() * Math.PI * 2,
      speed: 0.6 + rand() * 0.8,
      color: (colors ?? cfg.colors)[Math.floor(rand() * (colors ?? cfg.colors).length)],
      size: cfg.size[0] + Math.round(rand() * (cfg.size[1] - cfg.size[0])),
    }));
    let cw = 0;
    let ch = 0;
    const resize = () => {
      // ~4 screen px per particle pixel for a chunky Minecraft look
      cw = Math.max(16, Math.round(canvas.clientWidth / 4));
      ch = Math.max(16, Math.round(canvas.clientHeight / 4));
      canvas.width = cw;
      canvas.height = ch;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, cw, ch);
      for (const p of parts) {
        const px = (((p.x * cw + cfg.vx * t * p.speed + Math.sin(t * 0.8 + p.phase) * cfg.sway) % cw) + cw) % cw;
        const py = (((p.y * ch + cfg.vy * t * p.speed) % ch) + ch) % ch;
        const a = cfg.twinkle ? 0.3 + 0.7 * ((Math.sin(t * 2 + p.phase) + 1) / 2) : 0.9;
        if (cfg.glow) {
          ctx.globalAlpha = a * 0.25;
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, p.size + 2, p.size + 2);
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(px), Math.round(py), p.size, p.size);
      }
      ctx.globalAlpha = 1;
    };
    if (reduced) {
      draw(0);
    } else {
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (document.hidden || now - last < 33) return;
        last = now;
        draw((now - start) / 1000);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [kind, count, seed, colors?.join()]);

  return <canvas ref={ref} className="fx-particles" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }} />;
}
