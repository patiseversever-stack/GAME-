// KANAT flight/scoring tunables — the single source of truth for gameplay numbers (brief §4.3 "data driven").
// Owner: flight agent. Every value cites where it comes from; deviations from the brief are explained in
// docs/decisions/flight.md (Turkish). Render/UI/audio may READ these (e.g. multiplier thresholds for the HUD ring).
// Units: SI (m, s, kg, rad unless the key says Deg/Kmh).

export const TUNING = {
  sim: {
    hz: 60, // §4.G.5 fixed tick
    substeps: 2, // §4.G.5 collision substeps (120 Hz)
    slowModeScale: 0.8, // §2.2 "Yavaş Mod" = sim dt × 0.8
    g: 9.81,
    jumpFreefallSec: 0.8, // jump phase before wingsOpen
    crashBufferSec: 3, // §4.G.5 ring buffer (180 states @ 60 Hz)
  },
  body: {
    mass: 90, // §4.G.5 m
    area: 1.4, // §4.G.5 S
    radius: 0.6, // §4.G.5 collision sphere r
  },
  aero: {
    rho: 1.1, // §4.G.5 constant in every world
    cd0: 0.06,
    k: 0.2,
    /** §4.G.5 says c_v = 0.004; that yields a 65.2 m/s (234.7 km/h) vertical terminal speed which breaks the
     *  64 m/s ceiling target and the 9.G-10 "220–232 km/h" test. 0.006 → 64.0 m/s. See decisions/flight.md. */
    cv: 0.006,
    cvOnset: 58, // m/s, start of the soft speed ceiling term
    clMax: 1.2,
    clMin: -0.1, // full push
    /** Trim CL: gives V≈42 m/s, sink≈9.0 m/s, L/D≈4.53 in steady glide (§4.G.5 targets). */
    clTrim: 0.62,
  },
  control: {
    axisMax: 31, // 6-bit quantized stick
    bankMaxDeg: 65, // §4.G.5 φ_target = sx/31·65°  (GDD §2.2 says 80°: §4.G wins, "kesin model 4.G'de")
    bankRateMaxDeg: 150, // §4.G.5 (GDD 140°/s)
    tauBank: 0.12,
    tauCl: 0.15,
    /** Release auto-level τ for both bank and CL (§4.G.5 0.4 s; GDD §2.2 0.6/0.8 s — §4.G wins). */
    tauRelease: 0.4,
    /** GDD §2.2 max pitch rate 55°/s — applied as a clamp on the flight-path angle rate. */
    pitchRateMaxDeg: 55,
    gammaMinDeg: -80, // path angle limits (keeps ψ̇ = L sinφ/(mV cosγ) finite; no loops in a point-mass model)
    gammaMaxDeg: 70,
    /** Released stick: CL = C_trim − gain·(γ − γ_trim), clamped to ±releaseClSpan → damps the phugoid so the
     *  nose returns to best glide (§2.2 "bırakmak her zaman güvenlidir"). */
    releaseGammaGain: 1.6,
    releaseClSpan: 0.35,
  },
  stall: {
    onset: 33, // §4.G.5 below this the CL ceiling softly drops and a nose-down moment is added
    vMin: 25, // §4.G.5 V never below 25 m/s (enforced energy-neutrally: the deficit becomes sink)
    clAtVMin: 0.5, // CL ceiling at vMin
    noseDownRate: 0.7, // rad/s nose-down help at full stall
  },
  air: {
    thermalTopFade: 80, // m of soft fade below a thermal's top
    ridgeK: 1.0, // w_ridge = k_r · max(0, ∇H·wind) (§4.G.5)
    ridgeMaxAGL: 60, // only below 60 m AGL, linearly fading with height
    gradStep: 4, // m, central difference step for ∇H
  },
  prox: {
    maxD: 45, // ProximityInfo.d = Infinity beyond this (§4.G.6)
    tiers: [30, 15, 7, 3] as readonly number[], // §2.5 Ç(d) thresholds
    mults: [1, 2, 3, 5] as readonly (1 | 2 | 3 | 5)[],
    flatSurfaceMaxMult: 3, // top-of-brief decision: water & ground slope < 8° → at most ×3
    flatSlopeDeg: 8,
    rockSlopeDeg: 30, // terrain class: 'rock' at/above this slope, else 'ground'
    coarseN: 13, // §4.G.6 13×13 @ 5 m
    coarseStep: 5,
    fineN: 7, // §4.G.6 7×7 @ 1 m
    fineStep: 1,
    ringR: [15, 30] as readonly number[], // early-out ring samples (12 directions each)
    /** Max terrain slope (tan) assumed for the cheap vertical-clearance collision test (85°). */
    lipschitz: 12,
    /** Conservative bias subtracted from refined terrain distances below 3 m (keeps "exact < r ⇒ caught"). */
    terrainSafety: 0.03,
    propCell: 32, // §4.G.6 uniform grid cell size
  },
  contact: {
    bounceMaxNormalSpeed: 6, // top-of-brief decision / §2.2: v_n < 6 m/s → bounce, else crash
    bounceSpeedLoss: 0.25,
    pushOut: 0.05, // extra clearance after a bounce
  },
  score: {
    base: 100, // §2.5 100 × Ç(d) × (v / 150 km/h) × K per second
    refSpeed: 150 / 3.6,
    comboStep: 0.15,
    comboStepSec: 2,
    comboMax: 3,
    comboD: 15, // t_z counts while d < 15
    comboGraceSec: 1.5, // > 1.5 s at d ≥ 15 breaks the combo
    multUpHoldSec: 0.4, // multUp re-announce hysteresis
    grazeD: 1.5, // top-of-brief decision (graze d < 1.5 m without contact)
    grazeMinSpeed: 140 / 3.6,
    grazePoints: 250,
    grazeCooldownSec: 1, // per object
    grazeRearmD: 2.0, // a pass ends when d rises above this
    grazeMinRise: 0.05, // local minimum confirmed once d rose this much above the running min
    gatePoints: 500,
    gateChainStep: 100,
    gateChainMax: 1000,
    gateMissRadiusFactor: 4, // crossing the plane within 4R but outside R = missed
    gateMagnet: 0.15, // full assist: +15 % radius and a gentle steer
    thermalPoints: 100, // once per thermal per flight
    threadPoints: 750,
    threadChainMult: 1.5,
    threadChainMax: 3,
    threadChainWindowSec: 4,
    threadPairMaxDist: 35, // §2.5 centers ≤ 35 m apart
    threadMaxDistToBalloon: 12, // §2.5 ≤ 12 m to each envelope
    threadPairCooldownSec: 2,
    landingRings: [2, 5, 10] as readonly number[],
    landingPoints: [1000, 500, 200] as readonly number[],
    softLandingPoints: 300,
    softLandingFlareAGL: 3,
    braveOpenMin: 60,
    braveOpenMax: 90,
    braveOpenPoints: 300,
    autoParachuteBonusFactor: 0.5, // §2.2 Otomatik Paraşüt halves landing bonuses
  },
  canopy: {
    zoneRadius: 250, // §2.2 landing zone cylinder (route.landing.zoneRadius overrides)
    openSec: 1.2,
    openTau: 0.35, // speed blend time constant during opening
    forwardSpeed: 10,
    brakeForwardSpeed: 4,
    sinkSpeed: 5,
    brakeSinkSpeed: 3.2,
    flareSinkCut: 4.2, // extra sink reduction from stored flare energy
    flareChargeDrain: 0.9, // per second at full brake
    flareChargeRefill: 0.25, // per second without brake
    turnRateMaxDeg: 35, // §2.2
    emergencyAGL: 20, // §2.2 auto chute outside the zone → halfFlight
    autoOpenAGL: 75, // Auto Parachute: ideal opening height (inside brave window)
    softMaxVz: 2.6, // touchdown sink below this counts as soft (with flare)
  },
  assist: {
    pushD: 2, // §2.10 full: d < 2 m and closing > 8 m/s → soft push
    pushClosing: 8,
    pushRate: 5, // rad/s of path rotation away from the surface (energy neutral)
    noseUpTau: 0.6, // §2.10 / §4.G.5 τc < 0.6 s
    noseUpCooldownSec: 5,
    noseUpMaxDeg: 16,
    warnTau: 1.0, // §2.10 low: warning 1.0 s before impact
    warnCooldownSec: 1.0,
    lookaheadSec: [0.5, 1.0] as readonly number[],
    guidePushD: 2, // guide wind (W1 R1–R3): soft push inside 2 m, crash impossible
    guidePushRate: 8,
  },
  balloon: {
    idBase: 1000000, // ProximityInfo.propId for balloons = idBase + BalloonDef.id
    basketHalf: [0.8, 0.6, 0.8] as readonly number[],
    basketBelow: 2.5, // basket center below the envelope bottom
  },
} as const;

export type Tuning = typeof TUNING;
