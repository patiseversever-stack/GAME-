// Ribbon trails with a 64-point ring buffer (wingtip trails, cosmetic trail effects, high-G vapour, ghost trail).
// CPU rewrites 128 vertices per frame in age order (≈1.5 KB upload), zero allocations.
import {
  BufferAttribute,
  BufferGeometry, Float32BufferAttribute, Mesh, ShaderMaterial, CustomBlending, OneFactor, OneMinusSrcAlphaFactor,
  DynamicDrawUsage, Color, DoubleSide, Vector3,
} from 'three';
import type { Object3D } from 'three';
import { GLSL_NOISE } from '../props/glsl.ts';

export const TRAIL_POINTS = 64;

/** Built-in looks (§2.7 "iz efektleri") + 'vapour' (high G) + 'ghost'. Cosmetic trails from content use setStyleDef. */
export const TRAIL_STYLES = ['dumanBeyazi', 'altinToz', 'ebruAkisi', 'buzKristali', 'kirlangic', 'gunBatimi', 'turkuazSerit', 'geceMavisi', 'lale', 'safak', 'vapour', 'ghost'] as const;
export type TrailStyle = typeof TRAIL_STYLES[number];

/** Content TrailStyle (src/content/meta/types.ts) → shader branch. */
export const TRAIL_SHADER_STYLE: Record<string, number> = {
  smoke: 0, dust: 1, marbled: 2, crystal: 3, feather: 4, glow: 5, foam: 6, ribbon: 7, petal: 8, mist: 9, vapour: 10, ghost: 11,
};

const STYLE_COLORS: Record<TrailStyle, [string, string]> = {
  dumanBeyazi: ['#F4F2EE', '#C9CDD2'],
  altinToz: ['#FFD27A', '#E89A2C'],
  ebruAkisi: ['#2BA3C7', '#E86A4A'],
  buzKristali: ['#CFF1FF', '#7FC8F0'],
  kirlangic: ['#2B2D33', '#F2F2F2'],
  gunBatimi: ['#FFC27A', '#E8505B'],
  turkuazSerit: ['#2EC4C6', '#E9FBFB'],
  geceMavisi: ['#3A4D9C', '#F3F0FF'],
  lale: ['#D8344A', '#F7A8B8'],
  safak: ['#F6C48E', '#8E7CC3'],
  vapour: ['#FFFFFF', '#DDE6F0'],
  ghost: ['#7FE3FF', '#B49CFF'],
};

const VERT = /* glsl */ `
attribute float aAge;   // 0 newest → 1 oldest
attribute float aSide;  // −1 / +1
varying float vAge;
varying float vSide;
void main() {
  vAge = aAge; vSide = aSide;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_NOISE}
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uAlpha;
uniform float uTime;
uniform int uStyle;
varying float vAge;
varying float vSide;
void main() {
  float edge = 1.0 - abs(vSide);
  float soft = smoothstep(0.0, 0.6, edge);
  float fade = pow(1.0 - vAge, 1.6) * smoothstep(0.0, 0.04, vAge + 0.02);
  vec3 col = mix(uColA, uColB, vAge);
  float a = soft * fade;
  if (uStyle == 1) { // gold dust: sparkles
    float sp = step(0.82, kNoise2(vec2(vAge * 140.0, vSide * 4.0 + uTime * 0.5)));
    a *= 0.35 + 1.4 * sp; col *= 1.0 + sp * 1.5;
  } else if (uStyle == 2) { // ebru flow: alternating colour veins
    float v = sin(vAge * 30.0 + vSide * 3.0 + kNoise2(vec2(vAge * 8.0, vSide)) * 4.0);
    col = mix(uColA, uColB, smoothstep(-0.2, 0.2, v));
  } else if (uStyle == 3) { // ice crystal glints
    float g = step(0.9, kNoise2(vec2(vAge * 90.0, vSide * 6.0)));
    col += vec3(0.6, 0.8, 1.0) * g; a *= 0.6 + g;
  } else if (uStyle == 4) { // swallow: twin thin lines
    a *= smoothstep(0.75, 0.95, abs(vSide)) * 1.6;
  } else if (uStyle == 7) { // night blue with stars
    float st = step(0.94, kNoise2(vec2(vAge * 120.0, vSide * 9.0)));
    col = mix(col, vec3(1.0), st);
  } else if (uStyle == 5) { // glow: warm burner light core
    a *= 1.0 + 1.2 * smoothstep(0.4, 1.0, edge); col *= 1.6;
  } else if (uStyle == 6) { // foam: bubbly blotches
    float b = smoothstep(0.45, 0.7, kNoise2(vec2(vAge * 45.0, vSide * 3.0 + 7.0)));
    a *= 0.4 + 0.9 * b; col = mix(uColA, uColB, b);
  } else if (uStyle == 8) { // petals: scattered soft flakes
    float pt = smoothstep(0.62, 0.8, kNoise2(vec2(vAge * 70.0, vSide * 5.0)));
    a *= 0.15 + 1.4 * pt;
  } else if (uStyle == 9) { // mist veil: wide and very soft
    a *= 0.55 * (0.7 + 0.3 * kNoise2(vec2(vAge * 10.0 - uTime * 0.5, vSide)));
  } else if (uStyle == 10) { // vapour: soft, dense, short
    a *= 0.8 + 0.4 * kNoise2(vec2(vAge * 20.0 - uTime * 2.0, vSide * 2.0));
  }
  a *= uAlpha;
  gl_FragColor = vec4(col * a, a * 0.6);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class RibbonTrail {
  readonly mesh: Mesh;
  private readonly px = new Float32Array(TRAIL_POINTS);
  private readonly py = new Float32Array(TRAIL_POINTS);
  private readonly pz = new Float32Array(TRAIL_POINTS);
  private readonly sx = new Float32Array(TRAIL_POINTS);
  private readonly sy = new Float32Array(TRAIL_POINTS);
  private readonly sz = new Float32Array(TRAIL_POINTS);
  private readonly pw = new Float32Array(TRAIL_POINTS);
  private head = 0;
  private count = 0;
  private acc = 0;
  /** Seconds between ring samples (64 × 1/30 s ≈ 2.1 s of trail). */
  interval = 1 / 30;
  width = 0.25;
  private readonly pos: Float32Array;
  private readonly mat: ShaderMaterial;
  private readonly tmp = new Vector3();

  constructor(style: TrailStyle = 'dumanBeyazi', timeU: { value: number } = { value: 0 }) {
    const n = TRAIL_POINTS * 2;
    this.pos = new Float32Array(n * 3);
    const age = new Float32Array(n), side = new Float32Array(n);
    const idx: number[] = [];
    for (let i = 0; i < TRAIL_POINTS; i++) {
      age[i * 2] = age[i * 2 + 1] = i / (TRAIL_POINTS - 1);
      side[i * 2] = -1; side[i * 2 + 1] = 1;
      if (i < TRAIL_POINTS - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    }
    const g = new BufferGeometry();
    const pa = new BufferAttribute(this.pos, 3);
    pa.setUsage(DynamicDrawUsage);
    g.setAttribute('position', pa);
    g.setAttribute('aAge', new Float32BufferAttribute(age, 1));
    g.setAttribute('aSide', new Float32BufferAttribute(side, 1));
    g.setIndex(idx);
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uColA: { value: new Color() }, uColB: { value: new Color() }, uAlpha: { value: 0 }, uTime: timeU, uStyle: { value: 0 } },
      transparent: true, depthWrite: false, side: DoubleSide, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
    });
    this.mesh = new Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 30;
    this.mesh.visible = false;
    this.setStyle(style);
  }

  setStyle(style: TrailStyle, colorOverride?: string): void {
    const c = STYLE_COLORS[style];
    (this.mat.uniforms.uColA.value as Color).set(colorOverride ?? c[0]);
    (this.mat.uniforms.uColB.value as Color).set(c[1]);
    this.mat.uniforms.uStyle.value = TRAIL_STYLES.indexOf(style);
  }

  /** Content trail cosmetic: style name (smoke/dust/…) + [head, tail] colours. */
  setStyleDef(style: string, colors: readonly [string, string]): void {
    (this.mat.uniforms.uColA.value as Color).set(colors[0]);
    (this.mat.uniforms.uColB.value as Color).set(colors[1]);
    this.mat.uniforms.uStyle.value = TRAIL_SHADER_STYLE[style] ?? 0;
  }

  set alpha(a: number) { this.mat.uniforms.uAlpha.value = a; }
  get alpha(): number { return this.mat.uniforms.uAlpha.value as number; }

  reset(): void { this.count = 0; this.acc = 0; }

  /** Advance with the current emitter point p and a side vector s (unit, across the ribbon). */
  update(dt: number, p: Vector3, s: Vector3, width = this.width): void {
    this.acc += dt;
    if (this.count === 0 || this.acc >= this.interval) {
      this.acc = 0;
      this.head = (this.head + 1) % TRAIL_POINTS;
      if (this.count < TRAIL_POINTS) this.count++;
    }
    const h = this.head;
    this.px[h] = p.x; this.py[h] = p.y; this.pz[h] = p.z;
    this.sx[h] = s.x; this.sy[h] = s.y; this.sz[h] = s.z;
    this.pw[h] = width;
    // write vertices newest → oldest; missing history collapses onto the oldest valid point
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const k = Math.min(i, this.count - 1);
      const j = (h - k + TRAIL_POINTS) % TRAIL_POINTS;
      const w = this.pw[j] * (1 - 0.5 * (i / TRAIL_POINTS));
      const o = i * 6;
      this.pos[o] = this.px[j] - this.sx[j] * w; this.pos[o + 1] = this.py[j] - this.sy[j] * w; this.pos[o + 2] = this.pz[j] - this.sz[j] * w;
      this.pos[o + 3] = this.px[j] + this.sx[j] * w; this.pos[o + 4] = this.py[j] + this.sy[j] * w; this.pos[o + 5] = this.pz[j] + this.sz[j] * w;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.visible = this.alpha > 0.002 && this.count > 1;
    void this.tmp;
  }

  addTo(o: Object3D): void { o.add(this.mesh); }
  removeFrom(o: Object3D): void { o.remove(this.mesh); }
  dispose(): void { this.mesh.geometry.dispose(); this.mat.dispose(); }
}
