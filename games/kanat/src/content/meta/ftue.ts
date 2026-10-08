// FTUE timeline as DATA (F1 review P0: "the brief's most scrutinized deliverable has no owner").
// Design owns the beats; the integrator's FTUE director (src/modes/career/ftue.ts) plays them. Beats fire on
// film time (before the jump), sim time (after the jump) or sim events; `nominalSec` is the §1 timeline position
// measured from the first FTUE frame (docs/tests only). HUD elements are revealed cumulatively ONLY in the first
// flight (Player Panel: no wall of gauges at the jump); every later flight shows the full HUD. PURE data.

export type HudElement =
  | 'pause'
  | 'gateArrow'
  | 'proxRing'
  | 'multLabel'
  | 'comboBar'
  | 'score'
  | 'altitude'
  | 'landingMarker'
  | 'parachuteButton'
  | 'speed';

export type FtueTrigger =
  /** Seconds since the first FTUE frame (film phase, before the jump). */
  | { kind: 'film'; t: number }
  /** Sim seconds since the jump. */
  | { kind: 'sim'; t: number }
  | { kind: 'event'; event: 'jumpTap' | 'gate' | 'graze' | 'balloonThread' | 'landingZone' | 'canopyOpen' | 'landed'; index?: number }
  /** Height above ground under canopy (m). */
  | { kind: 'agl'; below: number };

export type ThumbGesture = 'pulse' | 'dragLeft' | 'dragHorizontal' | 'dragDown' | 'tap';

export interface FtueBeat {
  id: string;
  trigger: FtueTrigger;
  nominalSec: number;
  camera?: 'black' | 'basketHand' | 'pullBackWide' | 'follow' | 'targetReveal' | 'menuRise';
  /** Single-word prompt (string key) + ghost-thumb gesture. */
  prompt?: { key?: string; thumb: ThumbGesture; arrow?: 'down'; repeatAfterSec?: number };
  /** HUD elements revealed at this beat (cumulative). */
  reveal?: readonly HudElement[];
  /** What the beat teaches (docs + e2e assertions). */
  teaches?: string;
  /** Scripted assists active from this beat (sim options / director rails). */
  systems?: readonly string[];
}

export const FTUE_BEATS: readonly FtueBeat[] = [
  { id: 'black', trigger: { kind: 'film', t: 0 }, nominalSec: 0, camera: 'black', teaches: 'atmosphere' },
  { id: 'dawnFlicker', trigger: { kind: 'film', t: 0.3 }, nominalSec: 0.3, camera: 'basketHand', teaches: 'not frozen: faint dawn light on the glove' },
  { id: 'pullBack', trigger: { kind: 'film', t: 1.5 }, nominalSec: 1.5, camera: 'pullBackWide', teaches: 'place: ~40 balloons, Göreme valleys, gold mist, small KANAT logo' },
  {
    id: 'jumpPrompt',
    trigger: { kind: 'film', t: 4 },
    nominalSec: 4,
    prompt: { key: 'ftue.jump', thumb: 'pulse', arrow: 'down', repeatAfterSec: 4 },
    teaches: 'one tap starts',
  },
  { id: 'jump', trigger: { kind: 'event', event: 'jumpTap' }, nominalSec: 6, camera: 'follow', reveal: ['pause'], teaches: 'wing opening (0.8 s, 25 ms haptic)' },
  {
    id: 'firstGate',
    trigger: { kind: 'sim', t: 1.5 },
    nominalSec: 7.5,
    prompt: { thumb: 'dragLeft' },
    reveal: ['gateArrow'],
    teaches: 'direction',
    systems: ['guideWind', 'gateMagnet'],
  },
  { id: 'proximity', trigger: { kind: 'sim', t: 6 }, nominalSec: 12, reveal: ['proxRing', 'multLabel', 'comboBar'], teaches: 'proximity = points (rising pentatonic tones)' },
  {
    id: 'firstGraze',
    trigger: { kind: 'event', event: 'graze' },
    nominalSec: 18,
    reveal: ['score'],
    teaches: 'graze (scripted ~1.2 m pass, 0.85× for 150 ms)',
    systems: ['grazeRail'],
  },
  { id: 'balloonPair', trigger: { kind: 'sim', t: 16 }, nominalSec: 22, teaches: 'balloon thread (dashed light arc between the pair)' },
  { id: 'targetReveal', trigger: { kind: 'sim', t: 20 }, nominalSec: 26, camera: 'targetReveal', teaches: 'the target: vineyard ring + horizon + balloons in one frame' },
  {
    id: 'landingZone',
    trigger: { kind: 'event', event: 'landingZone' },
    nominalSec: 30,
    prompt: { thumb: 'tap' },
    reveal: ['altitude', 'landingMarker', 'parachuteButton'],
    teaches: 'parachute (button only inside the zone)',
  },
  { id: 'canopyTurn', trigger: { kind: 'event', event: 'canopyOpen' }, nominalSec: 36, prompt: { thumb: 'dragHorizontal' }, teaches: 'canopy turn toward the glowing ring' },
  { id: 'flare', trigger: { kind: 'agl', below: 3 }, nominalSec: 48, prompt: { key: 'ftue.pull', thumb: 'dragDown', arrow: 'down' }, teaches: 'flare → soft landing' },
  { id: 'stars', trigger: { kind: 'event', event: 'landed' }, nominalSec: 52, camera: 'menuRise', teaches: 'stars stamp one by one (40 ms haptic each)' },
  { id: 'ftueResults', trigger: { kind: 'event', event: 'landed' }, nominalSec: 56, teaches: 'compact results card over the live menu, single big Devam' },
];

/** HUD elements that stay hidden for the whole first flight. */
export const FTUE_HIDDEN_FIRST_FLIGHT: readonly HudElement[] = ['speed'];

export const FTUE_RULES = {
  /** Any tap from this film time on jumps immediately (skips the rest of the film). */
  inputAcceptedFromSec: 1.5,
  /**
   * Audio policy (K-22, brief §7.3 "Ses asla otomatik başlamaz" vs §1 wind at 0–4 s): the film never forces
   * audio. If the AudioContext is already running (host allowed autoplay), wind + burner + K0 pad play as §1.
   * Otherwise the film is silent (dawn flicker at 0.3 s keeps it alive) and the JUMP tap unlocks audio: the
   * freefall wind crescendo is the first sound. No extra "tap to start" gate.
   */
  audio: 'resumeOnJumpTap',
  /** Budgets (measured on the idle machine, 4× CPU throttle). */
  ttffSec: 4, // process start → first FTUE frame
  iconToJumpPromptSec: 8, // mid device, app icon → "Atla" prompt visible
  /** First launch loads only the w1r1 corridor at one tier below the auto tier; the black frame IS the loader. */
  firstLoad: { routeOnly: 'w1r1', tierOffset: -1, separateLoadingScreen: false },
  /** "Ters mi?" card: first-gate segment or after landing only (flightRules.INVERT_CARD). */
  invertCard: 'firstGateOrAfterLanding',
  /** Compact results card (3–4 s) after the star stamps: highlight loop behind, Usta n/3, first cosmetic + [Giy]. */
  resultsCard: { minSec: 3, maxSec: 4, showsUsta: true, showsFirstCosmetic: true, wearShortcut: true, primary: 'continue' },
  /** Rehber Rüzgâr pushes only when closing faster than this (tangential grazes exempt) — K-17. */
  guidePushMinClosingMs: 3,
} as const;

/** One-time, textless hints after the FTUE (Player Panel P2/P3). Each fires once per profile. */
export const FIRST_TIME_HINTS = [
  { id: 'thermal', routeId: 'w1r2', trigger: 'firstThermalAhead', show: 'shimmer column glows, ghost arrow "through it", green + ticks rising on the altitude bar' },
  { id: 'halfFlightThermal', routeId: '*', trigger: 'halfFlightResult', textKey: 'tip.thermalLift' },
  { id: 'ringLabels', routeId: '*', trigger: 'firstFlights:3', show: '30 / 15 / 7 / 3 m labels on the proximity ring slices' },
  { id: 'landingArrow', routeId: '*', trigger: 'lastGatePassed', show: 'edge arrow turns into the parachute icon + distance' },
  { id: 'suruIcons', routeId: 'suru', trigger: 'suruFtueStep2', show: 'open hand = Geniş, fist = Sıkı (no text)' },
] as const;
