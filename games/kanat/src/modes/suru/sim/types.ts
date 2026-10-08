// SÜRÜ.io public contracts: commands, events, snapshot and the render-source interface (§4.3, §4.G.10, §4.G.11).
// PURE types module.

/**
 * Input command — identical for humans and bots (§2.6 "YZ oyuncuyla aynı komutları üretir").
 * actorId = flock id (1..16; the local player is flock 1).
 * steer: args [sx, sz] int8 in [−127, 127] — desired world direction (x east, z south); [0, 0] = keep heading.
 * tight: args [0 | 1] — 1 = finger down ("Sıkı Dizi"), 0 = released ("Geniş Kanat").
 */
export interface SuruCommand {
  tick: number;
  actorId: number;
  cmd: 'steer' | 'tight';
  args: number[];
}

export type FlockMode = 0 | 1; // 0 = Wide (Geniş Kanat), 1 = Tight (Sıkı Dizi)

export type SuruEvent =
  | { type: 'roundStart'; tick: number }
  | { type: 'capture'; tick: number; flock: number; count: number; x: number; z: number }
  | { type: 'convertWave'; tick: number; from: number; to: number; count: number; x: number; z: number }
  | { type: 'siegeProgress'; tick: number; attacker: number; target: number; coverage: number }
  | { type: 'siege'; tick: number; attacker: number; target: number; count: number; x: number; z: number }
  | { type: 'siegeComplete'; tick: number; attacker: number; target: number }
  | { type: 'lone'; tick: number; flock: number }
  | { type: 'recovered'; tick: number; flock: number }
  | { type: 'eliminated'; tick: number; flock: number; by: number; place: number; x: number; z: number }
  | { type: 'hawkWarn'; tick: number; hawk: number; target: number; x: number; z: number }
  | { type: 'hawkDive'; tick: number; hawk: number; target: number; x: number; z: number }
  | { type: 'hawkScatter'; tick: number; hawk: number; flock: number; count: number; x: number; z: number }
  | { type: 'gustWarn'; tick: number; dirX: number; dirZ: number; offset: number; width: number; startTick: number }
  | { type: 'gustStart'; tick: number }
  | { type: 'gustEnd'; tick: number }
  | { type: 'stormSpawn'; tick: number; x: number; z: number; radius: number }
  | { type: 'ringStart'; tick: number; radius: number }
  | { type: 'breathless'; tick: number; flock: number }
  | { type: 'roundEnd'; tick: number; winner: number };

export type SuruEventType = SuruEvent['type'];

/** Per-flock end-of-round statistics (§2.6 "Tur istatistikleri"). */
export interface FlockStats {
  flock: number;
  rank: number;
  size: number;
  peakSize: number;
  converted: number;
  wildCollected: number;
  sieges: number;
  survivalSec: number;
  eliminated: boolean;
  lp: number;
}

export interface FlockSnapshot {
  id: number;
  alive: boolean;
  lone: boolean;
  x: number;
  z: number;
  hx: number;
  hz: number;
  speed: number;
  tight: boolean;
  breath: number;
  breathless: boolean;
  size: number;
  peak: number;
}

/** Compact, serialisable summary — what an online server would send at 30 Hz (§4.G.11). */
export interface SuruSnapshot {
  tick: number;
  timeSec: number;
  ringRadius: number;
  ringActive: boolean;
  flocks: FlockSnapshot[];
  /** 32×32 dominant-owner grid over the 640 m hash bounds (0 = none/wild). */
  ownerGrid: Uint8Array;
  hawks: { x: number; z: number; phase: number; target: number }[];
  storm: { active: boolean; x: number; z: number; radius: number };
  gust: { phase: number; dirX: number; dirZ: number; offset: number; width: number };
  hash: number;
}

/** Siege progress for one target (rendered as an arc in the attacker's colour around the target leader). */
export interface SiegeArcView {
  target: number;
  attacker: number;
  /** 0..1 where 1 = 300° covered. */
  coverage01: number;
  /** 0..1 hold progress (0.5 s). */
  hold01: number;
  /** 36-bit coverage mask split in two 18-bit words. */
  binsLo: number;
  binsHi: number;
  radius: number;
  /** true while the 1.5 s cascade runs */
  cascading: boolean;
  cascadeStartTick: number;
}

/** Hawk view (visual). phase: 0 idle, 1 warning (shadow only), 2 dive, 3 leaving. */
export interface HawkView {
  phase: number;
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  targetFlock: number;
  phaseTick: number;
}

/**
 * Everything the renderer needs, read-only. Offline the full sim implements it; online a client-side
 * approximation (snapshot-conditioned cosmetic boids) can implement the same interface (§4.G.11).
 */
export interface FlockRenderSource {
  readonly birdCount: number;
  readonly maxFlocks: number;
  readonly tick: number;
  readonly timeSec: number;
  /** positions at previous and current tick (render interpolates with alpha) */
  readonly prevX: Float32Array;
  readonly prevZ: Float32Array;
  readonly posX: Float32Array;
  readonly posZ: Float32Array;
  readonly velX: Float32Array;
  readonly velZ: Float32Array;
  readonly owner: Uint8Array;
  readonly lastConv: Uint32Array;
  readonly flags: Uint8Array;
  /** number of flocks in this round (ids 1..flockCount) */
  readonly flockCount: number;
  /** per flock id (index 0 unused): leader state */
  readonly leaderX: Float32Array;
  readonly leaderZ: Float32Array;
  readonly leaderPrevX: Float32Array;
  readonly leaderPrevZ: Float32Array;
  readonly leaderHX: Float32Array;
  readonly leaderHZ: Float32Array;
  readonly flockAlive: Uint8Array;
  readonly flockMode: Uint8Array;
  readonly flockCountArr: Uint16Array;
  readonly flockBreath: Float32Array;
  readonly flockLone: Uint8Array;
  readonly flockElimTick: Int32Array;
  flockRadius(f: number): number;
  readonly sieges: readonly SiegeArcView[];
  readonly hawks: readonly HawkView[];
  readonly storm: { active: boolean; x: number; z: number; prevX: number; prevZ: number; radius: number };
  readonly gust: { phase: number; dirX: number; dirZ: number; offset: number; width: number; phaseTick: number };
  readonly ringRadius: number;
  readonly ringActive: boolean;
  readonly roundOver: boolean;
  /** Events since the last drain (render/audio/HUD). */
  drainEvents(): SuruEvent[];
}

/** Arena layout (hand-made or seeded "Sürü Günü"). */
export interface SuruLayout {
  id: string;
  name: { tr: string; en: string };
  /** reed islets — wild re-gathering points */
  islets: { x: number; z: number; r: number }[];
  lighthouse: { x: number; z: number };
  rocks: { x: number; z: number; r: number }[];
  /** visual shoreline: bay opening direction (radians, 0 = −z) and land arcs outside the arena */
  shore: { from: number; to: number; dist: number }[];
  /** flock spawn ring radius */
  spawnRadius: number;
  seed: number;
}
