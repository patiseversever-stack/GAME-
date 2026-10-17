import {describe, expect, it} from 'vitest';
import {applyPlay, createGame, legalMoves, scoreGame, viewFor} from '../src/core/pisti';
import {mulberry32, shuffle} from '../src/core/rng';
import {HIDDEN_CARD, pistiEngine} from '../src/core/pistiEngine';
import {cardId, isJack, rankOf, type CardId, type PistiConfig, type PistiEvent, type PistiState} from '../src/core/types';

const CONFIGS: PistiConfig[] = [
  {seats: 2, teams: [0, 1], dealer: 1, seed: 0},
  {seats: 2, teams: [0, 1], dealer: 0, seed: 0},
  {seats: 4, teams: [0, 1, 2, 3], dealer: 3, seed: 0},
  {seats: 4, teams: [0, 1, 0, 1], dealer: 2, seed: 0},
];

/** Rastgele oynayarak oyunu bitirir; tüm olayları ve son durumu döndürür. */
function playRandom(cfg: PistiConfig): {events: PistiEvent[]; state: PistiState} {
  const rnd = mulberry32(cfg.seed ^ 0x9e3779b9);
  const g = createGame(cfg);
  let state = g.state;
  const events = [...g.events];
  while (!state.over) {
    const moves = legalMoves(state, state.turn);
    const r = applyPlay(state, state.turn, moves[Math.floor(rnd() * moves.length)]);
    state = r.state;
    events.push(...r.events);
  }
  return {events, state};
}

/** Elle kurulan durum: boş deste, boş eller; testler ihtiyacı olanı doldurur. */
function mk(over: Partial<PistiState> = {}): PistiState {
  return {
    cfg: {seats: 2, teams: [0, 1], dealer: 1, seed: 1},
    deck: [],
    pile: [],
    pileHiddenCount: 0,
    hands: [[], []],
    captured: [[], []],
    pistiPoints: [0, 0],
    turn: 0,
    lastCapturer: -1,
    round: 1,
    over: false,
    ...over,
  };
}

const C = cardId;

describe('rng', () => {
  it('mulberry32 aynı tohumda aynı diziyi üretir, [0,1) aralığındadır', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('shuffle yerinde karıştırır, aynı diziyi döndürür ve permütasyondur', () => {
    const arr = Array.from({length: 52}, (_, i) => i);
    const out = shuffle(arr, mulberry32(7));
    expect(out).toBe(arr);
    expect([...arr].sort((x, y) => x - y)).toEqual(Array.from({length: 52}, (_, i) => i));
    expect(arr).not.toEqual(Array.from({length: 52}, (_, i) => i));
  });
});

describe('createGame', () => {
  it('aynı tohum → aynı olaylar ve durum; farklı tohum → farklı', () => {
    for (const cfg of CONFIGS) {
      const a = createGame({...cfg, seed: 123});
      const b = createGame({...cfg, seed: 123});
      expect(b.events).toEqual(a.events);
      expect(b.state).toEqual(a.state);
      expect(createGame({...cfg, seed: 124}).events).not.toEqual(a.events);
    }
  });

  it('tüm oyun aynı tohumda aynı olay dizisini üretir', () => {
    for (const cfg of CONFIGS) {
      const a = playRandom({...cfg, seed: 99});
      const b = playRandom({...cfg, seed: 99});
      expect(b.events).toEqual(a.events);
    }
  });

  it('masada 4 kart (3 kapalı + 1 açık), üstü Vale değil; eller 4er; deste doğru', () => {
    for (const cfg of CONFIGS) {
      for (let seed = 0; seed < 300; seed++) {
        const {state, events} = createGame({...cfg, seed});
        expect(state.pile).toHaveLength(4);
        expect(state.pileHiddenCount).toBe(3);
        expect(isJack(state.pile[3])).toBe(false);
        for (const h of state.hands) expect(h).toHaveLength(4);
        expect(state.deck).toHaveLength(52 - 4 - 4 * cfg.seats);
        expect(state.turn).toBe((cfg.dealer + 1) % cfg.seats);
        expect(state.round).toBe(1);
        expect(state.lastCapturer).toBe(-1);
        expect(state.over).toBe(false);
        // 52 kart tekrarsız dağılmış
        const all = [...state.deck, ...state.pile, ...state.hands.flat()];
        expect(new Set(all).size).toBe(52);
        expect(events[0]).toEqual({t: 'tableDeal', cards: state.pile, faceUp: [false, false, false, true]});
        expect(events).toHaveLength(2);
      }
    }
  });

  it('el dağıtımı tek tek, (dealer+1)\'den koltuk sırasıyla 4 tur', () => {
    for (const cfg of CONFIGS) {
      const {state, events} = createGame({...cfg, seed: 5});
      const ev = events[1];
      if (ev.t !== 'handDeal') throw new Error('handDeal bekleniyordu');
      expect(ev.round).toBe(1);
      expect(ev.deals).toHaveLength(4 * cfg.seats);
      ev.deals.forEach((d, i) => expect(d.seat).toBe((cfg.dealer + 1 + i) % cfg.seats));
      for (let s = 0; s < cfg.seats; s++) {
        expect(state.hands[s]).toEqual(ev.deals.filter((d) => d.seat === s).map((d) => d.card));
      }
    }
  });

  it('açık kart Vale çıkarsa o Vale desteye döner, ilk 3 kapalı kart değişmez', () => {
    let tested = 0;
    for (let seed = 0; seed < 400 && tested < 5; seed++) {
      const cfg: PistiConfig = {seats: 2, teams: [0, 1], dealer: 1, seed};
      const deck = shuffle(Array.from({length: 52}, (_, i) => i), mulberry32(seed));
      if (!isJack(deck[48])) continue;
      tested++;
      const {state} = createGame(cfg);
      expect(state.pile.slice(0, 3)).toEqual([deck[51], deck[50], deck[49]]);
      expect(isJack(state.pile[3])).toBe(false);
      const all = [...state.deck, ...state.pile, ...state.hands.flat()];
      expect(new Set(all).size).toBe(52);
    }
    expect(tested).toBeGreaterThan(0);
  });
});

describe('tam oyun değişmezleri', () => {
  it('rastgele oyunlarda 52 kart tam bir kez toplanır, olay dizisi ve puanlar tutarlı', () => {
    for (const base of CONFIGS) {
      for (let seed = 1; seed <= 150; seed++) {
        const cfg = {...base, seed};
        const {events, state} = playRandom(cfg);
        expect(state.over).toBe(true);
        expect(state.pile).toHaveLength(0);
        expect(state.deck).toHaveLength(0);
        for (const h of state.hands) expect(h).toHaveLength(0);

        const all = state.captured.flat().sort((a, b) => a - b);
        expect(all).toEqual(Array.from({length: 52}, (_, i) => i));

        // Olay dizisi: tableDeal, handDeal(1), (play capture? handDeal?)..., finalSweep?, gameOver
        expect(events[0].t).toBe('tableDeal');
        const deals = events.filter((e) => e.t === 'handDeal');
        expect(deals).toHaveLength(cfg.seats === 2 ? 6 : 3);
        deals.forEach((d, i) => d.t === 'handDeal' && expect(d.round).toBe(i + 1));
        const plays = events.filter((e) => e.t === 'play');
        expect(plays).toHaveLength(48);
        expect(events.filter((e) => e.t === 'gameOver')).toHaveLength(1);
        expect(events[events.length - 1].t).toBe('gameOver');
        events.forEach((e, i) => {
          if (e.t === 'capture') expect(events[i - 1].t).toBe('play');
          if (e.t === 'finalSweep') expect(events[i + 1].t).toBe('gameOver');
          if (e.t === 'handDeal' && i > 1) expect(events[i - 1].t === 'play' || events[i - 1].t === 'capture').toBe(true);
        });

        // Oynama sırası koltuk sırasında, her yeniden dağıtımdan sonra (dealer+1)'den
        let expectedSeat = (cfg.dealer + 1) % cfg.seats;
        for (const e of events) {
          if (e.t === 'play') {
            expect(e.seat).toBe(expectedSeat);
            expectedSeat = (expectedSeat + 1) % cfg.seats;
          }
          if (e.t === 'handDeal') expect(expectedSeat).toBe((cfg.dealer + 1) % cfg.seats);
        }

        // Puan tutarlılığı
        const last = events[events.length - 1];
        if (last.t !== 'gameOver') throw new Error('gameOver bekleniyordu');
        const res = last.result;
        expect(res).toEqual(scoreGame(state));
        const sum = (k: 'cards' | 'aces' | 'jacks' | 'club2' | 'diamond10' | 'majority' | 'pisti') =>
          res.sides.reduce((a, s) => a + s[k], 0);
        expect(sum('cards')).toBe(52);
        expect(sum('aces')).toBe(4);
        expect(sum('jacks')).toBe(4);
        expect(sum('club2')).toBe(2);
        expect(sum('diamond10')).toBe(3);
        expect(sum('aces') + sum('jacks') + sum('club2') + sum('diamond10')).toBe(13);
        expect([0, 3]).toContain(sum('majority'));
        const pistiEvents = events.reduce((a, e) => a + (e.t === 'capture' ? e.pisti : 0), 0);
        expect(sum('pisti')).toBe(pistiEvents);
        for (const s of res.sides) {
          expect(s.total).toBe(s.majority + s.aces + s.jacks + s.club2 + s.diamond10 + s.pisti);
        }
        const max = Math.max(...res.sides.map((s) => s.total));
        expect(res.winners).toEqual(res.sides.filter((s) => s.total === max).map((s) => s.side));
      }
    }
  });

  it('taraflar takım kimliğine göre sıralı ve koltukları doğru toplanır', () => {
    const {state} = playRandom({seats: 4, teams: [0, 1, 0, 1], dealer: 0, seed: 11});
    const res = scoreGame(state);
    expect(res.sides.map((s) => s.side)).toEqual([0, 1]);
    expect(res.sides[0].seats).toEqual([0, 2]);
    expect(res.sides[1].seats).toEqual([1, 3]);
    expect(res.sides[0].cards).toBe(state.captured[0].length + state.captured[2].length);
    const solo = scoreGame(playRandom({seats: 4, teams: [0, 1, 2, 3], dealer: 0, seed: 11}).state);
    expect(solo.sides.map((s) => s.side)).toEqual([0, 1, 2, 3]);
  });
});

describe('Pişti: baştaki kapalı masa kartları (yalnız alan görür)', () => {
  const pile = [C('H', 2), C('D', 10), C('C', 2), C('D', 8)]; // ilk üçü kapalı (♦10 ve ♣2 değerli)
  it('yakalama olayı kaç kartın kapalı olduğunu söyler; yalnız ilk yakalamada', () => {
    const s = mk({pile, pileHiddenCount: 3, hands: [[C('S', 8), C('S', 3)], [C('D', 4), C('S', 4)]]});
    const r = applyPlay(s, 0, C('S', 8));
    expect(r.events[1]).toEqual({t: 'capture', seat: 0, cards: [...pile, C('S', 8)], pisti: 0, hidden: 3});
    expect(r.state.captured[0]).toEqual([...pile, C('S', 8)]); // puan sayımı için motor her şeyi bilir
    // sonraki yakalamalarda kapalı kart yok
    const r2 = applyPlay(applyPlay(r.state, 1, C('D', 4)).state, 0, C('S', 3));
    expect(r2.events.find((e) => e.t === 'capture')).toBeUndefined();
    const r3 = applyPlay(mk({pile: [C('H', 5), C('D', 9)], hands: [[C('S', 9), C('S', 2)], [C('D', 4)]]}), 0, C('S', 9));
    expect(r3.events[1]).toEqual({t: 'capture', seat: 0, cards: [C('H', 5), C('D', 9), C('S', 9)], pisti: 0});
  });

  it('süzme: alan kapalı kartların yüzünü görür, diğer koltuklar (ve seyirci) kapalı (−1) görür; sayı ve açık kartlar herkese', () => {
    const s = mk({cfg: {seats: 4, teams: [0, 1, 0, 1], dealer: 3, seed: 1}, pile, pileHiddenCount: 3, hands: [[C('S', 2)], [C('S', 8), C('S', 3)], [C('D', 3)], [C('H', 4)]], captured: [[], [], [], []], pistiPoints: [0, 0, 0, 0], turn: 1});
    const cap = applyPlay(s, 1, C('S', 8)).events[1] as Extract<PistiEvent, {t: 'capture'}>;
    for (let seat = -1; seat < 4; seat++) {
      const x = pistiEngine.redact(cap, seat) as Extract<PistiEvent, {t: 'capture'}>;
      expect(x.cards.length).toBe(5);
      expect(x.hidden).toBe(3);
      expect(x.cards.slice(3)).toEqual([C('D', 8), C('S', 8)]);
      // eşlide ortak (3) da görmez: kapalı kartı YALNIZ alan görür
      expect(x.cards.slice(0, 3)).toEqual(seat === 1 ? pile.slice(0, 3) : [HIDDEN_CARD, HIDDEN_CARD, HIDDEN_CARD]);
    }
    expect(cap.cards[0]).toBe(C('H', 2)); // süzme kopya üretir
  });

  it('kimse hiç almadıysa son süpürmede de kapalı kartlar yalnız alana açık', () => {
    const s = mk({cfg: {seats: 2, teams: [0, 1], dealer: 1, seed: 1}, pile, pileHiddenCount: 3, hands: [[C('S', 6)], []], turn: 0});
    const r = applyPlay(s, 0, C('S', 6));
    const sw = r.events[1] as Extract<PistiEvent, {t: 'finalSweep'}>;
    expect(sw).toEqual({t: 'finalSweep', seat: 1, cards: [...pile, C('S', 6)], hidden: 3});
    expect((pistiEngine.redact(sw, 1) as typeof sw).cards).toEqual([...pile, C('S', 6)]);
    expect((pistiEngine.redact(sw, 0) as typeof sw).cards).toEqual([HIDDEN_CARD, HIDDEN_CARD, HIDDEN_CARD, C('D', 8), C('S', 6)]);
    // el sonu sayımı herkese açık: puanlar kapalı kartları da sayar
    const go = r.events[2] as Extract<PistiEvent, {t: 'gameOver'}>;
    expect(go.result.sides[1]).toMatchObject({club2: 2, diamond10: 3});
  });
});

describe('applyPlay senaryoları', () => {
  const hands = (h0: CardId[], h1: CardId[]) => [h0, h1];
  const filler = [C('S', 2), C('S', 3)]; // elde kalsın ki el bitmesin

  it('pişti 10: tek kart yığına aynı değer', () => {
    const s = mk({pile: [C('H', 7)], hands: hands([C('S', 7), ...filler], [C('D', 4)])});
    const r = applyPlay(s, 0, C('S', 7));
    expect(r.events).toEqual([
      {t: 'play', seat: 0, card: C('S', 7)},
      {t: 'capture', seat: 0, cards: [C('H', 7), C('S', 7)], pisti: 10},
    ]);
    expect(r.state.pile).toEqual([]);
    expect(r.state.pistiPoints).toEqual([10, 0]);
    expect(r.state.captured[0]).toEqual([C('H', 7), C('S', 7)]);
    expect(r.state.lastCapturer).toBe(0);
    expect(r.state.turn).toBe(1);
    expect(r.state.pileHiddenCount).toBe(0);
  });

  it('Vale pişti 20: tek Vale üstüne Vale', () => {
    const s = mk({pile: [C('H', 11)], hands: hands([C('S', 11), ...filler], [C('D', 4)])});
    const r = applyPlay(s, 0, C('S', 11));
    expect(r.events[1]).toEqual({t: 'capture', seat: 0, cards: [C('H', 11), C('S', 11)], pisti: 20});
    expect(r.state.pistiPoints[0]).toBe(20);
  });

  it('Vale, tek Vale-olmayan karta: normal yakalama, pişti yok', () => {
    const s = mk({pile: [C('H', 5)], hands: hands([C('S', 11), ...filler], [C('D', 4)])});
    const r = applyPlay(s, 0, C('S', 11));
    expect(r.events[1]).toEqual({t: 'capture', seat: 0, cards: [C('H', 5), C('S', 11)], pisti: 0});
    expect(r.state.pistiPoints[0]).toBe(0);
  });

  it('boş yığına Vale: yakalama yok, Vale yığında kalır', () => {
    const s = mk({pile: [], hands: hands([C('S', 11), ...filler], [C('D', 4)])});
    const r = applyPlay(s, 0, C('S', 11));
    expect(r.events).toEqual([{t: 'play', seat: 0, card: C('S', 11)}]);
    expect(r.state.pile).toEqual([C('S', 11)]);
    expect(r.state.lastCapturer).toBe(-1);
    expect(r.state.turn).toBe(1);
  });

  it('çok kartlı yığını aynı değerle almak pişti sayılmaz; Vale her yığını alır', () => {
    const pile = [C('H', 5), C('D', 9), C('C', 5)];
    const a = applyPlay(mk({pile, hands: hands([C('S', 5), ...filler], [C('D', 4)])}), 0, C('S', 5));
    expect(a.events[1]).toEqual({t: 'capture', seat: 0, cards: [...pile, C('S', 5)], pisti: 0});
    const b = applyPlay(mk({pile, hands: hands([C('S', 11), ...filler], [C('D', 4)])}), 0, C('S', 11));
    expect(b.events[1]).toEqual({t: 'capture', seat: 0, cards: [...pile, C('S', 11)], pisti: 0});
    // iki kartlık yığında bile pişti yok
    const c = applyPlay(mk({pile: [C('H', 5), C('D', 5)], hands: hands([C('S', 5), ...filler], [C('D', 4)])}), 0, C('S', 5));
    expect(c.events[1]).toMatchObject({t: 'capture', pisti: 0});
  });

  it('eşleşmeyen kart yığının üstüne gider', () => {
    const s = mk({pile: [C('H', 5)], hands: hands([C('S', 6), ...filler], [C('D', 4)])});
    const r = applyPlay(s, 0, C('S', 6));
    expect(r.events).toHaveLength(1);
    expect(r.state.pile).toEqual([C('H', 5), C('S', 6)]);
    expect(r.state.hands[0]).toEqual(filler);
  });

  it('kapalı kartlı ilk masa: yakalayınca kapalılar da gider, hidden sayacı sıfırlanır', () => {
    const pile = [C('H', 2), C('H', 3), C('H', 4), C('D', 8)];
    const s = mk({pile, pileHiddenCount: 3, hands: hands([C('S', 8), ...filler], [C('D', 4)])});
    const r = applyPlay(s, 0, C('S', 8));
    expect(r.state.captured[0]).toHaveLength(5);
    expect(r.state.pileHiddenCount).toBe(0);
    expect(r.events[1]).toMatchObject({t: 'capture', pisti: 0});
  });

  it('eller bitince desteden yeniden dağıtır (round+1), sıra (dealer+1)\'de', () => {
    const deck = Array.from({length: 16}, (_, i) => 20 + i); // 20..35, sondan çekilir
    const s = mk({
      cfg: {seats: 2, teams: [0, 1], dealer: 0, seed: 1},
      deck: [...deck],
      pile: [C('H', 5)],
      hands: [[], [C('D', 4)]],
      turn: 1,
      round: 3,
    });
    const r = applyPlay(s, 1, C('D', 4));
    const ev = r.events[r.events.length - 1];
    if (ev.t !== 'handDeal') throw new Error('handDeal bekleniyordu');
    expect(ev.round).toBe(4);
    expect(ev.deals).toHaveLength(8);
    // dealer 0 → dağıtım 1. koltuktan başlar, teker teker, destenin sonundan
    expect(ev.deals.map((d) => d.seat)).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
    expect(ev.deals.map((d) => d.card)).toEqual([35, 34, 33, 32, 31, 30, 29, 28]);
    expect(r.state.hands[1]).toEqual([35, 33, 31, 29]);
    expect(r.state.hands[0]).toEqual([34, 32, 30, 28]);
    expect(r.state.deck).toEqual(deck.slice(0, 8));
    expect(r.state.round).toBe(4);
    expect(r.state.turn).toBe(1);
    expect(r.state.over).toBe(false);
  });

  it('deste bitince kalan yığın son alana gider (finalSweep) ve oyun biter', () => {
    const s = mk({
      pile: [C('H', 5), C('D', 9)],
      hands: [[C('S', 6)], [C('C', 8)]],
      captured: [[], [C('S', 13)]],
      lastCapturer: 1,
      turn: 0,
    });
    const r1 = applyPlay(s, 0, C('S', 6));
    expect(r1.state.over).toBe(false);
    const r2 = applyPlay(r1.state, 1, C('C', 8));
    const sweep = [C('H', 5), C('D', 9), C('S', 6), C('C', 8)];
    expect(r2.events.map((e) => e.t)).toEqual(['play', 'finalSweep', 'gameOver']);
    expect(r2.events[1]).toEqual({t: 'finalSweep', seat: 1, cards: sweep});
    expect(r2.state.over).toBe(true);
    expect(r2.state.pile).toEqual([]);
    expect(r2.state.captured[1]).toEqual([C('S', 13), ...sweep]);
    const go = r2.events[2];
    if (go.t !== 'gameOver') throw new Error();
    expect(go.result).toEqual(scoreGame(r2.state));
  });

  it('kimse hiç almadıysa kalan yığın dağıtana gider; yığın boşsa finalSweep yok', () => {
    const s = mk({
      cfg: {seats: 2, teams: [0, 1], dealer: 1, seed: 1},
      pile: [C('H', 5)],
      hands: [[C('S', 6)], []],
      turn: 0,
    });
    const r = applyPlay(s, 0, C('S', 6));
    expect(r.events[1]).toMatchObject({t: 'finalSweep', seat: 1});
    expect(r.state.captured[1]).toEqual([C('H', 5), C('S', 6)]);

    // son hamle yakalamaysa yığın boş: finalSweep yok
    const s2 = mk({pile: [C('H', 5)], hands: [[C('S', 5)], []], turn: 0, lastCapturer: 1});
    const r2 = applyPlay(s2, 0, C('S', 5));
    expect(r2.events.map((e) => e.t)).toEqual(['play', 'capture', 'gameOver']);
  });

  it('girdi durumunu değiştirmez', () => {
    const g = createGame({seats: 4, teams: [0, 1, 0, 1], dealer: 0, seed: 3});
    const before = structuredClone(g.state);
    const move = g.state.hands[g.state.turn][0];
    const r = applyPlay(g.state, g.state.turn, move);
    expect(g.state).toEqual(before);
    expect(r.state).not.toBe(g.state);
    expect(r.state.hands[g.state.turn]).not.toContain(move);
    // sonuç durumu değiştirmek de girdiyi etkilemez
    r.state.deck.length = 0;
    r.state.pile.push(99);
    r.state.cfg.teams[0] = 7;
    expect(g.state).toEqual(before);
  });

  it('kural dışı oyunlar hata fırlatır', () => {
    const g = createGame({seats: 2, teams: [0, 1], dealer: 1, seed: 8});
    const s = g.state; // sıra 0'da
    expect(() => applyPlay(s, 1, s.hands[1][0])).toThrow(); // sıra değil
    const notInHand = [...Array(52).keys()].find((c) => !s.hands[0].includes(c))!;
    expect(() => applyPlay(s, 0, notInHand)).toThrow(); // kart elde yok
    expect(() => applyPlay(s, 0, s.hands[1][0])).toThrow(); // rakibin kartı
    expect(() => applyPlay(s, 5, 0)).toThrow(); // geçersiz koltuk
    const over = playRandom({seats: 2, teams: [0, 1], dealer: 1, seed: 8}).state;
    expect(() => applyPlay(over, over.turn, 0)).toThrow(); // oyun bitti
  });
});

describe('scoreGame', () => {
  const run = (a: CardId[], b: CardId[], p: [number, number] = [0, 0]) =>
    scoreGame(mk({captured: [a, b], pistiPoints: p}));
  const range = (from: number, n: number) => Array.from({length: n}, (_, i) => from + i);

  it('çoğunluk: kesin fazla kartı olana 3; eşitlikte kimseye yok', () => {
    // 26-26: ikisi de 0 (As/Vale/özel kart yok: 2..9 renk S ve H'den seçmek yerine basit bölme)
    const all = range(0, 52);
    const tie = run(all.slice(0, 26), all.slice(26));
    expect(tie.sides.map((s) => s.majority)).toEqual([0, 0]);
    const win = run(all.slice(0, 27), all.slice(27));
    expect(win.sides.map((s) => s.majority)).toEqual([3, 0]);
  });

  it('4 koltukta eşit en çok kart → çoğunluk yok; tek lider → 3', () => {
    const cfg: PistiConfig = {seats: 4, teams: [0, 1, 2, 3], dealer: 0, seed: 1};
    const base = mk({cfg, hands: [[], [], [], []], pistiPoints: [0, 0, 0, 0]});
    const tie = scoreGame({...base, captured: [range(0, 15), range(15, 15), range(30, 11), range(41, 11)]});
    expect(tie.sides.map((s) => s.majority)).toEqual([0, 0, 0, 0]);
    const lead = scoreGame({...base, captured: [range(0, 16), range(16, 15), range(31, 11), range(42, 10)]});
    expect(lead.sides.map((s) => s.majority)).toEqual([3, 0, 0, 0]);
  });

  it('kart puanları ve pişti toplamı; kazanan en yüksek toplam, beraberlikte ikisi', () => {
    // taraf 0: As(S1), Vale(H11), ♣2, ♦10  → 1+1+2+3 + pişti 10 ; 4 kart
    const a = [C('S', 1), C('H', 11), C('C', 2), C('D', 10)];
    const b = range(0, 52).filter((c) => !a.includes(c)); // çoğunluk b'de
    const r = run(a, b, [10, 0]);
    const s0 = r.sides[0];
    expect(s0).toMatchObject({cards: 4, aces: 1, jacks: 1, club2: 2, diamond10: 3, pisti: 10, majority: 0, total: 17});
    const s1 = r.sides[1];
    expect(s1).toMatchObject({cards: 48, aces: 3, jacks: 3, club2: 0, diamond10: 0, pisti: 0, majority: 3, total: 9});
    expect(r.winners).toEqual([0]);

    // beraberlik: 20 pişti vs 20 pişti
    const t = scoreGame(mk({captured: [[], []], pistiPoints: [20, 20]}));
    expect(t.winners).toEqual([0, 1]);
  });

  it('eşli oyunda koltuklar takım olarak toplanır', () => {
    const cfg: PistiConfig = {seats: 4, teams: [0, 1, 0, 1], dealer: 0, seed: 1};
    const st = mk({
      cfg,
      hands: [[], [], [], []],
      captured: [[C('S', 1)], [C('H', 1)], [C('D', 1), C('D', 10)], []],
      pistiPoints: [10, 0, 10, 20],
    });
    const r = scoreGame(st);
    expect(r.sides).toHaveLength(2);
    expect(r.sides[0]).toMatchObject({side: 0, seats: [0, 2], cards: 3, aces: 2, diamond10: 3, pisti: 20, majority: 3, total: 3 + 2 + 3 + 20});
    expect(r.sides[1]).toMatchObject({side: 1, seats: [1, 3], cards: 1, aces: 1, pisti: 20, majority: 0, total: 21});
    expect(r.winners).toEqual([0]);
  });
});

describe('viewFor / legalMoves', () => {
  it('görünüm: gizli kartlar hariç yığın, sayılar, elim', () => {
    const {state} = createGame({seats: 4, teams: [0, 1, 0, 1], dealer: 0, seed: 21});
    const v = viewFor(state, 2);
    expect(v.seat).toBe(2);
    expect(v.seats).toBe(4);
    expect(v.teams).toEqual([0, 1, 0, 1]);
    expect(v.hand).toEqual(state.hands[2]);
    expect(v.handCounts).toEqual([4, 4, 4, 4]);
    expect(v.pileCount).toBe(4);
    expect(v.pileTop).toBe(state.pile[3]);
    expect(v.pileVisible).toEqual([state.pile[3]]);
    expect(v.deckCount).toBe(32);
    expect(v.capturedCounts).toEqual([0, 0, 0, 0]);
    expect(v.turn).toBe(1);
    expect(v.round).toBe(1);
    expect(v.lastCapturer).toBe(-1);
    // kopya: görünümü değiştirmek durumu bozmaz
    v.hand.push(99);
    v.pileVisible.length = 0;
    expect(state.hands[2]).toHaveLength(4);
  });

  it('boş yığında pileTop null; legalMoves yalnızca sırası gelene el verir', () => {
    const s = mk({hands: [[1, 2], [3]], turn: 1});
    expect(viewFor(s, 0).pileTop).toBeNull();
    expect(viewFor(s, 0).pileVisible).toEqual([]);
    expect(legalMoves(s, 1)).toEqual([3]);
    expect(legalMoves(s, 0)).toEqual([]);
    expect(legalMoves({...s, over: true}, 1)).toEqual([]);
  });

  it('yakalamadan sonra kapalı sayacı sıfırlanınca yığın tamamen görünür', () => {
    const s = mk({pile: [1, 2, 3, 4], pileHiddenCount: 3, hands: [[5], [6]]});
    expect(viewFor(s, 0).pileVisible).toEqual([4]);
    expect(viewFor({...s, pileHiddenCount: 0}, 0).pileVisible).toEqual([1, 2, 3, 4]);
    expect(rankOf(1)).toBe(2);
  });
});
