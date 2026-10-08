// Deterministic gameplay terrain surface: H(x,z) = base_bilinear(x,z) + D(x,z) (brief §4.G.1).
// base: Pamukkale patch (1 m) if inside it, else core grid (8 m) if inside it, else far grid (96 m, edge-clamped).
// D: 2-octave value noise x rock mask (bilinear on the core-aligned rock grid, 0 outside the core).
// PURE: only + - * / and Math.floor/sqrt/abs/min/max. No allocation in the per-sample paths.

import { detailRaw } from './detailNoise.ts';
import type { HeightGrid, MaskGrid, TerrainSampler, WorldTerrain } from './types.ts';

export interface PlayBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SamplerOptions {
  /** Explicit playable bounds (world.json terrain.playBounds). Default: core extent minus `playMargin`. */
  bounds?: PlayBounds;
  /** Margin (m) removed from the core extent when `bounds` is not given. Default 300. */
  playMargin?: number;
  /** Central-difference step for normal()/slopeDeg() in meters. Default 1. */
  normalStep?: number;
}

/** Bilinear sample with edge clamp. Identical arithmetic to kanatGridBilinear() in detailNoise.glsl.ts. */
export function gridBilinear(g: HeightGrid, x: number, z: number): number {
  return bilinearRaw(g.data, g.originX, g.originZ, g.spacing, g.res, x, z);
}

function bilinearRaw(
  d: Float32Array,
  originX: number,
  originZ: number,
  spacing: number,
  res: number,
  x: number,
  z: number,
): number {
  const last = res - 1;
  let gx = (x - originX) / spacing;
  let gz = (z - originZ) / spacing;
  if (gx < 0) gx = 0;
  else if (gx > last) gx = last;
  if (gz < 0) gz = 0;
  else if (gz > last) gz = last;
  let ix = Math.floor(gx);
  let iz = Math.floor(gz);
  if (ix > last - 1) ix = last - 1;
  if (iz > last - 1) iz = last - 1;
  const tx = gx - ix;
  const tz = gz - iz;
  const i = iz * res + ix;
  const h00 = d[i];
  const h10 = d[i + 1];
  const h01 = d[i + res];
  const h11 = d[i + res + 1];
  const a = h00 + (h10 - h00) * tx;
  const b = h01 + (h11 - h01) * tx;
  return a + (b - a) * tz;
}

function inside(g: HeightGrid, x: number, z: number): boolean {
  const ext = (g.res - 1) * g.spacing;
  return x >= g.originX && z >= g.originZ && x <= g.originX + ext && z <= g.originZ + ext;
}

const RAD2DEG = 57.29577951308232;
const HALF_PI = 1.5707963267948966;
const SIXTH_PI = 0.5235987755982988;
const INV_SQRT3 = 0.5773502691896257;
const TAN_PI_12 = 0.2679491924311227;

/** Deterministic atan for x >= 0 (only + - * /). Max error ~1e-8 rad. */
export function atanPositive(x: number): number {
  let inv = false;
  if (x > 1) {
    x = 1 / x;
    inv = true;
  }
  let off = 0;
  if (x > TAN_PI_12) {
    x = (x - INV_SQRT3) / (1 + x * INV_SQRT3);
    off = SIXTH_PI;
  }
  const x2 = x * x;
  // Taylor series to x^13 (|x| <= 0.268 → truncation < 1e-9).
  const p = x * (1 - x2 * (1 / 3 - x2 * (1 / 5 - x2 * (1 / 7 - x2 * (1 / 9 - x2 * (1 / 11 - x2 * (1 / 13)))))));
  const r = off + p;
  return inv ? HALF_PI - r : r;
}

export class WorldTerrainSampler implements TerrainSampler {
  readonly terrain: WorldTerrain;
  readonly bounds: PlayBounds;
  private readonly core: HeightGrid;
  private readonly far: HeightGrid;
  private readonly patch: HeightGrid | null;
  private readonly rock: Float32Array | null;
  private readonly masks: MaskGrid | null;
  private readonly step: number;
  private readonly coreMaxX: number;
  private readonly coreMaxZ: number;
  private readonly patchMaxX: number;
  private readonly patchMaxZ: number;

  constructor(terrain: WorldTerrain, opts: SamplerOptions = {}) {
    this.terrain = terrain;
    this.core = terrain.core;
    this.far = terrain.far;
    this.patch = terrain.patch ?? null;
    this.rock = terrain.rockMask ?? null;
    this.masks = terrain.masks ?? null;
    this.step = opts.normalStep ?? 1;
    const ext = (this.core.res - 1) * this.core.spacing;
    this.coreMaxX = this.core.originX + ext;
    this.coreMaxZ = this.core.originZ + ext;
    if (this.patch) {
      const pe = (this.patch.res - 1) * this.patch.spacing;
      this.patchMaxX = this.patch.originX + pe;
      this.patchMaxZ = this.patch.originZ + pe;
    } else {
      this.patchMaxX = -Infinity;
      this.patchMaxZ = -Infinity;
    }
    if (opts.bounds) {
      this.bounds = { ...opts.bounds };
    } else {
      const m = opts.playMargin ?? 300;
      this.bounds = { minX: this.core.originX + m, maxX: this.coreMaxX - m, minZ: this.core.originZ + m, maxZ: this.coreMaxZ - m };
    }
  }

  /** True when (x,z) lies inside the 8 m core grid. */
  inCore(x: number, z: number): boolean {
    return x >= this.core.originX && z >= this.core.originZ && x <= this.coreMaxX && z <= this.coreMaxZ;
  }

  /** True when (x,z) lies inside the hi-res patch (Pamukkale). */
  inPatch(x: number, z: number): boolean {
    const p = this.patch;
    return p !== null && x >= p.originX && z >= p.originZ && x <= this.patchMaxX && z <= this.patchMaxZ;
  }

  baseHeight(x: number, z: number): number {
    const p = this.patch;
    if (p !== null && x >= p.originX && z >= p.originZ && x <= this.patchMaxX && z <= this.patchMaxZ) {
      return bilinearRaw(p.data, p.originX, p.originZ, p.spacing, p.res, x, z);
    }
    const c = this.core;
    if (x >= c.originX && z >= c.originZ && x <= this.coreMaxX && z <= this.coreMaxZ) {
      return bilinearRaw(c.data, c.originX, c.originZ, c.spacing, c.res, x, z);
    }
    const f = this.far;
    return bilinearRaw(f.data, f.originX, f.originZ, f.spacing, f.res, x, z);
  }

  /** Rock mask 0..1 at (x,z) (0 outside the core). */
  rockAt(x: number, z: number): number {
    const r = this.rock;
    if (r === null) return 0;
    const c = this.core;
    if (!(x >= c.originX && z >= c.originZ && x <= this.coreMaxX && z <= this.coreMaxZ)) return 0;
    return bilinearRaw(r, c.originX, c.originZ, c.spacing, c.res, x, z);
  }

  /** Procedural detail D(x,z) in meters. */
  detail(x: number, z: number): number {
    const rock = this.rockAt(x, z);
    if (rock <= 0) return 0;
    return rock * detailRaw(x, z);
  }

  height(x: number, z: number): number {
    return this.baseHeight(x, z) + this.detail(x, z);
  }

  normal(x: number, z: number, out: Float64Array | number[]): void {
    const e = this.step;
    const hx = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e);
    const hz = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
    const inv = 1 / Math.sqrt(hx * hx + 1 + hz * hz);
    out[0] = -hx * inv;
    out[1] = inv;
    out[2] = -hz * inv;
  }

  slopeDeg(x: number, z: number): number {
    const e = this.step;
    const hx = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e);
    const hz = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
    return atanPositive(Math.sqrt(hx * hx + hz * hz)) * RAD2DEG;
  }

  /** Water depth below sea level (0 on land or when the world has no sea). */
  waterDepth(x: number, z: number): number {
    if (!this.terrain.hasSea) return 0;
    const h = this.baseHeight(x, z);
    return h < 0 ? -h : 0;
  }

  /** Mask channel value 0..1 (bilinear) — see world.json terrain.masks.names for the channel meaning. 0 outside. */
  mask(channel: number, x: number, z: number): number {
    const m = this.masks;
    if (m === null || channel < 0 || channel >= m.channels) return 0;
    const last = m.res - 1;
    const gx = (x - m.originX) / m.spacing;
    const gz = (z - m.originZ) / m.spacing;
    if (gx < 0 || gz < 0 || gx > last || gz > last) return 0;
    let ix = Math.floor(gx);
    let iz = Math.floor(gz);
    if (ix > last - 1) ix = last - 1;
    if (iz > last - 1) iz = last - 1;
    const tx = gx - ix;
    const tz = gz - iz;
    const ch = m.channels;
    const d = m.data;
    const i = (iz * m.res + ix) * ch + channel;
    const r = m.res * ch;
    const a = d[i] + (d[i + ch] - d[i]) * tx;
    const b = d[i + r] + (d[i + r + ch] - d[i + r]) * tx;
    return (a + (b - a) * tz) / 255;
  }

  /** Index of a mask channel by name, -1 if absent. */
  maskChannel(name: string): number {
    return this.masks ? this.masks.names.indexOf(name) : -1;
  }
}

export function createTerrainSampler(terrain: WorldTerrain, opts?: SamplerOptions): WorldTerrainSampler {
  return new WorldTerrainSampler(terrain, opts);
}

export { inside as gridContains };
