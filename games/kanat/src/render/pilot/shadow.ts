// Pilot shadow on ALL tiers (the main proximity cue, §2.3): the pilot silhouette is rendered from the sun into a
// small mask (128²) and projected as a decal onto a terrain-draped grid (heights from the TerrainSampler), with
// contact hardening (crisp near the ground, softer and lighter with height). Multiplicative blend → no lighting
// mismatch, no shadow maps needed on Low.
import {
  BufferAttribute,
  WebGLRenderTarget, OrthographicCamera, Mesh, BufferGeometry, Float32BufferAttribute, ShaderMaterial, Matrix4, Vector3,
  CustomBlending, ZeroFactor, SrcColorFactor, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, UnsignedByteType,
  MeshBasicMaterial, DoubleSide, DynamicDrawUsage, Color,
} from 'three';
import type { Object3D, WebGLRenderer, Material, Scene } from 'three';
import type { TerrainSampler } from '../../sim/terrain/types.ts';

const GRID = 22;

const VERT = /* glsl */ `
uniform mat4 uShadowMat;
varying vec3 vSP;
varying float vEdge;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec4 sp = uShadowMat * wp;
  vSP = sp.xyz;
  vEdge = uv.x;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uMask;
uniform float uStrength;
uniform float uBlur;
uniform vec3 uTint;
varying vec3 vSP;
varying float vEdge;
void main() {
  vec2 uv = vSP.xy * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  float m = textureLod(uMask, uv, uBlur).r;
  // 4-tap widen for a soft penumbra that grows with height (contact hardening)
  float o = exp2(uBlur) / 128.0;
  m = m * 0.4 + 0.15 * (textureLod(uMask, uv + vec2(o, 0.0), uBlur).r + textureLod(uMask, uv - vec2(o, 0.0), uBlur).r
      + textureLod(uMask, uv + vec2(0.0, o), uBlur).r + textureLod(uMask, uv - vec2(0.0, o), uBlur).r);
  float a = clamp(m * uStrength, 0.0, 1.0);
  gl_FragColor = vec4(mix(vec3(1.0), uTint, a), 1.0);
}
`;

export class PilotShadow {
  readonly mesh: Mesh;
  private readonly rt: WebGLRenderTarget;
  private readonly cam = new OrthographicCamera(-2, 2, 2, -2, 0.1, 60);
  private readonly mat: ShaderMaterial;
  private readonly maskMat = new MeshBasicMaterial({ color: 0xffffff, side: DoubleSide });
  private readonly pos: Float32Array;
  private readonly shadowMat = new Matrix4();
  private readonly dir = new Vector3(0.3, 0.9, 0.2).normalize();
  /** Minimum effective sun elevation (deg) so a 7° dawn sun still gives a readable proximity cue near the pilot. */
  minElevationDeg = 35;
  private sampler: TerrainSampler | null;
  private readonly hit = new Vector3();
  private readonly tmp = new Vector3();
  private readonly swap: { m: Mesh; mat: Material | Material[] }[] = [];
  visible = true;
  heightAGL = 0;
  private readonly prevClear = new Color();

  constructor(sampler: TerrainSampler | null, tint = new Color(0.36, 0.33, 0.42)) {
    this.sampler = sampler;
    this.rt = new WebGLRenderTarget(128, 128, {
      format: RGBAFormat, type: UnsignedByteType, generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter, depthBuffer: false,
    });
    const n = (GRID + 1) * (GRID + 1);
    this.pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const idx: number[] = [];
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const a = j * (GRID + 1) + i;
      idx.push(a, a + GRID + 1, a + 1, a + 1, a + GRID + 1, a + GRID + 2);
    }
    const g = new BufferGeometry();
    const pa = new BufferAttribute(this.pos, 3);
    pa.setUsage(DynamicDrawUsage);
    g.setAttribute('position', pa);
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uMask: { value: this.rt.texture }, uShadowMat: { value: this.shadowMat }, uStrength: { value: 0.75 }, uBlur: { value: 0 }, uTint: { value: tint } },
      transparent: true, depthWrite: false, side: DoubleSide, blending: CustomBlending, blendSrc: ZeroFactor, blendDst: SrcColorFactor,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, toneMapped: false, fog: false,
    });
    this.mesh = new Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.name = 'pilot-shadow';
  }

  setSampler(s: TerrainSampler | null): void { this.sampler = s; }

  /** Direction TOWARD the sun (world). */
  setSunDirection(x: number, y: number, z: number): void {
    this.dir.set(x, y, z).normalize();
  }

  /** Render the silhouette mask and drape the decal under `center`. `extent` = half size of the mask (m). */
  update(renderer: WebGLRenderer, casters: Mesh[], center: Vector3, extent: number): void {
    const s = this.sampler;
    if (!s || !this.visible) { this.mesh.visible = false; return; }
    // effective projection direction: sun direction with a minimum elevation
    const minEl = (this.minElevationDeg * Math.PI) / 180;
    let el = Math.asin(Math.min(1, Math.max(-1, this.dir.y)));
    const hx = this.dir.x, hz = this.dir.z;
    const hl = Math.hypot(hx, hz) || 1;
    if (el < minEl) el = minEl;
    const d = this.tmp.set((hx / hl) * Math.cos(el), Math.sin(el), (hz / hl) * Math.cos(el));
    // ray-march from the pilot away from the sun to the terrain
    let t0 = 0, t1 = -1;
    const step = 1.5;
    for (let t = step; t <= 160; t += step) {
      const x = center.x - d.x * t, y = center.y - d.y * t, z = center.z - d.z * t;
      if (y <= s.height(x, z)) { t1 = t; t0 = t - step; break; }
    }
    if (t1 < 0) { this.mesh.visible = false; return; }
    for (let k = 0; k < 6; k++) {
      const tm = (t0 + t1) / 2;
      const x = center.x - d.x * tm, y = center.y - d.y * tm, z = center.z - d.z * tm;
      if (y <= s.height(x, z)) t1 = tm; else t0 = tm;
    }
    this.hit.set(center.x - d.x * t1, 0, center.z - d.z * t1);
    this.hit.y = s.height(this.hit.x, this.hit.z);
    this.heightAGL = t1;
    // mask camera looks along −d at the pilot
    this.cam.left = -extent; this.cam.right = extent; this.cam.top = extent; this.cam.bottom = -extent;
    this.cam.near = 0.1; this.cam.far = 40;
    this.cam.position.copy(center).addScaledVector(d, 20);
    this.cam.up.set(0, 1, 0);
    if (Math.abs(d.y) > 0.99) this.cam.up.set(0, 0, -1);
    this.cam.lookAt(center);
    this.cam.updateMatrixWorld();
    this.cam.updateProjectionMatrix();
    this.shadowMat.multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse);
    // render mask (swap materials to flat white)
    const prevTarget = renderer.getRenderTarget();
    const prevClear = this.prevClear;
    renderer.getClearColor(prevClear);
    const prevAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, false, false);
    this.swap.length = 0;
    for (const m of casters) {
      if (!m.visible) continue;
      this.swap.push({ m, mat: m.material });
      m.material = this.maskMat;
    }
    const prevAuto = renderer.autoClear;
    renderer.autoClear = false;
    for (const sw of this.swap) renderer.render(sw.m as unknown as Scene, this.cam);
    renderer.autoClear = prevAuto;
    for (const sw of this.swap) sw.m.material = sw.mat;
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClear, prevAlpha);
    // drape the decal grid: aligned with the horizontal shadow direction, elongated by 1/sin(elevation)
    const along = extent / Math.max(0.2, Math.sin(el)) * 1.1;
    const across = extent * 1.1;
    const ax = -d.x / (Math.hypot(d.x, d.z) || 1), az = -d.z / (Math.hypot(d.x, d.z) || 1);
    const bx = -az, bz = ax;
    for (let j = 0; j <= GRID; j++) {
      const v = (j / GRID) * 2 - 1;
      for (let i = 0; i <= GRID; i++) {
        const u = (i / GRID) * 2 - 1;
        const x = this.hit.x + ax * v * along + bx * u * across;
        const z = this.hit.z + az * v * along + bz * u * across;
        const o = (j * (GRID + 1) + i) * 3;
        this.pos[o] = x; this.pos[o + 1] = s.height(x, z) + 0.04; this.pos[o + 2] = z;
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    // contact hardening: crisp & dark when close, soft & light high up
    const h = t1 * Math.sin(el);
    this.mat.uniforms.uStrength.value = 0.82 * (1 - smooth(12, 90, h));
    this.mat.uniforms.uBlur.value = Math.min(4.5, 0.4 + h / 9);
    this.mesh.visible = this.mat.uniforms.uStrength.value > 0.01;
  }

  addTo(parent: Object3D): void { parent.add(this.mesh); }
  removeFrom(parent: Object3D): void { parent.remove(this.mesh); }

  dispose(): void {
    this.rt.dispose();
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.maskMat.dispose();
  }
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
