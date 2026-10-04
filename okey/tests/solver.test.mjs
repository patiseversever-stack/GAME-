import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/util/rng.js';
import { makeCtx, tileId, isOkey, FAKE_A, FAKE_B } from '../src/game/tiles.js';
import { buildSet, buildRun, buildPair, classify, extendMeld, reclaimJoker, meldPoints, checkMeldStructure } from '../src/game/melds.js';
import { partitionAll, findBest, findPairsFinish, findBestPairs } from '../src/game/solver.js';
import { randomCtx, randomHand, bruteExact, bruteMaxPoints, constructedHand } from './helpers.mjs';

const R = 0, B = 1, K = 2, Y = 3; // red blue black yellow
const T = (c, v, k = 0) => tileId(c, v, k);

// Gösterge: Kırmızı 6 → okey Kırmızı 7 (hem T(R,7,0) hem T(R,7,1) joker)
const ctx = makeCtx(T(R, 6));

test('gösterge → okey: 13 göstergesinde okey 1', () => {
  const c13 = makeCtx(T(B, 13));
  assert.equal(c13.oc, B);
  assert.equal(c13.ov, 1);
  assert.ok(isOkey(T(B, 1, 0), c13) && isOkey(T(B, 1, 1), c13));
  assert.ok(!isOkey(T(R, 1), c13));
  assert.ok(isOkey(T(R, 7, 0), ctx) && isOkey(T(R, 7, 1), ctx));
  assert.ok(!isOkey(FAKE_A, ctx), 'sahte okey gerçek okey değildir');
});

test('set: geçerli ve geçersiz durumlar', () => {
  assert.ok(buildSet([T(R, 5), T(B, 5), T(K, 5)], ctx));
  assert.ok(buildSet([T(R, 5), T(B, 5), T(K, 5), T(Y, 5)], ctx));
  assert.equal(buildSet([T(R, 5), T(R, 5, 1), T(K, 5)], ctx), null, 'aynı renk iki kez');
  assert.equal(buildSet([T(R, 5), T(B, 6), T(K, 5)], ctx), null, 'farklı sayı');
  assert.equal(buildSet([T(R, 5), T(B, 5)], ctx), null, 'iki taş per değil');
  // okey joker olarak
  const s = buildSet([T(R, 5), T(B, 5), T(R, 7)], ctx);
  assert.ok(s && s.tiles.find((x) => x.j), 'okey grupta joker');
  assert.equal(s.value, 5);
  assert.equal(new Set(s.tiles.map((x) => x.c)).size, 3);
  // sahte okey = okeyin doğal yüzü (Kırmızı 7)
  assert.ok(buildSet([FAKE_A, T(B, 7), T(K, 7)], ctx), 'sahte okey kırmızı 7 gibi davranır');
  assert.equal(buildSet([FAKE_A, FAKE_B, T(K, 7)], ctx), null, 'iki sahte okey aynı renk (kırmızı 7) → grup olmaz');
  assert.ok(buildSet([FAKE_A, T(R, 7), T(K, 7)], ctx), 'sahte(kırmızı 7) + joker + siyah 7 → geçerli grup');
});

test('seri: temel, joker, sahte okey', () => {
  assert.ok(buildRun([T(R, 3), T(R, 4), T(R, 5)], ctx));
  assert.equal(buildRun([T(R, 3), T(R, 4), T(B, 5)], ctx), null);
  assert.equal(buildRun([T(R, 3), T(R, 4), T(R, 4, 1)], ctx), null, 'aynı değer iki kez');
  // 12-13-1: normalde geçerli, wrapHigh kapalıyken değil
  assert.ok(buildRun([T(B, 12), T(B, 13), T(B, 1)], ctx, { wrapHigh: true }));
  assert.equal(buildRun([T(B, 12), T(B, 13), T(B, 1)], ctx, { wrapHigh: false }), null);
  // 13-1-2 asla
  assert.equal(buildRun([T(B, 13), T(B, 1), T(B, 2)], ctx, { wrapHigh: true }), null);
  // joker (okey = kırmızı 7) ortada
  const r = buildRun([T(K, 4), T(R, 7), T(K, 6)], ctx);
  assert.ok(r);
  assert.equal(r.tiles[1].j, true);
  assert.equal(r.tiles[1].v, 5);
  // sahte okey doğal kırmızı 7: kırmızı 6-7-8 (sahte = 7)
  assert.ok(buildRun([T(R, 6), FAKE_B, T(R, 8)], ctx));
  // sahte okey farklı renkle seri yapamaz
  assert.equal(buildRun([T(B, 6), FAKE_B, T(B, 8)], ctx), null);
  // joker sonda: en yüksek puanlı yerleşim seçilir (5,6 + joker → 5-6-7)
  const r2 = buildRun([T(K, 5), T(K, 6), T(R, 7)], ctx);
  assert.equal(r2.start, 5);
  assert.equal(meldPoints(r2), 18);
  // wrap puanı: 12-13-1 → 12+13+14
  const w = buildRun([T(B, 12), T(B, 13), T(B, 1)], ctx, { wrapHigh: true });
  assert.equal(meldPoints(w), 39);
});

test('sıra-duyarlı seri: okey bulunduğu yerin değerini temsil eder', () => {
  // okey = kırmızı 7 (joker); siyah 8-9 ile
  const J = T(R, 7, 0);
  const left = buildRun([J, T(K, 8), T(K, 9)], ctx, { ordered: true });
  assert.equal(left.start, 7);
  assert.equal(left.tiles[0].v, 7);
  const right = buildRun([T(K, 8), T(K, 9), J], ctx, { ordered: true });
  assert.equal(right.start, 8);
  assert.equal(right.tiles[2].v, 10);
  // ordered kapalıyken en yüksek puanlı yorum (8-9-10)
  assert.equal(buildRun([J, T(K, 8), T(K, 9)], ctx).start, 8);
  // sıra tutarsızsa (azalan) en yüksek puana düşer, yine geçerlidir
  assert.ok(buildRun([T(K, 9), T(K, 8), J], ctx, { ordered: true }));
  // iç boşluk: tek olası yer
  const mid = buildRun([T(K, 8), J, T(K, 10)], ctx, { ordered: true });
  assert.equal(mid.tiles[1].v, 9);
  // 12-13-1 sıra-duyarlı
  const w = buildRun([T(B, 12), T(B, 13), J], ctx, { ordered: true, wrapHigh: true });
  assert.equal(w.tiles[2].v, 1);
  const noWrap = buildRun([T(B, 12), T(B, 13), J], ctx, { ordered: true, wrapHigh: false });
  assert.equal(noWrap.start, 11, 'wrap kapalıyken okey başa (11) yorumlanır');
  assert.equal(noWrap.tiles[0].j, true);
});

test('çift: aynı yüz; joker ve sahte okey', () => {
  assert.ok(buildPair([T(B, 9), T(B, 9, 1)], ctx));
  assert.equal(buildPair([T(B, 9), T(B, 10)], ctx), null);
  assert.ok(buildPair([T(B, 9), T(R, 7)], ctx), 'joker ile çift');
  assert.ok(buildPair([FAKE_A, FAKE_B], ctx), 'iki sahte okey aynı yüz');
  assert.ok(buildPair([T(R, 7, 0), T(R, 7, 1)], ctx), 'iki gerçek okey çift');
});

test('genişletme: sete ve seriye; okeyli seri temsili korunur', () => {
  const s = buildSet([T(R, 5), T(B, 5), T(K, 5)], ctx);
  assert.ok(extendMeld(s, T(Y, 5), ctx).ok);
  assert.ok(!extendMeld(s, T(Y, 6), ctx).ok);
  const full = extendMeld(s, T(Y, 5), ctx).meld;
  assert.ok(!extendMeld(full, T(R, 7), ctx).ok, 'dolu per');

  // seri K 5-6-joker(7): joker temsili yeniden çözülmemeli
  const run = buildRun([T(K, 5), T(K, 6), T(R, 7)], ctx);
  assert.equal(run.tiles[2].v, 7);
  const e8 = extendMeld(run, T(K, 8), ctx);
  assert.ok(e8.ok);
  assert.deepEqual(e8.meld.tiles.map((x) => x.v), [5, 6, 7, 8]);
  assert.equal(e8.meld.tiles[2].j, true, 'joker hâlâ 7');
  const e4 = extendMeld(run, T(K, 4), ctx);
  assert.ok(e4.ok);
  assert.equal(e4.meld.start, 4);
  assert.ok(!extendMeld(run, T(K, 9), ctx).ok);
  assert.ok(!extendMeld(run, T(B, 8), ctx).ok);
  // joker ile iki uçtan
  const j = extendMeld(run, T(R, 7, 1), ctx, { end: 'low' });
  assert.ok(j.ok && j.meld.start === 4 && j.meld.tiles[0].v === 4);
  // 12-13-1 uzatma yalnızca wrapHigh
  const r1 = buildRun([T(B, 11), T(B, 12), T(B, 13)], ctx, { wrapHigh: true });
  assert.ok(extendMeld(r1, T(B, 1), ctx, { wrapHigh: true }).ok);
  assert.ok(!extendMeld(r1, T(B, 1), ctx, { wrapHigh: false }).ok);
});

test('okey geri alma: temsil edilen taşla değişir', () => {
  const run = buildRun([T(K, 5), T(K, 6), T(R, 7)], ctx);
  assert.ok(reclaimJoker(run, T(R, 7), T(K, 7), ctx).ok);
  assert.ok(!reclaimJoker(run, T(R, 7), T(K, 8), ctx).ok);
  const r = reclaimJoker(run, T(R, 7), T(K, 7), ctx).meld;
  assert.ok(checkMeldStructure(r, ctx));
});

test('checkMeldStructure: üretilen tüm perler yapısal olarak geçerli', () => {
  const rng = createRng(11);
  let n = 0;
  for (let i = 0; i < 4000; i++) {
    const cx = randomCtx(rng);
    const size = 2 + rng.int(5);
    const hand = randomHand(rng, size, { dense: true });
    const m = classify(hand, cx, { wrapHigh: true });
    if (m) {
      n++;
      assert.ok(checkMeldStructure(m, cx, { wrapHigh: true }), JSON.stringify(m));
    }
  }
  assert.ok(n > 50, 'yeterli geçerli per üretilmeli ' + n);
});

test('partitionAll ≡ kaba kuvvet (14 taş, rastgele + kurgusal + bozulmuş)', () => {
  const rng = createRng(2024);
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < 700; i++) {
    const cx = randomCtx(rng);
    let hand;
    const mode = i % 3;
    if (mode === 0) hand = randomHand(rng, 14, { dense: true });
    else if (mode === 1) hand = constructedHand(rng, cx, 14);
    else {
      hand = constructedHand(rng, cx, 14);
      // bozma: bir taşı rastgele başka taşla değiştir (okey/sahte de gelebilir)
      const rest = Array.from({ length: 106 }, (_, t) => t).filter((t) => !hand.includes(t));
      if (hand.length) hand[rng.int(hand.length)] = rng.pick(rest);
    }
    if (hand.length !== 14) continue;
    // birkaç elde okey/sahte olsun
    if (rng.chance(0.35)) {
      const rest = [FAKE_A, FAKE_B, tileId(cx.oc, cx.ov, 0), tileId(cx.oc, cx.ov, 1)].filter((t) => !hand.includes(t));
      if (rest.length) hand[rng.int(14)] = rng.pick(rest);
    }
    for (const wrap of [true, false]) {
      const expect = bruteExact(hand, cx, wrap);
      const got = partitionAll(hand, cx, { wrapHigh: wrap });
      assert.equal(!!got, expect, `hand=${JSON.stringify(hand)} ind=${cx.indicator} wrap=${wrap}`);
      if (got) {
        pos++;
        const ids = got.groups.flatMap((g) => g.tiles.map((x) => x.t)).sort((a, b) => a - b);
        assert.deepEqual(ids, hand.slice().sort((a, b) => a - b), 'tüm taşlar kullanılmalı');
        for (const g of got.groups) assert.ok(checkMeldStructure(g, cx, { wrapHigh: wrap }), JSON.stringify(g));
      } else neg++;
    }
  }
  assert.ok(pos > 100 && neg > 100, `pos=${pos} neg=${neg}`);
});

test('findBest ≡ kaba kuvvet en yüksek puan (küçük eller)', () => {
  const rng = createRng(777);
  let checked = 0;
  for (let i = 0; i < 350; i++) {
    const cx = randomCtx(rng);
    const n = 6 + rng.int(4);
    const hand = randomHand(rng, n, { dense: true });
    for (const wrap of [true, false]) {
      for (const leaveOne of [false, true]) {
        const expect = bruteMaxPoints(hand, cx, wrap, leaveOne);
        const got = findBest(hand, cx, { wrapHigh: wrap, leaveOne });
        const gotPts = got ? got.points : -1;
        // brute: hiçbir şey seçilmezse 0 (leaveOne ile de mümkün) → ikisi de ≥ 0
        assert.equal(gotPts, expect, `hand=${JSON.stringify(hand)} ind=${cx.indicator} wrap=${wrap} leaveOne=${leaveOne}`);
        if (got) {
          const used = got.groups.flatMap((g) => g.tiles.map((x) => x.t));
          assert.equal(new Set(used).size, used.length, 'taş tekrarı yok');
          if (leaveOne) assert.ok(used.length < hand.length);
          for (const g of got.groups) assert.ok(checkMeldStructure(g, cx, { wrapHigh: wrap }));
        }
        checked++;
      }
    }
  }
  assert.ok(checked > 1000);
});

test('findBest must: zorunlu taş kullanılan perlerde yer alır', () => {
  const rng = createRng(31337);
  let hit = 0;
  for (let i = 0; i < 300; i++) {
    const cx = randomCtx(rng);
    const hand = randomHand(rng, 9, { dense: true });
    const must = hand[rng.int(hand.length)];
    const got = findBest(hand, cx, { wrapHigh: false, leaveOne: true, must });
    if (!got) continue;
    const used = got.groups.flatMap((g) => g.tiles.map((x) => x.t));
    assert.ok(used.includes(must), `must=${must} hand=${JSON.stringify(hand)}`);
    hit++;
  }
  assert.ok(hit > 30, 'zorunlu taşla çözülebilen el sayısı ' + hit);
});

test('çiftler: 7 çiftle bitiş ve en çok çift', () => {
  const pairs = [T(R, 1), T(R, 1, 1), T(B, 2), T(B, 2, 1), T(K, 3), T(K, 3, 1), T(Y, 4), T(Y, 4, 1), T(R, 5), T(R, 5, 1), T(B, 9), T(B, 9, 1), T(K, 13), T(K, 13, 1)];
  assert.ok(findPairsFinish(pairs, ctx));
  const withJoker = pairs.slice();
  withJoker[13] = T(R, 7); // okey (joker) K13'ü eşler
  assert.ok(findPairsFinish(withJoker, ctx));
  const bad = pairs.slice();
  bad[13] = T(K, 12);
  assert.equal(findPairsFinish(bad, ctx), null);
  const best = findBestPairs(pairs.slice(0, 11), ctx, { leaveOne: true });
  assert.equal(best.count, 5);
});
