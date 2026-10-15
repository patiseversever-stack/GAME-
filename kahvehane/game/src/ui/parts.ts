// Ortak parçalar: arena zemini, kod çizimi logo, modal iskeleti, bildirim, "Yakında" penceresi, avatar/seviye/jeton kapsülü HTML'i,
// karakter avatarı (çerçeveli), canlı portre (nefes + göz kırpma + poz), kaydırmalı vitrin (momentumlu), alt pencere, dört renk perde geçişi.
import type {Profile, Sounds} from './types';
import {EASE, Scope, ANIM, clamp, esc, fmt, h, initials, play, preload, q, rnd} from './dom';
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

// =====================================================================================================
// Canlı portre: nefes alır (CSS), ara sıra göz kırpar, dokununca/istenince geçici poza geçer.
// Taban poz <img> + üst katman <img> (kırpma/poz) — kare değişimi yalnız opaklık; görseller önceden iner.
// =====================================================================================================
export class Portrait {
  readonly el: HTMLElement;
  private base: HTMLImageElement;
  private over: HTMLImageElement;
  private char: CharDef;
  private restPose: Pose;
  private cur: Pose;
  private blinkT = 0;
  private poseT = 0;
  private idleT = 0;
  alive = true;
  /** Dinlenirken ara sıra gülümser (galeri kartı) */
  smileIdle = false;

  constructor(char: CharDef, o: {pose?: Pose; cls?: string; blink?: boolean; breathe?: boolean} = {}) {
    this.char = char;
    this.restPose = this.cur = o.pose ?? 'notr';
    this.el = h('div', `kh-pt${o.breathe === false ? '' : ' is-breathing'} ${o.cls ?? ''}`);
    this.el.innerHTML = `<div class="kh-pt__in"><img class="kh-pt__img" alt=""><img class="kh-pt__img is-over" alt=""></div>`;
    [this.base, this.over] = Array.from(this.el.querySelectorAll('img'));
    this.base.src = char.poses[this.restPose];
    preload(Object.values(char.poses));
    if (o.blink !== false) this.scheduleBlink();
  }

  get id(): string {
    return this.char.id;
  }

  setChar(c: CharDef, pose: Pose = this.restPose): void {
    this.char = c;
    preload(Object.values(c.poses));
    this.restPose = this.cur = pose;
    this.base.src = c.poses[pose];
    this.over.style.opacity = '0';
  }

  /** Dinlenme pozunu değiştir (kalıcı). */
  rest(p: Pose): void {
    if (p === this.restPose && this.cur === p) return;
    this.restPose = p;
    clearTimeout(this.poseT);
    this.show(p);
  }

  /** Geçici poz: ms sonra dinlenme pozuna döner. ms verilmezse kalıcı (rest gibi değil: bir sonraki rest/poz'a kadar). */
  pose(p: Pose, ms = 0): void {
    clearTimeout(this.poseT);
    this.show(p);
    if (ms > 0) this.poseT = window.setTimeout(() => this.alive && this.show(this.restPose), ANIM ? ms : 0);
  }

  get current(): Pose {
    return this.cur;
  }

  /** Kısa "tepki" zıplaması (poz değişiminde canlılık). */
  pop(): void {
    play(this.el.firstElementChild!, [{transform: 'scale(1)'}, {transform: 'scale(1.05) translateY(-2%)', offset: 0.35}, {transform: 'scale(.99)', offset: 0.7}, {transform: 'none'}], {duration: 380, easing: EASE.out});
  }

  private show(p: Pose): void {
    this.cur = p;
    const url = this.char.poses[p];
    if (p === this.restPose) {
      if (this.base.src !== url && !this.base.src.endsWith(url)) this.base.src = url;
      this.over.style.opacity = '0';
      return;
    }
    this.over.src = url;
    const on = () => this.alive && this.cur === p && (this.over.style.opacity = '1');
    if (this.over.decode) this.over.decode().then(on, on);
    else on();
  }

  private scheduleBlink(): void {
    if (!ANIM) return;
    this.blinkT = window.setTimeout(() => {
      if (!this.alive) return;
      if (this.cur === 'notr' && this.el.isConnected) {
        if (this.smileIdle && Math.random() < 0.35) {
          this.pose('gulumseme', 1600 + Math.random() * 900);
        } else {
          this.show('kirpma');
          window.setTimeout(() => this.alive && this.cur === 'kirpma' && this.show(this.restPose), 130);
          // ara sıra çift kırpma
          if (Math.random() < 0.2) window.setTimeout(() => {
            if (!this.alive || this.cur !== 'notr') return;
            this.show('kirpma');
            window.setTimeout(() => this.alive && this.cur === 'kirpma' && this.show(this.restPose), 110);
          }, 300);
        }
      }
      this.scheduleBlink();
    }, 2200 + Math.random() * 3200);
  }

  destroy(): void {
    this.alive = false;
    clearTimeout(this.blinkT);
    clearTimeout(this.poseT);
    clearTimeout(this.idleT);
    this.el.remove();
  }
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
// =====================================================================================================
export function suitWipe(ctx: Ctx): {cover(): Promise<void>; reveal(): Promise<void>} {
  const el = h('div', 'kh-wipe');
  const ks: SuitKey[] = ['h', 'd', 'c', 's'];
  el.innerHTML = ks.map((k, i) => `<i class="kh-wipe__band is-${k}" style="--i:${i}"><span>${suitSvg(k)}</span></i>`).join('') +
    `<div class="kh-wipe__emb">${ks.map(k => suitSvg(k)).join('')}</div>`;
  ctx.layer.append(el);
  const bands = Array.from(el.querySelectorAll<HTMLElement>('.kh-wipe__band'));
  const emb = q(el, '.kh-wipe__emb');
  return {
    async cover() {
      ctx.sounds.whoosh();
      if (!ANIM) return;
      const as = bands.map((b, i) => b.animate([{transform: 'translateX(-130vw) skewX(-14deg)'}, {transform: 'translateX(0) skewX(-14deg)'}], {duration: 360, delay: i * 55, easing: EASE.outQuart, fill: 'both'}));
      emb.animate([{transform: 'scale(.2) rotate(-120deg)', opacity: 0}, {transform: 'scale(1.1) rotate(10deg)', opacity: 1, offset: 0.7}, {transform: 'scale(1) rotate(0)', opacity: 1}], {duration: 420, delay: 260, easing: EASE.out, fill: 'both'});
      await as[as.length - 1].finished.catch(() => undefined);
    },
    async reveal() {
      if (ANIM) {
        emb.animate([{transform: 'scale(1)', opacity: 1}, {transform: 'scale(.4) rotate(90deg)', opacity: 0}], {duration: 220, easing: EASE.in, fill: 'forwards'});
        const as = bands.map((b, i) => b.animate([{transform: 'translateX(0) skewX(-14deg)'}, {transform: 'translateX(130vw) skewX(-14deg)'}], {duration: 380, delay: 80 + (bands.length - 1 - i) * 50, easing: EASE.in, fill: 'both'}));
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
