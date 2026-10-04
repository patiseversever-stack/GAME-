// Bot-vs-bot simülasyonu (başsız). Testler ve ayar araçları kullanır.
import { Game, checkInvariants } from './game.js';
import { Bot } from './bot/bot.js';

// difficulties: 4 koltuk için zorluk kimlikleri. Dönüş: maç özeti.
export function playMatch(rules, seed, difficulties = ['normal', 'normal', 'normal', 'normal'], opts = {}) {
  const game = Game.create(rules, seed);
  const bots = difficulties.map((d, i) => new Bot(i, d, seed + i * 101));
  const stats = { steps: 0, rounds: 0, rejected: 0, rejections: [], finishes: {}, winners: [], turnsPerRound: [], penalties: 0 };
  const maxSteps = opts.maxSteps || 6000;
  let roundSteps = 0;
  while (stats.steps < maxSteps) {
    const s = game.state;
    if (s.status === 'matchOver') break;
    if (s.status === 'roundOver') {
      stats.rounds++;
      stats.turnsPerRound.push(roundSteps);
      roundSteps = 0;
      stats.winners.push(s.result.winner);
      const k = s.result.finish || s.result.reason;
      stats.finishes[k] = (stats.finishes[k] || 0) + 1;
      game.apply(0, { type: 'NEXT_ROUND' });
      continue;
    }
    const seat = s.turn.seat;
    const view = game.view(seat);
    let action = bots[seat].nextAction(view);
    let res = game.apply(seat, action);
    if (!res.ok) {
      stats.rejected++;
      if (stats.rejections.length < 12) stats.rejections.push({ seat, action, error: res.error, mode: s.rules.mode });
      action = bots[seat].safeAction(game.view(seat));
      res = game.apply(seat, action);
      if (!res.ok) throw new Error('Bot güvenli hamlesi de reddedildi: ' + JSON.stringify(action) + ' → ' + res.error);
    }
    for (const e of res.events) if (e.type === 'penalty') stats.penalties++;
    stats.steps++;
    roundSteps++;
    if (opts.checkInvariants) {
      const bad = checkInvariants(game.state);
      if (bad) throw new Error('Invariant bozuldu: ' + bad + ' (adım ' + stats.steps + ')');
    }
  }
  if (game.state.status === 'roundOver') {
    stats.rounds++;
    stats.winners.push(game.state.result.winner);
  } else if (game.state.status === 'matchOver') {
    stats.rounds++;
    stats.turnsPerRound.push(roundSteps);
    stats.winners.push(game.state.result.winner);
    const k = game.state.result.finish || game.state.result.reason;
    stats.finishes[k] = (stats.finishes[k] || 0) + 1;
  }
  stats.finalScores = game.state.scores.slice();
  stats.status = game.state.status;
  return stats;
}
