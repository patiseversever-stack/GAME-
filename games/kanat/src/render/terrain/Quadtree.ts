// CDLOD (Strugar) quadtree selection on the CPU. Allocation-free per frame: min/max height pyramid in typed arrays,
// output = Float32Array of instances (originX, originZ, size, lod) written in place.
//
// Selection rule (Strugar 2010): a node at LOD L is selected whole when it does not intersect the sphere of
// range[L-1]; otherwise its children are tried at L-1 and every child that is out of range[L-1] is emitted as a
// child-sized instance tagged with LOD L-1 (the shader then fully morphs it to LOD L density → no cracks).
// Distances are 3D (camera to node AABB incl. min/max heights), identical to the vertex-shader morph metric.

export interface QuadtreeOptions {
  /** World-space min corner and size of the root node (square). */
  rootMinX: number;
  rootMinZ: number;
  rootSize: number;
  /** Number of LOD levels (0 = finest). Root is level levels-1. */
  levels: number;
  maxInstances: number;
}

/** Conservative min/max over a world rectangle (bilinear surface, incl. margins). */
export interface HeightBounds {
  /** Writes [min, max] into out. */
  rect(x0: number, z0: number, x1: number, z1: number, out: Float64Array): void;
}

/**
 * Min/max mip pyramid over a regular height grid. Level 0 cell (i,j) = min/max of its 4 corner samples, which is
 * exact for a bilinear surface. A rectangle query reads at most 3x3 cells of the coarsest level that covers it.
 */
export class MinMaxMip {
  readonly mins: Float32Array[] = [];
  readonly maxs: Float32Array[] = [];
  readonly dims: number[] = [];
  private readonly ox: number;
  private readonly oz: number;
  private readonly sp: number;
  private readonly cells: number;

  constructor(data: Float32Array, res: number, originX: number, originZ: number, spacing: number) {
    this.ox = originX;
    this.oz = originZ;
    this.sp = spacing;
    this.cells = res - 1;
    let dim = 1;
    while (dim < this.cells) dim <<= 1;
    const mn = new Float32Array(dim * dim);
    const mx = new Float32Array(dim * dim);
    for (let j = 0; j < dim; j++) {
      const r0 = Math.min(j, res - 2);
      for (let i = 0; i < dim; i++) {
        const c0 = Math.min(i, res - 2);
        const k = r0 * res + c0;
        const a = data[k], b = data[k + 1], c = data[k + res], d = data[k + res + 1];
        mn[j * dim + i] = Math.min(a, b, c, d);
        mx[j * dim + i] = Math.max(a, b, c, d);
      }
    }
    this.mins.push(mn);
    this.maxs.push(mx);
    this.dims.push(dim);
    while (dim > 1) {
      const pd = dim;
      dim >>= 1;
      const pm = this.mins[this.mins.length - 1];
      const px = this.maxs[this.maxs.length - 1];
      const m = new Float32Array(dim * dim);
      const x = new Float32Array(dim * dim);
      for (let j = 0; j < dim; j++) {
        for (let i = 0; i < dim; i++) {
          const c0 = 2 * j * pd + 2 * i;
          m[j * dim + i] = Math.min(pm[c0], pm[c0 + 1], pm[c0 + pd], pm[c0 + pd + 1]);
          x[j * dim + i] = Math.max(px[c0], px[c0 + 1], px[c0 + pd], px[c0 + pd + 1]);
        }
      }
      this.mins.push(m);
      this.maxs.push(x);
      this.dims.push(dim);
    }
  }

  /** Min/max of the surface over [x0,x1]x[z0,z1] (edge-clamped like the sampler). Merges into out. */
  rect(x0: number, z0: number, x1: number, z1: number, out: Float64Array): void {
    const last = this.cells - 1;
    const ci0 = Math.max(0, Math.min(last, Math.floor((x0 - this.ox) / this.sp)));
    const ci1 = Math.max(0, Math.min(last, Math.floor((x1 - this.ox) / this.sp)));
    const cj0 = Math.max(0, Math.min(last, Math.floor((z0 - this.oz) / this.sp)));
    const cj1 = Math.max(0, Math.min(last, Math.floor((z1 - this.oz) / this.sp)));
    let level = 0;
    while (level < this.dims.length - 1 && ((ci1 >> level) - (ci0 >> level) > 2 || (cj1 >> level) - (cj0 >> level) > 2)) level++;
    const dim = this.dims[level];
    const mn = this.mins[level];
    const mx = this.maxs[level];
    let a = out[0];
    let b = out[1];
    for (let j = cj0 >> level; j <= cj1 >> level; j++) {
      for (let i = ci0 >> level; i <= ci1 >> level; i++) {
        const k = j * dim + i;
        if (mn[k] < a) a = mn[k];
        if (mx[k] > b) b = mx[k];
      }
    }
    out[0] = a;
    out[1] = b;
  }
}

/** Quadtree layout: root square + number of levels (0 = finest). */
export interface QuadtreeLayout {
  rootMinX: number;
  rootMinZ: number;
  rootSize: number;
  levels: number;
}

/** Frustum as 6 planes (nx, ny, nz, d) in a Float64Array(24); point p inside when n·p + d >= 0 for all. */
export type FrustumPlanes = Float64Array;

export class CdlodSelector {
  readonly ranges: Float64Array;
  readonly instances: Float32Array;
  count = 0;
  /** Count of selected nodes per LOD (debug). */
  readonly perLod: Int32Array;
  private camX = 0;
  private camY = 0;
  private camZ = 0;
  private planes: FrustumPlanes = new Float64Array(24);
  private maxDist = Infinity;

  private readonly mm = new Float64Array(2);

  constructor(
    readonly layout: QuadtreeLayout,
    readonly bounds: HeightBounds,
    readonly maxInstances: number,
    /** Added above max (detail noise) / below min. */
    readonly margin: number,
  ) {
    this.ranges = new Float64Array(layout.levels);
    this.instances = new Float32Array(maxInstances * 4);
    this.perLod = new Int32Array(layout.levels);
  }

  private nodeBounds(level: number, i: number, j: number): void {
    const L = this.layout;
    const size = L.rootSize / (1 << (L.levels - 1 - level));
    const x0 = L.rootMinX + i * size;
    const z0 = L.rootMinZ + j * size;
    this.mm[0] = Infinity;
    this.mm[1] = -Infinity;
    this.bounds.rect(x0, z0, x0 + size, z0 + size, this.mm);
    this.mm[0] -= this.margin;
    this.mm[1] += this.margin;
  }

  /** range[L] = lod0Radius * 2^L (distance ratio 2). */
  setRanges(lod0Radius: number): void {
    for (let l = 0; l < this.ranges.length; l++) this.ranges[l] = lod0Radius * Math.pow(2, l);
  }

  select(camX: number, camY: number, camZ: number, planes: FrustumPlanes, maxDist: number): number {
    this.camX = camX;
    this.camY = camY;
    this.camZ = camZ;
    this.planes = planes;
    this.maxDist = maxDist;
    this.count = 0;
    this.perLod.fill(0);
    const top = this.layout.levels - 1;
    this.selectNode(top, 0, 0);
    return this.count;
  }

  private nodeDist2(level: number, i: number, j: number): number {
    const L = this.layout;
    const size = L.rootSize / (1 << (L.levels - 1 - level));
    const x0 = L.rootMinX + i * size;
    const z0 = L.rootMinZ + j * size;
    this.nodeBounds(level, i, j);
    const y0 = this.mm[0];
    const y1 = this.mm[1];
    const dx = this.camX < x0 ? x0 - this.camX : this.camX > x0 + size ? this.camX - x0 - size : 0;
    const dz = this.camZ < z0 ? z0 - this.camZ : this.camZ > z0 + size ? this.camZ - z0 - size : 0;
    const dy = this.camY < y0 ? y0 - this.camY : this.camY > y1 ? this.camY - y1 : 0;
    return dx * dx + dy * dy + dz * dz;
  }

  private inFrustum(level: number, i: number, j: number): boolean {
    const L = this.layout;
    const size = L.rootSize / (1 << (L.levels - 1 - level));
    const x0 = L.rootMinX + i * size;
    const z0 = L.rootMinZ + j * size;
    this.nodeBounds(level, i, j);
    const y0 = this.mm[0] - 40; // node skirts
    const y1 = this.mm[1];
    const pl = this.planes;
    for (let q = 0; q < 6; q++) {
      const nx = pl[q * 4];
      const ny = pl[q * 4 + 1];
      const nz = pl[q * 4 + 2];
      const d = pl[q * 4 + 3];
      // Positive vertex.
      const px = nx >= 0 ? x0 + size : x0;
      const py = ny >= 0 ? y1 : y0;
      const pz = nz >= 0 ? z0 + size : z0;
      if (nx * px + ny * py + nz * pz + d < 0) return false;
    }
    return true;
  }

  private emit(level: number, i: number, j: number, lodTag: number): void {
    if (this.count >= this.maxInstances) return;
    const L = this.layout;
    const size = L.rootSize / (1 << (L.levels - 1 - level));
    const o = this.count * 4;
    this.instances[o] = L.rootMinX + i * size;
    this.instances[o + 1] = L.rootMinZ + j * size;
    this.instances[o + 2] = size;
    this.instances[o + 3] = lodTag;
    this.perLod[lodTag]++;
    this.count++;
  }

  /** Returns false when the node is out of its LOD range (parent must cover it). */
  private selectNode(level: number, i: number, j: number): boolean {
    const d2 = this.nodeDist2(level, i, j);
    const r = this.ranges[level];
    if (d2 > r * r) return false;
    if (d2 > this.maxDist * this.maxDist) return true; // beyond view distance: fully fogged, skip
    if (!this.inFrustum(level, i, j)) return true;
    if (level === 0) {
      this.emit(0, i, j, 0);
      return true;
    }
    const rc = this.ranges[level - 1];
    if (d2 > rc * rc) {
      this.emit(level, i, j, level);
      return true;
    }
    const ci = i * 2;
    const cj = j * 2;
    for (let q = 0; q < 4; q++) {
      const ii = ci + (q & 1);
      const jj = cj + (q >> 1);
      if (!this.selectNode(level - 1, ii, jj)) {
        // Child out of the finer range: draw the child area at this level's density (tag level-1, morph = 1).
        if (this.inFrustum(level - 1, ii, jj)) this.emit(level - 1, ii, jj, level - 1);
      }
    }
    return true;
  }
}

/** Extract frustum planes from a projection*view matrix (column-major Float32/64 array of 16). */
export function frustumPlanesFrom(m: ArrayLike<number>, out: FrustumPlanes): FrustumPlanes {
  const me = m;
  const set = (q: number, a: number, b: number, c: number, d: number) => {
    const l = Math.hypot(a, b, c) || 1;
    out[q * 4] = a / l;
    out[q * 4 + 1] = b / l;
    out[q * 4 + 2] = c / l;
    out[q * 4 + 3] = d / l;
  };
  const m0 = me[0], m1 = me[1], m2 = me[2], m3 = me[3];
  const m4 = me[4], m5 = me[5], m6 = me[6], m7 = me[7];
  const m8 = me[8], m9 = me[9], m10 = me[10], m11 = me[11];
  const m12 = me[12], m13 = me[13], m14 = me[14], m15 = me[15];
  set(0, m3 - m0, m7 - m4, m11 - m8, m15 - m12);
  set(1, m3 + m0, m7 + m4, m11 + m8, m15 + m12);
  set(2, m3 + m1, m7 + m5, m11 + m9, m15 + m13);
  set(3, m3 - m1, m7 - m5, m11 - m9, m15 - m13);
  set(4, m3 - m2, m7 - m6, m11 - m10, m15 - m14);
  set(5, m3 + m2, m7 + m6, m11 + m10, m15 + m14);
  return out;
}
