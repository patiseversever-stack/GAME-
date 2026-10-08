import { describe, expect, it } from 'vitest';
import { HAPTIC_PATTERNS, Haptics, onTime, resolveHaptic } from '../../src/audio/haptics.ts';
import type { HapticName } from '../../src/audio/haptics.ts';

function rig(mode: 'on' | 'low' | 'off' = 'on') {
  let t = 1000;
  const sent: { p: number[]; name?: string; bridge?: string; t: number }[] = [];
  const h = new Haptics({
    now: () => t,
    sink: (p, name, bridge) => sent.push({ p: p as number[], name, bridge, t }),
  });
  h.setMode(mode);
  return {
    h,
    sent,
    advance(ms: number) {
      t += ms;
    },
    get t() {
      return t;
    },
  };
}

describe('haptic patterns (§2.3 / §7.2)', () => {
  it('match the brief durations', () => {
    const ms = (n: HapticName) => [...HAPTIC_PATTERNS[n].ms];
    expect(ms('hafif')).toEqual([12]);
    expect(ms('orta')).toEqual([25]);
    expect(ms('çift')).toEqual([10, 40, 10]);
    expect(ms('yıldız')).toEqual([40]);
    expect(ms('kapı')).toEqual([18]);
    expect(ms('kanat')).toEqual([25]);
    expect(ms('paraşüt')[0]).toBe(50);
    expect(ms('paraşüt')[2]).toBe(30);
    expect(ms('çarpma')).toEqual([90]);
    expect(ms('termal')).toEqual([6]);
    expect(ms('yumuşak')).toEqual([30]);
  });

  it('resolves English / ASCII aliases', () => {
    expect(resolveHaptic('light')).toBe('hafif');
    expect(resolveHaptic('heavy')).toBe('güçlü');
    expect(resolveHaptic('cift')).toBe('çift');
    expect(resolveHaptic('star')).toBe('yıldız');
    expect(resolveHaptic('nope')).toBeNull();
  });

  it('sends ms arrays plus canonical + bridge names to the sink', () => {
    const r = rig();
    expect(r.h.play('çift')).toBe(true);
    expect(r.sent[0]).toMatchObject({ p: [10, 40, 10], name: 'çift', bridge: 'light' });
    r.h.play('crash');
    expect(r.sent[1]).toMatchObject({ p: [90], name: 'çarpma', bridge: 'heavy' });
    // The sink gets a copy: mutating it cannot corrupt the table.
    r.sent[1].p[0] = 1;
    expect(HAPTIC_PATTERNS['çarpma'].ms[0]).toBe(90);
  });
});

describe('fatigue limiter (≤ 150 ms vibration per second)', () => {
  it('drops low-priority patterns that would exceed the budget', () => {
    const r = rig();
    r.h.play('çarpma'); // 90
    r.h.play('yıldız'); // 40 → 130
    r.h.play('kapı'); // 18 → 148
    expect(r.h.used()).toBe(148);
    expect(r.h.play('hafif')).toBe(false); // 12 would make 160
    expect(r.h.dropped).toBe(1);
    // Window slides: 1 s later everything is allowed again.
    r.advance(1001);
    expect(r.h.used()).toBe(0);
    expect(r.h.play('hafif')).toBe(true);
  });

  it('shortens high-priority patterns to fit the remaining budget', () => {
    const r = rig();
    r.h.play('çarpma'); // 90
    r.advance(10);
    expect(r.h.play('paraşüt')).toBe(true); // 80 on-time → trimmed to ≤ 60
    const last = r.sent[r.sent.length - 1].p;
    expect(onTime(last)).toBeLessThanOrEqual(60);
    expect(r.h.used()).toBeLessThanOrEqual(150);
  });

  it('never exceeds the budget in any 1 s window under a random storm of requests', () => {
    const r = rig();
    const names = Object.keys(HAPTIC_PATTERNS);
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 2000; i++) {
      r.h.play(names[Math.floor(rnd() * names.length)]);
      r.advance(rnd() * 40);
    }
    // Check every window from the log.
    for (let i = 0; i < r.sent.length; i++) {
      let sum = 0;
      for (let j = i; j < r.sent.length && r.sent[j].t < r.sent[i].t + 1000; j++) sum += onTime(r.sent[j].p);
      expect(sum).toBeLessThanOrEqual(150);
    }
  });
});

describe('modes and thermal ticks', () => {
  it('thermal: 6 ms ticks at 6 Hz while inside', () => {
    const r = rig();
    r.h.setThermal(true);
    for (let i = 0; i < 60; i++) {
      r.h.update(r.t);
      r.advance(1000 / 60);
    }
    const ticks = r.sent.filter((s) => s.name === 'termal');
    expect(ticks.length).toBeGreaterThanOrEqual(5);
    expect(ticks.length).toBeLessThanOrEqual(7);
    expect(ticks.every((s) => s.p[0] === 6)).toBe(true);
    r.h.setThermal(false);
    const n = r.sent.length;
    for (let i = 0; i < 30; i++) {
      r.h.update(r.t);
      r.advance(16);
    }
    expect(r.sent.length).toBe(n);
  });

  it("'low' (Az): thermal ticks off, pulses shortened", () => {
    const r = rig('low');
    r.h.setThermal(true);
    r.h.update(r.t);
    expect(r.sent.length).toBe(0);
    r.h.play('çarpma');
    expect(r.sent[0].p[0]).toBe(54);
    r.h.play('hafif');
    expect(r.sent[1].p[0]).toBe(8);
  });

  it("'off': nothing is sent", () => {
    const r = rig('off');
    expect(r.h.play('çarpma')).toBe(false);
    expect(r.sent.length).toBe(0);
  });

  it('works without a sink (no throw)', () => {
    const h = new Haptics({ sink: null, now: () => 0 });
    expect(h.play('orta')).toBe(true);
  });
});
