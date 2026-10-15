// Pişti Arena — 2B masa: arka plan, kart katmanı, dokunmatik el, uçuşlar ve masa efektleri.
// Tüm hareket WAAPI ile transform/opacity üzerinden (bileşimci iş parçacığında akar; ana iş parçacığı meşgulken bile akıcı).
// Kart yüzleri atlas tuvalinden her kartın kendi küçük tuvaline bir kez kopyalanır (kodlama/indirme yok).
import './table.css';
import {ATLAS_COLS, BACK_INDEX, CORNER_RADIUS, type CardAtlas} from '../render/cardAtlas';
import {isJack, rankOf, suitOf, type CardId, type Suit} from '../core/types';

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
  readonly cv: HTMLCanvasElement;
  readonly hot: HTMLElement;
  id: CardId = -1;
  cell = BACK_INDEX;
  pose: Pose = {x: 0, y: 0, r: 0, s: 1};
  anim: Animation | null = null;
  constructor(w: number, h: number) {
    this.el = document.createElement('div');
    this.el.className = 'c2';
    this.cv = document.createElement('canvas');
    this.cv.className = 'c2__f';
    this.cv.width = w;
    this.cv.height = h;
    this.hot = document.createElement('i');
    this.hot.className = 'c2__hot';
    this.el.append(this.hot, this.cv);
  }
}

const tf = (p: Pose, cw: number, ch: number) =>
  `translate3d(${(p.x - cw / 2).toFixed(1)}px,${(p.y - ch / 2).toFixed(1)}px,0) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const SUIT_COLOR: Record<Suit, string> = {H: '#ff2e4d', D: '#ffb400', C: '#16c45b', S: '#1f7bff'};
const EASE_OUT = 'cubic-bezier(.2,.75,.25,1)';

interface Layout {
  W: number;
  H: number;
  cw: number;
  ch: number;
  pile: {x: number; y: number};
  deck: {x: number; y: number};
  opp: {x: number; y: number; s: number; spread: number};
  hand: {x: number; y: number; s: number; maxW: number};
  stacks: {x: number; y: number; s: number; r: number}[];
}

export class Table2D {
  readonly root: HTMLDivElement;
  private shakeEl: HTMLDivElement;
  private cardsEl: HTMLDivElement;
  private fxEl: HTMLDivElement;
  private ring: HTMLDivElement;
  private glows = new Map<string, HTMLElement>();
  private all: Card[] = [];
  private byId = new Map<CardId, Card>();
  deck: Card[] = [];
  pile: Card[] = [];
  hands: Card[][] = [[], []];
  stacks: Card[][] = [[], []];
  pistis: Card[][] = [[], []];
  L!: Layout;
  private hotSet = new Set<CardId>();
  private input: {res: (c: CardId) => void} | null = null;
  private drag: {card: Card; id: number; x0: number; y0: number; moved: boolean; dx: number; dy: number} | null = null;
  /** Deste/yığın değişince HUD'a haber ver (deste rozetinin yeri) */
  onDeck: (count: number, x: number, y: number) => void = () => {};

  constructor(host: HTMLElement, private atlas: CardAtlas, private snd: TableSounds, low: boolean) {
    this.root = document.createElement('div');
    this.root.className = 'ar' + (low ? ' is-low' : '');
    this.root.innerHTML = `<div class="ar__bg"></div>
      ${['N', 'H', 'D', 'C', 'S'].map(s => `<div class="ar__glow" data-s="${s}"></div>`).join('')}
      <div class="ar__rays"></div><div class="ar__pattern"></div><div class="ar__vig"></div>
      <div class="ar__shake"><div class="ar__ring"><i></i></div><div class="ar__cards"></div><div class="ar__fx"></div></div>`;
    host.append(this.root);
    this.shakeEl = this.root.querySelector('.ar__shake')!;
    this.cardsEl = this.root.querySelector('.ar__cards')!;
    this.fxEl = this.root.querySelector('.ar__fx')!;
    this.ring = this.root.querySelector('.ar__ring')!;
    this.root.querySelectorAll<HTMLElement>('.ar__glow').forEach(g => this.glows.set(g.dataset.s!, g));
    (this.root.querySelector('.ar__pattern') as HTMLElement).style.backgroundImage = patternUrl();
    this.root.style.setProperty('--c2-r', `${(CORNER_RADIUS * 100).toFixed(1)}% / ${(CORNER_RADIUS * 70).toFixed(1)}%`);
    for (let i = 0; i < 52; i++) {
      const c = new Card(atlas.cellW, atlas.cellH);
      this.all.push(c);
      this.cardsEl.append(c.el);
      this.draw(c, BACK_INDEX);
    }
    this.layout();
    this.setGlow(null);
    window.addEventListener('resize', () => this.relayout());
    window.visualViewport?.addEventListener('resize', () => this.relayout());
    this.cardsEl.addEventListener('pointerdown', this.down);
    window.addEventListener('pointermove', this.move, {passive: true});
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
  }

  // ───────── düzen ─────────
  private layout(): void {
    const W = this.root.clientWidth || innerWidth, H = this.root.clientHeight || innerHeight;
    const cw = Math.round(Math.min(W * 0.215, H * 0.112));
    const ch = Math.round(cw / 0.7);
    const handW = Math.min(W * 0.245, H * 0.138);
    const pileY = H * 0.455;
    this.L = {
      W, H, cw, ch,
      pile: {x: W / 2, y: pileY},
      deck: {x: Math.max(cw * 0.62, W * 0.155), y: pileY},
      opp: {x: W / 2, y: H * 0.235, s: 0.62, spread: cw * 0.5},
      hand: {x: W * 0.585, y: H - handW / 0.7 / 2 - Math.max(14, H * 0.022), s: handW / cw, maxW: W * 0.74},
      stacks: [
        {x: W - Math.max(cw * 0.6, W * 0.15), y: H * 0.655, s: 0.78, r: 8},
        {x: W - Math.max(cw * 0.6, W * 0.15), y: H * 0.27, s: 0.78, r: -8},
      ],
    };
    for (const c of this.all) {
      c.el.style.width = cw + 'px';
      c.el.style.height = ch + 'px';
    }
    const rd = cw * 2.25;
    Object.assign(this.ring.style, {width: rd + 'px', height: rd + 'px', left: W / 2 - rd / 2 + 'px', top: pileY - rd / 2 + 'px'});
    for (const g of this.glows.values()) g.style.top = pileY + 'px';
    (this.root.querySelector('.ar__rays') as HTMLElement).style.top = pileY + 'px';
  }

  private relayout(): void {
    this.layout();
    this.deck.forEach((c, i) => this.set(c, this.deckPose(i)));
    this.pile.forEach((c, i) => this.set(c, this.pilePose(i, c.pose)));
    this.hands[1].forEach((c, i) => this.set(c, this.oppPose(i, this.hands[1].length)));
    this.layoutHand(false);
    for (const s of [0, 1]) {
      this.stacks[s].forEach((c, i) => this.set(c, this.stackPose(s, i)));
      this.pistis[s].forEach((c, i) => this.set(c, this.pistiPose(s, i)));
    }
    this.emitDeck();
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

  /** Uçuş: ara karede kalkış (ölçek + yukarı) ile kavis; isteğe bağlı yarıda yüz çevirme. */
  private fly(c: Card, to: Pose, o: {ms?: number; lift?: number; flip?: number; z?: number; zEnd?: number; delay?: number; ease?: string} = {}): Promise<void> {
    const ms = o.ms ?? 300, lift = o.lift ?? 0.12;
    const from = {...c.pose};
    c.anim?.cancel();
    const mid: Pose = {x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - this.L.ch * lift * 0.6, r: (from.r + to.r) / 2, s: ((from.s + to.s) / 2) * (1 + lift)};
    const {cw, ch} = this.L;
    if (o.z !== undefined) c.el.style.zIndex = String(o.z);
    const a = c.el.animate([{transform: tf(from, cw, ch)}, {transform: tf(mid, cw, ch), offset: 0.5}, {transform: tf(to, cw, ch)}],
      {duration: ms, delay: o.delay ?? 0, easing: o.ease ?? EASE_OUT, fill: 'both'});
    c.anim = a;
    c.pose = {...to};
    if (o.flip !== undefined) {
      const cell = o.flip, d = o.delay ?? 0;
      c.cv.animate([{transform: 'scaleX(1)'}, {transform: 'scaleX(0)', offset: 0.5}, {transform: 'scaleX(1)'}], {duration: ms * 0.7, delay: d + ms * 0.1, easing: 'ease-in-out'});
      setTimeout(() => this.draw(c, cell), d + ms * 0.45);
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

  private deckPose(i: number): Pose {
    const d = this.L.deck, k = Math.min(i, 26);
    return {x: d.x - k * 0.12, y: d.y - k * 0.42, r: -5 + Math.sin(i * 3.7) * 0.8, s: 1};
  }
  private pilePose(i: number, keep?: Pose): Pose {
    const p = this.L.pile;
    if (keep) return {x: p.x + (keep.x - p.x), y: p.y + (keep.y - p.y), r: keep.r, s: 1};
    return {x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6) - i * 0.3, r: rnd(-20, 20), s: 1};
  }
  private oppPose(i: number, n: number): Pose {
    const o = this.L.opp, k = i - (n - 1) / 2;
    return {x: o.x + k * o.spread, y: o.y - Math.abs(k) * 3, r: k * 7, s: o.s};
  }
  private handPose(i: number, n: number, lift = 0): Pose {
    const h = this.L.hand, w = this.L.cw * h.s;
    const spread = Math.min(w * 0.8, (h.maxW - w) / Math.max(1, n - 1));
    const k = i - (n - 1) / 2;
    return {x: h.x + k * spread, y: h.y + k * k * 4 - lift, r: k * 5, s: h.s};
  }
  private stackPose(seat: number, i: number): Pose {
    const s = this.L.stacks[seat], k = Math.min(i, 30);
    return {x: s.x + Math.sin(i * 5.1) * 1.5, y: s.y - k * 0.35, r: s.r + Math.sin(i * 1.7) * 3, s: s.s};
  }
  private pistiPose(seat: number, i: number): Pose {
    const s = this.L.stacks[seat];
    return {x: s.x - this.L.cw * s.s * 0.5 - i * 12, y: s.y + 6, r: -14 - i * 4, s: s.s * 0.94};
  }

  private emitDeck(): void {
    const d = this.deckPose(this.deck.length - 1);
    this.onDeck(this.deck.length, this.L.deck.x, d.y + this.L.ch / 2 + 12);
  }

  /** Ekrandaki noktalar (HUD sayı balonları için) */
  stackPoint(seat: number): {x: number; y: number} {
    const s = this.L.stacks[seat];
    return {x: s.x, y: s.y - this.L.ch * s.s * 0.6};
  }
  pilePoint(): {x: number; y: number} {
    return {...this.L.pile};
  }

  // ───────── arka plan ─────────
  setGlow(suit: Suit | null): void {
    const k = suit ?? 'N';
    for (const [s, g] of this.glows) g.classList.toggle('is-on', s === k);
    this.ring.style.setProperty('--ring', suit ? SUIT_COLOR[suit] : 'rgba(160,180,255,.5)');
  }

  /** Yığından dışa saçılan kıvılcımlar (takım renginde). */
  sparkle(color: string, n = 10, power = 1): void {
    const {x, y} = this.L.pile, R = this.L.cw * (0.9 + 0.7 * power);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'ar__spark' + (i % 3 === 0 ? ' is-star' : '');
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.color = i % 4 === 0 ? '#fff4b0' : color;
      this.fxEl.append(el);
      const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), d = R * rnd(0.6, 1.15);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.9;
      el.animate([
        {transform: 'translate3d(0,0,0) scale(.4)', opacity: 1},
        {transform: `translate3d(${(dx * 0.75).toFixed(1)}px,${(dy * 0.75).toFixed(1)}px,0) scale(1.1) rotate(90deg)`, opacity: 1, offset: 0.55},
        {transform: `translate3d(${dx.toFixed(1)}px,${(dy + 10).toFixed(1)}px,0) scale(.2) rotate(160deg)`, opacity: 0},
      ], {duration: rnd(420, 640) * (0.8 + 0.4 * power), easing: 'cubic-bezier(.15,.75,.35,1)'}).finished.then(() => el.remove(), () => el.remove());
    }
  }

  /** Yığına iniş halkası (takım renginde). */
  pulse(color: string, size = 1): void {
    const el = document.createElement('i');
    el.className = 'ar__pulse';
    const d = this.L.cw * 1.6 * size;
    Object.assign(el.style, {width: d + 'px', height: d + 'px', left: this.L.pile.x - d / 2 + 'px', top: this.L.pile.y - d / 2 + 'px', color});
    this.fxEl.append(el);
    el.animate([{transform: 'scale(.55)', opacity: 0.95}, {transform: 'scale(1.45)', opacity: 0}], {duration: 520 + 160 * size, easing: 'cubic-bezier(.15,.7,.3,1)'}).finished.then(() => el.remove(), () => el.remove());
  }

  /** Pişti patlaması: dört renk ışın çarkı + beyaz parlama + sarsıntı. */
  burst(jack: boolean): void {
    const {pile, cw} = this.L;
    const mk = (cls: string, d: number) => {
      const el = document.createElement('i');
      el.className = cls;
      Object.assign(el.style, {width: d + 'px', height: d + 'px', left: pile.x - d / 2 + 'px', top: pile.y - d / 2 + 'px'});
      this.fxEl.append(el);
      return el;
    };
    const b = mk('ar__burst', cw * (jack ? 6.5 : 5.2));
    b.animate([{transform: 'scale(.2) rotate(0deg)', opacity: 0}, {transform: 'scale(1) rotate(40deg)', opacity: 1, offset: 0.22}, {transform: 'scale(1.25) rotate(120deg)', opacity: 0}],
      {duration: jack ? 1500 : 1200, easing: 'cubic-bezier(.2,.7,.3,1)'}).finished.then(() => b.remove(), () => b.remove());
    const bl = mk('ar__bloom', cw * 3.6);
    bl.animate([{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1)', opacity: 0.85, offset: 0.18}, {transform: 'scale(1.4)', opacity: 0}],
      {duration: 700, easing: 'ease-out'}).finished.then(() => bl.remove(), () => bl.remove());
    this.pulse('#ffe27a', jack ? 2.4 : 2);
    this.sparkle('#ffd23f', jack ? 26 : 20, jack ? 2.4 : 2);
    setTimeout(() => this.pulse('#ffffff', jack ? 1.6 : 1.3), 120);
    this.shake(jack ? 1 : 0.75);
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
  reset(): void {
    this.byId.clear();
    this.deck = this.all.slice();
    this.pile = [];
    this.hands = [[], []];
    this.stacks = [[], []];
    this.pistis = [[], []];
    this.hotSet.clear();
    this.deck.forEach((c, i) => {
      c.id = -1;
      c.el.classList.remove('is-hand', 'is-hot', 'is-flat');
      c.el.style.opacity = '1';
      if (c.cell !== BACK_INDEX) this.draw(c, BACK_INDEX);
      this.set(c, {...this.deckPose(i), x: this.deckPose(i).x - this.L.W * 0.6}, 100 + i);
    });
    this.setGlow(null);
    this.emitDeck();
  }

  /** Deste soldan kayarak gelir, ikiye ayrılıp karışır. */
  async intro(): Promise<void> {
    await Promise.all(this.deck.map((c, i) => this.fly(c, this.deckPose(i), {ms: 420, lift: 0.04, delay: i * 4, ease: 'cubic-bezier(.2,.9,.3,1.1)'})));
    this.emitDeck();
    for (let r = 0; r < 2; r++) {
      const n = this.deck.length, half = n >> 1;
      await Promise.all(this.deck.map((c, i) => {
        const p = this.deckPose(i % half);
        p.x += (i < half ? -1 : 1) * this.L.cw * 0.42;
        p.r += i < half ? -8 : 8;
        return this.fly(c, p, {ms: 170, lift: 0.02});
      }));
      const order: Card[] = [];
      for (let k = 0; k < half; k++) order.push(this.deck[k], this.deck[k + half]);
      if (n % 2) order.push(this.deck[n - 1]);
      this.deck = order;
      await Promise.all(order.map((c, i) => this.fly(c, this.deckPose(i), {ms: 170, lift: 0.02, delay: i * 2, z: 100 + i})));
    }
  }

  async dealTable(cards: CardId[], faceUp: boolean[]): Promise<void> {
    for (let k = 0; k < cards.length; k++) {
      const c = this.deck.pop()!;
      c.id = cards[k];
      this.byId.set(c.id, c);
      this.pile.push(c);
      this.snd.deal();
      const to = {x: this.L.pile.x + rnd(-5, 5), y: this.L.pile.y + rnd(-5, 5) - k * 0.3, r: faceUp[k] ? rnd(-8, 8) : rnd(-24, 24), s: 1};
      const f = this.fly(c, to, {ms: 300, lift: 0.18, flip: faceUp[k] ? c.id : undefined, z: 950, zEnd: 300 + this.pile.length});
      this.emitDeck();
      if (k === cards.length - 1) {
        await f;
        this.pulse(SUIT_COLOR[suitOf(c.id)], 0.8);
        this.setGlow(suitOf(c.id));
      } else await sleep(110);
    }
  }

  async dealHands(deals: {seat: number; card: CardId}[]): Promise<void> {
    const fl: Promise<void>[] = [];
    const n = [0, 0];
    for (const d of deals) n[d.seat]++;
    for (const d of deals) {
      const c = this.deck.pop()!;
      c.id = d.card;
      this.byId.set(c.id, c);
      this.hands[d.seat].push(c);
      const i = this.hands[d.seat].length - 1;
      this.snd.deal();
      if (d.seat === 0) {
        c.el.classList.add('is-hand');
        fl.push(this.fly(c, this.handPose(i, n[0]), {ms: 340, lift: 0.2, flip: c.id, z: 950, zEnd: 500 + i}));
      } else fl.push(this.fly(c, this.oppPose(i, n[1]), {ms: 300, lift: 0.1, z: 950, zEnd: 400 + i}));
      this.emitDeck();
      await sleep(70);
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
    for (const c of this.hands[0]) c.el.classList.remove('is-hot');
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

  /** Rakip düşünürken bir kartı hafifçe kaldırıp indirir. */
  async think(ms: number): Promise<void> {
    const h = this.hands[1];
    const t0 = performance.now();
    if (h.length > 1 && ms > 380) {
      const c = h[Math.floor(Math.random() * h.length)];
      const i = h.indexOf(c);
      const base = this.oppPose(i, h.length);
      await this.fly(c, {...base, y: base.y + 12, s: base.s * 1.06}, {ms: 140, lift: 0});
      await sleep(Math.min(260, ms * 0.3));
      if (h.includes(c)) await this.fly(c, this.oppPose(h.indexOf(c), h.length), {ms: 140, lift: 0});
    }
    const left = ms - (performance.now() - t0);
    if (left > 0) await sleep(left);
  }

  /** Kartı yığına at. İner inmez çözülür. */
  async play(seat: number, card: CardId): Promise<void> {
    const c = this.byId.get(card)!;
    const list = this.hands[seat];
    list.splice(list.indexOf(c), 1);
    c.el.classList.remove('is-hand', 'is-hot');
    this.pile.push(c);
    const to = this.pilePose(this.pile.length);
    this.snd.whoosh(seat === 0 ? 0.7 : 0.5);
    if (seat === 0) this.layoutHand(true);
    else list.forEach((x, i) => void this.fly(x, this.oppPose(i, list.length), {ms: 220, lift: 0}));
    await this.fly(c, to, {ms: seat === 0 ? 260 : 340, lift: 0.22, flip: seat === 0 ? undefined : card, z: 960, zEnd: 300 + this.pile.length, ease: 'cubic-bezier(.25,.6,.3,1)'});
    // iniş: küçük sekme + halka
    void c.el.animate([{transform: tf({...to, s: 1.07}, this.L.cw, this.L.ch)}, {transform: tf(to, this.L.cw, this.L.ch)}], {duration: 140, easing: 'ease-out'});
    this.snd.land(0.7);
    this.pulse(SUIT_COLOR[suitOf(card)], isJack(card) ? 1.3 : 0.85);
    this.sparkle(SUIT_COLOR[suitOf(card)], isJack(card) ? 14 : 9, isJack(card) ? 1.3 : 0.8);
    this.setGlow(suitOf(card));
  }

  /** Yığını topla: kartlar sırayla oyuncunun destesine süzülür; pişti kartı açık olarak altına girer. */
  async collect(seat: number, pistiCard: CardId | null): Promise<void> {
    const list = this.pile;
    this.pile = [];
    const st = this.stacks[seat];
    const fl: Promise<void>[] = [];
    list.forEach((c, k) => {
      if (pistiCard !== null && c.id === pistiCard) {
        const row = this.pistis[seat];
        row.push(c);
        fl.push(this.fly(c, this.pistiPose(seat, row.length - 1), {ms: 420, lift: 0.1, delay: k * 35, z: 950, zEnd: 190 + row.length}));
      } else {
        st.push(c);
        const i = st.length - 1;
        fl.push(this.fly(c, this.stackPose(seat, i), {ms: 380, lift: 0.08, delay: k * 35, flip: BACK_INDEX, z: 950, zEnd: 200 + i}));
      }
    });
    this.setGlow(null);
    await Promise.all(fl);
    for (const c of st) c.el.classList.add('is-flat');
    // deste "yuttu" hissi: üst kart hafifçe zıplar
    const top = st[st.length - 1];
    if (top) void top.el.animate([{transform: tf({...top.pose, s: top.pose.s * 1.12}, this.L.cw, this.L.ch)}, {transform: tf(top.pose, this.L.cw, this.L.ch)}], {duration: 220, easing: 'cubic-bezier(.3,1.6,.5,1)'});
  }

  /** Oyuncu elindeki alan kartlar (yardım parıltısı için). */
  static capturing(hand: CardId[], top: CardId | null, pileCount: number): CardId[] {
    if (top === null || pileCount === 0) return [];
    return hand.filter(c => isJack(c) || rankOf(c) === rankOf(top));
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
