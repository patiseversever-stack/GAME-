// Katalog sayfaları için ortak, saf (DOM'suz) yardımcılar: ISO grupları, uç şekilleri,
// ürün sıralaması, ISO 1832 kod çözümü ve BreadcrumbList şeması.
import type { InsertShape, IsoGroup, Product } from '../data/types';
import { categories } from '../data/categories';

/** t: ad, k: dar alanlar için kısa ad, s: örnek malzemeler */
export const ISO_GROUPS: { g: IsoGroup; t: string; k: string; s: string }[] = [
  { g: 'P', t: 'Çelik', k: 'Çelik', s: 'Yapı, ıslah, takım çeliği' },
  { g: 'M', t: 'Paslanmaz', k: 'Paslanmaz', s: 'Östenitik, dubleks' },
  { g: 'K', t: 'Dökme demir', k: 'Döküm', s: 'Gri, sfero döküm' },
  { g: 'N', t: 'Demir dışı', k: 'Demir dışı', s: 'Alüminyum, bakır, pirinç' },
  { g: 'S', t: 'Süper alaşım', k: 'Süper alaşım', s: 'Titanyum, Inconel' },
  { g: 'H', t: 'Sertleştirilmiş', k: 'Sert çelik', s: '45–65 HRC çelik' },
];
export const isoName = Object.fromEntries(ISO_GROUPS.map((i) => [i.g, i.t])) as Record<IsoGroup, string>;

/** ISO 1832 uç şekli harfleri: kısa ad ve köşe açısı */
export const SHAPES: Record<InsertShape, { name: string; angle: string }> = {
  C: { name: '80° eşkenar dörtgen', angle: '80°' },
  D: { name: '55° eşkenar dörtgen', angle: '55°' },
  E: { name: '75° eşkenar dörtgen', angle: '75°' },
  V: { name: '35° eşkenar dörtgen', angle: '35°' },
  S: { name: 'Kare', angle: '90°' },
  T: { name: 'Üçgen', angle: '60°' },
  W: { name: '80° trigon', angle: '80°' },
  R: { name: 'Yuvarlak', angle: 'Ø' },
  A: { name: '85° paralelkenar', angle: '85°' },
  K: { name: '55° paralelkenar', angle: '55°' },
  L: { name: 'Dikdörtgen', angle: '90°' },
  H: { name: 'Altıgen', angle: '120°' },
  O: { name: 'Sekizgen', angle: '135°' },
  P: { name: 'Beşgen', angle: '108°' },
  X: { name: 'Özel şekil', angle: '—' },
};
export const SHAPE_ORDER: InsertShape[] = ['C', 'D', 'W', 'T', 'S', 'V', 'R', 'A', 'K', 'E', 'L', 'H', 'O', 'P', 'X'];

const r1 = (n: number) => Math.round(n * 10) / 10;
function regular(n: number, rad: number, rot = -90) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    return `${r1(12 + Math.cos(a) * rad)},${r1(12 + Math.sin(a) * rad)}`;
  }).join(' ');
}
function rhombus(angle: number) {
  const L = 9.5;
  const S = L * Math.tan(((angle / 2) * Math.PI) / 180);
  return `${r1(12 - L)},12 12,${r1(12 - S)} ${r1(12 + L)},12 12,${r1(12 + S)}`;
}

/** Filtre çipleri için 24×24 şekil ikonu (çizgi) */
export function shapeIcon(shape: InsertShape): string {
  let el = '';
  switch (shape) {
    case 'C': el = `<polygon points="${rhombus(80)}" transform="rotate(-20 12 12)"/>`; break;
    case 'D': el = `<polygon points="${rhombus(55)}" transform="rotate(-20 12 12)"/>`; break;
    case 'E': el = `<polygon points="${rhombus(75)}" transform="rotate(-20 12 12)"/>`; break;
    case 'V': el = `<polygon points="${rhombus(35)}" transform="rotate(-20 12 12)"/>`; break;
    case 'S': el = '<rect x="5" y="5" width="14" height="14" rx=".6"/>'; break;
    case 'T': el = `<polygon points="${regular(3, 9.6, -90)}" transform="translate(0 1.6)"/>`; break;
    case 'W': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = ((-90 + 60 * i) * Math.PI) / 180;
        const rad = i % 2 ? 6.3 : 9.6;
        return `${r1(12 + Math.cos(a) * rad)},${r1(12.6 + Math.sin(a) * rad)}`;
      }).join(' ');
      el = `<polygon points="${pts}"/>`;
      break;
    }
    case 'R': el = '<circle cx="12" cy="12" r="8"/>'; break;
    case 'A': el = '<polygon points="4.5,18 6,6 19.5,6 18,18"/>'; break;
    case 'K': el = '<polygon points="2.5,17 8.5,7 21.5,7 15.5,17"/>'; break;
    case 'L': el = '<rect x="3" y="7" width="18" height="10" rx=".6"/>'; break;
    case 'H': el = `<polygon points="${regular(6, 9, 0)}"/>`; break;
    case 'O': el = `<polygon points="${regular(8, 9, 22.5)}"/>`; break;
    case 'P': el = `<polygon points="${regular(5, 9, -90)}" transform="translate(0 .8)"/>`; break;
    default: el = `<polygon points="${rhombus(80)}"/>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${el}<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>`;
}

const catIdx = Object.fromEntries(categories.map((c, i) => [c.slug, i]));
const subIdx = Object.fromEntries(categories.flatMap((c) => c.children.map((s, i) => [`${c.slug}/${s.slug}`, i])));

/** Kategori ağacı sırasına göre (kararlı) sıralar */
export function sortProducts(list: Product[]): Product[] {
  return list
    .map((p, i) => ({ p, i }))
    .sort(
      (a, b) =>
        (catIdx[a.p.category] ?? 99) - (catIdx[b.p.category] ?? 99) ||
        (subIdx[`${a.p.category}/${a.p.subcategory}`] ?? 99) - (subIdx[`${b.p.category}/${b.p.subcategory}`] ?? 99) ||
        a.i - b.i,
    )
    .map((x) => x.p);
}

/* ---------- ISO 1832 kod anatomisi (yalnızca tam eşleşen tornalama uçları için) ---------- */
const CLEARANCE: Record<string, string> = { A: '3°', B: '5°', C: '7°', D: '15°', E: '20°', F: '25°', G: '30°', N: '0°', P: '11°' };
const TYPE: Record<string, string> = {
  A: 'Delikli, talaş kırıcısız',
  B: 'Havşalı delikli, talaş kırıcısız',
  C: 'Çift havşalı delikli, talaş kırıcısız',
  F: 'Deliksiz, iki yüzü talaş kırıcılı',
  G: 'Delikli, iki yüzü talaş kırıcılı',
  H: 'Havşalı delikli, tek yüzü talaş kırıcılı',
  J: 'Çift havşalı delikli, iki yüzü talaş kırıcılı',
  M: 'Delikli, tek yüzü talaş kırıcılı',
  N: 'Deliksiz, talaş kırıcısız',
  Q: 'Çift havşalı delikli, talaş kırıcısız',
  R: 'Deliksiz, tek yüzü talaş kırıcılı',
  T: 'Havşalı delikli, tek yüzü talaş kırıcılı',
  U: 'Çift havşalı delikli, iki yüzü talaş kırıcılı',
  W: 'Havşalı delikli, talaş kırıcısız',
};
const THICK: Record<string, string> = {
  '01': '1,59', T1: '1,98', '02': '2,38', T2: '2,78', '03': '3,18', T3: '3,97', '04': '4,76', '05': '5,56', '06': '6,35', '07': '7,94', '09': '9,52',
};

export interface CodePart { part: string; label: string; value: string }

export function decodeInsertCode(code: string): CodePart[] | null {
  const m = code.toUpperCase().replace(/\s+/g, '').match(/^([A-Z])([A-Z])([A-Z])([A-Z])(\d{2})(\d{2}|T\d)(\d{2})/);
  if (!m) return null;
  const [, sh, cl, tol, ty, size, th, rad] = m;
  const shape = SHAPES[sh as InsertShape];
  if (!shape || !CLEARANCE[cl] || !TYPE[ty] || !THICK[th]) return null;
  const r = Number(rad);
  return [
    { part: sh, label: 'Şekil', value: shape.name },
    { part: cl, label: 'Boşluk açısı', value: cl === 'N' ? '0° · negatif' : `${CLEARANCE[cl]} · pozitif` },
    { part: tol, label: 'Tolerans', value: `${tol} sınıfı` },
    { part: ty, label: 'Tip', value: TYPE[ty] },
    { part: size, label: 'Kesme kenarı boyu', value: `≈ ${Number(size)} mm` },
    { part: th, label: 'Kalınlık', value: `${THICK[th]} mm` },
    { part: rad, label: 'Köşe radyüsü', value: r === 0 ? 'Keskin köşe' : `${String(r / 10).replace('.', ',')} mm` },
  ];
}

/** Meta açıklama için metni kelime sınırında kısaltır */
export function clip(text: string, n = 158) {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
}

/* ---------- Yapısal veri ---------- */
export function breadcrumbSchema(items: { name: string; path: string }[], site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.path, site).href,
    })),
  };
}

/** Marka segmentini üç kümeye indirger (marka sayfası açıklaması için) */
export function segmentTier(segment: string): 'premium' | 'orta' | 'ekonomik' {
  const s = segment.toLocaleLowerCase('tr');
  if (s.includes('premium')) return 'premium';
  if (s.startsWith('orta')) return 'orta';
  return 'ekonomik';
}
