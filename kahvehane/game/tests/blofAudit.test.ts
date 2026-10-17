// Blöf botu denetimi: hile yok (yalnız süzülmüş bilgi), "salak" hamle yok, insan gibi zamanlama, eşli takım oyunu,
// canlı el (takılma/sonsuz döngü yok) ve zorluk merdiveni (sıradan bir oyuncuya karşı). Ölçümler: tests/blofAudit.ts, docs/BOTS.md.
import {describe, expect, it} from 'vitest';
import {BLOF_BOT_PARAMS, BlofBot, type BlofDifficulty} from '../src/ai/blofBot';
import {applyBlof, redactBlofEvent, viewFor} from '../src/core/blof';
import type {BlofAction, BlofEvent, BlofSeatStats, BlofState} from '../src/core/blofTypes';
import {createBlofLocal} from '../src/net/blofLocal';
import {VirtualClock} from '../src/net/clock';
import {cardId, rankOf, type CardId} from '../src/core/types';
import {auditHand, auditMany, modeCfg, summarize, type HandMetrics} from './blofAudit';
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
  penaltyCards: 0,
});

/** Elle kurulan durum (kalan kartlar kenarda) + o durumu oyun ortasından devralan botlar. */
function table(hands: CardId[][], diffs: BlofDifficulty[], seed: number, teams?: number[], firstTurn = 0) {
  const n = hands.length as 2 | 3 | 4;
  const used = new Set(hands.flat());
  const s: BlofState = {
    cfg: {seats: n, teams: teams ?? hands.map((_, i) => i), seed: 1, firstSeat: firstTurn, challengeWindowMs: 5000, challengeWindowShortMs: 3000, humanSeats: new Array<boolean>(n).fill(true)},
    hands: hands.map((h) => [...h]),
    pile: [],
    plays: [],
    discard: Array.from({length: 52}, (_, i) => i).filter((c) => !used.has(c)),
    rank: 0,
    opener: firstTurn,
    turn: firstTurn,
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
  const bots = diffs.map((d, i) => new BlofBot(i, d, seed * 31 + i));
  bots.forEach((b, i) => b.decide(viewFor({...s, turn: -1}, i)));
  let st = s;
  const step = (a: BlofAction): BlofState => {
    const r = applyBlof(st, a);
    if (r.error !== undefined) throw new Error(r.error);
    for (const e of r.events) for (let i = 0; i < n; i++) {
      const x = redactBlofEvent(e, i);
      if (x) bots[i].observe(x);
    }
    st = r.state;
    return st;
  };
  return {bots, step, get s() {
    return st;
  }};
}

const rate = (n: number, f: (seed: number) => boolean): number => {
  let k = 0;
  for (let i = 1; i <= n; i++) if (f(i)) k++;
  return k / n;
};

describe('Blöf botu: hile yok', () => {
  it('aynı görünüm + aynı geçmiş → aynı karar, rakiplerin kapalı kartları ne olursa olsun', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const r = simulate({seats: 4, seed, firstSeat: seed % 4}, ['zor', 'orta', 'zor', 'kolay'], {maxSteps: 30 + seed});
      const s = r.state;
      if (s.phase === 'over') continue;
      // 1 ile 2'nin ellerinden birer kart takas (sayılar aynı): 0'ın görünümü aynı kalmalı
      const alt: BlofState = JSON.parse(JSON.stringify(s));
      const a = alt.hands[1].pop()!;
      const b = alt.hands[2].pop()!;
      alt.hands[1].push(b);
      alt.hands[2].push(a);
      expect(viewFor(alt, 0)).toEqual(viewFor(s, 0));
      // 0'ın gördüğü olaylarla iki eş bot kur: biri gerçek, biri değiştirilmiş durumun görünümünü görsün
      const mk = () => {
        const bot = new BlofBot(0, 'zor', 99);
        for (const e of r.seen[0]) bot.observe(e);
        return bot;
      };
      expect(mk().decide(viewFor(alt, 0))).toEqual(mk().decide(viewFor(s, 0)));
    }
  });

  it('ev sahibi (LocalHost) botlara yalnız süzülmüş olay verir: başkasının kapalı kartı hiç gelmez', () => {
    for (const mode of ['1v1', '3', '4', 'esli'] as const) {
      const cfg = modeCfg(mode, 4242);
      const clock = new VirtualClock();
      const local = createBlofLocal({cfg, seats: Array.from({length: cfg.seats}, () => 'zor' as const), clock});
      const seen: BlofEvent[][] = local.bots.map(() => []);
      local.bots.forEach((b, i) => {
        const orig = b!.observe.bind(b);
        b!.observe = (e: BlofEvent) => {
          seen[i].push(e);
          orig(e);
        };
      });
      local.host.start();
      clock.runAll();
      expect(local.host.over).toBe(true);
      seen.forEach((evs, seat) => {
        for (const e of evs) {
          if (e.t === 'deal') e.hands.forEach((h, i) => (i === seat ? expect(h).not.toBeNull() : expect(h).toBeNull()));
          if ((e.t === 'opened' || e.t === 'played') && e.seat !== seat) expect(e.cards).toBeNull();
          if (e.t === 'pileTaken' && e.seat !== seat) expect(e.cards).toBeNull();
          if (e.t === 'declined') expect(e.seat).toBe(seat);
        }
      });
    }
  });
});

describe('Blöf botu: salak hamle yok (orta/zor)', () => {
  it('masada dördü dolmuşken (imkânsız iddia) o değeri tutmuyorsa blöf yapmaz, pas der', () => {
    for (const d of ['orta', 'zor'] as const) {
      const ok = rate(60, (seed) => {
        const t = table(
          [
            [C('S', 2), C('H', 5), C('D', 9), C('C', 12), C('S', 13)],
            [C('S', 7), C('H', 7), C('D', 7), C('C', 7), C('S', 3), C('H', 3)],
          ],
          [d, d],
          seed,
          undefined,
          1,
        );
        t.step({t: 'open', seat: 1, rank: 7, cards: [C('S', 7), C('H', 7), C('D', 7), C('C', 7)]});
        t.step({t: 'windowClosed'});
        const dec = t.bots[0].decide(viewFor(t.s, 0))!;
        return dec.action.t === 'pass';
      });
      expect(ok).toBeGreaterThanOrEqual(d === 'zor' ? 1 : 0.95);
    }
  });

  it('turun değerini elinde tutarken pas demez (her zorlukta)', () => {
    for (const d of ['kolay', 'orta', 'zor'] as const) {
      const ok = rate(40, (seed) => {
        const t = table(
          [
            [C('S', 9), C('H', 9), C('D', 4)],
            [C('C', 9), C('S', 3), C('H', 3), C('D', 3), C('C', 11)],
          ],
          [d, d],
          seed,
          undefined,
          1,
        );
        t.step({t: 'open', seat: 1, rank: 9, cards: [C('C', 9)]});
        t.step({t: 'windowClosed'});
        const a = t.bots[0].decide(viewFor(t.s, 0))!.action;
        return a.t === 'play' && a.cards.filter((c) => rankOf(c) === 9).length === 2;
      });
      expect(ok).toBe(1);
    }
  });

  it('son kartlarını atan rakibe orta ve zor her zaman "Blöf!" der; kolay çoğunlukla', () => {
    for (const d of ['kolay', 'orta', 'zor'] as const) {
      const ok = rate(60, (seed) => {
        const t = table(
          [
            [C('S', 7), C('H', 7)],
            [C('D', 2), C('S', 3), C('H', 3), C('C', 8)],
          ],
          [d, d],
          seed,
        );
        t.step({t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 7)]});
        return t.bots[1].decide(viewFor(t.s, 1))!.action.t === 'challenge';
      });
      expect(ok).toBeGreaterThanOrEqual(d === 'kolay' ? 0.85 : 1);
    }
  });

  it('tek kartı kalan rakibe turu bedava açtırmaz (son pas olacaksa blöfle bile oynar)', () => {
    for (const d of ['orta', 'zor'] as const) {
      const ok = rate(50, (seed) => {
        // 4 kişi: 1 "1 tane 5" atıp tek karta indi; 2 ve 3 pas dedi; sıra 0'da, 0'da 5 yok
        const t = table(
          [
            [C('S', 2), C('H', 9), C('D', 12), C('C', 13), C('S', 4)],
            [C('S', 5), C('H', 11)],
            [C('D', 1), C('C', 1), C('H', 6), C('S', 8)],
            [C('D', 8), C('C', 6), C('H', 10), C('S', 10)],
          ],
          [d, d, d, d],
          seed,
          undefined,
          1,
        );
        t.step({t: 'open', seat: 1, rank: 5, cards: [C('S', 5)]});
        t.step({t: 'windowClosed'});
        t.step({t: 'pass', seat: 2});
        t.step({t: 'pass', seat: 3});
        return t.bots[0].decide(viewFor(t.s, 0))!.action.t !== 'pass';
      });
      expect(ok).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('eşli: tek kartı kalan ORTAĞI son atansa pas der (tur ortağa döner), elinde o değer olsa bile', () => {
    for (const d of ['orta', 'zor'] as const) {
      const ok = rate(50, (seed) => {
        // 2 (0'ın ortağı) "1 tane Kız" atıp tek karta indi; 3 pas dedi; sıra 0'da (0'da bir Kız var)
        const t = table(
          [
            [C('S', 12), C('H', 9), C('D', 2), C('C', 13)],
            [C('D', 1), C('C', 1), C('H', 6), C('S', 8)],
            [C('H', 12), C('H', 11)],
            [C('D', 8), C('C', 6), C('H', 10), C('S', 10)],
          ],
          [d, d, d, d],
          seed,
          [0, 1, 0, 1],
          2,
        );
        t.step({t: 'open', seat: 2, rank: 12, cards: [C('H', 12)]});
        t.step({t: 'windowClosed'});
        t.step({t: 'pass', seat: 3});
        return t.bots[0].decide(viewFor(t.s, 0))!.action.t === 'pass';
      });
      expect(ok).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('dürüst kalabalık açışa (3–4 kart, elinde o değer yokken) boşuna blöf demez — gerçek oyunlardan', () => {
    for (const mode of ['1v1', '4'] as const) {
      for (const d of ['orta', 'zor'] as const) {
        let n = 0;
        let calls = 0;
        const N = mode === '1v1' ? 2 : 4;
        for (let i = 1; i <= 60; i++) {
          auditHand({
            cfg: modeCfg(mode, i * 7919 + 13),
            seats: Array.from({length: N}, (_, s) => (s === 0 ? {human: 'casual' as const} : d)),
            onDecision: (seat, v, a, st) => {
              const w = v.window;
              if (!w || w.final || v.roundPlays.length !== 1 || w.count < 3) return;
              if (v.hand.some((c) => rankOf(c) === w.rank)) return;
              const last = st.pile.slice(st.pile.length - st.lastCount);
              if (last.some((c) => rankOf(c) !== w.rank)) return; // yalnız dürüst açışlar
              n++;
              if (a.t === 'challenge') calls++;
              void seat;
            },
          });
        }
        expect(n).toBeGreaterThan(30);
        // 1'e 1'de rakip dört doldurunca bot "sıkışır" (geçerse zorunlu pas): orada ara sıra denemek makul, kalabalıkta değil
        expect(calls / n).toBeLessThan(mode === '1v1' ? 0.25 : 0.1);
      }
    }
  }, 60_000);

  it('rakibi tanır: açışlarında yalanı sık yakalanan rakibin sonraki açışından daha çok kuşkulanır', () => {
    const t = table(
      [
        [C('S', 2), C('H', 9), C('D', 12), C('C', 4), C('S', 6), C('H', 1), C('D', 6)],
        [C('S', 13), C('H', 13), C('D', 13), C('S', 3), C('H', 3), C('D', 5), C('C', 5), C('S', 11), C('H', 4), C('D', 4)],
      ],
      ['zor', 'zor'],
      3,
      undefined,
      1,
    );
    t.step({t: 'open', seat: 1, rank: 13, cards: [C('S', 13), C('H', 13), C('S', 3)]});
    const v = viewFor(t.s, 0);
    // iki eş bot (oyunu ortadan devralır); biri 1'in dört açışının yalan çıktığını görmüş (kamuya açık "reveal")
    const fresh = new BlofBot(0, 'zor', 5);
    const learned = new BlofBot(0, 'zor', 5);
    for (let k = 0; k < 4; k++) {
      learned.observe({t: 'opened', seat: 1, rank: 5, count: 2, cards: null, pileCount: 2, handCount: 9});
      learned.observe({t: 'windowOpen', id: 100 + k, by: 1, rank: 5, count: 2, final: false, ms: 5000, eligible: [0]});
      learned.observe({t: 'challenged', id: 100 + k, by: 0, target: 1});
      learned.observe({t: 'reveal', seat: 1, by: 0, rank: 5, cards: [C('S', 5), C('H', 8)], truthful: false});
    }
    expect(learned.lieProbability(v)).toBeGreaterThan(fresh.lieProbability(v) + 0.1);
  });
});

describe('Blöf botu: insan gibi zamanlama', () => {
  it('"Blöf!" tepkisi ani değil (≥ 0,5 sn), pencere bitmeden; kesin yakalama ortalamada kuşkulu olandan hızlı', () => {
    for (const d of ['kolay', 'orta', 'zor'] as const) {
      const sure: number[] = [];
      const doubt: number[] = [];
      // kesin yalan (elimden) ve belirsiz iddia: gecikmeleri doğrudan ölç
      for (let seed = 1; seed <= 40; seed++) {
        const t = table(
          [
            [C('S', 7), C('H', 2), C('D', 4), C('C', 5), C('S', 9)],
            [C('H', 7), C('D', 7), C('C', 7), C('S', 3), C('H', 10)],
          ],
          [d, d],
          seed,
        );
        t.step({t: 'open', seat: 0, rank: 7, cards: [C('S', 7), C('H', 2)]}); // 1 üç 7 tutuyor: kesin yalan
        const dec = t.bots[1].decide(viewFor(t.s, 1))!;
        expect(dec.action.t).toBe(d === 'kolay' ? dec.action.t : 'challenge');
        if (dec.action.t === 'challenge') sure.push(dec.delayMs);
        expect(dec.delayMs).toBeGreaterThanOrEqual(500);
        expect(dec.delayMs).toBeLessThanOrEqual(4700);
      }
      for (let seed = 1; seed <= 200 && doubt.length < 15; seed++) {
        const t = table(
          [
            [C('S', 8), C('H', 2), C('D', 4), C('C', 5), C('S', 9)],
            [C('H', 6), C('D', 3), C('C', 11), C('S', 3), C('H', 10)],
          ],
          [d, d],
          seed,
        );
        t.step({t: 'open', seat: 0, rank: 8, cards: [C('S', 8)]});
        t.step({t: 'windowClosed'});
        t.step({t: 'play', seat: 1, cards: [C('H', 6), C('D', 3)]}); // "2 tane 8": 0 bir 8 attı, kalan üç belirsiz
        const dec = t.bots[0].decide(viewFor(t.s, 0))!;
        if (dec.action.t === 'challenge') doubt.push(dec.delayMs);
        expect(dec.delayMs).toBeGreaterThanOrEqual(450);
        expect(dec.delayMs).toBeLessThanOrEqual(4700);
      }
      if (d !== 'kolay' && doubt.length >= 5 && sure.length >= 5) {
        const avg = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
        expect(avg(sure)).toBeLessThan(avg(doubt));
      }
      expect(BLOF_BOT_PARAMS[d].sure[0]).toBeGreaterThanOrEqual(600);
    }
  });

  it('düşünme süresi değişken: zorunlu/apaçık hamle (hepsi doğru bitiriş) kararsız olandan kısa', () => {
    const fin: number[] = [];
    const hard: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const a = table([[C('S', 9), C('H', 9)], [C('C', 8), C('S', 3), C('H', 3)]], ['zor', 'zor'], seed);
      fin.push(a.bots[0].decide(viewFor(a.s, 0))!.delayMs);
      const b = table(
        [
          [C('S', 9), C('H', 9), C('D', 4), C('C', 4), C('S', 12), C('H', 1)],
          [C('C', 8), C('S', 3), C('H', 3)],
        ],
        ['zor', 'zor'],
        seed,
      );
      hard.push(b.bots[0].decide(viewFor(b.s, 0))!.delayMs);
    }
    const avg = (x: number[]) => x.reduce((p, q) => p + q, 0) / x.length;
    expect(avg(fin)).toBeLessThan(avg(hard));
    expect(new Set(hard.map((x) => Math.round(x / 50))).size).toBeGreaterThan(5);
  });
});

describe('Blöf: canlı el (bütün modlar, insan vekiliyle)', () => {
  const modes = [
    ['1v1', 2],
    ['3', 3],
    ['4', 4],
    ['esli', 4],
  ] as const;
  for (const [mode, n] of modes) {
    it(`${mode}: hep biter, sonsuz döngü yok; orta/zor salak hamle yapmaz; el süresi makul`, () => {
      for (const d of ['kolay', 'orta', 'zor'] as const) {
        const out: HandMetrics[] = [];
        for (let i = 1; i <= 40; i++) out.push(auditHand({cfg: modeCfg(mode, i * 104729 + 7), seats: Array.from({length: n}, (_, s) => (s === 0 ? {human: 'casual' as const} : d))}));
        const s = summarize(out);
        expect(s.stalled).toBe(0);
        expect(s.giftPasses).toBe(0);
        expect(s.passWithRankFew).toBe(0);
        if (d !== 'kolay') {
          expect(s.finalUnchallengedRate).toBe(0);
          expect(s.finalMissedByBot).toBe(0);
        }
        // tipik el: 1'e 1 ≈ 2–5 dk, kalabalık ≈ 3–8 dk (animasyon + düşünme + pencereler, tahmini)
        expect(s.secP50).toBeGreaterThan(mode === '1v1' ? 100 : 140);
        expect(s.secP50).toBeLessThan(mode === '1v1' ? 330 : 480);
        expect(s.bluffRate).toBeGreaterThan(4); // hiç blöf yapmayan masa sıkıcı
      }
    }, 60_000);
  }

  it('botların kendi "imkânsız" yalanı (masada dördü aşan) orta/zor için yok denecek kadar az', () => {
    for (const mode of ['1v1', '4'] as const) {
      for (const d of ['orta', 'zor'] as const) {
        const n = mode === '1v1' ? 2 : 4;
        const s = auditMany(mode, Array.from({length: n}, () => d), 40);
        expect(s.impossiblePerHand).toBeLessThan(0.1);
      }
    }
  }, 60_000);
});

describe('Blöf: zorluk merdiveni (sıradan oyuncuya karşı)', () => {
  // Sıradan oyuncu (tests/blofAudit.ts CasualHuman): kart saymaz, doğru açar, arada blöf yapar, son karta hep "Blöf!" der.
  const casualWins = (mode: '1v1' | '4', d: BlofDifficulty, N: number): number => {
    const n = mode === '1v1' ? 2 : 4;
    let w = 0;
    for (let i = 1; i <= N; i++) {
      const r = auditHand({cfg: modeCfg(mode, i * 7919 + 13), seats: Array.from({length: n}, (_, s) => (s === 0 ? {human: 'casual' as const} : d))});
      if (r.winner === 0) w++;
    }
    return w / N;
  };

  it('1\'e 1: kolay yenilir, orta başa baş, zor zorlar', () => {
    const k = casualWins('1v1', 'kolay', 150);
    const o = casualWins('1v1', 'orta', 150);
    const z = casualWins('1v1', 'zor', 150);
    expect(k).toBeGreaterThan(0.62);
    expect(o).toBeGreaterThan(0.38);
    expect(o).toBeLessThan(0.62);
    expect(z).toBeLessThan(0.5);
    expect(k - z).toBeGreaterThan(0.2);
  }, 60_000);

  it('4 kişi: sıradan oyuncu kolaylara karşı payını (¼) bulur, zorlara karşı daha az kazanır', () => {
    const k = casualWins('4', 'kolay', 120);
    const z = casualWins('4', 'zor', 120);
    expect(k).toBeGreaterThan(0.2);
    expect(z).toBeLessThan(k);
  }, 60_000);
});

