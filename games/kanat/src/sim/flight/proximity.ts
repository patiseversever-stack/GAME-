// Surface distance query — the heart of the proximity multiplier (brief §4.G.6). Allocation-free.
//
// query(p) → nearest surface among: terrain H(x,z) (gameplay surface incl. detail D), static props (SDF prims in a
// 32 m grid hash), dynamic balloons (ellipsoid + basket box at the current sim time) and water (sea plane y = 0
// when the world has a sea, plus optional flat pool discs).
//
// Terrain (step 1 of §4.G.6):
//   d_v = y − H(x,z). If nothing within the ±30 m ring (24 samples) rises above y − 45 → early out, d ≈ d_v·n_y.
//   Else coarse 13×13 @ 5 m (±30 m) nearest sample S*, 7×7 @ 1 m refinement around it, then two tangent-plane
//   projection steps S ← (q.x, H(q), q.z) with q = p − ((p−S)·n)n, and the plane-corrected distance (p−S)·n.
//   Below 3 m a small conservative bias (TUNING.prox.terrainSafety) is subtracted so that an exact distance < r
//   is never reported as "safe" (9.G-5).
// Collision (per substep) uses `contact(p)`: a cheap vertical-clearance test d_v > r·(1 + L) proves "no terrain
// within r" for terrain slopes up to L = tan 85°; only then the refined query runs.
//
// Distances in this module are CENTER distances (`dc`). The ProximityInfo.d published to HUD/scoring is the BODY
// distance d = max(0, dc − r), r = 0.6 m (body sphere radius = the suit capsule approximated as a sphere).

import { TUNING } from '../data/tuning.ts';
import { atan, DEG } from '../math/detMath.ts';
import type { HeightGrid, TerrainSampler } from '../terrain/types.ts';
import type { BalloonDef, SurfaceClass } from '../types.ts';
import { balloonPos } from '../world/balloons.ts';
import { newPropHit, type PropHit, type PropIndex } from '../world/propIndex.ts';
import { sdBox, sdEllipsoid } from '../world/sdf.ts';

const P = TUNING.prox;
const BODY_R = TUNING.body.radius;

/**
 * Flat water surfaces. Sea: { y } (infinite plane). Disc pool: { y, x, z, r }. Pool grid (Pamukkale
 * world.json terrain.patchInfo.water decoded as a HeightGrid): { y: 0, grid } — water exists where the
 * grid's surface height is above the terrain.
 */
export interface WaterBody {
  y: number;
  x?: number;
  z?: number;
  r?: number;
  grid?: HeightGrid;
}

function gridSample(g: HeightGrid, x: number, z: number): number {
  const gx = (x - g.originX) / g.spacing;
  const gz = (z - g.originZ) / g.spacing;
  const last = g.res - 1;
  if (!(gx >= 0 && gz >= 0 && gx <= last && gz <= last)) return -Infinity;
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

/** Mutable query result (one per caller, reused). */
export class ProxResult {
  /** Signed center distance to the nearest surface (negative = penetrating), Infinity if none within range. */
  dc = Infinity;
  cls: SurfaceClass = 'none';
  /** Nearest surface point. */
  px = 0;
  py = 0;
  pz = 0;
  /** Unit normal pointing from the surface toward the query point. */
  nx = 0;
  ny = 1;
  nz = 0;
  /** -1 terrain / water, prop id, or TUNING.balloon.idBase + balloon id. */
  propId = -1;
  /** True when the flatSurfaceMaxMult clamp applies (water, or ground slope < 8°). */
  flat = false;
  /** Terrain slope (deg) at the nearest terrain point (when cls is ground/rock). */
  slopeDeg = 0;
  /** Vertical height above the terrain (or sea surface) at (x, z). */
  agl = Infinity;
  /** Raw terrain height at (x, z). */
  ground = 0;

  copyFrom(o: ProxResult): void {
    this.dc = o.dc;
    this.cls = o.cls;
    this.px = o.px;
    this.py = o.py;
    this.pz = o.pz;
    this.nx = o.nx;
    this.ny = o.ny;
    this.nz = o.nz;
    this.propId = o.propId;
    this.flat = o.flat;
    this.slopeDeg = o.slopeDeg;
    this.agl = o.agl;
    this.ground = o.ground;
  }
}

/** Ç(d) for a BODY distance d (m) before the flat-surface clamp: 0, 1, 2, 3 or 5. */
export function multForDistance(d: number): 0 | 1 | 2 | 3 | 5 {
  const t = P.tiers;
  if (!(d < t[0])) return 0;
  if (d < t[3]) return 5;
  if (d < t[2]) return 3;
  if (d < t[1]) return 2;
  return 1;
}

/** Final multiplier with the flatSurfaceMaxMult rule (top-of-brief decision). */
export function multiplier(d: number, flat: boolean): 0 | 1 | 2 | 3 | 5 {
  const m = multForDistance(d);
  if (flat && m > P.flatSurfaceMaxMult) return P.flatSurfaceMaxMult as 0 | 1 | 2 | 3 | 5;
  return m;
}

// Early-out ring: 12 directions at 30° steps (cos/sin table of multiples of 30°).
const RING_N = 12;
const COS30 = [1, 0.8660254037844387, 0.5, 0, -0.5, -0.8660254037844387, -1, -0.8660254037844387, -0.5, 0, 0.5, 0.8660254037844387];
const RING_COS = new Float64Array(RING_N);
const RING_SIN = new Float64Array(RING_N);
for (let i = 0; i < RING_N; i++) {
  RING_COS[i] = COS30[i];
  RING_SIN[i] = COS30[(i + 9) % 12];
}

const FLAT_COS = 0.9902680687415704; // cos(8°)
const ROCK_COS = 0.8660254037844387; // cos(30°)
const BALLOON_BASE = TUNING.balloon.idBase;
const BH = TUNING.balloon.basketHalf;

export class Proximity {
  readonly sampler: TerrainSampler;
  readonly props: PropIndex | null;
  readonly balloons: readonly BalloonDef[];
  readonly water: readonly WaterBody[];
  readonly hasSea: boolean;
  /** Balloon envelope centers at the current time (x, y, z per balloon). */
  readonly balloonCenters: Float64Array;
  private readonly balloonBound: Float64Array;
  private readonly hit: PropHit = newPropHit();
  private readonly tmp = new Float64Array(3);
  // terrain scratch
  private sx = 0;
  private sy = 0;
  private sz = 0;
  private tnx = 0;
  private tny = 1;
  private tnz = 0;

  constructor(sampler: TerrainSampler, props: PropIndex | null, balloons: readonly BalloonDef[], water: readonly WaterBody[]) {
    this.sampler = sampler;
    this.props = props;
    this.balloons = balloons;
    this.water = water;
    let sea = false;
    for (let i = 0; i < water.length; i++) if (water[i].r === undefined && water[i].grid === undefined) sea = true;
    this.hasSea = sea;
    this.balloonCenters = new Float64Array(balloons.length * 3);
    this.balloonBound = new Float64Array(balloons.length);
    for (let i = 0; i < balloons.length; i++) {
      const b = balloons[i];
      // bounding sphere around the envelope center reaching the basket bottom
      const down = b.envelopeH * 0.5 + TUNING.balloon.basketBelow + BH[1];
      this.balloonBound[i] = Math.sqrt(down * down + BH[0] * BH[0] + BH[2] * BH[2]) + 0.5 > b.envelopeR ? Math.sqrt(down * down + BH[0] * BH[0] + BH[2] * BH[2]) + 0.5 : b.envelopeR + 0.5;
    }
    this.setTime(0);
  }

  /** Update balloon positions for sim time t (seconds since the jump). Call once per tick. */
  setTime(t: number): void {
    for (let i = 0; i < this.balloons.length; i++) {
      balloonPos(this.balloons[i], t, this.tmp);
      this.balloonCenters[i * 3] = this.tmp[0];
      this.balloonCenters[i * 3 + 1] = this.tmp[1];
      this.balloonCenters[i * 3 + 2] = this.tmp[2];
    }
  }

  /** Terrain normal by central differences (e = 0.5 m) at (x, z) → this.tn*. */
  private terrainNormal(x: number, z: number): void {
    const s = this.sampler;
    const e = 0.5;
    const hx = (s.height(x + e, z) - s.height(x - e, z)) / (2 * e);
    const hz = (s.height(x, z + e) - s.height(x, z - e)) / (2 * e);
    const inv = 1 / Math.sqrt(hx * hx + 1 + hz * hz);
    this.tnx = -hx * inv;
    this.tny = inv;
    this.tnz = -hz * inv;
  }

  /**
   * Terrain center distance at (x,y,z) into `out` (cls ground/rock, propId -1).
   * maxD: beyond this an early-out estimate is accepted.
   */
  terrain(x: number, y: number, z: number, maxD: number, out: ProxResult): void {
    const s = this.sampler;
    const H0 = s.height(x, z);
    const dv = y - H0;
    out.ground = H0;
    out.agl = dv;
    out.propId = -1;
    if (dv <= 0) {
      this.terrainNormal(x, z);
      out.dc = dv * this.tny;
      out.px = x;
      out.py = H0;
      out.pz = z;
      this.finishTerrain(out);
      return;
    }
    if (dv > maxD) {
      // Early out when nothing in the ±30 m ring rises to within maxD below us.
      let hmax = H0;
      const rr = P.ringR;
      for (let k = 0; k < rr.length; k++) {
        const r = rr[k];
        for (let i = 0; i < RING_N; i++) {
          const h = s.height(x + r * RING_COS[i], z + r * RING_SIN[i]);
          if (h > hmax) hmax = h;
        }
      }
      if (y - hmax > maxD) {
        this.terrainNormal(x, z);
        out.dc = dv * this.tny;
        out.px = x;
        out.py = H0;
        out.pz = z;
        this.finishTerrain(out);
        return;
      }
    }
    // Coarse 13×13 @ 5 m.
    let bx = x;
    let by = H0;
    let bz = z;
    let best = dv * dv;
    const cn = P.coarseN;
    const cs = P.coarseStep;
    const ch = (cn - 1) >> 1;
    for (let j = 0; j < cn; j++) {
      const sz = z + (j - ch) * cs;
      const dz = z - sz;
      const dz2 = dz * dz;
      for (let i = 0; i < cn; i++) {
        const sx = x + (i - ch) * cs;
        const dx = x - sx;
        const d2xz = dx * dx + dz2;
        if (d2xz >= best) continue;
        const sy = s.height(sx, sz);
        const dy = y - sy;
        const d2 = d2xz + dy * dy;
        if (d2 < best) {
          best = d2;
          bx = sx;
          by = sy;
          bz = sz;
        }
      }
    }
    // Fine 7×7 @ 1 m around the coarse winner.
    const fn = P.fineN;
    const fs = P.fineStep;
    const fh = (fn - 1) >> 1;
    const cx0 = bx;
    const cz0 = bz;
    for (let j = 0; j < fn; j++) {
      const sz = cz0 + (j - fh) * fs;
      const dz = z - sz;
      const dz2 = dz * dz;
      for (let i = 0; i < fn; i++) {
        if (i === fh && j === fh) continue;
        const sx = cx0 + (i - fh) * fs;
        const dx = x - sx;
        const d2xz = dx * dx + dz2;
        if (d2xz >= best) continue;
        const sy = s.height(sx, sz);
        const dy = y - sy;
        const d2 = d2xz + dy * dy;
        if (d2 < best) {
          best = d2;
          bx = sx;
          by = sy;
          bz = sz;
        }
      }
    }
    // Tangent-plane projection steps (converge to the foot point on smooth terrain).
    this.sx = bx;
    this.sy = by;
    this.sz = bz;
    this.terrainNormal(bx, bz);
    for (let it = 0; it < 2; it++) {
      const t = (x - this.sx) * this.tnx + (y - this.sy) * this.tny + (z - this.sz) * this.tnz;
      const qx = x - t * this.tnx;
      const qz = z - t * this.tnz;
      const mx = qx - this.sx;
      const mz = qz - this.sz;
      if (mx * mx + mz * mz > 9) break; // projection left the refined patch: keep the sample
      const qy = s.height(qx, qz);
      const ex = x - qx;
      const ey = y - qy;
      const ez = z - qz;
      const d2 = ex * ex + ey * ey + ez * ez;
      if (d2 <= best) {
        best = d2;
        this.sx = qx;
        this.sy = qy;
        this.sz = qz;
        this.terrainNormal(qx, qz);
      } else {
        break;
      }
    }
    const dEu = Math.sqrt(best);
    let dPl = (x - this.sx) * this.tnx + (y - this.sy) * this.tny + (z - this.sz) * this.tnz;
    if (dPl < 0) dPl = 0;
    let d = dPl < dEu ? dPl : dEu;
    if (d < 3) d -= P.terrainSafety;
    out.dc = d;
    out.px = this.sx;
    out.py = this.sy;
    out.pz = this.sz;
    this.finishTerrain(out);
    // Prefer the true separation direction for the normal when well defined.
    if (dEu > 0.05) {
      const inv = 1 / dEu;
      const nx = (x - this.sx) * inv;
      const ny = (y - this.sy) * inv;
      const nz = (z - this.sz) * inv;
      if (nx * this.tnx + ny * this.tny + nz * this.tnz > 0.3) {
        out.nx = nx;
        out.ny = ny;
        out.nz = nz;
      }
    }
  }

  private finishTerrain(out: ProxResult): void {
    out.nx = this.tnx;
    out.ny = this.tny;
    out.nz = this.tnz;
    // slope from the normal: cos(slope) = n_y
    out.slopeDeg = this.tny >= 1 ? 0 : slopeFromNy(this.tny);
    out.cls = this.tny < ROCK_COS ? 'rock' : 'ground';
    out.flat = this.tny > FLAT_COS;
  }

  /** Water bodies: writes into out if closer than out.dc. */
  private waterQuery(x: number, y: number, z: number, out: ProxResult): void {
    for (let i = 0; i < this.water.length; i++) {
      const w = this.water[i];
      let d: number;
      let px = x;
      let pz = z;
      if (w.grid !== undefined) {
        const wy = gridSample(w.grid, x, z);
        if (!(wy > this.sampler.height(x, z) + 0.02)) continue;
        d = y - wy;
        if (d < out.dc) {
          out.dc = d;
          out.cls = 'water';
          out.px = x;
          out.py = wy;
          out.pz = z;
          out.nx = 0;
          out.ny = 1;
          out.nz = 0;
          out.propId = -1;
          out.flat = true;
          out.slopeDeg = 0;
        }
        continue;
      } else if (w.r === undefined) {
        d = y - w.y;
      } else {
        const dx = x - (w.x ?? 0);
        const dz = z - (w.z ?? 0);
        const r = Math.sqrt(dx * dx + dz * dz);
        if (r <= w.r) {
          d = y - w.y;
        } else {
          const k = w.r / r;
          px = (w.x ?? 0) + dx * k;
          pz = (w.z ?? 0) + dz * k;
          const ex = x - px;
          const ey = y - w.y;
          const ez = z - pz;
          d = Math.sqrt(ex * ex + ey * ey + ez * ez);
        }
      }
      if (d < out.dc) {
        out.dc = d;
        out.cls = 'water';
        out.px = px;
        out.py = w.y;
        out.pz = pz;
        out.nx = 0;
        out.ny = 1;
        out.nz = 0;
        out.propId = -1;
        out.flat = true;
        out.slopeDeg = 0;
      }
    }
  }

  /** Static props + balloons within maxD: writes into out if closer than out.dc. */
  private objectQuery(x: number, y: number, z: number, maxD: number, out: ProxResult, withBalloons: boolean): void {
    const lim = out.dc < maxD ? out.dc : maxD;
    if (this.props) {
      const h = this.hit;
      this.props.nearest(x, y, z, lim, h, true);
      if (h.prim >= 0 && h.d < out.dc) {
        out.dc = h.d;
        out.cls = h.cls;
        out.nx = h.nx;
        out.ny = h.ny;
        out.nz = h.nz;
        out.px = x - h.nx * h.d;
        out.py = y - h.ny * h.d;
        out.pz = z - h.nz * h.d;
        out.propId = h.propId;
        out.flat = false;
        out.slopeDeg = 90;
      }
    }
    const bc = this.balloonCenters;
    const nb = withBalloons ? this.balloons.length : 0;
    for (let i = 0; i < nb; i++) {
      const cx = bc[i * 3];
      const cy = bc[i * 3 + 1];
      const cz = bc[i * 3 + 2];
      const dx = x - cx;
      const dy = y - cy;
      const dz = z - cz;
      const lb = Math.sqrt(dx * dx + dy * dy + dz * dz) - this.balloonBound[i];
      const cur = out.dc < maxD ? out.dc : maxD;
      if (lb >= cur) continue;
      const d = this.balloonSdf(i, x, y, z);
      if (d < out.dc && d < maxD) {
        // normal by central differences
        const e = 0.01;
        const gx = this.balloonSdf(i, x + e, y, z) - this.balloonSdf(i, x - e, y, z);
        const gy = this.balloonSdf(i, x, y + e, z) - this.balloonSdf(i, x, y - e, z);
        const gz = this.balloonSdf(i, x, y, z + e) - this.balloonSdf(i, x, y, z - e);
        const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
        out.dc = d;
        out.cls = 'balloon';
        out.nx = gx / l;
        out.ny = gy / l;
        out.nz = gz / l;
        out.px = x - out.nx * d;
        out.py = y - out.ny * d;
        out.pz = z - out.nz * d;
        out.propId = BALLOON_BASE + this.balloons[i].id;
        out.flat = false;
        out.slopeDeg = 90;
      }
    }
  }

  /** Signed distance to balloon i (envelope ellipsoid ∪ basket box) at the current time. */
  balloonSdf(i: number, x: number, y: number, z: number): number {
    const b = this.balloons[i];
    const cx = this.balloonCenters[i * 3];
    const cy = this.balloonCenters[i * 3 + 1];
    const cz = this.balloonCenters[i * 3 + 2];
    const e = sdEllipsoid(x, y, z, cx, cy, cz, b.envelopeR, b.envelopeH * 0.5, b.envelopeR);
    const by = cy - b.envelopeH * 0.5 - TUNING.balloon.basketBelow;
    const k = sdBox(x, y, z, cx, by, cz, BH[0], BH[1], BH[2], 1, 0, 0.1);
    return e < k ? e : k;
  }

  /**
   * Full proximity query (scoring, HUD, assists): nearest of terrain, props, balloons, water within maxD (45 m).
   * `out.dc` = Infinity and cls 'none' when nothing is within maxD.
   */
  query(x: number, y: number, z: number, out: ProxResult, maxD: number = P.maxD): void {
    this.terrain(x, y, z, maxD, out);
    this.waterQuery(x, y, z, out);
    if (this.hasSea && y < out.agl) out.agl = y;
    this.objectQuery(x, y, z, maxD, out, true);
    if (!(out.dc < maxD)) {
      out.dc = Infinity;
      out.cls = 'none';
      out.propId = -1;
      out.flat = false;
    }
  }

  /**
   * Collision probe for one substep position: center distance to the nearest surface when something could be
   * within `r + margin`, else +Infinity (cheap path, `out` untouched except dc). With the cheap path the true
   * center distance is guaranteed ≥ r + margin (terrain: vertical clearance > (r + margin)(1 + L)).
   */
  contact(x: number, y: number, z: number, r: number, margin: number, withBalloons: boolean, out: ProxResult): number {
    const s = this.sampler;
    const H0 = s.height(x, z);
    const dv = y - H0;
    const lim = r + margin;
    let found = false;
    out.dc = Infinity;
    out.cls = 'none';
    out.propId = -1;
    if (dv < lim * (1 + P.lipschitz)) {
      this.terrain(x, y, z, 8, out);
      found = out.dc < lim;
    }
    if (this.water.length > 0) {
      const before = out.dc;
      this.waterQuery(x, y, z, out);
      if (out.dc < before && out.dc < lim) found = true;
    }
    const before = out.dc;
    this.objectQuery(x, y, z, lim, out, withBalloons);
    if (out.dc < before) found = true;
    return found && out.dc < lim ? out.dc : Infinity;
  }
}

/** Slope in degrees from the normal's y component: atan(sqrt(1 − ny²) / ny). */
function slopeFromNy(ny: number): number {
  return atan(Math.sqrt(1 - ny * ny) / ny) / DEG;
}
