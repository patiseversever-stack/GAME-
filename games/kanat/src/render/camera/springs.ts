// Critically damped springs (exact solution for a constant target → frame-rate independent, never overshoots)
// and the screen-shake generator (§2.3 rules). Allocation-free.

/** One critically damped step for a scalar. state = [x, v]. */
export function springScalar(state: Float64Array, offset: number, target: number, omega: number, dt: number): void {
  const x = state[offset];
  const v = state[offset + 1];
  const e = Math.exp(-omega * dt);
  const d = x - target;
  const t = (v + omega * d) * dt;
  state[offset] = target + (d + t) * e;
  state[offset + 1] = (v - omega * t) * e;
}

/** Critically damped spring for a 3D point: pos/vel Float64Array(3) each. */
export class Spring3 {
  readonly pos = new Float64Array(3);
  readonly vel = new Float64Array(3);
  private s = new Float64Array(2);
  omega: number;
  initialized = false;

  constructor(omega: number) {
    this.omega = omega;
  }

  reset(x: number, y: number, z: number): void {
    this.pos[0] = x;
    this.pos[1] = y;
    this.pos[2] = z;
    this.vel.fill(0);
    this.initialized = true;
  }

  step(tx: number, ty: number, tz: number, dt: number): void {
    if (!this.initialized) {
      this.reset(tx, ty, tz);
      return;
    }
    for (let i = 0; i < 3; i++) {
      this.s[0] = this.pos[i];
      this.s[1] = this.vel[i];
      springScalar(this.s, 0, i === 0 ? tx : i === 1 ? ty : tz, this.omega, dt);
      this.pos[i] = this.s[0];
      this.vel[i] = this.s[1];
    }
  }
}

/** Scalar spring wrapper. */
export class Spring1 {
  readonly s = new Float64Array(2);
  omega: number;
  initialized = false;
  constructor(omega: number) {
    this.omega = omega;
  }
  get value(): number {
    return this.s[0];
  }
  reset(x: number): void {
    this.s[0] = x;
    this.s[1] = 0;
    this.initialized = true;
  }
  step(target: number, dt: number): number {
    if (!this.initialized) this.reset(target);
    else springScalar(this.s, 0, target, this.omega, dt);
    return this.s[0];
  }
}

/** Rate limiter (e.g. FOV ≤ 12°/s). */
export function approach(current: number, target: number, maxRate: number, dt: number): number {
  const d = target - current;
  const m = maxRate * dt;
  return current + (d > m ? m : d < -m ? -m : d);
}

/**
 * Screen shake (§2.3): only from proximity (d < 7 m) and crashes. Caps 0.08 m / 0.6°, frequency ≤ 14 Hz,
 * 0.25 s decay, never longer than 1.5 s continuous; comfort camera / reduceMotion → 0.
 */
export class Shake {
  private amp = 0;
  private time = 0;
  private continuous = 0;
  private cooldown = 0;
  /** Output: position offset (camera space, m) and roll/pitch/yaw offsets (rad). */
  readonly offset = new Float64Array(3);
  readonly rot = new Float64Array(3);
  enabled = true;

  /** Request a shake level 0..1 this frame (proximity drive). */
  drive(level: number, dt: number): void {
    const l = Math.min(1, Math.max(0, level));
    if (l > 0.01 && this.cooldown <= 0) {
      this.continuous += dt;
      if (this.continuous > 1.5) {
        this.cooldown = 0.6;
        this.continuous = 0;
      } else if (l > this.amp) this.amp = l;
    } else if (l <= 0.01) this.continuous = 0;
  }

  /** One-shot impulse (crash). */
  impulse(level: number): void {
    this.amp = Math.max(this.amp, Math.min(1, level));
  }

  update(dt: number): void {
    this.time = (this.time + dt) % 1000;
    if (this.cooldown > 0) this.cooldown -= dt;
    // 0.25 s decay to ~5 %.
    this.amp *= Math.exp(-dt * 12);
    const a = this.enabled ? this.amp : 0;
    const t = this.time;
    // Sum of incommensurate sines, all ≤ 14 Hz.
    const n1 = Math.sin(t * 2 * Math.PI * 13.1) * 0.5 + Math.sin(t * 2 * Math.PI * 7.3 + 1.7) * 0.5;
    const n2 = Math.sin(t * 2 * Math.PI * 11.7 + 0.4) * 0.5 + Math.sin(t * 2 * Math.PI * 5.9 + 2.9) * 0.5;
    const n3 = Math.sin(t * 2 * Math.PI * 9.1 + 4.1) * 0.6 + Math.sin(t * 2 * Math.PI * 13.9 + 0.9) * 0.4;
    this.offset[0] = n1 * 0.08 * a;
    this.offset[1] = n2 * 0.08 * a;
    this.offset[2] = 0;
    const r = (0.6 * Math.PI) / 180;
    this.rot[0] = n3 * r * a; // roll
    this.rot[1] = n2 * r * 0.5 * a; // pitch
    this.rot[2] = n1 * r * 0.5 * a; // yaw
  }
}
