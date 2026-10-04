// Botun bilgi modeli — YALNIZCA herkese açık bilgiden (kendi eli + masa + atılanlar + yandan alınanlar).
// Rakibin elini asla kullanmaz. `view` (Game.view(seat)) zaten rakip ellerini içermez.

import { colorOf, valueOf, isFake, isOkey } from '../tiles.js';

const faceIdx = (c, v) => c * 14 + v;

export function tileFace(t, ctx) {
  if (isOkey(t, ctx)) return null;
  if (isFake(t)) return { c: ctx.oc, v: ctx.ov };
  return { c: colorOf(t), v: valueOf(t) };
}

// view → bilgi özeti. Durumsuz: her karar için yeniden hesaplanır (≤106 taş, ihmal edilebilir maliyet).
export function computeKnowledge(view) {
  const { ctx, seat } = view;
  const visible = new Int8Array(56); // benim gördüğüm kopyalar (elim + masa + atılanlar + gösterge)
  let jokersVisible = 0;
  const addTile = (t) => {
    if (isOkey(t, ctx)) {
      jokersVisible++;
      return;
    }
    const f = tileFace(t, ctx);
    visible[faceIdx(f.c, f.v)]++;
  };
  for (const t of view.hand) addTile(t);
  for (const d of view.discards) for (const t of d) addTile(t);
  for (const m of view.melds) for (const x of m.tiles) addTile(x.t);
  addTile(ctx.indicator);

  // Yandan alınan taşlar (rakibin elinde olduğu bilinen)
  const takes = [[], [], [], []];
  const discardedBy = view.discards;
  for (const ev of view.log) {
    if (ev.type === 'take') takes[ev.seat].push(ev.tile);
    else if (ev.type === 'return') {
      const i = takes[ev.seat].lastIndexOf(ev.tile);
      if (i >= 0) takes[ev.seat].splice(i, 1);
    }
  }
  const onTable = new Set();
  for (const d of view.discards) for (const t of d) onTable.add(t);
  for (const m of view.melds) for (const x of m.tiles) onTable.add(x.t);
  const held = [new Set(), new Set(), new Set(), new Set()];
  let heldJokers = 0;
  const heldFace = new Int8Array(56);
  for (let s = 0; s < 4; s++) {
    if (s === seat) continue;
    for (const t of takes[s]) {
      if (onTable.has(t)) continue;
      held[s].add(t);
      const f = tileFace(t, ctx);
      if (f) heldFace[faceIdx(f.c, f.v)]++;
      else heldJokers++;
    }
  }

  return {
    seat,
    ctx,
    visible,
    takes,
    held,
    discardedBy,
    // Bu yüzden hâlâ çekilebilecek (desteye veya gizli ellere dağılmış) kopya sayısı
    live(c, v) {
      if (v < 1 || v > 13) return 0;
      const k = faceIdx(c, v);
      return Math.max(0, 2 - visible[k] - heldFace[k]);
    },
    jokersLeft: Math.max(0, 2 - jokersVisible - heldJokers),
    unseenTotal: 106 - view.hand.length - view.discards.reduce((a, d) => a + d.length, 0) - view.melds.reduce((a, m) => a + m.tiles.length, 0) - 1,
  };
}

// Rakibin (opp) bu taşı (t) işine yarar bulma eğilimi, 0..1. Yalnızca gözlemlenen davranıştan çıkarım.
export function needScore(know, opp, t) {
  const f = tileFace(t, know.ctx);
  if (!f) return 1;
  let s = 0.25;
  for (const x of know.takes[opp]) {
    const fx = tileFace(x, know.ctx);
    if (!fx) continue;
    const dv = Math.abs(fx.v - f.v);
    if (fx.c === f.c && dv === 0) s += 0.5;
    else if (fx.c !== f.c && dv === 0) s += 0.9;
    else if (fx.c === f.c && dv === 1) s += 1.1;
    else if (fx.c === f.c && dv === 2) s += 0.55;
    else if (fx.c === f.c && ((fx.v === 13 && f.v === 1) || (fx.v === 1 && f.v === 13))) s += 0.5;
  }
  for (const x of know.discardedBy[opp]) {
    const fx = tileFace(x, know.ctx);
    if (!fx) continue;
    const dv = Math.abs(fx.v - f.v);
    if (fx.c === f.c && dv === 0) s -= 0.45;
    else if (fx.c === f.c && dv === 1) s -= 0.3;
    else if (fx.c !== f.c && dv === 0) s -= 0.25;
  }
  return Math.max(0, Math.min(1, s / 2.2));
}
