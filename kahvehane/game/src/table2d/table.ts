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
import {ctx2d, glowRing, radial, texCanvas, ticks, withAlpha} from '../platform/tex';
import {whenIdle} from '../platform/sched';

export interface TableSounds {
  deal(): void;
  land(impact: number): void;
  flip(): void;
  slide(): void;
  whoosh(p: number): void;
}

export interface Pose {
  x: number;
  y: number;
  r: number; // derece
  s: number;
}

export class Card {
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
/** Atlas hücresinin background-position değeri (800% x 700% boyutlu görselde hücre k, k/(n-1) yüzdesi) */
const CELL_POS: string[] = Array.from({length: BACK_INDEX + 1}, (_, k) => `${(((k % ATLAS_COLS) / (ATLAS_COLS - 1)) * 100).toFixed(4)}% ${((Math.floor(k / ATLAS_COLS) / (ATLAS_ROWS - 1)) * 100).toFixed(4)}%`);

export const SUIT_COLOR: Record<Suit, string> = {H: '#ff2e4d', D: '#ffb400', C: '#16c45b', S: '#1f7bff'};

/** Yığın ışığı gradyanları (closest-side: 1 = katmanın yarıçapı). N = yığın boşken nötr (tema rengi, setGlow'da çizilir).
 * Küçük doku tuvaline çizilir (bkz. src/platform/tex.ts): ekranın %80'ini kaplayan iki ışık katmanı karo belleği tutmaz. */
const GLOW: Record<string, ReadonlyArray<readonly [number, string]>> = {
  H: [[0, 'rgba(255, 70, 100, .62)'], [0.44, 'rgba(255, 46, 77, .22)'], [1, 'rgba(255, 46, 77, 0)']],
  D: [[0, 'rgba(255, 200, 60, .6)'], [0.44, 'rgba(255, 180, 0, .2)'], [1, 'rgba(255, 180, 0, 0)']],
  C: [[0, 'rgba(60, 230, 130, .55)'], [0.44, 'rgba(22, 196, 91, .2)'], [1, 'rgba(22, 196, 91, 0)']],
  S: [[0, 'rgba(80, 160, 255, .62)'], [0.44, 'rgba(31, 123, 255, .22)'], [1, 'rgba(31, 123, 255, 0)']],
};
/** Tema değişkenlerinin varsayılanları (table.css .ar ile aynı) */
const GLOW_N = 'rgba(110, 140, 255, .55)';
const RAYS_C = 'rgba(255, 255, 255, .075)';
const EASE_OUT = 'cubic-bezier(.2,.75,.25,1)';
const OUT = 'cubic-bezier(.2,.8,.3,1)';
/** Çok kareli animasyonda yumuşatma her aralığa ayrı (WAAPI tek easing'i tüm zaman çizelgesine uygular, tepe noktası kayar). */
const seg = (kf: Keyframe[], e: string[]): Keyframe[] => kf.map((k, i) => (i < kf.length - 1 ? {...k, easing: e[Math.min(i, e.length - 1)]} : k));
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
  /** Verilirse pişti kartları yanına değil dikey dizilir: +1 yığının altına, -1 üstüne (yatayda yer olmayan üst koltuk, 1'e 1) */
  pv?: number;
  /** Pişti sırasının (kart sayısı - 1) adımına ayrılan en çok yer (px). Kart çoğalınca adım daralır: sıra yelpaze/halka/komşu öğelere taşmaz. */
  pspan?: number;
  /** İlk pişti kartının yığına göre ek dış kayması (kart genişliği cinsinden). 0: kartın ortası yığının kenarında (yarısı altında); +0,5: yığının hemen yanında. */
  padj?: number;
  /** Yeni pişti kartı üstte (varsayılan: ilk kart üstte, sonrakiler altına girer). Dikey sıra hep böyle. */
  pnew?: boolean;
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
  /** "+N" yazısının yükselirken çıkabileceği en üst y (duraklat / sohbet düğmelerinin altı) */
  popTop: number;
}

/** Havuz: sabit sayıda düğüm; boşta olan tekrar kullanılır (yeni düğüm üretilmez). tag 'canvas': doku katmanı düğümü. */
class Pool {
  private items: HTMLElement[] = [];
  private i = 0;
  constructor(private host: HTMLElement, private cls: string, private max: number, private tag: 'i' | 'canvas' = 'i') {}
  get(): HTMLElement {
    let el = this.items[this.i % this.max];
    if (!el) {
      el = document.createElement(this.tag);
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
  /** Büyük an doku tuvalleri (hüzme çarkı, ışık hâlesi): ilk kullanımda bir kez çizilir */
  private fxTex = new Map<string, HTMLElement>();
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
  /**
   * Pişti vitrini (ui/pistiVitrin.ts) bağlantıları. onBusy: yeni bir sahne animasyonu başlıyor (açık vitrin hemen kapanır);
   * onStackTap: koltuğun yığınına / pişti kartlarına / ×N rozetine dokunuldu; onPistiRow: koltuğun pişti sırası büyüdü.
   */
  onBusy: (kind: 'play' | 'collect' | 'deal' | 'reset' | 'layout' | 'turn' | 'fx') => void = () => {};
  onStackTap: (seat: number) => void = () => {};
  onPistiRow: (seat: number, n: number) => void = () => {};
  /** Süren sahne animasyonu kalmadı (masa sakin). */
  onIdle: () => void = () => {};
  /** Süren sahne animasyonu sayısı (atış, toplama, dağıtım, açılış...): vitrin yalnız sakin masada açılır. */
  busy = 0;

  /** Deste atlası hazır olunca çözülür (açılışta masa boş kartlarla kurulur, atlas arka planda çizilir). */
  ready: Promise<void> = Promise.resolve();
  private atlasTok = 0;
  private atlasUrl = '';
  private paintDirty = false;

  constructor(host: HTMLElement, atlas0: CardAtlas | null, private snd: TableSounds, low: boolean) {
    this.low = low;
    this.root = document.createElement('div');
    this.root.className = 'ar' + (low ? ' is-low' : '');
    // Büyük yumuşak ışıklar (yığın ışığı, zemin ışığı, hüzmeler, çentikler) küçük doku tuvalleri: bkz. src/platform/tex.ts.
    // Düşük cihazda hüzmeler döndürülmez: zeminle birlikte bir kez boyanan CSS katmanı kalır (ek katman yok).
    // Sıra önemli: doku tuvalleri (her zaman ayrı katman) zeminin EN ÜSTÜNDE. Desen/vinyet/kenar onların üstünde kalsaydı
    // "üst üste binme" yüzünden tam ekran ayrı bir katmana alınırdı (+1 tam ekran karo seti).
    this.root.innerHTML = `<div class="ar__bg"></div>${low ? '<div class="ar__rays"></div>' : ''}<div class="ar__pattern"></div><div class="ar__vig"></div><div class="ar__edge"></div>
      <canvas class="ar__glow" width="256" height="256"></canvas><canvas class="ar__glow" width="256" height="256"></canvas>
      <canvas class="ar__tint" width="256" height="256"></canvas>${low ? '' : '<canvas class="ar__rays is-tex" width="768" height="768"></canvas>'}
      <div class="ar__zoom"><div class="ar__shake"><div class="ar__ring"><i class="ar__rf"></i><canvas class="ar__tk" width="512" height="512"></canvas></div><div class="ar__cards"></div><div class="ar__fx"></div>
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
    this.pulses = new Pool(this.fxEl, 'ar__pulse', 6, 'canvas');
    this.ghosts = new Pool(this.cardsEl, 'ar__ghost', 6, 'canvas');
    this.puffs = new Pool(this.fxEl, 'ar__puff', 10);
    this.ripples = new Pool(this.ring, 'ar__rt', 3, 'canvas');
    for (let i = 0; i < 52; i++) {
      const c = new Card();
      this.all.push(c);
      this.cardsEl.append(c.el);
      this.draw(c, BACK_INDEX);
    }
    this.root.style.setProperty('--c2-bs', `${ATLAS_COLS * 100}% ${ATLAS_ROWS * 100}%`);
    this.layout();
    this.drawRays();
    drawTicks(this.ticks as HTMLCanvasElement, 'rgba(255, 255, 255, .55)', 2.2, 0.64, 0.67);
    void whenIdle(2500).then(() => this.warmTex());
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
    this.drawRays();
    if (this.glowKey === 'N') {
      this.glowKey = '';
      this.setGlow(null); // nötr ışık tema rengiyle yeniden çizilir
    }
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
    const hand ={x: W * 0.61, y: H - handH / 2 - Math.max(14, H * 0.022), s: handW / cw, maxW: W * 0.68};
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
      const ss2 = 0.78, hs2 = ch * ss2, wm2 = cw * ss2 * 0.94, hm2 = hs2 * 0.94;
      // ipucu hapı ile yığın arası en az 10 px (yığının -8° eğikliği dahil)
      const myY = Math.min(H * 0.655, clear - hs2 / 2 - 11);
      // Yığınlar sağ kenarda (kenar payı ~14 px); halkanın 10 px ötesinde kalır
      const sx2 = Math.max(cw * 0.55, W * (H <= 700 ? 0.115 : 0.13)), stX = W - sx2;
      // Rakibin yığını yelpazesinin sağında, yelpazeyle aynı hizada. Yelpaze ile halka arasında pişti kartlarını yana dizmeye yer yok
      // (yelpazeye ya da halkaya biniyordu): pişti kartları yığının ALTINA, boş sağ sütuna dizilir; sütun benim yığınımın üstünde biter.
      // Benim yığınım ve pişti sıram aşağıda, halkanın altında: pişti kartları yana (sola) dizilir. İkisinde de görünür yuva sayısı
      // yere göre sınırlı (pistiRow): kart çoğalınca eskileri ilk yuvanın altına girer, sıra hiçbir şeye taşmaz.
      const oppY = H * 0.235, oppSY = oppY - (H <= 700 ? 4 : 0); // kısa ekranda yığın biraz yukarı: sütun 3 kartlık yer bulur
      const oppC0 = oppSY + hs2 / 2 + hm2 / 2 + 2;
      const ringKeep2 = cw * 1.125 + 11;
      const myRowTop = myY - 2 - hm2 / 2 - 6;
      const ringX = myRowTop < pileY + ringKeep2 - 1.5 ?W / 2 + Math.sqrt(Math.max(0, ringKeep2 * ringKeep2 - (myRowTop - pileY) ** 2)) : 0;
      seats = [
        {fan: {x: hand.x, y: hand.y, a: 0, s: hand.s, spread: 0}, stack: {x: stX, y: myY, s: ss2, r: 8}, pdir: -1, py: -2, pspan: stX - (cw * ss2) / 2 - (Math.max(ringX, W * 0.3) + wm2 / 2 + 8)},
        {fan: {x: W / 2, y: oppY, a: 180, s: 0.62, spread: cw * 0.5}, stack: {x: stX, y: oppSY, s: ss2, r: -8}, pdir: -1, pv: 1, pnew: true, pspan: myY - hs2 / 2 - 4 - 15 - hm2 / 2 - oppC0},
      ];
    } else {
      const fs = Math.min(0.56, Math.max(0.46, (H * 0.075) / ch));
      const fh = ch * fs;
      const side = Math.max(fh * 0.36, Math.min(W * 0.1, fh * 0.62));
      const ss = 0.6;
      const sideStackX = Math.max((cw * ss) / 2 + 11, W * 0.105); // yelpaze sütununun altında, kenar payı ≥13 px
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
      // benim destem halkanın sağ altında, ipucu bandının üstünde (≥10 px); pişti kartları ortaya (sola) dizilir
      const ms = H <= 700 ? 0.54 : 0.66; // kısa ekranda halka ile sağdaki rakibin sırası arasına sığması için biraz küçük
      const myY = clear - (ch * ms) / 2 - 11;
      // Pişti kartları yığının yanına dizilir. Görünür yuva sayısı ve adım yere göre (pistiRow): her kartın köşe indeksi açık kalır,
      // kart çoğalınca eskileri ilk yuvanın altına girer; sıra yelpaze / halka / komşu yığın / ekran kenarından ≥10 px uzak durur.
      const wS = cw * ss, hS = ch * ss, wM = wS * 0.94, hM = hS * 0.94, fullStep = wM * 0.34;
      const ringKeep = cw * 1.125 + 11;
      const ringHalf = (y: number) => (Math.abs(y - pileY) >= ringKeep - 1.5 ? 0 : Math.sqrt(ringKeep * ringKeep - (y - pileY) ** 2));
      const reach = (span: number) => Math.min(Math.max(0, span), 4 * fullStep); // bir sıranın en uzak uzanışı
      // yan rakiplerin pişti sırası kendi yelpazelerinin hemen altında başlar (eskiden %18 yukarı kayıktı: yelpazenin son kartına biniyordu)
      const py = Math.max(-hS * 0.25, fanBottom + hM / 2 + 12 - sideY);
      const rowTop = sideY + py - hM / 2 - 8, rowBot = sideY + py + hM / 2 + 8; // + kartların eğikliği
      // Sağ rakibin kartları yığının altına yarı girer, dış (sol) şeritlerinde sol-üst köşe indeksi (değer + takım) dik okunur; kısa ekranda biraz daha içeri.
      // Sol rakibin kartları aynı şeritte ters okunurdu: yığının hemen yanına dizilir, yeni kart üstte, eskilerin sol-üst köşesi açıkta kalır.
      const padjR = H <= 700 ? -0.16 : 0, padjL = H <= 700 ? 0.34 : 0.5;
      const rightC0 = W - sideStackX - wS / 2 - padjR * wM, leftC0 = sideStackX + wS / 2 + padjL * wM;
      const rightSpan = rightC0 - (W / 2 + ringHalf(rowTop) + wM / 2 + 8);
      const leftSpan = W / 2 - ringHalf(rowTop) - (leftC0 + wM / 2 + 8);
      // Yığınımın yeri: halkadan ve sağdaki rakibin pişti sırasından ≥10 px uzakta. İkisi birden sığmıyorsa (kısa ekran) en dengeli yer
      // seçilir, sağ rakibin sırası da kalan yere göre kısalır.
      const myTop = myY - (ch * ms) / 2 - 4, myBot = myY + (ch * ms) / 2 + 4, mySW = (cw * ms) / 2 + 4;
      const yOver = myTop < rowBot + 10 && myBot > rowTop - 10;
      const marker0L = rightC0 - wM / 2 - 6; // sağ rakibin ilk pişti kartının sol kenarı
      const ringGap = (x: number) => Math.hypot(Math.max(x - mySW - W / 2, 0, W / 2 - (x + mySW)), Math.max(myTop - pileY, 0, pileY - myBot)) - cw * 1.125;
      const xMax = Math.min(W - cw * 0.6, W * 0.71), wantReach = Math.min(reach(rightSpan), 2 * fullStep);
      let myX = xMax, best = -Infinity;
      for (let x = xMax; x >= W / 2 + mySW; x -= 2) { // yığınım hep ortanın sağında (halkanın sağ altı)
        const sc = Math.min(ringGap(x) - 10, yOver ? marker0L - x - mySW - 10 - wantReach : 99);
        if (sc > best + 0.01) { best = sc; myX = x; }
      }
      const rightSpan2 = yOver ? Math.min(rightSpan, marker0L - myX - mySW - 10) : rightSpan;
      // benim pişti sıram (sola): halkaya, soldaki rakibin pişti sırasına ve desteye ≥10 px yaklaşmaz
      const wMe = cw * ms * 0.94, hMe = ch * ms * 0.94, myC0 = myX - (cw * ms) / 2;
      const myRowTop = myY - 2 - hMe / 2 - 6, myRowBot = myY - 2 + hMe / 2 + 6;
      let myMin = ringHalf(myRowTop) > 0 ? W / 2 + ringHalf(myRowTop) : 0;
      if (myRowTop < rowBot + 10 && myRowBot > rowTop - 10) myMin = Math.max(myMin, leftC0 + reach(leftSpan) + wM / 2 + 8 + 10);
      if (myRowBot > deck.y - (ch * deck.s) / 2 - 12) myMin = Math.max(myMin, deck.x + (cw * deck.s) / 2 + 12);
      const mySpan = myC0 - (myMin + wMe / 2 + 8);
      // üst rakip: yığın sağ üstte (duraklat düğmesinin altı, sağ rakibin portresinin üstü), pişti kartları yelpazeye doğru (sola) dizilir
      // (eskiden sağa dizilip ekranın dışına taşıyordu, 4 sıra portreye biniyordu)
      const pauseBottom = u * 0.6 + Math.max(44, u * 3);
      const headTop = H * (H <= 700 ? 0.215 : 0.245) - (H <= 700 ? 4.3 : 4.6) * u * 0.14; // sağ/sol rozetin portresi (hud.css)
      const topY = (pauseBottom + 11 + headTop - 5) / 2 - 1; // düğme ile portre arasında ortalı (yığının eğikliği ve 6 px yükselmesi dahil)
      // en kısa ekranda düğme ile portre arasındaki yer yığına (+ yükselmesine) yetmez: yığın biraz küçülür
      const ssT = Math.min(ss, (headTop - pauseBottom - 25) / ch), wT = cw * ssT, wMT = wT * 0.94;
      const topX = W - 8 - wT / 2 - 3;
      const topFanR = W / 2 + 1.5 * cw * fs * 0.62 + (cw * fs) / 2 + 6;
      const topSpan = topX - wT / 2 - (topFanR + 6 + wMT / 2 + 8);
      seats = [
        {fan: {x: hand.x, y: hand.y, a: 0, s: hand.s, spread: 0}, stack: {x: myX, y: myY, s: ms, r: 8}, pdir: -1, py: -2, pspan: mySpan},
        {fan: {x: W - side, y: H * 0.455, a: -90, s: fs, spread: cw * fs * 0.62}, stack: {x: W - sideStackX, y: sideY, s: ss, r: -6}, pdir: -1, py, padj: padjR, pspan: rightSpan2},
        {fan: {x: W / 2, y: H * 0.2, a: 180, s: fs, spread: cw * fs * 0.62}, stack: {x: topX, y: topY, s: ssT, r: 6}, pdir: -1, py: -4, pspan: topSpan},
        {fan: {x: side, y: H * 0.455, a: 90, s: fs, spread: cw * fs * 0.62}, stack: {x: sideStackX, y: sideY, s: ss, r: 6}, pdir: 1, py, padj: padjL, pnew: true, pspan: leftSpan},
      ];
    }
    this.L = {W, H, cw, ch, pile: {x: W / 2, y: pileY}, deck, hand, seats, popTop: u * 0.6 + Math.max(44, u * 3) + 4};
    this.pillDy = -u * 0.15;
    // ipucu hapının yeri HUD'a CSS değişkeniyle (hud.css: var(--kh-hint-bottom…)); Blöf kendi yerini kullanır.
    // HUD kökünde yazılır (yalnız onun alt ağacı yeniden hesaplanır); HUD henüz yoksa (açılış) belge kökünde.
    const hb = `${Math.max(0, H - hintBottom).toFixed(1)}px`, hx = `${hintX.toFixed(1)}px`;
    const rs = (document.querySelector<HTMLElement>('.kh-hud') ?? document.documentElement).style;
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
    this.rimKey = '';
    void whenIdle(1500).then(() => this.bakeRim()); // vitrin çerçevesi boşta pişer: açılışta ana iş parçacığına yük binmez
  }

  /** Pişti vitrini kartlarının altın çerçevesi + yumuşak hâlesi: kartın gölge görselinin yerini alan TEK pişirilmiş görsel (ek katman yok). */
  private rimKey = '';
  private bakeRim(): void {
    if (this.rimKey === this.shadowKey || !this.L) return;
    this.rimKey = this.shadowKey;
    const {cw, ch} = this.L, P = Math.ceil(cw * 0.26), S = 2;
    const cv = document.createElement('canvas');
    cv.width = (cw + 2 * P) * S;
    cv.height = (ch + 2 * P) * S;
    const g = cv.getContext('2d');
    if (!g) return;
    g.scale(S, S);
    const r = cw * CORNER_RADIUS + 3;
    const gr = g.createLinearGradient(0, P, 0, P + ch);
    gr.addColorStop(0, '#fff3a8');
    gr.addColorStop(0.5, '#ffc83a');
    gr.addColorStop(1, '#ff9f1a');
    g.shadowColor = 'rgba(255, 196, 60, .8)';
    g.shadowBlur = 12 * S;
    g.fillStyle = gr;
    g.beginPath();
    if (g.roundRect) g.roundRect(P - 3, P - 3, cw + 6, ch + 6, r);
    else g.rect(P - 3, P - 3, cw + 6, ch + 6);
    g.fill();
    const url = cv.toDataURL('image/png');
    this.root.style.setProperty('--c2-sh-vit', `url(${url})`);
    const im = new Image(); // aynı adres: ilk vitrinde çözme takılması olmasın (görsel önbelleğe çözülü girer)
    im.src = url;
    void im.decode().catch(() => undefined);
  }

  private relayout(): void {
    this.onBusy('layout');
    this.layout();
    this.deck.forEach((c, i) => this.set(c, this.deckPose(i)));
    this.pile.forEach((c, i) => this.set(c, this.pilePose(i, c.pose)));
    for (let s = 1; s < this.n; s++) this.hands[s].forEach((c, i) => this.set(c, this.fanPose(s, i, this.hands[s].length)));
    this.layoutHand(false);
    for (let s = 0; s < this.n; s++) {
      this.stacks[s].forEach((c, i) => this.set(c, this.stackPose(s, i)));
      this.pistis[s].forEach((c, i) => this.set(c, this.pistiPose(s, i), this.pistiZ(s, i)));
    }
    this.syncPistiChips();
    this.syncPistiHits();
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
      const g = this.ghosts.get() as HTMLCanvasElement;
      if (g.dataset.c !== color || g.dataset.w !== String(this.L.cw)) ghostTex(g, color, this.L.cw, this.L.ch);
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
  /**
   * Açık pişti kartı i / n: yığının yanına (pdir) ya da altına (pv) dizilir. Her kartın köşe indeksi (değer + takım) açıkta kalır:
   * adım yatayda kart genişliğinin ~%34'ü, dikeyde yüksekliğin ~%40'ı. Kart çoğalınca adım, koltuğa ayrılan yere (pspan) göre daralır.
   */
  private pistiPose(seat: number, i: number, n = this.pistis[seat].length): Pose {
    const g = this.L.seats[seat], s = g.stack, {cw, ch} = this.L, m = s.s * 0.94;
    const {slot, step, under} = this.pistiSlot(seat, i, n);
    // ilk yuvanın altındaki eski kartlar hafif eğik üst üste (dağınık yığın görünümü; yer kaplamaz)
    const tilt = under ? (under % 2 ? 1 : -1) * Math.min(3 + under * 2, 9) : 0;
    if (g.pv) return {x: s.x, y: s.y + g.pv * ((ch * s.s) / 2 + (ch * m) / 2 + 2 + slot * step), r: g.pdir * (3 + slot) + tilt, s: m};
    return {x: s.x + g.pdir * ((cw * s.s) / 2 + (g.padj ?? 0) * cw * m + slot * step), y: s.y + (g.py ?? 6), r: g.pdir * (12 + Math.min(slot, 4) * 2.5) + tilt, s: m};
  }
  /**
   * Pişti kartının yuvası: yere sığan görünür yuva sayısı (en çok 5; adım köşe indeksini açık bırakan adımın en az %90'ı) ve adım.
   * Kart bundan çoksa en eskileri ilk yuvanın altına girer (under: kaçıncı eski kart); son kartlar hep görünür kalır.
   */
  private pistiSlot(seat: number, i: number, n: number): {slot: number; step: number; under: number; slots: number} {
    const g = this.L.seats[seat], {cw, ch} = this.L, m = g.stack.s * 0.94;
    const full = g.pv ? ch * m * 0.4 : cw * m * 0.34, span = g.pspan ?? 1e9;
    const slots = Math.min(n, Math.max(1, Math.min(5, 1 + Math.floor((span + 0.5) / (full * 0.9)))));
    const extra = n - slots;
    return {slot: Math.max(0, i - extra), step: slots > 1 ? Math.min(full, span / (slots - 1)) : full, under: Math.max(0, extra - i), slots};
  }
  /**
   * Pişti kartı katmanı: dikey sırada yeni kart üstte (her kartın üst şeridi, yani sol-üst köşe indeksi açıkta); yatay sırada
   * ilk yuva üstte, sonrakiler altına girer (açıkta kalan dış şerit; yığının altına giren ilk kartın da dış yarısı görünür).
   * Aynı yuvadaki eski kartlarda yeni olan üstte.
   */
  private pistiZ(seat: number, i: number, n = this.pistis[seat].length): number {
    const {slot} = this.pistiSlot(seat, i, n);
    return 190 + (this.L.seats[seat].pnew ? slot * 8 : -slot * 8) + Math.min(i, 7);
  }

  /** Pişti rozetleri ("×5"): yere sığan yuvadan çok pişti kartı varsa, açıkta kalan en üst kartın üstünde sayıyı gösterir. */
  private pcChips: HTMLElement[] = [];
  private syncPistiChips(counts?: number[]): void {
    const {cw, ch} = this.L;
    for (let s = 0; s < this.n; s++) {
      const n = counts ? counts[s] : this.pistis[s].length;
      let el = this.pcChips[s];
      if (!el) {
        el = document.createElement('i');
        el.className = 'ar__pc';
        this.cardsEl.append(el);
        this.pcChips[s] = el;
      }
      const g = this.L.seats[s], {slots} = n ? this.pistiSlot(s, 0, n) : {slots: 0};
      if (n <= slots || s === this.vitSeat) {
        el.classList.remove('is-on');
        continue;
      }
      // en üstteki açık kart: yeni kart üstteyse sonuncusu, değilse ilk yuvadaki (yığının altına yarı giren) kart
      const p = this.pistiPose(s, g.pnew ? n - 1 : n - slots, n), m = g.stack.s * 0.94;
      const edge = g.stack.x + g.pdir * ((cw * g.stack.s) / 2), out = p.x + g.pdir * ((cw * m) / 2);
      const cx = g.pv || g.pnew ? p.x : (edge + out) / 2; // yığının altına giren kartta yalnız açıkta kalan dış parçanın ortası
      el.textContent = `×${n}`;
      el.style.transform = `translate3d(${cx.toFixed(1)}px,${(p.y + ch * m * 0.2).toFixed(1)}px,0) translate(-50%,-50%)`;
      el.classList.add('is-on');
    }
    for (let s = this.n; s < this.pcChips.length; s++) this.pcChips[s]?.classList.remove('is-on');
  }

  // ───────── pişti vitrini: masa tarafı (akış ve görünüm ui/pistiVitrin.ts'te) ─────────
  /** Vitrin açıkken hangi koltuğun kartları sahne ortasında (-1: kapalı): ×N rozeti gizlenir. */
  vitSeat = -1;
  private hits: HTMLElement[] = [];
  private hitDown: {seat: number; x: number; y: number; t: number} | null = null;

  /**
   * Koltuk yığınının dokunma alanı: yığın + pişti kartları birleşimi (kartların evinden hesaplanır: açıkken de yerinde), en az 44×44.
   * Dokunma alanı el kartlarının (katman 500+) ALTINDA, kartlar/rozetin üstünde: el kartlarından dokunma çalmaz; HUD ayrı katmanda.
   * Boş yığına (kart yok) alan yoktur.
   */
  private syncPistiHits(): void {
    const {cw, ch} = this.L;
    for (let s = 0; s < this.n; s++) {
      let el = this.hits[s];
      if (!el) {
        el = document.createElement('i');
        el.className = 'ar__vh';
        el.addEventListener('pointerdown', e => {
          this.hitDown = {seat: s, x: e.clientX, y: e.clientY, t: performance.now()};
        });
        el.addEventListener('pointerup', e => {
          const d = this.hitDown;
          this.hitDown = null;
          if (d && d.seat === s && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12 && performance.now() - d.t < 600) this.onStackTap(s);
        });
        el.addEventListener('pointercancel', () => (this.hitDown = null));
        this.cardsEl.append(el);
        this.hits[s] = el;
      }
      const st = this.L.seats[s].stack, nSt = this.stacks[s].length, nP = this.pistis[s].length;
      if (!nSt && !nP) {
        el.style.display = 'none';
        continue;
      }
      let x0 = st.x - (cw * st.s) / 2, x1 = st.x + (cw * st.s) / 2, y0 = st.y - (ch * st.s) / 2 - 8, y1 = st.y + (ch * st.s) / 2;
      for (let i = 0; i < nP; i++) {
        const p = this.pistiPose(s, i), w = (cw * p.s) / 2 + 4, h = (ch * p.s) / 2 + 4;
        x0 = Math.min(x0, p.x - w);
        x1 = Math.max(x1, p.x + w);
        y0 = Math.min(y0, p.y - h);
        y1 = Math.max(y1, p.y + h);
      }
      const w = Math.max(44, x1 - x0 + 12), h = Math.max(44, y1 - y0 + 12);
      Object.assign(el.style, {display: 'block', width: w.toFixed(0) + 'px', height: h.toFixed(0) + 'px', left: ((x0 + x1) / 2 - w / 2).toFixed(1) + 'px', top: ((y0 + y1) / 2 - h / 2).toFixed(1) + 'px'});
    }
    for (let s = this.n; s < this.hits.length; s++) this.hits[s].style.display = 'none';
  }

  /** Vitrin düğümleri (kart düğümleri YENİDEN kullanılır, yeni düğüm doğmaz): kartın evi, uçuş, anında yerleştirme, altın çerçeve. */
  pistiHome(seat: number, i: number): {pose: Pose; z: number} {
    return {pose: this.pistiPose(seat, i), z: this.pistiZ(seat, i)};
  }
  vitFly(c: Card, to: Pose, o: {ms?: number; delay?: number; z?: number; zEnd?: number; lift?: number; ease?: string}): Promise<void> {
    return this.fly(c, to, {lift: 0.12, ...o});
  }
  vitSet(c: Card, p: Pose, z?: number): void {
    this.set(c, p, z);
  }
  vitRim(c: Card, on: boolean): void {
    c.el.classList.toggle('is-vit', on);
  }
  /** Vitrin hangi koltukta açık (-1 kapalı): o koltuğun ×N rozeti gizlenir/geri gelir. */
  vitMode(seat: number): void {
    this.vitSeat = seat;
    this.syncPistiChips();
  }
  /** Vitrinin altına konan öğe (karartma dokusu, vb.): kart katmanında, kart numarasıyla çakışmaz. */
  mount(el: HTMLElement): void {
    this.cardsEl.append(el);
  }
  /** Boş yığına dokununca (pişti yok) küçük zıplama: yalnız üst kartın iç katmanı, transform. */
  nudge(seat: number): void {
    const top = this.stacks[seat][this.stacks[seat].length - 1];
    if (top) void top.inn.animate([{transform: 'scale(1.1)'}, {transform: 'none'}], {duration: 220, easing: 'cubic-bezier(.3,1.6,.5,1)'});
  }
  /** Süren sahne animasyonlarını izler; bağlı vitrin başlamadan önce haberdar olur. */
  private track<T>(kind: 'play' | 'collect' | 'deal' | 'fx', fn: () => Promise<T>): Promise<T> {
    this.onBusy(kind);
    this.busy++;
    return fn().finally(() => {
      this.busy--;
      if (!this.busy) this.onIdle();
    });
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
  /** "+N" yazısının çıkış yeri: yığının üstü; yazı (~78 px yükselir) üst köşedeki düğmelere varacaksa yığının altı. */
  scorePoint(seat: number): {x: number; y: number} {
    const s = this.L.seats[seat].stack;
    const half = this.L.ch * s.s * 0.6;
    return {x: s.x, y: s.y - half - 78 < this.L.popTop ? s.y + half + 14 : s.y - half};
  }
  /** El sonu sayaç hapının yeri (hap bu noktanın üstünde durur): yığının üstü; üst köşedeki düğmelere değecekse yığının altı. */
  tallyPoint(seat: number): {x: number; y: number} {
    const s = this.L.seats[seat].stack;
    const half = this.L.ch * s.s * 0.6, y = s.y - half - this.L.ch * 0.12;
    return {x: s.x, y: y - 36 < this.L.popTop ? s.y + half + 36 : y};
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
  /** Büyük an dokularını boşta önceden çiz (ilk piştide/süpürmede ana iş parçacığı çizimle uğraşmasın). */
  private warmTex(): void {
    const add = (key: string, make: () => HTMLElement, at: 'prepend' | 'append'): void => {
      if (this.fxTex.has(key)) return;
      const el = make();
      this.fxTex.set(key, el);
      this.fxEl[at](el);
    };
    add('burst', burstTex, 'prepend');
    add('bloom', bloomTex, 'prepend');
    add('sweep', sweepTex, 'append');
    for (const s of Object.values(SUIT_COLOR)) ghostSource(s, this.L.cw, this.L.ch);
  }

  /** Temanın satır içi değişkeni (yoksa varsayılan): getComputedStyle gerektirmez. */
  private themeVar(k: string, def: string): string {
    return this.theme?.vars?.[k] ?? this.theme?.vars?.[k.slice(2)] ?? def;
  }

  /** Işık hüzmeleri: 18°'de bir 7° geniş hüzme, merkezden sönen (CSS'teki repeating-conic + radial maske ile aynı). Doku
   * tuvaline bir kez çizilir; büyük anlarda yalnız döner (eskiden maskeli tam ekran katman her dönüşte yeniden birleşiyor,
   * sonunda zeminle birlikte baştan taranıyordu). Düşük cihazda CSS katmanı kalır. */
  private drawRays(): void {
    const c = this.raysEl;
    if (!(c instanceof HTMLCanvasElement)) return;
    const col = this.themeVar('--ar-rays', RAYS_C);
    if (c.dataset.c === col) return;
    c.dataset.c = col;
    const g = ctx2d(c);
    if (!g) return;
    const N = c.width, R = N / 2;
    g.clearRect(0, 0, N, N);
    g.fillStyle = col;
    g.beginPath();
    for (let a = 0; a < 360; a += 18) {
      const a0 = ((a - 90) * Math.PI) / 180, a1 = ((a + 7 - 90) * Math.PI) / 180;
      g.moveTo(R, R);
      g.arc(R, R, R * 1.5, a0, a1);
      g.closePath();
    }
    g.fill();
    // merkezden kenara sönme (CSS maskesi: #000 0 → .7 %41 → saydam %100)
    g.globalCompositeOperation = 'destination-in';
    const m = g.createRadialGradient(R, R, 0, R, R, R);
    m.addColorStop(0, 'rgba(0,0,0,1)');
    m.addColorStop(0.41, 'rgba(0,0,0,.7)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m;
    g.fillRect(0, 0, N, N);
    g.globalCompositeOperation = 'source-over';
  }

  setGlow(suit: Suit | null): void {
    const k = suit ?? 'N';
    if (k !== this.glowKey) {
      this.glowKey = k;
      const prev = this.glowEls[this.glowCur];
      this.glowCur = 1 - this.glowCur;
      const next = this.glowEls[this.glowCur] as HTMLCanvasElement;
      // gizli olan tuvale yeni renk çizilir (256² doku; boyama/tarama yok), sonra çapraz geçiş (yalnız opaklık)
      if (k === 'N') {
        const n = this.themeVar('--ar-glow-n', GLOW_N), n0 = withAlpha(n, 0);
        radial(next, [[0, n], [0.5, n0], [1, n0]]);
        radial(next, [[0, n], [1, n0]], true);
      } else radial(next, GLOW[k]);
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
    if (el.dataset.c !== color) {
      el.dataset.c = color;
      radial(el as HTMLCanvasElement, [[0, color], [0.48, withAlpha(color, 0.4)], [1, withAlpha(color, 0)]]);
    }
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
    const el = this.pulses.get() as HTMLCanvasElement;
    const d = this.L.cw * 1.6 * size;
    const p = at ?? this.L.pile;
    // doku tuvali: 5 px çizgi + 22 px ışıma (eski border + iki bulanık gölge; büyüyen katman ekran çözünürlüğünde
    // taranıyordu — tek pişti ≈ 4 halka ≈ 50 MB karo). Işıma payı kutunun dışında.
    const pad = 24, E = d + 2 * pad;
    if (el.width !== 256) el.width = el.height = 256;
    glowRing(el, color, d, pad, 5, 22);
    Object.assign(el.style, {width: E + 'px', height: E + 'px', left: p.x - E / 2 + 'px', top: p.y - E / 2 + 'px'});
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
    const big = lvl >= 3;
    this.stopRing();
    // 1) kart altı ışık: hızla açılır (~%22), yumuşakça söner (alış ve piştide altın-beyaz)
    const bl = this.bloom(lvl >= 1 ? 'G' : suit ?? 'N');
    bl.style.display = 'block';
    const peak = Math.min(1, 0.8 + 0.08 * lvl + 0.15 * pileK);
    bl.animate(seg([
      {transform: 'scale(.55)', opacity: 0},
      {transform: `scale(${(0.9 + 0.05 * k).toFixed(3)})`, opacity: peak, offset: 0.22},
      {transform: `scale(${(1 + 0.1 * k).toFixed(3)})`, opacity: 0},
    ], [OUT, 'cubic-bezier(.4,0,.6,1)']), {duration: big ? 700 : lvl >= 1 ? 480 : 380}).finished.then(() => (bl.style.display = 'none'), () => undefined);
    if (reduce) return;
    // 2) halka vuruşu: hızla büyür, hafif içe seker, yerine oturur
    const ms = big ? 560 : lvl >= 1 ? 440 : 360;
    this.ringAnims.push(this.ring.animate(seg([
      {transform: 'scale(1)'},
      {transform: `scale(${(1 + 0.045 * k).toFixed(3)})`, offset: 0.24},
      {transform: `scale(${(1 - 0.014 * k).toFixed(3)})`, offset: 0.58},
      {transform: 'scale(1)'},
    ], [OUT, 'cubic-bezier(.45,0,.55,1)', OUT]), {duration: ms}));
    if (this.low) return;
    // 3) çentikler kadran gibi tıklar (desen 15°'de bir tekrarlar → sonda yerine oturmuş görünür, açı saklanmaz);
    //    alışta iki-üç çentik, piştide tam tur fırıl
    const deg = (lvl === 0 ? 1 : lvl === 1 ? 2 : lvl === 2 ? 3 : lvl === 3 ? 12 : 24) * 15;
    this.ringAnims.push(this.ticks.animate(big
      ? [{transform: 'rotate(0deg) scale(1)', opacity: 0.7, easing: 'cubic-bezier(.12,.8,.2,1)'}, {transform: `rotate(${deg}deg) scale(1.04)`, opacity: 1, offset: 0.85, easing: OUT}, {transform: `rotate(${deg}deg) scale(1)`, opacity: 0.7}]
      : seg([
        {transform: 'rotate(0deg) scale(1)', opacity: 0.7},
        {transform: `rotate(${(deg + 3).toFixed(1)}deg) scale(${(1 + 0.035 * k).toFixed(3)})`, opacity: 1, offset: 0.4},
        {transform: `rotate(${deg}deg) scale(1)`, opacity: 0.7},
      ], ['cubic-bezier(.2,.9,.3,1)', 'cubic-bezier(.4,0,.4,1)']), {duration: big ? 820 : ms + 40}));
    // 4) halka çizgisi parlar (beyaz, takım renginde ışıma)
    const rf = this.ringFlash;
    rf.style.color = lvl >= 1 ? '#ffe9a0' : suit ? SUIT_COLOR[suit] : '#cfd8ff';
    rf.style.display = 'block';
    const fa = rf.animate(seg([
      {opacity: 0, transform: 'scale(.97)'},
      {opacity: Math.min(1, 0.75 + 0.08 * lvl), transform: `scale(${(1 + 0.015 * k).toFixed(3)})`, offset: 0.2},
      {opacity: 0, transform: `scale(${(1.03 + 0.02 * k).toFixed(3)})`},
    ], [OUT, 'cubic-bezier(.5,0,.7,1)']), {duration: ms + 40});
    fa.finished.then(() => (rf.style.display = 'none'), () => undefined);
    this.ringAnims.push(fa);
    // 5) çentik halkası dışa dalgalanır (alışta 2, piştide 3; her biri biraz daha uzağa, gecikmeli)
    const waves = lvl === 0 ? 1 : lvl <= 2 ? 2 : 3;
    for (let i = 0; i < waves; i++) {
      const el = this.ripples.get() as HTMLCanvasElement;
      if (el.width !== 384) {
        el.width = el.height = 384;
        ticks(el, 'rgba(255, 255, 255, .95)', 2.6, 0.625, 0.685);
      }
      const to = 1.2 + 0.1 * k + i * 0.15;
      el.animate([{transform: 'rotate(0deg) scale(1)', opacity: 0.9 - i * 0.18}, {transform: `rotate(${7.5 + i * 7.5}deg) scale(${to.toFixed(3)})`, opacity: 0}],
        {duration: (big ? 620 : 380) + i * 60, delay: i * 85, easing: 'cubic-bezier(.15,.65,.3,1)', fill: 'backwards'}).finished.then(() => this.ripples.hide(el), () => undefined);
    }
    // 6) alış: halkanın dışına ince şok dalgası (pişti zaten impact() ile büyük patlar)
    if (lvl === 1 || lvl === 2) setTimeout(() => this.pulse('#fff6d0', lvl === 2 ? 1.75 : 1.4), 70);
  }

  /** Toplama başlarken halka "nefes alır": içe çekilir, çentikler geri sarılır, yerine yaylanır. */
  private ringInhale(): void {
    if (this.low || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.stopRing();
    this.ringAnims = [
      this.ring.animate(seg([{transform: 'scale(1)'}, {transform: 'scale(.94)', offset: 0.35}, {transform: 'scale(1.015)', offset: 0.72}, {transform: 'scale(1)'}], ['cubic-bezier(.4,0,.6,1)', OUT, 'ease-in-out']), {duration: 480}),
      this.ticks.animate(seg([{transform: 'rotate(0deg) scale(1)', opacity: 0.7}, {transform: 'rotate(-38deg) scale(.96)', opacity: 0.45, offset: 0.45}, {transform: 'rotate(-45deg) scale(1)', opacity: 0.7}], ['cubic-bezier(.4,0,.6,1)', OUT]), {duration: 540}),
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
      const cv = texCanvas('ar__rb', 256);
      el = cv;
      const c = key === 'G' ? '255, 222, 120' : key === 'N' ? '180, 200, 255' : {H: '255, 110, 135', D: '255, 205, 80', C: '110, 240, 165', S: '120, 180, 255'}[key]!;
      // parlak çekirdek kartın kenarlarından taşar (kartın altından sızan ışık), dışı takım renginde yumuşakça söner
      radial(cv, [[0, 'rgba(255, 255, 255, .95)'], [0.34, 'rgba(255, 253, 244, .82)'], [0.46, `rgba(${c}, .62)`], [0.62, `rgba(${c}, .26)`], [0.74, `rgba(${c}, .08)`], [0.86, `rgba(${c}, 0)`], [1, `rgba(${c}, 0)`]]);
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
    // hüzme çarkı ve ışık hâlesi: bir kez çizilen doku tuvalleri (yeniden kullanılır; eskiden her piştide maskeli dev
    // katman doğup tam çözünürlükte taranıyordu)
    const mk = (key: 'burst' | 'bloom', d: number): HTMLElement => {
      let el = this.fxTex.get(key);
      if (!el) {
        el = key === 'burst' ? burstTex() : bloomTex();
        this.fxTex.set(key, el);
        this.fxEl.prepend(el);
      }
      cancelAnims(el);
      Object.assign(el.style, {display: 'block', width: d + 'px', height: d + 'px', left: pile.x - d / 2 + 'px', top: pile.y - d / 2 + 'px'});
      return el;
    };
    const hide = (a: Animation, el: HTMLElement): void => void a.finished.then(() => (el.style.display = 'none'), () => undefined);
    if (kind !== 'big') {
      // ince altın-beyaz hüzmeler açılır, ağır ağır döner ve söner (kısa; vale biraz daha büyük ve uzun)
      const b = mk('burst', cw * (jack ? 6.4 : 5.2));
      hide(b.animate(seg([
        {transform: 'scale(.35) rotate(-6deg)', opacity: 0},
        {transform: 'scale(1) rotate(4deg)', opacity: 1, offset: 0.24},
        {transform: 'scale(1.12) rotate(14deg)', opacity: 0},
      ], [OUT, 'cubic-bezier(.4,0,.7,1)']), {duration: jack ? 1050 : 850}), b);
    }
    const bl = mk('bloom', cw * 3.6);
    hide(bl.animate(seg([{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1)', opacity: 0.85, offset: 0.18}, {transform: 'scale(1.4)', opacity: 0}], [OUT, 'ease-in']),
      {duration: 700}), bl);
    // altın şok halkası, ardından ince beyaz halka; birkaç pırıltı (kalabalık konfeti değil)
    this.pulse('#ffd36a', jack ? 2.4 : kind === 'big' ? 1.6 : 2);
    this.sparkle('#ffd23f', jack ? 14 : kind === 'big' ? 10 : 11, jack ? 2.2 : kind === 'big' ? 1.5 : 1.9);
    setTimeout(() => this.pulse('#fff8e6', jack ? 1.6 : 1.3), 120);
    if (jack) setTimeout(() => this.pulse('#ffe9a8', 2.9), 240);
    this.tint(jack ? '#ffcf4a' : kind === 'big' ? '#7fb2ff' : '#ffd970', jack ? 0.62 : 0.5, jack ? 1000 : 800);
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
    let el = this.fxTex.get('sweep');
    if (!el) {
      el = sweepTex();
      this.fxTex.set('sweep', el);
      this.fxEl.append(el);
    }
    cancelAnims(el);
    Object.assign(el.style, {display: 'block', width: d + 'px', height: d + 'px', left: pile.x - d / 2 + 'px', top: pile.y - d / 2 + 'px'});
    const node = el;
    node.animate([{transform: 'rotate(-90deg) scale(.6)', opacity: 0}, {transform: 'rotate(60deg) scale(1)', opacity: 1, offset: 0.3}, {transform: 'rotate(330deg) scale(1.15)', opacity: 0}],
      {duration: 750, easing: 'cubic-bezier(.3,.6,.4,1)'}).finished.then(() => (node.style.display = 'none'), () => undefined);
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
    this.onBusy('reset');
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
    this.syncPistiChips();
    this.syncPistiHits();
    this.setTension(false);
    this.deck.forEach((c, i) => {
      c.id = -1;
      c.el.classList.remove('is-hand', 'is-hot', 'is-vit');
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
intro(): Promise<void> {
    return this.track('deal', () => this.intro0());
  }
  private async intro0(): Promise<void> {
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

  /** Masa: kapalı kartların kimliği gelmez (−1; yalnız alan görür: revealHidden), açık kart yüzüyle iner. */
dealTable(cards: CardId[], faceUp: boolean[]): Promise<void> {
    return this.track('deal', () => this.dealTable0(cards, faceUp));
  }
  private async dealTable0(cards: CardId[], faceUp: boolean[]): Promise<void> {
    for (let k = 0; k < cards.length; k++) {
      const c = this.deck.pop()!;
      c.el.classList.remove('is-flat');
      c.id = faceUp[k] ? cards[k] : -1;
      if (c.id >= 0) this.byId.set(c.id, c);
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
dealHands(deals: {seat: number; card: CardId}[]): Promise<void> {
    return this.track('deal', () => this.dealHands0(deals));
  }
  private async dealHands0(deals: {seat: number; card: CardId}[]): Promise<void> {
    const fl: Promise<void>[] = [];
    const cnt = new Array<number>(this.n).fill(0);
    for (const d of deals) cnt[d.seat]++;
    const gap = this.n === 4 ? 48 : 64;
    for (const d of deals) {
      const c = this.deck.pop()!;
      c.el.classList.remove('is-flat');
      c.id = d.card; // rakibin kartı süzülmüş olayda −1: atılınca kimlik kazanır (play)
      if (c.id >= 0) this.byId.set(c.id, c);
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
    this.onBusy('turn');
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
play(seat: number, card: CardId): Promise<void> {
    return this.track('play', () => this.play0(seat, card));
  }
  private async play0(seat: number, card: CardId): Promise<void> {
    const list = this.hands[seat];
    let c = this.byId.get(card);
    if (!c || !list.includes(c)) {
      // rakibin kapalı kartı (kimliği bu cihaza dağıtımda gelmedi): yelpazeden bir kart atılır ve yüzü şimdi belli olur
      const pool = list.filter(x => x.id < 0);
      c = pool[Math.floor(rnd(0.2, 0.8) * pool.length)] ?? list[0];
      c.id = card;
      this.byId.set(card, c);
    }
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
   * Baştaki kapalı masa kartlarını ALAN kişiye (yalnız koltuk 0) gösterir: yığının dibinden kalkıp küçük bir yelpazede
   * havada açılır, bir an durur ve yüzü açık olarak yığına geri oturur (toplam ≤ 600 ms); toplama (collect) sonra onları
   * kapalı olarak desteye götürür. Rakip alınca çağrılmaz: kartlar kapalı kalır, kimlikleri bu cihaza hiç gelmez.
   */
revealHidden(ids: CardId[]): Promise<void> {
    return this.track('fx', () => this.revealHidden0(ids));
  }
  private async revealHidden0(ids: CardId[]): Promise<void> {
    const list = this.pile.filter(c => c.id < 0).slice(0, ids.length);
    if (!list.length) return;
    const {pile, cw, ch} = this.L;
    const m = list.length;
    const home = list.map(c => ({pose: {...c.pose}, z: 301 + this.pile.indexOf(c)}));
    list.forEach((c, j) => {
      c.id = ids[j];
      this.byId.set(c.id, c);
    });
    this.snd.flip();
    const y = pile.y - ch * 0.5;
    await Promise.all(list.map((c, j) => this.fly(c, {x: pile.x + (j - (m - 1) / 2) * cw * 0.66, y, r: (j - (m - 1) / 2) * 9, s: 0.94},
      {ms: 280, lift: 0.06, delay: j * 35, flip: c.id, z: 940 + j, ease: 'cubic-bezier(.2,.8,.25,1)'})));
    this.pulse('#ffe3a0', 0.55, {x: pile.x, y});
    // 3 kart: 280 + 2·35 uçuş + 130 bekleme + 110 dönüş ≈ 590 ms
    await sleep(130);
    await Promise.all(list.map((c, j) => this.fly(c, home[j].pose, {ms: 110, lift: 0, z: 940 + j, zEnd: home[j].z, ease: 'cubic-bezier(.5,0,.75,0)'})));
  }

  /**
   * Değerli kartlar (♦10, ♣2, As, Vale) yığından havalanır, altın parlar (kapalıysa açılır). Kimliği bilinmeyen
   * (başkasının aldığı kapalı masa kartı: −1) hiç gösterilmez.
   * Ekran noktaları ve puanları döner (HUD "+3" baloncukları için).
   */
showValuables(cards: CardId[]): Promise<{x: number; y: number; pts: number; id: CardId}[]> {
    return this.track('fx', () => this.showValuables0(cards));
  }
  private async showValuables0(cards: CardId[]): Promise<{x: number; y: number; pts: number; id: CardId}[]> {
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
collect(seat: number, pistiCard: CardId | null, onArrive?: (i: number, total: number) => void): Promise<void> {
    return this.track('collect', () => this.collect0(seat, pistiCard, onArrive));
  }
  private async collect0(seat: number, pistiCard: CardId | null, onArrive?: (i: number, total: number) => void): Promise<void> {
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
        // yuvalar kart sayısına göre kayabilir: önceki pişti kartları yeni yerine kayar (yer varken konum değişmez)
        row.slice(0, -1).forEach((q, j) => {
          const to = this.pistiPose(seat, j);
          q.el.style.zIndex = String(this.pistiZ(seat, j));
          if (Math.hypot(to.x - q.pose.x, to.y - q.pose.y) > 0.5) void this.fly(q, to, {ms: 260, lift: 0, ease: EASE_OUT});
        });
        f = this.fly(c, this.pistiPose(seat, row.length - 1), {ms: 440, lift: 0.14, delay: k * step, z, zEnd: this.pistiZ(seat, row.length - 1), arc: 0.18 * side});
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
    this.syncPistiChips();
    this.syncPistiHits();
    if (pistiCard !== null) this.onPistiRow(seat, this.pistis[seat].length);
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

/** Çentik halkası (yığın halkasının kadranı) — doku tuvali; bkz. src/platform/tex.ts ticks. */
function drawTicks(c: HTMLCanvasElement, color: string, deg: number, rIn: number, rOut: number): void {
  if (c instanceof HTMLCanvasElement) ticks(c, color, deg, rIn, rOut);
}

/** Pişti hüzme çarkı: 30°'de bir ince beyaz + daha ince altın hüzme, merkezden yumuşak sönen (eski CSS repeating-conic +
 * radial maskenin aynısı; köşeye göre yarıçap). 768² doku. */
function burstTex(): HTMLCanvasElement {
  const c = texCanvas('ar__burst', 768);
  const g = ctx2d(c);
  if (!g) return c;
  const N = c.width, R = N / 2, F = R * Math.SQRT2;
  const deg = (d: number): number => ((d - 90 - 1) * Math.PI) / 180;
  const cg = (g as CanvasRenderingContext2D & {createConicGradient?: (a: number, x: number, y: number) => CanvasGradient}).createConicGradient?.(deg(0), R, R);
  if (cg) {
    // [derece, renk] — bir 30° periyot; 12 kez tekrarlanır
    const P: Array<[number, string]> = [[0, 'rgba(255,250,230,0)'], [0.7, 'rgba(255,250,230,.95)'], [1.3, 'rgba(255,250,230,.95)'], [2, 'rgba(255,250,230,0)'],
      [14.4, 'rgba(255,210,110,0)'], [14.9, 'rgba(255,206,96,.75)'], [15.3, 'rgba(255,206,96,.75)'], [15.8, 'rgba(255,210,110,0)']];
    for (let k = 0; k < 12; k++) for (const [d, col] of P) cg.addColorStop((k * 30 + d) / 360, col);
    cg.addColorStop(1, 'rgba(255,250,230,0)');
    g.fillStyle = cg;
    g.fillRect(0, 0, N, N);
  } else {
    // eski WebView: düz kama hüzmeler
    for (const [d0, w, col] of [[0.7, 0.6, 'rgba(255,250,230,.95)'], [14.9, 0.4, 'rgba(255,206,96,.75)']] as const) {
      g.fillStyle = col;
      g.beginPath();
      for (let k = 0; k < 12; k++) {
        g.moveTo(R, R);
        g.arc(R, R, F, deg(k * 30 + d0), deg(k * 30 + d0 + w));
        g.closePath();
      }
      g.fill();
    }
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(R, R, 0, R, R, F);
  for (const [o, a] of [[0, 0], [0.09, 0], [0.17, 0.9], [0.34, 0.55], [0.52, 0.18], [0.68, 0], [1, 0]] as const) m.addColorStop(o, `rgba(0,0,0,${a})`);
  g.fillStyle = m;
  g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** SÜPÜRDÜ ışık yayı: halka biçiminde, sonuna doğru parlayan dönen yay (eski conic + halka maskesi). 384² doku. */
function sweepTex(): HTMLCanvasElement {
  const c = texCanvas('ar__sweep', 384);
  const g = ctx2d(c);
  if (!g) return c;
  const N = c.width, R = N / 2, F = R * Math.SQRT2;
  const cg = (g as CanvasRenderingContext2D & {createConicGradient?: (a: number, x: number, y: number) => CanvasGradient}).createConicGradient?.(-Math.PI / 2, R, R);
  if (cg) {
    cg.addColorStop(0, 'rgba(255,255,255,0)');
    cg.addColorStop(200 / 360, 'rgba(160,200,255,.15)');
    cg.addColorStop(352 / 360, 'rgba(255,255,255,.95)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cg;
  } else g.fillStyle = 'rgba(200,220,255,.5)';
  g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(R, R, 0, R, R, F);
  for (const [o, a] of [[0, 0], [0.48, 0], [0.52, 1], [0.66, 1], [0.72, 0], [1, 0]] as const) m.addColorStop(o, `rgba(0,0,0,${a})`);
  g.fillStyle = m;
  g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** Atılan kartın hayalet izi: kart biçiminde beyazdan takım rengine geçen yüzey + 16 px ışıma (doku tuvali; CSS boyutu
 * kart + ışıma payı, ortası kartın ortası). */
const GHOST_PAD = 18;
/** Renk + kart boyutu başına bir kez çizilen kaynak (yazılım tuvali); havuz düğümleri yalnız kopyalar (bulanıklık yeniden hesaplanmaz). */
const ghostSrc = new Map<string, HTMLCanvasElement>();
function ghostTex(c: HTMLCanvasElement, color: string, cw: number, ch: number): void {
  c.dataset.c = color;
  c.dataset.w = String(cw);
  const src = ghostSource(color, cw, ch);
  if (c.width !== src.width || c.height !== src.height) {
    c.width = src.width;
    c.height = src.height;
  } else ctx2d(c)?.clearRect(0, 0, c.width, c.height);
  c.style.width = cw + 2 * GHOST_PAD + 'px';
  c.style.height = ch + 2 * GHOST_PAD + 'px';
  ctx2d(c)?.drawImage(src, 0, 0);
}
function ghostSource(color: string, cw: number, ch: number): HTMLCanvasElement {
  const key = `${color}|${cw}|${ch}`;
  let c = ghostSrc.get(key);
  if (c) return c;
  if (ghostSrc.size > 12) ghostSrc.clear(); // boyut değişti (döndürme vb.): eskiler atılır
  c = document.createElement('canvas');
  ghostSrc.set(key, c);
  const k = 1.5; // kart başına ~1,5 piksel/CSS px: hızlı geçen yarı saydam iz için yeterli
  c.width = Math.ceil((cw + 2 * GHOST_PAD) * k);
  c.height = Math.ceil((ch + 2 * GHOST_PAD) * k);
  const g = c.getContext('2d', {willReadFrequently: true});
  if (!g) return c;
  g.scale(k, k);
  const r = cw * CORNER_RADIUS;
  const gr = g.createLinearGradient(0, GHOST_PAD, 0, GHOST_PAD + ch);
  gr.addColorStop(0, 'rgba(255,255,255,.85)');
  gr.addColorStop(1, color);
  g.fillStyle = gr;
  g.shadowColor = color;
  g.shadowBlur = 16 * k;
  g.beginPath();
  if (g.roundRect) g.roundRect(GHOST_PAD, GHOST_PAD, cw, ch, r);
  else g.rect(GHOST_PAD, GHOST_PAD, cw, ch);
  g.fill();
  return c;
}

/** Pişti ışık hâlesi (beyaz → altın, köşeye göre yarıçap). 256² doku. */
function bloomTex(): HTMLCanvasElement {
  const c = texCanvas('ar__bloom', 256);
  radial(c, [[0, 'rgba(255, 255, 255, .9)'], [0.18, 'rgba(255, 236, 170, .55)'], [0.6, 'rgba(255, 210, 120, 0)'], [1, 'rgba(255, 210, 120, 0)']], false, true);
  return c;
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
