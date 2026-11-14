/** World grid: N×N columns centred on the origin (north is -z). */
export const N = 512;
export const HALF = N / 2;
/** Sea level: the water surface sits at y = SEA + 0.85. */
export const SEA = 8;
/** Open-ocean floor. Columns at this height are never drawn. */
export const MIN_Y = 2;
