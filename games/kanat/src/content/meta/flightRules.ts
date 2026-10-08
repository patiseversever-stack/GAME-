// In-flight help, assist marking, practice, boundaries and wayfinding rules (F1 review: Red Team + Player Panel).
// Design-owned numbers; flight (sim), platform (settings/input), UI (HUD/cards) and the integrator read them.
// Settings keys named here are REQUESTS to the platform agent (src/core/settings.ts). PURE data + helpers.

import type { AssistLevel, FlightStats } from './types.ts';

// ---------------------------------------------------------------------------------------------
// 🛟 and "unassisted" (K-20)
// ---------------------------------------------------------------------------------------------

/** Tiers that change physics. 'low' (warnings only) is physics-neutral and never marks a card. */
export const PHYSICS_ASSISTS: readonly AssistLevel[] = ['full', 'guide'];

/** 🛟 on daily/duel/share cards: only when a physics-changing assist actually intervened this flight. */
export function showsAssistMark(assist: AssistLevel, assistUsed: boolean): boolean {
  return assistUsed && PHYSICS_ASSISTS.includes(assist);
}

/** Route card / results: records set with assist help carry the 🛟 icon (career, no penalty). */
export function recordAssisted(s: Pick<FlightStats, 'assist' | 'assistUsed'>): boolean {
  return showsAssistMark(s.assist, s.assistUsed);
}

/**
 * One-tap offer to step DOWN to 'low' (Az), never straight to 'off':
 *  - early: on W1 R2–R3 results when the player earned ≥ 2⭐ and no assist ever intervened (skilled player);
 *  - always: after landing W1 R3 (brief §2.9), once.
 * Never on the compact FTUE card (w1r1). Accepting also turns Rehber Rüzgâr off for W1 R1–R3 replays.
 */
export const ASSIST_OFFER = {
  target: 'low' as AssistLevel,
  earlyRoutes: ['w1r2', 'w1r3'] as readonly string[],
  earlyMinStars: 2,
  alwaysAfter: 'w1r3',
} as const;

export function shouldOfferAssistDown(
  s: Pick<FlightStats, 'routeId' | 'stars' | 'landed' | 'assist' | 'assistUsed'>,
  alreadyOffered: boolean,
): boolean {
  if (alreadyOffered || !s.landed || !PHYSICS_ASSISTS.includes(s.assist)) return false;
  if (s.routeId === ASSIST_OFFER.alwaysAfter) return true;
  return ASSIST_OFFER.earlyRoutes.includes(s.routeId) && s.stars >= ASSIST_OFFER.earlyMinStars && !s.assistUsed;
}

// ---------------------------------------------------------------------------------------------
// Dynamic help + practice ("Bu bölümü çalış") (K-26)
// ---------------------------------------------------------------------------------------------

/**
 * A SECTION is a gate interval: section k = between gate k−1 and gate k (section 0 = start → first gate,
 * last section = last gate → touchdown). 3 crashes in the same section → one-tap card with three options.
 */
export const DYNAMIC_HELP = {
  crashesPerSection: 3,
  options: ['fullAssist', 'guideLine', 'practiceSection'] as readonly string[],
  /** Settings toggle that silences the card forever (platform: Settings.kanat.dynamicHelpOff). */
  permanentOffSetting: 'kanat.dynamicHelpOff',
} as const;

export function sectionOf(gatesPassed: number): number {
  return Math.max(0, Math.floor(gatesPassed));
}

/** Practice run: starts from the snapshot taken at the last passed gate; scored flights still start at the top. */
export const PRACTICE_RULES = {
  startAt: 'lastPassedGateSnapshot',
  writesRecords: false,
  writesStars: false,
  xp: 0,
  countsUsta: false,
  countsBadges: false,
  hudLabelKey: 'practice.label', // "ANTRENMAN"
  /** Practice also offered from the pause menu after the first crash past gate 3. */
  pauseMenuAfterGate: 3,
} as const;

// ---------------------------------------------------------------------------------------------
// Soft boundary — no invisible walls (§1), no instant penalty (K-26)
// ---------------------------------------------------------------------------------------------

export const SOFT_BOUNDARY = {
  /** Half size of the 8 km playable core (m), centred on the world origin. */
  coreHalfM: 4000,
  /** Inside this band before the edge: headwind and fog ramp up, an edge arrow points back to the route. */
  rampM: 400,
  headwindMaxMs: 8,
  fogVisibilityMinM: 300,
  /** Past the edge: career → auto canopy → Yarım Uçuş; free flight → 3 s rewind. */
  beyondEdge: { career: 'autoCanopy', free: 'rewind' },
} as const;

// ---------------------------------------------------------------------------------------------
// Landing wayfinding + flare hint (Player Panel P1/P2)
// ---------------------------------------------------------------------------------------------

export const LANDING_WAYFINDING = {
  /** Edge arrow switches from "next gate" to the landing target (parachute icon) after the last gate ... */
  arrowAfterLastGate: true,
  /** ... or when the target is closer than this. */
  arrowWithinM: 1500,
  /** Small distance label under the arrow: "İNİŞ 820 m" (string key hud.landingDist). */
  distanceLabelKey: 'hud.landingDist',
  /** Soft light column + thin smoke at the target, readable from this far (render-props marker). */
  beaconVisibleM: 2000,
  /** Zone entry: one beep + 18 ms haptic + PARAŞÜT pulse. */
  zoneEntryHapticMs: 18,
  /** Yarım Uçuş results: mini map with the touchdown point vs the zone. */
  halfFlightMiniMap: true,
} as const;

export const FLARE_HINT = {
  /** Career default ON, switchable (platform: Settings.kanat.flareHint). FTUE always shows it. */
  careerDefaultOn: true,
  setting: 'kanat.flareHint',
  glowAglM: 6,
  arrowAglM: 3,
  hapticMs: 12,
} as const;

// ---------------------------------------------------------------------------------------------
// Controls comfort (Player Panel P2/P3)
// ---------------------------------------------------------------------------------------------

/** "Sakin kontrol" preset (Erişilebilirlik + one-time card). Values are absolute InputManager settings. */
export const CALM_CONTROLS = {
  stickRadiusFrac: 0.16,
  deadzone: 0.12,
  sensitivity: 0.8,
  expo: 0.5,
  /** One-time card trigger in the first 3 flights: small, fast stick reversals (tremor-like). */
  trigger: { firstFlights: 3, flipsPerSec: 6, maxAbsAxis: 6, cumulativeSec: 3 },
} as const;

/** Proximity ring vs resting thumb. */
export const RING_PLACEMENT = {
  /** When the stick anchor lies inside the ring rectangle, ease the ring up by this much (CSS px). */
  shiftUpPx: 90,
  easeSec: 0.25,
  setting: 'kanat.ringPosition', // 'bottom' | 'middle'
} as const;

export const COMFORT_DEFAULTS = {
  /** OS prefers-reduced-motion → Konfor Kamerası + Hareketi azalt default ON. */
  followOsReducedMotion: true,
  /** 2 early exits (pause → Çık before 25 s) in the first 3 flights → one-time "Daha sakin kamera?" card. */
  earlyExitSec: 25,
  earlyExitsToOffer: 2,
  firstFlights: 3,
} as const;

/** "Yukarı çekince burun insin mi?" card (brief §2.2 detection at the first gate). */
export const INVERT_CARD = {
  /** The sim pauses under a blurred background while the card is up. */
  pausesSim: true,
  /** FTUE: only in the first-gate segment (before the 12–30 s wow beats) or after landing — never between. */
  ftueAllowedSimSec: [0, 6] as readonly number[],
  titleKey: 'inverted.title',
  yesKey: 'inverted.yes',
  noKey: 'inverted.no',
  /** Platform: Settings.kanat.invertAsked (asked once, persistent). */
  askedSetting: 'kanat.invertAsked',
} as const;

/** One-hand reach: two-finger tap pauses (single-stick schemes only — not "İki Başparmak"). */
export const TWO_FINGER_PAUSE = { enabled: true, maxTapMs: 250 } as const;
