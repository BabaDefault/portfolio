import { heightLine, type Biome, type Rand } from '../types';

type Berry = { x: number; y: number; ph: number };
type Spore = { x: number; y: number; v: number; ph: number };
type LushState = {
  base: HTMLCanvasElement;
  shaft: HTMLCanvasElement;
  berries: Berry[];
  spores: Spore[];
  pool: { x0: number; x1: number; y: number; h: number };
  shaftAt: { x: number; top: number; slope: number; w0: number; w1: number; bottom: number };
};

const STONE = ['#1a2422', '#1e2a27', '#17201e', '#22302b', '#1b2624'];

function layer(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** Chunky 2x2 stone noise texture, built once per init with ImageData. */
function stoneTexture(w: number, h: number, rand: Rand) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const img = g.createImageData(w, h);
  const pal = STONE.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const [r, gg, b] = pal[Math.floor(rand() * pal.length)];
      for (let dy = 0; dy < 2 && y + dy < h; dy++) {
        for (let dx = 0; dx < 2 && x + dx < w; dx++) {
          const i = ((y + dy) * w + x + dx) * 4;
          img.data[i] = r;
          img.data[i + 1] = gg;
          img.data[i + 2] = b;
          img.data[i + 3] = 255;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

let tex: HTMLCanvasElement;
/** Blit stone texture into a region, then tint it. */
function stone(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, overlay: string) {
  if (w <= 0 || h <= 0) return;
  g.drawImage(tex, x, y, w, h, x, y, w, h);
  g.fillStyle = overlay;
  g.fillRect(x, y, w, h);
}

function moss(g: CanvasRenderingContext2D, x: number, y: number, w: number, rand: Rand, depth = 3) {
  for (let xx = x; xx < x + w; xx++) {
    const d = depth + Math.floor(rand() * 2);
    g.fillStyle = '#4e8a2c';
    g.fillRect(xx, y, 1, d);
    g.fillStyle = rand() < 0.5 ? '#6aa83a' : '#5a9a30';
    g.fillRect(xx, y, 1, 1);
    if (rand() < 0.15) {
      g.fillStyle = '#7cc04a';
      g.fillRect(xx, y - 1, 1, 1);
    }
  }
}

function azalea(g: CanvasRenderingContext2D, cx: number, base: number, r: number, rand: Rand) {
  g.fillStyle = '#5a3a24';
  g.fillRect(cx - 1, base - r, 2, r);
  for (let y = -r; y <= r * 0.6; y += 2) {
    for (let x = -r; x <= r; x += 2) {
      if ((x * x) / (r * r) + (y * y) / (r * r * 0.6) > 1 - rand() * 0.2) continue;
      const lit = x < 0 ? 0 : 1;
      g.fillStyle = rand() < 0.14 ? (rand() < 0.5 ? '#e47ac0' : '#c860a8') : lit ? '#4f8a30' : '#64a63a';
      g.fillRect(cx + x, base - r * 1.3 + y, 2, 2);
    }
  }
}

function dripleaf(g: CanvasRenderingContext2D, x: number, base: number, hgt: number, dir: number) {
  g.fillStyle = '#4f8a2c';
  g.fillRect(x, base - hgt, 1, hgt);
  const lx = dir > 0 ? x - 3 : x - 10;
  g.fillStyle = '#7ec84a';
  g.fillRect(lx, base - hgt - 1, 14, 2);
  g.fillStyle = '#5ea83a';
  g.fillRect(lx + 1, base - hgt + 1, 12, 1);
  g.fillStyle = '#3d6e24';
  g.fillRect(lx + 2, base - hgt + 2, 10, 1);
}

export const lush: Biome = {
  id: 'lush',
  name: 'Lush Caves',
  hudColor: '#55ff55',
  init(w, h, rand) {
    const floorY = Math.round(h * 0.72);
    const L = layer(w, h);
    const g = L.g;

    // back wall: stone, slightly greener toward the light
    tex = stoneTexture(w, h, rand);
    stone(g, 0, 0, w, h, 'rgba(80,125,108,0.3)');
    for (let x = 0; x < w; x += 4) {
      const d = Math.abs(x - w * 0.66) / (w * 0.66);
      g.fillStyle = `rgba(0,0,0,${(Math.min(1, d) * 0.45).toFixed(3)})`;
      g.fillRect(x, 0, 4, h);
      g.fillStyle = `rgba(70,140,90,${((1 - Math.min(1, d)) * 0.12).toFixed(3)})`;
      g.fillRect(x, 0, 4, h);
    }
    // mid rock pillars / far ledges with moss, layered for depth
    const ml = heightLine(w, rand, 40);
    for (let x = 0; x < w; x += 2) {
      const open = Math.max(0, 1 - Math.abs(x - w * 0.66) / (w * 0.24));
      const top = Math.round(floorY - (30 + ml[x] * 50) * Math.min(1, (1 - open) * 1.6));
      if (top >= floorY - 2) continue; // keep the pool area open
      stone(g, x, top, 2, floorY - top, 'rgba(4,12,8,0.45)');
      moss(g, x, top, 2, rand, 2);
    }

    // ceiling hole with sky
    const hx = Math.round(w * 0.72);
    const hw = 54;
    g.fillStyle = '#9ed8f2';
    g.fillRect(hx - hw / 2, 0, hw, 22);
    g.fillStyle = '#c6ecf8';
    g.fillRect(hx - hw / 2 + 8, 0, hw - 20, 10);
    // grass and leaves dangling at the hole rim
    for (let x = hx - hw / 2 - 4; x < hx + hw / 2 + 4; x++) {
      g.fillStyle = rand() < 0.5 ? '#5aa83a' : '#478c2c';
      g.fillRect(x, 18 + Math.floor(rand() * 3), 1, 2 + Math.floor(rand() * 4));
    }

    // ceiling: heavy rock overhang with dripstone, except the hole
    const ceil = heightLine(w, rand, 16);
    for (let x = 0; x < w; x += 2) {
      const inHole = Math.abs(x - hx) < hw / 2;
      const d = Math.round((inHole ? 14 : 26) + ceil[x] * 22);
      if (inHole) {
        stone(g, x, 18, 2, d - 14, 'rgba(0,0,0,0.55)');
      } else {
        stone(g, x, 0, 2, d, 'rgba(0,0,0,0.55)');
      }
      g.fillStyle = '#3f7a28';
      g.fillRect(x, d, 2, 2); // moss underside
      if (!inHole && rand() < 0.05) {
        // dripstone
        const len = 4 + Math.floor(rand() * 12);
        for (let i = 0; i < len; i += 2) {
          g.fillStyle = i % 4 ? '#6e5a48' : '#806a55';
          g.fillRect(x + (i > len / 2 ? 0 : 0), d + i, i > len * 0.6 ? 1 : 2, 2);
        }
      }
    }

    // floor with moss carpet; clay rim + pool basin
    const fl = heightLine(w, rand, 50);
    const pool = { x0: Math.round(w * 0.5), x1: Math.round(w * 0.84), y: floorY + 4, h: 18 };
    for (let x = 0; x < w; x += 2) {
      const top = Math.round(floorY + fl[x] * 5);
      const inPool = x >= pool.x0 && x < pool.x1;
      stone(g, x, top, 2, h - top, 'rgba(6,20,10,0.35)');
      if (!inPool) moss(g, x, top, 2, rand, 4);
    }
    // clay around the pool
    g.fillStyle = '#7f8794';
    g.fillRect(pool.x0 - 4, pool.y - 2, pool.x1 - pool.x0 + 8, 2);
    g.fillStyle = '#6a717c';
    g.fillRect(pool.x0 - 2, pool.y + pool.h, pool.x1 - pool.x0 + 4, 3);
    // static water body
    const water = ['#33d1c6', '#25bab3', '#1ba3a2', '#148a8e', '#0f7078', '#0b5a64'];
    const wb = Math.ceil(pool.h / water.length);
    water.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(pool.x0, pool.y + i * wb, pool.x1 - pool.x0, Math.min(wb, pool.h - i * wb));
    });

    // right wall / ledge with azaleas and moss
    for (let x = Math.round(w * 0.86); x < w; x += 2) {
      const top = Math.round(floorY - 46 + Math.sin(x * 0.08) * 6);
      stone(g, x, top, 2, floorY - top + 4, 'rgba(8,24,14,0.3)');
      moss(g, x, top, 2, rand, 3);
    }
    azalea(g, Math.round(w * 0.92), Math.round(floorY - 44), 10, rand);
    azalea(g, Math.round(w * 0.45), floorY + 2, 9, rand);
    azalea(g, Math.round(w * 0.88), floorY + 2, 7, rand);
    dripleaf(g, pool.x0 + 12, pool.y + 6, 18, 1);
    dripleaf(g, pool.x0 + 34, pool.y + 6, 26, -1);
    dripleaf(g, pool.x1 - 14, pool.y + 6, 14, 1);
    // small grass tufts
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rand() * w);
      if (x >= pool.x0 - 4 && x < pool.x1 + 4) continue;
      g.fillStyle = rand() < 0.5 ? '#78b848' : '#5e9a36';
      g.fillRect(x, Math.round(floorY + fl[x] * 5) - 2, 1, 2);
    }

    // glow-berry vines from the ceiling
    const berries: Berry[] = [];
    const vxs: number[] = [];
    for (let x = 14; x < w; x += 10 + Math.floor(rand() * 18)) {
      if (Math.abs(x - hx) < hw / 2) continue;
      if (x < w * 0.35 && rand() < 0.55) continue;
      vxs.push(x);
    }
    for (const vx of vxs) {
      const top = Math.round(24 + ceil[vx] * 22);
      const len = 20 + Math.floor(rand() * (vx < w * 0.4 ? 50 : 110));
      for (let y = top; y < top + len; y++) {
        const sway = Math.round(Math.sin(y * 0.15 + vx) * 0.8);
        g.fillStyle = '#3e6e26';
        g.fillRect(vx + sway, y, 1, 1);
        if (y % 4 === 0) {
          g.fillStyle = '#5a9a34';
          g.fillRect(vx + sway + (y % 8 === 0 ? 1 : -1), y, 1, 2);
        }
        if (y % 9 === 4 && rand() < 0.7) berries.push({ x: vx + sway + (y % 18 === 4 ? 1 : -2), y, ph: rand() * 10 });
      }
    }

    // darken the left (panel side)
    for (let x = 0; x < w * 0.42; x += 3) {
      g.fillStyle = `rgba(0,4,2,${(0.4 * (1 - x / (w * 0.42))).toFixed(3)})`;
      g.fillRect(x, 0, 3, h);
    }

    // light shaft layer: soft diagonal rays from the hole down to the pool
    const S = layer(w, h);
    const sg = S.g;
    const shaftAt = { x: hx, top: 14, slope: -0.32, w0: hw - 8, w1: hw + 50, bottom: pool.y + 6 };
    for (let y = shaftAt.top; y < shaftAt.bottom; y++) {
      const k = (y - shaftAt.top) / (shaftAt.bottom - shaftAt.top);
      const cx = shaftAt.x + (y - shaftAt.top) * shaftAt.slope;
      const sw = shaftAt.w0 + (shaftAt.w1 - shaftAt.w0) * k;
      // several rays across the width
      for (let r = 0; r < 5; r++) {
        const rx = Math.round(cx - sw / 2 + (r / 5) * sw);
        const rw = Math.round(sw / 5) - (r % 2 ? 3 : 0);
        sg.fillStyle = `rgba(255,250,200,${((r % 2 ? 0.07 : 0.11) * (1 - k * 0.5)).toFixed(3)})`;
        sg.fillRect(rx, y, Math.max(1, rw), 1);
      }
    }
    // bright pool of light on the floor
    sg.fillStyle = 'rgba(255,250,200,0.12)';
    sg.fillRect(Math.round(shaftAt.x + (shaftAt.bottom - shaftAt.top) * shaftAt.slope - shaftAt.w1 / 2), pool.y - 4, shaftAt.w1, 8);

    const spores: Spore[] = Array.from({ length: 40 }, () => ({
      x: rand(),
      y: rand(),
      v: 3 + rand() * 6,
      ph: rand() * 10,
    }));
    return { base: L.c, shaft: S.c, berries, spores, pool, shaftAt } satisfies LushState;
  },
  draw(ctx, _w, _h, t, s) {
    const { base, shaft, berries, spores, pool, shaftAt } = s as LushState;
    ctx.drawImage(base, 0, 0);

    // water ripple shimmer
    for (let y = pool.y; y < pool.y + pool.h; y += 2) {
      for (let i = 0; i < 4; i++) {
        const span = pool.x1 - pool.x0;
        const x = pool.x0 + Math.round((((i * 0.27 + y * 0.013 + t * 0.03 * (1 + (y % 3))) % 1) * span));
        const a = Math.sin(t * 2 + y * 0.7 + i * 2);
        if (a < 0.2) continue;
        ctx.fillStyle = a > 0.7 ? 'rgba(220,255,250,0.75)' : 'rgba(150,240,230,0.5)';
        ctx.fillRect(x, y, Math.min(6, pool.x1 - x), 1);
      }
    }

    // light shaft breathing
    ctx.globalAlpha = 0.8 + Math.sin(t * 0.6) * 0.2;
    ctx.drawImage(shaft, 0, 0);
    ctx.globalAlpha = 1;

    // glow berries
    ctx.globalCompositeOperation = 'lighter';
    for (const b of berries) {
      const f = 0.75 + Math.sin(t * 1.6 + b.ph) * 0.25;
      ctx.fillStyle = `rgba(255,170,60,${(0.1 * f).toFixed(3)})`;
      ctx.fillRect(b.x - 4, b.y - 4, 10, 10);
      ctx.fillStyle = `rgba(255,190,80,${(0.16 * f).toFixed(3)})`;
      ctx.fillRect(b.x - 2, b.y - 2, 6, 6);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const b of berries) {
      ctx.fillStyle = Math.sin(t * 1.6 + b.ph) > 0.5 ? '#ffe08a' : '#ffb347';
      ctx.fillRect(b.x, b.y, 2, 2);
    }

    // spores / dust drifting in the light shaft
    const len = shaftAt.bottom - shaftAt.top;
    for (const sp of spores) {
      const yy = (((sp.y * len + t * sp.v) % len) + len) % len;
      const cx = shaftAt.x + yy * shaftAt.slope;
      const sw = shaftAt.w0 + (shaftAt.w1 - shaftAt.w0) * (yy / len);
      const x = Math.round(cx - sw / 2 + sp.x * sw + Math.sin(t * 0.8 + sp.ph) * 3);
      ctx.fillStyle = Math.sin(t * 2 + sp.ph) > 0 ? 'rgba(255,255,220,0.8)' : 'rgba(200,255,170,0.5)';
      ctx.fillRect(x, Math.round(shaftAt.top + yy), 1, 1);
    }
  },
};
