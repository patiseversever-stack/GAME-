// Pilot + wingsuit renderer: skinned procedural body (3 LODs, one draw), suit patterns, cloth flutter, FlightState-
// driven pose, fabric pop on wings-open, ram-air canopy with 1.2 s inflation, landing, non-violent crash tumble
// (1–2 rolls → seated, §2.13), ghost "aurora" variant with rim glow + thin trail, projected decal shadow (all tiers).
import {
  Group, SkinnedMesh, MeshStandardMaterial, ShaderMaterial, Color, Vector3, Quaternion, Euler, DoubleSide, FrontSide,
  CustomBlending, OneFactor, OneMinusSrcAlphaFactor, Matrix4, Vector4,
} from 'three';
import type { Object3D, Camera, WebGLRenderer, Bone, Skeleton, Material, Mesh } from 'three';
import type { QualityTier } from '../../core/settings.ts';
import type { FlightState, SimEvent } from '../../sim/types.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import { buildPilotGeometry, makeSkeleton, B, MAT } from './pilotGeometry.ts';
import { GLSL_SUIT_PATTERNS, SUIT_PALETTES, SUIT_PATTERN_NAMES } from './suitPatterns.ts';
import { Canopy } from './canopy.ts';
import { PilotShadow } from './shadow.ts';
import { patchMaterial } from '../props/patch.ts';
import { GLSL_NOISE } from '../props/glsl.ts';
import { sharedUniforms, GLSL_WARM_LIGHT } from '../vfx/shared.ts';
import { RibbonTrail } from '../vfx/trails.ts';
import type { TrailStyle } from '../vfx/trails.ts';

export interface PilotOptions {
  ghost?: boolean;
  ghostColor?: string;
  sampler?: TerrainSampler | null;
  /** Decal shadow (default: on for the local pilot, off for ghosts). */
  shadow?: boolean;
  name?: string;
}

export interface SuitSpec { pattern: number; palette: number; colors?: [string, string, string]; helmet?: string }

type Mode = 'stand' | 'jump' | 'fly' | 'canopy' | 'landed' | 'crash';

const NB = 18;

// Pose library: per-bone euler offsets (x, y, z) from the bind (flight) pose.
type Pose = Float32Array;
function pose(entries: [number, number, number, number][]): Pose {
  const p = new Float32Array(NB * 3);
  for (const [b, x, y, z] of entries) { p[b * 3] = x; p[b * 3 + 1] = y; p[b * 3 + 2] = z; }
  return p;
}
const P_FLY = pose([[B.head, 0.42, 0, 0], [B.neck, 0.18, 0, 0]]);
const P_JUMP = pose([
  [B.head, 0.5, 0, 0], [B['upperArm.L'], 0.25, 0.75, 0.15], [B['upperArm.R'], 0.25, -0.75, -0.15], [B['foreArm.L'], 0, 0.35, 0], [B['foreArm.R'], 0, -0.35, 0],
  [B['thigh.L'], 0.15, 0.05, 0], [B['thigh.R'], 0.15, -0.05, 0], [B['shin.L'], -0.55, 0, 0], [B['shin.R'], -0.55, 0, 0],
]);
const P_CANOPY = pose([
  [B.head, 0.15, 0, 0], [B['upperArm.L'], 0.35, -1.05, 0.3], [B['upperArm.R'], 0.35, 1.05, -0.3], [B['foreArm.L'], 0, -0.55, 0], [B['foreArm.R'], 0, 0.55, 0],
  [B['thigh.L'], 0.35, 0.06, 0], [B['thigh.R'], 0.35, -0.06, 0], [B['shin.L'], -0.45, 0, 0], [B['shin.R'], -0.45, 0, 0], [B['foot.L'], -0.5, 0, 0], [B['foot.R'], -0.5, 0, 0],
]);
const P_STAND = pose([
  [B.head, 0.05, 0, 0], [B['upperArm.L'], 0.1, 1.38, 0.12], [B['upperArm.R'], 0.1, -1.38, -0.12], [B['foreArm.L'], 0.25, 0.15, 0], [B['foreArm.R'], 0.25, -0.15, 0],
  [B['thigh.L'], 0, 0.05, 0], [B['thigh.R'], 0, -0.05, 0], [B['foot.L'], -1.25, 0, 0], [B['foot.R'], -1.25, 0, 0],
]);
const P_SIT = pose([
  [B.head, 0.1, 0, 0], [B.spine, 0.25, 0, 0], [B['upperArm.L'], 0.75, 1.15, 0.1], [B['upperArm.R'], 0.75, -1.15, -0.1], [B['foreArm.L'], 0.2, 0.5, 0], [B['foreArm.R'], 0.2, -0.5, 0],
  [B['thigh.L'], 1.5, 0.18, 0], [B['thigh.R'], 1.5, -0.18, 0], [B['shin.L'], -1.45, 0, 0], [B['shin.R'], -1.45, 0, 0], [B['foot.L'], -0.9, 0, 0], [B['foot.R'], -0.9, 0, 0],
]);
const P_TUCK = pose([
  [B.head, 0.6, 0, 0], [B.spine, 0.35, 0, 0], [B['upperArm.L'], 0.8, 0.9, 0], [B['upperArm.R'], 0.8, -0.9, 0], [B['foreArm.L'], 0, 1.2, 0], [B['foreArm.R'], 0, -1.2, 0],
  [B['thigh.L'], 1.3, 0.1, 0], [B['thigh.R'], 1.3, -0.1, 0], [B['shin.L'], -1.7, 0, 0], [B['shin.R'], -1.7, 0, 0],
]);

const VERT_PARS = /* glsl */ `
${GLSL_NOISE}
attribute float aMat;
attribute vec2 aPat;
attribute vec4 aCloth;
attribute vec3 aLE;
uniform vec4 uFlutter; // amplitude (m), frequency (Hz), time (s), taut 0..1.25
varying float vKMat;
varying vec2 vKPat;
varying float vKUp;
varying vec3 vKWorld;
varying vec3 vKNrmW;
varying float vKCloth;
`;

const VERT_AFTER_BEGIN = /* glsl */ `
  vKMat = aMat; vKPat = aPat; vKUp = normal.y; vKCloth = aCloth.x;
  if (aCloth.y > 0.5) {
    float taut = uFlutter.w;
    vec3 off = transformed - aLE;
    transformed = aLE + off * mix(0.36, 1.0, clamp(taut, 0.0, 1.3));
    float cr = (1.0 - clamp(taut, 0.0, 1.0)) * aCloth.z;
    transformed.y += (kNoise3(transformed * 17.0) - 0.5) * 0.07 * cr;
    float ph = uFlutter.z * 6.2831853 * uFlutter.y - aCloth.z * 5.5 - aCloth.w * 2.5 + aCloth.y * 1.7;
    transformed.y += (sin(ph) + 0.35 * sin(ph * 2.3 + 1.0)) * uFlutter.x * aCloth.x;
  }
`;

const VERT_END = /* glsl */ `
  vKWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vKNrmW = normalize(mat3(modelMatrix) * objectNormal);
`;

const FRAG_PARS = /* glsl */ `
${GLSL_SUIT_PATTERNS}
${GLSL_WARM_LIGHT}
uniform int uPattern;
uniform vec3 uPalA; uniform vec3 uPalB; uniform vec3 uPalC;
uniform vec3 uHelmet;
uniform vec3 uVisor;
varying float vKMat;
varying vec2 vKPat;
varying float vKUp;
varying vec3 vKWorld;
varying vec3 vKNrmW;
varying float vKCloth;
float kRough; float kMetal; float kRip;
`;

const FRAG_COLOR = /* glsl */ `
  {
    int m = int(vKMat + 0.5);
    vec3 col = vec3(0.5); kRough = 0.6; kMetal = 0.0; kRip = 0.0;
    if (m == ${MAT.suit} || m == ${MAT.membrane}) {
      vec3 w = kSuitPattern(uPattern, vKPat);
      col = uPalA * w.x + uPalB * w.y + uPalC * w.z;
      // underside slightly darker/desaturated, zip + seam lines on the back
      if (vKUp < -0.2) col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), 0.25) * 0.85;
      float zip = (1.0 - smoothstep(0.004, 0.009, abs(vKPat.x))) * step(0.2, vKUp) * step(-0.15, vKPat.y);
      float seam = (1.0 - smoothstep(0.0, 0.006, abs(abs(vKPat.x) - 0.2))) * 0.6;
      col = mix(col, col * 0.45, max(zip, seam * (m == ${MAT.membrane} ? 1.0 : 0.0)));
      // air inlets on the leading-edge underside near the armpits
      vec2 inl = vec2(abs(vKPat.x) - 0.3, vKPat.y - 0.35);
      if (vKUp < 0.0 && m == ${MAT.membrane} && length(inl * vec2(1.0, 3.0)) < 0.05) col *= 0.15;
      kRough = m == ${MAT.membrane} ? 0.52 : 0.6;
      kRip = 1.0;
    } else if (m == ${MAT.trim}) { col = mix(uPalA, vec3(0.03), 0.7); kRough = 0.7; kRip = 0.5; }
    else if (m == ${MAT.glove}) { col = vec3(0.028, 0.026, 0.026); kRough = 0.48; }
    else if (m == ${MAT.shoe}) { col = vec3(0.04, 0.04, 0.045); kRough = 0.72; }
    else if (m == ${MAT.helmet}) { col = uHelmet; kRough = 0.26; }
    else if (m == ${MAT.visor}) { col = uVisor; kRough = 0.05; kMetal = 1.0; }
    else { col = mix(uPalA, vec3(0.03), 0.75); kRough = 0.8; kRip = 0.8; }
    diffuseColor.rgb = col;
  }
`;

const FRAG_NORMAL = /* glsl */ `
  if (kRip > 0.0) {
    // ripstop grid (5 mm) + soft fold creases, perturbing the view-space normal with screen derivatives
    vec2 q = vKPat * 190.0;
    float gx = abs(fract(q.x) - 0.5), gy = abs(fract(q.y) - 0.5);
    // fade the 5 mm grid out before it aliases (screen-space frequency check)
    float ripFade = 1.0 - smoothstep(0.25, 0.6, max(fwidth(q.x), fwidth(q.y)));
    float rip = (smoothstep(0.42, 0.5, gx) + smoothstep(0.42, 0.5, gy)) * 0.5 * ripFade;
    float fold = kVN(vKPat * vec2(9.0, 3.0)) - 0.5;
    vec3 dpx = dFdx(vKWorld), dpy = dFdy(vKWorld);
    float h = rip * 0.0015 + fold * 0.01 * vKCloth + fold * 0.004;
    float hx = dFdx(h), hy = dFdy(h);
    vec3 Nw = normalize(vKNrmW);
    vec3 r1 = cross(dpy, Nw), r2 = cross(Nw, dpx);
    float det = dot(dpx, r1);
    vec3 grad = (r1 * hx + r2 * hy) / max(abs(det), 1e-8) * sign(det);
    vec3 nb = normalize(Nw - grad * kRip);
    normal = normalize((viewMatrix * vec4(nb, 0.0)).xyz) * (gl_FrontFacing ? 1.0 : -1.0);
  }
`;

const FRAG_LIGHT = /* glsl */ `
  reflectedLight.directDiffuse += kWarmLight(vKWorld, normalize(vKNrmW), diffuseColor.rgb);
  #if NUM_DIR_LIGHTS > 0
  if (vKCloth > 0.05) {
    vec3 Ls = directionalLights[0].direction;
    float back = clamp(-dot(geometryNormal, Ls), 0.0, 1.0);
    reflectedLight.directDiffuse += directionalLights[0].color * diffuseColor.rgb * diffuseColor.rgb * back * 0.25 * vKCloth;
  }
  #endif
`;

const GHOST_VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying vec3 vN;
varying vec3 vV;
varying vec3 vW;
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
  vV = -mvPosition.xyz;
  vW = (modelMatrix * vec4(transformed, 1.0)).xyz;
}
`;

const GHOST_FRAG = /* glsl */ `
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uTime;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
varying vec3 vW;
void main() {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float rim = pow(1.0 - ndv, 2.4);
  // slow aurora drift (<0.3 Hz, never strobes)
  float band = 0.5 + 0.5 * sin(vW.y * 2.2 + vW.x * 1.3 + uTime * 1.2);
  vec3 col = mix(uColA, uColB, band);
  float a = (0.08 + 0.95 * rim) * uOpacity;
  gl_FragColor = vec4(col * a * 1.8, a * 0.35);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function hex(c: string): Color { return new Color(c); }

const _v = new Vector3(), _v2 = new Vector3(), _q = new Quaternion(), _q2 = new Quaternion(), _e = new Euler(0, 0, 0, 'YXZ'), _m = new Matrix4();
const UP = new Vector3(0, 1, 0);

export class Pilot {
  readonly object = new Group();
  readonly body = new Group();
  readonly suit: SuitSpec = { pattern: 0, palette: 0 };
  readonly ghost: boolean;
  name: string;
  private readonly meshes: SkinnedMesh[] = [];
  private readonly bones: Bone[];
  private readonly skeleton: Skeleton;
  private readonly mat: Material;
  private readonly uniforms = {
    uFlutter: { value: new Vector4(0, 6, 0, 1) },
    uPattern: { value: 0 },
    uPalA: { value: new Color() }, uPalB: { value: new Color() }, uPalC: { value: new Color() },
    uHelmet: { value: new Color('#EDEBE6') }, uVisor: { value: new Color(0.62, 0.48, 0.22) },
  };
  private readonly ghostU = { uColA: { value: new Color('#7FE3FF') }, uColB: { value: new Color('#B49CFF') }, uTime: sharedUniforms.uTime, uOpacity: { value: 0.9 } };
  readonly canopy: Canopy;
  readonly canopyRoot = new Group();
  readonly shadow: PilotShadow | null;
  readonly trail: RibbonTrail | null;
  private readonly parent: Object3D;
  private tier: QualityTier;
  private mode: Mode = 'stand';
  private modeT = 0;
  private time = 0;
  private readonly cur = new Float32Array(NB * 3);
  private readonly tgt = new Float32Array(NB * 3);
  private readonly attitude = new Quaternion();
  private readonly pos = new Vector3();
  private readonly vel = new Vector3(0, 0, -40);
  private speed = 0;
  private psi = 0;
  private phi = 0;
  private lastPhi = 0;
  private bankRate = 0;
  private gamma = 0;
  private cl = 0.6;
  private taut = 1;
  private popT = 99;
  private inflateT = -1;
  private deflateT = -1;
  private crashT = -1;
  private crashDir = new Vector3(0, 0, -1);
  private landedSoft = true;
  private ground = 0;
  private sampler: TerrainSampler | null;
  private renderer: WebGLRenderer | null = null;
  private lod = 0;
  private get flutter(): Vector4 { return this.uniforms.uFlutter.value; }
  private readonly _hand = new Vector3();

  constructor(parent: Object3D, tier: QualityTier, opts: PilotOptions = {}) {
    this.parent = parent;
    this.tier = tier;
    this.ghost = !!opts.ghost;
    this.name = opts.name ?? '';
    this.sampler = opts.sampler ?? null;
    const { root, bones, skeleton } = makeSkeleton();
    this.bones = bones;
    this.skeleton = skeleton;
    if (this.ghost) {
      if (opts.ghostColor) this.ghostU.uColA.value.set(opts.ghostColor);
      this.mat = new ShaderMaterial({
        vertexShader: GHOST_VERT, fragmentShader: GHOST_FRAG, uniforms: this.ghostU,
        transparent: true, depthWrite: false, side: FrontSide, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      });
    } else {
      this.mat = patchMaterial(new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, side: DoubleSide, envMapIntensity: 1 }), {
        key: 'pilot',
        uniforms: { ...this.uniforms, uWarmPos: sharedUniforms.uWarmPos, uWarmColor: sharedUniforms.uWarmColor },
        vertexPars: VERT_PARS,
        vertexAfterBegin: VERT_AFTER_BEGIN,
        vertexEnd: VERT_END,
        fragPars: FRAG_PARS,
        fragColor: FRAG_COLOR,
        fragRoughness: 'roughnessFactor = kRough;',
        fragMetalness: 'metalnessFactor = kMetal;',
        fragNormal: FRAG_NORMAL,
        fragLight: FRAG_LIGHT,
      });
    }
    for (const lvl of [0, 1, 2] as const) {
      const m = new SkinnedMesh(buildPilotGeometry(lvl), this.mat);
      m.name = `pilot-lod${lvl}`;
      m.frustumCulled = false;
      m.castShadow = false;
      if (lvl === 0) m.add(root);
      m.bind(skeleton, new Matrix4());
      m.visible = lvl === 0;
      this.meshes.push(m);
      this.body.add(m);
    }
    this.object.add(this.body);
    this.object.name = this.ghost ? 'pilot-ghost' : 'pilot';
    this.canopy = new Canopy(this.ghost ? 2 : 0, sharedUniforms.uTime);
    this.canopyRoot.add(this.canopy.group);
    this.object.add(this.canopyRoot);
    parent.add(this.object);
    const wantShadow = opts.shadow ?? !this.ghost;
    this.shadow = wantShadow ? new PilotShadow(this.sampler) : null;
    if (this.shadow) this.shadow.addTo(parent);
    this.trail = this.ghost ? new RibbonTrail('ghost', sharedUniforms.uTime) : null;
    if (this.trail) { this.trail.width = 0.06; this.trail.alpha = 0.55; this.trail.setStyle('ghost', opts.ghostColor); this.trail.addTo(parent); }
    this.setSuit({ pattern: 0, palette: 0 });
    for (let i = 0; i < NB * 3; i++) this.cur[i] = P_STAND[i];
    this.applyPose();
  }

  /** Suit cosmetics: pattern 0..26 (SUIT_PATTERN_NAMES), palette 0..11 (SUIT_PALETTES) or explicit colours. */
  setSuit(spec: SuitSpec): void {
    this.suit.pattern = ((spec.pattern % SUIT_PATTERN_NAMES.length) + SUIT_PATTERN_NAMES.length) % SUIT_PATTERN_NAMES.length;
    this.suit.palette = ((spec.palette % SUIT_PALETTES.length) + SUIT_PALETTES.length) % SUIT_PALETTES.length;
    const cols = spec.colors ?? SUIT_PALETTES[this.suit.palette];
    this.uniforms.uPattern.value = this.suit.pattern;
    this.uniforms.uPalA.value.set(cols[0]);
    this.uniforms.uPalB.value.set(cols[1]);
    this.uniforms.uPalC.value.set(cols[2]);
    this.uniforms.uHelmet.value.set(spec.helmet ?? (this.suit.palette === 6 ? '#2B2D33' : cols[1]));
    // canopy wears the suit palette
    this.canopy.setColors(hex(cols[0]), hex(cols[1]), hex(cols[2]));
  }

  setGhostColor(c: string): void {
    this.ghostU.uColA.value.set(c);
    this.trail?.setStyle('ghost', c);
  }

  setTrailStyle(s: TrailStyle): void { this.trail?.setStyle(s); }

  setSampler(s: TerrainSampler | null): void {
    this.sampler = s;
    this.shadow?.setSampler(s);
  }

  setTier(t: QualityTier): void { this.tier = t; }

  /** Renderer is needed for the shadow mask pass; call once (or pass in update). */
  setRenderer(r: WebGLRenderer): void { this.renderer = r; }

  setSunDirection(x: number, y: number, z: number): void { this.shadow?.setSunDirection(x, y, z); }

  /** Feed the flight state each render frame (alpha = render interpolation factor between prevPos and pos). */
  setState(s: FlightState, alpha = 1): void {
    const a = Math.min(1, Math.max(0, alpha));
    this.pos.set(s.prevPos[0] + (s.pos[0] - s.prevPos[0]) * a, s.prevPos[1] + (s.pos[1] - s.prevPos[1]) * a, s.prevPos[2] + (s.pos[2] - s.prevPos[2]) * a);
    this.vel.set(s.vel[0], s.vel[1], s.vel[2]);
    this.speed = s.speed;
    this.psi = s.psi;
    this.phi = s.phi;
    this.gamma = s.gamma;
    this.cl = s.cl;
    const next: Mode = s.phase === 'intro' ? 'stand' : s.phase === 'jump' ? 'jump' : s.phase === 'flying' ? 'fly'
      : s.phase === 'canopy' || s.phase === 'halfFlight' ? 'canopy' : s.phase === 'landed' ? 'landed' : 'crash';
    if (next !== this.mode) this.enter(next);
    if (this.mode === 'canopy' && this.inflateT < 0) this.inflateT = 0;
  }

  /** Discrete sim events (wingsOpen → fabric pop, parachuteOpen → inflation, landed, crash). */
  event(e: SimEvent): void {
    if (e.type === 'wingsOpen') { this.popT = 0; if (this.mode === 'jump') this.enter('fly'); }
    else if (e.type === 'parachuteOpen') { this.enter('canopy'); this.inflateT = 0; }
    else if (e.type === 'landed') { this.landedSoft = e.soft; this.enter('landed'); }
    else if (e.type === 'crash') { this.enter('crash'); }
  }

  private enter(m: Mode): void {
    if (m === this.mode) return;
    const prev = this.mode;
    this.mode = m;
    this.modeT = 0;
    if (m === 'fly' && prev === 'jump') this.popT = 0;
    if (m === 'canopy' && this.inflateT < 0) this.inflateT = 0;
    if (m === 'landed') this.deflateT = 0;
    if (m === 'crash') {
      this.crashT = 0;
      this.crashDir.copy(this.vel).setY(0);
      if (this.crashDir.lengthSq() < 1e-4) this.crashDir.set(Math.sin(this.psi), 0, -Math.cos(this.psi));
      this.crashDir.normalize();
      this.inflateT = -1;
    }
    if (m === 'jump' || m === 'fly') { this.inflateT = -1; this.deflateT = -1; this.crashT = -1; }
  }

  private applyPose(): void {
    for (let b = 0; b < NB; b++) {
      _e.set(this.cur[b * 3], this.cur[b * 3 + 1], this.cur[b * 3 + 2], 'XYZ');
      this.bones[b].quaternion.setFromEuler(_e);
    }
  }

  private blendInto(p: Pose, w: number): void {
    for (let i = 0; i < NB * 3; i++) this.tgt[i] += p[i] * w;
  }

  /** Per render frame. */
  update(dt: number, camera: Camera, renderer?: WebGLRenderer): void {
    if (renderer) this.renderer = renderer;
    this.time += dt;
    this.modeT += dt;
    const d = Math.max(1e-4, dt);
    const rate = (this.phi - this.lastPhi) / d;
    this.lastPhi = this.phi;
    this.bankRate += (rate - this.bankRate) * Math.min(1, dt * 8);
    // ---- target pose
    this.tgt.fill(0);
    let taut = 1;
    let upright = 0;
    const m = this.mode;
    if (m === 'fly') {
      this.blendInto(P_FLY, 1);
      // dive tuck: arms sweep back with steep dives / high speed
      const tuck = Math.min(1, Math.max(0, (-this.gamma - 0.45) * 1.6 + (this.speed - 52) * 0.03));
      const sweep = 0.12 + 0.7 * tuck - Math.min(0.25, Math.max(0, this.cl - 0.8) * 0.5);
      this.tgt[B['upperArm.L'] * 3 + 1] += sweep; this.tgt[B['upperArm.R'] * 3 + 1] -= sweep;
      this.tgt[B['foreArm.L'] * 3 + 1] += 0.15 * tuck; this.tgt[B['foreArm.R'] * 3 + 1] -= 0.15 * tuck;
      this.tgt[B['thigh.L'] * 3 + 1] += 0.06 * tuck; this.tgt[B['thigh.R'] * 3 + 1] -= 0.06 * tuck;
      // bank: dip the inner wing and twist slightly (body language of the turn)
      const bk = Math.max(-1, Math.min(1, this.phi / 1.2));
      this.tgt[B['upperArm.L'] * 3 + 2] += 0.18 * bk; this.tgt[B['upperArm.R'] * 3 + 2] += 0.18 * bk;
      this.tgt[B.head * 3 + 2] -= 0.2 * bk;
      const rr = Math.max(-1, Math.min(1, this.bankRate / 2));
      this.tgt[B['thigh.L'] * 3 + 2] += 0.08 * rr; this.tgt[B['thigh.R'] * 3 + 2] += 0.08 * rr;
      // pop
      if (this.popT < 2) this.popT += dt;
      taut = this.popT < 0.6 ? 1 - 0.75 * Math.exp(-this.popT * 9) * Math.cos(this.popT * 26) : 1;
    } else if (m === 'jump') {
      this.blendInto(P_JUMP, 1);
      taut = 0.28;
    } else if (m === 'canopy') {
      const k = Math.min(1, this.modeT / 0.8);
      this.blendInto(P_JUMP, 1 - k);
      this.blendInto(P_CANOPY, k);
      taut = 0.2;
      upright = Math.min(1, this.modeT / 0.9);
    } else if (m === 'landed') {
      this.blendInto(this.landedSoft ? P_STAND : P_SIT, 1);
      taut = 0.15;
      upright = 1;
    } else if (m === 'crash') {
      const t = this.crashT;
      const k = Math.min(1, Math.max(0, (t - 1.25) / 0.6));
      this.blendInto(P_TUCK, 1 - k);
      this.blendInto(P_SIT, k);
      taut = 0.2;
      upright = k;
    } else {
      this.blendInto(P_STAND, 1);
      taut = 0.15;
      upright = 1;
    }
    const kp = Math.min(1, dt * (m === 'crash' ? 10 : 7));
    for (let i = 0; i < NB * 3; i++) this.cur[i] += (this.tgt[i] - this.cur[i]) * kp;
    this.applyPose();
    this.taut += (taut - this.taut) * Math.min(1, dt * (m === 'fly' && this.popT < 0.6 ? 60 : 6));
    if (m === 'fly' && this.popT < 0.6) this.taut = taut;
    // ---- flutter (cloth): amplitude ∝ speed and bank rate, frequency rises with speed
    const popBoost = m === 'fly' && this.popT < 0.5 ? 2.5 * (1 - this.popT / 0.5) : 0;
    this.flutter.x = Math.min(0.04, 0.003 + this.speed * 0.00035 + Math.abs(this.bankRate) * 0.006 + popBoost * 0.012) * (m === 'fly' || m === 'jump' ? 1 : 0.3);
    this.flutter.y = 4 + this.speed * 0.12;
    this.flutter.z = this.time % 1000;
    this.flutter.w = this.taut;
    // ---- attitude + placement
    if (this.sampler) this.ground = this.sampler.height(this.pos.x, this.pos.z);
    const yaw = -this.psi;
    if (m === 'fly' || m === 'jump') {
      const alphaAoA = Math.min(0.6, Math.max(0.03, 0.06 + this.cl * 0.32));
      const pitch = m === 'jump' ? Math.min(-0.2, this.gamma + 0.3) : this.gamma + alphaAoA;
      _e.set(pitch, yaw, -this.phi, 'YXZ');
      _q.setFromEuler(_e);
      this.object.position.copy(this.pos);
    } else if (m === 'crash') {
      this.crashT += dt;
      const t = this.crashT;
      // 1.5 forward rolls decelerating over 1.25 s, then settle seated
      const roll = (1 - Math.pow(1 - Math.min(1, t / 1.25), 2.2)) * Math.PI * 3;
      const travel = (1 - Math.pow(1 - Math.min(1, t / 1.4), 2)) * 3.2;
      const hop = Math.max(0, Math.sin(Math.min(1, t / 1.25) * Math.PI * 1.5)) * 0.7 * (1 - Math.min(1, t / 1.25));
      const right = _v2.set(this.crashDir.z, 0, -this.crashDir.x).negate();
      _q2.setFromAxisAngle(right, -roll);
      _e.set(Math.PI / 2, Math.atan2(-this.crashDir.x, -this.crashDir.z), 0, 'YXZ');
      _q.setFromEuler(_e);
      if (t < 1.25) _q.premultiply(_q2);
      const gx = this.pos.x + this.crashDir.x * travel, gz = this.pos.z + this.crashDir.z * travel;
      const gy = this.sampler ? this.sampler.height(gx, gz) : this.pos.y;
      this.object.position.set(gx, gy + (t < 1.25 ? 0.45 + hop : 0.28), gz);
    } else {
      // upright modes: canopy (hanging, slight swing with turns), landed / stand
      const sw = m === 'canopy' ? Math.sin(this.time * 1.1) * 0.05 + Math.max(-0.4, Math.min(0.4, this.bankRate * 0.3)) : 0;
      _e.set(Math.PI / 2 - (m === 'canopy' ? 0.12 : 0), yaw, sw, 'YXZ');
      _q2.setFromEuler(_e);
      if (upright < 1 && (m === 'canopy')) {
        _e.set(this.gamma + 0.2, yaw, -this.phi, 'YXZ');
        _q.setFromEuler(_e);
        _q.slerp(_q2, upright);
      } else _q.copy(_q2);
      if (m === 'landed' || m === 'stand') {
        const gy = this.sampler ? this.ground : this.pos.y;
        this.object.position.set(this.pos.x, gy + (m === 'landed' && !this.landedSoft ? 0.28 : 1.12), this.pos.z);
      } else this.object.position.copy(this.pos);
    }
    this.attitude.slerp(_q, Math.min(1, dt * (m === 'fly' ? 20 : 8)));
    if (m === 'fly' || m === 'jump' || m === 'crash') this.attitude.copy(_q);
    this.body.quaternion.copy(this.attitude);
    // ---- canopy
    this.updateCanopy(dt, yaw);
    // ---- LOD by camera distance
    const cd = camera.position.distanceTo(this.object.position);
    const lod = cd < 22 ? 0 : cd < 70 ? 1 : 2;
    const bias = this.tier === 'low' ? 1 : 0;
    const L = Math.min(2, lod + (lod > 0 ? bias : 0));
    if (L !== this.lod) {
      for (let i = 0; i < 3; i++) this.meshes[i].visible = i === L;
      this.lod = L;
    }
    this.object.updateMatrixWorld(true);
    // ---- ghost trail from the body centre
    if (this.trail) {
      _v.set(0, 0, 0).applyMatrix4(this.body.matrixWorld);
      _v2.set(1, 0, 0).applyQuaternion(this.attitude);
      this.trail.update(dt, _v, _v2, 0.05);
    }
    // ---- shadow decal
    if (this.shadow && this.renderer) {
      const ext = this.canopy.group.visible ? 4.6 : 1.35;
      _v.copy(this.object.position);
      if (this.canopy.group.visible) _v.y += 2.0;
      this.shadow.update(this.renderer, this.shadowCasters(), _v, ext);
    }
  }

  private readonly casterList: Mesh[] = [];
  private shadowCasters(): Mesh[] {
    this.casterList.length = 0;
    // a cheaper LOD is enough for a 128² silhouette; it must be visible for the mask pass
    this.casterList.push(this.meshes[this.lod]);
    if (this.canopy.group.visible) this.casterList.push(this.canopy.mesh);
    return this.casterList;
  }

  private updateCanopy(dt: number, yaw: number): void {
    const c = this.canopy;
    if (this.inflateT >= 0 && (this.mode === 'canopy' || this.mode === 'landed')) {
      this.inflateT += dt;
      const t = Math.min(1, this.inflateT / 1.2);
      // fast snap-open with a small overshoot settle (cells pressurise)
      let k = 1 - Math.pow(1 - t, 3);
      if (t >= 1) k = 1 + Math.sin(Math.min(1, (this.inflateT - 1.2) / 0.5) * Math.PI) * 0.02 * (1 - Math.min(1, (this.inflateT - 1.2) / 0.5));
      if (this.mode === 'landed' && this.deflateT >= 0) {
        this.deflateT += dt;
        k *= Math.max(0, 1 - this.deflateT / 1.4);
      }
      c.inflate = k;
      c.group.visible = k > 0.01 || this.mode === 'canopy';
      // canopy flies above the pilot, oriented with the heading; when landing it sinks back behind the pilot
      this.canopyRoot.quaternion.setFromAxisAngle(UP, yaw);
      const sink = this.mode === 'landed' ? Math.min(1, this.deflateT / 1.4) : 0;
      this.canopyRoot.position.set(0, -sink * 3.2, 0);
      _v.set(0, 0, 1).applyQuaternion(this.canopyRoot.quaternion).multiplyScalar(sink * 3.5);
      this.canopyRoot.position.add(_v);
      if (this.mode === 'landed' && this.object.position.y > this.pos.y + 0.5) this.canopyRoot.position.y -= 1.0;
      c.update();
    } else {
      c.group.visible = false;
    }
    void _m;
  }

  /** World positions of the two wingtips (for VFX trails). */
  getWingtips(outL: Vector3, outR: Vector3): void {
    this.bones[B['hand.L']].getWorldPosition(outL);
    this.bones[B['hand.R']].getWorldPosition(outR);
    // extend to the glove tips along the arm
    this.bones[B['foreArm.L']].getWorldPosition(this._hand);
    outL.addScaledVector(_v.copy(outL).sub(this._hand).normalize(), 0.16);
    this.bones[B['foreArm.R']].getWorldPosition(this._hand);
    outR.addScaledVector(_v.copy(outR).sub(this._hand).normalize(), 0.16);
  }

  /** Anchor above the helmet for the ghost name label (UI projects it). */
  getLabelAnchor(out: Vector3): Vector3 {
    return out.copy(this.object.position).add(_v.set(0, 0.9, 0));
  }

  get currentMode(): string { return this.mode; }
  get visible(): boolean { return this.object.visible; }
  set visible(v: boolean) {
    this.object.visible = v;
    if (this.shadow) this.shadow.visible = v;
    if (this.trail) this.trail.mesh.visible = v && this.trail.mesh.visible;
  }

  /** Approximate triangle count of the visible pilot (perf HUD). */
  triangles(): number {
    const g = this.meshes[this.lod].geometry;
    return (g.index ? g.index.count : 0) / 3 + (this.canopy.group.visible ? (this.canopy.mesh.geometry.index?.count ?? 0) / 3 : 0);
  }

  calls(): number { return 1 + (this.canopy.group.visible ? 2 : 0) + (this.shadow && this.shadow.mesh.visible ? 2 : 0) + (this.trail?.mesh.visible ? 1 : 0); }

  dispose(): void {
    this.parent.remove(this.object);
    for (const m of this.meshes) m.geometry.dispose();
    this.mat.dispose();
    this.canopy.dispose();
    if (this.shadow) { this.shadow.removeFrom(this.parent); this.shadow.dispose(); }
    if (this.trail) { this.trail.removeFrom(this.parent); this.trail.dispose(); }
  }
}

export { SUIT_PATTERN_NAMES, SUIT_PALETTES };
