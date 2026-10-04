// Oyun kural motoru — klasik Okey ve 101 Okey.
//
// Saf mantık: DOM, zamanlayıcı, ses yok. Durum düz nesnedir (JSON ile kaydedilebilir).
// `apply(seat, action)` önce doğrular, sonra değiştirir (hata durumunda durum dokunulmaz) ve
// arayüzün/botun tüketeceği olay listesini döndürür.
//
// Koltuklar: 0 = sen (alt), 1 = sağ, 2 = karşı (üst), 3 = sol. Sıra 0→1→2→3→0 ilerler;
// yandan alınabilecek taş, bir önceki oyuncunun (seat+3)%4 son attığı taştır.

import { createRng, mixSeed, freshSeed } from '../util/rng.js';
import { allTiles, isFake, isOkey, makeCtx, colorOf, valueOf, tilePenaltyValue, TILE_COUNT } from './tiles.js';
import { buildMeld, extendMeld, reclaimJoker, meldPoints, meldTileIds, checkMeldStructure } from './melds.js';
import { partitionAll, findPairsFinish } from './solver.js';
import { settleClassic, settle101, handValue } from './scoring.js';

export const SEATS = 4;
export const prevSeat = (s) => (s + 3) % 4;
export const nextSeat = (s) => (s + 1) % 4;

export const DEFAULT_RULES = Object.freeze({
  mode: 'okey', // 'okey' | 'okey101'
  // klasik Okey
  matchType: 'score', // 'score' (puan bitene kadar) | 'single' (tek el)
  startScore: 20,
  colorFinish: false, // tek renk bitiş ×2
  // 101
  rounds: 5, // 1 | 3 | 5 | 7 | 11
  opening: 'fixed', // 'fixed' (101 / 5 çift) | 'progressive' (katlamalı)
  wrapHigh101: false, // 101'de 12-13-1 serisi
  sideTakePenalty: true, // atılan taş yandan alınıp açılışta kullanılırsa atana taş değeri ×10 (çiftte ×20)
  reclaimOkey: true, // masadaki okey'i temsil ettiği taşla geri al
  reclaimPenalty: true, // geri alınan okeyi koyana +101
  reclaimSelfPenalty: false, // (paritesi) okeyi koyan kendisi geri alırsa da ceza
  discardOkeyPenalty: true, // 101: gerçek okey atma cezası
  discardUsefulPenalty: true, // 101: işlek taş atma cezası
  stockSettlement: 'hand', // 'hand' | 'jokerOnly'
  allPairsSettlement: 'none', // 'none' | 'penalties'
  kafaOkeyAward: 404, // 404 | 808
  meldAfterOpen: true, // açtıktan sonra elindeki başka perleri de indirebilir (orijinalde yoktu)
  // paritesi / test için (varsayılan: kapalı)
  layoffLimit: 0, // >0: pere tur başına en çok bu kadar taş işlenir (eski sürüm: 3/çift açana 2)
  invalidOpenPenalty: false, // geçersiz açış denemesi +101 (eski sürüm: açık)
  sideTakeFlat: false, // yandan alma cezası her kullanımda sabit +101 (eski sürüm: açık)
});

export function normalizeRules(input = {}) {
  const r = { ...DEFAULT_RULES, ...input };
  if (r.mode !== 'okey' && r.mode !== 'okey101') r.mode = 'okey';
  if (r.mode === 'okey101' && input.rounds === undefined) r.rounds = 5;
  return r;
}

const wrapFor = (rules) => (rules.mode === 'okey' ? true : !!rules.wrapHigh101);

const err = (error) => ({ ok: false, error, events: [] });

function newTurn(seat, needsDraw, meldCount) {
  return {
    seat,
    needsDraw,
    source: needsDraw ? null : 'initial',
    sideTile: null,
    sideFrom: null,
    sidePenalized: false,
    sideCommitted: false,
    initialMeldCount: meldCount,
    layoff: {},
  };
}

// --- Dağıtım ---------------------------------------------------------------------------------

export function dealRound(rules, seed, starter) {
  const rng = createRng(seed);
  const deck = rng.shuffle(allTiles());
  const ii = deck.findIndex((t) => !isFake(t));
  const [indicator] = deck.splice(ii, 1);
  const per = rules.mode === 'okey101' ? 21 : 14;
  const hands = [[], [], [], []];
  for (let d = 0; d < 4; d++) {
    const seat = (starter + d) % 4;
    hands[seat] = deck.splice(0, per + (seat === starter ? 1 : 0));
  }
  return { hands, stock: deck, indicator };
}

// Bir el için başlangıç durumu. `deal` verilirse (test/paralellik) o dağıtım kullanılır.
export function createRoundState(rules, seed, round, scores, starter, deal = null) {
  const { hands, stock, indicator } = deal || dealRound(rules, seed, starter);
  const ctx = makeCtx(indicator);
  return {
    v: 1,
    rules,
    seed,
    round,
    starter,
    status: 'playing',
    scores: scores.slice(),
    ctx,
    hands,
    stock,
    discards: [[], [], [], []],
    lastDiscard: null,
    melds: [],
    nextMeldId: 1,
    opened: ['none', 'none', 'none', 'none'],
    openingMax: { sets: 100, pairs: 4 },
    turn: newTurn(starter, false, 0),
    firstActionTaken: [false, false, false, false],
    shownIndicator: [false, false, false, false],
    roundPenalties: [0, 0, 0, 0],
    penaltyReasons: [],
    log: [],
    seq: 0,
    result: null,
  };
}

// --- Oyun ------------------------------------------------------------------------------------

export class Game {
  constructor(state) {
    this.s = state;
    this._out = null;
  }

  static create(rulesInput = {}, seed = freshSeed()) {
    const rules = normalizeRules(rulesInput);
    const starter = seed % 4;
    const startScores = rules.mode === 'okey' ? Array(4).fill(rules.startScore) : [0, 0, 0, 0];
    return new Game(createRoundState(rules, seed, 1, startScores, starter));
  }

  static restore(json) {
    let state = json;
    if (typeof json === 'string') {
      try {
        state = JSON.parse(json);
      } catch {
        return null;
      }
    }
    if (!state || typeof state !== 'object') return null;
    state.rules = normalizeRules(state.rules);
    if (checkInvariants(state)) return null;
    return new Game(state);
  }

  get state() {
    return this.s;
  }
  get rules() {
    return this.s.rules;
  }
  get ctx() {
    return this.s.ctx;
  }
  get is101() {
    return this.s.rules.mode === 'okey101';
  }
  get playing() {
    return this.s.status === 'playing';
  }
  get turnSeat() {
    return this.s.turn.seat;
  }
  get wrapHigh() {
    return wrapFor(this.s.rules);
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this.s));
  }

  clone() {
    return new Game(structuredClone(this.s));
  }

  // --- olay üretimi ---
  _emit(type, data = {}) {
    const s = this.s;
    const ev = { seq: ++s.seq, type, ...data };
    s.log.push(ev);
    if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
    this._out.push(ev);
    return ev;
  }

  _penalize(seat, points, reason) {
    const s = this.s;
    s.roundPenalties[seat] += points;
    s.penaltyReasons.push({ seat, points, reason });
    this._emit('penalty', { seat, points, reason });
  }

  // Yandan alınan taş kullanıldıysa (açma/işleme) kaydet ve atana cezayı yaz.
  // Ceza standart kuraldaki gibi taş değeri × mult (perde ×10, çiftte ×20; 6 → 60). Masadaki pere
  // işleme ya da okey değişimi (mult = 0) atana ceza yazmaz. (sideTakeFlat: eski sürümün sabit 101'i)
  _commitSide(tiles, mult = 10) {
    const t = this.s.turn;
    const r = this.s.rules;
    if (t.source !== 'side' || t.sideTile === null || !tiles.includes(t.sideTile)) return;
    t.sideCommitted = true;
    if ((mult > 0 || r.sideTakeFlat) && r.sideTakePenalty && !t.sidePenalized && t.sideFrom !== null) {
      this._penalize(t.sideFrom, r.sideTakeFlat ? 101 : tilePenaltyValue(t.sideTile, this.s.ctx) * mult, 'Attığı taşı yandan alıp kullandılar');
      t.sidePenalized = true;
    }
  }

  // --- sorgular (arayüz ve bot) ---------------------------------------------------------------

  sideTile(seat) {
    const s = this.s;
    const prev = prevSeat(seat);
    const tile = s.discards[prev][s.discards[prev].length - 1];
    if (tile === undefined) return null;
    if (!s.lastDiscard || s.lastDiscard.seat !== prev || s.lastDiscard.tile !== tile) return null;
    if (isOkey(tile, s.ctx)) return null;
    return tile;
  }

  canDrawStock(seat) {
    const s = this.s;
    return s.status === 'playing' && s.turn.seat === seat && s.turn.needsDraw;
  }

  canTakeSide(seat) {
    return this.canDrawStock(seat) && this.sideTile(seat) !== null;
  }

  openingRequirement() {
    const s = this.s;
    if (s.rules.opening === 'progressive') return { sets: s.openingMax.sets + 1, pairs: s.openingMax.pairs + 1 };
    return { sets: 101, pairs: 5 };
  }

  // Açılış grupları değerlendirmesi (canlı doğrulama için). groups: [{kind, tiles}]
  // Zaten set/seri ile açmış oyuncu için "ek per" modunda eşik aranmaz.
  evaluateOpening(seat, groups, { checkSide = true } = {}) {
    const s = this.s;
    const hand = s.hands[seat];
    const need = this.openingRequirement();
    const additional = s.opened[seat] === 'sets';
    const fail = (reason, extra = {}) => ({ ok: false, reason, need, additional, ...extra });
    if (!groups || !groups.length) return fail('Önce per veya çift oluştur.');
    const allPairs = groups.every((g) => g.kind === 'pair');
    const anyPair = groups.some((g) => g.kind === 'pair');
    if (anyPair && !allPairs) return fail('Per ve çift aynı açılışta karışamaz.');
    if (additional && anyPair) return fail('Çiftler "Çifti işle" ile indirilir.');
    const ids = groups.flatMap((g) => g.tiles);
    if (new Set(ids).size !== ids.length || ids.some((t) => !hand.includes(t))) return fail('Seçilen taşlar elinde bulunmuyor.');
    const melds = [];
    for (const g of groups) {
      const m = buildMeld(g.kind, g.tiles, s.ctx, { wrapHigh: this.wrapHigh, ordered: true });
      if (!m) return fail('Geçersiz per: ' + describeInvalid(g.kind, g.tiles, s.ctx), { badGroup: g });
      melds.push(m);
    }
    const points = allPairs ? 0 : melds.reduce((a, m) => a + meldPoints(m), 0);
    const count = melds.length;
    const kind = allPairs ? 'pairs' : 'sets';
    const fromHand = ids.length >= hand.length;
    const exempt = kind === 'sets' && !additional && ids.length === 21 && hand.length === 22 && s.melds.length === 0 && s.opened.every((o) => o === 'none');
    const base = { kind, points, count, need, melds, tiles: ids, additional };
    if (fromHand) return { ...base, ok: false, reason: 'Bitirmek için elde atılacak son taş kalmalı.' };
    if (!exempt && !additional) {
      if (kind === 'sets' && points < need.sets) return { ...base, ok: false, reason: `Açılış için en az ${need.sets} puan gerekiyor (şu an ${points}).` };
      if (kind === 'pairs' && count < need.pairs) return { ...base, ok: false, reason: `Açılış için en az ${need.pairs} çift gerekiyor (şu an ${count}).` };
    }
    const t = s.turn;
    if (checkSide && t.source === 'side' && t.sideTile !== null && !t.sideCommitted && !ids.includes(t.sideTile)) {
      return { ...base, ok: false, reason: 'Yandan aldığın taş açılışta kullanılmalı.' };
    }
    return { ...base, ok: true, exempt };
  }

  // Bir taş hangi perlere işlenebilir? → [{ meldId, ends:['low'|'high'] }]
  layoffTargets(seat, tile) {
    const s = this.s;
    if (!this.is101 || s.opened[seat] === 'none') return [];
    const out = [];
    for (const m of s.melds) {
      if (m.kind === 'pair') continue;
      const ends = [];
      if (m.kind === 'set') {
        if (extendMeld(m, tile, s.ctx, { wrapHigh: this.wrapHigh }).ok) ends.push('high');
      } else {
        for (const e of ['low', 'high']) {
          const r = extendMeld(m, tile, s.ctx, { wrapHigh: this.wrapHigh, end: e });
          if (r.ok && r.end === e) ends.push(e);
        }
      }
      if (ends.length) out.push({ meldId: m.id, ends });
    }
    return out;
  }

  // Tile herhangi bir masa perine işlenebiliyor mu? (işlek taş)
  isUseful(tile) {
    const s = this.s;
    for (const m of s.melds) {
      if (m.kind === 'pair') continue;
      if (extendMeld(m, tile, s.ctx, { wrapHigh: this.wrapHigh }).ok) return true;
    }
    return false;
  }

  // Klasik: bu taşı atarak bitirebilir mi? → { kind, groups } | null
  finishInfo(seat, tile) {
    const s = this.s;
    const hand = s.hands[seat];
    if (hand.length !== 15 || !hand.includes(tile)) return null;
    const rest = hand.filter((t) => t !== tile);
    const pairs = findPairsFinish(rest, s.ctx);
    if (pairs) return pairs;
    return partitionAll(rest, s.ctx, { wrapHigh: true });
  }

  // Klasik: hangi taşla bitirebilir?
  finishingTiles(seat) {
    const s = this.s;
    if (s.rules.mode !== 'okey' || s.status !== 'playing' || s.turn.seat !== seat || s.turn.needsDraw) return [];
    const hand = s.hands[seat];
    if (hand.length !== 15) return [];
    return hand.filter((t) => this.finishInfo(seat, t));
  }

  // Bot / arayüz için herkese açık görünüm (rakip elleri gizli)
  view(seat) {
    const s = this.s;
    return {
      seat,
      rules: s.rules,
      round: s.round,
      status: s.status,
      scores: s.scores.slice(),
      ctx: s.ctx,
      hand: s.hands[seat].slice(),
      handCounts: s.hands.map((h) => h.length),
      stockCount: s.stock.length,
      discards: s.discards.map((d) => d.slice()),
      lastDiscard: s.lastDiscard ? { ...s.lastDiscard } : null,
      melds: structuredClone(s.melds),
      opened: s.opened.slice(),
      openingMax: { ...s.openingMax },
      turn: { ...s.turn, layoff: { ...s.turn.layoff } },
      shownIndicator: s.shownIndicator.slice(),
      firstActionTaken: s.firstActionTaken.slice(),
      log: s.log.slice(-200).map((e) => (e.type === 'draw' && e.seat !== seat ? { ...e, tile: undefined } : { ...e })),
      result: s.result ? structuredClone(s.result) : null,
    };
  }

  // --- eylemler -------------------------------------------------------------------------------

  apply(seat, action) {
    const s = this.s;
    if (action.type === 'NEXT_ROUND') return this._nextRound(seat);
    if (s.status !== 'playing') return err('El sona erdi.');
    if (s.turn.seat !== seat) return err('Sıra sende değil.');
    this._out = [];
    let res;
    switch (action.type) {
      case 'SHOW_INDICATOR':
        res = this._showIndicator(seat, action);
        break;
      case 'DRAW_STOCK':
      case 'TAKE_SIDE':
        res = this._draw(seat, action.type);
        break;
      case 'RETURN_SIDE':
        res = this._returnSide(seat);
        break;
      case 'OPEN':
        res = this._open(seat, action);
        break;
      case 'LAYOFF':
        res = this._layoff(seat, action);
        break;
      case 'LAY_PAIR':
        res = this._layPair(seat, action);
        break;
      case 'RECLAIM_OKEY':
        res = this._reclaim(seat, action);
        break;
      case 'DISCARD':
      case 'FINISH':
        res = this._discard(seat, action);
        break;
      default:
        res = err('Bilinmeyen hamle.');
    }
    const events = this._out;
    this._out = null;
    if (res && res.error && !res.penaltyApplied) return { ok: false, error: res.error, events };
    return { ok: !res.error, error: res.error, events };
  }

  _showIndicator(seat, a) {
    const s = this.s;
    if (s.rules.mode !== 'okey' || s.firstActionTaken[seat] || s.shownIndicator[seat]) return err('Gösterge yalnız ilk çekişten önce gösterilebilir.');
    const t = a.tile;
    const ind = s.ctx.indicator;
    if (!s.hands[seat].includes(t) || isFake(t) || colorOf(t) !== colorOf(ind) || valueOf(t) !== valueOf(ind) || t === ind) {
      return err('Gösterge eşi elinde yok.');
    }
    s.shownIndicator[seat] = true;
    for (let o = 0; o < 4; o++) if (o !== seat) s.scores[o] -= 1;
    this._emit('indicator', { seat, tile: t });
    return {};
  }

  _draw(seat, type) {
    const s = this.s;
    const t = s.turn;
    if (!t.needsDraw) return err('Bu tur zaten taş aldın.');
    if (type === 'TAKE_SIDE') {
      const tile = this.sideTile(seat);
      if (tile === null) return err('Yandan alınabilecek taş yok.');
      const prev = prevSeat(seat);
      s.discards[prev].pop();
      s.hands[seat].push(tile);
      t.source = 'side';
      t.sideTile = tile;
      t.sideFrom = prev;
      t.sidePenalized = s.lastDiscard.penalized;
      t.needsDraw = false;
      s.firstActionTaken[seat] = true;
      this._emit('take', { seat, tile, from: prev });
      return {};
    }
    if (s.stock.length === 0) {
      this._endRound(null, 'stock', null);
      return {};
    }
    const tile = s.stock.shift();
    s.hands[seat].push(tile);
    t.source = 'stock';
    t.needsDraw = false;
    s.firstActionTaken[seat] = true;
    this._emit('draw', { seat, tile, from: 'stock' });
    return {};
  }

  _returnSide(seat) {
    const s = this.s;
    const t = s.turn;
    if (!this.is101) return err('Bu modda yandan alınan taş geri bırakılamaz.');
    if (t.source !== 'side' || t.sideCommitted || t.sideTile === null || t.sideFrom === null) return err('Geri bırakılacak yandan taş yok.');
    const tile = t.sideTile;
    const from = t.sideFrom;
    const hi = s.hands[seat].indexOf(tile);
    s.hands[seat].splice(hi, 1);
    s.discards[from].push(tile);
    this._emit('return', { seat, tile, to: from });
    t.source = null;
    t.sideTile = null;
    t.sideFrom = null;
    t.needsDraw = true;
    if (s.stock.length === 0) {
      this._endRound(null, 'stock', null);
      return {};
    }
    const drawn = s.stock.shift();
    s.hands[seat].push(drawn);
    t.source = 'stock';
    t.needsDraw = false;
    this._emit('draw', { seat, tile: drawn, from: 'stock' });
    return {};
  }

  _open(seat, a) {
    const s = this.s;
    const t = s.turn;
    if (t.needsDraw) return err('Önce taş çekmelisin.');
    if (!this.is101) return err('Bu modda açma yok.');
    const already = s.opened[seat] !== 'none';
    if (already && (!s.rules.meldAfterOpen || s.opened[seat] === 'pairs')) {
      return err(s.opened[seat] === 'pairs' ? 'Çift açanlar yalnızca çift işleyebilir.' : 'Bu el zaten açıldı.');
    }
    const ev = this.evaluateOpening(seat, a.groups || []);
    if (!ev.ok) {
      if (!already && s.rules.invalidOpenPenalty) {
        this._penalize(seat, 101, 'Yanlış açma');
        return { error: ev.reason, penaltyApplied: true };
      }
      return err(ev.reason);
    }
    const placed = [];
    for (const m of ev.melds) {
      const meld = { ...m, id: `m${s.nextMeldId++}`, owner: seat, placedBy: Object.fromEntries(m.tiles.map((x) => [x.t, seat])) };
      s.melds.push(meld);
      placed.push(meld);
    }
    for (const id of ev.tiles) s.hands[seat].splice(s.hands[seat].indexOf(id), 1);
    if (!already) {
      s.opened[seat] = ev.kind;
      if (ev.kind === 'sets') s.openingMax.sets = Math.max(s.openingMax.sets, ev.points);
      else s.openingMax.pairs = Math.max(s.openingMax.pairs, ev.count);
    }
    this._commitSide(ev.tiles, ev.kind === 'pairs' ? 20 : 10);
    this._emit('open', { seat, openKind: ev.kind, points: ev.points, count: ev.count, additional: already, melds: structuredClone(placed) });
    if (!already && s.opened.every((o) => o === 'pairs')) this._endRound(null, 'allPairs', null);
    return {};
  }

  _layoff(seat, a) {
    const s = this.s;
    const t = s.turn;
    if (t.needsDraw) return err('Önce taş çekmelisin.');
    if (!this.is101 || s.opened[seat] === 'none') return err('İşlemek için önce el açmalısın.');
    if (s.hands[seat].length <= 1) return err('Bitirmek için elde atılacak son taş kalmalı.');
    const meld = s.melds.find((m) => m.id === a.meldId);
    if (!meld) return err('Per bulunamadı.');
    if (!s.hands[seat].includes(a.tile)) return err('Bu taş elinde yok.');
    const limit = s.rules.layoffLimit;
    if (limit > 0 && (t.layoff[meld.id] || 0) >= limit) return err('Bu pere bu tur daha fazla taş işlenemez.');
    const r = extendMeld(meld, a.tile, s.ctx, { wrapHigh: this.wrapHigh, end: a.end });
    if (!r.ok) return err(r.reason);
    this._commitSide([a.tile], 0);
    meld.tiles = r.meld.tiles;
    if (r.meld.start !== undefined) meld.start = r.meld.start;
    meld.placedBy[a.tile] = seat;
    s.hands[seat].splice(s.hands[seat].indexOf(a.tile), 1);
    t.layoff[meld.id] = (t.layoff[meld.id] || 0) + 1;
    this._emit('layoff', { seat, tile: a.tile, meldId: meld.id, end: r.end });
    return {};
  }

  _layPair(seat, a) {
    const s = this.s;
    const t = s.turn;
    if (t.needsDraw) return err('Önce taş çekmelisin.');
    if (!this.is101 || s.opened[seat] === 'none' || !s.opened.includes('pairs')) return err('Çift işlemek için masada çift açılmış olmalı.');
    if (s.hands[seat].length <= 2) return err('Bitirmek için elde atılacak son taş kalmalı.');
    const ids = a.tiles;
    if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1] || ids.some((x) => !s.hands[seat].includes(x))) return err('Taşlar elinde yok.');
    const m = buildMeld('pair', ids, s.ctx);
    if (!m) return err('Çift aynı renk ve sayıdaki iki taş olmalı.');
    this._commitSide(ids, 20);
    for (const id of ids) s.hands[seat].splice(s.hands[seat].indexOf(id), 1);
    const meld = { ...m, id: `m${s.nextMeldId++}`, owner: seat, placedBy: Object.fromEntries(ids.map((x) => [x, seat])) };
    s.melds.push(meld);
    this._emit('pair', { seat, meld: structuredClone(meld) });
    return {};
  }

  _reclaim(seat, a) {
    const s = this.s;
    const t = s.turn;
    if (t.needsDraw) return err('Önce taş çekmelisin.');
    if (!s.rules.reclaimOkey) return err('Bu masada yerdeki okey geri alınamaz.');
    if (!this.is101 || s.opened[seat] === 'none') return err('Yerdeki okey için önce el açmalısın.');
    const meld = s.melds.find((m) => m.id === a.meldId);
    if (!meld) return err('Per bulunamadı.');
    if (!s.hands[seat].includes(a.replacement)) return err('Temsil edilen taş elinde yok.');
    const r = reclaimJoker(meld, a.jokerTile, a.replacement, s.ctx);
    if (!r.ok) return err(r.reason);
    this._commitSide([a.replacement], 0);
    const placer = meld.placedBy[a.jokerTile];
    meld.tiles = r.meld.tiles;
    delete meld.placedBy[a.jokerTile];
    meld.placedBy[a.replacement] = seat;
    s.hands[seat].splice(s.hands[seat].indexOf(a.replacement), 1);
    s.hands[seat].push(a.jokerTile);
    this._emit('reclaim', { seat, meldId: meld.id, joker: a.jokerTile, replacement: a.replacement });
    if (s.rules.reclaimPenalty && placer !== undefined && (placer !== seat || s.rules.reclaimSelfPenalty)) this._penalize(placer, 101, 'Masadaki okeyi geri aldırdı');
    return {};
  }

  _discard(seat, a) {
    const s = this.s;
    const t = s.turn;
    const finish = a.type === 'FINISH';
    const hand = s.hands[seat];
    if (t.needsDraw) return err('Önce taş çekmelisin.');
    if (!hand.includes(a.tile)) return err('Atılacak taş elinde yok.');
    let finishInfo = null;
    if (this.is101) {
      if (t.source === 'side' && !t.sideCommitted) return err('Yandan aldığın taşı açma veya işlemeye katmalısın; kullanamıyorsan geri bırak.');
      if (finish && (hand.length !== 1 || s.opened[seat] === 'none')) return err('Bitmek için açmış olmalı ve son taşı atmalısın.');
      if (!finish && hand.length === 1) return err('Bu son taş; Bitir düğmesini kullan.');
    } else if (finish) {
      finishInfo = this.finishInfo(seat, a.tile);
      if (!finishInfo) return err('Kalan 14 taş geçerli bir bitiş eli oluşturmuyor.');
    }
    const joker = isOkey(a.tile, s.ctx);
    const useful = this.is101 && !finish && s.rules.discardUsefulPenalty && this.isUseful(a.tile);
    // --- değiştir ---
    hand.splice(hand.indexOf(a.tile), 1);
    s.discards[seat].push(a.tile);
    let penalized = false;
    if (!finish && this.is101) {
      if (joker && s.rules.discardOkeyPenalty) {
        this._penalize(seat, 101, 'Gerçek okey attı');
        penalized = true;
      } else if (useful) {
        this._penalize(seat, 101, 'İşlek taş attı');
        penalized = true;
      }
    }
    s.lastDiscard = { seat, tile: a.tile, penalized };
    s.firstActionTaken[seat] = true;
    this._emit(finish ? 'finishDiscard' : 'discard', { seat, tile: a.tile, penalized });
    if (finish) {
      let kind;
      if (this.is101) {
        const pairsOpen = s.opened[seat] === 'pairs';
        const kafa = t.initialMeldCount === 0 && s.melds.length > 0 && s.opened.every((o, i) => i === seat || o === 'none');
        kind = kafa ? (joker ? 'kafaOkey' : 'kafa') : pairsOpen ? (joker ? 'pairsOkey' : 'pairs') : joker ? 'okey' : 'normal';
      } else {
        const pairs = finishInfo.kind === 'pairs';
        kind = pairs ? (joker ? 'pairsOkey' : 'pairs') : joker ? 'okey' : 'normal';
      }
      this._endRound(seat, 'finish', kind, finishInfo);
    } else {
      s.turn = newTurn(nextSeat(seat), true, s.melds.length);
      this._emit('turn', { seat: s.turn.seat });
    }
    return {};
  }

  // Klasik tek renk bitişi: doğal taşların tamamı aynı renk ve el yalnızca seri/çiftlerden oluşuyor mu?
  _isColorFinish(hand) {
    const s = this.s;
    let color = -1;
    for (const t of hand) {
      if (isOkey(t, s.ctx)) continue;
      const c = isFake(t) ? s.ctx.oc : colorOf(t);
      if (color < 0) color = c;
      else if (color !== c) return false;
    }
    if (color < 0) return false;
    if (findPairsFinish(hand, s.ctx)) return true;
    return !!partitionAll(hand, s.ctx, { wrapHigh: true, noSets: true });
  }

  _endRound(winner, reason, finish, finishInfo = null) {
    const s = this.s;
    let deltas;
    let breakdown = null;
    let multiplier = 1;
    if (this.is101) {
      const r = settle101({ rules: s.rules, ctx: s.ctx, hands: s.hands, opened: s.opened, roundPenalties: s.roundPenalties, winner, reason, finish });
      deltas = r.deltas;
      breakdown = r.breakdown;
      multiplier = r.multiplier;
    } else {
      const colorFinish = !!(s.rules.colorFinish && winner !== null && this._isColorFinish(s.hands[winner]));
      deltas = settleClassic({ winner, finish, colorFinish });
      multiplier = colorFinish ? 2 : 1;
    }
    s.scores = s.scores.map((v, i) => v + deltas[i]);
    const matchOver = this.is101
      ? s.round >= s.rules.rounds
      : s.rules.matchType === 'single' || s.scores.some((v) => v <= 0);
    s.status = matchOver ? 'matchOver' : 'roundOver';
    s.result = {
      winner,
      reason,
      finish,
      deltas,
      totals: s.scores.slice(),
      penalties: s.penaltyReasons.map((p) => ({ ...p })),
      breakdown,
      multiplier,
      handsAtEnd: s.hands.map((h) => h.slice()),
      winningGroups: finishInfo ? structuredClone(finishInfo.groups) : null,
      matchOver,
      round: s.round,
    };
    this._emit('roundEnd', { winner, reason, finish, matchOver });
  }

  _nextRound(seat) {
    const s = this.s;
    if (seat !== 0 || s.status !== 'roundOver') return err('Yeni ele henüz geçilemez.');
    this._out = [];
    const seed = mixSeed(s.seed, s.round + 1);
    const next = createRoundState(s.rules, seed, s.round + 1, s.scores, nextSeat(s.starter));
    next.seq = s.seq;
    this.s = next;
    this._emit('deal', { round: next.round, starter: next.starter });
    const events = this._out;
    this._out = null;
    return { ok: true, events };
  }
}

function describeInvalid(kind, ids, ctx) {
  if (kind === 'pair') return 'çift aynı renk ve sayıdaki iki taş olmalı';
  if (kind === 'set') return ids.length > 4 ? 'grup en çok 4 taş' : ids.length < 3 ? 'en az 3 taş' : 'aynı sayı, farklı renkler';
  if (kind === 'run') return ids.length < 3 ? 'en az 3 taş' : 'aynı renk, ardışık sayılar';
  return 'bilinmeyen tür';
}

// Durum değişmezleri. Hata varsa açıklama döner, yoksa null.
export function checkInvariants(s) {
  try {
    if (!s || s.v !== 1) return 'sürüm';
    if (!s.rules || !['okey', 'okey101'].includes(s.rules.mode)) return 'mod';
    if (!Array.isArray(s.hands) || s.hands.length !== 4) return 'eller';
    const all = [...s.hands.flat(), ...s.stock, s.ctx.indicator, ...s.discards.flat(), ...s.melds.flatMap((m) => meldTileIds(m))];
    if (all.length !== TILE_COUNT || new Set(all).size !== TILE_COUNT) return `taş sayısı/tekrar (${all.length}, ${new Set(all).size})`;
    if (all.some((t) => !Number.isInteger(t) || t < 0 || t >= TILE_COUNT)) return 'taş kimliği';
    if (isFake(s.ctx.indicator)) return 'gösterge';
    const ctx = makeCtx(s.ctx.indicator);
    if (ctx.oc !== s.ctx.oc || ctx.ov !== s.ctx.ov) return 'okey bağlamı';
    if (!['playing', 'roundOver', 'matchOver'].includes(s.status)) return 'durum';
    if (!(s.turn && Number.isInteger(s.turn.seat) && s.turn.seat >= 0 && s.turn.seat < 4)) return 'sıra';
    if (!Array.isArray(s.scores) || s.scores.length !== 4 || s.scores.some((v) => !Number.isFinite(v))) return 'skor';
    const wrap = wrapFor(s.rules);
    for (const m of s.melds) if (!checkMeldStructure(m, ctx, { wrapHigh: wrap })) return 'per yapısı ' + m.id;
    if (s.status === 'playing') {
      const per = s.rules.mode === 'okey101' ? 21 : 14;
      if (s.rules.mode === 'okey') {
        for (let i = 0; i < 4; i++) {
          const want = per + (i === s.turn.seat && !s.turn.needsDraw ? 1 : 0);
          if (s.hands[i].length !== want) return 'el boyutu';
        }
      }
    }
    return null;
  } catch (e) {
    return 'istisna: ' + (e && e.message);
  }
}

export { handValue };
