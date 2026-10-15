// Ekran efektleri: yumuşak renkli ışık patlaması, jeton + dört renk konfeti (havuzlu DOM), uçan jetonlar,
// PİŞTİ damgası (dört renk hüzme, valede dört renk çark), afiş, puan baloncuğu, seri rozeti, vurgu yazısı ve
// kuşanılabilir pişti efektleri: klasik (dört renk patlama) · havai (fişek) · yildiz (kayan yıldız yağmuru) · altin (sikke yağmuru).
// Yalnız transform + opacity; düğümler havuzdan gelir, iş bitince gizlenir (yeni düğüm üretilmez).
import './fx.css';
import {ANIM, EASE, esc, h, play} from './dom';
import {ASSETS, OPTIONAL_ART} from './assets';
import {suitSvg, type SuitKey} from './icons';
import type {HudSounds} from './types';

type Pt = {x: number; y: number};
export type Tone = 'gold' | 'white' | 'blue';

const N_COIN = 44;
const N_CONF = 40;
const N_SUIT = 12;
const N_POP = 8;
const SUITS: SuitKey[] = ['h', 'd', 'c', 's'];
const SUIT_HEX = ['#ff2e4d', '#ffb400', '#16c45b', '#1f7bff'];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function g3(text: string, cls = ''): string {
  const t = esc(text);
  return `<span class="kh-g3 ${cls}" data-t="${t}">${t}</span>`;
}

/** Sabit boyutlu düğüm havuzu (sırayla döner; en eskisi yeniden kullanılır). */
class Ring {
  private list: HTMLElement[] = [];
  private i = 0;
  constructor(private host: HTMLElement, private max: number, private make: () => HTMLElement) {}
  get(): HTMLElement {
    let n = this.list[this.i % this.max];
    if (!n) {
      n = this.make();
      this.list.push(n);
      this.host.append(n);
    }
    this.i++;
    n.getAnimations().forEach(a => a.cancel());
    n.style.display = 'block';
    return n;
  }
}

const hide = (n: HTMLElement) => (n.style.display = 'none');

export class Fx {
  readonly el = h('div', 'kh-fx');
  private flashEl = h('div', 'kh-flash');
  /** Yıldız yağmurunda ışığı kısan katman (HUD bunu kendi altına taşır: kahraman kararmasın). */
  readonly nightEl = h('div', 'kh-night');
  private coins: HTMLElement[] = [];
  private confs: HTMLElement[] = [];
  private suits: HTMLElement[] = [];
  private pops: HTMLElement[] = [];
  private stampEl = h('div', 'kh-stamp');
  private bannerEl = h('div', 'kh-banner');
  private shoutEl = h('div', 'kh-shout');
  private comboEl = h('div', 'kh-combo');
  private stampTimer = 0;
  private bannerTimer = 0;
  private popIdx = 0;
  // havai fişek / yıldız / ışın havuzları
  private rockets: Ring;
  private fwp: Ring;
  private glitter: Ring;
  private fwFlash: Ring;
  private stars: Ring;
  private beams: Ring;
  /** Efektlere eşlik eden sesler (Match bağlar) */
  snd: HudSounds | null = null;

  constructor(parent: HTMLElement) {
    this.el.style.setProperty('--coin-img', `url("${ASSETS.icon_coin}")`);
    this.el.append(this.nightEl, this.flashEl, this.stampEl, this.bannerEl, this.shoutEl, this.comboEl);
    this.rockets = new Ring(this.el, 8, () => h('i', 'kh-rocket', '<b></b>'));
    this.fwp = new Ring(this.el, 180, () => h('i', 'kh-fwp'));
    this.glitter = new Ring(this.el, 60, () => h('i', 'kh-glit'));
    this.fwFlash = new Ring(this.el, 8, () => h('i', 'kh-fwflash'));
    this.stars = new Ring(this.el, 16, () => h('i', 'kh-shoot', '<b></b><s></s>'));
    this.beams = new Ring(this.el, 4, () => h('i', 'kh-beam4'));
    parent.append(this.el);
  }

  private get W(): number {
    return this.el.clientWidth || innerWidth;
  }
  private get H(): number {
    return this.el.clientHeight || innerHeight;
  }
  private get u(): number {
    return parseFloat(getComputedStyle(this.el).fontSize) || 15;
  }

  private node(list: HTMLElement[], max: number, make: () => HTMLElement): HTMLElement | null {
    const free = list.find(n => n.dataset.busy !== '1');
    if (free) return free;
    if (list.length >= max) return null;
    const n = make();
    list.push(n);
    this.el.append(n);
    return n;
  }

  private release(n: HTMLElement): void {
    n.dataset.busy = '0';
    n.style.display = 'none';
  }

  /** Tam ekran kısa, yumuşak renkli ışık patlaması (yalnız opaklık; beyaz patlama yok). */
  flash(peak = 0.8, ms = 340): void {
    play(this.flashEl, [{opacity: 0}, {opacity: peak, offset: 0.12}, {opacity: 0}], {duration: ms, easing: 'ease-out'}, 1);
  }

  /** Jeton + dört renk konfeti patlaması (konfetinin bir kısmı küçük takım şekli). */
  burst(at: Pt, o: {coins?: number; confetti?: number; power?: number; up?: number} = {}): void {
    const power = o.power ?? 1;
    const nc = o.coins ?? 12, nf = o.confetti ?? 26;
    const ns = Math.round(nf * 0.22);
    const u = this.u;
    const spawn = (kind: 'coin' | 'conf', i: number) => {
      const n = kind === 'coin'
        ? this.node(this.coins, N_COIN, () => h('i', 'kh-p kh-p--coin'))
        : i < ns
          ? this.node(this.suits, N_SUIT, () => h('i', 'kh-p kh-p--conf kh-p--suit', suitSvg(SUITS[this.suits.length % 4])))
          : this.node(this.confs, N_CONF, () => h('i', `kh-p kh-p--conf kh-p--c${1 + (this.confs.length % 4)}`));
      if (!n) return;
      n.dataset.busy = '1';
      n.style.display = 'block';
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * (kind === 'coin' ? 1.25 : 1.7);
      const sp = (kind === 'coin' ? 13 : 16) * u * power * (0.55 + Math.random() * 0.6);
      const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp * (o.up ?? 1);
      const g = 26 * u;
      const dur = (kind === 'coin' ? 1250 : 1650) + Math.random() * 450;
      const rot0 = Math.random() * 360, spin = (Math.random() - 0.5) * (kind === 'coin' ? 900 : 1300);
      const T = dur / 1000;
      const kf: Keyframe[] = [];
      for (const k of [0, 0.12, 0.28, 0.48, 0.7, 1]) {
        const t = k * T;
        const drag = kind === 'conf' ? 1 - 0.45 * k : 1;
        const x = at.x + vx * t * drag;
        const y = at.y + vy * t + 0.5 * g * t * t * (kind === 'conf' ? 0.55 : 1);
        const r = rot0 + spin * k;
        const tr = kind === 'coin'
          ? `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotateY(${(r * 2).toFixed(0)}deg) scale(${(0.7 + 0.5 * Math.min(1, k * 5)).toFixed(2)})`
          : `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${r.toFixed(0)}deg) rotateX(${(r * 1.7).toFixed(0)}deg)`;
        kf.push({transform: tr, opacity: k < 0.72 ? 1 : k === 1 ? 0 : 0.85, offset: k});
      }
      const a = play(n, kf, {duration: dur, delay: i * 6, easing: 'linear', fill: 'both'}, 0.32);
      if (ANIM) a.onfinish = () => this.release(n);
    };
    for (let i = 0; i < nc; i++) spawn('coin', i);
    for (let i = 0; i < nf; i++) spawn('conf', i);
  }

  /** Jetonlar bir noktadan diğerine uçar; her varışta onArrive çağrılır. */
  flyCoins(from: Pt, to: Pt, n: number, onArrive?: (i: number) => void): Promise<void> {
    if (!ANIM) {
      for (let i = 0; i < n; i++) onArrive?.(i);
      return Promise.resolve();
    }
    return new Promise(res => {
      let left = n;
      for (let i = 0; i < n; i++) {
        const c = this.node(this.coins, N_COIN, () => h('i', 'kh-p kh-p--coin'));
        if (!c) {
          onArrive?.(i);
          if (--left === 0) res();
          continue;
        }
        c.dataset.busy = '1';
        c.style.display = 'block';
        const sx = from.x + (Math.random() - 0.5) * 40, sy = from.y + (Math.random() - 0.5) * 24;
        const mx = (sx + to.x) / 2 + (Math.random() - 0.5) * 90, my = Math.min(sy, to.y) - 40 - Math.random() * 60;
        const p = (x: number, y: number, s: number) => `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s})`;
        const a = c.animate(
          [
            {transform: p(sx, sy, 0.3), opacity: 0},
            {transform: p(sx, sy - 16, 1.15), opacity: 1, offset: 0.16},
            {transform: p(mx, my, 1), opacity: 1, offset: 0.55},
            {transform: p(to.x, to.y, 0.7), opacity: 1, offset: 0.94},
            {transform: p(to.x, to.y, 0.5), opacity: 0},
          ],
          {duration: 760, delay: i * 70, easing: EASE.inOut, fill: 'both'},
        );
        a.onfinish = () => {
          this.release(c);
          onArrive?.(i);
          if (--left === 0) res();
        };
      }
      if (n === 0) res();
    });
  }

  /**
   * PİŞTİ! damgası: 1.4 → 1 ölçek + hafif dönme, bekle, yukarı süzülerek kaybol. Arkada dönen dört renk hüzme;
   * vale piştide ek olarak dışa doğru açılan dört renk çark halkası. y: damganın dikey merkezi (px).
   */
  stamp(jack: boolean, points: number, y?: number, ms?: number, bare = false): void {
    clearTimeout(this.stampTimer);
    const img = jack ? OPTIONAL_ART.vale_pisti_text : OPTIONAL_ART.pisti_text;
    const word = jack ? 'VALE PİŞTİ!' : 'PİŞTİ!';
    this.stampEl.className = 'kh-stamp is-on' + (jack ? ' is-jack' : '') + (bare ? ' is-bare' : '');
    this.stampEl.style.top = (y ?? this.H * 0.47) + 'px';
    this.stampEl.innerHTML = `<div class="kh-stamp__in"><div class="kh-stamp__glow"></div><div class="kh-stamp__rays"></div>${jack ? '<div class="kh-stamp__wheel"></div>' : ''}
      <div class="kh-stamp__word">${img ? `<img class="kh-g3img" src="${img}" alt="${word}">` : jack ? g3('VALE', 'is-sm is-white') + g3('PİŞTİ!') : g3(word)}</div>
      <div class="kh-stamp__pts">${g3('+' + points, 'is-white')}</div></div>`;
    const inn = this.stampEl.firstElementChild as HTMLElement;
    const glow = inn.querySelector('.kh-stamp__glow') as HTMLElement;
    const rays = inn.querySelector('.kh-stamp__rays') as HTMLElement;
    const pts = inn.querySelector('.kh-stamp__pts') as HTMLElement;
    const wheel = inn.querySelector<HTMLElement>('.kh-stamp__wheel');
    const D = ms ?? (jack ? 2100 : 1600);
    play(inn, [
      {transform: 'scale(2.1) rotate(-14deg)', opacity: 0},
      {transform: 'scale(.92) rotate(-3deg)', opacity: 1, offset: 0.08},
      {transform: 'scale(1.04) rotate(-2deg)', opacity: 1, offset: 0.13},
      {transform: 'scale(1) rotate(-2deg)', opacity: 1, offset: 0.72},
      {transform: 'translateY(-34px) scale(1.06) rotate(-2deg)', opacity: 0},
    ], {duration: D, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'}, 0.45);
    play(rays, [{transform: 'rotate(0deg) scale(.5)', opacity: 0}, {transform: 'rotate(18deg) scale(1)', opacity: 1, offset: 0.18}, {transform: 'rotate(42deg) scale(1.04)', opacity: 0.9, offset: 0.7}, {transform: 'rotate(56deg) scale(1.1)', opacity: 0}],
      {duration: D, easing: 'ease-out', fill: 'both'}, 0.45);
    if (wheel)
      play(wheel, [{transform: 'rotate(-30deg) scale(.2)', opacity: 0}, {transform: 'rotate(40deg) scale(.95)', opacity: 1, offset: 0.2}, {transform: 'rotate(110deg) scale(1.08)', opacity: 1, offset: 0.55}, {transform: 'rotate(170deg) scale(1.5)', opacity: 0}],
        {duration: D * 0.85, easing: 'ease-out', fill: 'both'}, 0.4);
    play(glow, [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.1)', opacity: 1, offset: 0.14}, {transform: 'scale(1)', opacity: 0.8, offset: 0.6}, {transform: 'scale(1.2)', opacity: 0}],
      {duration: D, easing: 'ease-out', fill: 'both'}, 0.45);
    play(pts, [{transform: 'scale(0) rotate(8deg)'}, {transform: 'scale(0) rotate(8deg)', offset: 0.12}, {transform: 'scale(1.25) rotate(0deg)', offset: 0.22}, {transform: 'scale(1) rotate(0deg)', offset: 0.28}, {transform: 'scale(1)'}],
      {duration: D, easing: 'ease-out', fill: 'both'}, 0.45);
    if (ANIM) this.stampTimer = window.setTimeout(() => (this.stampEl.className = 'kh-stamp'), D + 30);
  }

  /** Küçük afiş ("Son el!", "Kartlar dağıtılıyor"). */
  banner(text: string, sub?: string, ms = 1500): void {
    clearTimeout(this.bannerTimer);
    this.bannerEl.className = 'kh-banner is-on';
    this.bannerEl.innerHTML = `<div class="kh-banner__in"><div class="kh-banner__t">${g3(text, 'is-white')}</div>${sub ? `<div class="kh-banner__s">${esc(sub)}</div>` : ''}</div>`;
    const inn = this.bannerEl.firstElementChild as HTMLElement;
    const D = ms + 500;
    const hold = ms / D;
    play(inn, [
      {transform: 'translateY(14px) scale(.9)', opacity: 0},
      {transform: 'translateY(0) scale(1.03)', opacity: 1, offset: 0.12},
      {transform: 'scale(1)', opacity: 1, offset: 0.18},
      {transform: 'scale(1)', opacity: 1, offset: hold},
      {transform: 'translateY(-10px) scale(.98)', opacity: 0},
    ], {duration: D, easing: 'ease-out', fill: 'both'}, 0.5);
    if (ANIM) this.bannerTimer = window.setTimeout(() => (this.bannerEl.className = 'kh-banner'), D + 30);
  }

  /** Yükselen puan baloncuğu (tone: gold sarı-turuncu, white beyaz, blue mavi). */
  pop(x: number, y: number, text: string, tone: Tone = 'gold', big = false): void {
    let n = this.pops[this.popIdx % N_POP];
    if (!n) {
      n = h('b', 'kh-pop');
      this.pops.push(n);
      this.el.append(n);
    }
    this.popIdx++;
    n.className = 'kh-pop' + (big ? ' is-big' : '');
    n.innerHTML = g3(text, tone === 'gold' ? '' : tone === 'white' ? 'is-white' : 'is-blue');
    n.style.display = 'block';
    const p = (dy: number, s: number) => `translate3d(${x.toFixed(1)}px,${(y + dy).toFixed(1)}px,0) translate(-50%,-50%) scale(${s})`;
    const a = play(n, [
      {transform: p(6, 0.4), opacity: 0},
      {transform: p(-8, 1.25), opacity: 1, offset: 0.16},
      {transform: p(-16, 1), opacity: 1, offset: 0.3},
      {transform: p(-40, 1), opacity: 1, offset: 0.75},
      {transform: p(-58, 0.96), opacity: 0},
    ], {duration: 1100, easing: 'ease-out', fill: 'both'}, 0.4);
    const node = n;
    if (ANIM) a.onfinish = () => (node.style.display = 'none');
  }

  /** Büyük vurgu yazısı (SÜPÜRDÜ!, SON KARTLAR): çarparak gelir, yükselip söner. Ekran kenarına taşmaz. */
  shout(text: string, x: number, y: number, tone: Tone = 'gold'): void {
    const n = this.shoutEl;
    n.innerHTML = `<div class="kh-shout__in"><i class="kh-shout__glow"></i>${g3(text, tone === 'gold' ? '' : tone === 'white' ? 'is-white' : 'is-blue')}</div>`;
    n.style.display = 'block';
    const inn = n.firstElementChild as HTMLElement;
    const w = inn.offsetWidth || this.u * 12;
    const cx = Math.max(w / 2 + 8, Math.min(this.W - w / 2 - 8, x));
    n.style.transform = `translate3d(${cx.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    const a = play(inn, [
      {transform: 'translate(-50%,-50%) scale(2.2) rotate(-12deg)', opacity: 0},
      {transform: 'translate(-50%,-50%) scale(.94) rotate(-5deg)', opacity: 1, offset: 0.12},
      {transform: 'translate(-50%,-50%) scale(1.04) rotate(-4deg)', opacity: 1, offset: 0.2},
      {transform: 'translate(-50%,-50%) scale(1) rotate(-4deg)', opacity: 1, offset: 0.74},
      {transform: 'translate(-50%,-80%) scale(1.04) rotate(-4deg)', opacity: 0},
    ], {duration: 1250, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'}, 0.4);
    if (ANIM) a.onfinish = () => (n.style.display = 'none');
  }

  /** Seri rozeti: "SERİ x2" — alevli hap, sayı nabız gibi atar; seri büyüdükçe daha iri. */
  combo(n: number, x: number, y: number, me: boolean): void {
    const el = this.comboEl;
    const lvl = Math.min(4, n);
    el.className = `kh-combo is-l${lvl}${me ? ' is-me' : ''}`;
    el.innerHTML = `<div class="kh-combo__in"><i class="kh-combo__fire"></i><span class="kh-combo__t">SERİ</span><b class="kh-combo__n">${g3('x' + n)}</b></div>`;
    el.style.display = 'block';
    const inn = el.firstElementChild as HTMLElement;
    const w = inn.offsetWidth || this.u * 8;
    const cx = Math.max(w / 2 + 8, Math.min(this.W - w / 2 - 8, x));
    el.style.transform = `translate3d(${cx.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    const a = play(inn, [
      {transform: 'translate(-50%,-50%) scale(.2) rotate(-20deg)', opacity: 0},
      {transform: 'translate(-50%,-50%) scale(1.18) rotate(4deg)', opacity: 1, offset: 0.14},
      {transform: 'translate(-50%,-50%) scale(1) rotate(-3deg)', opacity: 1, offset: 0.24},
      {transform: 'translate(-50%,-50%) scale(1) rotate(-3deg)', opacity: 1, offset: 0.78},
      {transform: 'translate(-50%,-110%) scale(.9) rotate(-3deg)', opacity: 0},
    ], {duration: 1300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'}, 0.4);
    play(inn.querySelector('.kh-combo__n')!, [{transform: 'scale(1)'}, {transform: 'scale(1.5) rotate(8deg)', offset: 0.5}, {transform: 'scale(1)'}],
      {duration: 360, delay: 160, easing: EASE.out}, 1);
    if (ANIM) a.onfinish = () => (el.style.display = 'none');
  }

  /** Jeton ikonu (uçuş hedefleri için kaynak). */
  get coinUrl(): string {
    return ASSETS.icon_coin;
  }

  // ─────────────── kuşanılabilir pişti efektleri ───────────────

  /** Kuşanılmış efekt: klasik · havai · yildiz · altin. Vale piştide daha uzun ve yoğun. */
  pistiFx(id: string, jack: boolean, at: Pt, low = false): void {
    if (!ANIM) return;
    const k = low ? 0.55 : 1;
    switch (id) {
      case 'havai':
        this.fireworks(Math.round((jack ? 7 : 4) * (low ? 0.6 : 1)), jack, low);
        this.flash(jack ? 0.7 : 0.5);
        break;
      case 'yildiz':
        this.starRain(Math.round((jack ? 16 : 10) * k), jack, at);
        break;
      case 'altin':
        this.coinRain(Math.round((jack ? 40 : 26) * k), jack, at);
        this.flash(jack ? 0.75 : 0.55);
        break;
      default:
        this.flash(jack ? 0.75 : 0.6);
        this.burst(at, {coins: Math.round((jack ? 14 : 10) * k), confetti: Math.round((jack ? 40 : 30) * k), power: jack ? 1.15 : 1});
        if (jack) window.setTimeout(() => this.burst({x: at.x, y: at.y - this.H * 0.05}, {coins: Math.round(8 * k), confetti: Math.round(26 * k), power: 1.3, up: 1.2}), 380);
    }
    if (jack) this.fourBeams();
  }

  /** Vale: ekranı tarayan dört renk ışık hüzmesi. */
  fourBeams(): void {
    const W = this.W, H = this.H;
    const L = Math.hypot(W, H);
    for (let i = 0; i < 4; i++) {
      const b = this.beams.get();
      b.style.background = `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${SUIT_HEX[i]}cc 30%, #ffffffdd 50%, ${SUIT_HEX[i]}cc 70%, rgba(255,255,255,0) 100%)`;
      Object.assign(b.style, {width: L * 1.2 + 'px', left: W / 2 - L * 0.6 + 'px', top: H * 0.45 + 'px'});
      const a0 = i * 45 - 70;
      const a = b.animate([
        {transform: `rotate(${a0}deg) scaleY(.2)`, opacity: 0},
        {transform: `rotate(${a0 + 30}deg) scaleY(1)`, opacity: 0.85, offset: 0.25},
        {transform: `rotate(${a0 + 95}deg) scaleY(.6)`, opacity: 0},
      ], {duration: 1400, delay: i * 90, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both'});
      a.finished.then(() => hide(b), () => undefined);
    }
  }

  /** Havai fişek: aşağıdan yükselen fişekler takım renklerinde açılır, sarkarak söner, çatırdar. */
  fireworks(count: number, jack: boolean, low: boolean): void {
    const W = this.W, H = this.H;
    const per = low ? 16 : jack ? 30 : 26;
    for (let r = 0; r < count; r++) {
      const delay = r * (jack ? 210 : 260) + rnd(0, 90);
      const x0 = W * rnd(0.18, 0.82), y0 = H + 20;
      const x1 = x0 + rnd(-W * 0.12, W * 0.12), y1 = H * rnd(0.12, 0.42);
      const col = SUIT_HEX[(r + Math.floor(Math.random() * 4)) % 4];
      const rise = rnd(520, 680);
      const rk = this.rockets.get();
      rk.style.color = col;
      const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI + 90;
      rk.animate([
        {transform: `translate3d(${x0}px,${y0}px,0) rotate(${ang}deg) scaleY(.6)`, opacity: 1},
        {transform: `translate3d(${(x0 + x1) / 2}px,${(y0 + y1) / 2 + (y0 - y1) * 0.12}px,0) rotate(${ang}deg) scaleY(1.2)`, opacity: 1, offset: 0.5},
        {transform: `translate3d(${x1}px,${y1}px,0) rotate(${ang}deg) scaleY(.3)`, opacity: 0.6},
      ], {duration: rise, delay, easing: 'cubic-bezier(.2,.6,.35,1)', fill: 'both'}).finished.then(() => hide(rk), () => undefined);
      window.setTimeout(() => this.snd?.fireworkLaunch(), delay);
      window.setTimeout(() => {
        this.snd?.fireworkBurst(jack ? 1 : 0.8);
        this.fwBurst(x1, y1, col, per, jack);
      }, delay + rise - 20);
    }
  }

  private fwBurst(x: number, y: number, col: string, n: number, jack: boolean): void {
    const u = this.u;
    const R = u * rnd(jack ? 9.5 : 8, jack ? 12 : 10);
    const fl = this.fwFlash.get();
    fl.style.color = col;
    fl.animate([{transform: `translate3d(${x}px,${y}px,0) scale(.2)`, opacity: 1}, {transform: `translate3d(${x}px,${y}px,0) scale(1)`, opacity: 0.9, offset: 0.2}, {transform: `translate3d(${x}px,${y}px,0) scale(1.4)`, opacity: 0}],
      {duration: 520, easing: 'ease-out', fill: 'both'}).finished.then(() => hide(fl), () => undefined);
    const two = Math.random() < 0.5;
    for (let i = 0; i < n; i++) {
      const p = this.fwp.get();
      const a = (i / n) * Math.PI * 2 + rnd(-0.08, 0.08);
      const d = R * rnd(0.82, 1.05);
      p.style.color = two && i % 2 ? '#fff6c8' : col;
      const deg = (a * 180) / Math.PI;
      const g = u * 3.2;
      const kf: Keyframe[] = [];
      const dur = rnd(1050, 1350);
      for (const k of [0, 0.14, 0.36, 0.62, 1]) {
        const e = 1 - Math.pow(1 - Math.min(1, k * 1.25), 3);
        const px = x + Math.cos(a) * d * e;
        const py = y + Math.sin(a) * d * e + g * k * k * 3.2;
        const sx = k === 0 ? 0.3 : k < 0.2 ? 2.2 : k < 0.5 ? 1.4 : k < 0.8 ? 0.8 : 0.3;
        kf.push({transform: `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) rotate(${deg.toFixed(0)}deg) scaleX(${sx})`, opacity: k < 0.6 ? 1 : k === 1 ? 0 : 0.7, offset: k});
      }
      p.animate(kf, {duration: dur, easing: 'linear', fill: 'both'}).finished.then(() => hide(p), () => undefined);
    }
    // çatırtı: patlama alanında yanıp sönen küçük ışıklar
    const ng = jack ? 12 : 8;
    for (let i = 0; i < ng; i++) {
      const gl = this.glitter.get();
      const a = Math.random() * Math.PI * 2, d = R * rnd(0.4, 1.1);
      const gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d + u * 2;
      gl.animate([{transform: `translate3d(${gx}px,${gy}px,0) scale(0)`, opacity: 0}, {transform: `translate3d(${gx}px,${gy}px,0) scale(1.3)`, opacity: 1, offset: 0.3}, {transform: `translate3d(${gx}px,${gy + u}px,0) scale(.2)`, opacity: 0}],
        {duration: rnd(260, 420), delay: 420 + rnd(0, 520), easing: 'ease-out', fill: 'both'}).finished.then(() => hide(gl), () => undefined);
    }
  }

  /** Yıldız yağmuru: ışık gece mavisine kısılır, sağ üstten uzun izli kayan yıldızlar geçer, ortada yıldız parlar. */
  starRain(count: number, jack: boolean, at: Pt): void {
    const W = this.W, H = this.H, u = this.u;
    const D = jack ? 2300 : 1700;
    play(this.nightEl, [{opacity: 0}, {opacity: 1, offset: 0.12}, {opacity: 1, offset: 0.75}, {opacity: 0}], {duration: D, easing: 'ease-in-out'}, 0.3);
    const ang = 122; // sağ üstten sol alta, dik iniş
    const rad = (ang * Math.PI) / 180;
    const L = H * 1.35;
    for (let i = 0; i < count; i++) {
      const s = this.stars.get();
      const delay = (i * (D * 0.5)) / count + rnd(0, 70);
      const x0 = W * rnd(0.25, 1.35), y0 = -H * rnd(0.02, 0.3);
      const x1 = x0 + Math.cos(rad) * L, y1 = y0 + Math.sin(rad) * L;
      const big = i % 3 === 0;
      s.classList.toggle('is-big', big);
      s.style.color = ['#ffffff', '#ffe27a', '#9fd0ff', '#ffd23f'][i % 4];
      const dur = rnd(720, 950);
      s.animate([
        {transform: `translate3d(${x0}px,${y0}px,0) rotate(${ang}deg) scaleX(.4)`, opacity: 0},
        {transform: `translate3d(${x0 + (x1 - x0) * 0.15}px,${y0 + (y1 - y0) * 0.15}px,0) rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: 0.12},
        {transform: `translate3d(${x0 + (x1 - x0) * 0.8}px,${y0 + (y1 - y0) * 0.8}px,0) rotate(${ang}deg) scaleX(1.1)`, opacity: 1, offset: 0.8},
        {transform: `translate3d(${x1}px,${y1}px,0) rotate(${ang}deg) scaleX(.6)`, opacity: 0},
      ], {duration: dur, delay, easing: 'linear', fill: 'both'}).finished.then(() => hide(s), () => undefined);
      window.setTimeout(() => {
        this.snd?.starChime(i);
        if (i % 3 === 0) this.snd?.shootingStar();
      }, delay + 60);
      // geçtiği yerde göz kırpan yıldızcıklar
      for (let j = 0; j < 3; j++) {
        const t = 0.25 + j * 0.2;
        const gx = x0 + (x1 - x0) * t, gy = y0 + (y1 - y0) * t;
        if (gx < -20 || gx > W + 20 || gy < -20 || gy > H + 20) continue;
        const gl = this.glitter.get();
        gl.animate([{transform: `translate3d(${gx}px,${gy}px,0) scale(0) rotate(0deg)`, opacity: 0}, {transform: `translate3d(${gx}px,${gy}px,0) scale(1.5) rotate(45deg)`, opacity: 1, offset: 0.25}, {transform: `translate3d(${gx}px,${gy + u * 1.5}px,0) scale(0) rotate(90deg)`, opacity: 0}],
          {duration: 700, delay: delay + dur * t, easing: 'ease-out', fill: 'both'}).finished.then(() => hide(gl), () => undefined);
      }
    }
    // ortadaki parlama: dört kollu büyük yıldız
    const fl = this.fwFlash.get();
    fl.style.color = '#fff6c8';
    fl.classList.add('is-star');
    fl.animate([{transform: `translate3d(${at.x}px,${at.y}px,0) scale(.1) rotate(0deg)`, opacity: 0}, {transform: `translate3d(${at.x}px,${at.y}px,0) scale(${jack ? 2.6 : 2}) rotate(45deg)`, opacity: 1, offset: 0.3}, {transform: `translate3d(${at.x}px,${at.y}px,0) scale(.4) rotate(120deg)`, opacity: 0}],
      {duration: 900, delay: 120, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'}).finished.then(() => {
      fl.classList.remove('is-star');
      hide(fl);
    }, () => undefined);
  }

  /** Altın yağmuru: sikkeler yukarıdan yağar, masaya (yığın çevresine) düşüp seker, dönerek parlar ve kaybolur. */
  coinRain(count: number, jack: boolean, at: Pt): void {
    const W = this.W, H = this.H, u = this.u;
    const span = jack ? 1100 : 750;
    this.snd?.coinRain(Math.min(24, Math.round(count * 0.6)), span / 1000 + 0.5);
    for (let i = 0; i < count; i++) {
      const c = this.node(this.coins, N_COIN, () => h('i', 'kh-p kh-p--coin'));
      if (!c) break;
      c.dataset.busy = '1';
      c.style.display = 'block';
      // masadaki iniş noktası: yığının çevresinde elips
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
      const lx = at.x + Math.cos(a) * rr * W * 0.4, ly = at.y + Math.sin(a) * rr * H * 0.16 + u;
      const x0 = lx + rnd(-W * 0.12, W * 0.12), y0 = -u * rnd(2, 8);
      const fall = rnd(560, 760);
      const dur = fall + 760;
      const f = fall / dur;
      const bounce = u * rnd(1.2, 2.8);
      const sp = rnd(2, 5) * 360 * (Math.random() < 0.5 ? -1 : 1);
      const s0 = rnd(0.9, 1.25);
      const P = (x: number, y: number, ry: number, s: number) => `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotateY(${ry.toFixed(0)}deg) scale(${s.toFixed(2)})`;
      const kf: Keyframe[] = [
        {transform: P(x0, y0, 0, s0), opacity: 1, offset: 0},
        {transform: P(x0 + (lx - x0) * 0.5, y0 + (ly - y0) * 0.3, sp * 0.4, s0), opacity: 1, offset: f * 0.55},
        {transform: P(lx, ly, sp, s0), opacity: 1, offset: f},
        {transform: P(lx + rnd(-6, 6), ly - bounce, sp + 180, s0), opacity: 1, offset: f + (1 - f) * 0.16},
        {transform: P(lx, ly, sp + 360, s0 * 0.95), opacity: 1, offset: f + (1 - f) * 0.3},
        {transform: P(lx, ly - bounce * 0.25, sp + 360, s0 * 0.95), opacity: 1, offset: f + (1 - f) * 0.38},
        {transform: P(lx, ly, sp + 360, s0 * 0.92), opacity: 1, offset: f + (1 - f) * 0.46},
        {transform: P(lx, ly + u * 0.3, sp + 360, s0 * 0.4), opacity: 0, offset: 1},
      ];
      const delay = (i / count) * span + rnd(0, 60);
      const an = c.animate(kf, {duration: dur, delay, easing: 'linear', fill: 'both'});
      an.onfinish = () => this.release(c);
      // bazı sikkelerde inişte parıltı
      if (i % 3 === 0) {
        const gl = this.glitter.get();
        gl.animate([{transform: `translate3d(${lx}px,${ly - u * 0.4}px,0) scale(0) rotate(0deg)`, opacity: 0}, {transform: `translate3d(${lx}px,${ly - u * 0.4}px,0) scale(1.6) rotate(45deg)`, opacity: 1, offset: 0.3}, {transform: `translate3d(${lx}px,${ly - u * 0.4}px,0) scale(0) rotate(90deg)`, opacity: 0}],
          {duration: 520, delay: delay + fall + 260, easing: 'ease-out', fill: 'both'}).finished.then(() => hide(gl), () => undefined);
      }
    }
  }
}
