// Fixed-step loop driver (§5.4).
//  - accumulator, at most `maxCatchUp` (5) sim steps per rendered frame, render interpolation alpha.
//  - measures the display refresh rate from rAF deltas; on 120 Hz panels renders every 2nd rAF
//    (60 fps, no judder) unless `ultra120`; 30 FPS battery mode renders with even spacing.
//  - stop() on visibility hidden / host pause, start() resets timing (no catch-up burst).
//  - `simEnabled=false` keeps rendering but holds the sim (pause menu, "Devam" overlay).
//  - zero allocation per frame: the FrameSample is reused, callbacks are bound once.

import { now as defaultNow } from './time.ts';

export interface FrameSample {
  /** rAF timestamp of this rendered frame (ms). */
  nowMs: number;
  /** Time since the previous RENDERED frame (ms) — what the player sees. */
  intervalMs: number;
  /** JS time spent in this frame (steps + render submit). */
  cpuMs: number;
  /** CPU+GPU cost of this frame measured with a 1-px readPixels sync probe; NaN when not probed. */
  costMs: number;
  /** Sim steps executed this frame. */
  steps: number;
  /** Target frame interval the loop is pacing for (16.67 at 60 fps, 33.3 in battery mode). */
  targetMs: number;
}

export interface LoopCallbacks {
  /** One fixed sim step. `tick` counts steps since start (loop-local). */
  step(dtSec: number, tick: number): void;
  /** Draw. alpha ∈ [0,1) = interpolation between previous and current sim state. */
  render(alpha: number, frameDtSec: number, nowMs: number): void;
  /** After each rendered frame (PerformanceDirector feeds on this). */
  frameEnd?(sample: FrameSample): void;
}

export interface LoopOptions {
  stepHz?: number;
  maxCatchUp?: number;
  raf?: (cb: (t: number) => void) => number;
  caf?: (id: number) => void;
  now?: () => number;
}

const KNOWN_REFRESH = [24, 30, 48, 60, 72, 75, 90, 96, 100, 120, 144, 165, 240];

/** Snap a measured rAF rate to the nearest common panel rate. */
export function snapRefreshHz(hz: number): number {
  let best = 60;
  let bestErr = Infinity;
  for (const r of KNOWN_REFRESH) {
    const e = Math.abs(r - hz);
    if (e < bestErr) {
      bestErr = e;
      best = r;
    }
  }
  return best;
}

/**
 * How many rAFs per rendered frame. 120 Hz → 2 at 60 fps, 90 Hz → 1 (90 fps beats 45),
 * 60 Hz battery mode → 2, 30 Hz (iOS Low Power) → 1.
 */
export function renderDivider(refreshHz: number, targetFps: number): number {
  return Math.max(1, Math.floor(refreshHz / targetFps + 0.25));
}

const DELTA_RING = 32;

export class GameLoop {
  private readonly cb: LoopCallbacks;
  private readonly raf: (cb: (t: number) => void) => number;
  private readonly caf: (id: number) => void;
  private readonly clock: () => number;
  private stepDt: number;
  private maxCatchUp: number;
  private timeScale = 1;

  private rafId = 0;
  private isRunning = false;
  private simOn = true;
  private acc = 0;
  private lastRaf = -1;
  private lastRender = -1;
  private tickCount = 0;
  private alphaVal = 0;

  private fpsMode: 60 | 30 = 60;
  private ultra = false;
  private readonly deltas = new Float32Array(DELTA_RING);
  private readonly sortScratch = new Float32Array(DELTA_RING);
  private deltaCount = 0;
  private measuredHz = 60;
  private divider = 1;

  private probeFn: (() => void) | null = null;
  private probeEveryMs = 1000;
  private lastProbe = -Infinity;

  private readonly sample: FrameSample = { nowMs: 0, intervalMs: 0, cpuMs: 0, costMs: NaN, steps: 0, targetMs: 1000 / 60 };
  private readonly frameBound: (t: number) => void;

  constructor(cb: LoopCallbacks, opts: LoopOptions = {}) {
    this.cb = cb;
    this.stepDt = 1 / (opts.stepHz ?? 60);
    this.maxCatchUp = opts.maxCatchUp ?? 5;
    this.raf = opts.raf ?? ((f) => requestAnimationFrame(f));
    this.caf = opts.caf ?? ((id) => cancelAnimationFrame(id));
    this.clock = opts.now ?? defaultNow;
    this.frameBound = (t: number) => this.frame(t);
  }

  // ---- control -------------------------------------------------------------------------------

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastRaf = -1;
    this.lastRender = -1;
    this.acc = 0;
    this.rafId = this.raf(this.frameBound);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.caf(this.rafId);
    this.rafId = 0;
  }

  get running(): boolean {
    return this.isRunning;
  }

  /** Hold (false) or release (true) the sim while rendering continues. Releasing never catches up. */
  setSimEnabled(on: boolean): void {
    if (on && !this.simOn) this.acc = 0;
    this.simOn = on;
  }

  get simEnabled(): boolean {
    return this.simOn;
  }

  setStepHz(hz: number): void {
    this.stepDt = 1 / hz;
    this.acc = 0;
  }

  get stepHz(): number {
    return Math.round(1 / this.stepDt);
  }

  /** Sim speed multiplier (Yavaş Mod = 0.8). Applied to the accumulator, never to dt. */
  setTimeScale(s: number): void {
    this.timeScale = Math.max(0, s);
  }

  setFpsMode(fps: 60 | 30): void {
    this.fpsMode = fps;
    this.recomputeDivider();
  }

  setUltra120(on: boolean): void {
    this.ultra = on;
    this.recomputeDivider();
  }

  /** Sync probe (1-px readPixels) run after render at most every `everyMs`. null disables. */
  setProbe(fn: (() => void) | null, everyMs = 1000): void {
    this.probeFn = fn;
    this.probeEveryMs = everyMs;
  }

  /** Reset the loop-local tick counter (new flight / new round). */
  resetTicks(): void {
    this.tickCount = 0;
    this.acc = 0;
    this.alphaVal = 0;
  }

  /** Deterministic manual stepping (test API `step(n)`) — independent of rendering. */
  stepN(n: number): void {
    for (let i = 0; i < n; i++) {
      this.cb.step(this.stepDt, this.tickCount);
      this.tickCount++;
    }
  }

  // ---- state ---------------------------------------------------------------------------------

  get tick(): number {
    return this.tickCount;
  }

  get alpha(): number {
    return this.alphaVal;
  }

  get refreshHz(): number {
    return this.measuredHz;
  }

  get renderEvery(): number {
    return this.divider;
  }

  /** Target interval between rendered frames (ms). */
  get targetFrameMs(): number {
    return (1000 / this.measuredHz) * this.divider;
  }

  // ---- frame ---------------------------------------------------------------------------------

  private recomputeDivider(): void {
    const target = this.ultra ? this.measuredHz : this.fpsMode;
    this.divider = renderDivider(this.measuredHz, target);
  }

  private measure(delta: number): void {
    if (delta <= 0 || delta > 100) return; // ignore stalls / tab switches
    this.deltas[this.deltaCount % DELTA_RING] = delta;
    this.deltaCount++;
    if (this.deltaCount % DELTA_RING !== 0) return;
    this.sortScratch.set(this.deltas);
    this.sortScratch.sort();
    const median = (this.sortScratch[DELTA_RING / 2 - 1] + this.sortScratch[DELTA_RING / 2]) * 0.5;
    const hz = snapRefreshHz(1000 / median);
    if (hz !== this.measuredHz) {
      this.measuredHz = hz;
      this.recomputeDivider();
    }
  }

  private frame(t: number): void {
    if (!this.isRunning) return;
    this.rafId = this.raf(this.frameBound);

    if (this.lastRaf >= 0) this.measure(t - this.lastRaf);
    this.lastRaf = t;

    // Even spacing: render once at least (divider − ½) refresh intervals have passed.
    const rafInterval = 1000 / this.measuredHz;
    if (this.lastRender >= 0 && this.divider > 1) {
      if (t - this.lastRender < rafInterval * (this.divider - 0.5)) return;
    }

    const t0 = this.clock();
    const interval = this.lastRender < 0 ? this.targetFrameMs : t - this.lastRender;
    this.lastRender = t;
    const frameDt = Math.min(interval, 250) / 1000;

    let steps = 0;
    if (this.simOn) {
      this.acc += Math.min(frameDt, this.stepDt * this.maxCatchUp) * this.timeScale;
      while (this.acc >= this.stepDt && steps < this.maxCatchUp) {
        this.cb.step(this.stepDt, this.tickCount);
        this.tickCount++;
        this.acc -= this.stepDt;
        steps++;
      }
      if (this.acc >= this.stepDt) this.acc %= this.stepDt; // drop what cannot be caught up
      this.alphaVal = this.acc / this.stepDt;
    }

    this.cb.render(this.alphaVal, frameDt, t);
    const t1 = this.clock();

    let cost = NaN;
    if (this.probeFn && t - this.lastProbe >= this.probeEveryMs) {
      this.lastProbe = t;
      this.probeFn();
      cost = this.clock() - t0;
    }

    const s = this.sample;
    s.nowMs = t;
    s.intervalMs = interval;
    s.cpuMs = t1 - t0;
    s.costMs = cost;
    s.steps = steps;
    s.targetMs = this.targetFrameMs;
    this.cb.frameEnd?.(s);
  }
}
