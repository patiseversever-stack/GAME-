// Colour helpers for the render layer (linear-sRGB working space, like three.js ColorManagement).
// Pure math, no allocations in hot paths (callers pass `out` arrays).

/** sRGB transfer -> linear (component). */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** '#RRGGBB' -> linear sRGB triple written into out[o..o+2]. */
export function hexToLinear(hex: string, out: Float32Array | number[], o = 0): void {
  const v = parseInt(hex.replace('#', ''), 16);
  out[o] = srgbToLinear(((v >> 16) & 255) / 255);
  out[o + 1] = srgbToLinear(((v >> 8) & 255) / 255);
  out[o + 2] = srgbToLinear((v & 255) / 255);
}

export function hexToLinearTuple(hex: string): [number, number, number] {
  const t: [number, number, number] = [0, 0, 0];
  hexToLinear(hex, t);
  return t;
}

/**
 * Black-body colour temperature -> linear sRGB chromaticity, normalised to luminance 1.
 * Planckian locus via Kim et al. cubic spline (CIE 1931 xy), then XYZ -> linear sRGB (D65).
 * White point of the "camera" is D65, so 6500 K ~ neutral, 3400 K strongly warm, 12000 K blue.
 */
export function kelvinToLinear(kelvin: number, out: Float32Array | number[], o = 0): void {
  const T = Math.min(25000, Math.max(1667, kelvin));
  const t = 1e3 / T;
  const t2 = t * t;
  const t3 = t2 * t;
  let x: number;
  if (T <= 4000) x = -0.2661239 * t3 - 0.234358 * t2 + 0.8776956 * t + 0.17991;
  else x = -3.0258469 * t3 + 2.1070379 * t2 + 0.2226347 * t + 0.24039;
  const x2 = x * x;
  const x3 = x2 * x;
  let y: number;
  if (T <= 2222) y = -1.1063814 * x3 - 1.3481102 * x2 + 2.18555832 * x - 0.20219683;
  else if (T <= 4000) y = -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867;
  else y = 3.081758 * x3 - 5.8733867 * x2 + 3.75112997 * x - 0.37001483;
  const Y = 1;
  const X = (x / y) * Y;
  const Z = ((1 - x - y) / y) * Y;
  let r = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  let g = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  let b = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  out[o] = r / lum;
  out[o + 1] = g / lum;
  out[o + 2] = b / lum;
}

export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
