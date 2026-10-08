// UI contracts: screen ids, view-models (props) and the callbacks the integrator implements.
// View-models carry ids + numbers only; every visible string is resolved inside the UI via i18n.
import type { WorldId } from '../sim/types.ts';
import type { QualityTier, Settings } from '../core/settings.ts';
import type { BadgeId, PhotoFilter } from './content.ts';
import type { ProxTier } from './theme.ts';

export type ScreenId =
  | 'loading' | 'menu' | 'worlds' | 'routes' | 'modes' | 'daily' | 'duel' | 'suru' | 'pause' | 'results'
  | 'settings' | 'collection' | 'photo' | 'unlock' | 'help' | 'inverted' | 'assistOff' | 'resume' | 'flight';

export type GameMode = 'career' | 'daily' | 'duel' | 'free';
export type SuruSub = 'league' | 'day' | 'practice';

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

export interface UstaTaskVM { id: string; type: string; count?: number; value?: number; done: boolean }
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
}
export interface RoutesProps { world: WorldId; stars: number; routes: RouteVM[]; selected?: string }

export interface LockVM { unlocked: boolean; lockRoute?: number }
export interface ModesProps {
  careerStars: number;
  daily: LockVM & { n: number };
  duel: LockVM;
  free: LockVM & { worlds?: WorldId[] };
  suru: LockVM & { league: number; lp: number; dayN: number };
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
export interface DuelProps { code?: string; ghost?: GhostVM; error?: DuelError; verifying?: boolean }

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

export type CosmeticKind = 'pattern' | 'palette' | 'trail';
export interface CosmeticSourceVM { kind: 'start' | 'usta' | 'rank' | 'postcards' | 'weekly' | 'log'; routeId?: string; n?: number; world?: WorldId }
export interface CosmeticVM { id: string; unlocked: boolean; source?: CosmeticSourceVM }
export interface PostcardVM { id: string; world: WorldId; got: boolean; imageUrl?: string; date?: { y: number; m: number; d: number } }
export interface CollectionProps {
  tab?: 'postcards' | 'wardrobe' | 'badges';
  wardrobeTab?: CosmeticKind;
  postcards: PostcardVM[];
  patterns: CosmeticVM[];
  palettes: CosmeticVM[];
  trails: CosmeticVM[];
  equipped: { pattern: string; palette: string; trail: string };
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
}

export interface UnlockProps { kind: 'daily' | 'suru' | 'duel' | 'free' | 'weekly' | 'world'; world?: WorldId }
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
  onResultsShare?(): void;
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
  onHelpChoice?(choice: 'assist' | 'line' | 'none'): void;
  onInvertedAnswer?(flip: boolean): void;
  onAssistOffAnswer?(turnOff: boolean): void;
  onUnlockSeen?(kind: UnlockProps['kind'], world?: WorldId): void;
  onResumeTap?(): void;
  onToastAction?(id: string): void;

  // ---- platform hooks ----
  /** Bridge-aware clipboard read (falls back to navigator.clipboard). */
  readClipboard?(): Promise<string>;
  /** UI sound cue (audio agent maps to procedural clicks). */
  onUiSound?(cue: 'tap' | 'back' | 'open' | 'star' | 'tick' | 'toggle'): void;
  onHaptic?(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void;
  /** Optional 3D relief mini-map; return a cleanup fn. When absent the UI draws an SVG top-down map. */
  mountMiniMap?(el: HTMLElement, world: WorldId, selectedRoute: string | undefined): void | (() => void);
  /** Optional live pilot preview in the wardrobe; return a cleanup fn. */
  mountPilotPreview?(el: HTMLElement, equipped: CollectionProps['equipped']): void | (() => void);
}
