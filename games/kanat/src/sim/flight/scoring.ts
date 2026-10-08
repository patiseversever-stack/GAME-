// Career scoring (brief §2.5 Mod 1, §4.G.6). Pure state machine fed once per tick by FlightSim.
//
//   per second: 100 × Ç(d) × (v / 150 km/h) × K
//   K = 1 + 0.15·⌊t_z / 2 s⌋ (cap 3); t_z = continuous time at d < 15 m; > 1.5 s at d ≥ 15 m or any contact breaks it
//   graze: no contact, d < 1.5 m, V > 140 km/h, local minimum of d → +250 × Ç, one per pass, 1 s per-object cooldown
//   gates: +500 (+100 per consecutive gate in the chain, bonus capped at +1000); gateMissed when the plane is crossed
//          outside the ring (within 4R) or a later gate is taken first
//   thermal entry: +100 (once per thermal per flight)
//   balloon thread: +750 × chain (×1.5 per thread within 4 s, cap ×3)
//   landing: ring 2/5/10 m → +1000/+500/+200, soft landing +300, brave opening (60–90 m AGL) +300;
//            Auto Parachute halves landing bonuses (§2.2).
// Points are accumulated in sim time, so they are device/frame-rate independent.

import { TUNING } from '../data/tuning.ts';
import type { RouteDef, RouteGate } from '../types.ts';
import { multiplier } from './proximity.ts';

const SC = TUNING.score;

/** Per-category totals for the results screen (all points, floats; UI rounds). */
export interface ScoreBreakdown {
  proximity: number;
  graze: number;
  gates: number;
  thermals: number;
  threads: number;
  landing: number;
  soft: number;
  brave: number;
}

export function newBreakdown(): ScoreBreakdown {
  return { proximity: 0, graze: 0, gates: 0, thermals: 0, threads: 0, landing: 0, soft: 0, brave: 0 };
}

/** Combo multiplier K for a continuous-proximity time t_z (s). */
export function comboK(tz: number): number {
  const k = 1 + SC.comboStep * Math.floor(tz / SC.comboStepSec);
  return k > SC.comboMax ? SC.comboMax : k;
}

/** Proximity points per second for body distance d, speed v (m/s), combo K, flat-surface flag. */
export function proximityRate(d: number, flat: boolean, v: number, k: number): number {
  return SC.base * multiplier(d, flat) * (v / SC.refSpeed) * k;
}

/** Landing ring points for a horizontal distance to the target (before soft/brave/auto factors). */
export function landingRingPoints(dist: number): number {
  const r = SC.landingRings;
  const p = SC.landingPoints;
  for (let i = 0; i < r.length; i++) if (dist <= r[i]) return p[i];
  return 0;
}

/**
 * Stars for a finished Career flight (§2.5): ⭐ = parachute landing inside the landing zone;
 * ⭐⭐ / ⭐⭐⭐ = score ≥ route.stars[1] / route.stars[2]. Half flights and crashes get 0.
 */
export function starsFor(route: RouteDef, score: number, landedInZone: boolean, halfFlight: boolean): 0 | 1 | 2 | 3 {
  if (!landedInZone || halfFlight) return 0;
  let s: 0 | 1 | 2 | 3 = 1;
  if (score >= route.stars[1]) s = 2;
  if (s === 2 && score >= route.stars[2]) s = 3;
  return s;
}

/** Gate crossing test on the segment a→b. Returns the lateral distance at the plane crossing, or -1. */
export function gateCrossing(g: RouteGate, ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const nx = g.normal[0];
  const ny = g.normal[1];
  const nz = g.normal[2];
  const s0 = (ax - g.pos[0]) * nx + (ay - g.pos[1]) * ny + (az - g.pos[2]) * nz;
  const s1 = (bx - g.pos[0]) * nx + (by - g.pos[1]) * ny + (bz - g.pos[2]) * nz;
  if (!(s0 < 0 && s1 >= 0)) return -1;
  const t = s0 / (s0 - s1);
  const cx = ax + (bx - ax) * t - g.pos[0];
  const cy = ay + (by - ay) * t - g.pos[1];
  const cz = az + (bz - az) * t - g.pos[2];
  // lateral distance within the plane (remove any residual normal component)
  const dn = cx * nx + cy * ny + cz * nz;
  const lx = cx - dn * nx;
  const ly = cy - dn * ny;
  const lz = cz - dn * nz;
  return Math.sqrt(lx * lx + ly * ly + lz * lz);
}

/** Mutable scoring state (plain numeric fields → trivially snapshot/restored). */
export class ScoreState {
  score = 0;
  tz = 0; // continuous proximity time (s)
  outside = 0; // time at d ≥ 15 since the last proximity (s)
  combo = 1;
  announcedMult = 0;
  lowerFor = 0; // time the multiplier has been below the announced one
  // graze pass tracking
  grazeActive = 0; // 1 while inside a pass (d < grazeRearmD after dipping below grazeD)
  grazeMin = Infinity;
  grazeFired = 0;
  grazeMinPropId = -1;
  grazeMinMult = 0;
  grazeMinX = 0;
  grazeMinY = 0;
  grazeMinZ = 0;
  grazeMinSide = 1;
  grazeMinCls = 0; // index into CLS_LIST
  grazeContact = 0;
  grazeSpeed = 0;
  // gates
  gateIndex = 0;
  gateChain = 0;
  gatesPassed = 0;
  gatesMissed = 0;
  // thermals
  inThermal = -1;
  thermalRewarded = 0; // bitmask (≤ 31 thermals)
  // balloon threads
  threadChain = 1;
  lastThreadTime = -1e9;
  threadCount = 0;
  grazeCount = 0;
}
