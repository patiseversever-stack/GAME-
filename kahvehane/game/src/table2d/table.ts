// Pişti Arena — 2B masa: arka plan (tema), kart katmanı, dokunmatik el, 2/4 koltuk yerleşimi, uçuşlar ve masa efektleri.
// Tüm hareket WAAPI ile transform/opacity üzerinden (bileşimci iş parçacığında akar; ana iş parçacığı meşgulken bile akıcı).
// Kart yüzleri atlas tuvalinden her kartın kendi küçük tuvaline bir kez kopyalanır (kodlama/indirme yok).
// Efekt düğümleri (kıvılcım, halka, iz, toz) havuzdan gelir; boşta hiçbir JS çalışmaz (yalnız ucuz CSS/WAAPI döngüleri).
import './table.css';
import {ATLAS_COLS, BACK_INDEX, CORNER_RADIUS, type CardAtlas} from '../render/cardAtlas';
import {cardId, isJack, rankOf, suitOf, type CardId, type Suit} from '../core/types';
import type {TableTheme} from '../themes/contract';

export interface TableSounds {
  deal(): void;
  land(impact: number): void;
  flip(): void;
  slide(): void;
  whoosh(p: number): void;
}

interface Pose {
  x: number;
  y: number;
  r: number; // derece
  s: number;
}

class Card {
  readonly el: HTMLDivElement;
  /** Yerel hareketler (çevirme, sekme, kıpırdama) bu iç katmanda; poz dıştaki öğede. */
  readonly inn: HTMLDivElement;
  readonly cv: HTMLCanvasElement;
  readonly hot: HTMLElement;
  id: CardId = -1;
  cell = BACK_INDEX;
  pose: Pose = {x: 0, y: 0, r: 0, s: 1};
  anim: Animation | null = null;
  gold: HTMLElement | null = null;
  constructor(w: number, h: number) {
    this.el = document.createElement('div');
    this.el.className = 'c2';
    this.inn = document.createElement('div');
    this.inn.className = 'c2__in';
    this.cv = document.createElement('canvas');
    this.cv.className = 'c2__f';
    this.cv.width = w;
    this.cv.height = h;
    this.hot = document.createElement('i');
    this.hot.className = 'c2__hot';
    this.inn.append(this.hot, this.cv);
    this.el.append(this.inn);
  }
}

const tf = (p: Pose, cw: number, ch: number) =>
  `translate3d(${(p.x - cw / 2).toFixed(1)}px,${(p.y - ch / 2).toFixed(1)}px,0) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const done = (a: Animation, el?: HTMLElement) => a.finished.then(() => el?.remove(), () => el?.remove());
export const SUIT_COLOR: Record<Suit, string> = {H: '#ff2e4d', D: '#ffb400', C: '#16c45b', S: '#1f7bff'};
const EASE_OUT = 'cubic-bezier(.2,.75,.25,1)';
const D10 = cardId('D', 10);
const C2 = cardId('C', 2);

/** Kartın puan değeri: ♦10 = 3, ♣2 = 2, As ve Vale = 1, diğerleri 0. */
export function cardPoints(c: CardId): number {
  if (c === D10) return 3;
  if (c === C2) return 2;
  const r = rankOf(c);
  return r === 1 || r === 11 ? 1 : 0;
}

/** Koltuk geometrisi. a: koltuğun bakış açısı (0 alt/insan, 180 üst, -90 sağ, 90 sol). */
interface SeatGeo {
  fan: {x: number; y: number; a: number; s: number; spread: number};
  stack: {x: number; y: number; s: number; r: number};
  /** Pişti kartları yığının hangi yanına dizilir (+1 sağ, -1 sol) */
  pdir: number;
}

interface Layout {
  W: number;
  H: number;
  cw: number;
  ch: number;
  pile: {x: number; y: number};
  deck: {x: number; y: number; s: number};
  hand: {x: number; y: number; s: number; maxW: number};
  seats: SeatGeo[];
}

/** Havuz: sabit sayıda düğüm; boşta olan tekrar kullanılır (yeni düğüm üretilmez). */
class Pool {
  private items: HTMLElement[] = [];
  private i = 0;
  constructor(private host: HTMLElement, private cls: string, private max: number) {}
  get(): HTMLElement {
    let el = this.items[this.i % this.max];
    if (!el) {
      el = document.createElement('i');
      el.className = this.cls;
      this.host.append(el);
      this.items.push(el);
    }
    this.i++;
    el.getAnimations().forEach(a => a.cancel());
    el.style.display = 'block';
    return el;
  }
  hide(el: HTMLElement): void {
    el.style.display = 'none';
  }
}

export class Table2D {
  readonly root: HTMLDivElement;
  readonly low: boolean;
  private zoomEl: HTMLDivElement;
  private shakeEl: HTMLDivElement;
  private cardsEl: HTMLDivElement;
  private fxEl: HTMLDivElement;
  private ring: HTMLDivElement;
  private raysEl: HTMLElement;
  private tintEl: HTMLElement;
  private paintEl: HTMLCanvasElement | null = null;
  private raysAnim: Animation | null = null;
  private raysTimers: number[] = [];
  private glows = new Map<string, HTMLElement>();
  private all: Card[] = [];
  private byId = new Map<CardId, Card>();
  private sparks: Pool;
  private pulses: Pool;
  private ghosts: Pool;
  private puffs: Pool;
  private golds: HTMLElement[] = [];
  /** Koltuk sayısı (2 ya da 4) */
  n: 2 | 4 = 2;
  deck: Card[] = [];
  pile: Card[] = [];
  hands: Card[][] = [[], []];
  stacks: Card[][] = [[], []];
  pistis: Card[][] = [[], []];
  L!: Layout;
  private hotSet = new Set<CardId>();
  private input: {res: (c: CardId) => void} | null = null;
  private drag: {card: Card; id: number; x0: number; y0: number; moved: boolean; dx: number; dy: number} | null = null;
  private wig: {card: Card; a: Animation} | null = null;
  private theme: TableTheme | null = null;
  private themeVars: string[] = [];
  private paintTok = 0;
  private paintTimer = 0;
  /** Deste/yığın değişince HUD'a haber ver (deste rozetinin yeri) */
  onDeck: (count: number, x: number, y: number) => void = () => {};

  constructor(host: HTMLElement, private atlas: CardAtlas, private snd: TableSounds, low: boolean) {
    this.low = low;
    this.root = document.createElement('div');
    this.root.className = 'ar' + (low ? ' is-low' : '');
    this.root.innerHTML = `<div class="ar__bg"></div>
      ${['N', 'H', 'D', 'C', 'S'].map(s => `<div class="ar__glow" data-s="${s}"></div>`).join('')}
      <div class="ar__tint"></div><div class="ar__rays"></div><div class="ar__pattern"></div><div class="ar__vig"></div><div class="ar__edge"></div>
      <div class="ar__zoom"><div class="ar__shake"><div class="ar__ring"><i></i></div><div class="ar__cards"></div><div class="ar__fx"></div></div></div>`;
    host.append(this.root);
    this.zoomEl = this.root.querySelector('.ar__zoom')!;
    this.shakeEl = this.root.querySelector('.ar__shake')!;
    this.cardsEl = this.root.querySelector('.ar__cards')!;
    this.fxEl = this.root.querySelector('.ar__fx')!;
    this.ring = this.root.querySelector('.ar__ring')!;
    this.raysEl = this.root.querySelector('.ar__rays')!;
    this.tintEl = this.root.querySelector('.ar__tint')!;
    this.root.querySelectorAll<HTMLElement>('.ar__glow').forEach(g => this.glows.set(g.dataset.s!, g));
    (this.root.querySelector('.ar__pattern') as HTMLElement).style.backgroundImage = patternUrl();
    this.root.style.setProperty('--c2-r', `${(CORNER_RADIUS * 100).toFixed(1)}% / ${(CORNER_RADIUS * 70).toFixed(1)}%`);
    this.sparks = new Pool(this.fxEl, 'ar__spark', low ? 24 : 48);
    this.pulses = new Pool(this.fxEl, 'ar__pulse', 6);
    this.ghosts = new Pool(this.cardsEl, 'ar__ghost', 6);
    this.puffs = new Pool(this.fxEl, 'ar__puff', 10);
    for (let i = 0; i < 52; i++) {
      const c = new Card(atlas.cellW, atlas.cellH);
      this.all.push(c);
      this.cardsEl.append(c.el);
      this.draw(c, BACK_INDEX);
    }
    this.layout();
    this.setGlow(null);
    if (!low && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      this.raysAnim = this.raysEl.animate([{transform: 'rotate(0deg)'}, {transform: 'rotate(360deg)'}], {duration: 90000, iterations: Infinity});
    window.addEventListener('resize', () => this.relayout());
    window.visualViewport?.addEventListener('resize', () => this.relayout());
    this.cardsEl.addEventListener('pointerdown', this.down);
    window.addEventListener('pointermove', this.move, {passive: true});
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
  }

  // ───────── tema / deste ─────────

  /** Yeni deste atlası: bütün kartlar (açık/kapalı hâliyle) yeniden çizilir. */
  setAtlas(atlas: CardAtlas): void {
    this.atlas = atlas;
    for (const c of this.all) {
      if (c.cv.width !== atlas.cellW || c.cv.height !== atlas.cellH) {
        c.cv.width = atlas.cellW;
        c.cv.height = atlas.cellH;
      }
      this.draw(c, c.cell);
    }
  }

  /** Masa teması: CSS değişkenleri kök öğeye; boyalı zemin varsa parıltıların altına tuval olarak. */
  setTheme(theme: TableTheme): void {
    for (const k of this.themeVars) this.root.style.removeProperty(k);
    this.themeVars = [];
    for (const [k, v] of Object.entries(theme.vars ?? {})) {
      const key = k.startsWith('--') ? k : '--' + k;
      this.root.style.setProperty(key, v);
      this.themeVars.push(key);
    }
    this.theme = theme;
    this.root.dataset.theme = theme.id;
    if (theme.paint) this.repaint();
    else {
      this.paintTok++;
      this.paintEl?.remove();
      this.paintEl = null;
    }
  }

  private repaint(): void {
    const t = this.theme;
    if (!t?.paint) return;
    const tok = ++this.paintTok;
    const w = this.root.clientWidth || innerWidth, h = this.root.clientHeight || innerHeight;
    const dpr = Math.min(this.low ? 1.5 : 2, window.devicePixelRatio || 1);
    Promise.resolve(t.paint(w, h, dpr)).then(cv => {
      if (tok !== this.paintTok || this.theme !== t) return;
      cv.classList.add('ar__paint');
      if (this.paintEl && this.paintEl !== cv) this.paintEl.replaceWith(cv);
      else if (!this.paintEl) this.root.querySelector('.ar__bg')!.after(cv);
      this.paintEl = cv;
    }, err => console.warn('masa zemini çizilemedi', err));
  }

  // ───────── düzen ─────────
  private layout(): void {
    const W = this.root.clientWidth || innerWidth, H = this.root.clientHeight || innerHeight;
    const cw = Math.round(Math.min(W * 0.215, H * 0.112));
    const ch = Math.round(cw / 0.7);
    const handW = Math.min(W * 0.245, H * 0.138);
    const pileY = H * 0.455;
    const sx = Math.max(cw * 0.6, W * 0.15);
    const hand = {x: W * 0.61, y: H - handW / 0.7 / 2 - Math.max(14, H * 0.022), s: handW / cw, maxW: W * 0.68};
    let seats: SeatGeo[];
    let deck: {x: number; y: number; s: number};
    if (this.n === 2) {
      deck = {x: Math.max(cw * 0.62, W * 0.155), y: pileY, s: 1};
      seats = [
        {fan: {x: hand.x, y: hand.y, a: 0, s: hand.s, spread: 0}, stack: {x: W - sx, y: H * 0.655, s: 0.78, r: 8}, pdir: -1},
        {fan: {x: W / 2, y: H * 0.235, a: 180, s: 0.62, spread: cw * 0.5}, stack: {x: W - sx, y: H * 0.27, s: 0.78, r: -8}, pdir: -1},
      ];
    } else {
      const fs = Math.min(0.56, Math.max(0.46, (H * 0.075) / ch));
      const fh = ch * fs;
      const side = Math.max(fh * 0.36, Math.min(W * 0.1, fh * 0.62));
      const ss = 0.6;
      const sideStackX = Math.max(cw * ss * 0.7, W * 0.12);
      deck = {x: Math.max(cw * 0.7, W * 0.29), y: H * 0.665, s: 0.8};
      seats = [
        {fan: {x: hand.x, y: hand.y, a: 0, s: hand.s, spread: 0}, stack: {x: Math.min(W - cw * 0.6, W * 0.72), y: H * 0.665, s: 0.7, r: 8}, pdir: 1},
        {fan: {x: W - side, y: H * 0.455, a: -90, s: fs, spread: cw * fs * 0.62}, stack: {x: W - sideStackX, y: H * 0.605, s: ss, r: -6}, pdir: -1},
        {fan: {x: W / 2, y: H * 0.2, a: 180, s: fs, spread: cw * fs * 0.62}, stack: {x: Math.min(W - cw * 0.9, W / 2 + cw * 1.45), y: H * 0.2, s: ss, r: 6}, pdir: 1},
        {fan: {x: side, y: H * 0.455, a: 90, s: fs, spread: cw * fs * 0.62}, stack: {x: sideStackX, y: H * 0.605, s: ss, r: 6}, pdir: 1},
      ];
    }
    this.L = {W, H, cw, ch, pile: {x: W / 2, y: pileY}, deck, hand, seats};
    for (const c of this.all) {
      c.el.style.width = cw + 'px';
      c.el.style.height = ch + 'px';
    }
    this.root.style.setProperty('--cw', cw + 'px');
    this.root.style.setProperty('--ch', ch + 'px');
    const rd = cw * 2.25;
    Object.assign(this.ring.style, {width: rd + 'px', height: rd + 'px', left: W / 2 - rd / 2 + 'px', top: pileY - rd / 2 + 'px'});
    for (const g of this.glows.values()) g.style.top = pileY + 'px';
    this.raysEl.style.top = pileY + 'px';
    this.tintEl.style.top = pileY + 'px';
  }

  private relayout(): void {
    this.layout();
    this.deck.forEach((c, i) => this.set(c, this.deckPose(i)));
    this.pile.forEach((c, i) => this.set(c, this.pilePose(i, c.pose)));
    for (let s = 1; s < this.n; s++) this.hands[s].forEach((c, i) => this.set(c, this.fanPose(s, i, this.hands[s].length)));
    this.layoutHand(false);
    for (let s = 0; s < this.n; s++) {
      this.stacks[s].forEach((c, i) => this.set(c, this.stackPose(s, i)));
      this.pistis[s].forEach((c, i) => this.set(c, this.pistiPose(s, i)));
    }
    this.emitDeck();
    clearTimeout(this.paintTimer);
    if (this.theme?.paint) this.paintTimer = window.setTimeout(() => this.repaint(), 250);
  }

  // ───────── çizim / poz ─────────
  private draw(c: Card, cell: number): void {
    c.cell = cell;
    const a = this.atlas, g = c.cv.getContext('2d')!;
    g.clearRect(0, 0, a.cellW, a.cellH);
    g.drawImage(a.canvas, (cell % ATLAS_COLS) * a.cellW, Math.floor(cell / ATLAS_COLS) * a.cellH, a.cellW, a.cellH, 0, 0, a.cellW, a.cellH);
  }

  private set(c: Card, p: Pose, z?: number): void {
    c.anim?.cancel();
    c.anim = null;
    c.pose = {...p};
    c.el.style.transform = tf(p, this.L.cw, this.L.ch);
    if (z !== undefined) c.el.style.zIndex = String(z);
  }

  /**
   * Uçuş: ara karede kalkış (ölçek + yukarı) ile kavis; isteğe bağlı yarıda yüz çevirme, yana bükülme (arc),
   * havada dönüş (spin) ve hayalet iz (trail: renk).
   */
  private fly(c: Card, to: Pose, o: {ms?: number; lift?: number; flip?: number; z?: number; zEnd?: number; delay?: number; ease?: string; arc?: number; spin?: number; trail?: string} = {}): Promise<void> {
    const ms = o.ms ?? 300, lift = o.lift ?? 0.12;
    const from = {...c.pose};
    c.anim?.cancel();
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const arc = (o.arc ?? 0) * dist;
    const spin = o.spin ?? 0;
    const mid: Pose = {
      x: (from.x + to.x) / 2 + (-dy / dist) * arc,
      y: (from.y + to.y) / 2 + (dx / dist) * arc - this.L.ch * lift * 0.6,
      r: (from.r + to.r) / 2 + spin / 2,
      s: ((from.s + to.s) / 2) * (1 + lift),
    };
    const end: Pose = {...to, r: to.r + spin};
    const {cw, ch} = this.L;
    if (o.z !== undefined) c.el.style.zIndex = String(o.z);
    const kf: Keyframe[] = [{transform: tf(from, cw, ch)}, {transform: tf(mid, cw, ch), offset: 0.5}, {transform: tf(end, cw, ch)}];
    const delay = o.delay ?? 0, easing = o.ease ?? EASE_OUT;
    const a = c.el.animate(kf, {duration: ms, delay, easing, fill: 'both'});
    c.anim = a;
    c.pose = {...to};
    if (o.trail) this.trail(kf, ms, delay, easing, o.trail);
    if (o.flip !== undefined) {
      const cell = o.flip;
      c.inn.animate([{transform: 'scaleX(1)'}, {transform: 'scaleX(0)', offset: 0.5}, {transform: 'scaleX(1)'}], {duration: ms * 0.7, delay: delay + ms * 0.1, easing: 'ease-in-out'});
      setTimeout(() => this.draw(c, cell), delay + ms * 0.45);
    }
    return a.finished.then(
      () => {
        if (c.anim !== a) return;
        c.el.style.transform = tf(to, cw, ch);
        a.cancel();
        c.anim = null;
        if (o.zEnd !== undefined) c.el.style.zIndex = String(o.zEnd);
      },
      () => undefined,
    );
  }

  /** Atılan kartın arkasında süzülen hayalet kopyalar: aynı yol, kısa gecikme, sönen opaklık. */
  private trail(kf: Keyframe[], ms: number, delay: number, easing: string, color: string): void {
    const n = this.low ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const g = this.ghosts.get();
      g.style.color = color;
      const pk = [0.5, 0.32, 0.18][i];
      g.animate(kf.map((k, j) => ({...k, opacity: j === 1 ? pk : 0})), {duration: ms, delay: delay + 26 * (i + 1), easing, fill: 'both'})
        .finished.then(() => this.ghosts.hide(g), () => undefined);
    }
  }

  private deckPose(i: number): Pose {
    const d = this.L.deck, k = Math.min(i, 26);
    return {x: d.x - k * 0.12 * d.s, y: d.y - k * 0.42 * d.s, r: -5 + Math.sin(i * 3.7) * 0.8, s: d.s};
  }
  private pilePose(i: number, keep?: Pose): Pose {
    const p = this.L.pile;
    if (keep) return {x: keep.x, y: keep.y, r: keep.r, s: 1};
    return {x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6) - i * 0.3, r: rnd(-20, 20), s: 1};
  }
  /** Kapalı rakip yelpazesi: koltuğun açısına göre döndürülmüş yay; lift > 0 kartı masaya doğru kaldırır. */
  private fanPose(seat: number, i: number, n: number, lift = 0): Pose {
    const f = this.L.seats[seat].fan, k = i - (n - 1) / 2;
    const lx = k * f.spread, ly = k * k * 3 - lift;
    const a = (f.a * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
    // üst koltukta kartlar dik görünsün (deste arkası ters dönmesin)
    const r = f.a === 180 ? k * 7 : f.a + k * 7;
    return {x: f.x + lx * co - ly * si, y: f.y + lx * si + ly * co, r, s: f.s};
  }
  private handPose(i: number, n: number, lift = 0): Pose {
    const h = this.L.hand, w = this.L.cw * h.s;
    const spread = Math.min(w * 0.8, (h.maxW - w) / Math.max(1, n - 1));
    const k = i - (n - 1) / 2;
    return {x: h.x + k * spread, y: h.y + k * k * 4 - lift, r: k * 5, s: h.s};
  }
  private stackPose(seat: number, i: number): Pose {
    const s = this.L.seats[seat].stack, k = Math.min(i, 30);
    return {x: s.x + Math.sin(i * 5.1) * 1.5, y: s.y - k * 0.35, r: s.r + Math.sin(i * 1.7) * 3, s: s.s};
  }
  private pistiPose(seat: number, i: number): Pose {
    const g = this.L.seats[seat], s = g.stack;
    return {x: s.x + g.pdir * (this.L.cw * s.s * 0.5 + i * 12), y: s.y + 6, r: g.pdir * (14 + i * 4), s: s.s * 0.94};
  }

  private emitDeck(): void {
    const d = this.deckPose(this.deck.length - 1);
    this.onDeck(this.deck.length, this.L.deck.x, d.y + (this.L.ch * this.L.deck.s) / 2 + 12);
  }

  /** Ekrandaki noktalar (HUD sayı balonları için) */
  stackPoint(seat: number): {x: number; y: number} {
    const s = this.L.seats[seat].stack;
    return {x: s.x, y: s.y - this.L.ch * s.s * 0.6};
  }
  pilePoint(): {x: number; y: number} {
    return {...this.L.pile};
  }
  /** Koltuğun elinin ortası (efekt çıkış noktası) */
  seatPoint(seat: number): {x: number; y: number} {
    const f = this.L.seats[seat].fan;
    return {x: f.x, y: f.y};
  }

  // ───────── arka plan ─────────
  setGlow(suit: Suit | null): void {
    const k = suit ?? 'N';
    for (const [s, g] of this.glows) g.classList.toggle('is-on', s === k);
    if (suit) this.ring.style.setProperty('--ring', SUIT_COLOR[suit]);
    else this.ring.style.removeProperty('--ring');
  }

  /** Hüzmeler bir an hızlanır, sonra kademeli yavaşlar (pişti, büyük an). */
  boostRays(k = 10, ms = 1200): void {
    const a = this.raysAnim;
    if (!a) return;
    this.raysTimers.forEach(clearTimeout);
    this.raysTimers = [];
    const steps = [1, 0.55, 0.3, 0.14, 0];
    steps.forEach((f, i) => this.raysTimers.push(window.setTimeout(() => a.updatePlaybackRate(1 + (k - 1) * f), (ms * i) / (steps.length - 1))));
  }

  /** Zemine renkli ışık dalgası (yalnız opaklık). */
  tint(color: string, peak = 0.75, ms = 700): void {
    this.tintEl.style.background = `radial-gradient(circle, ${color} 0%, ${color}66 22%, ${color}00 46%)`;
    this.tintEl.animate([{opacity: 0, transform: 'scale(.6)'}, {opacity: peak, transform: 'scale(1)', offset: 0.18}, {opacity: 0, transform: 'scale(1.25)'}],
      {duration: ms, easing: 'cubic-bezier(.2,.7,.3,1)'});
  }

  /** Son el gerilimi: kenarlarda sıcak, yavaş nabız (CSS döngüsü). */
  setTension(on: boolean): void {
    this.root.classList.toggle('is-tense', on);
  }

  /** Yığından dışa saçılan kıvılcımlar (takım renginde). */
  sparkle(color: string, n = 10, power = 1, at?: {x: number; y: number}): void {
    const {x, y} = at ?? this.L.pile, R = this.L.cw * (0.9 + 0.7 * power);
    const cnt = this.low ? Math.ceil(n / 2) : n;
    for (let i = 0; i < cnt; i++) {
      const el = this.sparks.get();
      el.classList.toggle('is-star', i % 3 === 0);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.color = i % 4 === 0 ? '#fff4b0' : color;
      const a = (i / cnt) * Math.PI * 2 + rnd(-0.3, 0.3), d = R * rnd(0.6, 1.15);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.9;
      el.animate([
        {transform: 'translate3d(0,0,0) scale(.4)', opacity: 1},
        {transform: `translate3d(${(dx * 0.75).toFixed(1)}px,${(dy * 0.75).toFixed(1)}px,0) scale(1.1) rotate(90deg)`, opacity: 1, offset: 0.55},
        {transform: `translate3d(${dx.toFixed(1)}px,${(dy + 10).toFixed(1)}px,0) scale(.2) rotate(160deg)`, opacity: 0},
      ], {duration: rnd(420, 640) * (0.8 + 0.4 * power), easing: 'cubic-bezier(.15,.75,.35,1)'}).finished.then(() => this.sparks.hide(el), () => undefined);
    }
  }

  /** Halka dalgası (takım renginde). */
  pulse(color: string, size = 1, at?: {x: number; y: number}): void {
    const el = this.pulses.get();
    const d = this.L.cw * 1.6 * size;
    const p = at ?? this.L.pile;
    Object.assign(el.style, {width: d + 'px', height: d + 'px', left: p.x - d / 2 + 'px', top: p.y - d / 2 + 'px', color});
    el.animate([{transform: 'scale(.55)', opacity: 0.95}, {transform: 'scale(1.45)', opacity: 0}], {duration: 520 + 160 * size, easing: 'cubic-bezier(.15,.7,.3,1)'})
      .finished.then(() => this.pulses.hide(el), () => undefined);
  }

  /** İniş tozu: kartın çevresinden yere yayılan yumuşak bulutçuklar. */
  private dust(p: {x: number; y: number}, k: number): void {
    const n = this.low ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const el = this.puffs.get();
      const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3);
      const R = this.L.cw * (0.55 + 0.3 * k);
      const d = this.L.cw * 0.5;
      Object.assign(el.style, {width: d + 'px', height: d + 'px', left: p.x - d / 2 + Math.cos(a) * R * 0.5 + 'px', top: p.y - d / 2 + Math.sin(a) * R * 0.38 + 'px'});
      el.animate([
        {transform: 'translate3d(0,0,0) scale(.3)', opacity: 0.55},
        {transform: `translate3d(${(Math.cos(a) * R).toFixed(1)}px,${(Math.sin(a) * R * 0.6).toFixed(1)}px,0) scale(1.15)`, opacity: 0},
      ], {duration: rnd(380, 520), easing: 'cubic-bezier(.1,.7,.3,1)'}).finished.then(() => this.puffs.hide(el), () => undefined);
    }
  }

  /** Büyük an: dört renk ışın çarkı + beyaz parlama + hüzme hızlanması + zemin ışığı + sarsıntı + yakınlaşma. */
  impact(kind: 'pisti' | 'jack' | 'big'): void {
    const {pile, cw} = this.L;
    const jack = kind === 'jack';
    const mk = (cls: string, d: number) => {
      const el = document.createElement('i');
      el.className = cls;
      Object.assign(el.style, {width: d + 'px', height: d + 'px', left: pile.x - d / 2 + 'px', top: pile.y - d / 2 + 'px'});
      this.fxEl.append(el);
      return el;
    };
    if (kind !== 'big') {
      const b = mk('ar__burst', cw * (jack ? 6.5 : 5.2));
      done(b.animate([{transform: 'scale(.2) rotate(0deg)', opacity: 0}, {transform: 'scale(1) rotate(40deg)', opacity: 1, offset: 0.22}, {transform: 'scale(1.25) rotate(120deg)', opacity: 0}],
        {duration: jack ? 1500 : 1200, easing: 'cubic-bezier(.2,.7,.3,1)'}), b);
    }
    const bl = mk('ar__bloom', cw * 3.6);
    done(bl.animate([{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1)', opacity: 0.85, offset: 0.18}, {transform: 'scale(1.4)', opacity: 0}],
      {duration: 700, easing: 'ease-out'}), bl);
    this.pulse('#ffe27a', jack ? 2.4 : kind === 'big' ? 1.6 : 2);
    this.sparkle('#ffd23f', jack ? 26 : 20, jack ? 2.4 : kind === 'big' ? 1.5 : 2);
    setTimeout(() => this.pulse('#ffffff', jack ? 1.6 : 1.3), 120);
    if (jack) setTimeout(() => this.pulse('#ff2e4d', 2.8), 240);
    this.tint(jack ? '#ffd23f' : kind === 'big' ? '#7fb2ff' : '#ffe27a', jack ? 0.95 : 0.7, jack ? 1100 : 800);
    this.boostRays(jack ? 16 : 9, jack ? 1800 : 1200);
    this.shake(jack ? 1 : kind === 'big' ? 0.45 : 0.75);
    this.zoomEl.animate([{transform: 'scale(1)'}, {transform: `scale(${jack ? 1.05 : 1.03})`, offset: 0.25}, {transform: 'scale(1)'}],
      {duration: jack ? 700 : 520, easing: 'cubic-bezier(.2,.8,.3,1)'});
    if (jack) setTimeout(() => this.shake(0.6), 650);
  }

  /** "SÜPÜRDÜ!": yığının çevresinde dönen ışık süpürgesi. */
  sweepFx(): void {
    const {pile, cw} = this.L;
    const d = cw * 3.4;
    const el = document.createElement('i');
    el.className = 'ar__sweep';
    Object.assign(el.style, {width: d + 'px', height: d + 'px', left: pile.x - d / 2 + 'px', top: pile.y - d / 2 + 'px'});
    this.fxEl.append(el);
    done(el.animate([{transform: 'rotate(-90deg) scale(.6)', opacity: 0}, {transform: 'rotate(60deg) scale(1)', opacity: 1, offset: 0.3}, {transform: 'rotate(330deg) scale(1.15)', opacity: 0}],
      {duration: 750, easing: 'cubic-bezier(.3,.6,.4,1)'}), el);
  }

  shake(k: number): void {
    const a = 10 * k;
    const kf: Keyframe[] = [];
    for (let i = 0; i <= 8; i++) {
      const f = 1 - i / 8;
      kf.push({transform: i === 8 ? 'none' : `translate3d(${(rnd(-1, 1) * a * f).toFixed(1)}px,${(rnd(-1, 1) * a * f).toFixed(1)}px,0) rotate(${(rnd(-1, 1) * 0.8 * k * f).toFixed(2)}deg)`});
    }
    this.shakeEl.animate(kf, {duration: 420, easing: 'linear'});
  }

  // ───────── el akışı ─────────
  /** Yeni el: kartlar ekran dışına (sol), koltuk sayısına göre yerleşim. */
  reset(seats: 2 | 4 = this.n): void {
    this.n = seats;
    this.stopWiggle();
    this.input = null;
    this.drag = null;
    this.byId.clear();
    this.deck = this.all.slice();
    this.pile = [];
    this.hands = Array.from({length: seats}, () => []);
    this.stacks = Array.from({length: seats}, () => []);
    this.pistis = Array.from({length: seats}, () => []);
    this.hotSet.clear();
    this.layout();
    this.setTension(false);
    this.deck.forEach((c, i) => {
      c.id = -1;
      c.el.classList.remove('is-hand', 'is-hot');
      c.el.classList.add('is-flat');
      c.el.style.opacity = '1';
      this.dropGold(c);
      c.inn.getAnimations().forEach(a => a.cancel());
      if (c.cell !== BACK_INDEX) this.draw(c, BACK_INDEX);
      const p = this.deckPose(i);
      this.set(c, {...p, x: p.x - this.L.W * 0.7, r: p.r - 25}, 100 + i);
    });
    this.setGlow(null);
    this.emitDeck();
  }

  /** Deste dönerek gelir, ikiye ayrılıp harmanlanır, sonra şelale gibi akıp toplanır. */
  async intro(): Promise<void> {
    const n = this.deck.length;
    await Promise.all(this.deck.map((c, i) => this.fly(c, this.deckPose(i), {ms: 380, lift: 0.05, delay: i * 3, ease: 'cubic-bezier(.2,.9,.3,1.12)', spin: 0})));
    this.emitDeck();
    // harman: iki yarım yana açılır, eğilir, birbirine geçer
    const half = n >> 1;
    await Promise.all(this.deck.map((c, i) => {
      const p = this.deckPose(i % half);
      p.x += (i < half ? -1 : 1) * this.L.cw * 0.46;
      p.y -= 6;
      p.r += i < half ? -10 : 10;
      return this.fly(c, p, {ms: 150, lift: 0.02});
    }));
    const order: Card[] = [];
    for (let k = 0; k < half; k++) order.push(this.deck[k], this.deck[k + half]);
    if (n % 2) order.push(this.deck[n - 1]);
    this.deck = order;
    await Promise.all(order.map((c, i) => this.fly(c, this.deckPose(i), {ms: 160, lift: 0.02, delay: i * 2, z: 100 + i})));
    // köprü: üst yarı yay çizerek kalkar ve şelale gibi desteye döner
    const top = this.deck.slice(half);
    const up = this.L.ch * 0.9;
    await Promise.all(top.map((c, j) => {
      const i = half + j;
      const p = this.deckPose(i);
      return this.fly(c, {...p, x: p.x + this.L.cw * 0.25, y: p.y - up * (0.4 + 0.6 * Math.sin((j / top.length) * Math.PI)), r: p.r + 12 - (j / top.length) * 24, s: 1.04}, {ms: 140, lift: 0, delay: j * 3})
        .then(() => this.fly(c, p, {ms: 150, lift: 0, delay: (top.length - j) * 2, ease: 'cubic-bezier(.5,0,.75,0)'}));
    }));
    this.snd.land(0.35);
    const t = this.deck[this.deck.length - 1];
    void t.inn.animate([{transform: 'translateY(-3px)'}, {transform: 'none'}], {duration: 120, easing: 'ease-out'});
  }

  async dealTable(cards: CardId[], faceUp: boolean[]): Promise<void> {
    for (let k = 0; k < cards.length; k++) {
      const c = this.deck.pop()!;
      c.el.classList.remove('is-flat');
      c.id = cards[k];
      this.byId.set(c.id, c);
      this.pile.push(c);
      this.snd.deal();
      const to = {x: this.L.pile.x + rnd(-5, 5), y: this.L.pile.y + rnd(-5, 5) - k * 0.3, r: faceUp[k] ? rnd(-8, 8) : rnd(-24, 24), s: 1};
      const f = this.fly(c, to, {ms: 300, lift: 0.18, flip: faceUp[k] ? c.id : undefined, z: 950, zEnd: 300 + this.pile.length, spin: k % 2 ? 180 : -180});
      this.emitDeck();
      if (k === cards.length - 1) {
        await f;
        this.landFx(c, 0.6);
        this.setGlow(suitOf(c.id));
      } else await sleep(85);
    }
  }

  /** Eller: desteden fiskeyle, dönerek; insanın kartları havada açılır. */
  async dealHands(deals: {seat: number; card: CardId}[]): Promise<void> {
    const fl: Promise<void>[] = [];
    const cnt = new Array<number>(this.n).fill(0);
    for (const d of deals) cnt[d.seat]++;
    const gap = this.n === 4 ? 48 : 64;
    for (const d of deals) {
      const c = this.deck.pop()!;
      c.el.classList.remove('is-flat');
      c.id = d.card;
      this.byId.set(c.id, c);
      this.hands[d.seat].push(c);
      const i = this.hands[d.seat].length - 1;
      this.snd.deal();
      // fiske: kart desteden hafifçe kalkıp döner, sonra hedefe süzülür
      void c.inn.animate([{transform: 'translateY(0) rotate(0deg)'}, {transform: 'translateY(-6px) rotate(-8deg)', offset: 0.2}, {transform: 'none'}], {duration: 200, easing: 'ease-out'});
      const spin = d.seat === 0 ? 360 : (d.seat % 2 ? -1 : 1) * 360;
      if (d.seat === 0) {
        c.el.classList.add('is-hand');
        fl.push(this.fly(c, this.handPose(i, cnt[0]), {ms: 360, lift: 0.22, flip: c.id, z: 950, zEnd: 500 + i, spin}));
      } else fl.push(this.fly(c, this.fanPose(d.seat, i, cnt[d.seat]), {ms: 320, lift: 0.1, z: 950, zEnd: 400 + d.seat * 10 + i, spin: spin * 0.5}));
      this.emitDeck();
      await sleep(gap);
    }
    await Promise.all(fl);
  }

  private layoutHand(animate = true): void {
    const h = this.hands[0], n = h.length;
    h.forEach((c, i) => {
      if (this.drag?.card === c) return;
      const p = this.handPose(i, n);
      c.el.style.zIndex = String(500 + i);
      if (animate) void this.fly(c, p, {ms: 220, lift: 0});
      else this.set(c, p);
    });
  }

  /** Oyuncunun sırası: alan kartlar parlar; dokunma/sürükleme ile seçilen kart döner. */
  waitPlayer(hot: CardId[]): {card: Promise<CardId>; cancel(): void} {
    this.hotSet = new Set(hot);
    for (const c of this.hands[0]) c.el.classList.toggle('is-hot', this.hotSet.has(c.id));
    // sıra gelince el hafifçe kalkar
    this.hands[0].forEach((c, i) => void this.fly(c, this.handPose(i, this.hands[0].length, 8), {ms: 200, lift: 0}));
    let cancel = () => {};
    const card = new Promise<CardId>(res => {
      this.input = {res};
      cancel = () => {
        this.input = null;
        this.clearHot();
        res(-1);
      };
    });
    return {card, cancel};
  }

  /** Otomatik oyun / test: seçimi dışarıdan yap. */
  pick(card: CardId): void {
    const i = this.input;
    if (!i) return;
    this.input = null;
    this.clearHot();
    i.res(card);
  }

  private clearHot(): void {
    this.stopWiggle();
    for (const c of this.hands[0]) c.el.classList.remove('is-hot');
  }

  /** Boşta ipucu: en iyi alan kart kıpırdar (sıra sende, uzun düşünüyorsun). */
  wiggle(card: CardId): void {
    const c = this.byId.get(card);
    if (!c || !this.hands[0].includes(c) || !this.input) return;
    this.stopWiggle();
    const a = c.inn.animate([
      {transform: 'none'},
      {transform: 'translateY(-10px) rotate(-7deg) scale(1.04)', offset: 0.1},
      {transform: 'translateY(-10px) rotate(6deg) scale(1.04)', offset: 0.2},
      {transform: 'translateY(-8px) rotate(-4deg) scale(1.03)', offset: 0.3},
      {transform: 'translateY(-4px) rotate(2deg)', offset: 0.4},
      {transform: 'none', offset: 0.5},
      {transform: 'none'},
    ], {duration: 1500, iterations: Infinity, easing: 'ease-in-out'});
    c.el.classList.add('is-hot');
    this.wig = {card: c, a};
  }

  stopWiggle(): void {
    this.wig?.a.cancel();
    this.wig = null;
  }

  private handCardAt(t: EventTarget | null): Card | null {
    const el = (t as Element | null)?.closest?.('.c2');
    return this.hands[0].find(c => c.el === el) ?? null;
  }

  private down = (e: PointerEvent) => {
    if (!this.input || this.drag) return;
    const c = this.handCardAt(e.target);
    if (!c) return;
    this.drag = {card: c, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, dx: 0, dy: 0};
    c.el.style.zIndex = '960';
    void this.fly(c, {...c.pose, y: c.pose.y - 14, s: c.pose.s * 1.06}, {ms: 120, lift: 0});
    this.snd.slide();
  };

  private move = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    d.dx = e.clientX - d.x0;
    d.dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(d.dx, d.dy) > 9) d.moved = true;
    if (d.moved) {
      const i = this.hands[0].indexOf(d.card);
      const base = this.handPose(i, this.hands[0].length);
      this.set(d.card, {x: base.x + d.dx, y: base.y + d.dy, r: base.r * Math.max(0, 1 + d.dy / 120), s: base.s * 1.08});
    }
  };

  private up = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    const play = !d.moved || d.dy < -46 || e.clientY < this.L.H * 0.66;
    if (play && this.input) {
      const r = this.input.res;
      this.input = null;
      this.clearHot();
      r(d.card.id);
    } else this.layoutHand(true);
  };

  /** Rakip düşünürken bir kartı masaya doğru hafifçe kaldırıp indirir. */
  async think(seat: number, ms: number): Promise<void> {
    const h = this.hands[seat] ?? [];
    const t0 = performance.now();
    if (h.length > 1 && ms > 380) {
      const c = h[Math.floor(Math.random() * h.length)];
      const i = h.indexOf(c);
      await this.fly(c, this.fanPose(seat, i, h.length, 14), {ms: 140, lift: 0});
      await sleep(Math.min(240, ms * 0.3));
      if (h.includes(c)) await this.fly(c, this.fanPose(seat, h.indexOf(c), h.length), {ms: 140, lift: 0});
    }
    const left = ms - (performance.now() - t0);
    if (left > 0) await sleep(left);
  }

  /** Kartı yığına at (hayalet izle). İner inmez çözülür. */
  async play(seat: number, card: CardId): Promise<void> {
    const c = this.byId.get(card)!;
    const list = this.hands[seat];
    list.splice(list.indexOf(c), 1);
    c.el.classList.remove('is-hand', 'is-hot');
    this.stopWiggle();
    const under = this.pile[this.pile.length - 1];
    this.pile.push(c);
    const to = this.pilePose(this.pile.length);
    const jack = isJack(card);
    this.snd.whoosh(seat === 0 ? 0.75 : 0.55);
    if (seat === 0) this.layoutHand(true);
    else list.forEach((x, i) => void this.fly(x, this.fanPose(seat, i, list.length), {ms: 220, lift: 0}));
    await this.fly(c, to, {ms: seat === 0 ? 250 : 320, lift: 0.22, flip: seat === 0 ? undefined : card, z: 960, zEnd: 300 + this.pile.length,
      ease: 'cubic-bezier(.25,.6,.3,1)', trail: SUIT_COLOR[suitOf(card)], spin: seat === 0 ? 0 : seat % 2 ? 180 : 0});
    this.snd.land(jack ? 0.95 : 0.7);
    this.landFx(c, jack ? 1.3 : 0.85);
    // alttaki kart çarpmanın etkisiyle hafifçe itilir
    if (under) {
      const ax = rnd(-1, 1) * 4, ay = rnd(0.4, 1) * 4;
      void under.inn.animate([{transform: 'none'}, {transform: `translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px) rotate(${(ax * 0.6).toFixed(1)}deg)`, offset: 0.3}, {transform: 'none'}], {duration: 260, easing: 'ease-out'});
    }
    if (jack) this.shake(0.25);
    this.setGlow(suitOf(card));
  }

  /** İniş: ezilip sekme + takım renginde halka + kıvılcım + toz. */
  private landFx(c: Card, k: number): void {
    const col = SUIT_COLOR[suitOf(c.id)];
    void c.inn.animate([{transform: 'scale(1.12)'}, {transform: 'scale(.95,1.04)', offset: 0.45}, {transform: 'scale(1.02,.99)', offset: 0.75}, {transform: 'none'}],
      {duration: 240, easing: 'ease-out'});
    this.pulse(col, k);
    this.sparkle(col, Math.round(8 * k + 2), k * 0.9);
    this.dust(c.pose, k);
  }

  /**
   * Değerli kartlar (♦10, ♣2, As, Vale) yığından havalanır, altın parlar (kapalıysa açılır).
   * Ekran noktaları ve puanları döner (HUD "+3" baloncukları için).
   */
  async showValuables(cards: CardId[]): Promise<{x: number; y: number; pts: number; id: CardId}[]> {
    const vals = cards.map(id => ({id, pts: cardPoints(id), c: this.byId.get(id)})).filter(v => v.pts > 0 && v.c && this.pile.includes(v.c));
    if (!vals.length) return [];
    const m = vals.length;
    const {pile, cw, ch} = this.L;
    const out: {x: number; y: number; pts: number; id: CardId}[] = [];
    const gap = Math.min(cw * 0.78, (this.L.W * 0.8) / Math.max(1, m));
    await Promise.all(vals.map((v, j) => {
      const c = v.c!;
      const to: Pose = {x: pile.x + (j - (m - 1) / 2) * gap, y: pile.y - ch * 0.32, r: (j - (m - 1) / 2) * 6, s: 1.1};
      out.push({x: to.x, y: to.y - ch * 0.55, pts: v.pts, id: v.id});
      const flip = c.cell === BACK_INDEX ? c.id : undefined;
      this.addGold(c, 70 * j + 120);
      return this.fly(c, to, {ms: 200, lift: 0.1, delay: 70 * j, flip, z: 945 + j});
    }));
    return out;
  }

  private addGold(c: Card, delay: number): void {
    let g = this.golds.find(x => !x.isConnected);
    if (!g) {
      g = document.createElement('i');
      g.className = 'c2__gold';
      g.innerHTML = '<b></b>';
      this.golds.push(g);
    }
    c.gold = g;
    c.inn.append(g);
    g.animate([{opacity: 0}, {opacity: 1, offset: 0.3}, {opacity: 0.85}], {duration: 380, delay, fill: 'both', easing: 'ease-out'});
    (g.firstElementChild as HTMLElement).animate([{transform: 'translateX(-130%) skewX(-18deg)'}, {transform: 'translateX(230%) skewX(-18deg)'}],
      {duration: 520, delay: delay + 60, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both'});
  }

  private dropGold(c: Card): void {
    if (!c.gold) return;
    c.gold.getAnimations().forEach(a => a.cancel());
    (c.gold.firstElementChild as HTMLElement).getAnimations().forEach(a => a.cancel());
    c.gold.remove();
    c.gold = null;
  }

  /**
   * Yığını topla: kartlar önce ortada toplanır, sonra yay çizerek sırayla oyuncunun destesine süzülür
   * (her varışta onArrive). Pişti kartı açık olarak yanına dizilir.
   */
  async collect(seat: number, pistiCard: CardId | null, onArrive?: (i: number, total: number) => void): Promise<void> {
    const list = this.pile;
    this.pile = [];
    const st = this.stacks[seat];
    const {pile} = this.L;
    // 1) toplanma: kartlar yığın merkezine sıkışır
    await Promise.all(list.map((c, k) => this.fly(c, {x: pile.x + (c.pose.x - pile.x) * 0.15, y: pile.y + (c.pose.y - pile.y) * 0.15 - k * 0.4, r: c.pose.r * 0.3, s: c.pose.s > 1 ? 1.04 : 1}, {ms: 110, lift: 0})));
    this.snd.whoosh(0.5 + Math.min(0.4, list.length * 0.04));
    const fl: Promise<void>[] = [];
    const total = list.length;
    let arrived = 0;
    const side = this.L.seats[seat].stack.x > pile.x ? -1 : 1;
    const step = Math.max(18, Math.min(36, 420 / Math.max(1, total)));
    list.forEach((c, k) => {
      const z = 950 + (total - k);
      let f: Promise<void>;
      if (pistiCard !== null && c.id === pistiCard) {
        const row = this.pistis[seat];
        row.push(c);
        f = this.fly(c, this.pistiPose(seat, row.length - 1), {ms: 440, lift: 0.14, delay: k * step, z, zEnd: 190 + row.length, arc: 0.18 * side});
      } else {
        st.push(c);
        const i = st.length - 1;
        f = this.fly(c, this.stackPose(seat, i), {ms: 400, lift: 0.1, delay: k * step, flip: c.cell === BACK_INDEX ? undefined : BACK_INDEX, z, zEnd: 200 + i,
          arc: 0.22 * side, ease: 'cubic-bezier(.45,.05,.3,1)'});
      }
      fl.push(f.then(() => {
        this.dropGold(c);
        onArrive?.(arrived++, total);
      }));
    });
    this.setGlow(null);
    await Promise.all(fl);
    for (const c of st) c.el.classList.add('is-flat');
    // deste "yuttu" hissi: üst kart hafifçe zıplar
    const top = st[st.length - 1];
    if (top) void top.inn.animate([{transform: 'scale(1.14)'}, {transform: 'none'}], {duration: 240, easing: 'cubic-bezier(.3,1.6,.5,1)'});
    const sp = this.stackPoint(seat);
    this.pulse('#ffffff', 0.55, {x: sp.x, y: sp.y + this.L.ch * this.L.seats[seat].stack.s * 0.6});
  }

  /** Oyuncu elindeki alan kartlar (yardım parıltısı için). */
  static capturing(hand: CardId[], top: CardId | null, pileCount: number): CardId[] {
    if (top === null || pileCount === 0) return [];
    return hand.filter(c => isJack(c) || rankOf(c) === rankOf(top));
  }

  /** Boşta ipucu için en iyi alan kart: önce pişti/aynı değer (değerliyse daha iyi), yoksa Vale. */
  static bestCapture(hand: CardId[], top: CardId | null, pileCount: number): CardId | null {
    const cap = Table2D.capturing(hand, top, pileCount);
    if (!cap.length || top === null) return null;
    const same = cap.filter(c => rankOf(c) === rankOf(top));
    const pool = same.length ? same : cap;
    return pool.slice().sort((a, b) => cardPoints(a) - cardPoints(b))[0];
  }
}

/** Arka plan için düşük kontrastlı takım işareti deseni (SVG). */
function patternUrl(): string {
  const S = (d: string, x: number, y: number, r: number) => `<path d="${d}" transform="translate(${x} ${y}) rotate(${r}) scale(.9)" fill="#fff"/>`;
  const heart = 'M0 6 C-9 -1 -7 -9 0 -4 C7 -9 9 -1 0 6Z';
  const diamond = 'M0 -8 L6 0 L0 8 L-6 0Z';
  const spade = 'M0 -8 C8 -1 7 6 1 3 L2 8 L-2 8 L-1 3 C-7 6 -8 -1 0 -8Z';
  const club = 'M0 -8a3.4 3.4 0 1 1 0 .01M-4.5 -1a3.4 3.4 0 1 1 0 .01M4.5 -1a3.4 3.4 0 1 1 0 .01M-1.2 1L-2 8H2L1.2 1Z';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">${S(heart, 20, 22, -12)}${S(diamond, 70, 26, 10)}${S(spade, 46, 64, 8)}${S(club, 86, 78, -10)}${S(club, 10, 74, 14)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
