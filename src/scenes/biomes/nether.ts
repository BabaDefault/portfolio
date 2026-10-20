import { heightLine, mix, type Biome, type Rand } from '../types';

type Fall = { x: number; w: number; top: number; bottom: number; off: number; haze: number; pal: string[] };
type Ember = { x: number; y: number; vy: number; ph: number; size: number };
type Smoke = { y: number; h: number; speed: number; w: number; x: number; a: number };
type NetherState = {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  falls: Fall[];
  embers: Ember[];
  smoke: Smoke[];
  lavaY: number;
  spots: { x: number; y: number; ph: number }[];
};

const RACK = ['#5e1818', '#661b1a', '#561515', '#6f201e', '#4d1313', '#5a1717'];
const HAZE = '#4a1410';
const LAVA = ['#ffd15a', '#ffae2e', '#ff8a1c', '#f0641a', '#d4461a'];

function layer(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** Fill a rect with chunky netherrack noise. */
function rack(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rand: Rand, haze: number, dark: number) {
  for (let yy = y; yy < y + h; yy += 2) {
    for (let xx = x; xx < x + w; xx += 2) {
      g.fillStyle = mix(mix(RACK[Math.floor(rand() * RACK.length)], HAZE, haze), '#000000', dark);
      g.fillRect(xx, yy, 2, 2);
    }
  }
}

export const nether: Biome = {
  id: 'nether',
  name: 'Nether Fortress',
  hudColor: '#ff5555',
  init(w, h, rand) {
    const lavaY = Math.round(h * 0.74);

    // ---------- back layer: cavern, far cliffs, ceiling ----------
    const back = layer(w, h);
    const b = back.g;
    const grad = ['#1a0505', '#230707', '#2d0a08', '#3a0d0a', '#4a130c', '#5e1a0e', '#7a2610', '#9a3412'];
    const band = Math.ceil(lavaY / grad.length);
    grad.forEach((c, i) => {
      b.fillStyle = c;
      b.fillRect(0, i * band, w, band + 1);
    });
    // far cliffs (hazy silhouettes rising from the lava)
    const far = heightLine(w, rand, 30);
    for (let x = 0; x < w; x += 2) {
      const top = Math.round(h * 0.42 + far[x] * h * 0.2);
      b.fillStyle = mix('#3c0f0c', '#6a2212', (top - h * 0.4) / (h * 0.4));
      b.fillRect(x, top, 2, lavaY - top);
    }
    // far ceiling with hanging netherrack spikes
    const ceil = heightLine(w, rand, 14);
    for (let x = 0; x < w; x += 2) {
      const d = Math.round(18 + ceil[x] * 30 + (rand() < 0.08 ? rand() * 30 : 0));
      b.fillStyle = '#240807';
      b.fillRect(x, 0, 2, d);
      b.fillStyle = '#331009';
      b.fillRect(x, d - 2, 2, 2);
    }

    // ---------- lavafalls ----------
    const falls: Fall[] = (
      [
        [0.135, 8, 30, 0, 0],
        [0.33, 5, 40, 7, 0.35],
        [0.48, 4, 46, 13, 0.5],
        [0.86, 4, 36, 5, 0.65],
      ] as const
    ).map(([fx, fw, top, off, haze]) => ({
      x: Math.round(w * fx),
      w: fw,
      top,
      bottom: lavaY,
      off,
      haze,
      pal: [...LAVA, '#c43c14'].map((c) => mix(c, HAZE, haze)),
    }));
    // glow around lavafalls (baked)
    for (const f of falls) {
      for (let r = 4; r >= 1; r--) {
        b.fillStyle = `rgba(255,110,30,${0.035 * (1 - f.haze * 0.6)})`;
        b.fillRect(f.x - r * 7, f.top, f.w + r * 14, f.bottom - f.top);
      }
      // source opening in the ceiling
      b.fillStyle = '#ff9a2a';
      b.fillRect(f.x - 2, f.top - 3, f.w + 4, 3);
    }

    // ---------- front layer: fortress bridge, tower, near rocks, vignette ----------
    const front = layer(w, h);
    const g = front.g;
    const deckY = Math.round(h * 0.47);
    const brick = (x: number, y: number, bw: number, bh: number, base: string) => {
      g.fillStyle = base;
      g.fillRect(x, y, bw, bh);
      g.fillStyle = mix(base, '#000000', 0.45);
      for (let yy = y; yy < y + bh; yy += 3) {
        g.fillRect(x, yy, bw, 1);
        const shift = ((yy - y) / 3) % 2 === 0 ? 0 : 3;
        for (let xx = x + shift; xx < x + bw; xx += 6) g.fillRect(xx, yy, 1, 3);
      }
      g.fillStyle = mix(base, '#ff7a3a', 0.12);
      g.fillRect(x, y + bh - 1, bw, 1); // under-lit by the lava
    };
    const NB = '#3a141a';
    // bridge deck across the scene
    brick(0, deckY, w, 9, NB);
    // fence posts on the deck
    g.fillStyle = '#2a0e13';
    for (let x = 2; x < w; x += 12) g.fillRect(x, deckY - 7, 2, 7);
    g.fillRect(0, deckY - 6, w, 1);
    g.fillRect(0, deckY - 3, w, 1);
    // arched supports
    const span = 64;
    for (let px = -10; px < w + span; px += span) {
      brick(px, deckY + 9, 14, lavaY - deckY - 9, '#331217');
      // arch under the deck between supports
      for (let i = 0; i < span - 14; i++) {
        const k = (i / (span - 14)) * 2 - 1;
        const ah = Math.round(10 * (1 - k * k));
        g.fillStyle = '#2b0f14';
        g.fillRect(px + 14 + i, deckY + 9, 1, 10 - ah + 1);
      }
    }
    // fortress tower on the left
    const tx = Math.round(w * 0.2);
    const tw = 44;
    const ttop = Math.round(h * 0.18);
    brick(tx, ttop, tw, deckY - ttop, '#3d151c');
    g.fillStyle = mix('#3d151c', '#000000', 0.35);
    g.fillRect(tx + tw - 6, ttop, 6, deckY - ttop);
    for (let x = tx - 2; x < tx + tw + 2; x += 8) {
      brick(x, ttop - 6, 5, 6, '#3d151c');
    }
    // glowing windows
    for (const [wx, wy] of [[tx + 8, ttop + 16], [tx + 26, ttop + 16], [tx + 17, ttop + 46]]) {
      g.fillStyle = 'rgba(255,120,40,0.18)';
      g.fillRect(wx - 3, wy - 3, 11, 14);
      g.fillStyle = '#ff9a3a';
      g.fillRect(wx, wy, 5, 8);
      g.fillStyle = '#ffd36a';
      g.fillRect(wx + 1, wy + 2, 3, 4);
    }
    // a second smaller fortress block mid-right, hazy
    const t2 = Math.round(w * 0.62);
    brick(t2, deckY - 26, 30, 26, mix('#3d151c', HAZE, 0.25));
    for (let x = t2; x < t2 + 30; x += 7) brick(x, deckY - 30, 4, 4, mix('#3d151c', HAZE, 0.25));

    // near netherrack outcrops: big cliff left, ledge at the bottom right
    const nl = heightLine(w, rand, 22);
    for (let x = 0; x < w; x += 2) {
      const edge = x < w * 0.12 ? 1 - x / (w * 0.12) : 0;
      if (edge > 0) {
        const top = Math.round(h * 0.25 + (1 - edge) * h * 0.4 + nl[x] * 18);
        rack(g, x, top, 2, h - top, rand, 0, 0.15);
      }
    }
    const lavaTop = (x: number) => Math.round(lavaY + 6 + nl[x] * 10);
    for (let x = 0; x < w; x += 2) {
      // low netherrack shore at the right (under the panel) and a few islets mid-lava
      let top = h;
      if (x > w * 0.7) top = lavaTop(x) + 18 - Math.round(Math.min(1, (x - w * 0.7) / (w * 0.12)) * 14);
      if (top < h) rack(g, x, top, 2, h - top, rand, 0, 0.45);
    }
    // ceiling near: heavy dark overhang with stalactites
    for (let x = 0; x < w; x += 2) {
      const d = Math.round(6 + Math.max(0, Math.sin(x * 0.07) * 8) + (rand() < 0.07 ? rand() * 26 : 0));
      rack(g, x, 0, 2, d, rand, 0, 0.55);
    }
    // glowstone clusters on the ceiling
    for (const gx of [Math.round(w * 0.36), Math.round(w * 0.55)]) {
      for (let r = 3; r >= 1; r--) {
        g.fillStyle = 'rgba(255,200,110,0.035)';
        g.fillRect(gx + 5 - r * 8, 0, 6 + r * 16, 10 + r * 8);
      }
      for (let i = 0; i < 9; i++) {
        g.fillStyle = ['#ffe28a', '#f6c25a', '#d99a3a'][i % 3];
        g.fillRect(gx + Math.floor(rand() * 10), 2 + Math.floor(rand() * 10), 3, 3);
      }
    }
    // darken the right side where the panel sits
    for (let x = Math.round(w * 0.55); x < w; x += 4) {
      const k = (x - w * 0.55) / (w * 0.45);
      g.fillStyle = `rgba(10,0,0,${(k * 0.45).toFixed(3)})`;
      g.fillRect(x, 0, 4, h);
    }

    const embers: Ember[] = Array.from({ length: 60 }, () => ({
      x: rand() * w,
      y: rand() * h,
      vy: 10 + rand() * 18,
      ph: rand() * Math.PI * 2,
      size: rand() < 0.25 ? 2 : 1,
    }));
    const smoke: Smoke[] = Array.from({ length: 5 }, (_, i) => ({
      y: Math.round(h * (0.12 + i * 0.13)),
      h: 10 + Math.round(rand() * 14),
      speed: 2 + rand() * 3,
      w: Math.round(w * (0.4 + rand() * 0.4)),
      x: rand() * w,
      a: 0.05 + rand() * 0.05,
    }));
    const spots = Array.from({ length: 70 }, () => ({
      x: Math.round(rand() * w),
      y: Math.round(lavaY + 2 + rand() * (h - lavaY)),
      ph: rand() * Math.PI * 2,
    }));
    return { back: back.c, front: front.c, falls, embers, smoke, lavaY, spots } satisfies NetherState;
  },
  draw(ctx, w, h, t, s) {
    const { back, front, falls, embers, smoke, lavaY, spots } = s as NetherState;
    ctx.drawImage(back, 0, 0);

    // lavafalls: streaks flowing downward
    for (const f of falls) {
      const pal = f.pal;
      for (let y = f.top; y < f.bottom; y += 2) {
        const k = Math.floor((y - t * 55 + f.off * 9) / 5);
        const hsh = (Math.imul(k, 2654435761) >>> 0) % 5;
        ctx.fillStyle = pal[hsh];
        ctx.fillRect(f.x, y, f.w, 2);
        ctx.fillStyle = pal[hsh < 2 ? 0 : 1];
        ctx.fillRect(f.x + 1 + (hsh % 2), y, Math.max(1, f.w - 3), 2);
      }
      // edges darker crust
      ctx.fillStyle = pal[5];
      ctx.fillRect(f.x, f.top, 1, f.bottom - f.top);
      // splash at the base
      for (let i = 0; i < 4; i++) {
        const ph = (t * 2.2 + i * 0.25) % 1;
        const sx = Math.round(f.x + f.w / 2 + (i - 1.5) * 4 * ph * 2);
        const sy = Math.round(f.bottom - Math.sin(ph * Math.PI) * 6);
        ctx.fillStyle = pal[0];
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // lava sea: banded with slowly drifting bright spots
    const bands = ['#ff9a24', '#f57a1c', '#ea621a', '#d44c18', '#bf3c16', '#a83214'];
    const bh = Math.ceil((h - lavaY) / bands.length);
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, lavaY + i * bh, w, bh + 1);
    });
    ctx.fillStyle = '#ffd36a';
    ctx.fillRect(0, lavaY, w, 1);
    for (const p of spots) {
      const a = Math.sin(t * 1.3 + p.ph);
      if (a < 0.2) continue;
      const x = Math.round((p.x + t * 3 + Math.sin(t * 0.5 + p.ph) * 4) % w);
      ctx.fillStyle = a > 0.75 ? '#ffe9a0' : '#ffbf4a';
      ctx.fillRect(x, p.y, 3 + Math.round(a * 3), 1);
    }
    // heat glow rising above the lava
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(255,110,30,${0.07 - i * 0.012})`;
      ctx.fillRect(0, lavaY - (i + 1) * 12, w, 12);
    }

    ctx.drawImage(front, 0, 0);

    // smoky haze drifting
    for (const m of smoke) {
      const x = Math.round(((m.x + t * m.speed) % (w + m.w)) - m.w);
      ctx.fillStyle = `rgba(40,12,10,${m.a + Math.sin(t * 0.4 + m.y) * 0.02})`;
      ctx.fillRect(x, m.y, m.w, m.h);
      ctx.fillRect(x + 12, m.y - 4, m.w - 24, 4);
    }

    // embers rising
    for (const e of embers) {
      const life = ((e.y - t * e.vy) % h + h) % h; // 0 top .. h bottom
      const y = Math.round(life);
      const x = Math.round(e.x + Math.sin(t * 1.2 + e.ph + y * 0.03) * 6);
      const k = 1 - life / h; // higher = older
      if (k > 0.85 && Math.sin(t * 9 + e.ph) > 0) continue;
      ctx.fillStyle = k < 0.35 ? '#ffe08a' : k < 0.65 ? '#ff9a2e' : '#d0441a';
      ctx.fillRect(x, y, e.size, e.size);
    }
  },
};
