// Autoplay bots (integrator; §9.G policies). PD line follower over route.line that produces the same quantized
// 30 Hz Commands a thumb would (axis every 2nd tick, parachute / flare events), so a bot flight records into a
// valid ghost code. PURE (detMath, no allocation per tick after construction).
//
//   careful  ideal line, ≥ 18 m above the surface, no thermal seeking, opens at ~110 m in the zone
//   expert   ≈ 4 m above the surface where the line hugs the terrain, through gate centres, opens 70–80 m + flare
//   average  +10 m with seeded lateral noise and 250 ms reaction lag (W1 "3 tries → ⭐⭐" check)
//   noise    seeded random stick (fuzz), parachute whenever allowed
import { atan2, clamp, cos, DEG, sin, wrapPi } from '../../sim/math/detMath.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import type { Command, FlightState, RouteDef } from '../../sim/types.ts';

export type BotPolicy = 'careful' | 'expert' | 'average' | 'noise';
export const BOT_POLICIES: readonly BotPolicy[] = ['careful', 'expert', 'average', 'noise'];

interface PolicyParams {
  offset: number;
  lineDrop: number;
  openAgl: number;
  openDist: number;
  lag: number;
  noise: number;
}

const PARAMS: Record<BotPolicy, PolicyParams> = {
  careful: { offset: 18, lineDrop: 0, openAgl: 110, openDist: 230, lag: 0, noise: 0 },
  expert: { offset: 4.5, lineDrop: 15, openAgl: 82, openDist: 175, lag: 0, noise: 0 },
  average: { offset: 10, lineDrop: 8, openAgl: 95, openDist: 210, lag: 15, noise: 3 },
  noise: { offset: 20, lineDrop: 0, openAgl: 120, openDist: 250, lag: 0, noise: 0 },
};

function hash32(a: number, b: number): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b)) | 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

export class LineBot {
  readonly policy: BotPolicy;
  readonly route: RouteDef;
  readonly sampler: TerrainSampler;
  readonly actorId: number;
  private readonly p: PolicyParams;
  private readonly seed: number;
  private readonly cum: Float64Array;
  private readonly total: number;
  private seg = 0;
  private lastFlare = -1;
  private chuteSent = false;
  private readonly cmdAxis: Command;
  private readonly cmdChute: Command;
  private readonly cmdFlare: Command;
  private readonly lagSx: Int8Array = new Int8Array(64);
  private readonly lagSy: Int8Array = new Int8Array(64);
  private readonly look = new Float64Array(3);
  /** Last target (debug / e2e state). */
  readonly target = new Float64Array(3);

  constructor(route: RouteDef, sampler: TerrainSampler, policy: BotPolicy, seed = 1, actorId = 0) {
    this.route = route;
    this.sampler = sampler;
    this.policy = policy;
    this.p = PARAMS[policy];
    this.seed = seed >>> 0;
    this.actorId = actorId;
    const n = route.line.length;
    this.cum = new Float64Array(n);
    let t = 0;
    for (let i = 1; i < n; i++) {
      const a = route.line[i - 1];
      const b = route.line[i];
      t += Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[2] - a[2]) * (b[2] - a[2]));
      this.cum[i] = t;
    }
    this.total = t > 1 ? t : 1;
    this.cmdAxis = { tick: 0, actorId, cmd: 'axis', args: [0, 0] };
    this.cmdChute = { tick: 0, actorId, cmd: 'parachute', args: [] };
    this.cmdFlare = { tick: 0, actorId, cmd: 'flare', args: [0] };
  }

  reset(): void {
    this.seg = 0;
    this.lastFlare = -1;
    this.chuteSent = false;
    this.lagSx.fill(0);
    this.lagSy.fill(0);
  }

  /** Route progress (0..1) by arc length of the nearest line point (monotonic). */
  progress(x: number, z: number): number {
    const line = this.route.line;
    const n = line.length;
    let best = Infinity;
    let bestS = this.cum[this.seg];
    const i0 = this.seg;
    const i1 = Math.min(n - 1, this.seg + 4);
    for (let i = i0; i < i1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const ex = b[0] - a[0];
      const ez = b[2] - a[2];
      const l2 = ex * ex + ez * ez;
      let t = l2 > 1e-6 ? ((x - a[0]) * ex + (z - a[2]) * ez) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a[0] + ex * t - x;
      const pz = a[2] + ez * t - z;
      const d = px * px + pz * pz;
      if (d < best) {
        best = d;
        bestS = this.cum[i] + (this.cum[i + 1] - this.cum[i]) * t;
        if (t >= 1 && i + 1 > this.seg) this.seg = Math.min(n - 2, i + 1);
        else if (i > this.seg) this.seg = i;
      }
    }
    return bestS / this.total;
  }

  /** Point on the line at arc length s (metres) → this.look (x, lineY, z). */
  private pointAt(s: number): void {
    const line = this.route.line;
    const n = line.length;
    if (s <= 0) {
      this.look[0] = line[0][0];
      this.look[1] = line[0][1];
      this.look[2] = line[0][2];
      return;
    }
    let i = this.seg;
    while (i < n - 2 && this.cum[i + 1] < s) i++;
    const a = line[i];
    const b = line[Math.min(n - 1, i + 1)];
    const span = this.cum[Math.min(n - 1, i + 1)] - this.cum[i];
    let t = span > 1e-6 ? (s - this.cum[i]) / span : 1;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    this.look[0] = a[0] + (b[0] - a[0]) * t;
    this.look[1] = a[1] + (b[1] - a[1]) * t;
    this.look[2] = a[2] + (b[2] - a[2]) * t;
  }

  /** Append this tick's commands (Command.tick = st.tick). Returns how many were appended. */
  commands(st: FlightState, out: Command[]): number {
    const tick = st.tick;
    let n = 0;
    if (st.phase === 'flying') {
      if (!this.chuteSent && st.inLandingZone && this.wantChute(st)) {
        this.cmdChute.tick = tick;
        out.push(this.cmdChute);
        this.chuteSent = true;
        n++;
      }
      if ((tick & 1) === 0) {
        this.flyAxis(st);
        out.push(this.cmdAxis);
        n++;
      }
    } else if (st.phase === 'canopy' || st.phase === 'halfFlight') {
      if ((tick & 1) === 0) {
        this.canopyAxis(st);
        out.push(this.cmdAxis);
        n++;
        const f = st.heightAGL < 4.2 && this.policy !== 'noise' ? 31 : 0;
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

  private wantChute(st: FlightState): boolean {
    if (this.policy === 'noise') return true;
    const lc = this.route.landing.center;
    const dx = lc[0] - st.pos[0];
    const dz = lc[2] - st.pos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const agl = st.heightAGL;
    if (agl < 55) return true;
    return dist <= this.p.openDist && agl <= this.p.openAgl + 25;
  }

  private emit(tick: number, sx: number, sy: number): void {
    let qx = Math.round(clamp(sx, -31, 31)) | 0;
    let qy = Math.round(clamp(sy, -31, 31)) | 0;
    if (this.p.lag > 0) {
      const slot = (tick >> 1) & 63;
      const back = (slot - (this.p.lag >> 1) + 64) & 63;
      const ox = this.lagSx[back];
      const oy = this.lagSy[back];
      this.lagSx[slot] = qx;
      this.lagSy[slot] = qy;
      qx = ox;
      qy = oy;
    }
    this.cmdAxis.tick = tick;
    this.cmdAxis.args[0] = qx | 0;
    this.cmdAxis.args[1] = qy | 0;
  }

  private flyAxis(st: FlightState): void {
    const tick = st.tick;
    if (this.policy === 'noise') {
      const h = hash32(this.seed, tick >> 4);
      this.emit(tick, (h & 63) - 31, ((h >>> 6) & 63) - 31);
      return;
    }
    const x = st.pos[0];
    const y = st.pos[1];
    const z = st.pos[2];
    const s = this.progress(x, z) * this.total;
    const ahead = clamp(st.speed * 1.6, 50, 110);
    this.pointAt(s + ahead);
    let tx = this.look[0];
    let tz = this.look[2];
    const lineY = this.look[1];
    // lateral noise (average player)
    if (this.p.noise > 0) {
      const h = hash32(this.seed ^ 0x51ed, tick >> 6);
      const nx = (((h & 1023) / 1023) * 2 - 1) * this.p.noise;
      tx += cos(st.psi) * nx;
      tz += sin(st.psi) * nx;
    }
    // highest surface between here and the lookahead (ridges, chimneys handled by the prox term below)
    let hMax = -Infinity;
    for (let k = 1; k <= 4; k++) {
      const f = k / 4;
      const hx = x + (tx - x) * f;
      const hz = z + (tz - z) * f;
      const hh = this.sampler.height(hx, hz);
      if (hh > hMax) hMax = hh;
    }
    let ty = hMax + this.p.offset;
    const floorLine = lineY - this.p.lineDrop;
    if (ty < floorLine) ty = floorLine;
    // gates: aim through the next gate centre when it is close ahead
    const gi = st.gateIndex;
    const gates = this.route.gates;
    if (gi < gates.length) {
      const g = gates[gi];
      const gx = g.pos[0] - x;
      const gz = g.pos[2] - z;
      const gd = Math.sqrt(gx * gx + gz * gz);
      const along = gx * sin(st.psi) - gz * cos(st.psi);
      if (gd < 260 && along > -5) {
        const k = gd < 120 ? 1 : (260 - gd) / 140;
        tx = tx + (g.pos[0] - tx) * k;
        tz = tz + (g.pos[2] - tz) * k;
        const gy = g.pos[1] - (this.policy === 'expert' ? 0.3 * g.radius : 0);
        ty = ty + (gy - ty) * k;
      }
    }
    // obstacle reflex: very close surface → pull away (careful pilots do not graze)
    if (st.prox.d < (this.policy === 'expert' ? 2.2 : 7) && st.prox.normal[1] > -0.2) ty = y + 12;
    this.target[0] = tx;
    this.target[1] = ty;
    this.target[2] = tz;
    const want = atan2(tx - x, -(tz - z));
    const err = wrapPi(want - st.psi);
    const sx = (err / (32 * DEG)) * 31;
    const dh = Math.sqrt((tx - x) * (tx - x) + (tz - z) * (tz - z));
    let gDes = atan2(ty - y, dh > 1 ? dh : 1);
    gDes = clamp(gDes, -38 * DEG, 14 * DEG);
    let sy = ((gDes - st.gamma) / (9 * DEG)) * 31;
    if (st.speed < 31 && sy > 0) sy = 0;
    this.emit(tick, sx, sy);
  }

  private canopyAxis(st: FlightState): void {
    const tick = st.tick;
    const lc = this.route.landing.center;
    const want = atan2(lc[0] - st.pos[0], -(lc[2] - st.pos[2]));
    const err = wrapPi(want - st.psi);
    const dx = lc[0] - st.pos[0];
    const dz = lc[2] - st.pos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    let sx = (err / (25 * DEG)) * 31;
    if (dist < 6) sx = 0;
    // brake (pull = negative sy) when we would overshoot: glide 2:1 under canopy
    let sy = 0;
    if (dist < st.heightAGL * 1.2 && st.heightAGL > 8) sy = -18;
    if (this.policy === 'noise') {
      const h = hash32(this.seed, tick >> 4);
      sx = (h & 63) - 31;
    }
    this.emit(tick, sx, sy);
  }
}
