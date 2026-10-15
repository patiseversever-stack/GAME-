// Ortak parçalar: arena zemini, kod çizimi logo, modal iskeleti, bildirim, "Yakında" penceresi, avatar/seviye/jeton kapsülü HTML'i.
import type {Profile, Sounds} from './types';
import {EASE, Scope, ANIM, esc, fmt, h, initials, play, q} from './dom';
import {ASSETS} from './assets';
import {I, SUIT, SUIT_TILE} from './icons';
import type {Fx} from './fx';
import {g3} from './fx';

export interface Ctx {
  layer: HTMLElement;
  sounds: Sounds;
  fx: Fx;
}

// Arena deseni CSS değişkeni olarak bir kez kurulur (masa katmanı da var(--suit-tile) ile kullanabilir).
if (typeof document !== 'undefined') document.documentElement.style.setProperty('--suit-tile', SUIT_TILE);

/**
 * Arena zemini: merkezde mavi ışık → kenarda gece mavisi, yavaş dönen ışık hüzmeleri (yalnız transform),
 * düşük kontrastlı dağınık takım deseni, kenar karartması. `cls` ile ekran özel ayar (ör. ışık merkezi).
 */
export const arenaHtml = (cls = ''): string =>
  `<div class="kh-arena ${cls}"><i class="kh-arena__rays"></i><i class="kh-arena__suits"></i><i class="kh-arena__vig"></i></div>`;

let wmSeq = 0;
/**
 * Kod çizimi logo (satır içi SVG): tıknaz "PİŞTİ" — harfler sırayla eğik, sarı→turuncu dolgu, beyaz iç şerit,
 * kalın lacivert kontur + alt gölge, üst yarıda parlak cila; altında kırmızı "KAHVEHANE" kurdelesi ve dört takım süsü.
 * Kıvılcımlar HTML'dir (SVG dışı): dönen/yanıp sönen yalnız transform + opacity.
 */
export function wordmarkHtml(cls = ''): string {
  const id = 'khwm' + ++wmSeq;
  const word = `<text id="${id}t" x="180" y="118" text-anchor="middle" font-family="'Lilita One', Nunito, sans-serif" font-size="112" letter-spacing="2" rotate="-7 5 -4 6 -6" dy="0 -3 4 -4 3">PİŞTİ</text>`;
  const st = 'stroke-linejoin="round" stroke-linecap="round"';
  const suit = (k: keyof typeof SUIT, x: number, y: number, r: number, c: string) =>
    `<g transform="translate(${x} ${y}) rotate(${r}) scale(.78) translate(-12 -12)"><g fill="#0a1033" stroke="#0a1033" stroke-width="5" ${st}>${SUIT[k]}</g><g fill="${c}">${SUIT[k]}</g></g>`;
  return `<div class="kh-wm ${cls}" role="img" aria-label="Kahvehane Pişti">
    <svg class="kh-wm__svg" viewBox="0 0 360 196" aria-hidden="true">
      <defs>
        ${word}
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".22" stop-color="#fff27a"/><stop offset=".46" stop-color="#ffd23f"/><stop offset=".47" stop-color="#ffbe1c"/><stop offset=".78" stop-color="#ff9f1a"/><stop offset="1" stop-color="#ff7a0a"/></linearGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".44" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a8e"/><stop offset=".45" stop-color="#ff2e4d"/><stop offset="1" stop-color="#c40a2f"/></linearGradient>
        <path id="${id}p" d="M84 166 Q180 184 276 166"/>
      </defs>
      <g class="kh-wm__rib">
        <path d="M92 148 L46 146 L62 162 L44 180 L96 178 Z" fill="#a8001e" stroke="#0a1033" stroke-width="5" ${st}/>
        <path d="M268 148 L314 146 L298 162 L316 180 L264 178 Z" fill="#a8001e" stroke="#0a1033" stroke-width="5" ${st}/>
        <path d="M72 144 Q180 162 288 144 L288 176 Q180 194 72 176 Z" fill="url(#${id}r)" stroke="#0a1033" stroke-width="5" ${st}/>
        <path d="M78 149 Q180 166 282 149" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>
        <text font-family="'Lilita One', Nunito, sans-serif" font-size="21" letter-spacing="5" fill="#fff" stroke="#0a1033" stroke-width="5" paint-order="stroke" ${st}><textPath href="#${id}p" startOffset="50%" text-anchor="middle">KAHVEHANE</textPath></text>
      </g>
      <use href="#${id}t" fill="#0a1033" stroke="#0a1033" stroke-width="26" ${st} transform="translate(0 9)"/>
      <use href="#${id}t" fill="#0a1033" stroke="#0a1033" stroke-width="26" ${st}/>
      <use href="#${id}t" fill="#fff" stroke="#fff" stroke-width="9" ${st}/>
      <use href="#${id}t" fill="url(#${id}f)"/>
      <use href="#${id}t" fill="url(#${id}g)"/>
      ${suit('s', 26, 116, -16, '#1f7bff')}${suit('h', 334, 112, 14, '#ff2e4d')}
    </svg>
    <i class="kh-wm__spark is-a"></i><i class="kh-wm__spark is-b"></i><i class="kh-wm__spark is-c"></i>
  </div>`;
}

export const avatarHtml = (name: string, cls = ''): string =>
  `<span class="kh-avatar ${cls}"><span class="kh-avatar__txt">${esc(initials(name))}</span></span>`;

/** Altıgen seviye taşı (ben: mavi, rakip: mor). */
export const gemHtml = (level: number, me = true): string =>
  `<span class="kh-gemwrap"><span class="kh-gem${me ? ' is-me' : ''}"><b class="kh-num">${level}</b></span></span>`;

export const levelHtml = (p: Profile): string => {
  const k = p.xpNext > 0 ? Math.max(0, Math.min(1, p.xp / p.xpNext)) : 0;
  return `<span class="kh-lvl">${gemHtml(p.level)}<span class="kh-xp"><i class="kh-xp__fill" style="transform:scaleX(${k.toFixed(3)})"></i></span></span>`;
};

/** Rakip seviyesi: verilmişse o, yoksa zorluktan. */
export const oppLevel = (o: {level?: number; difficulty: number}): number => o.level ?? [9, 18, 28][Math.max(0, Math.min(2, o.difficulty - 1))];

export const capsuleHtml = (coins: number, plus = false, cls = ''): string =>
  `<div class="kh-capsule ${cls}" data-coins><img class="kh-capsule__ico" src="${ASSETS.icon_coin}" alt=""><b class="kh-capsule__val kh-num">${fmt(coins)}</b>${
    plus ? `<button class="kh-plus" data-act="shop" aria-label="Jeton al">${I.plus}</button>` : ''}</div>`;

export const titleHtml = (text: string, cls = '', g3cls = ''): string => `<div class="kh-title ${cls}">${g3(text, g3cls)}</div>`;

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
      ${o.title ? `<div class="kh-modal__head">${titleHtml(o.title, 'kh-modal__title')}</div>` : ''}
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
      body: `<div class="kh-soon__ico"><img src="${icon}" alt=""></div>
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
