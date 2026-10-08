// Water surfaces. Likya sea: opaque camera-following surface at sea level; underwater look computed in-shader
// from the bathymetry (same R32F height grids as the terrain): depth colour, visible sand bottom in the shallows
// (macro colour, absorption), shore foam from depth, 1–2 scrolling procedural normal maps, Schlick Fresnel,
// sky-cube reflection, sun glint, caustics (High+). Pamukkale pools: calm mirror water on the baked pool-height
// grid (water exists where pool height > patch terrain). Fog via the shared atmosphere chunks.
import * as THREE from 'three';
import type { RenderTierParams } from '../Renderer.ts';
import type { TerrainData } from '../terrain/TerrainData.ts';
import { TERRAIN_GLSL } from '../../sim/terrain/detailNoise.glsl.ts';
import { ATMOSPHERE_GLSL, atmosphereUniforms } from '../shaders/atmosphere.ts';
import { hexToLinear } from '../color.ts';
import type { HeightGrid } from '../../sim/terrain/types.ts';

export interface WaterOptions {
  kind: 'sea' | 'pools';
  level: number;
  shallow: string;
  deep: string;
  foam: string;
  terrain: TerrainData;
  /** Pamukkale: pool surface height grid (decoded water_patch). */
  poolGrid?: HeightGrid | null;
  pools: { x: number; z: number; y: number; r: number }[];
  skyCube: THREE.Texture;
  depthFalloff?: number;
}

const NORMAL_GEN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
float h21( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float pn( vec2 p, float per ) {
  vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( h21( mod( i, per ) ), h21( mod( i + vec2( 1, 0 ), per ) ), u.x ), mix( h21( mod( i + vec2( 0, 1 ), per ) ), h21( mod( i + vec2( 1, 1 ), per ) ), u.x ), u.y );
}
float waves( vec2 uv ) {
  float s = 0.0; float a = 0.5; float per = 4.0;
  for ( int i = 0; i < 6; i ++ ) { s += a * pn( uv * per + float( i ) * 3.1, per ); per *= 2.0; a *= 0.55; }
  // A few tileable directional swells.
  s += 0.18 * sin( 6.2831 * ( uv.x * 3.0 + uv.y * 2.0 ) + s * 2.0 );
  s += 0.12 * sin( 6.2831 * ( uv.x * -2.0 + uv.y * 5.0 ) + s * 1.5 );
  return s;
}
void main() {
  float e = 1.0 / 256.0;
  float hx = waves( vUv + vec2( e, 0.0 ) ) - waves( vUv - vec2( e, 0.0 ) );
  float hy = waves( vUv + vec2( 0.0, e ) ) - waves( vUv - vec2( 0.0, e ) );
  vec3 n = normalize( vec3( -hx * 6.0, 1.0, -hy * 6.0 ) );
  gl_FragColor = vec4( n.x * 0.5 + 0.5, n.z * 0.5 + 0.5, waves( vUv ) * 0.5, 1.0 );
}
`;

const GEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }
`;

function makeNormalMap(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(256, 256, {
    type: THREE.UnsignedByteType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    depthBuffer: false,
    colorSpace: THREE.NoColorSpace,
  });
  const mat = new THREE.ShaderMaterial({ vertexShader: GEN_VERT, fragmentShader: NORMAL_GEN_FRAG, depthTest: false, depthWrite: false, toneMapped: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const prev = renderer.getRenderTarget();
  const prevTM = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt);
  renderer.render(scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  renderer.setRenderTarget(prev);
  renderer.toneMapping = prevTM;
  mat.dispose();
  quad.geometry.dispose();
  return rt;
}

const VERT = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform vec4 uPlane; // x,z centre (camera snapped), y level, w half size
uniform sampler2D uPoolH;
uniform vec4 uPoolGrid;
uniform sampler2D uPatchH;
uniform vec4 uPatchGrid;
varying vec3 vRel;
varying float vPoolOk;
${TERRAIN_GLSL}
#include <fog_pars_vertex>
void main() {
  vec3 world;
#ifdef KANAT_POOLS
  vec2 xz = uPoolGrid.xy + position.xz * ( uPoolGrid.w - 1.0 ) * uPoolGrid.z;
  float hw = kanatGridBilinear( uPoolH, xz, uPoolGrid );
  float ht = kanatGridBilinear( uPatchH, xz, uPatchGrid );
  vPoolOk = hw > ht + 0.02 ? 1.0 : 0.0;
  world = vec3( xz.x, vPoolOk > 0.5 ? hw : ht - 0.6, xz.y );
#else
  world = vec3( uPlane.x + position.x * uPlane.w, uPlane.y, uPlane.z + position.z * uPlane.w );
  vPoolOk = 1.0;
#endif
  vec3 rel = world - cameraPosition;
  vec4 mvPosition = vec4( mat3( viewMatrix ) * rel, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  vRel = rel;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform sampler2D uHCore;
uniform sampler2D uHFar;
uniform vec4 uCoreGrid;
uniform vec4 uFarGrid;
uniform sampler2D uMacro;
uniform vec4 uCovCore;
uniform vec4 uCoreExt;
uniform float uHasMacro;
uniform sampler2D uNormalMap;
uniform samplerCube uSkyCube;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;
uniform vec4 uWater; // x level, y depth falloff, z time, w normal layers (1|2)
uniform vec4 uWaterQ; // x caustics, y foam on, z depth colour on, w roughness
varying vec3 vRel;
varying float vPoolOk;
${TERRAIN_GLSL}
#include <fog_pars_fragment>
${ATMOSPHERE_GLSL}

float bathy( vec2 xz ) {
  if ( kanatInGrid( xz, uCoreGrid ) ) return kanatGridBilinear( uHCore, xz, uCoreGrid );
  return kanatGridBilinear( uHFar, xz, uFarGrid );
}

vec3 waterNormal( vec2 xz, float t, float dist ) {
  vec2 uv1 = xz / 38.0 + vec2( t * 0.011, t * 0.006 );
  vec4 a = texture( uNormalMap, uv1 );
  vec2 n = a.xy * 2.0 - 1.0;
  if ( uWater.w > 1.5 ) {
    vec2 uv2 = xz / 11.0 + vec2( -t * 0.017, t * 0.021 );
    vec2 b = texture( uNormalMap, uv2 ).xy * 2.0 - 1.0;
    n = n * 0.6 + b * 0.55;
  }
  // Flatten with distance (mip + grazing angles) to avoid sparkle aliasing.
  float flat1 = 1.0 / ( 1.0 + dist * 0.0025 );
  return normalize( vec3( n.x * 0.35 * flat1, 1.0, n.y * 0.35 * flat1 ) );
}

void main() {
  vec3 wp = cameraPosition + vRel;
  float dist = length( vRel );
  vec3 V = -vRel / max( dist, 1e-3 );
  float t = uWater.z;
#ifdef KANAT_POOLS
  float depth = 0.35;
  vec3 N = normalize( mix( vec3( 0.0, 1.0, 0.0 ), waterNormal( wp.xz * 3.0, t * 0.3, dist ), 0.25 ) );
#else
  float hb = bathy( wp.xz );
  float depth = max( uWater.x - hb, 0.0 );
  vec3 N = waterNormal( wp.xz, t, dist );
#endif
  vec3 L = kSun.xyz;
  // Fresnel (Schlick, F0 = 0.02).
  float ndv = clamp( dot( N, V ), 0.0, 1.0 );
  float F = 0.02 + 0.98 * pow( 1.0 - ndv, 5.0 );
  vec3 R = reflect( -V, N );
  R.y = abs( R.y );
  vec3 refl = textureLod( uSkyCube, R, uWaterQ.w * 6.0 ).rgb;
  // Body colour: depth absorption (shallow turquoise → deep blue), lit by sun + sky.
  float dk = 1.0 - exp( -depth / max( uWater.y, 0.1 ) );
  vec3 body = mix( uShallow, uDeep, uWaterQ.z > 0.5 ? dk : 0.6 );
  vec3 amb = kanatIrradiance( vec3( 0.0, 1.0, 0.0 ) ) * 0.31831;
  vec3 sunI = kSunColor.rgb * max( L.y, 0.0 ) * 0.31831;
  vec3 col = body * ( amb + sunI * 0.8 );
#ifndef KANAT_POOLS
  // Visible bottom in the shallows (clear Mediterranean water): macro colour, absorbed with depth.
  float clarity = exp( -depth / 3.2 ) * ( uWaterQ.z > 0.5 ? 1.0 : 0.0 );
  if ( clarity > 0.01 ) {
    vec3 bottom = vec3( 0.75, 0.68, 0.52 );
    bool inCore = wp.x >= uCoreExt.x && wp.z >= uCoreExt.y && wp.x <= uCoreExt.z && wp.z <= uCoreExt.w;
    if ( uHasMacro > 0.5 && inCore ) bottom = texture( uMacro, ( wp.xz - uCovCore.xy ) * uCovCore.z ).rgb;
    vec3 lit = bottom * ( amb + sunI ) * 1.3;
    if ( uWaterQ.x > 0.5 ) {
      // Caustics: two drifting cellular patterns (High+).
      vec2 c1 = wp.xz * 0.45 + vec2( t * 0.31, t * 0.17 );
      vec2 c2 = wp.xz * 0.37 - vec2( t * 0.23, -t * 0.29 );
      float ca = pow( 1.0 - abs( kValueNoise( c1 ) * 2.0 - 1.0 ), 6.0 ) + pow( 1.0 - abs( kValueNoise( c2 ) * 2.0 - 1.0 ), 6.0 );
      lit *= 1.0 + ca * 0.6 * clarity;
    }
    col = mix( col, lit * mix( vec3( 1.0 ), uShallow * 1.6, 0.35 ), clarity * 0.85 );
  }
#endif
  // Sun glint.
  float spec = pow( max( dot( R, L ), 0.0 ), 900.0 ) * 60.0 + pow( max( dot( R, L ), 0.0 ), 120.0 ) * 1.2;
  col = mix( col, refl, F ) + kSunColor.rgb * spec * F * 4.0;
#ifndef KANAT_POOLS
  // Shore foam from depth (animated bands), Medium+.
  if ( uWaterQ.y > 0.5 && depth < 1.4 ) {
    float band = sin( depth * 9.0 - t * 1.6 + kValueNoise( wp.xz * 0.15 ) * 6.0 ) * 0.5 + 0.5;
    float foam = ( 1.0 - smoothstep( 0.0, 1.4, depth ) ) * smoothstep( 0.55, 0.95, band * kValueNoise( wp.xz * 0.9 + t * 0.2 ) * 1.6 );
    foam += 1.0 - smoothstep( 0.0, 0.25, depth );
    col = mix( col, uFoam * ( amb + sunI ) * 1.2, clamp( foam, 0.0, 1.0 ) * 0.85 );
  }
#endif
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export class Water {
  readonly object = new THREE.Group();
  private normalRT: THREE.WebGLRenderTarget;
  private mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private poolTex: THREE.DataTexture | null = null;
  private kind: 'sea' | 'pools';
  private level: number;
  private halfSize: number;

  constructor(renderer: THREE.WebGLRenderer, params: RenderTierParams, opts: WaterOptions) {
    this.object.name = 'kanat-water';
    this.kind = opts.kind;
    this.level = opts.level;
    this.halfSize = params.terrain.viewDistance * 1.05;
    this.normalRT = makeNormalMap(renderer);
    const data = opts.terrain;
    const c = [0, 0, 0];
    const col = (hex: string) => {
      hexToLinear(hex, c);
      return new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);
    };
    const pools = opts.kind === 'pools' && opts.poolGrid && data.hPatch && data.patchGrid;
    let geo: THREE.BufferGeometry;
    if (pools) {
      const seg = params.level >= 2 ? 160 : 96;
      const g = new THREE.PlaneGeometry(1, 1, seg, seg);
      g.rotateX(-Math.PI / 2);
      g.translate(0.5, 0, 0.5);
      geo = g;
      const pg = opts.poolGrid!;
      this.poolTex = new THREE.DataTexture(pg.data, pg.res, pg.res, THREE.RedFormat, THREE.FloatType);
      this.poolTex.minFilter = THREE.NearestFilter;
      this.poolTex.magFilter = THREE.NearestFilter;
      this.poolTex.needsUpdate = true;
    } else {
      // Camera-following quad grid (flat: density only matters for clipping, fog is per-fragment).
      const g = new THREE.PlaneGeometry(2, 2, 8, 8);
      g.rotateX(-Math.PI / 2);
      geo = g;
    }
    const pg = opts.poolGrid;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...atmosphereUniforms,
        uPlane: { value: new THREE.Vector4(0, opts.level, 0, this.halfSize) },
        uPoolH: { value: this.poolTex },
        uPoolGrid: { value: pg ? new THREE.Vector4(pg.originX, pg.originZ, pg.spacing, pg.res) : new THREE.Vector4() },
        uPatchH: { value: data.hPatch },
        uPatchGrid: { value: data.patchGrid ?? new THREE.Vector4() },
        uHCore: { value: data.hCore },
        uHFar: { value: data.hFar },
        uCoreGrid: { value: data.coreGrid },
        uFarGrid: { value: data.farGrid },
        uMacro: { value: data.colorMacro },
        uCovCore: { value: data.covCore },
        uCoreExt: { value: data.coreExt },
        uHasMacro: { value: data.has.macro ? 1 : 0 },
        uNormalMap: { value: this.normalRT.texture },
        uSkyCube: { value: opts.skyCube },
        uShallow: { value: col(opts.shallow) },
        uDeep: { value: col(opts.deep) },
        uFoam: { value: col(opts.foam) },
        uWater: { value: new THREE.Vector4(opts.level, opts.depthFalloff ?? 3, 0, params.water.normals) },
        uWaterQ: {
          value: new THREE.Vector4(params.water.caustics ? 1 : 0, params.water.foam ? 1 : 0, 1, pools ? 0.0 : 0.08),
        },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    });
    if (pools) mat.defines = { KANAT_POOLS: '' };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -5;
    this.mesh.matrixAutoUpdate = false;
    this.object.add(this.mesh);
  }

  update(time: number, camera: THREE.Camera): void {
    const u = this.mesh.material.uniforms;
    (u.uWater.value as THREE.Vector4).z = time % 600;
    if (this.kind === 'sea') {
      const snap = 64;
      const p = u.uPlane.value as THREE.Vector4;
      p.x = Math.round(camera.position.x / snap) * snap;
      p.z = Math.round(camera.position.z / snap) * snap;
      p.y = this.level;
      p.w = this.halfSize;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.normalRT.dispose();
    this.poolTex?.dispose();
  }
}
