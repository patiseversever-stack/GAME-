// Fit visual parameters to collision primitives so that render == collision within ±0.4 m (brief §4.G.4).
import type { PropInstance, PropPrimitive } from '../../sim/types.ts';

/** Horizontal radius of a primitive's cross-section at height y around the vertical axis through (ax, az). */
export function primRadiusAt(p: PropPrimitive, y: number, ax: number, az: number): number {
  switch (p.kind) {
    case 'cone': {
      const t = (y - p.base[1]) / Math.max(1e-6, p.h);
      if (t < -1e-4 || t > 1 + 1e-4) return -1;
      const r = p.r0 + (p.r1 - p.r0) * Math.min(1, Math.max(0, t));
      return r + Math.hypot(p.base[0] - ax, p.base[2] - az);
    }
    case 'ellipsoid': {
      const dy = (y - p.c[1]) / Math.max(1e-6, p.r[1]);
      if (dy < -1 || dy > 1) return -1;
      const s = Math.sqrt(Math.max(0, 1 - dy * dy));
      return Math.max(p.r[0], p.r[2]) * s + Math.hypot(p.c[0] - ax, p.c[2] - az);
    }
    case 'capsule': {
      // closest point on the segment to the horizontal plane at y (segment param by y)
      const ay = p.a[1], by = p.b[1];
      const lo = Math.min(ay, by) - p.r, hi = Math.max(ay, by) + p.r;
      if (y < lo || y > hi) return -1;
      let t = Math.abs(by - ay) > 1e-6 ? (y - ay) / (by - ay) : 0.5;
      t = Math.min(1, Math.max(0, t));
      const cx = p.a[0] + (p.b[0] - p.a[0]) * t, cy = ay + (by - ay) * t, cz = p.a[2] + (p.b[2] - p.a[2]) * t;
      const dy = y - cy;
      const rr = Math.sqrt(Math.max(0, p.r * p.r - dy * dy));
      return rr + Math.hypot(cx - ax, cz - az);
    }
    case 'box': {
      if (y < p.c[1] - p.h[1] || y > p.c[1] + p.h[1]) return -1;
      return Math.hypot(p.h[0], p.h[2]) + Math.hypot(p.c[0] - ax, p.c[2] - az);
    }
  }
}

export function primYRange(p: PropPrimitive): [number, number] {
  switch (p.kind) {
    case 'cone': return [p.base[1], p.base[1] + p.h];
    case 'ellipsoid': return [p.c[1] - p.r[1], p.c[1] + p.r[1]];
    case 'capsule': return [Math.min(p.a[1], p.b[1]) - p.r, Math.max(p.a[1], p.b[1]) + p.r];
    case 'box': return [p.c[1] - p.h[1], p.c[1] + p.h[1]];
  }
}

export function primsBoundingSphere(prims: PropPrimitive[], fallback: [number, number, number], out: Float64Array): void {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const add = (x: number, y: number, z: number, r: number): void => {
    minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r);
    minZ = Math.min(minZ, z - r); maxZ = Math.max(maxZ, z + r);
  };
  for (const p of prims) {
    if (p.kind === 'cone') { const r = Math.max(p.r0, p.r1); add(p.base[0], p.base[1], p.base[2], r); add(p.base[0], p.base[1] + p.h, p.base[2], r); }
    else if (p.kind === 'ellipsoid') { const r = Math.max(p.r[0], p.r[1], p.r[2]); add(p.c[0], p.c[1], p.c[2], r); }
    else if (p.kind === 'capsule') { add(p.a[0], p.a[1], p.a[2], p.r); add(p.b[0], p.b[1], p.b[2], p.r); }
    else { const r = Math.hypot(p.h[0], p.h[1], p.h[2]); add(p.c[0], p.c[1], p.c[2], r); }
  }
  if (!isFinite(minX)) { out[0] = fallback[0]; out[1] = fallback[1]; out[2] = fallback[2]; out[3] = 5; return; }
  out[0] = (minX + maxX) / 2; out[1] = (minY + maxY) / 2; out[2] = (minZ + maxZ) / 2;
  out[3] = 0.5 * Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
}

export interface LatheFit {
  /** Axis base (world). */
  x: number; y: number; z: number;
  /** Height of the body (m). */
  h: number;
  /** 8 radius samples from base (t=0) to top (t=1). */
  radii: number[];
  /** Cap primitive split off from the body (if the instance carries its own cap). */
  cap: PropPrimitive | null;
}

const CAP_KINDS = new Set(['ellipsoid']);

/**
 * Sample the union-of-primitives radius profile of a vertical lathe prop (chimney, column, lighthouse).
 * A top ellipsoid is treated as a separate cap (basalt hat) when `splitCap` is set.
 */
export function fitLathe(inst: PropInstance, splitCap: boolean, samples = 8): LatheFit {
  const ax = inst.pos[0], az = inst.pos[2];
  let prims = inst.prims;
  let cap: PropPrimitive | null = null;
  if (splitCap && prims.length > 1) {
    // highest ellipsoid (or cone sitting on top that is much wider than the body top) = cap
    let best = -1, bestY = -Infinity;
    for (let i = 0; i < prims.length; i++) {
      const p = prims[i];
      const top = primYRange(p)[1];
      if (CAP_KINDS.has(p.kind) && top > bestY) { bestY = top; best = i; }
    }
    if (best >= 0) {
      let maxTop = -Infinity;
      for (const p of prims) maxTop = Math.max(maxTop, primYRange(p)[1]);
      if (bestY >= maxTop - 0.5) {
        cap = prims[best];
        prims = prims.filter((_, i) => i !== best);
      }
    }
  }
  let y0 = Infinity, y1 = -Infinity;
  for (const p of prims) { const [a, b] = primYRange(p); y0 = Math.min(y0, a); y1 = Math.max(y1, b); }
  if (!isFinite(y0)) { y0 = inst.pos[1]; y1 = inst.pos[1] + 10 * inst.scale; }
  const base = Math.max(y0, inst.pos[1] - 0.5);
  const h = Math.max(1, y1 - base);
  const radii: number[] = [];
  for (let k = 0; k < samples; k++) {
    // sample slightly inside the ends so the end caps of cones are included
    const t = k / (samples - 1);
    const y = base + h * (0.002 + t * 0.996);
    let r = -1;
    for (const p of prims) r = Math.max(r, primRadiusAt(p, y, ax, az));
    radii.push(r);
  }
  // fill gaps
  for (let k = 0; k < samples; k++) {
    if (radii[k] >= 0) continue;
    let a = k - 1, b = k + 1;
    while (a >= 0 && radii[a] < 0) a--;
    while (b < samples && radii[b] < 0) b++;
    const ra = a >= 0 ? radii[a] : (b < samples ? radii[b] : 1);
    const rb = b < samples ? radii[b] : ra;
    radii[k] = a >= 0 && b < samples ? ra + (rb - ra) * (k - a) / (b - a) : (a >= 0 ? ra : rb);
  }
  return { x: ax, y: base, z: az, h, radii, cap };
}

/** Max deviation (m) between the fitted piecewise-linear profile and the primitive union, sampled densely. */
export function latheFitError(inst: PropInstance, fit: LatheFit): number {
  let err = 0;
  const prims = fit.cap ? inst.prims.filter((p) => p !== fit.cap) : inst.prims;
  const n = fit.radii.length;
  for (let s = 1; s < 63; s++) {
    const t = s / 63;
    const y = fit.y + fit.h * t;
    let r = -1;
    for (const p of prims) r = Math.max(r, primRadiusAt(p, y, fit.x, fit.z));
    if (r < 0) continue;
    const tt = t * (n - 1);
    const k = Math.min(n - 2, Math.floor(tt));
    const rv = fit.radii[k] + (fit.radii[k + 1] - fit.radii[k]) * (tt - k);
    err = Math.max(err, Math.abs(rv - r));
  }
  return err;
}
