import type { PixelArt } from '../ui/PixelIcon';

// 8×8 hotbar icons, one per screen.

export const grassBlock: PixelArt = {
  palette: { G: '#7cbd4e', g: '#5d9c3a', d: '#8a6a44', D: '#6b4f31' },
  grid: ['GgGGgGgG', 'gGgGGgGg', 'dGdgdGdd', 'ddDdddDd', 'dDddDddd', 'dddDdddD', 'DddddDdd', 'ddDddddd'],
};

export const playerHead: PixelArt = {
  palette: { h: '#2b1d14', s: '#c8946a', S: '#a87552', w: '#ffffff', e: '#3a4fb0', m: '#6b3a2a' },
  grid: ['hhhhhhhh', 'hhhhhhhh', 'hssssssh', 'ssssssss', 'swessews', 'ssssssss', 'ssmmmmss', 'SSSSSSSS'],
};

export const potion: PixelArt = {
  palette: { b: '#8a6a44', c: '#cfe8ff', w: '#ffffff', p: '#b47cff', P: '#7b4fd0' },
  grid: ['...bb...', '...cc...', '..cppc..', '.cwpppc.', '.cppppc.', '.cpPPpc.', '.cPPPPc.', '..cccc..'],
};

export const pickaxe: PixelArt = {
  palette: { a: '#4aedd9', A: '#2a9d8f', b: '#8a6a44' },
  grid: ['........', '.aaaaa..', '....bAa.', '...b..Aa', '..b...Aa', '.b.....a', 'b.......', '........'],
};

export const map: PixelArt = {
  palette: { k: '#5a3f1f', p: '#e9dcb4', q: '#6fbf4a', g: '#8a5a2a', r: '#d63a3a' },
  grid: ['kkkkkkkk', 'kppppqpk', 'kpgppppk', 'kppgpqpk', 'kqppgppk', 'kppppgrk', 'kpqppppk', 'kkkkkkkk'],
};

export const netherStar: PixelArt = {
  palette: { w: '#ffffff', y: '#fff7b0' },
  grid: ['...w....', '...w....', '..wyw...', 'wwyyyww.', '..wyw...', '...w....', '...w....', '........'],
};

export const emerald: PixelArt = {
  palette: { e: '#0b6e2e', E: '#17dd62', D: '#0fa046', w: '#b8ffd0' },
  grid: ['...ee...', '..eEEe..', '.eEwEEe.', 'eEwEEEEe', 'eEEEEEDe', '.eEEEDe.', '..eEDe..', '...ee...'],
};

export const bookQuill: PixelArt = {
  palette: { w: '#ffffff', f: '#bdbdbd', q: '#2a2a2a', b: '#7a4a24', p: '#efe6c8' },
  grid: ['......wf', '.....wf.', 'bbbbqbb.', 'bppqppb.', 'bpqpppb.', 'bpppppb.', 'bbbbbbb.', '........'],
};

export const enderEye: PixelArt = {
  palette: { g: '#0d3b2e', G: '#2a8a6a', k: '#0a0a0a', y: '#b8e65a' },
  grid: ['..gggg..', '.gGGGGg.', 'gGGkkGGg', 'gGkyykGg', 'gGkyykGg', 'gGGkkGGg', '.gGGGGg.', '..gggg..'],
};
