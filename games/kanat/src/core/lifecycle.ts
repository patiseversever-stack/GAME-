// DOM lifecycle wiring (§5.4, §7.3): visibility / pagehide / page freeze → FSM; orientation + resize →
// bus; first user gesture hook (audio unlock, iOS motion permission).

import type { AppFSM } from './fsm.ts';

export interface LifecycleOptions {
  win?: Window;
  doc?: Document;
  /** Flush pending saves (pagehide / hidden). */
  onFlush?: () => void;
}

export interface LifecycleHandle {
  detach(): void;
}

export function installLifecycle(fsm: AppFSM, opts: LifecycleOptions = {}): LifecycleHandle {
  const win = opts.win ?? window;
  const doc = opts.doc ?? document;
  const offs: (() => void)[] = [];
  const on = (t: EventTarget, type: string, fn: (e: Event) => void, o?: AddEventListenerOptions): void => {
    t.addEventListener(type, fn, o);
    offs.push(() => t.removeEventListener(type, fn, o));
  };

  const syncVisibility = (): void => {
    const visible = doc.visibilityState !== 'hidden';
    if (!visible) opts.onFlush?.();
    fsm.setVisible(visible);
  };
  on(doc, 'visibilitychange', syncVisibility);
  on(win, 'pagehide', () => {
    opts.onFlush?.();
    fsm.setVisible(false);
  });
  on(win, 'pageshow', () => {
    if (doc.visibilityState !== 'hidden') fsm.setVisible(true);
  });
  // Page Lifecycle API (Chrome / Android WebView): frozen tabs
  on(doc, 'freeze', () => {
    opts.onFlush?.();
    fsm.setVisible(false);
  });
  on(doc, 'resume', () => {
    if (doc.visibilityState !== 'hidden') fsm.setVisible(true);
  });

  // orientation / size
  let lastPortrait: boolean | null = null;
  let lastW = -1;
  let lastH = -1;
  let raf = 0;
  const emitSize = (): void => {
    raf = 0;
    const w = win.innerWidth;
    const h = win.innerHeight;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    const portrait = h >= w;
    fsm.bus.emit('orientation', { portrait, width: w, height: h });
    if (portrait !== lastPortrait) {
      lastPortrait = portrait;
      doc.documentElement.dataset.orientation = portrait ? 'portrait' : 'landscape';
    }
  };
  const schedule = (): void => {
    if (raf === 0) raf = win.requestAnimationFrame ? win.requestAnimationFrame(emitSize) : (setTimeout(emitSize, 16) as unknown as number);
  };
  on(win, 'resize', schedule);
  on(win, 'orientationchange', schedule);
  const sc = (win.screen as Screen | undefined)?.orientation;
  if (sc && typeof sc.addEventListener === 'function') on(sc, 'change', schedule);
  emitSize();

  syncVisibility();
  return {
    detach() {
      for (const f of offs.splice(0)) f();
    },
  };
}

/** Run `fn` once on the first user gesture (pointerdown / keydown / touchend, capture phase). */
export function onFirstGesture(fn: () => void, win: Window = window): () => void {
  let done = false;
  const types = ['pointerdown', 'keydown', 'touchend'];
  const handler = (): void => {
    if (done) return;
    done = true;
    for (const t of types) win.removeEventListener(t, handler, true);
    try {
      fn();
    } catch (err) {
      console.error('[lifecycle] first-gesture hook failed', err);
    }
  };
  for (const t of types) win.addEventListener(t, handler, true);
  return () => {
    done = true;
    for (const t of types) win.removeEventListener(t, handler, true);
  };
}

/** Host/env safe area → CSS variables (`--host-safe-*`); index.html combines them with env(). */
export function applySafeAreaCss(a: { top: number; right: number; bottom: number; left: number }, doc: Document = document): void {
  const s = doc.documentElement.style;
  s.setProperty('--host-safe-top', `${Math.max(0, a.top)}px`);
  s.setProperty('--host-safe-right', `${Math.max(0, a.right)}px`);
  s.setProperty('--host-safe-bottom', `${Math.max(0, a.bottom)}px`);
  s.setProperty('--host-safe-left', `${Math.max(0, a.left)}px`);
}
