// Color helpers for the bake (sRGB <-> linear, Kelvin → RGB).

export type RGB = [number, number, number];

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(c: number): number {
  c = c < 0 ? 0 : c > 1 ? 1 : c;
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

export function hexToSrgb(hex: string): RGB {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export function hexToLinear(hex: string): RGB {
  const s = hexToSrgb(hex);
  return [srgbToLinear(s[0]), srgbToLinear(s[1]), srgbToLinear(s[2])];
}

export function srgbToHex(c: RGB): string {
  const h = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

export function linearToHex(c: RGB): string {
  return srgbToHex([linearToSrgb(c[0]), linearToSrgb(c[1]), linearToSrgb(c[2])]);
}

/** Black-body color (Tanner Helland approximation), sRGB 0..1, normalized so max channel = 1. */
export function kelvinToSrgb(k: number): RGB {
  const t = k / 100;
  let r: number;
  let g: number;
  let b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * (t - 60) ** -0.1332047592;
    g = 288.1221695283 * (t - 60) ** -0.0755148492;
    b = 255;
  }
  const c: RGB = [r, g, b].map((v) => Math.max(0, Math.min(255, v)) / 255) as RGB;
  const m = Math.max(c[0], c[1], c[2]);
  return [c[0] / m, c[1] / m, c[2] / m];
}

export function kelvinToLinear(k: number): RGB {
  const s = kelvinToSrgb(k);
  return [srgbToLinear(s[0]), srgbToLinear(s[1]), srgbToLinear(s[2])];
}

export function mix3(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function round3(v: RGB, d = 4): RGB {
  const p = 10 ** d;
  return [Math.round(v[0] * p) / p, Math.round(v[1] * p) / p, Math.round(v[2] * p) / p];
}
