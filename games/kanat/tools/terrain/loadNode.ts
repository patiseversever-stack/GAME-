// Node-side world loader (tests, bots, route tools). Same decode path as the browser loader, fs instead of fetch.
// Usage: const { config, terrain, sampler } = loadWorldNode('kapadokya');

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorldConfig } from '../../src/content/worldConfig.ts';
import { decodeHeightGrid, decodeMasks, decodeRockMask } from '../../src/sim/terrain/decode.ts';
import { createTerrainSampler, type WorldTerrainSampler } from '../../src/sim/terrain/sampler.ts';
import type { HeightGrid, WorldTerrain } from '../../src/sim/terrain/types.ts';
import type { WorldId } from '../../src/sim/types.ts';

export const KANAT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function worldDir(id: WorldId): string {
  return join(KANAT_ROOT, 'public', 'worlds', id);
}

export function loadWorldConfigNode(id: WorldId): WorldConfig {
  return JSON.parse(readFileSync(join(worldDir(id), 'world.json'), 'utf8')) as WorldConfig;
}

export interface NodeWorld {
  config: WorldConfig;
  terrain: WorldTerrain;
  sampler: WorldTerrainSampler;
  /** Pamukkale pool water surface grid (null elsewhere). */
  patchWater: HeightGrid | null;
}

/** Synchronous load of a baked world (decode is pure; fs read is the only Node-specific part). */
export function loadWorldNode(id: WorldId): NodeWorld {
  const config = loadWorldConfigNode(id);
  const dir = worldDir(id);
  const read = (f: string) => new Uint8Array(readFileSync(join(dir, f)));
  const t = config.terrain;
  const terrain: WorldTerrain = {
    core: decodeHeightGrid(read(t.core.file), t.core),
    far: decodeHeightGrid(read(t.far.file), t.far),
    rockMask: decodeRockMask(read(t.rock.file), t.rock.res),
    hasSea: config.hasSea,
  };
  if (t.patch) terrain.patch = decodeHeightGrid(read(t.patch.file), t.patch);
  if (t.masks) terrain.masks = decodeMasks(read(t.masks.file), t.masks);
  const patchWater = t.patchInfo ? decodeHeightGrid(read(t.patchInfo.water.file), t.patchInfo.water) : null;
  const sampler = createTerrainSampler(terrain, { bounds: t.playBounds });
  return { config, terrain, sampler, patchWater };
}
