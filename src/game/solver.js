// Per çözücüsü — sayım matrisi üzerinde memo'lu DFS.
//
// El, yüz bazında sayıma (cnt[renk*14+değer] ∈ 0..2) ve joker sayısına (gerçek okey) indirgenir.
// "Kanonik ilk taş" kuralı: renk-majör, değer artan sırada ilk kalan taş mutlaka bir perin parçasıdır.
// Böylece kombinasyon patlaması olmaz; her durum tek bir yoldan ziyaret edilir.
//
// Dışa açılan işlevler:
//   partitionAll  — tüm taşlar per(ler)e tam bölünüyor mu? (klasik bitiş)
//   findPairsFinish — 7 çift ile bitiş
//   findBest      — elden en iyi per seçimi (101 açılış, ıstaka önerisi, bot analizi)
//   findBestPairs — en çok çift (çift açma)

import { colorOf, valueOf, isFake, isOkey } from './tiles.js';
import { buildPair } from './melds.js';

const CELLS = 56; // 4 renk × 14
const NEG = -1e9;
const POW3 = (() => {
  const a = [];
  let p = 1;
  for (let i = 0; i < 26; i++) {
    a.push(p);
    p *= 3;
  }
  return a;
})();
// hücre (c*14+v, v=1..13) → 0..51 sıra numarası
const ORD = (() => {
  const a = new Int16Array(CELLS).fill(-1);
  for (let c = 0; c < 4; c++) for (let v = 1; v <= 13; v++) a[c * 14 + v] = c * 13 + (v - 1);
  return a;
})();

export function buildModel(hand, ctx) {
  const cnt = new Int8Array(CELLS);
  const pools = new Array(CELLS);
  const jokers = [];
  for (const t of hand) {
    if (isOkey(t, ctx)) {
      jokers.push(t);
      continue;
    }
    const c = isFake(t) ? ctx.oc : colorOf(t);
    const v = isFake(t) ? ctx.ov : valueOf(t);
    const k = c * 14 + v;
    cnt[k]++;
    (pools[k] || (pools[k] = [])).push(t);
  }
  for (let k = 0; k < CELLS; k++) if (pools[k]) pools[k].sort((a, b) => a - b); // sahte okey (≥104) sona
  return { cnt, pools, jokers, J: jokers.length, n: hand.length };
}

// Arama çekirdeği. Seçenekler:
//   exact      : tüm taşlar kullanılmalı (atlama yok, J bitmeli)
//   objective  : 'points' | 'tiles'
//   leaveOne   : en az bir taş eldeki kalmalı (atılacak son taş)
//   must       : zorunlu kullanılacak taş (yandan alınan) — kullanılan perlerde bulunmalı
//   wrapHigh   : 12-13-1 geçerli
//   budget     : düğüm sınırı
function runSearch(model, ctx, opts = {}) {
  const exact = !!opts.exact;
  const wrap = !!opts.wrapHigh;
  const byTiles = opts.objective === 'tiles';
  const leaveOne = !!opts.leaveOne;
  const noSets = !!opts.noSets;
  const budget = opts.budget || 250000;
  const cnt = model.cnt.slice();
  let J = model.J;

  let mustK = -1;
  if (opts.must !== undefined && opts.must !== null) {
    const t = opts.must;
    if (!isOkey(t, ctx)) {
      const c = isFake(t) ? ctx.oc : colorOf(t);
      const v = isFake(t) ? ctx.ov : valueOf(t);
      mustK = c * 14 + v;
    } else {
      mustK = -2; // joker zorunlu: en az bir joker kullanılmalı
    }
  }

  let lo = 0;
  let hi = 0;
  for (let k = 0; k < CELLS; k++) {
    const o = ORD[k];
    if (o < 0 || !cnt[k]) continue;
    if (o < 26) lo += cnt[k] * POW3[o];
    else hi += cnt[k] * POW3[o - 26];
  }

  const memo = new Map(); // hi → Map(key → value)
  const choice = new Map(); // hi → Map(key → choice)
  let nodes = 0;
  let truncated = false;

  const adj = (k, d) => {
    const o = ORD[k];
    if (o < 26) lo += d * POW3[o];
    else hi += d * POW3[o - 26];
  };
  const dec = (k) => {
    cnt[k]--;
    adj(k, -1);
  };
  const inc = (k) => {
    cnt[k]++;
    adj(k, 1);
  };

  const value = (pts, len) => (byTiles ? len * 1000 + pts : pts);

  // state: from (tarama başlangıcı), skipped(0/1), sat(0/1)
  function solve(from, skipped, sat) {
    let k = from;
    while (k < CELLS && !(cnt[k] > 0)) k++;
    if (k >= CELLS) {
      if (exact) return J === 0 ? 0 : NEG;
      if (leaveOne && !skipped && J === 0) return NEG;
      if (mustK === -2 && !sat) return NEG;
      if (mustK >= 0 && !sat) return NEG;
      return 0;
    }
    const key = lo * 16 + J * 4 + skipped * 2 + sat;
    let m = memo.get(hi);
    if (m) {
      const got = m.get(key);
      if (got !== undefined) return got;
    } else {
      m = new Map();
      memo.set(hi, m);
    }
    if (++nodes > budget) {
      truncated = true;
      return NEG;
    }
    let best = NEG;
    let bestChoice = null;
    const c = (k / 14) | 0;
    const v = k % 14;

    // 1) Atla (elde bırak)
    if (!exact) {
      const mustBroken = mustK === k && cnt[k] === 1 && !sat;
      if (!mustBroken) {
        dec(k);
        const r = solve(k, 1, sat);
        inc(k);
        if (r > best) {
          best = r;
          bestChoice = { type: 0 };
        }
      }
    }

    // 2) Seri — kanonik taş v konumunda (alt uçtaki eksik değerler jokerle)
    for (let s = Math.max(1, v - J); s <= v; s++) {
      let need = v - s;
      if (need > J) continue;
      // v konumundaki kanonik taşı tüket
      dec(k);
      const taken = [k];
      let pts = 0;
      for (let p = s; p < v; p++) pts += p;
      pts += v;
      let ok = true;
      let usedJ = need;
      let e = v;
      // e = v ... 13 için dene
      for (;;) {
        const len = e - s + 1;
        if (len >= 3) {
          // J'yi düş, alt ara çözüm
          const oldJ = J;
          J -= usedJ;
          const nsat = sat || (mustK >= 0 && taken.includes(mustK)) || (mustK === -2 && usedJ > 0);
          const r = solve(k, skipped, nsat ? 1 : 0);
          J = oldJ;
          if (r > NEG / 2) {
            const tot = r + value(pts, len);
            if (tot > best) {
              best = tot;
              bestChoice = { type: 1, c, s, e, hiEnd: false };
            }
          }
        }
        if (e >= 13) break;
        // e+1 konumunu ekle
        const np = e + 1;
        const nk = c * 14 + np;
        if (cnt[nk] > 0) {
          dec(nk);
          taken.push(nk);
        } else {
          usedJ++;
          if (usedJ > J) {
            ok = false;
          } else {
            taken.push(-1);
          }
        }
        if (!ok) break;
        pts += np;
        e = np;
      }
      // geri al
      for (let i = 0; i < taken.length; i++) if (taken[i] >= 0) inc(taken[i]);
    }

    // 3) Seri — yüksek 1 (…12,13,1): kanonik taş değer 1, konum 14
    if (wrap && v === 1) {
      dec(k);
      const taken = [k];
      // s=12'den geriye doğru: konumlar s..13 doğal/jokerle doldurulur
      let usedJ = 0;
      let pts = 14;
      // 13, 12, 11, ... aşağı doğru genişlet
      for (let s = 13; s >= 2; s--) {
        const nk = c * 14 + s;
        if (cnt[nk] > 0) {
          dec(nk);
          taken.push(nk);
        } else {
          usedJ++;
          taken.push(-1);
        }
        pts += s;
        if (usedJ > J) break;
        const len = 14 - s + 1;
        if (len >= 3) {
          const oldJ = J;
          J -= usedJ;
          const hit = mustK >= 0 && taken.includes(mustK);
          const nsat = sat || hit || (mustK === -2 && usedJ > 0);
          const r = solve(k, skipped, nsat ? 1 : 0);
          J = oldJ;
          if (r > NEG / 2) {
            const tot = r + value(pts, len);
            if (tot > best) {
              best = tot;
              bestChoice = { type: 1, c, s, e: 14, hiEnd: true };
            }
          }
        }
      }
      for (let i = 0; i < taken.length; i++) if (taken[i] >= 0) inc(taken[i]);
    }

    // 4) Grup (aynı sayı, farklı renkler)
    if (!noSets) {
      const avail = [];
      for (let c2 = c + 1; c2 < 4; c2++) if (cnt[c2 * 14 + v] > 0) avail.push(c2);
      const na = avail.length;
      for (let mask = 0; mask < 1 << na; mask++) {
        let tcount = 0;
        for (let i = 0; i < na; i++) if (mask & (1 << i)) tcount++;
        const base = 1 + tcount;
        const jMin = Math.max(0, 3 - base);
        const jMax = Math.min(J, 4 - base);
        for (let ju = jMin; ju <= jMax; ju++) {
          const total = base + ju;
          if (total < 3 || total > 4) continue;
          dec(k);
          const taken = [k];
          for (let i = 0; i < na; i++)
            if (mask & (1 << i)) {
              const nk = avail[i] * 14 + v;
              dec(nk);
              taken.push(nk);
            }
          const oldJ = J;
          J -= ju;
          const hit = mustK >= 0 && taken.includes(mustK);
          const nsat = sat || hit || (mustK === -2 && ju > 0);
          const r = solve(k, skipped, nsat ? 1 : 0);
          J = oldJ;
          for (let i = 0; i < taken.length; i++) inc(taken[i]);
          if (r > NEG / 2) {
            const tot = r + value(v * total, total);
            if (tot > best) {
              best = tot;
              bestChoice = { type: 2, c, v, mask, avail: avail.slice(), ju };
            }
          }
        }
      }
    }

    m.set(key, best);
    if (best > NEG / 2) {
      let cm = choice.get(hi);
      if (!cm) {
        cm = new Map();
        choice.set(hi, cm);
      }
      cm.set(key, bestChoice);
    }
    return best;
  }

  const total = solve(0, 0, mustK === -1 ? 1 : 0);
  if (total <= NEG / 2) return { ok: false, truncated, nodes };

  // --- Yeniden oluştur: seçimleri kökten oynat --------------------------------------------
  const plans = [];
  {
    // durumu başa al
    const c0 = model.cnt;
    for (let k = 0; k < CELLS; k++) cnt[k] = c0[k];
    J = model.J;
    lo = 0;
    hi = 0;
    for (let k = 0; k < CELLS; k++) {
      const o = ORD[k];
      if (o < 0 || !cnt[k]) continue;
      if (o < 26) lo += cnt[k] * POW3[o];
      else hi += cnt[k] * POW3[o - 26];
    }
    let skipped = 0;
    let sat = mustK === -1 ? 1 : 0;
    let from = 0;
    for (;;) {
      let k = from;
      while (k < CELLS && !(cnt[k] > 0)) k++;
      if (k >= CELLS) break;
      const key = lo * 16 + J * 4 + skipped * 2 + sat;
      const ch = choice.get(hi)?.get(key);
      if (!ch) break;
      from = k;
      if (ch.type === 0) {
        dec(k);
        skipped = 1;
        continue;
      }
      if (ch.type === 1) {
        const { c, s, e } = ch;
        const v = k % 14;
        const slots = []; // {p, nat:boolean}
        if (ch.hiEnd) {
          dec(k);
          slots.push({ p: 14, nat: true, k });
          for (let p = 13; p >= s; p--) {
            const nk = c * 14 + p;
            if (cnt[nk] > 0) {
              dec(nk);
              slots.push({ p, nat: true, k: nk });
            } else {
              J--;
              slots.push({ p, nat: false });
            }
          }
          slots.reverse();
        } else {
          for (let p = s; p <= e; p++) {
            const nk = c * 14 + p;
            if (p < v) {
              J--;
              slots.push({ p, nat: false });
            } else if (cnt[nk] > 0) {
              dec(nk);
              slots.push({ p, nat: true, k: nk });
            } else {
              J--;
              slots.push({ p, nat: false });
            }
          }
        }
        plans.push({ kind: 'run', c, s: slots[0].p, slots });
        for (const sl of slots) {
          if (sl.nat && mustK >= 0 && sl.k === mustK) sat = 1;
          if (!sl.nat && mustK === -2) sat = 1;
        }
        continue;
      }
      // set
      const { c, v, mask, avail, ju } = ch;
      const cols = [{ c, nat: true }];
      dec(k);
      const ks = [k];
      for (let i = 0; i < avail.length; i++)
        if (mask & (1 << i)) {
          const nk = avail[i] * 14 + v;
          dec(nk);
          ks.push(nk);
          cols.push({ c: avail[i], nat: true });
        }
      J -= ju;
      plans.push({ kind: 'set', v, cols, ju });
      if (mustK >= 0 && ks.includes(mustK)) sat = 1;
      if (mustK === -2 && ju > 0) sat = 1;
    }
  }
  return { ok: true, total, plans, truncated, nodes };
}

// Planı gerçek taş kimlikleriyle perlere dönüştürür.
function realize(plans, model, ctx, opts) {
  const pools = model.pools.map((p) => (p ? p.slice() : p));
  const jokers = model.jokers.slice();
  const must = opts.must;
  // zorunlu taş havuzda ilk sırada olsun
  if (must !== undefined && must !== null && !isOkey(must, ctx)) {
    const c = isFake(must) ? ctx.oc : colorOf(must);
    const v = isFake(must) ? ctx.ov : valueOf(must);
    const p = pools[c * 14 + v];
    const i = p ? p.indexOf(must) : -1;
    if (i > 0) {
      p.splice(i, 1);
      p.unshift(must);
    }
  }
  const take = (k) => pools[k].shift();
  const melds = [];
  for (const pl of plans) {
    if (pl.kind === 'run') {
      const tiles = [];
      for (const sl of pl.slots) {
        const val = sl.p > 13 ? sl.p - 13 : sl.p;
        if (sl.nat) tiles.push({ t: take(sl.k), c: pl.c, v: val, j: false });
        else tiles.push({ t: jokers.shift(), c: pl.c, v: val, j: true });
      }
      melds.push({ kind: 'run', color: pl.c, start: pl.s, tiles });
    } else {
      const tiles = [];
      const used = new Set(pl.cols.map((x) => x.c));
      for (const col of pl.cols) tiles.push({ t: take(col.c * 14 + pl.v), c: col.c, v: pl.v, j: false });
      let nc = 0;
      for (let i = 0; i < pl.ju; i++) {
        while (used.has(nc)) nc++;
        used.add(nc);
        tiles.push({ t: jokers.shift(), c: nc, v: pl.v, j: true });
      }
      tiles.sort((a, b) => a.c - b.c);
      melds.push({ kind: 'set', value: pl.v, tiles });
    }
  }
  return melds;
}

// Tüm taşlar per(ler)e tam bölünüyor mu? (klasik Okey bitişi; el 14 taş)
export function partitionAll(hand, ctx, opts = {}) {
  const model = buildModel(hand, ctx);
  const res = runSearch(model, ctx, { exact: true, wrapHigh: opts.wrapHigh ?? true, noSets: opts.noSets, budget: opts.budget });
  if (!res.ok) return null;
  return { kind: 'sets', groups: realize(res.plans, model, ctx, {}) };
}

// 7 çift ile bitiş: el tam olarak çiftlere bölünüyor mu? (joker serbest)
export function findPairsFinish(hand, ctx) {
  if (hand.length % 2 !== 0 || hand.length < 2) return null;
  const r = pairUp(hand, ctx, { all: true });
  if (!r || r.unpaired.length) return null;
  return { kind: 'pairs', groups: r.groups };
}

// Elden çiftleri ayıklar. Dönüş: { groups: pairMeld[], unpaired: tileId[] }
function pairUp(hand, ctx, opts = {}) {
  const model = buildModel(hand, ctx);
  const pools = model.pools.map((p) => (p ? p.slice() : p));
  const jokers = model.jokers.slice();
  const groups = [];
  const singles = [];
  const must = opts.must;
  const isMust = (t) => must !== undefined && must !== null && t === must;
  // doğal çiftler
  for (let k = 0; k < CELLS; k++) {
    const p = pools[k];
    if (!p) continue;
    // zorunlu taşı öne al
    if (must !== undefined && must !== null) {
      const i = p.indexOf(must);
      if (i > 0) {
        p.splice(i, 1);
        p.unshift(must);
      }
    }
    while (p.length >= 2) {
      const a = p.shift();
      const b = p.shift();
      groups.push(buildPair([a, b], ctx));
    }
    if (p.length) singles.push(p[0]);
  }
  // tekleri jokerle eşle (zorunlu taş öncelikli)
  singles.sort((a, b) => (isMust(b) ? 1 : 0) - (isMust(a) ? 1 : 0) || valOf(b, ctx) - valOf(a, ctx));
  const rest = [];
  for (const s of singles) {
    if (jokers.length) groups.push(buildPair([s, jokers.shift()], ctx));
    else rest.push(s);
  }
  while (jokers.length >= 2) groups.push(buildPair([jokers.shift(), jokers.shift()], ctx));
  return { groups, unpaired: [...rest, ...jokers] };
}

const valOf = (t, ctx) => (isFake(t) ? ctx.ov : valueOf(t));

// En çok çift (çift açma). leaveOne: en az bir taş elde kalmalı. must: kullanılması zorunlu taş.
export function findBestPairs(hand, ctx, opts = {}) {
  const r = pairUp(hand, ctx, opts);
  let groups = r.groups;
  const must = opts.must;
  if (must !== undefined && must !== null) {
    const used = groups.some((g) => g.tiles.some((x) => x.t === must));
    if (!used) return null;
  }
  if (opts.leaveOne && groups.length * 2 >= hand.length) {
    // en düşük değerli, zorunlu taşı içermeyen çifti bırak
    const sorted = groups
      .map((g, i) => ({ g, i, v: g.tiles[0].v, m: must !== undefined && must !== null && g.tiles.some((x) => x.t === must) }))
      .filter((x) => !x.m)
      .sort((a, b) => a.v - b.v);
    if (!sorted.length) return null;
    groups = groups.filter((_, i) => i !== sorted[0].i);
  }
  return { groups, count: groups.length };
}

// Elden en iyi per seçimi. opts: { wrapHigh, objective, leaveOne, must, budget }
// Dönüş: { groups: meld[], points, tiles, truncated } | null
export function findBest(hand, ctx, opts = {}) {
  const model = buildModel(hand, ctx);
  const res = runSearch(model, ctx, { ...opts, exact: false });
  if (!res.ok) return null;
  const groups = realize(res.plans, model, ctx, opts);
  let points = 0;
  let tiles = 0;
  for (const g of groups) {
    tiles += g.tiles.length;
    if (g.kind === 'set') points += g.value * g.tiles.length;
    else for (let i = 0; i < g.tiles.length; i++) points += g.start + i;
  }
  return { groups, points, tiles, truncated: res.truncated, nodes: res.nodes };
}
