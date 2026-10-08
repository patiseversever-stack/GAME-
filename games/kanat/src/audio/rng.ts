// Small seeded PRNG (mulberry32) for deterministic sound generation.
// Audio is not part of the deterministic sim, but seeded generation makes every build sound identical
// and lets unit tests assert exact properties of generated buffers.

export class Rng {
  s: number;

  constructor(seed: number) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  }

  /** Uniform in [0, 1). */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform in [a, b). */
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** Uniform in [-1, 1). */
  bi(): number {
    return this.next() * 2 - 1;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}
