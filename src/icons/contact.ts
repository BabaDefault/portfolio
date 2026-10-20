import type { PixelArt } from '../ui/PixelIcon';

// 8×8 icons for the chat command list (Contact).

export const envelope: PixelArt = {
  palette: { k: '#5a3f1f', w: '#efe6c8' },
  grid: ['........', 'kkkkkkkk', 'kkwwwwkk', 'kwkwwkwk', 'kwwkkwwk', 'kwwwwwwk', 'kkkkkkkk', '........'],
};

export const book: PixelArt = {
  palette: { b: '#24357a', B: '#3a4fb0', y: '#ffd84a', p: '#efe6c8' },
  grid: ['.bbbbbb.', '.bBBBBbp', '.bByyBbp', '.bBBBBbp', '.bBBBBbp', '.bBBBBbp', '.bbbbbbp', '..ppppp.'],
};

export const chest: PixelArt = {
  palette: { o: '#2a1a0a', w: '#a0692f', W: '#7a4a1e', l: '#d8d8d8' },
  grid: ['oooooooo', 'owwwwwwo', 'oWWWWWWo', 'ooollooo', 'owwllwwo', 'owwwwwwo', 'oWWWWWWo', 'oooooooo'],
};

export const compass: PixelArt = {
  palette: { k: '#3a3a3a', g: '#c8c8c8', w: '#efe6c8', r: '#d63a3a' },
  grid: ['..kkkk..', '.kggggk.', 'kgwwrwgk', 'kgwrwwgk', 'kgwwwwgk', 'kgwwwwgk', '.kggggk.', '..kkkk..'],
};

const byCommand: Record<string, PixelArt> = {
  '/email': envelope,
  '/linkedin': book,
  '/github': chest,
  '/location': compass,
};

/** Icon for a chat command such as "/github" (falls back to the envelope). */
export function commandIcon(command: string): PixelArt {
  return byCommand[command] ?? envelope;
}
