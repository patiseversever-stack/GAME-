// Point-mass wingsuit glider (brief §4.G.5). Energy-based semi-implicit Euler.
//
//   q = ½ρV²,  L = qS·C_L,  D = qS·(C_D0 + k·C_L² + c_v·max(0, V−58)²)
//   γ̇ = (L·cosφ − m·g·cosγ)/(m·V) − stallNoseDown,   ψ̇ = L·sinφ/(m·V·cosγ)
//   ṗ = V·dir(γ,ψ) + (0, w_thermal + w_ridge, 0) + wind_horizontal
//   E = ½V² + g·y,  Ė = −D·V/m + g·(w_thermal + w_ridge)
//
// Integration per substep: control lags → γ, ψ (semi-implicit: new angles drive the position update) → position
// → the airspeed is recovered from the specific-energy balance E' = E − (D·V/m)·dt + g·w·dt, V' = √(2(E' − g·y')).
// So the discrete scheme satisfies Ė ≤ 0 outside thermal/ridge lift BY CONSTRUCTION (9.G-12), not just
// approximately. The V ≥ 25 m/s floor is also energy-neutral: any deficit is converted into extra sink.
//
// Heading ψ: 0 = north (−z), clockwise toward east (+x). dir = (cosγ·sinψ, sinγ, −cosγ·cosψ).
// PURE: detMath only, no allocation in step().

import { TUNING } from '../data/tuning.ts';
import { atan, atan2, clamp, cos, DEG, sincos, smooth01, wrapPi } from '../math/detMath.ts';

const A = TUNING.aero;
const B = TUNING.body;
const C = TUNING.control;
const ST = TUNING.stall;
const G = TUNING.sim.g;

export const AXIS_MAX = C.axisMax;
export const BANK_MAX = C.bankMaxDeg * DEG;
export const BANK_RATE_MAX = C.bankRateMaxDeg * DEG;
export const PITCH_RATE_MAX = C.pitchRateMaxDeg * DEG;
export const GAMMA_MIN = C.gammaMinDeg * DEG;
export const GAMMA_MAX = C.gammaMaxDeg * DEG;
const HALF_RHO_S = 0.5 * A.rho * B.area;
const CD_TRIM = A.cd0 + A.k * A.clTrim * A.clTrim;
/** Best-glide (trim) path angle, negative (≈ −12.4°). */
export const GAMMA_TRIM = -atan(CD_TRIM / A.clTrim);
/** Steady trim airspeed for the trim CL (≈ 42 m/s). */
export const V_TRIM = Math.sqrt((B.mass * G * Math.sqrt(1 / (1 + (CD_TRIM / A.clTrim) * (CD_TRIM / A.clTrim)))) / (HALF_RHO_S * A.clTrim));
const V_MIN2 = ST.vMin * ST.vMin;

const sc = new Float64Array(2);

/** Mutable glider state. Plain numeric fields (hidden-class stable, zero allocation). */
export class Glider {
  x = 0;
  y = 0;
  z = 0;
  /** Airspeed (m/s). */
  V = V_TRIM;
  /** Flight-path angle relative to the air mass (rad). */
  gamma = GAMMA_TRIM;
  psi = 0;
  phi = 0;
  cl: number = A.clTrim;
  // ---- derived (valid after step / sync) ----
  /** Ground velocity (air-relative + wind + vertical air). */
  vx = 0;
  vy = 0;
  vz = 0;
  lift = 0;
  drag = 0;
  /** 0..1 stall amount (0 above 33 m/s). */
  stall = 0;
  /** sin(γ) at the start of the last substep. */
  gammaSin = 0;

  /** Specific energy ½V² + g·y (J/kg). */
  energy(): number {
    return 0.5 * this.V * this.V + G * this.y;
  }

  /** Recompute the ground velocity from (V, γ, ψ) and the given air motion. */
  syncVelocity(wx: number, wy: number, wz: number): void {
    sincos(this.gamma, sc);
    const sg = sc[0];
    const cg = sc[1];
    sincos(this.psi, sc);
    this.vx = this.V * cg * sc[0] + wx;
    this.vy = this.V * sg + wy;
    this.vz = -this.V * cg * sc[1] + wz;
  }

  /** Set the air-relative state from a ground velocity vector minus the air motion (used after bounces/jump). */
  setFromVelocity(vx: number, vy: number, vz: number, wx: number, wy: number, wz: number): void {
    const ax = vx - wx;
    const ay = vy - wy;
    const az = vz - wz;
    const h = Math.sqrt(ax * ax + az * az);
    const v = Math.sqrt(h * h + ay * ay);
    this.V = v;
    this.gamma = clamp(atan2(ay, h), GAMMA_MIN, GAMMA_MAX);
    if (h > 1e-6) this.psi = atan2(ax, -az);
    this.syncVelocity(wx, wy, wz);
  }

  /**
   * One integration substep.
   * @param sx roll axis [-31, 31] (0 = released)
   * @param sy pitch axis [-31, 31] (+ = pull / nose up, 0 = released)
   * @param noseDownExtra extra path rotation (rad/s, + = nose down) from flight assists (energy neutral)
   */
  step(dt: number, sx: number, sy: number, wx: number, wy: number, wz: number, noseDownExtra: number): void {
    // --- bank: first-order lag with rate limit (release = slower auto-level) ---
    const bankT = (sx / AXIS_MAX) * BANK_MAX;
    const tauB = sx === 0 ? C.tauRelease : C.tauBank;
    const dphi = clamp((bankT - this.phi) / tauB, -BANK_RATE_MAX, BANK_RATE_MAX);
    this.phi += dphi * dt;

    // --- lift coefficient: stall-limited ceiling, push/pull mapping, released = phugoid-damped trim ---
    const V = this.V;
    const stall = smooth01((ST.onset - V) / (ST.onset - ST.vMin));
    this.stall = stall;
    const clCeil = A.clMax - (A.clMax - ST.clAtVMin) * stall;
    let clT: number;
    if (sy > 0) clT = A.clTrim + (sy / AXIS_MAX) * (clCeil - A.clTrim);
    else if (sy < 0) clT = A.clTrim + (sy / AXIS_MAX) * (A.clTrim - A.clMin);
    else {
      clT = clamp(A.clTrim - C.releaseGammaGain * (this.gamma - GAMMA_TRIM), A.clTrim - C.releaseClSpan, A.clTrim + C.releaseClSpan);
      // Coordinated turn: with no pitch input a bank adds the lift that keeps the path (one-thumb friendly).
      const cphi = cos(this.phi);
      clT /= cphi > 0.4 ? cphi : 0.4;
    }
    if (clT > clCeil) clT = clCeil;
    const tauC = sy === 0 ? C.tauRelease : C.tauCl;
    const kC = dt >= tauC ? 1 : dt / tauC;
    let cl = this.cl + (clT - this.cl) * kC;
    if (cl > clCeil) cl = clCeil;

    // --- load-factor limit (body g-limit) and path-angle hold (no wasted lift at the γ limits) ---
    const qS = HALF_RHO_S * V * V;
    const clN = (C.loadFactorMax * B.mass * G) / qS;
    if (cl > clN) cl = clN;
    sincos(this.gamma, sc);
    this.gammaSin = sc[0];
    const cg = sc[1];
    sincos(this.phi, sc);
    const sp = sc[0];
    const cp = sc[1];
    const mV = B.mass * V;
    const extraDown = ST.noseDownRate * stall + noseDownExtra;
    let gdot = (qS * cl * cp - B.mass * G * cg) / mV - extraDown;
    if ((this.gamma >= GAMMA_MAX && gdot > 0) || (this.gamma <= GAMMA_MIN && gdot < 0)) {
      // Lift exactly balancing gravity's normal component: the path stays on the limit, drag stays sane.
      cl = cp > 0.05 ? (B.mass * G * cg) / (qS * cp) : 0;
      gdot = -extraDown;
      if (this.gamma <= GAMMA_MIN && gdot < 0) gdot = 0;
    }
    this.cl = cl;
    gdot = clamp(gdot, -PITCH_RATE_MAX, PITCH_RATE_MAX);

    // --- forces ---
    // Soft speed ceiling c_v·max(0, V−58)² scaled by the dive attitude (−sinγ): full in a vertical dive (keeps the
    // 64 m/s ceiling), zero when level/climbing so speed carried out of a dive is not destroyed (see decisions).
    const over = V - A.cvOnset;
    const sgNow = this.gammaSin;
    const cvTerm = over > 0 && sgNow < 0 ? -sgNow * A.cv * over * over : 0;
    // Induced drag: steady-path lift CLs = W·cosγ/(qS) pays k; the excess lift that curves the path (pull-ups,
    // turns) pays only η·k ("zoom efficiency", 9.G-10). Steady glide polar (L/D)max = 4.6 is unchanged.
    const cls = (B.mass * G * cg) / qS;
    let ind: number;
    if (cl <= cls || cl <= 0) ind = A.k * cl * cl;
    else ind = A.k * (cls * cls + A.zoomEta * (cl * cl - cls * cls));
    const L = qS * cl;
    const D = qS * (A.cd0 + ind + cvTerm);
    this.lift = L;
    this.drag = D;
    const psidot = (L * sp) / (mV * cg);
    this.gamma = clamp(this.gamma + gdot * dt, GAMMA_MIN, GAMMA_MAX);
    this.psi = wrapPi(this.psi + psidot * dt);

    // --- position with the NEW direction (semi-implicit) ---
    sincos(this.gamma, sc);
    const sg2 = sc[0];
    const cg2 = sc[1];
    sincos(this.psi, sc);
    const vx = V * cg2 * sc[0] + wx;
    let vy = V * sg2 + wy;
    const vz = -V * cg2 * sc[1] + wz;
    const E = 0.5 * V * V + G * this.y;
    const y0 = this.y;
    this.x += vx * dt;
    this.y += vy * dt;
    this.z += vz * dt;

    // --- airspeed from the energy balance ---
    const E1 = E - ((D * V) / B.mass) * dt + G * wy * dt;
    const v2 = 2 * (E1 - G * this.y);
    if (v2 < V_MIN2) {
      // Energy-neutral floor: keep V = 25 m/s, pay the deficit with altitude (mushing stall).
      this.V = ST.vMin;
      this.y = (E1 - 0.5 * V_MIN2) / G;
      vy = (this.y - y0) / dt;
    } else {
      this.V = Math.sqrt(v2);
    }
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
  }

  /** Energy-neutral path rotation toward/away from a unit direction (used by assists, gate magnet, bounces). */
  rotateToward(tx: number, ty: number, tz: number, maxAngle: number): void {
    // Current air-relative direction.
    sincos(this.gamma, sc);
    const sg = sc[0];
    const cg = sc[1];
    sincos(this.psi, sc);
    const dx = cg * sc[0];
    const dy = sg;
    const dz = -cg * sc[1];
    const dt = dx * tx + dy * ty + dz * tz;
    // Angle between: atan2(|d×t|, d·t)
    const cx = dy * tz - dz * ty;
    const cy = dz * tx - dx * tz;
    const cz = dx * ty - dy * tx;
    const cl = Math.sqrt(cx * cx + cy * cy + cz * cz);
    const ang = atan2(cl, dt);
    if (ang < 1e-9) return;
    const f = ang <= maxAngle ? 1 : maxAngle / ang;
    // Slerp-ish: linear blend then renormalize (adequate for small steps, deterministic).
    let nx = dx + (tx - dx) * f;
    let ny = dy + (ty - dy) * f;
    let nz = dz + (tz - dz) * f;
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nl < 1e-9) return;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const h = Math.sqrt(nx * nx + nz * nz);
    this.gamma = clamp(atan2(ny, h), GAMMA_MIN, GAMMA_MAX);
    if (h > 1e-6) this.psi = atan2(nx, -nz);
  }
}

/** Steady-glide helpers for tests/tools. */
export function liftDrag(V: number, cl: number, out: Float64Array | number[]): void {
  const qS = HALF_RHO_S * V * V;
  const over = V - A.cvOnset;
  out[0] = qS * cl;
  out[1] = qS * (A.cd0 + A.k * cl * cl + (over > 0 ? A.cv * over * over : 0));
}
