import type { SceneFx } from '../sceneEffects';

// Brewing stand in a lava-lit cavern (src/assets/scenes/skills.webp)
export const skills: SceneFx = {
  effects: [
    // lavafalls pouring down from the ceiling (left, middle, far right)
    { type: 'flow', region: [33.8, 16, 2.8, 26], color: 'rgba(255, 170, 70, 0.5)', speed: 0.8 },
    { type: 'flow', region: [42.8, 18, 2.6, 30], color: 'rgba(255, 170, 70, 0.5)', speed: 0.8 },
    { type: 'flow', region: [59, 26, 1.8, 26], color: 'rgba(255, 170, 70, 0.45)', speed: 0.8 },
    // hanging glowstone blocks
    { type: 'glow', x: 18, y: 5.2, size: 11, color: '#ffd27a', mode: 'pulse', strength: 0.4 },
    { type: 'glow', x: 31.7, y: 3.7, size: 8, color: '#ffd27a', mode: 'pulse', strength: 0.4 },
    { type: 'glow', x: 42.5, y: 6.7, size: 11, color: '#ffd27a', mode: 'fire', strength: 0.4 },
    { type: 'glow', x: 50.1, y: 6.1, size: 8, color: '#ffd27a', mode: 'pulse', strength: 0.35 },
    { type: 'glow', x: 41.1, y: 20.2, size: 7, color: '#ffd27a', mode: 'fire', strength: 0.4 },
    // small lanterns hanging under the glowstone
    { type: 'glow', x: 41.7, y: 24.5, size: 2.5, color: '#ffb050', mode: 'fire', strength: 0.55 },
    { type: 'glow', x: 48.7, y: 15, size: 2.5, color: '#ffb050', mode: 'fire', strength: 0.5 },
    // wall lanterns on the stone building, top left
    { type: 'glow', x: 7.6, y: 20.1, size: 3.5, color: '#ffb050', mode: 'fire', strength: 0.55 },
    { type: 'glow', x: 0.8, y: 21.6, size: 3, color: '#ffb050', mode: 'fire', strength: 0.5 },
    // furnace / fireplace glow, bottom left
    { type: 'glow', x: 1.7, y: 57.6, size: 6, color: '#ff9a3c', mode: 'fire', strength: 0.45 },
    // red potion
    { type: 'glow', x: 18.3, y: 71.5, size: 6, color: '#ff4a3a', mode: 'pulse', strength: 0.5 },
    { type: 'bubbles', x: 18.3, y: 74, width: 2, height: 6, color: 'rgba(255, 170, 160, 0.85)', count: 5 },
    // purple potion
    { type: 'glow', x: 23.6, y: 70, size: 6, color: '#c84bff', mode: 'pulse', strength: 0.5 },
    { type: 'bubbles', x: 23.6, y: 72.5, width: 2, height: 6, color: 'rgba(235, 180, 255, 0.85)', count: 5 },
    // blue potion
    { type: 'glow', x: 27.9, y: 69.1, size: 6, color: '#45e0ff', mode: 'pulse', strength: 0.5 },
    { type: 'bubbles', x: 27.9, y: 71, width: 2, height: 6, color: 'rgba(180, 245, 255, 0.85)', count: 5 },
    // embers drifting up from the lava
    { type: 'particles', kind: 'embers', region: [28, 12, 34, 50], count: 18 },
  ],
};
