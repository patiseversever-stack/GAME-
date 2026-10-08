// Per-world gameplay content shared by the sim and the renderer (integrator): the 4 career routes, the balloon
// set (incl. one start balloon per balloon-start route), the static props and their collision index.
// PURE (no DOM / three.js): Node scripts (dev/integrator.routes.ts) and the browser build the exact same content,
// so collision == visuals and ghost codes replay identically everywhere.
//
// Route source priority: src/content/routes/<id>.json (routes agent, passed in as `json`) → provisional
// generator (src/game/routes/routeGen.ts). Balloon anchors use only route starts/landings and the start→landing
// chord, so editing a route's interior line never moves the balloons.
import { POSTCARDS } from '../../content/meta/postcards.ts';
import { routesOfWorld, toRouteDefUsta } from '../../content/meta/routes.meta.ts';
import type { RouteMeta } from '../../content/meta/types.ts';
import { fnv1a32 } from '../../sim/math/hash.ts';
import { balloonPos, balloonsFor } from '../../sim/world/balloons.ts';
import { buildProps } from '../../sim/world/props.ts';
import { PropIndex } from '../../sim/world/propIndex.ts';
import { TUNING } from '../../sim/data/tuning.ts';
import type { TerrainSampler } from '../../sim/terrain/types.ts';
import type { BalloonDef, PropInstance, RouteDef, WorldId } from '../../sim/types.ts';
import { generateRoute, type LaunchRock } from './routeGen.ts';
import { PROVISIONAL_BENCH } from './provisionalBench.ts';

/** The world.json subset this module reads (WorldConfig fits). */
export interface WorldContentConfig {
  id: WorldId;
  hasSea: boolean;
  wind: { dirDeg: number; speed: number };
  props: Record<string, { count?: number; mask?: string; seed?: number }>;
}

export interface RouteBench {
  expertScore: number;
  expertTimeSec: number;
}

export interface WorldContent {
  world: WorldId;
  routes: RouteDef[];
  /** Which routes came from the generator (false = routes agent JSON). */
  provisional: Record<string, boolean>;
  bench: Record<string, RouteBench>;
  balloons: BalloonDef[];
  /** Balloon id of each balloon-start route's basket (route id → balloon id). */
  startBalloon: Record<string, number>;
  props: PropInstance[];
  propIndex: PropIndex;
  buildMs: number;
}

export function routeSeed(id: string): number {
  return fnv1a32(`KANAT-route-${id}`);
}

/** Envelope centre of a start balloon so that `startPos` is on the front rim of its basket. */
export function startBalloonDef(id: number, startPos: readonly [number, number, number], headingDeg: number, pattern: number): BalloonDef {
  const hd = (headingDeg * Math.PI) / 180;
  const fx = Math.round(Math.sin(hd) * 1e6) / 1e6;
  const fz = Math.round(-Math.cos(hd) * 1e6) / 1e6;
  const envelopeH = 20;
  const basketY = startPos[1] - 0.6;
  const cy = basketY + TUNING.balloon.basketBelow + envelopeH * 0.5;
  return {
    id,
    p0: [startPos[0] - fx * 1.0, cy, startPos[2] - fz * 1.0],
    drift: [0, 0, 0],
    amp: [0, 0, 0],
    omega: 0.1,
    phase: 0,
    rise: 0,
    pattern,
    envelopeH,
    envelopeR: 8,
  };
}

function routeFromMeta(meta: RouteMeta, sampler: TerrainSampler, cfg: WorldContentConfig, avoid: { x: number; z: number; r: number }[]): { route: RouteDef; rock: LaunchRock | null } {
  const bench = PROVISIONAL_BENCH[meta.id];
  const g = generateRoute(sampler, {
    id: meta.id,
    world: meta.world,
    index: meta.index,
    difficulty: meta.difficulty,
    name: { tr: meta.name.tr, en: meta.name.en },
    seed: routeSeed(meta.id),
    startType: meta.startType,
    gateRadius: meta.gateRadius,
    gates: meta.minGates,
    thermalCount: meta.thermalCount,
    thermalRadius: meta.thermalRadius,
    thermalW0: meta.thermalW0,
    wind: { dirDeg: cfg.wind.dirDeg, speed: meta.windSpeed },
    wingsuitSec: meta.energy.wingsuitSec[1],
    avoid,
    expertScore: bench?.expertScore,
    ustaGorevleri: meta.usta.map((t) => toRouteDefUsta(t)),
    postcards: POSTCARDS.filter((p) => p.world === meta.world && (p as unknown as { placement?: { nearRoute?: string } }).placement?.nearRoute === meta.id).map((p) => p.id),
  });
  return { route: g.route, rock: g.launchRock };
}

function lerp3(a: readonly number[], b: readonly number[], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Line height at a horizontal chord fraction (nearest line vertex). */
function lineYNear(route: RouteDef, x: number, z: number): number {
  let best = Infinity;
  let y = route.start.pos[1];
  for (const p of route.line) {
    const d = (p[0] - x) * (p[0] - x) + (p[2] - z) * (p[2] - z);
    if (d < best) {
      best = d;
      y = p[1];
    }
  }
  return y;
}

/** First-route showcase (§1 film): bend the line through a threadable balloon pair at ~55 % (generated routes only). */
function threadShowcase(route: RouteDef, balloons: BalloonDef[], sampler: TerrainSampler): void {
  const n = route.line.length;
  if (n < 6) return;
  let total = 0;
  const cum: number[] = [0];
  for (let i = 1; i < n; i++) {
    const a = route.line[i - 1];
    const b = route.line[i];
    total += Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[2] - a[2]) * (b[2] - a[2]));
    cum.push(total);
  }
  const pos = new Float64Array(3);
  const posB = new Float64Array(3);
  let bestScore = Infinity;
  let bestMid: [number, number, number] | null = null;
  let bestIdx = -1;
  for (let i = 0; i < balloons.length; i++) {
    for (let j = i + 1; j < balloons.length; j++) {
      // arrival time estimate at the pair: 0.8 s jump + 44 m/s
      balloonPos(balloons[i], 0, pos);
      balloonPos(balloons[j], 0, posB);
      const dx0 = pos[0] - posB[0];
      const dz0 = pos[2] - posB[2];
      if (dx0 * dx0 + dz0 * dz0 > 34 * 34) continue;
      // nearest line vertex in the 35–75 % window
      for (let k = 1; k < n - 1; k++) {
        const f = cum[k] / total;
        if (f < 0.35 || f > 0.75) continue;
        const t = 0.8 + cum[k] / 44;
        balloonPos(balloons[i], t, pos);
        balloonPos(balloons[j], t, posB);
        const dx = pos[0] - posB[0];
        const dy = pos[1] - posB[1];
        const dz = pos[2] - posB[2];
        if (dx * dx + dy * dy + dz * dz > 34 * 34) continue;
        const mx = (pos[0] + posB[0]) * 0.5;
        const my = (pos[1] + posB[1]) * 0.5;
        const mz = (pos[2] + posB[2]) * 0.5;
        const p = route.line[k];
        const lat = Math.sqrt((p[0] - mx) * (p[0] - mx) + (p[2] - mz) * (p[2] - mz));
        const ground = sampler.height(mx, mz);
        if (my < ground + 30) continue;
        const sc = lat + Math.abs(p[1] - my) * 2 + Math.abs(f - 0.55) * 400;
        if (sc < bestScore) {
          bestScore = sc;
          bestMid = [Math.round(mx * 100) / 100, Math.round(my * 100) / 100, Math.round(mz * 100) / 100];
          bestIdx = k;
        }
      }
    }
  }
  if (!bestMid || bestIdx < 0 || bestScore > 260) return;
  route.line[bestIdx] = bestMid;
}

export interface BuildWorldContentOptions {
  /** Routes from src/content/routes/*.json keyed by id (browser: import.meta.glob; Node: fs). */
  json?: Readonly<Record<string, RouteDef>>;
  /** Pamukkale/other water bodies are the caller's business (FlightSim `water`). */
  now?: () => number;
}

export function buildWorldContent(world: WorldId, sampler: TerrainSampler, cfg: WorldContentConfig, opts: BuildWorldContentOptions = {}): WorldContent {
  const clock = opts.now ?? (() => 0);
  const t0 = clock();
  const metas = routesOfWorld(world);
  const routes: RouteDef[] = [];
  const provisional: Record<string, boolean> = {};
  const avoid: { x: number; z: number; r: number }[] = [];
  const rocks: LaunchRock[] = [];
  for (const meta of metas) {
    const json = opts.json?.[meta.id];
    let r: RouteDef;
    if (json) {
      r = json;
      provisional[meta.id] = false;
    } else {
      const g = routeFromMeta(meta, sampler, cfg, avoid);
      r = g.route;
      if (g.rock) rocks.push(g.rock);
      provisional[meta.id] = true;
    }
    avoid.push({ x: r.start.pos[0], z: r.start.pos[2], r: 700 });
    routes.push(r);
  }

  // Balloons: anchors on starts, landings and the start→landing chords (stable under interior line edits).
  let balloons: BalloonDef[] = [];
  const startBalloon: Record<string, number> = {};
  const hasBalloons = world === 'kapadokya' || world === 'pamukkale';
  if (hasBalloons) {
    const anchors: [number, number, number][] = [];
    routes.forEach((r, ri) => {
      const s = r.start.pos;
      const l: [number, number, number] = [r.landing.center[0], r.landing.center[1] + 120, r.landing.center[2]];
      const fr = ri === 0 ? [0, 0, 0.12, 0.3, 0.45, 0.55, 0.55, 0.65, 0.8] : [0, 0.4, 0.75, 1];
      for (const f of fr) {
        const p = lerp3(s, l, f);
        p[1] = f === 0 ? s[1] + 10 : lineYNear(r, p[0], p[2]) + 10;
        anchors.push(p);
      }
    });
    const bcfg = cfg.props.balloons;
    balloons = balloonsFor(world, sampler, bcfg?.seed ?? 7, {
      count: bcfg?.count,
      anchors,
      avoid: routes.map((r) => ({ x: r.start.pos[0], z: r.start.pos[2], r: 30 })),
      wind: cfg.wind,
    });
    // the first route is the §1 showcase: bend its line through a balloon pair (generated routes only)
    if (provisional[routes[0].id]) threadShowcase(routes[0], balloons, sampler);
    let id = balloons.length;
    routes.forEach((r, k) => {
      if (r.start.type !== 'balon') return;
      startBalloon[r.id] = id;
      balloons.push(startBalloonDef(id, r.start.pos, r.start.headingDeg, (k * 5 + 3) % 12));
      id++;
    });
  }

  // Props: nothing inside gates, landing targets and start points of the career routes.
  const clear: { x: number; z: number; r: number }[] = [];
  for (const r of routes) {
    for (const g of r.gates) clear.push({ x: g.pos[0], z: g.pos[2], r: g.radius + 6 });
    clear.push({ x: r.landing.center[0], z: r.landing.center[2], r: r.landing.radius + 20 });
    clear.push({ x: r.start.pos[0], z: r.start.pos[2], r: 25 });
  }
  const props = buildProps(world, sampler, { props: cfg.props, hasSea: cfg.hasSea, wind: cfg.wind, clear });
  // launch rock towers of generated ridge/cliff routes (collidable + rendered from the same prims)
  for (const k of rocks) {
    props.push({
      id: props.length,
      type: 'rock',
      variant: 0,
      pos: [k.x, k.baseY, k.z],
      yaw: 0,
      scale: 1,
      prims: [{ kind: 'cone', base: [k.x, k.baseY, k.z], h: Math.round((k.topY - k.baseY) * 100) / 100, r0: k.r0, r1: k.r1 }],
      params: { rx: k.r0, ry: (k.topY - k.baseY) * 0.5, rz: k.r0, seed: props.length },
    });
  }
  const propIndex = new PropIndex(props);

  const bench: Record<string, RouteBench> = {};
  for (const r of routes) {
    const b = PROVISIONAL_BENCH[r.id];
    bench[r.id] = { expertScore: r.expertScore, expertTimeSec: b?.expertTimeSec ?? estimateTime(r) };
  }
  return { world, routes, provisional, bench, balloons, startBalloon, props, propIndex, buildMs: clock() - t0 };
}

/** Rough expert time (s, jump → touchdown) from the line length. */
export function estimateTime(r: RouteDef): number {
  let len = 0;
  for (let i = 1; i < r.line.length; i++) {
    const a = r.line[i - 1];
    const b = r.line[i];
    len += Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[2] - a[2]) * (b[2] - a[2]));
  }
  return Math.round((0.8 + len / 44 + 17) * 10) / 10;
}

export { routeFromMeta };
