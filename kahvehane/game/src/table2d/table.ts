// Pişti Arena — 2B masa: arka plan (tema), kart katmanı, dokunmatik el, 2/4 koltuk yerleşimi, uçuşlar ve masa efektleri.
// Tüm hareket WAAPI ile transform/opacity üzerinden (bileşimci iş parçacığında akar; ana iş parçacığı meşgulken bile akıcı).
// Kart yüzleri: deste atlası tek bir görsele (blob) çevrilir; 52 kart aynı görselden background-position ile kesilir.
// (Kart başına canvas = kart başına ayrı çizim geçişi + 52 GPU tuvali; tek görsel hem bellek hem kare maliyetini düşürür.)
// Efekt düğümleri (kıvılcım, halka, iz, toz) havuzdan gelir; boşta hiçbir JS çalışmaz (yalnız ucuz CSS/WAAPI döngüleri).
import {cancelAnims} from '../platform/anim';
import './table.css';
import {ATLAS_COLS, ATLAS_ROWS, BACK_INDEX, CORNER_RADIUS, type CardAtlas} from '../render/cardAtlas';
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
  /** Kart yüzü: atlas görselinin ilgili hücresini gösteren div */
  readonly cv: HTMLElement;
  readonly hot: HTMLElement;
  id: CardId = -1;
  cell = BACK_INDEX;
  pose: Pose = {x: 0, y: 0, r: 0, s: 1};
  anim: Animation | null = null;
  gold: HTMLElement | null = null;
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'c2';
    this.inn = document.createElement('div');
    this.inn.className = 'c2__in';
    this.cv = document.createElement('div');
    this.cv.className = 'c2__f';
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
/** Atlas hücresinin background-position değeri (800% x 700% boyutlu görselde hücre k, k/(n-1) yüzdesi) */
const CELL_POS: string[] = Array.from({length: BACK_INDEX + 1}, (_, k) => `${(((k % ATLAS_COLS) / (ATLAS_COLS - 1)) * 100).toFixed(4)}% ${((Math.floor(k / ATLAS_COLS) / (ATLAS_ROWS - 1)) * 100).toFixed(4)}%`);

export const SUIT_COLOR: Record<Suit, string> = {H: '#ff2e4d', D: '#ffb400', C: '#16c45b', S: '#1f7bff'};

/** Yığın ışığı gradyanları (closest-side: 100% = katmanın yarıçapı). N = yığın boşken nötr (tema rengi). */
const GLOW: Record<string, string> = {
  N: 'radial-gradient(closest-side, var(--ar-glow-n) 0%, rgba(80, 110, 255, 0) 50%), radial-gradient(closest-side, var(--ar-glow-n) 0%, rgba(60, 90, 255, 0) 100%)',
  H: 'radial-gradient(closest-side, rgba(255, 70, 100, .62) 0%, rgba(255, 46, 77, .22) 44%, rgba(255, 46, 77, 0) 100%)',
  D: 'radial-gradient(closest-side, rgba(255, 200, 60, .6) 0%, rgba(255, 180, 0, .2) 44%, rgba(255, 180, 0, 0) 100%)',
  C: 'radial-gradient(closest-side, rgba(60, 230, 130, .55) 0%, rgba(22, 196, 91, .2) 44%, rgba(22, 196, 91, 0) 100%)',
  S: 'radial-gradient(closest-side, rgba(80, 160, 255, .62) 0%, rgba(31, 123, 255, .22) 44%, rgba(31, 123, 255, 0) 100%)',
};const EASE_OUT = 'cubic-bezier(.2,.75,.25,1)';
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
  /** Pişti sırasının desteye göre dikey kayması (varsayılan 6 px aşağı) */
  py?: number;
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
    cancelAnims(el);
    el.style.display = 'block';
    return el;
  }
  hide(el: HTMLElement): void {
    el.style.display = 'none';
    cancelAnims(el);
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
  /** Halkanın çentikleri (her atışta bir çentik "tık"lar), parlama çizgisi, dışa yayılan çentik halkaları, kart altı ışık */
  private ticks: HTMLElement;
  private ringFlash: HTMLElement;
  private ripples: Pool;
  private blooms = new Map<string, HTMLElement>();
  private ringAnims: Animation[] = [];
  private raysEl: HTMLElement;
  private potEl: HTMLElement;
  private potNum: HTMLElement;
  private potShown = 0;
  private tintEl: HTMLElement;
  private paintEl: HTMLCanvasElement | null = null;
  /** Işın hüzmeleri artık sürekli dönmez (büyük maskeli katmanın her karede yeniden birleştirilmesi pahalıydı); yalnız büyük anlarda kısa dönüş yapar. */
  private raysAngle = 0;
  private raysAnim: Animation | null = null;
  /** Yığın ışığı: iki küçük katman çapraz geçişle renk değiştirir (eskiden 5 dev katmandı; telefon GPU belleğini aşıyordu) */
  private glowEls: HTMLElement[] = [];
  private glowCur = 0;
  private glowKey = '';
  private tintN = 0;
  private active = true;
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
  private paintKey = '';
  private paintTimer = 0;
  /** Deste/yığın değişince HUD'a haber ver (deste rozetinin yeri) */
  onDeck: (count: number, x: number, y: number) => void = () => {};
  /** Yeni Pişti eli kuruldu (reset): masaya eklenen başka oyun katmanları (Blöf) kendini kapatır. */
  onReset: () => void = () => {};

  /** Deste atlası hazır olunca çözülür (açılışta masa boş kartlarla kurulur, atlas arka planda çizilir). */
  ready: Promise<void> = Promise.resolve();
  private atlasTok = 0;
  private atlasUrl = '';
  private paintDirty = false;

  constructor(host: HTMLElement, atlas0: CardAtlas | null, private snd: TableSounds, low: boolean) {
    this.low = low;
    this.root = document.createElement('div');
    this.root.className = 'ar' + (low ? ' is-low' : '');
    this.root.innerHTML = `<div class="ar__bg"></div>
      <div class="ar__glow"></div><div class="ar__glow"></div>
      <div class="ar__tint"></div><div class="ar__rays"></div><div class="ar__pattern"></div><div class="ar__vig"></div><div class="ar__edge"></div>
      <div class="ar__zoom"><div class="ar__shake"><div class="ar__ring"><i class="ar__rf"></i><i class="ar__tk"></i></div><div class="ar__cards"></div><div class="ar__fx"></div>
      <div class="ar__pot"><svg viewBox="0 0 24 24"><path d="M12 22c-4 0-7-2.8-7-6.6 0-3.5 2.3-5.6 3.7-7.6.9-1.3 1.3-2.9 1.2-4.3 2.9 1.4 4.4 4 4.5 6.7.8-.6 1.3-1.6 1.4-2.7 2 1.8 3.1 4.4 3.1 7.1 0 4.2-3 7.4-6.9 7.4z" fill="#ffb21a" stroke="#0a1033" stroke-width="2"/><path d="M12 20c-1.8 0-3.1-1.2-3.1-2.9 0-1.6 1.1-2.6 1.8-3.5.4-.6.6-1.3.6-2 1.4.7 2.3 2 2.3 3.3.4-.3.7-.8.7-1.3 1 .9 1.5 2.1 1.5 3.4 0 1.7-1.6 3-3.8 3z" fill="#fff27a"/></svg><b>0</b></div></div></div>`;
    host.append(this.root);
    this.zoomEl = this.root.querySelector('.ar__zoom')!;
    this.shakeEl = this.root.querySelector('.ar__shake')!;
    this.cardsEl = this.root.querySelector('.ar__cards')!;
    this.fxEl = this.root.querySelector('.ar__fx')!;
    this.ring = this.root.querySelector('.ar__ring')!;
    this.ticks = this.ring.querySelector('.ar__tk')!;
    this.ringFlash = this.ring.querySelector('.ar__rf')!;
    this.raysEl = this.root.querySelector('.ar__rays')!;
    this.potEl = this.root.querySelector('.ar__pot')!;
    this.potNum = this.potEl.querySelector('b')!;
    this.tintEl = this.root.querySelector('.ar__tint')!;
    this.glowEls = Array.from(this.root.querySelectorAll<HTMLElement>('.ar__glow'));
    (this.root.querySelector('.ar__pattern') as HTMLElement).style.backgroundImage = patternUrl();
    this.root.style.setProperty('--c2-r', `${(CORNER_RADIUS * 100).toFixed(1)}% / ${(CORNER_RADIUS * 70).toFixed(1)}%`);
    this.sparks = new Pool(this.fxEl, 'ar__spark', low ? 24 : 48);
    this.pulses = new Pool(this.fxEl, 'ar__pulse', 6);
    this.ghosts = new Pool(this.cardsEl, 'ar__ghost', 6);
    this.puffs = new Pool(this.fxEl, 'ar__puff', 10);
    this.ripples = new Pool(this.ring, 'ar__rt', 3);
    for (let i = 0; i < 52; i++) {
      const c = new Card();
      this.all.push(c);
      this.cardsEl.append(c.el);
      this.draw(c, BACK_INDEX);
    }
    this.root.style.setProperty('--c2-bs', `${ATLAS_COLS * 100}% ${ATLAS_ROWS * 100}%`);
    this.layout();
    this.setGlow(null);
    if (atlas0) void this.setAtlas(atlas0);
    window.addEventListener('resize', () => this.relayout());
    window.visualViewport?.addEventListener('resize', () => this.relayout());
    this.cardsEl.addEventListener('pointerdown', this.down);
    window.addEventListener('pointermove', this.move, {passive: true});
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
  }

  // ───────── tema / deste ─────────

  /**
   * Yeni deste atlası: PNG'ye kodlanır (tarayıcı ana iş parçacığını bölmeden, ~0,2 sn) ve tek görsel olarak bütün kartlara
   * CSS değişkeniyle verilir; kartları yeniden çizmek gerekmez. Eski görsel, yeni kartlara geçildikten sonra serbest kalır.
   */
  async setAtlas(atlas: CardAtlas): Promise<void> {
    const tok = ++this.atlasTok;
    const blob = await new Promise<Blob | null>(res => atlas.canvas.toBlob(res, 'image/png'));
    if (tok !== this.atlasTok || !blob) return; // daha yeni bir atlas geldi
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode(); // çözme iş parçacığı dışında; ilk kare beklemesin
    } catch {
      /* decode desteklenmiyorsa tembel çözülür */
    }
    if (tok !== this.atlasTok) {
      URL.revokeObjectURL(url);
      return;
    }
    const old = this.atlasUrl;
    this.atlasUrl = url;
    this.root.style.setProperty('--c2-atlas', `url("${url}")`);
    if (old) setTimeout(() => URL.revokeObjectURL(old), 4000);
    atlas.canvas.width = atlas.canvas.height = 0; // atlas tuvalinin bellek payı hemen geri verilir
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
      this.paintKey = '';
      this.paintEl?.remove();
      this.paintEl = null;
    }
  }

  private repaint(): void {
    const t = this.theme;
    if (!t?.paint) return;
    if (!this.active) {
      this.paintDirty = true; // menülerde boyalı zemin çizilmez; masa açılınca çizilir
      return;
    }
    const w = this.root.clientWidth || innerWidth, h = this.root.clientHeight || innerHeight;
    const dpr = Math.min(this.low ? 1.5 : 2, window.devicePixelRatio || 1);
    // aynı tema + aynı boyut: yeniden çizme (adres çubuğu oynaması gibi küçük değişimlerde de tuval gerilir)
    const key = `${t.id}|${Math.round(w / 8)}|${Math.round(h / 8)}|${dpr}`;
    if (key === this.paintKey && this.paintEl) return;
    this.paintKey = key;
    const tok = ++this.paintTok;
    Promise.resolve(t.paint(w, h, dpr)).then(cv => {
      if (tok !== this.paintTok || this.theme !== t) return;
      cv.classList.add('ar__paint');
      if (this.paintEl && this.paintEl !== cv) this.paintEl.replaceWith(cv);
      else if (!this.paintEl) this.root.querySelector('.ar__bg')!.after(cv);
      this.paintEl = cv;
    }, err => {
      if (tok === this.paintTok) this.paintKey = '';
      console.warn('masa zemini çizilemedi', err);
    });
  }

  // ───────── düzen ─────────
  private layout(): void {
    const W = this.root.clientWidth || innerWidth, H = this.root.clientHeight || innerHeight;
    const cw = Math.round(Math.min(W * 0.215, H * 0.112));
    const ch = Math.round(cw / 0.7);
    const handW = Math.min(W * 0.245, H * 0.138);
    const handH = handW / 0.7;
    const pileY = H * 0.455;
    const sx = Math.max(cw * 0.6, W * 0.15);
    const hand = {x: W * 0.61, y: H - handH / 2 - Math.max(14, H * 0.022), s: handW / cw, maxW: W * 0.68};
    // HUD birimi (theme.css --u ile aynı formül) ve "Sıra sende / Bu kartla alabilirsin!" ipucu bandı: elin hemen üstünde,
    // kalkmış (sıra 8 px + basılı 14 px + %3 büyüme) ve kıpırdayan kartın da üstünde, nefes payıyla. Bu bandın üstüne
    // (clear çizgisinin altına) hiçbir masa öğesi inmez: ipucu hiçbir zaman karta ya da desteye binmez.
    const u = Math.min(22, Math.max(12, Math.min(W * 0.04, H * 0.02)));
    const handTop = hand.y - handH / 2;
    const hintBottom = handTop - (22 + handH * 0.035) - u * 0.45;
    const clear = hintBottom - u * 2.65 - u * 0.4;
    const edge = Math.max(7, W * 0.018) + 4; // ekran kenarı payı (+ destenin -5° eğikliği)
    // ipucu hapı elin ortasına hizalı; en uzun metin ("Kartına dokun, masaya gitsin" ≈ 18,7u) ekrandan taşmasın
    const half = u * 9.5;
    const maxX = W - half - Math.max(6, W * 0.015);
    // deste sayacı hapı kartın alt kenarına biner (yarısı dışarıda): dikeyde ~0,8u taşar
    const pillOut = u * 0.8;
    let seats: SeatGeo[];
    let deck: {x: number; y: number; s: number};
    let hintX = Math.max(half + 6, Math.min(hand.x, maxX));
    if (this.n === 2) {
      // kalan deste sol kenara çekilir (halka ile arasında nefes payı), biraz küçük: ortadaki sahne öne çıkar
      const ds = 0.9;
      deck = {x: edge + (cw * ds) / 2, y: pileY, s: ds};
      seats = [
        {fan: {x: hand.x, y: hand.y, a: 0, s: hand.s, spread: 0}, stack: {x: W - sx, y: Math.min(H * 0.655, clear - (ch * 0.78) / 2 - 5), s: 0.78, r: 8}, pdir: -1},
        {fan: {x: W / 2, y: H * 0.235, a: 180, s: 0.62, spread: cw * 0.5}, stack: {x: W - sx, y: H * 0.27, s: 0.78, r: -8}, pdir: -1},
      ];
    } else {
      const fs = Math.min(0.56, Math.max(0.46, (H * 0.075) / ch));
      const fh = ch * fs;
      const side = Math.max(fh * 0.36, Math.min(W * 0.1, fh * 0.62));
      const ss = 0.6;
      const sideStackX = Math.max(cw * ss * 0.7, W * 0.12);
      // yan rakibin destesi yelpazesinin hemen altında (eskiden sabit %60,5: uzun ekranda boşluk, kısa ekranda desteye yer kalmıyordu)
      const fanBottom = H * 0.455 + 1.5 * cw * fs * 0.62 + (cw * fs) / 2 + 4;
      const sideY = Math.min(H * 0.605, fanBottom + u * 0.45 + (ch * ss) / 2 + 3);
      // kalan deste sol kenarda, yan rakibin destesi ile benim rozetim arasında (ortadaki sahne boş kalır); yer daralırsa küçülür
      const slotTop = sideY + (ch * ss) / 2 + 3 + u * 0.45;
      const slotBot = H - u * 10.1 - u * 0.3; // alt rozet (kafa taşması dahil)
      const need = (s: number) => ch * s + 10.9 * s + pillOut; // kart + 26 kartlık yığın kayması + hap taşması
      // deste ipucu hapının solunda kalır: hap sağa kayar (en çok maxX), sığmazsa deste küçülür
      const byHint = (maxX - half - 5 - 4 - edge) / cw;
      const ds = Math.max(0.56, Math.min(0.8, byHint, (slotBot - slotTop - pillOut) / (ch + 10.9)));
      const top = slotTop + Math.max(0, (slotBot - slotTop - need(ds)) / 2);
      deck = {x: edge + (cw * ds) / 2, y: top + 10.9 * ds + (ch * ds) / 2, s: ds};
      hintX = Math.min(maxX, Math.max(hintX, edge + cw * ds + 4 + 5 + half));
      // benim destem halkanın sağ altında, ipucu bandının üstünde; pişti kartları ortaya (sola) dizilir: sağdaki rakibin destesine binmez
      const ms = 0.66;
      const myY = clear - (ch * ms) / 2 - 5;
      // sağdaki rakibin pişti sırası (sola, biraz yukarı) ile aynı yüksekliğe denk gelirse destem sola kayar —
      // ama pişti sıram (solda) halkaya girmeyecek kadar (kısa ekranda yer yoksa en az çakışma)
      const py = -ch * ss * 0.18, ph = ch * ss * 0.94;
      const rightPistiL = W - sideStackX - cw * ss * 0.5 - 12 - (cw * ss * 0.94) / 2 - ph * 0.16;
      const myTop = myY - (ch * ms) / 2 - 4, R = cw * 2.25 * 0.47;
      let myX = Math.min(W - cw * 0.6, W * 0.71);
      if (myTop < sideY + py + ph / 2 + 4) {
        const ringOk = (x: number) => myTop > pileY + R + 4 || x - cw * ms * 1.55 > W / 2 + Math.sqrt(Math.max(0, R * R - (myTop - pileY) ** 2)) + 4;
        const want = rightPistiL - 6 - (cw * ms) / 2 - 4;
        for (let x = Math.min(myX, want); x <= myX; x += 2) if (ringOk(x)) { myX = x; break; }
      }
      seats = [
        {fan: {x: hand.x, y: hand.y, a: 0, s: hand.s, spread: 0}, stack: {x: myX, y: myY, s: ms, r: 8}, pdir: -1},
        {fan: {x: W - side, y: H * 0.455, a: -90, s: fs, spread: cw * fs * 0.62}, stack: {x: W - sideStackX, y: sideY, s: ss, r: -6}, pdir: -1, py},
        {fan: {x: W / 2, y: H * 0.2, a: 180, s: fs, spread: cw * fs * 0.62}, stack: {x: Math.min(W - cw * 0.9, W / 2 + cw * 1.45), y: H * 0.2, s: ss, r: 6}, pdir: 1},
        {fan: {x: side, y: H * 0.455, a: 90, s: fs, spread: cw * fs * 0.62}, stack: {x: sideStackX, y: sideY, s: ss, r: 6}, pdir: 1, py},
      ];
    }
    this.L = {W, H, cw, ch, pile: {x: W / 2, y: pileY}, deck, hand, seats};
    this.pillDy = -u * 0.15;
    // ipucu hapının yeri HUD'a CSS değişkeniyle (hud.css: var(--kh-hint-bottom…)); Blöf kendi yerini kullanır
    const hb = `${Math.max(0, H - hintBottom).toFixed(1)}px`, hx = `${hintX.toFixed(1)}px`;
    const rs = document.documentElement.style;
    if (rs.getPropertyValue('--kh-hint-bottom') !== hb || rs.getPropertyValue('--kh-hint-x') !== hx) {
      rs.setProperty('--kh-hint-bottom', hb);
      rs.setProperty('--kh-hint-bottom4', hb);
      rs.setProperty('--kh-hint-x', hx);
    }
    for (const c of this.all) {
      c.el.style.width = cw + 'px';
      c.el.style.height = ch + 'px';
    }
    this.root.style.setProperty('--cw', cw + 'px');
    this.root.style.setProperty('--ch', ch + 'px');
    this.bakeShadows(cw, ch);
    const rd = cw * 2.25;
    Object.assign(this.ring.style, {width: rd + 'px', height: rd + 'px', left: W / 2 - rd / 2 + 'px', top: pileY - rd / 2 + 'px'});
    this.potEl.style.transform = `translate3d(${(W / 2 + rd * 0.36).toFixed(1)}px,${(pileY - rd * 0.36).toFixed(1)}px,0) translate(-50%,-50%)`;
    for (const g of this.glowEls) g.style.top = pileY + 'px';
    this.raysEl.style.top = pileY + 'px';
    this.tintEl.style.top = pileY + 'px';
  }

  private shadowKey = '';

  /**
   * Kart gölgeleri tek seferlik pişirilmiş görsel olarak (52 kartın her biri için canlı box-shadow + yuvarlak kırpma
   * ayrı çizim geçişi demekti). Kartın saydam köşeleri atlasta zaten var, canvas'a border-radius gerekmez.
   * İki görsel: normal (elde/masada) ve yassı (yığında). Kenar payı --c2-p.
   */
  private bakeShadows(cw: number, ch: number): void {
    const key = `${cw}x${ch}`;
    if (key === this.shadowKey) return;
    this.shadowKey = key;
    const P = Math.ceil(cw * 0.26);
    const S = 2; // 2× çözünürlük: sert alt kenar ölçeklenince bulanmasın
    const make = (layers: Array<[number, number, number, string]>): string => {
      const cv = document.createElement('canvas');
      cv.width = (cw + 2 * P) * S;
      cv.height = (ch + 2 * P) * S;
      const g = cv.getContext('2d');
      if (!g) return '';
      g.scale(S, S);
      const r = cw * CORNER_RADIUS;
      const OFF = 4000; // şekil tuvalin dışında, yalnız gölgesi içeri düşer
      for (const [dy, blur, , col] of layers) {
        g.save();
        g.shadowColor = col;
        g.shadowBlur = blur * S;
        g.shadowOffsetX = OFF * S;
        g.shadowOffsetY = dy * S;
        g.fillStyle = '#000';
        g.beginPath();
        if (g.roundRect) g.roundRect(P - OFF, P, cw, ch, r);
        else g.rect(P - OFF, P, cw, ch); // eski WebView: köşeler gölgede keskin kalır, kartın kendisi yine yuvarlak
        g.fill();
        g.restore();
      }
      return `url(${cv.toDataURL('image/png')})`;
    };
    this.root.style.setProperty('--c2-p', P + 'px');
    this.root.style.setProperty('--c2-sh', make([[2, 0, 0, 'rgba(4,8,40,.35)'], [6, 14, 0, 'rgba(2,4,30,.45)']]));
    this.root.style.setProperty('--c2-sh-flat', make([[1, 0, 0, 'rgba(4,8,40,.4)'], [2, 5, 0, 'rgba(2,4,30,.35)']]));
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
    c.cv.style.backgroundPosition = CELL_POS[cell];
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
   * havada dönüş (spin: 360'ın katı olmalı, yoksa sonda sıçrar) ve hayalet iz (trail: renk).
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
    return {x: s.x + g.pdir * (this.L.cw * s.s * 0.5 + i * 12), y: s.y + (g.py ?? 6), r: g.pdir * (14 + i * 4), s: s.s * 0.94};
  }

  /** Deste sayacı hapının kartın alt kenarına göre dikey kayması (hap kenara biner) */
  private pillDy = 0;

  private emitDeck(): void {
    const d = this.deckPose(this.deck.length - 1);
    this.onDeck(this.deck.length, this.L.deck.x, d.y + (this.L.ch * this.L.deck.s) / 2 + this.pillDy);
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
    if (k !== this.glowKey) {
      this.glowKey = k;
      const prev = this.glowEls[this.glowCur];
      this.glowCur = 1 - this.glowCur;
      const next = this.glowEls[this.glowCur];
      next.style.background = GLOW[k];
      next.style.setProperty('--go', k === 'N' ? '.72' : '1');
      next.classList.add('is-on');
      prev.classList.remove('is-on');
    }
    if (suit) this.ring.style.setProperty('--ring', SUIT_COLOR[suit]);
    else this.ring.style.removeProperty('--ring');
  }

  /** Masayı aç/kapat: ana ekran, açılış, market gibi ekranlar üstteyken kapalı (hiç çizilmez, GPU belleği boşalır). */
  setActive(on: boolean): void {
    if (on === this.active) return;
    this.active = on;
    this.root.classList.toggle('is-off', !on);
    if (on) {
      if (this.paintDirty) {
        this.paintDirty = false;
        this.repaint();
      }
      this.relayout();
    }
  }

  /** Hüzmeler bir an döner ve yavaşça durur (pişti, büyük an). Boşta hiç animasyon yok. */
  boostRays(k = 10, ms = 1200): void {
    if (this.low || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = this.raysEl;
    this.raysAnim?.cancel();
    const from = this.raysAngle, to = from + k * 4.5;
    this.raysAngle = to;
    const a = el.animate([{transform: `rotate(${from}deg)`}, {transform: `rotate(${to}deg)`}], {duration: ms * 1.6, easing: 'cubic-bezier(.12,.75,.25,1)', fill: 'forwards'});
    this.raysAnim = a;
    a.finished.then(() => {
      if (this.raysAnim !== a) return;
      el.style.transform = `rotate(${to}deg)`;
      a.cancel();
      this.raysAnim = null;
    }, () => undefined);
  }

  /** Zemine renkli ışık dalgası (yalnız opaklık). */
  tint(color: string, peak = 0.75, ms = 700): void {
    const el = this.tintEl;
    el.style.display = 'block';
    el.style.background = `radial-gradient(closest-side, ${color} 0%, ${color}66 48%, ${color}00 100%)`;
    this.tintN++;
    const done = () => {
      if (--this.tintN <= 0) el.style.display = 'none'; // boşta katman tutma
    };
    el.animate([{opacity: 0, transform: 'scale(.6)'}, {opacity: peak, transform: 'scale(1)', offset: 0.18}, {opacity: 0, transform: 'scale(1.25)'}],
      {duration: ms, easing: 'cubic-bezier(.2,.7,.3,1)'}).finished.then(done, done);
  }

  /** Büyük kazan: yığında 5+ kart varken yığın halkası kızışır ve yanında alevli sayaç görünür (büyük yığın = büyük ödül). */
  private syncPot(): void {
    const n = this.pile.length;
    const on = n >= 5;
    this.ring.classList.toggle('is-pot', on);
    // tek kart: pişti kokusu (halka hızlı nabız)
    this.ring.classList.toggle('is-lone', n === 1);
    if (!on) {
      if (this.potShown) this.potEl.classList.remove('is-on');
      this.potShown = 0;
      return;
    }
    this.potNum.textContent = String(n);
    if (!this.potShown) this.potEl.classList.add('is-on');
    (this.potEl.firstElementChild as HTMLElement).animate([{transform: 'scale(1.5) rotate(-10deg)'}, {transform: 'none'}], {duration: 320, easing: 'cubic-bezier(.3,1.6,.5,1)'});
    this.potShown = n;
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

  /**
   * Yığın halkasının atışa tepkisi (yalnız transform/opacity, havuzlu düğümler, döngü yok; hepsi ≤ ~0,4 sn, pişti ≤ 0,75 sn).
   * lvl: 0 sıradan atış · 1 alış · 2 büyük alış (6+ kart) · 3 pişti · 4 vale pişti. Her seviye bir öncekinin üstüne ekler:
   * halka "vurulur" (yaylanarak büyür), çentikler bir çentik tıklar (alışta 2, piştide tam tur), kartın altından takım renginde
   * ışık açılır, çentik halkası dışa dalgalanır (alışta 2, piştide 3 + şok halkası). Yığın büyüdükçe atış tepkisi de büyür.
   * Düşük cihaz: yalnız halka vuruşu + ışık (çentik dalgası, tık ve parlama yok). Hareket azaltma tercihinde yalnız ışık.
   */
  ringHit(lvl: number, suit: Suit | null): void {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pileK = Math.min(1, Math.max(0, this.pile.length - 2) / 8); // 0 → 1: yığın kızıştıkça
    const k = lvl === 0 ? 1 + 0.45 * pileK : [1, 1.45, 1.75, 2.1, 2.5][lvl];
    this.stopRing();
    // 1) kart altı ışık (takım renginde; alış ve piştide altın-beyaz)
    const key = lvl >= 1 ? 'G' : suit ?? 'N';
    const bl = this.bloom(key);
    bl.style.display = 'block';
    const peak = Math.min(1, 0.78 + 0.1 * lvl + 0.15 * pileK);
    const bms = lvl >= 3 ? 640 : lvl >= 1 ? 480 : 380;
    bl.animate([{transform: 'scale(.5)', opacity: 0}, {transform: `scale(${(0.92 + 0.06 * k).toFixed(3)})`, opacity: peak, offset: 0.2}, {transform: `scale(${(1.02 + 0.1 * k).toFixed(3)})`, opacity: 0}],
      {duration: bms, easing: 'cubic-bezier(.2,.7,.3,1)'}).finished.then(() => (bl.style.display = 'none'), () => undefined);
    if (reduce) return;
    // 2) halka vuruşu: hızlı büyür, hafif içe sekip yerine oturur
    const s1 = 1 + 0.045 * k, s2 = 1 - 0.014 * k;
    const ms = lvl >= 3 ? 560 : lvl >= 1 ? 440 : 360;
    this.ringAnims.push(this.ring.animate([{transform: 'scale(1)'}, {transform: `scale(${s1.toFixed(3)})`, offset: 0.22}, {transform: `scale(${s2.toFixed(3)})`, offset: 0.55}, {transform: 'scale(1)'}],
      {duration: ms, easing: 'cubic-bezier(.25,.7,.35,1)'}));
    if (this.low) return;
    // 3) çentikler: kadran gibi tık (desen 15°'de bir tekrarlar → sonda yerine oturmuş görünür, açı saklanmaz)
    const notches = lvl === 0 ? 1 : lvl === 1 ? 2 : lvl === 2 ? 3 : lvl === 3 ? 12 : 24;
    const deg = notches * 15;
    const over = lvl >= 3 ? 0 : 2.5;
    this.ringAnims.push(this.ticks.animate([
      {transform: 'rotate(0deg) scale(1)', opacity: 0.7},
      {transform: `rotate(${(deg * 0.72).toFixed(1)}deg) scale(${(1 + 0.03 * k).toFixed(3)})`, opacity: 1, offset: 0.3},
      {transform: `rotate(${(deg + over).toFixed(1)}deg) scale(1)`, opacity: 0.85, offset: 0.7},
      {transform: `rotate(${deg}deg) scale(1)`, opacity: 0.7},
    ], {duration: lvl >= 3 ? 760 : ms + 40, easing: lvl >= 3 ? 'cubic-bezier(.15,.8,.25,1)' : 'cubic-bezier(.3,.7,.3,1)'}));
    // 4) halka çizgisi parlar (beyaz, takım renginde ışıma)
    const rf = this.ringFlash;
    rf.style.color = lvl >= 1 ? '#ffe9a0' : suit ? SUIT_COLOR[suit] : '#cfd8ff';
    rf.style.display = 'block';
    const fa = rf.animate([{opacity: 0, transform: 'scale(.97)'}, {opacity: Math.min(1, 0.7 + 0.1 * lvl), transform: `scale(${(1 + 0.012 * k).toFixed(3)})`, offset: 0.18}, {opacity: 0, transform: `scale(${(1.02 + 0.02 * k).toFixed(3)})`}],
      {duration: ms + 60, easing: 'ease-out'});
    fa.finished.then(() => (rf.style.display = 'none'), () => undefined);
    this.ringAnims.push(fa);
    // 5) dışa dalgalanan çentik halkaları (alış/piştide birden çok, gecikmeli)
    const waves = lvl === 0 ? 1 : lvl <= 2 ? 2 : 3;
    for (let i = 0; i < waves; i++) {
      const el = this.ripples.get();
      const to = 1.18 + 0.1 * k + i * 0.14;
      el.animate([{transform: 'rotate(0deg) scale(1)', opacity: 0.9 - i * 0.18}, {transform: `rotate(${7.5 + i * 7.5}deg) scale(${to.toFixed(3)})`, opacity: 0}],
        {duration: (lvl >= 3 ? 620 : 400) + i * 60, delay: i * 85, easing: 'cubic-bezier(.15,.65,.3,1)', fill: 'backwards'}).finished.then(() => this.ripples.hide(el), () => undefined);
    }
    // 6) alış ve pişti: halkanın dışına ince şok dalgası (pişti zaten impact() ile büyük patlar)
    if (lvl === 1 || lvl === 2) setTimeout(() => this.pulse('#fff6d0', lvl === 2 ? 1.75 : 1.4), 70);
  }

  /** Toplama başlarken halka "nefes alır": içe çekilir, çentikler geri sarılır, yerine yaylanır. */
  private ringInhale(): void {
    if (this.low || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.stopRing();
    this.ringAnims = [
      this.ring.animate([{transform: 'scale(1)'}, {transform: 'scale(.94)', offset: 0.35}, {transform: 'scale(1.015)', offset: 0.75}, {transform: 'scale(1)'}], {duration: 460, easing: 'cubic-bezier(.3,.6,.3,1)'}),
      this.ticks.animate([{transform: 'rotate(0deg) scale(1)', opacity: 0.7}, {transform: 'rotate(-30deg) scale(.96)', opacity: 0.45, offset: 0.45}, {transform: 'rotate(-45deg) scale(1)', opacity: 0.7}], {duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)'}),
    ];
  }

  private stopRing(): void {
    for (const a of this.ringAnims) a.cancel();
    this.ringAnims = [];
    this.ringFlash.style.display = 'none';
  }

  /** Kart altı ışık katmanı (renk başına bir kez çizilir; sonra yalnız transform/opacity). */
  private bloom(key: string): HTMLElement {
    let el = this.blooms.get(key);
    if (!el) {
      el = document.createElement('b');
      el.className = 'ar__rb';
      const c = key === 'G' ? '255, 226, 140' : key === 'N' ? '170, 190, 255' : {H: '255, 70, 100', D: '255, 196, 60', C: '70, 230, 140', S: '90, 160, 255'}[key]!;
      // beyaz çekirdek kartın kenarlarından taşar (kartın altından sızan ışık), dışı takım renginde söner
      el.style.background = `radial-gradient(closest-side, rgba(255, 255, 255, .95) 0%, rgba(255, 252, 240, .7) 30%, rgba(${c}, .55) 44%, rgba(${c}, .2) 62%, rgba(${c}, 0) 80%)`;
      this.ring.prepend(el);
      this.blooms.set(key, el);
    }
    cancelAnims(el);
    return el;
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
    this.onReset();
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
      cancelAnims(c.inn);
      if (c.cell !== BACK_INDEX) this.draw(c, BACK_INDEX);
      const p = this.deckPose(i);
      this.set(c, {...p, x: p.x - this.L.W * 0.7, r: p.r - 25}, 100 + i);
    });
    this.setGlow(null);
    this.syncPot();
    // deste sayacı karıştırma bitince görünür
    this.onDeck(0, this.L.deck.x, this.L.deck.y);
  }

  /**
   * Karıştırma gösterisi (masanın ortasında): deste dönerek gelir, ikiye ayrılıp fermuar gibi harmanlanır,
   * köprü kurup şelale gibi akar, sonra deste yerine kayar (~1.4 sn; sfx.shuffle ile aynı uzunlukta).
   */
  async intro(): Promise<void> {
    const n = this.deck.length;
    const {pile, cw, ch} = this.L;
    const cp = (i: number): Pose => {
      const k = Math.min(i, 26);
      return {x: pile.x - k * 0.12, y: pile.y - k * 0.42, r: -3 + Math.sin(i * 3.7) * 0.8, s: 1.06};
    };
    // 1) geliş
    await Promise.all(this.deck.map((c, i) => this.fly(c, cp(i), {ms: 330, lift: 0.05, delay: i * 1.5, ease: 'cubic-bezier(.2,.9,.3,1.1)', spin: 360, z: 100 + i})));
    // 2) ikiye ayrıl
    const half = n >> 1;
    await Promise.all(this.deck.map((c, i) => {
      const p = cp(i % half);
      p.x += (i < half ? -1 : 1) * cw * 0.58;
      p.y -= 8;
      p.r += i < half ? -14 : 14;
      return this.fly(c, p, {ms: 130, lift: 0.02});
    }));
    // 3) fermuar harmanı: iki yarıdan sırayla birer kart
    const order: Card[] = [];
    for (let k = 0; k < half; k++) order.push(this.deck[k], this.deck[k + half]);
    if (n % 2) order.push(this.deck[n - 1]);
    this.deck = order;
    await Promise.all(order.map((c, i) => this.fly(c, cp(i), {ms: 120, lift: 0, delay: i * 2.2, z: 100 + i, ease: 'cubic-bezier(.4,0,.6,1)'})));
    // 4) köprü: deste yay gibi bükülür, sonra yukarıdan aşağı şelale gibi akar
    await Promise.all(order.map((c, i) => {
      const u = i / (n - 1);
      const p = cp(i);
      return this.fly(c, {x: pile.x + (u - 0.5) * cw * 1.5, y: p.y - Math.sin(u * Math.PI) * ch * 0.42, r: (u - 0.5) * 34, s: 1.06}, {ms: 150, lift: 0, ease: 'cubic-bezier(.3,.7,.4,1)'});
    }));
    await Promise.all(order.map((c, i) => this.fly(c, cp(i), {ms: 140, lift: 0, delay: (n - 1 - i) * 1.6, ease: 'cubic-bezier(.5,0,.75,0)'})));
    // 5) deste yerine kayar
    await Promise.all(order.map((c, i) => this.fly(c, this.deckPose(i), {ms: 240, lift: 0.04, delay: i * 1, ease: 'cubic-bezier(.3,.8,.3,1.05)'})));
    this.emitDeck();
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
      const f = this.fly(c, to, {ms: 300, lift: 0.18, flip: faceUp[k] ? c.id : undefined, z: 950, zEnd: 300 + this.pile.length, spin: k % 2 ? 360 : -360});
      this.emitDeck();
      if (k === cards.length - 1) {
        await f;
        this.landFx(c, 0.6);
        this.ringHit(0, suitOf(c.id));
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
      } else fl.push(this.fly(c, this.fanPose(d.seat, i, cnt[d.seat]), {ms: 320, lift: 0.1, z: 950, zEnd: 400 + d.seat * 10 + i, spin}));
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
    const jack = isJack(card);
    // halka tepkisinin seviyesi: kural motoruyla aynı koşul (yalnız görsel; puanı motor verir)
    const prev = this.pile.length;
    const same = !!under && rankOf(under.id) === rankOf(card);
    const lvl = prev > 0 && (jack || same) ? (prev === 1 && same ? (jack ? 4 : 3) : prev + 1 >= 6 ? 2 : 1) : 0;
    this.pile.push(c);
    const to = this.pilePose(this.pile.length);
    this.snd.whoosh(seat === 0 ? 0.75 : 0.55);
    if (seat === 0) this.layoutHand(true);
    else list.forEach((x, i) => void this.fly(x, this.fanPose(seat, i, list.length), {ms: 220, lift: 0}));
    await this.fly(c, to, {ms: seat === 0 ? 250 : 320, lift: 0.22, flip: seat === 0 ? undefined : card, z: 960, zEnd: 300 + this.pile.length,
      ease: 'cubic-bezier(.25,.6,.3,1)', trail: SUIT_COLOR[suitOf(card)]});
    this.snd.land(jack ? 0.95 : 0.7);
    this.landFx(c, jack ? 1.3 : 0.85);
    this.ringHit(lvl, suitOf(card));
    // alttaki kart çarpmanın etkisiyle hafifçe itilir
    if (under) {
      const ax = rnd(-1, 1) * 4, ay = rnd(0.4, 1) * 4;
      void under.inn.animate([{transform: 'none'}, {transform: `translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px) rotate(${(ax * 0.6).toFixed(1)}deg)`, offset: 0.3}, {transform: 'none'}], {duration: 260, easing: 'ease-out'});
    }
    if (jack) this.shake(0.25);
    this.setGlow(suitOf(card));
    this.syncPot();
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
    cancelAnims(c.gold);
    cancelAnims(c.gold.firstElementChild as HTMLElement);
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
    this.syncPot();
    const st = this.stacks[seat];
    const {pile} = this.L;
    // 1) toplanma: kartlar yığın merkezine sıkışır, halka nefes alır
    this.ringInhale();
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
