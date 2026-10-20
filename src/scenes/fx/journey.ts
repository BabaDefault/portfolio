import type { SceneFx } from '../sceneEffects';

// Cherry grove valley under snowy peaks, seen from a grass ledge (src/assets/scenes/journey.webp)
export const journey: SceneFx = {
  effects: [
    // soft mist drifting through the valley floor
    { type: 'fog', y: 40, height: 12, x: 0, width: 62, color: '#c9cfe8', strength: 0.22 },
    // gentle bright sky on the left horizon (mostly behind the map)
    { type: 'glow', x: 4, y: 33, size: 30, color: '#ffe6f0', mode: 'pulse', strength: 0.25, period: 7 },
    // snow catching the light on the peaks
    { type: 'glints', region: [80, 8, 18, 18], count: 10, color: '#ffffff', size: 2 },
    { type: 'glints', region: [61, 12, 11, 12], count: 6, color: '#ffffff', size: 2 },
    { type: 'glints', region: [70, 9, 9, 10], count: 5, color: '#ffffff', size: 2 },
    // cherry petals drifting across the view (heavier over the grove on the right)
    { type: 'particles', kind: 'petals', region: [38, 5, 62, 90], count: 42 },
    { type: 'particles', kind: 'petals', region: [0, 25, 40, 70], count: 12 },
  ],
};
