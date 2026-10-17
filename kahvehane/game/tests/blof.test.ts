import {describe, expect, it} from 'vitest';
import {
  actors,
  applyBlof,
  checkBlofInvariants,
  createBlof,
  isLegalFor,
  legalActions,
  redactBlofEvent,
  timeoutAction,
  validateBlof,
  viewFor,
} from '../src/core/blof';
import {blofEngine} from '../src/core/blofEngine';
import {
  BLOF_MODES,
  BLOF_PENALTY,
  BLOF_WINDOW_MS,
  BLOF_WINDOW_SHORT_MS,
  blofConfigFor,
  windowMsFor,
  claimText,
  isTruthful,
  rankName,
  type BlofAction,
  type BlofApplyResult,
  type BlofConfig,
  type BlofEvent,
  type BlofSeatStats,
  type BlofState,
  type BlofStep,
} from '../src/core/blofTypes';
import {cardId, rankOf, type CardId} from '../src/core/types';
import type {BlofDifficulty} from '../src/ai/blofBot';
import {simulate} from './blofSim';

const C = cardId;

const zeroStats = (): BlofSeatStats => ({
  plays: 0,
  opens: 0,
  cardsPlayed: 0,
  bluffs: 0,
  passes: 0,
  challenges: 0,
  caught: 0,
  wrongChallenges: 0,
  timesCaught: 0,
  survived: 0,
  pilesTaken: 0,
  cardsTaken: 0,
  biggestPile: 0,
  penaltyCards: 0,
});

/** Elle kurulan durum: verilen eller, kalan kartlar kenarda (52 korunur). */
function mk(hands: CardId[][], o: Partial<BlofState> & {teams?: number[]} = {}): BlofState {
  const n = hands.length as 2 | 3 | 4;
  const used = new Set(hands.flat());
  for (const c of o.pile ?? []) used.add(c);
  const discard = Array.from({length: 52}, (_, i) => i).filter((c) => !used.has(c));
  const {teams, ...rest} = o;
  return {
    cfg: {seats: n, teams: teams ?? Array.from({length: n}, (_, i) => i), seed: 1, firstSeat: 0, challengeWindowMs: 5000, challengeWindowShortMs: 3000, humanSeats: new Array<boolean>(n).fill(true)},
    hands: hands.map((h) => [...h]),
    pile: [],
    plays: [],
    discard,
    rank: 0,
    opener: 0,
    turn: 0,
    phase: 'turn',
    passes: 0,
    lastSeat: -1,
    lastCount: 0,
    window: null,
    windowSeq: 0,
    round: 1,
    move: 0,
    winner: -1,
    stats: hands.map(zeroStats),
    result: null,
    ...rest,
  };
}

/** Hamleyi uygular; hata olursa testi düşürür. */
function ok(s: BlofState, a: BlofAction): BlofStep {
  const r = applyBlof(s, a);
  if (r.error !== undefined) throw new Error(`${JSON.stringify(a)} reddedildi: ${r.error}`);
  const bad = checkBlofInvariants(r.state);
  if (bad) throw new Error(`tutarsız: ${bad}`);
  return r;
}

function code(r: BlofApplyResult): string | undefined {
  return r.error !== undefined ? r.code : undefined;
}

const types = (evs: BlofEvent[]): string[] => evs.map((e) => e.t);

/** Derin dondurma: motor girdiyi değiştirirse hata fırlar. */
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

describe('Blöf: yardımcılar', () => {
  it('değer adları ve iddia metni', () => {
    expect(rankName(1)).toBe('As');
    expect(rankName(7)).toBe('7');
    expect(rankName(11)).toBe('Vale');
    expect(rankName(12)).toBe('Kız');
    expect(rankName(13)).toBe('Papaz');
    expect(claimText(3, 7)).toBe('3 tane 7');
    expect(claimText(1, 1)).toBe('1 tane As');
  });
  it('isTruthful: tek yanlış kart yalan sayılır', () => {
    expect(isTruthful([C('S', 7), C('H', 7)], 7)).toBe(true);
    expect(isTruthful([C('S', 7), C('H', 8)], 7)).toBe(false);
  });
  it('modlar: 1v1/3/4/eşli', () => {
    expect(BLOF_MODES['1v1'].seats).toBe(2);
    expect(BLOF_MODES['3'].seats).toBe(3);
    expect(BLOF_MODES['4'].teams).toEqual([0, 1, 2, 3]);
    expect(BLOF_MODES.esli.teams).toEqual([0, 1, 0, 1]);
    expect(blofConfigFor('esli', 9, 2)).toEqual({seats: 4, teams: [0, 1, 0, 1], seed: 9, firstSeat: 2});
  });
});

describe('Blöf: dağıtım', () => {
  it('2/3/4 kişi: 52 kartın hepsi, tekrarsız; eller sıralı', () => {
    for (const seats of [2, 3, 4] as const) {
      const {state, events} = createBlof({seats, seed: 77, firstSeat: 0});
      expect(checkBlofInvariants(state)).toBeNull();
      expect(state.hands.flat().length).toBe(52);
      expect(new Set(state.hands.flat()).size).toBe(52);
      for (const h of state.hands) {
        const key = h.map((c) => (c % 13) * 4 + Math.floor(c / 13));
        expect(key).toEqual([...key].sort((a, b) => a - b));
      }
      expect(types(events)).toEqual(['deal', 'turn']);
      expect(events[1]).toEqual({t: 'turn', seat: 0, open: true, rank: 0, round: 1});
    }
  });

  it('3 kişide 17-17-18: fazla kartı turu ilk açmayan (açanın sonraki koltuğu) alır', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (let first = 0; first < 3; first++) {
        const {state, events} = createBlof({seats: 3, seed, firstSeat: first});
        const counts = state.hands.map((h) => h.length);
        expect([...counts].sort()).toEqual([17, 17, 18]);
        expect(counts[first]).toBe(17);
        expect(counts[(first + 1) % 3]).toBe(18);
        const deal = events[0] as Extract<BlofEvent, {t: 'deal'}>;
        expect(deal.startSeat).toBe((first + 1) % 3);
        expect(deal.counts).toEqual(counts);
      }
    }
  });

  it('aynı tohum → aynı dağıtım; ilk açan verilmezse tohumdan seçilir', () => {
    const a = createBlof({seats: 4, seed: 123});
    const b = createBlof({seats: 4, seed: 123});
    expect(a).toEqual(b);
    expect(createBlof({seats: 4, seed: 124}).state.hands).not.toEqual(a.state.hands);
    const firsts = new Set<number>();
    for (let seed = 0; seed < 40; seed++) firsts.add(createBlof({seats: 4, seed}).state.cfg.firstSeat);
    expect(firsts.size).toBe(4);
    expect(a.state.cfg.challengeWindowMs).toBe(5000);
  });

  it('geçersiz ayar fırlatır', () => {
    expect(() => createBlof({seats: 5 as 4, seed: 1})).toThrow();
    expect(() => createBlof({seats: 4, teams: [0, 1, 0], seed: 1})).toThrow();
    expect(() => createBlof({seats: 2, teams: [0, 0], seed: 1})).toThrow();
    expect(() => createBlof({seats: 2, seed: 1, firstSeat: 2})).toThrow();
  });
});

describe('Blöf: hamle doğrulama', () => {
  const s0 = mk([
    [C('S', 7), C('H', 7), C('D', 2), C('C', 9), C('S', 1)],
    [C('C', 7), C('S', 3), C('H', 3)],
    [C('D', 7), C('H', 13), C('S', 13)],
  ]);

  it('sıra, değer, kart sayısı, tekrar, elde olmayan kart', () => {
    expect(code(applyBlof(s0, {t: 'open', seat: 1, rank: 3, cards: [C('S', 3)]}))).toBe('turn');
    expect(code(applyBlof(s0, {t: 'open', seat: 0, rank: 0, cards: [C('S', 7)]}))).toBe('bad-rank');
    expect(code(applyBlof(s0, {t: 'open', seat: 0, rank: 14, cards: [C('S', 7)]}))).toBe('bad-rank');
    expect(code(applyBlof(s0, {t: 'open', seat: 0, rank: 7.5, cards: [C('S', 7)]}))).toBe('bad-rank');
    expect(code(applyBlof(s0, {t: 'open', seat: 0, rank: 7, cards: []}))).toBe('bad-count');
    const five = s0.hands[0];
    expect(code(applyBlof(s0, {t: 'open', seat: 0, rank: 7, cards: five}))).toBe('bad-count');
    expect(code(applyBlof(s0, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('S', 7)]}))).toBe('duplicate');
    expect(code(applyBlof(s0, {t: 'open', seat: 0, rank: 7, cards: [C('C', 7)]}))).toBe('not-in-hand');
    expect(code(applyBlof(s0, {t: 'open', seat: 0, rank: 7, cards: [52]}))).toBe('bad-card');
    expect(code(applyBlof(s0, {t: 'open', seat: 9, rank: 7, cards: [C('S', 7)]}))).toBe('bad-seat');
    expect(code(applyBlof(s0, {t: 'nope'} as unknown as BlofAction))).toBe('bad-action');
  });

  it('turu açan pas diyemez, değer söylemeden atamaz; açık turda yeniden değer söylenemez', () => {
    expect(code(applyBlof(s0, {t: 'pass', seat: 0}))).toBe('cannot-pass');
    expect(code(applyBlof(s0, {t: 'play', seat: 0, cards: [C('S', 7)]}))).toBe('must-open');
    let s = ok(s0, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]}).state;
    s = ok(s, {t: 'windowClosed'}).state;
    expect(code(applyBlof(s, {t: 'open', seat: 1, rank: 3, cards: [C('S', 3)]}))).toBe('not-open');
  });

  it('pencere açıkken atış/pas yok; blöf/geç/windowClosed yalnız pencerede', () => {
    expect(code(applyBlof(s0, {t: 'challenge', seat: 1}))).toBe('phase');
    expect(code(applyBlof(s0, {t: 'decline', seat: 1}))).toBe('phase');
    expect(code(applyBlof(s0, {t: 'windowClosed'}))).toBe('phase');
    const s = ok(s0, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]}).state;
    expect(s.phase).toBe('window');
    expect(s.turn).toBe(1);
    expect(code(applyBlof(s, {t: 'play', seat: 1, cards: [C('C', 7)]}))).toBe('phase');
    expect(code(applyBlof(s, {t: 'pass', seat: 1}))).toBe('phase');
    expect(code(applyBlof(s, {t: 'challenge', seat: 0}))).toBe('own-play');
    expect(code(applyBlof(s, {t: 'windowClosed', id: 99}))).toBe('stale');
    expect(code(applyBlof(s, {t: 'windowClosed', id: s.window!.id}))).toBeUndefined();
  });

  it('girdi durumu asla değişmez (derin dondurulmuş durumla oynanır)', () => {
    let s = deepFreeze(createBlof({seats: 3, seed: 5, firstSeat: 0}).state);
    const hand = s.hands[0];
    s = deepFreeze(ok(s, {t: 'open', seat: 0, rank: rankOf(hand[0]), cards: [hand[0], hand[1]]}).state);
    s = deepFreeze(ok(s, {t: 'decline', seat: 1}).state);
    s = deepFreeze(ok(s, {t: 'challenge', seat: 2}).state);
    expect(s.phase).toBe('turn');
    // hatalı hamle de durumu değiştirmez
    expect(code(applyBlof(s, {t: 'pass', seat: 2}))).toBeDefined();
  });

  it('validateBlof ve applyBlof aynı kararı verir', () => {
    const acts: BlofAction[] = [
      {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]},
      {t: 'pass', seat: 0},
      {t: 'challenge', seat: 1},
      {t: 'open', seat: 1, rank: 3, cards: [C('S', 3)]},
    ];
    for (const a of acts) expect(validateBlof(s0, a)?.code).toBe(code(applyBlof(s0, a)));
  });
});

describe('Blöf: blöf penceresi', () => {
  it('doğru çıkarsa yığının TAMAMINI blöf diyen alır, yeni turu atan açar', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2)],
      [C('C', 7), C('S', 3), C('H', 3)],
      [C('D', 9), C('H', 13), C('S', 13)],
    ]);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]}).state;
    s = ok(s, {t: 'windowClosed'}).state;
    s = ok(s, {t: 'play', seat: 1, cards: [C('C', 7)]}).state; // doğru
    s = ok(s, {t: 'decline', seat: 0}).state; // 0 geçti, pencere hâlâ açık (2 karar vermedi)
    expect(s.phase).toBe('window');
    const r = ok(s, {t: 'challenge', seat: 2});
    expect(types(r.events)).toEqual(['challenged', 'reveal', 'pileTaken', 'turn']);
    const rev = r.events[1] as Extract<BlofEvent, {t: 'reveal'}>;
    expect(rev).toMatchObject({seat: 1, by: 2, rank: 7, cards: [C('C', 7)], truthful: true});
    const taken = r.events[2] as Extract<BlofEvent, {t: 'pileTaken'}>;
    expect(taken).toMatchObject({seat: 2, count: 2, reason: 'wrongChallenge', handCount: 5});
    s = r.state;
    expect(s.hands[2]).toEqual(expect.arrayContaining([C('S', 7), C('C', 7)]));
    expect(s.pile).toEqual([]);
    expect(s.rank).toBe(0);
    expect(s.turn).toBe(1);
    expect(s.opener).toBe(1);
    expect(r.events[3]).toMatchObject({t: 'turn', seat: 1, open: true});
    expect(s.stats[2]).toMatchObject({challenges: 1, wrongChallenges: 1, pilesTaken: 1, cardsTaken: 2});
    expect(s.stats[1]).toMatchObject({survived: 1, bluffs: 0});
  });

  it('yalan çıkarsa yığının tamamını atan alır, yeni turu yakalayan açar; tek yanlış kart yeter', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2)],
      [C('C', 7), C('S', 3), C('H', 3)],
    ]);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('D', 2)]}).state; // biri yanlış
    expect(s.stats[0].bluffs).toBe(1);
    const r = ok(s, {t: 'challenge', seat: 1});
    const rev = r.events[1] as Extract<BlofEvent, {t: 'reveal'}>;
    expect(rev.truthful).toBe(false);
    expect(r.events[2]).toMatchObject({t: 'pileTaken', seat: 0, count: 2, reason: 'caught', handCount: 3});
    // + ceza: kenarın üstünden 2 kart (kenarda 46 kart var)
    expect(r.events[3]).toMatchObject({t: 'penalty', seat: 0, count: 2, handCount: 5, discardCount: 44});
    expect(r.state.turn).toBe(1);
    expect(r.state.rank).toBe(0);
    expect(r.state.hands[0].length).toBe(5);
    expect(r.state.stats[1]).toMatchObject({caught: 1});
    expect(r.state.stats[0]).toMatchObject({timesCaught: 1, penaltyCards: 2});
  });

  it('herkes geçerse pencere erken kapanır; geçen sonra blöf diyemez; atan geçemez', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2)],
      [C('C', 7), C('S', 3), C('H', 3)],
      [C('D', 9), C('H', 13), C('S', 13)],
    ]);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]}).state;
    expect(code(applyBlof(s, {t: 'decline', seat: 0}))).toBe('own-play');
    s = ok(s, {t: 'decline', seat: 1}).state;
    expect(code(applyBlof(s, {t: 'challenge', seat: 1}))).toBe('declined');
    expect(code(applyBlof(s, {t: 'decline', seat: 1}))).toBe('declined');
    expect(actors(s)).toEqual([2]);
    const r = ok(s, {t: 'decline', seat: 2});
    expect(types(r.events)).toEqual(['declined', 'windowClosed', 'turn']);
    expect(r.events[1]).toMatchObject({reason: 'declined', by: 0});
    expect(r.state.phase).toBe('turn');
    expect(r.state.turn).toBe(1);
  });

  it('eşlide takım arkadaşının hamlesine blöf denemez', () => {
    let s = mk(
      [
        [C('S', 7), C('H', 7)],
        [C('C', 7), C('S', 3)],
        [C('D', 9), C('H', 13)],
        [C('S', 13), C('H', 2)],
      ],
      {teams: [0, 1, 0, 1]},
    );
    const r = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]});
    const wo = r.events.find((e) => e.t === 'windowOpen') as Extract<BlofEvent, {t: 'windowOpen'}>;
    expect(wo.eligible).toEqual([1, 3]);
    s = r.state;
    expect(code(applyBlof(s, {t: 'challenge', seat: 2}))).toBe('teammate');
    expect(code(applyBlof(s, {t: 'decline', seat: 2}))).toBe('teammate');
    expect(viewFor(s, 2).canChallenge).toBe(false);
    expect(viewFor(s, 1).canChallenge).toBe(true);
    // iki rakip geçince kapanır (ortak beklenmez)
    s = ok(s, {t: 'decline', seat: 1}).state;
    s = ok(s, {t: 'decline', seat: 3}).state;
    expect(s.phase).toBe('turn');
  });

  it('süre dolunca (windowClosed) sıra sonrakine geçer, tur sürer', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2)],
      [C('C', 7), C('S', 3), C('H', 3)],
    ]);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 7)]}).state;
    const r = ok(s, {t: 'windowClosed', id: s.window!.id});
    expect(types(r.events)).toEqual(['windowClosed', 'turn']);
    expect(r.events[0]).toMatchObject({reason: 'timeout'});
    expect(r.events[1]).toMatchObject({seat: 1, open: false, rank: 7});
    expect(r.state.pile.length).toBe(2);
  });
});

describe('Blöf: yakalanan yalancıya ceza (kenardan 2 kart)', () => {
  /** Kenarı açıkça verilen durum: eller + kenar (sırasıyla, en üstteki en sonda); geri kalan kartlar 1. koltuğa. */
  function mkDisc(h0: CardId[], discard: CardId[], extra1: CardId[] = []): BlofState {
    const used = new Set([...h0, ...discard, ...extra1]);
    const rest = Array.from({length: 52}, (_, i) => i).filter((c) => !used.has(c));
    const s = mk([h0, [...extra1, ...rest]]);
    return {...s, discard: [...discard]};
  }
  const lie = (s: BlofState) => ok(ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('D', 2)]}).state, {t: 'challenge', seat: 1});

  it('yalan: yığın + kenarın ÜSTÜNDEN 2 kart (en son kenara gidenler), kartlar yalnız alana', () => {
    expect(BLOF_PENALTY).toBe(2);
    const disc = [C('C', 4), C('C', 5), C('C', 6), C('C', 9)]; // üstteki: ♣9, altındaki: ♣6
    const r = lie(mkDisc([C('S', 7), C('D', 2), C('H', 13)], disc));
    expect(types(r.events)).toEqual(['challenged', 'reveal', 'pileTaken', 'penalty', 'turn']);
    const pen = r.events[3] as Extract<BlofEvent, {t: 'penalty'}>;
    expect(pen).toEqual({t: 'penalty', seat: 0, count: 2, cards: [C('C', 6), C('C', 9)], handCount: 5, discardCount: 2});
    expect(r.state.discard).toEqual([C('C', 4), C('C', 5)]);
    expect(r.state.hands[0]).toEqual(expect.arrayContaining([C('S', 7), C('D', 2), C('H', 13), C('C', 6), C('C', 9)]));
    expect(r.state.stats[0]).toMatchObject({penaltyCards: 2, cardsTaken: 2, timesCaught: 1});
    // süzme: ceza kartlarını yalnız alan görür (alınan yığın gibi); sayı herkese açık
    for (let seat = -1; seat < 2; seat++) {
      const x = redactBlofEvent(pen, seat) as Extract<BlofEvent, {t: 'penalty'}>;
      expect(x.count).toBe(2);
      expect(x.discardCount).toBe(2);
      expect(x.cards).toEqual(seat === 0 ? [C('C', 6), C('C', 9)] : null);
    }
    expect(pen.cards).not.toBeNull(); // süzme kopya üretir
  });

  it('kenarda 1 kart varsa 1 ceza; kenar boşsa ceza yok (olay da yok)', () => {
    const one = lie(mkDisc([C('S', 7), C('D', 2), C('H', 13)], [C('C', 9)]));
    expect(one.events.find((e) => e.t === 'penalty')).toEqual({t: 'penalty', seat: 0, count: 1, cards: [C('C', 9)], handCount: 4, discardCount: 0});
    expect(one.state.discard).toEqual([]);
    const none = lie(mkDisc([C('S', 7), C('D', 2), C('H', 13)], []));
    expect(types(none.events)).toEqual(['challenged', 'reveal', 'pileTaken', 'turn']);
    expect(none.state.hands[0].length).toBe(3);
    expect(none.state.stats[0].penaltyCards).toBe(0);
  });

  it('doğru çıkınca ceza yok: blöf diyen yalnız yığını alır', () => {
    const s = mkDisc([C('S', 7), C('H', 7), C('H', 13)], [C('C', 4), C('C', 9)]);
    const r = ok(ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 7)]}).state, {t: 'challenge', seat: 1});
    expect(types(r.events)).toEqual(['challenged', 'reveal', 'pileTaken', 'turn']);
    expect(r.state.discard).toEqual([C('C', 4), C('C', 9)]);
  });

  it('son kartındaki yalanı yakalanan da ceza alır ve oyuna devam eder; 52 kart korunur', () => {
    const s = mkDisc([C('S', 7), C('D', 2)], [C('C', 4), C('C', 9), C('C', 10)]);
    const r = ok(ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('D', 2)]}).state, {t: 'challenge', seat: 1});
    expect(r.state.phase).toBe('turn');
    expect(r.state.hands[0].length).toBe(4);
    expect(checkBlofInvariants(r.state)).toBeNull();
  });

  it('kenara giden yığın sırasıyla yığılır: herkes pas → sonra yakalanan yalancı o yığının son atışını alır', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2), C('H', 13)],
      [C('C', 8), C('S', 3), C('H', 3), C('D', 9)],
    ]);
    const before = s.discard.length;
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 7)]}).state;
    s = ok(s, {t: 'windowClosed'}).state;
    s = ok(s, {t: 'pass', seat: 1}).state; // yığın kenara: üstte ♠7 ♥7
    expect(s.discard.slice(-2)).toEqual([C('S', 7), C('H', 7)]);
    s = ok(s, {t: 'open', seat: 0, rank: 13, cards: [C('H', 13)]}).state;
    s = ok(s, {t: 'windowClosed'}).state;
    const r = ok(ok(s, {t: 'play', seat: 1, cards: [C('D', 9)]}).state, {t: 'challenge', seat: 0}); // 1 yalan söyledi
    expect(r.events.find((e) => e.t === 'penalty')).toMatchObject({seat: 1, count: 2, cards: [C('S', 7), C('H', 7)], discardCount: before});
  });
});

describe('Blöf: pencere süresi (sıradaki insansa 5 sn, bot ise 3 sn)', () => {
  const wOpen = (r: BlofStep) => r.events.find((e) => e.t === 'windowOpen') as Extract<BlofEvent, {t: 'windowOpen'}>;
  it('kural: sıradaki (atıştan sonra oynayacak) koltuğa göre; olay, durum, görünüm ve zamanlayıcı aynı süreyi taşır', () => {
    expect([BLOF_WINDOW_MS, BLOF_WINDOW_SHORT_MS]).toEqual([5000, 3000]);
    // 3 kişi: 0 insan, 1 bot, 2 insan
    let s = createBlof({seats: 3, seed: 4, firstSeat: 0, humanSeats: [true, false, true]}).state;
    expect(s.cfg).toMatchObject({challengeWindowMs: 5000, challengeWindowShortMs: 3000, humanSeats: [true, false, true]});
    const hand0 = s.hands[0];
    let r = ok(s, {t: 'open', seat: 0, rank: rankOf(hand0[0]), cards: [hand0[0]]}); // sıradaki 1: bot → 3 sn
    expect(wOpen(r).ms).toBe(3000);
    expect(r.state.window!.ms).toBe(3000);
    expect(viewFor(r.state, 0).window!.ms).toBe(3000);
    expect(viewFor(r.state, 2).window!.ms).toBe(3000);
    expect(blofEngine.timer(r.state)).toMatchObject({kind: 'window', ms: 3000});
    s = ok(r.state, {t: 'windowClosed'}).state;
    const c1 = s.hands[1][0];
    r = ok(s, {t: 'play', seat: 1, cards: [c1]}); // sıradaki 2: insan → 5 sn
    expect(wOpen(r).ms).toBe(5000);
    expect(blofEngine.timer(r.state)!.ms).toBe(5000);
    s = ok(r.state, {t: 'windowClosed'}).state;
    r = ok(s, {t: 'play', seat: 2, cards: [s.hands[2][0]]}); // sıradaki 0: insan → 5 sn
    expect(wOpen(r).ms).toBe(5000);
    // herkes geçerse kısa (3 sn) pencere de erken kapanır
    const f = createBlof({seats: 3, seed: 4, firstSeat: 0, humanSeats: [true, false, true]}).state;
    const k = ok(f, {t: 'open', seat: 0, rank: rankOf(f.hands[0][0]), cards: [f.hands[0][0]]});
    expect(wOpen(k).ms).toBe(3000);
    const r2 = ok(ok(k.state, {t: 'decline', seat: 1}).state, {t: 'decline', seat: 2});
    expect(types(r2.events)).toEqual(['declined', 'windowClosed', 'turn']);
    expect(r2.events[1]).toMatchObject({reason: 'declined'});
  });

  it('humanSeats verilmezse herkes insan sayılır (hep 5 sn); özel süreler (öğretici 9 sn) ve doğrulama', () => {
    const a = createBlof({seats: 2, seed: 1, firstSeat: 0}).state;
    expect(a.cfg.humanSeats).toEqual([true, true]);
    expect(windowMsFor(a.cfg, 1)).toBe(5000);
    const t = createBlof({seats: 2, seed: 1, firstSeat: 0, challengeWindowMs: 9000, challengeWindowShortMs: 9000, humanSeats: [true, false]}).state;
    expect(windowMsFor(t.cfg, 1)).toBe(9000);
    expect(windowMsFor(t.cfg, 0)).toBe(9000);
    // kısa süre verilmezse uzundan uzun olamaz
    expect(createBlof({seats: 2, seed: 1, challengeWindowMs: 2000}).state.cfg.challengeWindowShortMs).toBe(2000);
    expect(() => createBlof({seats: 2, seed: 1, humanSeats: [true]})).toThrow();
    expect(() => createBlof({seats: 2, seed: 1, challengeWindowShortMs: 0})).toThrow();
  });

  it('ev sahibi sözleşmesi: withSeats koltuk türlerini ayara yazar (insan/uzak = true, bot = false)', () => {
    const cfg: BlofConfig = {seats: 4, seed: 3};
    expect(blofEngine.withSeats!(cfg, [true, false, true, false])).toEqual({seats: 4, seed: 3, humanSeats: [true, false, true, false]});
    expect(cfg).toEqual({seats: 4, seed: 3}); // girdi değişmez
  });
});

describe('Blöf: pas', () => {
  it('1v1: rakip pas → yığın kenara, son atan yeni turu açar', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2)],
      [C('C', 8), C('S', 3), C('H', 3)],
    ]);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]}).state;
    s = ok(s, {t: 'windowClosed'}).state;
    const discardBefore = s.discard.length;
    const r = ok(s, {t: 'pass', seat: 1});
    expect(types(r.events)).toEqual(['passed', 'pileCleared', 'turn']);
    expect(r.events[1]).toEqual({t: 'pileCleared', count: 1, by: 0});
    expect(r.state.discard.length).toBe(discardBefore + 1);
    expect(r.state.turn).toBe(0);
    expect(r.state.rank).toBe(0);
    expect(r.state.round).toBe(2);
  });

  it('4 kişi: atıştan sonra ART ARDA 3 pas gerekir; araya atış girerse sayaç sıfırlanır', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2)],
      [C('C', 7), C('S', 3), C('H', 3)],
      [C('D', 9), C('H', 13), C('S', 13)],
      [C('S', 2), C('H', 2), C('C', 2)],
    ]);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]}).state;
    s = ok(s, {t: 'windowClosed'}).state;
    s = ok(s, {t: 'pass', seat: 1}).state;
    s = ok(s, {t: 'play', seat: 2, cards: [C('D', 9)]}).state; // blöf, kimse demiyor
    s = ok(s, {t: 'windowClosed'}).state;
    expect(s.passes).toBe(0);
    s = ok(s, {t: 'pass', seat: 3}).state;
    s = ok(s, {t: 'pass', seat: 0}).state;
    expect(s.phase).toBe('turn');
    expect(s.turn).toBe(1);
    const r = ok(s, {t: 'pass', seat: 1});
    expect(r.events[1]).toEqual({t: 'pileCleared', count: 2, by: 2});
    expect(r.state.turn).toBe(2);
    expect(r.state.opener).toBe(2);
    expect(r.state.pile).toEqual([]);
    expect(r.state.stats[1].passes).toBe(2);
  });
});

describe('Blöf: bitiş (son kartlar)', () => {
  it('son kartlarına blöf denmezse bitirir; ilk bitiren kazanır', () => {
    let s = mk([
      [C('S', 7)],
      [C('C', 8), C('S', 3), C('H', 3)],
      [C('D', 9), C('H', 13), C('S', 13)],
    ]);
    let r = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]});
    expect(r.state.window!.final).toBe(true);
    expect((r.events[1] as Extract<BlofEvent, {t: 'windowOpen'}>).final).toBe(true);
    s = r.state;
    r = ok(s, {t: 'windowClosed'});
    expect(types(r.events)).toEqual(['windowClosed', 'finished', 'gameOver']);
    expect(r.state.phase).toBe('over');
    expect(r.state.winner).toBe(0);
    const res = r.state.result!;
    expect(res.winner).toBe(0);
    expect(res.winners).toEqual([0]);
    expect(res.ranking[0]).toBe(0);
    expect(res.handCounts).toEqual([0, 3, 3]);
    // oyun bitti: her şey reddedilir
    expect(code(applyBlof(r.state, {t: 'pass', seat: 1}))).toBe('over');
    expect(actors(r.state)).toEqual([]);
  });

  it('son kartlarına blöf denir ve doğru çıkarsa yine bitirir (yığını diyen alır)', () => {
    let s = mk([
      [C('S', 7), C('H', 7)],
      [C('C', 8), C('S', 3), C('H', 3)],
    ]);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 7)]}).state;
    const r = ok(s, {t: 'challenge', seat: 1});
    expect(types(r.events)).toEqual(['challenged', 'reveal', 'pileTaken', 'finished', 'gameOver']);
    expect(r.state.winner).toBe(0);
    expect(r.state.hands[1].length).toBe(5);
    expect(checkBlofInvariants(r.state)).toBeNull();
  });

  it('son kartlarındaki yalanı yakalanırsa yığını alıp devam eder; yakalayan açar', () => {
    let s = mk([
      [C('S', 7), C('H', 2)],
      [C('C', 8), C('S', 3), C('H', 3)],
    ]);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 2)]}).state;
    const r = ok(s, {t: 'challenge', seat: 1});
    expect(types(r.events)).toEqual(['challenged', 'reveal', 'pileTaken', 'penalty', 'turn']);
    expect(r.state.phase).toBe('turn');
    expect(r.state.hands[0].length).toBe(4); // 2 kart yığından + 2 ceza
    expect(r.state.turn).toBe(1);
  });

  it('eşlide bitirenin takımı kazanır', () => {
    let s = mk(
      [
        [C('S', 7), C('H', 7), C('D', 2)],
        [C('C', 8), C('S', 3)],
        [C('D', 9)],
        [C('S', 13), C('H', 2)],
      ],
      {teams: [0, 1, 0, 1], turn: 2, opener: 2},
    );
    s = ok(s, {t: 'open', seat: 2, rank: 9, cards: [C('D', 9)]}).state;
    s = ok(s, {t: 'decline', seat: 1}).state;
    const r = ok(s, {t: 'decline', seat: 3});
    expect(r.state.result).toMatchObject({winner: 2, winnerTeam: 0, winners: [0, 2]});
    const fin = r.events.find((e) => e.t === 'finished');
    expect(fin).toEqual({t: 'finished', seat: 2, team: 0});
  });
});

describe('Blöf: görünüm ve süzme (gizli bilgi sızmaz)', () => {
  it('viewFor: yalnız kendi elin; diğerlerinin yalnız sayısı', () => {
    const {state} = createBlof({seats: 4, seed: 3, firstSeat: 1});
    for (let seat = 0; seat < 4; seat++) {
      const v = viewFor(state, seat);
      expect(v.hand).toEqual(state.hands[seat]);
      expect(v.handCounts).toEqual([13, 13, 13, 13]);
      expect(v.mustOpen).toBe(seat === 1);
      expect(v.canPass).toBe(false);
      // görünümde başka kart listesi yok
      const arrays = Object.entries(v).filter(([, x]) => Array.isArray(x)).map(([k]) => k);
      expect(arrays.sort()).toEqual(['hand', 'handCounts', 'roundPlays', 'teams']);
    }
    const spectator = viewFor(state, -1);
    expect(spectator.hand).toEqual([]);
    expect(spectator.myTurn).toBe(false);
  });

  it('redact: dağıtımda başkalarının eli, kapalı atışlar ve alınan yığın gizli; açılış herkese açık', () => {
    let s = mk([
      [C('S', 7), C('H', 2), C('D', 4)],
      [C('C', 8), C('S', 3), C('H', 3)],
      [C('D', 9), C('H', 13), C('S', 13)],
    ]);
    const all: BlofEvent[] = [];
    let r = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 2)]});
    all.push(...r.events);
    s = r.state;
    r = ok(s, {t: 'decline', seat: 2});
    all.push(...r.events);
    s = r.state;
    r = ok(s, {t: 'challenge', seat: 1});
    all.push(...r.events);
    for (let seat = -1; seat < 3; seat++) {
      const seen = all.map((e) => redactBlofEvent(e, seat)).filter((e): e is BlofEvent => e !== null);
      for (const e of seen) {
        if (e.t === 'opened' || e.t === 'played') expect(e.cards === null).toBe(e.seat !== seat);
        if (e.t === 'pileTaken') expect(e.cards === null).toBe(e.seat !== seat);
        if (e.t === 'reveal') expect(e.cards).toEqual([C('S', 7), C('H', 2)]);
      }
      expect(seen.some((e) => e.t === 'declined')).toBe(seat === 2);
    }
    const deal = createBlof({seats: 3, seed: 1, firstSeat: 0}).events[0];
    const d1 = redactBlofEvent(deal, 1) as Extract<BlofEvent, {t: 'deal'}>;
    expect(d1.hands[0]).toBeNull();
    expect(d1.hands[2]).toBeNull();
    expect(d1.hands[1]!.length).toBe(18); // açanın sonraki koltuğu fazla kartı alır
    // süzme kopya üretir: orijinal olay değişmez
    expect((deal as Extract<BlofEvent, {t: 'deal'}>).hands[0]).not.toBeNull();
  });

  it('legalActions / isLegalFor istemci ön kontrolü motorla uyumlu', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2)],
      [C('C', 8), C('S', 3), C('H', 3)],
    ]);
    let v = viewFor(s, 0);
    let l = legalActions(v);
    expect(l).toMatchObject({open: true, play: false, pass: false, challenge: false, maxCards: 3});
    expect(l.ranks.length).toBe(13);
    expect(isLegalFor(v, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]})).toBe(true);
    expect(isLegalFor(v, {t: 'open', seat: 0, rank: 7, cards: [C('C', 8)]})).toBe(false);
    expect(isLegalFor(v, {t: 'pass', seat: 0})).toBe(false);
    expect(isLegalFor(v, {t: 'windowClosed'})).toBe(false);
    s = ok(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7)]}).state;
    v = viewFor(s, 1);
    l = legalActions(v);
    expect(l).toMatchObject({open: false, play: false, challenge: true, decline: true});
    s = ok(s, {t: 'windowClosed'}).state;
    v = viewFor(s, 1);
    l = legalActions(v);
    expect(l).toMatchObject({play: true, pass: true, rank: 7, maxCards: 3});
    expect(isLegalFor(v, {t: 'play', seat: 1, cards: [C('S', 3), C('H', 3)]})).toBe(true);
  });
});

describe('Blöf: süre aşımı varsayılan hamlesi', () => {
  it('açması gerekiyorsa en kalabalık değeriyle doğru açar; turdaysa pas; pencerede geçer', () => {
    let s = mk([
      [C('S', 7), C('H', 7), C('D', 2), C('S', 9), C('C', 7)],
      [C('C', 8), C('S', 3), C('H', 3)],
    ]);
    const a = timeoutAction(s, 0)!;
    expect(a).toEqual({t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 7), C('C', 7)]});
    expect(timeoutAction(s, 1)).toBeNull();
    s = ok(s, a).state;
    expect(timeoutAction(s, 1)).toEqual({t: 'decline', seat: 1});
    s = ok(s, {t: 'windowClosed'}).state;
    expect(timeoutAction(s, 1)).toEqual({t: 'pass', seat: 1});
  });
});

describe('Blöf: botlarla tam oyunlar (çok tohum)', () => {
  const MODES: {name: string; cfg: (seed: number) => BlofConfig; diffs: BlofDifficulty[]}[] = [
    {name: '1v1', cfg: (seed) => ({seats: 2, seed, firstSeat: seed % 2}), diffs: ['zor', 'kolay']},
    {name: '3 kişi', cfg: (seed) => ({seats: 3, seed, firstSeat: seed % 3}), diffs: ['orta', 'zor', 'kolay']},
    {name: '4 kişi', cfg: (seed) => ({seats: 4, seed}), diffs: ['kolay', 'orta', 'zor', 'orta']},
    {name: 'eşli', cfg: (seed) => ({seats: 4, teams: [0, 1, 0, 1], seed}), diffs: ['zor', 'kolay', 'orta', 'zor']},
  ];

  for (const m of MODES) {
    it(`${m.name}: hep biter, 52 kart korunur, geçerli kazanan, sızıntı yok`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const cfg = m.cfg(seed);
        const r = simulate(cfg, m.diffs, {maxSteps: 5000}); // her adımda checkBlofInvariants
        expect(r.state.phase).toBe('over');
        const res = r.state.result!;
        expect(res.winner).toBeGreaterThanOrEqual(0);
        expect(r.state.hands[res.winner].length).toBe(0);
        const teams = r.state.cfg.teams;
        expect(res.winners).toEqual(teams.map((t, i) => (t === teams[res.winner] ? i : -1)).filter((i) => i >= 0));
        expect(res.ranking.length).toBe(cfg.seats);
        expect(new Set(res.ranking).size).toBe(cfg.seats);
        expect(r.events.filter((e) => e.t === 'gameOver').length).toBe(1);
        // Her koltuk yalnız görmeye hakkı olan kartları gördü
        for (let seat = 0; seat < cfg.seats; seat++) {
          for (const e of r.seen[seat]) {
            if (e.t === 'deal') e.hands.forEach((h, i) => expect(h === null).toBe(i !== seat));
            if (e.t === 'opened' || e.t === 'played') expect(e.cards === null).toBe(e.seat !== seat);
            if (e.t === 'pileTaken') expect(e.cards === null).toBe(e.seat !== seat);
            if (e.t === 'declined') expect(e.seat).toBe(seat);
          }
        }
        // istatistik tutarlılığı
        const st = res.stats;
        const caught = st.reduce((a, x) => a + x.caught, 0);
        expect(caught).toBe(st.reduce((a, x) => a + x.timesCaught, 0));
        expect(st.reduce((a, x) => a + x.wrongChallenges, 0)).toBe(st.reduce((a, x) => a + x.survived, 0));
        expect(st.reduce((a, x) => a + x.challenges, 0)).toBe(r.events.filter((e) => e.t === 'challenged').length);
        expect(caught).toBe(r.events.filter((e) => e.t === 'reveal' && !e.truthful).length);
      }
    });
  }

  it('deterministik: aynı tohum ve bot tohumu → aynı olay akışı', () => {
    const a = simulate({seats: 4, seed: 42}, ['zor', 'orta', 'kolay', 'zor']);
    const b = simulate({seats: 4, seed: 42}, ['zor', 'orta', 'kolay', 'zor']);
    expect(a.events).toEqual(b.events);
  });
});
