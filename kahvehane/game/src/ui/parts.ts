// Ortak parçalar: modal iskeleti, bildirim, "Yakında" penceresi, avatar/seviye/jeton kapsülü HTML'i.
import type {Profile, Sounds} from './types';
import {EASE, Scope, ANIM, esc, fmt, h, initials, play, q} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import type {Fx} from './fx';
import {g3} from './fx';

export interface Ctx {
  layer: HTMLElement;
  sounds: Sounds;
  fx: Fx;
}

export const avatarHtml = (name: string, cls = ''): string =>
  `<span class="kh-avatar ${cls}"><span class="kh-avatar__txt">${esc(initials(name))}</span></span>`;

export const levelHtml = (p: Profile): string => {
  const k = p.xpNext > 0 ? Math.max(0, Math.min(1, p.xp / p.xpNext)) : 0;
  return `<span class="kh-lvl"><b class="kh-lvl__badge kh-num">${p.level}</b><span class="kh-xp"><i class="kh-xp__fill" style="transform:scaleX(${k.toFixed(3)})"></i></span></span>`;
};

export const capsuleHtml = (coins: number, plus = false, cls = ''): string =>
  `<div class="kh-capsule ${cls}" data-coins><img class="kh-capsule__ico" src="${ASSETS.icon_coin}" alt=""><b class="kh-capsule__val kh-num">${fmt(coins)}</b>${
    plus ? `<button class="kh-plus" data-act="shop" aria-label="Jeton al">${I.plus}</button>` : ''}</div>`;

export const titleHtml = (text: string, cls = ''): string => `<div class="kh-title ${cls}">${g3(text)}</div>`;
export const ruleHtml = (): string => `<div class="kh-rule"><i></i>${I.tulip}<i></i></div>`;

export interface ModalHandle {
  el: HTMLElement;
  panel: HTMLElement;
  scope: Scope;
  /** Kapanış animasyonu + temizlik */
  close(): Promise<void>;
}

/** Ortadaki panel + karartma. `onX` verilirse sağ üstte kapatma düğmesi olur. */
export function openModal(ctx: Ctx, o: {cls: string; title?: string; body: string; onX?: () => void; z?: number}): ModalHandle {
  const scope = new Scope();
  const el = h('div', `kh-modal ${o.cls}`);
  if (o.z) el.style.zIndex = String(o.z);
  el.innerHTML = `<div class="kh-modal__scrim"></div>
    <div class="kh-modal__panel kh-panel" role="dialog" aria-modal="true">
      ${o.onX ? `<button class="kh-iconbtn kh-modal__x" data-act="x" aria-label="Kapat">${I.close}</button>` : ''}
      ${o.title ? `<div class="kh-modal__head">${titleHtml(o.title, 'kh-modal__title')}${ruleHtml()}</div>` : ''}
      ${o.body}
    </div>`;
  ctx.layer.append(el);
  const panel = q(el, '.kh-modal__panel');
  const scrim = q(el, '.kh-modal__scrim');
  play(scrim, [{opacity: 0}, {opacity: 1}], {duration: 220, easing: 'ease-out'});
  play(panel, [{transform: 'translateY(18px) scale(.96)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, easing: EASE.spring});
  if (o.onX) {
    const x = q(el, '[data-act=x]');
    scope.on(x, 'click', () => {
      ctx.sounds.tap();
      o.onX?.();
    });
  }
  let closing: Promise<void> | null = null;
  return {
    el,
    panel,
    scope,
    close() {
      if (closing) return closing;
      el.style.pointerEvents = 'none';
      closing = new Promise(res => {
        if (!ANIM) {
          scope.dispose();
          el.remove();
          return res();
        }
        scrim.animate([{opacity: 1}, {opacity: 0}], {duration: 200, easing: 'ease-in', fill: 'forwards'});
        const a = panel.animate([{transform: 'none', opacity: 1}, {transform: 'scale(.97)', opacity: 0}], {duration: 180, easing: 'ease-in', fill: 'forwards'});
        a.onfinish = () => {
          scope.dispose();
          el.remove();
          res();
        };
      });
      return closing;
    },
  };
}

/** Bir paneldeki [data-act] tıklamalarını tek dinleyiciyle yakalar. */
export function onAct(scope: Scope, root: HTMLElement, fn: (act: string, el: HTMLElement) => void): void {
  scope.on(root, 'click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-act]');
    if (!b || !root.contains(b) || (b as HTMLButtonElement).disabled) return;
    fn(b.dataset.act!, b);
  });
}

let toastEl: HTMLElement | null = null;
let toastTimer = 0;
/** Kısa bilgi şeridi (üst orta). */
export function toast(ctx: Ctx, text: string, icon: string = I.lock): void {
  if (!toastEl) toastEl = h('div', 'kh-toast');
  ctx.layer.append(toastEl);
  toastEl.innerHTML = `${icon}<span>${esc(text)}</span>`;
  clearTimeout(toastTimer);
  play(toastEl, [{transform: 'translate(-50%, -14px)', opacity: 0}, {transform: 'translate(-50%, 0)', opacity: 1}], {duration: 260, easing: EASE.spring, fill: 'both'});
  if (ANIM)
    toastTimer = window.setTimeout(() => {
      const t = toastEl;
      if (!t) return;
      const a = t.animate([{opacity: 1}, {opacity: 0}], {duration: 220, fill: 'forwards'});
      a.onfinish = () => t.remove();
    }, 1700);
}

/** "Yakında" penceresi (Mağaza, Görevler, Profil…). */
export function soon(ctx: Ctx, title: string, icon: string, text: string): Promise<void> {
  return new Promise(res => {
    let m: ModalHandle | null = null;
    const done = () => {
      m?.close();
      res();
    };
    m = openModal(ctx, {
      cls: 'kh-soon',
      title,
      onX: done,
      body: `<img class="kh-soon__ico" src="${icon}" alt="">
        <div class="kh-soon__t">${esc(text)}</div>
        <button class="kh-btn kh-btn--1" data-act="ok">Tamam</button>`,
    });
    onAct(m.scope, m.panel, act => {
      if (act === 'ok') {
        ctx.sounds.tap();
        done();
      }
    });
  });
}
