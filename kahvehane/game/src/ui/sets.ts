// Market vitrin verisi: tema SETLERİ (deste + masa + çerçeve… tek temada, indirimli paket) ve ürün ROZETLERİ.
// Katalog girdileri başka yerde yönetilir; burada yalnız eşleştirme var. Katalogda olmayan parça sessizce düşer,
// 2'den az parçası kalan set gösterilmez. Kataloğa `set: '<id>'` yazılan ürün o sete kendiliğinden katılır.
import {CATALOG, itemOf, type ItemKind, type ShopItem} from '../game/catalog';
import type {Rarity} from '../game/roster';

export interface SetDef {
  id: string;
  name: string;
  /** Kısa satış cümlesi */
  tag: string;
  /** Ana parçalar (sıra: vitrinde soldan sağa) */
  items: readonly (readonly [ItemKind, string])[];
  /** İndirim oranı (0.25 = %25) */
  off: number;
  /** Kart zemini: iki renk (degrade) */
  a: string;
  b: string;
}

const DEFS: readonly SetDef[] = [
  {id: 'saray', name: 'Saray Seti', tag: 'İznik çinisi, lale ve saray ışığı', items: [['deck', 'iznik'], ['table', 'cini'], ['frame', 'lale']], off: 0.25, a: '#1f5fd6', b: '#0b2a7a'},
  {id: 'gece', name: 'Yıldızlı Gece Seti', tag: 'Van Gogh gökyüzü altında bir el', items: [['deck', 'yildizli'], ['table', 'gece'], ['frame', 'yildizli']], off: 0.25, a: '#3a4fe0', b: '#0e1660'},
  {id: 'sultan', name: 'Sultan Seti', tag: 'Altın yağmuru, kızıl kadife', items: [['fx', 'altin'], ['table', 'kizil'], ['frame', 'altin']], off: 0.25, a: '#e0263f', b: '#6d0a1c'},
  {id: 'gosteri', name: 'Gösteri Seti', tag: 'Alev çerçeve, gökte fişekler', items: [['frame', 'ates'], ['fx', 'havai'], ['fx', 'yildiz']], off: 0.2, a: '#ff7a1a', b: '#8a1a5e'},
  {id: 'dalga', name: 'Dalga Seti', tag: 'Hokusai dalgası, zümrüt kadife', items: [['deck', 'dalga'], ['table', 'zumrut']], off: 0.2, a: '#1aa0c4', b: '#0b3d6a'},
  // parçaları katalogdaki `set` alanından gelenler (ad/renk/söz burada)
  {id: 'hazine', name: 'Hazine Seti', tag: 'Kesme taşlar, altın ve mücevher ışıltısı', items: [], off: 0.3, a: '#d4a017', b: '#6e0f1e'},
  {id: 'ebru', name: 'Ebru Seti', tag: 'Suyun üstünde açan lale, akan renkler', items: [], off: 0.3, a: '#13a8a0', b: '#5a1a8a'},
  {id: 'bogaz', name: 'Boğaz Gecesi Seti', tag: 'Ay ışığı, köprü ışıkları, yakamoz', items: [], off: 0.25, a: '#2a5ad8', b: '#0a1240'},
  {id: 'neon', name: 'Neon Seti', tag: 'Neon ışıklar ve gök gürültüsü', items: [], off: 0.3, a: '#ff3ea5', b: '#1b0d4a'},
  {id: 'kapadokya', name: 'Kapadokya Seti', tag: 'Şafakta balonlar, peri bacaları', items: [], off: 0.25, a: '#ff8a3d', b: '#8a2a6e'},
  {id: 'nazar', name: 'Nazar Seti', tag: 'Mavi boncuk: nazar değmesin!', items: [], off: 0.2, a: '#1f7bff', b: '#0a2a7a'},
];

export interface ShopSet extends SetDef {
  parts: ShopItem[];
}

let cache: ShopSet[] | null = null;
/** Katalogda karşılığı olan setler (en az 2 parça). */
export function shopSets(): ShopSet[] {
  if (cache) return cache;
  const out: ShopSet[] = [];
  const seen = new Set<string>();
  for (const d of DEFS) {
    const parts = d.items.map(([k, id]) => itemOf(k, id)).filter((x): x is ShopItem => !!x);
    for (const it of CATALOG) if (it.set === d.id && !parts.includes(it)) parts.push(it);
    seen.add(d.id);
    if (parts.length >= 2) out.push({...d, parts});
  }
  // katalogda tanımlanmış ama burada olmayan setler (yalnız `set` alanından)
  const extra = new Map<string, ShopItem[]>();
  for (const it of CATALOG) if (it.set && !seen.has(it.set)) extra.set(it.set, [...(extra.get(it.set) ?? []), it]);
  for (const [id, parts] of extra)
    if (parts.length >= 2) out.push({id, name: `${parts[0].name} Seti`, tag: 'Tek temada tam takım', items: parts.map(p => [p.kind, p.id] as const), off: 0.2, a: '#7a3cff', b: '#24107a', parts});
  cache = out;
  return out;
}
export const setById = (id: string): ShopSet | undefined => shopSets().find(s => s.id === id);
/** Ürünün dahil olduğu ilk set. */
export const setOf = (it: ShopItem): ShopSet | undefined => shopSets().find(s => s.parts.includes(it));

export interface SetPrice {
  /** Eksik parçaların tek tek toplamı */
  full: number;
  /** Set fiyatı (indirimli, 50'ye yuvarlı) */
  price: number;
  missing: ShopItem[];
}
export function setPrice(s: ShopSet, owns: (k: ItemKind, id: string) => boolean): SetPrice {
  const missing = s.parts.filter(p => !owns(p.kind, p.id));
  const full = missing.reduce((t, p) => t + p.price, 0);
  return {full, price: Math.round((full * (1 - s.off)) / 50) * 50, missing};
}

// ---------------------------------------------------------------- rozetler
/** İlk sürümde katalogda olanlar: bunların dışındaki her ürün "YENİ" sayılır (katalog kendi rozetini vermediyse). */
const LAUNCH = new Set(['deck:yildizli', 'deck:iznik', 'deck:dalga', 'deck:aycicegi', 'table:arena', 'table:gece', 'table:cini', 'table:kizil', 'table:zumrut',
  'fx:klasik', 'fx:havai', 'fx:yildiz', 'fx:altin', 'frame:standart', 'frame:altin', 'frame:lale', 'frame:yildizli', 'frame:ates']);
const HOT = new Set(['deck:iznik', 'fx:havai', 'frame:ates', 'table:cini']);

export type Badge = 'new' | 'hot' | 'limited';
export const BADGE_NAME: Record<Badge, string> = {new: 'Yeni', hot: 'Popüler', limited: 'Sınırlı'};
export function badgeOf(it: ShopItem): Badge | null {
  if (it.badge) return it.badge;
  if (it.starter || it.kind === 'char') return null;
  const k = `${it.kind}:${it.id}`;
  if (!LAUNCH.has(k)) return 'new';
  return HOT.has(k) ? 'hot' : null;
}

export const RANK: Record<Rarity, number> = {common: 0, rare: 1, epic: 2, legendary: 3};
