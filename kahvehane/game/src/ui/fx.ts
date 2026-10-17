// Ekran efektleri: yumuşak renkli ışık patlaması, jeton + dört renk konfeti (havuzlu DOM), uçan jetonlar,
// PİŞTİ damgası (dört renk hüzme, valede dört renk çark), afiş, puan baloncuğu, seri rozeti, vurgu yazısı ve
// kuşanılabilir pişti efektleri (tarifler src/ui/fxlib.ts; önceden çizilmiş görseller src/ui/fxsprites.ts):
// klasik (Zafer Işığı) · altin · havai · yildiz · simsek · lale · nazar · tac (Taç Giyme) · girdap (Kozmik Girdap).
// Yalnız transform + opacity; düğümler havuzdan gelir, iş bitince gizlenir (yeni düğüm üretilmez).
import {cancelAnims} from '../platform/anim';
import {ctx2d, radial} from '../platform/tex';
import './fx.css';
import {ANIM, EASE, esc, h, play} from './dom';
import {ASSETS, OPTIONAL_ART} from './assets';
import {suitSvg, type SuitKey} from './icons';
import type {HudSounds} from './types';
import {FX, FX_MS, type Stage} from './fxlib';
import {spriteNode, spriteSize, spriteUrl, warmSprites} from './fxsprites';

type Pt = {x: number; y: number};
export type Tone = 'gold' | 'white' | 'blue';

const N_COIN = 44;
const N_CONF = 40;
const N_SUIT = 12;
const N_POP = 8;
const SUITS: SuitKey[] = ['h', 'd', 'c', 's'];

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

/**
 * Tam ekran yumuşak ışık patlaması (eski --flash: radial-gradient(circle at 50% 46%, …)) küçük tuvale: tam ekran bir DOM gradyanı
 * dpr 2,6'da ≈ 10 MB karo demek ve her parlamada (pişti, VS darbesi) yeniden taranırdı. Tuval kutunun en-boy oranında (128 px
 * genişlik); oran değişince (döndürme) yeniden çizilir.
 */
export function paintFlash(cv: HTMLCanvasElement): void {
  const w = cv.clientWidth || innerWidth, hh = cv.clientHeight || innerHeight;
  const W = 128, H = Math.max(8, Math.min(1024, Math.round((128 * hh) / Math.max(1, w))));
  if (cv.width === W && cv.height === H && cv.dataset.p) return;
  cv.width = W;
  cv.height = H;
  cv.dataset.p = '1';
  const g = ctx2d(cv);
  if (!g) return;
  const cx = W * 0.5, cy = H * 0.46, r = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)); // farthest-corner
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  gr.addColorStop(0, 'rgba(255,226,120,.62)');
  gr.addColorStop(0.18, 'rgba(255,190,70,.3)');
  gr.addColorStop(0.4, 'rgba(90,120,255,.16)');
  gr.addColorStop(0.64, 'rgba(61,91,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
}

export class Fx {
  readonly el = h('div', 'kh-fx');
  private flashEl = h('canvas', 'kh-flash');
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
  /** Efektlere eşlik eden sesler (Match bağlar) */
  snd: HudSounds | null = null;

  constructor(parent: HTMLElement) {
    this.el.style.setProperty('--coin-img', `url("${ASSETS.icon_coin}")`);
    this.el.append(this.nightEl, this.flashEl, this.stampEl, this.bannerEl, this.shoutEl, this.comboEl);
    parent.append(this.el);
    // efekt görselleri boşta, dilim dilim önceden çizilir (~45 küçük görsel, toplam ~70 ms; ilk piştide takılma olmasın)
    if (ANIM) window.setTimeout(() => {
      warmSprites(undefined, true);
      warmSprites(undefined, false, true); // oyundaki doku düğümleri (Zafer Işığı); diğer efektler ilk piştide
    }, 2500);
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
    paintFlash(this.flashEl);
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
    this.stampEl.innerHTML = `<div class="kh-stamp__in"><canvas class="kh-stamp__glow" width="256" height="256"></canvas><div class="kh-stamp__rays"></div>${jack ? '<div class="kh-stamp__wheel"></div>' : ''}
      <div class="kh-stamp__word">${img ? `<img class="kh-g3img" src="${img}" alt="${word}">` : jack ? g3('VALE', 'is-sm is-white') + g3('PİŞTİ!') : g3(word)}</div>
      <div class="kh-stamp__pts">${g3('+' + points, 'is-white')}</div></div>`;
    const inn = this.stampEl.firstElementChild as HTMLElement;
    const glow = inn.querySelector('.kh-stamp__glow') as HTMLCanvasElement;
    // ışık hâlesi küçük doku tuvali (bkz. src/platform/tex.ts): 1,2× büyüyen 26u'luk gradyan katmanı taranmaz
    radial(glow, [[0, 'rgba(255, 236, 140, .85)'], [0.26, 'rgba(255, 196, 60, .45)'], [0.46, 'rgba(255, 159, 26, .14)'], [0.64, 'rgba(255, 159, 26, 0)'], [1, 'rgba(255, 159, 26, 0)']], false, true);
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

  // ─────────────── kuşanılabilir pişti efektleri (tarifler: src/ui/fxlib.ts, görseller: src/ui/fxsprites.ts) ───────────────
  /** Görsel düğüm havuzları: anahtar + taban boyut başına (ilk kullanımda kurulur, sonra yeniden kullanılır). */
  private qpools = new Map<string, Ring>();
  private qBack = h('div', 'kh-ql');
  private qFront = h('div', 'kh-ql is-front');
  /** pişti kahramanı sahnedeyken bile en üstte kalan katman (yalnız yüzü örtmeyen taç vb.) */
  private qTop = h('div', 'kh-ql is-top');
  private qFlash = h('div', 'kh-qflash');
  private warmed = false;

  /** Kuşanılmış efektin görsellerini boşta önceden çiz (ilk piştide çizim maliyeti olmasın). */
  prime(id: string): void {
    warmSprites(id, false);
    warmSprites(id, false, true);
  }

  private qnode(key: string, w: number, h0?: number, layer: 0 | 1 | 2 = 0): HTMLElement | null {
    const [sw, sh] = spriteSize(key);
    const hh = h0 ?? (w * sh) / sw;
    const id = `${key}|${w.toFixed(0)}|${hh.toFixed(0)}|${layer}`;
    let r = this.qpools.get(id);
    if (!r) {
      const host = layer === 2 ? this.qTop : layer === 1 ? this.qFront : this.qBack;
      r = new Ring(host, 22, () => {
        // görsel düğümü küçük bir doku katmanı (<canvas>, görselin kendi boyutunda): ekranda büyütülünce yeniden taranmaz,
        // GPU karo belleği tutmaz (bkz. fxsprites.ts spriteNode). Yalnız jeton dış görsel: arka plan görseli.
        const n = spriteNode(key, 'kh-q') ?? h('i', 'kh-q');
        n.style.cssText = `width:${w.toFixed(1)}px;height:${hh.toFixed(1)}px;margin:${(-hh / 2).toFixed(1)}px 0 0 ${(-w / 2).toFixed(1)}px` +
          (n instanceof HTMLCanvasElement ? '' : `;background-image:url("${spriteUrl(key)}")`);
        return n;
      });
      this.qpools.set(id, r);
    }
    return r.get();
  }

  /** Kahraman çıktı: efekt katmanları yerine (efekt katmanına) döner; süren animasyonlar sürer. */
  heroDone(): void {
    if (this.qBack.parentElement && this.qBack.parentElement !== this.el) {
      this.el.insertBefore(this.qBack, this.qFlash.nextSibling);
      this.el.insertBefore(this.qFront, this.qTop);
    }
  }

  /** Oyundaki sahne: bu katman, havuz düğümleri, sesler. Kullanılan düğümler efekt bitince TOPLUCA gizlenir
   * (her düğüm için ayrı bitiş işleyicisi + display değişimi = her karede stil hesabı olurdu). */
  private tok = 0;
  private qanim = new WeakMap<HTMLElement, Animation>();
  private stage(low: boolean, used: HTMLElement[], tok: string, face?: DOMRect): Stage {
    const W = this.W, H = this.H;
    if (!this.qFlash.isConnected) {
      // arka katman damganın (z 2) altında, ön katman üstünde; ekran ışığı en arkada
      this.el.prepend(this.qFlash, this.qBack);
      this.el.append(this.qFront, this.qTop);
    }
    return {
      W,
      H,
      M: Math.min(W, H),
      low,
      face,
      node: (key, w, hh, front, top) => {
        const n = this.qnode(key, w, hh, top ? 2 : front ? 1 : 0);
        if (n) {
          n.style.display = 'none'; // gösterim, animasyonu başlarken (aşağıda)
          n.dataset.tok = tok;
          used.push(n);
        }
        return n;
      },
      // Geç başlayan parçacıklar ancak sıraları yaklaşınca görünür olur: ilk karede onlarca katman birden kurulmasın
      // (katman kurma + boyama tek kareye yığılırsa yavaş telefonda o kare uzar).
      run: (n, kf, o) => {
        const d = Number(o.delay) || 0;
        if (d < 260) {
          n.style.display = 'block';
          this.qanim.set(n, play(n, kf, {fill: 'both', ...o}));
          return;
        }
        const t0 = performance.now();
        window.setTimeout(() => {
          if (n.dataset.tok !== tok) return;
          n.style.display = 'block';
          this.qanim.set(n, play(n, kf, {fill: 'both', ...o, delay: Math.max(0, d - (performance.now() - t0))}));
        }, d - 180);
      },
      flash: (color, peak, ms, delay = 0) => {
        this.qFlash.style.background = color;
        play(this.qFlash, [{opacity: 0}, {opacity: peak, offset: 0.1}, {opacity: peak * 0.3, offset: 0.4}, {opacity: 0}], {duration: ms, delay, easing: 'ease-out'}, 1);
      },
      night: (peak, ms, delay = 0) => play(this.nightEl, [{opacity: 0}, {opacity: peak, offset: 0.12}, {opacity: peak, offset: 0.72}, {opacity: 0}], {duration: ms, delay, easing: 'ease-in-out'}, 0.3),
      sfx: (ms, fn) => {
        if (this.snd) window.setTimeout(() => this.snd && fn(this.snd), ms);
      },
    };
  }

  /**
   * Kuşanılmış pişti efekti (bkz. src/ui/fxlib.ts). Vale piştide daha yoğun; `low`: yarı parçacık, ikincil katman yok.
   * hero: pişti kahramanı (büyük portre) sahnedeyken efekt onun ARKASINDA, başının çevresinde bir hâle gibi oynar
   * (yüz asla örtülmez): katmanlar kahraman bandıyla portre arasına taşınır; yalnız taç başın üstünde, önde durur.
   */
  pistiFx(id: string, jack: boolean, at: Pt, low = false, hero?: {host: HTMLElement; before: Element; face: DOMRect}): void {
    if (!ANIM) return;
    if (!this.warmed) {
      this.warmed = true;
      warmSprites(id, false, true);
    }
    const used: HTMLElement[] = [], tok = String(++this.tok);
    const fx = FX[id] ? id : 'klasik';
    const st = this.stage(low, used, tok, hero?.face);
    if (hero) {
      hero.host.insertBefore(this.qBack, hero.before);
      hero.host.insertBefore(this.qFront, hero.before);
      const f = hero.face;
      at = {x: f.x + f.width / 2, y: f.y + f.height * 0.14};
    } else this.heroDone();
    FX[fx](st, at, jack);
    // bitince topluca gizle (durdurulmuş/uzamış animasyonu olan düğüm bir süre daha bekler)
    const sweep = (): void => {
      let left = 0;
      for (const n of used) {
        if (n.dataset.tok !== tok) continue;
        const a = this.qanim.get(n);
        if (a && a.playState !== 'finished') left++;
        else hide(n);
      }
      if (left) window.setTimeout(sweep, 600);
    };
    window.setTimeout(sweep, (FX_MS[fx] ?? 2000) + (jack ? 600 : 300));
  }
}
