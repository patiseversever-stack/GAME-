// Gesture math seam. The canonical math lives in src/sim/inputQuant.ts (flight agent) and is shared
// with bots, ghosts and tests so that live play quantizes exactly like a replay. This module only
// adapts it for the input layer and keeps `setGestureMath()` as a seam for tests / future variants.

import type { StickOptions } from '../sim/inputQuant.ts';
import {
  AXIS_Q,
  EXPO_PITCH,
  EXPO_ROLL,
  expoCurve,
  quantizeAxis as simQuantizeAxis,
  shapeStick as simShapeStick,
  STICK_DEADZONE,
  STICK_RADIUS_FRACTION,
  stickRadius,
  updateAnchor,
} from '../sim/inputQuant.ts';

export type { StickOptions };
export { stickRadius, updateAnchor };

export interface GestureMath {
  /** Dead zone + rescale + expo + sensitivity + natural/pilot mapping → out[0]=roll (+right), out[1]=pitch (+nose up). */
  shapeStick(vx: number, vy: number, opts: StickOptions, out: Float64Array): void;
  /** sign(x)·(e·|x|³ + (1−e)·|x|) */
  expo(x: number, e: number): number;
  /** [-1,1] → int [-31,31], never -0 */
  quantizeAxis(x: number): number;
  /** [0,1] → int [0,31] */
  quantizeFlare(x: number): number;
}

export const AXIS_MAX = AXIS_Q;

export const STICK_TUNING = {
  /** R = 0.11 × short screen side (~45 pt). */
  radiusFrac: STICK_RADIUS_FRACTION,
  deadzone: STICK_DEADZONE,
  deadzoneSuru: 0.1,
  expoRoll: EXPO_ROLL,
  expoPitch: EXPO_PITCH,
  /** Canopy: a downward drag of 1 R = full flare. */
  flareFullR: 1.0,
} as const;

export const defaultGestureMath: GestureMath = {
  shapeStick: simShapeStick,
  expo: expoCurve,
  quantizeAxis: simQuantizeAxis,
  quantizeFlare(x) {
    const c = x > 1 ? 1 : x < 0 || !(x === x) ? 0 : x;
    return Math.round(c * AXIS_Q) | 0;
  },
};

let impl: GestureMath = defaultGestureMath;

/** Swap the math (partial overrides keep the rest); null restores the shared sim implementation. */
export function setGestureMath(m: Partial<GestureMath> | null): void {
  impl = m ? { ...defaultGestureMath, ...m } : defaultGestureMath;
}

export function gestureMath(): GestureMath {
  return impl;
}

/** Effective expo the sim applies: base + user slider, capped at 0.95. */
export function effectiveExpo(base: number, user: number): number {
  return Math.min(0.95, Math.max(0, base + Math.max(0, user)));
}
