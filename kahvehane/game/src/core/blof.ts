// Blöf kural motoru: saf ve deterministik (kurallar: docs/BLOF.md). Girdi durumunu asla değiştirmez;
// her hamle yeni bir durum + olay listesi döndürür. Saat yok: blöf penceresini ev sahibi sayar ve
// süre dolunca {t:'windowClosed'} gönderir. Aynı kod çevrimiçinde sunucuda aynen koşar.

import {type CardId, rankOf} from './types';
import {mulberry32, shuffle} from './rng';
import {
  BLOF_MAX_PLAY,
  BLOF_MIN_PLAY,
  BLOF_WINDOW_MS,
  type BlofAction,
  type BlofApplyResult,
  type BlofConfig,
  type BlofError,
  type BlofErrorCode,
  type BlofEvent,
  type BlofLegal,
  type BlofResult,
  type BlofRulesApi,
  type BlofSeatStats,
  type BlofSettings,
  type BlofState,
  type BlofStep,
  type BlofView,
  isTruthful,
} from './blofTypes';

const ALL_RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/** El sıralaması: önce değer, sonra renk (♠ ♥ ♦ ♣). */
const cardOrder = (c: CardId): number => (c % 13) * 4 + Math.floor(c / 13);
const byOrder = (a: CardId, b: CardId): number => cardOrder(a) - cardOrder(b);

const emptyStats = (): BlofSeatStats => ({
  plays: 0,
  opens: 0,
  cardsPlayed: 0,
  bluffs: 0,
  passes: 0,
  challenges: 0,
  caught: 0,
  wrongChallenges: 0,
  timesCaught: 0,
  survived: 0,
  pilesTaken: 0,
  cardsTaken: 0,
  biggestPile: 0,
});

/** Durumun derin kopyası (tüm alanlar düz sayı dizisi/nesne; structuredClone'dan hızlı). */
function cloneState(s: BlofState): BlofState {
  return {
    cfg: {...s.cfg, teams: [...s.cfg.teams]},
    hands: s.hands.map((h) => [...h]),
    pile: [...s.pile],
    plays: s.plays.map((p) => ({...p})),
    discard: [...s.discard],
    rank: s.rank,
    opener: s.opener,
    turn: s.turn,
    phase: s.phase,
    passes: s.passes,
    lastSeat: s.lastSeat,
    lastCount: s.lastCount,
    window: s.window ? {...s.window, eligible: [...s.window.eligible], declined: [...s.window.declined]} : null,
    windowSeq: s.windowSeq,
    round: s.round,
    move: s.move,
    winner: s.winner,
    stats: s.stats.map((x) => ({...x})),
    result: s.result,
  };
}

/** Ayarı doğrular ve varsayılanları doldurur. Geçersiz ayar programcı hatasıdır: fırlatır. */
export function normalizeBlofConfig(cfg: BlofConfig, rnd?: () => number): BlofSettings {
  const seats = cfg.seats;
  if (seats !== 2 && seats !== 3 && seats !== 4) throw new Error(`Blöf: koltuk sayısı 2, 3 ya da 4 olmalı (${seats})`);
  const teams = cfg.teams ? [...cfg.teams] : Array.from({length: seats}, (_, i) => i);
  if (teams.length !== seats || teams.some((t) => !Number.isInteger(t) || t < 0)) throw new Error('Blöf: takım listesi koltuk sayısıyla uyuşmuyor');
  if (new Set(teams).size < 2) throw new Error('Blöf: en az iki taraf olmalı');
  let firstSeat = cfg.firstSeat;
  if (firstSeat === undefined) firstSeat = rnd ? Math.floor(rnd() * seats) : 0;
  if (!Number.isInteger(firstSeat) || firstSeat < 0 || firstSeat >= seats) throw new Error(`Blöf: geçersiz ilk koltuk (${firstSeat})`);
  const ms = cfg.challengeWindowMs ?? BLOF_WINDOW_MS;
  if (!(ms > 0)) throw new Error('Blöf: pencere süresi pozitif olmalı');
  return {seats, teams, seed: cfg.seed | 0, firstSeat, challengeWindowMs: ms};
}

/**
 * Yeni oyun: 52 kart karıştırılır ve hepsi dağıtılır. Dağıtım ilk açanın SONRAKİ koltuğundan başlar, tek tek;
 * böylece 3 kişide fazla (18.) kart ilk açmayan oyuncuya — açanın bir sonrakine — düşer.
 */
export function createBlof(cfg: BlofConfig): BlofStep {
  const rnd = mulberry32(cfg.seed);
  const deck = shuffle(Array.from({length: 52}, (_, i) => i), rnd);
  const set = normalizeBlofConfig(cfg, rnd);
  const n = set.seats;
  const hands: CardId[][] = Array.from({length: n}, () => []);
  const startSeat = (set.firstSeat + 1) % n;
  for (let i = 0; i < 52; i++) hands[(startSeat + i) % n].push(deck[i]);
  for (const h of hands) h.sort(byOrder);

  const state: BlofState = {
    cfg: set,
    hands,
    pile: [],
    plays: [],
    discard: [],
    rank: 0,
    opener: set.firstSeat,
    turn: set.firstSeat,
    phase: 'turn',
    passes: 0,
    lastSeat: -1,
    lastCount: 0,
    window: null,
    windowSeq: 0,
    round: 1,
    move: 0,
    winner: -1,
    stats: Array.from({length: n}, emptyStats),
    result: null,
  };
  const events: BlofEvent[] = [
    {t: 'deal', firstSeat: set.firstSeat, startSeat, counts: hands.map((h) => h.length), hands: hands.map((h) => [...h])},
    {t: 'turn', seat: set.firstSeat, open: true, rank: 0, round: 1},
  ];
  return {state, events};
}

const err = (code: BlofErrorCode, error: string): BlofError => ({error, code});

const validSeat = (s: BlofState, seat: unknown): seat is number =>
  typeof seat === 'number' && Number.isInteger(seat) && seat >= 0 && seat < s.cfg.seats;

/** Kart listesi kontrolü: 1–4 kart, geçerli kimlik, tekrarsız, hepsi elde. */
function checkCards(s: BlofState, seat: number, cards: unknown): BlofError | null {
  if (!Array.isArray(cards)) return err('bad-action', 'Kart listesi yok');
  if (cards.length < BLOF_MIN_PLAY || cards.length > BLOF_MAX_PLAY) return err('bad-count', `Bir seferde ${BLOF_MIN_PLAY}–${BLOF_MAX_PLAY} kart atılır`);
  const hand = s.hands[seat];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (typeof c !== 'number' || !Number.isInteger(c) || c < 0 || c > 51) return err('bad-card', `Geçersiz kart: ${String(c)}`);
    for (let j = 0; j < i; j++) if (cards[j] === c) return err('duplicate', 'Aynı kart iki kez seçilmiş');
    if (hand.indexOf(c) < 0) return err('not-in-hand', `${c} kartı elinde yok`);
  }
  return null;
}

/** Hamle geçerli mi? null = geçerli. (applyBlof ile birebir aynı kurallar.) */
export function validateBlof(s: BlofState, a: BlofAction): BlofError | null {
  if (!a || typeof a !== 'object' || typeof (a as {t?: unknown}).t !== 'string') return err('bad-action', 'Geçersiz hamle');
  if (s.phase === 'over') return err('over', 'Oyun bitti');
  switch (a.t) {
    case 'open':
    case 'play': {
      if (!validSeat(s, a.seat)) return err('bad-seat', 'Geçersiz koltuk');
      if (s.phase !== 'turn') return err('phase', 'Blöf penceresi açık; kapanmasını bekle');
      if (a.seat !== s.turn) return err('turn', `Sıra ${s.turn}. koltukta`);
      if (a.t === 'open') {
        if (s.rank !== 0) return err('not-open', 'Tur zaten açık; aynı değeri söyleyerek at');
        if (!Number.isInteger(a.rank) || a.rank < 1 || a.rank > 13) return err('bad-rank', 'Değer As (1) ile Papaz (13) arasında olmalı');
      } else if (s.rank === 0) return err('must-open', 'Turu sen açıyorsun: önce değer söyle');
      return checkCards(s, a.seat, a.cards);
    }
    case 'pass':
      if (!validSeat(s, a.seat)) return err('bad-seat', 'Geçersiz koltuk');
      if (s.phase !== 'turn') return err('phase', 'Blöf penceresi açık; kapanmasını bekle');
      if (a.seat !== s.turn) return err('turn', `Sıra ${s.turn}. koltukta`);
      if (s.rank === 0) return err('cannot-pass', 'Turu açan pas diyemez');
      return null;
    case 'challenge':
    case 'decline': {
      if (!validSeat(s, a.seat)) return err('bad-seat', 'Geçersiz koltuk');
      const w = s.window;
      if (s.phase !== 'window' || !w) return err('phase', 'Açık blöf penceresi yok');
      if (a.seat === w.by) return err('own-play', 'Kendi atışına blöf diyemezsin');
      if (!w.eligible[a.seat]) return err('teammate', 'Takım arkadaşının hamlesine blöf denemez');
      if (w.declined[a.seat]) return err('declined', 'Bu pencerede zaten geç dedin');
      return null;
    }
    case 'windowClosed':
      if (s.phase !== 'window' || !s.window) return err('phase', 'Açık blöf penceresi yok');
      if (a.id !== undefined && a.id !== s.window.id) return err('stale', 'Bayat pencere kapanışı');
      return null;
    default:
      return err('bad-action', 'Bilinmeyen hamle');
  }
}

/** Bir hamleyi uygular. Geçersizse {error, code} döner; girdi durumu hiçbir koşulda değişmez. */
export function applyBlof(state: BlofState, action: BlofAction): BlofApplyResult {
  const bad = validateBlof(state, action);
  if (bad) return bad;
  const s = cloneState(state);
  const events: BlofEvent[] = [];
  switch (action.t) {
    case 'open':
    case 'play':
      doPlay(s, action.seat, action.t === 'open' ? action.rank : s.rank, action.cards, action.t === 'open', events);
      break;
    case 'pass':
      doPass(s, action.seat, events);
      break;
    case 'challenge':
      doChallenge(s, action.seat, events);
      break;
    case 'decline': {
      const w = s.window!;
      w.declined[action.seat] = true;
      events.push({t: 'declined', id: w.id, seat: action.seat});
      // Blöf diyebilecek herkes geçtiyse pencere hemen kapanır.
      let open = false;
      for (let i = 0; i < s.cfg.seats; i++) if (w.eligible[i] && !w.declined[i]) open = true;
      if (!open) closeWindow(s, 'declined', events);
      break;
    }
    case 'windowClosed':
      closeWindow(s, 'timeout', events);
      break;
  }
  return {state: s, events};
}

/** Kart atışı (açış ya da tura atış) → pencere açılır. */
function doPlay(s: BlofState, seat: number, rank: number, cards: CardId[], open: boolean, events: BlofEvent[]): void {
  const n = s.cfg.seats;
  const hand = s.hands[seat];
  for (const c of cards) hand.splice(hand.indexOf(c), 1);
  s.pile.push(...cards);
  s.plays.push({seat, count: cards.length});
  if (open) {
    s.rank = rank;
    s.opener = seat;
  }
  s.lastSeat = seat;
  s.lastCount = cards.length;
  s.passes = 0;
  s.turn = (seat + 1) % n;
  s.move++;

  const st = s.stats[seat];
  st.plays++;
  st.cardsPlayed += cards.length;
  if (open) st.opens++;
  if (!isTruthful(cards, rank)) st.bluffs++;

  const base = {seat, rank, count: cards.length, cards: [...cards], pileCount: s.pile.length, handCount: hand.length};
  events.push(open ? {t: 'opened', ...base} : {t: 'played', ...base});

  // Pencere: atan hariç herkes; eşlide takım arkadaşı da hariç.
  const team = s.cfg.teams[seat];
  const eligible = s.cfg.teams.map((t, i) => i !== seat && t !== team);
  s.windowSeq++;
  s.window = {
    id: s.windowSeq,
    by: seat,
    rank,
    count: cards.length,
    final: hand.length === 0,
    eligible,
    declined: new Array<boolean>(n).fill(false),
  };
  s.phase = 'window';
  const el: number[] = [];
  for (let i = 0; i < n; i++) if (eligible[i]) el.push(i);
  events.push({
    t: 'windowOpen',
    id: s.window.id,
    by: seat,
    rank,
    count: cards.length,
    final: s.window.final,
    ms: s.cfg.challengeWindowMs,
    eligible: el,
  });
}

/** Pencere blöfsüz kapandı: atan son kartlarını attıysa bitirir, değilse sıra sonrakine geçer. */
function closeWindow(s: BlofState, reason: 'timeout' | 'declined', events: BlofEvent[]): void {
  const w = s.window!;
  s.window = null;
  s.move++;
  events.push({t: 'windowClosed', id: w.id, by: w.by, reason});
  if (w.final) {
    finish(s, w.by, events);
    return;
  }
  s.phase = 'turn';
  events.push({t: 'turn', seat: s.turn, open: false, rank: s.rank, round: s.round});
}

function doPass(s: BlofState, seat: number, events: BlofEvent[]): void {
  const n = s.cfg.seats;
  s.passes++;
  s.stats[seat].passes++;
  s.move++;
  events.push({t: 'passed', seat, passes: s.passes});
  s.turn = (seat + 1) % n;
  if (s.passes >= n - 1) {
    // Son atan hariç herkes art arda pas dedi: yığın oyun dışına, son atan yeni turu açar.
    const by = s.lastSeat;
    const count = s.pile.length;
    s.discard.push(...s.pile);
    events.push({t: 'pileCleared', count, by});
    newRound(s, by, events);
  } else {
    events.push({t: 'turn', seat: s.turn, open: false, rank: s.rank, round: s.round});
  }
}

function doChallenge(s: BlofState, by: number, events: BlofEvent[]): void {
  const w = s.window!;
  const target = w.by;
  s.window = null;
  s.move++;
  events.push({t: 'challenged', id: w.id, by, target});
  const last = s.pile.slice(s.pile.length - s.lastCount);
  const truthful = isTruthful(last, w.rank);
  events.push({t: 'reveal', seat: target, by, rank: w.rank, cards: last, truthful});

  // Doğruysa blöf diyen alır, atan açar; yalansa atan alır, yakalayan açar.
  const taker = truthful ? by : target;
  const opener = truthful ? target : by;
  const sc = s.stats[by];
  const st = s.stats[target];
  sc.challenges++;
  if (truthful) {
    sc.wrongChallenges++;
    st.survived++;
  } else {
    sc.caught++;
    st.timesCaught++;
  }
  const taken = s.pile;
  const tk = s.stats[taker];
  tk.pilesTaken++;
  tk.cardsTaken += taken.length;
  if (taken.length > tk.biggestPile) tk.biggestPile = taken.length;
  const hand = s.hands[taker];
  hand.push(...taken);
  hand.sort(byOrder);
  s.pile = [];
  s.plays = [];
  events.push({
    t: 'pileTaken',
    seat: taker,
    count: taken.length,
    cards: [...taken],
    reason: truthful ? 'wrongChallenge' : 'caught',
    handCount: hand.length,
  });

  if (truthful && w.final) {
    // Son kartları doğru çıktı: atan bitirir.
    finish(s, target, events);
    return;
  }
  newRound(s, opener, events);
}

/** Yeni tur: yığın boş, değer yok, opener açar. */
function newRound(s: BlofState, opener: number, events: BlofEvent[]): void {
  s.pile = [];
  s.plays = [];
  s.rank = 0;
  s.passes = 0;
  s.lastSeat = -1;
  s.lastCount = 0;
  s.opener = opener;
  s.turn = opener;
  s.phase = 'turn';
  s.round++;
  events.push({t: 'turn', seat: opener, open: true, rank: 0, round: s.round});
}

/** İlk bitiren kazanır (eşlide takımı). */
function finish(s: BlofState, seat: number, events: BlofEvent[]): void {
  const {seats, teams} = s.cfg;
  s.phase = 'over';
  s.window = null;
  s.winner = seat;
  const team = teams[seat];
  events.push({t: 'finished', seat, team});
  const winners: number[] = [];
  for (let i = 0; i < seats; i++) if (teams[i] === team) winners.push(i);
  const order = Array.from({length: seats}, (_, k) => (seat + k) % seats);
  const ranking = [seat, ...order.slice(1).sort((a, b) => s.hands[a].length - s.hands[b].length || order.indexOf(a) - order.indexOf(b))];
  const result: BlofResult = {
    winner: seat,
    winnerTeam: team,
    winners,
    ranking,
    handCounts: s.hands.map((h) => h.length),
    stats: s.stats.map((x) => ({...x})),
    rounds: s.round,
    moves: s.move,
  };
  s.result = result;
  events.push({t: 'gameOver', result});
}

/** Bir koltuğun görebildiği her şey. seat −1 (ya da aralık dışı): seyirci (el boş). */
export function viewFor(s: BlofState, seat: number): BlofView {
  const n = s.cfg.seats;
  const me = seat >= 0 && seat < n;
  const w = s.window;
  const myTurn = me && s.phase === 'turn' && s.turn === seat;
  const lastRank = w ? w.rank : s.rank;
  return {
    seat,
    seats: n,
    teams: [...s.cfg.teams],
    hand: me ? [...s.hands[seat]] : [],
    handCounts: s.hands.map((h) => h.length),
    pileCount: s.pile.length,
    discardCount: s.discard.length,
    rank: s.rank,
    opener: s.opener,
    turn: s.turn,
    phase: s.phase,
    myTurn,
    mustOpen: myTurn && s.rank === 0,
    canPass: myTurn && s.rank !== 0,
    roundPlays: s.plays.map((p) => ({...p})),
    lastPlay: s.lastSeat >= 0 ? {seat: s.lastSeat, count: s.lastCount, rank: lastRank} : null,
    passes: s.passes,
    window: w ? {id: w.id, by: w.by, rank: w.rank, count: w.count, final: w.final, eligible: [...w.eligible], ms: s.cfg.challengeWindowMs} : null,
    canChallenge: me && s.phase === 'window' && !!w && w.eligible[seat] && !w.declined[seat],
    declined: me && !!w && w.declined[seat],
    round: s.round,
    move: s.move,
    challengeWindowMs: s.cfg.challengeWindowMs,
    winner: s.winner,
    over: s.phase === 'over',
    result: s.result,
  };
}

/** Görünüme göre yapılabilecekler (özet; kart alt kümeleri sayılmaz). */
export function legalActions(v: BlofView): BlofLegal {
  const maxCards = Math.min(BLOF_MAX_PLAY, v.hand.length);
  return {
    open: v.mustOpen && maxCards > 0,
    play: v.myTurn && v.rank !== 0 && maxCards > 0,
    pass: v.canPass,
    challenge: v.canChallenge,
    decline: v.canChallenge,
    minCards: BLOF_MIN_PLAY,
    maxCards,
    ranks: v.mustOpen ? [...ALL_RANKS] : [],
    rank: v.myTurn ? v.rank : 0,
  };
}

/** İstemci tarafı ön kontrol (düğmeleri açıp kapamak için). Kesin karar sunucudaki applyBlof'tadır. */
export function isLegalFor(v: BlofView, a: BlofAction): boolean {
  if (v.over) return false;
  switch (a.t) {
    case 'open':
    case 'play': {
      if (a.seat !== v.seat || !v.myTurn) return false;
      if (a.t === 'open' ? !v.mustOpen || !(a.rank >= 1 && a.rank <= 13) : v.mustOpen) return false;
      if (!Array.isArray(a.cards) || a.cards.length < BLOF_MIN_PLAY || a.cards.length > BLOF_MAX_PLAY) return false;
      if (new Set(a.cards).size !== a.cards.length) return false;
      return a.cards.every((c) => v.hand.includes(c));
    }
    case 'pass':
      return a.seat === v.seat && v.canPass;
    case 'challenge':
    case 'decline':
      return a.seat === v.seat && v.canChallenge;
    case 'windowClosed':
      return false; // yalnız yetkili taraf
    default:
      return false;
  }
}

/**
 * Olayın bu koltuğa gidecek hâli (gizli bilgi silinir). null → bu koltuğa gönderilmez.
 * - deal: yalnız kendi elin; opened/played: kartları yalnız atan görür; pileTaken: kartları yalnız alan görür
 *   (açılan son atış zaten herkese 'reveal' ile gösterildi); declined: yalnız geçene.
 */
export function redactBlofEvent(e: BlofEvent, seat: number): BlofEvent | null {
  switch (e.t) {
    case 'deal':
      return {...e, counts: [...e.counts], hands: e.hands.map((h, i) => (i === seat && h ? [...h] : null))};
    case 'opened':
    case 'played':
      return {...e, cards: e.seat === seat && e.cards ? [...e.cards] : null};
    case 'pileTaken':
      return {...e, cards: e.seat === seat && e.cards ? [...e.cards] : null};
    case 'declined':
      return e.seat === seat ? {...e} : null;
    case 'reveal':
      return {...e, cards: [...e.cards]};
    case 'windowOpen':
      return {...e, eligible: [...e.eligible]};
    default:
      return {...e};
  }
}

/**
 * Süre aşımında (çevrimiçi, oyuncu düşünürken uyudu) yapılacak varsayılan hamle:
 * açması gerekiyorsa en çok tuttuğu değerin bütün kartlarıyla DOĞRU açar; turdaysa pas; penceredeyse geçer.
 */
export function timeoutAction(s: BlofState, seat: number): BlofAction | null {
  if (s.phase === 'turn' && s.turn === seat) {
    if (s.rank !== 0) return {t: 'pass', seat};
    const hand = s.hands[seat];
    const cnt = new Array<number>(14).fill(0);
    for (const c of hand) cnt[rankOf(c)]++;
    let best = 0;
    for (let r = 1; r <= 13; r++) if (cnt[r] > cnt[best]) best = r;
    if (best === 0) return null;
    const cards = hand.filter((c) => rankOf(c) === best).slice(0, BLOF_MAX_PLAY);
    return {t: 'open', seat, rank: best, cards};
  }
  if (s.phase === 'window' && s.window && s.window.eligible[seat] && !s.window.declined[seat]) return {t: 'decline', seat};
  return null;
}

/** Şu an hamlesi beklenen koltuklar. */
export function actors(s: BlofState): number[] {
  if (s.phase === 'turn') return [s.turn];
  if (s.phase === 'window' && s.window) {
    const out: number[] = [];
    for (let i = 0; i < s.cfg.seats; i++) if (s.window.eligible[i] && !s.window.declined[i]) out.push(i);
    return out;
  }
  return [];
}

/** Takım arkadaşı mı (aynı takım, farklı koltuk)? */
export const isTeammate = (s: {cfg: {teams: number[]}}, a: number, b: number): boolean => a !== b && s.cfg.teams[a] === s.cfg.teams[b];

/** Tutarlılık denetimi (test/hata ayıklama): 52 kart korunur, tekrar yok. Sorun yoksa null. */
export function checkBlofInvariants(s: BlofState): string | null {
  const seen = new Uint8Array(52);
  let total = 0;
  const add = (c: CardId, where: string): string | null => {
    if (!(c >= 0 && c < 52)) return `${where}: geçersiz kart ${c}`;
    if (seen[c]) return `${where}: ${c} iki kez var`;
    seen[c] = 1;
    total++;
    return null;
  };
  for (let i = 0; i < s.hands.length; i++) for (const c of s.hands[i]) {
    const e = add(c, `el ${i}`);
    if (e) return e;
  }
  for (const c of s.pile) {
    const e = add(c, 'yığın');
    if (e) return e;
  }
  for (const c of s.discard) {
    const e = add(c, 'kenar');
    if (e) return e;
  }
  if (total !== 52) return `kart sayısı ${total}`;
  const playsSum = s.plays.reduce((a, p) => a + p.count, 0);
  if (playsSum !== s.pile.length) return `tur atışları (${playsSum}) yığınla (${s.pile.length}) uyuşmuyor`;
  if (s.phase === 'window' && !s.window) return 'pencere evresinde pencere yok';
  if (s.phase !== 'window' && s.window) return 'pencere evresi dışında pencere var';
  if (s.phase !== 'over') {
    for (let i = 0; i < s.hands.length; i++) {
      if (s.hands[i].length === 0 && !(s.phase === 'window' && s.window?.by === i && s.window.final)) return `${i}. koltuğun eli boş ama oyun sürüyor`;
    }
    if (s.rank === 0 && s.pile.length > 0) return 'tur açılmadan yığında kart var';
  }
  return null;
}

/** BlofRulesApi'nin tek nesnede toplanmış hâli. */
export const blofRules: BlofRulesApi = {
  createBlof,
  applyBlof,
  validateBlof,
  viewFor,
  legalActions,
  isLegalFor,
  redactBlofEvent,
  timeoutAction,
  actors,
};
