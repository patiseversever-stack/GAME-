// SÜRÜ.io mount (integrator). Placeholder-free adapter: the SÜRÜ.io mode controller lives in src/modes/suru/**
// (SÜRÜ agent); this file only starts it from the menu and wires audio / haptics / bridge / results / progress.
import type { Game } from './Game.ts';
import type { SuruSub } from '../ui/types.ts';
import { SuruMode } from './SuruMode.ts';

export async function startSuru(game: Game, sub: SuruSub): Promise<void> {
  const mode = new SuruMode(game, sub);
  game.setMode(mode);
  await mode.begin();
}
