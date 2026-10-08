// PerformanceDirector (§5.3): saved profile → static guess → micro-benchmark → runtime governor.
// Identical contract in all 3 games. Owner: platform.
//
// Typical wiring (main.ts / integrator):
//   const perf = app.perf;                         // created by boot()
//   perf.attachGL(renderer.getContext());          // fingerprint + static guess (+ saved profile)
//   if (perf.needsBenchmark) await perf.benchmark((tier, mp) => worldRenderer.drawBenchmark(tier, mp));
//   worldRenderer.setTier(perf.tier);              // and on perf.on('tier', …) at natural breaks
//   loop frameEnd → perf.frame(sample);  mode round end / menu / restart → perf.naturalBreak();
//   each frame: renderer.setPixelRatio(perf.pixelRatioFor(cssW, cssH))  (cheap; changes ≤ every 500 ms)

import { EventBus } from '../core/events.ts';
import type { KVBackend } from '../core/save.ts';
import { atomicRead, atomicWrite, defaultKV, STORAGE_KEYS } from '../core/save.ts';
import type { QualitySetting, QualityTier } from '../core/settings.ts';
import { now as defaultNow } from '../core/time.ts';
import type { FrameSample } from '../core/loop.ts';
import type { BenchmarkDrawFn, BenchmarkOptions, BenchmarkResult } from './benchmark.ts';
import { readPixelsSync, runBenchmark } from './benchmark.ts';
import type { DeviceInfo, GuessResult } from './deviceGuess.ts';
import { fingerprint, guessTier, nativeMegapixels, readDeviceInfo } from './deviceGuess.ts';
import type { GovernorEvent } from './governor.ts';
import { Governor } from './governor.ts';
import { lowerTier, pixelRatioFor, TIER_ORDER, tierIndex, TIERS } from './tiers.ts';

export interface PerfProfileEntry {
  tier: QualityTier;
  mp: number;
  stable: boolean;
  savedAt: number;
  gpu: string;
}

export interface PerfProfileFile {
  v: 1;
  entries: Record<string, PerfProfileEntry>;
}

export interface RendererStats {
  calls: number;
  triangles: number;
  programs: number;
  textures: number;
  geometries: number;
  textureMB: number;
  particles?: number;
}

export interface PerfSnapshot {
  tier: QualityTier;
  quality: QualitySetting;
  mp: number;
  pixelRatio: number;
  fps: number;
  p50: number;
  p90: number;
  fpsP50: number;
  fpsP90: number;
  costP90: number;
  cpuP90: number;
  particleScale: number;
  particleCap: number;
  constraint: boolean;
  thermalLevel: number;
  pendingDrop: boolean;
  refreshHz: number;
  fingerprint: string;
  gpu: string;
  guess: GuessResult | null;
  source: 'profile' | 'guess' | 'benchmark' | 'manual';
  benchmark: BenchmarkResult | null;
  renderer: RendererStats | null;
  jsHeapMB: number;
}

export type DirectorEvents = {
  [K in GovernorEvent['type']]: Extract<GovernorEvent, { type: K }>;
} & {
  /** Periodic report for the bridge `perf` event. */
  report: { tier: QualityTier; fpsP50: number; fpsP90: number };
};

export interface DirectorOptions {
  kv?: KVBackend;
  quality?: QualitySetting;
  now?: () => number;
}

function readProfileFile(kv: KVBackend): PerfProfileFile {
  try {
    const raw = atomicRead(kv, STORAGE_KEYS.perfProfile);
    if (!raw) return { v: 1, entries: {} };
    const p = JSON.parse(raw) as PerfProfileFile;
    if (p && p.v === 1 && typeof p.entries === 'object' && p.entries) {
      for (const [k, e] of Object.entries(p.entries)) {
        if (!e || !TIER_ORDER.includes(e.tier) || typeof e.mp !== 'number') delete p.entries[k];
      }
      return p;
    }
  } catch {
    // corrupt → start fresh
  }
  return { v: 1, entries: {} };
}

export class PerformanceDirector {
  readonly events = new EventBus<DirectorEvents>();
  private gov: Governor;
  private readonly kv: KVBackend;
  private readonly clock: () => number;
  private quality: QualitySetting;
  private device: DeviceInfo | null = null;
  private fp = '';
  private guess: GuessResult | null = null;
  private source: PerfSnapshot['source'] = 'guess';
  private bench: BenchmarkResult | null = null;
  private savedEntry: PerfProfileEntry | null = null;
  private nativeMp = 3;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private rendererStats: (() => RendererStats) | null = null;
  private lastReport = 0;
  private refreshHz = 60;
  private lastFrameNow = 0;
  private fpsEma = 60;

  constructor(opts: DirectorOptions = {}) {
    this.kv = opts.kv ?? defaultKV();
    this.clock = opts.now ?? defaultNow;
    this.quality = opts.quality ?? 'auto';
    const manual = this.quality !== 'auto';
    this.gov = new Governor({ tier: manual ? (this.quality as QualityTier) : 'medium', manual, nativeMp: this.nativeMp });
    this.wireGovernor(this.gov);
  }

  /** The live governor (replaced on init; do not cache across attachGL/init). */
  get governor(): Governor {
    return this.gov;
  }

  private wireGovernor(g: Governor): void {
    g.on((e) => {
      if (e.type === 'stable') this.saveProfile(true);
      if (e.type === 'tier' && (e.reason === 'drop' || e.reason === 'emergency')) this.saveProfile(false);
      if (e.type === 'tier' && e.reason === 'raise') this.saveProfile(false);
      (this.events.emit as (t: string, p: unknown) => void)(e.type, e);
    });
  }

  // ---- init ----------------------------------------------------------------------------------

  /** Read the device from a live GL context (fingerprint, static guess, saved profile). */
  attachGL(gl: WebGLRenderingContext | WebGL2RenderingContext): QualityTier {
    this.gl = gl;
    return this.init(readDeviceInfo(gl));
  }

  /** Initialise from a DeviceInfo (tests / non-GL). Returns the starting tier. */
  init(device: DeviceInfo): QualityTier {
    this.device = device;
    this.fp = fingerprint(device);
    this.guess = guessTier(device);
    this.nativeMp = Math.max(0.3, nativeMegapixels(device) || 3);
    const file = readProfileFile(this.kv);
    this.savedEntry = file.entries[this.fp] ?? null;
    const g = new Governor({
      tier: this.startTier(),
      manual: this.quality !== 'auto',
      nativeMp: this.nativeMp,
      maxTier: this.guess.maxTier,
      mp: this.savedEntry && this.quality === 'auto' ? this.savedEntry.mp : undefined,
    });
    this.replaceGovernor(g);
    return this.governor.tier;
  }

  private startTier(): QualityTier {
    if (this.quality !== 'auto') {
      this.source = 'manual';
      return this.quality;
    }
    if (this.savedEntry) {
      this.source = 'profile';
      return this.savedEntry.tier;
    }
    this.source = 'guess';
    return this.guess?.tier ?? 'medium';
  }

  private replaceGovernor(g: Governor): void {
    this.gov = g;
    this.wireGovernor(g);
    this.events.emit('resolution', { type: 'resolution', mp: g.mp, reason: 'tier' });
  }

  /** Auto mode without a saved stable profile → run the benchmark on the loading screen. */
  get needsBenchmark(): boolean {
    return this.quality === 'auto' && !this.savedEntry && this.bench === null;
  }

  /**
   * Run the micro-benchmark (≤1.5 s). Candidates: from the static guess' ceiling down to one tier
   * below the guess (a busy loading screen must never push a capable phone to Low).
   */
  async benchmark(drawFn: BenchmarkDrawFn, opts: BenchmarkOptions = {}): Promise<BenchmarkResult> {
    const guess = this.guess ?? guessTier(this.device ?? readDeviceInfo(null));
    const lo = tierIndex(lowerTier(guess.tier));
    const hi = tierIndex(guess.maxTier);
    const candidates = TIER_ORDER.filter((t) => tierIndex(t) >= lo && tierIndex(t) <= hi);
    const res = await runBenchmark(drawFn, candidates, {
      gl: this.gl ?? undefined,
      sync: opts.sync ?? (this.gl ? readPixelsSync(this.gl) : undefined),
      nativeMp: this.nativeMp,
      now: this.clock,
      ...opts,
    });
    this.bench = res;
    if (this.quality === 'auto') {
      this.source = 'benchmark';
      this.governor.setTier(res.tier, 'profile', this.clock());
    }
    return res;
  }

  // ---- runtime -------------------------------------------------------------------------------

  /** Feed from GameLoop.frameEnd. */
  frame(s: FrameSample): void {
    this.governor.frame(s.nowMs, s.intervalMs, s.cpuMs, s.costMs, s.targetMs);
    if (s.intervalMs > 0) this.fpsEma += (1000 / s.intervalMs - this.fpsEma) * 0.05;
    this.refreshHz = s.targetMs > 0 ? Math.round(1000 / s.targetMs) : 60;
    this.lastFrameNow = s.nowMs;
    if (s.nowMs - this.lastReport >= 30_000) {
      this.lastReport = s.nowMs;
      const snap = this.snapshot();
      this.events.emit('report', { tier: snap.tier, fpsP50: snap.fpsP50, fpsP90: snap.fpsP90 });
    }
  }

  /** Round end, menu, restart: shader/define/shadow changes happen only here (§5.3.6). */
  naturalBreak(): void {
    this.governor.naturalBreak(this.lastFrameNow || this.clock());
  }

  /** Ignore frame samples for `ms` (state change, world streaming, shader warm-up). */
  grace(ms = 1000): void {
    this.governor.grace(this.lastFrameNow || this.clock(), ms);
  }

  /** Settings → Grafik. `auto` hands control back to the governor at the current tier. */
  setQuality(q: QualitySetting): void {
    if (q === this.quality) return;
    this.quality = q;
    if (q === 'auto') {
      this.governor.setManual(false);
      this.source = this.savedEntry ? 'profile' : this.bench ? 'benchmark' : 'guess';
      const t = this.savedEntry?.tier ?? this.bench?.tier ?? this.guess?.tier ?? this.governor.tier;
      this.governor.setTier(t, 'profile', this.clock());
    } else {
      this.source = 'manual';
      this.governor.setManual(true);
      this.governor.setTier(q, 'manual', this.clock());
    }
  }

  /** Test API / debug: force a tier (keeps the current auto/manual mode). */
  forceTier(t: QualityTier): void {
    this.governor.setTier(t, 'forced', this.clock());
  }

  get tier(): QualityTier {
    return this.governor.tier;
  }

  get qualitySetting(): QualitySetting {
    return this.quality;
  }

  get mp(): number {
    return this.governor.mp;
  }

  get particleCap(): number {
    return this.governor.particleCap;
  }

  get spec(): (typeof TIERS)[QualityTier] {
    return TIERS[this.governor.tier];
  }

  /** Renderer pixel ratio for the current MP on a css-size canvas. */
  pixelRatioFor(cssW: number, cssH: number): number {
    const dpr = this.device?.dpr ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    return pixelRatioFor(this.governor.mp, cssW, cssH, TIERS[this.governor.tier].common.dprCap, dpr);
  }

  /** Whether the "Ultra 120 Hz" option should be shown (Xiaomi 13 class: ultra-capable + 120 Hz panel). */
  ultra120Available(measuredRefreshHz: number): boolean {
    return measuredRefreshHz >= 100 && (this.guess?.maxTier ?? 'high') === 'ultra';
  }

  setRendererStatsSource(fn: (() => RendererStats) | null): void {
    this.rendererStats = fn;
  }

  on<K extends keyof DirectorEvents>(type: K, fn: (e: DirectorEvents[K]) => void): () => void {
    return this.events.on(type, fn);
  }

  // ---- profile -------------------------------------------------------------------------------

  private saveProfile(stable: boolean): void {
    if (!this.fp || this.quality !== 'auto') return;
    const file = readProfileFile(this.kv);
    file.entries[this.fp] = {
      tier: this.governor.tier,
      mp: Math.round(this.governor.mp * 1000) / 1000,
      stable,
      savedAt: Date.now(),
      gpu: this.device?.gpu.slice(0, 120) ?? '',
    };
    // keep the 4 most recent fingerprints (UA updates create new ones)
    const keys = Object.keys(file.entries).sort((a, b) => file.entries[b].savedAt - file.entries[a].savedAt);
    for (const k of keys.slice(4)) delete file.entries[k];
    try {
      atomicWrite(this.kv, STORAGE_KEYS.perfProfile, JSON.stringify(file));
      this.savedEntry = file.entries[this.fp];
    } catch {
      // storage full: the profile is an optimisation only
    }
  }

  /** Forget the saved profile (settings → reset / tests). */
  clearProfile(): void {
    const file = readProfileFile(this.kv);
    delete file.entries[this.fp];
    try {
      atomicWrite(this.kv, STORAGE_KEYS.perfProfile, JSON.stringify(file));
    } catch {
      // ignore
    }
    this.savedEntry = null;
  }

  get savedProfile(): PerfProfileEntry | null {
    return this.savedEntry;
  }

  get deviceFingerprint(): string {
    return this.fp;
  }

  // ---- snapshot ------------------------------------------------------------------------------

  snapshot(cssW = 0, cssH = 0): PerfSnapshot {
    const g = this.governor;
    const heap = (globalThis.performance as unknown as { memory?: { usedJSHeapSize: number } } | undefined)?.memory;
    return {
      tier: g.tier,
      quality: this.quality,
      mp: g.mp,
      pixelRatio: cssW > 0 ? this.pixelRatioFor(cssW, cssH) : NaN,
      fps: Math.round(this.fpsEma * 10) / 10,
      p50: g.p50,
      p90: g.p90,
      fpsP50: g.p50 > 0 ? Math.round(10000 / g.p50) / 10 : 0,
      fpsP90: g.p90 > 0 ? Math.round(10000 / g.p90) / 10 : 0,
      costP90: g.costP90,
      cpuP90: g.cpuP90,
      particleScale: g.particleScale,
      particleCap: g.particleCap,
      constraint: g.constraint,
      thermalLevel: g.thermalLevel,
      pendingDrop: g.pendingDrop,
      refreshHz: this.refreshHz,
      fingerprint: this.fp,
      gpu: this.device?.gpu ?? '',
      guess: this.guess,
      source: this.source,
      benchmark: this.bench,
      renderer: this.rendererStats ? safeStats(this.rendererStats) : null,
      jsHeapMB: heap ? Math.round(heap.usedJSHeapSize / 1e5) / 10 : NaN,
    };
  }
}

function safeStats(fn: () => RendererStats): RendererStats | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

/**
 * Texture memory estimate from three.js-like texture descriptors (bytes → MB). Render agent may
 * provide a better one; this is the fallback used by the perf panel / budget tests.
 */
export function estimateTextureMB(textures: Iterable<{ width: number; height: number; bytesPerPixel?: number; mipmaps?: boolean; layers?: number }>): number {
  let bytes = 0;
  for (const t of textures) {
    const base = t.width * t.height * (t.bytesPerPixel ?? 4) * (t.layers ?? 1);
    bytes += t.mipmaps === false ? base : base * 1.333;
  }
  return Math.round(bytes / 1e5) / 10;
}
