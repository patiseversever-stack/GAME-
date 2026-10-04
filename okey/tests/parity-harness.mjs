// Diferansiyel test: yeni motor ↔ orijinal (legacy) motor.
// Aynı dağıtımı iki motorda paralel oynatır; orijinal botun kararları + rastgele geçerli/geçersiz hamleler
// uygulanır, her adımda sonuçlar (hata/başarı, eller, perler, sıra, puanlar, cezalar) karşılaştırılır.
//
// Bilinçli sapmalar (yeni motorun düzelttiği orijinal hatalar) `expectedDivergence` ile ayrıştırılır ve sayılır.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createRng } from '../src/util/rng.js';
import { Game, createRoundState, normalizeRules } from '../src/game/game.js';
import { tileId, colorOf, valueOf, isFake, isOkey, makeCtx, COLORS, copyOf } from '../src/game/tiles.js';
import { checkMeldStructure } from '../src/game/melds.js';
import { partitionAll, findPairsFinish, findBest } from '../src/game/solver.js';
import { buildMeld } from '../src/game/melds.js';
import { randomHand, constructedHand } from './helpers.mjs';

const require = createRequire(import.meta.url);
const L = require('./legacy/legacy-engine.cjs');

const toInt = (s) => (s.startsWith('fake') ? 104 + Number(s.split('-')[1]) : tileId(COLORS.indexOf(s.split('-')[0]), Number(s.split('-')[1]), Number(s.split('-')[2])));
const toStr = (t) => (t >= 104 ? `fake-${t - 104}` : `${COLORS[colorOf(t)]}-${valueOf(t)}-${copyOf(t)}`);

export const FULL = !!process.env.PARITY_FULL;
export { L, toInt, toStr };
// --- Oyun akışı paritesi -----------------------------------------------------------------------

function legacyRules(mode, extra = {}) {
  return { mode, opening: 'fixed', rounds: 5, colorFinish: false, sideTakePenalty: true, reclaimOkey: true, stockSettlement: 'hand', allPairsSettlement: 'none', kafaOkeyAward: 404, ...extra };
}

function toNewGame(Lg) {
  const r = Lg.rules;
  const rules = normalizeRules({
    mode: r.mode === 'normal' ? 'okey' : 'okey101',
    opening: r.opening,
    rounds: r.rounds,
    colorFinish: r.colorFinish,
    sideTakePenalty: r.sideTakePenalty,
    reclaimOkey: r.reclaimOkey,
    stockSettlement: r.stockSettlement,
    allPairsSettlement: r.allPairsSettlement,
    kafaOkeyAward: r.kafaOkeyAward,
    matchType: 'score',
    startScore: 20,
    // paritesi bayrakları: orijinalin davranışı
    layoffLimit: 3,
    meldAfterOpen: false,
    invalidOpenPenalty: true,
    wrapHigh101: false,
    reclaimPenalty: true,
    reclaimSelfPenalty: true,
    discardOkeyPenalty: true,
    discardUsefulPenalty: true,
    sideTakeFlat: true,
  });
  const deal = { hands: Lg.hands.map((h) => h.map(toInt)), stock: Lg.stock.map(toInt), indicator: toInt(Lg.indicator) };
  const st = createRoundState(rules, Lg.seed, Lg.round, Lg.scores, Lg.starter, deal);
  return new Game(st);
}

function toNewAction(a, Lg) {
  switch (a.type) {
    case 'RETURN_SIDE_AND_DRAW':
      return { type: 'RETURN_SIDE' };
    case 'OPEN':
      return { type: 'OPEN', groups: a.groups.map((g) => ({ kind: g.kind, tiles: g.tiles.map((x) => toInt(x.tileId)) })) };
    case 'LAYOFF':
      return { type: 'LAYOFF', meldId: a.meldId, tile: toInt(a.tile.tileId) };
    case 'LAY_PAIR':
      return { type: 'LAY_PAIR', tiles: a.tiles.map((x) => toInt(x.tileId)) };
    case 'RECLAIM_OKEY':
      return { type: 'RECLAIM_OKEY', meldId: a.meldId, jokerTile: toInt(a.jokerTileId), replacement: toInt(a.replacementTileId) };
    case 'DISCARD':
    case 'FINISH':
    case 'SHOW_INDICATOR':
      return { type: a.type, tile: toInt(a.tileId) };
    default:
      return { type: a.type };
  }
}

const sortNum = (a) => a.slice().sort((x, y) => x - y);

function snapLegacy(g) {
  return {
    status: g.status,
    turnSeat: g.turn.seat,
    needsDraw: g.turn.needsDraw,
    source: g.turn.source,
    hands: g.hands.map((h) => sortNum(h.map(toInt))),
    stock: g.stock.map(toInt),
    discards: g.discards.map((d) => d.map(toInt)),
    melds: g.melds.map((m) => ({ id: m.id, owner: m.owner, kind: m.kind, tiles: sortNum(m.tiles.map((x) => toInt(x.tileId))) })),
    opened: g.opened.slice(),
    scores: g.scores.slice(),
    penalties: g.penaltyReasons.map((p) => `${p.seat}:${p.points}`).sort(),
    openingMax: { ...g.openingMax },
    round: g.round,
  };
}

function snapNew(game) {
  const g = game.state;
  return {
    status: g.status,
    turnSeat: g.turn.seat,
    needsDraw: g.turn.needsDraw,
    source: g.turn.source,
    hands: g.hands.map((h) => sortNum(h)),
    stock: g.stock.slice(),
    discards: g.discards.map((d) => d.slice()),
    melds: g.melds.map((m) => ({ id: m.id, owner: m.owner, kind: m.kind, tiles: sortNum(m.tiles.map((x) => x.t)) })),
    opened: g.opened.slice(),
    scores: g.scores.slice(),
    penalties: g.penaltyReasons.map((p) => `${p.seat}:${p.points}`).sort(),
    openingMax: { ...g.openingMax },
    round: g.round,
  };
}

function candidateActions(Lg, seat, rng) {
  const acts = [];
  const hand = Lg.hands[seat];
  if (Lg.turn.needsDraw) {
    acts.push({ type: 'DRAW_STOCK' }, { type: 'TAKE_SIDE' });
    if (rng.chance(0.05)) acts.push({ type: 'DISCARD', tileId: rng.pick(hand) });
    return acts;
  }
  let botAct = null;
  try {
    botAct = L.botDecide(L.botView(Lg, seat));
  } catch {
    botAct = null;
  }
  if (botAct) for (let i = 0; i < 6; i++) acts.push(botAct);
  acts.push({ type: 'DISCARD', tileId: rng.pick(hand) }, { type: 'FINISH', tileId: rng.pick(hand) });
  if (Lg.rules.mode === 'normal') {
    const ind = L.tileInfo(Lg.indicator);
    const twin = hand.find((id) => {
      const x = L.tileInfo(id);
      return x.kind === 'number' && x.color === ind.color && x.value === ind.value;
    });
    acts.push({ type: 'SHOW_INDICATOR', tileId: twin || rng.pick(hand) });
  } else {
    acts.push({ type: 'RETURN_SIDE_AND_DRAW' });
    // rastgele açılış denemesi
    const k = 3 + rng.int(3);
    const pick = rng.shuffle(hand).slice(0, k);
    acts.push({ type: 'OPEN', groups: [{ kind: rng.pick(['set', 'run']), tiles: pick.map((tileId) => ({ tileId })) }] });
    // bot'un geçerli açılışı
    const best = L.bestOpen({ indicator: Lg.indicator, rules: Lg.rules, openingMax: Lg.openingMax }, hand, undefined);
    if (best) acts.push({ type: 'OPEN', groups: best.groups });
    // işleme
    for (let i = 0; i < 4; i++) {
      if (Lg.melds.length) {
        const m = rng.pick(Lg.melds);
        acts.push({ type: 'LAYOFF', meldId: m.id, tile: { tileId: rng.pick(hand) } });
      }
    }
    // çift işleme
    if (hand.length > 2) {
      const a = rng.pick(hand);
      const b = rng.pick(hand.filter((x) => x !== a));
      acts.push({ type: 'LAY_PAIR', tiles: [{ tileId: a }, { tileId: b }] });
    }
    // okey geri alma
    for (const m of Lg.melds) {
      const j = m.tiles.find((x) => x.as);
      if (!j) continue;
      const rep = hand.find((id) => {
        const f = L.repr(id, Lg.indicator);
        return f && !L.isOkey(id, Lg.indicator) && f.color === j.as.color && f.value === j.as.value;
      });
      acts.push({ type: 'RECLAIM_OKEY', meldId: m.id, jokerTileId: j.tileId, replacementTileId: rep || rng.pick(hand) });
    }
  }
  return acts;
}

// Belirsiz okey temsili: oyuncunun dizilişi (ya da işlenen okeyin ucu) belirsizse yeni motor en çok puan getiren
// yorumu / üst ucu seçer, orijinal alt ucu. İkisi de kurala uygun; sonraki işleme/işlek taş kararları bu yüzden ayrışabilir.
function jokerRepsDiffer(Lg, mine) {
  const rep = (tiles) => tiles.filter((x) => x.as).map((x) => `${toInt(x.tileId)}:${COLORS.indexOf(x.as.color)}:${x.as.value}`).sort().join(',');
  const repN = (tiles) => tiles.filter((x) => x.j).map((x) => `${x.t}:${x.c}:${x.v}`).sort().join(',');
  return Lg.melds.some((m) => {
    const n = mine.state.melds.find((x) => x.id === m.id);
    return n && rep(m.tiles) !== repN(n.tiles);
  });
}

// Orijinalin bilinen hatası: okeyli bir seriye uç taş eklerken temsili yeniden çözüp reddedebiliyor.
function expectedDivergence(Lg, seat, a, legacyErr, newOk) {
  if (!newOk || !legacyErr) return false;
  if (a.type === 'LAYOFF') {
    const m = Lg.melds.find((x) => x.id === a.meldId);
    return !!m && m.kind === 'run' && m.tiles.some((x) => x.as);
  }
  return false;
}

export function runParity(mode, gameCount, baseSeed, extraRules = {}) {
  const rng = createRng(baseSeed);
  let steps = 0;
  let divergent = 0;
  const kinds = {};
  for (let gi = 0; gi < gameCount; gi++) {
    let Lg = L.newGame(legacyRules(mode, extraRules), (rng.int(1e9) + 1) >>> 0);
    let mine = toNewGame(Lg);
    for (let step = 0; step < 420; step++) {
      if (Lg.status !== 'playing') {
        // tur sonu: skorlar eşit mi?
        assert.deepEqual(mine.state.scores, Lg.scores, `skor farkı oyun ${gi}`);
        assert.equal(mine.state.result.winner, Lg.result.winner);
        assert.equal(mine.state.result.finish, Lg.result.finish, `bitiş türü oyun ${gi}`);
        assert.deepEqual(mine.state.result.deltas, Lg.result.deltas, `delta farkı oyun ${gi} finish=${Lg.result.finish}`);
        kinds[Lg.result.finish || Lg.result.reason] = (kinds[Lg.result.finish || Lg.result.reason] || 0) + 1;
        if (Lg.status === 'roundOver') {
          const r = L.apply(Lg, 0, { type: 'NEXT_ROUND' });
          Lg = r.state;
          mine = toNewGame(Lg);
          continue;
        }
        break;
      }
      const seat = Lg.turn.seat;
      const cands = candidateActions(Lg, seat, rng);
      const a = rng.pick(cands);
      const before = JSON.stringify(snapLegacy(Lg));
      const lr = L.apply(Lg, seat, a);
      const mr = mine.apply(seat, toNewAction(a, Lg));
      steps++;
      const legacyOk = !lr.error;
      if (legacyOk !== mr.ok) {
        if (expectedDivergence(Lg, seat, a, !legacyOk, mr.ok)) {
          divergent++;
          // yeni motor kabul etti; orijinal reddetti → bu oyunu bırak (durumlar ayrıştı)
          break;
        }
        assert.fail(`Başarı paritesi oyun ${gi} adım ${step} mod=${mode} seat=${seat} action=${JSON.stringify(a)} legacy=${lr.error} mine=${mr.error}\nönce=${before}`);
      }
      // ceza uygulanmış olabilir: durumları karşılaştır
      const sl = snapLegacy(lr.state);
      const sn = snapNew(mine);
      try {
        assert.deepEqual(sn, sl);
      } catch (e) {
        const err = new Error(`Durum farkı oyun ${gi} adım ${step} mod=${mode} seat=${seat} action=${JSON.stringify(a)} legacyErr=${lr.error}\n${e.message.slice(0, 1500)}`);
        err.details = { before, legacy: sl, mine: sn, action: a, seat, legacyErr: lr.error, mineErr: mr.error, events: mr.events, legacyBefore: Lg };
        throw err;
      }
      assert.equal(checkInvariantsLite(mine), null);
      Lg = lr.state;
      if ((a.type === 'OPEN' || a.type === 'LAYOFF') && jokerRepsDiffer(Lg, mine)) {
        divergent++;
        break;
      }
    }
  }
  return { steps, divergent, kinds };
}

function checkInvariantsLite(game) {
  const s = game.state;
  const ctx = s.ctx;
  for (const m of s.melds) if (!checkMeldStructure(m, ctx, { wrapHigh: game.wrapHigh })) return 'per yapısı bozuk ' + m.id;
  return null;
}
