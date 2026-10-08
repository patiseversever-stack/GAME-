// KANAT atmosphere: global analytic height fog + art-directed analytic sky + sun + ambient SH + grade block.
//
// installAtmosphere() replaces three.js fog ShaderChunks so EVERY material with `fog: true` (built-in
// MeshStandard/Basic/Lambert/Points/Sprite..., and custom ShaderMaterials that include the <fog_*> chunks and
// spread `atmosphereUniforms` into their uniforms) gets:
//   - analytic exponential height-fog integral  F = (a/b)·e^(−b·y_cam)·(1−e^(−b·dir_y·t))/dir_y  (stable mean-density
//     form, limit for dir_y≈0), evaluated camera-relative (no large-coordinate precision loss),
//   - in-scatter colour = sky colour along the view dir (same analytic function the sky dome uses, so the far
//     horizon is seamless) + Henyey-Greenstein (g = 0.76) sun halo,
//   - a ground-fog layer (Kapadokya golden valley fog) with drifting noise,
//   - a tier view-distance fade (terrain edge never visible) and an "inside cloud" fog ramp (Karadeniz).
// Fog is applied BEFORE tone mapping (in linear HDR) by hooking <tonemapping_fragment>; <fog_fragment> only
// applies it when a shader has no tone-mapping chunk. On the Low tier (no composer, renderer.toneMapping = AgX)
// <tonemapping_fragment> additionally runs the shared grade block (lift/gamma/gain, contrast, saturation, split
// toning, vignette, grain+dither) so Low has the same mood as the post chain of Medium+.
//
// Uniform sharing trick: values are Float32Arrays. three's cloneUniforms() copies non-three objects by
// reference, so the arrays injected into ShaderLib.*.uniforms are shared by every built-in material; mutate
// them in place (setAtmosphere / updateAtmosphereFrame do that) and all materials follow.
// All uniforms are designed so that all-zero values = neutral (no fog, identity grade): a material that forgets
// to bind them degrades gracefully instead of turning black.
import * as THREE from 'three';
import type { WorldId } from '../../sim/types.ts';
import { hexToLinear, kelvinToLinear } from '../color.ts';
import { LOOKS, type GradeParams, type WorldLook } from '../looks.ts';

type U = { value: Float32Array };
const u4 = (): U => ({ value: new Float32Array(4) });

/** Shared uniform objects. Spread into custom ShaderMaterial uniforms: `uniforms: { ...atmosphereUniforms, ...mine }`. */
export const atmosphereUniforms = {
  /** xyz = unit vector towards the sun (world), w = cos(sun disc angular radius). */
  kSun: u4(),
  /** rgb = sun irradiance (linear, intensity included), w = sky aureole strength. */
  kSunColor: u4(),
  /** rgb = zenith radiance, w = elevation curve exponent. */
  kSkyZenith: u4(),
  /** rgb = mid radiance, w = mid stop (0..1 in curved elevation). */
  kSkyMid: u4(),
  /** rgb = anti-sun horizon radiance, w = sun-side wedge sharpness. */
  kSkyHorizon: u4(),
  /** rgb = sun-side horizon radiance, w = sun disc HDR intensity. */
  kSkyHorizonSun: u4(),
  /** rgb = below-horizon haze radiance, w = unused. */
  kSkyGround: u4(),
  /** x = extinction at base (1/m), y = falloff (1/m), z = base height (m), w = HG halo strength. */
  kFog: u4(),
  /** rgb = in-scatter tint (multiplier), w = unused. */
  kFogTint: u4(),
  /** x = view-distance fade start, y = fade end (m), z = inside-cloud factor 0..1, w = inside-cloud extinction (1/m). */
  kFogFade: u4(),
  /** x = ground-fog extinction at floor (1/m), y = falloff (1/m), z = floor height (m), w = patchiness 0..1. */
  kGroundFog: u4(),
  /** rgb = ground-fog radiance, w = cloud-fog brightness. */
  kGroundFogColor: u4(),
  /** x = time (s, wrapped), y/z = wind direction xz (unit), w = debug flag (1 = magenta background). */
  kAtmoTime: u4(),
  /** Ambient sky light as 9 SH radiance coefficients (vec3[9], three.js SphericalHarmonics3 convention). */
  kSH: { value: new Float32Array(27) },
  /** Grade block (offsets from neutral; zeros = identity). A: lift.rgb, saturation−1. */
  kGradeA: u4(),
  /** B: (gamma−1).rgb, contrast−1. */
  kGradeB: u4(),
  /** C: (gain−1).rgb, (unused). */
  kGradeC: u4(),
  /** D: shadow tint offset.rgb, balance. */
  kGradeD: u4(),
  /** E: highlight tint offset.rgb, (unused). */
  kGradeE: u4(),
  /** F: vignette, grain, dither amplitude, (unused). */
  kGradeF: u4(),
  /** Screen: drawing-buffer width, height, 1/w, 1/h. */
  kScreen: u4(),
  // three.js fog compatibility (refreshFogUniforms writes these for ShaderMaterials with fog: true).
  fogColor: { value: new THREE.Color(0xffffff) },
  fogNear: { value: 1 },
  fogFar: { value: 2 },
  fogDensity: { value: 0 },
};

export type AtmosphereUniforms = typeof atmosphereUniforms;

/** Dummy scene fog: assign `scene.fog = atmosphereFog` to enable USE_FOG; its own colour/range are unused. */
export const atmosphereFog = new THREE.Fog(0xffffff, 1, 2);

// ---------------------------------------------------------------------------------------------------------------
// GLSL
// ---------------------------------------------------------------------------------------------------------------

/** Uniform declarations + sky/fog/SH/grade functions. Guarded, so it can be included more than once. */
export const ATMOSPHERE_GLSL = /* glsl */ `
#ifndef KANAT_ATMO_PARS
#define KANAT_ATMO_PARS
uniform vec4 kSun;
uniform vec4 kSunColor;
uniform vec4 kSkyZenith;
uniform vec4 kSkyMid;
uniform vec4 kSkyHorizon;
uniform vec4 kSkyHorizonSun;
uniform vec4 kSkyGround;
uniform vec4 kFog;
uniform vec4 kFogTint;
uniform vec4 kFogFade;
uniform vec4 kGroundFog;
uniform vec4 kGroundFogColor;
uniform vec4 kAtmoTime;
uniform vec3 kSH[ 9 ];
uniform vec4 kGradeA;
uniform vec4 kGradeB;
uniform vec4 kGradeC;
uniform vec4 kGradeD;
uniform vec4 kGradeE;
uniform vec4 kGradeF;
uniform vec4 kScreen;

float kHG( float mu, float g ) {
  float g2 = g * g;
  float d = max( 1.0 + g2 - 2.0 * g * mu, 1e-4 );
  return ( 1.0 - g2 ) / ( 12.566371 * d * sqrt( d ) );
}

float kHash12( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}

float kValueNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 w = f * f * ( 3.0 - 2.0 * f );
  float a = kHash12( i );
  float b = kHash12( i + vec2( 1.0, 0.0 ) );
  float c = kHash12( i + vec2( 0.0, 1.0 ) );
  float d = kHash12( i + vec2( 1.0, 1.0 ) );
  return mix( mix( a, b, w.x ), mix( c, d, w.x ), w.y );
}

// Sun-side horizon wedge weight (0 = anti-sun, 1 = towards the sun azimuth).
float kSunSide( vec3 dir ) {
  vec2 d = dir.xz;
  vec2 s = kSun.xz;
  float l = length( d ) * length( s );
  float c = l > 1e-5 ? dot( d, s ) / l : 0.0;
  return pow( c * 0.5 + 0.5, max( kSkyHorizon.w, 0.01 ) );
}

// Art-directed analytic sky radiance (linear). Palette stops (§3.2) with a Preetham-like shape:
// horizon brightening via the elevation curve, warm sun-side wedge, HG(0.76) aureole. No sun disc.
vec3 kanatSky( vec3 dir ) {
  float y = clamp( dir.y, -1.0, 1.0 );
  float e = pow( max( y, 0.0 ), max( kSkyZenith.w, 0.05 ) );
  float m = clamp( kSkyMid.w, 0.02, 0.98 );
  vec3 hz = mix( kSkyHorizon.rgb, kSkyHorizonSun.rgb, kSunSide( dir ) );
  vec3 lo = mix( hz, kSkyMid.rgb, smoothstep( 0.0, m, e ) );
  vec3 c = mix( lo, kSkyZenith.rgb, smoothstep( m, 1.0, e ) );
  c = mix( c, kSkyGround.rgb, smoothstep( 0.0, 0.3, -y ) );
  float mu = dot( dir, kSun.xyz );
  c += kSunColor.rgb * ( kSunColor.w * kHG( mu, 0.76 ) * ( 1.0 - 0.6 * smoothstep( 0.0, 0.8, y ) ) );
  return c;
}

// Sun disc (HDR) for the sky dome only.
vec3 kanatSunDisc( vec3 dir ) {
  float mu = dot( dir, kSun.xyz );
  float cr = kSun.w;
  float edge = ( 1.0 - cr ) * 0.35;
  float disc = smoothstep( cr - edge, cr + edge * 0.2, mu );
  return kSunColor.rgb * ( disc * kSkyHorizonSun.w );
}

// Mean of exp(-b*h) along a linear height segment h0 -> h1 (stable for h1≈h0, i.e. dir_y≈0).
float kMeanExp( float b, float h0, float h1 ) {
  float k = b * ( h1 - h0 );
  float e0 = exp( -b * h0 );
  return abs( k ) > 1e-3 ? e0 * ( 1.0 - exp( -k ) ) / k : e0 * ( 1.0 - 0.5 * k );
}

// Optical depths along camera-relative ray 'rel' (world metres): x = main height fog, y = ground fog, z = cloud.
vec3 kanatFogTau( vec3 rel ) {
  float t = length( rel );
  float yc = cameraPosition.y;
  float h0 = max( yc - kFog.z, -300.0 );
  float h1 = max( yc + rel.y - kFog.z, -300.0 );
  float tauM = kFog.x * t * kMeanExp( kFog.y, h0, h1 );
  float tauG = 0.0;
  if ( kGroundFog.x > 0.0 ) {
    float lo = -1.0 / max( kGroundFog.y, 1e-4 );
    float g0 = max( yc - kGroundFog.z, lo );
    float g1 = max( yc + rel.y - kGroundFog.z, lo );
    tauG = kGroundFog.x * t * kMeanExp( kGroundFog.y, g0, g1 );
  }
  float tauC = kFogFade.z * kFogFade.w * t;
  return vec3( tauM, tauG, tauC );
}

// Full fog: returns colour with fog applied. 'rel' = fragment position relative to the camera (world axes).
vec3 kanatFogApplyTau( vec3 col, vec3 rel, vec3 tau ) {
  float t = length( rel );
  vec3 dir = rel / max( t, 1e-3 );
  if ( kGroundFog.x > 0.0 && tau.y > 0.0 ) {
    vec2 wp = ( cameraPosition.xz + rel.xz ) * ( 1.0 / 170.0 ) - kAtmoTime.yz * ( kAtmoTime.x * 0.012 );
    float n = kValueNoise( wp ) * 0.65 + kValueNoise( wp * 2.7 + 13.1 ) * 0.35;
    tau.y *= mix( 1.0, n * 1.7, kGroundFog.w );
  }
  float tauSum = tau.x + tau.y + tau.z;
  float T = exp( -tauSum );
  float fade = smoothstep( kFogFade.x, max( kFogFade.y, kFogFade.x + 1.0 ), t );
  float mu = dot( dir, kSun.xyz );
  float hg = kHG( mu, 0.76 );
  vec3 skyDir = normalize( vec3( dir.x, max( dir.y, 0.0 ), dir.z ) + vec3( 0.0, 1e-4, 0.0 ) );
  vec3 skyCol = kanatSky( skyDir );
  vec3 cM = ( skyCol + kSunColor.rgb * ( kFog.w * hg ) ) * kFogTint.rgb;
  vec3 cG = kGroundFogColor.rgb * ( 1.0 + 2.0 * kFog.w * hg );
  vec3 cC = vec3( kGroundFogColor.w ) * ( 0.8 + 0.2 * hg );
  vec3 inC = ( cM * tau.x + cG * tau.y + cC * tau.z ) / max( tauSum, 1e-6 );
  // Distance fade blends to the exact sky colour (matches the dome at the horizon: no visible terrain edge).
  vec3 outC = mix( col * T + inC * ( 1.0 - T ), skyCol, fade );
  return outC;
}

vec3 kanatFogApply( vec3 col, vec3 rel ) {
  return kanatFogApplyTau( col, rel, kanatFogTau( rel ) );
}

// Sky ambient irradiance from SH (three.js shGetIrradianceAt convention). Divide by PI for Lambert radiance.
vec3 kanatIrradiance( vec3 n ) {
  float x = n.x, y = n.y, z = n.z;
  vec3 r = kSH[ 0 ] * 0.886227;
  r += kSH[ 1 ] * 2.0 * 0.511664 * y;
  r += kSH[ 2 ] * 2.0 * 0.511664 * z;
  r += kSH[ 3 ] * 2.0 * 0.511664 * x;
  r += kSH[ 4 ] * 2.0 * 0.429043 * x * y;
  r += kSH[ 5 ] * 2.0 * 0.429043 * y * z;
  r += kSH[ 6 ] * ( 0.743125 * z * z - 0.247708 );
  r += kSH[ 7 ] * 2.0 * 0.429043 * x * z;
  r += kSH[ 8 ] * 0.429043 * ( x * x - y * y );
  return max( r, vec3( 0.0 ) );
}

// Shared grade (display-referred, after AgX). Used in-material on Low and by the post GradeEffect on Medium+.
// All-zero uniforms = identity.
vec3 kanatGradeFinish( vec3 c, vec2 fragCoord ) {
  vec3 p = pow( max( c, vec3( 0.0 ) ), vec3( 1.0 / 2.2 ) );
  p = p * ( 1.0 + kGradeC.rgb ) + kGradeA.rgb * ( 1.0 - p );
  p = pow( max( p, vec3( 0.0 ) ), 1.0 / max( 1.0 + kGradeB.rgb, vec3( 0.05 ) ) );
  p = ( p - 0.45 ) * ( 1.0 + kGradeB.w ) + 0.45;
  float l = dot( p, vec3( 0.2126, 0.7152, 0.0722 ) );
  p = mix( vec3( l ), p, 1.0 + kGradeA.w );
  float bal = max( kGradeD.w, 0.05 );
  float wS = 1.0 - smoothstep( 0.0, bal * 1.6, l );
  float wH = smoothstep( bal * 0.6, 1.0, l );
  p += kGradeD.rgb * wS + kGradeE.rgb * wH;
  vec2 uv = fragCoord * kScreen.zw;
  vec2 d = uv - 0.5;
  d.x *= kScreen.x * kScreen.w;
  float vig = 1.0 - kGradeF.x * smoothstep( 0.12, 0.85, dot( d, d ) * 1.6 );
  p *= vig;
  float n1 = kHash12( fragCoord + fract( kAtmoTime.x * 7.13 ) * 113.0 );
  float n2 = kHash12( fragCoord * 1.37 + 17.0 + fract( kAtmoTime.x * 3.71 ) * 71.0 );
  float tri = n1 + n2 - 1.0;
  p += tri * ( kGradeF.y * ( 0.35 + 0.65 * ( 1.0 - abs( l - 0.5 ) * 2.0 ) ) * 0.5 + kGradeF.z );
  return pow( max( p, vec3( 0.0 ) ), vec3( 2.2 ) );
}
#endif
`;

const FOG_PARS_VERTEX = /* glsl */ `
#ifdef USE_FOG
${ATMOSPHERE_GLSL}
varying vec3 vKFogRel;
#ifdef KANAT_FOG_VERTEX
varying vec3 vKFogTau;
#endif
#endif
`;

const FOG_VERTEX = /* glsl */ `
#ifdef USE_FOG
  vKFogRel = ( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).xyz;
  #ifdef KANAT_FOG_VERTEX
  vKFogTau = kanatFogTau( vKFogRel );
  #endif
#endif
`;

const FOG_PARS_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
${ATMOSPHERE_GLSL}
varying vec3 vKFogRel;
#ifdef KANAT_FOG_VERTEX
varying vec3 vKFogTau;
#endif
vec3 kanatFogFragment( vec3 col ) {
#ifdef KANAT_FOG_VERTEX
  return kanatFogApplyTau( col, vKFogRel, vKFogTau );
#else
  return kanatFogApply( col, vKFogRel );
#endif
}
#endif
`;

const FOG_FRAGMENT = /* glsl */ `
#if defined( USE_FOG ) && !defined( KANAT_FOG_DONE )
  gl_FragColor.rgb = kanatFogFragment( gl_FragColor.rgb );
#endif
`;

const TONEMAPPING_FRAGMENT = /* glsl */ `
#if defined( USE_FOG ) && !defined( KANAT_FOG_DONE )
  gl_FragColor.rgb = kanatFogFragment( gl_FragColor.rgb );
  #define KANAT_FOG_DONE
#endif
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
  gl_FragColor.rgb = kanatGradeFinish( gl_FragColor.rgb, gl_FragCoord.xy );
#endif
`;

// ---------------------------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------------------------

export interface AtmosphereState {
  worldId: WorldId;
  look: WorldLook;
  /** Unit vector towards the sun. */
  sunDirection: THREE.Vector3;
  /** Sun chromaticity (linear, luminance 1) and intensity for a THREE.DirectionalLight. */
  sunColor: THREE.Color;
  sunIntensity: number;
  /** Radiance SH of sky + ground bounce (for THREE.LightProbe and custom shaders). */
  sh: THREE.SphericalHarmonics3;
  /** Height (m) of the main fog base and of the ground-fog floor (NaN if none). */
  fogBaseY: number;
  groundFogFloorY: number;
  /** Grade actually in use (world grade + optional photo filter). */
  grade: GradeParams;
}

export const atmosphereState: AtmosphereState = {
  worldId: 'kapadokya',
  look: LOOKS.kapadokya,
  sunDirection: new THREE.Vector3(0, 1, 0),
  sunColor: new THREE.Color(1, 1, 1),
  sunIntensity: 3,
  sh: new THREE.SphericalHarmonics3(),
  fogBaseY: 0,
  groundFogFloorY: Number.NaN,
  grade: { ...LOOKS.kapadokya.grade },
};

/** Loose view of world.json fields this module understands (terrain agent owns the real type). */
export interface WorldConfigLike {
  id?: string;
  sun?: { azimuthDeg?: number; elevationDeg?: number; kelvin?: number };
  wind?: { dirDeg?: number; speed?: number };
  fog?: { groundFog?: { top?: number; density?: number } | null };
  look?: { grade?: Partial<GradeParams>; floorY?: number };
}

export interface AtmosphereInput {
  id: WorldId;
  config?: WorldConfigLike | null;
  /** Terrain floor (e.g. 10th percentile of core heights): base of the main fog. */
  floorY?: number;
  /** Optional per-call look overrides (photo mode etc.). */
  grade?: Partial<GradeParams>;
}

let installed = false;

/** Replace the fog / tonemapping chunks and inject the shared uniforms into every ShaderLib entry. Idempotent. */
export function installAtmosphere(): void {
  if (installed) return;
  installed = true;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  chunks.fog_pars_vertex = FOG_PARS_VERTEX;
  chunks.fog_vertex = FOG_VERTEX;
  chunks.fog_pars_fragment = FOG_PARS_FRAGMENT;
  chunks.fog_fragment = FOG_FRAGMENT;
  chunks.tonemapping_fragment = TONEMAPPING_FRAGMENT;
  // Grade functions must exist whenever TONE_MAPPING is defined (also for fog:false materials on Low).
  chunks.tonemapping_pars_fragment = `${chunks.tonemapping_pars_fragment}\n${ATMOSPHERE_GLSL}`;
  const lib = THREE.ShaderLib as unknown as Record<string, { uniforms: Record<string, THREE.IUniform> }>;
  const shared: Record<string, THREE.IUniform> = {};
  for (const [k, v] of Object.entries(atmosphereUniforms)) {
    if (k.startsWith('fog')) continue;
    shared[k] = v as THREE.IUniform;
  }
  for (const key of Object.keys(lib)) {
    const entry = lib[key];
    if (entry && entry.uniforms) Object.assign(entry.uniforms, shared);
  }
  // Sensible neutral defaults until a world is set.
  setAtmosphere({ id: 'kapadokya' });
}

export function isAtmosphereInstalled(): boolean {
  return installed;
}

const tmp3 = new Float32Array(3);

function setRGB(u: U, hex: string, scale: number, w?: number): void {
  hexToLinear(hex, tmp3);
  u.value[0] = tmp3[0] * scale;
  u.value[1] = tmp3[1] * scale;
  u.value[2] = tmp3[2] * scale;
  if (w !== undefined) u.value[3] = w;
}

/** Sun direction from brief convention: azimuth 0 = north (−z), clockwise towards east (+x). */
export function sunDirectionFrom(azimuthDeg: number, elevationDeg: number, out = new THREE.Vector3()): THREE.Vector3 {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

function tintOffset(hex: string, strength: number, out: Float32Array): void {
  hexToLinear(hex, tmp3);
  // Perceptual-ish tint direction: normalise by luminance, offset from grey.
  const r = Math.pow(tmp3[0], 1 / 2.2);
  const g = Math.pow(tmp3[1], 1 / 2.2);
  const b = Math.pow(tmp3[2], 1 / 2.2);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b || 1;
  out[0] = (r / l - 1) * strength * 0.12;
  out[1] = (g / l - 1) * strength * 0.12;
  out[2] = (b / l - 1) * strength * 0.12;
}

/** Write grade params into the shared grade uniforms (used in-material on Low and by the post GradeEffect). */
export function setGrade(g: GradeParams): void {
  atmosphereState.grade = g;
  const A = atmosphereUniforms.kGradeA.value;
  const B = atmosphereUniforms.kGradeB.value;
  const C = atmosphereUniforms.kGradeC.value;
  const D = atmosphereUniforms.kGradeD.value;
  const E = atmosphereUniforms.kGradeE.value;
  const F = atmosphereUniforms.kGradeF.value;
  A[0] = g.lift[0]; A[1] = g.lift[1]; A[2] = g.lift[2]; A[3] = g.saturation - 1;
  B[0] = g.gamma[0] - 1; B[1] = g.gamma[1] - 1; B[2] = g.gamma[2] - 1; B[3] = g.contrast - 1;
  C[0] = g.gain[0] - 1; C[1] = g.gain[1] - 1; C[2] = g.gain[2] - 1; C[3] = 0;
  tintOffset(g.shadowTint, g.shadowStrength, tmp3);
  D[0] = tmp3[0]; D[1] = tmp3[1]; D[2] = tmp3[2]; D[3] = g.balance;
  tintOffset(g.highlightTint, g.highlightStrength, tmp3);
  E[0] = tmp3[0]; E[1] = tmp3[1]; E[2] = tmp3[2]; E[3] = 0;
  F[0] = g.vignette; F[1] = g.grain; F[2] = 0.5 / 255; F[3] = 0;
}

/** Configure sky, sun, fog, ground fog, SH and grade for a world. Call once per world load (cheap). */
export function setAtmosphere(input: AtmosphereInput): AtmosphereState {
  const look = LOOKS[input.id] ?? LOOKS.kapadokya;
  const cfg = input.config ?? null;
  const st = atmosphereState;
  st.worldId = look.id;
  st.look = look;
  const az = cfg?.sun?.azimuthDeg ?? look.sun.azimuthDeg;
  const el = cfg?.sun?.elevationDeg ?? look.sun.elevationDeg;
  sunDirectionFrom(az, el, st.sunDirection);
  kelvinToLinear(cfg?.sun?.kelvin ?? look.sun.kelvin, tmp3);
  st.sunColor.setRGB(tmp3[0], tmp3[1], tmp3[2], THREE.LinearSRGBColorSpace);
  st.sunIntensity = look.sun.intensity;

  const U = atmosphereUniforms;
  const sd = st.sunDirection;
  const discRadius = 0.0047 * 1.15 * look.sun.discScale; // ~0.27° real, painterly larger
  U.kSun.value.set([sd.x, sd.y, sd.z, Math.cos(discRadius)]);
  U.kSunColor.value.set([tmp3[0] * st.sunIntensity, tmp3[1] * st.sunIntensity, tmp3[2] * st.sunIntensity, look.sky.aureole]);

  // Sky palette, tinted very slightly by the sky colour temperature (keeps the palette, adds physical coherence).
  const sky = look.sky;
  const skyK = new Float32Array(3);
  kelvinToLinear(look.skyKelvin, skyK);
  const kMix = 0.12;
  const tintSky = (u: U, hex: string, w: number) => {
    setRGB(u, hex, sky.exposure, w);
    for (let i = 0; i < 3; i++) u.value[i] *= 1 - kMix + kMix * skyK[i];
  };
  tintSky(U.kSkyZenith, sky.zenith, sky.curve);
  tintSky(U.kSkyMid, sky.mid, sky.midStop);
  setRGB(U.kSkyHorizon, sky.horizon, sky.exposure, sky.sunSideSharpness);
  setRGB(U.kSkyHorizonSun, sky.horizonSun, sky.exposure, 9.0);
  setRGB(U.kSkyGround, sky.ground, sky.exposure * 0.8, 0);

  const floorY = input.floorY ?? cfg?.look?.floorY ?? 0;
  st.fogBaseY = floorY + look.fog.baseOffset;
  U.kFog.value.set([look.fog.density, look.fog.falloff, st.fogBaseY, look.fog.halo]);
  setRGB(U.kFogTint, look.fog.tint, 1, 0);

  const gf = look.groundFog;
  const cfgGf = cfg?.fog?.groundFog;
  if (gf && cfgGf !== null) {
    const top = cfgGf?.top ?? floorY + gf.thickness;
    const floor = top - gf.thickness;
    st.groundFogFloorY = floor;
    U.kGroundFog.value.set([gf.density, 3 / gf.thickness, floor, gf.patchiness]);
    setRGB(U.kGroundFogColor, gf.color, sky.exposure * 0.95, 1.6);
  } else {
    st.groundFogFloorY = Number.NaN;
    U.kGroundFog.value.set([0, 0.05, -1e4, 0]);
    setRGB(U.kGroundFogColor, '#FFFFFF', 1.6, 1.6);
  }
  const windDeg = cfg?.wind?.dirDeg ?? 250;
  const wr = (windDeg * Math.PI) / 180;
  U.kAtmoTime.value[1] = Math.sin(wr);
  U.kAtmoTime.value[2] = -Math.cos(wr);
  if (U.kFogFade.value[1] === 0) U.kFogFade.value.set([1e9, 1e9 + 1, 0, 0.02]);

  computeSkySH(st.sh, look);
  const sh = st.sh.coefficients;
  for (let i = 0; i < 9; i++) {
    U.kSH.value[i * 3] = sh[i].x;
    U.kSH.value[i * 3 + 1] = sh[i].y;
    U.kSH.value[i * 3 + 2] = sh[i].z;
  }
  setGrade({ ...look.grade, ...(cfg?.look?.grade ?? {}), ...(input.grade ?? {}) });
  return st;
}

/** Tier view distance: fog blends to the exact sky colour between start and end (no terrain edge, no pop). */
export function setAtmosphereViewDistance(start: number, end: number): void {
  atmosphereUniforms.kFogFade.value[0] = start;
  atmosphereUniforms.kFogFade.value[1] = end;
}

/** Inside-cloud ramp (Karadeniz): factor 0..1, extinction 1/m (default ~ 25 m visibility at 1.0). */
export function setCloudInside(factor: number, extinction = 0.12): void {
  atmosphereUniforms.kFogFade.value[2] = factor;
  atmosphereUniforms.kFogFade.value[3] = extinction;
}

/** Per-frame: wrapped time (precision-safe) and drawing-buffer size. */
export function updateAtmosphereFrame(timeSec: number, width: number, height: number): void {
  atmosphereUniforms.kAtmoTime.value[0] = timeSec % 3600;
  const s = atmosphereUniforms.kScreen.value;
  if (s[0] !== width || s[1] !== height) {
    s[0] = width;
    s[1] = height;
    s[2] = 1 / Math.max(1, width);
    s[3] = 1 / Math.max(1, height);
  }
}

/** Debug: magenta background (horizon / crack tests §9.G-3). */
export function setAtmosphereDebugMagenta(on: boolean): void {
  atmosphereUniforms.kAtmoTime.value[3] = on ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------------------------
// CPU twin of kanatSky() (identical maths) -> SH9 + colour queries for other systems.
// ---------------------------------------------------------------------------------------------------------------

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function hg(mu: number, g: number): number {
  const g2 = g * g;
  const d = Math.max(1 + g2 - 2 * g * mu, 1e-4);
  return (1 - g2) / (12.566371 * d * Math.sqrt(d));
}

/** CPU evaluation of the sky radiance (same as GLSL kanatSky) for a unit direction. */
export function skyRadiance(dx: number, dy: number, dz: number, out: Float32Array | number[]): void {
  const U = atmosphereUniforms;
  const Z = U.kSkyZenith.value;
  const M = U.kSkyMid.value;
  const H = U.kSkyHorizon.value;
  const HS = U.kSkyHorizonSun.value;
  const G = U.kSkyGround.value;
  const S = U.kSun.value;
  const SC = U.kSunColor.value;
  const y = Math.max(-1, Math.min(1, dy));
  const e = Math.pow(Math.max(y, 0), Math.max(Z[3], 0.05));
  const m = Math.min(0.98, Math.max(0.02, M[3]));
  const l = Math.hypot(dx, dz) * Math.hypot(S[0], S[2]);
  const c = l > 1e-5 ? (dx * S[0] + dz * S[2]) / l : 0;
  const side = Math.pow(c * 0.5 + 0.5, Math.max(H[3], 0.01));
  const s1 = smooth(0, m, e);
  const s2 = smooth(m, 1, e);
  const sg = smooth(0, 0.3, -y);
  const mu = dx * S[0] + dy * S[1] + dz * S[2];
  const aur = SC[3] * hg(mu, 0.76) * (1 - 0.6 * smooth(0, 0.8, y));
  for (let i = 0; i < 3; i++) {
    const hz = H[i] + (HS[i] - H[i]) * side;
    const lo = hz + (M[i] - hz) * s1;
    let v = lo + (Z[i] - lo) * s2;
    v = v + (G[i] - v) * sg;
    out[i] = v + SC[i] * aur;
  }
}

const shBasis = new Array<number>(9).fill(0);
const shDir = new THREE.Vector3();

function computeSkySH(sh: THREE.SphericalHarmonics3, look: WorldLook): void {
  sh.zero();
  const N = 768;
  const rad = new Float32Array(3);
  const ground = new Float32Array(3);
  hexToLinear(look.groundAlbedo, ground);
  // Ground bounce radiance: albedo * (sun irradiance on flat ground + sky irradiance) / PI.
  const SC = atmosphereUniforms.kSunColor.value;
  const sunY = Math.max(0, atmosphereUniforms.kSun.value[1]);
  let skyAvg0 = 0, skyAvg1 = 0, skyAvg2 = 0, nUp = 0;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i + 0.5) / (N / 2);
    if (y <= 0) break;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    skyRadiance(Math.cos(th) * r, y, Math.sin(th) * r, rad);
    skyAvg0 += rad[0] * y; skyAvg1 += rad[1] * y; skyAvg2 += rad[2] * y; nUp++;
  }
  // E_sky(up) = 2π · mean(L·cosθ) over the hemisphere (uniform sampling).
  const eSky = [(2 * Math.PI * skyAvg0) / nUp, (2 * Math.PI * skyAvg1) / nUp, (2 * Math.PI * skyAvg2) / nUp];
  const bounce = [0, 1, 2].map((k) => (ground[k] * (SC[k] * sunY * 0.7 + eSky[k] * 0.8)) / Math.PI);
  const w = (4 * Math.PI) / N;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    const x = Math.cos(th) * r;
    const z = Math.sin(th) * r;
    if (y >= 0) skyRadiance(x, y, z, rad);
    else {
      const b = smooth(0, 0.25, -y);
      skyRadiance(x, 0.0, z, rad);
      for (let k = 0; k < 3; k++) rad[k] = rad[k] * (1 - b) + bounce[k] * b;
    }
    shDir.set(x, y, z);
    THREE.SphericalHarmonics3.getBasisAt(shDir, shBasis as unknown as number[]);
    const s = look.ambient * w;
    for (let k = 0; k < 9; k++) {
      const c = sh.coefficients[k];
      c.x += rad[0] * shBasis[k] * s;
      c.y += rad[1] * shBasis[k] * s;
      c.z += rad[2] * shBasis[k] * s;
    }
  }
}

/** Evaluate the in-scatter (fog) colour for a horizontal direction - CPU helper for e.g. impostor tinting. */
export function horizonColor(dx: number, dz: number, out: Float32Array | number[]): void {
  const l = Math.hypot(dx, dz) || 1;
  skyRadiance(dx / l, 0, dz / l, out);
}
