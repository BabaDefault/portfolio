// Turns the world into BufferGeometries, one terrain mesh and one block mesh per island
// (so islands outside the view are culled). Only faces that can be seen are emitted.
import * as THREE from 'three';
import { GLOW, T, tileUV, type Atlas } from './atlas';
import { HALF, MIN_Y, col, inside, key, unkey, type Chunk, type World } from './generate';
import { hash3 } from './noise';
import { quality } from './quality';

class Buf {
  data: Float32Array;
  length = 0;
  constructor(cap: number) {
    this.data = new Float32Array(cap);
  }
  push(...v: number[]) {
    if (this.length + v.length > this.data.length) {
      const next = new Float32Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    for (let i = 0; i < v.length; i++) this.data[this.length++] = v[i];
  }
  done() {
    return this.data.slice(0, this.length);
  }
}

// Face corners as unit-cube offsets, counter-clockwise seen from outside:
// bottom-left, bottom-right, top-right, top-left (so v runs up the side faces).
const FACES = {
  py: { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  ny: { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  px: { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  nx: { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  pz: { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  nz: { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
} as const;
type FaceName = keyof typeof FACES;
const SIDES: { f: FaceName; di: number; dj: number }[] = [
  { f: 'px', di: 1, dj: 0 },
  { f: 'nx', di: -1, dj: 0 },
  { f: 'pz', di: 0, dj: 1 },
  { f: 'nz', di: 0, dj: -1 },
];

const AO_LEVELS = [0.52, 0.68, 0.84, 1];

class Mesh {
  pos = new Buf(1 << 16);
  nor = new Buf(1 << 16);
  uv = new Buf(1 << 15);
  avg = new Buf(1 << 16);
  ao = new Buf(1 << 15); // x: ambient occlusion, y: glow
  idx: number[] = [];
  verts = 0;
  constructor(private atlas: Atlas) {}

  quad(face: FaceName, x: number, y: number, z: number, tile: number, ao: [number, number, number, number] = [1, 1, 1, 1]) {
    const F = FACES[face];
    const [u0, v0, u1, v1] = tileUV(tile);
    const uvs = [u0, v0, u1, v0, u1, v1, u0, v1];
    const a = this.atlas.avg;
    const glow = GLOW[tile] ?? 0;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      this.pos.push(x + c[0], y + c[1], z + c[2]);
      this.nor.push(F.n[0], F.n[1], F.n[2]);
      this.uv.push(uvs[k * 2], uvs[k * 2 + 1]);
      this.avg.push(a[tile * 3], a[tile * 3 + 1], a[tile * 3 + 2]);
      this.ao.push(ao[k], glow);
    }
    const b = this.verts;
    // split along the brighter diagonal so AO gradients don't crease
    if (ao[0] + ao[2] >= ao[1] + ao[3]) this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    else this.idx.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
    this.verts += 4;
  }

  /** A plant: two crossed upright quads, visible from both sides, lit like the ground under it. */
  cross(x: number, y: number, z: number, tile: number, height: number) {
    const [u0, v0, u1, v1] = tileUV(tile);
    const uvs = [u0, v0, u1, v0, u1, v1, u0, v1];
    const a = this.atlas.avg;
    for (const [ax, az, bx, bz] of [[0.12, 0.12, 0.88, 0.88], [0.12, 0.88, 0.88, 0.12]]) {
      const c = [[ax, 0, az], [bx, 0, bz], [bx, height, bz], [ax, height, az]];
      for (let k = 0; k < 4; k++) {
        this.pos.push(x + c[k][0], y + c[k][1], z + c[k][2]);
        this.nor.push(0, 1, 0);
        this.uv.push(uvs[k * 2], uvs[k * 2 + 1]);
        this.avg.push(a[tile * 3], a[tile * 3 + 1], a[tile * 3 + 2]);
        this.ao.push(1, 0);
      }
      const b = this.verts;
      this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3, b, b + 2, b + 1, b, b + 3, b + 2);
      this.verts += 4;
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.done(), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor.done(), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv.done(), 2));
    g.setAttribute('aAvg', new THREE.BufferAttribute(this.avg.done(), 3));
    g.setAttribute('aAo', new THREE.BufferAttribute(this.ao.done(), 2));
    g.setIndex(this.verts > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

/** What a terrain column shows on its sides: [first layer, next three, everything deeper]. */
const SIDE: Partial<Record<number, [number, number, number]>> = {
  [T.grassTop]: [T.grassSide, T.dirt, T.stone],
  [T.grassPetals]: [T.grassSide, T.dirt, T.stone],
  [T.grassFlowers]: [T.grassSide, T.dirt, T.stone],
  [T.podzol]: [T.dirt, T.dirt, T.stone],
  [T.path]: [T.dirt, T.dirt, T.stone],
  [T.wheat]: [T.wheat, T.dirt, T.stone],
  [T.moss]: [T.moss, T.tanStone, T.tanStone],
  [T.snow]: [T.snowSide, T.stone, T.stone],
  [T.ice]: [T.ice, T.ice, T.stone],
  [T.sand]: [T.sand, T.sand, T.stone],
  [T.gravel]: [T.gravel, T.gravel, T.stone],
  [T.netherrack]: [T.netherrack, T.netherrack, T.netherrack],
  [T.wart]: [T.netherrack, T.netherrack, T.netherrack],
  [T.netherBrick]: [T.netherBrick, T.netherrack, T.netherrack],
  [T.lava]: [T.lava, T.netherrack, T.netherrack],
  [T.sculk]: [T.sculk, T.deepslate, T.deepslate],
  [T.sculkGlow]: [T.sculk, T.deepslate, T.deepslate],
  [T.deepslate]: [T.deepslate, T.deepslate, T.deepslate],
  [T.tanStone]: [T.tanStone, T.tanStone, T.tanStone],
  [T.cobble]: [T.cobble, T.dirt, T.stone],
  [T.planks]: [T.planks, T.planks, T.stone],
  [T.poolWater]: [T.poolWater, T.tanStone, T.tanStone],
  [T.water]: [T.water, T.dirt, T.stone],
};

function sideTile(top: number, depth: number, x: number, y: number, z: number) {
  const s = SIDE[top];
  const t = s ? (depth === 0 ? s[0] : depth < 4 ? s[1] : s[2]) : T.stone;
  // the mine island's rock is studded with ore
  if (top === T.tanStone && depth > 1 && hash3(x, y, z, 77) < 0.05) return T.emeraldOre;
  return t;
}

/** Share of the plants that get drawn (thinned out on phones). */
const PLANT_DENSITY = quality.plants;
/** Plants that grow on each ground tile: [cumulative chance, tile, height]. */
const PLANTS: Partial<Record<number, [number, number, number][]>> = {
  [T.grassTop]: [[0.1, T.tallGrass, 0.9]],
  [T.grassFlowers]: [[0.13, T.tallGrass, 0.9], [0.23, T.flowerYellow, 1.1], [0.28, T.flowerWhite, 0.8], [0.32, T.flowerPink, 0.9]],
  [T.grassPetals]: [[0.1, T.tallGrass, 0.9], [0.17, T.flowerPink, 0.9]],
  [T.moss]: [[0.12, T.tallGrass, 0.9], [0.17, T.flowerPink, 0.9], [0.2, T.flowerWhite, 0.8]],
  [T.podzol]: [[0.07, T.tallGrass, 1], [0.1, T.mushroom, 0.8]],
};

/** Blocks whose top/bottom differ from their sides. */
const CAPS: Partial<Record<number, { top: number; bottom: number; side: number }>> = {
  [T.cherryLog]: { top: T.logTop, bottom: T.logTop, side: T.cherryLog },
  [T.spruceLog]: { top: T.logTop, bottom: T.logTop, side: T.spruceLog },
  [T.oakLog]: { top: T.logTop, bottom: T.logTop, side: T.oakLog },
  [T.crimsonStem]: { top: T.logTop, bottom: T.logTop, side: T.crimsonStem },
  [T.rail]: { top: T.rail, bottom: T.planks, side: T.planks },
};
const LEAVES = new Set<number>([T.cherryLeaves, T.spruceLeaves, T.oakLeaves, T.wart, T.azalea, T.vine, T.glowBerry]);

export function meshTerrain(w: World, atlas: Atlas, isl: Chunk) {
  const m = new Mesh(atlas);
  const hAt = (i: number, j: number) => (inside(i, j) ? w.height[col(i, j)] : MIN_Y);
  const { i0, i1, j0, j1 } = isl.bounds;
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const h = w.height[col(i, j)];
      if (h <= MIN_Y || w.owner[col(i, j)] !== isl.owner) continue;
      const x = i - HALF;
      const z = j - HALF;
      const top = w.topTile[col(i, j)];

      // Top face with per-corner ambient occlusion from taller neighbours.
      const occ = (di: number, dj: number) => (hAt(i + di, j + dj) > h ? 1 : 0);
      const cornerAO = (sx: number, sz: number) => {
        const s1 = occ(sx, 0);
        const s2 = occ(0, sz);
        const c = occ(sx, sz);
        return AO_LEVELS[s1 && s2 ? 0 : 3 - (s1 + s2 + c)];
      };
      if (!w.blocks.has(key(x, h, z))) {
        m.quad('py', x, h - 1, z, top, [cornerAO(-1, 1), cornerAO(1, 1), cornerAO(1, -1), cornerAO(-1, -1)]);
        const plant = PLANTS[top];
        if (plant) {
          const k = hash3(x, 13, z, 99) / PLANT_DENSITY;
          for (const [chance, tile, height] of plant)
            if (k < chance) {
              m.cross(x, h, z, tile, height);
              break;
            }
        }
      }

      // Exposed sides, one quad per block layer so the textures tile.
      for (const s of SIDES) {
        const hn = hAt(i + s.di, j + s.dj);
        if (hn >= h) continue;
        for (let y = hn; y < h; y++) {
          const shade = y === hn && hn > MIN_Y ? 0.7 : 1;
          m.quad(s.f, x, y, z, sideTile(top, h - 1 - y, x, y, z), [shade, shade, 1, 1]);
        }
      }
    }
  return m.build();
}

export function meshBlocks(w: World, atlas: Atlas, isl: Chunk) {
  const m = new Mesh(atlas);
  const solid = (x: number, y: number, z: number) => {
    if (w.blocks.has(key(x, y, z))) return true;
    const i = x + HALF;
    const j = z + HALF;
    return inside(i, j) && y < w.height[col(i, j)];
  };
  const dirs: [FaceName, number, number, number][] = [
    ['py', 0, 1, 0],
    ['ny', 0, -1, 0],
    ['px', 1, 0, 0],
    ['nx', -1, 0, 0],
    ['pz', 0, 0, 1],
    ['nz', 0, 0, -1],
  ];
  for (const k of isl.keys) {
    const b = w.blocks.get(k)!;
    const [x, y, z] = unkey(k);
    const caps = CAPS[b];
    const leaves = LEAVES.has(b);
    for (const [f, dx, dy, dz] of dirs) {
      if (solid(x + dx, y + dy, z + dz)) continue;
      const tile = caps ? (f === 'py' ? caps.top : f === 'ny' ? caps.bottom : caps.side) : b;
      // canopies read darker underneath; leaf faces with leaves above them get a soft shade
      let shade = 1;
      if (f === 'ny') shade = leaves ? 0.62 : 0.75;
      else if (leaves && f !== 'py' && w.blocks.get(key(x, y + 1, z)) === b) shade = 0.86;
      m.quad(f, x, y, z, tile, [shade, shade, shade, shade]);
    }
  }
  return m.build();
}
