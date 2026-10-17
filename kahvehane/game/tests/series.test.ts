// Oyun uzunluğu (maç / seri) — saf mantık: toplamlar, hedef, uzatma, dağıtan/açan sırası, eşitlik bozma, bırakma, kayıttan devam.
import {describe, expect, it} from 'vitest';
import type {GameResult, SideScore} from '../src/core/types';
import {applyPlay, createGame} from '../src/core/pisti';
import {
  LENGTHS, LENGTH_INFO, MAX_HANDS, blofOpener, blofPenalty, createSeries, forfeitSeries, handNo, handSeed, isExtra, leaders, lengthFor,
  outcomeFor, pistiOf, progress, rankOf, ranking, recordBlof, recordPisti, validateSeries, type SeriesState,
} from '../src/game/series';
import {MODE_INFO, type MatchLength, type Mode} from '../src/game/types';

/** Pişti el sonucu: taraf başına toplam (ve pişti puanı). Kazanan(lar) en yüksek toplam. */
function res(totals: number[], pisti: number[] = totals.map(() => 0)): GameResult {
  const sides: SideScore[] = totals.map((total, side) => ({side, seats: [side], cards: 0, majority: 0, aces: 0, jacks: 0, club2: 0, diamond10: 0, pisti: pisti[side], total}));
  const best = Math.max(...totals);
  return {sides, winners: sides.filter(s => s.total === best).map(s => s.side)};
}
const pisti = (mode: Mode, len: MatchLength, seed = 1234) => createSeries({game: 'pisti', mode, len, seed});
const blof = (mode: Mode, len: MatchLength, seed = 99, first?: number) => createSeries({game: 'blof', mode, len, seed, first});
const playAll = (s: SeriesState, hands: number[][]) => hands.reduce((a, h) => recordPisti(a, res(h)), s);
const roundTrip = (s: SeriesState) => validateSeries(JSON.parse(JSON.stringify(s)));

describe('uzunluk tanımları', () => {
  it('oyun başına seçenekler ve çarpanlar', () => {
    expect(LENGTHS.pisti).toEqual(['tek', '51', '101', '151']);
    expect(LENGTHS.blof).toEqual(['tek', '3', '5']);
    expect(LENGTH_INFO['101'].target).toBe(101);
    expect(LENGTH_INFO['5'].hands).toBe(5);
    expect(LENGTH_INFO.tek.mult).toBe(1);
    for (const l of [...LENGTHS.pisti, ...LENGTHS.blof]) expect(LENGTH_INFO[l].mult).toBeGreaterThanOrEqual(1);
  });
  it('başka oyunun / bozuk uzunluğu tek ele düşer', () => {
    expect(lengthFor('pisti', '101')).toBe('101');
    expect(lengthFor('pisti', '5')).toBe('tek');
    expect(lengthFor('blof', '151')).toBe('tek');
    expect(lengthFor('blof', undefined)).toBe('tek');
    expect(createSeries({game: 'blof', mode: '3', len: '101', seed: 1}).len).toBe('tek');
  });
});

describe('el tohumu', () => {
  it('ilk el maç tohumunun kendisi; sonrakiler belirlenimci, farklı ve pozitif', () => {
    const s = pisti('1v1', '101', 777);
    expect(handSeed(s, 0)).toBe(777);
    const seeds = Array.from({length: 30}, (_, i) => handSeed(s, i));
    expect(new Set(seeds).size).toBe(30);
    for (const x of seeds) expect(x).toBeGreaterThanOrEqual(0);
    expect(handSeed(pisti('1v1', '101', 777), 5)).toBe(seeds[5]);
    expect(handSeed(s)).toBe(777); // sıradaki el = hands.length
    expect(handSeed(recordPisti(s, res([10, 5])))).toBe(seeds[1]);
  });
});

describe('Pişti: tek el', () => {
  it('bir elde biter; kazanan en yüksek puan', () => {
    const s = recordPisti(pisti('1v1', 'tek'), res([12, 30]));
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([1]);
    expect(outcomeFor(s, 0)).toBe('lose');
    expect(outcomeFor(s, 1)).toBe('win');
  });
  it('eşitlik beraberlik (uzatma yok)', () => {
    const s = recordPisti(pisti('4', 'tek'), res([9, 9, 3, 1]));
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([0, 1]);
    expect(outcomeFor(s, 0)).toBe('draw');
    expect(outcomeFor(s, 2)).toBe('lose');
  });
});

describe('Pişti: 51 / 101 / 151', () => {
  it('puanlar toplanır, dağıtan her el bir sonraki koltuğa geçer (1\'e 1)', () => {
    let s = pisti('1v1', '101');
    expect(s.first).toBe(1); // ilk eli insan açar → dağıtan son koltuk
    expect(s.next).toBe(1);
    s = recordPisti(s, res([20, 14]));
    expect(s.totals).toEqual([20, 14]);
    expect(s.wins).toEqual([1, 0]);
    expect(s.next).toBe(0);
    expect(s.hands[0].first).toBe(1);
    s = recordPisti(s, res([8, 40]));
    expect(s.totals).toEqual([28, 54]);
    expect(s.next).toBe(1);
    expect(handNo(s)).toBe(3);
    expect(s.over).toBe(false);
    expect(leaders(s)).toEqual([1]);
    expect(progress(s, 1)).toBeCloseTo(54 / 101);
  });

  it('hedefe ulaşılan elin sonunda biter; en yüksek toplam kazanır (ikisi de geçse bile)', () => {
    const s = playAll(pisti('1v1', '101'), [[40, 30], [40, 30], [20, 45]]);
    expect(s.totals).toEqual([100, 105]);
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([1]);
    const t = playAll(pisti('1v1', '51'), [[30, 30], [25, 40]]);
    expect(t.totals).toEqual([55, 70]);
    expect(t.winners).toEqual([1]);
    expect(outcomeFor(t, 0)).toBe('lose');
  });

  it('hedefte eşitlik → uzatma eli; eşitlik bozulunca biter', () => {
    let s = playAll(pisti('1v1', '51'), [[30, 30], [25, 25]]);
    expect(s.totals).toEqual([55, 55]);
    expect(s.over).toBe(false);
    expect(isExtra(s)).toBe(true);
    s = recordPisti(s, res([7, 9]));
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([1]);
    expect(isExtra(s)).toBe(false);
  });

  it('hedefe kimse ulaşmadıkça sürer; ara eşitlik uzatma sayılmaz', () => {
    const s = playAll(pisti('1v1', '151'), [[30, 30], [40, 40]]);
    expect(s.over).toBe(false);
    expect(isExtra(s)).toBe(false);
    expect(leaders(s)).toEqual([]);
  });

  it('eşli: takım toplamları, dağıtan dört koltukta döner', () => {
    let s = pisti('esli', '51');
    expect(s.totals).toEqual([0, 0]);
    expect(s.first).toBe(3);
    // core sonucunda eşlide taraf = takım (iki koltuk)
    const r = (a: number, b: number): GameResult => ({
      sides: [{side: 0, seats: [0, 2], cards: 30, majority: 3, aces: 2, jacks: 2, club2: 0, diamond10: 3, pisti: 10, total: a},
        {side: 1, seats: [1, 3], cards: 22, majority: 0, aces: 2, jacks: 2, club2: 2, diamond10: 0, pisti: 0, total: b}],
      winners: a === b ? [0, 1] : [a > b ? 0 : 1],
    });
    const dealers: number[] = [];
    for (let k = 0; k < 4; k++) {
      dealers.push(s.next);
      s = recordPisti(s, r(10, 6));
    }
    expect(dealers).toEqual([3, 0, 1, 2]);
    expect(s.totals).toEqual([40, 24]);
    expect(pistiOf(s, 0)).toBe(40);
    s = recordPisti(s, r(12, 4));
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([0]);
    expect(outcomeFor(s, 0)).toBe('win');
  });

  it('4 kişi: herkesin kendi toplamı; sıralama ve sıra paylaşımı', () => {
    let s = pisti('4', '51');
    s = playAll(s, [[10, 20, 5, 1], [10, 0, 15, 20]]);
    expect(s.totals).toEqual([20, 20, 20, 21]);
    expect(ranking(s)[0]).toBe(3);
    expect(rankOf(s, 3)).toBe(1);
    expect(rankOf(s, 0)).toBe(2);
    expect(rankOf(s, 2)).toBe(2);
    s = playAll(s, [[40, 2, 0, 1]]);
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([0]);
    expect(outcomeFor(s, 3)).toBe('lose');
  });

  it('güvenlik sınırı: eşitlik hiç bozulmazsa önce pişti puanı, o da eşitse berabere', () => {
    let s = pisti('1v1', '51');
    for (let k = 0; k < MAX_HANDS - 1; k++) s = recordPisti(s, res([30, 30], k === 3 ? [10, 0] : [0, 0]));
    expect(s.over).toBe(false);
    s = recordPisti(s, res([30, 30]));
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([0]); // pişti puanı
    let d = pisti('1v1', '51');
    for (let k = 0; k < MAX_HANDS; k++) d = recordPisti(d, res([30, 30]));
    expect(d.winners).toEqual([0, 1]);
    expect(outcomeFor(d, 0)).toBe('draw');
  });

  it('girdi değişmez; biten maça el eklenmez', () => {
    const s = pisti('1v1', '51');
    const r = recordPisti(s, res([60, 3]));
    expect(s.hands).toHaveLength(0);
    expect(r.over).toBe(true);
    expect(() => recordPisti(r, res([1, 1]))).toThrow();
    expect(() => recordBlof(pisti('1v1', '51'), {winner: 0, handCounts: [0, 3]})).toThrow();
  });

  it('gerçek motor sonuçlarıyla 101 maç biter ve toplamlar el puanlarının toplamıdır', () => {
    let s = pisti('1v1', '101', 4242);
    let guard = 0;
    while (!s.over && guard++ < MAX_HANDS) {
      let {state, events} = createGame({seats: 2, teams: [0, 1], dealer: s.next, seed: handSeed(s)});
      let result: GameResult | null = null;
      while (!state.over) {
        const r = applyPlay(state, state.turn, state.hands[state.turn][0]);
        state = r.state;
        events = r.events;
        for (const e of events) if (e.t === 'gameOver') result = e.result;
      }
      s = recordPisti(s, result!);
    }
    expect(s.over).toBe(true);
    expect(Math.max(...s.totals)).toBeGreaterThanOrEqual(101);
    for (let i = 0; i < 2; i++) expect(s.totals[i]).toBe(s.hands.reduce((a, h) => a + h.pts[i], 0));
    expect(s.winners).toHaveLength(1);
    expect(s.totals[s.winners[0]]).toBe(Math.max(...s.totals));
  });
});

describe('Blöf: ceza ve açan', () => {
  it('bitiren 0; diğerleri elde kalan kadar ceza (tekli)', () => {
    expect(blofPenalty('4', 2, [3, 7, 0, 1])).toEqual([3, 7, 0, 1]);
    expect(blofPenalty('3', 0, [0, 5, 9])).toEqual([0, 5, 9]);
  });
  it('eşli: kazanan takım 0, kaybeden takım iki oyuncunun toplamı', () => {
    // koltuk 2 bitirdi (takım 0: 0+2); ortağın elinde kalan sayılmaz
    expect(blofPenalty('esli', 2, [4, 6, 0, 3])).toEqual([0, 9]);
    expect(blofPenalty('esli', 1, [5, 0, 2, 8])).toEqual([7, 0]);
  });
  it('sonraki eli kaybedenlerden en çok kartı kalan açar; eşitlikte bitirenden sonraki ilk', () => {
    expect(blofOpener('4', 0, [0, 3, 7, 7])).toBe(2);
    expect(blofOpener('4', 2, [7, 3, 0, 7])).toBe(3); // 2'den sonra: 3, 0, 1
    expect(blofOpener('1v1', 1, [5, 0])).toBe(0);
    // eşlide bitirenin ortağı (çok kartı olsa da) açamaz
    expect(blofOpener('esli', 0, [0, 2, 9, 4])).toBe(3);
  });
});

describe('Blöf: tek el ve seri', () => {
  it('tek el: bitiren kazanır, motor açanı seçer', () => {
    const s0 = blof('3', 'tek');
    expect(s0.first).toBe(-1);
    expect(s0.next).toBe(-1);
    const s = recordBlof(s0, {winner: 1, handCounts: [4, 0, 6]});
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([1]);
    expect(s.hands[0].pts).toEqual([4, 0, 6]);
  });

  it('3 El (1\'e 1): N el sonunda en az toplam ceza kazanır; kaybeden sonraki eli açar', () => {
    let s = blof('1v1', '3');
    s = recordBlof(s, {winner: 0, handCounts: [0, 8]});
    expect(s.totals).toEqual([0, 8]);
    expect(s.next).toBe(1);
    expect(leaders(s)).toEqual([0]);
    expect(progress(s, 0)).toBeCloseTo(1 / 3);
    s = recordBlof(s, {winner: 1, handCounts: [3, 0]});
    expect(s.next).toBe(0);
    expect(s.over).toBe(false);
    s = recordBlof(s, {winner: 1, handCounts: [9, 0]});
    expect(s.over).toBe(true);
    expect(s.totals).toEqual([12, 8]);
    expect(s.winners).toEqual([1]); // 2 el kazandı ve cezası az
    expect(outcomeFor(s, 0)).toBe('lose');
  });

  it('daha çok el kazanan değil, daha az cezası olan kazanır', () => {
    let s = blof('1v1', '3');
    s = recordBlof(s, {winner: 0, handCounts: [0, 2]});
    s = recordBlof(s, {winner: 0, handCounts: [0, 1]});
    s = recordBlof(s, {winner: 1, handCounts: [14, 0]});
    expect(s.wins).toEqual([2, 1]);
    expect(s.totals).toEqual([14, 3]);
    expect(s.winners).toEqual([1]);
  });

  it('eşitlik: önce kazanılan el, sonra son elin cezası, sonra berabere', () => {
    let a = blof('1v1', '3');
    a = recordBlof(a, {winner: 0, handCounts: [0, 5]});
    a = recordBlof(a, {winner: 0, handCounts: [0, 1]});
    a = recordBlof(a, {winner: 1, handCounts: [6, 0]});
    expect(a.totals).toEqual([6, 6]);
    expect(a.winners).toEqual([0]); // 2 el
    let b = blof('4', '3');
    b = recordBlof(b, {winner: 0, handCounts: [0, 4, 9, 9]});
    b = recordBlof(b, {winner: 1, handCounts: [4, 0, 9, 9]});
    b = recordBlof(b, {winner: 2, handCounts: [3, 3, 0, 9]});
    // 0: 7, 1: 7 (birer el); son elde ikisi de 3 → berabere
    expect(b.totals).toEqual([7, 7, 18, 27]);
    expect(b.winners).toEqual([0, 1]);
    expect(outcomeFor(b, 0)).toBe('draw');
    let c = blof('4', '3');
    c = recordBlof(c, {winner: 0, handCounts: [0, 4, 9, 9]});
    c = recordBlof(c, {winner: 1, handCounts: [5, 0, 9, 9]});
    c = recordBlof(c, {winner: 2, handCounts: [2, 3, 0, 9]});
    expect(c.totals).toEqual([7, 7, 18, 27]);
    expect(c.winners).toEqual([0]); // son elde 2 < 3
  });

  it('5 El eşli: takım cezaları birikir, açan kaybeden takımdan', () => {
    let s = blof('esli', '5');
    const hands: [number, number[]][] = [[0, [0, 5, 2, 6]], [3, [4, 7, 1, 0]], [2, [3, 2, 0, 1]], [1, [6, 0, 6, 2]], [0, [0, 3, 3, 3]]];
    const openers: number[] = [];
    for (const [w, left] of hands) {
      s = recordBlof(s, {winner: w, handCounts: left});
      openers.push(s.next);
    }
    expect(s.totals).toEqual([0 + 5 + 0 + 12 + 0, 11 + 0 + 3 + 0 + 6]);
    expect(s.wins).toEqual([3, 2]);
    expect(s.over).toBe(true);
    expect(s.winners).toEqual([0]); // 17 < 20
    // 4. elde koltuk 0 ve 2 eşit (6): bitiren 1'den sonra sırası ilk gelen 2 açar
    expect(openers.slice(0, 4)).toEqual([3, 0, 1, 2]);
    expect(outcomeFor(s, 0)).toBe('win');
    expect(outcomeFor(s, 1)).toBe('lose');
  });

  it('ilk açan verilirse kayda geçer; bitiren kendi kartını ceza saymaz', () => {
    let s = blof('3', '3', 5, 2);
    expect(s.next).toBe(2);
    s = recordBlof(s, {winner: 0, handCounts: [7, 1, 2]}); // bozuk girdi: bitirenin kartı 0 sayılır
    expect(s.hands[0].first).toBe(2);
    expect(s.hands[0].left).toEqual([0, 1, 2]);
    expect(s.totals).toEqual([0, 1, 2]);
    expect(s.next).toBe(2);
  });
});

describe('maçı bırakma', () => {
  it('1\'e 1: bırakan kaybeder, rakip kazanır (öndeyken bile)', () => {
    const s = forfeitSeries(playAll(pisti('1v1', '101'), [[60, 10]]), 0);
    expect(s.over).toBe(true);
    expect(s.forfeit).toBe(0);
    expect(s.winners).toEqual([1]);
    expect(outcomeFor(s, 0)).toBe('lose');
    expect(outcomeFor(s, 1)).toBe('win');
  });
  it('kalabalık masa: kalanlardan önde olan kazanır; el oynanmadan bırakılabilir', () => {
    const s = forfeitSeries(playAll(pisti('4', '151'), [[30, 10, 20, 5]]), 0);
    expect(s.winners).toEqual([2]);
    const b = forfeitSeries(blof('3', '5'), 0);
    expect(b.over).toBe(true);
    expect(b.winners).toEqual([1, 2]);
    expect(outcomeFor(b, 0)).toBe('lose');
    const e = forfeitSeries(recordBlof(blof('esli', '3'), {winner: 1, handCounts: [3, 0, 4, 2]}), 0);
    expect(e.winners).toEqual([1]);
  });
  it('biten maç bırakılamaz', () => {
    const s = recordPisti(pisti('1v1', 'tek'), res([20, 5]));
    expect(forfeitSeries(s, 0)).toBe(s);
  });
});

describe('kayıttan devam (resume)', () => {
  it('JSON gidiş-dönüş aynı durumu verir; devam eden maç aynı tohum/dağıtanla sürer', () => {
    const s = playAll(pisti('esli', '101', 31337), [[20, 12], [9, 30]]);
    const back = roundTrip(s)!;
    expect(back).toEqual(s);
    expect(handSeed(back)).toBe(handSeed(s));
    expect(back.next).toBe(s.next);
    const a = recordPisti(s, res([50, 2]));
    const b = recordPisti(back, res([50, 2]));
    expect(b).toEqual(a);
    let bl = blof('4', '5', 8);
    bl = recordBlof(bl, {winner: 3, handCounts: [2, 5, 5, 0]});
    expect(roundTrip(bl)).toEqual(bl);
    expect(roundTrip(forfeitSeries(bl, 0))).toEqual(forfeitSeries(bl, 0));
  });

  it('türetilen alanlara güvenilmez: toplam / sıradaki / bitiş el kayıtlarından yeniden hesaplanır', () => {
    const s = playAll(pisti('1v1', '101'), [[20, 12]]);
    const raw = JSON.parse(JSON.stringify(s));
    raw.totals = [999, 0];
    raw.next = 0;
    raw.over = true;
    raw.winners = [0];
    expect(validateSeries(raw)).toEqual(s);
  });

  it('bozuk kayıtları reddeder', () => {
    const ok = JSON.parse(JSON.stringify(playAll(pisti('1v1', '101'), [[20, 12]])));
    const bad = (patch: (r: Record<string, unknown>) => void) => {
      const r = JSON.parse(JSON.stringify(ok));
      patch(r);
      return validateSeries(r);
    };
    expect(validateSeries(null)).toBeNull();
    expect(validateSeries('x')).toBeNull();
    expect(bad(r => (r.v = 2))).toBeNull();
    expect(bad(r => (r.game = 'okey'))).toBeNull();
    expect(bad(r => (r.mode = '3'))).toBeNull(); // Pişti üç kişi oynanmaz
    expect(bad(r => (r.len = '5'))).toBeNull();
    expect(bad(r => (r.seed = 1.5))).toBeNull();
    expect(bad(r => (r.first = 7))).toBeNull();
    expect(bad(r => ((r.hands as {pts: number[]}[])[0].pts = [1]))).toBeNull();
    expect(bad(r => ((r.hands as {pts: number[]}[])[0].pts = [-4, 2]))).toBeNull();
    expect(bad(r => ((r.hands as {first: number}[])[0].first = 0))).toBeNull(); // dağıtan sırası tutmuyor
    expect(bad(r => delete (r.hands as {pisti?: number[]}[])[0].pisti)).toBeNull();
    // bitmiş maçın arkasına el
    const over = JSON.parse(JSON.stringify(recordPisti(pisti('1v1', '51'), res([60, 1]))));
    over.hands.push({...over.hands[0], first: 0});
    expect(validateSeries(over)).toBeNull();
    // Blöf: ceza bitiren + kalan kartlarla tutarlı olmalı
    const b = JSON.parse(JSON.stringify(recordBlof(blof('3', '3'), {winner: 1, handCounts: [4, 0, 6]})));
    b.hands[0].pts = [0, 0, 0];
    expect(validateSeries(b)).toBeNull();
    // fazla el
    const t = JSON.parse(JSON.stringify(recordBlof(blof('1v1', 'tek'), {winner: 0, handCounts: [0, 3]})));
    t.hands.push(t.hands[0]);
    expect(validateSeries(t)).toBeNull();
  });

  it('her modda yeni maç kayıttan aynen döner', () => {
    for (const m of ['1v1', '4', 'esli'] as Mode[]) for (const l of LENGTHS.pisti) expect(roundTrip(pisti(m, l))).toEqual(pisti(m, l));
    for (const m of ['1v1', '3', '4', 'esli'] as Mode[]) for (const l of LENGTHS.blof) {
      const s = blof(m, l);
      expect(roundTrip(s)).toEqual(s);
      expect(s.totals).toHaveLength(Math.max(...MODE_INFO[m].teams) + 1);
    }
  });
});
