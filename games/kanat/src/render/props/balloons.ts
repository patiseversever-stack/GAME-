// Hot-air balloons — hero prop (Kapadokya, Pamukkale). 40 instances, 2 envelope LODs + gear + flame sprites.
// Positions come from the sim's deterministic balloonPos() every frame so visuals == collision.
import {
  BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, MeshDepthMaterial, RGBADepthPacking, DoubleSide, FrontSide,
  ShaderMaterial, InstancedBufferGeometry, InstancedBufferAttribute, Mesh, Vector3, CustomBlending, OneFactor,
  OneMinusSrcAlphaFactor, DynamicDrawUsage,
} from 'three';
import type { Camera, Object3D } from 'three';
import type { BalloonDef } from '../../sim/types.ts';
import { InstanceTable, LodDrawer } from './InstanceTable.ts';
import type { LodUniforms } from './InstanceTable.ts';
import { patchMaterial } from './patch.ts';
import { GLSL_NOISE, GLSL_DITHER, glslInstanceFetch, GLSL_LOD_VERT, GLSL_LOD_FRAG } from './glsl.ts';
import { hexLinear, hashSeed } from './chimneys.ts';
import type { PropTierConfig } from './tiers.ts';
import { setWarmLight } from '../vfx/shared.ts';

const TEXELS = 3;
export const BALLOON_GORES = 24;

/** 12 palettes (A, B, C) — saturated but not neon, no brands/logos. */
export const BALLOON_PALETTES: [string, string, string][] = [
  ['#C8322B', '#F2B632', '#1F3A68'],
  ['#1E9AA0', '#F1EDE3', '#E2674A'],
  ['#2948A0', '#E9822E', '#F3E6C8'],
  ['#3C8C4A', '#F0C93A', '#C4372F'],
  ['#5B3A8C', '#D86C9E', '#E8B84A'],
  ['#23252A', '#F2F0EA', '#C0392B'],
  ['#6FB3E0', '#23366B', '#F4C542'],
  ['#D9473A', '#F2A33A', '#3A7FC4'],
  ['#13737A', '#F08A3C', '#F6EEDD'],
  ['#7E2335', '#F1E4CC', '#D9A441'],
  ['#9BC53D', '#2E5E3A', '#F4F1E8'],
  ['#F06B5C', '#2DB3B0', '#F7D046'],
];

/** Normalised inverted-drop profile: t = 0 mouth … 1 crown, radius 1 at the equator (t = EQ). */
export const ENVELOPE = { eq: 0.56, mouth: 0.24, skirtT: -0.075, topExp: 2.15, lowExp: 1.75 };

export function envelopeRadius(t: number): number {
  const { eq, mouth, topExp, lowExp } = ENVELOPE;
  if (t <= 0) return mouth;
  if (t >= 1) return 0;
  if (t >= eq) {
    const s = (t - eq) / (1 - eq);
    return Math.pow(Math.max(0, 1 - Math.pow(s, topExp)), 0.5);
  }
  const s = t / eq;
  return mouth + (1 - mouth) * (1 - Math.pow(1 - s, lowExp));
}

/** Unit envelope: segs per gore, rings over t∈[0,1] + skirt rings. uv = (gore coord 0..GORES, t). */
export function buildEnvelopeUnit(segPerGore: number, rings: number, bulge: number): BufferGeometry {
  const G = BALLOON_GORES;
  const segs = G * segPerGore;
  const ts: number[] = [ENVELOPE.skirtT, ENVELOPE.skirtT * 0.5];
  for (let r = 0; r <= rings; r++) {
    // denser rings near the crown and mouth
    const u = r / rings;
    ts.push(u < 0.5 ? 0.5 * Math.pow(u * 2, 1.15) : 1 - 0.5 * Math.pow((1 - u) * 2, 1.35));
  }
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [];
  const eps = 1e-3;
  const rho = (t: number, th: number): number => {
    const g = (th / (Math.PI * 2)) * G;
    const f = g - Math.floor(g);
    const b = t > 0.02 && t < 0.97 ? bulge * Math.sin(Math.PI * f) * Math.min(1, t / 0.15) : 0;
    return envelopeRadius(t) * (1 + b);
  };
  for (const t of ts) {
    for (let i = 0; i <= segs; i++) {
      const th = (i / segs) * Math.PI * 2;
      const r = rho(t, th);
      const c = Math.cos(th), s = Math.sin(th);
      pos.push(r * c, t, r * s);
      // analytic normal from partial derivatives
      const rt = t <= 0 ? 0 : (rho(Math.min(1, t + eps), th) - rho(Math.max(0, t - eps), th)) / (Math.min(1, t + eps) - Math.max(0, t - eps));
      const rth = (rho(t, th + eps) - rho(t, th - eps)) / (2 * eps);
      const dth = [rth * c - r * s, 0, rth * s + r * c];
      const dt = [rt * c, 1, rt * s];
      let nx = dt[1] * dth[2] - dt[2] * dth[1];
      let ny = dt[2] * dth[0] - dt[0] * dth[2];
      let nz = dt[0] * dth[1] - dt[1] * dth[0];
      if (nx * c + nz * s < 0 && t < 0.999) { nx = -nx; ny = -ny; nz = -nz; }
      if (t >= 0.999) { nx = 0; ny = 1; nz = 0; }
      const l = Math.hypot(nx, ny, nz) || 1;
      nrm.push(nx / l, ny / l, nz / l);
      uv.push((i / segs) * G, t);
    }
  }
  const idx: number[] = [];
  const row = segs + 1;
  for (let r = 0; r < ts.length - 1; r++) {
    for (let i = 0; i < segs; i++) {
      const a = r * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Gear relative to the mouth (y = 0): load frame at −2.0, burner above it, basket rim −3.4, floor −4.5. */
export const GEAR = { frameY: -2.0, rimY: -3.4, floorY: -4.5, burnerTop: -1.55, basketW: 1.25, basketD: 1.1 };

interface GeoAcc { pos: number[]; nrm: number[]; uv: number[]; mat: number[]; top: number[]; idx: number[] }

function addBox(a: GeoAcc, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, mat: number, taper = 1): void {
  const faces: [number[], number[], number[]][] = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ];
  for (const [n, u, v] of faces) {
    const base = a.pos.length / 3;
    for (let j = 0; j < 4; j++) {
      const su = j === 1 || j === 2 ? 1 : -1;
      const sv = j >= 2 ? 1 : -1;
      let x = n[0] * hx + u[0] * su * hx + v[0] * sv * hx;
      const y = n[1] * hy + u[1] * su * hy + v[1] * sv * hy;
      let z = n[2] * hz + u[2] * su * hz + v[2] * sv * hz;
      const k = y < 0 ? taper : 1;
      x *= k; z *= k;
      a.pos.push(cx + x, cy + y, cz + z);
      a.nrm.push(n[0], n[1], n[2]);
      // uv in metres along the face for the wicker weave
      const fu = (u[0] * x + u[1] * y + u[2] * z);
      const fv = (v[0] * x + v[1] * y + v[2] * z);
      a.uv.push(fu, fv);
      a.mat.push(mat);
      a.top.push(0);
    }
    a.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

function addTube(a: GeoAcc, p0: number[], p1: number[], r: number, sides: number, mat: number, top1: number): void {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  const w = [d[0] / len, d[1] / len, d[2] / len];
  const up = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = [w[1] * up[2] - w[2] * up[1], w[2] * up[0] - w[0] * up[2], w[0] * up[1] - w[1] * up[0]];
  const ul = Math.hypot(u[0], u[1], u[2]);
  u[0] /= ul; u[1] /= ul; u[2] /= ul;
  const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
  const base = a.pos.length / 3;
  for (let e = 0; e < 2; e++) {
    const p = e === 0 ? p0 : p1;
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2;
      const nx = u[0] * Math.cos(ang) + v[0] * Math.sin(ang);
      const ny = u[1] * Math.cos(ang) + v[1] * Math.sin(ang);
      const nz = u[2] * Math.cos(ang) + v[2] * Math.sin(ang);
      a.pos.push(p[0] + nx * r, p[1] + ny * r, p[2] + nz * r);
      a.nrm.push(nx, ny, nz);
      a.uv.push(i / sides, e * len);
      a.mat.push(mat);
      a.top.push(e === 1 ? top1 : 0);
    }
  }
  for (let i = 0; i < sides; i++) {
    const i1 = (i + 1) % sides;
    a.idx.push(base + i, base + sides + i, base + i1, base + i1, base + sides + i, base + sides + i1);
  }
}

function addCylinderY(a: GeoAcc, cx: number, y0: number, y1: number, cz: number, r: number, sides: number, mat: number): void {
  addTube(a, [cx, y0, cz], [cx, y1, cz], r, sides, mat, 0);
  // caps
  for (const [y, ny] of [[y0, -1], [y1, 1]] as const) {
    const base = a.pos.length / 3;
    a.pos.push(cx, y, cz); a.nrm.push(0, ny, 0); a.uv.push(0, 0); a.mat.push(mat); a.top.push(0);
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2;
      a.pos.push(cx + Math.cos(ang) * r, y, cz + Math.sin(ang) * r); a.nrm.push(0, ny, 0); a.uv.push(0, 0); a.mat.push(mat); a.top.push(0);
    }
    for (let i = 0; i < sides; i++) {
      const i1 = (i + 1) % sides;
      if (ny > 0) a.idx.push(base, base + 1 + i1, base + 1 + i);
      else a.idx.push(base, base + 1 + i, base + 1 + i1);
    }
  }
}

/** Basket (wicker), padded rim, uprights, load frame, twin burner, flying wires (top ends scale with R). */
export function buildGearGeometry(): BufferGeometry {
  const a: GeoAcc = { pos: [], nrm: [], uv: [], mat: [], top: [], idx: [] };
  const { frameY, rimY, floorY, basketW, basketD } = GEAR;
  const hw = basketW / 2, hd = basketD / 2;
  // basket body (slight taper toward the floor) — wicker
  addBox(a, 0, (rimY + floorY) / 2, 0, hw, (rimY - floorY) / 2, hd, 0, 0.94);
  // padded leather rim
  const rt = 0.07;
  addBox(a, 0, rimY + rt * 0.5, hd, hw + rt, rt, rt, 1);
  addBox(a, 0, rimY + rt * 0.5, -hd, hw + rt, rt, rt, 1);
  addBox(a, hw, rimY + rt * 0.5, 0, rt, rt, hd + rt, 1);
  addBox(a, -hw, rimY + rt * 0.5, 0, rt, rt, hd + rt, 1);
  // uprights (suede covered) from rim corners to the frame
  const fx = 0.42, fz = 0.38;
  const corners = [[hw - 0.05, hd - 0.05, fx, fz], [-hw + 0.05, hd - 0.05, -fx, fz], [hw - 0.05, -hd + 0.05, fx, -fz], [-hw + 0.05, -hd + 0.05, -fx, -fz]];
  for (const [bx, bz, tx, tz] of corners) addTube(a, [bx, rimY + 0.1, bz], [tx, frameY, tz], 0.03, 6, 4, 0);
  // load frame (square, steel)
  addTube(a, [fx, frameY, fz], [-fx, frameY, fz], 0.022, 5, 2, 0);
  addTube(a, [fx, frameY, -fz], [-fx, frameY, -fz], 0.022, 5, 2, 0);
  addTube(a, [fx, frameY, fz], [fx, frameY, -fz], 0.022, 5, 2, 0);
  addTube(a, [-fx, frameY, fz], [-fx, frameY, -fz], 0.022, 5, 2, 0);
  // twin burner cans + coil rings
  addCylinderY(a, 0.17, frameY + 0.02, GEAR.burnerTop, 0, 0.14, 12, 2);
  addCylinderY(a, -0.17, frameY + 0.02, GEAR.burnerTop, 0, 0.14, 12, 2);
  addCylinderY(a, 0.17, frameY + 0.12, frameY + 0.2, 0, 0.165, 12, 5);
  addCylinderY(a, -0.17, frameY + 0.12, frameY + 0.2, 0, 0.165, 12, 5);
  // flying wires: two per frame corner up to the mouth ring (top end: x/z multiplied by mouth radius in shader)
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const c = corners[Math.floor(k / 2) % 4];
    const tx = Math.cos(ang), tz = Math.sin(ang);
    // pick the frame corner nearest the top point
    let best = c, bd = Infinity;
    for (const cc of corners) { const d = Math.hypot(cc[2] - tx, cc[3] - tz); if (d < bd) { bd = d; best = cc; } }
    addTube(a, [best[2], frameY, best[3]], [tx, 0.02, tz], 0.012, 3, 3, 1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(a.nrm, 3));
  g.setAttribute('uv', new Float32BufferAttribute(a.uv, 2));
  g.setAttribute('aMat', new Float32BufferAttribute(a.mat, 1));
  g.setAttribute('aTop', new Float32BufferAttribute(a.top, 1));
  g.setIndex(a.idx);
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// Shaders

const ENV_VERT_PARS = /* glsl */ `
${glslInstanceFetch(TEXELS)}
${GLSL_LOD_VERT}
varying vec2 vKUv;
varying vec4 vKInst;   // style, palette, burner, seed
varying vec3 vKNrmW;
varying vec3 vKAxisDir;
`;

const ENV_VERT_PRE = /* glsl */ `
  vec4 i0 = instFetch(0); vec4 i1 = instFetch(1); vec4 i2 = instFetch(2);
  float R = i1.x, H = i1.y;
  vec3 kLocal = vec3(position.x * R, position.y * H, position.z * R);
  float kc = cos(i0.w), ks = sin(i0.w);
  vec3 kP = kRotY(kLocal, kc, ks) + i0.xyz;
  vec3 kNl = normalize(vec3(normal.x / R, normal.y / H, normal.z / R));
  vec3 kN = kRotY(kNl, kc, ks);
  float kVis = kLodPrepare(distance(i0.xyz + vec3(0.0, H * 0.5, 0.0), cameraPosition));
  vKUv = uv; vKInst = vec4(i1.z, i1.w, i2.x, i2.y); vKNrmW = kN;
  vKAxisDir = kRotY(normalize(vec3(position.x, 0.0, position.z) + 1e-5), kc, ks);
`;

const ENV_FRAG_PARS = /* glsl */ `
${GLSL_DITHER}
${GLSL_LOD_FRAG}
uniform vec3 uPal[36];
uniform vec3 uFlame;
uniform float uTrans;
varying vec2 vKUv;
varying vec4 vKInst;
varying vec3 vKNrmW;
varying vec3 vKAxisDir;
float kSeam;
float kT;

vec3 kPalette(int p, int k) { return uPal[p * 3 + k]; }

// returns colour for gore coordinate g (0..24) and height t (0..1, <0 = skirt)
vec3 kBalloonPattern(int style, int pal, float g, float t, float seed) {
  vec3 A = kPalette(pal, 0), B = kPalette(pal, 1), C = kPalette(pal, 2);
  float gi = floor(g);
  vec3 col = A;
  if (t < 0.0) return vec3(0.09, 0.085, 0.08); // nomex scoop
  if (t > 0.965) return mix(C, vec3(0.75), 0.25);  // parachute vent
  if (style == 0) {
    col = mod(gi, 2.0) < 0.5 ? A : B;
    if (t > 0.84) col = C;
    if (t < 0.12) col = C;
  } else if (style == 1) {
    float k = mod(gi, 3.0); col = k < 0.5 ? A : (k < 1.5 ? B : C);
  } else if (style == 2) {
    float k = floor(t * 7.0); float m = mod(k, 3.0);
    col = m < 0.5 ? A : (m < 1.5 ? B : C);
  } else if (style == 3) {
    float zz = abs(fract(g * 0.5) - 0.5) * 2.0;
    float band = t - (0.42 + zz * 0.14);
    col = band > 0.0 ? A : B;
    if (abs(band) < 0.04) col = C;
    float band2 = t - (0.72 + (1.0 - zz) * 0.08);
    if (abs(band2) < 0.025) col = C;
  } else if (style == 4) {
    // harlequin diamonds in the belly band
    if (t > 0.25 && t < 0.8) {
      vec2 q = vec2(g * 0.5, (t - 0.25) * 6.0);
      vec2 f = abs(fract(q) - 0.5);
      float d = f.x + f.y;
      float cell = mod(floor(q.x) + floor(q.y), 2.0);
      col = d < 0.5 ? (cell < 0.5 ? B : C) : A;
    } else col = A;
  } else if (style == 5) {
    float s = fract((g / 24.0) * 3.0 + t * 1.6);
    col = s < 0.33 ? A : (s < 0.66 ? B : C);
  } else if (style == 6) {
    // chevron rings pointing up
    float v = t * 9.0 + abs(fract(g) - 0.5) * 1.2;
    float m = mod(floor(v), 3.0);
    col = m < 0.5 ? A : (m < 1.5 ? B : C);
    if (t < 0.2) col = A;
  } else if (style == 7) {
    // sun rays from the crown
    float w = 0.5 * (1.0 - smoothstep(0.35, 0.95, t));
    float r = abs(fract(g) - 0.5);
    col = r < w * 0.6 ? B : A;
    if (t > 0.8) col = C;
  } else if (style == 8) {
    // ombre A→B with thin C rings
    col = mix(A, B, smoothstep(0.1, 0.9, t));
    if (abs(fract(t * 5.0) - 0.5) > 0.46) col = C;
  } else if (style == 9) {
    float m = mod(gi + floor(t * 8.0), 2.0);
    col = m < 0.5 ? A : B;
    if (t > 0.78) col = C;
  } else if (style == 10) {
    float wave = 0.5 + 0.06 * sin(g * 0.5236 * 2.0 + seed * 6.0);
    col = t > wave ? A : B;
    if (abs(t - wave) < 0.035) col = C;
  } else {
    float hside = step(12.0, mod(g + 6.0, 24.0));
    col = hside > 0.5 ? A : B;
    if (abs(t - 0.56) < 0.06) col = C;
  }
  return col;
}
`;

const ENV_FRAG_COLOR = /* glsl */ `
  {
    float g = vKUv.x; kT = vKUv.y;
    int style = int(vKInst.x + 0.5);
    int pal = int(vKInst.y + 0.5);
    vec3 col = kBalloonPattern(style, pal, g, kT, vKInst.w);
    // load tapes: vertical at gore seams, horizontal every 1/9 of the height
    float fg = fract(g);
    float vs = 1.0 - smoothstep(0.0, 0.035, min(fg, 1.0 - fg));
    float fh = fract(kT * 9.0);
    float hs = 1.0 - smoothstep(0.0, 0.05, min(fh, 1.0 - fh));
    kSeam = max(vs, hs * 0.7) * step(0.0, kT);
    col = mix(col, col * 0.62, kSeam * 0.85);
    diffuseColor.rgb = col;
  }
`;

const ENV_FRAG_NORMAL = /* glsl */ `
  {
    vec3 Nw = normalize(vKNrmW);
    vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), vKAxisDir));
    float fg = fract(vKUv.x);
    // fabric bulge between load tapes (normal only on top of the LOD0 geometric bulge)
    float tilt = (fg - 0.5) * 0.35;
    vec3 pn = normalize(Nw + T * tilt);
    if (!gl_FrontFacing) pn = -pn;
    normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);
  }
`;

const ENV_FRAG_LIGHT = /* glsl */ `
  {
    float burner = vKInst.z;
    // Translucency: sun light transmitted through the nylon (stained-glass glow when the sun is behind).
    #if NUM_DIR_LIGHTS > 0
      vec3 Ls = directionalLights[0].direction;
      vec3 Vv = geometryViewDir;
      float facing = dot(geometryNormal, Ls);
      float back = clamp(-facing, 0.0, 1.0);
      float fwd = pow(clamp(dot(-Vv, Ls), 0.0, 1.0), 3.0);
      // transmitted light is filtered by the dye twice (saturated) and only ~15-25 % gets through
      vec3 dye = diffuseColor.rgb * diffuseColor.rgb * 1.6;
      vec3 trans = directionalLights[0].color * dye * back * (0.06 + 0.55 * fwd);
      reflectedLight.directDiffuse += trans * uTrans * (1.0 - kSeam * 0.7);
      // the shadowed side reads darker so the glow carries the shape
      reflectedLight.indirectDiffuse *= 1.0 - 0.35 * back * fwd;
    #endif
    // Burner: the whole envelope lights from within (lantern); the inside is much brighter.
    float lower = pow(clamp(1.0 - kT, 0.0, 1.0), 1.4);
    vec3 glow = uFlame * burner * diffuseColor.rgb * (gl_FrontFacing ? 0.55 * lower + 0.12 : 2.4 * lower + 0.6);
    reflectedLight.directDiffuse += glow * (1.0 - kSeam * 0.5);
  }
`;

const GEAR_VERT_PARS = /* glsl */ `
${glslInstanceFetch(TEXELS)}
${GLSL_LOD_VERT}
attribute float aMat;
attribute float aTop;
varying float vKMat;
varying vec2 vKUv2;
varying vec3 vKNrmW;
varying vec3 vKLocal;
`;

const GEAR_VERT_PRE = /* glsl */ `
  vec4 i0 = instFetch(0); vec4 i1 = instFetch(1);
  vec3 kLocal = position;
  if (aTop > 0.5) kLocal.xz *= i1.x * ${ENVELOPE.mouth.toFixed(3)};
  float kc = cos(i0.w), ks = sin(i0.w);
  vec3 kP = kRotY(kLocal, kc, ks) + i0.xyz;
  vec3 kN = kRotY(normal, kc, ks);
  float kVis = kLodPrepare(distance(i0.xyz, cameraPosition));
  vKMat = aMat; vKUv2 = uv; vKNrmW = kN; vKLocal = position;
`;

const GEAR_FRAG_PARS = /* glsl */ `
${GLSL_NOISE}
${GLSL_DITHER}
${GLSL_LOD_FRAG}
uniform vec3 uFlame;
varying float vKMat;
varying vec2 vKUv2;
varying vec3 vKNrmW;
varying vec3 vKLocal;
float kRough; float kMetal; float kWeave;
`;

const GEAR_FRAG_COLOR = /* glsl */ `
  {
    int m = int(vKMat + 0.5);
    vec3 col; kRough = 0.8; kMetal = 0.0; kWeave = 0.0;
    if (m == 0) {
      // wicker weave: over-under strands
      vec2 q = vKUv2 * vec2(22.0, 14.0);
      float row = floor(q.y);
      float w = sin((q.x + row * 0.5) * 3.14159);
      float strand = abs(fract(q.y) - 0.5);
      kWeave = smoothstep(0.5, 0.2, strand) * (0.6 + 0.4 * w);
      col = mix(vec3(0.20, 0.12, 0.055), vec3(0.42, 0.28, 0.14), kWeave);
      col *= 0.85 + 0.3 * kNoise2(vKUv2 * 3.0);
      kRough = 0.85;
    } else if (m == 1) { col = vec3(0.10, 0.055, 0.03); kRough = 0.55; }
    else if (m == 2) { col = vec3(0.62, 0.63, 0.64); kRough = 0.32; kMetal = 1.0; }
    else if (m == 3) { col = vec3(0.05, 0.045, 0.04); kRough = 0.7; }
    else if (m == 4) { col = vec3(0.12, 0.10, 0.085); kRough = 0.9; }
    else { col = vec3(0.35, 0.33, 0.3); kRough = 0.4; kMetal = 1.0; }
    diffuseColor.rgb = col;
  }
`;

// ---------------------------------------------------------------------------------------------------------------

const FLAME_VERT = /* glsl */ `
${glslInstanceFetch(TEXELS)}
attribute float aPart;
uniform float uTime;
varying vec2 vUv;
varying float vPart;
varying float vI;
varying float vSeed;
void main() {
  vec4 i0 = instFetch(0); vec4 i2 = instFetch(2);
  float b = i2.x;
  vPart = aPart; vUv = uv; vI = b; vSeed = i2.y;
  if (b < 0.01) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
  vec3 base = i0.xyz + vec3(0.0, ${GEAR.burnerTop.toFixed(2)}, 0.0);
  vec3 toCam = cameraPosition - base;
  vec3 right;
  vec3 up;
  float w, h;
  if (aPart < 0.5) {
    // cylindrical billboard around +Y
    right = normalize(vec3(toCam.z, 0.0, -toCam.x) + 1e-5);
    up = vec3(0.0, 1.0, 0.0);
    w = 0.95 * (0.7 + 0.3 * b); h = 3.1 * (0.45 + 0.55 * b);
    base += vec3(0.0, h * 0.5 - 0.15, 0.0);
  } else {
    vec3 f = normalize(toCam);
    right = normalize(cross(vec3(0.0, 1.0, 0.0), f) + 1e-5);
    up = cross(f, right);
    w = h = 7.0 * (0.5 + 0.5 * b);
    base += vec3(0.0, 1.4, 0.0) + f * 0.8;
  }
  vec3 p = base + right * position.x * w + up * position.y * h;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FLAME_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vPart;
varying float vI;
varying float vSeed;
${GLSL_NOISE}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  if (vPart < 0.5) {
    // flame: teardrop with rising turbulence (shape animates, brightness stays smooth: no strobe)
    float y = vUv.y;
    float n = kNoise2(vec2(p.x * 3.0 + vSeed * 10.0, y * 4.0 - uTime * 6.0));
    float n2 = kNoise2(vec2(p.x * 7.0 - vSeed * 4.0, y * 9.0 - uTime * 11.0));
    float width = (1.0 - y) * 0.85 * (0.75 + 0.25 * n) + 0.05;
    float xx = p.x + (n - 0.5) * 0.35 * y;
    float body = smoothstep(width, width * 0.35, abs(xx)) * smoothstep(0.0, 0.08, y) * smoothstep(1.0, 0.55 + 0.3 * n2, y);
    float core = smoothstep(width * 0.45, 0.0, abs(xx)) * smoothstep(0.55, 0.0, y);
    vec3 blue = vec3(0.25, 0.45, 1.6);
    vec3 yellow = vec3(6.0, 3.6, 1.1);
    vec3 orange = vec3(4.0, 1.3, 0.25);
    vec3 col = mix(yellow, orange, smoothstep(0.25, 0.9, y));
    col = mix(blue, col, smoothstep(0.02, 0.16, y));
    col += yellow * core * 0.6;
    float a = body * vI;
    gl_FragColor = vec4(col * a, 0.0);
  } else {
    float r = length(p);
    float g = exp(-r * r * 5.0) * 0.22 * vI;
    gl_FragColor = vec4(vec3(1.0, 0.55, 0.22) * g, 0.0);
  }
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function buildFlameGeometry(capacity: number): { geo: InstancedBufferGeometry; idx: InstancedBufferAttribute } {
  const pos: number[] = [], uv: number[] = [], part: number[] = [], idx: number[] = [];
  for (let p = 0; p < 2; p++) {
    const b = p * 4;
    pos.push(-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    part.push(p, p, p, p);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const geo = new InstancedBufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geo.setAttribute('aPart', new Float32BufferAttribute(part, 1));
  geo.setIndex(idx);
  const ia = new InstancedBufferAttribute(new Float32Array(capacity), 1);
  ia.setUsage(DynamicDrawUsage);
  geo.setAttribute('aIdx', ia);
  geo.instanceCount = 0;
  return { geo, idx: ia };
}

// ---------------------------------------------------------------------------------------------------------------

/** Fallback for dev pages until the sim's balloonPos() is wired: p(t) = p0 + drift·t + A·sin(ωt+φ) + rise·t. */
export type BalloonPosFn = (def: BalloonDef, tSec: number, out: [number, number, number] | Float64Array | number[]) => void;

export function balloonPosFallback(def: BalloonDef, t: number, out: [number, number, number] | Float64Array | number[]): void {
  const s = Math.sin(def.omega * t + def.phase);
  out[0] = def.p0[0] + def.drift[0] * t + def.amp[0] * s;
  out[1] = def.p0[1] + def.drift[1] * t + def.amp[1] * Math.sin(def.omega * 0.7 * t + def.phase * 1.3) + def.rise * t;
  out[2] = def.p0[2] + def.drift[2] * t + def.amp[2] * Math.cos(def.omega * t + def.phase);
}

/**
 * Where the sim's balloon position sits on the visual balloon. 'center' = collision ellipsoid centre
 * (envelope mid-height), 'mouth' = envelope mouth. Mouth = pos − anchorOffsetY·H.
 */
export interface BalloonAnchor { mode: 'center' | 'mouth'; centerFrac: number }

const _pos = new Float64Array(3);

export class BalloonLayer {
  readonly table: InstanceTable;
  envDrawer: LodDrawer | null = null;
  gearDrawer: LodDrawer | null = null;
  flame: Mesh | null = null;
  private flameIdx: InstancedBufferAttribute | null = null;
  private flameGeo: InstancedBufferGeometry | null = null;
  private flameMat: ShaderMaterial | null = null;
  private defs: BalloonDef[] = [];
  private burnUntil: Float32Array = new Float32Array(0);
  private burnStart: Float32Array = new Float32Array(0);
  private burn: Float32Array = new Float32Array(0);
  private cfg: PropTierConfig;
  private readonly parent: Object3D;
  private posFn: BalloonPosFn = balloonPosFallback;
  anchor: BalloonAnchor = { mode: 'center', centerFrac: 0.5 };
  /** Last computed mouth positions (world), 3 floats per balloon. */
  readonly mouths: Float32Array;
  private readonly palUniform: Vector3[] = [];
  private readonly flameColor = new Vector3(1.0, 0.55, 0.2);
  private time = 0;
  private envUniforms: LodUniforms[] = [];
  private readonly timeU = { value: 0 };

  constructor(parent: Object3D, cfg: PropTierConfig, capacity = 64) {
    this.parent = parent;
    this.cfg = cfg;
    this.table = new InstanceTable(capacity, TEXELS);
    this.mouths = new Float32Array(capacity * 3);
    for (const p of BALLOON_PALETTES) for (const h of p) this.palUniform.push(hexLinear(h));
  }

  setPositionFn(fn: BalloonPosFn): void {
    this.posFn = fn;
  }

  build(defs: BalloonDef[]): void {
    this.defs = defs.slice(0, this.table.capacity);
    const n = this.defs.length;
    this.burnUntil = new Float32Array(n);
    this.burnStart = new Float32Array(n).fill(-100);
    this.burn = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = this.defs[i];
      const style = ((d.pattern % 12) + 12) % 12;
      const pal = (style * 7 + d.id * 5) % 12;
      this.table.write(i, 1, d.envelopeR, d.envelopeH, style, pal);
      this.table.write(i, 2, 0, hashSeed(d.id * 31 + 7), 0, 0);
    }
    this.table.count = n;
    this.makeDrawers();
    this.update(0, null, 0);
  }

  private makeDrawers(): void {
    this.disposeDrawers();
    const shadows = this.cfg.heroShadows;
    const e0 = buildEnvelopeUnit(2, 32, 0.022);
    const e1 = buildEnvelopeUnit(1, 12, 0.0);
    const u0 = LodDrawer.makeUniforms(this.table, 0);
    const u1 = LodDrawer.makeUniforms(this.table, 1);
    this.envUniforms = [u0, u1];
    this.envDrawer = new LodDrawer(this.table, [
      { geometry: e0, material: this.envMaterial(u0, true, false), depthMaterial: this.envMaterial(u0, true, true), castShadow: shadows },
      { geometry: e1, material: this.envMaterial(u1, false, false) },
    ], 'balloon-env', 0);
    this.envDrawer.bindUniforms([u0, u1]);
    this.envDrawer.addTo(this.parent);
    const gu = LodDrawer.makeUniforms(this.table, 0);
    this.gearDrawer = new LodDrawer(this.table, [{ geometry: buildGearGeometry(), material: this.gearMaterial(gu) }], 'balloon-gear', 0);
    this.gearDrawer.bindUniforms([gu]);
    this.gearDrawer.addTo(this.parent);
    const { geo, idx } = buildFlameGeometry(this.table.capacity);
    this.flameGeo = geo;
    this.flameIdx = idx;
    this.flameMat = new ShaderMaterial({
      vertexShader: FLAME_VERT,
      fragmentShader: FLAME_FRAG,
      uniforms: { uInstTex: { value: this.table.tex }, uTime: this.timeU },
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      toneMapped: true,
    });
    this.flame = new Mesh(geo, this.flameMat);
    this.flame.frustumCulled = false;
    this.flame.renderOrder = 20;
    this.flame.name = 'balloon-flames';
    this.parent.add(this.flame);
    this.applyDistances();
  }

  private envMaterial(u: LodUniforms, lod0: boolean, depth: boolean): MeshStandardMaterial | MeshDepthMaterial {
    const uniforms = { ...u, uPal: { value: this.palUniform }, uFlame: { value: this.flameColor }, uTrans: { value: 1.0 } };
    const common = {
      uniforms,
      vertexPars: ENV_VERT_PARS,
      vertexPre: ENV_VERT_PRE,
      vertexNormal: 'vec3 objectNormal = kN;',
      vertexBegin: 'vec3 transformed = kP;',
      vertexEnd: 'if (kVis <= 0.0) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);',
    };
    if (depth) {
      return patchMaterial(new MeshDepthMaterial({ depthPacking: RGBADepthPacking, side: DoubleSide }), {
        ...common, key: 'balloon-depth', fragPars: GLSL_DITHER + GLSL_LOD_FRAG, fragPre: 'kLodClip();',
      });
    }
    const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0, side: lod0 ? DoubleSide : FrontSide });
    return patchMaterial(m, {
      ...common,
      key: `balloon-env-${lod0 ? 0 : 1}`,
      fragPars: ENV_FRAG_PARS,
      fragPre: 'kLodClip();',
      fragColor: ENV_FRAG_COLOR,
      fragNormal: ENV_FRAG_NORMAL,
      fragLight: ENV_FRAG_LIGHT,
    });
  }

  private gearMaterial(u: LodUniforms): MeshStandardMaterial {
    const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });
    return patchMaterial(m, {
      key: 'balloon-gear',
      uniforms: { ...u, uFlame: { value: this.flameColor } },
      vertexPars: GEAR_VERT_PARS,
      vertexPre: GEAR_VERT_PRE,
      vertexNormal: 'vec3 objectNormal = kN;',
      vertexBegin: 'vec3 transformed = kP;',
      vertexEnd: 'if (kVis <= 0.0) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);',
      fragPars: GEAR_FRAG_PARS,
      fragPre: 'kLodClip();',
      fragColor: GEAR_FRAG_COLOR,
      fragRoughness: 'roughnessFactor = kRough;',
      fragMetalness: 'metalnessFactor = kMetal;',
      fragLight: 'reflectedLight.indirectDiffuse *= mix(0.55, 1.0, kWeave);',
    });
  }

  private applyDistances(): void {
    const c = this.cfg;
    this.envDrawer?.setDistances([c.balloonLod0], 12000, 0.2);
    this.gearDrawer?.setDistances([], Math.max(700, c.balloonLod0 * 2.2), 0.2);
    if (this.envDrawer) this.envDrawer.cullMargin = 12;
    if (this.gearDrawer) this.gearDrawer.cullMargin = 6;
  }

  setTier(cfg: PropTierConfig): void {
    const rebuild = cfg.heroShadows !== this.cfg.heroShadows;
    this.cfg = cfg;
    if (rebuild && this.table.count > 0) this.makeDrawers();
    else this.applyDistances();
  }

  /** Balloon Thread "salute" / ambient burn. Duration in seconds; flame ramps in over 120 ms. */
  fireBurner(balloonId: number, duration = 1.6): void {
    for (let i = 0; i < this.defs.length; i++) {
      if (this.defs[i].id !== balloonId) continue;
      if (this.time >= this.burnUntil[i]) this.burnStart[i] = this.time;
      this.burnUntil[i] = Math.max(this.burnUntil[i], this.time + duration);
    }
  }

  /** World position of balloon `id`'s mouth (for VFX arcs etc.). Returns false if unknown. */
  mouthOf(balloonId: number, out: Vector3): boolean {
    for (let i = 0; i < this.defs.length; i++) {
      if (this.defs[i].id !== balloonId) continue;
      out.set(this.mouths[i * 3], this.mouths[i * 3 + 1], this.mouths[i * 3 + 2]);
      return true;
    }
    return false;
  }

  /** Collision-ellipsoid centre of balloon index i (world). */
  centerOf(i: number, out: Vector3): void {
    const d = this.defs[i];
    out.set(this.mouths[i * 3], this.mouths[i * 3 + 1] + d.envelopeH * this.anchor.centerFrac, this.mouths[i * 3 + 2]);
  }

  get count(): number { return this.defs.length; }
  defAt(i: number): BalloonDef { return this.defs[i]; }

  update(simTime: number, camera: Camera | null, renderTime: number): void {
    this.time = simTime;
    this.timeU.value = renderTime % 1000;
    const n = this.defs.length;
    let bestI = -1, bestB = 0;
    let camX = 0, camY = 0, camZ = 0;
    if (camera) { const e = camera.matrixWorld.elements; camX = e[12]; camY = e[13]; camZ = e[14]; }
    let bestScore = 0;
    for (let i = 0; i < n; i++) {
      const d = this.defs[i];
      this.posFn(d, simTime, _pos);
      let mx = _pos[0], my = _pos[1], mz = _pos[2];
      if (this.anchor.mode === 'center') my -= d.envelopeH * this.anchor.centerFrac;
      this.mouths[i * 3] = mx; this.mouths[i * 3 + 1] = my; this.mouths[i * 3 + 2] = mz;
      // slow deterministic spin (balloons rotate a few degrees per second at most)
      const yaw = (hashSeed(d.id) * 6.283 + simTime * (0.02 + 0.03 * hashSeed(d.id + 99))) % 6.2831853;
      // burner: event-driven salute + ambient cosmetic burns (smooth envelope, ≤2.2 Hz modulation → no strobe)
      let b = 0;
      if (simTime < this.burnUntil[i]) {
        const a = Math.min(1, (simTime - this.burnStart[i]) / 0.12);
        const r = Math.min(1, (this.burnUntil[i] - simTime) / 0.25);
        b = Math.min(a, r);
      }
      const period = 11 + 9 * hashSeed(d.id * 3 + 1);
      const ph = ((simTime + hashSeed(d.id * 5 + 2) * period) % period) / period;
      const len = 0.13 + 0.06 * hashSeed(d.id * 9 + 4);
      if (ph < len) b = Math.max(b, Math.sin((ph / len) * Math.PI) * 0.75);
      if (b > 0) b *= 0.9 + 0.1 * Math.sin(simTime * 13.8 + d.id);
      this.burn[i] = b;
      this.table.write(i, 0, mx, my, mz, yaw);
      this.table.write(i, 2, b, hashSeed(d.id * 31 + 7), 0, 0);
      const R = d.envelopeR, H = d.envelopeH;
      this.table.bounds(i, mx, my + H * 0.35, mz, Math.hypot(R, H * 0.7));
      if (b > 0.05 && camera) {
        const dx = mx - camX, dy = my + GEAR.burnerTop - camY, dz = mz - camZ;
        const score = b / (1 + (dx * dx + dy * dy + dz * dz) / 900);
        if (score > bestScore) { bestScore = score; bestI = i; bestB = b; }
      }
    }
    this.table.upload();
    if (bestI >= 0) {
      const k = 3.5 * bestB;
      setWarmLight(this.mouths[bestI * 3], this.mouths[bestI * 3 + 1] + GEAR.burnerTop + 1.2, this.mouths[bestI * 3 + 2], 1.0 * k, 0.5 * k, 0.18 * k, 32);
    } else setWarmLight(0, -1e6, 0, 0, 0, 0, 30);
    if (camera) {
      this.envDrawer?.cull(camera);
      this.gearDrawer?.cull(camera);
    }
    if (this.flameIdx && this.flameGeo && this.flame) {
      let c = 0;
      const arr = this.flameIdx.array as Float32Array;
      for (let i = 0; i < n; i++) if (this.burn[i] > 0.01) arr[c++] = i;
      this.flameGeo.instanceCount = c;
      if (c > 0) { this.flameIdx.clearUpdateRanges(); this.flameIdx.addUpdateRange(0, c); this.flameIdx.needsUpdate = true; }
      this.flame.visible = c > 0;
    }
  }

  /** Dev/turntable: draw all instances at a fixed LOD regardless of camera. */
  forceLod(L: number): void {
    this.envDrawer?.showAll(L);
    this.gearDrawer?.showAll(0);
    if (this.envDrawer) {
      for (let k = 0; k < this.envDrawer.meshes.length; k++) this.envDrawer.meshes[k].visible = k === L;
      this.envUniforms[L].uLodBand.value.set(1e7, 1e7 + 1, 1e7, 1e7 + 1);
      this.envUniforms[L].uLodSide.value = 0;
    }
  }

  calls(): number { return (this.envDrawer?.calls() ?? 0) + (this.gearDrawer?.calls() ?? 0) + (this.flame?.visible ? 1 : 0); }
  triangles(): number { return (this.envDrawer?.triangles() ?? 0) + (this.gearDrawer?.triangles() ?? 0) + (this.flameGeo ? this.flameGeo.instanceCount * 4 : 0); }

  private disposeDrawers(): void {
    if (this.envDrawer) { this.envDrawer.removeFrom(this.parent); this.envDrawer.dispose(); this.envDrawer = null; }
    if (this.gearDrawer) { this.gearDrawer.removeFrom(this.parent); this.gearDrawer.dispose(); this.gearDrawer = null; }
    if (this.flame) { this.parent.remove(this.flame); this.flameGeo?.dispose(); this.flameMat?.dispose(); this.flame = null; }
  }

  dispose(): void {
    this.disposeDrawers();
    this.table.dispose();
  }
}
