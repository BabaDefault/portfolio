import type { SceneFx } from '../sceneEffects';

// Mine entrance with open chest and ore blocks (src/assets/scenes/projects.webp)
export const projects: SceneFx = {
  effects: [
    // amethyst geode in the ravine wall, top left
    { type: 'glow', x: 29.3, y: 19, size: 15, color: '#b46bff', mode: 'pulse', strength: 0.45 },
    { type: 'particles', kind: 'sparkles', region: [24, 11, 11, 16], count: 8 },
    // torches and lanterns along the bridge and walkways
    { type: 'glow', x: 23.7, y: 21.1, size: 3, color: '#ffa040', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 29.7, y: 30.5, size: 3.5, color: '#ffa040', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 39.1, y: 33.7, size: 3, color: '#ffa040', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 47.2, y: 14, size: 3, color: '#ffa040', mode: 'fire', strength: 0.45 },
    { type: 'glow', x: 20.4, y: 42.9, size: 3.5, color: '#ffa040', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 29.8, y: 43.8, size: 3.5, color: '#ffa040', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 30.8, y: 47.8, size: 3, color: '#ffa040', mode: 'fire', strength: 0.45 },
    { type: 'glow', x: 46, y: 43.5, size: 3, color: '#ffa040', mode: 'fire', strength: 0.5 },
    { type: 'glow', x: 49.4, y: 51.5, size: 3, color: '#ffa040', mode: 'fire', strength: 0.45 },
    // hanging lantern swinging gently on its chain
    { type: 'glow', x: 62.8, y: 26.2, size: 12, color: '#ffc070', mode: 'sway', strength: 0.5 },
    // dust floating in the lantern light
    { type: 'particles', kind: 'dust', region: [56, 18, 14, 24], count: 14 },
    // warm light inside the open chest
    { type: 'glow', x: 72.5, y: 56, size: 12, color: '#ffb050', mode: 'pulse', strength: 0.35 },
    // diamond ore: front face, then right side face
    { type: 'glints', region: [52.5, 72, 9.5, 13], count: 5, spread: 0.3, color: '#b8fff6' },
    { type: 'glints', region: [63, 71, 6, 9], count: 3, spread: 0.3, color: '#b8fff6' },
    // emerald ore, front face below the diamond block
    { type: 'glints', region: [57.5, 85, 6, 13], count: 5, spread: 0.3, color: '#7dff9a' },
    // gold ore: top face, then front and side faces
    { type: 'glints', region: [68.5, 76, 9, 5.5], count: 3, spread: 0.3, color: '#ffe27a' },
    { type: 'glints', region: [65.5, 84, 14, 14], count: 5, spread: 0.3, color: '#ffe27a' },
    // redstone ore, bottom left of the ore pile
    { type: 'glints', region: [46, 85, 9.5, 14], count: 6, spread: 0.3, color: '#ff5a4a' },
  ],
};
