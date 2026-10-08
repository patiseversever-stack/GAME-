// Route gates: glowing rings sized from RouteGate.radius, next-gate highlight (slow ≤1 Hz breathing), pass → the
// ring expands and dissolves (the VFX system emits light streaks), miss → fades out. One instanced draw for all gates.
import { InstancedBufferGeometry, InstancedBufferAttribute, Float32BufferAttribute, Mesh, ShaderMaterial, CustomBlending, OneFactor, OneMinusSrcAlphaFactor, DynamicDrawUsage, DoubleSide } from 'three';
import type { Object3D } from 'three';
import type { RouteGate } from '../../sim/types.ts';
import { GLSL_NOISE } from '../props/glsl.ts';

const SEG = 72, TUBE = 6;

const VERT = /* glsl */ `
attribute vec3 aRing; // angle, tube angle / radial offset, part (0 tube, 1 halo)
attribute vec4 aPos;  // centre, radius
attribute vec4 aNrm;  // normal, final(1)
attribute vec4 aSt;   // highlight 0..1, pass time, miss time, index
uniform float uTime;
varying float vPart;
varying float vOff;
varying float vA;
varying vec4 vSt;
varying float vFinal;
varying float vDist;
void main() {
  vec3 N = normalize(aNrm.xyz);
  vec3 U = normalize(abs(N.y) < 0.95 ? cross(vec3(0.0, 1.0, 0.0), N) : cross(vec3(1.0, 0.0, 0.0), N));
  vec3 V = cross(N, U);
  float R = aPos.w;
  float hl = aSt.x;
  float pass = aSt.y > 0.0 ? clamp((uTime - aSt.y) / 0.7, 0.0, 1.0) : 0.0;
  float miss = aSt.z > 0.0 ? clamp((uTime - aSt.z) / 0.8, 0.0, 1.0) : 0.0;
  R *= 1.0 + 0.3 * pass;
  vec3 radial = cos(aRing.x) * U + sin(aRing.x) * V;
  vec3 p;
  if (aRing.z < 0.5) {
    float r = 0.16 + 0.08 * hl;
    p = aPos.xyz + radial * (R + cos(aRing.y) * r) + N * sin(aRing.y) * r;
  } else {
    float w = 0.8 + 0.7 * hl;
    p = aPos.xyz + radial * (R + aRing.y * w);
  }
  vPart = aRing.z; vOff = aRing.y; vSt = vec4(hl, pass, miss, aRing.x); vFinal = aNrm.w;
  vDist = distance(p, cameraPosition);
  vA = (1.0 - miss) * (1.0 - smoothstep(0.55, 1.0, pass)) * smoothstep(2.0, 7.0, vDist) * (1.0 - smoothstep(1200.0, 2200.0, vDist));
  if (vA <= 0.0) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_NOISE}
uniform float uTime;
uniform vec3 uCol;
uniform vec3 uColNext;
uniform vec3 uColFinal;
varying float vPart;
varying float vOff;
varying float vA;
varying vec4 vSt;
varying float vFinal;
varying float vDist;
void main() {
  float hl = vSt.x, pass = vSt.y;
  vec3 col = mix(uCol, uColNext, hl);
  if (vFinal > 0.5) col = mix(col, uColFinal, 0.7);
  // slow breathing on the next gate (0.8 Hz, smooth — never flashes)
  float breathe = 1.0 + hl * 0.25 * sin(uTime * 5.03);
  // dissolve: noise threshold eats the ring as it expands
  float n = kNoise2(vec2(vSt.w * 6.0, uTime * 0.5));
  if (pass > 0.0 && n < pass * 1.15) discard;
  float a;
  if (vPart < 0.5) {
    a = (0.85 + 0.15 * kNoise2(vec2(vSt.w * 9.0 - uTime * 1.5, 0.0))) * vA;
    gl_FragColor = vec4(col * a * (1.6 + hl * 1.4) * breathe, 0.0);
  } else {
    float h = exp(-vOff * vOff * 5.0);
    a = h * vA * (0.18 + 0.22 * hl);
    gl_FragColor = vec4(col * a * breathe, 0.0);
  }
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class GateRings {
  readonly mesh: Mesh;
  private readonly geo: InstancedBufferGeometry;
  private readonly mat: ShaderMaterial;
  private readonly pos: InstancedBufferAttribute;
  private readonly nrm: InstancedBufferAttribute;
  private readonly st: InstancedBufferAttribute;
  private gates: RouteGate[] = [];
  private readonly timeU = { value: 0 };
  private next = -1;

  constructor(maxGates = 32) {
    const ring: number[] = [], idx: number[] = [];
    for (let i = 0; i <= SEG; i++) for (let j = 0; j <= TUBE; j++) ring.push((i / SEG) * Math.PI * 2, (j / TUBE) * Math.PI * 2, 0);
    for (let i = 0; i < SEG; i++) for (let j = 0; j < TUBE; j++) {
      const a = i * (TUBE + 1) + j, b = a + TUBE + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const base = ring.length / 3;
    for (let i = 0; i <= SEG; i++) ring.push((i / SEG) * Math.PI * 2, -1, 1, (i / SEG) * Math.PI * 2, 1, 1);
    for (let i = 0; i < SEG; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    this.geo = new InstancedBufferGeometry();
    this.geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(ring.length), 3));
    this.geo.setAttribute('aRing', new Float32BufferAttribute(ring, 3));
    this.geo.setIndex(idx);
    this.pos = new InstancedBufferAttribute(new Float32Array(maxGates * 4), 4);
    this.nrm = new InstancedBufferAttribute(new Float32Array(maxGates * 4), 4);
    this.st = new InstancedBufferAttribute(new Float32Array(maxGates * 4), 4);
    this.st.setUsage(DynamicDrawUsage);
    this.geo.setAttribute('aPos', this.pos);
    this.geo.setAttribute('aNrm', this.nrm);
    this.geo.setAttribute('aSt', this.st);
    this.geo.instanceCount = 0;
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uTime: this.timeU, uCol: { value: [1.0, 0.78, 0.48] }, uColNext: { value: [1.0, 0.92, 0.72] }, uColFinal: { value: [0.95, 0.55, 0.2] } },
      transparent: true, depthWrite: false, side: DoubleSide, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
    });
    this.mesh = new Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 25;
    this.mesh.name = 'vfx-gates';
  }

  setGates(gates: RouteGate[]): void {
    this.gates = gates.slice(0, this.pos.count);
    const p = this.pos.array as Float32Array, n = this.nrm.array as Float32Array, s = this.st.array as Float32Array;
    s.fill(0);
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i];
      p.set([g.pos[0], g.pos[1], g.pos[2], g.radius], i * 4);
      n.set([g.normal[0], g.normal[1], g.normal[2], g.kind === 'final' ? 1 : 0], i * 4);
    }
    this.pos.needsUpdate = true; this.nrm.needsUpdate = true; this.st.needsUpdate = true;
    this.geo.instanceCount = this.gates.length;
    this.next = -1;
  }

  get count(): number { return this.gates.length; }
  gate(i: number): RouteGate | undefined { return this.gates[i]; }

  setNext(i: number): void {
    if (i === this.next) return;
    const s = this.st.array as Float32Array;
    for (let k = 0; k < this.gates.length; k++) s[k * 4] = k === i ? 1 : 0;
    this.next = i;
    this.st.needsUpdate = true;
  }

  pass(i: number): void {
    if (i < 0 || i >= this.gates.length) return;
    (this.st.array as Float32Array)[i * 4 + 1] = this.timeU.value + 1e-3;
    this.st.needsUpdate = true;
  }

  miss(i: number): void {
    if (i < 0 || i >= this.gates.length) return;
    (this.st.array as Float32Array)[i * 4 + 2] = this.timeU.value + 1e-3;
    this.st.needsUpdate = true;
  }

  /** Restart (new attempt): every gate visible again. */
  reset(): void {
    const s = this.st.array as Float32Array;
    for (let k = 0; k < this.gates.length; k++) { s[k * 4 + 1] = 0; s[k * 4 + 2] = 0; }
    this.st.needsUpdate = true;
  }

  update(time: number): void {
    this.timeU.value = time;
    this.mesh.visible = this.gates.length > 0;
  }

  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.geo.dispose(); this.mat.dispose(); }
}
