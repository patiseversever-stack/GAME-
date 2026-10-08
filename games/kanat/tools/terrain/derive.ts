// Derived terrain fields for the bake: normals, slope, curvature, AO, sun shadow, drainage, coast distance.

import { blur, type Grid, sampleBilinear } from './grid.ts';

export type HeightFn = (x: number, z: number) => number;

/** Core-inside / far-outside bilinear height function (used for shadow/AO rays that leave the core). */
export function combinedHeight(core: Grid, far: Grid): HeightFn {
  const cmax = core.originX + (core.res - 1) * core.spacing;
  const cmaxZ = core.originZ + (core.res - 1) * core.spacing;
  return (x, z) => {
    if (x >= core.originX && x <= cmax && z >= core.originZ && z <= cmaxZ) return sampleBilinear(core, x, z);
    return sampleBilinear(far, x, z);
  };
}

/** Central-difference normals (y up). Returns interleaved xyz. */
export function computeNormals(g: Grid): Float32Array {
  const { res, spacing, data } = g;
  const out = new Float32Array(res * res * 3);
  for (let r = 0; r < res; r++) {
    const r0 = Math.max(0, r - 1);
    const r1 = Math.min(res - 1, r + 1);
    for (let c = 0; c < res; c++) {
      const c0 = Math.max(0, c - 1);
      const c1 = Math.min(res - 1, c + 1);
      const hx = (data[r * res + c1] - data[r * res + c0]) / ((c1 - c0) * spacing);
      const hz = (data[r1 * res + c] - data[r0 * res + c]) / ((r1 - r0) * spacing);
      const inv = 1 / Math.sqrt(hx * hx + 1 + hz * hz);
      const i = (r * res + c) * 3;
      out[i] = -hx * inv;
      out[i + 1] = inv;
      out[i + 2] = -hz * inv;
    }
  }
  return out;
}

export function slopeFromNormals(n: Float32Array): Float32Array {
  const out = new Float32Array(n.length / 3);
  for (let i = 0; i < out.length; i++) out[i] = (Math.acos(Math.min(1, n[i * 3 + 1])) * 180) / Math.PI;
  return out;
}

/** Convexity: h - blur(h, radius). >0 ridges/convex, <0 valleys/concave (meters). */
export function convexity(g: Grid, radius: number): Float32Array {
  const b = blur(g.data, g.res, radius, 2);
  const out = new Float32Array(g.data.length);
  for (let i = 0; i < out.length; i++) out[i] = g.data[i] - b[i];
  return out;
}

/**
 * Horizon-based ambient occlusion on grid g (rays can leave g via hFn).
 * Returns 0..1 (1 = open sky). dirs directions, steps geometric from spacing to maxDist.
 */
export function horizonAO(g: Grid, hFn: HeightFn, dirs: number, steps: number, maxDist: number): Float32Array {
  const { res, spacing, originX, originZ, data } = g;
  const out = new Float32Array(res * res);
  const ts: number[] = [];
  const growth = Math.pow(maxDist / spacing, 1 / (steps - 1));
  for (let k = 0; k < steps; k++) ts.push(spacing * Math.pow(growth, k));
  const dx: number[] = [];
  const dz: number[] = [];
  for (let d = 0; d < dirs; d++) {
    const a = ((d + 0.5) / dirs) * Math.PI * 2;
    dx.push(Math.sin(a));
    dz.push(-Math.cos(a));
  }
  for (let r = 0; r < res; r++) {
    const z = originZ + r * spacing;
    for (let c = 0; c < res; c++) {
      const x = originX + c * spacing;
      const h0 = data[r * res + c];
      let occ = 0;
      for (let d = 0; d < dirs; d++) {
        let maxTan = 0;
        for (let k = 0; k < steps; k++) {
          const t = ts[k];
          const tan = (hFn(x + dx[d] * t, z + dz[d] * t) - h0) / t;
          if (tan > maxTan) maxTan = tan;
        }
        // sin of horizon elevation angle; cosine-weighted visible sky fraction per slice ≈ 1 - sin²
        const s = maxTan / Math.sqrt(1 + maxTan * maxTan);
        occ += s;
      }
      out[r * res + c] = 1 - occ / dirs;
    }
  }
  return out;
}

/**
 * Soft sun shadow by horizon marching toward the sun. 1 = lit, 0 = shadow.
 * penumbraDeg ≈ angular softness (sun disk + scattering).
 */
export function sunShadow(
  g: Grid,
  hFn: HeightFn,
  sunAzDeg: number,
  sunElDeg: number,
  maxDist: number,
  globalMax: number,
  penumbraDeg = 1.4,
): Float32Array {
  const { res, spacing, originX, originZ, data } = g;
  const out = new Float32Array(res * res);
  const az = (sunAzDeg * Math.PI) / 180;
  const sx = Math.sin(az);
  const sz = -Math.cos(az);
  const tanEl = Math.tan((sunElDeg * Math.PI) / 180);
  const pen = Math.tan((penumbraDeg * Math.PI) / 180);
  const t0 = spacing * 0.75;
  const growth = 1.045;
  for (let r = 0; r < res; r++) {
    const z = originZ + r * spacing;
    for (let c = 0; c < res; c++) {
      const x = originX + c * spacing;
      const h0 = data[r * res + c] + 0.5;
      let maxTan = -1;
      let t = t0;
      while (t < maxDist) {
        const h = hFn(x + sx * t, z + sz * t);
        const tan = (h - h0) / t;
        if (tan > maxTan) maxTan = tan;
        // Nothing further can rise above the sun line + penumbra.
        if (h0 + t * (tanEl + pen) > globalMax) break;
        t = t * growth + spacing * 0.25;
      }
      const v = (tanEl - maxTan) / pen + 0.5;
      out[r * res + c] = v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v);
    }
  }
  return out;
}

/** D8 flow accumulation (cells draining through each cell), returns log-normalized 0..1. */
export function drainage(g: Grid): Float32Array {
  const { res, data } = g;
  const n = res * res;
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  const sorted = Array.from(order).sort((a, b) => data[b] - data[a]);
  const acc = new Float32Array(n).fill(1);
  for (const i of sorted) {
    const r = (i / res) | 0;
    const c = i - r * res;
    let best = -1;
    let bestDrop = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= res || cc >= res) continue;
        const j = rr * res + cc;
        const drop = (data[i] - data[j]) / (dr && dc ? 1.41421356 : 1);
        if (drop > bestDrop) {
          bestDrop = drop;
          best = j;
        }
      }
    }
    if (best >= 0) acc[best] += acc[i];
  }
  const out = new Float32Array(n);
  const lmax = Math.log(n);
  for (let i = 0; i < n; i++) out[i] = Math.log(acc[i]) / lmax;
  return out;
}

/** Distance (m) to the nearest cell where inside(i) differs (chamfer 3-4 two-pass). Positive everywhere. */
export function distanceToBoundary(res: number, spacing: number, isA: (i: number) => boolean): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(res * res);
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      const i = r * res + c;
      const a = isA(i);
      let edge = false;
      if (c > 0 && isA(i - 1) !== a) edge = true;
      else if (c < res - 1 && isA(i + 1) !== a) edge = true;
      else if (r > 0 && isA(i - res) !== a) edge = true;
      else if (r < res - 1 && isA(i + res) !== a) edge = true;
      d[i] = edge ? 0 : INF;
    }
  }
  const s1 = spacing;
  const s2 = spacing * Math.SQRT2;
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      const i = r * res + c;
      let v = d[i];
      if (c > 0) v = Math.min(v, d[i - 1] + s1);
      if (r > 0) {
        v = Math.min(v, d[i - res] + s1);
        if (c > 0) v = Math.min(v, d[i - res - 1] + s2);
        if (c < res - 1) v = Math.min(v, d[i - res + 1] + s2);
      }
      d[i] = v;
    }
  }
  for (let r = res - 1; r >= 0; r--) {
    for (let c = res - 1; c >= 0; c--) {
      const i = r * res + c;
      let v = d[i];
      if (c < res - 1) v = Math.min(v, d[i + 1] + s1);
      if (r < res - 1) {
        v = Math.min(v, d[i + res] + s1);
        if (c < res - 1) v = Math.min(v, d[i + res + 1] + s2);
        if (c > 0) v = Math.min(v, d[i + res - 1] + s2);
      }
      d[i] = v;
    }
  }
  return d;
}

/** Hillshade preview (0..1) from normals for a light direction. */
export function hillshade(n: Float32Array, azDeg: number, elDeg: number): Float32Array {
  const az = (azDeg * Math.PI) / 180;
  const el = (elDeg * Math.PI) / 180;
  const lx = Math.sin(az) * Math.cos(el);
  const ly = Math.sin(el);
  const lz = -Math.cos(az) * Math.cos(el);
  const out = new Float32Array(n.length / 3);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, n[i * 3] * lx + n[i * 3 + 1] * ly + n[i * 3 + 2] * lz);
  return out;
}
