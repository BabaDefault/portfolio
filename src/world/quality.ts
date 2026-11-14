// Device-dependent settings. Touch devices get on-screen controls and a lighter world.
// For testing on a desktop: ?touch shows the touch controls, ?low forces the lighter settings.
const params = new URLSearchParams(window.location.search);

function coarse() {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

const touch = params.has('touch') || coarse();
const low = touch || params.has('low');

export const quality = {
  /** Show the joystick and action buttons. */
  touch,
  /** Phones and tablets: fewer pixels, plants and particles. */
  low,
  dpr: (low ? [1, 1.3] : [1, 1.6]) as [number, number],
  antialias: !low,
  /** 0..1 share of the grass and flowers that get drawn. */
  plants: low ? 0.35 : 1,
  petals: low ? 240 : 650,
};
