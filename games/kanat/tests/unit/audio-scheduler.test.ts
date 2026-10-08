import { describe, expect, it } from 'vitest';
import { MUSIC_WORLDS, THEMES, suruSection } from '../../src/audio/music/patterns.ts';
import { IntensityTracker, LayerGates, StepClock, resolveNote } from '../../src/audio/music/scheduler.ts';
import { SCALES } from '../../src/audio/scales.ts';

describe('StepClock (lookahead scheduler timing)', () => {
  it('emits every step exactly once across arbitrary jittery windows, with exact times', () => {
    const c = new StepClock(1.0, 0.125, 16);
    const seen: number[] = [];
    const times: number[] = [];
    // Simulate a jittery 25 ms timer with 0.2 s lookahead.
    let now = 1.0;
    const jitter = [0.025, 0.031, 0.018, 0.04, 0.022, 0.027, 0.06, 0.012];
    for (let k = 0; k < 400; k++) {
      c.collect(now, now + 0.2, (step, t, late) => {
        expect(late).toBe(false);
        seen.push(step);
        times.push(t);
      });
      now += jitter[k % jitter.length];
    }
    expect(seen.length).toBeGreaterThan(80);
    for (let i = 0; i < seen.length; i++) {
      expect(seen[i]).toBe(i);
      // start + n·dur, no accumulation drift
      expect(times[i]).toBe(1.0 + i * 0.125);
    }
  });

  it('never schedules beyond the lookahead horizon', () => {
    const c = new StepClock(0, 0.1, 8);
    let last = -1;
    c.collect(0, 0.35, (_s, t) => {
      last = t;
    });
    expect(last).toBeLessThan(0.35);
    expect(c.next).toBe(4); // 0, .1, .2, .3
  });

  it('skips late steps (throttled timer) instead of bursting them, but still reports them', () => {
    const c = new StepClock(0, 0.1, 4);
    c.collect(0, 0.15, () => undefined);
    const late: number[] = [];
    const ontime: number[] = [];
    // Timer stalls for 1 s.
    c.collect(1.0, 1.2, (s, _t, isLate) => (isLate ? late : ontime).push(s));
    expect(late).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ontime).toEqual([10, 11]);
    expect(c.skipped).toBe(8);
  });

  it('computes bars, steps-in-bar and the next bar boundary', () => {
    const c = new StepClock(2, 0.25, 16); // bar = 4 s
    expect(c.barDur).toBe(4);
    expect(c.barOf(15)).toBe(0);
    expect(c.barOf(16)).toBe(1);
    expect(c.stepInBar(37)).toBe(5);
    expect(c.nextBarTime(2)).toBe(2);
    expect(c.nextBarTime(2.01)).toBe(6);
    expect(c.nextBarTime(9.99)).toBe(10);
    expect(c.nextBarTime(0)).toBe(2);
  });
});

describe('LayerGates (bar-quantized layer switching)', () => {
  it('only changes active layers on bar boundaries', () => {
    const g = new LayerGates(3);
    g.set(0, true);
    g.set(2, true);
    expect(g.active).toEqual([false, false, false]);
    expect(g.onBar()).toBe(0b101);
    expect(g.active).toEqual([true, false, true]);
    g.set(0, false);
    g.set(0, true); // flicker inside the bar is absorbed
    expect(g.onBar()).toBe(0);
  });

  it('a simulated theme run switches layers exactly at bar starts', () => {
    const c = new StepClock(0, 0.1, 8);
    const g = new LayerGates(1);
    const switches: number[] = [];
    let want = false;
    let now = 0;
    for (let k = 0; k < 200; k++) {
      if (Math.abs(now - 1.33) < 0.013) want = true; // request mid-bar
      g.set(0, want);
      c.collect(now, now + 0.2, (step, t) => {
        if (c.stepInBar(step) === 0 && g.onBar()) switches.push(t);
      });
      now += 0.025;
    }
    expect(switches.length).toBe(1);
    // request at 1.33 s → first bar start after the lookahead window that contains it
    expect(switches[0] % 0.8).toBeCloseTo(0, 9);
    expect(switches[0]).toBeGreaterThanOrEqual(1.33);
  });
});

describe('resolveNote', () => {
  it('maps scale degrees with octave wrap (incl. negatives)', () => {
    expect(resolveNote(0, 'major', 60, 0, [])).toBe(60);
    expect(resolveNote(7, 'major', 60, 0, [])).toBe(72);
    expect(resolveNote(-1, 'major', 60, 0, [])).toBe(59);
    expect(resolveNote(2, 'hicaz', 62, 12, [])).toBe(78); // F#5
  });

  it('maps chord-tone tokens and wraps beyond the chord size', () => {
    const chord = [0, 2, 4];
    expect(resolveNote('c0', 'major', 60, 0, chord)).toBe(60);
    expect(resolveNote('c2', 'major', 60, 0, chord)).toBe(67);
    expect(resolveNote('c3', 'major', 60, 0, chord)).toBe(72);
    expect(Number.isNaN(resolveNote('D', 'major', 60, 0, chord))).toBe(true);
  });
});

describe('IntensityTracker (flight → K1..K3)', () => {
  it('K1 above 160 km/h with hysteresis', () => {
    const it2 = new IntensityTracker();
    it2.update(160 / 3.6 - 0.1, 1, 1, 0.016);
    expect(it2.k1).toBe(false);
    it2.update(161 / 3.6, 1, 1, 0.016);
    expect(it2.k1).toBe(true);
    it2.update(155 / 3.6, 1, 1, 0.016);
    expect(it2.k1).toBe(true);
    it2.update(149 / 3.6, 1, 1, 0.016);
    expect(it2.k1).toBe(false);
  });

  it('K2 at combo ≥ 1.5, K3 at ×5 with a short tail', () => {
    const t = new IntensityTracker();
    t.update(30, 1.5, 3, 0.016);
    expect(t.k2).toBe(true);
    expect(t.k3).toBe(false);
    t.update(30, 1.5, 5, 0.016);
    expect(t.k3).toBe(true);
    for (let i = 0; i < 100; i++) t.update(30, 1.5, 3, 0.016); // 1.6 s
    expect(t.k3).toBe(true);
    for (let i = 0; i < 100; i++) t.update(30, 1.5, 3, 0.016);
    expect(t.k3).toBe(false);
  });
});

describe('theme data', () => {
  it('every theme is internally consistent', () => {
    for (const id of MUSIC_WORLDS) {
      const th = THEMES[id];
      expect(th.id).toBe(id);
      expect(th.stepDur).toBeGreaterThan(0.05);
      const barDur = th.stepDur * th.stepsPerBar;
      // Bars between ~1 s and 4 s keep layer changes responsive (bar-quantized).
      expect(barDur).toBeGreaterThan(0.9);
      expect(barDur).toBeLessThan(4);
      for (const sec of th.sections) {
        expect(SCALES[sec.scale]).toBeDefined();
        expect(sec.chords.length).toBeGreaterThan(0);
        for (const tr of [...sec.k1, ...sec.k2, ...sec.k3]) {
          for (const bar of tr.bars) {
            for (const [step, note, len, vel] of bar) {
              expect(step).toBeGreaterThanOrEqual(0);
              expect(step).toBeLessThan(th.stepsPerBar);
              expect(len).toBeGreaterThan(0);
              expect(vel).toBeGreaterThan(0);
              expect(vel).toBeLessThanOrEqual(1);
              if (tr.inst === 'drums') expect('DTKBVJSW').toContain(String(note));
              else {
                const m = resolveNote(note, sec.scale, sec.root, tr.octave, sec.chords[0]);
                expect(Number.isFinite(m)).toBe(true);
                expect(m).toBeGreaterThan(30);
                expect(m).toBeLessThan(100);
              }
            }
          }
        }
      }
    }
  });

  it('SÜRÜ sunset sections drift major → soft minor → blue hour', () => {
    expect(suruSection(0)).toBe(0);
    expect(suruSection(0.44)).toBe(0);
    expect(suruSection(0.5)).toBe(1);
    expect(suruSection(0.85)).toBe(2);
    expect(suruSection(1)).toBe(2);
    const s = THEMES.suru.sections;
    expect(s[0].scale).toBe('major');
    expect(s[1].scale).toBe('minor');
    expect(s[2].pad.inst).toBe('glass');
    expect(s[2].k1.length + s[2].k3.length).toBe(0);
    // 3:00 round ≈ 56 bars of 3.2 s
    expect(THEMES.suru.stepDur * THEMES.suru.stepsPerBar * 56).toBeCloseTo(179.2, 1);
  });
});
