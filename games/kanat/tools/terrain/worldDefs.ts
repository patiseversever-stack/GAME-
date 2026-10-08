// Per-world bake + art definitions (source of truth for world.json; §3.2 world cards, §4.G.1 locations).

import type { WorldId } from '../../src/sim/types.ts';

export interface WorldDef {
  id: WorldId;
  name: { tr: string; en: string };
  accent: string;
  lat: number;
  lon: number;
  /** Why this center (Turkish, goes to world.json geo.note). */
  note: string;
  verticalScale: number;
  hasSea: boolean;
  /** Clamp bathymetry (m, unscaled) to keep u16 precision on land. */
  bathyMin: number;
  zoomCore: number;
  zoomFar: number;
  erosion: { droplets: number; seed: number; strength: number } | null;
  sun: { azimuthDeg: number; elevationDeg: number; kelvin: number; intensity: number };
  sky: { kelvin: number; zenith: string; horizon: string; sunGlow: string; ground: string; ambientIntensity: number };
  fog: {
    a: number;
    b: number;
    color: string;
    sunColor: string;
    maxViewM: number;
    /** Ground fog: top = valley floor (p5 height) + topAboveFloor. */
    groundFog: { topAboveFloor: number; density: number; color: string } | null;
    /** Cloud sea band as height percentiles of the core (0..1) → absolute y at bake. */
    cloudSea: { bottomPct: number; topPct: number; density: number; color: string } | null;
  };
  palette: Record<string, string>;
  grading: {
    exposure: number;
    lift: [number, number, number];
    gamma: [number, number, number];
    gain: [number, number, number];
    saturation: number;
    contrast: number;
    splitShadow: string;
    splitHighlight: string;
    splitBalance: number;
    vignette: number;
  };
  water: { enabled: boolean; shallow: string; deep: string; depthFalloffM: number; foam: string; roughness: number; kind: 'sea' | 'pools' | 'none' };
  wind: { dirDeg: number; speed: number };
  layers: [string, string, string, string];
  layerColors: [string, string, string, string];
  layerRoughness: [number, number, number, number];
  maskNames: [string, string, string, string];
  /** Baked lighting balance for the pre-lit color maps. */
  bake: { sunStrength: number; ambientStrength: number; ambientColor: string; wrap: number };
  props: Record<string, { count?: number; mask?: string; seed?: number }>;
  /** Pamukkale: travertine patch definition (geo center of the terrace area). */
  patch: { lat: number; lon: number; widthM: number; depthM: number; res: number } | null;
}

export const WORLD_DEFS: Record<WorldId, WorldDef> = {
  kapadokya: {
    id: 'kapadokya',
    name: { tr: 'Kapadokya Şafağı', en: 'Cappadocia Dawn' },
    accent: '#F2A541',
    lat: 38.64,
    lon: 34.83,
    note: 'Göreme merkez; Güvercinlik, Kızılçukur/Güllüdere ve Zemi vadileri çekirdekte.',
    verticalScale: 1.15,
    hasSea: false,
    bathyMin: -100,
    zoomCore: 13,
    zoomFar: 11,
    erosion: { droplets: 220000, seed: 1101, strength: 1 },
    sun: { azimuthDeg: 95, elevationDeg: 7, kelvin: 3400, intensity: 2.6 },
    sky: { kelvin: 9000, zenith: '#3E5F8A', horizon: '#F6C48E', sunGlow: '#FFD49A', ground: '#8C6E5E', ambientIntensity: 0.55 },
    fog: {
      a: 0.00012,
      b: 0.0011,
      color: '#E9C9A4',
      sunColor: '#F6C48E',
      maxViewM: 30000,
      groundFog: { topAboveFloor: 60, density: 0.02, color: '#F4D9A6' },
      cloudSea: null,
    },
    palette: {
      skyTop: '#3E5F8A',
      horizon: '#F6C48E',
      tuffLit: '#D9B48F',
      roseTuff: '#D49A8A',
      purpleShadow: '#6B4E5E',
      goldFog: '#F4D9A6',
    },
    grading: {
      exposure: 1.0,
      lift: [0.012, 0.0, 0.022],
      gamma: [1.0, 1.0, 1.02],
      gain: [1.06, 1.0, 0.93],
      saturation: 1.08,
      contrast: 1.06,
      splitShadow: '#6B4E5E',
      splitHighlight: '#F6C48E',
      splitBalance: 0.1,
      vignette: 0.25,
    },
    water: { enabled: false, shallow: '#5FA8A0', deep: '#2E5E62', depthFalloffM: 3, foam: '#F2EEE6', roughness: 0.2, kind: 'none' },
    wind: { dirDeg: 250, speed: 4 },
    layers: ['tuf_pembe', 'tuf_beyaz', 'kuru_ot', 'bazalt'],
    layerColors: ['#D49A8A', '#E4D5BF', '#A8956A', '#5E5250'],
    layerRoughness: [0.9, 0.88, 0.95, 0.75],
    maskNames: ['chimney', 'trees', 'flat', 'drainage'],
    bake: { sunStrength: 1.05, ambientStrength: 0.62, ambientColor: '#8E7FA6', wrap: 0.12 },
    props: {
      chimneys: { count: 1200, mask: 'chimney', seed: 11 },
      balloons: { count: 40, seed: 7 },
      poplars: { count: 2500, mask: 'trees', seed: 13 },
    },
    patch: null,
  },
  likya: {
    id: 'likya',
    name: { tr: 'Likya Kıyısı', en: 'Lycian Coast' },
    accent: '#2EC4C6',
    lat: 36.23,
    lon: 29.45,
    note: 'Kaputaş koyu; Kalkan–Kaş arası falezler ve Kaputaş kanyonu çekirdekte.',
    verticalScale: 1.1,
    hasSea: true,
    bathyMin: -400,
    zoomCore: 13,
    zoomFar: 11,
    erosion: { droplets: 180000, seed: 2202, strength: 0.8 },
    sun: { azimuthDeg: 247.5, elevationDeg: 32, kelvin: 5200, intensity: 3.2 },
    sky: { kelvin: 8000, zenith: '#8EC9F0', horizon: '#E8F4FB', sunGlow: '#FFF1D6', ground: '#6E7E68', ambientIntensity: 0.6 },
    fog: { a: 0.00007, b: 0.0006, color: '#CFE4F2', sunColor: '#FFF1D6', maxViewM: 40000, groundFog: null, cloudSea: null },
    palette: {
      skyTop: '#8EC9F0',
      skyHorizon: '#E8F4FB',
      shallowWater: '#2BB3B1',
      deepWater: '#0B4F6C',
      limestone: '#CFC6B4',
      pine: '#3F5B3A',
      sand: '#E9D8B4',
    },
    grading: {
      exposure: 1.0,
      lift: [0.0, 0.006, 0.012],
      gamma: [1.0, 1.0, 1.0],
      gain: [1.03, 1.01, 0.98],
      saturation: 1.1,
      contrast: 1.04,
      splitShadow: '#1F5F78',
      splitHighlight: '#FFE9C8',
      splitBalance: 0.0,
      vignette: 0.2,
    },
    water: { enabled: true, shallow: '#2BB3B1', deep: '#0B4F6C', depthFalloffM: 28, foam: '#F4FBFB', roughness: 0.08, kind: 'sea' },
    wind: { dirDeg: 290, speed: 6 },
    layers: ['kirectasi', 'cam', 'kum', 'maki'],
    layerColors: ['#CFC6B4', '#3F5B3A', '#E9D8B4', '#86805A'],
    layerRoughness: [0.7, 0.9, 0.85, 0.9],
    maskNames: ['tomb', 'trees', 'flat', 'coast'],
    bake: { sunStrength: 1.0, ambientStrength: 0.5, ambientColor: '#9CC8EA', wrap: 0.05 },
    props: {
      tombs: { count: 14, mask: 'tomb', seed: 21 },
      pines: { count: 6000, mask: 'trees', seed: 23 },
      gulets: { count: 7, mask: 'coast', seed: 25 },
      lighthouse: { count: 1, mask: 'coast', seed: 27 },
    },
    patch: null,
  },
  karadeniz: {
    id: 'karadeniz',
    name: { tr: 'Karadeniz Yaylası', en: 'Black Sea Highlands' },
    accent: '#8DB580',
    lat: 40.95,
    lon: 41.1,
    note: 'Ayder (Uzungöl yerine): şelaleler, yayla evleri ve dik V-vadiler; göl suyu düzlemi gerektirmez.',
    verticalScale: 1.0,
    hasSea: false,
    bathyMin: -100,
    zoomCore: 13,
    zoomFar: 11,
    erosion: { droplets: 200000, seed: 3303, strength: 0.9 },
    sun: { azimuthDeg: 135, elevationDeg: 22, kelvin: 6200, intensity: 2.2 },
    sky: { kelvin: 7000, zenith: '#6F93AE', horizon: '#DDE3E0', sunGlow: '#F4F1E6', ground: '#3B4A3C', ambientIntensity: 0.8 },
    fog: {
      a: 0.00022,
      b: 0.0009,
      color: '#DDE3E0',
      sunColor: '#F4F1E6',
      maxViewM: 22000,
      groundFog: null,
      cloudSea: { bottomPct: 0.42, topPct: 0.52, density: 0.03, color: '#E8ECEA' },
    },
    palette: {
      spruce: '#1F3B2C',
      meadow: '#6E8B3D',
      mist: '#DDE3E0',
      wood: '#5A3B26',
      tinRoof: '#8A8F93',
      cloudShadow: '#A9B6BC',
    },
    grading: {
      exposure: 1.0,
      lift: [0.008, 0.012, 0.012],
      gamma: [1.0, 1.0, 1.0],
      gain: [0.98, 1.01, 1.0],
      saturation: 0.95,
      contrast: 0.96,
      splitShadow: '#2C4A48',
      splitHighlight: '#EEF2E6',
      splitBalance: -0.1,
      vignette: 0.22,
    },
    water: { enabled: false, shallow: '#5E8C84', deep: '#22433F', depthFalloffM: 2, foam: '#F2F5F2', roughness: 0.15, kind: 'none' },
    wind: { dirDeg: 320, speed: 5 },
    layers: ['ladin', 'cayir', 'kaya', 'kar'],
    layerColors: ['#1F3B2C', '#6E8B3D', '#5F5D58', '#EEF0EE'],
    layerRoughness: [0.92, 0.9, 0.5, 0.6],
    maskNames: ['house', 'trees', 'flat', 'drainage'],
    bake: { sunStrength: 0.85, ambientStrength: 0.62, ambientColor: '#B9C8CC', wrap: 0.25 },
    props: {
      houses: { count: 60, mask: 'house', seed: 31 },
      spruces: { count: 9000, mask: 'trees', seed: 33 },
      waterfalls: { count: 4, mask: 'drainage', seed: 35 },
    },
    patch: null,
  },
  erciyes: {
    id: 'erciyes',
    name: { tr: 'Erciyes Karı', en: 'Erciyes Snow' },
    accent: '#9FD3F0',
    lat: 38.53,
    lon: 35.45,
    note: 'Erciyes zirvesi (3.917 m) çekirdekte; kuzey/güney buzul vadileri ve Tekir yaylası düşüş rotaları.',
    verticalScale: 1.0,
    hasSea: false,
    bathyMin: -100,
    zoomCore: 13,
    zoomFar: 11,
    erosion: { droplets: 160000, seed: 4404, strength: 0.7 },
    sun: { azimuthDeg: 225, elevationDeg: 11, kelvin: 4600, intensity: 2.8 },
    sky: { kelvin: 12000, zenith: '#1F4E8C', horizon: '#CFE3F5', sunGlow: '#FFE2C2', ground: '#B9C6D6', ambientIntensity: 0.7 },
    fog: { a: 0.00005, b: 0.0005, color: '#BFD6EE', sunColor: '#FFE2C2', maxViewM: 45000, groundFog: null, cloudSea: null },
    palette: {
      snowLit: '#FFF6EC',
      snowShadow: '#A9C2E0',
      ice: '#BFE6F2',
      rock: '#4A4642',
      skyTop: '#1F4E8C',
      skyHorizon: '#CFE3F5',
    },
    grading: {
      exposure: 0.95,
      lift: [0.0, 0.006, 0.02],
      gamma: [1.0, 1.0, 0.98],
      gain: [1.02, 1.0, 1.0],
      saturation: 1.05,
      contrast: 1.08,
      splitShadow: '#3A6AA8',
      splitHighlight: '#FFF1E0',
      splitBalance: -0.15,
      vignette: 0.22,
    },
    water: { enabled: false, shallow: '#9CC7D6', deep: '#3E6E86', depthFalloffM: 2, foam: '#FFFFFF', roughness: 0.1, kind: 'none' },
    wind: { dirDeg: 300, speed: 7 },
    layers: ['kar', 'buz', 'kaya', 'toprak'],
    layerColors: ['#F4F2EE', '#BFE6F2', '#4A4642', '#6E5E52'],
    layerRoughness: [0.6, 0.15, 0.7, 0.9],
    maskNames: ['cornice', 'trees', 'flat', 'snow'],
    bake: { sunStrength: 1.0, ambientStrength: 0.55, ambientColor: '#8FB0E0', wrap: 0.08 },
    props: {
      cornices: { count: 80, mask: 'cornice', seed: 41 },
      rocks: { count: 400, mask: 'cornice', seed: 43 },
    },
    patch: null,
  },
  pamukkale: {
    id: 'pamukkale',
    name: { tr: 'Pamukkale Gün Batımı', en: 'Pamukkale Sunset' },
    accent: '#F2795C',
    lat: 37.92,
    lon: 29.12,
    note: 'Traverten terasları + Hierapolis platosu; batıya bakan yamaç gün batımına dönük.',
    verticalScale: 1.2,
    hasSea: false,
    bathyMin: -100,
    zoomCore: 13,
    zoomFar: 11,
    erosion: { droplets: 160000, seed: 5505, strength: 0.7 },
    sun: { azimuthDeg: 270, elevationDeg: 4, kelvin: 2800, intensity: 2.4 },
    sky: { kelvin: 8500, zenith: '#2B2D5B', horizon: '#E86A4A', sunGlow: '#FFC27A', ground: '#7A5A5A', ambientIntensity: 0.55 },
    fog: { a: 0.00014, b: 0.0012, color: '#E89A72', sunColor: '#FFC27A', maxViewM: 28000, groundFog: null, cloudSea: null },
    palette: {
      skyTop: '#2B2D5B',
      skyMid: '#E86A4A',
      skyHorizon: '#FFC27A',
      travertineLit: '#F7EDE2',
      travertineWarm: '#F3C9A8',
      travertineShadow: '#9AA7C7',
      pool: '#49C6C9',
      ruinStone: '#C9A27E',
    },
    grading: {
      exposure: 1.0,
      lift: [0.02, 0.0, 0.03],
      gamma: [1.0, 1.0, 1.0],
      gain: [1.08, 0.99, 0.92],
      saturation: 1.1,
      contrast: 1.05,
      splitShadow: '#8C86B8',
      splitHighlight: '#FFB070',
      splitBalance: 0.15,
      vignette: 0.28,
    },
    water: { enabled: true, shallow: '#49C6C9', deep: '#2A8E9C', depthFalloffM: 1.5, foam: '#FFFFFF', roughness: 0.04, kind: 'pools' },
    wind: { dirDeg: 260, speed: 3 },
    layers: ['traverten', 'toprak', 'ot', 'kalinti'],
    layerColors: ['#F5EDE4', '#B0906F', '#7F8350', '#C9A27E'],
    layerRoughness: [0.5, 0.9, 0.92, 0.6],
    maskNames: ['ruins', 'trees', 'flat', 'travertine'],
    bake: { sunStrength: 1.1, ambientStrength: 0.6, ambientColor: '#9A8FC0', wrap: 0.12 },
    props: {
      columns: { count: 120, mask: 'ruins', seed: 51 },
      walls: { count: 60, mask: 'ruins', seed: 53 },
      theater: { count: 1, mask: 'ruins', seed: 55 },
      junipers: { count: 1800, mask: 'trees', seed: 57 },
    },
    patch: { lat: 37.9215, lon: 29.1225, widthM: 1024, depthM: 640, res: 1024 },
  },
};
