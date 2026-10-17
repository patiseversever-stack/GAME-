import {describe, expect, it} from 'vitest';
import {applyPlay} from '../src/core/pisti';
import {cardId, type PistiState} from '../src/core/types';
import {VIT_MAX, closeRule, pistiTag, shouldHint, showCards, tapAction, vitrinFan, vitrinTags, type FanLayout, type TagPlan} from '../src/ui/pistiVitrinLogic';

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
    expect(pistiTag(jS)).toMatchObject({points: 20, vale: true, label: 'VALE +20'});
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
  it('sınır yoksa tam ortalı', () => {
    const f = vitrinFan(3, {W: 412, H: 915, cw: 89, handS: 101 / 89});
    expect(f.cx).toBeCloseTo(206, 5);
  });
  it('sınır varsa yelpaze o kadar sağa kayar (ortadan solda kalmaz)', () => {
    const f = vitrinFan(5, {W: 360, H: 640, cw: 72, handS: 88 / 72, left: 150});
    expect(f.poses[0].x - f.w / 2).toBeGreaterThanOrEqual(150 - 0.01);
    expect(f.cx).toBeGreaterThan(180);
  });
});

/** Döndürülmüş dikdörtgen köşeleri + ayırıcı eksen (SAT) çakışma testi */
const rectPoly = (cx: number, cy: number, w: number, h: number, rotDeg: number): number[][] => {
  const a = (rotDeg * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * co - y * si, cy + x * si + y * co]);
};
const overlap = (A: number[][], B: number[][]): boolean => {
  for (const P of [A, B]) for (let i = 0; i < 4; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % 4], L = Math.hypot(x1 - x0, y1 - y0) || 1, ax = [-(y1 - y0) / L, (x1 - x0) / L];
    const pr = (Q: number[][]) => { const v = Q.map(([x, y]) => x * ax[0] + y * ax[1]); return [Math.min(...v), Math.max(...v)]; };
    const [a0, a1] = pr(A), [b0, b1] = pr(B);
    if (Math.min(a1, b1) - Math.max(a0, b0) <= 0) return false;
  }
  return true;
};
const inside = (P: number[][], [x, y]: number[]): boolean => {
  let sg = 0;
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % 4], cr = (x1 - x0) * (y - y0) - (y1 - y0) * (x - x0);
    if (cr !== 0) { if (sg && Math.sign(cr) !== sg) return false; sg = Math.sign(cr); }
  }
  return true;
};
const SIZES: [number, number][] = [[360, 640], [390, 844], [412, 839], [412, 915]];
const fanOf = (W: number, H: number, n: number, left?: number): {fan: FanLayout; u: number} => {
  const cw = Math.round(Math.min(W * 0.215, H * 0.112)), handS = Math.min(W * 0.245, H * 0.138) / cw;
  const u = Math.min(22, Math.max(12, Math.min(W * 0.04, H * 0.02)));
  return {fan: vitrinFan(n, {W, H, cw, handS, left, bottomMax: H * 0.62}), u};
};

describe('etiketler: kart başına tek, şeride sığar, yay boyunca tek taban çizgisi', () => {
  it('her boyut / kart sayısı (1,3,5,8) / vale dağılımı için: etiket kendi kartının içinde, birbirine ve hiçbir kartın üst-sol köşe indeksine değmez', () => {
    for (const [W, H] of SIZES) for (const n of [1, 2, 3, 5, 8]) for (const withDeck of [false, true]) {
      const {fan, u} = fanOf(W, H, n, withDeck ? 99 : undefined);
      for (const vales of [Array(n).fill(false), Array.from({length: n}, (_, k) => k === 0), Array.from({length: n}, (_, k) => k % 2 === 1), Array(n).fill(true)]) {
        const tags: TagPlan[] = vitrinTags(fan, vales, u);
        expect(tags).toHaveLength(n); // kart başına tek
        const cards = fan.poses.map(p => rectPoly(p.x, p.y, fan.w, fan.h, p.r));
        // üst-sol köşe indeksi bölgesi (genişliğin %36'sı × yüksekliğin %42'si), kartın kendi çerçevesinde
        const corners = fan.poses.map(p => {
          const a = (p.r * Math.PI) / 180, lx = -fan.w / 2 + fan.w * 0.18, ly = -fan.h / 2 + fan.h * 0.21;
          return rectPoly(p.x + lx * Math.cos(a) - ly * Math.sin(a), p.y + lx * Math.sin(a) + ly * Math.cos(a), fan.w * 0.36, fan.h * 0.42, p.r);
        });
        const boxes = tags.map(t => rectPoly(t.x, t.y, t.w, t.h, t.rot));
        tags.forEach((t, k) => {
          expect(inside(cards[k], [t.x, t.y])).toBe(true); // kendi kartında
          for (const c of boxes[k]) expect(inside(cards[k], c)).toBe(true); // kutusu kartın dışına taşmaz
          for (let j = 0; j < n; j++) {
            if (j !== k) expect(overlap(boxes[k], boxes[j])).toBe(false); // başka etiketle çakışmaz
            expect(overlap(boxes[k], corners[j])).toBe(false); // hiçbir kartın değer/takım köşesine binmez
          }
          if (n > 1) expect(t.w).toBeLessThanOrEqual(fan.step - 1.4); // şeride sığar (komşu karta taşmaz)
          expect(t.fs).toBeGreaterThanOrEqual(n <= 5 ? 8.5 : 7.8); // okunur kalır
          expect(t.rot).toBe(fan.poses[k].r); // kartla aynı dönüş (yay izlenir)
        });
      }
    }
  });
  it('etiket metni: vale altın "VALE +20" (sığmazsa "+20"), diğerleri "+10"', () => {
    const {fan, u} = fanOf(412, 915, 5);
    const t = vitrinTags(fan, [true, false, false, true, false], u);
    expect(t.map(x => x.label)).toEqual(['VALE +20', '+10', '+10', 'VALE +20', '+10']);
    expect(t.map(x => x.vale)).toEqual([true, false, false, true, false]);
    const tight = fanOf(360, 640, 8, 99);
    const tt = vitrinTags(tight.fan, Array(8).fill(true), tight.u);
    expect(tt.every(x => x.label === '+20' && x.vale)).toBe(true); // kalabalıkta kısa altın etiket
  });
});

describe('yelpaze: deste sayısı hapına ve ipucu hapına binmez', () => {
  it('sol sınır (deste) 8 karta kadar korunur, kartlar eldekinin %70\'inden küçülmez, alt kenar ipucu hapının üstünde', () => {
    for (const [W, H] of SIZES) {
      const cw = Math.round(Math.min(W * 0.215, H * 0.112)), handW = Math.min(W * 0.245, H * 0.138);
      const left = 12 + cw * 0.9 + 12; // deste sağ kenarı + pay (1'e 1 en kötü durum)
      for (let n = 1; n <= VIT_MAX; n++) {
        const f = vitrinFan(n, {W, H, cw, handS: handW / cw, left, bottomMax: H * 0.62});
        expect(f.poses[0].x - f.w / 2).toBeGreaterThanOrEqual(left - 0.01);
        expect(f.poses[n - 1].x + f.w / 2).toBeLessThanOrEqual(W);
        expect(f.w).toBeGreaterThanOrEqual(handW * 0.7);
        if (n > 1) expect(f.step).toBeGreaterThanOrEqual(f.w * 0.34);
        expect(f.bottom).toBeLessThanOrEqual(H * 0.62 + 0.01);
      }
    }
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
