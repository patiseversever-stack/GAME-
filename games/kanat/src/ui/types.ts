// UI contracts: screen ids, view-models (props) and the callbacks the integrator implements.
// View-models carry ids + numbers only; every visible string is resolved inside the UI via i18n.
import type { WorldId } from '../sim/types.ts';
import type { QualityTier, Settings } from '../core/settings.ts';
import type { BadgeId, PhotoFilter } from './content.ts';
import type { ProxTier } from './theme.ts';
import type { RouteBenchmarks } from '../content/meta/types.ts';
import type { WeeklyModifierId } from '../content/meta/progression.ts';

export type ScreenId =
  | 'loading' | 'menu' | 'worlds' | 'routes' | 'modes' | 'daily' | 'duel' | 'suru' | 'pause' | 'results'
  | 'settings' | 'collection' | 'photo' | 'unlock' | 'help' | 'inverted' | 'assistOff' | 'resume' | 'flight'
  | 'levelUp' | 'weekly' | 'suruResults';

export type GameMode = 'career' | 'daily' | 'duel' | 'free' | 'weekly' | 'practice';
/** Modes that get an unlock card / "YENİ" badge (meta MetaMode minus career). */
export type UnlockMode = 'daily' | 'suru' | 'duel' | 'free' | 'weekly';
/** SÜRÜ.io sub-modes — ids identical to meta SuruSubMode ('daily' = Sürü Günü). */
export type SuruSub = 'league' | 'daily' | 'practice';

export interface LoadingProps {
  progress: number; // 0..1
  world?: WorldId;
  /** Optional panorama/backdrop image (object URL or data URL). Painted world art is used otherwise. */
  panoramaUrl?: string;
  tip?: number; // tip index; rotates automatically when omitted
}

export interface MenuProps {
  /** Last played career route; undefined = brand-new player (shows "İlk uçuş"). */
  continueRoute?: { routeId: string; stars: number };
  daily: { n: number; world: WorldId; bestSec?: number; stars?: number; unlocked: boolean; lockRoute?: number };
  rank: { level: number; xp: number; xpNext: number };
  suru: { unlocked: boolean; league: number; lp: number; lockRoute?: number };
  modes: { duel: boolean; free: boolean };
  collection: { postcards: number; badges: number };
  /** Modes unlocked since the player last saw the menu → "YENİ" badge on the matching card. */
  newModes?: UnlockMode[];
  /** World whose accent tints the menu (the live scene behind follows the last-played world). */
  world?: WorldId;
}

export interface WorldCardVM {
  id: WorldId;
  stars: number; // 0..12
  unlocked: boolean;
  unlockAt: number; // star threshold
  previewUrl?: string; // render-to-texture preview (optional)
  geo?: { lat: number; lon: number };
}
export interface WorldsProps { totalStars: number; worlds: WorldCardVM[]; focus?: WorldId }

export interface UstaTaskVM {
  /** Meta task id (e.g. "w1r2-u3"): when it resolves in src/content/meta the label comes from ustaI18n(). */
  id: string;
  type: string;
  count?: number;
  value?: number;
  done: boolean;
  /** Kılavuz benchmarks of the route → exact thresholds (1:18.4, 41.275) instead of relative wording. */
  bench?: RouteBenchmarks;
  /** Pre-resolved ustaI18n() output (optional; overrides the lookup). */
  key?: string;
  params?: Record<string, number>;
  unassisted?: boolean;
}
export interface RouteVM {
  id: string; // w1r1…
  difficulty: number;
  stars: number;
  bestScore?: number;
  bestTimeSec?: number;
  tasks: UstaTaskVM[];
  locked?: boolean;
  startType?: 'balon' | 'ucurum' | 'sirt';
  /** Top-down ideal line [x, z] (metres) for the mini-map; optional. */
  line?: [number, number][];
  slow?: boolean; // last best set with Slow Mode (shows the turtle mark)
  /** Best score/time was set with a physics-changing assist (🛟 mark — shown as the lifebuoy icon). */
  bestAssisted?: boolean;
  /** Cosmetic the route's Usta tasks unlock ("Kilim 2/3"); ref = meta CosmeticRef ("pattern:kilim"). */
  reward?: { ref: string; done: number; total: number };
  /** Ghost choice for the next flight (Yok / En iyim / Kılavuz). */
  ghost?: 'none' | 'best' | 'guide';
}
export interface RoutesProps { world: WorldId; stars: number; routes: RouteVM[]; selected?: string }

export interface LockVM { unlocked: boolean; lockRoute?: number }
export interface ModesProps {
  careerStars: number;
  daily: LockVM & { n: number };
  duel: LockVM;
  free: LockVM & { worlds?: WorldId[] };
  suru: LockVM & { league: number; lp: number; dayN: number };
  weekly?: LockVM;
}

export interface DailyProps {
  n: number;
  world: WorldId;
  date: { y: number; m: number; d: number };
  difficulty: number;
  gates: number;
  bestSec?: number;
  stars?: number;
  strip?: ProxTier[];
  attempts: number;
  botSec?: number;
  assisted?: boolean;
  slow?: boolean;
}

export interface GhostVM {
  name: string;
  route: { kind: 'daily'; n: number } | { kind: 'career'; routeId: string };
  metric: { kind: 'time'; sec: number } | { kind: 'score'; value: number };
  /** Ghost's world is still locked for this player: one-time play (§2.5 Mod 3). */
  oneTime?: boolean;
}
export type DuelError = 'invalid' | 'version' | 'empty' | 'clipboard';
export type DuelLookup = { ok: true; ghost: GhostVM } | { ok: false; error: 'invalid' | 'version' };
export interface DuelProps {
  code?: string;
  ghost?: GhostVM;
  error?: DuelError;
  verifying?: boolean;
  /** Deep link: validate `code` immediately on open. */
  autoSubmit?: boolean;
}

export interface SuruProps { league: number; lp: number; dayN: number; dayBestPlace?: number; dayFlocks?: number }

export interface PauseProps {
  mode: GameMode;
  photoAllowed: boolean;
  routeId?: string;
  dailyN?: number;
  world?: WorldId;
  timeSec?: number;
  score?: number;
}

export type ResultRowKind = 'proximity' | 'grazes' | 'gates' | 'balloon' | 'thermal' | 'landing' | 'soft' | 'bold' | 'missed' | 'flight';
export interface ResultsXpVM {
  gained: number;
  /** Level before the flight and progress fractions inside it (0..1); toFrac 1 + levelUp → the card follows. */
  level: number;
  fromFrac: number;
  toFrac: number;
  levelUp?: boolean;
}
export type ShareKind = 'clip' | 'card' | 'text';

export interface ResultRowVM { kind: ResultRowKind; value: number; n?: number; a?: number; b?: number; m?: number }

export interface ResultsProps {
  mode: GameMode;
  half: boolean;
  world: WorldId;
  routeId?: string;
  dailyN?: number;
  score: number;
  timeSec: number;
  stars: number;
  prevStars?: number;
  rows: ResultRowVM[];
  strip?: ProxTier[];
  /** Personal-best delta: points for career (positive = better), seconds for daily (negative = better). */
  pbDelta?: number;
  newBest?: boolean;
  ghostDelta?: number; // seconds vs ghost, negative = ahead
  duel?: { won: boolean | null; deltaSec: number; opponent: string };
  hasNext: boolean;
  assisted?: boolean;
  slow?: boolean;
  /** Usta tasks completed in this flight (highlighted). */
  tasksDone?: UstaTaskVM[];
  /** Usta progress on this route after the flight ("Usta 2/3"). */
  ustaProgress?: { done: number; total: number };
  xp?: ResultsXpVM;
  /** Stars still missing for the next world lock ("Likya'ya 3 ⭐"); from meta nextWorldLock(). */
  nextWorld?: { world: WorldId; missing: number };
  /** Cosmetic unlocked by this flight (reward chip + "Giy"). ref = meta CosmeticRef. */
  reward?: { ref: string };
  /** Share options offered (Klip only where captureStream + MediaRecorder exist). Default ['card', 'text']. */
  shareKinds?: ShareKind[];
  /** FTUE compact results card (§7): stars, Usta n/3, first cosmetic + Giy, single Devam. */
  compact?: boolean;
}

export interface SettingsProps {
  settings: Settings;
  /** Tier currently chosen by the PerformanceDirector (shown as "Otomatik (şu an: X)"). */
  currentTier: QualityTier;
  /** Device can run Ultra 120 Hz (Xiaomi 13 class); the toggle is hidden otherwise. */
  ultraCapable: boolean;
  version: string;
  /** Credits / data attribution text (multi-line, rendered verbatim). */
  credits: string;
  /** Opened from pause: language and graphics still apply live. */
  inFlight?: boolean;
}

export type CosmeticKind = 'pattern' | 'palette' | 'trail' | 'canopy' | 'cardFrame';
export interface CosmeticSourceVM {
  kind: 'start' | 'usta' | 'rank' | 'postcards' | 'weekly' | 'log' | 'postcardCount' | 'suru' | 'worldComplete';
  routeId?: string;
  n?: number;
  world?: WorldId;
  league?: number;
}
export interface CosmeticVM { id: string; unlocked: boolean; source?: CosmeticSourceVM }
export interface PostcardVM { id: string; world: WorldId; got: boolean; imageUrl?: string; date?: { y: number; m: number; d: number } }
export interface CollectionProps {
  tab?: 'postcards' | 'wardrobe' | 'badges';
  wardrobeTab?: CosmeticKind;
  postcards: PostcardVM[];
  patterns: CosmeticVM[];
  palettes: CosmeticVM[];
  trails: CosmeticVM[];
  canopies?: CosmeticVM[];
  frames?: CosmeticVM[];
  equipped: { pattern: string; palette: string; trail: string; canopy?: string; cardFrame?: string };
  badges: { id: BadgeId; got: boolean }[];
}

export interface PhotoParams {
  fov: number; // 20..90 deg
  roll: number; // -15..15 deg
  exposure: number; // -2..2 EV
  focus: number; // 0..1 (near → far)
  aperture: number; // 0..1 (f/16 → f/1.4)
  filter: PhotoFilter;
  grain: number; // 0..1
  frame: boolean;
  logo: boolean;
}
export interface PhotoProps {
  params: PhotoParams;
  /** Postcard currently framed and valid (§2.5); shows the Playfair frame caption. */
  postcard?: { id: string; world: WorldId; captured?: boolean };
  date?: { y: number; m: number; d: number };
  world?: WorldId;
  /** Filters still locked, with the postcard count that unlocks them (meta PHOTO_FILTER_UNLOCKS). */
  lockedFilters?: { id: PhotoFilter; postcards: number }[];
}

export type UiSoundEvent =
  | { type: 'uiTap' | 'uiSwish' | 'uiConfirm' | 'uiBack' | 'uiToggle' | 'tallyEnd' | 'reward' | 'photo' }
  | { type: 'tally'; i: number }
  | { type: 'star'; index: number };
/** Short cue names used inside screens (mapped to UiSoundEvent by the controller). */
export type UiCue = 'tap' | 'open' | 'confirm' | 'back' | 'toggle' | 'tally' | 'tallyEnd' | 'star' | 'reward' | 'photo';

export interface UnlockProps {
  kind: UnlockMode | 'world';
  world?: WorldId;
  /** Several modes unlocked at once (meta unlockCardModes): one card, one line each, single OK. */
  modes?: UnlockMode[];
}

export type LevelRewardVM = { kind: 'title'; title: string } | { kind: 'cosmetic'; ref: string };
export interface LevelUpProps { level: number; rewards: LevelRewardVM[] }

export interface WeeklyProps {
  weekIndex: number;
  routeId: string;
  modifier: WeeklyModifierId;
  daysLeft: number;
  attempts: number;
  bestScore?: number;
  stars?: number;
  /** This week's trail tint (meta WEEKLY_TINTS) and whether the one-time Kırlangıç trail is already owned. */
  tint: { id: string; color: string; name: { tr: string; en: string } };
  swallowOwned: boolean;
  rewardEarned?: boolean;
}

export interface SuruResultsProps {
  sub: SuruSub;
  dayN?: number;
  place: number;
  flocks: number;
  peak: number;
  converted: number;
  wild: number;
  sieges: number;
  survivalSec: number;
  survived: boolean;
  lpDelta?: number; // league match only
  league: number;
  lp: number;
  leagueUp?: boolean;
  /** Placement vs AI average in percent (+18 = better than average). */
  aiPct?: number;
  /** Elmas: average placement over the last 20 rounds (skillIndex). */
  avgPlace20?: number;
  xpGained?: number;
  canWatch?: boolean;
}
export interface ToastOpts { id?: string; action?: string; ms?: number; icon?: string }

/**
 * Everything the UI asks of the game. All members optional so the gallery and partial integrations work;
 * a missing data provider simply keeps the player on the current screen.
 */
export interface UICallbacks {
  // ---- data providers (called when the player navigates) ----
  getMenu?(): MenuProps;
  getWorlds?(): WorldsProps;
  getRoutes?(world: WorldId): RoutesProps;
  getModes?(): ModesProps;
  getDaily?(): DailyProps;
  getSuru?(): SuruProps;
  getCollection?(): CollectionProps;
  getSettings?(): SettingsProps;

  // ---- menu / mode actions ----
  onContinue?(): void;
  onPlayRoute?(routeId: string): void;
  onPlayDaily?(): void;
  onShareDaily?(): void;
  /** Validate a pasted/deep-linked duel code (crc → SIM_VERSION → replay). */
  onDuelSubmit?(code: string): Promise<DuelLookup>;
  onDuelStart?(code: string): void;
  onFreeFlight?(world: WorldId): void;
  onSuru?(sub: SuruSub): void;
  getWeekly?(): WeeklyProps;
  onPlayWeekly?(): void;
  /** Ghost choice on a route card (Yok / En iyim / Kılavuz). */
  onGhostChoice?(routeId: string, choice: 'none' | 'best' | 'guide'): void;
  /** Optional real world image (render-to-texture / pre-rendered thumbnail) for a world card; return a cleanup fn. */
  mountWorldPreview?(el: HTMLElement, world: WorldId): void | (() => void);
  onRankTap?(): void;

  // ---- flight / pause ----
  onPause?(): void;
  onResume?(): void;
  onRestart?(): void;
  onPhotoMode?(): void;
  onQuitToMenu?(): void;
  /** Leave the game (bridge `exit`). */
  onExit?(): void;
  onParachute?(): void;

  // ---- results ----
  onResultsRetry?(): void;
  /** Share choice from the results sheet (Klip / Kart / Metin). */
  onResultsShare?(kind?: ShareKind): void;
  /** FTUE compact results card: single Devam. */
  onResultsContinue?(): void;
  onLevelUpDone?(): void;
  // ---- SÜRÜ.io results ----
  onSuruAgain?(): void;
  onSuruWatch?(): void;
  onSuruShare?(): void;
  onResultsDuelCode?(): void;
  onResultsNext?(): void;
  onRematchCode?(): void;

  // ---- settings / collection / photo ----
  /** Full new settings object after every change; `path` names the changed field (e.g. 'kanat.sensitivity'). */
  onSettingsChange?(next: Settings, path: string): void;
  openPerfPanel?(): void;
  onEquip?(kind: CosmeticKind, id: string): void;
  onPhotoChange?(params: PhotoParams): void;
  onPhotoSave?(): void;
  onPhotoExit?(): void;

  // ---- one-tap cards ----
  onHelpChoice?(choice: 'assist' | 'line' | 'practice' | 'none'): void;
  /** Accessibility: apply the "Sakin kontrol" preset (CALM_CONTROLS). */
  onCalmControls?(): void;
  onInvertedAnswer?(flip: boolean): void;
  onAssistOffAnswer?(turnOff: boolean): void;
  onUnlockSeen?(kind: UnlockProps['kind'], world?: WorldId): void;
  onResumeTap?(): void;
  onToastAction?(id: string): void;

  // ---- platform hooks ----
  /** Bridge-aware clipboard read (falls back to navigator.clipboard). */
  readClipboard?(): Promise<string>;
  /** UI sound event — shaped for `audio.event(e)` (uiTap, uiSwish, uiConfirm, uiBack, uiToggle, tally{i}, tallyEnd, star{index}, reward, photo). */
  onSound?(e: UiSoundEvent): void;
  onHaptic?(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void;
  /**
   * Settings "Sürüm" label element. When provided the integrator wires the hidden perf panel
   * (e.g. `return attachVersionTapTrigger(el)`); otherwise the UI counts 5 taps and calls openPerfPanel().
   */
  onVersionLabel?(el: HTMLElement): void | (() => void);
  /** Optional 3D relief mini-map; return a cleanup fn. When absent the UI draws an SVG top-down map. */
  mountMiniMap?(el: HTMLElement, world: WorldId, selectedRoute: string | undefined): void | (() => void);
  /** Optional live pilot preview in the wardrobe; return a cleanup fn. */
  mountPilotPreview?(el: HTMLElement, equipped: CollectionProps['equipped']): void | (() => void);
}
