// Micro-benchmark (§5.3 step 3). The render agent supplies `drawFn(tier, mp)` which draws the
// "benchmark vignette" (heaviest real scene, same shaders + post) offscreen at the candidate's
// resolution. Each frame is synchronised with a 1-px readPixels so the measured time is the real
// CPU+GPU cost (mobile has no usable GPU timer queries). The first frame of each tier is warm-up
// (shader compile → it doubles as the shader pre-warm) and is not timed.

import type { QualityTier } from '../core/settings.ts';
import { now as defaultNow } from '../core/time.ts';
import { FRAME_BUDGET, initialMp, tierIndex } from './tiers.ts';

export type BenchmarkDrawFn = (tier: QualityTier, mp: number) => void;

export interface BenchmarkOptions {
  /** Blocks until the GPU finished the frame. Default: 1-px gl.readPixels on `gl`. */
  sync?: () => void;
  gl?: WebGLRenderingContext | WebGL2RenderingContext;
  now?: () => number;
  /** Total time budget (default 1500 ms). */
  budgetMs?: number;
  /** Pick the highest tier whose estimated frame ≤ targetMs (default 11 ms). */
  targetMs?: number;
  /** Timed frames per tier (default 5). */
  framesPerTier?: number;
  nativeMp?: number;
  /** Yield between tiers so the loading screen keeps animating (default: setTimeout 0). */
  yieldFn?: () => Promise<void>;
}

export interface BenchmarkResult {
  tier: QualityTier;
  /** Median ms per tier that was measured. */
  estimates: Partial<Record<QualityTier, number>>;
  elapsedMs: number;
  timedOut: boolean;
  /** Tiers in the order they were measured. */
  measured: QualityTier[];
}

export function readPixelsSync(gl: WebGLRenderingContext | WebGL2RenderingContext): () => void {
  const px = new Uint8Array(4);
  return () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Measure candidate tiers from the highest down and return the highest one with an estimated
 * frame ≤ 11 ms. `tiers` = candidates (any order; measured high → low). If the budget runs out,
 * the answer is the tier below the lowest failing tier (or the lowest candidate).
 */
export async function runBenchmark(
  drawFn: BenchmarkDrawFn,
  tiers: readonly QualityTier[],
  opts: BenchmarkOptions = {},
): Promise<BenchmarkResult> {
  const clock = opts.now ?? defaultNow;
  const sync = opts.sync ?? (opts.gl ? readPixelsSync(opts.gl) : () => undefined);
  const budget = opts.budgetMs ?? 1500;
  const target = opts.targetMs ?? FRAME_BUDGET.benchmarkPickMs;
  const perTier = Math.max(2, opts.framesPerTier ?? 5);
  const nativeMp = opts.nativeMp ?? 8;
  const yieldFn = opts.yieldFn ?? (() => new Promise<void>((r) => setTimeout(r, 0)));
  const order = [...tiers].sort((a, b) => tierIndex(b) - tierIndex(a));
  const estimates: Partial<Record<QualityTier, number>> = {};
  const measured: QualityTier[] = [];
  const start = clock();
  let timedOut = false;
  let lowestFailing: QualityTier | null = null;

  for (const tier of order) {
    if (clock() - start > budget) {
      timedOut = true;
      break;
    }
    const mp = initialMp(tier, nativeMp);
    // warm-up (compiles programs for this tier; not timed)
    drawFn(tier, mp);
    sync();
    const times: number[] = [];
    for (let i = 0; i < perTier; i++) {
      const t0 = clock();
      drawFn(tier, mp);
      sync();
      times.push(clock() - t0);
      if (clock() - start > budget) {
        timedOut = true;
        break;
      }
    }
    const est = median(times);
    estimates[tier] = est;
    measured.push(tier);
    if (est <= target) {
      return { tier, estimates, elapsedMs: clock() - start, timedOut, measured };
    }
    lowestFailing = tier;
    if (timedOut) break;
    await yieldFn();
  }
  const lowest = order[order.length - 1] ?? 'low';
  let tier: QualityTier = lowest;
  if (lowestFailing) {
    const below = order[order.indexOf(lowestFailing) + 1];
    tier = below ?? lowest;
  }
  return { tier, estimates, elapsedMs: clock() - start, timedOut, measured };
}
