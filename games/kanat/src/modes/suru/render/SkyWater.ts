// Sunset sky dome + the bay's water surface (§3.8): analytic sky reflection + Fresnel + sun path/glints,
// flock-colour aura and soft shadow from the ownership-density target, gust ripple lines, storm rain, sunset
// ring light band + night tint outside, lighthouse reflection, shoreline foam. One draw call each.

import * as THREE from 'three';
import type { QualityTier } from '../../../core/settings.ts';
import type { SuruLayout } from '../sim/types.ts';
import { GLSL_PRELUDE } from './glsl.ts';
import type { SuruGlobals } from './glsl.ts';

const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const SKY_FS = /* glsl */ `
${GLSL_PRELUDE}
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 c = skyColor(d);
  c += vec3(0.55, 0.62, 0.8) * uLightning * 0.15;
  gl_FragColor = vec4(finalColor(c, gl_FragCoord.xy), 1.0);
}
`;

const WATER_VS = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const MAX_FOAM = 24;

const WATER_FS = /* glsl */ `
${GLSL_PRELUDE}
uniform sampler2D uOwn;
uniform float uOwnScale;
uniform float uOwnOn;
uniform vec4 uFoam[${MAX_FOAM}];
uniform int uFoamCount;
uniform float uDetail; // tier: 0 low … 3 ultra
varying vec3 vWorld;

vec2 waveGrad(vec2 p, float t) {
  vec2 g = vec2(0.0);
  // long swell + wind chop (analytic derivatives of directional sines)
  vec2 d0 = normalize(vec2(0.3, -1.0));
  vec2 d1 = normalize(vec2(-0.8, -0.6));
  vec2 d2 = normalize(vec2(0.9, -0.35));
  vec2 d3 = normalize(vec2(-0.2, 1.0));
  g += d0 * cos(dot(d0, p) * 0.085 + t * 0.9) * 0.085 * 0.55;
  g += d1 * cos(dot(d1, p) * 0.21 + t * 1.45) * 0.21 * 0.16;
  if (uDetail > 0.5) {
    g += d2 * cos(dot(d2, p) * 0.47 + t * 2.1) * 0.47 * 0.055;
    g += d3 * cos(dot(d3, p) * 0.93 + t * 2.9) * 0.93 * 0.022;
  }
  if (uDetail > 1.5) {
    // fine noise ripples (finite-difference of value noise)
    vec2 q = p * 0.65 + vec2(t * 0.35, -t * 0.22);
    float e = 0.35;
    float n0 = vnoise(q);
    g += vec2(vnoise(q + vec2(e, 0.0)) - n0, vnoise(q + vec2(0.0, e)) - n0) * 0.55;
  }
  return g;
}

void main() {
  vec2 xz = vWorld.xz;
  vec3 toCam = uCamPos - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  float t = uTime;
  vec2 g = waveGrad(xz, t);
  // calm the far field (no aliasing sparkle at grazing distance)
  float far = smoothstep(250.0, 1100.0, dist);
  g *= mix(1.0, 0.35, far);
  // storm: choppier
  float sm = stormMask(xz);
  g *= 1.0 + sm * 1.6;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 R = reflect(-V, N);
  R.y = abs(R.y) + 0.002;
  vec3 refl = skyColor(R);
  float ndv = max(dot(N, V), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  // water body: deep bay colour lit by the sky dome and a little by the low sun
  vec3 body = uSea * (0.42 + 0.25 * uSkyMid.r) + uSkyZenith * 0.12;
  body *= 1.0 - 0.45 * uNight;
  vec3 col = mix(body, refl, F);
  // --- sun path: Beckmann glitter for a rough sea (σ broad) + sharp glints from the actual normal ---
  vec3 L = normalize(uSunDir + vec3(0.0, 0.03, 0.0));
  float sunUp = smoothstep(-0.06, 0.03, uSunDir.y);
  vec3 H = normalize(V + L);
  float tan2 = (H.x * H.x + H.z * H.z) / max(H.y * H.y, 1e-4);
  float sig = 0.34;
  float beck = exp(-tan2 / (sig * sig)) / (3.14159 * sig * sig * pow(max(H.y, 0.05), 4.0));
  float pathF = 0.02 + 0.98 * pow(1.0 - max(dot(V, H), 0.0), 5.0);
  col += uSunColor * beck * pathF * 1.15 * sunUp;
  vec3 Hn = normalize(V + L);
  float glint = pow(max(dot(N, Hn), 0.0), 900.0);
  float sparkle = step(0.82, vnoise(xz * 1.7 + t * 1.3));
  col += uSunColor * glint * (2.2 + 6.0 * sparkle) * sunUp * (1.0 - far);
  // --- ownership aura (alpha 0.18 glow in the owner colour) + soft grounded shadow ---
  if (uOwnOn > 0.5) {
    vec4 own = texture2D(uOwn, xz * uOwnScale + 0.5);
    vec2 sOff = -normalize(uSunDir.xz + 1e-4) * 7.0;
    float shade = texture2D(uOwn, (xz - sOff) * uOwnScale + 0.5).a;
    col *= 1.0 - 0.32 * (1.0 - exp(-shade * 0.9));
    float dens = 1.0 - exp(-own.a * 0.55);
    vec3 oc = own.rgb / max(own.a, 1e-3);
    col += oc * dens * 0.2 * (0.6 + 0.4 * (1.0 - uNight));
  }
  // --- gust: ripple lines inside the band (2 s warning, then active) ---
  if (uGust.w > 0.5) {
    vec2 gd = uGust.xy;
    float s = -xz.x * gd.y + xz.y * gd.x - uGust.z;
    float band = 1.0 - smoothstep(48.0, 62.0, abs(s));
    float along = dot(xz, gd);
    float lines = smoothstep(0.82, 1.0, sin(along * 0.42 - t * 7.0 + vnoise(xz * 0.05) * 6.0)) *
                  smoothstep(0.35, 0.8, vnoise(vec2(along * 0.02, s * 0.15) + t * 0.2));
    col += mix(uSkyHorizon, vec3(1.0), 0.35) * lines * band * (0.18 + 0.22 * uGustMix);
    col *= 1.0 - band * 0.04;
  }
  // --- storm: darker, rain rings ---
  if (sm > 0.0) {
    vec2 cell = floor(xz * 0.5);
    vec2 f = fract(xz * 0.5) - 0.5;
    float ph = fract(t * 1.4 + hash12(cell) * 7.0);
    float ring = smoothstep(0.06, 0.0, abs(length(f) - ph * 0.45)) * (1.0 - ph);
    col = applyStorm(col, sm);
    col += vec3(0.5, 0.58, 0.7) * ring * 0.12 * sm;
  }
  // --- foam at islets / rocks / lighthouse ---
  for (int k = 0; k < ${MAX_FOAM}; k++) {
    if (k >= uFoamCount) break;
    vec4 fo = uFoam[k];
    float d = length(xz - fo.xy) - fo.z;
    float n = vnoise(xz * 0.45 + t * 0.3);
    float foam = smoothstep(2.4 + n * 1.5, 0.2, d) * smoothstep(-1.5, 0.3, d);
    col = mix(col, mix(uSkyHorizon, vec3(0.9), 0.5) * 0.55, foam * 0.45 * (0.5 + 0.5 * n));
  }
  // --- lighthouse: warm reflection streak toward the camera when lit ---
  if (uLighthouse.z > 0.01) {
    vec2 lp = uLighthouse.xy;
    vec2 toC = normalize(uCamPos.xz - lp);
    vec2 rel = xz - lp;
    float along = dot(rel, toC);
    float lat = abs(rel.x * toC.y - rel.y * toC.x);
    float streak = exp(-lat * lat / (6.0 + along * 0.08)) * smoothstep(-5.0, 10.0, along) * exp(-max(along, 0.0) / 140.0);
    float wob = 0.6 + 0.4 * sin(along * 0.9 + t * 3.0 + vnoise(xz * 0.3) * 4.0);
    col += vec3(1.0, 0.78, 0.42) * streak * wob * uLighthouse.z * 0.9;
  }
  // --- sunset ring: soft light band on the water + night outside ---
  if (uRing.y > 0.5) {
    float d = length(xz);
    float band = exp(-pow((d - uRing.x) / 3.5, 2.0));
    col = applyNight(col, nightMask(xz));
    col += vec3(1.0, 0.62, 0.3) * band * (0.55 + 0.25 * sin(t * 2.0 + atan(xz.y, xz.x) * 6.0));
  }
  // aerial perspective toward the horizon
  vec3 fogC = skyColor(normalize(vec3(-V.x, 0.015, -V.z)));
  col = mix(col, fogC, smoothstep(300.0, 1700.0, dist) * 0.92);
  col += vec3(0.5, 0.6, 0.85) * uLightning * 0.05;
  gl_FragColor = vec4(finalColor(col, gl_FragCoord.xy), 1.0);
}
`;

const VIG_VS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const VIG_FS = /* glsl */ `
uniform float uStrength;
varying vec2 vUv;
void main() {
  vec2 q = vUv - 0.5;
  q.x *= 0.82;
  float v = 1.0 - uStrength * smoothstep(0.18, 0.78, length(q));
  gl_FragColor = vec4(vec3(v), 1.0);
}
`;

export class SkyWater {
  readonly sky: THREE.Mesh;
  readonly water: THREE.Mesh;
  readonly vignette: THREE.Mesh;
  private readonly waterMat: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, g: SuruGlobals, ownTex: THREE.Texture | null) {
    const skyGeo = new THREE.SphereGeometry(4000, 48, 24);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: { ...g },
      vertexShader: SKY_VS,
      fragmentShader: SKY_FS,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    scene.add(this.sky);

    const foam: THREE.Vector4[] = [];
    for (let k = 0; k < MAX_FOAM; k++) foam.push(new THREE.Vector4());
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        ...g,
        uOwn: { value: ownTex },
        uOwnScale: { value: 1 / 660 },
        uOwnOn: { value: ownTex ? 1 : 0 },
        uFoam: { value: foam },
        uFoamCount: { value: 0 },
        uDetail: { value: 2 },
      },
      vertexShader: WATER_VS,
      fragmentShader: WATER_FS,
    });
    const wg = new THREE.PlaneGeometry(5200, 5200, 1, 1);
    wg.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, this.waterMat);
    this.water.frustumCulled = false;
    this.water.renderOrder = -5;
    scene.add(this.water);

    const vg = new THREE.BufferGeometry();
    vg.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const vm = new THREE.ShaderMaterial({
      uniforms: { uStrength: { value: 0.26 } },
      vertexShader: VIG_VS,
      fragmentShader: VIG_FS,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.ZeroFactor,
      blendDst: THREE.SrcColorFactor,
      blendEquation: THREE.AddEquation,
    });
    this.vignette = new THREE.Mesh(vg, vm);
    this.vignette.frustumCulled = false;
    this.vignette.renderOrder = 1000;
    scene.add(this.vignette);
  }

  setLayout(layout: SuruLayout): void {
    const foam = this.waterMat.uniforms.uFoam.value as THREE.Vector4[];
    let n = 0;
    for (const i of layout.islets) if (n < MAX_FOAM) foam[n++].set(i.x, i.z, i.r * 0.92, 0);
    for (const r of layout.rocks) if (n < MAX_FOAM) foam[n++].set(r.x, r.z, r.r * 0.9, 1);
    if (n < MAX_FOAM) foam[n++].set(layout.lighthouse.x, layout.lighthouse.z, 7.5, 2);
    this.waterMat.uniforms.uFoamCount.value = n;
  }

  setTier(t: QualityTier): void {
    this.waterMat.uniforms.uDetail.value = t === 'low' ? 0 : t === 'medium' ? 1 : t === 'high' ? 2 : 3;
  }

  setOwnTexture(tex: THREE.Texture | null): void {
    this.waterMat.uniforms.uOwn.value = tex;
    this.waterMat.uniforms.uOwnOn.value = tex ? 1 : 0;
  }

  /** keep the water plane under the camera (patterns are in world space, so no swimming) */
  follow(cam: THREE.Vector3): void {
    this.water.position.set(Math.round(cam.x / 10) * 10, 0, Math.round(cam.z / 10) * 10);
    this.sky.position.copy(cam);
  }

  dispose(): void {
    this.sky.geometry.dispose();
    (this.sky.material as THREE.Material).dispose();
    this.water.geometry.dispose();
    this.waterMat.dispose();
    this.vignette.geometry.dispose();
    (this.vignette.material as THREE.Material).dispose();
  }
}
