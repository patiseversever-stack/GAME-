// Energy-aware autopilot shared by the Careful / Average / Expert (Kılavuz) bots (owner: routes agent).
// PURE: detMath only, zero allocation per tick after construction. Brief §9.G "Bot autoplay politikaları",
// GDD §4.4 (BotController, energy-aware).
//
// The bot is a player with perfect eyes and a 30 Hz thumb: it reads FlightState, the route and the world
// (terrain sampler + prop-top raster + balloon motion) and emits exactly the quantized Commands a touch player
// would emit ('axis' on even ticks, 'parachute' and 'flare' events). It never touches the sim.
//
// Guidance (every command slot = 2 ticks):
//   lateral   pure pursuit on the dense route line (look-ahead ≈ 1.15 s), gate centres and balloon-pair
//             midpoints override the aim point when they are close ahead.
//   vertical  desired path slope = max(line target, obstacle clearance over the next ≈ 2.4 s, velocity probes).
//             Line target is energy aware: E = y + V²/2g is compared with the line's reference energy
//             (y_line + V_ref²/2g); a surplus lets the pilot drop below the line toward the surface (this is
//             where the proximity points are), a deficit keeps it on the line at no more than trim pull.
//   control   desired γ̇ (PD) and turn rate → required lift vector → bank φ (stick x) and C_L (stick y),
//             inverted through the sim's own stick mapping (§4.G.5), quantized to ±31.
//   landing   opens the canopy in the zone at the policy height (Kılavuz: 60–90 m "Cesur Açılış"), manages
//             the canopy glide ratio with brakes toward the target ring, flares below 4 m.

import { TUNING } from '../data/tuning.ts';
import { atan, atan2, clamp, cos, DEG, sin, smooth01, wrapPi } from '../math/detMath.ts';
import { Rng, STREAM } from '../math/rng.ts';
import { balloonPos } from '../world/balloons.ts';
import type { TerrainSampler } from '../terrain/types.ts';
import type { BalloonDef, Command, FlightState, RouteDef } from '../types.ts';
import { CanopyState } from '../flight/canopy.ts';
import { DenseLine } from './line.ts';
import type { ObstacleField } from './obstacles.ts';

export type BotPolicy = 'careful' | 'expert' | 'average' | 'noise';
export const BOT_POLICIES: readonly BotPolicy[] = ['careful', 'expert', 'average', 'noise'];

/** What a bot may look at besides FlightState and the route. */
export interface BotWorld {
  sampler: TerrainSampler;
  /** Prop-top raster built from the same props the sim collides with (optional: terrain only without it). */
  obstacles?: ObstacleField | null;
  hasSea?: boolean;
  /** The sim's balloon set (same list FlightSim got). Needed for Balloon İlmeği seeking. */
  balloons?: readonly BalloonDef[];
}

/** Common bot contract (GDD §4.4 BotController): commands for the tick that is about to be stepped. */
export interface BotController {
  readonly policy: BotPolicy;
  readonly actorId: number;
  /** Appends this tick's commands (Command.tick = st.tick) to `out`. Returns how many were appended. */
  commands(st: FlightState, out: Command[]): number;
  /** Same as commands() into an internal reusable array (valid until the next call). */
  next(st: FlightState): Command[];
  /** Back to the route start (call together with FlightSim.resetToStart()). */
  reset(): void;
}

export interface PilotParams {
  /** Desired clearance above the highest surface under the line (m). */
  offset: number;
  /** Clearance floor for obstacle look-ahead and velocity probes (m). */
  hardMin: number;
  /** 0..1: how much of the energy surplus is spent below the line (0 = stay on/above the line). */
  energyUse: number;
  /** May fly this much below the line where the line itself is close to the surface (m). */
  lineDrop: number;
  /** Reference airspeed of the line's energy budget (m/s). */
  vRef: number;
  /** Aim this fraction of the gate radius below the centre. */
  gateAim: number;
  /** Canopy opening height above ground (m). */
  openAgl: number;
  /** Flare before touchdown. */
  flare: boolean;
  /** Probability to take each thermal through its core (else pass 1.3 R aside). */
  thermalUse: number;
  /** Balloon İlmeği: actively seek pairs ahead / only when a pair is on the path / never. */
  threads: 'seek' | 'onPath' | 'none';
  /** Reaction lag in 30 Hz command slots (8 ≈ 250 ms). */
  lagSlots: number;
  /** Lateral wander amplitude (m), seeded. */
  lateralNoise: number;
  /** Vertical wander amplitude (m), seeded. */
  verticalNoise: number;
  /** Look-ahead time for obstacle clearance (s). */
  clearLookSec: number;
}

export const PILOT_PARAMS: Readonly<Record<'careful' | 'expert' | 'average', PilotParams>> = {
  careful: {
    offset: 18,
    hardMin: 9,
    energyUse: 0,
    lineDrop: 0,
    vRef: 44,
    gateAim: 0,
    openAgl: 110,
    flare: true,
    thermalUse: 0,
    threads: 'none',
    lagSlots: 0,
    lateralNoise: 0,
    verticalNoise: 0,
    clearLookSec: 2.6,
  },
  expert: {
    offset: 4,
    hardMin: 2.2,
    energyUse: 1,
    lineDrop: 25,
    vRef: 46,
    gateAim: 0.45,
    openAgl: 78,
    flare: true,
    thermalUse: 1,
    threads: 'seek',
    lagSlots: 0,
    lateralNoise: 0,
    verticalNoise: 0,
    clearLookSec: 2.4,
  },
  average: {
    offset: 10,
    hardMin: 5,
    energyUse: 0.6,
    lineDrop: 10,
    vRef: 46,
    gateAim: 0.2,
    openAgl: 95,
    flare: true,
    thermalUse: 0.5,
    threads: 'onPath',
    lagSlots: 8,
    lateralNoise: 3,
    verticalNoise: 2,
    clearLookSec: 2.6,
  },
};

const G = TUNING.sim.g;
const AXIS = TUNING.control.axisMax;
const BANK_MAX = TUNING.control.bankMaxDeg * DEG;
const A = TUNING.aero;
const QS_K = 0.5 * A.rho * TUNING.body.area; // q·S = QS_K·V²
const MASS = TUNING.body.mass;
const ST = TUNING.stall;
const CP = TUNING.canopy;
const ZONE_R = CP.zoneRadius;
const MAX_PAIRS = 256;
const CANOPY_SX: readonly number[] = [-31, -12, 12, 31];
const CANOPY_HOLD: readonly number[] = [0.7, 2.2];
/** Flare height: low enough that the stored flare energy lasts to touchdown (soft ≤ 2.6 m/s), < 3 m rule. */
const FLARE_AGL = 1.7;

export class PilotBot implements BotController {
  readonly policy: BotPolicy;
  readonly actorId: number;
  readonly route: RouteDef;
  readonly line: DenseLine;
  readonly params: PilotParams;
  /** Last aim point (debug / e2e overlay). */
  readonly target = new Float64Array(3);

  private readonly world: BotWorld;
  private readonly seed: number;
  private readonly rng: Rng;
  private readonly proj = new Float64Array(3);
  private readonly bp = new Float64Array(3);
  private readonly bq = new Float64Array(3);
  private readonly cmdAxis: Command;
  private readonly cmdChute: Command;
  private readonly cmdFlare: Command;
  private readonly list: Command[] = [];
  private readonly lagX: Int8Array = new Int8Array(64);
  private readonly lagY: Int8Array = new Int8Array(64);
  /** Gate arc-length positions on the line. */
  private readonly gateS: Float64Array;
  /** Gate centre lateral offset from the line (m, + = right). */
  private readonly gateLat: Float64Array;
  /** Thermal plans: lateral offset to fly through each thermal (0 = core). */
  private readonly thermalS: Float64Array;
  private readonly thermalLat: Float64Array;
  /** Threadable balloon pairs (indices into world.balloons). */
  private readonly pairA: Int32Array;
  private readonly pairB: Int32Array;
  private readonly pairCount: number;
  private readonly pairDone: Float64Array;
  private readonly landX: number;
  private readonly landZ: number;
  private readonly windX: number;
  private readonly windZ: number;
  /** Spiral side under the canopy (+1 right, −1 left), seeded. */
  private crabSide = 1;
  private readonly cs = new CanopyState();
  private canopyTick0 = -1;
  private planSlot = -1;
  private planTick = 0;
  private planSx = 0;
  private planHold = 0;
  // dynamic
  private idx = 0;
  private sLine = 0;
  private gPrev = 0;
  private chuteSent = false;
  private lastFlare = -1;
  private brake = 0;
  private threadPair = -1;
  private threadT = 0;
  private threadScanTick = -100;
  private noisePhaseX = 0;
  private noisePhaseY = 0;

  constructor(policy: 'careful' | 'expert' | 'average', route: RouteDef, world: BotWorld, seed = 1, actorId = 0, params?: Partial<PilotParams>) {
    this.policy = policy;
    this.route = route;
    this.world = world;
    this.actorId = actorId;
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed, STREAM.bots);
    const base = PILOT_PARAMS[policy];
    this.params = { ...base, ...(params ?? {}) };
    const hasSea = world.hasSea ?? (world.sampler as unknown as { terrain?: { hasSea?: boolean } }).terrain?.hasSea ?? false;
    this.line = new DenseLine(route.line, world.sampler, world.obstacles ?? null, hasSea);
    this.cmdAxis = { tick: 0, actorId, cmd: 'axis', args: [0, 0] };
    this.cmdChute = { tick: 0, actorId, cmd: 'parachute', args: [] };
    this.cmdFlare = { tick: 0, actorId, cmd: 'flare', args: [0] };
    this.landX = route.landing.center[0];
    this.landZ = route.landing.center[2];
    const to = (route.wind.dirDeg + 180) * DEG;
    this.windX = route.wind.speed * sin(to);
    this.windZ = -route.wind.speed * cos(to);
    // gate / thermal positions along the line
    const tmp = new Float64Array(3);
    this.gateS = new Float64Array(route.gates.length);
    this.gateLat = new Float64Array(route.gates.length);
    let hint = 0;
    for (let i = 0; i < route.gates.length; i++) {
      const g = route.gates[i];
      this.gateS[i] = this.line.project(g.pos[0], g.pos[2], hint, 4, this.line.n, tmp);
      this.gateLat[i] = tmp[2];
      hint = tmp[0];
    }
    this.thermalS = new Float64Array(route.thermals.length);
    this.thermalLat = new Float64Array(route.thermals.length);
    for (let i = 0; i < route.thermals.length; i++) {
      const t = route.thermals[i];
      this.thermalS[i] = this.line.project(t.pos[0], t.pos[1], 0, 0, this.line.n, tmp);
    }
    // balloon pairs that can be threaded (§2.5: centres ≤ 35 m)
    const bl = world.balloons ?? [];
    const pa: number[] = [];
    const pb: number[] = [];
    if (this.params.threads !== 'none') {
      for (let i = 0; i < bl.length && pa.length < MAX_PAIRS; i++) {
        for (let j = i + 1; j < bl.length && pa.length < MAX_PAIRS; j++) {
          const a = bl[i].p0;
          const b = bl[j].p0;
          const dx = a[0] - b[0];
          const dy = a[1] - b[1];
          const dz = a[2] - b[2];
          if (dx * dx + dy * dy + dz * dz <= 32 * 32) {
            pa.push(i);
            pb.push(j);
          }
        }
      }
    }
    this.pairA = new Int32Array(pa);
    this.pairB = new Int32Array(pb);
    this.pairCount = pa.length;
    this.pairDone = new Float64Array(pa.length).fill(-1e9);
    this.reset();
  }

  reset(): void {
    this.idx = 0;
    this.sLine = 0;
    this.gPrev = 0;
    this.chuteSent = false;
    this.lastFlare = -1;
    this.brake = 0;
    this.canopyTick0 = -1;
    this.planSlot = -1;
    this.threadPair = -1;
    this.threadT = 0;
    this.threadScanTick = -100;
    this.lagX.fill(0);
    this.lagY.fill(0);
    this.pairDone.fill(-1e9);
    this.rng.reseed(this.seed, STREAM.bots);
    this.noisePhaseX = this.rng.range(0, 6.283185307179586);
    this.noisePhaseY = this.rng.range(0, 6.283185307179586);
    this.crabSide = this.rng.next() < 0.5 ? -1 : 1;
    for (let i = 0; i < this.thermalLat.length; i++) {
      const use = this.rng.next() < this.params.thermalUse;
      const R = this.route.thermals[i].radius;
      this.thermalLat[i] = use ? 0 : (this.rng.next() < 0.5 ? -1.3 : 1.3) * R;
    }
  }

  next(st: FlightState): Command[] {
    this.list.length = 0;
    this.commands(st, this.list);
    return this.list;
  }

  commands(st: FlightState, out: Command[]): number {
    const tick = st.tick;
    let n = 0;
    const ph = st.phase;
    if (ph === 'flying') {
      if (!this.chuteSent && st.inLandingZone && this.wantChute(st)) {
        this.cmdChute.tick = tick;
        out.push(this.cmdChute);
        this.chuteSent = true;
        n++;
      }
      if ((tick & 1) === 0) {
        this.fly(st);
        out.push(this.cmdAxis);
        n++;
      }
    } else if (ph === 'canopy' || ph === 'halfFlight') {
      if ((tick & 1) === 0) {
        this.canopy(st);
        out.push(this.cmdAxis);
        n++;
        const f = this.params.flare && st.heightAGL < FLARE_AGL ? AXIS : 0;
        if (f !== this.lastFlare) {
          this.lastFlare = f;
          this.cmdFlare.tick = tick;
          this.cmdFlare.args[0] = f;
          out.push(this.cmdFlare);
          n++;
        }
      }
    }
    return n;
  }

  // ─── wingsuit ────────────────────────────────────────────────────────────────────────────────────────

  private fly(st: FlightState): void {
    const p = this.params;
    const L = this.line;
    const x = st.pos[0];
    const y = st.pos[1];
    const z = st.pos[2];
    const V = st.speed > 1 ? st.speed : 1;
    const gamma = st.gamma;
    const psi = st.psi;
    const tick = st.tick;
    const tSec = st.timeSec;

    // progress along the line
    const s = L.project(x, z, this.idx, 6, 60, this.proj);
    this.idx = this.proj[0];
    this.sLine = s;
    const lat = this.proj[2];

    // wander (average player)
    let wanderLat = 0;
    let wanderV = 0;
    if (p.lateralNoise > 0) wanderLat = p.lateralNoise * sin(tSec * 0.41 + this.noisePhaseX);
    if (p.verticalNoise > 0) wanderV = p.verticalNoise * sin(tSec * 0.29 + this.noisePhaseY);

    // ── lateral aim point ──
    const Lh = clamp(1.15 * V, 45, 90);
    const sAim = s + Lh;
    const iAim = L.indexAt(sAim, this.idx);
    let ax = L.at(L.x, sAim, iAim);
    let az = L.at(L.z, sAim, iAim);
    let latAim = wanderLat;
    // thermal plan: pass the core or aside
    for (let i = 0; i < this.thermalS.length; i++) {
      const ds = this.thermalS[i] - sAim;
      if (ds > -60 && ds < 60) latAim += this.thermalLat[i] * (1 - (ds < 0 ? -ds : ds) / 60);
    }
    for (let i = this.gateS.length > 0 ? 0 : 0; i < this.gateS.length; i++) {
      const ds = this.gateS[i] - sAim;
      if (ds > -150 && ds < 150 && this.gateLat[i] !== 0) latAim += this.gateLat[i] * (1 - (ds < 0 ? -ds : ds) / 150);
    }
    if (latAim !== 0) {
      ax += -L.tz[iAim] * latAim;
      az += L.tx[iAim] * latAim;
    }
    const endS = L.length;
    const lc = this.route.landing.center;
    const dLx = this.landX - x;
    const dLz = this.landZ - z;
    const distLand = Math.sqrt(dLx * dLx + dLz * dLz);
    const approach = s > endS - 30 || (st.inLandingZone && s > endS - 260);
    if (approach) {
      ax = this.landX;
      az = this.landZ;
    }

    // ── vertical: line target with energy budget ──
    const Lv = clamp(V, 30, 70);
    const yLineAim = L.at(L.y, s + Lv, this.idx);
    const yLineHere = L.at(L.y, s, this.idx);
    const eBot = y + (V * V) / (2 * G);
    const eRef = yLineHere + (p.vRef * p.vRef) / (2 * G);
    const surplus = eBot - eRef;
    const nearEnd = s > endS - 520;
    const k = nearEnd ? 0 : p.energyUse;
    let yT = yLineAim - k * (surplus > 0 ? surplus : 0) - (nearEnd ? 0 : p.lineDrop) + wanderV;
    let mLine = (yT - y) / Lv;
    if (approach) {
      const gy = this.surface(this.landX, this.landZ) + p.openAgl;
      mLine = (gy - y) / (distLand > 40 ? distLand : 40);
    }

    // gate: aim through the ring (below the centre for the Kılavuz)
    const gi = st.gateIndex;
    let gateLat = false;
    let gateNear = false;
    if (gi < this.route.gates.length) {
      const g = this.route.gates[gi];
      const dg = this.gateS[gi] - s;
      if (dg > -5 && dg < 220) {
        const gy = g.pos[1] - p.gateAim * g.radius;
        const mGate = (gy - y) / (dg > 15 ? dg : 15);
        const w = dg < 130 ? 1 : (220 - dg) / 90;
        mLine = mLine * (1 - w) + mGate * w;
        if (dg < 140) gateLat = true;
        // the ring is ≥ 4 m clear of every surface: inside its approach only the hard floor applies
        if (dg < 110) gateNear = true;
      }
    }

    // balloon İlmeği
    if (p.threads !== 'none' && this.pairCount > 0 && !gateLat && !nearEnd) {
      if (this.threadPair < 0 && tick - this.threadScanTick >= 8) {
        this.threadScanTick = tick;
        this.scanThreads(st, s, lat);
      }
      if (this.threadPair >= 0) {
        const r = this.threadAim(st);
        if (r > 0) {
          ax = this.target[0];
          az = this.target[2];
          mLine = (this.target[1] - y) / (r > 20 ? r : 20);
        }
      }
    }

    // ── obstacle clearance over the look-ahead window ──
    const offEff = (gateNear ? p.hardMin : p.offset) + (V < 40 ? (40 - V) * 0.8 : 0);
    const D = clamp(V * p.clearLookSec, 60, 170);
    let mClear = -10;
    for (let j = this.idx + 1; j < L.n; j++) {
      const ds = L.s[j] - s;
      if (ds > D) break;
      if (ds <= 0) continue;
      const m = (L.env[j] + offEff - y) / (ds + 4);
      if (m > mClear) mClear = m;
    }
    // probes along the current velocity (catches lateral excursions, ridges beside the line)
    const vx = st.vel[0];
    const vz = st.vel[2];
    const vh = Math.sqrt(vx * vx + vz * vz);
    let mProbe = -10;
    if (vh > 1) {
      for (let q = 1; q <= 5; q++) {
        const t = 0.35 * q;
        const px = x + vx * t;
        const pz = z + vz * t;
        const h = this.surface(px, pz);
        const m = (h + p.hardMin - y) / (vh * t + 2);
        if (m > mProbe) mProbe = m;
      }
    }
    const hHere = this.surface(x, z);
    const agl = y - hHere;

    let m = mLine;
    if (mClear > m) m = mClear;
    if (mProbe > m) m = mProbe;
    // low speed: never pull for the line alone (energy first), only for obstacles
    if (V < 37) {
      const mSafe = mProbe > mClear - 0.15 ? mProbe : mClear - 0.15;
      const cap = -0.18 - (37 - V) * 0.02;
      if (m > cap && m > mSafe) m = mSafe > cap ? mSafe : cap;
    }
    let gD = atan(m);
    gD = clamp(gD, -55 * DEG, 30 * DEG);
    // sinking toward the ground with little energy: arrest the sink (emergency-chute guard)
    const hE = agl + ((V * V - 42 * 42) > 0 ? (V * V - 42 * 42) / (2 * G) : 0);
    if (agl < 22 && hE < 28 && st.vel[1] < -2) {
      const gg = gamma + 6 * DEG;
      if (gg > gD) gD = gg;
    }

    // ── γ loop (PD) → normal load ──
    const gDot = (gamma - this.gPrev) * 30;
    this.gPrev = gamma;
    let gdCmd = 3.2 * (gD - gamma) - 0.25 * gDot;
    gdCmd = clamp(gdCmd, -0.9, 0.9);
    const cg = cos(gamma);
    const aV = G * cg + V * gdCmd;

    // ── turn: pure pursuit ──
    const dxA = ax - x;
    const dzA = az - z;
    const dA = Math.sqrt(dxA * dxA + dzA * dzA);
    const want = atan2(dxA, -dzA);
    const alpha = wrapPi(want - psi);
    const Lp = dA > 0.8 * Lh ? dA : 0.8 * Lh;
    let psiDot = (2 * V * sin(alpha)) / Lp;
    psiDot = clamp(psiDot, -0.6, 0.6);
    let aH = V * cg * psiDot;
    const aVc = aV > 0.3 * G ? aV : 0.3 * G;
    let phi = atan2(aH, aVc);
    const pm = 56 * DEG;
    if (phi > pm) phi = pm;
    if (phi < -pm) phi = -pm;
    aH = aVc * (sin(phi) / cos(phi));
    const lift = Math.sqrt(aH * aH + aV * aV) * (aV < 0 ? -1 : 1);
    const qS = QS_K * V * V;
    const cl = (lift * MASS) / qS;
    const stall = smooth01((ST.onset - V) / (ST.onset - ST.vMin));
    const clCeil = A.clMax - (A.clMax - ST.clAtVMin) * stall;
    let syF: number;
    if (cl >= A.clTrim) syF = ((cl - A.clTrim) / (clCeil - A.clTrim > 0.05 ? clCeil - A.clTrim : 0.05)) * AXIS;
    else syF = ((cl - A.clTrim) / (A.clTrim - A.clMin)) * AXIS;
    const sxF = (phi / BANK_MAX) * AXIS;
    this.target[0] = ax;
    this.target[1] = y + m * Lv;
    this.target[2] = az;
    this.emit(tick, sxF, syF);
  }

  private surface(x: number, z: number): number {
    const o = this.world.obstacles;
    if (o) return o.surfaceTop(x, z);
    const h = this.world.sampler.height(x, z);
    return this.world.hasSea && h < 0 ? 0 : h;
  }

  /** Pick a threadable balloon pair ahead near the line (Kılavuz: seek; average: only when on the path). */
  private scanThreads(st: FlightState, s: number, lat: number): void {
    const bl = this.world.balloons ?? [];
    const V = st.speed > 20 ? st.speed : 20;
    const L = this.line;
    const maxLat = this.params.threads === 'seek' ? 75 : 18;
    let best = -1;
    let bestScore = Infinity;
    let bestT = 0;
    for (let k = 0; k < this.pairCount; k++) {
      if (st.timeSec - this.pairDone[k] < 6) continue;
      const a = bl[this.pairA[k]];
      const b = bl[this.pairB[k]];
      // rough arrival time from the current distance
      balloonPos(a, st.timeSec, this.bp);
      const dx0 = this.bp[0] - st.pos[0];
      const dz0 = this.bp[2] - st.pos[2];
      const d0 = Math.sqrt(dx0 * dx0 + dz0 * dz0);
      if (d0 > 420 || d0 < 70) continue;
      const t = st.timeSec + d0 / V;
      balloonPos(a, t, this.bp);
      balloonPos(b, t, this.bq);
      const mx = (this.bp[0] + this.bq[0]) * 0.5;
      const my = (this.bp[1] + this.bq[1]) * 0.5;
      const mz = (this.bp[2] + this.bq[2]) * 0.5;
      const ms = L.project(mx, mz, this.idx, 0, 100, this.proj);
      const ahead = ms - s;
      if (ahead < 70 || ahead > 420) continue;
      const lt = this.proj[2] - lat;
      if (lt > maxLat || lt < -maxLat) continue;
      // crossing direction: the pair axis must be across the flight direction
      const ex = this.bq[0] - this.bp[0];
      const ez = this.bq[2] - this.bp[2];
      const el = Math.sqrt(ex * ex + ez * ez);
      const ti = this.proj[0];
      const dot = el > 1 ? (ex * L.tx[ti] + ez * L.tz[ti]) / el : 1;
      if (dot > 0.55 || dot < -0.55) continue;
      // height: reachable from the line, safely above the surface
      const ly = L.y[ti];
      const surf = this.surface(mx, mz);
      if (my < surf + 25) continue;
      const dy = my - ly;
      if (dy > 35 || dy < -70) continue;
      // energy: never climb to a pair we cannot reach with speed to spare
      const eNeed = my + (40 * 40) / (2 * G);
      const eHave = st.pos[1] + (st.speed * st.speed) / (2 * G) - ahead / 4.2;
      if (eHave < eNeed) continue;
      const sc = (lt < 0 ? -lt : lt) + (dy < 0 ? -dy : dy) * 0.5;
      if (sc < bestScore) {
        bestScore = sc;
        best = k;
        bestT = t;
      }
    }
    this.threadPair = best;
    this.threadT = bestT;
  }

  /** Aim at the current pair's midpoint at the predicted crossing time; returns the distance (0 = done). */
  private threadAim(st: FlightState): number {
    const k = this.threadPair;
    const bl = this.world.balloons ?? [];
    const a = bl[this.pairA[k]];
    const b = bl[this.pairB[k]];
    balloonPos(a, st.timeSec, this.bp);
    balloonPos(b, st.timeSec, this.bq);
    let mx = (this.bp[0] + this.bq[0]) * 0.5;
    let mz = (this.bp[2] + this.bq[2]) * 0.5;
    const dx = mx - st.pos[0];
    const dz = mz - st.pos[2];
    const d = Math.sqrt(dx * dx + dz * dz);
    // passed it (behind us) → done
    const fx = st.vel[0];
    const fz = st.vel[2];
    if (dx * fx + dz * fz < 0 || d < 4) {
      this.pairDone[k] = st.timeSec;
      this.threadPair = -1;
      return 0;
    }
    const t = st.timeSec + d / (st.speed > 20 ? st.speed : 20);
    balloonPos(a, t, this.bp);
    balloonPos(b, t, this.bq);
    mx = (this.bp[0] + this.bq[0]) * 0.5;
    mz = (this.bp[2] + this.bq[2]) * 0.5;
    // aim point behind the pair along the approach so the path crosses the curtain squarely
    const my = (this.bp[1] + this.bq[1]) * 0.5;
    this.target[0] = mx + (fx / (st.speed > 1 ? st.speed : 1)) * 30;
    this.target[1] = my;
    this.target[2] = mz + (fz / (st.speed > 1 ? st.speed : 1)) * 30;
    return d;
  }

  private wantChute(st: FlightState): boolean {
    const p = this.params;
    const dx = this.landX - st.pos[0];
    const dz = this.landZ - st.pos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const agl = st.heightAGL;
    if (agl < 58) return true;
    const reach = 1.85 * (agl - 6);
    if (dist > reach) return false;
    if (agl <= p.openAgl + 10) return true;
    // passing over the target still high: open anyway and spiral down
    return dist < 60;
  }

  // ─── canopy ──────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Canopy: model-predictive steering. Every 4th command slot a handful of short manoeuvres ("hold stick x for
   * h seconds, then fly straight at the target") are rolled out with the sim's own CanopyState model over the
   * terrain; the one whose predicted touchdown is closest to the target ring wins. No brakes before the flare
   * (braking spends the stored flare energy that the soft landing needs).
   */
  private canopy(st: FlightState): void {
    const tick = st.tick;
    if (this.canopyTick0 < 0) this.canopyTick0 = tick;
    const slot = tick >> 1;
    if (this.planSlot < 0 || slot - this.planSlot >= 6) {
      this.planSlot = slot;
      this.planTick = tick;
      let best = Infinity;
      let bestSx = 0;
      let bestHold = 0;
      for (let a = 0; a < CANOPY_SX.length; a++) {
        for (let h = 0; h < CANOPY_HOLD.length; h++) {
          const miss = this.rollout(st, CANOPY_SX[a], CANOPY_HOLD[h]);
          // prefer gentle inputs on ties
          const cost = miss + (CANOPY_SX[a] < 0 ? -CANOPY_SX[a] : CANOPY_SX[a]) * 0.002 + CANOPY_HOLD[h] * 0.01;
          if (cost < best) {
            best = cost;
            bestSx = CANOPY_SX[a];
            bestHold = CANOPY_HOLD[h];
          }
        }
      }
      const pure = this.rollout(st, 0, 0);
      if (pure <= best) {
        bestSx = 0;
        bestHold = 0;
      }
      this.planSx = bestSx;
      this.planHold = bestHold;
    }
    const tIn = (tick - this.planTick) / 60;
    let sx: number;
    if (tIn < this.planHold) sx = this.planSx;
    else sx = this.pursuitSx(st.pos[0], st.pos[2], st.psi);
    this.brake = 0;
    this.emit(tick, sx, 0, true);
  }

  private pursuitSx(x: number, z: number, psi: number): number {
    const dx = this.landX - x;
    const dz = this.landZ - z;
    if (dx * dx + dz * dz < 2.25) return 0;
    const err = wrapPi(atan2(dx, -dz) - psi);
    return clamp((err / (9 * DEG)) * AXIS, -AXIS, AXIS);
  }

  /** Predicted horizontal miss at touchdown for "hold sx for `hold` s, then pursue the target". */
  private rollout(st: FlightState, sxHold: number, hold: number): number {
    const cs = this.cs;
    const s = this.world.sampler;
    cs.active = 1;
    cs.openT = (st.tick - this.canopyTick0) / 60 + 0.02;
    cs.x = st.pos[0];
    cs.y = st.pos[1];
    cs.z = st.pos[2];
    cs.psi = st.psi;
    const ax = st.vel[0] - this.windX;
    const az = st.vel[2] - this.windZ;
    cs.vf = Math.sqrt(ax * ax + az * az);
    cs.vs = -st.vel[1];
    cs.brake = 0;
    cs.flareCharge = 1;
    cs.flaredLow = 0;
    // coarse steps high up, fine steps for the last metres; ground from the base surface (zones are flat)
    let t = 0;
    let ground = s.baseHeight(cs.x, cs.z);
    while (cs.y > ground && t < 45) {
      const agl = cs.y - ground;
      const dt = agl > 12 ? 1 / 10 : 1 / 30;
      const sx = t < hold ? sxHold : this.pursuitSx(cs.x, cs.z, cs.psi);
      cs.step(dt, sx, agl < FLARE_AGL ? 1 : 0, this.windX, 0, this.windZ, agl);
      ground = s.baseHeight(cs.x, cs.z);
      t += dt;
    }
    const dx = cs.x - this.landX;
    const dz = cs.z - this.landZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private emit(tick: number, sxF: number, syF: number, canopy = false): void {
    let qx = Math.round(clamp(sxF, -AXIS, AXIS)) | 0;
    let qy = Math.round(clamp(syF, -AXIS, AXIS)) | 0;
    if (qy === 0 && !canopy) qy = syF >= 0 ? 1 : -1; // never "release": keep the commanded lift
    const lag = this.params.lagSlots;
    if (lag > 0) {
      const slot = (tick >> 1) & 63;
      const back = (slot - lag + 64) & 63;
      const ox = this.lagX[back];
      const oy = this.lagY[back];
      this.lagX[slot] = qx;
      this.lagY[slot] = qy;
      qx = ox;
      qy = oy;
    }
    this.cmdAxis.tick = tick;
    this.cmdAxis.args[0] = qx;
    this.cmdAxis.args[1] = qy;
  }
}
