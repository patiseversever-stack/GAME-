// SÜRÜ.io balance & simulation constants — single data source (BRIEF §2.6 rules, §4.G.10 algorithms).
// Every conflict between §2.6 and §4.G.10 is resolved here and documented in docs/decisions/suru.md.
// PURE data module.

const DEG = 0.017453292519943295;

export const SURU = {
  /** Fixed tick rate (Hz) and step (s). */
  TICK_HZ: 30,
  DT: 1 / 30,
  /** Bird pool — constant on every tier, conserved every tick (leaders are separate entities). */
  N_BIRDS: 1500,
  MAX_FLOCKS: 16,
  FOLLOWERS_AT_SPAWN: 15,
  /** flock ids whose owner colour (#E69F00) is nearest to the player's gold: they spawn opposite the player */
  SPAWN_FAR_FLOCKS: [8, 15],
  /** Round length: 3:00 sim time. */
  ROUND_SEC: 180,
  /** Arena (bay) radius and spatial hash bounds (640 × 640 m, 6 m cells → 107² cells). */
  ARENA_RADIUS: 300,
  HASH_HALF: 320,
  CELL: 6,
  MAX_CAND: 32,
  /** on a bird's movement-only ticks (conversion is evaluated every 2nd tick per bird, staggered) */
  MAX_CAND_MOVE: 20,
  TOPO_K: 7,

  // ---- leader (§4.G base speed, §2 multipliers & turn rate) ----
  LEADER_SPEED: 12,
  TIGHT_SPEED_MUL: 1.25,
  WIDE_SPEED_MUL: 0.9,
  LONE_SPEED_MUL: 1.3,
  TURN_BASE: 140 * DEG,
  TURN_REF_N: 20,
  TURN_MIN_F: 0.35,
  TURN_MAX_F: 1.0,

  // ---- breath (§2) ----
  BREATH_MAX: 100,
  BREATH_DRAIN: 14,
  BREATH_REGEN: 22,
  BREATH_UNLOCK: 25,

  // ---- formation (§2 radius k, §4.G trail + Vogel) ----
  R_K_TIGHT: 0.6,
  R_K_WIDE: 1.3,
  /** Trail lag Lmax = clamp(LAG_K·√n, LAG_MIN, LAG_MAX) s (tuned so a circling leader closes ≈ 345° in one lap). */
  LAG_K: 0.55,
  LAG_MIN: 1.0,
  LAG_MAX: 8.0,
  /** Tight formation shortens the comet (compact punch); Wide keeps the full stream for encircling. */
  LAG_TIGHT_MUL: 0.6,
  TRAIL_LEN: 256,
  SEP_R_TIGHT: 1.2,
  SEP_R_WIDE: 2.0,
  W_SEP: 1.5,
  W_ALI: 0.8,
  W_COH: 0.6,
  W_TARGET: 1.0,
  W_FLEE: 2.5,
  FOLLOWER_SPEED_MUL: 1.25,
  /** Catch-up boost for birds that are far from their slot (just joined). */
  CATCHUP_SPEED_MUL: 1.6,
  CATCHUP_DIST: 18,
  MAX_ACCEL: 25,
  /** Visual-only altitude model lives in the renderer; the sim is 2D (x, z). */

  // ---- wild birds ----
  WILD_SPEED: 7,
  WILD_GROUP_MIN: 5,
  WILD_GROUP_MAX: 30,
  MAX_GROUPS: 255,
  /** Capture: group centre within r_f + CAPTURE_PAD of the leader (§2), or any member within contact radius of a follower. */
  CAPTURE_PAD: 4,
  CAPTURE_CONTACT_WIDE: 3.5,
  CAPTURE_CONTACT_TIGHT: 1.5,
  /** S-14: birds scattered by a hawk / storm / night cannot rejoin their FORMER owner for 7 s (others may). */
  SCATTER_OWNER_IMMUNE_SEC: 7,
  GROUP_MERGE_DIST: 12,

  // ---- contact conversion (§2 thresholds/rates, §4.G kernel + frontier) ----
  CONV_R: 6,
  CONV_TIGHT_W: 1.6,
  CONV_NEAR_LEADER_W: 1.3,
  CONV_NEAR_LEADER_R: 12,
  CONV_SHARE: 0.62,
  CONV_RATE: 2.2,

  // ---- KUŞATMA ----
  SIEGE_EVERY: 3,
  SIEGE_CAND_R: 40,
  SIEGE_CAND_MIN: 24,
  SIEGE_RING_MAX: 35,
  SIEGE_RING_MIN_ABS: 4,
  SIEGE_RING_MIN_REL: 0.6,
  SIEGE_BINS: 36,
  SIEGE_BIN_MIN: 1,
  SIEGE_RING_BIRDS_MIN: 30,
  SIEGE_COVER_BINS: 30,
  SIEGE_INSIDE_FRAC: 0.7,
  SIEGE_HOLD_SEC: 0.5,
  SIEGE_CASCADE_SEC: 1.5,
  /** S-14: a successful KUŞATMA empties the attacker's breath (Sıkı locked until 25) + 6 s before its next siege */
  SIEGE_COOLDOWN_SEC: 6,

  // ---- elimination ----
  LONE_SEC: 5,
  LONE_GRACE_SEC: 1.0,
  CORE_R: 4,
  CORE_BIRDS: 8,
  CORE_LEADER_R: 3,

  // ---- hawk (§2 timing & fractions, §4.G targeting) ----
  HAWK_FIRST_SEC: 40,
  HAWK_EVERY_SEC: 30,
  HAWK_JITTER_SEC: 5,
  HAWK_WARN_SEC: 2.0,
  HAWK_SPEED: 34,
  HAWK_STRIKE_R: 1.5,
  HAWK_MAX_DIVE_SEC: 3.0,
  HAWK_FRAC_MIN: 0.06,
  HAWK_FRAC_MAX: 0.12,
  HAWK_TIGHT_MUL: 0.5,
  /** S-14: scattered birds land 40 m beyond the flock EDGE (r_f + 40 from the leader), away from the owner */
  HAWK_SCATTER_DIST: 40,
  HAWK_MIN_FOLLOWERS: 12,
  /** §4.G allows 1–3 hawks; ruling S-09 fixes ONE hawk per wave → extra hawks disabled (code path kept) */
  HAWK_2_AT: 1e9,
  HAWK_3_AT: 1e9,
  HAWK_STAGGER_TICKS: 24,

  // ---- wind gusts (§2) ----
  GUST_FIRST_MIN_SEC: 20,
  GUST_FIRST_MAX_SEC: 30,
  GUST_EVERY_MIN_SEC: 25,
  GUST_EVERY_MAX_SEC: 40,
  GUST_WARN_SEC: 2,
  GUST_DUR_SEC: 3,
  GUST_WIDTH: 120,
  GUST_SPEED: 6,
  ROCK_SHADOW_LEN: 28,

  // ---- storm (§2 rules + §4.G algorithm) ----
  STORM_SPAWN_SEC: 60,
  STORM_RADIUS: 45,
  STORM_SPEED: 3,
  STORM_SCATTER_PER_SEC: 0.04,
  STORM_SEP_MUL: 3,
  STORM_NUDGE: 6,

  // ---- sunset ring (§4.G radius 300 → 110 m, last 45 s; §2 drift 3 %/s) ----
  RING_START_SEC: 135,
  RING_R0: 300,
  RING_R1: 110,
  NIGHT_DRIFT_PER_SEC: 0.03,
  RING_PUSH: 0.9,

  // ---- obstacles ----
  LIGHTHOUSE_R: 9,

  // ---- league points (§2) ----
  LP_TABLE: [30, 22, 16, 12, 6, 4, 3, 2, 0, -1, -2, -4, -6, -7, -8, -10],
  LP_SIEGE: 3,
  LP_SIEGE_CAP: 9,
  LEAGUE_SIZE: 300,

  /** Hash every N ticks (determinism tests). */
  HASH_EVERY: 30,
} as const;

export type SuruConfig = typeof SURU;
