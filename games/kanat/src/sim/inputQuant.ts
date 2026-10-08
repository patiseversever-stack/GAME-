// Shared gesture math for the flight stick (brief §2.2 + §4.G.5 control mapping). Owner: flight agent.
// Used by the input module (touch → Command) and by bots/tests, so live play, ghosts and bots quantize identically.
// PURE: no DOM, no allocation in the per-move functions (results go into `out` arrays).
//
// Pipeline (per touch move, screen pixels, y grows downward):
//   1. Floating anchor: v = (finger − anchor) / R, R = 0.11 × short screen edge. If |v| > 1 the anchor slides
//      after the finger so that |v| = 1 (the thumb never hits "the end of the road").
//   2. Radial dead zone 0.08, then rescale from 0 (no jump): v' = v · ((|v| − dz)/(1 − dz)) / |v|.
//   3. Per-axis expo: out = sign(x)·(e|x|³ + (1−e)|x|), e_roll = 0.35, e_pitch = 0.50 (+ user expo slider).
//   4. Sensitivity multiplier (0.6–1.5), clamp to [−1, 1].
//   5. Mapping: horizontal → roll (+ = right), vertical → pitch (+ = nose up). "natural" (default): drag UP = nose
//      up; "pilot": drag DOWN = nose up.
//   6. Quantize to int [−31, 31] (6 bit). NEVER −0 (ghost streams store Int8 → −0 would desync replays).

export const STICK_RADIUS_FRACTION = 0.11;
export const STICK_DEADZONE = 0.08;
export const EXPO_ROLL = 0.35;
export const EXPO_PITCH = 0.5;
export const AXIS_Q = 31;

export interface StickOptions {
  /** 0.6..1.5 (Settings.kanat.sensitivity). Default 1. */
  sensitivity?: number;
  /** 'natural' = drag up → nose up (default), 'pilot' = drag down → nose up. */
  controlDir?: 'natural' | 'pilot';
  /** Additional expo from the settings slider (0..0.7), added to both axes, total capped at 0.95. */
  expoExtra?: number;
  expoRoll?: number;
  expoPitch?: number;
  deadzone?: number;
}

/** Stick radius in pixels for a screen whose shorter edge is `shortEdgePx`. */
export function stickRadius(shortEdgePx: number): number {
  return STICK_RADIUS_FRACTION * shortEdgePx;
}

/** Expo curve sign(x)·(e|x|³ + (1−e)|x|) for x in [−1, 1]. */
export function expoCurve(x: number, e: number): number {
  const a = x < 0 ? -x : x;
  const y = e * a * a * a + (1 - e) * a;
  return x < 0 ? -y : y;
}

/** Quantize a normalized axis value in [−1, 1] to an int in [−31, 31]; never returns −0. */
export function quantizeAxis(v: number): number {
  if (!(v === v)) return 0;
  let q = Math.round(v * AXIS_Q) | 0;
  if (q > AXIS_Q) q = AXIS_Q;
  else if (q < -AXIS_Q) q = -AXIS_Q;
  return q | 0;
}

/**
 * Floating-anchor update. anchor = [ax, ay] (pixels) is modified in place when the finger leaves the radius.
 * Writes the normalized stick vector (|v| ≤ 1, screen orientation: +x right, +y down) into out[0], out[1].
 */
export function updateAnchor(anchor: number[] | Float64Array, fx: number, fy: number, radiusPx: number, out: number[] | Float64Array): void {
  const R = radiusPx > 1e-6 ? radiusPx : 1e-6;
  let vx = (fx - anchor[0]) / R;
  let vy = (fy - anchor[1]) / R;
  const m = Math.sqrt(vx * vx + vy * vy);
  if (m > 1) {
    vx /= m;
    vy /= m;
    anchor[0] = fx - vx * R;
    anchor[1] = fy - vy * R;
  }
  out[0] = vx;
  out[1] = vy;
}

/**
 * Dead zone + rescale + expo + sensitivity + inversion for a normalized screen-space stick vector.
 * Writes roll into out[0] (+ right) and pitch into out[1] (+ nose up), both in [−1, 1].
 */
export function shapeStick(vx: number, vy: number, opts: StickOptions, out: number[] | Float64Array): void {
  const dz = opts.deadzone ?? STICK_DEADZONE;
  const m = Math.sqrt(vx * vx + vy * vy);
  let x = 0;
  let y = 0;
  if (m > dz) {
    const mm = m > 1 ? 1 : m;
    const k = (mm - dz) / (1 - dz) / m;
    x = vx * k;
    y = vy * k;
  }
  const extra = opts.expoExtra ?? 0;
  let er = (opts.expoRoll ?? EXPO_ROLL) + extra;
  let ep = (opts.expoPitch ?? EXPO_PITCH) + extra;
  if (er > 0.95) er = 0.95;
  if (ep > 0.95) ep = 0.95;
  if (er < 0) er = 0;
  if (ep < 0) ep = 0;
  const sens = opts.sensitivity ?? 1;
  let roll = expoCurve(x, er) * sens;
  // screen +y is down: natural = drag up (negative y) → nose up (positive pitch)
  let pitch = expoCurve(y, ep) * sens * ((opts.controlDir ?? 'natural') === 'natural' ? -1 : 1);
  if (roll > 1) roll = 1;
  else if (roll < -1) roll = -1;
  if (pitch > 1) pitch = 1;
  else if (pitch < -1) pitch = -1;
  out[0] = roll;
  out[1] = pitch;
}

/** Full pipeline from a normalized screen-space stick vector to the quantized command args [sx, sy]. */
export function quantizeStick(vx: number, vy: number, opts: StickOptions, out: number[] | Int8Array): void {
  const t = scratch;
  shapeStick(vx, vy, opts, t);
  out[0] = quantizeAxis(t[0]);
  out[1] = quantizeAxis(t[1]);
}
const scratch = new Float64Array(2);

/** Single-axis variant for the landscape "two thumbs" scheme (each half of the screen drives one axis). */
export function quantizeSingleAxis(v: number, expo: number, sensitivity: number, deadzone: number = STICK_DEADZONE): number {
  const a = v < 0 ? -v : v;
  if (a <= deadzone) return 0;
  const r = ((a > 1 ? 1 : a) - deadzone) / (1 - deadzone);
  const s = expoCurve(v < 0 ? -r : r, expo) * sensitivity;
  return quantizeAxis(s > 1 ? 1 : s < -1 ? -1 : s);
}

/**
 * Relative "drag anywhere" stick with a floating anchor. Pure state holder; the input module feeds it
 * pointer coordinates (pixels) and reads quantized [sx, sy] for 'axis' commands (sampled at 30 Hz).
 */
export class RelativeStick {
  readonly anchor = new Float64Array(2);
  readonly v = new Float64Array(2);
  active = false;
  radiusPx = 45;
  opts: StickOptions;

  constructor(shortEdgePx: number, opts: StickOptions = {}) {
    this.radiusPx = stickRadius(shortEdgePx);
    this.opts = opts;
  }

  resize(shortEdgePx: number): void {
    this.radiusPx = stickRadius(shortEdgePx);
  }

  begin(x: number, y: number): void {
    this.anchor[0] = x;
    this.anchor[1] = y;
    this.v[0] = 0;
    this.v[1] = 0;
    this.active = true;
  }

  move(x: number, y: number): void {
    if (!this.active) return;
    updateAnchor(this.anchor, x, y, this.radiusPx, this.v);
  }

  end(): void {
    this.active = false;
    this.v[0] = 0;
    this.v[1] = 0;
  }

  /** Quantized [sx, sy] for the current finger (0, 0 when released). */
  read(out: number[] | Int8Array): void {
    if (!this.active) {
      out[0] = 0;
      out[1] = 0;
      return;
    }
    quantizeStick(this.v[0], this.v[1], this.opts, out);
  }
}
