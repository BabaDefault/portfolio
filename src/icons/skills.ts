import type { PixelArt } from '../ui/PixelIcon';

// Programmatic potion bottles: glass outline + liquid filled to `level`%.

/** Bottle shape, 12×13. Per row: [outlineLeft, outlineRight] (interior lies between). */
const SHAPE: [number, number][] = [
  [5, 6], // 0 cork
  [5, 6], // 1 cork
  [4, 7], // 2 neck
  [4, 7], // 3 neck
  [3, 8], // 4 shoulder
  [2, 9], // 5
  [1, 10], // 6
  [1, 10], // 7
  [1, 10], // 8
  [1, 10], // 9
  [1, 10], // 10
  [2, 9], // 11
  [3, 8], // 12 base (solid outline)
];
const W = 12;
const FIRST_INTERIOR = 2;
const LAST_INTERIOR = 11;

function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (s: number) => {
    const v = (n >> s) & 255;
    const t = amt < 0 ? 0 : 255;
    return Math.round(v + (t - v) * Math.abs(amt));
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

const cache = new Map<string, PixelArt>();

export function potionArt(level: number, color: string): PixelArt {
  const key = `${level}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rows = LAST_INTERIOR - FIRST_INTERIOR + 1;
  const filled = Math.round((Math.max(0, Math.min(100, level)) / 100) * rows);
  const surface = LAST_INTERIOR - filled + 1; // first liquid row

  const grid: string[] = SHAPE.map(([l, r], y) => {
    let row = '';
    for (let x = 0; x < W; x++) {
      if (y <= 1) {
        row += x >= l && x <= r ? (x === l ? 'b' : 'B') : '.';
        continue;
      }
      if (x < l || x > r) {
        row += '.';
        continue;
      }
      if (y === SHAPE.length - 1 || x === l || x === r) {
        row += 'o';
        continue;
      }
      const liquid = y >= surface;
      const hiCol = x === l + 1 && y >= 5 && y <= 8;
      if (hiCol) row += 'w';
      else if (!liquid) row += 'e';
      else if (y === surface) row += 'T';
      else if (x === r - 1 || y === LAST_INTERIOR) row += 'D';
      else row += 'L';
    }
    return row;
  });

  const art: PixelArt = {
    palette: {
      b: '#a07a50',
      B: '#6b4f31',
      o: '#d9ecff',
      e: 'rgba(190, 220, 255, 0.28)',
      w: '#ffffff',
      L: color,
      T: shade(color, 0.35),
      D: shade(color, -0.3),
    },
    grid,
  };
  cache.set(key, art);
  return art;
}
