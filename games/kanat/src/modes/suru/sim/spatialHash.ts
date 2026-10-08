// Uniform-grid spatial hash rebuilt every tick with a counting sort (count → prefix sum → scatter).
// O(N), stable (birds inside a cell stay in index order) and therefore deterministic (§4.G.10). PURE.

export class SpatialHash {
  readonly half: number;
  readonly cell: number;
  readonly invCell: number;
  readonly dim: number;
  readonly cellCount: number;
  readonly cellStart: Uint32Array;
  readonly sorted: Uint16Array;
  readonly cellOf: Uint32Array;
  private readonly fill: Uint32Array;
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
  }

  cellX(x: number): number {
    let c = Math.floor((x + this.half) * this.invCell);
    if (c < 0) c = 0;
    else if (c >= this.dim) c = this.dim - 1;
    return c;
  }

  build(posX: Float32Array, posZ: Float32Array, n: number): void {
    const dim = this.dim;
    const start = this.cellStart;
    const fill = this.fill;
    const cellOf = this.cellOf;
    start.fill(0);
    for (let i = 0; i < n; i++) {
      const c = this.cellX(posZ[i]) * dim + this.cellX(posX[i]);
      cellOf[i] = c;
      start[c + 1]++;
    }
    for (let c = 0; c < this.cellCount; c++) start[c + 1] += start[c];
    fill.set(start.subarray(0, this.cellCount));
    const sorted = this.sorted;
    for (let i = 0; i < n; i++) {
      const c = cellOf[i];
      sorted[fill[c]++] = i;
    }
    this.count = n;
  }

  /**
   * Collect up to `cap` birds (≠ self) within radius r of (x, z) into out/outD2; returns the count.
   * Cell visiting order rotates with `rot` (deterministic) so a capped scan has no fixed directional bias.
   */
  query(
    x: number,
    z: number,
    r: number,
    self: number,
    posX: Float32Array,
    posZ: Float32Array,
    cap: number,
    rot: number,
    out: Uint16Array | Uint32Array,
    outD2: Float32Array | Float64Array,
    outOffset: number,
  ): number {
    const r2 = r * r;
    const dim = this.dim;
    const reach = Math.ceil(r * this.invCell);
    const cx = this.cellX(x);
    const cz = this.cellX(z);
    const side = 2 * reach + 1;
    const total = side * side;
    const centre = (total - 1) >> 1;
    let n = 0;
    const start = this.cellStart;
    const sorted = this.sorted;
    // visit own cell first, then the others in a rotated order
    for (let k = 0; k < total; k++) {
      let idx: number;
      if (k === 0) idx = centre;
      else {
        idx = (k - 1 + rot) % (total - 1);
        if (idx >= centre) idx++;
      }
      const gz = cz + Math.floor(idx / side) - reach;
      const gx = cx + (idx % side) - reach;
      if (gx < 0 || gz < 0 || gx >= dim || gz >= dim) continue;
      const c = gz * dim + gx;
      const s = start[c];
      const e = start[c + 1];
      const len = e - s;
      if (len === 0) continue;
      const off = k === 0 ? (rot % len) : 0;
      for (let t = 0; t < len; t++) {
        let p = s + t + off;
        if (p >= e) p -= len;
        const j = sorted[p];
        if (j === self) continue;
        const dx = posX[j] - x;
        const dz = posZ[j] - z;
        const d2 = dx * dx + dz * dz;
        if (d2 < r2) {
          out[outOffset + n] = j;
          outD2[outOffset + n] = d2;
          n++;
          if (n >= cap) return n;
        }
      }
    }
    return n;
  }
}
