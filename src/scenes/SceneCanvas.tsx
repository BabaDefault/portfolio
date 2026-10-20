import { useEffect, useRef } from 'react';
import { biomes } from './biomes';
import { makeRand, type BiomeId, type BiomeState } from './types';

const LOW_RES_H = 320;
const FPS = 30;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Full-screen low-res canvas that renders the active biome. */
export function SceneCanvas({ biome }: { biome: BiomeId }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const def = biomes[biome];
    let state: BiomeState = {};
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const reduced = prefersReducedMotion();

    const resize = () => {
      const aspect = window.innerWidth / Math.max(1, window.innerHeight);
      h = LOW_RES_H;
      w = Math.max(180, Math.round(h * aspect));
      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingEnabled = false;
      state = def.init(w, h, makeRand(hash(biome)));
      if (reduced) def.draw(ctx, w, h, 0, state);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 1000 / FPS) return;
      last = now;
      def.draw(ctx, w, h, (now - start) / 1000, state);
    };

    // Rebuilding a biome's static layers can take ~10–80ms, so wait until resizing settles.
    // Until then the CSS stretches the old frame, which is invisible at pixel-art scale.
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    };

    resize();
    window.addEventListener('resize', onResize);
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [biome]);

  return <canvas ref={ref} className="scene-canvas" aria-hidden="true" />;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
