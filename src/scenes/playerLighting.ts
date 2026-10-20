import type { ScreenId } from '../screens/registry';

/** A direction in world space, pointing from the player TOWARD the light (x right, y up, z toward the camera). */
export type Vec3 = [number, number, number];

/**
 * How the 3D player is lit on a screen, so it reads as part of the background image.
 * - sun: the key light (strongest, casts the lit side)
 * - rim: an edge light from the opposite side, usually from behind
 * - hemi: sky/ground bounce fill (keeps the shadow side coloured, never black)
 * - ambient: flat fill, kept low so faces keep real contrast
 * - exposure: ACES tone-mapping exposure
 * - grade: CSS filter on the canvas, to match the image's overall grade
 */
export type PlayerLighting = {
  sun: { dir: Vec3; color: string; intensity: number };
  rim: { dir: Vec3; color: string; intensity: number };
  hemi: { sky: string; ground: string; intensity: number };
  ambient: number;
  exposure: number;
  grade: { brightness: number; contrast: number; saturate: number };
};

/** Neutral soft studio light (used for the inventory portrait and any screen without an entry). */
export const defaultLighting: PlayerLighting = {
  sun: { dir: [0.45, 0.6, 0.75], color: '#fff6ea', intensity: 2.6 },
  rim: { dir: [-0.5, 0.4, -0.8], color: '#dfe8ff', intensity: 1.2 },
  hemi: { sky: '#ffffff', ground: '#b9b2a8', intensity: 1.2 },
  ambient: 0.5,
  exposure: 1,
  grade: { brightness: 1, contrast: 1, saturate: 1 },
};

export const playerLighting: Partial<Record<ScreenId, PlayerLighting>> = {
  title: {
    sun: { dir: [-0.8, 0.35, -0.5], color: '#ffa850', intensity: 4.2 },
    rim: { dir: [0.6, 0.6, 0.3], color: '#98a8f0', intensity: 0.5 },
    hemi: { sky: '#a898e0', ground: '#5a6a28', intensity: 0.45 },
    ambient: 0.05,
    exposure: 1.05,
    grade: { brightness: 1, contrast: 1.06, saturate: 1.05 },
  },
  profile: {
    sun: { dir: [-0.85, 0.1, 0.3], color: '#ff8030', intensity: 3.5 },
    rim: { dir: [0.8, 0.4, -0.5], color: '#7f9fe8', intensity: 3.5 },
    hemi: { sky: '#5f6f9e', ground: '#5a3a22', intensity: 0.4 },
    ambient: 0.05,
    exposure: 0.95,
    grade: { brightness: 1, contrast: 1.08, saturate: 1.05 },
  },
  skills: {
    sun: { dir: [0.5, 0.2, 0.6], color: '#ff8a4a', intensity: 3.0 },
    rim: { dir: [-0.5, 0.4, -0.7], color: '#ff5a3a', intensity: 1.5 },
    hemi: { sky: '#8a4a3a', ground: '#4a1a10', intensity: 0.5 },
    ambient: 0.08,
    exposure: 1.0,
    grade: { brightness: 1, contrast: 1.05, saturate: 1.05 },
  },
  projects: {
    sun: { dir: [-0.5, 0.4, 0.6], color: '#ffbf6a', intensity: 3.0 },
    rim: { dir: [0.6, 0.5, -0.6], color: '#8aa0c0', intensity: 1.0 },
    hemi: { sky: '#8a7a6a', ground: '#3a2a1e', intensity: 0.5 },
    ambient: 0.08,
    exposure: 1.0,
    grade: { brightness: 1, contrast: 1.05, saturate: 1 },
  },
  journey: {
    sun: { dir: [-0.3, 0.6, -0.75], color: '#ffac68', intensity: 5.0 },
    rim: { dir: [0.7, 0.3, 0.4], color: '#7d9ad8', intensity: 0.5 },
    hemi: { sky: '#7090d0', ground: '#c0582a', intensity: 0.55 },
    ambient: 0.05,
    exposure: 1.0,
    grade: { brightness: 1, contrast: 1.08, saturate: 1.08 },
  },
  advancements: {
    sun: { dir: [0.6, -0.25, 0.6], color: '#30e0e8', intensity: 1.3 },
    rim: { dir: [0.75, 0.4, -0.55], color: '#a0e8ff', intensity: 2.4 },
    hemi: { sky: '#26485a', ground: '#082830', intensity: 0.35 },
    ambient: 0.03,
    exposure: 0.72,
    grade: { brightness: 0.95, contrast: 1.1, saturate: 0.9 },
  },
  quests: {
    sun: { dir: [0.3, 0.55, 0.78], color: '#ff9440', intensity: 3.0 },
    rim: { dir: [0.35, 0.7, -0.65], color: '#a0b8ff', intensity: 1.8 },
    hemi: { sky: '#34447a', ground: '#6a3a1a', intensity: 0.5 },
    ambient: 0.05,
    exposure: 0.95,
    grade: { brightness: 1, contrast: 1.08, saturate: 1.05 },
  },
  contact: {
    sun: { dir: [-0.8, 0.55, -0.1], color: '#b8fff0', intensity: 2.7 },
    rim: { dir: [0.85, 0.15, 0.35], color: '#ffa038', intensity: 2.0 },
    hemi: { sky: '#6aa898', ground: '#1e4a40', intensity: 0.35 },
    ambient: 0.04,
    exposure: 1.0,
    grade: { brightness: 1, contrast: 1.06, saturate: 1.05 },
  },
  end: {
    sun: { dir: [0.85, 0.25, 0.2], color: '#ff9a50', intensity: 3.4 },
    rim: { dir: [-0.75, 0.55, -0.1], color: '#e070e8', intensity: 1.5 },
    hemi: { sky: '#7a5ac0', ground: '#4a2e4a', intensity: 0.5 },
    ambient: 0.05,
    exposure: 1.0,
    grade: { brightness: 1, contrast: 1.06, saturate: 1.08 },
  },
};
