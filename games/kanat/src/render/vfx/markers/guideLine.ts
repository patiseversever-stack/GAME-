// "Rehber Hat" (§2.10 dynamic help): the 3-star bot's line drawn as a glowing, flowing dashed ribbon along
// route.line (Catmull-Rom resampled every ~4 m). Fades behind the pilot, near the camera and far away.
import { BufferGeometry, Float32BufferAttribute, Mesh, ShaderMaterial, DoubleSide, Vector3 } from 'three';
import type { Object3D } from 'three';
import { PREMUL, TAIL } from './common.ts';

const VERT = /* glsl */ `
attribute vec3 aDir;
attribute vec2 aS; // arc length (m), side (−1/1)
uniform float uPilotS;
varying float vS;
varying float vSide;
varying float vDist;
varying float vRel;
void main() {
  vec3 toCam = cameraPosition - position;
  float d = length(toCam);
  vec3 side = normalize(cross(aDir, toCam / max(d, 1e-3)) + 1e-5);
  float w = 0.22 + d * 0.0022;
  vec3 p = position + side * aS.y * w;
  vS = aS.x; vSide = aS.y; vDist = d; vRel = aS.x - uPilotS;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uShow;
varying float vS;
varying float vSide;
varying float vDist;
varying float vRel;
void main() {
  float edge = 1.0 - abs(vSide);
  float dash = smoothstep(0.0, 0.15, fract(vS / 7.0 - uTime * 0.9)) * (1.0 - smoothstep(0.55, 0.7, fract(vS / 7.0 - uTime * 0.9)));
  float ahead = smoothstep(-12.0, 15.0, vRel) * (1.0 - smoothstep(500.0, 800.0, vRel));
  float a = (0.35 + 0.65 * dash) * smoothstep(0.0, 0.7, edge) * ahead * smoothstep(4.0, 14.0, vDist) * uShow;
  gl_FragColor = vec4(vec3(1.0, 0.9, 0.62) * a * 1.6, 0.0);
  ${TAIL}
}
`;

export class GuideLine {
  readonly mesh: Mesh;
  private readonly mat: ShaderMaterial;
  private readonly timeU = { value: 0 };
  private px: Float32Array = new Float32Array(0);
  private pz: Float32Array = new Float32Array(0);
  private py: Float32Array = new Float32Array(0);
  private ps: Float32Array = new Float32Array(0);
  private last = 0;
  enabled = false;

  constructor() {
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uTime: this.timeU, uShow: { value: 0 }, uPilotS: { value: 0 } },
      side: DoubleSide, ...PREMUL,
    });
    this.mesh = new Mesh(new BufferGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 27;
    this.mesh.visible = false;
    this.mesh.name = 'vfx-guide-line';
  }

  setLine(line: readonly (readonly [number, number, number])[]): void {
    const pts: Vector3[] = [];
    if (line.length < 2) { this.mesh.visible = false; return; }
    const P = line.map((p) => new Vector3(p[0], p[1], p[2]));
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const n = Math.max(1, Math.ceil(p1.distanceTo(p2) / 4));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        pts.push(new Vector3(
          0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
          0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
        ));
      }
    }
    pts.push(P[P.length - 1].clone());
    const n = pts.length;
    const pos: number[] = [], dir: number[] = [], s: number[] = [], idx: number[] = [];
    this.px = new Float32Array(n); this.py = new Float32Array(n); this.pz = new Float32Array(n); this.ps = new Float32Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) acc += pts[i].distanceTo(pts[i - 1]);
      const d = (i < n - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      for (const side of [-1, 1]) { pos.push(pts[i].x, pts[i].y, pts[i].z); dir.push(d.x, d.y, d.z); s.push(acc, side); }
      this.px[i] = pts[i].x; this.py[i] = pts[i].y; this.pz[i] = pts[i].z; this.ps[i] = acc;
      if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('aDir', new Float32BufferAttribute(dir, 3));
    g.setAttribute('aS', new Float32BufferAttribute(s, 2));
    g.setIndex(idx);
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
    this.last = 0;
  }

  update(time: number, pilot: Vector3 | null): void {
    this.timeU.value = time % 1000;
    const show = this.enabled && this.px.length > 1 ? 1 : 0;
    const u = this.mat.uniforms.uShow;
    u.value += (show - (u.value as number)) * 0.08;
    this.mesh.visible = (u.value as number) > 0.01;
    if (!this.mesh.visible || !pilot) return;
    // nearest sample around the last index (monotone along the route)
    let best = this.last, bd = Infinity;
    const lo = Math.max(0, this.last - 40), hi = Math.min(this.px.length - 1, this.last + 120);
    for (let i = lo; i <= hi; i++) {
      const dx = this.px[i] - pilot.x, dy = this.py[i] - pilot.y, dz = this.pz[i] - pilot.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    this.last = best;
    this.mat.uniforms.uPilotS.value = this.ps[best];
  }

  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.mesh.geometry.dispose(); this.mat.dispose(); }
}
