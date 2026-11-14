// Procedural 16×16 pixel-art block textures, painted into one atlas at runtime.
// Original art (seeded noise over a hand-picked palette), tuned to the cherry-grove backdrop.
import * as THREE from 'three';
import { rng } from './noise';

export const TILE = 16;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;

/** Atlas slots. */
export const T = {
  grassTop: 0,
  grassSide: 1,
  dirt: 2,
  stone: 3,
  snow: 4,
  snowSide: 5,
  sand: 6,
  gravel: 7,
  cherryLeaves: 8,
  cherryLog: 9,
  logTop: 10,
  grassPetals: 11,
  spruceLeaves: 12,
  spruceLog: 13,
  iron: 14,
  beacon: 15,
  endStone: 16,
  grassFlowers: 17,
  oakLeaves: 18,
  oakLog: 19,
  planks: 20,
  darkPlanks: 21,
  cobble: 22,
  window: 23,
  wheat: 24,
  path: 25,
  podzol: 26,
  campfire: 27,
  netherrack: 28,
  netherBrick: 29,
  lava: 30,
  glowstone: 31,
  crimsonStem: 32,
  wart: 33,
  deepslate: 34,
  sculk: 35,
  sculkGlow: 36,
  ice: 37,
  moss: 38,
  azalea: 39,
  vine: 40,
  glowBerry: 41,
  poolWater: 42,
  tanStone: 43,
  obsidian: 44,
  crystal: 45,
  purpur: 46,
  chorus: 47,
  portal: 48,
  amethyst: 49,
  emeraldOre: 50,
  rail: 51,
  lantern: 52,
  water: 53,
  tallGrass: 54,
  flowerYellow: 55,
  flowerPink: 56,
  flowerWhite: 57,
  mushroom: 58,
} as const;

/** Tiles that give off their own light (0..1): they stay bright on the night islands. */
export const GLOW: Partial<Record<number, number>> = {
  [T.beacon]: 0.9,
  [T.window]: 0.95,
  [T.campfire]: 1,
  [T.lava]: 1,
  [T.glowstone]: 0.95,
  [T.sculk]: 0.12,
  [T.sculkGlow]: 0.9,
  [T.glowBerry]: 0.7,
  [T.poolWater]: 0.5,
  [T.crystal]: 1,
  [T.portal]: 0.9,
  [T.amethyst]: 0.4,
  [T.lantern]: 1,
  [T.wart]: 0.08,
};
export type TileId = (typeof T)[keyof typeof T];

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

type Painter = (set: (x: number, y: number, c: RGB) => void, r: () => number) => void;

/** Speckled fill: base colour with per-pixel brightness jitter and occasional accent pixels. */
const speckle =
  (base: string, jitter: number, accents: [string, number][] = []): Painter =>
  (set, r) => {
    const b = hex(base);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        let c = scale(b, 1 + (r() - 0.5) * jitter);
        for (const [a, p] of accents) if (r() < p) c = scale(hex(a), 1 + (r() - 0.5) * 0.1);
        set(x, y, c);
      }
  };

/** A side texture: `top` painter for the first rows (with a ragged edge), `rest` below. */
const fringe =
  (top: Painter, rest: Painter, rows: number): Painter =>
  (set, r) => {
    rest(set, r);
    const depth = Array.from({ length: TILE }, () => rows + (r() < 0.45 ? 1 : 0) + (r() < 0.15 ? 1 : 0));
    top((x, y, c) => {
      if (y < depth[x]) set(x, y, c);
    }, r);
  };

const bark =
  (base: string, dark: string, light: string): Painter =>
  (set, r) => {
    const cols = Array.from({ length: TILE }, () => (r() < 0.3 ? hex(dark) : r() < 0.25 ? hex(light) : hex(base)));
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const c = r() < 0.12 ? hex(dark) : cols[x];
        set(x, y, scale(c, 1 + (r() - 0.5) * 0.12));
      }
  };

const rings: Painter = (set, r) => {
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const edge = x === 0 || y === 0 || x === TILE - 1 || y === TILE - 1;
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      const c = edge ? hex('#3b2630') : Math.floor(d) % 3 === 0 ? hex('#8a6448') : hex('#a98262');
      set(x, y, scale(c, 1 + (r() - 0.5) * 0.08));
    }
};

const panel =
  (base: string, line: string): Painter =>
  (set, r) => {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const edge = x === 0 || y === 0 || x === TILE - 1 || y === TILE - 1;
        const seam = x === 7 || y === 7;
        const c = edge ? hex(line) : seam ? scale(hex(base), 0.88) : hex(base);
        set(x, y, scale(c, 1 + (r() - 0.5) * 0.05));
      }
  };

/** Staggered bricks / boards: `rowH`-pixel courses with mortar lines. */
const bricks =
  (base: string, mortar: string, rowH = 4, len = 8, jitter = 0.1): Painter =>
  (set, r) => {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const row = Math.floor(y / rowH);
        const seam = y % rowH === rowH - 1 || (x + (row % 2) * (len / 2)) % len === 0;
        set(x, y, scale(hex(seam ? mortar : base), 1 + (r() - 0.5) * jitter));
      }
  };

/** A lit pane inside a frame. */
const framed =
  (frame: string, pane: string, hot: string): Painter =>
  (set, r) => {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const edge = x <= 1 || y <= 1 || x >= TILE - 2 || y >= TILE - 2 || x === 7 || x === 8 || y === 7 || y === 8;
        set(x, y, edge ? scale(hex(frame), 1 + (r() - 0.5) * 0.1) : r() < 0.3 ? hex(hot) : hex(pane));
      }
  };

const rail: Painter = (set, r) => {
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const metal = x === 3 || x === 12;
      const tie = y % 4 === 1 && x >= 1 && x <= 14;
      const c = metal ? hex('#b9bcc2') : tie ? hex('#6b4a2c') : hex('#a07a4c');
      set(x, y, scale(c, 1 + (r() - 0.5) * 0.1));
    }
};

/** Plants only paint some pixels; the rest stay transparent (drawn as crossed quads). */
const blades =
  (base: string, tip: string): Painter =>
  (set, r) => {
    for (let x = 0; x < TILE; x++) {
      if (r() < 0.38) continue;
      const height = 5 + Math.floor(r() * 10);
      for (let i = 0; i < height; i++) set(x, TILE - 1 - i, scale(hex(i > height - 3 ? tip : base), 1 + (r() - 0.5) * 0.2));
    }
  };

const bloom =
  (petal: string, centre: string, tall = 10): Painter =>
  (set, r) => {
    const top = TILE - 1 - tall;
    for (let y = top + 3; y < TILE; y++) set(7 + (y % 5 === 0 ? 1 : 0), y, scale(hex('#3f7a2c'), 1 + (r() - 0.5) * 0.2));
    set(9, TILE - 4, hex('#4d8f35'));
    set(5, TILE - 6, hex('#4d8f35'));
    set(6, TILE - 6, hex('#4d8f35'));
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) {
        if ((x === 0 || x === 4) && (y === 0 || y === 4)) continue;
        const mid = x >= 1 && x <= 3 && y >= 1 && y <= 3 && (x === 2 || y === 2);
        set(5 + x, top + y, scale(hex(mid ? centre : petal), 1 + (r() - 0.5) * 0.1));
      }
  };

const shroom: Painter = (set, r) => {
  for (let y = 10; y < TILE; y++) for (let x = 7; x <= 8; x++) set(x, y, hex('#e8e0d0'));
  for (let y = 6; y < 10; y++)
    for (let x = 4 + (y === 6 ? 1 : 0); x <= 11 - (y === 6 ? 1 : 0); x++) set(x, y, r() < 0.18 ? hex('#f4efe0') : scale(hex('#c2362e'), 1 + (r() - 0.5) * 0.15));
};

const beacon: Painter = (set) => {
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const edge = x <= 1 || y <= 1 || x >= TILE - 2 || y >= TILE - 2;
      const core = x >= 4 && x <= 11 && y >= 4 && y <= 11;
      set(x, y, edge ? hex('#bff6ff') : core ? hex('#e9feff') : hex('#5fd6e8'));
    }
};

const grassTop = speckle('#5b8f3a', 0.22, [['#4a7a2f', 0.12], ['#6ea347', 0.08]]);
const stone = speckle('#7f8187', 0.12, [['#6a6c72', 0.16], ['#94969c', 0.08]]);
const snow = speckle('#f2f5fb', 0.05, [['#dce4f1', 0.12]]);
const dirt = speckle('#7b5a3c', 0.18, [['#654730', 0.15], ['#8d6a49', 0.08]]);

const PAINTERS: Record<TileId, Painter> = {
  [T.grassTop]: grassTop,
  [T.grassSide]: fringe(grassTop, dirt, 3),
  [T.dirt]: dirt,
  [T.stone]: stone,
  [T.snow]: snow,
  [T.snowSide]: fringe(snow, stone, 4),
  [T.sand]: speckle('#dccf9c', 0.1, [['#c9bb86', 0.15], ['#e8dcae', 0.08]]),
  [T.gravel]: speckle('#8a8580', 0.2, [['#6d6863', 0.2], ['#a8a39d', 0.12]]),
  [T.cherryLeaves]: speckle('#ee8fb4', 0.14, [['#d76a98', 0.22], ['#f8bfd6', 0.14], ['#c95584', 0.05]]),
  [T.cherryLog]: bark('#3b2630', '#2a1a22', '#4c3340'),
  [T.logTop]: rings,
  [T.grassPetals]: speckle('#5b8f3a', 0.22, [['#4a7a2f', 0.1], ['#f5a9c8', 0.14], ['#fbd0e1', 0.05]]),
  [T.spruceLeaves]: speckle('#2f5a33', 0.18, [['#22452a', 0.25], ['#3d6e40', 0.12]]),
  [T.spruceLog]: bark('#4a3424', '#35241a', '#5b4230'),
  [T.iron]: panel('#d9d9db', '#a9a9ad'),
  [T.beacon]: beacon,
  [T.endStone]: speckle('#e6e2a6', 0.1, [['#cfcb8c', 0.18], ['#f1eebc', 0.08]]),
  [T.grassFlowers]: speckle('#5b8f3a', 0.22, [['#4a7a2f', 0.1], ['#f2d544', 0.09], ['#f4f1e4', 0.04], ['#f29ac0', 0.04]]),
  [T.oakLeaves]: speckle('#3f7a2c', 0.2, [['#2f6122', 0.25], ['#55933a', 0.12]]),
  [T.oakLog]: bark('#6b5133', '#4e3a24', '#7d6140'),
  [T.planks]: bricks('#b08a55', '#8a683c', 4, 16),
  [T.darkPlanks]: bricks('#5a3d28', '#3c281b', 4, 16),
  [T.cobble]: bricks('#84848a', '#5c5c62', 4, 6, 0.22),
  [T.window]: framed('#5a3d28', '#ffc766', '#fff0b8'),
  [T.wheat]: speckle('#d9b04a', 0.16, [['#b88a2e', 0.25], ['#efd279', 0.15]]),
  [T.path]: speckle('#9a7b4f', 0.14, [['#82663f', 0.2], ['#ad8d5f', 0.1]]),
  [T.podzol]: speckle('#5e4426', 0.18, [['#7a5a30', 0.15], ['#3f2d19', 0.2]]),
  [T.campfire]: speckle('#ff9a2e', 0.1, [['#ffe08a', 0.3], ['#d2401a', 0.2]]),
  [T.netherrack]: speckle('#6f2a2a', 0.16, [['#4f1b1d', 0.25], ['#8a3a36', 0.12]]),
  [T.netherBrick]: bricks('#3f1c24', '#1f0d12'),
  [T.lava]: speckle('#f2681c', 0.1, [['#ffd25a', 0.25], ['#c93a10', 0.2]]),
  [T.glowstone]: speckle('#f2c460', 0.1, [['#fff0b0', 0.25], ['#b9843a', 0.2]]),
  [T.crimsonStem]: bark('#5a2238', '#3e1526', '#7a2f4a'),
  [T.wart]: speckle('#a3202a', 0.16, [['#7a141e', 0.25], ['#d03a3a', 0.1]]),
  [T.deepslate]: speckle('#3b3d45', 0.14, [['#2b2d33', 0.2], ['#4a4d57', 0.1]]),
  [T.sculk]: speckle('#0c2a33', 0.2, [['#07171d', 0.25], ['#2ee6e0', 0.07]]),
  [T.sculkGlow]: speckle('#1b6f7a', 0.15, [['#7ff7f0', 0.3], ['#0f4650', 0.15]]),
  [T.ice]: speckle('#a9d4f2', 0.06, [['#d5ecfb', 0.15], ['#8fbfe6', 0.15]]),
  [T.moss]: speckle('#5f8f2e', 0.18, [['#4d7a25', 0.2], ['#79a83a', 0.12]]),
  [T.azalea]: speckle('#4f8a2f', 0.18, [['#3d6f25', 0.2], ['#e85fa8', 0.13]]),
  [T.vine]: speckle('#3c7a2a', 0.2, [['#2b5a1f', 0.3]]),
  [T.glowBerry]: speckle('#3c7a2a', 0.2, [['#2b5a1f', 0.2], ['#ffb347', 0.28]]),
  [T.poolWater]: speckle('#35d6c6', 0.08, [['#7ff0e2', 0.2], ['#1fb3a8', 0.2]]),
  [T.tanStone]: speckle('#b79a78', 0.12, [['#9c8163', 0.2], ['#cbb08c', 0.1]]),
  [T.obsidian]: speckle('#17121f', 0.2, [['#2a1f3d', 0.2], ['#0b0910', 0.2]]),
  [T.crystal]: speckle('#e9b7ff', 0.06, [['#ffffff', 0.3], ['#b46cff', 0.2]]),
  [T.purpur]: bricks('#a577a6', '#7d557f'),
  [T.chorus]: speckle('#8a5c8e', 0.16, [['#6b436f', 0.25], ['#c79bd0', 0.1]]),
  [T.portal]: speckle('#7a2be0', 0.1, [['#b56bff', 0.3], ['#4a12a0', 0.25]]),
  [T.amethyst]: speckle('#9a6fe0', 0.1, [['#cdb0ff', 0.25], ['#6c46b8', 0.2]]),
  [T.emeraldOre]: speckle('#7f8187', 0.12, [['#6a6c72', 0.16], ['#2fd67a', 0.12], ['#9ff0c0', 0.04]]),
  [T.rail]: rail,
  [T.lantern]: framed('#2a2b30', '#ffd88a', '#fff3c4'),
  [T.water]: speckle('#3f6fc0', 0.06, [['#5a8ad6', 0.15], ['#3460a8', 0.15]]),
  [T.tallGrass]: blades('#4f8a34', '#7ab04a'),
  [T.flowerYellow]: bloom('#f6d03a', '#b8721a'),
  [T.flowerPink]: bloom('#f39ac4', '#ffe9a8', 8),
  [T.flowerWhite]: bloom('#f6f3ea', '#f2c94a', 7),
  [T.mushroom]: shroom,
};

export type Atlas = {
  texture: THREE.CanvasTexture;
  /** Average colour per tile, linear RGB: used to fade texture detail out with distance (no moiré). */
  avg: Float32Array;
  /** Average colour per tile as CSS-ready sRGB triples (0–255): used for the map. */
  avgSrgb: Uint8ClampedArray;
};

export function buildAtlas(): Atlas {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE;
  canvas.height = ATLAS_ROWS * TILE;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(canvas.width, canvas.height);
  const count = ATLAS_COLS * ATLAS_ROWS;
  const avg = new Float32Array(count * 3);
  const avgSrgb = new Uint8ClampedArray(count * 3);
  const c = new THREE.Color();

  for (const [key, paint] of Object.entries(PAINTERS)) {
    const id = Number(key);
    const ox = (id % ATLAS_COLS) * TILE;
    const oy = Math.floor(id / ATLAS_COLS) * TILE;
    const sum = [0, 0, 0];
    paint((x, y, col) => {
      const i = ((oy + y) * canvas.width + ox + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }, rng(1000 + id * 77));
    let n = 0;
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const i = ((oy + y) * canvas.width + ox + x) * 4;
        if (img.data[i + 3] === 0) continue; // transparent parts of plant tiles
        n++;
        sum[0] += img.data[i];
        sum[1] += img.data[i + 1];
        sum[2] += img.data[i + 2];
      }
    n = Math.max(1, n);
    avgSrgb[id * 3] = sum[0] / n;
    avgSrgb[id * 3 + 1] = sum[1] / n;
    avgSrgb[id * 3 + 2] = sum[2] / n;
    c.setRGB(sum[0] / n / 255, sum[1] / n / 255, sum[2] / n / 255, THREE.SRGBColorSpace);
    avg[id * 3] = c.r;
    avg[id * 3 + 1] = c.g;
    avg[id * 3 + 2] = c.b;
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, avg, avgSrgb };
}

/** UV rectangle of a tile, inset a hair so nearest sampling never bleeds into the neighbour. */
export function tileUV(id: number): [number, number, number, number] {
  const col = id % ATLAS_COLS;
  const row = Math.floor(id / ATLAS_COLS);
  const eu = 0.02 / (ATLAS_COLS * TILE);
  const ev = 0.02 / (ATLAS_ROWS * TILE);
  const u0 = col / ATLAS_COLS + eu;
  const u1 = (col + 1) / ATLAS_COLS - eu;
  // CanvasTexture is flipped (flipY): canvas row 0 sits at v = 1.
  const v1 = 1 - row / ATLAS_ROWS - ev;
  const v0 = 1 - (row + 1) / ATLAS_ROWS + ev;
  return [u0, v0, u1, v1];
}
