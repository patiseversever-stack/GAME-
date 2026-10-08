// Screen module contract used by the UI controller.
import type { Settings } from '../../core/settings.ts';
import type { UICallbacks, ScreenId, ToastOpts, UiCue } from '../types.ts';

/** root: replaces the whole stack · page: full-screen push · overlay: full-screen layer over the game · card: small modal. */
export type LayerKind = 'root' | 'page' | 'overlay' | 'card';

export interface ScreenCtx {
  cb: UICallbacks;
  /** Navigation helpers (bound to the UI controller). */
  show(screen: ScreenId, props?: unknown): void;
  back(): boolean;
  close(screen: ScreenId): void;
  /** Re-render this screen with new props (keeps scroll position where possible). */
  rerender(props: unknown): void;
  toast(text: string, opts?: ToastOpts): void;
  /** UI sound cue; `n` = row index for 'tally', star index (0-based) for 'star'. */
  sound(cue: UiCue, n?: number): void;
  /** Apply settings to the UI immediately (language, mirroring, big HUD, colour-blind, reduce motion). */
  applySettings(s: Settings): void;
  /** Register a cleanup for timers / rAF / mounted hooks. */
  onCleanup(fn: () => void): void;
  /** True when this render is a language/props refresh (skip entry animations). */
  refresh: boolean;
}

export interface ScreenDef<P> {
  layer: LayerKind;
  render(props: P, ctx: ScreenCtx): HTMLElement;
  /** Called when back() closes this screen (e.g. pause → resume). */
  onBack?(props: P, ctx: ScreenCtx): void;
}
