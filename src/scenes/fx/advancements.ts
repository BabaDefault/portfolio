import type { SceneFx } from '../sceneEffects';

// Deep Dark ravine with the portal frame in the distance (src/assets/scenes/advancements.webp)
export const advancements: SceneFx = {
  effects: [
    // slow cyan mist along the lower ravine floor
    { type: 'fog', y: 74, height: 24, color: '#4fd6e0', strength: 0.14 },
    // the portal frame opening glowing in the distance
    { type: 'glow', x: 57.2, y: 31.9, size: 20, color: '#9feeff', mode: 'pulse', strength: 0.5 },
    // sculk sensors / glowing blobs on the floor (sizes and strengths varied so they don't pulse as one)
    { type: 'glow', x: 30.7, y: 83.6, size: 8, color: '#6ff4ff', mode: 'pulse', strength: 0.55 }, // big blob, front left
    { type: 'glow', x: 45.3, y: 61.8, size: 5, color: '#5cecff', mode: 'pulse', strength: 0.45 }, // left of the path
    { type: 'glow', x: 54.8, y: 62.1, size: 5.5, color: '#6ff4ff', mode: 'pulse', strength: 0.5 }, // right of the path
    { type: 'glow', x: 50.1, y: 54.4, size: 3.5, color: '#5cecff', mode: 'pulse', strength: 0.4 }, // near the stairs
    { type: 'glow', x: 59.9, y: 70.6, size: 6.5, color: '#7af6ff', mode: 'pulse', strength: 0.5 }, // tall one on the right ledge
    { type: 'glow', x: 68.9, y: 58.2, size: 5, color: '#5cecff', mode: 'pulse', strength: 0.4 }, // far right ledge
    // candle flames
    { type: 'glow', x: 20.3, y: 78.1, size: 2.4, color: '#ffc27a', mode: 'fire', strength: 0.6 },
    { type: 'glow', x: 31.7, y: 67.4, size: 2, color: '#ffc27a', mode: 'fire', strength: 0.55 },
    { type: 'glow', x: 35.9, y: 64.3, size: 1.5, color: '#ffc27a', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 38, y: 62.4, size: 1.6, color: '#ffc27a', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 40.8, y: 59.7, size: 1.3, color: '#ffc27a', mode: 'fire', strength: 0.45 },
    { type: 'glow', x: 57.1, y: 48.4, size: 1.3, color: '#ffb070', mode: 'fire', strength: 0.45 }, // by the far stairs
    // warm lit block (lantern) in the lower right
    { type: 'glow', x: 67, y: 87, size: 7, color: '#ffb455', mode: 'fire', strength: 0.5 },
    // souls drifting up through the middle distance toward the portal
    { type: 'particles', kind: 'souls', region: [38, 34, 26, 32], count: 18 },
  ],
};
