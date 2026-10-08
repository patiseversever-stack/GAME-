// Main menu: overlay on the live 3D scene. Top: wordmark + settings + rank badge. Bottom sheet cards:
// Devam (hero), Günün Rotası, SÜRÜ.io, Modlar, Koleksiyon. Locked items show their unlock condition.
import { h, ic, stars } from '../dom.ts';
import { t, tk, upper, routeName } from '../i18n.ts';
import { rankBand, routeWorld, LEAGUE_COUNT } from '../content.ts';
import { LEAGUE_COLORS, WORLD_ACCENT } from '../theme.ts';
import type { MenuProps } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { accentStyle, eyebrow, lockText, tappable } from './common.ts';

function rankBadge(p: MenuProps, ctx: ScreenCtx): HTMLElement {
  const { level, xp, xpNext } = p.rank;
  const k = xpNext > 0 ? Math.max(0, Math.min(1, xp / xpNext)) : 1;
  const C = 2 * Math.PI * 19;
  const ring = `<svg viewBox="0 0 44 44" class="kn-rank-ring" aria-hidden="true"><circle cx="22" cy="22" r="19" fill="none" stroke="#FFFFFF22" stroke-width="1.5"/><circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="${(C * k).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 22 22)"/></svg>`;
  const disc = h('span', { class: 'kn-rank-disc', html: ring });
  disc.appendChild(h('b', { class: 'kn-display kn-num', text: String(level) }));
  const el = h(
    'div',
    { class: 'kn-rank' },
    h('span', { class: 'kn-rank-text' }, eyebrow(tk(`rank.${rankBand(level)}`), 'kn-rank-title'), h('span', { class: 'kn-rank-sub kn-num', text: t('rank.xp', { xp, next: xpNext }) })),
    disc,
  );
  return tappable(el, () => ctx.cb.onRankTap?.(), ctx, `${t('rank.label')} ${level}`);
}

function card(cls: string, icon: string, title: string, sub: string, onTap: (() => void) | null, ctx: ScreenCtx, extra?: HTMLElement | null, locked?: string): HTMLElement {
  const el = h(
    'div',
    { class: `kn-mcard ${cls} ${locked ? 'is-locked' : ''}`.trim() },
    h('span', { class: 'kn-mcard-icon' }, ic(locked ? 'lock' : icon)),
    h('span', { class: 'kn-mcard-text' }, eyebrow(title, 'kn-mcard-title'), extra ?? null, h('span', { class: 'kn-mcard-sub', text: locked ?? sub })),
  );
  if (onTap && !locked) tappable(el, onTap, ctx, title);
  else el.setAttribute('aria-disabled', 'true');
  return el;
}

export const menuScreen: ScreenDef<MenuProps> = {
  layer: 'root',
  render(p, ctx) {
    const cb = ctx.cb;
    const open = (fn: (() => unknown) | undefined, screen: Parameters<ScreenCtx['show']>[0]) => () => {
      const props = fn?.();
      if (props) ctx.show(screen, props);
    };

    // Hero: continue (or first flight).
    const cont = p.continueRoute;
    const world = cont ? routeWorld(cont.routeId) : p.world ?? 'kapadokya';
    const heroTitle = cont ? routeName(cont.routeId) : t('menu.firstFlight');
    const heroSub = cont ? t('menu.continueSub', { world: tk(`world.${world}`), n: Number(cont.routeId.charAt(3)) }) : t('menu.firstFlightSub');
    const play = h('span', { class: 'kn-hero-play' }, ic('play'));
    const hero = h(
      'div',
      { class: 'kn-hero', style: accentStyle(world) },
      h('span', { class: 'kn-hero-bar' }),
      h(
        'span',
        { class: 'kn-hero-text' },
        eyebrow(t('menu.continue'), 'kn-hero-eyebrow'),
        h('span', { class: 'kn-hero-title kn-display kn-ellipsis', text: heroTitle }),
        h('span', { class: 'kn-hero-sub kn-ellipsis' }, h('span', { class: 'kn-ellipsis', text: heroSub }), cont ? stars(cont.stars) : null),
      ),
      play,
    );
    tappable(hero, () => cb.onContinue?.(), ctx, `${t('menu.continue')} · ${heroTitle}`);

    // Daily
    const d = p.daily;
    const dailyNum = h('span', { class: 'kn-mcard-big kn-display kn-num', text: t('daily.number', { n: d.n }) });
    const daily = card(
      'kn-mcard--daily',
      'calendar',
      t('menu.daily'),
      d.bestSec !== undefined ? t('menu.dailyBest', { time: d.bestSec }) : t('menu.dailyNotYet'),
      open(cb.getDaily, 'daily'),
      ctx,
      d.unlocked ? dailyNum : null,
      d.unlocked ? undefined : lockText(d.lockRoute),
    );
    daily.setAttribute('style', accentStyle(d.world));

    // SÜRÜ.io
    const s = p.suru;
    const league = Math.max(0, Math.min(LEAGUE_COUNT - 1, s.league));
    const leagueName = tk(`league.${league}`);
    const suruBig = h('span', { class: 'kn-mcard-big kn-display', style: `color:${LEAGUE_COLORS[league]}` }, ic('league', 'kn-icon kn-league-icon'), h('span', { text: upper(leagueName) }));
    const suru = card('kn-mcard--suru', 'flock', t('menu.suru'), t('suru.lp', { n: s.lp }), open(cb.getSuru, 'suru'), ctx, s.unlocked ? suruBig : null, s.unlocked ? undefined : lockText(s.lockRoute));

    const modes = card('kn-mcard--row', 'compass', t('menu.modes'), t('menu.modesSub'), open(cb.getModes, 'modes'), ctx);
    const coll = card('kn-mcard--row', 'collection', t('menu.collection'), t('menu.collectionSub', { postcards: p.collection.postcards, badges: p.collection.badges }), open(cb.getCollection, 'collection'), ctx);

    const settingsBtn = h('button', { class: 'kn-btn kn-btn--icon', type: 'button', 'aria-label': t('common.settings') });
    settingsBtn.appendChild(ic('settings'));
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.sound('open');
      const sp = cb.getSettings?.();
      if (sp) ctx.show('settings', sp);
    });

    return h(
      'section',
      { class: 'kn-menu', style: `--kn-menu-accent:${WORLD_ACCENT[world]};` },
      h('div', { class: 'kn-menu-scrim-top' }),
      h('div', { class: 'kn-menu-scrim-bottom' }),
      h(
        'div',
        { class: 'kn-menu-inner kn-safe' },
        h('header', { class: 'kn-menu-top' }, h('div', { class: 'kn-wordmark kn-wordmark--sm', text: t('app.name') }), h('div', { class: 'kn-menu-top-right' }, settingsBtn, rankBadge(p, ctx))),
        h(
          'div',
          { class: 'kn-sheet kn-panel' },
          hero,
          h('div', { class: 'kn-mgrid' }, daily, suru),
          h('div', { class: 'kn-mgrid kn-mgrid--rows' }, modes, coll),
        ),
      ),
    );
  },
};
