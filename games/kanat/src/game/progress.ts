// Progress bookkeeping (integrator): applies finished flights / SÜRÜ rounds to the platform save (`save.v1`,
// src/core/profile.ts) and to the integrator's own counters document (`kanat.meta`), using the design's rules
// (src/content/meta: XP, levels, stars, unlocks, Usta tasks, badges, cosmetics). The platform validator keeps
// only known save.v1 fields, so badge counters that save.v1 does not model live in `kanat.meta`.
import type { Profile, Stars } from '../core/profile.ts';
import { emptyRouteRecord, stampFlightLog } from '../core/profile.ts';
import type { ProfileStore } from '../core/save.ts';
import { VersionedDoc } from '../core/save.ts';
import type { DocSchema } from '../core/save.ts';
import { trDayKey } from '../core/time.ts';
import { BADGES, checkBadge } from '../content/meta/badges.ts';
import { cosmetic, ALL_COSMETICS, cosmeticRef } from '../content/meta/cosmetics.ts';
import { postcardSetComplete, postcardSetReward, POSTCARDS } from '../content/meta/postcards.ts';
import { flightXp, levelForXp, modesUnlockedAt, rewardsForLevel, suruRoundXp, WORLD_UNLOCK_STARS, applySuruRound } from '../content/meta/progression.ts';
import type { MetaMode } from '../content/meta/progression.ts';
import { checkUsta, routeMeta, ROUTE_META } from '../content/meta/routes.meta.ts';
import type { BadgeContext, FlightStats, ProfileStats, RouteBenchmarks, SuruRoundStats } from '../content/meta/types.ts';
import type { WorldId } from '../sim/types.ts';
import { WORLD_IDS } from '../sim/types.ts';

// ---- integrator counters document ----------------------------------------------------------------

export interface MetaDoc {
  v: 1;
  softLandings: number;
  braveOpenings: number;
  duelWins: number;
  rematchWins: number;
  freeFlightSec: number;
  photosSaved: number;
  dailyThreeStars: number;
  ustaDone: number;
  suruRounds: number;
  lastWorld: WorldId;
  lastRoute: string;
  /** Unlock cards already shown (mode / world ids). */
  seenUnlocks: string[];
  /** Dynamic help: crashes per route section ("w1r2:3"). Reset when the route is landed. */
  sectionCrashes: Record<string, number>;
  /** Best Sürü Günü per day key → placement. */
  recentRounds: { placement: number; flocks: number }[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const n0 = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

export function defaultMeta(): MetaDoc {
  return {
    v: 1,
    softLandings: 0,
    braveOpenings: 0,
    duelWins: 0,
    rematchWins: 0,
    freeFlightSec: 0,
    photosSaved: 0,
    dailyThreeStars: 0,
    ustaDone: 0,
    suruRounds: 0,
    lastWorld: 'kapadokya',
    lastRoute: 'w1r1',
    seenUnlocks: [],
    sectionCrashes: {},
    recentRounds: [],
  };
}

export const META_SCHEMA: DocSchema<MetaDoc> = {
  key: 'kanat.meta',
  version: 1,
  migrations: { 0: (d) => d },
  defaults: defaultMeta,
  validate(raw: unknown): MetaDoc {
    const d = defaultMeta();
    const r = isObj(raw) ? raw : {};
    const sc: Record<string, number> = {};
    if (isObj(r.sectionCrashes)) for (const [k, v] of Object.entries(r.sectionCrashes)) if (/^w[1-5]r[1-4]:\d{1,2}$/.test(k)) sc[k] = Math.min(99, n0(v));
    const rr = Array.isArray(r.recentRounds)
      ? r.recentRounds
          .filter(isObj)
          .slice(-20)
          .map((x) => ({ placement: Math.max(1, Math.min(16, n0(x.placement))), flocks: Math.max(2, Math.min(16, n0(x.flocks))) }))
      : [];
    return {
      v: 1,
      softLandings: n0(r.softLandings),
      braveOpenings: n0(r.braveOpenings),
      duelWins: n0(r.duelWins),
      rematchWins: n0(r.rematchWins),
      freeFlightSec: n0(r.freeFlightSec),
      photosSaved: n0(r.photosSaved),
      dailyThreeStars: n0(r.dailyThreeStars),
      ustaDone: n0(r.ustaDone),
      suruRounds: n0(r.suruRounds),
      lastWorld: (WORLD_IDS as readonly string[]).includes(r.lastWorld as string) ? (r.lastWorld as WorldId) : d.lastWorld,
      lastRoute: typeof r.lastRoute === 'string' && /^w[1-5]r[1-4]$/.test(r.lastRoute) ? r.lastRoute : d.lastRoute,
      seenUnlocks: Array.isArray(r.seenUnlocks) ? r.seenUnlocks.filter((x): x is string => typeof x === 'string' && x.length < 32).slice(0, 64) : [],
      sectionCrashes: sc,
      recentRounds: rr,
    };
  },
};

export function createMetaDoc(store: ProfileStore): VersionedDoc<MetaDoc> {
  return new VersionedDoc<MetaDoc>(store, META_SCHEMA);
}

// ---- derived profile values ------------------------------------------------------------------------

export function totalStars(p: Profile): number {
  let s = 0;
  for (const id of Object.keys(p.routes)) s += p.routes[id].stars;
  return s;
}

/** Distinct career routes landed (≥ 1 star). */
export function routesLanded(p: Profile): number {
  let n = 0;
  for (const id of Object.keys(p.routes)) if (p.routes[id].stars >= 1) n++;
  return n;
}

export function worldStars(p: Profile, w: WorldId): number {
  let s = 0;
  for (const r of ROUTE_META) if (r.world === w) s += p.routes[r.id]?.stars ?? 0;
  return s;
}

export function isWorldUnlocked(p: Profile, w: WorldId): boolean {
  return totalStars(p) >= WORLD_UNLOCK_STARS[w] || p.unlockedWorlds.includes(w);
}

export function isRouteUnlocked(p: Profile, id: string): boolean {
  const m = routeMeta(id);
  if (!m || !isWorldUnlocked(p, m.world)) return false;
  if (m.index === 1) return true;
  return (p.routes[`w${m.worldIndex}r${m.index - 1}`]?.stars ?? 0) >= 1;
}

export function isModeUnlocked(p: Profile, mode: MetaMode): boolean {
  if (mode === 'career') return true;
  if (p.unlockedModes.includes(mode as never)) return true;
  const after: Record<string, number> = { daily: 1, suru: 1, duel: 2, free: 3, weekly: 4 };
  return routesLanded(p) >= (after[mode] ?? 99);
}

/** Route that the routes-unlock rule needs to land first for `mode` (1-based count for the UI lock text). */
export function lockRouteFor(mode: MetaMode): number {
  const after: Record<string, number> = { daily: 1, suru: 1, duel: 2, free: 3, weekly: 4 };
  return after[mode] ?? 1;
}

/** Next career route the "Devam" hero should fly. */
export function continueRoute(p: Profile, meta: MetaDoc): string {
  // first unlanded unlocked route in order; else the last played
  for (const r of ROUTE_META) {
    if (!isRouteUnlocked(p, r.id)) break;
    if ((p.routes[r.id]?.stars ?? 0) === 0) return r.id;
  }
  return meta.lastRoute;
}

export function profileStats(p: Profile, meta: MetaDoc): ProfileStats {
  const ws = {} as Record<WorldId, number>;
  const wl = {} as Record<WorldId, number>;
  const rs: Record<string, number> = {};
  for (const w of WORLD_IDS) {
    ws[w] = 0;
    wl[w] = 0;
  }
  for (const r of ROUTE_META) {
    const st = p.routes[r.id]?.stars ?? 0;
    rs[r.id] = st;
    ws[r.world] += st;
    if (st >= 1) wl[r.world]++;
  }
  const leagueIdx = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(p.suru.peakLeague);
  return {
    routesLanded: routesLanded(p),
    totalStars: totalStars(p),
    ustaDone: meta.ustaDone,
    postcards: p.postcards.length,
    stamps: p.flightLog.days.length,
    softLandings: meta.softLandings,
    braveOpenings: meta.braveOpenings,
    duelWins: meta.duelWins,
    rematchWins: meta.rematchWins,
    freeFlightSec: meta.freeFlightSec,
    photosSaved: meta.photosSaved,
    rankLevel: levelForXp(p.xp),
    leagueIndex: Math.max(0, leagueIdx),
    suruRounds: meta.suruRounds,
    dailyThreeStars: meta.dailyThreeStars,
    worldStars: ws,
    worldRoutesLanded: wl,
    routeStars: rs,
  };
}

// ---- results -----------------------------------------------------------------------------------------

export interface ProgressDelta {
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
  newStars: number;
  newBest: boolean;
  /** Usta task ids completed for the first time in this flight. */
  newTasks: string[];
  /** Usta task ids satisfied by this flight (incl. already owned). */
  tasksThisFlight: string[];
  cosmetics: string[];
  badges: string[];
  worlds: WorldId[];
  modes: MetaMode[];
  prevStars: number;
  prevBest: number;
  prevBestTimeMs: number;
}

function grantCosmetic(p: Profile, ref: string, out: string[]): void {
  if (!cosmetic(ref)) return;
  if (p.cosmetics.owned.includes(ref)) return;
  p.cosmetics.owned.push(ref);
  out.push(ref);
}

/** Starter cosmetics + defaults normalised to the integrator scheme (`pattern:x` refs, suit ids). */
export function normaliseProfile(p: Profile): void {
  for (const c of ALL_COSMETICS) if (c.source.kind === 'start') {
    const ref = cosmeticRef(c);
    if (!p.cosmetics.owned.includes(ref)) p.cosmetics.owned.push(ref);
  }
  const s = p.cosmetics.suit;
  if (s.pattern === 'pattern.default') s.pattern = '';
  if (s.palette === 'palette.default') s.palette = 'safak';
  if (s.trail === 'trail.default') s.trail = 'dumanBeyazi';
}

function finishProgress(p: Profile, meta: MetaDoc, d: ProgressDelta, flight: FlightStats | undefined, round: SuruRoundStats | undefined, nowMs: number): void {
  // level rewards
  const lvlBefore = levelForXp(d.xpBefore);
  const lvlAfter = levelForXp(p.xp);
  for (let L = lvlBefore + 1; L <= lvlAfter; L++) for (const r of rewardsForLevel(L)) if (r.kind === 'cosmetic') grantCosmetic(p, r.ref, d.cosmetics);
  d.xpAfter = p.xp;
  d.levelBefore = lvlBefore;
  d.levelAfter = lvlAfter;
  // worlds
  const ts = totalStars(p);
  for (const w of WORLD_IDS) {
    if (ts >= WORLD_UNLOCK_STARS[w] && !p.unlockedWorlds.includes(w)) {
      p.unlockedWorlds.push(w);
      d.worlds.push(w);
    }
  }
  // flight log stamp (guilt-free: any finished flight or round)
  stampFlightLog(p, trDayKey(nowMs));
  if (p.flightLog.days.length >= 7 && p.flightLog.rewardsClaimed < 1) {
    p.flightLog.rewardsClaimed = 1;
    grantCosmetic(p, 'trail:altinToz', d.cosmetics);
  }
  // badges
  const ctx: BadgeContext = { profile: profileStats(p, meta), flight, round };
  const owned = new Set(p.badges);
  for (const b of BADGES) {
    if (owned.has(b.id)) continue;
    if (checkBadge(b, ctx)) {
      p.badges.push(b.id);
      d.badges.push(b.id);
    }
  }
  p.updatedAt = nowMs;
}

function emptyDelta(p: Profile): ProgressDelta {
  return {
    xpBefore: p.xp,
    xpAfter: p.xp,
    levelBefore: levelForXp(p.xp),
    levelAfter: levelForXp(p.xp),
    newStars: 0,
    newBest: false,
    newTasks: [],
    tasksThisFlight: [],
    cosmetics: [],
    badges: [],
    worlds: [],
    modes: [],
    prevStars: 0,
    prevBest: 0,
    prevBestTimeMs: 0,
  };
}

/** Career (and duel on a career route) flight. Usta tasks count in career + duel only. */
export function applyCareerFlight(p: Profile, meta: MetaDoc, s: FlightStats, bench: RouteBenchmarks, nowMs: number, opts: { countsRecords: boolean }): ProgressDelta {
  const d = emptyDelta(p);
  const rec = p.routes[s.routeId] ?? (p.routes[s.routeId] = emptyRouteRecord());
  d.prevStars = rec.stars;
  d.prevBest = rec.bestScore;
  d.prevBestTimeMs = rec.bestTimeMs;
  const landedBefore = routesLanded(p);
  p.stats.flights++;
  p.stats.playSec += s.timeSec;
  p.stats.grazes += s.grazes;
  p.stats.balloonLoops += s.balloonThreads;
  p.stats.gates += s.gatesPassed;
  if (s.crashed) p.stats.crashes++;
  if (s.landed) p.stats.landings++;
  if (s.softLanding) meta.softLandings++;
  if (s.braveOpening) meta.braveOpenings++;
  rec.plays++;
  if (s.crashed) rec.crashes++;
  if (s.halfFlight) rec.halfFlights++;
  if (s.landed && opts.countsRecords) {
    rec.landings++;
    if (s.score > rec.bestScore) {
      rec.bestScore = Math.round(s.score);
      d.newBest = true;
    }
    const tms = Math.round(s.timeSec * 1000);
    if (rec.bestTimeMs === 0 || tms < rec.bestTimeMs) rec.bestTimeMs = tms;
    if (s.stars > rec.stars) {
      d.newStars = s.stars - rec.stars;
      rec.stars = s.stars as Stars;
    }
    if (s.score > p.stats.bestSingleScore) p.stats.bestSingleScore = Math.round(s.score);
  }
  // Usta tasks (landed flights only — checkUsta enforces the rules)
  const m = routeMeta(s.routeId);
  if (m) {
    m.usta.forEach((task, i) => {
      if (checkUsta(task, s, bench)) {
        d.tasksThisFlight.push(task.id);
        if (!rec.tasks[i]) {
          rec.tasks[i] = true;
          d.newTasks.push(task.id);
          meta.ustaDone++;
          // R1 tasks unlock one cosmetic each; R2–R4 weave the route pattern when all three are done (K-15)
          if (m.index === 1) grantCosmetic(p, task.unlocks, d.cosmetics);
          else if (rec.tasks[0] && rec.tasks[1] && rec.tasks[2]) grantCosmetic(p, task.unlocks, d.cosmetics);
        }
      }
    });
  }
  p.xp += flightXp({ score: s.score, newStars: d.newStars, newUsta: d.newTasks.length, dailyFirstFinish: false });
  // modes unlocked by landing this route (first time)
  const landedAfter = routesLanded(p);
  if (landedAfter > landedBefore) {
    for (let k = landedBefore + 1; k <= landedAfter; k++) {
      for (const mode of modesUnlockedAt(k)) {
        if (!p.unlockedModes.includes(mode as never) && (mode === 'daily' || mode === 'duel' || mode === 'free' || mode === 'suru')) {
          p.unlockedModes.push(mode);
          d.modes.push(mode);
        } else if (mode === 'weekly') d.modes.push(mode);
      }
    }
  }
  if (s.landed) {
    for (const k of Object.keys(meta.sectionCrashes)) if (k.startsWith(`${s.routeId}:`)) delete meta.sectionCrashes[k];
  }
  meta.lastRoute = s.routeId;
  meta.lastWorld = s.world;
  finishProgress(p, meta, d, s, undefined, nowMs);
  return d;
}

export function applyDailyFlight(p: Profile, meta: MetaDoc, s: FlightStats, daily: { index: number; timeMs: number; strip: string; assist: boolean }, nowMs: number): ProgressDelta {
  const d = emptyDelta(p);
  const key = String(daily.index);
  const prev = p.daily[key];
  const first = !prev || prev.bestTimeMs === 0;
  d.prevBestTimeMs = prev?.bestTimeMs ?? 0;
  d.prevStars = prev?.stars ?? 0;
  const rec = prev ?? { index: daily.index, bestTimeMs: 0, stars: 0 as Stars, strip: '', assist: false, slow: false, attempts: 0 };
  rec.attempts++;
  p.stats.flights++;
  p.stats.playSec += s.timeSec;
  if (s.landed) {
    if (rec.bestTimeMs === 0 || daily.timeMs < rec.bestTimeMs) {
      rec.bestTimeMs = daily.timeMs;
      rec.strip = daily.strip;
      rec.assist = daily.assist;
      d.newBest = true;
    }
    if (s.stars > rec.stars) {
      d.newStars = s.stars - rec.stars;
      rec.stars = s.stars as Stars;
      if (rec.stars === 3) meta.dailyThreeStars++;
    }
    p.xp += flightXp({ score: s.score, newStars: 0, newUsta: 0, dailyFirstFinish: first });
  }
  p.daily[key] = rec;
  if (s.softLanding) meta.softLandings++;
  if (s.braveOpening) meta.braveOpenings++;
  meta.lastWorld = s.world;
  finishProgress(p, meta, d, s, undefined, nowMs);
  return d;
}

export function applyFreeFlight(p: Profile, meta: MetaDoc, seconds: number, nowMs: number, flight?: FlightStats): ProgressDelta {
  const d = emptyDelta(p);
  meta.freeFlightSec += seconds;
  finishProgress(p, meta, d, flight, undefined, nowMs);
  return d;
}

export function collectPostcard(p: Profile, meta: MetaDoc, id: string, nowMs: number): ProgressDelta {
  const d = emptyDelta(p);
  if (!p.postcards.includes(id)) p.postcards.push(id);
  const pc = POSTCARDS.find((x) => x.id === id);
  if (pc && postcardSetComplete(pc.world, new Set(p.postcards))) grantCosmetic(p, postcardSetReward(pc.world), d.cosmetics);
  meta.photosSaved++;
  finishProgress(p, meta, d, undefined, undefined, nowMs);
  return d;
}

export function applySuruRoundResult(p: Profile, meta: MetaDoc, r: SuruRoundStats, sub: 'league' | 'day' | 'practice', dayKey: string, nowMs: number): ProgressDelta & { lpBefore: number; lpAfter: number; leagueBefore: number; leagueAfter: number } {
  const d = emptyDelta(p);
  const leagues = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
  const leagueBefore = leagues.indexOf(p.suru.league);
  const lpBefore = p.suru.lp;
  if (sub === 'league') {
    const next = applySuruRound({ league: leagueBefore, lp: p.suru.lp }, r.placement, r.flocks, r.sieges);
    p.suru.league = leagues[next.league];
    p.suru.lp = next.lp;
    if (next.league > leagues.indexOf(p.suru.peakLeague)) p.suru.peakLeague = leagues[next.league];
    meta.recentRounds.push({ placement: r.placement, flocks: r.flocks });
    if (meta.recentRounds.length > 20) meta.recentRounds.shift();
  }
  if (sub === 'day') {
    const prev = p.suru.days[dayKey];
    if (!prev || r.placement < prev.rank || prev.rank === 0) p.suru.days[dayKey] = { rank: r.placement, peak: r.peakSize };
  }
  p.suru.rounds++;
  if (r.placement === 1) p.suru.wins++;
  if (r.placement <= 3) p.suru.top3++;
  p.suru.peakSize = Math.max(p.suru.peakSize, r.peakSize);
  p.suru.encirclements += r.sieges;
  p.suru.converted += r.converted;
  p.suru.collected += r.wildCollected;
  meta.suruRounds++;
  p.xp += suruRoundXp(r.placement, r.flocks, sub === 'practice');
  finishProgress(p, meta, d, undefined, r, nowMs);
  return { ...d, lpBefore, lpAfter: p.suru.lp, leagueBefore, leagueAfter: leagues.indexOf(p.suru.league) };
}

export function recordDuelOutcome(meta: MetaDoc, won: boolean, rematch: boolean): void {
  if (!won) return;
  meta.duelWins++;
  if (rematch) meta.rematchWins++;
}

export { ROUTE_META };
