// Shared GLSL for the SÜRÜ.io scene (BRIEF §3.8): one analytic sunset sky used by the sky dome, the water
// reflection and object ambient light, plus in-shader tone mapping + grade (no post chain on any tier, §3.6).
// All custom shaders are highp (§5.5); time uniforms are wrapped on the CPU.

import * as THREE from 'three';

/** Uniform objects shared by reference between all SÜRÜ materials. */
export interface SuruGlobals {
  uTime: { value: number };
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uSkyZenith: { value: THREE.Color };
  uSkyMid: { value: THREE.Color };
  uSkyLow: { value: THREE.Color };
  uSkyHorizon: { value: THREE.Color };
  uSea: { value: THREE.Color };
  uNight: { value: number };
  uExposure: { value: number };
  uRing: { value: THREE.Vector4 }; // x radius, y active (0/1), z time since ring start, w unused
  uStorm: { value: THREE.Vector4 }; // x, z, radius, active
  uLightning: { value: number };
  uGust: { value: THREE.Vector4 }; // dirX, dirZ, offset, phase (0 none, 1 warn, 2 active)
  uGustMix: { value: number };
  uLighthouse: { value: THREE.Vector4 }; // x, z, on(0..1), beam angle
  uCamPos: { value: THREE.Vector3 };
}

export function createGlobals(): SuruGlobals {
  return {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 0.1, -1).normalize() },
    uSunColor: { value: new THREE.Color(1, 0.6, 0.3) },
    uSkyZenith: { value: new THREE.Color('#1C2340') },
    uSkyMid: { value: new THREE.Color('#6B3F69') },
    uSkyLow: { value: new THREE.Color('#E0735A') },
    uSkyHorizon: { value: new THREE.Color('#FFC48A') },
    uSea: { value: new THREE.Color('#2A3550') },
    uNight: { value: 0 },
    uExposure: { value: 1 },
    uRing: { value: new THREE.Vector4(300, 0, 0, 0) },
    uStorm: { value: new THREE.Vector4(0, 0, 45, 0) },
    uLightning: { value: 0 },
    uGust: { value: new THREE.Vector4(1, 0, 0, 0) },
    uGustMix: { value: 0 },
    uLighthouse: { value: new THREE.Vector4(0, 0, 0, 0) },
    uCamPos: { value: new THREE.Vector3() },
  };
}

export const GLSL_GLOBALS = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyMid;
uniform vec3 uSkyLow;
uniform vec3 uSkyHorizon;
uniform vec3 uSea;
uniform float uNight;
uniform float uExposure;
uniform vec4 uRing;
uniform vec4 uStorm;
uniform float uLightning;
uniform vec4 uGust;
uniform float uGustMix;
uniform vec4 uLighthouse;
uniform vec3 uCamPos;
`;

export const GLSL_COMMON = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int k = 0; k < 4; k++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return s;
}

// Analytic sunset sky (zenith → mid → low → horizon band) + sun disc and Mie glow. Linear RGB, HDR.
vec3 skyColor(vec3 dir) {
  float y = dir.y;
  float h = clamp(y, -0.2, 1.0);
  float t0 = smoothstep(0.0, 0.07, h);
  float t1 = smoothstep(0.05, 0.28, h);
  float t2 = smoothstep(0.22, 0.85, h);
  vec3 c = mix(uSkyHorizon, uSkyLow, t0);
  c = mix(c, uSkyMid, t1);
  c = mix(c, uSkyZenith, t2);
  // warm scattering toward the sun azimuth
  vec3 sd = uSunDir;
  float mu = dot(normalize(dir), sd);
  vec2 hz = normalize(vec2(dir.x, dir.z) + 1e-5);
  vec2 hs = normalize(vec2(sd.x, sd.z) + 1e-5);
  float az = dot(hz, hs) * 0.5 + 0.5;
  float sunVis = smoothstep(-0.07, 0.02, sd.y);
  c += uSunColor * (pow(az, 8.0) * exp(-max(h, 0.0) * 9.0) * 0.5 * (0.35 + 0.65 * sunVis));
  c += uSunColor * pow(max(mu, 0.0), 260.0) * 1.6 * sunVis;
  c += uSunColor * pow(max(mu, 0.0), 40.0) * 0.22 * (0.4 + 0.6 * sunVis);
  c += uSunColor * pow(max(mu, 0.0), 8.0) * 0.05 * (0.4 + 0.6 * sunVis);
  // sun disc (clipped by the horizon)
  float disc = smoothstep(0.99962, 0.9998, mu) * smoothstep(-0.004, 0.004, y);
  c += uSunColor * disc * 9.0 * sunVis;
  // below the horizon: sea haze colour
  c = mix(c, mix(uSea * 1.2, uSkyHorizon * 0.55, 0.35), smoothstep(0.0, -0.08, y));
  return c;
}

// AgX-inspired filmic curve (fitted polynomial, Wrensch "AgX minimal") — keeps sunset highlights soft.
vec3 agxContrast(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 agx(vec3 col) {
  const mat3 m = mat3(0.842479062253094, 0.0423282422610123, 0.0423756549057051,
                      0.0784335999999992, 0.878468636469772, 0.0784336,
                      0.0792237451477643, 0.0791661274605434, 0.879142973793104);
  const float minEv = -12.47393;
  const float maxEv = 4.026069;
  col = m * col;
  col = clamp(log2(max(col, vec3(1e-10))), minEv, maxEv);
  col = (col - minEv) / (maxEv - minEv);
  col = agxContrast(col);
  const mat3 mi = mat3(1.19687900512017, -0.0528968517574562, -0.0529716355144438,
                       -0.0980208811401368, 1.15190312990417, -0.0980434501171241,
                       -0.0990297440797205, -0.0989611768448433, 1.15107367264116);
  col = mi * col;
  return col; // display-referred, already ~sRGB encoded by the curve
}

// Grade: warm gold → blue-violet as the sun sets (LUT replacement in-shader), saturation + split tone.
vec3 grade(vec3 c) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowTint = mix(vec3(0.98, 0.93, 1.06), vec3(0.86, 0.9, 1.16), uNight);
  vec3 highTint = mix(vec3(1.05, 0.99, 0.9), vec3(0.96, 0.96, 1.05), uNight);
  c *= mix(shadowTint, highTint, smoothstep(0.1, 0.7, l));
  float sat = mix(1.06, 0.9, uNight);
  c = mix(vec3(l), c, sat);
  // gentle S-curve: deeper water/sky darks, crisper glints (AgX alone reads a little flat at dusk)
  c = clamp(c, 0.0, 1.0);
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.3);
  return c;
}

vec3 finalColor(vec3 hdr, vec2 fragCoord) {
  vec3 c = agx(hdr * uExposure);
  c = grade(c);
  // dithering (no banding in gradients, §3.4)
  c += (hash12(fragCoord) - 0.5) / 255.0;
  return clamp(c, 0.0, 1.0);
}

// Night outside the sunset ring + storm tint (shared by water, birds and props)
float nightMask(vec2 xz) {
  if (uRing.y < 0.5) return 0.0;
  float d = length(xz);
  return smoothstep(uRing.x - 2.0, uRing.x + 10.0, d);
}
vec3 applyNight(vec3 c, float m) {
  if (m <= 0.0) return c;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 night = vec3(0.012, 0.018, 0.05);
  vec3 desat = mix(vec3(l), c, 0.6);
  return mix(c, desat * vec3(0.38, 0.45, 0.72) + night, m);
}
float stormMask(vec2 xz) {
  if (uStorm.w < 0.5) return 0.0;
  float d = length(xz - uStorm.xy);
  return 1.0 - smoothstep(uStorm.z * 0.75, uStorm.z * 1.15, d);
}
vec3 applyStorm(vec3 c, float m) {
  if (m <= 0.0) return c;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 cold = mix(vec3(l), c, 0.45) * vec3(0.62, 0.7, 0.82);
  return mix(c, cold + vec3(0.6, 0.7, 0.9) * uLightning * 0.25, m);
}
`;

/** Standard material prefix: globals + common library. */
export const GLSL_PRELUDE = GLSL_GLOBALS + GLSL_COMMON;
