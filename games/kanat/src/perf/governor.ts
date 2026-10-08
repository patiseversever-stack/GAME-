// Runtime governor (§5.3 step 4–6). Pure logic: fed with frame samples + timestamps, emits decisions.
// No DOM, no wall clock → unit-testable with synthetic frame-time series.
//
// Metrics
//   interval  time between presented frames (vsync-quantized; what the player sees) → drop rules
//   cost      serial CPU+GPU cost from the periodic 1-px readPixels probe            → raise rule
//   cpu       JS time per frame                                                     → LPM trap
// All ms thresholds scale with the pacing target (×2 in 30 FPS battery mode / under the iOS LPM cap).

import type { QualityTier } from '../core/settings.ts';
import { SlidingWindow } from './stats.ts';
import { FRAME_BUDGET, lowerTier, higherTier, mpRange, tierIndex, TIERS } from './tiers.ts';

export type TierChangeReason = 'drop' | 'emergency' | 'raise' | 'manual' | 'forced' | 'profile';

export type GovernorEvent =
  | { type: 'resolution'; mp: number; reason: 'pressure' | 'headroom' | 'thermal' | 'relief' | 'tier' }
  | { type: 'tier'; from: QualityTier; to: QualityTier; reason: TierChangeReason }
  | { type: 'pendingDrop'; tier: QualityTier }
  | { type: 'relief'; mp: number; particleScale: number }
  | { type: 'suggestion'; tier: QualityTier }
  | { type: 'stable'; tier: QualityTier; mp: number }
  | { type: 'constraint'; active: boolean }
  | { type: 'thermal'; level: number; mpCeil: number; particleScale: number };

export interface GovernorOptions {
  tier: QualityTier;
  manual?: boolean;
  nativeMp?: number;
  /** Highest tier auto raises may reach. */
  maxTier?: QualityTier;
  /** Starting MP; default = middle of the tier range. */
  mp?: number;
  evalEveryMs?: number;
}

const P = [0.1, 0.5, 0.9] as const;

export class Governor {
  // ---- public state ----
  tier: QualityTier;
  mp: number;
  manual: boolean;
  particleScale = 1;
  constraint = false;
  pendingDrop = false;
  droppedThisSession = false;
  raisedThisSession = false;
  suggestionSent = false;
  thermalLevel = 0;
  readonly nativeMp: number;
  maxTier: QualityTier;

  // ---- windows / derived ----
  private readonly intervals = new SlidingWindow(180);
  private readonly cpu = new SlidingWindow(180);
  private readonly costs = new SlidingWindow(30);
  /** Short windows (~0.5–1 s) so the LPM cap is recognised before the 2 s emergency rule fires. */
  private readonly recent = new SlidingWindow(30);
  private readonly recentCpu = new SlidingWindow(30);
  private readonly pOut = new Float64Array(3);
  p10 = NaN;
  p50 = NaN;
  p90 = NaN;
  costP90 = NaN;
  cpuP90 = NaN;

  // ---- timers (ms, -1 = inactive) ----
  private lastEval = -Infinity;
  private lastResChange = -Infinity;
  private lastResDown = -Infinity;
  private pressureSince = -1;
  private overDropSince = -1;
  private emergSince = -1;
  private reliefApplied = false;
  private raiseOkSince = -1;
  private manualBadSince = -1;
  private graceUntil = -Infinity;
  private activeMsInTier = 0;
  private stableReported = false;
  private readonly evalEveryMs: number;

  // ---- thermal ----
  private readonly minuteMedians = new Float32Array(240);
  private minuteCount = 0;
  private minuteAcc = 0;
  private readonly minuteWin = new SlidingWindow(3600);
  private lastThermalStep = -Infinity;
  private mpCeilFactor = 1;

  private readonly listeners = new Set<(e: GovernorEvent) => void>();

  constructor(o: GovernorOptions) {
    this.tier = o.tier;
    this.manual = o.manual ?? false;
    this.nativeMp = o.nativeMp ?? 8;
    this.maxTier = o.maxTier ?? 'ultra';
    const [lo, hi] = mpRange(this.tier, this.nativeMp);
    this.mp = o.mp !== undefined ? Math.min(hi, Math.max(lo, o.mp)) : (lo + hi) / 2;
    this.evalEveryMs = o.evalEveryMs ?? 250;
  }

  on(fn: (e: GovernorEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: GovernorEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  // ---- range helpers ----

  get mpFloor(): number {
    return mpRange(this.tier, this.nativeMp)[0];
  }

  /** Ceiling including thermal reduction (never below the floor). */
  get mpCeil(): number {
    const [lo, hi] = mpRange(this.tier, this.nativeMp);
    return Math.max(lo, hi * this.mpCeilFactor);
  }

  get atFloor(): boolean {
    return this.mp <= this.mpFloor * 1.001;
  }

  get atCeil(): boolean {
    return this.mp >= this.mpCeil * 0.999;
  }

  /** Ignore samples for a while (state transitions, shader warm-up, world streaming). */
  grace(nowMs: number, ms: number): void {
    this.graceUntil = Math.max(this.graceUntil, nowMs + ms);
    this.pressureSince = -1;
    this.overDropSince = -1;
    this.emergSince = -1;
  }

  // ---- feeding ----

  /**
   * One presented frame. `targetMs` = pacing target (16.67 at 60 fps, 33.3 battery mode).
   * `costMs` = NaN unless this frame was probed.
   */
  frame(nowMs: number, intervalMs: number, cpuMs: number, costMs: number, targetMs = FRAME_BUDGET.frameMs60): void {
    if (nowMs < this.graceUntil) return;
    this.intervals.push(intervalMs);
    this.cpu.push(cpuMs);
    this.recent.push(intervalMs);
    this.recentCpu.push(cpuMs);
    if (!Number.isNaN(costMs)) this.costs.push(costMs);
    this.activeMsInTier += Math.min(intervalMs, 250);
    this.thermalSample(nowMs, Number.isNaN(costMs) ? -1 : costMs, cpuMs, intervalMs);
    if (nowMs - this.lastEval >= this.evalEveryMs) {
      this.lastEval = nowMs;
      this.evaluate(nowMs, targetMs);
    }
  }

  private evaluate(now: number, targetMs: number): void {
    if (this.intervals.size < 20) return;
    this.intervals.percentiles(P, this.pOut);
    this.p10 = this.pOut[0];
    this.p50 = this.pOut[1];
    this.p90 = this.pOut[2];
    this.cpuP90 = this.cpu.percentile(0.9);
    this.costP90 = this.costs.size >= 5 ? this.costs.percentile(0.9) : NaN;

    // iOS Low Power Mode trap: rAF capped at 30 Hz, steady 33 ms, little CPU work → a constraint,
    // not a performance problem. Pace thresholds for 30 fps instead of dropping. Judged on the short
    // window (≤30 frames ≈ 1 s) so it wins the race against the 2 s emergency rule.
    this.recent.percentiles(P, this.pOut);
    const r10 = this.pOut[0];
    const r90 = this.pOut[2];
    const lpm =
      targetMs < 20 &&
      this.recent.size >= 20 &&
      r10 >= 30.5 &&
      r90 <= 36 &&
      r90 - r10 <= 3 &&
      this.recentCpu.percentile(0.9) <= 12 &&
      (Number.isNaN(this.costP90) || this.costP90 <= 26);
    if (lpm !== this.constraint) {
      this.constraint = lpm;
      this.pressureSince = -1;
      this.overDropSince = -1;
      this.emergSince = -1;
      this.emit({ type: 'constraint', active: lpm });
    }
    const target = lpm ? 1000 / 30 : targetMs;
    const scale = target / FRAME_BUDGET.frameMs60;

    this.dynamicResolution(now, target);
    if (!this.manual) {
      this.dropRules(now, scale);
      this.raiseTracking(now, target, scale);
      this.stableTracking();
    } else {
      this.manualSuggestion(now, scale);
    }
  }

  // ---- dynamic resolution: continuous, ≤5 % per step, ≥500 ms apart ----

  private dynamicResolution(now: number, target: number): void {
    if (now - this.lastResChange < FRAME_BUDGET.resStepMinIntervalMs) return;
    const step = FRAME_BUDGET.resMaxStepFrac;
    const ceil = this.mpCeil;
    if (this.mp > ceil * 1.0001) {
      this.setMp(Math.max(ceil, this.mp * (1 - step)), now, 'thermal');
      return;
    }
    if (this.p90 > target * 1.1) {
      // debounce 1 s: single hitch bursts and the iOS 30 Hz cap (recognised within ~1 s) never cost resolution
      if (this.pressureSince < 0) this.pressureSince = now;
      if (now - this.pressureSince >= 1000 && !this.atFloor) {
        this.setMp(Math.max(this.mpFloor, this.mp * (1 - step)), now, 'pressure');
        this.lastResDown = now;
      }
      return;
    }
    this.pressureSince = -1;
    // Headroom: all frames on time and the probed cost leaves ≥25 % margin. No probe data → no raise.
    const headroom =
      this.p90 <= target * 1.05 && !Number.isNaN(this.costP90) && this.costP90 < target * 0.75 && now - this.lastResDown >= 4000;
    if (headroom && !this.atCeil) {
      this.setMp(Math.min(ceil, this.mp * (1 + step * 0.5)), now, 'headroom');
    }
  }

  private setMp(mp: number, now: number, reason: 'pressure' | 'headroom' | 'thermal' | 'relief' | 'tier'): void {
    if (Math.abs(mp - this.mp) < 1e-6) return;
    this.mp = mp;
    this.lastResChange = now;
    this.emit({ type: 'resolution', mp, reason });
  }

  // ---- drops ----

  private dropRules(now: number, scale: number): void {
    const canDrop = tierIndex(this.tier) > 0;
    // Emergency: p90 > 28 ms for 2 s → relief first (resolution floor + particles), then the tier.
    if (this.p90 > FRAME_BUDGET.emergencyP90Ms * scale) {
      if (this.emergSince < 0) this.emergSince = now;
      if (now - this.emergSince >= FRAME_BUDGET.emergencySustainMs) {
        this.emergSince = now;
        if (!this.reliefApplied) {
          this.reliefApplied = true;
          this.particleScale = Math.min(this.particleScale, 0.5);
          this.mp = this.mpFloor;
          this.lastResChange = now;
          this.lastResDown = now;
          this.emit({ type: 'relief', mp: this.mp, particleScale: this.particleScale });
        } else if (canDrop) {
          this.changeTier(lowerTier(this.tier), 'emergency', now);
          return;
        }
      }
    } else {
      this.emergSince = -1;
    }
    // Sustained: at resolution floor, p90 > 18.5 ms for 3 s → drop at the next natural break.
    if (canDrop && this.atFloor && this.p90 > FRAME_BUDGET.dropP90Ms * scale) {
      if (this.overDropSince < 0) this.overDropSince = now;
      if (!this.pendingDrop && now - this.overDropSince >= FRAME_BUDGET.dropSustainMs) {
        this.pendingDrop = true;
        this.emit({ type: 'pendingDrop', tier: this.tier });
      }
    } else {
      this.overDropSince = -1;
    }
  }

  // ---- raise: natural break only, p90 cost < 10 ms for 20 s at the resolution ceiling, once ----

  private raiseTracking(now: number, target: number, scale: number): void {
    const eligible =
      !this.droppedThisSession &&
      !this.raisedThisSession &&
      !this.constraint &&
      tierIndex(this.tier) < tierIndex(this.maxTier) &&
      this.atCeil &&
      this.mpCeilFactor === 1 &&
      this.p90 <= target * 1.1 &&
      !Number.isNaN(this.costP90) &&
      this.costP90 < FRAME_BUDGET.raiseP90Ms * scale;
    if (eligible) {
      if (this.raiseOkSince < 0) this.raiseOkSince = now;
    } else {
      this.raiseOkSince = -1;
    }
  }

  /** True when a raise would be applied at a natural break happening at `now`. */
  raiseReadyAt(now: number): boolean {
    return this.raiseOkSince >= 0 && now - this.raiseOkSince >= FRAME_BUDGET.raiseSustainMs;
  }

  /** Round end / menu / restart. Applies a pending drop or an earned raise. Returns the change, if any. */
  naturalBreak(nowMs: number): { from: QualityTier; to: QualityTier; reason: TierChangeReason } | null {
    if (this.manual) return null;
    const from = this.tier;
    if (this.pendingDrop && tierIndex(this.tier) > 0) {
      this.changeTier(lowerTier(this.tier), 'drop', nowMs);
      return { from, to: this.tier, reason: 'drop' };
    }
    if (this.raiseReadyAt(nowMs)) {
      this.changeTier(higherTier(this.tier), 'raise', nowMs);
      return { from, to: this.tier, reason: 'raise' };
    }
    return null;
  }

  private changeTier(to: QualityTier, reason: TierChangeReason, now: number): void {
    const from = this.tier;
    if (to === from) return;
    const down = tierIndex(to) < tierIndex(from);
    this.tier = to;
    if (reason === 'drop' || reason === 'emergency') this.droppedThisSession = true;
    if (reason === 'raise') this.raisedThisSession = true;
    const [lo, hi] = mpRange(to, this.nativeMp);
    // Continuity: after a drop start at the new ceiling, after a raise at the new floor.
    this.mp = reason === 'drop' || reason === 'emergency' ? hi : reason === 'raise' ? lo : (lo + hi) / 2;
    this.pendingDrop = false;
    this.reliefApplied = false;
    this.pressureSince = -1;
    this.overDropSince = -1;
    this.emergSince = -1;
    this.raiseOkSince = -1;
    this.manualBadSince = -1;
    this.activeMsInTier = 0;
    this.stableReported = false;
    if (down) this.particleScale = Math.min(1, Math.max(this.particleScale, 0.75));
    else this.particleScale = 1;
    this.intervals.clear();
    this.cpu.clear();
    this.costs.clear();
    this.recent.clear();
    this.recentCpu.clear();
    this.lastResChange = now;
    this.emit({ type: 'tier', from, to, reason });
    this.emit({ type: 'resolution', mp: this.mp, reason: 'tier' });
  }

  /** External tier set (manual selection, saved profile, test API). Not counted as drop/raise. */
  setTier(t: QualityTier, reason: 'manual' | 'forced' | 'profile', nowMs = 0): void {
    if (t === this.tier) {
      const [lo, hi] = mpRange(t, this.nativeMp);
      this.mp = Math.min(hi, Math.max(lo, this.mp));
      return;
    }
    this.changeTier(t, reason, nowMs);
  }

  setManual(manual: boolean): void {
    this.manual = manual;
    this.pendingDrop = false;
    this.raiseOkSince = -1;
    this.manualBadSince = -1;
  }

  // ---- manual mode: never change tier, suggest once ----

  private manualSuggestion(now: number, scale: number): void {
    if (this.suggestionSent || tierIndex(this.tier) === 0) return;
    if (this.atFloor && this.p90 > FRAME_BUDGET.dropP90Ms * scale) {
      if (this.manualBadSince < 0) this.manualBadSince = now;
      if (now - this.manualBadSince >= 10_000) {
        this.suggestionSent = true;
        this.emit({ type: 'suggestion', tier: lowerTier(this.tier) });
      }
    } else {
      this.manualBadSince = -1;
    }
  }

  // ---- stable tier: 3 min without a drop ----

  private stableTracking(): void {
    if (this.stableReported || this.pendingDrop) return;
    if (this.activeMsInTier >= FRAME_BUDGET.stableAfterMs) {
      this.stableReported = true;
      this.emit({ type: 'stable', tier: this.tier, mp: this.mp });
    }
  }

  // ---- thermal drift: slow median creep over 10+ minutes → resolution first, then particles ----

  private thermalSample(now: number, cost: number, cpu: number, interval: number): void {
    // Prefer the probed cost; between probes the CPU time is the next best signal of throttling.
    const v = cost >= 0 ? cost : cpu > 0 ? cpu : interval;
    this.minuteWin.push(v);
    this.minuteAcc += Math.min(interval, 250);
    if (this.minuteAcc < 60_000) return;
    this.minuteAcc = 0;
    const med = this.minuteWin.percentile(0.5);
    this.minuteWin.clear();
    if (this.minuteCount < this.minuteMedians.length) this.minuteMedians[this.minuteCount++] = med;
    this.thermalCheck(now);
  }

  private thermalCheck(now: number): void {
    const n = this.minuteCount;
    if (n < 10 || now - this.lastThermalStep < 60_000 || this.thermalLevel >= 4) return;
    // Baseline: best of minutes 2–4 (minute 1 is warm-up/streaming). Current: mean of the last 2.
    let base = Infinity;
    for (let i = 1; i < 4; i++) base = Math.min(base, this.minuteMedians[i]);
    const cur = (this.minuteMedians[n - 1] + this.minuteMedians[n - 2]) / 2;
    if (!(cur > base * 1.15)) return;
    this.lastThermalStep = now;
    this.thermalLevel++;
    if (this.thermalLevel === 1) this.mpCeilFactor = 0.92;
    else if (this.thermalLevel === 2) this.mpCeilFactor = 0.85;
    else if (!this.manual && this.thermalLevel === 3) this.particleScale = Math.min(this.particleScale, 0.75);
    else if (!this.manual && this.thermalLevel === 4) this.particleScale = Math.min(this.particleScale, 0.5);
    // Rebase so the next step needs a further creep.
    for (let i = 1; i < 4; i++) this.minuteMedians[i] = cur;
    this.emit({ type: 'thermal', level: this.thermalLevel, mpCeil: this.mpCeil, particleScale: this.particleScale });
  }

  /** Particle cap of the current tier after relief/thermal scaling. */
  get particleCap(): number {
    return Math.round(TIERS[this.tier].common.particleCap * this.particleScale);
  }
}
