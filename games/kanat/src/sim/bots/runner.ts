// Headless bot flight (owner: routes agent). PURE: no clocks; callers time it themselves.
// Used by the route tools, the daily generator's validation flight, unit tests and the integrator's
// window.__game.bot() e2e path (the same loop drives a visible flight there).

import type { FlightSim } from '../FlightSim.ts';
import type { Command, SimEvent } from '../types.ts';
import type { BotController } from './PilotBot.ts';

export interface BotRunResult {
  /** Final phase: 'landed' | 'crashed' | 'halfFlight' | 'flying' (timeout) | … */
  phase: string;
  /** Landed by parachute inside the landing zone (⭐). */
  landed: boolean;
  halfFlight: boolean;
  crashed: boolean;
  score: number;
  /** Sim seconds from the jump to touchdown (or to the end of the run). */
  timeSec: number;
  stars: 0 | 1 | 2 | 3;
  gatesPassed: number;
  gatesMissed: number;
  gatesTotal: number;
  distToTarget: number;
  bounces: number;
  grazes: number;
  threads: number;
  thermals: number;
  /** Seconds at ×3 or better / at ×5 (Günün Rotası ⭐⭐⭐ rule, Usta tasks). */
  x3Sec: number;
  x5Sec: number;
  braveOpening: boolean;
  softLanding: boolean;
  parachuteAgl: number;
  ticks: number;
  /** A NaN/Infinity appeared in the pilot state (must never happen). */
  nan: boolean;
  /** Final sim hash. */
  hash: number;
}

export interface RunOptions {
  /** Hard cap in sim seconds (default 200). */
  maxSec?: number;
  /** Called with every command list the sim consumes (ghost recorder, e2e capture). */
  onCommands?: (cmds: readonly Command[]) => void;
  /** Called with the drained events of each tick. */
  onEvents?: (events: readonly SimEvent[]) => void;
}

/** Fly `bot` on `sim` from its current state (intro → jump) until touchdown, crash or the time cap. */
export function runBot(sim: FlightSim, bot: BotController, opts: RunOptions = {}): BotRunResult {
  const maxTicks = Math.round((opts.maxSec ?? 200) * 60);
  if (sim.phase === 'intro') sim.beginJump();
  const cmds: Command[] = [];
  let bounces = 0;
  let thermals = 0;
  let x3 = 0;
  let x5 = 0;
  let brave = false;
  let soft = false;
  let chuteAgl = -1;
  let nan = false;
  const dt = sim.dt;
  for (let t = 0; t < maxTicks; t++) {
    const st = sim.state;
    cmds.length = 0;
    bot.commands(st, cmds);
    if (opts.onCommands) opts.onCommands(cmds);
    sim.step(cmds);
    const ev = sim.drainEvents();
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (e.type === 'bounce') bounces++;
      else if (e.type === 'thermalEnter') thermals++;
      else if (e.type === 'parachuteOpen') {
        chuteAgl = e.heightAGL;
        brave = !e.auto && e.heightAGL >= 60 && e.heightAGL <= 90;
      } else if (e.type === 'landed') soft = e.soft;
    }
    if (opts.onEvents && ev.length > 0) opts.onEvents(ev);
    const s2 = sim.state;
    if (!(s2.pos[0] === s2.pos[0]) || !(s2.pos[1] === s2.pos[1]) || !(s2.speed === s2.speed) || !(s2.score === s2.score)) nan = true;
    if (s2.phase === 'flying') {
      const m = s2.prox.mult;
      if (m >= 3) x3 += dt;
      if (m >= 5) x5 += dt;
    }
    const ph = sim.phase;
    if (ph === 'landed' || ph === 'crashed' || nan) break;
    if (ph === 'halfFlight' && !s2.canopyOpen) break;
  }
  const st = sim.state;
  const ph = sim.phase;
  return {
    phase: ph,
    landed: ph === 'landed' && sim.landedInZone,
    halfFlight: ph === 'halfFlight',
    crashed: ph === 'crashed',
    score: st.score,
    timeSec: st.timeSec,
    stars: sim.stars(),
    gatesPassed: st.gatesPassed,
    gatesMissed: st.gatesMissed,
    gatesTotal: sim.route.gates.length,
    distToTarget: sim.distToTarget,
    bounces,
    grazes: sim.grazeCount,
    threads: sim.threadCount,
    thermals,
    x3Sec: x3,
    x5Sec: x5,
    braveOpening: brave,
    softLanding: soft,
    parachuteAgl: chuteAgl,
    ticks: st.tick,
    nan,
    hash: sim.hash(),
  };
}
