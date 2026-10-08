// Meta progression (§2.7): Pilot Rütbesi XP + levels 1–50 + title bands + per-level rewards, world/route/mode
// unlocks (§2.7, §2.9), star rules (§2.5), SÜRÜ.io league (§2.6), Haftanın Rotası modifiers and the
// guilt-free Uçuş Günlüğü. PURE data + helpers (no Date/Math.random; callers pass calendar indices).

import type { WorldId } from '../../sim/types.ts';
import type { Bilingual, CosmeticRef } from './types.ts';
import { ALL_COSMETICS, cosmeticRef, WEEKLY_TINTS } from './cosmetics.ts';
import { ROUTE_META, WORLD_META } from './routes.meta.ts';
import { SURU } from '../../modes/suru/sim/config.ts';

// ---------------------------------------------------------------------------------------------
// XP (§2.7: XP = puan/1.000 + yıldız×200 + Usta×300 + Günün Rotası×500 + SÜRÜ turu 100–400)
// ---------------------------------------------------------------------------------------------

export const XP_RULES = {
  scoreDivisor: 1000,
  /** Per NEW star only (stars are one-time; replays never re-award them). */
  perNewStar: 200,
  perUsta: 300,
  /** First Günün Rotası finish of the (Europe/Istanbul) day. Further attempts give score XP only. */
  dailyFirstFinish: 500,
  suruMin: 100,
  suruMax: 400,
  /** Antrenman rounds (only Ürkek/Toplayıcı AI) are a flat minimum — no farming against weak AI. */
  suruPractice: 100,
} as const;

export interface FlightXpInput {
  score: number;
  newStars: number;
  newUsta: number;
  dailyFirstFinish: boolean;
}

/** XP for one finished flight (career, weekly, duel, daily). Free flight gives no XP. */
export function flightXp(i: FlightXpInput): number {
  return (
    Math.floor(Math.max(0, i.score) / XP_RULES.scoreDivisor) +
    XP_RULES.perNewStar * i.newStars +
    XP_RULES.perUsta * i.newUsta +
    (i.dailyFirstFinish ? XP_RULES.dailyFirstFinish : 0)
  );
}

/** SÜRÜ.io round XP: 1st → 400 … last → 100, linear in placement. */
export function suruRoundXp(placement: number, flocks: number, practice = false): number {
  if (practice) return XP_RULES.suruPractice;
  const nFlocks = Math.max(2, flocks);
  const p = Math.min(Math.max(1, placement), nFlocks);
  return XP_RULES.suruMin + Math.round(((XP_RULES.suruMax - XP_RULES.suruMin) * (nFlocks - p)) / (nFlocks - 1));
}

// ---------------------------------------------------------------------------------------------
// Level curve: cumulative XP(L) = round10(a·n + b·n²), n = L − 1.
//   L2 = 400 (FTUE flight with ⭐⭐), L5 = 1.800 (≈ first 15 min), L35 = 33.150 (≈ 14 days of regular play),
//   L44 = 48.700 (Efsane), L50 = 60.640. Increments grow by 35 XP per level → strictly increasing.
// ---------------------------------------------------------------------------------------------

export const LEVEL_CURVE = { a: 380, b: 17.5, roundTo: 10, maxLevel: 50 } as const;

function curve(level: number): number {
  const nn = level - 1;
  const raw = LEVEL_CURVE.a * nn + LEVEL_CURVE.b * nn * nn;
  return Math.round(raw / LEVEL_CURVE.roundTo) * LEVEL_CURVE.roundTo;
}

/** XP_THRESHOLDS[L − 1] = cumulative XP needed to reach level L (L = 1..50). */
export const XP_THRESHOLDS: readonly number[] = Array.from({ length: LEVEL_CURVE.maxLevel }, (_, i) => curve(i + 1));

export function xpForLevel(level: number): number {
  const l = Math.min(Math.max(1, Math.floor(level)), LEVEL_CURVE.maxLevel);
  return XP_THRESHOLDS[l - 1];
}

export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) if (xp >= XP_THRESHOLDS[i]) lvl = i + 1;
  return lvl;
}

/** HUD helper: level, XP into the level, XP span of the level (0 at max level). */
export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelForXp(xp);
  if (level >= LEVEL_CURVE.maxLevel) return { level, into: xp - xpForLevel(level), span: 0 };
  const base = xpForLevel(level);
  return { level, into: xp - base, span: xpForLevel(level + 1) - base };
}

// ---------------------------------------------------------------------------------------------
// Titles (§2.7)
// ---------------------------------------------------------------------------------------------

export interface TitleBand {
  id: string;
  from: number;
  to: number;
  name: Bilingual;
}

export const TITLE_BANDS: readonly TitleBand[] = [
  { id: 'caylak', from: 1, to: 8, name: { tr: 'Çaylak', en: 'Rookie' } },
  { id: 'suzulen', from: 9, to: 16, name: { tr: 'Süzülen', en: 'Glider' } },
  { id: 'siyirici', from: 17, to: 25, name: { tr: 'Sıyırıcı', en: 'Skimmer' } },
  { id: 'kartal', from: 26, to: 34, name: { tr: 'Kartal', en: 'Eagle' } },
  { id: 'usta', from: 35, to: 43, name: { tr: 'Usta', en: 'Master' } },
  { id: 'efsane', from: 44, to: 50, name: { tr: 'Efsane', en: 'Legend' } },
];

export function titleForLevel(level: number): TitleBand {
  for (const t of TITLE_BANDS) if (level <= t.to) return t;
  return TITLE_BANDS[TITLE_BANDS.length - 1];
}

// ---------------------------------------------------------------------------------------------
// Per-level rewards (§2.7 "her seviye bir şey verir"): levels 2..50 each grant exactly one thing —
// a new title at the first level of each band, otherwise the cosmetic whose source is that rank level.
// ---------------------------------------------------------------------------------------------

export type LevelReward = { level: number; kind: 'title'; title: string } | { level: number; kind: 'cosmetic'; ref: CosmeticRef };

function buildLevelRewards(): LevelReward[] {
  const out: LevelReward[] = [];
  for (let level = 2; level <= LEVEL_CURVE.maxLevel; level++) {
    const band = TITLE_BANDS.find((t) => t.from === level);
    if (band) out.push({ level, kind: 'title', title: band.id });
    for (const c of ALL_COSMETICS) {
      if (c.source.kind === 'rank' && c.source.level === level) out.push({ level, kind: 'cosmetic', ref: cosmeticRef(c) });
    }
  }
  return out;
}

export const LEVEL_REWARDS: readonly LevelReward[] = buildLevelRewards();

export function rewardsForLevel(level: number): readonly LevelReward[] {
  return LEVEL_REWARDS.filter((r) => r.level === level);
}

// ---------------------------------------------------------------------------------------------
// Stars (§2.5) and unlocks (§2.7, §2.9)
// ---------------------------------------------------------------------------------------------

export const CAREER_STARS = {
  /** ⭐⭐ score ≥ 0.50 × expert bot; ⭐⭐⭐ ≥ 0.85 × expert bot (⭐ = landed in the zone under canopy). */
  star2Ratio: 0.5,
  star3Ratio: 0.85,
} as const;

export function careerStars(landed: boolean, score: number, expertScore: number): number {
  if (!landed) return 0;
  if (score >= CAREER_STARS.star3Ratio * expertScore) return 3;
  if (score >= CAREER_STARS.star2Ratio * expertScore) return 2;
  return 1;
}

export const WORLD_UNLOCK_STARS: Readonly<Record<WorldId, number>> = {
  kapadokya: WORLD_META[0].unlockStars,
  likya: WORLD_META[1].unlockStars,
  karadeniz: WORLD_META[2].unlockStars,
  erciyes: WORLD_META[3].unlockStars,
  pamukkale: WORLD_META[4].unlockStars,
};

export function worldUnlocked(world: WorldId, totalStars: number): boolean {
  return totalStars >= WORLD_UNLOCK_STARS[world];
}

/** Inside an unlocked world R1 is open; R(n+1) opens once R(n) has ≥ 1 star (landed). */
export function routeUnlocked(routeId: string, totalStars: number, routeStars: Readonly<Record<string, number>>): boolean {
  const r = ROUTE_META.find((m) => m.id === routeId);
  if (!r || !worldUnlocked(r.world, totalStars)) return false;
  if (r.index === 1) return true;
  return (routeStars[`w${r.worldIndex}r${r.index - 1}`] ?? 0) >= 1;
}

export type MetaMode = 'career' | 'daily' | 'suru' | 'duel' | 'free' | 'weekly';

/** Mode unlocks by number of career routes landed (§2.9). An incoming duel code opens the duel at once. */
export const MODE_UNLOCKS: readonly { mode: MetaMode; afterRoutes: number }[] = [
  { mode: 'career', afterRoutes: 0 },
  { mode: 'daily', afterRoutes: 1 },
  { mode: 'suru', afterRoutes: 1 },
  { mode: 'duel', afterRoutes: 2 },
  { mode: 'free', afterRoutes: 3 },
  { mode: 'weekly', afterRoutes: 4 },
];

export function modeUnlocked(mode: MetaMode, routesLanded: number, incomingDuelCode = false): boolean {
  if (mode === 'duel' && incomingDuelCode) return true;
  const u = MODE_UNLOCKS.find((m) => m.mode === mode);
  return u !== undefined && routesLanded >= u.afterRoutes;
}

/** Modes whose one-sentence intro card should show right after landing route #`routesLanded` for the first time. */
export function modesUnlockedAt(routesLanded: number): MetaMode[] {
  return MODE_UNLOCKS.filter((m) => m.afterRoutes === routesLanded && m.afterRoutes > 0).map((m) => m.mode);
}

// ---------------------------------------------------------------------------------------------
// Günün Rotası (§2.5 Mod 2, §4.G.7)
// ---------------------------------------------------------------------------------------------

export const DAILY_RULES = {
  seedPrefix: 'KANAT-GR-',
  utcOffsetHours: 3,
  /** Monday … Sunday (index 0 = Monday): 3 → 7. */
  difficultyByWeekday: [3, 4, 4, 5, 6, 6, 7] as readonly number[],
  gates: [12, 20] as readonly number[],
  gateSpacingSec: [6, 12] as readonly number[],
  thermals: [1, 3] as readonly number[],
  windMax: 6,
  botTimeSec: [90, 150] as readonly number[],
  minProximityChances: 3,
  minGateClearanceM: 4,
  missedGatePenaltySec: 2,
  star2TimeRatio: 1.12,
  star3TimeRatio: 1.03,
  star3MinX3Sec: 15,
} as const;

export function dailyDifficulty(weekdayMon0: number): number {
  const i = ((Math.floor(weekdayMon0) % 7) + 7) % 7;
  return DAILY_RULES.difficultyByWeekday[i];
}

/** Daily stars from the penalised time (raw + 2 s per missed gate). */
export function dailyStars(finished: boolean, rawTimeSec: number, gatesMissed: number, botTimeSec: number, x3PlusSec: number): number {
  if (!finished) return 0;
  const t = rawTimeSec + DAILY_RULES.missedGatePenaltySec * gatesMissed;
  if (t <= DAILY_RULES.star3TimeRatio * botTimeSec && x3PlusSec >= DAILY_RULES.star3MinX3Sec) return 3;
  if (t <= DAILY_RULES.star2TimeRatio * botTimeSec) return 2;
  return 1;
}

// ---------------------------------------------------------------------------------------------
// SÜRÜ.io league (§2.6). LP numbers come from the SÜRÜ sim config (single source of truth).
// ---------------------------------------------------------------------------------------------

export interface LeagueDef {
  id: string;
  name: Bilingual;
  /** AI difficulty (§2.6 targets: reaction 450 → 180 ms mean, decisions 4 → 10 Hz; §4.G.10 noise/ring scales).
   *  Offset is added to each personality's base reaction (mean base 230 ms). */
  aiReactionOffsetMs: number;
  aiDecisionEveryTicks: number; // at 30 Hz: 7 → 4.3 Hz … 3 → 10 Hz
  aiNoiseDeg: number;
  aiRingMul: number;
}

export const LEAGUES: readonly LeagueDef[] = [
  { id: 'bronz', name: { tr: 'Bronz', en: 'Bronze' }, aiReactionOffsetMs: 220, aiDecisionEveryTicks: 7, aiNoiseDeg: 15, aiRingMul: 0.5 },
  { id: 'gumus', name: { tr: 'Gümüş', en: 'Silver' }, aiReactionOffsetMs: 150, aiDecisionEveryTicks: 6, aiNoiseDeg: 12, aiRingMul: 0.7 },
  { id: 'altin', name: { tr: 'Altın', en: 'Gold' }, aiReactionOffsetMs: 85, aiDecisionEveryTicks: 5, aiNoiseDeg: 9, aiRingMul: 0.85 },
  { id: 'platin', name: { tr: 'Platin', en: 'Platinum' }, aiReactionOffsetMs: 15, aiDecisionEveryTicks: 4, aiNoiseDeg: 6.5, aiRingMul: 1.0 },
  { id: 'elmas', name: { tr: 'Elmas', en: 'Diamond' }, aiReactionOffsetMs: -50, aiDecisionEveryTicks: 3, aiNoiseDeg: 4, aiRingMul: 1.2 },
];

export const LEAGUE_RULES = {
  lpPerLeague: SURU.LEAGUE_SIZE,
  lpTable16: SURU.LP_TABLE as readonly number[],
  siegeLp: SURU.LP_SIEGE,
  siegeLpCap: SURU.LP_SIEGE_CAP,
} as const;

/** LP for a placement among `flocks` (12–16): placements are mapped onto the 16-slot table. */
export function lpForPlacement(placement: number, flocks: number): number {
  const nFlocks = Math.min(16, Math.max(2, flocks));
  const p = Math.min(Math.max(1, placement), nFlocks);
  const p16 = Math.round(1 + ((p - 1) * 15) / (nFlocks - 1));
  return LEAGUE_RULES.lpTable16[p16 - 1];
}

export interface LeagueState {
  league: number; // 0 Bronz … 4 Elmas
  lp: number; // LP inside the current league (Elmas: unbounded rating)
}

/** Apply one Lig Maçı result. No demotion, LP never below 0 inside a league, overflow carries on promotion. */
export function applySuruRound(state: LeagueState, placement: number, flocks: number, sieges: number): LeagueState {
  const siegeBonus = Math.min(LEAGUE_RULES.siegeLp * Math.max(0, sieges), LEAGUE_RULES.siegeLpCap);
  let league = state.league;
  let lp = Math.max(0, state.lp + lpForPlacement(placement, flocks) + siegeBonus);
  while (league < LEAGUES.length - 1 && lp >= LEAGUE_RULES.lpPerLeague) {
    lp -= LEAGUE_RULES.lpPerLeague;
    league++;
  }
  return { league, lp };
}

// ---------------------------------------------------------------------------------------------
// Haftanın Rotası (§2.7): a career route + a modifier that needs no new art. Week k starts Monday 00:00 TRT.
// ---------------------------------------------------------------------------------------------

export type WeeklyModifierId = 'ruzgarliGun' | 'sisPerdesi' | 'tersYon' | 'termalAvi';

export interface WeeklyModifier {
  id: WeeklyModifierId;
  name: Bilingual;
  desc: Bilingual;
  /** Routes the modifier may run on (Ters Yön needs a balloon start at the old landing → W1/W5 only). */
  eligible: readonly string[];
  params: Readonly<Record<string, number>>;
}

const ALL_ROUTES = ROUTE_META.map((r) => r.id);

export const WEEKLY_MODIFIERS: readonly WeeklyModifier[] = [
  {
    id: 'ruzgarliGun',
    name: { tr: 'Rüzgârlı Gün', en: 'Windy Day' },
    desc: { tr: '6 m/sn yan rüzgâr: çizgini rüzgâra göre kur.', en: '6 m/s crosswind: set your line into the wind.' },
    eligible: ALL_ROUTES,
    /** Crosswind perpendicular to the route's mean heading; side = +1 on even weeks, −1 on odd. */
    params: { windSpeed: 6 },
  },
  {
    id: 'sisPerdesi',
    name: { tr: 'Sis Perdesi', en: 'Fog Curtain' },
    desc: { tr: 'Görüş 250 m: kapılar sisin içinden belirir.', en: 'Visibility 250 m: gates appear out of the fog.' },
    eligible: ALL_ROUTES,
    params: { visibilityM: 250 },
  },
  {
    id: 'tersYon',
    name: { tr: 'Ters Yön', en: 'Reverse Run' },
    desc: { tr: 'Rota tersten, yeni kapılarla.', en: 'The route in reverse, with new gates.' },
    eligible: ROUTE_META.filter((r) => r.startType === 'balon').map((r) => r.id),
    params: { reversed: 1 },
  },
  {
    id: 'termalAvi',
    name: { tr: 'Termal Avı', en: 'Thermal Hunt' },
    desc: { tr: '+2 termal, her girişte ×3 bonus.', en: '+2 thermals, ×3 bonus on every entry.' },
    eligible: ALL_ROUTES,
    params: { extraThermals: 2, thermalBonusMul: 3, thermalW0Add: 1 },
  },
];

export const WEEKLY_RULES = {
  seedPrefix: 'KANAT-HR-',
  /** Reward: first landing with ≥ 2 stars under the modifier → trail:kirlangic (once) + that week's tint. */
  rewardMinStars: 2,
  firstReward: 'trail:kirlangic' as CosmeticRef,
  /** Weekly routes ignore world locks (a taste of the next world, like duel codes). */
  ignoresWorldLock: true,
} as const;

/** FNV-1a 32-bit (deterministic, integer-only). */
export function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function weeklyFor(weekIndex: number): { weekIndex: number; modifier: WeeklyModifier; routeId: string; tintId: string; windSide: 1 | -1 } {
  const k = Math.max(0, Math.floor(weekIndex));
  const modifier = WEEKLY_MODIFIERS[k % WEEKLY_MODIFIERS.length];
  // Each modifier walks its eligible routes with stride 7 (coprime with 20 and 8) from a seeded offset,
  // so a modifier never repeats a route before it has visited all of them.
  const len = modifier.eligible.length;
  const cycle = Math.floor(k / WEEKLY_MODIFIERS.length);
  const pick = (fnv1a32(`${WEEKLY_RULES.seedPrefix}${modifier.id}`) + cycle * 7) % len;
  return {
    weekIndex: k,
    modifier,
    routeId: modifier.eligible[pick],
    tintId: WEEKLY_TINTS[k % WEEKLY_TINTS.length].id,
    windSide: k % 2 === 0 ? 1 : -1,
  };
}

// ---------------------------------------------------------------------------------------------
// Uçuş Günlüğü (§2.7): one stamp per TRT calendar day with ≥ 1 finished flight or SÜRÜ round.
// Stamps never need to be consecutive; there is no "streak broken" message anywhere.
// ---------------------------------------------------------------------------------------------

export const FLIGHT_LOG = {
  stampsPerPage: 7,
  rewards: [{ stamps: 7, ref: 'trail:altinToz' as CosmeticRef }],
} as const;

/** Add today's stamp (dayNumber = TRT day index). Returns the new stamp list (sorted, unique). */
export function addStamp(stamps: readonly number[], dayNumber: number): number[] {
  if (stamps.includes(dayNumber)) return [...stamps];
  return [...stamps, dayNumber].sort((x, y) => x - y);
}
