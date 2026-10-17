// Blöf motorunun genel GameEngine sözleşmesine bağlanması (ev sahibi / sunucu bunu kullanır).
import type {GameEngine} from './game';
import {actors, applyBlof, createBlof, legalActions, redactBlofEvent, timeoutAction, viewFor} from './blof';
import type {BlofAction, BlofConfig, BlofEvent, BlofLegal, BlofState, BlofView} from './blofTypes';

export type BlofEngine = GameEngine<BlofConfig, BlofState, BlofAction, BlofEvent, BlofView, BlofLegal>;

export const blofEngine: BlofEngine = {
  id: 'blof',
  create: createBlof,
  apply: applyBlof,
  viewFor,
  legal: legalActions,
  redact: redactBlofEvent,
  seats: (s) => s.cfg.seats,
  isOver: (s) => s.phase === 'over',
  actors,
  epoch: (s) => s.move,
  actionSeat: (a) => (a.t === 'windowClosed' ? -1 : a.seat),
  // Pencere süresi kuraldır (motor her pencereye yazar): atıştan sonra sıradaki insansa 5 sn, bot ise 3 sn.
  timer: (s) =>
    s.phase === 'window' && s.window
      ? {key: `w${s.window.id}`, kind: 'window', ms: s.window.ms, action: {t: 'windowClosed', id: s.window.id}}
      : null,
  // Ev sahibi koltuk türlerini yazar: hangi koltukta insan (yerel ya da uzak) oturuyor → pencere süresi.
  withSeats: (cfg, human) => ({...cfg, humanSeats: [...human]}),
  timeoutAction,
  // Pencere açıkken sıradaki oyuncu "at"/"pas" derse: blöf demiyor demektir → şimdi 'decline', hamle pencere kapanınca.
  defer: (s, a) => {
    if (s.phase !== 'window' || !s.window) return null;
    if ((a.t !== 'play' && a.t !== 'pass') || a.seat !== s.turn) return null;
    const w = s.window;
    return {now: w.eligible[a.seat] && !w.declined[a.seat] ? {t: 'decline', seat: a.seat} : null};
  },
};
