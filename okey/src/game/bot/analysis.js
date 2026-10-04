// El analizi — tamamlanmış perler (çözücü) + kısmi perler (canlı çıkışlara göre ağırlıklı) + çift planı.
// Botun taş atma / yandan alma kararlarının temel değerlendiricisi.

import { findBest } from '../solver.js';
import { isOkey } from '../tiles.js';
import { tileFace } from './knowledge.js';

// --- Kısmi per (2 taş) ağırlığı ---------------------------------------------------------------
function pairWeight(a, b, know, wrap, pairsPlan) {
  if (a.c === b.c) {
    const lo = Math.min(a.v, b.v);
    const hi = Math.max(a.v, b.v);
    const d = hi - lo;
    if (d === 0) return pairsPlan ? 14 : 5;
    if (d === 1) {
      let outs = 0;
      if (lo - 1 >= 1) outs += know.live(a.c, lo - 1);
      if (hi + 1 <= 13) outs += know.live(a.c, hi + 1);
      else if (wrap && hi === 13) outs += know.live(a.c, 1);
      return outs > 0 ? 17 + 5 * Math.min(outs, 4) : 3;
    }
    if (d === 2) {
      const outs = know.live(a.c, lo + 1);
      return outs > 0 ? 11 + 4 * Math.min(outs, 2) : 2;
    }
    if (wrap && lo === 1 && hi === 13) {
      const outs = know.live(a.c, 12);
      return outs > 0 ? 11 + 4 * Math.min(outs, 2) : 2;
    }
    if (wrap && lo === 1 && hi === 12) {
      const outs = know.live(a.c, 13);
      return outs > 0 ? 11 + 4 * Math.min(outs, 2) : 2;
    }
    return 0;
  }
  if (a.v === b.v) {
    let outs = 0;
    for (let c = 0; c < 4; c++) if (c !== a.c && c !== b.c) outs += know.live(c, a.v);
    return outs > 0 ? 15 + 4 * Math.min(outs, 4) : 3;
  }
  return 0;
}

// Yalnız başına kalan taşın potansiyeli: orta sayılar ve çevresinde canlı taş bulunanlar daha değerli.
function isoValue(f, know, wrap) {
  const center = 6 - Math.abs(f.v - 7);
  let nb = 0;
  for (const dv of [-2, -1, 1, 2]) {
    let v = f.v + dv;
    if (wrap && v === 14) v = 1;
    if (v >= 1 && v <= 13) nb += know.live(f.c, v) * (Math.abs(dv) === 1 ? 1 : 0.6);
  }
  for (let c = 0; c < 4; c++) if (c !== f.c) nb += know.live(c, f.v) * 0.7;
  return 0.25 * center + 0.12 * nb;
}

// Kalan taşlar arasında en yüksek ağırlıklı eşleştirme (bitmask DP; ≤ ~12 taş).
function bestMatching(items, wfn) {
  const n = Math.min(items.length, 12);
  const w = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) w[i][j] = wfn(items[i], items[j]);
  const full = (1 << n) - 1;
  const dp = new Float64Array(1 << n).fill(-1);
  const choice = new Int8Array(1 << n).fill(-1);
  const go = (mask) => {
    if (mask === full) return 0;
    if (dp[mask] >= 0) return dp[mask];
    let i = 0;
    while (mask & (1 << i)) i++;
    let best = go(mask | (1 << i)); // tek kalsın
    let ch = -1;
    for (let j = i + 1; j < n; j++) {
      if (mask & (1 << j) || w[i][j] <= 0) continue;
      const v = w[i][j] + go(mask | (1 << i) | (1 << j));
      if (v > best) {
        best = v;
        ch = j;
      }
    }
    dp[mask] = best;
    choice[mask] = ch;
    return best;
  };
  const total = go(0);
  const matched = new Set();
  let mask = 0;
  while (mask !== full) {
    let i = 0;
    while (mask & (1 << i)) i++;
    const ch = choice[mask];
    if (ch >= 0) {
      matched.add(i);
      matched.add(ch);
      mask |= (1 << i) | (1 << ch);
    } else mask |= 1 << i;
  }
  return { total, matched, n };
}

// --- Klasik Okey: 14 taşlık elin ilerleme puanı (yüksek = bitişe yakın) -----------------------
export function evalClassic(tiles, ctx, know, { wrapHigh = true, pairsPlan = true } = {}) {
  const res = findBest(tiles, ctx, { wrapHigh, objective: 'tiles' });
  const used = new Set();
  if (res) for (const g of res.groups) for (const x of g.tiles) used.add(x.t);
  const left = tiles.filter((t) => !used.has(t));
  let jokersLeft = 0;
  const nat = [];
  for (const t of left) {
    if (isOkey(t, ctx)) jokersLeft++;
    else nat.push(tileFace(t, ctx));
  }
  const m = bestMatching(nat, (a, b) => pairWeight(a, b, know, wrapHigh, false));
  let partial = m.total;
  let iso = 0;
  for (let i = 0; i < nat.length; i++) if (i >= m.n || !m.matched.has(i)) iso += isoValue(nat[i], know, wrapHigh);
  const setsPlan = 100 * used.size + partial + iso + 55 * jokersLeft;
  if (!pairsPlan) return setsPlan;
  return Math.max(setsPlan, evalPairsPlan(tiles, ctx, know));
}

// 7 çift planı: özdeş çiftleri say; joker tekleri eşler.
export function evalPairsPlan(tiles, ctx, know) {
  const cnt = new Map();
  let J = 0;
  for (const t of tiles) {
    if (isOkey(t, ctx)) {
      J++;
      continue;
    }
    const f = tileFace(t, ctx);
    const k = f.c * 14 + f.v;
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  let pairs = 0;
  let singles = 0;
  let singleBonus = 0;
  for (const [k, n] of cnt) {
    pairs += n >> 1;
    if (n & 1) {
      singles++;
      const c = (k / 14) | 0;
      const v = k % 14;
      singleBonus += 3 * Math.min(2, know.live(c, v));
    }
  }
  const paired = Math.min(singles, J);
  const total = pairs + paired + ((J - paired) >> 1);
  if (total < 4) return -1; // çift planı henüz anlamlı değil
  return 100 * 2 * total + singleBonus * 0.6;
}

// --- 101: potansiyel (açılış için) — puan tabanlı ----------------------------------------------
export function evalOpenPotential(tiles, ctx, know, { wrapHigh = false } = {}) {
  const res = findBest(tiles, ctx, { wrapHigh, objective: 'points' });
  const used = new Set();
  let pts = 0;
  if (res) {
    pts = res.points;
    for (const g of res.groups) for (const x of g.tiles) used.add(x.t);
  }
  const left = tiles.filter((t) => !used.has(t));
  let jokersLeft = 0;
  const nat = [];
  for (const t of left) {
    if (isOkey(t, ctx)) jokersLeft++;
    else nat.push(tileFace(t, ctx));
  }
  const m = bestMatching(nat, (a, b) => {
    const w = pairWeight(a, b, know, wrapHigh, false);
    return w > 0 ? 0.35 * (a.v + b.v) * Math.min(1, 0.25 + w / 40) : 0;
  });
  let iso = 0;
  for (let i = 0; i < nat.length; i++) if (i >= m.n || !m.matched.has(i)) iso += isoValue(nat[i], know, wrapHigh) * 0.6;
  return pts + m.total + iso + 14 * jokersLeft;
}

export function faceList(tiles, ctx) {
  return tiles.map((t) => tileFace(t, ctx));
}
