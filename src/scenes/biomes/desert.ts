import { bandedSky, heightLine, mix, type Biome, type Rand } from '../types';

type Dust = { x: number; y: number; v: number; ph: number };
type DesertState = {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  horizon: number;
  groundAt: number[];
  dust: Dust[];
  clouds: { x: number; y: number; w: number; s: number }[];
};

const SKY = ['#4f8fd2', '#6aa2da', '#86b4e0', '#a3c4e2', '#c2d2dc', '#dcd6c6', '#eed2a8', '#f6c98e'];
const HAZE = '#efc9a0';
const STRATA = ['#c8643a', '#e3a050', '#b2442b', '#f0c66c', '#9a5a3e', '#d9793c', '#ecc08a', '#a63b27', '#cf7d46', '#7e4a35', '#e8ad62'];

function layer(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** Per-y strata color table so bands line up across all mesas (geological layers). */
function strataTable(h: number, rand: Rand): string[] {
  const out: string[] = [];
  let i = 0;
  while (out.length < h + 40) {
    const bh = 3 + Math.floor(rand() * 7);
    const c = STRATA[i % STRATA.length];
    for (let k = 0; k < bh; k++) out.push(c);
    i += 1 + (rand() < 0.3 ? 1 : 0);
  }
  return out;
}

function mesa(
  g: CanvasRenderingContext2D,
  table: string[],
  cx: number,
  halfTop: number,
  halfBase: number,
  topY: number,
  groundY: number,
  haze: number,
  rand: Rand,
  w: number,
) {
  const step = 5;
  const notch = heightLine(halfBase * 2 + 2, rand, 6);
  const cache = new Map<string, string>();
  const col = (c: string, k: number) => {
    const key = c + k;
    let v = cache.get(key);
    if (!v) {
      v = mix(mix(c, '#2a1208', k), HAZE, haze);
      cache.set(key, v);
    }
    return v;
  };
  for (let x = Math.max(0, cx - halfBase); x < Math.min(w, cx + halfBase); x++) {
    const dist = Math.abs(x - cx);
    let y: number;
    if (dist <= halfTop) y = topY + Math.round(notch[x - cx + halfBase] * 3);
    else {
      const k = (dist - halfTop) / (halfBase - halfTop);
      y = topY + Math.pow(k, 0.6) * (groundY - topY);
      y = Math.round(y / step) * step + Math.round(notch[x - cx + halfBase] * 2);
    }
    if (y >= groundY) continue;
    // sun is on the left: right-hand flanks fall into shade
    const shadeK = x > cx + halfTop ? 0.28 : x < cx - halfTop ? -0.05 : 0.08;
    for (let yy = y; yy < groundY; yy++) {
      const c = table[yy];
      // run-length: draw until color changes
      let run = 1;
      while (yy + run < groundY && table[yy + run] === c) run++;
      g.fillStyle = shadeK >= 0 ? col(c, shadeK) : col(mix(c, '#fff0d0', -shadeK * 4), 0);
      g.fillRect(x, yy, 1, run);
      yy += run - 1;
    }
    // coarse dirt / dry grass cap on terraces
    g.fillStyle = col('#8f6a3e', 0);
    g.fillRect(x, y, 1, 2);
    if (rand() < 0.12) {
      g.fillStyle = col('#7c8a3c', 0);
      g.fillRect(x, y - 1, 1, 1);
    }
  }
}

function cactus(g: CanvasRenderingContext2D, x: number, base: number, hgt: number, rand: Rand) {
  const body = (cx: number, top: number, bw: number, bh: number) => {
    g.fillStyle = '#3f7a2a';
    g.fillRect(cx, top, bw, bh);
    g.fillStyle = '#5a9a36';
    g.fillRect(cx + 1, top, 1, bh);
    g.fillStyle = '#2c5a1e';
    g.fillRect(cx + bw - 1, top, 1, bh);
    g.fillStyle = '#1e3a14';
    for (let y = top + 2; y < top + bh; y += 3) g.fillRect(cx + (y % 2 ? 0 : bw - 1), y, 1, 1);
  };
  body(x, base - hgt, 5, hgt);
  if (hgt > 14) {
    const ay = base - Math.round(hgt * (0.45 + rand() * 0.2));
    g.fillStyle = '#3f7a2a';
    g.fillRect(x - 4, ay, 4, 3);
    body(x - 6, ay - 7, 3, 10);
    if (rand() < 0.7) {
      const by = base - Math.round(hgt * 0.65);
      g.fillStyle = '#3f7a2a';
      g.fillRect(x + 5, by, 4, 3);
      body(x + 8, by - 6, 3, 9);
    }
  }
}

function deadBush(g: CanvasRenderingContext2D, x: number, base: number, rand: Rand) {
  g.fillStyle = '#7a5530';
  g.fillRect(x, base - 2, 1, 2);
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? 1 : -1;
    const len = 2 + Math.floor(rand() * 4);
    for (let k = 0; k < len; k++) g.fillRect(x + dir * k, base - 2 - k - Math.floor(i / 2) * 2, 1, 1);
  }
}

export const desert: Biome = {
  id: 'desert',
  name: 'Badlands',
  hudColor: '#ffaa00',
  init(w, h, rand) {
    const horizon = Math.round(h * 0.66);
    const table = strataTable(h, rand);

    // ---------- back: sky, sun, far + mid mesas ----------
    const back = layer(w, h);
    const b = back.g;
    bandedSky(b, w, horizon, SKY);
    const sx = Math.round(w * 0.2);
    const sy = Math.round(h * 0.17);
    b.fillStyle = 'rgba(255,240,200,0.18)';
    b.fillRect(sx - 34, sy - 34, 68, 68);
    b.fillStyle = 'rgba(255,240,200,0.3)';
    b.fillRect(sx - 24, sy - 24, 48, 48);
    b.fillStyle = '#fff6d6';
    b.fillRect(sx - 15, sy - 15, 30, 30);
    b.fillStyle = '#fff0b8';
    b.fillRect(sx - 15, sy + 10, 30, 5);

    // far mesas: low, hazy, spread along the horizon
    for (let i = 0; i < 7; i++) {
      const cx = Math.round((i / 6) * w + (rand() - 0.5) * 40);
      const ht = 14 + rand() * 22;
      mesa(b, table, cx, 12 + Math.round(rand() * 26), 40 + Math.round(rand() * 30), Math.round(horizon - ht), horizon + 2, 0.62, rand, w);
    }
    // mid mesas: left and right
    mesa(b, table, Math.round(w * 0.14), 36, 92, Math.round(h * 0.38), horizon + 2, 0.3, rand, w);
    mesa(b, table, Math.round(w * 0.83), 44, 104, Math.round(h * 0.34), horizon + 2, 0.3, rand, w);

    // ---------- front: ground, near mesas, flora ----------
    const front = layer(w, h);
    const g = front.g;
    const gl = heightLine(w, rand, 60);
    const groundAt: number[] = [];
    for (let x = 0; x < w; x++) {
      const y = horizon + Math.round(gl[x] * 3);
      groundAt.push(y);
      const bands = ['#d0763e', '#c66c38', '#bb6234', '#ae5830', '#9f4e2b', '#8f4527'];
      const bh = Math.ceil((h - y) / bands.length);
      bands.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(x, y + i * bh, 1, bh + 1);
      });
      if (rand() < 0.35) {
        g.fillStyle = rand() < 0.5 ? '#e08a4c' : '#93462a';
        g.fillRect(x, y + 2 + Math.floor(rand() * (h - y - 2)), 1, 1);
      }
    }
    g.fillStyle = 'rgba(255,220,170,0.35)';
    for (let x = 0; x < w; x++) g.fillRect(x, groundAt[x], 1, 1);
    // near towering mesas framing the left and right edges
    mesa(g, table, -10, 34, 78, Math.round(h * 0.1), horizon + 6, 0.02, rand, w);
    mesa(g, table, w + 6, 40, 88, Math.round(h * 0.06), horizon + 6, 0.02, rand, w);
    // flora: detail at the edges, sparse in the middle
    cactus(g, Math.round(w * 0.2), groundAt[Math.round(w * 0.2)] + 2, 24, rand);
    cactus(g, Math.round(w * 0.29), groundAt[Math.round(w * 0.29)] + 4, 11, rand);
    cactus(g, Math.round(w * 0.7), groundAt[Math.round(w * 0.7)] + 3, 20, rand);
    cactus(g, Math.round(w * 0.77), groundAt[Math.round(w * 0.77)] + 6, 13, rand);
    for (const fx of [0.06, 0.16, 0.25, 0.36, 0.62, 0.74, 0.86, 0.93]) {
      const x = Math.round(w * fx + (rand() - 0.5) * 12);
      deadBush(g, x, groundAt[x] + 3 + Math.floor(rand() * 10), rand);
    }

    const dust: Dust[] = Array.from({ length: 36 }, () => ({
      x: rand() * w,
      y: horizon - 6 + rand() * (h - horizon),
      v: 8 + rand() * 14,
      ph: rand() * 6,
    }));
    const clouds = Array.from({ length: 4 }, () => ({
      x: rand() * w,
      y: 18 + rand() * h * 0.18,
      w: 30 + Math.round(rand() * 40),
      s: 1 + rand() * 1.5,
    }));
    return { back: back.c, front: front.c, horizon, groundAt, dust, clouds } satisfies DesertState;
  },
  draw(ctx, w, _h, t, s) {
    const { back, front, horizon, groundAt, dust, clouds } = s as DesertState;
    ctx.drawImage(back, 0, 0);

    for (const c of clouds) {
      const x = Math.round(((c.x + t * c.s) % (w + c.w * 2)) - c.w);
      ctx.fillStyle = 'rgba(255,248,236,0.75)';
      ctx.fillRect(x, Math.round(c.y), c.w, 4);
      ctx.fillStyle = 'rgba(240,210,190,0.6)';
      ctx.fillRect(x, Math.round(c.y) + 4, c.w, 2);
    }

    // heat shimmer: re-blit horizon rows with a small wobbling offset
    for (let y = horizon - 34; y < horizon + 2; y += 2) {
      const off = Math.round(Math.sin(y * 0.55 + t * 3.2) * 1.4);
      if (off === 0) continue;
      ctx.drawImage(back, 0, y, w, 2, off, y, w, 2);
    }
    // faint shimmer haze line
    ctx.fillStyle = `rgba(255,236,200,${(0.12 + Math.sin(t * 1.3) * 0.04).toFixed(3)})`;
    ctx.fillRect(0, horizon - 6, w, 6);

    ctx.drawImage(front, 0, 0);

    // tumbleweed rolling across every ~18s
    const period = 18;
    const ph = (t % period) / 10;
    if (ph < 1) {
      const x = Math.round(-14 + ph * (w + 28));
      const gy = groundAt[Math.max(0, Math.min(w - 1, x))] + 8;
      const y = Math.round(gy - 7 - Math.abs(Math.sin(ph * 26)) * 6);
      const frame = Math.floor(ph * 60) % 2;
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(x + 1, y, 6, 8);
      ctx.fillRect(x, y + 1, 8, 6);
      ctx.fillStyle = '#b8935a';
      for (let i = 0; i < 4; i++) {
        const a = i * 2 + frame;
        ctx.fillRect(x + 1 + ((a * 3) % 6), y + 1 + ((a * 5) % 6), 2, 1);
      }
      ctx.fillStyle = '#5e4524';
      ctx.fillRect(x + 2 + frame * 2, y + 3, 2, 2);
      ctx.fillStyle = 'rgba(80,40,20,0.25)';
      ctx.fillRect(x, gy, 8, 1);
    }

    // drifting sand
    ctx.fillStyle = 'rgba(240,200,150,0.55)';
    for (const d of dust) {
      const x = Math.round((((d.x + t * d.v) % w) + w) % w);
      const y = Math.round(d.y + Math.sin(t * 1.7 + d.ph) * 2);
      ctx.fillRect(x, y, 2, 1);
    }
  },
};
