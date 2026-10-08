// Gesture math (§2.2 / §4.G.5): radial deadzone with rescale, expo curve, sensitivity, 6-bit quantize.
// The canonical implementation will live in src/sim/inputQuant.ts (flight agent, shared with bots and
// replays). Until/unless it is wired, this module provides the same math; `setGestureMath()` swaps in
// the shared functions without touching the input layer (see docs/decisions/platform.md).

export interface GestureMath {
  /** Radial deadzone on a unit-disk vector, output rescaled from 0 (no jump). Writes out[0], out[1]. */
  radialDeadzone(x: number, y: number, dz: number, out: Float64Array): void;
  /** out = sign(x)·(e·|x|³ + (1−e)·|x|) */
  expo(x: number, e: number): number;
  /** [-1,1] → int [-31,31] */
  quantizeAxis(x: number): number;
  /** [0,1] → int [0,31] */
  quantizeFlare(x: number): number;
}

export const AXIS_MAX = 31;

export const STICK_TUNING = {
  /** R = 0.11 × short screen side (~45 pt). */
  radiusFrac: 0.11,
  deadzone: 0.08,
  deadzoneSuru: 0.1,
  expoRoll: 0.35,
  expoPitch: 0.5,
  /** Canopy: horizontal = turn (≤35°/s handled by sim), downward drag of 1 R = full flare. */
  flareFullR: 1.0,
} as const;

export const defaultGestureMath: GestureMath = {
  radialDeadzone(x, y, dz, out) {
    let m = Math.sqrt(x * x + y * y);
    if (m <= dz || m === 0) {
      out[0] = 0;
      out[1] = 0;
      return;
    }
    if (m > 1) {
      x /= m;
      y /= m;
      m = 1;
    }
    const s = (m - dz) / (1 - dz) / m;
    out[0] = x * s;
    out[1] = y * s;
  },
  expo(x, e) {
    const a = Math.abs(x);
    const v = e * a * a * a + (1 - e) * a;
    return x < 0 ? -v : v;
  },
  quantizeAxis(x) {
    const c = x > 1 ? 1 : x < -1 ? -1 : x;
    const q = Math.round(c * AXIS_MAX);
    return q === 0 ? 0 : q; // no -0
  },
  quantizeFlare(x) {
    const c = x > 1 ? 1 : x < 0 ? 0 : x;
    return Math.round(c * AXIS_MAX);
  },
};

let impl: GestureMath = defaultGestureMath;

/** Swap in the shared sim implementation (partial overrides keep the rest). */
export function setGestureMath(m: Partial<GestureMath> | null): void {
  impl = m ? { ...defaultGestureMath, ...m } : defaultGestureMath;
}

export function gestureMath(): GestureMath {
  return impl;
}

/** Base expo + the user's extra expo slider (0..0.7) → effective curve, capped below 1. */
export function effectiveExpo(base: number, user: number): number {
  return Math.min(0.95, base + Math.max(0, user) * (1 - base));
}

export interface StickShape {
  deadzone: number;
  expoX: number;
  expoY: number;
  sensitivity: number;
  /** Natural: drag up = nose up (positive). Pilot: inverted. */
  invertY: boolean;
}

const tmp = new Float64Array(2);

/**
 * Raw stick vector (screen space, +x right, +y DOWN, unit disk) → shaped floats in [-1,1]
 * with +y = pull/nose-up for `natural`. Writes out[0]=x, out[1]=y.
 */
export function shapeStick(rx: number, ry: number, s: StickShape, out: Float64Array): void {
  const m = impl;
  m.radialDeadzone(rx, -ry, s.deadzone, tmp);
  let x = tmp[0] * s.sensitivity;
  let y = tmp[1] * s.sensitivity;
  x = x > 1 ? 1 : x < -1 ? -1 : x;
  y = y > 1 ? 1 : y < -1 ? -1 : y;
  out[0] = m.expo(x, s.expoX);
  out[1] = m.expo(s.invertY ? -y : y, s.expoY);
}
