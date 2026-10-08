// Offline grid utilities for the terrain bake (float math is fine here: tools are not part of the sim).

export interface Grid {
  res: number;
  spacing: number;
  /** World x of sample column 0. */
  originX: number;
  /** World z of sample row 0 (north-most row). */
  originZ: number;
  data: Float32Array;
}

export function makeGrid(res: number, spacing: number, originX: number, originZ: number, data?: Float32Array): Grid {
  return { res, spacing, originX, originZ, data: data ?? new Float32Array(res * res) };
}

/** Grid whose samples are cell centers of a square [-size/2, size/2]² coverage. */
export function centeredGrid(res: number, size: number): Grid {
  const spacing = size / res;
  const o = -size / 2 + spacing / 2;
  return makeGrid(res, spacing, o, o);
}

export function clampi(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sampleBilinear(g: Grid, x: number, z: number): number {
  const last = g.res - 1;
  let gx = (x - g.originX) / g.spacing;
  let gz = (z - g.originZ) / g.spacing;
  gx = gx < 0 ? 0 : gx > last ? last : gx;
  gz = gz < 0 ? 0 : gz > last ? last : gz;
  let ix = Math.floor(gx);
  let iz = Math.floor(gz);
  if (ix > last - 1) ix = last - 1;
  if (iz > last - 1) iz = last - 1;
  const tx = gx - ix;
  const tz = gz - iz;
  const d = g.data;
  const i = iz * g.res + ix;
  const a = d[i] + (d[i + 1] - d[i]) * tx;
  const b = d[i + g.res] + (d[i + g.res + 1] - d[i + g.res]) * tx;
  return a + (b - a) * tz;
}

function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  // Catmull-Rom spline
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

/** Bicubic (Catmull-Rom) sample of a raw array in grid-index space (u = column, v = row), edge clamped. */
export function bicubicIdx(d: Float32Array, w: number, h: number, u: number, v: number): number {
  const iu = Math.floor(u);
  const iv = Math.floor(v);
  const tu = u - iu;
  const tv = v - iv;
  const rows = [0, 0, 0, 0];
  for (let j = -1; j <= 2; j++) {
    const rr = clampi(iv + j, 0, h - 1) * w;
    const c0 = d[rr + clampi(iu - 1, 0, w - 1)];
    const c1 = d[rr + clampi(iu, 0, w - 1)];
    const c2 = d[rr + clampi(iu + 1, 0, w - 1)];
    const c3 = d[rr + clampi(iu + 2, 0, w - 1)];
    rows[j + 1] = cr(c0, c1, c2, c3, tu);
  }
  return cr(rows[0], rows[1], rows[2], rows[3], tv);
}

export function sampleBicubic(g: Grid, x: number, z: number): number {
  return bicubicIdx(g.data, g.res, g.res, (x - g.originX) / g.spacing, (z - g.originZ) / g.spacing);
}

/** Resample src onto a new grid definition (bicubic). */
export function resample(src: Grid, dst: Grid): Grid {
  const { res, spacing, originX, originZ, data } = dst;
  for (let r = 0; r < res; r++) {
    const z = originZ + r * spacing;
    for (let c = 0; c < res; c++) {
      data[r * res + c] = sampleBicubic(src, originX + c * spacing, z);
    }
  }
  return dst;
}

/** Separable box blur (radius in samples), repeated `passes` times (≈ gaussian). */
export function blur(src: Float32Array, res: number, radius: number, passes = 2): Float32Array {
  let a = Float32Array.from(src);
  let b = new Float32Array(src.length);
  const w = 2 * radius + 1;
  for (let p = 0; p < passes; p++) {
    for (let r = 0; r < res; r++) {
      const row = r * res;
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += a[row + clampi(k, 0, res - 1)];
      for (let c = 0; c < res; c++) {
        b[row + c] = acc / w;
        acc += a[row + clampi(c + radius + 1, 0, res - 1)] - a[row + clampi(c - radius, 0, res - 1)];
      }
    }
    for (let c = 0; c < res; c++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += b[clampi(k, 0, res - 1) * res + c];
      for (let r = 0; r < res; r++) {
        a[r * res + c] = acc / w;
        acc += b[clampi(r + radius + 1, 0, res - 1) * res + c] - b[clampi(r - radius, 0, res - 1) * res + c];
      }
    }
  }
  return a;
}

/** 2x2 box downsample (res must be even). */
export function downsample2(src: Float32Array, res: number): Float32Array {
  const h = res / 2;
  const out = new Float32Array(h * h);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < h; c++) {
      const i = 2 * r * res + 2 * c;
      out[r * h + c] = 0.25 * (src[i] + src[i + 1] + src[i + res] + src[i + res + 1]);
    }
  }
  return out;
}

export function minMax(d: Float32Array): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < d.length; i++) {
    const v = d[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

/** Seeded PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- offline value/gradient noise (float, not used by the sim) ----
function hash3(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function vnoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash3(ix, iy, seed);
  const b = hash3(ix + 1, iy, seed);
  const c = hash3(ix, iy + 1, seed);
  const d = hash3(ix + 1, iy + 1, seed);
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1;
}

/** fBm in [-1,1]-ish. */
export function fbm(x: number, y: number, seed: number, octaves = 5, lac = 2.03, gain = 0.5): number {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x, y, seed + o * 1013);
    norm += amp;
    amp *= gain;
    x = x * lac + 17.3;
    y = y * lac - 9.1;
  }
  return sum / norm;
}

/** Ridged multifractal in [0,1]. */
export function ridged(x: number, y: number, seed: number, octaves = 5, lac = 2.07, gain = 0.5): number {
  let amp = 0.5;
  let sum = 0;
  let norm = 0;
  let prev = 1;
  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(vnoise(x, y, seed + o * 7919));
    n *= n;
    sum += n * amp * prev;
    norm += amp;
    prev = n;
    amp *= gain;
    x = x * lac + 5.7;
    y = y * lac + 3.3;
  }
  return sum / norm;
}
