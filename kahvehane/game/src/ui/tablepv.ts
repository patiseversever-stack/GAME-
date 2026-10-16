// Pişmiş masa küçük resimleri (scripts/bake-tables.mjs → src/ui/tablepv/<id>.webp): temanın GÜNCEL paint() çizimi,
// ürün penceresindeki sahneyle aynı oranda. Varsa market/koleksiyon karoları ve büyük sahnenin yer tutucusu bunu kullanır;
// yoksa (boyasız masa: Mavi Arena, ya da henüz pişmemiş yeni masa) TableTheme.swatch.

/** Pişirme ölçüsü (CSS px × dpr). Oran .6 = ürün penceresindeki masa kartı (.kh-pd__tbl) — canlı boya aynı kompozisyonu
 *  çizer, geçiş dikişsiz. Izgara/set/koleksiyon kartları (.67–.77) ortadan kırpar; boyanın yığın halkası %44–45.5'te kalır. */
export const TABLE_BAKE = {w: 240, h: 400, dpr: 1.3, q: 0.8} as const;

const baked = import.meta.glob('./tablepv/*.webp', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;

/** Masanın pişmiş küçük resmi (adres) ya da null */
export function bakedTable(id: string): string | null {
  return baked[`./tablepv/${id}.webp`] ?? null;
}
