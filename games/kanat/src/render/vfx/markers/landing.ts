// Landing target rings (2/5/10 m) glowing on the ground + landing-zone ring and light curtain.
import {
  InstancedBufferGeometry, InstancedBufferAttribute, Float32BufferAttribute, BufferGeometry, Mesh, ShaderMaterial,
  CustomBlending, OneFactor, OneMinusSrcAlphaFactor, DynamicDrawUsage, DoubleSide, Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { RouteThermal } from '../../../sim/types.ts';
import type { TerrainSampler } from '../../../sim/terrain/types.ts';
import { GLSL_NOISE } from '../../props/glsl.ts';
import { PREMUL, TAIL } from './common.ts';
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
    a = band * (0.08 + 0.12 * dash) * uZoneShow;
    col = vec3(1.0, 0.8, 0.45);
  } else {
    float h = vH - uCurtainBase;
    float f = exp(-max(h, 0.0) / 3.0) * (1.0 - smoothstep(0.0, 10.0, h));
    float n = kNoise2(vec2(atan(vL.y, vL.x) * 30.0, h * 0.2 - uTime * 0.3));
    a = f * (0.025 + 0.03 * n) * uZoneShow;
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

// ------------------------------------------------------------------------------------------------ landing light column

const COL_VERT = /* glsl */ `
attribute vec2 aQ; // x across (−1..1), y up (0..1)
uniform vec3 uBase;
uniform float uHeight;
uniform float uWidth;
varying vec2 vQ;
varying float vDist;
void main() {
  vec3 c = uBase + vec3(0.0, aQ.y * uHeight, 0.0);
  vec3 toCam = cameraPosition - c;
  vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + 1e-5);
  float w = uWidth * (0.6 + 0.8 * aQ.y);
  vec3 p = c + right * aQ.x * w;
  vQ = aQ;
  vDist = length(cameraPosition.xz - uBase.xz);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const COL_FRAG = /* glsl */ `
${GLSL_NOISE}
uniform float uTime;
uniform float uShow;
varying vec2 vQ;
varying float vDist;
void main() {
  float core = exp(-vQ.x * vQ.x * 6.0);
  float vert = smoothstep(0.0, 0.03, vQ.y) * pow(1.0 - vQ.y, 1.6);
  float drift = 0.8 + 0.2 * kNoise2(vec2(vQ.x * 2.0, vQ.y * 6.0 - uTime * 0.25));
  // readable from ~2 km, softer up close (never blinds the flare)
  float near = mix(0.3, 1.0, smoothstep(60.0, 400.0, vDist));
  float far = 1.0 - smoothstep(2600.0, 4200.0, vDist);
  float a = core * vert * drift * near * far * uShow * 0.42;
  gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * a, 0.0);
  ${TAIL}
}
`;

/** Tall soft light column over the landing target (visible from ~2 km, §2.9 "hedef halkası"). */
export class LandingBeam {
  readonly mesh: Mesh;
  private readonly mat: ShaderMaterial;
  private readonly timeU = { value: 0 };

  constructor() {
    const q: number[] = [], idx: number[] = [];
    const R = 12;
    for (let j = 0; j <= R; j++) for (const x of [-1, 0, 1]) q.push(x, j / R);
    for (let j = 0; j < R; j++) for (let i = 0; i < 2; i++) { const a = j * 3 + i; idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3); }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(q.length / 2 * 3), 3));
    g.setAttribute('aQ', new Float32BufferAttribute(q, 2));
    g.setIndex(idx);
    this.mat = new ShaderMaterial({
      vertexShader: COL_VERT, fragmentShader: COL_FRAG,
      uniforms: { uBase: { value: new Vector3() }, uHeight: { value: 280 }, uWidth: { value: 6 }, uTime: this.timeU, uShow: { value: 0 } },
      side: DoubleSide, ...PREMUL,
    });
    this.mesh = new Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 24;
    this.mesh.visible = false;
    this.mesh.name = 'vfx-landing-beam';
  }

  set(base: [number, number, number], height = 280): void {
    (this.mat.uniforms.uBase.value as Vector3).set(base[0], base[1], base[2]);
    this.mat.uniforms.uHeight.value = height;
    this.mesh.visible = true;
  }

  update(time: number, show: number): void {
    this.timeU.value = time % 1000;
    this.mat.uniforms.uShow.value = show;
    this.mesh.visible = show > 0.01;
  }

  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.mesh.geometry.dispose(); this.mat.dispose(); }
}
