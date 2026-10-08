// Career route meta (20 routes, §2.5) + per-world balance (§2.10) + 60 Usta Görevleri.
// Geometry (line/gates/thermals/landing) is produced by the flight route tooling into src/content/routes/**;
// this file fixes everything the design owns: names, difficulty, start type, gate radius, thermal/wind budget,
// target duration, features the line must visit, and the Usta tasks with their rewards. PURE data + helpers.

import type { WorldId } from '../../sim/types.ts';
import type {
  CosmeticRef,
  FlightStats,
  LiftSource,
  RouteBenchmarks,
  RouteEnergy,
  RouteFeature,
  RouteMeta,
  StartType,
  UstaTask,
  UstaType,
  WorldMeta,
} from './types.ts';

// ---------------------------------------------------------------------------------------------
// Worlds (§2.5 table, §2.7 locks, §2.10 balance ramps, §3.5 accents)
// ---------------------------------------------------------------------------------------------

export const WORLD_META: readonly WorldMeta[] = [
  {
    id: 'kapadokya',
    index: 1,
    name: { tr: 'Kapadokya Şafağı', en: 'Cappadocia Dawn' },
    unlockStars: 0,
    startType: 'balon',
    gateRadius: 14,
    thermalCount: 3,
    thermalRadius: 55,
    thermalW0: 7,
    windSpeed: 0,
    accent: '#F2A541',
    signaturePattern: 'periBacasi',
    thermalLengthM: 260,
  },
  {
    id: 'likya',
    index: 2,
    name: { tr: 'Likya Kıyısı', en: 'Lycian Coast' },
    unlockStars: 6,
    startType: 'ucurum',
    gateRadius: 12.75,
    thermalCount: 2,
    thermalRadius: 50,
    thermalW0: 7,
    windSpeed: 1.5,
    accent: '#2EC4C6',
    signaturePattern: 'turkuaz',
    thermalLengthM: 230,
  },
  {
    id: 'karadeniz',
    index: 3,
    name: { tr: 'Karadeniz Yaylası', en: 'Black Sea Highlands' },
    unlockStars: 15,
    startType: 'sirt',
    gateRadius: 11.5,
    thermalCount: 2,
    thermalRadius: 45,
    thermalW0: 7,
    windSpeed: 3,
    accent: '#8DB580',
    signaturePattern: 'ladin',
    thermalLengthM: 200,
  },
  {
    id: 'erciyes',
    index: 4,
    name: { tr: 'Erciyes Karı', en: 'Erciyes Snow' },
    unlockStars: 26,
    startType: 'sirt',
    gateRadius: 10.25,
    thermalCount: 1,
    thermalRadius: 40,
    thermalW0: 7,
    windSpeed: 4,
    accent: '#9FD3F0',
    signaturePattern: 'karKristali',
    thermalLengthM: 180,
  },
  {
    id: 'pamukkale',
    index: 5,
    name: { tr: 'Pamukkale Gün Batımı', en: 'Pamukkale Sunset' },
    unlockStars: 38,
    startType: 'balon',
    gateRadius: 9,
    thermalCount: 1,
    thermalRadius: 35,
    thermalW0: 7,
    windSpeed: 4,
    accent: '#F2795C',
    signaturePattern: 'traverten',
    thermalLengthM: 160,
  },
];

// ---------------------------------------------------------------------------------------------
// Route rows
// ---------------------------------------------------------------------------------------------

type TaskRow = readonly [UstaType, number];

interface RouteRow {
  id: string;
  difficulty: number;
  name: { tr: string; en: string };
  features: readonly RouteFeature[];
  /** R1 of each world: one cosmetic per task. R2–R4: the route's pattern, completed by all three tasks. */
  reward: CosmeticRef | readonly [CosmeticRef, CosmeticRef, CosmeticRef];
  tasks: readonly [TaskRow, TaskRow, TaskRow];
}

const ROWS: readonly RouteRow[] = [
  // ---- W1 Kapadokya Şafağı (balloon basket) ----
  {
    id: 'w1r1',
    difficulty: 1,
    name: { tr: 'İlk Atlayış', en: 'First Jump' },
    features: ['balloons', 'chimneys', 'vineyardLanding'],
    reward: ['trail:brulorIsigi', 'palette:tuf', 'palette:kum'],
    tasks: [['balloonThread', 1], ['softLanding', 1], ['landWithin', 5]],
  },
  {
    id: 'w1r2',
    difficulty: 2,
    name: { tr: 'Peri Bacaları Slalomu', en: 'Fairy Chimney Slalom' },
    features: ['chimneys', 'canyon'],
    reward: 'pattern:kilim',
    tasks: [['grazeCount', 2], ['gateChain', 6], ['mult5Hold', 2]],
  },
  {
    id: 'w1r3',
    difficulty: 3,
    name: { tr: 'Balon Yolu', en: 'Balloon Road' },
    features: ['balloons', 'chimneys'],
    reward: 'pattern:balonSeridi',
    tasks: [['boldOpen', 1], ['balloonThread', 5], ['noContact3Stars', 3]],
  },
  {
    id: 'w1r4',
    difficulty: 4,
    name: { tr: 'Güvercinlik Kanyonu', en: 'Pigeon Valley Canyon' },
    features: ['canyon', 'chimneys'],
    reward: 'pattern:guvercin',
    tasks: [['prox3Time', 15], ['grazeCount', 3], ['mult5Hold', 4]],
  },
  // ---- W2 Likya Kıyısı (cliff top) ----
  {
    id: 'w2r1',
    difficulty: 3,
    name: { tr: 'Yalıyar Süzülüşü', en: 'Cliffside Glide' },
    features: ['seaCliff', 'water'],
    reward: ['palette:zeytin', 'trail:turkuazKopuk', 'palette:turkuaz'],
    tasks: [['softLanding', 1], ['prox3Time', 15], ['landWithin', 5]],
  },
  {
    id: 'w2r2',
    difficulty: 4,
    name: { tr: 'Gulet Koyu', en: 'Gulet Cove' },
    features: ['water', 'gulets', 'seaCliff'],
    reward: 'pattern:yakamoz',
    tasks: [['gateChain', 6], ['prox3Time', 25], ['noThermal', 0]],
  },
  {
    id: 'w2r3',
    difficulty: 5,
    name: { tr: 'Kaya Kemeri', en: 'Rock Arch' },
    features: ['rockArch', 'water', 'seaCliff'],
    reward: 'pattern:dalga',
    tasks: [['boldOpen', 1], ['grazeCount', 2], ['mult5Hold', 3]],
  },
  {
    id: 'w2r4',
    difficulty: 6,
    name: { tr: 'Mezar Cepheleri Hattı', en: 'Tomb Façade Line' },
    features: ['tombs', 'seaCliff', 'lighthouse'],
    reward: 'pattern:cini',
    tasks: [['grazeCount', 3], ['scoreOver', 0.95], ['noContact3Stars', 3]],
  },
  // ---- W3 Karadeniz Yaylası (ridge ledge) ----
  {
    id: 'w3r1',
    difficulty: 4,
    name: { tr: 'Bulut Denizi', en: 'Sea of Clouds' },
    features: ['cloudSea', 'spruce', 'waterfall'],
    reward: ['palette:yayla', 'trail:sisTulu', 'trail:ebruAkisi'],
    tasks: [['softLanding', 1], ['gateChain', 6], ['landWithin', 5]],
  },
  {
    id: 'w3r2',
    difficulty: 5,
    name: { tr: 'Ladin Koridoru', en: 'Spruce Corridor' },
    features: ['spruce'],
    reward: 'pattern:pusula',
    tasks: [['prox3Time', 20], ['grazeCount', 3], ['timeUnder', 1.0]],
  },
  {
    id: 'w3r3',
    difficulty: 6,
    name: { tr: 'Şelale Perdesi', en: 'Waterfall Curtain' },
    features: ['waterfall', 'spruce'],
    reward: 'pattern:ebru',
    tasks: [['boldOpen', 1], ['mult5Hold', 3], ['scoreOver', 1.0]],
  },
  {
    id: 'w3r4',
    difficulty: 7,
    name: { tr: 'Yayla Alçak Geçişi', en: 'Highland Low Pass' },
    features: ['highlandHouses', 'spruce'],
    reward: 'pattern:kontur',
    tasks: [['gateChain', 8], ['noThermal', 0], ['landWithin', 2]],
  },
  // ---- W4 Erciyes Karı (summit ridge) ----
  {
    id: 'w4r1',
    difficulty: 5,
    name: { tr: 'Kar Sırtı', en: 'Snow Ridge' },
    features: ['snowRidge'],
    reward: ['palette:lavanta', 'trail:buzKristali', 'palette:buzul'],
    tasks: [['softLanding', 1], ['grazeCount', 2], ['mult5Hold', 3]],
  },
  {
    id: 'w4r2',
    difficulty: 6,
    name: { tr: 'Korniş Kenarı', en: 'Cornice Edge' },
    features: ['cornice', 'snowRidge'],
    reward: 'pattern:sirt',
    tasks: [['prox3Time', 25], ['grazeCount', 4], ['noContact3Stars', 3]],
  },
  {
    id: 'w4r3',
    difficulty: 7,
    name: { tr: 'Buzul Oluğu', en: 'Glacier Gully' },
    features: ['gully', 'snowRidge'],
    reward: 'pattern:geceYarisi',
    tasks: [['gateChain', 8], ['mult5Hold', 5], ['timeUnder', 0.98]],
  },
  {
    id: 'w4r4',
    difficulty: 8,
    name: { tr: 'Zirve İnişi', en: 'Summit Descent' },
    features: ['summit', 'snowRidge', 'cornice'],
    reward: 'pattern:safak',
    tasks: [['boldOpen', 1], ['landWithin', 2], ['scoreOver', 1.0]],
  },
  // ---- W5 Pamukkale Gün Batımı (balloon basket) ----
  {
    id: 'w5r1',
    difficulty: 6,
    name: { tr: 'Traverten Basamakları', en: 'Travertine Terraces' },
    features: ['balloons', 'travertine'],
    reward: ['palette:bakir', 'trail:laleYapragi', 'palette:gunBatimi'],
    tasks: [['softLanding', 1], ['balloonThread', 2], ['landWithin', 2]],
  },
  {
    id: 'w5r2',
    difficulty: 7,
    name: { tr: 'Antik Tiyatro Üstü', en: 'Over the Ancient Theatre' },
    features: ['theatre', 'columns', 'travertine'],
    reward: 'pattern:lale',
    tasks: [['grazeCount', 3], ['gateChain', 10], ['mult5Hold', 5]],
  },
  {
    id: 'w5r3',
    difficulty: 8,
    name: { tr: 'Ayna Havuzlar', en: 'Mirror Pools' },
    features: ['pools', 'travertine', 'balloons'],
    reward: 'pattern:mehtap',
    tasks: [['prox3Time', 40], ['balloonThread', 4], ['noContact3Stars', 3]],
  },
  {
    id: 'w5r4',
    difficulty: 9,
    name: { tr: 'Gün Batımı Finali', en: 'Sunset Finale' },
    features: ['balloons', 'travertine', 'pools', 'columns'],
    reward: 'pattern:kizilUfuk',
    tasks: [['balloonThread', 6], ['mult5Hold', 6], ['scoreOver', 1.05]],
  },
];

/** Expert-bot flight time window by difficulty: 60–80 s at 1 … 100–120 s at 9 (§2.5 60–120 s). */
export function targetDurationFor(difficulty: number): readonly [number, number] {
  const lo = 60 + (difficulty - 1) * 5;
  return [lo, Math.min(120, lo + 20)];
}

/** Logged exceptions to §2.5's 60–120 s (K-19): w1r1 IS the §1 FTUE film (jump 6 s → touchdown ≈ 52 s). */
export const DURATION_EXCEPTIONS: Readonly<Record<string, readonly [number, number]>> = {
  w1r1: [45, 55],
};

// ---------------------------------------------------------------------------------------------
// Energy model (K-19). A wingsuit sinks ~9 m/s at trim and ~10–11 m/s on a fast proximity line, so the
// route's duration is bought with start height + lift. The route tool must keep (start − landing) inside
// `startAboveLandingM`; the Kılavuz bot proves the budget by flying it.
// ---------------------------------------------------------------------------------------------

export const ENERGY_MODEL = {
  /** Mean sink on an expert proximity line (m/s). */
  lineSinkMs: 10,
  jumpSec: 0.8,
  /** Typical manual opening height above the landing ground (inside the 60–90 m Cesur window). */
  canopyOpenAglM: 80,
  canopySinkMs: 5,
  canopyOpenSec: 1.2,
  /** Reference airspeed for the thermal street gain estimate (trim, m/s). */
  refSpeedMs: 42,
} as const;

/** Equivalent height from one centred pass along a thermal street: w0 · (L + R·√π) / V. */
export function thermalStreetGainM(w0: number, radius: number, lengthM: number): number {
  return Math.round((w0 * (lengthM + radius * 1.7724538509)) / ENERGY_MODEL.refSpeedMs);
}

export function energyBudgetFor(
  duration: readonly [number, number],
  thermalCount: number,
  streetGainM: number,
  liftSources: readonly LiftSource[],
): RouteEnergy {
  const e = ENERGY_MODEL;
  const canopySec = e.canopyOpenSec + e.canopyOpenAglM / e.canopySinkMs;
  const w0 = duration[0] - e.jumpSec - canopySec;
  const w1 = duration[1] - e.jumpSec - canopySec;
  const hi = Math.round(e.lineSinkMs * w1 + e.canopyOpenAglM);
  const lo = Math.max(e.canopyOpenAglM + 60, Math.round(e.lineSinkMs * w0 + e.canopyOpenAglM - thermalCount * streetGainM));
  return {
    wingsuitSec: [Math.round(w0 * 10) / 10, Math.round(w1 * 10) / 10],
    startAboveLandingM: [lo, hi],
    streetGainM,
    liftSources,
  };
}

/** Task types that only count without a physics-changing assist intervention (K-20). */
const UNASSISTED_ONLY: ReadonlySet<UstaType> = new Set<UstaType>(['noContact3Stars', 'scoreOver', 'timeUnder']);

const WORLD_BY_INDEX: readonly WorldId[] = WORLD_META.map((w) => w.id);

function buildRoute(row: RouteRow): RouteMeta {
  const worldIndex = Number(row.id.charAt(1));
  const index = Number(row.id.charAt(3));
  const world = WORLD_META[worldIndex - 1];
  const tasks = row.tasks.map(([type, value], i): UstaTask => {
    const slot = (i + 1) as 1 | 2 | 3;
    const unlocks: CosmeticRef = typeof row.reward === 'string' ? row.reward : row.reward[i];
    return { id: `${row.id}-u${slot}`, routeId: row.id, slot, type, value, unlocks, unassistedOnly: UNASSISTED_ONLY.has(type) };
  }) as unknown as readonly [UstaTask, UstaTask, UstaTask];
  let chain = 0;
  let threads = 0;
  for (const t of tasks) {
    if (t.type === 'gateChain') chain = Math.max(chain, t.value);
    if (t.type === 'balloonThread') threads = Math.max(threads, t.value);
  }
  const hasBalloons = row.features.includes('balloons');
  const duration = DURATION_EXCEPTIONS[row.id] ?? targetDurationFor(row.difficulty);
  const streetGain = thermalStreetGainM(world.thermalW0, world.thermalRadius, world.thermalLengthM);
  const lift: LiftSource[] = ['start', 'thermalStreet'];
  if (world.windSpeed > 0) lift.push('ridge');
  return {
    id: row.id,
    world: WORLD_BY_INDEX[worldIndex - 1],
    worldIndex,
    index,
    difficulty: row.difficulty,
    name: row.name,
    startType: world.startType as StartType,
    gateRadius: world.gateRadius,
    thermalCount: world.thermalCount,
    thermalRadius: world.thermalRadius,
    thermalW0: world.thermalW0,
    windSpeed: world.windSpeed,
    guideWindDefault: worldIndex === 1 && index <= 3,
    targetDurationSec: duration,
    features: row.features,
    minGates: Math.max(6 + row.difficulty, chain + 2),
    minBalloonPairs: threads > 0 ? threads + 2 : hasBalloons ? 2 : 0,
    thermalLengthM: world.thermalLengthM,
    energy: energyBudgetFor(duration, world.thermalCount, streetGain, lift),
    usta: tasks,
  };
}

export const ROUTE_META: readonly RouteMeta[] = ROWS.map(buildRoute);
export const ROUTE_IDS: readonly string[] = ROUTE_META.map((r) => r.id);
export const USTA_TASKS: readonly UstaTask[] = ROUTE_META.flatMap((r) => [...r.usta]);

const ROUTE_INDEX = new Map<string, RouteMeta>(ROUTE_META.map((r) => [r.id, r]));
const TASK_INDEX = new Map<string, UstaTask>(USTA_TASKS.map((t) => [t.id, t]));

export function routeMeta(id: string): RouteMeta | undefined {
  return ROUTE_INDEX.get(id);
}

export function worldMeta(id: WorldId): WorldMeta {
  const w = WORLD_META.find((m) => m.id === id);
  if (!w) throw new Error(`unknown world ${id}`);
  return w;
}

export function ustaTask(id: string): UstaTask | undefined {
  return TASK_INDEX.get(id);
}

export function routesOfWorld(world: WorldId): readonly RouteMeta[] {
  return ROUTE_META.filter((r) => r.world === world);
}

// ---------------------------------------------------------------------------------------------
// Usta task evaluation
// ---------------------------------------------------------------------------------------------

/** Usta tasks count on the unmodified route only: career flights and duels on that career route. */
const USTA_MODES = new Set(['career', 'duel']);

/** Absolute target for display/evaluation. Ratio tasks need benchmarks; returns null when unknown. */
export function resolveUstaTarget(task: UstaTask, bench?: RouteBenchmarks): number | null {
  if (task.type === 'scoreOver') return bench ? Math.ceil(task.value * bench.expertScore) : null;
  if (task.type === 'timeUnder') return bench ? Math.floor(task.value * bench.expertTimeSec * 10) / 10 : null;
  return task.value;
}

/** True when the flight that just ended completes the task. Every task requires a real landing (route done). */
export function checkUsta(task: UstaTask, s: FlightStats, bench?: RouteBenchmarks): boolean {
  if (s.routeId !== task.routeId || !USTA_MODES.has(s.mode) || !s.landed || s.halfFlight) return false;
  if (task.unassistedOnly && s.assistUsed) return false;
  const v = task.value;
  switch (task.type) {
    case 'balloonThread':
      return s.balloonThreads >= v;
    case 'mult5Hold':
      return s.maxX5StreakSec >= v;
    case 'grazeCount':
      return s.grazes >= v;
    case 'noContact3Stars':
      return s.stars >= v && s.contacts === 0;
    case 'landWithin':
      return s.landingDist <= v;
    case 'noThermal':
      return s.thermalsEntered <= v;
    case 'gateChain':
      return s.maxGateChain >= v;
    case 'timeUnder': {
      const t = resolveUstaTarget(task, bench);
      return t !== null && s.timeSec <= t;
    }
    case 'scoreOver': {
      const t = resolveUstaTarget(task, bench);
      return t !== null && s.score >= t;
    }
    case 'boldOpen':
      return s.braveOpening && !s.autoParachute;
    case 'softLanding':
      return s.softLanding;
    case 'prox3Time':
      return s.x3PlusTotalSec >= v;
  }
}

/** i18n key in src/ui/strings: the task type IS the key suffix (`usta.<type>`), no alias layer (F1 review). */
export const USTA_I18N_KEY: Readonly<Record<UstaType, string>> = {
  balloonThread: 'usta.balloonThread',
  mult5Hold: 'usta.mult5Hold',
  grazeCount: 'usta.grazeCount',
  noContact3Stars: 'usta.noContact3Stars',
  landWithin: 'usta.landWithin',
  noThermal: 'usta.noThermal',
  gateChain: 'usta.gateChain',
  timeUnder: 'usta.timeUnder',
  scoreOver: 'usta.scoreOver',
  boldOpen: 'usta.boldOpen',
  softLanding: 'usta.softLanding',
  prox3Time: 'usta.prox3Time',
};

/** Relative wording when the Kılavuz benchmark is not known yet (dev builds): never "1 puanı geç". */
export const USTA_I18N_KEY_RELATIVE: Readonly<Partial<Record<UstaType, string>>> = {
  scoreOver: 'usta.scoreOverRel',
  timeUnder: 'usta.timeUnderRel',
};

/**
 * Display data for a task. `value` is the EXACT threshold checkUsta uses (timeUnder: seconds floored to 0.1 →
 * format with the `time` formatter, e.g. 1:18.4; scoreOver: integer points). `pct` = the ratio as a percentage
 * (relative wording). `unassisted` → append "(yardımsız)" (string key usta.unassistedSuffix).
 */
export function ustaI18n(
  task: UstaTask,
  bench?: RouteBenchmarks,
): { key: string; params: { count: number; value: number; pct: number }; ready: boolean; unassisted: boolean } {
  const target = resolveUstaTarget(task, bench);
  const ready = target !== null;
  const n = ready ? target : task.value;
  const rel = USTA_I18N_KEY_RELATIVE[task.type];
  const key = !ready && rel ? rel : USTA_I18N_KEY[task.type];
  return { key, params: { count: n, value: n, pct: Math.round(task.value * 100) }, ready, unassisted: task.unassistedOnly };
}/** Shape stored in RouteDef.ustaGorevleri (src/sim/types.ts). */
export function toRouteDefUsta(task: UstaTask): { id: string; type: string; count?: number; value?: number } {
  const counted = task.type === 'balloonThread' || task.type === 'grazeCount' || task.type === 'gateChain';
  return counted ? { id: task.id, type: task.type, count: task.value } : { id: task.id, type: task.type, value: task.value };
}
