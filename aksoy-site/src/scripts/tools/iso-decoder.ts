// ISO 1832 değiştirilebilir kesici uç kodu çözücü (CNMG 120408-MA gibi).
// Saf mantık: DOM yok. Sayfadaki referans tabloları ve tarayıcı betiği aynı veriyi kullanır.
import type { InsertShape } from '../../data/types';
import { fmtFixed } from './format';

/* ================================================================== Tablolar */

const RAD = Math.PI / 180;
const rhombic = (a: number) => 1 / Math.sin(a * RAD);

export interface ShapeDef {
  name: string;
  /** Kesme köşesi açısı εr (°); yuvarlak ve özel uçta null */
  angle: number | null;
  /** Kesme kenarı / iç teğet daire (IC) oranı; IC tanımsız şekillerde null */
  edgePerIc: number | null;
  /** drawingSvg ile çizilecek en yakın şekil ve çizimin gösterdiği açı */
  draw: InsertShape | null;
  drawAngle?: number;
  /** Bir yüzde kullanılabilen tipik kesme köşesi sayısı */
  corners?: number;
}

export const SHAPES: Record<string, ShapeDef> = {
  A: { name: 'Paralelkenar', angle: 85, edgePerIc: null, draw: 'A' },
  B: { name: 'Paralelkenar', angle: 82, edgePerIc: null, draw: 'A', drawAngle: 85 },
  C: { name: 'Eşkenar dörtgen (rombik)', angle: 80, edgePerIc: rhombic(80), draw: 'C', corners: 2 },
  D: { name: 'Eşkenar dörtgen (rombik)', angle: 55, edgePerIc: rhombic(55), draw: 'D', corners: 2 },
  E: { name: 'Eşkenar dörtgen (rombik)', angle: 75, edgePerIc: rhombic(75), draw: 'E', corners: 2 },
  F: { name: 'Eşkenar dörtgen (rombik)', angle: 50, edgePerIc: rhombic(50), draw: 'D', drawAngle: 55, corners: 2 },
  H: { name: 'Altıgen', angle: 120, edgePerIc: Math.tan(30 * RAD), draw: 'H' },
  K: { name: 'Paralelkenar', angle: 55, edgePerIc: null, draw: 'K' },
  L: { name: 'Dikdörtgen', angle: 90, edgePerIc: null, draw: 'L' },
  M: { name: 'Eşkenar dörtgen (rombik)', angle: 86, edgePerIc: rhombic(86), draw: 'C', drawAngle: 80, corners: 2 },
  O: { name: 'Sekizgen', angle: 135, edgePerIc: Math.tan(22.5 * RAD), draw: 'O' },
  P: { name: 'Beşgen', angle: 108, edgePerIc: Math.tan(36 * RAD), draw: 'P' },
  R: { name: 'Yuvarlak', angle: null, edgePerIc: null, draw: 'R' },
  S: { name: 'Kare', angle: 90, edgePerIc: 1, draw: 'S', corners: 4 },
  T: { name: 'Üçgen', angle: 60, edgePerIc: Math.sqrt(3), draw: 'T', corners: 3 },
  V: { name: 'Eşkenar dörtgen (rombik)', angle: 35, edgePerIc: rhombic(35), draw: 'V', corners: 2 },
  // Trigon: üç adet 80° ve üç adet 160° köşeli, kenarları eşit altıgen. l = d/2·(cot40° + cot80°)
  W: { name: 'Trigon (80° köşeli altıgen)', angle: 80, edgePerIc: (1 / Math.tan(40 * RAD) + 1 / Math.tan(80 * RAD)) / 2, draw: 'W', corners: 3 },
  X: { name: 'Özel şekil', angle: null, edgePerIc: null, draw: null },
};

/** Normal boşluk açısı αn (°); O = özel */
export const CLEARANCE: Record<string, number | null> = { N: 0, A: 3, B: 5, C: 7, P: 11, D: 15, E: 20, F: 25, G: 30, O: null };

export interface TolDef { m: string; s: string; d: string; kind: string }
/** Tolerans sınıfları (mm). m: köşe konumu, s: kalınlık, d: iç teğet daire. */
export const TOL: Record<string, TolDef> = {
  A: { m: '±0,005', s: '±0,025', d: '±0,025', kind: 'Hassas taşlanmış' },
  F: { m: '±0,005', s: '±0,025', d: '±0,013', kind: 'Hassas taşlanmış' },
  C: { m: '±0,013', s: '±0,025', d: '±0,025', kind: 'Hassas taşlanmış' },
  H: { m: '±0,013', s: '±0,025', d: '±0,013', kind: 'Hassas taşlanmış' },
  E: { m: '±0,025', s: '±0,025', d: '±0,025', kind: 'Taşlanmış' },
  G: { m: '±0,025', s: '±0,13', d: '±0,025', kind: 'Çevresi taşlanmış' },
  J: { m: '±0,005', s: '±0,025', d: '±0,05–±0,15', kind: 'Köşesi hassas, IC toleransı geniş' },
  K: { m: '±0,013', s: '±0,025', d: '±0,05–±0,15', kind: 'Köşesi hassas, IC toleransı geniş' },
  L: { m: '±0,025', s: '±0,025', d: '±0,05–±0,15', kind: 'Köşesi hassas, IC toleransı geniş' },
  M: { m: '±0,08–±0,20', s: '±0,13', d: '±0,05–±0,15', kind: 'Preslenmiş (taşlanmamış), genel amaçlı' },
  N: { m: '±0,08–±0,20', s: '±0,025', d: '±0,05–±0,15', kind: 'Preslenmiş, kalınlığı hassas' },
  U: { m: '±0,13–±0,38', s: '±0,13', d: '±0,08–±0,25', kind: 'Preslenmiş, geniş toleranslı' },
};

/** J, K, L, M, N sınıflarında d toleransı ve M, N sınıflarında m toleransı (C, S, T, W şekilleri) — IC’ye göre. */
const IC_TOL: { ic: number; d: string; m: string }[] = [
  { ic: 3.97, d: '±0,05', m: '±0,08' },
  { ic: 4.76, d: '±0,05', m: '±0,08' },
  { ic: 5.56, d: '±0,05', m: '±0,08' },
  { ic: 6.35, d: '±0,05', m: '±0,08' },
  { ic: 7.94, d: '±0,05', m: '±0,08' },
  { ic: 9.525, d: '±0,05', m: '±0,08' },
  { ic: 12.7, d: '±0,08', m: '±0,13' },
  { ic: 15.875, d: '±0,10', m: '±0,15' },
  { ic: 19.05, d: '±0,10', m: '±0,15' },
  { ic: 25.4, d: '±0,13', m: '±0,18' },
  { ic: 31.75, d: '±0,15', m: '±0,20' },
];

export type HoleKind = 'none' | 'cyl' | 'cs1' | 'cs2' | 'special';
export interface HoleDef { text: string; hole: HoleKind; cs?: string; cb: 0 | 1 | 2 | null; clamp: string }
const CLAMP_HOLE = 'Silindirik delik: levyeli (P), pim + üst pabuçlu (D) ya da üstten bağlamalı (M) katerlerde';
const CLAMP_CS = 'Havşalı delik: vidalı (S) katerlerde';
const CLAMP_NONE = 'Deliksiz: üst pabuçlu (C) katerlerde';
export const HOLE: Record<string, HoleDef> = {
  A: { text: 'Silindirik delikli, talaş kırıcısız', hole: 'cyl', cb: 0, clamp: CLAMP_HOLE },
  B: { text: 'Tek tarafı 70–90° havşalı delikli, talaş kırıcısız', hole: 'cs1', cs: '70–90°', cb: 0, clamp: CLAMP_CS },
  C: { text: 'İki tarafı 70–90° havşalı delikli, talaş kırıcısız', hole: 'cs2', cs: '70–90°', cb: 0, clamp: CLAMP_CS },
  F: { text: 'Deliksiz, iki yüzü talaş kırıcılı', hole: 'none', cb: 2, clamp: CLAMP_NONE },
  G: { text: 'Silindirik delikli, iki yüzü talaş kırıcılı', hole: 'cyl', cb: 2, clamp: CLAMP_HOLE },
  H: { text: 'Tek tarafı 70–90° havşalı delikli, tek yüzü talaş kırıcılı', hole: 'cs1', cs: '70–90°', cb: 1, clamp: CLAMP_CS },
  J: { text: 'İki tarafı 70–90° havşalı delikli, iki yüzü talaş kırıcılı', hole: 'cs2', cs: '70–90°', cb: 2, clamp: CLAMP_CS },
  M: { text: 'Silindirik delikli, tek yüzü talaş kırıcılı', hole: 'cyl', cb: 1, clamp: CLAMP_HOLE },
  N: { text: 'Deliksiz, talaş kırıcısız (düz yüzey)', hole: 'none', cb: 0, clamp: CLAMP_NONE },
  Q: { text: 'İki tarafı 40–60° havşalı delikli, talaş kırıcısız', hole: 'cs2', cs: '40–60°', cb: 0, clamp: CLAMP_CS },
  R: { text: 'Deliksiz, tek yüzü talaş kırıcılı', hole: 'none', cb: 1, clamp: CLAMP_NONE },
  T: { text: 'Tek tarafı 40–60° havşalı delikli, tek yüzü talaş kırıcılı', hole: 'cs1', cs: '40–60°', cb: 1, clamp: CLAMP_CS },
  U: { text: 'İki tarafı 40–60° havşalı delikli, iki yüzü talaş kırıcılı', hole: 'cs2', cs: '40–60°', cb: 2, clamp: CLAMP_CS },
  W: { text: 'Tek tarafı 40–60° havşalı delikli, talaş kırıcısız', hole: 'cs1', cs: '40–60°', cb: 0, clamp: CLAMP_CS },
  X: { text: 'Özel tasarım (üretici çizimine bakın)', hole: 'special', cb: null, clamp: 'Üretici kataloğuna bakın' },
};

/** Kalınlık kodları (mm) — inç kökenli standart kalınlıklar */
export const THICK: Record<string, { mm: number; inch: string }> = {
  S1: { mm: 1.39, inch: '' },
  '01': { mm: 1.59, inch: '1/16″' },
  T1: { mm: 1.98, inch: '5/64″' },
  '02': { mm: 2.38, inch: '3/32″' },
  T2: { mm: 2.78, inch: '7/64″' },
  '03': { mm: 3.18, inch: '1/8″' },
  T3: { mm: 3.97, inch: '5/32″' },
  '04': { mm: 4.76, inch: '3/16″' },
  '05': { mm: 5.56, inch: '7/32″' },
  '06': { mm: 6.35, inch: '1/4″' },
  '07': { mm: 7.94, inch: '5/16″' },
  '09': { mm: 9.52, inch: '3/8″' },
};

/** Silici (wiper) kenarlı frezeleme uçlarında 7. konum: 1. harf ana kesme açısı κr */
export const FACET_KR: Record<string, number | null> = { A: 45, D: 60, E: 75, F: 85, P: 90, Z: null };
/** 2. harf silici kenar boşluk açısı αn′ (2. konumla aynı harfler) */
export const FACET_CLEAR: Record<string, number | null> = { ...CLEARANCE, Z: null };
delete (FACET_CLEAR as Record<string, unknown>).O;

export const EDGE: Record<string, string> = {
  F: 'Keskin kenar',
  E: 'Yuvarlatılmış (honlanmış) kenar',
  T: 'Pah kırılmış kenar (negatif pah)',
  S: 'Pah kırılmış ve honlanmış kenar',
  K: 'Çift pah kırılmış kenar',
  P: 'Çift pah kırılmış ve honlanmış kenar',
};
export const HAND: Record<string, string> = { R: 'Sağ', L: 'Sol', N: 'Nötr (sağ ve sol)' };

/** Standart iç teğet daire çapları (mm) ve inç karşılıkları */
export const STD_IC: { mm: number; inch: string }[] = [
  { mm: 3.97, inch: '5/32″' },
  { mm: 4.76, inch: '3/16″' },
  { mm: 5.56, inch: '7/32″' },
  { mm: 6.35, inch: '1/4″' },
  { mm: 7.94, inch: '5/16″' },
  { mm: 9.525, inch: '3/8″' },
  { mm: 12.7, inch: '1/2″' },
  { mm: 15.875, inch: '5/8″' },
  { mm: 19.05, inch: '3/4″' },
  { mm: 25.4, inch: '1″' },
  { mm: 31.75, inch: '1 1/4″' },
];

/* ================================================================== Yardımcılar */

const mm = (x: number, d = 2) => fmtFixed(x, d);

/** Bir şekil ve IC için ISO boyut kodu (kesme kenarı uzunluğunun tam sayı kısmı). */
export function sizeCodeFor(shape: string, ic: number): number | null {
  const f = SHAPES[shape]?.edgePerIc;
  if (!f) return null;
  // +0,02: 21,997 mm (T, IC 12,7) gibi nominal 22,0 olan kenarlar 22 kodunu alır.
  return Math.floor(ic * f + 0.02);
}

/** Boyut kodundan olası standart IC’ler ve kenar uzunlukları. */
export function icCandidates(shape: string, code: number): { ic: number; inch: string; edge: number }[] {
  const f = SHAPES[shape]?.edgePerIc;
  if (!f) return [];
  return STD_IC.filter((s) => sizeCodeFor(shape, s.mm) === code).map((s) => ({ ic: s.mm, inch: s.inch, edge: s.mm * f }));
}

function tolFor(cls: string, shape: string | undefined, ic: number | undefined): string | null {
  const t = TOL[cls];
  if (!t) return null;
  const row = ic !== undefined ? IC_TOL.find((r) => Math.abs(r.ic - ic) < 0.01) : undefined;
  if (!row || !'JKLMN'.includes(cls)) return `m ${t.m} · s ${t.s} · d ${t.d} mm`;
  const mOk = 'MN'.includes(cls) ? (shape && 'CSTW'.includes(shape) ? row.m : null) : t.m;
  const parts = [mOk ? `m ${mOk}` : null, `s ${t.s}`, `d ${row.d} mm`].filter(Boolean);
  return `${parts.join(' · ')} (IC ${mm(ic!, 3)} için)`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ================================================================== Çözümleme */

export type Status = 'ok' | 'warn' | 'error' | 'pending' | 'none';

export interface Row {
  pos: number; // 1–9; 10 = üretici eki
  title: string;
  code: string;
  meaning: string;
  value?: string;
  status: Status;
  hint?: string;
}

export interface Decoded {
  input: string;
  empty: boolean;
  /** Biçimlenmiş kod: "CNMG 120408-MA" */
  display: string;
  rows: Row[];
  /** 1–7. konumlar hatasız */
  complete: boolean;
  /** Kullanıcıya gösterilecek ana mesaj(lar) */
  messages: { type: 'error' | 'warn' | 'info'; text: string }[];
  shape?: string;
  draw?: InsertShape | null;
  drawAngle?: number;
  angle?: number | null;
  clearance?: number | null;
  hole?: HoleDef;
  ic?: number;
  edge?: number;
  thickness?: number;
  radius?: number | null;
  facet?: { kr: number | null; clear: number | null };
  doubleSided?: boolean | null;
  edges?: number | null;
  chip?: string;
  grade?: string;
  ansi?: { input: string; iso: string };
  /** ISO 1832 dışı bir kod tanındıysa (kanal ucu, diş ucu, kater) açıklama */
  special?: string;
}

const TITLES: Record<number, string> = {
  1: 'Uç şekli',
  2: 'Boşluk açısı',
  3: 'Tolerans sınıfı',
  4: 'Delik / talaş kırıcı',
  5: 'Boyut',
  6: 'Kalınlık',
  7: 'Köşe',
  8: 'Kenar durumu',
  9: 'Kesme yönü',
  10: 'Üretici eki',
};
const EXAMPLE: Record<number, string> = { 1: 'C', 2: 'N', 3: 'M', 4: 'G', 5: '12', 6: '04', 7: '08' };

const CORE_FULL = /^[A-Z]{4}\d{2}(?:\d{2}|[TS]\d)(?:\d{2}|M0|[ADEFPZ][ABCDEFGNPZ])[FETSKP]?[RLN]?$/;
const ANSI = /^([A-Z]{4})([2-8])(1\.5|2\.5|3\.5|[1-6])(0\.5|[0-8])(?![\d.])(.*)$/;
const ANSI_TH: Record<string, string> = { '1': '01', '1.5': '02', '2': '03', '2.5': 'T3', '3': '04', '3.5': '05', '4': '06', '5': '07', '6': '09' };
const ANSI_R: Record<string, string> = { '0': '00', '0.5': '02', '1': '04', '2': '08', '3': '12', '4': '16', '5': '20', '6': '24', '8': '32' };

const list = (o: Record<string, unknown>) => Object.keys(o).join(', ');

function normalize(input: string): { s: string; dropped: boolean } {
  let s = input.toUpperCase().replace(/İ/g, 'I').replace(/[‐‑‒–—−_/]/g, '-');
  const before = s;
  s = s.replace(/[^A-Z0-9.\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { s, dropped: before.replace(/\s+/g, ' ').trim() !== s };
}

/** ANSI (inç) kodunu ISO metrik koda çevirir: CNMG 432 → CNMG 120408 */
export function ansiToIso(compact: string): { iso: string; rest: string } | { error: string } | null {
  const m = compact.match(ANSI);
  if (!m) return null;
  const [, letters, icD, th, rd, rest] = m;
  const shape = letters[0];
  if (!SHAPES[shape]?.edgePerIc) return { error: `ANSI kodu algılandı ancak ${shape} şekli için ISO boyut koduna çevrilemiyor.` };
  if (icD === '7') return { error: 'ANSI IC rakamı 7 (7/8″) standart bir uç boyutu değil.' };
  const ic = STD_IC.find((s) => Math.abs(s.mm - Number(icD) * 3.175) < 0.01)!.mm;
  const size = sizeCodeFor(shape, ic)!;
  const t = ANSI_TH[th];
  const r = ANSI_R[rd];
  if (!t || !r) return { error: 'ANSI kalınlık ya da köşe radyüsü rakamı tanınamadı.' };
  return { iso: `${letters} ${pad2(size)}${t}${r}`, rest };
}

/** Bilinen ISO dışı kodlar için yönlendirme mesajı. */
function nonIsoHint(compact: string): string | null {
  if (/^MGMN\d{3}/.test(compact)) {
    const w = Number(compact.slice(4, 7)) / 100;
    return `MGMN kanal açma ucu ISO 1832 kodu değil, üretici kodudur: MGMN ${compact.slice(4, 7)} ≈ ${fmtFixed(w, 2)} mm kanal genişliği. Uyumlu kater MGEHR/MGEHL (dış) ya da MGIVR/MGIVL (iç) serisidir.`;
  }
  if (/^\d{2}(ER|EL|IR|IL)/.test(compact)) {
    return 'Bu bir diş açma ucu kodu (ör. 16ER 1.5 ISO): 16 uç boyu, E dış / I iç diş, R/L kesme yönü, ardından hatve (mm) ve profil (ISO = metrik 60°). Bu araç ISO 1832 tornalama ve frezeleme uçlarını çözer.';
  }
  const h = compact.match(/^([CMPSD])([A-Z])([A-Z])([A-Z])([RLN])(\d{2})(\d{2})([A-Z])(\d{2})/);
  if (h && SHAPES[h[2]] && h[4] in CLEARANCE) {
    const hand = ({ R: 'sağ', L: 'sol', N: 'nötr' } as Record<string, string>)[h[5]];
    return `Bu kod bir kater (takım tutucu) koduna benziyor (ISO 5608): ${h[6]}×${h[7]} mm sap, ${hand} el. Uyumlu uçlar ${h[2]}${h[4]}·· ${h[9]}… ile başlar (ör. ${h[2]}${h[4]}${h[1] === 'S' ? 'MT' : 'MG'} ${h[9]}…).`;
  }
  if (/^\d/.test(compact)) return 'ISO uç kodu bir harfle, uç şekliyle başlar (ör. CNMG, DCMT, WNMG).';
  return null;
}

type TokState = 'ok' | 'pending' | 'missing' | 'partial' | 'bad';
interface Tok { code: string; state: TokState }

export function decode(input: string): Decoded {
  const { s: norm, dropped } = normalize(input ?? '');
  const out: Decoded = { input, empty: !norm, display: '', rows: [], complete: false, messages: [] };
  if (!norm) return out;
  if (dropped) out.messages.push({ type: 'info', text: 'Kodda geçersiz karakterler vardı; yok sayıldı.' });

  // 1) Gövde ve üretici eki: ilk tireden sonrası ek. Tire yoksa boşlukla ayrılmış ek aranır.
  const dash = norm.indexOf('-');
  let head = dash >= 0 ? norm.slice(0, dash).trim() : norm;
  let tail: string | undefined = dash >= 0 ? norm.slice(dash + 1).replace(/-/g, ' ').trim() || undefined : undefined;
  let tailNoDash = false;
  if (dash < 0) {
    const toks = head.split(' ');
    for (let k = toks.length - 1; k >= 1; k--) {
      if (CORE_FULL.test(toks.slice(0, k).join(''))) {
        head = toks.slice(0, k).join(' ');
        tail = toks.slice(k).join(' ') || undefined;
        tailNoDash = !!tail;
        break;
      }
    }
  }
  let compact = head.replace(/\s+/g, '');

  // 2) ANSI (inç) kodu: CNMG 432 → CNMG 120408
  const ansi = ansiToIso(compact);
  if (ansi && 'error' in ansi) {
    out.messages.push({ type: 'error', text: ansi.error });
  } else if (ansi) {
    const iso = ansi.iso;
    const extra = [ansi.rest, tail].filter(Boolean).join(' ');
    const res = decode(extra ? `${iso}-${extra}` : iso);
    res.input = input;
    res.ansi = { input: `${compact.slice(0, 4)} ${compact.slice(4, compact.length - ansi.rest.length)}`, iso };
    res.messages.unshift({ type: 'info', text: `ANSI (inç) kodu algılandı: ${res.ansi.input} = ISO ${iso}. Aşağıda ISO karşılığı çözüldü.` });
    return res;
  }

  const special = nonIsoHint(compact);

  // 3) Konumları ayır
  const T: Record<number, Tok> = {};
  let i = 0;
  let broken = false;
  for (let p = 1; p <= 4; p++) {
    const ch = compact[i];
    if (ch === undefined) { T[p] = { code: '', state: 'pending' }; continue; }
    if (broken || /\d/.test(ch)) { broken = true; T[p] = { code: '', state: 'missing' }; continue; }
    T[p] = { code: ch, state: /[A-Z]/.test(ch) ? 'ok' : 'bad' };
    i++;
  }
  const take = (p: number, full: RegExp, part: RegExp) => {
    const t = compact.slice(i, i + 2);
    if (!t) T[p] = { code: '', state: 'pending' };
    else if (t.length === 1) { T[p] = { code: t, state: part.test(t) ? 'partial' : 'bad' }; i += 1; }
    else { T[p] = { code: t, state: full.test(t) ? 'ok' : 'bad' }; i += 2; }
  };
  take(5, /^\d\d$/, /^\d$/);
  take(6, /^(\d\d|T\d|S1)$/, /^[\dTS]$/);
  take(7, /^(\d\d|M0|[ADEFPZ][ABCDEFGNPZ])$/, /^[\dMADEFPZ]$/);
  let rest = compact.slice(i);
  const coreOk = [1, 2, 3, 4, 5, 6, 7].every((p) => T[p].state === 'ok');
  let p8 = '', p9 = '';
  if (coreOk && rest) {
    const m = rest.match(/^([FETSKP])?([RLN])?$/);
    if (m) {
      p8 = m[1] ?? '';
      p9 = m[2] ?? '';
      if (!tail && rest.length === 2) {
        out.messages.push({ type: 'info', text: `Sondaki “${rest}” 8. ve 9. konum olarak okundu. Bazı markalar talaş kırıcı kodunu tiresiz yazar; kutudaki kodda tire varsa sonrası talaş kırıcıdır.` });
      }
    } else if (!tail) {
      tail = rest;
      tailNoDash = true;
    } else {
      out.messages.push({ type: 'warn', text: `“${rest}” tanınamadı; 8. konum F, E, T, S, K, P; 9. konum R, L, N olabilir.` });
    }
    rest = '';
  } else if (!coreOk && rest) {
    // Gövde bozuksa kalan karakterler 8–9 diye yorumlanmaz.
  }

  // 4) Konumları yorumla
  const rows: Row[] = [];
  const row = (pos: number, code: string, meaning: string, status: Status, value?: string, hint?: string) =>
    rows.push({ pos, title: TITLES[pos], code, meaning, value, status, hint });
  const pendingRow = (p: number, hint?: string) =>
    row(p, '', 'Bekleniyor', 'pending', undefined, hint ?? `Sıradaki karakter: ${TITLES[p].toLowerCase()} (ör. ${EXAMPLE[p]})`);
  const missingRow = (p: number) =>
    row(p, '', 'Eksik', 'error', undefined, 'Harf bölümü 4 karakter olmalı (ör. CNMG); rakamlar erken başladı.');

  // 1 — şekil
  const t1 = T[1];
  if (t1.state === 'pending') pendingRow(1);
  else if (t1.state === 'missing') missingRow(1);
  else if (!SHAPES[t1.code]) row(1, t1.code, 'Tanınmayan şekil harfi', 'error', undefined, `“${t1.code}” bir uç şekli harfi değil. Geçerli harfler: ${list(SHAPES)}.`);
  else {
    const sd = SHAPES[t1.code];
    out.shape = t1.code;
    out.draw = sd.draw;
    out.drawAngle = sd.drawAngle;
    out.angle = sd.angle;
    if (t1.code === 'X') row(1, 'X', sd.name, 'warn', undefined, 'Özel şekilli uç; ölçüler üretici çiziminde verilir.');
    else row(1, t1.code, sd.angle ? `${sd.name}, ${sd.angle}°` : sd.name, 'ok', sd.angle ? `εr = ${sd.angle}°` : 'Köşesiz');
  }
  const shape = out.shape;

  // 2 — boşluk açısı
  const t2 = T[2];
  if (t2.state === 'pending') pendingRow(2);
  else if (t2.state === 'missing') missingRow(2);
  else if (!(t2.code in CLEARANCE)) row(2, t2.code, 'Tanınmayan boşluk açısı harfi', 'error', undefined, `“${t2.code}” geçerli değil. Geçerli harfler: N (0°), A (3°), B (5°), C (7°), P (11°), D (15°), E (20°), F (25°), G (30°), O (özel).`);
  else {
    const a = CLEARANCE[t2.code];
    out.clearance = a;
    if (a === null) row(2, t2.code, 'Özel boşluk açısı', 'warn', undefined, 'Açı üretici kataloğunda ayrıca belirtilir.');
    else row(2, t2.code, a === 0 ? '0° — negatif uç' : `${a}° — pozitif uç`, 'ok', `αn = ${a}°`);
  }

  // 5 — boyut (tolerans IC’ye bağlı olduğu için önce)
  const t5 = T[5];
  const rows5: Row[] = [];
  const r5 = (meaning: string, status: Status, value?: string, hint?: string) => {
    rows5.push({ pos: 5, title: TITLES[5], code: t5.code, meaning, value, status, hint });
  };
  if (t5.state === 'pending') r5('Bekleniyor', 'pending', undefined, 'Sıradaki: iki haneli boyut kodu (ör. 12)');
  else if (t5.state === 'partial') r5('Eksik', 'pending', undefined, 'Boyut kodu iki hanelidir (ör. 09, 12, 16).');
  else if (t5.state === 'bad') r5('Geçersiz', 'error', undefined, 'Boyut iki rakam olmalı (ör. 12). Harf bölümünde fazladan ya da eksik karakter olabilir.');
  else {
    const n = Number(t5.code);
    if (n === 0) r5('Geçersiz', 'error', undefined, 'Boyut kodu 00 olamaz.');
    else if (!shape) r5(`Kesme kenarı ≈ ${n} mm`, 'warn', undefined, 'Şekil bilinmeden IC hesaplanamaz.');
    else if (shape === 'R') {
      out.ic = n;
      r5('Yuvarlak uç çapı', 'ok', `Ø${n} mm`);
    } else if (shape === 'X') r5('Özel uç boyutu', 'warn', `≈ ${n} mm`);
    else if (!SHAPES[shape].edgePerIc) {
      r5('Kesme kenarı uzunluğu', 'ok', `≈ ${n} mm`, 'Bu şekilde iç teğet daire (IC) tanımlı değil; kod uzun kesme kenarının tam sayı kısmıdır.');
      out.edge = n;
    } else {
      const c = icCandidates(shape, n);
      if (c.length === 1) {
        out.ic = c[0].ic;
        out.edge = c[0].edge;
        const e = Math.abs(c[0].edge - c[0].ic) < 1e-9 ? mm(c[0].ic, 3) : fmtFixed(c[0].edge, 1, 1);
        r5('Kesme kenarı uzunluğu', 'ok', `${e} mm · IC ${mm(c[0].ic, 3)} mm (${c[0].inch})`);
      } else if (c.length > 1) {
        r5('Kesme kenarı uzunluğu', 'warn', `≈ ${fmtFixed(c[0].edge, 1, 1)}–${fmtFixed(c[c.length - 1].edge, 1, 1)} mm · IC ${c.map((x) => mm(x.ic, 3)).join(' ya da ')} mm`, 'Bu kod iki standart IC’ye karşılık gelebilir; ölçüyü katalogdan doğrulayın.');
      } else {
        r5(`Kesme kenarı ≈ ${n} mm`, 'warn', undefined, 'Bu şekil için bu koda karşılık gelen standart bir IC yok; kodu kontrol edin ya da üretici kataloğuna bakın.');
      }
    }
  }

  // 3 — tolerans
  const t3 = T[3];
  if (t3.state === 'pending') pendingRow(3);
  else if (t3.state === 'missing') missingRow(3);
  else if (!TOL[t3.code]) row(3, t3.code, 'Tanınmayan tolerans sınıfı', 'error', undefined, `“${t3.code}” geçerli değil. Geçerli sınıflar: ${list(TOL)}.`);
  else row(3, t3.code, `${t3.code} sınıfı — ${TOL[t3.code].kind.toLowerCase()}`, 'ok', tolFor(t3.code, shape, out.ic) ?? undefined);

  // 4 — delik / talaş kırıcı
  const t4 = T[4];
  if (t4.state === 'pending') pendingRow(4);
  else if (t4.state === 'missing') missingRow(4);
  else if (!HOLE[t4.code]) row(4, t4.code, 'Tanınmayan tip harfi', 'error', undefined, `“${t4.code}” geçerli değil. Geçerli harfler: ${list(HOLE)}.`);
  else {
    out.hole = HOLE[t4.code];
    row(4, t4.code, HOLE[t4.code].text, t4.code === 'X' ? 'warn' : 'ok', HOLE[t4.code].clamp);
  }

  rows.push(...rows5);

  // 6 — kalınlık
  const t6 = T[6];
  if (t6.state === 'pending') pendingRow(6, 'Sıradaki: kalınlık kodu (ör. 04 = 4,76 mm; T3 = 3,97 mm)');
  else if (t6.state === 'partial') row(6, t6.code, 'Eksik', 'pending', undefined, 'Kalınlık kodu iki karakterdir (ör. 03, T3, 04).');
  else if (t6.state === 'bad') row(6, t6.code, 'Geçersiz', 'error', undefined, 'Kalınlık iki rakam ya da T + rakam olmalı (ör. 04, T3).');
  else if (THICK[t6.code]) {
    const th = THICK[t6.code];
    out.thickness = th.mm;
    row(6, t6.code, 'Uç kalınlığı s', 'ok', `${mm(th.mm)} mm${th.inch ? ` (${th.inch})` : ''}`);
  } else if (/^\d\d$/.test(t6.code) && t6.code !== '00') {
    const n = Number(t6.code);
    row(6, t6.code, 'Standart dışı kalınlık kodu', 'warn', n >= 10 ? `${fmtFixed(n / 10, 1)} mm olabilir` : `≈ ${n} mm`,
      n >= 10
        ? `“${t6.code}” ISO tablosunda yok. Bazı üreticiler frezeleme uçlarında kalınlığı ondalıklı yazar (ör. APMT 1135 → 3,5 mm); katalogdan doğrulayın.`
        : `“${t6.code}” standart inç kökenli kalınlıklardan biri değil; ISO kuralına göre kalınlığın tam sayı kısmı ${n} mm’dir.`);
  } else row(6, t6.code, 'Geçersiz', 'error', undefined, `“${t6.code}” bir kalınlık kodu değil. Örnekler: 01, T1, 02, 03, T3, 04, 05, 06, 07, 09.`);

  // 7 — köşe
  const t7 = T[7];
  if (t7.state === 'pending') pendingRow(7, 'Sıradaki: köşe radyüsü kodu (ör. 04 = 0,4 mm; 08 = 0,8 mm)');
  else if (t7.state === 'partial') row(7, t7.code, 'Eksik', 'pending', undefined, 'Köşe kodu iki karakterdir (ör. 04, 08, M0 ya da frezeleme ucunda PD).');
  else if (t7.state === 'bad') row(7, t7.code, 'Geçersiz', 'error', undefined, 'Köşe kodu iki rakam (ör. 08), M0 ya da iki harfli silici kenar kodu (ör. PD, AF) olmalı.');
  else if (t7.code === 'M0') {
    out.radius = null;
    if (shape === 'R' || !shape) row(7, 'M0', 'Yuvarlak uç (metrik) — köşe radyüsü yok', 'ok', '—');
    else row(7, 'M0', 'Yuvarlak uç kodu', 'warn', '—', 'M0 yalnızca yuvarlak (R) uçlarda kullanılır; şekil harfini kontrol edin.');
  } else if (/^\d\d$/.test(t7.code)) {
    const r = Number(t7.code) / 10;
    out.radius = r;
    if (shape === 'R') {
      if (r === 0) row(7, '00', 'Yuvarlak uç — köşe radyüsü yok', 'ok', '—');
      else row(7, t7.code, 'Köşe radyüsü', 'warn', `rε = ${fmtFixed(r, 1)} mm`, 'Yuvarlak uçlarda bu konum genellikle M0 (metrik) ya da 00’dır.');
    } else if (r === 0) row(7, '00', 'Keskin köşe (radyüssüz)', 'ok', 'rε = 0');
    else row(7, t7.code, 'Köşe radyüsü', r > 6.4 ? 'warn' : 'ok', `rε = ${fmtFixed(r, 1)} mm`, r > 6.4 ? 'Alışılmadık büyüklükte bir radyüs; kodu kontrol edin.' : undefined);
  } else {
    const kr = FACET_KR[t7.code[0]];
    const ac = FACET_CLEAR[t7.code[1]];
    out.facet = { kr, clear: ac ?? null };
    out.radius = null;
    row(7, t7.code, 'Silici (wiper) kenarlı frezeleme ucu', 'ok',
      `κr ${kr === null ? 'özel' : `${kr}°`} · silici kenar αn′ ${ac === null || ac === undefined ? 'özel' : `${ac}°`}`,
      'Frezeleme uçlarında 7. konum köşe radyüsü yerine iki harfle verilir: ana kesme açısı (κr) ve silici kenar boşluk açısı.');
  }

  // 8 — kenar durumu (isteğe bağlı)
  if (p8) row(8, p8, EDGE[p8], 'ok');
  else row(8, '', 'Belirtilmemiş (isteğe bağlı)', 'none');
  // 9 — kesme yönü (isteğe bağlı)
  if (p9) row(9, p9, HAND[p9], 'ok', p9 === 'N' ? 'Her iki yönde' : `${HAND[p9]} el`);
  else row(9, '', 'Belirtilmemiş (isteğe bağlı)', 'none');

  // 10 — üretici eki
  if (tail) {
    const parts = tail.split(' ').filter(Boolean);
    out.chip = parts[0];
    out.grade = parts.slice(1).join(' ') || undefined;
    row(10, out.chip, 'Üretici talaş kırıcı kodu (ISO dışı)', 'ok', out.grade ? `Kalite (grade): ${out.grade}` : undefined,
      `Anlamı markaya göre değişir; kutudaki markanın talaş kırıcı tablosuna bakın.${tailNoDash ? ' (Tiresiz yazılmış ek olarak okundu.)' : ''}`);
  } else row(10, '', 'Yok (isteğe bağlı)', 'none');

  rows.sort((a, b) => a.pos - b.pos);
  out.rows = rows;
  out.complete = rows.filter((r) => r.pos <= 7).every((r) => r.status === 'ok' || r.status === 'warn');

  // Çift taraflı kullanım ve kesme köşesi sayısı (tipik)
  if (out.hole && out.clearance !== undefined) {
    const dbl = out.hole.cb === null ? null : out.clearance === 0 && (out.hole.cb === 2 || (out.hole.cb === 0 && out.hole.hole !== 'cs1'));
    out.doubleSided = dbl;
    const corners = shape ? SHAPES[shape].corners : undefined;
    out.edges = corners && dbl !== null ? corners * (dbl ? 2 : 1) : null;
  }

  // Biçimlenmiş kod
  const p = (n: number) => (T[n].state === 'ok' ? T[n].code : '');
  const letters = [1, 2, 3, 4].map(p).join('');
  const nums = [5, 6, 7].map(p).join('');
  out.display = `${letters}${nums ? ` ${nums}` : ''}${p8}${p9}${out.chip ? `-${out.chip}` : ''}${out.grade ? ` ${out.grade}` : ''}`.trim();

  // Mesajlar
  if (special && !out.complete) {
    out.special = special;
    out.messages.unshift({ type: 'info', text: special });
  }
  const firstErr = rows.find((r) => r.status === 'error');
  if (firstErr) out.messages.push({ type: 'error', text: `${firstErr.pos}. konum (${firstErr.title.toLowerCase()}): ${firstErr.hint ?? firstErr.meaning}` });
  else {
    const pend = rows.find((r) => r.status === 'pending');
    if (pend) out.messages.push({ type: 'info', text: pend.hint ?? `Sıradaki: ${pend.title.toLowerCase()}` });
  }
  const warn = rows.filter((r) => r.status === 'warn' && r.hint);
  for (const w of warn) out.messages.push({ type: 'warn', text: `${w.pos}. konum: ${w.hint}` });
  return out;
}
