// Hemi-octahedral impostor baking (8×8 views over the upper hemisphere) via render-to-texture at load time.
// Two atlases per object set: albedo (sRGB, alpha) and world normal (linear). Frames are laid out per "slot"
// (e.g. tree variant) side by side: atlas width = slots × grid × frame.
import {
  WebGLRenderTarget, OrthographicCamera, Scene, Mesh, SRGBColorSpace, NoColorSpace, LinearFilter, LinearMipmapLinearFilter,
  NoToneMapping, Vector2, Vector3, Color, UnsignedByteType, RGBAFormat, ClampToEdgeWrapping,
} from 'three';
import type { BufferGeometry, Material, WebGLRenderer, Texture } from 'three';

export const IMPOSTOR_GRID = 8;

/** Direction (y ≥ 0) for frame cell (i, j) — must match GLSL kHemiOctDecode. */
export function hemiOctDecode(u: number, v: number, out: Vector3): Vector3 {
  const ex = u * 2 - 1, ey = v * 2 - 1;
  const px = (ex + ey) * 0.5, pz = (ex - ey) * 0.5;
  const y = 1 - Math.abs(px) - Math.abs(pz);
  return out.set(px, Math.max(y, 0), pz).normalize();
}

export const GLSL_HEMI_OCT = /* glsl */ `
vec2 kHemiOctEncode(vec3 d) {
  d.y = max(d.y, 0.0);
  d /= (abs(d.x) + abs(d.y) + abs(d.z));
  return vec2(d.x + d.z, d.x - d.z) * 0.5 + 0.5;
}
vec3 kHemiOctDecode(vec2 uv) {
  vec2 e = uv * 2.0 - 1.0;
  vec2 p = vec2(e.x + e.y, e.x - e.y) * 0.5;
  float y = 1.0 - abs(p.x) - abs(p.y);
  return normalize(vec3(p.x, max(y, 0.0), p.y));
}
// Frame basis — identical to the bake camera (three.js lookAt with up = +Y, or −Z when looking straight down).
void kImpBasis(vec3 f, out vec3 right, out vec3 up) {
  vec3 u0 = abs(f.y) > 0.999 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0);
  right = normalize(cross(u0, f));
  up = cross(f, right);
}
`;

export interface ImpostorAtlas {
  albedo: Texture;
  normal: Texture;
  slots: number;
  frame: number;
  rtA: WebGLRenderTarget;
  rtN: WebGLRenderTarget;
}

export interface ImpostorSlot {
  geometry: BufferGeometry;
  /** Unlit albedo material (outputs base colour + alpha) and world-normal material (outputs n*0.5+0.5). */
  albedoMat: Material;
  normalMat: Material;
  /** Bounding sphere of the object in its own space. */
  center: Vector3;
  radius: number;
}

const _dir = new Vector3();

export function bakeImpostors(renderer: WebGLRenderer, slots: ImpostorSlot[], frame: number): ImpostorAtlas {
  const G = IMPOSTOR_GRID;
  const w = slots.length * G * frame;
  const h = G * frame;
  const mk = (srgb: boolean): WebGLRenderTarget => {
    const rt = new WebGLRenderTarget(w, h, {
      format: RGBAFormat, type: UnsignedByteType, generateMipmaps: true, depthBuffer: true,
      minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter, colorSpace: srgb ? SRGBColorSpace : NoColorSpace,
      wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping,
    });
    return rt;
  };
  const rtA = mk(true);
  const rtN = mk(false);
  const scene = new Scene();
  const mesh = new Mesh();
  mesh.frustumCulled = false;
  scene.add(mesh);
  const cam = new OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  const prevTarget = renderer.getRenderTarget();
  const prevTM = renderer.toneMapping;
  const prevClear = new Color();
  renderer.getClearColor(prevClear);
  const prevAlpha = renderer.getClearAlpha();
  const prevAutoClear = renderer.autoClear;
  const prevScissor = renderer.getScissorTest();
  renderer.toneMapping = NoToneMapping;
  renderer.autoClear = false;
  for (const [rt, which] of [[rtA, 0], [rtN, 1]] as const) {
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0); // black + alpha 0 → filtered texels are premultiplied
    renderer.setScissorTest(false);
    renderer.clear(true, true, true);
    renderer.setScissorTest(true);
    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s];
      mesh.geometry = slot.geometry;
      mesh.material = which === 0 ? slot.albedoMat : slot.normalMat;
      const r = slot.radius * 1.04;
      cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
      cam.near = 0.01; cam.far = r * 4;
      cam.updateProjectionMatrix();
      for (let j = 0; j < G; j++) {
        for (let i = 0; i < G; i++) {
          hemiOctDecode((i + 0.5) / G, (j + 0.5) / G, _dir);
          cam.up.set(0, 1, 0);
          if (Math.abs(_dir.y) > 0.999) cam.up.set(0, 0, -1);
          cam.position.copy(slot.center).addScaledVector(_dir, r * 2);
          cam.lookAt(slot.center);
          cam.updateMatrixWorld();
          const x = (s * G + i) * frame;
          const y = j * frame;
          renderer.setViewport(x, y, frame, frame);
          renderer.setScissor(x, y, frame, frame);
          renderer.render(scene, cam);
        }
      }
    }
  }
  renderer.setScissorTest(prevScissor);
  renderer.setRenderTarget(prevTarget);
  renderer.toneMapping = prevTM;
  renderer.setClearColor(prevClear, prevAlpha);
  renderer.autoClear = prevAutoClear;
  const vp = renderer.getSize(new Vector2());
  renderer.setViewport(0, 0, vp.x, vp.y);
  renderer.setScissor(0, 0, vp.x, vp.y);
  return { albedo: rtA.texture, normal: rtN.texture, slots: slots.length, frame, rtA, rtN };
}
