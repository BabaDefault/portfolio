import type { Biome, BiomeId } from '../types';
import { ocean } from './ocean';
import { cherry } from './cherry';
import { nether } from './nether';
import { mineshaft } from './mineshaft';
import { desert } from './desert';
import { deepdark } from './deepdark';
import { village } from './village';
import { lush } from './lush';
import { end } from './end';

export const biomes: Record<BiomeId, Biome> = {
  ocean,
  cherry,
  nether,
  mineshaft,
  desert,
  deepdark,
  village,
  lush,
  end,
};
