import type { PixelArt } from '../ui/PixelIcon';
import type { Advancement } from '../data/content';

// ---------- Item icons (10×10) for advancement nodes ----------

const grass: PixelArt = {
  palette: { G: '#8fd05a', g: '#5d9c3a', d: '#8a6a44', D: '#6b4f31', k: '#3d2c1b' },
  grid: [
    'GGgGGGgGGg',
    'gGGgGgGGgG',
    'GgGGgGGgGG',
    'dgdGddgdGd',
    'ddDdddDddd',
    'dDdddDdddD',
    'dddDdddDdd',
    'DdddDdddDd',
    'ddDddddddD',
    'kdddDddDdk',
  ],
};

const sword: PixelArt = {
  palette: { w: '#ffffff', s: '#c6c6c6', S: '#6f6f6f', h: '#6b4a2b', H: '#3d2a16', g: '#d4af37' },
  grid: [
    '.......wSS',
    '......wsS.',
    '.....wsS..',
    '....wsS...',
    '.g.wsS....',
    '.ggsS.....',
    '..gg......',
    '.hHgg.....',
    'hH..g.....',
    'H.........',
  ],
};

const diamond: PixelArt = {
  palette: { w: '#e8fffb', a: '#4aedd9', A: '#2cb5a8', d: '#1a7a72', k: '#0d3f3b' },
  grid: [
    '...kkkk...',
    '..kwwaak..',
    '.kwaaaAAk.',
    'kwaaaaAAdk',
    'kaaaaAAddk',
    '.kaaAAAdk.',
    '..kaAAdk..',
    '...kAdk...',
    '....kk....',
    '..........',
  ],
};

const book: PixelArt = {
  palette: { b: '#7a3b1e', B: '#4f2410', p: '#f3ead2', P: '#cdbf98', g: '#d4af37' },
  grid: [
    '..........',
    '.bbbbbbbb.',
    'bBggbbbbBp',
    'bbbbbbbbBp',
    'bbggggbbBp',
    'bbbbbbbbBp',
    'bbbbbbbbBp',
    'bBbbbbbbBp',
    '.BBBBBBBPp',
    '..........',
  ],
};

const eye: PixelArt = {
  palette: { g: '#0d3b2e', G: '#2a8a6a', L: '#52c49a', k: '#0a0a0a', y: '#b8e65a' },
  grid: [
    '...gggg...',
    '.ggGGGGgg.',
    '.gGLGGGGg.',
    'gGGGkkGGGg',
    'gGGkyykGGg',
    'gGGkyykGGg',
    'gGGGkkGGGg',
    '.gGGGGGGg.',
    '.ggGGGGgg.',
    '...gggg...',
  ],
};

const star: PixelArt = {
  palette: { w: '#ffffff', y: '#fff7b0', Y: '#e8d870', p: '#d9c7ff' },
  grid: [
    '....w.....',
    '....w.....',
    '...wyw....',
    '..pwyyp...',
    'wwwyYyyww.',
    '..pyyYp...',
    '...wyw....',
    '....w.....',
    '....w.....',
    '..........',
  ],
};

const trophy: PixelArt = {
  palette: { y: '#ffd84a', Y: '#e0a81e', d: '#9a6a10', w: '#fff6c0', k: '#4a3208' },
  grid: [
    'kyyyyyyyyk',
    'ywyyyyyYYy',
    'kywyyyyYdk',
    '.kyyyyyYk.',
    '..kyyyYk..',
    '...kYYk...',
    '....yd....',
    '...yyYd...',
    '..kkkkkk..',
    '..dddddd..',
  ],
};

export const advIcons: Record<Advancement['icon'], PixelArt> = { grass, sword, diamond, book, eye, star, trophy };

// ---------- Tab icons ----------

export const netherrackTab: PixelArt = {
  palette: { r: '#7a2a2a', R: '#a33a3a', d: '#4f1717', o: '#d85a3a' },
  grid: [
    'rRrdrRrrdr',
    'Rrdrrrordr',
    'rdrRrdrrRr',
    'rrorrRdrrd',
    'dRrrdrrRrr',
    'rrRrrordrR',
    'Rdrrdrrrrd',
    'rrdRrrRdrr',
    'rorrdrrrRr',
    'drrRrrdrrd',
  ],
};

export const endStoneTab: PixelArt = {
  palette: { e: '#dfe3a6', E: '#c4c88a', d: '#a9ad72', w: '#f2f5c6' },
  grid: [
    'eeEeeweeEe',
    'eweeEeeded',
    'Eeedeeweee',
    'eeEeweeEed',
    'edeeEedeee',
    'weeEeeeweE',
    'eEedeeEeee',
    'eeeeEdeedw',
    'dewEeeeEee',
    'eeeedeweEe',
  ],
};

// ---------- Procedural frames (26×26) ----------
// task = square, goal = stepped octagon, challenge = spiky.

export type FrameKind = NonNullable<Advancement['frame']>;

const N = 26;
const C = N / 2;

function inside(kind: FrameKind, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= N || y >= N) return false;
  const ax = Math.abs(x + 0.5 - C);
  const ay = Math.abs(y + 0.5 - C);
  if (kind === 'task') return !(ax > C - 1 && ay > C - 1); // square with clipped corner pixels
  if (kind === 'goal') return ax + ay <= C + 6.5; // stepped octagon
  // challenge: inner square plus side spikes and diagonal corner spikes
  const core = ax <= C - 3 && ay <= C - 3;
  const sideSpike = (ax > C - 3 && ay <= (C - ax) * 1.2 + 0.6) || (ay > C - 3 && ax <= (C - ay) * 1.2 + 0.6);
  const cornerSpike = Math.abs(ax - ay) <= 2.6 - (Math.max(ax, ay) - (C - 3)) * 0.8 && Math.max(ax, ay) <= C - 1;
  return core || sideSpike || cornerSpike;
}

function buildFrame(kind: FrameKind, unlocked: boolean): PixelArt {
  const palette = unlocked
    ? { o: '#1b1205', h: '#fff1a8', m: '#e9b93a', d: '#a8701a', f: '#c88f22', i: '#7a4e0e' }
    : { o: '#0b0b0d', h: '#d2d2d2', m: '#9a9a9a', d: '#565656', f: '#6e6e6e', i: '#3d3d3d' };
  const out = (x: number, y: number) => !inside(kind, x, y);
  const grid: string[] = [];
  for (let y = 0; y < N; y++) {
    let row = '';
    for (let x = 0; x < N; x++) {
      if (out(x, y)) {
        row += '.';
        continue;
      }
      if (out(x - 1, y) || out(x + 1, y) || out(x, y - 1) || out(x, y + 1)) {
        row += 'o';
        continue;
      }
      let ch = 'f';
      for (let k = 2; k <= 3; k++) {
        const up = out(x, y - k) || out(x - k, y);
        const down = out(x, y + k) || out(x + k, y);
        if (up || down) {
          ch = up && !down ? 'h' : down && !up ? 'd' : 'm';
          break;
        }
      }
      if (ch === 'f') {
        // a thin dark inner rim right inside the bevel
        const rim = out(x, y - 4) || out(x - 4, y) || out(x, y + 4) || out(x + 4, y);
        if (rim) ch = 'i';
      }
      row += ch;
    }
    grid.push(row);
  }
  return { palette, grid };
}

const frames = new Map<string, PixelArt>();

export function frameArt(kind: FrameKind, unlocked: boolean): PixelArt {
  const key = `${kind}-${unlocked}`;
  let art = frames.get(key);
  if (!art) {
    art = buildFrame(kind, unlocked);
    frames.set(key, art);
  }
  return art;
}
