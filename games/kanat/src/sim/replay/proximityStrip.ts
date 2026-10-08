// Proximity strip (Yakınlık şeridi) for the share cards (owner: replay). BRIEF §2.5 Mod 2, §2.8. PURE.
//
// The route is split into 5 equal arc-length parts by route progress s ∈ [0, 1]; each part shows
// the proximity tier the pilot spent the most time in: ⬜ (> 30 m, ×0) 🟩 ×1 🟨 ×2 🟧 ×3 🟥 ×5.

export const PROXIMITY_SEGMENTS = 5;
export const PROXIMITY_TIERS = 5;
/** Tier index 0..4 → emoji. */
export const PROXIMITY_TIER_EMOJI: readonly string[] = ['⬜', '🟩', '🟨', '🟧', '🟥'];
/** Tier index 0..4 → score multiplier Ç(d). */
export const PROXIMITY_TIER_MULT: readonly number[] = [0, 1, 2, 3, 5];

export type ProximityTier = 0 | 1 | 2 | 3 | 4;

/** Multiplier (0,1,2,3,5) → tier 0..4. Values in between round down to the tier below. */
export function multToTier(mult: number): ProximityTier {
  if (mult >= 5) return 4;
  if (mult >= 3) return 3;
  if (mult >= 2) return 2;
  if (mult >= 1) return 1;
  return 0;
}

export interface ProximityStrip {
  /** Winning tier per segment (start → finish). */
  tiers: ProximityTier[];
  /** Five emoji, e.g. "🟨🟨🟧🟥🟥". */
  emoji: string;
  /** False for a segment with no recorded time (shown as ⬜). */
  visited: boolean[];
}

export function stripEmoji(tiers: readonly number[]): string {
  let s = '';
  for (let i = 0; i < tiers.length; i++) s += PROXIMITY_TIER_EMOJI[Math.max(0, Math.min(4, tiers[i] | 0))];
  return s;
}

/**
 * Incremental accumulator: call `add(s, mult, dt)` once per sim tick; `add` does not allocate.
 * Ties between tiers resolve to the closer (higher) tier.
 */
export class ProximityStripAccumulator {
  private readonly time = new Float64Array(PROXIMITY_SEGMENTS * PROXIMITY_TIERS);
  private readonly perTier = new Float64Array(PROXIMITY_TIERS);
  private total = 0;

  /** s = route progress by arc length (clamped to [0, 1]); mult = ProximityInfo.mult; dt = seconds. */
  add(s: number, mult: number, dt: number): void {
    if (!(dt > 0) || s !== s) return;
    let seg = Math.floor(s * PROXIMITY_SEGMENTS);
    if (seg < 0) seg = 0;
    else if (seg >= PROXIMITY_SEGMENTS) seg = PROXIMITY_SEGMENTS - 1;
    const tier = multToTier(mult);
    this.time[seg * PROXIMITY_TIERS + tier] += dt;
    this.perTier[tier] += dt;
    this.total += dt;
  }

  /** Winning tier of one segment (0 when the segment has no time). */
  segmentTier(segment: number): ProximityTier {
    let best: ProximityTier = 0;
    let bestT = 0;
    const base = segment * PROXIMITY_TIERS;
    for (let t = 0; t < PROXIMITY_TIERS; t++) {
      const v = this.time[base + t];
      if (v > 0 && v >= bestT) {
        bestT = v;
        best = t as ProximityTier;
      }
    }
    return best;
  }

  /** Seconds spent in one segment at one tier. */
  timeIn(segment: number, tier: ProximityTier): number {
    return this.time[segment * PROXIMITY_TIERS + tier];
  }

  /** Seconds spent at `tier` or closer over the whole flight (3★ rule: timeAtOrAbove(3) >= 15). */
  timeAtOrAbove(tier: ProximityTier): number {
    let sum = 0;
    for (let t = tier; t < PROXIMITY_TIERS; t++) sum += this.perTier[t];
    return sum;
  }

  totalTime(): number {
    return this.total;
  }

  result(): ProximityStrip {
    const tiers: ProximityTier[] = [];
    const visited: boolean[] = [];
    for (let seg = 0; seg < PROXIMITY_SEGMENTS; seg++) {
      tiers.push(this.segmentTier(seg));
      let any = false;
      for (let t = 0; t < PROXIMITY_TIERS; t++) if (this.time[seg * PROXIMITY_TIERS + t] > 0) any = true;
      visited.push(any);
    }
    return { tiers, emoji: stripEmoji(tiers), visited };
  }

  reset(): void {
    this.time.fill(0);
    this.perTier.fill(0);
    this.total = 0;
  }
}
