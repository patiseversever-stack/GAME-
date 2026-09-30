// Diferansiyel test: yeni motor ↔ orijinal (legacy) motor. Harness: tests/parity-harness.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/util/rng.js';
import { tileId, colorOf, valueOf, makeCtx, COLORS } from '../src/game/tiles.js';
import { partitionAll, findPairsFinish, findBest } from '../src/game/solver.js';
import { buildMeld } from '../src/game/melds.js';
import { randomHand, constructedHand } from './helpers.mjs';
import { L, toInt, toStr, runParity, FULL } from './parity-harness.mjs';

test('taş kimliği eşlemesi 106 taşta çift yönlü tutarlı ve orijinal taş kümesiyle aynı', () => {
  const legacyIds = new Set(L.TILES.map((t) => t.id));
  assert.equal(legacyIds.size, 106);
  for (let t = 0; t < 106; t++) {
    assert.ok(legacyIds.has(toStr(t)), toStr(t));
    assert.equal(toInt(toStr(t)), t);
  }
});

test('per doğrulama paritesi: orijinal Ze ↔ buildMeld (pair/set/run)', () => {
  const rng = createRng(4242);
  let agree = 0;
  let divergences = 0;
  for (let i = 0; i < 60000; i++) {
    const indicator = rng.int(104);
    const ctx = makeCtx(indicator);
    const n = 2 + rng.int(5);
    const hand = randomHand(rng, n, { dense: true });
    const kind = rng.pick(['pair', 'set', 'run']);
    for (const mode of ['normal', '101']) {
      const wrap = mode === 'normal';
      const leg = L.validateMeld({ kind, tiles: hand.map((t) => ({ tileId: toStr(t) })) }, toStr(indicator), mode);
      const mine = buildMeld(kind, hand, ctx, { wrapHigh: wrap });
      if (!!leg.ok !== !!mine) {
        divergences++;
        assert.fail(`Per paritesi bozuk: kind=${kind} mode=${mode} ind=${toStr(indicator)} tiles=${hand.map(toStr)} legacy=${leg.ok}/${leg.reason} mine=${!!mine}`);
      }
      if (leg.ok) {
        // puan: orijinal yüksek 1'i 1 sayar; yeni motor 14 sayar → yalnızca sarılmış seride fark beklenir
        const end = mine.kind === 'run' ? mine.start + mine.tiles.length - 1 : 0;
        const doubleJokerPair = mine.kind === 'pair' && mine.tiles.every((x) => x.j); // temsil seçimi farklı; çift açmada yalnızca sayı önemli
        if (end <= 13 && !doubleJokerPair) {
          const pts = mine.kind === 'set' ? mine.value * mine.tiles.length : mine.kind === 'pair' ? mine.tiles[0].v * 2 : mine.tiles.reduce((a, x, k) => a + mine.start + k, 0);
          assert.equal(pts, leg.score, `Puan farkı kind=${kind} tiles=${hand.map(toStr)}`);
        }
        agree++;
      }
    }
  }
  assert.ok(agree > 500, 'yeterli geçerli örnek: ' + agree);
  assert.equal(divergences, 0);
});

test('bitiş paritesi: orijinal On ↔ findPairsFinish/partitionAll (14 taş)', () => {
  const rng = createRng(909);
  let pos = 0;
  for (let i = 0; i < 1500; i++) {
    const indicator = rng.int(104);
    const ctx = makeCtx(indicator);
    let hand;
    if (i % 3 === 0) hand = randomHand(rng, 14, { dense: true });
    else {
      hand = constructedHand(rng, ctx, 14);
      if (hand.length !== 14) continue;
      if (i % 3 === 2) {
        const rest = Array.from({ length: 106 }, (_, t) => t).filter((t) => !hand.includes(t));
        hand[rng.int(14)] = rng.pick(rest);
      }
      if (rng.chance(0.3)) {
        const extra = [104, 105, tileId(ctx.oc, ctx.ov, 0), tileId(ctx.oc, ctx.ov, 1)].filter((t) => !hand.includes(t));
        if (extra.length) hand[rng.int(14)] = rng.pick(extra);
      }
    }
    const leg = L.canFinish(hand.map(toStr), toStr(indicator), 'normal');
    const pairs = findPairsFinish(hand, ctx);
    const sets = pairs ? null : partitionAll(hand, ctx, { wrapHigh: true });
    const mine = pairs ? 'pairs' : sets ? 'sets' : null;
    assert.equal(mine, leg ? leg.kind : null, `hand=${hand.map(toStr)} ind=${toStr(indicator)}`);
    if (mine) pos++;
  }
  assert.ok(pos > 100, 'pozitif örnek: ' + pos);
});

test('101 açılış paritesi: orijinal dy ↔ findBest (≥101 mümkün mü?)', () => {
  const rng = createRng(31415);
  let feasible = 0;
  let total = 0;
  for (let i = 0; i < 400; i++) {
    const indicator = rng.int(104);
    const ctx = makeCtx(indicator);
    const hand = randomHand(rng, 22, { dense: true });
    const view = {
      indicator: toStr(indicator),
      rules: { opening: 'fixed', mode: '101' },
      openingMax: { sets: 100, pairs: 4 },
    };
    const leg = L.bestOpen(view, hand.map(toStr), undefined);
    const mine = findBest(hand, ctx, { wrapHigh: false, leaveOne: true });
    const mineSets = mine && mine.points >= 101;
    // orijinal sonuç: {groups, score}; çift açma (≥5 çift) de dönebilir
    const legSets = leg && leg.groups.every((g) => g.kind !== 'pair') && leg.score >= 101;
    if (leg && leg.groups.some((g) => g.kind === 'pair')) continue; // çift açılış ayrı test
    total++;
    if (mineSets) feasible++;
    assert.equal(!!mineSets, !!legSets, `ind=${toStr(indicator)} hand=${hand.map(toStr)} legacy=${leg && leg.score} mine=${mine && mine.points}`);
  }
  assert.ok(feasible > 10 && feasible < total, `feasible=${feasible}/${total}`);
});

test('oyun akışı paritesi — klasik Okey (orijinal bot + rastgele hamleler)', () => {
  const r = runParity('normal', FULL ? 40 : 6, 2025);
  console.log('klasik:', JSON.stringify(r));
  assert.ok(r.steps > (FULL ? 1500 : 200));
});

test('oyun akışı paritesi — klasik Okey, tek renk bitiş açık', () => {
  const r = runParity('normal', FULL ? 20 : 3, 77, { colorFinish: true });
  assert.ok(r.steps > (FULL ? 400 : 60));
});

test('oyun akışı paritesi — 101 (sabit açılış)', () => {
  const r = runParity('101', FULL ? 10 : 3, 555);
  console.log('101:', JSON.stringify(r));
  assert.ok(r.steps > (FULL ? 600 : 100));
});

test('oyun akışı paritesi — 101 katlamalı açılış', () => {
  const r = runParity('101', FULL ? 6 : 2, 909, { opening: 'progressive' });
  assert.ok(r.steps > (FULL ? 300 : 40));
});
