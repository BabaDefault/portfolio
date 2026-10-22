import type { SceneFx } from '../sceneEffects';

// Deep Dark cave looking through a huge portal frame at an aurora night sky over snowy peaks
// (src/assets/scenes/advancements.webp). The portal opening spans roughly x 10–54.5%, y 8–59%
// (its top edge slopes down to the right); the player stands on the dark block bottom-left
// (x 0–47%, y 71–100%), so nothing is placed on it.
export const advancements: SceneFx = {
  effects: [
    // ---- portal: aurora curtains swaying and breathing in green, teal, pink and violet ----
    { type: 'glow', x: 17.5, y: 18, size: 13.2, color: '#6dffbe', mode: 'sway', strength: 0.59, period: 7.5 }, // left green curtain
    { type: 'glow', x: 20, y: 32, size: 10.8, color: '#58f0ff', mode: 'pulse', strength: 0.48, period: 9.4 }, // teal under the left curtain
    { type: 'glow', x: 23, y: 25, size: 12, color: '#8affd6', mode: 'pulse', strength: 0.56, period: 6.4 }, // centre-left curtain
    { type: 'glow', x: 30, y: 37, size: 14.4, color: '#ff8fd2', mode: 'pulse', strength: 0.56, period: 8.2 }, // big pink fold
    { type: 'glow', x: 33, y: 22, size: 10.8, color: '#b88cff', mode: 'sway', strength: 0.45, period: 10.5 }, // violet crown above the fold
    { type: 'glow', x: 37, y: 29, size: 12, color: '#6dffbe', mode: 'sway', strength: 0.53, period: 9 }, // right green curtain
    { type: 'glow', x: 44, y: 33, size: 9.6, color: '#c79bff', mode: 'pulse', strength: 0.42, period: 11 }, // violet haze
    { type: 'glow', x: 49, y: 38, size: 10.8, color: '#ff9fdc', mode: 'pulse', strength: 0.5, period: 7.8 }, // far-right pink wisps
    // aurora sheen washing over the whole opening, slowly shifting between green and pink
    { type: 'glow', x: 30, y: 30, size: 30, color: '#7dffd0', mode: 'sway', strength: 0.14, period: 14 },
    { type: 'glow', x: 38, y: 34, size: 26, color: '#ff9fe0', mode: 'pulse', strength: 0.12, period: 17 },
    // aurora light spilling through the portal onto the floor in front of it
    { type: 'glow', x: 22, y: 64, size: 16, color: '#5dffc0', mode: 'pulse', strength: 0.26, period: 9 },
    { type: 'glow', x: 40, y: 64, size: 14, color: '#ff8fd2', mode: 'pulse', strength: 0.21, period: 11.5 },
    // stars twinkling in the portal sky
    { type: 'glints', region: [15, 19, 20, 11], count: 7, color: '#ffffff', size: 2 },
    { type: 'glints', region: [40, 31, 13, 7], count: 3, color: '#ffffff', size: 2 },
    // snow catching the aurora on the peaks
    { type: 'glints', region: [38, 44, 9, 12], count: 5, color: '#e8fbff', size: 2 },
    { type: 'glints', region: [16, 49, 14, 7], count: 4, color: '#e8fbff', size: 2 },
    // faint light along the inner edge of the portal frame (left side and sloping top)
    { type: 'glints', path: [[13.6, 9], [12, 30], [10.4, 50]], count: 5, spread: 0.3, color: '#9feeff' },
    { type: 'glints', path: [[15, 9], [34, 19], [54, 29]], count: 6, spread: 0.3, color: '#9feeff' },

    // ---- sculk floor ----
    // low cyan mist over the floor behind the player's block and across the right
    { type: 'fog', y: 60, height: 10, x: 0, width: 46, color: '#4fd6e0', strength: 0.1 },
    { type: 'fog', y: 62, height: 16, x: 44, width: 56, color: '#4fd6e0', strength: 0.12 },
    // glowing sculk blocks (sizes/periods varied so they don't pulse as one)
    { type: 'glow', x: 8.3, y: 67.5, size: 4.5, color: '#6ff4ff', mode: 'pulse', strength: 0.5, period: 3.4 }, // big block, left
    { type: 'glow', x: 11.6, y: 64.8, size: 3, color: '#5cecff', mode: 'pulse', strength: 0.42, period: 4.1 }, // small blocks behind it
    { type: 'glow', x: 38.7, y: 68.3, size: 3.2, color: '#6ff4ff', mode: 'pulse', strength: 0.45, period: 3.8 }, // pair in the middle
    { type: 'glow', x: 43.2, y: 68.2, size: 3.2, color: '#5cecff', mode: 'pulse', strength: 0.45, period: 4.5 },
    // pools of cyan light on the floor
    { type: 'glow', x: 57.3, y: 68.5, size: 4, color: '#6ff4ff', mode: 'pulse', strength: 0.32, period: 5.2 },
    { type: 'glow', x: 61, y: 74.7, size: 6, color: '#7af6ff', mode: 'pulse', strength: 0.35, period: 4.6 },
    { type: 'glow', x: 95.3, y: 86.5, size: 7, color: '#7af6ff', mode: 'pulse', strength: 0.38, period: 5.6 }, // bright slab, lower right
    // sculk speckles twinkling (right floor, the strip behind the block, and the sliver right of it)
    { type: 'glints', region: [48, 72, 22, 26], count: 14, color: '#8ff6ff', size: 2 },
    { type: 'glints', region: [70, 70, 28, 28], count: 12, color: '#8ff6ff', size: 2 },
    { type: 'glints', region: [14, 62, 30, 7], count: 6, color: '#8ff6ff', size: 2 },
    // sculk souls drifting up off the floor (right side, and in front of the portal on the left)
    { type: 'particles', kind: 'souls', region: [50, 55, 46, 35], count: 14 },
    { type: 'particles', kind: 'souls', region: [12, 42, 32, 22], count: 7 },

    // ---- cave interior / pillars ----
    // candle fire on the far-right ledge, with a few embers
    { type: 'glow', x: 96.9, y: 62.4, size: 3.2, color: '#ffb455', mode: 'fire', strength: 0.65 },
    { type: 'particles', kind: 'embers', region: [95.6, 52, 2.6, 10], count: 4 },
    // warm light glimmering deep in the cave on the right
    { type: 'glow', x: 67.4, y: 57, size: 8, color: '#ff9a50', mode: 'fire', strength: 0.22, period: 2.6 },
    // frost glinting on the stacked deepslate pillars (right and left)
    { type: 'glints', region: [86, 18, 13, 26], count: 5, color: '#c8f8ff', size: 2 },
    { type: 'glints', region: [0, 32, 9, 14], count: 4, color: '#c8f8ff', size: 2 },
  ],
};
