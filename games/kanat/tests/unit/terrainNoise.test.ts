// Detail noise D(x,z): TS implementation vs an independent straightforward reference (BigInt uint32 hash),
// plus GLSL mirror constant checks.
import { describe, expect, it } from 'vitest';
import {
  DETAIL_AMP0,
  DETAIL_AMP1,
  DETAIL_SEED0,
  DETAIL_SEED1,
  DETAIL_WAVELENGTH0,
  DETAIL_WAVELENGTH1,
  detailHeight,
  detailRaw,
  latticeHash,
  valueNoise,
} from '../../src/sim/terrain/detailNoise.ts';
import { DETAIL_NOISE_GLSL, TERRAIN_GLSL } from '../../src/sim/terrain/detailNoise.glsl.ts';

const M32 = 0xffffffffn;
const mul = (a: bigint, b: bigint) => (a * b) & M32;

/** Reference hash written with BigInt (exact unsigned 32-bit arithmetic, like GLSL uint). */
function refHash(ix: number, iz: number, seed: number): number {
  const ux = BigInt.asUintN(32, BigInt(ix + 65536));
  const uz = BigInt.asUintN(32, BigInt(iz + 65536));
  let h = mul(ux, 0x27d4eb2dn) ^ mul(uz, 0x165667b1n) ^ BigInt(seed >>> 0);
  h = mul(h ^ (h >> 15n), 0x2c1b3c6dn);
  h = mul(h ^ (h >> 12n), 0x297a2d39n);
  h = h ^ (h >> 15n);
  return Number(h >> 8n) / 8388608 - 1;
}

function refNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const s = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const top = lerp(refHash(ix, iz, seed), refHash(ix + 1, iz, seed), s(fx));
  const bot = lerp(refHash(ix, iz + 1, seed), refHash(ix + 1, iz + 1, seed), s(fx));
  return lerp(top, bot, s(fz));
}

function refDetail(x: number, z: number): number {
  return 1.2 * refNoise(x / 24, z / 24, 0x9e3779b9) + 0.5 * refNoise(x / 9, z / 9, 0x85ebca6b);
}

describe('terrain detail noise D(x,z)', () => {
  it('uses the brief constants (a = [1.2, 0.5] m, wavelengths [24, 9] m)', () => {
    expect([DETAIL_AMP0, DETAIL_AMP1]).toEqual([1.2, 0.5]);
    expect([DETAIL_WAVELENGTH0, DETAIL_WAVELENGTH1]).toEqual([24, 9]);
  });

  it('lattice hash equals the BigInt uint32 reference (incl. negative indices)', () => {
    for (let k = 0; k < 5000; k++) {
      const ix = ((k * 7919) % 6000) - 3000;
      const iz = ((k * 104729) % 6000) - 3000;
      for (const seed of [DETAIL_SEED0, DETAIL_SEED1, 0, 0xffffffff]) expect(latticeHash(ix, iz, seed)).toBe(refHash(ix, iz, seed));
    }
  });

  it('value noise and D match the reference implementation exactly', () => {
    for (let k = 0; k < 20000; k++) {
      const x = ((k * 7919) % 50000) / 3.7 - 6000;
      const z = ((k * 104729) % 50000) / 4.1 - 6000;
      expect(valueNoise(x / 24, z / 24, DETAIL_SEED0)).toBe(refNoise(x / 24, z / 24, DETAIL_SEED0));
      expect(Math.abs(detailRaw(x, z) - refDetail(x, z))).toBeLessThan(1e-12);
    }
  });

  it('is bounded, continuous and zero without rock', () => {
    let prev = detailRaw(0, 3.3);
    let maxStep = 0;
    for (let i = 1; i < 100000; i++) {
      const x = i * 0.01;
      const v = detailRaw(x, 3.3);
      expect(Math.abs(v)).toBeLessThanOrEqual(1.7);
      maxStep = Math.max(maxStep, Math.abs(v - prev));
      prev = v;
    }
    expect(maxStep).toBeLessThan(0.01); // C0/C1-ish: 1 cm per 1 cm step is far above the real max gradient
    expect(detailHeight(10, 20, 0)).toBe(0);
    expect(detailHeight(10, 20, 1)).toBe(detailRaw(10, 20));
  });

  it('GLSL mirror carries the same constants and functions', () => {
    expect(DETAIL_NOISE_GLSL).toContain('0x9e3779b9u');
    expect(DETAIL_NOISE_GLSL).toContain('0x85ebca6bu');
    expect(DETAIL_NOISE_GLSL).toContain('0x27d4eb2du');
    expect(DETAIL_NOISE_GLSL).toContain('0x165667b1u');
    expect(DETAIL_NOISE_GLSL).toContain('0x2c1b3c6du');
    expect(DETAIL_NOISE_GLSL).toContain('0x297a2d39u');
    expect(DETAIL_NOISE_GLSL).toContain('ix + 65536');
    expect(DETAIL_NOISE_GLSL).toMatch(/KANAT_D_AMP0 = 1\.2;/);
    expect(DETAIL_NOISE_GLSL).toMatch(/KANAT_D_WL0 = 24\.0;/);
    expect(DETAIL_NOISE_GLSL).toMatch(/KANAT_D_WL1 = 9\.0;/);
    for (const fn of ['kanatDetail(', 'kanatDetailSlope(', 'kanatGridBilinear(', 'kanatOctDecode(']) expect(TERRAIN_GLSL).toContain(fn);
  });

  it('float32 evaluation (GPU highp emulation) stays within 1 mm of the float64 CPU value', () => {
    const f = Math.fround;
    const noise32 = (x: number, z: number, seed: number) => {
      const fx = Math.floor(x);
      const fz = Math.floor(z);
      const tx = f(x - fx);
      const tz = f(z - fz);
      const sx = f(f(tx * tx) * f(3 - f(2 * tx)));
      const sz = f(f(tz * tz) * f(3 - f(2 * tz)));
      const a = f(latticeHash(fx, fz, seed));
      const b = f(latticeHash(fx + 1, fz, seed));
      const c = f(latticeHash(fx, fz + 1, seed));
      const d = f(latticeHash(fx + 1, fz + 1, seed));
      const ab = f(a + f(f(b - a) * sx));
      const cd = f(c + f(f(d - c) * sx));
      return f(ab + f(f(cd - ab) * sz));
    };
    let maxErr = 0;
    for (let k = 0; k < 20000; k++) {
      const x = f(((k * 7919) % 8000) - 4000 + k * 0.013);
      const z = f(((k * 104729) % 8000) - 4000 - k * 0.007);
      const g = f(f(1.2 * noise32(f(x / 24), f(z / 24), DETAIL_SEED0)) + f(0.5 * noise32(f(x / 9), f(z / 9), DETAIL_SEED1)));
      maxErr = Math.max(maxErr, Math.abs(g - detailRaw(x, z)));
    }
    expect(maxErr).toBeLessThan(0.001);
  });
});
