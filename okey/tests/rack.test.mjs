import test from 'node:test';
import assert from 'node:assert/strict';
import { RackModel, diffSlots } from '../src/ui/rack.js';
import { makeCtx, tileId } from '../src/game/tiles.js';

const T = (c, v, k = 0) => tileId(c, v, k);

function filled(rows, cols, arr) {
  const r = new RackModel(rows, cols);
  arr.forEach((t, i) => (r.slots[i] = t));
  return r;
}

test('boş slota taşıma', () => {
  const r = filled(2, 6, [1, 2, 3, null, null, null]);
  r.moveTo(1, 5);
  assert.deepEqual(r.slots.slice(0, 6), [null, 2, 3, null, null, 1].map((x) => (x === 1 ? 1 : x)).map((x, i) => (i === 0 ? null : x)));
  assert.equal(r.indexOf(1), 5);
});

test('dolu slota bırakma: komşular en yakın boşluğa doğru kayar', () => {
  // [a b c d _ _] : d'yi (3) 0'a bırak → a b c sağa kayar
  const r = filled(2, 6, [10, 11, 12, 13, null, null]);
  r.moveTo(13, 0);
  assert.deepEqual(r.slots.slice(0, 6), [13, 10, 11, 12, null, null]);
});

test('aynı satır içinde sürükleme: en az taş oynar (en yakın boşluk kuralı)', () => {
  const r = filled(2, 6, [10, 11, 12, 13, 14, null]);
  r.moveTo(10, 3);
  // kaynak boşalır (slot 0); hedefteki 13 ve 14, en yakın boşluğa (slot 5) doğru 1 kayar
  assert.deepEqual(r.slots.slice(0, 6), [null, 11, 12, 10, 13, 14]);
  // aradaki boşluk varsa yalnızca o tüketilir
  const r2 = filled(2, 6, [10, 11, null, 13, 14, 15]);
  r2.moveTo(10, 3);
  assert.deepEqual(r2.slots.slice(0, 6), [null, 11, 13, 10, 14, 15]);
});

test('satır doluysa yer değiştirir', () => {
  const r = filled(2, 4, [1, 2, 3, 4, null, null, null, null]);
  r.moveTo(1, 3);
  // satır dolu değil (taşınan çıkınca boş slot oluşur) → kayma
  assert.equal(r.indexOf(1), 3);
  assert.equal(r.count, 4);
  const full = filled(1, 4, [1, 2, 3, 4]);
  full.moveTo(1, 3);
  assert.deepEqual(full.slots, [2, 3, 4, 1]);
});

test('farklı satırdan sürükleme: hedef satırda yer açılır, kaynak boşalır', () => {
  const r = filled(2, 4, [1, 2, 3, null, 5, 6, 7, 8]);
  r.moveTo(5, 1); // 5 (satır 2, slot 4) → satır 1 slot 1
  assert.equal(r.indexOf(5), 1);
  assert.equal(r.count, 7);
  assert.deepEqual(r.slots.slice(0, 4), [1, 5, 2, 3]);
  assert.equal(r.slots[4], null);
});

test('previewMove durumu değiştirmez; moveTo ile aynı sonucu verir', () => {
  const r = filled(2, 6, [1, 2, 3, 4, null, null]);
  const before = r.slots.slice();
  const pv = r.previewMove(4, 0);
  assert.deepEqual(r.slots, before);
  r.moveTo(4, 0);
  assert.deepEqual(r.slots, pv);
});

test('hiçbir taş kaybolmaz veya çoğalmaz (rastgele hamleler)', () => {
  const r = filled(3, 8, Array.from({ length: 20 }, (_, i) => i + 100));
  let seed = 7;
  const rnd = (n) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed % n);
  for (let i = 0; i < 2000; i++) {
    const tiles = r.tiles();
    const t = tiles[rnd(tiles.length)];
    r.moveTo(t, rnd(r.size));
    assert.equal(r.count, 20);
    assert.equal(new Set(r.tiles()).size, 20);
  }
});

test('yeni taş: düzenin sonundan sonraki ilk boş slot', () => {
  const r = filled(2, 6, [1, 2, null, 3, 4, null, null, null, null, null, null, null]);
  assert.equal(r.autoSlot(), 5);
  const r2 = filled(2, 4, [null, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(r2.autoSlot(), 0);
});

test('gruplar: boşluk ayraçtır, satır sonu da ayraçtır', () => {
  const r = filled(2, 5, [1, 2, null, 3, 4, 5, 6, null, 7, 8]);
  const g = r.groups();
  assert.deepEqual(g.map((x) => x.tiles), [[1, 2], [3, 4], [5, 6], [7, 8]]);
});

test('renge/sayıya/akıllı dizme: taşlar korunur, perler bitişik', () => {
  const ctx = makeCtx(T(0, 6)); // okey kırmızı 7
  const hand = [T(1, 5), T(1, 6), T(1, 7), T(2, 9), T(3, 9), T(0, 9), T(0, 2), T(3, 12), T(2, 3), T(0, 7, 0), 104];
  const r = new RackModel(2, 10);
  hand.forEach((t, i) => (r.slots[i * 2 > 19 ? 19 : i * 2] = t));
  const rules = { mode: 'okey' };
  for (const mode of ['color', 'number', 'smart']) {
    const arr = r.arrangement(mode, ctx, rules);
    assert.equal(arr.filter((x) => x !== null).length, hand.length, mode);
    assert.deepEqual(arr.filter((x) => x !== null).sort((a, b) => a - b), hand.slice().sort((a, b) => a - b));
  }
  const smart = r.arrangement('smart', ctx, rules);
  const m = filled(2, 10, smart);
  const groups = m.groups();
  // mavi 5-6-7 ve 9'lu grup ayrı bitişik gruplar olarak bulunmalı
  const has = (tiles) => groups.some((g) => tiles.every((t) => g.tiles.includes(t)));
  assert.ok(has([T(1, 5), T(1, 6), T(1, 7)]));
  assert.ok(has([T(2, 9), T(3, 9), T(0, 9)]));
});

test('reflow: sıra ve taş sayısı korunur', () => {
  const r = filled(2, 10, [1, 2, 3, null, 4, 5, null, null, null, null, 6, 7, 8, null, null, null, null, null, null, null]);
  r.reflow(3, 7);
  assert.equal(r.count, 8);
  assert.deepEqual(r.tiles(), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(r.size, 21);
});

test('diffSlots yalnızca yer değiştirenleri verir', () => {
  const m = diffSlots([1, 2, 3, null], [1, null, 3, 2]);
  assert.deepEqual([...m.entries()], [[2, 3]]);
});
