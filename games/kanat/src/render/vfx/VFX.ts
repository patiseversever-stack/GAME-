// Flight VFX: graze dust/snow/spray/leaves, proximity wake, speed lines, wingtip trails (cosmetic styles),
// high-G vapour, Balloon Thread sparkles, landing/bounce dust, crash "vumf" dust (no gore).
// Route visuals (gates, thermals, landing rings + beam, guide line, thread arcs, postcards) live in
// ./markers/RouteMarkers.ts. Every flicker ≤ 3 Hz; premultiplied alpha, small sprites, tier-capped pools.
import { Group, Vector3, Color, DirectionalLight } from 'three';
import type { Camera, Object3D } from 'three';
import type { QualityTier } from '../../core/settings.ts';
import type { FlightState, SimEvent, SurfaceClass, WorldId } from '../../sim/types.ts';
import { TRAILS } from '../../content/meta/cosmetics.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import { tierConfig } from '../props/tiers.ts';
import type { PropTierConfig } from '../props/tiers.ts';
import { ParticlePool, PK } from './particles.ts';
import { SpeedLines } from './speedLines.ts';
import { RibbonTrail } from './trails.ts';
import type { TrailStyle } from './trails.ts';
import { sharedUniforms } from './shared.ts';
import type { PropsRenderer } from '../props/PropsRenderer.ts';
import type { Pilot } from '../pilot/Pilot.ts';

type RGB = [number, number, number];

interface WorldFx { dust: RGB; chip: RGB; leaf: RGB; leaf2: RGB; ground: 'dust' | 'snow'; amb: RGB }

const WORLD_FX: Record<WorldId, WorldFx> = {
  kapadokya: { dust: [0.69, 0.47, 0.31], chip: [0.4, 0.27, 0.18], leaf: [0.32, 0.42, 0.1], leaf2: [0.62, 0.52, 0.12], ground: 'dust', amb: [0.42, 0.38, 0.44] },
  likya: { dust: [0.64, 0.6, 0.52], chip: [0.42, 0.4, 0.36], leaf: [0.14, 0.22, 0.08], leaf2: [0.25, 0.3, 0.1], ground: 'dust', amb: [0.4, 0.46, 0.52] },
  karadeniz: { dust: [0.32, 0.27, 0.19], chip: [0.2, 0.17, 0.12], leaf: [0.07, 0.15, 0.07], leaf2: [0.18, 0.28, 0.08], ground: 'dust', amb: [0.42, 0.46, 0.45] },
  erciyes: { dust: [0.88, 0.91, 0.96], chip: [0.3, 0.29, 0.28], leaf: [0.1, 0.15, 0.08], leaf2: [0.2, 0.2, 0.1], ground: 'snow', amb: [0.45, 0.52, 0.66] },
  pamukkale: { dust: [0.9, 0.84, 0.76], chip: [0.6, 0.52, 0.44], leaf: [0.18, 0.24, 0.12], leaf2: [0.3, 0.3, 0.14], ground: 'dust', amb: [0.48, 0.4, 0.46] },
};

const _a = new Vector3(), _b = new Vector3(), _c = new Vector3(), _d = new Vector3(), _e = new Vector3(), _f = new Vector3(), _L = new Vector3(), _R = new Vector3();
const _sun = new Color(), _amb = new Color();
const SNOW: RGB = [0.95, 0.97, 1.0];

export interface VfxPerf { calls: number; particlesCap: number; speedLines: number; trails: number }

export class VFX {
  readonly group = new Group();
  private cfg: PropTierConfig;
  private readonly scene: Object3D;
  private particles: ParticlePool;
  readonly speedLines: SpeedLines;
  private readonly trailL: RibbonTrail;
  private readonly trailR: RibbonTrail;
  private readonly vapourL: RibbonTrail;
  private readonly vapourR: RibbonTrail;
  private world: WorldId = 'kapadokya';
  private fx: WorldFx = WORLD_FX.kapadokya;
  private sampler: TerrainSampler | null = null;
  private props: PropsRenderer | null = null;
  private sunLight: DirectionalLight | null = null;
  private time = 0;
  private rnd = 1;
  private emitAcc = 0;
  private readonly prevVel = new Vector3();
  private gLoad = 1;
  private viewW = 390;
  private viewH = 844;
  private reduceMotion = false;
  private trailBase = 0.45;

  constructor(scene: Object3D, tier: QualityTier) {
    this.scene = scene;
    this.cfg = tierConfig(tier);
    this.group.name = 'vfx';
    this.particles = new ParticlePool(this.cfg.particles);
    this.particles.addTo(this.group);
    this.speedLines = new SpeedLines(300);
    this.speedLines.setCount(this.cfg.speedLines);
    this.speedLines.addTo(this.group);
    this.trailL = new RibbonTrail('dumanBeyazi', sharedUniforms.uTime);
    this.trailR = new RibbonTrail('dumanBeyazi', sharedUniforms.uTime);
    this.vapourL = new RibbonTrail('vapour', sharedUniforms.uTime);
    this.vapourR = new RibbonTrail('vapour', sharedUniforms.uTime);
    for (const t of [this.trailL, this.trailR]) { t.width = 0.07; t.addTo(this.group); }
    for (const t of [this.vapourL, this.vapourR]) { t.width = 0.16; t.interval = 1 / 45; t.addTo(this.group); }
    scene.add(this.group);
  }

  setWorld(world: WorldId, sampler: TerrainSampler | null): void {
    this.world = world;
    this.fx = WORLD_FX[world];
    this.sampler = sampler;
    this.sunLight = null;
    this.scene.traverse((o) => { if (!this.sunLight && (o as DirectionalLight).isDirectionalLight) this.sunLight = o as DirectionalLight; });
  }

  /** Link to the props renderer: Balloon Thread arcs + burner salute on the event. */
  attachProps(p: PropsRenderer | null): void { this.props = p; }

  /** Cosmetic wingtip trail: TRAILS id from content ('dumanBeyazi', 'altinToz'…) or a built-in TrailStyle. */
  setTrailStyle(id: string, alpha = 0.45): void {
    const def = TRAILS.find((t) => t.id === id);
    if (def) { this.trailL.setStyleDef(def.style, def.colors); this.trailR.setStyleDef(def.style, def.colors); }
    else { this.trailL.setStyle(id as TrailStyle); this.trailR.setStyle(id as TrailStyle); }
    this.trailBase = alpha;
  }

  setViewport(w: number, h: number): void { this.viewW = Math.max(1, w); this.viewH = Math.max(1, h); }
  setReduceMotion(on: boolean): void { this.reduceMotion = on; }

  setTier(t: QualityTier): void {
    const next = tierConfig(t);
    if (next.particles !== this.cfg.particles) {
      this.particles.removeFrom(this.group);
      this.particles.dispose();
      this.particles = new ParticlePool(next.particles);
      this.particles.addTo(this.group);
    }
    this.cfg = next;
    this.speedLines.setCount(next.speedLines);
  }

  private r(): number {
    this.rnd = (Math.imul(this.rnd, 1664525) + 1013904223) >>> 0;
    return this.rnd / 4294967296;
  }

  /** Scale bursts with the tier cap so Low never floods its 300-sprite pool. */
  private n(base: number): number { return Math.max(1, Math.round(base * Math.min(1, this.cfg.particles / 1500) ** 0.5)); }

  /** Manual burst hook (also used by events). */
  burst(cls: SurfaceClass | 'vumf' | 'sparkle', x: number, y: number, z: number, strength = 1, nx = 0, ny = 1, nz = 0, vx = 0, vy = 0, vz = 0): void {
    const fx = this.fx;
    const s = Math.min(1.5, Math.max(0.2, strength));
    if (cls === 'water') {
      const n = this.n(26 * s);
      for (let i = 0; i < n; i++) {
        const up = 2 + this.r() * 5;
        this.particles.emit(x + (this.r() - 0.5), y, z + (this.r() - 0.5), vx * 0.25 + (this.r() - 0.5) * 3 + nx * up, up, vz * 0.25 + (this.r() - 0.5) * 3 + nz * up, 0.7 + this.r() * 0.6, 0.12, 0.3, PK.spray, 0.88, 0.92, 0.95, 0.8, this.r());
      }
      for (let i = 0; i < this.n(6 * s); i++) this.particles.emit(x, y + 0.5, z, vx * 0.1, 1, vz * 0.1, 1.6, 1.0, 3.2, PK.mist, 0.9, 0.93, 0.95, 0.35, this.r());
      return;
    }
    if (cls === 'tree') {
      const n = this.n(16 * s);
      for (let i = 0; i < n; i++) {
        const c = this.r() > 0.5 ? fx.leaf : fx.leaf2;
        this.particles.emit(x + (this.r() - 0.5) * 1.5, y + (this.r() - 0.5) * 1.5, z + (this.r() - 0.5) * 1.5, vx * 0.3 + nx * 3 + (this.r() - 0.5) * 4, 1 + this.r() * 2, vz * 0.3 + nz * 3 + (this.r() - 0.5) * 4, 1.8 + this.r(), 0.09, 0.11, PK.leaf, c[0], c[1], c[2], 1, this.r());
      }
      return;
    }
    if (cls === 'sparkle') {
      for (let i = 0; i < this.n(20 * s); i++) this.particles.emit(x + (this.r() - 0.5) * 2, y + (this.r() - 0.5) * 2, z + (this.r() - 0.5) * 2, (this.r() - 0.5) * 3, (this.r() - 0.2) * 3, (this.r() - 0.5) * 3, 0.8 + this.r() * 0.5, 0.06, 0.02, PK.spark, 1.0, 0.8, 0.45, 1, this.r());
      return;
    }
    if (cls === 'balloon') return;
    const snow = this.world === 'erciyes' && (cls === 'ground' || cls === 'rock' || cls === 'prop');
    const big = cls === 'vumf';
    const col = big ? fx.dust : fx.dust;
    const n = this.n((big ? 22 : 14) * s);
    for (let i = 0; i < n; i++) {
      const sp = big ? 2 + this.r() * 4 : 1.5 + this.r() * 4;
      const a = this.r() * 6.283;
      const dx = Math.cos(a), dz = Math.sin(a);
      const out = big ? 1 : 0.5;
      const kind = snow ? PK.snow : big ? PK.vumf : PK.dust;
      const life = big ? 2.2 + this.r() * 1.2 : 1.1 + this.r() * 0.9;
      const s0 = big ? 0.8 : snow ? 0.25 : 0.3;
      const s1 = big ? 3.2 + this.r() * 1.6 : snow ? 1.4 : 1.0 + this.r() * 0.8;
      const c = snow ? SNOW : col;
      this.particles.emit(
        x + dx * 0.3, y + 0.2, z + dz * 0.3,
        vx * 0.3 + nx * sp + dx * sp * out, ny * sp * 0.6 + this.r() * 1.5, vz * 0.3 + nz * sp + dz * sp * out,
        life, s0, s1, kind, c[0], c[1], c[2], big ? 0.45 : 0.4, this.r(),
      );
    }
    if (!snow) for (let i = 0; i < this.n(big ? 10 : 6) * s; i++) {
      const c = fx.chip;
      this.particles.emit(x, y + 0.2, z, vx * 0.4 + nx * 5 + (this.r() - 0.5) * 6, 2 + this.r() * 5, vz * 0.4 + nz * 5 + (this.r() - 0.5) * 6, 1.2 + this.r() * 0.6, 0.05, 0.05, PK.chip, c[0], c[1], c[2], 1, this.r());
    }
  }

  event(e: SimEvent): void {
    switch (e.type) {
      case 'graze': {
        let nx = 0, ny = 1, nz = 0;
        if (this.lastState) { nx = this.lastState.prox.normal[0]; ny = this.lastState.prox.normal[1]; nz = this.lastState.prox.normal[2]; }
        const v = this.lastState?.vel ?? [0, 0, 0];
        this.burst(e.cls, e.pos[0], e.pos[1], e.pos[2], 0.6 + e.strength, nx, ny, nz, v[0], v[1], v[2]);
        break;
      }
      case 'bounce': this.burst(e.cls, e.pos[0], e.pos[1], e.pos[2], 0.8); break;
      case 'crash': this.burst('vumf', e.pos[0], e.pos[1], e.pos[2], 1.2); break;
      case 'balloonThread': this.threadSparkles(e.a, e.b); break;
      case 'landed': if (this.lastState) this.burst('ground', this.lastState.pos[0], this.lastState.pos[1] - 1, this.lastState.pos[2], e.soft ? 0.3 : 0.7); break;
      default: break;
    }
  }

  /** Sparkles along the threaded segment (the burner salute itself is fired by RouteMarkers). */
  private threadSparkles(a: number, b: number): void {
    const bl = this.props?.balloonLayer();
    if (!bl) return;
    let ia = -1, ib = -1;
    for (let i = 0; i < bl.count; i++) { const id = bl.defAt(i).id; if (id === a) ia = i; if (id === b) ib = i; }
    if (ia < 0 || ib < 0) return;
    bl.centerOf(ia, _d); bl.centerOf(ib, _e);
    for (let k = 0; k < 6; k++) { _f.copy(_d).lerp(_e, (k + 0.5) / 6); this.burst('sparkle', _f.x, _f.y, _f.z, 0.5); }
  }

  private lastState: FlightState | null = null;

  /** Per render frame. `state` may be null in menus (only ambient effects then). */
  update(dt: number, simTime: number, camera: Camera, state: FlightState | null, pilot: Pilot | null): void {
    this.time += dt;
    this.lastState = state;
    const t = this.time;
    // particle lighting from the scene sun
    if (this.sunLight) {
      _sun.copy(this.sunLight.color).multiplyScalar(Math.min(1.2, this.sunLight.intensity * 0.17));
      _amb.setRGB(this.fx.amb[0], this.fx.amb[1], this.fx.amb[2]);
      this.particles.setLighting(_sun, _amb);
    }
    if (state) {
      const flying = state.phase === 'flying' || state.phase === 'jump';
      // ---- speed lines
      this.speedLines.update(t, flying ? state.speed : 0, this.viewW, this.viewH, this.reduceMotion ? 0.5 : 1);
      // ---- G load from the velocity derivative (+ gravity)
      if (dt > 1e-4) {
        _a.set(state.vel[0] - this.prevVel.x, state.vel[1] - this.prevVel.y + 9.81 * dt, state.vel[2] - this.prevVel.z).divideScalar(dt);
        const g = Math.min(8, _a.length() / 9.81);
        this.gLoad += (g - this.gLoad) * Math.min(1, dt * 6);
      }
      this.prevVel.set(state.vel[0], state.vel[1], state.vel[2]);
      // ---- wingtip trails + vapour
      if (pilot) {
        pilot.getWingtips(_L, _R);
        const camPos = camera.position;
        const tAlpha = flying ? this.trailBase * Math.min(1, Math.max(0, (state.speed - 30) / 25)) : 0;
        const vAlpha = flying ? Math.min(0.75, Math.max(0, (this.gLoad - 2.0) / 1.5)) * (this.world === 'karadeniz' ? 1 : 0.75) : 0;
        this.trailL.alpha = tAlpha; this.trailR.alpha = tAlpha;
        this.vapourL.alpha = vAlpha; this.vapourR.alpha = vAlpha;
        _d.set(state.vel[0], state.vel[1], state.vel[2]);
        _e.copy(camPos).sub(_L);
        _f.copy(_d).cross(_e).normalize();
        this.trailL.update(dt, _L, _f);
        this.vapourL.update(dt, _L, _f);
        _e.copy(camPos).sub(_R);
        _f.copy(_d).cross(_e).normalize();
        this.trailR.update(dt, _R, _f);
        this.vapourR.update(dt, _R, _f);
      }
      // ---- proximity wake: surface material peels off when close and fast
      const prox = state.prox;
      if (flying && prox.d < 6 && state.speed > 18 && prox.cls !== 'none' && prox.cls !== 'balloon') {
        const rate = 70 * Math.pow(1 - prox.d / 6, 2) * Math.min(1.4, state.speed / 50) * Math.min(1, this.cfg.particles / 800);
        this.emitAcc += rate * dt;
        while (this.emitAcc >= 1) {
          this.emitAcc -= 1;
          const nx = prox.normal[0], ny = prox.normal[1], nz = prox.normal[2];
          const x = prox.nearest[0] + (this.r() - 0.5) * 1.2, y = prox.nearest[1] + (this.r() - 0.5) * 0.6, z = prox.nearest[2] + (this.r() - 0.5) * 1.2;
          if (prox.cls === 'water') {
            this.particles.emit(x, y + 0.1, z, state.vel[0] * 0.2 + (this.r() - 0.5) * 2, 2 + this.r() * 3, state.vel[2] * 0.2 + (this.r() - 0.5) * 2, 0.8, 0.1, 0.35, PK.spray, 0.88, 0.92, 0.95, 0.7, this.r());
          } else if (prox.cls === 'tree') {
            const c = this.r() > 0.5 ? this.fx.leaf : this.fx.leaf2;
            this.particles.emit(x, y, z, state.vel[0] * 0.25 + nx * 2, 0.5 + this.r(), state.vel[2] * 0.25 + nz * 2, 2, 0.08, 0.1, PK.leaf, c[0], c[1], c[2], 1, this.r());
          } else {
            const snow = this.world === 'erciyes';
            const c = snow ? SNOW : this.fx.dust;
            this.particles.emit(x, y, z, state.vel[0] * 0.18 + nx * (1 + this.r() * 2), ny * 1.5 + this.r(), state.vel[2] * 0.18 + nz * (1 + this.r() * 2), 1.0 + this.r() * 0.6, 0.2, 0.9, snow ? PK.snow : PK.dust, c[0], c[1], c[2], 0.3, this.r());
          }
        }
      } else this.emitAcc = 0;
    } else {
      this.speedLines.update(t, 0, this.viewW, this.viewH);
      this.trailL.alpha = this.trailR.alpha = this.vapourL.alpha = this.vapourR.alpha = 0;
    }
    this.particles.update(t);
    void simTime;
  }

  perf(): VfxPerf {
    let calls = 0;
    if (this.particles.mesh.visible) calls++;
    if (this.speedLines.mesh.visible) calls++;
    if (this.trailL.mesh.visible) calls++;
    if (this.trailR.mesh.visible) calls++;
    if (this.vapourL.mesh.visible) calls++;
    if (this.vapourR.mesh.visible) calls++;
    return { calls, particlesCap: this.particles.cap, speedLines: this.cfg.speedLines, trails: 4 };
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.particles.dispose();
    this.speedLines.dispose();
    for (const tr of [this.trailL, this.trailR, this.vapourL, this.vapourR]) tr.dispose();
  }
}
