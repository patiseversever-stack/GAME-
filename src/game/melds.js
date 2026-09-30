// Per (meld) kurma, doğrulama, genişletme.
//
// Meld yapısı (konumsal; okey temsili sabit):
//   set : { kind:'set',  value, tiles:[{t,c,v,j}] }            // renk sırasına göre
//   run : { kind:'run',  color, start, tiles:[{t,c,v,j}] }      // tiles[i] pozisyonu = start+i (14 → değer 1)
//   pair: { kind:'pair', tiles:[{t,c,v,j}, {t,c,v,j}] }
// j=true ise taş gerçek okeydir ve (c,v) onun temsil ettiği yüzdür.

import { colorOf, valueOf, isFake, isOkey } from './tiles.js';

export const MIN_MELD = 3;

const posValue = (p) => (p > 13 ? p - 13 : p);

// Taşları doğal (yüzü belli) ve joker (gerçek okey) olarak ayırır.
export function splitTiles(tileIds, ctx) {
  const naturals = [];
  const jokers = [];
  for (const t of tileIds) {
    if (isOkey(t, ctx)) jokers.push(t);
    else if (isFake(t)) naturals.push({ t, c: ctx.oc, v: ctx.ov });
    else naturals.push({ t, c: colorOf(t), v: valueOf(t) });
  }
  return { naturals, jokers };
}

const entry = (x) => ({ t: x.t, c: x.c, v: x.v, j: false });
const jokerEntry = (t, c, v) => ({ t, c, v, j: true });

export function meldPoints(m) {
  if (m.kind === 'set') return m.value * m.tiles.length;
  if (m.kind === 'pair') return m.tiles[0].v * 2;
  let s = 0;
  for (let i = 0; i < m.tiles.length; i++) s += m.start + i;
  return s;
}

export const meldTileIds = (m) => m.tiles.map((x) => x.t);

export function buildPair(tileIds, ctx) {
  if (tileIds.length !== 2) return null;
  const { naturals, jokers } = splitTiles(tileIds, ctx);
  if (naturals.length === 2) {
    const [a, b] = naturals;
    if (a.c !== b.c || a.v !== b.v) return null;
    return { kind: 'pair', tiles: [entry(a), entry(b)] };
  }
  if (naturals.length === 1) {
    const a = naturals[0];
    return { kind: 'pair', tiles: [entry(a), jokerEntry(jokers[0], a.c, a.v)] };
  }
  return {
    kind: 'pair',
    tiles: [jokerEntry(jokers[0], ctx.oc, ctx.ov), jokerEntry(jokers[1], ctx.oc, ctx.ov)],
  };
}

export function buildSet(tileIds, ctx) {
  const n = tileIds.length;
  if (n < MIN_MELD || n > 4) return null;
  const { naturals, jokers } = splitTiles(tileIds, ctx);
  if (!naturals.length) return null;
  const v = naturals[0].v;
  const used = new Set();
  for (const x of naturals) {
    if (x.v !== v || used.has(x.c)) return null;
    used.add(x.c);
  }
  const tiles = naturals.map(entry);
  let next = 0;
  for (const jt of jokers) {
    while (used.has(next)) next++;
    used.add(next);
    tiles.push(jokerEntry(jt, next, v));
  }
  tiles.sort((a, b) => a.c - b.c);
  return { kind: 'set', value: v, tiles };
}

// Sıra-duyarlı seri: verilen dizi pozisyon sırasıdır (okey bulunduğu yerin değerini temsil eder).
// Geçerli bir yorum yoksa null (çağıran en yüksek puanlı yoruma düşer).
function buildRunOrdered(tileIds, ctx, wrapHigh) {
  const n = tileIds.length;
  const items = tileIds.map((t) => (isOkey(t, ctx) ? { t, j: true } : isFake(t) ? { t, j: false, c: ctx.oc, v: ctx.ov } : { t, j: false, c: colorOf(t), v: valueOf(t) }));
  const first = items.findIndex((x) => !x.j);
  if (first < 0) return null;
  const color = items[first].c;
  if (items.some((x) => !x.j && x.c !== color)) return null;
  const v0 = items[first].v;
  const starts = [v0 - first];
  if (wrapHigh && v0 === 1) starts.push(14 - first);
  for (const s of starts) {
    if (s < 1) continue;
    const e = s + n - 1;
    if (e > (wrapHigh ? 14 : 13) || (e === 14 && s < 2)) continue;
    if (!items.every((x, i) => x.j || x.v === posValue(s + i))) continue;
    const tiles = items.map((x, i) => (x.j ? jokerEntry(x.t, color, posValue(s + i)) : { t: x.t, c: x.c, v: x.v, j: false }));
    return { kind: 'run', color, start: s, tiles };
  }
  return null;
}

// Seri kurar. opts.wrapHigh: 12-13-1 geçerli mi. opts.prefer: 'points' (varsayılan) | 'low'.
// opts.ordered: verilen sıra pozisyon sırası sayılır (önce denenir; olmazsa en yüksek puanlı yorum).
export function buildRun(tileIds, ctx, opts = {}) {
  const n = tileIds.length;
  if (n < MIN_MELD || n > 13) return null;
  if (opts.ordered) {
    const o = buildRunOrdered(tileIds, ctx, !!opts.wrapHigh);
    if (o) return o;
  }
  const { naturals, jokers } = splitTiles(tileIds, ctx);
  if (!naturals.length) return null;
  const color = naturals[0].c;
  const seen = new Set();
  for (const x of naturals) {
    if (x.c !== color || seen.has(x.v)) return null;
    seen.add(x.v);
  }
  const maxEnd = opts.wrapHigh ? 14 : 13;
  let best = null;
  for (let s = 1; s + n - 1 <= maxEnd; s++) {
    const e = s + n - 1;
    if (e === 14 && s < 2) continue;
    const at = new Map();
    let ok = true;
    for (const x of naturals) {
      const p = x.v === 1 && e === 14 ? 14 : x.v;
      if (p < s || p > e || at.has(p)) {
        ok = false;
        break;
      }
      at.set(p, x);
    }
    if (!ok) continue;
    let pts = 0;
    for (let p = s; p <= e; p++) pts += p;
    const better = !best || (opts.prefer === 'low' ? s < best.s : pts > best.pts);
    if (better) best = { s, e, at, pts };
  }
  if (!best) return null;
  const tiles = [];
  let ji = 0;
  for (let p = best.s; p <= best.e; p++) {
    const x = best.at.get(p);
    tiles.push(x ? entry(x) : jokerEntry(jokers[ji++], color, posValue(p)));
  }
  return { kind: 'run', color, start: best.s, tiles };
}

// Verilen türde kurmayı dener; tür belirtilmezse uygun olanı (en yüksek puan) seçer.
export function buildMeld(kind, tileIds, ctx, opts = {}) {
  if (kind === 'pair') return buildPair(tileIds, ctx);
  if (kind === 'set') return buildSet(tileIds, ctx);
  if (kind === 'run') return buildRun(tileIds, ctx, opts);
  return null;
}

export function classify(tileIds, ctx, opts = {}) {
  if (tileIds.length === 2) return buildPair(tileIds, ctx);
  const s = buildSet(tileIds, ctx);
  const r = buildRun(tileIds, ctx, opts);
  if (s && r) return meldPoints(s) >= meldPoints(r) ? s : r;
  return s || r;
}

// Geçersizlik nedeni (kullanıcıya gösterilecek kısa Türkçe açıklama).
export function explainInvalid(kind, tileIds, ctx, opts = {}) {
  const n = tileIds.length;
  const { naturals } = splitTiles(tileIds, ctx);
  if (kind === 'pair') return n !== 2 ? 'Çift iki taştan oluşmalı.' : 'Çift aynı renk ve sayıdaki iki taş olmalı.';
  if (n < MIN_MELD) return 'Per en az üç taştan oluşmalı.';
  if (kind === 'set') {
    if (n > 4) return 'Aynı sayılı perde en çok dört taş olur.';
    return 'Grup: aynı sayı, farklı renkler olmalı.';
  }
  if (kind === 'run') {
    if (n > 13) return 'Seri en çok 13 taş olabilir.';
    const colors = new Set(naturals.map((x) => x.c));
    if (colors.size > 1) return 'Seri aynı renkten olmalı.';
    return 'Seri ardışık sayılardan oluşmalı.';
  }
  return 'Geçersiz per.';
}

// --- Genişletme (işleme) -------------------------------------------------------------------

function runEndPos(m) {
  return m.start + m.tiles.length - 1;
}

// Seriyi uca bir taş ekleyerek genişletir. end: 'low' | 'high' | 'auto'
export function extendMeld(meld, t, ctx, opts = {}) {
  if (meld.kind === 'pair') return { ok: false, reason: 'Çift genişletilemez.' };
  const joker = isOkey(t, ctx);
  const face = joker ? null : isFake(t) ? { c: ctx.oc, v: ctx.ov } : { c: colorOf(t), v: valueOf(t) };

  if (meld.kind === 'set') {
    if (meld.tiles.length >= 4) return { ok: false, reason: 'Bu per dolu.' };
    const used = new Set(meld.tiles.map((x) => x.c));
    let tile;
    if (joker) {
      let c = 0;
      while (used.has(c)) c++;
      tile = jokerEntry(t, c, meld.value);
    } else {
      if (face.v !== meld.value) return { ok: false, reason: 'Taşın sayısı perle uyuşmuyor.' };
      if (used.has(face.c)) return { ok: false, reason: 'Bu renk perde zaten var.' };
      tile = { t, c: face.c, v: face.v, j: false };
    }
    const tiles = [...meld.tiles, tile].sort((a, b) => a.c - b.c);
    return { ok: true, meld: { ...meld, tiles }, end: 'high' };
  }

  // run
  const len = meld.tiles.length;
  if (len >= 13) return { ok: false, reason: 'Seri dolu.' };
  const lowPos = meld.start - 1;
  const highPos = meld.start + len;
  const maxPos = opts.wrapHigh ? 14 : 13;
  const lowOk = lowPos >= 1 && (joker || (face.c === meld.color && face.v === lowPos));
  const highOk =
    highPos <= maxPos &&
    (joker || (face.c === meld.color && face.v === posValue(highPos))) &&
    // 14. konum (yüksek 1) yalnızca en az iki taşlı, 1'de başlamayan seride
    (highPos !== 14 || meld.start >= 2);
  let end = opts.end && opts.end !== 'auto' ? opts.end : null;
  if (end === 'low' && !lowOk) end = null;
  if (end === 'high' && !highOk) end = null;
  if (!end) {
    if (lowOk && highOk) end = joker ? 'high' : 'high';
    else if (highOk) end = 'high';
    else if (lowOk) end = 'low';
  }
  if (!end) {
    if (!joker && face.c !== meld.color) return { ok: false, reason: 'Seri farklı renkte.' };
    return { ok: false, reason: 'Taş serinin ucuna eklenemiyor.' };
  }
  if (end === 'low') {
    const tile = joker ? jokerEntry(t, meld.color, lowPos) : { t, c: face.c, v: face.v, j: false };
    return { ok: true, meld: { ...meld, start: lowPos, tiles: [tile, ...meld.tiles] }, end };
  }
  const tile = joker ? jokerEntry(t, meld.color, posValue(highPos)) : { t, c: face.c, v: face.v, j: false };
  return { ok: true, meld: { ...meld, tiles: [...meld.tiles, tile] }, end };
}

export function canExtend(meld, t, ctx, opts = {}) {
  return extendMeld(meld, t, ctx, opts).ok;
}

// Hangi uçlara eklenebilir? ['low'|'high'] (arayüzde hedef göstermek için)
export function extendEnds(meld, t, ctx, opts = {}) {
  if (meld.kind === 'pair') return [];
  if (meld.kind === 'set') return canExtend(meld, t, ctx, opts) ? ['high'] : [];
  const ends = [];
  if (extendMeld(meld, t, ctx, { ...opts, end: 'low' }).ok && extendMeld(meld, t, ctx, { ...opts, end: 'low' }).end === 'low') ends.push('low');
  const hi = extendMeld(meld, t, ctx, { ...opts, end: 'high' });
  if (hi.ok && hi.end === 'high') ends.push('high');
  return ends;
}

// Masadaki okeyi, temsil ettiği gerçek taşla değiştirir (okey geri alma).
export function reclaimJoker(meld, jokerT, replacementT, ctx) {
  const idx = meld.tiles.findIndex((x) => x.t === jokerT && x.j);
  if (idx < 0) return { ok: false, reason: 'Yerde gerçek okey bulunamadı.' };
  if (isOkey(replacementT, ctx)) return { ok: false, reason: 'Okey okeyin yerine konamaz.' };
  const face = isFake(replacementT)
    ? { c: ctx.oc, v: ctx.ov }
    : { c: colorOf(replacementT), v: valueOf(replacementT) };
  const slot = meld.tiles[idx];
  if (slot.c !== face.c || slot.v !== face.v) return { ok: false, reason: 'Yerine konan taş okeyin temsil ettiği taş değil.' };
  const tiles = meld.tiles.slice();
  tiles[idx] = { t: replacementT, c: face.c, v: face.v, j: false };
  return { ok: true, meld: { ...meld, tiles } };
}

// Kayıt doğrulaması / test için yapısal denetim.
export function checkMeldStructure(m, ctx, opts = {}) {
  if (!m || !Array.isArray(m.tiles)) return false;
  const n = m.tiles.length;
  for (const x of m.tiles) {
    if (!Number.isInteger(x.t) || x.t < 0 || x.t > 105) return false;
    const joker = isOkey(x.t, ctx);
    if (!!x.j !== joker) return false;
    if (!joker) {
      const f = isFake(x.t) ? { c: ctx.oc, v: ctx.ov } : { c: colorOf(x.t), v: valueOf(x.t) };
      if (x.c !== f.c || x.v !== f.v) return false;
    }
  }
  if (new Set(m.tiles.map((x) => x.t)).size !== n) return false;
  if (m.kind === 'pair') {
    return n === 2 && m.tiles[0].c === m.tiles[1].c && m.tiles[0].v === m.tiles[1].v;
  }
  if (m.kind === 'set') {
    if (n < 3 || n > 4) return false;
    if (new Set(m.tiles.map((x) => x.c)).size !== n) return false;
    return m.tiles.every((x) => x.v === m.value);
  }
  if (m.kind === 'run') {
    if (n < 3 || n > 13) return false;
    const end = runEndPos(m);
    if (m.start < 1 || end > (opts.wrapHigh ? 14 : 13)) return false;
    if (end === 14 && m.start < 2) return false;
    return m.tiles.every((x, i) => x.c === m.color && x.v === posValue(m.start + i));
  }
  return false;
}
