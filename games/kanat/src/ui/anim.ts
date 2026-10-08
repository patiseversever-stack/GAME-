// Small animation helpers for menus (count-up numbers, staged reveals). Respect reduce-motion.
import { ROOT_CLASS } from './theme.ts';

export function reducedMotion(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.classList.contains(ROOT_CLASS.rm)) return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const easeOutCubic = (x: number): number => 1 - (1 - x) * (1 - x) * (1 - x);

/**
 * Counts a number up inside `el`. `fmt` formats the value (locale-aware). Returns a cancel function.
 * With reduce-motion the final value is written immediately.
 */
export function countUp(el: HTMLElement, to: number, fmt: (v: number) => string, opts: { from?: number; ms?: number; delay?: number; onDone?: () => void } = {}): () => void {
  const from = opts.from ?? 0;
  const ms = opts.ms ?? 900;
  if (reducedMotion() || ms <= 0 || from === to) {
    el.textContent = fmt(to);
    opts.onDone?.();
    return () => {};
  }
  el.textContent = fmt(from);
  let raf = 0;
  let start = -1;
  let timer = 0;
  const tick = (now: number): void => {
    if (start < 0) start = now;
    const k = Math.min(1, (now - start) / ms);
    el.textContent = fmt(from + (to - from) * easeOutCubic(k));
    if (k < 1) raf = requestAnimationFrame(tick);
    else opts.onDone?.();
  };
  timer = window.setTimeout(() => {
    raf = requestAnimationFrame(tick);
  }, opts.delay ?? 0);
  return () => {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
  };
}

/** Schedules callbacks with a delay; returns a cancel-all function. */
export function sequence(steps: { at: number; run: () => void }[]): () => void {
  const ids = steps.map((s) => window.setTimeout(s.run, reducedMotion() ? 0 : s.at));
  return () => ids.forEach((id) => clearTimeout(id));
}
