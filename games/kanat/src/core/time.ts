// Wall-clock and visual time helpers for the platform layer (NOT for src/sim — the sim counts ticks).
// Everything that reads real time goes through `now()` so tests can inject a fake clock.

export type NowFn = () => number;

/** Fixed simulation rates (§4.3 / §4.G.10). Tier/FPS never change these. */
export const SIM_HZ = 60;
export const SURU_HZ = 30;
/** Input sampling rate for axis commands (§4.G.5: 30 Hz, quantized → live play == replay). */
export const INPUT_HZ = 30;

const defaultNow: NowFn =
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

let nowImpl: NowFn = defaultNow;

/** Monotonic milliseconds. */
export function now(): number {
  return nowImpl();
}

/** Replace the clock (tests). Pass null to restore the real one. */
export function setNowSource(fn: NowFn | null): void {
  nowImpl = fn ?? defaultNow;
}

export function ticksToSec(ticks: number, hz: number = SIM_HZ): number {
  return ticks / hz;
}

export function secToTicks(sec: number, hz: number = SIM_HZ): number {
  return Math.round(sec * hz);
}

/**
 * Visual-only clock (water ripples, dust, UI shimmer). `freeze(true)` stops it so screenshots are
 * deterministic (test API `freezeVisuals`). Never feeds the sim.
 */
export class VisualClock {
  private t = 0;
  private frozen = false;
  private frozenAt = 0;

  /** Advance by a real frame delta (seconds). Ignored while frozen. */
  advance(dtSec: number): void {
    if (!this.frozen) this.t += dtSec;
  }

  /** Seconds of visual time. */
  get time(): number {
    return this.frozen ? this.frozenAt : this.t;
  }

  get isFrozen(): boolean {
    return this.frozen;
  }

  freeze(on: boolean, atSec?: number): void {
    this.frozen = on;
    if (on) this.frozenAt = atSec ?? this.t;
  }
}

export const visualClock = new VisualClock();

/** Sport-style time used by both languages: `2:07.4` (§2.13). */
export function formatSportTime(ms: number): string {
  const safe = Math.max(0, Math.round(ms / 100)); // tenths
  const tenths = safe % 10;
  const totalSec = Math.floor(safe / 10);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}.${tenths}`;
}

/** Calendar day key `YYYY-MM-DD` in Türkiye time (UTC+3, no DST) — used by flight log stamps and daily seeds. */
export function trDayKey(epochMs: number): string {
  const d = new Date(epochMs + 3 * 3600_000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}
