// UI-side content catalogue: stable ids for everything the UI names (i18n keys derive from these ids).
// Gameplay data (route geometry, thresholds) lives in src/content/** (flight/terrain agents); this file only
// fixes ids + display order + small preview swatches so screens and the i18n tables agree.
import type { WorldId } from '../sim/types.ts';

export const WORLDS: readonly WorldId[] = ['kapadokya', 'likya', 'karadeniz', 'erciyes', 'pamukkale'];
/** Stars needed to unlock each world (§2.7): W1 open, W2 6, W3 15, W4 26, W5 38. */
export const WORLD_UNLOCK_STARS: Readonly<Record<WorldId, number>> = { kapadokya: 0, likya: 6, karadeniz: 15, erciyes: 26, pamukkale: 38 };
export const MAX_STARS = 60;
export const STARS_PER_WORLD = 12;

export function worldIndex(id: WorldId): number {
  return WORLDS.indexOf(id) + 1;
}

/** Route ids w1r1 … w5r4 (§2.5) and their difficulty. */
export const ROUTE_IDS: readonly string[] = WORLDS.flatMap((_, w) => [1, 2, 3, 4].map((r) => `w${w + 1}r${r}`));
export const ROUTE_DIFFICULTY: Readonly<Record<string, number>> = {
  w1r1: 1, w1r2: 2, w1r3: 3, w1r4: 4,
  w2r1: 3, w2r2: 4, w2r3: 5, w2r4: 6,
  w3r1: 4, w3r2: 5, w3r3: 6, w3r4: 7,
  w4r1: 5, w4r2: 6, w4r3: 7, w4r4: 8,
  w5r1: 6, w5r2: 7, w5r3: 8, w5r4: 9,
};
export function routeWorld(routeId: string): WorldId {
  const w = Number(routeId.charAt(1)) - 1;
  return WORLDS[Math.max(0, Math.min(4, w))];
}

/** Postcards: 5 per world, ids w{n}p{m} (order = §2.5 list). */
export const POSTCARD_IDS: readonly string[] = WORLDS.flatMap((_, w) => [1, 2, 3, 4, 5].map((p) => `w${w + 1}p${p}`));

/** 30 badges (§2.7 examples + invented in the same tone). */
export const BADGE_IDS = [
  'firstJump', 'threeMetre', 'cloudPiercer', 'zeroContact', 'sunsetPilot', 'postcardHunter', 'flockLeader', 'encircleMaster',
  'diamondWing', 'balloonFriend', 'gateChain', 'thermalWolf', 'dawnRider', 'turquoiseShadow', 'highlandWind', 'snowBird',
  'mirrorFlight', 'bullseye', 'featherlight', 'boldOpening', 'flightLog', 'pilotOfDay', 'duelist', 'rematch',
  'sixtyStars', 'masterHands', 'legend', 'quietGlide', 'shutterbug', 'untilSunset',
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

/** Badge emblem icon (from icons.ts) per badge. */
export const BADGE_ICON: Readonly<Record<BadgeId, string>> = {
  firstJump: 'jump', threeMetre: 'proximity', cloudPiercer: 'cloud', zeroContact: 'shield', sunsetPilot: 'sun',
  postcardHunter: 'postcard', flockLeader: 'flock', encircleMaster: 'encircle', diamondWing: 'diamond', balloonFriend: 'balloon',
  gateChain: 'gate', thermalWolf: 'thermal', dawnRider: 'sunrise', turquoiseShadow: 'wave', highlandWind: 'wind', snowBird: 'snow',
  mirrorFlight: 'mirror', bullseye: 'target', featherlight: 'feather', boldOpening: 'parachute', flightLog: 'stamp',
  pilotOfDay: 'calendar', duelist: 'duel', rematch: 'rematch', sixtyStars: 'star', masterHands: 'task', legend: 'rank',
  quietGlide: 'glide', shutterbug: 'camera', untilSunset: 'sunset',
};

/** Wingsuit cosmetics (§2.7): 20 patterns, 12 palettes, 10 trails. Swatches are UI previews only. */
export const PATTERN_IDS = [
  'kilim', 'cini', 'ebru', 'periBacasi', 'turkuaz', 'geceYarisi', 'balonSeridi', 'karKristali', 'lale', 'traverten',
  'ladin', 'dalga', 'kontur', 'pusula', 'guvercin', 'yakamoz', 'mehtap', 'kizilUfuk', 'sirt', 'safak',
] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

export const PALETTES: Readonly<Record<string, readonly [string, string, string]>> = {
  safak: ['#F2A541', '#6B4E5E', '#F6E7D0'],
  turkuaz: ['#2EC4C6', '#0B4F6C', '#E9D8B4'],
  yayla: ['#8DB580', '#1F3B2C', '#DDE3E0'],
  buzul: ['#9FD3F0', '#1F4E8C', '#FFF6EC'],
  gunBatimi: ['#F2795C', '#2B2D5B', '#FFC27A'],
  gece: ['#2B3A55', '#0E141C', '#9FB3D1'],
  tuf: ['#D9B48F', '#7A5A48', '#F4E6D2'],
  bakir: ['#B8653A', '#3A2A22', '#E8C3A0'],
  lavanta: ['#9AA7C7', '#4B4466', '#ECE7F4'],
  zeytin: ['#7C8350', '#33361F', '#E3E0C4'],
  kum: ['#E9D8B4', '#9C7A4C', '#FFFFFF'],
  komur: ['#2A2C30', '#121316', '#E5484D'],
};
export const PALETTE_IDS = Object.keys(PALETTES);

export const TRAILS: Readonly<Record<string, string>> = {
  dumanBeyazi: '#F5F1E8',
  altinToz: '#F2C14E',
  ebruAkisi: '#5FB3C9',
  buzKristali: '#BFE6F2',
  kirlangic: '#3A4A66',
  laleYapragi: '#E5484D',
  turkuazKopuk: '#2EC4C6',
  sisTulu: '#DDE3E0',
  brulorIsigi: '#F28C28',
  maviSaat: '#6C7BD9',
};
export const TRAIL_IDS = Object.keys(TRAILS);

/** Pilot rank bands (§2.7). */
export const RANK_BANDS: readonly { from: number; to: number }[] = [
  { from: 1, to: 8 }, { from: 9, to: 16 }, { from: 17, to: 25 }, { from: 26, to: 34 }, { from: 35, to: 43 }, { from: 44, to: 50 },
];
export function rankBand(level: number): number {
  for (let i = 0; i < RANK_BANDS.length; i++) if (level <= RANK_BANDS[i].to) return i;
  return RANK_BANDS.length - 1;
}

/** SÜRÜ.io leagues: Bronz → Elmas, 300 LP each. */
export const LEAGUE_COUNT = 5;
export const LP_PER_LEAGUE = 300;
/** AI flock names (nature words, never real people). i18n key: flock.<i>. */
export const FLOCK_NAME_COUNT = 16;

export const PHOTO_FILTERS = ['natural', 'golden', 'documentary', 'postcard', 'coldMorning', 'bw'] as const;
export type PhotoFilter = (typeof PHOTO_FILTERS)[number];

export const LOADING_TIP_COUNT = 10;
