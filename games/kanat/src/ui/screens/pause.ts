// Pause: blurred backdrop over the frozen frame; Devam, Yeniden, Foto Modu (only where allowed), Ayarlar, Çık.
import { h, ic } from '../dom.ts';
import { t, tk, fmtTime, routeName } from '../i18n.ts';
import type { PauseProps } from '../types.ts';
import type { ScreenDef } from './screen.ts';
import { accentStyle, eyebrow } from './common.ts';

export const pauseScreen: ScreenDef<PauseProps> = {
  layer: 'overlay',
  onBack(_p, ctx) {
    ctx.cb.onResume?.();
  },
  render(p, ctx) {
    const cb = ctx.cb;
    const btn = (label: string, icon: string, cls: string, fn: () => void): HTMLButtonElement => {
      const b = h('button', { class: `kn-btn kn-btn--block ${cls}`.trim(), type: 'button' }, ic(icon), h('span', { text: label }));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.sound('tap');
        fn();
      });
      return b;
    };
    const where = p.routeId ? routeName(p.routeId) : p.dailyN !== undefined ? t('duel.routeDaily', { n: p.dailyN }) : p.world ? tk(`world.${p.world}`) : t('app.name');
    const sub = p.mode === 'daily' && p.timeSec !== undefined ? fmtTime(p.timeSec) : p.score !== undefined ? t('common.points', { n: p.score }) : p.timeSec !== undefined ? fmtTime(p.timeSec) : '';
    return h(
      'section',
      { class: 'kn-pause', style: accentStyle(p.world) },
      h('div', { class: 'kn-scrim' }),
      h(
        'div',
        { class: 'kn-pause-inner kn-safe' },
        h('div', { class: 'kn-pause-head' }, eyebrow(where), h('h1', { class: 'kn-h1', text: t('pause.title') }), sub ? h('div', { class: 'kn-pause-sub kn-display-600 kn-num', text: sub }) : null),
        h(
          'div',
          { class: 'kn-pause-buttons' },
          btn(t('pause.resume'), 'play', 'kn-btn--primary kn-btn--lg', () => {
            ctx.close('pause');
            cb.onResume?.();
          }),
          btn(t('pause.restart'), 'retry', '', () => cb.onRestart?.()),
          p.photoAllowed ? btn(t('pause.photo'), 'camera', '', () => cb.onPhotoMode?.()) : null,
          btn(t('pause.settings'), 'settings', '', () => {
            const sp = cb.getSettings?.();
            if (sp) ctx.show('settings', { ...sp, inFlight: true });
          }),
          btn(t('pause.quit'), 'exit', 'kn-btn--quiet', () => cb.onQuitToMenu?.()),
        ),
      ),
    );
  },
};

