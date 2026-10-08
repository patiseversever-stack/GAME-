// Deterministic prop placement (brief §4.G.4). Called identically by the sim (collision) and the renderer
// (visuals), so collision and visuals line up exactly. Canonical rule: EVERY collidable prop exists on every
// quality tier — tiers only change LOD/impostor distance (non-collidable ground clutter is the renderer's own).
//
// buildProps(worldId, sampler, config?) → PropInstance[]   (ids 0..n−1 in placement order)
// balloonsFor / balloonPos re-exported from ./balloons.ts.
//
// ─── Conventions ────────────────────────────────────────────────────────────────────────────────────────
// • pos = ground anchor (base center) in world meters. yaw follows three.js rotation.y (local +x → (cos, 0, −sin)).
// • scale is always 1: every dimension is baked into `params` (meters) and into the world-space `prims`.
// • Render rule: visual surfaces must stay within ±0.4 m of the collision prims. For composite props
//   (house, theater, arch, lighthouse, gulet) the simplest exact path is to build visuals FROM `prims`.
//
// ─── params per type (all meters unless noted) ──────────────────────────────────────────────────────────
// chimney  (Kapadokya fairy chimney; variant 0..5 = profile family: 0 classic, 1 needle, 2 mushroom,
//           3 broad cone without cap, 4 two-tier hoodoo, 5 tower)
//   h0, h1      heights of the lower / upper tuff segments (base → h0 → h0+h1)
//   r0, r1, r2  lathe radii at y = 0, h0, h0+h1 (piecewise linear between; radial noise ≤ 0.3 m allowed)
//   capR, capH  basalt cap ellipsoid radii (horizontal, vertical semi-axis); capR = 0 → no cap
//   capY        cap center height above pos.y
//   sink        how far the base is buried below the local min ground (already in pos.y)
//   seed        integer noise seed for the renderer's radial noise / window decals
//   prims: cone(base=pos, h0, r0→r1), cone(base=pos+h0, h1, r1→r2), [ellipsoid(pos+capY, capR, capH, capR)]
// tree     (variant = species: 0 poplar/kavak, 1 Turkish pine/kızılçam, 2 spruce/ladin, 3 juniper/ardıç)
//   trunkH, trunkR       trunk capsule from pos.y − 0.5 to pos.y + trunkH, radius trunkR
//   crownBase, crownH    crown truncated cone from pos.y + crownBase, height crownH
//   crownR0, crownR1     crown radii at its bottom / top
//   seed                 renderer variation seed
// house    (Karadeniz wooden plateau house; variant 0..3 = paint/roof style)
//   bw, bd, bh  body width (local x), depth (local z), wall height above pos.y
//   rh          gable roof height (ridge along local z), eave = 0.4 overhang
//   prims: body box + 3 stepped roof boxes (render: gable between the steps, or use prims)
// gulet    (Likya moored boat on y = 0; variant 0..3 hull paint)
//   len, beam, free (freeboard above water), mastH, masts (1|2)
//   prims: hull rounded box (local z = bow axis) + mast capsules at local z = ±0.18·len
// tomb     (Likya rock tomb façade, faces outward = local +z) w, h, d
// lighthouse  h, r0, r1 (tower cone), lanternH (box on top, half width r1 + 0.3)
// arch     (Likya rock arch; arc in local x–y plane) span, rise, thick (tube radius), segs (capsule count)
//   arc points: P(θ) = (span/2·cos θ, legBase + rise·sin θ), θ = π·i/segs, plus two leg capsules down to −4 m
// waterfall (Karadeniz, NO collision) width, height (pos = top lip center), flow direction = local +z
// cornice  (Erciyes snow cornice) len (along ridge = local x), wid (overhang, local z leeward), thick, round
// rock     (Erciyes boulder, axis-aligned ellipsoid → yaw = 0) rx, ry, rz, seed
// column   (Pamukkale) h, r (cone r·1.08 → r·0.92), broken (0|1)
// wall     (Pamukkale ruin wall) len (local x), h, thick
// theater  (Pamukkale) radius (inner), tiers, tierH, tierD, arcDeg, segs — prims = tier×seg boxes (use prims)

import { TUNING } from '../data/tuning.ts';
import { atan2, cos, DEG, PI, sin } from '../math/detMath.ts';
import { Rng, STREAM } from '../math/rng.ts';
import type { TerrainSampler } from '../terrain/types.ts';
import type { PropInstance, PropPrimitive, PropType, WorldId } from '../types.ts';

export { balloonPos, balloonsFor, basketCenter } from './balloons.ts';
export type { BalloonOptions } from './balloons.ts';

export interface PropHint {
  count?: number;
  mask?: string;
  seed?: number;
}

/** Subset of WorldConfig (structurally compatible: pass the world.json config object directly). */
export interface PropBuildConfig {
  props?: Record<string, PropHint>;
  hasSea?: boolean;
  /** Global seed mixed into every category seed (default 0). */
  seed?: number;
  /** No prop centers inside these discs (gates, landing targets). Sim and render must pass the same list. */
  clear?: ReadonlyArray<{ x: number; z: number; r: number }>;
  /** Count multiplier for every category (tests / bots). Default 1. */
  density?: number;
  /** World wind (cornices overhang leeward). WorldConfig.wind fits. */
  wind?: { dirDeg: number; speed: number };
}

/** Optional placement masks exposed by the terrain agent's WorldTerrainSampler (duck-typed). */
interface MaskSampler {
  maskChannel(name: string): number;
  mask(channel: number, x: number, z: number): number;
}

const DEFAULT_HINTS: Record<WorldId, Record<string, PropHint>> = {
  kapadokya: { chimneys: { count: 1200, mask: 'chimney', seed: 11 }, poplars: { count: 2500, mask: 'trees', seed: 13 } },
  likya: {
    tombs: { count: 14, mask: 'tomb', seed: 21 },
    pines: { count: 6000, mask: 'trees', seed: 23 },
    gulets: { count: 7, mask: 'coast', seed: 25 },
    lighthouse: { count: 1, mask: 'coast', seed: 27 },
    arch: { count: 1, mask: 'coast', seed: 29 },
  },
  karadeniz: {
    houses: { count: 60, mask: 'house', seed: 31 },
    spruces: { count: 9000, mask: 'trees', seed: 33 },
    waterfalls: { count: 4, mask: 'drainage', seed: 35 },
  },
  erciyes: { cornices: { count: 80, mask: 'cornice', seed: 41 }, rocks: { count: 400, mask: 'cornice', seed: 43 } },
  pamukkale: {
    columns: { count: 120, mask: 'ruins', seed: 51 },
    walls: { count: 60, mask: 'ruins', seed: 53 },
    theater: { count: 1, mask: 'ruins', seed: 55 },
    junipers: { count: 1800, mask: 'trees', seed: 57 },
  },
};

// ─── terrain analysis grid ───────────────────────────────────────────────────────────────────────────────

const ASTEP = 32;

class Analysis {
  readonly ox: number;
  readonly oz: number;
  readonly n: number;
  readonly mx: number;
  readonly h: Float32Array;
  readonly slope: Float32Array; // tan of slope at 32 m scale
  readonly curv: Float32Array; // Laplacian (1/m): > 0 concave (valley), < 0 convex (ridge)
  readonly gx: Float32Array;
  readonly gz: Float32Array;

  constructor(s: TerrainSampler) {
    const b = s.bounds;
    this.ox = b.minX;
    this.oz = b.minZ;
    const w = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    this.n = Math.max(3, Math.floor(w / ASTEP) + 1);
    this.mx = this.n - 1;
    const n = this.n;
    this.h = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) this.h[j * n + i] = s.height(this.ox + i * ASTEP, this.oz + j * ASTEP);
    this.slope = new Float32Array(n * n);
    this.curv = new Float32Array(n * n);
    this.gx = new Float32Array(n * n);
    this.gz = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const xm = this.h[j * n + (i > 0 ? i - 1 : i)];
        const xp = this.h[j * n + (i < n - 1 ? i + 1 : i)];
        const zm = this.h[(j > 0 ? j - 1 : j) * n + i];
        const zp = this.h[(j < n - 1 ? j + 1 : j) * n + i];
        const gx = (xp - xm) / (2 * ASTEP);
        const gz = (zp - zm) / (2 * ASTEP);
        this.gx[k] = gx;
        this.gz[k] = gz;
        this.slope[k] = Math.sqrt(gx * gx + gz * gz);
        this.curv[k] = (xm + xp + zm + zp - 4 * this.h[k]) / (ASTEP * ASTEP);
      }
    }
  }

  sample(a: Float32Array, x: number, z: number): number {
    let gx = (x - this.ox) / ASTEP;
    let gz = (z - this.oz) / ASTEP;
    if (gx < 0) gx = 0;
    else if (gx > this.mx - 1e-9) gx = this.mx - 1e-9;
    if (gz < 0) gz = 0;
    else if (gz > this.mx - 1e-9) gz = this.mx - 1e-9;
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    const tx = gx - i;
    const tz = gz - j;
    const k = j * this.n + i;
    const a0 = a[k] + (a[k + 1] - a[k]) * tx;
    const a1 = a[k + this.n] + (a[k + this.n + 1] - a[k + this.n]) * tx;
    return a0 + (a1 - a0) * tz;
  }
}

/** Coarse occupancy (4 m cells) so props of different categories do not interpenetrate. */
class Occupancy {
  private readonly ox: number;
  private readonly oz: number;
  private readonly n: number;
  private readonly cells: Uint8Array;
  static readonly C = 4;

  constructor(s: TerrainSampler) {
    const b = s.bounds;
    this.ox = b.minX;
    this.oz = b.minZ;
    this.n = Math.floor(Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / Occupancy.C) + 2;
    this.cells = new Uint8Array(this.n * this.n);
  }

  private idx(x: number, z: number): number {
    const i = Math.floor((x - this.ox) / Occupancy.C);
    const j = Math.floor((z - this.oz) / Occupancy.C);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return -1;
    return j * this.n + i;
  }

  free(x: number, z: number, r: number): boolean {
    const c = Occupancy.C;
    for (let dz = -r; dz <= r + 1e-9; dz += c) {
      for (let dx = -r; dx <= r + 1e-9; dx += c) {
        if (dx * dx + dz * dz > (r + c) * (r + c)) continue;
        const k = this.idx(x + dx, z + dz);
        if (k >= 0 && this.cells[k] !== 0) return false;
      }
    }
    return true;
  }

  mark(x: number, z: number, r: number): void {
    const c = Occupancy.C;
    for (let dz = -r; dz <= r + 1e-9; dz += c) {
      for (let dx = -r; dx <= r + 1e-9; dx += c) {
        if (dx * dx + dz * dz > r * r + c * c) continue;
        const k = this.idx(x + dx, z + dz);
        if (k >= 0) this.cells[k] = 1;
      }
    }
  }
}

// ─── placement context ───────────────────────────────────────────────────────────────────────────────────

class Ctx {
  readonly s: TerrainSampler;
  readonly props: PropInstance[] = [];
  readonly an: Analysis;
  readonly occ: Occupancy;
  readonly ms: MaskSampler | null;
  readonly hasSea: boolean;
  readonly clear: ReadonlyArray<{ x: number; z: number; r: number }>;
  readonly cx: number;
  readonly cz: number;
  readonly halfW: number;

  constructor(
    readonlySampler: TerrainSampler,
    hasSea: boolean,
    clear: ReadonlyArray<{ x: number; z: number; r: number }>,
  ) {
    this.s = readonlySampler;
    this.an = new Analysis(readonlySampler);
    this.occ = new Occupancy(readonlySampler);
    const m = readonlySampler as unknown as Partial<MaskSampler>;
    this.ms = typeof m.maskChannel === 'function' && typeof m.mask === 'function' ? (m as MaskSampler) : null;
    this.hasSea = hasSea;
    this.clear = clear;
    const b = readonlySampler.bounds;
    this.cx = 0.5 * (b.minX + b.maxX);
    this.cz = 0.5 * (b.minZ + b.maxZ);
    this.halfW = 0.5 * Math.min(b.maxX - b.minX, b.maxZ - b.minZ);
  }

  maskFn(name: string | undefined): ((x: number, z: number) => number) | null {
    if (!this.ms || !name) return null;
    const ch = this.ms.maskChannel(name);
    if (ch < 0) return null;
    const ms = this.ms;
    return (x, z) => ms.mask(ch, x, z);
  }

  blocked(x: number, z: number): boolean {
    for (let i = 0; i < this.clear.length; i++) {
      const c = this.clear[i];
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < c.r * c.r) return true;
    }
    return false;
  }

  /** Min terrain height over a disc (center + 6 ring samples). */
  groundMin(x: number, z: number, r: number): number {
    let m = this.s.height(x, z);
    for (let k = 0; k < 6; k++) {
      const a = (k * PI) / 3;
      const h = this.s.height(x + r * cos(a), z + r * sin(a));
      if (h < m) m = h;
    }
    return m;
  }

  add(type: PropType, variant: number, x: number, y: number, z: number, yaw: number, prims: PropPrimitive[], params: Record<string, number>): PropInstance {
    const p: PropInstance = { id: this.props.length, type, variant, pos: [x, y, z], yaw, scale: 1, prims, params };
    this.props.push(p);
    return p;
  }
}

/** Radial falloff weight around the playable center (routes live in the central part of every world). */
function centerFalloff(ctx: Ctx, x: number, z: number, r: number): number {
  const dx = x - ctx.cx;
  const dz = z - ctx.cz;
  const d = Math.sqrt(dx * dx + dz * dz) / r;
  if (d >= 1) return 0;
  return 1 - d * d;
}

/**
 * Systematic weighted sampling over a jittered candidate grid: visits cells in raster order and places a
 * candidate every time the cumulative weight passes the next threshold → exactly `count` candidates
 * (minus rejected ones). Deterministic for a given rng.
 */
function scatter(
  ctx: Ctx,
  rng: Rng,
  count: number,
  cell: number,
  radius: number,
  weight: (x: number, z: number) => number,
  place: (x: number, z: number) => boolean,
): number {
  if (count <= 0) return 0;
  const x0 = Math.max(ctx.s.bounds.minX, ctx.cx - radius);
  const x1 = Math.min(ctx.s.bounds.maxX, ctx.cx + radius);
  const z0 = Math.max(ctx.s.bounds.minZ, ctx.cz - radius);
  const z1 = Math.min(ctx.s.bounds.maxZ, ctx.cz + radius);
  const nx = Math.max(1, Math.floor((x1 - x0) / cell));
  const nz = Math.max(1, Math.floor((z1 - z0) / cell));
  const w = new Float32Array(nx * nz);
  let total = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const v = weight(x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell);
      const vv = v > 0 ? v : 0;
      w[j * nx + i] = vv;
      total += vv;
    }
  }
  if (total <= 0) return 0;
  const stepW = total / count;
  let next = rng.next() * stepW;
  let acc = 0;
  let placed = 0;
  for (let j = 0; j < nz && placed < count; j++) {
    for (let i = 0; i < nx && placed < count; i++) {
      const v = w[j * nx + i];
      if (v <= 0) continue;
      acc += v;
      let tries = 0;
      while (acc > next && placed < count) {
        next += stepW;
        if (tries++ > 2) continue;
        const x = x0 + (i + 0.1 + 0.8 * rng.next()) * cell;
        const z = z0 + (j + 0.1 + 0.8 * rng.next()) * cell;
        if (ctx.blocked(x, z)) continue;
        if (place(x, z)) placed++;
      }
    }
  }
  return placed;
}

function hint(cfg: PropBuildConfig, world: WorldId, key: string): PropHint {
  const h = cfg.props?.[key];
  const d = DEFAULT_HINTS[world][key] ?? {};
  return { count: h?.count ?? d.count ?? 0, mask: h?.mask ?? d.mask, seed: h?.seed ?? d.seed ?? 1 };
}

function scaled(n: number | undefined, cfg: PropBuildConfig): number {
  return Math.round((n ?? 0) * (cfg.density ?? 1));
}

// ─── shared builders ─────────────────────────────────────────────────────────────────────────────────────

function treeProps(species: number, rng: Rng): Record<string, number> {
  let ht: number;
  let trunkR: number;
  let crownBase: number;
  let crownR0: number;
  let crownR1: number;
  switch (species) {
    case 0: // poplar: tall columnar
      ht = rng.range(14, 22);
      trunkR = rng.range(0.22, 0.32);
      crownBase = rng.range(2, 3.2);
      crownR0 = rng.range(1.4, 2.0);
      crownR1 = 0.35;
      break;
    case 1: // Turkish red pine: umbrella-ish crown high up
      ht = rng.range(10, 16);
      trunkR = rng.range(0.22, 0.32);
      crownBase = ht * rng.range(0.42, 0.5);
      crownR0 = rng.range(2.4, 3.4);
      crownR1 = rng.range(1.0, 1.5);
      break;
    case 2: // spruce: tall narrow cone
      ht = rng.range(15, 28);
      trunkR = rng.range(0.28, 0.4);
      crownBase = rng.range(1.2, 2.2);
      crownR0 = rng.range(2.2, 3.2);
      crownR1 = 0.2;
      break;
    default: // juniper: low bushy
      ht = rng.range(3, 6);
      trunkR = rng.range(0.15, 0.22);
      crownBase = rng.range(0.4, 0.8);
      crownR0 = rng.range(1.4, 2.4);
      crownR1 = rng.range(0.5, 0.8);
  }
  const crownH = ht - crownBase;
  return {
    trunkH: crownBase + 0.35 * crownH,
    trunkR,
    crownBase,
    crownH,
    crownR0,
    crownR1,
    seed: rng.nextU32() & 0xffff,
  };
}

function addTree(ctx: Ctx, species: number, x: number, z: number, rng: Rng): void {
  const pr = treeProps(species, rng);
  const y = ctx.groundMin(x, z, 0.6) - 0.1;
  const prims: PropPrimitive[] = [
    { kind: 'capsule', a: [x, y - 0.5, z], b: [x, y + pr.trunkH, z], r: pr.trunkR },
    { kind: 'cone', base: [x, y + pr.crownBase, z], h: pr.crownH, r0: pr.crownR0, r1: pr.crownR1 },
  ];
  ctx.add('tree', species, x, y, z, rng.range(0, 2 * PI), prims, pr);
  ctx.occ.mark(x, z, Math.max(1.2, pr.crownR0 * 0.6));
}

function boxPrim(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, yaw: number, round: number): PropPrimitive {
  return { kind: 'box', c: [cx, cy, cz], h: [hx, hy, hz], yaw, round };
}

/** Local (lx, lz) offset rotated by yaw (three.js convention) → world dx (index 0), dz (index 1). */
function rot(lx: number, lz: number, yaw: number, out: number[]): void {
  const c = cos(yaw);
  const s = sin(yaw);
  out[0] = lx * c + lz * s;
  out[1] = -lx * s + lz * c;
}

function isWater(ctx: Ctx, h: number): boolean {
  return ctx.hasSea && h < 0.3;
}

// ─── worlds ──────────────────────────────────────────────────────────────────────────────────────────────

function buildKapadokya(ctx: Ctx, cfg: PropBuildConfig, gseed: number): void {
  const an = ctx.an;
  // Fairy chimneys: valley sides & floors (concave, moderate slope), clustered around the center.
  const hc = hint(cfg, 'kapadokya', 'chimneys');
  const cm = ctx.maskFn(hc.mask);
  const rng = new Rng((hc.seed ?? 11) ^ gseed, STREAM.props);
  const roi = Math.min(3200, ctx.halfW);
  scatter(
    ctx,
    rng,
    scaled(hc.count, cfg),
    14,
    roi,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roi);
      if (f <= 0) return 0;
      if (cm) return cm(x, z) * f;
      const sl = an.sample(an.slope, x, z);
      const cu = an.sample(an.curv, x, z);
      const slopeW = sl < 0.05 ? 0.35 : sl < 0.9 ? 1 : 0.15;
      const concave = cu > 0 ? 1 + Math.min(4, cu * 400) : Math.max(0.1, 1 + cu * 300);
      return f * slopeW * concave;
    },
    (x, z) => {
      const variant = rng.int(6);
      const H = rng.range(10, 26) * (variant === 1 || variant === 5 ? 1.25 : 1);
      let r0 = rng.range(3.0, 5.5);
      let h0 = H * 0.55;
      let r1 = r0 * 0.55;
      let r2 = r0 * 0.35;
      let capR = r2 + rng.range(0.8, 1.6);
      let capH = rng.range(0.9, 1.6);
      switch (variant) {
        case 1:
          r0 *= 0.8;
          r1 = r0 * 0.42;
          r2 = r0 * 0.2;
          capR = r2 + 0.5;
          capH = 0.8;
          break;
        case 2:
          h0 = H * 0.5;
          r1 = r0 * 0.5;
          r2 = r0 * 0.28;
          capR = r0 * rng.range(0.75, 0.95);
          capH = rng.range(1.4, 2.2);
          break;
        case 3:
          r1 = r0 * 0.68;
          r2 = r0 * 0.42;
          capR = 0;
          capH = 0;
          break;
        case 4:
          h0 = H * 0.4;
          r1 = r0 * 0.72;
          r2 = r0 * 0.45;
          break;
        case 5:
          r0 *= 0.85;
          r1 = r0 * 0.78;
          r2 = r0 * 0.62;
          capR = r2 + 0.6;
          capH = 1.0;
          break;
        default:
          break;
      }
      const h1 = H - h0;
      if (!ctx.occ.free(x, z, r0 * 0.8)) return false;
      const sink = 1.5;
      const y = ctx.groundMin(x, z, r0) - sink;
      const Htot = H + sink;
      // keep the visible height: lower segment absorbs the sink
      const H0 = h0 + sink;
      const capY = Htot + capH * 0.55;
      const prims: PropPrimitive[] = [
        { kind: 'cone', base: [x, y, z], h: H0, r0, r1 },
        { kind: 'cone', base: [x, y + H0, z], h: h1, r0: r1, r1: r2 },
      ];
      if (capR > 0) prims.push({ kind: 'ellipsoid', c: [x, y + capY, z], r: [capR, capH, capR] });
      ctx.add('chimney', variant, x, y, z, rng.range(0, 2 * PI), prims, {
        h0: H0,
        h1,
        r0,
        r1,
        r2,
        capR,
        capH,
        capY,
        sink,
        seed: rng.nextU32() & 0xffff,
      });
      ctx.occ.mark(x, z, r0);
      return true;
    },
  );
  // Poplars: valley floors (flat + concave), denser near the center.
  const hp = hint(cfg, 'kapadokya', 'poplars');
  const pm = ctx.maskFn(hp.mask);
  const rngT = new Rng((hp.seed ?? 13) ^ gseed, STREAM.trees);
  const roiT = Math.min(3600, ctx.halfW);
  scatter(
    ctx,
    rngT,
    scaled(hp.count, cfg),
    9,
    roiT,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roiT);
      if (f <= 0) return 0;
      if (pm) return pm(x, z) * f;
      const sl = an.sample(an.slope, x, z);
      const cu = an.sample(an.curv, x, z);
      if (sl > 0.3) return 0;
      return f * (cu > 0 ? Math.min(1, cu * 600) : 0.02);
    },
    (x, z) => {
      if (!ctx.occ.free(x, z, 1.5)) return false;
      addTree(ctx, 0, x, z, rngT);
      return true;
    },
  );
}

function buildLikya(ctx: Ctx, cfg: PropBuildConfig, gseed: number): void {
  const an = ctx.an;
  const s = ctx.s;
  const tmp = [0, 0];
  // Rock tombs on steep faces above the sea.
  const ht = hint(cfg, 'likya', 'tombs');
  const tm = ctx.maskFn(ht.mask);
  const rng = new Rng((ht.seed ?? 21) ^ gseed, STREAM.props);
  const roi = Math.min(3000, ctx.halfW);
  scatter(
    ctx,
    rng,
    scaled(ht.count, cfg),
    40,
    roi,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roi);
      if (f <= 0) return 0;
      const h = an.sample(an.h, x, z);
      if (h < 8) return 0;
      if (tm) return tm(x, z) * f;
      const sl = an.sample(an.slope, x, z);
      return sl > 0.9 ? f : 0;
    },
    (x, z) => {
      const gx = an.sample(an.gx, x, z);
      const gz = an.sample(an.gz, x, z);
      // Façade faces downhill: outward = −∇H. yaw so that local +z → (−gx, −gz).
      const l = Math.sqrt(gx * gx + gz * gz) || 1;
      const ox = -gx / l;
      const oz = -gz / l;
      const yaw = yawFromLocalZ(ox, oz);
      const w = rng.range(6, 10);
      const h = rng.range(6, 9);
      const d = 3;
      const y = s.height(x, z);
      // Box half embedded in the rock (center 0.5 m behind the surface along −outward).
      const cx = x - ox * 0.5;
      const cz = z - oz * 0.5;
      ctx.add('tomb', rng.int(4), x, y, z, yaw, [boxPrim(cx, y + h * 0.5, cz, w * 0.5, h * 0.5, d * 0.5, yaw, 0.2)], { w, h, d });
      ctx.occ.mark(x, z, w * 0.5);
      return true;
    },
  );
  // Gulets on the water near the coast.
  const hg = hint(cfg, 'likya', 'gulets');
  const rngG = new Rng((hg.seed ?? 25) ^ gseed, STREAM.props);
  scatter(
    ctx,
    rngG,
    scaled(hg.count, cfg),
    60,
    roi,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roi);
      const h = an.sample(an.h, x, z);
      if (f <= 0 || h > -4 || h < -60) return 0;
      return f;
    },
    (x, z) => {
      const len = rngG.range(22, 30);
      const beam = len * 0.22;
      const free = rngG.range(1.6, 2.2);
      const mastH = rngG.range(16, 22);
      const masts = rngG.chance(0.6) ? 2 : 1;
      const yaw = rngG.range(0, 2 * PI);
      // keep the whole hull over water
      for (let k = -1; k <= 1; k += 2) {
        rot(0, (k * len) / 2, yaw, tmp);
        if (s.height(x + tmp[0], z + tmp[1]) > -2) return false;
      }
      if (!ctx.occ.free(x, z, len * 0.6)) return false;
      const prims: PropPrimitive[] = [boxPrim(x, free * 0.5 - 0.5, z, beam * 0.5, free * 0.5 + 0.5, len * 0.5, yaw, 0.8)];
      for (let m = 0; m < masts; m++) {
        const lz = masts === 1 ? 0.05 * len : (m === 0 ? 0.18 : -0.18) * len;
        rot(0, lz, yaw, tmp);
        prims.push({ kind: 'capsule', a: [x + tmp[0], free, z + tmp[1]], b: [x + tmp[0], free + mastH, z + tmp[1]], r: 0.25 });
      }
      ctx.add('gulet', rngG.int(4), x, 0, z, yaw, prims, { len, beam, free, mastH, masts });
      ctx.occ.mark(x, z, len * 0.6);
      return true;
    },
  );
  // Lighthouse on a coastal headland.
  const hl = hint(cfg, 'likya', 'lighthouse');
  const rngL = new Rng((hl.seed ?? 27) ^ gseed, STREAM.props);
  scatter(
    ctx,
    rngL,
    scaled(hl.count, cfg),
    30,
    roi,
    (x, z) => {
      const h = an.sample(an.h, x, z);
      const sl = an.sample(an.slope, x, z);
      if (h < 4 || h > 45 || sl > 0.45) return 0;
      // near water: one of 4 neighbors at 80 m below sea level
      let wet = 0;
      for (let k = 0; k < 4; k++) if (an.sample(an.h, x + (k === 0 ? 80 : k === 1 ? -80 : 0), z + (k === 2 ? 80 : k === 3 ? -80 : 0)) < 0) wet++;
      return wet > 0 ? centerFalloff(ctx, x, z, roi) * wet : 0;
    },
    (x, z) => {
      const h = 18;
      const r0 = 2.6;
      const r1 = 1.9;
      const lanternH = 3;
      const y = ctx.groundMin(x, z, r0) - 0.5;
      ctx.add('lighthouse', 0, x, y, z, 0, [
        { kind: 'cone', base: [x, y, z], h, r0, r1 },
        boxPrim(x, y + h + lanternH * 0.5, z, r1 + 0.3, lanternH * 0.5, r1 + 0.3, 0, 0.3),
      ], { h, r0, r1, lanternH });
      ctx.occ.mark(x, z, 4);
      return true;
    },
  );
  // Rock arch near the coast (legs on ground).
  const ha = hint(cfg, 'likya', 'arch');
  const rngA = new Rng((ha.seed ?? 29) ^ gseed, STREAM.props);
  scatter(
    ctx,
    rngA,
    scaled(ha.count, cfg),
    50,
    roi,
    (x, z) => {
      const h = an.sample(an.h, x, z);
      const sl = an.sample(an.slope, x, z);
      if (h < 2 || h > 30 || sl > 0.6) return 0;
      let wet = 0;
      for (let k = 0; k < 4; k++) if (an.sample(an.h, x + (k === 0 ? 120 : k === 1 ? -120 : 0), z + (k === 2 ? 120 : k === 3 ? -120 : 0)) < 0) wet++;
      return wet > 0 ? centerFalloff(ctx, x, z, roi) : 0;
    },
    (x, z) => {
      const span = rngA.range(30, 40);
      const rise = rngA.range(20, 28);
      const thick = rngA.range(3.2, 4.2);
      const segs = 8;
      const yaw = rngA.range(0, 2 * PI);
      rot(span * 0.5, 0, yaw, tmp);
      const ya = s.height(x + tmp[0], z + tmp[1]);
      const yb = s.height(x - tmp[0], z - tmp[1]);
      const legBase = Math.min(ya, yb, s.height(x, z));
      const prims: PropPrimitive[] = [];
      let px = 0;
      let py = 0;
      let pz = 0;
      for (let i = 0; i <= segs; i++) {
        const th = (PI * i) / segs;
        rot((span * 0.5) * cos(th), 0, yaw, tmp);
        const qx = x + tmp[0];
        const qy = legBase + rise * sin(th);
        const qz = z + tmp[1];
        if (i > 0) prims.push({ kind: 'capsule', a: [px, py, pz], b: [qx, qy, qz], r: thick });
        px = qx;
        py = qy;
        pz = qz;
      }
      rot(span * 0.5, 0, yaw, tmp);
      prims.push({ kind: 'capsule', a: [x + tmp[0], legBase, z + tmp[1]], b: [x + tmp[0], legBase - 4, z + tmp[1]], r: thick });
      prims.push({ kind: 'capsule', a: [x - tmp[0], legBase, z - tmp[1]], b: [x - tmp[0], legBase - 4, z - tmp[1]], r: thick });
      ctx.add('arch', 0, x, legBase, z, yaw, prims, { span, rise, thick, segs });
      ctx.occ.mark(x, z, span * 0.6);
      return true;
    },
  );
  // Pines on land.
  const hp = hint(cfg, 'likya', 'pines');
  const pm = ctx.maskFn(hp.mask);
  const rngT = new Rng((hp.seed ?? 23) ^ gseed, STREAM.trees);
  const roiT = Math.min(3600, ctx.halfW);
  scatter(
    ctx,
    rngT,
    scaled(hp.count, cfg),
    9,
    roiT,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roiT);
      if (f <= 0) return 0;
      const h = an.sample(an.h, x, z);
      if (h < 3) return 0;
      if (pm) return pm(x, z) * f;
      const sl = an.sample(an.slope, x, z);
      return sl < 0.8 ? f * (0.4 + 0.6 * (1 - sl)) : 0;
    },
    (x, z) => {
      if (isWater(ctx, s.height(x, z)) || !ctx.occ.free(x, z, 2)) return false;
      addTree(ctx, 1, x, z, rngT);
      return true;
    },
  );
}

/** yaw (three.js) such that local +z points along the horizontal unit vector (ox, oz). */
function yawFromLocalZ(ox: number, oz: number): number {
  // local +z → world (sin yaw, cos yaw) per rot(); solve sin = ox, cos = oz.
  return atan2(ox, oz);
}


function buildKaradeniz(ctx: Ctx, cfg: PropBuildConfig, gseed: number): void {
  const an = ctx.an;
  const s = ctx.s;
  const tmp = [0, 0];
  // Wooden plateau houses: flat spots, a few villages.
  const hh = hint(cfg, 'karadeniz', 'houses');
  const hm = ctx.maskFn(hh.mask);
  const rng = new Rng((hh.seed ?? 31) ^ gseed, STREAM.props);
  const roi = Math.min(3200, ctx.halfW);
  const villages: number[] = [];
  for (let v = 0; v < 5; v++) {
    villages.push(ctx.cx + rng.range(-0.6, 0.6) * roi, ctx.cz + rng.range(-0.6, 0.6) * roi);
  }
  scatter(
    ctx,
    rng,
    scaled(hh.count, cfg),
    18,
    roi,
    (x, z) => {
      const sl = an.sample(an.slope, x, z);
      if (sl > 0.25) return 0;
      if (hm) return hm(x, z);
      let best = 0;
      for (let v = 0; v < villages.length; v += 2) {
        const dx = x - villages[v];
        const dz = z - villages[v + 1];
        const w = 1 - (dx * dx + dz * dz) / (260 * 260);
        if (w > best) best = w;
      }
      return best;
    },
    (x, z) => {
      const bw = rng.range(7, 10);
      const bd = rng.range(8, 12);
      const bh = rng.range(4.5, 6.5);
      const rh = rng.range(2.4, 3.6);
      if (!ctx.occ.free(x, z, Math.max(bw, bd) * 0.7)) return false;
      const yaw = rng.range(0, 2 * PI);
      const y = ctx.groundMin(x, z, Math.max(bw, bd) * 0.5);
      const ew = bw * 0.5 + 0.4;
      const ed = bd * 0.5 + 0.4;
      const prims: PropPrimitive[] = [boxPrim(x, y + bh * 0.5 - 0.5, z, bw * 0.5, bh * 0.5 + 0.5, bd * 0.5, yaw, 0.15)];
      for (let k = 0; k < 3; k++) {
        const hw = (ew * (5 - 2 * k)) / 6;
        prims.push(boxPrim(x, y + bh + (rh * (2 * k + 1)) / 6, z, hw, rh / 6, ed, yaw, 0.05));
      }
      ctx.add('house', rng.int(4), x, y, z, yaw, prims, { bw, bd, bh, rh });
      ctx.occ.mark(x, z, Math.max(bw, bd) * 0.7);
      return true;
    },
  );
  // Waterfalls (no collision): steep drainage lines.
  const hw = hint(cfg, 'karadeniz', 'waterfalls');
  const wm = ctx.maskFn(hw.mask);
  const rngW = new Rng((hw.seed ?? 35) ^ gseed, STREAM.props);
  scatter(
    ctx,
    rngW,
    scaled(hw.count, cfg),
    64,
    roi,
    (x, z) => {
      const sl = an.sample(an.slope, x, z);
      const cu = an.sample(an.curv, x, z);
      if (sl < 0.9) return 0;
      const base = wm ? wm(x, z) : cu > 0 ? 1 : 0;
      return base * centerFalloff(ctx, x, z, roi);
    },
    (x, z) => {
      const gx = an.sample(an.gx, x, z);
      const gz = an.sample(an.gz, x, z);
      const l = Math.sqrt(gx * gx + gz * gz) || 1;
      const yaw = yawFromLocalZ(-gx / l, -gz / l);
      const height = Math.min(90, Math.max(25, l * 40));
      const width = rngW.range(8, 15);
      ctx.add('waterfall', 0, x, s.height(x, z), z, yaw, [], { width, height });
      return true;
    },
  );
  // Spruce forest.
  const hs = hint(cfg, 'karadeniz', 'spruces');
  const sm = ctx.maskFn(hs.mask);
  const rngT = new Rng((hs.seed ?? 33) ^ gseed, STREAM.trees);
  const roiT = Math.min(3800, ctx.halfW);
  scatter(
    ctx,
    rngT,
    scaled(hs.count, cfg),
    8,
    roiT,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roiT);
      if (f <= 0) return 0;
      if (sm) return sm(x, z) * f;
      const sl = an.sample(an.slope, x, z);
      if (sl > 1.0) return 0;
      // patchy forest: low-frequency deterministic modulation
      const patch = 0.5 + 0.5 * sin(x * 0.004 + 1.3) * cos(z * 0.0037 - 0.7);
      return f * patch * (sl > 0.08 ? 1 : 0.4);
    },
    (x, z) => {
      if (!ctx.occ.free(x, z, 1.8)) return false;
      addTree(ctx, 2, x, z, rngT);
      return true;
    },
  );
  void tmp;
}

function buildErciyes(ctx: Ctx, cfg: PropBuildConfig, gseed: number, windDirDeg: number): void {
  const an = ctx.an;
  const s = ctx.s;
  const tmp = [0, 0];
  // Leeward direction (wind blows from windDir toward windDir+180).
  const lee = (windDirDeg + 180) * DEG;
  const leeX = sin(lee);
  const leeZ = -cos(lee);
  const hc = hint(cfg, 'erciyes', 'cornices');
  const cm = ctx.maskFn(hc.mask);
  const rng = new Rng((hc.seed ?? 41) ^ gseed, STREAM.props);
  const roi = Math.min(3400, ctx.halfW);
  scatter(
    ctx,
    rng,
    scaled(hc.count, cfg),
    40,
    roi,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roi);
      if (f <= 0) return 0;
      if (cm) return cm(x, z) * f;
      const cu = an.sample(an.curv, x, z);
      return cu < -0.0015 ? f * Math.min(1, -cu * 300) : 0;
    },
    (x, z) => {
      // ridge axis ⟂ to the gradient
      const gx = an.sample(an.gx, x, z);
      const gz = an.sample(an.gz, x, z);
      const l = Math.sqrt(gx * gx + gz * gz);
      let ax: number;
      let az: number;
      if (l > 1e-4) {
        ax = -gz / l;
        az = gx / l;
      } else {
        ax = -leeZ;
        az = leeX;
      }
      // local x along the ridge, local z leeward-ish (perpendicular, toward lee side)
      let ox = -az;
      let oz = ax;
      if (ox * leeX + oz * leeZ < 0) {
        ox = -ox;
        oz = -oz;
      }
      const yaw = yawFromLocalZ(ox, oz);
      const len = rng.range(18, 40);
      const wid = rng.range(6, 10);
      const thick = rng.range(2, 3.2);
      if (!ctx.occ.free(x, z, len * 0.4)) return false;
      const top = Math.max(s.height(x, z), s.height(x + ox * wid * 0.5, z + oz * wid * 0.5));
      rot(0, wid * 0.35, yaw, tmp);
      const cx = x + tmp[0];
      const cz = z + tmp[1];
      ctx.add('cornice', 0, x, top, z, yaw, [boxPrim(cx, top + thick * 0.2, cz, len * 0.5, thick * 0.5, wid * 0.5, yaw, Math.min(1.2, thick * 0.45))], {
        len,
        wid,
        thick,
        round: Math.min(1.2, thick * 0.45),
      });
      ctx.occ.mark(x, z, len * 0.4);
      return true;
    },
  );
  const hr = hint(cfg, 'erciyes', 'rocks');
  const rm = ctx.maskFn(hr.mask);
  const rngR = new Rng((hr.seed ?? 43) ^ gseed, STREAM.props);
  scatter(
    ctx,
    rngR,
    scaled(hr.count, cfg),
    16,
    roi,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roi);
      if (f <= 0) return 0;
      const sl = an.sample(an.slope, x, z);
      const cu = an.sample(an.curv, x, z);
      const ridge = cu < 0 ? Math.min(1, -cu * 500) : 0.1;
      const base = rm ? 0.3 + rm(x, z) : 1;
      return f * base * (sl > 0.35 ? 1 : 0.3) * (0.3 + ridge);
    },
    (x, z) => {
      const rx = rngR.range(2, 6);
      const ry = rx * rngR.range(0.5, 0.9);
      const rz = rx * rngR.range(0.6, 1.1);
      if (!ctx.occ.free(x, z, rx * 0.8)) return false;
      const y = ctx.groundMin(x, z, rx * 0.7);
      ctx.add('rock', rngR.int(4), x, y, z, 0, [{ kind: 'ellipsoid', c: [x, y + ry * 0.45, z], r: [rx, ry, rz] }], {
        rx,
        ry,
        rz,
        seed: rngR.nextU32() & 0xffff,
      });
      ctx.occ.mark(x, z, rx * 0.8);
      return true;
    },
  );
}

function buildPamukkale(ctx: Ctx, cfg: PropBuildConfig, gseed: number): void {
  const an = ctx.an;
  const s = ctx.s;
  const tmp = [0, 0];
  const hc = hint(cfg, 'pamukkale', 'columns');
  const rm = ctx.maskFn(hc.mask);
  const rng = new Rng((hc.seed ?? 51) ^ gseed, STREAM.props);
  // Ruins site: flat plateau near the center (mask if present).
  const roi = Math.min(2400, ctx.halfW);
  let siteX = ctx.cx;
  let siteZ = ctx.cz;
  {
    let best = -1;
    for (let k = 0; k < 64; k++) {
      const x = ctx.cx + rng.range(-0.5, 0.5) * roi;
      const z = ctx.cz + rng.range(-0.5, 0.5) * roi;
      const sl = an.sample(an.slope, x, z);
      const w = (rm ? rm(x, z) : 0) + (sl < 0.12 ? 1 : 0) + an.sample(an.h, x, z) * 1e-4;
      if (w > best) {
        best = w;
        siteX = x;
        siteZ = z;
      }
    }
  }
  const ruinW = (x: number, z: number): number => {
    const sl = an.sample(an.slope, x, z);
    if (sl > 0.3) return 0;
    if (rm) return rm(x, z);
    const dx = x - siteX;
    const dz = z - siteZ;
    const w = 1 - (dx * dx + dz * dz) / (420 * 420);
    return w > 0 ? w : 0;
  };
  // Theater first (largest footprint): on a moderate slope near the site, opening downhill.
  const ht = hint(cfg, 'pamukkale', 'theater');
  const rngTh = new Rng((ht.seed ?? 55) ^ gseed, STREAM.props);
  scatter(
    ctx,
    rngTh,
    scaled(ht.count, cfg),
    24,
    roi,
    (x, z) => {
      const sl = an.sample(an.slope, x, z);
      const dx = x - siteX;
      const dz = z - siteZ;
      const near = 1 - (dx * dx + dz * dz) / (700 * 700);
      return near > 0 && sl > 0.12 && sl < 0.6 ? near : 0;
    },
    (x, z) => {
      const gx = an.sample(an.gx, x, z);
      const gz = an.sample(an.gz, x, z);
      const l = Math.sqrt(gx * gx + gz * gz) || 1;
      // stage faces downhill: local +z = downhill; seating ring behind (uphill) the stage point.
      const yaw = yawFromLocalZ(-gx / l, -gz / l);
      const radius = 22;
      const tiers = 6;
      const tierH = 1.6;
      const tierD = 3;
      const arcDeg = 180;
      const segs = 9;
      const y0 = s.height(x, z);
      const prims: PropPrimitive[] = [];
      for (let k = 0; k < tiers; k++) {
        const rc = radius + (k + 0.5) * tierD;
        const top = (k + 1) * tierH;
        for (let j = 0; j < segs; j++) {
          // angle from local −z (uphill) sweeping ±arc/2
          const a = ((j + 0.5) / segs - 0.5) * arcDeg * DEG;
          const lx = rc * sin(a);
          const lz = -rc * cos(a);
          rot(lx, lz, yaw, tmp);
          const half = rc * sin((arcDeg * DEG) / segs / 2) + 0.3;
          prims.push(boxPrim(x + tmp[0], y0 + top * 0.5 - 1, z + tmp[1], half, top * 0.5 + 1, tierD * 0.5, yaw - a, 0.1));
        }
      }
      ctx.add('theater', 0, x, y0, z, yaw, prims, { radius, tiers, tierH, tierD, arcDeg, segs });
      ctx.occ.mark(x, z, radius + tiers * tierD);
      return true;
    },
  );
  // Columns: colonnade streets + scattered.
  const nCol = scaled(hc.count, cfg);
  let placedCol = 0;
  const streets = Math.max(1, Math.min(4, Math.floor(nCol / 20)));
  for (let st = 0; st < streets && placedCol < nCol; st++) {
    const yaw = rng.range(0, PI);
    const n = Math.min(nCol - placedCol, Math.floor(nCol / (streets + 1)));
    const sx = siteX + rng.range(-200, 200);
    const sz = siteZ + rng.range(-200, 200);
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      rot(side * 6, (Math.floor(i / 2) - n / 4) * 5.5, yaw, tmp);
      const x = sx + tmp[0];
      const z = sz + tmp[1];
      if (ctx.blocked(x, z) || !ctx.occ.free(x, z, 1.2) || an.sample(an.slope, x, z) > 0.35) continue;
      addColumn(ctx, rng, x, z);
      placedCol++;
    }
  }
  scatter(ctx, rng, nCol - placedCol, 12, roi, ruinW, (x, z) => {
    if (!ctx.occ.free(x, z, 1.2)) return false;
    addColumn(ctx, rng, x, z);
    return true;
  });
  // Walls.
  const hw = hint(cfg, 'pamukkale', 'walls');
  const rngW = new Rng((hw.seed ?? 53) ^ gseed, STREAM.props);
  scatter(ctx, rngW, scaled(hw.count, cfg), 14, roi, ruinW, (x, z) => {
    const len = rngW.range(6, 18);
    const h = rngW.range(2, 6);
    const thick = rngW.range(1, 1.6);
    const yaw = rngW.range(0, PI);
    if (!ctx.occ.free(x, z, len * 0.5)) return false;
    const y = ctx.groundMin(x, z, len * 0.4);
    ctx.add('wall', rngW.int(4), x, y, z, yaw, [boxPrim(x, y + h * 0.5 - 0.4, z, len * 0.5, h * 0.5 + 0.4, thick * 0.5, yaw, 0.15)], { len, h, thick });
    ctx.occ.mark(x, z, len * 0.5);
    return true;
  });
  // Sparse junipers.
  const hj = hint(cfg, 'pamukkale', 'junipers');
  const jm = ctx.maskFn(hj.mask);
  const rngT = new Rng((hj.seed ?? 57) ^ gseed, STREAM.trees);
  const roiT = Math.min(3600, ctx.halfW);
  scatter(
    ctx,
    rngT,
    scaled(hj.count, cfg),
    14,
    roiT,
    (x, z) => {
      const f = centerFalloff(ctx, x, z, roiT);
      if (f <= 0) return 0;
      if (jm) return jm(x, z) * f;
      const sl = an.sample(an.slope, x, z);
      return sl < 0.7 ? f * (0.5 + 0.5 * sin(x * 0.006) * sin(z * 0.005 + 0.4)) : 0;
    },
    (x, z) => {
      if (!ctx.occ.free(x, z, 2)) return false;
      addTree(ctx, 3, x, z, rngT);
      return true;
    },
  );
}

function addColumn(ctx: Ctx, rng: Rng, x: number, z: number): void {
  const broken = rng.chance(0.4) ? 1 : 0;
  const h = broken ? rng.range(2, 5) : rng.range(6, 9);
  const r = rng.range(0.4, 0.6);
  const y = ctx.groundMin(x, z, r) - 0.3;
  ctx.add('column', rng.int(4), x, y, z, rng.range(0, 2 * PI), [{ kind: 'cone', base: [x, y, z], h, r0: r * 1.08, r1: r * 0.92 }], { h, r, broken });
  ctx.occ.mark(x, z, 1.2);
}

// ─── entry point ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic collidable props for a world. Same inputs → bit-identical output on every engine.
 * `config` may be the world.json WorldConfig object (uses its `props` hints and `hasSea`).
 */
export function buildProps(worldId: WorldId, sampler: TerrainSampler, config: PropBuildConfig = {}): PropInstance[] {
  const terr = (sampler as unknown as { terrain?: { hasSea?: boolean } }).terrain;
  const hasSea = config.hasSea ?? terr?.hasSea ?? worldId === 'likya';
  const ctx = new Ctx(sampler, hasSea, config.clear ?? []);
  const gseed = (config.seed ?? 0) | 0;
  switch (worldId) {
    case 'kapadokya':
      buildKapadokya(ctx, config, gseed);
      break;
    case 'likya':
      buildLikya(ctx, config, gseed);
      break;
    case 'karadeniz':
      buildKaradeniz(ctx, config, gseed);
      break;
    case 'erciyes':
      buildErciyes(ctx, config, gseed, config.wind?.dirDeg ?? 300);
      break;
    case 'pamukkale':
      buildPamukkale(ctx, config, gseed);
      break;
  }
  return ctx.props;
}

/** Number of collision primitives (diagnostics). */
export function primCount(props: readonly PropInstance[]): number {
  let n = 0;
  for (let i = 0; i < props.length; i++) n += props[i].prims.length;
  return n;
}

export const PROP_TUNING = { occupancyCell: 4, analysisStep: ASTEP, balloonIdBase: TUNING.balloon.idBase } as const;
