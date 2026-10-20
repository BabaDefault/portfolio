import { useEffect, useRef } from 'react';
import { makeRand, type BiomeId } from './types';

// Lightweight particle layer drawn over a background *image*, so image scenes still feel alive.

type Ambient = {
  colors: string[];
  count: number;
  vx: number; // drift, low-res px per second
  vy: number;
  size: [number, number];
  twinkle?: boolean;
  sway?: number; // horizontal sine amplitude
};

const AMBIENT: Record<BiomeId, Ambient> = {
  ocean: { colors: ['#fff3c4', '#ffd9a0'], count: 24, vx: 3, vy: -1, size: [1, 1], twinkle: true },
  cherry: { colors: ['#ffc4e1', '#ff9ad5', '#ffe3f1'], count: 40, vx: 10, vy: 14, size: [1, 2], sway: 6 },
  nether: { colors: ['#ff8a2a', '#ffcc4a', '#ff5a1a'], count: 45, vx: 2, vy: -16, size: [1, 1], sway: 3, twinkle: true },
  mineshaft: { colors: ['#ffcf7a', '#bfa58a'], count: 22, vx: 1, vy: -3, size: [1, 1], twinkle: true },
  desert: { colors: ['#f6d29a', '#e8b878'], count: 30, vx: 18, vy: 1, size: [1, 1], sway: 2 },
  deepdark: { colors: ['#55ffff', '#2ad4d4', '#9ffcff'], count: 30, vx: 0, vy: -6, size: [1, 2], sway: 4, twinkle: true },
  village: { colors: ['#e8ff8a', '#fff1a0'], count: 22, vx: 2, vy: -1, size: [1, 1], sway: 8, twinkle: true },
  lush: { colors: ['#ffe680', '#c8ff9a', '#ffffff'], count: 30, vx: 2, vy: 3, size: [1, 1], sway: 5, twinkle: true },
  end: { colors: ['#ffffff', '#e3c8ff', '#ff9aff'], count: 40, vx: 0, vy: -5, size: [1, 1], sway: 3, twinkle: true },
};

const LOW_RES_H = 320;

export function AmbientCanvas({ biome }: { biome: BiomeId }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cfg = AMBIENT[biome];
    const rand = makeRand(biome.length * 9973);
    const parts = Array.from({ length: cfg.count }, () => ({
      x: rand(),
      y: rand(),
      phase: rand() * Math.PI * 2,
      speed: 0.6 + rand() * 0.8,
      color: cfg.colors[Math.floor(rand() * cfg.colors.length)],
      size: cfg.size[0] + Math.round(rand() * (cfg.size[1] - cfg.size[0])),
    }));
    let w = 0;
    const h = LOW_RES_H;
    const resize = () => {
      w = Math.round(h * (window.innerWidth / Math.max(1, window.innerHeight)));
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 33) return;
      last = now;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const x = (((p.x * w + cfg.vx * t * p.speed + Math.sin(t + p.phase) * (cfg.sway ?? 0)) % w) + w) % w;
        const y = (((p.y * h + cfg.vy * t * p.speed) % h) + h) % h;
        ctx.globalAlpha = cfg.twinkle ? 0.35 + 0.65 * ((Math.sin(t * 2 + p.phase) + 1) / 2) : 0.9;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(x), Math.round(y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [biome]);

  return <canvas ref={ref} className="scene-canvas scene-canvas--ambient" aria-hidden="true" />;
}
