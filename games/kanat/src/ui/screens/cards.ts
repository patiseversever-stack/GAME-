// One-tap cards: unlock intro (one sentence), dynamic help ("Bu bölümde yardım?"), inverted controls
// ("Ters mi? [Evet] [Hayır]"), assist-off offer, and the resume-after-background overlay.
import { h, ic } from '../dom.ts';
import { t, tk } from '../i18n.ts';
import type { LevelUpProps, UnlockMode, UnlockProps } from '../types.ts';
import { cosmeticKindLabel, cosmeticName } from './common.ts';
import { cosmeticSwatch } from '../swatch.ts';
import { TITLE_BANDS } from '../../content/meta/progression.ts';
import { getLang } from '../i18n.ts';
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
    const multi = p.modes && p.modes.length > 1 ? p.modes : null;
    const title = multi ? t('intro.multiTitle') : p.kind === 'world' && p.world ? t('worldIntro.title', { world: tk(`world.${p.world}`) }) : tk(`intro.${p.kind}.title`);
    const body = p.kind === 'world' && p.world ? tk(`worldIntro.${p.world}`) : tk(`intro.${p.kind}.body`);
    const done = (): void => {
      ctx.close('unlock');
      ctx.cb.onUnlockSeen?.(p.kind, p.world);
    };
    const el = cardShell(
      'kn-card-unlock',
      h('span', { class: 'kn-modal-icon' }, ic(multi ? 'sparkle' : UNLOCK_ICON[p.kind])),
      eyebrow(t('common.new'), 'kn-modal-eyebrow'),
      h('h2', { class: 'kn-h2 kn-modal-title', text: title }),
      multi
        ? h('div', { class: 'kn-unlock-list' }, ...multi.map((m: UnlockMode) => h('div', { class: 'kn-unlock-row' }, h('span', { class: 'kn-option-icon' }, ic(UNLOCK_ICON[m])), h('span', { class: 'kn-option-text' }, h('b', { text: tk(`mode.${m}`) }), h('small', { text: tk(`intro.${m}.body`) })))))
        : h('p', { class: 'kn-body kn-modal-body', text: body }),
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
    const choose = (c: 'assist' | 'line' | 'practice' | 'none'): void => {
      ctx.close('help');
      ctx.cb.onHelpChoice?.(c);
    };
    const option = (icon: string, title: string, sub: string, c: 'assist' | 'line' | 'practice'): HTMLElement => {
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
      h('div', { class: 'kn-options' }, option('lifebuoy', t('help.full'), t('help.fullSub'), 'assist'), option('route', t('help.line'), t('help.lineSub'), 'line'), option('retry', t('help.practice'), t('help.practiceSub'), 'practice')),
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
      h('div', { class: 'kn-inv' }, h('span', { class: 'kn-inv-icon' }, ic('retry')), h('span', { class: 'kn-inv-text' }, h('b', { class: 'kn-h3', text: t('inverted.title') }))),
      h('div', { class: 'kn-modal-actions' }, btn(t('inverted.yes'), 'kn-btn--primary kn-btn--block', () => answer(true), ctx), btn(t('inverted.no'), 'kn-btn--block', () => answer(false), ctx)),
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

/** Level up: new rank + its single reward (title or cosmetic) with an "Equip" shortcut. */
export const levelUpCard: ScreenDef<LevelUpProps> = {
  layer: 'card',
  onBack(_p, ctx) {
    ctx.cb.onLevelUpDone?.();
  },
  render(p, ctx) {
    const done = (): void => {
      ctx.close('levelUp');
      ctx.cb.onLevelUpDone?.();
    };
    const C = 2 * Math.PI * 34;
    const disc = h('div', { class: 'kn-levelup-disc', html: `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="none" stroke="#FFFFFF22" stroke-width="2"/><circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg>` });
    disc.appendChild(h('b', { class: 'kn-display kn-num', text: String(p.level) }));
    const rows = p.rewards.map((r) => {
      if (r.kind === 'title') {
        const band = TITLE_BANDS.find((b) => b.id === r.title);
        const name = band ? band.name[getLang()] : r.title;
        return h('div', { class: 'kn-reward-chip' }, h('span', { class: 'kn-reward-sw kn-reward-sw--icon' }, ic('rank')), h('span', { class: 'kn-reward-text' }, h('b', { text: t('levelUp.titleReward', { title: name }) }), h('small', { text: t('kind.title') })));
      }
      const [kind, id] = r.ref.split(':');
      const equipable = ctx.cb.onEquip && (kind === 'pattern' || kind === 'palette' || kind === 'trail' || kind === 'canopy' || kind === 'cardFrame');
      const eq = equipable ? btn(t('levelUp.equip'), 'kn-reward-equip', () => {
        ctx.cb.onEquip?.(kind as 'pattern', id);
        done();
      }, ctx) : null;
      return h('div', { class: 'kn-reward-chip' }, h('span', { class: 'kn-reward-sw', html: cosmeticSwatch(r.ref) }), h('span', { class: 'kn-reward-text' }, h('b', { text: cosmeticName(r.ref) }), h('small', { text: cosmeticKindLabel(r.ref) })), eq);
    });
    if (!ctx.refresh) ctx.sound('reward');
    return cardShell(
      'kn-card-levelup',
      disc,
      eyebrow(t('levelUp.eyebrow'), 'kn-modal-eyebrow'),
      h('h2', { class: 'kn-h2 kn-modal-title', text: t('levelUp.title', { n: p.level }) }),
      h('div', { class: 'kn-levelup-rewards' }, ...rows),
      h('div', { class: 'kn-modal-actions' }, btn(t('common.continue'), 'kn-btn--primary kn-btn--block kn-btn--lg', done, ctx)),
    );
  },
};

