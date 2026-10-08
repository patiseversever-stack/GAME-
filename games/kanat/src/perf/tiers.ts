// Quality tier table (§5.2 common core + §5.G KANAT/SÜRÜ specifics) as typed data.
// Tiers change visuals only — gameplay, collision sets, tick rates are identical on every tier.

import type { QualityTier } from '../core/settings.ts';

export const TIER_ORDER: readonly QualityTier[] = ['low', 'medium', 'high', 'ultra'];

export function tierIndex(t: QualityTier): number {
  return TIER_ORDER.indexOf(t);
}

export function tierAt(i: number): QualityTier {
  return TIER_ORDER[Math.max(0, Math.min(TIER_ORDER.length - 1, i))];
}

export function lowerTier(t: QualityTier): QualityTier {
  return tierAt(tierIndex(t) - 1);
}

export function higherTier(t: QualityTier): QualityTier {
  return tierAt(tierIndex(t) + 1);
}

export interface CommonTierSpec {
  /** Dynamic render resolution range in megapixels (clamped to native). */
  mpMin: number;
  mpMax: number;
  dprCap: number;
  maxDrawCalls: number;
  maxTriangles: number;
  maxTextureMB: number;
  shadow: 'bake+blob' | 'hero1024' | 'full2048' | 'full2048+contact';
  post: 'material' | 'halfBloom+lut+vignette+fxaa' | 'fullBloom+smaa' | 'fullBloom+smaa+dof+motionBlur';
  renderTarget: 'rgba8' | 'halfFloat';
  anisotropy: number;
  particleCap: number;
  jsBudgetMs: number;
}

export interface KanatTierSpec {
  cdlodGrid: number;
  cdlodExtraLevel: boolean;
  lod0RadiusM: number;
  terrainViewKm: number;
  terrainProjection: 'planar+vertical' | 'biplanar' | 'triplanar' | 'triplanar+detailNormal';
  maxFragSamples: number;
  macroColormap: number;
  treeMeshLodM: number;
  impostorM: number;
  groundDecoDensity: number;
  balloonLod0M: number;
  cloudImpostors: number;
  cloudLayers: number;
  dynamicShadow: 'blobDecal' | 'csm1x1024@80m' | 'csm2x2048' | 'csm3x2048';
  terrainShadow: 'bake' | 'bake+contact';
  water: 'cubemap+1normal' | '+depthColor+foam' | '+2ndNormal+caustics' | '+halfResPlanarReflection';
  particleSprites: number;
  speedLines: number;
  post: 'uber' | '+halfBloom4mip' | '+sunRays+radialBlur' | '+smaa+photoDof';
  /** Low-tier specific stricter targets (§5.G): ≤45 draw calls / ≤140k tris on Low. */
  targetDrawCalls: number;
  targetTriangles: number;
}

export interface SuruTierSpec {
  simBirds: 1500;
  birdMeshTris: number;
  bgMurmuration: number;
  water: 'cubemap+glint' | '+ownershipRT256' | '+rtBlur+waveNormals' | '+mirroredBirdsHalfRes';
  leaderGlow: 'additiveHalo' | '+bloom' | '+bloom+auraParticles';
  shoreLayers: number;
  shoreWindSway: boolean;
  fogCards: boolean;
}

export interface TierSpec {
  id: QualityTier;
  common: CommonTierSpec;
  kanat: KanatTierSpec;
  suru: SuruTierSpec;
}

export const TIERS: Readonly<Record<QualityTier, TierSpec>> = {
  low: {
    id: 'low',
    common: {
      mpMin: 0.45, mpMax: 0.65, dprCap: 1.25, maxDrawCalls: 80, maxTriangles: 150_000, maxTextureMB: 96,
      shadow: 'bake+blob', post: 'material', renderTarget: 'rgba8', anisotropy: 1, particleCap: 300, jsBudgetMs: 8,
    },
    kanat: {
      cdlodGrid: 17, cdlodExtraLevel: false, lod0RadiusM: 100, terrainViewKm: 12, terrainProjection: 'planar+vertical',
      maxFragSamples: 4, macroColormap: 1024, treeMeshLodM: 60, impostorM: 800, groundDecoDensity: 0, balloonLod0M: 150,
      cloudImpostors: 40, cloudLayers: 1, dynamicShadow: 'blobDecal', terrainShadow: 'bake', water: 'cubemap+1normal',
      particleSprites: 300, speedLines: 60, post: 'uber', targetDrawCalls: 45, targetTriangles: 140_000,
    },
    suru: {
      simBirds: 1500, birdMeshTris: 12, bgMurmuration: 0, water: 'cubemap+glint', leaderGlow: 'additiveHalo',
      shoreLayers: 1, shoreWindSway: false, fogCards: false,
    },
  },
  medium: {
    id: 'medium',
    common: {
      mpMin: 0.65, mpMax: 1.0, dprCap: 1.75, maxDrawCalls: 140, maxTriangles: 350_000, maxTextureMB: 160,
      shadow: 'hero1024', post: 'halfBloom+lut+vignette+fxaa', renderTarget: 'halfFloat', anisotropy: 2, particleCap: 800, jsBudgetMs: 8,
    },
    kanat: {
      cdlodGrid: 33, cdlodExtraLevel: false, lod0RadiusM: 180, terrainViewKm: 18, terrainProjection: 'biplanar',
      maxFragSamples: 7, macroColormap: 2048, treeMeshLodM: 100, impostorM: 1500, groundDecoDensity: 0.3, balloonLod0M: 300,
      cloudImpostors: 80, cloudLayers: 2, dynamicShadow: 'csm1x1024@80m', terrainShadow: 'bake', water: '+depthColor+foam',
      particleSprites: 800, speedLines: 120, post: '+halfBloom4mip', targetDrawCalls: 140, targetTriangles: 350_000,
    },
    suru: {
      simBirds: 1500, birdMeshTris: 24, bgMurmuration: 600, water: '+ownershipRT256', leaderGlow: '+bloom',
      shoreLayers: 2, shoreWindSway: false, fogCards: false,
    },
  },
  high: {
    id: 'high',
    common: {
      mpMin: 1.0, mpMax: 1.6, dprCap: 2.25, maxDrawCalls: 220, maxTriangles: 700_000, maxTextureMB: 256,
      shadow: 'full2048', post: 'fullBloom+smaa', renderTarget: 'halfFloat', anisotropy: 4, particleCap: 1500, jsBudgetMs: 8,
    },
    kanat: {
      cdlodGrid: 33, cdlodExtraLevel: false, lod0RadiusM: 300, terrainViewKm: 25, terrainProjection: 'triplanar',
      maxFragSamples: 10, macroColormap: 2048, treeMeshLodM: 160, impostorM: 2500, groundDecoDensity: 0.7, balloonLod0M: 500,
      cloudImpostors: 150, cloudLayers: 2, dynamicShadow: 'csm2x2048', terrainShadow: 'bake', water: '+2ndNormal+caustics',
      particleSprites: 1500, speedLines: 200, post: '+sunRays+radialBlur', targetDrawCalls: 220, targetTriangles: 700_000,
    },
    suru: {
      simBirds: 1500, birdMeshTris: 40, bgMurmuration: 1500, water: '+rtBlur+waveNormals', leaderGlow: '+bloom',
      shoreLayers: 3, shoreWindSway: true, fogCards: false,
    },
  },
  ultra: {
    id: 'ultra',
    common: {
      mpMin: 1.6, mpMax: 2.4, dprCap: 3, maxDrawCalls: 300, maxTriangles: 1_200_000, maxTextureMB: 320,
      shadow: 'full2048+contact', post: 'fullBloom+smaa+dof+motionBlur', renderTarget: 'halfFloat', anisotropy: 8, particleCap: 3000, jsBudgetMs: 8,
    },
    kanat: {
      cdlodGrid: 33, cdlodExtraLevel: true, lod0RadiusM: 450, terrainViewKm: 40, terrainProjection: 'triplanar+detailNormal',
      maxFragSamples: 12, macroColormap: 2048, treeMeshLodM: 250, impostorM: 4000, groundDecoDensity: 1.0, balloonLod0M: 800,
      cloudImpostors: 250, cloudLayers: 3, dynamicShadow: 'csm3x2048', terrainShadow: 'bake+contact', water: '+halfResPlanarReflection',
      particleSprites: 3000, speedLines: 300, post: '+smaa+photoDof', targetDrawCalls: 300, targetTriangles: 1_200_000,
    },
    suru: {
      simBirds: 1500, birdMeshTris: 60, bgMurmuration: 3000, water: '+mirroredBirdsHalfRes', leaderGlow: '+bloom+auraParticles',
      shoreLayers: 3, shoreWindSway: true, fogCards: true,
    },
  },
};

/** Memory ceilings (§5.2). */
export const MEMORY_BUDGET = {
  jsHeapMB: 150,
  processMBLow: 400,
  processMBUltra: 700,
  worldGpuTextureMBHigh: 60,
  maxPrograms: 40,
} as const;

/** Frame budget targets (§5.3 / §5.4). */
export const FRAME_BUDGET = {
  frameMs60: 1000 / 60,
  benchmarkPickMs: 11,
  dropP90Ms: 18.5,
  dropSustainMs: 3000,
  emergencyP90Ms: 28,
  emergencySustainMs: 2000,
  raiseP90Ms: 10,
  raiseSustainMs: 20_000,
  resStepMinIntervalMs: 500,
  resMaxStepFrac: 0.05,
  stableAfterMs: 180_000,
} as const;

/** Starting MP for a tier = middle of its range, never above native. */
export function initialMp(t: QualityTier, nativeMp: number): number {
  const c = TIERS[t].common;
  return Math.min(nativeMp, (c.mpMin + c.mpMax) / 2);
}

/** MP range of a tier clamped to the native screen (low-res screens keep a sane floor). */
export function mpRange(t: QualityTier, nativeMp: number): [number, number] {
  const c = TIERS[t].common;
  const max = Math.min(c.mpMax, nativeMp);
  const min = Math.min(c.mpMin, max);
  return [min, max];
}

/** Device pixel ratio that yields `mp` megapixels on a css-size canvas, capped by the tier DPR cap. */
export function pixelRatioFor(mp: number, cssW: number, cssH: number, dprCap: number, deviceDpr: number): number {
  const area = Math.max(1, cssW * cssH);
  const pr = Math.sqrt((mp * 1e6) / area);
  return Math.max(0.5, Math.min(pr, dprCap, Math.max(1, deviceDpr)));
}
