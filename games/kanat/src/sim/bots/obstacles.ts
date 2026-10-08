// Obstacle-top height field for bots and route tooling (owner: routes agent). PURE, deterministic.
//
// The terrain sampler only knows the ground; props (fairy chimneys, trees, houses, columns, cornices …) stand on
// it. A bot that wants to fly "4 m above the surface" must see the top of whatever is under it, exactly like a
// player sees the chimney ahead. This raster stores, per 8 m cell, the highest collision-primitive top whose
// horizontal footprint (+ a margin) touches the cell. Built once per world from the same PropInstance list the
// sim collides with (buildProps / buildWorldContent), so it can never disagree with the collision geometry.
//
// surfaceTop(x, z) = max(terrain H(x,z), sea level (when the world has a sea), prop top in the cell).

import type { TerrainSampler } from '../terrain/types.ts';
import type { PropInstance } from '../types.ts';

const NONE = -1e9;

export class ObstacleField {
  readonly cell: number;
  readonly ox: number;
  readonly oz: number;
  readonly nx: number;
  readonly nz: number;
  /** Highest prop top per cell (NONE where no prop). */
  readonly top: Float32Array;
  readonly sampler: TerrainSampler;
  readonly hasSea: boolean;
  readonly propCount: number;

  constructor(sampler: TerrainSampler, props: readonly PropInstance[], hasSea: boolean, cell = 8, margin = 1.5) {
    this.sampler = sampler;
    this.hasSea = hasSea;
    this.cell = cell;
    this.propCount = props.length;
    // bounds of all prop footprints (empty world → 1×1 grid)
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      for (let k = 0; k < p.prims.length; k++) {
        const b = primBounds(p.prims[k]);
        if (b[0] - b[3] < minX) minX = b[0] - b[3];
        if (b[0] + b[3] > maxX) maxX = b[0] + b[3];
        if (b[1] - b[3] < minZ) minZ = b[1] - b[3];
        if (b[1] + b[3] > maxZ) maxZ = b[1] + b[3];
      }
    }
    if (!(minX < maxX)) {
      minX = 0;
      maxX = cell;
      minZ = 0;
      maxZ = cell;
    }
    this.ox = Math.floor((minX - margin) / cell) * cell;
    this.oz = Math.floor((minZ - margin) / cell) * cell;
    this.nx = Math.floor((maxX + margin - this.ox) / cell) + 2;
    this.nz = Math.floor((maxZ + margin - this.oz) / cell) + 2;
    this.top = new Float32Array(this.nx * this.nz).fill(NONE);
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      for (let k = 0; k < p.prims.length; k++) {
        const pr = p.prims[k];
        if (pr.kind === 'capsule') {
          // rasterize along the segment (trunks are vertical, arch/beam capsules are not)
          const dx = pr.b[0] - pr.a[0];
          const dz = pr.b[2] - pr.a[2];
          const len = Math.sqrt(dx * dx + dz * dz);
          const steps = Math.max(1, Math.ceil(len / (cell * 0.5)));
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const y = pr.a[1] + (pr.b[1] - pr.a[1]) * t + pr.r;
            this.disc(pr.a[0] + dx * t, pr.a[2] + dz * t, pr.r + margin, y);
          }
        } else {
          const b = primBounds(pr);
          this.disc(b[0], b[1], b[3] + margin, b[2]);
        }
      }
    }
  }

  private disc(cx: number, cz: number, r: number, y: number): void {
    const c = this.cell;
    const i0 = Math.max(0, Math.floor((cx - r - this.ox) / c));
    const i1 = Math.min(this.nx - 1, Math.floor((cx + r - this.ox) / c));
    const j0 = Math.max(0, Math.floor((cz - r - this.oz) / c));
    const j1 = Math.min(this.nz - 1, Math.floor((cz + r - this.oz) / c));
    const rr = (r + c * 0.7072) * (r + c * 0.7072);
    for (let j = j0; j <= j1; j++) {
      const z = this.oz + (j + 0.5) * c - cz;
      for (let i = i0; i <= i1; i++) {
        const x = this.ox + (i + 0.5) * c - cx;
        if (x * x + z * z > rr) continue;
        const k = j * this.nx + i;
        if (y > this.top[k]) this.top[k] = y;
      }
    }
  }

  /** Highest prop top over the cell containing (x, z), or −1e9. */
  propTop(x: number, z: number): number {
    const i = Math.floor((x - this.ox) / this.cell);
    const j = Math.floor((z - this.oz) / this.cell);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return NONE;
    return this.top[j * this.nx + i];
  }

  /** Highest solid surface at (x, z): terrain, sea plane, prop tops. */
  surfaceTop(x: number, z: number): number {
    let h = this.sampler.height(x, z);
    if (this.hasSea && h < 0) h = 0;
    const p = this.propTop(x, z);
    return p > h ? p : h;
  }
}

/** [cx, cz, topY, horizontal radius] of one collision primitive. */
function primBounds(pr: PropInstance['prims'][number]): [number, number, number, number] {
  switch (pr.kind) {
    case 'capsule': {
      const cx = (pr.a[0] + pr.b[0]) * 0.5;
      const cz = (pr.a[2] + pr.b[2]) * 0.5;
      const dx = pr.b[0] - pr.a[0];
      const dz = pr.b[2] - pr.a[2];
      return [cx, cz, (pr.a[1] > pr.b[1] ? pr.a[1] : pr.b[1]) + pr.r, Math.sqrt(dx * dx + dz * dz) * 0.5 + pr.r];
    }
    case 'cone':
      return [pr.base[0], pr.base[2], pr.base[1] + pr.h, pr.r0 > pr.r1 ? pr.r0 : pr.r1];
    case 'ellipsoid':
      return [pr.c[0], pr.c[2], pr.c[1] + pr.r[1], pr.r[0] > pr.r[2] ? pr.r[0] : pr.r[2]];
    case 'box': {
      const hr = Math.sqrt(pr.h[0] * pr.h[0] + pr.h[2] * pr.h[2]) + pr.round;
      return [pr.c[0], pr.c[2], pr.c[1] + pr.h[1] + pr.round, hr];
    }
  }
}

/** Terrain-only surface (no props): used when a caller has no prop list. */
export function terrainTop(sampler: TerrainSampler, hasSea: boolean, x: number, z: number): number {
  const h = sampler.height(x, z);
  return hasSea && h < 0 ? 0 : h;
}
