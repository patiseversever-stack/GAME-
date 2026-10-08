// Seeded droplet hydraulic erosion (after H. Beyer 2015 / S. Lague), on a height grid in meters.
// Heights are converted to cell units (h / spacing) internally so slopes are dimensionless.

import { blur, mulberry32 } from './grid.ts';

export interface ErosionOptions {
  droplets: number;
  seed: number;
  /** Scales capacity/erosion. 1 = default. */
  strength?: number;
  maxLifetime?: number;
  inertia?: number;
  minCapacity?: number;
  erodeSpeed?: number;
  depositSpeed?: number;
  evaporate?: number;
  gravity?: number;
  radius?: number;
  /** No erosion below this height (m) — keeps coastlines. */
  floorM?: number;
  /** Per-cell change clamp (m). */
  maxErodeM?: number;
  maxDepositM?: number;
  /** Fade the change to 0 within this many cells of the border. */
  edgeFadeCells?: number;
  /** Wall-clock budget (ms); remaining droplets are skipped. */
  timeBudgetMs?: number;
}

export interface ErosionResult {
  dropletsRun: number;
  ms: number;
  maxErode: number;
  maxDeposit: number;
}

export function erode(h: Float32Array, res: number, spacing: number, o: ErosionOptions): ErosionResult {
  const t0 = Date.now();
  const strength = o.strength ?? 1;
  const maxLife = o.maxLifetime ?? 48;
  const inertia = o.inertia ?? 0.06;
  const capFactor = 0.9 * strength;
  const minCap = o.minCapacity ?? 0.002;
  const erodeSpeed = o.erodeSpeed ?? 0.25;
  const depositSpeed = o.depositSpeed ?? 0.25;
  const evaporate = o.evaporate ?? 0.02;
  const gravity = o.gravity ?? 4;
  const radius = o.radius ?? 3;
  const floor = (o.floorM ?? -1e9) / spacing;
  const budget = o.timeBudgetMs ?? 90000;

  const n = res * res;
  const map = new Float32Array(n);
  for (let i = 0; i < n; i++) map[i] = h[i] / spacing;
  const orig = Float32Array.from(map);

  // brush
  const bx: number[] = [];
  const by: number[] = [];
  const bw: number[] = [];
  let wsum = 0;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d < radius) {
        bx.push(x);
        by.push(y);
        const w = 1 - d / radius;
        bw.push(w);
        wsum += w;
      }
    }
  }
  for (let k = 0; k < bw.length; k++) bw[k] /= wsum;

  const rnd = mulberry32(o.seed);
  const lo = radius + 1;
  const hi = res - radius - 2;
  let ran = 0;

  const hg = { h: 0, gx: 0, gy: 0 };
  const heightGrad = (px: number, py: number) => {
    const cx = Math.floor(px);
    const cy = Math.floor(py);
    const u = px - cx;
    const v = py - cy;
    const i = cy * res + cx;
    const a = map[i];
    const b = map[i + 1];
    const c = map[i + res];
    const d = map[i + res + 1];
    hg.gx = (b - a) * (1 - v) + (d - c) * v;
    hg.gy = (c - a) * (1 - u) + (d - b) * u;
    hg.h = a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };

  for (let k = 0; k < o.droplets; k++) {
    if ((k & 1023) === 0 && Date.now() - t0 > budget) break;
    ran++;
    let px = lo + rnd() * (hi - lo);
    let py = lo + rnd() * (hi - lo);
    let dx = 0;
    let dy = 0;
    let speed = 1;
    let water = 1;
    let sed = 0;
    for (let life = 0; life < maxLife; life++) {
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      const u = px - cx;
      const v = py - cy;
      heightGrad(px, py);
      const h0 = hg.h;
      dx = dx * inertia - hg.gx * (1 - inertia);
      dy = dy * inertia - hg.gy * (1 - inertia);
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-9) break;
      dx /= len;
      dy /= len;
      px += dx;
      py += dy;
      if (px < lo || px >= hi || py < lo || py >= hi) break;
      heightGrad(px, py);
      const dh = hg.h - h0;
      const cap = Math.max(-dh * speed * water * capFactor, minCap);
      const i = cy * res + cx;
      if (sed > cap || dh > 0) {
        const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * depositSpeed;
        sed -= amt;
        map[i] += amt * (1 - u) * (1 - v);
        map[i + 1] += amt * u * (1 - v);
        map[i + res] += amt * (1 - u) * v;
        map[i + res + 1] += amt * u * v;
      } else if (h0 > floor) {
        const amt = Math.min((cap - sed) * erodeSpeed, -dh);
        for (let b = 0; b < bw.length; b++) {
          const j = (cy + by[b]) * res + cx + bx[b];
          const w = amt * bw[b];
          const d = map[j] < w ? map[j] : w;
          map[j] -= d;
          sed += d;
        }
      }
      speed = Math.sqrt(Math.max(0, speed * speed - dh * gravity));
      water *= 1 - evaporate;
    }
  }

  // change field: smooth a little, clamp, fade at edges, apply
  const delta = new Float32Array(n);
  for (let i = 0; i < n; i++) delta[i] = (map[i] - orig[i]) * spacing;
  const sm = blur(delta, res, 1, 1);
  const maxE = o.maxErodeM ?? 14;
  const maxD = o.maxDepositM ?? 6;
  const fade = o.edgeFadeCells ?? 40;
  let mE = 0;
  let mD = 0;
  for (let r = 0; r < res; r++) {
    const er = Math.min(r, res - 1 - r);
    for (let c = 0; c < res; c++) {
      const ec = Math.min(c, res - 1 - c);
      const e = Math.min(1, Math.min(er, ec) / fade);
      const i = r * res + c;
      let d = 0.6 * delta[i] + 0.4 * sm[i];
      d = d < -maxE ? -maxE : d > maxD ? maxD : d;
      d *= e * e * (3 - 2 * e);
      if (orig[i] * spacing < (o.floorM ?? -1e9)) d = 0;
      if (-d > mE) mE = -d;
      if (d > mD) mD = d;
      h[i] += d;
    }
  }
  return { dropletsRun: ran, ms: Date.now() - t0, maxErode: mE, maxDeposit: mD };
}
