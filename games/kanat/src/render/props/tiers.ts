// Per-tier knobs for props, pilot and VFX (brief §5.G). Visual only: the collidable prop set is identical on every tier.
import type { QualityTier } from '../../core/settings.ts';

export interface PropTierConfig {
  tier: QualityTier;
  /** 0 = low … 3 = ultra; compiled into shaders as PROP_TIER. */
  level: number;
  /** Balloon envelope LOD0 → LOD1 switch distance (m). All 40 balloons are always drawn. */
  balloonLod0: number;
  /** Fairy chimney / misc mesh LOD0 → LOD1 distance (m). */
  chimneyLod0: number;
  /** Max draw distance of chimneys / misc props (m) — beyond that they live in the macro colour map + fog. */
  chimneyMax: number;
  /** Tree mesh → impostor distance (m). */
  treeMesh: number;
  /** Impostor max distance (m), beyond that the macro colour map carries the forest. */
  treeImpostor: number;
  /** Generic small props (houses, ruins, gulets) max distance (m). */
  miscMax: number;
  /** Width of the dithered cross-fade band as a fraction of the switch distance. */
  fadeFrac: number;
  /** Particle sprite cap (§5.G). */
  particles: number;
  /** Speed-line quads (§5.G). */
  speedLines: number;
  /** Octave count of the procedural surface detail in prop shaders. */
  detailOctaves: number;
  /** Impostor frame blending: 1 = nearest frame, 3 = triangle blend. */
  impostorBlend: 1 | 3;
  /** Hero props cast real shadows (CSM is owned by render-world; Low uses the pilot decal only). */
  heroShadows: boolean;
  /** Pilot mesh LOD bias (0 = full detail always). */
  pilotDetail: 0 | 1 | 2;
}

export const PROP_TIERS: Record<QualityTier, PropTierConfig> = {
  low: {
    tier: 'low', level: 0,
    balloonLod0: 150, chimneyLod0: 110, chimneyMax: 2200,
    treeMesh: 60, treeImpostor: 800, miscMax: 1400, fadeFrac: 0.18,
    particles: 300, speedLines: 60, detailOctaves: 1, impostorBlend: 1, heroShadows: false, pilotDetail: 1,
  },
  medium: {
    tier: 'medium', level: 1,
    balloonLod0: 300, chimneyLod0: 180, chimneyMax: 3200,
    treeMesh: 100, treeImpostor: 1500, miscMax: 2000, fadeFrac: 0.16,
    particles: 800, speedLines: 120, detailOctaves: 2, impostorBlend: 1, heroShadows: true, pilotDetail: 0,
  },
  high: {
    tier: 'high', level: 2,
    balloonLod0: 500, chimneyLod0: 300, chimneyMax: 4200,
    treeMesh: 160, treeImpostor: 2500, miscMax: 2800, fadeFrac: 0.14,
    particles: 1500, speedLines: 200, detailOctaves: 2, impostorBlend: 3, heroShadows: true, pilotDetail: 0,
  },
  ultra: {
    tier: 'ultra', level: 3,
    balloonLod0: 800, chimneyLod0: 450, chimneyMax: 6000,
    treeMesh: 250, treeImpostor: 4000, miscMax: 3600, fadeFrac: 0.12,
    particles: 3000, speedLines: 300, detailOctaves: 3, impostorBlend: 3, heroShadows: true, pilotDetail: 0,
  },
};

export function tierConfig(t: QualityTier): PropTierConfig {
  return PROP_TIERS[t];
}
