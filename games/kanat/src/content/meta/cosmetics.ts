// Cosmetics catalogue (§2.7 suit: 20 patterns · 12 palettes · 10 trails; §2.6 SÜRÜ.io: 8 glows · 8 auras ·
// 8 leader trails · 6 show shapes; rank extras: ghost tints, canopy schemes, card frames, menu-scene hours;
// Photo Mode filters). Ids match src/ui/content.ts. Usta sources are DERIVED from routes.meta.ts (single
// source of truth); rank / postcard / weekly / log / start / suru sources are declared here. Purely visual.
// F1 review (K-23): the Pilot Rank track grants FLIGHT-side items only (every level 2–50 means something to a
// wingsuit player); SÜRÜ cosmetics come from SÜRÜ play (rounds + league); Photo filters from postcards.

import type { WorldId } from '../../sim/types.ts';
import type {
  Bilingual,
  CanopyDef,
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

type Src =
  | 'start'
  | 'usta'
  | 'weekly'
  | { rank: number }
  | { postcards: WorldId }
  | { log: number }
  | { suruRounds: number }
  | { suruLeague: number }
  | { postcardCount: number };

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
  if ('suruRounds' in s) return { kind: 'suru', rounds: s.suruRounds };
  if ('suruLeague' in s) return { kind: 'suru', league: s.suruLeague };
  if ('postcardCount' in s) return { kind: 'postcardCount', count: s.postcardCount };
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
    ['kehribar', n('Kehribar', 'Amber'), { suruRounds: 2 }, '#E3A857'],
    ['sedef', n('Sedef', 'Nacre'), { suruRounds: 5 }, '#E8DCEB'],
    ['bakir', n('Bakır', 'Copper'), { suruRounds: 12 }, '#C9764A'],
    ['ayIsigi', n('Ay Işığı', 'Moonlight'), { suruRounds: 18 }, '#CFE0F2'],
    ['zumrut', n('Zümrüt', 'Emerald'), { suruRounds: 35 }, '#4FA37B'],
    ['menekse', n('Menekşe', 'Violet'), { suruRounds: 60 }, '#9C7BC2'],
    ['yildizTozu', n('Yıldız Tozu', 'Stardust'), { suruLeague: 3 }, '#FFE2A6'],
  ],
  true,
);

export const SURU_AURAS: readonly SimpleCosmeticDef[] = simple(
  'suruAura',
  [
    ['sade', n('Sade', 'Plain'), 'start', 'soft disc'],
    ['dalgacik', n('Dalgacık', 'Ripple'), { suruRounds: 3 }, 'concentric ripples'],
    ['kilimBordur', n('Kilim Bordür', 'Kilim Border'), { suruRounds: 6 }, 'kilim lozenge ring'],
    ['lale', n('Lale', 'Tulip'), { suruRounds: 14 }, 'tulip rosette'],
    ['gunes', n('Güneş', 'Sunburst'), { suruLeague: 2 }, 'radial sun rays'],
    ['pusula', n('Pusula', 'Compass'), { suruRounds: 30 }, 'compass rose'],
    ['nilufer', n('Nilüfer', 'Water Lily'), { suruRounds: 50 }, 'water-lily petals'],
    ['yildiz', n('Yıldız', 'Star'), { suruRounds: 85 }, 'eight-point star'],
  ],
  false,
);

export const SURU_TRAILS: readonly SimpleCosmeticDef[] = simple(
  'suruTrail',
  [
    ['isikSeridi', n('Işık Şeridi', 'Light Ribbon'), 'start', 'thin light ribbon'],
    ['tuy', n('Tüy', 'Feather'), { suruRounds: 4 }, 'drifting down-feather glints'],
    ['sis', n('Sis', 'Mist'), { suruRounds: 8 }, 'low mist wake'],
    ['yakamoz', n('Yakamoz', 'Sea Sparkle'), { suruRounds: 16 }, 'sparkles on the water below'],
    ['safakSeridi', n('Şafak Şeridi', 'Dawn Ribbon'), { suruRounds: 25 }, 'warm two-tone ribbon'],
    ['ruzgar', n('Rüzgâr', 'Wind Lines'), { suruRounds: 40 }, 'three fine wind lines'],
    ['kivilcim', n('Kıvılcım', 'Ember'), { suruRounds: 70 }, 'soft ember motes (no strobe)'],
    ['kuyrukluYildiz', n('Kuyruklu Yıldız', 'Comet'), { suruRounds: 100 }, 'long tapering comet tail'],
  ],
  false,
);

export const SURU_SHOWS: readonly SimpleCosmeticDef[] = simple(
  'suruShow',
  [
    ['kanat', n('Kanat', 'Wing'), 'start'],
    ['kalp', n('Kalp', 'Heart'), { suruRounds: 1 }],
    ['sarmal', n('Sarmal', 'Spiral'), { suruLeague: 1 }],
    ['dalga', n('Dalga', 'Wave'), { suruRounds: 10 }],
    ['lale', n('Lale', 'Tulip'), { suruRounds: 20 }],
    ['sonsuzluk', n('Sonsuzluk', 'Infinity'), { suruLeague: 4 }],
  ],
  false,
);

// ---------------------------------------------------------------------------------------------
// Rank extras (Pilot Rütbesi, §2.7 "her seviye bir şey verir: renk, iz, rozet, menü sahnesi saati"):
// ghost tint (§2.5 Mod 3 "adı ve rengiyle"), canopy scheme, share/duel card frame, menu-scene hour.
// Level map (titles at 9/17/26/35/44): flight-side every level, a canopy/ghost/frame every ~3 levels.
// Photo filters (§2.5 Mod 4 six filters, Doğal = starter) unlock by postcards collected.
// ---------------------------------------------------------------------------------------------

export const GHOST_TINTS: readonly SimpleCosmeticDef[] = simple(
  'ghostTint',
  [
    ['aurora', n('Aurora', 'Aurora'), 'start', '#8FD6C8'],
    ['gul', n('Gül', 'Rose'), { rank: 4 }, '#E59AA8'],
    ['nane', n('Nane', 'Mint'), { rank: 8 }, '#9ED9B0'],
    ['mercan', n('Mercan', 'Coral'), { rank: 12 }, '#EF8A6F'],
    ['gok', n('Gök', 'Sky'), { rank: 15 }, '#8CB8E8'],
    ['altin', n('Altın', 'Gold'), { rank: 20 }, '#F2C14E'],
    ['sedef', n('Sedef', 'Nacre'), { rank: 23 }, '#E8DCEB'],
    ['lavanta', n('Lavanta', 'Lavender'), { rank: 28 }, '#B3A6E0'],
    ['zumrut', n('Zümrüt', 'Emerald'), { rank: 32 }, '#4FA37B'],
    ['buz', n('Buz', 'Ice'), { rank: 36 }, '#BFE6F2'],
    ['safran', n('Safran', 'Saffron'), { rank: 40 }, '#E3A23B'],
    ['kehribar', n('Kehribar', 'Amber'), { rank: 43 }, '#E3A857'],
    ['kum', n('Kum', 'Sand'), { rank: 48 }, '#D8BF8A'],
  ],
  true,
);

const CANOPY_ROWS: readonly (readonly [string, Bilingual, readonly [string, string], Src])[] = [
  ['safak', n('Şafak', 'Dawn'), ['#F2A541', '#F6E7D0'], 'start'],
  ['klasik', n('Klasik Kırmızı', 'Classic Red'), ['#C8423A', '#F3EFE6'], { rank: 3 }],
  ['gokyuzu', n('Gökyüzü', 'Sky'), ['#7FA7D9', '#F3EFE6'], { rank: 7 }],
  ['turuncu', n('Güvenlik Turuncusu', 'Safety Orange'), ['#E8742A', '#2A2C30'], { rank: 11 }],
  ['lale', n('Lale', 'Tulip'), ['#B83A4B', '#F6C48E'], { rank: 14 }],
  ['zeytin', n('Zeytin', 'Olive'), ['#7C8350', '#E3E0C4'], { rank: 19 }],
  ['lacivert', n('Lacivert', 'Navy'), ['#22355E', '#9FB3D1'], { rank: 22 }],
  ['kum', n('Kum', 'Sand'), ['#E9D8B4', '#9C7A4C'], { rank: 25 }],
  ['turkuaz', n('Turkuaz', 'Turquoise'), ['#2EC4C6', '#0B4F6C'], { rank: 29 }],
  ['bordo', n('Bordo', 'Burgundy'), ['#7A2433', '#E8C3A0'], { rank: 33 }],
  ['kar', n('Kar', 'Snow'), ['#F5F7FA', '#9FD3F0'], { rank: 37 }],
  ['kehribar', n('Kehribar', 'Amber'), ['#E3A857', '#3A2A22'], { rank: 41 }],
  ['eflatun', n('Eflatun', 'Lilac'), ['#8A6BA8', '#ECE7F4'], { rank: 45 }],
  ['gece', n('Gece', 'Night'), ['#1B2333', '#E5484D'], { rank: 49 }],
];

export const CANOPIES: readonly CanopyDef[] = CANOPY_ROWS.map(([id, name, colors, s]) => ({
  kind: 'canopy',
  id,
  name,
  colors,
  source: source('canopy', id, s),
}));

/** Frames for the shared image card + duel card (UI-drawn vector frames; hint = style for the UI). */
export const CARD_FRAMES: readonly SimpleCosmeticDef[] = simple(
  'cardFrame',
  [
    ['sade', n('Sade', 'Plain'), 'start', 'thin 1 px inset line'],
    ['kilim', n('Kilim Bordür', 'Kilim Border'), { rank: 5 }, 'stepped lozenge border band'],
    ['film', n('Film Şeridi', 'Film Strip'), { rank: 10 }, 'sprocket holes top and bottom'],
    ['pul', n('Posta Pulu', 'Postage Stamp'), { rank: 13 }, 'perforated stamp edge + postmark'],
    ['cini', n('Çini', 'Tile'), { rank: 16 }, 'Iznik corner rosettes'],
    ['polaroid', n('Anlık Fotoğraf', 'Instant Photo'), { rank: 21 }, 'wide bottom margin with handwritten time'],
    ['harita', n('Eşyükselti', 'Contour Map'), { rank: 27 }, 'contour lines fading into the edge'],
    ['pusula', n('Pusula', 'Compass'), { rank: 31 }, 'bearing ticks + compass rose corner'],
    ['ebru', n('Ebru', 'Marbling'), { rank: 34 }, 'marbled border'],
    ['altinCizgi', n('Altın Çizgi', 'Gold Line'), { rank: 39 }, 'double gold hairline'],
    ['gunBatimi', n('Gün Batımı', 'Sunset'), { rank: 42 }, 'warm gradient edge'],
    ['gece', n('Yıldızlı Gece', 'Starry Night'), { rank: 46 }, 'dark edge with fine stars'],
    ['efsane', n('Efsane', 'Legend'), { rank: 50 }, 'foil-gold wings crest'],
  ],
  false,
);

export const MENU_TIMES: readonly SimpleCosmeticDef[] = simple(
  'menuTime',
  [
    ['imza', n('İmza Saati', 'Signature Hour'), 'start', "world's own hour (§3.2)"],
    ['altinSaat', n('Altın Saat', 'Golden Hour'), { rank: 6 }, 'warmer LUT, longer sky glow'],
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
    ['golden', n('Altın Saat', 'Golden Hour'), { postcardCount: 1 }],
    ['documentary', n('Belgesel', 'Documentary'), { postcardCount: 2 }],
    ['postcard', n('Kartpostal', 'Postcard'), { postcardCount: 4 }],
    ['coldMorning', n('Soğuk Sabah', 'Cold Morning'), { postcardCount: 7 }],
    ['bw', n('Siyah-Beyaz', 'Black & White'), { postcardCount: 10 }],
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
  ...CANOPIES,
  ...CARD_FRAMES,
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
  canopy: 'safak',
  cardFrame: 'sade',
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
