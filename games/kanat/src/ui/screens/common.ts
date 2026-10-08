// Shared screen building blocks: page shell, headers, sections, world art, pips, map captions.
import type { WorldId } from '../../sim/types.ts';
import { h, ic, type Child } from '../dom.ts';
import { t, upper, fmtDec, tk } from '../i18n.ts';
import { worldArtSvg, type ArtOpts } from '../art.ts';
import { WORLD_ACCENT, WORLD_GEO } from '../theme.ts';
import type { ScreenCtx } from './screen.ts';
import type { UstaTaskVM } from '../types.ts';
import { taskText } from '../usta.ts';
import { cosmetic } from '../../content/meta/cosmetics.ts';
import { getLang } from '../i18n.ts';

export function accentStyle(world: WorldId | undefined): string {
  return world ? `--kn-accent:${WORLD_ACCENT[world]};` : '';
}

/** Eyebrow label (Barlow, tracked, Turkish-correct uppercase). */
export function eyebrow(text: string, cls = ''): HTMLElement {
  return h('div', { class: `kn-eyebrow ${cls}`.trim(), text: upper(text) });
}

export function backButton(ctx: ScreenCtx): HTMLButtonElement {
  const b = h('button', { class: 'kn-btn kn-btn--icon kn-btn--ghost kn-back', type: 'button', 'aria-label': t('common.back') });
  b.appendChild(ic('back'));
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    ctx.back();
  });
  return b;
}

export interface PageOpts {
  title: string;
  eyebrow?: string;
  right?: Child;
  body: Child;
  cls?: string;
  world?: WorldId;
  bodyCls?: string;
  footer?: Child;
  below?: Child; // under the header, outside the scroller (tabs)
}

/** Full-screen page: header (back + titles + right slot), scrolling body, optional fixed footer. */
export function page(ctx: ScreenCtx, o: PageOpts): HTMLElement {
  const head = h(
    'header',
    { class: 'kn-head' },
    backButton(ctx),
    h('div', { class: 'kn-head-titles' }, o.eyebrow ? eyebrow(o.eyebrow, 'kn-head-eyebrow') : null, h('h1', { class: 'kn-h1 kn-head-title kn-ellipsis', text: o.title })),
    o.right ? h('div', { class: 'kn-head-right' }, o.right) : null,
  );
  const el = h(
    'section',
    { class: `kn-page ${o.cls ?? ''}`.trim(), style: accentStyle(o.world), role: 'dialog', 'aria-label': o.title },
    h('div', { class: 'kn-page-bg' }),
    h('div', { class: 'kn-page-inner' }, head, o.below ?? null, h('div', { class: `kn-page-body kn-scroll ${o.bodyCls ?? ''}`.trim() }, o.body), o.footer ? h('footer', { class: 'kn-page-foot' }, o.footer) : null),
  );
  return el;
}

export function section(title: string | null, ...children: Child[]): HTMLElement {
  return h('div', { class: 'kn-section' }, title ? eyebrow(title, 'kn-section-title') : null, ...children);
}

/** Painted world art as a positioned layer (or a provided image). */
export function worldArt(world: WorldId, cls = 'kn-art', opts: ArtOpts & { url?: string } = {}): HTMLElement {
  const el = h('div', { class: cls, 'aria-hidden': 'true' });
  if (opts.url) {
    el.appendChild(h('img', { src: opts.url, alt: '', draggable: 'false' }));
  } else {
    el.innerHTML = worldArtSvg(world, opts);
  }
  return el;
}

/** 9-step difficulty gauge, altimeter tick style. */
export function difficultyPips(n: number): HTMLElement {
  const wrap = h('span', { class: 'kn-pips', role: 'img', 'aria-label': t('common.difficulty', { n }) });
  for (let i = 1; i <= 9; i++) wrap.appendChild(h('i', { class: i <= n ? 'is-on' : '' }));
  return wrap;
}

/** "38.64° K · 34.83° D" caption. */
export function geoCaption(world: WorldId, geo?: { lat: number; lon: number }): string {
  const g = geo ?? WORLD_GEO[world];
  return `${t('geo.lat', { v: fmtDec(g.lat, 2) })} · ${t('geo.lon', { v: fmtDec(g.lon, 2) })}`;
}

export function worldIndexLabel(world: WorldId): string {
  const idx = ['kapadokya', 'likya', 'karadeniz', 'erciyes', 'pamukkale'].indexOf(world) + 1;
  return t('worlds.index', { n: idx });
}

export function lockRow(text: string): HTMLElement {
  return h('div', { class: 'kn-lock' }, ic('lock'), h('span', { text }));
}

/** Locked-mode condition text (never "yakında"). */
export function lockText(lockRoute: number | undefined, stars?: number): string {
  if (stars !== undefined) return t('lock.stars', { n: stars });
  return t('lock.afterRoute', { n: lockRoute ?? 1 });
}

export function starCount(n: number, total: number): HTMLElement {
  return h('span', { class: 'kn-starcount kn-num' }, ic('starFill', 'kn-icon is-on'), h('span', { text: t('common.starsOf', { n, total }) }));
}

/** Usta task label (meta ustaI18n when the task id is known; exact thresholds when benchmarks are given). */
export function taskLabel(task: UstaTaskVM): string {
  return taskText(task);
}

/** Display name of a meta cosmetic ref ("pattern:kilim") in the current language. */
export function cosmeticName(ref: string): string {
  const def = cosmetic(ref as Parameters<typeof cosmetic>[0]);
  if (def) return def.name[getLang()];
  const [kind, id] = ref.split(':');
  return tk(`${kind}.${id}`, undefined, id);
}

/** "Desen", "Kanopi", … for a cosmetic ref or kind. */
export function cosmeticKindLabel(refOrKind: string): string {
  return tk(`kind.${refOrKind.split(':')[0]}`, undefined, '');
}

/** Tap target wrapper making a whole card a button. */
export function tappable(el: HTMLElement, onTap: () => void, ctx: ScreenCtx, label?: string): HTMLElement {
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  if (label) el.setAttribute('aria-label', label);
  el.classList.add('kn-tappable');
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    ctx.sound('tap');
    onTap();
  });
  return el;
}
