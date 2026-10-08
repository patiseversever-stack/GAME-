// SÜRÜ.io bots: utility AI (§4.G.10) producing exactly the same commands a human produces
// ({tick, actorId, cmd: 'steer' | 'tight', args}). Bots never read the player's input; they see the
// same public sim state and obey the same physics. Deterministic (seeded RNG + detMath only), so
// AI-vs-AI rounds replay bit-identically on V8 and JSC.

import { SURU } from '../sim/config.ts';
import { detCos, detExp, detSin } from '../sim/detMath.ts';
import { Rng } from '../sim/rng.ts';
import type { SuruSim } from '../sim/SuruSim.ts';
import type { SuruCommand } from '../sim/types.ts';
import { LEAGUE_SCALE, PERSONALITIES } from './personalities.ts';

/**
 * "Ortalama oyuncu" (average human) profile for balance tests: a sensible all-rounder with human pacing —
 * 300 ms reaction, ±10° steering noise, ~4 Hz decisions, rarely sieges on purpose, decent breath control.
 */
const AVERAGE_HUMAN: LeagueScale = { reactionAddMs: 0, noiseDeg: 10, ringMul: 0.35, decisionTicks: 7, mistake: 0.08, breathReserve: 10, hawkResponse: 0.5, skill: 1.0, defend: 0.7 };
const AVERAGE_PERSONALITY: Personality = { id: 'toplayici', name: { tr: 'Ortalama oyuncu', en: 'Average player' }, greed: 1.2, aggr: 0.9, courage: 0.6, ring: 0.5, opp: 0.5, reactionMs: 300 };
import type { League, LeagueScale, Personality, PersonalityId } from './personalities.ts';

/** utility = §4.G utility AI · average = "ortalama oyuncu" balance bot · sleep = FTUE target (circles in place) · idle = no input */
export type BotPolicy = 'utility' | 'average' | 'sleep' | 'idle';

export interface BotSpec {
  flock: number;
  personality: PersonalityId;
  league: League;
  policy?: BotPolicy;
}

const A_NONE = -1;
const A_COLLECT = 0;
const A_ATTACK = 1;
const A_SIEGE = 2;
const A_FLEE = 3;
const A_CENTER = 4;
const A_OPP = 5;

export const BOT_ACTION_NAMES = ['collect', 'attack', 'siege', 'flee', 'center', 'opportunity'] as const;

const HYSTERESIS = 0.15;
const COMMIT_TICKS = SURU.TICK_HZ; // ≥ 1 s commitment
const Q = 32;
const DEG = 0.017453292519943295;

class Bot {
  readonly flock: number;
  readonly pers: Personality;
  readonly scale: LeagueScale;
  readonly policy: BotPolicy;
  readonly rng: Rng;
  readonly reactionTicks: number;
  readonly interval: number;
  action = A_NONE;
  target = -1;
  actionTick = -1000;
  nextDecision: number;
  orbitSign = 1;
  tightOn = false;
  hawkSeen = -1;
  hawkTight = false;
  siegeBest = 0;
  bannedTarget = -1;
  bannedUntil = 0;
  // reaction-delay queue (ring buffer)
  readonly qTick = new Int32Array(Q);
  readonly qSX = new Int16Array(Q);
  readonly qSZ = new Int16Array(Q);
  readonly qTight = new Int8Array(Q);
  qHead = 0;
  qLen = 0;
  lastSX = 0;
  lastSZ = 0;
  lastTight = -1;

  constructor(spec: BotSpec, seed: number, index: number) {
    this.flock = spec.flock;
    this.policy = spec.policy ?? 'utility';
    this.pers = this.policy === 'average' ? AVERAGE_PERSONALITY : PERSONALITIES[spec.personality];
    this.scale = this.policy === 'average' ? AVERAGE_HUMAN : LEAGUE_SCALE[spec.league];
    this.rng = new Rng(seed, 1000 + spec.flock);
    let rt = this.pers.reactionMs + this.scale.reactionAddMs;
    if (rt < 60) rt = 60;
    this.reactionTicks = Math.round((rt / 1000) * SURU.TICK_HZ);
    this.interval = this.scale.decisionTicks;
    // stagger decisions across bots (5 Hz ≈ tick % 6 by flock index)
    this.nextDecision = (index * 2 + spec.flock) % this.interval;
  }
}

export interface BotDebug {
  flock: number;
  action: string;
  target: number;
  tight: boolean;
}

export class SuruBots {
  readonly bots: Bot[] = [];
  private readonly sim: SuruSim;
  // decision scratch
  private dirX = 0;
  private dirZ = 0;
  private wantTight = false;

  constructor(sim: SuruSim, specs: readonly BotSpec[], seed: number) {
    this.sim = sim;
    for (let k = 0; k < specs.length; k++) this.bots.push(new Bot(specs[k], seed >>> 0, k));
  }

  debug(): BotDebug[] {
    return this.bots.map((b) => ({ flock: b.flock, action: b.action >= 0 ? BOT_ACTION_NAMES[b.action] : 'none', target: b.target, tight: b.tightOn }));
  }

  /** Produce this tick's bot commands (call before sim.step). */
  update(T: number, out: SuruCommand[]): void {
    const sim = this.sim;
    for (let k = 0; k < this.bots.length; k++) {
      const b = this.bots[k];
      if (!sim.flockAlive[b.flock] || b.policy === 'idle') continue;
      if (T >= b.nextDecision) {
        b.nextDecision = T + b.interval;
        if (b.policy === 'sleep') this.decideSleep(b);
        else this.decideUtility(b, T);
        // reaction delay buffer
        if (b.qLen < Q) {
          const slot = (b.qHead + b.qLen) % Q;
          let sx = Math.round(this.dirX * 127);
          let sz = Math.round(this.dirZ * 127);
          if (sx === 0 && sz === 0) sx = 1;
          b.qTick[slot] = T + b.reactionTicks;
          b.qSX[slot] = sx;
          b.qSZ[slot] = sz;
          b.qTight[slot] = this.wantTight ? 1 : 0;
          b.qLen++;
        }
      }
      while (b.qLen > 0 && b.qTick[b.qHead] <= T) {
        const sx = b.qSX[b.qHead];
        const sz = b.qSZ[b.qHead];
        const tg = b.qTight[b.qHead];
        b.qHead = (b.qHead + 1) % Q;
        b.qLen--;
        if (sx !== b.lastSX || sz !== b.lastSZ) {
          out.push({ tick: T, actorId: b.flock, cmd: 'steer', args: [sx, sz] });
          b.lastSX = sx;
          b.lastSZ = sz;
        }
        if (tg !== b.lastTight) {
          out.push({ tick: T, actorId: b.flock, cmd: 'tight', args: [tg] });
          b.lastTight = tg;
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // helpers
  // ------------------------------------------------------------------------------------------

  private setDir(x: number, z: number): void {
    const l = Math.sqrt(x * x + z * z);
    if (l < 1e-6) {
      this.dirX = 1;
      this.dirZ = 0;
      return;
    }
    this.dirX = x / l;
    this.dirZ = z / l;
  }

  private applyNoiseAndEdge(b: Bot, T: number): void {
    const sim = this.sim;
    const f = b.flock;
    const lx = sim.leaderX[f];
    const lz = sim.leaderZ[f];
    // keep inside the arena / sunset ring (look ahead 2.5 s)
    const R = sim.ringActive ? sim.ringRadius - (SURU.RING_R0 - SURU.RING_R1) / (SURU.ROUND_SEC - SURU.RING_START_SEC) * 3 : SURU.ARENA_RADIUS;
    const ax = lx + sim.leaderHX[f] * 25;
    const az = lz + sim.leaderHZ[f] * 25;
    const r = Math.sqrt(ax * ax + az * az);
    const inner = R - 45;
    if (r > inner && r > 1) {
      let w = (r - inner) / 40;
      if (w > 1) w = 1;
      this.setDir(this.dirX * (1 - w) - (ax / r) * w * 1.5, this.dirZ * (1 - w) - (az / r) * w * 1.5);
    }
    // seeded steering noise (league: Bronz ±15° … Elmas ±4°)
    const nd = b.scale.noiseDeg;
    const a = (b.rng.next() - 0.5) * 2 * nd * DEG;
    const c = detCos(a);
    const s = detSin(a);
    const x = this.dirX * c - this.dirZ * s;
    const z = this.dirX * s + this.dirZ * c;
    this.dirX = x;
    this.dirZ = z;
    void T;
  }

  private dist(ax: number, az: number, bx: number, bz: number): number {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /** Breath-aware Tight decision with hysteresis. */
  private tight(b: Bot, want: boolean, minBreath: number): boolean {
    const sim = this.sim;
    const f = b.flock;
    const br = sim.flockBreath[f];
    if (sim.flockBreathless[f]) {
      b.tightOn = false;
      return false;
    }
    const reserve = b.scale.breathReserve;
    if (want) {
      if (!b.tightOn && br > Math.max(minBreath, reserve + 10)) b.tightOn = true;
      else if (b.tightOn && br < reserve) b.tightOn = false;
    } else b.tightOn = false;
    return b.tightOn;
  }

  private hawkOnMe(b: Bot, T: number): boolean {
    const hawks = this.sim.hawks;
    for (let k = 0; k < hawks.length; k++) {
      const hk = hawks[k];
      if ((hk.phase === 1 || hk.phase === 2) && hk.targetFlock === b.flock) {
        // one reaction roll per wave (keyed by the first warning tick)
        if (hk.phase === 1 && k === 0 && b.hawkSeen !== hk.phaseTick) {
          b.hawkSeen = hk.phaseTick;
          const resp = b.scale.hawkResponse;
          b.hawkTight = b.rng.next() < resp;
        }
        return b.hawkTight;
      }
    }
    void T;
    return false;
  }

  // ------------------------------------------------------------------------------------------
  // FTUE "sleeping" flock: circles slowly in place, never tightens
  // ------------------------------------------------------------------------------------------

  private decideSleep(b: Bot): void {
    const sim = this.sim;
    const f = b.flock;
    const hx = sim.leaderHX[f];
    const hz = sim.leaderHZ[f];
    // steer toward its own anchor (where it spawned) + hard turn → tight circle
    this.setDir(hx * 0.2 - hz, hz * 0.2 + hx);
    this.wantTight = false;
  }

  // ------------------------------------------------------------------------------------------
  // §4.G utility AI
  // ------------------------------------------------------------------------------------------

  private decideUtility(b: Bot, T: number): void {
    const sim = this.sim;
    const f = b.flock;
    const p = b.pers;
    const sc = b.scale;
    const lx = sim.leaderX[f];
    const lz = sim.leaderZ[f];
    const n = sim.flockCountArr[f] + 1;
    const F = sim.flockCount;
    // ---- threat (bigger flocks nearby, storm) ----
    let threat = 0;
    let tvx = 0;
    let tvz = 0;
    for (let e = 1; e <= F; e++) {
      if (e === f || !sim.flockAlive[e]) continue;
      const ne = sim.flockCountArr[e] + 1;
      if (ne <= n * 1.25) continue;
      const ex = sim.cenX[e];
      const ez = sim.cenZ[e];
      const d = this.dist(lx, lz, ex, ez);
      let th = (ne / n - 1) / 1.5;
      if (th > 1) th = 1;
      th *= detExp(-d / 90);
      if (th > threat) threat = th;
      if (d > 1) {
        tvx += ((lx - ex) / d) * th;
        tvz += ((lz - ez) / d) * th;
      }
    }
    const st = sim.storm;
    if (st.active) {
      const d = this.dist(lx, lz, st.x, st.z);
      const edge = d - st.radius;
      if (edge < 40) {
        let th = 0.6 * (1 - edge / 40);
        if (th > 0.6) th = 0.6;
        if (th > threat) threat = th;
        if (d > 1) {
          tvx += ((lx - st.x) / d) * th;
          tvz += ((lz - st.z) / d) * th;
        }
      }
    }
    // ---- candidate utilities ----
    let bestA = A_NONE;
    let bestT = -1;
    let bestU = -1;
    let curU = -1;
    const consider = (a: number, t: number, u: number): void => {
      if (a === b.action && t === b.target) curU = u;
      if (u > bestU) {
        bestU = u;
        bestA = a;
        bestT = t;
      }
    };
    // collect (wild groups)
    for (let g = 0; g < SURU.MAX_GROUPS; g++) {
      if (!sim.gActive[g]) continue;
      const c = sim.gCount[g];
      if (c === 0) continue;
      if (sim.gImmune[g] > T + 20) continue;
      if (sim.gBlockOwner[g] === f && sim.gBlockUntil[g] > T + 20) continue; // my own scattered birds (S-14)
      const gx = sim.gCX[g];
      const gz = sim.gCZ[g];
      if (sim.ringActive && gx * gx + gz * gz > sim.ringRadius * sim.ringRadius) continue;
      const d = this.dist(lx, lz, gx, gz);
      let u = (c / (d + 40)) * (1 - threat) * p.greed * 3.2 * sc.skill;
      if (sim.gImmune[g] > T - 90 && p.opp > 1) u *= 1.8; // opportunist: freshly scattered birds
      if (p.ring > 1 && n < 110) u *= 1.6; // encircler grows first: it needs a size edge to close rings
      consider(A_COLLECT, g, u);
    }
    for (let e = 1; e <= F; e++) {
      if (e === f || !sim.flockAlive[e]) continue;
      const ne = sim.flockCountArr[e] + 1;
      const d = this.dist(lx, lz, sim.cenX[e], sim.cenZ[e]);
      // attack smaller flocks
      if (n > ne) {
        let k = (n - ne) / n;
        if (k > 1) k = 1;
        // hunters dive on flocks 0.6–0.9× their size (§2.6); much smaller prey is less interesting to them
        let band = 1;
        if (p.aggr > 1.2) {
          const ratio = ne / n;
          band = ratio >= 0.6 && ratio <= 0.9 ? 1.0 : 0.45;
          k = Math.max(k, 0.3);
        }
        consider(A_ATTACK, e, k * detExp(-d / 120) * p.aggr * band * 0.8 * sc.skill);
      }
      // siege (needs a clear size advantage; targets that resisted recently are skipped)
      if (n >= 1.6 * ne && n >= 80 && sim.flockCountArr[e] > 0 && !(b.bannedTarget === e && T < b.bannedUntil)) {
        const de = this.dist(lx, lz, sim.leaderX[e], sim.leaderZ[e]);
        consider(A_SIEGE, e, detExp(-de / 80) * p.ring * sc.ringMul * sc.skill);
      }
      // opportunity: a flock that is bleeding birds right now
      const lost = sim.countHist[e * 8 + 6] - sim.flockCountArr[e];
      if (lost > 2 && n >= 0.6 * ne) {
        consider(A_OPP, e, (lost / ne) * p.opp * 1.7 * detExp(-d / 150) * sc.skill);
      }
    }
    consider(A_FLEE, -1, threat * (1 - p.courage) * 1.35);
    {
      const R = sim.ringActive ? sim.ringRadius : SURU.ARENA_RADIUS;
      const r = Math.sqrt(lx * lx + lz * lz);
      let c = (r - (R - 35)) / 35;
      if (c < 0) c = 0;
      if (c > 1) c = 1;
      consider(A_CENTER, -1, 3 * c);
    }
    // ---- hysteresis (+0.15) and ≥ 1 s commitment ----
    const valid = this.actionValid(b, T);
    if (b.action !== A_NONE && valid) {
      const committed = T - b.actionTick < COMMIT_TICKS;
      if (committed || bestU <= curU + HYSTERESIS) {
        bestA = b.action;
        bestT = b.target;
      }
    }
    // a siege that has not closed beyond 60 % after 6 s is abandoned (the encircler goes back to growing)
    if (b.action === A_SIEGE && valid) {
      const cov = sim.sieges[b.target] && sim.sieges[b.target].attacker === f ? sim.sieges[b.target].coverage01 : 0;
      if (cov > b.siegeBest) b.siegeBest = cov;
      if (T - b.actionTick > 6 * SURU.TICK_HZ && b.siegeBest < 0.6) {
        b.bannedTarget = b.target;
        b.bannedUntil = T + 10 * SURU.TICK_HZ;
        b.action = A_NONE;
        bestA = A_CENTER;
        bestT = -1;
      }
    }
    if (bestA !== b.action || bestT !== b.target) {
      if (bestA === A_SIEGE) b.siegeBest = 0;
      b.action = bestA;
      b.target = bestT;
      b.actionTick = T;
      if (bestA === A_SIEGE) {
        // orbit sense = side we are already turning toward
        const rx = lx - sim.leaderX[bestT];
        const rz = lz - sim.leaderZ[bestT];
        b.orbitSign = rx * sim.leaderHZ[f] - rz * sim.leaderHX[f] >= 0 ? -1 : 1;
      }
    }
    // ---- execute ----
    let want = false;
    let minBreath = 25;
    switch (b.action) {
      case A_COLLECT: {
        const g = b.target;
        this.setDir(sim.gCX[g] - lx, sim.gCZ[g] - lz);
        want = false;
        break;
      }
      case A_ATTACK:
      case A_OPP: {
        const e = b.target;
        const ex = sim.cenX[e] + sim.leaderHX[e] * 8;
        const ez = sim.cenZ[e] + sim.leaderHZ[e] * 8;
        this.setDir(ex - lx, ez - lz);
        const contact = this.dist(lx, lz, sim.cenX[e], sim.cenZ[e]) < sim.flockRadius(f) + sim.flockRadius(e) + 14;
        want = contact;
        break;
      }
      case A_SIEGE: {
        this.orbit(b, b.target);
        want = false;
        break;
      }
      case A_FLEE: {
        if (tvx * tvx + tvz * tvz < 1e-6) this.setDir(-lx, -lz);
        else this.setDir(tvx, tvz);
        want = true;
        minBreath = 40;
        break;
      }
      default: {
        this.setDir(-lx, -lz);
        want = false;
      }
    }
    // sloppy decisions (Bronz): wander off for a moment
    if (sc.mistake > 0 && b.rng.next() < sc.mistake) {
      const a = (b.rng.next() - 0.5) * 140 * DEG;
      const c = detCos(a);
      const s = detSin(a);
      this.setDir(this.dirX * c - this.dirZ * s, this.dirX * s + this.dirZ * c);
    }
    if (!want && b.action !== A_SIEGE && this.inContact(b) && b.rng.next() < sc.defend) want = true;
    if (this.hawkOnMe(b, T)) {
      want = true;
      minBreath = 8;
    }
    this.wantTight = this.tight(b, want, minBreath);
    this.applyNoiseAndEdge(b, T);
  }

  /** an enemy flock body overlaps ours (centroid distance < R_me + R_e + 12 m) */
  private inContact(b: Bot): boolean {
    const sim = this.sim;
    const f = b.flock;
    const rf = sim.flockRadius(f);
    for (let e = 1; e <= sim.flockCount; e++) {
      if (e === f || !sim.flockAlive[e] || sim.flockCountArr[e] < 10) continue;
      const d = this.dist(sim.cenX[f], sim.cenZ[f], sim.cenX[e], sim.cenZ[e]);
      if (d < rf + sim.flockRadius(e) + 12) return true;
    }
    return false;
  }

  private actionValid(b: Bot, T: number): boolean {
    const sim = this.sim;
    switch (b.action) {
      case A_COLLECT:
        return b.target >= 0 && sim.gActive[b.target] === 1 && sim.gCount[b.target] > 0 && sim.gImmune[b.target] <= T + 20 && !(sim.gBlockOwner[b.target] === b.flock && sim.gBlockUntil[b.target] > T + 20);
      case A_ATTACK:
      case A_OPP:
      case A_SIEGE:
        return b.target > 0 && sim.flockAlive[b.target] === 1 && sim.flockCountArr[b.target] > 0;
      case A_FLEE:
      case A_CENTER:
        return true;
      default:
        return false;
    }
  }

  /** Orbit the target leader at r = R_e + 6 m (bounded by our own turn radius) — the visible arc. */
  private orbit(b: Bot, e: number): void {
    const sim = this.sim;
    const f = b.flock;
    const lx = sim.leaderX[f];
    const lz = sim.leaderZ[f];
    const tx = sim.leaderX[e] + sim.leaderHX[e] * sim.leaderSpeed[e] * 0.5;
    const tz = sim.leaderZ[e] + sim.leaderHZ[e] * sim.leaderSpeed[e] * 0.5;
    let rx = lx - tx;
    let rz = lz - tz;
    const r = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= r;
    rz /= r;
    const n = sim.flockCountArr[f] + 1;
    let tf = Math.sqrt(SURU.TURN_REF_N / n);
    if (tf < SURU.TURN_MIN_F) tf = SURU.TURN_MIN_F;
    if (tf > 1) tf = 1;
    const omega = SURU.TURN_BASE * tf;
    const rTurn = sim.leaderSpeed[f] / omega;
    let ro = sim.flockRadius(e) + 6;
    if (ro < rTurn + 3) ro = rTurn + 3;
    const s = b.orbitSign;
    const tanX = -rz * s;
    const tanZ = rx * s;
    let k = (r - ro) / 10;
    if (k > 2.5) k = 2.5;
    if (k < -1) k = -1;
    this.setDir(tanX - rx * k, tanZ - rz * k);
  }

}

/** Seeded personality mix for a round (equal counts, shuffled). */
export function personalityMix(count: number, seed: number, allowed?: readonly PersonalityId[]): PersonalityId[] {
  const ids: PersonalityId[] = allowed && allowed.length > 0 ? [...allowed] : ['toplayici', 'avci', 'urkek', 'kusatici', 'firsatci'];
  const rng = new Rng(seed, 77);
  const out: PersonalityId[] = [];
  for (let k = 0; k < count; k++) out.push(ids[k % ids.length]);
  for (let k = out.length - 1; k > 0; k--) {
    const j = rng.int(0, k);
    const t = out[k];
    out[k] = out[j];
    out[j] = t;
  }
  return out;
}
