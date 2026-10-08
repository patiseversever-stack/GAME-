// Pure timing core of the adaptive music: lookahead step clock, bar-boundary layer switching,
// note-token resolution and flight → intensity mapping. No Web Audio here (unit-testable).
import { degreeToMidi, SCALES } from '../scales.ts';
import type { ScaleId } from '../scales.ts';
import type { NoteTok } from './patterns.ts';

/**
 * Lookahead step clock (the "two clocks" pattern): a coarse JS timer calls `collect(now, until)`
 * and every step whose audio time falls in [now - lateTolerance, until) is emitted exactly once.
 * Step times are computed as start + n·stepDur (multiplication, never accumulation: no drift).
 */
export class StepClock {
  readonly start: number;
  readonly stepDur: number;
  readonly stepsPerBar: number;
  /** Next global step index to emit. */
  next = 0;
  /** Steps older than this (seconds) relative to `now` are skipped instead of played late. */
  lateTolerance = 0.03;
  skipped = 0;

  constructor(start: number, stepDur: number, stepsPerBar: number) {
    this.start = start;
    this.stepDur = stepDur;
    this.stepsPerBar = stepsPerBar;
  }

  timeOf(step: number): number {
    return this.start + step * this.stepDur;
  }

  barOf(step: number): number {
    return Math.floor(step / this.stepsPerBar);
  }

  stepInBar(step: number): number {
    return step - this.barOf(step) * this.stepsPerBar;
  }

  get barDur(): number {
    return this.stepDur * this.stepsPerBar;
  }

  /** Audio time of the first bar boundary at or after `t`. */
  nextBarTime(t: number): number {
    const bars = Math.ceil((t - this.start) / this.barDur - 1e-9);
    return this.start + Math.max(0, bars) * this.barDur;
  }

  /**
   * Emit due steps in order; returns the number emitted. Late steps (time < now - lateTolerance,
   * e.g. after a throttled timer) are reported with late=true so the caller keeps bar/layer state
   * consistent without sounding them (no burst of catch-up notes).
   */
  collect(now: number, until: number, emit: (step: number, time: number, late: boolean) => void): number {
    let k = 0;
    for (;;) {
      const t = this.timeOf(this.next);
      if (t >= until) break;
      const late = t < now - this.lateTolerance;
      if (late) this.skipped++;
      emit(this.next, t, late);
      this.next++;
      k++;
    }
    return k;
  }
}

/**
 * Layer gate with bar-quantized switching: `want` can change any time; `active` only changes when
 * `onBar()` is called at a bar boundary.
 */
export class LayerGates {
  readonly want: boolean[];
  readonly active: boolean[];

  constructor(n: number, initial = false) {
    this.want = new Array<boolean>(n).fill(initial);
    this.active = new Array<boolean>(n).fill(initial);
  }

  set(i: number, on: boolean): void {
    this.want[i] = on;
  }

  /** Apply pending changes; returns a bit mask of layers that changed. */
  onBar(): number {
    let mask = 0;
    for (let i = 0; i < this.want.length; i++) {
      if (this.active[i] !== this.want[i]) {
        this.active[i] = this.want[i];
        mask |= 1 << i;
      }
    }
    return mask;
  }
}

/** Resolve a note token to MIDI (float). Returns NaN for drum tokens. */
export function resolveNote(tok: NoteTok, scaleId: ScaleId, root: number, octave: number, chord: readonly number[]): number {
  const scale = SCALES[scaleId];
  if (typeof tok === 'number') return degreeToMidi(scale, root + octave, tok);
  if (tok.length >= 2 && tok[0] === 'c') {
    const idx = Number(tok.slice(1));
    if (!Number.isFinite(idx) || chord.length === 0) return NaN;
    const n = chord.length;
    const deg = chord[idx % n] + scale.length * Math.floor(idx / n);
    return degreeToMidi(scale, root + octave, deg);
  }
  return NaN;
}

/** Flight → layer intensity with hysteresis (§2.12): K1 > 160 km/h, K2 combo ≥ 1.5, K3 ×5. */
export class IntensityTracker {
  k1 = false;
  k2 = false;
  k3 = false;
  /** Seconds the ×5 condition has been false (K3 holds for a short tail so it is not choppy). */
  private k3Off = 0;

  update(speedMs: number, combo: number, mult: number, dt: number): void {
    const kmh = speedMs * 3.6;
    if (!this.k1 && kmh > 160) this.k1 = true;
    else if (this.k1 && kmh < 150) this.k1 = false;
    if (!this.k2 && combo >= 1.5) this.k2 = true;
    else if (this.k2 && combo < 1.3) this.k2 = false;
    if (mult >= 5) {
      this.k3 = true;
      this.k3Off = 0;
    } else if (this.k3) {
      this.k3Off += dt;
      if (this.k3Off > 2.5) this.k3 = false;
    }
  }

  reset(): void {
    this.k1 = this.k2 = this.k3 = false;
    this.k3Off = 0;
  }
}
