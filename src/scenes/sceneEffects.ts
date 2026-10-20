import type { ScreenId } from '../screens/registry';

/**
 * Animation layers drawn ON TOP of a screen's background image, positioned in
 * IMAGE coordinates: x and y are percentages (0–100) of the image's width and height,
 * so effects stay attached to the right spot however the image is cropped.
 *
 * Find coordinates: open the site with ?fx in the URL (e.g. localhost:5173/?fx#title).
 * Clicking on the background then shows and copies the x/y % of that point.
 *
 * These only apply when the screen has an image in src/assets/scenes/.
 * Screens without an entry here get the generic ambient particles for their biome.
 */
export type Effect =
  /** Soft light that flickers (fire, torches) or pulses (crystals, sculk, glowstone). */
  | { type: 'glow'; x: number; y: number; size: number; color: string; mode?: 'fire' | 'pulse' | 'steady' | 'sway'; strength?: number; /** seconds per cycle (default 3.2 pulse, 1.6 fire) */ period?: number }
  /** Rising smoke puffs, e.g. from a campfire or chimney. */
  | { type: 'smoke'; x: number; y: number; width?: number; height?: number; color?: string }
  /** God rays fanning down from a light source. angle in degrees (0 = straight down, positive = toward the right). */
  | { type: 'rays'; x: number; y: number; angle?: number; spread?: number; length?: number; color?: string; strength?: number }
  /** Particles confined to a region (x, y, w, h in %). */
  | {
      type: 'particles';
      kind: 'fireflies' | 'embers' | 'petals' | 'snow' | 'dust' | 'spores' | 'sparkles' | 'souls' | 'leaves';
      region?: [number, number, number, number];
      count?: number;
      /** override the kind's default palette, e.g. warm sand tones for dust */
      colors?: string[];
    }
  /** Water surface shimmer in a region (best for wide, straight water; it spills onto land around curves). */
  | { type: 'shimmer'; region: [number, number, number, number]; color?: string }
  /** Twinkling pixel sparkles: along a `path` of [x, y] points (a winding river) OR scattered in a `region` (ore faces, stars). */
  | { type: 'glints'; path?: [number, number][]; region?: [number, number, number, number]; count?: number; spread?: number; color?: string; size?: number }
  /** Small square bubbles rising from a point (potions, cauldrons, water). */
  | { type: 'bubbles'; x: number; y: number; width?: number; height?: number; color?: string; count?: number }
  /** Downward flowing streaks in a region: lavafalls, waterfalls. */
  | { type: 'flow'; region: [number, number, number, number]; color?: string; speed?: number }
  /** Moving light ripples (caustics) on a pool's surface or the floor under water. */
  | { type: 'caustics'; region: [number, number, number, number]; color?: string; strength?: number }
  /** A horizontal fog band that drifts slowly. */
  | { type: 'fog'; y: number; height: number; /** limit to a horizontal span (default: full width) */ x?: number; width?: number; color?: string; strength?: number };

export type SceneFx = {
  effects: Effect[];
};

// Each screen's effects live in their own file in ./fx/ (one owner per file).
import { title } from './fx/title';
import { profile } from './fx/profile';
import { skills } from './fx/skills';
import { projects } from './fx/projects';
import { journey } from './fx/journey';
import { advancements } from './fx/advancements';
import { quests } from './fx/quests';
import { contact } from './fx/contact';
import { end } from './fx/end';

export const sceneEffects: Partial<Record<ScreenId, SceneFx>> = {
  title,
  profile,
  skills,
  projects,
  journey,
  advancements,
  quests,
  contact,
  end,
};
