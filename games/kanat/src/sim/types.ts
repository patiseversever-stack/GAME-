// Shared gameplay contracts (owner: flight-sim agent; consumers: render, camera, UI/HUD, audio, modes).
// PURE: no DOM, no three.js, no Math.random / Date / performance.now anywhere under src/sim/**.

export type WorldId = 'kapadokya' | 'likya' | 'karadeniz' | 'erciyes' | 'pamukkale';
export const WORLD_IDS: readonly WorldId[] = ['kapadokya', 'likya', 'karadeniz', 'erciyes', 'pamukkale'];

/** Input/bot command. Replay = seed + ordered command stream. */
export interface Command {
  tick: number;
  actorId: number; // 0 = local player; ghosts/bots use their own ids
  cmd: 'axis' | 'parachute' | 'pause' | 'flare' | 'tight';
  /** axis: [sx, sy] each int in [-31, 31] (already deadzone+expo'd then quantized). flare: [0..31]. tight: [0|1]. */
  args: number[];
}

/** Surface class reported by the proximity query. */
export type SurfaceClass = 'none' | 'rock' | 'ground' | 'water' | 'prop' | 'tree' | 'balloon';

export interface ProximityInfo {
  d: number; // distance from body capsule to nearest surface (m), Infinity if none within 45 m
  cls: SurfaceClass;
  nearest: [number, number, number];
  normal: [number, number, number];
  mult: 0 | 1 | 2 | 3 | 5; // after flatSurfaceMaxMult clamp
  propId: number; // -1 if terrain/water
}

export type FlightPhase = 'intro' | 'jump' | 'flying' | 'canopy' | 'landed' | 'crashed' | 'halfFlight';

/** Discrete gameplay events emitted by the sim (consumed by VFX/audio/haptics/HUD). */
export type SimEvent =
  | { type: 'wingsOpen'; tick: number }
  | { type: 'multUp'; tick: number; mult: number }
  | { type: 'comboBreak'; tick: number }
  | { type: 'graze'; tick: number; points: number; strength: number; pos: [number, number, number]; cls: SurfaceClass; side: -1 | 1 }
  | { type: 'gate'; tick: number; index: number; points: number; chain: number }
  | { type: 'gateMissed'; tick: number; index: number }
  | { type: 'thermalEnter'; tick: number; index: number }
  | { type: 'thermalExit'; tick: number; index: number }
  | { type: 'balloonThread'; tick: number; a: number; b: number; points: number; mult: number }
  | { type: 'bounce'; tick: number; pos: [number, number, number]; cls: SurfaceClass }
  | { type: 'crash'; tick: number; pos: [number, number, number]; cls: SurfaceClass }
  | { type: 'enterLandingZone'; tick: number }
  | { type: 'parachuteOpen'; tick: number; heightAGL: number; auto: boolean }
  | { type: 'landed'; tick: number; distToTarget: number; soft: boolean; points: number }
  | { type: 'halfFlight'; tick: number }
  /** Collision warning (assist 'low'/'full', §2.10): predicted impact in `tau` s; side −1 left / +1 right of heading. */
  | { type: 'warning'; tick: number; tau: number; side: -1 | 1; pos: [number, number, number] };

/** Read-only snapshot of the flight sim that render/UI/audio consume each frame. */
export interface FlightState {
  tick: number;
  phase: FlightPhase;
  pos: [number, number, number];
  prevPos: [number, number, number]; // previous tick (for render interpolation)
  vel: [number, number, number];
  speed: number; // m/s
  gamma: number; // flight path angle (rad)
  psi: number; // heading (rad), 0 = -z (north), +clockwise toward +x (east)
  phi: number; // bank (rad)
  cl: number; // lift coefficient
  heightAGL: number;
  prox: ProximityInfo;
  score: number;
  combo: number; // K multiplier 1..3
  comboTime: number; // seconds of continuous d<15
  timeSec: number; // sim time since jump
  gateIndex: number; // next gate
  gatesPassed: number;
  gatesMissed: number;
  inThermal: number; // -1 or thermal index
  inLandingZone: boolean;
  canopyOpen: boolean;
  assist: 'full' | 'low' | 'off';
  energy: number; // specific energy ½V²+gy
  /** 0..1 stall amount (0 above 33 m/s) — HUD/audio cue. Optional extension (always set by FlightSim). */
  stall?: number;
  /** True while the canopy is still opening (1.2 s). Optional extension. */
  canopyOpening?: boolean;
  /** Assist intervened at least once this flight (ghost/share flag 🛟). Optional extension. */
  assistUsed?: boolean;
}

/** Collision primitives for props. All props exist on every tier (canonical placement rule). */
export type PropPrimitive =
  | { kind: 'capsule'; a: [number, number, number]; b: [number, number, number]; r: number }
  | { kind: 'cone'; base: [number, number, number]; h: number; r0: number; r1: number } // truncated cone, axis +y
  | { kind: 'ellipsoid'; c: [number, number, number]; r: [number, number, number] }
  | { kind: 'box'; c: [number, number, number]; h: [number, number, number]; yaw: number; round: number };

export type PropType =
  | 'chimney' | 'chimneyCap' | 'balloon' | 'basket' | 'tree' | 'house' | 'gulet' | 'column' | 'wall' | 'theater'
  | 'cornice' | 'lighthouse' | 'tomb' | 'arch' | 'rock'
  | 'waterfall'; // waterfall: visual only (prims = []), see src/sim/world/props.ts header for params

export interface PropInstance {
  id: number;
  type: PropType;
  variant: number; // visual variant index
  pos: [number, number, number];
  yaw: number;
  scale: number;
  prims: PropPrimitive[]; // world-space collision primitives (static props)
  /** Free per-type visual params (e.g. chimney profile radii, tree species, balloon palette). */
  params: Record<string, number>;
}

export interface BalloonDef {
  id: number;
  p0: [number, number, number];
  drift: [number, number, number]; // m/s
  amp: [number, number, number];
  omega: number;
  phase: number;
  rise: number; // m/s slow rise
  pattern: number; // 0..11 palette/pattern id
  envelopeH: number; // 18..22 m
  envelopeR: number; // ~8 m
}

export interface RouteGate { t: number; pos: [number, number, number]; normal: [number, number, number]; radius: number; kind: 'normal' | 'final' }
export interface RouteThermal { pos: [number, number]; radius: number; w0: number; top: number }

export interface RouteDef {
  id: string; // w1r1 … w5r4, or daily-<n>
  world: WorldId;
  index: number; // 1..4
  difficulty: number; // 1..9
  name: { tr: string; en: string };
  start: { type: 'balon' | 'ucurum' | 'sirt'; pos: [number, number, number]; headingDeg: number; speedKmh: number };
  line: [number, number, number][];
  gates: RouteGate[];
  thermals: RouteThermal[];
  landing: { center: [number, number, number]; radius: number; zoneRadius: number };
  wind: { dirDeg: number; speed: number };
  stars: [number, number, number]; // score thresholds (1★ is "landed" → stored as 0)
  expertScore: number;
  ustaGorevleri: { id: string; type: string; count?: number; value?: number }[];
  postcards: string[];
}
