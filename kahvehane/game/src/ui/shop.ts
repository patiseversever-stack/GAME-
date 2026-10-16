// MARKET — ürün güç değil GÖRÜNÜŞ satar: her ürün kendi gösterisini yapar.
//  Sekmeler: Öne Çıkan · Setler · Desteler · Masalar · Efektler · Çerçeveler · Karakterler (her sekme bir kez kurulur,
//  durum değişmedikçe dönüşte yeniden kurulmaz; kaydırma yeri sekme başına hatırlanır).
//  Öne Çıkan: Günün Teklifi (dev vitrin, geri sayım, çizili fiyat) → Özel Setler (paket indirimi) → Yeni Gelenler (kaydırmalı
//  şerit) → Efsanevi Vitrin → Hemen Alabileceklerin / Hedefin. Kategori sekmesi: koleksiyon ilerlemesi, en gözde ürün geniş
//  kartta, sonra ızgara, en altta "Sende".
//  Kartlar: nadirlik katmanı (efsanevi: altın folyo), Yeni/Popüler/Sınırlı rozeti, gerçek önizleme (pişmiş deste kartları,
//  kuşanılı destenle masa, kendi avatarınla çerçeve, donmuş efekt karesi). Kartlar sırayla canlanır (showcase.ts Spotlight).
//  Ürün penceresi: etkileşimli sahne (deste: kaydır/çevir/ışık; masa: kart at; çerçeve: avatarına dokun; efekt: tekrar),
//  "Dene" (tam ekran masa sahnesinde dene, tryon.ts), cüzdan satırı (alınca ne kalır / ne kadar eksik), set bağlantısı.
import './shop.css';
import {CATALOG, KIND_INFO, itemOf, type ItemKind, type ShopItem} from '../game/catalog';
import {charById, type CharDef} from '../game/roster';
import {ANIM, EASE, Scope, bump, center, clamp, esc, fmt, h, hms, play, q, shake} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {charAvatarHtml, onAct, openSheet, rarityHtml, starsHtml, stampWord, toast, type ModalHandle} from './parts';
import {fanHtml, frameJob, fxStillHtml, mountFx, mountFxStill, paintTableLater, tableSceneHtml, warmPreviews, type FxLoop} from './previews';
import {BADGE_NAME, RANK, badgeOf, setOf, setById, setPrice, shopSets, type ShopSet} from './sets';
import {Spotlight, glint, glintHtml, mountDeckViewer} from './showcase';
import {deckOr} from './deckpv';
import {openTryOn} from './tryon';
import {haptic} from '../platform/bridge';
import {g3} from './fx';
import type {Page, Shell} from './lobby';

type ShopTab = 'featured' | 'set' | ItemKind;
const TABS: {id: ShopTab; name: string; icon: string}[] = [
  {id: 'featured', name: 'Öne Çıkan', icon: I.star},
  {id: 'set', name: 'Setler', icon: I.gift},
  {id: 'deck', name: 'Desteler', icon: I.cards},
  {id: 'table', name: 'Masalar', icon: I.grid},
  {id: 'fx', name: 'Efektler', icon: I.sparkle},
  {id: 'frame', name: 'Çerçeveler', icon: I.crown},
  {id: 'char', name: 'Karakterler', icon: I.user},
];
const DEAL_OFF = 0.3;

/** Kuşanınca gösterilen mesaj. */
const EQUIP_MSG: Record<ItemKind, string> = {
  char: 'Artık yeni karakterinle oynuyorsun!',
  deck: 'Yeni desten masada seni bekliyor!',
  table: 'Masan hazır, hadi bir el at!',
  fx: 'Pişti yaptığında göreceksin!',
  frame: 'Çerçeven takıldı, çok yakıştı!',
};

/** Bugünün teklifi: tarihe bağlı, sahip olunmayan en az destansı bir ürün (yoksa nadir). */
function dealOf(owns: (k: ItemKind, id: string) => boolean): {item: ShopItem; price: number} | null {
  const day = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (const c of day) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const pool = CATALOG.filter(i => !i.starter && i.price > 0 && i.kind !== 'char' && !owns(i.kind, i.id));
  const best = pool.filter(i => RANK[i.rarity] >= 2);
  const list = best.length ? best : pool;
  if (!list.length) return null;
  const item = list[seed % list.length];
  return {item, price: Math.round((item.price * (1 - DEAL_OFF)) / 50) * 50};
}

const msToMidnight = (): number => {
  const n = new Date();
  const m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return m.getTime() - n.getTime();
};

/** Önizlemelerin "sen" bağlamı: kuşanılı deste/masa/çerçeve ve karakter. */
interface Me {
  char: CharDef;
  deck: string;
  table: string;
  frame: string;
  fx: string;
  name: string;
  level: number;
}
function meOf(shell: Shell): Me {
  const d = shell.profile.data;
  return {char: charById(d.char ?? 'dursun'), deck: deckOr(d.equipped.deck), table: d.equipped.table, frame: d.equipped.frame, fx: d.equipped.fx, name: d.name, level: d.level};
}

const coinImg = (): string => `<img src="${ASSETS.icon_coin}" alt="">`;

// =====================================================================================================
// Önizleme HTML'i (tek dizge; efekt kareleri sonradan sırayla kurulur → hydrate)
// =====================================================================================================
function pvHtml(it: {kind: ItemKind; id: string}, me: Me, big = false): string {
  switch (it.kind) {
    case 'deck':
      return fanHtml(it.id, 3);
    case 'table':
      return `<span class="kh-pv__table">${tableSceneHtml(it.id, {deck: me.deck, size: 'mini'})}</span>`;
    case 'fx':
      // efekt kendi başına değil, kuşanılı masanın üstünde (bağlam: "pişti yapınca masan böyle olur")
      return `<span class="kh-pv__fxs">${tableSceneHtml(me.table, {deck: me.deck, size: 'tile'})}</span>${fxStillHtml(it.id, 'kh-pv__fx')}`;
    case 'frame':
      return charAvatarHtml(me.char, it.id, 'kh-pv__ava', big ? 'gulumseme' : 'notr');
    case 'char': {
      const c = charById(it.id);
      return `<i class="kh-pv__glow" style="--c:${c.color}"></i><img class="kh-pv__char" src="${c.poses[big ? 'gulumseme' : 'notr']}" alt="" decoding="async">`;
    }
  }
}

/** Kök altındaki efekt kutularını görünür olunca, sırayla, donmuş kare olarak kur. */
function hydrate(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-fx]:not(.kh-fxpv):not(.kh-fxst)').forEach(box => mountFxStill(box, box.dataset.fx!));
}

const badgeHtml = (it: ShopItem): string => {
  const b = badgeOf(it);
  return b ? `<span class="kh-mtag is-${b}">${BADGE_NAME[b]}</span>` : '';
};

/** Ürün kartı. wide: iki sütunluk vitrin kartı; sub: tür adını göster (karışık listelerde). */
function itemCardHtml(it: ShopItem, me: Me, st: {owned: boolean; eq: boolean; wide?: boolean; sub?: boolean; rail?: boolean}): string {
  const foot = st.eq
    ? `<span class="kh-item__state is-eq">${I.check}Kuşanıldı</span>`
    : st.owned
      ? `<span class="kh-item__state is-own">${I.check}Sende</span>`
      : `<span class="kh-item__price">${coinImg()}<b class="kh-num">${fmt(it.price)}</b></span>`;
  const glow = RANK[it.rarity] >= 2 && !st.owned;
  return `<button class="kh-item is-${it.rarity}${st.owned ? ' is-owned' : ''}${st.eq ? ' is-eq' : ''}${st.wide ? ' is-wide' : ''}${st.rail ? ' is-rail' : ''}" data-act="item" data-k="${it.kind}" data-id="${it.id}"${glow ? ' data-glint' : ''}>
    <span class="kh-item__pv is-${it.kind}"><i class="kh-item__bg"></i>${pvHtml(it, me, st.wide)}${glow ? glintHtml() : ''}</span>
    <span class="kh-item__top">${rarityHtml(it.rarity, 'kh-item__rar')}${st.owned ? '' : badgeHtml(it)}</span>
    <span class="kh-item__name">${esc(it.name)}</span>
    ${st.sub || st.wide ? `<span class="kh-item__sub">${KIND_INFO[it.kind].name}${st.wide ? ` · ${esc(it.desc)}` : ''}</span>` : ''}
    ${foot}
  </button>`;
}

/** Set kartı: parçaların küçük önizlemeleri üst üste, çizili toplam, set fiyatı, kazanç. */
function setCardHtml(s: ShopSet, me: Me, owns: (k: ItemKind, id: string) => boolean, coins: number): string {
  const pr = setPrice(s, owns);
  const done = !pr.missing.length;
  // parçalar yelpaze gibi: ilk parça (genelde deste) ortada ve önde, diğerleri iki yanda
  const parts = s.parts.slice(0, 3);
  const order = parts.length === 3 ? parts.map((p, i) => ({p, n: [0, -1, 1][i]})) : parts.map((p, i) => ({p, n: i - (parts.length - 1) / 2}));
  const tiles = order
    .map(({p, n}) => `<span class="kh-setc__tile is-${p.kind} is-${p.rarity}${n === 0 ? ' is-mid' : ''}" style="--n:${n};z-index:${3 - Math.abs(n) * 2}"><i class="kh-item__bg"></i>${pvHtml(p, me)}${owns(p.kind, p.id) ? `<i class="kh-setc__own">${I.check}</i>` : ''}</span>`)
    .join('');
  const price = done
    ? `<span class="kh-setc__done">${I.check}Tamamlandı</span>`
    : `<span class="kh-setc__price"><s class="kh-num">${fmt(pr.full)}</s><span class="kh-setc__now${coins >= pr.price ? '' : ' is-poor'}">${coinImg()}<b class="kh-num">${fmt(pr.price)}</b></span></span>`;
  return `<button class="kh-setc${done ? ' is-done' : ''}" data-act="set" data-set="${s.id}" style="--a:${s.a};--b:${s.b}"${done ? '' : ' data-glint'}>
    <i class="kh-setc__rays"></i>
    <span class="kh-setc__art">${tiles}</span>
    <span class="kh-setc__info">
      <span class="kh-setc__kick">${I.gift}Set · ${s.parts.length} parça</span>
      <b class="kh-setc__name">${esc(s.name)}</b>
      <span class="kh-setc__tag">${esc(s.tag)}</span>
      ${price}
    </span>
    ${done ? '' : `<span class="kh-setc__off">-%${Math.round(s.off * 100)}</span>`}
    ${done ? '' : glintHtml()}
  </button>`;
}

function dealHtml(deal: {item: ShopItem; price: number} | null, me: Me): string {
  if (!deal) return `<div class="kh-deal is-done"><span class="kh-deal__info"><span class="kh-deal__kick">${I.crown}Koleksiyon tamam!</span><b class="kh-deal__name">Her şey sende, usta!</b></span></div>`;
  const it = deal.item;
  return `<button class="kh-deal is-${it.rarity} is-k-${it.kind}" data-act="deal" data-k="${it.kind}" data-id="${it.id}" data-glint>
      <i class="kh-deal__rays"></i><i class="kh-deal__dots"></i>
      <span class="kh-deal__pv is-${it.kind}"><i class="kh-item__bg"></i>${pvHtml(it, me, true)}</span>
      <span class="kh-deal__info">
        <span class="kh-deal__kick">${I.sparkle}Günün Teklifi</span>
        <b class="kh-deal__name">${esc(it.name)}</b>
        <span class="kh-deal__kind">${rarityHtml(it.rarity)}<small>${KIND_INFO[it.kind].name}</small></span>
        <span class="kh-deal__price"><s class="kh-num">${fmt(it.price)}</s><span class="kh-coins">${coinImg()}<b class="kh-num">${fmt(deal.price)}</b></span></span>
        <span class="kh-deal__time">${I.bell}<b class="kh-num">${hms(msToMidnight() / 1000)}</b></span>
      </span>
      <span class="kh-deal__off"><small>İndirim</small>-%${Math.round(DEAL_OFF * 100)}</span>
      ${glintHtml()}
    </button>`;
}

const secHtml = (title: string, sub = '', icon = ''): string =>
  `<div class="kh-sec">${icon ? `<span class="kh-sec__i">${icon}</span>` : ''}<span class="kh-sec__t">${esc(title)}</span>${sub ? `<span class="kh-sec__s">${sub}</span>` : ''}</div>`;

// =====================================================================================================
// Sayfa
// =====================================================================================================
/** Panel parçası: düz HTML (panelin sonuna) ya da bir kabın içine (ör. şeridin devamı). */
type Chunk = (() => string) | {into: string; html: () => string};
/** İki parçayı tek parça yap (ilk ekranı doldurmak için) */
const join2 = (a: Chunk | undefined, b: Chunk | undefined): Chunk => () => (a ? (a as () => string)() : '') + (b ? (b as () => string)() : '');

interface Panel {
  el: HTMLElement;
  sig: string;
  scroll: number;
  /** Henüz eklenmemiş parçalar: ancak kullanıcı aşağı yaklaştıkça (ekranın ~1 boyu kala) kare başına bir tane eklenir */
  pending: Chunk[];
  /** Panel açıldığından beri parça eklemeye izin var mı (giriş kayması bitti) */
  ready: boolean;
}

export class ShopPage implements Page {
  readonly el = h('div', 'kh-page kh-shop');
  private scope = new Scope();
  private tab: ShopTab = 'featured';
  private body: HTMLElement;
  private panels = new Map<ShopTab, Panel>();
  private dealT = 0;
  private visible = false;
  private spot = new Spotlight(() => this.panels.get(this.tab)?.el ?? null);
  private edges: () => void = () => undefined;

  constructor(private shell: Shell) {
    this.el.innerHTML = `<header class="kh-shop__head"><div class="kh-title kh-shop__title">${g3('Market')}</div><button class="kh-shop__count" data-act="coll"></button></header>
      <div class="kh-shop__tabsw"><div class="kh-shop__tabs kh-noswipe"><div class="kh-shop__track">${TABS.map(t => `<button class="kh-stab" data-act="tab" data-t="${t.id}">${t.icon}<span>${t.name}</span></button>`).join('')}</div></div></div>
      <div class="kh-shop__body kh-scroll"></div>`;
    this.body = q(this.el, '.kh-shop__body');
    onAct(this.scope, this.el, (a, b) => this.act(a, b));
    // sekme şeridi kenarları: devamı varsa yumuşak gölge (kesik yazı "devamı var" diye okunur)
    const tabs = q(this.el, '.kh-shop__tabs'), wrap = q(this.el, '.kh-shop__tabsw');
    let edgeRaf = 0;
    const edges = (): void => {
      edgeRaf = 0;
      const max = tabs.scrollWidth - tabs.clientWidth;
      wrap.classList.toggle('is-l', tabs.scrollLeft > 4);
      wrap.classList.toggle('is-r', tabs.scrollLeft < max - 4);
    };
    this.edges = (): void => {
      if (!edgeRaf) edgeRaf = requestAnimationFrame(edges);
    };
    this.scope.on(tabs, 'scroll', this.edges, {passive: true});
    // panel kaydırıldıkça bekleyen parçaları getir (kare başına en çok bir kontrol)
    let fillRaf = 0;
    this.scope.on(this.body, 'scroll', () => {
      if (!fillRaf) fillRaf = requestAnimationFrame(() => ((fillRaf = 0), this.fill(1.2)));
    }, {passive: true});
    this.scope.add(() => cancelAnimationFrame(fillRaf));
    this.scope.add(() => cancelAnimationFrame(edgeRaf));
    this.scope.add(() => {
      clearTimeout(this.dealT);
      this.spot.stop();
    });
    // içerik ilk show()'da kurulur
  }

  private owns = (k: ItemKind, id: string): boolean => this.shell.profile.owns(k, id);
  private equipped(k: ItemKind, id: string): boolean {
    const d = this.shell.profile.data;
    return k === 'char' ? d.char === id : d.equipped[k] === id;
  }

  /** Sekme içeriğini belirleyen durum (değişmediyse panel yeniden kurulmaz). */
  private signature(tab: ShopTab): string {
    const d = this.shell.profile.data;
    const base = [d.char, JSON.stringify(d.equipped), CATALOG.map(it => (this.owns(it.kind, it.id) ? 1 : 0)).join('')];
    if (tab === 'featured') {
      const deal = dealOf(this.owns);
      base.push(deal ? `${deal.item.kind}:${deal.item.id}` : '-', String(Math.floor(d.coins / 500)));
    }
    if (tab === 'set') base.push(String(Math.floor(d.coins / 500)));
    return base.join('|');
  }

  show(sub?: string): void {
    this.visible = true;
    if (sub && TABS.some(t => t.id === sub)) this.tab = sub as ShopTab;
    // ilk açılış: sayfa kabuğu (başlık, sekmeler) bu karede, içerik bir sonraki karede — sayfa geçişi 60 ms gecikmeli ve
    // saydam başladığı için görünmez; tıklama görevi ikiye bölünür (tek uzun kare yerine iki kısa kare)
    if (!this.panels.size && ANIM) frameJob(() => this.scope.alive && this.visible && this.activate(false), true);
    else this.activate(false);
  }

  hide(): void {
    this.visible = false;
    clearTimeout(this.dealT);
    this.spot.stop();
    const p = this.panels.get(this.tab);
    if (p) p.scroll = this.body.scrollTop;
  }

  /**
   * Seçili sekme hapı (.kh-stab.is-on::before). Ölçüm yok: ilk açılışta yerleşimi zorlamaz. Sekme değişince eski
   * sekmeden yeniye kayar (yalnız transform; düzen o anda temiz olduğu için ölçüm ucuz). Şerit ortalama ve kenar
   * gölgeleri giriş kayması bittikten sonra.
   */
  private placeInd(from?: HTMLElement): void {
    const tabs = this.el.querySelectorAll<HTMLElement>('.kh-stab');
    const i = TABS.findIndex(t => t.id === this.tab);
    tabs.forEach((t, k) => t.classList.toggle('is-on', k === i));
    const on = tabs[i];
    if (from && from !== on && ANIM) {
      const dx = from.offsetLeft - on.offsetLeft, sx = from.offsetWidth / Math.max(1, on.offsetWidth);
      on.animate([{transform: `translateX(${dx}px) scaleX(${sx.toFixed(3)})`, transformOrigin: '0 50%'}, {transform: 'none', transformOrigin: '0 50%'}], {duration: 380, easing: 'cubic-bezier(.32,1.3,.6,1)', pseudoElement: '::before'});
    }
    const center = (): void => {
      if (!this.scope.alive) return;
      const strip = q(this.el, '.kh-shop__tabs');
      const want = on.offsetLeft + on.offsetWidth / 2 - strip.clientWidth / 2;
      if (Math.abs(strip.scrollLeft - want) > 2) strip.scrollTo({left: Math.max(0, want), behavior: ANIM && from ? 'smooth' : 'auto'});
      this.edges();
    };
    if (from) center();
    else window.setTimeout(center, ANIM ? 480 : 0);
  }

  private renderCount(): void {
    const owned = CATALOG.filter(it => this.owns(it.kind, it.id)).length;
    const k = owned / CATALOG.length;
    q(this.el, '.kh-shop__count').innerHTML = `<svg class="kh-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="kh-ring__t"/><circle cx="18" cy="18" r="15" class="kh-ring__f" style="stroke-dasharray:${(k * 94.25).toFixed(1)} 94.25"/></svg><b class="kh-num">${owned}/${CATALOG.length}</b>`;
  }

  /** Görünen sekmeyi hazırla: panel yoksa ya da durum değiştiyse kur; yoksa yalnız göster. dir: kayma yönü. */
  private activate(animate: boolean, dir = 0, from?: HTMLElement): void {
    this.placeInd(from);
    this.renderCount();
    // kaydırma yeri: DOM değişmeden önce oku (düzen temizken ucuz); ilk açılışta hiç okuma (yerleşim zorlanmasın)
    const cur = this.panels.size ? this.body.scrollTop : 0;
    const sig = this.signature(this.tab);
    let p = this.panels.get(this.tab);
    let fresh = false;
    if (!p || p.sig !== sig) {
      const el = h('div', `kh-shop__panel is-${this.tab}`);
      // ilk ekran hemen, kalanı kare kare (sekme açılışı tek büyük görev olmasın)
      const chunks = this.panelChunks(this.tab);
      el.innerHTML = (chunks[0] as () => string)();
      if (p) p.el.replaceWith(el);
      else this.body.append(el);
      p = {el, sig, scroll: p?.scroll ?? 0, pending: chunks.slice(1), ready: false};
      this.panels.set(this.tab, p);
      fresh = true;
      // kalan parçalar giriş kayması BİTTİKTEN sonra (sayfa: 380+60 ms, alt sekme: 300 ms) ve gerektikçe eklenir
      const pp = p;
      const go = (): void => {
        pp.ready = true;
        this.fill();
      };
      if (ANIM) window.setTimeout(go, this.panels.size === 1 ? 470 : 330);
      else go();
    }
    for (const [t, x] of this.panels) x.el.hidden = t !== this.tab;
    if (cur !== p.scroll && !(fresh && p.scroll)) this.body.scrollTop = p.scroll;
    if (!fresh) this.fill();
    hydrate(p.el);
    clearTimeout(this.dealT);
    if (this.tab === 'featured') this.tickDeal();
    // sekme değişimi: TEK katman (panel) kayar; kart kart giriş yok (her kart ayrı katman + boyama = ilk açılışta takılma)
    if (animate && ANIM && dir) play(p.el, [{transform: `translateX(${dir * 9}%)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 300, easing: EASE.outQuart});
    this.spot.start(fresh ? 1100 : 800);
  }

  /**
   * Bekleyen parçaları ekle: yalnız görünen panel, giriş kayması bittikten sonra ve içerik dibi ekrana ~1 boy
   * yaklaştıkça, kare başına bir parça (efekt kareleriyle aynı kuyrukta). Kaydırınca yeniden bakılır. Yeniden kurulan
   * panelde (satın alma sonrası) eski kaydırma yerine varana dek doldurulur.
   */
  private fillQueued = false;
  /** margin: içerik dibinin ekran altından en çok ne kadar (ekran boyu cinsinden) uzakta olması istenir.
   *  Açılışta küçük (yalnız görünen ekran dolar), kaydırırken büyük (kullanıcı ilerlerken önceden hazırlanır). */
  private fillMargin = 0;
  private fill(margin?: number): void {
    if (margin !== undefined) this.fillMargin = Math.max(this.fillMargin, margin);
    if (this.fillQueued) return;
    const p = this.panels.get(this.tab);
    if (!p || !p.ready || !p.pending.length || !this.visible) return;
    this.fillQueued = true;
    frameJob(() => {
      this.fillQueued = false;
      if (!this.scope.alive || !p.el.isConnected || this.panels.get(this.tab) !== p || !this.visible) return;
      const b = this.body;
      const need = b.scrollHeight - b.scrollTop - b.clientHeight < b.clientHeight * this.fillMargin || b.scrollHeight < p.scroll + b.clientHeight * 1.5;
      if (!need) return void (this.fillMargin = 0);
      const c = p.pending.shift()!;
      if (typeof c === 'function') p.el.insertAdjacentHTML('beforeend', c());
      else {
        const box = p.el.querySelectorAll(c.into);
        box[box.length - 1]?.insertAdjacentHTML('beforeend', c.html());
      }
      hydrate(p.el);
      if (p.scroll && b.scrollTop !== p.scroll && b.scrollHeight >= p.scroll + b.clientHeight) b.scrollTop = p.scroll;
      this.fill();
    });
  }

  private panelChunks(tab: ShopTab): Chunk[] {
    const me = meOf(this.shell);
    if (tab === 'featured') return this.featuredHtml(me);
    if (tab === 'set') return this.setsHtml(me);
    return this.kindHtml(tab, me);
  }

  private card(it: ShopItem, me: Me, o: {wide?: boolean; sub?: boolean; rail?: boolean} = {}): string {
    return itemCardHtml(it, me, {owned: this.owns(it.kind, it.id), eq: this.equipped(it.kind, it.id), ...o});
  }

  private featuredHtml(me: Me): Chunk[] {
    const coins = this.shell.profile.data.coins;
    const deal = dealOf(this.owns);
    const shown = new Set<ShopItem>(deal ? [deal.item] : []);
    const unowned = CATALOG.filter(it => !it.starter && !this.owns(it.kind, it.id));
    // setler: eksik parçası olanlar, kazancı büyük olan önce
    const sets = shopSets()
      .map(s => ({s, p: setPrice(s, this.owns)}))
      .filter(x => x.p.missing.length >= 2)
      .sort((a, b) => b.p.full - b.p.price - (a.p.full - a.p.price))
      .slice(0, 2);
    const freshList = unowned.filter(it => badgeOf(it) === 'new' && !shown.has(it)).sort((a, b) => RANK[b.rarity] - RANK[a.rarity] || b.price - a.price);
    // şerit: türleri karıştır (önce her türün en gözdesi), en çok 8 kart; gerisi kendi sekmesinde
    const freshAll = freshList.length;
    const fresh: ShopItem[] = [];
    for (let round = 0; fresh.length < 8 && round < 8; round++)
      for (const k of ['deck', 'table', 'fx', 'frame', 'char'] as ItemKind[]) {
        const it = freshList.filter(x => x.kind === k)[round];
        if (it && fresh.length < 8) fresh.push(it);
      }
    fresh.forEach(it => shown.add(it));
    const legend = unowned.filter(it => it.rarity === 'legendary' && !shown.has(it)).sort((a, b) => b.price - a.price).slice(0, 4);
    legend.forEach(it => shown.add(it));
    const rest = unowned.filter(it => !shown.has(it));
    const afford = rest.filter(it => it.price <= coins).sort((a, b) => b.price - a.price).slice(0, 4);
    const goal = afford.length ? [] : rest.slice().sort((a, b) => a.price - b.price).slice(0, 2);
    // parça 1: teklif vitrini (ilk görev küçük kalsın); parça 2-3: setler
    // parçalar ancak eklenecekleri anda kurulur (açılış görevinde yalnız teklif vitrini dizgesi hazırlanır)
    const out: Chunk[] = [() => dealHtml(deal, me)];
    sets.forEach((x, i) => out.push(() => (i ? '' : secHtml('Özel Setler', `Paket indirimi <b>-%${Math.round(Math.max(...sets.map(y => y.s.off)) * 100)}</b>`, I.gift)) + `<div class="kh-sets">${setCardHtml(x.s, me, this.owns, coins)}</div>`));
    if (fresh.length) {
      out.push(() => secHtml('Yeni Gelenler', `${freshAll} yeni ürün`, I.sparkle) + `<div class="kh-rail kh-noswipe"><div class="kh-rail__in">${fresh.slice(0, 3).map(it => this.card(it, me, {sub: true, rail: true})).join('')}</div></div>`);
      for (let i = 3; i < fresh.length; i += 3) out.push({into: '.kh-rail__in', html: () => fresh.slice(i, i + 3).map(it => this.card(it, me, {sub: true, rail: true})).join('')});
    }
    if (legend.length) {
      out.push(() => secHtml('Efsanevi Vitrin', 'Masada herkes sana bakacak', I.crown) + `<div class="kh-grid">${legend.slice(0, 2).map(it => this.card(it, me, {sub: true})).join('')}</div>`);
      if (legend.length > 2) out.push(() => `<div class="kh-grid">${legend.slice(2).map(it => this.card(it, me, {sub: true})).join('')}</div>`);
    }
    if (afford.length) out.push(() => secHtml('Hemen Alabileceklerin', `Kasanda ${coinImg()}<b>${fmt(coins)}</b>`, I.check) + `<div class="kh-grid">${afford.map(it => this.card(it, me, {sub: true})).join('')}</div>`);
    else if (goal.length) out.push(() => secHtml('Hedefin', 'Birkaç el kazan, senin olsun', I.target) + `<div class="kh-grid">${goal.map(it => this.card(it, me, {sub: true})).join('')}</div>`);
    return out;
  }

  private setsHtml(me: Me): Chunk[] {
    const coins = this.shell.profile.data.coins;
    const all = shopSets().map(s => ({s, p: setPrice(s, this.owns)}));
    const open = all.filter(x => x.p.missing.length).sort((a, b) => b.p.full - b.p.price - (a.p.full - a.p.price));
    const done = all.filter(x => !x.p.missing.length);
    const out: Chunk[] = [() => secHtml('Tema Setleri', 'Tek temada tam takım, indirimli', I.gift)];
    for (const x of open) out.push(() => `<div class="kh-sets">${setCardHtml(x.s, me, this.owns, coins)}</div>`);
    out.splice(0, 2, join2(out[0], out[1]));
    if (done.length) out.push(() => secHtml('Tamamladıkların', `${done.length} set`, I.check) + `<div class="kh-sets">${done.map(x => setCardHtml(x.s, me, this.owns, coins)).join('')}</div>`);
    return out;
  }

  private kindHtml(kind: ItemKind, me: Me): Chunk[] {
    const items = CATALOG.filter(it => it.kind === kind);
    const owned = items.filter(it => this.owns(it.kind, it.id));
    const un = items.filter(it => !this.owns(it.kind, it.id)).sort((a, b) => RANK[b.rarity] - RANK[a.rarity] || b.price - a.price);
    const mine = owned.sort((a, b) => Number(this.equipped(b.kind, b.id)) - Number(this.equipped(a.kind, a.id)) || RANK[b.rarity] - RANK[a.rarity]);
    const k = items.length ? owned.length / items.length : 0;
    const hero = un[0] && RANK[un[0].rarity] >= 2 ? un[0] : null;
    const grid = hero ? un.slice(1) : un;
    const out: Chunk[] = [() => `<div class="kh-cprog2"><span class="kh-cprog2__t">${KIND_INFO[kind].plural}</span><span class="kh-cprog2__bar"><i style="transform:scaleX(${k.toFixed(3)})"></i></span><b class="kh-num">${owned.length}/${items.length}</b><small>sende</small></div>
      ${hero ? `<div class="kh-grid">${this.card(hero, me, {wide: true})}</div>` : ''}${!un.length ? `<div class="kh-shop__all">${I.crown}<span>Bu bölümdeki her şey sende. Usta koleksiyoncu!</span></div>` : ''}`];
    // ızgara 4'erli parçalar (ilk parça ilk ekranla birlikte)
    for (let i = 0; i < grid.length; i += 2) out.push(() => `<div class="kh-grid">${grid.slice(i, i + 2).map(it => this.card(it, me)).join('')}</div>`);
    if (out.length > 1) out.splice(0, 2, join2(out[0], out[1]));
    for (let i = 0; i < mine.length; i += 4) out.push(() => (i ? '' : secHtml('Sende', `${mine.length} parça`, I.check)) + `<div class="kh-grid is-mine">${mine.slice(i, i + 4).map(it => this.card(it, me)).join('')}</div>`);
    return out;
  }

  private act(a: string, b: HTMLElement): void {
    const s = this.shell.ctx.sounds;
    if (a === 'tab') {
      const t = b.dataset.t as ShopTab;
      if (t === this.tab) return;
      s.tap();
      haptic('light');
      const dir = TABS.findIndex(x => x.id === t) > TABS.findIndex(x => x.id === this.tab) ? 1 : -1;
      const cur = this.panels.get(this.tab);
      if (cur) cur.scroll = this.body.scrollTop;
      this.spot.stop();
      const from = this.el.querySelector<HTMLElement>('.kh-stab.is-on') ?? undefined;
      this.tab = t;
      this.activate(true, dir, from);
    } else if (a === 'item' || a === 'deal') {
      s.tap();
      const it = itemOf(b.dataset.k as ItemKind, b.dataset.id!);
      if (!it) return;
      bump(b, 0.97);
      const deal = a === 'deal' ? dealOf(this.owns) : null;
      productSheet(this.shell, it, deal && deal.item.id === it.id && deal.item.kind === it.kind ? deal.price : undefined, () => this.refresh());
    } else if (a === 'set') {
      s.tap();
      const set = setById(b.dataset.set!);
      if (!set) return;
      bump(b, 0.98);
      setSheet(this.shell, set, () => this.refresh());
    } else if (a === 'coll') {
      s.tap();
      this.shell.goto('profile');
    }
  }

  /** Satın alma/kuşanma sonrası: görünen paneli tazele (diğerleri dönüşte imzayla tazelenir). */
  private refresh(): void {
    if (!this.visible) return;
    const p = this.panels.get(this.tab);
    if (p) p.scroll = this.body.scrollTop;
    this.activate(false);
  }

  private tickDeal(): void {
    const p = this.panels.get('featured');
    const t = p?.el.querySelector('.kh-deal__time b');
    if (!t) return;
    t.textContent = hms(msToMidnight() / 1000);
    if (ANIM && this.visible && this.tab === 'featured') this.dealT = window.setTimeout(() => this.scope.alive && this.tickDeal(), 1000);
  }

  destroy(): void {
    this.scope.dispose();
    this.el.remove();
  }
}

// =====================================================================================================
// Ürün penceresi: etkileşimli sahne + satın alma
// =====================================================================================================
interface Stage {
  /** Satın alma/kuşanma anında sahneyi coştur */
  cheer(): void;
  stop(): void;
}

/** Sahneyi kur (tür başına). */
function mountStage(shell: Shell, it: ShopItem, pv: HTMLElement, scope: Scope): Stage {
  const me = meOf(shell);
  const none: Stage = {cheer: () => bump(pv, 1.08), stop: () => undefined};
  if (it.kind === 'deck') {
    const v = mountDeckViewer(pv, it.id, scope, 1);
    return {cheer: () => v.flip(), stop: () => undefined};
  }
  if (it.kind === 'table') {
    pv.innerHTML = `<span class="kh-pd__tbl">${tableSceneHtml(it.id, {deck: me.deck, size: 'full'})}</span>`;
    const scene = q(pv, '.kh-ts');
    paintTableLater(scene, it.id);
    const throwCard = (): void => {
      const c = scene.querySelector('.kh-ts__hand .kh-ts__c:nth-child(3)');
      if (!c || !ANIM) return;
      play(c, [{transform: getComputedStyle(c).transform}, {transform: 'translate(-50%, -205%) rotate(-14deg) scale(.96)', offset: 0.45}, {transform: 'translate(-50%, -205%) rotate(-14deg) scale(.96)', offset: 0.75}, {transform: getComputedStyle(c).transform}], {duration: 1300, easing: EASE.out});
    };
    scope.on(pv, 'click', () => {
      shell.ctx.sounds.tap();
      throwCard();
    });
    return {cheer: throwCard, stop: () => undefined};
  }
  if (it.kind === 'frame') {
    const poses = ['gulumseme', 'kahkaha', 'zafer', 'pisti'] as const;
    let k = 0;
    pv.innerHTML = `<span class="kh-pd__frame"><i class="kh-pd__halo"></i>${charAvatarHtml(me.char, it.id, 'kh-pd__ava', 'gulumseme')}
      <span class="kh-pd__plate"><b>${esc(me.name)}</b><small>Sv. ${me.level}</small></span></span>`;
    const ava = q(pv, '.kh-pd__ava');
    const poke = (): void => {
      k = (k + 1) % poses.length;
      const img = ava.querySelector<HTMLImageElement>('.kh-ava__img');
      if (img) img.src = me.char.poses[poses[k]];
      play(ava, [{transform: 'scale(1)'}, {transform: 'scale(1.12) rotate(-4deg)', offset: 0.35}, {transform: 'scale(.98) rotate(2deg)', offset: 0.7}, {transform: 'none'}], {duration: 520, easing: EASE.out});
    };
    scope.on(pv, 'click', () => {
      shell.ctx.sounds.tap();
      haptic('light');
      poke();
    });
    return {cheer: poke, stop: () => undefined};
  }
  if (it.kind === 'fx') {
    pv.innerHTML = `<span class="kh-pd__fxs">${tableSceneHtml(me.table, {deck: me.deck, size: 'mini'})}<span class="kh-pd__fxbox"></span></span>`;
    const box = q(pv, '.kh-pd__fxbox');
    const loop: FxLoop = mountFx(box, it.id, false);
    // pencere açılış animasyonu bitince oynat (aynı karede iki ağır iş olmasın)
    const t = window.setTimeout(() => loop.play(), ANIM ? 480 : 0);
    scope.add(() => clearTimeout(t));
    scope.on(pv, 'click', () => {
      shell.ctx.sounds.tap();
      loop.play();
    });
    return {cheer: () => loop.play(), stop: () => loop.stop()};
  }
  pv.innerHTML = pvHtml(it, me, true);
  return none;
}

function stageHint(kind: ItemKind): string {
  return kind === 'deck' ? 'Kaydır · dokun: çevir · basılı tut: ışığı gezdir' : kind === 'table' ? 'Dokun: kart at' : kind === 'frame' ? 'Avatarına dokun' : kind === 'fx' ? 'Dokun: tekrar oynat' : '';
}

function productSheet(shell: Shell, it: ShopItem, dealPrice: number | undefined, onChange: () => void): ModalHandle {
  const ctx = shell.ctx;
  const p = shell.profile;
  const price = dealPrice ?? it.price;
  const c = it.kind === 'char' ? charById(it.id) : null;
  const set = setOf(it);
  const setP = set ? setPrice(set, (k, id) => p.owns(k, id)) : null;
  const badge = badgeOf(it);
  const extra = c
    ? `<div class="kh-pd__char">
        <div class="kh-pd__tags"><span class="kh-pd__style">${I.sparkle}${esc(c.style)}</span><span class="kh-pd__diff">Zorluk ${starsHtml(c.difficulty)}</span></div>
        <p class="kh-pd__story">${esc(c.story)}</p>
        <div class="kh-pd__quote">${esc(c.quote)}</div></div>`
    : '';
  const hint = stageHint(it.kind);
  const m = openSheet(ctx, {
    cls: `kh-pd is-${it.rarity} is-${it.kind}`,
    body: `<div class="kh-pd__stage"><i class="kh-pd__sbg"></i><i class="kh-rays is-gold kh-pd__rays"></i>
        <div class="kh-pd__pv"></div>${hint ? `<span class="kh-pd__hint">${I.hand}${hint}</span>` : ''}</div>
      <div class="kh-pd__meta">${rarityHtml(it.rarity)}<span class="kh-pd__kind">${KIND_INFO[it.kind].name}</span>${badge && !p.owns(it.kind, it.id) ? `<span class="kh-mtag is-${badge}">${BADGE_NAME[badge]}</span>` : ''}${dealPrice ? `<span class="kh-pd__deal">Günün Teklifi -%${Math.round(DEAL_OFF * 100)}</span>` : ''}</div>
      <div class="kh-title kh-pd__name">${g3(it.name, it.rarity === 'legendary' ? '' : 'is-white')}</div>
      <p class="kh-pd__desc">${esc(c ? c.title : it.desc)}</p>
      ${extra}
      ${set && setP && setP.missing.length >= 2 && setP.missing.includes(it) ? `<button class="kh-pd__set" data-act="toset" style="--a:${set.a};--b:${set.b}">${I.gift}<span><b>${esc(set.name)}</b> içinde: ${set.parts.length} parça <b>%${Math.round(set.off * 100)}</b> indirimli</span>${I.chevR}</button>` : ''}
      <div class="kh-pd__wallet"></div>
      <div class="kh-pd__act"></div>
      <div class="kh-pd__msg"></div>`,
  });
  const pv = q(m.panel, '.kh-pd__pv');
  const stage = q(m.panel, '.kh-pd__stage');
  const show = mountStage(shell, it, pv, m.scope);
  m.scope.add(() => show.stop());
  const actBox = q(m.panel, '.kh-pd__act');
  const wallet = q(m.panel, '.kh-pd__wallet');
  const state = (): 'eq' | 'own' | 'buy' => ((it.kind === 'char' ? p.data.char === it.id : p.data.equipped[it.kind as Exclude<ItemKind, 'char'>] === it.id) ? 'eq' : p.owns(it.kind, it.id) ? 'own' : 'buy');
  const renderAct = (pop = false): void => {
    const st = state();
    const tryBtn = `<button class="kh-btn kh-btn--4 kh-btn--xl kh-pd__try" data-act="try">${I.eye}<span>Dene</span></button>`;
    const short = Math.max(0, price - p.data.coins);
    actBox.innerHTML = st === 'buy'
      ? short
        ? // yetemiyor: düğme ölü değil, yumuşak tonda eksik miktarı söyler; dokununca nasıl kazanılacağını gösterir
          `${tryBtn}<button class="kh-btn kh-btn--4 kh-btn--xl kh-pd__btn is-short" data-act="buy"><span class="kh-pd__cost">${coinImg()}<b class="kh-num">${fmt(short)}</b></span><span>eksik</span></button>`
        : `${tryBtn}<button class="kh-btn kh-btn--1 kh-btn--xl kh-pd__btn" data-act="buy"><span>Satın Al</span><span class="kh-pd__cost">${coinImg()}<b class="kh-num">${fmt(price)}</b></span></button>`
      : st === 'own'
        ? `${tryBtn}<button class="kh-btn kh-btn--5 kh-btn--xl kh-pd__btn" data-act="equip">${I.check}<span>Kuşan</span></button>`
        : `<button class="kh-btn kh-btn--4 kh-btn--xl kh-pd__btn is-done" disabled>${I.check}<span>Kuşanıldı</span></button>`;
    // cüzdan: alınca ne kalır / ne kadar eksik (fiyat çapası + kaygı azaltma)
    const coins = p.data.coins;
    wallet.innerHTML = st !== 'buy'
      ? ''
      : coins >= price
        ? `<span class="kh-pd__wl">Kasan ${coinImg()}<b class="kh-num">${fmt(coins)}</b></span>${I.chevR}<span class="kh-pd__wl is-after">Kalan ${coinImg()}<b class="kh-num">${fmt(coins - price)}</b></span>`
        : `<span class="kh-pd__need"><span class="kh-pd__needbar"><i style="transform:scaleX(${clamp(coins / price, 0, 1).toFixed(3)})"></i></span><span><b class="kh-num">%${Math.floor((coins / price) * 100)}</b> hazır · <b class="kh-num">${fmt(price - coins)}</b> jeton daha</span></span>`;
    if (pop) play(actBox.firstElementChild!, [{transform: 'scale(.6)', opacity: 0}, {transform: 'scale(1.06)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 420, easing: EASE.out});
  };
  renderAct();
  play(pv, [{transform: 'scale(.7) translateY(16px)', opacity: 0}, {transform: 'scale(1.03)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 480, delay: 110, easing: EASE.out, fill: 'backwards'});
  // vitrinin ilk ışığı: pencere oturduktan sonra tek süpürme
  if (RANK[it.rarity] >= 2) {
    stage.insertAdjacentHTML('beforeend', glintHtml());
    m.scope.timeout(() => glint(stage, 1200), 650);
  }

  let busy = false;
  onAct(m.scope, m.panel, async (a, b) => {
    if (busy) return;
    if (a === 'toset' && set) {
      ctx.sounds.tap();
      await m.close();
      setSheet(shell, set, onChange);
      return;
    }
    if (a === 'earn') {
      ctx.sounds.tap();
      await m.close();
      shell.goto(b.dataset.to as 'home' | 'quests');
      return;
    }
    if (a === 'try') {
      ctx.sounds.tap();
      haptic('light');
      openTryOn(shell, it, {
        price: state() === 'buy' ? price : 0,
        onBuy: () => (q(m.panel, '[data-act=buy]') as HTMLElement | null)?.click(),
        onEquip: () => (m.panel.querySelector('[data-act=equip]') as HTMLElement | null)?.click(),
      });
      return;
    }
    if (a === 'equip') {
      ctx.sounds.tap();
      p.equip(it.kind, it.id);
      shell.cosmetics(it.kind, it.id);
      haptic('success');
      ctx.sounds.reward();
      renderAct(true);
      show.cheer();
      toast(ctx, EQUIP_MSG[it.kind], I.check);
      onChange();
      return;
    }
    if (a !== 'buy') return;
    const msg = q(m.panel, '.kh-pd__msg');
    if (p.data.coins < price) {
      // yetersiz jeton: sallan + nazik mesaj (oyuncunun karakteri üzgün bakar)
      ctx.sounds.tap();
      haptic('warning');
      shake(b, 1);
      shake(wallet, 0.5);
      showEarn(shell, msg, price - p.data.coins);
      return;
    }
    busy = true;
    (b as HTMLButtonElement).disabled = true;
    msg.innerHTML = '';
    m.panel.querySelector('.kh-pd__set')?.remove(); // alındıktan sonra "set içinde indirimli" artık geçerli değil
    shell.coins.hold();
    let ok = false;
    if (dealPrice !== undefined) {
      if (p.data.coins >= price && !p.owns(it.kind, it.id)) {
        p.addCoins(-price);
        p.grant(it.kind, it.id);
        ok = true;
      }
    } else ok = p.buy(it.kind, it.id) === 'ok';
    if (!ok) {
      shell.coins.release();
      busy = false;
      renderAct();
      return;
    }
    await payFx(shell, price, pv, m.scope);
    if (!m.scope.alive) return;
    unlockFx(shell, stage, pv);
    show.cheer();
    renderAct(true);
    onChange();
    busy = false;
  });
  return m;
}

/** Yetersiz jeton: nazik mesaj + kasayı doldurmanın yolları (dokununca pencere kapanır, ilgili sekmeye gider). */
function showEarn(shell: Shell, msg: HTMLElement, short: number): void {
  const me = charById(shell.profile.data.char ?? 'dursun');
  msg.innerHTML = `<span class="kh-pd__sad"><img src="${me.poses.uzgun}" alt=""></span><span class="kh-pd__earn"><span><b>${fmt(short)} jeton</b> daha lazım. Kasayı doldurmanın yolları:</span>
    <span class="kh-pd__ways"><button class="kh-pd__way" data-act="earn" data-to="home">${I.play}Bir el oyna</button><button class="kh-pd__way" data-act="earn" data-to="quests">${I.target}Görevler</button><button class="kh-pd__way" data-act="earn" data-to="home">${I.gift}Günlük ödül · sandık</button></span></span>`;
  play(msg, [{transform: 'translateY(10px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, easing: EASE.spring});
  msg.scrollIntoView({block: 'nearest', behavior: ANIM ? 'smooth' : 'auto'});
}

/** Jetonlar bakiyeden ürüne uçar (kapsül sayar). Çağıran satın almadan ÖNCE shell.coins.hold() demiş olmalı; burada bırakılır. */
async function payFx(shell: Shell, price: number, target: Element, scope: Scope): Promise<void> {
  const ctx = shell.ctx;
  const meter = shell.coins;
  const to = center(target);
  const n = Math.min(12, 5 + Math.round(price / 1500));
  let paid = 0;
  try {
    await ctx.fx.flyCoins(meter.target(), to, n, i => {
      ctx.sounds.coin(1);
      const d = i === n - 1 ? price - paid : Math.round(price / n);
      paid += d;
      meter.add(-d);
      if (scope.alive) bump(target, 1.04);
    });
  } finally {
    meter.release();
  }
}

/** Kilit açılışı: ışınlar, parlama, konfeti, "Açıldı!" */
function unlockFx(shell: Shell, stage: HTMLElement, pv: HTMLElement): void {
  const ctx = shell.ctx;
  const to = center(pv);
  if (ctx.sounds.fanfare) ctx.sounds.fanfare();
  else ctx.sounds.reward();
  haptic('success');
  stage.classList.add('is-unlocked');
  const rays = stage.querySelector('.kh-pd__rays');
  if (rays) play(rays, [{transform: 'scale(.2) rotate(0)', opacity: 0}, {transform: 'scale(1) rotate(30deg)', opacity: 1}], {duration: 700, easing: EASE.out, fill: 'forwards'});
  play(pv, [{transform: 'scale(1)'}, {transform: 'scale(1.14) rotate(-3deg)', offset: 0.35}, {transform: 'scale(.97) rotate(1deg)', offset: 0.7}, {transform: 'none'}], {duration: 620, easing: EASE.out});
  ctx.fx.flash(0.5, 380);
  ctx.fx.burst(to, {coins: 0, confetti: 30, power: 0.9});
  stampWord(ctx, 'Açıldı!', {x: to.x, y: to.y}, {size: 3.4, ms: 1300});
}

// =====================================================================================================
// Set penceresi
// =====================================================================================================
function setSheet(shell: Shell, s: ShopSet, onChange: () => void): ModalHandle {
  const ctx = shell.ctx;
  const p = shell.profile;
  const owns = (k: ItemKind, id: string): boolean => p.owns(k, id);
  const me = meOf(shell);
  const pr0 = setPrice(s, owns);
  const m = openSheet(ctx, {
    cls: 'kh-pd kh-sd is-legendary',
    body: `<div class="kh-pd__stage kh-sd__stage" style="--a:${s.a};--b:${s.b}"><i class="kh-rays is-gold kh-pd__rays"></i>
        <div class="kh-pd__pv kh-sd__parts" data-n="${s.parts.length}">${s.parts.map((it, i) => `<button class="kh-sd__part is-${it.kind} is-${it.rarity}" data-act="part" data-k="${it.kind}" data-id="${it.id}" style="--n:${i - (s.parts.length - 1) / 2}">
          <span class="kh-sd__pv"><i class="kh-item__bg"></i>${pvHtml(it, me)}</span><b>${esc(it.name)}</b><small>${KIND_INFO[it.kind].name}</small>
          <span class="kh-sd__st"></span></button>`).join('')}</div></div>
      <div class="kh-pd__meta"><span class="kh-mtag is-limited">${I.gift}Set</span><span class="kh-pd__kind">${s.parts.length} parça</span></div>
      <div class="kh-title kh-pd__name">${g3(s.name)}</div>
      <p class="kh-pd__desc">${esc(s.tag)}. Tek tek almaktan <b>%${Math.round(s.off * 100)}</b> ucuz.</p>
      <div class="kh-sd__sum"></div>
      <div class="kh-pd__act"></div>
      <div class="kh-pd__msg"></div>`,
  });
  hydrate(m.panel);
  const actBox = q(m.panel, '.kh-pd__act');
  const sum = q(m.panel, '.kh-sd__sum');
  const parts = q(m.panel, '.kh-sd__parts');
  const render = (pop = false): void => {
    const pr = setPrice(s, owns);
    m.panel.querySelectorAll<HTMLElement>('.kh-sd__part').forEach(el => {
      const it = itemOf(el.dataset.k as ItemKind, el.dataset.id!)!;
      const own = owns(it.kind, it.id);
      el.classList.toggle('is-own', own);
      q(el, '.kh-sd__st').innerHTML = own ? `${I.check}Sende` : `<s class="kh-num">${fmt(it.price)}</s>`;
    });
    if (!pr.missing.length) {
      sum.innerHTML = `<span class="kh-sd__all">${I.crown}Setin tamamı sende!</span>`;
      actBox.innerHTML = `<button class="kh-btn kh-btn--5 kh-btn--xl kh-btn--block kh-pd__btn" data-act="equipall">${I.check}<span>Hepsini Kuşan</span></button>`;
    } else {
      const save = pr.full - pr.price;
      sum.innerHTML = `<span class="kh-sd__row"><span>Tek tek</span><s class="kh-num">${fmt(pr.full)}</s></span>
        <span class="kh-sd__row is-save"><span>Set indirimi</span><b class="kh-num">−${fmt(save)}</b></span>
        ${pr.missing.length < s.parts.length ? `<span class="kh-sd__note">${s.parts.length - pr.missing.length} parça zaten sende; yalnız eksikler ödenir.</span>` : ''}`;
      const short = pr.price - p.data.coins;
      actBox.innerHTML = short > 0
        ? `<button class="kh-btn kh-btn--4 kh-btn--xl kh-btn--block kh-pd__btn is-short" data-act="buyset"><span class="kh-pd__cost">${coinImg()}<b class="kh-num">${fmt(short)}</b></span><span>eksik</span></button>`
        : `<button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-pd__btn" data-act="buyset"><span>Seti Al</span><span class="kh-pd__cost">${coinImg()}<b class="kh-num">${fmt(pr.price)}</b></span></button>`;
    }
    if (pop) play(actBox.firstElementChild!, [{transform: 'scale(.6)', opacity: 0}, {transform: 'scale(1.06)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 420, easing: EASE.out});
  };
  render();
  m.panel.querySelectorAll('.kh-sd__part').forEach((el, i) =>
    play(el, [{transform: 'translateY(30px) scale(.7)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: 140 + i * 90, easing: EASE.spring, fill: 'backwards'}));
  const stage = q(m.panel, '.kh-sd__stage');
  if (pr0.missing.length) {
    stage.insertAdjacentHTML('beforeend', glintHtml());
    m.scope.timeout(() => glint(stage, 1200), 700);
  }
  let busy = false;
  onAct(m.scope, m.panel, async (a, b) => {
    if (busy) return;
    if (a === 'part') {
      ctx.sounds.tap();
      const it = itemOf(b.dataset.k as ItemKind, b.dataset.id!);
      if (!it) return;
      bump(b, 0.96);
      productSheet(shell, it, undefined, () => {
        render();
        onChange();
      });
      return;
    }
    if (a === 'earn') {
      ctx.sounds.tap();
      await m.close();
      shell.goto(b.dataset.to as 'home' | 'quests');
      return;
    }
    if (a === 'equipall') {
      ctx.sounds.reward();
      haptic('success');
      const did = new Set<ItemKind>();
      for (const it of s.parts) {
        if (did.has(it.kind) || !owns(it.kind, it.id)) continue;
        did.add(it.kind);
        p.equip(it.kind, it.id);
        shell.cosmetics(it.kind, it.id);
      }
      bump(parts, 1.06);
      toast(ctx, `${s.name} kuşanıldı!`, I.check);
      onChange();
      return;
    }
    if (a !== 'buyset') return;
    const pr = setPrice(s, owns);
    const msg = q(m.panel, '.kh-pd__msg');
    if (p.data.coins < pr.price) {
      ctx.sounds.tap();
      haptic('warning');
      shake(b, 1);
      showEarn(shell, msg, pr.price - p.data.coins);
      return;
    }
    busy = true;
    (b as HTMLButtonElement).disabled = true;
    msg.innerHTML = '';
    shell.coins.hold();
    p.addCoins(-pr.price);
    for (const it of pr.missing) p.grant(it.kind, it.id);
    await payFx(shell, pr.price, parts, m.scope);
    if (!m.scope.alive) return;
    unlockFx(shell, stage, parts);
    render(true);
    onChange();
    busy = false;
  });
  return m;
}

// Uygulama açıldıktan sonra boşta: vitrin görsellerinin ilk kullanım maliyeti (veri adresi/SVG) önceden ödensin
warmPreviews({
  decks: CATALOG.filter(i => i.kind === 'deck').map(i => i.id),
  tables: CATALOG.filter(i => i.kind === 'table').map(i => i.id),
  frames: CATALOG.filter(i => i.kind === 'frame').map(i => i.id),
});
