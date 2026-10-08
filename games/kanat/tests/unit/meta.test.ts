// Schema + balance validation for src/content/meta (game-design data). Pure Node, no DOM.
import { describe, expect, it } from 'vitest';
import {
  ALL_COSMETICS,
  BADGES,
  CAREER_STARS,
  GHOST_TINTS,
  LEVEL_CURVE,
  LEVEL_REWARDS,
  MENU_TIMES,
  MODE_UNLOCKS,
  PALETTES,
  PHOTO_FILTER_UNLOCKS,
  POSTCARDS,
  ROUTE_IDS,
  ROUTE_META,
  RULINGS,
  STARTER_UNLOCKS,
  SUIT_PATTERNS,
  SURU_AURAS,
  SURU_GLOWS,
  SURU_SHOWS,
  SURU_TRAILS,
  TITLE_BANDS,
  TRAILS,
  USTA_TASKS,
  WEEKLY_MODIFIERS,
  WORLD_META,
  WORLD_UNLOCK_STARS,
  XP_THRESHOLDS,
  applySuruRound,
  badge,
  careerStars,
  checkBadge,
  checkUsta,
  cosmetic,
  cosmeticRef,
  createFlightStatsTracker,
  dailyStars,
  flightXp,
  levelForXp,
  lpForPlacement,
  modeUnlocked,
  postcardSetReward,
  routeUnlocked,
  suruRoundXp,
  titleForLevel,
  ustaI18n,
  weeklyFor,
  xpForLevel,
} from '../../src/content/meta/index.ts';
import type { FlightStats, ProfileStats } from '../../src/content/meta/index.ts';
import { WORLD_IDS } from '../../src/sim/types.ts';
import type { FlightState } from '../../src/sim/types.ts';
import { TUNING } from '../../src/sim/data/tuning.ts';
import { SURU } from '../../src/modes/suru/sim/config.ts';
import { BADGE_IDS, PALETTE_IDS, PATTERN_IDS, POSTCARD_IDS, TRAIL_IDS, ROUTE_DIFFICULTY } from '../../src/ui/content.ts';

function unique(xs: readonly string[]): boolean {
  return new Set(xs).size === xs.length;
}

function flight(over: Partial<FlightStats> = {}): FlightStats {
  return {
    routeId: 'w1r2',
    world: 'kapadokya',
    mode: 'career',
    landed: true,
    halfFlight: false,
    crashed: false,
    stars: 2,
    score: 30000,
    timeSec: 80,
    grazes: 0,
    x5TotalSec: 0,
    maxX5StreakSec: 0,
    x3PlusTotalSec: 0,
    balloonThreads: 0,
    maxThreadChain: 0,
    gatesTotal: 10,
    gatesPassed: 8,
    gatesMissed: 2,
    maxGateChain: 4,
    thermalsEntered: 1,
    contacts: 1,
    landingDist: 8,
    softLanding: false,
    braveOpening: false,
    autoParachute: false,
    waterSkimSec: 0,
    assist: 'off',
    slowMode: false,
    ...over,
  };
}

function profile(over: Partial<ProfileStats> = {}): ProfileStats {
  const zero = { kapadokya: 0, likya: 0, karadeniz: 0, erciyes: 0, pamukkale: 0 };
  return {
    routesLanded: 0,
    totalStars: 0,
    ustaDone: 0,
    postcards: 0,
    stamps: 0,
    softLandings: 0,
    braveOpenings: 0,
    duelWins: 0,
    rematchWins: 0,
    freeFlightSec: 0,
    photosSaved: 0,
    rankLevel: 1,
    leagueIndex: 0,
    dailyThreeStars: 0,
    worldStars: zero,
    worldRoutesLanded: zero,
    routeStars: {},
    ...over,
  };
}

describe('routes meta', () => {
  it('has exactly 20 routes w1r1…w5r4 with brief difficulties', () => {
    expect(ROUTE_META).toHaveLength(20);
    expect(unique(ROUTE_IDS)).toBe(true);
    const expected = [1, 2, 3, 4, 3, 4, 5, 6, 4, 5, 6, 7, 5, 6, 7, 8, 6, 7, 8, 9];
    expect(ROUTE_META.map((r) => r.difficulty)).toEqual(expected);
    for (const r of ROUTE_META) {
      expect(r.id).toBe(`w${r.worldIndex}r${r.index}`);
      expect(r.world).toBe(WORLD_IDS[r.worldIndex - 1]);
      expect(ROUTE_DIFFICULTY[r.id]).toBe(r.difficulty);
      expect(r.name.tr.length).toBeGreaterThan(2);
      expect(r.name.en.length).toBeGreaterThan(2);
      expect(r.targetDurationSec[0]).toBeGreaterThanOrEqual(60);
      expect(r.targetDurationSec[1]).toBeLessThanOrEqual(120);
    }
  });

  it('follows the §2.10 world ramps (gate radius 14→9, thermals 3→1, wind 0→4)', () => {
    expect(WORLD_META.map((w) => w.gateRadius)).toEqual([14, 12.75, 11.5, 10.25, 9]);
    expect(WORLD_META.map((w) => w.thermalCount)).toEqual([3, 2, 2, 1, 1]);
    expect(WORLD_META.map((w) => w.windSpeed)).toEqual([0, 1.5, 3, 4, 4]);
    expect(WORLD_META.map((w) => w.startType)).toEqual(['balon', 'ucurum', 'sirt', 'sirt', 'balon']);
    for (let i = 1; i < WORLD_META.length; i++) {
      expect(WORLD_META[i].gateRadius).toBeLessThan(WORLD_META[i - 1].gateRadius);
      expect(WORLD_META[i].thermalCount).toBeLessThanOrEqual(WORLD_META[i - 1].thermalCount);
      expect(WORLD_META[i].windSpeed).toBeGreaterThanOrEqual(WORLD_META[i - 1].windSpeed);
    }
    const guided = ROUTE_META.filter((r) => r.guideWindDefault).map((r) => r.id);
    expect(guided).toEqual(['w1r1', 'w1r2', 'w1r3']);
  });

  it('has exactly 3 Usta tasks per route (60 total), unique ids, ordered slots, feasible features', () => {
    expect(USTA_TASKS).toHaveLength(60);
    expect(unique(USTA_TASKS.map((t) => t.id))).toBe(true);
    const types = new Set(USTA_TASKS.map((t) => t.type));
    expect(types.size).toBe(12);
    for (const r of ROUTE_META) {
      expect(r.usta).toHaveLength(3);
      expect(r.usta.map((t) => t.slot)).toEqual([1, 2, 3]);
      expect(new Set(r.usta.map((t) => t.type)).size).toBe(3);
      for (const t of r.usta) {
        expect(t.routeId).toBe(r.id);
        expect(cosmetic(t.unlocks)).toBeDefined();
        if (t.type === 'balloonThread') {
          expect(r.features).toContain('balloons');
          expect(r.minBalloonPairs).toBeGreaterThanOrEqual(t.value + 2);
        }
        if (t.type === 'gatesChain') expect(r.minGates).toBeGreaterThanOrEqual(t.value + 2);
        if (t.type === 'scoreOver' || t.type === 'timeUnder') {
          expect(t.value).toBeGreaterThan(0.85);
          expect(t.value).toBeLessThanOrEqual(1.1);
        }
      }
    }
  });

  it('R1 tasks unlock one item each; R2–R4 tasks weave one pattern per route', () => {
    for (const r of ROUTE_META) {
      const refs = r.usta.map((t) => t.unlocks);
      if (r.index === 1) {
        expect(unique(refs)).toBe(true);
        for (const ref of refs) expect(ref.startsWith('palette:') || ref.startsWith('trail:')).toBe(true);
      } else {
        expect(new Set(refs).size).toBe(1);
        expect(refs[0].startsWith('pattern:')).toBe(true);
      }
    }
  });

  it('evaluates Usta tasks from a flight record', () => {
    const grazeTask = ROUTE_META[1].usta[0]; // w1r2 grazes 2
    expect(checkUsta(grazeTask, flight({ grazes: 2 }))).toBe(true);
    expect(checkUsta(grazeTask, flight({ grazes: 1 }))).toBe(false);
    expect(checkUsta(grazeTask, flight({ grazes: 5, landed: false }))).toBe(false);
    expect(checkUsta(grazeTask, flight({ grazes: 5, mode: 'weekly' }))).toBe(false);
    const score = USTA_TASKS.find((t) => t.type === 'scoreOver');
    expect(score).toBeDefined();
    if (score) {
      const f = flight({ routeId: score.routeId, score: 50000 });
      expect(checkUsta(score, f)).toBe(false); // no benchmark → never true
      expect(checkUsta(score, f, { expertScore: 40000, expertTimeSec: 90 })).toBe(true);
      expect(ustaI18n(score, { expertScore: 40000, expertTimeSec: 90 }).params.value).toBe(Math.ceil(score.value * 40000));
    }
    const brave = USTA_TASKS.find((t) => t.type === 'braveOpening');
    if (brave) expect(checkUsta(brave, flight({ routeId: brave.routeId, braveOpening: true, autoParachute: true }))).toBe(false);
  });
});

describe('cosmetics', () => {
  it('has 20 patterns, 12 palettes, 10 trails with ids shared with the UI catalogue', () => {
    expect(SUIT_PATTERNS).toHaveLength(20);
    expect(PALETTES).toHaveLength(12);
    expect(TRAILS).toHaveLength(10);
    expect([...SUIT_PATTERNS.map((p) => p.id)].sort()).toEqual([...PATTERN_IDS].sort());
    expect([...PALETTES.map((p) => p.id)].sort()).toEqual([...PALETTE_IDS].sort());
    expect([...TRAILS.map((p) => p.id)].sort()).toEqual([...TRAIL_IDS].sort());
    const names = SUIT_PATTERNS.map((p) => p.name.tr);
    for (const must of ['Kilim', 'Çini', 'Ebru', 'Peri Bacası', 'Turkuaz', 'Gece Yarısı', 'Balon Şeridi', 'Kar Kristali']) expect(names).toContain(must);
    const trailNames = TRAILS.map((t) => t.name.tr);
    for (const must of ['Duman Beyazı', 'Altın Toz', 'Ebru Akışı', 'Buz Kristali', 'Kırlangıç']) expect(trailNames).toContain(must);
  });

  it('has SÜRÜ cosmetics 8/8/8/6 and the rank extras', () => {
    expect(SURU_GLOWS).toHaveLength(8);
    expect(SURU_AURAS).toHaveLength(8);
    expect(SURU_TRAILS).toHaveLength(8);
    expect(SURU_SHOWS).toHaveLength(6);
    expect(SURU_SHOWS.map((s) => s.name.tr).sort()).toEqual(['Dalga', 'Kalp', 'Kanat', 'Lale', 'Sarmal', 'Sonsuzluk']);
    expect(PHOTO_FILTER_UNLOCKS).toHaveLength(6);
    expect(GHOST_TINTS.length).toBeGreaterThan(1);
    expect(MENU_TIMES.length).toBeGreaterThan(1);
  });

  it('every cosmetic has a valid, consistent source; refs are globally unique', () => {
    const refs = ALL_COSMETICS.map(cosmeticRef);
    expect(unique(refs)).toBe(true);
    const taskIds = new Set(USTA_TASKS.map((t) => t.id));
    for (const c of ALL_COSMETICS) {
      expect(c.name.tr.length).toBeGreaterThan(1);
      expect(c.name.en.length).toBeGreaterThan(1);
      const s = c.source;
      expect(['start', 'usta', 'rank', 'postcards', 'weekly', 'log']).toContain(s.kind);
      if (s.kind === 'usta') {
        expect(s.taskIds.length).toBeGreaterThan(0);
        for (const id of s.taskIds) {
          expect(taskIds.has(id)).toBe(true);
          expect(USTA_TASKS.find((t) => t.id === id)?.unlocks).toBe(cosmeticRef(c));
        }
      }
      if (s.kind === 'rank') {
        expect(s.level).toBeGreaterThanOrEqual(2);
        expect(s.level).toBeLessThanOrEqual(50);
      }
    }
    // Each kind has exactly one starter item except patterns (starter suit is plain).
    const starterKinds = STARTER_UNLOCKS.map((r) => r.split(':')[0]);
    expect(unique(starterKinds)).toBe(true);
    expect(starterKinds).not.toContain('pattern');
    // Every Usta reward is a real cosmetic and each usta-sourced cosmetic is reachable.
    for (const t of USTA_TASKS) expect(cosmetic(t.unlocks)?.source.kind).toBe('usta');
    // Source mix for the suit (§2.7): usta 15 patterns + 9 palettes + 6 trails, 5 postcard patterns.
    const count = (kind: string, src: string) => ALL_COSMETICS.filter((c) => c.kind === kind && c.source.kind === src).length;
    expect(count('pattern', 'usta')).toBe(15);
    expect(count('pattern', 'postcards')).toBe(5);
    expect(count('palette', 'usta')).toBe(9);
    expect(count('trail', 'usta')).toBe(6);
    expect(count('trail', 'weekly')).toBe(1);
    expect(count('trail', 'log')).toBe(1);
  });

  it('palettes are 3 valid hex colours and not neon (HSL saturation × lightness guard)', () => {
    for (const p of PALETTES) {
      expect(p.colors).toHaveLength(3);
      for (const hex of p.colors) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
        // neon = fully saturated AND mid-bright; keep chroma (max − min) below 0.85
        expect(max - min).toBeLessThan(0.85);
        expect(sat * (1 - Math.abs(2 * l - 1))).toBeLessThan(0.85);
      }
    }
  });
});

describe('badges', () => {
  it('has 30 badges with ids matching the UI and the brief examples', () => {
    expect(BADGES).toHaveLength(30);
    expect(unique(BADGES.map((b) => b.id))).toBe(true);
    expect([...BADGES.map((b) => b.id)].sort()).toEqual([...BADGE_IDS].sort());
    const tr = BADGES.map((b) => b.name.tr);
    for (const must of ['İlk Atlayış', '3 Metre Kulübü', 'Bulut Delen', 'Sıfır Temas', 'Gün Batımı Pilotu', 'Kartpostal Avcısı', 'Sürü Lideri', 'Kuşatma Ustası', 'Elmas Kanat'])
      expect(tr).toContain(must);
  });

  it('conditions are machine-checkable', () => {
    const p = profile();
    const three = badge('threeMetre');
    const siege = badge('encircleMaster');
    const first = badge('firstJump');
    const zero = badge('zeroContact');
    const turq = badge('turquoiseShadow');
    const chain = badge('gateChain');
    if (!three || !siege || !first || !zero || !turq || !chain) throw new Error('missing badge');
    expect(checkBadge(three, { profile: p, flight: flight({ x5TotalSec: 10 }) })).toBe(true);
    expect(checkBadge(three, { profile: p, flight: flight({ x5TotalSec: 9.9 }) })).toBe(false);
    expect(checkBadge(three, { profile: p, flight: flight({ x5TotalSec: 20, mode: 'free' }) })).toBe(false);
    const round = { placement: 3, flocks: 14, peakSize: 300, converted: 50, wildCollected: 80, sieges: 3, survivedToSunset: true, survivalSec: 180 };
    expect(checkBadge(siege, { profile: p, round })).toBe(true);
    expect(checkBadge(siege, { profile: p, round: { ...round, sieges: 2 } })).toBe(false);
    expect(checkBadge(first, { profile: profile({ routesLanded: 1 }) })).toBe(true);
    expect(checkBadge(zero, { profile: p, flight: flight({ stars: 3, contacts: 0 }) })).toBe(true);
    expect(checkBadge(zero, { profile: p, flight: flight({ stars: 3, contacts: 1 }) })).toBe(false);
    expect(checkBadge(turq, { profile: p, flight: flight({ world: 'likya', mode: 'free', waterSkimSec: 6 }) })).toBe(true);
    expect(checkBadge(chain, { profile: p, flight: flight({ gatesTotal: 10, gatesMissed: 0, gatesPassed: 10, maxGateChain: 10 }) })).toBe(true);
    expect(checkBadge(chain, { profile: p, flight: flight() })).toBe(false);
  });
});

describe('postcards', () => {
  it('has 25 postcards (5 per world) with ids matching the UI', () => {
    expect(POSTCARDS).toHaveLength(25);
    expect(unique(POSTCARDS.map((p) => p.id))).toBe(true);
    expect(POSTCARDS.map((p) => p.id)).toEqual([...POSTCARD_IDS]);
    for (const w of WORLD_IDS) expect(POSTCARDS.filter((p) => p.world === w)).toHaveLength(5);
    for (const p of POSTCARDS) {
      expect(ROUTE_IDS).toContain(p.anchor.nearRoute);
      expect(p.anchor.nearRoute.charAt(1)).toBe(String(WORLD_IDS.indexOf(p.world) + 1));
      expect(p.anchor.subjectRadiusM).toBeGreaterThan(0);
    }
    for (const w of WORLD_IDS) expect(cosmetic(postcardSetReward(w))?.source).toEqual({ kind: 'postcards', world: w });
  });
});

describe('progression', () => {
  it('XP thresholds are strictly increasing with strictly increasing increments', () => {
    expect(XP_THRESHOLDS).toHaveLength(50);
    expect(XP_THRESHOLDS[0]).toBe(0);
    for (let i = 1; i < XP_THRESHOLDS.length; i++) expect(XP_THRESHOLDS[i]).toBeGreaterThan(XP_THRESHOLDS[i - 1]);
    for (let i = 2; i < XP_THRESHOLDS.length; i++)
      expect(XP_THRESHOLDS[i] - XP_THRESHOLDS[i - 1]).toBeGreaterThan(XP_THRESHOLDS[i - 1] - XP_THRESHOLDS[i - 2]);
    expect(LEVEL_CURVE.maxLevel).toBe(50);
  });

  it('hits the pacing targets (L2 after FTUE ⭐⭐, L5 ≈ 15 min, L35 ≈ 14 days)', () => {
    // FTUE: w1r1 with 2 new stars and ~20k score.
    expect(levelForXp(flightXp({ score: 20000, newStars: 2, newUsta: 0, dailyFirstFinish: false }))).toBe(2);
    // First 15 minutes: 4 W1 routes at ~2 stars, ~8 flights at ~25k, 1 usta, first daily.
    const first15 = 8 * 200 + 8 * 25 + 300 + 500;
    expect(levelForXp(first15)).toBeGreaterThanOrEqual(4);
    expect(levelForXp(first15)).toBeLessThanOrEqual(6);
    // 14 days of ~15–20 min: 14 dailies, ~45 stars, ~25 usta, 8 flights/day @ ~40 XP, 1.5 SÜRÜ rounds/day @ ~240.
    const twoWeeks = 14 * 500 + 45 * 200 + 25 * 300 + 14 * 8 * 40 + 14 * 1.5 * 240;
    const lvl = levelForXp(twoWeeks);
    expect(lvl).toBeGreaterThanOrEqual(32);
    expect(lvl).toBeLessThanOrEqual(38);
    expect(xpForLevel(5)).toBe(1800);
    expect(xpForLevel(35)).toBe(33150);
  });

  it('title bands cover 1–50 and every level 2–50 grants exactly one reward', () => {
    expect(TITLE_BANDS.map((t) => t.name.tr)).toEqual(['Çaylak', 'Süzülen', 'Sıyırıcı', 'Kartal', 'Usta', 'Efsane']);
    expect(TITLE_BANDS[0].from).toBe(1);
    expect(TITLE_BANDS[TITLE_BANDS.length - 1].to).toBe(50);
    for (let i = 1; i < TITLE_BANDS.length; i++) expect(TITLE_BANDS[i].from).toBe(TITLE_BANDS[i - 1].to + 1);
    expect(titleForLevel(26).id).toBe('kartal');
    for (let level = 2; level <= 50; level++) expect(LEVEL_REWARDS.filter((r) => r.level === level)).toHaveLength(1);
    expect(LEVEL_REWARDS).toHaveLength(49);
  });

  it('XP formula and SÜRÜ XP range', () => {
    expect(flightXp({ score: 31400, newStars: 2, newUsta: 1, dailyFirstFinish: false })).toBe(31 + 400 + 300);
    expect(suruRoundXp(1, 16)).toBe(400);
    expect(suruRoundXp(16, 16)).toBe(100);
    expect(suruRoundXp(1, 12)).toBe(400);
    expect(suruRoundXp(12, 12)).toBe(100);
  });

  it('world locks 6/15/26/38 and route/mode unlock flow', () => {
    expect(WORLD_UNLOCK_STARS).toEqual({ kapadokya: 0, likya: 6, karadeniz: 15, erciyes: 26, pamukkale: 38 });
    expect(routeUnlocked('w1r1', 0, {})).toBe(true);
    expect(routeUnlocked('w1r2', 0, {})).toBe(false);
    expect(routeUnlocked('w1r2', 1, { w1r1: 1 })).toBe(true);
    expect(routeUnlocked('w2r1', 5, { w1r1: 3 })).toBe(false);
    expect(routeUnlocked('w2r1', 6, { w1r1: 3 })).toBe(true);
    expect(modeUnlocked('daily', 0)).toBe(false);
    expect(modeUnlocked('daily', 1)).toBe(true);
    expect(modeUnlocked('suru', 1)).toBe(true);
    expect(modeUnlocked('duel', 1)).toBe(false);
    expect(modeUnlocked('duel', 1, true)).toBe(true);
    expect(modeUnlocked('duel', 2)).toBe(true);
    expect(modeUnlocked('free', 2)).toBe(false);
    expect(modeUnlocked('free', 3)).toBe(true);
    expect(MODE_UNLOCKS.find((m) => m.mode === 'weekly')?.afterRoutes).toBe(4);
  });

  it('stars: career by expert ratio, daily by time ratio', () => {
    expect(CAREER_STARS).toEqual({ star2Ratio: 0.5, star3Ratio: 0.85 });
    expect(careerStars(false, 99999, 1000)).toBe(0);
    expect(careerStars(true, 100, 1000)).toBe(1);
    expect(careerStars(true, 500, 1000)).toBe(2);
    expect(careerStars(true, 850, 1000)).toBe(3);
    expect(dailyStars(true, 100, 0, 100, 20)).toBe(3);
    expect(dailyStars(true, 100, 0, 100, 10)).toBe(2);
    expect(dailyStars(true, 100, 3, 100, 20)).toBe(2); // +6 s penalty → 1.06
    expect(dailyStars(true, 120, 0, 100, 20)).toBe(1);
  });

  it('SÜRÜ league: LP table, siege cap, promotion carry, no demotion', () => {
    expect(lpForPlacement(1, 16)).toBe(30);
    expect(lpForPlacement(16, 16)).toBe(-10);
    expect(lpForPlacement(12, 12)).toBe(-10);
    expect(applySuruRound({ league: 0, lp: 0 }, 16, 16, 0)).toEqual({ league: 0, lp: 0 });
    expect(applySuruRound({ league: 0, lp: 290 }, 1, 16, 5)).toEqual({ league: 1, lp: 290 + 30 + 9 - 300 });
    expect(applySuruRound({ league: 2, lp: 3 }, 16, 16, 0)).toEqual({ league: 2, lp: 0 });
    expect(applySuruRound({ league: 4, lp: 1000 }, 1, 16, 0).league).toBe(4);
  });

  it('weekly rotation is deterministic and respects eligibility', () => {
    expect(WEEKLY_MODIFIERS.map((m) => m.id)).toEqual(['ruzgarliGun', 'sisPerdesi', 'tersYon', 'termalAvi']);
    const seen = new Map<string, string[]>();
    for (let k = 0; k < 104; k++) {
      const a = weeklyFor(k);
      const b = weeklyFor(k);
      expect(a.routeId).toBe(b.routeId);
      expect(a.modifier.eligible).toContain(a.routeId);
      if (a.modifier.id === 'tersYon') expect(['kapadokya', 'pamukkale']).toContain(ROUTE_META.find((r) => r.id === a.routeId)?.world);
      const list = seen.get(a.modifier.id) ?? [];
      list.push(a.routeId);
      seen.set(a.modifier.id, list);
    }
    // A modifier visits all its eligible routes before repeating one.
    for (const m of WEEKLY_MODIFIERS) {
      const list = seen.get(m.id) ?? [];
      const firstCycle = list.slice(0, m.eligible.length);
      expect(new Set(firstCycle).size).toBe(m.eligible.length);
    }
  });
});

describe('flight stats tracker', () => {
  it('accumulates streaks, chains and landing facts from state + events', () => {
    const tr = createFlightStatsTracker({ routeId: 'w1r1', world: 'kapadokya', mode: 'career', gatesTotal: 3, assist: 'full', slowMode: false });
    const base = { prox: { d: 2, cls: 'rock', nearest: [0, 0, 0], normal: [0, 1, 0], mult: 5, propId: -1 }, phase: 'flying' } as unknown as FlightState;
    for (let i = 0; i <= 180; i++) tr.sample({ ...base, timeSec: i / 60, prox: { ...base.prox, mult: i <= 120 ? 5 : 3 } } as FlightState);
    tr.event({ type: 'gate', tick: 10, index: 0, points: 500, chain: 1 });
    tr.event({ type: 'gate', tick: 400, index: 1, points: 600, chain: 2 });
    tr.event({ type: 'gateMissed', tick: 800, index: 2 });
    tr.event({ type: 'balloonThread', tick: 900, a: 1, b: 2, points: 750, mult: 1 });
    tr.event({ type: 'balloonThread', tick: 1000, a: 2, b: 3, points: 1125, mult: 1.5 });
    tr.event({ type: 'thermalEnter', tick: 50, index: 1 });
    tr.event({ type: 'thermalEnter', tick: 60, index: 1 });
    tr.event({ type: 'parachuteOpen', tick: 2000, heightAGL: 72, auto: false });
    tr.event({ type: 'landed', tick: 2400, distToTarget: 1.4, soft: true, points: 1300 });
    const s = tr.finish({ score: 12345, timeSec: 70, stars: 3 });
    expect(s.maxX5StreakSec).toBeCloseTo(2, 5);
    expect(s.x3PlusTotalSec).toBeCloseTo(3, 5);
    expect(s.maxGateChain).toBe(2);
    expect(s.gatesMissed).toBe(1);
    expect(s.maxThreadChain).toBe(2);
    expect(s.thermalsEntered).toBe(1);
    expect(s.braveOpening).toBe(true);
    expect(s.landed).toBe(true);
    expect(s.landingDist).toBe(1.4);
    expect(s.stars).toBe(3);
  });
});

describe('rulings ↔ live data (drift guard for brief-binding values)', () => {
  it('rulings have unique ids and a chosen value', () => {
    expect(unique(RULINGS.map((r) => r.id))).toBe(true);
    for (const r of RULINGS) {
      expect(r.sources.length).toBeGreaterThan(0);
      expect(r.chosen.length).toBeGreaterThan(5);
      expect(r.rationale.length).toBeGreaterThan(5);
    }
  });

  it('flight + SÜRÜ data hold the ruled values', () => {
    expect(TUNING.score.grazeD).toBe(1.5); // K-03
    expect(TUNING.prox.flatSurfaceMaxMult).toBe(3); // brief header
    expect(TUNING.contact.bounceMaxNormalSpeed).toBe(6); // brief header
    expect(TUNING.control.bankMaxDeg).toBe(65); // K-02
    expect(TUNING.control.tauRelease).toBe(0.4); // K-01
    expect(TUNING.canopy.zoneRadius).toBe(250); // K-10
    expect(SURU.BREATH_DRAIN).toBe(14); // S-01
    expect(SURU.BREATH_REGEN).toBe(22);
    expect(SURU.BREATH_UNLOCK).toBe(25);
    expect(SURU.TIGHT_SPEED_MUL).toBe(1.25); // S-02
    expect(SURU.WIDE_SPEED_MUL).toBe(0.9);
    expect(SURU.RING_R0).toBe(300); // S-05
    expect(SURU.RING_R1).toBe(110);
    expect(SURU.SIEGE_HOLD_SEC).toBe(0.5); // S-04
    expect(SURU.SIEGE_COVER_BINS).toBe(30);
    expect(SURU.CONV_SHARE).toBe(0.62); // S-08
    expect(SURU.HAWK_FIRST_SEC).toBe(40); // S-09
    expect(SURU.CORE_BIRDS).toBe(8); // S-10
    expect(SURU.STORM_SCATTER_PER_SEC).toBe(0.04); // S-11
    expect(SURU.NIGHT_DRIFT_PER_SEC).toBe(0.03); // S-06
  });
});
