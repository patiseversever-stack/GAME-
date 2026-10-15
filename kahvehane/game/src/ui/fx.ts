// Ekran efektleri: yumuşak renkli ışık patlaması, jeton + dört renk konfeti (havuzlu DOM), uçan jetonlar,
// PİŞTİ damgası (dört renk hüzme, valede dört renk çark), afiş, puan baloncuğu.
// Yalnız transform + opacity; düğümler havuzdan gelir, iş bitince gizlenir (yeni düğüm üretilmez).
import {ANIM, EASE, esc, h, play} from './dom';
import {ASSETS, OPTIONAL_ART} from './assets';
import {suitSvg, type SuitKey} from './icons';

type Pt = {x: number; y: number};

const N_COIN = 18;
const N_CONF = 40;
const N_SUIT = 12;
const N_POP = 6;
const SUITS: SuitKey[] = ['h', 'd', 'c', 's'];

export function g3(text: string, cls = ''): string {
  const t = esc(text);
  return `<span class="kh-g3 ${cls}" data-t="${t}">${t}</span>`;
}

export class Fx {
  readonly el = h('div', 'kh-fx');
  private flashEl = h('div', 'kh-flash');
  private coins: HTMLElement[] = [];
  private confs: HTMLElement[] = [];
  private suits: HTMLElement[] = [];
  private pops: HTMLElement[] = [];
  private stampEl = h('div', 'kh-stamp');
  private bannerEl = h('div', 'kh-banner');
  private stampTimer = 0;
  private bannerTimer = 0;
  private popIdx = 0;

  constructor(parent: HTMLElement) {
    this.el.style.setProperty('--coin-img', `url("${ASSETS.icon_coin}")`);
    this.el.append(this.flashEl, this.stampEl, this.bannerEl);
    parent.append(this.el);
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
    const u = parseFloat(getComputedStyle(this.el).fontSize) || 15;
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
   * vale piştide ek olarak dışa doğru açılan dört renk çark halkası.
   */
  stamp(jack: boolean, points: number): void {
    clearTimeout(this.stampTimer);
    const img = jack ? OPTIONAL_ART.vale_pisti_text : OPTIONAL_ART.pisti_text;
    const word = jack ? 'VALE PİŞTİ!' : 'PİŞTİ!';
    this.stampEl.className = 'kh-stamp is-on' + (jack ? ' is-jack' : '');
    this.stampEl.innerHTML = `<div class="kh-stamp__in"><div class="kh-stamp__glow"></div><div class="kh-stamp__rays"></div>${jack ? '<div class="kh-stamp__wheel"></div>' : ''}
      <div class="kh-stamp__word">${img ? `<img class="kh-g3img" src="${img}" alt="${word}">` : jack ? g3('VALE', 'is-sm is-white') + g3('PİŞTİ!') : g3(word)}</div>
      <div class="kh-stamp__pts">${g3('+' + points, 'is-white')}</div></div>`;
    const inn = this.stampEl.firstElementChild as HTMLElement;
    const glow = inn.querySelector('.kh-stamp__glow') as HTMLElement;
    const rays = inn.querySelector('.kh-stamp__rays') as HTMLElement;
    const pts = inn.querySelector('.kh-stamp__pts') as HTMLElement;
    const wheel = inn.querySelector<HTMLElement>('.kh-stamp__wheel');
    const D = 1750;
    play(inn, [
      {transform: 'scale(1.45) rotate(-9deg)', opacity: 0},
      {transform: 'scale(.95) rotate(-3deg)', opacity: 1, offset: 0.1},
      {transform: 'scale(1.02) rotate(-2deg)', opacity: 1, offset: 0.16},
      {transform: 'scale(1) rotate(-2deg)', opacity: 1, offset: 0.7},
      {transform: 'translateY(-34px) scale(1.06) rotate(-2deg)', opacity: 0},
    ], {duration: D, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'}, 0.45);
    play(rays, [{transform: 'rotate(0deg) scale(.5)', opacity: 0}, {transform: 'rotate(18deg) scale(1)', opacity: 1, offset: 0.18}, {transform: 'rotate(42deg) scale(1.04)', opacity: 0.9, offset: 0.7}, {transform: 'rotate(56deg) scale(1.1)', opacity: 0}],
      {duration: D, easing: 'ease-out', fill: 'both'}, 0.45);
    if (wheel)
      play(wheel, [{transform: 'rotate(-30deg) scale(.2)', opacity: 0}, {transform: 'rotate(40deg) scale(.95)', opacity: 1, offset: 0.2}, {transform: 'rotate(110deg) scale(1.08)', opacity: 1, offset: 0.55}, {transform: 'rotate(170deg) scale(1.5)', opacity: 0}],
        {duration: D * 0.85, easing: 'ease-out', fill: 'both'}, 0.4);
    play(glow, [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.1)', opacity: 1, offset: 0.14}, {transform: 'scale(1)', opacity: 0.8, offset: 0.6}, {transform: 'scale(1.2)', opacity: 0}],
      {duration: D, easing: 'ease-out', fill: 'both'}, 0.45);
    play(pts, [{transform: 'scale(0) rotate(8deg)'}, {transform: 'scale(0) rotate(8deg)', offset: 0.1}, {transform: 'scale(1.18) rotate(0deg)', offset: 0.2}, {transform: 'scale(1) rotate(0deg)', offset: 0.26}, {transform: 'scale(1)'}],
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

  /** Yükselen puan baloncuğu. */
  pop(x: number, y: number, text: string): void {
    let n = this.pops[this.popIdx % N_POP];
    if (!n) {
      n = h('b', 'kh-pop');
      this.pops.push(n);
      this.el.append(n);
    }
    this.popIdx++;
    n.innerHTML = g3(text);
    n.style.display = 'block';
    const p = (dy: number, s: number) => `translate3d(${x.toFixed(1)}px,${(y + dy).toFixed(1)}px,0) translate(-50%,-50%) scale(${s})`;
    const a = play(n, [
      {transform: p(6, 0.4), opacity: 0},
      {transform: p(-8, 1.2), opacity: 1, offset: 0.18},
      {transform: p(-16, 1), opacity: 1, offset: 0.32},
      {transform: p(-40, 1), opacity: 1, offset: 0.75},
      {transform: p(-58, 0.96), opacity: 0},
    ], {duration: 1100, easing: 'ease-out', fill: 'both'}, 0.4);
    const node = n;
    if (ANIM) a.onfinish = () => (node.style.display = 'none');
  }

  /** Jeton ikonu (uçuş hedefleri için kaynak). */
  get coinUrl(): string {
    return ASSETS.icon_coin;
  }
}
