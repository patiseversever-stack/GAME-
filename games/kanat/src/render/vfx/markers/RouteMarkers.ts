// Route markers — the integrator-facing API for everything a route draws in the world:
//   gates (ring + next-gate highlight + pass → dissolve into light streaks, miss → fade), thermal columns,
//   landing target rings (2/5/10 m) + zone ring/curtain + tall soft light column (visible ~2 km),
//   "Rehber Hat" guide line from route.line, Balloon Thread arcs (+ burner salute on the event), postcard glints.
// The ghost trail lives on the ghost pilot (new Pilot(..., { ghost: true }).trail).
//
//   const m = new RouteMarkers(scene, sampler);
//   m.build(route, tier);                       // per route / attempt
//   m.attachBalloons(propsRenderer);            // optional: thread arcs + burner salute
//   m.update(state, sim.drainEvents(), camera, dt);   // every render frame (events may be [] or null)
import { Group, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import type { QualityTier } from '../../../core/settings.ts';
import type { FlightState, RouteDef, SimEvent } from '../../../sim/types.ts';
import type { TerrainSampler } from '../../../sim/terrain/types.ts';
import { tierConfig } from '../../props/tiers.ts';
import type { PropTierConfig } from '../../props/tiers.ts';
import { GateRings } from './gates.ts';
import { Thermals } from './thermals.ts';
import { ThreadArcs } from './threadArcs.ts';
import { LandingMarkers, LandingBeam } from './landing.ts';
import { GuideLine } from './guideLine.ts';
import { PostcardGlints } from './postcardGlint.ts';
import type { PostcardPoint } from './postcardGlint.ts';
import { ParticlePool, PK } from '../particles.ts';
import type { PropsRenderer } from '../../props/PropsRenderer.ts';

export type { PostcardPoint };

const _a = new Vector3(), _b = new Vector3(), _c = new Vector3(), _n = new Vector3(), _u = new Vector3(), _v = new Vector3();

export interface MarkersPerf { calls: number }

export class RouteMarkers {
  readonly group = new Group();
  readonly gates = new GateRings();
  readonly thermals = new Thermals();
  readonly arcs = new ThreadArcs(8);
  readonly landing = new LandingMarkers();
  readonly beam = new LandingBeam();
  readonly guide = new GuideLine();
  readonly postcards = new PostcardGlints(8);
  private readonly streaks = new ParticlePool(192);
  private readonly scene: Object3D;
  private sampler: TerrainSampler | null;
  private props: PropsRenderer | null = null;
  private cfg: PropTierConfig = tierConfig('high');
  private route: RouteDef | null = null;
  private time = 0;
  private rnd = 7;
  private readonly arcA = new Float32Array(8 * 3);
  private readonly arcB = new Float32Array(8 * 3);
  private readonly arcS = new Float32Array(8);
  private readonly arcD = new Float32Array(8);
  private readonly pilot = new Vector3();
  private beamShow = 0;

  constructor(scene: Object3D, sampler: TerrainSampler | null) {
    this.scene = scene;
    this.sampler = sampler;
    this.group.name = 'route-markers';
    this.gates.addTo(this.group);
    this.thermals.addTo(this.group);
    this.arcs.addTo(this.group);
    this.landing.addTo(this.group);
    this.beam.addTo(this.group);
    this.guide.addTo(this.group);
    this.postcards.addTo(this.group);
    this.streaks.addTo(this.group);
    scene.add(this.group);
  }

  setSampler(s: TerrainSampler | null): void { this.sampler = s; }

  /** Build all route visuals (call per route and on tier change). */
  build(route: RouteDef | null, tier: QualityTier): void {
    this.cfg = tierConfig(tier);
    this.route = route;
    if (!route) {
      this.gates.setGates([]);
      this.thermals.setThermals([], null, 0);
      this.guide.setLine([]);
      this.beam.update(0, 0);
      return;
    }
    this.gates.setGates(route.gates);
    this.thermals.setThermals(route.thermals, this.sampler, [16, 28, 44, 64][this.cfg.level]);
    this.landing.set(route.landing.center, route.landing.zoneRadius, this.sampler);
    const c = route.landing.center;
    const gy = this.sampler ? this.sampler.height(c[0], c[2]) : c[1];
    this.beam.set([c[0], gy, c[2]], 280);
    this.guide.setLine(route.line);
  }

  /** New attempt on the same route: gates reappear, streaks cleared. */
  reset(): void { this.gates.reset(); }

  /** Balloon Thread arcs + burner salute need the props renderer (balloon positions/burners). */
  attachBalloons(props: PropsRenderer | null): void { this.props = props; }

  /** "Rehber Hat" on/off (offered after 3 crashes in a section, §2.10). Optional custom polyline. */
  setGuideLine(on: boolean, line?: readonly (readonly [number, number, number])[]): void {
    if (line) this.guide.setLine(line);
    this.guide.enabled = on;
  }

  /** Postcard anchors (world) — a thin frame glint appears within 150 m; collected ones never show. */
  setPostcards(points: PostcardPoint[]): void { this.postcards.set(points); }
  collectPostcard(id: string): void { this.postcards.collect(id); }

  private r(): number {
    this.rnd = (Math.imul(this.rnd, 1664525) + 1013904223) >>> 0;
    return this.rnd / 4294967296;
  }

  private handle(e: SimEvent): void {
    if (e.type === 'gate') this.gatePassed(e.index);
    else if (e.type === 'gateMissed') this.gates.miss(e.index);
    else if (e.type === 'balloonThread') {
      this.props?.fireBurner(e.a, 1.8);
      this.props?.fireBurner(e.b, 1.8);
    }
  }

  private gatePassed(i: number): void {
    const g = this.gates.gate(i);
    this.gates.pass(i);
    if (!g) return;
    _n.set(g.normal[0], g.normal[1], g.normal[2]).normalize();
    _u.set(0, 1, 0).cross(_n);
    if (_u.lengthSq() < 1e-4) _u.set(1, 0, 0);
    _u.normalize();
    _v.copy(_n).cross(_u).normalize();
    const n = Math.round(24 + 16 * Math.min(1, this.cfg.particles / 1500));
    for (let k = 0; k < n; k++) {
      const an = (k / n) * Math.PI * 2 + this.r() * 0.2;
      const cx = Math.cos(an), sx = Math.sin(an);
      const rx = _u.x * cx + _v.x * sx, ry = _u.y * cx + _v.y * sx, rz = _u.z * cx + _v.z * sx;
      const out = 3 + this.r() * 4, fwd = 6 + this.r() * 8;
      this.streaks.emit(g.pos[0] + rx * g.radius, g.pos[1] + ry * g.radius, g.pos[2] + rz * g.radius,
        rx * out + _n.x * fwd, ry * out + _n.y * fwd, rz * out + _n.z * fwd, 0.7 + this.r() * 0.4, 0.07, 0.03, PK.streak, 1.0, 0.85, 0.55, 1, this.r());
    }
  }

  /** Per render frame. `events` = this frame's drained sim events (gate/gateMissed/balloonThread are used). */
  update(state: FlightState | null, events: readonly SimEvent[] | null, camera: Camera, dt: number): void {
    this.time += dt;
    const t = this.time;
    if (events) for (let i = 0; i < events.length; i++) this.handle(events[i]);
    let pilot: Vector3 | null = null;
    if (state) {
      pilot = this.pilot.set(state.pos[0], state.pos[1], state.pos[2]);
      this.gates.setNext(state.gateIndex);
      this.thermals.setActive(state.inThermal);
      this.landing.update(t, pilot, state.inLandingZone);
    } else this.landing.update(t, null, false);
    // light column: always on while a route is active, softer once inside the zone / under canopy
    const target = this.route ? (state && (state.phase === 'canopy' || state.phase === 'landed') ? 0.35 : 1) : 0;
    this.beamShow += (target - this.beamShow) * Math.min(1, dt * 2);
    this.beam.update(t, this.beamShow);
    this.gates.update(t);
    this.thermals.update(t);
    this.guide.update(t, pilot);
    this.postcards.update(t, pilot);
    this.updateArcs(state);
    this.arcs.update(t);
    this.streaks.update(t);
    void camera;
  }

  /** Dashed light arcs between threadable balloon pairs (centres ≤ 35 m) near the pilot. */
  private updateArcs(state: FlightState | null): void {
    const bl = this.props?.balloonLayer();
    if (!bl || !state || (state.phase !== 'flying' && state.phase !== 'jump')) { this.arcs.set(0, this.arcA, this.arcB, this.arcS); return; }
    let n = 0;
    const px = state.pos[0], py = state.pos[1], pz = state.pos[2];
    for (let i = 0; i < bl.count; i++) {
      if (bl.defAt(i).id < 0) continue;
      bl.centerOf(i, _a);
      if (Math.hypot(_a.x - px, _a.y - py, _a.z - pz) > 420) continue;
      for (let j = i + 1; j < bl.count; j++) {
        if (bl.defAt(j).id < 0) continue;
        bl.centerOf(j, _b);
        if (_a.distanceTo(_b) > 35) continue;
        const dm = Math.hypot((_a.x + _b.x) / 2 - px, (_a.y + _b.y) / 2 - py, (_a.z + _b.z) / 2 - pz);
        if (dm > 400) continue;
        let slot = n < 8 ? n : -1;
        if (slot < 0) { let worst = 0; for (let k = 1; k < 8; k++) if (this.arcD[k] > this.arcD[worst]) worst = k; if (this.arcD[worst] > dm) slot = worst; }
        if (slot < 0) continue;
        _c.copy(_b).sub(_a).normalize();
        const ri = bl.defAt(i).envelopeR * 0.92, rj = bl.defAt(j).envelopeR * 0.92;
        this.arcA[slot * 3] = _a.x + _c.x * ri; this.arcA[slot * 3 + 1] = _a.y + _c.y * ri; this.arcA[slot * 3 + 2] = _a.z + _c.z * ri;
        this.arcB[slot * 3] = _b.x - _c.x * rj; this.arcB[slot * 3 + 1] = _b.y - _c.y * rj; this.arcB[slot * 3 + 2] = _b.z - _c.z * rj;
        this.arcS[slot] = Math.min(1, 1.3 - dm / 400);
        this.arcD[slot] = dm;
        if (n < 8) n++;
      }
    }
    this.arcs.set(n, this.arcA, this.arcB, this.arcS);
  }

  perf(): MarkersPerf {
    let calls = 0;
    for (const m of [this.gates.mesh, this.thermals.column, this.thermals.motes, this.arcs.mesh, this.landing.mesh, this.beam.mesh, this.guide.mesh, this.postcards.mesh, this.streaks.mesh]) if (m.visible) calls++;
    return { calls };
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.gates.dispose(); this.thermals.dispose(); this.arcs.dispose(); this.landing.dispose(); this.beam.dispose();
    this.guide.dispose(); this.postcards.dispose(); this.streaks.dispose();
  }
}
