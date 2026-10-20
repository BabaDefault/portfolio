import type { SceneFx } from '../sceneEffects';

// Lush cave with a sunlit ceiling hole and turquoise pool (src/assets/scenes/contact.webp)
export const contact: SceneFx = {
  effects: [
    // light shaft falling from the ceiling hole (hole centre 53.5, 11.6; lower rim ~y 20)
    { type: 'rays', x: 53.5, y: 15, angle: -3, spread: 36, length: 90, color: 'rgba(225, 240, 255, 0.5)', strength: 0.45 },
    // spores drifting down through the light beam
    { type: 'particles', kind: 'spores', region: [42, 16, 22, 52], count: 22 },

    // brightest glow-berry clusters breathing (right-hand vine curtain)
    { type: 'glow', x: 90.5, y: 4.6, size: 4, color: '#ffb347', mode: 'pulse', strength: 0.55 },
    { type: 'glow', x: 85, y: 11.2, size: 3.5, color: '#ffb347', mode: 'pulse', strength: 0.5 },
    { type: 'glow', x: 87.3, y: 14.5, size: 3, color: '#ffb347', mode: 'pulse', strength: 0.45 },
    { type: 'glow', x: 90.4, y: 41.7, size: 3.5, color: '#ffb347', mode: 'pulse', strength: 0.5 },
    { type: 'glow', x: 94.5, y: 52.5, size: 3.5, color: '#ffb347', mode: 'pulse', strength: 0.5 },
    { type: 'glow', x: 94.8, y: 63.1, size: 4, color: '#ffb347', mode: 'pulse', strength: 0.55 },
    { type: 'glow', x: 98, y: 65, size: 3.5, color: '#ffb347', mode: 'pulse', strength: 0.5 },
    // berry cluster on the middle vine strip
    { type: 'glow', x: 77, y: 42, size: 3, color: '#ffb347', mode: 'pulse', strength: 0.45 },

    // glow berries twinkling along the vine strips: right curtain, middle strip, strip beside the light shaft
    { type: 'glints', region: [85, 2, 13, 62], count: 10, color: '#ffc46b', size: 2 },
    { type: 'glints', region: [72, 22, 11, 24], count: 8, color: '#ffc46b', size: 2 },
    { type: 'glints', region: [62.5, 2, 7, 38], count: 6, color: '#ffc46b', size: 2 },

    // light ripples on the turquoise pool: deep middle water, then the upper-right stretch before the sand edge
    { type: 'caustics', region: [32, 72, 30, 26], color: 'rgba(190, 255, 245, 0.5)', strength: 0.4 },
    { type: 'caustics', region: [55, 68, 26, 13], color: 'rgba(190, 255, 245, 0.5)', strength: 0.35 },
  ],
};
