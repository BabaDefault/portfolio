import type { PixelArt } from '../ui/PixelIcon';
import type { JourneyStop } from '../data/content';

// Banner-style waypoint markers for the treasure map (12×16),
// plus a compass rose and the red "X".

type Emblem = { cloth: string; edge: string; colors: Record<string, string>; grid: string[] };

const emblems: Record<JourneyStop['icon'], Emblem> = {
  compass: {
    cloth: '#3a5fb0',
    edge: '#1f3670',
    colors: { a: '#9a9aa4', w: '#f2f2f2', b: '#e03030', k: '#2a2a2a' },
    grid: ['.aaaa.', 'awwbwa', 'awbbwa', 'awkkwa', 'awkwwa', '.aaaa.'],
  },
  pickaxe: {
    cloth: '#3f8a35',
    edge: '#215019',
    colors: { a: '#7ff0e2', b: '#8a6a44', w: '#ffffff' },
    grid: ['waaaa.', '....ba', '...b.a', '..b...', '.b....', 'b.....'],
  },
  book: {
    cloth: '#a8322c',
    edge: '#5e1714',
    colors: { a: '#6b3418', w: '#f3ead2', b: '#e8c04a', k: '#3a1a0a' },
    grid: ['aaaaaw', 'abbaaw', 'aaaaaw', 'abbbaw', 'aaaaaw', 'kkkkkw'],
  },
  chest: {
    cloth: '#2f6f78',
    edge: '#173c42',
    colors: { a: '#b8803a', b: '#6b4a1f', k: '#e8e8e8' },
    grid: ['aaaaaa', 'aaaaaa', 'bbkkbb', 'aakkaa', 'aaaaaa', 'bbbbbb'],
  },
  star: {
    cloth: '#6a3aa0',
    edge: '#381c5c',
    colors: { a: '#ffe066', w: '#ffffff' },
    grid: ['..w...', '..a...', 'aaaaa.', '.aaa..', '.a.a..', 'a...a.'],
  },
};

const BANNER_W = 12;
const BANNER_H = 16;

function banner(e: Emblem): PixelArt {
  const rows: string[][] = [];
  // pole
  rows.push('PppppppppppP'.split(''));
  // cloth body with dark side edges
  for (let y = 1; y < BANNER_H - 2; y++) rows.push(('C' + 'c'.repeat(BANNER_W - 2) + 'C').split(''));
  // swallowtail bottom
  rows.push('CcccC..CcccC'.split(''));
  rows.push('CCC......CCC'.split(''));
  // stripe near the top, like a banner pattern
  for (let x = 1; x < BANNER_W - 1; x++) rows[2][x] = 's';
  // emblem
  e.grid.forEach((line, dy) =>
    line.split('').forEach((ch, dx) => {
      if (ch !== '.') rows[4 + dy][3 + dx] = ch;
    }),
  );
  return {
    palette: { P: '#3d2a16', p: '#6b4a2b', c: e.cloth, C: e.edge, s: e.edge, ...e.colors },
    grid: rows.map((r) => r.join('')),
  };
}

export const bannerIcons: Record<JourneyStop['icon'], PixelArt> = {
  compass: banner(emblems.compass),
  pickaxe: banner(emblems.pickaxe),
  book: banner(emblems.book),
  chest: banner(emblems.chest),
  star: banner(emblems.star),
};

/** 4-point compass rose (15×15). North arm is red. */
export const compassRose: PixelArt = (() => {
  const S = 15;
  const c = 7;
  const grid: string[] = [];
  for (let y = 0; y < S; y++) {
    let row = '';
    for (let x = 0; x < S; x++) {
      const dx = x - c;
      const dy = y - c;
      const vertical = Math.abs(dx) <= (c - Math.abs(dy)) / 3.5;
      const horizontal = Math.abs(dy) <= (c - Math.abs(dx)) / 3.5;
      const r2 = dx * dx + dy * dy;
      if (dx === 0 && dy === 0) row += 'o';
      else if (vertical && dy < 0) row += dx <= 0 ? 'r' : 'R';
      else if (vertical) row += dx <= 0 ? 'k' : 'K';
      else if (horizontal) row += dy <= 0 ? 'k' : 'K';
      else if (r2 >= 13 && r2 <= 19) row += 'g'; // ring
      else row += '.';
    }
    grid.push(row);
  }
  return { palette: { o: '#f2e4b8', r: '#e04a3a', R: '#9a2418', k: '#6b4a2b', K: '#3b2a17', g: '#8a6a3c' }, grid };
})();

export const redX: PixelArt = {
  palette: { r: '#d82a1e', R: '#8a1410' },
  grid: ['rR...rR', 'rrR.rrR', '.rrrrR.', '..rrR..', '.rrRrR.', 'rrR.rrR', 'rR...rR'],
};
