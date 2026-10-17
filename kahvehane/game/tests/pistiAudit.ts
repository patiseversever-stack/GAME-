// Pişti denetim simülatörü: botları (ve isteğe bağlı basit bir "insan vekili"ni) saf motorda oynatır; skor dağılımı,
// pişti sıklığı, çoğunluk (en çok kart) kavgası, son alma (kalan kartlar) ve botun "salak" sayılacak hamlelerini ölçer.
// Testler (tests/pistiAudit.test.ts) ve docs/BOTS.md ölçümleri bunu kullanır. Botlar yalnız süzülmüş olay + görünüm görür.
import {PistiBot, type BotPersonality} from '../src/ai/bot';
import {applyPlay, createGame, viewFor} from '../src/core/pisti';
import {HIDDEN_CARD, pistiEngine} from '../src/core/pistiEngine';
import {mulberry32} from '../src/core/rng';
import {type CardId, cardId, type PistiConfig, type PistiEvent, type PlayerView, rankOf} from '../src/core/types';

export const CLUB2 = cardId('C', 2);
export const DIAMOND10 = cardId('D', 10);
export const cardValue = (c: CardId): number => {
  const r = rankOf(c);
  return r === 1 || r === 11 ? 1 : c === CLUB2 ? 2 : c === DIAMOND10 ? 3 : 0;
};

export interface PistiPlayer {
  choose(v: PlayerView): CardId;
  observe(e: PistiEvent): void;
}

/** Basit insan vekili: alabiliyorsa alır (pişti > değerli yığın > Valeyi saklar), alamıyorsa en değersiz kartı atar. Kart saymaz. */
export function humanProxy(seed: number): PistiPlayer {
  const rnd = mulberry32(seed);
  return {
    observe() {},
    choose(v) {
      const top = v.pileTop;
      const n = v.pileCount;
      const hand = v.hand;
      const same = top === null ? [] : hand.filter((c) => rankOf(c) === rankOf(top));
      const jacks = hand.filter((c) => rankOf(c) === 11);
      if (n === 1 && same.length) return same[0];
      let pileVal = 0;
      for (const c of v.pileVisible) pileVal += cardValue(c);
      if (same.length && n > 0) return same[0];
      if (jacks.length && n > 0 && (pileVal >= 2 || n >= 4 || hand.length === 1)) return jacks[0];
      const non = hand.filter((c) => rankOf(c) !== 11);
      const pool = non.length ? non : hand;
      // en düşük değerli, eşitlikte rastgele
      let best = pool[0];
      let bk = Infinity;
      for (const c of pool) {
        const k = cardValue(c) * 10 + rnd();
        if (k < bk) {
          bk = k;
          best = c;
        }
      }
      return best;
    },
  };
}

export const botPlayer = (seat: number, p: BotPersonality, seed: number): PistiPlayer & {bot: PistiBot} => {
  const bot = new PistiBot(seat, p, mulberry32(seed));
  return {bot, choose: (v) => bot.choose(v), observe: (e) => bot.observe(e)};
};

export interface PistiGameMetrics {
  totals: number[];
  cards: number[];
  winners: number[];
  pisti: number[];
  jackPisti: number[];
  majorityTie: boolean;
  /** Bot hamle kalitesi sayaçları (koltuk başına). */
  cheapJack: number[];
  jackOnEmpty: number[];
  missedPisti: number[];
  /** Boş yığına attığı kartı sıradaki rakip piştiledi. */
  gavePisti: number[];
  /** ...ve elinde, rakibin piştileyemeyeceği (tüm kopyaları görülmüş) bir kart vardı. */
  gavePistiAvoidable: number[];
  /** ♦10/♣2'yi açıkta bıraktı, sıradaki rakip aldı. */
  gaveValuable: number[];
  /** Ortağın aldığı yığın (eşli) — bilgi için. */
  lastCapturer: number;
  /** Son alış (kalan kartları alan) kimdeydi ve kaç kart. */
  sweep: number;
  /** Son elde Valeyi son karta saklayıp son yığını aldı mı (koltuk başına). */
  jackLast: number[];
  plays: number;
}

export function auditPistiGame(cfg: PistiConfig, players: PistiPlayer[], botSeats: boolean[]): PistiGameMetrics {
  const n = cfg.seats;
  const g = createGame(cfg);
  let s = g.state;
  // her oyuncu yalnız kendi koltuğuna süzülmüş olayları görür (çevrimiçi ile aynı)
  const feed = (evs: PistiEvent[]) => {
    for (const e of evs)
      for (let i = 0; i < n; i++) {
        const r = pistiEngine.redact(e, i);
        if (r) players[i].observe(r);
      }
  };
  feed(g.events);
  const zero = () => new Array<number>(n).fill(0);
  const m: PistiGameMetrics = {
    totals: [],
    cards: [],
    winners: [],
    pisti: zero(),
    jackPisti: zero(),
    majorityTie: false,
    cheapJack: zero(),
    jackOnEmpty: zero(),
    missedPisti: zero(),
    gavePisti: zero(),
    gavePistiAvoidable: zero(),
    gaveValuable: zero(),
    lastCapturer: -1,
    sweep: 0,
    jackLast: zero(),
    plays: 0,
  };
  // görülen kartlar (kamuya açık): açık masa kartı + oynanan her kart
  const seen = new Uint8Array(52);
  for (const e of g.events) if (e.t === 'tableDeal') e.cards.forEach((c, i) => e.faceUp[i] && c !== HIDDEN_CARD && (seen[c] = 1));
  let pendingDrop: {seat: number; card: CardId; empty: boolean; avoidable: boolean} | null = null;
  while (!s.over) {
    const seat = s.turn;
    const v = viewFor(s, seat);
    const card = players[seat].choose(v);
    if (!s.hands[seat].includes(card)) throw new Error(`elde olmayan kart ${card}`);
    m.plays++;
    const top = v.pileTop;
    const isBot = botSeats[seat];
    const jack = rankOf(card) === 11;
    const capture = v.pileCount > 0 && (jack || (top !== null && rankOf(card) === rankOf(top)));
    if (isBot) {
      // pişti kaçırma
      if (v.pileCount === 1 && top !== null && v.hand.some((c) => rankOf(c) === rankOf(top)) && !(capture && rankOf(card) === rankOf(top))) m.missedPisti[seat]++;
      // boş yığına Vale
      if (jack && v.pileCount === 0 && v.hand.some((c) => rankOf(c) !== 11)) m.jackOnEmpty[seat]++;
      // ucuz yığına Vale (deste bitmemişken, aynı değerle alma ya da değersiz atış seçeneği varken)
      if (jack && capture && top !== null && rankOf(top) !== 11) {
        let val = 0;
        for (const c of v.pileVisible) val += cardValue(c);
        const hidden = v.pileCount - v.pileVisible.length;
        if (val === 0 && hidden === 0 && v.pileCount <= 2 && v.deckCount > 0 && v.hand.some((c) => rankOf(c) !== 11)) m.cheapJack[seat]++;
      }
    }
    // önceki atış sonucu: sıradaki rakip aldı mı
    const r = applyPlay(s, seat, card);
    const cap = r.events.find((e) => e.t === 'capture') as Extract<PistiEvent, {t: 'capture'}> | undefined;
    if (pendingDrop && cfg.teams[pendingDrop.seat] !== cfg.teams[seat]) {
      if (cap) {
        if (pendingDrop.empty && cap.pisti > 0 && botSeats[pendingDrop.seat]) {
          m.gavePisti[pendingDrop.seat]++;
          if (pendingDrop.avoidable) m.gavePistiAvoidable[pendingDrop.seat]++;
        }
        if ((pendingDrop.card === DIAMOND10 || pendingDrop.card === CLUB2) && cap.cards.includes(pendingDrop.card) && botSeats[pendingDrop.seat]) m.gaveValuable[pendingDrop.seat]++;
      }
    }
    pendingDrop = null;
    if (!cap) {
      // boş yığına atıldıysa: elinde güvenli (tüm kopyaları görülmüş, Vale olmayan) başka kart var mıydı?
      let avoidable = false;
      if (v.pileCount === 0) {
        for (const c of v.hand) {
          if (c === card || rankOf(c) === 11) continue;
          let unseen = 0;
          for (let su = 0; su < 4; su++) {
            const x = su * 13 + rankOf(c) - 1;
            if (!seen[x] && !v.hand.includes(x)) unseen++;
          }
          if (unseen === 0) avoidable = true;
        }
      }
      pendingDrop = {seat, card, empty: v.pileCount === 0, avoidable};
    } else {
      if (cap.pisti > 0) {
        m.pisti[seat]++;
        if (cap.pisti === 20) m.jackPisti[seat]++;
      }
    }
    seen[card] = 1;
    // son kart Vale ile son yığını aldı mı
    if (s.deck.length === 0 && v.hand.length === 1 && jack && cap) m.jackLast[seat]++;
    s = r.state;
    feed(r.events);
    for (const e of r.events) {
      if (e.t === 'finalSweep') m.sweep = e.cards.length;
      if (e.t === 'gameOver') {
        m.totals = e.result.sides.map((x) => x.total);
        m.cards = e.result.sides.map((x) => x.cards);
        m.winners = e.result.winners;
        m.majorityTie = e.result.sides.every((x) => x.majority === 0);
      }
    }
  }
  m.lastCapturer = s.lastCapturer;
  return m;
}
