// Pişti kural motoru: saf ve deterministik. Girdi durumunu asla değiştirmez;
// her hamle yeni bir durum + olay listesi döndürür (sunucu aynı olayları yayınlar).

import {
  type CardId,
  type GameResult,
  type PistiConfig,
  type PistiEvent,
  type PistiState,
  type PlayerView,
  type SideScore,
  cardId,
  isJack,
  rankOf,
} from './types';
import {mulberry32, shuffle} from './rng';

const HAND_SIZE = 4;
const CLUB2 = cardId('C', 2);
const DIAMOND10 = cardId('D', 10);

/** Durumun derin kopyası (structuredClone'dan hızlı; tüm alanlar düz sayı dizisi). */
function cloneState(s: PistiState): PistiState {
  return {
    cfg: {...s.cfg, teams: [...s.cfg.teams]},
    deck: [...s.deck],
    pile: [...s.pile],
    pileHiddenCount: s.pileHiddenCount,
    hands: s.hands.map((h) => [...h]),
    captured: s.captured.map((c) => [...c]),
    pistiPoints: [...s.pistiPoints],
    turn: s.turn,
    lastCapturer: s.lastCapturer,
    round: s.round,
    over: s.over,
  };
}

/** Desteden her koltuğa 4'er kart, teker teker, (dealer+1)'den başlayarak. */
function dealHands(s: PistiState): PistiEvent {
  const {seats, dealer} = s.cfg;
  const deals: {seat: number; card: CardId}[] = [];
  for (let lap = 0; lap < HAND_SIZE; lap++) {
    for (let i = 1; i <= seats; i++) {
      const card = s.deck.pop();
      if (card === undefined) return {t: 'handDeal', round: s.round, deals};
      const seat = (dealer + i) % seats;
      s.hands[seat].push(card);
      deals.push({seat, card});
    }
  }
  return {t: 'handDeal', round: s.round, deals};
}

export function createGame(cfg: PistiConfig): {state: PistiState; events: PistiEvent[]} {
  const rnd = mulberry32(cfg.seed);
  const deck = shuffle(Array.from({length: 52}, (_, i) => i), rnd);

  // Masa: ilk 3 kart kapalı, 4. kart açık. Açık kart Vale ise desteye geri dön, yenisini çek.
  const pile: CardId[] = [deck.pop()!, deck.pop()!, deck.pop()!];
  let top = deck.pop()!;
  while (isJack(top)) {
    deck.splice(Math.floor(rnd() * deck.length), 0, top); // en üste değil: döngü garanti biter
    top = deck.pop()!;
  }
  pile.push(top);

  const state: PistiState = {
    cfg: {...cfg, teams: [...cfg.teams]},
    deck,
    pile,
    pileHiddenCount: 3,
    hands: Array.from({length: cfg.seats}, () => []),
    captured: Array.from({length: cfg.seats}, () => []),
    pistiPoints: new Array<number>(cfg.seats).fill(0),
    turn: (cfg.dealer + 1) % cfg.seats,
    lastCapturer: -1,
    round: 1,
    over: false,
  };
  const events: PistiEvent[] = [
    {t: 'tableDeal', cards: [...pile], faceUp: [false, false, false, true]},
    dealHands(state),
  ];
  return {state, events};
}

export function applyPlay(
  state: PistiState,
  seat: number,
  card: CardId,
): {state: PistiState; events: PistiEvent[]} {
  if (state.over) throw new Error('Oyun bitti');
  if (seat !== state.turn) throw new Error(`Sıra ${state.turn}. koltukta, ${seat}. değil`);
  const idx = state.hands[seat].indexOf(card);
  if (idx < 0) throw new Error(`${card} kartı ${seat}. koltuğun elinde yok`);

  const s = cloneState(state);
  const events: PistiEvent[] = [{t: 'play', seat, card}];
  s.hands[seat].splice(idx, 1);

  const n = s.pile.length;
  if (n > 0 && (isJack(card) || rankOf(card) === rankOf(s.pile[n - 1]))) {
    // Yakalama: Vale her şeyi alır, diğerleri aynı değerle alır.
    const same = rankOf(card) === rankOf(s.pile[n - 1]);
    const pisti = n === 1 && same ? (isJack(card) ? 20 : 10) : 0;
    const cards = [...s.pile, card];
    s.captured[seat].push(...cards);
    s.pistiPoints[seat] += pisti;
    s.pile = [];
    s.pileHiddenCount = 0;
    s.lastCapturer = seat;
    events.push({t: 'capture', seat, cards, pisti});
  } else {
    s.pile.push(card);
  }
  s.turn = (seat + 1) % s.cfg.seats;

  if (s.hands.every((h) => h.length === 0)) {
    if (s.deck.length > 0) {
      // Eller bitti: yeniden dağıt, oyuna yine (dealer+1) başlar.
      s.round++;
      s.turn = (s.cfg.dealer + 1) % s.cfg.seats;
      events.push(dealHands(s));
    } else {
      // Deste bitti: kalan yığın son alana (kimse almadıysa dağıtana) gider.
      if (s.pile.length > 0) {
        const to = s.lastCapturer >= 0 ? s.lastCapturer : s.cfg.dealer;
        s.captured[to].push(...s.pile);
        events.push({t: 'finalSweep', seat: to, cards: [...s.pile]});
        s.pile = [];
        s.pileHiddenCount = 0;
      }
      s.over = true;
      events.push({t: 'gameOver', result: scoreGame(s)});
    }
  }
  return {state: s, events};
}

export function scoreGame(state: PistiState): GameResult {
  const {seats, teams} = state.cfg;
  const ids = [...new Set(teams.slice(0, seats))].sort((a, b) => a - b);

  const sides: SideScore[] = ids.map((side) => {
    const seatList: number[] = [];
    for (let i = 0; i < seats; i++) if (teams[i] === side) seatList.push(i);
    let cards = 0;
    let aces = 0;
    let jacks = 0;
    let club2 = 0;
    let diamond10 = 0;
    let pisti = 0;
    for (const seat of seatList) {
      pisti += state.pistiPoints[seat];
      for (const c of state.captured[seat]) {
        cards++;
        const r = rankOf(c);
        if (r === 1) aces++;
        else if (r === 11) jacks++;
        if (c === CLUB2) club2 = 2;
        else if (c === DIAMOND10) diamond10 = 3;
      }
    }
    return {side, seats: seatList, cards, majority: 0, aces, jacks, club2, diamond10, pisti, total: 0};
  });

  // Çoğunluk: yalnızca kesin en çok karta sahip taraf 3 puan alır (beraberlikte kimse almaz).
  let most = 0;
  for (const sd of sides) most = Math.max(most, sd.cards);
  const leaders = sides.filter((sd) => sd.cards === most);
  if (leaders.length === 1) leaders[0].majority = 3;

  let best = -Infinity;
  for (const sd of sides) {
    sd.total = sd.majority + sd.aces + sd.jacks + sd.club2 + sd.diamond10 + sd.pisti;
    best = Math.max(best, sd.total);
  }
  return {sides, winners: sides.filter((sd) => sd.total === best).map((sd) => sd.side)};
}

export function viewFor(state: PistiState, seat: number): PlayerView {
  const n = state.pile.length;
  return {
    seat,
    seats: state.cfg.seats,
    teams: [...state.cfg.teams],
    hand: [...state.hands[seat]],
    handCounts: state.hands.map((h) => h.length),
    pileTop: n > 0 ? state.pile[n - 1] : null,
    pileCount: n,
    pileVisible: state.pile.slice(state.pileHiddenCount),
    deckCount: state.deck.length,
    capturedCounts: state.captured.map((c) => c.length),
    pistiPoints: [...state.pistiPoints],
    turn: state.turn,
    round: state.round,
    lastCapturer: state.lastCapturer,
  };
}

export function legalMoves(state: PistiState, seat: number): CardId[] {
  return !state.over && state.turn === seat ? [...state.hands[seat]] : [];
}
