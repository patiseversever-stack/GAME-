// Static prop collision index (brief §4.G.6 step 2): uniform 32 m grid spatial hash over the XZ plane,
// primitives stored struct-of-arrays in typed arrays, CSR cell lists, per-query dedupe stamps.
// Dynamic balloons are NOT in this index (see balloons.ts / proximity.ts).
// PURE, allocation-free queries.

import { TUNING } from '../data/tuning.ts';
import { cos, sin } from '../math/detMath.ts';
import type { PropInstance, PropPrimitive, SurfaceClass } from '../types.ts';
import { sdBox, sdCapsule, sdCone, sdEllipsoid } from './sdf.ts';

export const PRIM_CAPSULE = 0;
export const PRIM_CONE = 1;
export const PRIM_ELLIPSOID = 2;
export const PRIM_BOX = 3;

/** Floats per primitive in `data`: [0..11] shape params, [12..15] bounding sphere (x, y, z, r). */
const STRIDE = 16;

/** Result of a nearest-primitive query. */
export interface PropHit {
  d: number; // signed distance from the query point (center) to the primitive surface
  prim: number; // primitive index, -1 if none
  propId: number;
  cls: SurfaceClass;
  nx: number; // outward unit normal at the nearest point
  ny: number;
  nz: number;
}

export function newPropHit(): PropHit {
  return { d: Infinity, prim: -1, propId: -1, cls: 'none', nx: 0, ny: 1, nz: 0 };
}

export class PropIndex {
  readonly count: number;
  readonly kind: Uint8Array;
  readonly data: Float64Array;
  readonly propId: Int32Array;
  readonly isTree: Uint8Array;
  private readonly cell: number;
  private readonly ox: number;
  private readonly oz: number;
  private readonly nx: number;
  private readonly nz: number;
  private readonly cellStart: Int32Array;
  private readonly cellItems: Int32Array;
  private readonly stamp: Uint32Array;
  private stampId = 0;

  constructor(props: readonly PropInstance[], cellSize: number = TUNING.prox.propCell) {
    let n = 0;
    for (let i = 0; i < props.length; i++) n += props[i].prims.length;
    this.count = n;
    this.kind = new Uint8Array(n);
    this.data = new Float64Array(n * STRIDE);
    this.propId = new Int32Array(n);
    this.isTree = new Uint8Array(n);
    this.stamp = new Uint32Array(n);
    this.cell = cellSize;
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    let k = 0;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      for (let j = 0; j < p.prims.length; j++) {
        this.encode(k, p.prims[j]);
        this.propId[k] = p.id;
        this.isTree[k] = p.type === 'tree' ? 1 : 0;
        const o = k * STRIDE;
        const bx = this.data[o + 12];
        const bz = this.data[o + 14];
        const br = this.data[o + 15];
        if (bx - br < minX) minX = bx - br;
        if (bz - br < minZ) minZ = bz - br;
        if (bx + br > maxX) maxX = bx + br;
        if (bz + br > maxZ) maxZ = bz + br;
        k++;
      }
    }
    if (n === 0) {
      minX = 0;
      minZ = 0;
      maxX = cellSize;
      maxZ = cellSize;
    }
    this.ox = Math.floor(minX / cellSize) * cellSize;
    this.oz = Math.floor(minZ / cellSize) * cellSize;
    this.nx = Math.max(1, Math.floor((maxX - this.ox) / cellSize) + 1);
    this.nz = Math.max(1, Math.floor((maxZ - this.oz) / cellSize) + 1);
    const ncell = this.nx * this.nz;
    const counts = new Int32Array(ncell + 1);
    for (let i = 0; i < n; i++) this.forCells(i, (c) => counts[c + 1]++);
    for (let c = 0; c < ncell; c++) counts[c + 1] += counts[c];
    this.cellStart = counts;
    this.cellItems = new Int32Array(counts[ncell]);
    const fill = new Int32Array(ncell);
    for (let i = 0; i < n; i++)
      this.forCells(i, (c) => {
        this.cellItems[counts[c] + fill[c]++] = i;
      });
  }

  /** Iterate the grid cells overlapped by primitive i's bounding sphere footprint (build time only). */
  private forCells(i: number, fn: (c: number) => void): void {
    const o = i * STRIDE;
    const bx = this.data[o + 12];
    const bz = this.data[o + 14];
    const br = this.data[o + 15];
    const x0 = Math.max(0, Math.floor((bx - br - this.ox) / this.cell));
    const x1 = Math.min(this.nx - 1, Math.floor((bx + br - this.ox) / this.cell));
    const z0 = Math.max(0, Math.floor((bz - br - this.oz) / this.cell));
    const z1 = Math.min(this.nz - 1, Math.floor((bz + br - this.oz) / this.cell));
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) fn(cz * this.nx + cx);
  }

  private encode(k: number, p: PropPrimitive): void {
    const d = this.data;
    const o = k * STRIDE;
    switch (p.kind) {
      case 'capsule': {
        this.kind[k] = PRIM_CAPSULE;
        d[o] = p.a[0];
        d[o + 1] = p.a[1];
        d[o + 2] = p.a[2];
        d[o + 3] = p.b[0];
        d[o + 4] = p.b[1];
        d[o + 5] = p.b[2];
        d[o + 6] = p.r;
        const hx = 0.5 * (p.b[0] - p.a[0]);
        const hy = 0.5 * (p.b[1] - p.a[1]);
        const hz = 0.5 * (p.b[2] - p.a[2]);
        d[o + 12] = p.a[0] + hx;
        d[o + 13] = p.a[1] + hy;
        d[o + 14] = p.a[2] + hz;
        d[o + 15] = Math.sqrt(hx * hx + hy * hy + hz * hz) + p.r;
        break;
      }
      case 'cone': {
        this.kind[k] = PRIM_CONE;
        d[o] = p.base[0];
        d[o + 1] = p.base[1];
        d[o + 2] = p.base[2];
        d[o + 3] = p.h;
        d[o + 4] = p.r0;
        d[o + 5] = p.r1;
        const rm = p.r0 > p.r1 ? p.r0 : p.r1;
        d[o + 12] = p.base[0];
        d[o + 13] = p.base[1] + 0.5 * p.h;
        d[o + 14] = p.base[2];
        d[o + 15] = Math.sqrt(rm * rm + 0.25 * p.h * p.h);
        break;
      }
      case 'ellipsoid': {
        this.kind[k] = PRIM_ELLIPSOID;
        d[o] = p.c[0];
        d[o + 1] = p.c[1];
        d[o + 2] = p.c[2];
        d[o + 3] = p.r[0];
        d[o + 4] = p.r[1];
        d[o + 5] = p.r[2];
        d[o + 12] = p.c[0];
        d[o + 13] = p.c[1];
        d[o + 14] = p.c[2];
        d[o + 15] = Math.max(p.r[0], p.r[1], p.r[2]);
        break;
      }
      case 'box': {
        this.kind[k] = PRIM_BOX;
        d[o] = p.c[0];
        d[o + 1] = p.c[1];
        d[o + 2] = p.c[2];
        d[o + 3] = p.h[0];
        d[o + 4] = p.h[1];
        d[o + 5] = p.h[2];
        d[o + 6] = cos(p.yaw);
        d[o + 7] = sin(p.yaw);
        d[o + 8] = p.round;
        d[o + 12] = p.c[0];
        d[o + 13] = p.c[1];
        d[o + 14] = p.c[2];
        d[o + 15] = Math.sqrt(p.h[0] * p.h[0] + p.h[1] * p.h[1] + p.h[2] * p.h[2]);
        break;
      }
    }
  }

  /** Signed distance from (x,y,z) to primitive i. */
  sdf(i: number, x: number, y: number, z: number): number {
    const d = this.data;
    const o = i * STRIDE;
    switch (this.kind[i]) {
      case PRIM_CAPSULE:
        return sdCapsule(x, y, z, d[o], d[o + 1], d[o + 2], d[o + 3], d[o + 4], d[o + 5], d[o + 6]);
      case PRIM_CONE:
        return sdCone(x, y, z, d[o], d[o + 1], d[o + 2], d[o + 3], d[o + 4], d[o + 5]);
      case PRIM_ELLIPSOID:
        return sdEllipsoid(x, y, z, d[o], d[o + 1], d[o + 2], d[o + 3], d[o + 4], d[o + 5]);
      default:
        return sdBox(x, y, z, d[o], d[o + 1], d[o + 2], d[o + 3], d[o + 4], d[o + 5], d[o + 6], d[o + 7], d[o + 8]);
    }
  }

  /**
   * Nearest primitive to (x,y,z) among those whose bounding sphere comes within `maxD`.
   * Fills `out` (d = Infinity when nothing within maxD). With `withNormal`, also computes the SDF gradient.
   */
  nearest(x: number, y: number, z: number, maxD: number, out: PropHit, withNormal: boolean): void {
    out.d = Infinity;
    out.prim = -1;
    out.propId = -1;
    out.cls = 'none';
    if (this.count === 0) return;
    const cs = this.cell;
    const x0 = Math.max(0, Math.floor((x - maxD - this.ox) / cs));
    const x1 = Math.min(this.nx - 1, Math.floor((x + maxD - this.ox) / cs));
    const z0 = Math.max(0, Math.floor((z - maxD - this.oz) / cs));
    const z1 = Math.min(this.nz - 1, Math.floor((z + maxD - this.oz) / cs));
    if (x0 > x1 || z0 > z1) return;
    let sid = (this.stampId + 1) >>> 0;
    if (sid === 0) {
      this.stamp.fill(0);
      sid = 1;
    }
    this.stampId = sid;
    let best = maxD;
    let bi = -1;
    const data = this.data;
    const items = this.cellItems;
    const start = this.cellStart;
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = cz * this.nx + cx;
        const e = start[c + 1];
        for (let j = start[c]; j < e; j++) {
          const i = items[j];
          if (this.stamp[i] === sid) continue;
          this.stamp[i] = sid;
          const o = i * STRIDE + 12;
          const dx = x - data[o];
          const dy = y - data[o + 1];
          const dz = z - data[o + 2];
          const lb = Math.sqrt(dx * dx + dy * dy + dz * dz) - data[o + 3];
          if (lb >= best) continue;
          const s = this.sdf(i, x, y, z);
          if (s < best) {
            best = s;
            bi = i;
          }
        }
      }
    }
    if (bi < 0) return;
    out.d = best;
    out.prim = bi;
    out.propId = this.propId[bi];
    out.cls = this.isTree[bi] === 1 ? 'tree' : 'prop';
    if (withNormal) this.gradient(bi, x, y, z, out);
  }

  /** Unit SDF gradient of primitive i at (x,y,z) by central differences (6 evaluations). */
  gradient(i: number, x: number, y: number, z: number, out: PropHit): void {
    const e = 0.01;
    const gx = this.sdf(i, x + e, y, z) - this.sdf(i, x - e, y, z);
    const gy = this.sdf(i, x, y + e, z) - this.sdf(i, x, y - e, z);
    const gz = this.sdf(i, x, y, z + e) - this.sdf(i, x, y, z - e);
    const l = Math.sqrt(gx * gx + gy * gy + gz * gz);
    if (l > 1e-12) {
      out.nx = gx / l;
      out.ny = gy / l;
      out.nz = gz / l;
    } else {
      out.nx = 0;
      out.ny = 1;
      out.nz = 0;
    }
  }

  /** Brute-force nearest over every primitive (tests / reference only). */
  nearestBrute(x: number, y: number, z: number): { d: number; prim: number } {
    let best = Infinity;
    let bi = -1;
    for (let i = 0; i < this.count; i++) {
      const s = this.sdf(i, x, y, z);
      if (s < best) {
        best = s;
        bi = i;
      }
    }
    return { d: best, prim: bi };
  }
}
