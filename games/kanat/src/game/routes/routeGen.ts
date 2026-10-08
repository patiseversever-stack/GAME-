// Provisional route generator (integrator). Produces a flyable RouteDef over the real baked terrain when the
// routes agent has not delivered src/content/routes/<id>.json yet. PURE and deterministic: detMath trig,
// Math.sqrt/floor/round only, seeded Rng, coordinates rounded to cm — the same inputs give bit-identical
// routes on V8 and JavaScriptCore, so ghost codes and Günün Rotası stay verifiable across devices.
//
// Algorithm (docs/decisions/integrator.md "Geçici rota üreteci"):
//   1. Candidate paths: seeded start points/headings; each path follows the valley floor (cost = terrain height
//      ahead) with a bounded turn rate (radius ≥ 220 m), 40 m steps, length = wingsuit time × 44 m/s.
//   2. Energy line ("need"): backward pass need(s) = max(H(s) + c, need(s + ds) + ds / G) with G = 4.4 and the
//      opening point at H + 85 m. A glider can always follow it (it only has to sink ≥ 1/G).
//   3. Start: ridge/cliff = standing on the terrain (path rejected when the terrain cannot feed need(0));
//      balloon = max(need(0), H + 140). Forward pass dives from the start at 1:2 until it meets need(s).
//   4. Best candidate = lowest mean clearance (most proximity) among feasible paths; landing must be flat & dry.
//   5. Gates evenly along the line (centre ≥ H + R + 4), thermals on the line, landing 140 m past the opening point.
import { atan2, cos, DEG, sin, wrapPi } from '../../sim/math/detMath.ts';
import { Rng } from '../../sim/math/rng.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import type { RouteDef, RouteGate, RouteThermal, WorldId } from '../../sim/types.ts';

export interface RouteGenOptions {
  id: string;
  world: WorldId;
  index: number;
  difficulty: number;
  name: { tr: string; en: string };
  seed: number;
  startType: 'balon' | 'ucurum' | 'sirt';
  gateRadius: number;
  gates: number;
  thermalCount: number;
  thermalRadius: number;
  thermalW0: number;
  wind: { dirDeg: number; speed: number };
  /** Wingsuit phase seconds (jump → opening) the line should last for an expert. */
  wingsuitSec: number;
  /** Line clearance above the terrain where the energy budget allows (m). */
  clearance?: number;
  /** Starts closer than r to these points are rejected (keep the 4 routes of a world apart). */
  avoid?: readonly { x: number; z: number; r: number }[];
  /** Expert-bot calibration (score, s) when known; otherwise estimated from the line. */
  expertScore?: number;
  ustaGorevleri?: RouteDef['ustaGorevleri'];
  postcards?: string[];
}

const STEP = 40;
const GLIDE = 4.4;
const DIVE = 2.0;
const OPEN_AGL = 85;
const CANOPY_RUN = 140;
const TURN_R = 220;
const EXPERT_GROUND_SPEED = 44;

const r2 = (v: number): number => Math.round(v * 100) / 100;

interface Path {
  x: Float64Array;
  z: Float64Array;
  h: Float64Array;
  n: number;
}

function tracePath(s: TerrainSampler, x0: number, z0: number, h0: number, steps: number, out: Path): boolean {
  const b = s.bounds;
  const maxTurn = STEP / TURN_R;
  let x = x0;
  let z = z0;
  let hd = h0;
  out.x[0] = x;
  out.z[0] = z;
  out.h[0] = s.height(x, z);
  for (let i = 1; i <= steps; i++) {
    let best = Infinity;
    let bestD = 0;
    for (let k = -2; k <= 2; k++) {
      const d = (k * maxTurn) / 2;
      const a = hd + d;
      const sx = sin(a);
      const cz = -cos(a);
      let c = 0;
      c += s.height(x + sx * 80, z + cz * 80);
      c += 0.6 * s.height(x + sx * 200, z + cz * 200);
      c += 0.3 * s.height(x + sx * 400, z + cz * 400);
      const ex = x + sx * 400;
      const ez = z + cz * 400;
      if (ex < b.minX + 150 || ex > b.maxX - 150 || ez < b.minZ + 150 || ez > b.maxZ - 150) c += 4000;
      c += 4 * (k < 0 ? -k : k);
      if (c < best) {
        best = c;
        bestD = d;
      }
    }
    hd = wrapPi(hd + bestD);
    x += sin(hd) * STEP;
    z += -cos(hd) * STEP;
    if (x < b.minX + 100 || x > b.maxX - 100 || z < b.minZ + 100 || z > b.maxZ - 100) return false;
    out.x[i] = x;
    out.z[i] = z;
    out.h[i] = s.height(x, z);
  }
  out.n = steps + 1;
  return true;
}

interface Eval {
  feasible: boolean;
  cost: number;
  y0: number;
  line: Float64Array;
}

/** Ground height incl. the sea surface (never fly the energy line into the water). */
function surf(s: TerrainSampler, hasSea: boolean, h: number): number {
  return hasSea && h < 0 ? 0 : h;
}

function evaluate(s: TerrainSampler, p: Path, o: RouteGenOptions, hasSea: boolean, clearance: number, need: Float64Array, line: Float64Array): Eval {
  const n = p.n;
  const last = n - 1;
  const hEnd = surf(s, hasSea, p.h[last]);
  need[last] = hEnd + OPEN_AGL;
  for (let i = last - 1; i >= 0; i--) {
    const a = surf(s, hasSea, p.h[i]) + clearance;
    const b = need[i + 1] + STEP / GLIDE;
    need[i] = a > b ? a : b;
  }
  const h0 = p.h[0];
  let y0: number;
  if (o.startType === 'balon') {
    y0 = need[0] > h0 + 140 ? need[0] : h0 + 140;
  } else {
    y0 = h0 + 2;
  }
  let cost = 0;
  let minClear = Infinity;
  for (let i = 0; i < n; i++) {
    // the pilot gliding from the start at 1:G must never be asked to be above the energy line (cliff/ridge drop)
    if (need[i] > y0 - (i * STEP) / GLIDE + 15) return { feasible: false, cost: Infinity, y0, line };
    const dive = y0 - (i * STEP) / DIVE;
    const y = dive > need[i] ? dive : need[i];
    line[i] = y;
    const c = y - surf(s, hasSea, p.h[i]);
    if (i > 3 && c < minClear) minClear = c;
    cost += c;
  }
  cost /= n;
  // landing: flat, dry, inside bounds
  const lx = p.x[last] + (p.x[last] - p.x[last - 1]) * (CANOPY_RUN / STEP);
  const lz = p.z[last] + (p.z[last] - p.z[last - 1]) * (CANOPY_RUN / STEP);
  const slope = s.slopeDeg(lx, lz);
  const lh = s.height(lx, lz);
  if (hasSea && lh < 3) return { feasible: false, cost: Infinity, y0, line };
  cost += slope > 10 ? (slope - 10) * 25 : 0;
  // too much energy (start far above the landing) means a long boring dive; penalise heavily
  const drop = y0 - hEnd;
  const budget = (o.wingsuitSec * EXPERT_GROUND_SPEED) / GLIDE + OPEN_AGL;
  if (drop > budget * 1.6) cost += (drop - budget * 1.6) * 0.5;
  if (o.startType !== 'balon' && drop < budget * 0.55) return { feasible: false, cost: Infinity, y0, line };
  return { feasible: minClear >= clearance - 1, cost, y0, line };
}

function seedOf(o: RouteGenOptions): number {
  return o.seed >>> 0;
}

export interface GeneratedRoute {
  route: RouteDef;
  /** Wingsuit line length (m) and estimated expert time (s, jump → touchdown). */
  lineLength: number;
  estTimeSec: number;
}

/** Generate a route. Throws only when the terrain offers no feasible path at all (never for the baked worlds). */
export function generateRoute(s: TerrainSampler, o: RouteGenOptions): GeneratedRoute {
  const hasSea = (s as unknown as { terrain?: { hasSea?: boolean } }).terrain?.hasSea ?? o.world === 'likya';
  const clearance = o.clearance ?? o.gateRadius + 7;
  const length = o.wingsuitSec * EXPERT_GROUND_SPEED;
  const steps = Math.max(12, Math.round(length / STEP));
  const rng = new Rng(seedOf(o), 11);
  const b = s.bounds;
  const margin = Math.min(2600, length * 0.45 + 300);
  const pa: Path = { x: new Float64Array(steps + 1), z: new Float64Array(steps + 1), h: new Float64Array(steps + 1), n: 0 };
  const best: Path = { x: new Float64Array(steps + 1), z: new Float64Array(steps + 1), h: new Float64Array(steps + 1), n: 0 };
  const need = new Float64Array(steps + 1);
  const line = new Float64Array(steps + 1);
  const bestLine = new Float64Array(steps + 1);
  let bestCost = Infinity;
  let bestY0 = 0;
  const avoid = o.avoid ?? [];
  const tries = 160;
  for (let t = 0; t < tries; t++) {
    let x = rng.range(b.minX + margin, b.maxX - margin);
    let z = rng.range(b.minZ + margin, b.maxZ - margin);
    if (o.startType !== 'balon') {
      // ridge / cliff: climb to the local high point first (8 hill-climb steps of 30 m)
      for (let k = 0; k < 8; k++) {
        let bh = s.height(x, z);
        let bx = x;
        let bz = z;
        for (let a = 0; a < 8; a++) {
          const ang = a * 0.7853981633974483;
          const qx = x + sin(ang) * 30;
          const qz = z - cos(ang) * 30;
          const qh = s.height(qx, qz);
          if (qh > bh) {
            bh = qh;
            bx = qx;
            bz = qz;
          }
        }
        x = bx;
        z = bz;
      }
    }
    let blocked = false;
    for (let i = 0; i < avoid.length; i++) {
      const dx = x - avoid[i].x;
      const dz = z - avoid[i].z;
      if (dx * dx + dz * dz < avoid[i].r * avoid[i].r) blocked = true;
    }
    if (blocked) continue;
    if (hasSea && s.height(x, z) < 20) continue;
    const heading = rng.range(0, 6.283185307179586);
    // ridge starts: face the steepest drop
    let hd = heading;
    if (o.startType !== 'balon') {
      let low = Infinity;
      for (let a = 0; a < 16; a++) {
        const ang = a * 0.39269908169872414;
        const qh = s.height(x + sin(ang) * 160, z - cos(ang) * 160);
        if (qh < low) {
          low = qh;
          hd = ang;
        }
      }
    }
    if (!tracePath(s, x, z, hd, steps, pa)) continue;
    const ev = evaluate(s, pa, o, hasSea, clearance, need, line);
    if (!ev.feasible) continue;
    if (ev.cost < bestCost) {
      bestCost = ev.cost;
      bestY0 = ev.y0;
      best.x.set(pa.x);
      best.z.set(pa.z);
      best.h.set(pa.h);
      best.n = pa.n;
      bestLine.set(line);
    }
  }
  if (best.n === 0) throw new Error(`routeGen: no feasible path for ${o.id}`);
  return buildRoute(s, o, best, bestLine, bestY0, hasSea, clearance);
}

function buildRoute(s: TerrainSampler, o: RouteGenOptions, p: Path, lineY: Float64Array, y0: number, hasSea: boolean, clearance: number): GeneratedRoute {
  const n = p.n;
  const last = n - 1;
  // Resample the line every 3 steps (120 m) for the RouteDef polyline.
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i += 3) pts.push([r2(p.x[i]), r2(lineY[i]), r2(p.z[i])]);
  if ((last % 3) !== 0) pts.push([r2(p.x[last]), r2(lineY[last]), r2(p.z[last])]);
  const dirX = (p.x[last] - p.x[last - 1]) / STEP;
  const dirZ = (p.z[last] - p.z[last - 1]) / STEP;
  const lx = p.x[last] + dirX * CANOPY_RUN;
  const lz = p.z[last] + dirZ * CANOPY_RUN;
  const lh = s.height(lx, lz);
  pts.push([r2(lx), r2(lh + 30), r2(lz)]);

  // Gates: evenly between 12 % and 90 % of the wingsuit line.
  const gates: RouteGate[] = [];
  const g0 = 0.12;
  const g1 = 0.9;
  for (let k = 0; k < o.gates; k++) {
    const f = o.gates === 1 ? 0.5 : g0 + ((g1 - g0) * k) / (o.gates - 1);
    const fi = f * last;
    const i = Math.min(last - 1, Math.floor(fi));
    const t = fi - i;
    const x = p.x[i] + (p.x[i + 1] - p.x[i]) * t;
    const z = p.z[i] + (p.z[i + 1] - p.z[i]) * t;
    const ly = lineY[i] + (lineY[i + 1] - lineY[i]) * t;
    const ground = surf(s, hasSea, s.height(x, z));
    const y = ly > ground + o.gateRadius + 4 ? ly : ground + o.gateRadius + 4;
    let nx = p.x[i + 1] - p.x[i];
    let ny = lineY[i + 1] - lineY[i];
    let nz = p.z[i + 1] - p.z[i];
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    gates.push({ t: r2(f), pos: [r2(x), r2(y), r2(z)], normal: [Math.round(nx * 1e5) / 1e5, Math.round(ny * 1e5) / 1e5, Math.round(nz * 1e5) / 1e5], radius: o.gateRadius, kind: k === o.gates - 1 ? 'final' : 'normal' });
  }

  // Thermals: centred on the line, spread over 25–80 %.
  const thermals: RouteThermal[] = [];
  for (let k = 0; k < o.thermalCount; k++) {
    const f = o.thermalCount === 1 ? 0.5 : 0.25 + (0.55 * k) / (o.thermalCount - 1);
    const i = Math.min(last, Math.round(f * last));
    thermals.push({ pos: [r2(p.x[i]), r2(p.z[i])], radius: o.thermalRadius, w0: o.thermalW0, top: r2(lineY[i] + 160) });
  }

  const startHeading = atan2(p.x[1] - p.x[0], -(p.z[1] - p.z[0]));
  const hd = Math.round((startHeading / DEG) * 100) / 100;
  const lineLength = last * STEP;
  const estTimeSec = 0.8 + lineLength / EXPERT_GROUND_SPEED + 1.2 + OPEN_AGL / 5.5;
  const expertScore = o.expertScore ?? estimateExpertScore(p, lineY, hasSea, s, clearance, o);
  const route: RouteDef = {
    id: o.id,
    world: o.world,
    index: o.index,
    difficulty: o.difficulty,
    name: o.name,
    start: {
      type: o.startType,
      pos: [r2(p.x[0]), r2(y0), r2(p.z[0])],
      headingDeg: hd < 0 ? r2(hd + 360) : hd,
      speedKmh: o.startType === 'balon' ? 18 : 24,
    },
    line: pts,
    gates,
    thermals,
    landing: { center: [r2(lx), r2(lh), r2(lz)], radius: 25, zoneRadius: 250 },
    wind: { dirDeg: o.wind.dirDeg, speed: o.wind.speed },
    stars: [0, Math.round(expertScore * 0.5), Math.round(expertScore * 0.85)],
    expertScore,
    ustaGorevleri: o.ustaGorevleri ?? [],
    postcards: o.postcards ?? [],
  };
  return { route, lineLength, estTimeSec };
}

/**
 * Expert score estimate from the line geometry (used until the expert bot calibration table covers the route):
 * proximity at ×3 where the line hugs the terrain, gate chain, thermal entries, a 5 m landing ring + soft + bold.
 */
function estimateExpertScore(p: Path, lineY: Float64Array, hasSea: boolean, s: TerrainSampler, clearance: number, o: RouteGenOptions): number {
  let prox = 0;
  const dt = STEP / EXPERT_GROUND_SPEED;
  for (let i = 0; i < p.n; i++) {
    const c = lineY[i] - surf(s, hasSea, p.h[i]);
    const m = c <= clearance + 2 ? 3 : c <= clearance + 25 ? 2 : c <= clearance + 60 ? 1 : 0;
    prox += 100 * m * 1.15 * 1.6 * dt;
  }
  let gates = 0;
  for (let k = 0; k < o.gates; k++) gates += 500 + Math.min(1000, 100 * k);
  const thermals = 100 * o.thermalCount;
  return Math.round(prox + gates + thermals + 500 + 300 + 300);
}
