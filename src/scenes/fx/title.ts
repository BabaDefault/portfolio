import type { SceneFx } from '../sceneEffects';

// Plains at golden hour (src/assets/scenes/title.webp)
export const title: SceneFx = {
  effects: [
    // haze along the horizon
    { type: 'fog', y: 42, height: 12, color: '#ffd9b0', strength: 0.22 },
    // god rays fanning down-right from the sun (sun centre measured at 559,450 of 2560x1434)
    { type: 'rays', x: 21.85, y: 31.4, angle: 38, spread: 55, length: 95, color: 'rgba(255, 228, 170, 0.55)', strength: 0.55 },
    // the sun breathing: faint, slow, translucent peach halo so it melts into the sun's own bloom
    { type: 'glow', x: 21.85, y: 31.4, size: 18, color: 'rgba(252, 222, 180, 0.45)', mode: 'pulse', strength: 0.3, period: 10 },
    // sparkle where the sun hits the river
    { type: 'glow', x: 23, y: 82, size: 9, color: '#ffd27a', mode: 'pulse', strength: 0.55 },
    // sunlight glinting along the river, upstream to downstream
    {
      type: 'glints',
      path: [[66, 60.5], [62, 62], [58, 66], [55, 70], [44, 75], [27.5, 80], [17, 83], [7, 87], [0, 91]],
      count: 34,
      spread: 1.2,
    },
    // pollen drifting through the sunlight and over the meadow
    { type: 'particles', kind: 'dust', region: [5, 20, 45, 45], count: 26 },
    { type: 'particles', kind: 'dust', region: [0, 50, 100, 45], count: 40 },
  ],
};
