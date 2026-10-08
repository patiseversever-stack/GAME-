// Minimal allocation-free vec3 helpers. Vectors are Float64Array(3) or number[3]; results go to `out`.

export type V3 = Float64Array | number[];

export function v3(x = 0, y = 0, z = 0): Float64Array {
  const o = new Float64Array(3);
  o[0] = x;
  o[1] = y;
  o[2] = z;
  return o;
}

export function set3(out: V3, x: number, y: number, z: number): V3 {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

export function copy3(out: V3, a: ArrayLike<number>): V3 {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}

export function add3(out: V3, a: ArrayLike<number>, b: ArrayLike<number>): V3 {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}

export function sub3(out: V3, a: ArrayLike<number>, b: ArrayLike<number>): V3 {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

export function scale3(out: V3, a: ArrayLike<number>, s: number): V3 {
  out[0] = a[0] * s;
  out[1] = a[1] * s;
  out[2] = a[2] * s;
  return out;
}

/** out = a + b*s */
export function madd3(out: V3, a: ArrayLike<number>, b: ArrayLike<number>, s: number): V3 {
  out[0] = a[0] + b[0] * s;
  out[1] = a[1] + b[1] * s;
  out[2] = a[2] + b[2] * s;
  return out;
}

export function dot3(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function length3(a: ArrayLike<number>): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function dist3(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const x = a[0] - b[0];
  const y = a[1] - b[1];
  const z = a[2] - b[2];
  return Math.sqrt(x * x + y * y + z * z);
}

/** Normalizes in place; returns the original length (0-length vectors become (0,1,0)). */
export function normalize3(out: V3): number {
  const l = Math.sqrt(out[0] * out[0] + out[1] * out[1] + out[2] * out[2]);
  if (l > 1e-12) {
    const inv = 1 / l;
    out[0] *= inv;
    out[1] *= inv;
    out[2] *= inv;
  } else {
    out[0] = 0;
    out[1] = 1;
    out[2] = 0;
  }
  return l;
}

export function cross3(out: V3, a: ArrayLike<number>, b: ArrayLike<number>): V3 {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
