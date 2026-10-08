// Medium+ post chain (pmndrs postprocessing 6.39.5): ONE RenderPass + ONE merged EffectPass:
//   [FXAA (Medium) | SMAA (High+)] → Bloom (mipmapBlur; half-res on Medium) → KanatGrade
// KanatGrade = sun god rays (High+, only while the sun is on screen; radial blur of the bloom mip texture, so no
// extra convolution pass) + AgX (three's exact r186 curve, so Low's in-material AgX and Medium+ are identical) +
// the shared grade block (lift/gamma/gain, contrast, saturation, split toning, vignette, grain, dither).
// Verified: postprocessing 6.39.5 ships ToneMappingMode.AGX (=7) and three r186 ships AgXToneMapping; we use our
// own copy of three's AgX GLSL inside KanatGrade to guarantee bit-identical tone between Low and Medium+.
// DOF (Ultra, photo/replay only) is a second EffectPass that exists only while photo mode requests it.
import * as THREE from 'three';
import {
  BloomEffect,
  DepthOfFieldEffect,
  Effect,
  EffectComposer,
  EffectPass,
  FXAAEffect,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
} from 'postprocessing';
import type { KanatRenderer } from '../Renderer.ts';
import { AGX_LOOK_GLSL, GRADE_FUNC_GLSL, HASH_GLSL, atmosphereState, atmosphereUniforms } from '../shaders/atmosphere.ts';

/** three.js r186 AgXToneMapping (MIT), verbatim maths, with our own exposure uniform. */
export const AGX_GLSL = /* glsl */ `
vec3 kAgxContrast( vec3 x ) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return + 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 kAgx( vec3 color, float exposure ) {
  const mat3 LIN_SRGB_TO_REC2020 = mat3(
    vec3( 0.6274, 0.0691, 0.0164 ),
    vec3( 0.3293, 0.9195, 0.0880 ),
    vec3( 0.0433, 0.0113, 0.8956 )
  );
  const mat3 REC2020_TO_LIN_SRGB = mat3(
    vec3( 1.6605, - 0.1246, - 0.0182 ),
    vec3( - 0.5876, 1.1329, - 0.1006 ),
    vec3( - 0.0728, - 0.0083, 1.1187 )
  );
  const mat3 AgXInsetMatrix = mat3(
    vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
    vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
    vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
  );
  const mat3 AgXOutsetMatrix = mat3(
    vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
    vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
    vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
  );
  const float AgxMinEv = - 12.47393;
  const float AgxMaxEv = 4.026069;
  color *= exposure;
  color = LIN_SRGB_TO_REC2020 * color;
  color = AgXInsetMatrix * color;
  color = max( color, 1e-10 );
  color = log2( color );
  color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
  color = clamp( color, 0.0, 1.0 );
  color = kAgxContrast( color );
  ${AGX_LOOK_GLSL}
  color = AgXOutsetMatrix * color;
  color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
  color = REC2020_TO_LIN_SRGB * color;
  return clamp( color, 0.0, 1.0 );
}
`;

const GRADE_EFFECT_FRAG = /* glsl */ `
uniform vec4 kGradeA;
uniform vec4 kGradeB;
uniform vec4 kGradeC;
uniform vec4 kGradeD;
uniform vec4 kGradeE;
uniform vec4 kGradeF;
uniform vec4 kScreen;
uniform vec4 kAtmoTime;
uniform float uExposure;
uniform sampler2D uBloomTex;
uniform vec4 uSunScreen; // xy = sun uv, z = strength (0 = off), w = aspect
uniform vec3 uSunTint;
${HASH_GLSL}
${GRADE_FUNC_GLSL}
${AGX_GLSL}

void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
  vec3 c = inputColor.rgb;
  if ( uSunScreen.z > 0.0 ) {
    // God rays: radial blur of the (already occlusion-aware) bloom mip texture toward the sun.
    vec2 d = ( uSunScreen.xy - uv ) / 14.0;
    vec2 p = uv;
    float acc = 0.0;
    float wsum = 0.0;
    float j = kHash12( uv * kScreen.xy ) ;
    p += d * j;
    for ( int i = 0; i < 14; i ++ ) {
      float wgt = 1.0 - float( i ) / 14.0;
      vec3 b = texture2D( uBloomTex, p ).rgb;
      acc += dot( b, vec3( 0.2126, 0.7152, 0.0722 ) ) * wgt;
      wsum += wgt;
      p += d;
    }
    vec2 dd = ( uv - uSunScreen.xy ) * vec2( uSunScreen.w, 1.0 );
    float fall = 1.0 / ( 1.0 + dot( dd, dd ) * 6.0 );
    c += uSunTint * ( acc / wsum ) * uSunScreen.z * fall;
  }
  c = kAgx( c, uExposure );
  c = kanatGradeFinish( c, uv * kScreen.xy );
  outputColor = vec4( c, inputColor.a );
}
`;

export class KanatGradeEffect extends Effect {
  constructor() {
    const U = atmosphereUniforms;
    super('KanatGradeEffect', GRADE_EFFECT_FRAG, {
      uniforms: new Map<string, THREE.Uniform>([
        ['kGradeA', U.kGradeA as unknown as THREE.Uniform],
        ['kGradeB', U.kGradeB as unknown as THREE.Uniform],
        ['kGradeC', U.kGradeC as unknown as THREE.Uniform],
        ['kGradeD', U.kGradeD as unknown as THREE.Uniform],
        ['kGradeE', U.kGradeE as unknown as THREE.Uniform],
        ['kGradeF', U.kGradeF as unknown as THREE.Uniform],
        ['kScreen', U.kScreen as unknown as THREE.Uniform],
        ['kAtmoTime', U.kAtmoTime as unknown as THREE.Uniform],
        ['uExposure', new THREE.Uniform(1)],
        ['uBloomTex', new THREE.Uniform(null)],
        ['uSunScreen', new THREE.Uniform(new THREE.Vector4(0.5, 0.5, 0, 1))],
        ['uSunTint', new THREE.Uniform(new THREE.Color(1, 0.8, 0.6))],
      ]),
    });
  }
}

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector2();

export class PostPipeline {
  readonly composer: EffectComposer;
  private renderPass: RenderPass;
  private effectPass: EffectPass | null = null;
  private dofPass: EffectPass | null = null;
  private bloom: BloomEffect | null = null;
  private grade: KanatGradeEffect | null = null;
  private dof: DepthOfFieldEffect | null = null;
  private kr: KanatRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  /** Photo mode: depth of field focus distance (m) or null = off. Ultra only. */
  dofFocus: number | null = null;

  constructor(kr: KanatRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.kr = kr;
    this.scene = scene;
    this.camera = camera;
    this.composer = new EffectComposer(kr.renderer, {
      frameBufferType: kr.params.rtType,
      multisampling: 0,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.rebuild();
  }

  /** (Re)create the merged effect pass for the current tier. */
  rebuild(): void {
    const p = this.kr.params;
    if (this.effectPass) {
      this.composer.removePass(this.effectPass);
      this.effectPass.dispose();
      this.effectPass = null;
    }
    this.bloom?.dispose();
    this.grade?.dispose();
    const effects: Effect[] = [];
    if (p.aa === 'smaa') effects.push(new SMAAEffect({ preset: SMAAPreset.HIGH }));
    else if (p.aa === 'fxaa') effects.push(new FXAAEffect());
    this.bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 1.0,
      luminanceSmoothing: 0.25,
      intensity: 0.45,
      radius: 0.72,
      levels: p.bloom === 'half' ? 4 : 6,
      resolutionScale: p.bloom === 'half' ? 0.5 : 1,
    });
    effects.push(this.bloom);
    this.grade = new KanatGradeEffect();
    this.grade.uniforms.get('uBloomTex')!.value = this.bloom.texture;
    effects.push(this.grade);
    this.effectPass = new EffectPass(this.camera, ...effects);
    this.composer.addPass(this.effectPass);
    this.setSize();
  }

  setSize(): void {
    const s = this.kr.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.composer.setSize(s.x, s.y, false);
  }

  private updateDof(): void {
    const want = this.dofFocus !== null && this.kr.params.photoDof;
    if (want && !this.dofPass) {
      this.dof = new DepthOfFieldEffect(this.camera, { focusDistance: 0.02, focalLength: 0.05, bokehScale: 2.5 });
      this.dofPass = new EffectPass(this.camera, this.dof);
      this.composer.addPass(this.dofPass, 1);
    } else if (!want && this.dofPass) {
      this.composer.removePass(this.dofPass);
      this.dofPass.dispose();
      this.dofPass = null;
      this.dof = null;
    }
    if (this.dof && this.dofFocus !== null) this.dof.cocMaterial.worldFocusDistance = this.dofFocus;
  }

  render(dt: number, camera: THREE.Camera): void {
    if (camera !== this.camera) {
      this.camera = camera;
      this.renderPass.mainCamera = camera;
      if (this.effectPass) this.effectPass.mainCamera = camera;
    }
    this.updateDof();
    const g = this.grade;
    if (g) {
      g.uniforms.get('uExposure')!.value = atmosphereState.grade.exposure;
      const sun = g.uniforms.get('uSunScreen')!.value as THREE.Vector4;
      if (this.kr.params.godRays) {
        tmpV.copy(atmosphereState.sunDirection).multiplyScalar(10000).add(camera.position);
        tmpV.project(camera);
        const onScreen = tmpV.z < 1 && Math.abs(tmpV.x) < 1.3 && Math.abs(tmpV.y) < 1.3;
        const s = this.kr.renderer.getDrawingBufferSize(tmpV2);
        sun.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5, onScreen ? 0.55 : 0, s.x / Math.max(1, s.y));
        const sc = atmosphereState.sunColor;
        (g.uniforms.get('uSunTint')!.value as THREE.Color).setRGB(sc.r, sc.g, sc.b);
      } else sun.z = 0;
    }
    this.composer.render(dt);
  }

  dispose(): void {
    this.effectPass?.dispose();
    this.dofPass?.dispose();
    this.bloom?.dispose();
    this.grade?.dispose();
    this.composer.dispose();
  }
}
