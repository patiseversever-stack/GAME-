// RackModel — slotlu ıstaka (satır × sütun). Oyuncu taşlar arasına boşluk bırakıp perleri gruplayabilir.
//
// Sürükleme mantığı: taş hedef slota bırakılırsa ve orası doluysa, aynı satırda en yakın boş slota doğru
// komşular kayar ("alan açılır"). Satır doluysa hedefle yer değiştirir. `preview*` yöntemleri durumu değiştirmez;
// görünüm bunları sürükleme sırasında canlı önizleme için kullanır.

import { colorOf, valueOf, isFake, isOkey } from '../game/tiles.js';
import { findBest } from '../game/solver.js';
import { classify } from '../game/melds.js';

export class RackModel {
  constructor(rows = 2, cols = 10) {
    this.rows = rows;
    this.cols = cols;
    this.slots = new Array(rows * cols).fill(null);
  }

  get size() {
    return this.slots.length;
  }
  get count() {
    let n = 0;
    for (const t of this.slots) if (t !== null) n++;
    return n;
  }
  tiles() {
    return this.slots.filter((t) => t !== null);
  }
  indexOf(tile) {
    return this.slots.indexOf(tile);
  }
  has(tile) {
    return this.slots.includes(tile);
  }
  tileAt(i) {
    return this.slots[i] ?? null;
  }
  rowOf(i) {
    return Math.floor(i / this.cols);
  }

  clone() {
    const r = new RackModel(this.rows, this.cols);
    r.slots = this.slots.slice();
    return r;
  }
  serialize() {
    return { rows: this.rows, cols: this.cols, slots: this.slots.slice() };
  }
  static from(obj) {
    const r = new RackModel(obj.rows, obj.cols);
    r.slots = obj.slots.slice();
    return r;
  }

  // Izgara boyutu değişti: sıra ve boşluk yapısı korunarak yeniden akıt
  reflow(rows, cols) {
    if (rows === this.rows && cols === this.cols) return;
    const seq = [];
    let gap = 0;
    let started = false;
    for (const t of this.slots) {
      if (t === null) {
        if (started) gap++;
      } else {
        if (gap > 0) seq.push(null);
        gap = 0;
        seq.push(t);
        started = true;
      }
    }
    const cap = rows * cols;
    const nTiles = seq.filter((x) => x !== null).length;
    // sığmıyorsa boşlukları at
    let out = seq;
    if (seq.length > cap) out = seq.filter((x) => x !== null);
    this.rows = rows;
    this.cols = cols;
    this.slots = new Array(cap).fill(null);
    // taşları satır başından başlayarak diz
    for (let i = 0; i < out.length && i < cap; i++) this.slots[i] = out[i];
    if (nTiles > cap) throw new Error('Istaka taşlara yetmiyor');
  }

  clear() {
    this.slots.fill(null);
  }

  set(i, tile) {
    this.slots[i] = tile;
  }

  remove(tile) {
    const i = this.slots.indexOf(tile);
    if (i >= 0) this.slots[i] = null;
    return i;
  }

  // Yeni taş: düzenin sonundan sonraki ilk boş slot; yoksa ilk boş slot
  autoSlot() {
    let last = -1;
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i] !== null) last = i;
    for (let i = last + 1; i < this.slots.length; i++) if (this.slots[i] === null) return i;
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i] === null) return i;
    return -1;
  }

  addAuto(tile) {
    const i = this.autoSlot();
    if (i < 0) throw new Error('Istaka dolu');
    this.slots[i] = tile;
    return i;
  }

  // Bir taşı hedef slota taşı. Dönüş: { slots } — uygulanmış yeni dizilim
  moveTo(tile, target) {
    const next = this.previewMove(tile, target);
    this.slots = next;
    return next;
  }

  // Durumu değiştirmeden sonucu hesapla → yeni slot dizisi
  previewMove(tile, target) {
    const slots = this.slots.slice();
    const from = slots.indexOf(tile);
    if (from < 0 || target < 0 || target >= slots.length) return slots;
    if (from === target) return slots;
    slots[from] = null;
    if (slots[target] === null) {
      slots[target] = tile;
      return slots;
    }
    const row = Math.floor(target / this.cols);
    const r0 = row * this.cols;
    const r1 = r0 + this.cols - 1;
    let l = target - 1;
    while (l >= r0 && slots[l] !== null) l--;
    let r = target + 1;
    while (r <= r1 && slots[r] !== null) r++;
    const hasL = l >= r0;
    const hasR = r <= r1;
    let dir = 0;
    if (hasL && hasR) {
      const dl = target - l;
      const dr = r - target;
      // kaynak hedefin hangi tarafındaysa o tarafı tercih et (doğal "araya girme")
      if (dl === dr) dir = from < target ? -1 : 1;
      else dir = dl < dr ? -1 : 1;
    } else if (hasL) dir = -1;
    else if (hasR) dir = 1;
    if (dir === 0) {
      // satır dolu: yer değiştir
      const other = slots[target];
      slots[from] = other;
      slots[target] = tile;
      return slots;
    }
    if (dir === 1) for (let i = r; i > target; i--) slots[i] = slots[i - 1];
    else for (let i = l; i < target; i++) slots[i] = slots[i + 1];
    slots[target] = tile;
    return slots;
  }

  // Satır başına ardışık dolu taş grupları (boşluk = grup ayracı)
  groups() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      let cur = null;
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        const t = this.slots[i];
        if (t === null) {
          if (cur) out.push(cur), (cur = null);
        } else {
          if (!cur) cur = { row: r, start: i, end: i, tiles: [] };
          cur.end = i;
          cur.tiles.push(t);
        }
      }
      if (cur) out.push(cur);
    }
    return out;
  }

  // ── Sıralama ────────────────────────────────────────────────────────────────────────────────
  // Dizilim planı (gruplar arasına boşluk koyarak) → yeni slot dizisi. Sığmazsa boşluksuz akıtır.
  _layoutGroups(groups) {
    const cap = this.size;
    const total = groups.reduce((a, g) => a + g.length, 0);
    const need = total + Math.max(0, groups.length - 1);
    const withGaps = need <= cap;
    const out = new Array(cap).fill(null);
    let pos = 0;
    groups.forEach((g, gi) => {
      if (gi > 0 && withGaps) pos++;
      for (const t of g) out[pos++] = t;
    });
    return out;
  }

  arrangement(mode, ctx, rules) {
    const tiles = this.tiles();
    const jokers = tiles.filter((t) => isOkey(t, ctx));
    const rest = tiles.filter((t) => !isOkey(t, ctx));
    const face = (t) => (isFake(t) ? { c: ctx.oc, v: ctx.ov } : { c: colorOf(t), v: valueOf(t) });
    if (mode === 'color') {
      const by = [[], [], [], []];
      for (const t of rest) by[face(t).c].push(t);
      const groups = by.map((g) => g.sort((a, b) => face(a).v - face(b).v)).filter((g) => g.length);
      if (jokers.length) groups.push(jokers);
      return this._layoutGroups(groups);
    }
    if (mode === 'number') {
      const by = new Map();
      for (const t of rest) {
        const f = face(t);
        if (!by.has(f.v)) by.set(f.v, []);
        by.get(f.v).push(t);
      }
      const groups = [...by.keys()].sort((a, b) => a - b).map((v) => by.get(v).sort((a, b) => face(a).c - face(b).c));
      if (jokers.length) groups.push(jokers);
      return this._layoutGroups(groups);
    }
    if (mode === 'pairs') {
      // aynı yüzlü ikililer yan yana (çift bitiş / 101 çift açılış), okeyler tekli taşlarla eşlenir
      const byFace = new Map();
      for (const t of rest) {
        const f = face(t);
        const k = f.c * 16 + f.v;
        if (!byFace.has(k)) byFace.set(k, []);
        byFace.get(k).push(t);
      }
      const groups = [];
      const singles = [];
      for (const [, arr] of [...byFace.entries()].sort((a, b) => a[0] - b[0])) {
        while (arr.length >= 2) groups.push(arr.splice(0, 2));
        singles.push(...arr);
      }
      const js = jokers.slice();
      while (js.length && singles.length) groups.push([singles.shift(), js.shift()]);
      if (js.length) groups.push(js);
      if (singles.length) groups.push(singles);
      return this._layoutGroups(groups);
    }
    // 'smart': çözücüyle en iyi per bölüşümü (klasik: en çok taş, 101: en çok puan); perler bitişik, aralarda boşluk
    const wrap = rules.mode === 'okey' ? true : !!rules.wrapHigh101;
    const best = findBest(tiles, ctx, { wrapHigh: wrap, objective: rules.mode === 'okey101' ? 'points' : 'tiles' });
    const used = new Set();
    const groups = [];
    if (best) {
      const melds = best.groups.slice().sort((a, b) => b.tiles.length - a.tiles.length);
      for (const m of melds) {
        groups.push(m.tiles.map((x) => x.t));
        m.tiles.forEach((x) => used.add(x.t));
      }
    }
    const left = tiles.filter((t) => !used.has(t));
    const leftJ = left.filter((t) => isOkey(t, ctx));
    const leftN = left.filter((t) => !isOkey(t, ctx));
    const by = [[], [], [], []];
    for (const t of leftN) by[face(t).c].push(t);
    const tail = [];
    for (const g of by) tail.push(...g.sort((a, b) => face(a).v - face(b).v));
    tail.push(...leftJ);
    if (tail.length) groups.push(tail);
    return this._layoutGroups(groups);
  }

  apply(slots) {
    this.slots = slots.slice();
  }
}

// Bir grubun per olarak sınıflandırılması (canlı açılış önizlemesi)
export function classifyGroup(tiles, ctx, wrapHigh) {
  if (tiles.length < 2) return null;
  return classify(tiles, ctx, { wrapHigh, ordered: true });
}

// Tuple: hangi slotlar taşınacak? Eski → yeni dizilimden { tile → newSlot } farkı
export function diffSlots(oldSlots, newSlots) {
  const moves = new Map();
  const pos = new Map();
  newSlots.forEach((t, i) => {
    if (t !== null) pos.set(t, i);
  });
  oldSlots.forEach((t, i) => {
    if (t !== null && pos.get(t) !== i) moves.set(t, pos.get(t));
  });
  return moves;
}
