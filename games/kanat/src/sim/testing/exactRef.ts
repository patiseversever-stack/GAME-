// Brute-force reference distances for tests (9.G-5, 9.G-6). Slow on purpose: independent of the fast query.
// Terrain: dense grid search + local refinement of |p − (u, H(u,v), v)|. Ellipsoid: exact (Lagrange root by
// bisection). Other primitives: exact SDFs.

import type { TerrainSampler } from '../terrain/types.ts';
import type { BalloonDef } from '../types.ts';
import { TUNING } from '../data/tuning.ts';
import { PRIM_ELLIPSOID, type PropIndex } from '../world/propIndex.ts';
import { sdBox } from '../world/sdf.ts';

/** Exact signed distance from p to an axis-aligned ellipsoid (center c, semi-axes a). */
export function exactEllipsoid(px: number, py: number, pz: number, cx: number, cy: number, cz: number, ax: number, ay: number, az: number): number {
  const x = Math.abs(px - cx);
  const y = Math.abs(py - cy);
  const z = Math.abs(pz - cz);
  const q = (x / ax) * (x / ax) + (y / ay) * (y / ay) + (z / az) * (z / az);
  const inside = q < 1;
  const amin = Math.min(ax, ay, az);
  // F(t) = Σ (a_i p_i / (a_i² + t))² − 1, decreasing for t > −amin²
  const F = (t: number) => {
    const u = (ax * x) / (ax * ax + t);
    const v = (ay * y) / (ay * ay + t);
    const w = (az * z) / (az * az + t);
    return u * u + v * v + w * w - 1;
  };
  let lo: number;
  let hi: number;
  if (inside) {
    lo = -amin * amin + 1e-12;
    hi = 0;
  } else {
    lo = 0;
    hi = Math.max(ax, ay, az) * Math.sqrt(x * x + y * y + z * z) + 1;
  }
  for (let i = 0; i < 200; i++) {
    const m = 0.5 * (lo + hi);
    if (F(m) > 0) lo = m;
    else hi = m;
  }
  const t = 0.5 * (lo + hi);
  const ex = (ax * ax * x) / (ax * ax + t);
  const ey = (ay * ay * y) / (ay * ay + t);
  const ez = (az * az * z) / (az * az + t);
  const d = Math.sqrt((x - ex) * (x - ex) + (y - ey) * (y - ey) + (z - ez) * (z - ez));
  if (inside) {
    // degenerate: point on an axis inside → the bisection may not resolve; fall back to the min semi-axis gap
    const alt = Math.min(ax - x, ay - y, az - z);
    return -Math.min(d, alt > 0 ? alt : d);
  }
  return d;
}

/** Exact terrain distance (positive above, negative below) by dense search within radius R + refinement. */
export function exactTerrain(s: TerrainSampler, x: number, y: number, z: number, R: number, step = 0.5): number {
  let best = Infinity;
  let bu = x;
  let bv = z;
  for (let v = -R; v <= R + 1e-9; v += step) {
    for (let u = -R; u <= R + 1e-9; u += step) {
      const dxz = u * u + v * v;
      if (dxz >= best * best) continue;
      const h = s.height(x + u, z + v);
      const dy = y - h;
      const d = Math.sqrt(dxz + dy * dy);
      if (d < best) {
        best = d;
        bu = x + u;
        bv = z + v;
      }
    }
  }
  let st = step;
  for (let it = 0; it < 8; it++) {
    const cu = bu;
    const cv = bv;
    for (let j = -3; j <= 3; j++) {
      for (let i = -3; i <= 3; i++) {
        const u = cu + (i * st) / 3;
        const v = cv + (j * st) / 3;
        const h = s.height(u, v);
        const d = Math.sqrt((x - u) * (x - u) + (y - h) * (y - h) + (z - v) * (z - v));
        if (d < best) {
          best = d;
          bu = u;
          bv = v;
        }
      }
    }
    st *= 0.5;
  }
  return y < s.height(x, z) ? -best : best;
}

/** Exact distance to the nearest static prop primitive (all primitives, ellipsoids solved exactly). */
export function exactProps(index: PropIndex, x: number, y: number, z: number): number {
  let best = Infinity;
  const STRIDE = 16;
  for (let i = 0; i < index.count; i++) {
    const o = i * STRIDE;
    const d = index.data;
    // bounding-sphere cull (exact SDFs are ≥ |p − c| − r)
    const bx = x - d[o + 12];
    const by = y - d[o + 13];
    const bz = z - d[o + 14];
    if (Math.sqrt(bx * bx + by * by + bz * bz) - d[o + 15] >= best) continue;
    let s: number;
    if (index.kind[i] === PRIM_ELLIPSOID) s = exactEllipsoid(x, y, z, d[o], d[o + 1], d[o + 2], d[o + 3], d[o + 4], d[o + 5]);
    else s = index.sdf(i, x, y, z);
    if (s < best) best = s;
  }
  return best;
}

/** Exact distance to balloon `b` whose envelope center is (cx, cy, cz). */
export function exactBalloon(b: BalloonDef, cx: number, cy: number, cz: number, x: number, y: number, z: number): number {
  const e = exactEllipsoid(x, y, z, cx, cy, cz, b.envelopeR, b.envelopeH * 0.5, b.envelopeR);
  const BH = TUNING.balloon.basketHalf;
  const k = sdBox(x, y, z, cx, cy - b.envelopeH * 0.5 - TUNING.balloon.basketBelow, cz, BH[0], BH[1], BH[2], 1, 0, 0.1);
  return Math.min(e, k);
}
