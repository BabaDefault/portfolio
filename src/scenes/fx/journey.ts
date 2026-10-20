import type { SceneFx } from '../sceneEffects';

// Badlands overlook at sunset (src/assets/scenes/journey.webp)
export const journey: SceneFx = {
  effects: [
    // heat haze shimmering along the far horizon
    { type: 'fog', y: 38, height: 8, color: '#ffc98f', strength: 0.16 },
    // soft rays fanning down-left from the square sun over the canyon
    { type: 'rays', x: 71.3, y: 26, angle: -35, spread: 50, length: 75, color: 'rgba(255, 214, 150, 0.5)', strength: 0.4 },
    // the square sun breathing
    { type: 'glow', x: 71.3, y: 26, size: 18, color: '#fff0c0', mode: 'pulse', strength: 0.55 },
    // sunlight glinting along the canyon river, upstream bend to the bottom edge
    {
      type: 'glints',
      path: [[38.8, 67.4], [40.9, 67.8], [41.2, 71.2], [41, 74.3], [41.2, 76.7], [39.5, 79.8], [37.4, 81.6], [36.7, 85.3], [35.7, 89], [34.7, 93.3], [34.2, 97.5]],
      count: 22,
      spread: 0.5,
      color: '#ffe2b0',
    },
    // sand blowing off the right-hand mesa top (edge at ~60% x, top surface 43–55% y)
    { type: 'particles', kind: 'dust', region: [59, 42, 41, 13], count: 20, colors: ['#f2c48a', '#e8a868', '#d98c4a'] },
  ],
};
