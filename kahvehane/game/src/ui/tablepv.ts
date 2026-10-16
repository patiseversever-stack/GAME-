// Pişmiş masa resimleri (scripts/bake-tables.mjs → src/ui/tablepv/): her boyalı masa için temanın GÜNCEL paint() çizimi.
//  - <id>.webp       SATIŞ küçük resmi (ızgara, vitrin, setler, koleksiyon): masa oyundaki gibi telefon oranında büyük
//                    çizilir, sonra masanın imzası görünecek biçimde kırpılır (TABLE_THUMB). Oran THUMB_ASPECT.
//  - <id>.full.webp  büyük sahnenin (ürün penceresi, "Dene") yer tutucusu: canlı boyayla AYNI kompozisyon, düşük
//                    çözünürlük — canlı boya gelince dikişsiz yerini alır.
// Yoksa (boyasız masa: Mavi Arena, ya da henüz pişmemiş yeni masa) TableTheme.swatch.

/** Büyük çizim: oyun ekranı oranı (412×839 ≈ .49), CSS px × dpr */
export const TABLE_BAKE = {w: 300, h: 612, dpr: 1.4, q: 0.82} as const;
/** Satış küçük resmi: genişlik × yükseklik (px). Oran .8 ≈ ızgara karosu (.77) ile koleksiyon karesi arası. */
export const THUMB = {w: 336, h: 420} as const;
/** Yer tutucu: ürün penceresindeki masa kartı oranı (.6), düşük çözünürlük */
export const FULL_BAKE = {w: 240, h: 400, dpr: 0.67, q: 0.72} as const;

/**
 * Masanın imzası boyanın neresinde: 'top' = üstten kırp (manzara / ebru bordürü: Boğaz'da Galata + ay, Kapadokya'da
 * balonlar + peribacaları, Yıldızlı Gece'de ay + girdaplar, Ebru'da lale köşeleri ve renkli bordür); yoksa yığın halkası
 * ortada (desen masaları: çini madalyonu, kadife halkası — kartlar halkanın üstünde durur).
 */
export const TABLE_THUMB: Record<string, 'top'> = {gece: 'top', ebru: 'top', kapadokya: 'top', bogaz: 'top'};
/**
 * İsteğe bağlı yakınlaştırma: kırpım genişliği (boyanın eninin oranı) ve sol kenarı. Ebru'nun imzası yalnız dış bordür ve
 * üst köşelerde: sol üst köşeye ağırlıklı daha dar kırpım lale + bordür + yan şeridi karede büyütür.
 */
export const TABLE_ZOOM: Record<string, {w: number; x: number}> = {ebru: {w: 0.78, x: 0}};

const baked = import.meta.glob('./tablepv/*.webp', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;

/** Masanın pişmiş satış küçük resmi (adres) ya da null */
export function bakedTable(id: string): string | null {
  return baked[`./tablepv/${id}.webp`] ?? null;
}
/** Büyük sahne yer tutucusu (adres) ya da null */
export function bakedTableFull(id: string): string | null {
  return baked[`./tablepv/${id}.full.webp`] ?? null;
}
