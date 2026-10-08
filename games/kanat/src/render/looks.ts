// Per-world "look" presets = the implemented Art Bible (§3.2 world cards, §3.4 grade, §3.6 low-first).
// world.json may override sun/fog/groundFog/grade fields; everything else comes from here.
// All colours are sRGB hex (as in the brief); conversion to linear happens in atmosphere.ts.
import type { WorldId } from '../sim/types.ts';

export interface GradeParams {
  /** Pre-tonemap exposure multiplier (linear). */
  exposure: number;
  /** Contrast around pivot 0.45 in perceptual space (1 = neutral). */
  contrast: number;
  /** Saturation (1 = neutral). */
  saturation: number;
  /** ASC-CDL-like lift/gamma/gain per channel, perceptual space. Neutral: lift 0, gamma 1, gain 1. */
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];
  /** Split toning: tint hex for shadows/highlights + strength 0..1. */
  shadowTint: string;
  shadowStrength: number;
  highlightTint: string;
  highlightStrength: number;
  /** Luminance where shadows hand over to highlights (perceptual 0..1). */
  balance: number;
  vignette: number; // 0.2..0.3
  grain: number; // 0.03
}

export interface SkyLook {
  zenith: string;
  mid: string;
  horizon: string; // anti-sun side horizon
  horizonSun: string; // sun-side horizon
  ground: string; // below-horizon haze (env reflections only; never visible past terrain)
  /** Elevation curve exponent for the zenith gradient (smaller = colour change hugs the horizon). */
  curve: number;
  /** Position (0..1 in curved elevation) of the mid stop. */
  midStop: number;
  /** Azimuthal sharpness of the sun-side horizon tint (higher = narrower warm wedge). */
  sunSideSharpness: number;
  /** Linear radiance scale of the palette colours. */
  exposure: number;
  /** Mie aureole strength in the sky (HG g = 0.76). */
  aureole: number;
}

export interface FogLook {
  /** Extinction (1/m) at fog base height. Visibility (2.5 %) ~ 3.7 / density. */
  density: number;
  /** Exponential falloff with height (1/m). 1/falloff = scale height. */
  falloff: number;
  /** Fog base height relative to the terrain floor (10th percentile of core heights). */
  baseOffset: number;
  /** HG sun-halo strength in the in-scattered colour. */
  halo: number;
  /** Tint multiplied into the in-scatter colour (sRGB hex). */
  tint: string;
}

export interface GroundFogLook {
  /** Thickness above the valley floor where density falls to ~5 %. */
  thickness: number;
  /** Extinction (1/m) at the valley floor. */
  density: number;
  color: string;
  /** Drift noise amount 0..1 (patchy veils). */
  patchiness: number;
}

export interface WorldLook {
  id: WorldId;
  sun: { azimuthDeg: number; elevationDeg: number; kelvin: number; intensity: number; discScale: number };
  skyKelvin: number;
  sky: SkyLook;
  fog: FogLook;
  groundFog: GroundFogLook | null;
  /** Sky-light (ambient) strength multiplier for SH. */
  ambient: number;
  /** Average terrain albedo for ground bounce in the SH lower hemisphere. */
  groundAlbedo: string;
  grade: GradeParams;
  /** Cloud layer: impostor tint, coverage, cloud-sea height (Karadeniz). */
  clouds: { coverage: number; tint: string; seaTop: number | null; seaThickness: number };
  water: { shallow: string; deep: string; foam: string } | null;
  /** Terrain surface character: tuff strata (world-y banding) and erosion rills. */
  terrain: { strata: number; strataPeriod: number; strataRose: number; rills: number };
  /** Exposure scale applied to the pre-lit macro colour maps (display-referred bake → linear HDR scene). */
  prelit: number;
  /** Contrast gamma on the pre-lit macro (linear space; >1 deepens shadows and restores saturation). */
  prelitGamma: number;
  /** Accent colour (UI §3.5) - handy for debug overlays. */
  accent: string;
}

const neutral3: [number, number, number] = [1, 1, 1];

export const LOOKS: Record<WorldId, WorldLook> = {
  // 1 Kapadokya Şafağı — sunrise +10 min, 7° east, 3400 K / 9000 K. Warm gold, purple shadows, golden valley fog.
  kapadokya: {
    id: 'kapadokya',
    sun: { azimuthDeg: 95, elevationDeg: 7, kelvin: 3400, intensity: 4.6, discScale: 2.2 },
    skyKelvin: 9000,
    sky: {
      zenith: '#3E5F8A', mid: '#9DA9BC', horizon: '#D9B9B4', horizonSun: '#F6C48E', ground: '#B89A86',
      curve: 0.42, midStop: 0.32, sunSideSharpness: 2.2, exposure: 1.25, aureole: 0.10,
    },
    fog: { density: 7e-5, falloff: 1 / 900, baseOffset: 0, halo: 0.10, tint: '#FFFFFF' },
    groundFog: { thickness: 55, density: 0.008, color: '#F4D9A6', patchiness: 0.7 },
    ambient: 1.0,
    groundAlbedo: '#B8977C',
    grade: {
      exposure: 1.0, contrast: 1.06, saturation: 1.04,
      lift: [0.0, -0.004, 0.01], gamma: neutral3, gain: [1.02, 1.0, 0.97],
      shadowTint: '#6B4E5E', shadowStrength: 0.28, highlightTint: '#F4D9A6', highlightStrength: 0.18, balance: 0.42,
      vignette: 0.24, grain: 0.03,
    },
    clouds: { coverage: 0.25, tint: '#F6D6C0', seaTop: null, seaThickness: 0 },
    water: null,
    terrain: { strata: 0.16, strataPeriod: 3.6, strataRose: 0.45, rills: 1.0 },
    prelit: 1.75,
    prelitGamma: 1.4,
    accent: '#F2A541',
  },
  // 2 Likya Kıyısı — afternoon, 32° WSW, 5200 K / 8000 K. Clean turquoise, slightly warm, thin blue haze.
  likya: {
    id: 'likya',
    sun: { azimuthDeg: 248, elevationDeg: 32, kelvin: 5200, intensity: 4.4, discScale: 1.0 },
    skyKelvin: 8000,
    sky: {
      zenith: '#5FA8DE', mid: '#8EC9F0', horizon: '#DCEEF8', horizonSun: '#EEF2EE', ground: '#9DB8C4',
      curve: 0.5, midStop: 0.35, sunSideSharpness: 1.6, exposure: 1.15, aureole: 0.08,
    },
    fog: { density: 1.1e-4, falloff: 1 / 700, baseOffset: 0, halo: 0.06, tint: '#EAF4FA' },
    groundFog: null,
    ambient: 1.0,
    groundAlbedo: '#A8A08C',
    grade: {
      exposure: 0.95, contrast: 1.04, saturation: 1.06,
      lift: [-0.006, 0.0, 0.006], gamma: neutral3, gain: [1.02, 1.0, 0.98],
      shadowTint: '#2E6F7A', shadowStrength: 0.2, highlightTint: '#FFE9C8', highlightStrength: 0.12, balance: 0.45,
      vignette: 0.2, grain: 0.03,
    },
    clouds: { coverage: 0.15, tint: '#FFFFFF', seaTop: null, seaThickness: 0 },
    water: { shallow: '#2BB3B1', deep: '#0B4F6C', foam: '#F2F7F5' },
    terrain: { strata: 0.05, strataPeriod: 2.2, strataRose: 0.0, rills: 0.45 },
    prelit: 1.5,
    prelitGamma: 1.25,
    accent: '#2EC4C6',
  },
  // 3 Karadeniz Yaylası — morning between clouds, 22° SE (diffuse), 6200 K / 7000 K. Cool green-grey, soft contrast.
  karadeniz: {
    id: 'karadeniz',
    sun: { azimuthDeg: 135, elevationDeg: 22, kelvin: 6200, intensity: 3.2, discScale: 1.2 },
    skyKelvin: 7000,
    sky: {
      zenith: '#6F8EA6', mid: '#A9B9C2', horizon: '#DDE3E0', horizonSun: '#EEEDE2', ground: '#9AA59C',
      curve: 0.55, midStop: 0.3, sunSideSharpness: 1.4, exposure: 1.05, aureole: 0.12,
    },
    fog: { density: 3.2e-4, falloff: 1 / 650, baseOffset: 0, halo: 0.08, tint: '#E4E9E6' },
    groundFog: { thickness: 70, density: 0.004, color: '#DDE3E0', patchiness: 0.7 },
    ambient: 1.25,
    groundAlbedo: '#5E7046',
    grade: {
      exposure: 1.0, contrast: 0.94, saturation: 0.92,
      lift: [0.004, 0.008, 0.006], gamma: neutral3, gain: [0.99, 1.0, 1.0],
      shadowTint: '#3F5A4E', shadowStrength: 0.2, highlightTint: '#E8EEE6', highlightStrength: 0.08, balance: 0.4,
      vignette: 0.22, grain: 0.03,
    },
    clouds: { coverage: 0.6, tint: '#F2F4F2', seaTop: 1650, seaThickness: 220 },
    water: null,
    terrain: { strata: 0.0, strataPeriod: 3.0, strataRose: 0.0, rills: 0.35 },
    prelit: 1.5,
    prelitGamma: 1.25,
    accent: '#8DB580',
  },
  // 4 Erciyes Karı — winter afternoon, 11° SW, 4600 K / 12000 K. Blue-white, saturated blue shadows, very clear.
  erciyes: {
    id: 'erciyes',
    sun: { azimuthDeg: 225, elevationDeg: 11, kelvin: 4600, intensity: 4.4, discScale: 1.0 },
    skyKelvin: 12000,
    sky: {
      zenith: '#1F4E8C', mid: '#6E9CCC', horizon: '#CFE3F5', horizonSun: '#F1E7DC', ground: '#A9C2E0',
      curve: 0.45, midStop: 0.3, sunSideSharpness: 2.0, exposure: 1.1, aureole: 0.07,
    },
    fog: { density: 4.5e-5, falloff: 1 / 1400, baseOffset: 0, halo: 0.05, tint: '#D8E8F8' },
    groundFog: null,
    ambient: 1.05,
    groundAlbedo: '#D8DEE6',
    grade: {
      exposure: 0.85, contrast: 1.05, saturation: 1.05,
      lift: [-0.004, 0.0, 0.012], gamma: neutral3, gain: [1.0, 1.0, 1.01],
      shadowTint: '#3A64A8', shadowStrength: 0.3, highlightTint: '#FFF3E6', highlightStrength: 0.1, balance: 0.5,
      vignette: 0.22, grain: 0.03,
    },
    clouds: { coverage: 0.1, tint: '#FFFFFF', seaTop: null, seaThickness: 0 },
    water: null,
    terrain: { strata: 0.04, strataPeriod: 5.0, strataRose: 0.0, rills: 0.6 },
    prelit: 1.3,
    prelitGamma: 1.2,
    accent: '#9FD3F0',
  },
  // 5 Pamukkale Gün Batımı — sunset −10 min, 4° W, 2800 K / 8500 K. Red-orange, lavender shadows, warm haze.
  pamukkale: {
    id: 'pamukkale',
    sun: { azimuthDeg: 268, elevationDeg: 4, kelvin: 2800, intensity: 4.0, discScale: 1.8 },
    skyKelvin: 8500,
    sky: {
      zenith: '#2B2D5B', mid: '#B8607A', horizon: '#C7A2B8', horizonSun: '#FFC27A', ground: '#B08A80',
      curve: 0.4, midStop: 0.22, sunSideSharpness: 2.4, exposure: 1.2, aureole: 0.16,
    },
    fog: { density: 1.6e-4, falloff: 1 / 800, baseOffset: 0, halo: 0.18, tint: '#FFE1C8' },
    groundFog: { thickness: 30, density: 0.0018, color: '#F3C9A8', patchiness: 0.4 },
    ambient: 0.95,
    groundAlbedo: '#D9C2AE',
    grade: {
      exposure: 1.0, contrast: 1.05, saturation: 1.03,
      lift: [0.004, -0.002, 0.012], gamma: neutral3, gain: [1.03, 0.99, 0.96],
      shadowTint: '#9AA7C7', shadowStrength: 0.3, highlightTint: '#FFB27A', highlightStrength: 0.2, balance: 0.42,
      vignette: 0.26, grain: 0.03,
    },
    clouds: { coverage: 0.3, tint: '#FFC9A0', seaTop: null, seaThickness: 0 },
    water: { shallow: '#49C6C9', deep: '#2C7F92', foam: '#FFF4EA' },
    terrain: { strata: 0.08, strataPeriod: 1.6, strataRose: 0.0, rills: 0.3 },
    prelit: 1.7,
    prelitGamma: 1.35,
    accent: '#F2795C',
  },
};

/** Photo-mode filter presets (§2.5 Foto Modu): multiplicative overrides applied on top of the world grade. */
export const PHOTO_FILTERS: Record<string, Partial<GradeParams>> = {
  natural: {},
  belgesel: { contrast: 1.1, saturation: 0.9, grain: 0.05 },
  altin: { highlightTint: '#FFC27A', highlightStrength: 0.35, saturation: 1.08 },
  kartpostal: { saturation: 1.18, contrast: 1.08, vignette: 0.32 },
  siyahBeyaz: { saturation: 0.0, contrast: 1.15, grain: 0.06 },
  mavi: { shadowTint: '#2F5DA0', shadowStrength: 0.45, highlightTint: '#E8F1FF', highlightStrength: 0.15, saturation: 0.95 },
};
export const PHOTO_FILTER_IDS = Object.keys(PHOTO_FILTERS);
