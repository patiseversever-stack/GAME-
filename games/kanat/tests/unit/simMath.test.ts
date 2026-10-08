// detMath accuracy vs Math.*, RNG and hash determinism (flight agent).
import { describe, expect, it } from 'vitest';
import * as dm from '../../src/sim/math/detMath.ts';
import { fnv1a32, Fnv1a } from '../../src/sim/math/hash.ts';
import { Rng, STREAM } from '../../src/sim/math/rng.ts';

function maxErr(f: (x: number) => number, ref: (x: number) => number, xs: number[], rel = false): number {
  let m = 0;
  for (const x of xs) {
    const a = f(x);
    const b = ref(x);
    const e = rel ? Math.abs(a - b) / Math.max(1e-300, Math.abs(b)) : Math.abs(a - b);
    if (e > m) m = e;
  }
  return m;
}

const rng = new Rng(1234, STREAM.test);
const wide = Array.from({ length: 20000 }, () => rng.range(-1000, 1000));
const small = Array.from({ length: 20000 }, () => rng.range(-10, 10));
const unit = Array.from({ length: 20000 }, () => rng.range(-1, 1));
const pos = Array.from({ length: 20000 }, () => Math.exp(rng.range(-30, 30)));

describe('detMath accuracy (|err| < 1e-7, typically ~1e-16)', () => {
  it('sin / cos / sincos', () => {
    expect(maxErr(dm.sin, Math.sin, wide)).toBeLessThan(1e-12);
    expect(maxErr(dm.cos, Math.cos, wide)).toBeLessThan(1e-12);
    expect(maxErr(dm.sin, Math.sin, small)).toBeLessThan(1e-15);
    const out = new Float64Array(2);
    for (const x of small) {
      dm.sincos(x, out);
      expect(out[0]).toBe(dm.sin(x));
      expect(out[1]).toBe(dm.cos(x));
    }
    expect(dm.sin(0)).toBe(0);
    expect(dm.cos(0)).toBe(1);
    expect(Number.isNaN(dm.sin(Infinity))).toBe(true);
  });
  it('tan', () => {
    const xs = small.filter((x) => Math.abs(Math.cos(x)) > 1e-3);
    expect(maxErr(dm.tan, Math.tan, xs, true)).toBeLessThan(1e-12);
  });
  it('atan / atan2 / asin / acos', () => {
    expect(maxErr(dm.atan, Math.atan, wide)).toBeLessThan(1e-15);
    expect(maxErr(dm.atan, Math.atan, small)).toBeLessThan(1e-15);
    let m = 0;
    for (let i = 0; i < 20000; i++) {
      const y = small[i];
      const x = small[(i * 7 + 3) % small.length];
      m = Math.max(m, Math.abs(dm.atan2(y, x) - Math.atan2(y, x)));
    }
    expect(m).toBeLessThan(1e-15);
    expect(dm.atan2(0, -1)).toBeCloseTo(Math.PI, 15);
    expect(dm.atan2(1, 0)).toBeCloseTo(Math.PI / 2, 15);
    expect(dm.atan2(0, 0)).toBe(0);
    expect(maxErr(dm.asin, Math.asin, unit)).toBeLessThan(1e-9);
    expect(maxErr(dm.acos, Math.acos, unit)).toBeLessThan(1e-9);
  });
  it('exp / log / pow', () => {
    expect(maxErr(dm.exp, Math.exp, small.map((x) => x * 30), true)).toBeLessThan(1e-14);
    expect(maxErr(dm.log, Math.log, pos)).toBeLessThan(1e-13);
    expect(dm.log(1)).toBe(0);
    expect(dm.exp(0)).toBe(1);
    let m = 0;
    for (let i = 0; i < 5000; i++) {
      const x = pos[i] % 1000 + 1e-3;
      const y = small[i];
      const r = Math.pow(x, y);
      if (Number.isFinite(r) && r > 1e-200 && r < 1e200) m = Math.max(m, Math.abs(dm.pow(x, y) - r) / r);
    }
    expect(m).toBeLessThan(1e-12);
    expect(dm.pow(2, 10)).toBe(1024);
    expect(dm.pow(-2, 3)).toBe(-8);
    expect(dm.pow2i(-3)).toBe(0.125);
  });
  it('helpers', () => {
    expect(dm.wrapPi(3 * Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(dm.wrapPi(-3 * Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(dm.wrapPi(0.5)).toBe(0.5);
    expect(dm.smooth01(0.5)).toBe(0.5);
  });
});

describe('rng / hash', () => {
  it('xoshiro128** streams are deterministic and independent', () => {
    const a = new Rng(42, STREAM.props);
    const b = new Rng(42, STREAM.props);
    const c = new Rng(42, STREAM.balloons);
    const sa: number[] = [];
    let same = 0;
    for (let i = 0; i < 1000; i++) {
      const x = a.nextU32();
      sa.push(x);
      expect(b.nextU32()).toBe(x);
      if (c.nextU32() === x) same++;
    }
    expect(same).toBeLessThan(3);
    // uniformity sanity
    const r = new Rng(7, 1);
    let sum = 0;
    for (let i = 0; i < 100000; i++) sum += r.next();
    expect(Math.abs(sum / 100000 - 0.5)).toBeLessThan(0.01);
    // state round trip
    const s = a.getState();
    const v1 = a.nextU32();
    a.setState(s);
    expect(a.nextU32()).toBe(v1);
  });
  it('fnv1a32 known vectors', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
    const h1 = new Fnv1a().q(1.2341, 1000).q(-7.5, 1000).value();
    const h2 = new Fnv1a().q(1.23412, 1000).q(-7.5, 1000).value();
    expect(h1).toBe(h2); // quantized to mm
    expect(new Fnv1a().q(NaN, 1).value()).toBe(new Fnv1a().q(NaN, 1).value());
  });
});
