// WorldRenderer: scene, lighting, atmosphere, sky, terrain, water, clouds and post for one world.
// Integration surface (TECH_CONTRACTS §3): create(canvas, tier) → loadWorld(data) → per frame render(dt, camera);
// setTier(t) only at natural breaks; perf(); dispose() frees everything (world change).
import * as THREE from 'three';
import type { QualityTier } from '../core/settings.ts';
import { worldFile, type LoadedWorld } from '../content/worlds.ts';
import { fetchAsset } from '../core/assets.ts';
import { decodeHeightGrid } from '../sim/terrain/decode.ts';
import type { HeightGrid } from '../sim/terrain/types.ts';
import type { WorldId } from '../sim/types.ts';
import { KanatRenderer, type RendererPerf, type RenderTierParams } from './Renderer.ts';
import {
  atmosphereFog,
  atmosphereState,
  setAtmosphere,
  setAtmosphereDebugMagenta,
  setAtmosphereViewDistance,
  updateAtmosphereFrame,
  type WorldConfigLike,
} from './shaders/atmosphere.ts';
import { Sky } from './sky/Sky.ts';
import { TerrainData } from './terrain/TerrainData.ts';
import { TerrainRenderer } from './terrain/Terrain.ts';
import { bakeTerrainShadow } from './terrain/ShadowBake.ts';
import { hexToLinear } from './color.ts';
import { PostPipeline } from './post/PostPipeline.ts';
import { Water } from './water/Water.ts';
import { Clouds } from './sky/Clouds.ts';

export interface CameraBookmark {
  name: string;
  pos: [number, number, number];
  /** Heading (deg, 0 = north −z, clockwise) and pitch (deg, + up). */
  yaw: number;
  pitch: number;
  fov: number;
}

export interface WorldRenderPerf extends RendererPerf {
  terrainNodes: number;
  terrainTriangles: number;
  tier: QualityTier;
}

const tmpV2 = new THREE.Vector2();

/** Apply a bookmark to a perspective camera (brief heading convention). */
export function applyBookmark(cam: THREE.PerspectiveCamera, b: CameraBookmark): void {
  cam.position.set(b.pos[0], b.pos[1], b.pos[2]);
  const yaw = (b.yaw * Math.PI) / 180;
  const pitch = (b.pitch * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  cam.up.set(0, 1, 0);
  cam.lookAt(cam.position.clone().add(dir));
  cam.fov = b.fov;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
}

export class WorldRenderer {
  readonly kr: KanatRenderer;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** Render-props attach their objects here (cleared by dispose/loadWorld). */
  readonly propsRoot = new THREE.Group();
  readonly sunLight = new THREE.DirectionalLight(0xffffff, 3);
  readonly lightProbe = new THREE.LightProbe();
  readonly sky: Sky;
  terrain: TerrainRenderer | null = null;
  /** Pamukkale 1 m travertine patch (third terrain draw call). */
  terrainPatch: TerrainRenderer | null = null;
  terrainData: TerrainData | null = null;
  /** GPU-baked sun visibility (R) + AO (G) over the core; props may sample it. */
  terrainShadow: THREE.WebGLRenderTarget | null = null;
  water: Water | null = null;
  clouds: Clouds | null = null;
  post: PostPipeline | null = null;
  world: LoadedWorld | null = null;
  worldId: WorldId | null = null;
  private time = 0;
  private debugMagenta = false;

  static create(canvas: HTMLCanvasElement, tier: QualityTier, opts: { preserveDrawingBuffer?: boolean } = {}): WorldRenderer {
    return new WorldRenderer(canvas, tier, opts);
  }

  constructor(canvas: HTMLCanvasElement, tier: QualityTier, opts: { preserveDrawingBuffer?: boolean } = {}) {
    this.kr = new KanatRenderer(canvas, tier, opts);
    this.renderer = this.kr.renderer;
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.5, 30000);
    this.scene.fog = atmosphereFog;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
    this.scene.add(this.lightProbe);
    this.scene.add(this.propsRoot);
    this.sky = new Sky(256);
    this.scene.add(this.sky.dome);
    this.scene.matrixWorldAutoUpdate = true;
    this.kr.onContextRestored(() => this.rebuildGpuContent());
    this.applyTierToScene();
  }

  get params(): RenderTierParams {
    return this.kr.params;
  }

  get tier(): QualityTier {
    return this.kr.tier;
  }

  setSize(cssW: number, cssH: number, dpr?: number): void {
    this.kr.setSize(cssW, cssH, dpr);
    this.camera.aspect = cssW / Math.max(1, cssH);
    this.camera.updateProjectionMatrix();
    this.post?.setSize();
  }

  private applyTierToScene(): void {
    const p = this.kr.params;
    setAtmosphereViewDistance(p.terrain.viewDistance * 0.55, p.terrain.viewDistance);
    this.camera.far = p.terrain.viewDistance * 1.25 + 2000;
    this.camera.updateProjectionMatrix();
  }

  /** Load (or switch to) a world: frees the previous world's GPU resources first. */
  async loadWorld(world: LoadedWorld): Promise<void> {
    this.disposeWorld();
    this.world = world;
    const cfg = world.config;
    this.worldId = cfg.id;
    const p = this.kr.params;
    const fogCfg = cfg.fog as unknown as { baseY?: number; groundFog?: { top?: number; density?: number } | null } | undefined;
    const atmoCfg: WorldConfigLike = {
      id: cfg.id,
      sun: { azimuthDeg: cfg.sun?.azimuthDeg, elevationDeg: cfg.sun?.elevationDeg, kelvin: cfg.sun?.kelvin },
      wind: cfg.wind,
      fog: { groundFog: fogCfg?.groundFog ?? null },
    };
    const images = world.images;
    // The baked data PNGs (splat/shadow_ao) are not used: shadow/AO is re-baked on the GPU from the heights and
    // splat rules are derived from layer kinds (robust to bake changes); pre-lit colour maps are the base.
    const data = new TerrainData({
      terrain: world.terrain,
      images: { colorMacro: images?.colorMacro ?? null, colorFar: images?.colorFar ?? null },
      coverage: cfg.textures?.coverage ? { core: cfg.textures.coverage.core, far: cfg.textures.coverage.far } : undefined,
    });
    this.terrainData = data;
    const floorY = fogCfg?.baseY ?? data.floorY;
    setAtmosphere({ id: cfg.id, config: atmoCfg, floorY });
    this.applyTierToScene();

    this.terrainShadow = bakeTerrainShadow(this.renderer, {
      hCore: data.hCore,
      hFar: data.hFar,
      coreGrid: data.coreGrid,
      farGrid: data.farGrid,
      cov: cfg.textures?.coverage?.core ?? { minX: data.covCore.x, minZ: data.covCore.y, size: 1 / data.covCore.z },
      sunDir: atmosphereState.sunDirection,
    });
    this.kr.trackRenderTarget(this.terrainShadow);

    const terrain = new TerrainRenderer(this.renderer, data, p, {
      ids: cfg.layers ?? ['rock', 'rock', 'grass', 'soil'],
      colors: cfg.layerColors ?? ['#9A8A7A', '#8A7F76', '#8F8A5A', '#8A7460'],
    });
    terrain.setShadowTexture(this.terrainShadow.texture);
    const look = atmosphereState.look;
    terrain.setPrelit(look.prelit, 1.0, look.prelitGamma);
    terrain.setStrata(look.terrain.strataPeriod, look.terrain.strata, look.terrain.strataRose);
    terrain.setRills(look.terrain.rills, 1600);
    terrain.setDebugMagenta(this.debugMagenta);
    this.terrain = terrain;
    this.scene.add(terrain.mesh);
    if (data.hPatch) {
      const patch = new TerrainRenderer(this.renderer, data, p, {
        ids: cfg.layers ?? ['rock', 'rock', 'grass', 'soil'],
        colors: cfg.layerColors ?? ['#9A8A7A', '#8A7F76', '#8F8A5A', '#8A7460'],
      }, { kind: 'patch', detail: terrain.detail });
      patch.setShadowTexture(this.terrainShadow.texture);
      patch.setPrelit(look.prelit, 1.0, look.prelitGamma);
      patch.setStrata(look.terrain.strataPeriod, look.terrain.strata, look.terrain.strataRose);
      patch.setRills(look.terrain.rills, 1600);
      patch.setDebugMagenta(this.debugMagenta);
      this.terrainPatch = patch;
      this.scene.add(patch.mesh);
    }
    for (const t of data.textures()) this.kr.trackTexture(t, false);
    this.kr.trackTexture(terrain.detail.texture, true);
    this.kr.trackRenderTarget(terrain.detail.rt);

    // Lights: one sun (props), SH ambient (Low) or PMREM env (Medium+).
    const st = atmosphereState;
    this.sunLight.color.copy(st.sunColor);
    this.sunLight.intensity = st.sunIntensity;
    this.sunLight.position.copy(st.sunDirection).multiplyScalar(1000);
    this.sunLight.target.position.set(0, 0, 0);
    this.lightProbe.sh.copy(st.sh);

    const cloudTint = new THREE.Color();
    const tmp = [0, 0, 0];
    hexToLinear(look.clouds.tint, tmp);
    cloudTint.setRGB(tmp[0], tmp[1], tmp[2], THREE.LinearSRGBColorSpace);
    this.sky.bake(this.renderer, look.clouds.coverage, cloudTint, true);
    this.kr.trackRenderTarget(this.sky.cubeRT);
    this.applyEnvironment();

    // Water (Likya sea, Pamukkale pools).
    const wcfg = cfg.water as unknown as { enabled?: boolean; kind?: string; level?: number; shallow?: string; deep?: string; foam?: string; depthFalloffM?: number } | undefined;
    let poolGrid: HeightGrid | null = null;
    const pinfo = cfg.terrain?.patchInfo;
    if (wcfg?.kind === 'pools' && pinfo?.water) {
      try {
        const bytes = new Uint8Array(await fetchAsset(worldFile(cfg.id, pinfo.water.file)));
        poolGrid = decodeHeightGrid(bytes, pinfo.water);
      } catch (e) {
        console.warn('pool water grid unavailable', e);
      }
    }
    if ((wcfg?.enabled || poolGrid) && (wcfg?.kind === 'sea' || wcfg?.kind === 'pools')) {
      this.water = new Water(this.renderer, this.kr.params, {
        kind: wcfg.kind as 'sea' | 'pools',
        level: wcfg.level ?? 0,
        shallow: wcfg.shallow ?? look.water?.shallow ?? '#2BB3B1',
        deep: wcfg.deep ?? look.water?.deep ?? '#0B4F6C',
        foam: wcfg.foam ?? look.water?.foam ?? '#F2F7F5',
        terrain: data,
        pools: [],
        poolGrid,
        depthFalloff: wcfg.depthFalloffM ?? 3,
        skyCube: this.sky.cubeRT.texture,
      });
      this.scene.add(this.water.object);
    }
    // Clouds (impostors, Karadeniz cloud sea).
    const cs = (cfg.fog as unknown as { cloudSea?: { bottom: number; top: number } | null } | undefined)?.cloudSea ?? null;
    this.clouds = new Clouds(this.renderer, this.kr.params, {
      worldId: cfg.id,
      coverage: look.clouds.coverage,
      tint: look.clouds.tint,
      seaBottom: cs ? cs.bottom : look.clouds.seaTop !== null ? look.clouds.seaTop - look.clouds.seaThickness : null,
      seaTop: cs ? cs.top : look.clouds.seaTop,
      minY: data.minY,
      maxY: data.maxY,
      extent: 9000,
    });
    this.scene.add(this.clouds.object);

    this.ensurePost();
    await this.warmup();
  }

  private applyEnvironment(): void {
    // Medium+: PMREM environment (diffuse+specular IBL for props). Low: SH light probe only (cheaper shaders).
    if (this.kr.params.level >= 1 && this.sky.envMap) {
      this.scene.environment = this.sky.envMap;
      this.scene.environmentIntensity = 1;
      this.lightProbe.intensity = 0;
    } else {
      this.scene.environment = null;
      this.lightProbe.intensity = 1;
    }
  }

  private ensurePost(): void {
    if (this.kr.params.composer) {
      if (!this.post) this.post = new PostPipeline(this.kr, this.scene, this.camera);
      else this.post.rebuild();
    } else if (this.post) {
      this.post.dispose();
      this.post = null;
    }
  }

  /** Compile every program now (no hitches later, §5.5) and upload textures. */
  async warmup(): Promise<void> {
    this.terrain?.update(this.camera);
    for (const t of this.terrainData?.textures() ?? []) this.kr.initTexture(t);
    await this.kr.compile(this.scene, this.camera);
  }

  /** Tier change: only at natural breaks (recompiles programs). */
  async setTier(t: QualityTier): Promise<void> {
    if (t === this.kr.tier) return;
    this.kr.setTier(t);
    this.applyTierToScene();
    if (this.world) await this.loadWorld(this.world);
    else this.ensurePost();
  }

  /**
   * Cloud immersion 0..1 at a world position (Karadeniz cloud sea / volumes; 0 elsewhere). Cheap and
   * allocation-free: feed audio.setFlight({ inCloud }) and HUD/camera white-out every frame.
   */
  cloudImmersion(x: number, y: number, z: number): number {
    return this.clouds ? this.clouds.immersion(x, y, z) : 0;
  }

  setDebugMagenta(on: boolean): void {
    this.debugMagenta = on;
    setAtmosphereDebugMagenta(on);
    this.terrain?.setDebugMagenta(on);
    this.terrainPatch?.setDebugMagenta(on);
  }

  /** Per-frame: dt in seconds (render time, may be slowed in replays). */
  render(dt: number, camera: THREE.Camera = this.camera): void {
    if (this.kr.contextLost) return;
    this.renderer.info.reset();
    this.time += dt;
    const size = this.renderer.getDrawingBufferSize(tmpV2);
    updateAtmosphereFrame(this.time, size.x, size.y);
    camera.updateMatrixWorld();
    this.sky.update(camera);
    this.terrain?.update(camera);
    this.terrainPatch?.update(camera);
    this.water?.update(this.time, camera);
    this.clouds?.update(this.time, camera);
    if (this.post) this.post.render(dt, camera);
    else this.renderer.render(this.scene, camera);
  }

  perf(): WorldRenderPerf {
    const base = this.kr.perf();
    const nodes = (this.terrain?.nodeCount ?? 0) + (this.terrainPatch?.nodeCount ?? 0);
    return {
      ...base,
      terrainNodes: nodes,
      terrainTriangles: nodes * (this.terrain?.trianglesPerNode ?? 0),
      tier: this.kr.tier,
    };
  }

  /**
   * 10 fixed camera bookmarks per world (budget / horizon tests, §9.G-17). Derived deterministically from the
   * terrain (valley floor, ridges, core edge looking outward) so they work for any bake.
   */
  bookmarks(worldId: WorldId | null = this.worldId): CameraBookmark[] {
    const s = this.world?.sampler;
    if (!s || !worldId) return [];
    const b = s.bounds;
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    const ext = (b.maxX - b.minX) / 2;
    const h = (x: number, z: number) => s.height(x, z);
    const sunAz = (Math.atan2(atmosphereState.sunDirection.x, -atmosphereState.sunDirection.z) * 180) / Math.PI;
    const mk = (name: string, x: number, z: number, agl: number, yaw: number, pitch: number, fov = 74): CameraBookmark => ({
      name, pos: [x, h(x, z) + agl, z], yaw, pitch, fov,
    });
    return [
      mk('vista-high', cx, cz, 650, sunAz - 160, -12, 60),
      mk('vista-sun', cx - ext * 0.3, cz + ext * 0.2, 380, sunAz, -6, 74),
      mk('low-5m', cx + ext * 0.1, cz - ext * 0.15, 5, sunAz + 90, -4, 80),
      mk('low-5m-antisun', cx - ext * 0.2, cz + ext * 0.1, 5, sunAz + 180, -3, 80),
      mk('mid-120m', cx + ext * 0.35, cz + ext * 0.3, 120, sunAz - 60, -10, 74),
      mk('edge-north', cx, b.minZ + 50, 400, 0, -3, 74),
      mk('edge-east', b.maxX - 50, cz, 400, 90, -3, 74),
      mk('edge-south-low', cx, b.maxZ - 50, 60, 180, 0, 86),
      mk('edge-west-high', b.minX + 50, cz, 1200, 270, -8, 74),
      mk('down-look', cx - ext * 0.4, cz - ext * 0.4, 300, sunAz + 45, -55, 74),
    ];
  }

  /** PerformanceDirector micro-benchmark: draw N frames of the current view offscreen-equivalent, return ms/frame. */
  benchmarkDraw(frames = 12, camera: THREE.Camera = this.camera): number {
    const gl = this.renderer.getContext();
    const px = new Uint8Array(4);
    this.render(0, camera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < frames; i++) this.render(1 / 60, camera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return (performance.now() - t0) / frames;
  }

  private rebuildGpuContent(): void {
    // Context restored: three re-uploads buffers/textures/programs lazily; RT-generated content must be redone.
    if (this.world) void this.loadWorld(this.world);
  }

  private disposeWorld(): void {
    if (this.terrainPatch) {
      this.scene.remove(this.terrainPatch.mesh);
      this.terrainPatch.dispose();
      this.terrainPatch = null;
    }
    if (this.terrain) {
      this.scene.remove(this.terrain.mesh);
      this.kr.untrackTexture(this.terrain.detail.texture);
      this.kr.untrackRenderTarget(this.terrain.detail.rt);
      this.terrain.dispose();
      this.terrain = null;
    }
    if (this.terrainData) {
      for (const t of this.terrainData.textures()) this.kr.untrackTexture(t);
      this.terrainData.dispose();
      this.terrainData = null;
    }
    if (this.terrainShadow) {
      this.kr.untrackRenderTarget(this.terrainShadow);
      this.terrainShadow.dispose();
      this.terrainShadow = null;
    }
    if (this.water) {
      this.scene.remove(this.water.object);
      this.water.dispose();
      this.water = null;
    }
    if (this.clouds) {
      this.scene.remove(this.clouds.object);
      this.clouds.dispose();
      this.clouds = null;
    }
    this.world = null;
  }

  dispose(): void {
    this.disposeWorld();
    this.post?.dispose();
    this.post = null;
    this.sky.dispose();
    this.propsRoot.clear();
    this.kr.dispose();
  }
}
