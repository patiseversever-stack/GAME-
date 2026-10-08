// Shared GLSL snippets for props / pilot / VFX shaders (WebGL2, GLSL ES 3.0 via three.js).

/** Hash + value noise (ALU only; cheap enough for vertex use and a 1–3 octave fragment detail). */
export const GLSL_NOISE = /* glsl */ `
float kHash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float kHash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float kHash31(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 kHash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float kNoise2(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = kHash21(i), b = kHash21(i + vec2(1.0, 0.0)), c = kHash21(i + vec2(0.0, 1.0)), d = kHash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float kNoise3(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = kHash31(i), n100 = kHash31(i + vec3(1,0,0)), n010 = kHash31(i + vec3(0,1,0)), n110 = kHash31(i + vec3(1,1,0));
  float n001 = kHash31(i + vec3(0,0,1)), n101 = kHash31(i + vec3(1,0,1)), n011 = kHash31(i + vec3(0,1,1)), n111 = kHash31(i + vec3(1,1,1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float kFbm2(vec2 p, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { if (i >= oct) break; s += a * kNoise2(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
float kFbm3(vec3 p, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { if (i >= oct) break; s += a * kNoise3(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
`;

/** Interleaved gradient noise for dithered LOD cross-fades (stable per pixel, no texture). */
export const GLSL_DITHER = /* glsl */ `
float kIGN(vec2 px) { return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715)))); }
`;

/**
 * Instance table fetch. Instance data lives in a RGBA32F texture (TEXELS texels per instance, 1024 wide);
 * the per-instance attribute is only the row index (aIdx), rewritten each frame by CPU culling.
 */
export function glslInstanceFetch(texels: number): string {
  return /* glsl */ `
uniform highp sampler2D uInstTex;
attribute float aIdx;
vec4 instFetch(int k) {
  int i = int(aIdx + 0.5) * ${texels} + k;
  return texelFetch(uInstTex, ivec2(i & 1023, i >> 10), 0);
}
vec3 kRotY(vec3 p, float c, float s) { return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
`;
}

/**
 * LOD fade helpers. uLodBand = (in0, in1, out0, out1): visible fraction ramps 0→1 over [in0,in1] and 1→0 over [out0,out1]
 * (distance to instance centre). The "in" ramp of LOD1 is the complement of LOD0's "out" ramp, so the dither is exact.
 */
export const GLSL_LOD_VERT = /* glsl */ `
uniform vec4 uLodBand;
uniform float uLodSide; // 0 = near LOD (visible where ign >= f), 1 = far LOD (visible where ign < f)
varying float vLodF;
varying float vLodOut;
float kLodPrepare(float d) {
  // f: 0 near → 1 far across the switch band; fo: 1 → 0 across the max-distance band.
  float f = (uLodBand.y > uLodBand.x) ? clamp((d - uLodBand.x) / (uLodBand.y - uLodBand.x), 0.0, 1.0) : (uLodSide > 0.5 ? 1.0 : 0.0);
  float fo = 1.0 - clamp((d - uLodBand.z) / max(uLodBand.w - uLodBand.z, 1e-3), 0.0, 1.0);
  vLodF = f; vLodOut = fo;
  // Fully hidden for this LOD → caller collapses the vertex.
  float vis = uLodSide > 0.5 ? min(f, fo) : min(1.0 - f, fo);
  return vis;
}
`;

export const GLSL_LOD_FRAG = /* glsl */ `
uniform float uLodSide;
varying float vLodF;
varying float vLodOut;
void kLodClip() {
  float n = kIGN(gl_FragCoord.xy);
  if (uLodSide > 0.5) { if (n >= vLodF) discard; }
  else { if (n < vLodF) discard; }
  if (fract(n + 0.5) >= vLodOut) discard;
}
`;
