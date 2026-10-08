// Flight model checks 9.G-9 … 9.G-12 (+ control mapping sanity).
import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/sim/data/tuning.ts';
import { FlightSim } from '../../src/sim/FlightSim.ts';
import { GAMMA_TRIM, Glider, V_TRIM } from '../../src/sim/flight/model.ts';
import { AnalyticTerrain } from '../../src/sim/testing/analyticTerrain.ts';
import { noiseAxis } from '../../src/sim/testing/testRoute.ts';
import type { Command, RouteDef } from '../../src/sim/types.ts';

const DT = 1 / 120;
const terrain = new AnalyticTerrain();

function highRoute(): RouteDef {
  return {
    id: 'test-high',
    world: 'kapadokya',
    index: 1,
    difficulty: 1,
    name: { tr: 'Yüksek', en: 'High' },
    start: { type: 'balon', pos: [0, 5000, 0], headingDeg: 90, speedKmh: 150 },
    line: [],
    gates: [],
    thermals: [],
    landing: { center: [9000, 0, 9000], radius: 25, zoneRadius: 250 },
    wind: { dirDeg: 250, speed: 4 },
    stars: [0, 1, 2],
    expertScore: 0,
    ustaGorevleri: [],
    postcards: [],
  };
}

describe('steady glide targets (§4.G.5)', () => {
  it('trim ≈ 42 m/s, sink ≈ 9 m/s, (L/D)max ≈ 4.6', () => {
    expect(V_TRIM).toBeGreaterThan(41);
    expect(V_TRIM).toBeLessThan(43);
    const A = TUNING.aero;
    const ldMax = 1 / (2 * Math.sqrt(A.cd0 * A.k));
    expect(ldMax).toBeCloseTo(4.56, 2);
    const sink = V_TRIM * Math.sin(-GAMMA_TRIM);
    expect(sink).toBeGreaterThan(8.5);
    expect(sink).toBeLessThan(9.5);
  });
});

describe('9.G-9 neutral input', () => {
  it('20 s from 42 m/s: speed stays 38–46 m/s, glide ratio 4–5', () => {
    const g = new Glider();
    g.V = 42;
    g.gamma = 0;
    g.y = 3000;
    let vmin = Infinity;
    let vmax = 0;
    for (let i = 0; i < 20 * 120; i++) {
      g.step(DT, 0, 0, 0, 0, 0, 0);
      vmin = Math.min(vmin, g.V);
      vmax = Math.max(vmax, g.V);
    }
    const glide = Math.sqrt(g.x * g.x + g.z * g.z) / (3000 - g.y);
    expect(vmin).toBeGreaterThanOrEqual(38);
    expect(vmax).toBeLessThanOrEqual(46);
    expect(glide).toBeGreaterThanOrEqual(4);
    expect(glide).toBeLessThanOrEqual(5);
  });
});

describe('9.G-10 dive and pull', () => {
  it('full push reaches 220–232 km/h and never exceeds 235 km/h', () => {
    const g = new Glider();
    g.V = 42;
    g.gamma = GAMMA_TRIM;
    g.y = 6000;
    let vmax = 0;
    for (let i = 0; i < 60 * 120; i++) {
      g.step(DT, 0, -31, 0, 0, 0, 0);
      vmax = Math.max(vmax, g.V * 3.6);
      expect(g.V * 3.6).toBeLessThan(235);
    }
    expect(vmax).toBeGreaterThanOrEqual(220);
    expect(vmax).toBeLessThanOrEqual(232);
  });
  it('full pull from 64 m/s recovers 75–95 % of (V1² − V2²)/2g as altitude', () => {
    const g = new Glider();
    g.V = 64;
    g.gamma = 0;
    g.y = 1000;
    let ymax = -Infinity;
    let v2 = 64;
    for (let i = 0; i < 30 * 120; i++) {
      g.step(DT, 0, 31, 0, 0, 0, 0);
      if (g.y > ymax) {
        ymax = g.y;
        v2 = g.V;
      }
      if (i > 120 && g.vy < 0 && g.y < ymax - 0.01) break;
    }
    const ideal = (64 * 64 - v2 * v2) / (2 * TUNING.sim.g);
    const ratio = (ymax - 1000) / ideal;
    expect(ratio).toBeGreaterThanOrEqual(0.75);
    expect(ratio).toBeLessThanOrEqual(0.95);
  });
});

describe('9.G-11 stall', () => {
  it('continuous full pull at low speed: no NaN, V ≥ 25 m/s, nose drops, no crash', () => {
    const sim = new FlightSim({ world: 'kapadokya', sampler: terrain, route: highRoute(), assist: 'off', skipIntro: true });
    sim.teleport(0, 3000, 0, 30, 0.35, 0);
    const cmd: Command = { tick: 0, actorId: 0, cmd: 'axis', args: [0, 31] };
    let minV = Infinity;
    let minGamma = Infinity;
    for (let i = 0; i < 60 * 30; i++) {
      cmd.tick = sim.state.tick;
      sim.step([cmd]);
      const s = sim.state;
      expect(Number.isFinite(s.pos[0] + s.pos[1] + s.pos[2] + s.speed + s.gamma + s.psi)).toBe(true);
      minV = Math.min(minV, s.speed);
      minGamma = Math.min(minGamma, s.gamma);
    }
    expect(sim.state.phase).toBe('flying');
    expect(minV).toBeGreaterThanOrEqual(25 - 1e-9);
    expect(minGamma).toBeLessThan(-0.1); // the nose dropped
  });
});

describe('9.G-12 energy property', () => {
  it('1,000 random input streams: Ė ≤ 0 every tick outside thermal / ridge lift', () => {
    const route = highRoute();
    const sim = new FlightSim({ world: 'kapadokya', sampler: terrain, route, assist: 'full', skipIntro: true });
    const cmd: Command = { tick: 0, actorId: 0, cmd: 'axis', args: [0, 0] };
    const ax = [0, 0];
    let worst = -Infinity;
    let ticks = 0;
    for (let run = 0; run < 1000; run++) {
      sim.teleport(0, 4000, 0, 30 + (run % 35), ((run % 7) - 3) * 0.2, run * 0.37);
      let e0 = sim.state.energy;
      for (let i = 0; i < 240; i++) {
        if ((sim.state.tick & 1) === 0) {
          noiseAxis(run * 7919 + 13, sim.state.tick + run * 3, ax);
          cmd.args[0] = ax[0];
          cmd.args[1] = ax[1];
        }
        cmd.tick = sim.state.tick;
        sim.step([cmd]);
        const e1 = sim.state.energy;
        worst = Math.max(worst, e1 - e0);
        e0 = e1;
        ticks++;
      }
    }
    expect(ticks).toBe(240000);
    expect(worst).toBeLessThanOrEqual(1e-9);
  });
});

describe('control mapping', () => {
  it('bank target sx/31·65°, rate ≤ 150°/s, release auto-levels', () => {
    const g = new Glider();
    g.y = 3000;
    let maxRate = 0;
    let prev = g.phi;
    for (let i = 0; i < 120; i++) {
      g.step(DT, 31, 0, 0, 0, 0, 0);
      maxRate = Math.max(maxRate, Math.abs(g.phi - prev) / DT);
      prev = g.phi;
    }
    expect(g.phi * (180 / Math.PI)).toBeCloseTo(65, 0);
    expect(maxRate * (180 / Math.PI)).toBeLessThanOrEqual(150 + 1e-6);
    for (let i = 0; i < 240; i++) g.step(DT, 0, 0, 0, 0, 0, 0);
    expect(Math.abs(g.phi)).toBeLessThan(0.01);
  });
});
