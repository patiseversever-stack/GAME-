// SÜRÜ.io balance smoke + performance (BRIEF §9.G-26, 9.G-27). Statistically meaningful balance needs ~500
// rounds (minutes of CPU) → tests/unit/suru-balance.mjs; this suite runs a scaled sample and guards against
// gross imbalance and perf regressions. Strict perf gate: SURU_PERF_STRICT=1 (idle machine).
import { describe, expect, it } from 'vitest';
import { createRound, runRound } from '../../src/modes/suru/round.ts';
import { SuruSim } from '../../src/modes/suru/sim/SuruSim.ts';
import type { SuruCommand } from '../../src/modes/suru/sim/types.ts';

describe('SÜRÜ balance smoke (9.G-26, scaled)', () => {
  it('AI-only rounds: no personality wins every round; first-minute leader does not always win', () => {
    const wins: Record<string, number> = {};
    let snow = 0;
    const N = 6;
    for (let k = 0; k < N; k++) {
      const round = createRound({ seed: 777 + k * 31, player: 'utility', league: 2 });
      const res = runRound(round);
      const p = res.winnerPersonality ?? 'none';
      wins[p] = (wins[p] ?? 0) + 1;
      if (res.leaderAt60 === res.winner) snow++;
      expect(res.winner).toBeGreaterThan(0);
    }
    for (const v of Object.values(wins)) expect(v).toBeLessThan(N);
    expect(Object.keys(wins).length).toBeGreaterThanOrEqual(2);
    expect(snow).toBeLessThan(N);
  });
});

/** Worst case: 4 × 370 birds, all Sıkı Dizi, leaders circling one point → one dense swirling melee. */
function denseTickMedian(seed: number): number {
  const flocks = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    flocks.push({ x: Math.cos(a) * 25, z: Math.sin(a) * 25, hx: -Math.sin(a), hz: Math.cos(a), followers: 370 });
  }
  const sim = new SuruSim({ seed, custom: { flocks }, hawks: false, storm: false, gusts: false, ring: false });
  const times: number[] = [];
  const cmds: SuruCommand[] = [];
  for (let T = 0; T < 240; T++) {
    cmds.length = 0;
    for (let f = 1; f <= 4; f++) {
      const x = sim.leaderX[f];
      const z = sim.leaderZ[f];
      const r = Math.hypot(x, z) || 1;
      const k = (r - 22) / 10;
      cmds.push({ tick: T, actorId: f, cmd: 'steer', args: [Math.round((-z / r - (x / r) * k) * 90), Math.round((x / r - (z / r) * k) * 90)] });
      cmds.push({ tick: T, actorId: f, cmd: 'tight', args: [1] });
      if (sim.flockBreath[f] < 30) sim.flockBreath[f] = 100;
    }
    const t0 = performance.now();
    sim.step(cmds);
    times.push(performance.now() - t0);
    sim.drainEvents();
  }
  times.splice(0, 60);
  times.sort((a, b) => a - b);
  return times[times.length >> 1];
}

describe('SÜRÜ performance (9.G-27)', () => {
  it('dense Sıkı Dizi melee: median tick (Node)', () => {
    // machine-speed reference: a fixed scalar loop (≈ 1.2 ns/iter on an idle 2.1 GHz Xeon core)
    const a = new Float32Array(1 << 16);
    for (let i = 0; i < a.length; i++) a[i] = i * 0.001;
    let best = Infinity;
    for (let rep = 0; rep < 5; rep++) {
      const t0 = performance.now();
      let s = 0;
      for (let k = 0; k < 60; k++) for (let i = 0; i < a.length; i++) s += (a[i] - 0.5) * (a[i] - 0.5) < 36 ? 1 : 0;
      best = Math.min(best, ((performance.now() - t0) / (60 * a.length)) * 1e6);
      if (s < 0) throw new Error('unreachable');
    }
    const medians = [1, 2, 3].map(denseTickMedian);
    const median = Math.min(...medians);
    const normalised = median * (1.24 / best);
    console.log(`[suru perf] dense tick median ${median.toFixed(3)} ms (runs ${medians.map((m) => m.toFixed(3)).join(', ')}), ref loop ${best.toFixed(2)} ns/iter → normalised to idle core ${normalised.toFixed(3)} ms`);
    const strict = process.env.SURU_PERF_STRICT === '1';
    expect(strict ? median : normalised).toBeLessThan(strict ? 1.0 : 1.6);
  });
});
