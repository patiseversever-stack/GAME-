// Oyun içi arayüz (masanın üstünde, tamamen saydam; zemin/karartma yok) · DİKEY: oyuncu rozetleri, jeton, duraklat,
// deste sayacı, ipucu, konuşma balonu + rozet içinde duygu yüzü, PİŞTİ damgası, afiş, puan baloncukları. Ortadaki masa alanı boş kalır.
import type {GameHud, HudLayout, HudPlayer, Mood, Opponent, Profile} from './types';
import {ANIM, EASE, Scope, countUp, esc, fmt, h, initials, play, q} from './dom';
import {ASSETS, OPTIONAL_ART, isCutout} from './assets';
import {I} from './icons';
import {gemHtml, oppLevel} from './parts';
import type {Fx} from './fx';

/** Rozet konumu: 1'e 1'de ben sol altta (bottom), rakip üstte; 4 kişide ben alt ortada (me4). */
type Pos = 'top' | 'bottom' | 'left' | 'right' | 'me4';
const POS4: Pos[] = ['me4', 'right', 'top', 'left'];

/** Tek oyuncu rozeti: beyaz kalın çemberli yuvarlak portre, dönen sıra halkası, seviye taşı, isim hapı, sayaç hapları, balon. */
class Badge {
  readonly el: HTMLElement;
  private scope = new Scope();
  private blinkImg: HTMLImageElement | null;
  private moodImg: HTMLImageElement;
  private cardsEl: HTMLElement;
  private pistiEl: HTMLElement;
  private pistiBox: HTMLElement;
  private bubble: HTMLElement;
  private steam: HTMLElement;
  private sayTimer = 0;
  private stats = {cards: -1, pisti: -1};

  constructor(readonly p: HudPlayer, readonly pos: Pos) {
    const cut = !!p.portrait && isCutout(p.portrait);
    const hasBlink = !!p.blink && p.blink !== p.portrait;
    const frame = OPTIONAL_ART.badge_frame;
    const face = p.portrait
      ? `<div class="kh-badge__breath"><img class="kh-badge__img" src="${p.portrait}" alt="">${hasBlink ? `<img class="kh-badge__blink" src="${p.blink}" alt="">` : ''}</div>`
      : `<div class="kh-badge__init"><span>${esc(p.initials ?? initials(p.name))}</span></div>`;
    this.el = h('div', `kh-badge is-${pos}${p.isMe ? ' is-me' : ''}${cut ? ' is-cutout' : ''}${frame ? ' has-frame' : ''}${p.level ? ' has-gem' : ''}`, `
      <div class="kh-badge__glow"></div><div class="kh-badge__turn"></div><div class="kh-badge__ring"></div>
      <div class="kh-badge__clip">${face}<img class="kh-badge__mood" alt=""></div>
      ${frame ? `<img class="kh-badge__frame" src="${frame}" alt="">` : ''}
      ${p.level ? gemHtml(p.level, !!p.isMe) : ''}
      <div class="kh-badge__plate">
        <div class="kh-badge__name">${esc(p.name)}</div>
        <div class="kh-badge__pill"><span>${I.cards}<b class="kh-num" data-k="cards">0</b></span><span data-k="pbox">${I.star}<b class="kh-num" data-k="pisti">0</b></span></div>
      </div>
      <div class="kh-think">düşünüyor<span class="kh-dots"><i></i><i></i><i></i><b></b></span></div>
      <div class="kh-bubble"></div>
      <div class="kh-steam">${OPTIONAL_ART.steam ? `<img src="${OPTIONAL_ART.steam}" alt="">` : '<i></i><i></i><i></i>'}</div>`);
    this.cardsEl = q(this.el, '[data-k=cards]');
    this.pistiEl = q(this.el, '[data-k=pisti]');
    this.pistiBox = q(this.el, '[data-k=pbox]');
    this.bubble = q(this.el, '.kh-bubble');
    this.steam = q(this.el, '.kh-steam');
    this.moodImg = q(this.el, '.kh-badge__mood');
    this.blinkImg = this.el.querySelector('.kh-badge__blink');
    if (p.portrait && !p.isMe) this.el.classList.add('is-breathing');
    if (this.blinkImg) this.scheduleBlink();
  }

  private scheduleBlink(): void {
    if (!ANIM) return;
    this.scope.timeout(() => {
      if (this.blinkImg && !this.el.classList.contains('is-talking'))
        play(this.blinkImg, [{opacity: 0}, {opacity: 1, offset: 0.3}, {opacity: 1, offset: 0.62}, {opacity: 0}], {duration: 190, easing: 'linear'});
      this.scheduleBlink();
    }, 3000 + Math.random() * 3000);
  }

  enter(i: number): void {
    play(this.el, [{transform: 'scale(.5)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 440, delay: 80 + i * 80, easing: EASE.spring, fill: 'backwards'});
  }

  setStats(cards: number, pisti: number): void {
    if (cards !== this.stats.cards) {
      this.cardsEl.textContent = String(cards);
      if (this.stats.cards >= 0 && cards > this.stats.cards) play(this.cardsEl, [{transform: 'scale(1.6)'}, {transform: 'scale(1)'}], {duration: 320, easing: EASE.out});
    }
    if (pisti !== this.stats.pisti) {
      this.pistiEl.textContent = String(pisti);
      this.pistiBox.style.display = pisti > 0 ? '' : 'none';
      if (this.stats.pisti >= 0 && pisti > this.stats.pisti) play(this.pistiBox, [{transform: 'scale(1.8)'}, {transform: 'scale(1)'}], {duration: 380, easing: EASE.out});
    }
    this.stats = {cards, pisti};
  }

  setTurn(on: boolean): void {
    this.el.classList.toggle('is-turn', on);
  }

  /** Balon + (varsa) duygu yüzü rozetin içinde kısa süre; kızgınsa buhar. */
  say(text: string, mood: Mood | undefined, ms: number): void {
    clearTimeout(this.sayTimer);
    this.el.classList.add('is-talking');
    this.bubble.textContent = text;
    this.bubble.classList.add('is-on');
    play(this.bubble, [{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1.06)', opacity: 1, offset: 0.62}, {transform: 'scale(1)', opacity: 1}],
      {duration: 360, easing: EASE.out, fill: 'backwards'});
    const img = mood ? this.p.moods?.[mood] : undefined;
    if (img) {
      this.moodImg.src = img;
      play(this.moodImg, [{opacity: 0, transform: 'scale(1.75)'}, {opacity: 1, transform: 'scale(1.45)'}], {duration: 260, easing: EASE.out, fill: 'forwards'});
      play(q(this.el, '.kh-badge__ring'), [{transform: 'scale(1)'}, {transform: 'scale(1.08)'}, {transform: 'scale(1)'}], {duration: 320, easing: EASE.out});
    } else this.moodImg.getAnimations().forEach(a => a.cancel());
    if (mood === 'kizgin') this.puff();
    if (ANIM) this.sayTimer = window.setTimeout(() => this.unsay(), ms);
  }

  private puff(): void {
    this.steam.classList.add('is-on');
    (Array.from(this.steam.children) as HTMLElement[]).forEach((p, i) =>
      play(p, [{transform: 'translate(0,6px) scale(.4)', opacity: 0}, {transform: 'translate(2px,-4px) scale(1)', opacity: 1, offset: 0.35}, {transform: 'translate(6px,-18px) scale(1.25)', opacity: 0}],
        {duration: 1300, delay: i * 140, iterations: 2, easing: 'ease-out', fill: 'both'}, 0.35));
    this.scope.timeout(() => this.steam.classList.remove('is-on'), 3000);
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
    if (this.moodImg.getAnimations().length) {
      this.moodImg.getAnimations().forEach(a => a.cancel());
      play(this.moodImg, [{opacity: 1, transform: 'scale(1.45)'}, {opacity: 0, transform: 'scale(1.45)'}], {duration: 260, easing: 'ease-in'});
    }
  }

  destroy(): void {
    clearTimeout(this.sayTimer);
    this.scope.dispose();
    this.el.remove();
  }
}

export class HudView implements GameHud {
  readonly el = h('div', 'kh-hud is-hidden');
  onMenu: () => void = () => {};
  private badges = new Map<number, Badge>();
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
  private visible = false;

  constructor(parent: HTMLElement, private fx: Fx) {
    this.el.innerHTML = `<div class="kh-capsule kh-hud__coins" data-coins><img class="kh-capsule__ico" src="${ASSETS.icon_coin}" alt=""><b class="kh-capsule__val kh-num">0</b></div>
      <button class="kh-iconbtn kh-menu" aria-label="Duraklat">${I.pause}</button>
      <div class="kh-deck" style="display:none">${I.cards}<b class="kh-num">0</b></div>
      <div class="kh-hint"><span class="kh-hint__glow"></span>${I.hand}<span class="kh-hint__t"></span></div>`;
    this.coinsCap = q(this.el, '.kh-hud__coins');
    this.coinsVal = q(this.el, '.kh-capsule__val');
    this.deck = q(this.el, '.kh-deck');
    this.deckNum = q(this.deck, 'b');
    this.hint = q(this.el, '.kh-hint');
    this.hintTxt = q(this.el, '.kh-hint__t');
    q(this.el, '.kh-menu').addEventListener('click', () => {
      if (this.visible) this.onMenu();
    });
    parent.append(this.el);
  }

  show(o: Opponent, p: Profile): void {
    this.setPlayers(
      [
        {seat: 0, name: 'Sen', portrait: '', isMe: true, level: p.level, initials: initials(p.name)},
        {seat: 1, name: o.name, portrait: o.portrait, blink: o.blink, moods: o.moods, level: oppLevel(o)},
      ],
      '1v1',
    );
    this.setCoins(p.coins);
    this.setStats([{cards: 0, pisti: 0}, {cards: 0, pisti: 0}]);
    this.setTurn(-1);
    this.showHint(null);
    if (!this.visible) {
      this.visible = true;
      this.el.classList.remove('is-hidden');
      let i = 0;
      this.badges.forEach(b => b.enter(i++));
      play(this.coinsCap, [{transform: 'translateY(-60px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 120, easing: EASE.spring, fill: 'backwards'});
      play(q(this.el, '.kh-menu'), [{transform: 'translateY(-60px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 160, easing: EASE.spring, fill: 'backwards'});
    }
  }

  hide(): void {
    this.visible = false;
    this.el.classList.add('is-hidden');
    this.badges.forEach(b => {
      b.unsay();
      b.setTurn(false);
    });
    this.showHint(null);
    this.setDeck(0, 0, 0);
  }

  /** Sonuç ekranı açıkken HUD'u gizle (oyun durumu değişmez). */
  dim(on: boolean): void {
    this.el.classList.toggle('is-dim', on);
  }

  setPlayers(list: HudPlayer[], layout: HudLayout): void {
    const sig = layout + '|' + list.map(p => `${p.seat}:${p.name}:${p.portrait}:${p.level ?? ''}:${p.isMe ? 1 : 0}`).join(',');
    if (sig === this.signature) return;
    this.signature = sig;
    this.badges.forEach(b => b.destroy());
    this.badges.clear();
    for (const p of list) {
      const pos: Pos = layout === '1v1' ? (p.seat === 0 ? 'bottom' : 'top') : POS4[p.seat % 4];
      const b = new Badge(p, pos);
      this.badges.set(p.seat, b);
      this.el.insertBefore(b.el, this.deck);
    }
    if (this.visible) {
      let i = 0;
      this.badges.forEach(b => b.enter(i++));
    }
  }

  setStats(st: {cards: number; pisti: number}[]): void {
    st.forEach((s, seat) => this.badges.get(seat)?.setStats(s.cards, s.pisti));
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

  setTurn(seat: number): void {
    this.badges.forEach((b, s) => b.setTurn(s === seat));
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
      if (!was) play(this.hint, [{transform: 'translate(-50%, 10px)', opacity: 0}, {transform: 'translate(-50%, 0)', opacity: 1}], {duration: 300, easing: EASE.spring, fill: 'backwards'});
    } else this.hint.classList.remove('is-on');
  }

  say(text: string, mood?: Mood, ms = 2400, seat?: number): void {
    let b = seat !== undefined ? this.badges.get(seat) : undefined;
    if (!b)
      for (const x of this.badges.values())
        if (!x.p.isMe) {
          b = x;
          break;
        }
    b?.say(text, mood, ms);
  }

  pisti(jack: boolean, points: number): void {
    this.fx.flash(jack ? 0.75 : 0.6);
    this.fx.stamp(jack, points);
    const r = this.el.getBoundingClientRect();
    this.fx.burst({x: r.width / 2, y: r.height * 0.46}, {coins: jack ? 14 : 10, confetti: jack ? 40 : 30, power: jack ? 1.15 : 1});
  }

  banner(text: string, sub?: string): void {
    this.fx.banner(text, sub);
  }

  popScore(x: number, y: number, text: string): void {
    this.fx.pop(x, y, text);
  }
}
