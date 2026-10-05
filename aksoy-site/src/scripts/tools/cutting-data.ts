// Kesme hızı hesaplayıcısının formülleri ve ISO 513 malzeme gruplarına göre başlangıç değerleri.
// Hem sayfa (statik tablo) hem tarayıcı betiği bu dosyayı kullanır; tek kaynak.

export type Op = 'torna' | 'freze' | 'delme' | 'kilavuz';
export type ToolMat = 'karbur' | 'hss';
export type Iso = 'P' | 'M' | 'K' | 'N' | 'S' | 'H';

/* ------------------------------------------------------------------ Formüller */

/** Devir n [dev/dk] = 1000·Vc / (π·D) — Vc [m/dk], D [mm] */
export const rpm = (vc: number, d: number) => (1000 * vc) / (Math.PI * d);
/** Kesme hızı Vc [m/dk] = π·D·n / 1000 */
export const cuttingSpeed = (n: number, d: number) => (Math.PI * d * n) / 1000;
/** Tornalama / delme ilerleme hızı Vf [mm/dk] = fn·n */
export const feedRev = (fn: number, n: number) => fn * n;
/** Frezeleme tabla ilerlemesi Vf [mm/dk] = fz·z·n */
export const feedMill = (fz: number, z: number, n: number) => fz * z * n;
/** Kılavuz ilerlemesi Vf [mm/dk] = P·n */
export const feedTap = (p: number, n: number) => p * n;
/** Tornalama talaş kaldırma Q [cm³/dk] = Vc·ap·fn */
export const mrrTurn = (vc: number, ap: number, fn: number) => vc * ap * fn;
/** Frezeleme talaş kaldırma Q [cm³/dk] = ap·ae·Vf / 1000 */
export const mrrMill = (ap: number, ae: number, vf: number) => (ap * ae * vf) / 1000;
/** Delme (dolu malzeme) talaş kaldırma Q [cm³/dk] = Vc·D·fn / 4  (= π·D²/4 · Vf / 1000) */
export const mrrDrill = (vc: number, d: number, fn: number) => (vc * d * fn) / 4;

/* ------------------------------------------------------------------ Etiketler */

export const OPS: { id: Op; label: string; short: string }[] = [
  { id: 'torna', label: 'Tornalama', short: 'Torna' },
  { id: 'freze', label: 'Frezeleme', short: 'Freze' },
  { id: 'delme', label: 'Delme', short: 'Delme' },
  { id: 'kilavuz', label: 'Kılavuz', short: 'Kılavuz' },
];

export const ISO_GROUPS: { g: Iso; name: string; ex: string }[] = [
  { g: 'P', name: 'Çelik', ex: 'St37, C45, 42CrMo4, 16MnCr5' },
  { g: 'M', name: 'Paslanmaz', ex: '304, 316L, dubleks' },
  { g: 'K', name: 'Dökme demir', ex: 'GG25, GGG40 (sfero)' },
  { g: 'N', name: 'Demir dışı', ex: 'Alüminyum, bakır, pirinç' },
  { g: 'S', name: 'Süper alaşım', ex: 'Inconel, titanyum (Ti6Al4V)' },
  { g: 'H', name: 'Sertleştirilmiş', ex: '45–65 HRC çelik' },
];

export const TOOL_LABEL: Record<Op, Record<ToolMat, string>> = {
  torna: { karbur: 'Kaplamalı karbür uç', hss: 'HSS kalem' },
  freze: { karbur: 'Karbür parmak / takma uçlu freze', hss: 'HSS / HSS-E parmak freze' },
  delme: { karbur: 'Karbür matkap', hss: 'HSS matkap' },
  kilavuz: { karbur: 'Karbür kılavuz', hss: 'HSS-E kılavuz' },
};

/* ------------------------------------------------------------------ Başlangıç Vc değerleri */

export interface VcRange {
  min: number;
  max: number;
  /** true: aralığın tamamı ya da bir kısmı yayınlanmış veriyle doğrulanmamış editoryal tahmin */
  est: boolean;
  note?: string;
}
export interface VcNone {
  none: string;
}
export type VcCell = VcRange | VcNone;
export const isRange = (c: VcCell): c is VcRange => 'min' in c;

const r = (min: number, max: number, est: boolean, note?: string): VcRange => ({ min, max, est, note });
const none = (why: string): VcNone => ({ none: why });

/**
 * Başlangıç kesme hızları (m/dk). Kaynak: araştırma notları §7 — üretici katalog özetleri
 * (Korloy, Tungaloy, Mitsubishi) ve takım tedarikçisi tabloları. est=true hücreler tahmindir.
 * Hepsi "başlangıç değeri"dir; markanın katalog değeri esastır.
 */
export const VC: Record<Op, Record<ToolMat, Record<Iso, VcCell>>> = {
  torna: {
    karbur: {
      P: r(150, 350, false),
      M: r(100, 220, false),
      K: r(150, 350, true),
      N: r(300, 1000, true, 'Alüminyum alaşımları için; bakır ve pirinçte alt sınırdan başlayın.'),
      S: r(30, 90, true, 'Ni esaslı (Inconel) ≈ 30–70, titanyum ≈ 40–90 m/dk.'),
      H: r(40, 80, true, 'Kaplamalı karbür yaklaşık 50 HRC’ye kadar; daha sert malzemede CBN uç kullanılır (≈ 80–200 m/dk).'),
    },
    hss: {
      P: r(20, 40, true),
      M: r(10, 20, true),
      K: r(15, 30, true),
      N: r(60, 150, true),
      S: r(5, 15, true),
      H: none('Sertleştirilmiş malzeme HSS kalemle işlenmez; karbür ya da CBN uç kullanın.'),
    },
  },
  freze: {
    karbur: {
      P: r(80, 250, true, 'Karbür parmak freze ≈ 80–180 · takma uçlu freze ≈ 150–250 m/dk.'),
      M: r(60, 180, true, 'Karbür parmak freze ≈ 60–100 · takma uçlu freze ≈ 100–180 m/dk.'),
      K: r(100, 250, true),
      N: r(300, 1000, true, 'Alüminyumda karbür parmak freze ≈ 300–600 m/dk; tezgâh devri çoğu zaman sınırdır.'),
      S: r(30, 60, true, 'Titanyum (Ti6Al4V) ≈ 40–60 m/dk; Ni esaslı alaşımlarda alt sınırdan başlayın.'),
      H: r(60, 100, false, '45–55 HRC, karbür parmak freze.'),
    },
    hss: {
      P: r(20, 35, true),
      M: r(10, 20, true),
      K: r(15, 30, true),
      N: r(60, 150, true),
      S: r(5, 15, true),
      H: none('Sertleştirilmiş malzeme HSS frezeyle işlenmez; karbür parmak freze kullanın.'),
    },
  },
  delme: {
    karbur: {
      P: r(70, 120, true),
      M: r(40, 70, true),
      K: r(70, 120, true),
      N: r(150, 300, false),
      S: r(20, 40, true),
      H: r(30, 60, true, 'Yaklaşık 55 HRC’ye kadar, sert malzeme için üretilmiş karbür matkapla.'),
    },
    hss: {
      P: r(20, 30, false),
      M: r(8, 15, false),
      K: r(20, 35, false),
      N: r(60, 120, false),
      S: r(4, 10, true),
      H: none('Sertleştirilmiş malzeme HSS matkapla delinmez; karbür matkap kullanın.'),
    },
  },
  kilavuz: {
    karbur: {
      P: none('Karbür kılavuz hızı markaya ve kaplamaya göre çok değişir; katalog değerini girin.'),
      M: none('Karbür kılavuz hızı markaya ve kaplamaya göre çok değişir; katalog değerini girin.'),
      K: none('Karbür kılavuz hızı markaya ve kaplamaya göre çok değişir; katalog değerini girin.'),
      N: none('Karbür kılavuz hızı markaya ve kaplamaya göre çok değişir; katalog değerini girin.'),
      S: none('Karbür kılavuz hızı markaya ve kaplamaya göre çok değişir; katalog değerini girin.'),
      H: none('Sertleştirilmiş malzemede yalnızca bu iş için üretilmiş karbür kılavuz kullanılır; katalog değerini girin.'),
    },
    hss: {
      P: r(7, 15, true, 'Alaşımlı / ıslah çeliği ≈ 7–10 m/dk; yumuşak yapı çeliğinde üst sınıra yaklaşılabilir.'),
      M: r(5, 7, false),
      K: r(11, 14, false, 'Gri dökme demir çoğunlukla kuru işlenir.'),
      N: r(15, 23, false, 'Alüminyumda yığıntı talaşa karşı bol soğutma kullanın.'),
      S: r(2, 5, true),
      H: none('Sertleştirilmiş malzemede HSS-E kılavuz kullanılmaz.'),
    },
  },
};

/** Aralığın ortası, anlamlı bir adıma yuvarlanmış (ön doldurma için). */
export function midVc(c: VcRange): number {
  const m = (c.min + c.max) / 2;
  const step = m >= 50 ? 5 : m >= 10 ? 1 : 0.5;
  return Math.round(m / step) * step;
}

/** Besleme (ilerleme) için tipik başlangıç aralıkları — yalnızca yardım metni. */
export const FEED_HINT: Record<Op, string> = {
  torna: 'Tipik fn: finiş 0,05–0,15 · orta 0,15–0,35 · kaba 0,3–0,6 mm/dev. Talaş kırıcının aralığında kalın; finişte fn ≤ köşe radyüsünün yarısı.',
  freze: 'Tipik fz: karbür parmak freze Ø10, çelik ≈ 0,03–0,05 · takma uçlu tarama ≈ 0,1–0,25 mm/diş. Paslanmazda 0,03 mm/diş altına inmeyin.',
  delme: 'Tipik fn: karbür matkap, çelik ≈ 0,01–0,02 × D · HSS matkap ≈ 0,01–0,015 × D mm/dev.',
  kilavuz: 'Kılavuzda ilerleme hatveye eşittir: devir başına P mm. Senkron (rijit) kılavuz çekmede başka bir değer kılavuzu zorlar.',
};
