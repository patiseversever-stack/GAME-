// Procedural gameplay detail D(x,z) added on top of the baked base height (brief §4.G.1).
// D = rock * (A0 * vnoise(x/W0, z/W0, S0) + A1 * vnoise(x/W1, z/W1, S1)), A = [1.2, 0.5] m, W = [24, 9] m.
// PURE + deterministic: integer hash via Math.imul / xor / shifts (exact uint32 math in V8, JSC and GLSL ES 3.0),
// interpolation with + - * / only (bit-identical across JS engines; the GLSL mirror in detailNoise.glsl.ts uses
// the same constants and differs only by float32 rounding, far below the 5 cm CPU/GPU budget).

export const DETAIL_AMP0 = 1.2;
export const DETAIL_AMP1 = 0.5;
export const DETAIL_WAVELENGTH0 = 24;
export const DETAIL_WAVELENGTH1 = 9;
/** Normal-only third octave (render side; never part of collision). */
export const DETAIL_AMP2 = 0.25;
export const DETAIL_WAVELENGTH2 = 3.5;

export const DETAIL_SEED0 = 0x9e3779b9;
export const DETAIL_SEED1 = 0x85ebca6b;
export const DETAIL_SEED2 = 0xc2b2ae35;

const H_MUL_X = 0x27d4eb2d;
const H_MUL_Z = 0x165667b1;
const H_MIX1 = 0x2c1b3c6d;
const H_MIX2 = 0x297a2d39;
const INV_2_23 = 1 / 8388608; // 2 / 2^24

/** Lattice indices are biased by this so the GLSL int→uint conversion never sees a negative value. */
export const LATTICE_BIAS = 65536;

/** Lattice hash → value in [-1, 1). ix, iz are integers with |i| < LATTICE_BIAS. */
export function latticeHash(ix: number, iz: number, seed: number): number {
  let h = Math.imul((ix + LATTICE_BIAS) | 0, H_MUL_X) ^ Math.imul((iz + LATTICE_BIAS) | 0, H_MUL_Z) ^ (seed | 0);
  h = Math.imul(h ^ (h >>> 15), H_MIX1);
  h = Math.imul(h ^ (h >>> 12), H_MIX2);
  h = h ^ (h >>> 15);
  return (h >>> 8) * INV_2_23 - 1;
}

/** 2D value noise with cubic smoothstep fade, range (-1, 1). */
export function valueNoise(x: number, z: number, seed: number): number {
  const fx = Math.floor(x);
  const fz = Math.floor(z);
  const tx = x - fx;
  const tz = z - fz;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const ix = fx | 0;
  const iz = fz | 0;
  const a = latticeHash(ix, iz, seed);
  const b = latticeHash(ix + 1, iz, seed);
  const c = latticeHash(ix, iz + 1, seed);
  const d = latticeHash(ix + 1, iz + 1, seed);
  const ab = a + (b - a) * sx;
  const cd = c + (d - c) * sx;
  return ab + (cd - ab) * sz;
}

/** Unmasked 2-octave detail (meters). Multiply by the rock mask to get D. */
export function detailRaw(x: number, z: number): number {
  return (
    DETAIL_AMP0 * valueNoise(x / DETAIL_WAVELENGTH0, z / DETAIL_WAVELENGTH0, DETAIL_SEED0) +
    DETAIL_AMP1 * valueNoise(x / DETAIL_WAVELENGTH1, z / DETAIL_WAVELENGTH1, DETAIL_SEED1)
  );
}

/** D(x,z) for a given rock mask value in [0,1]. */
export function detailHeight(x: number, z: number, rock: number): number {
  if (rock <= 0) return 0;
  return rock * detailRaw(x, z);
}
