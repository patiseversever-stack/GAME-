import {describe, expect, it} from 'vitest';
import {BLOF_BOT_PARAMS, BlofBot, type BlofDifficulty} from '../src/ai/blofBot';
import {applyBlof, createBlof, redactBlofEvent, viewFor} from '../src/core/blof';
import type {BlofAction, BlofEvent, BlofSeatStats, BlofState} from '../src/core/blofTypes';
import {cardId, rankOf, type CardId} from '../src/core/types';
import {simulate} from './blofSim';

const C = cardId;
const zero = (): BlofSeatStats => ({
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
});

/** Elle kurulmuş durum + her bota başlangıç dağıtımını gösterir. */
function setup(hands: CardId[][], diffs: BlofDifficulty[], teams?: number[]): {s: BlofState; bots: BlofBot[]; feed: (e: BlofEvent[]) => void} {
  const n = hands.length as 2 | 3 | 4;
  const used = new Set(hands.flat());
  const s: BlofState = {
    cfg: {seats: n, teams: teams ?? hands.map((_, i) => i), seed: 1, firstSeat: 0, challengeWindowMs: 5000},
    hands: hands.map((h) => [...h]),
    pile: [],
    plays: [],
    discard: Array.from({length: 52}, (_, i) => i).filter((c) => !used.has(c)),
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
    stats: hands.map(zero),
    result: null,
  };
  const bots = diffs.map((d, i) => new BlofBot(i, d, 1000 + i));
  // Oyun ortasından devralır gibi görünümle başlat (kenardaki kartlar dahil doğru maskeler).
  bots.forEach((b, i) => b.decide(viewFor({...s, turn: -1}, i)));
  const feed = (evs: BlofEvent[]) => {
    for (const e of evs) for (let i = 0; i < n; i++) {
      const r = redactBlofEvent(e, i);
      if (r) bots[i].observe(r);
    }
  };
  return {s, bots, feed};
}

function step(s: BlofState, a: BlofAction, feed: (e: BlofEvent[]) => void): BlofState {
  const r = applyBlof(s, a);
  if (r.error !== undefined) throw new Error(r.error);
  feed(r.events);
  return r.state;
}

describe('Blöf botu: temel kararlar', () => {
  it('her zorlukta, sırası gelince geçerli hamle; sırası değilse null', () => {
    for (const d of ['kolay', 'orta', 'zor'] as const) {
      const g = createBlof({seats: 3, seed: 8, firstSeat: 1});
      const bots = [0, 1, 2].map((i) => new BlofBot(i, d, i));
      for (const e of g.events) for (let i = 0; i < 3; i++) bots[i].observe(redactBlofEvent(e, i)!);
      expect(bots[0].decide(viewFor(g.state, 0))).toBeNull();
      const dec = bots[1].decide(viewFor(g.state, 1))!;
      expect(dec.action.t).toBe('open');
      expect(applyBlof(g.state, dec.action).error).toBeUndefined();
      expect(dec.delayMs).toBeGreaterThan(0);
      expect(dec.tell).toBeDefined();
    }
  });

  it('elinde tek değer kaldıysa (≤4) hepsini doğru açıp bitirir', () => {
    const {s, bots} = setup(
      [
        [C('S', 9), C('H', 9), C('D', 9)],
        [C('C', 8), C('S', 3), C('H', 3)],
      ],
      ['zor', 'kolay'],
    );
    for (const b of bots) b.observe({t: 'deal', firstSeat: 0, startSeat: 1, counts: [3, 3], hands: [null, null]});
    for (let i = 0; i < 20; i++) {
      const bot = new BlofBot(0, i % 2 ? 'kolay' : 'zor', i);
      const d = bot.decide(viewFor(s, 0))!;
      expect(d.action).toEqual({t: 'open', seat: 0, rank: 9, cards: [C('S', 9), C('H', 9), C('D', 9)]});
    }
  });

  it('turdaki değerin hepsi elindeyse ve başka kartı yoksa doğru atıp bitirir', () => {
    const {s: s0, bots, feed} = setup(
      [
        [C('C', 8), C('S', 3), C('H', 3)],
        [C('S', 9), C('H', 9)],
      ],
      ['zor', 'zor'],
    );
    let s = step(s0, {t: 'open', seat: 0, rank: 9, cards: [C('C', 8)]}, feed);
    s = step(s, {t: 'windowClosed'}, feed);
    const d = bots[1].decide(viewFor(s, 1))!;
    expect(d.action).toEqual({t: 'play', seat: 1, cards: [C('S', 9), C('H', 9)]});
  });

  it('kesin yalanı (kendi elinden) yakalar: orta ve zor her zaman, hızlı', () => {
    for (const d of ['orta', 'zor'] as const) {
      const {s: s0, bots, feed} = setup(
        [
          [C('S', 7), C('H', 2), C('D', 4), C('C', 5)],
          [C('H', 7), C('D', 7), C('C', 7), C('S', 3)],
        ],
        [d, d],
      );
      // 1 elinde üç 7 var; 0 "2 tane 7" diyor → en fazla bir 7 olabilir → kesin yalan
      const s = step(s0, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 2)]}, feed);
      expect(bots[1].lieProbability(viewFor(s, 1))).toBe(1);
      const dec = bots[1].decide(viewFor(s, 1))!;
      expect(dec.action).toEqual({t: 'challenge', seat: 1});
      expect(dec.delayMs).toBeLessThanOrEqual(BLOF_BOT_PARAMS[d].sure[1]);
    }
  });

  it('son kartlarını atan rakibe zor bot her zaman blöf der; pencere süresinden önce', () => {
    for (let seed = 0; seed < 30; seed++) {
      const {s: s0, feed} = setup(
        [
          [C('S', 7), C('H', 7)],
          [C('D', 2), C('S', 3), C('H', 3)],
        ],
        ['zor', 'zor'],
      );
      const bot = new BlofBot(1, 'zor', seed);
      bot.observe({t: 'deal', firstSeat: 0, startSeat: 1, counts: [2, 3], hands: [null, [C('D', 2), C('S', 3), C('H', 3)]]});
      const s = step(s0, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 7)]}, (evs) => {
        feed(evs);
        for (const e of evs) bot.observe(redactBlofEvent(e, 1)!);
      });
      const d = bot.decide(viewFor(s, 1))!;
      expect(d.action.t).toBe('challenge');
      expect(d.delayMs).toBeLessThan(5000);
    }
  });

  it('kendi aldığı yığındaki kartları hatırlar (zor): o kartlar o koltukta', () => {
    const {s: s0, bots, feed} = setup(
      [
        [C('S', 7), C('H', 7), C('D', 7), C('S', 2), C('H', 2)],
        [C('C', 8), C('S', 3), C('H', 3), C('D', 3)],
      ],
      ['zor', 'zor'],
    );
    let s = step(s0, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 7), C('D', 7)]}, feed);
    s = step(s, {t: 'challenge', seat: 1}, feed); // doğru → 1 yığını aldı
    expect(s.hands[1]).toEqual(expect.arrayContaining([C('S', 7), C('H', 7), C('D', 7)]));
    // 0'ın botu: üç 7 kesin 1'de
    for (const c of [C('S', 7), C('H', 7), C('D', 7)]) expect(bots[0].possible(c)).toBe(1 << 1);
    // 1 (doğru açan değil, yakalayan değil: blöf diyen yanlış çıktı → atan, yani 0 açar). 0 açsın, 1 "3 tane 7" atsın.
    s = step(s, {t: 'open', seat: 0, rank: 7, cards: [C('S', 2)]}, feed);
    s = step(s, {t: 'windowClosed'}, feed);
    s = step(s, {t: 'play', seat: 1, cards: [C('S', 7), C('H', 7), C('D', 7)]}, feed);
    expect(bots[0].lieProbability(viewFor(s, 0))).toBeLessThan(0.25);
    // aynı iddia bilinmeyen kartlarla yapılsa çok daha şüpheli olurdu (kolay bot bunu bilmez)
    const naive = new BlofBot(0, 'kolay', 3);
    expect(naive.lieProbability(viewFor(s, 0))).toBeGreaterThan(0.3);
  });

  it('eşlide takım arkadaşına blöf demez (pencere hakkı yok → karar yok)', () => {
    const {s: s0, bots, feed} = setup(
      [
        [C('S', 7), C('H', 2), C('D', 4)],
        [C('C', 8), C('S', 3), C('H', 3)],
        [C('H', 7), C('D', 7), C('C', 7)],
        [C('S', 13), C('H', 13), C('D', 13)],
      ],
      ['zor', 'zor', 'zor', 'zor'],
      [0, 1, 0, 1],
    );
    const s = step(s0, {t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 2)]}, feed);
    expect(bots[2].decide(viewFor(s, 2))).toBeNull(); // kesin yalanı bilse bile
    expect(bots[1].decide(viewFor(s, 1))).not.toBeNull();
  });

  it('oyun ortasında devralan bot (geçmişi görmemiş) geçerli hamle yapar — çevrimiçi yedek oyuncu', () => {
    const r = simulate({seats: 4, seed: 11}, ['orta', 'orta', 'orta', 'orta'], {maxSteps: 40});
    const s = r.state;
    if (s.phase === 'over') return;
    for (const seat of [0, 1, 2, 3]) {
      const fresh = new BlofBot(seat, 'zor', 5);
      const d = fresh.decide(viewFor(s, seat));
      if (d) expect(applyBlof(s, d.action).error).toBeUndefined();
    }
  });
});

describe('Blöf botu: hile yok', () => {
  it('görünüm rakiplerin gizli kartlarına bağlı değil → karar da değil', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = simulate({seats: 3, seed, firstSeat: 0}, ['zor', 'zor', 'zor'], {maxSteps: 25});
      const s = r.state;
      if (s.phase === 'over') continue;
      // 1 ile 2'nin ellerinden birer kartı takas et (sayılar aynı): 0'ın görünümü değişmemeli
      const t: BlofState = JSON.parse(JSON.stringify(s));
      const a = t.hands[1].pop()!;
      const b = t.hands[2].pop()!;
      t.hands[1].push(b);
      t.hands[2].push(a);
      expect(viewFor(t, 0)).toEqual(viewFor(s, 0));
    }
  });

  it('botun gördüğü olaylarda başka koltukların kapalı kartı yok', () => {
    const r = simulate({seats: 4, seed: 9}, ['zor', 'zor', 'zor', 'zor']);
    for (let seat = 0; seat < 4; seat++) {
      const own = new Set<number>();
      for (const e of r.seen[seat]) {
        if (e.t === 'deal') for (const c of e.hands[seat]!) own.add(c);
        if ((e.t === 'opened' || e.t === 'played') && e.seat !== seat) expect(e.cards).toBeNull();
        if (e.t === 'pileTaken' && e.seat !== seat) expect(e.cards).toBeNull();
      }
      expect(own.size).toBe(13);
    }
  });
});

describe('Blöf botu: zorluk sıralaması (simülasyon)', () => {
  const N = 150;
  const winRate = (seats: 2 | 3 | 4, diffs: BlofDifficulty[], teams?: number[]): number => {
    let w = 0;
    for (let seed = 1; seed <= N; seed++) {
      const r = simulate({seats, seed, firstSeat: seed % seats, teams}, diffs);
      if (r.state.result!.winners.includes(0)) w++;
    }
    return w / N;
  };

  // Not: botlar insana karşı ayarlıdır (bkz. docs/BOTS.md, tests/blofAudit.test.ts — "sıradan oyuncu" merdiveni).
  // Bot-bot farkı 1'e 1'de belirgin; kalabalık masada şans payı büyük (zor ≈ orta), kolay hep geride.
  it('1v1: zor > orta > kolay', () => {
    expect(winRate(2, ['zor', 'kolay'])).toBeGreaterThan(0.66);
    expect(winRate(2, ['zor', 'orta'])).toBeGreaterThan(0.5);
    expect(winRate(2, ['orta', 'kolay'])).toBeGreaterThan(0.66);
  }, 60_000);

  it('3 ve 4 kişi: zor ve orta, kolaylara karşı payından (1/n) çok kazanır; zor ortalara ezilmez', () => {
    expect(winRate(3, ['zor', 'kolay', 'kolay'])).toBeGreaterThan(0.48);
    expect(winRate(3, ['orta', 'kolay', 'kolay'])).toBeGreaterThan(0.45);
    expect(winRate(4, ['zor', 'kolay', 'kolay', 'kolay'])).toBeGreaterThan(0.4);
    expect(winRate(4, ['zor', 'orta', 'orta', 'orta'])).toBeGreaterThan(0.2);
  }, 60_000);

  it('eşli: zor/orta takım kolay takımı yener', () => {
    expect(winRate(4, ['zor', 'kolay', 'zor', 'kolay'], [0, 1, 0, 1])).toBeGreaterThan(0.54);
    expect(winRate(4, ['orta', 'kolay', 'orta', 'kolay'], [0, 1, 0, 1])).toBeGreaterThan(0.54);
  }, 60_000);
});

describe('Blöf botu: ipucu (tell)', () => {
  it('kolay bot blöfte daha sık gergin görünür; zor daha az ele verir', () => {
    const rate = (d: BlofDifficulty) => {
      let bluffN = 0;
      let bluffNerv = 0;
      let truthN = 0;
      let truthNerv = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const g = createBlof({seats: 2, seed, firstSeat: 0});
        let s = g.state;
        const bots = [new BlofBot(0, d, seed), new BlofBot(1, 'orta', seed + 1)];
        const feed = (evs: BlofEvent[]) => {
          for (const e of evs)
            for (let i = 0; i < 2; i++) {
              const r = redactBlofEvent(e, i);
              if (r) bots[i].observe(r);
            }
        };
        feed(g.events);
        for (let k = 0; k < 400 && s.phase !== 'over'; k++) {
          let act: BlofAction | null = null;
          for (const seat of [0, 1]) {
            const dec = bots[seat].decide(viewFor(s, seat));
            if (!dec) continue;
            if (seat === 0 && (dec.action.t === 'open' || dec.action.t === 'play')) {
              const rank = dec.action.t === 'open' ? dec.action.rank : s.rank;
              const bluff = dec.action.cards.some((c) => rankOf(c) !== rank);
              if (bluff) {
                bluffN++;
                if (dec.tell!.nervous) bluffNerv++;
              } else {
                truthN++;
                if (dec.tell!.nervous) truthNerv++;
              }
            }
            act ??= dec.action;
          }
          act ??= {t: 'windowClosed'};
          const r = applyBlof(s, act);
          if (r.error !== undefined) throw new Error(r.error);
          s = r.state;
          feed(r.events);
        }
      }
      return {bluff: bluffNerv / Math.max(1, bluffN), truth: truthNerv / Math.max(1, truthN), bluffN};
    };
    const k = rate('kolay');
    const z = rate('zor');
    expect(k.bluffN).toBeGreaterThan(10);
    expect(k.bluff).toBeGreaterThan(k.truth + 0.25);
    expect(z.bluff).toBeLessThan(k.bluff);
  });
});
