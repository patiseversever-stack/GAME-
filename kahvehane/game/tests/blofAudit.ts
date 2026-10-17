// Blöf denetim simülatörü: botları (ve isteğe bağlı bir "insan vekili" koltuğunu) saf motor üzerinde, ev sahibinin
// akışını taklit eden bir zaman çizelgesiyle oynatır ve ölçer: el süresi (animasyon + düşünme + 5 sn pencereler),
// pas serileri, kenara giden kartlar, blöf/yakalama oranları, son kart davranışı, insanın boşta bekleme süresi ve
// botların "salak" sayılacak kararları (ör. tek kartı kalan rakibe turu bedava açtıran pas).
// Testler (tests/blofAudit.test.ts) ve docs/BOTS.md'deki ölçümler bunu kullanır. Botlar yalnız süzülmüş olay + görünüm görür.
import {BlofBot, type BlofDifficulty} from '../src/ai/blofBot';
import {actors, applyBlof, checkBlofInvariants, createBlof, redactBlofEvent, viewFor} from '../src/core/blof';
import type {BlofAction, BlofConfig, BlofEvent, BlofState, BlofView} from '../src/core/blofTypes';
import {mulberry32} from '../src/core/rng';
import {rankOf} from '../src/core/types';

/** Koltuk: bot zorluğu ya da insan vekili (kararları bir bot beyni ya da 'casual' kural seti verir; zamanlaması insan gibi). */
export type AuditSeat = BlofDifficulty | {human: BlofDifficulty | 'casual'};

/** Karar veren beyin (BlofBot ya da sabit kurallı insan vekili). */
interface Brain {
  observe(e: BlofEvent): void;
  decide(v: BlofView): {action: BlofAction; delayMs: number} | null;
}

/**
 * Sıradan kahvehane oyuncusu (sabit kurallar, kart saymaz; yalnız kendi elini ve masadaki iddiaları görür):
 * en kalabalık değerini doğru açar (ara sıra bir yalan kart katar), değer elindeyse doğru atar, yoksa ara sıra tek kart blöf yapar;
 * son karta hep "Blöf!" der, kendi elinden kesin yalanı ve masadaki 4'ü aşan iddiayı yakalar, gerisinde arada bir şansını dener.
 */
export class CasualHuman implements Brain {
  private readonly rnd: () => number;
  constructor(readonly seat: number, seed: number) {
    this.rnd = mulberry32(seed);
  }
  observe(): void {}
  decide(v: BlofView): {action: BlofAction; delayMs: number} | null {
    const me = this.seat;
    const hand = v.hand;
    const cnt = new Array<number>(14).fill(0);
    for (const c of hand) cnt[rankOf(c)]++;
    const of = (r: number) => hand.filter((c) => rankOf(c) === r).slice(0, 4);
    const junk = (r: number, k: number) => {
      const pool = hand.filter((c) => rankOf(c) !== r).sort((a, b) => cnt[rankOf(a)] - cnt[rankOf(b)] || a - b);
      return pool.slice(0, k);
    };
    if (v.canChallenge && v.window) {
      const w = v.window;
      if (w.final) return {action: {t: 'challenge', seat: me}, delayMs: 1000};
      const mine = cnt[w.rank];
      let prev = 0;
      for (let i = 0; i < v.roundPlays.length - 1; i++) prev += v.roundPlays[i].count;
      const opening = v.roundPlays.length === 1;
      let p = opening ? 0.06 : w.count === 1 ? 0.22 : 0.4;
      if (v.seats === 2) p *= 1.3;
      if (mine + w.count > 4) p = 1;
      else if (prev + w.count + mine > 4) p = 0.85;
      return this.rnd() < p ? {action: {t: 'challenge', seat: me}, delayMs: 1200} : {action: {t: 'decline', seat: me}, delayMs: 1200};
    }
    if (!v.myTurn) return null;
    if (v.mustOpen) {
      let best = 0;
      for (let r = 1; r <= 13; r++) if (cnt[r] > (best ? cnt[best] : 0) || (cnt[r] === cnt[best] && cnt[r] > 0 && this.rnd() < 0.5)) best = r;
      const cards = of(best);
      if (cards.length === hand.length) return {action: {t: 'open', seat: me, rank: best, cards}, delayMs: 3000};
      if (cards.length < 4 && hand.length - cards.length >= 2 && this.rnd() < 0.12) cards.push(...junk(best, 1));
      return {action: {t: 'open', seat: me, rank: best, cards}, delayMs: 3000};
    }
    const r = v.rank;
    if (cnt[r] > 0) return {action: {t: 'play', seat: me, cards: of(r)}, delayMs: 2500};
    let claimed = 0;
    for (const pl of v.roundPlays) claimed += pl.count;
    const last = v.lastPlay?.seat ?? -1;
    const lastMate = last >= 0 && v.teams[last] === v.teams[me];
    const desperate = last >= 0 && !lastMate && v.handCounts[last] === 1 && v.passes === v.seats - 2;
    const p = desperate ? 1 : lastMate ? 0.1 : v.seats === 2 ? 0.7 : 0.45;
    const impossible = claimed + 1 > 4 && this.rnd() < 0.8;
    if (hand.length >= 2 && !impossible && this.rnd() < p) return {action: {t: 'play', seat: me, cards: junk(r, 1)}, delayMs: 2500};
    if (desperate) return {action: {t: 'play', seat: me, cards: junk(r, 1)}, delayMs: 2500};
    return {action: {t: 'pass', seat: me}, delayMs: 1500};
  }
}

/** Sunum süreleri (ms) — blofMatch/blofTable animasyonlarının kabaca toplamı. */
export const PRESENT_MS = {
  deal: 3600,
  play: 620,
  playPerCard: 55,
  final: 500,
  pass: 330,
  cleared: 950,
  challenge: 420,
  reveal: 950,
  revealPerCard: 265,
  take: 650,
  takePerCard: 25,
  /** 3–4 kişide yakalanan blöf sonrası botlar arası atışma (ack bekletilir) ortalaması. */
  banter: 900,
};

export interface HandMetrics {
  seats: number;
  esli: boolean;
  winner: number;
  winnerTeam: number;
  /** Tahmini süre (sn): sunum + düşünme + pencereler. */
  seconds: number;
  moves: number;
  rounds: number;
  plays: number;
  opens: number;
  passes: number;
  challenges: number;
  caught: number;
  wrongChallenges: number;
  bluffs: number;
  /** Turda iddia toplamı 4'ü aşan atışlar (herkesin gördüğü imkânsız iddia). */
  impossibleClaims: number;
  clears: number;
  discarded: number;
  maxPassRun: number;
  maxPile: number;
  windows: number;
  /** Süresi dolarak kapanan pencereler. */
  windowTimeouts: number;
  finals: number;
  finalBluffs: number;
  finalCaught: number;
  finalUnchallenged: number;
  /** Son kartı rakibe karşı blöfsüz bırakılan (bot) pencereler: kesin kayıp. */
  finalMissedByBot: number;
  /** Rakibin tek kartı kalmışken o rakibe turu bedava açtıran (son pas) bot pasları. */
  giftPasses: number;
  /** Turun değerini elinde tutarken pas (bot, elinde ≤ 4 kart). */
  passWithRankFew: number;
  /** Turun değerini elinde tutarken pas (bot, hepsi). */
  passWithRank: number;
  /** Bot "Blöf!" tepki süreleri (ms, sunum bittikten sonra). */
  challengeDelays: number[];
  /** İnsan vekilinin karar verebildiği toplam süre / beklediği en uzun aralık (sn). */
  humanBusy: number;
  humanMaxIdle: number;
  /** İnsan vekili: hamle yapması gerekmeden 5 sn pencerenin dolmasını beklediği pencere sayısı. */
  humanWindowWaits: number;
  stalled: boolean;
}

export interface AuditOptions {
  cfg: BlofConfig;
  seats: AuditSeat[];
  botSeed?: number;
  maxMoves?: number;
  /** İnsan vekili, sırası değilken açılan pencerede "geç"e basma olasılığı (yoksa 5 sn dolar). */
  humanDeclineP?: number;
  /** Her karardan sonra (denetim için) çağrılır: bot kararı + bot görünümü + TAM durum (yalnız ölçüm). */
  onDecision?: (seat: number, view: BlofView, action: BlofAction, state: BlofState) => void;
  /** Pencere sonuçlandı: by koltuğunun atışına blöf dendi mi (ölçüm). */
  onWindowResolved?: (by: number, challenged: boolean) => void;
  /** Bot fabrikası (parametre denemeleri). */
  botFactory?: (seat: number, diff: BlofDifficulty, seed: number) => BlofBot;
}

const isHuman = (s: AuditSeat): s is {human: BlofDifficulty | 'casual'} => typeof s === 'object';

function presentMs(evs: BlofEvent[], seats: number): number {
  let ms = 0;
  for (const e of evs) {
    switch (e.t) {
      case 'deal':
        ms += PRESENT_MS.deal;
        break;
      case 'opened':
      case 'played':
        ms += PRESENT_MS.play + PRESENT_MS.playPerCard * (e.count - 1);
        break;
      case 'windowOpen':
        if (e.final) ms += PRESENT_MS.final;
        break;
      case 'passed':
        ms += PRESENT_MS.pass;
        break;
      case 'pileCleared':
        ms += PRESENT_MS.cleared;
        break;
      case 'challenged':
        ms += PRESENT_MS.challenge;
        break;
      case 'reveal':
        ms += PRESENT_MS.reveal + PRESENT_MS.revealPerCard * e.cards.length + (!e.truthful && seats >= 3 ? PRESENT_MS.banter : 0);
        break;
      case 'pileTaken':
        ms += PRESENT_MS.take + PRESENT_MS.takePerCard * Math.min(e.count, 24);
        break;
      default:
        break;
    }
  }
  return ms;
}

/** Bir el oynatır ve ölçer. */
export function auditHand(o: AuditOptions): HandMetrics & {state: BlofState} {
  const cfg = o.cfg;
  const n = cfg.seats;
  const g = createBlof(cfg);
  let s = g.state;
  const seed = o.botSeed ?? cfg.seed;
  const brains: Brain[] = o.seats.map((sp, i) => {
    const d = isHuman(sp) ? sp.human : sp;
    const bs = (seed * 131 + i * 7 + 1) >>> 0;
    if (d === 'casual') return new CasualHuman(i, bs);
    return o.botFactory ? o.botFactory(i, d, bs) : new BlofBot(i, d, bs);
  });
  const human = o.seats.findIndex(isHuman);
  const hr = mulberry32((seed ^ 0x7f4a7c15) >>> 0);
  const range = (a: number, b: number) => a + hr() * (b - a);
  const declineP = o.humanDeclineP ?? 0.55;
  const feed = (evs: BlofEvent[]) => {
    for (const e of evs)
      for (let i = 0; i < n; i++) {
        const r = redactBlofEvent(e, i);
        if (r) brains[i].observe(r);
      }
  };
  feed(g.events);

  const m: HandMetrics = {
    seats: n,
    esli: !!cfg.teams && new Set(cfg.teams).size < n,
    winner: -1,
    winnerTeam: -1,
    seconds: 0,
    moves: 0,
    rounds: 0,
    plays: 0,
    opens: 0,
    passes: 0,
    challenges: 0,
    caught: 0,
    wrongChallenges: 0,
    bluffs: 0,
    impossibleClaims: 0,
    clears: 0,
    discarded: 0,
    maxPassRun: 0,
    maxPile: 0,
    windows: 0,
    windowTimeouts: 0,
    finals: 0,
    finalBluffs: 0,
    finalCaught: 0,
    finalUnchallenged: 0,
    finalMissedByBot: 0,
    giftPasses: 0,
    passWithRankFew: 0,
    passWithRank: 0,
    challengeDelays: [],
    humanBusy: 0,
    humanMaxIdle: 0,
    humanWindowWaits: 0,
    stalled: false,
  };

  let t = presentMs(g.events, n);
  let windowAt = Infinity;
  let windowStart = 0;
  type Pending = {at: number; epoch: number; action: BlofAction; human: boolean; start: number};
  const pending: (Pending | null)[] = new Array(n).fill(null);
  /** İnsan vekilinin pencerede sıraya aldığı hamle (pencere blöfsüz kapanınca uygulanır). */
  let humanQueued = false;
  let humanIdleFrom = t;
  /** İnsan vekilinin bu karar bağlamında (hamle sayacı) kararını verdi mi. */
  let humanEpoch = -1;
  const maxMoves = o.maxMoves ?? 3000;
  let passRun = 0;
  let botFinalDeclines = 0;

  const teams = s.cfg.teams;
  const humanDecide = (seat: number, v: BlofView): Pending | null => {
    const d = brains[seat].decide(v);
    if (!d) return null;
    const a = d.action;
    let ms: number;
    if (a.t === 'open') ms = range(2500, 6500);
    else if (a.t === 'play') ms = range(1800, 4500);
    else if (a.t === 'pass') ms = range(900, 2400);
    else if (a.t === 'challenge') ms = range(700, 2200);
    else {
      // geç: sıradaysa kart seçmeye başlar (geç sayılır) ve atışı sıraya alır; değilse ya "geç"e basar ya bekler
      if (v.turn === seat) {
        humanQueued = true;
        ms = range(900, 2200);
      } else if (hr() < declineP) ms = range(900, 2400);
      else return null; // süre dolsun
    }
    return {at: t + ms, epoch: s.move, action: a, human: true, start: t};
  };

  while (s.phase !== 'over' && s.move < maxMoves) {
    // 1) insanın sıraya aldığı hamle: pencere kapanıp sıra ona gelince hemen
    if (humanQueued && s.phase === 'turn' && s.turn === human) {
      humanQueued = false;
      const v = viewFor(s, human);
      const d = brains[human].decide(v)!;
      pending[human] = {at: t + 250, epoch: s.move, action: d.action, human: true, start: t};
      humanEpoch = s.move;
    } else if (humanQueued && s.phase === 'turn') humanQueued = false;
    // 2) hamlesi beklenenler karar verir (ev sahibi: sunum bitince)
    for (const seat of actors(s)) {
      const p = pending[seat];
      if (p && p.epoch === s.move) continue;
      const v = viewFor(s, seat);
      if (seat === human) {
        if (humanEpoch === s.move) continue;
        humanEpoch = s.move;
        pending[seat] = humanDecide(seat, v);
        if (pending[seat]) {
          m.humanMaxIdle = Math.max(m.humanMaxIdle, (t - humanIdleFrom) / 1000);
        } else if (s.phase === 'window' && v.canChallenge) m.humanWindowWaits++;
        continue;
      }
      const d = brains[seat].decide(v);
      if (!d) {
        pending[seat] = null;
        continue;
      }
      pending[seat] = {at: t + d.delayMs, epoch: s.move, action: d.action, human: false, start: t};
      o.onDecision?.(seat, v, d.action, s);
      // salak karar sayaçları (yalnız botlar)
      const a = d.action;
      if (a.t === 'pass') {
        const held = v.hand.filter((c) => rankOf(c) === v.rank).length;
        if (held > 0) {
          m.passWithRank++;
          if (v.hand.length <= 4) m.passWithRankFew++;
        }
        const last = v.lastPlay?.seat ?? -1;
        if (last >= 0 && v.passes === n - 2 && teams[last] !== teams[seat] && v.handCounts[last] === 1) m.giftPasses++;
      }
      if (a.t === 'decline' && v.window?.final) botFinalDeclines++;
    }
    // 3) en erken olay
    let best = -1;
    let bestAt = Infinity;
    for (let i = 0; i < n; i++) {
      const p = pending[i];
      if (p && p.epoch === s.move && p.at < bestAt) {
        best = i;
        bestAt = p.at;
      }
    }
    let action: BlofAction;
    let actor = -1;
    if (s.phase === 'window' && windowAt <= bestAt) {
      action = {t: 'windowClosed', id: s.window!.id};
      t = windowAt;
      m.windowTimeouts++;
    } else if (best >= 0) {
      const p = pending[best]!;
      t = bestAt;
      action = p.action;
      actor = best;
      pending[best] = null;
      if (p.human) {
        m.humanBusy += (t - p.start) / 1000;
        humanIdleFrom = t;
      } else if (action.t === 'challenge') m.challengeDelays.push(t - p.start);
    } else throw new Error(`kimse hamle yapmıyor (evre ${s.phase}, sıra ${s.turn})`);

    // ölçümler (tam durumdan; yalnız sayım)
    if (action.t === 'open' || action.t === 'play') {
      const rank = action.t === 'open' ? action.rank : s.rank;
      const claimed = s.plays.reduce((x, p) => x + p.count, 0) + action.cards.length;
      if (claimed > 4) m.impossibleClaims++;
      if (s.hands[action.seat].length === action.cards.length) {
        m.finals++;
        if (action.cards.some((c) => rankOf(c) !== rank)) m.finalBluffs++;
      }
      passRun = 0;
    } else if (action.t === 'pass') {
      passRun++;
      m.maxPassRun = Math.max(m.maxPassRun, passRun);
    } else if (action.t === 'challenge') {
      passRun = 0;
      if (s.window?.final) {
        const last = s.pile.slice(s.pile.length - s.lastCount);
        if (last.some((c) => rankOf(c) !== s.window!.rank)) m.finalCaught++;
      }
    }
    const wasFinal = s.phase === 'window' && s.window?.final;
    const winBy = s.phase === 'window' ? s.window!.by : -1;
    const r = applyBlof(s, action);
    if (r.error !== undefined) throw new Error(`geçersiz hamle ${JSON.stringify(action)} (koltuk ${actor}): ${r.error}`);
    const prevWin = s.window?.id;
    s = r.state;
    feed(r.events);
    for (const e of r.events) {
      if (e.t === 'challenged') o.onWindowResolved?.(e.target, true);
      if (e.t === 'windowClosed') o.onWindowResolved?.(winBy, false);
      if (e.t === 'pileCleared') {
        m.clears++;
        m.discarded += e.count;
        passRun = 0;
      }
      if (e.t === 'windowOpen') m.windows++;
      if (e.t === 'pileTaken') m.maxPile = Math.max(m.maxPile, e.count);
    }
    if (wasFinal && s.phase === 'over' && r.events.some((e) => e.t === 'windowClosed')) {
      m.finalUnchallenged++;
      if (botFinalDeclines > 0) m.finalMissedByBot++;
    }
    if (s.phase !== 'window') botFinalDeclines = 0;
    t += presentMs(r.events, n);
    if (s.phase === 'window' && s.window!.id !== prevWin) {
      windowStart = t;
      windowAt = t + s.cfg.challengeWindowMs;
    }
    if (s.phase !== 'window') windowAt = Infinity;
    void windowStart;
    const bad = checkBlofInvariants(s);
    if (bad) throw new Error(`tutarsız durum: ${bad}`);
  }
  if (s.phase !== 'over') m.stalled = true;
  const st = s.stats;
  for (const x of st) {
    m.plays += x.plays;
    m.opens += x.opens;
    m.passes += x.passes;
    m.challenges += x.challenges;
    m.caught += x.caught;
    m.wrongChallenges += x.wrongChallenges;
    m.bluffs += x.bluffs;
  }
  m.moves = s.move;
  m.rounds = s.round;
  m.seconds = t / 1000;
  m.winner = s.winner;
  m.winnerTeam = s.winner >= 0 ? s.cfg.teams[s.winner] : -1;
  if (human >= 0) m.humanMaxIdle = Math.max(m.humanMaxIdle, (t - humanIdleFrom) / 1000);
  return {...m, state: s};
}

const pct = (a: number, b: number) => (b > 0 ? (100 * a) / b : 0);
const q = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(p * a.length))];
};

export interface AuditSummary {
  hands: number;
  stalled: number;
  secP50: number;
  secP10: number;
  secP90: number;
  secMax: number;
  movesP50: number;
  movesP90: number;
  roundsP50: number;
  /** % */
  bluffRate: number;
  challengeRate: number;
  catchRate: number;
  bluffCaughtRate: number;
  passRate: number;
  clearsPerHand: number;
  discardPerHand: number;
  maxPassRunP90: number;
  maxPileP50: number;
  maxPileMax: number;
  timeoutsPerHand: number;
  finalsPerHand: number;
  finalBluffRate: number;
  finalCaughtRate: number;
  finalUnchallengedRate: number;
  finalMissedByBot: number;
  impossiblePerHand: number;
  giftPasses: number;
  passWithRankFew: number;
  passWithRankRate: number;
  chDelayP10: number;
  chDelayP50: number;
  chDelayP90: number;
  humanMaxIdleP90: number;
  humanWindowWaitsPerHand: number;
  /** Koltuk/takım başına kazanma oranı (%). */
  winBySeat: number[];
  winByTeam: number[];
}

export function summarize(ms: HandMetrics[]): AuditSummary {
  const sum = (f: (x: HandMetrics) => number) => ms.reduce((a, x) => a + f(x), 0);
  const N = ms.length;
  const seats = ms[0]?.seats ?? 2;
  const winBySeat = Array.from({length: seats}, (_, i) => pct(ms.filter((x) => x.winner === i).length, N));
  const teamsN = Math.max(...ms.map((x) => x.winnerTeam)) + 1;
  const winByTeam = Array.from({length: Math.max(1, teamsN)}, (_, i) => pct(ms.filter((x) => x.winnerTeam === i).length, N));
  const plays = sum((x) => x.plays);
  const windows = sum((x) => x.windows);
  const chDelays = ms.flatMap((x) => x.challengeDelays);
  return {
    hands: N,
    stalled: ms.filter((x) => x.stalled).length,
    secP10: q(ms.map((x) => x.seconds), 0.1),
    secP50: q(ms.map((x) => x.seconds), 0.5),
    secP90: q(ms.map((x) => x.seconds), 0.9),
    secMax: Math.max(...ms.map((x) => x.seconds)),
    movesP50: q(ms.map((x) => x.moves), 0.5),
    movesP90: q(ms.map((x) => x.moves), 0.9),
    roundsP50: q(ms.map((x) => x.rounds), 0.5),
    bluffRate: pct(sum((x) => x.bluffs), plays),
    challengeRate: pct(sum((x) => x.challenges), windows),
    catchRate: pct(sum((x) => x.caught), sum((x) => x.challenges)),
    bluffCaughtRate: pct(sum((x) => x.caught), sum((x) => x.bluffs)),
    passRate: pct(sum((x) => x.passes), sum((x) => x.passes) + plays),
    clearsPerHand: sum((x) => x.clears) / N,
    discardPerHand: sum((x) => x.discarded) / N,
    maxPassRunP90: q(ms.map((x) => x.maxPassRun), 0.9),
    maxPileP50: q(ms.map((x) => x.maxPile), 0.5),
    maxPileMax: Math.max(...ms.map((x) => x.maxPile)),
    timeoutsPerHand: sum((x) => x.windowTimeouts) / N,
    finalsPerHand: sum((x) => x.finals) / N,
    finalBluffRate: pct(sum((x) => x.finalBluffs), sum((x) => x.finals)),
    finalCaughtRate: pct(sum((x) => x.finalCaught), sum((x) => x.finalBluffs)),
    finalUnchallengedRate: pct(sum((x) => x.finalUnchallenged), sum((x) => x.finals)),
    finalMissedByBot: sum((x) => x.finalMissedByBot),
    impossiblePerHand: sum((x) => x.impossibleClaims) / N,
    giftPasses: sum((x) => x.giftPasses),
    passWithRankFew: sum((x) => x.passWithRankFew),
    passWithRankRate: pct(sum((x) => x.passWithRank), sum((x) => x.passes)),
    chDelayP10: q(chDelays, 0.1),
    chDelayP50: q(chDelays, 0.5),
    chDelayP90: q(chDelays, 0.9),
    humanMaxIdleP90: q(ms.map((x) => x.humanMaxIdle), 0.9),
    humanWindowWaitsPerHand: sum((x) => x.humanWindowWaits) / N,
    winBySeat,
    winByTeam,
  };
}

/** Bir modun koltuk düzeni ve takımları. */
export function modeCfg(mode: '1v1' | '3' | '4' | 'esli', seed: number): BlofConfig {
  const seats = mode === '1v1' ? 2 : mode === '3' ? 3 : 4;
  return {seats, teams: mode === 'esli' ? [0, 1, 0, 1] : undefined, seed, firstSeat: seed % seats};
}

/** N el oynatıp özetler. */
export function auditMany(mode: '1v1' | '3' | '4' | 'esli', seats: AuditSeat[], N: number, o: Partial<AuditOptions> = {}): AuditSummary {
  const out: HandMetrics[] = [];
  for (let i = 1; i <= N; i++) out.push(auditHand({...o, cfg: modeCfg(mode, i * 7919 + 13), seats}));
  return summarize(out);
}
