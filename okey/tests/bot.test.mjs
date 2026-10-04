import test from 'node:test';
import assert from 'node:assert/strict';
import { playMatch } from '../src/game/sim.js';
import { Game, checkInvariants } from '../src/game/game.js';
import { Bot } from '../src/game/bot/bot.js';
import { computeKnowledge } from '../src/game/bot/knowledge.js';

test('botlar klasik Okey maçını hatasız bitirir (tüm zorluklar)', () => {
  for (const diffs of [
    ['normal', 'normal', 'normal', 'normal'],
    ['casual', 'normal', 'expert', 'casual'],
    ['expert', 'expert', 'expert', 'expert'],
  ]) {
    for (let i = 0; i < 4; i++) {
      const st = playMatch({ mode: 'okey', matchType: 'single' }, 1000 + i * 37, diffs, { checkInvariants: true, maxSteps: 2500 });
      assert.equal(st.rejected, 0, JSON.stringify(st.rejections.slice(0, 3)));
      assert.equal(st.status, 'matchOver', 'maç bitmeli: ' + JSON.stringify(st));
    }
  }
});

test('botlar 101 maçını hatasız bitirir (tek el ve çok el)', () => {
  for (const diffs of [
    ['normal', 'normal', 'normal', 'normal'],
    ['casual', 'normal', 'expert', 'casual'],
  ]) {
    for (let i = 0; i < 4; i++) {
      const st = playMatch({ mode: 'okey101', rounds: 3 }, 77 + i * 53, diffs, { checkInvariants: true, maxSteps: 6000 });
      assert.equal(st.rejected, 0, JSON.stringify(st.rejections.slice(0, 3)));
      assert.equal(st.status, 'matchOver');
    }
  }
});

test('bot yalnızca kendi eli + herkese açık bilgiyi görür (view rakip elini içermez)', () => {
  const g = Game.create({ mode: 'okey101' }, 5);
  const v = g.view(0);
  assert.equal(v.hand.length, g.state.hands[0].length);
  assert.ok(!('hands' in v), 'view içinde hands olmamalı');
  assert.equal(v.handCounts.length, 4);
  // rakibin stoktan çektiği taş log'da gizlenir
  const seat = g.state.turn.seat;
  const d = g.state.hands[seat][0];
  g.apply(seat, { type: 'DISCARD', tile: d });
  const nxt = g.state.turn.seat;
  g.apply(nxt, { type: 'DRAW_STOCK' });
  const vOther = g.view((nxt + 1) % 4);
  const drawEv = vOther.log.filter((e) => e.type === 'draw' && e.seat === nxt).at(-1);
  assert.equal(drawEv.tile, undefined);
});

test('bilgi modeli: görünür/canlı taş sayımı tutarlı', () => {
  const g = Game.create({ mode: 'okey' }, 123);
  const view = g.view(g.state.turn.seat);
  const k = computeKnowledge(view);
  let total = 0;
  for (let c = 0; c < 4; c++) for (let v = 1; v <= 13; v++) total += k.live(c, v);
  // canlı kopya ≤ toplam doğal+sahte yüz kopyası; elimdekiler ve gösterge düşülmüş olmalı
  assert.ok(total > 0 && total <= 104 + 2 - view.hand.length);
});

test('zorluk ayrımı: EXPERT, CASUAL karşısında belirgin biçimde üstün (klasik)', { timeout: 240000 }, () => {
  // 2 uzman + 2 kolay; koltuklar dönüşümlü. Uzmanların toplam kazanma oranı %50'nin üstünde olmalı.
  let exp = 0;
  let cas = 0;
  for (let i = 0; i < 40; i++) {
    const layout = i % 2 === 0 ? ['expert', 'casual', 'expert', 'casual'] : ['casual', 'expert', 'casual', 'expert'];
    const st = playMatch({ mode: 'okey', matchType: 'single' }, 4000 + i * 13, layout, { maxSteps: 2500 });
    const w = st.winners[st.winners.length - 1];
    if (w === null || w === undefined) continue;
    if (layout[w] === 'expert') exp++;
    else cas++;
  }
  console.log(`klasik 2 uzman vs 2 kolay → uzman kazanan: ${exp}, kolay kazanan: ${cas}`);
  assert.ok(exp > cas, `Uzmanlar daha çok kazanmalı (${exp} vs ${cas})`);
});
