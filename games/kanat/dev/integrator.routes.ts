// Integrator dev tool (Node): builds the per-world content exactly like the browser (routes, balloons, props),
// flies the careful / expert bots on every career route and prints a table. `--write` stores the expert
// calibration in src/game/routes/provisionalBench.ts (expertScore → ⭐⭐/⭐⭐⭐ thresholds of generated routes).
// Usage: node dev/integrator.routes.ts [--write] [--world kapadokya] [--json]
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadWorldNode, KANAT_ROOT } from '../tools/terrain/loadNode.ts';
import { buildWorldContent } from '../src/game/routes/worldContent.ts';
import { FlightSim } from '../src/sim/FlightSim.ts';
import { LineBot, type BotPolicy } from '../src/game/bots/LineBot.ts';
import type { Command, RouteDef, WorldId } from '../src/sim/types.ts';
import { WORLD_IDS } from '../src/sim/types.ts';

const args = process.argv.slice(2);
const write = args.includes('--write');
const onlyWorld = args.includes('--world') ? (args[args.indexOf('--world') + 1] as WorldId) : null;

function jsonRoutes(): Record<string, RouteDef> {
  const dir = join(KANAT_ROOT, 'src', 'content', 'routes');
  const out: Record<string, RouteDef> = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!/^w[1-5]r[1-4]\.json$/.test(f)) continue;
    const r = JSON.parse(readFileSync(join(dir, f), 'utf8')) as RouteDef;
    out[r.id] = r;
  }
  return out;
}

export interface FlyResult {
  phase: string;
  score: number;
  time: number;
  stars: number;
  gates: string;
  dist: number;
  crashes: number;
  ticks: number;
}

export function fly(world: ReturnType<typeof loadWorldNode>, content: ReturnType<typeof buildWorldContent>, route: RouteDef, policy: BotPolicy, seed = 1): FlyResult {
  const sim = new FlightSim({
    world: route.world,
    sampler: world.sampler,
    route,
    propIndex: content.propIndex,
    balloons: content.balloons,
    seed: 1,
    assist: 'off',
    guideWind: false,
    water: world.patchWater ? [{ y: 0, grid: world.patchWater }] : undefined,
    skipIntro: true,
  });
  const bot = new LineBot(route, world.sampler, policy, seed);
  const cmds: Command[] = [];
  let crashes = 0;
  for (let t = 0; t < 60 * 200; t++) {
    cmds.length = 0;
    bot.commands(sim.state, cmds);
    sim.step(cmds);
    for (const e of sim.drainEvents()) if (e.type === 'crash') crashes++;
    const ph = sim.phase;
    if (ph === 'landed' || ph === 'crashed' || (ph === 'halfFlight' && !sim.state.canopyOpen)) break;
    if (ph === 'halfFlight' && sim.state.heightAGL < 0.2) break;
  }
  const st = sim.state;
  return {
    phase: sim.phase,
    score: Math.round(st.score),
    time: Math.round(st.timeSec * 10) / 10,
    stars: sim.stars(),
    gates: `${st.gatesPassed}/${route.gates.length}`,
    dist: Math.round(sim.distToTarget * 10) / 10,
    crashes,
    ticks: st.tick,
  };
}

const bench: Record<string, { expertScore: number; expertTimeSec: number }> = {};
const json = jsonRoutes();
for (const w of WORLD_IDS) {
  if (onlyWorld && w !== onlyWorld) continue;
  const t0 = performance.now();
  const world = loadWorldNode(w);
  const t1 = performance.now();
  const content = buildWorldContent(w, world.sampler, world.config, { json, now: () => performance.now() });
  console.log(`\n== ${w}: load ${(t1 - t0).toFixed(0)} ms, content ${content.buildMs.toFixed(0)} ms, props ${content.props.length}, balloons ${content.balloons.length}`);
  for (const r of content.routes) {
    const tS = performance.now();
    const ex = fly(world, content, r, 'expert');
    const ca = fly(world, content, r, 'careful');
    const ms = performance.now() - tS;
    const s = r.start.pos;
    console.log(
      `${r.id} ${content.provisional[r.id] ? 'gen ' : 'json'} start(${s.map((v) => v.toFixed(0)).join(',')}) agl0 ${(s[1] - world.sampler.height(s[0], s[2])).toFixed(0)} line ${r.line.length} gates ${r.gates.length} | expert ${ex.phase} ${ex.score} ${ex.time}s ${ex.gates} d${ex.dist} c${ex.crashes} | careful ${ca.phase} ${ca.score} ${ca.time}s ${ca.gates} d${ca.dist} c${ca.crashes} | ${ms.toFixed(0)} ms`,
    );
    if (content.provisional[r.id] && ex.phase === 'landed') bench[r.id] = { expertScore: ex.score, expertTimeSec: ex.time };
  }
}

if (write) {
  const file = join(KANAT_ROOT, 'src', 'game', 'routes', 'provisionalBench.ts');
  const prev = readFileSync(file, 'utf8');
  const head = prev.split('export const PROVISIONAL_BENCH')[0];
  const body = Object.keys(bench)
    .sort()
    .map((k) => `  ${k}: { expertScore: ${bench[k].expertScore}, expertTimeSec: ${bench[k].expertTimeSec} },`)
    .join('\n');
  writeFileSync(file, `${head}export const PROVISIONAL_BENCH: Readonly<Record<string, { expertScore: number; expertTimeSec: number }>> = {\n${body}\n};\n`);
  console.log(`wrote ${Object.keys(bench).length} entries → ${file}`);
}
