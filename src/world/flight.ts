// Shared flight state. The 3D loop mutates `flight` every frame; React reads the slower-changing
// `ui` snapshot (target, nearby destination, landed screen) through useFlightUi().
import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import type { ScreenId } from '../screens/registry';
import type { World } from './generate';

/** intro: standing at spawn behind the welcome card, before the first take-off. */
export type FlightMode = 'intro' | 'fly' | 'landing' | 'landed' | 'takeoff';

export const flight = {
  world: null as World | null,
  pos: new THREE.Vector3(0, 42, 210),
  yaw: Math.PI, // facing north (-z)
  pitch: 0,
  roll: 0,
  yawVel: 0,
  speed: 18,
  /** Firework boost meter, 0..1 */
  boost: 1,
  boosting: false,
  /** Seconds of free firework thrust left after a take-off. */
  launch: 0,
  /** Bumped each time TNT is dropped. */
  fire: 0,
  /** Explosions waiting for their burst of particles. */
  blasts: [] as { x: number; y: number; z: number; hit: boolean }[],
  mode: 'intro' as FlightMode,
  input: { up: false, down: false, left: false, right: false, boost: false },
  /** Touch joystick, -1..1 on each axis (x right, y down). */
  axis: { x: 0, y: 0 },
  /** Camera orbit offset from dragging (radians), eased back to 0 when released. */
  look: { yaw: 0, pitch: 0, dragging: false },
  /** Set when the player strays too far out to sea and the world turns them back. */
  outOfBounds: false,
};

export type FlightUi = {
  /** Destination the autopilot is flying to. */
  target: ScreenId | null;
  /** Destination close enough to land at. */
  near: ScreenId | null;
  /** Screen whose panel is open after landing. */
  landed: ScreenId | null;
  mode: FlightMode;
  /** XP orbs collected. */
  xp: number;
  /** Pending command for the 3D loop. */
  command: { type: 'land' | 'takeoff'; id?: ScreenId; at: number } | null;
};

let ui: FlightUi = { target: null, near: null, landed: null, mode: 'intro', xp: 0, command: null };
const uiListeners = new Set<() => void>();

export function setUi(patch: Partial<FlightUi>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof FlightUi)[]) {
    if (ui[k] !== patch[k]) changed = true;
  }
  if (!changed) return;
  ui = { ...ui, ...patch };
  uiListeners.forEach((fn) => fn());
}

export const getUi = () => ui;

const subscribeUi = (fn: () => void) => {
  uiListeners.add(fn);
  return () => {
    uiListeners.delete(fn);
  };
};

export function useFlightUi() {
  return useSyncExternalStore(subscribeUi, getUi);
}

/** Per-frame listeners (HUD widgets that write straight to the DOM). */
const frameListeners = new Set<(dt: number) => void>();
export function onFlightFrame(fn: (dt: number) => void) {
  frameListeners.add(fn);
  return () => {
    frameListeners.delete(fn);
  };
}
export function emitFlightFrame(dt: number) {
  frameListeners.forEach((fn) => fn(dt));
}

// ---- Commands ----

export function flyTo(id: ScreenId) {
  const u = getUi();
  if (u.mode === 'landed' || u.mode === 'landing' || u.mode === 'intro') {
    if (u.landed === id) return;
    // take off first, then head for the new destination
    setUi({ target: id, command: { type: 'takeoff', at: performance.now() } });
    return;
  }
  setUi({ target: id });
}

export function cancelAutopilot() {
  setUi({ target: null });
}

export function land(id: ScreenId) {
  setUi({ command: { type: 'land', id, at: performance.now() } });
}

export function takeOff() {
  setUi({ command: { type: 'takeoff', at: performance.now() } });
}

// ---- Geometry helpers ----

/** Unit forward vector for a yaw/pitch (yaw 0 faces +z, positive yaw turns toward +x). */
export function forward(yaw: number, pitch: number, out = new THREE.Vector3()) {
  return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
}

/** Compass bearing in degrees, clockwise from north (-z), of a direction on the xz plane. */
export function bearingOf(dx: number, dz: number) {
  const b = (Math.atan2(dx, -dz) * 180) / Math.PI;
  return (b + 360) % 360;
}

export const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export const facingName = (bearing: number) => ['north', 'east', 'south', 'west'][Math.round(bearing / 90) % 4];
