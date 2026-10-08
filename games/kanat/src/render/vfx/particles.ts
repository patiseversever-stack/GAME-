// Pooled GPU particles: a ring buffer of instanced quads; the CPU only writes spawn data (position, velocity,
// spawn time, life, size, kind, colour) on emit, the vertex shader integrates drag + gravity analytically.
// One draw call for all kinds; premultiplied alpha (additive kinds write alpha 0). Tier caps 300/800/1500/3000.
import {
  InstancedBufferGeometry, InstancedBufferAttribute, Float32BufferAttribute, Mesh, ShaderMaterial, CustomBlending,
  OneFactor, OneMinusSrcAlphaFactor, DynamicDrawUsage, Color,
} from 'three';
import type { Object3D } from 'three';
import { GLSL_NOISE } from '../props/glsl.ts';

/** Particle kinds (shader switch). */
export const PK = { dust: 0, chip: 1, snow: 2, spray: 3, leaf: 4, streak: 5, vumf: 6, mist: 7, mote: 8, spark: 9 } as const;

const VERT = /* glsl */ `
attribute vec4 aA; // pos.xyz, spawn time
attribute vec4 aB; // vel.xyz, life
attribute vec4 aC; // size0, size1, kind, seed
attribute vec4 aD; // rgb, alpha
uniform float uTime;
varying vec2 vUv;
varying float vKind;
varying float vT;
varying vec4 vCol;
varying float vSeed;
varying float vNear;
void main() {
  float age = uTime - aA.w;
  float life = max(aB.w, 1e-3);
  float t = age / life;
  vUv = uv; vKind = aC.z; vT = t; vCol = aD; vSeed = aC.w;
  if (age < 0.0 || t >= 1.0) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
  int kind = int(aC.z + 0.5);
  float k = 0.5; vec3 G = vec3(0.0);
  if (kind == 0) { k = 2.4; G = vec3(0.0, 0.35, 0.0); }
  else if (kind == 1) { k = 0.35; G = vec3(0.0, -9.8, 0.0); }
  else if (kind == 2) { k = 1.9; G = vec3(0.0, -0.5, 0.0); }
  else if (kind == 3) { k = 0.9; G = vec3(0.0, -7.0, 0.0); }
  else if (kind == 4) { k = 1.5; G = vec3(0.0, -1.3, 0.0); }
  else if (kind == 5) { k = 1.4; }
  else if (kind == 6) { k = 2.8; G = vec3(0.0, 0.5, 0.0); }
  else if (kind == 7) { k = 1.2; G = vec3(0.0, 0.2, 0.0); }
  else if (kind == 8) { k = 0.2; G = vec3(0.0, 0.0, 0.0); }
  else { k = 2.0; G = vec3(0.0, -2.0, 0.0); }
  float e = (1.0 - exp(-k * age)) / k;
  vec3 gk = G / k;
  vec3 p = aA.xyz + gk * age + (aB.xyz - gk) * e;
  if (kind == 4) p.xz += vec2(sin(age * 5.0 + aC.w * 20.0), cos(age * 4.3 + aC.w * 13.0)) * 0.25 * min(age, 1.0);
  float size = mix(aC.x, aC.y, sqrt(t));
  vec3 toCam = cameraPosition - p;
  float dist = length(toCam);
  toCam /= max(dist, 1e-4);
  vec3 right, up;
  if (kind == 5) {
    vec3 vel = aB.xyz * exp(-k * age) + gk * (1.0 - exp(-k * age));
    vec3 d = normalize(vel + 1e-4);
    right = normalize(cross(d, toCam) + 1e-5);
    up = d * (2.5 + length(vel) * 0.25);
  } else {
    right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + vec3(1e-5, 0.0, 0.0));
    up = cross(toCam, right);
    float ang = aC.w * 6.2831 + age * (kind == 4 ? 4.0 : 0.4) * (aC.w - 0.5);
    float c = cos(ang), s = sin(ang);
    vec3 r2 = right * c + up * s;
    up = up * c - right * s;
    right = r2;
  }
  vNear = smoothstep(size * 0.6, size * 2.5 + 0.6, dist);
  vec3 wp = p + (right * position.x + up * position.y) * size;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_NOISE}
uniform vec3 uSun;
uniform vec3 uAmb;
varying vec2 vUv;
varying float vKind;
varying float vT;
varying vec4 vCol;
varying float vSeed;
varying float vNear;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  int kind = int(vKind + 0.5);
  float fade = smoothstep(0.0, 0.06, vT) * pow(1.0 - vT, 1.4) * vNear;
  vec4 o = vec4(0.0);
  if (kind == 0 || kind == 6 || kind == 7) {
    float n = kNoise2(p * 2.2 + vSeed * 31.0 + vT * 1.5) * 0.65 + kNoise2(p * 5.0 - vSeed * 7.0) * 0.35;
    float a = smoothstep(1.0, 0.15, r + (n - 0.5) * 0.55) * vCol.a * fade;
    float lit = 0.55 + 0.45 * smoothstep(0.2, 0.8, n + p.y * 0.3);
    vec3 col = vCol.rgb * (uAmb + uSun * lit);
    o = vec4(col * a, a);
  } else if (kind == 1) {
    float a = smoothstep(1.0, 0.6, r) * vCol.a * fade;
    o = vec4(vCol.rgb * (uAmb + uSun * 0.6) * a, a);
  } else if (kind == 2) {
    float n = kNoise2(p * 3.0 + vSeed * 17.0);
    float a = smoothstep(1.0, 0.1, r + (n - 0.5) * 0.4) * vCol.a * fade;
    vec3 col = vCol.rgb * (uAmb + uSun * 0.9);
    float glint = step(0.93, kNoise2(p * 9.0 + vSeed * 50.0 + vT * 3.0)) * smoothstep(0.8, 0.0, r);
    o = vec4(col * a + uSun * glint * 0.6 * fade, a);
  } else if (kind == 3) {
    float a = smoothstep(1.0, 0.0, r) * vCol.a * fade;
    vec3 col = vCol.rgb * (uAmb + uSun * 0.8);
    o = vec4(col * a, a * 0.8);
  } else if (kind == 4) {
    vec2 q = vec2(p.x * 1.9, p.y);
    float leaf = smoothstep(1.0, 0.8, length(q)) * step(abs(p.x), 0.6);
    float a = leaf * vCol.a * fade;
    vec3 col = vCol.rgb * (uAmb + uSun * 0.8) * (0.8 + 0.4 * step(0.0, p.x));
    o = vec4(col * a, a);
  } else if (kind == 5 || kind == 9) {
    float a = smoothstep(1.0, 0.0, abs(p.x)) * smoothstep(1.0, 0.3, abs(p.y)) * vCol.a * fade;
    o = vec4(vCol.rgb * a * 2.0, 0.0);
  } else {
    float a = smoothstep(1.0, 0.0, r) * vCol.a * fade;
    o = vec4(vCol.rgb * (uAmb + uSun) * a, a * 0.5);
  }
  gl_FragColor = o;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class ParticlePool {
  readonly mesh: Mesh;
  readonly cap: number;
  private head = 0;
  private readonly a: Float32Array;
  private readonly b: Float32Array;
  private readonly c: Float32Array;
  private readonly d: Float32Array;
  private readonly attrs: InstancedBufferAttribute[];
  private readonly geo: InstancedBufferGeometry;
  private readonly mat: ShaderMaterial;
  private dirtyFrom = -1;
  private dirtyTo = -1;
  private wrapped = false;
  time = 0;
  emittedThisFrame = 0;
  liveEstimate = 0;
  private readonly lifeEnd: Float32Array;

  constructor(cap: number) {
    this.cap = cap;
    this.a = new Float32Array(cap * 4).fill(0);
    this.b = new Float32Array(cap * 4).fill(0);
    this.c = new Float32Array(cap * 4).fill(0);
    this.d = new Float32Array(cap * 4).fill(0);
    this.lifeEnd = new Float32Array(cap);
    for (let i = 0; i < cap; i++) { this.a[i * 4 + 3] = -1e6; this.b[i * 4 + 3] = 1; }
    this.geo = new InstancedBufferGeometry();
    this.geo.setAttribute('position', new Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    this.geo.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.attrs = [this.a, this.b, this.c, this.d].map((arr, i) => {
      const at = new InstancedBufferAttribute(arr, 4);
      at.setUsage(DynamicDrawUsage);
      this.geo.setAttribute(['aA', 'aB', 'aC', 'aD'][i], at);
      return at;
    });
    this.geo.instanceCount = cap;
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uSun: { value: new Color(1.0, 0.85, 0.7) }, uAmb: { value: new Color(0.35, 0.36, 0.42) } },
      transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
    });
    this.mesh = new Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 40;
    this.mesh.name = 'vfx-particles';
  }

  setLighting(sun: Color, amb: Color): void {
    (this.mat.uniforms.uSun.value as Color).copy(sun);
    (this.mat.uniforms.uAmb.value as Color).copy(amb);
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, s0: number, s1: number, kind: number, r: number, g: number, b: number, alpha: number, seed: number): void {
    const i = this.head;
    const o = i * 4;
    this.a[o] = x; this.a[o + 1] = y; this.a[o + 2] = z; this.a[o + 3] = this.time;
    this.b[o] = vx; this.b[o + 1] = vy; this.b[o + 2] = vz; this.b[o + 3] = life;
    this.c[o] = s0; this.c[o + 1] = s1; this.c[o + 2] = kind; this.c[o + 3] = seed;
    this.d[o] = r; this.d[o + 1] = g; this.d[o + 2] = b; this.d[o + 3] = alpha;
    this.lifeEnd[i] = this.time + life;
    if (this.dirtyFrom < 0) { this.dirtyFrom = i; this.dirtyTo = i; }
    else if (i < this.dirtyFrom) this.wrapped = true;
    else this.dirtyTo = i;
    if (i === this.cap - 1 && this.dirtyFrom > 0) this.wrapped = true;
    this.head = (i + 1) % this.cap;
    this.emittedThisFrame++;
  }

  update(time: number): void {
    this.time = time;
    this.mat.uniforms.uTime.value = time;
    if (this.dirtyFrom >= 0) {
      for (const at of this.attrs) {
        at.clearUpdateRanges();
        if (this.wrapped) at.addUpdateRange(0, this.cap * 4);
        else at.addUpdateRange(this.dirtyFrom * 4, (this.dirtyTo - this.dirtyFrom + 1) * 4);
        at.needsUpdate = true;
      }
    }
    this.dirtyFrom = -1; this.dirtyTo = -1; this.wrapped = false;
    this.emittedThisFrame = 0;
  }

  /** Live particle count (O(cap); call sparsely, e.g. for the perf HUD). */
  live(): number {
    let n = 0;
    for (let i = 0; i < this.cap; i++) if (this.lifeEnd[i] > this.time) n++;
    return n;
  }

  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.geo.dispose(); this.mat.dispose(); }
}

