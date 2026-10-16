// Blöf masası (2B): Pişti Arena'nın zemini, teması, deste atlası ve efektleri ORTAK; bunun üstüne Blöf'ün kart katmanı.
// - 2/3/4 koltuk yerleşimi (ekran oranına göre hesaplanır), kapalı rakip yelpazeleri (sıkıştırılmış), dağınık orta yığın,
//   kenara giden kartlar (herkes pas), kişinin büyük eli: değere göre sıralı, aynı değerler grup, 1–2 sıra, seçilen kart kalkar.
// - Uçuşlar WAAPI ile yalnız transform; gölgeler Table2D'nin pişirdiği görsel; efekt düğümleri havuzdan. Boşta hiç JS çalışmaz.
// - Gizli bilgi: rakip kartlarının kimliği bilinmez (id = -1); yalnız açılınca (blöf) ya da bana gelince yüz çizilir.
import {cancelAnims} from '../platform/anim';
import {haptic} from '../platform/bridge';
import './blofTable.css';
import {ATLAS_COLS, ATLAS_ROWS, BACK_INDEX} from '../render/cardAtlas';
import {rankOf, type CardId} from '../core/types';
import type {Table2D} from './table';

export interface BlofSounds {
  deal(): void;
  land(impact: number): void;
  flip(): void;
  slide(p?: number): void;
  whoosh(p: number): void;
  tick(i: number): void;
  shuffle(): void;
}

export interface Pose {
  x: number;
  y: number;
  r: number;
  s: number;
}

/** Rakip koltuğu: yelpaze merkezi, bakış açısı (0 alt, 180 üst, 90 sol, -90 sağ; arası eğik), ölçek, kart aralığı. */
export interface BlofSeat {
  x: number;
  y: number;
  a: number;
  s: number;
  spread: number;
  /** Yelpazede görünen en çok kart (fazlası alttakilerin arkasına sıkışır) */
  vis: number;
}

export interface BlofLayout {
  W: number;
  H: number;
  /** Taban kart boyutu (Table2D ile aynı; gölge görseli buna göre pişirilmiş) */
  cw: number;
  ch: number;
  u: number;
  n: number;
  pile: {x: number; y: number; s: number};
  /** Tur değeri madalyonu */
  claim: {x: number; y: number; d: number};
  /** Kenara giden kartlar */
  discard: {x: number; y: number; s: number};
  /** El: kart ölçeği, ön sıra merkezi, sıra aralığı, seçim yüksekliği; top = elin (kalkık kartlar dahil) üst kenarı */
  hand: {cx: number; y: number; s: number; cwH: number; chH: number; rowDy: number; lift: number; maxW: number; rows: number; top: number};
  /** Eylem çubuğunun dikey merkezi (elin hemen üstü) */
  barY: number;
  /** BLÖF düğmesi (yığın ile çubuk arası) */
  blof: {x: number; y: number; d: number};
  seats: BlofSeat[];
}

class BCard {
  readonly el: HTMLDivElement;
  readonly inn: HTMLDivElement;
  readonly face: HTMLElement;
  /** Seçim / yeni kart halkası */
  readonly ring: HTMLElement;
  id: CardId = -1;
  /** Gösterilen atlas hücresi (−1: henüz çizilmedi) */
  cell = -1;
  pose: Pose = {x: 0, y: 0, r: 0, s: 1};
  anim: Animation | null = null;
  sel = false;
  /** Yığında: merkeze göre kayma (kart genişliği cinsinden) ve açı */
  off = {x: 0, y: 0, r: 0};
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'c2 bl-c';
    this.inn = document.createElement('div');
    this.inn.className = 'c2__in';
    this.face = document.createElement('div');
    this.face.className = 'c2__f';
    this.ring = document.createElement('i');
    this.ring.className = 'bl-c__ring';
    this.inn.append(this.face, this.ring);
    this.el.append(this.inn);
  }
}

const CELL_POS: string[] = Array.from({length: BACK_INDEX + 1}, (_, k) =>
  `${(((k % ATLAS_COLS) / (ATLAS_COLS - 1)) * 100).toFixed(4)}% ${((Math.floor(k / ATLAS_COLS) / (ATLAS_ROWS - 1)) * 100).toFixed(4)}%`);
const EASE_OUT = 'cubic-bezier(.2,.75,.25,1)';
const SPRING = 'cubic-bezier(.3,1.45,.55,1)';
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const tf = (p: Pose, cw: number, ch: number) =>
  `translate3d(${(p.x - cw / 2).toFixed(1)}px,${(p.y - ch / 2).toFixed(1)}px,0) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`;

/** Elde sıralama: değer (As → Papaz), sonra takım. */
export const handOrder = (a: CardId, b: CardId): number => rankOf(a) - rankOf(b) || a - b;

/**
 * Elin düzeni: aynı değerler grup (grup içi adım küçük, gruplar arası büyük). Adımlar kart genişliği oranı: [grup içi, gruplar arası].
 * İndeks (değer + takım) kartın sol ~%25'inde: en dar adımda bile tamamı görünür. Önce tek sıra; sığmazsa dengeli iki sıra;
 * o da sığmazsa kart biraz küçülür, en son aralık daralır.
 */
const SP_MAX = [0.36, 0.62] as const;
const SP_MIN = [0.25, 0.34] as const;
const SP_TIGHT = [0.19, 0.27] as const;
/** Seçili kartın iki yanındaki adım: komşular yer açar (seçim yığın gibi görünmesin) */
const SP_SEL = 0.5;
/** İki sıralı elde arka sıranın kayması, seçim yüksekliği (tek / iki sıra), orta yığın ölçeği (kart genişliği oranı) */
const ROW_DY = 0.56;
const LIFT1 = 0.22;
const LIFT2 = 0.19;
const PILE_S = 0.96;

export class BlofTable {
  readonly el: HTMLDivElement;
  L!: BlofLayout;
  n = 2;
  /** Kişinin eli (sıralı) */
  hand: BCard[] = [];
  /** Rakiplerin kapalı elleri (koltuk sırasıyla; 0 boş) */
  opp: BCard[][] = [];
  pile: BCard[] = [];
  out: BCard[] = [];
  private all: BCard[] = [];
  private deck: BCard[] = [];
  private dim: HTMLElement;
  private alertEl: HTMLElement;
  private pileHit: HTMLElement;
  private marks: HTMLElement[] = [];
  private cw = 80;
  private ch = 114;
  private active = false;
  private safeB = 0;
  private safeT = 0;
  private gest: {id: number; x0: number; on: boolean; seen: Set<BCard>; slid: boolean} | null = null;
  /** Elde seçim yapılabilir mi (dağıtım/açılış sırasında kapalı) */
  selectable = false;
  /** Yığına dokunma (blöf penceresi) */
  private pileOn = false;
  /** Seçim değişti */
  onSelect: (ids: CardId[]) => void = () => {};
  /** 4'ten fazla seçilmeye çalışıldı */
  onReject: () => void = () => {};
  /** Yığına dokunuldu (pencere açıkken) */
  onPile: () => void = () => {};
  /** Yerleşim değişti (HUD katmanı rozet/çubuk yerlerini buna göre koyar) */
  onLayout: (L: BlofLayout) => void = () => {};
  /** Masa Blöf'ten çıktı (Pişti eli kuruldu): arayüz katmanı da kapanır */
  onDetach: () => void = () => {};

  constructor(private t: Table2D, private snd: BlofSounds) {
    this.el = document.createElement('div');
    this.el.className = 'bl-layer';
    this.dim = document.createElement('i');
    this.dim.className = 'bl-dim';
    this.alertEl = document.createElement('i');
    this.alertEl.className = 'bl-alert';
    this.alertEl.innerHTML = '<i></i>';
    this.pileHit = document.createElement('button');
    this.pileHit.className = 'bl-pilehit';
    this.pileHit.setAttribute('aria-label', 'Blöf de');
    this.pileHit.addEventListener('pointerdown', e => {
      if (!this.pileOn) return;
      e.preventDefault();
      this.onPile();
    });
    this.el.append(this.alertEl, this.dim, this.pileHit);
    for (let i = 0; i < 4; i++) {
      const m = document.createElement('i');
      m.className = 'bl-mark';
      this.marks.push(m);
      this.el.append(m);
    }
    for (let i = 0; i < 52; i++) {
      const c = new BCard();
      this.all.push(c);
      this.el.append(c.el);
      this.draw(c, BACK_INDEX);
    }
    const shake = t.root.querySelector('.ar__shake')!;
    shake.insertBefore(this.el, shake.querySelector('.ar__fx'));
    this.el.addEventListener('pointerdown', this.down);
    window.addEventListener('pointermove', this.move, {passive: true});
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    window.addEventListener('resize', this.onResize);
    window.visualViewport?.addEventListener('resize', this.onResize);
    // Pişti eli başlarken (Table2D.reset) Blöf katmanı çekilir
    t.onReset = () => {
      if (this.active) this.detach();
    };
    this.el.style.display = 'none';
  }

  // ───────── etkinleştirme ─────────
  /** Blöf masasını aç: Pişti kart katmanı gizlenir, zemin/tema/efektler ortak kalır. */
  attach(): void {
    this.active = true;
    this.t.root.classList.add('is-blof');
    this.el.style.display = '';
  }

  detach(): void {
    this.active = false;
    this.selectable = false;
    this.setPileTap(false);
    this.t.root.classList.remove('is-blof');
    this.el.style.display = 'none';
    for (const c of this.all) {
      c.anim?.cancel();
      cancelAnims(c.inn);
    }
    this.t.setTension(false);
    this.resetRing();
    this.onDetach();
  }

  private onResize = () => {
    if (!this.active) return;
    // Table2D kendi düzenini önce kurar (dinleyicisi önce kayıtlı); taban kart boyutu oradan
    requestAnimationFrame(() => this.relayout());
  };

  // ───────── düzen ─────────
  private readSafe(): [number, number] {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:0;bottom:0;height:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden';
    document.body.append(p);
    const cs = getComputedStyle(p);
    const v: [number, number] = [parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0];
    p.remove();
    return v;
  }

  private layout(): void {
    const root = this.t.root;
    const W = root.clientWidth || innerWidth, H = root.clientHeight || innerHeight;
    const cw = this.t.L?.cw ?? Math.round(Math.min(W * 0.215, H * 0.112));
    const ch = this.t.L?.ch ?? Math.round(cw / 0.7);
    this.cw = cw;
    this.ch = ch;
    const u = clamp(Math.min(W * 0.04, H * 0.02), 12, 22);
    const n = this.n;
    // el kartı: okunur indeks + rahat dokunma; tablette çok büyümez
    const cwH = Math.min(W * 0.19, H * 0.094, 104);
    const chH = cwH / 0.7;
    const sH = cwH / cw;
    const maxW = Math.min(W - Math.max(16, W * 0.04), cwH * 10.5);
    const bottom = H - Math.max(8, H * 0.012) - this.safeB;
    const rowDy = chH * ROW_DY;
    const lift = chH * LIFT1;
    const yF = bottom - chH / 2;
    const barH = Math.max(44, u * 3);
    // eylem çubuğunun üstü: tek sıra / iki sıra el
    const barTop1 = yF - chH / 2 - lift - 6 - barH;
    const barTop2 = yF - rowDy - chH * 0.525 - chH * LIFT2 - 6 - barH;
    const safeT = this.safeT;
    // koltuklar (rozet yerleri HUD CSS'inde: hud.css + blofHud.css; burada aynı u ölçüsüyle hesaplanır)
    const seats: BlofSeat[] = [{x: W / 2, y: yF, a: 0, s: sH, spread: 0, vis: 0}];
    let oppBottom: number;
    if (n === 2) {
      const s = 0.58;
      const plate = Math.max(u * 1.15, safeT + u * 0.7) + u * 9.4; // rozet + ad + sayaç
      const y = plate + (ch * s) / 2 + u * 0.35;
      seats.push({x: W / 2, y, a: 180, s, spread: cw * s * 0.24, vis: 11});
      oppBottom = y + (ch * s) / 2;
    } else if (n === 3) {
      // rozetler üst köşelerde (HUD: data-mode=3), yelpazeler altlarında masaya doğru eğik
      const s = 0.5;
      const plate = Math.max(u * 0.75, safeT) + u * 3.5 + u * 8.4;
      const y = plate + (ch * s) / 2 + u * 0.1;
      const dx = W * 0.25;
      seats.push(
        {x: W / 2 + dx, y, a: -160, s, spread: cw * s * 0.24, vis: 10},
        {x: W / 2 - dx, y, a: 160, s, spread: cw * s * 0.24, vis: 10},
      );
      oppBottom = y + ch * s * 0.58;
    } else {
      // üst: rozetin altında; yanlar: rozetin hemen altında küçük, dikine kapalı yelpaze (ekran kenarına yaslı)
      const fs = Math.min(0.54, Math.max(0.46, (H * 0.072) / ch));
      const fh = ch * fs;
      const plate = Math.max(u * 1.05, safeT + u * 0.6) + u * 8.6;
      const ty = plate + fh / 2 + u * 0.15;
      const ss = 0.44;
      const sh = ch * ss;
      const sideTop = H <= 700 ? 0.215 : 0.245;
      const bs = (H <= 700 ? 4.3 : 4.6) * u;
      const sideLen = 5 * cw * ss * 0.2 + cw * ss;
      const sy = H * sideTop + bs + u * 3.7 + sideLen / 2;
      const side = sh * 0.48;
      seats.push(
        {x: W - side, y: sy, a: -90, s: ss, spread: cw * ss * 0.2, vis: 6},
        {x: W / 2, y: ty, a: 180, s: fs, spread: cw * fs * 0.3, vis: 10},
        {x: side, y: sy, a: 90, s: ss, spread: cw * ss * 0.2, vis: 6},
      );
      oppBottom = ty + fh / 2;
    }
    // sahne (yığın + madalyon + kenar): boş alanın görsel ortasında, iri
    const ref = n === 4 ? (barTop1 + barTop2) / 2 : barTop2;
    // yığın boş alana göre iri (uzun ekranda ve tablette büyür, kısa ekranda küçülmez)
    const pileS = clamp((0.37 * (ref - oppBottom)) / ch, PILE_S * 0.96, 1.22);
    const pw = cw * pileS, ph = ch * pileS;
    let pileY = (oppBottom + ref) / 2 + u * 0.2;
    // iki sıralı elde bile çubuğa değmesin; üstte rakip yelpazesine değmesin
    pileY = Math.min(pileY, barTop2 - ph / 2 - u * 2.2);
    pileY = Math.max(pileY, oppBottom + ph / 2 + u * 1.6);
    const pile = {x: W / 2, y: pileY, s: pileS};
    // tur madalyonu (yığının sağı) ve kenar (solu)
    const d = clamp(pw * 0.92, u * 4.6, u * 6);
    const gap = u * 1.1;
    const claim = {x: pile.x + pw / 2 + gap + d / 2, y: pileY - ph * 0.04, d};
    const discard = {x: pile.x - pw / 2 - gap * 1.5 - cw * 0.27, y: pileY - ph * 0.02, s: 0.52};
    if (n === 4) {
      // yan yelpazelere değmesin
      const sh = ch * 0.44;
      const innerR = W - sh * 0.48 - sh / 2 - u * 0.4, innerL = sh * 0.48 + sh / 2 + u * 0.4;
      claim.x = Math.min(claim.x, innerR - d / 2);
      discard.x = Math.max(discard.x, innerL + (cw * 0.52) / 2 + u * 0.3);
    }
    this.L = {
      W, H, cw, ch, u, n, pile, claim, discard,
      hand: {cx: W / 2, y: yF, s: sH, cwH, chH, rowDy, lift, maxW, rows: 1, top: yF - chH / 2 - lift},
      barY: 0,
      blof: {x: W / 2, y: 0, d: clamp(barH * 1.62, u * 4.4, u * 5.6)},
      seats,
    };
    // yığın etkileşim + uyarı halkası
    const hr = Math.max(pw, ph) * 1.25;
    Object.assign(this.pileHit.style, {width: hr + 'px', height: hr + 'px', transform: `translate3d(${(pile.x - hr / 2).toFixed(1)}px,${(pile.y - hr / 2).toFixed(1)}px,0)`});
    const ar = Math.max(pw, ph) * 1.55;
    Object.assign(this.alertEl.style, {width: ar + 'px', height: ar + 'px', transform: `translate3d(${(pile.x - ar / 2).toFixed(1)}px,${(pile.y - ar / 2).toFixed(1)}px,0)`});
    for (const c of this.all) {
      c.el.style.width = cw + 'px';
      c.el.style.height = ch + 'px';
    }
    this.placeRing();
  }

  /** Table2D'nin yığın halkası ve ışığı Blöf yığınının yerine taşınır (Table2D yeniden yerleşince geri yazar; her düzende tekrar). */
  private placeRing(): void {
    const {pile, cw} = this.L;
    const root = this.t.root;
    const ring = root.querySelector<HTMLElement>('.ar__ring');
    const rd = cw * 2.1;
    if (ring) Object.assign(ring.style, {width: rd + 'px', height: rd + 'px', left: pile.x - rd / 2 + 'px', top: pile.y - rd / 2 + 'px'});
    root.querySelectorAll<HTMLElement>('.ar__glow, .ar__rays, .ar__tint').forEach(g => (g.style.top = pile.y + 'px'));
    const z = root.querySelector<HTMLElement>('.ar__zoom');
    if (z) z.style.transformOrigin = `50% ${((pile.y / this.L.H) * 100).toFixed(1)}%`;
  }

  private resetRing(): void {
    const z = this.t.root.querySelector<HTMLElement>('.ar__zoom');
    if (z) z.style.transformOrigin = '';
  }

  /** Ekran boyutu değişti: herkes yeni yerine (animasyonsuz). */
  relayout(): void {
    if (!this.active) return;
    this.layout();
    this.layoutHand(false);
    for (let s = 1; s < this.n; s++) this.layoutFan(s, false);
    this.pile.forEach(c => this.set(c, this.pilePose(c)));
    this.out.forEach((c, i) => this.set(c, this.outPose(i)));
    this.onLayout(this.L);
  }

  // ───────── çizim / poz / uçuş ─────────
  private draw(c: BCard, cell: number): void {
    if (c.cell === cell) return;
    c.cell = cell;
    c.face.style.backgroundPosition = CELL_POS[cell];
  }

  private set(c: BCard, p: Pose, z?: number): void {
    c.anim?.cancel();
    c.anim = null;
    c.pose = {...p};
    c.el.style.transform = tf(p, this.cw, this.ch);
    if (z !== undefined) c.el.style.zIndex = String(z);
  }

  private fly(c: BCard, to: Pose, o: {ms?: number; lift?: number; flip?: number; z?: number; zEnd?: number; delay?: number; ease?: string; arc?: number; spin?: number} = {}): Promise<void> {
    const ms = o.ms ?? 300, lift = o.lift ?? 0.1;
    const from = {...c.pose};
    c.anim?.cancel();
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const arc = (o.arc ?? 0) * dist;
    const spin = o.spin ?? 0;
    const mid: Pose = {
      x: (from.x + to.x) / 2 + (-dy / dist) * arc,
      y: (from.y + to.y) / 2 + (dx / dist) * arc - this.ch * lift * 0.6,
      r: (from.r + to.r) / 2 + spin / 2,
      s: ((from.s + to.s) / 2) * (1 + lift),
    };
    const end: Pose = {...to, r: to.r + spin};
    const {cw, ch} = this;
    if (o.z !== undefined) c.el.style.zIndex = String(o.z);
    const delay = o.delay ?? 0;
    const kf: Keyframe[] = lift || arc || spin
      ? [{transform: tf(from, cw, ch)}, {transform: tf(mid, cw, ch), offset: 0.5}, {transform: tf(end, cw, ch)}]
      : [{transform: tf(from, cw, ch)}, {transform: tf(end, cw, ch)}];
    const a = c.el.animate(kf, {duration: ms, delay, easing: o.ease ?? EASE_OUT, fill: 'both'});
    c.anim = a;
    c.pose = {...to};
    if (o.flip !== undefined && o.flip !== c.cell) {
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

  // ───────── pozlar ─────────
  private fanPose(seat: number, i: number, n: number, lift = 0): Pose {
    const f = this.L.seats[seat];
    const v = Math.min(n, f.vis);
    const j = n <= v ? i : Math.min(v - 1, Math.floor((i * v) / n));
    const k = j - (v - 1) / 2;
    const stack = n <= v ? 0 : i - Math.ceil((j * n) / v); // aynı yuvaya sıkışanlar: hafif kalınlık
    const lx = k * f.spread + stack * 0.25, ly = k * k * 1.4 - lift - stack * 0.35;
    const a = (f.a * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
    // üst yarıdaki koltuklarda kart sırtı ters dönmesin
    const base = Math.abs(f.a) > 90 ? f.a - Math.sign(f.a) * 180 : f.a;
    return {x: f.x + lx * co - ly * si, y: f.y + lx * si + ly * co, r: base + k * 4.5, s: f.s};
  }

  /** Yığındaki kartın pozu: yığın merkezine göre saklanan kayma (ekran değişince yerinde kalsın). */
  private pilePose(c: BCard): Pose {
    const p = this.L.pile, o = c.off;
    return {x: p.x + o.x * this.cw, y: p.y + o.y * this.cw, r: o.r, s: p.s};
  }

  private outPose(i: number): Pose {
    const d = this.L.discard, k = Math.min(i, 30);
    return {x: d.x + Math.sin(i * 2.3) * 1.2 - k * 0.1, y: d.y - k * 0.32, r: -8 + Math.sin(i * 1.7) * 2.5, s: d.s};
  }

  /** Elin pozları (sıralı kartlar için). Sıra sayısını, seçim yüksekliğini ve elin üst kenarını L.hand'e yazar. */
  private handPoses(cards: BCard[]): Pose[] {
    const h = this.L.hand;
    const n = cards.length;
    if (!n) {
      h.rows = 1;
      h.top = h.y - h.chH / 2 - h.lift;
      return [];
    }
    const grp: number[] = [];
    let g = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0 && rankOf(cards[i].id) !== rankOf(cards[i - 1].id)) g++;
      grp.push(g);
    }
    const G = g + 1;
    // satırın genişliği (kart genişliği cinsinden): 1 + grup içi adımlar + gruplar arası adımlar
    const span = (from: number, to: number) => {
      const gg = grp[to - 1] - grp[from] + 1;
      return {inN: to - from - gg, gapN: gg - 1};
    };
    const at = (sp: {inN: number; gapN: number}, a: readonly number[]) => 1 + sp.inN * a[0] + sp.gapN * a[1];
    /** En geniş aralıktan (t=1) en dara (t=0) arasında, satırı maxW'ye sığdıran en büyük t */
    const solve = (sp: {inN: number; gapN: number}, cw: number, lo: readonly number[], hi: readonly number[]) => {
      const den = sp.inN * (hi[0] - lo[0]) + sp.gapN * (hi[1] - lo[1]);
      if (den <= 0) return 1;
      return clamp((h.maxW / cw - at(sp, lo)) / den, 0, 1);
    };
    let cwH = h.cwH;
    let rows: {from: number; to: number}[] = [{from: 0, to: n}];
    let lo: readonly number[] = SP_MIN, hi: readonly number[] = SP_MAX;
    const one = span(0, n);
    if (at(one, SP_MIN) * cwH > h.maxW && G > 1) {
      // iki sıra: grup sınırından, en geniş satırı en dar yapan bölme (eşitse dengeli olan)
      let best = 1, bestW = Infinity;
      for (let k = 1; k < G; k++) {
        const cut = grp.indexOf(k);
        const w = Math.max(at(span(0, cut), SP_MIN), at(span(cut, n), SP_MIN)) + Math.abs(n - 2 * cut) * 0.001;
        if (w < bestW) {
          bestW = w;
          best = cut;
        }
      }
      rows = [{from: 0, to: best}, {from: best, to: n}];
      if (bestW * cwH > h.maxW) {
        // sığmıyor: önce kart biraz küçülür, yine olmazsa aralık daralır
        cwH = Math.max(h.cwH * 0.76, h.maxW / bestW);
        if (bestW * cwH > h.maxW) {
          hi = SP_MIN;
          lo = SP_TIGHT;
        }
      }
    } else if (at(one, SP_MIN) * cwH > h.maxW) {
      hi = SP_MIN;
      lo = SP_TIGHT;
    }
    // aralık: en kalabalık satıra göre (iki satır aynı aralıkla — düzenli görünsün)
    let t = 1;
    for (const r of rows) t = Math.min(t, solve(span(r.from, r.to), cwH, lo, hi));
    const ki = lo[0] + (hi[0] - lo[0]) * t, ko = lo[1] + (hi[1] - lo[1]) * t;
    const two = rows.length === 2;
    const s = cwH / this.cw;
    const chH = cwH / 0.7;
    const rowDy = chH * ROW_DY;
    const out: Pose[] = new Array(n);
    rows.forEach((r, ri) => {
      const back = two && ri === 0;
      const k = back ? 0.95 : 1;
      const y0 = h.y + (h.chH - chH) / 2 - (back ? rowDy : 0);
      // adımlar: seçili kartın iki yanı açılır; satır sığmazsa seçili olmayan adımlar daralır
      const steps: number[] = [];
      let fixed = 0, flex = 0;
      for (let i = r.from + 1; i < r.to; i++) {
        const base = grp[i] === grp[i - 1] ? ki : ko;
        // seçili kartın SAĞINDAKİ adım açılır (sonraki kart onu örtüyor); solundaki kart zaten altta kalır
        const sel = cards[i - 1].sel;
        const st = sel ? Math.max(base, SP_SEL) : base;
        steps.push(st);
        if (sel) fixed += st;
        else flex += st;
      }
      const room = h.maxW / (cwH * k) - 1 - fixed;
      const f = flex > 0 && fixed + flex > h.maxW / (cwH * k) - 1 ? Math.max(0.55, room / flex) : 1;
      let w = cwH * k;
      steps.forEach((st, j) => (w += (cards[r.from + j].sel ? st : st * f) * cwH * k));
      let x = h.cx - w / 2 + (cwH * k) / 2;
      const half = Math.max(w / 2, cwH * 1.5);
      for (let i = r.from; i < r.to; i++) {
        if (i > r.from) {
          const st = steps[i - r.from - 1];
          x += (cards[i - 1].sel ? st : st * f) * cwH * k;
        }
        const q = (x - h.cx) / half;
        out[i] = {x, y: y0 + q * q * chH * 0.045, r: q * (back ? 2 : 2.8), s: s * k};
      }
    });
    h.rows = rows.length;
    // iki sırada seçim biraz daha az kalkar (arka sıranın indeksleri örtülmesin)
    this.liftK = two ? LIFT2 / LIFT1 : 1;
    const liftPx = h.lift * (chH / h.chH) * this.liftK;
    h.top = h.y + (h.chH - chH) / 2 - (two ? rowDy + chH * 0.025 : 0) - chH / 2 - liftPx;
    this.rowOf = two ? rows[0].to : n;
    return out;
  }

  private liftK = 1;
  private rowOf = 0;

  private selPose(p: Pose): Pose {
    const k = p.s / this.L.hand.s;
    return {x: p.x, y: p.y - this.L.hand.lift * k * this.liftK, r: p.r * 0.5, s: p.s * 1.04};
  }

  /** El yeniden dizilir (sıralı). barY değişirse onLayout bildirilir. */
  layoutHand(animate = true, ms = 230, pop?: Set<BCard>): void {
    const top0 = this.L.hand.top;
    const poses = this.handPoses(this.hand);
    this.hand.forEach((c, i) => {
      const p = c.sel ? this.selPose(poses[i]) : poses[i];
      const z = (i < this.rowOf ? 500 : 600) + i;
      c.el.style.zIndex = String(z);
      if (!animate) this.set(c, p);
      else if (pop?.has(c)) void this.fly(c, p, {ms: c.sel ? 230 : 180, lift: 0, ease: c.sel ? SPRING : EASE_OUT});
      else if (Math.abs(c.pose.x - p.x) > 0.3 || Math.abs(c.pose.y - p.y) > 0.3 || Math.abs(c.pose.s - p.s) > 0.001) void this.fly(c, p, {ms, lift: 0});
    });
    this.updateBar();
    if (Math.abs(top0 - this.L.hand.top) > 0.5) this.onLayout(this.L);
  }

  private updateBar(): void {
    const barH = Math.max(44, this.L.u * 3);
    this.L.barY = this.L.hand.top - 6 - barH / 2;
    // BLÖF düğmesi çubuğun yerinde (pencere açıkken çubuk gizli)
    this.L.blof.y = this.L.barY;
  }

  private layoutFan(seat: number, animate = true): void {
    const list = this.opp[seat] ?? [];
    list.forEach((c, i) => {
      const p = this.fanPose(seat, i, list.length);
      c.el.style.zIndex = String(400 + seat * 60 + i);
      if (animate) void this.fly(c, p, {ms: 240, lift: 0});
      else this.set(c, p);
    });
  }

  // ───────── geometri (HUD için) ─────────
  pilePoint(): {x: number; y: number} {
    return {x: this.L.pile.x, y: this.L.pile.y};
  }
  seatPoint(seat: number): {x: number; y: number} {
    if (seat === 0) return {x: this.L.hand.cx, y: this.L.hand.y - this.L.hand.chH * 0.3};
    const f = this.L.seats[seat];
    return {x: f.x, y: f.y};
  }
  count(seat: number): number {
    return seat === 0 ? this.hand.length : (this.opp[seat]?.length ?? 0);
  }

  // ───────── el akışı ─────────
  /** Yeni el: kartlar ekran dışında, düzen kurulur. */
  reset(seats: number): void {
    this.n = seats;
    [this.safeT, this.safeB] = this.readSafe();
    this.attach();
    this.layout();
    this.gest = null;
    this.selectable = false;
    this.setPileTap(false);
    this.hand = [];
    this.opp = Array.from({length: seats}, () => []);
    this.pile = [];
    this.out = [];
    this.deck = this.all.slice();
    this.dim.style.opacity = '0';
    for (const m of this.marks) m.style.display = 'none';
    this.deck.forEach((c, i) => {
      c.id = -1;
      c.sel = false;
      c.el.className = 'c2 bl-c';
      c.el.style.opacity = '';
      cancelAnims(c.inn);
      cancelAnims(c.ring);
      this.draw(c, BACK_INDEX);
      const p = this.deckPose(i);
      this.set(c, {...p, x: p.x - this.L.W * 0.75, r: p.r - 30}, 100 + i);
    });
    this.t.setGlow(null);
    this.updateBar();
    this.onLayout(this.L);
  }

  private deckPose(i: number): Pose {
    const p = this.L.pile, k = Math.min(i, 26);
    return {x: p.x - k * 0.12, y: p.y - k * 0.42, r: -4 + Math.sin(i * 3.7) * 0.8, s: p.s * 1.04};
  }

  /** Karıştırma (kısa): deste döner gelir, ikiye ayrılıp harmanlanır. ~0.85 sn. */
  async shuffle(): Promise<void> {
    const n = this.deck.length;
    const {cw} = this;
    this.snd.shuffle();
    await Promise.all(this.deck.map((c, i) => this.fly(c, this.deckPose(i), {ms: 300, lift: 0.04, delay: i * 1.2, ease: 'cubic-bezier(.2,.9,.3,1.1)', spin: 360, z: 100 + i})));
    const half = n >> 1;
    await Promise.all(this.deck.map((c, i) => {
      const p = this.deckPose(i % half);
      p.x += (i < half ? -1 : 1) * cw * 0.55;
      p.y -= 6;
      p.r += i < half ? -12 : 12;
      return this.fly(c, p, {ms: 130, lift: 0});
    }));
    const order: BCard[] = [];
    for (let k = 0; k < half; k++) order.push(this.deck[k], this.deck[k + half]);
    if (n % 2) order.push(this.deck[n - 1]);
    this.deck = order;
    await Promise.all(order.map((c, i) => this.fly(c, this.deckPose(i), {ms: 120, lift: 0, delay: i * 2, z: 100 + i, ease: 'cubic-bezier(.4,0,.6,1)'})));
    this.snd.land(0.35);
  }

  /**
   * Dağıtım: sırayla koltuklara. Kişinin kartları havada açılıp SIRALI yerine oturur (el kendiliğinden dizilir);
   * rakiplerinki kapalı yelpazeye. `mine`: kişinin bütün eli (dağıtım sırası önemli değil), `order`: dağıtım sırası (koltuk).
   */
  async deal(order: number[], mine: CardId[]): Promise<void> {
    const sorted = mine.slice().sort(handOrder);
    // son elin düzeni önceden: kart yerine uçar
    const finals: BCard[] = [];
    const mineCards = new Map<CardId, BCard>();
    let mi = 0;
    const dealt: {seat: number; c: BCard}[] = [];
    for (const seat of order) {
      const c = this.deck.pop();
      if (!c) break;
      dealt.push({seat, c});
      if (seat === 0) {
        c.id = mine[mi++] ?? -1;
        mineCards.set(c.id, c);
      }
    }
    for (const id of sorted) {
      const c = mineCards.get(id);
      if (c) finals.push(c);
    }
    this.hand = finals;
    const poses = this.handPoses(finals);
    this.updateBar();
    this.onLayout(this.L);
    const cnt = new Array<number>(this.n).fill(0);
    for (const d of dealt) if (d.seat > 0) cnt[d.seat]++;
    const got = new Array<number>(this.n).fill(0);
    const gap = dealt.length > 30 ? 34 : 46;
    const fl: Promise<void>[] = [];
    for (let k = 0; k < dealt.length; k++) {
      const {seat, c} = dealt[k];
      if (seat === 0) {
        const i = finals.indexOf(c);
        c.el.classList.add('bl-hand');
        fl.push(this.fly(c, poses[i], {ms: 360, lift: 0.16, flip: c.id, z: 950, zEnd: (i < this.rowOf ? 500 : 600) + i, spin: 360}));
      } else {
        const i = got[seat]++;
        this.opp[seat].push(c);
        fl.push(this.fly(c, this.fanPose(seat, i, cnt[seat]), {ms: 300, lift: 0.08, z: 950, zEnd: 400 + seat * 60 + i, spin: (seat % 2 ? -1 : 1) * 360}));
      }
      if (k % 2 === 0) this.snd.deal();
      await sleep(gap);
    }
    await Promise.all(fl);
    this.layoutHand(true, 200);
    this.snd.land(0.4);
  }

  // ───────── seçim ─────────
  selected(): CardId[] {
    return this.hand.filter(c => c.sel).map(c => c.id);
  }

  clearSelection(animate = true): void {
    let any = false;
    for (const c of this.hand) if (c.sel) {
      c.sel = false;
      c.el.classList.remove('is-sel');
      any = true;
    }
    if (any) {
      this.layoutHand(animate, 180);
      this.onSelect([]);
    }
  }

  /** Tam olarak bu kartları seç (otomatik oyun / öğretici). */
  selectIds(ids: CardId[]): void {
    const want = new Set(ids.slice(0, 4));
    const pop = new Set<BCard>();
    for (const c of this.hand) {
      const on = want.has(c.id);
      if (on === c.sel) continue;
      pop.add(c);
      c.sel = on;
      c.el.classList.toggle('is-sel', on);
    }
    if (!pop.size) return;
    this.layoutHand(true, 200, pop);
    this.snd.slide(0.5);
    this.onSelect(this.selected());
  }

  /** Elin ekrandaki noktası (öğretici eli): verilen değerdeki ilk kart, yoksa elin ortası. */
  handPoint(rank = 0): {x: number; y: number} {
    const poses = this.handPoses(this.hand);
    let i = rank ? this.hand.findIndex(c => rankOf(c.id) === rank) : -1;
    if (i < 0) i = Math.floor(this.hand.length / 2);
    const p = poses[i];
    if (!p) return {x: this.L.hand.cx, y: this.L.hand.y};
    return {x: p.x - this.cw * p.s * 0.25, y: p.y - this.ch * p.s * 0.3};
  }

  /** Değer seçilince (tur açarken): seçim boşsa eldeki o değerdeki kartlar (en çok 4) kendiliğinden kalkar. */
  preselect(rank: number): void {
    if (this.hand.some(c => c.sel)) return;
    const list = this.hand.filter(c => rankOf(c.id) === rank).slice(0, 4);
    if (!list.length) return;
    for (const c of list) {
      c.sel = true;
      c.el.classList.add('is-sel');
    }
    this.layoutHand(true, 220, new Set(list));
    this.snd.slide(0.5);
    this.onSelect(this.selected());
  }

  private toggle(c: BCard, on: boolean): boolean {
    if (on === c.sel) return false;
    if (on && this.hand.filter(x => x.sel).length >= 4) {
      void c.inn.animate([{transform: 'none'}, {transform: 'translateX(-5px) rotate(-3deg)'}, {transform: 'translateX(5px) rotate(3deg)'}, {transform: 'translateX(-3px)'}, {transform: 'none'}], {duration: 300, easing: 'ease-out'});
      haptic('warning');
      this.onReject();
      return false;
    }
    c.sel = on;
    c.el.classList.toggle('is-sel', on);
    this.layoutHand(true, 200, new Set([c]));
    this.snd.slide(on ? 0.55 : 0.35);
    haptic('light');
    this.onSelect(this.selected());
    return true;
  }

  private cardAt(t: EventTarget | null): BCard | null {
    const el = (t as Element | null)?.closest?.('.bl-c');
    if (!el) return null;
    return this.hand.find(c => c.el === el) ?? null;
  }

  private down = (e: PointerEvent) => {
    if (!this.selectable || this.gest) return;
    const c = this.cardAt(e.target);
    if (!c) return;
    e.preventDefault();
    const on = !c.sel;
    this.gest = {id: e.pointerId, x0: e.clientX, on, seen: new Set([c]), slid: false};
    this.toggle(c, on);
  };

  private move = (e: PointerEvent) => {
    const g = this.gest;
    if (!g || e.pointerId !== g.id || !this.selectable) return;
    if (!g.slid && Math.abs(e.clientX - g.x0) > 14) g.slid = true;
    if (!g.slid) return;
    const c = this.cardAt(document.elementFromPoint(e.clientX, e.clientY));
    if (!c || g.seen.has(c)) return;
    g.seen.add(c);
    if (c.sel !== g.on) this.toggle(c, g.on);
  };

  private up = (e: PointerEvent) => {
    if (this.gest && e.pointerId === this.gest.id) this.gest = null;
  };

  /** Elde seçim açık/kapalı (kapalıyken seçim korunur). */
  setSelectable(on: boolean): void {
    this.selectable = on;
    this.el.classList.toggle('is-pick', on);
  }

  /** Yanlışlıkla seçili kalan (artık elde olmayan) kartlar temizlenir. */
  private dropSel(c: BCard): void {
    c.sel = false;
    c.el.classList.remove('is-sel', 'bl-hand', 'is-new');
  }

  // ───────── atış ─────────
  /**
   * Kart atışı: kişi için seçili kart kimlikleri, rakip için kaç kart. Kartlar kapalı olarak yığına uçar
   * (atanın elinden), hafif yelpaze hâlinde üst üste iner. İner inmez çözülür.
   */
  async play(seat: number, cards: CardId[] | number): Promise<void> {
    const list: BCard[] = [];
    if (seat === 0) {
      const ids = cards as CardId[];
      for (const id of ids) {
        const c = this.hand.find(x => x.id === id);
        if (c) list.push(c);
      }
      this.hand = this.hand.filter(c => !list.includes(c));
      list.forEach(c => this.dropSel(c));
    } else {
      const k = typeof cards === 'number' ? cards : cards.length;
      const h = this.opp[seat];
      // yelpazenin ortasından rastgele kartlar
      for (let j = 0; j < k && h.length; j++) {
        const i = Math.floor(rnd(0.15, 0.85) * h.length);
        list.push(h.splice(i, 1)[0]);
      }
    }
    if (!list.length) return;
    const p = this.L.pile;
    const m = list.length;
    // önceki son atış alta bastırılır (üstteki yeni atış belirgin)
    const base = this.pile.length;
    const rot = rnd(-18, 18);
    this.snd.whoosh(seat === 0 ? 0.75 : 0.55);
    if (seat === 0) this.layoutHand(true, 240);
    else this.layoutFan(seat, true);
    const fl = list.map((c, j) => {
      this.pile.push(c);
      const k = j - (m - 1) / 2;
      c.off = {x: (k * this.cw * p.s * 0.2 + rnd(-3, 3)) / this.cw, y: (rnd(-3, 3) - Math.min(base + j, 30) * 0.28) / this.cw, r: rot + k * 9 + rnd(-3, 3)};
      const to = this.pilePose(c);
      return this.fly(c, to, {ms: seat === 0 ? 300 : 340, lift: 0.2, delay: j * 55, flip: BACK_INDEX, z: 960 + j, zEnd: 300 + base + j, ease: 'cubic-bezier(.25,.6,.3,1)', spin: seat === 0 ? 0 : (seat % 2 ? 1 : -1) * 360});
    });
    await fl[fl.length - 1];
    this.snd.land(0.55 + 0.1 * m);
    const top = list[list.length - 1];
    void top.inn.animate([{transform: 'scale(1.1)'}, {transform: 'scale(.96,1.03)', offset: 0.45}, {transform: 'none'}], {duration: 220, easing: 'ease-out'});
    this.t.pulse('#9fb4ff', 0.7 + 0.1 * m, this.pilePoint());
    this.t.sparkle('#cfd8ff', 4 + m * 2, 0.6, this.pilePoint());
    await Promise.all(fl);
  }

  // ───────── blöf ─────────
  /** Blöf penceresi: yığının çevresinde kırmızı nabız + yığına dokunma (ms boyunca). */
  setPileTap(on: boolean, ms = 5000): void {
    this.pileOn = on;
    this.pileHit.classList.toggle('is-on', on);
    const el = this.alertEl;
    cancelAnims(el);
    cancelAnims(el.firstElementChild as HTMLElement);
    if (!on) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.animate([{opacity: 0, transform: el.style.transform + ' scale(.7)'}, {opacity: 1, transform: el.style.transform + ' scale(1)'}], {duration: 260, easing: 'cubic-bezier(.3,1.4,.6,1)'});
    (el.firstElementChild as HTMLElement).animate([{opacity: 0.35, transform: 'scale(.92)'}, {opacity: 1, transform: 'scale(1.04)'}],
      {duration: 420, iterations: Math.max(1, Math.round(ms / 420)), direction: 'alternate', easing: 'ease-in-out'});
  }

  /**
   * Blöf anı: son atılan kartlar yığından kalkar, sıraya dizilir ve AĞIR ÇEKİMDE tek tek açılır (✓ / ✗).
   * cards: açılan kartlar (atış sırasıyla), rank: söylenen değer. Kartlar açık kalır; sonucu döner (true = hepsi doğru).
   */
  async reveal(cards: CardId[], rank: number, o: {step?: number; onFlip?: (i: number, ok: boolean) => void} = {}): Promise<boolean> {
    const m = Math.min(cards.length, this.pile.length);
    if (!m) return true;
    const list = this.pile.slice(this.pile.length - m);
    const {pile} = this.L;
    const s = this.revealScale(m);
    const gap = this.cw * s * 1.1;
    const y = pile.y + this.ch * 0.04;
    // masa kararır, kartlar kalkıp dizilir
    this.dim.style.display = 'block';
    this.dim.animate([{opacity: 0}, {opacity: 1}], {duration: 260, fill: 'forwards', easing: 'ease-out'});
    await Promise.all(list.map((c, j) => this.fly(c, {x: pile.x + (j - (m - 1) / 2) * gap, y, r: (j - (m - 1) / 2) * 3, s}, {ms: 300, lift: 0.12, delay: j * 40, z: 980 + j, ease: 'cubic-bezier(.2,.8,.25,1)'})));
    const step = o.step ?? 320;
    let all = true;
    for (let j = 0; j < m; j++) {
      const c = list[j];
      const id = cards[j];
      c.id = id;
      const ok = rankOf(id) === rank;
      if (!ok) all = false;
      // çevirme: kalkar, yan döner, yüz
      c.inn.animate([{transform: 'none'}, {transform: 'translateY(-14px) scale(1.08) scaleX(0)', offset: 0.5}, {transform: 'translateY(-6px) scale(1.04)', offset: 0.8}, {transform: 'none'}],
        {duration: step * 0.95, easing: 'ease-in-out'});
      setTimeout(() => this.draw(c, id), step * 0.47);
      this.snd.flip();
      await sleep(step * 0.55);
      this.snd.tick(j * 5 + 4);
      this.mark(j, c.pose, ok, s);
      o.onFlip?.(j, ok);
      if (!ok) {
        void c.inn.animate([{transform: 'none'}, {transform: 'translateX(-6px) rotate(-4deg)'}, {transform: 'translateX(6px) rotate(4deg)'}, {transform: 'translateX(-3px) rotate(-2deg)'}, {transform: 'none'}], {duration: 320, easing: 'ease-out'});
        this.t.pulse('#ff2e4d', 0.9, {x: c.pose.x, y: c.pose.y});
      } else this.t.pulse('#3dff86', 0.7, {x: c.pose.x, y: c.pose.y});
      await sleep(step * 0.45);
    }
    return all;
  }

  /** Açılan kartların ölçeği ve satırın üst kenarı (madalyon onun üstüne gelir). */
  revealScale(m: number): number {
    return Math.min(1.08, (this.L.W * 0.86) / (this.cw * (m + (m - 1) * 0.12)));
  }
  revealTop(m: number): number {
    return this.L.pile.y + this.ch * 0.04 - (this.ch * this.revealScale(m)) / 2;
  }

  private mark(j: number, p: Pose, ok: boolean, s: number): void {
    const m = this.marks[j % 4];
    const d = this.L.u * 2.4;
    m.className = 'bl-mark ' + (ok ? 'is-ok' : 'is-bad');
    m.style.display = 'block';
    Object.assign(m.style, {width: d + 'px', height: d + 'px'});
    const x = p.x + this.cw * s * 0.36 - d / 2, y = p.y - this.ch * s * 0.44 - d / 2;
    m.animate([
      {transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(2.2) rotate(-25deg)`, opacity: 0},
      {transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(.9) rotate(4deg)`, opacity: 1, offset: 0.55},
      {transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(1) rotate(0deg)`, opacity: 1},
    ], {duration: 260, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'both'});
  }

  private clearMarks(): void {
    for (const m of this.marks) {
      cancelAnims(m);
      m.style.display = 'none';
    }
  }

  private undim(): void {
    cancelAnims(this.dim);
    const a = this.dim.animate([{opacity: 1}, {opacity: 0}], {duration: 260, fill: 'forwards'});
    a.finished.then(() => {
      this.dim.style.display = 'none';
      cancelAnims(this.dim);
    }, () => undefined);
  }

  /**
   * Yığın (açılan kartlar dahil) koltuğa uçar. Kişiye gelirse: `ids` = yığının bütün kartları (sunucu açıklar);
   * kartlar havada açılır ve sıralı ele oturur (yeni gelenler kısa süre parlar). Rakibe gelirse kapanarak yelpazeye.
   */
  async take(seat: number, ids?: CardId[], onArrive?: (i: number, total: number) => void): Promise<void> {
    const list = this.pile;
    this.pile = [];
    this.clearMarks();
    this.undim();
    if (!list.length) return;
    const {pile} = this.L;
    // toplanma
    await Promise.all(list.map((c, k) => this.fly(c, {x: pile.x + (c.pose.x - pile.x) * 0.12, y: pile.y + (c.pose.y - pile.y) * 0.12 - k * 0.3, r: c.pose.r * 0.25, s: pile.s * 1.02}, {ms: 140, lift: 0, z: 900 + k})));
    this.snd.whoosh(0.5 + Math.min(0.4, list.length * 0.03));
    const total = list.length;
    const step = Math.max(14, Math.min(34, 520 / total));
    let arrived = 0;
    const fl: Promise<void>[] = [];
    if (seat === 0) {
      // kimlikler: açık olanlar kendi kimliğiyle, kapalılar kalan kimliklerden
      const pool = (ids ?? []).slice();
      for (const c of list) if (c.id >= 0) {
        const i = pool.indexOf(c.id);
        if (i >= 0) pool.splice(i, 1);
        else c.id = -1;
      }
      for (const c of list) if (c.id < 0) c.id = pool.shift() ?? -1;
      const merged = this.hand.concat(list.filter(c => c.id >= 0)).sort((a, b) => handOrder(a.id, b.id));
      this.hand = merged;
      const poses = this.handPoses(merged);
      this.updateBar();
      this.onLayout(this.L);
      merged.forEach((c, i) => {
        const z = (i < this.rowOf ? 500 : 600) + i;
        const p = c.sel ? this.selPose(poses[i]) : poses[i];
        if (!list.includes(c)) {
          c.el.style.zIndex = String(z);
          void this.fly(c, p, {ms: 300, lift: 0});
          return;
        }
        const k = list.indexOf(c);
        c.el.classList.add('bl-hand', 'is-new');
        fl.push(this.fly(c, p, {ms: 420, lift: 0.14, delay: k * step, flip: c.id, z: 960 + k, zEnd: z, arc: 0.12, ease: 'cubic-bezier(.45,.05,.3,1)'}).then(() => onArrive?.(arrived++, total)));
      });
      await Promise.all(fl);
      // yeni gelenlerin parıltısı söner
      setTimeout(() => {
        for (const c of list) {
          if (!c.el.classList.contains('is-new')) continue;
          c.ring.animate([{opacity: 1}, {opacity: 0}], {duration: 600, easing: 'ease-in'}).finished.then(() => c.el.classList.remove('is-new'), () => c.el.classList.remove('is-new'));
        }
      }, 900);
    } else {
      const h = this.opp[seat];
      const n0 = h.length;
      for (const c of list) {
        c.id = -1;
        c.sel = false;
        h.push(c);
      }
      const n = h.length;
      h.forEach((c, i) => {
        if (i < n0) void this.fly(c, this.fanPose(seat, i, n), {ms: 300, lift: 0});
      });
      list.forEach((c, k) => {
        const i = n0 + k;
        fl.push(this.fly(c, this.fanPose(seat, i, n), {ms: 400, lift: 0.1, delay: k * step, flip: BACK_INDEX, z: 960 + k, zEnd: 400 + seat * 60 + i, arc: 0.15, ease: 'cubic-bezier(.45,.05,.3,1)'})
          .then(() => onArrive?.(arrived++, total)));
      });
      await Promise.all(fl);
    }
    this.t.setGlow(null);
    const sp = this.seatPoint(seat);
    this.t.pulse('#ffffff', 0.6, sp);
  }

  /** Herkes pas: yığın kenara kayar (kapalı, düzgün deste). */
  async discard(): Promise<void> {
    const list = this.pile;
    this.pile = [];
    this.clearMarks();
    if (!list.length) return;
    this.snd.whoosh(0.4);
    const base = this.out.length;
    await Promise.all(list.map((c, k) => {
      this.out.push(c);
      c.id = -1;
      return this.fly(c, this.outPose(base + k), {ms: 380, lift: 0.06, delay: k * Math.min(22, 300 / list.length), flip: BACK_INDEX, z: 900 + k, zEnd: 150 + base + k, ease: 'cubic-bezier(.4,.1,.3,1)'});
    }));
    this.snd.land(0.3);
  }

  /**
   * Görünüm eşitleme (çevrimiçi/hata durumunda): elim ve rakip sayıları sunucudakiyle aynı değilse sessizce düzelt.
   * Kartlar yığın/kenar/desteden alınır ya da desteye geri konur (ekran dışı).
   */
  sync(mine: CardId[], counts: number[]): void {
    const want = mine.slice().sort(handOrder);
    const have = this.hand.map(c => c.id).join(',');
    if (have !== want.join(',')) {
      const keep = new Map<CardId, BCard>();
      for (const c of this.hand) keep.set(c.id, c);
      const next: BCard[] = [];
      for (const id of want) {
        let c = keep.get(id);
        if (c) keep.delete(id);
        else {
          c = this.deck.pop() ?? this.stealSpare();
          if (!c) continue;
          c.id = id;
          c.el.classList.add('bl-hand');
          this.draw(c, id);
        }
        next.push(c);
      }
      for (const c of keep.values()) this.park(c);
      this.hand = next;
      this.layoutHand(true);
    }
    for (let s = 1; s < this.n; s++) {
      const h = this.opp[s];
      const want2 = counts[s] ?? h.length;
      if (h.length === want2) continue;
      while (h.length > want2) this.park(h.pop()!);
      while (h.length < want2) {
        const c = this.deck.pop() ?? this.stealSpare();
        if (!c) break;
        c.id = -1;
        this.draw(c, BACK_INDEX);
        h.push(c);
      }
      this.layoutFan(s, true);
    }
  }

  private park(c: BCard): void {
    this.dropSel(c);
    c.id = -1;
    this.draw(c, BACK_INDEX);
    this.set(c, {x: -this.L.W, y: this.L.pile.y, r: 0, s: 1}, 1);
    this.deck.push(c);
  }

  private stealSpare(): BCard | undefined {
    return this.out.pop();
  }
}
