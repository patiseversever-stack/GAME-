// Proximity strip (Yakınlık şeridi) — BRIEF §2.5 Mod 2, §2.8.
import { describe, expect, it } from 'vitest';
import { ProximityStripAccumulator, multToTier, stripEmoji } from '../../src/sim/replay/proximityStrip.ts';

const DT = 1 / 60;

/** Flies s from 0 to 1 over `ticks`, multiplier given by fn(s). */
function fly(acc: ProximityStripAccumulator, ticks: number, fn: (s: number) => number): void {
  for (let i = 0; i < ticks; i++) {
    const s = i / (ticks - 1);
    acc.add(s, fn(s), DT);
  }
}

describe('ProximityStripAccumulator', () => {
  it('reproduces the brief card strip 🟨🟨🟧🟥🟥', () => {
    const acc = new ProximityStripAccumulator();
    fly(acc, 7200, (s) => (s < 0.4 ? 2 : s < 0.6 ? 3 : 5));
    const r = acc.result();
    expect(r.emoji).toBe('🟨🟨🟧🟥🟥');
    expect(r.tiers).toEqual([2, 2, 3, 4, 4]);
    expect(r.visited).toEqual([true, true, true, true, true]);
  });

  it('picks the tier with the most time inside each fifth, not the closest', () => {
    const acc = new ProximityStripAccumulator();
    // segment 0: 3 s at ×5, 5 s at ×1 → 🟩 ; segment 1: only > 30 m → ⬜
    for (let i = 0; i < 180; i++) acc.add(0.05, 5, DT);
    for (let i = 0; i < 300; i++) acc.add(0.1, 1, DT);
    for (let i = 0; i < 300; i++) acc.add(0.3, 0, DT);
    for (let i = 0; i < 100; i++) acc.add(0.5, 3, DT);
    for (let i = 0; i < 100; i++) acc.add(0.7, 2, DT);
    for (let i = 0; i < 100; i++) acc.add(0.95, 5, DT);
    expect(acc.result().emoji).toBe('🟩⬜🟧🟨🟥');
    expect(acc.timeAtOrAbove(3)).toBeCloseTo(380 / 60, 9);
    expect(acc.timeAtOrAbove(0)).toBeCloseTo(acc.totalTime(), 9);
  });

  it('segment boundaries split the route into 5 equal parts; s is clamped; junk samples ignored', () => {
    const acc = new ProximityStripAccumulator();
    acc.add(0.2, 1, 1); // exactly 0.2 → segment 1
    acc.add(0.1999, 2, 1); // segment 0
    acc.add(-0.5, 3, 1); // clamped → segment 0 (×3 ties ×2 at 1 s → higher tier wins)
    acc.add(1, 5, 1); // s = 1 → last segment
    acc.add(7, 5, 1);
    acc.add(Number.NaN, 5, 100);
    acc.add(0.5, 5, 0);
    acc.add(0.5, 5, -1);
    const r = acc.result();
    expect(r.tiers).toEqual([3, 1, 0, 0, 4]);
    expect(r.visited).toEqual([true, true, false, false, true]);
    expect(r.emoji).toBe('🟧🟩⬜⬜🟥');
    expect(acc.totalTime()).toBe(5);
  });

  it('3★ helper: ≥ 15 s at ×3 or closer', () => {
    const acc = new ProximityStripAccumulator();
    for (let i = 0; i < 15 * 60; i++) acc.add(i / 900, i % 2 ? 3 : 5, DT);
    expect(acc.timeAtOrAbove(3)).toBeGreaterThanOrEqual(15 - 1e-9);
    expect(acc.timeAtOrAbove(4)).toBeCloseTo(7.5, 9);
  });

  it('mult → tier mapping and reset', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(multToTier)).toEqual([0, 1, 2, 3, 3, 4, 4]);
    expect(stripEmoji([0, 1, 2, 3, 4])).toBe('⬜🟩🟨🟧🟥');
    const acc = new ProximityStripAccumulator();
    acc.add(0.5, 5, 1);
    acc.reset();
    expect(acc.result().emoji).toBe('⬜⬜⬜⬜⬜');
    expect(acc.totalTime()).toBe(0);
  });

  it('add() is cheap enough for every tick (1M samples)', () => {
    const acc = new ProximityStripAccumulator();
    const t0 = performance.now();
    for (let i = 0; i < 1_000_000; i++) acc.add((i % 7200) / 7200, i % 6, DT);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(acc.result().tiers.length).toBe(5);
  });
});
