// World select: horizontal snap carousel of big world cards (preview image hook or painted art),
// stars per world, lock thresholds 6/15/26/38 as star icon + number.
import { h, ic } from '../dom.ts';
import { t, tk } from '../i18n.ts';
import { MAX_STARS, STARS_PER_WORLD } from '../content.ts';
import type { WorldCardVM, WorldsProps } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { accentStyle, eyebrow, geoCaption, page, starCount, tappable, worldArt, worldIndexLabel } from './common.ts';

/** Real world image (previewUrl or the integrator's mountWorldPreview hook); painted art only as a loading placeholder. */
function worldArtWithHook(w: WorldCardVM, ctx: ScreenCtx): HTMLElement {
  const el = worldArt(w.id, 'kn-art kn-wcard-art', { url: w.previewUrl, w: 360, h: 480, id: 'wc' });
  if (!w.previewUrl && ctx.cb.mountWorldPreview) {
    const layer = h('div', { class: 'kn-art kn-wcard-real' });
    el.appendChild(layer);
    const c = ctx.cb.mountWorldPreview(layer, w.id);
    if (c) ctx.onCleanup(c);
  }
  return el;
}

function worldCard(w: WorldCardVM, total: number, ctx: ScreenCtx): HTMLElement {
  const locked = !w.unlocked;
  const card = h(
    'article',
    { class: `kn-wcard ${locked ? 'is-locked' : ''}`.trim(), style: accentStyle(w.id), 'data-world': w.id },
    worldArtWithHook(w, ctx),
    h('div', { class: 'kn-wcard-shade' }),
    h('div', { class: 'kn-wcard-top' }, eyebrow(worldIndexLabel(w.id)), h('span', { class: 'kn-wcard-geo kn-eyebrow', text: geoCaption(w.id, w.geo) })),
    locked
      ? h(
          'div',
          { class: 'kn-wcard-lock' },
          h('span', { class: 'kn-wcard-lockicon' }, ic('lock')),
          h('span', { class: 'kn-wcard-need kn-display kn-num' }, ic('starFill', 'kn-icon'), h('span', { text: String(w.unlockAt) })),
          h('span', { class: 'kn-caption', text: t('worlds.unlockAt', { n: w.unlockAt }) }),
          h('span', { class: 'kn-caption kn-faint', text: t('worlds.needMore', { n: Math.max(0, w.unlockAt - total) }) }),
        )
      : null,
    h(
      'div',
      { class: 'kn-wcard-bottom' },
      h('h2', { class: 'kn-wcard-name kn-display', text: tk(`world.${w.id}`) }),
      h('p', { class: 'kn-wcard-tag kn-serif', text: tk(`worldTag.${w.id}`) }),
      h('div', { class: 'kn-wcard-meta' }, starCount(w.stars, STARS_PER_WORLD), locked ? null : h('span', { class: 'kn-wcard-go' }, h('span', { text: t('worlds.open') }), ic('chevron'))),
    ),
  );
  if (!locked) {
    tappable(card, () => {
      const rp = ctx.cb.getRoutes?.(w.id);
      if (rp) ctx.show('routes', rp);
    }, ctx, tk(`world.${w.id}`));
  } else {
    card.setAttribute('aria-disabled', 'true');
  }
  return card;
}

export const worldsScreen: ScreenDef<WorldsProps> = {
  layer: 'page',
  render(p, ctx) {
    const track = h('div', { class: 'kn-wtrack kn-hscroll' });
    const dots = h('div', { class: 'kn-wdots', 'aria-hidden': 'true' });
    p.worlds.forEach((w, i) => {
      track.appendChild(worldCard(w, p.totalStars, ctx));
      dots.appendChild(h('i', { class: i === 0 ? 'is-on' : '' }));
    });
    track.appendChild(h('div', { class: 'kn-wtrack-end' }));
    const syncDots = (): void => {
      const cards = track.querySelectorAll<HTMLElement>('.kn-wcard');
      if (!cards.length) return;
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('is-on', i === best));
    };
    track.addEventListener('scroll', syncDots, { passive: true });
    if (p.focus) {
      const idx = p.worlds.findIndex((w) => w.id === p.focus);
      requestAnimationFrame(() => {
        const c = track.querySelectorAll<HTMLElement>('.kn-wcard')[idx];
        if (c) track.scrollLeft = c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2;
        syncDots();
      });
    }
    return page(ctx, {
      title: t('worlds.title'),
      eyebrow: t('mode.career'),
      right: starCount(p.totalStars, MAX_STARS),
      cls: 'kn-page--worlds',
      bodyCls: 'kn-page-body--flush',
      body: [track, dots],
    });
  },
};
