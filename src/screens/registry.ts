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
  /** The 3D player's pose on this screen: idle | wave | walk | laptop | crossed | think | point | cheer */
  pose: Pose;
  /** Stand with your back to the camera, overlooking the scene. */
  faceAway?: boolean;
  /** Optional desktop fine-tuning (any CSS length), e.g. to line up with a background image. */
  layout?: { panelInset?: string; playerInset?: string; playerBottom?: string; panelY?: 'top' | 'center' | 'bottom' };
  /** Darken the background behind a centred panel so text stays readable over a busy image. */
  scrim?: boolean;
  /** When an image/video background is used: the HUD biome label, and which biome's particles + player lighting fit it. */
  backdrop?: { name: string; hudColor?: string; mood: BiomeId };
  Component: ComponentType;
};

export const screens: ScreenDef[] = [
  { id: 'title', pose: 'wave', label: 'Title Screen', biome: 'ocean', icon: { name: 'hero' }, placement: 'right', player: 'left', layout: { panelInset: '6vw', playerInset: '14vw', playerBottom: '11vh' }, backdrop: { name: 'Sunflower Plains', hudColor: '#ffff55', mood: 'ocean' }, Component: TitleScreen },
  { id: 'profile', pose: 'laptop', label: 'Player Profile', biome: 'cherry', icon: { name: 'about' }, placement: 'left', player: 'right', layout: { playerInset: '12vw', playerBottom: '13vh' }, backdrop: { name: 'Old Growth Taiga', hudColor: '#ffaa00', mood: 'village' }, Component: ProfileScreen },
  { id: 'skills', pose: 'think', label: 'Brewing — Skills', biome: 'nether', icon: { name: 'skills' }, placement: 'right', player: null, backdrop: { name: 'Nether Fortress', hudColor: '#ff5555', mood: 'nether' }, Component: SkillsScreen },
  { id: 'projects', pose: 'point', label: 'Select World — Projects', biome: 'mineshaft', icon: { name: 'projects' }, placement: 'left', player: null, layout: { panelY: 'bottom' }, backdrop: { name: 'Mineshaft Ravine', hudColor: '#ff55ff', mood: 'mineshaft' }, Component: ProjectsScreen },
  { id: 'journey', pose: 'idle', faceAway: true, label: 'Treasure Map — Journey', biome: 'desert', icon: { name: 'experience' }, placement: 'center', player: 'right', layout: { playerInset: '3vw', playerBottom: '15vh' }, backdrop: { name: 'Badlands', hudColor: '#ffaa00', mood: 'desert' }, Component: JourneyScreen },
  { id: 'advancements', pose: 'idle', faceAway: true, label: 'Advancements', biome: 'deepdark', icon: { name: 'achievements' }, placement: 'right', player: 'left', layout: { playerInset: '6vw', playerBottom: '16vh' }, backdrop: { name: 'Deep Dark', hudColor: '#55ffff', mood: 'deepdark' }, Component: AdvancementsScreen },
  { id: 'quests', pose: 'point', label: 'Quest Board', biome: 'village', icon: { name: 'craft-books' }, placement: 'left', player: 'right', layout: { playerInset: '30vw', playerBottom: '12vh' }, backdrop: { name: 'Home', hudColor: '#55ff55', mood: 'village' }, Component: QuestsScreen },
  { id: 'contact', pose: 'wave', label: 'Chat — Contact', biome: 'lush', icon: { name: 'contact' }, placement: 'left', player: 'right', layout: { playerInset: '12vw', playerBottom: '12vh' }, backdrop: { name: 'Lush Caves', hudColor: '#55ff55', mood: 'lush' }, Component: ContactScreen },
  { id: 'end', pose: 'cheer', label: 'The End', biome: 'end', icon: { name: 'outro' }, placement: 'center', player: 'right', layout: { playerInset: '6vw', playerBottom: '12vh' }, scrim: true, backdrop: { name: 'The End', hudColor: '#ff55ff', mood: 'end' }, Component: EndScreen },
];

export const screenIndex = (id: ScreenId) => screens.findIndex((s) => s.id === id);
export const isScreenId = (v: string): v is ScreenId => screens.some((s) => s.id === v);
