// Pişmiş masa küçük resimleri (scripts/bake-tables.mjs → src/ui/tablepv/<id>.webp): temanın GÜNCEL paint() çizimi,
// ürün penceresindeki sahneyle aynı oranda. Varsa market/koleksiyon karoları ve büyük sahnenin yer tutucusu bunu kullanır;
// yoksa (boyasız masa: Mavi Arena, ya da henüz pişmemiş yeni masa) TableTheme.swatch.

/** Pişirme ölçüsü (CSS px × dpr). Oran ≈ ürün penceresi sahnesi (14u × 13u) ve ızgara karosu (1 : .9). */
export const TABLE_BAKE = {w: 300, h: 276, dpr: 1.4, q: 0.8} as const;

const baked = import.meta.glob('./tablepv/*.webp', {eager: true, query: '?url', import: 'default'}) as Record<string, string>;

/** Masanın pişmiş küçük resmi (adres) ya da null */
export function bakedTable(id: string): string | null {
  return baked[`./tablepv/${id}.webp`] ?? null;
}
