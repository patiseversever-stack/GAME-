// Collection: postcard album (silhouette hints for empty slots), wardrobe (patterns / palettes / trails with a
// live pilot preview hook) and badges.
import type { WorldId } from '../../sim/types.ts';
import { h, ic } from '../dom.ts';
import { t, tk, fmtDate, routeName, worldShort } from '../i18n.ts';
import { BADGE_ICON, PALETTES, PATTERN_IDS, TRAILS, WORLDS } from '../content.ts';
import { WORLD_ACCENT } from '../theme.ts';
import type { CollectionProps, CosmeticKind, CosmeticVM, CosmeticSourceVM } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { eyebrow, page, tappable, worldArt } from './common.ts';
import { canopySvg, frameSvg, paletteSvg, patternDef, patternSvg, trailSvg } from '../swatch.ts';
import { cosmetic } from '../../content/meta/cosmetics.ts';
import { getLang } from '../i18n.ts';

const SIGNATURE: Record<WorldId, string> = { kapadokya: 'periBacasi', likya: 'turkuaz', karadeniz: 'ladin', erciyes: 'karKristali', pamukkale: 'traverten' };

function sourceText(s: CosmeticSourceVM | undefined): string {
  if (!s) return '';
  switch (s.kind) {
    case 'start': return t('source.start');
    case 'usta': return t('source.usta', { route: s.routeId ? routeName(s.routeId) : '' });
    case 'rank': return t('source.rank', { n: s.n ?? 1 });
    case 'postcards': return t('source.postcards', { world: s.world ? worldShort(s.world) : '' });
    case 'weekly': return t('source.weekly');
    case 'log': return t('source.log');
    case 'postcardCount': return t('source.postcardCount', { n: s.n ?? 1 });
    case 'suru': return s.league !== undefined ? t('source.suruLeague', { league: tk(`league.${s.league}`) }) : t('source.suruRounds', { n: s.n ?? 1 });
    case 'worldComplete': return t('source.worldComplete', { world: s.world ? worldShort(s.world) : '' });
  }
}

let uid = 1000;

/** Fallback wingsuit preview (top view): suit body + arm wings + leg wing with the equipped pattern and palette. */
function pilotSvg(patternId: string, pal: readonly [string, string, string], trail: string): string {
  uid++;
  const [defs, fill] = patternDef(patternId, pal, 0.55);
  const wingL = 'M112 50 C90 54 54 66 30 76 C25 78 26 84 31 84 C58 86 86 92 104 100 Z';
  const wingR = 'M128 50 C150 54 186 66 210 76 C215 78 214 84 209 84 C182 86 154 92 136 100 Z';
  const legs = 'M104 98 C106 118 110 132 114 146 L120 140 L126 146 C130 132 134 118 136 98 Z';
  const body = 'M120 34 C129 34 133 42 133 52 L136 98 C130 104 110 104 104 98 L107 52 C107 42 111 34 120 34 Z';
  return `<svg viewBox="0 0 240 170" aria-hidden="true"><defs>${defs}<linearGradient id="trl${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${trail}" stop-opacity="0.65"/><stop offset="1" stop-color="${trail}" stop-opacity="0"/></linearGradient><linearGradient id="sh${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></linearGradient></defs>
<path d="M28 82 C22 110 18 140 14 170 L40 170 C38 140 34 110 31 84Z M212 82 C218 110 222 140 226 170 L200 170 C202 140 206 110 209 84Z" fill="url(#trl${uid})"/>
<g stroke="#0E141C" stroke-opacity="0.55" stroke-width="1.2" stroke-linejoin="round"><path d="${wingL}" fill="${fill}"/><path d="${wingR}" fill="${fill}"/><path d="${legs}" fill="${fill}"/><path d="${body}" fill="${pal[1]}"/></g>
<path d="${wingL} ${wingR} ${legs}" fill="url(#sh${uid})"/>
<path d="M31 84 C58 86 86 92 104 100 M209 84 C182 86 154 92 136 100" stroke="${pal[2]}" stroke-width="1.6" fill="none" opacity="0.85"/>
<path d="M114 52 L126 52 L124 96 L116 96Z" fill="${pal[0]}" opacity="0.9"/>
<ellipse cx="120" cy="27" rx="9.5" ry="10.5" fill="#1A1F26"/><path d="M113 24 Q120 19 127 24 Q124 29 120 29 Q116 29 113 24Z" fill="#8FA6B8" opacity="0.85"/>
<path d="M112 146 L114 152 M128 146 L126 152" stroke="#1A1F26" stroke-width="3" stroke-linecap="round"/></svg>`;
}

function postcardsTab(p: CollectionProps): HTMLElement {
  const wrap = h('div', { class: 'kn-album' });
  for (const w of WORLDS) {
    const cards = p.postcards.filter((c) => c.world === w);
    if (!cards.length) continue;
    const got = cards.filter((c) => c.got).length;
    const grid = h('div', { class: 'kn-album-grid' });
    cards.forEach((c, i) => {
      const name = tk(`pc.${c.id}`);
      const el = h(
        'figure',
        { class: `kn-postcard ${c.got ? 'is-got' : 'is-missing'}`.trim(), style: `--kn-accent:${WORLD_ACCENT[w]}` },
        worldArt(w, 'kn-art kn-postcard-art', { url: c.got ? c.imageUrl : undefined, w: 320, h: 240, seed: 11 + i * 29, id: `pc${i}`, contours: false }),
        h('figcaption', { class: 'kn-postcard-cap' }, h('span', { class: 'kn-serif kn-postcard-name', text: name }), h('span', { class: 'kn-postcard-meta', text: c.got && c.date ? fmtDate(c.date.y, c.date.m, c.date.d) : t('collection.missing') })),
      );
      if (!c.got) el.appendChild(h('span', { class: 'kn-postcard-hint' }, ic('camera')));
      grid.appendChild(el);
    });
    wrap.appendChild(
      h(
        'section',
        { class: 'kn-album-world' },
        h('div', { class: 'kn-album-head' }, eyebrow(tk(`world.${w}`)), h('span', { class: 'kn-caption kn-num', text: t('collection.count', { n: got, total: cards.length }) })),
        grid,
        h('p', { class: 'kn-caption kn-faint kn-album-bonus', text: t('collection.setBonus', { pattern: tk(`pattern.${SIGNATURE[w]}`) }) }),
      ),
    );
  }
  wrap.appendChild(h('p', { class: 'kn-caption kn-album-hint' }, ic('camera'), h('span', { text: t('collection.postcardHint') })));
  return wrap;
}

function wardrobeTab(p: CollectionProps, ctx: ScreenCtx): HTMLElement {
  const sub: CosmeticKind = p.wardrobeTab ?? 'pattern';
  const pal = PALETTES[p.equipped.palette] ?? PALETTES.safak;
  const preview = h('div', { class: 'kn-pilot-preview' });
  if (ctx.cb.mountPilotPreview) {
    const c = ctx.cb.mountPilotPreview(preview, p.equipped);
    if (c) ctx.onCleanup(c);
  } else {
    preview.innerHTML = `<div class="kn-pilot-grid"></div>${pilotSvg(p.equipped.pattern, pal, TRAILS[p.equipped.trail] ?? '#F5F1E8')}`;
  }
  const tabs = h('div', { class: 'kn-seg kn-seg--sm', role: 'tablist' });
  const tabDefs: [CosmeticKind, string][] = [['pattern', t('collection.patterns')], ['palette', t('collection.palettes')], ['trail', t('collection.trails')]];
  if (p.canopies?.length) tabDefs.push(['canopy', t('collection.canopies')]);
  if (p.frames?.length) tabDefs.push(['cardFrame', t('collection.frames')]);
  for (const [k, label] of tabDefs) {
    const b = h('button', { type: 'button', role: 'tab', 'aria-pressed': String(k === sub) }, h('span', { text: label }));
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.rerender({ ...p, wardrobeTab: k });
    });
    tabs.appendChild(b);
  }
  const items: CosmeticVM[] = sub === 'pattern' ? p.patterns : sub === 'palette' ? p.palettes : sub === 'trail' ? p.trails : sub === 'canopy' ? p.canopies ?? [] : p.frames ?? [];
  const equippedId = (sub === 'pattern' ? p.equipped.pattern : sub === 'palette' ? p.equipped.palette : sub === 'trail' ? p.equipped.trail : sub === 'canopy' ? p.equipped.canopy : p.equipped.cardFrame) ?? '';
  const grid = h('div', { class: 'kn-wgrid' });
  for (const it of items) {
    const meta = cosmetic(`${sub}:${it.id}` as Parameters<typeof cosmetic>[0]);
    const sw =
      sub === 'pattern' ? patternSvg(it.id, pal)
      : sub === 'palette' ? paletteSvg(PALETTES[it.id] ?? PALETTES.safak)
      : sub === 'trail' ? trailSvg(TRAILS[it.id] ?? '#F5F1E8')
      : sub === 'canopy' ? canopySvg(meta && 'colors' in meta && meta.colors.length === 2 ? (meta.colors as readonly [string, string]) : ['#F2A541', '#F6E7D0'])
      : frameSvg(it.id);
    const itemName = sub === 'canopy' || sub === 'cardFrame' ? meta?.name[getLang()] ?? it.id : tk(`${sub}.${it.id}`);
    const on = it.id === equippedId;
    const el = h(
      'div',
      { class: `kn-witem ${on ? 'is-on' : ''} ${it.unlocked ? '' : 'is-locked'}`.trim() },
      h('span', { class: 'kn-witem-sw', html: sw }, on ? h('span', { class: 'kn-witem-check' }, ic('check')) : null, it.unlocked ? null : h('span', { class: 'kn-witem-lock' }, ic('lock'))),
      h('span', { class: 'kn-witem-name kn-ellipsis', text: itemName }),
      h('span', { class: 'kn-witem-src kn-ellipsis', text: it.unlocked ? (on ? t('collection.equipped') : '') : sourceText(it.source) }),
    );
    if (it.unlocked && !on) {
      tappable(el, () => {
        ctx.cb.onEquip?.(sub, it.id);
        ctx.rerender({ ...p, equipped: { ...p.equipped, [sub]: it.id } });
      }, ctx, `${t('collection.equip')} · ${itemName}`);
    }
    grid.appendChild(el);
  }
  return h('div', { class: 'kn-wardrobe' }, preview, h('div', { class: 'kn-wardrobe-side' }, tabs, grid));
}

function badgesTab(p: CollectionProps): HTMLElement {
  const grid = h('div', { class: 'kn-badges' });
  for (const b of p.badges) {
    grid.appendChild(
      h(
        'div',
        { class: `kn-badge ${b.got ? 'is-got' : ''}`.trim() },
        h('span', { class: 'kn-badge-emblem', html: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5Z" fill="none" stroke="currentColor" stroke-width="1.4" ${b.got ? '' : 'stroke-dasharray="3 3"'}/><path d="M32 9 L52 20.5 V43.5 L32 55 L12 43.5 V20.5Z" fill="currentColor" fill-opacity="${b.got ? 0.12 : 0.03}" stroke="none"/></svg>` }, ic(BADGE_ICON[b.id], 'kn-icon kn-badge-icon')),
        h('span', { class: 'kn-badge-name', text: tk(`badge.${b.id}`) }),
        h('span', { class: 'kn-badge-desc', text: tk(`badge.${b.id}.desc`) }),
      ),
    );
  }
  return grid;
}

export const collectionScreen: ScreenDef<CollectionProps> = {
  layer: 'page',
  render(p, ctx) {
    const tab = p.tab ?? 'postcards';
    const pcGot = p.postcards.filter((c) => c.got).length;
    const bGot = p.badges.filter((b) => b.got).length;
    const tabs = h('div', { class: 'kn-seg kn-tabs', role: 'tablist' });
    const defs: [NonNullable<CollectionProps['tab']>, string, string][] = [
      ['postcards', t('collection.postcards'), t('collection.count', { n: pcGot, total: p.postcards.length })],
      ['wardrobe', t('collection.wardrobe'), ''],
      ['badges', t('collection.badges'), t('collection.count', { n: bGot, total: p.badges.length })],
    ];
    for (const [k, label, count] of defs) {
      const b = h('button', { type: 'button', role: 'tab', 'aria-pressed': String(k === tab) }, h('span', { text: label }), count ? h('small', { class: 'kn-num', text: count }) : null);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.sound('tap');
        ctx.rerender({ ...p, tab: k });
      });
      tabs.appendChild(b);
    }
    const body = tab === 'postcards' ? postcardsTab(p) : tab === 'wardrobe' ? wardrobeTab(p, ctx) : badgesTab(p);
    return page(ctx, { title: t('collection.title'), cls: `kn-page--collection kn-tab--${tab}`, below: h('div', { class: 'kn-tabs-wrap' }, tabs), body });
  },
};
