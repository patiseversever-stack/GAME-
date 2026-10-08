// Rota Kâşifi shared Node helpers (owner: routes agent): world loading with the game's own content builder,
// terrain feature grid, A* path search, smoothing, landing/start site search, bot flights.
// Node-only (tools/); everything that must be deterministic at runtime lives in src/sim/daily/build.ts.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadWorldNode, KANAT_ROOT, type NodeWorld } from './terrain/loadNode.ts';
import { buildWorldContent, type WorldContent } from '../src/game/routes/worldContent.ts';
import { FlightSim } from '../src/sim/FlightSim.ts';
import { Proximity, ProxResult, type WaterBody } from '../src/sim/flight/proximity.ts';
import { ObstacleField } from '../src/sim/bots/obstacles.ts';
import { createBot } from '../src/sim/bots/bots.ts';
import type { BotPolicy } from '../src/sim/bots/PilotBot.ts';
import { runBot, type BotRunResult, type RunOptions } from '../src/sim/bots/runner.ts';
import type { BuildWorld } from '../src/sim/daily/build.ts';
import type { RouteDef, WorldId } from '../src/sim/types.ts';

export const ROUTES_DIR = join(KANAT_ROOT, 'src', 'content', 'routes');

export interface ToolWorld {
  id: WorldId;
  node: NodeWorld;
  content: WorldContent;
  obstacles: ObstacleField;
  water: WaterBody[];
  build: BuildWorld;
}

export function readRouteJson(id: string, dir: string = ROUTES_DIR): RouteDef | null {
  const f = join(dir, `${id}.json`);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, 'utf8')) as RouteDef;
}

/** World + the game's content (props/balloons derived from `json` routes exactly like the browser). */
export function loadToolWorld(id: WorldId, json: Record<string, RouteDef>, node?: NodeWorld): ToolWorld {
  const W = node ?? loadWorldNode(id);
  const content = buildWorldContent(id, W.sampler, W.config, { json });
  const obstacles = new ObstacleField(W.sampler, content.props, W.config.hasSea);
  const water: WaterBody[] = W.patchWater ? [{ y: 0, grid: W.patchWater }] : [];
  const allWater: WaterBody[] = W.config.hasSea ? [{ y: 0 }, ...water] : water;
  const prox = new Proximity(W.sampler, content.propIndex, [], allWater);
  const pr = new ProxResult();
  const build: BuildWorld = {
    world: id,
    sampler: W.sampler,
    obstacles,
    hasSea: W.config.hasSea,
    clearance: (x, y, z) => {
      prox.query(x, y, z, pr, 45);
      return pr.dc;
    },
  };
  return { id, node: W, content, obstacles, water, build };
}

/** Terrain-only build world (before props exist for a new route set). */
export function terrainBuildWorld(id: WorldId, W: NodeWorld): BuildWorld {
  const water: WaterBody[] = W.patchWater ? [{ y: 0, grid: W.patchWater }] : [];
  const allWater: WaterBody[] = W.config.hasSea ? [{ y: 0 }, ...water] : water;
  const prox = new Proximity(W.sampler, null, [], allWater);
  const pr = new ProxResult();
  return {
    world: id,
    sampler: W.sampler,
    obstacles: null,
    hasSea: W.config.hasSea,
    clearance: (x, y, z) => {
      prox.query(x, y, z, pr, 45);
      return pr.dc;
    },
  };
}

export function flyBot(tw: ToolWorld, route: RouteDef, policy: BotPolicy, seed = 1, opts: RunOptions = {}): BotRunResult {
  const sim = new FlightSim({
    world: route.world,
    sampler: tw.node.sampler,
    route,
    propIndex: tw.content.propIndex,
    balloons: tw.content.balloons,
    seed: 1,
    assist: 'off',
    guideWind: false,
    water: tw.water.length > 0 ? tw.water : undefined,
  });
  const bot = createBot(policy, route, { sampler: tw.node.sampler, obstacles: tw.obstacles, hasSea: tw.node.config.hasSea, balloons: tw.content.balloons }, seed);
  return runBot(sim, bot, opts);
}

// ─── terrain features on a 16 m grid ────────────────────────────────────────────────────────────────────

export interface Features {
  step: number;
  n: number;
  ox: number;
  oz: number;
  H: Float32Array;
  /** 0..1: lower than the surroundings within ~150 m (valley / canyon floor). */
  canyon: Float32Array;
  /** 0..1: higher than the surroundings (ridge / summit). */
  ridge: Float32Array;
  /** Local relief (max − min) in a 150 m window (m). */
  relief: Float32Array;
  water: Uint8Array;
}

export function buildFeatures(W: NodeWorld, step = 16): Features {
  const b = W.sampler.bounds;
  const ox = b.minX;
  const oz = b.minZ;
  const n = Math.floor((b.maxX - b.minX) / step) + 1;
  const H = new Float32Array(n * n);
  const water = new Uint8Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const h = W.sampler.baseHeight(ox + i * step, oz + j * step);
      H[j * n + i] = h;
      if (W.config.hasSea && h < 0.5) water[j * n + i] = 1;
    }
  // integral image for window means
  const I = new Float64Array((n + 1) * (n + 1));
  for (let j = 0; j < n; j++) {
    let row = 0;
    for (let i = 0; i < n; i++) {
      row += H[j * n + i];
      I[(j + 1) * (n + 1) + i + 1] = I[j * (n + 1) + i + 1] + row;
    }
  }
  const mean = (i: number, j: number, r: number): number => {
    const i0 = Math.max(0, i - r);
    const j0 = Math.max(0, j - r);
    const i1 = Math.min(n - 1, i + r);
    const j1 = Math.min(n - 1, j + r);
    const s = I[(j1 + 1) * (n + 1) + i1 + 1] - I[j0 * (n + 1) + i1 + 1] - I[(j1 + 1) * (n + 1) + i0] + I[j0 * (n + 1) + i0];
    return s / ((i1 - i0 + 1) * (j1 - j0 + 1));
  };
  const canyon = new Float32Array(n * n);
  const ridge = new Float32Array(n * n);
  const relief = new Float32Array(n * n);
  const r = Math.round(150 / step);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const m = mean(i, j, r);
      canyon[k] = Math.max(0, Math.min(1, (m - H[k]) / 35));
      ridge[k] = Math.max(0, Math.min(1, (H[k] - m) / 35));
      let lo = Infinity;
      let hi = -Infinity;
      for (let dj = -r; dj <= r; dj += 2)
        for (let di = -r; di <= r; di += 2) {
          const ii = Math.min(n - 1, Math.max(0, i + di));
          const jj = Math.min(n - 1, Math.max(0, j + dj));
          const h = H[jj * n + ii];
          if (h < lo) lo = h;
          if (h > hi) hi = h;
        }
      relief[k] = hi - lo;
    }
  return { step, n, ox, oz, H, canyon, ridge, relief, water };
}

// ─── A* (cell × 8 headings) ──────────────────────────────────────────────────────────────────────────────

export interface AStarCost {
  /** Prefer valley floors (canyon reward) — 'valley'; ridge crests — 'ridge'; neither — 'free'. */
  mode: 'valley' | 'ridge' | 'free';
  /** Weight of the feature preference (× step length). */
  wFeature: number;
  /** Penalty per metre of terrain climb along the step. */
  wUp: number;
  /** Penalty per 45° heading change. */
  wTurn: number;
  /** Reward for local relief (× step length × relief/150). */
  wRelief: number;
  /** Cells to avoid (water, or a custom predicate). */
  avoidWater: boolean;
}

const DX8 = [0, 1, 1, 1, 0, -1, -1, -1];
const DZ8 = [-1, -1, 0, 1, 1, 1, 0, -1];

class Heap {
  private k: number[] = [];
  private v: number[] = [];
  get size(): number {
    return this.k.length;
  }
  push(key: number, val: number): void {
    const k = this.k;
    const v = this.v;
    k.push(key);
    v.push(val);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): number {
    const k = this.k;
    const v = this.v;
    const top = v[0];
    const lk = k.pop() as number;
    const lv = v.pop() as number;
    if (k.length > 0) {
      k[0] = lk;
      v[0] = lv;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

/** A* between two points (world xz). Returns a cell-centre polyline (flat xz) or null. */
export function astar(F: Features, ax: number, az: number, bx: number, bz: number, c: AStarCost, headingDeg0?: number): number[] | null {
  const n = F.n;
  const st = F.step;
  const ci = (x: number) => Math.max(0, Math.min(n - 1, Math.round((x - F.ox) / st)));
  const si = ci(ax);
  const sj = ci(az);
  const gi = ci(bx);
  const gj = ci(bz);
  const N = n * n * 8;
  const g = new Float64Array(N).fill(Infinity);
  const from = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = new Heap();
  const h = (i: number, j: number) => Math.sqrt((i - gi) * (i - gi) + (j - gj) * (j - gj)) * st;
  for (let d = 0; d < 8; d++) {
    let pen = 0;
    if (headingDeg0 !== undefined) {
      const hd = ((d * 45 - headingDeg0 + 540) % 360) - 180;
      pen = Math.abs(hd) > 50 ? 1e6 : 0;
    }
    const s = (sj * n + si) * 8 + d;
    g[s] = pen;
    heap.push(pen + h(si, sj), s);
  }
  let goal = -1;
  let iters = 0;
  while (heap.size > 0 && iters < 6_000_000) {
    iters++;
    const s = heap.pop();
    if (closed[s]) continue;
    closed[s] = 1;
    const d = s % 8;
    const cell = (s - d) / 8;
    const i = cell % n;
    const j = (cell - i) / n;
    if (i === gi && j === gj) {
      goal = s;
      break;
    }
    for (let t = -1; t <= 1; t++) {
      const nd = (d + t + 8) % 8;
      const ni = i + DX8[nd];
      const nj = j + DZ8[nd];
      if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
      const nk = nj * n + ni;
      const len = (nd & 1 ? 1.41421356 : 1) * st;
      let feat = 0;
      if (c.mode === 'valley') feat = 1 - F.canyon[nk];
      else if (c.mode === 'ridge') feat = 1 - F.ridge[nk];
      const up = F.H[nk] - F.H[j * n + i];
      const rel = Math.min(1, F.relief[nk] / 150);
      const wet = c.avoidWater && F.water[nk] ? 1.5 : 0;
      const cost = len * (1 + c.wFeature * feat + c.wRelief * (1 - rel) + wet) + (up > 0 ? c.wUp * up : 0) + (t !== 0 ? c.wTurn : 0);
      const ns = nk * 8 + nd;
      const ng = g[s] + cost;
      if (ng < g[ns]) {
        g[ns] = ng;
        from[ns] = s;
        heap.push(ng + h(ni, nj), ns);
      }
    }
  }
  if (goal < 0) return null;
  const cells: number[] = [];
  for (let s = goal; s >= 0; s = from[s]) cells.push(s);
  cells.reverse();
  const out: number[] = [];
  for (const s of cells) {
    const cell = (s - (s % 8)) / 8;
    const i = cell % n;
    const j = (cell - i) / n;
    out.push(F.ox + i * st, F.oz + j * st);
  }
  out[0] = ax;
  out[1] = az;
  out[out.length - 2] = bx;
  out[out.length - 1] = bz;
  return out;
}

// ─── smoothing ───────────────────────────────────────────────────────────────────────────────────────────

/** Resample a flat xz polyline every `ds` m. */
export function resampleXZ(p: readonly number[], ds: number): number[] {
  const m = p.length / 2;
  const cum = [0];
  for (let i = 1; i < m; i++) cum.push(cum[i - 1] + Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]));
  const total = cum[m - 1];
  const out: number[] = [];
  let seg = 0;
  const k = Math.max(1, Math.round(total / ds));
  for (let q = 0; q <= k; q++) {
    const t = (total * q) / k;
    while (seg < m - 2 && cum[seg + 1] < t) seg++;
    const span = cum[seg + 1] - cum[seg] || 1;
    const f = Math.min(1, Math.max(0, (t - cum[seg]) / span));
    out.push(p[seg * 2] + (p[seg * 2 + 2] - p[seg * 2]) * f, p[seg * 2 + 1] + (p[seg * 2 + 3] - p[seg * 2 + 1]) * f);
  }
  return out;
}

/** Turn radius (m) at interior point i of an evenly spaced polyline. */
export function radiusAt(p: readonly number[], i: number): number {
  const ax = p[i * 2 - 2];
  const az = p[i * 2 - 1];
  const bx = p[i * 2];
  const bz = p[i * 2 + 1];
  const cx = p[i * 2 + 2];
  const cz = p[i * 2 + 3];
  const a = Math.hypot(bx - ax, bz - az);
  const b = Math.hypot(cx - bx, cz - bz);
  const c = Math.hypot(cx - ax, cz - az);
  const cross = Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax));
  if (cross < 1e-9) return Infinity;
  return (a * b * c) / (2 * cross);
}

/**
 * Laplacian smoothing until every turn radius ≥ rMin (flight envelope: V²/(g·tan φ) ≈ 104 m at 42 m/s, 60°).
 * End points stay fixed; `pinned` indices (fractions of the length) are kept too.
 */
export function smoothPath(p0: readonly number[], rMin: number, ds = 20, iters = 400): number[] {
  let p = resampleXZ(p0, ds);
  // initial light smoothing removes the grid staircase
  for (let it = 0; it < iters; it++) {
    const m = p.length / 2;
    let worst = Infinity;
    const q = p.slice();
    for (let i = 1; i < m - 1; i++) {
      const r = radiusAt(p, i);
      if (r < worst) worst = r;
      const w = it < 8 ? 0.5 : r < rMin * 1.15 ? 0.5 : 0;
      if (w === 0) continue;
      q[i * 2] = p[i * 2] * (1 - w) + 0.5 * w * (p[i * 2 - 2] + p[i * 2 + 2]);
      q[i * 2 + 1] = p[i * 2 + 1] * (1 - w) + 0.5 * w * (p[i * 2 - 1] + p[i * 2 + 3]);
    }
    p = q;
    if (it >= 8 && worst >= rMin) break;
    if (it % 20 === 19) p = resampleXZ(p, ds);
  }
  return resampleXZ(p, ds);
}

export function minRadius(p: readonly number[]): number {
  let r = Infinity;
  for (let i = 1; i < p.length / 2 - 1; i++) r = Math.min(r, radiusAt(p, i));
  return r;
}

export function pathLength(p: readonly number[]): number {
  let L = 0;
  for (let i = 1; i < p.length / 2; i++) L += Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]);
  return L;
}

// ─── site search ─────────────────────────────────────────────────────────────────────────────────────────

/** Flattest dry spot (slope < 8° within 40 m, smallest height spread over 30 m) within `radius` of (x, z). */
export function findLanding(W: NodeWorld, x: number, z: number, radius: number, avoid?: (x: number, z: number) => boolean): { x: number; z: number; score: number } | null {
  const s = W.sampler;
  let best: { x: number; z: number; score: number } | null = null;
  for (let dz = -radius; dz <= radius; dz += 12) {
    for (let dx = -radius; dx <= radius; dx += 12) {
      if (dx * dx + dz * dz > radius * radius) continue;
      const px = x + dx;
      const pz = z + dz;
      const h = s.height(px, pz);
      if (W.config.hasSea && h < 2) continue;
      if (avoid && avoid(px, pz)) continue;
      let ms = 0;
      let lo = h;
      let hi = h;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        for (const r of [10, 20, 40]) {
          const qx = px + Math.cos(a) * r;
          const qz = pz + Math.sin(a) * r;
          ms = Math.max(ms, s.slopeDeg(qx, qz));
          const hh = s.height(qx, qz);
          if (W.config.hasSea && hh < 1) ms = 99;
          if (r <= 20) {
            lo = Math.min(lo, hh);
            hi = Math.max(hi, hh);
          }
        }
      }
      if (ms >= 8) continue;
      const score = (hi - lo) + ms * 0.2 + Math.hypot(dx, dz) * 0.004;
      if (!best || score < best.score) best = { x: px, z: pz, score };
    }
  }
  return best;
}

/**
 * Cliff/ridge launch: highest point within `radius` of (x, z) whose terrain drops ≥ `drop` m within 120 m in
 * the direction `headingDeg` (± 25°). Returns the edge point (≥ 4 m back from the steepest drop).
 */
export function findLaunch(W: NodeWorld, x: number, z: number, radius: number, headingDeg: number, drop = 40, tol = 50): { x: number; z: number; h: number; heading: number } | null {
  const s = W.sampler;
  let best: { x: number; z: number; h: number; heading: number } | null = null;
  let bestScore = -Infinity;
  for (let dz = -radius; dz <= radius; dz += 8) {
    for (let dx = -radius; dx <= radius; dx += 8) {
      if (dx * dx + dz * dz > radius * radius) continue;
      const px = x + dx;
      const pz = z + dz;
      const h = s.height(px, pz);
      for (let da = -tol; da <= tol; da += 5) {
        const hd = ((headingDeg + da) * Math.PI) / 180;
        const fx = Math.sin(hd);
        const fz = -Math.cos(hd);
        // the ground in front must fall away immediately and keep falling
        let ok = true;
        let maxAhead = -Infinity;
        for (let d = 6; d <= 72; d += 6) maxAhead = Math.max(maxAhead, s.height(px + fx * d, pz + fz * d) + d * 0.22);
        if (maxAhead > h) ok = false;
        const h120 = s.height(px + fx * 120, pz + fz * 120);
        if (h - h120 < drop) ok = false;
        if (!ok) continue;
        const score = h + (h - h120) * 0.3 - Math.hypot(dx, dz) * 0.05 - Math.abs(da) * 0.4;
        if (score > bestScore) {
          bestScore = score;
          best = { x: px, z: pz, h, heading: headingDeg + da };
        }
      }
    }
  }
  return best;
}
