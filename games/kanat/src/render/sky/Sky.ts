// Sky: the analytic KANAT sky (shared kanatSky() from atmosphere.ts) baked ONCE per world into a 256² HalfFloat
// cubemap (+ painterly cirrus above the horizon band), used for (1) the background dome, (2) PMREM environment
// for props/water, (3) the ambient SH (computed analytically on the CPU twin). Per-frame cost: one far-plane dome
// draw (1 cube lookup + analytic sun disc + dither), drawn last among opaques so terrain occludes it (early-Z).
import * as THREE from 'three';
import { ATMOSPHERE_GLSL, atmosphereUniforms } from '../shaders/atmosphere.ts';

const BAKE_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize( ( modelMatrix * vec4( position, 0.0 ) ).xyz );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const BAKE_FRAG = /* glsl */ `
${ATMOSPHERE_GLSL}
uniform float uCoverage;
uniform vec3 uCloudTint;
varying vec3 vDir;

float fbm( vec2 p ) {
  float a = 0.5, s = 0.0;
  for ( int i = 0; i < 5; i ++ ) { s += a * kValueNoise( p ); p = p * 2.03 + vec2( 17.1, 3.7 ); a *= 0.5; }
  return s;
}

void main() {
  vec3 dir = normalize( vDir );
  vec3 col = kanatSky( dir );
  // Painterly high cirrus / altocumulus streaks: only above the horizon band so the horizon matches the fog.
  if ( uCoverage > 0.0 && dir.y > 0.02 ) {
    vec2 p = dir.xz / ( dir.y + 0.12 );
    vec2 w = normalize( kAtmoTime.yz + vec2( 1e-4 ) );
    vec2 q = vec2( dot( p, w ), dot( p, vec2( -w.y, w.x ) ) );
    q *= vec2( 0.9, 3.2 );
    float n = fbm( q * 1.3 + 4.0 ) * 0.7 + fbm( q * 4.1 + 11.0 ) * 0.3;
    float d = smoothstep( 1.0 - uCoverage * 0.75, 1.05, n + 0.18 );
    d *= smoothstep( 0.02, 0.22, dir.y ) * ( 1.0 - 0.5 * smoothstep( 0.4, 1.0, dir.y ) );
    float mu = dot( dir, kSun.xyz );
    vec3 lit = uCloudTint * ( kSunColor.rgb * ( 0.10 + 0.55 * kHG( mu, 0.6 ) ) + kanatSky( vec3( 0.0, 1.0, 0.0 ) ) * 0.9 );
    col = mix( col, lit, d * 0.65 );
  }
  gl_FragColor = vec4( col, 1.0 );
}
`;

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = ( modelMatrix * vec4( position, 0.0 ) ).xyz;
  vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_Position = p.xyww;
  gl_Position.z = p.w * 0.999999;
}
`;

const DOME_FRAG = /* glsl */ `
${ATMOSPHERE_GLSL}
uniform samplerCube uSkyCube;
uniform float uSunDiscOn;
uniform float uGlow;
varying vec3 vDir;
void main() {
  vec3 dir = normalize( vDir );
  if ( kAtmoTime.w > 0.5 ) { gl_FragColor = vec4( 1.0, 0.0, 1.0, 1.0 ); return; }
  vec3 col = textureLod( uSkyCube, dir, 0.0 ).rgb;
  col += kanatSunDisc( dir ) * uSunDiscOn;
  // Painterly sun glow (Low has no bloom; on Medium+ bloom adds on top of this subtle base).
  float mu = max( dot( dir, kSun.xyz ), 0.0 );
  col += kSunColor.rgb * ( pow( mu, 900.0 ) * 0.9 + pow( mu, 90.0 ) * 0.10 ) * uSunDiscOn * uGlow;
  // Inside-cloud white-out also covers the sky.
  col = mix( col, vec3( kGroundFogColor.w ), clamp( kFogFade.z, 0.0, 1.0 ) );
  // Triangular dither in linear space before quantisation (sky gradients never band).
  float n = kHash12( gl_FragCoord.xy ) + kHash12( gl_FragCoord.yx * 1.31 + 7.0 ) - 1.0;
  col *= 1.0 + n * 0.012;
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class Sky {
  readonly cubeRT: THREE.WebGLCubeRenderTarget;
  readonly dome: THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>;
  envMap: THREE.Texture | null = null;
  private bakeScene = new THREE.Scene();
  private bakeMat: THREE.ShaderMaterial;
  private bakeMesh: THREE.Mesh;
  private cubeCam: THREE.CubeCamera;
  private pmrem: THREE.PMREMGenerator | null = null;
  private pmremRT: THREE.WebGLRenderTarget | null = null;

  constructor(size = 256) {
    this.cubeRT = new THREE.WebGLCubeRenderTarget(size, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    this.bakeMat = new THREE.ShaderMaterial({
      uniforms: { ...atmosphereUniforms, uCoverage: { value: 0.2 }, uCloudTint: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: BAKE_VERT,
      fragmentShader: BAKE_FRAG,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.bakeMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), this.bakeMat);
    this.bakeScene.add(this.bakeMesh);
    this.cubeCam = new THREE.CubeCamera(0.1, 100, this.cubeRT);
    this.bakeScene.add(this.cubeCam);

    const domeMat = new THREE.ShaderMaterial({
      uniforms: { ...atmosphereUniforms, uSkyCube: { value: this.cubeRT.texture }, uSunDiscOn: { value: 1 }, uGlow: { value: 1 } },
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      toneMapped: true,
    });
    this.dome = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), domeMat);
    this.dome.name = 'kanat-sky-dome';
    this.dome.frustumCulled = false;
    this.dome.renderOrder = 1e6; // last among opaques → terrain early-Z rejects hidden sky pixels
    this.dome.matrixAutoUpdate = false;
  }

  /** Bake the cubemap + PMREM for the current atmosphere state. Call after setAtmosphere(). */
  bake(renderer: THREE.WebGLRenderer, coverage: number, cloudTint: THREE.Color, withPmrem: boolean): void {
    this.bakeMat.uniforms.uCoverage.value = coverage;
    (this.bakeMat.uniforms.uCloudTint.value as THREE.Color).copy(cloudTint);
    const prevTM = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    this.cubeCam.update(renderer, this.bakeScene);
    renderer.toneMapping = prevTM;
    if (withPmrem) {
      if (!this.pmrem) this.pmrem = new THREE.PMREMGenerator(renderer);
      if (this.pmremRT) this.pmremRT.dispose();
      this.pmremRT = this.pmrem.fromCubemap(this.cubeRT.texture);
      this.envMap = this.pmremRT.texture;
    } else {
      if (this.pmremRT) this.pmremRT.dispose();
      this.pmremRT = null;
      this.envMap = null;
    }
  }

  /** Keep the dome centred on the camera (no precision issues, never clipped). */
  update(camera: THREE.Camera): void {
    this.dome.matrix.makeTranslation(camera.position.x, camera.position.y, camera.position.z);
    this.dome.matrixWorld.copy(this.dome.matrix);
  }

  setSunDisc(on: boolean): void {
    this.dome.material.uniforms.uSunDiscOn.value = on ? 1 : 0;
  }

  dispose(): void {
    this.cubeRT.dispose();
    this.pmremRT?.dispose();
    this.pmrem?.dispose();
    this.bakeMat.dispose();
    this.bakeMesh.geometry.dispose();
    this.dome.geometry.dispose();
    this.dome.material.dispose();
  }
}
