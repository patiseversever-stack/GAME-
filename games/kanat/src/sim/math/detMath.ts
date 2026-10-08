// Deterministic transcendental math for the sim (brief §4.G.8).
// V8 (Android WebView) and JavaScriptCore (iOS) do not produce bit-identical Math.sin/cos/exp/pow/atan2.
// Everything here uses only + - * / and Math.sqrt/floor/round/abs (IEEE-754 exact or correctly rounded),
// so the results are bit-identical on every engine. Algorithms: fdlibm-style Cody-Waite range reduction
// + minimax polynomials (coefficients from fdlibm/musl, public domain / permissive).
// Accuracy: ~1 ulp for |x| < 1e5 (sin/cos/tan), ~1 ulp for exp/log/atan; pow ~1e-15 relative.

export const PI = 3.141592653589793;
export const TWO_PI = 6.283185307179586;
export const HALF_PI = 1.5707963267948966;
export const DEG = 0.017453292519943295; // rad per degree
export const RAD = 57.29577951308232; // degree per rad

// ---- sin / cos / tan -------------------------------------------------------------------------------

const INV_PIO2 = 6.36619772367581382433e-1;
// pi/2 split in 33-bit chunks (k*PIO2_1 exact for |k| < 2^20).
const PIO2_1 = 1.57079632673412561417e0;
const PIO2_2 = 6.07710050630396597660e-11;
const PIO2_3 = 2.02226624871116645580e-21;

const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;

const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.08757232129817482790e-9;
const C6 = -1.13596475577881948265e-11;

/** sin on |r| <= pi/4. */
function kSin(r: number): number {
  const z = r * r;
  const v = z * r;
  return r + v * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))));
}

/** cos on |r| <= pi/4. */
function kCos(r: number): number {
  const z = r * r;
  const p = z * z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  const hz = 0.5 * z;
  const w = 1 - hz;
  return w + (1 - w - hz + p);
}

let redK = 0;
/** Cody-Waite reduction: returns r in [-pi/4, pi/4], sets redK = quadrant (mod 4). */
function reduce(x: number): number {
  const k = Math.round(x * INV_PIO2);
  redK = k - 4 * Math.floor(k * 0.25);
  return x - k * PIO2_1 - k * PIO2_2 - k * PIO2_3;
}

export function sin(x: number): number {
  if (x !== x || x === Infinity || x === -Infinity) return NaN;
  if (x > -0.7853981633974483 && x < 0.7853981633974483) return kSin(x);
  const r = reduce(x);
  switch (redK) {
    case 0:
      return kSin(r);
    case 1:
      return kCos(r);
    case 2:
      return -kSin(r);
    default:
      return -kCos(r);
  }
}

export function cos(x: number): number {
  if (x !== x || x === Infinity || x === -Infinity) return NaN;
  if (x > -0.7853981633974483 && x < 0.7853981633974483) return kCos(x);
  const r = reduce(x);
  switch (redK) {
    case 0:
      return kCos(r);
    case 1:
      return -kSin(r);
    case 2:
      return -kCos(r);
    default:
      return kSin(r);
  }
}

/** Writes sin(x) into out[0] and cos(x) into out[1] with a single range reduction. */
export function sincos(x: number, out: Float64Array | number[]): void {
  if (x > -0.7853981633974483 && x < 0.7853981633974483) {
    out[0] = kSin(x);
    out[1] = kCos(x);
    return;
  }
  const r = reduce(x);
  const s = kSin(r);
  const c = kCos(r);
  switch (redK) {
    case 0:
      out[0] = s;
      out[1] = c;
      return;
    case 1:
      out[0] = c;
      out[1] = -s;
      return;
    case 2:
      out[0] = -s;
      out[1] = -c;
      return;
    default:
      out[0] = -c;
      out[1] = s;
  }
}

export function tan(x: number): number {
  if (x !== x || x === Infinity || x === -Infinity) return NaN;
  const r = reduce(x);
  const s = kSin(r);
  const c = kCos(r);
  return (redK & 1) === 0 ? s / c : -c / s;
}

// ---- atan / atan2 / asin / acos --------------------------------------------------------------------

const ATAN_HI0 = 4.63647609000806093515e-1;
const ATAN_HI1 = 7.85398163397448278999e-1;
const ATAN_HI2 = 9.82793723247329054082e-1;
const ATAN_HI3 = 1.57079632679489655800e0;
const ATAN_LO0 = 2.26987774529616870924e-17;
const ATAN_LO1 = 3.06161699786838301793e-17;
const ATAN_LO2 = 1.39033110312309984516e-17;
const ATAN_LO3 = 6.12323399573676603587e-17;
const AT0 = 3.33333333333329318027e-1;
const AT1 = -1.99999999998764832476e-1;
const AT2 = 1.42857142725034663711e-1;
const AT3 = -1.11111104054623557880e-1;
const AT4 = 9.09088713343650656196e-2;
const AT5 = -7.69187620504482999495e-2;
const AT6 = 6.66107313738753120669e-2;
const AT7 = -5.83357013379057348645e-2;
const AT8 = 4.97687799461593236017e-2;
const AT9 = -3.65315727442169155270e-2;
const AT10 = 1.62858201153657823623e-2;

export function atan(x: number): number {
  if (x !== x) return NaN;
  const neg = x < 0;
  let a = neg ? -x : x;
  if (a === Infinity) return neg ? -HALF_PI : HALF_PI;
  let id = -1;
  if (a < 0.4375) {
    if (a < 1e-9) return x;
  } else if (a < 1.1875) {
    if (a < 0.6875) {
      id = 0;
      a = (2 * a - 1) / (2 + a);
    } else {
      id = 1;
      a = (a - 1) / (a + 1);
    }
  } else if (a < 2.4375) {
    id = 2;
    a = (a - 1.5) / (1 + 1.5 * a);
  } else {
    id = 3;
    a = -1 / a;
  }
  const z = a * a;
  const w = z * z;
  const s1 = z * (AT0 + w * (AT2 + w * (AT4 + w * (AT6 + w * (AT8 + w * AT10)))));
  const s2 = w * (AT1 + w * (AT3 + w * (AT5 + w * (AT7 + w * AT9))));
  let r: number;
  if (id < 0) {
    r = a - a * (s1 + s2);
  } else if (id === 0) {
    r = ATAN_HI0 - (a * (s1 + s2) - ATAN_LO0 - a);
  } else if (id === 1) {
    r = ATAN_HI1 - (a * (s1 + s2) - ATAN_LO1 - a);
  } else if (id === 2) {
    r = ATAN_HI2 - (a * (s1 + s2) - ATAN_LO2 - a);
  } else {
    r = ATAN_HI3 - (a * (s1 + s2) - ATAN_LO3 - a);
  }
  return neg ? -r : r;
}

/** atan2(y, x) in (-pi, pi]. */
export function atan2(y: number, x: number): number {
  if (x !== x || y !== y) return NaN;
  if (x === 0) {
    if (y > 0) return HALF_PI;
    if (y < 0) return -HALF_PI;
    return 0;
  }
  if (y === 0) return x > 0 ? 0 : PI;
  const ax = x < 0 ? -x : x;
  const ay = y < 0 ? -y : y;
  // Ratio < 1 keeps atan in its most accurate branch.
  let r: number;
  if (ay <= ax) {
    r = atan(ay / ax);
  } else {
    r = HALF_PI - atan(ax / ay);
  }
  if (x < 0) r = PI - r;
  return y < 0 ? -r : r;
}

export function asin(x: number): number {
  if (x !== x || x > 1 || x < -1) return NaN;
  return atan2(x, Math.sqrt((1 - x) * (1 + x)));
}

export function acos(x: number): number {
  if (x !== x || x > 1 || x < -1) return NaN;
  return atan2(Math.sqrt((1 - x) * (1 + x)), x);
}

// ---- exp / log / pow -------------------------------------------------------------------------------

const LN2_HI = 6.93147180369123816490e-1;
const LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = 1.44269504088896338700e0;
const P1 = 1.66666666666666019037e-1;
const P2 = -2.77777777770155933842e-3;
const P3 = 6.61375632143793436117e-5;
const P4 = -1.65339022054652515390e-6;
const P5 = 4.13813679705723846039e-8;

// Exact powers of two 2^-1074 .. 2^1023 built by repeated doubling/halving (exact operations).
const POW2_MIN = -1074;
const POW2 = (() => {
  const t = new Float64Array(1023 - POW2_MIN + 1);
  let v = 1;
  for (let k = 0; k <= 1023; k++) {
    t[k - POW2_MIN] = v;
    v *= 2;
  }
  v = 1;
  for (let k = 0; k >= POW2_MIN; k--) {
    t[k - POW2_MIN] = v;
    v *= 0.5;
  }
  return t;
})();

/** 2^k for integer k (exact). */
export function pow2i(k: number): number {
  if (k > 1023) return Infinity;
  if (k < POW2_MIN) return 0;
  return POW2[k - POW2_MIN];
}

export function exp(x: number): number {
  if (x !== x) return NaN;
  if (x > 709.782712893384) return Infinity;
  if (x < -745.1332191019411) return 0;
  if (x > -3.725290298461914e-9 && x < 3.725290298461914e-9) return 1 + x;
  const k = Math.round(x * INV_LN2);
  const hi = x - k * LN2_HI;
  const lo = k * LN2_LO;
  const r = hi - lo;
  const t = r * r;
  const c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  const y = 1 - (lo - (r * c) / (2 - c) - hi);
  if (k > 1023) return y * pow2i(1023) * pow2i(k - 1023);
  if (k < -1021) return y * pow2i(k + 1000) * pow2i(-1000);
  return y * pow2i(k);
}

const LG1 = 6.666666666666735130e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;
const SQRT2 = 1.4142135623730951;
const SQRT1_2 = 0.7071067811865476;

const frexpView = new DataView(new ArrayBuffer(8));

export function log(x: number): number {
  if (x !== x || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  // Exponent extraction through the IEEE-754 bit pattern (identical on every engine; DataView is big-endian here).
  let m = x;
  let k = 0;
  if (m < 2.2250738585072014e-308) {
    m *= 18014398509481984; // 2^54 (subnormals)
    k = -54;
  }
  frexpView.setFloat64(0, m);
  const hi = frexpView.getUint32(0);
  k += ((hi >>> 20) & 0x7ff) - 1023;
  frexpView.setUint32(0, (hi & 0x800fffff) | 0x3ff00000);
  m = frexpView.getFloat64(0); // in [1, 2)
  if (m > SQRT2) {
    m *= 0.5;
    k += 1;
  }
  if (m < SQRT1_2) {
    m *= 2;
    k -= 1;
  }
  const f = m - 1;
  const s = f / (2 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const R = t2 + t1;
  const hfsq = 0.5 * f * f;
  return k * LN2_HI - (hfsq - (s * (hfsq + R) + k * LN2_LO) - f);
}

/** x^y. Integer exponents use exact repeated squaring; otherwise exp(y*log(x)). */
export function pow(x: number, y: number): number {
  if (y === 0) return 1;
  if (x !== x || y !== y) return NaN;
  const yi = Math.round(y);
  if (yi === y && yi <= 64 && yi >= -64) {
    let n = yi < 0 ? -yi : yi;
    let b = x;
    let r = 1;
    while (n > 0) {
      if ((n & 1) === 1) r *= b;
      b *= b;
      n >>= 1;
    }
    return yi < 0 ? 1 / r : r;
  }
  if (x === 0) return y > 0 ? 0 : Infinity;
  if (x < 0) {
    if (yi !== y) return NaN;
    const v = exp(y * log(-x));
    return (yi & 1) === 1 ? -v : v;
  }
  return exp(y * log(x));
}

// ---- helpers -----------------------------------------------------------------------------------------

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Cubic smoothstep of t in [0,1] (clamped). */
export function smooth01(t: number): number {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return u * u * (3 - 2 * u);
}

/** Wrap an angle into (-pi, pi]. */
export function wrapPi(a: number): number {
  if (a > PI || a <= -PI) {
    a -= TWO_PI * Math.floor((a + PI) / TWO_PI);
    if (a <= -PI) a += TWO_PI;
  }
  return a;
}

/** sqrt(x*x + y*y) without Math.hypot (whose implementation differs across engines). */
export function len2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function len3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}
