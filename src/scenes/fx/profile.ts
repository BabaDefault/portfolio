import type { SceneFx } from '../sceneEffects';

// Campfire at dusk by a spruce forest and river (src/assets/scenes/profile.webp)
export const profile: SceneFx = {
  effects: [
    // blue mist drifting between the trees behind the clearing
    { type: 'fog', y: 39, height: 10, x: 30, width: 24, color: '#a9c2e8', strength: 0.2 },
    // the square sun breathing behind the spruces
    { type: 'glow', x: 15.1, y: 23.9, size: 16, color: '#ffe9c0', mode: 'pulse', strength: 0.5 },
    // sunset light glinting along the river, upstream to downstream
    {
      type: 'glints',
      path: [[44, 59.4], [39.5, 62.5], [34.3, 66.5], [29.2, 69.2], [24, 71.7], [18.9, 73.8], [13.7, 76], [8.6, 77.8], [3.4, 79.3], [0, 80.3]],
      count: 22,
      spread: 1.4,
      color: '#ffe2b8',
    },
    // firelight spilling onto the dirt clearing around the campfire
    { type: 'glow', x: 63.8, y: 59, size: 20, color: '#ff8a30', mode: 'fire', strength: 0.14 },
    // the campfire flames flickering
    { type: 'glow', x: 63.9, y: 56, size: 8, color: '#ffa040', mode: 'fire', strength: 0.3 },
    // smoke rising from the top of the flames
    { type: 'smoke', x: 63.9, y: 52.5, width: 3, height: 34, color: 'rgba(120, 114, 118, 0.55)' },
    // embers drifting up from the fire
    { type: 'particles', kind: 'embers', region: [61.5, 38, 4, 16], count: 10 },
    // fireflies over the meadow and clearing
    { type: 'particles', kind: 'fireflies', region: [42, 43, 58, 42], count: 20 },
  ],
};
