// GPU bake (once per world load) of the terrain sun-visibility + horizon AO over the core, from the same height
// grids the terrain draws and the world's single sun direction (§3.1 "tek güneş yönü"). RGBA8 1024²:
// R = soft sun visibility, G = horizon AO, B = 0.5 (flat cavity), A = 1. Used for near-terrain relighting and
// exported for props/water (darken objects standing in valley shadow).
import * as THREE from 'three';
import { TERRAIN_GLSL } from '../../sim/terrain/detailNoise.glsl.ts';

const FRAG = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uHCore;
uniform sampler2D uHFar;
uniform vec4 uCoreGrid;
uniform vec4 uFarGrid;
uniform vec4 uCov; // minX, minZ, size, 0
uniform vec3 uSun;
varying vec2 vUv;
${TERRAIN_GLSL}

float hAt( vec2 xz ) {
  if ( kanatInGrid( xz, uCoreGrid ) ) {
    vec2 g = clamp( ( xz - uCoreGrid.xy ) / uCoreGrid.z, vec2( 0.0 ), vec2( uCoreGrid.w - 1.0 ) );
    return texelFetch( uHCore, ivec2( g + 0.5 ), 0 ).r;
  }
  vec2 g = clamp( ( xz - uFarGrid.xy ) / uFarGrid.z, vec2( 0.0 ), vec2( uFarGrid.w - 1.0 ) );
  return texelFetch( uHFar, ivec2( g + 0.5 ), 0 ).r;
}

void main() {
  vec2 xz = uCov.xy + vUv * uCov.z;
  float h0 = kanatGridBilinear( uHCore, xz, uCoreGrid ) + 0.5;
  // Sun visibility: march toward the sun with growing steps; soft penumbra widening with distance.
  vec2 sd = normalize( uSun.xz + vec2( 1e-6 ) );
  float tanE = uSun.y / max( length( uSun.xz ), 1e-4 );
  float vis = 1.0;
  float t = 6.0;
  for ( int i = 0; i < 56; i ++ ) {
    vec2 p = xz + sd * t;
    float hr = h0 + t * tanE;
    float ht = hAt( p );
    float pen = 1.5 + t * 0.012;
    vis = min( vis, clamp( ( hr - ht ) / pen + 0.5, 0.0, 1.0 ) );
    t = t * 1.085 + 4.0;
    if ( t > 6000.0 || vis <= 0.0 ) break;
  }
  // Horizon-based ambient occlusion (8 directions).
  float occ = 0.0;
  for ( int d = 0; d < 8; d ++ ) {
    float a = float( d ) * 0.785398 + 0.39;
    vec2 dir = vec2( cos( a ), sin( a ) );
    float mx = 0.0;
    float s = 8.0;
    for ( int j = 0; j < 9; j ++ ) {
      float hh = hAt( xz + dir * s ) - h0;
      mx = max( mx, hh / s );
      s *= 1.8;
    }
    occ += mx / sqrt( 1.0 + mx * mx );
  }
  float ao = clamp( 1.0 - occ / 8.0 * 1.15, 0.25, 1.0 );
  gl_FragColor = vec4( vis, ao, 0.5, 1.0 );
}
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }
`;

export interface ShadowBakeInput {
  hCore: THREE.Texture;
  hFar: THREE.Texture;
  coreGrid: THREE.Vector4;
  farGrid: THREE.Vector4;
  /** Core coverage: minX, minZ, size. */
  cov: { minX: number; minZ: number; size: number };
  sunDir: THREE.Vector3;
}

export function bakeTerrainShadow(renderer: THREE.WebGLRenderer, inp: ShadowBakeInput, size = 1024): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.NoColorSpace,
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uHCore: { value: inp.hCore },
      uHFar: { value: inp.hFar },
      uCoreGrid: { value: inp.coreGrid },
      uFarGrid: { value: inp.farGrid },
      uCov: { value: new THREE.Vector4(inp.cov.minX, inp.cov.minZ, inp.cov.size, 0) },
      uSun: { value: inp.sunDir.clone() },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = renderer.getRenderTarget();
  const prevTM = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prev);
  renderer.toneMapping = prevTM;
  mat.dispose();
  quad.geometry.dispose();
  return rt;
}
