// Procedural, seamlessly tiling terrain detail layers generated on the GPU at world load (no downloads, no
// shipped bytes): a 4-layer 2D array texture, RGB = albedo modulation around 0.5 (×2 in the shader → mean 1.0),
// A = height (height-blend + derivative bump). One recipe per material kind (§3.3): tuff, rock, dry grass, soil,
// snow, travertine, forest floor, sand. Generated once per world (~4 full-screen draws), mipmapped.
import * as THREE from 'three';

export type LayerKind = 'tuff' | 'rock' | 'grass' | 'soil' | 'snow' | 'travertine' | 'forest' | 'sand';
export const LAYER_KIND_INDEX: Record<LayerKind, number> = {
  tuff: 0, rock: 1, grass: 2, soil: 3, snow: 4, travertine: 5, forest: 6, sand: 7,
};

/** Map a world.json layer id (Turkish names) to a material kind. */
export function layerKind(id: string): LayerKind {
  const s = id.toLowerCase();
  if (s.includes('tuf')) return 'tuff';
  if (s.includes('trav')) return 'travertine';
  if (s.includes('kar') || s.includes('snow') || s.includes('buz') || s.includes('ice')) return 'snow';
  if (s.includes('kum') || s.includes('sand') || s.includes('sahil') || s.includes('plaj')) return 'sand';
  if (s.includes('cam') || s.includes('çam') || s.includes('ladin') || s.includes('orman') || s.includes('igne') || s.includes('forest') || s.includes('ardic') || s.includes('maki')) return 'forest';
  if (s.includes('ot') || s.includes('cayir') || s.includes('çayır') || s.includes('grass') || s.includes('meadow') || s.includes('bag') || s.includes('bağ')) return 'grass';
  if (s.includes('toprak') || s.includes('soil') || s.includes('dirt') || s.includes('tarla')) return 'soil';
  return 'rock';
}

/** World-metres per texture tile for each kind (512² → 0.6–1.6 cm/texel). */
export const LAYER_TILE_M: Record<LayerKind, number> = {
  tuff: 5, rock: 6, grass: 3, soil: 4, snow: 8, travertine: 5, forest: 4, sand: 4,
};
/** Derivative-bump strength per kind. */
export const LAYER_BUMP: Record<LayerKind, number> = {
  tuff: 1.4, rock: 2.2, grass: 0.8, soil: 1.0, snow: 0.35, travertine: 0.9, forest: 1.0, sand: 0.5,
};

const GEN_FRAG = /* glsl */ `
precision highp float;
uniform int uKind;
uniform float uSeed;
uniform float uSize;
varying vec2 vUv;

float h21( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 + uSeed * 0.013 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
vec2 h22( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * vec3( 0.1031, 0.1030, 0.0973 ) + uSeed * 0.017 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.xx + p3.yz ) * p3.zy );
}
// Periodic value noise (period in lattice cells).
float pn( vec2 p, float per ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  float a = h21( mod( i, per ) );
  float b = h21( mod( i + vec2( 1.0, 0.0 ), per ) );
  float c = h21( mod( i + vec2( 0.0, 1.0 ), per ) );
  float d = h21( mod( i + vec2( 1.0, 1.0 ), per ) );
  return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y );
}
float fbm( vec2 uv, float base, int oct ) {
  float s = 0.0, a = 0.5, per = base, n = 0.0;
  for ( int i = 0; i < 7; i ++ ) {
    if ( i >= oct ) break;
    s += a * pn( uv * per, per );
    n += a;
    per *= 2.0;
    a *= 0.5;
  }
  return s / n;
}
float ridged( vec2 uv, float base, int oct ) {
  float s = 0.0, a = 0.5, per = base, n = 0.0;
  for ( int i = 0; i < 6; i ++ ) {
    if ( i >= oct ) break;
    s += a * ( 1.0 - abs( pn( uv * per, per ) * 2.0 - 1.0 ) );
    n += a;
    per *= 2.0;
    a *= 0.5;
  }
  return s / n;
}
// Periodic Worley: returns (F1, F2).
vec2 worley( vec2 uv, float per ) {
  vec2 p = uv * per;
  vec2 i = floor( p );
  vec2 f = fract( p );
  float f1 = 9.0, f2 = 9.0;
  for ( int y = -1; y <= 1; y ++ ) {
    for ( int x = -1; x <= 1; x ++ ) {
      vec2 g = vec2( float( x ), float( y ) );
      vec2 o = h22( mod( i + g, per ) );
      float d = length( g + o - f );
      if ( d < f1 ) { f2 = f1; f1 = d; } else if ( d < f2 ) { f2 = d; }
    }
  }
  return vec2( f1, f2 );
}

void main() {
  vec2 uv = vUv;
  vec3 c = vec3( 0.5 );
  float h = 0.5;
  if ( uKind == 0 ) {
    // Tuff: soft porous volcanic ash, pitting, faint micro layering, rain runnels.
    float n = fbm( uv, 4.0, 6 );
    vec2 w = worley( uv + n * 0.03, 22.0 );
    float pit = 1.0 - smoothstep( 0.0, 0.22, w.x );
    vec2 w2 = worley( uv, 70.0 );
    float pit2 = 1.0 - smoothstep( 0.0, 0.18, w2.x );
    float layers = sin( ( uv.y + n * 0.05 ) * 6.2831 * 9.0 ) * 0.5 + 0.5;
    float run = pn( vec2( uv.x * 64.0, uv.y * 4.0 ), 64.0 );
    h = 0.55 + ( n - 0.5 ) * 0.6 - pit * 0.25 - pit2 * 0.12 + layers * 0.05 - run * 0.06;
    float v = 1.0 + ( n - 0.5 ) * 0.28 - pit * 0.18 - pit2 * 0.08 + layers * 0.04 - run * 0.05;
    c = vec3( v ) * vec3( 1.01, 1.0, 0.98 ) * 0.5;
  } else if ( uKind == 1 ) {
    // Rock: cracked, faceted, lichen speckles.
    float r = ridged( uv, 3.0, 6 );
    vec2 w = worley( uv + fbm( uv, 6.0, 3 ) * 0.04, 9.0 );
    // Sparse, irregular fissures (masked network), not a full cellular grid.
    float crack = ( 1.0 - smoothstep( 0.0, 0.035, w.y - w.x ) ) * smoothstep( 0.52, 0.72, fbm( uv + 1.7, 5.0, 4 ) );
    float n = fbm( uv, 8.0, 5 );
    float lichen = smoothstep( 0.62, 0.75, fbm( uv + 3.1, 12.0, 4 ) );
    h = 0.35 + r * 0.55 - crack * 0.25 + ( n - 0.5 ) * 0.2;
    float v = 0.86 + r * 0.26 - crack * 0.16 + ( n - 0.5 ) * 0.22;
    c = vec3( v ) * 0.5;
    c = mix( c, c * vec3( 1.1, 1.08, 0.86 ), lichen * 0.7 );
  } else if ( uKind == 2 ) {
    // Dry grass: anisotropic blades, irregular tufts (fbm, not cellular), soil gaps.
    float n = fbm( uv, 5.0, 5 );
    float tuft = smoothstep( 0.38, 0.62, fbm( uv + 2.3, 9.0, 4 ) );
    float blades = pn( vec2( uv.x * 220.0, uv.y * 26.0 ), 220.0 ) * 0.55 + pn( vec2( uv.x * 110.0 + 3.0, uv.y * 15.0 ), 110.0 ) * 0.45;
    float cross2 = pn( vec2( uv.y * 200.0, uv.x * 24.0 ), 200.0 );
    float b2 = mix( blades, cross2, step( 0.5, fbm( uv + 5.0, 6.0, 2 ) ) );
    h = tuft * 0.55 + b2 * 0.35 + n * 0.1;
    float v = 0.86 + ( b2 - 0.5 ) * 0.28 + ( n - 0.5 ) * 0.22 + tuft * 0.06;
    vec3 tint = mix( vec3( 1.06, 1.0, 0.84 ), vec3( 0.93, 1.03, 0.93 ), fbm( uv + 7.0, 3.0, 3 ) );
    c = vec3( v ) * tint * 0.5;
    c = mix( c * vec3( 0.86, 0.8, 0.74 ), c, 0.4 + 0.6 * tuft );
  } else if ( uKind == 3 ) {
    // Soil / gravel: granular with pebbles.
    float g = h21( floor( uv * 512.0 ) ) * 0.5 + fbm( uv, 32.0, 4 ) * 0.5;
    vec2 w = worley( uv, 26.0 );
    float peb = 1.0 - smoothstep( 0.18, 0.42, w.x );
    float damp = smoothstep( 0.45, 0.7, fbm( uv, 3.0, 4 ) );
    h = 0.3 + g * 0.3 + peb * 0.45;
    float v = 0.85 + ( g - 0.5 ) * 0.3 + peb * 0.22 - damp * 0.14;
    c = vec3( v ) * 0.5;
  } else if ( uKind == 4 ) {
    // Snow: smooth wind ripples, sparkle specks (bright texels).
    float n = fbm( uv, 3.0, 5 );
    float rip = sin( ( uv.x * 0.8 + uv.y * 0.6 + n * 0.25 ) * 6.2831 * 14.0 ) * 0.5 + 0.5;
    float sp = step( 0.996, h21( floor( uv * 512.0 ) + 0.5 ) );
    h = 0.5 + ( n - 0.5 ) * 0.5 + rip * 0.12;
    float v = 0.97 + ( n - 0.5 ) * 0.06 + rip * 0.03 + sp * 0.12;
    c = vec3( v ) * vec3( 0.99, 1.0, 1.02 ) * 0.5;
  } else if ( uKind == 5 ) {
    // Travertine: creamy smooth with raised micro rims and darker wet hollows.
    vec2 w = worley( uv + fbm( uv, 4.0, 3 ) * 0.06, 8.0 );
    float rim = 1.0 - smoothstep( 0.0, 0.05, w.y - w.x );
    float n = fbm( uv, 10.0, 5 );
    float wet = 1.0 - smoothstep( 0.1, 0.5, w.x );
    h = 0.45 + rim * 0.4 + ( n - 0.5 ) * 0.15 - wet * 0.1;
    float v = 0.98 + rim * 0.1 + ( n - 0.5 ) * 0.1 - wet * 0.08;
    c = vec3( v ) * 0.5;
  } else if ( uKind == 6 ) {
    // Forest floor: needles, mottled shade, roots.
    float n = fbm( uv, 6.0, 5 );
    float nd = pn( vec2( uv.x * 140.0, uv.y * 30.0 ), 140.0 ) * pn( vec2( uv.y * 120.0, uv.x * 25.0 ), 120.0 );
    float mot = smoothstep( 0.35, 0.7, fbm( uv + 9.0, 3.0, 4 ) );
    h = 0.4 + n * 0.3 + nd * 0.4;
    float v = 0.7 + n * 0.3 + nd * 0.35 - mot * 0.15;
    c = vec3( v ) * mix( vec3( 1.06, 0.98, 0.86 ), vec3( 0.9, 1.05, 0.92 ), mot ) * 0.5;
  } else {
    // Sand: fine grain + soft ripples.
    float g = h21( floor( uv * 512.0 ) );
    float n = fbm( uv, 4.0, 4 );
    float rip = sin( ( uv.y + n * 0.08 ) * 6.2831 * 18.0 ) * 0.5 + 0.5;
    h = 0.4 + rip * 0.3 + ( g - 0.5 ) * 0.1;
    float v = 0.95 + ( g - 0.5 ) * 0.12 + rip * 0.05 + ( n - 0.5 ) * 0.1;
    c = vec3( v ) * 0.5;
  }
  gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), clamp( h, 0.0, 1.0 ) );
}
`;

const GEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }
`;

export class DetailTextures {
  readonly rt: THREE.WebGLArrayRenderTarget;
  readonly kinds: LayerKind[];

  constructor(renderer: THREE.WebGLRenderer, kinds: LayerKind[], size = 512, anisotropy = 1) {
    this.kinds = kinds;
    this.rt = new THREE.WebGLArrayRenderTarget(size, size, 4, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      colorSpace: THREE.NoColorSpace,
    });
    const tex = this.rt.texture;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = anisotropy;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uKind: { value: 0 }, uSeed: { value: 0 }, uSize: { value: size } },
      vertexShader: GEN_VERT,
      fragmentShader: GEN_FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const prevRT = renderer.getRenderTarget();
    const prevTM = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    for (let i = 0; i < 4; i++) {
      mat.uniforms.uKind.value = LAYER_KIND_INDEX[kinds[i] ?? 'rock'];
      mat.uniforms.uSeed.value = i * 17 + 3;
      renderer.setRenderTarget(this.rt, i);
      renderer.render(scene, cam);
    }
    renderer.setRenderTarget(prevRT);
    renderer.toneMapping = prevTM;
    mat.dispose();
    quad.geometry.dispose();
  }

  get texture(): THREE.Texture {
    return this.rt.texture;
  }

  dispose(): void {
    this.rt.dispose();
  }
}
