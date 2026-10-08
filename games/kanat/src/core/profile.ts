// Player profile = progress data model persisted as `save.v1` (§2.7, §2.6 league, §4.3).
// Pure data + validation + small derived helpers. UI/modes mutate through the helpers and then call
// `saveDoc.scheduleSave()`.

import { WORLD_IDS } from '../sim/types.ts';
import type { WorldId } from '../sim/types.ts';
import type { DocSchema } from './save.ts';
import { STORAGE_KEYS } from './save.ts';

export const SAVE_VERSION = 1;

export const ROUTE_IDS: readonly string[] = (() => {
  const out: string[] = [];
  for (let w = 1; w <= 5; w++) for (let r = 1; r <= 4; r++) out.push(`w${w}r${r}`);
  return out;
})();
const ROUTE_RE = /^w[1-5]r[1-4]$/;

/** World unlock thresholds in total stars (§2.7). */
export const WORLD_UNLOCK_STARS: Readonly<Record<WorldId, number>> = {
  kapadokya: 0,
  likya: 6,
  karadeniz: 15,
  erciyes: 26,
  pamukkale: 38,
};

export type ModeId = 'career' | 'daily' | 'duel' | 'free' | 'suru';
export const MODE_IDS: readonly ModeId[] = ['career', 'daily', 'duel', 'free', 'suru'];

export type League = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export const LEAGUES: readonly League[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
export const LP_PER_LEAGUE = 300;

export type Stars = 0 | 1 | 2 | 3;

export interface RouteRecord {
  stars: Stars;
  bestScore: number;
  /** Best completed (landed) time in ms; 0 = none. */
  bestTimeMs: number;
  plays: number;
  landings: number;
  crashes: number;
  halfFlights: number;
  /** Usta Görevleri completion (3 per route). */
  tasks: [boolean, boolean, boolean];
}

export interface DailyRecord {
  /** Günün Rotası number (#1 = launch day). */
  index: number;
  bestTimeMs: number;
  stars: Stars;
  /** 5-segment proximity strip, digits 0..4 (⬜🟩🟨🟧🟥). */
  strip: string;
  assist: boolean;
  slow: boolean;
  attempts: number;
}

export interface SuitCosmetics {
  pattern: string;
  palette: string;
  trail: string;
}

export interface SuruCosmetics {
  glow: string;
  aura: string;
  trail: string;
  show: string;
}

export interface SuruRecord {
  league: League;
  /** LP inside the current league (0..300; diamond keeps counting). */
  lp: number;
  peakLeague: League;
  rounds: number;
  wins: number;
  top3: number;
  peakSize: number;
  encirclements: number;
  converted: number;
  collected: number;
  /** Sürü Günü best per day key. */
  days: Record<string, { rank: number; peak: number }>;
}

export interface FtueState {
  done: boolean;
  steps: string[];
  invertAsked: boolean;
  helpOfferDeclined: boolean;
  dynamicHelpOff: boolean;
  introducedModes: ModeId[];
}

export interface LifetimeStats {
  flights: number;
  landings: number;
  crashes: number;
  grazes: number;
  balloonLoops: number;
  gates: number;
  playSec: number;
  bestSingleScore: number;
}

export interface Profile {
  v: 1;
  createdAt: number;
  updatedAt: number;
  displayName: string;
  xp: number;
  routes: Record<string, RouteRecord>;
  daily: Record<string, DailyRecord>;
  weekly: Record<string, { score: number; done: boolean }>;
  unlockedWorlds: WorldId[];
  unlockedModes: ModeId[];
  cosmetics: { owned: string[]; suit: SuitCosmetics; suru: SuruCosmetics };
  postcards: string[];
  badges: string[];
  /** Uçuş Günlüğü: one stamp per day flown (YYYY-MM-DD, TR time). 7 stamps → reward (no streaks). */
  flightLog: { days: string[]; rewardsClaimed: number };
  suru: SuruRecord;
  ftue: FtueState;
  stats: LifetimeStats;
  /** Personal-best ghost codes (`K1.…`) keyed by route id or `daily-<n>`. */
  ghosts: Record<string, string>;
}

export function emptyRouteRecord(): RouteRecord {
  return { stars: 0, bestScore: 0, bestTimeMs: 0, plays: 0, landings: 0, crashes: 0, halfFlights: 0, tasks: [false, false, false] };
}

export function defaultProfile(nowMs = 0): Profile {
  return {
    v: 1,
    createdAt: nowMs,
    updatedAt: nowMs,
    displayName: '',
    xp: 0,
    routes: {},
    daily: {},
    weekly: {},
    unlockedWorlds: ['kapadokya'],
    unlockedModes: ['career'],
    cosmetics: {
      owned: ['pattern.default', 'palette.default', 'trail.default'],
      suit: { pattern: 'pattern.default', palette: 'palette.default', trail: 'trail.default' },
      suru: { glow: 'glow.default', aura: 'aura.default', trail: 'trail.default', show: 'show.none' },
    },
    postcards: [],
    badges: [],
    flightLog: { days: [], rewardsClaimed: 0 },
    suru: {
      league: 'bronze',
      lp: 0,
      peakLeague: 'bronze',
      rounds: 0,
      wins: 0,
      top3: 0,
      peakSize: 0,
      encirclements: 0,
      converted: 0,
      collected: 0,
      days: {},
    },
    ftue: { done: false, steps: [], invertAsked: false, helpOfferDeclined: false, dynamicHelpOff: false, introducedModes: [] },
    stats: { flights: 0, landings: 0, crashes: 0, grazes: 0, balloonLoops: 0, gates: 0, playSec: 0, bestSingleScore: 0 },
    ghosts: {},
  };
}

// ---- validation ------------------------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, def: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
const int = (v: unknown, def: number, min = 0, max = Number.MAX_SAFE_INTEGER): number => Math.round(num(v, def, min, max));
const bool = (v: unknown, def: boolean): boolean => (typeof v === 'boolean' ? v : def);
const str = (v: unknown, def: string, maxLen = 256): string => (typeof v === 'string' ? v.slice(0, maxLen) : def);
const stars = (v: unknown): Stars => int(v, 0, 0, 3) as Stars;
function strList(v: unknown, maxItems: number, filter?: (s: string) => boolean): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== 'string' || x.length > 128 || seen.has(x)) continue;
    if (filter && !filter(x)) continue;
    seen.add(x);
    out.push(x);
    if (out.length >= maxItems) break;
  }
  return out;
}
function pick<T extends string>(v: unknown, allowed: readonly T[], def: T): T {
  return allowed.includes(v as T) ? (v as T) : def;
}
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateRoute(raw: unknown): RouteRecord {
  const r = isObj(raw) ? raw : {};
  const t = Array.isArray(r.tasks) ? r.tasks : [];
  return {
    stars: stars(r.stars),
    bestScore: int(r.bestScore, 0),
    bestTimeMs: int(r.bestTimeMs, 0),
    plays: int(r.plays, 0),
    landings: int(r.landings, 0),
    crashes: int(r.crashes, 0),
    halfFlights: int(r.halfFlights, 0),
    tasks: [t[0] === true, t[1] === true, t[2] === true],
  };
}

function validateDaily(raw: unknown): DailyRecord {
  const r = isObj(raw) ? raw : {};
  const strip = typeof r.strip === 'string' && /^[0-4]{0,5}$/.test(r.strip) ? r.strip : '';
  return {
    index: int(r.index, 0),
    bestTimeMs: int(r.bestTimeMs, 0),
    stars: stars(r.stars),
    strip,
    assist: bool(r.assist, false),
    slow: bool(r.slow, false),
    attempts: int(r.attempts, 0),
  };
}

function recordOf<T>(raw: unknown, keyOk: (k: string) => boolean, item: (v: unknown) => T, max = 2000): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(raw)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (!keyOk(k) || k === '__proto__') continue;
    out[k] = item(v);
    if (++n >= max) break;
  }
  return out;
}

/** Sanitize any parsed JSON into a valid v1 Profile. Never throws. */
export function validateProfile(raw: unknown): Profile {
  const d = defaultProfile();
  const r = isObj(raw) ? raw : {};
  const cos = isObj(r.cosmetics) ? r.cosmetics : {};
  const suit = isObj(cos.suit) ? cos.suit : {};
  const sc = isObj(cos.suru) ? cos.suru : {};
  const su = isObj(r.suru) ? r.suru : {};
  const ft = isObj(r.ftue) ? r.ftue : {};
  const st = isObj(r.stats) ? r.stats : {};
  const fl = isObj(r.flightLog) ? r.flightLog : {};

  const unlockedWorlds = strList(r.unlockedWorlds, 5, (s) => (WORLD_IDS as readonly string[]).includes(s)) as WorldId[];
  if (!unlockedWorlds.includes('kapadokya')) unlockedWorlds.unshift('kapadokya');
  const unlockedModes = strList(r.unlockedModes, 5, (s) => (MODE_IDS as readonly string[]).includes(s)) as ModeId[];
  if (!unlockedModes.includes('career')) unlockedModes.unshift('career');
  const owned = strList(cos.owned, 512);
  for (const o of d.cosmetics.owned) if (!owned.includes(o)) owned.push(o);

  const league = pick(su.league, LEAGUES, 'bronze');
  const peak = pick(su.peakLeague, LEAGUES, league);

  const p: Profile = {
    v: 1,
    createdAt: int(r.createdAt, 0),
    updatedAt: int(r.updatedAt, 0),
    displayName: str(r.displayName, '', 40),
    xp: int(r.xp, 0),
    routes: recordOf(r.routes, (k) => ROUTE_RE.test(k), validateRoute, 20),
    daily: recordOf(r.daily, (k) => /^\d{1,6}$/.test(k), validateDaily, 4000),
    weekly: recordOf(
      r.weekly,
      (k) => k.length <= 32,
      (v) => {
        const o = isObj(v) ? v : {};
        return { score: int(o.score, 0), done: bool(o.done, false) };
      },
      600,
    ),
    unlockedWorlds,
    unlockedModes,
    cosmetics: {
      owned,
      suit: {
        pattern: str(suit.pattern, d.cosmetics.suit.pattern, 64),
        palette: str(suit.palette, d.cosmetics.suit.palette, 64),
        trail: str(suit.trail, d.cosmetics.suit.trail, 64),
      },
      suru: {
        glow: str(sc.glow, d.cosmetics.suru.glow, 64),
        aura: str(sc.aura, d.cosmetics.suru.aura, 64),
        trail: str(sc.trail, d.cosmetics.suru.trail, 64),
        show: str(sc.show, d.cosmetics.suru.show, 64),
      },
    },
    postcards: strList(r.postcards, 25),
    badges: strList(r.badges, 30),
    flightLog: {
      days: strList(fl.days, 4000, (s) => DAY_RE.test(s)).sort(),
      rewardsClaimed: int(fl.rewardsClaimed, 0),
    },
    suru: {
      league,
      lp: int(su.lp, 0, 0),
      peakLeague: LEAGUES.indexOf(peak) >= LEAGUES.indexOf(league) ? peak : league,
      rounds: int(su.rounds, 0),
      wins: int(su.wins, 0),
      top3: int(su.top3, 0),
      peakSize: int(su.peakSize, 0, 0, 1500),
      encirclements: int(su.encirclements, 0),
      converted: int(su.converted, 0),
      collected: int(su.collected, 0),
      days: recordOf(
        su.days,
        (k) => DAY_RE.test(k),
        (v) => {
          const o = isObj(v) ? v : {};
          return { rank: int(o.rank, 0, 0, 16), peak: int(o.peak, 0, 0, 1500) };
        },
        400,
      ),
    },
    ftue: {
      done: bool(ft.done, false),
      steps: strList(ft.steps, 64),
      invertAsked: bool(ft.invertAsked, false),
      helpOfferDeclined: bool(ft.helpOfferDeclined, false),
      dynamicHelpOff: bool(ft.dynamicHelpOff, false),
      introducedModes: strList(ft.introducedModes, 5, (s) => (MODE_IDS as readonly string[]).includes(s)) as ModeId[],
    },
    stats: {
      flights: int(st.flights, 0),
      landings: int(st.landings, 0),
      crashes: int(st.crashes, 0),
      grazes: int(st.grazes, 0),
      balloonLoops: int(st.balloonLoops, 0),
      gates: int(st.gates, 0),
      playSec: num(st.playSec, 0),
      bestSingleScore: int(st.bestSingleScore, 0),
    },
    ghosts: recordOf(
      r.ghosts,
      (k) => ROUTE_RE.test(k) || /^daily-\d{1,6}$/.test(k),
      (v) => (typeof v === 'string' && v.length <= 8000 ? v : ''),
      400,
    ),
  };
  for (const k of Object.keys(p.ghosts)) if (p.ghosts[k] === '') delete p.ghosts[k];
  // Derived unlocks can only grow: stars may unlock more worlds than were saved.
  for (const w of worldsUnlockedByStars(totalStars(p))) if (!p.unlockedWorlds.includes(w)) p.unlockedWorlds.push(w);
  return p;
}

// ---- derived helpers -------------------------------------------------------------------------

export function totalStars(p: Profile): number {
  let s = 0;
  for (const id of Object.keys(p.routes)) s += p.routes[id].stars;
  return s;
}

export function worldsUnlockedByStars(starsTotal: number): WorldId[] {
  return WORLD_IDS.filter((w) => starsTotal >= WORLD_UNLOCK_STARS[w]);
}

/** Cumulative XP needed to reach rank n (1..50). Curve decided in docs/decisions/platform.md. */
export function xpForRank(n: number): number {
  const k = Math.max(1, Math.min(50, Math.floor(n)));
  return Math.round(60 * Math.pow(k - 1, 1.75));
}

export function rankFromXp(xp: number): number {
  let r = 1;
  while (r < 50 && xp >= xpForRank(r + 1)) r++;
  return r;
}

export type RankBand = 'caylak' | 'suzulen' | 'siyirici' | 'kartal' | 'usta' | 'efsane';
export function rankBand(rank: number): RankBand {
  if (rank <= 8) return 'caylak';
  if (rank <= 16) return 'suzulen';
  if (rank <= 25) return 'siyirici';
  if (rank <= 34) return 'kartal';
  if (rank <= 43) return 'usta';
  return 'efsane';
}

/** XP formula (§2.7). */
export function xpFor(e: { score?: number; stars?: number; tasks?: number; daily?: boolean; suruRound?: number }): number {
  let xp = 0;
  if (e.score) xp += Math.floor(e.score / 1000);
  if (e.stars) xp += e.stars * 200;
  if (e.tasks) xp += e.tasks * 300;
  if (e.daily) xp += 500;
  if (e.suruRound) xp += Math.max(100, Math.min(400, e.suruRound));
  return xp;
}

/** Apply a round's LP delta: promotions carry over, never demote, never below 0 inside a league. */
export function applyLp(s: SuruRecord, delta: number): { promoted: boolean } {
  let promoted = false;
  s.lp = Math.max(0, s.lp + delta);
  while (s.lp >= LP_PER_LEAGUE && s.league !== 'diamond') {
    s.lp -= LP_PER_LEAGUE;
    s.league = LEAGUES[LEAGUES.indexOf(s.league) + 1];
    promoted = true;
  }
  if (LEAGUES.indexOf(s.league) > LEAGUES.indexOf(s.peakLeague)) s.peakLeague = s.league;
  return { promoted };
}

/** Stamp today in the flight log; returns true if it was a new day. */
export function stampFlightLog(p: Profile, dayKey: string): boolean {
  if (!DAY_RE.test(dayKey) || p.flightLog.days.includes(dayKey)) return false;
  p.flightLog.days.push(dayKey);
  p.flightLog.days.sort();
  return true;
}

/** Record a finished career flight. Returns what improved (for result screen badges). */
export function recordRouteResult(
  p: Profile,
  routeId: string,
  r: { score: number; stars: Stars; timeMs: number; landed: boolean; crashed: boolean; halfFlight: boolean; tasks?: boolean[] },
): { newBest: boolean; newStars: number } {
  if (!ROUTE_RE.test(routeId)) return { newBest: false, newStars: 0 };
  const rec = p.routes[routeId] ?? (p.routes[routeId] = emptyRouteRecord());
  rec.plays++;
  if (r.crashed) rec.crashes++;
  if (r.halfFlight) rec.halfFlights++;
  let newBest = false;
  let newStars = 0;
  if (r.landed) {
    rec.landings++;
    if (r.score > rec.bestScore) {
      rec.bestScore = r.score;
      newBest = true;
    }
    if (r.timeMs > 0 && (rec.bestTimeMs === 0 || r.timeMs < rec.bestTimeMs)) rec.bestTimeMs = r.timeMs;
    if (r.stars > rec.stars) {
      newStars = r.stars - rec.stars;
      rec.stars = r.stars;
    }
  }
  if (r.tasks) for (let i = 0; i < 3; i++) if (r.tasks[i]) rec.tasks[i] = true;
  for (const w of worldsUnlockedByStars(totalStars(p))) if (!p.unlockedWorlds.includes(w)) p.unlockedWorlds.push(w);
  return { newBest, newStars };
}

// ---- save.v1 schema + migrations ---------------------------------------------------------------

/**
 * v0 = the unversioned prototype layout `{ stars: {w1r1: 2}, best: {w1r1: 1234}, xp }`.
 * Kept as the migration chain's first link so the mechanism is exercised by tests from day one.
 */
export function migrateV0toV1(doc: Record<string, unknown>): Record<string, unknown> {
  const starsMap = isObj(doc.stars) ? doc.stars : {};
  const bestMap = isObj(doc.best) ? doc.best : {};
  const routes: Record<string, unknown> = {};
  for (const id of ROUTE_IDS) {
    if (id in starsMap || id in bestMap) {
      routes[id] = { ...emptyRouteRecord(), stars: starsMap[id], bestScore: bestMap[id], plays: 1, landings: 1 };
    }
  }
  const out: Record<string, unknown> = { ...doc, routes };
  delete out.stars;
  delete out.best;
  return out;
}

export const SAVE_SCHEMA: DocSchema<Profile> = {
  key: STORAGE_KEYS.save,
  version: SAVE_VERSION,
  migrations: { 0: migrateV0toV1 },
  validate: validateProfile,
  defaults: () => defaultProfile(Date.now()),
};
