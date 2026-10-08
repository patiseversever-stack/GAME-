// The four §9.G autoplay policies (owner: routes agent). PURE.
//
//   CarefulBot        ideal line, ≥ 18 m above the surface, no energy spending, opens at ~110 m in the zone
//   AveragePlayerBot  +10 m, ±3 m lateral / ±2 m vertical wander, 250 ms reaction lag, 50 % thermals,
//                     threads balloons only when a pair is on its path, opens 80–110 m (seeded)
//   ExpertBot         "Kılavuz Pilot": +4 m, spends its energy surplus below the line, threads balloon pairs,
//                     takes every thermal core, brave opening 70–80 m + flare
//   NoiseBot          seeded random stick (fuzzing): NaN/exception hunting and crash/retry coverage

import { Rng, STREAM } from '../math/rng.ts';
import type { Command, FlightState, RouteDef } from '../types.ts';
import { PilotBot, type BotController, type BotPolicy, type BotWorld, type PilotParams } from './PilotBot.ts';

export class CarefulBot extends PilotBot {
  constructor(route: RouteDef, world: BotWorld, seed = 1, actorId = 0, params?: Partial<PilotParams>) {
    super('careful', route, world, seed, actorId, params);
  }
}

export class ExpertBot extends PilotBot {
  constructor(route: RouteDef, world: BotWorld, seed = 1, actorId = 0, params?: Partial<PilotParams>) {
    super('expert', route, world, seed, actorId, params);
  }
}

export class AveragePlayerBot extends PilotBot {
  constructor(route: RouteDef, world: BotWorld, seed = 1, actorId = 0, params?: Partial<PilotParams>) {
    // opening height varies per player seed inside 80–110 m (GDD §4.4)
    const r = new Rng(seed >>> 0, STREAM.bots);
    const openAgl = 80 + 30 * r.next();
    super('average', route, world, seed, actorId, { openAgl, ...(params ?? {}) });
  }
}

/** Seeded random stick: new target every 6–20 ticks, parachute requests now and then, random flares. */
export class NoiseBot implements BotController {
  readonly policy: BotPolicy = 'noise';
  readonly actorId: number;
  private readonly seed: number;
  private readonly rng: Rng;
  private readonly cmdAxis: Command;
  private readonly cmdChute: Command;
  private readonly cmdFlare: Command;
  private readonly list: Command[] = [];
  private holdUntil = 0;
  private sx = 0;
  private sy = 0;

  constructor(seed = 1, actorId = 0) {
    this.seed = seed >>> 0;
    this.actorId = actorId;
    this.rng = new Rng(this.seed, STREAM.bots);
    this.cmdAxis = { tick: 0, actorId, cmd: 'axis', args: [0, 0] };
    this.cmdChute = { tick: 0, actorId, cmd: 'parachute', args: [] };
    this.cmdFlare = { tick: 0, actorId, cmd: 'flare', args: [0] };
  }

  reset(): void {
    this.rng.reseed(this.seed, STREAM.bots);
    this.holdUntil = 0;
    this.sx = 0;
    this.sy = 0;
  }

  next(st: FlightState): Command[] {
    this.list.length = 0;
    this.commands(st, this.list);
    return this.list;
  }

  commands(st: FlightState, out: Command[]): number {
    const tick = st.tick;
    let n = 0;
    if (tick >= this.holdUntil) {
      this.holdUntil = tick + 6 + this.rng.int(15);
      // mostly moderate inputs, sometimes full deflection, sometimes released
      const mode = this.rng.next();
      if (mode < 0.15) {
        this.sx = 0;
        this.sy = 0;
      } else if (mode < 0.35) {
        this.sx = this.rng.next() < 0.5 ? -31 : 31;
        this.sy = this.rng.next() < 0.5 ? -31 : 31;
      } else {
        this.sx = Math.round(this.rng.range(-31, 31));
        this.sy = Math.round(this.rng.range(-31, 31));
      }
    }
    if ((tick & 1) === 0) {
      this.cmdAxis.tick = tick;
      this.cmdAxis.args[0] = this.sx;
      this.cmdAxis.args[1] = this.sy;
      out.push(this.cmdAxis);
      n++;
      if (this.rng.next() < 0.01) {
        this.cmdChute.tick = tick;
        out.push(this.cmdChute);
        n++;
      }
      if (st.phase === 'canopy' && this.rng.next() < 0.05) {
        this.cmdFlare.tick = tick;
        this.cmdFlare.args[0] = this.rng.int(32);
        out.push(this.cmdFlare);
        n++;
      }
    }
    return n;
  }
}

/** Factory with the integrator's policy names ('careful' | 'expert' | 'average' | 'noise'). */
export function createBot(policy: BotPolicy, route: RouteDef, world: BotWorld, seed = 1, actorId = 0): BotController {
  switch (policy) {
    case 'careful':
      return new CarefulBot(route, world, seed, actorId);
    case 'expert':
      return new ExpertBot(route, world, seed, actorId);
    case 'average':
      return new AveragePlayerBot(route, world, seed, actorId);
    case 'noise':
      return new NoiseBot(seed, actorId);
  }
}
