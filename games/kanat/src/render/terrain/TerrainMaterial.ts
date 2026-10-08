// CDLOD terrain material. Vertex: instanced node grid → morph to parent grid by distance (Strugar), heights from
// R32F textures via manual 4-tap bilinear texelFetch (bit-compatible with the CPU sampler), procedural detail D in
// the LOD0 ring (faded by the morph factor so LOD0→LOD1 is continuous), 30 m skirts + −600 m horizon skirt.
// Fragment: macro albedo far, 4 splat layers near (top-2 with continuous re-weighting, height-blend), projection per
// tier (planar+vertical / biplanar / triplanar), derivative bump from layer heights + analytic D slope near,
// lighting = sun N·L × baked shadow + sky SH × AO, Kapadokya world-y tuff strata. No discard.
import * as THREE from 'three';
import { TERRAIN_GLSL } from '../../sim/terrain/detailNoise.glsl.ts';
import { ATMOSPHERE_GLSL, atmosphereUniforms } from '../shaders/atmosphere.ts';
import type { TerrainProjection } from '../Renderer.ts';

export const MAX_TERRAIN_LEVELS = 14;

const VERT = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;
attribute vec4 aNode;
uniform vec4 uMorph[ ${MAX_TERRAIN_LEVELS} ];
uniform float uGridQuads;
uniform sampler2D uHCore;
uniform sampler2D uHFar;
uniform sampler2D uRock;
uniform sampler2D uNCore;
uniform sampler2D uNFar;
uniform sampler2D uSplat;
uniform vec4 uCoreGrid;
uniform vec4 uFarGrid;
uniform vec4 uCovCore;
uniform vec4 uRoot;
uniform vec4 uTFlags; // x skirt depth, y has splat, z detail D on, w patch lower
uniform vec4 uSplatRule; // fallback splat rule params
uniform mat4 uSplatMap; // semantic (flat, steep, mid, high) -> layer weights
varying vec3 vRel;
varying vec3 vNormal;
varying vec4 vSplat;
varying vec3 vTerr; // x morph k, y lod, z skirt
varying float vRock;
${TERRAIN_GLSL}
#include <fog_pars_vertex>
${ATMOSPHERE_GLSL}

float terrainBase( vec2 xz ) {
  if ( kanatInGrid( xz, uCoreGrid ) ) return kanatGridBilinear( uHCore, xz, uCoreGrid );
  return kanatGridBilinear( uHFar, xz, uFarGrid );
}

vec3 terrainNormalTex( vec2 xz, out float inCore ) {
  inCore = kanatInGrid( xz, uCoreGrid ) ? 1.0 : 0.0;
  if ( inCore > 0.5 ) {
    vec2 uv = ( ( xz - uCoreGrid.xy ) / uCoreGrid.z + 0.5 ) / uCoreGrid.w;
    return texture( uNCore, uv ).xyz * 2.0 - 1.0;
  }
  vec2 uv = ( ( xz - uFarGrid.xy ) / uFarGrid.z + 0.5 ) / uFarGrid.w;
  return texture( uNFar, uv ).xyz * 2.0 - 1.0;
}

void main() {
  vec2 local = position.xz;
  float skirt = position.y;
  float size = aNode.z;
  int lod = int( aNode.w + 0.5 );
  vec2 xz0 = aNode.xy + local * size;
  float h0 = terrainBase( xz0 );
  float dist = length( vec3( xz0.x, h0, xz0.y ) - cameraPosition );
  vec4 mr = uMorph[ lod ];
  float k = clamp( ( dist - mr.x ) * mr.y, 0.0, 1.0 );
  vec2 gp = local * uGridQuads;
  vec2 fracPart = fract( gp * 0.5 ) * 2.0;
  vec2 lm = local - fracPart / uGridQuads * k;
  vec2 xz = aNode.xy + lm * size;
  float h = terrainBase( xz );
  float rock = 0.0;
  if ( lod == 0 && uTFlags.z > 0.5 && kanatInGrid( xz, uCoreGrid ) ) {
    rock = kanatGridBilinear( uRock, xz, uCoreGrid );
    h += kanatDetail( xz, rock ) * ( 1.0 - k );
  }
  float inCore;
  vec3 n = normalize( terrainNormalTex( xz, inCore ) );
  if ( uTFlags.y > 0.5 && inCore > 0.5 ) {
    vec2 uv = ( xz - uCovCore.xy ) * uCovCore.z;
    vSplat = texture( uSplat, uv );
  } else {
    // Fallback rules: x = low flats, y = steep rock, z = mid slopes / vegetation, w = high ground.
    float slope = 1.0 - n.y;
    float steep = smoothstep( uSplatRule.x, uSplatRule.y, slope );
    float high = smoothstep( uSplatRule.z, uSplatRule.w, h );
    float mid = smoothstep( uSplatRule.x * 0.4, uSplatRule.x, slope ) * ( 1.0 - steep );
    float var = kValueNoise( xz / 41.0 );
    vec4 sem = vec4( ( 1.0 - steep - mid ) * ( 1.0 - high ), steep, mid * ( 1.0 - high ), ( 1.0 - steep ) * high );
    sem = max( sem, vec4( 0.0 ) );
    vec4 w = uSplatMap * sem;
    // Low-frequency variation between the first two layers (e.g. pink / white tuff).
    w.xy = vec2( w.x + w.y ) * vec2( var, 1.0 - var ) * 0.999 + w.xy * 0.001;
    vSplat = w / max( dot( w, vec4( 1.0 ) ), 1e-4 );
  }
  if ( skirt > 0.5 ) {
    float e = 0.5;
    bool rootEdge = xz.x <= uRoot.x + e || xz.y <= uRoot.y + e || xz.x >= uRoot.x + uRoot.z - e || xz.y >= uRoot.y + uRoot.z - e;
    h -= rootEdge ? uRoot.w : uTFlags.x;
  }
  vec3 world = vec3( xz.x, h, xz.y );
  vec3 rel = world - cameraPosition;
  vec4 mvPosition = vec4( mat3( viewMatrix ) * rel, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  vRel = rel;
  vNormal = n;
  vTerr = vec3( k, float( lod ), skirt );
  vRock = rock;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DArray;
uniform sampler2D uShadowAo;
uniform sampler2D uMacro;
uniform sampler2D uFarColor;
uniform sampler2DArray uDetail;
uniform vec4 uCoreGrid;
uniform vec4 uCovCore;
uniform vec4 uCovFar;
uniform vec4 uHas; // x shadowAo, y macro, z far colour, w strata strength
uniform vec3 uLayerCol[ 4 ];
uniform vec4 uLayerP[ 4 ]; // x tile size (m), y bump strength, z kind (0 tuff,1 rock,2 grass,3 soil,4 snow,5 travertine,6 forest,7 sand), w roughness
uniform vec4 uDetailP; // x detail fade start, y fade end, z macro variation, w wrap lighting
uniform vec4 uStrata; // x period, y strength, z rose mix, w unused
uniform vec3 uRoseTint;
uniform vec4 uTDebug; // x magenta skirts
uniform vec4 uPrelit; // x macro exposure scale, y sky weight in the relight ratio
varying vec3 vRel;
varying vec3 vNormal;
varying vec4 vSplat;
varying vec3 vTerr;
varying float vRock;
${TERRAIN_GLSL}
#include <fog_pars_fragment>
${ATMOSPHERE_GLSL}

#define PROJ PROJ_MODE

vec4 sampleLayerPlanar( vec3 wp, vec3 n, int L ) {
  float ts = 1.0 / uLayerP[ L ].x;
  vec3 an = abs( n );
  // Single projection; switch to vertical projection on steep faces with a narrow blend band.
  float wTop = smoothstep( 0.5, 0.62, an.y );
  vec2 uvSide = an.x > an.z ? wp.zy : wp.xy;
  vec4 c;
  if ( wTop >= 0.999 ) c = texture( uDetail, vec3( wp.xz * ts, float( L ) ) );
  else if ( wTop <= 0.001 ) c = texture( uDetail, vec3( uvSide * ts, float( L ) ) );
  else c = mix( texture( uDetail, vec3( uvSide * ts, float( L ) ) ), texture( uDetail, vec3( wp.xz * ts, float( L ) ) ), wTop );
  return c;
}

vec4 sampleLayerBiplanar( vec3 wp, vec3 n, int L ) {
  // Inigo Quilez biplanar mapping: 2 samples (major + median axis).
  float ts = 1.0 / uLayerP[ L ].x;
  vec3 p = wp * ts;
  vec3 an = abs( n );
  ivec3 ma = ( an.x > an.y && an.x > an.z ) ? ivec3( 0, 1, 2 ) : ( an.y > an.z ) ? ivec3( 1, 2, 0 ) : ivec3( 2, 0, 1 );
  ivec3 mi = ( an.x < an.y && an.x < an.z ) ? ivec3( 0, 1, 2 ) : ( an.y < an.z ) ? ivec3( 1, 2, 0 ) : ivec3( 2, 0, 1 );
  ivec3 me = ivec3( 3 ) - mi - ma;
  vec4 x = texture( uDetail, vec3( vec2( p[ ma.y ], p[ ma.z ] ), float( L ) ) );
  vec4 y = texture( uDetail, vec3( vec2( p[ me.y ], p[ me.z ] ), float( L ) ) );
  vec2 w = vec2( an[ ma.x ], an[ me.x ] );
  w = clamp( ( w - 0.5773 ) / ( 1.0 - 0.5773 ), 0.0, 1.0 );
  w = pow( w, vec2( 4.0 ) );
  return ( x * w.x + y * w.y ) / max( w.x + w.y, 1e-4 );
}

vec4 sampleLayerTriplanar( vec3 wp, vec3 n, int L ) {
  float ts = 1.0 / uLayerP[ L ].x;
  vec3 w = pow( abs( n ), vec3( 4.0 ) );
  w /= max( w.x + w.y + w.z, 1e-4 );
  vec4 c = vec4( 0.0 );
  if ( w.x > 0.02 ) c += texture( uDetail, vec3( wp.zy * ts, float( L ) ) ) * w.x;
  if ( w.y > 0.02 ) c += texture( uDetail, vec3( wp.xz * ts, float( L ) ) ) * w.y;
  if ( w.z > 0.02 ) c += texture( uDetail, vec3( wp.xy * ts, float( L ) ) ) * w.z;
  return c / max( ( w.x > 0.02 ? w.x : 0.0 ) + ( w.y > 0.02 ? w.y : 0.0 ) + ( w.z > 0.02 ? w.z : 0.0 ), 1e-4 );
}

vec4 sampleLayer( vec3 wp, vec3 n, int L ) {
#if PROJ == 0
  return sampleLayerPlanar( wp, n, L );
#elif PROJ == 1
  return sampleLayerBiplanar( wp, n, L );
#else
  return sampleLayerTriplanar( wp, n, L );
#endif
}

float strataBand( vec3 wp ) {
  // Irregular horizontal tuff bands (world-y), wiggled by low-frequency noise so they follow the deposition.
  float y = wp.y + ( kValueNoise( wp.xz / 53.0 ) - 0.5 ) * 3.2;
  float a = sin( y * 6.2831 / uStrata.x );
  float b = sin( y * 6.2831 / ( uStrata.x * 0.43 ) + 1.7 );
  float c = sin( y * 6.2831 / ( uStrata.x * 2.71 ) + 0.4 );
  return a * 0.5 + b * 0.3 + c * 0.2;
}

void main() {
  vec3 wp = cameraPosition + vRel;
  float dist = length( vRel );
  vec3 N0 = normalize( vNormal );
  vec3 N = N0;
  float k = vTerr.x;
  float lod = vTerr.y;
  bool inCore = kanatInGrid( wp.xz, uCoreGrid );

  // ---- analytic detail-noise slope near the camera (LOD0 ring incl. normal-only 3rd octave) ----
  if ( lod < 0.5 && vRock > 0.0 ) {
    vec2 g = kanatDetailSlope( wp.xz, vRock ) * ( 1.0 - k );
    N = normalize( N - vec3( g.x, 0.0, g.y ) );
  }

  // ---- sun visibility / AO (GPU-baked from the same heights) ----
  float shadow = 1.0;
  float ao = 1.0;
  if ( uHas.x > 0.5 && inCore ) {
    vec4 sa = texture( uShadowAo, ( wp.xz - uCovCore.xy ) * uCovCore.z );
    shadow = sa.r;
    ao = sa.g;
  }

  // ---- base radiance: pre-lit macro colour (core 4 m/texel, far ring 48 m/texel) ----
  vec4 w = vSplat;
  vec3 base;
  bool prelit = false;
  if ( uHas.y > 0.5 && inCore ) {
    base = texture( uMacro, ( wp.xz - uCovCore.xy ) * uCovCore.z ).rgb * uPrelit.x;
    prelit = true;
  } else if ( uHas.z > 0.5 ) {
    base = texture( uFarColor, ( wp.xz - uCovFar.xy ) * uCovFar.z ).rgb * uPrelit.x;
    prelit = true;
  } else {
    vec3 splatCol = uLayerCol[ 0 ] * w.x + uLayerCol[ 1 ] * w.y + uLayerCol[ 2 ] * w.z + uLayerCol[ 3 ] * w.w;
    float mv = kValueNoise( wp.xz / 61.0 ) * 0.6 + kValueNoise( wp.xz / 233.0 ) * 0.4;
    base = splatCol * ( 1.0 + ( mv - 0.5 ) * uDetailP.z );
  }

  // ---- strata (tuff: world-y banding, strongest on steep faces) ----
  float steep = 1.0 - smoothstep( 0.55, 0.9, N0.y );
  if ( uStrata.y > 0.0 ) {
    float tuffW = 0.0;
    for ( int i = 0; i < 4; i ++ ) tuffW += ( uLayerP[ i ].z < 0.5 ? 1.0 : 0.0 ) * w[ i ];
    float band = strataBand( wp );
    float s = uStrata.y * tuffW * ( 0.25 + 0.75 * steep ) * ( 1.0 - smoothstep( 1200.0, 3000.0, dist ) );
    base *= 1.0 + band * s;
    base = mix( base, base * uRoseTint, clamp( band * 0.5 + 0.5, 0.0, 1.0 ) * s * uStrata.z * 4.0 );
  }

  // ---- near detail (top-2 splat layers, continuous re-weighting, height blend, derivative bump) ----
  vec3 albedoMod = vec3( 1.0 );
  float detailW = 1.0 - smoothstep( uDetailP.x, uDetailP.y, dist );
  vec3 bumpN = N;
  float aoD = 1.0;
  if ( detailW > 0.0 ) {
    int i0 = 0; int i1 = 1;
    if ( w[ 1 ] > w[ 0 ] ) { i0 = 1; i1 = 0; }
    for ( int i = 2; i < 4; i ++ ) {
      if ( w[ i ] > w[ i0 ] ) { i1 = i0; i0 = i; }
      else if ( w[ i ] > w[ i1 ] ) { i1 = i; }
    }
    float w3 = 0.0;
    for ( int i = 0; i < 4; i ++ ) if ( i != i0 && i != i1 ) w3 = max( w3, w[ i ] );
    float a0 = max( w[ i0 ] - w3, 0.0 );
    float a1 = max( w[ i1 ] - w3, 0.0 );
    vec4 d0 = sampleLayer( wp, N0, i0 );
    vec4 d1 = a1 > 0.001 ? sampleLayer( wp, N0, i1 ) : d0;
    float hb0 = d0.a + a0 * 1.2;
    float hb1 = d1.a + a1 * 1.2;
    float hm = max( hb0, hb1 ) - 0.25;
    float b0 = max( hb0 - hm, 0.0 ) * step( 0.0001, a0 );
    float b1 = max( hb1 - hm, 0.0 ) * step( 0.0001, a1 );
    float bs = max( b0 + b1, 1e-4 );
    b0 /= bs; b1 /= bs;
    vec3 detailRel = d0.rgb * 2.0 * b0 + d1.rgb * 2.0 * b1;
    float height = d0.a * b0 + d1.a * b1;
    albedoMod = mix( vec3( 1.0 ), detailRel, detailW );
    float bumpS = ( uLayerP[ i0 ].y * b0 + uLayerP[ i1 ].y * b1 ) * detailW * 0.06;
    vec3 dpx = dFdx( wp );
    vec3 dpy = dFdy( wp );
    float dhx = dFdx( height );
    float dhy = dFdy( height );
    vec3 r1 = cross( dpy, N );
    vec3 r2 = cross( N, dpx );
    float det = dot( dpx, r1 );
    vec3 grad = sign( det ) * ( dhx * r1 + dhy * r2 );
    vec3 nb = abs( det ) > 1e-9 ? normalize( abs( det ) * N - grad * bumpS ) : N;
    bumpN = normalize( mix( N, nb, detailW ) );
    aoD = mix( 1.0, 0.7 + 0.3 * smoothstep( 0.05, 0.6, height ), detailW );
  }

  // ---- lighting ----
  vec3 L = kSun.xyz;
  float wrap = uDetailP.w;
  vec3 sunC = kSunColor.rgb * shadow;
  vec3 col;
  if ( prelit ) {
    // Keep the baked look; add only the near-detail lighting change as a ratio (seamless with the far ring).
    float dl0 = clamp( ( dot( N0, L ) + wrap ) / ( 1.0 + wrap ), 0.0, 1.0 );
    float dl1 = clamp( ( dot( bumpN, L ) + wrap ) / ( 1.0 + wrap ), 0.0, 1.0 );
    vec3 sky0 = kanatIrradiance( N0 );
    vec3 sky1 = kanatIrradiance( bumpN );
    vec3 l0 = sunC * dl0 + sky0 * uPrelit.y;
    vec3 l1 = sunC * dl1 + sky1 * uPrelit.y;
    vec3 ratio = clamp( l1 / max( l0, vec3( 1e-3 ) ), vec3( 0.2 ), vec3( 3.0 ) );
    col = base * albedoMod * ratio * aoD;
  } else {
    float diff = clamp( ( dot( bumpN, L ) + wrap ) / ( 1.0 + wrap ), 0.0, 1.0 );
    vec3 sky = kanatIrradiance( bumpN ) * ao;
    col = base * albedoMod * ( sunC * diff + sky ) * 0.31830988 * aoD;
  }

  if ( uTDebug.x > 0.5 && vTerr.z > 0.001 ) col = vec3( 1.0, 0.0, 1.0 ) * 50.0;
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface TerrainMaterialOptions {
  projection: TerrainProjection;
  vertexFog: boolean;
}

export function createTerrainMaterial(opts: TerrainMaterialOptions): THREE.ShaderMaterial {
  const proj = opts.projection === 'planar' ? 0 : opts.projection === 'biplanar' ? 1 : 2;
  const morph: THREE.Vector4[] = [];
  for (let i = 0; i < MAX_TERRAIN_LEVELS; i++) morph.push(new THREE.Vector4(1e9, 1, 0, 0));
  const layerCol = [new THREE.Color(0.6, 0.5, 0.4), new THREE.Color(0.4, 0.38, 0.36), new THREE.Color(0.45, 0.42, 0.25), new THREE.Color(0.5, 0.42, 0.33)];
  const layerP = [new THREE.Vector4(4, 1, 0, 0.9), new THREE.Vector4(6, 1, 1, 0.8), new THREE.Vector4(3, 0.6, 2, 0.9), new THREE.Vector4(3, 0.6, 3, 0.9)];
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...atmosphereUniforms,
      uMorph: { value: morph },
      uGridQuads: { value: 32 },
      uHCore: { value: null },
      uHFar: { value: null },
      uRock: { value: null },
      uNCore: { value: null },
      uNFar: { value: null },
      uSplat: { value: null },
      uShadowAo: { value: null },
      uMacro: { value: null },
      uFarColor: { value: null },
      uDetail: { value: null },
      uCoreGrid: { value: new THREE.Vector4() },
      uFarGrid: { value: new THREE.Vector4() },
      uCovCore: { value: new THREE.Vector4() },
      uCovFar: { value: new THREE.Vector4() },
      uRoot: { value: new THREE.Vector4(0, 0, 1, 600) },
      uTFlags: { value: new THREE.Vector4(30, 0, 1, 0) },
      uSplatRule: { value: new THREE.Vector4(0.18, 0.42, 1e5, 1e5 + 1) },
      uHas: { value: new THREE.Vector4(0, 0, 0, 0) },
      uLayerCol: { value: layerCol },
      uLayerP: { value: layerP },
      uDetailP: { value: new THREE.Vector4(380, 600, 0.22, 0.12) },
      uStrata: { value: new THREE.Vector4(3.4, 0, 0.5, 0) },
      uRoseTint: { value: new THREE.Color(1.08, 0.86, 0.82) },
      uTDebug: { value: new THREE.Vector4(0, 0, 0, 0) },
      uPrelit: { value: new THREE.Vector4(1.4, 1.0, 0, 0) },
      uSplatMap: { value: new THREE.Matrix4() },
    },
    vertexShader: VERT,
    fragmentShader: FRAG.replace('PROJ_MODE', String(proj)),
    fog: true,
    lights: false,
    side: THREE.FrontSide,
  });
  mat.defines = { KANAT_TERRAIN: '' };
  if (opts.vertexFog) mat.defines.KANAT_FOG_VERTEX = '';
  mat.extensions = { clipCullDistance: false, multiDraw: false };
  return mat;
}
