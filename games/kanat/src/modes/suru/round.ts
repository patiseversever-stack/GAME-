// SÜRÜ.io round factory + headless runner (pure: no DOM/three). Used by the mode controller, the dev page
// fast-forward (?t=), unit tests, the balance script and the JSC determinism check.

import { SURU } from './sim/config.ts';
import { HAND_LAYOUTS, dailyLayout, layoutById } from './sim/layouts.ts';
import { Rng } from './sim/rng.ts';
import { SuruSim } from './sim/SuruSim.ts';
import type { SuruSimOptions } from './sim/SuruSim.ts';
import type { FlockStats, SuruCommand, SuruLayout } from './sim/types.ts';
import { BOT_NAMES } from './ai/personalities.ts';
import type { League, PersonalityId } from './ai/personalities.ts';
import { SuruBots, personalityMix } from './ai/SuruBots.ts';
import type { BotPolicy, BotSpec } from './ai/SuruBots.ts';

export type SuruSubMode = 'league' | 'daily' | 'practice' | 'ftue';

export interface RoundSetup {
  seed: number;
  subMode?: SuruSubMode;
  /** layout id ('sazlik' | 'fener' | 'tasli') — ignored for daily (seeded from dayIndex) */
  layoutId?: string;
  dayIndex?: number;
  /** total flocks including the player (12–16) */
  flockCount?: number;
  league?: League;
  /** how flock 1 is driven in headless runs: 'human' = external commands, 'average' / 'utility' = bot */
  player?: 'human' | 'average' | 'utility';
  playerPersonality?: PersonalityId;
  /** override sim options (tests) */
  simOverrides?: Partial<SuruSimOptions>;
}

export interface FlockMeta {
  flock: number;
  isBot: boolean;
  personality: PersonalityId | null;
  name: { tr: string; en: string };
}

export interface Round {
  setup: RoundSetup;
  layout: SuruLayout;
  sim: SuruSim;
  bots: SuruBots;
  meta: FlockMeta[];
}

export function layoutFor(setup: RoundSetup): SuruLayout {
  if (setup.subMode === 'daily') return dailyLayout(setup.dayIndex ?? 0);
  if (setup.layoutId) return layoutById(setup.layoutId);
  return HAND_LAYOUTS[(setup.seed >>> 0) % HAND_LAYOUTS.length];
}

/** FTUE playground (§2.6 "SÜRÜ.io FTUE", 45 s, textless): wild groups ahead, a sleeping small timid flock. */
export const FTUE_SPOTS = {
  wildA: { x: 0, z: 40 },
  wildB1: { x: -9, z: -28 },
  wildB2: { x: 9, z: -34 },
  wildC: { x: 4, z: -78 },
  sleeper: { x: 0, z: -150 },
} as const;

function createFtueRound(setup: RoundSetup): Round {
  const layout = layoutById('sazlik');
  const seed = (setup.seed >>> 0) ^ 0xf7e;
  const S = FTUE_SPOTS;
  const sim = new SuruSim({
    seed,
    layout,
    roundSec: 120,
    hawks: false,
    storm: false,
    gusts: false,
    ring: false,
    lastStanding: false,
    wildWander: false,
    custom: {
      flocks: [
        { x: 0, z: 110, hx: 0, hz: -1, followers: 15 },
        { x: S.sleeper.x, z: S.sleeper.z, hx: 1, hz: 0, followers: 10 },
      ],
      wild: [
        { x: S.wildA.x, z: S.wildA.z, count: 14 },
        { x: S.wildB1.x, z: S.wildB1.z, count: 14 },
        { x: S.wildB2.x, z: S.wildB2.z, count: 14 },
        { x: S.wildC.x, z: S.wildC.z, count: 22 },
      ],
      parkRadius: 270,
    },
  });
  const bots = new SuruBots(sim, [{ flock: 2, personality: 'urkek', league: 0, policy: 'sleep' }], seed);
  const meta: FlockMeta[] = [
    { flock: 1, isBot: false, personality: null, name: { tr: 'Sen', en: 'You' } },
    { flock: 2, isBot: true, personality: 'urkek', name: BOT_NAMES[5] },
  ];
  return { setup, layout, sim, bots, meta };
}

export function createRound(setup: RoundSetup): Round {
  const sub = setup.subMode ?? 'league';
  if (sub === 'ftue') return createFtueRound(setup);
  const layout = layoutFor(setup);
  // daily: everything (layout, wild, wind, storm path, AI mix) comes from the day seed
  const seed = sub === 'daily' ? (layout.seed ^ 0x5eed) >>> 0 : setup.seed >>> 0;
  const rng = new Rng(seed, 900);
  const flockCount = setup.flockCount ?? (sub === 'practice' ? 12 : 12 + rng.int(0, 4));
  const league: League = setup.league ?? 0;
  const sim = new SuruSim({ seed, layout, flockCount, ...(setup.simOverrides ?? {}) });
  const allowed: PersonalityId[] | undefined = sub === 'practice' ? ['urkek', 'toplayici'] : undefined;
  const player = setup.player ?? 'human';
  // AI-only rounds: the player slot joins the personality mix (balance tests count every slot)
  const mixAll = personalityMix(sim.flockCount, seed, allowed);
  const playerPers: PersonalityId = setup.playerPersonality ?? mixAll[sim.flockCount - 1];
  const mix = mixAll;
  const specs: BotSpec[] = [];
  const meta: FlockMeta[] = [];
  if (player !== 'human') {
    const policy: BotPolicy = player === 'average' ? 'average' : 'utility';
    specs.push({ flock: 1, personality: playerPers, league, policy });
  }
  meta.push({ flock: 1, isBot: player !== 'human', personality: player === 'utility' ? playerPers : null, name: { tr: 'Sen', en: 'You' } });
  // names: seeded shuffle of the nature-word list
  const order = BOT_NAMES.map((_, k) => k);
  for (let k = order.length - 1; k > 0; k--) {
    const j = rng.int(0, k);
    const t = order[k];
    order[k] = order[j];
    order[j] = t;
  }
  for (let f = 2; f <= sim.flockCount; f++) {
    const personality = mix[f - 2];
    specs.push({ flock: f, personality, league, policy: 'utility' });
    meta.push({ flock: f, isBot: true, personality, name: BOT_NAMES[order[(f - 2) % order.length]] });
  }
  const bots = new SuruBots(sim, specs, seed);
  return { setup, layout, sim, bots, meta };
}

export interface RoundResult {
  winner: number;
  winnerPersonality: PersonalityId | null;
  stats: FlockStats[];
  hashes: number[];
  ticks: number;
  /** biggest flock id at t = 60 s (snowball check) */
  leaderAt60: number;
  conservationOk: boolean;
  leadersOutsideRingAtEnd: number;
  ringRadiusAtEnd: number;
}

export interface RunOptions {
  hashEvery?: number;
  /** check Σ ownership = N every tick (slower) */
  checkConservation?: boolean;
  /** stop after this many ticks (default: round end) */
  maxTicks?: number;
  /** external commands for flock 1 (player = 'human') */
  playerCommands?: (tick: number, sim: SuruSim, out: SuruCommand[]) => void;
}

/** Run a round headlessly to the end (or maxTicks). Deterministic for a given setup. */
export function runRound(round: Round, opts: RunOptions = {}): RoundResult {
  const { sim, bots } = round;
  const cmds: SuruCommand[] = [];
  const hashes: number[] = [];
  const every = opts.hashEvery ?? 0;
  let conservationOk = true;
  let leaderAt60 = 0;
  let outsideAtEnd = -1;
  const t60 = 60 * SURU.TICK_HZ;
  const tEndCheck = sim.roundTicks - 3 * SURU.TICK_HZ;
  const max = opts.maxTicks ?? Infinity;
  const owners = new Uint32Array(SURU.MAX_FLOCKS + 1);
  while (!sim.roundOver && sim.tick < max) {
    cmds.length = 0;
    const T = sim.tick;
    bots.update(T, cmds);
    if (opts.playerCommands) opts.playerCommands(T, sim, cmds);
    sim.step(cmds);
    sim.drainEvents();
    if (opts.checkConservation) {
      owners.fill(0);
      for (let i = 0; i < SURU.N_BIRDS; i++) owners[sim.owner[i]]++;
      let s = 0;
      for (let f = 0; f < owners.length; f++) s += owners[f];
      if (s !== SURU.N_BIRDS) conservationOk = false;
    }
    if (every > 0 && sim.tick % every === 0) hashes.push(sim.hashState());
    if (sim.tick === t60) {
      let best = 0;
      let bc = -1;
      for (let f = 1; f <= sim.flockCount; f++) {
        if (!sim.flockAlive[f]) continue;
        if (sim.flockCountArr[f] > bc) {
          bc = sim.flockCountArr[f];
          best = f;
        }
      }
      leaderAt60 = best;
    }
    if (sim.tick === tEndCheck) {
      let out = 0;
      const R = sim.ringRadius;
      for (let f = 1; f <= sim.flockCount; f++) {
        if (!sim.flockAlive[f]) continue;
        const x = sim.leaderX[f];
        const z = sim.leaderZ[f];
        if (x * x + z * z > R * R) out++;
      }
      outsideAtEnd = out;
    }
  }
  const winner = sim.winner;
  const wm = round.meta[winner - 1];
  return {
    winner,
    winnerPersonality: wm ? wm.personality : null,
    stats: sim.stats(),
    hashes,
    ticks: sim.tick,
    leaderAt60,
    conservationOk,
    leadersOutsideRingAtEnd: outsideAtEnd,
    ringRadiusAtEnd: sim.ringRadius,
  };
}
