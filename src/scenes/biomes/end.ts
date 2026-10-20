import { heightLine, mix, type Biome, type Rand } from '../types';

type Island = { c: HTMLCanvasElement; x: number; y: number; ph: number; amp: number };
type Beam = { pts: number[]; x: number; y: number; ph: number };
type Star = { x: number; y: number; ph: number };
type Rod = { x: number; y: number; v: number; ph: number };
type EndState = {
  sky: HTMLCanvasElement;
  ground: HTMLCanvasElement;
  islands: Island[];
  beams: Beam[];
  stars: Star[];
  rods: Rod[];
  focus: { x: number; y: number };
  eyes: { x: number; y: number };
};

const VOID = '#0b0614';
const STONE_TOP = '#e9e6ad';
const STONE = ['#dcd89c', '#d4cf92', '#e2dea4', '#cbc688'];
const STONE_SHADE = '#a9a370';

function layer(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** End stone column with speckle texture. */
function endstone(g: CanvasRenderingContext2D, x: number, top: number, bottom: number, rand: Rand, haze: number, shadeFrom: number, shadeLen = 24) {
  g.fillStyle = cached(STONE_TOP, 0, haze);
  g.fillRect(x, top, 1, 2);
  for (let y = top + 2; y < bottom; y += 2) {
    const deep = y > shadeFrom ? Math.min(1, (y - shadeFrom) / shadeLen) : 0;
    const base = STONE[Math.floor(rand() * STONE.length)];
    g.fillStyle = cached(base, Math.round(deep * 8) / 8, haze);
    g.fillRect(x, y, 1, 2);
  }
}

const colorCache = new Map<string, string>();
function cached(base: string, deep: number, haze: number) {
  const key = `${base}${deep}${haze}`;
  let c = colorCache.get(key);
  if (!c) {
    c = mix(mix(base, STONE_SHADE, deep), VOID, haze);
    colorCache.set(key, c);
  }
  return c;
}

function makeIsland(w: number, depth: number, rand: Rand, haze: number) {
  const hgt = depth + 8;
  const L = layer(w, hgt);
  const prof = heightLine(w, rand, 5);
  for (let x = 0; x < w; x++) {
    const k = Math.abs(x - w / 2) / (w / 2);
    const top = Math.round(2 + k * k * 4 + prof[x] * 1.5);
    const bottom = Math.round(top + 3 + (1 - k * k) * depth * (0.6 + prof[x] * 0.5));
    endstone(L.g, x, top, Math.min(hgt, bottom), rand, haze, top + 3, 9);
  }
  return L.c;
}

function linePts(x0: number, y0: number, x1: number, y1: number): number[] {
  const pts: number[] = [];
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    pts.push(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
  }
  return pts;
}

export const end: Biome = {
  id: 'end',
  name: 'The End',
  hudColor: '#ff55ff',
  init(w, h, rand) {
    const groundY = Math.round(h * 0.74);

    // ---------- sky: void gradient, static dim stars, distant end city ----------
    const S = layer(w, h);
    const s = S.g;
    const bands = ['#05020a', '#07030d', '#090410', '#0b0514', '#0e0718', '#120a1e', '#170d24', '#1c112a'];
    const bh = Math.ceil(groundY / bands.length);
    bands.forEach((c, i) => {
      s.fillStyle = c;
      s.fillRect(0, i * bh, w, bh + 1);
    });
    s.fillStyle = bands[bands.length - 1];
    s.fillRect(0, groundY, w, h - groundY);
    // faint violet nebula drifts in the void
    for (let i = 0; i < 26; i++) {
      const nx = Math.round(w * 0.55 + (rand() - 0.5) * w * 0.9);
      const ny = Math.round(h * 0.25 + (rand() - 0.5) * h * 0.3);
      s.fillStyle = rand() < 0.5 ? 'rgba(90,40,120,0.06)' : 'rgba(50,30,100,0.07)';
      s.fillRect(nx, ny, 30 + Math.round(rand() * 80), 8 + Math.round(rand() * 18));
    }
    for (let i = 0; i < 220; i++) {
      s.fillStyle = ['#2a2238', '#3a3050', '#4a3f63'][Math.floor(rand() * 3)];
      s.fillRect(Math.floor(rand() * w), Math.floor(rand() * groundY), 1, 1);
    }
    // distant end city on its island (left)
    const cx = Math.round(w * 0.15);
    const cy = Math.round(h * 0.44);
    const cityIsland = makeIsland(70, 22, rand, 0.55);
    s.drawImage(cityIsland, cx - 35, cy);
    const purp = (hex: string) => mix(hex, VOID, 0.45);
    const tower = (x: number, y: number, tw: number, th: number) => {
      s.fillStyle = purp('#a67aa8');
      s.fillRect(x, y - th, tw, th);
      s.fillStyle = purp('#7d5683');
      s.fillRect(x + tw - 2, y - th, 2, th);
      s.fillStyle = purp('#c29ec4');
      s.fillRect(x - 1, y - th, tw + 2, 1);
      for (let yy = y - th + 3; yy < y; yy += 4) {
        s.fillStyle = purp('#8e6593');
        s.fillRect(x, yy, tw - 2, 1);
      }
    };
    tower(cx - 6, cy + 4, 12, 44);
    tower(cx - 9, cy - 40, 18, 10);
    tower(cx - 4, cy - 50, 8, 12);
    tower(cx + 8, cy + 4, 9, 22);
    tower(cx - 20, cy + 4, 10, 16);
    tower(cx + 7, cy - 18, 14, 6);
    s.fillStyle = purp('#e9e4ff');
    for (const [ex, ey] of [[cx - 1, cy - 62], [cx + 13, cy - 24], [cx - 16, cy - 12]]) s.fillRect(ex, ey, 1, 3);
    // end ship far to the right? keep the right calm: a far tiny island only
    s.drawImage(makeIsland(26, 8, rand, 0.7), Math.round(w * 0.9), Math.round(h * 0.22));

    // ---------- floating islands (bobbing) ----------
    const islands: Island[] = [
      { c: makeIsland(54, 18, rand, 0.25), x: Math.round(w * 0.3), y: Math.round(h * 0.2), ph: 0, amp: 2 },
      { c: makeIsland(34, 12, rand, 0.4), x: Math.round(w * 0.62), y: Math.round(h * 0.12), ph: 2, amp: 1.5 },
      { c: makeIsland(64, 24, rand, 0.15), x: Math.round(w * 0.74), y: Math.round(h * 0.34), ph: 4, amp: 2.5 },
    ];

    // ---------- main island + obsidian pillars ----------
    const G = layer(w, h);
    const g = G.g;
    const gl = heightLine(w, rand, 24);
    const tops: number[] = [];
    for (let x = 0; x < w; x++) {
      const top = Math.round(groundY + gl[x] * 6);
      tops.push(top);
      endstone(g, x, top, h, rand, 0, h);
    }
    // craters/shadows on the ground
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(rand() * w);
      const y = tops[x] + 6 + Math.floor(rand() * (h - tops[x] - 6));
      g.fillStyle = 'rgba(120,110,70,0.35)';
      g.fillRect(x, y, 4 + Math.floor(rand() * 8), 2);
    }

    const focus = { x: Math.round(w * 0.5), y: Math.round(h * 0.07) };
    const beams: Beam[] = [];
    const pillarDefs: [number, number, number, number][] = [
      // x fraction, width, height, haze
      [0.36, 10, 110, 0.55],
      [0.6, 10, 96, 0.55],
      [0.05, 18, 190, 0],
      [0.22, 16, 150, 0.15],
      [0.82, 16, 160, 0.15],
      [0.95, 18, 205, 0],
    ];
    for (const [fx, pw, ph, hz] of pillarDefs) {
      const px = Math.round(w * fx - pw / 2);
      const base = tops[Math.max(0, Math.min(w - 1, Math.round(w * fx)))] + 4;
      const top = base - ph;
      const c = (hex: string) => mix(hex, VOID, hz);
      g.fillStyle = c('#160d24');
      g.fillRect(px, top, pw, ph);
      g.fillStyle = c('#24183a');
      g.fillRect(px, top, Math.round(pw * 0.35), ph);
      g.fillStyle = c('#0c0714');
      g.fillRect(px + pw - 3, top, 3, ph);
      for (let i = 0; i < ph * pw * 0.04; i++) {
        g.fillStyle = c(rand() < 0.5 ? '#3d2a5e' : '#2e2048');
        g.fillRect(px + Math.floor(rand() * (pw - 3)), top + Math.floor(rand() * ph), 1 + Math.floor(rand() * 2), 1);
      }
      // bedrock + crystal base
      g.fillStyle = c('#3a3a3a');
      g.fillRect(px + Math.round(pw / 2) - 3, top - 3, 6, 3);
      g.fillStyle = c('#555555');
      g.fillRect(px + Math.round(pw / 2) - 3, top - 3, 6, 1);
      const bx = px + Math.round(pw / 2);
      const by = top - 9;
      beams.push({ pts: linePts(bx, by, focus.x, focus.y), x: bx, y: by, ph: rand() * 6 });
    }
    // enderman silhouette on the main island, right of center
    const ex = Math.round(w * 0.7);
    const ey = tops[ex] + 3;
    g.fillStyle = '#090510';
    g.fillRect(ex, ey - 14, 2, 14);
    g.fillRect(ex + 5, ey - 14, 2, 14);
    g.fillRect(ex - 1, ey - 26, 9, 12);
    g.fillRect(ex - 3, ey - 26, 2, 16);
    g.fillRect(ex + 8, ey - 26, 2, 16);
    g.fillRect(ex - 1, ey - 34, 9, 8);

    const stars: Star[] = Array.from({ length: 40 }, () => ({
      x: Math.floor(rand() * w),
      y: Math.floor(rand() * groundY * 0.9),
      ph: rand() * 10,
    }));
    const rods: Rod[] = Array.from({ length: 34 }, () => ({
      x: rand() * w,
      y: rand() * h,
      v: 3 + rand() * 6,
      ph: rand() * 10,
    }));
    return {
      sky: S.c,
      ground: G.c,
      islands,
      beams,
      stars,
      rods,
      focus,
      eyes: { x: ex, y: ey - 31 },
    } satisfies EndState;
  },
  draw(ctx, w, h, t, st) {
    const { sky, ground, islands, beams, stars, rods, focus, eyes } = st as EndState;
    ctx.drawImage(sky, 0, 0);

    for (const s of stars) {
      const a = Math.sin(t * 1.3 + s.ph);
      if (a < 0.3) continue;
      ctx.fillStyle = a > 0.85 ? '#e8dcff' : '#8a7aa8';
      ctx.fillRect(s.x, s.y, 1, 1);
    }

    for (const isl of islands) {
      ctx.drawImage(isl.c, isl.x, Math.round(isl.y + Math.sin(t * 0.6 + isl.ph) * isl.amp));
    }

    // crystal beams: pulsing, with a stripe pattern flowing toward the focus
    const pulse = 0.55 + Math.sin(t * 2.2) * 0.25;
    const bright = `rgba(255,220,255,${(pulse * 0.8).toFixed(3)})`;
    const dim = `rgba(200,120,230,${(pulse * 0.45).toFixed(3)})`;
    for (const b of beams) {
      const n = b.pts.length / 2;
      const shift = Math.floor(t * 24 + b.ph * 10);
      for (let i = 0; i < n; i++) {
        const stripe = (i - shift) % 8;
        const s = stripe < 0 ? stripe + 8 : stripe;
        ctx.fillStyle = s < 3 ? bright : dim;
        ctx.fillRect(b.pts[i * 2], b.pts[i * 2 + 1], 1, 1);
      }
    }
    // focus glow
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 1; k <= 4; k++) {
      ctx.fillStyle = `rgba(200,110,230,${(0.05 * pulse).toFixed(3)})`;
      ctx.fillRect(focus.x - k * 5, focus.y - k * 5, k * 10, k * 10);
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.drawImage(ground, 0, 0);

    // end crystals: spinning cubes with glow
    const frame = Math.floor(t * 4) % 2;
    for (const b of beams) {
      const bob = Math.round(Math.sin(t * 2 + b.ph) * 2);
      const x = b.x;
      const y = b.y + bob;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,120,220,0.12)';
      ctx.fillRect(x - 8, y - 8, 16, 16);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = frame ? '#d9c8ff' : '#b89adf';
      ctx.fillRect(x - 4, y - 4, 8, 8);
      ctx.fillStyle = '#ff7ad6';
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.fillStyle = frame ? '#ffffff' : '#ffc0ec';
      ctx.fillRect(frame ? x - 2 : x, frame ? y - 2 : y, 2, 2);
    }

    // enderman eyes
    if (Math.sin(t * 0.7) > -0.85) {
      ctx.fillStyle = '#e07bff';
      ctx.fillRect(eyes.x, eyes.y, 2, 1);
      ctx.fillRect(eyes.x + 5, eyes.y, 2, 1);
      ctx.fillStyle = '#ff40ff';
      ctx.fillRect(eyes.x + 1, eyes.y, 1, 1);
      ctx.fillRect(eyes.x + 6, eyes.y, 1, 1);
    }

    // end rod particles drifting up
    for (const r of rods) {
      const y = Math.round((((r.y - t * r.v) % h) + h) % h);
      const x = Math.round((r.x + Math.sin(t * 0.5 + r.ph) * 6 + w) % w);
      const tw = Math.sin(t * 3 + r.ph);
      ctx.fillStyle = tw > 0.5 ? '#ffffff' : '#e3d6f5';
      ctx.fillRect(x, y, 1, 1);
      if (tw > 0.85) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
  },
};
