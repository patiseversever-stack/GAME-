// Route list for a world: mini-map (3D relief hook or SVG top-down map with contours), 4 routes with
// difficulty, stars, best score/time and 3 usta tasks (check state). Selected route expands with "Uç".
import type { WorldId } from '../../sim/types.ts';
import { h, ic, stars } from '../dom.ts';
import { t, tk, fmtInt, fmtTime, routeName } from '../i18n.ts';
import { STARS_PER_WORLD } from '../content.ts';
import { WORLD_ACCENT, WORLD_ART } from '../theme.ts';
import type { RouteVM, RoutesProps } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { difficultyPips, eyebrow, page, starCount, taskLabel, tappable, worldIndexLabel } from './common.ts';
import { mix } from '../art.ts';

/** Deterministic fallback line (when route geometry is not provided). */
function fallbackLine(i: number): [number, number][] {
  const pts: [number, number][] = [];
  const a = 0.6 + i * 0.37;
  for (let k = 0; k <= 24; k++) {
    const s = k / 24;
    const x = 0.12 + s * 0.76 + Math.sin(s * 5.2 + a * 2.1) * 0.06;
    const y = 0.18 + i * 0.05 + s * 0.6 + Math.sin(s * 3.3 + a) * 0.1;
    pts.push([x, y]);
  }
  return pts;
}

function miniMap(world: WorldId, routes: RouteVM[], selected: string | undefined): string {
  const W = 360;
  const H = 200;
  const acc = WORLD_ACCENT[world];
  const art = WORLD_ART[world];
  // Normalise all provided lines into a shared box (top-down x→right, z→down).
  const lines = routes.map((r, i) => (r.line && r.line.length > 1 ? r.line : null) ?? fallbackLine(i));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const l of lines) for (const [x, y] of l) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const span = Math.max(maxX - minX, (maxY - minY) * (W / H), 1e-6);
  const sx = (W - 48) / span;
  const ox = (W - (maxX - minX) * sx) / 2;
  const oy = (H - (maxY - minY) * sx) / 2;
  const P = (x: number, y: number): string => `${(ox + (x - minX) * sx).toFixed(1)} ${(oy + (y - minY) * sx).toFixed(1)}`;
  let contours = '';
  for (let i = 0; i < 7; i++) {
    const cx = W * 0.52 + Math.sin(i * 1.7) * 18;
    const cy = H * 0.5 + Math.cos(i * 1.3) * 10;
    const rx = 30 + i * 26;
    const ry = 18 + i * 15;
    let d = '';
    for (let k = 0; k <= 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      const n = 1 + 0.08 * Math.sin(a * 3 + i) + 0.05 * Math.sin(a * 5 - i * 0.7);
      d += `${k ? 'L' : 'M'}${(cx + Math.cos(a) * rx * n).toFixed(1)} ${(cy + Math.sin(a) * ry * n).toFixed(1)} `;
    }
    contours += `<path d="${d}Z" fill="none" stroke="#FFFFFF" stroke-opacity="${(0.05 + (i % 3 === 0 ? 0.05 : 0)).toFixed(2)}" stroke-width="1"/>`;
  }
  let paths = '';
  let marks = '';
  routes.forEach((r, i) => {
    const l = lines[i];
    const d = l.map(([x, y], k) => `${k ? 'L' : 'M'}${P(x, y)}`).join(' ');
    const sel = r.id === selected;
    paths += sel
      ? `<path d="${d}" fill="none" stroke="${acc}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="${d}" fill="none" stroke="#F5F1E8" stroke-opacity="${r.locked ? 0.18 : 0.42}" stroke-width="1.3" stroke-dasharray="${r.locked ? '2 4' : '0'}" stroke-linecap="round"/>`;
    const [sx0, sy0] = P(l[0][0], l[0][1]).split(' ').map(Number);
    const [ex, ey] = P(l[l.length - 1][0], l[l.length - 1][1]).split(' ').map(Number);
    marks += `<g opacity="${sel ? 1 : r.locked ? 0.35 : 0.75}"><circle cx="${sx0}" cy="${sy0}" r="8" fill="#0E141C" stroke="${sel ? acc : '#F5F1E8'}" stroke-opacity="${sel ? 1 : 0.5}"/><text x="${sx0}" y="${sy0 + 3.6}" text-anchor="middle" font-family="Barlow Condensed" font-weight="700" font-size="10.5" fill="${sel ? acc : '#F5F1E8'}">${i + 1}</text></g>`;
    if (sel) marks += `<circle cx="${ex}" cy="${ey}" r="6" fill="none" stroke="${acc}" stroke-width="1.4"/><circle cx="${ex}" cy="${ey}" r="2" fill="${acc}"/>`;
  });
  const bg = `<defs><radialGradient id="mm${world}" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="${mix(art.far, '#0E141C', 0.55)}"/><stop offset="1" stop-color="${mix(art.near, '#0E141C', 0.82)}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#mm${world})"/>`;
  const grid = `<path d="M${W / 3} 0V${H}M${(2 * W) / 3} 0V${H}M0 ${H / 2}H${W}" stroke="#FFFFFF" stroke-opacity="0.05"/>`;
  const north = `<g transform="translate(${W - 18} 18)" opacity="0.6"><path d="M0 -8 L3 3 L0 1 L-3 3Z" fill="#F5F1E8"/><text y="14" text-anchor="middle" font-family="Barlow Condensed" font-weight="600" font-size="8" fill="#F5F1E8">K</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${bg}${grid}${contours}${paths}${marks}${north}</svg>`;
}

function routeCard(r: RouteVM, index: number, selected: boolean, ctx: ScreenCtx, select: (id: string) => void): HTMLElement {
  const name = routeName(r.id);
  const head = h(
    'div',
    { class: 'kn-rcard-head' },
    h('span', { class: 'kn-rcard-num kn-display kn-num', text: String(index + 1).padStart(2, '0') }),
    h('span', { class: 'kn-rcard-titles' }, h('span', { class: 'kn-rcard-name kn-ellipsis', text: name }), h('span', { class: 'kn-rcard-diff' }, difficultyPips(r.difficulty), h('span', { class: 'kn-caption kn-num', text: t('common.difficulty', { n: r.difficulty }) }))),
    r.locked ? h('span', { class: 'kn-rcard-lock' }, ic('lock')) : stars(r.stars),
  );
  const el = h('article', { class: `kn-rcard ${selected ? 'is-open' : ''} ${r.locked ? 'is-locked' : ''}`.trim() }, head);
  if (r.locked) {
    el.appendChild(h('div', { class: 'kn-rcard-lockline kn-caption', text: t('routes.locked') }));
    return el;
  }
  if (!selected) {
    tappable(el, () => select(r.id), ctx, name);
    return el;
  }
  const best = h(
    'div',
    { class: 'kn-rcard-best' },
    h('span', { class: 'kn-rstat' }, eyebrow(t('routes.bestScore')), h('b', { class: 'kn-display kn-num', text: r.bestScore !== undefined ? fmtInt(r.bestScore) : '—' })),
    h('span', { class: 'kn-rstat' }, eyebrow(t('routes.bestTime')), h('b', { class: 'kn-display kn-num', text: r.bestTimeSec !== undefined ? fmtTime(r.bestTimeSec) : '—' })),
    r.slow ? h('span', { class: 'kn-rstat kn-rstat--icon', title: t('settings.slowMode') }, ic('turtle')) : null,
  );
  const tasks = h('ul', { class: 'kn-tasks' });
  for (const task of r.tasks.slice(0, 3)) {
    tasks.appendChild(
      h('li', { class: `kn-task ${task.done ? 'is-done' : ''}`.trim() }, h('span', { class: 'kn-task-check' }, task.done ? ic('check') : null), h('span', { class: 'kn-task-text', text: taskLabel(task.type, task.count, task.value) })),
    );
  }
  const fly = h('button', { class: 'kn-btn kn-btn--primary kn-btn--lg kn-btn--block', type: 'button' }, ic('play'), h('span', { text: t('routes.fly') }));
  fly.addEventListener('click', (e) => {
    e.stopPropagation();
    ctx.sound('tap');
    ctx.cb.onPlayRoute?.(r.id);
  });
  el.append(
    h('div', { class: 'kn-rcard-body' }, r.startType ? h('div', { class: 'kn-caption kn-rcard-jump' }, ic('jump'), h('span', { text: tk('routes.jumpFrom', { type: r.startType }) })) : null, best, eyebrow(t('routes.tasks'), 'kn-tasks-title'), tasks, fly),
  );
  return el;
}

export const routesScreen: ScreenDef<RoutesProps> = {
  layer: 'page',
  render(p, ctx) {
    const selected = p.selected ?? p.routes.find((r) => !r.locked && r.stars < 3)?.id ?? p.routes[0]?.id;
    const select = (id: string): void => ctx.rerender({ ...p, selected: id });
    const map = h('div', { class: 'kn-minimap' });
    if (ctx.cb.mountMiniMap) {
      const cleanup = ctx.cb.mountMiniMap(map, p.world, selected);
      if (cleanup) ctx.onCleanup(cleanup);
    } else {
      map.innerHTML = miniMap(p.world, p.routes, selected);
    }
    const list = h('div', { class: 'kn-rlist' });
    p.routes.forEach((r, i) => list.appendChild(routeCard(r, i, r.id === selected, ctx, select)));
    return page(ctx, {
      title: tk(`world.${p.world}`),
      eyebrow: worldIndexLabel(p.world),
      right: starCount(p.stars, STARS_PER_WORLD),
      world: p.world,
      cls: 'kn-page--routes',
      body: h('div', { class: 'kn-routes-layout' }, h('div', { class: 'kn-routes-map' }, map), list),
    });
  },
};
