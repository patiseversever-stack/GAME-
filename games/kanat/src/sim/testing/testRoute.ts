// Test fixtures for the flight sim (flight agent): a route over the analytic terrain and a simple PD autopilot
// that turns a target into quantized 30 Hz 'axis' commands. Used by unit tests, the JSC determinism script and
// as a reference "careful bot" until the real route data and bots exist. PURE.

import { atan2, clamp, cos, DEG, sin, wrapPi } from '../math/detMath.ts';
import type { TerrainSampler } from '../terrain/types.ts';
import type { Command, FlightState, RouteDef, RouteGate } from '../types.ts';
import { canyonCenter } from './analyticTerrain.ts';

/** Canyon route over AnalyticTerrain: start high above the canyon mouth, 5 gates down the canyon, landing on the rim. */
export function makeCanyonRoute(s: TerrainSampler): RouteDef {
  const startZ = -2400;
  const sx = canyonCenter(startZ);
  const gates: RouteGate[] = [];
  const gz = [-2050, -1750, -1450, -1150, -850];
  for (let i = 0; i < gz.length; i++) {
    const z = gz[i];
    const x = canyonCenter(z);
    // gate height: on a 4.5:1 glide from the start, but never closer than 12 m to the floor
    const glideY = 640 - (z - startZ) / 4.4;
    const floor = s.height(x, z);
    const y = Math.max(glideY, floor + 14);
    // normal ≈ local canyon direction (+z with the meander slope)
    const dxdz = (canyonCenter(z + 5) - canyonCenter(z - 5)) / 10;
    const l = Math.sqrt(1 + dxdz * dxdz);
    gates.push({ t: i / gz.length, pos: [x, y, z], normal: [dxdz / l, 0, 1 / l], radius: 14, kind: i === gz.length - 1 ? 'final' : 'normal' });
  }
  const lz = -300;
  const lx = canyonCenter(lz) + 160;
  const line: [number, number, number][] = [[sx, 640, startZ]];
  for (let i = 0; i < gates.length; i++) line.push([gates[i].pos[0], gates[i].pos[1], gates[i].pos[2]]);
  line.push([lx, s.height(lx, lz) + 40, lz]);
  return {
    id: 'test-canyon',
    world: 'kapadokya',
    index: 1,
    difficulty: 1,
    name: { tr: 'Test Kanyonu', en: 'Test Canyon' },
    start: { type: 'balon', pos: [sx, 640, startZ], headingDeg: 180, speedKmh: 150 },
    line,
    gates,
    thermals: [{ pos: [sx + 260, startZ + 500], radius: 45, w0: 6, top: 760 }],
    landing: { center: [lx, s.height(lx, lz), lz], radius: 25, zoneRadius: 250 },
    wind: { dirDeg: 270, speed: 3 },
    stars: [0, 3000, 6000],
    expertScore: 7000,
    ustaGorevleri: [],
    postcards: [],
  };
}

/**
 * Minimal PD autopilot: steers toward `target` (heading via bank, path angle via pitch) and writes one 'axis'
 * command every other tick (30 Hz, like the touch input). Allocation-free after construction.
 */
export class Autopilot {
  readonly cmd: Command = { tick: 0, actorId: 0, cmd: 'axis', args: [0, 0] };
  readonly list: Command[] = [];
  target: [number, number, number] = [0, 0, 0];
  /** Desired clearance above terrain when following the line (m). */
  clearance = 30;
  gain = 1;

  constructor(actorId = 0) {
    this.cmd.actorId = actorId;
  }

  /** Commands for the sim's next tick (empty on odd ticks: 30 Hz sampling). */
  commands(st: FlightState): Command[] {
    this.list.length = 0;
    if ((st.tick & 1) === 1 || st.phase !== 'flying') return this.list;
    const dx = this.target[0] - st.pos[0];
    const dz = this.target[2] - st.pos[2];
    const want = atan2(dx, -dz);
    const err = wrapPi(want - st.psi);
    const sx = clamp(Math.round((err / (40 * DEG)) * 31 * this.gain), -31, 31) | 0;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const wantGamma = atan2(this.target[1] - st.pos[1], dist > 1 ? dist : 1);
    const gErr = wantGamma - st.gamma;
    const sy = clamp(Math.round((gErr / (12 * DEG)) * 31), -31, 31) | 0;
    this.cmd.tick = st.tick;
    this.cmd.args[0] = sx;
    this.cmd.args[1] = sy;
    this.list.push(this.cmd);
    return this.list;
  }
}

/** Deterministic pseudo-random stick stream (xorshift on the tick) for fuzz/determinism runs. */
export function noiseAxis(seed: number, tick: number, out: number[]): void {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(tick >> 4, 0x85ebca6b)) | 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  out[0] = ((h & 63) - 31) | 0;
  out[1] = (((h >>> 6) & 63) - 31) | 0;
  if (out[0] > 31) out[0] = 31;
  if (out[1] > 31) out[1] = 31;
}

export function headingVector(psi: number, out: number[]): void {
  out[0] = sin(psi);
  out[1] = -cos(psi);
}
