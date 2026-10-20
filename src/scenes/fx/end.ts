import type { SceneFx } from '../sceneEffects';

// End island: obsidian pillars, end crystals, exit portal, floating end ship (src/assets/scenes/end.webp)
export const end: SceneFx = {
  effects: [
    // end crystals on the pillar tops, pulsing pink-purple
    { type: 'glow', x: 31.9, y: 2.5, size: 5, color: '#e7a2ff', mode: 'pulse', strength: 0.45 }, // top-left pillar (cut off at top)
    { type: 'glow', x: 37.9, y: 14.5, size: 5, color: '#e7a2ff', mode: 'pulse', strength: 0.5 }, // second pillar, upper left
    { type: 'glow', x: 53.5, y: 25.7, size: 6, color: '#e7a2ff', mode: 'pulse', strength: 0.55 }, // tall centre pillar
    { type: 'glow', x: 47.7, y: 37.1, size: 4, color: '#e7a2ff', mode: 'pulse', strength: 0.45 }, // small centre pair, left
    { type: 'glow', x: 50.8, y: 37.7, size: 4, color: '#e7a2ff', mode: 'pulse', strength: 0.45 }, // small centre pair, right
    { type: 'glow', x: 35.8, y: 44, size: 6, color: '#e7a2ff', mode: 'pulse', strength: 0.5 }, // short pillar, left of centre
    { type: 'glow', x: 59.4, y: 44.1, size: 5, color: '#e7a2ff', mode: 'pulse', strength: 0.5 }, // pillar right of centre
    { type: 'glow', x: 5.8, y: 33.4, size: 4, color: '#e7a2ff', mode: 'pulse', strength: 0.45 }, // far-left island

    // faint pulses travelling up the crystal beams
    { type: 'glints', path: [[38.3, 42], [40.1, 20], [41.8, 0]], count: 8, spread: 0.2, color: '#f6c2ff', size: 2 }, // big beam left of centre
    { type: 'glints', path: [[64.6, 59], [63.6, 50], [60.1, 8], [59.4, 0]], count: 8, spread: 0.2, color: '#f6c2ff', size: 2 }, // beam right of centre
    { type: 'glints', path: [[91.2, 46.6], [83.3, 24.5], [78.3, 0]], count: 8, spread: 0.25, color: '#ffc2ec', size: 2 }, // wide beam, top right

    // exit portal glowing purple
    { type: 'glow', x: 41.4, y: 65.4, size: 11, color: '#b05cff', mode: 'pulse', strength: 0.55 },
    // floating end ship softly lit, plus its tower
    { type: 'glow', x: 75.2, y: 40, size: 18, color: '#d68cff', mode: 'pulse', strength: 0.35 },
    { type: 'glow', x: 74.8, y: 31, size: 5, color: '#ff8cf0', mode: 'pulse', strength: 0.4 },

    // end-rod sparkles rising over the island
    { type: 'particles', kind: 'sparkles', region: [5, 8, 85, 62], count: 26 },
    // a few purple specks rising off the portal
    { type: 'particles', kind: 'sparkles', region: [37, 48, 9, 22], count: 8 },
  ],
};
