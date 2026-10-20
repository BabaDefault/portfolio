import { bandedSky, heightLine, mix, type Biome } from '../types';

type Cloud = { x: number; y: number; w: number; speed: number };
type OceanState = {
  horizon: number;
  clouds: Cloud[];
  island: { x: number; w: number; heights: number[] };
  sparkles: { x: number; y: number; phase: number }[];
};

const SKY = ['#2b2f6b', '#4a3f86', '#7b4f97', '#c0608f', '#ee7d72', '#f8a55c', '#fcd27a'];

export const ocean: Biome = {
  id: 'ocean',
  name: 'Warm Ocean',
  hudColor: '#55ffff',
  init(w, h, rand) {
    const horizon = Math.round(h * 0.56);
    const clouds: Cloud[] = Array.from({ length: 7 }, () => ({
      x: rand() * w,
      y: 18 + rand() * horizon * 0.5,
      w: 18 + Math.round(rand() * 36),
      speed: 1 + rand() * 2.5,
    }));
    const iw = Math.round(Math.min(w * 0.42, 220));
    const island = { x: Math.round(w * 0.62), w: iw, heights: heightLine(iw, rand, 10) };
    const sparkles = Array.from({ length: 60 }, () => ({
      x: Math.round(rand() * w),
      y: Math.round(horizon + 4 + rand() * (h - horizon - 8)),
      phase: rand() * Math.PI * 2,
    }));
    return { horizon, clouds, island, sparkles } satisfies OceanState;
  },
  draw(ctx, w, h, t, s) {
    const { horizon, clouds, island, sparkles } = s as OceanState;

    // Sky
    bandedSky(ctx, w, horizon, SKY);

    // Sun (blocky square with glow rings)
    const sunX = Math.round(w * 0.3);
    const sunY = horizon - 26;
    ctx.fillStyle = 'rgba(255,220,140,0.25)';
    ctx.fillRect(sunX - 22, sunY - 22, 44, 44);
    ctx.fillStyle = 'rgba(255,230,160,0.4)';
    ctx.fillRect(sunX - 16, sunY - 16, 32, 32);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(sunX - 11, sunY - 11, 22, 22);

    // Clouds (flat Minecraft-style slabs)
    for (const c of clouds) {
      const x = Math.round(((c.x + t * c.speed) % (w + c.w * 2)) - c.w);
      ctx.fillStyle = 'rgba(255,214,200,0.85)';
      ctx.fillRect(x, Math.round(c.y), c.w, 5);
      ctx.fillStyle = 'rgba(214,150,170,0.7)';
      ctx.fillRect(x, Math.round(c.y) + 5, c.w, 2);
    }

    // Water
    const waterBands = ['#f2a46a', '#c7737a', '#7a5d93', '#3e5a9a', '#2a4b8c', '#1d3a74', '#142c5e'];
    const wb = Math.ceil((h - horizon) / waterBands.length);
    waterBands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, horizon + i * wb, w, wb + 1);
    });

    // Sun reflection column
    for (let y = horizon + 2; y < h; y += 3) {
      const wob = Math.round(Math.sin(y * 0.6 + t * 3) * 3);
      const width = Math.max(2, 18 - (y - horizon) * 0.08);
      ctx.fillStyle = `rgba(255,236,170,${Math.max(0.1, 0.7 - (y - horizon) / (h - horizon))})`;
      ctx.fillRect(Math.round(sunX - width / 2 + wob), y, Math.round(width), 1);
    }

    // Wave sparkles
    for (const p of sparkles) {
      const a = (Math.sin(t * 2 + p.phase) + 1) / 2;
      if (a < 0.55) continue;
      ctx.fillStyle = mix('#7fa8e0', '#ffffff', a);
      const x = Math.round((p.x + t * 4) % w);
      ctx.fillRect(x, p.y, 3, 1);
    }

    // Island
    const base = horizon + 6;
    for (let i = 0; i < island.w; i++) {
      const x = island.x + i;
      const edge = Math.min(i, island.w - i) / (island.w / 2); // 0 at edges, 1 at middle
      const height = Math.round(4 + edge * 22 + island.heights[i] * 10 * edge);
      const top = base - height;
      ctx.fillStyle = '#e0c88f'; // sand
      ctx.fillRect(x, top, 1, height);
      if (edge > 0.3) {
        ctx.fillStyle = '#5d9c3a'; // grass
        ctx.fillRect(x, top, 1, 3);
        ctx.fillStyle = '#8a6a44'; // dirt
        ctx.fillRect(x, top + 3, 1, height - 3);
      }
    }
    // shoreline foam
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const foam = Math.round(Math.sin(t * 1.5) * 2);
    ctx.fillRect(island.x - 4 + foam, base, island.w + 8, 1);

    // Lighthouse
    const lx = island.x + Math.round(island.w * 0.5);
    const ly = base - 26 - 44;
    for (let y = 0; y < 44; y++) {
      ctx.fillStyle = Math.floor(y / 7) % 2 === 0 ? '#f0f0f0' : '#c0392b';
      ctx.fillRect(lx - 5, ly + y, 10, 1);
    }
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(lx - 7, ly - 2, 14, 2);
    ctx.fillStyle = '#ffe680';
    ctx.fillRect(lx - 4, ly - 8, 8, 6);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(lx - 5, ly - 11, 10, 3);
    // rotating beam
    const dir = Math.sin(t * 0.8);
    const len = Math.round(Math.abs(dir) * 120);
    ctx.fillStyle = 'rgba(255,240,170,0.18)';
    for (let i = 0; i < len; i += 2) {
      const spread = Math.round(i * 0.12);
      ctx.fillRect(dir > 0 ? lx + 4 + i : lx - 4 - i - 2, ly - 5 - spread, 2, 2 + spread * 2);
    }

    // Palm-ish tree (oak-style blocky)
    const tx = island.x + Math.round(island.w * 0.25);
    const tbase = base - 20;
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(tx, tbase - 16, 3, 16);
    ctx.fillStyle = '#3f7d2a';
    ctx.fillRect(tx - 8, tbase - 24, 19, 8);
    ctx.fillStyle = '#4f9a33';
    ctx.fillRect(tx - 5, tbase - 28, 13, 5);
  },
};
