// SÜRÜ.io KUŞATMA + contact-conversion tests — BRIEF §9.G items 22, 23.
import { describe, expect, it } from 'vitest';
import { SuruSim } from '../../src/modes/suru/sim/SuruSim.ts';
import { SURU } from '../../src/modes/suru/sim/config.ts';
import type { SuruCommand, SuruEvent } from '../../src/modes/suru/sim/types.ts';

/** A ring of `nA` attacker birds (radius 15 m, spanning `spanDeg`) around B's leader with `nB` B birds inside. */
function ringScenario(spanDeg: number, nA = 60, nB = 40, seed = 1): SuruSim {
  const posA: { x: number; z: number }[] = [];
  for (let k = 0; k < nA; k++) {
    const a = ((k + 0.5) / nA) * spanDeg * (Math.PI / 180);
    posA.push({ x: Math.cos(a) * 15, z: Math.sin(a) * 15 });
  }
  const posB: { x: number; z: number }[] = [];
  for (let k = 0; k < nB; k++) {
    const a = k * 2.39996;
    const r = 7.5 * Math.sqrt((k + 0.5) / nB);
    posB.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  return new SuruSim({
    seed,
    custom: {
      flocks: [
        { x: 0, z: -150, hx: 1, hz: 0, followers: nA, positions: posA },
        { x: 0, z: 0, hx: 1, hz: 0, followers: nB, positions: posB },
      ],
    },
    freezeMotion: true,
    hawks: false,
    storm: false,
    gusts: false,
    ring: false,
    capture: false,
    lastStanding: false,
  });
}

describe('KUŞATMA (9.G-23)', () => {
  it('300° ring triggers after 0.5 s hold; cascade converts all B birds in 1.5 s ±1 tick, outside → in', () => {
    const sim = ringScenario(360);
    let siegeTick = -1;
    let doneTick = -1;
    const order: number[] = [];
    const prev = new Uint8Array(SURU.N_BIRDS);
    while (sim.tick < 4 * 30 && doneTick < 0) {
      prev.set(sim.owner);
      sim.step([]);
      for (const e of sim.drainEvents()) if (e.type === 'siege') siegeTick = e.tick;
      for (let i = 0; i < SURU.N_BIRDS; i++) if (prev[i] === 2 && sim.owner[i] === 1) order.push(Math.hypot(sim.posX[i], sim.posZ[i]));
      if (siegeTick >= 0 && sim.flockCountArr[2] === 0) doneTick = sim.tick - 1;
    }
    expect(siegeTick).toBe(15); // first satisfied check at tick 0, held 0.5 s
    expect(Math.abs(doneTick - siegeTick - 45)).toBeLessThanOrEqual(1);
    expect(order.length).toBe(40);
    // cascade runs from the outside inward
    for (let k = 1; k < order.length; k++) expect(order[k]).toBeLessThanOrEqual(order[k - 1] + 1e-6);
    expect(sim.flockCountArr[1]).toBe(100);
  });

  it('exactly 300° (gap 60°) still triggers', () => {
    const sim = ringScenario(300);
    let siege = false;
    while (sim.tick < 60) {
      sim.step([]);
      for (const e of sim.drainEvents()) if (e.type === 'siege') siege = true;
    }
    expect(siege).toBe(true);
  });

  it('270° ring (90° gap) never triggers', () => {
    const sim = ringScenario(270);
    let siege = false;
    let maxCover = 0;
    while (sim.tick < 5 * 30) {
      sim.step([]);
      for (const e of sim.drainEvents()) if (e.type === 'siege') siege = true;
      maxCover = Math.max(maxCover, sim.sieges[2].coverage01);
    }
    expect(siege).toBe(false);
    expect(maxCover * 300).toBeLessThan(300);
    expect(maxCover * 300).toBeGreaterThanOrEqual(260);
  });

  it('scripted leader orbit (n ≥ 120) closes ≥ 300° within one lap of settling into the orbit', () => {
    for (const seed of [1, 2]) {
      const sim = new SuruSim({
        seed,
        custom: { flocks: [{ x: 0, z: 40, hx: 1, hz: 0, followers: 130 }, { x: 0, z: 0, hx: 1, hz: 0, followers: 25 }] },
        hawks: false,
        storm: false,
        gusts: false,
        ring: false,
        conversion: false,
        capture: false,
        lastStanding: false,
      });
      const cmds: SuruCommand[] = [];
      let settledAt = -1;
      let angle = 0;
      let lastAng = 0;
      let lapsAtFull = -1;
      let siege = false;
      for (let T = 0; T < 30 * 30 && lapsAtFull < 0; T++) {
        cmds.length = 0;
        const bh = [sim.leaderHX[2], sim.leaderHZ[2]];
        cmds.push({ tick: T, actorId: 2, cmd: 'steer', args: [Math.round((bh[0] * 0.2 - bh[1]) * 120), Math.round((bh[1] * 0.2 + bh[0]) * 120)] });
        const n = sim.flockCountArr[1] + 1;
        const tf = Math.max(0.35, Math.min(1, Math.sqrt(20 / n)));
        const ro = Math.max(sim.flockRadius(2) + 6, sim.leaderSpeed[1] / (SURU.TURN_BASE * tf) + 3);
        const x = sim.leaderX[1] - sim.leaderX[2];
        const z = sim.leaderZ[1] - sim.leaderZ[2];
        const r = Math.hypot(x, z) || 1;
        const k = Math.max(-1, Math.min(2.5, (r - ro) / 10));
        const dx = -z / r - (x / r) * k;
        const dz = x / r - (z / r) * k;
        const l = Math.hypot(dx, dz);
        cmds.push({ tick: T, actorId: 1, cmd: 'steer', args: [Math.round((dx / l) * 127), Math.round((dz / l) * 127)] });
        sim.step(cmds);
        for (const e of sim.drainEvents()) if (e.type === 'siege') siege = true;
        const ang = Math.atan2(z, x);
        let d = ang - lastAng;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        lastAng = ang;
        if (settledAt < 0 && Math.abs(r - ro) < 4) settledAt = T;
        if (settledAt >= 0) angle += d;
        if (settledAt >= 0 && sim.sieges[2].coverage01 >= 1) lapsAtFull = Math.abs(angle) / (2 * Math.PI);
      }
      expect(settledAt).toBeGreaterThanOrEqual(0);
      expect(lapsAtFull).toBeGreaterThanOrEqual(0);
      expect(lapsAtFull).toBeLessThanOrEqual(1.0);
      void siege;
    }
  });
});

function steerOrbit(sim: SuruSim, f: number, cx: number, cz: number, ro: number, sign: number, T: number, out: SuruCommand[]): void {
  const x = sim.leaderX[f] - cx;
  const z = sim.leaderZ[f] - cz;
  const r = Math.hypot(x, z) || 1;
  const k = Math.max(-1, Math.min(2.5, (r - ro) / 10));
  const dx = (-z / r) * sign - (x / r) * k;
  const dz = (x / r) * sign - (z / r) * k;
  const l = Math.hypot(dx, dz);
  out.push({ tick: T, actorId: f, cmd: 'steer', args: [Math.round((dx / l) * 127), Math.round((dz / l) * 127)] });
}

/** Two flocks circling overlapping centres (persistent contact). Returns final follower counts. */
function contactWar(seed: number, nA: number, nB: number, secs: number): [number, number] {
  const sim = new SuruSim({
    seed,
    custom: { flocks: [{ x: -30, z: 0, hx: 1, hz: 0, followers: nA }, { x: 30, z: 0, hx: -1, hz: 0, followers: nB }] },
    hawks: false,
    storm: false,
    gusts: false,
    ring: false,
    capture: false,
    lastStanding: false,
  });
  const cmds: SuruCommand[] = [];
  for (let T = 0; T < secs * 30; T++) {
    cmds.length = 0;
    steerOrbit(sim, 1, -6, 0, 14, 1, T, cmds);
    steerOrbit(sim, 2, 6, 0, 14, -1, T, cmds);
    sim.step(cmds);
    sim.drainEvents();
  }
  return [sim.flockCountArr[1], sim.flockCountArr[2]];
}

describe('Contact conversion (9.G-22, scaled)', () => {
  it('100 vs 50 in contact: the larger side wins the front', () => {
    let wins = 0;
    const seeds = 10;
    for (let s = 1; s <= seeds; s++) {
      const [a] = contactWar(s, 100, 50, 20);
      if (a > 100) wins++;
    }
    expect(wins / seeds).toBeGreaterThanOrEqual(0.9);
  });

  it('equal forces: neither side dominates (scaled sample)', () => {
    let aWins = 0;
    let decided = 0;
    const seeds = 24;
    for (let s = 1; s <= seeds; s++) {
      const [a, b] = contactWar(1000 + s, 75, 75, 8);
      if (a !== b) decided++;
      if (a > b) aWins++;
    }
    const rate = aWins / Math.max(1, decided);
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.75);
  });

  it('conversion events aggregate into colour waves', () => {
    const sim = new SuruSim({
      seed: 4,
      custom: { flocks: [{ x: -30, z: 0, hx: 1, hz: 0, followers: 120 }, { x: 30, z: 0, hx: -1, hz: 0, followers: 40 }] },
      hawks: false,
      storm: false,
      gusts: false,
      ring: false,
      capture: false,
      lastStanding: false,
    });
    const waves: SuruEvent[] = [];
    const cmds: SuruCommand[] = [];
    for (let T = 0; T < 15 * 30; T++) {
      cmds.length = 0;
      steerOrbit(sim, 1, -6, 0, 14, 1, T, cmds);
      steerOrbit(sim, 2, 6, 0, 14, -1, T, cmds);
      cmds.push({ tick: T, actorId: 1, cmd: 'tight', args: [T % 300 < 180 ? 1 : 0] });
      sim.step(cmds);
      for (const e of sim.drainEvents()) if (e.type === 'convertWave') waves.push(e);
    }
    expect(waves.length).toBeGreaterThan(0);
    for (const w of waves) if (w.type === 'convertWave') expect(Number.isFinite(w.x) && w.count > 0).toBe(true);
  });
});
