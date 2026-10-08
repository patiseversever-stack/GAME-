// Minimal DOM builder for UI screens (no framework). Screens are rebuilt on navigation / language change;
// per-frame HUD code does NOT use this (it caches nodes and writes textContent/transform directly).
import { iconSvg } from './icons.ts';

export type Child = Node | string | number | null | undefined | false | Child[];
export interface Props {
  class?: string;
  style?: string;
  text?: string;
  html?: string;
  onClick?: (e: MouseEvent) => void;
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  [attr: string]: unknown;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.style.cssText = String(v);
      else if (k === 'text') el.textContent = String(v);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
    else el.appendChild(c);
  }
}

/** Inline SVG icon as an element (wrapped markup → node). */
export function ic(name: string, cls = 'kn-icon'): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = iconSvg(name, cls);
  return tpl.content.firstElementChild as Element;
}

/** Star row (filled stars for `got`, outlined for the rest). */
export function stars(got: number, max = 3, cls = 'kn-stars'): HTMLElement {
  const wrap = h('span', { class: cls, role: 'img', 'aria-label': `${got}/${max}` });
  for (let i = 0; i < max; i++) {
    const s = ic(i < got ? 'starFill' : 'star');
    if (i < got) s.classList.add('is-on');
    wrap.appendChild(s);
  }
  return wrap;
}

/** Proximity strip: 5 segments, tiers 0/1/2/3/5. */
export function strip(tiers: readonly number[], cls = 'kn-strip'): HTMLElement {
  const wrap = h('span', { class: cls, 'aria-hidden': 'true' });
  for (let i = 0; i < 5; i++) {
    const seg = h('i');
    seg.dataset.t = String(tiers[i] ?? 0);
    wrap.appendChild(seg);
  }
  return wrap;
}

/** Button with optional leading icon. */
export function button(label: string, onClick: () => void, opts: { cls?: string; icon?: string; disabled?: boolean; aria?: string } = {}): HTMLButtonElement {
  const b = h('button', { class: `kn-btn ${opts.cls ?? ''}`.trim(), type: 'button', 'aria-label': opts.aria, disabled: opts.disabled });
  if (opts.icon) b.appendChild(ic(opts.icon));
  if (label) b.appendChild(h('span', { class: 'kn-btn-label', text: label }));
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

export function iconButton(name: string, aria: string, onClick: () => void, cls = ''): HTMLButtonElement {
  return button('', onClick, { cls: `kn-btn--icon ${cls}`.trim(), icon: name, aria });
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
