// One island per portfolio section, each built in code from that section's background image:
// its terrain, blocks, structures, sky/lighting mood and drifting particles.
import type { ScreenId } from '../screens/registry';
import { T } from './atlas';
import { SEA } from './consts';
import { fbm, hash3, lerp, ridged, smoothstep, type Noise2 } from './noise';

/** Sky, fog and lighting around an island. Blended by distance as you fly between islands. */
export type Mood = {
  zenith: string;
  upper: string;
  horizon: string;
  glow: string;
  fog: string;
  /** Sun (or moon) light. */
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  cloud: string;
  /** 0..1: how visible the square sun/moon is. */
  disc: number;
  stars: number;
  fogFar: number;
};

/** Open sea: the golden-hour look of the cherry-grove image. */
export const BASE_MOOD: Mood = {
  zenith: '#3a62a6',
  upper: '#7c9cd0',
  horizon: '#c9c9e4',
  glow: '#ffc9ad',
  fog: '#bfc5e1',
  sun: '#ffe1c2',
  sunI: 2.4,
  hemiSky: '#b9c9ff',
  hemiGround: '#5b6a3a',
  hemiI: 2.1,
  cloud: '#ffffff',
  disc: 1,
  stars: 0,
  fogFar: 560,
};

export type Particles = { color: string; density: number; /** 1 falls like petals, negative rises like embers */ fall: number };

/** What island builders get to work with (all coordinates are world block coordinates). */
export type Gen = {
  cx: number;
  cz: number;
  r: number;
  padX: number;
  padZ: number;
  padY: number;
  view: [number, number];
  n0: Noise2;
  n1: Noise2;
  rand: () => number;
  /** Surface height of a column (first air block). */
  h(x: number, z: number): number;
  top(x: number, z: number): number;
  /** Set a terrain column's height and top tile. */
  level(x: number, z: number, y: number, tile: number): void;
  setTop(x: number, z: number, tile: number): void;
  put(x: number, y: number, z: number, tile: number, replace?: boolean): void;
  /** True inside the beacon pad and the corridor the landing camera looks down. */
  clear(x: number, z: number, extra?: number): boolean;
  /** Blocks placed while this is on float free of the ground (you can fly underneath them). */
  floating: boolean;
  /** A thin light beam rising from a block. */
  beam(x: number, y: number, z: number, color: string): void;
  /** Mark a spot for an effect (chimney smoke, waterfall mist). */
  fx(kind: 'smoke' | 'mist', x: number, y: number, z: number): void;
};

export type IslandDef = {
  id: ScreenId;
  name: string;
  x: number;
  z: number;
  r: number;
  /** A floating island: its surface height. */
  floatY?: number;
  thick?: number;
  body?: number;
  /** Beacon offset from the island centre. */
  pad: [number, number];
  /** Direction from the beacon to the landing camera. */
  view: [number, number];
  mood: Mood;
  particles: Particles;
  /** Terrain height at a local position (d = distance from the centre, 0..1 at the shore). */
  shape(lx: number, lz: number, d: number, g: Gen): number;
  tile(x: number, z: number, h: number, slope: number, g: Gen): number;
  decorate(g: Gen): void;
};

// ---------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------

function box(g: Gen, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile: number, replace = true) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) g.put(x, y, z, tile, replace);
}

/** A lumpy ellipsoid: tree canopies, geodes, glowstone clusters. */
export function blob(g: Gen, cx: number, cy: number, cz: number, rx: number, ry: number, tile: number, seed = 3) {
  const R = Math.ceil(rx);
  const down = ry * 0.75;
  for (let ox = -R; ox <= R; ox++)
    for (let oz = -R; oz <= R; oz++)
      for (let oy = -Math.ceil(down); oy <= Math.ceil(ry); oy++) {
        const dd = (ox * ox + oz * oz) / (rx * rx) + (oy * oy) / (oy > 0 ? ry * ry : down * down);
        if (dd < 1 - hash3(cx + ox, cy + oy, cz + oz, seed) * 0.22) g.put(cx + ox, cy + oy, cz + oz, tile);
      }
}

/** Jittered-grid scatter over the island's land, skipping the pad, the shore and steep ground. */
function scatter(g: Gen, cell: number, fn: (x: number, z: number, y: number, top: number, lx: number, lz: number) => void) {
  for (let cz = g.cz - g.r; cz < g.cz + g.r; cz += cell)
    for (let cx = g.cx - g.r; cx < g.cx + g.r; cx += cell) {
      const x = cx + Math.floor(g.rand() * (cell - 1));
      const z = cz + Math.floor(g.rand() * (cell - 1));
      if (Math.hypot(x - g.cx, z - g.cz) > g.r * 0.93) continue;
      const y = g.h(x, z);
      if (y <= SEA + 1 || g.clear(x, z)) continue;
      if (Math.abs(y - g.h(x + 1, z)) + Math.abs(y - g.h(x, z + 1)) > 2) continue;
      fn(x, z, y, g.top(x, z), x - g.cx, z - g.cz);
    }
}

const isGrass = (t: number) => t === T.grassTop || t === T.grassPetals || t === T.grassFlowers || t === T.podzol || t === T.moss;

export function cherryTree(g: Gen, x: number, z: number) {
  const y = g.h(x, z);
  const th = 4 + Math.floor(g.rand() * 3);
  for (let i = 0; i < th; i++) g.put(x, y + i, z, T.cherryLog, true);
  // a short leaning branch, like the grove's curved trunks
  const dx = g.rand() < 0.5 ? (g.rand() < 0.5 ? -1 : 1) : 0;
  const dz = dx === 0 ? (g.rand() < 0.5 ? -1 : 1) : 0;
  g.put(x + dx, y + th, z + dz, T.cherryLog, true);
  const cx = x + dx;
  const cz = z + dz;
  const cy = y + th + 1;
  const rx = 3 + g.rand() * 1.6;
  blob(g, cx, cy, cz, rx, 2 + g.rand() * 0.7, T.cherryLeaves);
  // drooping fringe under the canopy's rim
  const R = Math.ceil(rx);
  for (let ox = -R; ox <= R; ox++)
    for (let oz = -R; oz <= R; oz++) {
      const dd = (ox * ox + oz * oz) / (rx * rx);
      if (dd < 0.5 || dd > 1) continue;
      const k = hash3(cx + ox, cy, cz + oz, 9);
      if (k < 0.35) g.put(cx + ox, cy - 2, cz + oz, T.cherryLeaves);
      if (k < 0.12) g.put(cx + ox, cy - 3, cz + oz, T.cherryLeaves);
    }
}

export function oakTree(g: Gen, x: number, z: number, leaves: number = T.oakLeaves) {
  const y = g.h(x, z);
  const th = 4 + Math.floor(g.rand() * 3);
  for (let i = 0; i < th; i++) g.put(x, y + i, z, T.oakLog, true);
  blob(g, x, y + th + 1, z, 2.6 + g.rand() * 1.2, 2 + g.rand() * 0.8, leaves);
}

/** Spruce: a stack of narrowing leaf discs. `wide` makes the 2×2-trunk old-growth giants. */
export function spruceTree(g: Gen, x: number, z: number, wide = false) {
  const y = g.h(x, z);
  const th = wide ? 13 + Math.floor(g.rand() * 8) : 6 + Math.floor(g.rand() * 5);
  const t = wide ? 1 : 0;
  for (let i = 0; i < th; i++) for (let ox = 0; ox <= t; ox++) for (let oz = 0; oz <= t; oz++) g.put(x + ox, y + i, z + oz, T.spruceLog, true);
  const top = y + th + 1;
  const maxR = wide ? 5 : 3;
  const c = t / 2;
  for (let yy = y + (wide ? 5 : 2); yy <= top; yy++) {
    let rad = Math.min(maxR, (top - yy) * (wide ? 0.36 : 0.42) + 0.4);
    if ((top - yy) % 2 === 1) rad = Math.max(0.5, rad - 1);
    const R = Math.ceil(rad);
    for (let ox = -R; ox <= R + t; ox++)
      for (let oz = -R; oz <= R + t; oz++) {
        const dx = ox - c;
        const dz = oz - c;
        if (dx * dx + dz * dz > rad * rad + 0.5) continue;
        g.put(x + ox, yy, z + oz, T.spruceLeaves);
      }
  }
}

/** Huge crimson fungus: a stem under a drooping red cap studded with glowing blocks. */
export function crimsonFungus(g: Gen, x: number, z: number) {
  const y = g.h(x, z);
  const th = 5 + Math.floor(g.rand() * 5);
  for (let i = 0; i < th; i++) g.put(x, y + i, z, T.crimsonStem, true);
  const rx = 2.6 + g.rand() * 1.4;
  blob(g, x, y + th, z, rx, 1.8, T.wart, 7);
  const R = Math.ceil(rx);
  for (let ox = -R; ox <= R; ox++)
    for (let oz = -R; oz <= R; oz++) {
      const dd = (ox * ox + oz * oz) / (rx * rx);
      const k = hash3(x + ox, y, z + oz, 21);
      if (dd > 0.55 && dd < 1 && k < 0.45) g.put(x + ox, y + th - 2, z + oz, T.wart);
      if (dd < 0.8 && k > 0.9) g.put(x + ox, y + th - 1, z + oz, T.glowstone, true);
    }
}

/** A gabled cottage with lit windows. The ridge runs along x; the door faces +z. */
function house(g: Gen, cx: number, cz: number, hw: number, hd: number, wallH: number, opts: { wall?: number; roof?: number; chimney?: boolean } = {}) {
  const wall = opts.wall ?? T.planks;
  const roof = opts.roof ?? T.darkPlanks;
  const y0 = g.h(cx, cz);
  for (let x = cx - hw - 1; x <= cx + hw + 1; x++) for (let z = cz - hd - 1; z <= cz + hd + 1; z++) g.level(x, z, y0, T.cobble);
  for (let x = cx - hw; x <= cx + hw; x++)
    for (let z = cz - hd; z <= cz + hd; z++) {
      const ex = x === cx - hw || x === cx + hw;
      const ez = z === cz - hd || z === cz + hd;
      if (!ex && !ez) continue;
      for (let y = y0; y < y0 + wallH; y++) {
        if (ex && ez) g.put(x, y, z, T.oakLog, true);
        else if (z === cz + hd && x === cx && y < y0 + 2) continue; // door
        else if ((y - y0) % 3 === 1 && (ex ? (z - cz) % 2 === 0 : (x - cx) % 2 !== 0)) g.put(x, y, z, T.window, true);
        else g.put(x, y, z, wall, true);
      }
    }
  for (let i = 0; i <= hd + 1; i++) {
    const off = hd + 1 - i;
    const y = y0 + wallH + i;
    for (let x = cx - hw - 1; x <= cx + hw + 1; x++) {
      g.put(x, y, cz - off, roof, true);
      g.put(x, y, cz + off, roof, true);
    }
    for (let z = cz - off + 1; z <= cz + off - 1; z++) {
      g.put(cx - hw, y, z, wall, true);
      g.put(cx + hw, y, z, wall, true);
    }
  }
  if (opts.chimney) {
    for (let y = y0 + wallH; y < y0 + wallH + hd + 3; y++) g.put(cx + hw - 1, y, cz - 1, T.cobble, true);
    g.fx('smoke', cx + hw - 0.5, y0 + wallH + hd + 3.2, cz - 0.5);
  }
  return y0;
}

/** A post with a lantern on top. */
export function lanternPost(g: Gen, x: number, z: number, height = 2, post: number = T.oakLog) {
  const y = g.h(x, z);
  for (let i = 0; i < height; i++) g.put(x, y + i, z, post, true);
  g.put(x, y + height, z, T.lantern, true);
}

const dist2 = (x: number, z: number, ax: number, az: number) => Math.hypot(x - ax, z - az);

// ---------------------------------------------------------------------------------------------
// The islands
// ---------------------------------------------------------------------------------------------

const RING = 178;
const DIAG = Math.round(RING * Math.SQRT1_2);

/** Title: sunflower plains at sunset, a river and a little village (title.webp). */
const title: IslandDef = {
  id: 'title',
  name: 'Spawn',
  x: 0,
  z: RING,
  r: 56,
  pad: [8, 24],
  view: [0.25, 1],
  mood: { ...BASE_MOOD, zenith: '#4a6fb0', upper: '#8fa4d6', horizon: '#f3c9a0', glow: '#ffb070', fog: '#e0bfa8', sun: '#ffd9a8', sunI: 2.6, hemiSky: '#ffd9b8', hemiI: 1.9, cloud: '#ffe0c8' },
  particles: { color: '#fff2b0', density: 0.35, fall: 0.3 },
  shape(lx, lz, _d, g) {
    const river = 4 + Math.sin(lx * 0.07) * 7 + g.n1(lx * 0.02, 5) * 4;
    const h = 14 + fbm(g.n0, lx * 0.018, lz * 0.018, 3) * 5 + smoothstep(10, -45, lz) * 6;
    return lerp(h, SEA - 2, 1 - smoothstep(2, 9, Math.abs(lz - river)));
  },
  tile(x, z, h) {
    if (h <= SEA + 1) return T.sand;
    return hash3(x, 7, z) < 0.38 ? T.grassFlowers : T.grassTop;
  },
  decorate(g) {
    const spots: [number, number, number, number, number][] = [
      [-15, -19, 3, 2, 3],
      [1, -23, 4, 3, 4],
      [16, -15, 3, 2, 3],
      [-4, -34, 2, 2, 7], // the little tower
    ];
    for (const [lx, lz, hw, hd, wh] of spots) house(g, g.cx + lx, g.cz + lz, hw, hd, wh, { chimney: wh < 7 });
    const nearVillage = (x: number, z: number) => spots.some(([lx, lz]) => dist2(x, z, g.cx + lx, g.cz + lz) < 8);
    scatter(g, 9, (x, z, _y, top, _lx, lz) => {
      if (!isGrass(top) || nearVillage(x, z)) return;
      if (g.rand() < (lz < -26 ? 0.75 : 0.2)) oakTree(g, x, z);
    });
    lanternPost(g, g.cx - 6, g.cz - 14);
    lanternPost(g, g.cx + 9, g.cz - 12);
  },
};

/** Profile: an old-growth taiga at dusk with a campfire by the river (profile.webp). */
const profileIsland: IslandDef = {
  id: 'profile',
  name: 'Profile',
  x: -DIAG,
  z: DIAG,
  r: 52,
  pad: [-2, 20],
  view: [0.3, 1],
  mood: { ...BASE_MOOD, zenith: '#2c3c78', upper: '#5a5f9e', horizon: '#c98f8a', glow: '#ff9a66', fog: '#7f7a9e', sun: '#ffb080', sunI: 2.0, hemiSky: '#a9a4d8', hemiGround: '#3a4632', hemiI: 1.7, cloud: '#c8a0b0', stars: 0.25, fogFar: 480 },
  particles: { color: '#ffb060', density: 0.3, fall: -0.35 },
  shape(lx, lz, _d, g) {
    const river = -24 + Math.sin(lz * 0.06) * 6;
    const h = 13 + fbm(g.n0, lx * 0.02, lz * 0.02, 3) * 5 + smoothstep(0, -40, lz) * 5;
    return lerp(h, SEA - 2, 1 - smoothstep(2, 8, Math.abs(lx - river)));
  },
  tile(x, z, h, _s, g) {
    if (h <= SEA + 1) return T.sand;
    if (dist2(x, z, g.padX - 3, g.padZ - 2) < 8.5) return T.path;
    return hash3(x, 7, z) < 0.55 ? T.podzol : T.grassTop;
  },
  decorate(g) {
    // campfire ringed by log benches
    const fx = g.padX - 6;
    const fz = g.padZ - 3;
    const fy = g.h(fx, fz);
    g.put(fx, fy, fz, T.campfire, true);
    g.fx('smoke', fx + 0.5, fy + 1.3, fz + 0.5);
    for (let i = -1; i <= 1; i++) {
      g.put(fx + i, g.h(fx + i, fz - 3), fz - 3, T.spruceLog, true);
      g.put(fx - 3, g.h(fx - 3, fz + i), fz + i, T.spruceLog, true);
    }
    scatter(g, 6, (x, z, _y, top) => {
      if (!isGrass(top) || dist2(x, z, fx, fz) < 7) return;
      const k = g.rand();
      if (k < 0.22) spruceTree(g, x, z, true);
      else if (k < 0.7) spruceTree(g, x, z);
    });
  },
};

const lavaLake = (lx: number, lz: number, d: number, g: Gen) => d < 0.72 && fbm(g.n1, lx * 0.035 + 30, lz * 0.035, 2) > 0.22 && Math.hypot(lx - 6, lz - 22) > 11;

/** Skills: a nether fortress over lava (skills.webp). */
const skills: IslandDef = {
  id: 'skills',
  name: 'Skills',
  x: -RING,
  z: 0,
  r: 50,
  pad: [6, 22],
  view: [0.2, 1],
  mood: { ...BASE_MOOD, zenith: '#2a0808', upper: '#4a0f0c', horizon: '#7a1d12', glow: '#ff5a1e', fog: '#5a1410', sun: '#ff8a5a', sunI: 1.3, hemiSky: '#ff7a5a', hemiGround: '#4a100c', hemiI: 1.7, cloud: '#6a2018', disc: 0, fogFar: 320 },
  particles: { color: '#ff7a2a', density: 0.85, fall: -1 },
  shape(lx, lz, d, g) {
    if (lavaLake(lx, lz, d, g)) return 11.5;
    const spire = 26 * Math.exp(-((lx + 20) ** 2 + (lz + 14) ** 2) / 34);
    return 13 + ridged(g.n0, lx * 0.03, lz * 0.03, 3) * 9 + fbm(g.n1, lx * 0.06, lz * 0.06, 2) * 2.5 + spire;
  },
  tile(x, z, _h, _s, g) {
    const lx = x - g.cx + 0.5;
    const lz = z - g.cz + 0.5;
    if (lavaLake(lx, lz, Math.hypot(lx, lz) / g.r, g)) return T.lava;
    if (dist2(x, z, g.padX, g.padZ) < 6.5) return T.netherBrick;
    return hash3(x, 7, z) < 0.1 ? T.wart : T.netherrack;
  },
  decorate(g) {
    // fortress bridge on pillars between two towers
    const Y = 31;
    const bz = g.cz - 6;
    for (let lx = -30; lx <= 30; lx++) {
      const x = g.cx + lx;
      for (let oz = -2; oz <= 2; oz++) g.put(x, Y, bz + oz, T.netherBrick, true);
      if (lx % 2 === 0) {
        g.put(x, Y + 1, bz - 2, T.netherBrick, true);
        g.put(x, Y + 1, bz + 2, T.netherBrick, true);
      }
      if (lx % 12 === 0) for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) for (let y = g.h(x + ox, bz + oz); y < Y; y++) g.put(x + ox, y, bz + oz, T.netherBrick, true);
    }
    for (const side of [-1, 1]) {
      const tx = g.cx + side * 30;
      for (let ox = -3; ox <= 3; ox++)
        for (let oz = -3; oz <= 3; oz++) {
          const shell = Math.abs(ox) === 3 || Math.abs(oz) === 3;
          for (let y = g.h(tx + ox, bz + oz); y <= Y + 9; y++) {
            if (!shell && y !== Y + 9 && y !== Y) continue;
            const slit = shell && (ox === 0 || oz === 0) && y > Y + 2 && y < Y + 6;
            g.put(tx + ox, y, bz + oz, slit ? T.glowstone : T.netherBrick, true);
          }
          if (shell && (ox + oz) % 2 === 0) g.put(tx + ox, Y + 10, bz + oz, T.netherBrick, true);
        }
    }
    // lava pouring from the bridge and down the spire
    for (const lx of [-5, 5]) for (let y = g.h(g.cx + lx, bz + 3); y < Y; y++) g.put(g.cx + lx, y, bz + 3, T.lava, true);
    const sx = g.cx - 20;
    const sz = g.cz - 14;
    for (let y = g.h(sx + 3, sz + 1); y < g.h(sx, sz); y++) g.put(sx + 3, y, sz + 1, T.lava, true);
    for (const lx of [-18, 17]) blob(g, g.cx + lx, Y - 3, bz, 2.2, 2, T.glowstone, 5);
    scatter(g, 8, (x, z, _y, top) => {
      if (top === T.lava || top === T.netherBrick || Math.abs(z - bz) < 5) return;
      if (g.rand() < 0.4) crimsonFungus(g, x, z);
    });
  },
};

const ravineX = (lz: number) => Math.sin(lz * 0.05) * 7 - 8;

/** Projects: a rocky plateau split by a ravine, with mineshaft bridges, lanterns and a geode (projects.webp). */
const projects: IslandDef = {
  id: 'projects',
  name: 'Projects',
  x: -DIAG,
  z: -DIAG,
  r: 52,
  pad: [12, 20],
  view: [0.35, 1],
  mood: { ...BASE_MOOD, zenith: '#3d4f7a', upper: '#7f86a8', horizon: '#d9b38c', glow: '#ffc078', fog: '#a89a8e', sun: '#ffd2a0', sunI: 2.0, hemiSky: '#cbb8a8', hemiGround: '#4a3a2a', hemiI: 1.5, cloud: '#f0dcc8' },
  particles: { color: '#d8c8a8', density: 0.25, fall: 0.2 },
  shape(lx, lz, _d, g) {
    const h = 21 + fbm(g.n0, lx * 0.02, lz * 0.02, 3) * 4 + ridged(g.n1, lx * 0.03, lz * 0.03, 3) * 5;
    const w = 3.2 + g.n1(lz * 0.05, 9) * 1.2;
    return lerp(h, SEA + 2, 1 - smoothstep(w, w + 2.2, Math.abs(lx - ravineX(lz))));
  },
  tile(x, z, h, slope, g) {
    if (h <= SEA + 1) return T.sand;
    if (h < 15) return T.gravel;
    if (slope >= 3) return T.tanStone;
    if (fbm(g.n0, x * 0.05 + 50, z * 0.05, 2) > 0.18) return T.grassTop;
    return hash3(x, 7, z) < 0.5 ? T.tanStone : T.stone;
  },
  decorate(g) {
    // plank-and-rail bridges across the ravine, each under a timber frame with a hanging lantern
    for (const lz of [-22, 0, 16]) {
      const z = g.cz + lz;
      const rx = Math.round(g.cx + ravineX(lz));
      const y = Math.max(g.h(rx - 8, z), g.h(rx + 8, z));
      for (let x = rx - 8; x <= rx + 8; x++) {
        if (g.h(x, z) >= y) continue;
        g.put(x, y - 1, z - 1, T.planks, true);
        g.put(x, y - 1, z, T.rail, true);
        g.put(x, y - 1, z + 1, T.planks, true);
      }
      for (const fx of [rx - 5, rx + 5]) {
        for (const oz of [-2, 2]) for (let yy = g.h(fx, z + oz); yy < y + 4; yy++) g.put(fx, yy, z + oz, T.oakLog, true);
        for (let oz = -2; oz <= 2; oz++) g.put(fx, y + 4, z + oz, T.planks, true);
        g.put(fx, y + 3, z, T.lantern, true);
      }
    }
    // an amethyst geode bulging out of the ravine wall
    blob(g, Math.round(g.cx + ravineX(8)) + 5, 14, g.cz + 8, 3.6, 3.2, T.amethyst, 11);
    blob(g, Math.round(g.cx + ravineX(-10)) - 5, 13, g.cz - 10, 2.6, 2.4, T.amethyst, 12);
    // a headframe over the shaft near the pad
    const hx = g.padX - 12;
    const hz = g.padZ - 8;
    const hy = g.h(hx, hz);
    for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let y = g.h(hx + ox, hz + oz); y < hy + 8; y++) g.put(hx + ox, y, hz + oz, T.oakLog, true);
    box(g, hx - 2, hy + 8, hz - 2, hx + 2, hy + 8, hz + 2, T.planks);
    g.put(hx, hy + 7, hz, T.lantern, true);
    scatter(g, 10, (x, z, _y, top) => {
      const k = g.rand();
      if (top === T.grassTop && k < 0.45) oakTree(g, x, z);
      else if (k > 0.86) lanternPost(g, x, z, 2);
    });
  },
};

/** Journey: a cherry grove under snowy peaks (journey.webp). */
const journey: IslandDef = {
  id: 'journey',
  name: 'Journey',
  x: DIAG,
  z: -DIAG,
  r: 58,
  pad: [2, 30],
  view: [0.15, 1],
  mood: BASE_MOOD,
  particles: { color: '#f7a8c8', density: 1, fall: 1 },
  shape(lx, lz, _d, g) {
    let h = 14 + fbm(g.n0, lx * 0.016, lz * 0.016, 4) * 6 + fbm(g.n1, lx * 0.05, lz * 0.05, 2) * 2;
    const m = smoothstep(12, -22, lz + g.n1(lx * 0.02, 3) * 8);
    if (m > 0) {
      const massif = smoothstep(-0.5, 0.4, fbm(g.n1, lx * 0.014 + 20, lz * 0.014, 3));
      const crest = ridged(g.n0, lx * 0.032 + 17, lz * 0.032, 3);
      h += m * (massif * 34 + crest * (0.35 + massif) * 17);
    }
    return h;
  },
  tile(x, z, h, slope, g) {
    const sn = g.n1(x * 0.08, z * 0.08) * 4;
    if (h >= 44 + sn) return slope >= 4 && h < 56 ? T.stone : T.snow;
    if (h >= 37 + sn || slope >= 3) return T.stone;
    if (h <= SEA + 1) return T.sand;
    return hash3(x, 7, z) < 0.45 ? T.grassPetals : T.grassTop;
  },
  decorate(g) {
    scatter(g, 6, (x, z, y, top) => {
      if (!isGrass(top)) return;
      const k = g.rand();
      if (y < 30 && k < 0.72) cherryTree(g, x, z);
      else if (y >= 26 && k > 0.8) spruceTree(g, x, z);
    });
  },
};

/** Advancements: terraced ice peaks over glowing sculk, under an aurora (advancements.webp). */
const advancements: IslandDef = {
  id: 'advancements',
  name: 'Advancements',
  x: 0,
  z: -RING,
  r: 52,
  pad: [4, 35],
  view: [0.2, 1],
  mood: { ...BASE_MOOD, zenith: '#050a1e', upper: '#0c1a3c', horizon: '#1c3a5e', glow: '#3fe0b0', fog: '#0f2238', sun: '#b0d8ff', sunI: 1.3, hemiSky: '#7fc0e8', hemiGround: '#123a44', hemiI: 1.6, cloud: '#2a3a5c', disc: 0, stars: 1, fogFar: 460 },
  particles: { color: '#eaf6ff', density: 0.9, fall: 0.8 }, // snowfall
  shape(lx, lz, _d, g) {
    const base = 12 + fbm(g.n0, lx * 0.03, lz * 0.03, 3) * 2.5;
    const peak = (px: number, pz: number, height: number, width: number) => height * Math.max(0, 1 - Math.hypot(lx - px, lz - pz) / width) ** 1.3;
    const p = Math.max(peak(-4, -12, 50, 30), peak(21, -18, 26, 17), peak(-26, 2, 18, 14)) + ridged(g.n1, lx * 0.05, lz * 0.05, 2) * 3;
    return base + (p > 3 ? Math.round(p / 3) * 3 : 0);
  },
  tile(x, z, h, slope) {
    if (h >= 21) return slope >= 5 ? T.ice : T.snow;
    if (slope >= 3) return T.deepslate;
    const k = hash3(x, 7, z);
    return k < 0.035 ? T.sculkGlow : k < 0.8 ? T.sculk : T.deepslate;
  },
  decorate(g) {
    // little snow-capped islets hanging in the air beside the peak
    g.floating = true;
    for (const [lx, y, lz, rad] of [[-24, 60, -6, 6.5], [18, 66, -4, 5], [4, 74, -30, 4]]) {
      const cx = g.cx + lx;
      const cz = g.cz + lz;
      for (let ox = -8; ox <= 8; ox++)
        for (let oz = -8; oz <= 8; oz++) {
          const dd = Math.hypot(ox, oz) / rad;
          if (dd > 1) continue;
          const depth = Math.round((1 - dd * dd) * rad * 0.9 + hash3(cx + ox, 1, cz + oz) * 1.5);
          for (let i = 0; i <= depth; i++) g.put(cx + ox, y - i, cz + oz, i === 0 ? T.snow : i < 2 ? T.ice : T.deepslate);
        }
    }
    g.floating = false;
    scatter(g, 7, (x, z, y, top) => {
      const k = g.rand();
      if (top === T.snow && k < 0.3) for (let i = 0; i < 3 + Math.floor(g.rand() * 6); i++) g.put(x, y + i, z, T.ice, true);
      else if (top === T.sculk && k < 0.12) {
        g.put(x, y, z, T.deepslate, true);
        g.put(x, y + 1, z, T.sculkGlow, true);
      }
    });
  },
};

const pond = (lx: number, lz: number) => Math.hypot(lx + 22, (lz - 6) * 1.2) < 8;

/** Quests: a lantern-lit farmhouse at night with a wheat field and a pond (quests.webp). */
const quests: IslandDef = {
  id: 'quests',
  name: 'Quests',
  x: DIAG,
  z: DIAG,
  r: 48,
  pad: [-4, 22],
  view: [-0.2, 1],
  mood: { ...BASE_MOOD, zenith: '#0a1230', upper: '#16224c', horizon: '#3a4a78', glow: '#fff0c8', fog: '#1c2748', sun: '#cfdcff', sunI: 1.2, hemiSky: '#8a9ed8', hemiGround: '#3a3222', hemiI: 1.4, cloud: '#3a4668', stars: 1, fogFar: 460 },
  particles: { color: '#fff3a0', density: 0.4, fall: 0.05 },
  shape(lx, lz, _d, g) {
    return pond(lx, lz) ? 11.5 : 12.5 + fbm(g.n0, lx * 0.02, lz * 0.02, 3) * 1.6;
  },
  tile(x, z, h, _s, g) {
    const lx = x - g.cx + 0.5;
    const lz = z - g.cz + 0.5;
    if (pond(lx, lz)) return T.water;
    if (h <= SEA + 1) return T.sand;
    // the path from the beacon up to the front door
    const t = Math.max(0, Math.min(1, (g.padZ - z) / 22));
    if (z <= g.padZ && Math.abs(x - lerp(g.padX, g.cx + 6, t)) < 1.6) return T.path;
    return hash3(x, 7, z) < 0.22 ? T.grassFlowers : T.grassTop;
  },
  decorate(g) {
    const hx = g.cx + 6;
    const hz = g.cz - 8;
    const y0 = house(g, hx, hz, 6, 4, 6, { chimney: true });
    // porch: deck, posts, lean-to roof and lanterns
    for (let x = hx - 7; x <= hx + 7; x++)
      for (let z = hz + 5; z <= hz + 8; z++) {
        g.level(x, z, y0, T.planks);
        g.put(x, y0 + 4, z, T.darkPlanks, true);
      }
    for (const ox of [-7, 0, 7]) {
      for (let y = y0; y < y0 + 4; y++) if (ox !== 0) g.put(hx + ox, y, hz + 8, T.oakLog, true);
      g.put(hx + ox, y0 + 3, hz + 8, T.lantern, true);
    }
    // wheat field with a post fence
    for (let lx = -30; lx <= -12; lx++)
      for (let lz = -22; lz <= -8; lz++) {
        const x = g.cx + lx;
        const z = g.cz + lz;
        const y = g.h(x, z);
        const edge = lx === -30 || lx === -12 || lz === -22 || lz === -8;
        if (!edge) g.level(x, z, y + 1, lx % 4 === 0 ? T.path : T.wheat);
        else if ((lx + lz) % 3 === 0) g.put(x, y, z, T.oakLog, true);
      }
    // jetty over the pond
    for (let lx = -17; lx <= -12; lx++) for (const lz of [5, 6]) g.put(g.cx + lx, 12, g.cz + lz, T.planks, true);
    // lanterns along the path
    for (const t of [0.25, 0.6]) {
      const z = Math.round(lerp(g.padZ, hz + 9, t));
      lanternPost(g, Math.round(lerp(g.padX, hx, t)) + 3, z, 2);
      lanternPost(g, Math.round(lerp(g.padX, hx, t)) - 3, z, 2);
    }
    scatter(g, 9, (x, z, _y, top, lx, lz) => {
      if (!isGrass(top) && top !== T.grassFlowers) return;
      if (dist2(x, z, hx, hz) < 14 || (lx < -8 && lz < -4) || pond(lx, lz)) return;
      const k = g.rand();
      if (k < 0.5) oakTree(g, x, z);
      else if (k > 0.92) lanternPost(g, x, z, 2);
    });
  },
};

const pool = (lx: number, lz: number, d: number, g: Gen) => d < 0.42 && fbm(g.n1, lx * 0.05 + 9, lz * 0.05, 2) > -0.08 && Math.hypot(lx, lz - 4) > 7.5 && Math.hypot(lx + 10, lz + 5) > 5;

/** Contact: a sunlit cenote: mossy cliffs, glow-berry vines, an azalea and a turquoise pool (contact.webp). */
const contact: IslandDef = {
  id: 'contact',
  name: 'Contact',
  x: RING,
  z: 0,
  r: 48,
  pad: [0, 4],
  view: [0, 1],
  mood: { ...BASE_MOOD, zenith: '#2f6f8a', upper: '#6fb4b8', horizon: '#cfeecf', glow: '#fff2b0', fog: '#9fd0c0', sun: '#fff0c0', sunI: 2.4, hemiSky: '#bff0e0', hemiGround: '#4a6a2a', hemiI: 1.8, cloud: '#f4fff4' },
  particles: { color: '#d8ffc0', density: 0.5, fall: 0.15 },
  shape(lx, lz, d, g) {
    if (pool(lx, lz, d, g)) return 10.5;
    const floor = 11.5 + fbm(g.n0, lx * 0.05, lz * 0.05, 2) * 1.2;
    const rim = 31 + ridged(g.n1, lx * 0.03, lz * 0.03, 3) * 13;
    // a notch in the cliffs to the north: the way in and out
    const notch = 1 - smoothstep(0.2, 0.45, Math.abs(Math.atan2(lx, -lz)));
    return lerp(floor, lerp(rim, floor + 1, notch), smoothstep(0.46, 0.55, d));
  },
  tile(x, z, h, slope, g) {
    const lx = x - g.cx + 0.5;
    const lz = z - g.cz + 0.5;
    if (pool(lx, lz, Math.hypot(lx, lz) / g.r, g)) return T.poolWater;
    if (h <= SEA + 1) return T.sand;
    if (slope >= 4) return hash3(x, 7, z) < 0.5 ? T.tanStone : T.stone;
    const k = hash3(x, 7, z);
    return k < 0.12 ? T.grassFlowers : k < 0.3 ? T.grassTop : T.moss;
  },
  decorate(g) {
    // vines and glow berries hanging down the inside of the cliffs
    for (let z = g.cz - g.r; z <= g.cz + g.r; z++)
      for (let x = g.cx - g.r; x <= g.cx + g.r; x++) {
        const d = Math.hypot(x - g.cx, z - g.cz) / g.r;
        if (d < 0.38 || d > 0.66) continue;
        const h = g.h(x, z);
        const ix = x - Math.sign(x - g.cx);
        const iz = z - Math.sign(z - g.cz);
        for (const [nx, nz] of [[ix, z], [x, iz]]) {
          const low = g.h(nx, nz);
          if (h - low < 8 || hash3(nx, 31, nz) > 0.42) continue;
          const len = 3 + Math.floor(hash3(nx, 32, nz) * Math.min(14, h - low - 3));
          for (let i = 1; i <= len; i++) g.put(nx, h - i, nz, i === len || hash3(nx, h - i, nz, 33) < 0.22 ? T.glowBerry : T.vine);
        }
      }
    // the big azalea on its mound
    const ax = g.cx - 10;
    const az = g.cz - 5;
    const ay = g.h(ax, az);
    for (let i = 0; i < 11; i++) for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.put(ax + ox, ay + i, az + oz, T.oakLog, true);
    blob(g, ax, ay + 12, az, 6.4, 3.8, T.azalea, 4);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const vx = Math.round(ax + Math.cos(a) * 5.4);
      const vz = Math.round(az + Math.sin(a) * 5.4);
      for (let j = 0; j < 1 + Math.floor(hash3(vx, 40, vz) * 4); j++) g.put(vx, ay + 9 - j, vz, j > 1 && hash3(vx, j, vz, 41) < 0.4 ? T.glowBerry : T.vine);
    }
    scatter(g, 6, (x, z, y, top, lx, lz) => {
      if (top !== T.moss || Math.hypot(lx, lz) / g.r > 0.44) return;
      if (g.rand() < 0.3) g.put(x, y, z, T.azalea, true);
    });
  },
};

/** The End: a floating end-stone island of obsidian pillars, crystals and a portal (end.webp). */
const end: IslandDef = {
  id: 'end',
  name: 'The End',
  x: 0,
  z: 0,
  r: 34,
  floatY: 80,
  thick: 15,
  body: T.endStone,
  pad: [0, 13],
  view: [0, 1],
  mood: { ...BASE_MOOD, zenith: '#0b0418', upper: '#1c0a3a', horizon: '#4a1f6a', glow: '#ff8ad0', fog: '#1f0d38', sun: '#e0b0ff', sunI: 1.1, hemiSky: '#b080ff', hemiGround: '#2a1a3a', hemiI: 1.2, cloud: '#3a1f5a', disc: 0, stars: 1, fogFar: 440 },
  particles: { color: '#d080ff', density: 0.7, fall: -0.4 },
  shape(lx, lz, _d, g) {
    return 80 + fbm(g.n0, lx * 0.05, lz * 0.05, 2) * 1.6;
  },
  tile() {
    return T.endStone;
  },
  decorate(g) {
    // obsidian pillars crowned with crystals that beam into the sky
    for (const [lx, lz, height] of [[-17, -5, 18], [-7, -19, 27], [9, -17, 21], [19, -3, 15], [-20, 9, 12]]) {
      const px = g.cx + lx;
      const pz = g.cz + lz;
      const y = g.h(px, pz);
      for (let ox = -2; ox <= 2; ox++) for (let oz = -2; oz <= 2; oz++) if (ox * ox + oz * oz <= 5) for (let i = 0; i < height; i++) g.put(px + ox, y + i, pz + oz, T.obsidian, true);
      g.put(px, y + height, pz, T.crystal, true);
      g.beam(px, y + height + 1, pz, '#e07bff');
    }
    // the portal, straight behind the beacon
    const gx = g.cx;
    const gz = g.cz - 5;
    const gy = g.h(gx, gz);
    for (let ox = -3; ox <= 3; ox++)
      for (let i = 0; i < 7; i++) {
        const frame = Math.abs(ox) === 3 || i === 0 || i === 6;
        g.put(gx + ox, gy + i, gz, frame ? T.obsidian : T.portal, true);
      }
    // a purpur tower
    const tx = g.cx + 19;
    const tz = g.cz + 11;
    const ty = g.h(tx, tz);
    for (let i = 0; i < 16; i++) {
      const wide = i >= 12 ? 3 : 2;
      for (let ox = -wide; ox <= wide; ox++)
        for (let oz = -wide; oz <= wide; oz++) {
          const shell = Math.abs(ox) === wide || Math.abs(oz) === wide;
          if (!shell && i !== 12 && i !== 15) continue;
          const lit = shell && i % 4 === 2 && (ox === 0 || oz === 0);
          g.put(tx + ox, ty + i, tz + oz, lit ? T.portal : T.purpur, true);
        }
    }
    g.put(tx, ty + 16, tz, T.crystal, true);
    // chorus plants
    scatter(g, 6, (x, z, y) => {
      if (g.rand() > 0.4 || Math.abs(x - gx) < 6) return;
      const th = 3 + Math.floor(g.rand() * 4);
      for (let i = 0; i < th; i++) g.put(x, y + i, z, T.chorus, true);
      const dx = g.rand() < 0.5 ? 1 : -1;
      g.put(x + dx, y + th - 2, z, T.chorus);
      g.put(x + dx, y + th - 1, z, T.chorus);
      g.put(x, y + th, z, T.purpur);
      g.put(x + dx, y + th, z, T.purpur);
    });
  },
};

/** In hotbar order (the same order as the screens registry). */
export const ISLANDS: IslandDef[] = [title, profileIsland, skills, projects, journey, advancements, quests, contact, end];
