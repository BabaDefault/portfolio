import type { SceneFx } from '../sceneEffects';

// Mineshaft tunnel with an open chest by the ore wall (src/assets/scenes/projects.webp)
export const projects: SceneFx = {
  effects: [
    // hanging lantern swaying on its chain, warm light
    { type: 'glow', x: 75.5, y: 22.5, size: 14, color: '#ffc46a', mode: 'sway', strength: 0.5 },
    // wall torches down the tunnel
    { type: 'glow', x: 31.4, y: 50.5, size: 3.5, color: '#ffb04a', mode: 'fire', strength: 0.55 },
    { type: 'glow', x: 39.7, y: 46.3, size: 3.5, color: '#ffb04a', mode: 'fire', strength: 0.55 },
    // amethyst geode in the ceiling, top left
    { type: 'glow', x: 27.5, y: 9, size: 16, color: '#b89cff', mode: 'pulse', strength: 0.45, period: 4.5 },
    { type: 'glints', region: [23, 1, 10, 18], count: 8, color: '#efe4ff', size: 2 },
    // emerald ore twinkling on the wall
    { type: 'glints', region: [79, 14, 18, 24], count: 9, color: '#9bffc4', size: 2 },
    { type: 'glints', region: [91, 44, 7, 36], count: 5, color: '#9bffc4', size: 2 },
    // gold ingot and diamond glinting inside the chest, faint warm glow
    { type: 'glow', x: 75.5, y: 65.5, size: 10, color: '#ffcf6a', mode: 'pulse', strength: 0.35, period: 4 },
    { type: 'glints', region: [72, 62, 3.5, 3], count: 3, color: '#fff2a8', size: 2 },
    { type: 'glints', region: [78.6, 65.5, 2, 2], count: 2, color: '#c8f4ff', size: 2 },
    // dust floating in the lantern light
    { type: 'particles', kind: 'dust', region: [62, 14, 30, 36], count: 16 },
    // faint haze drifting deep in the tunnel
    { type: 'fog', y: 42, height: 14, x: 28, width: 20, color: '#ffd9a8', strength: 0.18 },
  ],
};
