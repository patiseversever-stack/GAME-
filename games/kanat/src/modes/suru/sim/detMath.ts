// Deterministic transcendental functions for the SÜRÜ.io sim (BRIEF §4.G.8).
// Only + − × ÷ and Math.sqrt/abs/floor/round are used, so V8 (Android WebView) and JavaScriptCore (iOS)
// produce bit-identical results. Algorithms follow fdlibm (range reduction + minimax polynomials).
// PURE module: no DOM, no Math.sin/cos/atan2/exp.

const PIO2_HI = 1.57079632673412561417e+00; // first 33 bits of pi/2
const PIO2_LO = 6.07710050650619224932e-11; // pi/2 - PIO2_HI
const INV_PIO2 = 6.36619772367581382433e-1;

export const DET_PI = 3.141592653589793;
export const DET_TAU = 6.283185307179586;
export const DET_HALF_PI = 1.5707963267948966;

// fdlibm __kernel_sin coefficients
const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;
// fdlibm __kernel_cos coefficients
const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.08757232129817482790e-9;
const C6 = -1.13596475577881948265e-11;

function kSin(x: number): number {
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return x + v * (S1 + z * r);
}

function kCos(x: number): number {
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  return 1 - (0.5 * z - z * r);
}

/** Cody–Waite reduction: x = n·π/2 + r, |r| ≤ ~π/4. Returns r and stores n (mod 4) in reduceN. */
let reduceN = 0;
function reduce(x: number): number {
  const n = Math.round(x * INV_PIO2);
  // two-step Cody–Waite subtraction (fdlibm "medium" path); accurate for game-sized angles (|x| < 1e5)
  const r = (x - n * PIO2_HI) - n * PIO2_LO;
  reduceN = ((n % 4) + 4) % 4;
  return r;
}

export function detSin(x: number): number {
  if (x > -0.7853981633974483 && x < 0.7853981633974483) return kSin(x);
  const r = reduce(x);
  switch (reduceN) {
    case 0: return kSin(r);
    case 1: return kCos(r);
    case 2: return -kSin(r);
    default: return -kCos(r);
  }
}

export function detCos(x: number): number {
  if (x > -0.7853981633974483 && x < 0.7853981633974483) return kCos(x);
  const r = reduce(x);
  switch (reduceN) {
    case 0: return kCos(r);
    case 1: return -kSin(r);
    case 2: return -kCos(r);
    default: return kSin(r);
  }
}

// fdlibm atan
const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT0 = 3.33333333333329318027e-01;
const AT1 = -1.99999999998764832476e-01;
const AT2 = 1.42857142725034663711e-01;
const AT3 = -1.11111104054623557880e-01;
const AT4 = 9.09088713343650656196e-02;
const AT5 = -7.69187620504482999495e-02;
const AT6 = 6.66107313738753120669e-02;
const AT7 = -5.83357013379057348645e-02;
const AT8 = 4.97687799461593236017e-02;
const AT9 = -3.65315727442169155270e-02;
const AT10 = 1.62858201153657823623e-02;

export function detAtan(xIn: number): number {
  if (xIn !== xIn) return xIn;
  const neg = xIn < 0;
  let x = neg ? -xIn : xIn;
  let id = -1;
  if (x >= 2.4375) {
    if (x > 1e17) return neg ? -DET_HALF_PI : DET_HALF_PI;
    id = 3;
    x = -1 / x;
  } else if (x >= 0.4375) {
    if (x < 0.6875) {
      id = 0;
      x = (2 * x - 1) / (2 + x);
    } else if (x < 1.1875) {
      id = 1;
      x = (x - 1) / (x + 1);
    } else {
      id = 2;
      x = (x - 1.5) / (1 + 1.5 * x);
    }
  } else if (x < 1e-9) {
    return xIn;
  }
  const z = x * x;
  const w = z * z;
  const s1 = z * (AT0 + w * (AT2 + w * (AT4 + w * (AT6 + w * (AT8 + w * AT10)))));
  const s2 = w * (AT1 + w * (AT3 + w * (AT5 + w * (AT7 + w * AT9))));
  let res: number;
  if (id < 0) res = x - x * (s1 + s2);
  else res = ATANHI[id] - ((x * (s1 + s2) - ATANLO[id]) - x);
  return neg ? -res : res;
}

/** atan2(y, x) in (−π, π]. */
export function detAtan2(y: number, x: number): number {
  if (x === 0) {
    if (y > 0) return DET_HALF_PI;
    if (y < 0) return -DET_HALF_PI;
    return 0;
  }
  if (x > 0) return detAtan(y / x);
  // x < 0
  const a = detAtan(y / x);
  return y >= 0 ? a + DET_PI : a - DET_PI;
}

// fdlibm exp
const LN2_HI = 6.93147180369123816490e-01;
const LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = 1.44269504088896338700e+00;
const P1 = 1.66666666666666019037e-01;
const P2 = -2.77777777770155933842e-03;
const P3 = 6.61375632143793436117e-05;
const P4 = -1.65339022054652515390e-06;
const P5 = 4.13813679705723846039e-08;

function pow2i(k: number): number {
  // exact 2^k for integer k via repeated squaring (multiplications by powers of two are exact)
  let result = 1;
  let base = k < 0 ? 0.5 : 2;
  let e = k < 0 ? -k : k;
  while (e > 0) {
    if (e & 1) result *= base;
    base *= base;
    e >>= 1;
  }
  return result;
}

export function detExp(x: number): number {
  if (x !== x) return x;
  if (x > 709.7) return Infinity;
  if (x < -745) return 0;
  if (x > -3.725290298461914e-9 && x < 3.725290298461914e-9) return 1 + x;
  const k = Math.round(x * INV_LN2);
  const hi = x - k * LN2_HI;
  const lo = k * LN2_LO;
  const r = hi - lo;
  const t = r * r;
  const c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  const y = 1 - ((lo - (r * c) / (2 - c)) - hi);
  if (k === 0) return y;
  // split the scale so 2^k itself never overflows/underflows near the range ends
  return y * pow2i(k >> 1) * pow2i(k - (k >> 1));
}

/** Wrap an angle to (−π, π]. */
export function detWrapPi(a: number): number {
  if (a > -DET_PI && a <= DET_PI) return a;
  const n = Math.floor((a + DET_PI) / DET_TAU);
  let r = a - n * DET_TAU;
  if (r <= -DET_PI) r += DET_TAU;
  if (r > DET_PI) r -= DET_TAU;
  return r;
}
