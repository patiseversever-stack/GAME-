// The one 3D scene of the app (integrator): WorldRenderer (terrain, sky, water, clouds, post) + PropsRenderer
// (chimneys, balloons, trees, misc) + the local Pilot + up to 3 ghost pilots + VFX. Owns world switching (GPU
// resources of the previous world are disposed), tier changes at natural breaks and context-loss rebuilds.
import * as THREE from 'three';
import type { QualityTier } from '../core/settings.ts';
import type { LoadedWorld } from '../content/worlds.ts';
import { WorldRenderer } from '../render/WorldRenderer.ts';
import { PropsRenderer } from '../render/props/PropsRenderer.ts';
import { Pilot } from '../render/pilot/Pilot.ts';
import { VFX } from '../render/vfx/VFX.ts';
import { atmosphereState } from '../render/shaders/atmosphere.ts';
import { balloonPos } from '../sim/world/balloons.ts';
import type { BalloonDef } from '../sim/types.ts';
import type { WorldId } from '../sim/types.ts';
import type { WorldContent } from './routes/worldContent.ts';
import { suitSpec, trailStyle } from './cosmetics.ts';
import type { EquippedSuit } from './cosmetics.ts';

export const GHOST_COLORS = ['#7FE3FF', '#FFB86B', '#C9A7FF'] as const;

export class Scene3D {
  readonly wr: WorldRenderer;
  readonly canvas: HTMLCanvasElement;
  props: PropsRenderer | null = null;
  pilot: Pilot;
  readonly ghosts: Pilot[] = [];
  vfx: VFX;
  worldId: WorldId | null = null;
  content: WorldContent | null = null;
  private loaded: LoadedWorld | null = null;
  private suit: EquippedSuit = { pattern: '', palette: 'safak', trail: 'dumanBeyazi' };

  constructor(canvas: HTMLCanvasElement, tier: QualityTier) {
    this.canvas = canvas;
    this.wr = WorldRenderer.create(canvas, tier);
    this.pilot = new Pilot(this.wr.scene, tier, {});
    this.pilot.setRenderer(this.wr.renderer);
    this.vfx = new VFX(this.wr.scene, tier);
    for (let i = 0; i < 3; i++) {
      const g = new Pilot(this.wr.scene, tier, { ghost: true, ghostColor: GHOST_COLORS[i], name: '' });
      g.visible = false;
      this.ghosts.push(g);
    }
  }

  get camera(): THREE.PerspectiveCamera {
    return this.wr.camera;
  }

  get tier(): QualityTier {
    return this.wr.tier;
  }

  /** Switch the scene to a world (frees the previous world's GPU resources). */
  async setWorld(loaded: LoadedWorld, content: WorldContent): Promise<void> {
    this.loaded = loaded;
    this.content = content;
    this.worldId = loaded.config.id;
    await this.wr.loadWorld(loaded);
    this.buildProps();
    this.pilot.setSampler(loaded.sampler);
    for (const g of this.ghosts) g.setSampler(loaded.sampler);
    const sd = atmosphereState.sunDirection;
    this.pilot.setSunDirection(sd.x, sd.y, sd.z);
    this.vfx.setWorld(loaded.config.id, loaded.sampler);
    this.vfx.attachProps(this.props);
    this.applySuit();
  }

  private buildProps(): void {
    const content = this.content;
    const loaded = this.loaded;
    if (!content || !loaded) return;
    this.props?.dispose();
    const pr = new PropsRenderer(this.wr.propsRoot, this.wr.tier);
    pr.setBalloonPositionFn((def: BalloonDef, t: number, out) => balloonPos(def, t, out as Float64Array));
    const sd = atmosphereState.sunDirection;
    pr.build(loaded.config.id, content.props.slice(), content.balloons.slice(), loaded.sampler, { renderer: this.wr.renderer, sunDir: [sd.x, sd.y, sd.z] });
    this.props = pr;
  }

  /** Warm every program the current scene needs (props/pilot/vfx included) — no first-use hitches (§5.5). */
  async warmup(): Promise<void> {
    this.props?.update(0, this.camera, 0);
    await this.wr.kr.compile(this.wr.scene, this.camera);
  }

  /** Tier change (natural breaks only): world GPU content + props are rebuilt with the new variants. */
  async setTier(t: QualityTier): Promise<void> {
    await this.wr.setTier(t);
    this.pilot.setTier(t);
    for (const g of this.ghosts) g.setTier(t);
    this.vfx.setTier(t);
    this.buildProps();
    this.vfx.attachProps(this.props);
    await this.warmup();
  }

  /** WebGL context restored: everything generated on the GPU is rebuilt (impostor atlases, world bakes). */
  async rebuildAfterContextLoss(): Promise<void> {
    await this.wr.rebuild();
    this.buildProps();
    this.vfx.attachProps(this.props);
  }

  setSuit(s: EquippedSuit): void {
    this.suit = { ...s };
    this.applySuit();
  }

  private applySuit(): void {
    this.pilot.setSuit(suitSpec(this.suit));
    this.vfx.setTrailStyle(trailStyle(this.suit.trail));
  }

  setSize(w: number, h: number, pixelRatio: number): void {
    this.wr.setSize(w, h, pixelRatio);
    this.vfx.setViewport(w, h);
  }

  render(dt: number, camera: THREE.Camera = this.camera): void {
    this.wr.render(dt, camera);
  }

  perf(): Record<string, unknown> {
    const p = this.wr.perf();
    const pp = this.props?.perf();
    const vp = this.vfx.perf();
    return {
      calls: p.calls,
      triangles: p.triangles,
      programs: p.programs,
      textures: p.textures,
      geometries: p.geometries,
      textureMB: Math.round(p.textureMB * 10) / 10,
      megapixels: Math.round(p.megapixels * 100) / 100,
      pixelRatio: p.pixelRatio,
      terrainNodes: p.terrainNodes,
      tier: p.tier,
      props: pp ? { calls: pp.calls, triangles: pp.triangles, instances: pp.instances } : null,
      particles: vp.particles,
      vfxCalls: vp.calls,
    };
  }

  dispose(): void {
    this.props?.dispose();
    this.vfx.dispose();
    this.pilot.dispose();
    for (const g of this.ghosts) g.dispose();
    this.wr.dispose();
  }
}
