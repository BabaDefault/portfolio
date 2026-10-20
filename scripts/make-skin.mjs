// Generates public/skins/player.png — a 64×64 Minecraft skin (classic arms).
// Based on the reference render: black messy hair, round glasses, white long-sleeve
// top, black pants, white shoes. Edit freely in NovaSkin/Blockbench afterwards,
// or replace the PNG with any standard skin.
//   node scripts/make-skin.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 64, H = 64;
const px = new Uint8Array(W * H * 4); // transparent by default

let seed = 1337;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function set(x, y, color, jitter = 0) {
  const [r, g, b] = hex(color);
  const j = jitter ? Math.round((rand() * 2 - 1) * jitter) : 0;
  const i = (y * W + x) * 4;
  px[i] = Math.max(0, Math.min(255, r + j));
  px[i + 1] = Math.max(0, Math.min(255, g + j));
  px[i + 2] = Math.max(0, Math.min(255, b + j));
  px[i + 3] = 255;
}
function rect(x, y, w, h, color, jitter = 0) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, color, jitter);
}
/** Draw rows of chars with a palette at (x, y). '.' = skip */
function art(x, y, rows, pal, jitter = 0) {
  rows.forEach((row, yy) => [...row].forEach((ch, xx) => pal[ch] && set(x + xx, y + yy, pal[ch], jitter)));
}

// Palette
const SKIN = '#e9b48c', SKIN_S = '#d39c74', SKIN_D = '#bb8460', BLUSH = '#e58f6f';
const HAIR = '#121011', HAIR_L = '#2c2522';
const GLASS = '#0c0b0c', EYE = '#1e1614', WHITE_E = '#f2eee8', MOUTH = '#d4805c';
const SHIRT = '#f1ede8', SHIRT_S = '#d9d5d2', SHIRT_D = '#c2bfbf';
const STRAP = '#8e8d92', STRAP_L = '#a9a8ad', STRAP_D = '#26252a';
const PANTS = '#2a2624', PANTS_L = '#3a3532', PANTS_D = '#1a1817';
const SHOE = '#f2f2f2', SHOE_S = '#cfcfd3', SOLE = '#e6e6e6', SHOE_TOP = '#151515';

const pal = { H: HAIR, h: HAIR_L, s: SKIN, S: SKIN_S, D: SKIN_D, k: GLASS, e: EYE, w: WHITE_E, m: MOUTH, b: BLUSH };

// ---------------- HEAD (base 0,0) ----------------
rect(8, 0, 8, 8, HAIR, 6); // top
rect(16, 0, 8, 8, SKIN_S, 3); // bottom (chin/neck)
// front 8,8
// hair + fringe, round glasses (two lenses joined by a bridge), small smile
art(8, 8, [
  'HHHHHHHH',
  'HhHHHHhH',
  'HsHHsHsH',
  'kkkkkkkk',
  'kwekkewk',
  'skksskks',
  'sbsmmsbs',
  'SSSSSSSS',
], pal, 3);
// right side 0,8 (front edge at x=7)
art(0, 8, [
  'HHHHHHHH',
  'HHHHHHHH',
  'HHHHHHHH',
  'HHHHHkkk',
  'HHHSssss',
  'HHSSssss',
  'HSSSssss',
  'SSSSSSSS',
], pal, 3);
// left side 16,8 (front edge at x=16)
art(16, 8, [
  'HHHHHHHH',
  'HHHHHHHH',
  'HHHHHHHH',
  'kkkHHHHH',
  'ssssSHHH',
  'ssssSSHH',
  'ssssSSSH',
  'SSSSSSSS',
], pal, 3);
// back 24,8
rect(24, 8, 8, 8, HAIR, 6);
art(24, 15, ['HSSSSSSH'], pal);

// Hat layer (32,0) — messy hair volume around the head
rect(40, 0, 8, 8, HAIR, 8); // top
art(40, 8, ['HhHHHHhH', 'HH.HH.HH', 'H.....H.'], pal, 6); // front fringe
art(40, 0, ['HhHHhHHH', 'HHHhHHhH'], pal, 10); // tousled top
art(32, 8, ['HHHHHHHH', 'HHHHHH..', 'HHHH....', 'HH......', 'H.......'], pal, 6); // right
art(48, 8, ['HHHHHHHH', '..HHHHHH', '....HHHH', '......HH', '.......H'], pal, 6); // left
art(56, 8, ['HHHHHHHH', 'HHHHHHHH', 'HHHHHHHH', 'HHHHHHHH', 'HHHHHHHH', 'H.HHHH.H'], pal, 6); // back

// ---------------- BODY (base 16,16) ----------------
rect(20, 16, 8, 4, SHIRT_S, 4); // top (shoulders)
rect(28, 16, 8, 4, SHIRT_D, 4); // bottom
rect(16, 20, 4, 12, SHIRT_S, 5); // right
rect(20, 20, 8, 12, SHIRT, 5); // front
rect(28, 20, 4, 12, SHIRT_S, 5); // left
rect(32, 20, 8, 12, SHIRT_S, 5); // back
// neckline + subtle folds
rect(22, 20, 4, 1, SKIN_S);
rect(23, 21, 2, 1, SHIRT_S);
rect(20, 31, 8, 1, SHIRT_D, 3); // hem
rect(32, 31, 8, 1, SHIRT_D, 3);
set(22, 26, SHIRT_S); set(23, 29, SHIRT_S);
// gray crossbody strap / pouch down the chest
rect(24, 23, 2, 6, STRAP, 4);
rect(24, 23, 1, 6, STRAP_L, 3);
rect(24, 29, 2, 2, STRAP_D, 2);

// ---------------- ARMS (classic, 4 wide) ----------------
function arm(bx, by) {
  // top, bottom
  rect(bx + 4, by, 4, 4, SHIRT_S, 4);
  rect(bx + 8, by, 4, 4, SKIN_S, 3); // hand underside
  // sides: right, front, left, back (each 4×12)
  for (let f = 0; f < 4; f++) {
    const x = bx + f * 4;
    rect(x, by + 4, 4, 10, f === 1 ? SHIRT : SHIRT_S, 5);
    rect(x, by + 13, 4, 1, SHIRT_D, 3); // cuff
    rect(x, by + 14, 4, 2, f === 3 ? SKIN_S : SKIN, 3); // hand
  }
}
arm(40, 16); // right arm
arm(32, 48); // left arm

// ---------------- LEGS ----------------
function leg(bx, by) {
  rect(bx + 4, by, 4, 4, PANTS_D, 3); // top
  rect(bx + 8, by, 4, 4, SOLE, 3); // bottom (sole)
  void SHOE_S;
  for (let f = 0; f < 4; f++) {
    const x = bx + f * 4;
    rect(x, by + 4, 4, 9, f === 1 ? PANTS_L : PANTS, 4);
    rect(x, by + 12, 4, 1, PANTS_D, 2); // hem
    rect(x, by + 13, 4, 1, SHOE_TOP, 2);
    rect(x, by + 14, 4, 1, f === 1 ? SHOE : SHOE_TOP, 2); // white toe cap on the front
    rect(x, by + 15, 4, 1, f === 1 ? SHOE : SOLE, 2);
  }
  set(bx + 5, by + 8, PANTS_D); // crease
}
leg(0, 16); // right leg
leg(16, 48); // left leg

// ---------------- PNG encode ----------------
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
console.log('wrote public/skins/player.png');
