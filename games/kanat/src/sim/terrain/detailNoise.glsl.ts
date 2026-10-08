// GLSL ES 3.00 mirror of src/sim/terrain/detailNoise.ts (same constants, same hash, same fade).
// Usage (render side): prepend TERRAIN_GLSL to a vertex/fragment shader (needs `precision highp float; precision highp int;`).
//   float h = kanatGridBilinear(uHeightCore, xz, uCoreGrid) + kanatDetail(xz, kanatGridBilinear(uRockCore, xz, uCoreGrid));
// Grid uniform layout: vec4(originX, originZ, spacing, res). Heights use R32F textures (texelFetch, manual bilinear,
// identical to the CPU sampler's clamp rules). Rock mask texture: R8 (normalized) or R32F with values k/255.
// Pure string module: no three.js import, safe to load anywhere.

import {
  DETAIL_AMP0,
  DETAIL_AMP1,
  DETAIL_AMP2,
  DETAIL_SEED0,
  DETAIL_SEED1,
  DETAIL_SEED2,
  DETAIL_WAVELENGTH0,
  DETAIL_WAVELENGTH1,
  DETAIL_WAVELENGTH2,
} from './detailNoise.ts';

function f(v: number): string {
  const s = String(v);
  return s.includes('.') || s.includes('e') ? s : `${s}.0`;
}
function u(v: number): string {
  return `0x${(v >>> 0).toString(16)}u`;
}

export const DETAIL_NOISE_GLSL = /* glsl */ `
// ---- KANAT terrain detail noise (mirror of detailNoise.ts) ----
const uint KANAT_D_SEED0 = ${u(DETAIL_SEED0)};
const uint KANAT_D_SEED1 = ${u(DETAIL_SEED1)};
const uint KANAT_D_SEED2 = ${u(DETAIL_SEED2)};
const float KANAT_D_AMP0 = ${f(DETAIL_AMP0)};
const float KANAT_D_AMP1 = ${f(DETAIL_AMP1)};
const float KANAT_D_AMP2 = ${f(DETAIL_AMP2)};
const float KANAT_D_WL0 = ${f(DETAIL_WAVELENGTH0)};
const float KANAT_D_WL1 = ${f(DETAIL_WAVELENGTH1)};
const float KANAT_D_WL2 = ${f(DETAIL_WAVELENGTH2)};

float kanatLatticeHash(int ix, int iz, uint seed) {
  uint h = (uint(ix + 65536) * 0x27d4eb2du) ^ (uint(iz + 65536) * 0x165667b1u) ^ seed;
  h = (h ^ (h >> 15u)) * 0x2c1b3c6du;
  h = (h ^ (h >> 12u)) * 0x297a2d39u;
  h = h ^ (h >> 15u);
  return float(h >> 8u) * (1.0 / 8388608.0) - 1.0;
}

float kanatValueNoise(vec2 p, uint seed) {
  vec2 fl = floor(p);
  vec2 t = p - fl;
  vec2 s = t * t * (3.0 - 2.0 * t);
  ivec2 i = ivec2(fl);
  float a = kanatLatticeHash(i.x, i.y, seed);
  float b = kanatLatticeHash(i.x + 1, i.y, seed);
  float c = kanatLatticeHash(i.x, i.y + 1, seed);
  float d = kanatLatticeHash(i.x + 1, i.y + 1, seed);
  float ab = a + (b - a) * s.x;
  float cd = c + (d - c) * s.x;
  return ab + (cd - ab) * s.y;
}

// Value + analytic gradient (d/dp) of the value noise: returns vec3(value, dvalue/dpx, dvalue/dpy).
vec3 kanatValueNoiseGrad(vec2 p, uint seed) {
  vec2 fl = floor(p);
  vec2 t = p - fl;
  vec2 s = t * t * (3.0 - 2.0 * t);
  vec2 ds = 6.0 * t * (1.0 - t);
  ivec2 i = ivec2(fl);
  float a = kanatLatticeHash(i.x, i.y, seed);
  float b = kanatLatticeHash(i.x + 1, i.y, seed);
  float c = kanatLatticeHash(i.x, i.y + 1, seed);
  float d = kanatLatticeHash(i.x + 1, i.y + 1, seed);
  float ab = a + (b - a) * s.x;
  float cd = c + (d - c) * s.x;
  float v = ab + (cd - ab) * s.y;
  float dx = ((b - a) + ((d - c) - (b - a)) * s.y) * ds.x;
  float dy = (cd - ab) * ds.y;
  return vec3(v, dx, dy);
}

// Unmasked 2-octave gameplay detail in meters (xz = world x, world z).
float kanatDetailRaw(vec2 xz) {
  return KANAT_D_AMP0 * kanatValueNoise(xz / KANAT_D_WL0, KANAT_D_SEED0)
       + KANAT_D_AMP1 * kanatValueNoise(xz / KANAT_D_WL1, KANAT_D_SEED1);
}

// D(x,z): what collision uses on top of the base bilinear height.
float kanatDetail(vec2 xz, float rock) {
  return rock * kanatDetailRaw(xz);
}

// Height gradient (dH/dx, dH/dz) of D incl. the normal-only 3rd octave (3.5 m). For shading only.
vec2 kanatDetailSlope(vec2 xz, float rock) {
  vec3 n0 = kanatValueNoiseGrad(xz / KANAT_D_WL0, KANAT_D_SEED0);
  vec3 n1 = kanatValueNoiseGrad(xz / KANAT_D_WL1, KANAT_D_SEED1);
  vec3 n2 = kanatValueNoiseGrad(xz / KANAT_D_WL2, KANAT_D_SEED2);
  vec2 g = n0.yz * (KANAT_D_AMP0 / KANAT_D_WL0) + n1.yz * (KANAT_D_AMP1 / KANAT_D_WL1) + n2.yz * (KANAT_D_AMP2 / KANAT_D_WL2);
  return g * rock;
}
`;

export const TERRAIN_GRID_GLSL = /* glsl */ `
// ---- KANAT grid helpers (mirror of sampler.ts bilinear) ----
// grid = vec4(originX, originZ, spacing, res). Sample (r,c) lives at x = originX + c*spacing, z = originZ + r*spacing.
// Texture layout: texel (c, r) = sample (r, c) (row r = texture row, i.e. image row 0 is the northern-most row).
float kanatGridBilinear(sampler2D tex, vec2 xz, vec4 grid) {
  float last = grid.w - 1.0;
  vec2 g = clamp((xz - grid.xy) / grid.z, vec2(0.0), vec2(last));
  vec2 i0 = min(floor(g), vec2(last - 1.0));
  vec2 t = g - i0;
  ivec2 i = ivec2(i0);
  float h00 = texelFetch(tex, i, 0).r;
  float h10 = texelFetch(tex, i + ivec2(1, 0), 0).r;
  float h01 = texelFetch(tex, i + ivec2(0, 1), 0).r;
  float h11 = texelFetch(tex, i + ivec2(1, 1), 0).r;
  float a = h00 + (h10 - h00) * t.x;
  float b = h01 + (h11 - h01) * t.x;
  return a + (b - a) * t.y;
}

bool kanatInGrid(vec2 xz, vec4 grid) {
  vec2 g = (xz - grid.xy) / grid.z;
  return g.x >= 0.0 && g.y >= 0.0 && g.x <= grid.w - 1.0 && g.y <= grid.w - 1.0;
}

// normal_core.png decode: octahedral, y-up. R = px, G = pz in [0,1] (8 bit).
vec3 kanatOctDecode(vec2 rg) {
  vec2 p = rg * 2.0 - 1.0;
  vec3 n = vec3(p.x, 1.0 - abs(p.x) - abs(p.y), p.y);
  if (n.y < 0.0) {
    vec2 s = vec2(n.x >= 0.0 ? 1.0 : -1.0, n.z >= 0.0 ? 1.0 : -1.0);
    n.xz = (1.0 - abs(n.zx)) * s;
  }
  return normalize(n);
}
`;

/** Everything the render side needs in one string. */
export const TERRAIN_GLSL = DETAIL_NOISE_GLSL + TERRAIN_GRID_GLSL;
