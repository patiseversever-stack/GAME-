// Parachute / canopy flight (brief §2.2 Paraşüt, §2.9 FTUE, §2.5 landing bonuses). Pure, allocation-free.
//
// Deploy only inside the landing zone (≈250 m radius cylinder around the target) unless Free Flight.
// Opening takes 1.2 s: forward speed and sink blend from the wingsuit state toward canopy values (τ 0.35 s),
// steering authority ramps in. Canopy: horizontal drag (sx) turns ≤ 35°/s; brake/flare (flare command or a
// downward drag) slows forward speed and sink; a flare additionally spends stored "flare energy" for a short
// sink cut (the soft-landing move: flare within 3 m of the ground).

import { TUNING } from '../data/tuning.ts';
import { clamp, cos, DEG, sin, wrapPi } from '../math/detMath.ts';

const CP = TUNING.canopy;

export class CanopyState {
  active = 0;
  openT = 0; // seconds since deploy
  x = 0;
  y = 0;
  z = 0;
  psi = 0;
  vf = 0; // forward air speed (m/s)
  vs = 0; // sink speed (m/s, positive down)
  brake = 0; // 0..1 (smoothed)
  flareCharge = 1;
  flaredLow = 0; // 1 once a brake ≥ 0.5 was applied at AGL ≤ 3 m
  auto = 0; // opened automatically (Auto Parachute / emergency)
  half = 0; // emergency chute → half flight
  openAGL = 0;
  // ground velocity (derived)
  vx = 0;
  vy = 0;
  vz = 0;

  /** Start the canopy from the wingsuit air state. */
  deploy(x: number, y: number, z: number, psi: number, V: number, gammaSin: number, gammaCos: number, agl: number, auto: boolean, half: boolean): void {
    this.active = 1;
    this.openT = 0;
    this.x = x;
    this.y = y;
    this.z = z;
    this.psi = psi;
    this.vf = V * gammaCos;
    this.vs = -V * gammaSin;
    this.brake = 0;
    this.flareCharge = 1;
    this.flaredLow = 0;
    this.auto = auto ? 1 : 0;
    this.half = half ? 1 : 0;
    this.openAGL = agl;
  }

  /**
   * One substep. sx ∈ [−31, 31] steering, brakeIn ∈ [0, 1], (wx, wz) horizontal wind, wy vertical air.
   */
  step(dt: number, sx: number, brakeIn: number, wx: number, wy: number, wz: number, agl: number): void {
    this.openT += dt;
    const opening = this.openT < CP.openSec;
    const authority = opening ? this.openT / CP.openSec : 1;
    // smoothed brake
    const kb = dt / 0.15 > 1 ? 1 : dt / 0.15;
    this.brake += (clamp(brakeIn, 0, 1) - this.brake) * kb;
    const b = this.brake * authority;
    // flare energy
    if (b > 0.05) this.flareCharge -= CP.flareChargeDrain * b * dt;
    else this.flareCharge += CP.flareChargeRefill * dt;
    this.flareCharge = clamp(this.flareCharge, 0, 1);
    if (agl <= TUNING.score.softLandingFlareAGL && this.brake >= 0.5) this.flaredLow = 1;
    // targets
    const vfT = CP.forwardSpeed + (CP.brakeForwardSpeed - CP.forwardSpeed) * b;
    let vsT = CP.sinkSpeed + (CP.brakeSinkSpeed - CP.sinkSpeed) * b - CP.flareSinkCut * this.flareCharge * b;
    if (vsT < 0) vsT = 0;
    const tau = opening ? CP.openTau : 0.25;
    const k = dt / tau > 1 ? 1 : dt / tau;
    this.vf += (vfT - this.vf) * k;
    this.vs += (vsT - this.vs) * k;
    // steering
    const turn = (sx / 31) * CP.turnRateMaxDeg * DEG * authority;
    this.psi = wrapPi(this.psi + turn * dt);
    const s = sin(this.psi);
    const c = cos(this.psi);
    this.vx = this.vf * s + wx;
    this.vz = -this.vf * c + wz;
    this.vy = -this.vs + wy;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
  }
}
