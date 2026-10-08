// Allocation-free sliding window with percentiles (ring buffer + preallocated sort scratch).

export class SlidingWindow {
  private readonly buf: Float32Array;
  private readonly scratch: Float32Array;
  private n = 0;
  private head = 0;

  constructor(capacity: number) {
    this.buf = new Float32Array(capacity);
    this.scratch = new Float32Array(capacity);
  }

  push(v: number): void {
    this.buf[this.head] = v;
    this.head = (this.head + 1) % this.buf.length;
    if (this.n < this.buf.length) this.n++;
  }

  get size(): number {
    return this.n;
  }

  get capacity(): number {
    return this.buf.length;
  }

  clear(): void {
    this.n = 0;
    this.head = 0;
  }

  /** Percentiles computed together from one sort. `out` receives values for each p in `ps` (0..1). */
  percentiles(ps: readonly number[], out: Float64Array | number[]): void {
    if (this.n === 0) {
      for (let i = 0; i < ps.length; i++) out[i] = NaN;
      return;
    }
    const s = this.scratch.subarray(0, this.n);
    // the ring is contiguous in its first n slots when not yet full, otherwise the whole buffer
    s.set(this.n === this.buf.length ? this.buf : this.buf.subarray(0, this.n));
    s.sort();
    for (let i = 0; i < ps.length; i++) {
      const idx = Math.min(this.n - 1, Math.max(0, Math.round(ps[i] * (this.n - 1))));
      out[i] = s[idx];
    }
  }

  percentile(p: number): number {
    if (this.n === 0) return NaN;
    const s = this.scratch.subarray(0, this.n);
    s.set(this.n === this.buf.length ? this.buf : this.buf.subarray(0, this.n));
    s.sort();
    return s[Math.min(this.n - 1, Math.max(0, Math.round(p * (this.n - 1))))];
  }

  mean(): number {
    if (this.n === 0) return NaN;
    let sum = 0;
    for (let i = 0; i < this.n; i++) sum += this.buf[i];
    return sum / this.n;
  }
}
