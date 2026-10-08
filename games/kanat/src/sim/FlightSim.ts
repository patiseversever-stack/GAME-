// KANAT flight simulation — one deterministic 60 Hz tick per step() (brief §4.3, §4.G.5–§4.G.8).
// Owner: flight agent. PURE: no DOM/three.js/Math.random/Date/performance.now; detMath only; zero per-tick allocation.
//
// Usage:
//   const sim = new FlightSim({ world, sampler, props, balloons, route, seed, assist, guideWind, freeFlight, slowMode });
//   // phase 'intro' (pilot parked at route.start; step() is a no-op and does not advance ticks) …
//   sim.beginJump();                    // → 'jump' (0.8 s freefall) → wingsOpen → 'flying'
//   each 60 Hz tick: sim.step(cmds)     // cmds for THIS tick: Command.tick === sim.state.tick (read before step)
//   render: lerp(state.prevPos, state.pos, alpha); events: sim.drainEvents() (valid until the next drain)
//
// Tick numbering starts at the jump (tick 0 = first step after beginJump). 'axis' commands are applied only on
// their own tick and held until the next one (30 Hz input), so live play and ghost replays consume identical
// streams. Values are copied out of Command objects (ReplayCursor recycles them).

import { TUNING } from './data/tuning.ts';
import { EventQueue } from './events.ts';
import { CanopyState } from './flight/canopy.ts';
import { Glider, V_TRIM } from './flight/model.ts';
import { multiplier, Proximity, ProxResult, type WaterBody } from './flight/proximity.ts';
import { comboK, gateCrossing, landingRingPoints, newBreakdown, proximityRate, ScoreState, starsFor, type ScoreBreakdown } from './flight/scoring.ts';
import { clamp, cos, DEG, exp, sin, sincos } from './math/detMath.ts';
import { Fnv1a } from './math/hash.ts';
import { Rng, STREAM, type RngState } from './math/rng.ts';
import type { TerrainSampler } from './terrain/types.ts';
import type { BalloonDef, Command, FlightPhase, FlightState, PropInstance, RouteDef, SimEvent, SurfaceClass, WorldId } from './types.ts';
import { PropIndex } from './world/propIndex.ts';
import { SIM_VERSION } from './version.ts';

export type AssistLevel = 'full' | 'low' | 'off';

export interface FlightSimOptions {
  world: WorldId;
  sampler: TerrainSampler;
  route: RouteDef;
  /** Static collidable props (buildProps output). */
  props?: readonly PropInstance[];
  /** Prebuilt index of `props` (optional; built when omitted). */
  propIndex?: PropIndex;
  balloons?: readonly BalloonDef[];
  seed?: number;
  assist?: AssistLevel;
  /** "Rehber Rüzgâr" (W1 R1–R3, §2.9): soft push inside 2 m, crashing impossible. */
  guideWind?: boolean;
  /** Serbest Uçuş: no gates/score, parachute anywhere, no emergency chute. */
  freeFlight?: boolean;
  /** Yavaş Mod: each tick advances 0.8 × 1/60 s of sim time. */
  slowMode?: boolean;
  /** Otomatik Paraşüt (§2.2): opens at the ideal height inside the zone; landing bonuses halved. */
  autoParachute?: boolean;
  /** Sea plane at y = 0 (default: sampler.terrain.hasSea, else world === 'likya'). */
  hasSea?: boolean;
  /** Extra flat water, e.g. Pamukkale pools: { y: 0, grid: loadWorldNode(...).patchWater } (see WaterBody). */
  water?: readonly WaterBody[];
  /** Commands of other actors are ignored (ghost sims use their own id). Default 0. */
  actorId?: number;
  /** Start directly in the jump phase (tests, bots, quick retry). */
  skipIntro?: boolean;
}

const PHASES: readonly FlightPhase[] = ['intro', 'jump', 'flying', 'canopy', 'landed', 'crashed', 'halfFlight'];
const PH_INTRO = 0;
const PH_JUMP = 1;
const PH_FLYING = 2;
const PH_CANOPY = 3;
const PH_LANDED = 4;
const PH_CRASHED = 5;
const PH_HALF = 6;

const CLS_LIST: readonly SurfaceClass[] = ['none', 'rock', 'ground', 'water', 'prop', 'tree', 'balloon'];
function clsIndex(c: SurfaceClass): number {
  const i = CLS_LIST.indexOf(c);
  return i < 0 ? 0 : i;
}

const G = TUNING.sim.g;
const R_BODY = TUNING.body.radius;
const SC = TUNING.score;
const AS = TUNING.assist;
const CT = TUNING.contact;
const CP = TUNING.canopy;
const AIR = TUNING.air;
const PROBE_MARGIN = 0.35;
const BOUNCE_QUIET_SEC = 0.25;
const MAX_NEAR_BALLOONS = 8;

/** Ring buffer of the last 3 s of flight states (§4.G.5 crash replay). Layout per entry (STRIDE floats):
 *  [tick, x, y, z, vx, vy, vz, psi, gamma, phi, speed, d]. Index 0 = oldest. */
export class CrashBuffer {
  static readonly STRIDE = 12;
  readonly capacity: number;
  readonly data: Float64Array;
  head = 0; // next write slot
  count = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Float64Array(capacity * CrashBuffer.STRIDE);
  }

  push(tick: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, psi: number, gamma: number, phi: number, speed: number, d: number): void {
    const o = this.head * CrashBuffer.STRIDE;
    const a = this.data;
    a[o] = tick;
    a[o + 1] = x;
    a[o + 2] = y;
    a[o + 3] = z;
    a[o + 4] = vx;
    a[o + 5] = vy;
    a[o + 6] = vz;
    a[o + 7] = psi;
    a[o + 8] = gamma;
    a[o + 9] = phi;
    a[o + 10] = speed;
    a[o + 11] = d;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  /** Copies entry i (0 = oldest) into out[0..STRIDE-1]. */
  read(i: number, out: Float64Array | number[]): void {
    const slot = (this.head - this.count + i + this.capacity * 2) % this.capacity;
    const o = slot * CrashBuffer.STRIDE;
    for (let k = 0; k < CrashBuffer.STRIDE; k++) out[k] = this.data[o + k];
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }
}

/** All mutable scalar sim state that is not owned by Glider / CanopyState / ScoreState. */
class Core {
  tick = 0;
  phase = PH_INTRO;
  simTime = 0; // seconds since the jump
  // inputs (held)
  sx = 0;
  sy = 0;
  flare = 0;
  chuteReq = 0;
  // positions
  prevX = 0;
  prevY = 0;
  prevZ = 0;
  // jump ballistic
  jumpT = 0;
  jx = 0;
  jy = 0;
  jz = 0;
  jvx = 0;
  jvy = 0;
  jvz = 0;
  // air
  wx = 0;
  wz = 0;
  wy = 0;
  thermal = -1;
  // proximity history
  d = Infinity; // body distance (last tick)
  mult = 0;
  lastAgl = Infinity;
  aglRate = 0;
  dcPrev = Infinity; // center distance lower bound at the last substep position
  // contact
  contactTick = 0;
  lastBounceT = -1e9;
  // landing
  inZone = 0;
  zoneEntered = 0;
  landedInZone = 0;
  landDist = Infinity;
  landSoft = 0;
  // assist
  noseUpCd = 0;
  warnCd = 0;
  assistUsed = 0;
}

const AXIS = 31;
function axisArg(v: number): number {
  if (!(v === v)) return 0;
  let q = Math.round(v) | 0;
  if (q > AXIS) q = AXIS;
  else if (q < -AXIS) q = -AXIS;
  return q;
}

export interface FlightSnapshot {
  v: number;
  core: Record<string, unknown>;
  glider: Record<string, unknown>;
  canopy: Record<string, unknown>;
  score: Record<string, unknown>;
  pr: Record<string, unknown>;
  breakdown: ScoreBreakdown;
  crash: { data: Float64Array; head: number; count: number };
  rng: RngState;
  threadPair: Float64Array;
  grazeCdId: Int32Array;
  grazeCdT: Float64Array;
}

function copyFields(src: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const o = src as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

function applyFields(dst: object, src: Record<string, unknown>): void {
  const d = dst as Record<string, unknown>;
  for (const k of Object.keys(src)) d[k] = src[k];
}

export class FlightSim {
  readonly world: WorldId;
  readonly route: RouteDef;
  readonly sampler: TerrainSampler;
  readonly propIndex: PropIndex;
  readonly balloons: readonly BalloonDef[];
  readonly proximity: Proximity;
  readonly assist: AssistLevel;
  readonly guideWind: boolean;
  readonly freeFlight: boolean;
  readonly slowMode: boolean;
  readonly autoParachute: boolean;
  readonly actorId: number;
  readonly seed: number;
  readonly dt: number;
  readonly simVersion = SIM_VERSION;
  /** Public read-only state for render/UI/audio (mutated in place every tick). */
  readonly state: FlightState;
  readonly crashBuffer: CrashBuffer;
  /** Score per category (results screen). */
  readonly breakdown: ScoreBreakdown = newBreakdown();

  private readonly core = new Core();
  private readonly glider = new Glider();
  private readonly canopy = new CanopyState();
  private readonly sc = new ScoreState();
  private readonly events = new EventQueue();
  private readonly rng: Rng;
  private readonly pr = new ProxResult(); // last full query (end of tick)
  private readonly pc = new ProxResult(); // collision probe scratch
  private readonly pt = new ProxResult(); // misc scratch (lookahead, bisection)
  private readonly sc2 = new Float64Array(2);
  private readonly hasher = new Fnv1a();
  private readonly nearIdx = new Int32Array(MAX_NEAR_BALLOONS);
  private readonly threadPair: Float64Array; // last thread time per balloon pair (i*n + j)
  private readonly grazeCdId = new Int32Array(8).fill(-2147483648);
  private readonly grazeCdT = new Float64Array(8);
  private grazeCdNext = 0;
  private readonly windX: number;
  private readonly windZ: number;
  private readonly zoneR: number;

  constructor(opts: FlightSimOptions) {
    this.world = opts.world;
    this.route = opts.route;
    this.sampler = opts.sampler;
    this.balloons = opts.balloons ?? [];
    this.propIndex = opts.propIndex ?? new PropIndex(opts.props ?? []);
    const terr = (opts.sampler as unknown as { terrain?: { hasSea?: boolean } }).terrain;
    const hasSea = opts.hasSea ?? terr?.hasSea ?? opts.world === 'likya';
    const water: WaterBody[] = [];
    if (hasSea) water.push({ y: 0 });
    if (opts.water) for (let i = 0; i < opts.water.length; i++) water.push(opts.water[i]);
    this.proximity = new Proximity(opts.sampler, this.propIndex, this.balloons, water);
    this.assist = opts.assist ?? 'full';
    this.guideWind = opts.guideWind ?? false;
    this.freeFlight = opts.freeFlight ?? false;
    this.slowMode = opts.slowMode ?? false;
    this.autoParachute = opts.autoParachute ?? false;
    this.actorId = opts.actorId ?? 0;
    this.seed = (opts.seed ?? 0) >>> 0;
    this.rng = new Rng(this.seed, STREAM.sim);
    this.dt = (1 / TUNING.sim.hz) * (this.slowMode ? TUNING.sim.slowModeScale : 1);
    this.crashBuffer = new CrashBuffer(Math.round(TUNING.sim.crashBufferSec * TUNING.sim.hz));
    const nb = this.balloons.length;
    this.threadPair = new Float64Array(nb * nb).fill(-1e9);
    // Wind: meteorological "from" direction → velocity toward dirDeg + 180 (heading convention, 0 = north = −z).
    const to = (this.route.wind.dirDeg + 180) * DEG;
    this.windX = this.route.wind.speed * sin(to);
    this.windZ = -this.route.wind.speed * cos(to);
    this.zoneR = this.route.landing.zoneRadius > 0 ? this.route.landing.zoneRadius : CP.zoneRadius;
    this.state = {
      tick: 0,
      phase: 'intro',
      pos: [0, 0, 0],
      prevPos: [0, 0, 0],
      vel: [0, 0, 0],
      speed: 0,
      gamma: 0,
      psi: 0,
      phi: 0,
      cl: 0,
      heightAGL: 0,
      prox: { d: Infinity, cls: 'none', nearest: [0, 0, 0], normal: [0, 1, 0], mult: 0, propId: -1 },
      score: 0,
      combo: 1,
      comboTime: 0,
      timeSec: 0,
      gateIndex: 0,
      gatesPassed: 0,
      gatesMissed: 0,
      inThermal: -1,
      inLandingZone: false,
      canopyOpen: false,
      assist: this.assist,
      energy: 0,
      stall: 0,
      canopyOpening: false,
      assistUsed: false,
    };
    this.resetToStart();
    if (opts.skipIntro) this.beginJump();
  }

  // ─── public API ────────────────────────────────────────────────────────────────────────────────────────

  get phase(): FlightPhase {
    return PHASES[this.core.phase];
  }

  get tick(): number {
    return this.core.tick;
  }

  /** Commands with this tick are applied by the next step(). */
  get nextTick(): number {
    return this.core.tick;
  }

  /** Sim seconds since the jump — the time base for balloonPos() on the render side. */
  get timeSec(): number {
    return this.core.simTime;
  }

  /** Stars for the finished flight (0 until landed). */
  stars(): 0 | 1 | 2 | 3 {
    if (this.core.phase !== PH_LANDED) return 0;
    return starsFor(this.route, this.sc.score, this.core.landedInZone === 1, this.canopy.half === 1);
  }

  get landedInZone(): boolean {
    return this.core.landedInZone === 1;
  }

  get distToTarget(): number {
    return this.core.landDist;
  }

  get grazeCount(): number {
    return this.sc.grazeCount;
  }

  get threadCount(): number {
    return this.sc.threadCount;
  }

  /** Back to the route start (phase 'intro', tick 0, score 0). */
  resetToStart(): void {
    const c = this.core;
    applyFields(c, copyFields(new Core()));
    applyFields(this.glider, copyFields(new Glider()));
    applyFields(this.canopy, copyFields(new CanopyState()));
    applyFields(this.sc, copyFields(new ScoreState()));
    applyFields(this.breakdown, newBreakdown() as unknown as Record<string, unknown>);
    this.crashBuffer.clear();
    this.events.clear();
    this.threadPair.fill(-1e9);
    this.grazeCdId.fill(-2147483648);
    this.grazeCdT.fill(0);
    this.grazeCdNext = 0;
    this.rng.reseed(this.seed, STREAM.sim);
    const st = this.route.start;
    c.jx = st.pos[0];
    c.jy = st.pos[1];
    c.jz = st.pos[2];
    const hd = st.headingDeg * DEG;
    const v = st.speedKmh / 3.6;
    c.jvx = v * sin(hd);
    c.jvy = 0;
    c.jvz = -v * cos(hd);
    this.glider.x = c.jx;
    this.glider.y = c.jy;
    this.glider.z = c.jz;
    this.glider.psi = hd;
    this.glider.gamma = 0;
    this.glider.V = v > 1 ? v : V_TRIM;
    this.glider.vx = c.jvx;
    this.glider.vy = 0;
    this.glider.vz = c.jvz;
    c.prevX = c.jx;
    c.prevY = c.jy;
    c.prevZ = c.jz;
    this.proximity.setTime(0);
    this.proximity.query(c.jx, c.jy, c.jz, this.pr);
    c.lastAgl = this.pr.agl;
    this.publish();
  }

  /** Intro → jump (0.8 s freefall from route.start, then wingsOpen). No-op outside 'intro'. */
  beginJump(): void {
    if (this.core.phase !== PH_INTRO) return;
    this.core.phase = PH_JUMP;
    this.core.jumpT = 0;
    this.publish();
  }

  /**
   * Place the pilot in free flight (tests, Free Flight respawn, bots). Heading ψ: 0 = north (−z), clockwise.
   * Keeps score/time; phase becomes 'flying'.
   */
  teleport(x: number, y: number, z: number, speed: number, gammaRad: number, psiRad: number): void {
    const c = this.core;
    const g = this.glider;
    c.phase = PH_FLYING;
    g.x = x;
    g.y = y;
    g.z = z;
    g.V = speed;
    g.gamma = gammaRad;
    g.psi = psiRad;
    g.phi = 0;
    g.cl = TUNING.aero.clTrim;
    this.airAt(x, y, z);
    g.syncVelocity(c.wx, c.wy, c.wz);
    c.prevX = x;
    c.prevY = y;
    c.prevZ = z;
    c.dcPrev = Infinity;
    this.proximity.setTime(c.simTime);
    this.proximity.query(x, y, z, this.pr);
    c.lastAgl = this.pr.agl;
    c.d = this.bodyD(this.pr);
    this.publish();
  }

  drainEvents(): SimEvent[] {
    return this.events.drain();
  }

  /** Advance one tick (1/60 s, ×0.8 in slow mode). `cmds` = commands for this tick (others are ignored). */
  step(cmds: readonly Command[]): void {
    const c = this.core;
    if (c.phase === PH_INTRO || c.phase === PH_LANDED || c.phase === PH_CRASHED) return;
    if (c.phase === PH_HALF && this.canopy.active === 0) return;
    for (let i = 0; i < cmds.length; i++) {
      const m = cmds[i];
      if (m.actorId !== this.actorId || m.tick !== c.tick) continue;
      switch (m.cmd) {
        case 'axis':
          c.sx = axisArg(m.args[0]);
          c.sy = axisArg(m.args[1]);
          break;
        case 'flare': {
          const f = axisArg(m.args[0]);
          c.flare = f < 0 ? 0 : f;
          break;
        }
        case 'parachute':
          c.chuteReq = 1;
          break;
        default:
          break;
      }
    }
    const g = this.glider;
    c.prevX = this.posX();
    c.prevY = this.posY();
    c.prevZ = this.posZ();
    const dt = this.dt;
    this.proximity.setTime(c.simTime + dt);
    c.contactTick = 0;
    if (c.phase === PH_JUMP) this.stepJump(dt);
    else if (c.phase === PH_FLYING) this.stepFlying(dt);
    else this.stepCanopy(dt);
    c.chuteReq = 0;
    c.tick++;
    c.simTime += dt;
    if (c.noseUpCd > 0) c.noseUpCd -= dt;
    if (c.warnCd > 0) c.warnCd -= dt;
    this.crashBuffer.push(c.tick, this.posX(), this.posY(), this.posZ(), this.state.vel[0], this.state.vel[1], this.state.vel[2], g.psi, g.gamma, g.phi, this.state.speed, c.d);
    this.publish();
  }

  /** FNV-1a over quantized gameplay state (mm, mrad, centi-points). Same inputs → same hash on every engine. */
  hash(): number {
    const c = this.core;
    const g = this.glider;
    return this.hasher
      .reset()
      .u32(c.tick)
      .u32(c.phase)
      .q(this.posX(), 1000)
      .q(this.posY(), 1000)
      .q(this.posZ(), 1000)
      .q(g.V, 1000)
      .q(g.gamma, 1e6)
      .q(g.psi, 1e6)
      .q(g.phi, 1e6)
      .q(g.cl, 1e6)
      .q(this.canopy.vf, 1000)
      .q(this.canopy.vs, 1000)
      .q(this.sc.score, 100)
      .q(this.sc.tz, 1000)
      .u32(this.sc.gateIndex)
      .u32(this.sc.gatesPassed)
      .u32(this.sc.gatesMissed)
      .u32(this.sc.threadCount)
      .u32(this.sc.grazeCount)
      .value();
  }

  snapshot(): FlightSnapshot {
    return {
      v: SIM_VERSION,
      core: copyFields(this.core),
      glider: copyFields(this.glider),
      canopy: copyFields(this.canopy),
      score: copyFields(this.sc),
      pr: copyFields(this.pr),
      breakdown: { ...this.breakdown },
      crash: { data: this.crashBuffer.data.slice(), head: this.crashBuffer.head, count: this.crashBuffer.count },
      rng: this.rng.getState(),
      threadPair: this.threadPair.slice(),
      grazeCdId: this.grazeCdId.slice(),
      grazeCdT: this.grazeCdT.slice(),
    };
  }

  restore(s: FlightSnapshot): void {
    applyFields(this.core, s.core);
    applyFields(this.glider, s.glider);
    applyFields(this.canopy, s.canopy);
    applyFields(this.sc, s.score);
    applyFields(this.pr, s.pr);
    applyFields(this.breakdown, s.breakdown as unknown as Record<string, unknown>);
    this.crashBuffer.data.set(s.crash.data);
    this.crashBuffer.head = s.crash.head;
    this.crashBuffer.count = s.crash.count;
    this.rng.setState(s.rng);
    this.threadPair.set(s.threadPair);
    this.grazeCdId.set(s.grazeCdId);
    this.grazeCdT.set(s.grazeCdT);
    this.events.clear();
    this.proximity.setTime(this.core.simTime);
    this.publish();
  }

  // ─── internals ─────────────────────────────────────────────────────────────────────────────────────────

  private posX(): number {
    const p = this.core.phase;
    return p === PH_JUMP || p === PH_INTRO ? this.core.jx : this.canopy.active ? this.canopy.x : this.glider.x;
  }
  private posY(): number {
    const p = this.core.phase;
    return p === PH_JUMP || p === PH_INTRO ? this.core.jy : this.canopy.active ? this.canopy.y : this.glider.y;
  }
  private posZ(): number {
    const p = this.core.phase;
    return p === PH_JUMP || p === PH_INTRO ? this.core.jz : this.canopy.active ? this.canopy.z : this.glider.z;
  }

  private bodyD(r: ProxResult): number {
    if (!(r.dc < TUNING.prox.maxD)) return Infinity;
    const d = r.dc - R_BODY;
    return d > 0 ? d : 0;
  }

  /** Vertical air + wind at a point; sets core.wx/wy/wz and core.thermal. */
  private airAt(x: number, y: number, z: number): void {
    const c = this.core;
    c.wx = this.windX;
    c.wz = this.windZ;
    let wy = 0;
    let th = -1;
    const ths = this.route.thermals;
    for (let i = 0; i < ths.length; i++) {
      const t = ths[i];
      const dx = x - t.pos[0];
      const dz = z - t.pos[1];
      const r2 = dx * dx + dz * dz;
      const R2 = t.radius * t.radius;
      if (y >= t.top || r2 > 9 * R2) continue;
      const fadeIn = (t.top - y) / AIR.thermalTopFade;
      const fade = fadeIn >= 1 ? 1 : fadeIn * fadeIn * (3 - 2 * fadeIn);
      wy += t.w0 * exp(-r2 / R2) * fade;
      if (th < 0 && r2 < R2) th = i;
    }
    c.thermal = th;
    // Ridge lift: w = k_r · max(0, ∇H·wind) below 60 m AGL, fading linearly with height.
    const ws2 = this.windX * this.windX + this.windZ * this.windZ;
    if (ws2 > 0) {
      const s = this.sampler;
      const H = s.height(x, z);
      const agl = y - H;
      if (agl < AIR.ridgeMaxAGL && agl > -5) {
        const e = AIR.gradStep;
        const gx = (s.height(x + e, z) - s.height(x - e, z)) / (2 * e);
        const gz = (s.height(x, z + e) - s.height(x, z - e)) / (2 * e);
        const dot = gx * this.windX + gz * this.windZ;
        if (dot > 0) {
          const f = agl <= 0 ? 1 : 1 - agl / AIR.ridgeMaxAGL;
          wy += AIR.ridgeK * dot * f;
        }
      }
    }
    c.wy = wy;
  }

  // ── jump ──
  private stepJump(dt: number): void {
    const c = this.core;
    const sub = dt / TUNING.sim.substeps;
    for (let s = 0; s < TUNING.sim.substeps; s++) {
      const ax = c.jx;
      const ay = c.jy;
      const az = c.jz;
      c.jvy -= G * sub;
      c.jx += c.jvx * sub;
      c.jy += c.jvy * sub;
      c.jz += c.jvz * sub;
      if (this.sweep(ax, ay, az, c.jx, c.jy, c.jz, false)) {
        // contact during the freefall: same rules (bounce slides, hard = crash)
        const res = this.resolveContact(c.jvx, c.jvy, c.jvz, true);
        if (res === 2) return;
      }
    }
    c.jumpT += dt;
    this.glider.x = c.jx;
    this.glider.y = c.jy;
    this.glider.z = c.jz;
    this.glider.vx = c.jvx;
    this.glider.vy = c.jvy;
    this.glider.vz = c.jvz;
    this.proximity.query(c.jx, c.jy, c.jz, this.pr);
    c.d = this.bodyD(this.pr);
    c.lastAgl = this.pr.agl;
    if (c.jumpT >= TUNING.sim.jumpFreefallSec - 1e-9) {
      this.airAt(c.jx, c.jy, c.jz);
      const g = this.glider;
      g.setFromVelocity(c.jvx, c.jvy, c.jvz, c.wx, c.wy, c.wz);
      if (g.V < TUNING.stall.vMin) g.V = TUNING.stall.vMin;
      g.cl = TUNING.aero.clTrim;
      g.phi = 0;
      g.syncVelocity(c.wx, c.wy, c.wz);
      c.phase = PH_FLYING;
      this.events.wingsOpen(c.tick);
    }
  }

  // ── wingsuit flight ──
  private stepFlying(dt: number): void {
    const c = this.core;
    const g = this.glider;
    this.airAt(g.x, g.y, g.z);
    this.applyAssists(dt);
    const sub = dt / TUNING.sim.substeps;
    for (let s = 0; s < TUNING.sim.substeps; s++) {
      const ax = g.x;
      const ay = g.y;
      const az = g.z;
      g.step(sub, c.sx, c.sy, c.wx, c.wy, c.wz, 0);
      if (this.sweep(ax, ay, az, g.x, g.y, g.z, true)) {
        const res = this.resolveContact(g.vx, g.vy, g.vz, false);
        if (res === 2) {
          this.proximity.query(g.x, g.y, g.z, this.pr);
          c.d = this.bodyD(this.pr);
          return;
        }
      }
    }
    // End-of-tick proximity (scoring, HUD, assists)
    this.proximity.query(g.x, g.y, g.z, this.pr);
    const d = this.bodyD(this.pr);
    c.d = d;
    c.mult = this.freeFlight ? 0 : multiplier(d, this.pr.flat);
    const agl = this.pr.agl;
    c.aglRate = (agl - c.lastAgl) / dt;
    c.lastAgl = agl;
    // Landing zone
    const lc = this.route.landing.center;
    const ldx = g.x - lc[0];
    const ldz = g.z - lc[2];
    const inZone = ldx * ldx + ldz * ldz <= this.zoneR * this.zoneR;
    c.inZone = inZone ? 1 : 0;
    if (inZone && c.zoneEntered === 0 && !this.freeFlight) {
      c.zoneEntered = 1;
      this.events.enterLandingZone(c.tick);
    }
    if (!this.freeFlight) {
      this.scoreTick(dt);
      this.gatesTick();
      this.threadsTick();
    }
    this.thermalTick();
    // Parachute: manual (zone / free flight), Auto Parachute, in-zone safety, emergency outside the zone.
    const hE = agl + Math.max(0, g.V * g.V - V_TRIM * V_TRIM) / (2 * G);
    const sinking = c.aglRate < -3;
    if (c.chuteReq === 1 && (inZone || this.freeFlight)) {
      this.deploy(false, false);
    } else if (!this.freeFlight && inZone && this.autoParachute && agl <= CP.autoOpenAGL && g.vy < 0) {
      this.deploy(true, false);
    } else if (!this.freeFlight && inZone && agl < 15 && hE < 20 && sinking) {
      this.deploy(true, false);
    } else if (!this.freeFlight && !inZone && agl < CP.emergencyAGL && hE < CP.emergencyAGL && sinking) {
      this.deploy(true, true);
    }
  }

  private deploy(auto: boolean, half: boolean): void {
    const c = this.core;
    const g = this.glider;
    sincos(g.gamma, this.sc2);
    const agl = this.pr.agl;
    this.canopy.deploy(g.x, g.y, g.z, g.psi, g.V, this.sc2[0], this.sc2[1], agl, auto || this.autoParachute, half);
    c.phase = half ? PH_HALF : PH_CANOPY;
    this.events.parachuteOpen(c.tick, agl, auto);
    if (half) this.events.halfFlight(c.tick);
    if (!this.freeFlight) {
      // Remaining gates are missed once the parachute is out.
      while (this.sc.gateIndex < this.route.gates.length) {
        this.events.gateMissed(c.tick, this.sc.gateIndex);
        this.sc.gatesMissed++;
        this.sc.gateIndex++;
      }
      if (!half && agl >= SC.braveOpenMin && agl <= SC.braveOpenMax) {
        const p = SC.braveOpenPoints * (this.canopy.auto ? SC.autoParachuteBonusFactor : 1);
        this.sc.score += p;
        this.breakdown.brave += p;
      }
      if (this.sc.inThermal >= 0) {
        this.events.thermalExit(c.tick, this.sc.inThermal);
        this.sc.inThermal = -1;
      }
    }
  }

  // ── canopy ──
  private stepCanopy(dt: number): void {
    const c = this.core;
    const cp = this.canopy;
    const sub = dt / TUNING.sim.substeps;
    this.airAt(cp.x, cp.y, cp.z);
    const brakeAxis = c.sy < 0 ? -c.sy : 0;
    const brake = (c.flare > brakeAxis ? c.flare : brakeAxis) / AXIS;
    const s = this.sampler;
    for (let k = 0; k < TUNING.sim.substeps; k++) {
      const agl = cp.y - s.height(cp.x, cp.z);
      cp.step(sub, c.sx, brake, c.wx, c.wy, c.wz, agl);
      // touchdown: terrain, water, or any prop
      const H = s.height(cp.x, cp.z);
      let ground = H;
      let water = false;
      for (let i = 0; i < this.proximity.water.length; i++) {
        const w = this.proximity.water[i];
        if (w.grid !== undefined) continue; // pools are 0.35 m deep: the terrain floor is the touchdown surface
        const inside = w.r === undefined || (cp.x - (w.x ?? 0)) * (cp.x - (w.x ?? 0)) + (cp.z - (w.z ?? 0)) * (cp.z - (w.z ?? 0)) <= w.r * w.r;
        if (inside && w.y > ground) {
          ground = w.y;
          water = true;
        }
      }
      const hitProp = this.proximity.contact(cp.x, cp.y + 0.3, cp.z, 0.3, 0, true, this.pc) < 0.3;
      if (cp.y <= ground || hitProp) {
        if (cp.y < ground) cp.y = ground;
        this.touchdown(water);
        return;
      }
    }
    this.proximity.query(cp.x, cp.y, cp.z, this.pr);
    c.d = this.bodyD(this.pr);
    c.mult = 0;
    c.lastAgl = this.pr.agl;
  }

  private touchdown(water: boolean): void {
    const c = this.core;
    const cp = this.canopy;
    const lc = this.route.landing.center;
    const dx = cp.x - lc[0];
    const dz = cp.z - lc[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const inZone = dist <= this.zoneR;
    const soft = cp.flaredLow === 1 && cp.vs <= CP.softMaxVz && !water;
    let points = 0;
    if (inZone && cp.half === 0 && !this.freeFlight) {
      const f = cp.auto ? SC.autoParachuteBonusFactor : 1;
      const ring = landingRingPoints(dist) * f;
      const sp = soft ? SC.softLandingPoints * f : 0;
      points = ring + sp;
      this.sc.score += points;
      this.breakdown.landing += ring;
      this.breakdown.soft += sp;
    }
    c.landDist = dist;
    c.landSoft = soft ? 1 : 0;
    c.landedInZone = inZone && cp.half === 0 ? 1 : 0;
    cp.vf = 0;
    cp.vs = 0;
    cp.vx = 0;
    cp.vy = 0;
    cp.vz = 0;
    cp.active = 0;
    c.phase = cp.half === 1 ? PH_HALF : PH_LANDED;
    this.events.landed(c.tick, dist, soft, points);
    this.proximity.query(cp.x, cp.y, cp.z, this.pr);
    c.d = this.bodyD(this.pr);
  }

  // ── collision ──

  /**
   * Swept collision for one substep a→b (§4.G.5 tunnelling protection). A segment is provably clear when both
   * endpoints are ≥ r + |Δp|/2 from every surface (Lipschitz); otherwise interior points are probed (≤ 0.3 m
   * apart) and the first contact is located by 4 bisection steps. On contact the pilot is moved to the last safe
   * point and the probe result (normal, class, nearest point) is left in this.pc. Returns true on contact.
   */
  private sweep(ax: number, ay: number, az: number, bx: number, by: number, bz: number, balloons: boolean): boolean {
    const c = this.core;
    const P = this.proximity;
    const r = R_BODY;
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const halfLen = 0.5 * len;
    const dA = c.dcPrev; // Infinity = "≥ r + PROBE_MARGIN" (cheap probe path)
    const dB = P.contact(bx, by, bz, r, PROBE_MARGIN, balloons, this.pc);
    const pieces = len > 0.3 ? Math.ceil(len / 0.3) : 1;
    let hit = dB < r;
    let hitT = hit ? 1 : 2;
    let probed = false;
    if (hit || dA < r + halfLen || dB < r + halfLen || halfLen > PROBE_MARGIN) {
      // interior samples ≤ 0.3 m apart, from a toward b: the first one in contact wins
      probed = true;
      for (let i = 1; i < pieces; i++) {
        const t = i / pieces;
        const dm = P.contact(ax + dx * t, ay + dy * t, az + dz * t, r, PROBE_MARGIN, balloons, this.pt);
        if (dm < r) {
          hit = true;
          hitT = t;
          break;
        }
      }
    }
    if (!hit) {
      c.dcPrev = dB;
      return false;
    }
    // 4 bisection steps between the last safe parameter and the first contact parameter
    let lo = probed ? hitT - 1 / pieces : 0;
    if (lo < 0) lo = 0;
    let hi = hitT;
    for (let k = 0; k < 4; k++) {
      const m = 0.5 * (lo + hi);
      const dm = P.contact(ax + dx * m, ay + dy * m, az + dz * m, r, PROBE_MARGIN, balloons, this.pt);
      if (dm < r) hi = m;
      else lo = m;
    }
    // probe at the contact side for normal / class / nearest point; the pilot stays on the safe side
    P.contact(ax + dx * hi, ay + dy * hi, az + dz * hi, r, PROBE_MARGIN, balloons, this.pc);
    this.setPos(ax + dx * lo, ay + dy * lo, az + dz * lo);
    return true;
  }

  private setPos(x: number, y: number, z: number): void {
    const c = this.core;
    if (c.phase === PH_JUMP) {
      c.jx = x;
      c.jy = y;
      c.jz = z;
    } else {
      this.glider.x = x;
      this.glider.y = y;
      this.glider.z = z;
    }
  }

  /**
   * Contact rule (§2.2 / top-of-brief): surface-normal approach speed < 6 m/s → bounce (25 % speed loss, combo
   * break, 'bounce' event); ≥ 6 m/s → crash. Guide Wind never crashes (soft deflection). Returns 0 none,
   * 1 bounce/deflect, 2 crash.
   */
  private resolveContact(vx: number, vy: number, vz: number, jump: boolean): number {
    const c = this.core;
    const pc = this.pc;
    const nx = pc.nx;
    const ny = pc.ny;
    const nz = pc.nz;
    const vn = vx * nx + vy * ny + vz * nz;
    const approach = -vn;
    const cls = pc.cls === 'none' ? 'ground' : pc.cls;
    if (!this.guideWind && approach >= CT.bounceMaxNormalSpeed) {
      c.phase = PH_CRASHED;
      c.contactTick = 1;
      if (jump) {
        c.jvx = 0;
        c.jvy = 0;
        c.jvz = 0;
      }
      this.events.crash(c.tick, pc.px, pc.py, pc.pz, cls);
      this.breakCombo();
      return 2;
    }
    // Remove the inward normal component (+ small restitution for a real bounce), push out of the surface.
    const quiet = c.simTime - c.lastBounceT < BOUNCE_QUIET_SEC;
    const rest = this.guideWind ? 1 : 1.3;
    let ox = vx;
    let oy = vy;
    let oz = vz;
    if (vn < 0) {
      ox -= rest * vn * nx;
      oy -= rest * vn * ny;
      oz -= rest * vn * nz;
    }
    const pushD = R_BODY + CT.pushOut - (pc.dc < R_BODY ? pc.dc : R_BODY);
    const px = this.posX() + nx * pushD;
    const py = this.posY() + ny * pushD;
    const pz = this.posZ() + nz * pushD;
    const loss = this.guideWind || quiet ? 1 : 1 - CT.bounceSpeedLoss;
    if (jump) {
      c.jvx = ox * loss;
      c.jvy = oy * loss;
      c.jvz = oz * loss;
      c.jx = px;
      c.jy = py;
      c.jz = pz;
    } else {
      const g = this.glider;
      const E0 = g.energy();
      g.x = px;
      g.y = py;
      g.z = pz;
      g.setFromVelocity(ox, oy, oz, c.wx, c.wy, c.wz);
      let V = g.V * loss;
      // never create energy through the push-out (except Guide Wind, which is "wind")
      if (!this.guideWind) {
        const vmax2 = 2 * (E0 - G * g.y);
        if (vmax2 < V * V) V = vmax2 > 0 ? Math.sqrt(vmax2) : 0;
      }
      if (V < TUNING.stall.vMin) V = TUNING.stall.vMin;
      g.V = V;
      g.syncVelocity(c.wx, c.wy, c.wz);
    }
    c.dcPrev = R_BODY + CT.pushOut;
    if (!this.guideWind && !quiet) {
      c.contactTick = 1;
      c.lastBounceT = c.simTime;
      this.events.bounce(c.tick, pc.px, pc.py, pc.pz, cls);
      this.breakCombo();
      this.sc.grazeActive = 0;
    } else if (!this.guideWind) {
      c.contactTick = 1;
    }
    return 1;
  }

  private breakCombo(): void {
    if (this.sc.tz > 0) {
      this.events.comboBreak(this.core.tick);
      this.sc.tz = 0;
      this.sc.outside = 0;
      this.sc.combo = 1;
    }
  }

  // ── assists ──
  private applyAssists(dt: number): void {
    const c = this.core;
    const g = this.glider;
    const pr = this.pr;
    if (this.assist === 'off' && !this.guideWind) return;
    // Closing speed toward the nearest surface.
    const vnx = g.vx;
    const vny = g.vy;
    const vnz = g.vz;
    const closing = -(vnx * pr.nx + vny * pr.ny + vnz * pr.nz);
    let tau = Infinity;
    let hnx = pr.nx;
    let hny = pr.ny;
    let hnz = pr.nz;
    let hx = pr.px;
    let hy = pr.py;
    let hz = pr.pz;
    if (c.d < 45 && closing > 0.1) tau = c.d / closing;
    if (pr.dc < 60) {
      // straight-line lookahead probes
      const la = AS.lookaheadSec;
      for (let i = 0; i < la.length; i++) {
        const T = la[i];
        if (T >= tau) break;
        const qx = g.x + vnx * T;
        const qy = g.y + vny * T;
        const qz = g.z + vnz * T;
        const dq = this.proximity.contact(qx, qy, qz, R_BODY, 0.4, true, this.pt);
        if (dq < R_BODY + 0.4) {
          tau = T;
          hnx = this.pt.nx;
          hny = this.pt.ny;
          hnz = this.pt.nz;
          hx = this.pt.px;
          hy = this.pt.py;
          hz = this.pt.pz;
          break;
        }
      }
    }
    // Warning (low + full)
    if (this.assist !== 'off' && tau < AS.warnTau && c.warnCd <= 0) {
      sincos(g.psi, this.sc2);
      const side = (hx - g.x) * this.sc2[1] + (hz - g.z) * this.sc2[0] >= 0 ? 1 : -1;
      this.events.warning(c.tick, tau, side, hx, hy, hz);
      c.warnCd = AS.warnCooldownSec;
    }
    const d = c.d;
    if (this.guideWind && d < AS.guidePushD && closing > 0) {
      this.rotateAway(pr.nx, pr.ny, pr.nz, AS.guidePushRate * dt);
      c.assistUsed = 1;
    }
    if (this.assist !== 'full') return;
    if (d < AS.pushD && closing > AS.pushClosing) {
      this.rotateAway(pr.nx, pr.ny, pr.nz, AS.pushRate * dt);
      c.assistUsed = 1;
    }
    if (tau < AS.noseUpTau && c.noseUpCd <= 0) {
      const a = (1 - tau / AS.noseUpTau) * AS.noseUpMaxDeg * DEG;
      g.rotateToward(hnx, hny, hnz, a);
      c.noseUpCd = AS.noseUpCooldownSec;
      c.assistUsed = 1;
    }
    // Gate magnet: gentle steer toward the next gate center when it is ahead and close to the line.
    const gi = this.sc.gateIndex;
    if (!this.freeFlight && gi < this.route.gates.length) {
      const gt = this.route.gates[gi];
      const tx = gt.pos[0] - g.x;
      const ty = gt.pos[1] - g.y;
      const tz = gt.pos[2] - g.z;
      const dist = Math.sqrt(tx * tx + ty * ty + tz * tz);
      const sp = Math.sqrt(vnx * vnx + vny * vny + vnz * vnz);
      if (dist > 1 && dist < 80 && sp > 1) {
        const along = (tx * vnx + ty * vny + tz * vnz) / sp;
        if (along > 0) {
          const lat2 = dist * dist - along * along;
          const R = gt.radius * 2;
          if (lat2 < R * R) {
            const ang = Math.sqrt(lat2 > 0 ? lat2 : 0) / dist;
            g.rotateToward(tx / dist, ty / dist, tz / dist, ang * SC.gateMagnet * 4 * dt);
          }
        }
      }
    }
    g.syncVelocity(c.wx, c.wy, c.wz);
  }

  /** Rotate the flight path away from a surface with normal n (toward the tangent plane, slightly outward). */
  private rotateAway(nx: number, ny: number, nz: number, maxAngle: number): void {
    const g = this.glider;
    sincos(g.gamma, this.sc2);
    const sg = this.sc2[0];
    const cg = this.sc2[1];
    sincos(g.psi, this.sc2);
    const dx = cg * this.sc2[0];
    const dy = sg;
    const dz = -cg * this.sc2[1];
    const dn = dx * nx + dy * ny + dz * nz;
    if (dn >= 0) return;
    let tx = dx - dn * nx + 0.15 * nx;
    let ty = dy - dn * ny + 0.15 * ny;
    let tz = dz - dn * nz + 0.15 * nz;
    const l = Math.sqrt(tx * tx + ty * ty + tz * tz);
    if (l < 1e-6) return;
    tx /= l;
    ty /= l;
    tz /= l;
    g.rotateToward(tx, ty, tz, maxAngle);
  }

  // ── scoring ──
  private scoreTick(dt: number): void {
    const c = this.core;
    const s = this.sc;
    const g = this.glider;
    const d = c.d;
    const m = c.mult;
    // multUp with hysteresis
    if (m > s.announcedMult) {
      this.events.multUp(c.tick, m);
      s.announcedMult = m;
      s.lowerFor = 0;
    } else if (m < s.announcedMult) {
      s.lowerFor += dt;
      if (s.lowerFor >= SC.multUpHoldSec) {
        s.announcedMult = m;
        s.lowerFor = 0;
      }
    } else {
      s.lowerFor = 0;
    }
    // combo
    if (d < SC.comboD) {
      s.tz += dt;
      s.outside = 0;
    } else {
      s.outside += dt;
      if (s.outside > SC.comboGraceSec && s.tz > 0) {
        if (comboK(s.tz) > 1) this.events.comboBreak(c.tick);
        s.tz = 0;
      }
    }
    s.combo = comboK(s.tz);
    // proximity points
    if (m > 0) {
      const p = proximityRate(d, this.pr.flat, g.V, s.combo) * dt;
      s.score += p;
      this.breakdown.proximity += p;
    }
    // graze (one per pass at the confirmed local minimum)
    if (c.contactTick === 1) {
      s.grazeActive = 0;
      s.grazeContact = 1;
    }
    if (s.grazeActive === 0 && d < SC.grazeD && c.contactTick === 0) {
      s.grazeActive = 1;
      s.grazeFired = 0;
      s.grazeContact = 0;
      s.grazeMin = Infinity;
    }
    if (s.grazeActive === 1) {
      if (d < s.grazeMin) {
        s.grazeMin = d;
        s.grazeMinPropId = this.pr.propId;
        s.grazeMinMult = multiplier(d, this.pr.flat);
        s.grazeMinX = this.pr.px;
        s.grazeMinY = this.pr.py;
        s.grazeMinZ = this.pr.pz;
        s.grazeMinCls = clsIndex(this.pr.cls);
        sincos(g.psi, this.sc2);
        s.grazeMinSide = (this.pr.px - g.x) * this.sc2[1] + (this.pr.pz - g.z) * this.sc2[0] >= 0 ? 1 : -1;
        s.grazeSpeed = g.V;
      }
      if (s.grazeFired === 0 && s.grazeContact === 0 && d > s.grazeMin + SC.grazeMinRise) {
        s.grazeFired = 1;
        if (s.grazeSpeed > SC.grazeMinSpeed && this.grazeReady(s.grazeMinPropId)) {
          const pts = SC.grazePoints * s.grazeMinMult;
          s.score += pts;
          this.breakdown.graze += pts;
          s.grazeCount++;
          const strength = clamp((SC.grazeD - s.grazeMin) / SC.grazeD, 0, 1);
          this.events.graze(c.tick, pts, strength, s.grazeMinX, s.grazeMinY, s.grazeMinZ, CLS_LIST[s.grazeMinCls], s.grazeMinSide as -1 | 1);
          this.grazeCdId[this.grazeCdNext] = s.grazeMinPropId;
          this.grazeCdT[this.grazeCdNext] = c.simTime + SC.grazeCooldownSec;
          this.grazeCdNext = (this.grazeCdNext + 1) & 7;
        }
      }
      if (d > SC.grazeRearmD) s.grazeActive = 0;
    }
  }

  private grazeReady(id: number): boolean {
    const t = this.core.simTime;
    for (let i = 0; i < 8; i++) if (this.grazeCdId[i] === id && this.grazeCdT[i] > t) return false;
    return true;
  }

  private gatesTick(): void {
    const c = this.core;
    const s = this.sc;
    const gates = this.route.gates;
    if (s.gateIndex >= gates.length) return;
    const ax = c.prevX;
    const ay = c.prevY;
    const az = c.prevZ;
    const bx = this.glider.x;
    const by = this.glider.y;
    const bz = this.glider.z;
    const mag = this.assist === 'full' ? 1 + SC.gateMagnet : 1;
    const g = gates[s.gateIndex];
    const lat = gateCrossing(g, ax, ay, az, bx, by, bz);
    if (lat >= 0) {
      if (lat <= g.radius * mag) this.passGate();
      else if (lat <= g.radius * SC.gateMissRadiusFactor) this.missGate();
      return;
    }
    if (s.gateIndex + 1 < gates.length) {
      const g2 = gates[s.gateIndex + 1];
      const lat2 = gateCrossing(g2, ax, ay, az, bx, by, bz);
      if (lat2 >= 0 && lat2 <= g2.radius * mag) {
        this.missGate();
        this.passGate();
      }
    }
  }

  private passGate(): void {
    const s = this.sc;
    s.gateChain++;
    const bonus = Math.min(SC.gateChainMax, SC.gateChainStep * (s.gateChain - 1));
    const pts = SC.gatePoints + bonus;
    s.score += pts;
    this.breakdown.gates += pts;
    s.gatesPassed++;
    this.events.gate(this.core.tick, s.gateIndex, pts, s.gateChain);
    s.gateIndex++;
  }

  private missGate(): void {
    const s = this.sc;
    s.gateChain = 0;
    s.gatesMissed++;
    this.events.gateMissed(this.core.tick, s.gateIndex);
    s.gateIndex++;
  }

  private thermalTick(): void {
    const c = this.core;
    const s = this.sc;
    const th = c.thermal;
    if (th === s.inThermal) return;
    if (s.inThermal >= 0) this.events.thermalExit(c.tick, s.inThermal);
    if (th >= 0) {
      this.events.thermalEnter(c.tick, th);
      const bit = 1 << (th & 31);
      if (!this.freeFlight && (s.thermalRewarded & bit) === 0) {
        s.thermalRewarded |= bit;
        s.score += SC.thermalPoints;
        this.breakdown.thermals += SC.thermalPoints;
      }
    }
    s.inThermal = th;
  }

  /** Balloon İlmeği (§2.5, §4.G.6): crossing the vertical curtain between two balloons ≤ 35 m apart. */
  private threadsTick(): void {
    const nb = this.balloons.length;
    if (nb < 2) return;
    const c = this.core;
    const s = this.sc;
    const P = this.proximity;
    const bc = P.balloonCenters;
    const x = this.glider.x;
    const y = this.glider.y;
    const z = this.glider.z;
    let n = 0;
    for (let i = 0; i < nb && n < MAX_NEAR_BALLOONS; i++) {
      const dx = bc[i * 3] - x;
      const dz = bc[i * 3 + 2] - z;
      if (dx * dx + dz * dz < 60 * 60) this.nearIdx[n++] = i;
    }
    if (n < 2) return;
    const ax0 = c.prevX;
    const ay0 = c.prevY;
    const az0 = c.prevZ;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const i = this.nearIdx[p];
        const j = this.nearIdx[q];
        const Ax = bc[i * 3];
        const Ay = bc[i * 3 + 1];
        const Az = bc[i * 3 + 2];
        const Bx = bc[j * 3];
        const By = bc[j * 3 + 1];
        const Bz = bc[j * 3 + 2];
        const ex = Bx - Ax;
        const ey = By - Ay;
        const ez = Bz - Az;
        if (ex * ex + ey * ey + ez * ez > SC.threadPairMaxDist * SC.threadPairMaxDist) continue;
        // 2D cross products (xz) of the pilot's previous / current position relative to segment A→B
        const c0 = ex * (az0 - Az) - ez * (ax0 - Ax);
        const c1 = ex * (z - Az) - ez * (x - Ax);
        if ((c0 < 0 && c1 < 0) || (c0 > 0 && c1 > 0) || c0 === c1) continue;
        const t = c0 / (c0 - c1);
        const X = ax0 + (x - ax0) * t;
        const Y = ay0 + (y - ay0) * t;
        const Z = az0 + (z - az0) * t;
        const e2 = ex * ex + ez * ez;
        const u = e2 > 0 ? ((X - Ax) * ex + (Z - Az) * ez) / e2 : -1;
        if (u < 0 || u > 1) continue;
        const bi = this.balloons[i];
        const bj = this.balloons[j];
        const lo = Math.min(Ay - bi.envelopeH * 0.5, By - bj.envelopeH * 0.5);
        const hi = Math.max(Ay + bi.envelopeH * 0.5, By + bj.envelopeH * 0.5);
        if (Y < lo || Y > hi) continue;
        if (P.balloonSdf(i, X, Y, Z) > SC.threadMaxDistToBalloon || P.balloonSdf(j, X, Y, Z) > SC.threadMaxDistToBalloon) continue;
        const key = i < j ? i * nb + j : j * nb + i;
        if (c.simTime - this.threadPair[key] < SC.threadPairCooldownSec) continue;
        this.threadPair[key] = c.simTime;
        if (c.simTime - s.lastThreadTime <= SC.threadChainWindowSec) {
          s.threadChain = Math.min(SC.threadChainMax, s.threadChain * SC.threadChainMult);
        } else {
          s.threadChain = 1;
        }
        s.lastThreadTime = c.simTime;
        const pts = SC.threadPoints * s.threadChain;
        s.score += pts;
        this.breakdown.threads += pts;
        s.threadCount++;
        this.events.balloonThread(c.tick, bi.id, bj.id, pts, s.threadChain);
      }
    }
  }

  // ── publish ──
  private publish(): void {
    const c = this.core;
    const st = this.state;
    const g = this.glider;
    const cp = this.canopy;
    st.tick = c.tick;
    st.phase = PHASES[c.phase];
    st.prevPos[0] = c.prevX;
    st.prevPos[1] = c.prevY;
    st.prevPos[2] = c.prevZ;
    st.pos[0] = this.posX();
    st.pos[1] = this.posY();
    st.pos[2] = this.posZ();
    if (c.phase === PH_JUMP || c.phase === PH_INTRO) {
      st.vel[0] = c.phase === PH_INTRO ? 0 : c.jvx;
      st.vel[1] = c.phase === PH_INTRO ? 0 : c.jvy;
      st.vel[2] = c.phase === PH_INTRO ? 0 : c.jvz;
    } else if (cp.active === 1 || c.phase === PH_LANDED || c.phase === PH_HALF) {
      st.vel[0] = cp.vx;
      st.vel[1] = cp.vy;
      st.vel[2] = cp.vz;
    } else {
      st.vel[0] = g.vx;
      st.vel[1] = g.vy;
      st.vel[2] = g.vz;
    }
    const sp = Math.sqrt(st.vel[0] * st.vel[0] + st.vel[1] * st.vel[1] + st.vel[2] * st.vel[2]);
    st.speed = c.phase === PH_FLYING ? g.V : c.phase === PH_CRASHED ? 0 : sp;
    st.gamma = g.gamma;
    st.psi = cp.active === 1 ? cp.psi : g.psi;
    st.phi = cp.active === 1 ? 0 : g.phi;
    st.cl = g.cl;
    st.heightAGL = this.pr.agl;
    const px = st.prox;
    px.d = c.d;
    px.cls = c.d < Infinity ? this.pr.cls : 'none';
    px.nearest[0] = this.pr.px;
    px.nearest[1] = this.pr.py;
    px.nearest[2] = this.pr.pz;
    px.normal[0] = this.pr.nx;
    px.normal[1] = this.pr.ny;
    px.normal[2] = this.pr.nz;
    px.mult = c.phase === PH_FLYING ? (c.mult as 0 | 1 | 2 | 3 | 5) : 0;
    px.propId = c.d < Infinity ? this.pr.propId : -1;
    st.score = this.sc.score;
    st.combo = this.sc.combo;
    st.comboTime = this.sc.tz;
    st.timeSec = c.simTime;
    st.gateIndex = this.sc.gateIndex;
    st.gatesPassed = this.sc.gatesPassed;
    st.gatesMissed = this.sc.gatesMissed;
    st.inThermal = this.sc.inThermal;
    st.inLandingZone = c.inZone === 1;
    st.canopyOpen = cp.active === 1;
    st.energy = 0.5 * st.speed * st.speed + G * st.pos[1];
    st.stall = c.phase === PH_FLYING ? g.stall : 0;
    st.canopyOpening = cp.active === 1 && cp.openT < CP.openSec;
    st.assistUsed = c.assistUsed === 1;
  }
}
