import { bandedSky, heightLine, mix, type Biome, type Rand } from '../types';

type Cloud = { x: number; y: number; w: number; speed: number };
type Petal = { x: number; y: number; vx: number; vy: number; ph: number; c: string };
type CherryState = {
  sky: HTMLCanvasElement;
  land: HTMLCanvasElement;
  clouds: Cloud[];
  petals: Petal[];
  bee: { x: number; y: number };
};

const SKY = ['#78b2e6', '#86bbea', '#97c5ed', '#aacff0', '#bfd9f1', '#d6def0', '#e9dcea', '#f5d8e4'];
const HAZE = '#e8dbe9';
const PINK = ['#fde3ef', '#f8c4dc', '#f1a7cb', '#e48bb7', '#c96c9e', '#a8547f'];
const PETAL_COLORS = ['#fbd3e6', '#f5b3d2', '#ee9cc6', '#ffe6f1'];

function layer(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** Blocky jagged blob of blossom cells, lit from the top-left. */
function canopy(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rw: number,
  rh: number,
  cell: number,
  rand: Rand,
  haze: number,
) {
  for (let gy = -rh; gy <= rh; gy += cell) {
    for (let gx = -rw; gx <= rw; gx += cell) {
      const d = (gx / rw) ** 2 + (gy / rh) ** 2;
      if (d > 1 - rand() * 0.3) continue;
      const k = ((gy / rh + 1) / 2) * 0.75 + ((gx / rw + 1) / 2) * 0.25;
      const idx = Math.min(5, Math.max(0, Math.floor(k * 5 + (rand() - 0.5) * 1.6)));
      g.fillStyle = mix(PINK[idx], HAZE, haze);
      g.fillRect(Math.round(cx + gx), Math.round(cy + gy), cell, cell);
    }
  }
}

function tree(g: CanvasRenderingContext2D, x: number, base: number, size: number, rand: Rand, haze: number) {
  const trunkH = Math.round(size * 0.85);
  const tw = Math.max(2, Math.round(size / 10));
  const bark = mix('#5b3338', HAZE, haze);
  const barkD = mix('#3a1f26', HAZE, haze);
  const barkL = mix('#7a4a4c', HAZE, haze);
  g.fillStyle = bark;
  g.fillRect(x, base - trunkH, tw, trunkH);
  g.fillStyle = barkD;
  g.fillRect(x + tw - 1, base - trunkH, 1, trunkH);
  g.fillStyle = barkL;
  g.fillRect(x, base - trunkH, 1, trunkH);
  const cell = size > 46 ? 3 : 2;
  const top = base - trunkH;
  // diagonal branches out to side lobes
  const lobes: [number, number][] = [[x + tw / 2, top - size * 0.08]];
  const nb = size > 30 ? 2 : 1;
  for (let b = 0; b < nb; b++) {
    const dir = b === 0 ? (rand() < 0.5 ? -1 : 1) : -1 * (lobes.length > 1 && lobes[1][0] > x ? 1 : -1);
    const len = Math.round(size * (0.35 + rand() * 0.25));
    const by = base - Math.round(trunkH * (0.55 + rand() * 0.2));
    const bw = Math.max(1, tw - 1);
    for (let i = 0; i < len; i++) {
      g.fillStyle = i % 3 === 0 ? barkD : bark;
      g.fillRect(x + (dir > 0 ? tw : -bw) + dir * i, by - Math.round(i * 0.75), bw, bw + 1);
    }
    lobes.push([x + dir * len + tw / 2, by - len * 0.75 - size * 0.05]);
  }
  // shadow under canopy, then lobes (main last so it sits on top)
  for (let i = lobes.length - 1; i >= 0; i--) {
    const [lx, ly] = lobes[i];
    const rw = size * (i === 0 ? 0.55 : 0.42);
    const rh = size * (i === 0 ? 0.3 : 0.24);
    canopy(g, lx, ly, rw, rh, cell, rand, haze);
    // hanging blossom strands
    for (let s = 0; s < 4; s++) {
      const hx = Math.round(lx - rw * 0.7 + rand() * rw * 1.4);
      const len = cell * (1 + Math.floor(rand() * 3));
      g.fillStyle = mix(PINK[3 + Math.floor(rand() * 2)], HAZE, haze);
      g.fillRect(hx, Math.round(ly + rh * 0.6), cell, len);
    }
  }
}

function hill(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  heights: number[],
  baseY: number,
  amp: number,
  top: string,
  body: string,
  speck: string,
  rand: Rand,
): number[] {
  const tops: number[] = [];
  for (let x = 0; x < w; x++) {
    const y = Math.round(baseY - heights[x] * amp);
    tops.push(y);
    g.fillStyle = body;
    g.fillRect(x, y, 1, h - y);
    g.fillStyle = top;
    g.fillRect(x, y, 1, 3);
    if (rand() < 0.25) {
      g.fillStyle = speck;
      g.fillRect(x, y + 3 + Math.floor(rand() * 14), 1, 1);
    }
  }
  return tops;
}

export const cherry: Biome = {
  id: 'cherry',
  name: 'Cherry Grove',
  hudColor: '#ff9ad5',
  init(w, h, rand) {
    // ---- sky layer: gradient, sun ----
    const sky = layer(w, h);
    bandedSky(sky.g, w, Math.round(h * 0.72), SKY);
    sky.g.fillStyle = SKY[SKY.length - 1];
    sky.g.fillRect(0, Math.round(h * 0.72), w, h);
    const sx = Math.round(w * 0.8);
    const sy = Math.round(h * 0.15);
    sky.g.fillStyle = 'rgba(255,250,220,0.22)';
    sky.g.fillRect(sx - 30, sy - 30, 60, 60);
    sky.g.fillStyle = 'rgba(255,250,225,0.35)';
    sky.g.fillRect(sx - 21, sy - 21, 42, 42);
    sky.g.fillStyle = '#fffbe6';
    sky.g.fillRect(sx - 13, sy - 13, 26, 26);
    sky.g.fillStyle = '#fff3c0';
    sky.g.fillRect(sx - 13, sy + 9, 26, 4);

    // ---- land layer (transparent above hills) ----
    const land = layer(w, h);
    const g = land.g;
    // far hills + tiny far trees
    const farH = heightLine(w, rand, 46);
    const farTops = hill(g, w, h, farH, h * 0.6, 34, mix('#86b07c', HAZE, 0.55), mix('#7aa074', HAZE, 0.6), mix('#e9a9c8', HAZE, 0.5), rand);
    for (let x = 6; x < w; x += 9 + Math.floor(rand() * 16)) {
      if (x < w * 0.38 && rand() < 0.5) continue;
      tree(g, x, farTops[x] + 3, 12 + rand() * 8, rand, 0.6);
    }
    // mid hills + mid trees (mostly right half)
    const midH = heightLine(w, rand, 70);
    const midTops = hill(g, w, h, midH, h * 0.7, 30, mix('#7dbb52', HAZE, 0.25), mix('#5f9a43', HAZE, 0.3), mix('#f0a5c8', HAZE, 0.2), rand);
    for (let x = Math.round(w * 0.3); x < w; x += 26 + Math.floor(rand() * 30)) {
      tree(g, x, midTops[x] + 3, 28 + rand() * 12, rand, 0.3);
    }
    // near ground
    const nearH = heightLine(w, rand, 120);
    const nearTops = hill(g, w, h, nearH, h * 0.8, 16, '#79bf4c', '#5b9a3a', '#4c8531', rand);
    // dirt band at very bottom
    for (let x = 0; x < w; x++) {
      const y = Math.max(nearTops[x] + 12, Math.round(h * 0.88));
      g.fillStyle = '#7a5a3a';
      g.fillRect(x, y, 1, h - y);
      g.fillStyle = '#5f452c';
      if (x % 7 === 0) g.fillRect(x, y + 4 + (x % 5), 2, 2);
    }
    // grass blades
    for (let i = 0; i < w * 0.8; i++) {
      const x = Math.floor(rand() * w);
      g.fillStyle = rand() < 0.5 ? '#94d660' : '#4f8c34';
      g.fillRect(x, nearTops[x] - 1 - Math.floor(rand() * 2), 1, 2);
    }
    // near big trees on the right
    tree(g, Math.round(w * 0.66), nearTops[Math.round(w * 0.66)] + 4, 64, rand, 0.05);
    tree(g, Math.round(w * 0.9), nearTops[Math.round(w * 0.9)] + 4, 78, rand, 0);
    tree(g, Math.round(w * 0.44), midTops[Math.round(w * 0.44)] + 6, 40, rand, 0.15);
    // fallen petal carpet near trees
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(w * 0.35 + rand() * w * 0.65);
      const y = nearTops[x] + Math.floor(rand() * 10);
      g.fillStyle = PETAL_COLORS[Math.floor(rand() * PETAL_COLORS.length)];
      g.fillRect(x, y, 1 + Math.floor(rand() * 2), 1);
    }
    // pink flowers (pink petals) on the left meadow, sparse
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rand() * w * 0.4);
      g.fillStyle = rand() < 0.5 ? '#f3a7cb' : '#ffffff';
      g.fillRect(x, nearTops[x] + 2 + Math.floor(rand() * 8), 1, 1);
    }

    const clouds: Cloud[] = Array.from({ length: 6 }, () => ({
      x: rand() * w,
      y: 14 + rand() * h * 0.28,
      w: 24 + Math.round(rand() * 40),
      speed: 1.5 + rand() * 2,
    }));
    const petals: Petal[] = Array.from({ length: 90 }, () => ({
      x: rand() * w,
      y: rand() * h,
      vx: 7 + rand() * 9,
      vy: 9 + rand() * 12,
      ph: rand() * Math.PI * 2,
      c: PETAL_COLORS[Math.floor(rand() * PETAL_COLORS.length)],
    }));
    return {
      sky: sky.c,
      land: land.c,
      clouds,
      petals,
      bee: { x: Math.round(w * 0.78), y: Math.round(h * 0.5) },
    } satisfies CherryState;
  },
  draw(ctx, w, h, t, s) {
    const { sky, land, clouds, petals, bee } = s as CherryState;
    ctx.drawImage(sky, 0, 0);

    for (const c of clouds) {
      const x = Math.round(((c.x + t * c.speed) % (w + c.w * 2)) - c.w);
      const y = Math.round(c.y);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(x, y, c.w, 5);
      ctx.fillRect(x + 6, y - 3, c.w - 14, 3);
      ctx.fillStyle = 'rgba(232,214,236,0.8)';
      ctx.fillRect(x, y + 5, c.w, 2);
    }

    ctx.drawImage(land, 0, 0);

    // bee wandering among the right trees
    const bx = Math.round(bee.x + Math.sin(t * 0.6) * 46 + Math.sin(t * 2.3) * 5);
    const by = Math.round(bee.y + Math.sin(t * 1.1) * 14 + Math.sin(t * 5) * 1.5);
    const dir = Math.cos(t * 0.6) >= 0 ? 1 : -1;
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(bx, by, 5, 3);
    ctx.fillStyle = '#3a2a14';
    ctx.fillRect(bx + 2, by, 1, 3);
    ctx.fillRect(dir > 0 ? bx + 4 : bx, by + 1, 1, 1);
    ctx.fillStyle = Math.floor(t * 12) % 2 ? 'rgba(255,255,255,0.9)' : 'rgba(220,235,255,0.6)';
    ctx.fillRect(bx + 1, by - (Math.floor(t * 12) % 2 ? 2 : 1), 2, 1);

    // falling petals, drifting diagonally with a flutter
    const W = w + 20;
    for (const p of petals) {
      const x = Math.round((((p.x + t * p.vx + Math.sin(t * 1.4 + p.ph) * 6) % W) + W) % W) - 10;
      const y = Math.round((p.y + t * p.vy) % (h + 10)) - 5;
      ctx.fillStyle = p.c;
      const flip = Math.sin(t * 3 + p.ph) > 0;
      ctx.fillRect(x, y, flip ? 2 : 1, flip ? 1 : 2);
    }
  },
};
