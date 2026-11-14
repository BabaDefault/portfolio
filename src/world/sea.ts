// What fills the sea and sky between the islands: rock stacks, spires, arches and sandbars that
// take on the look of the nearest island, plus floating islets (some trailing waterfalls).
import { T } from './atlas';
import { SEA } from './consts';
import { ISLANDS, blob, cherryTree, crimsonFungus, lanternPost, oakTree, spruceTree, type Gen, type IslandDef } from './islands';
import { hash3 } from './noise';
import type { ScreenId } from '../screens/registry';

type Theme = {
  top: number;
  rock: number;
  /** Something to stand on a flat top. */
  prop(g: Gen, x: number, z: number): void;
};

const pillar = (tile: number, min: number, extra: number) => (g: Gen, x: number, z: number) => {
  const y = g.h(x, z);
  for (let i = 0; i < min + Math.floor(g.rand() * extra); i++) g.put(x, y + i, z, tile, true);
};

const THEMES: Record<ScreenId, Theme> = {
  title: { top: T.grassFlowers, rock: T.stone, prop: (g, x, z) => oakTree(g, x, z) },
  profile: { top: T.podzol, rock: T.stone, prop: (g, x, z) => spruceTree(g, x, z) },
  skills: { top: T.wart, rock: T.netherrack, prop: (g, x, z) => (g.rand() < 0.6 ? crimsonFungus(g, x, z) : pillar(T.glowstone, 1, 2)(g, x, z)) },
  projects: { top: T.tanStone, rock: T.tanStone, prop: (g, x, z) => (g.rand() < 0.5 ? lanternPost(g, x, z, 2) : oakTree(g, x, z)) },
  journey: { top: T.grassPetals, rock: T.stone, prop: (g, x, z) => cherryTree(g, x, z) },
  advancements: { top: T.snow, rock: T.ice, prop: pillar(T.ice, 3, 6) },
  quests: { top: T.grassTop, rock: T.stone, prop: (g, x, z) => (g.rand() < 0.5 ? lanternPost(g, x, z, 3) : oakTree(g, x, z)) },
  contact: { top: T.moss, rock: T.tanStone, prop: (g, x, z) => oakTree(g, x, z, T.azalea) },
  end: { top: T.endStone, rock: T.endStone, prop: pillar(T.obsidian, 3, 7) },
};

const ring = ISLANDS.filter((d) => d.floatY === undefined);

function nearest(x: number, z: number, list: IslandDef[] = ring) {
  let best = list[0];
  let bestD = Infinity;
  for (const d of list) {
    const dd = Math.hypot(x - d.x, z - d.z) - d.r;
    if (dd < bestD) {
      best = d;
      bestD = dd;
    }
  }
  return { def: best, gap: bestD };
}

/** A rock column rising from the sea: radius, height above sea level, slight taper and wobble. */
function stack(g: Gen, cx: number, cz: number, rad: number, height: number, theme: Theme, flatTop: boolean) {
  const R = Math.ceil(rad) + 1;
  for (let ox = -R; ox <= R; ox++)
    for (let oz = -R; oz <= R; oz++) {
      const x = cx + ox;
      const z = cz + oz;
      const d = Math.hypot(ox, oz) / rad + (hash3(x, 3, z, 51) - 0.5) * 0.3;
      if (d > 1) continue;
      const h = flatTop ? height - (d > 0.75 ? Math.round((d - 0.75) * height * 1.2) : 0) : height * (1 - d * d * 0.85);
      const y = SEA + Math.max(1, Math.round(h + (hash3(x, 4, z, 52) - 0.5) * 1.6));
      g.level(x, z, y, d < 0.7 || flatTop ? theme.top : theme.rock);
    }
}

export function buildSea(g: Gen) {
  const placed: [number, number, number][] = [];
  const free = (x: number, z: number, room: number) => placed.every(([px, pz, pr]) => Math.hypot(x - px, z - pz) > pr + room);

  // ---- Stacks, spires, arches and sandbars on the water ----
  let tries = 0;
  while (placed.length < 46 && tries++ < 4000) {
    const a = g.rand() * Math.PI * 2;
    const rr = 40 + g.rand() * 205;
    const x = Math.round(Math.cos(a) * rr);
    const z = Math.round(Math.sin(a) * rr);
    const { def, gap } = nearest(x, z);
    if (gap < 9 || gap > 70 || !free(x, z, 12)) continue;
    // keep the launch corridor north of spawn open
    if (Math.abs(x) < 34 && z > 50 && z < 130) continue;
    const theme = THEMES[def.id];
    const kind = g.rand();
    if (kind < 0.4) {
      // grassy stack with something growing on top
      const rad = 3 + g.rand() * 3;
      stack(g, x, z, rad, 7 + g.rand() * 13, theme, true);
      theme.prop(g, x, z);
      placed.push([x, z, rad]);
    } else if (kind < 0.65) {
      // bare spire, sometimes a cluster of two or three
      const n = 1 + Math.floor(g.rand() * 3);
      for (let i = 0; i < n; i++) stack(g, x + Math.round((g.rand() - 0.5) * 9), z + Math.round((g.rand() - 0.5) * 9), 1.6 + g.rand() * 1.4, 12 + g.rand() * 20, { ...theme, top: theme.rock }, false);
      placed.push([x, z, 7]);
    } else if (kind < 0.8) {
      // sea arch: two legs joined by a span you can fly through
      const dx = g.rand() < 0.5 ? 1 : 0;
      const dz = 1 - dx;
      const height = 15 + Math.floor(g.rand() * 8);
      for (const s of [-1, 1]) stack(g, x + dx * s * 7, z + dz * s * 7, 2.6, height, theme, true);
      for (let t = -6; t <= 6; t++)
        for (let w = -1; w <= 1; w++)
          for (let i = 0; i < 3 - Math.round(Math.abs(t) / 4); i++) g.put(x + dx * t + dz * w, SEA + height - 1 - i + (Math.abs(t) < 3 ? 1 : 0), z + dz * t + dx * w, i === 0 && Math.abs(w) < 1 ? theme.top : theme.rock, true);
      placed.push([x, z, 10]);
    } else {
      // low sandbar or ice floe with a lone prop
      const rad = 5 + g.rand() * 4;
      stack(g, x, z, rad, 1.6, { ...theme, top: def.id === 'advancements' ? T.ice : def.id === 'skills' ? T.netherrack : def.id === 'end' ? T.endStone : T.sand }, true);
      g.level(x, z, g.h(x, z) + 1, theme.top);
      theme.prop(g, x, z);
      placed.push([x, z, rad]);
    }
  }

  // ---- Floating islets, between the ring of islands and The End ----
  g.floating = true;
  const sky: [number, number, number][] = [];
  tries = 0;
  while (sky.length < 14 && tries++ < 2000) {
    const a = g.rand() * Math.PI * 2;
    const rr = 62 + g.rand() * 150;
    const x = Math.round(Math.cos(a) * rr);
    const z = Math.round(Math.sin(a) * rr);
    const { def, gap } = nearest(x, z);
    if (gap < 6 || !sky.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > 34)) continue;
    if (Math.abs(x) < 20 && z > 50 && z < 130) continue;
    // nearer the middle they belong to The End
    const theme = THEMES[rr < 95 ? 'end' : def.id];
    const rad = 4 + g.rand() * 4.5;
    const y = Math.round(34 + g.rand() * 46 + (rr < 95 ? 16 : 0));
    const R = Math.ceil(rad);
    for (let ox = -R; ox <= R; ox++)
      for (let oz = -R; oz <= R; oz++) {
        const dd = Math.hypot(ox, oz) / rad + (hash3(x + ox, 6, z + oz, 53) - 0.5) * 0.25;
        if (dd > 1) continue;
        const depth = Math.round((1 - dd * dd) * rad * 1.1 + hash3(x + ox, 7, z + oz, 54) * 1.5);
        for (let i = 0; i <= depth; i++) g.put(x + ox, y - i, z + oz, i === 0 ? theme.top : theme.rock);
      }
    // decorate the top (g.h reads terrain, so place by hand at the islet's surface)
    const k = g.rand();
    if (theme.top === T.endStone) for (let i = 1; i <= 3 + Math.floor(g.rand() * 5); i++) g.put(x, y + i, z, i > 3 && g.rand() < 0.3 ? T.crystal : T.obsidian, true);
    else if (theme.rock === T.ice) for (let i = 1; i <= 4; i++) g.put(x, y + i, z, T.ice, true);
    else if (theme.rock === T.netherrack) blob(g, x, y + 2, z, 1.8, 1.5, T.glowstone, 61);
    else {
      const log = theme.top === T.grassPetals ? T.cherryLog : theme.top === T.podzol ? T.spruceLog : T.oakLog;
      const leaves = theme.top === T.grassPetals ? T.cherryLeaves : theme.top === T.podzol ? T.spruceLeaves : theme.top === T.moss ? T.azalea : T.oakLeaves;
      for (let i = 1; i <= 4; i++) g.put(x, y + i, z, log, true);
      blob(g, x, y + 6, z, 2.6, 2, leaves, 62);
    }
    // a waterfall off the edge of some
    if (k < 0.45 && theme.rock !== T.netherrack && theme.top !== T.endStone) {
      const wx = x + R - 1;
      for (let yy = y; yy > SEA; yy--) g.put(wx, yy, z, T.water, true);
      g.fx('mist', wx + 0.5, SEA + 1.5, z + 0.5);
    } else if (theme.rock === T.netherrack && k < 0.6) {
      for (let yy = y; yy > SEA; yy--) g.put(x + R - 1, yy, z, T.lava, true);
    }
    sky.push([x, z, y]);
  }
  g.floating = false;
}
