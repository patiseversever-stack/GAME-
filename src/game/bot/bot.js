// BotAI — rakip elini görmeden (yalnızca `Game.view(seat)`) karar verir.
//
// Zorluklar yalnızca bekleme süresiyle değil KARAR KALİTESİYLE ayrışır:
//   CASUAL : çıkış sayımı yok, rakip modeli yok, bazen fırsatı kaçırır, atışlarda gürültü var.
//   NORMAL : görünür taş sayımı, el yapısı analizi, işlek taşı/okeyi atmaz, açılışı iyi kullanır.
//   EXPERT : NORMAL + rakip ihtiyaç modeli, yandan alma kararında beklenen kazanç karşılaştırması,
//            çift planı, tehlikeli taşlardan kaçınma.

import { createRng } from '../../util/rng.js';
import { isOkey, isFake, tilePenaltyValue, colorOf, valueOf } from '../tiles.js';
import { extendMeld, reclaimJoker } from '../melds.js';
import { findBest, findBestPairs, partitionAll, findPairsFinish } from '../solver.js';
import { prevSeat, nextSeat } from '../game.js';
import { computeKnowledge, needScore, tileFace } from './knowledge.js';
import { evalClassic, evalOpenPotential } from './analysis.js';

export const DIFFICULTIES = {
  casual: {
    id: 'casual',
    label: 'Kolay',
    noise: 0.55,
    noiseSpan: 5,
    finishSkill: 0.75,
    lookahead: false,
    track: false,
    danger: 0,
    expectedDraw: false,
    pairsPlan: false,
    sideGain: 200,
    openSkill: 0.7,
    layoffSkill: 0.6,
    reclaimSkill: 0.4,
    think: [1000, 2100],
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    noise: 0.12,
    noiseSpan: 3,
    finishSkill: 1,
    lookahead: false,
    track: true,
    danger: 0.35,
    expectedDraw: false,
    pairsPlan: true,
    sideGain: 45,
    openSkill: 1,
    layoffSkill: 0.96,
    reclaimSkill: 0.85,
    think: [750, 1600],
  },
  expert: {
    id: 'expert',
    label: 'Uzman',
    noise: 0,
    noiseSpan: 1,
    finishSkill: 1,
    lookahead: true,
    track: true,
    danger: 1,
    expectedDraw: true,
    pairsPlan: true,
    sideGain: 20,
    openSkill: 1,
    layoffSkill: 1,
    reclaimSkill: 1,
    think: [650, 1400],
  },
};

const BIG = 1e6;

export class Bot {
  constructor(seat, difficulty = 'normal', seed = 1) {
    this.seat = seat;
    this.diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    this.rng = createRng((seed ^ (seat * 0x9e3779b1)) >>> 0);
  }

  thinkTime(speed = 1) {
    const [a, b] = this.diff.think;
    return this.rng.range(a, b) / speed;
  }

  // Bir sonraki eylem. null → botun sırası değil.
  nextAction(view) {
    if (view.status !== 'playing' || view.turn.seat !== this.seat) return null;
    const know = computeKnowledge(view);
    this._ctxRef = { ctx: view.ctx };
    if (!this.diff.track) know.live = () => 1; // kör: çıkış sayımı yok
    const ctx = { view, know, wrap: view.rules.mode === 'okey' ? true : !!view.rules.wrapHigh101 };
    return view.rules.mode === 'okey' ? this._classic(ctx) : this._play101(ctx);
  }

  // Motor reddederse: her durumda geçerli bir hamle
  safeAction(view) {
    if (view.turn.needsDraw) return { type: 'DRAW_STOCK' };
    const hand = view.hand;
    if (view.rules.mode === 'okey101') {
      if (view.turn.source === 'side' && !view.turn.sideCommitted) return { type: 'RETURN_SIDE' };
      if (hand.length === 1) return { type: 'FINISH', tile: hand[0] };
    }
    const cand = hand.filter((t) => !isOkey(t, view.ctx));
    const list = cand.length ? cand : hand;
    let best = list[0];
    for (const t of list) if (tilePenaltyValue(t, view.ctx) > tilePenaltyValue(best, view.ctx)) best = t;
    return { type: 'DISCARD', tile: best };
  }

  // ----------------------------------------------------------------------------------------
  // KLASİK OKEY
  // ----------------------------------------------------------------------------------------
  _classic({ view, know, wrap }) {
    const { seat } = this;
    const { ctx, hand, turn } = view;

    // Gösterge göstermek (ilk çekişten önce)
    if (!view.firstActionTaken[seat] && !view.shownIndicator[seat]) {
      const ind = ctx.indicator;
      const twin = hand.find((t) => !isFake(t) && t !== ind && colorOf(t) === colorOf(ind) && valueOf(t) === valueOf(ind));
      if (twin !== undefined) return { type: 'SHOW_INDICATOR', tile: twin };
    }

    if (turn.needsDraw) return this._classicDraw(view, know);

    // Bitirebilir miyim?
    const fin = this._classicFinish(view);
    if (fin !== null && this.rng.chance(this.diff.finishSkill)) return { type: 'FINISH', tile: fin };
    return { type: 'DISCARD', tile: this._classicDiscard(view, know) };
  }

  _sideTile(view) {
    const prev = prevSeat(this.seat);
    const d = view.discards[prev];
    const t = d[d.length - 1];
    if (t === undefined || !view.lastDiscard || view.lastDiscard.seat !== prev || view.lastDiscard.tile !== t) return null;
    if (isOkey(t, view.ctx)) return null;
    return t;
  }

  _canFinishWith(hand15, t, ctx) {
    const rest = hand15.filter((x) => x !== t);
    return !!(findPairsFinish(rest, ctx) || partitionAll(rest, ctx, { wrapHigh: true }));
  }

  _classicFinish(view) {
    const { hand, ctx } = view;
    if (hand.length !== 15) return null;
    let best = null;
    for (const t of hand) {
      if (!this._canFinishWith(hand, t, ctx)) continue;
      // okey atarak bitirmek çarpan getirir
      if (isOkey(t, ctx)) return t;
      if (best === null) best = t;
    }
    return best;
  }

  _classicDraw(view, know) {
    const side = this._sideTile(view);
    if (side === null) return { type: 'DRAW_STOCK' };
    const { hand, ctx } = view;
    const h15 = [...hand, side];
    // kazandırıyorsa her zaman al
    for (const t of h15) if (t !== side && this._canFinishWith(h15, t, ctx)) return { type: 'TAKE_SIDE' };
    const opts = { pairsPlan: this.diff.pairsPlan };
    const base = evalClassic(hand, ctx, know, opts);
    let bestA = -Infinity;
    for (const t of h15) {
      if (t === side) continue; // aldığını hemen atmak anlamsız
      const v = evalClassic(h15.filter((x) => x !== t), ctx, know, opts);
      if (v > bestA) bestA = v;
    }
    const gain = bestA - base;
    let need = this.diff.sideGain;
    if (this.diff.expectedDraw) need = Math.max(need, this._expectedDrawGain(view, know, base, opts) + 6);
    return gain >= need ? { type: 'TAKE_SIDE' } : { type: 'DRAW_STOCK' };
  }

  // Desteden çekmenin beklenen kazancı (yalnız ilgili yüzler hesaplanır; diğerleri 0 kazanç)
  _expectedDrawGain(view, know, base, opts) {
    const { hand, ctx } = view;
    const unseen = Math.max(1, know.unseenTotal);
    // en zayıf 3 aday at
    const scored = hand.map((t) => ({ t, v: evalClassic(hand.filter((x) => x !== t), ctx, know, opts) })).sort((a, b) => b.v - a.v);
    const weakest = scored.slice(0, 3).map((x) => x.t);
    const faces = new Set();
    for (const t of hand) {
      const f = tileFace(t, ctx);
      if (!f) continue;
      for (const dv of [-2, -1, 0, 1, 2]) {
        let v = f.v + dv;
        if (v === 14) v = 1;
        if (v === 0) v = 13;
        if (v >= 1 && v <= 13) faces.add(f.c * 14 + v);
      }
      for (let c = 0; c < 4; c++) faces.add(c * 14 + f.v);
    }
    let gainSum = 0;
    for (const k of faces) {
      const c = (k / 14) | 0;
      const v = k % 14;
      const p = know.live(c, v) / unseen;
      if (p <= 0) continue;
      // bu yüzü temsil eden sahte taş gibi davran: gerçek kimlik gerekmediği için 104 kullanılır
      // (yüz okey yüzü değilse doğal taş kimliği kullan)
      const probe = this._probeTile(c, v, hand, ctx);
      if (probe === null) continue;
      const h15 = [...hand, probe];
      let best = base;
      for (const d of weakest) {
        const val = evalClassic(h15.filter((x) => x !== d), ctx, know, opts);
        if (val > best) best = val;
      }
      gainSum += p * (best - base);
    }
    // joker
    const pj = know.jokersLeft / unseen;
    return gainSum + pj * 60;
  }

  // Elde olmayan, belirtilen yüzde bir doğal taş kimliği (değerlendirme amaçlı)
  _probeTile(c, v, hand, ctx) {
    for (const copy of [0, 1]) {
      const t = c * 26 + (v - 1) * 2 + copy;
      if (!hand.includes(t) && !isOkey(t, ctx)) return t;
    }
    // okey yüzü: sahte okey kimliği
    if (c === ctx.oc && v === ctx.ov) for (const t of [104, 105]) if (!hand.includes(t)) return t;
    return null;
  }

  _classicDiscard(view, know) {
    const { hand, ctx } = view;
    const nextOpp = nextSeat(this.seat);
    const opts = { pairsPlan: this.diff.pairsPlan };
    const scored = [];
    for (const t of hand) {
      if (isOkey(t, ctx)) continue; // gerçek okey bitiş dışında atılmaz
      const base = evalClassic(hand.filter((x) => x !== t), ctx, know, opts);
      const danger = this.diff.danger > 0 ? 26 * this.diff.danger * needScore(know, nextOpp, t) : 0;
      scored.push({ t, base, s: base - danger });
    }
    if (!scored.length) return hand[0];
    scored.sort((a, b) => b.s - a.s);
    if (this.diff.lookahead && scored.length > 1) {
      // Uzman: en iyi birkaç adayı, bir sonraki çekişin beklenen kazancıyla yeniden sırala
      const top = scored.slice(0, 5);
      const unseen = Math.max(1, know.unseenTotal);
      for (const c of top) {
        const rest = hand.filter((x) => x !== c.t);
        c.s += this._drawGain(rest, know, c.base, opts, unseen);
      }
      top.sort((a, b) => b.s - a.s);
      return top[0].t;
    }
    return this._pickWithNoise(scored);
  }

  // Bir sonraki çekişin beklenen iyileşmesi: yalnızca eldeki taşlara komşu yüzler (diğerleri kazanç 0 sayılır)
  _drawGain(rest, know, base, opts, unseen) {
    const { ctx } = this._ctxRef;
    const faces = new Set();
    for (const t of rest) {
      const f = tileFace(t, ctx);
      if (!f) continue;
      for (const dv of [-2, -1, 0, 1, 2]) {
        let v = f.v + dv;
        if (v === 14) v = 1;
        if (v === 0) v = 13;
        if (v >= 1 && v <= 13) faces.add(f.c * 14 + v);
      }
      for (let c = 0; c < 4; c++) faces.add(c * 14 + f.v);
    }
    let gain = 0;
    for (const k of faces) {
      const c = (k / 14) | 0;
      const v = k % 14;
      const p = know.live(c, v) / unseen;
      if (p <= 0) continue;
      const probe = this._probeTile(c, v, rest, ctx);
      if (probe === null) continue;
      const after = evalClassic([...rest, probe], ctx, know, opts) - base - 3; // fazladan taşın tek başına değeri düşülür
      if (after > 0) gain += p * after;
    }
    gain += (know.jokersLeft / unseen) * 55;
    return gain;
  }

  _pickWithNoise(scored) {
    if (this.diff.noise > 0 && scored.length > 1 && this.rng.chance(this.diff.noise)) {
      const k = Math.min(this.diff.noiseSpan, scored.length);
      return scored[this.rng.int(k)].t;
    }
    return scored[0].t;
  }

  // ----------------------------------------------------------------------------------------
  // 101 OKEY
  // ----------------------------------------------------------------------------------------
  _requirement(view) {
    if (view.rules.opening === 'progressive') return { sets: view.openingMax.sets + 1, pairs: view.openingMax.pairs + 1 };
    return { sets: 101, pairs: 5 };
  }

  _layoffTarget(view, tile, wrap) {
    for (const m of view.melds) {
      if (m.kind === 'pair') continue;
      for (const end of m.kind === 'set' ? ['high'] : ['high', 'low']) {
        const r = extendMeld(m, tile, view.ctx, { wrapHigh: wrap, end });
        if (r.ok && (m.kind === 'set' || r.end === end)) return { meldId: m.id, end };
      }
    }
    return null;
  }

  _isUseful(view, tile, wrap) {
    return this._layoffTarget(view, tile, wrap) !== null;
  }

  _groupsAction(res) {
    return res.groups.map((g) => ({ kind: g.kind, tiles: g.tiles.map((x) => x.t) }));
  }

  _play101({ view, know, wrap }) {
    const { seat } = this;
    const { ctx, hand, turn, opened } = view;
    const myOpen = opened[seat];

    if (turn.needsDraw) return this._draw101(view, know, wrap);

    const sideUncommitted = turn.source === 'side' && !turn.sideCommitted;
    const must = sideUncommitted ? turn.sideTile : undefined;
    const req = this._requirement(view);

    if (myOpen === 'none') {
      // açılış
      const canTry = this.rng.chance(this.diff.openSkill);
      if (canTry) {
        const best = findBest(hand, ctx, { wrapHigh: wrap, objective: 'points', leaveOne: true, must });
        if (best && best.points >= req.sets) return { type: 'OPEN', groups: this._groupsAction(best) };
        // "elden" açış: 21 taşın tamamı per ise eşik aranmaz
        if (hand.length === 22 && view.melds.length === 0) {
          const all = findBest(hand, ctx, { wrapHigh: wrap, objective: 'tiles', leaveOne: true });
          if (all && all.tiles === 21) return { type: 'OPEN', groups: this._groupsAction(all) };
        }
        if (this.diff.id !== 'casual' || this.rng.chance(0.5)) {
          const bp = findBestPairs(hand, ctx, { leaveOne: true, must });
          if (bp && bp.count >= req.pairs) return { type: 'OPEN', groups: bp.groups.map((g) => ({ kind: 'pair', tiles: g.tiles.map((x) => x.t) })) };
        }
      }
      if (sideUncommitted) return { type: 'RETURN_SIDE' };
    } else {
      // yerdeki okeyi geri al
      if (view.rules.reclaimOkey && this.rng.chance(this.diff.reclaimSkill)) {
        for (const m of view.melds) {
          if (m.kind === 'pair') continue;
          for (const x of m.tiles) {
            if (!x.j) continue;
            const rep = hand.find((t) => !isOkey(t, ctx) && reclaimJoker(m, x.t, t, ctx).ok);
            if (rep !== undefined && hand.length > 1) return { type: 'RECLAIM_OKEY', meldId: m.id, jokerTile: x.t, replacement: rep };
          }
        }
      }
      // yan taş kullanılmalıysa önce onu değerlendir
      if (sideUncommitted) {
        const tg = this._layoffTarget(view, turn.sideTile, wrap);
        if (tg && hand.length > 1) return { type: 'LAYOFF', meldId: tg.meldId, tile: turn.sideTile, end: tg.end };
      }
      // ek perler
      if (myOpen === 'sets' && view.rules.meldAfterOpen !== false) {
        const best = findBest(hand, ctx, { wrapHigh: wrap, objective: 'points', leaveOne: true, must });
        if (best && best.groups.length) return { type: 'OPEN', groups: this._groupsAction(best) };
      }
      // pere işle
      if (hand.length > 1 && this.rng.chance(this.diff.layoffSkill)) {
        let pick = null;
        for (const t of hand) {
          const tg = this._layoffTarget(view, t, wrap);
          if (!tg) continue;
          const v = tilePenaltyValue(t, ctx) + (isOkey(t, ctx) ? -50 : 0);
          if (!pick || v > pick.v) pick = { t, tg, v };
        }
        if (pick) return { type: 'LAYOFF', meldId: pick.tg.meldId, tile: pick.t, end: pick.tg.end };
      }
      // çift işle
      if (opened.includes('pairs') && hand.length > 2) {
        const bp = findBestPairs(hand, ctx, { leaveOne: true });
        if (bp && bp.groups.length) return { type: 'LAY_PAIR', tiles: bp.groups[0].tiles.map((x) => x.t) };
      }
      if (sideUncommitted) return { type: 'RETURN_SIDE' };
    }

    if (myOpen !== 'none' && hand.length === 1) return { type: 'FINISH', tile: hand[0] };
    return { type: 'DISCARD', tile: this._discard101(view, know, wrap) };
  }

  _draw101(view, know, wrap) {
    const side = this._sideTile(view);
    if (side === null) return { type: 'DRAW_STOCK' };
    const { seat } = this;
    const { hand, ctx, opened } = view;
    const h = [...hand, side];
    const myOpen = opened[seat];
    if (myOpen === 'none') {
      if (!this.rng.chance(this.diff.openSkill)) return { type: 'DRAW_STOCK' };
      const req = this._requirement(view);
      const best = findBest(h, ctx, { wrapHigh: wrap, objective: 'points', leaveOne: true, must: side });
      if (best && best.points >= req.sets) return { type: 'TAKE_SIDE' };
      if (this.diff.id !== 'casual') {
        const bp = findBestPairs(h, ctx, { leaveOne: true, must: side });
        if (bp && bp.count >= req.pairs) return { type: 'TAKE_SIDE' };
      }
      return { type: 'DRAW_STOCK' };
    }
    if (this._layoffTarget(view, side, wrap)) return { type: 'TAKE_SIDE' };
    if (myOpen === 'sets' && view.rules.meldAfterOpen !== false) {
      const best = findBest(h, ctx, { wrapHigh: wrap, objective: 'points', leaveOne: true, must: side });
      if (best) return { type: 'TAKE_SIDE' };
    }
    return { type: 'DRAW_STOCK' };
  }

  _discard101(view, know, wrap) {
    const { hand, ctx, opened } = view;
    const myOpen = opened[this.seat];
    const nextOpp = nextSeat(this.seat);
    const scored = [];
    for (const t of hand) {
      let s;
      if (isOkey(t, ctx)) s = -BIG;
      else {
        s = evalOpenPotential(hand.filter((x) => x !== t), ctx, know, { wrapHigh: wrap });
        if (myOpen !== 'none') s += 0.5 * tilePenaltyValue(t, ctx); // açtıktan sonra yüksek taşı boşalt
        if (this.diff.danger > 0) s -= 14 * this.diff.danger * needScore(know, nextOpp, t);
        if (this.diff.id !== 'casual' || this.rng.chance(0.6)) if (view.rules.discardUsefulPenalty !== false && this._isUseful(view, t, wrap)) s -= BIG / 10;
      }
      scored.push({ t, s });
    }
    scored.sort((a, b) => b.s - a.s);
    return this._pickWithNoise(scored.filter((x) => x.s > -BIG / 20).length ? scored.filter((x) => x.s > -BIG / 20) : scored);
  }
}
