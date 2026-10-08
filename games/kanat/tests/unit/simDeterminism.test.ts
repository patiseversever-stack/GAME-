// Determinism (same seed + commands → same hash), snapshot/restore, tick cost, prop placement determinism/speed,
// and a flight over the real baked Kapadokya terrain when it is present.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FlightSim } from '../../src/sim/FlightSim.ts';
import { Proximity, ProxResult } from '../../src/sim/flight/proximity.ts';
import { Rng, STREAM } from '../../src/sim/math/rng.ts';
import { AnalyticTerrain } from '../../src/sim/testing/analyticTerrain.ts';
import { exactTerrain } from '../../src/sim/testing/exactRef.ts';
import { Autopilot, makeCanyonRoute, noiseAxis } from '../../src/sim/testing/testRoute.ts';
import type { TerrainSampler } from '../../src/sim/terrain/types.ts';
import { type Command, type RouteDef, WORLD_IDS } from '../../src/sim/types.ts';
import { SIM_VERSION } from '../../src/sim/version.ts';
import { balloonsFor, buildProps } from '../../src/sim/world/props.ts';
import { PropIndex } from '../../src/sim/world/propIndex.ts';

const terrain = new AnalyticTerrain();
const props = buildProps('kapadokya', terrain, {});
const index = new PropIndex(props);
const route = makeCanyonRoute(terrain);
const balloons = balloonsFor('kapadokya', terrain, 7, { anchors: route.line });

function flight(seed: number, ticks: number, sampleEvery = 60): { hashes: number[]; tickMs: number[] } {
  const sim = new FlightSim({ world: 'kapadokya', sampler: terrain, props, propIndex: index, balloons, route, seed, assist: 'full', skipIntro: true });
  const ap = new Autopilot();
  const ax = [0, 0];
  const noise: Command = { tick: 0, actorId: 0, cmd: 'axis', args: [0, 0] };
  const hashes: number[] = [];
  const tickMs: number[] = [];
  for (let i = 0; i < ticks; i++) {
    const st = sim.state;
    const g = route.gates[st.gateIndex];
    ap.target = g ? [g.pos[0], g.pos[1], g.pos[2]] : [route.landing.center[0], route.landing.center[1] + 30, route.landing.center[2]];
    let cmds = ap.commands(st);
    if (seed % 2 === 1 && (st.tick & 1) === 0) {
      noiseAxis(seed, st.tick, ax);
      noise.tick = st.tick;
      noise.args[0] = ax[0];
      noise.args[1] = ax[1];
      cmds = [noise];
    }
    const t0 = performance.now();
    sim.step(cmds);
    tickMs.push(performance.now() - t0);
    sim.drainEvents();
    if (sim.state.tick % sampleEvery === 0) hashes.push(sim.hash());
  }
  hashes.push(sim.hash());
  return { hashes, tickMs };
}

describe('determinism', () => {
  it('SIM_VERSION is a u16', () => {
    expect(Number.isInteger(SIM_VERSION) && SIM_VERSION > 0 && SIM_VERSION < 65536).toBe(true);
  });
  it('3 runs with the same seed + commands give identical hashes every 60 ticks', () => {
    for (const seed of [1, 2, 3]) {
      const a = flight(seed, 3600).hashes;
      const b = flight(seed, 3600).hashes;
      const c = flight(seed, 3600).hashes;
      expect(b).toEqual(a);
      expect(c).toEqual(a);
    }
    expect(flight(1, 600).hashes).not.toEqual(flight(3, 600).hashes);
  });
  it('snapshot / restore continues bit-identically', () => {
    const sim = new FlightSim({ world: 'kapadokya', sampler: terrain, props, propIndex: index, balloons, route, seed: 5, skipIntro: true });
    const ax = [0, 0];
    const cmd: Command = { tick: 0, actorId: 0, cmd: 'axis', args: [0, 0] };
    const stepN = (s: FlightSim, n: number) => {
      for (let i = 0; i < n; i++) {
        noiseAxis(5, s.state.tick, ax);
        cmd.tick = s.state.tick;
        cmd.args[0] = ax[0] >> 2;
        cmd.args[1] = ax[1] >> 2;
        s.step([cmd]);
        s.drainEvents();
      }
    };
    stepN(sim, 300);
    const snap = sim.snapshot();
    stepN(sim, 400);
    const h1 = sim.hash();
    const s1 = sim.state.score;
    sim.restore(snap);
    stepN(sim, 400);
    expect(sim.hash()).toBe(h1);
    expect(sim.state.score).toBe(s1);
  });
  it('prop placement is deterministic and < 300 ms per world (analytic sampler)', () => {
    for (const w of WORLD_IDS) {
      const t0 = performance.now();
      const a = buildProps(w, terrain, {});
      const t1 = performance.now();
      const b = buildProps(w, terrain, {});
      // warm timing (the first call also pays JIT warm-up; parallel test workers add noise)
      const ms = Math.min(t1 - t0, performance.now() - t1);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
      expect(ms).toBeLessThan(300);
      expect(a.length).toBeGreaterThan(100);
      for (const p of a) {
        if (p.type !== 'waterfall') expect(p.prims.length).toBeGreaterThan(0);
        for (const v of p.pos) expect(Number.isFinite(v)).toBe(true);
      }
    }
    const bA = balloonsFor('kapadokya', terrain, 7);
    expect(bA.length).toBe(40);
    expect(JSON.stringify(balloonsFor('kapadokya', terrain, 7))).toBe(JSON.stringify(bA));
    expect(balloonsFor('pamukkale', terrain, 7).length).toBeGreaterThan(0);
    // threadable pairs exist (centers ≤ 35 m)
    let pairs = 0;
    for (let i = 0; i < bA.length; i++)
      for (let j = i + 1; j < bA.length; j++) if (Math.hypot(bA[i].p0[0] - bA[j].p0[0], bA[i].p0[1] - bA[j].p0[1], bA[i].p0[2] - bA[j].p0[2]) <= 35) pairs++;
    expect(pairs).toBeGreaterThan(10);
  });
});

describe('performance (§5.G sim + proximity ≤ 1.5 ms on Mi 9T)', () => {
  it('tick median well under 1.5 ms in Node', () => {
    flight(2, 600); // warm-up (JIT)
    const { tickMs } = flight(2, 3600);
    const s = tickMs.slice().sort((a, b) => a - b);
    const med = s[s.length >> 1];
    const p95 = s[Math.floor(s.length * 0.95)];
    // eslint-disable-next-line no-console
    console.log(`tick cost: median ${(med * 1000).toFixed(1)} µs, p95 ${(p95 * 1000).toFixed(1)} µs`);
    expect(med).toBeLessThan(0.3);
  });
});

const KAP = join(process.cwd(), 'public', 'worlds', 'kapadokya', 'world.json');
const LOADER = join(process.cwd(), 'tools', 'terrain', 'loadNode.ts');
const haveReal = existsSync(KAP) && existsSync(LOADER);

describe.skipIf(!haveReal)('real terrain (public/worlds/kapadokya)', () => {
  it('loads, places props/balloons, proximity matches brute force, flies deterministically', async () => {
    const mod = (await import('../../tools/terrain/loadNode.ts')) as { loadWorldNode: (id: 'kapadokya') => { config: Record<string, unknown>; sampler: TerrainSampler } };
    const W = mod.loadWorldNode('kapadokya');
    const s = W.sampler;
    const t0 = performance.now();
    const rProps = buildProps('kapadokya', s, W.config as Parameters<typeof buildProps>[2]);
    const t1 = performance.now();
    buildProps('kapadokya', s, W.config as Parameters<typeof buildProps>[2]);
    const placeMs = Math.min(t1 - t0, performance.now() - t1);
    expect(placeMs).toBeLessThan(300);
    expect(rProps.filter((p) => p.type === 'chimney').length).toBeGreaterThan(1000);
    const rBalloons = balloonsFor('kapadokya', s, 7);
    expect(rBalloons.length).toBe(40);
    // proximity vs brute force on real terrain
    const prox = new Proximity(s, null, [], []);
    const out = new ProxResult();
    const rng = new Rng(77, STREAM.test);
    let max7 = 0;
    let falseSafe = 0;
    for (let k = 0; k < 400; k++) {
      const x = rng.range(-2500, 2500);
      const z = rng.range(-2500, 2500);
      const y = s.height(x, z) + (k % 2 === 0 ? rng.range(0, 3) : rng.range(0, 30));
      const ex = exactTerrain(s, x, y, z, Math.min(Math.abs(y - s.height(x, z)) + 1, 46));
      prox.query(x, y, z, out);
      if (ex < 7) max7 = Math.max(max7, Math.abs(out.dc - ex));
      if (ex < 0.6 && !(out.dc < 0.6)) falseSafe++;
    }
    expect(max7).toBeLessThanOrEqual(0.5);
    expect(falseSafe).toBe(0);
    // a 60 s flight from 500 m above the center toward a landing zone 2 km east
    const h0 = s.height(0, 0);
    const lx = 2000;
    const rt: RouteDef = {
      id: 'kap-test',
      world: 'kapadokya',
      index: 1,
      difficulty: 1,
      name: { tr: 'Test', en: 'Test' },
      start: { type: 'balon', pos: [0, h0 + 500, 0], headingDeg: 90, speedKmh: 150 },
      line: [],
      gates: [],
      thermals: [{ pos: [400, 0], radius: 50, w0: 6, top: h0 + 700 }],
      landing: { center: [lx, s.height(lx, 0), 0], radius: 25, zoneRadius: 250 },
      wind: { dirDeg: 250, speed: 4 },
      stars: [0, 3000, 6000],
      expertScore: 7000,
      ustaGorevleri: [],
      postcards: [],
    };
    const fly = () => {
      const sim = new FlightSim({ world: 'kapadokya', sampler: s, props: rProps, balloons: rBalloons, route: rt, seed: 9, skipIntro: true });
      const ap = new Autopilot();
      ap.target = [lx, rt.landing.center[1] + 60, 0];
      const times: number[] = [];
      for (let i = 0; i < 3600; i++) {
        const c = ap.commands(sim.state);
        const a = performance.now();
        sim.step(c);
        times.push(performance.now() - a);
        sim.drainEvents();
        const st = sim.state;
        expect(Number.isFinite(st.pos[0] + st.pos[1] + st.pos[2] + st.speed + st.score)).toBe(true);
      }
      times.sort((a, b) => a - b);
      return { hash: sim.hash(), med: times[times.length >> 1], phase: sim.state.phase };
    };
    const a = fly();
    const b = fly();
    expect(b.hash).toBe(a.hash);
    // eslint-disable-next-line no-console
    console.log(`real kapadokya: props ${rProps.length} in ${placeMs.toFixed(0)} ms, prox max|err|(d<7)=${max7.toFixed(3)}, flight phase=${a.phase}, tick median ${(a.med * 1000).toFixed(1)} µs`);
    expect(a.med).toBeLessThan(0.5);
  });
});
