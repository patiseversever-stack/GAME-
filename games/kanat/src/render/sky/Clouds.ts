// Clouds: (1) impostor cumulus — 16 sprites generated on the GPU at load into a 4×4 atlas (R = density,
// G/B/A = transmittance toward left / right / top light), drawn as ONE instanced billboard batch, lit by the
// world's sun in the shader (directional weights + silver lining when back-lit), fogged like everything else;
// (2) Karadeniz cloud sea — opaque displaced top and bottom layers (no transparent overdraw) between the
// world.json band, plus the inside-cloud fog ramp (white-out, ≤ 2 full-screen layers, far impostors hidden).
import * as THREE from 'three';
import type { RenderTierParams } from '../Renderer.ts';
import { ATMOSPHERE_GLSL, atmosphereUniforms, setCloudInside } from '../shaders/atmosphere.ts';
import { hexToLinear } from '../color.ts';

export interface CloudsOptions {
  worldId: string;
  coverage: number;
  tint: string;
  seaBottom: number | null;
  seaTop: number | null;
  minY: number;
  maxY: number;
  extent: number;
}

const GEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }
`;

// Cumulus sprite: union of soft blobs (seeded per cell) eroded by fbm; lighting = 2D march toward 3 lights.
const GEN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
float h11( float n ) { return fract( sin( n * 127.1 ) * 43758.5453 ); }
float h21( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float vn( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( h21( i ), h21( i + vec2( 1, 0 ) ), u.x ), mix( h21( i + vec2( 0, 1 ) ), h21( i + vec2( 1, 1 ) ), u.x ), u.y ); }
float fbm( vec2 p ) { float s = 0.0, a = 0.5; for ( int i = 0; i < 5; i ++ ) { s += a * vn( p ); p *= 2.07; a *= 0.5; } return s; }
float dens( vec2 p, float id ) {
  float d = 0.0;
  for ( int i = 0; i < 11; i ++ ) {
    float fi = float( i ) + id * 11.0;
    vec2 c = vec2( 0.5 + ( h11( fi ) - 0.5 ) * 0.56, 0.38 + h11( fi + 3.3 ) * 0.2 );
    float r = 0.09 + h11( fi + 7.7 ) * 0.15;
    // Flat bottoms (cumulus base), towering tops.
    vec2 q = p - c;
    q.y *= q.y < 0.0 ? 2.2 : 0.9;
    float b = 1.0 - length( q ) / r;
    d = d + max( b, 0.0 ) * 0.7;
  }
  float n = fbm( p * 6.0 + id * 13.0 );
  d = smoothstep( 0.0, 1.0, d ) * 1.15 - ( 1.0 - n ) * 0.38;
  return clamp( d, 0.0, 1.0 );
}
void main() {
  vec2 cell = floor( vUv * 4.0 );
  vec2 p = fract( vUv * 4.0 );
  float id = cell.x + cell.y * 4.0;
  float d = dens( p, id );
  // Edge fade so sprites never show a border.
  vec2 e = smoothstep( 0.0, 0.08, p ) * smoothstep( 0.0, 0.08, 1.0 - p );
  d *= e.x * e.y;
  vec3 T = vec3( 0.0 );
  vec2 dirs[ 3 ];
  dirs[ 0 ] = vec2( -1.0, 0.0 ); dirs[ 1 ] = vec2( 1.0, 0.0 ); dirs[ 2 ] = vec2( 0.0, 1.0 );
  for ( int k = 0; k < 3; k ++ ) {
    float acc = 0.0;
    for ( int s = 1; s <= 10; s ++ ) {
      vec2 q = p + dirs[ k ] * float( s ) * 0.03;
      if ( q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0 ) break;
      acc += dens( q, id );
    }
    T[ k ] = exp( -acc * 0.55 );
  }
  gl_FragColor = vec4( d, T );
}
`;

const SPRITE_VERT = /* glsl */ `
precision highp float;
attribute vec4 aCloud; // xyz centre, w size
attribute vec2 aCloudB; // x sprite index, y rotation
varying vec2 vUv;
varying vec2 vSunScr;
varying float vSprite;
varying vec3 vRel;
varying float vFade;
uniform float uHideNear;
${ATMOSPHERE_GLSL}
#include <fog_pars_vertex>
void main() {
  vec3 rel = aCloud.xyz - cameraPosition;
  vec3 c = mat3( viewMatrix ) * rel;
  float cr = cos( aCloudB.y ), sr = sin( aCloudB.y );
  vec2 off = position.xy * aCloud.w;
  off.y *= 0.62;
  vec4 mvPosition = vec4( c + vec3( off, 0.0 ), 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  vUv = position.xy + 0.5;
  vSprite = aCloudB.x;
  vec3 sv = mat3( viewMatrix ) * kSun.xyz;
  vSunScr = vec2( sv.x, sv.y );
  vRel = ( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).xyz;
  // Hidden when the camera is inside the cloud band (Karadeniz) or the sprite is very close.
  vFade = ( 1.0 - uHideNear ) * smoothstep( aCloud.w * 0.6, aCloud.w * 1.4, length( rel ) );
  #include <fog_vertex>
}
`;

const SPRITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform vec3 uTint;
varying vec2 vUv;
varying vec2 vSunScr;
varying float vSprite;
varying vec3 vRel;
varying float vFade;
#include <fog_pars_fragment>
${ATMOSPHERE_GLSL}
void main() {
  float id = floor( vSprite + 0.5 );
  vec2 cell = vec2( mod( id, 4.0 ), floor( id / 4.0 ) );
  vec4 a = texture( uAtlas, ( cell + clamp( vUv, 0.01, 0.99 ) ) / 4.0 );
  float dens = a.r;
  float alpha = smoothstep( 0.0, 0.55, dens ) * 0.92 * vFade;
  vec2 s = vSunScr;
  float wl = max( -s.x, 0.0 ), wr = max( s.x, 0.0 ), wt = max( s.y, 0.0 );
  float ws = wl + wr + wt + 1e-3;
  float trans = ( a.g * wl + a.b * wr + a.a * wt ) / ws;
  vec3 V = normalize( -vRel );
  float mu = dot( -V, kSun.xyz );
  // Back-lit: thin edges glow (silver lining); front-lit: directional transmittance.
  float back = smoothstep( 0.2, 1.0, mu );
  float lit = mix( 0.35 + 0.65 * trans, ( 1.0 - dens ) * 1.6 + 0.25, back * 0.7 );
  vec3 sunC = kSunColor.rgb * ( lit * 0.55 + kHG( mu, 0.6 ) * 0.9 * ( 1.0 - dens ) );
  vec3 skyC = kanatIrradiance( vec3( 0.0, 1.0, 0.0 ) ) * 0.42 * ( 0.75 + 0.25 * a.a );
  vec3 col = uTint * ( sunC + skyC );
  gl_FragColor = vec4( col, alpha );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}
`;

const SEA_VERT = /* glsl */ `
precision highp float;
uniform vec4 uSea; // x centre x, y centre z, z height, w half size
uniform float uSide; // 1 = top surface, -1 = underside
uniform float uTime;
varying vec3 vRel;
varying vec3 vN;
varying float vH;
${ATMOSPHERE_GLSL}
#include <fog_pars_vertex>
float billow( vec2 p ) {
  float s = 0.0, a = 0.5;
  for ( int i = 0; i < 4; i ++ ) { s += a * ( 1.0 - abs( kValueNoise( p ) * 2.0 - 1.0 ) ); p = p * 2.1 + 3.7; a *= 0.5; }
  return s;
}
void main() {
  vec2 xz = uSea.xy + position.xz * uSea.w;
  vec2 p = xz / 420.0 + vec2( uTime * 0.002, uTime * 0.001 );
  float b = billow( p );
  float e = 4.0;
  float bx = billow( p + vec2( e / 420.0, 0.0 ) );
  float bz = billow( p + vec2( 0.0, e / 420.0 ) );
  float amp = 120.0;
  float h = uSea.z + uSide * ( b - 0.45 ) * amp;
  vec3 n = normalize( vec3( -( bx - b ) * amp / e * uSide, 1.0, -( bz - b ) * amp / e * uSide ) );
  vN = uSide > 0.0 ? n : vec3( n.x, -n.y, n.z );
  vH = b;
  vec3 rel = vec3( xz.x, h, xz.y ) - cameraPosition;
  vec4 mvPosition = vec4( mat3( viewMatrix ) * rel, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  vRel = rel;
  #include <fog_vertex>
}
`;

const SEA_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uTint;
uniform float uSide;
varying vec3 vRel;
varying vec3 vN;
varying float vH;
#include <fog_pars_fragment>
${ATMOSPHERE_GLSL}
void main() {
  vec3 N = normalize( vN );
  vec3 L = kSun.xyz;
  vec3 col;
  if ( uSide > 0.0 ) {
    vec3 V = normalize( -vRel );
    float mu = dot( -V, L );
    float dl = clamp( dot( N, L ) * 0.85 + 0.15, 0.0, 1.0 );
    float ao = 0.55 + 0.45 * smoothstep( 0.25, 0.85, vH );
    col = uTint * ( kSunColor.rgb * dl * 0.5 + kanatIrradiance( N ) * 0.3 * ao ) * ( 0.75 + 0.3 * vH );
    col += kSunColor.rgb * kHG( mu, 0.7 ) * 0.2 * ( 1.0 - vH );
  } else {
    col = uTint * kanatIrradiance( vec3( 0.0, -1.0, 0.0 ) ) * ( 0.28 + 0.12 * vH );
  }
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Clouds {
  readonly object = new THREE.Group();
  private atlas: THREE.WebGLRenderTarget;
  private sprites: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial> | null = null;
  private seaTop: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private seaBottom: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private band: [number, number] | null = null;
  private inside = 0;
  readonly count: number;

  constructor(renderer: THREE.WebGLRenderer, params: RenderTierParams, opts: CloudsOptions) {
    this.object.name = 'kanat-clouds';
    // Atlas generation (once per world).
    this.atlas = new THREE.WebGLRenderTarget(512, 512, {
      type: THREE.UnsignedByteType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      colorSpace: THREE.NoColorSpace,
    });
    {
      const mat = new THREE.ShaderMaterial({ vertexShader: GEN_VERT, fragmentShader: GEN_FRAG, depthTest: false, depthWrite: false, toneMapped: false });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      quad.frustumCulled = false;
      const scene = new THREE.Scene();
      scene.add(quad);
      const prev = renderer.getRenderTarget();
      const prevTM = renderer.toneMapping;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setRenderTarget(this.atlas);
      renderer.render(scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
      renderer.setRenderTarget(prev);
      renderer.toneMapping = prevTM;
      mat.dispose();
      quad.geometry.dispose();
    }
    const tint = [0, 0, 0];
    hexToLinear(opts.tint, tint);
    const tintC = new THREE.Color().setRGB(tint[0], tint[1], tint[2], THREE.LinearSRGBColorSpace);

    // Impostor field.
    const n = Math.round(params.clouds.impostors * Math.min(1, 0.35 + opts.coverage));
    this.count = n;
    if (n > 0) {
      const r = rng(opts.worldId.length * 7919 + 17);
      const a1 = new Float32Array(n * 4);
      const a2 = new Float32Array(n * 2);
      const base = Math.max(opts.maxY + 500, (opts.seaTop ?? 0) + 250);
      for (let i = 0; i < n; i++) {
        const ang = r() * Math.PI * 2;
        const rad = 3500 + Math.pow(r(), 0.6) * 15000;
        a1[i * 4] = Math.cos(ang) * rad;
        a1[i * 4 + 1] = base + r() * 900;
        a1[i * 4 + 2] = Math.sin(ang) * rad;
        a1[i * 4 + 3] = 900 + r() * 1500;
        a2[i * 2] = Math.floor(r() * 16);
        a2[i * 2 + 1] = 0;
      }
      const g = new THREE.InstancedBufferGeometry();
      const quad = new THREE.PlaneGeometry(1, 1);
      g.index = quad.index;
      g.setAttribute('position', quad.getAttribute('position'));
      g.setAttribute('aCloud', new THREE.InstancedBufferAttribute(a1, 4));
      g.setAttribute('aCloudB', new THREE.InstancedBufferAttribute(a2, 2));
      g.instanceCount = n;
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...atmosphereUniforms, uAtlas: { value: this.atlas.texture }, uTint: { value: tintC }, uHideNear: { value: 0 } },
        vertexShader: SPRITE_VERT,
        fragmentShader: SPRITE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        fog: true,
      });
      this.sprites = new THREE.Mesh(g, mat);
      this.sprites.frustumCulled = false;
      this.sprites.renderOrder = 10;
      this.object.add(this.sprites);
    }

    // Karadeniz cloud sea.
    if (opts.seaTop !== null && opts.seaBottom !== null) {
      this.band = [opts.seaBottom, opts.seaTop];
      const seg = params.level === 0 ? 64 : 112;
      const mk = (side: number, h: number) => {
        const geo = new THREE.PlaneGeometry(2, 2, seg, seg);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            ...atmosphereUniforms,
            uSea: { value: new THREE.Vector4(0, 0, h, opts.extent) },
            uSide: { value: side },
            uTime: { value: 0 },
            uTint: { value: tintC },
          },
          vertexShader: SEA_VERT,
          fragmentShader: SEA_FRAG,
          fog: true,
          side: side > 0 ? THREE.FrontSide : THREE.BackSide,
        });
        const m = new THREE.Mesh(geo, mat);
        m.frustumCulled = false;
        m.renderOrder = -4;
        return m;
      };
      this.seaTop = mk(1, opts.seaTop);
      this.seaBottom = mk(-1, opts.seaBottom);
      this.object.add(this.seaTop, this.seaBottom);
    }
  }

  /** 0..1 how deep the camera is inside the cloud band (drives the white-out). */
  get insideFactor(): number {
    return this.inside;
  }

  /** Cloud immersion 0..1 at a world position (cloud-sea band; 0 when the world has none). Allocation-free. */
  immersion(_x: number, y: number, _z: number): number {
    const band = this.band;
    if (!band) return 0;
    const ramp = 60;
    return Math.min(1, Math.max(0, Math.min((y - (band[0] - 20)) / ramp, (band[1] + 20 - y) / ramp)));
  }

  update(time: number, camera: THREE.Camera): void {
    const inside = this.immersion(camera.position.x, camera.position.y, camera.position.z);
    if (this.band) {
      for (const m of [this.seaTop, this.seaBottom]) {
        if (!m) continue;
        const u = m.material.uniforms;
        const s = u.uSea.value as THREE.Vector4;
        s.x = Math.round(camera.position.x / 128) * 128;
        s.y = Math.round(camera.position.z / 128) * 128;
        u.uTime.value = time % 3000;
        m.visible = inside < 0.98;
      }
    }
    this.inside = inside;
    setCloudInside(inside, 0.09);
    if (this.sprites) {
      this.sprites.material.uniforms.uHideNear.value = inside > 0.05 ? 1 : 0;
      this.sprites.visible = inside < 0.95;
    }
  }

  dispose(): void {
    this.atlas.dispose();
    for (const m of [this.sprites, this.seaTop, this.seaBottom]) {
      if (!m) continue;
      m.geometry.dispose();
      m.material.dispose();
    }
    setCloudInside(0);
  }
}
