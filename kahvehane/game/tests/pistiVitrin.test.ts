import {describe, expect, it} from 'vitest';
import {applyPlay} from '../src/core/pisti';
import {cardId, type PistiState} from '../src/core/types';
import {VIT_MAX, closeRule, pistiTag, shouldHint, showCards, tagRows, tapAction, vitrinFan} from '../src/ui/pistiVitrinLogic';

/** Elle kurulan durum (tests/pisti.test.ts ile aynı biçim). */
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
  } as PistiState;
}

describe('pişti etiketi (vale pişti = J üstüne J)', () => {
  it('motorda J, tek J üstüne oynanınca 20, tek başka kart üstüne oynanınca pişti değil', () => {
    const jH = cardId('H', 11), jS = cardId('S', 11), fiveD = cardId('D', 5);
    const a = applyPlay(mk({pile: [jH], hands: [[jS, cardId('C', 9)], [cardId('C', 3)]]}), 0, jS);
    const capA = a.events.find(e => e.t === 'capture') as {pisti: number};
    expect(capA.pisti).toBe(20);
    expect(pistiTag(jS)).toMatchObject({points: 20, vale: true, label: 'Vale Pişti +20'});
    // J, tek 5'in üstüne: yakalar ama pişti sayılmaz → vitrinde hiç kart olmaz
    const b = applyPlay(mk({pile: [fiveD], hands: [[jS, cardId('C', 9)], [cardId('C', 3)]]}), 0, jS);
    expect((b.events.find(e => e.t === 'capture') as {pisti: number}).pisti).toBe(0);
  });
  it('motorda aynı değer = 10, etiket +10 (vale değil)', () => {
    const k5 = cardId('S', 5), d5 = cardId('D', 5);
    const r = applyPlay(mk({pile: [d5], hands: [[k5, cardId('C', 9)], [cardId('C', 3)]]}), 0, k5);
    expect((r.events.find(e => e.t === 'capture') as {pisti: number}).pisti).toBe(10);
    expect(pistiTag(k5)).toEqual({points: 10, vale: false, label: '+10'});
  });
  it('her vale, her diğer kart (K, A, 10...) için doğru etiket', () => {
    for (let r = 1; r <= 13; r++) for (const s of ['H', 'D', 'C', 'S'] as const) expect(pistiTag(cardId(s, r)).points).toBe(r === 11 ? 20 : 10);
  });
});

describe('sıra: pişti yapılış sırası', () => {
  it('kartlar oluş sırasıyla gelir; en çok 8, fazlasında en eskiler atlanır (son pişti hep görünür)', () => {
    const row = [1, 2, 3];
    expect(showCards(row)).toEqual({items: [1, 2, 3], first: 0});
    const long = Array.from({length: 11}, (_, i) => i);
    const v = showCards(long);
    expect(v.items).toHaveLength(VIT_MAX);
    expect(v.items[VIT_MAX - 1]).toBe(10);
    expect(v.items[0]).toBe(3);
    expect(v.first).toBe(3);
  });
  it('yelpaze soldan sağa oluş sırasında, ortalı ve ekrana sığar (360x640, 412x915, 1..8 kart)', () => {
    for (const [W, H] of [[360, 640], [390, 844], [412, 839], [412, 915]]) {
      const cw = Math.round(Math.min(W * 0.215, H * 0.112)), handS = Math.min(W * 0.245, H * 0.138) / cw;
      for (let n = 1; n <= VIT_MAX; n++) {
        const f = vitrinFan(n, {W, H, cw, handS});
        expect(f.poses).toHaveLength(n);
        for (let k = 1; k < n; k++) expect(f.poses[k].x).toBeGreaterThan(f.poses[k - 1].x); // sıra korunur
        const mid = (f.poses[0].x + f.poses[n - 1].x) / 2;
        expect(Math.abs(mid - W / 2)).toBeLessThan(0.5); // ortalı
        const left = f.poses[0].x - f.w / 2 - 6, right = f.poses[n - 1].x + f.w / 2 + 6;
        expect(left).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThanOrEqual(W);
        if (n > 1) expect(f.step).toBeGreaterThanOrEqual(f.w * 0.34); // köşe indeksi (değer + takım) her kartta açık
        expect(f.top).toBeGreaterThan(H * 0.25);
        expect(f.bottom).toBeLessThan(H * 0.62);
      }
    }
  });
  it('vitrin kartı eldeki kartla aynı boyda (net atlas çözünürlüğü)', () => {
    const f = vitrinFan(3, {W: 360, H: 640, cw: 72, handS: 88 / 72});
    expect(f.w).toBeCloseTo(88, 5);
    expect(f.poses.every(p => p.s === 88 / 72)).toBe(true);
  });
});

describe('yelpaze sol sınırı (deste)', () => {
  it('sol sınır verilince kartlar o sınırın sağında kalır, ekrana sığar, sıra korunur', () => {
    const W = 360, H = 640, cw = 72, handS = 88 / 72;
    for (let n = 1; n <= VIT_MAX; n++) {
      const f = vitrinFan(n, {W, H, cw, handS, left: 86});
      if (n <= 5) expect(f.poses[0].x - f.w / 2).toBeGreaterThanOrEqual(86 - 0.01); // çok kartta köşe indeksi için sınırdan vazgeçilir
      expect(f.poses[n - 1].x + f.w / 2).toBeLessThanOrEqual(W);
      for (let k = 1; k < n; k++) expect(f.poses[k].x).toBeGreaterThan(f.poses[k - 1].x);
      if (n > 1) expect(f.step).toBeGreaterThanOrEqual(f.w * 0.34);
      if (n <= 5) expect(f.cx).toBeGreaterThanOrEqual(W / 2 - 0.01);
    }
  });
  it('sınır yoksa tam ortalı', () => {
    const f = vitrinFan(3, {W: 412, H: 915, cw: 89, handS: 101 / 89});
    expect(f.cx).toBeCloseTo(206, 5);
  });
});

describe('etiket satırları', () => {
  it('yan yana sığanlar tek satırda, sığmayanlar alt satıra iner', () => {
    expect(tagRows([60, 120, 180], [34, 34, 34])).toEqual([0, 0, 0]);
    // geniş "Vale Pişti +20" komşusuyla çakışırsa ikinci satır
    expect(tagRows([60, 100, 190], [34, 100, 34])).toEqual([0, 1, 0]);
    expect(tagRows([], [])).toEqual([]);
  });
});

describe('kapanma kuralları', () => {
  const timed = {timedTurn: true}, free = {timedTurn: false};
  it('yeni yakalama / atış / dağıtım / efekt: hızlı geri uçuş', () => {
    for (const ev of ['collect', 'play', 'deal', 'fx'] as const) expect(closeRule(ev, free)).toBe('fast');
  });
  it('el sıfırlanır / yerleşim değişir / el biter: anında (kartların yeri geçersiz)', () => {
    for (const ev of ['reset', 'layout', 'end'] as const) expect(closeRule(ev, free)).toBe('instant');
  });
  it('sıra bende: yalnız sayaçlıysa kapanır', () => {
    expect(closeRule('turn', timed)).toBe('fast');
    expect(closeRule('turn', free)).toBe('keep');
  });
  it('dokunma hızlı, süre dolması zarif kapatır', () => {
    expect(closeRule('tap', free)).toBe('fast');
    expect(closeRule('timer', free)).toBe('normal');
  });
});

describe('dokunuş kararı', () => {
  const base = {pistis: 3, busy: 0, stack: 10, openSeat: -1, seat: 1};
  it('pişti var + sakin masa: aç; başka koltuk açıksa takas; aynı koltuk açıksa kapat', () => {
    expect(tapAction(base)).toBe('open');
    expect(tapAction({...base, openSeat: 2})).toBe('swap');
    expect(tapAction({...base, openSeat: 1})).toBe('close');
  });
  it('masa meşgulken açılmaz; pişti yoksa en çok küçük zıplama', () => {
    expect(tapAction({...base, busy: 1})).toBe('ignore');
    expect(tapAction({...base, pistis: 0})).toBe('bounce');
    expect(tapAction({...base, pistis: 0, busy: 2})).toBe('ignore');
    expect(tapAction({...base, pistis: 0, stack: 0})).toBe('ignore');
  });
});

describe('tek seferlik ipucu', () => {
  const base = {n: 2, seen: false, auto: false, shownThisSession: false};
  it('2+ pişti, görülmemiş, otomatik değil: gösterir', () => {
    expect(shouldHint(base)).toBe(true);
    expect(shouldHint({...base, n: 3})).toBe(true);
  });
  it('1 pişti, daha önce görülmüş, ?auto ya da bu oturumda gösterilmiş: göstermez', () => {
    expect(shouldHint({...base, n: 1})).toBe(false);
    expect(shouldHint({...base, seen: true})).toBe(false);
    expect(shouldHint({...base, auto: true})).toBe(false);
    expect(shouldHint({...base, shownThisSession: true})).toBe(false);
  });
});
