// Bird rendering for SÜRÜ.io (§3.8, §4.G.10 "Kuş render'ı"):
//  • ONE instanced mesh for the 1500 sim birds: prev/curr positions interpolated in the vertex shader (alpha
//    uniform, 30 Hz uploads), wing flapping via `wingWeight`, per-bird phase + flap/glide cycle, owner palette,
//    conversion flash exp(−(tick − lastConv)/6), iridescent specular, warm rim light; night/storm tint.
//  • leaders: 1.8× instanced mesh + additive halo + light trail + water marker shape + patterned aura ring.
//  • ownership-density target: birds splatted as soft points (orthographic) → water aura + soft shadow.
//  • GPU-only background murmuration (Orta+), and the end-of-round "Sürü Gösterisi" shape morph.

import * as THREE from 'three';
import type { QualityTier } from '../../../core/settings.ts';
import type { FlockRenderSource } from '../sim/types.ts';
import { buildStarling, triangleCount } from './birdGeometry.ts';
import type { BirdDetail } from './birdGeometry.ts';
import { GLSL_PRELUDE } from './glsl.ts';
import type { SuruGlobals } from './glsl.ts';
import { hexToLinear, ownerStyle } from './palette.ts';

const NB = 1500;
const NF = 17;
const TRAIL_PTS = 22;
export const BIRD_SCALE = 1.9;
const LEADER_SCALE = 1.8;
export const SHOW_SHAPES = ['kalp', 'sarmal', 'dalga', 'lale', 'kanat', 'sonsuzluk'] as const;
export type ShowShape = (typeof SHOW_SHAPES)[number];

const BIRD_VS = /* glsl */ `
${GLSL_PRELUDE}
attribute float wingWeight;
attribute vec4 aPC;
attribute vec4 aVO;
attribute float aPh;
uniform float uAlpha;
uniform float uScale;
uniform float uLeader;
uniform vec3 uPalette[${NF}];
uniform vec4 uShow;      // x blend, y flock, z shape, w scale
uniform vec2 uShowC;
uniform float uLeaderAlt[${NF}];
varying vec3 vWorld;
varying vec3 vOwnerCol;
varying float vOwned;
varying float vFlash;
varying float vPh;
uniform float uTickF;

vec2 showCurve(float u, float shape) {
  float a = u * 6.2831853;
  if (shape < 0.5) { // Kalp
    float s = sin(a);
    return vec2(16.0 * s * s * s, -(13.0 * cos(a) - 5.0 * cos(2.0 * a) - 2.0 * cos(3.0 * a) - cos(4.0 * a))) / 17.0;
  } else if (shape < 1.5) { // Sarmal
    float r = 0.15 + 0.85 * u;
    return vec2(cos(a * 3.0), sin(a * 3.0)) * r;
  } else if (shape < 2.5) { // Dalga
    return vec2(u * 2.0 - 1.0, sin(u * 18.85) * 0.28);
  } else if (shape < 3.5) { // Lale
    float r = 0.55 + 0.4 * abs(sin(a * 1.5));
    vec2 p = vec2(sin(a), -cos(a)) * r * vec2(0.8, 0.75) + vec2(0.0, -0.25);
    if (u > 0.82) p = vec2(0.0, mix(0.3, 1.0, (u - 0.82) / 0.18));
    return p;
  } else if (shape < 4.5) { // Kanat
    float x = u * 2.0 - 1.0;
    return vec2(x, -0.55 * abs(x) + 0.35 * sin(abs(x) * 9.0) * abs(x) + 0.2);
  }
  // Sonsuzluk (lemniscate)
  float d = 1.0 + sin(a) * sin(a);
  return vec2(cos(a) / d, sin(a) * cos(a) / d) * 1.2;
}

void main() {
  float owner = aVO.z;
  vec2 p = mix(aPC.xy, aPC.zw, uAlpha);
  vec2 d = aPC.zw - aPC.xy;
  float dl = length(d);
  vec2 h = dl > 0.003 ? d / dl : (length(aVO.xy) > 0.01 ? normalize(aVO.xy) : vec2(0.0, -1.0));
  float speed = dl * 30.0;
  float t = uTime;
  float alt = 12.0 + 6.0 * sin(0.7 * t + aPh * 6.2831853) + 2.2 * sin(t * 0.9 + owner * 1.7 + p.x * 0.035 + p.y * 0.028);
  if (uLeader > 0.5) alt = uLeaderAlt[int(owner + 0.5)];
  // Sürü Gösterisi: the winner's birds draw the chosen shape in the sky (render-only)
  float showK = 0.0;
  if (uShow.x > 0.0 && abs(owner - uShow.y) < 0.5 && uLeader < 0.5) {
    showK = smoothstep(0.0, 1.0, uShow.x);
    float u = fract(aPh * 7.31 + t * 0.018);
    vec2 sp = showCurve(u, uShow.z);
    vec2 target = uShowC + vec2(sp.x, -sp.y) * uShow.w + vec2(sin(t * 2.0 + aPh * 40.0), cos(t * 1.7 + aPh * 33.0)) * 0.7;
    float u2 = fract(u + 0.004);
    vec2 sp2 = showCurve(u2, uShow.z);
    vec2 tdir = normalize(vec2(sp2.x - sp.x, -(sp2.y - sp.y)) + 1e-4);
    p = mix(p, target, showK);
    h = normalize(mix(h, tdir, showK) + 1e-4);
    alt = mix(alt, 22.0 + 1.5 * sin(aPh * 50.0 + t), showK);
  }
  // wing flap: 7–12 Hz with speed, per-bird phase, intermittent glides
  float flapHz = mix(7.0, 12.0, clamp((speed - 6.0) / 10.0, 0.0, 1.0));
  float cycle = sin(t * 0.55 + aPh * 40.0);
  float flapMask = smoothstep(-0.35, 0.2, cycle);
  float th = 0.9 * sin(t * 6.2831853 * flapHz + aPh * 6.2831853) * flapMask + 0.1 * (1.0 - flapMask);
  vec3 lp = position;
  if (wingWeight > 0.0) {
    float s = lp.x > 0.0 ? 1.0 : -1.0;
    float r = abs(lp.x) - 0.02;
    float a = th * (0.55 + 0.45 * wingWeight) - 0.25 * wingWeight * sin(t * 6.2831853 * flapHz + aPh * 6.2831853 - 0.9) * flapMask;
    lp.x = s * (0.02 + r * cos(a));
    lp.y += r * sin(a);
  }
  lp *= uScale;
  // bank into turns (velocity vs displacement)
  float turn = clamp((h.x * aVO.y - h.y * aVO.x) / max(length(aVO.xy), 0.5), -0.7, 0.7);
  vec3 fwd = vec3(h.x, 0.0, h.y);
  vec3 right = vec3(-h.y, 0.0, h.x);
  vec3 up = vec3(0.0, 1.0, 0.0);
  float cb = cos(turn);
  float sb = sin(turn);
  vec3 r2 = right * cb + up * sb;
  vec3 u2 = up * cb - right * sb;
  vec3 wp = vec3(p.x, alt, p.y) + r2 * lp.x + u2 * lp.y + fwd * lp.z;
  vWorld = wp;
  vOwned = owner > 0.5 ? 1.0 : 0.0;
  vOwnerCol = uPalette[int(owner + 0.5)];
  float conv = aVO.w;
  vFlash = conv > 0.5 ? exp(-max(uTickF - conv, 0.0) / 6.0) : 0.0;
  vPh = aPh;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const BIRD_FS = /* glsl */ `
${GLSL_PRELUDE}
uniform float uLeader;
uniform float uIri;
varying vec3 vWorld;
varying vec3 vOwnerCol;
varying float vOwned;
varying float vFlash;
varying float vPh;
void main() {
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 V = normalize(uCamPos - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(uSunDir);
  float sunUp = smoothstep(-0.06, 0.03, L.y);
  vec3 base = vec3(0.0075, 0.008, 0.0103); // #15161A
  vec3 oc = vOwnerCol;
  vec3 albedo = mix(base * 1.6, mix(base, oc, 0.6), vOwned);
  vec3 amb = mix(uSkyZenith, uSkyHorizon, 0.45 + 0.3 * N.y) * 0.75;
  float wrap = clamp((dot(N, L) + 0.45) / 1.45, 0.0, 1.0);
  vec3 col = albedo * (amb + uSunColor * wrap * 0.9 * sunUp);
  float back = 0.45 + 0.55 * max(dot(-V, L), 0.0);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.2);
  col += fr * back * (uSunColor * 0.55 * sunUp + oc * 0.55 * vOwned + uSkyHorizon * 0.12);
  col += oc * vOwned * (0.16 + uLeader * 0.55);
  // iridescent starling sheen (#3A5C6E ↔ #5B3A6E)
  if (uIri > 0.5) {
    vec3 H = normalize(L + V);
    float sp = pow(max(dot(N, H), 0.0), 26.0);
    vec3 iri = mix(vec3(0.041, 0.107, 0.155), vec3(0.105, 0.041, 0.155), 0.5 + 0.5 * sin(dot(N, V) * 14.0 + vPh * 30.0));
    col += iri * sp * 3.0 * (0.4 + 0.6 * sunUp);
  }
  // conversion flash: white, then the new owner colour
  col = mix(col, vec3(2.6, 2.5, 2.3), clamp(vFlash * 1.25, 0.0, 1.0) * 0.85);
  col = applyStorm(col, stormMask(vWorld.xz));
  col = applyNight(col, nightMask(vWorld.xz));
  gl_FragColor = vec4(finalColor(col, gl_FragCoord.xy), 1.0);
}
`;

const OWN_VS = /* glsl */ `
attribute vec4 aPC;
attribute vec4 aVO;
uniform float uAlpha;
uniform float uHalf;
uniform float uPointSize;
uniform vec3 uPalette[${NF}];
varying vec3 vC;
void main() {
  float owner = aVO.z;
  if (owner < 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vC = vec3(0.0);
    return;
  }
  vec2 p = mix(aPC.xy, aPC.zw, uAlpha);
  gl_Position = vec4(p.x / uHalf, p.y / uHalf, 0.0, 1.0);
  gl_PointSize = uPointSize;
  vC = uPalette[int(owner + 0.5)];
}
`;

const OWN_FS = /* glsl */ `
uniform float uWeight;
varying vec3 vC;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float w = exp(-dot(q, q) * 3.0) * uWeight;
  gl_FragColor = vec4(vC * w, w);
}
`;

const DECAL_VS = /* glsl */ `
attribute vec4 aL;   // prev xz, curr xz
attribute vec4 aI;   // owner, radius, pattern, mark
attribute vec4 aS;   // alive, lone, tight, player
uniform float uAlpha;
uniform vec3 uPalette[${NF}];
varying vec2 vLocal;
varying vec4 vI;
varying vec4 vS;
varying vec3 vC;
varying vec3 vWorld;
void main() {
  vec2 c = mix(aL.xy, aL.zw, uAlpha);
  float hs = aI.y + 5.0;
  vec2 lp = position.xz * hs;
  vLocal = lp;
  vI = aI;
  vS = aS;
  vC = uPalette[int(aI.x + 0.5)];
  vec3 wp = vec3(c.x + lp.x, 0.06, c.y + lp.y);
  vWorld = wp;
  gl_Position = aS.x > 0.5 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const DECAL_FS = /* glsl */ `
${GLSL_PRELUDE}
varying vec2 vLocal;
varying vec4 vI;
varying vec4 vS;
varying vec3 vC;
varying vec3 vWorld;
float sdTri(vec2 p, float r) {
  const float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
void main() {
  float R = vI.y;
  float d = length(vLocal);
  float ang = atan(vLocal.y, vLocal.x);
  // patterned aura ring around the flock (solid / dashed / dotted)
  float ringW = 0.55 + R * 0.012;
  float ring = 1.0 - smoothstep(ringW * 0.5, ringW, abs(d - R));
  float pat = 1.0;
  if (vI.z > 0.5 && vI.z < 1.5) pat = step(0.42, fract(ang / 6.2831853 * max(8.0, floor(R * 0.9))));
  if (vI.z > 1.5) {
    float n = max(12.0, floor(R * 1.6));
    float f = fract(ang / 6.2831853 * n) - 0.5;
    pat = 1.0 - smoothstep(0.12, 0.26, abs(f) * (6.2831853 * R / n) / max(ringW * 1.6, 0.6));
  }
  float soft = exp(-pow(max(d - R * 0.15, 0.0) / max(R, 1.0), 2.0) * 2.2) * 0.35;
  float aura = ring * pat * 0.85 + soft * 0.25;
  // leader marker shape (circle / triangle / square / diamond)
  vec2 q = vLocal;
  float ms = 2.6;
  float sd;
  if (vI.w < 0.5) sd = abs(length(q) - ms);
  else if (vI.w < 1.5) sd = abs(sdTri(vec2(q.x, -q.y), ms * 1.05));
  else if (vI.w < 2.5) { vec2 b = abs(q) - vec2(ms * 0.85); sd = abs(length(max(b, 0.0)) + min(max(b.x, b.y), 0.0)); }
  else { vec2 r = vec2(q.x + q.y, q.x - q.y) * 0.70710678; vec2 b = abs(r) - vec2(ms * 0.8); sd = abs(length(max(b, 0.0)) + min(max(b.x, b.y), 0.0)); }
  float mark = 1.0 - smoothstep(0.3, 0.62, sd);
  float lonePulse = vS.y > 0.5 ? 0.6 + 0.4 * sin(uTime * 9.0) : 1.0;
  float a = (aura * 0.2 + mark * 0.85) * lonePulse;
  a *= 1.0 - nightMask(vWorld.xz) * 0.35;
  vec3 col = vC * (1.0 + mark * 0.6);
  if (a < 0.003) discard;
  gl_FragColor = vec4(agx(col * 1.4) * a, a);
}
`;

const HALO_VS = /* glsl */ `
attribute vec4 aL;
attribute vec4 aI; // owner, alive, lone, alt
uniform float uAlpha;
uniform vec3 uPalette[${NF}];
varying vec2 vQ;
varying vec3 vC;
varying float vLone;
void main() {
  vec2 c = mix(aL.xy, aL.zw, uAlpha);
  vec3 center = vec3(c.x, aI.w, c.y);
  vec4 mv = viewMatrix * vec4(center, 1.0);
  float size = 4.2;
  mv.xy += position.xy * size;
  vQ = position.xy;
  vC = uPalette[int(aI.x + 0.5)];
  vLone = aI.z;
  gl_Position = aI.y > 0.5 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const HALO_FS = /* glsl */ `
uniform float uTime;
varying vec2 vQ;
varying vec3 vC;
varying float vLone;
void main() {
  float r = length(vQ);
  float g = exp(-r * r * 4.5) * 0.85 + exp(-r * r * 40.0) * 0.9;
  float pulse = vLone > 0.5 ? 0.55 + 0.45 * sin(uTime * 9.0) : 0.88 + 0.12 * sin(uTime * 2.3);
  vec3 c = mix(vC, vec3(1.0, 0.95, 0.85), exp(-r * r * 30.0)) * g * pulse;
  gl_FragColor = vec4(c * 0.85, 1.0);
}
`;

const TRAIL_VS = /* glsl */ `
attribute vec3 aCol;
attribute float aA;
varying vec3 vCol;
varying float vA;
void main() {
  vCol = aCol;
  vA = aA;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const TRAIL_FS = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  gl_FragColor = vec4(vCol * vA, 1.0);
}
`;

const BG_VS = /* glsl */ `
${GLSL_PRELUDE}
attribute float wingWeight;
varying vec3 vWorld;
void main() {
  float i = float(gl_InstanceID);
  float t = uTime;
  float u = fract(i * 0.6180339);
  float v = fract(i * 0.7548776);
  float w = fract(i * 0.5698403);
  float cloud = floor(w * 3.0);
  vec3 c = vec3(-260.0 + cloud * 300.0 + 80.0 * sin(t * 0.05 + cloud), 70.0 + 18.0 * sin(t * 0.11 + cloud * 2.0), -760.0 - cloud * 140.0 + 90.0 * cos(t * 0.04 + cloud));
  float a = u * 6.2831853 + t * (0.25 + 0.1 * cloud);
  float r = 38.0 * sqrt(v) * (1.0 + 0.35 * sin(t * 0.3 + u * 9.0 + cloud));
  vec3 off = vec3(cos(a) * r, sin(a * 1.7 + t * 0.4) * r * 0.35, sin(a) * r * (0.55 + 0.25 * sin(t * 0.21)));
  off += vec3(sin(t * 0.6 + v * 20.0), cos(t * 0.5 + u * 17.0), sin(t * 0.7 + w * 13.0)) * 6.0;
  vec3 pos = c + off;
  float flap = sin(t * 60.0 + i) * 0.8;
  vec3 lp = position * 4.2;
  if (wingWeight > 0.0) lp.y += abs(lp.x) * flap * 0.6;
  vec3 wp = pos + lp;
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const BG_FS = /* glsl */ `
${GLSL_PRELUDE}
varying vec3 vWorld;
void main() {
  vec3 V = normalize(uCamPos - vWorld);
  vec3 bg = skyColor(-V);
  vec3 col = mix(vec3(0.01, 0.01, 0.014), bg, 0.42);
  gl_FragColor = vec4(finalColor(col, gl_FragCoord.xy), 1.0);
}
`;

export class BirdLayer {
  readonly birds: THREE.Mesh;
  readonly leaders: THREE.Mesh;
  readonly halos: THREE.Mesh;
  readonly decals: THREE.Mesh;
  readonly trails: THREE.Mesh;
  readonly bg: THREE.Mesh;
  readonly ownPoints: THREE.Points;
  readonly ownScene = new THREE.Scene();
  readonly ownCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  ownRT: THREE.WebGLRenderTarget | null = null;
  readonly birdMat: THREE.ShaderMaterial;
  private readonly leaderMat: THREE.ShaderMaterial;
  private readonly ownMat: THREE.ShaderMaterial;
  private readonly decalMat: THREE.ShaderMaterial;
  private readonly haloMat: THREE.ShaderMaterial;
  private readonly bgMat: THREE.ShaderMaterial;
  private readonly palette: THREE.Vector3[] = [];
  // instance data
  private readonly aPC = new Float32Array(NB * 4);
  private readonly aVO = new Float32Array(NB * 4);
  private readonly attrPC: THREE.InstancedBufferAttribute;
  private readonly attrVO: THREE.InstancedBufferAttribute;
  private readonly ownPC: THREE.BufferAttribute;
  private readonly ownVO: THREE.BufferAttribute;
  private readonly lL = new Float32Array(NF * 4);
  private readonly lVO = new Float32Array(NF * 4);
  private readonly lI = new Float32Array(NF * 4);
  private readonly lS = new Float32Array(NF * 4);
  private readonly hI = new Float32Array(NF * 4);
  private readonly attrLL: THREE.InstancedBufferAttribute;
  private readonly attrLVO: THREE.InstancedBufferAttribute;
  private readonly attrDL: THREE.InstancedBufferAttribute;
  private readonly attrDI: THREE.InstancedBufferAttribute;
  private readonly attrDS: THREE.InstancedBufferAttribute;
  private readonly attrHL: THREE.InstancedBufferAttribute;
  private readonly attrHI: THREE.InstancedBufferAttribute;
  private readonly leaderAlt = new Float32Array(NF);
  // trails: render-side history of leader positions (independent of the source → works online too)
  private readonly hist = new Float32Array(NF * TRAIL_PTS * 2);
  private histHead = 0;
  private histCount = 0;
  private readonly trailPos: Float32Array;
  private readonly trailCol: Float32Array;
  private readonly trailA: Float32Array;
  private lastTick = -1;
  private tier: QualityTier = 'high';
  triangles = 0;

  private readonly renderer: THREE.WebGLRenderer;

  constructor(scene: THREE.Scene, g: SuruGlobals, renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.leaderAlt[0] = -500;
    for (let f = 0; f < NF; f++) {
      const c = f === 0 ? [0.02, 0.02, 0.025] : hexToLinear(ownerStyle(f).color);
      this.palette.push(new THREE.Vector3(c[0], c[1], c[2]));
    }
    const shared = { ...g, uAlpha: { value: 0 }, uPalette: { value: this.palette }, uTickF: { value: 0 } };
    // ---- sim birds ----
    const geo = new THREE.InstancedBufferGeometry();
    const src = buildStarling(2);
    geo.setAttribute('position', src.getAttribute('position'));
    geo.setAttribute('wingWeight', src.getAttribute('wingWeight'));
    this.attrPC = new THREE.InstancedBufferAttribute(this.aPC, 4);
    this.attrVO = new THREE.InstancedBufferAttribute(this.aVO, 4);
    this.attrPC.setUsage(THREE.DynamicDrawUsage);
    this.attrVO.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPC', this.attrPC);
    geo.setAttribute('aVO', this.attrVO);
    const ph = new Float32Array(NB);
    for (let i = 0; i < NB; i++) ph[i] = fract(i * 0.6180339887 + 0.13 * fract(i * 0.7548776662));
    geo.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
    geo.instanceCount = NB;
    this.birdMat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uScale: { value: BIRD_SCALE },
        uLeader: { value: 0 },
        uIri: { value: 1 },
        uShow: { value: new THREE.Vector4(0, 1, 0, 30) },
        uShowC: { value: new THREE.Vector2() },
        uLeaderAlt: { value: this.leaderAlt },
      },
      vertexShader: BIRD_VS,
      fragmentShader: BIRD_FS,
      side: THREE.DoubleSide,
    });
    this.birds = new THREE.Mesh(geo, this.birdMat);
    this.birds.frustumCulled = false;
    scene.add(this.birds);

    // ---- leaders (same shader, 1.8×) ----
    const lgeo = new THREE.InstancedBufferGeometry();
    lgeo.setAttribute('position', src.getAttribute('position'));
    lgeo.setAttribute('wingWeight', src.getAttribute('wingWeight'));
    this.attrLL = new THREE.InstancedBufferAttribute(this.lL, 4);
    this.attrLVO = new THREE.InstancedBufferAttribute(this.lVO, 4);
    this.attrLL.setUsage(THREE.DynamicDrawUsage);
    this.attrLVO.setUsage(THREE.DynamicDrawUsage);
    lgeo.setAttribute('aPC', this.attrLL);
    lgeo.setAttribute('aVO', this.attrLVO);
    const lph = new Float32Array(NF);
    for (let f = 0; f < NF; f++) lph[f] = fract(f * 0.37 + 0.11);
    lgeo.setAttribute('aPh', new THREE.InstancedBufferAttribute(lph, 1));
    lgeo.instanceCount = NF;
    this.leaderMat = this.birdMat.clone();
    this.leaderMat.uniforms = { ...this.birdMat.uniforms, uScale: { value: BIRD_SCALE * LEADER_SCALE }, uLeader: { value: 1 } };
    this.leaders = new THREE.Mesh(lgeo, this.leaderMat);
    this.leaders.frustumCulled = false;
    scene.add(this.leaders);

    // ---- water decals: aura ring + leader marker ----
    const quad = new THREE.PlaneGeometry(2, 2);
    quad.rotateX(-Math.PI / 2);
    const dgeo = new THREE.InstancedBufferGeometry();
    dgeo.setAttribute('position', quad.getAttribute('position'));
    dgeo.setIndex(quad.getIndex());
    this.attrDL = new THREE.InstancedBufferAttribute(new Float32Array(NF * 4), 4);
    this.attrDI = new THREE.InstancedBufferAttribute(this.lI, 4);
    this.attrDS = new THREE.InstancedBufferAttribute(this.lS, 4);
    for (const a of [this.attrDL, this.attrDI, this.attrDS]) a.setUsage(THREE.DynamicDrawUsage);
    dgeo.setAttribute('aL', this.attrDL);
    dgeo.setAttribute('aI', this.attrDI);
    dgeo.setAttribute('aS', this.attrDS);
    dgeo.instanceCount = NF;
    this.decalMat = new THREE.ShaderMaterial({
      uniforms: { ...shared },
      vertexShader: DECAL_VS,
      fragmentShader: DECAL_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.decals = new THREE.Mesh(dgeo, this.decalMat);
    this.decals.frustumCulled = false;
    this.decals.renderOrder = 2;
    scene.add(this.decals);

    // ---- halos ----
    const hq = new THREE.PlaneGeometry(2, 2);
    const hgeo = new THREE.InstancedBufferGeometry();
    hgeo.setAttribute('position', hq.getAttribute('position'));
    hgeo.setIndex(hq.getIndex());
    this.attrHL = new THREE.InstancedBufferAttribute(new Float32Array(NF * 4), 4);
    this.attrHI = new THREE.InstancedBufferAttribute(this.hI, 4);
    this.attrHL.setUsage(THREE.DynamicDrawUsage);
    this.attrHI.setUsage(THREE.DynamicDrawUsage);
    hgeo.setAttribute('aL', this.attrHL);
    hgeo.setAttribute('aI', this.attrHI);
    hgeo.instanceCount = NF;
    this.haloMat = new THREE.ShaderMaterial({
      uniforms: { uAlpha: shared.uAlpha, uPalette: shared.uPalette, uTime: g.uTime },
      vertexShader: HALO_VS,
      fragmentShader: HALO_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.halos = new THREE.Mesh(hgeo, this.haloMat);
    this.halos.frustumCulled = false;
    this.halos.renderOrder = 5;
    scene.add(this.halos);

    // ---- leader light trails (one ribbon buffer for all flocks) ----
    const tv = NF * TRAIL_PTS * 2;
    this.trailPos = new Float32Array(tv * 3);
    this.trailCol = new Float32Array(tv * 3);
    this.trailA = new Float32Array(tv);
    const idx: number[] = [];
    for (let f = 0; f < NF; f++) {
      for (let k = 0; k < TRAIL_PTS - 1; k++) {
        const a = (f * TRAIL_PTS + k) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    tgeo.setAttribute('aCol', new THREE.BufferAttribute(this.trailCol, 3).setUsage(THREE.DynamicDrawUsage));
    tgeo.setAttribute('aA', new THREE.BufferAttribute(this.trailA, 1).setUsage(THREE.DynamicDrawUsage));
    tgeo.setIndex(idx);
    this.trails = new THREE.Mesh(
      tgeo,
      new THREE.ShaderMaterial({ vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    this.trails.frustumCulled = false;
    this.trails.renderOrder = 4;
    scene.add(this.trails);

    // ---- ownership density points ----
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NB * 3), 3));
    this.ownPC = new THREE.BufferAttribute(this.aPC, 4).setUsage(THREE.DynamicDrawUsage);
    this.ownVO = new THREE.BufferAttribute(this.aVO, 4).setUsage(THREE.DynamicDrawUsage);
    pgeo.setAttribute('aPC', this.ownPC);
    pgeo.setAttribute('aVO', this.ownVO);
    this.ownMat = new THREE.ShaderMaterial({
      uniforms: { uAlpha: shared.uAlpha, uPalette: shared.uPalette, uHalf: { value: 330 }, uPointSize: { value: 7 }, uWeight: { value: 0.1 } },
      vertexShader: OWN_VS,
      fragmentShader: OWN_FS,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    });
    this.ownPoints = new THREE.Points(pgeo, this.ownMat);
    this.ownPoints.frustumCulled = false;
    this.ownScene.add(this.ownPoints);

    // ---- background murmuration (GPU-only, visual) ----
    const bgeo = new THREE.InstancedBufferGeometry();
    const bsrc = buildStarling(0);
    bgeo.setAttribute('position', bsrc.getAttribute('position'));
    bgeo.setAttribute('wingWeight', bsrc.getAttribute('wingWeight'));
    bgeo.instanceCount = 1500;
    this.bgMat = new THREE.ShaderMaterial({ uniforms: { ...g }, vertexShader: BG_VS, fragmentShader: BG_FS, side: THREE.DoubleSide });
    this.bg = new THREE.Mesh(bgeo, this.bgMat);
    this.bg.frustumCulled = false;
    scene.add(this.bg);
    this.triangles = triangleCount(src);
  }

  setTier(t: QualityTier): void {
    this.tier = t;
    const detail: BirdDetail = t === 'low' ? 0 : t === 'medium' ? 1 : t === 'high' ? 2 : 3;
    const src = buildStarling(detail);
    for (const m of [this.birds, this.leaders]) {
      const geo = m.geometry as THREE.InstancedBufferGeometry;
      geo.setAttribute('position', src.getAttribute('position'));
      geo.setAttribute('wingWeight', src.getAttribute('wingWeight'));
    }
    this.triangles = triangleCount(src);
    this.birdMat.uniforms.uIri.value = t === 'low' || t === 'medium' ? 0 : 1;
    const bgCount = t === 'low' ? 0 : t === 'medium' ? 600 : t === 'high' ? 1500 : 3000;
    (this.bg.geometry as THREE.InstancedBufferGeometry).instanceCount = bgCount;
    this.bg.visible = bgCount > 0;
    // ownership-density target: 128² RGBA8 on Düşük (aura readability is gameplay), 256² half-float above
    const size = t === 'low' ? 128 : 256;
    const type = t === 'low' ? THREE.UnsignedByteType : THREE.HalfFloatType;
    if (!this.ownRT || this.ownRT.width !== size || this.ownRT.texture.type !== type) {
      this.ownRT?.dispose();
      this.ownRT = new THREE.WebGLRenderTarget(size, size, { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false });
    }
    this.ownMat.uniforms.uPointSize.value = t === 'low' ? 5 : 9;
    this.ownMat.uniforms.uWeight.value = t === 'low' ? 0.05 : 0.1;
  }

  /** Upload a new sim tick (30 Hz) — positions, owners, lastConv. */
  uploadTick(src: FlockRenderSource): void {
    if (src.tick === this.lastTick) return;
    this.lastTick = src.tick;
    const pc = this.aPC;
    const vo = this.aVO;
    for (let i = 0; i < NB; i++) {
      const o = i * 4;
      pc[o] = src.prevX[i];
      pc[o + 1] = src.prevZ[i];
      pc[o + 2] = src.posX[i];
      pc[o + 3] = src.posZ[i];
      vo[o] = src.velX[i];
      vo[o + 1] = src.velZ[i];
      vo[o + 2] = src.owner[i];
      vo[o + 3] = src.lastConv[i];
    }
    this.attrPC.needsUpdate = true;
    this.attrVO.needsUpdate = true;
    this.ownPC.needsUpdate = true;
    this.ownVO.needsUpdate = true;
    // leader trail history
    this.histHead = (this.histHead + 1) % TRAIL_PTS;
    if (this.histCount < TRAIL_PTS) this.histCount++;
    for (let f = 1; f < NF; f++) {
      const b = (f * TRAIL_PTS + this.histHead) * 2;
      this.hist[b] = src.leaderX[f];
      this.hist[b + 1] = src.leaderZ[f];
    }
  }

  /** Per-frame update (interpolation alpha, leaders, decals, trails, show). */
  update(src: FlockRenderSource, alpha: number, player: number, show: { k: number; flock: number; shape: number; x: number; z: number; scale: number }): void {
    const u = this.birdMat.uniforms;
    u.uAlpha.value = alpha;
    u.uTickF.value = src.tick - 1 + alpha;
    (u.uShow.value as THREE.Vector4).set(show.k, show.flock, show.shape, show.scale);
    (u.uShowC.value as THREE.Vector2).set(show.x, show.z);
    const now = src.tick - 1 + alpha;
    for (let f = 1; f < NF; f++) {
      const o = f * 4;
      const inRound = f <= src.flockCount;
      const alive = inRound && src.flockAlive[f] === 1;
      const elim = inRound && src.flockElimTick[f] >= 0;
      // eliminated leaders fly up and away (no harm imagery), then vanish
      let alt = 14;
      let away = 0;
      if (elim) {
        away = Math.max(0, now - src.flockElimTick[f]) / 30;
        alt = 14 + away * away * 9;
      }
      const visible = inRound && (alive || (elim && away < 2.5));
      this.leaderAlt[f] = alt;
      this.lL[o] = src.leaderPrevX[f];
      this.lL[o + 1] = src.leaderPrevZ[f];
      this.lL[o + 2] = src.leaderX[f];
      this.lL[o + 3] = src.leaderZ[f];
      this.lVO[o] = src.leaderHX[f] * 12;
      this.lVO[o + 1] = src.leaderHZ[f] * 12;
      this.lVO[o + 2] = visible ? f : 0;
      this.lVO[o + 3] = 0;
      if (!visible) {
        // park invisible leaders far below the water
        this.lL[o] = this.lL[o + 2] = 0;
        this.lL[o + 1] = this.lL[o + 3] = 0;
        this.leaderAlt[f] = -500;
      }
      const st = ownerStyle(f);
      this.lI[o] = f;
      this.lI[o + 1] = alive ? src.flockRadius(f) : 0;
      this.lI[o + 2] = st.pattern;
      this.lI[o + 3] = st.mark;
      this.lS[o] = alive ? 1 : 0;
      this.lS[o + 1] = alive && src.flockLone[f] ? 1 : 0;
      this.lS[o + 2] = alive && src.flockMode[f] === 1 ? 1 : 0;
      this.lS[o + 3] = f === player ? 1 : 0;
      this.hI[o] = f;
      this.hI[o + 1] = visible ? 1 : 0;
      this.hI[o + 2] = alive && src.flockLone[f] ? 1 : 0;
      this.hI[o + 3] = alt;
    }
    (this.attrDL.array as Float32Array).set(this.lL);
    (this.attrHL.array as Float32Array).set(this.lL);
    for (const a of [this.attrLL, this.attrLVO, this.attrDL, this.attrDI, this.attrDS, this.attrHL, this.attrHI]) a.needsUpdate = true;
    this.updateTrails(src, alpha);
  }

  private updateTrails(src: FlockRenderSource, alpha: number): void {
    const P = this.trailPos;
    const C = this.trailCol;
    const A = this.trailA;
    for (let f = 0; f < NF; f++) {
      const inRound = f >= 1 && f <= src.flockCount && src.flockAlive[f] === 1;
      const col = this.palette[f];
      // head = interpolated leader position
      const hx = src.leaderPrevX[f] + (src.leaderX[f] - src.leaderPrevX[f]) * alpha;
      const hz = src.leaderPrevZ[f] + (src.leaderZ[f] - src.leaderPrevZ[f]) * alpha;
      let px = hx;
      let pz = hz;
      for (let k = 0; k < TRAIL_PTS; k++) {
        let x: number;
        let z: number;
        if (k === 0) {
          x = hx;
          z = hz;
        } else {
          const hk = (this.histHead - (k - 1) + TRAIL_PTS * 2) % TRAIL_PTS;
          const avail = k - 1 < this.histCount;
          const b = (f * TRAIL_PTS + hk) * 2;
          x = avail ? this.hist[b] : px;
          z = avail ? this.hist[b + 1] : pz;
        }
        let dx = px - x;
        let dz = pz - z;
        const dl = Math.sqrt(dx * dx + dz * dz);
        if (dl > 1e-4) {
          dx /= dl;
          dz /= dl;
        } else {
          dx = 0;
          dz = 1;
        }
        const w = 0.9 * (1 - k / TRAIL_PTS);
        const v = (f * TRAIL_PTS + k) * 2;
        const a = inRound ? 0.9 * Math.pow(1 - k / TRAIL_PTS, 1.6) : 0;
        for (let s = 0; s < 2; s++) {
          const sg = s === 0 ? -1 : 1;
          const o = (v + s) * 3;
          P[o] = x + -dz * w * sg;
          P[o + 1] = inRound ? 14 : -500;
          P[o + 2] = z + dx * w * sg;
          C[o] = col.x * 0.6 + 0.4;
          C[o + 1] = col.y * 0.6 + 0.35;
          C[o + 2] = col.z * 0.6 + 0.25;
          A[v + s] = a;
        }
        px = x;
        pz = z;
      }
    }
    const geo = this.trails.geometry;
    geo.getAttribute('position').needsUpdate = true;
    geo.getAttribute('aCol').needsUpdate = true;
    geo.getAttribute('aA').needsUpdate = true;
  }

  /** Splat birds into the ownership-density target (call once per frame before the main pass). */
  renderOwnership(): void {
    if (!this.ownRT) return;
    const r = this.renderer;
    const prev = r.getRenderTarget();
    r.setRenderTarget(this.ownRT);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.render(this.ownScene, this.ownCamera);
    r.setRenderTarget(prev);
  }

  get tierName(): QualityTier {
    return this.tier;
  }

  dispose(): void {
    for (const m of [this.birds, this.leaders, this.halos, this.decals, this.trails, this.bg]) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.ownPoints.geometry.dispose();
    this.ownMat.dispose();
    this.ownRT?.dispose();
  }
}

function fract(x: number): number {
  return x - Math.floor(x);
}
