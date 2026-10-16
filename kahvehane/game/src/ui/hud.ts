// Oyun içi arayüz (masanın üstünde, tamamen saydam; zemin/karartma yok) · DİKEY.
// Canlı karakter rozetleri (kafası çemberden taşan portre, nefes alma, doğal göz kırpma, yaylı tepki hâlleri, küçük çizgi film
// vurguları, dürtme), jeton, duraklat, deste sayacı, ipucu, eşli takım hapı, konuşma balonu, pişti kahramanı (karakter büyük girer),
// seri / vurgu yazıları ve el sonu sayımı. Ortadaki masa alanı boş kalır. Yalnız transform/opacity animasyonu.
import {cancelAnims} from '../platform/anim';
import './hud.css';
import type {GameHud, HudPisti, HudPlayer, HudPose, HudSounds, HudTally} from './types';
import type {Mode, SeatPlayer} from '../game/types';
import {ANIM, EASE, Scope, countUp, esc, fmt, h, play, q} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {FACE_BOX, gemHtml} from './parts';
import {g3, type Fx} from './fx';

/** Rozet konumu: alt (ben, sol alt), üst (1'e 1 rakip), top4 (4 kişide karşı), sol, sağ. */
type Pos = 'bottom' | 'top' | 'top4' | 'left' | 'right';
type Accent = 'anger' | 'q' | 'sweat' | 'spark' | 'heart';

const ACCENT: Partial<Record<HudPose, Accent>> = {kizgin: 'anger', saskin: 'q', uzgun: 'sweat', kahkaha: 'spark', gulumseme: 'heart', zafer: 'spark', pisti: 'spark'};
/** Karakter başına portre kaydırma (% — yüz çemberin ortasına gelsin) */
const FACE: Record<string, [number, number]> = {riza: [0, 1], cem: [-3, -1], dursun: [0, 1], defne: [-2, 0]};

const preloaded = new Set<string>();
function preload(urls: string[]): void {
  for (const u of urls) {
    if (!u || preloaded.has(u)) continue;
    preloaded.add(u);
    const i = new Image();
    i.decoding = 'async';
    i.src = u;
  }
}
/** Görsel çözülene kadar bekle (en fazla ms); poz değişiminde boş kare görünmesin. */
function ready(img: HTMLImageElement, ms = 160): Promise<void> {
  if (img.complete && img.naturalWidth) return Promise.resolve();
  return Promise.race([img.decode().catch(() => undefined), new Promise<void>(r => setTimeout(r, ms))]);
}

/** Dar koltuklarda uzun ad kısalır: "Kahveci Dursun" → "Dursun" (iki kelimeli kısa adlar kalır: "Rıza Amca"). */
function shortName(n: string): string {
  if (n.length <= 10) return n;
  const w = n.trim().split(/\s+/);
  return w.length > 1 ? w[w.length - 1] : n.slice(0, 10) + '…';
}

/** #rrggbb rengini beyaza (k > 0) ya da siyaha (k < 0) doğru karıştır. */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const ANGER = `<svg viewBox="0 0 24 24"><g fill="none" stroke-linecap="round"><g stroke="#0a1033" stroke-width="5.6"><path d="M9 3.5Q9.5 8.5 4 9"/><path d="M15 3.5Q14.5 8.5 20 9"/><path d="M9 20.5Q9.5 15.5 4 15"/><path d="M15 20.5Q14.5 15.5 20 15"/></g>
  <g stroke="#ff2e4d" stroke-width="3.2"><path d="M9 3.5Q9.5 8.5 4 9"/><path d="M15 3.5Q14.5 8.5 20 9"/><path d="M9 20.5Q9.5 15.5 4 15"/><path d="M15 20.5Q14.5 15.5 20 15"/></g></g></svg>`;
const SWEAT = `<svg viewBox="0 0 24 30"><path d="M12 2C12 2 4 12.5 4 18a8 8 0 0 0 16 0C20 12.5 12 2 12 2z" fill="#8fd6ff" stroke="#0a1033" stroke-width="2.2"/><path d="M8.5 17.5a3.5 3.5 0 0 0 2.5 4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
const HEART = `<svg viewBox="0 0 24 24"><path d="M12 21.3C9.3 19.2 2 14.4 2 8.5 2 5.4 4.4 3 7.3 3c2 0 3.7 1.1 4.7 2.8C13 4.1 14.7 3 16.7 3 19.6 3 22 5.4 22 8.5c0 5.9-7.3 10.7-10 12.8z" fill="#ff4d6a" stroke="#0a1033" stroke-width="2"/></svg>`;

/** Tek oyuncu rozeti: kafası çemberden taşan canlı portre + sıra halkası + seviye taşı + isim hapı + sayaç hapları + balon. */
class Badge {
  readonly el: HTMLElement;
  private scope = new Scope();
  private popEl: HTMLElement;
  private baseWrap: HTMLElement;
  private base: HTMLImageElement[];
  private front = 0;
  private blinkImg: HTMLImageElement;
  private reactImg: HTMLImageElement;
  private cardsEl: HTMLElement;
  private pistiEl: HTMLElement;
  private pistiBox: HTMLElement;
  private bubble: HTMLElement;
  private acc: HTMLElement;
  private sayTimer = 0;
  private reactTimer = 0;
  private reactTok = 0;
  private baseTok = 0;
  private reacting = false;
  private basePose: HudPose = 'notr';
  private persist: HudPose | null = null;
  private thinking = false;
  private stats = {cards: -1, pisti: -1};

  constructor(readonly p: HudPlayer, readonly pos: Pos, private onTap: (b: Badge) => void) {
    const c = p.char;
    const face = FACE[c.id] ?? [0, 0];
    const notr = c.poses.notr;
    preload(Object.values(c.poses));
    const team = p.team >= 0 ? ` team-${p.team === 0 ? 'a' : 'b'}` : '';
    this.el = h('div', `kh-badge is-${pos}${p.isMe ? ' is-me' : ''}${team}`, `
      <div class="kh-badge__pop">
        <div class="kh-badge__glow"></div><div class="kh-badge__turn"></div>
        <div class="kh-badge__ring${p.frame ? ' kh-frame--' + esc(p.frame) : ''}"><i class="kh-badge__gloss"></i></div>
        <div class="kh-badge__back"></div>
        <div class="kh-badge__fig" style="--fx:${face[0]}%;--fy:${face[1]}%"><div class="kh-badge__breath">
          <div class="kh-badge__base"><img class="kh-badge__img" src="${notr}" alt="" draggable="false"><img class="kh-badge__img" alt="" draggable="false" style="opacity:0"></div>
          <img class="kh-badge__img is-blink" src="${c.poses.kirpma || notr}" alt="" draggable="false">
          <img class="kh-badge__img is-react" alt="" draggable="false">
        </div></div>
        <div class="kh-acc">
          <i class="kh-acc__anger">${ANGER}</i><i class="kh-acc__steam"><i></i><i></i><i></i></i>
          <b class="kh-acc__q">${g3('?!')}</b><i class="kh-acc__sweat">${SWEAT}</i><i class="kh-acc__heart">${HEART}</i>
          <i class="kh-acc__sp is-1"></i><i class="kh-acc__sp is-2"></i><i class="kh-acc__sp is-3"></i>
        </div>
      </div>
      ${gemHtml(p.level, p.isMe)}
      <div class="kh-badge__plate">
        <div class="kh-badge__name">${esc(pos === 'left' || pos === 'right' || pos === 'top4' ? shortName(p.name) : p.name)}</div>
        <div class="kh-badge__pill"><span>${I.cards}<b class="kh-num" data-k="cards">0</b></span><span data-k="pbox">${I.star}<b class="kh-num" data-k="pisti">0</b></span></div>
      </div>
      <div class="kh-think"><span class="kh-dots"><i></i><i></i><i></i><b></b></span></div>
      <div class="kh-bubble"></div>
      ${p.isMe ? '' : `<button class="kh-badge__hit" aria-label="${esc(p.name)} — dürt"></button>`}`);
    this.el.style.setProperty('--bc1', shade(c.color, 0.45));
    this.el.style.setProperty('--bc2', c.color);
    this.el.style.setProperty('--bc3', shade(c.color, -0.45));
    this.el.querySelector('.kh-badge__breath')!.setAttribute('style', `animation-delay:${(-Math.random() * 4).toFixed(2)}s;animation-duration:${(3.6 + Math.random() * 0.9).toFixed(2)}s`);
    this.popEl = q(this.el, '.kh-badge__pop');
    this.baseWrap = q(this.el, '.kh-badge__base');
    const imgs = Array.from(this.el.querySelectorAll<HTMLImageElement>('.kh-badge__img'));
    this.base = [imgs[0], imgs[1]];
    this.blinkImg = imgs[2];
    this.reactImg = imgs[3];
    this.cardsEl = q(this.el, '[data-k=cards]');
    this.pistiEl = q(this.el, '[data-k=pisti]');
    this.pistiBox = q(this.el, '[data-k=pbox]');
    this.bubble = q(this.el, '.kh-bubble');
    this.acc = q(this.el, '.kh-acc');
    this.el.querySelector('.kh-badge__hit')?.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.onTap(this);
    });
    if (c.poses.kirpma) this.scheduleBlink();
  }

  private url(pose: HudPose): string {
    return this.p.char.poses[pose] || this.p.char.poses.notr;
  }

  // ───── göz kırpma ─────
  private scheduleBlink(): void {
    if (!ANIM) return;
    this.scope.timeout(() => {
      this.blink();
      this.scheduleBlink();
    }, 2500 + Math.random() * 3500);
  }

  private blink(): void {
    if (this.basePose !== 'notr' || this.reacting || document.hidden) return;
    const cl = document.documentElement.classList;
    if (cl.contains('kh-calm') || cl.contains('kh-low')) return;
    const dbl = Math.random() < 0.18;
    const kf: Keyframe[] = dbl
      ? [{opacity: 0}, {opacity: 1, offset: 0.08}, {opacity: 1, offset: 0.3}, {opacity: 0, offset: 0.4}, {opacity: 0, offset: 0.55}, {opacity: 1, offset: 0.63}, {opacity: 1, offset: 0.9}, {opacity: 0}]
      : [{opacity: 0}, {opacity: 1, offset: 0.15}, {opacity: 1, offset: 0.82}, {opacity: 0}];
    play(this.blinkImg, kf, {duration: dbl ? 380 : 150, easing: 'linear'}, 0);
  }

  // ───── hâller ─────
  /** Temel hâl: düşünürken düşünceli, aksi hâlde kalıcı ruh hâli ya da nötr. */
  private syncBase(): void {
    const pose: HudPose = this.thinking ? 'dusunceli' : this.persist ?? 'notr';
    if (pose === this.basePose) return;
    this.basePose = pose;
    const tok = ++this.baseTok;
    const next = this.base[1 - this.front], cur = this.base[this.front];
    next.src = this.url(pose);
    void ready(next).then(() => {
      if (tok !== this.baseTok) return;
      next.style.zIndex = '1';
      cur.style.zIndex = '0';
      cancelAnims(next);
      next.style.opacity = '1';
      cur.style.opacity = '0';
      this.front = 1 - this.front;
    });
  }

  setMood(pose: HudPose | null): void {
    this.persist = pose;
    this.syncBase();
  }

  /** Yaylı tepki: hâl katmanı belirir, rozet zıplar, küçük çizgi film vurgusu; ms sonra temel hâle döner. */
  react(pose: HudPose, ms = 1500): void {
    const tok = ++this.reactTok;
    const img = this.reactImg;
    img.src = this.url(pose);
    void ready(img).then(() => {
      if (tok !== this.reactTok) return;
      cancelAnims(img);
      cancelAnims(this.baseWrap);
      img.style.opacity = '1';
      this.baseWrap.style.opacity = '0';
      this.reacting = true;
      this.bounce(pose === 'kizgin' || pose === 'saskin' ? 1.14 : 1.1);
      const a = ACCENT[pose];
      if (a) this.accent(a);
      clearTimeout(this.reactTimer);
      if (ANIM) this.reactTimer = window.setTimeout(() => this.unreact(tok), ms);
    });
  }

  private unreact(tok: number): void {
    if (tok !== this.reactTok) return;
    const img = this.reactImg;
    img.style.opacity = '0';
    this.baseWrap.style.opacity = '1';
    this.scope.timeout(() => {
      if (tok === this.reactTok) this.reacting = false;
    }, 230);
  }

  /** Yaylı zıplama (tepki, dürtme). */
  bounce(s = 1.1, squash = false): void {
    play(this.popEl, squash
      ? [{transform: 'scale(1)'}, {transform: 'scale(1.16,.82)', offset: 0.18}, {transform: 'scale(.9,1.12)', offset: 0.42}, {transform: 'scale(1.04,.97)', offset: 0.66}, {transform: 'scale(1)'}]
      : [{transform: 'scale(1)'}, {transform: `scale(${s})`, offset: 0.3}, {transform: 'scale(.97)', offset: 0.62}, {transform: 'scale(1)'}],
    {duration: squash ? 460 : 420, easing: 'ease-out'});
  }

  private accent(a: Accent): void {
    const one = (sel: string, kf: Keyframe[], o: KeyframeAnimationOptions) => {
      const el = this.acc.querySelector<HTMLElement>(sel);
      if (el) play(el, kf, {fill: 'both', ...o}, 0.35);
    };
    if (a === 'anger') {
      one('.kh-acc__anger', [{transform: 'scale(0) rotate(-30deg)', opacity: 0}, {transform: 'scale(1.3) rotate(5deg)', opacity: 1, offset: 0.12}, {transform: 'scale(.9)', opacity: 1, offset: 0.24},
        {transform: 'scale(1.15)', opacity: 1, offset: 0.36}, {transform: 'scale(.95)', opacity: 1, offset: 0.48}, {transform: 'scale(1.1)', opacity: 1, offset: 0.6}, {transform: 'scale(.6)', opacity: 0}], {duration: 1500, easing: 'ease-out'});
      (Array.from(this.acc.querySelectorAll('.kh-acc__steam i')) as HTMLElement[]).forEach((p, i) =>
        play(p, [{transform: 'translate(0,6px) scale(.4)', opacity: 0}, {transform: 'translate(2px,-4px) scale(1)', opacity: 1, offset: 0.35}, {transform: 'translate(8px,-20px) scale(1.3)', opacity: 0}],
          {duration: 900, delay: 120 + i * 140, iterations: 2, easing: 'ease-out', fill: 'both'}, 0.35));
    } else if (a === 'q') {
      one('.kh-acc__q', [{transform: 'translateY(8px) scale(0) rotate(-20deg)', opacity: 0}, {transform: 'translateY(-4px) scale(1.25) rotate(8deg)', opacity: 1, offset: 0.14},
        {transform: 'translateY(0) scale(1) rotate(-4deg)', opacity: 1, offset: 0.26}, {transform: 'rotate(4deg)', opacity: 1, offset: 0.5}, {transform: 'rotate(-3deg)', opacity: 1, offset: 0.78}, {transform: 'translateY(-10px) scale(.8)', opacity: 0}],
      {duration: 1400, easing: 'ease-out'});
      this.sweat(1200);
    } else if (a === 'sweat') this.sweat(1600);
    else if (a === 'heart')
      one('.kh-acc__heart', [{transform: 'translate(0,6px) scale(0)', opacity: 0}, {transform: 'translate(0,-4px) scale(1.25)', opacity: 1, offset: 0.16}, {transform: 'translate(2px,-10px) scale(1)', opacity: 1, offset: 0.5},
        {transform: 'translate(6px,-26px) scale(.8)', opacity: 0}], {duration: 1300, easing: 'ease-out'});
    else {
      (Array.from(this.acc.querySelectorAll('.kh-acc__sp')) as HTMLElement[]).forEach((s, i) =>
        play(s, [{transform: 'scale(0) rotate(0deg)', opacity: 0}, {transform: 'scale(1.3) rotate(45deg)', opacity: 1, offset: 0.3}, {transform: 'scale(.9) rotate(70deg)', opacity: 1, offset: 0.55}, {transform: 'scale(0) rotate(120deg)', opacity: 0}],
          {duration: 760, delay: i * 130, easing: 'ease-out', fill: 'both'}, 0.35));
    }
  }

  private sweat(ms: number): void {
    const el = this.acc.querySelector<HTMLElement>('.kh-acc__sweat');
    if (el) play(el, [{transform: 'translateY(-4px) scale(0)', opacity: 0}, {transform: 'translateY(0) scale(1.1)', opacity: 1, offset: 0.15}, {transform: 'translateY(2px) scale(1)', opacity: 1, offset: 0.6},
      {transform: 'translateY(14px) scale(.85)', opacity: 0}], {duration: ms, easing: 'ease-in', fill: 'both'}, 0.35);
  }

  enter(i: number): void {
    play(this.el, [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.06)', opacity: 1, offset: 0.7}, {transform: 'scale(1)', opacity: 1}], {duration: 520, delay: 80 + i * 90, easing: EASE.out, fill: 'backwards'});
  }

  setStats(cards: number, pisti: number, animate = true): void {
    if (cards !== this.stats.cards) {
      this.cardsEl.textContent = String(cards);
      if (animate && this.stats.cards >= 0 && cards > this.stats.cards) play(this.cardsEl, [{transform: 'scale(1.6)'}, {transform: 'scale(1)'}], {duration: 260, easing: EASE.out});
    }
    if (pisti !== this.stats.pisti) {
      this.pistiEl.textContent = String(pisti);
      this.pistiBox.style.display = pisti > 0 ? '' : 'none';
      if (animate && this.stats.pisti >= 0 && pisti > this.stats.pisti) play(this.pistiBox, [{transform: 'scale(2) rotate(-12deg)'}, {transform: 'scale(1)'}], {duration: 420, easing: EASE.spring});
    }
    this.stats = {cards, pisti};
  }

  get cards(): number {
    return Math.max(0, this.stats.cards);
  }
  get pisti(): number {
    return Math.max(0, this.stats.pisti);
  }

  setTurn(on: boolean, thinking: boolean): void {
    this.el.classList.toggle('is-turn', on);
    const t = on && thinking && !this.p.isMe;
    if (t !== this.thinking) {
      this.thinking = t;
      this.syncBase();
    }
  }

  /** Balon + (varsa) tepki hâli. */
  say(text: string, mood: HudPose | null | undefined, ms: number): void {
    clearTimeout(this.sayTimer);
    this.el.classList.add('is-talking');
    this.bubble.textContent = text;
    this.bubble.classList.add('is-on');
    play(this.bubble, [{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1.06)', opacity: 1, offset: 0.62}, {transform: 'scale(1)', opacity: 1}],
      {duration: 360, easing: EASE.out, fill: 'backwards'});
    if (mood) this.react(mood, ms);
    if (ANIM) this.sayTimer = window.setTimeout(() => this.unsay(), ms);
  }

  unsay(): void {
    clearTimeout(this.sayTimer);
    this.el.classList.remove('is-talking');
    if (this.bubble.classList.contains('is-on')) {
      const a = this.bubble.animate([{opacity: 1, transform: 'scale(1)'}, {opacity: 0, transform: 'scale(.85)'}], {duration: 200, easing: 'ease-in', fill: 'forwards'});
      a.onfinish = () => {
        this.bubble.classList.remove('is-on');
        a.cancel();
      };
    }
  }

  /** Rozetin ekrandaki merkezi */
  center(): {x: number; y: number} {
    const r = this.popEl.getBoundingClientRect();
    return {x: r.left + r.width / 2, y: r.top + r.height / 2};
  }

  reset(): void {
    this.unsay();
    clearTimeout(this.reactTimer);
    this.reactTok++;
    this.reactImg.style.opacity = '0';
    this.baseWrap.style.opacity = '1';
    this.reacting = false;
    this.persist = null;
    this.thinking = false;
    this.syncBase();
    this.setTurn(false, false);
  }

  destroy(): void {
    clearTimeout(this.sayTimer);
    clearTimeout(this.reactTimer);
    this.scope.dispose();
    this.el.remove();
  }
}

export class HudView implements GameHud {
  readonly el = h('div', 'kh-hud is-hidden');
  onMenu: () => void = () => {};
  onPoke: (seat: number) => void = () => {};
  private badges = new Map<number, Badge>();
  private mode: Mode = '1v1';
  private signature = '';
  private scope = new Scope();
  private coinsCap: HTMLElement;
  private coinsVal: HTMLElement;
  private coins = 0;
  private coinsShown = 0;
  private deck: HTMLElement;
  private deckNum: HTMLElement;
  private dc = -2;
  private dx = NaN;
  private dy = NaN;
  private hint: HTMLElement;
  private hintTxt: HTMLElement;
  private hintText: string | null = null;
  private team: HTMLElement;
  private teamVals: HTMLElement[];
  private heroEl: HTMLElement | null = null;
  private tallyEl: HTMLElement;
  private visible = false;
  private snd: HudSounds | null = null;
  private frame: string | undefined;
  private tickRun = 0;
  private tickAt = 0;
  private pokeAt = 0;

  constructor(parent: HTMLElement, private fx: Fx) {
    this.el.innerHTML = `<div class="kh-capsule kh-hud__coins" data-coins><img class="kh-capsule__ico" src="${ASSETS.icon_coin}" alt=""><b class="kh-capsule__val kh-num">0</b></div>
      <div class="kh-team" style="display:none"><span class="is-a"><i>BİZ</i><b class="kh-num">0</b></span><span class="is-b"><i>ONLAR</i><b class="kh-num">0</b></span></div>
      <button class="kh-iconbtn kh-menu" aria-label="Duraklat">${I.pause}</button>
      <div class="kh-deck" style="display:none">${I.cards}<b class="kh-num">0</b></div>
      <div class="kh-hint"><span class="kh-hint__glow"></span>${I.hand}<span class="kh-hint__t"></span></div>
      <div class="kh-tallies"></div>`;
    this.coinsCap = q(this.el, '.kh-hud__coins');
    this.coinsVal = q(this.el, '.kh-capsule__val');
    this.deck = q(this.el, '.kh-deck');
    this.deckNum = q(this.deck, 'b');
    this.hint = q(this.el, '.kh-hint');
    this.hintTxt = q(this.el, '.kh-hint__t');
    this.team = q(this.el, '.kh-team');
    this.teamVals = Array.from(this.team.querySelectorAll('b'));
    this.tallyEl = q(this.el, '.kh-tallies');
    this.el.prepend(fx.nightEl); // gece karartması masayı kısar, rozet ve kahraman parlak kalır
    q(this.el, '.kh-menu').addEventListener('click', () => {
      if (this.visible) this.onMenu();
    });
    parent.append(this.el);
  }

  setSounds(s: HudSounds | null): void {
    this.snd = s;
    this.fx.snd = s;
  }

  /**
   * Rozetleri kurar ve HUD'u gösterir. coins/frame verilmezse önceki değer kalır.
   * Aynı oyuncu dizilimiyle tekrar çağrılırsa rozetler yeniden kurulmaz (yalnız sayaçlar sıfırlanır).
   */
  show(players: readonly SeatPlayer[], mode: Mode, coins?: number, frame?: string): void {
    if (coins !== undefined) this.setCoins(coins);
    if (frame !== undefined) this.frame = frame;
    const list: HudPlayer[] = players.map(p => ({seat: p.seat, name: p.name, char: p.char, isMe: p.human, team: mode === 'esli' ? p.team : -1, level: p.level,
      frame: p.human ? this.frame : undefined}));
    this.setPlayers(list, mode);
    this.badges.forEach(b => b.reset());
    this.setStats(players.map(() => ({cards: 0, pisti: 0})));
    this.setTurn(-1);
    this.showHint(null);
    this.tallyEl.innerHTML = '';
    if (!this.visible) {
      this.visible = true;
      this.el.classList.remove('is-hidden');
      let i = 0;
      this.badges.forEach(b => b.enter(i++));
      const drop = [{transform: 'translateY(-60px)', opacity: 0}, {transform: 'none', opacity: 1}];
      play(this.coinsCap, drop, {duration: 380, delay: 120, easing: EASE.spring, fill: 'backwards'});
      play(q(this.el, '.kh-menu'), drop, {duration: 380, delay: 160, easing: EASE.spring, fill: 'backwards'});
      if (mode === 'esli') play(this.team, drop, {duration: 380, delay: 220, easing: EASE.spring, fill: 'backwards'});
    }
  }

  hide(): void {
    this.visible = false;
    this.el.classList.add('is-hidden');
    this.badges.forEach(b => b.reset());
    this.showHint(null);
    this.setDeck(0, 0, 0);
    this.tallyEl.innerHTML = '';
    if (this.heroEl) {
      this.heroEl.className = 'kh-hero';
      this.heroEl.getAnimations({subtree: true}).forEach(a => a.cancel());
    }
  }

  /** Sonuç ekranı açıkken HUD'u gizle (oyun durumu değişmez). */
  dim(on: boolean): void {
    this.el.classList.toggle('is-dim', on);
  }

  /**
   * Hangi oyunun masası: 'blof' rozetleri Blöf yerleşimine alır (benim rozetim eylem çubuğunun soluna, rakip sayaçları
   * masadaki büyük haplarda; stiller src/ui/blofHud.css). Pişti'de hiç çağrılmaz (varsayılan 'pisti').
   */
  setGame(game: 'pisti' | 'blof'): void {
    this.el.dataset.game = game;
  }

  /** Rozet yanar (Blöf: elinde 1–2 kart kaldı). */
  alert(seat: number, on: boolean): void {
    this.badges.get(seat)?.el.classList.toggle('is-alert', on);
  }

  private setPlayers(list: HudPlayer[], mode: Mode): void {
    const sig = mode + '|' + list.map(p => `${p.seat}:${p.char.id}:${p.name}:${p.level}:${p.isMe ? 1 : 0}:${p.team}:${p.frame ?? ''}`).join(',');
    this.mode = mode;
    this.team.style.display = mode === 'esli' ? '' : 'none';
    this.el.dataset.mode = mode;
    if (sig === this.signature) return;
    this.signature = sig;
    this.badges.forEach(b => b.destroy());
    this.badges.clear();
    for (const p of list) {
      // 3 kişi (Blöf): 1 sağ-üst, 2 sol-üst
      const pos: Pos = mode === '1v1' ? (p.seat === 0 ? 'bottom' : 'top') : mode === '3' ? (['bottom', 'right', 'left'] as Pos[])[p.seat % 3] : (['bottom', 'right', 'top4', 'left'] as Pos[])[p.seat % 4];
      const b = new Badge(p, pos, x => this.poke(x));
      this.badges.set(p.seat, b);
      this.el.insertBefore(b.el, this.deck);
    }
    if (this.visible) {
      let i = 0;
      this.badges.forEach(b => b.enter(i++));
    }
  }

  private poke(b: Badge): void {
    const now = performance.now();
    if (now - this.pokeAt < 280) return;
    this.pokeAt = now;
    b.bounce(1, true);
    this.snd?.poke();
    this.onPoke(b.p.seat);
  }

  setStats(st: {cards: number; pisti: number}[]): void {
    st.forEach((s, seat) => this.badges.get(seat)?.setStats(s.cards, s.pisti));
    this.syncTeam();
  }

  tickCards(seat: number, cards: number): void {
    const now = performance.now();
    if (now - this.tickAt > 450) this.tickRun = 0;
    this.tickAt = now;
    const b = this.badges.get(seat);
    if (!b) return;
    b.setStats(cards, b.pisti);
    this.snd?.tick(this.tickRun++);
    this.syncTeam();
  }

  private syncTeam(): void {
    if (this.mode !== 'esli') return;
    const sum = [0, 0];
    this.badges.forEach(b => (sum[b.p.team === 0 ? 0 : 1] += b.cards));
    sum.forEach((v, i) => {
      const el = this.teamVals[i];
      if (el.textContent !== String(v)) {
        el.textContent = String(v);
        play(el, [{transform: 'scale(1.5)'}, {transform: 'scale(1)'}], {duration: 240, easing: EASE.out});
      }
    });
  }

  setCoins(n: number, animate = false): void {
    const from = this.coinsShown;
    this.coins = n;
    if (!animate) {
      this.coinsShown = n;
      this.coinsVal.textContent = fmt(n);
      return;
    }
    this.coinsCap.classList.remove('is-bump');
    void this.coinsCap.offsetWidth;
    this.coinsCap.classList.add('is-bump');
    countUp(this.scope, this.coinsVal, from, n, 700).then(() => (this.coinsShown = this.coins));
    this.coinsShown = n;
  }

  setTurn(seat: number, thinking = false): void {
    this.badges.forEach((b, s) => b.setTurn(s === seat, thinking));
  }

  setDeck(count: number, x: number, y: number): void {
    if (count !== this.dc) {
      const was = this.dc;
      this.dc = count;
      if (count <= 0) this.deck.style.display = 'none';
      else {
        if (was <= 0) this.deck.style.display = '';
        this.deckNum.textContent = String(count);
      }
    }
    if (count <= 0) return;
    const rx = Math.round(x * 2) / 2, ry = Math.round(y * 2) / 2;
    if (rx !== this.dx || ry !== this.dy) {
      this.dx = rx;
      this.dy = ry;
      this.deck.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    }
  }

  showHint(text: string | null): void {
    if (text === this.hintText) return;
    const was = this.hintText;
    this.hintText = text;
    if (text) {
      this.hintTxt.textContent = text;
      this.hint.classList.add('is-on');
      if (!was) play(this.hint, [{transform: 'translate(-50%, 10px) scale(.9)', opacity: 0}, {transform: 'translate(-50%, 0) scale(1)', opacity: 1}], {duration: 300, easing: EASE.spring, fill: 'backwards'});
    } else this.hint.classList.remove('is-on');
  }

  say(text: string, mood?: HudPose | null, ms = 2400, seat?: number): void {
    let b = seat !== undefined ? this.badges.get(seat) : undefined;
    if (!b)
      for (const x of this.badges.values())
        if (!x.p.isMe) {
          b = x;
          break;
        }
    b?.say(text, mood, ms);
  }

  react(seat: number, pose: HudPose, ms = 1500): void {
    this.badges.get(seat)?.react(pose, ms);
  }

  mood(seat: number, pose: HudPose | null): void {
    this.badges.get(seat)?.setMood(pose);
  }

  // ───────── pişti kahramanı ─────────
  private buildHero(): HTMLElement {
    const el = h('div', 'kh-hero', `<div class="kh-hero__band"><i class="kh-hero__rays"></i><i class="kh-hero__pat"></i><i class="kh-hero__shine"></i></div>
      <div class="kh-hero__wheel"></div><div class="kh-hero__fig"><img alt="" draggable="false"></div>
      <div class="kh-hero__name"></div><div class="kh-hero__say"></div>`);
    this.el.append(el);
    return el;
  }

  /** Pişti: kutlayan karakter pişti hâliyle (elinde maça valesi, göz kırpıyor) büyük kayarak girer; ışık süpürür, damga iner. */
  async pisti(o: HudPisti): Promise<void> {
    const b = this.badges.get(o.seat);
    const D = o.jack ? 2300 : 1650;
    const H = this.el.clientHeight || innerHeight;
    if (!b || !ANIM) {
      this.fx.stamp(o.jack, o.points, H * 0.47);
      this.fx.pistiFx(o.fx, o.jack, o.at, o.low);
      await this.scope.wait(ANIM ? D : 0);
      return;
    }
    const p = b.p;
    const hero = (this.heroEl ??= this.buildHero());
    const left = p.isMe || p.seat === 3;
    const blue = this.mode === 'esli' ? p.team === 0 : p.isMe;
    const dir = left ? 1 : -1;
    const img = hero.querySelector('img')!;
    img.src = p.char.poses.pisti || p.char.poses.notr;
    hero.style.setProperty('--bc1', shade(p.char.color, 0.4));
    hero.style.setProperty('--bc2', p.char.color);
    const name = q(hero, '.kh-hero__name');
    name.innerHTML = g3(p.name, 'is-white');
    const say = q(hero, '.kh-hero__say');
    say.textContent = o.line ?? '';
    say.style.display = o.line ? '' : 'none';
    await ready(img, 120);
    hero.className = `kh-hero is-on ${left ? 'is-left' : 'is-right'} ${blue ? 'is-blue' : 'is-red'}${o.jack ? ' is-jack' : ''}`;
    hero.dataset.fx = o.fx;
    const band = q(hero, '.kh-hero__band'), fig = q(hero, '.kh-hero__fig'), shine = q(hero, '.kh-hero__shine'), rays = q(hero, '.kh-hero__rays'), wheel = q(hero, '.kh-hero__wheel');
    const sk = 'skewY(-7deg)';
    const out = 1 - 300 / D;
    play(band, [
      {transform: `translateX(${-dir * 115}%) ${sk}`, opacity: 1},
      {transform: `translateX(${dir * 2}%) ${sk}`, opacity: 1, offset: 0.1},
      {transform: `translateX(0) ${sk}`, opacity: 1, offset: 0.16},
      {transform: `translateX(0) ${sk}`, opacity: 1, offset: out},
      {transform: `translateX(${dir * 115}%) ${sk}`, opacity: 1},
    ], {duration: D, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both'});
    play(fig, [
      {transform: `translateX(${-dir * 70}vw) rotate(${-dir * 10}deg) scale(.9)`, opacity: 1},
      {transform: `translateX(${dir * 3}vw) rotate(${dir * 3}deg) scale(1.04)`, opacity: 1, offset: 0.14},
      {transform: 'translateX(0) rotate(0deg) scale(1)', opacity: 1, offset: 0.22},
      {transform: 'translateX(0) rotate(0deg) scale(1.035)', opacity: 1, offset: out},
      {transform: `translateX(${dir * 70}vw) rotate(${dir * 8}deg) scale(.95)`, opacity: 1},
    ], {duration: D, delay: 50, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both'});
    play(shine, [{transform: 'translateX(-160%) skewX(-20deg)'}, {transform: 'translateX(-160%) skewX(-20deg)', offset: 0.12}, {transform: 'translateX(420%) skewX(-20deg)', offset: 0.42}, {transform: 'translateX(420%) skewX(-20deg)'}],
      {duration: D, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both'});
    play(rays, [{transform: 'rotate(0deg)', opacity: 0}, {transform: 'rotate(12deg)', opacity: 1, offset: 0.15}, {transform: 'rotate(50deg)', opacity: 1, offset: out}, {transform: 'rotate(60deg)', opacity: 0}],
      {duration: D, easing: 'linear', fill: 'both'});
    if (o.jack)
      play(wheel, [{transform: 'rotate(-40deg) scale(.2)', opacity: 0}, {transform: 'rotate(40deg) scale(1.05)', opacity: 1, offset: 0.16}, {transform: 'rotate(220deg) scale(1)', opacity: 1, offset: out}, {transform: 'rotate(260deg) scale(1.4)', opacity: 0}],
        {duration: D, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'});
    play(name, [{transform: 'translateY(20px) scale(.6)', opacity: 0}, {transform: 'translateY(20px) scale(.6)', opacity: 0, offset: 0.14}, {transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: 0.24},
      {transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.3}, {transform: 'scale(1)', opacity: 1, offset: out}, {transform: 'scale(.9)', opacity: 0}], {duration: D, easing: 'ease-out', fill: 'both'});
    if (o.line)
      play(say, [{transform: 'scale(.2)', opacity: 0}, {transform: 'scale(.2)', opacity: 0, offset: 0.2}, {transform: 'scale(1.08)', opacity: 1, offset: 0.3}, {transform: 'scale(1)', opacity: 1, offset: 0.36},
        {transform: 'scale(1)', opacity: 1, offset: out}, {transform: 'scale(.8)', opacity: 0}], {duration: D, easing: 'ease-out', fill: 'both'});
    this.snd?.swoosh();
    this.scope.timeout(() => this.fx.stamp(o.jack, o.points, H * 0.66, D - 160, true), 150);
    // efekt kahramanın ARKASINDA, başının çevresinde oynar (yüz örtülmez); yüz kutusu portrenin yerleşiminden (kayma hariç)
    const fs = fig.offsetWidth;
    const face = new DOMRect(fig.offsetLeft + fs * FACE_BOX.l, fig.offsetTop + fs * FACE_BOX.t, fs * (FACE_BOX.r - FACE_BOX.l), fs * (FACE_BOX.b - FACE_BOX.t));
    this.scope.timeout(() => this.fx.pistiFx(o.fx, o.jack, o.at, o.low, {host: hero, before: fig, face}), 120);
    b.react('pisti', D);
    await this.scope.wait(D + 60);
    this.fx.heroDone();
    hero.className = 'kh-hero';
    hero.getAnimations({subtree: true}).forEach(a => a.cancel());
  }

  /** Zafer coşkusu: rozetten jeton + konfeti fışkırır. */
  cheer(seat: number): void {
    const b = this.badges.get(seat);
    if (!b) return;
    const c = b.center();
    this.fx.burst(c, {coins: 10, confetti: 28, power: 0.9, up: 1.15});
    this.snd?.bonus();
    b.bounce(1.16);
  }

  combo(seat: number, n: number, x: number, y: number): void {
    this.fx.combo(n, x, y, seat === 0);
    this.snd?.combo(n);
  }

  shout(text: string, x: number, y: number, tone: 'gold' | 'white' | 'blue' = 'gold'): void {
    this.fx.shout(text, x, y, tone);
  }

  banner(text: string, sub?: string, ms?: number): void {
    this.fx.banner(text, sub, ms);
  }

  popScore(x: number, y: number, text: string, tone: 'gold' | 'white' | 'blue' = 'gold'): void {
    this.fx.pop(x, y, text, tone);
  }

  // ───────── el sonu sayımı ─────────
  /** Kart sayaçları desteler üstünde sayar; eşlide ortağın sayısı akıp toplanır; çoğunluk +3 kazanana uçar. */
  async tally(o: HudTally): Promise<void> {
    const layer = this.tallyEl;
    layer.innerHTML = '';
    const pills = new Map<number, {el: HTMLElement; num: HTMLElement; v: number; x: number; y: number}>();
    const pos = (el: HTMLElement, x: number, y: number) => (el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`);
    let max = 0;
    for (const r of o.rows) {
      const b = this.badges.get(r.seat);
      const team = this.mode === 'esli' && b ? (b.p.team === 0 ? ' team-a' : ' team-b') : b?.p.isMe ? ' is-me' : '';
      const el = h('div', 'kh-tally' + team, `<div class="kh-tally__in">${I.cards}<b class="kh-num">0</b></div>`);
      pos(el, r.x, r.y);
      layer.append(el);
      const inn = el.firstElementChild as HTMLElement;
      play(inn, [{transform: 'translate(-50%,-100%) scale(.2)', opacity: 0}, {transform: 'translate(-50%,-100%) scale(1.15)', opacity: 1, offset: 0.6}, {transform: 'translate(-50%,-100%) scale(1)', opacity: 1}],
        {duration: 320, easing: EASE.out, fill: 'both'});
      const num = q(el, 'b');
      pills.set(r.seat, {el, num, v: r.cards, x: r.x, y: r.y});
      void countUp(this.scope, num, 0, r.cards, 900);
      max = Math.max(max, r.cards);
    }
    // sayaç tıkları (en büyük sayıya göre)
    const ticks = Math.min(18, max);
    for (let i = 0; i < ticks; i++) this.scope.timeout(() => this.snd?.tick(i), (900 * (1 - Math.pow(1 - (i + 1) / ticks, 1 / 3))) | 0);
    await this.scope.wait(1050);
    // eşli: ortağın sayısı hedefe akar
    if (o.merge?.length) {
      for (const [from, to] of o.merge) {
        const a = pills.get(from), b = pills.get(to);
        if (!a || !b) continue;
        play(a.el, [{transform: `translate3d(${a.x}px,${a.y}px,0)`}, {transform: `translate3d(${(a.x + b.x) / 2}px,${Math.min(a.y, b.y) - 50}px,0)`, offset: 0.5}, {transform: `translate3d(${b.x}px,${b.y}px,0)`, opacity: 1}],
          {duration: 480, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards'});
        this.scope.timeout(() => {
          a.el.style.visibility = 'hidden';
          const sum = a.v + b.v;
          void countUp(this.scope, b.num, b.v, sum, 380);
          b.v = sum;
          play(b.el.firstElementChild!, [{transform: 'translate(-50%,-100%) scale(1)'}, {transform: 'translate(-50%,-100%) scale(1.3)', offset: 0.35}, {transform: 'translate(-50%,-100%) scale(1)'}], {duration: 380, easing: EASE.out});
          this.snd?.tick(12);
        }, 470);
      }
      await this.scope.wait(900);
    }
    // çoğunluk +3
    const win = pills.get(o.majority);
    if (win) {
      const chip = h('div', 'kh-tally__bonus', `<span>ÇOĞUNLUK</span>${g3('+3')}`);
      layer.append(chip);
      play(chip, [
        {transform: `translate3d(${o.from.x}px,${o.from.y}px,0) translate(-50%,-50%) scale(.3)`, opacity: 0},
        {transform: `translate3d(${o.from.x}px,${o.from.y}px,0) translate(-50%,-50%) scale(1.25)`, opacity: 1, offset: 0.25},
        {transform: `translate3d(${o.from.x}px,${o.from.y - 10}px,0) translate(-50%,-50%) scale(1)`, opacity: 1, offset: 0.45},
        {transform: `translate3d(${(o.from.x + win.x) / 2}px,${Math.min(o.from.y, win.y) - 70}px,0) translate(-50%,-50%) scale(1.05)`, opacity: 1, offset: 0.72},
        {transform: `translate3d(${win.x}px,${win.y - 30}px,0) translate(-50%,-50%) scale(.6)`, opacity: 0},
      ], {duration: 1150, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'both'});
      this.snd?.coin(2);
      await this.scope.wait(1100);
      win.el.classList.add('is-win');
      play(win.el.firstElementChild!, [{transform: 'translate(-50%,-100%) scale(1)'}, {transform: 'translate(-50%,-100%) scale(1.45) rotate(-6deg)', offset: 0.3}, {transform: 'translate(-50%,-100%) scale(1)'}], {duration: 520, easing: EASE.out});
      this.fx.pop(win.x, win.y - 46, '+3', 'gold', true);
      this.snd?.bonus();
    } else {
      const chip = h('div', 'kh-tally__bonus is-none', `<span>ÇOĞUNLUK YOK</span>`);
      layer.append(chip);
      play(chip, [{transform: `translate3d(${o.from.x}px,${o.from.y}px,0) translate(-50%,-50%) scale(.4)`, opacity: 0}, {transform: `translate3d(${o.from.x}px,${o.from.y}px,0) translate(-50%,-50%) scale(1)`, opacity: 1, offset: 0.2},
        {transform: `translate3d(${o.from.x}px,${o.from.y}px,0) translate(-50%,-50%) scale(1)`, opacity: 1, offset: 0.8}, {transform: `translate3d(${o.from.x}px,${o.from.y - 20}px,0) translate(-50%,-50%) scale(.9)`, opacity: 0}],
        {duration: 1300, easing: 'ease-out', fill: 'both'});
      await this.scope.wait(900);
    }
    await this.scope.wait(700);
    layer.querySelectorAll<HTMLElement>('.kh-tally').forEach(el => play(el, [{opacity: 1}, {opacity: 0}], {duration: 280, fill: 'forwards'}));
    await this.scope.wait(300);
  }
}
