import type { SceneFx } from '../sceneEffects';

// Alchemist's brewing kitchen in a nether fortress (src/assets/scenes/skills.webp)
export const skills: SceneFx = {
  effects: [
    // the two lavafalls pouring through the arch
    { type: 'flow', region: [38.4, 15, 2.6, 29], color: 'rgba(255, 210, 120, 0.22)', speed: 0.9 },
    { type: 'flow', region: [49.6, 17, 2.2, 24], color: 'rgba(255, 210, 120, 0.22)', speed: 1.1 },
    // warm glow breathing around the arch
    { type: 'glow', x: 45, y: 29, size: 26, color: '#ff8a2a', mode: 'pulse', strength: 0.35, period: 4.5 },
    // embers rising around the lavafalls
    { type: 'particles', kind: 'embers', region: [33, 8, 22, 38], count: 24 },
    // hanging glowstone flickering softly
    { type: 'glow', x: 28.7, y: 12.5, size: 11, color: '#ffd27a', mode: 'pulse', strength: 0.4, period: 3.6 },
    { type: 'glow', x: 13, y: 1.5, size: 11, color: '#ffd27a', mode: 'pulse', strength: 0.35, period: 4.2 },
    { type: 'glow', x: 37.5, y: 0.5, size: 9, color: '#ffd27a', mode: 'pulse', strength: 0.35, period: 3.9 },
    // the three potions glowing in their own colours, with bubbles rising
    { type: 'glow', x: 16.5, y: 74.5, size: 6, color: '#ff4a4a', mode: 'pulse', strength: 0.5 },
    { type: 'glow', x: 21.1, y: 73.3, size: 6, color: '#c45cff', mode: 'pulse', strength: 0.5 },
    { type: 'glow', x: 25.1, y: 71.4, size: 6, color: '#4ad8ff', mode: 'pulse', strength: 0.5 },
    { type: 'bubbles', x: 16.5, y: 76, width: 2, height: 9, color: 'rgba(255, 170, 170, 0.85)', count: 5 },
    { type: 'bubbles', x: 21.1, y: 75, width: 2, height: 9, color: 'rgba(230, 170, 255, 0.85)', count: 5 },
    { type: 'bubbles', x: 25.1, y: 73.2, width: 2, height: 9, color: 'rgba(170, 235, 255, 0.85)', count: 5 },
    // cauldron water: light ripples and a few bubbles
    { type: 'caustics', region: [36, 59.6, 8.6, 2.6], color: 'rgba(190, 230, 255, 0.6)', strength: 0.6 },
    { type: 'bubbles', x: 40.3, y: 61, width: 5, height: 6, color: 'rgba(200, 235, 255, 0.8)', count: 4 },
    // furnace / smoker fire flickering
    { type: 'glow', x: 56.1, y: 58, size: 7, color: '#ff9a3a', mode: 'fire', strength: 0.55 },
    { type: 'glow', x: 59.1, y: 57.6, size: 4, color: '#ff9a3a', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 51.3, y: 58, size: 3, color: '#ff9a3a', mode: 'fire', strength: 0.45 },
    // fire block glowing at the far left of the shelves
    { type: 'glow', x: 1, y: 59, size: 6, color: '#ffb04a', mode: 'fire', strength: 0.45 },
    // candles down the corridor on the right (partly behind the panel)
    { type: 'glow', x: 68.7, y: 47, size: 2.5, color: '#ffc06a', mode: 'fire', strength: 0.55 },
    { type: 'glow', x: 70.3, y: 47.5, size: 2.5, color: '#ffc06a', mode: 'fire', strength: 0.55 },
    { type: 'glow', x: 86, y: 48, size: 2.5, color: '#ffc06a', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 88.7, y: 47, size: 2.5, color: '#ffc06a', mode: 'fire', strength: 0.5 },
    // bottles twinkling on the shelves
    { type: 'glints', region: [0, 22, 28, 27], count: 10, color: '#ffd9a8', size: 2 },
  ],
};
