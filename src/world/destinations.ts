import { screens, type ScreenId } from '../screens/registry';

/** A landing spot: the beacon on a section's island. */
export type Dest = {
  id: ScreenId;
  name: string;
  /** Beacon position (block coordinates; north is -z) and the surface it stands on. */
  x: number;
  z: number;
  y: number;
  /** Unit vector from the beacon toward where the landing camera sits. */
  view: [number, number];
  color: string;
  index: number;
};

export function destColor(id: ScreenId) {
  return screens.find((s) => s.id === id)?.backdrop?.hudColor ?? '#ffffff';
}

export function biomeLabel(id: ScreenId) {
  return screens.find((s) => s.id === id)?.backdrop?.name ?? 'Island';
}
