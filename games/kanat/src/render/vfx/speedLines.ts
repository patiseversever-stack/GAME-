// Screen-space speed lines (instanced quads in NDC): count per tier 60/120/200/300, alpha ∝ speed above 170 km/h.
// Lines stream outward from the screen centre but never enter the central 40 % (HUD/readability rule).
import { InstancedBufferGeometry, InstancedBufferAttribute, Float32BufferAttribute, Mesh, ShaderMaterial, AdditiveBlending, Vector2 } from 'three';
import type { Object3D } from 'three';

const VERT = /* glsl */ `
attribute vec4 aSeed; // angle, phase, speed, length
uniform float uTime;
uniform float uIntensity;
uniform vec2 uAspect; // (aspect, 1/aspect)
uniform vec2 uPx;     // 1/width, 1/height (NDC units per pixel ×2 applied below)
varying float vA;
varying float vU;
void main() {
  float ang = aSeed.x * 6.2831853;
  float life = fract(uTime * (0.9 + aSeed.z * 1.6) + aSeed.y);
  vec2 dir = vec2(cos(ang), sin(ang));
  // radial position in "aspect-corrected" units; starts outside the central ellipse
  float r0 = 0.6 + 0.2 * aSeed.y;
  float r = r0 + life * 0.75;
  float len = (0.08 + 0.22 * aSeed.w) * (0.6 + uIntensity);
  float along = position.y > 0.0 ? r + len : r;
  vec2 p = dir * along;
  vec2 side = vec2(-dir.y, dir.x);
  float wPx = 2.0 + 2.2 * aSeed.w;
  // width in pixels → NDC per axis (positions live directly in NDC: an ellipse that matches the screen)
  p += side * position.x * wPx * 2.0 * uPx;
  vA = uIntensity * smoothstep(0.0, 0.15, life) * (1.0 - life) * (0.5 + 0.5 * aSeed.w);
  vU = position.y;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
varying float vA;
varying float vU;
void main() {
  float a = vA * (0.25 + 0.75 * vU);
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * a * 0.7, 0.0);
}
`;

export class SpeedLines {
  readonly mesh: Mesh;
  private readonly geo: InstancedBufferGeometry;
  private readonly mat: ShaderMaterial;
  private readonly max: number;

  constructor(max = 300) {
    this.max = max;
    this.geo = new InstancedBufferGeometry();
    this.geo.setAttribute('position', new Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    const seeds = new Float32Array(max * 4);
    let s = 12345;
    const rnd = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < max; i++) { seeds[i * 4] = rnd(); seeds[i * 4 + 1] = rnd(); seeds[i * 4 + 2] = rnd(); seeds[i * 4 + 3] = rnd(); }
    this.geo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4));
    this.geo.instanceCount = max;
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uAspect: { value: new Vector2(1, 1) }, uPx: { value: new Vector2(1 / 390, 1 / 844) } },
      transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
    });
    this.mesh = new Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;
    this.mesh.visible = false;
    this.mesh.name = 'vfx-speedlines';
  }

  setCount(n: number): void { this.geo.instanceCount = Math.max(0, Math.min(this.max, n)); }

  /** speed in m/s; lines appear above 170 km/h (47.2 m/s) and saturate at ~230 km/h. */
  update(time: number, speed: number, width: number, height: number, reduce = 1): void {
    const k = Math.min(1, Math.max(0, (speed - 47.2) / (64 - 47.2))) * reduce;
    this.mat.uniforms.uTime.value = time % 1000;
    this.mat.uniforms.uIntensity.value = k;
    (this.mat.uniforms.uAspect.value as Vector2).set(width / height, height / width);
    (this.mat.uniforms.uPx.value as Vector2).set(1 / width, 1 / height);
    this.mesh.visible = k > 0.01;
  }

  get intensity(): number { return this.mat.uniforms.uIntensity.value as number; }

  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.geo.dispose(); this.mat.dispose(); }
}
