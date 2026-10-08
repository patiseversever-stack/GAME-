// Gameplay effects (§3.8): KUŞATMA progress arcs on the water (attacker colour, per 10° bin) + shockwave,
// sunset-ring light curtain, hawks (dark long-winged silhouette + water shadow as the 2 s warning), storm cloud
// cards + rain curtains with ≤ 0.5 Hz lightning, and the FTUE ghost arc. No strobe, no harm imagery.

import * as THREE from 'three';
import type { QualityTier } from '../../../core/settings.ts';
import type { FlockRenderSource } from '../sim/types.ts';
import { buildHawk } from './birdGeometry.ts';
import { GLSL_PRELUDE } from './glsl.ts';
import type { SuruGlobals } from './glsl.ts';
import { hexToLinear, ownerStyle } from './palette.ts';

const ARC_VS = /* glsl */ `
uniform vec3 uCenter; // x, z, half-size
varying vec2 vLocal;
varying vec3 vWorld;
void main() {
  vec2 lp = position.xz * uCenter.z;
  vLocal = lp;
  vec3 wp = vec3(uCenter.x + lp.x, 0.08, uCenter.y + lp.y);
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const ARC_FS = /* glsl */ `
${GLSL_PRELUDE}
uniform vec3 uColor;
uniform float uRadius;
uniform float uMaskLo;
uniform float uMaskHi;
uniform float uHold;
uniform float uCover;
uniform float uCascade;
uniform float uGhost;
varying vec2 vLocal;
varying vec3 vWorld;
void main() {
  float d = length(vLocal);
  float ang = atan(vLocal.y, vLocal.x); // same convention as the sim (atan2(z, x))
  float fb = (ang + 3.14159265) / 6.2831853 * 36.0;
  int bin = int(clamp(floor(fb), 0.0, 35.0));
  int lo = int(uMaskLo + 0.5);
  int hi = int(uMaskHi + 0.5);
  float covered = bin < 18 ? float((lo >> bin) & 1) : float((hi >> (bin - 18)) & 1);
  float gap = smoothstep(0.0, 0.12, fract(fb)) * smoothstep(1.0, 0.88, fract(fb));
  float w = 0.22 + 0.18 * uHold;
  float line = 1.0 - smoothstep(w * 0.5, w, abs(d - uRadius));
  float glow = exp(-pow((d - uRadius) / (0.9 + 1.4 * uHold), 2.0));
  // covered 10° bins: solid light line; open bins: faint dots marking the gap to close
  float dots = (1.0 - smoothstep(0.12, 0.3, length(vec2(fract(fb * 3.0) - 0.5, (d - uRadius) / 0.6)))) * 0.35;
  float a = mix(dots, line * gap * (0.75 + 0.25 * uHold), covered);
  a += glow * covered * (0.12 + 0.3 * uHold);
  // cascade: the ring collapses inward as a bright wave
  if (uCascade > 0.0) {
    float rr = uRadius * (1.0 - uCascade);
    a = max(a * (1.0 - uCascade), exp(-pow((d - rr) / 1.4, 2.0)) * 0.8 * (1.0 - uCascade * 0.6));
  }
  // FTUE ghost arc: soft white dashed guide circle
  if (uGhost > 0.0) {
    float dash = step(0.5, fract(fb * 1.5 - uTime * 0.6));
    a = max(a, line * dash * 0.55 * uGhost + glow * 0.12 * uGhost);
  }
  vec3 col = mix(uColor, vec3(1.0), 0.15 * uHold + 0.3 * uCascade) * (0.9 + 0.6 * uHold);
  if (uGhost > 0.0 && covered < 0.5) col = mix(col, vec3(1.0, 0.95, 0.85), uGhost);
  if (a < 0.003) discard;
  gl_FragColor = vec4(agx(col) * a, a);
}
`;

const SHOCK_FS = /* glsl */ `
${GLSL_PRELUDE}
uniform vec3 uColor;
uniform float uK;
varying vec2 vLocal;
varying vec3 vWorld;
void main() {
  float d = length(vLocal);
  float R = 8.0 + 62.0 * (1.0 - pow(1.0 - uK, 2.2));
  float ring = exp(-pow((d - R) / (0.7 + 1.6 * uK), 2.0));
  float inner = exp(-pow((d - R * 0.85) / 3.0, 2.0)) * 0.18;
  float a = (ring + inner) * pow(1.0 - uK, 1.4) * 0.75;
  if (a < 0.003) discard;
  vec3 col = mix(vec3(1.0, 0.95, 0.85), uColor, 0.7) * 1.2;
  gl_FragColor = vec4(agx(col) * a, a);
}
`;

const CURTAIN_VS = /* glsl */ `
uniform float uRadius;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec3 p = vec3(position.x * uRadius, position.y, position.z * uRadius);
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const CURTAIN_FS = /* glsl */ `
uniform float uOn;
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorld;
float h1(float x) { return fract(sin(x * 91.17) * 43758.5453); }
void main() {
  float y = vUv.y;
  float ang = atan(vWorld.z, vWorld.x);
  float streak = 0.6 + 0.4 * sin(ang * 90.0 + uTime * 0.8) * sin(ang * 37.0 - uTime * 0.5);
  float a = pow(1.0 - y, 2.2) * streak * uOn;
  a += exp(-y * 30.0) * 0.6 * uOn;
  vec3 c = mix(vec3(1.0, 0.70, 0.42), vec3(1.0, 0.88, 0.7), exp(-y * 12.0));
  gl_FragColor = vec4(c * a * 0.42, 1.0);
}
`;

const HAWK_VS = /* glsl */ `
${GLSL_PRELUDE}
attribute float wingWeight;
uniform vec4 uPose; // x, z, alt, flap
uniform vec2 uDir;
uniform float uScale;
varying vec3 vWorld;
void main() {
  vec3 lp = position;
  if (wingWeight > 0.0) {
    float s = lp.x > 0.0 ? 1.0 : -1.0;
    float r = abs(lp.x) - 0.07;
    float a = uPose.w * (0.5 + 0.5 * wingWeight);
    lp.x = s * (0.07 + r * cos(a));
    lp.y += r * sin(a);
  }
  lp *= uScale;
  vec3 fwd = vec3(uDir.x, 0.0, uDir.y);
  vec3 right = vec3(-uDir.y, 0.0, uDir.x);
  vec3 wp = vec3(uPose.x, uPose.z, uPose.y) + right * lp.x + vec3(0.0, lp.y, 0.0) + fwd * lp.z;
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const HAWK_FS = /* glsl */ `
${GLSL_PRELUDE}
varying vec3 vWorld;
void main() {
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 V = normalize(uCamPos - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(uSunDir);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  vec3 col = vec3(0.012, 0.010, 0.010) + uSunColor * fr * 0.3 + uSkyZenith * 0.08;
  gl_FragColor = vec4(finalColor(col, gl_FragCoord.xy), 1.0);
}
`;

const SHADOW_FS = /* glsl */ `
${GLSL_PRELUDE}
uniform vec2 uDir;
uniform float uA;
uniform float uWarn;
varying vec2 vLocal;
varying vec3 vWorld;
void main() {
  vec2 f = vec2(dot(vLocal, uDir), dot(vLocal, vec2(-uDir.y, uDir.x)));
  // soft falcon-shaped shadow: long wings across, short body along
  float body = exp(-(f.x * f.x) / 9.0 - (f.y * f.y) / 0.8);
  float wings = exp(-(f.y * f.y) / 22.0 - pow(f.x + 0.12 * f.y * f.y * 0.1, 2.0) / 1.6);
  float s = clamp(body + wings, 0.0, 1.0);
  float ring = exp(-pow((length(vLocal) - (5.0 + 2.0 * sin(uTime * 6.0))) / 0.6, 2.0)) * uWarn * 0.5;
  float a = s * uA * 0.55 + ring;
  if (a < 0.003) discard;
  vec3 col = mix(vec3(0.0), vec3(1.0, 0.85, 0.7) * 0.6, ring / max(a, 1e-3));
  gl_FragColor = vec4(agx(col) * a, a);
}
`;

const CLOUD_VS = /* glsl */ `
attribute vec4 aC; // offset x, z, alt, size
attribute float aSeed;
uniform vec3 uStormPos; // x, z, fade
varying vec2 vQ;
varying float vSeed;
varying vec3 vWorld;
void main() {
  vec3 center = vec3(uStormPos.x + aC.x, aC.z, uStormPos.y + aC.y);
  vec4 mv = viewMatrix * vec4(center, 1.0);
  mv.xy += position.xy * aC.w;
  vQ = position.xy;
  vSeed = aSeed;
  vWorld = center;
  gl_Position = projectionMatrix * mv;
}
`;

const CLOUD_FS = /* glsl */ `
${GLSL_PRELUDE}
uniform vec3 uStormPos;
varying vec2 vQ;
varying float vSeed;
varying vec3 vWorld;
void main() {
  float r = length(vQ);
  float n = fbm(vQ * 1.6 + vSeed * 13.0 + vec2(uTime * 0.03, 0.0));
  float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.7) * uStormPos.z;
  if (a < 0.004) discard;
  // lit top (warm sunset edge), cold heavy belly
  float top = clamp(vQ.y * 0.5 + 0.5 + (n - 0.5) * 0.8, 0.0, 1.0);
  vec3 belly = vec3(0.012, 0.014, 0.022);
  vec3 lit = mix(uSkyMid * 0.25, uSunColor * 0.12, 0.35);
  vec3 col = mix(belly, lit, top * top * 0.8) + vec3(0.6, 0.68, 0.9) * uLightning * (0.35 + 0.4 * n);
  col = applyNight(col, nightMask(vWorld.xz) * 0.6);
  gl_FragColor = vec4(agx(col) * a * 0.72, a * 0.72);
}
`;

const RAIN_VS = /* glsl */ `
attribute vec4 aR; // offset x, z, width, seed
uniform vec3 uStormPos;
varying vec2 vUv;
varying float vSeed;
void main() {
  vec3 base = vec3(uStormPos.x + aR.x, 0.0, uStormPos.y + aR.y);
  vec4 mv = viewMatrix * vec4(base + vec3(0.0, position.y * 30.0, 0.0), 1.0);
  mv.x += position.x * aR.z;
  vUv = vec2(position.x * 0.5 + 0.5, position.y);
  vSeed = aR.w;
  gl_Position = projectionMatrix * mv;
}
`;

const RAIN_FS = /* glsl */ `
uniform float uTime;
uniform vec3 uStormPos;
varying vec2 vUv;
varying float vSeed;
float h1(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float col = floor(vUv.x * 60.0);
  float sp = 0.6 + 0.4 * h1(vec2(col, vSeed));
  float y = fract(vUv.y * 3.0 + uTime * 1.6 * sp + h1(vec2(col, vSeed + 1.0)));
  float streak = smoothstep(0.0, 0.05, y) * smoothstep(0.35, 0.06, y) * step(0.45, h1(vec2(col, vSeed + 2.0)));
  float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(1.0, 0.7, vUv.y);
  float a = streak * edge * 0.22 * uStormPos.z;
  gl_FragColor = vec4(vec3(0.55, 0.6, 0.72) * a, 1.0);
}
`;

interface ArcSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
}
interface ShockSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  start: number;
  active: boolean;
}

export class Effects {
  private readonly arcs: ArcSlot[] = [];
  private readonly shocks: ShockSlot[] = [];
  private readonly curtain: THREE.Mesh;
  private readonly curtainMat: THREE.ShaderMaterial;
  private readonly hawkMeshes: THREE.Mesh[] = [];
  private readonly shadowMeshes: THREE.Mesh[] = [];
  private readonly clouds: THREE.Mesh;
  private readonly rain: THREE.Mesh;
  private readonly stormU: { value: THREE.Vector3 };
  private readonly ghost: ArcSlot;
  private stormFade = 0;
  private readonly colors: THREE.Vector3[] = [];
  private readonly quad: THREE.PlaneGeometry;

  constructor(scene: THREE.Scene, g: SuruGlobals) {
    for (let f = 0; f < 17; f++) {
      const c = f === 0 ? [1, 1, 1] : hexToLinear(ownerStyle(f).color);
      this.colors.push(new THREE.Vector3(c[0], c[1], c[2]));
    }
    this.quad = new THREE.PlaneGeometry(2, 2);
    this.quad.rotateX(-Math.PI / 2);
    const decalOpts = {
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    } as const;
    const mkArc = (): ArcSlot => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...g,
          uCenter: { value: new THREE.Vector3() },
          uColor: { value: new THREE.Vector3(1, 1, 1) },
          uRadius: { value: 10 },
          uMaskLo: { value: 0 },
          uMaskHi: { value: 0 },
          uHold: { value: 0 },
          uCover: { value: 0 },
          uCascade: { value: 0 },
          uGhost: { value: 0 },
        },
        vertexShader: ARC_VS,
        fragmentShader: ARC_FS,
        ...decalOpts,
      });
      const mesh = new THREE.Mesh(this.quad, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, mat };
    };
    for (let k = 0; k < 6; k++) this.arcs.push(mkArc());
    this.ghost = mkArc();
    for (let k = 0; k < 4; k++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...g, uCenter: { value: new THREE.Vector3(0, 0, 80) }, uColor: { value: new THREE.Vector3(1, 1, 1) }, uK: { value: 0 } },
        vertexShader: ARC_VS,
        fragmentShader: SHOCK_FS,
        ...decalOpts,
      });
      const mesh = new THREE.Mesh(this.quad, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      mesh.visible = false;
      scene.add(mesh);
      this.shocks.push({ mesh, mat, start: 0, active: false });
    }
    // sunset ring light curtain
    const cyl = new THREE.CylinderGeometry(1, 1, 26, 160, 1, true);
    cyl.translate(0, 13, 0);
    this.curtainMat = new THREE.ShaderMaterial({
      uniforms: { uRadius: { value: 300 }, uOn: { value: 0 }, uTime: g.uTime },
      vertexShader: CURTAIN_VS,
      fragmentShader: CURTAIN_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.curtain = new THREE.Mesh(cyl, this.curtainMat);
    this.curtain.frustumCulled = false;
    this.curtain.renderOrder = 7;
    this.curtain.visible = false;
    scene.add(this.curtain);
    // hawks + water shadows
    const hg = buildHawk();
    for (let k = 0; k < 3; k++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...g, uPose: { value: new THREE.Vector4() }, uDir: { value: new THREE.Vector2(0, -1) }, uScale: { value: 2.2 } },
        vertexShader: HAWK_VS,
        fragmentShader: HAWK_FS,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(hg, mat);
      m.frustumCulled = false;
      m.visible = false;
      scene.add(m);
      this.hawkMeshes.push(m);
      const smat = new THREE.ShaderMaterial({
        uniforms: { ...g, uCenter: { value: new THREE.Vector3(0, 0, 9) }, uDir: { value: new THREE.Vector2(0, -1) }, uA: { value: 0 }, uWarn: { value: 0 } },
        vertexShader: ARC_VS,
        fragmentShader: SHADOW_FS,
        ...decalOpts,
      });
      const sm = new THREE.Mesh(this.quad, smat);
      sm.frustumCulled = false;
      sm.renderOrder = 2;
      sm.visible = false;
      scene.add(sm);
      this.shadowMeshes.push(sm);
    }
    // storm: cloud cards + rain curtains
    this.stormU = { value: new THREE.Vector3(0, 0, 0) };
    const cq = new THREE.PlaneGeometry(2, 2);
    const cgeo = new THREE.InstancedBufferGeometry();
    cgeo.setAttribute('position', cq.getAttribute('position'));
    cgeo.setIndex(cq.getIndex());
    const nC = 16;
    const aC = new Float32Array(nC * 4);
    const aS = new Float32Array(nC);
    for (let k = 0; k < nC; k++) {
      const a = k * 2.39996;
      const r = 40 * Math.sqrt((k + 0.5) / nC);
      aC.set([Math.cos(a) * r, Math.sin(a) * r, 30 + (k % 4) * 3.5, 22 + (k % 5) * 4], k * 4);
      aS[k] = k * 0.731;
    }
    cgeo.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 4));
    cgeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aS, 1));
    cgeo.instanceCount = nC;
    this.clouds = new THREE.Mesh(
      cgeo,
      new THREE.ShaderMaterial({ uniforms: { ...g, uStormPos: this.stormU }, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, ...decalOpts }),
    );
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = 8;
    scene.add(this.clouds);
    const rq = new THREE.PlaneGeometry(2, 1);
    rq.translate(0, 0.5, 0);
    const rgeo = new THREE.InstancedBufferGeometry();
    rgeo.setAttribute('position', rq.getAttribute('position'));
    rgeo.setIndex(rq.getIndex());
    const nR = 10;
    const aR = new Float32Array(nR * 4);
    for (let k = 0; k < nR; k++) {
      const a = k * 2.39996 + 0.4;
      const r = 32 * Math.sqrt((k + 0.5) / nR);
      aR.set([Math.cos(a) * r, Math.sin(a) * r, 10 + (k % 3) * 4, k * 1.37], k * 4);
    }
    rgeo.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 4));
    rgeo.instanceCount = nR;
    this.rain = new THREE.Mesh(
      rgeo,
      new THREE.ShaderMaterial({
        uniforms: { uStormPos: this.stormU, uTime: g.uTime },
        vertexShader: RAIN_VS,
        fragmentShader: RAIN_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 7;
    scene.add(this.rain);
  }

  setTier(t: QualityTier): void {
    (this.rain.geometry as THREE.InstancedBufferGeometry).instanceCount = t === 'low' ? 5 : 10;
    (this.clouds.geometry as THREE.InstancedBufferGeometry).instanceCount = t === 'low' ? 9 : 16;
  }

  /** KUŞATMA shockwave at (x, z) in the attacker's colour. */
  shockwave(x: number, z: number, attacker: number, time: number): void {
    let slot = this.shocks.find((s) => !s.active);
    if (!slot) slot = this.shocks[0];
    slot.active = true;
    slot.start = time;
    (slot.mat.uniforms.uCenter.value as THREE.Vector3).set(x, z, 80);
    (slot.mat.uniforms.uColor.value as THREE.Vector3).copy(this.colors[attacker] ?? this.colors[0]);
    slot.mesh.visible = true;
  }

  /** FTUE: show a glowing guide circle around (x, z). */
  setGhostArc(on: boolean, x = 0, z = 0, radius = 12): void {
    const m = this.ghost.mat.uniforms;
    this.ghost.mesh.visible = on;
    (m.uCenter.value as THREE.Vector3).set(x, z, radius + 6);
    m.uRadius.value = radius;
    m.uGhost.value = on ? 1 : 0;
    (m.uColor.value as THREE.Vector3).copy(this.colors[1]);
  }

  update(src: FlockRenderSource, alpha: number, time: number, player: number, interest: (target: number, attacker: number) => boolean): void {
    // ---- siege arcs: strongest first, player-related always ----
    let used = 0;
    const sieges = src.sieges;
    for (let k = 0; k < sieges.length && used < this.arcs.length; k++) {
      const s = sieges[k];
      if (s.attacker === 0 || !(s.coverage01 >= 0.3 || s.cascading)) continue;
      if (!interest(s.target, s.attacker) && s.coverage01 < 0.6 && !s.cascading) continue;
      const tx = src.leaderPrevX[s.target] + (src.leaderX[s.target] - src.leaderPrevX[s.target]) * alpha;
      const tz = src.leaderPrevZ[s.target] + (src.leaderZ[s.target] - src.leaderPrevZ[s.target]) * alpha;
      const R = s.radius > 4 ? s.radius : src.flockRadius(s.target) + 6;
      const a = this.arcs[used++];
      const u = a.mat.uniforms;
      (u.uCenter.value as THREE.Vector3).set(tx, tz, R + 9);
      u.uRadius.value = R;
      u.uMaskLo.value = s.binsLo;
      u.uMaskHi.value = s.binsHi;
      u.uHold.value = s.hold01;
      u.uCover.value = s.coverage01;
      const casK = s.cascading ? Math.min(1, Math.max(0, (src.tick - 1 + alpha - s.cascadeStartTick) / 45)) : 0;
      u.uCascade.value = casK;
      (u.uColor.value as THREE.Vector3).copy(this.colors[s.attacker]);
      a.mesh.visible = true;
    }
    for (let k = used; k < this.arcs.length; k++) this.arcs[k].mesh.visible = false;
    void player;
    // ---- shockwaves ----
    for (const s of this.shocks) {
      if (!s.active) continue;
      const k = (time - s.start) / 1.6;
      if (k >= 1) {
        s.active = false;
        s.mesh.visible = false;
      } else s.mat.uniforms.uK.value = k;
    }
    // ---- sunset ring curtain ----
    this.curtain.visible = src.ringActive;
    this.curtainMat.uniforms.uRadius.value = src.ringRadius;
    this.curtainMat.uniforms.uOn.value = src.ringActive ? 1 : 0;
    // ---- hawks ----
    const hawks = src.hawks;
    for (let k = 0; k < this.hawkMeshes.length; k++) {
      const h = k < hawks.length ? hawks[k] : null;
      const hm = this.hawkMeshes[k];
      const sm = this.shadowMeshes[k];
      if (!h || h.phase === 0 || h.phase === 4) {
        hm.visible = false;
        sm.visible = false;
        continue;
      }
      const x = h.prevX + (h.x - h.prevX) * alpha;
      const z = h.prevZ + (h.z - h.prevZ) * alpha;
      const age = (src.tick - 1 + alpha - h.phaseTick) / 30;
      let alt: number;
      let flap: number;
      let dx = h.x - h.prevX;
      let dz = h.z - h.prevZ;
      const dl = Math.hypot(dx, dz);
      if (h.phase === 1) {
        // high circling: the hawk is up in the light, its shadow on the water is the warning
        alt = 46 - age * 4;
        const a = time * 1.6 + k * 2.1;
        dx = Math.cos(a);
        dz = Math.sin(a);
        flap = 0.15 * Math.sin(time * 4 + k);
      } else if (h.phase === 2) {
        alt = Math.max(13, 38 - age * 30);
        flap = -0.35; // tucked dive
      } else {
        alt = 13 + age * age * 12;
        flap = 0.7 * Math.sin(time * 14 + k);
      }
      if (h.phase !== 1 && dl > 1e-4) {
        dx /= dl;
        dz /= dl;
      } else if (h.phase !== 1) {
        dx = 0;
        dz = -1;
      }
      const hu = (hm.material as THREE.ShaderMaterial).uniforms;
      (hu.uPose.value as THREE.Vector4).set(h.phase === 1 ? x + Math.cos(time * 1.6 + k * 2.1 + 1.57) * 9 : x, h.phase === 1 ? z + Math.sin(time * 1.6 + k * 2.1 + 1.57) * 9 : z, alt, flap);
      (hu.uDir.value as THREE.Vector2).set(dx, dz);
      hm.visible = true;
      const su = (sm.material as THREE.ShaderMaterial).uniforms;
      // shadow: grows sharper as the hawk descends
      const sa = h.phase === 1 ? 0.45 + 0.3 * Math.min(1, age / 2) : h.phase === 2 ? 0.85 : Math.max(0, 0.6 - age * 0.4);
      (su.uCenter.value as THREE.Vector3).set(x, z, 9);
      (su.uDir.value as THREE.Vector2).set(dx, dz);
      su.uA.value = sa;
      su.uWarn.value = h.phase === 1 ? 1 : 0;
      sm.visible = true;
    }
    // ---- storm ----
    const st = src.storm;
    const targetFade = st.active ? 1 : 0;
    this.stormFade += (targetFade - this.stormFade) * 0.05;
    const sx = st.prevX + (st.x - st.prevX) * alpha;
    const sz = st.prevZ + (st.z - st.prevZ) * alpha;
    this.stormU.value.set(sx, sz, this.stormFade);
    this.clouds.visible = this.stormFade > 0.01;
    this.rain.visible = this.stormFade > 0.01;
  }

  dispose(): void {
    const mats = new Set<THREE.Material>();
    for (const a of [...this.arcs, this.ghost]) mats.add(a.mat);
    for (const s of this.shocks) mats.add(s.mat);
    for (const m of [...this.hawkMeshes, ...this.shadowMeshes, this.curtain, this.clouds, this.rain]) mats.add(m.material as THREE.Material);
    for (const m of mats) m.dispose();
    this.quad.dispose();
    this.curtain.geometry.dispose();
    this.clouds.geometry.dispose();
    this.rain.geometry.dispose();
    if (this.hawkMeshes[0]) this.hawkMeshes[0].geometry.dispose();
  }
}

/** Deterministic visual lightning: single flashes at ≤ 0.5 Hz (period ≥ 3.1 s), no flicker (§2.13 ≤ 3 Hz). */
export function lightningAt(time: number, active: boolean): number {
  if (!active) return 0;
  const period = 3.1;
  const k = Math.floor(time / period);
  const h = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;
  if (h < 0.35) return 0;
  const t = time - k * period - h * 1.2;
  if (t < 0 || t > 0.6) return 0;
  return Math.exp(-t * 9);
}
