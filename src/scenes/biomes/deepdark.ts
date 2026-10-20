import { heightLine, mix, type Biome, type Rand } from '../types';

type Vein = { x: number; y: number };
type Soul = { x: number; y: number; v: number; ph: number };
type Lantern = { x: number; y: number };
type Shrieker = { x: number; y: number; ph: number };
type DeepState = {
  base: HTMLCanvasElement;
  veins: Vein[];
  souls: Soul[];
  lanterns: Lantern[];
  shriekers: Shrieker[];
  groundY: number;
};

const SKY = ['#020407', '#03070b', '#040a0f', '#050d13', '#061118', '#07141c', '#081720'];
const VEIN = ['#0d3b45', '#13606c', '#1aa0ad', '#3fe3ef'];

function layer(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** Deepslate bricks: base fill with mortar lines, slight per-brick tone. */
function bricks(g: CanvasRenderingContext2D, x: number, y: number, bw: number, bh: number, base: string, rand: Rand) {
  g.fillStyle = base;
  g.fillRect(x, y, bw, bh);
  const dark = mix(base, '#000000', 0.45);
  const lite = mix(base, '#6a7f8a', 0.12);
  for (let yy = y; yy < y + bh; yy += 4) {
    g.fillStyle = dark;
    g.fillRect(x, yy, bw, 1);
    const off = ((yy - y) / 4) % 2 ? 4 : 0;
    for (let xx = x + off; xx < x + bw; xx += 8) {
      g.fillStyle = dark;
      g.fillRect(xx, yy, 1, 4);
      if (rand() < 0.3) {
        g.fillStyle = lite;
        g.fillRect(xx + 1, yy + 1, Math.min(6, x + bw - xx - 1), 1);
      }
    }
  }
}

export const deepdark: Biome = {
  id: 'deepdark',
  name: 'Deep Dark',
  hudColor: '#55ffff',
  init(w, h, rand) {
    const groundY = Math.round(h * 0.74);
    const L = layer(w, h);
    const g = L.g;
    const band = Math.ceil(h / SKY.length);
    SKY.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, i * band, w, band + 1);
    });

    // cave ceiling, very dark with drips
    const ceil = heightLine(w, rand, 18);
    for (let x = 0; x < w; x += 2) {
      const d = Math.round(10 + ceil[x] * 26 + (rand() < 0.06 ? rand() * 22 : 0));
      g.fillStyle = '#010203';
      g.fillRect(x, 0, 2, d);
    }

    // far city: hazy deepslate towers
    const farCol = '#0a161d';
    for (let i = 0; i < 16; i++) {
      const fx = Math.round(rand() * w);
      const fw = 10 + Math.round(rand() * 26);
      const fh = 30 + Math.round(rand() * 70);
      g.fillStyle = farCol;
      g.fillRect(fx, groundY - fh, fw, fh);
      // stepped top
      g.fillRect(fx + 3, groundY - fh - 4, fw - 6, 4);
      g.fillStyle = '#0d1d25';
      g.fillRect(fx, groundY - fh, 1, fh);
    }
    // fog bank across the far city
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(30,110,130,0.035)';
      g.fillRect(0, groundY - 20 - i * 9, w, 20 + i * 9);
    }

    // mid city: walls, stairs and the great portal frame on the left-center
    const MID = '#15232b';
    const px = Math.round(w * 0.3);
    const pw = 120;
    const ptop = Math.round(h * 0.22);
    // pillars
    bricks(g, px - pw / 2, ptop + 20, 22, groundY - ptop - 20, MID, rand);
    bricks(g, px + pw / 2 - 22, ptop + 20, 22, groundY - ptop - 20, MID, rand);
    // lintel and the stepped "horns"
    bricks(g, px - pw / 2 - 6, ptop + 8, pw + 12, 16, MID, rand);
    bricks(g, px - pw / 2 + 8, ptop - 2, 18, 10, MID, rand);
    bricks(g, px + pw / 2 - 26, ptop - 2, 18, 10, MID, rand);
    bricks(g, px - pw / 2 - 2, ptop - 18, 12, 16, MID, rand);
    bricks(g, px + pw / 2 - 10, ptop - 18, 12, 16, MID, rand);
    bricks(g, px - 14, ptop - 6, 28, 14, MID, rand);
    // reinforced deepslate core blocks
    g.fillStyle = '#26343a';
    g.fillRect(px - 6, ptop - 2, 12, 8);
    g.fillStyle = '#3b4a4e';
    g.fillRect(px - 4, ptop, 8, 2);
    // inner portal: a faint cyan shimmer, filled in draw? keep static gradient
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(20,90,110,0.06)';
      g.fillRect(px - pw / 2 + 22 + i * 3, ptop + 24 + i * 6, pw - 44 - i * 6, groundY - ptop - 24 - i * 6);
    }
    // side walls / stairs of the city on the left
    bricks(g, 0, groundY - 46, Math.round(w * 0.12), 46, '#121e25', rand);
    for (let s = 0; s < 5; s++) bricks(g, Math.round(w * 0.12) + s * 8, groundY - 46 + s * 9, 8, 46 - s * 9, '#121e25', rand);
    bricks(g, Math.round(w * 0.5), groundY - 34, 46, 34, '#111c22', rand);
    bricks(g, Math.round(w * 0.5) + 10, groundY - 58, 20, 24, '#111c22', rand);
    // broken column on the right (dim)
    bricks(g, Math.round(w * 0.78), groundY - 70, 16, 70, '#0e181e', rand);

    // ground: deepslate with sculk carpet
    const gl = heightLine(w, rand, 30);
    const groundAt: number[] = [];
    for (let x = 0; x < w; x++) {
      const y = groundY + Math.round(gl[x] * 4);
      groundAt.push(y);
      g.fillStyle = '#0a1418';
      g.fillRect(x, y, 1, h - y);
    }
    // sculk patches: chunky dark-teal blocks
    for (let i = 0; i < 1400; i++) {
      const x = Math.floor(rand() * w);
      const sculkBias = x < w * 0.65 ? 1 : 0.35;
      if (rand() > sculkBias) continue;
      const y = groundAt[x] + Math.floor(rand() * (h - groundAt[x]));
      g.fillStyle = ['#062027', '#082a33', '#0a3440', '#051a20'][Math.floor(rand() * 4)];
      g.fillRect(x - (x % 2), y - (y % 2), 2, 2);
    }
    // sculk creeping up walls and the portal base
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(rand() * w * 0.62);
      const y = groundAt[x] - Math.floor(Math.pow(rand(), 2) * 40);
      g.fillStyle = rand() < 0.5 ? '#072630' : '#0a3440';
      g.fillRect(x - (x % 2), y - (y % 2), 2, 2);
    }
    g.fillStyle = '#103a44';
    for (let x = 0; x < w; x++) if (x < w * 0.7 || rand() < 0.3) g.fillRect(x, groundAt[x], 1, 1);

    // veins (random walks)
    const veins: Vein[] = [];
    for (let k = 0; k < 44; k++) {
      let x = Math.floor(rand() * w * 0.7);
      let y = groundAt[x] + 2 + Math.floor(Math.pow(rand(), 1.6) * (h - groundAt[x] - 10));
      if (k < 12) y = groundAt[x] - Math.floor(rand() * 30);
      const len = 12 + Math.floor(rand() * 24);
      for (let i = 0; i < len; i++) {
        veins.push({ x, y });
        const r = rand();
        if (r < 0.45) x += rand() < 0.5 ? -1 : 1;
        else if (r < 0.8) y += rand() < 0.5 ? -1 : 1;
        else {
          x += rand() < 0.5 ? -1 : 1;
          y += rand() < 0.5 ? -1 : 1;
        }
      }
    }

    // sculk sensors (small, static) with tendrils
    for (const fx of [0.12, 0.44, 0.58]) {
      const x = Math.round(w * fx);
      const y = groundAt[x] - 5;
      g.fillStyle = '#0a3440';
      g.fillRect(x, y, 8, 5);
      g.fillStyle = '#123e48';
      g.fillRect(x, y, 8, 1);
      g.fillStyle = '#1aa0ad';
      g.fillRect(x + 1, y - 3, 1, 3);
      g.fillRect(x + 6, y - 3, 1, 3);
    }

    // shriekers (drawn as static bodies; glow + rings animate)
    const shriekers: Shrieker[] = [Math.round(w * 0.2), Math.round(w * 0.52)].map((x, i) => ({
      x,
      y: groundAt[x] - 8,
      ph: i * 4.5,
    }));
    for (const s of shriekers) {
      g.fillStyle = '#0a2f38';
      g.fillRect(s.x, s.y, 14, 8);
      g.fillStyle = '#0e3d48';
      g.fillRect(s.x, s.y, 14, 2);
      // bone jaws
      g.fillStyle = '#d8d0b0';
      g.fillRect(s.x - 1, s.y - 4, 3, 4);
      g.fillRect(s.x + 12, s.y - 4, 3, 4);
      g.fillRect(s.x + 3, s.y - 6, 2, 6);
      g.fillRect(s.x + 9, s.y - 6, 2, 6);
      g.fillStyle = '#a8a088';
      g.fillRect(s.x + 1, s.y - 1, 12, 1);
      g.fillRect(s.x + 6, s.y - 3, 2, 3);
    }

    // soul lanterns hanging from the portal lintel and the left wall
    const lanterns: Lantern[] = [
      { x: px - 40, y: ptop + 52 },
      { x: px + 30, y: ptop + 40 },
      { x: Math.round(w * 0.06), y: groundY - 74 },
    ];
    for (const ln of lanterns) {
      g.fillStyle = '#1d2a30';
      const top = ln.x === lanterns[2].x ? groundY - 120 : ptop + 24;
      for (let y = top; y < ln.y; y += 2) g.fillRect(ln.x + 2, y, 1, 1);
      g.fillStyle = '#2b3438';
      g.fillRect(ln.x, ln.y, 6, 2);
      g.fillRect(ln.x, ln.y + 7, 6, 1);
      g.fillStyle = '#4ad8ea';
      g.fillRect(ln.x + 1, ln.y + 2, 4, 5);
      g.fillStyle = '#c8fbff';
      g.fillRect(ln.x + 2, ln.y + 3, 2, 3);
    }

    // darken the right side for the panel
    for (let x = Math.round(w * 0.55); x < w; x += 4) {
      const k = (x - w * 0.55) / (w * 0.45);
      g.fillStyle = `rgba(0,2,4,${(k * 0.55).toFixed(3)})`;
      g.fillRect(x, 0, 4, h);
    }

    const souls: Soul[] = Array.from({ length: 34 }, () => ({
      x: rand() * w * 0.75,
      y: rand() * h,
      v: 5 + rand() * 9,
      ph: rand() * Math.PI * 2,
    }));
    return { base: L.c, veins, souls, lanterns, shriekers, groundY } satisfies DeepState;
  },
  draw(ctx, w, h, t, s) {
    const { base, veins, souls, lanterns, shriekers, groundY } = s as DeepState;
    ctx.drawImage(base, 0, 0);

    // lantern glow
    ctx.globalCompositeOperation = 'lighter';
    for (const [i, ln] of lanterns.entries()) {
      const f = 0.85 + Math.sin(t * 2 + i * 2) * 0.15;
      for (let k = 1; k <= 4; k++) {
        const r = k * 7;
        ctx.fillStyle = `rgba(40,170,190,${(0.03 * f).toFixed(3)})`;
        ctx.fillRect(ln.x + 3 - r, ln.y + 4 - r, r * 2, r * 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // pulsing veins: waves travel left to right
    for (const v of veins) {
      const p = Math.sin(t * 1.8 - v.x * 0.05 + v.y * 0.03);
      const lvl = p > 0.85 ? 3 : p > 0.4 ? 2 : p > -0.3 ? 1 : 0;
      ctx.fillStyle = VEIN[lvl];
      ctx.fillRect(v.x, v.y, 1, 1);
    }

    // shriekers: inner glow and periodic shriek rings
    for (const sk of shriekers) {
      const cyc = (t + sk.ph) % 9;
      const glow = cyc < 1.8 ? 1 : 0.35 + Math.sin(t * 2 + sk.ph) * 0.15;
      ctx.fillStyle = mix('#0e3d48', '#5ff2ff', glow);
      ctx.fillRect(sk.x + 3, sk.y + 2, 8, 2);
      if (cyc < 1.8) {
        for (let r = 0; r < 3; r++) {
          const rr = Math.round(((cyc / 1.8) * 40 + r * 10) % 40) + 4;
          const a = Math.max(0, 0.5 - rr / 80);
          ctx.fillStyle = `rgba(80,230,255,${a.toFixed(3)})`;
          const cx = sk.x + 7;
          const cy = sk.y - 2;
          ctx.fillRect(cx - rr, cy - Math.round(rr * 0.6), rr * 2, 1);
          ctx.fillRect(cx - rr, cy, 1, 2);
          ctx.fillRect(cx + rr, cy, 1, 2);
          ctx.fillRect(cx - Math.round(rr * 0.7), cy - Math.round(rr * 0.6) + 1, 1, Math.round(rr * 0.6));
          ctx.fillRect(cx + Math.round(rr * 0.7), cy - Math.round(rr * 0.6) + 1, 1, Math.round(rr * 0.6));
        }
      }
    }

    // drifting cyan fog near the floor
    for (let i = 0; i < 4; i++) {
      const fw = Math.round(w * 0.5);
      const x = Math.round(((t * (3 + i) + i * w * 0.37) % (w + fw)) - fw);
      ctx.fillStyle = `rgba(40,150,170,${(0.04 + Math.sin(t * 0.5 + i) * 0.015).toFixed(3)})`;
      ctx.fillRect(x, groundY - 14 + i * 6, fw, 10);
      ctx.fillRect(x + 20, groundY - 18 + i * 6, fw - 40, 4);
    }

    // souls floating up
    for (const so of souls) {
      const y = Math.round((((so.y - t * so.v) % h) + h) % h);
      const x = Math.round(so.x + Math.sin(t * 0.9 + so.ph + y * 0.04) * 5);
      const k = y / h; // fade near the top
      if (k < 0.15) continue;
      ctx.fillStyle = k > 0.55 ? '#7ff0ff' : '#3aa8c0';
      ctx.fillRect(x, y, 1, 1);
      if (Math.sin(t * 3 + so.ph) > 0.6) {
        ctx.fillStyle = 'rgba(127,240,255,0.35)';
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    }
  },
};
