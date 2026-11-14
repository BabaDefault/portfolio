// Blowing holes in the world. Only the sea stacks and sky islets between the islands can be
// destroyed; the nine section islands (and everything built on them) are left untouched.
import { T } from './atlas';
import { HALF, MIN_Y, N } from './consts';
import { col, inside, key, type Chunk, type World } from './generate';
import { hash3 } from './noise';

const NO_GAP = 32767;
const CELL = 128; // sea chunk size (matches generate.ts)

/** What is left exposed when the surface of a column is blasted away. */
function rubble(top: number) {
  if (top === T.netherrack || top === T.wart || top === T.lava) return T.netherrack;
  if (top === T.ice || top === T.snow) return T.ice;
  if (top === T.tanStone || top === T.endStone) return top;
  if (top === T.sand) return T.sand;
  return T.stone;
}

/** Called with the chunks whose meshes need rebuilding after an explosion (set by the Terrain component). */
export const edits = { remesh: (_chunks: Chunk[]) => {} };

/** Carve a rough sphere out of the destructible parts of the world. Returns the chunks that changed. */
export function explode(w: World, cx: number, cy: number, cz: number, radius: number): Chunk[] {
  const touched = new Set<Chunk>();
  const pruned = new Set<Chunk>();
  const chunkAt = (x: number, z: number) => w.sea[Math.floor((z + HALF) / CELL) * (N / CELL) + Math.floor((x + HALF) / CELL)];
  const bx = Math.floor(cx);
  const bz = Math.floor(cz);
  const R = Math.ceil(radius);

  for (let oz = -R; oz <= R; oz++)
    for (let ox = -R; ox <= R; ox++) {
      const x = bx + ox;
      const z = bz + oz;
      if (!inside(x + HALF, z + HALF)) continue;
      const d2 = ox * ox + oz * oz;
      if (d2 > radius * radius) continue;
      const c = col(x + HALF, z + HALF);
      // ragged edge so craters don't look machined
      const reach = Math.sqrt(radius * radius - d2) * (0.75 + hash3(x, Math.floor(cy), z, 201) * 0.4);
      let changed = false;

      // terrain column (sea stacks): lower it to the bottom of the blast
      if (w.owner[c] >= 100 && w.height[c] > cy - reach && w.height[c] > MIN_Y) {
        w.height[c] = Math.max(MIN_Y, Math.floor(cy - reach));
        w.topTile[c] = rubble(w.topTile[c]);
        changed = true;
      }
      // placed blocks (trees on stacks, floating islets)
      let removed = false;
      for (let y = Math.floor(cy - reach); y <= Math.ceil(cy + reach); y++) {
        const k = key(x, y, z);
        if (!w.seaKeys.has(k)) continue;
        w.seaKeys.delete(k);
        w.blocks.delete(k);
        removed = true;
      }
      if (!changed && !removed) continue;
      const chunk = chunkAt(x, z);
      touched.add(chunk);
      if (removed) pruned.add(chunk);
      // neighbouring chunks share faces along the border
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) if (inside(nx + HALF, nz + HALF)) touched.add(chunkAt(nx, nz));

      // refresh this column's collision data
      let ceiling = w.height[c];
      let tile = w.topTile[c];
      let gap = NO_GAP;
      for (let y = w.height[c]; y < 150; y++) {
        const b = w.blocks.get(key(x, y, z));
        if (b === undefined) continue;
        ceiling = y + 1;
        tile = b;
        if (gap === NO_GAP && y > w.height[c] + 3) gap = y;
      }
      w.ceiling[c] = ceiling;
      w.ceilTile[c] = tile;
      if (removed) w.gapBottom[c] = gap;
    }

  for (const chunk of pruned) chunk.keys = chunk.keys.filter((k) => w.blocks.has(k));
  return [...touched];
}
