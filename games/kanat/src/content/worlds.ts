// Browser-side world loader. All files come through src/core/assets.ts (works in the web and single-file builds).
// Node / tests / bots: use tools/terrain/loadNode.ts (same decode path, fs instead of fetch).
//
// Texture conventions (see WorldConfig.textures): image row 0 = north (min z). Upload ImageBitmaps with
// flipY = false, premultiplyAlpha = false, NoColorSpace for data maps (normal/splat/shadowAo) and SRGBColorSpace
// for colorMacro/colorFar; then uv = ((x - cov.minX) / cov.size, (z - cov.minZ) / cov.size).

import { fetchAsset, fetchJson, isSingleFileBuild } from '../core/assets.ts';
import { decodeWorldTerrain } from '../sim/terrain/decode.ts';
import { createTerrainSampler, type WorldTerrainSampler } from '../sim/terrain/sampler.ts';
import type { WorldTerrain } from '../sim/terrain/types.ts';
import type { WorldId } from '../sim/types.ts';
import type { WorldConfig } from './worldConfig.ts';

export type { WorldConfig } from './worldConfig.ts';

export interface WorldImages {
  normal: ImageBitmap;
  splat: ImageBitmap;
  shadowAo: ImageBitmap;
  colorMacro: ImageBitmap;
  colorFar: ImageBitmap;
  /** Raw KTX2 container for KTX2Loader.parse (web build), null in single-file or when not shipped. */
  colorMacroKtx2: ArrayBuffer | null;
}

export interface LoadedWorld {
  config: WorldConfig;
  terrain: WorldTerrain;
  sampler: WorldTerrainSampler;
  images: WorldImages;
  /** Alias of `images` (TECH_CONTRACTS name). */
  textures: WorldImages;
}

export interface LoadWorldOptions {
  /** Fetch color_macro.ktx2 when present. Default: true in the web build, false in the single-file build. */
  ktx2?: boolean;
}

export function worldFile(id: WorldId, file: string): string {
  return `worlds/${id}/${file}`;
}

export async function loadWorldConfig(id: WorldId): Promise<WorldConfig> {
  return fetchJson<WorldConfig>(worldFile(id, 'world.json'));
}

async function bitmap(path: string, mime: string): Promise<ImageBitmap> {
  const buf = await fetchAsset(path);
  return createImageBitmap(new Blob([buf], { type: mime }), {
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
}

/** Terrain only (no images): what the sim/bots need. */
export async function loadWorldTerrain(id: WorldId, config?: WorldConfig): Promise<{ config: WorldConfig; terrain: WorldTerrain; sampler: WorldTerrainSampler }> {
  const cfg = config ?? (await loadWorldConfig(id));
  const terrain = await decodeWorldTerrain(cfg, async (file) => new Uint8Array(await fetchAsset(worldFile(id, file))));
  const sampler = createTerrainSampler(terrain, { bounds: cfg.terrain.playBounds });
  return { config: cfg, terrain, sampler };
}

export async function loadWorld(id: WorldId, opts: LoadWorldOptions = {}): Promise<LoadedWorld> {
  const config = await loadWorldConfig(id);
  const tx = config.textures;
  const wantKtx2 = (opts.ktx2 ?? !isSingleFileBuild()) && tx.colorMacroKtx2 !== null;
  const [base, normal, splat, shadowAo, colorMacro, colorFar, ktx2] = await Promise.all([
    loadWorldTerrain(id, config),
    bitmap(worldFile(id, tx.normal), 'image/png'),
    bitmap(worldFile(id, tx.splat), 'image/png'),
    bitmap(worldFile(id, tx.shadowAo), 'image/png'),
    bitmap(worldFile(id, tx.colorMacro), 'image/webp'),
    bitmap(worldFile(id, tx.colorFar), 'image/webp'),
    wantKtx2 && tx.colorMacroKtx2 ? fetchAsset(worldFile(id, tx.colorMacroKtx2)) : Promise.resolve(null),
  ]);
  const images: WorldImages = { normal, splat, shadowAo, colorMacro, colorFar, colorMacroKtx2: ktx2 };
  return { config, terrain: base.terrain, sampler: base.sampler, images, textures: images };
}
