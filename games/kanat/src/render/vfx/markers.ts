// World markers: thermal columns (heat shimmer + rising dust motes), Balloon Thread dashed light arcs, landing
// target rings (2/5/10 m) glowing on the ground, parachute landing-zone marker. All shader-animated, few draws.
import {
  InstancedBufferGeometry, InstancedBufferAttribute, Float32BufferAttribute, BufferGeometry, Mesh, ShaderMaterial,
  CustomBlending, OneFactor, OneMinusSrcAlphaFactor, DynamicDrawUsage, DoubleSide, Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { RouteThermal } from '../../sim/types.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import { GLSL_NOISE } from '../props/glsl.ts';

const PREMUL = { transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor } as const;
const TAIL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

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
  float fil = smoothstep(0.55, 0.9, w);
  float edge = pow(1.0 - vFacing, 1.5);
  float vert = smoothstep(0.0, 25.0, y) * (1.0 - smoothstep(0.65, 1.0, y / max(1.0, y + 80.0) * 1.6));
  float a = fil * (0.04 + 0.1 * edge) * vert * vI;
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

// ------------------------------------------------------------------------------------------------ landing target + zone

const LAND_VERT = /* glsl */ `
attribute vec3 aL; // local x, local z (m from centre), kind (0 target disc, 1 zone ring band, 2 zone curtain)
varying vec3 vL;
varying float vH;
void main() {
  vL = aL;
  vH = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const LAND_FRAG = /* glsl */ `
${GLSL_NOISE}
uniform float uTime;
uniform float uShow;
uniform float uZoneR;
uniform float uZoneShow;
uniform float uCurtainBase;
varying vec3 vL;
varying float vH;
void main() {
  vec3 col; float a;
  if (vL.z < 0.5) {
    float r = length(vL.xy);
    float pulse = 0.85 + 0.15 * sin(uTime * 2.2);
    float ring = 0.0;
    ring += exp(-pow((r - 2.0) / 0.12, 2.0)) * 1.0;
    ring += exp(-pow((r - 5.0) / 0.14, 2.0)) * 0.8;
    ring += exp(-pow((r - 10.0) / 0.16, 2.0)) * 0.65;
    float centre = exp(-r * r / 0.18) * 1.2;
    float fill = (1.0 - smoothstep(9.0, 10.5, r)) * 0.06;
    float tick = step(0.92, abs(cos(atan(vL.y, vL.x) * 2.0))) * exp(-pow((r - 7.5) / 2.6, 2.0)) * 0.25;
    a = (ring + centre + fill + tick) * pulse * uShow;
    col = mix(vec3(1.0, 0.72, 0.35), vec3(1.0, 0.95, 0.85), centre);
  } else if (vL.z < 1.5) {
    float r = length(vL.xy);
    float band = exp(-pow((r - uZoneR) / 1.6, 2.0));
    float dash = smoothstep(0.3, 0.5, fract(atan(vL.y, vL.x) * uZoneR / 6.0 - uTime * 0.05));
    a = band * (0.35 + 0.4 * dash) * uZoneShow;
    col = vec3(1.0, 0.8, 0.45);
  } else {
    float h = vH - uCurtainBase;
    float f = exp(-max(h, 0.0) / 3.0) * (1.0 - smoothstep(0.0, 10.0, h));
    float n = kNoise2(vec2(atan(vL.y, vL.x) * 30.0, h * 0.2 - uTime * 0.3));
    a = f * (0.06 + 0.06 * n) * uZoneShow;
    col = vec3(1.0, 0.85, 0.55);
  }
  gl_FragColor = vec4(col * a * 1.5, 0.0);
  ${TAIL}
}
`;

export class LandingMarkers {
  readonly mesh: Mesh;
  private readonly mat: ShaderMaterial;
  private readonly timeU = { value: 0 };
  private center = new Vector3();
  private zoneR = 250;
  private has = false;

  constructor() {
    this.mat = new ShaderMaterial({
      vertexShader: LAND_VERT, fragmentShader: LAND_FRAG,
      uniforms: { uTime: this.timeU, uShow: { value: 0 }, uZoneR: { value: 250 }, uZoneShow: { value: 0 }, uCurtainBase: { value: 0 } },
      side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6, ...PREMUL,
    });
    this.mesh = new Mesh(new BufferGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 21;
    this.mesh.name = 'vfx-landing';
    this.mesh.visible = false;
  }

  /** Build the draped target (12 m disc) and zone ring/curtain on the terrain. */
  set(center: [number, number, number], zoneRadius: number, sampler: TerrainSampler | null): void {
    this.center.set(center[0], center[1], center[2]);
    this.zoneR = zoneRadius;
    this.mat.uniforms.uZoneR.value = zoneRadius;
    const h = (x: number, z: number): number => (sampler ? sampler.height(x, z) : center[1]);
    const pos: number[] = [], l: number[] = [], idx: number[] = [];
    // target disc grid (24×24 over ±12 m)
    const N = 24, E = 12;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const lx = (i / N) * 2 * E - E, lz = (j / N) * 2 * E - E;
      const x = center[0] + lx, z = center[2] + lz;
      pos.push(x, h(x, z) + 0.06, z); l.push(lx, lz, 0);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i; idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2); }
    // zone ring band (draped) + light curtain
    const S = 160;
    let base = pos.length / 3;
    for (let i = 0; i <= S; i++) {
      const an = (i / S) * Math.PI * 2;
      for (const rr of [zoneRadius - 5, zoneRadius + 5]) {
        const lx = Math.cos(an) * rr, lz = Math.sin(an) * rr;
        const x = center[0] + lx, z = center[2] + lz;
        pos.push(x, h(x, z) + 0.15, z); l.push(lx, lz, 1);
      }
    }
    for (let i = 0; i < S; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    base = pos.length / 3;
    let minY = Infinity;
    for (let i = 0; i <= S; i++) {
      const an = (i / S) * Math.PI * 2;
      const lx = Math.cos(an) * zoneRadius, lz = Math.sin(an) * zoneRadius;
      const x = center[0] + lx, z = center[2] + lz;
      const y = h(x, z);
      minY = Math.min(minY, y);
      pos.push(x, y, z, x, y + 9, z);
      l.push(lx, lz, 2, lx, lz, 2);
    }
    for (let i = 0; i < S; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    this.mat.uniforms.uCurtainBase.value = isFinite(minY) ? minY : center[1];
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('aL', new Float32BufferAttribute(l, 3));
    g.setIndex(idx);
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
    this.has = true;
  }

  update(time: number, pilot: Vector3 | null, inZone: boolean): void {
    this.timeU.value = time % 1000;
    if (!this.has) { this.mesh.visible = false; return; }
    const d = pilot ? Math.hypot(pilot.x - this.center.x, pilot.z - this.center.z) : 0;
    const show = inZone ? 1 : 1 - Math.min(1, Math.max(0, (d - this.zoneR * 1.5) / 600));
    this.mat.uniforms.uShow.value = Math.max(0.35, show) * (inZone ? 1.25 : 1);
    this.mat.uniforms.uZoneShow.value = show * (inZone ? 0.6 : 1);
    this.mesh.visible = show > 0.01 || inZone;
  }

  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.mesh.geometry.dispose(); this.mat.dispose(); }
}
