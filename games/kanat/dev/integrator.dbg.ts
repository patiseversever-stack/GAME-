import { loadWorldNode } from '../tools/terrain/loadNode.ts';
import { buildWorldContent } from '../src/game/routes/worldContent.ts';
import { FlightSim } from '../src/sim/FlightSim.ts';
import { LineBot, type BotPolicy } from '../src/game/bots/LineBot.ts';
import type { Command, WorldId } from '../src/sim/types.ts';
const w = (process.argv[2] ?? 'kapadokya') as WorldId;
const rid = process.argv[3] ?? 'w1r2';
const pol = (process.argv[4] ?? 'careful') as BotPolicy;
const world = loadWorldNode(w);
const content = buildWorldContent(w, world.sampler, world.config, {});
const route = content.routes.find((r) => r.id === rid)!;
const sim = new FlightSim({ world: w, sampler: world.sampler, route, propIndex: content.propIndex, balloons: content.balloons, assist: 'off', skipIntro: true, water: world.patchWater ? [{ y: 0, grid: world.patchWater }] : undefined });
const bot = new LineBot(route, world.sampler, pol, 1);
const cmds: Command[] = [];
for (let t = 0; t < 60 * 200; t++) {
  cmds.length = 0;
  bot.commands(sim.state, cmds);
  sim.step(cmds);
  for (const e of sim.drainEvents()) if (e.type !== 'multUp' && e.type !== 'comboBreak' && e.type !== 'warning') console.log(t, e.type, JSON.stringify(e).slice(0, 120));
  const s = sim.state;
  if (t % 120 === 0) console.log(t, s.phase, 'pos', s.pos.map((v) => v.toFixed(0)).join(','), 'agl', s.heightAGL.toFixed(0), 'v', s.speed.toFixed(1), 'g', (s.gamma * 57.3).toFixed(0), 'tgt', Array.from(bot.target).map((v) => v.toFixed(0)).join(','), 'gi', s.gateIndex, 'd', s.prox.d.toFixed(1));
  if (sim.phase === 'landed' || sim.phase === 'crashed') break;
}
console.log('gates', route.gates.map((g) => g.pos.map((v) => v.toFixed(0)).join(',')).join(' | '));
