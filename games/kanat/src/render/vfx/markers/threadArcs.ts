// Balloon Thread arcs: dashed light garlands between threadable balloon pairs (one instanced draw).
import {
  InstancedBufferGeometry, InstancedBufferAttribute, Float32BufferAttribute, BufferGeometry, Mesh, ShaderMaterial,
  CustomBlending, OneFactor, OneMinusSrcAlphaFactor, DynamicDrawUsage, DoubleSide, Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { RouteThermal } from '../../../sim/types.ts';
import type { TerrainSampler } from '../../../sim/terrain/types.ts';
import { GLSL_NOISE } from '../../props/glsl.ts';
import { PREMUL, TAIL } from './common.ts';
// ------------------------------------------------------------------------------------------------ balloon thread arcs

const ARC_SEG = 40;

const ARC_VERT = /* glsl */ `
attribute vec2 aS;   // s (0..1), side (−1/1)
attribute vec4 aA;   // start xyz, seed
attribute vec4 aB;   // end xyz, strength
uniform float uTime;
varying float vS;
varying float vSide;
varying float vA;
varying float vLen;
void main() {
  float s = aS.x;
  vec3 p = mix(aA.xyz, aB.xyz, s);
  float L = distance(aA.xyz, aB.xyz);
  p.y -= sin(3.14159265 * s) * L * 0.08; // gentle garland sag
  vec3 d = normalize(aB.xyz - aA.xyz);
  vec3 toCam = normalize(cameraPosition - p);
  vec3 side = normalize(cross(d, toCam) + 1e-5);
  float w = 0.09 + 0.004 * distance(p, cameraPosition);
  p += side * aS.y * w;
  vS = s; vSide = aS.y; vA = aB.w; vLen = L;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const ARC_FRAG = /* glsl */ `
uniform float uTime;
varying float vS;
varying float vSide;
varying float vA;
varying float vLen;
void main() {
  // dashes ~1.6 m long scrolling slowly from both ends to the middle (motion, not flicker)
  float x = abs(vS - 0.5) * vLen;
  float dash = smoothstep(0.35, 0.45, fract(x / 1.6 + uTime * 0.6)) * (1.0 - smoothstep(0.75, 0.85, fract(x / 1.6 + uTime * 0.6)));
  float edge = 1.0 - abs(vSide);
  float ends = smoothstep(0.0, 0.08, vS) * smoothstep(1.0, 0.92, vS);
  float a = dash * smoothstep(0.0, 0.8, edge) * ends * vA;
  gl_FragColor = vec4(vec3(1.0, 0.8, 0.45) * a * 2.2, 0.0);
  ${TAIL}
}
`;

export class ThreadArcs {
  readonly mesh: Mesh;
  private readonly geo: InstancedBufferGeometry;
  private readonly aA: InstancedBufferAttribute;
  private readonly aB: InstancedBufferAttribute;
  private readonly timeU = { value: 0 };
  readonly max: number;

  constructor(max = 8) {
    this.max = max;
    const s: number[] = [], idx: number[] = [];
    for (let i = 0; i <= ARC_SEG; i++) s.push(i / ARC_SEG, -1, i / ARC_SEG, 1);
    for (let i = 0; i < ARC_SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    this.geo = new InstancedBufferGeometry();
    this.geo.setAttribute('position', new Float32BufferAttribute(new Float32Array((ARC_SEG + 1) * 2 * 3), 3));
    this.geo.setAttribute('aS', new Float32BufferAttribute(s, 2));
    this.geo.setIndex(idx);
    this.aA = new InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.aB = new InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.aA.setUsage(DynamicDrawUsage);
    this.aB.setUsage(DynamicDrawUsage);
    this.geo.setAttribute('aA', this.aA);
    this.geo.setAttribute('aB', this.aB);
    this.geo.instanceCount = 0;
    this.mesh = new Mesh(this.geo, new ShaderMaterial({ vertexShader: ARC_VERT, fragmentShader: ARC_FRAG, uniforms: { uTime: this.timeU }, side: DoubleSide, ...PREMUL }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 26;
    this.mesh.name = 'vfx-thread-arcs';
  }

  /** Arc list as flat arrays: a/b = 3 floats each per arc, strength 0..1. */
  set(n: number, a: Float32Array, b: Float32Array, strength: Float32Array): void {
    const A = this.aA.array as Float32Array, Bv = this.aB.array as Float32Array;
    const c = Math.min(n, this.max);
    for (let i = 0; i < c; i++) {
      A[i * 4] = a[i * 3]; A[i * 4 + 1] = a[i * 3 + 1]; A[i * 4 + 2] = a[i * 3 + 2]; A[i * 4 + 3] = i;
      Bv[i * 4] = b[i * 3]; Bv[i * 4 + 1] = b[i * 3 + 1]; Bv[i * 4 + 2] = b[i * 3 + 2]; Bv[i * 4 + 3] = strength[i];
    }
    this.geo.instanceCount = c;
    if (c > 0) { this.aA.needsUpdate = true; this.aB.needsUpdate = true; }
    this.mesh.visible = c > 0;
  }

  update(time: number): void { this.timeU.value = time % 1000; }
  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.geo.dispose(); (this.mesh.material as ShaderMaterial).dispose(); }
}

