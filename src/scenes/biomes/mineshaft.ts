import type { Biome, Rand } from '../types';

type Torch = { x: number; y: number; s: number; ph: number };
type Glint = { x: number; y: number; c: string; ph: number };
type Mote = { x: number; y: number; ph: number; r: number };
type MineState = {
  base: HTMLCanvasElement;
  torches: Torch[];
  glints: Glint[];
  motes: Mote[];
};

// world tunnel half sizes
const TW = 1.25;
const TH = 1.0;
const BEAM_STEP = 1.6;
const BEAM_START = 1.9;
const MAX_Z = 15;

let cache: { w: number; h: number; state: MineState } | null = null;

function hash(a: number, b: number, c: number) {
  let x = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

type Light = { x: number; y: number; z: number; p: number };

function lightAt(lights: Light[], X: number, Y: number, Z: number) {
  let l = 0.045;
  for (const L of lights) {
    const dx = X - L.x;
    const dy = Y - L.y;
    const dz = Z - L.z;
    l += L.p / (1 + (dx * dx + dy * dy + dz * dz) * 1.6);
  }
  return l * Math.exp(-Z * 0.11);
}

function shade(rgb: [number, number, number], l: number): string {
  // warm torch light: red channel keeps more, blue less
  const r = Math.min(255, Math.round(rgb[0] * l * 1.15));
  const g = Math.min(255, Math.round(rgb[1] * l * 0.95));
  const b = Math.min(255, Math.round(rgb[2] * l * 0.7));
  return `rgb(${r},${g},${b})`;
}

/** Blocky spider web from a corner. */
function web(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, sx: number, sy: number) {
  g.fillStyle = 'rgba(220,220,225,0.28)';
  const pts: [number, number][][] = [];
  const spokes = 5;
  for (let i = 0; i < spokes; i++) {
    const a = (i / (spokes - 1)) * (Math.PI / 2);
    const row: [number, number][] = [];
    for (let k = 0; k <= r; k++) {
      const x = Math.round(cx + Math.cos(a) * k * sx);
      const y = Math.round(cy + Math.sin(a) * k * sy);
      g.fillRect(x, y, 1, 1);
      row.push([x, y]);
    }
    pts.push(row);
  }
  for (const f of [0.35, 0.62, 0.9]) {
    const k = Math.round(r * f);
    for (let i = 0; i < spokes - 1; i++) {
      const [x0, y0] = pts[i][k];
      const [x1, y1] = pts[i + 1][k];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let j = 0; j <= n; j++) {
        const sag = Math.sin((j / n) * Math.PI) * 1.5;
        g.fillRect(Math.round(x0 + ((x1 - x0) * j) / n - sx * sag), Math.round(y0 + ((y1 - y0) * j) / n - sy * sag), 1, 1);
      }
    }
  }
}

export const mineshaft: Biome = {
  id: 'mineshaft',
  name: 'Mineshaft',
  hudColor: '#ffaa00',
  init(w, h, rand: Rand) {
    // the raycast is the priciest init of all biomes; reuse it when the size is unchanged
    if (cache && cache.w === w && cache.h === h) return cache.state;
    const vx = Math.round(w * 0.6);
    const vy = Math.round(h * 0.44);
    const F = h * 0.95;
    const proj = (X: number, Y: number, Z: number) => [vx + (F * X) / Z, vy + (F * Y) / Z] as const;

    const beams: number[] = [];
    for (let z = BEAM_START; z < MAX_Z; z += BEAM_STEP) beams.push(z);
    // torches hang on beam posts (right side near, left side further, right far)
    const torchDefs = [
      { side: 1, z: beams[1] },
      { side: -1, z: beams[3] },
      { side: 1, z: beams[5] },
    ];
    const lights: Light[] = torchDefs.map((d, i) => ({
      x: d.side * (TW - 0.28),
      y: -0.15,
      z: d.z - 0.05,
      p: i === 0 ? 1.45 : 1.3,
    }));

    // ---------- raycast tunnel surfaces into an image ----------
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    const img = g.createImageData(w, h);
    const d = img.data;
    const glintCandidates: Glint[] = [];
    for (let y = 0; y < h; y++) {
      const ay = (y + 0.5 - vy) / F;
      for (let x = 0; x < w; x++) {
        const ax = (x + 0.5 - vx) / F;
        const zw = Math.abs(ax) > 1e-6 ? TW / Math.abs(ax) : Infinity;
        const zf = Math.abs(ay) > 1e-6 ? TH / Math.abs(ay) : Infinity;
        const Z = Math.min(zw, zf, MAX_Z);
        let r = 0;
        let gg = 0;
        let b = 0;
        let X = ax * Z;
        let Y = ay * Z;
        if (Z >= MAX_Z) {
          r = gg = b = 0;
        } else if (zw <= zf) {
          // wall: stone with dirt patches and ores
          X = Math.sign(ax) * TW;
          const bu = Math.floor(Z * 2);
          const bv = Math.floor(Y * 2);
          const side = ax > 0 ? 1 : 2;
          const bh = hash(bu, bv, side);
          const sub = hash(Math.floor(Z * 14), Math.floor(Y * 14), side + 7);
          const tone = 0.82 + Math.floor(sub * 3) * 0.1;
          if (bh < 0.12) {
            r = 118 * tone; gg = 86 * tone; b = 58 * tone; // dirt
          } else if (bh < 0.2) {
            r = 92 * tone; gg = 92 * tone; b = 98 * tone; // andesite-ish
          } else {
            r = 128 * tone; gg = 126 * tone; b = 124 * tone;
          }
          // block seams
          if ((Z * 2) % 1 < 0.05 || (((Y * 2) % 1) + 1) % 1 < 0.05) {
            r *= 0.75; gg *= 0.75; b *= 0.75;
          }
          const ore = bh > 0.955 ? (bh > 0.985 ? 'd' : bh > 0.97 ? 'g' : 'c') : '';
          if (ore && sub > 0.7) {
            if (ore === 'd') { r = 90; gg = 230; b = 225; }
            else if (ore === 'g') { r = 250; gg = 210; b = 70; }
            else { r = 34; gg = 32; b = 32; }
            if (ore !== 'c' && sub > 0.88) {
              glintCandidates.push({ x, y, c: ore === 'd' ? '#c8fffb' : '#fff2a8', ph: sub * 40 });
            }
          }
        } else if (ay > 0) {
          // floor: gravelly dirt with rails and ties
          const sub = hash(Math.floor(X * 12), Math.floor(Z * 12), 3);
          const tone = 0.8 + Math.floor(sub * 3) * 0.1;
          r = 96 * tone; gg = 78 * tone; b = 62 * tone;
          const tie = Z % 0.6 < 0.2 && Math.abs(X) < 0.55;
          if (tie) { r = 112; gg = 80; b = 48; }
          const rail = Math.abs(Math.abs(X) - 0.38) < 0.045;
          if (rail) {
            const shine = Math.abs(X) - 0.38 < 0 ? 1.15 : 0.85;
            r = 150 * shine; gg = 150 * shine; b = 156 * shine;
          }
        } else {
          // ceiling: stone, darker
          const bu = Math.floor(Z * 2);
          const bv = Math.floor(X * 2);
          const sub = hash(Math.floor(Z * 14), Math.floor(X * 14), 5);
          const tone = 0.7 + Math.floor(sub * 3) * 0.08 + hash(bu, bv, 9) * 0.1;
          r = 112 * tone; gg = 110 * tone; b = 110 * tone;
        }
        const l = Z >= MAX_Z ? 0 : Math.min(1.25, lightAt(lights, X, Y, Z));
        const i = (y * w + x) * 4;
        d[i] = Math.min(255, r * l * 1.15);
        d[i + 1] = Math.min(255, gg * l * 0.95);
        d[i + 2] = Math.min(255, b * l * 0.72);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    // ---------- support beams (far to near) ----------
    const OAK: [number, number, number] = [170, 128, 78];
    const OAK_D: [number, number, number] = [110, 80, 48];
    for (let bi = beams.length - 1; bi >= 0; bi--) {
      const z = beams[bi];
      const pw = 0.24;
      const l = Math.min(1.2, lightAt(lights, 0, 0, z) + 0.05);
      for (const side of [-1, 1]) {
        const outer = side * TW;
        const inner = side * (TW - pw);
        const [x0] = proj(outer, 0, z);
        const [x1] = proj(inner, 0, z);
        const [, yTop] = proj(0, -TH, z);
        const [, yBot] = proj(0, TH, z);
        const lp = Math.min(0.95, lightAt(lights, inner, 0, z));
        // inner face (receding)
        const [xi] = proj(inner, 0, z + pw);
        g.fillStyle = shade(OAK_D, lp * 0.8);
        g.fillRect(Math.round(Math.min(x1, xi)), Math.round(yTop), Math.max(1, Math.round(Math.abs(x1 - xi))), Math.round(yBot - yTop));
        // front face
        g.fillStyle = shade(OAK, lp);
        g.fillRect(Math.round(Math.min(x0, x1)), Math.round(yTop), Math.max(1, Math.round(Math.abs(x1 - x0))), Math.round(yBot - yTop));
        // plank grain lines
        g.fillStyle = shade(OAK_D, lp);
        const pwPx = Math.abs(x1 - x0);
        if (pwPx > 6) {
          const gx = Math.round(Math.min(x0, x1) + pwPx / 2);
          g.fillRect(gx, Math.round(yTop), 1, Math.round(yBot - yTop));
        }
      }
      // crossbeam
      const [cx0, cy0] = proj(-TW, -TH, z);
      const [cx1, cy1] = proj(TW, -TH + 0.24, z);
      const [, cyi] = proj(0, -TH + 0.24, z + 0.24);
      g.fillStyle = shade(OAK_D, l * 0.75);
      g.fillRect(Math.round(cx0), Math.round(cy1), Math.round(cx1 - cx0), Math.max(1, Math.round(cyi - cy1)));
      g.fillStyle = shade(OAK, l);
      g.fillRect(Math.round(cx0), Math.round(cy0), Math.round(cx1 - cx0), Math.max(1, Math.round(cy1 - cy0)));
      g.fillStyle = shade(OAK_D, l);
      g.fillRect(Math.round(cx0), Math.round(cy1) - 1, Math.round(cx1 - cx0), 1);
      // fence-post supports under the crossbeam on far beams
    }

    // minecart on the rails
    {
      const z = beams[1] + 0.8;
      const [mx0, my0] = proj(-0.48, TH - 0.62, z);
      const [mx1, my1] = proj(0.48, TH - 0.12, z);
      const l = Math.min(1.2, lightAt(lights, 0, TH - 0.4, z));
      const cw = Math.round(mx1 - mx0);
      const ch = Math.round(my1 - my0);
      const X0 = Math.round(mx0);
      const Y0 = Math.round(my0);
      g.fillStyle = shade([96, 96, 104], l);
      g.fillRect(X0, Y0, cw, ch);
      g.fillStyle = shade([140, 140, 150], l);
      g.fillRect(X0, Y0, cw, 2);
      g.fillRect(X0, Y0, 2, ch);
      g.fillStyle = shade([60, 60, 66], l);
      g.fillRect(X0 + cw - 2, Y0, 2, ch);
      g.fillRect(X0 + 3, Y0 + 4, cw - 6, Math.max(1, Math.round(ch * 0.25)));
      // chest peeking out
      g.fillStyle = shade([160, 110, 50], l);
      g.fillRect(X0 + 4, Y0 - Math.round(ch * 0.45), cw - 8, Math.round(ch * 0.45));
      g.fillStyle = shade([90, 60, 30], l);
      g.fillRect(X0 + 4, Y0 - Math.round(ch * 0.2), cw - 8, 1);
      g.fillStyle = shade([200, 200, 200], l);
      g.fillRect(X0 + Math.round(cw / 2) - 1, Y0 - Math.round(ch * 0.25), 2, 3);
      // wheels
      g.fillStyle = shade([40, 40, 44], l);
      g.fillRect(X0 + 3, Y0 + ch - 1, 4, 3);
      g.fillRect(X0 + cw - 7, Y0 + ch - 1, 4, 3);
    }

    // cobwebs in corners
    web(g, 0, 0, 34, 1, 1);
    {
      const [wx, wy] = proj(TW - 0.24, -TH + 0.24, beams[0]);
      web(g, Math.round(wx), Math.round(wy), 22, -1, 1);
      const [wx2, wy2] = proj(-TW + 0.24, -TH + 0.24, beams[2]);
      web(g, Math.round(wx2), Math.round(wy2), 12, 1, 1);
    }

    // darken the left edge a touch more for the panel
    for (let x = 0; x < w * 0.45; x += 3) {
      g.fillStyle = `rgba(0,0,0,${(0.35 * (1 - x / (w * 0.45))).toFixed(3)})`;
      g.fillRect(x, 0, 3, h);
    }

    const torches: Torch[] = torchDefs.map((_, i) => {
      const L = lights[i];
      const [tx, ty] = proj(L.x, L.y, L.z);
      return { x: Math.round(tx), y: Math.round(ty), s: F / L.z / 60, ph: rand() * 10 };
    });

    // pick some ore glints
    const glints: Glint[] = [];
    for (let i = 0; i < 40 && glintCandidates.length; i++) {
      const k = Math.floor(rand() * glintCandidates.length);
      glints.push(glintCandidates.splice(k, 1)[0]);
    }
    const motes: Mote[] = Array.from({ length: 30 }, () => ({
      x: rand(),
      y: rand(),
      ph: rand() * 10,
      r: rand(),
    }));
    const state = { base: c, torches, glints, motes } satisfies MineState;
    cache = { w, h, state };
    return state;
  },
  draw(ctx, _w, _h, t, s) {
    const { base, torches, glints, motes } = s as MineState;
    ctx.drawImage(base, 0, 0);

    // flickering warm light pools
    ctx.globalCompositeOperation = 'lighter';
    for (const tc of torches) {
      const f = 0.8 + Math.sin(t * 13 + tc.ph) * 0.08 + Math.sin(t * 7.3 + tc.ph * 2) * 0.1;
      const R = Math.round(70 * tc.s);
      for (let k = 1; k <= 6; k++) {
        const r = Math.round((R * k) / 6);
        ctx.fillStyle = `rgba(255,140,50,${(0.024 * f).toFixed(3)})`;
        ctx.fillRect(tc.x - r, tc.y - r, r * 2, r * 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // torch sprites
    for (const tc of torches) {
      const u = Math.max(1, Math.round(tc.s * 2));
      const fl = Math.sin(t * 17 + tc.ph) > 0.2 ? 1 : 0;
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(tc.x, tc.y, u, u * 5);
      ctx.fillStyle = '#ffd25a';
      ctx.fillRect(tc.x - Math.floor(u / 2), tc.y - u * (2 + fl), u * 2, u * (2 + fl));
      ctx.fillStyle = '#fff6c8';
      ctx.fillRect(tc.x, tc.y - u * (1 + fl), u, u);
      ctx.fillStyle = '#ff8a2a';
      ctx.fillRect(tc.x - Math.floor(u / 2), tc.y, u * 2, Math.max(1, Math.floor(u / 2)));
    }

    // ore glints twinkling
    for (const gl of glints) {
      const a = Math.sin(t * 2.2 + gl.ph);
      if (a < 0.6) continue;
      ctx.fillStyle = gl.c;
      ctx.fillRect(gl.x, gl.y, 1, 1);
      if (a > 0.9) {
        ctx.fillRect(gl.x - 1, gl.y, 3, 1);
        ctx.fillRect(gl.x, gl.y - 1, 1, 3);
      }
    }

    // dust motes drifting in the nearest torch light
    const tc = torches[0];
    const R = 70 * tc.s;
    ctx.fillStyle = 'rgba(255,214,150,0.6)';
    for (const m of motes) {
      const x = Math.round(tc.x - R + ((m.x * R * 2 + Math.sin(t * 0.5 + m.ph) * 8) % (R * 2)));
      const y = Math.round(tc.y - R + ((((m.y * R * 2 - t * (3 + m.r * 4)) % (R * 2)) + R * 2) % (R * 2)));
      ctx.fillRect(x, y, 1, 1);
    }
  },
};
