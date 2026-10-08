// SÜRÜ.io owner identity (§3.8): player is always gold; rivals use 7 colour-blind-safe colours; repeats are
// separated by aura pattern (solid / dashed / dotted) and leader marker shape (circle, triangle, square,
// diamond). Owner colours are gameplay (readability), never cosmetics.

export const PLAYER_GOLD = '#FFC23D';
export const RIVAL_COLORS = ['#56B4E9', '#E69F00', '#009E73', '#0072B2', '#D55E00', '#CC79A7', '#F2F2F2'] as const;
export const AURA_PATTERNS = ['solid', 'dashed', 'dotted'] as const;
export const LEADER_MARKS = ['circle', 'triangle', 'square', 'diamond'] as const;

export type AuraPattern = (typeof AURA_PATTERNS)[number];
export type LeaderMark = (typeof LEADER_MARKS)[number];

export interface OwnerStyle {
  flock: number;
  color: string;
  /** 0 solid · 1 dashed · 2 dotted */
  pattern: number;
  /** 0 circle · 1 triangle · 2 square · 3 diamond */
  mark: number;
}

/** Style of flock id `f` (1 = player). Deterministic, identical for HUD, minimap and 3D. */
export function ownerStyle(f: number): OwnerStyle {
  if (f <= 1) return { flock: f, color: PLAYER_GOLD, pattern: 0, mark: 0 };
  const r = f - 2; // 0..14
  return { flock: f, color: RIVAL_COLORS[r % RIVAL_COLORS.length], pattern: Math.floor(r / RIVAL_COLORS.length) % 3, mark: (r + 1) % 4 };
}

/** sRGB hex → linear float triple. */
export function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return [c[0], c[1], c[2]];
}
