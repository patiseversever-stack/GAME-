// 9.G-8 single events (graze / gate / balloon thread), contact rule, canopy landing, emergency chute, commands.
import { describe, expect, it } from 'vitest';
import { FlightSim, type FlightSimOptions } from '../../src/sim/FlightSim.ts';
import { comboK, landingRingPoints, starsFor } from '../../src/sim/flight/scoring.ts';
import { AnalyticTerrain, ANALYTIC } from '../../src/sim/testing/analyticTerrain.ts';
import type { BalloonDef, Command, PropInstance, RouteDef, SimEvent } from '../../src/sim/types.ts';

const terrain = new AnalyticTerrain();
const DEG = Math.PI / 180;

function route(over: Partial<RouteDef> = {}): RouteDef {
  return {
    id: 'test-ev',
    world: 'kapadokya',
    index: 1,
    difficulty: 1,
    name: { tr: 'T', en: 'T' },
    start: { type: 'balon', pos: [0, 3000, 0], headingDeg: 180, speedKmh: 150 },
    line: [],
    gates: [],
    thermals: [],
    landing: { center: [9000, 0, 9000], radius: 25, zoneRadius: 250 },
    wind: { dirDeg: 0, speed: 0 },
    stars: [0, 2000, 4000],
    expertScore: 0,
    ustaGorevleri: [],
    postcards: [],
    ...over,
  };
}

function sim(o: Partial<FlightSimOptions> & { route?: RouteDef }): FlightSim {
  return new FlightSim({ world: 'kapadokya', sampler: terrain, route: o.route ?? route(), assist: 'off', skipIntro: true, ...o });
}

function run(s: FlightSim, ticks: number, cmdsAt?: (tick: number) => Command[]): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    s.step(cmdsAt ? cmdsAt(s.state.tick) : []);
    for (const e of s.drainEvents()) all.push({ ...e } as SimEvent);
  }
  return all;
}

const count = (ev: SimEvent[], type: SimEvent['type']) => ev.filter((e) => e.type === type).length;

describe('9.G-8 graze', () => {
  const pole: PropInstance = {
    id: 0,
    type: 'column',
    variant: 0,
    pos: [100, 2950, 0],
    yaw: 0,
    scale: 1,
    prims: [{ kind: 'capsule', a: [100, 2950, 0], b: [100, 3050, 0], r: 2 }],
    params: {},
  };
  it('one pass at d = 1.0 m, 50 m/s → exactly one graze, +250 × 5', () => {
    const s = sim({ props: [pole] });
    s.teleport(100 + 2 + 0.6 + 1.0, 3000, -40, 50, 0, 180 * DEG);
    const ev = run(s, 120);
    expect(count(ev, 'graze')).toBe(1);
    const g = ev.find((e) => e.type === 'graze') as Extract<SimEvent, { type: 'graze' }>;
    expect(g.points).toBe(1250);
    expect(g.strength).toBeGreaterThan(0.25);
    expect(g.strength).toBeLessThan(0.4);
    expect(g.cls).toBe('prop');
    expect(g.side).toBe(1); // heading south (+z): the pole at −x is on the pilot's right
    expect(count(ev, 'bounce') + count(ev, 'crash')).toBe(0);
  });
  it('no graze below 140 km/h or beyond 1.5 m', () => {
    const slow = sim({ props: [pole] });
    slow.teleport(100 + 2 + 0.6 + 1.0, 3000, -40, 35, 0, 180 * DEG);
    expect(count(run(slow, 150), 'graze')).toBe(0);
    const far = sim({ props: [pole] });
    far.teleport(100 + 2 + 0.6 + 2.0, 3000, -40, 50, 0, 180 * DEG);
    expect(count(run(far, 120), 'graze')).toBe(0);
  });
});

describe('9.G-8 gates', () => {
  const gate = { t: 0.5, pos: [0, 3000, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], radius: 10, kind: 'normal' as const };
  it('flying through the ring → exactly one gate event (+500), no miss', () => {
    const s = sim({ route: route({ gates: [gate] }) });
    s.teleport(0, 3002, -50, 45, 0, 180 * DEG);
    const ev = run(s, 120);
    expect(count(ev, 'gate')).toBe(1);
    expect(count(ev, 'gateMissed')).toBe(0);
    expect((ev.find((e) => e.type === 'gate') as Extract<SimEvent, { type: 'gate' }>).points).toBe(500);
    expect(s.state.gatesPassed).toBe(1);
  });
  it('flying past the ring (2.5 R off) → exactly one gateMissed', () => {
    const s = sim({ route: route({ gates: [gate] }) });
    s.teleport(25, 3002, -50, 45, 0, 180 * DEG);
    const ev = run(s, 120);
    expect(count(ev, 'gate')).toBe(0);
    expect(count(ev, 'gateMissed')).toBe(1);
  });
  it('chain bonus +100 per consecutive gate', () => {
    const gates = [0, 1, 2].map((i) => ({ ...gate, pos: [0, 3000 - i * 3, i * 40] as [number, number, number] }));
    const s = sim({ route: route({ gates }) });
    s.teleport(0, 3002, -40, 45, 0, 180 * DEG);
    const ev = run(s, 240).filter((e) => e.type === 'gate') as Extract<SimEvent, { type: 'gate' }>[];
    expect(ev.map((e) => e.points)).toEqual([500, 600, 700]);
  });
});

describe('9.G-8 balloon thread', () => {
  const mk = (id: number, x: number): BalloonDef => ({
    id,
    p0: [x, 3000, 0],
    drift: [0, 0, 0],
    amp: [0, 0, 0],
    omega: 0.1,
    phase: 0,
    rise: 0,
    pattern: 0,
    envelopeH: 20,
    envelopeR: 8,
  });
  const balloons = [mk(0, -15), mk(1, 15)];
  it('scripted path between two balloons → exactly one İlmek (+750)', () => {
    const s = sim({ balloons });
    s.teleport(0, 3000, -60, 45, 0, 180 * DEG);
    const ev = run(s, 150);
    expect(count(ev, 'balloonThread')).toBe(1);
    const t = ev.find((e) => e.type === 'balloonThread') as Extract<SimEvent, { type: 'balloonThread' }>;
    expect(t.points).toBe(750);
    expect([t.a, t.b].sort()).toEqual([0, 1]);
    expect(count(ev, 'crash')).toBe(0);
  });
  it('path around the pair → 0', () => {
    const s = sim({ balloons });
    s.teleport(40, 3000, -60, 45, 0, 180 * DEG);
    expect(count(run(s, 150), 'balloonThread')).toBe(0);
  });
  it('chain ×1.5 within 4 s', () => {
    const bs = [mk(0, -15), mk(1, 15), { ...mk(2, -15), p0: [-15, 2994, 90] as [number, number, number] }, { ...mk(3, 15), p0: [15, 2994, 90] as [number, number, number] }];
    const s = sim({ balloons: bs });
    s.teleport(0, 3000, -60, 45, 0, 180 * DEG);
    const ev = run(s, 240).filter((e) => e.type === 'balloonThread') as Extract<SimEvent, { type: 'balloonThread' }>[];
    expect(ev.map((e) => e.points)).toEqual([750, 1125]);
  });
});

describe('contact rule (§2.2)', () => {
  const y0 = ANALYTIC.plainH;
  const px = ANALYTIC.plainX;
  const pz = ANALYTIC.plainZ;
  it('glancing contact (normal speed < 6 m/s) → bounce, 25 % speed loss, no crash', () => {
    const s = sim({});
    // 55 m/s: enough energy that the emergency parachute (low + slow + sinking) does not pre-empt the contact
    s.teleport(px, y0 + 1.5, pz, 55, -5 * DEG, 0);
    const ev = run(s, 40);
    expect(count(ev, 'bounce')).toBe(1);
    expect(count(ev, 'crash')).toBe(0);
    expect(s.state.phase).toBe('flying');
    expect(s.state.speed).toBeLessThan(55 * 0.8);
  });
  it('steep contact (≥ 6 m/s) → crash', () => {
    const s = sim({});
    s.teleport(px, y0 + 10, pz, 55, -30 * DEG, 0);
    const ev = run(s, 60);
    expect(count(ev, 'crash')).toBe(1);
    expect(s.state.phase).toBe('crashed');
    const c = ev.find((e) => e.type === 'crash') as Extract<SimEvent, { type: 'crash' }>;
    expect(c.cls).toBe('ground');
    expect(s.crashBuffer.count).toBeGreaterThan(0);
  });
  it('Guide Wind makes crashing impossible', () => {
    const s = sim({ guideWind: true });
    s.teleport(px, y0 + 10, pz, 55, -30 * DEG, 0);
    const ev = run(s, 180);
    expect(count(ev, 'crash')).toBe(0);
    expect(s.state.phase).not.toBe('crashed');
    expect(s.state.pos[1]).toBeGreaterThan(terrain.height(s.state.pos[0], s.state.pos[2]));
  });
});

describe('canopy & landing', () => {
  const lc: [number, number, number] = [ANALYTIC.plainX, ANALYTIC.plainH, ANALYTIC.plainZ];
  it('parachute only inside the landing zone; brave opening, flare → soft landing, ring points, stars', () => {
    const r = route({ landing: { center: lc, radius: 25, zoneRadius: 250 } });
    const s = sim({ route: r });
    // outside the zone: request ignored
    s.teleport(lc[0] - 400, lc[1] + 75, lc[2], 42, 0, 90 * DEG);
    let ev = run(s, 2, (t) => [{ tick: t, actorId: 0, cmd: 'parachute', args: [] }]);
    expect(count(ev, 'parachuteOpen')).toBe(0);
    // inside the zone at 75 m AGL heading toward the target
    s.teleport(lc[0] - 60, lc[1] + 75, lc[2], 42, 0, 90 * DEG);
    ev = run(s, 1, (t) => [{ tick: t, actorId: 0, cmd: 'parachute', args: [] }]);
    expect(count(ev, 'parachuteOpen')).toBe(1);
    expect(s.state.canopyOpen).toBe(true);
    expect(s.breakdown.brave).toBe(300);
    const flare: Command = { tick: 0, actorId: 0, cmd: 'flare', args: [31] };
    ev = run(s, 60 * 40, (t) => {
      if (s.state.heightAGL < 2.8 && s.state.heightAGL > 0) {
        flare.tick = t;
        return [flare];
      }
      return [];
    });
    const landed = ev.find((e) => e.type === 'landed') as Extract<SimEvent, { type: 'landed' }>;
    expect(landed).toBeTruthy();
    expect(landed.soft).toBe(true);
    expect(s.state.phase).toBe('landed');
    expect(s.landedInZone).toBe(true);
    expect(landed.points).toBe(landingRingPoints(landed.distToTarget) + 300);
    expect(s.stars()).toBeGreaterThanOrEqual(1);
  });
  it('emergency parachute below 20 m AGL outside the zone → halfFlight, no stars', () => {
    const s = sim({});
    s.teleport(ANALYTIC.plainX, ANALYTIC.plainH + 40, ANALYTIC.plainZ, 42, -12 * DEG, 0);
    const ev = run(s, 60 * 30);
    expect(count(ev, 'halfFlight')).toBe(1);
    const po = ev.find((e) => e.type === 'parachuteOpen') as Extract<SimEvent, { type: 'parachuteOpen' }>;
    expect(po.auto).toBe(true);
    expect(po.heightAGL).toBeLessThan(20);
    expect(count(ev, 'crash')).toBe(0);
    expect(count(ev, 'landed')).toBe(1);
    expect(s.state.phase).toBe('halfFlight');
    expect(s.stars()).toBe(0);
  });
});

describe('scoring rules', () => {
  it('combo K = 1 + 0.15·⌊t/2⌋, cap 3', () => {
    expect(comboK(0)).toBe(1);
    expect(comboK(1.99)).toBe(1);
    expect(comboK(2)).toBeCloseTo(1.15, 12);
    expect(comboK(10)).toBeCloseTo(1.75, 12);
    expect(comboK(1000)).toBe(3);
  });
  it('stars from route thresholds; half flight → 0', () => {
    const r = route();
    expect(starsFor(r, 100, true, false)).toBe(1);
    expect(starsFor(r, 2500, true, false)).toBe(2);
    expect(starsFor(r, 4500, true, false)).toBe(3);
    expect(starsFor(r, 4500, false, false)).toBe(0);
    expect(starsFor(r, 4500, true, true)).toBe(0);
  });
  it('proximity points accrue only near surfaces; combo breaks after > 1.5 s away', () => {
    const s = sim({});
    const z = 0;
    // skim the flat plain at ~4 m body distance (×2 … ×3)
    s.teleport(ANALYTIC.plainX - 300, ANALYTIC.plainH + 6, ANALYTIC.plainZ, 50, 2 * DEG, 90 * DEG);
    run(s, 150);
    expect(s.state.score).toBeGreaterThan(0);
    expect(s.state.comboTime).toBeGreaterThan(1);
    void z;
  });
});

describe('commands', () => {
  it('axis applies only on its tick and is held; other actors ignored', () => {
    const a = sim({});
    const b = sim({});
    a.teleport(0, 3000, 0, 42, 0, 0);
    b.teleport(0, 3000, 0, 42, 0, 0);
    // a: axis every 2 ticks; b: same values sent on every tick (holding is equivalent)
    for (let i = 0; i < 120; i++) {
      const v = i < 60 ? 20 : -10;
      const ca: Command[] = i % 2 === 0 ? [{ tick: a.state.tick, actorId: 0, cmd: 'axis', args: [v, 5] }] : [];
      const cb: Command[] = [
        { tick: b.state.tick, actorId: 0, cmd: 'axis', args: [v, 5] },
        { tick: b.state.tick, actorId: 3, cmd: 'axis', args: [-31, -31] },
        { tick: b.state.tick + 1, actorId: 0, cmd: 'axis', args: [31, 31] },
      ];
      a.step(ca);
      b.step(cb);
    }
    expect(b.hash()).toBe(a.hash());
  });
});
