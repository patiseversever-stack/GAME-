// UI controller: mounts the DOM layer over the three.js canvas, owns the screen stack and the flight HUD.
//   UI.mount(root, callbacks) · UI.show(screen, props) · UI.back() · UI.hud.update(state)
// Layer stack: a root screen (loading | menu | results | flight) plus pushed pages/overlays/cards.
// Android back (bridge `back`) → UI.back(): closes the top layer; returns false when nothing is left to close.
import './styles.css';
import './screens.css';
import './hud/hud.css';
import type { Settings } from '../core/settings.ts';
import { getLang, onLangChange, setLang, type Lang } from './i18n.ts';
import { applyRootFlags, setSafeArea as applySafeArea, type SafeArea } from './theme.ts';
import { loadFonts } from './fonts.ts';
import { h } from './dom.ts';
import type { ScreenId, ToastOpts, UICallbacks } from './types.ts';
import type { ScreenCtx, ScreenDef } from './screens/screen.ts';
import { FlightHud } from './hud/FlightHud.ts';
import { SCREENS } from './screens/index.ts';
import { iconSvg } from './icons.ts';

interface Entry {
  id: ScreenId;
  props: unknown;
  el: HTMLElement;
  cleanups: (() => void)[];
}

export class UIController {
  root: HTMLElement | null = null;
  hud!: FlightHud;
  private cb: UICallbacks = {};
  private screensLayer!: HTMLElement;
  private hudLayer!: HTMLElement;
  private toastLayer!: HTMLElement;
  private stack: Entry[] = [];
  private unsubLang: (() => void) | null = null;
  private toastTimer = 0;
  private settings: Settings | null = null;
  /** Resolves when the UI fonts are registered (show the first screen after this to avoid fallback flashes). */
  fontsReady: Promise<void> = Promise.resolve();

  /** Mounts the UI into `root` (usually a full-viewport element above the canvas). */
  mount(root: HTMLElement, callbacks: UICallbacks = {}, opts: { settings?: Settings; safeArea?: Partial<SafeArea> } = {}): void {
    this.destroy();
    this.cb = callbacks;
    const ui = h('div', { class: 'kn-ui', 'data-kanat-ui': '' });
    this.hudLayer = h('div', { class: 'kn-layer kn-hud-layer' });
    this.screensLayer = h('div', { class: 'kn-layer kn-screens' });
    this.toastLayer = h('div', { class: 'kn-layer kn-toasts', 'aria-live': 'polite' });
    ui.append(this.hudLayer, this.screensLayer, this.toastLayer);
    root.appendChild(ui);
    this.root = ui;
    this.hud = new FlightHud(this.hudLayer, {
      onPause: () => {
        this.sound('tap');
        this.cb.onPause?.();
      },
      onParachute: () => this.cb.onParachute?.(),
    });
    this.hud.setVisible(false);
    if (opts.settings) this.setSettings(opts.settings);
    if (opts.safeArea) this.setSafeArea(opts.safeArea);
    this.unsubLang = onLangChange(() => this.refreshAll());
    this.fontsReady = loadFonts();
  }

  destroy(): void {
    for (const e of this.stack) this.disposeEntry(e);
    this.stack = [];
    this.unsubLang?.();
    this.unsubLang = null;
    this.hud?.destroy();
    this.root?.remove();
    this.root = null;
  }

  // ------------------------------------------------------------------ settings / platform
  /** Apply persisted settings: language, left-hand mirroring, big HUD, colour-blind, reduce motion. */
  setSettings(s: Settings): void {
    this.settings = s;
    applyRootFlags({ leftHanded: s.leftHanded, bigHud: s.kanat.bigHud, colorBlind: s.kanat.colorBlind, reduceMotion: s.reduceMotion, lang: s.lang });
    this.hud?.configure({ colorBlind: s.kanat.colorBlind, leftHanded: s.leftHanded, bigHud: s.kanat.bigHud });
    if (s.lang !== getLang()) setLang(s.lang);
  }

  setLang(lang: Lang): void {
    setLang(lang);
    document.documentElement.setAttribute('lang', lang);
  }

  /** Host `setSafeArea` insets (CSS px). CSS also honours env(safe-area-inset-*). */
  setSafeArea(insets: Partial<SafeArea>): void {
    applySafeArea(insets);
  }

  // ------------------------------------------------------------------ navigation
  show(screen: ScreenId, props: unknown = {}): void {
    if (!this.root) return;
    const def = SCREENS[screen] as ScreenDef<unknown>;
    if (!def) return;
    const existing = this.stack.findIndex((e) => e.id === screen);
    if (def.layer === 'root') {
      for (const e of this.stack) this.removeEntry(e, true);
      this.stack = [];
    } else if (existing >= 0) {
      // Re-showing an open screen: drop it and everything above it, then push fresh.
      for (const e of this.stack.splice(existing)) this.removeEntry(e, false);
    }
    const entry = this.build(screen, props, false);
    this.stack.push(entry);
    this.screensLayer.appendChild(entry.el);
    this.syncHud();
  }

  /** Re-render an open screen with new props (no entry animation). No-op if not open. */
  update(screen: ScreenId, props: unknown): void {
    const idx = this.stack.findIndex((e) => e.id === screen);
    if (idx < 0) return;
    this.replaceEntry(idx, props);
  }

  /** Close a specific layer (no-op if not open). */
  close(screen: ScreenId): void {
    const idx = this.stack.findIndex((e) => e.id === screen);
    if (idx < 0) return;
    const [e] = this.stack.splice(idx, 1);
    this.removeEntry(e, false);
    this.syncHud();
  }

  /**
   * Android back / Escape. Closes the top layer (calling its onBack, e.g. pause → onResume).
   * In flight with nothing open it opens pause (onPause). Results → menu. Returns false when there is nothing
   * to close (menu/loading root) so the host can `exit`.
   */
  back(): boolean {
    const top = this.stack[this.stack.length - 1];
    if (!top) return false;
    const def = SCREENS[top.id] as ScreenDef<unknown>;
    if (def.layer === 'root') {
      if (top.id === 'flight') {
        this.cb.onPause?.();
        return true;
      }
      if (top.id === 'results') {
        this.sound('back');
        this.cb.onQuitToMenu?.();
        return true;
      }
      return false;
    }
    this.sound('back');
    this.stack.pop();
    this.removeEntry(top, false);
    def.onBack?.(top.props, this.ctxFor(top));
    this.syncHud();
    return true;
  }

  top(): ScreenId | null {
    return this.stack.length ? this.stack[this.stack.length - 1].id : null;
  }
  isOpen(screen: ScreenId): boolean {
    return this.stack.some((e) => e.id === screen);
  }

  /** Loading progress without re-rendering (0..1). */
  setLoadingProgress(p: number): void {
    const e = this.stack.find((x) => x.id === 'loading');
    if (!e) return;
    const v = Math.max(0, Math.min(1, p));
    e.el.style.setProperty('--kn-progress', String(v));
    const pct = e.el.querySelector('[data-pct]');
    if (pct) pct.textContent = `${Math.round(v * 100)}`;
  }

  /** Short message at the top (e.g. "Akıcılık için Orta önerilir"). `opts.action` adds a button → onToastAction(id). */
  toast(text: string, opts: ToastOpts = {}): void {
    if (!this.root) return;
    this.toastLayer.textContent = '';
    const t = h('div', { class: 'kn-toast kn-panel', role: 'status' });
    if (opts.icon) t.insertAdjacentHTML('beforeend', iconSvg(opts.icon));
    t.appendChild(h('span', { class: 'kn-toast-text', text }));
    if (opts.action && opts.id) {
      const id = opts.id;
      const b = h('button', { class: 'kn-toast-action', type: 'button', text: opts.action });
      b.addEventListener('click', () => {
        this.cb.onToastAction?.(id);
        t.classList.add('is-out');
      });
      t.appendChild(b);
    }
    this.toastLayer.appendChild(t);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      t.classList.add('is-out');
      window.setTimeout(() => t.remove(), 300);
    }, opts.ms ?? 3600);
  }

  // ------------------------------------------------------------------ internals
  private sound(cue: 'tap' | 'back' | 'open' | 'star' | 'tick' | 'toggle'): void {
    this.cb.onUiSound?.(cue);
  }

  private ctxFor(entry: Entry): ScreenCtx {
    return {
      cb: this.cb,
      show: (s, p) => this.show(s, p),
      back: () => this.back(),
      close: (s) => this.close(s),
      rerender: (p) => {
        const idx = this.stack.indexOf(entry);
        if (idx >= 0) this.replaceEntry(idx, p);
      },
      toast: (text, o) => this.toast(text, o),
      sound: (c) => this.sound(c),
      applySettings: (s) => this.setSettings(s),
      onCleanup: (fn) => entry.cleanups.push(fn),
      refresh: false,
    };
  }

  private build(id: ScreenId, props: unknown, refresh: boolean): Entry {
    const def = SCREENS[id] as ScreenDef<unknown>;
    const entry: Entry = { id, props, el: document.createElement('div'), cleanups: [] };
    const ctx = this.ctxFor(entry);
    ctx.refresh = refresh;
    const el = def.render(props, ctx);
    el.classList.add('kn-screen', `kn-screen--${id}`, `kn-layer-${def.layer}`);
    el.dataset.screen = id;
    if (refresh) el.classList.add('kn-noanim');
    entry.el = el;
    return entry;
  }

  private replaceEntry(idx: number, props: unknown): void {
    const old = this.stack[idx];
    const scrollers = Array.from(old.el.querySelectorAll<HTMLElement>('.kn-scroll, .kn-hscroll')).map((s) => [s.scrollTop, s.scrollLeft]);
    this.disposeEntry(old);
    const next = this.build(old.id, props, true);
    old.el.replaceWith(next.el);
    this.stack[idx] = next;
    const newScrollers = next.el.querySelectorAll<HTMLElement>('.kn-scroll, .kn-hscroll');
    newScrollers.forEach((s, i) => {
      const v = scrollers[i];
      if (v) {
        s.scrollTop = v[0];
        s.scrollLeft = v[1];
      }
    });
  }

  private refreshAll(): void {
    for (let i = 0; i < this.stack.length; i++) this.replaceEntry(i, this.stack[i].props);
    this.hud?.refreshLabels();
  }

  private disposeEntry(e: Entry): void {
    for (const fn of e.cleanups) {
      try {
        fn();
      } catch (err) {
        console.warn('[ui] cleanup failed', err);
      }
    }
    e.cleanups = [];
  }

  private removeEntry(e: Entry, instant: boolean): void {
    this.disposeEntry(e);
    if (instant) {
      e.el.remove();
      return;
    }
    e.el.classList.add('is-leaving');
    e.el.style.pointerEvents = 'none';
    window.setTimeout(() => e.el.remove(), 200);
  }

  private syncHud(): void {
    // Screens fully covered by a page above them are hidden (no stacked blur cost, no bleed-through).
    let covered = false;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const e = this.stack[i];
      e.el.classList.toggle('is-covered', covered);
      const layer = (SCREENS[e.id] as ScreenDef<unknown>).layer;
      if (layer === 'page') covered = true;
    }
    if (!this.hud) return;
    const root = this.stack[0];
    const top = this.stack[this.stack.length - 1];
    const inFlight = root?.id === 'flight';
    const topDef = top ? (SCREENS[top.id] as ScreenDef<unknown>) : null;
    const visible = inFlight && (top === root || topDef?.layer === 'card');
    this.hud.setVisible(visible);
  }
}

/** Singleton used by the game (`import { UI } from './ui/UI.ts'`). */
export const UI = new UIController();
