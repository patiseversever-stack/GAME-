// MARKET: sekmeler (Öne Çıkan · Karakterler · Desteler · Masalar · Efektler · Çerçeveler), parıltılı "Günün Teklifi" (geri sayım),
// nadirlik çerçeveli ürün kartları (efsanevi: altın ışıltı), canlı önizlemeler (gerçek kartlar, mini masa, döngülü efekt, portre),
// satın alma: ürün penceresi → jetonlar bakiyeden ürüne uçar → kilit açılış patlaması → "KUŞAN". Yetersiz jetonda sallanır, nazikçe söyler.
import './shop.css';
import {CATALOG, KIND_INFO, itemOf, type ItemKind, type ShopItem} from '../game/catalog';
import {charById, type Rarity} from '../game/roster';
import {ANIM, EASE, Scope, bump, center, esc, fmt, h, hms, play, q, shake} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {charAvatarHtml, onAct, openSheet, rarityHtml, starsHtml, stampWord, toast, type ModalHandle} from './parts';
import {deferMount, mountDeckFan, mountFx, mountTable, type FxLoop} from './previews';
import {haptic} from '../platform/bridge';
import {g3} from './fx';
import type {Page, Shell} from './lobby';

type ShopTab = 'featured' | ItemKind;
const TABS: {id: ShopTab; name: string}[] = [
  {id: 'featured', name: 'Öne Çıkan'},
  {id: 'char', name: 'Karakterler'},
  {id: 'deck', name: 'Desteler'},
  {id: 'table', name: 'Masalar'},
  {id: 'fx', name: 'Efektler'},
  {id: 'frame', name: 'Çerçeveler'},
];
const RANK: Record<Rarity, number> = {common: 0, rare: 1, epic: 2, legendary: 3};
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
  const pool = CATALOG.filter(i => !i.starter && i.price > 0 && !owns(i.kind, i.id));
  const best = pool.filter(i => RANK[i.rarity] >= 2);
  const list = best.length ? best : pool;
  if (!list.length) return null;
  const item = list[seed % list.length];
  return {item, price: Math.round((item.price * (1 - DEAL_OFF)) / 50) * 50};
}

const msToMidnight = () => {
  const n = new Date();
  const m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return m.getTime() - n.getTime();
};

export class ShopPage implements Page {
  readonly el = h('div', 'kh-page kh-shop');
  private scope = new Scope();
  private tab: ShopTab = 'featured';
  private body: HTMLElement;
  private dealT = 0;

  constructor(private shell: Shell) {
    this.el.innerHTML = `<header class="kh-shop__head"><div class="kh-title kh-shop__title">${g3('Market')}</div><span class="kh-shop__count"></span></header>
      <div class="kh-shop__tabs kh-noswipe"><div class="kh-shop__track">${TABS.map(t => `<button class="kh-stab" data-act="tab" data-t="${t.id}">${t.name}</button>`).join('')}<i class="kh-stab__ind"></i></div></div>
      <div class="kh-shop__body kh-scroll"></div>`;
    this.body = q(this.el, '.kh-shop__body');
    onAct(this.scope, this.el, (a, b) => this.act(a, b));
    this.scope.add(() => clearTimeout(this.dealT));
    // içerik ilk show()'da kurulur (kurucuda da kurmak ilk açılışta işi ikiye katlıyordu)
  }

  /** Mağazanın göstereceği şeyi belirleyen durum: değişmediyse sekme dönüşünde yeniden kurmaya gerek yok. */
  private sig = '';
  private signature(): string {
    const d = this.shell.profile.data;
    const deal = dealOf(this.owns);
    return [this.tab, d.char, JSON.stringify(d.equipped), CATALOG.map(it => (this.owns(it.kind, it.id) ? 1 : 0)).join(''), deal ? `${deal.item.kind}:${deal.item.id}:${deal.price}` : '-'].join('|');
  }

  show(sub?: string): void {
    if (sub && TABS.some(t => t.id === sub) && sub !== this.tab) this.tab = sub as ShopTab;
    if (this.sig && this.body.firstChild && this.sig === this.signature()) {
      this.placeInd();
      if (this.tab === 'featured') this.tickDeal();
      return;
    }
    this.render(true);
  }

  private placeInd(): void {
    const tabs = this.el.querySelectorAll<HTMLElement>('.kh-stab');
    const on = tabs[TABS.findIndex(t => t.id === this.tab)];
    const ind = q(this.el, '.kh-stab__ind');
    ind.style.width = on.offsetWidth + 'px';
    ind.style.transform = `translateX(${on.offsetLeft}px)`;
  }
  hide(): void {
    clearTimeout(this.dealT);
  }

  private owns = (k: ItemKind, id: string) => this.shell.profile.owns(k, id);
  private equipped(k: ItemKind, id: string): boolean {
    const d = this.shell.profile.data;
    return k === 'char' ? d.char === id : d.equipped[k] === id;
  }

  private act(a: string, b: HTMLElement): void {
    const s = this.shell.ctx.sounds;
    if (a === 'tab') {
      const t = b.dataset.t as ShopTab;
      if (t === this.tab) return;
      s.tap();
      haptic('light');
      const dir = TABS.findIndex(x => x.id === t) > TABS.findIndex(x => x.id === this.tab) ? 1 : -1;
      this.tab = t;
      this.render(true, dir);
      b.scrollIntoView({behavior: ANIM ? 'smooth' : 'auto', inline: 'center', block: 'nearest'});
    } else if (a === 'item' || a === 'deal') {
      s.tap();
      const it = itemOf(b.dataset.k as ItemKind, b.dataset.id!);
      if (!it) return;
      bump(b, 0.96);
      const deal = a === 'deal' ? dealOf(this.owns) : null;
      productSheet(this.shell, it, deal && deal.item.id === it.id && deal.item.kind === it.kind ? deal.price : undefined, () => this.render(false));
    }
  }

  /** Sekme içeriğini kur. dir: kayma yönü (sekme değişimi). */
  private render(animate: boolean, dir = 0): void {
    const tabs = this.el.querySelectorAll<HTMLElement>('.kh-stab');
    const i = TABS.findIndex(t => t.id === this.tab);
    tabs.forEach((t, k) => t.classList.toggle('is-on', k === i));
    this.placeInd();
    this.sig = this.signature();
    const owned = CATALOG.filter(it => this.owns(it.kind, it.id)).length;
    q(this.el, '.kh-shop__count').innerHTML = `${I.grid}<b class="kh-num">${owned}/${CATALOG.length}</b>`;
    clearTimeout(this.dealT);
    const html = this.tab === 'featured' ? this.featuredHtml() : this.gridHtml(CATALOG.filter(it => it.kind === this.tab), KIND_INFO[this.tab as ItemKind].plural);
    this.body.innerHTML = html;
    this.body.scrollTop = 0;
    this.mountPreviews();
    if (this.tab === 'featured') this.tickDeal();
    if (animate) {
      if (dir) play(this.body, [{transform: `translateX(${dir * 12}%)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, easing: EASE.outQuart});
      this.body.querySelectorAll('.kh-item, .kh-deal').forEach((c, k) =>
        play(c, [{transform: 'translateY(26px) scale(.92)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 40 + Math.min(k, 8) * 45, easing: EASE.spring, fill: 'backwards'}));
    }
  }

  private featuredHtml(): string {
    const deal = dealOf(this.owns);
    const dealHtml = deal
      ? `<button class="kh-deal is-${deal.item.rarity}" data-act="deal" data-k="${deal.item.kind}" data-id="${deal.item.id}" data-spring>
          <i class="kh-deal__shine"></i><i class="kh-deal__rays"></i>
          <span class="kh-deal__pv" data-pv="${deal.item.kind}:${deal.item.id}"></span>
          <span class="kh-deal__info">
            <span class="kh-deal__kick">${I.sparkle}Günün Teklifi</span>
            <b class="kh-deal__name">${esc(deal.item.name)}</b>
            <span class="kh-deal__kind">${rarityHtml(deal.item.rarity)}<small>${KIND_INFO[deal.item.kind].name}</small></span>
            <span class="kh-deal__price"><s class="kh-num">${fmt(deal.item.price)}</s><span class="kh-coins"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(deal.price)}</b></span></span>
            <span class="kh-deal__time">${I.bell}<b class="kh-num">${hms(msToMidnight() / 1000)}</b></span>
          </span>
          <span class="kh-deal__off">-%${Math.round(DEAL_OFF * 100)}</span>
        </button>`
      : `<div class="kh-deal is-done"><span class="kh-deal__info"><span class="kh-deal__kick">${I.crown}Koleksiyon tamam!</span><b class="kh-deal__name">Her şey sende, usta!</b></span></div>`;
    const feat = CATALOG.filter(it => !it.starter && !this.owns(it.kind, it.id) && !(deal && it.id === deal.item.id && it.kind === deal.item.kind))
      .sort((a, b) => RANK[b.rarity] - RANK[a.rarity] || b.price - a.price)
      .slice(0, 8);
    return `${dealHtml}${feat.length ? this.gridHtml(feat, 'Sana Özel') : ''}`;
  }

  private gridHtml(items: readonly ShopItem[], title: string): string {
    const sorted = items.slice().sort((a, b) => {
      const ea = this.equipped(a.kind, a.id) ? 2 : this.owns(a.kind, a.id) ? 1 : 0;
      const eb = this.equipped(b.kind, b.id) ? 2 : this.owns(b.kind, b.id) ? 1 : 0;
      return eb - ea || a.price - b.price;
    });
    return `<div class="kh-shop__sec">${esc(title)}</div><div class="kh-grid">${sorted.map(it => itemCardHtml(it, this.owns(it.kind, it.id), this.equipped(it.kind, it.id))).join('')}</div>`;
  }

  private mountPreviews(): void {
    this.body.querySelectorAll<HTMLElement>('[data-pv]').forEach(pv => mountPreview(pv, this.shell, false));
  }

  private tickDeal(): void {
    const t = this.body.querySelector('.kh-deal__time b');
    if (!t) return;
    t.textContent = hms(msToMidnight() / 1000);
    if (ANIM) this.dealT = window.setTimeout(() => this.scope.alive && this.tickDeal(), 1000);
  }

  destroy(): void {
    this.scope.dispose();
    this.el.remove();
  }
}

/** Ürün kartı HTML'i (ızgara). */
function itemCardHtml(it: ShopItem, owned: boolean, eq: boolean): string {
  const foot = eq
    ? `<span class="kh-item__state is-eq">${I.check}Kuşanıldı</span>`
    : owned
      ? `<span class="kh-item__state is-own">Sende</span>`
      : `<span class="kh-item__price"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(it.price)}</b></span>`;
  return `<button class="kh-item is-${it.rarity}${owned ? ' is-owned' : ''}${eq ? ' is-eq' : ''}" data-act="item" data-k="${it.kind}" data-id="${it.id}">
    <span class="kh-item__pv is-${it.kind}" data-pv="${it.kind}:${it.id}"></span>
    ${it.rarity === 'legendary' ? '<i class="kh-item__shine"></i><i class="kh-item__spark"></i>' : ''}
    ${rarityHtml(it.rarity, 'kh-item__rar')}
    <span class="kh-item__name">${esc(it.name)}</span>
    ${foot}
  </button>`;
}

/** Önizleme kutusunu doldur (tür:id). big: ürün penceresi. */
function mountPreview(pv: HTMLElement, shell: Shell, big: boolean): FxLoop | null {
  const [kind, id] = (pv.dataset.pv ?? '').split(':') as [ItemKind, string];
  pv.classList.add('kh-pv', `is-${kind}`);
  if (kind === 'char') {
    const c = charById(id);
    pv.style.setProperty('--c', c.color);
    pv.innerHTML = `<i class="kh-pv__glow"></i><img class="kh-pv__char" src="${c.poses[big ? 'gulumseme' : 'notr']}" alt="">`;
  } else if (kind === 'deck') {
    const box = h('span', 'kh-pv__fan');
    pv.append(box);
    mountDeckFan(box, id, big ? 5 : 3);
  } else if (kind === 'table') {
    const box = h('span', 'kh-pv__table');
    pv.append(box);
    if (big) requestAnimationFrame(() => mountTable(box, id, true));
    else deferMount(box, () => mountTable(box, id, false));
  } else if (kind === 'fx') {
    const box = h('span', 'kh-pv__fx');
    pv.append(box);
    if (!big) {
      deferMount(box, () => mountFx(box, id, true));
      return null;
    }
    const loop = mountFx(box, id, false);
    requestAnimationFrame(() => loop.play());
    return loop;
  } else if (kind === 'frame') {
    const d = shell.profile.data;
    pv.innerHTML = charAvatarHtml(charById(d.char ?? 'dursun'), id, 'kh-pv__ava');
  }
  return null;
}

// =====================================================================================================
// Ürün penceresi + satın alma
// =====================================================================================================
function productSheet(shell: Shell, it: ShopItem, dealPrice: number | undefined, onChange: () => void): ModalHandle {
  const ctx = shell.ctx;
  const p = shell.profile;
  const price = dealPrice ?? it.price;
  const c = it.kind === 'char' ? charById(it.id) : null;
  const extra = c
    ? `<div class="kh-pd__char">
        <div class="kh-pd__tags"><span class="kh-pd__style">${I.sparkle}${esc(c.style)}</span><span class="kh-pd__diff">Zorluk ${starsHtml(c.difficulty)}</span></div>
        <p class="kh-pd__story">${esc(c.story)}</p>
        <div class="kh-pd__quote">${esc(c.quote)}</div></div>`
    : '';
  const m = openSheet(ctx, {
    cls: `kh-pd is-${it.rarity} is-${it.kind}`,
    body: `<div class="kh-pd__stage"><i class="kh-rays is-gold kh-pd__rays"></i><div class="kh-pd__pv" data-pv="${it.kind}:${it.id}"></div>${it.kind === 'fx' ? `<button class="kh-pd__replay" data-act="replay">${I.play}Tekrar</button>` : ''}</div>
      <div class="kh-pd__meta">${rarityHtml(it.rarity)}<span class="kh-pd__kind">${KIND_INFO[it.kind].name}</span>${dealPrice ? `<span class="kh-pd__deal">Günün Teklifi -%${Math.round(DEAL_OFF * 100)}</span>` : ''}</div>
      <div class="kh-title kh-pd__name">${g3(it.name, it.rarity === 'legendary' ? '' : 'is-white')}</div>
      <p class="kh-pd__desc">${esc(c ? c.title : it.desc)}</p>
      ${extra}
      <div class="kh-pd__act"></div>
      <div class="kh-pd__msg"></div>`,
  });
  const pv = q(m.panel, '.kh-pd__pv');
  const loop = mountPreview(pv, shell, true);
  m.scope.add(() => loop?.stop());
  const actBox = q(m.panel, '.kh-pd__act');
  const state = () => (it.kind === 'char' ? p.data.char === it.id : p.data.equipped[it.kind as Exclude<ItemKind, 'char'>] === it.id) ? 'eq' : p.owns(it.kind, it.id) ? 'own' : 'buy';
  const renderAct = (pop = false) => {
    const st = state();
    actBox.innerHTML = st === 'buy'
      ? `<button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-shine kh-pd__btn" data-act="buy"><span>Satın Al</span><span class="kh-pd__cost"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(price)}</b></span></button>`
      : st === 'own'
        ? `<button class="kh-btn kh-btn--5 kh-btn--xl kh-btn--block kh-pd__btn" data-act="equip">${I.check}<span>Kuşan</span></button>`
        : `<button class="kh-btn kh-btn--4 kh-btn--xl kh-btn--block kh-pd__btn is-done" disabled>${I.check}<span>Kuşanıldı</span></button>`;
    if (pop) play(actBox.firstElementChild!, [{transform: 'scale(.6)', opacity: 0}, {transform: 'scale(1.06)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 420, easing: EASE.out});
  };
  renderAct();
  const stage = q(m.panel, '.kh-pd__stage');
  play(pv, [{transform: 'scale(.6) translateY(20px)', opacity: 0}, {transform: 'scale(1.04)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 520, delay: 120, easing: EASE.out, fill: 'backwards'});

  let busy = false;
  onAct(m.scope, m.panel, async (a, b) => {
    if (busy) return;
    if (a === 'replay') {
      ctx.sounds.tap();
      loop?.play();
      return;
    }
    if (a === 'equip') {
      ctx.sounds.tap();
      p.equip(it.kind, it.id);
      shell.cosmetics(it.kind, it.id);
      haptic('success');
      ctx.sounds.reward();
      renderAct(true);
      bump(pv, 1.08);
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
      shake(q(stage, '.kh-pd__pv'), 0.5);
      const me = charById(p.data.char ?? 'dursun');
      msg.innerHTML = `<span class="kh-pd__sad"><img src="${me.poses.uzgun}" alt=""></span><span><b>${fmt(price - p.data.coins)} jeton</b> eksik! Birkaç el kazan, kasayı doldur — bu seni bekler.</span>`;
      play(msg, [{transform: 'translateY(10px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, easing: EASE.spring});
      return;
    }
    busy = true;
    (b as HTMLButtonElement).disabled = true;
    msg.innerHTML = '';
    const meter = shell.coins;
    meter.hold();
    const before = p.data.coins;
    // satın al (Profile); günün teklifinde indirimli fiyat elle düşülür
    let ok = false;
    if (dealPrice !== undefined) {
      if (before >= price && !p.owns(it.kind, it.id)) {
        p.addCoins(-price);
        p.grant(it.kind, it.id);
        ok = true;
      }
    } else ok = p.buy(it.kind, it.id) === 'ok';
    if (!ok) {
      meter.release();
      busy = false;
      renderAct();
      return;
    }
    // jetonlar bakiyeden ürüne uçar
    const to = center(pv);
    const n = Math.min(12, 5 + Math.round(price / 1500));
    let paid = 0;
    await ctx.fx.flyCoins(meter.target(), to, n, i => {
      ctx.sounds.coin(1);
      const d = i === n - 1 ? price - paid : Math.round(price / n);
      paid += d;
      meter.add(-d);
      bump(pv, 1.05);
    });
    meter.release();
    if (!m.scope.alive) return;
    // kilit açılışı
    if (ctx.sounds.fanfare) ctx.sounds.fanfare();
    else ctx.sounds.reward();
    haptic('success');
    stage.classList.add('is-unlocked');
    play(q(stage, '.kh-pd__rays'), [{transform: 'scale(.2) rotate(0)', opacity: 0}, {transform: 'scale(1) rotate(30deg)', opacity: 1}], {duration: 700, easing: EASE.out, fill: 'forwards'});
    play(pv, [{transform: 'scale(1)'}, {transform: 'scale(1.18) rotate(-3deg)', offset: 0.35}, {transform: 'scale(.97) rotate(1deg)', offset: 0.7}, {transform: 'none'}], {duration: 620, easing: EASE.out});
    ctx.fx.flash(0.55, 380);
    ctx.fx.burst(to, {coins: 0, confetti: 30, power: 0.9});
    stampWord(ctx, 'Açıldı!', {x: to.x, y: to.y}, {size: 3.4, ms: 1300});
    renderAct(true);
    onChange();
    busy = false;
  });
  return m;
}

