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
  }
}

/** Small SVG preview of a suit pattern in the equipped palette. */
function patternSvg(id: string, pal: readonly [string, string, string]): string {
  const [a, b, c] = pal;
  const idx = (PATTERN_IDS as readonly string[]).indexOf(id);
  const k = idx < 0 ? 0 : idx;
  let motif = '';
  switch (k % 5) {
    case 0: motif = `<path d="M0 30 L15 15 L30 30 L45 15 L60 30 L60 60 L0 60Z" fill="${b}"/><path d="M0 30 L15 15 L30 30 L45 15 L60 30" stroke="${c}" stroke-width="2" fill="none"/>`; break;
    case 1: motif = `<circle cx="30" cy="30" r="14" fill="none" stroke="${b}" stroke-width="5"/><circle cx="30" cy="30" r="4" fill="${c}"/>`; break;
    case 2: motif = `<path d="M0 22 Q15 8 30 22 T60 22 M0 38 Q15 24 30 38 T60 38" stroke="${b}" stroke-width="5" fill="none"/>`; break;
    case 3: motif = `<path d="M30 6 L36 30 L30 54 L24 30Z" fill="${b}"/><path d="M6 30 L30 24 L54 30 L30 36Z" fill="${c}" opacity="0.8"/>`; break;
    default: motif = `<path d="M0 0 L60 60 M20 0 L60 40 M0 20 L40 60" stroke="${b}" stroke-width="4"/>`;
  }
  const rot = (k * 37) % 90;
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="${a}"/><g transform="rotate(${rot} 30 30)">${motif}</g></svg>`;
}

function paletteSvg(pal: readonly [string, string, string]): string {
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="${pal[0]}"/><rect y="34" width="60" height="26" fill="${pal[1]}"/><rect y="28" width="60" height="6" fill="${pal[2]}"/></svg>`;
}

function trailSvg(col: string): string {
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#121922"/><path d="M6 46 C20 40 30 22 54 14" stroke="${col}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.25"/><path d="M6 46 C20 40 30 22 54 14" stroke="${col}" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="54" cy="14" r="3.4" fill="${col}"/></svg>`;
}

/** Fallback wingsuit preview (top view) tinted with palette + pattern band. */
function pilotSvg(pal: readonly [string, string, string], trail: string): string {
  return `<svg viewBox="0 0 240 150" aria-hidden="true"><defs><linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${trail}" stop-opacity="0"/><stop offset="1" stop-color="${trail}" stop-opacity="0.55"/></linearGradient></defs>
<path d="M104 128 L98 150 M136 128 L142 150" stroke="url(#tr)" stroke-width="10" stroke-linecap="round"/>
<path d="M120 18 C128 18 131 26 131 34 L136 52 L206 92 C210 95 208 100 203 99 L140 90 L138 122 L126 120 L120 128 L114 120 L102 122 L100 90 L37 99 C32 100 30 95 34 92 L104 52 L109 34 C109 26 112 18 120 18Z" fill="${pal[0]}"/>
<path d="M136 52 L206 92 C210 95 208 100 203 99 L140 90Z M104 52 L34 92 C30 95 32 100 37 99 L100 90Z" fill="${pal[1]}"/>
<path d="M60 86 L180 86" stroke="${pal[2]}" stroke-width="3" opacity="0.9"/>
<ellipse cx="120" cy="30" rx="9" ry="10" fill="#1A1F26"/><ellipse cx="120" cy="27" rx="6" ry="4" fill="#5A6B7A" opacity="0.8"/></svg>`;
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
    preview.innerHTML = `<div class="kn-pilot-pattern">${patternSvg(p.equipped.pattern, pal)}</div>${pilotSvg(pal, TRAILS[p.equipped.trail] ?? '#F5F1E8')}`;
  }
  const tabs = h('div', { class: 'kn-seg kn-seg--sm', role: 'tablist' });
  const tabDefs: [CosmeticKind, string][] = [['pattern', t('collection.patterns')], ['palette', t('collection.palettes')], ['trail', t('collection.trails')]];
  for (const [k, label] of tabDefs) {
    const b = h('button', { type: 'button', role: 'tab', 'aria-pressed': String(k === sub) }, h('span', { text: label }));
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      ctx.rerender({ ...p, wardrobeTab: k });
    });
    tabs.appendChild(b);
  }
  const items: CosmeticVM[] = sub === 'pattern' ? p.patterns : sub === 'palette' ? p.palettes : p.trails;
  const equippedId = sub === 'pattern' ? p.equipped.pattern : sub === 'palette' ? p.equipped.palette : p.equipped.trail;
  const grid = h('div', { class: 'kn-wgrid' });
  for (const it of items) {
    const sw = sub === 'pattern' ? patternSvg(it.id, pal) : sub === 'palette' ? paletteSvg(PALETTES[it.id] ?? PALETTES.safak) : trailSvg(TRAILS[it.id] ?? '#F5F1E8');
    const on = it.id === equippedId;
    const el = h(
      'div',
      { class: `kn-witem ${on ? 'is-on' : ''} ${it.unlocked ? '' : 'is-locked'}`.trim() },
      h('span', { class: 'kn-witem-sw', html: sw }, on ? h('span', { class: 'kn-witem-check' }, ic('check')) : null, it.unlocked ? null : h('span', { class: 'kn-witem-lock' }, ic('lock'))),
      h('span', { class: 'kn-witem-name kn-ellipsis', text: tk(`${sub}.${it.id}`) }),
      h('span', { class: 'kn-witem-src kn-ellipsis', text: it.unlocked ? (on ? t('collection.equipped') : '') : sourceText(it.source) }),
    );
    if (it.unlocked && !on) {
      tappable(el, () => {
        ctx.cb.onEquip?.(sub, it.id);
        ctx.rerender({ ...p, equipped: { ...p.equipped, [sub]: it.id } });
      }, ctx, `${t('collection.equip')} · ${tk(`${sub}.${it.id}`)}`);
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
