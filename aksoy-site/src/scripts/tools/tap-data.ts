// Metrik diş (ISO 261 / ISO 965-1) kılavuz matkap verileri ve hesapları.
// Sayfadaki statik tablo ve tarayıcıdaki hesaplayıcı aynı kaynağı kullanır.
import { roundTo } from './format';

/** ISO 261 kaba hatveler (mm) */
export const COARSE: Record<string, number> = {
  '1': 0.25, '1.2': 0.25, '1.4': 0.3, '1.6': 0.35, '2': 0.4, '2.5': 0.45, '3': 0.5, '3.5': 0.6, '4': 0.7, '5': 0.8,
  '6': 1, '7': 1, '8': 1.25, '10': 1.5, '12': 1.75, '14': 2, '16': 2, '18': 2.5, '20': 2.5, '22': 2.5, '24': 3,
  '27': 3, '30': 3.5, '33': 3.5, '36': 4, '39': 4, '42': 4.5, '45': 4.5, '48': 5, '52': 5, '56': 5.5, '60': 5.5, '64': 6,
};

/** ISO 261 ince hatveler (yaygın seçim, M3–M36) */
export const FINE: Record<string, number[]> = {
  '3': [0.35], '4': [0.5], '5': [0.5], '6': [0.75], '8': [1, 0.75], '10': [1.25, 1, 0.75], '12': [1.5, 1.25, 1],
  '14': [1.5, 1.25, 1], '16': [1.5, 1], '18': [2, 1.5, 1], '20': [2, 1.5, 1], '22': [2, 1.5, 1], '24': [2, 1.5, 1],
  '27': [2, 1.5, 1], '30': [3, 2, 1.5, 1], '33': [3, 2, 1.5], '36': [3, 2, 1.5],
};

/** ISO 965-1, iç diş küçük çapı toleransı TD1, tolerans derecesi 6 (6H) — mm */
export const TD1_6: Record<string, number> = {
  '0.3': 0.085, '0.35': 0.1, '0.4': 0.112, '0.45': 0.125, '0.5': 0.14, '0.6': 0.16, '0.7': 0.18, '0.75': 0.19, '0.8': 0.2,
  '1': 0.236, '1.25': 0.265, '1.5': 0.3, '1.75': 0.335, '2': 0.375, '2.5': 0.45, '3': 0.5, '3.5': 0.56, '4': 0.6,
  '4.5': 0.67, '5': 0.71, '5.5': 0.75, '6': 0.8,
};

export interface TapRow {
  d: number;
  p: number;
  coarse: boolean;
  /** Talaş kaldıran kılavuz için önerilen standart matkap çapı (DIN 336 / ISO 2306 uygulaması) */
  drill: number;
}

/** Tablo satırları — önerilen matkap çapları yaygın standart matkap ölçüleridir. */
export const TAP_ROWS: TapRow[] = [
  { d: 3, p: 0.5, coarse: true, drill: 2.5 },
  { d: 4, p: 0.7, coarse: true, drill: 3.3 },
  { d: 5, p: 0.8, coarse: true, drill: 4.2 },
  { d: 6, p: 1, coarse: true, drill: 5 },
  { d: 8, p: 1.25, coarse: true, drill: 6.8 },
  { d: 10, p: 1.5, coarse: true, drill: 8.5 },
  { d: 12, p: 1.75, coarse: true, drill: 10.2 },
  { d: 14, p: 2, coarse: true, drill: 12 },
  { d: 16, p: 2, coarse: true, drill: 14 },
  { d: 18, p: 2.5, coarse: true, drill: 15.5 },
  { d: 20, p: 2.5, coarse: true, drill: 17.5 },
  { d: 22, p: 2.5, coarse: true, drill: 19.5 },
  { d: 24, p: 3, coarse: true, drill: 21 },
  { d: 3, p: 0.35, coarse: false, drill: 2.65 },
  { d: 4, p: 0.5, coarse: false, drill: 3.5 },
  { d: 5, p: 0.5, coarse: false, drill: 4.5 },
  { d: 6, p: 0.75, coarse: false, drill: 5.2 },
  { d: 8, p: 1, coarse: false, drill: 7 },
  { d: 8, p: 0.75, coarse: false, drill: 7.2 },
  { d: 10, p: 1.25, coarse: false, drill: 8.8 },
  { d: 10, p: 1, coarse: false, drill: 9 },
  { d: 10, p: 0.75, coarse: false, drill: 9.2 },
  { d: 12, p: 1.5, coarse: false, drill: 10.5 },
  { d: 12, p: 1.25, coarse: false, drill: 10.8 },
  { d: 12, p: 1, coarse: false, drill: 11 },
  { d: 14, p: 1.5, coarse: false, drill: 12.5 },
  { d: 16, p: 1.5, coarse: false, drill: 14.5 },
  { d: 16, p: 1, coarse: false, drill: 15 },
  { d: 18, p: 2, coarse: false, drill: 16 },
  { d: 18, p: 1.5, coarse: false, drill: 16.5 },
  { d: 18, p: 1, coarse: false, drill: 17 },
  { d: 20, p: 2, coarse: false, drill: 18 },
  { d: 20, p: 1.5, coarse: false, drill: 18.5 },
  { d: 20, p: 1, coarse: false, drill: 19 },
  { d: 22, p: 2, coarse: false, drill: 20 },
  { d: 22, p: 1.5, coarse: false, drill: 20.5 },
  { d: 22, p: 1, coarse: false, drill: 21 },
  { d: 24, p: 2, coarse: false, drill: 22 },
  { d: 24, p: 1.5, coarse: false, drill: 22.5 },
  { d: 24, p: 1, coarse: false, drill: 23 },
];

const key = (x: number) => String(Number(x.toFixed(4)));

/** İç diş küçük çapı D1 sınırları (6H): min = D − 1,082532·P, maks = min + TD1(6) */
export function minorDia(d: number, p: number): { min: number; max: number | null } {
  const min = d - 1.0825318 * p;
  const td = TD1_6[key(p)];
  return { min, max: td !== undefined ? min + td : null };
}

/** Talaş kaldıran kılavuz için teorik matkap çapı: D − P */
export const cutDrill = (d: number, p: number) => d - p;

/** Ovalama (form) kılavuz için yaklaşık delik çapı: D − 0,45·P, 0,05 mm’ye yuvarlanmış */
export const formDrill = (d: number, p: number) => roundTo(d - 0.45 * p, 0.05);

export function isStandard(d: number, p: number): 'coarse' | 'fine' | 'other' | 'unknown' {
  const k = key(d);
  if (COARSE[k] === undefined && !FINE[k]) return 'unknown';
  if (COARSE[k] !== undefined && Math.abs(COARSE[k] - p) < 1e-6) return 'coarse';
  if (FINE[k]?.some((f) => Math.abs(f - p) < 1e-6)) return 'fine';
  return 'other';
}

/** Standart pitch listesi (kaba önce) */
export function pitchesFor(d: number): { p: number; coarse: boolean }[] {
  const k = key(d);
  const out: { p: number; coarse: boolean }[] = [];
  if (COARSE[k] !== undefined) out.push({ p: COARSE[k], coarse: true });
  for (const f of FINE[k] ?? []) out.push({ p: f, coarse: false });
  return out;
}

/**
 * Önerilen matkap: tablo satırı varsa onu, yoksa D − P’ye en yakın ve 6H küçük çap aralığında kalan
 * 0,1 mm adımlı ölçüyü (eşitlikte küçük olanı) döndürür.
 */
export function suggestDrill(d: number, p: number): { drill: number; fromTable: boolean } {
  const row = TAP_ROWS.find((r) => Math.abs(r.d - d) < 1e-6 && Math.abs(r.p - p) < 1e-6);
  if (row) return { drill: row.drill, fromTable: true };
  const target = d - p;
  const step = d < 3 ? 0.05 : 0.1;
  const lo = roundTo(Math.floor(target / step + 1e-9) * step, step);
  const hi = roundTo(lo + step, step);
  const { min, max } = minorDia(d, p);
  const inRange = (x: number) => x >= min - 1e-9 && (max === null || x <= max + 1e-9);
  const cands = [lo, hi].filter(inRange).sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b);
  return { drill: cands[0] ?? roundTo(target, step), fromTable: false };
}
