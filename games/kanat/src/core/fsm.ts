// Application state machine (§4.3): Boot → Loading → Menu → Mode → Game → Result.
// pause / resume / contextlost / visibility are orthogonal flags handled identically in EVERY state:
//   - hidden, host pause, context loss  → "suspended": rAF, sim and audio stop.
//   - user pause                        → sim stops, rendering continues (pause menu over the scene).
//   - leaving suspension while in `game` → "Devam" overlay (resumePrompt); the sim stays held until
//     confirmResume() so the player never dies while the app was in the background (§5.4).

import { EventBus } from './events.ts';
import type { Lang, QualitySetting, Settings } from './settings.ts';

export type AppState = 'boot' | 'loading' | 'menu' | 'mode' | 'game' | 'result';
export const APP_STATES: readonly AppState[] = ['boot', 'loading', 'menu', 'mode', 'game', 'result'];

/** Allowed transitions. `game → game` is a restart (crash → retry < 1 s). */
export const APP_TRANSITIONS: Readonly<Record<AppState, readonly AppState[]>> = {
  boot: ['loading'],
  loading: ['menu', 'mode', 'game'],
  menu: ['loading', 'mode', 'game'],
  mode: ['menu', 'loading', 'game'],
  game: ['result', 'menu', 'mode', 'loading', 'game'],
  result: ['game', 'menu', 'mode', 'loading'],
};

export type PauseReason = 'user' | 'host' | 'hidden' | 'contextlost';
const SUSPEND_REASONS: readonly PauseReason[] = ['host', 'hidden', 'contextlost'];

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HostProfile {
  displayName?: string;
  avatarUrl?: string;
}

/** Every app-level event. Modes/UI/audio/render subscribe; nobody needs to poll. */
export interface AppEvents {
  state: { from: AppState; to: AppState; data: unknown };
  pause: { reason: PauseReason };
  resume: { reason: PauseReason };
  /** rAF + sim + audio must stop (hidden / host pause / context lost). */
  suspend: { reasons: PauseReason[] };
  /** All suspend reasons cleared. */
  unsuspend: Record<string, never>;
  /** Show (true) or hide (false) the "Devam" overlay. */
  resumePrompt: { show: boolean };
  visibility: { visible: boolean };
  contextlost: Record<string, never>;
  contextrestored: Record<string, never>;
  settings: { settings: Settings; changed: string[] };
  mute: { muted: boolean; hostMuted: boolean; effective: boolean };
  locale: { lang: Lang };
  quality: { quality: QualitySetting };
  safeArea: SafeArea;
  orientation: { portrait: boolean; width: number; height: number };
  hostProfile: HostProfile;
  /** Android back / Escape — consumed by the layer stack before reaching here. */
  back: Record<string, never>;
  error: { message: string; fatal: boolean };
}

export interface StateHandlers {
  enter?(data: unknown, from: AppState): void;
  exit?(to: AppState): void;
  pause?(reason: PauseReason): void;
  resume?(reason: PauseReason): void;
  contextLost?(): void;
  contextRestored?(): void;
  visibility?(visible: boolean): void;
}

export class AppFSM {
  readonly bus: EventBus<AppEvents>;
  private cur: AppState = 'boot';
  private readonly reasons = new Set<PauseReason>();
  private readonly handlers = new Map<AppState, Set<StateHandlers>>();
  private prompt = false;
  private visible = true;
  private ctxLost = false;
  /** Every transition, newest last (bounded) — debugging + e2e. */
  readonly history: { from: AppState; to: AppState; at: number }[] = [];
  private clock: () => number;

  constructor(bus?: EventBus<AppEvents>, clock: () => number = () => Date.now()) {
    this.bus = bus ?? new EventBus<AppEvents>();
    this.clock = clock;
  }

  get state(): AppState {
    return this.cur;
  }

  /** Register per-state handlers. Returns an unregister function. */
  handle(state: AppState, h: StateHandlers): () => void {
    let set = this.handlers.get(state);
    if (!set) {
      set = new Set();
      this.handlers.set(state, set);
    }
    set.add(h);
    return () => set.delete(h);
  }

  can(to: AppState): boolean {
    return APP_TRANSITIONS[this.cur].includes(to);
  }

  /** Transition. Invalid transitions are refused (returns false) and logged — never throw mid-frame. */
  go(to: AppState, data?: unknown): boolean {
    if (!this.can(to)) {
      console.warn(`[fsm] refused transition ${this.cur} → ${to}`);
      return false;
    }
    const from = this.cur;
    this.call(from, (h) => h.exit?.(to));
    this.cur = to;
    if (to !== 'game' && this.prompt) this.setPrompt(false);
    if (this.reasons.has('user') && to !== 'game') this.resume('user');
    this.history.push({ from, to, at: this.clock() });
    if (this.history.length > 64) this.history.shift();
    this.call(to, (h) => h.enter?.(data, from));
    this.bus.emit('state', { from, to, data });
    return true;
  }

  // ---- pause / resume ------------------------------------------------------------------------

  pause(reason: PauseReason): void {
    if (this.reasons.has(reason)) return;
    const wasSuspended = this.suspended;
    this.reasons.add(reason);
    this.call(this.cur, (h) => h.pause?.(reason));
    this.bus.emit('pause', { reason });
    if (!wasSuspended && this.suspended) this.bus.emit('suspend', { reasons: [...this.reasons] });
  }

  resume(reason: PauseReason): void {
    if (!this.reasons.has(reason)) return;
    const wasSuspended = this.suspended;
    this.reasons.delete(reason);
    this.call(this.cur, (h) => h.resume?.(reason));
    this.bus.emit('resume', { reason });
    if (wasSuspended && !this.suspended) {
      this.bus.emit('unsuspend', {});
      // Back from background / host pause / context loss in the middle of a flight → "Devam".
      if (this.cur === 'game' && !this.reasons.has('user')) this.setPrompt(true);
    }
  }

  isPausedBy(reason: PauseReason): boolean {
    return this.reasons.has(reason);
  }

  pauseReasons(): PauseReason[] {
    return [...this.reasons];
  }

  /** Any reason at all (including user pause). */
  get paused(): boolean {
    return this.reasons.size > 0;
  }

  /** rAF/audio must be stopped. */
  get suspended(): boolean {
    for (const r of SUSPEND_REASONS) if (this.reasons.has(r)) return true;
    return false;
  }

  /** True while the "Devam" overlay must be shown. */
  get resumePromptVisible(): boolean {
    return this.prompt;
  }

  /** Player tapped "Devam". */
  confirmResume(): void {
    if (this.prompt) this.setPrompt(false);
  }

  /** Request the "Devam" overlay explicitly (e.g. after a user pause menu is dismissed by the host). */
  requestResumePrompt(): void {
    if (this.cur === 'game') this.setPrompt(true);
  }

  /** Should the fixed-step sim advance right now? */
  get simRunning(): boolean {
    return this.cur === 'game' && this.reasons.size === 0 && !this.prompt;
  }

  /** Should frames be rendered right now? */
  get renderRunning(): boolean {
    return !this.suspended;
  }

  // ---- visibility / context ------------------------------------------------------------------

  setVisible(visible: boolean): void {
    if (visible === this.visible) return;
    this.visible = visible;
    this.call(this.cur, (h) => h.visibility?.(visible));
    this.bus.emit('visibility', { visible });
    if (visible) this.resume('hidden');
    else this.pause('hidden');
  }

  get isVisible(): boolean {
    return this.visible;
  }

  contextLost(): void {
    if (this.ctxLost) return;
    this.ctxLost = true;
    this.call(this.cur, (h) => h.contextLost?.());
    this.bus.emit('contextlost', {});
    this.pause('contextlost');
  }

  contextRestored(): void {
    if (!this.ctxLost) return;
    this.ctxLost = false;
    this.call(this.cur, (h) => h.contextRestored?.());
    this.bus.emit('contextrestored', {});
    this.resume('contextlost');
  }

  get isContextLost(): boolean {
    return this.ctxLost;
  }

  private setPrompt(show: boolean): void {
    this.prompt = show;
    this.bus.emit('resumePrompt', { show });
  }

  private call(state: AppState, fn: (h: StateHandlers) => void): void {
    const set = this.handlers.get(state);
    if (!set) return;
    for (const h of set) {
      try {
        fn(h);
      } catch (err) {
        console.error(`[fsm] handler for ${state} threw`, err);
      }
    }
  }
}
