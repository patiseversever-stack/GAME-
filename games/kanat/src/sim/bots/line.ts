// Route line sampler for bots and route tooling (owner: routes agent). PURE, detMath-free (only + − × ÷ √).
//
// RouteDef.line is a centripetal Catmull-Rom control polyline (30–80 points). Bots need a dense, smooth version
// with arc length and the obstacle envelope under it, so the polyline is re-evaluated with the centripetal CR
// formula (α = 0.5, Barry–Goldman pyramid) into ~5 m samples once at construction. Everything is typed arrays.

import type { ObstacleField } from './obstacles.ts';
import { terrainTop } from './obstacles.ts';
import type { TerrainSampler } from '../terrain/types.ts';

export const LINE_STEP = 5;

/** Centripetal Catmull-Rom (α = 0.5) through `pts`, sampled every ~`step` m of 3D arc length. Returns flat xyz. */
export function catmullRomCentripetal(pts: readonly (readonly number[])[], step: number): Float64Array {
  const n = pts.length;
  if (n === 0) return new Float64Array(0);
  if (n === 1) return new Float64Array([pts[0][0], pts[0][1], pts[0][2]]);
  const out: number[] = [pts[0][0], pts[0][1], pts[0][2]];
  const P = (i: number, k: number): number => {
    if (i < 0) return 2 * pts[0][k] - pts[1][k];
    if (i >= n) return 2 * pts[n - 1][k] - pts[n - 2][k];
    return pts[i][k];
  };
  const knot = (i: number, j: number): number => {
    const dx = P(j, 0) - P(i, 0);
    const dy = P(j, 1) - P(i, 1);
    const dz = P(j, 2) - P(i, 2);
    const d = Math.sqrt(Math.sqrt(dx * dx + dy * dy + dz * dz));
    return d > 1e-6 ? d : 1e-6;
  };
  for (let i = 0; i < n - 1; i++) {
    const t0 = 0;
    const t1 = t0 + knot(i - 1, i);
    const t2 = t1 + knot(i, i + 1);
    const t3 = t2 + knot(i + 1, i + 2);
    const dx = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    const dz = pts[i + 1][2] - pts[i][2];
    const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const m = Math.max(1, Math.ceil(segLen / step));
    for (let s = 1; s <= m; s++) {
      const t = t1 + ((t2 - t1) * s) / m;
      for (let k = 0; k < 3; k++) {
        const p0 = P(i - 1, k);
        const p1 = P(i, k);
        const p2 = P(i + 1, k);
        const p3 = P(i + 2, k);
        const a1 = ((t1 - t) / (t1 - t0)) * p0 + ((t - t0) / (t1 - t0)) * p1;
        const a2 = ((t2 - t) / (t2 - t1)) * p1 + ((t - t1) / (t2 - t1)) * p2;
        const a3 = ((t3 - t) / (t3 - t2)) * p2 + ((t - t2) / (t3 - t2)) * p3;
        const b1 = ((t2 - t) / (t2 - t0)) * a1 + ((t - t0) / (t2 - t0)) * a2;
        const b2 = ((t3 - t) / (t3 - t1)) * a2 + ((t - t1) / (t3 - t1)) * a3;
        out.push(((t2 - t) / (t2 - t1)) * b1 + ((t - t1) / (t2 - t1)) * b2);
      }
    }
  }
  return new Float64Array(out);
}

/** Dense route line: positions, horizontal arc length, unit horizontal tangent, obstacle envelope under it. */
export class DenseLine {
  readonly n: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  /** Cumulative horizontal arc length (m). */
  readonly s: Float64Array;
  readonly tx: Float64Array;
  readonly tz: Float64Array;
  /** Highest surface (terrain/sea/prop top) within ±`envHalfWidth` m across the line at each sample. */
  readonly env: Float64Array;
  readonly length: number;

  constructor(points: readonly (readonly number[])[], sampler: TerrainSampler, obstacles: ObstacleField | null, hasSea: boolean, envHalfWidth = 7) {
    const flat = catmullRomCentripetal(points, LINE_STEP);
    const n = flat.length / 3;
    this.n = n;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.z = new Float64Array(n);
    this.s = new Float64Array(n);
    this.tx = new Float64Array(n);
    this.tz = new Float64Array(n);
    this.env = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      this.x[i] = flat[i * 3];
      this.y[i] = flat[i * 3 + 1];
      this.z[i] = flat[i * 3 + 2];
      if (i > 0) {
        const dx = this.x[i] - this.x[i - 1];
        const dz = this.z[i] - this.z[i - 1];
        this.s[i] = this.s[i - 1] + Math.sqrt(dx * dx + dz * dz);
      }
    }
    this.length = n > 0 ? this.s[n - 1] : 0;
    for (let i = 0; i < n; i++) {
      const a = i > 0 ? i - 1 : 0;
      const b = i < n - 1 ? i + 1 : n - 1;
      let dx = this.x[b] - this.x[a];
      let dz = this.z[b] - this.z[a];
      const l = Math.sqrt(dx * dx + dz * dz);
      if (l > 1e-9) {
        dx /= l;
        dz /= l;
      } else {
        dx = 0;
        dz = -1;
      }
      this.tx[i] = dx;
      this.tz[i] = dz;
      // envelope: centre + both sides at half and full width
      let e = -1e9;
      for (let k = -2; k <= 2; k++) {
        const o = (k * envHalfWidth) / 2;
        const px = this.x[i] - dz * o;
        const pz = this.z[i] + dx * o;
        const h = obstacles ? obstacles.surfaceTop(px, pz) : terrainTop(sampler, hasSea, px, pz);
        if (h > e) e = h;
      }
      this.env[i] = e;
    }
  }

  /** Index of the sample at (or just before) arc length s. */
  indexAt(s: number, hint = 0): number {
    const n = this.n;
    if (n === 0) return 0;
    let i = hint < 0 ? 0 : hint > n - 1 ? n - 1 : hint;
    while (i < n - 1 && this.s[i + 1] <= s) i++;
    while (i > 0 && this.s[i] > s) i--;
    return i;
  }

  /** Linear interpolation of an array at arc length s. */
  at(arr: Float64Array, s: number, hint = 0): number {
    const i = this.indexAt(s, hint);
    if (i >= this.n - 1) return arr[this.n - 1];
    const span = this.s[i + 1] - this.s[i];
    const t = span > 1e-9 ? (s - this.s[i]) / span : 0;
    const tt = t < 0 ? 0 : t > 1 ? 1 : t;
    return arr[i] + (arr[i + 1] - arr[i]) * tt;
  }

  /**
   * Nearest sample to (x, z) searching around `hint` (−back … +fwd samples). Writes [index, along, lateral]
   * into out; lateral > 0 = right of the line direction. Returns the arc length of the projection.
   */
  project(x: number, z: number, hint: number, back: number, fwd: number, out: Float64Array): number {
    const n = this.n;
    let i0 = hint - back;
    let i1 = hint + fwd;
    if (i0 < 0) i0 = 0;
    if (i1 > n - 2) i1 = n - 2;
    let best = Infinity;
    let bi = i0;
    let bt = 0;
    for (let i = i0; i <= i1; i++) {
      const ex = this.x[i + 1] - this.x[i];
      const ez = this.z[i + 1] - this.z[i];
      const l2 = ex * ex + ez * ez;
      let t = l2 > 1e-9 ? ((x - this.x[i]) * ex + (z - this.z[i]) * ez) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = this.x[i] + ex * t - x;
      const pz = this.z[i] + ez * t - z;
      const d = px * px + pz * pz;
      if (d < best) {
        best = d;
        bi = i;
        bt = t;
      }
    }
    if (n < 2) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      return 0;
    }
    const s = this.s[bi] + (this.s[bi + 1] - this.s[bi]) * bt;
    const lx = x - (this.x[bi] + (this.x[bi + 1] - this.x[bi]) * bt);
    const lz = z - (this.z[bi] + (this.z[bi + 1] - this.z[bi]) * bt);
    // right of direction (tx, tz) is (−tz, tx) in x/z (heading ψ clockwise from −z)
    out[0] = bi;
    out[1] = s;
    out[2] = -lx * this.tz[bi] + lz * this.tx[bi];
    return s;
  }
}
