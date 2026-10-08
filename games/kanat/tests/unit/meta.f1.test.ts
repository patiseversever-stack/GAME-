// F1 review (Red Team + Player Panel) — design data contracts: Usta labels ↔ UI strings, unassisted tasks,
// reward tracks, feature-flag attainability, daily ruleset, star calibration, energy budget, FTUE timeline.
import { describe, expect, it } from 'vitest';
import {
  ALL_COSMETICS,
  BADGES,
  CANOPIES,
  CARD_FRAMES,
  DAILY_RULES,
  DURATION_EXCEPTIONS,
  FEATURES,
  FTUE_BEATS,
  FTUE_HIDDEN_FIRST_FLIGHT,
  FTUE_RULES,
  GHOST_TINTS,
  LANDING_DIST_NONE,
  LEVEL_REWARDS,
  PHOTO_FILTER_UNLOCKS,
  ROUTE_META,
  RULINGS,
  STAR_CALIBRATION,
  USTA_TASKS,
  WEEKLY_MODIFIERS,
  WORLD_META,
  badge,
  badgeOn,
  checkBadge,
  checkUsta,
  cosmetic,
  cosmeticRef,
  createFlightStatsTracker,
  effectiveSource,
  enabledWorlds,
  featureOn,
  lockProgressCheck,
  nextWorldLock,
  postcardsAvailable,
  resolveUstaTarget,
  routeOn,
  shouldOfferAssistDown,
  showsAssistMark,
  skillIndex,
  sourceAttainable,
  suruTrackUnlocked,
  unlockCardModes,
  ustaI18n,
  validatePostcardAnchors,
  visibleBadges,
  visibleCosmetics,
  weeklyFor,
} from '../../src/content/meta/index.ts';
import type { FeatureSet, FlightStats, HudElement, ProfileStats } from '../../src/content/meta/index.ts';
import type { FlightState } from '../../src/sim/types.ts';
import { TR } from '../../src/ui/strings/tr.ts';
import { TUNING } from '../../src/sim/data/tuning.ts';

function flight(over: Partial<FlightStats> = {}): FlightStats {
  return {
    routeId: 'w1r3',
    world: 'kapadokya',
    mode: 'career',
    landed: true,
    halfFlight: false,
    crashed: false,
    stars: 3,
    score: 60000,
    timeSec: 70,
    grazes: 0,
    x5TotalSec: 0,
    maxX5StreakSec: 0,
    x3PlusTotalSec: 0,
    maxX3StreakSec: 0,
    balloonThreads: 0,
    maxThreadChain: 0,
    gatesTotal: 10,
    gatesPassed: 10,
    gatesMissed: 0,
    maxGateChain: 10,
    thermalsEntered: 0,
    contacts: 0,
    landingDist: 3,
    softLanding: true,
    braveOpening: false,
    autoParachute: false,
    waterSkimSec: 0,
    assist: 'full',
    assistUsed: false,
    slowMode: false,
    ...over,
  };
}

function profile(): ProfileStats {
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
    suruRounds: 0,
    dailyThreeStars: 0,
    worldStars: zero,
    worldRoutesLanded: zero,
    routeStars: {},
  };
}

const BENCH = { expertScore: 52000, expertTimeSec: 78.46 };

describe('Usta labels ↔ UI strings (Player Panel P1)', () => {
  const keys = new Set(Object.keys(TR));
  it('every one of the 60 tasks resolves to an existing usta.<type> key — none falls back to usta.generic', () => {
    for (const t of USTA_TASKS) {
      const i = ustaI18n(t, BENCH);
      expect(i.ready).toBe(true);
      expect(i.key).toBe(`usta.${t.type}`);
      expect(keys.has(i.key)).toBe(true);
      expect(i.key).not.toBe('usta.generic');
    }
  });

  it('ratio tasks never print a raw ratio: relative key without a benchmark, exact checked value with one', () => {
    for (const t of USTA_TASKS.filter((x) => x.type === 'scoreOver' || x.type === 'timeUnder')) {
      const rel = ustaI18n(t);
      expect(rel.ready).toBe(false);
      expect(rel.key).toBe(`usta.${t.type}Rel`);
      expect(rel.params.pct).toBe(Math.round(t.value * 100));
      const abs = ustaI18n(t, BENCH);
      expect(abs.params.value).toBe(resolveUstaTarget(t, BENCH));
    }
    const tu = USTA_TASKS.find((x) => x.type === 'timeUnder');
    if (!tu) throw new Error('no timeUnder task');
    const target = resolveUstaTarget(tu, BENCH) as number;
    expect(Math.round(target * 10)).toBe(target * 10); // 0.1 s precision → shown with the time formatter
    expect(checkUsta(tu, flight({ routeId: tu.routeId, timeSec: target }), BENCH)).toBe(true);
    expect(checkUsta(tu, flight({ routeId: tu.routeId, timeSec: target + 0.05 }), BENCH)).toBe(false);
  });
});

describe('assist honesty (K-20)', () => {
  it('🛟 only when a physics-changing assist actually intervened; Az never marks', () => {
    expect(showsAssistMark('low', true)).toBe(false);
    expect(showsAssistMark('full', false)).toBe(false);
    expect(showsAssistMark('full', true)).toBe(true);
    expect(showsAssistMark('guide', true)).toBe(true);
    expect(showsAssistMark('off', false)).toBe(false);
  });

  it('noContact3Stars / scoreOver / timeUnder and the Zero Contact badge need an unassisted flight', () => {
    const unassisted = USTA_TASKS.filter((t) => t.unassistedOnly).map((t) => t.type);
    expect(new Set(unassisted)).toEqual(new Set(['noContact3Stars', 'scoreOver', 'timeUnder']));
    const nc = USTA_TASKS.find((t) => t.id === 'w1r3-u3');
    if (!nc) throw new Error('w1r3-u3 missing');
    expect(nc.type).toBe('noContact3Stars');
    expect(checkUsta(nc, flight())).toBe(true);
    expect(checkUsta(nc, flight({ assistUsed: true }))).toBe(false);
    const zero = badge('zeroContact');
    if (!zero) throw new Error('zeroContact missing');
    expect(checkBadge(zero, { profile: profile(), flight: flight() })).toBe(true);
    expect(checkBadge(zero, { profile: profile(), flight: flight({ assistUsed: true }) })).toBe(false);
    // Practice runs never write badges.
    expect(checkBadge(zero, { profile: profile(), flight: flight({ mode: 'practice' }) })).toBe(false);
  });

  it('assist step-down offer: skilled players from W1 R2, everyone once after W1 R3, never on the FTUE route', () => {
    const base = { routeId: 'w1r2', stars: 2, landed: true, assist: 'guide' as const, assistUsed: false };
    expect(shouldOfferAssistDown(base, false)).toBe(true);
    expect(shouldOfferAssistDown({ ...base, assistUsed: true }, false)).toBe(false);
    expect(shouldOfferAssistDown({ ...base, routeId: 'w1r1' }, false)).toBe(false);
    expect(shouldOfferAssistDown({ ...base, routeId: 'w1r3', stars: 1, assistUsed: true }, false)).toBe(true);
    expect(shouldOfferAssistDown({ ...base, routeId: 'w1r3' }, true)).toBe(false);
    expect(shouldOfferAssistDown({ ...base, assist: 'low' }, false)).toBe(false);
  });
});

describe('reward tracks (K-23)', () => {
  const FLIGHT_SIDE = new Set(['palette', 'trail', 'ghostTint', 'canopy', 'cardFrame', 'menuTime']);

  it('every Pilot Rank level 2–50 grants exactly one flight-side thing (title or flight cosmetic)', () => {
    expect(LEVEL_REWARDS).toHaveLength(49);
    for (let level = 2; level <= 50; level++) {
      const r = LEVEL_REWARDS.filter((x) => x.level === level);
      expect(r).toHaveLength(1);
      const one = r[0];
      if (one.kind === 'cosmetic') expect(FLIGHT_SIDE.has(one.ref.split(':')[0])).toBe(true);
    }
    const titles = LEVEL_REWARDS.filter((r) => r.kind === 'title').map((r) => r.level);
    expect(titles).toEqual([9, 17, 26, 35, 44]);
    const kinds = (k: string) => LEVEL_REWARDS.filter((r) => r.kind === 'cosmetic' && r.ref.startsWith(`${k}:`)).length;
    expect(kinds('canopy')).toBe(13);
    expect(kinds('ghostTint')).toBe(12);
    expect(kinds('cardFrame')).toBe(12);
    expect(kinds('menuTime')).toBe(4);
    expect(CANOPIES).toHaveLength(14);
    expect(CARD_FRAMES).toHaveLength(13);
    expect(GHOST_TINTS).toHaveLength(13);
  });

  it('canopy colours are earthy (chroma < 0.85) and valid hex', () => {
    for (const c of CANOPIES) {
      for (const hex of c.colors) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
        const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
        expect(Math.max(...v) - Math.min(...v)).toBeLessThan(0.85);
      }
    }
  });

  it('SÜRÜ cosmetics come from SÜRÜ play: 26 unlockables, monotone in rounds and league', () => {
    const suru = ALL_COSMETICS.filter((c) => c.kind.startsWith('suru'));
    expect(suru.filter((c) => c.source.kind === 'start')).toHaveLength(4);
    expect(suru.filter((c) => c.source.kind === 'suru')).toHaveLength(26);
    expect(suru.some((c) => c.source.kind === 'rank')).toBe(false);
    expect(suruTrackUnlocked(0, 0)).toHaveLength(0);
    expect(suruTrackUnlocked(1, 0)).toEqual(['suruShow:kalp']);
    expect(suruTrackUnlocked(100, 4)).toHaveLength(26);
    let prev = 0;
    for (const n of [1, 5, 10, 20, 50, 100]) {
      const k = suruTrackUnlocked(n, 0).length;
      expect(k).toBeGreaterThanOrEqual(prev);
      prev = k;
    }
    expect(suruTrackUnlocked(0, 4)).toEqual(expect.arrayContaining(['suruShow:sonsuzluk', 'suruShow:sarmal']));
  });

  it('photo filters unlock by postcards collected (≤ 25); Doğal is the starter', () => {
    expect(PHOTO_FILTER_UNLOCKS.map((p) => p.id)).toEqual(['natural', 'golden', 'documentary', 'postcard', 'coldMorning', 'bw']);
    for (const p of PHOTO_FILTER_UNLOCKS.slice(1)) {
      expect(p.source.kind).toBe('postcardCount');
      if (p.source.kind === 'postcardCount') expect(p.source.count).toBeLessThanOrEqual(25);
    }
  });

  it('SÜRÜ league skill index: rolling mean placement normalised to 16 flocks', () => {
    expect(skillIndex([{ placement: 1, flocks: 16 }])).toBeNull();
    const five = Array.from({ length: 5 }, () => ({ placement: 1, flocks: 12 }));
    expect(skillIndex(five)).toBe(1);
    const last = Array.from({ length: 25 }, (_, i) => ({ placement: i < 5 ? 1 : 16, flocks: 16 }));
    expect(skillIndex(last)).toBe(16);
  });
});

describe('feature flags: clean cuts, no dead buttons, every visible reward attainable', () => {
  const flags = ['freeFlight', 'photo', 'daily', 'duel', 'weekly', 'suru'] as const;

  function combos(): FeatureSet[] {
    const out: FeatureSet[] = [];
    for (const worlds of [1, 2, 5]) {
      for (let mask = 0; mask < 1 << flags.length; mask++) {
        const f: FeatureSet = { ...FEATURES, worlds };
        flags.forEach((k, i) => {
          f[k] = (mask & (1 << i)) !== 0;
        });
        f.weeklyDuel = f.weekly && f.duel;
        out.push(f);
      }
    }
    return out;
  }

  it('ship defaults: everything on, 5 worlds', () => {
    expect(FEATURES.worlds).toBe(5);
    expect(visibleCosmetics()).toHaveLength(ALL_COSMETICS.length);
    expect(visibleBadges()).toHaveLength(30);
  });

  it('under every flag combination × {1, 2, 5} worlds', () => {
    for (const f of combos()) {
      // Every visible cosmetic has an effective source that can be satisfied.
      for (const c of visibleCosmetics(f)) {
        const s = effectiveSource(c, f);
        expect(s).not.toBeNull();
        if (s) expect(sourceAttainable(s, f)).toBe(true);
      }
      // Rank track never depends on optional features: 49 rewards, all visible.
      for (const r of LEVEL_REWARDS) {
        if (r.kind !== 'cosmetic') continue;
        const c = cosmetic(r.ref);
        expect(c).toBeDefined();
        if (c) expect(effectiveSource(c, f)).not.toBeNull();
      }
      // Usta rewards of shipped routes are always visible.
      for (const t of USTA_TASKS) if (routeOn(t.routeId, f)) expect(visibleCosmetics(f).map(cosmeticRef)).toContain(t.unlocks);
      // Visible badges only depend on enabled features and shipped worlds.
      for (const b of visibleBadges(f)) {
        for (const id of b.requires ?? []) expect(featureOn(id, f)).toBe(true);
        expect(b.needsWorld ?? 1).toBeLessThanOrEqual(f.worlds);
      }
      for (const b of BADGES) if (!badgeOn(b, f)) expect(visibleBadges(f)).not.toContain(b);
      // Mode intro cards never announce a cut mode.
      for (let n = 0; n <= 4; n++) for (const m of unlockCardModes(n, f)) expect(['daily', 'suru', 'duel', 'free', 'weekly']).toContain(m);
      if (!f.daily) for (let n = 0; n <= 4; n++) expect(unlockCardModes(n, f)).not.toContain('daily');
      // Weekly never picks a route in a cut world.
      for (let k = 0; k < 24; k++) expect(routeOn(weeklyFor(k, f.worlds).routeId, f)).toBe(true);
      // World locks of shipped worlds are reachable with stars of earlier shipped worlds.
      for (const w of WORLD_META.filter((x) => x.index <= f.worlds)) expect(w.unlockStars).toBeLessThanOrEqual(12 * (w.index - 1));
      expect(postcardsAvailable(f)).toBe(f.photo ? 5 * f.worlds : 0);
    }
  });

  it('cut fallbacks: signature patterns → world complete, Kırlangıç → 14 stamps, SÜRÜ items hidden', () => {
    const noPhoto: FeatureSet = { ...FEATURES, photo: false };
    const peri = cosmetic('pattern:periBacasi');
    if (!peri) throw new Error('pattern missing');
    expect(effectiveSource(peri, noPhoto)).toEqual({ kind: 'worldComplete', world: 'kapadokya' });
    const kir = cosmetic('trail:kirlangic');
    if (!kir) throw new Error('trail missing');
    expect(effectiveSource(kir, { ...FEATURES, weekly: false })).toEqual({ kind: 'log', stamps: 14 });
    expect(visibleCosmetics({ ...FEATURES, suru: false }).some((c) => c.kind.startsWith('suru'))).toBe(false);
    expect(enabledWorlds({ ...FEATURES, worlds: 2 })).toEqual(['kapadokya', 'likya']);
  });
});

describe('daily route ruleset for day-1 players (K-18)', () => {
  it('fixed accessible rules inside the brief envelope', () => {
    expect(DAILY_RULES.ignoresWorldLock).toBe(true);
    expect(DAILY_RULES.gateRadius).toBe(WORLD_META[0].gateRadius);
    expect(DAILY_RULES.windMax).toBeLessThanOrEqual(3);
    expect(DAILY_RULES.windMax).toBeGreaterThanOrEqual(0);
    expect(DAILY_RULES.difficultyByWeekday).toEqual([3, 4, 4, 5, 6, 6, 7]);
    const l = DAILY_RULES.lineByDifficulty;
    expect(l.lowShare[0]).toBeLessThan(l.lowShare[1]);
    expect(l.gateTurnDeg[0]).toBeLessThan(l.gateTurnDeg[1]);
    expect(l.lineClearanceM[0]).toBeGreaterThan(l.lineClearanceM[1]);
    expect(l.lineClearanceM[1]).toBeGreaterThanOrEqual(DAILY_RULES.minGateClearanceM);
  });
});

describe('star calibration (K-25)', () => {
  it('2⭐ everywhere is NOT enough for W4/W5 locks — the bot gate must demand some ⭐⭐⭐', () => {
    const all2: Record<string, number> = {};
    for (const r of ROUTE_META) all2[r.id] = 2;
    const chk = lockProgressCheck(all2);
    expect(chk.map((c) => c.ok)).toEqual([true, true, false, false]);
    // 2⭐ everywhere + 3⭐ on two W1–W3 routes and four more W4 routes crosses every lock.
    const better = { ...all2, w1r1: 3, w1r2: 3, w4r1: 3, w4r2: 3, w2r1: 3, w2r2: 3 };
    expect(lockProgressCheck(better).every((c) => c.ok)).toBe(true);
    expect(STAR_CALIBRATION.star2Tries).toBe(3);
    expect(STAR_CALIBRATION.expertClearanceM[0]).toBe(4);
  });

  it('next world lock read-out', () => {
    expect(nextWorldLock(0)).toEqual({ world: 'likya', need: 6, missing: 6 });
    expect(nextWorldLock(30)).toEqual({ world: 'pamukkale', need: 38, missing: 8 });
    expect(nextWorldLock(38)).toBeNull();
  });
});

describe('energy budget + thermal streets (K-19)', () => {
  it('every route carries a sane budget; w1r1 matches the FTUE film', () => {
    for (const r of ROUTE_META) {
      const e = r.energy;
      expect(e.startAboveLandingM[0]).toBeLessThan(e.startAboveLandingM[1]);
      expect(e.startAboveLandingM[0]).toBeGreaterThanOrEqual(140);
      expect(e.wingsuitSec[0]).toBeGreaterThan(20);
      expect(e.streetGainM).toBeGreaterThan(25);
      expect(e.liftSources).toContain('thermalStreet');
      expect(e.liftSources.includes('ridge')).toBe(r.windSpeed > 0);
      expect(r.thermalRadius).toBeGreaterThanOrEqual(30); // §4.G.5 R 30–60 kept
      expect(r.thermalRadius).toBeLessThanOrEqual(60);
    }
    const w1 = ROUTE_META[0];
    expect(DURATION_EXCEPTIONS.w1r1).toEqual([45, 55]);
    const film = FTUE_BEATS.find((b) => b.id === 'stars')?.nominalSec ?? 0;
    const jump = FTUE_BEATS.find((b) => b.id === 'jump')?.nominalSec ?? 0;
    expect(film - jump).toBeGreaterThanOrEqual(w1.targetDurationSec[0]);
    expect(film - jump).toBeLessThanOrEqual(w1.targetDurationSec[1]);
    expect(WORLD_META[0].thermalLengthM).toBeGreaterThan(WORLD_META[4].thermalLengthM);
  });
});

describe('FTUE timeline (data for the integrator director)', () => {
  it('beats are ordered, prompts are single words, HUD is revealed progressively', () => {
    for (let i = 1; i < FTUE_BEATS.length; i++) expect(FTUE_BEATS[i].nominalSec).toBeGreaterThanOrEqual(FTUE_BEATS[i - 1].nominalSec);
    const keys = new Set(Object.keys(TR));
    for (const b of FTUE_BEATS) if (b.prompt?.key) expect(keys.has(b.prompt.key)).toBe(true);
    const revealed: HudElement[] = FTUE_BEATS.flatMap((b) => [...(b.reveal ?? [])]);
    expect(new Set(revealed).size).toBe(revealed.length); // each element revealed once
    for (const h of ['gateArrow', 'proxRing', 'score', 'altitude', 'parachuteButton'] as HudElement[]) expect(revealed).toContain(h);
    for (const h of FTUE_HIDDEN_FIRST_FLIGHT) expect(revealed).not.toContain(h);
    const idx = (id: string) => FTUE_BEATS.findIndex((b) => b.id === id);
    expect(idx('firstGate')).toBeLessThan(idx('proximity'));
    expect(idx('proximity')).toBeLessThan(idx('firstGraze'));
    expect(FTUE_BEATS[idx('jumpPrompt')].nominalSec).toBe(4);
    expect(FTUE_RULES.inputAcceptedFromSec).toBe(1.5);
    expect(FTUE_RULES.audio).toBe('resumeOnJumpTap');
  });

  it('guide-wind exemption for tangential passes stays below the full-assist push threshold', () => {
    expect(FTUE_RULES.guidePushMinClosingMs).toBeGreaterThan(0);
    expect(FTUE_RULES.guidePushMinClosingMs).toBeLessThan(TUNING.assist.pushClosing);
  });
});

describe('weekly + postcards + tracker', () => {
  it('Ters Yön is cut; every modifier is valid on all 20 routes', () => {
    expect(WEEKLY_MODIFIERS.map((m) => m.id)).not.toContain('tersYon');
    for (const m of WEEKLY_MODIFIERS) expect(m.eligible).toHaveLength(20);
  });

  it('postcard anchor validator catches missing, unknown, far and buried anchors', () => {
    const ok = ['w1p1', 'w1p2', 'w1p3', 'w1p4', 'w1p5'].map((id) => ({ id, pos: [0, 50, 0] as const, subjectRadiusM: 30, idealCam: [0, 80, 90] as const }));
    expect(validatePostcardAnchors('kapadokya', ok, () => 10)).toEqual([]);
    const bad = [...ok.slice(1), { id: 'w2p1', pos: [0, 0, 0] as const, subjectRadiusM: 5, idealCam: [0, 0, 500] as const }];
    const errs = validatePostcardAnchors('kapadokya', bad, () => 10);
    expect(errs.some((e) => e.includes('missing w1p1'))).toBe(true);
    expect(errs.some((e) => e.includes('unknown w2p1'))).toBe(true);
    expect(errs.some((e) => e.includes('w2p1: idealCam'))).toBe(true);
    expect(errs.some((e) => e.includes('buried'))).toBe(true);
  });

  it('tracker records assistUsed, the ×3 streak, and a JSON-safe landing sentinel', () => {
    const tr = createFlightStatsTracker({ routeId: 'w5r3', world: 'pamukkale', mode: 'career', gatesTotal: 2, assist: 'guide', slowMode: false });
    const base = { prox: { d: 5, cls: 'water', mult: 3 }, phase: 'flying', assistUsed: false } as unknown as FlightState;
    for (let i = 0; i <= 300; i++) tr.sample({ ...base, timeSec: i / 60, assistUsed: i === 200 } as FlightState);
    const s = tr.finish({ score: 1000, timeSec: 5, stars: 0 });
    expect(s.maxX3StreakSec).toBeCloseTo(5, 5);
    expect(s.assistUsed).toBe(true);
    expect(s.landingDist).toBe(LANDING_DIST_NONE);
    expect(JSON.parse(JSON.stringify(s)).landingDist).toBe(999);
    const mirror = badge('mirrorFlight');
    if (!mirror) throw new Error('mirrorFlight missing');
    expect(checkBadge(mirror, { profile: profile(), flight: { ...s, landed: true } })).toBe(true);
  });

  it('×N texts name the distance in metres', () => {
    for (const id of ['threeMetre', 'mirrorFlight']) {
      const b = badge(id);
      expect(b?.desc.tr).toMatch(/\d+ m/);
    }
  });

  it('F1 rulings are recorded', () => {
    const ids = RULINGS.map((r) => r.id);
    for (let k = 17; k <= 28; k++) expect(ids).toContain(`K-${k}`);
    expect(ids).toContain('S-14');
  });
});
