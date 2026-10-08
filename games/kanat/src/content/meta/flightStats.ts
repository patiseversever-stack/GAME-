// Pure accumulator that turns the sim's per-tick FlightState + SimEvents into the FlightStats record used by
// Usta tasks, badges and XP. Defines every stat precisely so UI, save and tests agree. No allocation per tick.

import type { WorldId, FlightState, SimEvent } from '../../sim/types.ts';
import type { FlightMode, FlightStats } from './types.ts';
import { TUNING } from '../../sim/data/tuning.ts';

export interface FlightStatsInit {
  routeId: string;
  world: WorldId;
  mode: FlightMode;
  gatesTotal: number;
  assist: 'full' | 'low' | 'off';
  slowMode: boolean;
}

export interface FlightStatsTracker {
  /** Call once per sim tick with the current state (any phase). */
  sample(s: FlightState): void;
  /** Call for every drained SimEvent. */
  event(e: SimEvent): void;
  /** Final record; `stars` comes from the mode's star rule (career score / daily time). */
  finish(final: { score: number; timeSec: number; stars: number }): FlightStats;
}

const WATER_SKIM_D = 4; // m — "suyun 4 m üstünde" (badge turquoiseShadow)

export function createFlightStatsTracker(init: FlightStatsInit): FlightStatsTracker {
  const threadWindowTicks = Math.round(TUNING.score.threadChainWindowSec * TUNING.sim.hz);
  const braveMin = TUNING.score.braveOpenMin;
  const braveMax = TUNING.score.braveOpenMax;

  let prevT = Number.NaN;
  let x5Total = 0;
  let x5Streak = 0;
  let maxX5Streak = 0;
  let x3Total = 0;
  let waterSkim = 0;
  let grazes = 0;
  let threads = 0;
  let threadChain = 0;
  let maxThreadChain = 0;
  let lastThreadTick = -1_000_000;
  let gatesPassed = 0;
  let gatesMissed = 0;
  let gateChain = 0;
  let maxGateChain = 0;
  let thermalMask = 0; // bit per thermal index (routes have ≤ 5 thermals; overflow counted separately)
  let thermalExtra = 0;
  let contacts = 0;
  let crashed = false;
  let halfFlight = false;
  let sawLanded = false;
  let landingDist = Number.POSITIVE_INFINITY;
  let softLanding = false;
  let braveOpening = false;
  let autoParachute = false;

  return {
    sample(s: FlightState): void {
      const t = s.timeSec;
      if (Number.isNaN(prevT)) {
        prevT = t;
        return;
      }
      const dt = t - prevT;
      prevT = t;
      if (!(dt > 0) || s.phase !== 'flying') {
        if (s.phase !== 'flying') x5Streak = 0;
        return;
      }
      const m = s.prox.mult;
      if (m === 5) {
        x5Total += dt;
        x5Streak += dt;
        if (x5Streak > maxX5Streak) maxX5Streak = x5Streak;
      } else {
        x5Streak = 0;
      }
      if (m >= 3) x3Total += dt;
      if (s.prox.cls === 'water' && s.prox.d < WATER_SKIM_D) waterSkim += dt;
    },

    event(e: SimEvent): void {
      switch (e.type) {
        case 'graze':
          grazes++;
          break;
        case 'balloonThread':
          threads++;
          threadChain = e.tick - lastThreadTick <= threadWindowTicks ? threadChain + 1 : 1;
          lastThreadTick = e.tick;
          if (threadChain > maxThreadChain) maxThreadChain = threadChain;
          break;
        case 'gate':
          gatesPassed++;
          gateChain++;
          if (gateChain > maxGateChain) maxGateChain = gateChain;
          break;
        case 'gateMissed':
          gatesMissed++;
          gateChain = 0;
          break;
        case 'thermalEnter':
          if (e.index >= 0 && e.index < 30) thermalMask |= 1 << e.index;
          else thermalExtra++;
          break;
        case 'bounce':
          contacts++;
          break;
        case 'crash':
          crashed = true;
          break;
        case 'halfFlight':
          halfFlight = true;
          break;
        case 'parachuteOpen':
          autoParachute = e.auto;
          braveOpening = !e.auto && e.heightAGL >= braveMin && e.heightAGL <= braveMax;
          break;
        case 'landed':
          sawLanded = true;
          landingDist = e.distToTarget;
          softLanding = e.soft;
          break;
        default:
          break;
      }
    },

    finish(final: { score: number; timeSec: number; stars: number }): FlightStats {
      let thermals = thermalExtra;
      for (let m = thermalMask; m !== 0; m &= m - 1) thermals++;
      const landed = sawLanded && !halfFlight && !crashed;
      return {
        routeId: init.routeId,
        world: init.world,
        mode: init.mode,
        landed,
        halfFlight,
        crashed,
        stars: landed ? final.stars : 0,
        score: final.score,
        timeSec: final.timeSec,
        grazes,
        x5TotalSec: x5Total,
        maxX5StreakSec: maxX5Streak,
        x3PlusTotalSec: x3Total,
        balloonThreads: threads,
        maxThreadChain,
        gatesTotal: init.gatesTotal,
        gatesPassed,
        gatesMissed,
        maxGateChain,
        thermalsEntered: thermals,
        contacts,
        landingDist: landed ? landingDist : Number.POSITIVE_INFINITY,
        softLanding: landed && softLanding,
        braveOpening: landed && braveOpening,
        autoParachute,
        waterSkimSec: waterSkim,
        assist: init.assist,
        slowMode: init.slowMode,
      };
    },
  };
}
