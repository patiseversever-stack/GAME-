// Route builder shared by the offline Rota Kâşifi (tools/route-finder.ts) and the runtime Günün Rotası generator
// (owner: routes agent). PURE and deterministic (detMath, Math.sqrt/floor/round only): the same horizontal path
// gives a bit-identical RouteDef on V8 and JavaScriptCore.
//
// Input: a horizontal path (start → landing target) over the real terrain. Output: a full RouteDef whose ideal
// line is energy-feasible for a wingsuit (§4.G.5: trim glide ≈ 4.5, sink ≈ 9 m/s):
//
//   env(s)   highest surface (terrain, sea, prop tops) within ±8 m across the path
//   need(s)  backward pass from the opening point (ground + OPEN_AGL):
//            need(s) = max(env(s) + needClearance, need(s + ds) + ds / glideNeed)
//            = the lowest height from which the rest of the route is still reachable at glide `glideNeed` (< 4.5,
//            the margin pays for turns, gates and the careful pilot's +18 m)
//   start    balloon: y0 = max_s(need(s) + s / glideStart) + margin (+ optional floor);
//            cliff/ridge: the terrain at the start (+1.2 m); feasible iff its energy covers the same maximum
//   line(s)  forward pass: max(need(s), env(s) + lineClearance) but never descending steeper than DIVE (35°)
//   gates    evenly along the line, ring (radius R, normal = direction of travel) ≥ 4 m from every surface
//            (raised until clear); the line is lifted through each ring centre
//   thermals on the line in the middle part of the route, top above the line (full strength at line height)
//   landing  the path's end point (flat ground chosen by the caller); the line ends at the opening point
//            OPEN_BEFORE m before it, OPEN_AGL above the ground.

import { atan2, DEG } from '../math/detMath.ts';
import type { TerrainSampler } from '../terrain/types.ts';
import type { RouteDef, RouteGate, RouteThermal, WorldId } from '../types.ts';
import type { ObstacleField } from '../bots/obstacles.ts';

export const BUILD = {
  ds: 10,
  /** Line height above the ground at the canopy opening point (m) — inside the 60–90 m Cesur Açılış window. */
  openAgl: 84,
  /** Opening point distance before the landing target along the path (canopy glide ≈ 2:1). */
  openBefore: 150,
  /** Steepest line descent (tan 35°). */
  dive: 0.7,
  /** Ring clearance from every surface (brief §2.5 Mod 2: no gate closer than 4 m). */
  gateClear: 4,
  /** Landing ring radius and zone radius (§2.2). */
  landingRadius: 25,
  zoneRadius: 250,
} as const;

/** What the builder may query. */
export interface BuildWorld {
  world: WorldId;
  sampler: TerrainSampler;
  obstacles: ObstacleField | null;
  hasSea: boolean;
  /** Distance from a point to the nearest static surface (terrain, props, water); ≥ 45 → may be Infinity. */
  clearance: (x: number, y: number, z: number) => number;
}

export interface MusicCue {
  t: number;
  cue: string;
}

/** RouteDef plus the optional benchmark/presentation fields the content carries (§4.G.7). */
export type RouteData = RouteDef & {
  expertTimeSec?: number;
  simVersion?: number;
  musicCues?: MusicCue[];
  expertGhost?: string;
};

export interface BuildParams {
  id: string;
  world: WorldId;
  index: number;
  difficulty: number;
  name: { tr: string; en: string };
  startType: 'balon' | 'ucurum' | 'sirt';
  /** Clearance of the ideal line where the energy allows (m). */
  lineClearance: number;
  /** Clearance used by the need pass (m) — the lowest the line ever gets. */
  needClearance: number;
  glideNeed: number;
  glideStart: number;
  /** Balloon start: minimum height above the landing target (m) and above the terrain under the basket. */
  balloonMinAboveLanding?: number;
  balloonMinAgl?: number;
  /** Balloon start: extra margin above the computed minimum (m). */
  balloonMargin?: number;
  gateRadius: number;
  gateCount: number;
  /** Arc length of the first gate (m) and the final gate's distance before the opening point (m). */
  firstGateS: number;
  lastGateBeforeOpen: number;
  /** Gate arc positions as fractions of [firstGateS, sOpen − lastGateBeforeOpen] (optional; default even). */
  gateFractions?: readonly number[];
  thermalCount: number;
  thermalRadius: number;
  thermalW0: number;
  /** Thermal arc positions as fractions of the opening arc length (default evenly in 0.25–0.7). */
  thermalFractions?: readonly number[];
  wind: { dirDeg: number; speed: number };
  ustaGorevleri: RouteDef['ustaGorevleri'];
  postcards: string[];
  musicCues?: MusicCue[];
  /** Line control points (30–80). Default: one per ~70 m clamped to that range. */
  controlPoints?: number;
}

export interface BuildProfile {
  n: number;
  s: Float64Array;
  x: Float64Array;
  z: Float64Array;
  env: Float64Array;
  need: Float64Array;
  y: Float64Array;
  iOpen: number;
}

export interface BuildResult {
  route: RouteData;
  profile: BuildProfile;
  feasible: boolean;
  problems: string[];
  /** Start height above the landing target (m). */
  startAboveLanding: number;
  /** Fraction of the line within 15 m of the surface (proximity share). */
  lowShare: number;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;

/** Resample a polyline (flat xz pairs) every `ds` m of arc length. */
export function resamplePath(xz: readonly number[], ds: number): { x: Float64Array; z: Float64Array; s: Float64Array } {
  const m = xz.length / 2;
  let total = 0;
  for (let i = 1; i < m; i++) {
    const dx = xz[i * 2] - xz[i * 2 - 2];
    const dz = xz[i * 2 + 1] - xz[i * 2 - 1];
    total += Math.sqrt(dx * dx + dz * dz);
  }
  const n = Math.max(2, Math.floor(total / ds) + 1);
  const x = new Float64Array(n);
  const z = new Float64Array(n);
  const s = new Float64Array(n);
  let seg = 0;
  let segStart = 0;
  let segLen = m > 1 ? Math.sqrt((xz[2] - xz[0]) * (xz[2] - xz[0]) + (xz[3] - xz[1]) * (xz[3] - xz[1])) : 0;
  for (let i = 0; i < n; i++) {
    const target = i === n - 1 ? total : i * ds;
    while (seg < m - 2 && segStart + segLen < target) {
      segStart += segLen;
      seg++;
      const dx = xz[seg * 2 + 2] - xz[seg * 2];
      const dz = xz[seg * 2 + 3] - xz[seg * 2 + 1];
      segLen = Math.sqrt(dx * dx + dz * dz);
    }
    const t = segLen > 1e-9 ? (target - segStart) / segLen : 0;
    const tt = t < 0 ? 0 : t > 1 ? 1 : t;
    x[i] = xz[seg * 2] + (xz[seg * 2 + 2] - xz[seg * 2]) * tt;
    z[i] = xz[seg * 2 + 1] + (xz[seg * 2 + 3] - xz[seg * 2 + 1]) * tt;
    s[i] = target;
  }
  return { x, z, s };
}

function surfaceTop(w: BuildWorld, x: number, z: number): number {
  if (w.obstacles) return w.obstacles.surfaceTop(x, z);
  const h = w.sampler.height(x, z);
  return w.hasSea && h < 0 ? 0 : h;
}

/** Highest surface across the path (±halfWidth) at sample i. */
function envAt(w: BuildWorld, x: Float64Array, z: Float64Array, i: number, halfWidth: number): number {
  const n = x.length;
  const a = i > 0 ? i - 1 : 0;
  const b = i < n - 1 ? i + 1 : n - 1;
  let tx = x[b] - x[a];
  let tz = z[b] - z[a];
  const l = Math.sqrt(tx * tx + tz * tz);
  if (l > 1e-9) {
    tx /= l;
    tz /= l;
  }
  let e = -1e9;
  for (let k = -2; k <= 2; k++) {
    const o = (k * halfWidth) / 2;
    const h = surfaceTop(w, x[i] - tz * o, z[i] + tx * o);
    if (h > e) e = h;
  }
  return e;
}

/** Ring clearance test: centre, half-radius and full-radius circles (16 points each) ≥ `clear` from surfaces. */
export function ringClear(w: BuildWorld, cx: number, cy: number, cz: number, nx: number, ny: number, nz: number, R: number, clear: number): boolean {
  // orthonormal basis (u horizontal, v = n × u)
  let ux = -nz;
  let uz = nx;
  const ul = Math.sqrt(ux * ux + uz * uz);
  if (ul < 1e-6) {
    ux = 1;
    uz = 0;
  } else {
    ux /= ul;
    uz /= ul;
  }
  const vx = ny * uz;
  const vy = nz * ux - nx * uz;
  const vz = -ny * ux;
  if (w.clearance(cx, cy, cz) < clear) return false;
  for (let ring = 1; ring <= 2; ring++) {
    const r = (R * ring) / 2;
    for (let k = 0; k < 16; k++) {
      const c = RING_COS[k];
      const s = RING_SIN[k];
      const px = cx + (ux * c + vx * s) * r;
      const py = cy + vy * s * r;
      const pz = cz + (uz * c + vz * s) * r;
      if (w.clearance(px, py, pz) < clear) return false;
    }
  }
  return true;
}

// cos/sin of k·22.5° (exact constants: no runtime trig)
const RING_COS: readonly number[] = [1, 0.9238795325112867, 0.7071067811865476, 0.3826834323650898, 0, -0.3826834323650898, -0.7071067811865476, -0.9238795325112867, -1, -0.9238795325112867, -0.7071067811865476, -0.3826834323650898, 0, 0.3826834323650898, 0.7071067811865476, 0.9238795325112867];
const RING_SIN: readonly number[] = [0, 0.3826834323650898, 0.7071067811865476, 0.9238795325112867, 1, 0.9238795325112867, 0.7071067811865476, 0.3826834323650898, 0, -0.3826834323650898, -0.7071067811865476, -0.9238795325112867, -1, -0.9238795325112867, -0.7071067811865476, -0.3826834323650898];

/** Max ground slope (deg) over a disc of radius r around (x, z) (9 probes). */
export function maxSlopeDeg(s: TerrainSampler, x: number, z: number, r: number): number {
  let m = s.slopeDeg(x, z);
  for (let k = 0; k < 16; k += 2) {
    const v = s.slopeDeg(x + RING_COS[k] * r, z + RING_SIN[k] * r);
    if (v > m) m = v;
  }
  return m;
}

/** Height spread (max − min) over a disc of radius r (17 probes) — flatness of a landing zone. */
export function heightSpread(s: TerrainSampler, x: number, z: number, r: number): number {
  let lo = s.height(x, z);
  let hi = lo;
  for (let ring = 1; ring <= 2; ring++) {
    for (let k = 0; k < 16; k += 2) {
      const h = s.height(x + RING_COS[k] * r * ring * 0.5, z + RING_SIN[k] * r * ring * 0.5);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
  }
  return hi - lo;
}

/** Build a RouteDef from a horizontal path (flat [x0, z0, x1, z1, …], start → landing target). */
export function buildRoute(w: BuildWorld, pathXZ: readonly number[], p: BuildParams): BuildResult {
  const problems: string[] = [];
  const ds = BUILD.ds;
  const rs = resamplePath(pathXZ, ds);
  const n = rs.x.length;
  const S = rs.s[n - 1];
  const sampler = w.sampler;
  // opening point
  let iOpen = n - 1;
  while (iOpen > 1 && rs.s[iOpen] > S - BUILD.openBefore) iOpen--;
  const env = new Float64Array(n);
  for (let i = 0; i < n; i++) env[i] = envAt(w, rs.x, rs.z, i, 8);
  // need: backward pass from the opening point
  const need = new Float64Array(n);
  const gOpen = sampler.height(rs.x[iOpen], rs.z[iOpen]);
  need[iOpen] = (gOpen > env[iOpen] ? gOpen : env[iOpen]) + BUILD.openAgl;
  for (let i = iOpen + 1; i < n; i++) need[i] = env[i] + 20;
  for (let i = iOpen - 1; i >= 0; i--) {
    const a = env[i] + p.needClearance;
    const b = need[i + 1] + (rs.s[i + 1] - rs.s[i]) / p.glideNeed;
    need[i] = a > b ? a : b;
  }
  // energy required at the start (height-equivalent with trim speed)
  let req = -1e9;
  for (let i = 0; i <= iOpen; i++) {
    const v = need[i] + rs.s[i] / p.glideStart;
    if (v > req) req = v;
  }
  const land = { x: rs.x[n - 1], z: rs.z[n - 1], y: sampler.height(rs.x[n - 1], rs.z[n - 1]) };
  if (w.hasSea && land.y < 0.5) problems.push('landing in water');
  // start
  const sx = rs.x[0];
  const sz = rs.z[0];
  const g0 = sampler.height(sx, sz);
  let y0: number;
  if (p.startType === 'balon') {
    y0 = req + (p.balloonMargin ?? 20);
    const minA = land.y + (p.balloonMinAboveLanding ?? 0);
    if (y0 < minA) y0 = minA;
    const minG = env[0] + (p.balloonMinAgl ?? 120);
    if (y0 < minG) y0 = minG;
  } else {
    y0 = (g0 > 0 ? g0 : 0) + 1.2;
    // cliff/ridge exits leave at flying speed (brief §4.G.7 example: 150 km/h): no speed-building dive
    if (y0 < req) problems.push(`start too low by ${(req - y0).toFixed(0)} m`);
  }
  // line: forward pass
  const y = new Float64Array(n);
  y[0] = y0;
  for (let i = 1; i < n; i++) {
    let t = env[i] + p.lineClearance;
    if (need[i] > t) t = need[i];
    const dmin = y[i - 1] - (rs.s[i] - rs.s[i - 1]) * BUILD.dive;
    y[i] = t > dmin ? t : dmin;
  }
  // gates
  const gates: RouteGate[] = [];
  const sOpen = rs.s[iOpen];
  const gA = p.firstGateS;
  const gB = sOpen - p.lastGateBeforeOpen;
  const N = p.gateCount;
  if (gB - gA < 100 * (N - 1)) problems.push(`gate span ${(gB - gA).toFixed(0)} m too short for ${N} gates`);
  for (let k = 0; k < N; k++) {
    const f = p.gateFractions && p.gateFractions.length === N ? p.gateFractions[k] : N > 1 ? k / (N - 1) : 0;
    const sg = gA + (gB - gA) * f;
    let i = Math.floor(sg / ds);
    if (i < 1) i = 1;
    if (i > iOpen - 1) i = iOpen - 1;
    const a = i - 2 > 0 ? i - 2 : 0;
    const b = i + 2 < n - 1 ? i + 2 : n - 1;
    let tx = rs.x[b] - rs.x[a];
    let ty = y[b] - y[a];
    let tz = rs.z[b] - rs.z[a];
    const tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
    tx /= tl;
    ty /= tl;
    tz /= tl;
    const gx = rs.x[i];
    const gz = rs.z[i];
    let gy = y[i];
    let lift = 0;
    while (!ringClear(w, gx, gy, gz, tx, ty, tz, p.gateRadius, BUILD.gateClear) && lift < 80) {
      gy += 1;
      lift += 1;
    }
    if (lift >= 80) problems.push(`gate ${k} cannot be cleared`);
    // lift the line through the ring centre (smooth ±12 samples)
    if (gy > y[i]) {
      const dy = gy - y[i];
      for (let j = i - 12; j <= i + 12; j++) {
        if (j < 1 || j > iOpen) continue;
        const d = j < i ? i - j : j - i;
        const want = y[i] + dy * (1 - (d * d) / 169);
        if (want > y[j]) y[j] = want;
      }
      y[i] = gy;
    }
    gates.push({ t: r2(rs.s[i] / sOpen), pos: [r2(gx), r2(gy), r2(gz)], normal: [r2(tx * 1000) / 1000, r2(ty * 1000) / 1000, r2(tz * 1000) / 1000], radius: p.gateRadius, kind: k === N - 1 ? 'final' : 'normal' });
  }
  // thermals: on the line, top above it so the column is at full strength where the pilot flies
  const thermals: RouteThermal[] = [];
  for (let k = 0; k < p.thermalCount; k++) {
    const f = p.thermalFractions && p.thermalFractions.length === p.thermalCount ? p.thermalFractions[k] : p.thermalCount > 1 ? 0.25 + (0.45 * k) / (p.thermalCount - 1) : 0.45;
    let i = Math.floor((sOpen * f) / ds);
    if (i < 1) i = 1;
    if (i > iOpen) i = iOpen;
    thermals.push({ pos: [r2(rs.x[i]), r2(rs.z[i])], radius: p.thermalRadius, w0: p.thermalW0, top: r2(y[i] + 160) });
  }
  // control points: evenly by arc length up to the opening point, gate centres included exactly
  let nCtl = p.controlPoints ?? Math.round(sOpen / 70) + 1;
  if (nCtl < 30) nCtl = 30;
  if (nCtl > 80) nCtl = 80;
  const ctlIdx: number[] = [];
  for (let k = 0; k < nCtl; k++) ctlIdx.push(Math.round((iOpen * k) / (nCtl - 1)));
  const gateIdx = gates.map((g) => Math.round((g.t * sOpen) / ds));
  const all = new Set<number>(ctlIdx);
  for (const gi of gateIdx) {
    // replace the nearest control point by the gate sample (keeps the count)
    let best = -1;
    let bd = 1e9;
    for (const c of all) {
      const d = c > gi ? c - gi : gi - c;
      if (d < bd && c !== 0 && c !== iOpen) {
        bd = d;
        best = c;
      }
    }
    if (best >= 0 && bd <= 4) all.delete(best);
    all.add(gi);
  }
  const idx = [...all].sort((a, b) => a - b);
  const line: [number, number, number][] = idx.map((i) => [r2(rs.x[i]), r2(y[i]), r2(rs.z[i])]);
  // gate centres exactly on the line
  for (let k = 0; k < gates.length; k++) {
    const j = idx.indexOf(gateIdx[k]);
    if (j >= 0) line[j] = [gates[k].pos[0], gates[k].pos[1], gates[k].pos[2]];
  }
  // proximity share (line within 15 m of the surface)
  let low = 0;
  for (let i = 0; i <= iOpen; i++) if (y[i] - env[i] < 15) low++;
  const hd = atan2(rs.x[1] - rs.x[0], -(rs.z[1] - rs.z[0])) / DEG;
  // Balloon: a step off the basket (18 km/h) and a free dive (§1 film: freefall, wings at 0.8 s). Cliff/ridge:
  // the run-and-exit at flying speed of the brief's route example (150 km/h) — an 8 m DEM has no vertical
  // BASE walls, so a slow exit would ski down the slope.
  const startSpeed = p.startType === 'balon' ? 18 : 150;
  const route: RouteData = {
    id: p.id,
    world: p.world,
    index: p.index,
    difficulty: p.difficulty,
    name: { tr: p.name.tr, en: p.name.en },
    start: { type: p.startType, pos: [r2(sx), r2(y0), r2(sz)], headingDeg: r2(hd < 0 ? hd + 360 : hd), speedKmh: startSpeed },
    line,
    gates,
    thermals,
    landing: { center: [r2(land.x), r2(land.y), r2(land.z)], radius: BUILD.landingRadius, zoneRadius: BUILD.zoneRadius },
    wind: { dirDeg: p.wind.dirDeg, speed: p.wind.speed },
    stars: [0, 0, 0],
    expertScore: 0,
    ustaGorevleri: p.ustaGorevleri,
    postcards: p.postcards,
  };
  if (p.musicCues) route.musicCues = p.musicCues;
  return {
    route,
    profile: { n, s: rs.s, x: rs.x, z: rs.z, env, need, y, iOpen },
    feasible: problems.length === 0,
    problems,
    startAboveLanding: y0 - land.y,
    lowShare: iOpen > 0 ? low / (iOpen + 1) : 0,
  };
}
