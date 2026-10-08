// Seeded PRNG for the sim (brief §4.3, §4.G.8): xoshiro128** seeded through splitmix32.
// Pure 32-bit integer math (Math.imul, shifts, xor) → bit-identical on V8 and JavaScriptCore.
// Each system gets its own stream: `new Rng(seed, STREAM.props)` etc. so adding draws in one system
// never shifts another system's sequence.

/** Stream ids. Keep values stable: they are part of the deterministic contract (replays, prop placement). */
export const STREAM = {
  sim: 1,
  props: 2,
  balloons: 3,
  trees: 4,
  daily: 5,
  bots: 6,
  test: 7,
} as const;

/** splitmix32 output for a given 32-bit state (caller advances the state by 0x9e3779b9). */
export function splitmix32(state: number): number {
  let z = (state + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return (z ^ (z >>> 15)) >>> 0;
}

export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

export class Rng {
  private a = 0;
  private b = 0;
  private c = 0;
  private d = 0;

  constructor(seed: number, stream = 0) {
    this.reseed(seed, stream);
  }

  reseed(seed: number, stream = 0): void {
    let s = (seed ^ Math.imul(stream | 0, 0x632be5ab)) | 0;
    s = (s + 0x9e3779b9) | 0;
    this.a = splitmix32(s);
    s = (s + 0x9e3779b9) | 0;
    this.b = splitmix32(s);
    s = (s + 0x9e3779b9) | 0;
    this.c = splitmix32(s);
    s = (s + 0x9e3779b9) | 0;
    this.d = splitmix32(s);
    if ((this.a | this.b | this.c | this.d) === 0) this.a = 1;
  }

  /** Next uint32 (xoshiro128**). */
  nextU32(): number {
    const b = this.b;
    const m = Math.imul(b, 5);
    const r = Math.imul((m << 7) | (m >>> 25), 9);
    const t = b << 9;
    this.c ^= this.a;
    this.d ^= this.b;
    this.b ^= this.c;
    this.a ^= this.d;
    this.c ^= t;
    this.d = (this.d << 11) | (this.d >>> 21);
    return r >>> 0;
  }

  /** Uniform float in [0, 1) with 32 bits of resolution. */
  next(): number {
    return this.nextU32() * 2.3283064365386963e-10;
  }

  /** Uniform float in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Approximately normal (Irwin-Hall, 4 uniforms) with mean 0 and standard deviation 1. Pure arithmetic. */
  gauss(): number {
    return (this.next() + this.next() + this.next() + this.next() - 2) * 1.7320508075688772;
  }

  getState(out?: RngState): RngState {
    const o = out ?? { a: 0, b: 0, c: 0, d: 0 };
    o.a = this.a;
    o.b = this.b;
    o.c = this.c;
    o.d = this.d;
    return o;
  }

  setState(s: RngState): void {
    this.a = s.a | 0;
    this.b = s.b | 0;
    this.c = s.c | 0;
    this.d = s.d | 0;
  }
}
