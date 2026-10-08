// onBeforeCompile helper for three's built-in lit materials (MeshStandard/MeshPhysical/MeshLambert/MeshDepth…).
// Keeps three's lighting, fog (incl. render-world's KANAT height fog chunk replacement) and shadow paths intact.
import type { Material, WebGLProgramParametersWithUniforms, IUniform } from 'three';

export interface PatchSpec {
  /** Unique program cache key (include anything that changes the generated source, e.g. tier). */
  key: string;
  uniforms?: Record<string, IUniform>;
  defines?: Record<string, string | number | boolean>;
  /** Declarations before main() in the vertex shader. */
  vertexPars?: string;
  /** Code at the very start of vertex main() — compute kP (object/world position) and kN (normal) here. */
  vertexPre?: string;
  /** Replaces <beginnormal_vertex>. Must declare `vec3 objectNormal`. */
  vertexNormal?: string;
  /** Replaces <begin_vertex>. Must declare `vec3 transformed`. */
  vertexBegin?: string;
  /** Inserted after <begin_vertex> (and before skinning) — e.g. cloth flutter in bind space. */
  vertexAfterBegin?: string;
  /** Appended at the end of vertex main(). */
  vertexEnd?: string;
  fragPars?: string;
  /** Start of fragment main() (after diffuseColor declaration) — clip/dither here. */
  fragPre?: string;
  /** After <color_fragment>: modify diffuseColor. */
  fragColor?: string;
  /** After <roughnessmap_fragment>: modify roughnessFactor. */
  fragRoughness?: string;
  /** After <metalnessmap_fragment>: modify metalnessFactor. */
  fragMetalness?: string;
  /** After <normal_fragment_maps>: modify view-space `normal`. */
  fragNormal?: string;
  /** After <emissivemap_fragment>: modify totalEmissiveRadiance. */
  fragEmissive?: string;
  /** After <aomap_fragment>: modify reflectedLight terms. */
  fragLight?: string;
  /** Before <tonemapping_fragment> (gl_FragColor / outgoing light available). */
  fragOut?: string;
}

function inject(src: string, anchor: string, code: string | undefined, mode: 'after' | 'before' | 'replace'): string {
  if (!code) return src;
  if (!src.includes(anchor)) return src;
  if (mode === 'replace') return src.replace(anchor, code);
  if (mode === 'after') return src.replace(anchor, `${anchor}\n${code}`);
  return src.replace(anchor, `${code}\n${anchor}`);
}

export function patchMaterial<T extends Material>(mat: T, spec: PatchSpec): T {
  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    if (spec.uniforms) for (const k of Object.keys(spec.uniforms)) shader.uniforms[k] = spec.uniforms[k];
    let vs = shader.vertexShader;
    let fs = shader.fragmentShader;
    const defs = spec.defines
      ? Object.keys(spec.defines).map((k) => `#define ${k} ${spec.defines![k] === true ? '' : spec.defines![k]}`).join('\n') + '\n'
      : '';
    vs = inject(vs, '#include <common>', defs + (spec.vertexPars ?? ''), 'after');
    vs = inject(vs, 'void main() {', spec.vertexPre, 'after');
    vs = inject(vs, '#include <beginnormal_vertex>', spec.vertexNormal, 'replace');
    vs = inject(vs, '#include <begin_vertex>', spec.vertexBegin, 'replace');
    if (spec.vertexAfterBegin) {
      // begin_vertex may have been replaced; anchor on the following chunk instead.
      vs = inject(vs, '#include <morphtarget_vertex>', spec.vertexAfterBegin, 'before');
    }
    if (spec.vertexEnd) {
      const i = vs.lastIndexOf('}');
      vs = vs.slice(0, i) + spec.vertexEnd + '\n' + vs.slice(i);
    }
    fs = inject(fs, '#include <common>', defs + (spec.fragPars ?? ''), 'after');
    if (spec.fragPre) {
      if (fs.includes('#include <clipping_planes_fragment>')) fs = inject(fs, '#include <clipping_planes_fragment>', spec.fragPre, 'after');
      else fs = inject(fs, 'void main() {', spec.fragPre, 'after');
    }
    fs = inject(fs, '#include <color_fragment>', spec.fragColor, 'after');
    fs = inject(fs, '#include <roughnessmap_fragment>', spec.fragRoughness, 'after');
    fs = inject(fs, '#include <metalnessmap_fragment>', spec.fragMetalness, 'after');
    fs = inject(fs, '#include <normal_fragment_maps>', spec.fragNormal, 'after');
    fs = inject(fs, '#include <emissivemap_fragment>', spec.fragEmissive, 'after');
    fs = inject(fs, '#include <aomap_fragment>', spec.fragLight, 'after');
    fs = inject(fs, '#include <tonemapping_fragment>', spec.fragOut, 'before');
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => spec.key;
  return mat;
}
