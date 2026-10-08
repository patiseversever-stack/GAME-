// Günün Rotası route (integrator). Until the routes agent's daily generator (src/sim/daily/generate.ts) lands,
// the day's route is DERIVED deterministically from the career route set of the day's world (docs/decisions/
// integrator.md): base route = careerRoutes[seed % 4]; gates are re-placed along its line (count from the
// weekday difficulty, 12–20), each with a seeded lateral offset; wind 0–3 m/s (K-18) from the seed; gate radius
// 14 m in every world (K-18); 1–3 of the base thermals. Same date → same route on every device (Rng + detMath
// + cm rounding), so the daily ghost codes verify everywhere.
import { DAILY_RULES } from '../../content/meta/progression.ts';
import { Rng } from '../../sim/math/rng.ts';
import type { DailyInfo } from '../../sim/replay/daily.ts';
import type { RouteDef, RouteGate } from '../../sim/types.ts';
import type { Game } from '../../game/Game.ts';
import type { StageWorld } from '../../game/WorldStore.ts';

const r2 = (v: number): number => Math.round(v * 100) / 100;

export function dailyGateCount(difficulty: number): number {
  const lo = DAILY_RULES.gates[0];
  const hi = DAILY_RULES.gates[1];
  const k = Math.max(0, Math.min(1, (difficulty - 3) / 4));
  return Math.round(lo + (hi - lo) * k);
}

const cache = new Map<string, { route: RouteDef; botSec: number }>();

export function deriveDailyRoute(stage: StageWorld, info: DailyInfo): { route: RouteDef; botSec: number } {
  const key = `${info.dateKey}:${stage.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const routes = stage.content.routes;
  const base = routes[(info.seed >>> 0) % routes.length];
  const rng = new Rng(info.seed >>> 0, 5);
  const s = stage.loaded.sampler;
  const line = base.line;
  // arc length
  const cum: number[] = [0];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    cum.push(cum[i - 1] + Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[2] - a[2]) * (b[2] - a[2])));
  }
  const total = cum[cum.length - 1] || 1;
  const n = dailyGateCount(info.difficulty);
  const R = DAILY_RULES.gateRadius;
  const gates: RouteGate[] = [];
  // the last line point is the canopy run-out toward the landing: gates stop before it
  const sEnd = cum[Math.max(1, cum.length - 2)];
  for (let k = 0; k < n; k++) {
    const sk = total * 0.08 + ((sEnd - total * 0.08) * (k + 0.5)) / n;
    let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < sk) i++;
    const a = line[i];
    const b = line[i + 1];
    const span = cum[i + 1] - cum[i];
    const t = span > 1e-6 ? (sk - cum[i]) / span : 0;
    let dx = b[0] - a[0];
    let dz = b[2] - a[2];
    const dl = Math.sqrt(dx * dx + dz * dz) || 1;
    dx /= dl;
    dz /= dl;
    const off = rng.range(-1, 1) * R * 1.6 * (info.difficulty / 7);
    const x = a[0] + (b[0] - a[0]) * t - dz * off;
    const z = a[2] + (b[2] - a[2]) * t + dx * off;
    const ly = a[1] + (b[1] - a[1]) * t;
    const ground = s.height(x, z);
    const water = stage.loaded.config.hasSea && ground < 0 ? 0 : ground;
    const y = ly > water + R + DAILY_RULES.minGateClearanceM ? ly : water + R + DAILY_RULES.minGateClearanceM;
    const ny = (b[1] - a[1]) / Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) + (b[2] - a[2]) * (b[2] - a[2]) || 1);
    const nh = Math.sqrt(Math.max(0, 1 - ny * ny));
    gates.push({ t: r2(sk / total), pos: [r2(x), r2(y), r2(z)], normal: [r2(dx * nh * 1e4) / 1e4, r2(ny * 1e4) / 1e4, r2(dz * nh * 1e4) / 1e4], radius: R, kind: k === n - 1 ? 'final' : 'normal' });
  }
  const nT = Math.max(DAILY_RULES.thermals[0], Math.min(DAILY_RULES.thermals[1], base.thermals.length, 1 + rng.int(3)));
  const route: RouteDef = {
    ...base,
    id: `daily-${info.index}`,
    index: 1,
    difficulty: info.difficulty,
    name: { tr: `Günün Rotası #${info.index}`, en: `Daily Route #${info.index}` },
    gates,
    thermals: base.thermals.slice(0, nT),
    wind: { dirDeg: Math.round(rng.range(0, 360)), speed: Math.round(rng.range(0, DAILY_RULES.windMax) * 10) / 10 },
    ustaGorevleri: [],
    postcards: [],
  };
  const b = stage.content.bench[base.id];
  const botSec = Math.round((b ? b.expertTimeSec : 90) * 10) / 10;
  const out = { route, botSec };
  cache.set(key, out);
  return out;
}

/** Card summary (gates, bot time) — bot time only once the day's world has been loaded. */
export function dailyRouteSummary(game: Game, info: DailyInfo): { gates: number; botSec?: number } {
  const st = game.stage?.id === info.world ? game.stage : game.worlds.peek(info.world);
  if (!st) return { gates: dailyGateCount(info.difficulty) };
  const d = deriveDailyRoute(st, info);
  return { gates: d.route.gates.length, botSec: d.botSec };
}
