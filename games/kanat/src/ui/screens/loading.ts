// Loading: painted world panorama (or host panorama hook), slow drift, hairline progress, rotating tips.
import { h } from '../dom.ts';
import { t, tk } from '../i18n.ts';
import { LOADING_TIP_COUNT } from '../content.ts';
import type { LoadingProps } from '../types.ts';
import type { ScreenDef } from './screen.ts';
import { accentStyle, eyebrow, geoCaption, worldArt } from './common.ts';

export const loadingScreen: ScreenDef<LoadingProps> = {
  layer: 'root',
  render(p, ctx) {
    const world = p.world ?? 'kapadokya';
    const progress = Math.max(0, Math.min(1, p.progress ?? 0));
    let tip = p.tip ?? 0;
    const tipText = h('p', { class: 'kn-loading-tip-text', text: tk(`tip.${tip}`) });
    const pct = h('span', { class: 'kn-num', 'data-pct': '', text: String(Math.round(progress * 100)) });
    const el = h(
      'section',
      { class: 'kn-loading', style: `${accentStyle(world)}--kn-progress:${progress};` },
      worldArt(world, 'kn-art kn-loading-art', { url: p.panoramaUrl, w: 900, h: 1100, id: 'ld' }),
      h('div', { class: 'kn-loading-shade' }),
      h(
        'div',
        { class: 'kn-loading-inner kn-safe' },
        h('div', { class: 'kn-loading-top' }, h('div', { class: 'kn-wordmark', text: t('app.name') })),
        h(
          'div',
          { class: 'kn-loading-bottom' },
          h('div', { class: 'kn-loading-world' }, eyebrow(geoCaption(world)), h('div', { class: 'kn-serif kn-loading-name', text: tk(`world.${world}`) })),
          h('div', { class: 'kn-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': t('loading.title') }, h('i')),
          h('div', { class: 'kn-loading-meta' }, eyebrow(t('loading.preparing')), h('span', { class: 'kn-loading-pct kn-display-600' }, pct, h('small', { text: '%' }))),
          h('div', { class: 'kn-loading-tip' }, eyebrow(t('loading.tip')), tipText),
        ),
      ),
    );
    if (p.tip === undefined) {
      const id = window.setInterval(() => {
        tip = (tip + 1) % LOADING_TIP_COUNT;
        tipText.classList.add('is-swap');
        window.setTimeout(() => {
          tipText.textContent = tk(`tip.${tip}`);
          tipText.classList.remove('is-swap');
        }, 220);
      }, 4800);
      ctx.onCleanup(() => clearInterval(id));
    }
    return el;
  },
};
