// Thin renderer module: everything that touches THREE.WebGLRenderer directly lives here, so a WebGPU path can
// be added later behind the same surface (create / setTier / setRenderScale / compile / perf / context hooks).
// Tier numbers come from src/perf/tiers.ts (§5.2 / §5.G, owned by platform); render-only knobs are added here.
import * as THREE from 'three';
import type { QualityTier } from '../core/settings.ts';
import { TIERS, mpRange, pixelRatioFor } from '../perf/tiers.ts';
import { installAtmosphere } from './shaders/atmosphere.ts';

export type TerrainProjection = 'planar' | 'biplanar' | 'triplanar';

/** Render-side tier parameters (data only). */
export interface RenderTierParams {
  tier: QualityTier;
  level: 0 | 1 | 2 | 3;
  dprCap: number;
  mpMin: number;
  mpMax: number;
  maxDrawCalls: number;
  maxTriangles: number;
  maxTextureMB: number;
  anisotropy: number;
  /** Render-target type for the composer (Low has no composer). */
  rtType: THREE.TextureDataType;
  composer: boolean;
  bloom: 'none' | 'half' | 'full';
  aa: 'none' | 'fxaa' | 'smaa';
  godRays: boolean;
  photoDof: boolean;
  /** Shadow map size for hero objects (0 = baked + blob decal only). */
  shadowMapSize: 0 | 1024 | 2048;
  shadowCascades: 0 | 1 | 2 | 3;
  shadowDistance: number;
  particleCap: number;
  speedLines: number;
  softParticles: boolean;
  terrain: {
    grid: 17 | 33;
    extraLevel: boolean;
    lod0Radius: number;
    /** Fog fade end (m): terrain fully dissolved into the sky colour (capped by far-ring data extent). */
    viewDistance: number;
    projection: TerrainProjection;
    detailNormal: boolean;
    /** Distance (m) beyond which only the macro colour map is sampled. */
    detailFar: number;
  };
  clouds: { impostors: number; layers: number };
  water: { normals: 1 | 2; depthColor: boolean; foam: boolean; caustics: boolean; planarReflection: boolean };
}

const LEVEL: Record<QualityTier, 0 | 1 | 2 | 3> = { low: 0, medium: 1, high: 2, ultra: 3 };

/** Far-ring data is 49 km wide (±24.5 km), core play area ±3.8 km → edge never closer than ~20.5 km. */
export const MAX_VIEW_DISTANCE = 19_500;

export function renderTierParams(tier: QualityTier): RenderTierParams {
  const t = TIERS[tier];
  const c = t.common;
  const k = t.kanat;
  const level = LEVEL[tier];
  const shadow: Record<QualityTier, [0 | 1024 | 2048, 0 | 1 | 2 | 3, number]> = {
    low: [0, 0, 0], medium: [1024, 1, 80], high: [2048, 2, 160], ultra: [2048, 3, 300],
  };
  const [shadowMapSize, shadowCascades, shadowDistance] = shadow[tier];
  return {
    tier,
    level,
    dprCap: c.dprCap,
    mpMin: c.mpMin,
    mpMax: c.mpMax,
    maxDrawCalls: c.maxDrawCalls,
    maxTriangles: c.maxTriangles,
    maxTextureMB: c.maxTextureMB,
    anisotropy: c.anisotropy,
    rtType: c.renderTarget === 'halfFloat' ? THREE.HalfFloatType : THREE.UnsignedByteType,
    composer: tier !== 'low',
    bloom: tier === 'low' ? 'none' : tier === 'medium' ? 'half' : 'full',
    aa: tier === 'low' ? 'none' : tier === 'medium' ? 'fxaa' : 'smaa',
    godRays: level >= 2,
    photoDof: tier === 'ultra',
    shadowMapSize,
    shadowCascades,
    shadowDistance,
    particleCap: c.particleCap,
    speedLines: k.speedLines,
    softParticles: level >= 2,
    terrain: {
      grid: k.cdlodGrid === 17 ? 17 : 33,
      extraLevel: k.cdlodExtraLevel,
      lod0Radius: k.lod0RadiusM,
      viewDistance: Math.min(k.terrainViewKm * 1000, MAX_VIEW_DISTANCE),
      projection: tier === 'low' ? 'planar' : tier === 'medium' ? 'biplanar' : 'triplanar',
      detailNormal: true,
      detailFar: 600,
    },
    clouds: { impostors: k.cloudImpostors, layers: k.cloudLayers },
    water: {
      normals: level >= 2 ? 2 : 1,
      depthColor: level >= 1,
      foam: level >= 1,
      caustics: level >= 2,
      planarReflection: tier === 'ultra',
    },
  };
}

export interface RendererPerf {
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  programs: number;
  textures: number;
  geometries: number;
  /** Estimated GPU texture memory (MB) of textures registered via trackTexture() + render targets. */
  textureMB: number;
  pixelRatio: number;
  megapixels: number;
}

type Hook = () => void;

/** Bytes per texel estimate for a texture (format/type aware, mips +33 %). */
export function textureBytes(t: THREE.Texture): number {
  const img = t.image as { width?: number; height?: number; depth?: number; data?: ArrayBufferView } | undefined;
  const w = img?.width ?? 0;
  const h = img?.height ?? 0;
  const d = img?.depth ?? 1;
  let bpp = 4;
  if (t.type === THREE.FloatType) bpp = 4 * channels(t.format);
  else if (t.type === THREE.HalfFloatType) bpp = 2 * channels(t.format);
  else bpp = channels(t.format);
  if ((t as THREE.CompressedTexture).isCompressedTexture) bpp = 1;
  const mip = t.generateMipmaps || (t.mipmaps && t.mipmaps.length > 1) ? 4 / 3 : 1;
  const faces = (t as THREE.CubeTexture).isCubeTexture ? 6 : 1;
  return w * h * d * bpp * mip * faces;
}

function channels(f: THREE.AnyPixelFormat): number {
  if (f === THREE.RedFormat || f === THREE.RedIntegerFormat) return 1;
  if (f === THREE.RGFormat || f === THREE.RGIntegerFormat) return 2;
  return 4;
}

/**
 * KanatRenderer: owns the WebGLRenderer and its sizing/tier/scale/context lifecycle.
 * Usage: const r = new KanatRenderer(canvas, 'medium'); r.setSize(w, h); ... r.renderer.render(scene, cam)
 */
export class KanatRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  params: RenderTierParams;
  /** 0..1 position inside the tier MP range (PerformanceDirector governor drives this). */
  renderScale = 0.5;
  private cssW = 1;
  private cssH = 1;
  private deviceDpr = 1;
  private lostHooks: Hook[] = [];
  private restoredHooks: Hook[] = [];
  private tracked = new Set<THREE.Texture>();
  private trackedRT = new Set<THREE.RenderTarget>();
  contextLost = false;

  constructor(canvas: HTMLCanvasElement, tier: QualityTier, opts: { preserveDrawingBuffer?: boolean } = {}) {
    installAtmosphere();
    this.canvas = canvas;
    this.params = renderTierParams(tier);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
      precision: 'highp',
    });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.autoClear = true;
    r.info.autoReset = false;
    r.shadowMap.enabled = false;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.applyToneMapping();
    this.deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.addEventListener('webglcontextlost', this.onLost, false);
    canvas.addEventListener('webglcontextrestored', this.onRestored, false);
  }

  get tier(): QualityTier {
    return this.params.tier;
  }

  /** Low: AgX + grade in material shaders (no composer). Medium+: NoToneMapping (post does AgX + grade). */
  private applyToneMapping(): void {
    const r = this.renderer;
    if (this.params.composer) {
      r.toneMapping = THREE.NoToneMapping;
    } else {
      r.toneMapping = THREE.AgXToneMapping;
    }
  }

  setExposure(e: number): void {
    this.renderer.toneMappingExposure = e;
  }

  /** Change tier: only at natural breaks (program recompiles). */
  setTier(tier: QualityTier): void {
    this.params = renderTierParams(tier);
    this.applyToneMapping();
    this.renderer.shadowMap.enabled = this.params.shadowMapSize > 0;
    this.renderer.shadowMap.needsUpdate = true;
    this.applySize();
  }

  /** CSS size of the canvas. */
  setSize(cssW: number, cssH: number, deviceDpr?: number): void {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    if (deviceDpr !== undefined) this.deviceDpr = deviceDpr;
    this.applySize();
  }

  /** Governor hook: s in [0,1] maps linearly onto the tier megapixel range (clamped to native). */
  setRenderScale(s: number): void {
    this.renderScale = Math.min(1, Math.max(0, s));
    this.applySize();
  }

  /** Directly request a megapixel target (clamped to the tier range). */
  setMegapixels(mp: number): void {
    this.explicitPr = null;
    const nativeMp = (this.cssW * this.cssH * this.deviceDpr * this.deviceDpr) / 1e6;
    const [lo, hi] = mpRange(this.params.tier, nativeMp);
    this.renderScale = hi > lo ? (Math.min(hi, Math.max(lo, mp)) - lo) / (hi - lo) : 1;
    this.applySize();
  }

  private explicitPr: number | null = null;

  /** Explicit pixel ratio (e.g. from PerformanceDirector.pixelRatioFor), clamped to the tier DPR cap; null = MP-driven. */
  setPixelRatio(pr: number | null): void {
    this.explicitPr = pr;
    this.applySize();
  }

  private applySize(): void {
    if (this.explicitPr !== null) {
      this.renderer.setPixelRatio(Math.max(0.25, Math.min(this.explicitPr, this.params.dprCap)));
      this.renderer.setSize(this.cssW, this.cssH, false);
      return;
    }
    const nativeMp = (this.cssW * this.cssH * this.deviceDpr * this.deviceDpr) / 1e6;
    const [lo, hi] = mpRange(this.params.tier, nativeMp);
    const mp = lo + (hi - lo) * this.renderScale;
    const pr = pixelRatioFor(mp, this.cssW, this.cssH, this.params.dprCap, this.deviceDpr);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.cssW, this.cssH, false);
  }

  get pixelRatio(): number {
    return this.renderer.getPixelRatio();
  }

  drawingBufferSize(out: THREE.Vector2): THREE.Vector2 {
    return this.renderer.getDrawingBufferSize(out);
  }

  /** Register a texture for the memory estimate (and anisotropy policy). */
  trackTexture(t: THREE.Texture, anisotropic = false): void {
    this.tracked.add(t);
    if (anisotropic) t.anisotropy = Math.min(this.params.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
  }

  untrackTexture(t: THREE.Texture): void {
    this.tracked.delete(t);
  }

  trackRenderTarget(rt: THREE.RenderTarget): void {
    this.trackedRT.add(rt);
  }

  untrackRenderTarget(rt: THREE.RenderTarget): void {
    this.trackedRT.delete(rt);
  }

  textureMB(): number {
    let b = 0;
    for (const t of this.tracked) b += textureBytes(t);
    for (const rt of this.trackedRT) {
      const bpp = rt.texture.type === THREE.HalfFloatType ? 8 : rt.texture.type === THREE.FloatType ? 16 : 4;
      b += rt.width * rt.height * (rt.depth || 1) * bpp * (rt.texture.generateMipmaps ? 4 / 3 : 1);
      if (rt.depthBuffer) b += rt.width * rt.height * 4;
    }
    // Default framebuffer (colour + depth).
    const s = this.renderer.getDrawingBufferSize(tmpV2);
    b += s.x * s.y * 8;
    return b / (1024 * 1024);
  }

  /** Warm-up: compile every program the scene needs (avoid runtime hitches, §5.5). */
  async compile(scene: THREE.Object3D, camera: THREE.Camera, target?: THREE.Scene): Promise<void> {
    const r = this.renderer;
    const ext = r.extensions.has('KHR_parallel_shader_compile');
    if (ext) await r.compileAsync(scene, camera, target ?? null);
    else r.compile(scene, camera, target ?? null);
  }

  /** Upload a texture now (avoid first-use upload hitch). */
  initTexture(t: THREE.Texture): void {
    this.renderer.initTexture(t);
  }

  perf(): RendererPerf {
    const i = this.renderer.info;
    const pr = this.renderer.getPixelRatio();
    const s = this.renderer.getDrawingBufferSize(tmpV2);
    return {
      calls: i.render.calls,
      triangles: i.render.triangles,
      points: i.render.points,
      lines: i.render.lines,
      programs: i.programs ? i.programs.length : 0,
      textures: i.memory.textures,
      geometries: i.memory.geometries,
      textureMB: this.textureMB(),
      pixelRatio: pr,
      megapixels: (s.x * s.y) / 1e6,
    };
  }

  onContextLost(cb: Hook): void {
    this.lostHooks.push(cb);
  }

  /** After restore three re-uploads geometries/textures/programs lazily; hooks rebuild RT-generated content. */
  onContextRestored(cb: Hook): void {
    this.restoredHooks.push(cb);
  }

  private onLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    for (const h of this.lostHooks) h();
  };

  private onRestored = (): void => {
    this.contextLost = false;
    this.applySize();
    for (const h of this.restoredHooks) h();
  };

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    this.tracked.clear();
    this.trackedRT.clear();
    this.renderer.dispose();
  }
}

const tmpV2 = new THREE.Vector2();
