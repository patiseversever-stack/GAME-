// Haftanın Rotası card (route + weather modifier + reward preview) and the SÜRÜ.io round results.
import { h, ic, stars } from '../dom.ts';
import { t, tk, fmtInt, fmtTime, fmtDec, routeName, upper, getLang, ordinal } from '../i18n.ts';
import { countUp } from '../anim.ts';
import { LEAGUE_COUNT, LP_PER_LEAGUE, routeWorld } from '../content.ts';
import { LEAGUE_COLORS } from '../theme.ts';
import { WEEKLY_MODIFIERS } from '../../content/meta/progression.ts';
import type { SuruResultsProps, WeeklyProps } from '../types.ts';
import type { ScreenDef } from './screen.ts';
import { accentStyle, eyebrow, page, worldArt } from './common.ts';
import { trailSvg } from '../swatch.ts';

const MOD_ICON: Record<string, string> = { ruzgarliGun: 'wind', sisPerdesi: 'cloud', termalAvi: 'thermal' };

export const weeklyScreen: ScreenDef<WeeklyProps> = {
  layer: 'page',
  render(p, ctx) {
    const world = routeWorld(p.routeId);
    const mod = WEEKLY_MODIFIERS.find((m) => m.id === p.modifier);
    const lang = getLang();
    const hero = h(
      'div',
      { class: 'kn-daily-hero', style: accentStyle(world) },
      worldArt(world, 'kn-art', { w: 720, h: 420, seed: p.weekIndex, id: 'wk' }),
      h('div', { class: 'kn-daily-shade' }),
      h('div', { class: 'kn-daily-hero-text' }, eyebrow(`${t('weekly.week', { n: p.weekIndex })} · ${t('weekly.endsIn', { n: p.daysLeft })}`), h('div', { class: 'kn-weekly-route kn-display', text: routeName(p.routeId) }), h('div', { class: 'kn-serif kn-daily-world', text: tk(`world.${world}`) })),
    );
    const modCard = h(
      'div',
      { class: 'kn-mode kn-weekly-mod' },
      h('div', { class: 'kn-mode-main' }, h('span', { class: 'kn-mode-icon' }, ic(MOD_ICON[p.modifier] ?? 'wind')), h('span', { class: 'kn-mode-text' }, eyebrow(t('weekly.modifier')), h('span', { class: 'kn-mode-title', text: mod ? mod.name[lang] : p.modifier }), h('span', { class: 'kn-mode-desc', text: mod ? mod.desc[lang] : '' }))),
    );
    const tintName = p.tint.name[lang];
    const reward = h(
      'div',
      { class: 'kn-reward-chip' },
      h('span', { class: 'kn-reward-sw', html: trailSvg(p.tint.color) }),
      h('span', { class: 'kn-reward-text' }, h('b', { text: p.swallowOwned ? t('weekly.rewardTint', { tint: tintName }) : t('weekly.rewardSwallow', { tint: tintName }) }), h('small', { text: t('weekly.rewardRule') })),
      p.rewardEarned ? h('span', { class: 'kn-reward-done' }, ic('check')) : null,
    );
    const best = h('div', { class: 'kn-stats' }, h('div', { class: 'kn-stat' }, eyebrow(t('weekly.best')), h('div', { class: 'kn-stat-v kn-display kn-num', text: p.bestScore !== undefined ? fmtInt(p.bestScore) : '—' }), p.stars !== undefined ? stars(p.stars) : h('span', { class: 'kn-caption', text: t('weekly.noBest') })), h('div', { class: 'kn-stat' }, eyebrow(t('daily.attemptsLabel')), h('div', { class: 'kn-stat-v kn-display kn-num', text: String(p.attempts) })));
    const fly = h('button', { class: 'kn-btn kn-btn--primary kn-btn--lg kn-btn--block', type: 'button' }, ic('play'), h('span', { text: t('common.play') }));
    fly.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.sound('confirm');
      ctx.cb.onPlayWeekly?.();
    });
    return page(ctx, {
      title: t('weekly.title'),
      world,
      cls: 'kn-page--weekly',
      body: h('div', { class: 'kn-daily' }, hero, h('div', { class: 'kn-daily-side' }, modCard, eyebrow(t('weekly.reward')), reward, best, h('p', { class: 'kn-caption', text: t('weekly.noUsta') }))),
      footer: fly,
    });
  },
};

export const suruResultsScreen: ScreenDef<SuruResultsProps> = {
  layer: 'root',
  render(p, ctx) {
    const cb = ctx.cb;
    const anim = !ctx.refresh;
    const league = Math.max(0, Math.min(LEAGUE_COUNT - 1, p.league));
    const leagueName = tk(`league.${league}`);
    const subName = p.sub === 'daily' ? `${t('mode.suruDay')}${p.dayN !== undefined ? ` ${t('daily.number', { n: p.dayN })}` : ''}` : p.sub === 'league' ? t('mode.suruLeague') : t('mode.suruPractice');
    const placeEl = h('div', { class: 'kn-suru-place kn-display kn-num', text: ordinal(p.place) });
    const chips = h('div', { class: 'kn-res-chips' });
    if (p.lpDelta !== undefined) chips.appendChild(h('span', { class: `kn-chip ${p.lpDelta >= 0 ? 'kn-chip--pos' : 'kn-chip--neg'}` }, ic('league'), h('span', { text: t('suruRes.lpDelta', { d: `${p.lpDelta >= 0 ? '+' : '−'}${Math.abs(p.lpDelta)}` }) })));
    if (p.aiPct !== undefined) chips.appendChild(h('span', { class: `kn-chip ${p.aiPct >= 0 ? 'kn-chip--pos' : ''}` }, h('span', { text: t('suruRes.aiPct', { d: `${p.aiPct >= 0 ? '+' : '−'}${Math.abs(Math.round(p.aiPct))}%` }) })));
    if (p.xpGained) chips.appendChild(h('span', { class: 'kn-chip' }, h('span', { text: t('results.xp', { n: p.xpGained }) })));
    const k = league >= LEAGUE_COUNT - 1 ? 1 : Math.max(0, Math.min(1, p.lp / LP_PER_LEAGUE));
    const leagueBar = h(
      'div',
      { class: 'kn-league kn-card', style: `--kn-league:${LEAGUE_COLORS[league]}` },
      h('span', { class: 'kn-league-badge' }, ic('league')),
      h('div', { class: 'kn-league-text' }, eyebrow(p.leagueUp ? t('suruRes.leagueUp', { league: leagueName }) : t('league.label', { league: leagueName })), h('div', { class: 'kn-league-lp kn-display kn-num', text: t('suru.lp', { n: p.lp }) }), h('div', { class: 'kn-league-bar' }, h('i', { style: `transform:scaleX(${k})` })), p.avgPlace20 !== undefined ? h('div', { class: 'kn-caption', text: t('suruRes.avgPlace', { v: fmtDec(p.avgPlace20, 1) }) }) : null),
    );
    const stat = (label: string, value: string): HTMLElement => h('div', { class: 'kn-stat' }, eyebrow(label), h('div', { class: 'kn-stat-v kn-display kn-num', text: value }));
    const peak = h('div', { class: 'kn-stat-v kn-display kn-num' });
    ctx.onCleanup(countUp(peak, p.peak, (v) => fmtInt(v), { ms: anim ? 900 : 0, delay: anim ? 200 : 0 }));
    const stats = h(
      'div',
      { class: 'kn-stats kn-stats--3' },
      h('div', { class: 'kn-stat' }, eyebrow(t('suruRes.peak')), peak),
      stat(t('suruRes.converted'), fmtInt(p.converted)),
      stat(t('suruRes.wild'), fmtInt(p.wild)),
      stat(t('suruRes.sieges'), `×${p.sieges}`),
      stat(t('suruRes.survival'), fmtTime(p.survivalSec)),
    );
    chips.appendChild(h('span', { class: `kn-chip ${p.survived ? 'kn-chip--pos' : ''}`.trim() }, ic(p.survived ? 'sunset' : 'flock'), h('span', { text: p.survived ? t('suruRes.survived') : t('suruRes.eliminated') })));
    const act = (label: string, icon: string, cls: string, fn: (() => void) | undefined): HTMLButtonElement => {
      const b = h('button', { class: `kn-btn ${cls}`.trim(), type: 'button' }, ic(icon), h('span', { class: 'kn-btn-label', text: label }));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.sound(cls.includes('primary') ? 'confirm' : 'tap');
        fn?.();
      });
      return b;
    };
    return h(
      'section',
      { class: 'kn-results kn-suru-results', style: '--kn-accent:#FFC23D' },
      h('div', { class: 'kn-results-scrim' }),
      h(
        'div',
        { class: 'kn-results-inner kn-safe' },
        h(
          'div',
          { class: 'kn-results-left' },
          h('header', { class: 'kn-res-head' }, eyebrow(`SÜRÜ.io · ${subName}`), h('h1', { class: 'kn-h2 kn-res-title', text: t('suruRes.title') })),
          h('div', { class: 'kn-res-hero' }, placeEl, h('div', { class: 'kn-caption', text: t('suruRes.of', { n: p.flocks }) }), chips),
          h('div', { class: 'kn-res-actions' }, act(t('suruRes.again'), 'retry', 'kn-btn--primary kn-btn--lg kn-btn--block kn-res-retry', cb.onSuruAgain), h('div', { class: 'kn-res-actions-row' }, act(t('common.share'), 'share', '', cb.onSuruShare), p.canWatch ? act(t('suruRes.watch'), 'eye', '', cb.onSuruWatch) : null, act(t('pause.quit'), 'exit', '', cb.onQuitToMenu))),
        ),
        h('div', { class: 'kn-results-right kn-scroll' }, h('div', { class: 'kn-suru-res-panel' }, leagueBar, stats)),
      ),
    );
  },
};
