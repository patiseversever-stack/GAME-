// Uniform-grid spatial hash rebuilt every tick with a counting sort (count → prefix sum → scatter).
// O(N), stable (birds inside a cell stay in index order) and therefore deterministic (§4.G.10). PURE.
// The build also copies positions/velocities/owners into cell-sorted order so neighbour scans read
// contiguous memory (and see the pre-move state even while the sim integrates in place).

export class SpatialHash {
  readonly half: number;
  readonly cell: number;
  readonly invCell: number;
  readonly dim: number;
  readonly cellCount: number;
  readonly cellStart: Uint32Array;
  readonly sorted: Uint16Array;
  readonly cellOf: Uint32Array;
  readonly sortedX: Float64Array;
  readonly sortedZ: Float64Array;
  readonly sortedVX: Float64Array;
  readonly sortedVZ: Float64Array;
  readonly sortedO: Uint8Array;
  private readonly fill: Uint32Array;
  /** nearest-first 8-neighbour orders, one per sub-cell quadrant (dx, dz pairs) */
  private readonly ordDX = new Int32Array(32);
  private readonly ordDZ = new Int32Array(32);
  count = 0;

  constructor(half: number, cell: number, capacity: number) {
    this.half = half;
    this.cell = cell;
    this.invCell = 1 / cell;
    this.dim = Math.ceil((2 * half) / cell);
    this.cellCount = this.dim * this.dim;
    this.cellStart = new Uint32Array(this.cellCount + 1);
    this.fill = new Uint32Array(this.cellCount);
    this.sorted = new Uint16Array(capacity);
    this.cellOf = new Uint32Array(capacity);
    this.sortedX = new Float64Array(capacity);
    this.sortedZ = new Float64Array(capacity);
    this.sortedVX = new Float64Array(capacity);
    this.sortedVZ = new Float64Array(capacity);
    this.sortedO = new Uint8Array(capacity);
    for (let q = 0; q < 4; q++) {
      const sx = q & 1 ? 1 : -1;
      const sz = q & 2 ? 1 : -1;
      const ord = [sx, 0, 0, sz, sx, sz, -sx, 0, 0, -sz, -sx, sz, sx, -sz, -sx, -sz];
      for (let k = 0; k < 8; k++) {
        this.ordDX[q * 8 + k] = ord[k * 2];
        this.ordDZ[q * 8 + k] = ord[k * 2 + 1];
      }
    }
  }

  cellX(x: number): number {
    let c = Math.floor((x + this.half) * this.invCell);
    if (c < 0) c = 0;
    else if (c >= this.dim) c = this.dim - 1;
    return c;
  }

  build(posX: Float32Array, posZ: Float32Array, n: number, velX?: Float32Array, velZ?: Float32Array, owner?: Uint8Array): void {
    const dim = this.dim;
    const start = this.cellStart;
    const fill = this.fill;
    const cellOf = this.cellOf;
    const half = this.half;
    const inv = this.invCell;
    const top = dim - 1;
    start.fill(0);
    for (let i = 0; i < n; i++) {
      let cx = Math.floor((posX[i] + half) * inv);
      let cz = Math.floor((posZ[i] + half) * inv);
      cx = cx < 0 ? 0 : cx > top ? top : cx;
      cz = cz < 0 ? 0 : cz > top ? top : cz;
      const c = cz * dim + cx;
      cellOf[i] = c;
      start[c + 1]++;
    }
    for (let c = 0; c < this.cellCount; c++) start[c + 1] += start[c];
    fill.set(start.subarray(0, this.cellCount));
    const sorted = this.sorted;
    const sx = this.sortedX;
    const sz = this.sortedZ;
    for (let i = 0; i < n; i++) {
      const p = fill[cellOf[i]]++;
      sorted[p] = i;
      sx[p] = posX[i];
      sz[p] = posZ[i];
    }
    if (velX && velZ && owner) {
      const svx = this.sortedVX;
      const svz = this.sortedVZ;
      const so = this.sortedO;
      for (let p = 0; p < n; p++) {
        const i = sorted[p];
        svx[p] = velX[i];
        svz[p] = velZ[i];
        so[p] = owner[i];
      }
    }
    this.count = n;
  }

  /**
   * Cell ranges of the 3×3 block around (x, z), own cell first then nearest-first by sub-cell quadrant.
   * Writes [start, end) pairs into rs/re and returns how many. Used by queryNear and the sim's fused pass.
   */
  cellRanges(x: number, z: number, rs: Uint32Array, re: Uint32Array): number {
    const dim = this.dim;
    const fx = (x + this.half) * this.invCell;
    const fz = (z + this.half) * this.invCell;
    let cx = Math.floor(fx);
    let cz = Math.floor(fz);
    const top = dim - 1;
    const quad = (fx - cx >= 0.5 ? 1 : 0) | (fz - cz >= 0.5 ? 2 : 0);
    cx = cx < 0 ? 0 : cx > top ? top : cx;
    cz = cz < 0 ? 0 : cz > top ? top : cz;
    const start = this.cellStart;
    let c = cz * dim + cx;
    rs[0] = start[c];
    re[0] = start[c + 1];
    let nr = 1;
    const ob = quad * 8;
    for (let k = 0; k < 8; k++) {
      const gx = cx + this.ordDX[ob + k];
      const gz = cz + this.ordDZ[ob + k];
      if (gx < 0 || gz < 0 || gx > top || gz > top) continue;
      c = gz * dim + gx;
      const s = start[c];
      const e = start[c + 1];
      if (s === e) continue;
      rs[nr] = s;
      re[nr] = e;
      nr++;
    }
    return nr;
  }

  private readonly rs = new Uint32Array(9);
  private readonly re = new Uint32Array(9);

  /**
   * r ≤ cell: up to `cap` birds (≠ self) within √r2 of (x, z), scanning cells nearest-first; each cell
   * starts at a rotated offset (deterministic, removes index-order bias when the cap is hit).
   */
  queryNear(x: number, z: number, r2: number, self: number, cap: number, rot: number, out: Uint16Array, outD2: Float32Array, outOffset: number): number {
    const rs = this.rs;
    const re = this.re;
    const nr = this.cellRanges(x, z, rs, re);
    const sorted = this.sorted;
    const sx = this.sortedX;
    const sz = this.sortedZ;
    let n = 0;
    for (let r = 0; r < nr; r++) {
      const s = rs[r];
      const e = re[r];
      const len = e - s;
      let p = s + (((rot & 0xff) * len) >>> 8);
      for (let t = 0; t < len; t++) {
        const j = sorted[p];
        const dx = sx[p] - x;
        const dz = sz[p] - z;
        if (++p >= e) p = s;
        if (j === self) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 < r2) {
          out[outOffset + n] = j;
          outD2[outOffset + n] = d2;
          if (++n >= cap) return n;
        }
      }
    }
    return n;
  }

  /**
   * General radius query (any r): up to `cap` birds (≠ self) within r of (x, z), cells in raster order.
   */
  query(
    x: number,
    z: number,
    r: number,
    self: number,
    cap: number,
    out: Uint16Array | Uint32Array,
    outD2: Float32Array | Float64Array,
    outOffset: number,
  ): number {
    const r2 = r * r;
    const dim = this.dim;
    const reach = Math.ceil(r * this.invCell);
    const cx = this.cellX(x);
    const cz = this.cellX(z);
    const start = this.cellStart;
    const sorted = this.sorted;
    const sx = this.sortedX;
    const sz = this.sortedZ;
    let n = 0;
    const z0 = cz - reach < 0 ? 0 : cz - reach;
    const z1 = cz + reach >= dim ? dim - 1 : cz + reach;
    const x0 = cx - reach < 0 ? 0 : cx - reach;
    const x1 = cx + reach >= dim ? dim - 1 : cx + reach;
    for (let gz = z0; gz <= z1; gz++) {
      for (let gx = x0; gx <= x1; gx++) {
        const c = gz * dim + gx;
        const e = start[c + 1];
        for (let p = start[c]; p < e; p++) {
          const dx = sx[p] - x;
          const dz = sz[p] - z;
          const d2 = dx * dx + dz * dz;
          if (d2 < r2) {
            const j = sorted[p];
            if (j === self) continue;
            out[outOffset + n] = j;
            outD2[outOffset + n] = d2;
            if (++n >= cap) return n;
          }
        }
      }
    }
    return n;
  }
}
