// Thermal columns: heat shimmer filaments + rising dust motes (shader-animated, 2 draws).
import {
  InstancedBufferGeometry, InstancedBufferAttribute, Float32BufferAttribute, BufferGeometry, Mesh, ShaderMaterial,
  CustomBlending, OneFactor, OneMinusSrcAlphaFactor, DynamicDrawUsage, DoubleSide, Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { RouteThermal } from '../../../sim/types.ts';
import type { TerrainSampler } from '../../../sim/terrain/types.ts';
import { GLSL_NOISE } from '../../props/glsl.ts';
import { PREMUL, TAIL } from './common.ts';
// ------------------------------------------------------------------------------------------------ thermals

const TH_VERT = /* glsl */ `
attribute vec4 aT0; // x, groundY, z, radius
attribute vec4 aT1; // top, seed, intensity, 0
varying vec2 vC;
varying float vI;
varying float vSeed;
varying float vFacing;
void main() {
  float h = aT1.x - aT0.y;
  vec3 p = vec3(aT0.x + position.x * aT0.w, aT0.y + position.y * h, aT0.z + position.z * aT0.w);
  vC = vec2(atan(position.z, position.x), position.y * h);
  vI = aT1.z; vSeed = aT1.y;
  vec3 n = normalize(vec3(position.x, 0.0, position.z));
  vFacing = abs(dot(n, normalize(cameraPosition - p)));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const TH_FRAG = /* glsl */ `
${GLSL_NOISE}
uniform float uTime;
varying vec2 vC;
varying float vI;
varying float vSeed;
varying float vFacing;
void main() {
  // rising, wavering vertical filaments; strongest at the silhouette (looks like refraction shimmer)
  float y = vC.y;
  float w = kNoise2(vec2(vC.x * 3.0 + sin(y * 0.05 + uTime * 0.7) * 0.6, y * 0.04 - uTime * 0.6 + vSeed));
  float fil = smoothstep(0.72, 0.95, w);
  float edge = pow(1.0 - vFacing, 2.0);
  float vert = smoothstep(0.0, 25.0, y) * exp(-y * 0.006);
  float a = fil * (0.008 + 0.03 * edge) * vert * vI;
  gl_FragColor = vec4(vec3(1.0, 0.93, 0.8) * a, a * 0.25);
  ${TAIL}
}
`;

const MOTE_VERT = /* glsl */ `
attribute vec4 aM0; // x, groundY, z, radius
attribute vec4 aM1; // top, seed, intensity, size
uniform float uTime;
varying vec2 vUv;
varying float vA;
void main() {
  float h = aM1.x - aM0.y;
  float s = aM1.y;
  float ph = fract(uTime * (0.025 + 0.02 * fract(s * 7.3)) + s);
  float ang = s * 40.0 + ph * 6.0;
  float rr = aM0.w * (0.25 + 0.7 * fract(s * 13.1));
  vec3 c = vec3(aM0.x + cos(ang) * rr, aM0.y + 3.0 + ph * h, aM0.z + sin(ang) * rr);
  vec3 toCam = normalize(cameraPosition - c);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + 1e-5);
  vec3 up = cross(toCam, right);
  float d = distance(c, cameraPosition);
  float size = aM1.w * (1.0 + d * 0.004);
  vec3 p = c + (right * position.x + up * position.y) * size;
  vUv = uv;
  vA = sin(ph * 3.14159) * aM1.z * smoothstep(400.0, 120.0, d);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const MOTE_FRAG = /* glsl */ `
varying vec2 vUv;
varying float vA;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float a = smoothstep(1.0, 0.0, r) * vA * 0.6;
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * a * 1.4, 0.0);
  ${TAIL}
}
`;

export class Thermals {
  readonly column: Mesh;
  readonly motes: Mesh;
  private readonly timeU = { value: 0 };
  private readonly colGeo: InstancedBufferGeometry;
  private readonly moteGeo: InstancedBufferGeometry;
  private readonly intensity: InstancedBufferAttribute;
  private readonly moteInt: InstancedBufferAttribute;
  private perThermal = 40;
  private n = 0;

  constructor() {
    const pos: number[] = [], idx: number[] = [];
    const S = 24, R = 8;
    for (let j = 0; j <= R; j++) for (let i = 0; i <= S; i++) { const a = (i / S) * Math.PI * 2; pos.push(Math.cos(a), j / R, Math.sin(a)); }
    for (let j = 0; j < R; j++) for (let i = 0; i < S; i++) { const a = j * (S + 1) + i; idx.push(a, a + S + 1, a + 1, a + 1, a + S + 1, a + S + 2); }
    this.colGeo = new InstancedBufferGeometry();
    this.colGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    this.colGeo.setIndex(idx);
    this.colGeo.setAttribute('aT0', new InstancedBufferAttribute(new Float32Array(16 * 4), 4));
    this.intensity = new InstancedBufferAttribute(new Float32Array(16 * 4), 4);
    this.intensity.setUsage(DynamicDrawUsage);
    this.colGeo.setAttribute('aT1', this.intensity);
    this.colGeo.instanceCount = 0;
    this.column = new Mesh(this.colGeo, new ShaderMaterial({ vertexShader: TH_VERT, fragmentShader: TH_FRAG, uniforms: { uTime: this.timeU }, side: DoubleSide, ...PREMUL }));
    this.column.frustumCulled = false;
    this.column.renderOrder = 22;
    this.moteGeo = new InstancedBufferGeometry();
    this.moteGeo.setAttribute('position', new Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    this.moteGeo.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    this.moteGeo.setIndex([0, 1, 2, 0, 2, 3]);
    this.moteGeo.setAttribute('aM0', new InstancedBufferAttribute(new Float32Array(16 * 80 * 4), 4));
    this.moteInt = new InstancedBufferAttribute(new Float32Array(16 * 80 * 4), 4);
    this.moteInt.setUsage(DynamicDrawUsage);
    this.moteGeo.setAttribute('aM1', this.moteInt);
    this.moteGeo.instanceCount = 0;
    this.motes = new Mesh(this.moteGeo, new ShaderMaterial({ vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, uniforms: { uTime: this.timeU }, ...PREMUL }));
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 23;
  }

  setThermals(list: RouteThermal[], sampler: TerrainSampler | null, motesPerThermal: number): void {
    this.n = Math.min(16, list.length);
    this.perThermal = Math.min(80, motesPerThermal);
    const t0 = this.colGeo.attributes.aT0.array as Float32Array;
    const t1 = this.intensity.array as Float32Array;
    const m0 = this.moteGeo.attributes.aM0.array as Float32Array;
    const m1 = this.moteInt.array as Float32Array;
    let mi = 0;
    for (let i = 0; i < this.n; i++) {
      const th = list[i];
      const gy = sampler ? sampler.height(th.pos[0], th.pos[1]) : 0;
      t0.set([th.pos[0], gy, th.pos[1], th.radius], i * 4);
      t1.set([th.top, i * 0.37 + 0.1, 1, 0], i * 4);
      for (let k = 0; k < this.perThermal; k++) {
        m0.set([th.pos[0], gy, th.pos[1], th.radius], mi * 4);
        m1.set([th.top, (k * 0.6180339 + i * 0.13) % 1, 1, 0.35 + 0.25 * ((k * 7) % 5) / 5], mi * 4);
        mi++;
      }
    }
    this.colGeo.attributes.aT0.needsUpdate = true;
    this.intensity.needsUpdate = true;
    this.moteGeo.attributes.aM0.needsUpdate = true;
    this.moteInt.needsUpdate = true;
    this.colGeo.instanceCount = this.n;
    this.moteGeo.instanceCount = mi;
  }

  /** Brighten the thermal the pilot is inside (index or −1). */
  setActive(index: number): void {
    const t1 = this.intensity.array as Float32Array;
    const m1 = this.moteInt.array as Float32Array;
    for (let i = 0; i < this.n; i++) {
      const v = i === index ? 1.6 : 1;
      if (t1[i * 4 + 2] === v) continue;
      t1[i * 4 + 2] = v;
      for (let k = 0; k < this.perThermal; k++) m1[(i * this.perThermal + k) * 4 + 2] = v;
      this.intensity.needsUpdate = true;
      this.moteInt.needsUpdate = true;
    }
  }

  update(time: number): void {
    this.timeU.value = time % 1000;
    this.column.visible = this.motes.visible = this.n > 0;
  }

  addTo(o: Object3D): void { o.add(this.column, this.motes); }
  removeFrom(o: Object3D): void { o.remove(this.column, this.motes); }
  dispose(): void { this.colGeo.dispose(); this.moteGeo.dispose(); (this.column.material as ShaderMaterial).dispose(); (this.motes.material as ShaderMaterial).dispose(); }
}

