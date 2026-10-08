// Fairy chimneys (peri bacaları) — Kapadokya hero prop.
// One unit lathe geometry per LOD; the per-instance radius profile (8 samples fitted to the collision primitives),
// height, seed and style come from the instance table → the whole field is 2 draw calls (+2 for basalt caps).
import { BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, MeshDepthMaterial, RGBADepthPacking, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import type { PropInstance, PropPrimitive } from '../../sim/types.ts';
import { InstanceTable, LodDrawer } from './InstanceTable.ts';
import type { LodUniforms } from './InstanceTable.ts';
import { patchMaterial } from './patch.ts';
import { GLSL_NOISE, GLSL_DITHER, glslInstanceFetch, GLSL_LOD_VERT, GLSL_LOD_FRAG } from './glsl.ts';
import { fitLathe, primRadiusAt } from './fit.ts';
import { detailTexture } from './textures.ts';
import type { PropTierConfig } from './tiers.ts';

const BODY_TEXELS = 4;
const CAP_TEXELS = 3;

/** Unit lathe: position.xz = (cos, sin) of the ring angle, position.y = t (−skirt..1), aDome = dome param 0..1. */
export function buildLatheUnit(segs: number, rings: number, skirtRings: number, domeRings: number, skirtT = -0.1): BufferGeometry {
  const pos: number[] = [];
  const dome: number[] = [];
  const uv: number[] = [];
  const ringTs: { t: number; d: number }[] = [];
  for (let s = 0; s < skirtRings; s++) ringTs.push({ t: skirtT * (1 - s / skirtRings), d: 0 });
  for (let r = 0; r <= rings; r++) ringTs.push({ t: r / rings, d: 0 });
  for (let d = 1; d <= domeRings; d++) ringTs.push({ t: 1, d: d / domeRings });
  for (const rt of ringTs) {
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pos.push(Math.cos(a), rt.t, Math.sin(a));
      dome.push(rt.d);
      uv.push(i / segs, rt.t);
    }
  }
  const idx: number[] = [];
  const row = segs + 1;
  for (let r = 0; r < ringTs.length - 1; r++) {
    for (let i = 0; i < segs; i++) {
      const a = r * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aDome', new Float32BufferAttribute(dome, 1));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Unit sphere-ish lathe for caps: aDome = latitude 0 (bottom pole) .. 1 (top pole). */
export function buildCapUnit(segs: number, rings: number): BufferGeometry {
  const pos: number[] = [];
  const lat: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pos.push(Math.cos(a), v, Math.sin(a));
      lat.push(v);
    }
  }
  const idx: number[] = [];
  const row = segs + 1;
  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < segs; i++) {
      const a = r * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aDome', new Float32BufferAttribute(lat, 1));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// Shaders

const BODY_VERT_PARS = /* glsl */ `
${GLSL_NOISE}
${glslInstanceFetch(BODY_TEXELS)}
${GLSL_LOD_VERT}
attribute float aDome;
varying vec3 vKWorld;
varying vec3 vKDir;     // radial unit direction (local)
varying vec4 vKInst;    // h, seed, style, windows
varying float vKRad;    // local radius at this height
varying float vKYaw;
varying vec3 vKNrmW;
varying float vKBaseY;
varying vec2 vKCap;
`;

const BODY_VERT_PRE = /* glsl */ `
  // texel0 = base.xyz + yaw · texel1 = (r0, r1, r2, h0) · texel2 = (h1, seed, style, windows)
  vec4 i0 = instFetch(0); vec4 i1 = instFetch(1); vec4 i2 = instFetch(2); vec4 i3 = instFetch(3);
  float kH0 = max(i1.w, 0.01), kH1 = max(i2.x, 0.01);
  float kH = kH0 + kH1;
  float kSeed = i2.y; float kStyle = i2.z;
  float kt = position.y;
  // rings 0..0.5 cover the lower segment, 0.5..1 the upper one → the profile kink always sits on a ring
  float ky; float kr; float kdrdy;
  if (kt <= 0.5) { float u = max(kt, 0.0) / 0.5; ky = u * kH0; kr = mix(i1.x, i1.y, u); kdrdy = (i1.y - i1.x) / kH0; }
  else { float u = (kt - 0.5) / 0.5; ky = kH0 + u * kH1; kr = mix(i1.y, i1.z, u); kdrdy = (i1.z - i1.y) / kH1; }
  vec3 kdir = vec3(position.x, 0.0, position.z);
  if (kt < 0.0) { ky = kt * 30.0; kr = i1.x * (1.0 - kt * 1.5) + 0.3; kdrdy = -0.6; }
  float kDomeN = 0.0;
  if (aDome > 0.0) {
    float rTop = i1.z;
    float dh = min(rTop * 0.9, 3.0);
    float a = aDome * 1.5707963;
    ky = kH + dh * sin(a);
    kr = rTop * cos(a);
    kDomeN = aDome;
  }
  // radial erosion noise in metres (|disp| <= 0.32 m keeps visual within ±0.4 m of collision)
  vec3 kq = vec3(kdir.x * kr, ky, kdir.z * kr);
  float kn = kNoise3(kq * vec3(0.32, 0.11, 0.32) + kSeed * 13.7) - 0.5;
  kn += 0.5 * (kNoise3(kq * vec3(0.9, 0.35, 0.9) + kSeed * 3.1) - 0.5);
  float flutes = 0.0;
  if (kStyle > 0.5 && kStyle < 1.5) flutes = sin(atan(kdir.z, kdir.x) * (7.0 + floor(kSeed * 5.0)) + kn * 2.0) * 0.12;
  if (kStyle > 2.5 && kStyle < 3.5) flutes = (sin(ky * 0.9 + kSeed * 6.0) * 0.5) * 0.14;
  float kdisp = clamp(kn * 0.4 + flutes, -0.3, 0.3) * smoothstep(0.0, 0.6, kr) * (1.0 - kDomeN * 0.6);
  kr = max(kr + kdisp, 0.0);
  float kc = cos(i0.w), ks = sin(i0.w);
  vec3 kLocal = vec3(kdir.x * kr, ky, kdir.z * kr);
  vec3 kP = kRotY(kLocal, kc, ks) + i0.xyz;
  vec3 kNl = normalize(vec3(kdir.x, -kdrdy, kdir.z));
  kNl = normalize(mix(kNl, vec3(0.0, 1.0, 0.0), kDomeN * kDomeN));
  vec3 kN = kRotY(kNl, kc, ks);
  // LOD fade on the instance centre (mid-height)
  vec3 kCenter = i0.xyz + vec3(0.0, kH * 0.5, 0.0);
  float kVis = kLodPrepare(distance(kCenter, cameraPosition));
  vKWorld = kP; vKDir = kdir; vKInst = vec4(kH, kSeed, kStyle, i2.w); vKRad = kr; vKYaw = i0.w; vKNrmW = kN; vKBaseY = i0.y; vKCap = i3.xy;
`;

const BODY_FRAG_PARS = /* glsl */ `
${GLSL_NOISE}
${GLSL_DITHER}
${GLSL_LOD_FRAG}
uniform sampler2D uDetail;
uniform vec3 uTuffA; uniform vec3 uTuffB; uniform vec3 uTuffRose; uniform vec3 uMauve; uniform vec3 uSoil;
varying vec3 vKWorld;
varying vec3 vKDir;
varying vec4 vKInst;
varying float vKRad;
varying float vKYaw;
varying vec3 vKNrmW;
varying float vKBaseY;
varying vec2 vKCap;
float kWin; float kUnderCap; float kFlute;      // 1 inside a carved opening
float kRim;      // opening rim
float kCav;      // detail cavity
vec3 kDetailN;   // tangent-space detail normal
float kBaseY;

float kWindowMask(float theta, float y, float h, float seed, float count, float rad, out float rim) {
  float m = 0.0; rim = 0.0;
  if (rad < 1.8 || count < 0.5) return 0.0;
  for (int i = 0; i < 4; i++) {
    if (float(i) >= count) break;
    float fi = float(i);
    float th = kHash11(seed * 91.7 + fi * 17.3) * 6.2831853;
    float wy = h * (0.18 + 0.55 * kHash11(seed * 31.1 + fi * 5.7));
    float ww = 0.7 + 0.45 * kHash11(seed * 7.7 + fi * 3.3);
    float wh = 1.1 + 0.6 * kHash11(seed * 3.9 + fi * 9.1);
    float dth = theta - th; dth = dth - 6.2831853 * floor((dth + 3.14159265) / 6.2831853);
    float s = dth * rad;
    float dy = y - wy;
    // arched opening: rectangle + half-ellipse top
    float inRect = step(abs(s), ww * 0.5) * step(0.0, dy) * step(dy, wh - ww * 0.5);
    vec2 e = vec2(s / (ww * 0.5), (dy - (wh - ww * 0.5)) / (ww * 0.45));
    float inArch = step(dot(e, e), 1.0) * step(wh - ww * 0.5, dy);
    float inside = max(inRect, inArch);
    float rimW = 0.09;
    float inRectO = step(abs(s), ww * 0.5 + rimW) * step(-rimW, dy) * step(dy, wh - ww * 0.5);
    vec2 eo = vec2(s / (ww * 0.5 + rimW), (dy - (wh - ww * 0.5)) / (ww * 0.45 + rimW));
    float inArchO = step(dot(eo, eo), 1.0) * step(wh - ww * 0.5, dy);
    rim = max(rim, max(inRectO, inArchO) * (1.0 - inside));
    m = max(m, inside);
  }
  // dovecote holes (güvercinlik): a row of small square holes under the top on some chimneys
  if (kHash11(seed * 5.3) > 0.55 && rad > 2.2) {
    float rowY = h * (0.62 + 0.12 * kHash11(seed * 2.9));
    float cell = 0.55;
    float s2 = theta * rad;
    float gx = fract(s2 / cell) - 0.5;
    float gy = (y - rowY) / 0.32;
    float band = step(abs(gy), 0.5) * step(0.0, sin(theta * 1.0 + seed * 10.0));
    float hole = band * step(abs(gx), 0.2);
    m = max(m, hole);
  }
  return m;
}
`;

const BODY_FRAG_PRE = /* glsl */ `
  kLodClip();
`;

function bodyFragColor(octaves: number): string {
  return /* glsl */ `
  {
    float theta = atan(vKDir.z, vKDir.x);
    float hgt = vKWorld.y;
    float seed = vKInst.y;
    kBaseY = vKBaseY;
    // cylindrical detail coordinates in metres
    vec2 cuv = vec2(theta * max(vKRad, 0.6), hgt);
    vec4 d1 = texture2D(uDetail, cuv * vec2(0.13, 0.085) + seed * 3.7);
    vec4 d2 = d1;
    ${octaves >= 2 ? 'd2 = texture2D(uDetail, cuv * vec2(0.55, 0.42) + seed * 1.3);' : ''}
    kCav = mix(d1.a, d1.a * d2.a, ${octaves >= 2 ? '0.6' : '0.0'});
    kDetailN = vec3((d1.xy * 2.0 - 1.0) * 1.0 + ${octaves >= 2 ? '(d2.xy * 2.0 - 1.0) * 0.6' : 'vec2(0.0)'}, 1.0);
    // world-y tuff banding: broad cream / ochre layers, occasional rose zone, thin dark ash seams
    float yb = hgt * 0.16 + (kNoise2(vec2(theta * 1.3, hgt * 0.05) + seed) - 0.5) * 0.6 + seed * 0.37;
    float band = kNoise2(vec2(yb, 3.1));
    float band2 = kNoise2(vec2(yb * 0.6 + 11.0, 7.9 + seed));
    vec3 col = mix(uTuffB, uTuffA, 0.25 + 0.75 * smoothstep(0.25, 0.85, band));
    col = mix(col, uTuffRose, smoothstep(0.6, 0.9, band2) * 0.5);
    col *= 1.0 - 0.16 * smoothstep(0.86, 0.97, kNoise2(vec2(hgt * 0.9 + seed * 5.0, 1.7)));
    float rel = (hgt - kBaseY) / max(vKInst.x, 1.0);
    // ochre/brown staining in the lower third, cleaner cream higher up
    col = mix(col, col * vec3(0.86, 0.74, 0.62), (1.0 - smoothstep(0.05, 0.4, rel)) * 0.45);
    // vertical erosion fluting (gullies) and desert-varnish streaks running down from the top
    float nfl = max(3.0, floor(6.2831853 * max(vKRad, 0.5) / 1.3));
    float fwob = kNoise2(vec2(theta * 2.0 + seed * 9.0, hgt * 0.07)) * 3.0;
    kFlute = sin(theta * nfl + fwob) * (0.35 + 0.65 * kHash11(seed * 13.0));
    float streak = smoothstep(0.55, 0.92, kNoise2(vec2(theta * max(vKRad, 1.0) * 0.9, hgt * 0.025 + seed * 3.0)));
    float capF = vKCap.x > 0.0 ? 1.0 : 0.4;
    col *= 1.0 - (0.08 + 0.1 * capF) * streak * smoothstep(0.1, 0.7, rel);
    col *= 1.0 - 0.08 * smoothstep(0.3, 1.0, -kFlute);
    // the neck under a basalt cap is darker and sooty (overhang AO + run-off)
    kUnderCap = vKCap.x > 0.0 ? smoothstep(vKInst.x - 3.2, vKInst.x + 0.2, hgt - kBaseY) : 0.0;
    col = mix(col, col * vec3(0.62, 0.55, 0.52), kUnderCap * 0.55);
    // micro albedo variation + soft cavity darkening (mauve tint only in the deepest pockets)
    col *= 0.94 + 0.12 * (d1.b - 0.5) + 0.06;
    col = mix(col * mix(vec3(1.0), uMauve * 4.0, 0.35), col, smoothstep(0.35, 0.8, kCav));
    // soil/dust skirt at the foot
    float foot = 1.0 - smoothstep(0.0, 2.2, hgt - kBaseY);
    col = mix(col, uSoil, foot * 0.55);
    // carved openings
    float rim;
    kWin = kWindowMask(theta, hgt - kBaseY, vKInst.x, seed, vKInst.w, vKRad, rim);
    kRim = rim;
    col = mix(col, col * 1.12, rim);
    col = mix(col, vec3(0.035, 0.026, 0.024), kWin);
    diffuseColor.rgb = col;
  }
`;
}

const BODY_FRAG_NORMAL = /* glsl */ `
  {
    vec3 Nw = normalize(vKNrmW);
    float c = cos(vKYaw), s = sin(vKYaw);
    vec3 tl = vec3(-vKDir.z, 0.0, vKDir.x);
    vec3 T = vec3(c * tl.x + s * tl.z, 0.0, -s * tl.x + c * tl.z);
    vec3 B = normalize(cross(Nw, T));
    float strength = mix(1.0, 0.25, kWin);
    vec3 pn = normalize(Nw + (T * (kDetailN.x * 0.7 + cos(atan(vKDir.z, vKDir.x) * 1.0) * 0.0 + kFlute * 0.45) + B * kDetailN.y * 0.7) * strength);
    // rim of openings: bevel inward
    pn = normalize(mix(pn, -Nw * 0.3 + vec3(0.0, 0.6, 0.0), kRim * 0.35));
    normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);
  }
`;

const BODY_FRAG_LIGHT = /* glsl */ `
  reflectedLight.indirectDiffuse *= mix(0.65, 1.0, kCav) * (1.0 - 0.85 * kWin) * (1.0 - 0.45 * kUnderCap);
  reflectedLight.directDiffuse *= mix(0.85, 1.0, kCav) * (1.0 - 0.9 * kWin) * (1.0 - 0.35 * kUnderCap);
`;

const BODY_VERT_END = /* glsl */ `
  if (kVis <= 0.0) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
`;

// Cap: texel0 = centre.xyz + yaw, texel1 = (rx, ry, rz, kind), texel2 = (seed, h, r0, r1)
const CAP_VERT_PARS = /* glsl */ `
${GLSL_NOISE}
${glslInstanceFetch(CAP_TEXELS)}
${GLSL_LOD_VERT}
attribute float aDome;
varying vec3 vKWorld;
varying vec3 vKNrmW;
varying float vKSeed;
varying float vKUnder;
`;

const CAP_VERT_PRE = /* glsl */ `
  vec4 i0 = instFetch(0); vec4 i1 = instFetch(1); vec4 i2 = instFetch(2);
  float lat = aDome;
  vec3 kdir = vec3(position.x, 0.0, position.z);
  vec3 kLocal; vec3 kNl;
  if (i1.w < 0.5) {
    // ellipsoid hat with a flattened underside (real basalt caps are lens/mushroom shaped)
    float a = lat * 3.14159265;
    float sy = -cos(a);
    float sr = sin(a);
    float kFl = sy < 0.0 ? max(0.55, 1.0 - 0.3 / max(i1.y, 0.3)) : 1.0;
    kLocal = vec3(kdir.x * sr * i1.x, sy * i1.y * kFl, kdir.z * sr * i1.z);
    kNl = normalize(vec3(kdir.x * sr / i1.x, sy * kFl / i1.y, kdir.z * sr / i1.z));
    vKUnder = smoothstep(0.1, -0.4, sy);
  } else {
    // truncated cone hat: bottom disk 0..0.15, side 0.15..0.85, top disk 0.85..1
    float h = i2.y, r0 = i2.z, r1 = i2.w;
    float y; float r;
    if (lat < 0.15) { y = 0.0; r = r0 * lat / 0.15; kNl = vec3(0.0, -1.0, 0.0); }
    else if (lat > 0.85) { y = h; r = r1 * (1.0 - lat) / 0.15; kNl = vec3(0.0, 1.0, 0.0); }
    else { float s = (lat - 0.15) / 0.7; y = h * s; r = mix(r0, r1, s); kNl = normalize(vec3(kdir.x, (r0 - r1) / max(h, 0.1), kdir.z)); }
    kLocal = vec3(kdir.x * r, y, kdir.z * r);
    vKUnder = lat < 0.15 ? 1.0 : 0.0;
  }
  float kn = kNoise3(kLocal * 0.45 + i2.x * 9.1) - 0.5;
  kn += 0.5 * (kNoise3(kLocal * 1.3 + i2.x * 3.1) - 0.5);
  kLocal += kNl * clamp(kn * 0.6, -0.25, 0.25);
  float kc = cos(i0.w), ks = sin(i0.w);
  vec3 kP = kRotY(kLocal, kc, ks) + i0.xyz;
  vec3 kN = kRotY(kNl, kc, ks);
  float kVis = kLodPrepare(distance(i0.xyz, cameraPosition));
  vKWorld = kP; vKNrmW = kN; vKSeed = i2.x;
`;

const CAP_FRAG_PARS = /* glsl */ `
${GLSL_NOISE}
${GLSL_DITHER}
${GLSL_LOD_FRAG}
uniform sampler2D uDetail;
uniform vec3 uBasalt;
varying vec3 vKWorld;
varying vec3 vKNrmW;
varying float vKSeed;
varying float vKUnder;
float kCav;
vec3 kDetN;
`;

const CAP_FRAG_COLOR = /* glsl */ `
  {
    vec3 an = abs(normalize(vKNrmW));
    vec4 dx = texture2D(uDetail, vKWorld.zy * 0.3 + vKSeed);
    vec4 dy = texture2D(uDetail, vKWorld.xz * 0.3 + vKSeed);
    vec4 dz = texture2D(uDetail, vKWorld.xy * 0.3 + vKSeed);
    vec3 w = pow(an, vec3(4.0)); w /= (w.x + w.y + w.z);
    vec4 d = dx * w.x + dy * w.y + dz * w.z;
    kCav = d.a;
    kDetN = vec3(d.xy * 2.0 - 1.0, 1.0);
    float n = kNoise3(vKWorld * 0.7 + vKSeed);
    float n2 = kNoise3(vKWorld * 2.3 + vKSeed * 3.0);
    vec3 col = uBasalt * (0.7 + 0.35 * n + 0.2 * n2) * mix(0.8, 1.15, d.b);
    // dust settled on the top surface, darker weathered underside
    col = mix(col, col * 1.3 + vec3(0.02, 0.015, 0.01), smoothstep(0.6, 0.95, vKNrmW.y) * 0.3);
    col *= mix(1.0, 0.75, vKUnder);
    diffuseColor.rgb = col;
  }
`;

const CAP_FRAG_NORMAL = /* glsl */ `
  {
    vec3 Nw = normalize(vKNrmW);
    vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), Nw) + vec3(1e-4, 0.0, 0.0));
    vec3 B = cross(Nw, T);
    vec3 pn = normalize(Nw + (T * kDetN.x + B * kDetN.y) * 1.1);
    normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);
  }
`;

// ---------------------------------------------------------------------------------------------------------------

function linear(hex: string): Vector3 {
  const v = parseInt(hex.slice(1), 16);
  const f = (c: number): number => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return new Vector3(f((v >> 16) & 255), f((v >> 8) & 255), f(v & 255));
}

export { linear as hexLinear };

interface ChimneyPalette { a: string; b: string; rose: string; mauve: string; soil: string; basalt: string }
const KAPADOKYA: ChimneyPalette = { a: '#D9B48F', b: '#E9DDCB', rose: '#D49A8A', mauve: '#6B4E5E', soil: '#B8977C', basalt: '#3B3532' };

function bodyMaterial(u: LodUniforms, cfg: PropTierConfig, pal: ChimneyPalette, depth: boolean): MeshStandardMaterial | MeshDepthMaterial {
  const uniforms = {
    ...u,
    uDetail: { value: detailTexture('tuff') },
    uTuffA: { value: linear(pal.a) }, uTuffB: { value: linear(pal.b) }, uTuffRose: { value: linear(pal.rose) },
    uMauve: { value: linear(pal.mauve) }, uSoil: { value: linear(pal.soil) },
  };
  const common = {
    uniforms,
    vertexPars: BODY_VERT_PARS,
    vertexPre: BODY_VERT_PRE,
    vertexNormal: 'vec3 objectNormal = kN;',
    vertexBegin: 'vec3 transformed = kP;',
    vertexEnd: BODY_VERT_END,
  };
  if (depth) {
    const m = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
    return patchMaterial(m, { ...common, key: `chimney-depth`, fragPars: GLSL_DITHER + GLSL_LOD_FRAG, fragPre: 'kLodClip();' });
  }
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  return patchMaterial(m, {
    ...common,
    key: `chimney-body-${cfg.detailOctaves}`,
    fragPars: BODY_FRAG_PARS,
    fragPre: BODY_FRAG_PRE,
    fragColor: bodyFragColor(cfg.detailOctaves),
    fragNormal: BODY_FRAG_NORMAL,
    fragLight: BODY_FRAG_LIGHT,
  });
}

function capMaterial(u: LodUniforms, pal: ChimneyPalette, depth: boolean): MeshStandardMaterial | MeshDepthMaterial {
  const uniforms = { ...u, uDetail: { value: detailTexture('stone') }, uBasalt: { value: linear(pal.basalt) } };
  const common = {
    uniforms,
    vertexPars: CAP_VERT_PARS,
    vertexPre: CAP_VERT_PRE,
    vertexNormal: 'vec3 objectNormal = kN;',
    vertexBegin: 'vec3 transformed = kP;',
    vertexEnd: 'if (kVis <= 0.0) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);',
  };
  if (depth) {
    const m = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
    return patchMaterial(m, { ...common, key: 'chimneycap-depth', fragPars: GLSL_DITHER + GLSL_LOD_FRAG, fragPre: 'kLodClip();' });
  }
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0 });
  return patchMaterial(m, {
    ...common,
    key: 'chimneycap',
    fragPars: CAP_FRAG_PARS,
    fragPre: 'kLodClip();',
    fragColor: CAP_FRAG_COLOR,
    fragNormal: CAP_FRAG_NORMAL,
    fragLight: 'reflectedLight.indirectDiffuse *= mix(0.6, 1.0, kCav);',
  });
}

export interface ChimneyStats { bodies: number; caps: number; maxFitError: number }

export class ChimneyLayer {
  readonly body: InstanceTable;
  readonly caps: InstanceTable;
  bodyDrawer: LodDrawer | null = null;
  capDrawer: LodDrawer | null = null;
  private cfg: PropTierConfig;
  private parent: Object3D;
  private readonly pal: ChimneyPalette = KAPADOKYA;
  stats: ChimneyStats = { bodies: 0, caps: 0, maxFitError: 0 };

  constructor(parent: Object3D, cfg: PropTierConfig, capacity: number) {
    this.parent = parent;
    this.cfg = cfg;
    this.body = new InstanceTable(Math.max(1, capacity), BODY_TEXELS);
    this.caps = new InstanceTable(Math.max(1, capacity), CAP_TEXELS);
  }

  build(chimneys: PropInstance[], caps: PropInstance[]): void {
    let nb = 0, nc = 0;
    let maxErr = 0;
    const capPrims: { p: PropPrimitive; seed: number }[] = [];
    for (const inst of chimneys) {
      if (nb >= this.body.capacity) break;
      const c = chimneyParams(inst);
      const seed = c.seed;
      const style = Math.floor(inst.variant ?? 0) % 6;
      const windows = (c.r0 > 3.2 && hashSeed(inst.id * 7 + 3) > 0.45) ? 1 + Math.floor(hashSeed(inst.id * 13 + 1) * 3.2) : 0;
      this.body.write(nb, 0, inst.pos[0], inst.pos[1], inst.pos[2], inst.yaw);
      this.body.write(nb, 1, c.r0, c.r1, c.r2, c.h0);
      this.body.write(nb, 2, c.h1, seed, style, windows);
      const capP = c.cap && c.cap.kind === 'ellipsoid' ? c.cap : null;
      this.body.write(nb, 3, capP ? capP.r[0] : 0, capP ? capP.r[1] : 0, 0, 0);
      const H = c.h0 + c.h1;
      const rmax = Math.max(c.r0, c.r1, c.r2) + 1;
      this.body.bounds(nb, inst.pos[0], inst.pos[1] + H * 0.5, inst.pos[2], Math.hypot(H * 0.5 + 2, rmax));
      nb++;
      if (c.cap) capPrims.push({ p: c.cap, seed });
      maxErr = Math.max(maxErr, c.err);
    }
    for (const inst of caps) for (const p of inst.prims) capPrims.push({ p, seed: hashSeed(inst.id) });
    for (const { p, seed } of capPrims) {
      if (nc >= this.caps.capacity) break;
      if (p.kind === 'ellipsoid') {
        this.caps.write(nc, 0, p.c[0], p.c[1], p.c[2], seed * 6.283);
        this.caps.write(nc, 1, p.r[0], p.r[1], p.r[2], 0);
        this.caps.write(nc, 2, seed, 0, 0, 0);
        this.caps.bounds(nc, p.c[0], p.c[1], p.c[2], Math.max(p.r[0], p.r[1], p.r[2]) + 0.5);
      } else if (p.kind === 'cone') {
        this.caps.write(nc, 0, p.base[0], p.base[1], p.base[2], seed * 6.283);
        this.caps.write(nc, 1, 1, 1, 1, 1);
        this.caps.write(nc, 2, seed, p.h, p.r0, p.r1);
        this.caps.bounds(nc, p.base[0], p.base[1] + p.h * 0.5, p.base[2], Math.max(p.r0, p.r1, p.h) + 0.5);
      } else if (p.kind === 'capsule') {
        const cx = (p.a[0] + p.b[0]) / 2, cy = (p.a[1] + p.b[1]) / 2, cz = (p.a[2] + p.b[2]) / 2;
        const half = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]) / 2;
        this.caps.write(nc, 0, cx, cy, cz, seed * 6.283);
        this.caps.write(nc, 1, p.r + half, p.r, p.r + half, 0);
        this.caps.write(nc, 2, seed, 0, 0, 0);
        this.caps.bounds(nc, cx, cy, cz, p.r + half + 0.5);
      } else continue;
      nc++;
    }
    this.body.count = nb;
    this.caps.count = nc;
    this.body.upload();
    this.caps.upload();
    this.stats = { bodies: nb, caps: nc, maxFitError: maxErr };
    this.makeDrawers();
  }

  private makeDrawers(): void {
    this.disposeDrawers();
    const cfg = this.cfg;
    const pal = this.pal;
    const shadows = cfg.heroShadows;
    // Body: LOD0 28×26 (+skirt, dome) ≈ 1.7k tris, LOD1 10×7 ≈ 200 tris.
    const g0 = buildLatheUnit(28, 26, 2, 4);
    const g1 = buildLatheUnit(10, 8, 1, 2);
    const u0 = LodDrawer.makeUniforms(this.body, 0);
    const u1 = LodDrawer.makeUniforms(this.body, 1);
    this.bodyDrawer = new LodDrawer(this.body, [
      { geometry: g0, material: bodyMaterial(u0, cfg, pal, false), depthMaterial: bodyMaterial(u0, cfg, pal, true), castShadow: shadows },
      { geometry: g1, material: bodyMaterial(u1, cfg, pal, false) },
    ], 'chimney');
    this.bodyDrawer.bindUniforms([u0, u1]);
    this.bodyDrawer.rebuildSpatial();
    this.bodyDrawer.addTo(this.parent);
    const c0 = buildCapUnit(24, 12);
    const c1 = buildCapUnit(9, 5);
    const cu0 = LodDrawer.makeUniforms(this.caps, 0);
    const cu1 = LodDrawer.makeUniforms(this.caps, 1);
    this.capDrawer = new LodDrawer(this.caps, [
      { geometry: c0, material: capMaterial(cu0, pal, false), depthMaterial: capMaterial(cu0, pal, true), castShadow: shadows },
      { geometry: c1, material: capMaterial(cu1, pal, false) },
    ], 'chimneycap');
    this.capDrawer.bindUniforms([cu0, cu1]);
    this.capDrawer.rebuildSpatial();
    this.capDrawer.addTo(this.parent);
    this.applyDistances();
  }

  private applyDistances(): void {
    const c = this.cfg;
    this.bodyDrawer?.setDistances([c.chimneyLod0], c.chimneyMax, c.fadeFrac);
    this.capDrawer?.setDistances([c.chimneyLod0 * 0.8], c.chimneyMax * 0.85, c.fadeFrac);
    if (this.bodyDrawer) this.bodyDrawer.cullMargin = c.heroShadows ? 30 : 6;
    if (this.capDrawer) this.capDrawer.cullMargin = c.heroShadows ? 30 : 6;
  }

  setTier(cfg: PropTierConfig): void {
    const rebuild = cfg.detailOctaves !== this.cfg.detailOctaves || cfg.heroShadows !== this.cfg.heroShadows;
    this.cfg = cfg;
    if (rebuild && this.body.count > 0) this.makeDrawers();
    else this.applyDistances();
  }

  update(camera: Camera): void {
    this.bodyDrawer?.cull(camera);
    this.capDrawer?.cull(camera);
  }

  calls(): number { return (this.bodyDrawer?.calls() ?? 0) + (this.capDrawer?.calls() ?? 0); }
  triangles(): number { return (this.bodyDrawer?.triangles() ?? 0) + (this.capDrawer?.triangles() ?? 0); }

  private disposeDrawers(): void {
    if (this.bodyDrawer) { this.bodyDrawer.removeFrom(this.parent); this.bodyDrawer.dispose(); this.bodyDrawer = null; }
    if (this.capDrawer) { this.capDrawer.removeFrom(this.parent); this.capDrawer.dispose(); this.capDrawer = null; }
  }

  dispose(): void {
    this.disposeDrawers();
    this.body.dispose();
    this.caps.dispose();
  }
}

/** Chimney lathe parameters: the sim's params (h0, h1, r0, r1, r2, capR/capH/capY) or a fit of the prims. */
export function chimneyParams(inst: PropInstance): { r0: number; r1: number; r2: number; h0: number; h1: number; cap: PropPrimitive | null; seed: number; err: number } {
  const P = inst.params ?? {};
  const seed = typeof P.seed === 'number' ? hashSeed(P.seed * 7919 + 13) : hashSeed(inst.id * 31 + 7);
  let cap: PropPrimitive | null = null;
  for (const p of inst.prims) if (p.kind === 'ellipsoid') cap = p;
  if (typeof P.h0 === 'number' && typeof P.r0 === 'number') {
    const r = { r0: P.r0, r1: P.r1 ?? P.r0, r2: P.r2 ?? P.r1 ?? P.r0, h0: P.h0, h1: P.h1 ?? 0.01, cap, seed, err: 0 };
    // measured deviation of the (noise-free) visual profile from the collision cones
    let err = 0;
    for (let k = 1; k < 40; k++) {
      const y = inst.pos[1] + (r.h0 + r.h1) * (k / 40);
      let pr = -1;
      for (const p of inst.prims) if (p.kind === 'cone') pr = Math.max(pr, primRadiusAt(p, y, inst.pos[0], inst.pos[2]));
      const yy = y - inst.pos[1];
      const vr = yy <= r.h0 ? r.r0 + (r.r1 - r.r0) * (yy / r.h0) : r.r1 + (r.r2 - r.r1) * ((yy - r.h0) / Math.max(r.h1, 1e-3));
      if (pr >= 0) err = Math.max(err, Math.abs(vr - pr));
    }
    r.err = err;
    return r;
  }
  const cones = inst.prims.filter((p): p is Extract<PropPrimitive, { kind: 'cone' }> => p.kind === 'cone').sort((a, b) => a.base[1] - b.base[1]);
  if (cones.length >= 2) {
    const a = cones[0], b = cones[cones.length - 1];
    return { r0: a.r0, r1: a.r1, r2: b.r1, h0: a.h, h1: b.base[1] + b.h - (a.base[1] + a.h), cap, seed, err: 0 };
  }
  if (cones.length === 1) {
    const a = cones[0];
    const rm = (a.r0 + a.r1) / 2;
    return { r0: a.r0, r1: rm, r2: a.r1, h0: a.h / 2, h1: a.h / 2, cap, seed, err: 0 };
  }
  const f = fitLathe(inst, true, 3);
  return { r0: f.radii[0], r1: f.radii[1], r2: f.radii[2], h0: f.h / 2, h1: f.h / 2, cap: f.cap, seed, err: 0 };
}

export function hashSeed(n: number): number {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x45d9f3b) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
