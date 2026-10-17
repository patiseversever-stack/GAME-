// Oyun uzunluğu: çok elli maç (Pişti 51/101/151) ve seri (Blöf 3/5 El). SAF ve deterministik: saat yok, Math.random yok,
// DOM yok — sunucu aynen koşar. Maç = ayar + tohum + el sonuçları; durum her el sonunda baştan türetilir (settle), böylece
// kayıttan dönen (yarım kalan) maç doğrulanıp aynen sürdürülebilir. Kurallar (docs/BLOF.md "Seri", docs/KARARLAR.md):
//
// PİŞTİ (Tek El · 51 · 101 · 151)
//  · Eller art arda dağıtılır; her elin sonunda taraf puanı (kart puanları + pişti 10 / vale pişti 20 + çoğunluk 3) toplama eklenir.
//    Taraf = takım: 1'e 1 ve 4 kişide herkes tek, eşlide iki ortak birlikte.
//  · Dağıtan her el bir sonraki koltuğa geçer (oyun sırasıyla aynı yön; ilk eli insan açar → ilk dağıtan son koltuk).
//  · Bir elin sonunda herhangi bir taraf hedefe ulaştıysa (≥ hedef) maç o elde biter; EN YÜKSEK toplam kazanır.
//  · En yüksek toplamda eşitlik varsa bir UZATMA ELİ daha oynanır (eşitlik bozulana dek). Güvenlik sınırı MAX_HANDS:
//    oraya varılırsa önce toplam pişti puanı, o da eşitse berabere (bahis iade / pot bölünür).
//  · Tek El: bugünkü gibi tek el; eşitlik beraberliktir.
//
// BLÖF (Tek El · 3 El · 5 El)
//  · Her elde bitiren taraf 0 ceza alır; diğer her taraf elinde kalan kart kadar ceza alır.
//    Eşlide kazanan takım 0; kaybeden takımın cezası iki oyuncunun elinde kalanların TOPLAMI.
//  · Sonraki eli, kaybeden taraflardan elinde EN ÇOK kart kalan oyuncu açar (eşitlikte bitirenden sonra sırası ilk gelen).
//  · N el bitince EN AZ toplam ceza kazanır. Eşitlikte: daha çok el kazanan → son elde daha az ceza alan → berabere.
//  · Tek El: ilk bitiren kazanır (bugünkü gibi).
//
// Maçı bırakmak (forfeit): bırakan taraf kaybeder; kalanlar arasında sıralamada önde olan kazanır.
import type {GameResult} from '../core/types';
import {GAME_INFO, MODE_INFO, type Game, type MatchLength, type Mode} from './types';

export const LENGTHS: Record<Game, readonly MatchLength[]> = {pisti: ['tek', '51', '101', '151'], blof: ['tek', '3', '5']};

export interface LengthInfo {
  /** Seçicide görünen kısa ad */
  label: string;
  /** Cümle içinde / başlıkta: "101'lik maç", "5 elli seri" */
  title: string;
  /** Pişti: hedef puan (tek elde 0) */
  target: number;
  /** Blöf: el sayısı (Pişti uzun maçta 0 = hedefe kadar; tek el 1) */
  hands: number;
  /** Ödül çarpanı: kazananın aldığı pot × mult (bahis maç başına bir kez; bkz. setup.ts receive) */
  mult: number;
}

export const LENGTH_INFO: Record<MatchLength, LengthInfo> = {
  tek: {label: 'Tek El', title: 'Tek el', target: 0, hands: 1, mult: 1},
  '51': {label: '51', title: "51'lik maç", target: 51, hands: 0, mult: 1.5},
  '101': {label: '101', title: "101'lik maç", target: 101, hands: 0, mult: 2},
  '151': {label: '151', title: "151'lik maç", target: 151, hands: 0, mult: 2.5},
  '3': {label: '3 El', title: '3 elli seri', target: 0, hands: 3, mult: 1.5},
  '5': {label: '5 El', title: '5 elli seri', target: 0, hands: 5, mult: 2},
};

/** Oyunun geçerli uzunluğu; değilse (bozuk kayıt, başka oyunun uzunluğu) 'tek'. */
export const lengthFor = (g: Game, v: unknown): MatchLength => (LENGTHS[g].includes(v as MatchLength) ? (v as MatchLength) : 'tek');
/** Çok elli maç mı (tek el değil) */
export const isLong = (l: MatchLength | undefined): boolean => !!l && l !== 'tek';

/** Pişti uzun maçta uzatma elleri dahil en çok el (güvenlik sınırı; 4 kişi 151'de bile pratikte ~20 el). */
export const MAX_HANDS = 40;

/** Bir elin kaydı. Durumun geri kalanı (toplamlar, sıradaki dağıtan/açan, bitiş) bunlardan türetilir. */
export interface HandRecord {
  /** Taraf başına: Pişti bu elin puanı · Blöf bu elin cezası */
  pts: number[];
  /** Eli alan taraf (Pişti: tek başına en yüksek puan, berabere elde -1 · Blöf: bitiren taraf) */
  winner: number;
  /** Bu elin dağıtanı (Pişti) / açanı (Blöf; -1 = motor tohumdan seçti) */
  first: number;
  /** Pişti: taraf başına pişti puanı (10'luk / 20'lik) */
  pisti?: number[];
  /** Blöf: eli bitiren koltuk */
  finisher?: number;
  /** Blöf: koltuk başına elde kalan kart */
  left?: number[];
}

export interface SeriesState {
  v: 1;
  game: Game;
  mode: Mode;
  len: MatchLength;
  /** Maç tohumu: el tohumları bundan türetilir (handSeed); ilk el = tohumun kendisi */
  seed: number;
  /** İlk elin dağıtanı (Pişti) / açanı (Blöf; -1 = motor seçer) */
  first: number;
  hands: HandRecord[];
  /** Taraf başına toplam: Pişti puan (büyük iyi) · Blöf ceza (küçük iyi) */
  totals: number[];
  /** Taraf başına kazanılan el */
  wins: number[];
  /** Sıradaki elin dağıtanı (Pişti) / açanı (Blöf; -1 = motor seçer) */
  next: number;
  over: boolean;
  /** Maç bittiyse kazanan taraf(lar); birden çoksa berabere */
  winners: number[];
  /** Maçı bırakan taraf (-1: yok) */
  forfeit: number;
}

export interface SeriesConfig {
  game: Game;
  mode: Mode;
  len: MatchLength;
  seed: number;
  /** Pişti: ilk elin dağıtanı · Blöf: ilk eli açan (-1 ya da verilmezse motor tohumdan seçer) */
  first?: number;
}

/** Koltuk → taraf (takım) dizisi. */
export const sidesOf = (mode: Mode): readonly number[] => MODE_INFO[mode].teams;
export const seatCount = (mode: Mode): number => MODE_INFO[mode].seats;
export const sideCount = (mode: Mode): number => Math.max(...MODE_INFO[mode].teams) + 1;
/** Tarafın koltukları */
export const seatsOfSide = (mode: Mode, side: number): number[] => sidesOf(mode).flatMap((t, s) => (t === side ? [s] : []));

export function createSeries(c: SeriesConfig): SeriesState {
  const seats = seatCount(c.mode);
  const len = lengthFor(c.game, c.len);
  const first = typeof c.first === 'number' && c.first >= 0 && c.first < seats ? c.first | 0 : c.game === 'pisti' ? seats - 1 : -1;
  return settle({v: 1, game: c.game, mode: c.mode, len, seed: c.seed | 0, first, hands: [], totals: [], wins: [], next: first, over: false, winners: [], forfeit: -1});
}

/** El tohumu (0'dan): ilk el maç tohumunun kendisi (tek el bugünküyle aynı deste), sonrakiler karışım. Saklanmaz, hep türetilir. */
export function handSeed(s: Pick<SeriesState, 'seed' | 'hands'>, i: number = s.hands.length): number {
  if (i <= 0) return s.seed | 0;
  let h = Math.imul((s.seed | 0) ^ Math.imul(i, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h & 0x7fffffff;
}

/** Sıradaki elin numarası (1'den) */
export const handNo = (s: SeriesState): number => s.hands.length + 1;

/** Pişti: hedef (tek elde 0). Blöf: el sayısı. */
export const targetOf = (s: SeriesState): number => LENGTH_INFO[s.len].target;
export const handsOf = (s: SeriesState): number => LENGTH_INFO[s.len].hands;

/** Pişti uzun maçta sıradaki el uzatma eli mi (hedef geçildi ama en yüksek toplamda eşitlik var). */
export function isExtra(s: SeriesState): boolean {
  if (s.over || s.game !== 'pisti' || !isLong(s.len) || !s.hands.length) return false;
  return Math.max(...s.totals) >= targetOf(s);
}

// ───────────────────────────── el kaydı ─────────────────────────────

/** Pişti elinin sonucu (core/pisti scoreGame) → yeni durum. Girdi değişmez. */
export function recordPisti(s: SeriesState, r: GameResult): SeriesState {
  if (s.over) throw new Error('Maç bitti');
  if (s.game !== 'pisti') throw new Error('Pişti eli değil');
  const n = sideCount(s.mode);
  const pts = new Array<number>(n).fill(0);
  const pisti = new Array<number>(n).fill(0);
  for (const sd of r.sides) {
    if (sd.side < 0 || sd.side >= n) continue;
    pts[sd.side] = Math.max(0, Math.round(sd.total));
    pisti[sd.side] = Math.max(0, Math.round(sd.pisti));
  }
  const best = Math.max(...pts);
  const top = pts.flatMap((p, i) => (p === best ? [i] : []));
  return settle({...s, hands: [...s.hands, {pts, pisti, winner: top.length === 1 ? top[0] : -1, first: s.next}]});
}

/** Blöf elinin sonucu: bitiren koltuk + koltuk başına elde kalan kart → yeni durum. Girdi değişmez. */
export function recordBlof(s: SeriesState, r: {winner: number; handCounts: readonly number[]}): SeriesState {
  if (s.over) throw new Error('Maç bitti');
  if (s.game !== 'blof') throw new Error('Blöf eli değil');
  const seats = seatCount(s.mode);
  const finisher = r.winner >= 0 && r.winner < seats ? r.winner | 0 : 0;
  const left = Array.from({length: seats}, (_, i) => (i === finisher ? 0 : Math.max(0, Math.round(Number(r.handCounts[i]) || 0))));
  return settle({...s, hands: [...s.hands, {pts: blofPenalty(s.mode, finisher, left), winner: sidesOf(s.mode)[finisher], first: s.next, finisher, left}]});
}

/** Blöf cezası: bitiren taraf 0; diğer her taraf, koltuklarının elinde kalan kartların toplamı. */
export function blofPenalty(mode: Mode, finisher: number, left: readonly number[]): number[] {
  const sides = sidesOf(mode);
  const win = sides[finisher];
  const pts = new Array<number>(sideCount(mode)).fill(0);
  sides.forEach((t, seat) => {
    if (t !== win) pts[t] += left[seat] ?? 0;
  });
  return pts;
}

/** Blöf: sonraki eli açan — kaybeden taraflardan elinde en çok kart kalan; eşitlikte bitirenden sonra sırası ilk gelen. */
export function blofOpener(mode: Mode, finisher: number, left: readonly number[]): number {
  const sides = sidesOf(mode);
  const n = sides.length;
  let best = -1, who = (finisher + 1) % n;
  for (let k = 1; k < n; k++) {
    const seat = (finisher + k) % n;
    if (sides[seat] === sides[finisher]) continue;
    const c = left[seat] ?? 0;
    if (c > best) {
      best = c;
      who = seat;
    }
  }
  return who;
}

/** Maçı bırak: bırakan taraf kaybeder; diğerlerinden sıralamada önde olan(lar) kazanır. */
export function forfeitSeries(s: SeriesState, side: number): SeriesState {
  if (s.over) return s;
  const rest = ranking(s).filter(t => t !== side);
  const top = rest.filter(t => cmp(s, t, rest[0]) === 0);
  return {...s, over: true, forfeit: side, winners: top};
}

// ───────────────────────────── türetme ─────────────────────────────

/** Toplamlar, kazanılan eller, sıradaki dağıtan/açan ve bitiş yalnız el kayıtlarından hesaplanır. */
function settle(s: SeriesState): SeriesState {
  const n = sideCount(s.mode);
  const seats = seatCount(s.mode);
  const totals = new Array<number>(n).fill(0);
  const wins = new Array<number>(n).fill(0);
  for (const h of s.hands) {
    for (let i = 0; i < n; i++) totals[i] += h.pts[i] ?? 0;
    if (h.winner >= 0 && h.winner < n) wins[h.winner]++;
  }
  const last = s.hands[s.hands.length - 1];
  let next = s.first;
  if (last) {
    if (s.game === 'pisti') next = ((last.first < 0 ? seats - 1 : last.first) + 1) % seats;
    else next = blofOpener(s.mode, last.finisher ?? 0, last.left ?? []);
  }
  const out: SeriesState = {...s, totals, wins, next, over: false, winners: []};
  if (s.forfeit >= 0) return forfeitSeries({...out, forfeit: -1}, s.forfeit);
  const end = finish(out);
  if (end) {
    out.over = true;
    out.winners = end;
  }
  return out;
}

/** Bittiyse kazanan taraf(lar), sürüyorsa null. */
function finish(s: SeriesState): number[] | null {
  const k = s.hands.length;
  if (!k) return null;
  const n = s.totals.length;
  const all = Array.from({length: n}, (_, i) => i);
  if (s.len === 'tek') {
    const last = s.hands[0];
    if (s.game === 'blof') return [last.winner];
    const best = Math.max(...last.pts);
    return all.filter(i => last.pts[i] === best);
  }
  if (s.game === 'pisti') {
    const best = Math.max(...s.totals);
    if (best < targetOf(s) && k < MAX_HANDS) return null;
    const top = all.filter(i => s.totals[i] === best);
    if (top.length === 1) return top;
    if (k < MAX_HANDS) return null; // uzatma eli
    const pp = (i: number) => s.hands.reduce((a, h) => a + (h.pisti?.[i] ?? 0), 0);
    const bp = Math.max(...top.map(pp));
    return top.filter(i => pp(i) === bp);
  }
  if (k < handsOf(s)) return null;
  const order = ranking(s);
  return order.filter(i => cmp(s, i, order[0]) === 0);
}

/** İki tarafı karşılaştır: < 0 → a önde. Pişti: toplam ↓ (eşitlik eşitliktir: uzatma eli) · Blöf: ceza ↑, kazanılan el ↓, son el cezası ↑. */
function cmp(s: SeriesState, a: number, b: number): number {
  const last = s.hands[s.hands.length - 1];
  if (s.game === 'pisti') return s.totals[b] - s.totals[a];
  return s.totals[a] - s.totals[b] || s.wins[b] - s.wins[a] || (last ? (last.pts[a] ?? 0) - (last.pts[b] ?? 0) : 0);
}

/** Taraflar, en iyiden kötüye (eşitlikte taraf numarası sırası). */
export function ranking(s: SeriesState): number[] {
  return Array.from({length: s.totals.length}, (_, i) => i).sort((a, b) => cmp(s, a, b) || a - b);
}

/** Tarafın sırası (1'den; eşitler aynı sırayı paylaşır). */
export function rankOf(s: SeriesState, side: number): number {
  let r = 1;
  for (let i = 0; i < s.totals.length; i++) if (i !== side && cmp(s, i, side) < 0) r++;
  return r;
}

/** Şu an önde olan taraf(lar) (taç için). El oynanmadıysa ya da herkes eşitse boş. */
export function leaders(s: SeriesState): number[] {
  if (!s.hands.length) return [];
  const order = ranking(s);
  const top = order.filter(i => cmp(s, i, order[0]) === 0);
  return top.length === order.length ? [] : top;
}

/** Tarafın maç sonucu (maç sürerken 'lose' döner; yalnız bitince anlamlıdır). */
export function outcomeFor(s: SeriesState, side: number): 'win' | 'lose' | 'draw' {
  if (s.forfeit === side || !s.winners.includes(side)) return 'lose';
  return s.winners.length === 1 ? 'win' : 'draw';
}

/** İlerleme (0..1): Pişti uzun maçta toplam / hedef · Blöf'te oynanan el / el sayısı · tek elde oynandıysa 1. */
export function progress(s: SeriesState, side: number): number {
  if (s.game === 'pisti' && isLong(s.len)) return Math.min(1, (s.totals[side] ?? 0) / targetOf(s));
  return Math.min(1, s.hands.length / Math.max(1, handsOf(s)));
}

/** Tarafın maç boyunca pişti puanı (Pişti). */
export const pistiOf = (s: SeriesState, side: number): number => s.hands.reduce((a, h) => a + (h.pisti?.[side] ?? 0), 0);

// ───────────────────────────── kayıt doğrulama ─────────────────────────────
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const natArr = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(x => isInt(x) && x >= 0 && x <= 10_000);

/**
 * Kayıttan (profil / sunucu) gelen maçı doğrula ve baştan türet. Bozuksa null. Türetilen alanlar (toplamlar, sıradaki, bitiş)
 * kayıttakine güvenilmeden el kayıtlarından yeniden hesaplanır.
 */
export function validateSeries(raw: unknown): SeriesState | null {
  if (!isRec(raw) || raw.v !== 1) return null;
  const game = raw.game as Game;
  if (game !== 'pisti' && game !== 'blof') return null;
  const mode = raw.mode as Mode;
  if (!GAME_INFO[game].modes.includes(mode)) return null;
  if (!LENGTHS[game].includes(raw.len as MatchLength)) return null;
  if (!isInt(raw.seed) || !isInt(raw.first) || !Array.isArray(raw.hands)) return null;
  const seats = seatCount(mode);
  const n = sideCount(mode);
  if (raw.first < -1 || raw.first >= seats) return null;
  const cap = raw.len === 'tek' ? 1 : game === 'pisti' ? MAX_HANDS : LENGTH_INFO[raw.len as MatchLength].hands;
  if (raw.hands.length > cap) return null;
  const hands: HandRecord[] = [];
  for (const h of raw.hands as unknown[]) {
    if (!isRec(h) || !natArr(h.pts, n) || !isInt(h.winner) || h.winner < -1 || h.winner >= n || !isInt(h.first) || h.first < -1 || h.first >= seats) return null;
    const rec: HandRecord = {pts: [...h.pts], winner: h.winner, first: h.first};
    if (game === 'pisti') {
      if (!natArr(h.pisti, n)) return null;
      rec.pisti = [...h.pisti];
    } else {
      if (!isInt(h.finisher) || h.finisher < 0 || h.finisher >= seats || !natArr(h.left, seats)) return null;
      rec.finisher = h.finisher;
      rec.left = [...h.left];
      // ceza ve kazanan, bitiren + kalan kartlardan tutarlı olmalı
      const pen = blofPenalty(mode, h.finisher, h.left);
      if (pen.some((p, i) => p !== rec.pts[i]) || rec.winner !== sidesOf(mode)[h.finisher]) return null;
    }
    hands.push(rec);
  }
  const forfeit = isInt(raw.forfeit) && raw.forfeit >= 0 && raw.forfeit < n ? raw.forfeit : -1;
  const base: SeriesState = {v: 1, game, mode, len: raw.len as MatchLength, seed: raw.seed, first: raw.first, hands: [], totals: [], wins: [], next: raw.first, over: false, winners: [], forfeit: -1};
  // ellerden biri maçı zaten bitirdiyse sonrasındaki kayıtlar geçersiz
  let s = settle(base);
  for (const h of hands) {
    if (s.over || h.first !== s.next) return null;
    s = settle({...s, hands: [...s.hands, h]});
  }
  return forfeit >= 0 ? forfeitSeries(s, forfeit) : s;
}
