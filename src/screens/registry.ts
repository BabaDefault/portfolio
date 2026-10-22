import type { ComponentType } from 'react';
import type { BiomeId } from '../scenes/types';
import type { PixelArt } from '../ui/PixelIcon';
import type { IconName } from '../ui/ItemIcon';
import type { Pose } from '../scenes/Player3D';
import TitleScreen from './TitleScreen';
import ProfileScreen from './ProfileScreen';
import SkillsScreen from './SkillsScreen';
import ProjectsScreen from './ProjectsScreen';
import JourneyScreen from './JourneyScreen';
import AdvancementsScreen from './AdvancementsScreen';
import QuestsScreen from './QuestsScreen';
import ContactScreen from './ContactScreen';
import EndScreen from './EndScreen';

export type ScreenId =
  | 'title'
  | 'profile'
  | 'skills'
  | 'projects'
  | 'journey'
  | 'advancements'
  | 'quests'
  | 'contact'
  | 'end';

/** A hotbar icon: either code-drawn pixel art or one of the PNG icons in src/assets/icons. */
export type ScreenIcon = { art: PixelArt } | { name: IconName };

export type ScreenDef = {
  id: ScreenId;
  label: string; // hotbar tooltip + document title
  biome: BiomeId;
  icon: ScreenIcon;
  /** Where the screen's panel sits. The App wraps the component in a layer with this placement. */
  placement: 'left' | 'right' | 'center';
  /** Where the player figure stands in the scene (null = hidden). */
  player: 'left' | 'right' | 'center' | null;
  /** The 3D player's pose on this screen: idle | wave | walk | laptop (seated on a log, typing) | crossed | think | point | cheer | sit | peek | lantern */
  pose: Pose;
  /** Stand with your back to the camera, overlooking the scene. */
  faceAway?: boolean;
  /** Ignore the cursor: body stays angled toward the scene, head turns to look at the viewer. */
  faceViewer?: boolean;
  /** Minecraft-style speech bubble over the player. */
  speech?: string;
  /** Optional desktop fine-tuning (any CSS length), e.g. to line up with a background image. */
  layout?: { panelInset?: string; playerInset?: string; playerBottom?: string; playerHeight?: number; panelY?: 'top' | 'center' | 'bottom'; /** hide the bottom N% of the player, e.g. behind a counter */ playerClip?: number };
  /**
   * Pin the player to the background IMAGE (not the screen), so they stay on the same spot at any
   * window size: x/feetY are % of the image, height is a fraction of the displayed image height,
   * clipY (optional, % of the image) hides everything below that line, e.g. behind a counter.
   * Only used when the screen has an image backdrop; otherwise `layout` applies.
   */
  anchor?: { x: number; feetY: number; height: number; clipY?: number };
  /** Darken the background behind a centred panel so text stays readable over a busy image. */
  scrim?: boolean;
  /** When an image/video background is used: the HUD biome label, and which biome's particles + player lighting fit it. */
  backdrop?: { name: string; hudColor?: string; mood: BiomeId };
  Component: ComponentType;
};

export const screens: ScreenDef[] = [
  { id: 'title', pose: 'wave', faceViewer: true, speech: 'Welcome to my Portfolio!', label: 'Title Screen', biome: 'ocean', icon: { name: 'hero' }, placement: 'center', player: 'right', layout: { playerInset: '9vw', playerBottom: '7vh' }, backdrop: { name: 'Sunflower Plains', hudColor: '#ffff55', mood: 'ocean' }, Component: TitleScreen },
  { id: 'profile', pose: 'laptop', label: 'Player Profile', biome: 'cherry', icon: { name: 'about' }, placement: 'left', player: 'left', layout: { playerInset: '42vw', playerBottom: '29vh', playerHeight: 300 }, backdrop: { name: 'Old Growth Taiga', hudColor: '#ffaa00', mood: 'village' }, Component: ProfileScreen },
  { id: 'skills', pose: 'read', label: 'Brewing — Skills', biome: 'nether', icon: { name: 'skills' }, placement: 'right', player: 'left', anchor: { x: 47.4, feetY: 68.8, height: 0.3, clipY: 62.7 }, backdrop: { name: 'Nether Fortress', hudColor: '#ff5555', mood: 'nether' }, Component: SkillsScreen },
  { id: 'projects', pose: 'peek', label: 'Select World — Projects', biome: 'mineshaft', icon: { name: 'projects' }, placement: 'left', player: 'right', layout: { panelY: 'bottom', playerInset: '5vw', playerBottom: '17.5vh' }, backdrop: { name: 'Mineshaft Ravine', hudColor: '#ff55ff', mood: 'mineshaft' }, Component: ProjectsScreen },
  { id: 'journey', pose: 'sit', faceAway: true, label: 'Treasure Map — Journey', biome: 'cherry', icon: { name: 'experience' }, placement: 'left', player: 'right', layout: { playerInset: '-1.9vw', playerBottom: '11.3vh' }, backdrop: { name: 'Cherry Grove', hudColor: '#ff9ad5', mood: 'cherry' }, Component: JourneyScreen },
  { id: 'advancements', pose: 'lantern', faceAway: true, label: 'Advancements', biome: 'deepdark', icon: { name: 'achievements' }, placement: 'right', player: 'left', layout: { playerInset: '11.5vw', playerBottom: '13.8vh', playerHeight: 340 }, backdrop: { name: 'Deep Dark', hudColor: '#55ffff', mood: 'deepdark' }, Component: AdvancementsScreen },
  { id: 'quests', pose: 'point', label: 'Quest Board', biome: 'village', icon: { name: 'craft-books' }, placement: 'left', player: 'right', layout: { playerInset: '7vw', playerBottom: '10vh' }, backdrop: { name: 'Home', hudColor: '#55ff55', mood: 'village' }, Component: QuestsScreen },
  { id: 'contact', pose: 'wave', label: 'Chat — Contact', biome: 'lush', icon: { name: 'contact' }, placement: 'left', player: 'right', layout: { playerInset: '1vw', playerBottom: '5.5vh' }, backdrop: { name: 'Lush Caves', hudColor: '#55ff55', mood: 'lush' }, Component: ContactScreen },
  { id: 'end', pose: 'cheer', label: 'The End', biome: 'end', icon: { name: 'outro' }, placement: 'center', player: 'right', layout: { playerInset: '6vw', playerBottom: '13.5vh' }, scrim: true, backdrop: { name: 'The End', hudColor: '#ff55ff', mood: 'end' }, Component: EndScreen },
];

export const screenIndex = (id: ScreenId) => screens.findIndex((s) => s.id === id);
export const isScreenId = (v: string): v is ScreenId => screens.some((s) => s.id === v);
