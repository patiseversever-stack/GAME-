// Named haptic patterns (§2.3, §7.2) with a fatigue limiter (≤ 150 ms of vibration per second).
// Output goes through an injectable sink; the producer wires it to GameBridge (`haptic` event).
// No DOM access at import time: safe in Node tests.

export type HapticMode = 'on' | 'low' | 'off';

/** Canonical (Turkish) pattern names. Patterns use navigator.vibrate format: [on, off, on, ...] ms. */
export type HapticName =
  | 'hafif'
  | 'orta'
  | 'güçlü'
  | 'çift'
  | 'yıldız'
  | 'yumuşak'
  | 'kapı'
  | 'kanat'
  | 'paraşüt'
  | 'çarpma'
  | 'termal'
  | 'kuşatma'
  | 'uyarı';

/** Bridge-level named pattern (§7.2 `haptic` payload) for hosts that only support impact styles. */
export type BridgeHaptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Sink receives the ms pattern (vibrate format). Extra args carry the canonical name and the
 * closest §7.2 bridge name so a host without arbitrary durations (iOS) can map it.
 */
export type HapticSink = (pattern: string | number[], name?: HapticName, bridge?: BridgeHaptic) => void;

interface PatternDef {
  ms: readonly number[];
  prio: number;
  bridge: BridgeHaptic;
}

export const HAPTIC_PATTERNS: Readonly<Record<HapticName, PatternDef>> = {
  hafif: { ms: [12], prio: 1, bridge: 'light' },
  orta: { ms: [25], prio: 2, bridge: 'medium' },
  güçlü: { ms: [50], prio: 2, bridge: 'heavy' },
  çift: { ms: [10, 40, 10], prio: 1, bridge: 'light' },
  yıldız: { ms: [40], prio: 3, bridge: 'success' },
  yumuşak: { ms: [30], prio: 1, bridge: 'light' },
  kapı: { ms: [18], prio: 2, bridge: 'light' },
  kanat: { ms: [25], prio: 2, bridge: 'medium' },
  paraşüt: { ms: [50, 60, 30], prio: 3, bridge: 'heavy' },
  çarpma: { ms: [90], prio: 3, bridge: 'heavy' },
  termal: { ms: [6], prio: 0, bridge: 'light' },
  kuşatma: { ms: [30, 60, 30, 60, 50], prio: 3, bridge: 'success' },
  uyarı: { ms: [15, 80, 15], prio: 2, bridge: 'warning' },
};

/** ASCII / English aliases accepted by `play()`. */
export const HAPTIC_ALIASES: Readonly<Record<string, HapticName>> = {
  light: 'hafif',
  medium: 'orta',
  heavy: 'güçlü',
  guclu: 'güçlü',
  double: 'çift',
  cift: 'çift',
  star: 'yıldız',
  yildiz: 'yıldız',
  soft: 'yumuşak',
  yumusak: 'yumuşak',
  gate: 'kapı',
  kapi: 'kapı',
  wings: 'kanat',
  parachute: 'paraşüt',
  parasut: 'paraşüt',
  crash: 'çarpma',
  carpma: 'çarpma',
  thermal: 'termal',
  siege: 'kuşatma',
  kusatma: 'kuşatma',
  warning: 'uyarı',
  uyari: 'uyarı',
  success: 'yıldız',
};

export function resolveHaptic(name: string): HapticName | null {
  if (name in HAPTIC_PATTERNS) return name as HapticName;
  return HAPTIC_ALIASES[name] ?? null;
}

/** Sum of the "on" segments of a vibrate pattern. */
export function onTime(pattern: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < pattern.length; i += 2) s += pattern[i];
  return s;
}

function defaultSink(): HapticSink | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return null;
  return (p) => {
    try {
      if (typeof p !== 'string') nav.vibrate?.(p);
    } catch {
      // vibrate may throw inside sandboxed iframes; haptics are best-effort.
    }
  };
}

export interface HapticsOptions {
  now?: () => number;
  sink?: HapticSink | null;
  budgetMs?: number;
  windowMs?: number;
}

const RING = 64;
const THERMAL_PERIOD_MS = 1000 / 6;
const LOW_SCALE = 0.6;
const MIN_PULSE_MS = 8;

export class Haptics {
  mode: HapticMode = 'on';
  readonly budgetMs: number;
  readonly windowMs: number;
  private sink: HapticSink | null;
  private readonly now: () => number;
  private readonly times = new Float64Array(RING);
  private readonly amounts = new Float64Array(RING);
  private head = 0;
  private thermal = false;
  private nextThermalAt = 0;
  /** Count of patterns delivered / dropped (diagnostics, tests). */
  delivered = 0;
  dropped = 0;

  constructor(opts: HapticsOptions = {}) {
    this.now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this.sink = opts.sink === undefined ? defaultSink() : opts.sink;
    this.budgetMs = opts.budgetMs ?? 150;
    this.windowMs = opts.windowMs ?? 1000;
  }

  setSink(sink: HapticSink | null): void {
    this.sink = sink;
  }

  setMode(mode: HapticMode): void {
    this.mode = mode;
    if (mode !== 'on') this.thermal = false;
  }

  /** Vibration ms already spent inside the sliding window ending at `t`. */
  used(t = this.now()): number {
    let s = 0;
    const from = t - this.windowMs;
    for (let i = 0; i < RING; i++) if (this.amounts[i] > 0 && this.times[i] > from) s += this.amounts[i];
    return s;
  }

  /**
   * Play a named pattern or a raw ms pattern. Returns true when something was sent to the sink.
   * Over-budget patterns: priority ≥ 3 is shortened to fit (if ≥ 8 ms remains), others are dropped.
   */
  play(nameOrPattern: string | readonly number[], prioOverride?: number): boolean {
    if (this.mode === 'off') return false;
    let name: HapticName | undefined;
    let ms: readonly number[];
    let prio: number;
    let bridge: BridgeHaptic = 'light';
    if (typeof nameOrPattern === 'string') {
      const n = resolveHaptic(nameOrPattern);
      if (!n) return false;
      name = n;
      const def = HAPTIC_PATTERNS[n];
      ms = def.ms;
      prio = def.prio;
      bridge = def.bridge;
    } else {
      ms = nameOrPattern;
      prio = 1;
    }
    if (prioOverride !== undefined) prio = prioOverride;
    if (this.mode === 'low') {
      if (name === 'termal') return false;
      ms = ms.map((v, i) => (i % 2 === 0 ? Math.max(MIN_PULSE_MS, Math.round(v * LOW_SCALE)) : v));
    }
    const t = this.now();
    const remaining = this.budgetMs - this.used(t);
    let total = onTime(ms);
    let out: number[];
    if (total <= remaining) {
      out = ms.slice();
    } else if (prio >= 3 && remaining >= MIN_PULSE_MS) {
      const k = remaining / total;
      out = ms.map((v, i) => (i % 2 === 0 ? Math.max(1, Math.floor(v * k)) : v));
      total = onTime(out);
      if (total > remaining) {
        this.dropped++;
        return false;
      }
    } else {
      this.dropped++;
      return false;
    }
    this.times[this.head] = t;
    this.amounts[this.head] = total;
    this.head = (this.head + 1) % RING;
    this.delivered++;
    if (this.sink) this.sink(out, name, bridge);
    return true;
  }

  /** Thermal ticks: 6 ms @ 6 Hz while inside (disabled in 'low'/'off'). */
  setThermal(on: boolean): void {
    if (on && !this.thermal) this.nextThermalAt = this.now();
    this.thermal = on && this.mode === 'on';
  }

  get thermalActive(): boolean {
    return this.thermal;
  }

  /** Call every frame (the engine does it from setFlight). Emits thermal ticks on schedule. */
  update(t = this.now()): void {
    if (!this.thermal || this.mode !== 'on') return;
    if (t >= this.nextThermalAt) {
      this.play('termal');
      // Catch up without bursting if frames were skipped.
      this.nextThermalAt = Math.max(this.nextThermalAt + THERMAL_PERIOD_MS, t + THERMAL_PERIOD_MS * 0.5);
    }
  }

  reset(): void {
    this.amounts.fill(0);
    this.times.fill(0);
    this.thermal = false;
  }
}
