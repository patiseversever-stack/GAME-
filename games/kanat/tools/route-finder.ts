// Rota Kâşifi (route finder, brief §4.G.7) — routes agent. Node tool.
//
//   node tools/route-finder.ts [--world kapadokya] [--only w1r2] [--no-bots] [--write]
//
// Per career route the designer gives a start area, optional via points and a landing area (ROUTE_SPECS below,
// chosen from the terrain maps); the tool does the rest:
//   1. landing: flattest dry spot (slope < 8° within 40 m) near the requested landing area
//   2. start: balloon basket over the start point, or the best cliff/ridge edge (terrain falls ≥ 70 m within 120 m
//      in the flight direction) near it
//   3. path: A* on a 16 m grid (8 headings) between consecutive points; cost = length × (1 + valley/ridge
//      preference + low-relief penalty) + climb penalty + turn penalty; then curvature-limited smoothing
//      (turn radius ≥ V²/(g·tan φ) margin) and a straight final approach
//   4. src/sim/daily/build.ts: energy profile (need / dive limits), start height, gates (ring ≥ 4 m clear),
//      thermals, landing, control points
//   5. world content is rebuilt with the new routes (props get cleared around gates exactly like the game),
//      gates are re-cleared against the real props, then the bots fly: Kılavuz × 5 seeds (median → expertScore,
//      expertTimeSec), Dikkatli, Ortalama × 3 — results are printed; `--write` stores the JSON files.
// Corridor graphs for Günün Rotası and the postcard anchors are produced by tools/route-corridors.ts.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadWorldNode, type NodeWorld } from './terrain/loadNode.ts';
import { routeMeta, toRouteDefUsta } from '../src/content/meta/routes.meta.ts';
import { careerStarThresholds } from '../src/content/meta/progression.ts';
import { POSTCARDS } from '../src/content/meta/postcards.ts';
import { buildRoute, type BuildParams, type BuildResult, type BuildWorld, type RouteData } from '../src/sim/daily/build.ts';
import { SIM_VERSION } from '../src/sim/version.ts';
import type { RouteDef, WorldId } from '../src/sim/types.ts';
import { WORLD_IDS } from '../src/sim/types.ts';
import { astar, buildFeatures, findLanding, findLaunch, flyBot, loadToolWorld, minRadius, pathLength, readRouteJson, resampleXZ, ROUTES_DIR, smoothPath, terrainBuildWorld, type AStarCost, type Features, type ToolWorld } from './route-lib.ts';

export interface RouteSpec {
  id: string;
  /** Start point (balloon: basket position; cliff/ridge: search centre). */
  start: [number, number];
  /** Cliff/ridge launch search radius (m). */
  startSearch?: number;
  via: [number, number][];
  land: [number, number];
  landSearch?: number;
  /** Straight final approach length (m) into the landing target. */
  approach?: number;
  mode: AStarCost['mode'];
  lineClearance: number;
  needClearance: number;
  glideNeed: number;
  glideStart?: number;
  balloonMinAgl?: number;
  balloonMinAboveLanding?: number;
  balloonMargin?: number;
  gateCount?: number;
  rMin?: number;
  thermalFractions?: number[];
}

/** Designer input (see docs/decisions/routes.md for the reasoning per route). Coordinates: x east, z south (m). */
export const ROUTE_SPECS: Record<WorldId, RouteSpec[]> = {
  kapadokya: [],
  likya: [
    // Yalıyar Süzülüşü: from the Bezirgan rim straight down the big SW slope to the Kalkan-side terrace
    { id: 'w2r1', start: [-300, -2300], via: [[-1150, -1500]], land: [-2116, -704], mode: 'valley', lineClearance: 14, needClearance: 9, glideNeed: 4.2 },
    // Gulet Koyu: summit → SW gully → over the cove with the gulets → coastal terrace
    { id: 'w2r2', start: [1000, -1150], via: [[0, 0], [-700, 1000]], land: [-1350, 808], mode: 'valley', lineClearance: 11, needClearance: 7, glideNeed: 4.2 },
    // Kaya Kemeri: east summit → south valley → the rock arch → east bay
    { id: 'w2r3', start: [2450, -250], via: [[1700, 900], [900, 1700]], land: [1052, 2396], mode: 'valley', lineClearance: 9, needClearance: 6, glideNeed: 4.2 },
    // Mezar Cepheleri: plateau → west slope → the lighthouse cape → terrace
    { id: 'w2r4', start: [-600, -2900], via: [[-1700, -1900], [-2350, -1450]], land: [-2548, 272], mode: 'valley', lineClearance: 8, needClearance: 5, glideNeed: 4.2 },
  ],
  karadeniz: [],
  erciyes: [],
  pamukkale: [],
};

const MUSIC: Record<WorldId, { t: number; cue: string }[]> = {
  kapadokya: [
    { t: 0, cue: 'introWide' },
    { t: 0.4, cue: 'swell' },
    { t: 0.85, cue: 'jumpReady' },
  ],
  likya: [
    { t: 0, cue: 'introWide' },
    { t: 0.45, cue: 'swell' },
    { t: 0.85, cue: 'jumpReady' },
  ],
  karadeniz: [
    { t: 0, cue: 'introMist' },
    { t: 0.4, cue: 'swell' },
    { t: 0.85, cue: 'jumpReady' },
  ],
  erciyes: [
    { t: 0, cue: 'introWide' },
    { t: 0.35, cue: 'swell' },
    { t: 0.85, cue: 'jumpReady' },
  ],
  pamukkale: [
    { t: 0, cue: 'introSunset' },
    { t: 0.4, cue: 'swell' },
    { t: 0.85, cue: 'jumpReady' },
  ],
};

const COST: Record<AStarCost['mode'], AStarCost> = {
  valley: { mode: 'valley', wFeature: 2.2, wUp: 6, wTurn: 6, wRelief: 0.8, avoidWater: true },
  ridge: { mode: 'ridge', wFeature: 1.6, wUp: 5, wTurn: 6, wRelief: 0.6, avoidWater: true },
  free: { mode: 'free', wFeature: 0, wUp: 4, wTurn: 5, wRelief: 0.6, avoidWater: true },
};

export interface PathPlan {
  path: number[];
  launch: { x: number; z: number; heading: number } | null;
  land: { x: number; z: number };
}

/** Steps 1–3: landing, start, A* path, smoothing. */
export function planPath(W: NodeWorld, F: Features, spec: RouteSpec, startType: 'balon' | 'ucurum' | 'sirt'): PathPlan | null {
  const land = findLanding(W, spec.land[0], spec.land[1], spec.landSearch ?? 260);
  if (!land) {
    console.log(`  ${spec.id}: no landing near ${spec.land}`);
    return null;
  }
  const firstTarget = spec.via.length > 0 ? spec.via[0] : [land.x, land.z];
  let sx = spec.start[0];
  let sz = spec.start[1];
  let launch: PathPlan['launch'] = null;
  if (startType !== 'balon') {
    const hd = (Math.atan2(firstTarget[0] - sx, -(firstTarget[1] - sz)) * 180) / Math.PI;
    const L = findLaunch(W, sx, sz, spec.startSearch ?? 300, hd);
    if (!L) {
      console.log(`  ${spec.id}: no launch near ${spec.start}`);
      return null;
    }
    sx = L.x;
    sz = L.z;
    launch = { x: L.x, z: L.z, heading: L.heading };
  }
  // approach point: straight final leg into the target, from the side of the last via
  const last = spec.via.length > 0 ? spec.via[spec.via.length - 1] : [sx, sz];
  const ax0 = land.x - last[0];
  const az0 = land.z - last[1];
  const al = Math.hypot(ax0, az0) || 1;
  const appLen = spec.approach ?? 380;
  const app: [number, number] = [land.x - (ax0 / al) * appLen, land.z - (az0 / al) * appLen];
  const pts: [number, number][] = [[sx, sz]];
  if (launch) {
    // leave the edge straight along the launch heading for 160 m (the jump + speed-building dive)
    const h = (launch.heading * Math.PI) / 180;
    pts.push([sx + Math.sin(h) * 160, sz - Math.cos(h) * 160]);
  }
  for (const v of spec.via) pts.push(v);
  pts.push(app);
  const cost = COST[spec.mode];
  const out: number[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const seg = astar(F, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], cost);
    if (!seg) {
      console.log(`  ${spec.id}: A* failed ${pts[k]} → ${pts[k + 1]}`);
      return null;
    }
    if (out.length > 0) seg.splice(0, 2);
    out.push(...seg);
  }
  const smoothed = smoothPath(out, spec.rMin ?? 150, 20);
  // straight final approach
  const fin = resampleXZ([app[0], app[1], land.x, land.z], 20);
  fin.splice(0, 2);
  const path = [...smoothed, ...fin];
  return { path: smoothPath(path, spec.rMin ?? 150, 20), launch, land };
}

export function paramsFor(spec: RouteSpec, world: WorldId, pathLen: number, wind: { dirDeg: number; speed: number }): BuildParams {
  const meta = routeMeta(spec.id);
  if (!meta) throw new Error(`no meta for ${spec.id}`);
  const sOpen = pathLen - 150;
  const wsSec = sOpen / 48;
  const n = spec.gateCount ?? Math.min(20, Math.max(meta.minGates, Math.round(wsSec / 6.5)));
  return {
    id: spec.id,
    world,
    index: meta.index,
    difficulty: meta.difficulty,
    name: { tr: meta.name.tr, en: meta.name.en },
    startType: meta.startType as 'balon' | 'ucurum' | 'sirt',
    lineClearance: spec.lineClearance,
    needClearance: spec.needClearance,
    glideNeed: spec.glideNeed,
    glideStart: spec.glideStart ?? 4.0,
    balloonMinAgl: spec.balloonMinAgl ?? 110,
    balloonMinAboveLanding: spec.balloonMinAboveLanding,
    balloonMargin: spec.balloonMargin ?? 20,
    gateRadius: meta.gateRadius,
    gateCount: n,
    firstGateS: 170,
    lastGateBeforeOpen: 230,
    thermalCount: meta.thermalCount,
    thermalRadius: meta.thermalRadius,
    thermalW0: meta.thermalW0,
    thermalFractions: spec.thermalFractions,
    wind: { dirDeg: wind.dirDeg, speed: meta.windSpeed },
    ustaGorevleri: meta.usta.map((t) => toRouteDefUsta(t)),
    postcards: POSTCARDS.filter((p) => p.world === world && p.anchor.nearRoute === spec.id).map((p) => p.id),
    musicCues: MUSIC[world],
  };
}

export interface Bench {
  expertScore: number;
  expertTimeSec: number;
  expertRuns: { score: number; time: number; landed: boolean; stars: number; gates: string; dist: number; x3: number; threads: number }[];
  careful: { score: number; time: number; landed: boolean; gates: string; dist: number };
  average: { score: number; time: number; landed: boolean; stars: number }[];
}

function median(a: number[]): number {
  const b = [...a].sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)];
}

/** Kılavuz × 5 seeds (median), Dikkatli, Ortalama × 3 on the final world content. */
export function benchRoute(tw: ToolWorld, route: RouteDef, avgSeeds = 3): Bench {
  const runs = [1, 2, 3, 4, 5].map((seed) => flyBot(tw, route, 'expert', seed));
  const expertRuns = runs.map((r) => ({ score: Math.round(r.score), time: Math.round(r.timeSec * 10) / 10, landed: r.landed, stars: r.stars, gates: `${r.gatesPassed}/${r.gatesTotal}`, dist: Math.round(r.distToTarget * 10) / 10, x3: Math.round(r.x3Sec * 10) / 10, threads: r.threads }));
  const landedRuns = runs.filter((r) => r.landed);
  const expertScore = landedRuns.length > 0 ? Math.round(median(landedRuns.map((r) => r.score))) : 0;
  const expertTimeSec = landedRuns.length > 0 ? Math.round(median(landedRuns.map((r) => r.timeSec)) * 10) / 10 : 0;
  const c = flyBot(tw, route, 'careful', 1);
  const average: Bench['average'] = [];
  const withStars = { ...route, stars: careerStarThresholds(expertScore) as [number, number, number] };
  for (let s = 1; s <= avgSeeds; s++) {
    const a = flyBot(tw, withStars, 'average', 100 + s);
    average.push({ score: Math.round(a.score), time: Math.round(a.timeSec * 10) / 10, landed: a.landed, stars: a.stars });
  }
  return {
    expertScore,
    expertTimeSec,
    expertRuns,
    careful: { score: Math.round(c.score), time: Math.round(c.timeSec * 10) / 10, landed: c.landed, gates: `${c.gatesPassed}/${c.gatesTotal}`, dist: Math.round(c.distToTarget * 10) / 10 },
    average,
  };
}

export function finalize(route: RouteData, bench: Bench): RouteData {
  const out: RouteData = { ...route };
  out.expertScore = bench.expertScore;
  out.stars = careerStarThresholds(bench.expertScore) as [number, number, number];
  out.expertTimeSec = bench.expertTimeSec;
  out.simVersion = SIM_VERSION;
  return out;
}

export function writeRoute(route: RouteData, dir: string = ROUTES_DIR): void {
  mkdirSync(dir, { recursive: true });
  const ordered: Record<string, unknown> = {
    id: route.id,
    world: route.world,
    index: route.index,
    difficulty: route.difficulty,
    name: route.name,
    start: route.start,
    line: route.line,
    gates: route.gates,
    thermals: route.thermals,
    landing: route.landing,
    wind: route.wind,
    stars: route.stars,
    expertScore: route.expertScore,
    expertTimeSec: route.expertTimeSec,
    simVersion: route.simVersion,
    ustaGorevleri: route.ustaGorevleri,
    postcards: route.postcards,
    musicCues: route.musicCues,
  };
  writeFileSync(join(dir, `${route.id}.json`), JSON.stringify(ordered, null, 1) + '\n');
}

export interface WorldRun {
  world: WorldId;
  built: Record<string, BuildResult>;
  plans: Record<string, PathPlan>;
}

/** Steps 1–4 for every spec of a world against a build world (terrain-only first, then with real props). */
export function buildWorldRoutes(W: NodeWorld, F: Features, bw: BuildWorld, specs: RouteSpec[], plans: Record<string, PathPlan>, log: (s: string) => void): Record<string, BuildResult> {
  const out: Record<string, BuildResult> = {};
  for (const spec of specs) {
    const meta = routeMeta(spec.id);
    if (!meta) continue;
    let plan: PathPlan | null | undefined = plans[spec.id];
    if (!plan) {
      plan = planPath(W, F, spec, meta.startType as 'balon' | 'ucurum' | 'sirt');
      if (!plan) {
        log(`${spec.id}: no path`);
        continue;
      }
      plans[spec.id] = plan;
    }
    const L = pathLength(plan.path);
    const p = paramsFor(spec, W.config.id as WorldId, L, W.config.wind);
    const res = buildRoute(bw, plan.path, p);
    out[spec.id] = res;
    const estT = 0.8 + (L - 150) / 47 + 18;
    log(
      `${spec.id} len ${L.toFixed(0)} m rMin ${minRadius(plan.path).toFixed(0)} est ${estT.toFixed(0)} s (target ${meta.targetDurationSec.join('–')}) start+${res.startAboveLanding.toFixed(0)} m (budget ${meta.energy.startAboveLandingM.join('–')}) low ${(res.lowShare * 100).toFixed(0)}% gates ${res.route.gates.length} ${res.feasible ? 'ok' : 'PROBLEMS ' + res.problems.join('; ')}`,
    );
  }
  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const onlyWorld = args.includes('--world') ? (args[args.indexOf('--world') + 1] as WorldId) : null;
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
  const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : ROUTES_DIR;
  const write = args.includes('--write') || args.includes('--out');
  const bots = !args.includes('--no-bots');
  for (const w of WORLD_IDS) {
    if (onlyWorld && w !== onlyWorld) continue;
    const specs = ROUTE_SPECS[w].filter((s) => !only || only.includes(s.id));
    if (specs.length === 0) continue;
    const t0 = performance.now();
    const W = loadWorldNode(w);
    const F = buildFeatures(W);
    console.log(`\n== ${w} (features ${(performance.now() - t0).toFixed(0)} ms)`);
    const plans: Record<string, PathPlan> = {};
    // pass 1: terrain only
    const pass1 = buildWorldRoutes(W, F, terrainBuildWorld(w, W), specs, plans, (s) => console.log('  [terrain] ' + s));
    // world content with these routes (+ the other routes of the world from disk)
    const json: Record<string, RouteDef> = {};
    for (const id of ['1', '2', '3', '4'].map((k) => `w${WORLD_IDS.indexOf(w) + 1}r${k}`)) {
      const r = pass1[id]?.route ?? readRouteJson(id, outDir);
      if (r) json[id] = r;
    }
    let tw = loadToolWorld(w, json, W);
    // pass 2: gates/env against the real props
    const pass2 = buildWorldRoutes(W, F, tw.build, specs, plans, (s) => console.log('  [props]   ' + s));
    for (const id of Object.keys(pass2)) json[id] = pass2[id].route;
    tw = loadToolWorld(w, json, W);
    for (const spec of specs) {
      const r = pass2[spec.id];
      if (!r) continue;
      let route = r.route;
      if (bots) {
        const tb = performance.now();
        const b = benchRoute(tw, route);
        route = finalize(route, b);
        const meta = routeMeta(spec.id);
        console.log(
          `  ${spec.id} KILAVUZ ${b.expertScore} ${b.expertTimeSec}s [${b.expertRuns.map((e) => `${e.landed ? 'L' : 'X'}${e.score}/${e.time}s g${e.gates} d${e.dist} x3:${e.x3} th${e.threads}`).join(' | ')}]`,
        );
        console.log(`        DIKKATLI ${b.careful.landed ? 'landed' : 'FAILED'} ${b.careful.score} ${b.careful.time}s g${b.careful.gates} d${b.careful.dist} | ORTALAMA ${b.average.map((a) => `${a.landed ? a.stars + '*' : 'X'} ${a.score}`).join(', ')} | target ${meta?.targetDurationSec.join('–')} s | ${(performance.now() - tb).toFixed(0)} ms`);
      }
      if (write) writeRoute(route, outDir);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('route-finder.ts')) await main();
