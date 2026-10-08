// SÜRÜ.io deterministic simulation (BRIEF §2.6 rules, §4.G.10 algorithms). 30 Hz fixed tick, 1500 pool birds
// (conserved: Σ ownership = N every tick), up to 16 flocks whose leaders are separate entities.
// PURE: no DOM, no three.js, no Math.random/Date/performance, no Math.sin/cos/atan2/exp (detMath only).
// No allocation in the per-bird hot loops (events are allocated, they are rare).

import { SURU } from './config.ts';
import { detAtan2, detCos, detExp, detSin, DET_TAU, DET_PI } from './detMath.ts';
import { Rng } from './rng.ts';
import { SpatialHash } from './spatialHash.ts';
import { LAYOUT_SAZLIK } from './layouts.ts';
import type {
  FlockRenderSource,
  FlockSnapshot,
  FlockStats,
  HawkView,
  SiegeArcView,
  SuruCommand,
  SuruEvent,
  SuruLayout,
  SuruSnapshot,
} from './types.ts';

/** Bumped whenever sim behaviour changes (replays/daily codes from other versions are rejected). */
export const SURU_SIM_VERSION = 1;

const N = SURU.N_BIRDS;
const FMAX = SURU.MAX_FLOCKS + 1; // flock ids 1..16, index 0 = wild
const CAP = SURU.MAX_CAND;
const CAP_MOVE = SURU.MAX_CAND_MOVE;
const DT = SURU.DT;
const HZ = SURU.TICK_HZ;
const TL = SURU.TRAIL_LEN; // power of two
const TL_MASK = TL - 1;
const G = SURU.MAX_GROUPS;
const NO_GROUP = 255;
const TRIG_N = 4096;

// bird flags
export const FL_FRONTIER = 1;
export const FL_NEAR_LEADER = 2;
export const FL_CHANGED = 4;
export const FL_STORM = 8;
export const FL_SCATTERED = 16;
export const FL_CASCADE = 32;
export const FL_OUTSIDE = 64;

// streams
const RS_LAYOUT = 1;
const RS_WILD = 2;
const RS_CONV = 3;
const RS_HAWK = 4;
const RS_GUST = 5;
const RS_STORM = 6;
const RS_DRIFT = 7;
const RS_SLOT = 8;

// shared trig tables (built once with detMath → identical everywhere)
const COS_T = new Float64Array(TRIG_N);
const SIN_T = new Float64Array(TRIG_N);
for (let k = 0; k < TRIG_N; k++) {
  const a = (k / TRIG_N) * DET_TAU;
  COS_T[k] = detCos(a);
  SIN_T[k] = detSin(a);
}

const FORM_EASE = 1 - detExp(-DT / 0.4); // formation easing per tick (τ = 0.4 s)

export interface FlockSpawnSpec {
  x: number;
  z: number;
  hx: number;
  hz: number;
  followers: number;
  /** explicit follower positions (tests) */
  positions?: { x: number; z: number }[];
}

export interface WildSpawnSpec {
  x: number;
  z: number;
  count: number;
}

export interface SuruSimOptions {
  seed: number;
  layout?: SuruLayout;
  /** 12–16 in a league round (§2.6); tests may use fewer. */
  flockCount?: number;
  roundSec?: number;
  hawks?: boolean;
  storm?: boolean;
  gusts?: boolean;
  ring?: boolean;
  /** custom start (tests, FTUE): explicit flocks + wild groups; remaining birds are parked as far wild groups */
  custom?: { flocks: FlockSpawnSpec[]; wild?: WildSpawnSpec[]; parkRadius?: number };
  /** tests: birds and leaders do not move (detection/timing tests) */
  freezeMotion?: boolean;
  /** disable contact conversion (tests) */
  conversion?: boolean;
  /** disable wild capture (tests) */
  capture?: boolean;
  /** end the round when ≤ 1 flock is alive (default true; single-flock scenarios disable it) */
  lastStanding?: boolean;
  /** wild groups wander between islets (default true; the FTUE keeps them where the ghost thumb points) */
  wildWander?: boolean;
}

export class SuruSim implements FlockRenderSource {
  readonly birdCount = N;
  readonly maxFlocks = SURU.MAX_FLOCKS;
  readonly opts: Required<Pick<SuruSimOptions, 'seed' | 'roundSec' | 'hawks' | 'storm' | 'gusts' | 'ring' | 'freezeMotion' | 'conversion' | 'capture' | 'lastStanding' | 'wildWander'>>;
  readonly layout: SuruLayout;
  readonly roundTicks: number;
  flockCount: number;
  tick = 0;
  roundOver = false;
  winner = 0;

  // ---- birds (SoA, §4.G.10) ----
  readonly posX = new Float32Array(N);
  readonly posZ = new Float32Array(N);
  readonly velX = new Float32Array(N);
  readonly velZ = new Float32Array(N);
  readonly prevX = new Float32Array(N);
  readonly prevZ = new Float32Array(N);
  readonly owner = new Uint8Array(N);
  /** in-flock slot (trail lag + Vogel-like offset), quantised to 16 bits */
  readonly rank = new Uint16Array(N);
  readonly slotV = new Uint16Array(N);
  private readonly slotSqrt = new Float32Array(N);
  private readonly slotC = new Float32Array(N);
  private readonly slotS = new Float32Array(N);
  readonly lastConv = new Uint32Array(N);
  readonly flags = new Uint8Array(N);
  readonly group = new Uint8Array(N);
  private readonly pendTo = new Int8Array(N);
  readonly hash: SpatialHash;
  private readonly sortW = new Float64Array(N);
  private readonly rangeS = new Uint32Array(9);
  private readonly rangeE = new Uint32Array(9);
  private pendCount = 0;

  // ---- flocks (index = flock id) ----
  readonly leaderX = new Float32Array(FMAX);
  readonly leaderZ = new Float32Array(FMAX);
  readonly leaderPrevX = new Float32Array(FMAX);
  readonly leaderPrevZ = new Float32Array(FMAX);
  readonly leaderHX = new Float32Array(FMAX);
  readonly leaderHZ = new Float32Array(FMAX);
  readonly leaderSpeed = new Float32Array(FMAX);
  readonly flockAlive = new Uint8Array(FMAX);
  readonly flockMode = new Uint8Array(FMAX);
  readonly flockTightCmd = new Uint8Array(FMAX);
  readonly flockSteerX = new Int16Array(FMAX);
  readonly flockSteerZ = new Int16Array(FMAX);
  readonly flockBreath = new Float32Array(FMAX);
  readonly flockBreathless = new Uint8Array(FMAX);
  readonly flockLone = new Uint8Array(FMAX);
  readonly flockLoneTick = new Int32Array(FMAX);
  readonly flockElimTick = new Int32Array(FMAX);
  readonly flockPlace = new Uint8Array(FMAX);
  readonly flockCountArr = new Uint16Array(FMAX);
  readonly flockPeak = new Uint16Array(FMAX);
  readonly flockConverted = new Uint32Array(FMAX);
  readonly flockWild = new Uint32Array(FMAX);
  readonly flockSieges = new Uint16Array(FMAX);
  readonly flockInStorm = new Uint8Array(FMAX);
  readonly flockCascading = new Uint8Array(FMAX);
  /** follower counts sampled every 0.5 s (8 samples = 4 s) — AI "opportunity" utility */
  readonly countHist = new Uint16Array(FMAX * 8);
  private readonly flockSpreadK = new Float32Array(FMAX);
  private readonly flockLagMul = new Float32Array(FMAX);
  private readonly flockJoin = new Uint32Array(FMAX);
  private readonly lagTicks = new Float64Array(FMAX);
  private readonly rLat = new Float64Array(FMAX);
  private readonly maxSpd = new Float64Array(FMAX);
  /** follower centroid per flock (leader position when it has none) */
  readonly cenX = new Float64Array(FMAX);
  readonly cenZ = new Float64Array(FMAX);
  private readonly flockNightGroup = new Int16Array(FMAX);
  private readonly flockNightGroupTick = new Int32Array(FMAX);
  readonly trail = new Float32Array(FMAX * TL * 2);

  // ---- wild groups ----
  readonly gActive = new Uint8Array(G);
  readonly gAX = new Float32Array(G);
  readonly gAZ = new Float32Array(G);
  private readonly gTheta = new Uint16Array(G);
  private readonly gOmega = new Int16Array(G);
  private readonly gOrbit = new Float32Array(G);
  readonly gCount = new Uint16Array(G);
  readonly gCX = new Float32Array(G);
  readonly gCZ = new Float32Array(G);
  readonly gImmune = new Int32Array(G);
  /** S-14: former owner that may not recapture this group before gBlockUntil */
  readonly gBlockOwner = new Uint8Array(G);
  readonly gBlockUntil = new Int32Array(G);
  private readonly gNextWander = new Int32Array(G);
  private readonly gLX = new Float32Array(G);
  private readonly gLZ = new Float32Array(G);
  private readonly gCapF = new Uint8Array(G);
  private readonly gCapD = new Float32Array(G);
  private readonly capAcc = new Float64Array(G * 3);
  private readonly flockStormGroup = new Int16Array(FMAX).fill(-1);
  private readonly flockStormGroupTick = new Int32Array(FMAX);
  /** S-14: no new siege by this attacker before this tick */
  readonly flockSiegeCooldown = new Int32Array(FMAX);

  // ---- events / hazards ----
  readonly hawks: HawkView[] = [];
  private hawkNext = 0;
  private hawkDiveTick = 0;
  private hawkWave = 0;
  private readonly hawkTarget = new Int32Array(3);
  private readonly hawkDirX = new Float64Array(3);
  private readonly hawkDirZ = new Float64Array(3);
  private readonly hawkSideX = new Float64Array(3);
  private readonly hawkSideZ = new Float64Array(3);
  private readonly hawkDiveX = new Float64Array(3);
  private readonly hawkDiveZ = new Float64Array(3);
  readonly storm = { active: false, x: 0, z: 0, prevX: 0, prevZ: 0, radius: SURU.STORM_RADIUS, wx: 0, wz: 0 };
  readonly gust = { phase: 0, dirX: 1, dirZ: 0, offset: 0, width: SURU.GUST_WIDTH, phaseTick: 0, next: 0 };
  ringRadius: number = SURU.RING_R0;
  ringActive = false;

  // ---- siege ----
  readonly sieges: SiegeArcView[] = [];
  private readonly siegeStart = new Int32Array(FMAX * FMAX);
  private readonly siegeCover = new Float32Array(FMAX * FMAX);
  private readonly cascBird = new Uint16Array(N);
  private readonly cascTick = new Uint32Array(N);
  private readonly cascTo = new Uint8Array(N);
  private cascLen = 0;
  private readonly cascEnd = new Int32Array(FMAX);
  private readonly cascAttacker = new Uint8Array(FMAX);
  private readonly binCount = new Uint16Array(SURU.SIEGE_BINS);
  private readonly nearIdx = new Uint16Array(N);
  private readonly nearD = new Float32Array(N);
  private readonly ownerTally = new Uint16Array(FMAX);
  private readonly sortKeys = new Float64Array(N);

  // ---- conversion scratch ----
  private readonly wAcc = new Float64Array(FMAX);
  private readonly convMul = new Float64Array(FMAX);
  private readonly capR2 = new Float64Array(FMAX);
  private readonly waveAcc = new Float64Array(FMAX * FMAX * 3);
  /** per-bird adaptive neighbourhood radius² (≈ 7 topological neighbours) */
  private readonly topoR2 = new Float32Array(N).fill(4);

  // ---- rng streams ----
  private readonly rWild: Rng;
  private readonly rConv: Rng;
  private readonly rHawk: Rng;
  private readonly rGust: Rng;
  private readonly rStorm: Rng;
  private readonly rDrift: Rng;
  private readonly rSlot: Rng;

  private events: SuruEvent[] = [];
  private elimOrder = 0;
  private aliveCount = 0;

  constructor(options: SuruSimOptions) {
    this.opts = {
      seed: options.seed >>> 0,
      roundSec: options.roundSec ?? SURU.ROUND_SEC,
      hawks: options.hawks ?? true,
      storm: options.storm ?? true,
      gusts: options.gusts ?? true,
      ring: options.ring ?? true,
      freezeMotion: options.freezeMotion ?? false,
      conversion: options.conversion ?? true,
      capture: options.capture ?? true,
      lastStanding: options.lastStanding ?? true,
      wildWander: options.wildWander ?? true,
    };
    this.layout = options.layout ?? LAYOUT_SAZLIK;
    this.roundTicks = Math.round(this.opts.roundSec * HZ);
    const seed = this.opts.seed;
    this.rWild = new Rng(seed, RS_WILD);
    this.rConv = new Rng(seed, RS_CONV);
    this.rHawk = new Rng(seed, RS_HAWK);
    this.rGust = new Rng(seed, RS_GUST);
    this.rStorm = new Rng(seed, RS_STORM);
    this.rDrift = new Rng(seed, RS_DRIFT);
    this.rSlot = new Rng(seed, RS_SLOT);
    this.hash = new SpatialHash(SURU.HASH_HALF, SURU.CELL, N);
    this.siegeStart.fill(-1);
    this.group.fill(NO_GROUP);
    this.pendTo.fill(-1);
    this.flockNightGroup.fill(-1);
    this.flockElimTick.fill(-1);
    for (let f = 0; f < FMAX; f++) {
      this.sieges.push({ target: f, attacker: 0, coverage01: 0, hold01: 0, binsLo: 0, binsHi: 0, radius: 0, cascading: false, cascadeStartTick: 0 });
    }
    for (let k = 0; k < 3; k++) this.hawks.push({ phase: 0, x: 0, z: 0, prevX: 0, prevZ: 0, targetFlock: 0, phaseTick: 0 });

    if (options.custom) {
      this.flockCount = options.custom.flocks.length;
      this.spawnCustom(options.custom);
    } else {
      const fc = options.flockCount ?? 14;
      this.flockCount = Math.max(2, Math.min(SURU.MAX_FLOCKS, fc));
      this.spawnStandard();
    }
    this.prevX.set(this.posX);
    this.prevZ.set(this.posZ);
    this.leaderPrevX.set(this.leaderX);
    this.leaderPrevZ.set(this.leaderZ);
    this.recount(0);
    this.aliveCount = this.flockCount;
    for (let f = 1; f <= this.flockCount; f++) for (let k = 0; k < 8; k++) this.countHist[f * 8 + k] = this.flockCountArr[f];

    const rl = new Rng(seed, RS_LAYOUT);
    this.hawkNext = Math.round((SURU.HAWK_FIRST_SEC - SURU.HAWK_WARN_SEC) * HZ);
    this.gust.next = Math.round(rl.range(SURU.GUST_FIRST_MIN_SEC, SURU.GUST_FIRST_MAX_SEC) * HZ);
    this.events.push({ type: 'roundStart', tick: 0 });
  }

  get timeSec(): number {
    return this.tick / HZ;
  }

  // ======================================================================================
  // spawning
  // ======================================================================================

  private initFlock(f: number, x: number, z: number, hx: number, hz: number): void {
    const hl = Math.sqrt(hx * hx + hz * hz) || 1;
    hx /= hl;
    hz /= hl;
    this.leaderX[f] = x;
    this.leaderZ[f] = z;
    this.leaderHX[f] = hx;
    this.leaderHZ[f] = hz;
    this.leaderSpeed[f] = SURU.LEADER_SPEED * SURU.WIDE_SPEED_MUL;
    this.flockAlive[f] = 1;
    this.flockBreath[f] = SURU.BREATH_MAX;
    this.flockSpreadK[f] = SURU.R_K_WIDE;
    this.flockLagMul[f] = 1;
    this.flockLoneTick[f] = -1;
    // back-fill the trail with a straight approach so followers have targets from tick 0
    const sp = this.leaderSpeed[f] * DT;
    const base = f * TL * 2;
    for (let k = 0; k < TL; k++) {
      // index for tick t = -k (t ≤ 0): (−k) & mask
      const idx = (-k) & TL_MASK;
      this.trail[base + idx * 2] = x - hx * sp * k;
      this.trail[base + idx * 2 + 1] = z - hz * sp * k;
    }
  }

  private assignSlot(i: number, f: number): void {
    // low-discrepancy slot sequence per flock (golden / plastic ratio) → stable, evenly spread formation
    const k = this.flockJoin[f]++;
    let u = (k * 0.6180339887498949 + 0.5 * this.rSlot.next() / 64) % 1;
    if (u < 0) u += 1;
    const v = (k * 0.7548776662466927) % 1;
    const uq = Math.min(65535, Math.floor(u * 65536));
    const vq = Math.min(65535, Math.floor(v * 65536));
    this.rank[i] = uq;
    this.slotV[i] = vq;
    this.slotSqrt[i] = Math.sqrt((uq + 0.5) / 65536);
    const ti = vq >> 4; // 4096-entry table
    this.slotC[i] = COS_T[ti];
    this.slotS[i] = SIN_T[ti];
  }

  /** Place follower i at its formation target (spawn). */
  private placeAtSlot(i: number, f: number): void {
    const n = Math.max(1, this.countFollowersSlow(f)) + 1;
    const lagT = this.lagFor(n, 1) * HZ * ((this.rank[i] + 0.5) / 65536);
    const p = this.samplePrevTrail(f, lagT);
    const R = SURU.R_K_WIDE * Math.sqrt(n);
    const a = R * this.slotSqrt[i] * this.slotC[i];
    const b = R * this.slotSqrt[i] * this.slotS[i] * 0.5;
    const hx = this.leaderHX[f];
    const hz = this.leaderHZ[f];
    this.posX[i] = p.x + -hz * a + hx * b;
    this.posZ[i] = p.z + hx * a + hz * b;
    this.velX[i] = hx * this.leaderSpeed[f];
    this.velZ[i] = hz * this.leaderSpeed[f];
  }

  private readonly tmpP = { x: 0, z: 0 };
  private samplePrevTrail(f: number, lagT: number): { x: number; z: number } {
    const li = Math.floor(lagT);
    const fr = lagT - li;
    const base = f * TL * 2;
    const i0 = (this.tick - li) & TL_MASK;
    const i1 = (this.tick - li - 1) & TL_MASK;
    this.tmpP.x = this.trail[base + i0 * 2] * (1 - fr) + this.trail[base + i1 * 2] * fr;
    this.tmpP.z = this.trail[base + i0 * 2 + 1] * (1 - fr) + this.trail[base + i1 * 2 + 1] * fr;
    return this.tmpP;
  }

  private countFollowersSlow(f: number): number {
    let c = 0;
    for (let i = 0; i < N; i++) if (this.owner[i] === f) c++;
    return c;
  }

  private lagFor(size: number, mul: number): number {
    let L = SURU.LAG_K * Math.sqrt(size);
    if (L < SURU.LAG_MIN) L = SURU.LAG_MIN;
    if (L > SURU.LAG_MAX) L = SURU.LAG_MAX;
    return L * mul;
  }

  private spawnStandard(): void {
    const rl = new Rng(this.opts.seed, RS_LAYOUT);
    const F = this.flockCount;
    const lay = this.layout;
    const a0 = rl.next() * DET_TAU;
    // spawn slots around the bay; slot 0 = player. Flocks in SPAWN_FAR_FLOCKS take the slots farthest away.
    const slotOf = new Int32Array(F + 1);
    const taken = new Uint8Array(F);
    taken[0] = 1;
    slotOf[1] = 0;
    const far: number[] = [];
    for (let k = 1; k < F; k++) far.push(k);
    far.sort((p, q) => Math.min(q, F - q) - Math.min(p, F - p) || p - q);
    let fi = 0;
    for (const f of SURU.SPAWN_FAR_FLOCKS) {
      if (f > F) continue;
      slotOf[f] = far[fi];
      taken[far[fi]] = 1;
      fi++;
    }
    let nextSlot = 1;
    for (let f = 2; f <= F; f++) {
      if ((SURU.SPAWN_FAR_FLOCKS as readonly number[]).includes(f)) continue;
      while (taken[nextSlot]) nextSlot++;
      slotOf[f] = nextSlot;
      taken[nextSlot] = 1;
    }
    let next = 0;
    for (let f = 1; f <= F; f++) {
      const a = a0 + (slotOf[f] / F) * DET_TAU;
      const r = lay.spawnRadius * (0.92 + 0.16 * rl.next());
      const x = detSin(a) * r;
      const z = -detCos(a) * r;
      // heading: tangential with a slight inward bias → flocks start circling the bay
      const tx = detCos(a);
      const tz = detSin(a);
      const hx = tx * 0.8 - x / r * 0.6;
      const hz = tz * 0.8 - z / r * 0.6;
      this.initFlock(f, x, z, hx, hz);
      for (let k = 0; k < SURU.FOLLOWERS_AT_SPAWN; k++) {
        const i = next++;
        this.owner[i] = f;
        this.assignSlot(i, f);
      }
    }
    for (let i = 0; i < next; i++) this.placeAtSlot(i, this.owner[i]);
    // wild groups (5–30) — ~40 % around reed islets, the rest spread over the bay, away from spawns
    let remaining = N - next;
    let guard = 0;
    while (remaining > 0 && guard++ < 10000) {
      let size = rl.int(SURU.WILD_GROUP_MIN, SURU.WILD_GROUP_MAX);
      if (size > remaining) size = remaining;
      if (remaining - size > 0 && remaining - size < SURU.WILD_GROUP_MIN) size = remaining;
      let cx = 0;
      let cz = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        if (rl.next() < 0.4 && lay.islets.length > 0) {
          const isl = lay.islets[rl.int(0, lay.islets.length - 1)];
          const a = rl.next() * DET_TAU;
          const rr = isl.r + 6 + rl.next() * 34;
          cx = isl.x + detCos(a) * rr;
          cz = isl.z + detSin(a) * rr;
        } else {
          const a = rl.next() * DET_TAU;
          const rr = Math.sqrt(rl.next()) * 270;
          cx = detCos(a) * rr;
          cz = detSin(a) * rr;
        }
        if (this.spawnClear(cx, cz, 38)) break;
      }
      this.spawnWildGroup(cx, cz, size, next, rl);
      next += size;
      remaining -= size;
    }
  }

  private spawnClear(x: number, z: number, minD: number): boolean {
    if (x * x + z * z > 285 * 285) return false;
    for (let f = 1; f <= this.flockCount; f++) {
      const dx = this.leaderX[f] - x;
      const dz = this.leaderZ[f] - z;
      if (dx * dx + dz * dz < minD * minD) return false;
    }
    const lh = this.layout.lighthouse;
    const lx = lh.x - x;
    const lz = lh.z - z;
    if (lx * lx + lz * lz < 20 * 20) return false;
    return true;
  }

  private spawnWildGroup(cx: number, cz: number, size: number, first: number, rng: Rng): number {
    const g = this.allocGroup(cx, cz, 0);
    const spread = 1.4 * Math.sqrt(size) + 1.5;
    const th = this.gTheta[g];
    const vx = -SIN_T[th] * SURU.WILD_SPEED * 0.6;
    const vz = COS_T[th] * SURU.WILD_SPEED * 0.6;
    for (let k = 0; k < size; k++) {
      const i = first + k;
      const a = rng.next() * DET_TAU;
      const rr = Math.sqrt(rng.next()) * spread;
      this.owner[i] = 0;
      this.group[i] = g;
      this.posX[i] = cx + detCos(a) * rr;
      this.posZ[i] = cz + detSin(a) * rr;
      this.velX[i] = vx;
      this.velZ[i] = vz;
    }
    return g;
  }

  private spawnCustom(c: { flocks: FlockSpawnSpec[]; wild?: WildSpawnSpec[]; parkRadius?: number }): void {
    const rl = new Rng(this.opts.seed, RS_LAYOUT);
    let next = 0;
    for (let k = 0; k < c.flocks.length; k++) {
      const f = k + 1;
      const s = c.flocks[k];
      this.initFlock(f, s.x, s.z, s.hx, s.hz);
      const first = next;
      for (let m = 0; m < s.followers; m++) {
        const i = next++;
        this.owner[i] = f;
        this.assignSlot(i, f);
      }
      for (let m = 0; m < s.followers; m++) {
        const i = first + m;
        if (s.positions && s.positions[m]) {
          this.posX[i] = s.positions[m].x;
          this.posZ[i] = s.positions[m].z;
          this.velX[i] = this.leaderHX[f] * this.leaderSpeed[f];
          this.velZ[i] = this.leaderHZ[f] * this.leaderSpeed[f];
        } else this.placeAtSlot(i, f);
      }
    }
    if (c.wild) {
      for (const w of c.wild) {
        const size = Math.min(w.count, N - next);
        if (size <= 0) break;
        this.spawnWildGroup(w.x, w.z, size, next, rl);
        next += size;
      }
    }
    // park the remaining birds as wild groups along the far rim
    const park = c.parkRadius ?? 265;
    let remaining = N - next;
    let k = 0;
    while (remaining > 0) {
      const size = Math.min(25, remaining);
      const a = (k * 0.6180339887498949 % 1) * DET_TAU;
      this.spawnWildGroup(detSin(a) * park, -detCos(a) * park, size, next, rl);
      next += size;
      remaining -= size;
      k++;
    }
  }

  private allocGroup(ax: number, az: number, immuneUntil: number): number {
    let g = 0;
    while (g < G && this.gActive[g]) g++;
    if (g >= G) {
      // pool exhausted: reuse the smallest group (merging members is harmless)
      let best = 0;
      for (let k = 1; k < G; k++) if (this.gCount[k] < this.gCount[best]) best = k;
      g = best;
    }
    this.gActive[g] = 1;
    this.gAX[g] = ax;
    this.gAZ[g] = az;
    this.gTheta[g] = this.rWild.int(0, TRIG_N - 1);
    const dir = this.rWild.next() < 0.5 ? -1 : 1;
    this.gOmega[g] = dir * this.rWild.int(10, 22); // ≈ 0.46–1.0 rad/s
    this.gOrbit[g] = 7 + this.rWild.next() * 9;
    this.gImmune[g] = immuneUntil;
    this.gBlockOwner[g] = 0;
    this.gBlockUntil[g] = 0;
    this.gNextWander[g] = this.tick + Math.round(this.rWild.range(6, 14) * HZ);
    this.gCount[g] = 0;
    this.gCX[g] = ax;
    this.gCZ[g] = az;
    return g;
  }

  // ======================================================================================
  // test / scenario helpers (not used in normal play)
  // ======================================================================================

  /** Move a bird and set its owner (tests/scenarios). Keeps Σ ownership = N by construction. */
  debugSetBird(i: number, owner: number, x: number, z: number, vx = 0, vz = 0): void {
    if (this.owner[i] !== owner) {
      if (owner === 0 && this.group[i] === NO_GROUP) this.group[i] = this.allocGroup(x, z, 0);
      this.owner[i] = owner;
      if (owner !== 0) {
        this.assignSlot(i, owner);
        this.group[i] = NO_GROUP;
      }
    }
    this.posX[i] = x;
    this.posZ[i] = z;
    this.prevX[i] = x;
    this.prevZ[i] = z;
    this.velX[i] = vx;
    this.velZ[i] = vz;
  }

  debugSetLeader(f: number, x: number, z: number, hx: number, hz: number): void {
    this.leaderX[f] = x;
    this.leaderZ[f] = z;
    this.leaderPrevX[f] = x;
    this.leaderPrevZ[f] = z;
    const l = Math.sqrt(hx * hx + hz * hz) || 1;
    this.leaderHX[f] = hx / l;
    this.leaderHZ[f] = hz / l;
  }

  debugRecount(): void {
    this.recount(this.tick);
  }

  // ======================================================================================
  // public API
  // ======================================================================================

  flockRadius(f: number): number {
    const n = this.flockCountArr[f] + 1;
    return this.flockSpreadK[f] * Math.sqrt(n);
  }

  flockSize(f: number): number {
    return this.flockAlive[f] ? this.flockCountArr[f] + 1 : 0;
  }

  drainEvents(): SuruEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** Advance one 30 Hz tick with this tick's commands (humans and bots alike). */
  step(commands: readonly SuruCommand[]): void {
    if (this.roundOver) return;
    const T = this.tick;
    this.prevX.set(this.posX);
    this.prevZ.set(this.posZ);
    this.leaderPrevX.set(this.leaderX);
    this.leaderPrevZ.set(this.leaderZ);
    for (let k = 0; k < this.hawks.length; k++) {
      const hk = this.hawks[k];
      hk.prevX = hk.x;
      hk.prevZ = hk.z;
    }
    this.storm.prevX = this.storm.x;
    this.storm.prevZ = this.storm.z;
    const flags = this.flags;
    for (let i = 0; i < N; i++) flags[i] &= ~(FL_CHANGED | FL_FRONTIER | FL_NEAR_LEADER | FL_STORM | FL_OUTSIDE);

    for (let k = 0; k < commands.length; k++) this.applyCommand(commands[k]);

    this.timeline(T);
    this.updateLeaders(T);
    this.hash.build(this.posX, this.posZ, N, this.velX, this.velZ, this.owner);
    if (T % SURU.SIEGE_EVERY === 0) this.detectSieges(T);
    this.simulateBirds(T);
    this.applyConversions(T);
    if (this.opts.capture) this.wildCapture(T);
    this.updateHawk(T);
    this.driftRules(T);
    this.applyCascades(T);
    this.recount(T);
    this.updateGroups(T);
    this.updateLoneAndElimination(T);
    if (T % 6 === 5) this.flushWaves(T);
    if (T % 15 === 0) {
      for (let f = 1; f <= this.flockCount; f++) {
        const b = f * 8;
        for (let k = 7; k > 0; k--) this.countHist[b + k] = this.countHist[b + k - 1];
        this.countHist[b] = this.flockCountArr[f];
      }
    }
    this.tick = T + 1;
    if (this.tick >= this.roundTicks || (this.opts.lastStanding && this.aliveCount <= 1)) this.endRound();
  }

  private applyCommand(c: SuruCommand): void {
    const f = c.actorId;
    if (f < 1 || f > this.flockCount || !this.flockAlive[f]) return;
    if (c.cmd === 'steer') {
      let sx = c.args[0] | 0;
      let sz = c.args[1] | 0;
      if (sx > 127) sx = 127;
      if (sx < -127) sx = -127;
      if (sz > 127) sz = 127;
      if (sz < -127) sz = -127;
      this.flockSteerX[f] = sx;
      this.flockSteerZ[f] = sz;
    } else if (c.cmd === 'tight') {
      this.flockTightCmd[f] = c.args[0] ? 1 : 0;
    }
  }

  // ======================================================================================
  // timeline: hawk schedule, gusts, storm, sunset ring
  // ======================================================================================

  private timeline(T: number): void {
    // timeline state describes the end of this tick (the ring is exactly 110 m when the round ends)
    const t = (T + 1) / HZ;
    // sunset ring
    if (this.opts.ring) {
      const ts = SURU.RING_START_SEC;
      if (t >= ts) {
        if (!this.ringActive) {
          this.ringActive = true;
          this.events.push({ type: 'ringStart', tick: T, radius: SURU.RING_R0 });
        }
        const span = this.opts.roundSec - ts;
        let k = (t - ts) / span;
        if (k > 1) k = 1;
        this.ringRadius = SURU.RING_R0 + (SURU.RING_R1 - SURU.RING_R0) * k;
      }
    }
    // gusts
    if (this.opts.gusts) {
      const g = this.gust;
      if (g.phase === 0 && T >= g.next - SURU.GUST_WARN_SEC * HZ) {
        const ai = this.rGust.int(0, TRIG_N - 1);
        g.dirX = COS_T[ai];
        g.dirZ = SIN_T[ai];
        g.offset = this.rGust.range(-150, 150);
        g.phase = 1;
        g.phaseTick = T;
        this.events.push({ type: 'gustWarn', tick: T, dirX: g.dirX, dirZ: g.dirZ, offset: g.offset, width: g.width, startTick: g.next });
      } else if (g.phase === 1 && T >= g.next) {
        g.phase = 2;
        g.phaseTick = T;
        this.events.push({ type: 'gustStart', tick: T });
      } else if (g.phase === 2 && T >= g.next + SURU.GUST_DUR_SEC * HZ) {
        g.phase = 0;
        g.phaseTick = T;
        g.next = T + Math.round(this.rGust.range(SURU.GUST_EVERY_MIN_SEC, SURU.GUST_EVERY_MAX_SEC) * HZ);
        this.events.push({ type: 'gustEnd', tick: T });
      }
    }
    // storm
    if (this.opts.storm) {
      const s = this.storm;
      if (!s.active && T === Math.round(SURU.STORM_SPAWN_SEC * HZ)) {
        const a = this.rStorm.next() * DET_TAU;
        s.x = detSin(a) * 230;
        s.z = -detCos(a) * 230;
        s.prevX = s.x;
        s.prevZ = s.z;
        s.active = true;
        this.pickStormWaypoint();
        this.events.push({ type: 'stormSpawn', tick: T, x: s.x, z: s.z, radius: s.radius });
      }
      if (s.active && !this.opts.freezeMotion) {
        let dx = s.wx - s.x;
        let dz = s.wz - s.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < 8) this.pickStormWaypoint();
        else {
          dx /= d;
          dz /= d;
          s.x += dx * SURU.STORM_SPEED * DT;
          s.z += dz * SURU.STORM_SPEED * DT;
        }
      }
    }
  }

  private pickStormWaypoint(): void {
    const s = this.storm;
    const a = this.rStorm.next() * DET_TAU;
    const r = 40 + this.rStorm.next() * 160;
    s.wx = detSin(a) * r;
    s.wz = -detCos(a) * r;
  }

  private inGust(x: number, z: number): boolean {
    const g = this.gust;
    if (g.phase !== 2) return false;
    // band: |dot(p, n) − offset| ≤ width/2 where n ⟂ dir
    const s = -x * g.dirZ + z * g.dirX - g.offset;
    if (s > g.width * 0.5 || s < -g.width * 0.5) return false;
    const rocks = this.layout.rocks;
    for (let k = 0; k < rocks.length; k++) {
      const rx = x - rocks[k].x;
      const rz = z - rocks[k].z;
      const along = rx * g.dirX + rz * g.dirZ;
      if (along <= 0 || along > SURU.ROCK_SHADOW_LEN) continue;
      const lat = -rx * g.dirZ + rz * g.dirX;
      if (lat < rocks[k].r && lat > -rocks[k].r) return false; // wind shadow behind the rock
    }
    return true;
  }

  // ======================================================================================
  // leaders
  // ======================================================================================

  private updateLeaders(T: number): void {
    const F = this.flockCount;
    const R = this.ringActive ? this.ringRadius : SURU.ARENA_RADIUS;
    const lh = this.layout.lighthouse;
    const frozen = this.opts.freezeMotion;
    for (let f = 1; f <= F; f++) {
      if (!this.flockAlive[f]) continue;
      const size = this.flockCountArr[f] + 1;
      const sx0 = this.leaderX[f];
      const sz0 = this.leaderZ[f];
      // storm membership (leader inside → no breath regen)
      let inStorm = 0;
      if (this.storm.active) {
        const dx = sx0 - this.storm.x;
        const dz = sz0 - this.storm.z;
        if (dx * dx + dz * dz < this.storm.radius * this.storm.radius) inStorm = 1;
      }
      this.flockInStorm[f] = inStorm;
      // breath economy (§2): Tight −14/s, otherwise +22/s; breathless until 25
      let tight = this.flockTightCmd[f] === 1 && this.flockBreathless[f] === 0;
      let b = this.flockBreath[f];
      if (tight) {
        b -= SURU.BREATH_DRAIN * DT;
        if (b <= 0) {
          b = 0;
          this.flockBreathless[f] = 1;
          tight = false;
          this.events.push({ type: 'breathless', tick: T, flock: f });
        }
      } else if (!inStorm) {
        b += SURU.BREATH_REGEN * DT;
        if (b > SURU.BREATH_MAX) b = SURU.BREATH_MAX;
        if (this.flockBreathless[f] && b >= SURU.BREATH_UNLOCK) this.flockBreathless[f] = 0;
      }
      this.flockBreath[f] = b;
      this.flockMode[f] = tight ? 1 : 0;
      // formation easing
      const kT = tight ? SURU.R_K_TIGHT : SURU.R_K_WIDE;
      this.flockSpreadK[f] += (kT - this.flockSpreadK[f]) * FORM_EASE;
      const lT = tight ? SURU.LAG_TIGHT_MUL : 1;
      this.flockLagMul[f] += (lT - this.flockLagMul[f]) * FORM_EASE;
      // speed
      let target = SURU.LEADER_SPEED * (tight ? SURU.TIGHT_SPEED_MUL : SURU.WIDE_SPEED_MUL);
      if (this.flockLone[f] && T - this.flockLoneTick[f] < SURU.LONE_SEC * HZ) target *= SURU.LONE_SPEED_MUL;
      let sp = this.leaderSpeed[f];
      const dv = target - sp;
      const maxDv = 10 * DT;
      sp += dv > maxDv ? maxDv : dv < -maxDv ? -maxDv : dv;
      this.leaderSpeed[f] = sp;
      // steering
      let hx = this.leaderHX[f];
      let hz = this.leaderHZ[f];
      let dx = hx;
      let dz = hz;
      const sx = this.flockSteerX[f];
      const sz = this.flockSteerZ[f];
      if (sx !== 0 || sz !== 0) {
        const l = Math.sqrt(sx * sx + sz * sz);
        dx = sx / l;
        dz = sz / l;
      }
      // arena / sunset ring: soft inward push (leaders are never walled, they are guided)
      const rl = Math.sqrt(sx0 * sx0 + sz0 * sz0);
      const edge = R - 22;
      if (rl > edge && rl > 1) {
        let w = (rl - edge) / 30;
        if (w > 1) w = 1;
        w *= SURU.RING_PUSH;
        dx = dx * (1 - w) - (sx0 / rl) * w;
        dz = dz * (1 - w) - (sz0 / rl) * w;
        const l = Math.sqrt(dx * dx + dz * dz) || 1;
        dx /= l;
        dz /= l;
      }
      // lighthouse is a flow obstacle: deflect tangentially when heading into it
      {
        const ox = lh.x - sx0;
        const oz = lh.z - sz0;
        const od = Math.sqrt(ox * ox + oz * oz);
        const avoidR = SURU.LIGHTHOUSE_R + 14;
        if (od < avoidR && od > 0.01 && ox * dx + oz * dz > 0) {
          const side = ox * dz - oz * dx >= 0 ? 1 : -1;
          const tx = side * oz / od;
          const tz = -side * ox / od;
          const w = 1 - od / avoidR;
          dx = dx * (1 - w) + tx * w;
          dz = dz * (1 - w) + tz * w;
          const l = Math.sqrt(dx * dx + dz * dz) || 1;
          dx /= l;
          dz /= l;
        }
      }
      // turn toward desired with ω = 140°/s · clamp(√(20/N), 0.35, 1)
      let tf = Math.sqrt(SURU.TURN_REF_N / size);
      if (tf < SURU.TURN_MIN_F) tf = SURU.TURN_MIN_F;
      if (tf > SURU.TURN_MAX_F) tf = SURU.TURN_MAX_F;
      const maxTurn = SURU.TURN_BASE * tf * DT;
      const cross = hx * dz - hz * dx;
      const dot = hx * dx + hz * dz;
      let ang = detAtan2(cross, dot);
      if (ang > maxTurn) ang = maxTurn;
      else if (ang < -maxTurn) ang = -maxTurn;
      if (ang !== 0) {
        const c = detCos(ang);
        const s = detSin(ang);
        const nx = hx * c - hz * s;
        const nz = hx * s + hz * c;
        hx = nx;
        hz = nz;
      }
      const hl = Math.sqrt(hx * hx + hz * hz) || 1;
      hx /= hl;
      hz /= hl;
      this.leaderHX[f] = hx;
      this.leaderHZ[f] = hz;
      if (!frozen) {
        let nx = sx0 + hx * sp * DT;
        let nz = sz0 + hz * sp * DT;
        if (this.inGust(sx0, sz0)) {
          nx += this.gust.dirX * SURU.GUST_SPEED * DT;
          nz += this.gust.dirZ * SURU.GUST_SPEED * DT;
        }
        // hard limit far outside (never a wall inside the play area)
        const r2 = Math.sqrt(nx * nx + nz * nz);
        const lim = R + 30;
        if (r2 > lim) {
          nx *= lim / r2;
          nz *= lim / r2;
        }
        this.leaderX[f] = nx;
        this.leaderZ[f] = nz;
      }
      const base = f * TL * 2 + (T & TL_MASK) * 2;
      this.trail[base] = this.leaderX[f];
      this.trail[base + 1] = this.leaderZ[f];
      // per-flock follower parameters for this tick
      this.lagTicks[f] = this.lagFor(size, this.flockLagMul[f]) * HZ;
      this.rLat[f] = this.flockSpreadK[f] * Math.sqrt(size);
      this.maxSpd[f] = sp * SURU.FOLLOWER_SPEED_MUL;
    }
  }

  // ======================================================================================
  // fused per-bird pass: neighbour scan (≤32 candidates, 6 m) → separation, topological alignment/
  // cohesion (7), formation goal, contact-conversion weights (frontier only), wild-capture contacts,
  // integration. Neighbour data is read from the hash's cell-sorted pre-move copies, so updating
  // positions in place keeps Jacobi semantics; ownership changes are deferred to the end of the tick.
  // ======================================================================================

  private simulateBirds(T: number): void {
    const hash = this.hash;
    const sorted = hash.sorted;
    const sx = hash.sortedX;
    const sz = hash.sortedZ;
    const svx = hash.sortedVX;
    const svz = hash.sortedVZ;
    const so = hash.sortedO;
    const rs = this.rangeS;
    const re = this.rangeE;
    const px = this.posX;
    const pz = this.posZ;
    const vx = this.velX;
    const vz = this.velZ;
    const owner = this.owner;
    const flags = this.flags;
    const trail = this.trail;
    const topoR2 = this.topoR2;
    const K = SURU.TOPO_K;
    const R2 = SURU.CONV_R * SURU.CONV_R;
    const invR2 = 1 / R2;
    const nl2 = SURU.CONV_NEAR_LEADER_R * SURU.CONV_NEAR_LEADER_R;
    const frozen = this.opts.freezeMotion;
    const doConv = this.opts.conversion;
    const doCap = this.opts.capture;
    const storm = this.storm;
    const stormOn = storm.active;
    const stormX = storm.x;
    const stormZ = storm.z;
    const stormR2 = storm.radius * storm.radius;
    const lh = this.layout.lighthouse;
    const lhX = lh.x;
    const lhZ = lh.z;
    const lhR = SURU.LIGHTHOUSE_R + 3;
    // diving hawks (up to 3) → startle swirl around each
    let nDive = 0;
    const hdx = this.hawkDiveX;
    const hdz = this.hawkDiveZ;
    for (let k = 0; k < this.hawks.length; k++) {
      const h = this.hawks[k];
      if (h.phase === 2) {
        hdx[nDive] = h.x;
        hdz[nDive] = h.z;
        nDive++;
      }
    }
    const hawkDive = nDive > 0;
    const gustOn = this.gust.phase === 2;
    const maxA = SURU.MAX_ACCEL;
    const sepW = SURU.W_SEP * 28;
    const aliW = SURU.W_ALI * 1.2;
    const cohW = SURU.W_COH * 0.6;
    const tgtW = SURU.W_TARGET * 4.0;
    const ringR = this.ringActive ? this.ringRadius : 1e9;
    const ringR2 = ringR * ringR;
    const flockMode = this.flockMode;
    const rank = this.rank;
    const slotSqrt = this.slotSqrt;
    const slotC = this.slotC;
    const slotS = this.slotS;
    const lagTicks = this.lagTicks;
    const rLat = this.rLat;
    const maxSpd = this.maxSpd;
    const leaderSpeed = this.leaderSpeed;
    const leaderHX = this.leaderHX;
    const leaderHZ = this.leaderHZ;
    const lX = this.leaderX;
    const lZ = this.leaderZ;
    const group = this.group;
    const gLX = this.gLX;
    const gLZ = this.gLZ;
    const gImmune = this.gImmune;
    const capF = this.gCapF;
    const capD = this.gCapD;
    const convMul = this.convMul;
    const capR2 = this.capR2;
    const w = this.wAcc;
    const pend = this.pendTo;
    const catch2 = SURU.CATCHUP_DIST * SURU.CATCHUP_DIST;
    const lim = SURU.HASH_HALF - 1;
    const F = this.flockCount;
    // per-flock multipliers for this tick
    for (let f = 0; f <= F; f++) {
      const tight = f !== 0 && flockMode[f] === 1 && this.flockBreathless[f] === 0;
      convMul[f] = tight ? SURU.CONV_TIGHT_W : 1;
      const cr = flockMode[f] === 1 ? SURU.CAPTURE_CONTACT_TIGHT : SURU.CAPTURE_CONTACT_WIDE;
      capR2[f] = this.flockAlive[f] && f !== 0 ? cr * cr : -1;
    }
    capF.fill(0);
    capD.fill(1e18);
    this.pendCount = 0;
    // per-bird contact weight in sorted order: Tight ×1.6, within 12 m of own leader ×1.3, wild 0
    const sW = this.sortW;
    for (let q = 0; q < N; q++) {
      const oq = so[q];
      if (oq === 0) {
        sW[q] = 0;
        continue;
      }
      let ww = convMul[oq];
      const ldx = sx[q] - lX[oq];
      const ldz = sz[q] - lZ[oq];
      if (ldx * ldx + ldz * ldz <= nl2) ww *= SURU.CONV_NEAR_LEADER_W;
      sW[q] = ww;
    }

    // iterate in cell-sorted order (cache locality); RNG draws follow this deterministic order
    for (let qi = 0; qi < N; qi++) {
      const i = sorted[qi];
      const x = sx[qi];
      const z = sz[qi];
      const o = so[qi];
      const isF = o !== 0;
      // --- neighbour scan ---
      let sepR2 = SURU.SEP_R_WIDE * SURU.SEP_R_WIDE;
      let sepR: number = SURU.SEP_R_WIDE;
      if (isF && flockMode[o] === 1) {
        sepR = SURU.SEP_R_TIGHT;
        sepR2 = sepR * sepR;
      }
      let g = NO_GROUP;
      let capOK = false;
      if (!isF) {
        g = group[i];
        capOK = doCap && g !== NO_GROUP && gImmune[g] <= T;
      }
      const nr = hash.cellRanges(x, z, rs, re);
      const rot = (i * 7 + T) & 0xff;
      // contact conversion is evaluated at 15 Hz per bird (parity-staggered, probability for 2·Δt):
      // conversion ticks scan up to 32 candidates, movement-only ticks up to 20 (nearest cells first)
      const convTick = ((i + T) & 1) === 0;
      const cap = convTick ? CAP : CAP_MOVE;
      const isFC = isF && convTick;
      let n = 0;
      let tn = 0;
      const r7 = topoR2[i];
      let avx = 0;
      let avz = 0;
      let apx = 0;
      let apz = 0;
      let sxs = 0;
      let szs = 0;
      let frontier = false;
      let mask = 0;
      let wOwn = 0;
      let blockOwner = 0;
      let blockActive = false;
      if (capOK) {
        blockOwner = this.gBlockOwner[g];
        blockActive = this.gBlockUntil[g] > T;
      }
      for (let r = 0; r < nr && n < cap; r++) {
        const s0 = rs[r];
        const e0 = re[r];
        const len = e0 - s0;
        let p = s0 + ((rot * len) >>> 8);
        for (let t = 0; t < len; t++) {
          const q = p;
          if (++p >= e0) p = s0;
          const dx = x - sx[q];
          const dz = z - sz[q];
          const d2 = dx * dx + dz * dz;
          if (d2 >= R2 || q === qi) continue;
          n++;
          const oj = so[q];
          if (d2 < sepR2 && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const ww = (1 - d / sepR) / d;
            sxs += dx * ww;
            szs += dz * ww;
          }
          if (oj === o) {
            // topological neighbourhood (~7): same-owner birds inside this bird's adaptive radius
            if (d2 < r7) {
              avx += svx[q];
              avz += svz[q];
              apx += sx[q];
              apz += sz[q];
              tn++;
            }
            if (isFC) {
              // own-owner contact weight kept in a scalar (the common case)
              const kq = 1 - d2 * invR2;
              wOwn += kq * kq * sW[q];
            }
          } else if (oj !== 0) {
            if (isFC) {
              frontier = true;
              // contact weight: poly6-like kernel × per-bird multiplier (Tight ×1.6, near own leader ×1.3)
              const kq = 1 - d2 * invR2;
              const kw = kq * kq * sW[q];
              const bit = 1 << oj;
              if ((mask & bit) === 0) {
                mask |= bit;
                w[oj] = kw;
              } else w[oj] += kw;
            } else if (isF) {
              frontier = true;
            } else if (capOK && d2 < capR2[oj] && !(oj === blockOwner && blockActive)) {
              if (d2 < capD[g] || (d2 === capD[g] && oj < capF[g])) {
                capD[g] = d2;
                capF[g] = oj;
              }
            }
          }
          if (n >= cap) break;
        }
      }
      // --- contact conversion decision (frontier followers only; applied at tick end) ---
      if (frontier) {
        flags[i] |= FL_FRONTIER;
        if (isFC && doConv && (flags[i] & FL_CASCADE) === 0) {
          mask |= 1 << o;
          w[o] = wOwn + sW[qi];
          let sum = 0;
          let m = 0;
          let wm = -1;
          for (let f = 1; f <= F; f++) {
            if ((mask & (1 << f)) === 0) continue;
            const wf = w[f];
            sum += wf;
            if (wf > wm) {
              wm = wf;
              m = f;
            }
          }
          // a flock that is being encircled (cascading) cannot win birds back
          if (m !== o && sum > 0 && this.flockCascading[m] === 0) {
            const share = wm / sum;
            if (share >= SURU.CONV_SHARE) {
              const lambda = SURU.CONV_RATE * (share - 0.5);
              const pc = 1 - detExp(-lambda * 2 * DT);
              if (this.rConv.next() < pc) {
                pend[i] = m;
                this.pendCount++;
              }
            }
          }
        }
      }
      if (frozen) continue;
      // --- steering ---
      let ax = 0;
      let az = 0;
      let inStorm = false;
      let sepMul = 1;
      if (stormOn) {
        const sdx = x - stormX;
        const sdz = z - stormZ;
        if (sdx * sdx + sdz * sdz < stormR2) {
          inStorm = true;
          sepMul = SURU.STORM_SEP_MUL;
          flags[i] |= FL_STORM;
        }
      }
      ax += sxs * sepW * sepMul;
      az += szs * sepW * sepMul;
      // adapt the radius so ≈ 7 neighbours stay inside (starlings' topological interaction count)
      if (tn > K) topoR2[i] = r7 * 0.82 > 0.04 ? r7 * 0.82 : 0.04;
      else if (tn < K) topoR2[i] = r7 * 1.22 < R2 ? r7 * 1.22 : R2;
      if (tn > 0) {
        const inv = 1 / tn;
        ax += (avx * inv - vx[i]) * aliW + (apx * inv - x) * cohW;
        az += (avz * inv - vz[i]) * aliW + (apz * inv - z) * cohW;
      }
      let maxSpeed: number;
      if (isF) {
        // follower: leader trail point at lag + slot offset rotated into the trail frame (§4.G.10)
        const lag = lagTicks[o] * ((rank[i] + 0.5) * (1 / 65536));
        const li = lag | 0;
        const fr = lag - li;
        const tb = o * TL * 2;
        const i0 = tb + ((T - li) & TL_MASK) * 2;
        const i1 = tb + ((T - li - 1) & TL_MASK) * 2;
        const p0x = trail[i0];
        const p0z = trail[i0 + 1];
        const p1x = trail[i1];
        const p1z = trail[i1 + 1];
        const tpx = p0x + (p1x - p0x) * fr;
        const tpz = p0z + (p1z - p0z) * fr;
        let fx = p0x - p1x;
        let fz = p0z - p1z;
        const fl = Math.sqrt(fx * fx + fz * fz);
        const tvx = fx * HZ;
        const tvz = fz * HZ;
        if (fl > 1e-4) {
          const ifl = 1 / fl;
          fx *= ifl;
          fz *= ifl;
        } else {
          fx = leaderHX[o];
          fz = leaderHZ[o];
        }
        const R = rLat[o] * slotSqrt[i];
        const a = R * slotC[i];
        const b = R * slotS[i] * 0.5;
        const ex = tpx - fz * a + fx * b - x;
        const ez = tpz + fx * a + fz * b - z;
        let dvx = tvx + ex * 1.2;
        let dvz = tvz + ez * 1.2;
        maxSpeed = maxSpd[o];
        if (ex * ex + ez * ez > catch2) maxSpeed = leaderSpeed[o] * SURU.CATCHUP_SPEED_MUL;
        const dl2 = dvx * dvx + dvz * dvz;
        if (dl2 > maxSpeed * maxSpeed) {
          const k = maxSpeed / Math.sqrt(dl2);
          dvx *= k;
          dvz *= k;
        }
        ax += (dvx - vx[i]) * tgtW;
        az += (dvz - vz[i]) * tgtW;
      } else {
        // wild: loiter around the group's moving orbit point
        let ex = 0;
        let ez = 0;
        if (g !== NO_GROUP) {
          ex = gLX[g] - x;
          ez = gLZ[g] - z;
        }
        const el = Math.sqrt(ex * ex + ez * ez);
        let sp: number = SURU.WILD_SPEED;
        if (el < 10) sp *= 0.55 + 0.045 * el;
        if (el > 1e-4) {
          ex *= sp / el;
          ez *= sp / el;
        }
        ax += (ex - vx[i]) * 1.6;
        az += (ez - vz[i]) * 1.6;
        maxSpeed = (flags[i] & FL_SCATTERED) !== 0 ? 15 : SURU.WILD_SPEED * 1.5;
        const rr2 = x * x + z * z;
        if (rr2 > ringR2) {
          const rr = Math.sqrt(rr2);
          ax -= (x / rr) * 4;
          az -= (z / rr) * 4;
        }
      }
      // --- hazards ---
      if (inStorm) {
        ax += (this.rStorm.next() - 0.5) * 2 * SURU.STORM_NUDGE * 3;
        az += (this.rStorm.next() - 0.5) * 2 * SURU.STORM_NUDGE * 3;
      }
      if (hawkDive) {
        for (let k = 0; k < nDive; k++) {
          const hx = x - hdx[k];
          const hz = z - hdz[k];
          const h2 = hx * hx + hz * hz;
          if (h2 < 100 && h2 > 1e-4) {
            const hd = Math.sqrt(h2);
            const ww = (SURU.W_FLEE * 10 * (1 - hd / 10)) / hd;
            ax += (hx - hz * 0.6) * ww;
            az += (hz + hx * 0.6) * ww;
          }
        }
      }
      {
        const ox = x - lhX;
        const oz = z - lhZ;
        const o2 = ox * ox + oz * oz;
        if (o2 < lhR * lhR && o2 > 1e-4) {
          const od = Math.sqrt(o2);
          const ww = ((lhR - od) * 12) / od;
          ax += ox * ww;
          az += oz * ww;
        }
      }
      // --- integrate ---
      const al2 = ax * ax + az * az;
      if (al2 > maxA * maxA) {
        const k = maxA / Math.sqrt(al2);
        ax *= k;
        az *= k;
      }
      let nvx = vx[i] + ax * DT;
      let nvz = vz[i] + az * DT;
      const sl2 = nvx * nvx + nvz * nvz;
      if (sl2 > maxSpeed * maxSpeed) {
        const k = maxSpeed / Math.sqrt(sl2);
        nvx *= k;
        nvz *= k;
      }
      vx[i] = nvx;
      vz[i] = nvz;
      let nx = x + nvx * DT;
      let nz = z + nvz * DT;
      if (gustOn && this.inGust(x, z)) {
        nx += this.gust.dirX * SURU.GUST_SPEED * DT;
        nz += this.gust.dirZ * SURU.GUST_SPEED * DT;
      }
      px[i] = nx > lim ? lim : nx < -lim ? -lim : nx;
      pz[i] = nz > lim ? lim : nz < -lim ? -lim : nz;
    }
  }

  /** Apply deferred contact conversions (order-independent: decided on the start-of-tick state). */
  private applyConversions(T: number): void {
    if (this.pendCount === 0) return;
    const pend = this.pendTo;
    const owner = this.owner;
    for (let i = 0; i < N; i++) {
      const to = pend[i];
      if (to < 0) continue;
      pend[i] = -1;
      const from = owner[i];
      this.transfer(i, to, T);
      this.flockConverted[to]++;
      const wb = (from * FMAX + to) * 3;
      this.waveAcc[wb] += 1;
      this.waveAcc[wb + 1] += this.posX[i];
      this.waveAcc[wb + 2] += this.posZ[i];
    }
    this.pendCount = 0;
  }

  private transfer(i: number, to: number, T: number): void {
    this.owner[i] = to;
    this.lastConv[i] = T > 0 ? T : 1;
    this.flags[i] |= FL_CHANGED;
    if (to !== 0) {
      this.assignSlot(i, to);
      this.group[i] = NO_GROUP;
      this.flags[i] &= ~FL_SCATTERED;
    }
  }

  private flushWaves(T: number): void {
    const acc = this.waveAcc;
    for (let a = 1; a <= this.flockCount; a++) {
      for (let b = 1; b <= this.flockCount; b++) {
        const k = (a * FMAX + b) * 3;
        const c = acc[k];
        if (c > 0) {
          this.events.push({ type: 'convertWave', tick: T, from: a, to: b, count: c, x: acc[k + 1] / c, z: acc[k + 2] / c });
          acc[k] = 0;
          acc[k + 1] = 0;
          acc[k + 2] = 0;
        }
      }
    }
  }

  // ======================================================================================
  // wild capture (group joins as a whole): contact hits come from the fused pass, plus the
  // §2 rule "group centre within r_f + 4 m of the leader"
  // ======================================================================================

  private wildCapture(T: number): void {
    const owner = this.owner;
    const group = this.group;
    const capF = this.gCapF;
    const capD = this.gCapD;
    let any = false;
    for (let g = 0; g < G; g++) if (capF[g] !== 0) any = true;
    // group centre within r_f + 4 m of the leader (§2)
    for (let g = 0; g < G; g++) {
      if (!this.gActive[g] || this.gCount[g] === 0 || this.gImmune[g] > T) continue;
      const cx = this.gCX[g];
      const cz = this.gCZ[g];
      for (let f = 1; f <= this.flockCount; f++) {
        if (!this.flockAlive[f]) continue;
        if (f === this.gBlockOwner[g] && this.gBlockUntil[g] > T) continue;
        const r = this.flockRadius(f) + SURU.CAPTURE_PAD;
        const dx = this.leaderX[f] - cx;
        const dz = this.leaderZ[f] - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r && (d2 < capD[g] || (d2 === capD[g] && f < capF[g]))) {
          capD[g] = d2;
          capF[g] = f;
          any = true;
        }
      }
    }
    if (!any) return;
    const acc = this.capAcc;
    acc.fill(0);
    for (let i = 0; i < N; i++) {
      if (owner[i] !== 0) continue;
      const g = group[i];
      if (g === NO_GROUP) continue;
      const f = capF[g];
      if (f === 0) continue;
      acc[g * 3] += 1;
      acc[g * 3 + 1] += this.posX[i];
      acc[g * 3 + 2] += this.posZ[i];
      this.transfer(i, f, T);
    }
    for (let g = 0; g < G; g++) {
      const f = capF[g];
      if (f === 0) continue;
      const c = acc[g * 3];
      if (c > 0) {
        this.flockWild[f] += c;
        this.events.push({ type: 'capture', tick: T, flock: f, count: c, x: acc[g * 3 + 1] / c, z: acc[g * 3 + 2] / c });
      }
      this.gActive[g] = 0;
      this.gCount[g] = 0;
    }
  }

  // ======================================================================================
  // hawk (§2 timing/fractions; §4.G targeting: largest flock's edge bird). Nobody is harmed.
  // ======================================================================================

  private largestFlock(): number {
    let best = 0;
    let bc = -1;
    for (let f = 1; f <= this.flockCount; f++) {
      if (!this.flockAlive[f]) continue;
      const c = this.flockCountArr[f];
      if (c > bc) {
        bc = c;
        best = f;
      }
    }
    return bc >= SURU.HAWK_MIN_FOLLOWERS ? best : 0;
  }

  /**
   * Exposed edge bird of flock f (§4.G: the largest flock's edge bird, in sight): among followers within
   * 28 m of the leader, the one farthest from the flight axis on the hawk's side `dir`. Keeping the strike near
   * the leader keeps the 2 s shadow warning where the owner is looking.
   */
  private edgeBird(f: number, dx0: number, dz0: number): number {
    const lx = this.leaderX[f];
    const lz = this.leaderZ[f];
    const hx = this.leaderHX[f];
    const hz = this.leaderHZ[f];
    let best = -1;
    let bd = -1e18;
    let fallback = -1;
    let fd = 1e18;
    for (let i = 0; i < N; i++) {
      if (this.owner[i] !== f) continue;
      const dx = this.posX[i] - lx;
      const dz = this.posZ[i] - lz;
      const d2 = dx * dx + dz * dz;
      if (d2 < fd) {
        fd = d2;
        fallback = i;
      }
      if (d2 > 28 * 28) continue;
      const lat = -dx * hz + dz * hx; // signed distance from the flight axis
      const side = dx * dx0 + dz * dz0;
      const sc = lat * lat + 4 * side;
      if (sc > bd) {
        bd = sc;
        best = i;
      }
    }
    return best >= 0 ? best : fallback;
  }

  /**
   * Hawk waves: first arrival 0:40, then every 30 ± 5 s (§2). 1–3 hawks per wave (§4.G) — the count grows
   * with the largest flock (≥ 220 → 2, ≥ 420 → 3); all target the largest flock from different sides.
   */
  private updateHawk(T: number): void {
    if (!this.opts.hawks) return;
    const warnTicks = Math.round(SURU.HAWK_WARN_SEC * HZ);
    let anyActive = false;
    for (let k = 0; k < this.hawks.length; k++) if (this.hawks[k].phase !== 0) anyActive = true;
    if (!anyActive && T >= this.hawkNext) {
      const f = this.largestFlock();
      if (f === 0) {
        this.hawkNext = T + 5 * HZ;
      } else {
        const n = this.flockCountArr[f];
        const count = 1 + (n >= SURU.HAWK_2_AT ? 1 : 0) + (n >= SURU.HAWK_3_AT ? 1 : 0);
        this.hawkWave++;
        for (let k = 0; k < count; k++) {
          const hk = this.hawks[k];
          hk.phase = 4; // scheduled
          hk.phaseTick = T + k * SURU.HAWK_STAGGER_TICKS;
          hk.targetFlock = f;
        }
      }
    }
    for (let k = 0; k < this.hawks.length; k++) this.updateOneHawk(T, k, warnTicks);
  }

  private updateOneHawk(T: number, k: number, warnTicks: number): void {
    const hk = this.hawks[k];
    if (hk.phase === 0) return;
    const f = hk.targetFlock;
    if (hk.phase === 4) {
      if (T < hk.phaseTick) return;
      if (!this.flockAlive[f] || this.flockCountArr[f] === 0) {
        hk.phase = 0;
        return;
      }
      // side of attack: the flock's flank (alternating left/right per wave), rotated 120° per extra hawk
      const a = DET_PI * 0.5 * (this.hawkWave & 1 ? 1 : -1) + (k * DET_TAU) / 3;
      const c = detCos(a);
      const s = detSin(a);
      const hx = this.leaderHX[f];
      const hz = this.leaderHZ[f];
      this.hawkSideX[k] = hx * c - hz * s;
      this.hawkSideZ[k] = hx * s + hz * c;
      this.hawkTarget[k] = this.edgeBird(f, this.hawkSideX[k], this.hawkSideZ[k]);
      const b = this.hawkTarget[k];
      hk.phase = 1;
      hk.phaseTick = T;
      // the hawk circles high above; its shadow on the water is the warning
      hk.x = b >= 0 ? this.posX[b] : this.leaderX[f];
      hk.z = b >= 0 ? this.posZ[b] : this.leaderZ[f];
      hk.prevX = hk.x;
      hk.prevZ = hk.z;
      this.events.push({ type: 'hawkWarn', tick: T, hawk: k, target: f, x: hk.x, z: hk.z });
      return;
    }
    if (hk.phase === 1) {
      if (!this.flockAlive[f] || this.flockCountArr[f] === 0) {
        hk.phase = 3;
        hk.phaseTick = T;
        return;
      }
      if ((T - hk.phaseTick) % 6 === 0) this.hawkTarget[k] = this.edgeBird(f, this.hawkSideX[k], this.hawkSideZ[k]);
      const b = this.hawkTarget[k];
      if (b >= 0) {
        // shadow glides toward the predicted strike point
        const tx = this.posX[b] + this.velX[b] * 0.6;
        const tz = this.posZ[b] + this.velZ[b] * 0.6;
        hk.x += (tx - hk.x) * 0.18;
        hk.z += (tz - hk.z) * 0.18;
      }
      if (T - hk.phaseTick >= warnTicks) {
        hk.phase = 2;
        hk.phaseTick = T;
        if (k === 0) this.hawkDiveTick = T;
        const back = 46;
        this.hawkDirX[k] = -this.hawkSideX[k];
        this.hawkDirZ[k] = -this.hawkSideZ[k];
        hk.x -= this.hawkDirX[k] * back;
        hk.z -= this.hawkDirZ[k] * back;
        hk.prevX = hk.x;
        hk.prevZ = hk.z;
        this.events.push({ type: 'hawkDive', tick: T, hawk: k, target: f, x: hk.x, z: hk.z });
      }
      return;
    }
    if (hk.phase === 2) {
      let b = this.hawkTarget[k];
      if (b < 0 || this.owner[b] !== f) {
        b = this.edgeBird(f, this.hawkSideX[k], this.hawkSideZ[k]);
        this.hawkTarget[k] = b;
      }
      let strike = T - hk.phaseTick >= SURU.HAWK_MAX_DIVE_SEC * HZ || b < 0;
      if (b >= 0) {
        const dx0 = this.posX[b] - hk.x;
        const dz0 = this.posZ[b] - hk.z;
        const d0 = Math.sqrt(dx0 * dx0 + dz0 * dz0);
        const lead = d0 / SURU.HAWK_SPEED;
        let dx = this.posX[b] + this.velX[b] * lead - hk.x;
        let dz = this.posZ[b] + this.velZ[b] * lead - hk.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const step = SURU.HAWK_SPEED * DT;
        if (d0 <= SURU.HAWK_STRIKE_R || d <= step) {
          hk.x = this.posX[b];
          hk.z = this.posZ[b];
          strike = true;
        } else {
          dx /= d;
          dz /= d;
          hk.x += dx * step;
          hk.z += dz * step;
          this.hawkDirX[k] = dx;
          this.hawkDirZ[k] = dz;
        }
      }
      if (strike) {
        if (this.flockAlive[f] && this.flockCountArr[f] > 0) this.hawkScatter(T, f, k);
        hk.phase = 3;
        hk.phaseTick = T;
      }
      return;
    }
    // phase 3: leaving
    hk.x += this.hawkDirX[k] * SURU.HAWK_SPEED * 0.8 * DT;
    hk.z += this.hawkDirZ[k] * SURU.HAWK_SPEED * 0.8 * DT;
    if (T - hk.phaseTick >= 2 * HZ) {
      hk.phase = 0;
      hk.phaseTick = T;
      if (k === 0) {
        // next wave arrives 30 ± 5 s after this dive; hawkNext is the first warning (2 s earlier)
        const gap = Math.round(this.rHawk.range(SURU.HAWK_EVERY_SEC - SURU.HAWK_JITTER_SEC, SURU.HAWK_EVERY_SEC + SURU.HAWK_JITTER_SEC) * HZ);
        this.hawkNext = Math.max(T + 1, this.hawkDiveTick + gap - warnTicks);
      }
    }
  }

  private hawkScatter(T: number, f: number, k: number): void {
    const hk = this.hawks[k];
    const n = this.flockCountArr[f];
    let frac = this.rHawk.range(SURU.HAWK_FRAC_MIN, SURU.HAWK_FRAC_MAX);
    if (this.flockMode[f] === 1) frac *= SURU.HAWK_TIGHT_MUL; // "Sıkı Dizi" halves the scatter (counter-play)
    let count = Math.round(frac * n);
    if (count < 1) count = 1;
    if (count > n) count = n;
    // nearest `count` followers to the strike point (they are the exposed edge)
    let m = 0;
    const keys = this.sortKeys;
    for (let i = 0; i < N; i++) {
      if (this.owner[i] !== f) continue;
      const dx = this.posX[i] - hk.x;
      const dz = this.posZ[i] - hk.z;
      keys[m++] = Math.floor((dx * dx + dz * dz) * 64) * 2048 + i;
    }
    const sub = keys.subarray(0, m);
    sub.sort();
    // away from the owner: from the leader through the strike point; land 40 m beyond the flock edge
    let ox = hk.x - this.leaderX[f];
    let oz = hk.z - this.leaderZ[f];
    let ol = Math.sqrt(ox * ox + oz * oz);
    if (ol < 1e-3) {
      ox = this.hawkDirX[k];
      oz = this.hawkDirZ[k];
      ol = Math.sqrt(ox * ox + oz * oz) || 1;
    }
    ox /= ol;
    oz /= ol;
    const reach = this.flockRadius(f) + SURU.HAWK_SCATTER_DIST;
    let ax = this.leaderX[f] + ox * reach;
    let az = this.leaderZ[f] + oz * reach;
    const ar = Math.sqrt(ax * ax + az * az);
    const lim = (this.ringActive ? this.ringRadius : SURU.ARENA_RADIUS) - 15;
    if (ar > lim) {
      ax *= lim / ar;
      az *= lim / ar;
    }
    const g = this.allocGroup(ax, az, 0);
    this.gBlockOwner[g] = f;
    this.gBlockUntil[g] = T + Math.round(SURU.SCATTER_OWNER_IMMUNE_SEC * HZ);
    let sx = 0;
    let sz = 0;
    for (let q = 0; q < count; q++) {
      const i = sub[q] % 2048;
      this.owner[i] = 0;
      this.group[i] = g;
      this.lastConv[i] = T > 0 ? T : 1;
      this.flags[i] |= FL_CHANGED | FL_SCATTERED;
      // startle: burst outward with a swirl (girdap), never harmed
      const rx = this.posX[i] - hk.x;
      const rz = this.posZ[i] - hk.z;
      const rl = Math.sqrt(rx * rx + rz * rz) || 1;
      const ux = rx / rl;
      const uz = rz / rl;
      this.velX[i] = (ux * 0.6 + ox * 0.8 - uz * 0.7) * 12;
      this.velZ[i] = (uz * 0.6 + oz * 0.8 + ux * 0.7) * 12;
      sx += this.posX[i];
      sz += this.posZ[i];
    }
    this.events.push({ type: 'hawkScatter', tick: T, hawk: k, flock: f, count, x: sx / count, z: sz / count });
  }

  // ======================================================================================
  // storm & night drift (followers become wild; they keep living)
  // ======================================================================================

  private driftRules(T: number): void {
    const stormOn = this.storm.active;
    const night = this.ringActive;
    if (!stormOn && !night) return;
    const pStorm = SURU.STORM_SCATTER_PER_SEC * DT;
    const pNight = SURU.NIGHT_DRIFT_PER_SEC * DT;
    const R2 = this.ringRadius * this.ringRadius;
    const owner = this.owner;
    const flags = this.flags;
    for (let i = 0; i < N; i++) {
      const o = owner[i];
      if (o === 0 || (flags[i] & (FL_CHANGED | FL_CASCADE)) !== 0) continue;
      const x = this.posX[i];
      const z = this.posZ[i];
      if (stormOn && (flags[i] & FL_STORM) !== 0) {
        if (this.rDrift.next() < pStorm) {
          let g = this.flockStormGroup[o];
          if (g < 0 || T - this.flockStormGroupTick[o] > HZ || !this.gActive[g]) {
            g = this.allocGroup(this.storm.x, this.storm.z, 0);
            this.gBlockOwner[g] = o;
            this.gBlockUntil[g] = T + Math.round(SURU.SCATTER_OWNER_IMMUNE_SEC * HZ);
            this.flockStormGroup[o] = g;
            this.flockStormGroupTick[o] = T;
          }
          this.toWild(i, g, T);
          continue;
        }
      }
      if (night && x * x + z * z > R2) {
        flags[i] |= FL_OUTSIDE;
        if (this.rDrift.next() < pNight) {
          let g = this.flockNightGroup[o];
          if (g < 0 || T - this.flockNightGroupTick[o] > HZ || !this.gActive[g]) {
            const r = Math.sqrt(x * x + z * z) || 1;
            g = this.allocGroup(x / r * (this.ringRadius - 25), z / r * (this.ringRadius - 25), 0);
            this.gBlockOwner[g] = o;
            this.gBlockUntil[g] = T + Math.round(SURU.SCATTER_OWNER_IMMUNE_SEC * HZ);
            this.flockNightGroup[o] = g;
            this.flockNightGroupTick[o] = T;
          }
          this.toWild(i, g, T);
        }
      }
    }
  }

  private toWild(i: number, g: number, T: number): void {
    this.owner[i] = 0;
    this.group[i] = g;
    this.lastConv[i] = T > 0 ? T : 1;
    this.flags[i] |= FL_CHANGED | FL_SCATTERED;
  }

  // ======================================================================================
  // KUŞATMA (10 Hz): ring coverage around the target leader (36 × 10° bins)
  // ======================================================================================

  private detectSieges(T: number): void {
    const F = this.flockCount;
    const hash = this.hash;
    const holdTicks = Math.round(SURU.SIEGE_HOLD_SEC * HZ);
    const R40 = SURU.SIEGE_CAND_R;
    const nearIdx = this.nearIdx;
    const nearD = this.nearD;
    const tally = this.ownerTally;
    for (let b = 1; b <= F; b++) {
      const view = this.sieges[b];
      view.attacker = 0;
      view.coverage01 = 0;
      view.hold01 = 0;
      view.binsLo = 0;
      view.binsHi = 0;
      if (this.flockCascading[b]) {
        view.cascading = true;
        view.attacker = this.cascAttacker[b];
        view.coverage01 = 1;
        view.hold01 = 1;
        view.binsLo = 0x3ffff;
        view.binsHi = 0x3ffff;
        continue;
      }
      view.cascading = false;
      if (!this.flockAlive[b] || this.flockCountArr[b] === 0) {
        for (let a = 1; a <= F; a++) this.siegeStart[a * FMAX + b] = -1;
        continue;
      }
      const lx = this.leaderX[b];
      const lz = this.leaderZ[b];
      // gather all birds within 40 m of B's leader
      const nn = hash.query(lx, lz, R40, -1, N, nearIdx, nearD, 0);
      tally.fill(0);
      for (let k = 0; k < nn; k++) tally[this.owner[nearIdx[k]]]++;
      const nB = this.flockCountArr[b];
      const RB = this.flockRadius(b);
      let rmin = SURU.SIEGE_RING_MIN_REL * RB;
      if (rmin < SURU.SIEGE_RING_MIN_ABS) rmin = SURU.SIEGE_RING_MIN_ABS;
      const rmin2 = rmin * rmin;
      const rmax2 = SURU.SIEGE_RING_MAX * SURU.SIEGE_RING_MAX;
      let bestA = 0;
      let bestCover = 0;
      let bestLo = 0;
      let bestHi = 0;
      let bestR = 0;
      for (let a = 1; a <= F; a++) {
        const key = a * FMAX + b;
        if (a === b || !this.flockAlive[a] || tally[a] < SURU.SIEGE_CAND_MIN || this.flockSiegeCooldown[a] > T) {
          this.siegeStart[key] = -1;
          continue;
        }
        this.binCount.fill(0);
        let ringBirds = 0;
        let rSum = 0;
        for (let k = 0; k < nn; k++) {
          const i = nearIdx[k];
          if (this.owner[i] !== a) continue;
          const d2 = nearD[k];
          if (d2 < rmin2 || d2 > rmax2) continue;
          const ang = detAtan2(this.posZ[i] - lz, this.posX[i] - lx);
          let bin = Math.floor(((ang + DET_PI) / DET_TAU) * SURU.SIEGE_BINS);
          if (bin >= SURU.SIEGE_BINS) bin = SURU.SIEGE_BINS - 1;
          if (bin < 0) bin = 0;
          this.binCount[bin]++;
          ringBirds++;
          rSum += Math.sqrt(d2);
        }
        let full = 0;
        let lo = 0;
        let hi = 0;
        for (let k = 0; k < SURU.SIEGE_BINS; k++) {
          if (this.binCount[k] >= SURU.SIEGE_BIN_MIN) {
            full++;
            if (k < 18) lo |= 1 << k;
            else hi |= 1 << (k - 18);
          }
        }
        const meanR = ringBirds > 0 ? rSum / ringBirds : 0;
        let ok = full >= SURU.SIEGE_COVER_BINS && ringBirds >= SURU.SIEGE_RING_BIRDS_MIN;
        if (ok) {
          // ≥ 70 % of B's followers inside the A ring's mean radius
          const mr2 = meanR * meanR;
          let inside = 0;
          for (let i = 0; i < N; i++) {
            if (this.owner[i] !== b) continue;
            const dx = this.posX[i] - lx;
            const dz = this.posZ[i] - lz;
            if (dx * dx + dz * dz <= mr2) inside++;
          }
          ok = inside >= SURU.SIEGE_INSIDE_FRAC * nB;
        }
        const cover = full / SURU.SIEGE_COVER_BINS;
        this.siegeCover[key] = cover;
        if (ok) {
          if (this.siegeStart[key] < 0) this.siegeStart[key] = T;
        } else this.siegeStart[key] = -1;
        const held = this.siegeStart[key] >= 0 ? T - this.siegeStart[key] : -1;
        if (cover > bestCover || (cover === bestCover && a < bestA)) {
          bestCover = cover;
          bestA = a;
          bestLo = lo;
          bestHi = hi;
          bestR = meanR;
          view.hold01 = held >= 0 ? Math.min(1, held / holdTicks) : 0;
        }
        if (held >= holdTicks) {
          this.startCascade(T, a, b);
          bestA = a;
          bestCover = 1;
          view.cascading = true;
          view.hold01 = 1;
          break;
        }
      }
      view.attacker = bestA;
      view.coverage01 = bestCover > 1 ? 1 : bestCover;
      view.binsLo = bestLo;
      view.binsHi = bestHi;
      view.radius = bestR;
      if (bestA !== 0 && bestCover >= 0.5 && T % 15 === 0) {
        this.events.push({ type: 'siegeProgress', tick: T, attacker: bestA, target: b, coverage: bestCover });
      }
    }
  }

  private startCascade(T: number, a: number, b: number): void {
    const lx = this.leaderX[b];
    const lz = this.leaderZ[b];
    // outside → in by distance (deterministic schedule t_k = 1.5·k/N_B, k = 1..N_B)
    let m = 0;
    const keys = this.sortKeys;
    for (let i = 0; i < N; i++) {
      if (this.owner[i] !== b) continue;
      const dx = this.posX[i] - lx;
      const dz = this.posZ[i] - lz;
      // descending distance → sort ascending on (maxKey − d)
      const dq = Math.floor(Math.sqrt(dx * dx + dz * dz) * 256);
      keys[m++] = (1048575 - Math.min(1048575, dq)) * 2048 + i;
    }
    const sub = keys.subarray(0, m);
    sub.sort();
    const casTicks = SURU.SIEGE_CASCADE_SEC * HZ;
    for (let k = 0; k < m; k++) {
      const i = sub[k] % 2048;
      const e = this.cascLen++;
      this.cascBird[e] = i;
      this.cascTick[e] = T + Math.round((casTicks * (k + 1)) / m);
      this.cascTo[e] = a;
      this.flags[i] |= FL_CASCADE;
    }
    this.flockCascading[b] = 1;
    this.cascAttacker[b] = a;
    this.cascEnd[b] = T + casTicks;
    const sv = this.sieges[b];
    sv.cascadeStartTick = T;
    for (let x = 1; x <= this.flockCount; x++) this.siegeStart[x * FMAX + b] = -1;
    this.flockSieges[a]++;
    // S-14: the encircling effort costs all the attacker's breath and blocks a new siege for 6 s
    this.flockBreath[a] = 0;
    this.flockBreathless[a] = 1;
    this.flockSiegeCooldown[a] = T + Math.round(SURU.SIEGE_COOLDOWN_SEC * HZ);
    this.events.push({ type: 'siege', tick: T, attacker: a, target: b, count: m, x: lx, z: lz });
  }

  private applyCascades(T: number): void {
    if (this.cascLen === 0) return;
    let w = 0;
    for (let e = 0; e < this.cascLen; e++) {
      const i = this.cascBird[e];
      const due = this.cascTick[e];
      const to = this.cascTo[e];
      if (due <= T) {
        this.flags[i] &= ~FL_CASCADE;
        const from = this.owner[i];
        if (from !== 0 && from !== to && this.flockAlive[to]) {
          this.transfer(i, to, T);
          this.flockConverted[to]++;
        }
      } else {
        this.cascBird[w] = i;
        this.cascTick[w] = due;
        this.cascTo[w] = to;
        w++;
      }
    }
    this.cascLen = w;
    for (let b = 1; b <= this.flockCount; b++) {
      if (this.flockCascading[b] && T >= this.cascEnd[b]) {
        this.flockCascading[b] = 0;
        this.sieges[b].cascading = false;
        this.events.push({ type: 'siegeComplete', tick: T, attacker: this.cascAttacker[b], target: b });
      }
    }
  }

  // ======================================================================================
  // bookkeeping
  // ======================================================================================

  private recount(T: number): void {
    const cnt = this.flockCountArr;
    cnt.fill(0);
    const cx = this.cenX;
    const cz = this.cenZ;
    cx.fill(0);
    cz.fill(0);
    const gc = this.gCount;
    gc.fill(0);
    const gx = this.gCX;
    const gz = this.gCZ;
    // group centroids accumulate in Float64 scratch (re-using wAcc would alias) → use local sums in gCX/gCZ via two passes
    for (let g = 0; g < G; g++) {
      gx[g] = 0;
      gz[g] = 0;
    }
    for (let i = 0; i < N; i++) {
      const o = this.owner[i];
      if (o !== 0) {
        cnt[o]++;
        cx[o] += this.posX[i];
        cz[o] += this.posZ[i];
      } else {
        const g = this.group[i];
        if (g !== NO_GROUP) {
          gc[g]++;
          gx[g] += this.posX[i];
          gz[g] += this.posZ[i];
        }
      }
    }
    for (let f = 1; f <= this.flockCount; f++) {
      if (cnt[f] > 0) {
        cx[f] /= cnt[f];
        cz[f] /= cnt[f];
      } else {
        cx[f] = this.leaderX[f];
        cz[f] = this.leaderZ[f];
      }
      const size = this.flockAlive[f] ? cnt[f] + 1 : 0;
      if (size > this.flockPeak[f]) this.flockPeak[f] = size;
    }
    for (let g = 0; g < G; g++) {
      if (gc[g] > 0) {
        gx[g] /= gc[g];
        gz[g] /= gc[g];
      } else if (this.gActive[g]) {
        this.gActive[g] = 0;
      }
    }
    void T;
  }

  private updateGroups(T: number): void {
    const R = (this.ringActive ? this.ringRadius : SURU.ARENA_RADIUS) - 20;
    const isl = this.layout.islets;
    for (let g = 0; g < G; g++) {
      if (!this.gActive[g]) continue;
      // wander: anchors drift between reed islets and open water
      if (T >= this.gNextWander[g] && this.opts.wildWander) {
        this.gNextWander[g] = T + Math.round(this.rWild.range(7, 15) * HZ);
        let nx: number;
        let nz: number;
        if ((this.gCount[g] < SURU.WILD_GROUP_MIN || this.rWild.next() < 0.35) && isl.length > 0) {
          // stragglers regroup at the nearest reed islet ("yabani kuşların yeniden doğduğu yer")
          let best = 0;
          let bd = 1e18;
          for (let k = 0; k < isl.length; k++) {
            const dx = isl[k].x - this.gCX[g];
            const dz = isl[k].z - this.gCZ[g];
            const d2 = dx * dx + dz * dz;
            if (d2 < bd) {
              bd = d2;
              best = k;
            }
          }
          const a = this.rWild.next() * DET_TAU;
          const rr = isl[best].r + 8 + this.rWild.next() * 20;
          nx = isl[best].x + detCos(a) * rr;
          nz = isl[best].z + detSin(a) * rr;
        } else {
          const a = this.rWild.next() * DET_TAU;
          const rr = 15 + this.rWild.next() * 45;
          nx = this.gAX[g] + detCos(a) * rr;
          nz = this.gAZ[g] + detSin(a) * rr;
        }
        this.gAX[g] = nx;
        this.gAZ[g] = nz;
      }
      // keep anchors inside the arena / sunset ring
      const ar = Math.sqrt(this.gAX[g] * this.gAX[g] + this.gAZ[g] * this.gAZ[g]);
      if (ar > R && ar > 0) {
        this.gAX[g] *= R / ar;
        this.gAZ[g] *= R / ar;
      }
      // orbit point (loiter)
      if (!this.opts.freezeMotion) this.gTheta[g] = (this.gTheta[g] + this.gOmega[g] + TRIG_N) & (TRIG_N - 1);
      const th = this.gTheta[g];
      // anchor eases so that new anchors are approached smoothly
      this.gLX[g] = this.gAX[g] + COS_T[th] * this.gOrbit[g];
      this.gLZ[g] = this.gAZ[g] + SIN_T[th] * this.gOrbit[g];
    }
    // merge nearby groups (≤ 30 members) every 0.5 s
    if (T % 15 === 7) {
      const md2 = SURU.GROUP_MERGE_DIST * SURU.GROUP_MERGE_DIST;
      for (let a = 0; a < G; a++) {
        if (!this.gActive[a] || this.gImmune[a] > T || this.gBlockUntil[a] > T) continue;
        for (let b = a + 1; b < G; b++) {
          if (!this.gActive[b] || this.gImmune[b] > T || this.gBlockUntil[b] > T) continue;
          if (this.gCount[a] + this.gCount[b] > SURU.WILD_GROUP_MAX) continue;
          const dx = this.gCX[a] - this.gCX[b];
          const dz = this.gCZ[a] - this.gCZ[b];
          if (dx * dx + dz * dz > md2) continue;
          for (let i = 0; i < N; i++) if (this.owner[i] === 0 && this.group[i] === b) this.group[i] = a;
          this.gCount[a] += this.gCount[b];
          this.gCount[b] = 0;
          this.gActive[b] = 0;
        }
      }
    }
    // clear scatter flag after immunity
    if (T % 10 === 0) {
      for (let i = 0; i < N; i++) {
        if ((this.flags[i] & FL_SCATTERED) === 0) continue;
        const g = this.group[i];
        if (this.owner[i] !== 0 || g === NO_GROUP || this.gImmune[g] <= T) this.flags[i] &= ~FL_SCATTERED;
      }
    }
  }

  private updateLoneAndElimination(T: number): void {
    let alive = 0;
    for (let f = 1; f <= this.flockCount; f++) {
      if (!this.flockAlive[f]) continue;
      const c = this.flockCountArr[f];
      if (c === 0 && !this.flockLone[f] && !this.flockCascading[f]) {
        this.flockLone[f] = 1;
        this.flockLoneTick[f] = T;
        this.events.push({ type: 'lone', tick: T, flock: f });
      } else if (c > 0 && this.flockLone[f]) {
        this.flockLone[f] = 0;
        this.flockLoneTick[f] = -1;
        this.events.push({ type: 'recovered', tick: T, flock: f });
      }
      if (this.flockLone[f]) {
        const dt = T - this.flockLoneTick[f];
        if (dt >= SURU.LONE_SEC * HZ) {
          this.eliminate(T, f, 0);
          continue;
        }
        if (dt >= SURU.LONE_GRACE_SEC * HZ) {
          const by = this.coreTouch(f);
          if (by !== 0) {
            this.eliminate(T, f, by);
            continue;
          }
        }
      }
      alive++;
    }
    this.aliveCount = alive;
  }

  /** Enemy core touching a lone leader: enemy leader ≤ 3 m, or ≥ 8 birds of one enemy flock within 4 m. */
  private coreTouch(f: number): number {
    const lx = this.leaderX[f];
    const lz = this.leaderZ[f];
    const lr2 = SURU.CORE_LEADER_R * SURU.CORE_LEADER_R;
    for (let e = 1; e <= this.flockCount; e++) {
      if (e === f || !this.flockAlive[e]) continue;
      const dx = this.leaderX[e] - lx;
      const dz = this.leaderZ[e] - lz;
      if (dx * dx + dz * dz <= lr2) return e;
    }
    const nn = this.hash.query(lx, lz, SURU.CORE_R, -1, 256, this.nearIdx, this.nearD, 0);
    const tally = this.ownerTally;
    tally.fill(0);
    let best = 0;
    for (let k = 0; k < nn; k++) {
      const o = this.owner[this.nearIdx[k]];
      if (o === 0 || o === f) continue;
      tally[o]++;
      if (tally[o] >= SURU.CORE_BIRDS && best === 0) best = o;
    }
    return best;
  }

  private eliminate(T: number, f: number, by: number): void {
    this.flockAlive[f] = 0;
    this.flockLone[f] = 0;
    this.flockElimTick[f] = T;
    this.flockMode[f] = 0;
    let aliveAfter = 0;
    for (let k = 1; k <= this.flockCount; k++) if (this.flockAlive[k]) aliveAfter++;
    this.flockPlace[f] = aliveAfter + 1;
    this.elimOrder++;
    this.events.push({ type: 'eliminated', tick: T, flock: f, by, place: aliveAfter + 1, x: this.leaderX[f], z: this.leaderZ[f] });
  }

  private endRound(): void {
    this.roundOver = true;
    const order: number[] = [];
    for (let f = 1; f <= this.flockCount; f++) if (this.flockAlive[f]) order.push(f);
    order.sort((a, b) => {
      const sa = this.flockCountArr[a];
      const sb = this.flockCountArr[b];
      if (sa !== sb) return sb - sa;
      if (this.flockPeak[a] !== this.flockPeak[b]) return this.flockPeak[b] - this.flockPeak[a];
      return a - b;
    });
    for (let k = 0; k < order.length; k++) this.flockPlace[order[k]] = k + 1;
    this.winner = order.length > 0 ? order[0] : 0;
    this.events.push({ type: 'roundEnd', tick: this.tick, winner: this.winner });
  }

  /** League points for a finishing place + sieges (§2.6). */
  static leaguePoints(place: number, sieges: number): number {
    const t = SURU.LP_TABLE;
    const base = place >= 1 && place <= t.length ? t[place - 1] : t[t.length - 1];
    return base + Math.min(SURU.LP_SIEGE_CAP, sieges * SURU.LP_SIEGE);
  }

  stats(): FlockStats[] {
    const out: FlockStats[] = [];
    for (let f = 1; f <= this.flockCount; f++) {
      const elim = this.flockElimTick[f] >= 0;
      const place = this.flockPlace[f] || 0;
      out.push({
        flock: f,
        rank: place,
        size: this.flockSize(f),
        peakSize: this.flockPeak[f],
        converted: this.flockConverted[f],
        wildCollected: this.flockWild[f],
        sieges: this.flockSieges[f],
        survivalSec: (elim ? this.flockElimTick[f] : this.tick) / HZ,
        eliminated: elim,
        lp: place > 0 ? SuruSim.leaguePoints(place, this.flockSieges[f]) : 0,
      });
    }
    return out;
  }

  /** Conservation check: Σ ownership over the pool (must always equal N). */
  ownershipSum(): number {
    let s = 0;
    const c = new Uint32Array(FMAX);
    for (let i = 0; i < N; i++) c[this.owner[i]]++;
    for (let f = 0; f < FMAX; f++) s += c[f];
    return s;
  }

  /** FNV-1a over quantised state (positions 1/64 m, velocities 1/64 m/s, owners, leaders, breath, RNG). */
  hashState(): number {
    let h = 0x811c9dc5;
    const mix = (v: number): void => {
      h ^= v & 0xff;
      h = Math.imul(h, 0x01000193);
      h ^= (v >>> 8) & 0xff;
      h = Math.imul(h, 0x01000193);
      h ^= (v >>> 16) & 0xff;
      h = Math.imul(h, 0x01000193);
      h ^= (v >>> 24) & 0xff;
      h = Math.imul(h, 0x01000193);
    };
    mix(this.tick);
    for (let i = 0; i < N; i++) {
      mix(Math.round(this.posX[i] * 64));
      mix(Math.round(this.posZ[i] * 64));
      mix(Math.round(this.velX[i] * 64));
      mix(Math.round(this.velZ[i] * 64));
      mix(this.owner[i] | (this.group[i] << 8));
    }
    for (let f = 1; f <= this.flockCount; f++) {
      mix(Math.round(this.leaderX[f] * 64));
      mix(Math.round(this.leaderZ[f] * 64));
      mix(Math.round(this.leaderHX[f] * 65536));
      mix(Math.round(this.leaderHZ[f] * 65536));
      mix(Math.round(this.flockBreath[f] * 64));
      mix(this.flockAlive[f] | (this.flockMode[f] << 1) | (this.flockLone[f] << 2));
    }
    const st: number[] = [0, 0, 0, 0];
    for (const r of [this.rConv, this.rWild, this.rHawk, this.rDrift]) {
      r.state(st, 0);
      mix(st[0]);
      mix(st[1]);
    }
    return h >>> 0;
  }

  /** Compact online-style summary (§4.G.11). Allocates — call at UI/network rate, not per bird. */
  snapshot(): SuruSnapshot {
    const flocks: FlockSnapshot[] = [];
    for (let f = 1; f <= this.flockCount; f++) {
      flocks.push({
        id: f,
        alive: this.flockAlive[f] === 1,
        lone: this.flockLone[f] === 1,
        x: this.leaderX[f],
        z: this.leaderZ[f],
        hx: this.leaderHX[f],
        hz: this.leaderHZ[f],
        speed: this.leaderSpeed[f],
        tight: this.flockMode[f] === 1,
        breath: this.flockBreath[f],
        breathless: this.flockBreathless[f] === 1,
        size: this.flockSize(f),
        peak: this.flockPeak[f],
      });
    }
    const grid = new Uint8Array(32 * 32);
    const tallies = new Uint16Array(32 * 32 * FMAX);
    for (let i = 0; i < N; i++) {
      const o = this.owner[i];
      if (o === 0) continue;
      let gx = Math.floor((this.posX[i] + SURU.HASH_HALF) / 20);
      let gz = Math.floor((this.posZ[i] + SURU.HASH_HALF) / 20);
      gx = gx < 0 ? 0 : gx > 31 ? 31 : gx;
      gz = gz < 0 ? 0 : gz > 31 ? 31 : gz;
      tallies[(gz * 32 + gx) * FMAX + o]++;
    }
    for (let c = 0; c < 1024; c++) {
      let best = 0;
      let bc = 0;
      for (let f = 1; f < FMAX; f++) {
        const v = tallies[c * FMAX + f];
        if (v > bc) {
          bc = v;
          best = f;
        }
      }
      grid[c] = best;
    }
    const hawks: { x: number; z: number; phase: number; target: number }[] = [];
    for (const hk of this.hawks) if (hk.phase > 0 && hk.phase < 4) hawks.push({ x: hk.x, z: hk.z, phase: hk.phase, target: hk.targetFlock });
    return {
      tick: this.tick,
      timeSec: this.timeSec,
      ringRadius: this.ringRadius,
      ringActive: this.ringActive,
      flocks,
      ownerGrid: grid,
      hawks,
      storm: { active: this.storm.active, x: this.storm.x, z: this.storm.z, radius: this.storm.radius },
      gust: { phase: this.gust.phase, dirX: this.gust.dirX, dirZ: this.gust.dirZ, offset: this.gust.offset, width: this.gust.width },
      hash: this.hashState(),
    };
  }
}

