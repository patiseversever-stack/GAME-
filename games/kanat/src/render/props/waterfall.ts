// Waterfalls (Karadeniz): flow-textured ballistic ribbon (lit, premultiplied) + soft mist sprites at the plunge.
// Not collidable → described by WaterfallDef, not PropInstance. All waterfalls = 2 draw calls.
import {
  BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, DoubleSide, ShaderMaterial, InstancedBufferGeometry,
  InstancedBufferAttribute, CustomBlending, OneFactor, OneMinusSrcAlphaFactor, Vector3,
} from 'three';
import type { Camera, Object3D } from 'three';
import { patchMaterial } from './patch.ts';
import { GLSL_NOISE } from './glsl.ts';
import type { PropTierConfig } from './tiers.ts';
import { sharedUniforms } from '../vfx/shared.ts';

export interface WaterfallDef {
  /** Lip centre (world). */
  top: [number, number, number];
  /** Plunge point (world). Horizontal offset from `top` gives the pour direction. */
  bottom: [number, number, number];
  /** Width at the lip (m). */
  width: number;
}

const RIBBON_VERT_PARS = /* glsl */ `
attribute vec2 aFlow; // x = across (-1..1), y = s along the fall (0 top .. 1 bottom)
attribute float aLen;
varying vec2 vKFlow;
varying float vKLen;
varying vec3 vKWorld;
`;

const RIBBON_FRAG_PARS = /* glsl */ `
${GLSL_NOISE}
uniform float uTime;
varying vec2 vKFlow;
varying float vKLen;
varying vec3 vKWorld;
`;

const RIBBON_FRAG_COLOR = /* glsl */ `
  {
    float s = vKFlow.y;
    // flow speed grows with the fall (v = sqrt(2 g h)), streaks stretch accordingly
    float along = sqrt(max(s, 0.0)) * vKLen;
    float t = uTime;
    float n1 = kNoise2(vec2(vKFlow.x * 9.0, along * 0.35 - t * 3.2));
    float n2 = kNoise2(vec2(vKFlow.x * 23.0 + 5.0, along * 0.9 - t * 6.5));
    float n3 = kNoise2(vec2(vKFlow.x * 4.0 + 11.0, along * 0.12 - t * 1.4));
    float streak = smoothstep(0.35, 0.85, n1 * 0.55 + n2 * 0.3 + n3 * 0.35);
    float edge = 1.0 - smoothstep(0.55, 1.0, abs(vKFlow.x) + (n3 - 0.5) * 0.4);
    float a = edge * (0.45 + 0.55 * streak) * (1.0 - smoothstep(0.82, 1.0, s)) * smoothstep(0.0, 0.03, s);
    a *= 0.85;
    vec3 water = mix(vec3(0.62, 0.72, 0.72), vec3(1.0), streak * 0.85 + s * 0.2);
    diffuseColor = vec4(water, a);
  }
`;

const MIST_VERT = /* glsl */ `
attribute vec4 aMist; // xyz = plunge pos, w = width
attribute float aSeed;
uniform float uTime;
varying vec2 vUv;
varying float vA;
varying float vSeed;
void main() {
  float ph = fract(uTime * 0.07 + aSeed);
  float r = aMist.w * (0.5 + 0.9 * ph);
  vec3 c = aMist.xyz + vec3(sin(aSeed * 40.0) * aMist.w * 0.6, ph * aMist.w * 1.4 + 1.0, cos(aSeed * 31.0) * aMist.w * 0.6);
  vec3 toCam = normalize(cameraPosition - c);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + 1e-5);
  vec3 up = cross(toCam, right);
  vec3 p = c + (right * position.x + up * position.y) * r * 2.0;
  vUv = uv; vSeed = aSeed;
  vA = sin(ph * 3.14159) * 0.32;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const MIST_FRAG = /* glsl */ `
${GLSL_NOISE}
uniform float uTime;
varying vec2 vUv;
varying float vA;
varying float vSeed;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float n = kNoise2(p * 2.5 + vSeed * 17.0 + uTime * 0.15) * 0.6 + kNoise2(p * 5.0 - uTime * 0.2) * 0.4;
  float a = smoothstep(1.0, 0.2, length(p)) * (0.5 + 0.7 * n) * vA;
  gl_FragColor = vec4(vec3(0.92, 0.95, 0.96) * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class WaterfallLayer {
  private ribbon: Mesh | null = null;
  private mist: Mesh | null = null;
  private readonly parent: Object3D;
  private cfg: PropTierConfig;
  private tris = 0;

  constructor(parent: Object3D, cfg: PropTierConfig) {
    this.parent = parent;
    this.cfg = cfg;
  }

  build(defs: WaterfallDef[]): void {
    this.dispose();
    const pos: number[] = [], nrm: number[] = [], flow: number[] = [], len: number[] = [], idx: number[] = [];
    const mistData: number[] = [], mistSeed: number[] = [];
    const NS = 28, NW = 6;
    for (const d of defs) {
      const top = new Vector3(...d.top), bot = new Vector3(...d.bottom);
      const horiz = new Vector3(bot.x - top.x, 0, bot.z - top.z);
      let X = horiz.length();
      const dir = X > 0.1 ? horiz.divideScalar(X) : new Vector3(1, 0, 0);
      if (X < 0.1) X = 0;
      const Hf = Math.max(1, top.y - bot.y);
      const across = new Vector3(-dir.z, 0, dir.x);
      const base = pos.length / 3;
      for (let i = 0; i <= NS; i++) {
        const s = i / NS;
        // ballistic pour: x ∝ s, y ∝ s² (time-parametrised)
        const p = top.clone().addScaledVector(dir, X * s).add(new Vector3(0, -Hf * s * s, 0));
        const w = d.width * (1 + 0.6 * s);
        const tangent = dir.clone().multiplyScalar(X).add(new Vector3(0, -2 * Hf * s, 0)).normalize();
        const n = new Vector3().crossVectors(across, tangent).normalize();
        if (n.dot(dir) < 0) n.negate();
        for (let j = 0; j <= NW; j++) {
          const a = (j / NW) * 2 - 1;
          const bulge = (1 - a * a) * 0.25 * d.width * 0.1;
          pos.push(p.x + across.x * a * w * 0.5 + n.x * bulge, p.y, p.z + across.z * a * w * 0.5 + n.z * bulge);
          nrm.push(n.x, n.y, n.z);
          flow.push(a, s);
          len.push(Hf + X);
        }
      }
      const row = NW + 1;
      for (let i = 0; i < NS; i++) for (let j = 0; j < NW; j++) {
        const a = base + i * row + j;
        idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
      }
      const nm = this.cfg.level >= 2 ? 14 : 8;
      for (let k = 0; k < nm; k++) { mistData.push(bot.x, bot.y, bot.z, Math.max(4, d.width * 1.2)); mistSeed.push(k / nm + 0.37 * (k % 3)); }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
    g.setAttribute('aFlow', new Float32BufferAttribute(flow, 2));
    g.setAttribute('aLen', new Float32BufferAttribute(len, 1));
    g.setIndex(idx);
    const mat = patchMaterial(new MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0, transparent: true, depthWrite: false, side: DoubleSide, premultipliedAlpha: true }), {
      key: 'waterfall',
      uniforms: { uTime: sharedUniforms.uTime },
      vertexPars: RIBBON_VERT_PARS,
      vertexEnd: 'vKFlow = aFlow; vKLen = aLen; vKWorld = (modelMatrix * vec4(position, 1.0)).xyz;',
      fragPars: RIBBON_FRAG_PARS,
      fragColor: RIBBON_FRAG_COLOR,
    });
    this.ribbon = new Mesh(g, mat);
    this.ribbon.renderOrder = 5;
    this.ribbon.name = 'waterfalls';
    this.parent.add(this.ribbon);
    this.tris = idx.length / 3;
    const mg = new InstancedBufferGeometry();
    mg.setAttribute('position', new Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    mg.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    mg.setIndex([0, 1, 2, 0, 2, 3]);
    mg.setAttribute('aMist', new InstancedBufferAttribute(new Float32Array(mistData), 4));
    mg.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(mistSeed), 1));
    mg.instanceCount = mistSeed.length;
    const mm = new ShaderMaterial({
      vertexShader: MIST_VERT, fragmentShader: MIST_FRAG, uniforms: { uTime: sharedUniforms.uTime },
      transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
    });
    this.mist = new Mesh(mg, mm);
    this.mist.frustumCulled = false;
    this.mist.renderOrder = 6;
    this.parent.add(this.mist);
  }

  setTier(cfg: PropTierConfig): void { this.cfg = cfg; }
  update(_camera: Camera, _t: number): void { /* animated entirely in shaders via sharedUniforms.uTime */ }
  calls(): number { return (this.ribbon ? 1 : 0) + (this.mist ? 1 : 0); }
  triangles(): number { return this.tris + (this.mist ? (this.mist.geometry as InstancedBufferGeometry).instanceCount * 2 : 0); }

  dispose(): void {
    if (this.ribbon) { this.parent.remove(this.ribbon); this.ribbon.geometry.dispose(); (this.ribbon.material as MeshStandardMaterial).dispose(); this.ribbon = null; }
    if (this.mist) { this.parent.remove(this.mist); this.mist.geometry.dispose(); (this.mist.material as ShaderMaterial).dispose(); this.mist = null; }
  }
}
