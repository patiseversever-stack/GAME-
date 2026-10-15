// Oyun içi arayüz (3B masanın üstünde, şeffaf): oyuncu rozetleri, jeton, duraklat, deste sayacı, ipucu,
// tepki kartı + balon, PİŞTİ damgası, afiş, puan baloncukları. Ortadaki ~%60 masa için boş bırakılır.
import type {GameHud, HudLayout, HudPlayer, Mood, Opponent, Profile} from './types';
import {ANIM, EASE, Scope, countUp, esc, fmt, h, initials, play, q} from './dom';
import {ASSETS, OPTIONAL_ART, isCutout} from './assets';
import {I} from './icons';
import type {Fx} from './fx';

type Pos = 'top' | 'bottom' | 'left' | 'right';
const POS4: Pos[] = ['bottom', 'right', 'top', 'left'];
const CARD_ROT: Record<Pos, number> = {top: -5, bottom: 4, left: 4, right: -4};

/** Tek oyuncu rozeti: yuvarlak altın çerçeveli portre, isim şeridi, istatistik, sıra halkası, tepki. */
class Badge {
  readonly el: HTMLElement;
  private scope = new Scope();
  private blinkImg: HTMLImageElement | null = null;
  private cardsEl: HTMLElement;
  private pistiEl: HTMLElement;
  private card: HTMLElement;
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
      : `<div class="kh-badge__init"><span>${esc(initials(p.name))}</span></div>`;
    this.el = h('div', `kh-badge is-${pos}${p.isMe ? ' is-me' : ''}${cut ? ' is-cutout' : ''}${frame ? ' has-frame' : ''}`, `
      <div class="kh-badge__glow"></div><div class="kh-badge__turn"></div><div class="kh-badge__ring"></div>
      <div class="kh-badge__clip">${face}</div>
      ${frame ? `<img class="kh-badge__frame" src="${frame}" alt="">` : ''}
      <div class="kh-badge__plate">
        <div class="kh-badge__name">${esc(p.name)}</div>
        <div class="kh-badge__sub">
          <div class="kh-stats"><span>${I.cards}<b class="kh-num" data-k="cards">0</b></span><span>${I.star}<b class="kh-num" data-k="pisti">0</b> pişti</span></div>
          <div class="kh-badge__think">düşünüyor<span class="kh-dots"><i></i><i></i><i></i><b></b></span></div>
        </div>
      </div>
      <div class="kh-react__card"><img alt=""></div>
      <div class="kh-react__bubble"></div>
      <div class="kh-steam">${OPTIONAL_ART.steam ? `<img src="${OPTIONAL_ART.steam}" alt="">` : '<i></i><i></i><i></i>'}</div>`);
    this.cardsEl = q(this.el, '[data-k=cards]');
    this.pistiEl = q(this.el, '[data-k=pisti]');
    this.card = q(this.el, '.kh-react__card');
    this.bubble = q(this.el, '.kh-react__bubble');
    this.steam = q(this.el, '.kh-steam');
    this.blinkImg = this.el.querySelector('.kh-badge__blink');
    if (p.portrait && !p.isMe) this.el.classList.add('is-breathing');
    if (this.blinkImg) this.scheduleBlink();
  }

  private scheduleBlink(): void {
    if (!ANIM) return;
    this.scope.timeout(() => {
      if (this.blinkImg) play(this.blinkImg, [{opacity: 0}, {opacity: 1, offset: 0.3}, {opacity: 1, offset: 0.62}, {opacity: 0}], {duration: 190, easing: 'linear'});
      this.scheduleBlink();
    }, 3000 + Math.random() * 3000);
  }

  enter(i: number): void {
    play(this.el, [{transform: 'scale(.55)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 420, delay: 80 + i * 70, easing: EASE.spring, fill: 'backwards'});
  }

  setStats(cards: number, pisti: number): void {
    if (cards !== this.stats.cards) {
      this.cardsEl.textContent = String(cards);
      if (this.stats.cards >= 0 && cards > this.stats.cards) play(this.cardsEl, [{transform: 'scale(1.5)'}, {transform: 'scale(1)'}], {duration: 320, easing: EASE.out});
    }
    if (pisti !== this.stats.pisti) {
      this.pistiEl.textContent = String(pisti);
      if (this.stats.pisti >= 0 && pisti > this.stats.pisti) play(this.pistiEl, [{transform: 'scale(1.7)'}, {transform: 'scale(1)'}], {duration: 380, easing: EASE.out});
    }
    this.stats = {cards, pisti};
  }

  setTurn(on: boolean): void {
    this.el.classList.toggle('is-turn', on);
  }

  say(text: string, mood: Mood | undefined, ms: number): void {
    clearTimeout(this.sayTimer);
    const img = mood ? this.p.moods?.[mood] : undefined;
    const rot = CARD_ROT[this.pos];
    this.bubble.textContent = text;
    this.bubble.classList.toggle('with-card', !!img);
    this.bubble.classList.add('is-on');
    play(this.bubble, [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.04)', opacity: 1, offset: 0.65}, {transform: 'scale(1)', opacity: 1}],
      {duration: 340, delay: img ? 90 : 0, easing: EASE.out, fill: 'backwards'});
    if (img) {
      (this.card.firstElementChild as HTMLImageElement).src = img;
      this.card.classList.add('is-on');
      play(this.card, [
        {transform: `rotate(${rot * 3}deg) scale(.3)`, opacity: 0},
        {transform: `rotate(${rot * 0.6}deg) scale(1.06)`, opacity: 1, offset: 0.6},
        {transform: `rotate(${rot}deg) scale(1)`, opacity: 1},
      ], {duration: 420, easing: EASE.out, fill: 'backwards'});
    } else this.card.classList.remove('is-on');
    if (mood === 'kizgin') this.puff();
    if (ANIM) this.sayTimer = window.setTimeout(() => this.unsay(), ms);
  }

  private puff(): void {
    this.steam.classList.add('is-on');
    const parts = Array.from(this.steam.children) as HTMLElement[];
    parts.forEach((p, i) =>
      play(p, [{transform: 'translate(0,6px) scale(.4)', opacity: 0}, {transform: 'translate(2px,-4px) scale(1)', opacity: 1, offset: 0.35}, {transform: 'translate(6px,-18px) scale(1.25)', opacity: 0}],
        {duration: 1300, delay: i * 140, iterations: 2, easing: 'ease-out', fill: 'both'}, 0.35));
    this.scope.timeout(() => this.steam.classList.remove('is-on'), 3000);
  }

  unsay(): void {
    clearTimeout(this.sayTimer);
    const out = (el: HTMLElement, base: string) => {
      if (!el.classList.contains('is-on')) return;
      const a = el.animate([{opacity: 1, transform: base}, {opacity: 0, transform: `${base} scale(.88)`}], {duration: 200, easing: 'ease-in', fill: 'forwards'});
      a.onfinish = () => {
        el.classList.remove('is-on');
        a.cancel();
      };
    };
    out(this.card, `rotate(${CARD_ROT[this.pos]}deg)`);
    out(this.bubble, 'scale(1)');
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
    this.el.innerHTML = `<div class="kh-hud__vig"></div>
      <div class="kh-capsule kh-hud__coins" data-coins><img class="kh-capsule__ico" src="${ASSETS.icon_coin}" alt=""><b class="kh-capsule__val kh-num">0</b></div>
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
        {seat: 0, name: p.name, portrait: '', isMe: true},
        {seat: 1, name: o.name, portrait: o.portrait, blink: o.blink, moods: o.moods},
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

  setPlayers(list: HudPlayer[], layout: HudLayout): void {
    const sig = layout + '|' + list.map(p => `${p.seat}:${p.name}:${p.portrait}:${p.isMe ? 1 : 0}`).join(',');
    if (sig === this.signature) return;
    this.signature = sig;
    this.badges.forEach(b => b.destroy());
    this.badges.clear();
    const anchor = this.deck;
    for (const p of list) {
      const pos: Pos = layout === '1v1' ? (p.seat === 0 ? 'bottom' : 'top') : POS4[p.seat % 4];
      const b = new Badge(p, pos);
      this.badges.set(p.seat, b);
      this.el.insertBefore(b.el, anchor);
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
    if (!b) for (const x of this.badges.values()) if (!x.p.isMe) {
      b = x;
      break;
    }
    b?.say(text, mood, ms);
  }

  pisti(jack: boolean, points: number): void {
    this.fx.flash(jack ? 0.9 : 0.75);
    this.fx.stamp(jack, points);
    const r = this.el.getBoundingClientRect();
    const at = {x: r.width / 2, y: r.height * 0.4};
    this.fx.burst(at, {coins: jack ? 16 : 11, confetti: jack ? 36 : 26, power: jack ? 1.2 : 1});
  }

  banner(text: string, sub?: string): void {
    this.fx.banner(text, sub);
  }

  popScore(x: number, y: number, text: string): void {
    this.fx.pop(x, y, text);
  }
}
