// Builds the archipelago: runs each island definition (islands.ts) into a shared height map
// plus a sparse map of placed blocks (trees, buildings, floating islands).
import { T } from './atlas';
import { HALF, MIN_Y, N, SEA } from './consts';
import { biomeLabel, destColor, type Dest } from './destinations';
import { ISLANDS, type Gen, type IslandDef } from './islands';
import { clamp, fbm, lerp, rng, simplex2, smoothstep } from './noise';
import { buildSea } from './sea';

export { HALF, MIN_Y, N, SEA };
const SEED = 20251114;
const NO_GAP = 32767;

export const key = (x: number, y: number, z: number) => ((x + 1024) * 2048 + (y + 512)) * 2048 + (z + 1024);
export const unkey = (k: number): [number, number, number] => [Math.floor(k / 2048 / 2048) - 1024, (Math.floor(k / 2048) % 2048) - 512, (k % 2048) - 1024];
export const col = (i: number, j: number) => j * N + i;
export const inside = (i: number, j: number) => i >= 0 && j >= 0 && i < N && j < N;

/** A piece of the world that is meshed (and frustum-culled) as one unit. */
export type Chunk = {
  /** Value in `World.owner` for the terrain columns this chunk draws. */
  owner: number;
  /** Keys of the sparse blocks that belong to this chunk. */
  keys: number[];
  /** Grid bounds of the chunk's terrain. */
  bounds: { i0: number; i1: number; j0: number; j1: number };
};

export type Island = Chunk & {
  def: IslandDef;
  index: number;
  biome: string;
  color: string;
};

/** A spot where an effect plays (chimney smoke, waterfall mist). */
export type Fx = { kind: 'smoke' | 'mist'; x: number; y: number; z: number };

export type Beam = { x: number; y: number; z: number; color: string };

export type World = {
  /** Surface height per column: solid blocks fill y < h. MIN_Y means open sea. */
  height: Int16Array;
  topTile: Uint8Array;
  /** Highest solid surface per column including trees and structures, and the tile there. */
  ceiling: Int16Array;
  ceilTile: Uint8Array;
  /** Underside of anything floating over a column (you can fly beneath it). */
  gapBottom: Int16Array;
  /** Which chunk draws each terrain column (0 = none). */
  owner: Uint8Array;
  blocks: Map<number, number>;
  /** Keys of the blocks that TNT can destroy (everything placed between the islands). */
  seaKeys: Set<number>;
  islands: Island[];
  /** Sea stacks and sky islets between the islands. */
  sea: Chunk[];
  dests: Dest[];
  beams: Beam[];
  fx: Fx[];
};

/** Highest solid surface at a position. Pass your own height to fly underneath floating islands. */
export function surfaceAt(w: World, x: number, z: number, y?: number) {
  const i = Math.floor(x) + HALF;
  const j = Math.floor(z) + HALF;
  if (!inside(i, j)) return SEA + 1;
  const c = col(i, j);
  if (y !== undefined && w.gapBottom[c] !== NO_GAP && y < w.gapBottom[c] - 1) return Math.max(w.height[c], SEA + 1);
  return Math.max(w.ceiling[c], SEA + 1);
}

/** The underside of a floating island above a position, if you are below one. */
export function roofAt(w: World, x: number, z: number, y: number) {
  const i = Math.floor(x) + HALF;
  const j = Math.floor(z) + HALF;
  if (!inside(i, j)) return Infinity;
  const gb = w.gapBottom[col(i, j)];
  return gb !== NO_GAP && y < gb - 1 ? gb : Infinity;
}

/** The island whose shores you are within `margin` blocks of. */
export function islandNear(w: World, x: number, z: number, margin = 0) {
  let best: Island | null = null;
  let bestD = Infinity;
  for (const isl of w.islands) {
    const d = Math.hypot(x - isl.def.x, z - isl.def.z) - isl.def.r;
    if (d < margin && d < bestD) {
      best = isl;
      bestD = d;
    }
  }
  return best;
}

export function generateWorld(): World {
  const height = new Int16Array(N * N).fill(MIN_Y);
  const topTile = new Uint8Array(N * N).fill(T.gravel);
  const gapBottom = new Int16Array(N * N).fill(NO_GAP);
  const owner = new Uint8Array(N * N);
  const blocks = new Map<number, number>();
  const beams: Beam[] = [];
  const fx: Fx[] = [];
  const dests: Dest[] = [];
  const islands: Island[] = [];
  const hAt = (i: number, j: number) => (inside(i, j) ? height[col(i, j)] : MIN_Y);

  ISLANDS.forEach((def, index) => {
    const floating = def.floatY !== undefined;
    const R = Math.ceil(def.r * 1.1) + 2;
    const size = R * 2 + 1;
    const raw = new Float32Array(size * size);
    const mask = new Float32Array(size * size);
    const ftop = new Int16Array(size * size).fill(MIN_Y); // floating islands: surface per local column
    const li = (x: number, z: number) => (z - def.z + R) * size + (x - def.x + R);
    const local = (x: number, z: number) => Math.abs(x - def.x) <= R && Math.abs(z - def.z) <= R;
    const padX = def.x + def.pad[0];
    const padZ = def.z + def.pad[1];
    const vl = Math.hypot(def.view[0], def.view[1]) || 1;
    const view: [number, number] = [def.view[0] / vl, def.view[1] / vl];
    const nEdge = simplex2(SEED + index * 10 + 3);
    const island: Island = {
      def,
      index,
      owner: index + 1,
      keys: [],
      bounds: { i0: Math.max(0, def.x - R + HALF), i1: Math.min(N - 1, def.x + R + HALF), j0: Math.max(0, def.z - R + HALF), j1: Math.min(N - 1, def.z + R + HALF) },
      biome: biomeLabel(def.id),
      color: destColor(def.id),
    };

    const g: Gen = {
      cx: def.x,
      cz: def.z,
      r: def.r,
      padX,
      padZ,
      padY: 0,
      view,
      n0: simplex2(SEED + index * 10 + 1),
      n1: simplex2(SEED + index * 10 + 2),
      rand: rng(SEED + index * 10 + 4),
      floating: false,
      h(x, z) {
        if (floating) return local(x, z) ? ftop[li(x, z)] : MIN_Y;
        return hAt(x + HALF, z + HALF);
      },
      top(x, z) {
        if (floating) return def.body ?? T.stone;
        return inside(x + HALF, z + HALF) ? topTile[col(x + HALF, z + HALF)] : T.gravel;
      },
      level(x, z, y, tile) {
        if (floating || !inside(x + HALF, z + HALF)) return;
        height[col(x + HALF, z + HALF)] = y;
        topTile[col(x + HALF, z + HALF)] = tile;
        owner[col(x + HALF, z + HALF)] = island.owner;
      },
      setTop(x, z, tile) {
        if (!floating && inside(x + HALF, z + HALF)) topTile[col(x + HALF, z + HALF)] = tile;
      },
      put(x, y, z, tile, replace = false) {
        const i = x + HALF;
        const j = z + HALF;
        if (!inside(i, j)) return;
        const k = key(x, y, z);
        const had = blocks.has(k);
        if (had && !replace) return;
        blocks.set(k, tile);
        if (!had) island.keys.push(k);
        if (floating || g.floating) gapBottom[col(i, j)] = Math.min(gapBottom[col(i, j)], y);
      },
      clear(x, z, extra = 0) {
        if (Math.hypot(x - padX, z - padZ) < 7 + extra) return true;
        // the corridor from the beacon out to the landing camera
        const t = clamp((x - padX) * view[0] + (z - padZ) * view[1], 0, 15);
        return Math.hypot(x - (padX + view[0] * t), z - (padZ + view[1] * t)) < 4.5 + extra;
      },
      beam(x, y, z, color) {
        beams.push({ x, y, z, color });
      },
      fx(kind, x, y, z) {
        fx.push({ kind, x, y, z });
      },
    };

    // ---- 1. Raw heights, with the island's ragged shoreline ----
    for (let z = def.z - R; z <= def.z + R; z++)
      for (let x = def.x - R; x <= def.x + R; x++) {
        const lx = x - def.x + 0.5;
        const lz = z - def.z + 0.5;
        const d = Math.hypot(lx, lz) / def.r;
        const m = 1 - smoothstep(0.74, 1, d + fbm(nEdge, x * 0.035, z * 0.035, 2) * 0.07);
        mask[li(x, z)] = m;
        raw[li(x, z)] = m <= 0 ? MIN_Y : floating ? def.shape(lx, lz, d, g) : lerp(SEA - 5, def.shape(lx, lz, d, g), m);
      }

    // ---- 2. A flat pad for the beacon ----
    const padY = floating ? Math.floor(raw[li(padX, padZ)]) : Math.max(Math.round(raw[li(padX, padZ)]), SEA + 3);
    g.padY = padY;
    for (let z = padZ - 10; z <= padZ + 10; z++)
      for (let x = padX - 10; x <= padX + 10; x++) {
        if (!local(x, z) || mask[li(x, z)] <= 0) continue;
        const dd = Math.hypot(x - padX, z - padZ);
        raw[li(x, z)] = dd <= 4.6 ? padY + 0.5 : lerp(raw[li(x, z)], padY + 0.5, 1 - smoothstep(4.6, 10, dd));
      }

    // ---- 3. Terrain ----
    if (floating) {
      for (let z = def.z - R; z <= def.z + R; z++)
        for (let x = def.x - R; x <= def.x + R; x++) {
          const m = mask[li(x, z)];
          if (m < 0.04) continue;
          const top = Math.floor(raw[li(x, z)]);
          ftop[li(x, z)] = top;
          const thick = 1 + Math.round(m * (def.thick ?? 12) * (0.7 + 0.3 * fbm(nEdge, x * 0.09, z * 0.09, 2)));
          for (let y = top - thick; y < top; y++) g.put(x, y, z, y === top - 1 ? def.tile(x, z, top, 0, g) : (def.body ?? T.stone));
        }
    } else {
      const { i0, i1, j0, j1 } = island.bounds;
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const x = i - HALF;
          const z = j - HALF;
          if (mask[li(x, z)] <= 0) continue;
          height[col(i, j)] = clamp(Math.floor(raw[li(x, z)]), MIN_Y, 140);
          owner[col(i, j)] = island.owner;
        }
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const h = height[col(i, j)];
          if (h <= MIN_Y || owner[col(i, j)] !== island.owner) continue;
          const slope = Math.max(Math.abs(h - hAt(i + 1, j)), Math.abs(h - hAt(i - 1, j)), Math.abs(h - hAt(i, j + 1)), Math.abs(h - hAt(i, j - 1)));
          topTile[col(i, j)] = h <= SEA - 2 ? T.gravel : def.tile(i - HALF, j - HALF, h, slope, g);
        }
    }

    // ---- 4. Trees, buildings, props ----
    def.decorate(g);

    // ---- 5. The beacon on its iron base ----
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) g.put(padX + ox, padY, padZ + oz, T.iron, true);
    g.put(padX, padY + 1, padZ, T.beacon, true);

    islands.push(island);
    dests.push({ id: def.id, name: def.name, x: padX, z: padZ, y: padY, view, color: island.color, index });
  });

  // ---- Sea stacks and sky islets between the islands ----
  const CELL = 128;
  const seaKeys = new Set<number>();
  const sea: Chunk[] = [];
  for (let cj = 0; cj < N / CELL; cj++)
    for (let ci = 0; ci < N / CELL; ci++)
      sea.push({ owner: 100 + sea.length, keys: [], bounds: { i0: ci * CELL, i1: (ci + 1) * CELL - 1, j0: cj * CELL, j1: (cj + 1) * CELL - 1 } });
  const chunkAt = (x: number, z: number) => sea[Math.floor((z + HALF) / CELL) * (N / CELL) + Math.floor((x + HALF) / CELL)];
  const sg: Gen = {
    cx: 0,
    cz: 0,
    r: HALF,
    padX: 0,
    padZ: 0,
    padY: 0,
    view: [0, 1],
    n0: simplex2(SEED + 901),
    n1: simplex2(SEED + 902),
    rand: rng(SEED + 903),
    floating: false,
    h: (x, z) => hAt(x + HALF, z + HALF),
    top: (x, z) => (inside(x + HALF, z + HALF) ? topTile[col(x + HALF, z + HALF)] : T.gravel),
    level(x, z, y, tile) {
      const c = col(x + HALF, z + HALF);
      if (!inside(x + HALF, z + HALF) || (owner[c] !== 0 && owner[c] < 100)) return; // never touch an island
      height[c] = y;
      topTile[c] = tile;
      owner[c] = chunkAt(x, z).owner;
    },
    setTop(x, z, tile) {
      if (inside(x + HALF, z + HALF)) topTile[col(x + HALF, z + HALF)] = tile;
    },
    put(x, y, z, tile, replace = false) {
      if (!inside(x + HALF, z + HALF)) return;
      const k = key(x, y, z);
      const had = blocks.has(k);
      if (had && !replace) return;
      blocks.set(k, tile);
      seaKeys.add(k);
      if (!had) chunkAt(x, z).keys.push(k);
      if (sg.floating) gapBottom[col(x + HALF, z + HALF)] = Math.min(gapBottom[col(x + HALF, z + HALF)], y);
    },
    clear: () => false,
    beam(x, y, z, color) {
      beams.push({ x, y, z, color });
    },
    fx(kind, x, y, z) {
      fx.push({ kind, x, y, z });
    },
  };
  buildSea(sg);

  // Collision ceiling: the highest of terrain and placed blocks per column.
  const ceiling = Int16Array.from(height);
  const ceilTile = Uint8Array.from(topTile);
  for (const [k, tile] of blocks) {
    const [x, y, z] = unkey(k);
    const c = col(x + HALF, z + HALF);
    if (y + 1 > ceiling[c]) {
      ceiling[c] = y + 1;
      ceilTile[c] = tile;
    }
  }

  return { height, topTile, ceiling, ceilTile, gapBottom, owner, blocks, seaKeys, islands, sea, dests, beams, fx };
}
