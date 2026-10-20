import type { PixelArt } from '../ui/PixelIcon';

// Code-drawn 16×16 "world thumbnails" for the Select World screen.
// Each thumbnail is seeded by the project id so it stays stable between renders.

const SIZE = 16;

type RGB = [number, number, number];

function parse(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix two hex colors; t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const A = parse(a);
  const B = parse(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = parse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Tiny deterministic PRNG (mulberry32) seeded from a string. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth-ish 1D height line: a few random control points, linearly interpolated. */
function heights(rand: () => number, min: number, max: number, step: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= Math.ceil(SIZE / step) + 1; i++) pts.push(min + Math.floor(rand() * (max - min + 1)));
  const out: number[] = [];
  for (let x = 0; x < SIZE; x++) {
    const i = Math.floor(x / step);
    const t = (x % step) / step;
    out.push(Math.round(pts[i] + (pts[i + 1] - pts[i]) * t));
  }
  return out;
}

const cache = new Map<string, PixelArt>();

/** Generate a little pixel landscape: sky, sun/moon, clouds, far hills and a grassy ground. */
export function worldThumb(id: string, sky: string, ground: string): PixelArt {
  const key = `${id}|${sky}|${ground}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rand = rng(id);
  const night = luminance(sky) < 0.35;
  const palette: Record<string, string> = {
    S: sky,
    s: mix(sky, '#ffffff', night ? 0.12 : 0.28), // horizon glow
    o: night ? '#e8e8f0' : '#fff6a0', // sun / moon
    O: night ? '#b8b8c8' : '#ffd84a',
    c: night ? mix(sky, '#ffffff', 0.35) : '#ffffff',
    h: mix(mix(sky, ground, 0.55), '#000000', 0.12), // far hills
    g: ground,
    G: mix(ground, '#ffffff', 0.22),
    d: mix(ground, '#5a3c22', 0.62), // dirt
    D: mix(ground, '#3a2814', 0.72),
    k: mix(ground, '#2a2a2a', 0.8), // bedrock-ish
  };

  const grid: string[][] = Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, () => (y >= 6 ? 's' : 'S')),
  );

  // Sun or moon (3×3 with a highlight)
  const sx = 1 + Math.floor(rand() * (SIZE - 5));
  const sy = 1 + Math.floor(rand() * 2);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) grid[sy + y][sx + x] = x === 2 || y === 2 ? 'O' : 'o';

  // Clouds
  const clouds = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < clouds; i++) {
    const cw = 3 + Math.floor(rand() * 3);
    const cx = Math.floor(rand() * (SIZE - cw));
    const cy = 1 + Math.floor(rand() * 4);
    for (let x = cx; x < cx + cw; x++) grid[cy][x] = 'c';
    if (cw > 3) for (let x = cx + 1; x < cx + cw - 1; x++) grid[cy - 1 < 0 ? cy : cy - 1][x] = 'c';
  }

  // Far hills, then foreground terrain
  const far = heights(rand, 6, 9, 4);
  const near = heights(rand, 9, 12, 3);
  for (let x = 0; x < SIZE; x++) {
    for (let y = far[x]; y < SIZE; y++) grid[y][x] = 'h';
    for (let y = near[x]; y < SIZE; y++) {
      const depth = y - near[x];
      let ch = depth === 0 ? 'G' : depth === 1 ? 'g' : (x + y) % 3 === 0 ? 'D' : 'd';
      if (y === SIZE - 1) ch = 'k';
      grid[y][x] = ch;
    }
  }

  // A tree, sometimes
  if (rand() > 0.35) {
    const tx = 2 + Math.floor(rand() * (SIZE - 4));
    const base = near[tx];
    palette.t = mix('#6b4a2b', ground, 0.2);
    palette.l = mix(ground, '#1f4a14', 0.5);
    for (let y = base - 3; y < base; y++) if (y >= 0) grid[y][tx] = 't';
    for (let y = base - 5; y <= base - 3; y++)
      for (let x = tx - 1; x <= tx + 1; x++) if (y >= 0 && x >= 0 && x < SIZE && !(y === base - 3 && x === tx)) grid[y][x] = 'l';
  }

  const art: PixelArt = { palette, grid: grid.map((r) => r.join('')) };
  cache.set(key, art);
  return art;
}

/** The white "play" arrow MC shows over a hovered world thumbnail (16×16, matches thumb scale). */
export const playArrow: PixelArt = {
  palette: { w: '#ffffff', s: '#6a6a6a' },
  grid: [
    '................',
    '................',
    '.....w..........',
    '.....ww.........',
    '.....www........',
    '.....wwww.......',
    '.....wwwww......',
    '.....wwwwww.....',
    '.....wwwwwss....',
    '.....wwwwss.....',
    '.....wwwss......',
    '.....wwss.......',
    '.....wss........',
    '.....ss.........',
    '................',
    '................',
  ],
};
