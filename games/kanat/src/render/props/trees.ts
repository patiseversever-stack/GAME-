// Trees: poplar (kavak, Kapadokya), Calabrian pine (kızılçam, Likya), spruce (ladin, Karadeniz), juniper (ardıç,
// Pamukkale). ≤600 tris per tree, 2 variants per species merged into one geometry (vertex shader collapses the other
// variant) → per species: 1 mesh draw + 1 octahedral-impostor draw (baked at load), dithered cross-fade between them.
import {
  BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, ShaderMaterial, DoubleSide, FrontSide,
  Vector3, Vector4,
} from 'three';
import type { Camera, Object3D, WebGLRenderer, Texture } from 'three';
import type { PropInstance, WorldId } from '../../sim/types.ts';
import { InstanceTable, LodDrawer } from './InstanceTable.ts';
import type { LodUniforms } from './InstanceTable.ts';
import { patchMaterial } from './patch.ts';
import { GLSL_NOISE, GLSL_DITHER, glslInstanceFetch, GLSL_LOD_VERT, GLSL_LOD_FRAG } from './glsl.ts';
import { foliageAtlas } from './foliage.ts';
import { detailTexture, mulberry32 } from './textures.ts';
import { bakeImpostors, GLSL_HEMI_OCT, IMPOSTOR_GRID } from './impostor.ts';
import type { ImpostorAtlas } from './impostor.ts';
import { primYRange } from './fit.ts';
import { hexLinear, hashSeed } from './chimneys.ts';
import type { PropTierConfig } from './tiers.ts';
import { sharedUniforms } from '../vfx/shared.ts';

export type TreeSpecies = 0 | 1 | 2 | 3;
export const TREE_SPECIES_NAMES = ['poplar', 'pine', 'spruce', 'juniper'] as const;

interface SpeciesDef { canonH: number; crownR: number; bark: string; barkTop: string; trunkR: number; tint: string }
export const SPECIES: SpeciesDef[] = [
  { canonH: 18, crownR: 2.2, bark: '#9C978C', barkTop: '#B8B2A4', trunkR: 0.26, tint: '#FFFFFF' },
  { canonH: 14, crownR: 5.0, bark: '#5E3F2E', barkTop: '#A0603A', trunkR: 0.3, tint: '#FFFFFF' },
  { canonH: 26, crownR: 4.2, bark: '#4A3E36', barkTop: '#5A4A3E', trunkR: 0.34, tint: '#FFFFFF' },
  { canonH: 6, crownR: 2.4, bark: '#6A4B3A', barkTop: '#7A5844', trunkR: 0.16, tint: '#FFFFFF' },
];

export function defaultSpeciesFor(world: WorldId): TreeSpecies {
  return world === 'kapadokya' ? 0 : world === 'likya' ? 1 : world === 'pamukkale' ? 3 : 2;
}

interface Acc { pos: number[]; nrm: number[]; uv: number[]; kind: number[]; variant: number[]; sway: number[]; idx: number[] }

function addTrunk(a: Acc, pts: Vector3[], r0: number, r1: number, sides: number, v: number, H: number): void {
  const base = a.pos.length / 3;
  const n = pts.length;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    const r = r0 + (r1 - r0) * t;
    const p = pts[k];
    const d = k < n - 1 ? pts[k + 1].clone().sub(p) : p.clone().sub(pts[k - 1]);
    d.normalize();
    const u = Math.abs(d.y) < 0.95 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    const s = new Vector3().crossVectors(d, u).normalize();
    const w = new Vector3().crossVectors(s, d).normalize();
    for (let i = 0; i <= sides; i++) {
      const ang = (i / sides) * Math.PI * 2;
      const nx = s.x * Math.cos(ang) + w.x * Math.sin(ang);
      const ny = s.y * Math.cos(ang) + w.y * Math.sin(ang);
      const nz = s.z * Math.cos(ang) + w.z * Math.sin(ang);
      a.pos.push(p.x + nx * r, p.y + ny * r, p.z + nz * r);
      a.nrm.push(nx, ny, nz);
      a.uv.push((i / sides) * Math.PI * 2 * Math.max(r0, 0.15) * 2.5, p.y);
      a.kind.push(0);
      a.variant.push(v);
      a.sway.push(Math.min(1, p.y / H) ** 2);
    }
  }
  for (let k = 0; k < n - 1; k++) {
    for (let i = 0; i < sides; i++) {
      const a0 = base + k * (sides + 1) + i, b0 = a0 + 1, c0 = a0 + sides + 1, d0 = c0 + 1;
      a.idx.push(a0, c0, b0, b0, c0, d0);
    }
  }
}

/** One leaf card centred at c, plane spanned by (t1, t2), lighting normal n. */
function addCard(a: Acc, c: Vector3, t1: Vector3, t2: Vector3, n: Vector3, size: number, species: number, v: number, H: number, flip: boolean): void {
  const base = a.pos.length / 3;
  const u0 = (species % 2) * 0.5, v0 = Math.floor(species / 2) * 0.5;
  const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
  for (const [sx, sy] of corners) {
    a.pos.push(c.x + (t1.x * sx + t2.x * sy) * size * 0.5, c.y + (t1.y * sx + t2.y * sy) * size * 0.5, c.z + (t1.z * sx + t2.z * sy) * size * 0.5);
    a.nrm.push(n.x, n.y, n.z);
    const uu = flip ? -sx : sx;
    a.uv.push(u0 + (uu * 0.5 + 0.5) * 0.5, v0 + (0.5 - sy * 0.5) * 0.5);
    a.kind.push(1);
    a.variant.push(v);
    a.sway.push(Math.min(1, c.y / H) ** 1.5);
  }
  a.idx.push(base, base + 3, base + 1, base + 1, base + 3, base + 2);
}

function randomCard(a: Acc, rnd: () => number, c: Vector3, center: Vector3, size: number, species: number, v: number, H: number, upBias: number, droop = 0): void {
  const n = c.clone().sub(center);
  n.y += upBias;
  if (n.lengthSq() < 1e-6) n.set(0, 1, 0);
  n.normalize();
  // card plane: random orientation, but not edge-on to the radial direction
  const r = new Vector3(rnd() - 0.5, (rnd() - 0.5) * 0.6, rnd() - 0.5).normalize();
  const cardN = n.clone().multiplyScalar(0.6).add(r).normalize();
  if (droop > 0) cardN.lerp(new Vector3(0, 1, 0), droop).normalize();
  const t1 = new Vector3().crossVectors(cardN, Math.abs(cardN.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize();
  const t2 = new Vector3().crossVectors(cardN, t1).normalize();
  const rot = rnd() * Math.PI * 2;
  const t1r = t1.clone().multiplyScalar(Math.cos(rot)).addScaledVector(t2, Math.sin(rot));
  const t2r = t2.clone().multiplyScalar(Math.cos(rot)).addScaledVector(t1, -Math.sin(rot));
  addCard(a, c, t1r, t2r, n, size, species, v, H, rnd() > 0.5);
}

function bend(p0: Vector3, p1: Vector3, segs: number, wobble: number, rnd: () => number): Vector3[] {
  const pts: Vector3[] = [];
  for (let k = 0; k <= segs; k++) {
    const t = k / segs;
    const p = p0.clone().lerp(p1, t);
    if (k > 0 && k < segs) { p.x += (rnd() - 0.5) * wobble; p.z += (rnd() - 0.5) * wobble; }
    pts.push(p);
  }
  return pts;
}

/** Canonical tree in metres (ground at y = 0). Returns triangle count too. */
export function buildTree(acc: Acc, species: TreeSpecies, variant: number): void {
  const rnd = mulberry32(1000 + species * 97 + variant * 13);
  const S = SPECIES[species];
  const H = S.canonH * (variant === 0 ? 1 : 0.88);
  const v = variant;
  if (species === 0) {
    // Lombardy poplar: columnar crown
    const Rm = S.crownR * (variant === 0 ? 1 : 1.18);
    addTrunk(acc, bend(new Vector3(0, -0.5, 0), new Vector3(0.1, H * 0.86, 0), 6, 0.12, rnd), S.trunkR, 0.05, 7, v, H);
    const center = new Vector3(0, H * 0.55, 0);
    for (let i = 0; i < 200; i++) {
      const s = 0.06 + rnd() * 0.94;
      const y = H * (0.12 + s * 0.86);
      const prof = Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05)), 0.55) * Rm;
      const ang = rnd() * Math.PI * 2;
      const rr = prof * (0.45 + 0.55 * Math.sqrt(rnd()));
      const c = new Vector3(Math.cos(ang) * rr, y, Math.sin(ang) * rr);
      center.set(0, y, 0);
      randomCard(acc, rnd, c, center, 1.5 + rnd() * 0.9, 0, v, H, 0.15);
    }
  } else if (species === 1) {
    // Calabrian pine: bare leaning trunk, limbs to an irregular flat-topped umbrella of clumps
    const lean = new Vector3((rnd() - 0.5) * 1.2, 0, (rnd() - 0.5) * 1.2);
    const top = new Vector3(lean.x, H * 0.62, lean.z);
    addTrunk(acc, bend(new Vector3(0, -0.5, 0), top, 5, 0.25, rnd), S.trunkR, 0.16, 7, v, H);
    const clumps = variant === 0 ? 6 : 5;
    for (let k = 0; k < clumps; k++) {
      const ang = (k / clumps) * Math.PI * 2 + rnd() * 0.6;
      const d = S.crownR * (0.45 + 0.4 * rnd());
      const cc = new Vector3(lean.x + Math.cos(ang) * d, H * (0.78 + 0.14 * rnd()), lean.z + Math.sin(ang) * d);
      addTrunk(acc, bend(top.clone().add(new Vector3(0, -0.4, 0)), cc.clone().add(new Vector3(0, -0.5, 0)), 2, 0.2, rnd), 0.12, 0.05, 4, v, H);
      const cr = 1.8 + rnd() * 0.8;
      for (let i = 0; i < 26; i++) {
        const p = new Vector3((rnd() - 0.5) * 2, (rnd() - 0.5) * 0.9, (rnd() - 0.5) * 2).normalize().multiplyScalar(cr * Math.cbrt(rnd()));
        p.y *= 0.55;
        const c = cc.clone().add(p);
        randomCard(acc, rnd, c, cc.clone().add(new Vector3(0, -0.8, 0)), 1.9 + rnd() * 0.9, 1, v, H, 0.6, 0.35);
      }
    }
    // central top clump
    const cc = new Vector3(lean.x, H * 0.93, lean.z);
    for (let i = 0; i < 20; i++) {
      const p = new Vector3((rnd() - 0.5) * 2, (rnd() - 0.5), (rnd() - 0.5) * 2).normalize().multiplyScalar(2.2 * Math.cbrt(rnd()));
      p.y *= 0.5;
      randomCard(acc, rnd, cc.clone().add(p), cc.clone().add(new Vector3(0, -1, 0)), 2.0 + rnd() * 0.8, 1, v, H, 0.6, 0.35);
    }
  } else if (species === 2) {
    // Spruce: straight trunk, drooping whorls on a cone
    addTrunk(acc, bend(new Vector3(0, -0.5, 0), new Vector3(0, H * 0.97, 0), 6, 0.04, rnd), S.trunkR, 0.04, 7, v, H);
    const Rb = S.crownR * (variant === 0 ? 1 : 1.12);
    const whorls = 15;
    for (let w = 0; w < whorls; w++) {
      const s = w / (whorls - 1);
      const y = H * (0.08 + s * 0.88);
      const rad = Rb * Math.pow(1 - s, 0.95) + 0.35;
      const cards = Math.max(4, Math.round(13 * (1 - s * 0.6)));
      for (let i = 0; i < cards; i++) {
        const ang = (i / cards) * Math.PI * 2 + w * 0.7 + rnd() * 0.4;
        const rr = rad * (0.55 + 0.45 * rnd());
        const c = new Vector3(Math.cos(ang) * rr, y - rr * 0.25, Math.sin(ang) * rr);
        const dir = new Vector3(Math.cos(ang), -0.35, Math.sin(ang)).normalize();
        const side = new Vector3(-Math.sin(ang), 0, Math.cos(ang));
        const up2 = new Vector3().crossVectors(side, dir).normalize();
        const n = new Vector3(Math.cos(ang), 0.55, Math.sin(ang)).normalize();
        // card spans along the branch (dir) and sideways, slight random roll
        const roll = (rnd() - 0.5) * 0.6;
        const t2 = dir.clone().multiplyScalar(Math.cos(roll)).addScaledVector(up2, Math.sin(roll));
        addCard(acc, c, side, t2, n, Math.max(1.2, rad * 1.05) * (0.85 + rnd() * 0.3), 2, v, H, rnd() > 0.5);
      }
    }
  } else {
    // Juniper: short (often twin) trunk, irregular ovoid crown
    addTrunk(acc, bend(new Vector3(0, -0.3, 0), new Vector3(0.2, H * 0.45, 0.1), 3, 0.15, rnd), S.trunkR, 0.07, 6, v, H);
    if (variant === 1) addTrunk(acc, bend(new Vector3(0.1, -0.3, 0), new Vector3(-0.6, H * 0.4, 0.3), 3, 0.15, rnd), S.trunkR * 0.8, 0.06, 5, v, H);
    const center = new Vector3(0, H * 0.58, 0);
    const R = S.crownR * (variant === 0 ? 1 : 1.15);
    for (let i = 0; i < 120; i++) {
      const p = new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      const rr = Math.pow(rnd(), 0.4);
      const c = center.clone().add(new Vector3(p.x * R * rr, p.y * H * 0.42 * rr, p.z * R * rr * 0.9));
      randomCard(acc, rnd, c, center, 1.0 + rnd() * 0.7, 3, v, H, 0.2);
    }
  }
}

export function buildSpeciesGeometry(species: TreeSpecies, variants: number[] = [0, 1]): BufferGeometry {
  const acc: Acc = { pos: [], nrm: [], uv: [], kind: [], variant: [], sway: [], idx: [] };
  for (const v of variants) buildTree(acc, species, v);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(acc.pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(acc.nrm, 3));
  g.setAttribute('uv', new Float32BufferAttribute(acc.uv, 2));
  g.setAttribute('aKind', new Float32BufferAttribute(acc.kind, 1));
  g.setAttribute('aVariant', new Float32BufferAttribute(acc.variant, 1));
  g.setAttribute('aSway', new Float32BufferAttribute(acc.sway, 1));
  g.setIndex(acc.idx);
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// Shaders. Instance texels: 0 = pos.xyz + yaw, 1 = (scaleY, scaleXZ, variant, seed)

const T_TEXELS = 2;

const MESH_VERT_PARS = /* glsl */ `
${glslInstanceFetch(T_TEXELS)}
${GLSL_LOD_VERT}
attribute float aKind;
attribute float aVariant;
attribute float aSway;
uniform float uTime;
varying float vKKind;
varying vec3 vKNrmW;
varying vec3 vKWorld;
varying float vKSeed;
varying vec2 vKUv;
`;

const MESH_VERT_PRE = /* glsl */ `
  vec4 i0 = instFetch(0); vec4 i1 = instFetch(1);
  float kVis = kLodPrepare(distance(i0.xyz, cameraPosition));
  if (abs(aVariant - i1.z) > 0.5) kVis = 0.0;
  vec3 kLocal = vec3(position.x * i1.y, position.y * i1.x, position.z * i1.y);
  // wind sway: whole-tree bend + leaf flutter (|offset| < 0.2 m at the crown top)
  float ph = i1.w * 6.2831;
  float sw = sin(uTime * 0.9 + ph + i0.x * 0.01) * 0.6 + sin(uTime * 1.7 + ph * 1.3) * 0.4;
  kLocal.x += aSway * sw * 0.14;
  kLocal.z += aSway * cos(uTime * 1.1 + ph) * 0.08;
  if (aKind > 0.5) kLocal += normal * sin(uTime * 4.0 + position.y * 2.0 + position.x * 3.0 + ph) * 0.03 * aSway;
  float kc = cos(i0.w), ks = sin(i0.w);
  vec3 kP = kRotY(kLocal, kc, ks) + i0.xyz;
  vec3 kN = kRotY(normalize(vec3(normal.x / i1.y, normal.y / i1.x, normal.z / i1.y)), kc, ks);
  vKKind = aKind; vKNrmW = kN; vKWorld = kP; vKSeed = i1.w; vKUv = uv;
`;

const MESH_FRAG_PARS = /* glsl */ `
${GLSL_NOISE}
${GLSL_DITHER}
${GLSL_LOD_FRAG}
uniform sampler2D uBark;
uniform vec3 uBarkCol;
uniform vec3 uBarkTop;
uniform vec4 uTint;
varying float vKKind;
varying vec3 vKNrmW;
varying vec3 vKWorld;
varying float vKSeed;
varying vec2 vKUv;
vec3 kBarkN;
`;

const MESH_FRAG_COLOR = /* glsl */ `
  kBarkN = vec3(0.0, 0.0, 1.0);
  if (vKKind < 0.5) {
    vec4 b = texture2D(uBark, vKUv * vec2(0.9, 0.45));
    vec3 bc = mix(uBarkCol, uBarkTop, smoothstep(2.0, 9.0, vKUv.y));
    diffuseColor = vec4(bc * (0.7 + 0.5 * b.b) * mix(0.6, 1.0, b.a), 1.0);
    kBarkN = vec3(b.xy * 2.0 - 1.0, 1.0);
  } else {
    // alpha mip compensation keeps distant cards from thinning out
    vec2 ts = vKUv * 512.0;
    float mip = max(0.0, 0.5 * log2(max(dot(dFdx(ts), dFdx(ts)), dot(dFdy(ts), dFdy(ts)))));
    diffuseColor.a = clamp(diffuseColor.a * (1.0 + mip * 0.35), 0.0, 1.0);
    float hv = kHash11(vKSeed * 71.0);
    diffuseColor.rgb *= uTint.rgb * (0.86 + 0.28 * hv);
  }
`;

const MESH_FRAG_NORMAL = /* glsl */ `
  {
    vec3 Nw = normalize(vKNrmW);
    if (vKKind < 0.5) {
      vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), Nw) + vec3(1e-4, 0.0, 0.0));
      vec3 B = cross(Nw, T);
      Nw = normalize(Nw + (T * kBarkN.x + B * kBarkN.y) * 0.8);
    }
    normal = normalize((viewMatrix * vec4(Nw, 0.0)).xyz);
  }
`;

const MESH_FRAG_LIGHT = /* glsl */ `
  #if NUM_DIR_LIGHTS > 0
  if (vKKind > 0.5) {
    // leaves: sun shining through from behind (translucency) + soft self-shadow toward the crown core
    vec3 Ls = directionalLights[0].direction;
    float back = clamp(-dot(geometryNormal, Ls), 0.0, 1.0);
    float fwd = pow(clamp(dot(-geometryViewDir, Ls), 0.0, 1.0), 4.0);
    reflectedLight.directDiffuse += directionalLights[0].color * diffuseColor.rgb * diffuseColor.rgb * back * (0.15 + 0.8 * fwd);
  }
  #endif
`;

const IMP_VERT_PARS = /* glsl */ `
${glslInstanceFetch(T_TEXELS)}
${GLSL_LOD_VERT}
${GLSL_HEMI_OCT}
uniform vec4 uImp; // x = slots, y = grid, z = canonical radius, w = canonical centre y
varying vec2 vKUv0; varying vec2 vKUv1; varying vec2 vKUv2; varying vec2 vKUv3;
varying vec4 vKW;
varying float vKYaw;
varying vec3 vKWorld;
`;

function impVertPre(blend: number): string {
  return /* glsl */ `
  vec4 i0 = instFetch(0); vec4 i1 = instFetch(1);
  float sXZ = i1.y, sY = i1.x;
  float rad = uImp.z * max(sXZ, sY);
  vec3 ctr = i0.xyz + vec3(0.0, uImp.w * sY, 0.0);
  float kVis = kLodPrepare(distance(i0.xyz, cameraPosition));
  vec3 toCam = normalize(cameraPosition - ctr);
  vec3 bR = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + vec3(1e-5, 0.0, 0.0));
  vec3 bU = cross(toCam, bR);
  vec3 kP = ctr + (bR * position.x + bU * position.y) * rad * 2.0;
  vec3 kN = toCam;
  // view direction in tree-local space (undo yaw)
  float kc = cos(i0.w), ks = sin(i0.w);
  vec3 vl = vec3(kc * toCam.x - ks * toCam.z, toCam.y, ks * toCam.x + kc * toCam.z);
  vec3 offL = kP - ctr;
  offL = vec3(kc * offL.x - ks * offL.z, offL.y, ks * offL.x + kc * offL.z);
  offL /= vec3(sXZ, sY, sXZ);
  float G = uImp.y;
  vec2 g = kHemiOctEncode(vl) * G - 0.5;
  vec2 g0 = clamp(floor(g), 0.0, G - 1.0);
  vec2 f = clamp(g - g0, 0.0, 1.0);
  vec2 cells[4];
  cells[0] = g0; cells[1] = min(g0 + vec2(1.0, 0.0), G - 1.0); cells[2] = min(g0 + vec2(0.0, 1.0), G - 1.0); cells[3] = min(g0 + vec2(1.0), G - 1.0);
  ${blend > 1 ? 'vKW = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);' : 'vec2 gn = floor(g + 0.5); gn = clamp(gn, 0.0, G - 1.0); cells[0] = gn; vKW = vec4(1.0, 0.0, 0.0, 0.0);'}
  float slot = i1.z;
  vec2 uvs[4];
  for (int k = 0; k < 4; k++) {
    vec3 fd = kHemiOctDecode((cells[k] + 0.5) / G);
    vec3 r; vec3 u; kImpBasis(fd, r, u);
    vec2 q = vec2(dot(offL, r), dot(offL, u)) / (uImp.z * 2.0 * 1.04) + 0.5;
    uvs[k] = vec2((slot * G + cells[k].x + q.x) / (uImp.x * G), (cells[k].y + q.y) / G);
  }
  vKUv0 = uvs[0]; vKUv1 = uvs[1]; vKUv2 = uvs[2]; vKUv3 = uvs[3];
  vKYaw = i0.w; vKWorld = kP;
`;
}

const IMP_FRAG_PARS = /* glsl */ `
${GLSL_DITHER}
${GLSL_LOD_FRAG}
uniform sampler2D uAlb;
uniform sampler2D uNrm;
uniform vec4 uTint;
varying vec2 vKUv0; varying vec2 vKUv1; varying vec2 vKUv2; varying vec2 vKUv3;
varying vec4 vKW;
varying float vKYaw;
varying vec3 vKWorld;
vec3 kImpN;
`;

function impFragColor(blend: number): string {
  return blend > 1 ? /* glsl */ `
  {
    vec4 a = texture2D(uAlb, vKUv0) * vKW.x + texture2D(uAlb, vKUv1) * vKW.y + texture2D(uAlb, vKUv2) * vKW.z + texture2D(uAlb, vKUv3) * vKW.w;
    vec4 n = texture2D(uNrm, vKUv0) * vKW.x + texture2D(uNrm, vKUv1) * vKW.y + texture2D(uNrm, vKUv2) * vKW.z + texture2D(uNrm, vKUv3) * vKW.w;
    diffuseColor = vec4(a.rgb / max(a.a, 1e-3) * uTint.rgb, a.a);
    kImpN = n.xyz / max(n.a, 1e-3) * 2.0 - 1.0;
  }` : /* glsl */ `
  {
    vec4 a = texture2D(uAlb, vKUv0);
    vec4 n = texture2D(uNrm, vKUv0);
    diffuseColor = vec4(a.rgb / max(a.a, 1e-3) * uTint.rgb, a.a);
    kImpN = n.xyz / max(n.a, 1e-3) * 2.0 - 1.0;
  }`;
}

const IMP_FRAG_NORMAL = /* glsl */ `
  {
    float c = cos(vKYaw), s = sin(vKYaw);
    vec3 nl = normalize(kImpN);
    vec3 Nw = vec3(c * nl.x + s * nl.z, nl.y, -s * nl.x + c * nl.z);
    normal = normalize((viewMatrix * vec4(Nw, 0.0)).xyz);
  }
`;

// Bake materials (unlit): albedo with the same leaf colouring, world normal (tree local, yaw 0).
const BAKE_VERT = /* glsl */ `
attribute float aKind;
attribute float aVariant;
uniform float uVariant;
varying vec2 vUv2;
varying float vKind;
varying vec3 vN;
void main() {
  vUv2 = uv; vKind = aKind; vN = normal;
  vec3 p = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  if (abs(aVariant - uVariant) > 0.5) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
}
`;

const BAKE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uBark;
uniform vec3 uBarkCol;
uniform float uMode;
varying vec2 vUv2;
varying float vKind;
varying vec3 vN;
void main() {
  vec4 c;
  if (vKind < 0.5) { vec4 b = texture2D(uBark, vUv2 * vec2(0.9, 0.45)); c = vec4(uBarkCol * (0.7 + 0.5 * b.b), 1.0); }
  else { c = texture2D(uMap, vUv2); if (c.a < 0.5) discard; c.a = 1.0; }
  if (uMode > 0.5) { vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; if (vKind > 0.5) n = normalize(vN); c = vec4(n * 0.5 + 0.5, 1.0); }
  gl_FragColor = c;
  #include <colorspace_fragment>
}
`;

/** Sim convention (src/sim/world/props.ts): tree `variant` = species (0 poplar, 1 pine, 2 spruce, 3 juniper). */
function parseSpecies(inst: PropInstance, world: WorldId): TreeSpecies {
  const s = inst.params?.species ?? inst.variant;
  if (typeof s === 'number' && s >= 0 && s <= 3) return Math.floor(s) as TreeSpecies;
  return defaultSpeciesFor(world);
}

/** Height and crown radius from the collision primitives (trunk capsule + crown cone/ellipsoid). */
export function fitTree(inst: PropInstance, species: TreeSpecies): { h: number; r: number } {
  const S = SPECIES[species];
  let top = -Infinity, crownR = 0;
  for (const p of inst.prims) {
    top = Math.max(top, primYRange(p)[1]);
    if (p.kind === 'cone') crownR = Math.max(crownR, p.r0, p.r1);
    else if (p.kind === 'ellipsoid') crownR = Math.max(crownR, p.r[0], p.r[2]);
  }
  let h = isFinite(top) ? top - inst.pos[1] : S.canonH * inst.scale;
  if (!(h > 0.5)) h = S.canonH * inst.scale;
  const r = crownR > 0 ? crownR : S.crownR * inst.scale;
  return { h, r };
}

interface SpeciesSet {
  species: TreeSpecies;
  table: InstanceTable;
  drawer: LodDrawer;
  atlas: ImpostorAtlas | null;
  uniforms: LodUniforms[];
}

export class TreeLayer {
  private sets: SpeciesSet[] = [];
  private cfg: PropTierConfig;
  private readonly parent: Object3D;
  private readonly world: WorldId;
  private renderer: WebGLRenderer | null = null;
  private lastInstances: PropInstance[] = [];

  constructor(parent: Object3D, cfg: PropTierConfig, world: WorldId) {
    this.parent = parent;
    this.cfg = cfg;
    this.world = world;
  }

  build(trees: PropInstance[], renderer: WebGLRenderer | null, _sunDir: [number, number, number] | null): void {
    this.dispose();
    this.renderer = renderer;
    this.lastInstances = trees;
    const bySpecies: PropInstance[][] = [[], [], [], []];
    for (const t of trees) bySpecies[parseSpecies(t, this.world)].push(t);
    for (let s = 0 as TreeSpecies; s < 4; s = (s + 1) as TreeSpecies) {
      const list = bySpecies[s];
      if (list.length === 0) continue;
      const table = new InstanceTable(list.length, T_TEXELS);
      for (let i = 0; i < list.length; i++) {
        const inst = list[i];
        const { h, r } = fitTree(inst, s);
        const S = SPECIES[s];
        const variant = hashSeed((inst.params?.seed ?? inst.id) * 13 + 3) > 0.5 ? 1 : 0;
        const canonH = S.canonH * (variant === 0 ? 1 : 0.88);
        const sY = h / canonH;
        const sXZ = Math.min(sY * 1.6, Math.max(sY * 0.6, r / (S.crownR * (variant === 0 ? 1 : 1.12))));
        table.write(i, 0, inst.pos[0], inst.pos[1], inst.pos[2], inst.yaw);
        table.write(i, 1, sY, sXZ, variant, hashSeed(inst.id * 17 + 5));
        table.bounds(i, inst.pos[0], inst.pos[1] + h * 0.5, inst.pos[2], Math.max(h * 0.55, r));
      }
      table.count = list.length;
      table.upload();
      this.sets.push(this.makeSet(s, table));
    }
  }

  private makeSet(s: TreeSpecies, table: InstanceTable): SpeciesSet {
    const geo = buildSpeciesGeometry(s);
    const S = SPECIES[s];
    const u0 = LodDrawer.makeUniforms(table, 0);
    const u1 = LodDrawer.makeUniforms(table, 1);
    const atlasTex = foliageAtlas();
    const bark = detailTexture('bark');
    const tint = { value: new Vector4(1, 1, 1, 1) };
    const meshMat = patchMaterial(new MeshStandardMaterial({ map: atlasTex, alphaTest: 0.5, side: DoubleSide, roughness: 0.85, metalness: 0 }), {
      key: 'tree-mesh',
      uniforms: { ...u0, uTime: sharedUniforms.uTime, uBark: { value: bark }, uBarkCol: { value: hexLinear(S.bark) }, uBarkTop: { value: hexLinear(S.barkTop) }, uTint: tint },
      vertexPars: MESH_VERT_PARS,
      vertexPre: MESH_VERT_PRE,
      vertexNormal: 'vec3 objectNormal = kN;',
      vertexBegin: 'vec3 transformed = kP;',
      vertexEnd: 'if (kVis <= 0.0) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);',
      fragPars: MESH_FRAG_PARS,
      fragPre: 'kLodClip();',
      fragColor: MESH_FRAG_COLOR,
      fragNormal: MESH_FRAG_NORMAL,
      fragLight: MESH_FRAG_LIGHT,
    });
    meshMat.alphaToCoverage = this.cfg.level >= 2;
    const levels = [{ geometry: geo, material: meshMat }];
    let atlas: ImpostorAtlas | null = null;
    if (this.renderer) {
      geo.computeBoundingSphere();
      const center = new Vector3(0, S.canonH * 0.5, 0);
      let radius = 0;
      const pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) radius = Math.max(radius, Math.hypot(pa.getX(i) - center.x, pa.getY(i) - center.y, pa.getZ(i) - center.z));
      const mk = (variant: number, mode: number): ShaderMaterial => new ShaderMaterial({
        vertexShader: BAKE_VERT, fragmentShader: BAKE_FRAG, side: DoubleSide,
        uniforms: { uMap: { value: atlasTex }, uBark: { value: bark }, uBarkCol: { value: hexLinear(S.bark) }, uVariant: { value: variant }, uMode: { value: mode } },
      });
      const frame = this.cfg.level >= 2 ? 128 : 64;
      atlas = bakeImpostors(this.renderer, [
        { geometry: geo, albedoMat: mk(0, 0), normalMat: mk(0, 1), center, radius },
        { geometry: geo, albedoMat: mk(1, 0), normalMat: mk(1, 1), center, radius },
      ], frame);
      const quad = new BufferGeometry();
      quad.setAttribute('position', new Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
      quad.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
      quad.setIndex([0, 1, 2, 0, 2, 3]);
      const blend = this.cfg.impostorBlend;
      const impMat = patchMaterial(new MeshStandardMaterial({ alphaTest: 0.5, side: FrontSide, roughness: 0.9, metalness: 0 }), {
        key: `tree-imp-${blend}`,
        uniforms: { ...u1, uAlb: { value: atlas.albedo as Texture }, uNrm: { value: atlas.normal as Texture }, uTint: tint, uImp: { value: new Vector4(2, IMPOSTOR_GRID, radius, center.y) } },
        vertexPars: IMP_VERT_PARS,
        vertexPre: impVertPre(blend),
        vertexNormal: 'vec3 objectNormal = kN;',
        vertexBegin: 'vec3 transformed = kP;',
        vertexEnd: 'if (kVis <= 0.0) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);',
        fragPars: IMP_FRAG_PARS,
        fragPre: 'kLodClip();',
        fragColor: impFragColor(blend),
        fragNormal: IMP_FRAG_NORMAL,
      });
      levels.push({ geometry: quad, material: impMat });
    }
    const drawer = new LodDrawer(table, levels, `tree-${TREE_SPECIES_NAMES[s]}`);
    drawer.bindUniforms(levels.length > 1 ? [u0, u1] : [u0]);
    drawer.rebuildSpatial();
    drawer.addTo(this.parent);
    const set: SpeciesSet = { species: s, table, drawer, atlas, uniforms: [u0, u1] };
    this.applyDistances(set);
    return set;
  }

  private applyDistances(set: SpeciesSet): void {
    const c = this.cfg;
    if (set.drawer.meshes.length > 1) set.drawer.setDistances([c.treeMesh], c.treeImpostor, c.fadeFrac);
    else set.drawer.setDistances([], c.treeMesh * 2.5, c.fadeFrac);
    set.drawer.cullMargin = 4;
  }

  setTier(cfg: PropTierConfig): void {
    const rebuild = cfg.impostorBlend !== this.cfg.impostorBlend || (cfg.level >= 2) !== (this.cfg.level >= 2);
    this.cfg = cfg;
    if (rebuild && this.lastInstances.length > 0) this.build(this.lastInstances, this.renderer, null);
    else for (const s of this.sets) this.applyDistances(s);
  }

  update(camera: Camera): void {
    for (const s of this.sets) s.drawer.cull(camera);
  }

  /** Dev: force a level for all instances. */
  forceLevel(L: number): void {
    for (const s of this.sets) {
      s.drawer.showAll(L);
      for (let k = 0; k < s.drawer.meshes.length; k++) s.drawer.meshes[k].visible = k === L;
      const u = s.uniforms[L];
      u.uLodBand.value.set(1e7, 1e7 + 1, 1e7, 1e7 + 1);
      u.uLodSide.value = 0;
    }
  }

  calls(): number { let c = 0; for (const s of this.sets) c += s.drawer.calls(); return c; }
  triangles(): number {
    let c = 0;
    for (const s of this.sets) {
      const d = s.drawer;
      c += d.visibleCounts[0] * d.trisPerLevel[0] / 2;
      if (d.meshes.length > 1) c += d.visibleCounts[1] * d.trisPerLevel[1];
    }
    return c;
  }

  dispose(): void {
    for (const s of this.sets) {
      s.drawer.removeFrom(this.parent);
      s.drawer.dispose();
      s.table.dispose();
      s.atlas?.rtA.dispose();
      s.atlas?.rtN.dispose();
    }
    this.sets = [];
  }
}

