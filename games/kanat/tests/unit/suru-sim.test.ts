// SÜRÜ.io simulation tests — BRIEF §9.G items 19, 20, 21, 24, 25 + core rule checks.
// Scaled for the unit suite; full-scale numbers come from tests/unit/suru-balance.mjs.
import { describe, expect, it } from 'vitest';
import { SuruSim } from '../../src/modes/suru/sim/SuruSim.ts';
import { SpatialHash } from '../../src/modes/suru/sim/spatialHash.ts';
import { SURU } from '../../src/modes/suru/sim/config.ts';
import { detAtan2, detCos, detExp, detSin } from '../../src/modes/suru/sim/detMath.ts';
import { Rng } from '../../src/modes/suru/sim/rng.ts';
import { HAND_LAYOUTS, dailyLayout } from '../../src/modes/suru/sim/layouts.ts';
import { createRound, runRound } from '../../src/modes/suru/round.ts';
import type { SuruCommand, SuruEvent } from '../../src/modes/suru/sim/types.ts';

describe('SÜRÜ detMath', () => {
  it('matches Math.* closely and is pure arithmetic', () => {
    let ms = 0;
    let ma = 0;
    let me = 0;
    for (let i = 0; i < 20000; i++) {
      const x = (i / 20000 - 0.5) * 60;
      ms = Math.max(ms, Math.abs(detSin(x) - Math.sin(x)), Math.abs(detCos(x) - Math.cos(x)));
      const y = Math.sin(i * 1.3) * 50;
      const z = Math.cos(i * 0.7) * 50;
      ma = Math.max(ma, Math.abs(detAtan2(y, z) - Math.atan2(y, z)));
      const e = (i / 20000 - 0.5) * 30;
      me = Math.max(me, Math.abs(detExp(e) / Math.exp(e) - 1));
    }
    expect(ms).toBeLessThan(1e-15);
    expect(ma).toBeLessThan(1e-15);
    expect(me).toBeLessThan(1e-15);
  });
});

describe('SÜRÜ spatial hash (9.G-20)', () => {
  it('neighbour sets equal brute force on 1000 random distributions (cap disabled)', () => {
    const N = 1500;
    const px = new Float32Array(N);
    const pz = new Float32Array(N);
    const hash = new SpatialHash(SURU.HASH_HALF, SURU.CELL, N);
    const out = new Uint16Array(N);
    const outD = new Float32Array(N);
    const rng = new Rng(42, 3);
    const r = SURU.CONV_R;
    let mismatches = 0;
    let checked = 0;
    for (let dist = 0; dist < 1000; dist++) {
      // mix of uniform, clustered and edge-hugging distributions
      const mode = dist % 3;
      for (let i = 0; i < N; i++) {
        if (mode === 0) {
          px[i] = rng.range(-310, 310);
          pz[i] = rng.range(-310, 310);
        } else if (mode === 1) {
          const c = (i % 7) * 40 - 120;
          px[i] = c + rng.range(-14, 14);
          pz[i] = -c * 0.5 + rng.range(-14, 14);
        } else {
          px[i] = rng.range(300, 330) * (i % 2 ? 1 : -1);
          pz[i] = rng.range(-330, 330);
        }
      }
      hash.build(px, pz, N);
      // query 12 birds per distribution with both query paths vs brute force
      for (let q = 0; q < 12; q++) {
        const i = rng.int(0, N - 1);
        const nNear = hash.queryNear(px[i], pz[i], r * r, i, N, rng.int(0, 255), out, outD, 0);
        const near = new Set<number>();
        for (let k = 0; k < nNear; k++) near.add(out[k]);
        const nGen = hash.query(px[i], pz[i], r, i, N, out, outD, 0);
        const gen = new Set<number>();
        for (let k = 0; k < nGen; k++) gen.add(out[k]);
        const brute = new Set<number>();
        for (let j = 0; j < N; j++) {
          if (j === i) continue;
          const dx = px[j] - px[i];
          const dz = pz[j] - pz[i];
          if (dx * dx + dz * dz < r * r) brute.add(j);
        }
        checked++;
        const same = (a: Set<number>): boolean => a.size === brute.size && [...a].every((v) => brute.has(v));
        if (!same(near) || !same(gen)) mismatches++;
      }
    }
    expect(checked).toBe(12000);
    expect(mismatches).toBe(0);
  });
});

describe('SÜRÜ conservation, ring and leaders (9.G-19, 9.G-25)', () => {
  it('Σ ownership = 1500 on every tick of full AI-vs-AI rounds; ring 110 m at 180 s; no bot leader outside at −3 s', () => {
    const seeds = [11, 12];
    for (const seed of seeds) {
      const round = createRound({ seed, player: 'utility', league: 2 });
      const res = runRound(round, { checkConservation: true });
      expect(res.conservationOk).toBe(true);
      expect(res.ticks).toBe(SURU.ROUND_SEC * SURU.TICK_HZ);
      expect(res.ringRadiusAtEnd).toBeCloseTo(110, 6);
      expect(res.leadersOutsideRingAtEnd).toBe(0);
      expect(res.winner).toBeGreaterThan(0);
      // every bird is finite and inside the hash bounds
      for (let i = 0; i < SURU.N_BIRDS; i++) {
        expect(Number.isFinite(round.sim.posX[i]) && Number.isFinite(round.sim.posZ[i])).toBe(true);
      }
      const places = res.stats.map((s) => s.rank).sort((a, b) => a - b);
      expect(places).toEqual(res.stats.map((_, k) => k + 1));
    }
  });

  it('ring radius follows 300 → 110 m over the last 45 s', () => {
    const sim = new SuruSim({ seed: 3, hawks: false, storm: false, gusts: false });
    const at = (sec: number): number => {
      while (sim.tick < sec * 30) sim.step([]);
      return sim.ringRadius;
    };
    expect(at(134)).toBe(300);
    expect(at(157.5)).toBeCloseTo(205, 0);
    expect(at(179.99)).toBeGreaterThan(109);
  });
});

describe('SÜRÜ determinism (9.G-21)', () => {
  it('same seed + commands → identical hash stream; different seed differs', () => {
    const run = (seed: number): number[] => {
      const round = createRound({ seed, player: 'utility', league: 3 });
      return runRound(round, { hashEvery: 30, maxTicks: 40 * 30 }).hashes;
    };
    const a = run(77);
    const b = run(77);
    const c = run(78);
    expect(a.length).toBe(40);
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });
});

describe('SÜRÜ rules', () => {
  it('breath: Tight drains 14/s (~7 s), Wide refills 22/s, breathless until 25', () => {
    const sim = new SuruSim({ seed: 1, custom: { flocks: [{ x: 0, z: 0, hx: 1, hz: 0, followers: 15 }] }, hawks: false, storm: false, gusts: false, ring: false, lastStanding: false });
    const events: SuruEvent[] = [];
    sim.step([{ tick: 0, actorId: 1, cmd: 'tight', args: [1] }]);
    let t = 1;
    while (sim.flockBreathless[1] === 0 && t < 400) {
      sim.step([]);
      events.push(...sim.drainEvents());
      t++;
    }
    expect(t / 30).toBeGreaterThan(6.9);
    expect(t / 30).toBeLessThan(7.4);
    expect(events.some((e) => e.type === 'breathless')).toBe(true);
    // still holding: stays breathless (no Tight bonus) and refills to 25 → unlocks
    let k = 0;
    while (sim.flockBreathless[1] === 1 && k < 200) {
      expect(sim.flockMode[1]).toBe(0);
      sim.step([]);
      k++;
    }
    expect(k / 30).toBeGreaterThan(1.0);
    expect(k / 30).toBeLessThan(1.25);
  });

  it('turn rate ω = 140°/s · clamp(√(20/N), 0.35, 1)', () => {
    const measure = (followers: number): number => {
      const sim = new SuruSim({ seed: 2, custom: { flocks: [{ x: 0, z: 0, hx: 1, hz: 0, followers }] }, hawks: false, storm: false, gusts: false, ring: false, lastStanding: false });
      const h0 = Math.atan2(sim.leaderHZ[1], sim.leaderHX[1]);
      sim.step([{ tick: 0, actorId: 1, cmd: 'steer', args: [0, 127] }]);
      const h1 = Math.atan2(sim.leaderHZ[1], sim.leaderHX[1]);
      return ((h1 - h0) * 30 * 180) / Math.PI;
    };
    expect(measure(15)).toBeCloseTo(140, 1); // N = 16 → factor 1
    expect(measure(79)).toBeCloseTo(140 * Math.sqrt(20 / 80), 1);
    expect(measure(399)).toBeCloseTo(140 * 0.35, 1);
  });

  it('wild group joins as a whole; leaders never convert; LP table', () => {
    const sim = new SuruSim({
      seed: 9,
      custom: { flocks: [{ x: -40, z: 0, hx: 1, hz: 0, followers: 15 }], wild: [{ x: 0, z: 0, count: 12 }] },
      hawks: false,
      storm: false,
      gusts: false,
      ring: false,
      lastStanding: false,
    });
    let captured = 0;
    for (let t = 0; t < 30 * 8 && captured === 0; t++) {
      sim.step([{ tick: t, actorId: 1, cmd: 'steer', args: [127, 0] }]);
      for (const e of sim.drainEvents()) if (e.type === 'capture') captured = e.count;
    }
    expect(captured).toBeGreaterThanOrEqual(12);
    expect(SuruSim.leaguePoints(1, 0)).toBe(30);
    expect(SuruSim.leaguePoints(4, 5)).toBe(12 + 9);
    expect(SuruSim.leaguePoints(16, 1)).toBe(-10 + 3);
  });

  it('layouts: 3 hand-made + deterministic daily', () => {
    expect(HAND_LAYOUTS.map((l) => l.name.tr)).toEqual(['Sazlık Körfezi', 'Fener Burnu', 'Taşlı Koy']);
    for (const l of HAND_LAYOUTS) expect(l.islets.length).toBe(4);
    expect(dailyLayout(214)).toEqual(dailyLayout(214));
    expect(dailyLayout(214)).not.toEqual(dailyLayout(215));
    expect(dailyLayout(5).islets.length).toBe(4);
  });
});

describe('SÜRÜ hawk (9.G-24)', () => {
  it('targets the largest flock; scattered birds become wild (owner 0) and keep living', () => {
    const flocks = [
      { x: -120, z: 0, hx: 0, hz: -1, followers: 60 },
      { x: 120, z: 0, hx: 0, hz: 1, followers: 140 },
      { x: 0, z: 120, hx: 1, hz: 0, followers: 30 },
    ];
    const sim = new SuruSim({ seed: 21, custom: { flocks }, storm: false, gusts: false, ring: false, capture: false, conversion: false });
    const scattered: number[] = [];
    const events: SuruEvent[] = [];
    const prevOwner = new Uint8Array(SURU.N_BIRDS);
    while (sim.tick < 75 * 30) {
      prevOwner.set(sim.owner);
      sim.step([]);
      for (const e of sim.drainEvents()) {
        events.push(e);
        if (e.type === 'hawkScatter') {
          for (let i = 0; i < SURU.N_BIRDS; i++) if (prevOwner[i] === e.flock && sim.owner[i] === 0) scattered.push(i);
        }
      }
      expect(sim.ownershipSum()).toBe(SURU.N_BIRDS);
    }
    const warns = events.filter((e) => e.type === 'hawkWarn');
    const hits = events.filter((e) => e.type === 'hawkScatter');
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    for (const w of warns) if (w.type === 'hawkWarn') expect(w.target).toBe(2);
    // first arrival at 0:40 (warning 2 s earlier)
    expect(warns[0].tick).toBe((40 - 2) * 30);
    for (const h of hits) if (h.type === 'hawkScatter') {
      expect(h.flock).toBe(2);
      expect(h.count).toBeGreaterThanOrEqual(1);
      expect(h.count).toBeLessThanOrEqual(Math.ceil(0.12 * 141));
    }
    expect(scattered.length).toBeGreaterThan(0);
    // nobody is harmed: the scattered birds still exist, move, and are recapturable wild birds
    for (const i of scattered) {
      expect(Number.isFinite(sim.posX[i]) && Number.isFinite(sim.posZ[i])).toBe(true);
      const sp = Math.hypot(sim.velX[i], sim.velZ[i]);
      expect(sp).toBeGreaterThan(0.1);
    }
    const stillWild = scattered.filter((i) => sim.owner[i] === 0).length;
    expect(stillWild).toBeGreaterThan(0);
  });

  it('Sıkı Dizi halves the scatter', () => {
    const count = (tight: boolean): number => {
      let total = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const sim = new SuruSim({ seed, custom: { flocks: [{ x: 0, z: 0, hx: 1, hz: 0, followers: 200 }] }, storm: false, gusts: false, ring: false, lastStanding: false, conversion: false, capture: false });
        const cmds: SuruCommand[] = [];
        while (sim.tick < 44 * 30) {
          cmds.length = 0;
          const hx = sim.leaderHX[1];
          const hz = sim.leaderHZ[1];
          cmds.push({ tick: sim.tick, actorId: 1, cmd: 'steer', args: [Math.round((hx * 0.3 - hz) * 120), Math.round((hz * 0.3 + hx) * 120)] });
          cmds.push({ tick: sim.tick, actorId: 1, cmd: 'tight', args: [tight ? 1 : 0] });
          if (tight) sim.flockBreath[1] = 100;
          sim.step(cmds);
          for (const e of sim.drainEvents()) if (e.type === 'hawkScatter') total += e.count;
        }
      }
      return total;
    };
    const wide = count(false);
    const tight = count(true);
    expect(wide).toBeGreaterThan(0);
    expect(tight / wide).toBeGreaterThan(0.35);
    expect(tight / wide).toBeLessThan(0.65);
  });
});
