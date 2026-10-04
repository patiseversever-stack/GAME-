import test from 'node:test';
import assert from 'node:assert/strict';
import { packMelds, hitMeld } from '../src/ui/meld-layout.js';

const mk = (id, owner, n) => ({ id: 'm' + id, owner, kind: 'run', tiles: Array.from({ length: n }, (_, i) => ({ t: id * 20 + i })) });

function check(packed, area) {
  for (const it of packed.items) {
    assert.ok(it.rect.x >= area.x - 0.5 && it.rect.x + it.rect.w <= area.x + area.w + 0.5, `yatay taşma ${JSON.stringify(it.rect)} alan ${JSON.stringify(area)}`);
    assert.ok(it.rect.y >= area.y - 0.5 && it.rect.y + it.rect.h + it.tag.h <= area.y + area.h + 1, `dikey taşma ${JSON.stringify(it.rect)} alan ${JSON.stringify(area)}`);
  }
  // per çakışması yok
  for (let i = 0; i < packed.items.length; i++)
    for (let j = i + 1; j < packed.items.length; j++) {
      const a = packed.items[i].rect;
      const b = packed.items[j].rect;
      const ov = a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
      assert.ok(!ov, `perler çakışıyor ${i} ${j}`);
    }
}

test('az per: büyük taş; hepsi alana sığar', () => {
  const area = { x: 20, y: 100, w: 300, h: 200 };
  const melds = [mk(1, 0, 3), mk(2, 1, 4), mk(3, 2, 3)];
  const p = packMelds(melds, area, { maxTw: 40 });
  check(p, area);
  assert.ok(p.tw >= 28, 'az perde taş büyük kalmalı: ' + p.tw);
});

test('çok per: taş küçülür ama hepsi sığar ve çakışmaz', () => {
  const area = { x: 10, y: 80, w: 300, h: 150 };
  const melds = [];
  for (let i = 1; i <= 14; i++) melds.push(mk(i, i % 4, 3 + (i % 3)));
  const p = packMelds(melds, area, { maxTw: 40 });
  check(p, area);
  assert.ok(p.tw < 28 && p.tw >= 11, 'tw=' + p.tw);
});

test('sahip sırası: üstteki rakip önce, ben en sonda', () => {
  const area = { x: 0, y: 0, w: 400, h: 300 };
  const melds = [mk(1, 0, 3), mk(2, 1, 3), mk(3, 2, 3), mk(4, 3, 3)];
  const p = packMelds(melds, area);
  assert.deepEqual(p.items.map((i) => i.owner), [2, 3, 1, 0]);
});

test('hitMeld: noktayı perin ucuna eşler', () => {
  const area = { x: 0, y: 0, w: 400, h: 200 };
  const p = packMelds([mk(1, 0, 4)], area);
  const it = p.items[0];
  const left = hitMeld(p, it.rect.x + 2, it.rect.y + it.rect.h / 2);
  const right = hitMeld(p, it.rect.x + it.rect.w - 2, it.rect.y + it.rect.h / 2);
  assert.equal(left.end, 'low');
  assert.equal(right.end, 'high');
  assert.equal(hitMeld(p, 9999, 9999), null);
});
