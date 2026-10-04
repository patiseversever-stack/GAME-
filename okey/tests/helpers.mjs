// Test yardımcıları: rastgele el üretimi ve bağımsız kaba-kuvvet oracle'lar.
import { createRng } from '../src/util/rng.js';
import { makeCtx, tileId, isFake, colorOf, valueOf } from '../src/game/tiles.js';
import { buildSet, buildRun, meldPoints } from '../src/game/melds.js';

export function randomCtx(rng) {
  // gösterge: sahte olmayan rastgele doğal taş
  return makeCtx(rng.int(104));
}

// n taşlık rastgele el (tekrarsız). dense: dar bir renk/değer aralığından seç (daha çok per çıkar).
export function randomHand(rng, n, { dense = false, ctx } = {}) {
  let pool = Array.from({ length: 106 }, (_, i) => i);
  if (dense) {
    const colors = new Set();
    while (colors.size < 2 + rng.int(2)) colors.add(rng.int(4));
    const lo = 1 + rng.int(6);
    const hi = lo + 4 + rng.int(4);
    pool = pool.filter((t) => isFake(t) || (colors.has(colorOf(t)) && valueOf(t) >= lo && valueOf(t) <= hi));
    if (pool.length < n) pool = Array.from({ length: 106 }, (_, i) => i);
  }
  return rng.shuffle(pool).slice(0, n);
}

// --- Bağımsız kaba-kuvvet oracle'lar (çözücüden bağımsız; yalnızca buildSet/buildRun kullanır) ---

function combos(arr, k, from = 0, cur = [], out = []) {
  if (cur.length === k) {
    out.push(cur.slice());
    return out;
  }
  for (let i = from; i < arr.length; i++) {
    cur.push(arr[i]);
    combos(arr, k, i + 1, cur, out);
    cur.pop();
  }
  return out;
}

function validMeldOf(ids, ctx, wrapHigh) {
  return buildSet(ids, ctx) || buildRun(ids, ctx, { wrapHigh });
}

// Tüm taşlar geçerli perlere (≥3) tam bölünüyor mu?
export function bruteExact(hand, ctx, wrapHigh) {
  const rec = (rest) => {
    if (!rest.length) return true;
    const first = rest[0];
    const others = rest.slice(1);
    for (const k of [2, 3, 4]) {
      if (others.length < k) break;
      for (const c of combos(others, k)) {
        const ids = [first, ...c];
        if (!validMeldOf(ids, ctx, wrapHigh)) continue;
        const set = new Set(ids);
        if (rec(rest.filter((t) => !set.has(t)))) return true;
      }
    }
    return false;
  };
  return rec(hand.slice());
}

// Seçilen perlerin en yüksek toplam puanı (atlama serbest). leaveOne: en az bir taş elde kalsın.
export function bruteMaxPoints(hand, ctx, wrapHigh, leaveOne = false) {
  let best = -1;
  const rec = (rest, pts, used) => {
    if (!rest.length) {
      if (leaveOne && used === hand.length) return;
      if (pts > best) best = pts;
      return;
    }
    const first = rest[0];
    const others = rest.slice(1);
    // atla
    rec(others, pts, used);
    for (const k of [2, 3, 4]) {
      if (others.length < k) break;
      for (const c of combos(others, k)) {
        const ids = [first, ...c];
        const s = buildSet(ids, ctx);
        const r = buildRun(ids, ctx, { wrapHigh, ordered: false });
        for (const m of [s, r]) {
          if (!m) continue;
          const set = new Set(ids);
          rec(rest.filter((t) => !set.has(t)), pts + meldPoints(m), used + ids.length);
        }
      }
    }
  };
  rec(hand.slice(), 0, 0);
  return best;
}

// Rastgele "neredeyse bitmiş" el: geçerli perlerden kurulur, sonra bozulur.
export function constructedHand(rng, ctx, total = 14) {
  const used = new Set();
  const ids = [];
  const pickTile = (c, v) => {
    for (const copy of [0, 1]) {
      const t = tileId(c, v, copy);
      if (!used.has(t)) {
        used.add(t);
        return t;
      }
    }
    return null;
  };
  let guard = 0;
  while (ids.length < total && guard++ < 200) {
    const left = total - ids.length;
    if (left < 3) break;
    const size = left === 4 || left === 5 ? left : 3 + rng.int(2);
    if (rng.chance(0.5)) {
      const v = 1 + rng.int(13);
      const cols = rng.shuffle([0, 1, 2, 3]).slice(0, Math.min(size, 4));
      const got = cols.map((c) => pickTile(c, v));
      if (got.includes(null)) continue;
      ids.push(...got);
    } else {
      const c = rng.int(4);
      const s = 1 + rng.int(13 - size + 1);
      const got = [];
      for (let p = s; p < s + size; p++) got.push(pickTile(c, p));
      if (got.includes(null)) continue;
      ids.push(...got);
    }
  }
  // birkaç taşı jokerle/sahteyle değiştir
  return ids;
}

export { createRng };
