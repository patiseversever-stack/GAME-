// Cosmetics catalogue (§2.7 suit: 20 patterns · 12 palettes · 10 trails; §2.6 SÜRÜ.io: 8 glows · 8 auras ·
// 8 leader trails · 6 show shapes; rank extras: ghost tints, menu-scene hours, photo filters).
// Ids match src/ui/content.ts. Usta sources are DERIVED from routes.meta.ts (single source of truth);
// rank / postcard / weekly / log / start sources are declared here. Purely visual — no gameplay effect.

import type { WorldId } from '../../sim/types.ts';
import type {
  Bilingual,
  CosmeticDef,
  CosmeticKind,
  CosmeticRef,
  PaletteDef,
  PatternDef,
  SimpleCosmeticDef,
  TrailDef,
  TrailStyle,
  UnlockSource,
} from './types.ts';
import { ROUTE_META } from './routes.meta.ts';

type Src = 'start' | 'usta' | 'weekly' | { rank: number } | { postcards: WorldId } | { log: number };

function ustaSource(ref: CosmeticRef): UnlockSource {
  for (const r of ROUTE_META) {
    const ids = r.usta.filter((t) => t.unlocks === ref).map((t) => t.id);
    if (ids.length > 0) return { kind: 'usta', routeId: r.id, taskIds: ids };
  }
  throw new Error(`no usta task unlocks ${ref}`);
}

function source(kind: CosmeticKind, id: string, s: Src): UnlockSource {
  if (s === 'start') return { kind: 'start' };
  if (s === 'weekly') return { kind: 'weekly' };
  if (s === 'usta') return ustaSource(`${kind}:${id}`);
  if ('rank' in s) return { kind: 'rank', level: s.rank };
  if ('postcards' in s) return { kind: 'postcards', world: s.postcards };
  return { kind: 'log', stamps: s.log };
}

function n(tr: string, en: string): Bilingual {
  return { tr, en };
}

// ---------------------------------------------------------------------------------------------
// Suit patterns (20). Signature patterns come from the world's 5-postcard set; the other 15 from the
// Usta tasks of routes R2–R4 (all three tasks of the route). Starter suit is plain (no pattern).
// ---------------------------------------------------------------------------------------------

const PATTERN_ROWS: readonly (readonly [string, Bilingual, string, Src])[] = [
  ['kilim', n('Kilim', 'Kilim'), 'stepped diamond lozenges in horizontal woven bands', 'usta'],
  ['cini', n('Çini', 'Tile'), 'Iznik-style rosettes with saz-leaf borders on shoulders and wing edges', 'usta'],
  ['ebru', n('Ebru', 'Marbling'), 'combed marbling swirls flowing from chest to wingtips', 'usta'],
  ['periBacasi', n('Peri Bacası', 'Fairy Chimney'), 'stacked tuff cones with dark caps rising up the legs', { postcards: 'kapadokya' }],
  ['turkuaz', n('Turkuaz', 'Turquoise'), 'clean colour-blocked shoulder sweep, shallow-water gradient', { postcards: 'likya' }],
  ['geceYarisi', n('Gece Yarısı', 'Midnight'), 'sparse star field over a deep vertical gradient', 'usta'],
  ['balonSeridi', n('Balon Şeridi', 'Balloon Stripe'), 'vertical gore stripes like a balloon envelope', 'usta'],
  ['karKristali', n('Kar Kristali', 'Snow Crystal'), 'six-fold snow crystals scattered over sleeves and back', { postcards: 'erciyes' }],
  ['lale', n('Lale', 'Tulip'), 'stylised tulip silhouettes along the wing trailing edge', 'usta'],
  ['traverten', n('Traverten', 'Travertine'), 'layered terrace scallops in a soft top-to-bottom gradient', { postcards: 'pamukkale' }],
  ['ladin', n('Ladin', 'Spruce'), 'spruce chevrons in staggered rows', { postcards: 'karadeniz' }],
  ['dalga', n('Dalga', 'Wave'), 'long rolling wave lines from shoulder to wingtip', 'usta'],
  ['kontur', n('Eşyükselti', 'Contour'), 'topographic contour lines (altimeter-and-map style)', 'usta'],
  ['pusula', n('Pusula', 'Compass'), 'compass rose on the back, bearing ticks along the wings', 'usta'],
  ['guvercin', n('Güvercin', 'Pigeon'), 'pigeon-wing feather bars across the wing membrane', 'usta'],
  ['yakamoz', n('Yakamoz', 'Sea Sparkle'), 'scattered phosphor sparkles on a dark sea tone', 'usta'],
  ['mehtap', n('Mehtap', 'Moonpath'), 'single moonpath light streak across a dark water tone', 'usta'],
  ['kizilUfuk', n('Kızıl Ufuk', 'Crimson Horizon'), 'horizon band, warm sunset fading to dusk', 'usta'],
  ['sirt', n('Sırt Çizgisi', 'Ridgeline'), 'one sharp ridgeline zigzag across chest and wings', 'usta'],
  ['safak', n('Şafak', 'Dawn'), 'sun-ray fan rising from the waist', 'usta'],
];

export const SUIT_PATTERNS: readonly PatternDef[] = PATTERN_ROWS.map(([id, name, motif, s]) => ({
  kind: 'pattern',
  id,
  name,
  motif,
  source: source('pattern', id, s),
}));

// ---------------------------------------------------------------------------------------------
// Palettes (12) — [primary, secondary, accent]; hexes shared with the UI swatches.
// ---------------------------------------------------------------------------------------------

const PALETTE_ROWS: readonly (readonly [string, Bilingual, readonly [string, string, string], Src])[] = [
  ['safak', n('Şafak', 'Dawn'), ['#F2A541', '#6B4E5E', '#F6E7D0'], 'start'],
  ['turkuaz', n('Turkuaz', 'Turquoise'), ['#2EC4C6', '#0B4F6C', '#E9D8B4'], 'usta'],
  ['yayla', n('Yayla', 'Highland'), ['#8DB580', '#1F3B2C', '#DDE3E0'], 'usta'],
  ['buzul', n('Buzul', 'Glacier'), ['#9FD3F0', '#1F4E8C', '#FFF6EC'], 'usta'],
  ['gunBatimi', n('Gün Batımı', 'Sunset'), ['#F2795C', '#2B2D5B', '#FFC27A'], 'usta'],
  ['gece', n('Gece', 'Night'), ['#2B3A55', '#0E141C', '#9FB3D1'], { rank: 18 }],
  ['tuf', n('Tüf', 'Tuff'), ['#D9B48F', '#7A5A48', '#F4E6D2'], 'usta'],
  ['bakir', n('Bakır', 'Copper'), ['#B8653A', '#3A2A22', '#E8C3A0'], 'usta'],
  ['lavanta', n('Lavanta', 'Lavender'), ['#9AA7C7', '#4B4466', '#ECE7F4'], 'usta'],
  ['zeytin', n('Zeytin', 'Olive'), ['#7C8350', '#33361F', '#E3E0C4'], 'usta'],
  ['kum', n('Kum', 'Sand'), ['#E9D8B4', '#9C7A4C', '#FFFFFF'], 'usta'],
  ['komur', n('Kömür', 'Charcoal'), ['#2A2C30', '#121316', '#E5484D'], { rank: 2 }],
];

export const PALETTES: readonly PaletteDef[] = PALETTE_ROWS.map(([id, name, colors, s]) => ({
  kind: 'palette',
  id,
  name,
  colors,
  source: source('palette', id, s),
}));

// ---------------------------------------------------------------------------------------------
// Trails (10) — wingtip ribbon effects (§4.G.9 64-point ring buffer).
// ---------------------------------------------------------------------------------------------

const TRAIL_ROWS: readonly (readonly [string, Bilingual, TrailStyle, readonly [string, string], Src])[] = [
  ['dumanBeyazi', n('Duman Beyazı', 'Smoke White'), 'smoke', ['#F5F1E8', '#C9C4BA'], 'start'],
  ['altinToz', n('Altın Toz', 'Gold Dust'), 'dust', ['#F2C14E', '#B98A2E'], { log: 7 }],
  ['ebruAkisi', n('Ebru Akışı', 'Marbled Flow'), 'marbled', ['#5FB3C9', '#E9D8B4'], 'usta'],
  ['buzKristali', n('Buz Kristali', 'Ice Crystal'), 'crystal', ['#BFE6F2', '#FFFFFF'], 'usta'],
  ['kirlangic', n('Kırlangıç', 'Swallow'), 'feather', ['#3A4A66', '#A9B6BC'], 'weekly'],
  ['laleYapragi', n('Lale Yaprağı', 'Tulip Petal'), 'petal', ['#D9534F', '#F6C48E'], 'usta'],
  ['turkuazKopuk', n('Turkuaz Köpük', 'Turquoise Foam'), 'foam', ['#2EC4C6', '#E8F4FB'], 'usta'],
  ['sisTulu', n('Sis Tülü', 'Mist Veil'), 'mist', ['#DDE3E0', '#A9B6BC'], 'usta'],
  ['brulorIsigi', n('Brülör Işığı', 'Burner Glow'), 'glow', ['#F28C28', '#FFC27A'], 'usta'],
  ['maviSaat', n('Mavi Saat', 'Blue Hour'), 'ribbon', ['#6C7BD9', '#2B2D5B'], { rank: 30 }],
];

export const TRAILS: readonly TrailDef[] = TRAIL_ROWS.map(([id, name, style, colors, s]) => ({
  kind: 'trail',
  id,
  name,
  style,
  colors,
  source: source('trail', id, s),
}));

// ---------------------------------------------------------------------------------------------
// SÜRÜ.io cosmetics (§2.6: 8 + 8 + 8 + 6). Owner colours are NOT cosmetic (readability).
// The aura cosmetic is the decorative motif INSIDE the water aura; the edge style (solid/dashed/dotted)
// that separates repeated owner colours stays system-assigned (decision S-12 in docs/GDD.md).
// ---------------------------------------------------------------------------------------------

type SimpleRow = readonly [string, Bilingual, Src, string?];

function simple(kind: SimpleCosmeticDef['kind'], rows: readonly SimpleRow[], colorField: boolean): SimpleCosmeticDef[] {
  return rows.map(([id, name, s, extra]) => {
    const def: SimpleCosmeticDef = { kind, id, name, source: source(kind, id, s) };
    if (extra !== undefined) {
      if (colorField) def.color = extra;
      else def.hint = extra;
    }
    return def;
  });
}

export const SURU_GLOWS: readonly SimpleCosmeticDef[] = simple(
  'suruGlow',
  [
    ['sade', n('Sade', 'Plain'), 'start', '#F5F1E8'],
    ['kehribar', n('Kehribar', 'Amber'), { rank: 8 }, '#E3A857'],
    ['sedef', n('Sedef', 'Nacre'), { rank: 15 }, '#E8DCEB'],
    ['bakir', n('Bakır', 'Copper'), { rank: 23 }, '#C9764A'],
    ['ayIsigi', n('Ay Işığı', 'Moonlight'), { rank: 31 }, '#CFE0F2'],
    ['zumrut', n('Zümrüt', 'Emerald'), { rank: 39 }, '#4FA37B'],
    ['menekse', n('Menekşe', 'Violet'), { rank: 43 }, '#9C7BC2'],
    ['yildizTozu', n('Yıldız Tozu', 'Stardust'), { rank: 48 }, '#FFE2A6'],
  ],
  true,
);

export const SURU_AURAS: readonly SimpleCosmeticDef[] = simple(
  'suruAura',
  [
    ['sade', n('Sade', 'Plain'), 'start', 'soft disc'],
    ['dalgacik', n('Dalgacık', 'Ripple'), { rank: 6 }, 'concentric ripples'],
    ['kilimBordur', n('Kilim Bordür', 'Kilim Border'), { rank: 13 }, 'kilim lozenge ring'],
    ['lale', n('Lale', 'Tulip'), { rank: 21 }, 'tulip rosette'],
    ['gunes', n('Güneş', 'Sunburst'), { rank: 29 }, 'radial sun rays'],
    ['pusula', n('Pusula', 'Compass'), { rank: 37 }, 'compass rose'],
    ['nilufer', n('Nilüfer', 'Water Lily'), { rank: 42 }, 'water-lily petals'],
    ['yildiz', n('Yıldız', 'Star'), { rank: 46 }, 'eight-point star'],
  ],
  false,
);

export const SURU_TRAILS: readonly SimpleCosmeticDef[] = simple(
  'suruTrail',
  [
    ['isikSeridi', n('Işık Şeridi', 'Light Ribbon'), 'start', 'thin light ribbon'],
    ['tuy', n('Tüy', 'Feather'), { rank: 11 }, 'drifting down-feather glints'],
    ['sis', n('Sis', 'Mist'), { rank: 19 }, 'low mist wake'],
    ['yakamoz', n('Yakamoz', 'Sea Sparkle'), { rank: 25 }, 'sparkles on the water below'],
    ['safakSeridi', n('Şafak Şeridi', 'Dawn Ribbon'), { rank: 33 }, 'warm two-tone ribbon'],
    ['ruzgar', n('Rüzgâr', 'Wind Lines'), { rank: 40 }, 'three fine wind lines'],
    ['kivilcim', n('Kıvılcım', 'Ember'), { rank: 45 }, 'soft ember motes (no strobe)'],
    ['kuyrukluYildiz', n('Kuyruklu Yıldız', 'Comet'), { rank: 49 }, 'long tapering comet tail'],
  ],
  false,
);

export const SURU_SHOWS: readonly SimpleCosmeticDef[] = simple(
  'suruShow',
  [
    ['kanat', n('Kanat', 'Wing'), 'start'],
    ['kalp', n('Kalp', 'Heart'), { rank: 4 }],
    ['sarmal', n('Sarmal', 'Spiral'), { rank: 16 }],
    ['dalga', n('Dalga', 'Wave'), { rank: 27 }],
    ['lale', n('Lale', 'Tulip'), { rank: 34 }],
    ['sonsuzluk', n('Sonsuzluk', 'Infinity'), { rank: 50 }],
  ],
  false,
);

// ---------------------------------------------------------------------------------------------
// Rank extras: ghost tint (§2.5 Mod 3 "adı ve rengiyle"), menu-scene hour (§2.7 "menü sahnesi saati"),
// photo filters (§2.5 Mod 4, six filters; Doğal is the starter).
// ---------------------------------------------------------------------------------------------

export const GHOST_TINTS: readonly SimpleCosmeticDef[] = simple(
  'ghostTint',
  [
    ['aurora', n('Aurora', 'Aurora'), 'start', '#8FD6C8'],
    ['gul', n('Gül', 'Rose'), { rank: 5 }, '#E59AA8'],
    ['nane', n('Nane', 'Mint'), { rank: 12 }, '#9ED9B0'],
    ['altin', n('Altın', 'Gold'), { rank: 20 }, '#F2C14E'],
    ['lavanta', n('Lavanta', 'Lavender'), { rank: 28 }, '#B3A6E0'],
    ['buz', n('Buz', 'Ice'), { rank: 36 }, '#BFE6F2'],
    ['kehribar', n('Kehribar', 'Amber'), { rank: 41 }, '#E3A857'],
  ],
  true,
);

export const MENU_TIMES: readonly SimpleCosmeticDef[] = simple(
  'menuTime',
  [
    ['imza', n('İmza Saati', 'Signature Hour'), 'start', "world's own hour (§3.2)"],
    ['altinSaat', n('Altın Saat', 'Golden Hour'), { rank: 10 }, 'warmer LUT, longer sky glow'],
    ['maviSaat', n('Mavi Saat', 'Blue Hour'), { rank: 24 }, 'sun just set, blue-violet LUT'],
    ['sisliSabah', n('Sisli Sabah', 'Misty Morning'), { rank: 38 }, 'denser ground fog, soft light'],
    ['yildizliGece', n('Yıldızlı Gece', 'Starry Night'), { rank: 47 }, 'night sky, lanterns and burner glow'],
  ],
  false,
);

export const PHOTO_FILTER_UNLOCKS: readonly SimpleCosmeticDef[] = simple(
  'photoFilter',
  [
    ['natural', n('Doğal', 'Natural'), 'start'],
    ['golden', n('Altın Saat', 'Golden Hour'), { rank: 3 }],
    ['documentary', n('Belgesel', 'Documentary'), { rank: 7 }],
    ['postcard', n('Kartpostal', 'Postcard'), { rank: 14 }],
    ['coldMorning', n('Soğuk Sabah', 'Cold Morning'), { rank: 22 }],
    ['bw', n('Siyah-Beyaz', 'Black & White'), { rank: 32 }],
  ],
  false,
);

// ---------------------------------------------------------------------------------------------
// Aggregates + lookups
// ---------------------------------------------------------------------------------------------

export const SUIT_COSMETICS: readonly CosmeticDef[] = [...SUIT_PATTERNS, ...PALETTES, ...TRAILS];
export const SURU_COSMETICS: readonly CosmeticDef[] = [...SURU_GLOWS, ...SURU_AURAS, ...SURU_TRAILS, ...SURU_SHOWS];
export const ALL_COSMETICS: readonly CosmeticDef[] = [
  ...SUIT_COSMETICS,
  ...SURU_COSMETICS,
  ...GHOST_TINTS,
  ...MENU_TIMES,
  ...PHOTO_FILTER_UNLOCKS,
];

export function cosmeticRef(def: CosmeticDef): CosmeticRef {
  return `${def.kind}:${def.id}`;
}

const BY_REF = new Map<string, CosmeticDef>(ALL_COSMETICS.map((c) => [cosmeticRef(c), c]));

export function cosmetic(ref: CosmeticRef | string): CosmeticDef | undefined {
  return BY_REF.get(ref);
}

/** Starter loadout: plain suit (no pattern) in the Şafak palette with the Duman Beyazı trail. */
export const STARTER_LOADOUT = {
  pattern: null as string | null,
  palette: 'safak',
  trail: 'dumanBeyazi',
  suruGlow: 'sade',
  suruAura: 'sade',
  suruTrail: 'isikSeridi',
  suruShow: 'kanat',
  ghostTint: 'aurora',
  menuTime: 'imza',
  photoFilter: 'natural',
} as const;

export const STARTER_UNLOCKS: readonly CosmeticRef[] = ALL_COSMETICS.filter((c) => c.source.kind === 'start').map(cosmeticRef);

/** Weekly route reward tints (§2.7 "haftalık iz rengi"): week k → WEEKLY_TINTS[k % 8], applies over any trail. */
export const WEEKLY_TINTS: readonly { id: string; name: Bilingual; color: string }[] = [
  { id: 'nar', name: n('Nar', 'Pomegranate'), color: '#B5473A' },
  { id: 'safran', name: n('Safran', 'Saffron'), color: '#E3A23B' },
  { id: 'deniz', name: n('Deniz', 'Sea'), color: '#2E7DA0' },
  { id: 'yosun', name: n('Yosun', 'Moss'), color: '#5E7D4A' },
  { id: 'eflatun', name: n('Eflatun', 'Lilac'), color: '#8A6BA8' },
  { id: 'kiraz', name: n('Kiraz', 'Cherry'), color: '#A23B55' },
  { id: 'kumsal', name: n('Kumsal', 'Beach'), color: '#D8BF8A' },
  { id: 'gok', name: n('Gök', 'Sky'), color: '#7FA7D9' },
];
