// One-tap cards: unlock intro (one sentence), dynamic help ("Bu bölümde yardım?"), inverted controls
// ("Ters mi? [Evet] [Hayır]"), assist-off offer, and the resume-after-background overlay.
import { h, ic } from '../dom.ts';
import { t, tk } from '../i18n.ts';
import type { UnlockProps } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { accentStyle, eyebrow } from './common.ts';

function cardShell(cls: string, ...children: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: `kn-cardlayer ${cls}`.trim() }, h('div', { class: 'kn-cardlayer-dim' }), h('div', { class: 'kn-modal kn-panel kn-panel-strong', role: 'dialog' }, ...children));
}

function btn(label: string, cls: string, fn: () => void, ctx: ScreenCtx, icon?: string): HTMLButtonElement {
  const b = h('button', { class: `kn-btn ${cls}`.trim(), type: 'button' }, icon ? ic(icon) : null, h('span', { text: label }));
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    ctx.sound('tap');
    fn();
  });
  return b;
}

const UNLOCK_ICON: Record<UnlockProps['kind'], string> = { daily: 'calendar', suru: 'flock', duel: 'ghost', free: 'glide', weekly: 'wind', world: 'mountain' };

export const unlockCard: ScreenDef<UnlockProps> = {
  layer: 'card',
  onBack(p, ctx) {
    ctx.cb.onUnlockSeen?.(p.kind, p.world);
  },
  render(p, ctx) {
    const title = p.kind === 'world' && p.world ? t('worldIntro.title', { world: tk(`world.${p.world}`) }) : tk(`intro.${p.kind}.title`);
    const body = p.kind === 'world' && p.world ? tk(`worldIntro.${p.world}`) : tk(`intro.${p.kind}.body`);
    const done = (): void => {
      ctx.close('unlock');
      ctx.cb.onUnlockSeen?.(p.kind, p.world);
    };
    const el = cardShell(
      'kn-card-unlock',
      h('span', { class: 'kn-modal-icon' }, ic(UNLOCK_ICON[p.kind])),
      eyebrow(t('common.new'), 'kn-modal-eyebrow'),
      h('h2', { class: 'kn-h2 kn-modal-title', text: title }),
      h('p', { class: 'kn-body kn-modal-body', text: body }),
      h('div', { class: 'kn-modal-actions' }, btn(t('common.ok'), 'kn-btn--primary kn-btn--block kn-btn--lg', done, ctx)),
    );
    el.setAttribute('style', accentStyle(p.world));
    if (!ctx.refresh) ctx.sound('reward');
    return el;
  },
};

export const helpCard: ScreenDef<Record<string, never>> = {
  layer: 'card',
  onBack(_p, ctx) {
    ctx.cb.onHelpChoice?.('none');
  },
  render(_p, ctx) {
    const choose = (c: 'assist' | 'line' | 'none'): void => {
      ctx.close('help');
      ctx.cb.onHelpChoice?.(c);
    };
    const option = (icon: string, title: string, sub: string, c: 'assist' | 'line'): HTMLElement => {
      const b = h('button', { class: 'kn-option', type: 'button' }, h('span', { class: 'kn-option-icon' }, ic(icon)), h('span', { class: 'kn-option-text' }, h('b', { text: title }), h('small', { text: sub })));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.sound('tap');
        choose(c);
      });
      return b;
    };
    return cardShell(
      'kn-card-help',
      h('h2', { class: 'kn-h2 kn-modal-title', text: t('help.title') }),
      h('div', { class: 'kn-options' }, option('lifebuoy', t('help.full'), t('help.fullSub'), 'assist'), option('route', t('help.line'), t('help.lineSub'), 'line')),
      h('div', { class: 'kn-modal-actions' }, btn(t('help.no'), 'kn-btn--quiet kn-btn--block', () => choose('none'), ctx)),
    );
  },
};

export const invertedCard: ScreenDef<Record<string, never>> = {
  layer: 'card',
  onBack(_p, ctx) {
    ctx.cb.onInvertedAnswer?.(false);
  },
  render(_p, ctx) {
    const answer = (flip: boolean): void => {
      ctx.close('inverted');
      ctx.cb.onInvertedAnswer?.(flip);
    };
    return cardShell(
      'kn-card-top kn-card-inverted',
      h('div', { class: 'kn-inv' }, h('span', { class: 'kn-inv-icon' }, ic('retry')), h('span', { class: 'kn-inv-text' }, h('b', { class: 'kn-h3', text: t('inverted.title') }), h('small', { class: 'kn-caption', text: t('inverted.sub') }))),
      h('div', { class: 'kn-modal-actions kn-modal-actions--row' }, btn(t('common.yes'), 'kn-btn--primary', () => answer(true), ctx), btn(t('common.no'), '', () => answer(false), ctx)),
    );
  },
};

export const assistOffCard: ScreenDef<Record<string, never>> = {
  layer: 'card',
  onBack(_p, ctx) {
    ctx.cb.onAssistOffAnswer?.(false);
  },
  render(_p, ctx) {
    const answer = (off: boolean): void => {
      ctx.close('assistOff');
      ctx.cb.onAssistOffAnswer?.(off);
    };
    return cardShell(
      'kn-card-assist',
      h('span', { class: 'kn-modal-icon' }, ic('lifebuoy')),
      h('h2', { class: 'kn-h2 kn-modal-title', text: t('assistOff.title') }),
      h('div', { class: 'kn-modal-actions kn-modal-actions--row' }, btn(t('assistOff.yes'), 'kn-btn--primary', () => answer(true), ctx), btn(t('assistOff.no'), '', () => answer(false), ctx)),
    );
  },
};

export const resumeOverlay: ScreenDef<Record<string, never>> = {
  layer: 'overlay',
  onBack(_p, ctx) {
    ctx.cb.onResumeTap?.();
  },
  render(_p, ctx) {
    const go = (): void => {
      ctx.close('resume');
      ctx.cb.onResumeTap?.();
    };
    const play = h('button', { class: 'kn-resume-btn', type: 'button', 'aria-label': t('resume.title') }, ic('play'));
    const el = h('section', { class: 'kn-resume' }, h('div', { class: 'kn-scrim' }), h('div', { class: 'kn-resume-inner' }, play, h('div', { class: 'kn-h2', text: t('resume.title') }), h('p', { class: 'kn-caption', text: t('resume.sub') })));
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.sound('confirm');
      go();
    });
    return el;
  },
};
