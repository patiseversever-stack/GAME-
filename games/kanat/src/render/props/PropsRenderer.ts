// Props renderer: fairy chimneys, balloons, trees (+octahedral impostors), world-specific props, waterfalls.
// All collidable props exist on every tier; tiers only change LOD/impostor distances and shader detail (§4.G.4, §5.G).
// Visuals are fitted to the sim's collision primitives (±0.4 m); balloon positions come from the sim's balloonPos().
import { Group, Vector3 } from 'three';
import type { Camera, Object3D, WebGLRenderer } from 'three';
import type { QualityTier } from '../../core/settings.ts';
import type { BalloonDef, PropInstance, WorldId } from '../../sim/types.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import { tierConfig } from './tiers.ts';
import type { PropTierConfig } from './tiers.ts';
import { ChimneyLayer } from './chimneys.ts';
import { BalloonLayer } from './balloons.ts';
import type { BalloonPosFn, BalloonAnchor } from './balloons.ts';
import { TreeLayer } from './trees.ts';
import { MiscLayer } from './misc.ts';
import type { WaterfallDef } from './waterfall.ts';
import { WaterfallLayer } from './waterfall.ts';
import { sharedUniforms } from '../vfx/shared.ts';

export interface PropsExtras {
  /** Waterfalls (Karadeniz) — not collidable, so they are not PropInstances. */
  waterfalls?: WaterfallDef[];
  /** Renderer, needed once to bake tree impostor atlases (render-to-texture at load). */
  renderer?: WebGLRenderer;
  /** Sun direction (unit, toward the sun) used for impostor baking / pre-lighting. */
  sunDir?: [number, number, number];
}

export interface PropsPerf {
  calls: number;
  triangles: number;
  instances: Record<string, number>;
  visible: Record<string, number>;
}

export class PropsRenderer {
  readonly group = new Group();
  private cfg: PropTierConfig;
  private readonly scene: Object3D;
  private chimneys: ChimneyLayer | null = null;
  private balloons: BalloonLayer | null = null;
  private trees: TreeLayer | null = null;
  private misc: MiscLayer | null = null;
  private waterfalls: WaterfallLayer | null = null;
  private worldId: WorldId = 'kapadokya';
  private posFn: BalloonPosFn | null = null;
  private anchor: BalloonAnchor | null = null;
  private renderTime = 0;
  private lastSim = 0;
  private counts: Record<string, number> = {};

  constructor(scene: Object3D, tier: QualityTier) {
    this.scene = scene;
    this.cfg = tierConfig(tier);
    this.group.name = 'props';
    scene.add(this.group);
  }

  /** Use the sim's deterministic balloon position function (src/sim/world/props.ts → balloonPos). */
  setBalloonPositionFn(fn: BalloonPosFn, anchor?: BalloonAnchor): void {
    this.posFn = fn;
    if (anchor) this.anchor = anchor;
    if (this.balloons) {
      this.balloons.setPositionFn(fn);
      if (anchor) this.balloons.anchor = anchor;
    }
  }

  build(worldId: WorldId, props: PropInstance[], balloons: BalloonDef[], sampler: TerrainSampler | null, extras: PropsExtras = {}): void {
    this.disposeLayers();
    this.worldId = worldId;
    const byType = new Map<string, PropInstance[]>();
    for (const p of props) {
      let a = byType.get(p.type);
      if (!a) { a = []; byType.set(p.type, a); }
      a.push(p);
    }
    this.counts = {};
    for (const [k, v] of byType) this.counts[k] = v.length;
    this.counts.balloonDefs = balloons.length;

    const ch = byType.get('chimney') ?? [];
    const caps = byType.get('chimneyCap') ?? [];
    if (ch.length + caps.length > 0) {
      this.chimneys = new ChimneyLayer(this.group, this.cfg, Math.max(ch.length, caps.length + ch.length));
      this.chimneys.build(ch, caps);
    }
    if (balloons.length > 0) {
      this.balloons = new BalloonLayer(this.group, this.cfg, Math.max(64, balloons.length));
      if (this.posFn) this.balloons.setPositionFn(this.posFn);
      if (this.anchor) this.balloons.anchor = this.anchor;
      this.balloons.build(balloons);
    }
    const trees = byType.get('tree') ?? [];
    if (trees.length > 0) {
      this.trees = new TreeLayer(this.group, this.cfg, worldId);
      this.trees.build(trees, extras.renderer ?? null, extras.sunDir ?? null);
    }
    const miscTypes = ['house', 'gulet', 'column', 'wall', 'theater', 'cornice', 'lighthouse', 'tomb', 'arch', 'rock'];
    const misc: PropInstance[] = [];
    for (const t of miscTypes) { const a = byType.get(t); if (a) misc.push(...a); }
    if (misc.length > 0) {
      this.misc = new MiscLayer(this.group, this.cfg, worldId);
      this.misc.build(misc, sampler);
    }
    if (extras.waterfalls && extras.waterfalls.length > 0) {
      this.waterfalls = new WaterfallLayer(this.group, this.cfg);
      this.waterfalls.build(extras.waterfalls);
    }
  }

  /** Per frame. `simTimeSec` drives balloons (must equal the sim clock for collision parity). */
  update(simTimeSec: number, camera: Camera, dtRender = 1 / 60): void {
    this.renderTime += dtRender;
    this.lastSim = simTimeSec;
    sharedUniforms.uTime.value = this.renderTime % 3600;
    camera.updateMatrixWorld();
    this.chimneys?.update(camera);
    this.balloons?.update(simTimeSec, camera, this.renderTime);
    this.trees?.update(camera);
    this.misc?.update(camera, this.renderTime);
    this.waterfalls?.update(camera, this.renderTime);
  }

  /** Balloon Thread moment: the burner "salutes" (flame + envelope lantern glow + warm light on the pilot). */
  fireBurner(balloonId: number, duration = 1.6): void {
    this.balloons?.fireBurner(balloonId, duration);
  }

  /** Mouth position of a balloon (VFX thread arcs). */
  balloonMouth(balloonId: number, out: Vector3): boolean {
    return this.balloons ? this.balloons.mouthOf(balloonId, out) : false;
  }

  /** Access for VFX (thread arcs need all centres every frame). */
  balloonLayer(): BalloonLayer | null {
    return this.balloons;
  }

  setTier(t: QualityTier): void {
    this.cfg = tierConfig(t);
    this.chimneys?.setTier(this.cfg);
    this.balloons?.setTier(this.cfg);
    this.trees?.setTier(this.cfg);
    this.misc?.setTier(this.cfg);
    this.waterfalls?.setTier(this.cfg);
  }

  perf(): PropsPerf {
    const visible: Record<string, number> = {};
    let calls = 0, tris = 0;
    const add = (k: string, c: number, t: number): void => { visible[k] = t; calls += c; tris += t; };
    if (this.chimneys) add('chimney', this.chimneys.calls(), this.chimneys.triangles());
    if (this.balloons) add('balloon', this.balloons.calls(), this.balloons.triangles());
    if (this.trees) add('tree', this.trees.calls(), this.trees.triangles());
    if (this.misc) add('misc', this.misc.calls(), this.misc.triangles());
    if (this.waterfalls) add('waterfall', this.waterfalls.calls(), this.waterfalls.triangles());
    return { calls, triangles: tris, instances: { ...this.counts }, visible };
  }

  get world(): WorldId { return this.worldId; }
  get simTime(): number { return this.lastSim; }

  /** Dev helpers. */
  debugLayers(): { chimneys: ChimneyLayer | null; balloons: BalloonLayer | null; trees: TreeLayer | null; misc: MiscLayer | null; waterfalls: WaterfallLayer | null } {
    return { chimneys: this.chimneys, balloons: this.balloons, trees: this.trees, misc: this.misc, waterfalls: this.waterfalls };
  }

  private disposeLayers(): void {
    this.chimneys?.dispose(); this.chimneys = null;
    this.balloons?.dispose(); this.balloons = null;
    this.trees?.dispose(); this.trees = null;
    this.misc?.dispose(); this.misc = null;
    this.waterfalls?.dispose(); this.waterfalls = null;
  }

  dispose(): void {
    this.disposeLayers();
    this.scene.remove(this.group);
  }
}
