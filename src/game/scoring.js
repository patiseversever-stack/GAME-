// Puanlama — klasik Okey ve 101.
//
// Klasik: herkes başlangıç puanıyla (20 / kısa maçta 10) başlar; eli bitiren, rakiplerinin puanını düşürür:
//   normal −2, okeyle/çiftle −4, çiftle+okeyle −8 (tek renk bitişte ×2, ayar). Puanı ≤ 0 olan maçı kaybeder.
// 101: ceza puanı; en az ceza kazanır. Eli bitiren −101×çarpan; açmayan 202×çarpan; açan, elinde kalan taşların
//   toplamı (çift açan ×2) × çarpan (+ elde kalan her okey için +101).

import { tilePenaltyValue, isOkey } from './tiles.js';

export const FINISH_LABEL = {
  normal: 'Normal bitiş',
  okey: 'Okey atarak bitiş',
  pairs: 'Çiftten bitiş',
  pairsOkey: 'Çiftten okeyle bitiş',
  kafa: 'Kafadan (elden) bitiş',
  kafaOkey: 'Okey kafa',
};

export const handValue = (hand, ctx) => hand.reduce((a, t) => a + tilePenaltyValue(t, ctx), 0);

export function finishMultiplier101(finish) {
  if (finish === 'pairsOkey' || finish === 'kafaOkey') return 4;
  if (finish === 'okey' || finish === 'pairs' || finish === 'kafa') return 2;
  return 1;
}

// Klasik: { deltas } — eli bitirenin rakiplerinden düşülecek puan (negatif delta).
export function settleClassic({ winner, finish, colorFinish }) {
  const deltas = [0, 0, 0, 0];
  if (winner === null) return deltas;
  const base = finish === 'pairsOkey' ? 8 : finish === 'okey' || finish === 'pairs' ? 4 : 2;
  const mult = colorFinish ? 2 : 1;
  for (let s = 0; s < 4; s++) if (s !== winner) deltas[s] -= base * mult;
  return deltas;
}

// 101: { deltas, breakdown } — deltas = bu elde yazılacak ceza puanı (pozitif kötü).
export function settle101({ rules, ctx, hands, opened, roundPenalties, winner, reason, finish }) {
  let m = roundPenalties.slice();
  const breakdown = [0, 0, 0, 0].map(() => ({ hand: 0, okey: 0, unopened: 0 }));
  if (reason === 'allPairs') {
    if (rules.allPairsSettlement === 'none') m = [0, 0, 0, 0];
    return { deltas: m, breakdown, multiplier: 1 };
  }
  if (reason === 'stock' && rules.stockSettlement === 'jokerOnly') {
    for (let s = 0; s < 4; s++) {
      const n = hands[s].filter((t) => isOkey(t, ctx)).length;
      m[s] += n * 101;
      breakdown[s].okey = n * 101;
    }
    return { deltas: m, breakdown, multiplier: 1 };
  }
  const C = finishMultiplier101(finish);
  if (winner !== null) m[winner] -= finish === 'kafaOkey' ? rules.kafaOkeyAward : 101 * C;
  for (let s = 0; s < 4; s++) {
    if (s === winner) continue;
    if (opened[s] === 'none') {
      m[s] += 202 * C;
      breakdown[s].unopened = 202 * C;
    } else {
      const hv = handValue(hands[s], ctx) * (opened[s] === 'pairs' ? 2 : 1) * C;
      const ok = hands[s].filter((t) => isOkey(t, ctx)).length * 101;
      m[s] += hv + ok;
      breakdown[s].hand = hv;
      breakdown[s].okey = ok;
    }
  }
  return { deltas: m, breakdown, multiplier: C };
}
