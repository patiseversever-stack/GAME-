// Bay environment (§3.8): reed islets (dark #3B3A2A silhouettes with a warm rim), rocks, the lighthouse
// (stone #D8CBB8, light #FFE2A6 from 2:15 with a slow rotating beam) and the distant shore. Procedural geometry,
// a handful of draw calls; all shading shares the sunset sky model.

import * as THREE from 'three';
import type { QualityTier } from '../../../core/settings.ts';
import type { SuruLayout } from '../sim/types.ts';
import { GLSL_PRELUDE } from './glsl.ts';
import type { SuruGlobals } from './glsl.ts';

const LIT_VS = /* glsl */ `
attribute vec3 aCol;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vCol;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vCol = aCol;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const LIT_FS = /* glsl */ `
${GLSL_PRELUDE}
uniform float uWetLine;
uniform float uEmissive;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vCol;
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorld);
  vec3 L = normalize(uSunDir);
  float sunUp = smoothstep(-0.06, 0.03, L.y);
  float n = fbm(vWorld.xz * 0.35 + vWorld.y * 0.2);
  vec3 alb = vCol * (0.75 + 0.5 * n);
  // wet dark band at the waterline
  alb *= mix(0.55, 1.0, smoothstep(0.0, uWetLine, vWorld.y));
  vec3 amb = mix(uSkyZenith * 0.9, uSkyHorizon * 0.55, 0.5 - 0.5 * N.y) + uSea * 0.25;
  float wrap = clamp((dot(N, L) + 0.3) / 1.3, 0.0, 1.0);
  vec3 col = alb * (amb * 0.9 + uSunColor * wrap * 1.15 * sunUp);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += fr * uSunColor * (0.35 + 0.65 * max(dot(-V, L), 0.0)) * 0.5 * sunUp;
  col += vCol * uEmissive;
  col = applyStorm(col, stormMask(vWorld.xz));
  col = applyNight(col, nightMask(vWorld.xz));
  float d = length(uCamPos - vWorld);
  vec3 fogC = skyColor(normalize(vec3(-V.x, 0.02, -V.z)));
  col = mix(col, fogC, smoothstep(250.0, 1500.0, d) * 0.9);
  gl_FragColor = vec4(finalColor(col, gl_FragCoord.xy), 1.0);
}
`;

const REED_VS = /* glsl */ `
${GLSL_PRELUDE}
attribute vec4 aB; // x, z, height, yaw
attribute vec4 aV; // phase, lean, tone, width
uniform float uSway;
varying vec3 vWorld;
varying float vH;
varying float vTone;
varying vec3 vN;
void main() {
  float h = aB.z;
  float y = position.y; // 0..1 along the blade
  float c = cos(aB.w);
  float s = sin(aB.w);
  vec3 lp = vec3(position.x * aV.w * (1.0 - y * 0.85), y * h, 0.0);
  lp = vec3(lp.x * c, lp.y, lp.x * s);
  float sway = (sin(uTime * 1.3 + aV.x + aB.x * 0.05) * 0.6 + sin(uTime * 2.7 + aV.x * 3.0) * 0.25) * uSway;
  float bend = y * y;
  lp.x += (aV.y + sway * 0.35) * bend * h * 0.18;
  lp.z += (aV.y * 0.5 + sway * 0.2) * bend * h * 0.12;
  vec3 wp = vec3(aB.x, 0.0, aB.y) + lp;
  vWorld = wp;
  vH = y;
  vTone = aV.z;
  vN = normalize(vec3(-s, 0.25, c));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const REED_FS = /* glsl */ `
${GLSL_PRELUDE}
varying vec3 vWorld;
varying float vH;
varying float vTone;
varying vec3 vN;
void main() {
  vec3 V = normalize(uCamPos - vWorld);
  vec3 L = normalize(uSunDir);
  float sunUp = smoothstep(-0.06, 0.03, L.y);
  // #3B3A2A silhouette, slightly lighter dry tips
  vec3 base = mix(vec3(0.044, 0.041, 0.023), vec3(0.11, 0.085, 0.045), vH * 0.8 + vTone * 0.25);
  vec3 amb = mix(uSkyZenith, uSkyHorizon, 0.4) * 0.55;
  vec3 col = base * (amb + uSunColor * 0.35 * sunUp);
  // warm rim: backlit reed edges glow (#FFB36B)
  float back = pow(max(dot(-V, L), 0.0), 1.5);
  float rim = (0.25 + 0.75 * vH) * (0.35 + 0.65 * back);
  col += vec3(1.0, 0.45, 0.16) * rim * 0.32 * sunUp * (0.6 + 0.4 * vTone);
  col = applyStorm(col, stormMask(vWorld.xz));
  col = applyNight(col, nightMask(vWorld.xz));
  float d = length(uCamPos - vWorld);
  vec3 fogC = skyColor(normalize(vec3(-V.x, 0.02, -V.z)));
  col = mix(col, fogC, smoothstep(250.0, 1500.0, d) * 0.9);
  gl_FragColor = vec4(finalColor(col, gl_FragCoord.xy), 1.0);
}
`;

const BEAM_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const BEAM_FS = /* glsl */ `
uniform float uOn;
uniform float uTime;
varying vec2 vUv;
void main() {
  float along = vUv.x;
  float across = abs(vUv.y - 0.5) * 2.0;
  float a = (1.0 - across * across) * pow(1.0 - along, 1.6) * uOn;
  a *= 0.85 + 0.15 * sin(uTime * 3.0 + along * 20.0);
  gl_FragColor = vec4(vec3(1.0, 0.82, 0.52) * a * 0.55, 1.0);
}
`;

const GLOW_VS = /* glsl */ `
uniform float uSize;
varying vec2 vQ;
void main() {
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  vQ = position.xy;
  gl_Position = projectionMatrix * mv;
}
`;

const GLOW_FS = /* glsl */ `
uniform float uOn;
varying vec2 vQ;
void main() {
  float r = length(vQ);
  float g = exp(-r * r * 6.0) * 0.8 + exp(-r * r * 60.0) * 1.4;
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * g * uOn, 1.0);
}
`;

function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function colorAttr(g: THREE.BufferGeometry, hex: string, jitter = 0, rnd?: () => number): void {
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const j = rnd ? 1 + (rnd() - 0.5) * jitter : 1;
    a[i * 3] = c.r * j;
    a[i * 3 + 1] = c.g * j;
    a[i * 3 + 2] = c.b * j;
  }
  g.setAttribute('aCol', new THREE.BufferAttribute(a, 3));
}

export class Environment {
  readonly group = new THREE.Group();
  private readonly g: SuruGlobals;
  private readonly litMat: THREE.ShaderMaterial;
  private readonly towerMat: THREE.ShaderMaterial;
  private readonly lanternMat: THREE.ShaderMaterial;
  private readonly reedMat: THREE.ShaderMaterial;
  private readonly beamMat: THREE.ShaderMaterial;
  private readonly glowMat: THREE.ShaderMaterial;
  private beam: THREE.Group | null = null;
  private tier: QualityTier = 'high';
  private layout: SuruLayout | null = null;
  private readonly disposables: THREE.BufferGeometry[] = [];

  constructor(scene: THREE.Scene, g: SuruGlobals) {
    this.g = g;
    this.litMat = new THREE.ShaderMaterial({ uniforms: { ...g, uWetLine: { value: 1.2 }, uEmissive: { value: 0 } }, vertexShader: LIT_VS, fragmentShader: LIT_FS });
    this.towerMat = new THREE.ShaderMaterial({ uniforms: { ...g, uWetLine: { value: 2.0 }, uEmissive: { value: 0 } }, vertexShader: LIT_VS, fragmentShader: LIT_FS });
    this.lanternMat = new THREE.ShaderMaterial({ uniforms: { ...g, uWetLine: { value: 0.0 }, uEmissive: { value: 0 } }, vertexShader: LIT_VS, fragmentShader: LIT_FS });
    this.reedMat = new THREE.ShaderMaterial({ uniforms: { ...g, uSway: { value: 1 } }, vertexShader: REED_VS, fragmentShader: REED_FS, side: THREE.DoubleSide });
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { uOn: { value: 0 }, uTime: g.uTime },
      vertexShader: BEAM_VS,
      fragmentShader: BEAM_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.glowMat = new THREE.ShaderMaterial({
      uniforms: { uOn: { value: 0 }, uSize: { value: 9 } },
      vertexShader: GLOW_VS,
      fragmentShader: GLOW_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(this.group);
  }

  setTier(t: QualityTier): void {
    this.tier = t;
    this.reedMat.uniforms.uSway.value = t === 'low' || t === 'medium' ? 0.35 : 1;
    if (this.layout) this.build(this.layout);
  }

  build(layout: SuruLayout): void {
    this.layout = layout;
    this.clear();
    const rnd = seeded(layout.seed ^ 0x51ed);
    // ---- reed islets ----
    const reedCount = this.tier === 'low' ? 260 : this.tier === 'medium' ? 520 : this.tier === 'high' ? 820 : 1100;
    const blades: number[][] = [];
    for (const isl of layout.islets) {
      this.group.add(this.mound(isl.x, isl.z, isl.r, rnd));
      for (let k = 0; k < reedCount; k++) {
        const a = rnd() * Math.PI * 2;
        const rr = Math.sqrt(rnd()) * isl.r * (0.95 + 0.1 * Math.sin(a * 3 + isl.x));
        const edge = rr / isl.r;
        const h = (2.2 + rnd() * 2.6) * (1 - edge * 0.35);
        blades.push([isl.x + Math.cos(a) * rr, isl.z + Math.sin(a) * rr, h, rnd() * Math.PI, rnd() * 6.28, (rnd() - 0.5) * 0.6 + edge * 0.4, rnd(), 0.07 + rnd() * 0.05]);
      }
    }
    // ---- far shore: land silhouettes + reed fringe (layers by tier) ----
    const layers = this.tier === 'low' ? 1 : this.tier === 'medium' ? 2 : 3;
    for (const sh of layout.shore) {
      this.group.add(this.shoreStrip(sh.from, sh.to, sh.dist, rnd));
      const len = (sh.to - sh.from) * sh.dist;
      const n = Math.floor(len * 0.9 * layers);
      for (let k = 0; k < n; k++) {
        const ang = sh.from + rnd() * (sh.to - sh.from);
        const rr = sh.dist - 4 + rnd() * 10 * layers;
        // ψ convention: x = sin, z = −cos
        blades.push([Math.sin(ang) * rr, -Math.cos(ang) * rr, 2.5 + rnd() * 3.2, rnd() * Math.PI, rnd() * 6.28, (rnd() - 0.5) * 0.5, rnd(), 0.09 + rnd() * 0.06]);
      }
    }
    this.group.add(this.reeds(blades));
    // ---- rocks ----
    for (const r of layout.rocks) this.group.add(this.rock(r.x, r.z, r.r, rnd));
    // ---- lighthouse ----
    this.group.add(this.lighthouse(layout.lighthouse.x, layout.lighthouse.z));
  }

  private mound(x: number, z: number, r: number, rnd: () => number): THREE.Mesh {
    const seg = 48;
    const rings = 6;
    const pos: number[] = [];
    const idx: number[] = [];
    const ph = rnd() * 10;
    pos.push(0, 1.6, 0);
    for (let k = 1; k <= rings; k++) {
      const t = k / rings;
      for (let s = 0; s < seg; s++) {
        const a = (s / seg) * Math.PI * 2;
        const wob = 1 + 0.13 * Math.sin(a * 3 + ph) + 0.07 * Math.sin(a * 7 + ph * 2);
        const rr = r * 1.06 * t * wob;
        const y = 1.6 * (1 - t * t) - (t > 0.92 ? (t - 0.92) * 14 : 0);
        pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
      }
    }
    for (let s = 0; s < seg; s++) idx.push(0, 1 + ((s + 1) % seg), 1 + s);
    for (let k = 1; k < rings; k++) {
      for (let s = 0; s < seg; s++) {
        const a = 1 + (k - 1) * seg + s;
        const b = 1 + (k - 1) * seg + ((s + 1) % seg);
        const c = 1 + k * seg + s;
        const d = 1 + k * seg + ((s + 1) % seg);
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    colorAttr(g, '#3B3A2A', 0.25, rnd);
    this.disposables.push(g);
    const m = new THREE.Mesh(g, this.litMat);
    m.position.set(x, 0, z);
    return m;
  }

  private shoreStrip(from: number, to: number, dist: number, rnd: () => number): THREE.Mesh {
    const seg = Math.max(8, Math.floor((to - from) * 40));
    const depth = 7;
    const pos: number[] = [];
    const idx: number[] = [];
    const ph = rnd() * 10;
    for (let s = 0; s <= seg; s++) {
      const a = from + ((to - from) * s) / seg;
      for (let k = 0; k < depth; k++) {
        const t = k / (depth - 1);
        const rr = dist - 6 + t * 260;
        const ridge = 6 + 22 * Math.pow(Math.sin(a * 5 + ph) * 0.5 + 0.5, 2) + 10 * Math.sin(a * 13 + ph * 3) * 0.5;
        const edgeFade = Math.min(1, Math.min(s, seg - s) / 4);
        const y = (t < 0.12 ? -0.5 + t * 20 : 1.9 + ridge * Math.min(1, (t - 0.12) * 2.2)) * (0.3 + 0.7 * edgeFade);
        pos.push(Math.sin(a) * rr, y, -Math.cos(a) * rr);
      }
    }
    for (let s = 0; s < seg; s++) {
      for (let k = 0; k < depth - 1; k++) {
        const a = s * depth + k;
        const b = (s + 1) * depth + k;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    colorAttr(g, '#2E2C22', 0.2, rnd);
    this.disposables.push(g);
    return new THREE.Mesh(g, this.litMat);
  }

  private reeds(blades: number[][]): THREE.Mesh {
    const blade = new THREE.BufferGeometry();
    // tapered two-triangle blade; x ∈ [−0.5, 0.5] scaled by width, y ∈ [0, 1]
    blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.25, 0.55, 0, -0.5, 0, 0, 0.25, 0.55, 0, 0, 1, 0], 3));
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', blade.getAttribute('position'));
    const n = blades.length;
    const aB = new Float32Array(n * 4);
    const aV = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const b = blades[i];
      aB.set([b[0], b[1], b[2], b[3]], i * 4);
      aV.set([b[4], b[5], b[6], b[7]], i * 4);
    }
    geo.setAttribute('aB', new THREE.InstancedBufferAttribute(aB, 4));
    geo.setAttribute('aV', new THREE.InstancedBufferAttribute(aV, 4));
    geo.instanceCount = n;
    this.disposables.push(geo, blade);
    const m = new THREE.Mesh(geo, this.reedMat);
    m.frustumCulled = false;
    return m;
  }

  private rock(x: number, z: number, r: number, rnd: () => number): THREE.Mesh {
    const g = new THREE.IcosahedronGeometry(r, 2);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const ph = rnd() * 100;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      const n = 1 + 0.18 * Math.sin(vx * 0.9 + ph) * Math.cos(vz * 1.1 + ph) + 0.08 * Math.sin(vy * 2.3 + ph * 2);
      p.setXYZ(i, vx * n, vy * n * 0.55 - r * 0.18, vz * n);
    }
    g.computeVertexNormals();
    colorAttr(g, '#5C5249', 0.3, rnd);
    this.disposables.push(g);
    const m = new THREE.Mesh(g, this.litMat);
    m.position.set(x, 0, z);
    m.rotation.y = rnd() * Math.PI;
    return m;
  }

  private lighthouse(x: number, z: number): THREE.Group {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    // rock base
    const base = new THREE.CylinderGeometry(7.5, 9, 3, 24, 1);
    base.translate(0, 0.6, 0);
    colorAttr(base, '#4E463F');
    this.disposables.push(base);
    grp.add(new THREE.Mesh(base, this.litMat));
    // tower (lathe profile)
    const prof: THREE.Vector2[] = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      prof.push(new THREE.Vector2(3.2 - 1.1 * t, 2 + t * 18));
    }
    prof.push(new THREE.Vector2(2.8, 20.2), new THREE.Vector2(2.8, 20.7), new THREE.Vector2(1.7, 20.8));
    const tower = new THREE.LatheGeometry(prof, 28);
    colorAttr(tower, '#D8CBB8');
    // subtle painted bands
    const tc = tower.getAttribute('aCol') as THREE.BufferAttribute;
    const tp = tower.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) {
      const y = tp.getY(i);
      if (y > 8 && y < 11) tc.setXYZ(i, 0.35, 0.09, 0.07);
    }
    this.disposables.push(tower);
    grp.add(new THREE.Mesh(tower, this.towerMat));
    // lantern room + cap
    const lantern = new THREE.CylinderGeometry(1.55, 1.55, 2.4, 16, 1, true);
    lantern.translate(0, 22, 0);
    colorAttr(lantern, '#FFE2A6');
    this.disposables.push(lantern);
    grp.add(new THREE.Mesh(lantern, this.lanternMat));
    const cap = new THREE.SphereGeometry(1.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.translate(0, 23.2, 0);
    colorAttr(cap, '#3A2F2A');
    this.disposables.push(cap);
    grp.add(new THREE.Mesh(cap, this.litMat));
    // glow sprite + rotating beams (visible from 2:15)
    const gq = new THREE.PlaneGeometry(2, 2);
    this.disposables.push(gq);
    const glow = new THREE.Mesh(gq, this.glowMat);
    glow.position.set(0, 22, 0);
    glow.frustumCulled = false;
    glow.renderOrder = 6;
    grp.add(glow);
    const beam = new THREE.Group();
    beam.position.set(0, 22, 0);
    for (const s of [0, Math.PI]) {
      const bg = new THREE.PlaneGeometry(170, 9, 1, 1);
      bg.translate(85, 0, 0);
      this.disposables.push(bg);
      for (const tilt of [0, Math.PI / 2]) {
        const bm = new THREE.Mesh(bg, this.beamMat);
        bm.rotation.set(tilt, s, -0.035);
        bm.frustumCulled = false;
        bm.renderOrder = 6;
        beam.add(bm);
      }
    }
    grp.add(beam);
    this.beam = beam;
    return grp;
  }

  /** lighthouse light level 0..1 and visual time (beam rotation) */
  update(on: number, time: number): void {
    this.beamMat.uniforms.uOn.value = on;
    this.glowMat.uniforms.uOn.value = on;
    this.lanternMat.uniforms.uEmissive.value = on * 3.5;
    if (this.beam) this.beam.rotation.y = time * 0.9;
  }

  private clear(): void {
    for (const c of [...this.group.children]) this.group.remove(c);
    for (const g of this.disposables) g.dispose();
    this.disposables.length = 0;
    this.beam = null;
  }

  dispose(): void {
    this.clear();
    for (const m of [this.litMat, this.towerMat, this.lanternMat, this.reedMat, this.beamMat, this.glowMat]) m.dispose();
    void this.g;
  }
}
