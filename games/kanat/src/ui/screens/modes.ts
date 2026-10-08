// Mode cards (Kariyer, Günün Rotası, Hayalet Düello, Serbest Uçuş, SÜRÜ.io) and the SÜRÜ.io landing page.
import type { WorldId } from '../../sim/types.ts';
import { h, ic } from '../dom.ts';
import { t, tk, upper, worldShort } from '../i18n.ts';
import { LEAGUE_COUNT, LP_PER_LEAGUE, MAX_STARS } from '../content.ts';
import { LEAGUE_COLORS, WORLD_ACCENT } from '../theme.ts';
import type { ModesProps, SuruProps, SuruSub } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { eyebrow, lockText, page, tappable } from './common.ts';

function modeCard(ctx: ScreenCtx, o: { icon: string; title: string; desc: string; locked?: string; onTap?: () => void; extra?: HTMLElement | null; meta?: HTMLElement | null }): HTMLElement {
  const el = h(
    'article',
    { class: `kn-mode ${o.locked ? 'is-locked' : ''}`.trim() },
    h(
      'div',
      { class: 'kn-mode-main' },
      h('span', { class: 'kn-mode-icon' }, ic(o.locked ? 'lock' : o.icon)),
      h('span', { class: 'kn-mode-text' }, h('span', { class: 'kn-mode-title', text: o.title }), h('span', { class: `kn-mode-desc ${o.locked ? 'kn-mode-desc--lock' : ''}`.trim(), text: o.locked ?? o.desc })),
      o.meta ?? null,
      !o.locked && o.onTap ? h('span', { class: 'kn-mode-chev' }, ic('chevron')) : null,
    ),
    o.extra && !o.locked ? o.extra : null,
  );
  if (o.onTap && !o.locked) tappable(el.firstElementChild as HTMLElement, o.onTap, ctx, o.title);
  if (o.locked) el.setAttribute('aria-disabled', 'true');
  return el;
}

function suruButtons(ctx: ScreenCtx, dayN: number): HTMLElement {
  const mk = (sub: SuruSub, label: string, icon: string): HTMLElement => {
    const b = h('button', { class: 'kn-subbtn', type: 'button' }, ic(icon), h('span', { text: label }));
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.sound('confirm');
      ctx.cb.onSuru?.(sub);
    });
    return b;
  };
  return h('div', { class: 'kn-subbtns' }, mk('league', t('mode.suruLeague'), 'league'), mk('day', `${t('mode.suruDay')} ${t('daily.number', { n: dayN })}`, 'calendar'), mk('practice', t('mode.suruPractice'), 'flock'));
}

function freeWorlds(ctx: ScreenCtx, worlds: WorldId[]): HTMLElement {
  const row = h('div', { class: 'kn-chips kn-hscroll' });
  for (const w of worlds) {
    const b = h('button', { class: 'kn-wchip', type: 'button', style: `--kn-accent:${WORLD_ACCENT[w]}` }, h('i'), h('span', { text: worldShort(w) }));
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.sound('confirm');
      ctx.cb.onFreeFlight?.(w);
    });
    row.appendChild(b);
  }
  return row;
}

export const modesScreen: ScreenDef<ModesProps> = {
  layer: 'page',
  render(p, ctx) {
    const cb = ctx.cb;
    const lp = p.suru;
    const league = Math.max(0, Math.min(LEAGUE_COUNT - 1, lp.league));
    const body = h(
      'div',
      { class: 'kn-modes' },
      modeCard(ctx, {
        icon: 'map',
        title: t('mode.career'),
        desc: t('mode.careerDesc'),
        meta: h('span', { class: 'kn-starcount kn-num' }, ic('starFill', 'kn-icon is-on'), h('span', { text: t('common.starsOf', { n: p.careerStars, total: MAX_STARS }) })),
        onTap: () => {
          const w = cb.getWorlds?.();
          if (w) ctx.show('worlds', w);
        },
      }),
      modeCard(ctx, {
        icon: 'calendar',
        title: t('mode.daily'),
        desc: t('mode.dailyDesc'),
        locked: p.daily.unlocked ? undefined : lockText(p.daily.lockRoute),
        meta: p.daily.unlocked ? h('span', { class: 'kn-mode-num kn-display kn-num', text: t('daily.number', { n: p.daily.n }) }) : null,
        onTap: () => {
          const d = cb.getDaily?.();
          if (d) ctx.show('daily', d);
        },
      }),
      modeCard(ctx, { icon: 'duel', title: t('mode.duel'), desc: t('mode.duelDesc'), locked: p.duel.unlocked ? undefined : lockText(p.duel.lockRoute), onTap: () => ctx.show('duel', {}) }),
      modeCard(ctx, { icon: 'glide', title: t('mode.free'), desc: t('mode.freeDesc'), locked: p.free.unlocked ? undefined : lockText(p.free.lockRoute), extra: p.free.worlds?.length ? freeWorlds(ctx, p.free.worlds) : null }),
      modeCard(ctx, {
        icon: 'flock',
        title: t('mode.suru'),
        desc: t('mode.suruDesc'),
        locked: lp.unlocked ? undefined : lockText(lp.lockRoute),
        meta: lp.unlocked ? h('span', { class: 'kn-mode-league', style: `color:${LEAGUE_COLORS[league]}` }, ic('league'), h('span', { class: 'kn-eyebrow', text: upper(tk(`league.${league}`)) })) : null,
        extra: suruButtons(ctx, lp.dayN),
      }),
    );
    return page(ctx, { title: t('modes.title'), cls: 'kn-page--modes', body });
  },
};

export const suruScreen: ScreenDef<SuruProps> = {
  layer: 'page',
  render(p, ctx) {
    const league = Math.max(0, Math.min(LEAGUE_COUNT - 1, p.league));
    const top = league >= LEAGUE_COUNT - 1;
    const k = Math.max(0, Math.min(1, p.lp / LP_PER_LEAGUE));
    const leaguePanel = h(
      'div',
      { class: 'kn-league kn-card', style: `--kn-league:${LEAGUE_COLORS[league]}` },
      h('span', { class: 'kn-league-badge' }, ic('league')),
      h(
        'div',
        { class: 'kn-league-text' },
        eyebrow(t('league.label', { league: tk(`league.${league}`) })),
        h('div', { class: 'kn-league-lp kn-display kn-num', text: t('suru.lp', { n: p.lp }) }),
        h('div', { class: 'kn-league-bar' }, h('i', { style: `transform:scaleX(${top ? 1 : k})` })),
        h('div', { class: 'kn-caption', text: top ? t('suru.topLeague') : t('suru.nextLeague', { league: tk(`league.${league + 1}`), n: Math.max(0, LP_PER_LEAGUE - p.lp) }) }),
      ),
    );
    const option = (sub: SuruSub, icon: string, title: string, desc: string): HTMLElement => {
      const el = h('article', { class: 'kn-mode' }, h('div', { class: 'kn-mode-main' }, h('span', { class: 'kn-mode-icon' }, ic(icon)), h('span', { class: 'kn-mode-text' }, h('span', { class: 'kn-mode-title', text: title }), h('span', { class: 'kn-mode-desc', text: desc })), h('span', { class: 'kn-mode-chev' }, ic('play'))));
      tappable(el.firstElementChild as HTMLElement, () => ctx.cb.onSuru?.(sub), ctx, title);
      return el;
    };
    const body = h(
      'div',
      { class: 'kn-suru' },
      h('p', { class: 'kn-serif kn-suru-tag', text: t('suru.tagline') }),
      leaguePanel,
      option('league', 'league', t('mode.suruLeague'), t('suru.leagueDesc')),
      option('day', 'calendar', `${t('mode.suruDay')} ${t('daily.number', { n: p.dayN })}`, t('suru.dayDesc', { n: p.dayN })),
      option('practice', 'flock', t('mode.suruPractice'), t('suru.practiceDesc')),
      h('div', { class: 'kn-ai-note' }, h('span', { class: 'kn-ai-tag', text: t('common.ai') }), h('span', { class: 'kn-caption', text: t('suru.aiLabel') })),
    );
    return page(ctx, { title: t('suru.title'), cls: 'kn-page--suru', body });
  },
};
