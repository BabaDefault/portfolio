import { heightLine, mix, type Biome, type Rand } from '../types';

type Star = { x: number; y: number; ph: number; b: number };
type Glow = { x: number; y: number; r: number; ph: number };
type Fly = { x: number; y: number; ax: number; ay: number; ph: number };
type VillageState = {
  sky: HTMLCanvasElement;
  base: HTMLCanvasElement;
  stars: Star[];
  glows: Glow[];
  windows: { x: number; y: number; w: number; h: number; ph: number }[];
  flies: Fly[];
  chimney: { x: number; y: number };
};

const SKY_STOPS = ['#070b22', '#0d1333', '#151b44', '#222354', '#352b62', '#4c3468', '#6a406c', '#86506c'];
const NIGHT = '#141a38';

function skyColors(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const f = (i / (n - 1)) * (SKY_STOPS.length - 1);
    const a = Math.floor(f);
    return mix(SKY_STOPS[a], SKY_STOPS[Math.min(SKY_STOPS.length - 1, a + 1)], f - a);
  });
}

function house(
  g: CanvasRenderingContext2D,
  x: number,
  ground: number,
  bw: number,
  wallH: number,
  haze: number,
  rand: Rand,
  windows: VillageState['windows'],
  glows: Glow[],
) {
  const c = (hex: string) => mix(hex, NIGHT, haze);
  const top = ground - wallH;
  // cobble foundation
  for (let xx = x; xx < x + bw; xx += 2) {
    for (let yy = ground - 5; yy < ground; yy += 2) {
      g.fillStyle = c(rand() < 0.5 ? '#4b505c' : '#3a3e48');
      g.fillRect(xx, yy, 2, 2);
    }
  }
  // plank walls
  g.fillStyle = c('#6a5236');
  g.fillRect(x, top, bw, wallH - 5);
  g.fillStyle = c('#54412b');
  for (let yy = top + 3; yy < ground - 5; yy += 4) g.fillRect(x, yy, bw, 1);
  // log corners and beam
  g.fillStyle = c('#3d2e21');
  g.fillRect(x, top, 4, wallH - 5);
  g.fillRect(x + bw - 4, top, 4, wallH - 5);
  g.fillRect(x, top, bw, 3);
  g.fillStyle = c('#4d3b2b');
  g.fillRect(x + bw - 4, top, 1, wallH - 5);
  // door
  const dx = x + Math.round(bw * 0.3);
  g.fillStyle = c('#2a1e14');
  g.fillRect(dx, ground - 17, 7, 12);
  g.fillStyle = c('#3b2a1c');
  g.fillRect(dx + 1, ground - 16, 2, 4);
  g.fillRect(dx + 4, ground - 16, 2, 4);
  // windows (lit)
  const ws = Math.max(5, Math.round(bw * 0.12));
  const wy = top + Math.round((wallH - 5) * 0.32);
  for (const wx of [x + Math.round(bw * 0.62), ...(bw > 50 ? [x + Math.round(bw * 0.8)] : [])]) {
    windows.push({ x: wx, y: wy, w: ws, h: ws + 1, ph: rand() * 10 });
    glows.push({ x: wx + ws / 2, y: wy + ws / 2, r: 10, ph: rand() * 10 });
  }
  // stepped roof (dark oak stairs) with overhang
  const roofH = Math.round(bw * 0.42);
  for (let i = 0; i < roofH; i += 2) {
    const inset = Math.round((i / roofH) * (bw / 2 + 4));
    const rx = x - 4 + inset;
    const rw = bw + 8 - inset * 2;
    if (rw <= 0) break;
    g.fillStyle = c('#3a2a20');
    g.fillRect(rx, top - i - 2, rw, 2);
    g.fillStyle = c('#58402e'); // moonlit right edge
    g.fillRect(rx + rw - 3, top - i - 2, 3, 1);
    g.fillStyle = c('#2a1e17');
    g.fillRect(rx, top - i - 1, 2, 1);
  }
  // gable plank triangle under roof
  for (let i = 2; i < roofH - 4; i += 2) {
    const inset = Math.round((i / roofH) * (bw / 2 + 4)) + 4;
    g.fillStyle = c('#5c4630');
    g.fillRect(x - 4 + inset + 2, top - i + 1, Math.max(0, bw + 8 - inset * 2 - 4), 2);
  }
  return { top, roofH };
}

export const village: Biome = {
  id: 'village',
  name: 'Village',
  hudColor: '#55ff55',
  init(w, h, rand) {
    const horizon = Math.round(h * 0.62);
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    };
    const skyCv = mk();
    const cv = mk();
    const sg = skyCv.getContext('2d')!;
    const g = cv.getContext('2d')!;
    const sky = skyColors(16);
    const band = Math.ceil(horizon / sky.length);
    sky.forEach((c, i) => {
      sg.fillStyle = c;
      sg.fillRect(0, i * band, w, band + 1);
    });

    // moon with halo
    const mx = Math.round(w * 0.68);
    const my = Math.round(h * 0.16);
    for (let r = 3; r >= 1; r--) {
      sg.fillStyle = 'rgba(200,210,255,0.045)';
      sg.fillRect(mx - 10 - r * 9, my - 10 - r * 9, 20 + r * 18, 20 + r * 18);
    }
    sg.fillStyle = '#eef1f6';
    sg.fillRect(mx - 10, my - 10, 20, 20);
    sg.fillStyle = '#c9cfdb';
    sg.fillRect(mx - 6, my - 5, 5, 4);
    sg.fillRect(mx + 3, my + 2, 4, 5);
    sg.fillRect(mx - 3, my + 5, 3, 2);
    sg.fillStyle = '#dde2ec';
    sg.fillRect(mx + 2, my - 7, 3, 3);

    // far hills with a few tiny lit windows
    const fh = heightLine(w, rand, 50);
    for (let x = 0; x < w; x++) {
      const y = Math.round(horizon - 8 - fh[x] * 26);
      g.fillStyle = '#1a1d3c';
      g.fillRect(x, y, 1, horizon - y + 2);
      if (rand() < 0.05) {
        g.fillStyle = '#161936';
        g.fillRect(x - 2, y - 6, 5, 6); // tree blobs
        g.fillRect(x, y - 8, 1, 2);
      }
    }
    for (let i = 0; i < 10; i++) {
      const x = Math.round(w * 0.35 + rand() * w * 0.6);
      g.fillStyle = '#e8a94a';
      g.fillRect(x, Math.round(horizon - 6 - fh[x] * 20), 1, 1);
    }
    // mid hills
    const mh = heightLine(w, rand, 80);
    for (let x = 0; x < w; x++) {
      const y = Math.round(horizon - mh[x] * 10);
      g.fillStyle = '#1d2c32';
      g.fillRect(x, y, 1, h - y);
    }
    // ground
    const gl = heightLine(w, rand, 120);
    const groundAt: number[] = [];
    for (let x = 0; x < w; x++) {
      const y = Math.round(horizon + 10 + gl[x] * 6);
      groundAt.push(y);
      g.fillStyle = '#22402c';
      g.fillRect(x, y, 1, h - y);
      g.fillStyle = '#2c5236';
      g.fillRect(x, y, 1, 2);
      if (rand() < 0.3) {
        g.fillStyle = rand() < 0.5 ? '#1a3322' : '#2f5a3a';
        g.fillRect(x, y + 2 + Math.floor(rand() * (h - y)), 1, 2);
      }
    }
    const lowest = Math.max(...groundAt);

    // farmland and crops on the left (calm, dark)
    for (let row = 0; row < 3; row++) {
      const y = lowest + 6 + row * 9;
      g.fillStyle = '#2c2218';
      g.fillRect(0, y, Math.round(w * 0.36), 4);
      for (let x = 2; x < w * 0.36; x += 3) {
        g.fillStyle = rand() < 0.5 ? '#5a6a2a' : '#6e7a30';
        g.fillRect(x, y - 3 - Math.floor(rand() * 2), 1, 4);
      }
      g.fillStyle = '#1e3c6a';
      if (row === 1) g.fillRect(0, y + 4, Math.round(w * 0.36), 2); // irrigation water
    }

    const windows: VillageState['windows'] = [];
    const glows: Glow[] = [];
    // houses (back to front)
    house(g, Math.round(w * 0.42), groundAt[Math.round(w * 0.45)] + 3, 42, 26, 0.4, rand, windows, glows);
    const big = house(g, Math.round(w * 0.56), groundAt[Math.round(w * 0.62)] + 6, 80, 50, 0.08, rand, windows, glows);
    house(g, Math.round(w * 0.85), groundAt[Math.round(w * 0.88)] + 9, 70, 40, 0, rand, windows, glows);
    // chimney on the big house
    const chimney = { x: Math.round(w * 0.56) + 58, y: big.top - Math.round(big.roofH * 0.6) - 6 };
    g.fillStyle = '#3e424c';
    g.fillRect(chimney.x, chimney.y, 6, 14);
    g.fillStyle = '#2c2f37';
    g.fillRect(chimney.x + 4, chimney.y, 2, 14);

    // path: winding dirt path from the bottom toward the houses
    for (let y = lowest - 6; y < h; y++) {
      const k = (y - (lowest - 6)) / (h - lowest + 6);
      const cxp = w * 0.62 - k * w * 0.08 + Math.sin(k * 3) * 10;
      const pw = 10 + k * 34;
      for (let x = Math.round(cxp - pw / 2); x < cxp + pw / 2; x += 2) {
        g.fillStyle = ['#4a3b2a', '#54432f', '#3f3224'][Math.floor(rand() * 3)];
        g.fillRect(x, y, 2, 1);
      }
    }

    // well (right side, in front)
    const wx = Math.round(w * 0.755);
    const wg = groundAt[wx] + 14;
    for (let xx = wx; xx < wx + 22; xx += 2) {
      for (let yy = wg - 10; yy < wg; yy += 2) {
        g.fillStyle = rand() < 0.5 ? '#585e6a' : '#434854';
        g.fillRect(xx, yy, 2, 2);
      }
    }
    g.fillStyle = '#1c3f7a';
    g.fillRect(wx + 3, wg - 11, 16, 2);
    g.fillStyle = '#5a4430';
    g.fillRect(wx + 1, wg - 28, 2, 18);
    g.fillRect(wx + 19, wg - 28, 2, 18);
    g.fillStyle = '#4a3828';
    g.fillRect(wx - 2, wg - 31, 26, 3);
    g.fillRect(wx + 2, wg - 34, 18, 3);
    g.fillStyle = '#6a5038';
    g.fillRect(wx + 18, wg - 31, 6, 1);

    // fences along the near ground, with lantern posts
    const fy = lowest + 30;
    g.fillStyle = '#4a3828';
    for (let x = 0; x < w * 0.42; x += 10) g.fillRect(x, fy - 12, 2, 12);
    g.fillRect(0, fy - 10, Math.round(w * 0.42), 1);
    g.fillRect(0, fy - 6, Math.round(w * 0.42), 1);
    const fx0 = Math.round(w * 0.7);
    for (let x = fx0; x < w; x += 10) g.fillRect(x, fy - 2, 2, 12);
    g.fillRect(fx0, fy, w - fx0, 1);
    g.fillRect(fx0, fy + 4, w - fx0, 1);

    // lanterns (static bodies)
    const lanternPts = [
      [Math.round(w * 0.56) + 16, groundAt[Math.round(w * 0.62)] - 18],
      [Math.round(w * 0.85) + 12, groundAt[Math.round(w * 0.88)] - 12],
      [fx0, fy - 7],
      [Math.round(w * 0.4), fy - 17],
    ];
    for (const [lx, ly] of lanternPts) {
      g.fillStyle = '#2b2b30';
      g.fillRect(lx, ly - 1, 4, 1);
      g.fillRect(lx, ly + 4, 4, 1);
      g.fillStyle = '#ffb84a';
      g.fillRect(lx, ly, 4, 4);
      g.fillStyle = '#fff0b0';
      g.fillRect(lx + 1, ly + 1, 2, 2);
      glows.push({ x: lx + 2, y: ly + 2, r: 16, ph: lx * 0.1 });
    }

    // night overlay on the left (panel side)
    for (let x = 0; x < w * 0.45; x += 3) {
      const a = `rgba(4,6,18,${(0.35 * (1 - x / (w * 0.45))).toFixed(3)})`;
      g.fillStyle = a;
      g.fillRect(x, 0, 3, h);
      sg.fillStyle = a;
      sg.fillRect(x, 0, 3, h);
    }

    const stars: Star[] = [];
    for (let i = 0; i < 140; i++) {
      const y = Math.round(Math.pow(rand(), 1.7) * horizon * 0.85);
      const x = Math.round(rand() * w);
      if (Math.abs(x - mx) < 14 && Math.abs(y - my) < 14) continue;
      stars.push({ x, y, ph: rand() * 10, b: rand() });
    }
    const flies: Fly[] = Array.from({ length: 26 }, () => ({
      x: w * 0.3 + rand() * w * 0.7,
      y: horizon - 10 + rand() * (h * 0.3),
      ax: 6 + rand() * 18,
      ay: 3 + rand() * 8,
      ph: rand() * 10,
    }));
    return { sky: skyCv, base: cv, stars, glows, windows, flies, chimney } satisfies VillageState;
  },
  draw(ctx, _w, _h, t, s) {
    const { sky, base, stars, glows, windows, flies, chimney } = s as VillageState;
    ctx.drawImage(sky, 0, 0);

    // twinkling stars (between the sky and land layers)
    for (const st of stars) {
      const a = (Math.sin(t * (1 + st.b) + st.ph) + 1) / 2;
      if (a < 0.25) continue;
      ctx.fillStyle = a > 0.85 && st.b > 0.7 ? '#ffffff' : st.b > 0.5 ? '#c9d2ff' : '#8f96c8';
      ctx.fillRect(st.x, st.y, 1, 1);
      if (a > 0.95 && st.b > 0.8) {
        ctx.fillStyle = 'rgba(220,230,255,0.5)';
        ctx.fillRect(st.x - 1, st.y, 3, 1);
        ctx.fillRect(st.x, st.y - 1, 1, 3);
      }
    }

    ctx.drawImage(base, 0, 0);

    // chimney smoke
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.25 + i / 6) % 1;
      const x = Math.round(chimney.x + 1 + p * 14 + Math.sin(t + i) * 2);
      const y = Math.round(chimney.y - 4 - p * 40);
      const sz = 3 + Math.round(p * 4);
      ctx.fillStyle = `rgba(150,150,170,${(0.35 * (1 - p)).toFixed(3)})`;
      ctx.fillRect(x, y, sz, sz);
    }

    // windows: warm, slight flicker
    for (const wn of windows) {
      const f = Math.sin(t * 3 + wn.ph) * 0.5 + Math.sin(t * 7.1 + wn.ph) * 0.5;
      ctx.fillStyle = f > 0.6 ? '#ffd27a' : '#ffbf55';
      ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
      ctx.fillStyle = '#7a4a22';
      ctx.fillRect(wn.x + Math.floor(wn.w / 2), wn.y, 1, wn.h);
      ctx.fillRect(wn.x, wn.y + Math.floor(wn.h / 2), wn.w, 1);
    }

    // warm light glow (windows + lanterns)
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of glows) {
      const f = 0.85 + Math.sin(t * 9 + gl.ph) * 0.06 + Math.sin(t * 3.7 + gl.ph) * 0.09;
      for (let k = 1; k <= 5; k++) {
        const r = Math.round((gl.r * k) / 5);
        ctx.fillStyle = `rgba(255,150,60,${(0.028 * f).toFixed(3)})`;
        ctx.fillRect(Math.round(gl.x - r), Math.round(gl.y - r), r * 2, r * 2);
      }
    }

    // fireflies
    for (const fl of flies) {
      const blink = Math.sin(t * 2.4 + fl.ph * 3);
      if (blink < 0) continue;
      const x = Math.round(fl.x + Math.sin(t * 0.4 + fl.ph) * fl.ax);
      const y = Math.round(fl.y + Math.sin(t * 0.7 + fl.ph * 2) * fl.ay);
      ctx.fillStyle = blink > 0.6 ? 'rgba(220,255,120,0.95)' : 'rgba(180,230,90,0.6)';
      ctx.fillRect(x, y, 1, 1);
      if (blink > 0.8) {
        ctx.fillStyle = 'rgba(200,255,100,0.18)';
        ctx.fillRect(x - 2, y - 2, 5, 5);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  },
};
