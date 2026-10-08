// 25 postcards (§2.5 Mod 4), ids w{n}p{m} as in src/ui/content.ts. World positions are resolved later by the
// route tooling via `postcardAnchor(id)` lookups; this file fixes names, the feature each one frames, and the
// capture rules. PURE data.

import type { WorldId } from '../../sim/types.ts';
import type { Bilingual, CosmeticRef, PostcardDef, PostcardFeature } from './types.ts';
import { WORLD_META } from './routes.meta.ts';

/** Capture rules (§2.5 Mod 4). */
export const POSTCARD_RULES = {
  /** A thin frame glint appears in the air when the pilot is this close (m). */
  revealRadiusM: 150,
  /** Photo Mode camera must be within this distance of the anchor (m). */
  captureMaxDistM: 120,
  /** Subject centre must lie inside the central fraction of the frame (both axes). */
  centreFrac: 0.6,
  /** Rays cast to points on the subject; at least `raysVisibleMin` must be unoccluded. */
  rays: 5,
  raysVisibleMin: 4,
} as const;

type Row = readonly [string, Bilingual, PostcardFeature, Bilingual, PostcardDef['anchor']['facing'], number, string];

function n(tr: string, en: string): Bilingual {
  return { tr, en };
}

const ROWS: Readonly<Record<WorldId, readonly Row[]>> = {
  kapadokya: [
    ['w1p1', n('Güvercinlik Şafağı', 'Pigeon Valley Dawn'), 'valley-dawn', n('Güvercinlik Vadisi ağzı, güneş vadinin ekseninde', 'Pigeon Valley mouth, sun along the valley axis'), 'sun', 60, 'w1r4'],
    ['w1p2', n('Üçgüzeller', 'The Three Beauties'), 'rock-trio', n('Yan yana duran üç şapkalı peri bacası', 'three capped fairy chimneys side by side'), 'away', 25, 'w1r2'],
    ['w1p3', n('Kızılçukur', 'Red Valley'), 'red-valley', n('Gül tüf yamaçlı derin vadi, sırt üstünden', 'deep rose-tuff valley seen from the rim'), 'away', 90, 'w1r4'],
    ['w1p4', n('Balon Tarlası', 'Balloon Field'), 'balloon-field', n('En yoğun balon kümesi, ufuk çizgisi kadrajda', 'densest balloon cluster with the horizon in frame'), 'sun', 120, 'w1r3'],
    ['w1p5', n('Uçhisar Silueti', 'Uçhisar Silhouette'), 'castle-rock', n('En yüksek kaya kütlesi, güneşe karşı siluet', 'tallest rock massif, silhouetted against the sun'), 'sun', 70, 'w1r1'],
  ],
  likya: [
    ['w2p1', n('Gizli Koy', 'Hidden Cove'), 'hidden-cove', n('Yalıyarlarla çevrili küçük kumsal', 'small beach enclosed by sea cliffs'), 'away', 60, 'w2r1'],
    ['w2p2', n('Kaya Mezarları', 'Rock Tombs'), 'rock-tombs', n('Cephe mezarlarının en sık olduğu kaya duvarı', 'cliff wall with the densest tomb façades'), 'away', 35, 'w2r4'],
    ['w2p3', n('Gulet Limanı', 'Gulet Harbour'), 'gulet-harbour', n('Demir atmış gulet grubu, koy içinden', 'anchored gulet group inside the cove'), 'away', 70, 'w2r2'],
    ['w2p4', n('Kaya Kemeri', 'Rock Arch'), 'rock-arch', n('Kemerin içinden denize bakış', 'looking through the arch to the sea'), 'sun', 30, 'w2r3'],
    ['w2p5', n('Yalıyar Feneri', 'Cliffside Lighthouse'), 'lighthouse', n('Burun ucundaki fener, açık deniz arkada', 'lighthouse on the headland with open sea behind'), 'sun', 25, 'w2r4'],
  ],
  karadeniz: [
    ['w3p1', n('Bulut Denizi', 'Sea of Clouds'), 'cloud-sea', n('Bulut tavanının hemen üstü, sırtlar adacık gibi', 'just above the cloud ceiling, ridges like islands'), 'sun', 150, 'w3r1'],
    ['w3p2', n('Şelale Perdesi', 'Waterfall Curtain'), 'waterfall', n('Ana şelale, sis bulutu dahil', 'main waterfall including its mist plume'), 'away', 40, 'w3r3'],
    ['w3p3', n('Yayla Sabahı', 'Highland Morning'), 'highland-village', n('Ahşap yayla evleri kümesi, sisli çayır', 'cluster of wooden highland houses over a misty meadow'), 'away', 60, 'w3r4'],
    ['w3p4', n('Ladin Katedrali', 'Spruce Cathedral'), 'spruce-forest', n('En uzun ladinlerin oluşturduğu koridor', 'corridor formed by the tallest spruces'), 'sun', 45, 'w3r2'],
    ['w3p5', n('Göl Aynası', 'Lake Mirror'), 'lake-mirror', n('En geniş durgun su yüzeyi (göl yoksa dere göleti)', 'largest still water surface (river pool if no lake)'), 'away', 80, 'w3r4'],
  ],
  erciyes: [
    ['w4p1', n('Zirve Sırtı', 'Summit Ridge'), 'summit-ridge', n('Zirveye çıkan ana sırt, alçak güneşle', 'main ridge to the summit in low sun'), 'away', 120, 'w4r4'],
    ['w4p2', n('Buz Kornişi', 'Ice Cornice'), 'ice-cornice', n('En belirgin korniş çıkıntısı, rüzgâraltından', 'most prominent cornice lip, from the lee side'), 'sun', 30, 'w4r2'],
    ['w4p3', n('Kar Dalgası', 'Snow Wave'), 'snow-wave', n('Rüzgârın oyduğu kar dalgaları olan geniş yamaç', 'broad slope of wind-carved snow waves'), 'away', 80, 'w4r1'],
    ['w4p4', n('Gölge Vadisi', 'Shadow Valley'), 'shadow-valley', n('Uzun mavi gölgeli derin oluk', 'deep gully filled with long blue shadow'), 'sun', 90, 'w4r3'],
    ['w4p5', n('Yıldız Tozu', 'Stardust'), 'sparkle-slope', n('Güneşe karşı parıldayan kar yamacı', 'snow slope glinting against the sun'), 'sun', 70, 'w4r1'],
  ],
  pamukkale: [
    ['w5p1', n('Traverten Basamakları', 'Travertine Terraces'), 'travertine-terraces', n('Basamakların en geniş yelpazesi', 'widest fan of terraces'), 'sun', 100, 'w5r1'],
    ['w5p2', n('Ayna Havuzlar', 'Mirror Pools'), 'mirror-pools', n('Gün batımını yansıtan havuz dizisi', 'row of pools reflecting the sunset'), 'sun', 50, 'w5r3'],
    ['w5p3', n('Antik Tiyatro', 'Ancient Theatre'), 'ancient-theatre', n('Tiyatro basamak yayı, sahne merkezde', 'theatre seating arc with the stage centred'), 'away', 60, 'w5r2'],
    ['w5p4', n('Kızıl Ufuk', 'Crimson Horizon'), 'sunset-horizon', n('Batıya açık sırt, güneş ufka değerken', 'west-facing crest as the sun touches the horizon'), 'sun', 150, 'w5r4'],
    ['w5p5', n('Son Işık', 'Last Light'), 'last-light', n('Sütun kalıntıları, son ışık arkadan', 'column ruins backlit by the last light'), 'sun', 30, 'w5r4'],
  ],
};

export const POSTCARDS: readonly PostcardDef[] = WORLD_META.flatMap((w) =>
  ROWS[w.id].map(
    ([id, name, feature, hint, facing, subjectRadiusM, nearRoute], i): PostcardDef => ({
      id,
      world: w.id,
      index: i + 1,
      name,
      anchor: { feature, hint, facing, subjectRadiusM, nearRoute },
    }),
  ),
);

const BY_ID = new Map<string, PostcardDef>(POSTCARDS.map((p) => [p.id, p]));

export function postcard(id: string): PostcardDef | undefined {
  return BY_ID.get(id);
}

export function postcardsOfWorld(world: WorldId): readonly PostcardDef[] {
  return POSTCARDS.filter((p) => p.world === world);
}

/** The 5-card set of a world unlocks its signature pattern (§2.7). */
export function postcardSetReward(world: WorldId): CosmeticRef {
  const w = WORLD_META.find((m) => m.id === world);
  if (!w) throw new Error(`unknown world ${world}`);
  return `pattern:${w.signaturePattern}`;
}

/** True when the collected ids complete the world's set. */
export function postcardSetComplete(world: WorldId, collected: ReadonlySet<string>): boolean {
  return postcardsOfWorld(world).every((p) => collected.has(p.id));
}
