// Results: replay keeps playing behind; score (or time) counts up, breakdown rows count up staggered, stars
// stamp one by one, PB/ghost delta chips; buttons Tekrar (largest) / Paylaş / Düello Kodu / Sonraki.
// Half-flight variant: no stars, no record, one-line note.
import { h, ic, strip } from '../dom.ts';
import { t, tk, fmtInt, fmtIntDelta, fmtDelta, fmtTime, fmtDec, routeName, upper } from '../i18n.ts';
import { countUp, sequence } from '../anim.ts';
import type { ResultRowVM, ResultsProps, ShareKind } from '../types.ts';
import type { ScreenCtx, ScreenDef } from './screen.ts';
import { accentStyle, cosmeticName, eyebrow, taskLabel } from './common.ts';
import { cosmeticSwatch } from '../swatch.ts';
import { iconSvg } from '../icons.ts';

function rowLabel(r: ResultRowVM): string {
  switch (r.kind) {
    case 'proximity': return t('results.row.proximity');
    case 'grazes': return t('results.row.grazes', { n: r.n ?? 0 });
    case 'gates': return t('results.row.gates', { a: r.a ?? 0, b: r.b ?? 0 });
    case 'balloon': return t('results.row.balloon', { n: r.n ?? 0 });
    case 'thermal': return t('results.row.thermal', { n: r.n ?? 0 });
    case 'landing': return t('results.row.landing', { m: fmtDec(r.m ?? 0, 1) });
    case 'soft': return t('results.row.soft');
    case 'bold': return t('results.row.bold');
    case 'missed': return t('results.row.missed', { n: r.n ?? 0 });
    case 'flight': return t('results.row.flight');
  }
}
const isTimeRow = (r: ResultRowVM): boolean => r.kind === 'missed' || r.kind === 'flight';
function rowValue(r: ResultRowVM, v: number): string {
  if (r.kind === 'flight') return fmtTime(v);
  if (r.kind === 'missed') return `+${t('common.seconds', { n: v })}`;
  return `+${fmtInt(v)}`;
}

export const resultsScreen: ScreenDef<ResultsProps> = {
  layer: 'root',
  render(p, ctx) {
    const cb = ctx.cb;
    const timeMode = p.mode === 'daily' || (p.mode === 'duel' && p.dailyN !== undefined);
    const where = p.routeId ? routeName(p.routeId) : p.dailyN !== undefined ? t('duel.routeDaily', { n: p.dailyN }) : tk(`world.${p.world}`);
    const routeN = p.routeId ? Number(p.routeId.charAt(3)) : 0;
    const eyebrowText = p.routeId ? `${tk(`world.${p.world}`)} · ${t('common.route', { n: routeN })}` : tk(`world.${p.world}`);

    // Big number
    const big = h('div', { class: 'kn-res-big kn-display kn-num' });
    const bigTarget = timeMode ? p.timeSec : p.score;
    const fmtBig = timeMode ? (v: number) => fmtTime(v) : (v: number) => fmtInt(v);
    const fromBig = timeMode ? 0 : 0;
    const anim = !ctx.refresh;
    const cancelBig = countUp(big, bigTarget, fmtBig, { from: fromBig, ms: anim ? 1100 : 0, delay: anim ? 250 : 0 });
    ctx.onCleanup(cancelBig);

    const chips = h('div', { class: 'kn-res-chips' });
    if (p.duel) {
      const d = p.duel;
      const txt = d.won === null ? t('results.duelTie') : d.won ? t('results.duelWin', { d: fmtDec(Math.abs(d.deltaSec), 1) }) : t('results.duelLose', { d: fmtDec(Math.abs(d.deltaSec), 1) });
      chips.appendChild(h('span', { class: `kn-chip kn-chip--lg ${d.won ? 'kn-chip--pos' : d.won === false ? 'kn-chip--neg' : ''}`.trim() }, ic('duel'), h('span', { text: txt })));
    }
    if (!p.half && p.newBest) chips.appendChild(h('span', { class: 'kn-chip kn-chip--pos' }, ic('sparkle'), h('span', { text: t('results.newBest') })));
    if (!p.half && p.pbDelta !== undefined && p.pbDelta !== 0) {
      const better = timeMode ? p.pbDelta < 0 : p.pbDelta > 0;
      const val = timeMode ? fmtDelta(p.pbDelta, 1) : fmtIntDelta(p.pbDelta);
      chips.appendChild(h('span', { class: `kn-chip ${better ? 'kn-chip--pos' : 'kn-chip--neg'}` }, h('span', { text: t('results.pbDelta', { d: val }) })));
    }
    if (p.ghostDelta !== undefined && !p.duel) {
      chips.appendChild(h('span', { class: `kn-chip ${p.ghostDelta <= 0 ? 'kn-chip--pos' : 'kn-chip--neg'}` }, ic('ghost'), h('span', { text: t('results.ghostDelta', { d: fmtDelta(p.ghostDelta, 2) }) })));
    }
    if (p.assisted) chips.appendChild(h('span', { class: 'kn-chip' }, ic('lifebuoy'), h('span', { text: !p.half && p.newBest ? t('results.assistRecord') : t('results.assist') })));
    if (p.slow) chips.appendChild(h('span', { class: 'kn-chip' }, ic('turtle'), h('span', { text: t('results.slow') })));

    // Stars
    let starsEl: HTMLElement;
    if (p.half) {
      starsEl = h('p', { class: 'kn-res-half kn-caption', text: t('results.halfNote') });
    } else {
      starsEl = h('div', { class: 'kn-res-stars', role: 'img', 'aria-label': t('common.stars', { n: p.stars }) });
      const els: HTMLElement[] = [];
      for (let i = 0; i < 3; i++) {
        const s = h('span', { class: `kn-res-star ${i < (p.prevStars ?? 0) ? 'was-on' : ''}`.trim(), html: iconSvg('star', 'kn-icon kn-res-star-o') + iconSvg('starFill', 'kn-icon kn-res-star-f') });
        els.push(s);
        starsEl.appendChild(s);
      }
      const steps = els.slice(0, p.stars).map((s, i) => ({
        at: (anim ? 1500 : 0) + i * (anim ? 420 : 0),
        run: () => {
          s.classList.add('is-on');
          if (anim) ctx.sound('star', i);
        },
      }));
      if (anim && p.newBest) steps.push({ at: 1500 + p.stars * 420 + 120, run: () => ctx.sound('reward') });
      ctx.onCleanup(sequence(steps));
    }

    // Breakdown panel (each row ticks as it starts counting; tallyEnd when the big number lands)
    const panel = h('div', { class: 'kn-res-panel kn-panel' });
    if (anim) {
      const ticks = p.rows.map((_, i) => ({ at: 250 + i * 70, run: () => ctx.sound('tally', i) }));
      ticks.push({ at: 250 + 1100, run: () => ctx.sound('tallyEnd') });
      ctx.onCleanup(sequence(ticks));
    }
    p.rows.forEach((r, i) => {
      const v = h('span', { class: 'kn-res-v kn-num' });
      const row = h('div', { class: 'kn-res-row', style: anim ? `animation-delay:${200 + i * 70}ms` : '' }, h('span', { class: 'kn-res-l', text: rowLabel(r) }), v);
      ctx.onCleanup(countUp(v, r.value, (x) => rowValue(r, isTimeRow(r) ? x : Math.round(x)), { ms: anim ? 600 : 0, delay: anim ? 250 + i * 70 : 0 }));
      panel.appendChild(row);
    });
    if (p.tasksDone?.length) {
      for (const task of p.tasksDone) panel.appendChild(h('div', { class: 'kn-res-row kn-res-task' }, h('span', { class: 'kn-res-l' }, ic('check'), h('span', { text: taskLabel(task) })), h('span', { class: 'kn-res-v kn-eyebrow', text: upper(t('results.taskDone')) })));
    }

    // Actions
    const action = (label: string, icon: string, cls: string, fn: (() => void) | undefined, disabled = false): HTMLButtonElement => {
      const b = h('button', { class: `kn-btn ${cls}`.trim(), type: 'button', disabled }, ic(icon), h('span', { class: 'kn-btn-label', text: label }));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.sound(cls.includes('kn-btn--primary') ? 'confirm' : 'tap');
        fn?.();
      });
      return b;
    };
    const retry = action(t('results.retry'), 'retry', 'kn-btn--primary kn-btn--lg kn-btn--block kn-res-retry', cb.onResultsRetry);
    const kinds: ShareKind[] = p.shareKinds?.length ? p.shareKinds : ['card', 'text'];
    const root = h('section', { class: `kn-results ${p.half ? 'is-half' : ''} ${p.compact ? 'is-compact' : ''}`.trim(), style: accentStyle(p.world) });
    const openShare = (): void => {
      if (kinds.length === 1) {
        cb.onResultsShare?.(kinds[0]);
        return;
      }
      const close = (): void => sheet.remove();
      const opts = h('div', { class: 'kn-sharesheet-opts' });
      const ICON: Record<ShareKind, string> = { clip: 'play', card: 'frame', text: 'copy' };
      for (const k of kinds) {
        const b = h('button', { class: 'kn-option', type: 'button' }, h('span', { class: 'kn-option-icon' }, ic(ICON[k])), h('span', { class: 'kn-option-text' }, h('b', { text: t(`results.share.${k}` as 'results.share.card') }), h('small', { text: t(`results.share.${k}Sub` as 'results.share.cardSub') })));
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          ctx.sound('confirm');
          close();
          cb.onResultsShare?.(k);
        });
        opts.appendChild(b);
      }
      const sheet = h('div', { class: 'kn-sharesheet' }, h('div', { class: 'kn-cardlayer-dim' }), h('div', { class: 'kn-modal kn-panel kn-panel-strong kn-anim-sheet' }, h('h2', { class: 'kn-h2 kn-modal-title', text: t('results.share.title') }), opts, h('div', { class: 'kn-modal-actions' }, (() => {
        const c = h('button', { class: 'kn-btn kn-btn--quiet kn-btn--block', type: 'button' }, h('span', { text: t('common.cancel') }));
        c.addEventListener('click', (e) => {
          e.stopPropagation();
          ctx.sound('back');
          close();
        });
        return c;
      })())));
      sheet.addEventListener('click', (e) => {
        if (e.target === sheet || (e.target as HTMLElement).classList.contains('kn-cardlayer-dim')) close();
      });
      root.appendChild(sheet);
    };
    const share = action(t('results.share'), 'share', '', openShare, p.half);
    const code = p.duel ? action(t('results.rematch'), 'duel', '', cb.onRematchCode) : action(t('results.duelCode'), 'duel', '', cb.onResultsDuelCode, p.half || p.mode === 'free');
    const next = action(t('results.next'), 'next', '', cb.onResultsNext, !p.hasNext);

    // Progress: XP bar + Usta n/3 + stars to the next world + reward chip.
    let xpBlock: HTMLElement | null = null;
    if (p.xp) {
      const x = p.xp;
      const fill = h('i', { style: `transform:scaleX(${anim ? x.fromFrac : x.toFrac})` });
      const gained = h('span', { class: 'kn-xp-gain kn-num' });
      ctx.onCleanup(countUp(gained, x.gained, (v) => t('results.xp', { n: Math.round(v) }), { ms: anim ? 900 : 0, delay: anim ? 1300 : 0 }));
      if (anim) {
        const id = window.setTimeout(() => (fill.style.transform = `scaleX(${x.toFrac})`), 1300);
        ctx.onCleanup(() => clearTimeout(id));
      }
      xpBlock = h('div', { class: 'kn-xp' }, h('span', { class: 'kn-xp-level kn-display-600', text: t('results.rankLevel', { n: x.level }) }), h('span', { class: 'kn-xp-bar' }, fill), gained);
    }
    const metaChips: HTMLElement[] = [];
    if (p.ustaProgress) metaChips.push(h('span', { class: 'kn-chip' }, ic('task'), h('span', { text: t('results.ustaProgress', { done: p.ustaProgress.done, total: p.ustaProgress.total }) })));
    if (p.nextWorld && p.nextWorld.missing > 0) metaChips.push(h('span', { class: 'kn-chip' }, ic('starFill', 'kn-icon kn-chip-star'), h('span', { text: t('results.nextWorld', { place: tk(`worldTo.${p.nextWorld.world}`), n: p.nextWorld.missing }) })));
    let rewardEl: HTMLElement | null = null;
    if (p.reward) {
      const ref = p.reward.ref;
      const [kind, id] = ref.split(':');
      const equip = h('button', { class: 'kn-btn kn-reward-equip', type: 'button' }, h('span', { text: t('results.equip') }));
      equip.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.sound('confirm');
        cb.onEquip?.(kind as 'pattern', id);
        equip.replaceChildren(ic('check'), h('span', { text: t('collection.equipped') }));
        equip.setAttribute('disabled', '');
      });
      rewardEl = h('div', { class: 'kn-reward-chip kn-reward-chip--res' }, h('span', { class: 'kn-reward-sw', html: cosmeticSwatch(ref) }), h('span', { class: 'kn-reward-text' }, h('b', { text: t('results.reward', { name: cosmeticName(ref) }) }), h('small', { text: tk(`kind.${kind}`, undefined, '') })), cb.onEquip ? equip : null);
      if (anim) ctx.onCleanup(sequence([{ at: 2600, run: () => ctx.sound('reward') }]));
    }
    const meta = xpBlock || metaChips.length ? h('div', { class: 'kn-res-meta' }, xpBlock, metaChips.length ? h('div', { class: 'kn-res-metachips' }, ...metaChips) : null) : null;

    if (p.compact) {
      const cont = action(t('results.continue'), 'play', 'kn-btn--primary kn-btn--lg kn-btn--block', cb.onResultsContinue);
      root.append(
        h('div', { class: 'kn-results-scrim' }),
        h('div', { class: 'kn-results-compact kn-safe' }, h('div', { class: 'kn-modal kn-panel kn-panel-strong kn-anim-sheet' }, eyebrow(eyebrowText), h('h1', { class: 'kn-h2 kn-modal-title', text: where }), starsEl, h('div', { class: 'kn-res-compact-score kn-display kn-num' }, big), metaChips.length ? h('div', { class: 'kn-res-metachips' }, ...metaChips) : null, rewardEl, h('div', { class: 'kn-modal-actions' }, cont))),
      );
      return root;
    }

    root.append(
      h('div', { class: 'kn-results-scrim' }),
      h(
        'div',
        { class: 'kn-results-inner kn-safe' },
        h(
          'div',
          { class: 'kn-results-left' },
          h('header', { class: 'kn-res-head' }, eyebrow(eyebrowText), h('h1', { class: 'kn-h2 kn-res-title', text: where }), h('span', { class: `kn-res-status ${p.half ? 'is-half' : ''}`.trim(), text: p.half ? t('results.half') : t('results.complete') })),
          h('div', { class: 'kn-res-hero' }, eyebrow(timeMode ? t('common.time') : t('common.score')), big, chips, starsEl, p.strip ? h('div', { class: 'kn-res-strip' }, eyebrow(t('share.prox')), strip(p.strip, 'kn-strip kn-strip--lg')) : null),
          meta,
          h('div', { class: 'kn-res-actions' }, retry, h('div', { class: 'kn-res-actions-row' }, share, code, next)),
        ),
        h('div', { class: 'kn-results-right kn-scroll' }, rewardEl, panel),
      ),
    );
    return root;
  },
};

export type { ScreenCtx };
