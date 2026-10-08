// KANAT meta-game data contracts (owner: game-design agent; consumers: UI, integrator, save system).
// PURE types only. Ids for patterns/palettes/trails/badges/postcards match src/ui/content.ts so the i18n
// tables and these data tables join on the same keys.

import type { WorldId } from '../../sim/types.ts';

export interface Bilingual {
  tr: string;
  en: string;
}

// ---------------------------------------------------------------------------------------------
// Cosmetics
// ---------------------------------------------------------------------------------------------

/** Every unlockable item kind. Suit = pattern/palette/trail (§2.7); suru* = SÜRÜ.io (§2.6); the rest are
 *  rank rewards the brief lists ("renk, iz, rozet, menü sahnesi saati") plus ghost tint and photo filters. */
export type CosmeticKind =
  | 'pattern'
  | 'palette'
  | 'trail'
  | 'suruGlow'
  | 'suruAura'
  | 'suruTrail'
  | 'suruShow'
  | 'ghostTint'
  | 'menuTime'
  | 'photoFilter';

/** Globally unique reference "kind:id" (ids are only unique per kind, e.g. pattern:turkuaz vs palette:turkuaz). */
export type CosmeticRef = `${CosmeticKind}:${string}`;

export type UnlockSource =
  | { kind: 'start' }
  /** Unlocked when ALL listed Usta tasks of that route are done (progress "1/3" = the brief's "yarım kalan desen"). */
  | { kind: 'usta'; routeId: string; taskIds: readonly string[] }
  | { kind: 'rank'; level: number }
  /** All 5 postcards of the world = that world's signature pattern (§2.7). */
  | { kind: 'postcards'; world: WorldId }
  /** First Haftanın Rotası completion (§2.7 weekly reward). */
  | { kind: 'weekly' }
  /** Uçuş Günlüğü stamps (§2.7: 7 stamps = cosmetic; stamps need not be consecutive). */
  | { kind: 'log'; stamps: number };

export interface CosmeticBase {
  kind: CosmeticKind;
  id: string;
  name: Bilingual;
  source: UnlockSource;
}

export interface PatternDef extends CosmeticBase {
  kind: 'pattern';
  /** Render hint for the suit mask shader (masks + palette, no texture copies — §3.3). */
  motif: string;
}

export interface PaletteDef extends CosmeticBase {
  kind: 'palette';
  /** [primary, secondary, accent] hex — earthy/desaturated, never neon (§1, §3.7). */
  colors: readonly [string, string, string];
}

export type TrailStyle = 'smoke' | 'dust' | 'ribbon' | 'crystal' | 'feather' | 'glow' | 'mist' | 'petal' | 'foam' | 'marbled';

export interface TrailDef extends CosmeticBase {
  kind: 'trail';
  style: TrailStyle;
  /** [head, tail] colour of the 64-point wingtip ribbon (§4.G.9). */
  colors: readonly [string, string];
}

export interface SimpleCosmeticDef extends CosmeticBase {
  kind: 'suruGlow' | 'suruAura' | 'suruTrail' | 'suruShow' | 'ghostTint' | 'menuTime' | 'photoFilter';
  /** Optional colour (glows, ghost tints) or short render hint. */
  color?: string;
  hint?: string;
}

export type CosmeticDef = PatternDef | PaletteDef | TrailDef | SimpleCosmeticDef;

// ---------------------------------------------------------------------------------------------
// Routes + Usta Görevleri
// ---------------------------------------------------------------------------------------------

export type StartType = 'balon' | 'ucurum' | 'sirt';

export type UstaType =
  | 'balloonThread' // ≥ value Balloon Threads in the flight
  | 'x5Seconds' // longest unbroken ×5 streak ≥ value s
  | 'grazes' // ≥ value Sıyırma in the flight
  | 'noContact3Stars' // 3 stars and zero contacts (bounces); value = 3
  | 'landWithin' // touchdown ≤ value m from target centre
  | 'noThermal' // thermal entries ≤ value (always 0)
  | 'gatesChain' // longest gate chain ≥ value
  | 'timeUnder' // jump→touchdown ≤ value × expert bot time (value is a RATIO)
  | 'scoreOver' // score ≥ value × expert bot score (value is a RATIO)
  | 'braveOpening' // manual canopy opening at 60–90 m AGL; value = 1
  | 'softLanding' // flare landing; value = 1
  | 'proximityTotal'; // total seconds at ×3 or higher ≥ value

export interface UstaTask {
  /** `${routeId}-u${slot}`, e.g. "w1r2-u3". */
  id: string;
  routeId: string;
  /** 1 = easiest … 3 = hardest. */
  slot: 1 | 2 | 3;
  type: UstaType;
  value: number;
  /** The cosmetic this task unlocks (alone, or together with its route siblings — see UnlockSource 'usta'). */
  unlocks: CosmeticRef;
}

/** Named landscape features a route is built around (route tooling + task feasibility checks). */
export type RouteFeature =
  | 'balloons'
  | 'chimneys'
  | 'canyon'
  | 'vineyardLanding'
  | 'seaCliff'
  | 'water'
  | 'gulets'
  | 'rockArch'
  | 'tombs'
  | 'lighthouse'
  | 'cloudSea'
  | 'spruce'
  | 'waterfall'
  | 'highlandHouses'
  | 'snowRidge'
  | 'cornice'
  | 'gully'
  | 'summit'
  | 'travertine'
  | 'theatre'
  | 'pools'
  | 'columns';

export interface RouteMeta {
  id: string; // w1r1 … w5r4
  world: WorldId;
  worldIndex: number; // 1..5
  index: number; // 1..4
  difficulty: number; // 1..9 (§2.5 table)
  name: Bilingual;
  startType: StartType;
  /** Gate ring RADIUS in metres (decision K-04: §2.10 values applied as radius). */
  gateRadius: number;
  thermalCount: number;
  thermalRadius: number; // Gaussian R (§4.G.5 range 30–60 m)
  thermalW0: number; // core lift m/s (§2.5 "+7 m/s")
  windSpeed: number; // m/s gameplay wind (§2.10)
  /** Rehber Rüzgâr default-on (§2.9: W1 R1–R3). */
  guideWindDefault: boolean;
  /** Expert-bot flight time window the route tooling must hit (inside §2.5's 60–120 s). */
  targetDurationSec: readonly [number, number];
  features: readonly RouteFeature[];
  /** Minimum gates the route must contain (≥ any gatesChain task + 2). */
  minGates: number;
  /** Minimum eligible balloon pairs (centres ≤ 35 m) along the line (≥ balloonThread task + 2, else 0). */
  minBalloonPairs: number;
  usta: readonly [UstaTask, UstaTask, UstaTask];
}

export interface WorldMeta {
  id: WorldId;
  index: number; // 1..5
  name: Bilingual;
  unlockStars: number;
  startType: StartType;
  gateRadius: number;
  thermalCount: number;
  thermalRadius: number;
  thermalW0: number;
  windSpeed: number;
  /** UI accent (§3.5). */
  accent: string;
  /** Signature pattern granted by the world's 5-postcard set. */
  signaturePattern: string;
}

/** Expert-bot benchmarks produced by the route tooling (§2.5 stars, §9.G bots). */
export interface RouteBenchmarks {
  expertScore: number;
  expertTimeSec: number;
}

// ---------------------------------------------------------------------------------------------
// Flight / round / profile statistics (inputs for Usta tasks, badges and XP)
// ---------------------------------------------------------------------------------------------

export type FlightMode = 'career' | 'daily' | 'duel' | 'weekly' | 'free';

export interface FlightStats {
  routeId: string;
  world: WorldId;
  mode: FlightMode;
  /** Touchdown under canopy inside the landing zone (route completion, ⭐). */
  landed: boolean;
  halfFlight: boolean;
  crashed: boolean;
  stars: number; // 0..3 (career/weekly: score based; daily: time based)
  score: number;
  timeSec: number; // jump → touchdown, sim time
  grazes: number;
  x5TotalSec: number;
  maxX5StreakSec: number;
  x3PlusTotalSec: number;
  balloonThreads: number;
  maxThreadChain: number;
  gatesTotal: number;
  gatesPassed: number;
  gatesMissed: number;
  maxGateChain: number;
  thermalsEntered: number;
  /** Bounces (sürtünme teması). */
  contacts: number;
  /** Distance from target centre at touchdown, Infinity when not landed. */
  landingDist: number;
  softLanding: boolean;
  /** Manual opening at 60–90 m AGL (auto parachute never counts). */
  braveOpening: boolean;
  autoParachute: boolean;
  /** Seconds with nearest surface = water and d < 4 m. */
  waterSkimSec: number;
  assist: 'full' | 'low' | 'off';
  slowMode: boolean;
}

export interface SuruRoundStats {
  placement: number; // 1 = winner
  flocks: number; // 12..16
  peakSize: number;
  converted: number;
  wildCollected: number;
  sieges: number;
  survivedToSunset: boolean;
  survivalSec: number;
}

/** Aggregates kept in the save file (all monotonic counters). */
export interface ProfileStats {
  routesLanded: number; // distinct career routes with ≥ 1 star
  totalStars: number;
  ustaDone: number;
  postcards: number;
  stamps: number;
  softLandings: number;
  braveOpenings: number;
  duelWins: number;
  rematchWins: number;
  freeFlightSec: number;
  photosSaved: number;
  rankLevel: number;
  leagueIndex: number; // 0 Bronz … 4 Elmas
  dailyThreeStars: number;
  worldStars: Readonly<Record<WorldId, number>>;
  worldRoutesLanded: Readonly<Record<WorldId, number>>;
  routeStars: Readonly<Record<string, number>>;
}

// ---------------------------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------------------------

export type FlightStatKey =
  | 'stars'
  | 'score'
  | 'timeSec'
  | 'grazes'
  | 'x5TotalSec'
  | 'maxX5StreakSec'
  | 'x3PlusTotalSec'
  | 'balloonThreads'
  | 'maxThreadChain'
  | 'gatesPassed'
  | 'gatesMissed'
  | 'maxGateChain'
  | 'thermalsEntered'
  | 'contacts'
  | 'landingDist'
  | 'waterSkimSec'
  | 'landed'
  | 'softLanding'
  | 'braveOpening';

export type RoundStatKey = 'placement' | 'peakSize' | 'converted' | 'wildCollected' | 'sieges' | 'survivedToSunset' | 'survivalSec';

export type ProfileStatKey =
  | 'routesLanded'
  | 'totalStars'
  | 'ustaDone'
  | 'postcards'
  | 'stamps'
  | 'softLandings'
  | 'braveOpenings'
  | 'duelWins'
  | 'rematchWins'
  | 'freeFlightSec'
  | 'photosSaved'
  | 'rankLevel'
  | 'leagueIndex'
  | 'dailyThreeStars';

export type BadgeCondition =
  | { kind: 'profile'; stat: ProfileStatKey; atLeast: number }
  | { kind: 'worldStars'; world: WorldId; atLeast: number }
  | { kind: 'worldRoutesLanded'; world: WorldId; atLeast: number }
  | { kind: 'routeStars'; routeId: string; atLeast: number }
  /** Evaluated on the flight that just ended. Booleans read as 0/1. */
  | {
      kind: 'flight';
      routeId?: string;
      world?: WorldId;
      min?: Partial<Record<FlightStatKey, number>>;
      max?: Partial<Record<FlightStatKey, number>>;
      /** Every gate of the route passed in one unbroken chain. */
      allGates?: boolean;
      /** Free-flight sessions are ignored unless set (no score/gates there). */
      allowFree?: boolean;
    }
  /** Evaluated on the SÜRÜ.io round that just ended. */
  | { kind: 'round'; min?: Partial<Record<RoundStatKey, number>>; max?: Partial<Record<RoundStatKey, number>> };

export type BadgeCategory = 'ucus' | 'kariyer' | 'koleksiyon' | 'suru' | 'sosyal';

export interface BadgeDef {
  id: string;
  name: Bilingual;
  desc: Bilingual;
  icon: string;
  category: BadgeCategory;
  condition: BadgeCondition;
}

export interface BadgeContext {
  profile: ProfileStats;
  flight?: FlightStats;
  round?: SuruRoundStats;
}

// ---------------------------------------------------------------------------------------------
// Postcards
// ---------------------------------------------------------------------------------------------

export type PostcardFeature =
  | 'valley-dawn'
  | 'rock-trio'
  | 'red-valley'
  | 'balloon-field'
  | 'castle-rock'
  | 'hidden-cove'
  | 'rock-tombs'
  | 'gulet-harbour'
  | 'rock-arch'
  | 'lighthouse'
  | 'cloud-sea'
  | 'waterfall'
  | 'highland-village'
  | 'spruce-forest'
  | 'lake-mirror'
  | 'summit-ridge'
  | 'ice-cornice'
  | 'snow-wave'
  | 'shadow-valley'
  | 'sparkle-slope'
  | 'travertine-terraces'
  | 'mirror-pools'
  | 'ancient-theatre'
  | 'sunset-horizon'
  | 'last-light';

export interface PostcardDef {
  id: string; // w{n}p{m}
  world: WorldId;
  index: number; // 1..5
  name: Bilingual;
  anchor: {
    feature: PostcardFeature;
    /** Where the route tooling should place the anchor (world positions are resolved later by id). */
    hint: Bilingual;
    /** Best composition: looking toward the sun (silhouette) or away from it (lit subject). */
    facing: 'sun' | 'away' | 'any';
    /** Subject bounding radius used by the 5-ray visibility test (m). */
    subjectRadiusM: number;
    /** Career route passing closest to it (discovery hint on the route card). */
    nearRoute: string;
  };
}
