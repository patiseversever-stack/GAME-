// Günün Rotası card (#N, world, date, today's best, master time, strip, stars, share) and Hayalet Düello
// (paste code / deep link → ghost card "Ayşe’nin hayaleti · Günün Rotası #214 · 2:07.4", TR/EN errors).
import { h, ic, stars, strip } from '../dom.ts';
import { t, tk, fmtDate, fmtTime, fmtInt, routeName } from '../i18n.ts';
import type { DailyProps, DuelError, DuelProps, GhostVM } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { accentStyle, difficultyPips, eyebrow, page, worldArt } from './common.ts';
import { routeWorld } from '../content.ts';

export const dailyScreen: ScreenDef<DailyProps> = {
  layer: 'page',
  render(p, ctx) {
    const hasBest = p.bestSec !== undefined;
    const hero = h(
      'div',
      { class: 'kn-daily-hero', style: accentStyle(p.world) },
      worldArt(p.world, 'kn-art', { w: 720, h: 420, seed: p.n, id: 'dy' }),
      h('div', { class: 'kn-daily-shade' }),
      h(
        'div',
        { class: 'kn-daily-hero-text' },
        eyebrow(fmtDate(p.date.y, p.date.m, p.date.d)),
        h('div', { class: 'kn-daily-num kn-display kn-num', text: t('daily.number', { n: p.n }) }),
        h('div', { class: 'kn-serif kn-daily-world', text: tk(`world.${p.world}`) }),
      ),
    );
    const stat = (label: string, value: string, extra?: HTMLElement | null): HTMLElement => h('div', { class: 'kn-stat' }, eyebrow(label), h('div', { class: 'kn-stat-v kn-display kn-num', text: value }), extra ?? null);
    const stats = h(
      'div',
      { class: 'kn-stats' },
      stat(t('daily.best'), hasBest ? fmtTime(p.bestSec ?? 0) : '—', hasBest && p.stars !== undefined ? stars(p.stars) : null),
      stat(t('daily.botTime'), p.botSec !== undefined ? fmtTime(p.botSec) : '—'),
      stat(t('daily.difficultyLabel'), `${p.difficulty}/9`, difficultyPips(p.difficulty)),
      stat(t('daily.attemptsLabel'), String(p.attempts), h('span', { class: 'kn-caption', text: t('daily.gates', { n: p.gates }) })),
    );
    const flags = h(
      'div',
      { class: 'kn-daily-flags' },
      p.strip ? h('div', { class: 'kn-daily-strip' }, eyebrow(t('share.prox')), strip(p.strip, 'kn-strip kn-strip--lg')) : null,
      p.assisted ? h('span', { class: 'kn-chip' }, ic('lifebuoy'), h('span', { text: t('results.assist') })) : null,
      p.slow ? h('span', { class: 'kn-chip' }, ic('turtle'), h('span', { text: t('results.slow') })) : null,
    );
    const fly = h('button', { class: 'kn-btn kn-btn--primary kn-btn--lg kn-grow', type: 'button' }, ic('play'), h('span', { text: t('common.play') }));
    fly.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.sound('tap');
      ctx.cb.onPlayDaily?.();
    });
    const share = h('button', { class: 'kn-btn kn-btn--lg', type: 'button', disabled: !hasBest }, ic('share'), h('span', { text: t('common.share') }));
    share.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.cb.onShareDaily?.();
    });
    return page(ctx, {
      title: t('daily.title'),
      world: p.world,
      cls: 'kn-page--daily',
      body: h('div', { class: 'kn-daily' }, hero, h('div', { class: 'kn-daily-side' }, stats, flags, h('p', { class: 'kn-caption kn-daily-rules', text: t('daily.rules') }), h('p', { class: 'kn-caption kn-faint', text: t('daily.next') }))),
      footer: h('div', { class: 'kn-row kn-foot-buttons' }, fly, share),
    });
  },
};

export function ghostLine(g: GhostVM): string {
  const route = g.route.kind === 'daily' ? t('duel.routeDaily', { n: g.route.n }) : routeName(g.route.routeId);
  const metric = g.metric.kind === 'time' ? fmtTime(g.metric.sec) : fmtInt(g.metric.value);
  return t('duel.ghostLine', { ghost: t('duel.ghostOf', { name: g.name }), route, metric });
}

function errorText(e: DuelError): string {
  return e === 'version' ? t('duel.err.version') : e === 'empty' ? t('duel.err.empty') : e === 'clipboard' ? t('duel.err.clipboard') : t('duel.err.invalid');
}

export const duelScreen: ScreenDef<DuelProps> = {
  layer: 'page',
  render(p, ctx) {
    const input = h('textarea', { class: 'kn-code-input kn-num', rows: '2', placeholder: t('duel.placeholder'), spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': t('duel.codeLabel') });
    input.value = p.code ?? '';
    const submit = async (): Promise<void> => {
      const code = input.value.trim();
      if (!code) {
        ctx.rerender({ ...p, code, error: 'empty', ghost: undefined });
        return;
      }
      if (!ctx.cb.onDuelSubmit) return;
      ctx.rerender({ ...p, code, verifying: true, error: undefined, ghost: undefined });
      const res = await ctx.cb.onDuelSubmit(code);
      ctx.rerender(res.ok ? { code, ghost: res.ghost } : { code, error: res.error });
    };
    const paste = h('button', { class: 'kn-btn kn-btn--ghost kn-paste', type: 'button' }, ic('paste'), h('span', { text: t('common.paste') }));
    paste.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const text = ctx.cb.readClipboard ? await ctx.cb.readClipboard() : await navigator.clipboard.readText();
        input.value = text.trim();
      } catch {
        ctx.rerender({ ...p, code: input.value, error: 'clipboard' });
      }
    });
    const load = h('button', { class: `kn-btn ${p.ghost ? '' : 'kn-btn--primary'} kn-btn--lg kn-btn--block`, type: 'button', disabled: !!p.verifying }, ic('ghost'), h('span', { text: p.verifying ? t('duel.verifying') : t('duel.load') }));
    load.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.sound('tap');
      void submit();
    });
    const field = h('div', { class: 'kn-code' }, eyebrow(t('duel.codeLabel')), h('div', { class: 'kn-code-box' }, input, paste));
    const err = p.error ? h('div', { class: 'kn-error', role: 'alert' }, ic('info'), h('span', { text: errorText(p.error) })) : null;
    let card: HTMLElement | null = null;
    if (p.ghost) {
      const g = p.ghost;
      const world = g.route.kind === 'career' ? routeWorld(g.route.routeId) : undefined;
      const race = h('button', { class: 'kn-btn kn-btn--primary kn-btn--lg kn-btn--block', type: 'button' }, ic('play'), h('span', { text: t('duel.race') }));
      race.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.sound('tap');
        ctx.cb.onDuelStart?.(input.value.trim());
      });
      card = h(
        'div',
        { class: 'kn-ghost kn-card kn-anim-pop', style: accentStyle(world) },
        h('div', { class: 'kn-ghost-head' }, h('span', { class: 'kn-ghost-icon' }, ic('ghost')), h('div', { class: 'kn-ghost-line', text: ghostLine(g) })),
        g.oneTime ? h('p', { class: 'kn-caption', text: t('duel.oneTime') }) : null,
        race,
      );
    }
    return page(ctx, {
      title: t('duel.title'),
      cls: 'kn-page--duel',
      body: h('div', { class: 'kn-duel' }, h('p', { class: 'kn-body kn-dim', text: t('duel.hint') }), field, err, p.ghost ? null : load, card),
    });
  },
};

/** Exposed for tests/gallery: the ghost card line for given params. */
export function ghostCardText(name: string, n: number, sec: number): string {
  return ghostLine({ name, route: { kind: 'daily', n }, metric: { kind: 'time', sec } });
}

export type { ScreenCtx };
