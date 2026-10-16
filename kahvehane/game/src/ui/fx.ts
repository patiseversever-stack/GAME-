// Ekran efektleri: yumuşak renkli ışık patlaması, jeton + dört renk konfeti (havuzlu DOM), uçan jetonlar,
// PİŞTİ damgası (dört renk hüzme, valede dört renk çark), afiş, puan baloncuğu, seri rozeti, vurgu yazısı ve
// kuşanılabilir pişti efektleri: klasik (dört renk patlama) · havai (fişek) · yildiz (kayan yıldız yağmuru) · altin (sikke yağmuru)
// · nazar (nazar boncukları) · lale (lale açar, yaprak yağar) · simsek (yıldırım düşer) · davul (davul zurna) · girdap (dört renk girdap).
// Yalnız transform + opacity; düğümler havuzdan gelir, iş bitince gizlenir (yeni düğüm üretilmez).
import {cancelAnims} from '../platform/anim';
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
/** Konum dönüşümü (px) */
const T = (x: number, y: number): string => `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;

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
    cancelAnims(n);
    n.style.display = 'block';
    return n;
  }
}

/** Parçacığı gizle ve bitmiş animasyonunu bırak (fill: both etkisi listede birikmesin). */
const hide = (n: HTMLElement) => {
  n.style.display = 'none';
  cancelAnims(n);
};

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
    cancelAnims(n);
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
    if (ANIM) a.onfinish = () => hide(node);
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
    if (ANIM) a.onfinish = () => hide(n);
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
    if (ANIM) a.onfinish = () => hide(el);
  }

  /** Jeton ikonu (uçuş hedefleri için kaynak). */
  get coinUrl(): string {
    return ASSETS.icon_coin;
  }

  // ─────────────── kuşanılabilir pişti efektleri ───────────────

  /** Kuşanılmış efekt: klasik · havai · yildiz · altin · nazar · lale · simsek · davul · girdap. Vale piştide daha yoğun. */
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
      case 'nazar':
        this.nazarFx(jack, at, low);
        break;
      case 'lale':
        this.laleFx(jack, at, low);
        break;
      case 'simsek':
        this.simsekFx(jack, at, low);
        break;
      case 'davul':
        this.davulFx(jack, at, low);
        break;
      case 'girdap':
        this.girdapFx(jack, at, low);
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
      // maskesiz: elips degrade iki yönde de söner (dönen katmanda maske her kare yeniden işlenirdi)
      b.style.background = `radial-gradient(50% 50% at 50% 50%, #ffffffee 0%, ${SUIT_HEX[i]}dd 28%, ${SUIT_HEX[i]}66 62%, rgba(255,255,255,0) 100%)`;
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

  // ─────────────── koleksiyon efektleri: her biri kendi küçük havuzunda (ilk kullanımda kurulur) ───────────────
  private fb = new Map<string, Ring>();
  private fbPool(key: string, max: number, cls: string): Ring {
    let r = this.fb.get(key);
    if (!r) {
      r = new Ring(this.el, max, () => h('i', `kh-fb kh-fb--${cls}`));
      this.fb.set(key, r);
    }
    return r;
  }
  /** Havuz düğümünü canlandır; bitince gizle (bölüm başına yumuşatma: play). */
  private fly(n: HTMLElement, kf: Keyframe[], o: KeyframeAnimationOptions): void {
    play(n, kf, {fill: 'both', ...o}).finished.then(() => hide(n), () => undefined);
  }
  private sparkleAt(x: number, y: number, delay: number, s = 1.4): void {
    const gl = this.glitter.get();
    this.fly(gl, [{transform: `${T(x, y)} scale(0) rotate(0deg)`, opacity: 0}, {transform: `${T(x, y)} scale(${s}) rotate(45deg)`, opacity: 1, offset: 0.3}, {transform: `${T(x, y)} scale(0) rotate(90deg)`, opacity: 0}],
      {duration: 520, delay, easing: 'ease-out'});
  }

  /** Nazar Boncuğu: mavi parlama, dev nazar gözü belirir, cam dalgalar yayılır, halka hâlinde boncuklar saçılır. */
  nazarFx(jack: boolean, at: Pt, low: boolean): void {
    const u = this.u, M = Math.min(this.W, this.H);
    const fl = this.fbPool('nzF', 1, 'bflash').get();
    this.fly(fl, [{transform: `${T(at.x, at.y)} scale(.3)`, opacity: 0}, {transform: `${T(at.x, at.y)} scale(1)`, opacity: 1, offset: 0.15}, {transform: `${T(at.x, at.y)} scale(1.25)`, opacity: 0}],
      {duration: 900, easing: 'ease-out'});
    const eye = this.fbPool('nzE', 1, 'eye').get();
    this.fly(eye, [
      {transform: `${T(at.x, at.y)} scale(.1) rotate(-90deg)`, opacity: 0},
      {transform: `${T(at.x, at.y)} scale(1.18) rotate(8deg)`, opacity: 1, offset: 0.14},
      {transform: `${T(at.x, at.y)} scale(.96) rotate(-3deg)`, opacity: 1, offset: 0.24},
      {transform: `${T(at.x, at.y)} scale(1) rotate(0deg)`, opacity: 1, offset: 0.66},
      {transform: `${T(at.x, at.y - u * 1.2)} scale(1.5) rotate(0deg)`, opacity: 0},
    ], {duration: jack ? 1550 : 1350, easing: 'cubic-bezier(.2,.7,.3,1)'});
    const waves = this.fbPool('nzW', 3, 'wave');
    for (let i = 0; i < 2; i++)
      this.fly(waves.get(), [{transform: `${T(at.x, at.y)} scale(.25)`, opacity: 0.95}, {transform: `${T(at.x, at.y)} scale(3.6)`, opacity: 0}], {duration: 850, delay: 80 + i * 210, easing: 'cubic-bezier(.1,.6,.3,1)'});
    const beads = this.fbPool('nzB', 24, 'bead');
    const n = Math.round((jack ? 24 : 16) * (low ? 0.5 : 1));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.15, 0.15), R = M * rnd(0.36, 0.6), cx = Math.cos(a), cy = Math.sin(a);
      const spin = rnd(-540, 540), s0 = rnd(0.8, 1.3);
      this.fly(beads.get(), [
        {transform: `${T(at.x, at.y)} scale(.2) rotate(0deg)`, opacity: 0},
        {transform: `${T(at.x + cx * R * 0.16, at.y + cy * R * 0.16)} scale(${s0}) rotate(${spin * 0.1}deg)`, opacity: 1, offset: 0.08},
        {transform: `${T(at.x + cx * R * 0.82, at.y + cy * R * 0.82 + u * 0.6)} scale(${s0}) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.55},
        {transform: `${T(at.x + cx * R, at.y + cy * R + u * 2.6)} scale(${s0 * 0.8}) rotate(${spin}deg)`, opacity: 0},
      ], {duration: rnd(1100, 1400), delay: 90 + i * 10, easing: 'cubic-bezier(.15,.7,.35,1)'});
    }
    for (let i = 0; i < (low ? 4 : 8); i++) {
      const a = Math.random() * Math.PI * 2, d = M * rnd(0.12, 0.34);
      this.sparkleAt(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 300 + i * 70);
    }
    this.snd?.swoosh();
    for (let i = 0; i < 3; i++) window.setTimeout(() => this.snd?.starChime(i * 2), 120 + i * 170);
  }

  /** Lale Yağmuru: ortada dev lale açar (yay ile), yapraklar fışkırır, ekrana lale yaprakları süzülerek yağar. */
  laleFx(jack: boolean, at: Pt, low: boolean): void {
    const u = this.u, W = this.W, H = this.H;
    const k = low ? 0.5 : 1;
    const gl = this.fbPool('lG', 1, 'lglow').get();
    this.fly(gl, [{transform: `${T(at.x, at.y)} scale(.3)`, opacity: 0}, {transform: `${T(at.x, at.y)} scale(1.1)`, opacity: 0.95, offset: 0.25}, {transform: `${T(at.x, at.y)} scale(1.25)`, opacity: 0}],
      {duration: 1400, easing: 'ease-out'});
    const tu = this.fbPool('lT', 1, 'tulip').get();
    const tx = at.x, ty = at.y + u * 1.2;
    this.fly(tu, [
      {transform: `${T(tx, ty)} scale(.3, 0)`, opacity: 0},
      {transform: `${T(tx, ty)} scale(1.12, 1.22)`, opacity: 1, offset: 0.16},
      {transform: `${T(tx, ty)} scale(.95, .9)`, opacity: 1, offset: 0.26},
      {transform: `${T(tx, ty)} scale(1, 1)`, opacity: 1, offset: 0.36},
      {transform: `${T(tx, ty)} scale(1.03, 1.03)`, opacity: 1, offset: 0.72},
      {transform: `${T(tx, ty - u * 2)} scale(1.1, 1.1)`, opacity: 0},
    ], {duration: jack ? 1600 : 1450, easing: 'cubic-bezier(.2,.7,.3,1)'});
    const pets = this.fbPool('lP', 40, 'pet');
    const VAR = ['', 'is-b', 'is-c', 'is-d', '', 'is-b', 'is-g'];
    // lalenin ağzından fışkıran yapraklar
    const nb = Math.round(8 * k);
    for (let i = 0; i < nb; i++) {
      const p = pets.get();
      p.className = `kh-fb kh-fb--pet ${VAR[i % 4]}`;
      const a = -Math.PI / 2 + (i / Math.max(1, nb - 1) - 0.5) * 2.4, d = u * rnd(5, 8.5);
      const x0 = at.x, y0 = at.y - u * 3.2, x1 = x0 + Math.cos(a) * d, y1 = y0 + Math.sin(a) * d;
      this.fly(p, [
        {transform: `${T(x0, y0)} rotate(0deg) scale(.4)`, opacity: 0},
        {transform: `${T((x0 + x1) / 2, (y0 + y1) / 2)} rotate(${rnd(-90, 90)}deg) scale(1.1)`, opacity: 1, offset: 0.3},
        {transform: `${T(x1, y1 + u * 3)} rotate(${rnd(-260, 260)}deg) scale(.9)`, opacity: 0},
      ], {duration: 950, delay: 180 + i * 12, easing: 'cubic-bezier(.2,.7,.4,1)'});
    }
    // gökten süzülen yapraklar
    const n = Math.round((jack ? 30 : 24) * k);
    for (let i = 0; i < n; i++) {
      const p = pets.get();
      p.className = `kh-fb kh-fb--pet ${VAR[Math.floor(Math.random() * VAR.length)]}`;
      const x0 = rnd(-0.05, 1.05) * W, y0 = -u * 2 - rnd(0, H * 0.12), y1 = H * rnd(0.55, 1);
      const A = u * rnd(1.5, 3.5), ph = Math.random() * 6.28, drift = rnd(-W, W) * 0.08, spin = rnd(-300, 300), flip = rnd(200, 520), s0 = rnd(0.8, 1.35);
      const kf: Keyframe[] = [];
      for (const q of [0, 0.25, 0.5, 0.75, 1]) {
        const x = x0 + drift * q + Math.sin(ph + q * 6.28) * A, y = y0 + (y1 - y0) * q;
        kf.push({transform: `${T(x, y)} rotate(${(spin * q).toFixed(0)}deg) rotateX(${(flip * q).toFixed(0)}deg) scale(${s0})`, opacity: q === 0 ? 0 : q === 1 ? 0 : 1, offset: q});
      }
      kf[1].opacity = 1;
      this.fly(p, kf, {duration: rnd(950, 1200), delay: rnd(0, 380), easing: 'linear'});
    }
    this.snd?.swoosh();
    window.setTimeout(() => this.snd?.starChime(1), 160);
    window.setTimeout(() => this.snd?.starChime(4), 420);
  }

  /** Şimşek: ışık kararır, gök yarılır (beyaz-mavi çakma), yığına yıldırım iner, elektrik halkaları ve kıvılcımlar. */
  simsekFx(jack: boolean, at: Pt, low: boolean): void {
    const u = this.u, W = this.W;
    play(this.nightEl, [{opacity: 0}, {opacity: 1, offset: 0.1}, {opacity: 1, offset: 0.65}, {opacity: 0}], {duration: 1400, easing: 'ease-in-out'}, 0.3);
    const fl = this.fbPool('sF', 1, 'sflash').get();
    this.fly(fl, [{opacity: 0}, {opacity: 0.85, offset: 0.05}, {opacity: 0.1, offset: 0.13}, {opacity: 0.7, offset: 0.21}, {opacity: 0, offset: 0.45}, {opacity: 0}],
      {duration: 1300, delay: 60, easing: 'linear'});
    const bolts = this.fbPool('sB', 3, 'bolt');
    const nb = jack ? 3 : 2;
    for (let i = 0; i < nb; i++) {
      const b = bolts.get();
      b.className = `kh-fb kh-fb--bolt is-${(i % 3) + 1}`;
      const x = i === 0 ? at.x : at.x + (i === 1 ? -1 : 1) * W * rnd(0.18, 0.3), y1 = i === 0 ? at.y : at.y + u * rnd(-4, 4);
      b.style.height = `${Math.max(40, y1 + u).toFixed(0)}px`;
      const tr = T(x, -u);
      this.fly(b, [
        {transform: `${tr} scaleY(0)`, opacity: 1},
        {transform: `${tr} scaleY(1)`, opacity: 1, offset: 0.1},
        {transform: `${tr} scaleY(1)`, opacity: 0.25, offset: 0.18},
        {transform: `${tr} scaleY(1)`, opacity: 1, offset: 0.26},
        {transform: `${tr} scaleY(1)`, opacity: 1, offset: 0.42},
        {transform: `${tr} scaleY(1)`, opacity: 0},
      ], {duration: 820, delay: 60 + i * 240, easing: 'linear'});
    }
    const rings = this.fbPool('sR', 2, 'sring');
    for (let i = 0; i < 2; i++)
      this.fly(rings.get(), [{transform: `${T(at.x, at.y)} scale(.2)`, opacity: 1}, {transform: `${T(at.x, at.y)} scale(2.8)`, opacity: 0}], {duration: 650, delay: 140 + i * 170, easing: 'cubic-bezier(.1,.6,.3,1)'});
    const sparks = this.fbPool('sS', 22, 'spark');
    const n = Math.round((jack ? 22 : 16) * (low ? 0.5 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() < 0.8 ? -Math.PI * rnd(0.05, 0.95) : Math.random() * Math.PI * 2, d = u * rnd(4, 9.5), g = u * 5;
      const kf: Keyframe[] = [];
      for (const q of [0, 0.2, 0.5, 1]) {
        const e = 1 - Math.pow(1 - q, 2.2);
        const x = at.x + Math.cos(a) * d * e, y = at.y + Math.sin(a) * d * e + g * q * q;
        const vx = Math.cos(a) * d * (1 - q), vy = Math.sin(a) * d * (1 - q) + 2 * g * q;
        kf.push({transform: `${T(x, y)} rotate(${((Math.atan2(vy, vx) * 180) / Math.PI).toFixed(0)}deg) scaleX(${q === 0 ? 0.4 : q < 0.3 ? 2 : q < 0.6 ? 1.1 : 0.3})`, opacity: q === 1 ? 0 : 1, offset: q});
      }
      this.fly(sparks.get(), kf, {duration: rnd(520, 820), delay: 140 + rnd(0, 140), easing: 'linear'});
    }
    for (let i = 0; i < (low ? 3 : 6); i++) {
      const a = Math.random() * Math.PI * 2, d = u * rnd(2, 5);
      this.sparkleAt(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 200 + i * 90, 1.6);
    }
    window.setTimeout(() => this.snd?.fireworkBurst(1.3), 110);
    window.setTimeout(() => this.snd?.sweep(), 300);
  }

  /** Davul Zurna: davul belirir ve gümler (her vuruşta şok dalgası + uçuşan notalar), zurna soldan girip çalar, konfeti. */
  davulFx(jack: boolean, at: Pt, low: boolean): void {
    const u = this.u, W = this.W, H = this.H;
    const beats = jack ? [200, 420, 640, 860] : [220, 480, 740];
    const D = 1550;
    const dx = at.x, dy = at.y + u * 0.6;
    const drum = this.fbPool('dD', 1, 'drum').get();
    const kf: Keyframe[] = [{transform: `${T(dx, dy)} scale(0)`, opacity: 0, offset: 0}, {transform: `${T(dx, dy)} scale(1.12)`, opacity: 1, offset: 120 / D}, {transform: `${T(dx, dy)} scale(1)`, opacity: 1, offset: 180 / D}];
    for (const b of beats) {
      kf.push({transform: `${T(dx, dy)} scale(1.14, .84)`, opacity: 1, offset: (b + 30) / D});
      kf.push({transform: `${T(dx, dy)} scale(1, 1)`, opacity: 1, offset: (b + 130) / D});
    }
    kf.push({transform: `${T(dx, dy)} scale(1)`, opacity: 1, offset: 0.82}, {transform: `${T(dx, dy - u)} scale(.85)`, opacity: 0, offset: 1});
    this.fly(drum, kf, {duration: D, easing: 'ease-out'});
    const zu = this.fbPool('dZ', 1, 'zurna').get();
    const zx = at.x - u * 9.5, zy = at.y - u * 3.4;
    const zk: Keyframe[] = [{transform: `${T(-u * 8, zy - u)} rotate(-24deg)`, opacity: 0, offset: 0}, {transform: `${T(zx, zy)} rotate(-14deg)`, opacity: 1, offset: 0.16}];
    beats.forEach((b, i) => zk.push({transform: `${T(zx, zy)} rotate(${i % 2 ? -16 : -9}deg)`, opacity: 1, offset: (b + 60) / D}));
    zk.push({transform: `${T(zx, zy)} rotate(-12deg)`, opacity: 1, offset: 0.8}, {transform: `${T(-u * 9, zy - u * 2)} rotate(-30deg)`, opacity: 0, offset: 1});
    this.fly(zu, zk, {duration: D, easing: 'ease-in-out'});
    const waves = this.fbPool('dW', 4, 'dwave');
    const notes = this.fbPool('dN', 20, 'note');
    const per = Math.max(2, Math.round((jack ? 5 : 6) * (low ? 0.5 : 1)));
    beats.forEach((b, bi) => {
      this.fly(waves.get(), [{transform: `${T(dx, dy)} scale(.35)`, opacity: 0.95}, {transform: `${T(dx, dy)} scale(2.9)`, opacity: 0}], {duration: 520, delay: b, easing: 'cubic-bezier(.1,.6,.3,1)'});
      for (let j = 0; j < per; j++) {
        const nt = notes.get();
        nt.className = `kh-fb kh-fb--note is-${1 + ((bi * per + j) % 4)}`;
        const x0 = dx + rnd(-u * 2.2, u * 2.2), y0 = dy - u * 2;
        const x1 = x0 + rnd(-W, W) * 0.34, y1 = y0 - H * rnd(0.16, 0.34);
        const A = u * rnd(1, 2.4), wob = rnd(12, 26), s1 = rnd(0.9, 1.35);
        const nk: Keyframe[] = [];
        for (const q of [0, 0.3, 0.6, 1]) {
          const x = x0 + (x1 - x0) * q + Math.sin(q * 7) * A, y = y0 + (y1 - y0) * (1 - (1 - q) * (1 - q));
          nk.push({transform: `${T(x, y)} rotate(${(Math.sin(q * 9) * wob).toFixed(0)}deg) scale(${q === 0 ? 0.3 : q === 1 ? s1 * 0.9 : s1})`, opacity: q === 0 || q === 1 ? 0 : 1, offset: q});
        }
        nk[1].opacity = 1;
        this.fly(nt, nk, {duration: rnd(650, 820), delay: b + j * 25, easing: 'linear'});
      }
    });
    window.setTimeout(() => this.burst({x: at.x, y: at.y}, {coins: 0, confetti: Math.round((jack ? 18 : 12) * (low ? 0.5 : 1)), power: 0.8, up: 1.1}), beats[0]);
    this.snd?.drumRoll(1.0);
    beats.forEach((b, i) => window.setTimeout(() => this.snd?.starChime(i + 2), b + 40));
  }

  /** Dört Renk Girdap: dört renkli ışık kolları dönerek yığına çekilir, sarmal disk küçülür; merkezde yıldız patlar. */
  girdapFx(jack: boolean, at: Pt, low: boolean): void {
    const W = this.W, H = this.H;
    const disc = this.fbPool('gD', 1, 'disc').get();
    this.fly(disc, [
      {transform: `${T(at.x, at.y)} scale(1.5) rotate(0deg)`, opacity: 0},
      {transform: `${T(at.x, at.y)} scale(1.25) rotate(140deg)`, opacity: 0.9, offset: 0.2},
      {transform: `${T(at.x, at.y)} scale(.8) rotate(360deg)`, opacity: 1, offset: 0.6},
      {transform: `${T(at.x, at.y)} scale(.08) rotate(600deg)`, opacity: 0},
    ], {duration: 1250, easing: 'ease-in'});
    const ps = this.fbPool('gP', 32, 'gp');
    const n = Math.round((jack ? 32 : 24) * (low ? 0.5 : 1));
    const maxR = Math.hypot(W, H) * 0.42;
    for (let i = 0; i < n; i++) {
      const arm = i % 4, j = Math.floor(i / 4);
      const p = ps.get();
      p.style.color = SUIT_HEX[arm];
      const R0 = maxR * rnd(0.55, 1), a0 = (arm * Math.PI) / 2 + j * 0.32 + rnd(0, 0.2), turns = Math.PI * 2.2;
      const pos = (e: number): [number, number] => {
        const r = R0 * Math.pow(1 - e, 1.4), th = a0 + turns * Math.pow(e, 0.8);
        return [at.x + Math.cos(th) * r, at.y + Math.sin(th) * r * 0.82];
      };
      const kf: Keyframe[] = [];
      for (const q of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        const [x, y] = pos(q), [x2, y2] = pos(Math.min(1, q + 0.03));
        const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
        kf.push({transform: `${T(x, y)} rotate(${ang.toFixed(0)}deg) scale(${(0.5 + 1.1 * (1 - q)).toFixed(2)})`, opacity: q === 0 ? 0 : q === 1 ? 0 : 1, offset: q});
      }
      this.fly(p, kf, {duration: rnd(900, 1100), delay: j * 38 + arm * 14, easing: 'cubic-bezier(.4,0,.8,.6)'});
    }
    // merkezde yıldız patlaması + halka + parlama
    const fl = this.fwFlash.get();
    fl.style.color = '#fff6c8';
    fl.classList.add('is-star');
    this.fly(fl, [{transform: `${T(at.x, at.y)} scale(.1) rotate(0deg)`, opacity: 0}, {transform: `${T(at.x, at.y)} scale(${jack ? 2.6 : 2.1}) rotate(45deg)`, opacity: 1, offset: 0.35}, {transform: `${T(at.x, at.y)} scale(.4) rotate(110deg)`, opacity: 0}],
      {duration: 560, delay: 980, easing: 'cubic-bezier(.2,.7,.3,1)'});
    window.setTimeout(() => fl.classList.remove('is-star'), 1600);
    const ring = this.fbPool('gR', 1, 'sring').get();
    this.fly(ring, [{transform: `${T(at.x, at.y)} scale(.2)`, opacity: 1}, {transform: `${T(at.x, at.y)} scale(3.2)`, opacity: 0}], {duration: 560, delay: 1000, easing: 'cubic-bezier(.1,.6,.3,1)'});
    play(this.flashEl, [{opacity: 0}, {opacity: 0.7, offset: 0.25}, {opacity: 0}], {duration: 520, delay: 990, easing: 'ease-out'}, 1);
    this.snd?.swoosh();
    window.setTimeout(() => this.snd?.bonus(), 1000);
  }
}
