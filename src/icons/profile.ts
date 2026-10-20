import type { PixelArt } from '../ui/PixelIcon';

// 8×8 iron-armor icons for the profile inventory, plus hotbar items.

const iron = { d: '#4e4e4e', h: '#a8a8a8', H: '#e6e6e6' };

export const helmet: PixelArt = {
  palette: iron,
  grid: ['........', '.dddddd.', 'dHHHHHhd', 'dHhhhhhd', 'dh....hd', 'dh....hd', 'dd....dd', '........'],
};

export const chestplate: PixelArt = {
  palette: iron,
  grid: ['dd....dd', 'dHd..dhd', 'dHHddhhd', '.dHHHhd.', '.dHhhhd.', '.dHHhhd.', '.dhhhhd.', '.dddddd.'],
};

export const leggings: PixelArt = {
  palette: iron,
  grid: ['dddddddd', 'dHHHHhhd', 'dHhddhhd', 'dHd..dhd', 'dHd..dhd', 'dHd..dhd', 'dhd..dhd', 'ddd..ddd'],
};

export const boots: PixelArt = {
  palette: iron,
  grid: ['........', '........', '.dd..dd.', '.dH..Hd.', '.dh..hd.', 'dHh..hHd', 'dhh..hhd', 'ddd..ddd'],
};

export const armor = { helmet, chestplate, leggings, boots };

export const laptop: PixelArt = {
  palette: { k: '#2a2a2e', b: '#3a7bd5', B: '#9fd3ff', s: '#c9c9c9', S: '#7a7a7a' },
  grid: ['........', '.kkkkkk.', '.kBbbbk.', '.kbBbbk.', '.kbbbbk.', '.kkkkkk.', 'ssssssss', '.SSSSSS.'],
};

export const coffee: PixelArt = {
  palette: { w: '#dcdcdc', c: '#f4f4f4', m: '#c4c4c4', B: '#5a2f17' },
  grid: ['..w..w..', '...w..w.', 'cccccc..', 'cBBBBccc', 'cmmmmc.c', 'cmmmmccc', 'cmmmmc..', '.cccc...'],
};

export const keyboard: PixelArt = {
  palette: { k: '#2f2f35', w: '#d6d6d6', a: '#ffaa00' },
  grid: ['........', '........', 'kkkkkkkk', 'kwkwkwak', 'kkwkwkwk', 'kwkwwwwk', 'kkkkkkkk', '........'],
};

/** Hotbar item art keyed by lower-cased item name (see profile.hotbarItems). */
export const hotbarArt: Record<string, PixelArt> = { laptop, coffee, keyboard };
