// Mevcut Pişti motorunun GameEngine sözleşmesine bağdaştırıcısı. pisti.ts'e DOKUNMAZ, davranışı aynen korur;
// yalnız sarar (game/match.ts doğrudan pisti.ts'i kullanmaya devam eder). Çevrimiçi Pişti bunu kullanacak.
import type {GameEngine} from './game';
import {applyPlay, createGame, legalMoves, viewFor} from './pisti';
import type {CardId, PistiConfig, PistiEvent, PistiState, PlayerView} from './types';

/** Pişti'de tek hamle: kart at. */
export type PistiAction = {t: 'play'; seat: number; card: CardId};

/** Gizli kart yerine konan değer (süzülmüş olaylarda). */
export const HIDDEN_CARD = -1;

export type PistiEngine = GameEngine<PistiConfig, PistiState, PistiAction, PistiEvent, PlayerView, PistiAction[]>;

/** Oynanmış kart sayısı: her hamlede 1 artar, dağıtım değiştirmez → dönem (epoch) sayacı. */
const played = (s: PistiState): number => {
  let inHands = 0;
  for (const h of s.hands) inHands += h.length;
  return 52 - s.deck.length - inHands;
};

export const pistiEngine: PistiEngine = {
  id: 'pisti',
  create: createGame,
  apply(state, a) {
    if (!a || a.t !== 'play') return {error: 'Geçersiz hamle', code: 'bad-action'};
    if (state.over) return {error: 'Oyun bitti', code: 'over'};
    if (a.seat !== state.turn) return {error: `Sıra ${state.turn}. koltukta`, code: 'turn'};
    if (!state.hands[a.seat]?.includes(a.card)) return {error: `${a.card} kartı elinde yok`, code: 'not-in-hand'};
    try {
      return applyPlay(state, a.seat, a.card);
    } catch (e) {
      return {error: e instanceof Error ? e.message : String(e), code: 'bad-action'};
    }
  },
  viewFor,
  legal: (v) => (v.turn === v.seat ? v.hand.map((card) => ({t: 'play' as const, seat: v.seat, card})) : []),
  redact(e, seat) {
    switch (e.t) {
      case 'tableDeal':
        // Kapalı masa kartları kimseye gösterilmez.
        return {...e, cards: e.cards.map((c, i) => (e.faceUp[i] ? c : HIDDEN_CARD)), faceUp: [...e.faceUp]};
      case 'handDeal':
        // Başkalarının eline giden kart gizli (animasyon için koltuk sırası korunur).
        return {...e, deals: e.deals.map((d) => ({seat: d.seat, card: d.seat === seat ? d.card : HIDDEN_CARD}))};
      default:
        return e;
    }
  },
  seats: (s) => s.cfg.seats,
  isOver: (s) => s.over,
  actors: (s) => (s.over ? [] : [s.turn]),
  epoch: played,
  actionSeat: (a) => a.seat,
  timer: () => null,
  timeoutAction: (s, seat) => {
    const m = legalMoves(s, seat);
    return m.length ? {t: 'play', seat, card: m[0]} : null;
  },
};
