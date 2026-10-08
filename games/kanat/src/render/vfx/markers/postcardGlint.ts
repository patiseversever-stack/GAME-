// Postcard points (§2.5 Mod 4): within 150 m a thin, elegant frame glint appears in the air (camera-facing
// rectangle outline with a slow light running around it, ≤ 0.5 Hz). One instanced draw for all postcards.
import { InstancedBufferGeometry, InstancedBufferAttribute, Float32BufferAttribute, Mesh, ShaderMaterial, DoubleSide, DynamicDrawUsage, Vector3 } from 'three';
import type { Object3D } from 'three';
import { PREMUL, TAIL } from './common.ts';

const VERT = /* glsl */ `
attribute vec4 aP; // pos, show 0..1
uniform float uSize;
varying vec2 vUv;
varying float vShow;
void main() {
  vec3 toCam = normalize(cameraPosition - aP.xyz);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + 1e-5);
  vec3 up = cross(toCam, right);
  vec3 p = aP.xyz + (right * position.x * 1.5 + up * position.y) * uSize;
  vUv = uv; vShow = aP.w;
  if (aP.w <= 0.0) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vShow;
void main() {
  vec2 q = abs(vUv * 2.0 - 1.0);
  float d = max(q.x, q.y);
  float line = smoothstep(0.955, 0.975, d) * (1.0 - smoothstep(0.985, 1.0, d));
  // perimeter parameter for the travelling glint
  vec2 c = vUv * 2.0 - 1.0;
  float per = atan(c.y, c.x * 1.5) / 6.2831853 + 0.5;
  float glint = pow(max(0.0, cos((per - uTime * 0.12) * 6.2831853)), 24.0);
  float corner = step(0.86, min(q.x, q.y)) * line * 0.6;
  float a = (line * 0.45 + glint * line * 1.2 + corner) * vShow;
  gl_FragColor = vec4(vec3(1.0, 0.93, 0.78) * a * 1.4, 0.0);
  ${TAIL}
}
`;

export interface PostcardPoint { id: string; pos: [number, number, number] }

export class PostcardGlints {
  readonly mesh: Mesh;
  private readonly geo: InstancedBufferGeometry;
  private readonly attr: InstancedBufferAttribute;
  private readonly timeU = { value: 0 };
  private points: PostcardPoint[] = [];
  private readonly collected = new Set<string>();
  revealRadius = 150;

  constructor(max = 8) {
    this.geo = new InstancedBufferGeometry();
    this.geo.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    this.geo.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.attr = new InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.attr.setUsage(DynamicDrawUsage);
    this.geo.setAttribute('aP', this.attr);
    this.geo.instanceCount = 0;
    this.mesh = new Mesh(this.geo, new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uTime: this.timeU, uSize: { value: 6 } }, side: DoubleSide, ...PREMUL }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 28;
    this.mesh.name = 'vfx-postcards';
  }

  set(points: PostcardPoint[]): void {
    this.points = points.slice(0, this.attr.count);
    const a = this.attr.array as Float32Array;
    for (let i = 0; i < this.points.length; i++) a.set([this.points[i].pos[0], this.points[i].pos[1], this.points[i].pos[2], 0], i * 4);
    this.geo.instanceCount = this.points.length;
    this.attr.needsUpdate = true;
  }

  collect(id: string): void { this.collected.add(id); }

  update(time: number, pilot: Vector3 | null): void {
    this.timeU.value = time % 1000;
    if (this.points.length === 0) { this.mesh.visible = false; return; }
    const a = this.attr.array as Float32Array;
    let any = false;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i].pos;
      const d = pilot ? Math.hypot(p[0] - pilot.x, p[1] - pilot.y, p[2] - pilot.z) : Infinity;
      let s = 1 - Math.min(1, Math.max(0, (d - this.revealRadius * 0.8) / (this.revealRadius * 0.2)));
      if (this.collected.has(this.points[i].id)) s = 0;
      const prev = a[i * 4 + 3];
      const v = prev + (s - prev) * 0.08;
      a[i * 4 + 3] = v;
      if (v > 0.005) any = true;
    }
    this.attr.needsUpdate = true;
    this.mesh.visible = any;
  }

  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.geo.dispose(); (this.mesh.material as ShaderMaterial).dispose(); }
}
