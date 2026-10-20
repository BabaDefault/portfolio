import type { SceneFx } from '../sceneEffects';

// Cozy house at night (src/assets/scenes/quests.webp)
export const quests: SceneFx = {
  effects: [
    // stars twinkling in the sky (left sky, and the strip above the roof on the right)
    { type: 'glints', region: [1, 2, 50, 30], count: 17, spread: 0, color: '#ffffff', size: 2 },
    { type: 'glints', region: [53, 2, 45, 12], count: 8, spread: 0, color: '#ffffff', size: 2 },
    // soft halo around the square moon
    { type: 'glow', x: 79.5, y: 23, size: 16, color: '#fff4dc', mode: 'pulse', strength: 0.4 },
    // warm windows breathing slowly
    { type: 'glow', x: 45.2, y: 38.9, size: 7, color: '#ffb35a', mode: 'pulse', strength: 0.45, period: 6 }, // upstairs window
    { type: 'glow', x: 46, y: 57.6, size: 6, color: '#ffb35a', mode: 'pulse', strength: 0.4, period: 6.5 }, // ground floor window
    // porch lanterns flickering
    { type: 'glow', x: 34.9, y: 55.8, size: 3.5, color: '#ffc46a', mode: 'fire', strength: 0.6 }, // hanging off the porch post
    { type: 'glow', x: 46.6, y: 53.2, size: 3.5, color: '#ffc46a', mode: 'fire', strength: 0.6 }, // by the window
    { type: 'glow', x: 59.6, y: 54.5, size: 3, color: '#ffc46a', mode: 'fire', strength: 0.5 }, // on the stone wall
    { type: 'glow', x: 69, y: 46.3, size: 4, color: '#ffc46a', mode: 'fire', strength: 0.6 }, // above the notice board
    // moon and lantern light glinting on the pond under the dock
    { type: 'glints', region: [11, 81, 25, 7], count: 12, spread: 0, color: '#ffeccc', size: 2 },
    // fireflies over the wheat garden and meadow (left) and the flower beds by the path (right)
    { type: 'particles', kind: 'fireflies', region: [2, 56, 38, 24], count: 14 },
    { type: 'particles', kind: 'fireflies', region: [63, 58, 37, 24], count: 16 },
  ],
};
