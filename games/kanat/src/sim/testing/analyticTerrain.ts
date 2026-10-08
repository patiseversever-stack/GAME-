// Analytic test terrain (flight agent). A smooth, deterministic TerrainSampler with every feature the flight
// tests need: rolling hills, a meandering canyon with ~75° walls, a flat plain (< 8° slope) and a sea
// (H < 0 for x > ~2300). Used by unit tests, tests/jsc determinism runs and bots until/alongside real
// worlds. PURE (detMath only) → identical on V8 and JavaScriptCore.

import { atan, cos, RAD, sin, smooth01 } from '../math/detMath.ts';
import type { TerrainSampler } from '../terrain/types.ts';

export interface AnalyticTerrainOptions {
  /** Half size of the playable square (default 3800 m). */
  half?: number;
  /** Canyon depth (default 120 m). */
  canyonDepth?: number;
}

export const ANALYTIC = {
  plainX: -2000,
  plainZ: -2000,
  plainR: 650,
  plainH: 260,
  seaStartX: 1900,
  seaEndX: 2500,
  canyonFloorHalf: 22,
  canyonWall: 45,
} as const;

/** Canyon centerline x for a given z. */
export function canyonCenter(z: number): number {
  return 180 * sin(z * 0.0015 + 0.4);
}

export class AnalyticTerrain implements TerrainSampler {
  readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  readonly terrain = { hasSea: true };
  private readonly depth: number;

  constructor(opts: AnalyticTerrainOptions = {}) {
    const h = opts.half ?? 3800;
    this.bounds = { minX: -h, maxX: h, minZ: -h, maxZ: h };
    this.depth = opts.canyonDepth ?? 120;
  }

  height(x: number, z: number): number {
    // Rolling hills on a 300 m plateau.
    let h =
      300 +
      42 * sin(x * 0.0021 + 0.3) * cos(z * 0.0017 - 0.4) +
      14 * sin(x * 0.009 + z * 0.007) +
      5 * sin(x * 0.031) * cos(z * 0.027 + 1.1);
    // Meandering canyon with steep (smoothstep) walls.
    const dx = x - canyonCenter(z);
    const ax = dx < 0 ? -dx : dx;
    const t = smooth01((ax - ANALYTIC.canyonFloorHalf) / ANALYTIC.canyonWall);
    h -= this.depth * (1 - t);
    // Flat plain (blend toward a constant height).
    const px = x - ANALYTIC.plainX;
    const pz = z - ANALYTIC.plainZ;
    const pr = Math.sqrt(px * px + pz * pz);
    const pw = 1 - smooth01((pr - ANALYTIC.plainR) / 300);
    h = h + (ANALYTIC.plainH - h) * pw;
    // Sea to the east.
    const sw = smooth01((x - ANALYTIC.seaStartX) / (ANALYTIC.seaEndX - ANALYTIC.seaStartX));
    h = h + (-25 - h) * sw;
    return h;
  }

  baseHeight(x: number, z: number): number {
    return this.height(x, z);
  }

  normal(x: number, z: number, out: Float64Array | number[]): void {
    const e = 0.5;
    const hx = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e);
    const hz = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
    const inv = 1 / Math.sqrt(hx * hx + 1 + hz * hz);
    out[0] = -hx * inv;
    out[1] = inv;
    out[2] = -hz * inv;
  }

  slopeDeg(x: number, z: number): number {
    const e = 0.5;
    const hx = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e);
    const hz = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
    return atan(Math.sqrt(hx * hx + hz * hz)) * RAD;
  }
}

export function createAnalyticTerrain(opts?: AnalyticTerrainOptions): AnalyticTerrain {
  return new AnalyticTerrain(opts);
}
