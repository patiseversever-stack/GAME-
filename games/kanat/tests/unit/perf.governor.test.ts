import { describe, expect, it } from 'vitest';
import { Governor } from '../../src/perf/governor.ts';
import type { GovernorEvent } from '../../src/perf/governor.ts';
import { mpRange } from '../../src/perf/tiers.ts';

const NATIVE = 3.0; // 1170×2532-class screen
const T60 = 1000 / 60;

interface Feed {
  ms: number;
  /** frame interval (ms) — number or fn(tMs) */
  interval: number | ((t: number) => number);
  cpu?: number | ((t: number) => number);
  /** probed cost (ms), sampled once per second */
  cost?: number | ((t: number) => number);
  target?: number;
}

function harness(g: Governor) {
  let t = 0;
  const events: (GovernorEvent & { at: number })[] = [];
  g.on((e) => events.push({ ...e, at: t }));
  const val = (v: number | ((t: number) => number) | undefined, def: number) => (v === undefined ? def : typeof v === 'number' ? v : v(t));
  let lastProbe = -Infinity;
  return {
    events,
    get now() {
      return t;
    },
    feed(f: Feed) {
      const end = t + f.ms;
      while (t < end) {
        const iv = val(f.interval, T60);
        t += iv;
        let cost = NaN;
        if (f.cost !== undefined && t - lastProbe >= 1000) {
          lastProbe = t;
          cost = val(f.cost, 0);
        }
        g.frame(t, iv, val(f.cpu, 4), cost, f.target ?? T60);
      }
    },
    brk() {
      return g.naturalBreak(t);
    },
  };
}

describe('governor — drop', () => {
  it('scales resolution first (≤5 %/step, ≥500 ms apart), then drops one tier at the next natural break', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.6 });
    const h = harness(g);
    h.feed({ ms: 30_000, interval: 22, cpu: 6 }); // p90 22 ms > 18.5
    const res = h.events.filter((e) => e.type === 'resolution' && e.reason === 'pressure') as Extract<GovernorEvent, { type: 'resolution' }>[] & { at: number }[];
    expect(res.length).toBeGreaterThan(3);
    let prevMp = 1.6;
    let prevAt = -Infinity;
    for (const e of res as unknown as { mp: number; at: number }[]) {
      expect(e.mp / prevMp).toBeGreaterThanOrEqual(0.95 - 1e-9);
      expect(e.at - prevAt).toBeGreaterThanOrEqual(500);
      prevMp = e.mp;
      prevAt = e.at;
    }
    expect(g.atFloor).toBe(true);
    expect(g.pendingDrop).toBe(true);
    // not applied mid-flight
    expect(g.tier).toBe('high');
    expect(h.events.some((e) => e.type === 'tier')).toBe(false);
    const change = h.brk();
    expect(change).toEqual({ from: 'high', to: 'medium', reason: 'drop' });
    expect(g.droppedThisSession).toBe(true);
    // continuity: the new tier starts at its ceiling
    expect(g.mp).toBeCloseTo(mpRange('medium', NATIVE)[1], 6);
  });

  it('needs the bad p90 for 3 s at the floor before flagging a drop', () => {
    const g = new Governor({ tier: 'medium', nativeMp: NATIVE, mp: 0.65 });
    const h = harness(g);
    h.feed({ ms: 2000, interval: 16.7 });
    h.feed({ ms: 2600, interval: 21 });
    expect(g.pendingDrop).toBe(false);
    h.feed({ ms: 1500, interval: 21 });
    expect(g.pendingDrop).toBe(true);
    expect(h.brk()?.to).toBe('low');
  });

  it('emergency (p90 > 28 ms for 2 s): relief first (res floor + particles), then an immediate tier drop', () => {
    const g = new Governor({ tier: 'ultra', nativeMp: NATIVE, mp: 2.2 });
    const h = harness(g);
    h.feed({ ms: 3200, interval: 36, cpu: 16 }); // 20-frame warm-up + 2 s sustained
    const relief = h.events.find((e) => e.type === 'relief') as Extract<GovernorEvent, { type: 'relief' }> | undefined;
    expect(relief).toBeDefined();
    expect(relief!.particleScale).toBe(0.5);
    expect(g.mp).toBeCloseTo(g.mpFloor, 6);
    expect(g.tier).toBe('ultra');
    h.feed({ ms: 2600, interval: 36, cpu: 16 });
    const tier = h.events.find((e) => e.type === 'tier') as Extract<GovernorEvent, { type: 'tier' }> | undefined;
    expect(tier).toMatchObject({ from: 'ultra', to: 'high', reason: 'emergency' });
    // relief came before the shader-changing drop
    expect(h.events.findIndex((e) => e.type === 'relief')).toBeLessThan(h.events.findIndex((e) => e.type === 'tier'));
  });

  it('never drops below low', () => {
    const g = new Governor({ tier: 'low', nativeMp: NATIVE, mp: 0.45 });
    const h = harness(g);
    h.feed({ ms: 20_000, interval: 40, cpu: 20 });
    h.brk();
    expect(g.tier).toBe('low');
  });
});

describe('governor — raise', () => {
  it('raises once at a natural break after 20 s of p90 cost < 10 ms at the resolution ceiling', () => {
    const g = new Governor({ tier: 'medium', nativeMp: NATIVE, mp: 1.0 });
    const h = harness(g);
    h.feed({ ms: 15_000, interval: T60, cost: 7 });
    expect(h.brk()).toBeNull(); // not 20 s yet (5 probe samples are needed before the clock starts)
    h.feed({ ms: 12_000, interval: T60, cost: 7 });
    expect(h.events.some((e) => e.type === 'tier')).toBe(false); // never mid-flight
    expect(h.brk()).toEqual({ from: 'medium', to: 'high', reason: 'raise' });
    expect(g.mp).toBeCloseTo(mpRange('high', NATIVE)[0], 6);
    // at most once per session
    h.feed({ ms: 60_000, interval: T60, cost: 5 });
    expect(h.brk()).toBeNull();
    expect(g.tier).toBe('high');
  });

  it('does not raise without probe data (cost unknown)', () => {
    const g = new Governor({ tier: 'medium', nativeMp: NATIVE, mp: 1.0 });
    const h = harness(g);
    h.feed({ ms: 30_000, interval: T60, cpu: 2 });
    expect(h.brk()).toBeNull();
  });

  it('respects maxTier from the static guess', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.6, maxTier: 'high' });
    const h = harness(g);
    h.feed({ ms: 30_000, interval: T60, cost: 5 });
    expect(h.brk()).toBeNull();
  });
});

describe('governor — no oscillation', () => {
  it('never raises after a drop in the same session (alternating heavy / light phases)', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.0 });
    const h = harness(g);
    const tierChanges: string[] = [];
    g.on((e) => {
      if (e.type === 'tier') tierChanges.push(`${e.from}->${e.to}:${e.reason}`);
    });
    // the heavy scene is too much for High but fine on Medium; light scenes tempt a raise
    const heavyInterval = () => (g.tier === 'high' ? 21 : T60);
    const heavyCost = () => (g.tier === 'high' ? 19 : 13);
    for (let round = 0; round < 8; round++) {
      h.feed({ ms: 6_000, interval: heavyInterval, cpu: 8, cost: heavyCost }); // heavy scene
      h.feed({ ms: 25_000, interval: T60, cpu: 3, cost: 5 }); // light scene
      h.brk(); // round end
    }
    expect(tierChanges).toEqual(['high->medium:drop']);
    expect(g.tier).toBe('medium');
  });

  it('closed loop: resolution settles without hunting', () => {
    // frame cost ∝ MP; this device keeps 60 fps up to ~1.35 MP on High
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.6 });
    const h = harness(g);
    const costOf = () => 12.4 * g.mp;
    const interval = () => Math.max(T60, costOf()) * (1 + ((h.now * 7919) % 13) / 400); // ±3 % noise
    h.feed({ ms: 90_000, interval, cpu: 5, cost: costOf });
    const res = h.events.filter((e) => e.type === 'resolution') as unknown as { mp: number }[];
    let reversals = 0;
    for (let i = 2; i < res.length; i++) {
      const d1 = Math.sign(res[i - 1].mp - res[i - 2].mp);
      const d2 = Math.sign(res[i].mp - res[i - 1].mp);
      if (d1 !== 0 && d2 !== 0 && d1 !== d2) reversals++;
    }
    expect(reversals).toBeLessThanOrEqual(2);
    expect(g.tier).toBe('high');
    expect(g.mp).toBeLessThan(1.6);
    expect(g.mp).toBeGreaterThanOrEqual(1.0);
  });
});

describe('governor — iOS Low Power Mode trap', () => {
  it('steady 33 ms + low CPU is a constraint: no drop, no resolution loss', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.3 });
    const h = harness(g);
    h.feed({ ms: 2_000, interval: T60, cpu: 4, cost: 9 });
    h.feed({ ms: 60_000, interval: (t) => 33.33 + Math.sin(t) * 0.3, cpu: 4, cost: 9 });
    expect(g.constraint).toBe(true);
    expect(h.events.some((e) => e.type === 'constraint' && e.active)).toBe(true);
    expect(g.pendingDrop).toBe(false);
    expect(h.events.some((e) => e.type === 'relief')).toBe(false);
    expect(h.brk()).toBeNull();
    expect(g.tier).toBe('high');
    expect(g.mp).toBeGreaterThanOrEqual(1.3); // never lowered (GPU headroom may even raise it)
    expect(h.events.some((e) => e.type === 'resolution' && e.reason === 'pressure')).toBe(false);
  });

  it('the same 33 ms with a busy CPU is a real problem (control case)', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.3 });
    const h = harness(g);
    h.feed({ ms: 20_000, interval: (t) => 33.33 + Math.sin(t) * 0.3, cpu: 22 });
    expect(g.constraint).toBe(false);
    expect(h.events.some((e) => e.type === 'relief' || e.type === 'tier')).toBe(true);
  });

  it('constraint lifts when the cap goes away', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.3 });
    const h = harness(g);
    h.feed({ ms: 10_000, interval: 33.33, cpu: 4 });
    expect(g.constraint).toBe(true);
    h.feed({ ms: 10_000, interval: T60, cpu: 4 });
    expect(g.constraint).toBe(false);
  });
});

describe('governor — thermal drift', () => {
  it('slow median creep over 10+ min lowers resolution first, then particles; never the tier', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.6 });
    const h = harness(g);
    const minutes = 24;
    // cost creeps 8 ms → 16 ms; frames stay on time (vsync-locked 60 fps)
    const cost = (t: number) => 8 + (8 * t) / (minutes * 60_000);
    h.feed({ ms: minutes * 60_000, interval: T60, cpu: (t) => cost(t) * 0.4, cost });
    const thermal = h.events.filter((e) => e.type === 'thermal') as unknown as { level: number; mpCeil: number; particleScale: number; at: number }[];
    expect(thermal.length).toBeGreaterThanOrEqual(3);
    expect(thermal[0].at).toBeGreaterThanOrEqual(10 * 60_000);
    // order: resolution steps (levels 1–2) keep particles at 1, then particles
    expect(thermal[0].particleScale).toBe(1);
    expect(thermal[0].mpCeil).toBeLessThan(1.6);
    expect(thermal[1].particleScale).toBe(1);
    expect(thermal[2].particleScale).toBeLessThan(1);
    const thermalRes = h.events.filter((e) => e.type === 'resolution' && e.reason === 'thermal');
    expect(thermalRes.length).toBeGreaterThan(0);
    expect(h.events.findIndex((e) => e.type === 'resolution' && e.reason === 'thermal')).toBeLessThan(
      h.events.findIndex((e) => e.type === 'thermal' && e.particleScale < 1),
    );
    expect(g.tier).toBe('high');
    expect(g.pendingDrop).toBe(false);
    expect(h.events.some((e) => e.type === 'tier')).toBe(false);
  });

  it('flat cost for 20 min → no thermal action', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.6 });
    const h = harness(g);
    h.feed({ ms: 20 * 60_000, interval: T60, cpu: 4, cost: (t) => 9 + Math.sin(t / 5000) * 0.4 });
    expect(h.events.some((e) => e.type === 'thermal')).toBe(false);
  });
});

describe('governor — manual mode', () => {
  it('only scales resolution, never changes tier or particles, suggests once', () => {
    const g = new Governor({ tier: 'high', manual: true, nativeMp: NATIVE, mp: 1.6 });
    const h = harness(g);
    h.feed({ ms: 40_000, interval: 24, cpu: 9 });
    h.feed({ ms: 10_000, interval: 38, cpu: 18 });
    expect(h.brk()).toBeNull();
    expect(g.tier).toBe('high');
    expect(g.particleScale).toBe(1);
    expect(g.atFloor).toBe(true);
    const sugg = h.events.filter((e) => e.type === 'suggestion');
    expect(sugg).toHaveLength(1);
    expect(sugg[0]).toMatchObject({ tier: 'medium' });
    expect(h.events.some((e) => e.type === 'tier' || e.type === 'relief' || e.type === 'pendingDrop')).toBe(false);
  });

  it('manual mode does not raise either', () => {
    const g = new Governor({ tier: 'low', manual: true, nativeMp: NATIVE, mp: 0.65 });
    const h = harness(g);
    h.feed({ ms: 40_000, interval: T60, cost: 3 });
    expect(h.brk()).toBeNull();
    expect(g.tier).toBe('low');
  });
});

describe('governor — stable tier', () => {
  it('reports a stable tier after 3 min without a drop', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE });
    const h = harness(g);
    h.feed({ ms: 170_000, interval: T60, cost: 12 });
    expect(h.events.some((e) => e.type === 'stable')).toBe(false);
    h.feed({ ms: 15_000, interval: T60, cost: 12 });
    expect(h.events.filter((e) => e.type === 'stable')).toHaveLength(1);
  });

  it('battery mode (30 fps target) scales thresholds: 33 ms frames are fine', () => {
    const g = new Governor({ tier: 'high', nativeMp: NATIVE, mp: 1.3 });
    const h = harness(g);
    h.feed({ ms: 30_000, interval: 33.4, cpu: 14, target: 2 * T60 });
    expect(g.pendingDrop).toBe(false);
    expect(h.events.some((e) => e.type === 'relief' || (e.type === 'resolution' && e.reason === 'pressure'))).toBe(false);
  });
});
