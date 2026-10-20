// Generates public/skins/player.png: a 128x128 HD Minecraft skin (classic 4px arms).
// The layout is the standard 64x64 skin layout painted at 2x, so every helper takes
// a face rectangle in 64-space and paints it at HD resolution (16px per head face).
//
// Look: messy black hair with a tousled hat-layer silhouette, thick round black
// glasses, warm skin with blush and a small smile, white long-sleeve top with soft
// folds and a grey crossbody pouch, charcoal pants with a centre crease, black shoes
// with white toe caps and soles.
//
//   node scripts/make-skin-hd.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const S = 2; // HD scale
const W = 64 * S, H = 64 * S;
const px = new Uint8Array(W * H * 4); // transparent by default

// ---------------------------------------------------------------- utilities
let seed = 20261020;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
/** Deterministic 2D hash in [0,1) (used for hair strands so they don't depend on paint order). */
function hash(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

function put(x, y, rgb, a = 255) {
  const i = (y * W + x) * 4;
  px[i] = clamp(rgb[0]); px[i + 1] = clamp(rgb[1]); px[i + 2] = clamp(rgb[2]); px[i + 3] = a;
}

// Per-face light: light from the top-left (viewer's left = the player's right side).
const FACE_MUL = { top: 1.06, front: 1.0, right: 0.94, left: 0.88, back: 0.82, bottom: 0.74 };

/** Box faces (64-space rects) for a cuboid whose UV block starts at (bx, by). */
function cube(bx, by, w, h, d) {
  return {
    top: [bx + d, by, w, d],
    bottom: [bx + d + w, by, w, d],
    right: [bx, by + d, d, h],
    front: [bx + d, by + d, w, h],
    left: [bx + d + w, by + d, d, h],
    back: [bx + 2 * d + w, by + d, w, h],
  };
}

/**
 * Paint a face. `src(u, v, fw, fh)` returns a hex colour, an [r,g,b] array, or null (skip).
 * Shading: face multiplier, vertical gradient (lighter top), slight left-to-right falloff, noise.
 */
function paintFace(rect, face, src, { grad = 0.12, hgrad = 0.04, noise = 3 } = {}) {
  const [x64, y64, w64, h64] = rect;
  const fw = w64 * S, fh = h64 * S;
  const mul = FACE_MUL[face] ?? 1;
  for (let v = 0; v < fh; v++) {
    for (let u = 0; u < fw; u++) {
      let c = src(u, v, fw, fh);
      if (c == null) continue;
      if (typeof c === 'string') c = hex(c);
      const vg = fh > 1 ? 0.5 - v / (fh - 1) : 0;
      const hg = fw > 1 ? 0.5 - u / (fw - 1) : 0;
      const k = mul * (1 + grad * vg + (face === 'front' || face === 'back' ? hgrad * hg : 0));
      const n = noise ? (rand() * 2 - 1) * noise : 0;
      put(x64 * S + u, y64 * S + v, [c[0] * k + n, c[1] * k + n, c[2] * k + n]);
    }
  }
}

/** Palette-char grid source. Palette values are hex strings or (u, v) => colour functions. */
function grid(rows, pal) {
  return (u, v) => {
    const ch = rows[v]?.[u];
    const p = ch && pal[ch];
    if (!p) return null;
    return typeof p === 'function' ? p(u, v) : p;
  };
}
const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));
/** Turn a '#'/'.' mask into a grid source using one palette entry. */
const mask = (rows, fn) => grid(rows.map((r) => r.replace(/#/g, 'H')), { H: fn });

// ---------------------------------------------------------------- palette
const HAIR = '#151213', HAIR_D = '#0c0a0b', HAIR_L = '#211b1a', HAIR_HL = '#2e2725';
const SKIN = '#ebb790', SKIN_S = '#d69f78', SKIN_D = '#bd825e', BLUSH = '#e8957a';
const MOUTH = '#cf7a58', MOUTH_D = '#b5603f';
const BROW = '#2c1f1a';
const FRAME = '#100e10', FRAME_L = '#2a2629';
const LENS = '#f3f1ee', LENS_S = '#d6d2d8', PUPIL = '#2a1c17', IRIS = '#4a3226';
const SHIRT_L = '#f8f6f3', SHIRT = '#efebe7', SHIRT_M = '#e4e0dd', SHIRT_S = '#d3cecc', SHIRT_F = '#c9c4c3', SHIRT_D = '#b2adae';
const NECK = '#c48d6b';
const STRAP = '#8f8d92', STRAP_L = '#aaa8ad', STRAP_M = '#7c7a80', STRAP_D = '#5c5a60', STRAP_T = '#4a484d';
const POUCH_E = '#2b292c', POUCH_E2 = '#1d1b1e';
const PANTS = '#302b29', PANTS_L = '#3e3835', PANTS_D = '#221e1d', PANTS_C = '#2a2624', PANTS_HEM = '#151312';
const SHOE_K = '#151415', SHOE_K2 = '#232123', SHOE_W = '#f0f0f0', SHOE_WS = '#cdcdd2';

/** Procedural hair: vertical strands of varying darkness, more highlights near the top. */
function hair(k = 0, bias = 0) {
  return (u, v) => {
    const off = Math.floor(hash(u, 99, k) * 4);
    const h = hash(u, Math.floor((v + off) / 3), k + 7);
    const top = v < 5 ? 0.08 : 0;
    if (h < 0.2) return HAIR_D;
    if (h > 0.95 - top - bias) return HAIR_HL;
    if (h > 0.76 - top - bias) return HAIR_L;
    return HAIR;
  };
}

// ================================================================= HEAD (base 0,0)
const head = cube(0, 0, 8, 8, 8);
const facePal = {
  H: hair(1), s: SKIN, S: SKIN_S, D: SKIN_D, B: BROW,
  k: FRAME, K: FRAME_L, w: LENS, W: LENS_S, e: PUPIL, i: IRIS,
  b: BLUSH, m: MOUTH, M: MOUTH_D,
};

// Front face, 16x16 at HD. Columns 0..F, rows top to bottom.
//   fringe with two forehead windows, brows, thick round glasses (2px frames, pupils
//   looking toward the centre), blush, small smile, shaded jaw.
paintFace(head.front, 'front', grid([
  'HHHHHHHHHHHHHHHH', // 0
  'HHHHHHHHHHHHHHHH', // 1
  'HHHHSsHHHHsSHHHH', // 2  forehead windows between fringe clumps
  'HHBBssHHHHssBBHH', // 3  brows peek out at the outer ends
  'HSKKkkkSSKKkkkSH', // 4  top frames, 2px (rounded corners)
  'HkkkkkkkkkkkkkkH', // 5
  'HkWWeeWkkWeeWWkH', // 6  lenses: shaded top row, pupils toward centre
  'HkwweewkkweewwkH', // 7
  'HkwweewkkweewwkH', // 8
  'HkwwiiwkkwiiwwkH', // 9  iris
  'SkkkkkksskkkkkkS', // 10 bottom frames, 2px
  'SskkkksssskkkksS', // 11 (rounded)
  'SsbbsmssssmsbbsS', // 12 blush, smile corners
  'SsbbssmMMmssbbsS', // 13 smile
  'DSSssssssssssSSD', // 14 jaw shade
  'DDSSSSSSSSSSSSDD', // 15
], facePal), { grad: 0.1, noise: 3 });

// Right side (front edge at the right), left side is its mirror.
const sideRows = [
  'HHHHHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHkk', // frame wraps the corner
  'HHHHHHHkkkkkkkkk', // temple arm
  'HHHHHHSSssssssHH',
  'HHHHHSDSssssssHH', // ear + sideburn
  'HHHHHDSDsssssssH',
  'HHHHHSDSssssssss',
  'HHHHSSSsssssssss',
  'HHHHSSssssssssss',
  'HHHSSSssssssssss',
  'HHSSSSSsssssssss',
  'HSSSSSSSSSSSSSSS',
  'DDDDDDDDDDDDDDDD',
];
paintFace(head.right, 'right', grid(sideRows, facePal));
paintFace(head.left, 'left', grid(mirror(sideRows), facePal));
paintFace(head.back, 'back', grid([
  ...Array(13).fill('HHHHHHHHHHHHHHHH'),
  'HHHHHHHHHHHHHHHH',
  'HSHHHSSHHSSHHHSH',
  'SSSHSSSSSSSSHSSS',
], facePal), { noise: 4 });
paintFace(head.top, 'top', hair(2, 0.05), { grad: 0.04, noise: 4 });
paintFace(head.bottom, 'bottom', (u, v) => (v < 3 || u < 2 || u > 13 ? SKIN_D : SKIN_S));

// ---- Hat layer (32,0): tousled hair volume, transparent where the face shows.
const hat = cube(32, 0, 8, 8, 8);
const hatHair = hair(5, 0.06);
/** Knock a few pixels out of a hat face's outer edges for a tousled silhouette. */
const notch = (src, k, edges = 'top') => (u, v, fw, fh) => {
  const onEdge = edges === 'all' ? (u === 0 || v === 0 || u === fw - 1 || v === fh - 1) : v === 0;
  if (onEdge && hash(u, v, k) > 0.7) return null;
  return src(u, v, fw, fh);
};
paintFace(hat.top, 'top', notch(mask([
  '################', '################', '################', '################',
  '################', '################', '################', '################',
  '################', '################', '################', '################',
  '################', '################', '################', '################',
], hatHair), 11, 'all'), { grad: 0.05, noise: 5 });
paintFace(hat.front, 'front', notch(mask([
  '################',
  '################',
  '################',
  '####..####..####', // clumps around the forehead windows
  '##......#.....##', // centre clump tip + side locks
  '#..............#',
  '#...............',
  '................',
  '................',
  ...Array(7).fill('................'),
], hatHair), 12), { noise: 5 });
const hatSide = [
  '################',
  '################',
  '################',
  '################',
  '################',
  '################',
  '######.#####.###',
  '#####........##.',
  '#####.........#.',
  '####............',
  '###.............',
  '##.#............',
  '#...............',
  '#...............',
  '................',
  '................',
];
paintFace(hat.right, 'right', notch(mask(hatSide, hatHair), 13), { noise: 5 });
paintFace(hat.left, 'left', notch(mask(mirror(hatSide), hatHair), 14), { noise: 5 });
paintFace(hat.back, 'back', notch(mask([
  ...Array(11).fill('################'),
  '################',
  '##.###.####.##.#',
  '#...#...##...#..',
  '................',
  '................',
], hatHair), 15), { noise: 5 });

// ================================================================= BODY (base 16,16)
const body = cube(16, 16, 8, 12, 4);
const shirtPal = { l: SHIRT_L, w: SHIRT, s: SHIRT_S, f: SHIRT_F, d: SHIRT_D, n: NECK };
paintFace(body.front, 'front', grid([
  'lllllsnnnnslllll', // 0  neckline
  'lllllwsssswwwwww', // 1  soft collar
  'lllllwwwwwwwwwww',
  'lllllwwwwwwwwwws',
  'llllwwwwwwwwwwws',
  'lllwwwwwwwwwwwss',
  'llwwwwwwwwwwwwws',
  'lwwwswwwwwwwwwss',
  'lwwwwswwwwwwwwws',
  'wwwwwwswwwwwwwss', // diagonal fold
  'wwwwwwwswwwwwwws',
  'wwwwwwwwwwwwwwss',
  'wwwswwwwwwwwwwws',
  'wwwwswwwwwwwwwss',
  'wwwwwwwwwwwwwwws',
  'wwwwwwwwwwwwwwss',
  'swwwwwwwwwwwwwws',
  'swwwswwwwwwwwwss',
  'wwwwfswwwwwwwwws',
  'wwwwwwwwwwwwwwss',
  'swwwwwwwwwwwwsss',
  'sswwwwwwwwwwssss',
  'fsssssfssssssfsf', // hem
  'dffffffdffffffdd',
], shirtPal), { grad: 0.06, noise: 3 });
const shirtSide = (u, v, fw, fh) =>
  v >= fh - 1 ? SHIRT_F : v >= fh - 2 ? SHIRT_S : (v < 2 ? SHIRT_L : SHIRT);
paintFace(body.right, 'right', shirtSide);
paintFace(body.left, 'left', shirtSide);
paintFace(body.back, 'back', grid([
  'wwwwwwssssswwwww',
  'wwwwwwwwwwwwwwww',
  ...Array(5).fill('wwwwwwwwwwwwwwww'),
  'wwwwswwwwwwswwww',
  'wwwwwswwwwswwwww',
  ...Array(5).fill('wwwwwwwwwwwwwwww'),
  'wwwwwwwwwwwwswww',
  'wwswwwwwwwwwwsww',
  ...Array(4).fill('wwwwwwwwwwwwwwww'),
  'swwwwwwwwwwwwwws',
  'sswwwwwwwwwwwwss',
  'fsssssfssssssfsf',
  'dffffffdffffffdd',
], shirtPal), { noise: 3 });
paintFace(body.top, 'top', (u, v) => (v > 2 && v < 6 && u > 4 && u < 11 ? NECK : SHIRT_L));
paintFace(body.bottom, 'bottom', () => SHIRT_F);

// Jacket overlay (16,32): only the crossbody pouch, raised off the chest.
const jacket = cube(16, 32, 8, 12, 4);
paintFace(jacket.front, 'front', grid([
  ...Array(7).fill('................'),
  '..........tt....', // 7  rounded top cap
  '.........tTTt...',
  '.........LpPD...',
  '.........LpPD...',
  '.........LpPD...',
  '.........LppD...',
  '.........LpPD...',
  '.........LpPD...',
  '.........LppD...',
  '.........LpPD...',
  '.........LpPD...',
  '.........DDDD...', // seam
  '.........eEEe...', // dark bottom end
  '.........eEEe...',
  '.........eEEe...',
  '................',
  '................',
], { t: STRAP_T, T: STRAP_D, L: STRAP_L, p: STRAP, P: STRAP_M, D: STRAP_D, e: POUCH_E, E: POUCH_E2 }),
{ grad: 0.08, noise: 2 });

// ================================================================= ARMS (classic 4 wide)
const skinPal = { s: SKIN, S: SKIN_S, D: SKIN_D };
function sleeve(face) {
  // Wrinkle bands (grey patches) at fixed rows, cuff at 18-19, hand 20-23.
  const soft = { 6: [0, 1, 2, 3], 7: [0, 3], 11: [3, 4, 5, 6, 7], 12: [3, 7], 15: [0, 1, 2, 6, 7], 16: [0, 7] };
  const folds = { 7: [1, 2], 12: [4, 5, 6], 16: [1, 2] };
  return (u, v) => {
    if (v >= 20) {
      if (face === 'front' && v === 23 && (u === 2 || u === 5)) return SKIN_D;
      if (v === 20) return SKIN_S;
      return face === 'back' ? SKIN_S : SKIN;
    }
    if (v === 18) return SHIRT_S;
    if (v === 19) return SHIRT_F;
    if (folds[v]?.includes(u)) return SHIRT_S;
    if (soft[v]?.includes(u)) return SHIRT_M;
    if (v === 0 && face !== 'back') return SHIRT_L;
    return SHIRT;
  };
}
for (const [bx, by] of [[40, 16], [32, 48]]) {
  const a = cube(bx, by, 4, 12, 4);
  for (const f of ['right', 'front', 'left', 'back']) paintFace(a[f], f, sleeve(f), { grad: 0.08, noise: 3 });
  paintFace(a.top, 'top', () => SHIRT_L);
  paintFace(a.bottom, 'bottom', grid(Array(8).fill('SSSSSSSS'), skinPal));
}

// ================================================================= LEGS
const pantsPal = {
  P: PANTS, L: PANTS_L, d: PANTS_D, c: PANTS_C, h: PANTS_HEM,
  k: SHOE_K, K: SHOE_K2, W: SHOE_W, s: SHOE_WS,
};
const legFront = [
  'LLLLLLLL',
  ...Array(14).fill('LLLcLLLP'), // centre crease
  'PLLcLLLP',
  'PLLLLLPd',
  'dPPdPPPd', // bunched hem
  'hhhhhhhh',
  'kkkkkkkk', // shoe upper
  'kKWWWWKk', // white toe cap
  'kWWWWWWk',
  'WWWWWWWW', // sole
  'ssssssss',
];
const legSide = (frontAtRight) => {
  const rows = [
    ...Array(16).fill('PPPPPPPP'),
    'PPPPPPPd',
    'dPPdPPPd',
    'hhhhhhhh',
    'kkkkkkkk',
    'kkkkkKWW',
    'kkkkKWWW',
    'WWWWWWWW',
    'ssssssss',
  ];
  return frontAtRight ? rows : mirror(rows);
};
const legBack = [
  ...Array(16).fill('dddddddd'),
  'dddddddd',
  'dddddddd',
  'hhhhhhhh',
  'kkkkkkkk',
  'kkkkkkkk',
  'kKKKKKKk',
  'WWWWWWWW',
  'ssssssss',
];
for (const [bx, by] of [[0, 16], [16, 48]]) {
  const l = cube(bx, by, 4, 12, 4);
  paintFace(l.front, 'front', grid(legFront, pantsPal), { grad: 0.1, noise: 4 });
  paintFace(l.right, 'right', grid(legSide(true), pantsPal), { grad: 0.1, noise: 4 });
  paintFace(l.left, 'left', grid(legSide(false), pantsPal), { grad: 0.1, noise: 4 });
  paintFace(l.back, 'back', grid(legBack, pantsPal), { grad: 0.1, noise: 4 });
  paintFace(l.top, 'top', () => PANTS_D);
  paintFace(l.bottom, 'bottom', (u, v) => (u === 0 || u === 7 || v === 0 || v === 7 ? SHOE_WS : SHOE_W));
}

// ---------------------------------------------------------------- PNG encode
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync('public/skins', { recursive: true });
writeFileSync('public/skins/player.png', png);
console.log(`wrote public/skins/player.png (${W}x${H})`);
