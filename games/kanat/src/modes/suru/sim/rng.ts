// Seeded PRNG for the SÜRÜ.io sim: xoshiro128** with splitmix32 seeding (BRIEF §4.3, §4.G.8).
// One independent stream per system (layout, wild, conversion, hawk, gust, storm, AI…). PURE.

function splitmix32(state: { s: number }): number {
  state.s = (state.s + 0x9e3779b9) | 0;
  let z = state.s;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

export class Rng {
  a = 0;
  b = 0;
  c = 0;
  d = 0;

  constructor(seed: number, stream: number) {
    this.reseed(seed, stream);
  }

  reseed(seed: number, stream: number): void {
    const st = { s: (seed ^ Math.imul(stream + 1, 0x632be5ab)) | 0 };
    this.a = splitmix32(st);
    this.b = splitmix32(st);
    this.c = splitmix32(st);
    this.d = splitmix32(st);
    if ((this.a | this.b | this.c | this.d) === 0) this.a = 1;
  }

  /** Next uint32. */
  nextU32(): number {
    const result = Math.imul(rotl(Math.imul(this.b, 5), 7), 9) >>> 0;
    const t = this.b << 9;
    this.c ^= this.a;
    this.d ^= this.b;
    this.b ^= this.c;
    this.a ^= this.d;
    this.c ^= t;
    this.d = rotl(this.d, 11);
    return result;
  }

  /** Uniform in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  /** Uniform in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** Integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** State as 4 uint32 (hashing / snapshot). */
  state(out: number[], o: number): void {
    out[o] = this.a >>> 0;
    out[o + 1] = this.b >>> 0;
    out[o + 2] = this.c >>> 0;
    out[o + 3] = this.d >>> 0;
  }
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

/** Stable 32-bit hash of a string (FNV-1a) — e.g. daily seeds from a date key. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
