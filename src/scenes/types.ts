/**
 * Contract for a code-drawn biome background.
 *
 * SceneCanvas renders at LOW resolution (about 320px tall; width follows the
 * viewport aspect ratio) and the canvas is upscaled with
 * `image-rendering: pixelated`, so 1 unit = 1 chunky "pixel". Draw blocky:
 * integer coordinates, fillRect, no anti-aliased arcs or curves.
 *
 * `init` runs once per size change: precompute terrain and positions there
 * using `rand` (seeded, deterministic). `draw` runs every frame (or once when
 * reduced motion is on, with t = 0) and should stay cheap: plain fillRects,
 * with particles derived from `t` rather than per-frame random state.
 *
 * Leave the lower-middle area reasonably calm, because the HUD hotbar sits over
 * the bottom ~18% and screen panels sit on the left, right or center.
 */
export type Rand = () => number; // [0, 1)

export type BiomeState = Record<string, unknown>;

export type Biome = {
  id: BiomeId;
  name: string; // shown in the HUD, e.g. "Cherry Grove"
  hudColor: string; // color of the biome name in the HUD
  init: (w: number, h: number, rand: Rand) => BiomeState;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, state: BiomeState) => void;
};

export type BiomeId =
  | 'ocean'
  | 'cherry'
  | 'nether'
  | 'mineshaft'
  | 'desert'
  | 'deepdark'
  | 'village'
  | 'lush'
  | 'end';

/** Mulberry32 seeded PRNG */
export function makeRand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vertical banded gradient (blocky sky). */
export function bandedSky(ctx: CanvasRenderingContext2D, w: number, h: number, colors: string[]) {
  const band = Math.ceil(h / colors.length);
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * band, w, band + 1);
  });
}

/** Linear interpolate two hex colors → hex. */
export function mix(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - k) + ((pb >> 16) & 255) * k);
  const g = Math.round(((pa >> 8) & 255) * (1 - k) + ((pb >> 8) & 255) * k);
  const bl = Math.round((pa & 255) * (1 - k) + (pb & 255) * k);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

/** Smooth-ish 1D value noise for terrain heights, in [0, 1). */
export function heightLine(w: number, rand: Rand, step = 8, rough = 1): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= Math.ceil(w / step) + 1; i++) pts.push(rand());
  const out: number[] = [];
  for (let x = 0; x < w; x++) {
    const i = Math.floor(x / step);
    const f = (x % step) / step;
    const s = f * f * (3 - 2 * f);
    out.push((pts[i] * (1 - s) + pts[i + 1] * s) * rough);
  }
  return out;
}
