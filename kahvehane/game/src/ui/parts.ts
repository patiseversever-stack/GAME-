// Ortak parçalar: arena zemini, kod çizimi logo, modal iskeleti, bildirim, seviye taşı/jeton kapsülü HTML'i,
// karakter avatarı (çerçeveli), canlı portre (tek görsel + nefes; poz = anında değişim), balon yerleşimi + daktilo,
// kaydırmalı vitrin (momentumlu), alt pencere, dört renk perde geçişi.
import ARENA_RAYS from './img/arena-rays.webp';
import type {MenuTalk, Sounds} from './types';
import {EASE, Scope, ANIM, clamp, esc, fmt, h, play, q, rnd} from './dom';
import {ASSETS} from './assets';
import {I, SUIT, SUIT_TILE, suitSvg, type SuitKey} from './icons';
import type {Fx} from './fx';
import {g3} from './fx';
import {RARITY_INFO} from '../game/catalog';
import type {CharDef, Pose, Rarity} from '../game/roster';

export interface Ctx {
  layer: HTMLElement;
  sounds: Sounds;
  fx: Fx;
  /** Menü konuşmaları (galeri / market): tek konuşma yöneticisinden geçer. Yoksa sessiz (yalnız yazı). */
  talk?: MenuTalk;
}

// Arena deseni CSS değişkeni olarak bir kez kurulur (masa katmanı da var(--suit-tile) ile kullanabilir).
if (typeof document !== 'undefined') document.documentElement.style.setProperty('--suit-tile', SUIT_TILE);

/**
 * Arena zemini: merkezde mavi ışık → kenarda gece mavisi, yavaş dönen ışık hüzmeleri (yalnız transform),
 * düşük kontrastlı dağınık takım deseni, kenar karartması. `cls` ile ekran özel ayar (ör. ışık merkezi).
 */
/**
 * Arena zemini. Işınlar: sönme maskesi işlenmiş küçük görsel (768 px, 26 KB) — tarayıcı onu doğrudan GPU dokusu olarak
 * kullanır ve yalnız döndürür (maske/filtre/yeniden çizim yok; boşta da dönmesi ucuz). Dönen katmanı calm.ts durdurmaz (kh-keep).
 */
export const arenaHtml = (cls = ''): string =>
  `<div class="kh-arena ${cls}"><img class="kh-arena__rays kh-keep" src="${ARENA_RAYS}" alt="" decoding="async" draggable="false"><i class="kh-arena__suits"></i><i class="kh-arena__vig"></i></div>`;

let wmSeq = 0;
/**
 * Kod çizimi logo (satır içi SVG): tıknaz "PİŞTİ" — harfler sırayla eğik, sarı→turuncu dolgu, beyaz iç şerit,
 * kalın lacivert kontur + alt gölge, üst yarıda parlak cila; altında kırmızı "KAHVEHANE" kurdelesi ve dört takım süsü.
 * Kıvılcımlar HTML'dir (SVG dışı): dönen/yanıp sönen yalnız transform + opacity.
 */
export function wordmarkHtml(cls = '', fan = true): string {
  const id = 'khwm' + ++wmSeq;
  const word = `<text id="${id}t" x="180" y="118" text-anchor="middle" font-family="'Lilita One', Nunito, sans-serif" font-size="112" letter-spacing="2" rotate="-7 5 -4 6 -6" dy="0 -3 4 -4 3">PİŞTİ</text>`;
  const st = 'stroke-linejoin="round" stroke-linecap="round"';
  // Harflerin arkasından yelpaze gibi açılan dört kart (♣ ♦ ♥ ♠): dört renk kimliği
  const card = (k: keyof typeof SUIT, a: number, c: string) =>
    `<g transform="rotate(${a} 180 176)"><rect x="149" y="-38" width="62" height="88" rx="10" fill="#fff" stroke="#0a1033" stroke-width="5.5"/>
      <rect x="155.5" y="-31.5" width="49" height="75" rx="6" fill="none" stroke="${c}" stroke-opacity=".4" stroke-width="2.5"/>
      <g transform="translate(180 -6) scale(1.35) translate(-12 -12)" fill="${c}">${SUIT[k]}</g></g>`;
  const vb = fan ? '0 -46 360 242' : '0 0 360 196';
  return `<div class="kh-wm ${cls}" role="img" aria-label="Kahvehane Pişti" style="aspect-ratio:${vb.split(' ').slice(2).join('/')}">
    <svg class="kh-wm__svg" viewBox="${vb}" aria-hidden="true">
      <defs>
        ${word}
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".22" stop-color="#fff27a"/><stop offset=".46" stop-color="#ffd23f"/><stop offset=".47" stop-color="#ffbe1c"/><stop offset=".78" stop-color="#ff9f1a"/><stop offset="1" stop-color="#ff7a0a"/></linearGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".44" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a8e"/><stop offset=".45" stop-color="#ff2e4d"/><stop offset="1" stop-color="#c40a2f"/></linearGradient>
        <path id="${id}p" d="M84 166 Q180 184 276 166"/>
      </defs>
      ${fan ? `<g class="kh-wm__fan">${card('c', -36, '#16c45b')}${card('d', -12, '#ffb400')}${card('h', 12, '#ff2e4d')}${card('s', 36, '#1f7bff')}</g>` : ''}
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
    </svg>
    <i class="kh-wm__spark is-a"></i><i class="kh-wm__spark is-b"></i><i class="kh-wm__spark is-c"></i>
  </div>`;
}

/** Altıgen seviye taşı (ben: mavi, rakip: mor). */
export const gemHtml = (level: number, me = true): string =>
  `<span class="kh-gemwrap"><span class="kh-gem${me ? ' is-me' : ''}"><b class="kh-num">${level}</b></span></span>`;

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
      ${o.title ? `<div class="kh-modal__head">${titleHtml(o.title, 'kh-modal__title', 'is-white')}</div>` : ''}
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

// =====================================================================================================
// Karakter avatarı: dairesel kırpılmış portre + kuşanılmış çerçeve (.kh-frame--<id>, themes/frames.css).
// =====================================================================================================
export const charAvatarHtml = (c: CharDef, frame = 'standart', cls = '', pose: Pose = 'notr'): string =>
  `<span class="kh-ava kh-frame kh-frame--${esc(frame)} ${cls}" data-char="${c.id}" style="--c:${c.color}"><span class="kh-ava__clip"><img class="kh-ava__img" src="${c.poses[pose]}" alt=""></span></span>`;

/** Nadirlik rozeti (Sıradan / Nadir / Destansı / Efsanevi). */
export const rarityHtml = (r: Rarity, cls = ''): string => `<span class="kh-rar is-${r} ${cls}">${RARITY_INFO[r].name}</span>`;

/** Jeton simgesi + sayı. */
export const coinsHtml = (n: number, cls = ''): string => `<span class="kh-coins ${cls}"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(n)}</b></span>`;

/** Zorluk yıldızları (1-3). */
export const starsHtml = (n: number): string => `<span class="kh-stars">${[1, 2, 3].map(d => `<i class="${d <= n ? 'on' : ''}"></i>`).join('')}</span>`;

/** Dönen ışık hüzmesi (kutlama arkası). */
export const raysHtml = (cls = ''): string => `<i class="kh-rays ${cls}"></i>`;

/**
 * Süs döngüsü (nefes, kıpırtı, nabız) başlatılabilir mi: donmuş çekimde, düşük cihazda (.kh-low) ve azaltılmış harekette hayır.
 * WAAPI döngüleri CSS sınıfına bağlı olmadığı için bu kontrol onları başlatan yerde yapılır.
 */
export function decorLoops(): boolean {
  return ANIM && !document.documentElement.classList.contains('kh-low') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// =====================================================================================================
// Canlı portre: TEK <img>. Poz değişimi = önceden çözülmüş (decode) görselin anında yerine konması + kısa yaylı "pop"
// (yalnız transform). Üst üste iki görsel ve çapraz geçiş YOK: pozların baş konumu farklı, karışınca hayalet yüz oluyordu.
// Boşta yaşam: sarmalayıcıda tek, ucuz nefes (yalnız transform). Görselde filtre/maske yok; gölge arkada durağan bir öğe.
// Yalnız gösterilen poz iner; başka pozlar ancak istenince (preload) ya da gösterilirken çözülür.
// Göz kırpma isteğe bağlı (varsayılan KAPALI); açıksa o da anında değişimdir, asla geçiş değil.
// =====================================================================================================
export class Portrait {
  readonly el: HTMLElement;
  private popEl: HTMLElement;
  private img: HTMLImageElement;
  /** Bu portrenin görselleri (adres → <img> + çözülme sözü); aynı öğe tekrar kullanılır, yeniden çözülmez. */
  private cache = new Map<string, {im: HTMLImageElement; ready: Promise<void>}>();
  private fade: boolean;
  private char: CharDef;
  private restPose: Pose;
  private cur: Pose;
  private seq = 0;
  private blinkT = 0;
  private poseT = 0;
  private inEl: HTMLElement;
  private breathA: Animation | null = null;
  alive = true;

  /**
   * fade: görselin alt kenarı ve alt köşeleri yumuşakça solar (bir kez tuvalde pişirilir; canlı maske yok).
   * shadow: arkada durağan yumuşak gölge (varsayılan açık).
   */
  constructor(char: CharDef, o: {pose?: Pose; cls?: string; blink?: boolean; breathe?: boolean; fade?: boolean; shadow?: boolean} = {}) {
    this.char = char;
    this.fade = !!o.fade;
    this.restPose = this.cur = o.pose ?? 'notr';
    this.el = h('div', `kh-pt ${o.cls ?? ''}`);
    this.el.innerHTML = `${o.shadow === false ? '' : '<i class="kh-pt__sh"></i>'}<div class="kh-pt__pop"><div class="kh-pt__in"></div></div>`;
    this.popEl = q(this.el, '.kh-pt__pop');
    this.inEl = q(this.el, '.kh-pt__in');
    this.img = this.entry(char.poses[this.restPose]).im;
    this.inEl.append(this.img);
    this.breathe(o.breathe !== false);
    if (o.blink) {
      this.preload(['kirpma']);
      this.scheduleBlink();
    }
  }

  get id(): string {
    return this.char.id;
  }

  get current(): Pose {
    return this.cur;
  }

  /**
   * Nefes (boşta tek döngü) aç/kapa: örn. galeride yalnız ortadaki kart nefes alır. WAAPI ile ve tutamağı bizde:
   * kapatınca kesin iptal edilir (sınıfla açılıp kapanan CSS döngüsü, boşta duraklatılıp sürdürülünce sökülemiyordu).
   * Tabandan (alt kenar sabit) çok hafif büyür; düşük cihazda ve azaltılmış harekette hiç başlamaz.
   */
  breathe(on: boolean): void {
    this.el.classList.toggle('is-breathing', on);
    if (!on) {
      this.breathA?.cancel();
      this.breathA = null;
      return;
    }
    if (this.breathA || !decorLoops()) return;
    const e = 'cubic-bezier(.45,0,.55,1)';
    this.breathA = this.inEl.animate([{transform: 'none', easing: e}, {transform: 'scale(1.01, 1.016)', easing: e}, {transform: 'none'}], {duration: 4400, iterations: Infinity});
  }

  /** Bu pozları arkada indirip çöz (gösterilmeden önce): değişim anı boş kare vermez. */
  preload(poses: Pose[]): void {
    for (const p of poses) {
      const url = this.char.poses[p];
      if (url) this.entry(url).ready.catch(() => undefined);
    }
  }

  setChar(c: CharDef, pose: Pose = this.restPose): void {
    if (c.id === this.char.id) return this.rest(pose);
    this.char = c;
    this.cache.clear();
    this.restPose = pose;
    clearTimeout(this.poseT);
    this.show(pose, false);
  }

  /** Dinlenme pozunu değiştir (kalıcı). */
  rest(p: Pose): void {
    if (p === this.restPose && this.cur === p) return;
    this.restPose = p;
    clearTimeout(this.poseT);
    this.show(p, true);
  }

  /** Geçici poz (anında + pop): ms sonra dinlenme pozuna döner; ms verilmezse bir sonraki rest/poz'a kadar kalır. */
  pose(p: Pose, ms = 0): void {
    clearTimeout(this.poseT);
    this.show(p, true);
    if (ms > 0) this.poseT = window.setTimeout(() => this.alive && this.show(this.restPose, false), ANIM ? ms : 0);
  }

  /** Kısa yaylı "tepki" zıplaması (yalnız transform; nefesten ayrı sarmalayıcıda, birbirini ezmez). */
  pop(): void {
    play(this.popEl, [{transform: 'scale(1)'}, {transform: 'scale(1.045) translateY(-1.5%)', offset: 0.32}, {transform: 'scale(.992)', offset: 0.7}, {transform: 'none'}], {duration: 360, easing: EASE.out});
  }

  private entry(url: string): {im: HTMLImageElement; ready: Promise<void>} {
    let e = this.cache.get(url);
    if (!e) {
      const im = new Image();
      im.className = 'kh-pt__img';
      im.alt = '';
      im.decoding = 'async';
      im.draggable = false;
      let ready: Promise<void>;
      if (this.fade) ready = fadedUrl(url).then(u => {
        im.src = u;
        return im.decode();
      });
      else {
        im.src = url;
        ready = im.decode();
      }
      // çözülemezse (öğe söküldü, ağ hatası) sessizce geç: değişim yine yapılır, işlenmemiş ret kalmaz
      ready.catch(() => undefined);
      e = {im, ready};
      this.cache.set(url, e);
    }
    return e;
  }

  /** Görseli çöz, sonra tek hamlede yerine koy (DOM'da hep tek <img>; yarım/boş kare olmaz). */
  private show(p: Pose, pop: boolean): void {
    this.cur = p;
    const url = this.char.poses[p];
    if (!url) return;
    const {im: next, ready} = this.entry(url);
    const seq = ++this.seq;
    if (next === this.img) return;
    const swap = () => {
      if (!this.alive || seq !== this.seq || next === this.img) return;
      this.img.replaceWith(next);
      this.img = next;
      if (pop) this.pop();
    };
    ready.then(swap, swap);
  }

  private scheduleBlink(): void {
    if (!ANIM) return;
    this.blinkT = window.setTimeout(() => {
      if (!this.alive) return;
      if (this.cur === this.restPose && this.el.isConnected && !document.hidden) {
        const back = this.restPose;
        this.show('kirpma', false);
        window.setTimeout(() => this.alive && this.cur === 'kirpma' && this.show(back, false), 120);
      }
      this.scheduleBlink();
    }, 3200 + Math.random() * 3600);
  }

  destroy(): void {
    this.alive = false;
    clearTimeout(this.blinkT);
    clearTimeout(this.poseT);
    this.breathA?.cancel();
    this.breathA = null;
    this.cache.clear();
    this.el.remove();
  }
}

/**
 * Alt kenarı (%20) ve alt köşeleri yumuşakça solan kopya: tuvalde bir kez "pişirilir" (WebP blob), adres önbelleklenir.
 * Böylece nefes alan/zıplayan görselde maske ya da üst örtü gerekmez. Hata olursa özgün adres döner.
 */
const fadeCache = new Map<string, Promise<string>>();
export function fadedUrl(url: string): Promise<string> {
  let p = fadeCache.get(url);
  if (p) return p;
  p = new Promise<string>(res => {
    const src = new Image();
    src.decoding = 'async';
    src.onerror = () => res(url);
    src.onload = () => {
      try {
        const w = src.naturalWidth, hh = src.naturalHeight;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = hh;
        const g = cv.getContext('2d')!;
        g.drawImage(src, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        const lin = g.createLinearGradient(0, 0, 0, hh);
        [[0, 1], [0.8, 1], [0.86, 0.84], [0.93, 0.36], [1, 0]].forEach(([o, a]) => lin.addColorStop(o, `rgba(0,0,0,${a})`));
        g.fillStyle = lin;
        g.fillRect(0, 0, w, hh);
        // eliptik köşe solması (baş ve bıyık tamamen opak kalır)
        g.translate(w * 0.5, hh * 0.3);
        g.scale(w * 0.72, hh * 0.9);
        const rad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
        [[0, 1], [0.74, 1], [0.84, 0.7], [0.93, 0.22], [1, 0]].forEach(([o, a]) => rad.addColorStop(o, `rgba(0,0,0,${a})`));
        g.fillStyle = rad;
        g.fillRect(-2, -2, 4, 4);
        cv.toBlob(b => res(b ? URL.createObjectURL(b) : url), 'image/webp', 0.94);
      } catch {
        res(url);
      }
    };
    src.src = url;
  });
  fadeCache.set(url, p);
  return p;
}

/** Kare karakter görselinde yüzün kutusu (oran): saç tepesinden çeneye, bıyık dahil. Balonlar buraya binmez. */
export const FACE_BOX = {l: 0.22, t: 0.07, r: 0.86, b: 0.64} as const;

/** Portrenin ekrandaki yüz dikdörtgeni (portre kutusu kare, görsel tabana oturur). */
export function faceRect(pt: Portrait): DOMRect {
  const r = pt.el.getBoundingClientRect();
  const s = Math.min(r.width, r.height);
  const top = r.bottom - s;
  const left = r.left + (r.width - s) / 2;
  return new DOMRect(left + s * FACE_BOX.l, top + s * FACE_BOX.t, s * (FACE_BOX.r - FACE_BOX.l), s * (FACE_BOX.b - FACE_BOX.t));
}

/**
 * Konuşma balonunu yüzün ÜSTÜNE (kuyruk aşağı) ya da yanına yerleştirir; yüz kutusuyla asla kesişmez.
 * `bounds`: balonun taşmaması gereken alan (ekran koordinatı). Balon `position:absolute`, kabı `host`.
 * Sığmazsa daraltır; hiçbir yere sığmazsa false döner (çağıran balonu göstermez).
 */
export function placeBubble(say: HTMLElement, host: HTMLElement, face: DOMRect, bounds: DOMRect, o: {gap?: number; maxW?: number} = {}): boolean {
  const gap = o.gap ?? 4;
  const TAIL = 16;
  const hr = host.getBoundingClientRect();
  const fit = (maxW: number): DOMRect => {
    say.style.maxWidth = `${Math.round(maxW)}px`;
    say.style.left = '0px';
    say.style.top = '0px';
    return say.getBoundingClientRect();
  };
  const widths = [o.maxW ?? bounds.width * 0.62, bounds.width * 0.8, bounds.width - 8];
  for (const w of widths) {
    const b = fit(w);
    // 1) yüzün üstü: kuyruk ucu yüzün sağ üst çeyreğine bakar
    const tipX = face.left + face.width * 0.66;
    const top = face.top - TAIL - gap - b.height;
    if (top >= bounds.top) {
      let left = tipX - b.width * 0.22;
      left = clamp(left, bounds.left + 4, bounds.right - 4 - b.width);
      const tail = clamp((tipX - left - 11) / b.width, 0.1, 0.84);
      say.classList.remove('is-up');
      say.style.setProperty('--tail', `${(tail * 100).toFixed(1)}%`);
      say.style.transformOrigin = `${(tail * 100).toFixed(1)}% 100%`;
      say.style.left = `${Math.round(left - hr.left)}px`;
      say.style.top = `${Math.round(top - hr.top)}px`;
      return true;
    }
  }
  // 2) yanlar: yüzün solunda ya da sağında, başın üst yarısı hizasında
  for (const side of ['r', 'l'] as const) {
    const room = side === 'r' ? bounds.right - face.right - gap : face.left - bounds.left - gap;
    if (room < 96) continue;
    const b = fit(room - 4);
    const left = side === 'r' ? face.right + gap : face.left - gap - b.width;
    const top = clamp(face.top - b.height * 0.35, bounds.top, bounds.bottom - b.height - TAIL);
    if (b.height + TAIL > bounds.height) continue;
    say.classList.remove('is-up');
    const tail = side === 'r' ? 0.12 : 0.78;
    say.style.setProperty('--tail', `${tail * 100}%`);
    say.style.transformOrigin = `${tail * 100}% 100%`;
    say.style.left = `${Math.round(left - hr.left)}px`;
    say.style.top = `${Math.round(top - hr.top)}px`;
    return true;
  }
  return false;
}

/**
 * Daktilo metni (balonlar, alıntı kutusu): kutu, tam metnin (ya da `reserve` içindeki en uzun satırın) boyunu baştan ayırır —
 * yazılmamış kısım görünmez olarak yerinde durur, böylece satır kırılımı ve kutu boyu hiç değişmez.
 * Her harfte yalnız iki metin düğümünün verisi güncellenir (innerHTML yok). `finish()` anında tamamlar.
 */
export function typeText(scope: Scope, host: HTMLElement, text: string, cps = 38, reserve: string[] = []): {done: Promise<void>; finish(): void; typing(): boolean} {
  host.classList.add('kh-tt');
  host.textContent = '';
  for (const r of reserve) host.append(h('span', 'kh-tt__ghost', esc(r)));
  const live = h('span', 'kh-tt__live');
  const vis = document.createTextNode('');
  const restEl = h('span', 'kh-tt__rest');
  const rest = document.createTextNode(text);
  restEl.append(rest);
  live.append(vis, restEl);
  host.append(live);
  let i = 0, finished = false, resolve!: () => void;
  const done = new Promise<void>(r => (resolve = r));
  const finish = () => {
    if (finished) return;
    finished = true;
    vis.data = text;
    rest.data = '';
    resolve();
  };
  if (!ANIM) {
    finish();
    return {done, finish, typing: () => false};
  }
  const step = () => {
    // aynı kutuya yeni metin yazıldıysa (eski düğümler koptu) ya da ekran kapandıysa dur
    if (finished || !scope.alive || !live.isConnected) return finish();
    i++;
    vis.data = text.slice(0, i);
    rest.data = text.slice(i);
    if (i >= text.length) return finish();
    const c = text[i - 1];
    scope.timeout(step, /[.!?…]/.test(c) ? 240 : c === ',' ? 110 : 1000 / cps);
  };
  scope.timeout(step, 90);
  return {done, finish, typing: () => !finished};
}

// =====================================================================================================
// Kaydırmalı vitrin: parmakla sürükle, bırakınca hızına göre kayar ve en yakın karta oturur (yay).
// Komşular küçülür, hafif döner, yanlardan görünür. Tıklama sürükleme değilse geçer.
// =====================================================================================================
export interface CarouselOpts {
  /** Kartlar arası mesafe (px) */
  spacing: () => number;
  onChange?: (i: number) => void;
  onSettle?: (i: number) => void;
  /** Kart başına ek çizim (paralaks vb.); d = kartın merkeze uzaklığı (kart birimi) */
  render?: (el: HTMLElement, d: number, i: number) => void;
  /** Komşu ölçeği / dönüşü / dikey düşüş */
  shrink?: number;
  tilt?: number;
  drop?: number;
  sounds?: Sounds;
}

export class Carousel {
  pos = 0;
  index = 0;
  private target = 0;
  private vel = 0;
  private dragging = false;
  private raf = 0;
  private last = 0;
  private dragged = false;

  constructor(private scope: Scope, host: HTMLElement, private items: HTMLElement[], private o: CarouselOpts) {
    let x0 = 0, p0 = 0, id = -1, samples: {t: number; x: number}[] = [];
    scope.on(host, 'pointerdown', e => {
      const p = e as PointerEvent;
      if (id !== -1 || (p.pointerType === 'mouse' && p.button !== 0)) return;
      id = p.pointerId;
      x0 = p.clientX;
      p0 = this.pos;
      this.dragged = false;
      samples = [{t: performance.now(), x: p.clientX}];
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    });
    scope.on(window, 'pointermove', e => {
      const p = e as PointerEvent;
      if (p.pointerId !== id) return;
      const dx = p.clientX - x0;
      if (!this.dragging && Math.abs(dx) > 8) {
        this.dragging = true;
        this.dragged = true;
        try {
          host.setPointerCapture(id);
        } catch {
          /* yok say */
        }
      }
      if (!this.dragging) return;
      const n = this.items.length - 1;
      let pos = p0 - dx / this.o.spacing();
      // kenarlarda lastik direnç
      if (pos < 0) pos = -Math.pow(-pos, 0.7) * 0.5;
      else if (pos > n) pos = n + Math.pow(pos - n, 0.7) * 0.5;
      this.setPos(pos);
      const t = performance.now();
      samples.push({t, x: p.clientX});
      while (samples.length > 2 && t - samples[0].t > 90) samples.shift();
    });
    const up = (e: Event) => {
      const p = e as PointerEvent;
      if (p.pointerId !== id) return;
      id = -1;
      if (!this.dragging) return;
      this.dragging = false;
      const a = samples[0], b = samples[samples.length - 1];
      const dt = Math.max(16, b.t - a.t);
      const v = -((b.x - a.x) / dt) * 1000 / this.o.spacing(); // kart/sn
      const proj = this.pos + clamp(v * 0.18, -2.2, 2.2);
      let t = Math.round(proj);
      // küçük ama hızlı fiske: en az bir kart kaydır
      if (t === Math.round(p0) && Math.abs(v) > 1.1) t = Math.round(p0) + Math.sign(v);
      this.vel = v;
      this.go(t);
    };
    scope.on(window, 'pointerup', up);
    scope.on(window, 'pointercancel', up);
    // sürükleme bittikten hemen sonraki tıklamayı yut
    scope.on(host, 'click', e => {
      if (this.dragged) {
        e.stopPropagation();
        e.preventDefault();
        this.dragged = false;
      }
    }, {capture: true});
    this.setPos(0);
  }

  /** i'ye kay (yaylı). */
  go(i: number, animate = true): void {
    const n = this.items.length - 1;
    this.target = clamp(i, 0, n);
    if (this.target !== this.index) {
      this.index = this.target;
      this.o.sounds?.whoosh();
      this.o.onChange?.(this.index);
    }
    if (!animate || !ANIM) {
      this.vel = 0;
      this.setPos(this.target);
      this.o.onSettle?.(this.index);
      return;
    }
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    const step = (t: number) => {
      if (!this.scope.alive) return;
      const dt = Math.min(0.033, (t - this.last) / 1000);
      this.last = t;
      // kritik sönümlü yay (hafif aşma)
      const k = 170, c = 22;
      const f = -k * (this.pos - this.target) - c * this.vel;
      this.vel += f * dt;
      const p = this.pos + this.vel * dt;
      if (Math.abs(p - this.target) < 0.001 && Math.abs(this.vel) < 0.02) {
        this.vel = 0;
        this.setPos(this.target);
        this.raf = 0;
        this.o.onSettle?.(this.index);
        return;
      }
      this.setPos(p);
      this.raf = requestAnimationFrame(step);
    };
    // fiske hızı yayın başlangıç hızıdır (kart/sn → yönü pos ile aynı)
    this.raf = requestAnimationFrame(step);
  }

  layout(): void {
    this.setPos(this.pos);
  }

  private setPos(pos: number): void {
    this.pos = pos;
    const sp = this.o.spacing();
    const shrink = this.o.shrink ?? 0.14, tilt = this.o.tilt ?? 14, drop = this.o.drop ?? 0.04;
    const live = Math.round(clamp(pos, 0, this.items.length - 1));
    if (this.dragging && live !== this.index) {
      this.index = live;
      this.o.onChange?.(live);
      this.o.sounds?.tap();
    }
    this.items.forEach((el, i) => {
      const d = i - pos, ad = Math.abs(d);
      const s = 1 - Math.min(ad, 1.6) * shrink;
      const ry = clamp(-d * tilt, -tilt * 1.6, tilt * 1.6);
      el.style.transform = `translate3d(${(d * sp).toFixed(1)}px,${(Math.min(ad, 2) * drop * sp).toFixed(1)}px,0) rotateY(${ry.toFixed(1)}deg) scale(${s.toFixed(3)})`;
      el.style.opacity = ad > 2.4 ? '0' : String(clamp(1 - (ad - 1.2) * 0.8, 0, 1));
      el.style.zIndex = String(100 - Math.round(ad * 10));
      el.classList.toggle('is-center', ad < 0.5);
      this.o.render?.(el, d, i);
    });
  }
}

// =====================================================================================================
// Alt pencere (market ürünü, teaser): alttan kayar, karartmaya ya da X'e dokununca kapanır.
// =====================================================================================================
export function openSheet(ctx: Ctx, o: {cls: string; body: string; onClose?: () => void; z?: number}): ModalHandle {
  const scope = new Scope();
  const el = h('div', `kh-sheet ${o.cls}`);
  if (o.z) el.style.zIndex = String(o.z);
  el.innerHTML = `<div class="kh-sheet__scrim" data-act="x"></div>
    <div class="kh-sheet__panel kh-panel" role="dialog" aria-modal="true"><i class="kh-sheet__grip"></i>
      <button class="kh-iconbtn kh-sheet__x" data-act="x" aria-label="Kapat">${I.close}</button>${o.body}</div>`;
  ctx.layer.append(el);
  const panel = q(el, '.kh-sheet__panel');
  const scrim = q(el, '.kh-sheet__scrim');
  play(scrim, [{opacity: 0}, {opacity: 1}], {duration: 240, easing: 'ease-out'});
  play(panel, [{transform: 'translateY(100%)'}, {transform: 'translateY(-1.5%)', offset: 0.7}, {transform: 'none'}], {duration: 420, easing: EASE.out});
  let closing: Promise<void> | null = null;
  const handle: ModalHandle = {
    el,
    panel,
    scope,
    close() {
      if (closing) return closing;
      el.style.pointerEvents = 'none';
      closing = new Promise(res => {
        const fin = () => {
          scope.dispose();
          el.remove();
          res();
        };
        if (!ANIM) return fin();
        scrim.animate([{opacity: 1}, {opacity: 0}], {duration: 220, easing: 'ease-in', fill: 'forwards'});
        panel.animate([{transform: 'none'}, {transform: 'translateY(105%)'}], {duration: 260, easing: EASE.in, fill: 'forwards'}).onfinish = fin;
      });
      return closing;
    },
  };
  scope.on(el, 'click', e => {
    const b = (e.target as Element).closest('[data-act=x]');
    if (!b) return;
    ctx.sounds.tap();
    o.onClose?.();
    handle.close();
  });
  // aşağı sürükleyerek kapat
  let y0 = -1, dy = 0, pid = -1;
  const grip = q(el, '.kh-sheet__grip');
  scope.on(grip.parentElement!, 'pointerdown', e => {
    const p = e as PointerEvent;
    if (panel.scrollTop > 0 || (p.target as Element).closest('button, input, .kh-noswipe')) return;
    y0 = p.clientY;
    pid = p.pointerId;
    dy = 0;
  });
  scope.on(window, 'pointermove', e => {
    const p = e as PointerEvent;
    if (p.pointerId !== pid || y0 < 0) return;
    dy = Math.max(0, p.clientY - y0);
    if (dy > 6) panel.style.transform = `translateY(${dy}px)`;
  });
  scope.on(window, 'pointerup', e => {
    const p = e as PointerEvent;
    if (p.pointerId !== pid || y0 < 0) return;
    y0 = -1;
    pid = -1;
    if (dy > panel.offsetHeight * 0.22) {
      o.onClose?.();
      handle.close();
    } else if (dy > 0) {
      panel.style.transform = '';
      play(panel, [{transform: `translateY(${dy}px)`}, {transform: 'none'}], {duration: 260, easing: EASE.spring});
    }
  });
  return handle;
}

// =====================================================================================================
// Dört renk perde: ♥ ♦ ♣ ♠ şeritleri eğik süpürür (ekran değişimi). cover() kapatır, reveal() açar.
// - Her en-boy oranında ekranı TAM örter: şeritler dikeyde %112, uç şeritler eğimin kaydırdığı köşeler için
//   (17vh + 6vw) kadar dışarı uzar; kayma mesafesi o anki ekrandan hesaplanır.
// - Kapanış ~0,8 sn (şeritler, hafif aşıp yerine oturur), amblem ~1 sn'de oturur: beyaz disk yaylanarak döner,
//   arkasında ışık parlaması + şok halkası, dört takım simgesi sırayla "pıt" diye çıkar, perdenin üstünden parlak bir yalım geçer.
// - Açılış ~0,85 sn: simgeler ve disk içeri kaçar, şeritler sağdan başlayarak hızlanıp çıkar.
// Yalnız transform/opacity; her şey bir kez çizilir. Düşük cihazda yalım, parlama, şok halkası ve filigran kayması yok.
// =====================================================================================================
export function suitWipe(ctx: Ctx): {cover(): Promise<void>; reveal(): Promise<void>} {
  const low = document.documentElement.classList.contains('kh-low');
  const el = h('div', 'kh-wipe' + (low ? ' is-low' : ''));
  const ks: SuitKey[] = ['h', 'd', 'c', 's'];
  el.innerHTML = ks.map((k, i) => `<i class="kh-wipe__band is-${k}" style="--i:${i}"><span>${suitSvg(k)}</span></i>`).join('') +
    `<i class="kh-wipe__gloss"></i><div class="kh-wipe__emb"><i class="kh-wipe__flare"></i><i class="kh-wipe__shock"></i>` +
    `<div class="kh-wipe__disc">${ks.map(k => `<i class="kh-wipe__s">${suitSvg(k)}</i>`).join('')}</div></div>`;
  ctx.layer.append(el);
  const bands = Array.from(el.querySelectorAll<HTMLElement>('.kh-wipe__band'));
  const marks = bands.map(b => q(b, 'span'));
  const disc = q(el, '.kh-wipe__disc');
  const suits = Array.from(el.querySelectorAll<HTMLElement>('.kh-wipe__s'));
  const SK = 'skewX(-14deg)';
  const MARK = 'translate(-50%, -50%) skewX(14deg)';
  const OUTX = 'cubic-bezier(.16,.84,.3,1)';
  // kayma mesafesi: en sağdaki şeridin (dışa uzamış) kenarı + eğim payı ekranın tamamen dışında başlasın/bitsin
  const dist = () => Math.round(innerWidth * 1.22 + innerHeight * 0.32 + 12);
  let t0 = 0;
  let live: Animation[] = [];
  const go = (n: Element, kf: Keyframe[], o: KeyframeAnimationOptions): Animation => {
    const a = n.animate(kf, o);
    live.push(a);
    return a;
  };
  return {
    async cover() {
      ctx.sounds.whoosh();
      if (!ANIM) return;
      t0 = performance.now();
      const D = dist();
      const as = bands.map((b, i) => go(b, [
        {transform: `translateX(${-D}px) ${SK}`, easing: OUTX},
        {transform: `translateX(${Math.round(innerWidth * 0.014)}px) ${SK}`, offset: 0.84, easing: 'cubic-bezier(.4,0,.5,1)'},
        {transform: `translateX(0) ${SK}`},
      ], {duration: 560, delay: i * 75, fill: 'both'}));
      if (!low) {
        // filigran şeritten biraz geride kalır (derinlik), yerine oturunca belirginleşir
        marks.forEach((m, i) => go(m, [{transform: `${MARK} translateX(-14vw) scale(.82)`, opacity: 0}, {transform: `${MARK} scale(1)`, opacity: 0.16}],
          {duration: 620, delay: 120 + i * 75, easing: OUTX, fill: 'both'}));
        // parlak yalım perdenin üstünden geçer (şeritlere ters açıyla)
        go(q(el, '.kh-wipe__gloss'), [{transform: 'translateX(-45vw) skewX(22deg)', opacity: 0}, {opacity: 1, offset: 0.25}, {opacity: 1, offset: 0.7}, {transform: 'translateX(135vw) skewX(22deg)', opacity: 0}],
          {duration: 620, delay: 470, easing: 'cubic-bezier(.45,.1,.4,1)', fill: 'both'});
        go(q(el, '.kh-wipe__flare'), [{transform: 'scale(.25)', opacity: 0, easing: OUTX}, {transform: 'scale(1)', opacity: 0.95, offset: 0.3, easing: 'ease-in'}, {transform: 'scale(1.35)', opacity: 0}],
          {duration: 640, delay: 520, fill: 'both'});
        go(q(el, '.kh-wipe__shock'), [{transform: 'scale(.85)', opacity: 0.95}, {transform: 'scale(2.3)', opacity: 0}], {duration: 520, delay: 610, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'both'});
      }
      // disk: döne döne büyür, hafif aşıp oturur
      go(disc, [
        {transform: 'scale(0) rotate(-140deg)', opacity: 0, easing: 'cubic-bezier(.2,.8,.3,1)'},
        {transform: 'scale(1.14) rotate(8deg)', opacity: 1, offset: 0.58, easing: 'cubic-bezier(.45,0,.55,1)'},
        {transform: 'scale(.97) rotate(-2deg)', opacity: 1, offset: 0.82, easing: 'ease-out'},
        {transform: 'scale(1) rotate(0deg)', opacity: 1},
      ], {duration: 480, delay: 450, fill: 'both'});
      // dört simge sırayla çıkar
      suits.forEach((n, i) => go(n, [
        {transform: 'scale(0) rotate(-35deg)', opacity: 0, easing: 'cubic-bezier(.2,.8,.3,1)'},
        {transform: 'scale(1.28) rotate(6deg)', opacity: 1, offset: 0.6, easing: 'ease-in-out'},
        {transform: 'scale(1) rotate(0deg)', opacity: 1},
      ], {duration: 300, delay: 600 + i * 60, fill: 'both'}));
      await as[as.length - 1].finished.catch(() => undefined);
    },
    async reveal() {
      if (ANIM) {
        // amblem en az bir an görünsün (kapanış hemen ardından açılış istense de simgeler çıkmış olsun)
        const wait = t0 ? 960 - (performance.now() - t0) : 0;
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        for (const a of live) a.commitStyles?.();
        for (const a of live) a.cancel();
        live = [];
        const D = dist();
        suits.forEach((n, i) => go(n, [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(0) rotate(40deg)', opacity: 0}], {duration: 180, delay: (3 - i) * 35, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards'}));
        go(disc, [{transform: 'scale(1) rotate(0deg)', opacity: 1, easing: 'ease-out'}, {transform: 'scale(1.08) rotate(-6deg)', opacity: 1, offset: 0.3, easing: 'cubic-bezier(.5,0,.75,0)'}, {transform: 'scale(0) rotate(100deg)', opacity: 0}],
          {duration: 300, delay: 60, fill: 'forwards'});
        if (!low) marks.forEach((m, i) => go(m, [{opacity: 0.16}, {opacity: 0}], {duration: 220, delay: 140 + (3 - i) * 65, fill: 'forwards'}));
        const as = bands.map((b, i) => go(b, [{transform: `translateX(0) ${SK}`, easing: 'ease-out'}, {transform: `translateX(-${Math.round(innerWidth * 0.02)}px) ${SK}`, offset: 0.12, easing: 'cubic-bezier(.55,0,.8,.35)'}, {transform: `translateX(${D}px) ${SK}`}],
          {duration: 540, delay: 150 + (bands.length - 1 - i) * 65, fill: 'both'}));
        await as[0].finished.catch(() => undefined);
      }
      el.remove();
    },
  };
}

/** Büyük parlak damga ("AÇILDI!", "SENİN!") — vurur, durur, söner. */
export function stampWord(ctx: Ctx, text: string, at: {x: number; y: number}, o: {cls?: string; ms?: number; size?: number} = {}): void {
  const el = h('div', `kh-stampw ${o.cls ?? ''}`, `<div class="kh-title">${g3(text)}</div>`);
  el.style.left = at.x + 'px';
  el.style.top = at.y + 'px';
  if (o.size) el.style.fontSize = `calc(var(--u) * ${o.size})`;
  ctx.layer.append(el);
  const a = play(el, [
    {transform: 'translate(-50%,-50%) scale(2.6) rotate(-14deg)', opacity: 0},
    {transform: 'translate(-50%,-50%) scale(.9) rotate(-4deg)', opacity: 1, offset: 0.16},
    {transform: 'translate(-50%,-50%) scale(1) rotate(-6deg)', opacity: 1, offset: 0.24},
    {transform: 'translate(-50%,-50%) scale(1.04) rotate(-6deg)', opacity: 1, offset: 0.8},
    {transform: 'translate(-50%,-50%) scale(1.25) rotate(-6deg)', opacity: 0},
  ], {duration: o.ms ?? 1500, easing: 'ease-out', fill: 'both'}, 0.5);
  if (ANIM) a.onfinish = () => el.remove();
}

/** Rastgele seçim (karıştır) için Fisher–Yates. */
export function shuffled<T>(a: readonly T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export {rnd};
