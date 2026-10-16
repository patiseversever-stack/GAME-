// ANA EKRAN kabuğu: üst çubuk (avatar + seviye/XP, jeton kapsülü, ayarlar), sayfalar (Ana Sayfa · Market · Koleksiyon · Görevler)
// ve kayan göstergeli alt menü. Ana Sayfa tek odaklı ve sakin: oyuncunun karakteri (tek görsel, nefes; dokununca poz + söz),
// yanında iki küçük yuvarlak düğme (günlük ödül, bedava sandık), tek ince ÇEVRİMİÇİ satırı (yakında; içinde arkadaşla özel masa da),
// mod / rakip / bahis kartı ve ödülü içinde yazan büyük OYNA. Market ve profil Profile üzerinden kendi içinde çözülür;
// uygulamaya yalnız maç/ayar/kural döner. Boşta yalnız iki küçük döngü (nefes, OYNA nabzı); onları da platform/calm.ts uyutur.
import './home.css';
import type {CosmeticsListener, HomeAction} from './types';
import type {Profile as GameProfile} from '../game/profile';
import {DAILY_REWARDS, QUEST_BONUS, questDef, type QuestId} from '../game/profile';
import {ROSTER, charById, type CharDef, type CharId, type Pose} from '../game/roster';
import {MODE_INFO, type Mode} from '../game/types';
import {ANIM, EASE, Scope, bump, center, clamp, countUp, esc, fmt, h, hms, play, q, shake} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {Portrait, arenaHtml, capsuleHtml, charAvatarHtml, decorLoops, faceRect, gemHtml, onAct, openModal, openSheet, placeBubble, shuffled, starsHtml, toast, typeText, type Ctx, type ModalHandle} from './parts';
import {daily as dailyModal} from './modals';
import {ShopPage} from './shop';
import {CollectionPage} from './profile';
import {haptic, store} from '../platform/bridge';
import {cancelAnims} from '../platform/anim';
import {g3} from './fx';

/** Masa bahisleri ve açıldıkları seviye. */
export const STAKES: {v: number; lvl: number}[] = [
  {v: 100, lvl: 1},
  {v: 500, lvl: 2},
  {v: 1000, lvl: 4},
  {v: 5000, lvl: 7},
];

/** Kazananın aldığı (kişi başı): 1'e 1 ve eşlide 2×, 4 kişide 4× (pot). */
export const payout = (mode: Mode, stake: number): number => (mode === '4' ? stake * 4 : stake * 2);

/** Botların rozet seviyesi (karakter başına sabit; masada tutarlı görünsün). */
export const BOT_LEVEL: Record<CharId, number> = {riza: 28, cem: 12, dursun: 9, defne: 31};

export type Tab = 'home' | 'shop' | 'profile' | 'quests';
const TABS: Tab[] = ['home', 'shop', 'profile', 'quests'];

/** Sayfaların kabuğa erişimi. */
export interface Shell {
  ctx: Ctx;
  profile: GameProfile;
  coins: CoinMeter;
  goto(tab: Tab, sub?: string): void;
  /** Kuşanma bildirimi (uygulama desteyi/masayı değiştirir) */
  cosmetics(kind: Parameters<CosmeticsListener>[0], id: string): void;
  /** Görevler menü rozetini tazele */
  refreshQuestDot?(): void;
}

export interface Page {
  el: HTMLElement;
  /** Sekmeye gelince (sub: market alt sekmesi vb.) */
  show?(sub?: string): void;
  hide?(): void;
  destroy(): void;
}

// =====================================================================================================
// Jeton kapsülü: profil değişince sayar; satın alma/ödül uçuşunda tutulur (hold) ve jeton jeton artırılır.
// =====================================================================================================
export class CoinMeter {
  shown: number;
  private held = 0;
  private val: HTMLElement;

  constructor(private scope: Scope, readonly cap: HTMLElement, private profile: GameProfile) {
    this.shown = profile.data.coins;
    this.val = q(cap, '.kh-capsule__val');
    this.val.textContent = fmt(this.shown);
  }
  hold(): void {
    this.held++;
  }
  release(): void {
    this.held = Math.max(0, this.held - 1);
    if (!this.held) this.sync(true);
  }
  sync(animate: boolean): void {
    if (this.held) return;
    const to = this.profile.data.coins;
    if (to === this.shown) return;
    const from = this.shown;
    this.shown = to;
    if (animate) countUp(this.scope, this.val, from, to, Math.min(900, 300 + Math.abs(to - from) / 10));
    else this.val.textContent = fmt(to);
  }
  /** Görünen değeri n kadar değiştir (uçan jeton vardı). */
  add(n: number): void {
    this.shown += n;
    this.val.textContent = fmt(this.shown);
    this.bump();
  }
  bump(): void {
    this.cap.classList.remove('is-bump');
    void this.cap.offsetWidth;
    this.cap.classList.add('is-bump');
  }
  target(): {x: number; y: number} {
    return center(q(this.cap, '.kh-capsule__ico'));
  }
}

// =====================================================================================================
// Kabuk
// =====================================================================================================
export class HomeView implements Shell {
  readonly el = h('div', 'kh-screen kh-home');
  readonly scope = new Scope();
  coins!: CoinMeter;
  private resolve: ((a: HomeAction) => void) | null = null;
  private pages = new Map<Tab, Page>();
  private tab: Tab = 'home';
  private busy = false;
  private home!: HomePage;
  private unsub: () => void;
  private sig = '';

  constructor(readonly ctx: Ctx, readonly profile: GameProfile, private onCosmetics: CosmeticsListener, memo: HomeMemo) {
    this.el.innerHTML = `${arenaHtml()}
      <div class="kh-home__col">
        <header class="kh-top"></header>
        <div class="kh-pages"></div>
        <nav class="kh-nav">
          <i class="kh-nav__ind"></i>
          <button class="kh-nav__btn" data-tab="home"><span class="kh-nav__ico is-fan">${I.fan}</span><span class="kh-nav__lbl">Ana Sayfa</span></button>
          <button class="kh-nav__btn" data-tab="shop"><span class="kh-nav__ico"><img src="${ASSETS.icon_chest}" alt=""></span><span class="kh-nav__lbl">Market</span></button>
          <button class="kh-nav__btn" data-tab="profile"><span class="kh-nav__ico"><img src="${ASSETS.icon_trophy}" alt=""></span><span class="kh-nav__lbl">Koleksiyon</span></button>
          <button class="kh-nav__btn" data-tab="quests"><span class="kh-nav__ico"><img src="${ASSETS.icon_star}" alt=""></span><span class="kh-nav__lbl">Görevler</span><i class="kh-nav__dot"></i></button>
        </nav>
      </div>`;
    ctx.layer.append(this.el);
    this.renderTop(true);
    this.home = new HomePage(this, memo);
    this.pages.set('home', this.home);
    q(this.el, '.kh-pages').append(this.home.el);
    this.home.layout();
    this.setNav('home', false);
    onAct(this.scope, this.el, (a, b) => this.act(a, b));
    this.scope.on(q(this.el, '.kh-nav'), 'click', e => {
      const b = (e.target as Element).closest<HTMLElement>('[data-tab]');
      if (!b || this.busy) return;
      this.goto(b.dataset.tab as Tab);
    });
    this.unsub = profile.subscribe(() => {
      this.coins.sync(true);
      this.renderTop(false);
      this.home.refresh();
      this.refreshQuestDot();
    });
    this.refreshQuestDot();
    this.enter();
  }

  wait(): Promise<HomeAction> {
    this.busy = false;
    return new Promise(res => (this.resolve = res));
  }

  /** Test: verilen modu seçip kısa süre sonra OYNA'ya basar. */
  autoPlay(mode: Mode): void {
    this.scope.timeout(() => this.home.act('mode', q(this.el, `.kh-mode[data-m="${mode}"]`)), 600);
    this.scope.timeout(() => {
      if (this.resolve) this.home.act('play', q(this.el, '.kh-play2'));
    }, 1800);
  }

  /** Ayarlar/kurallar dönüşü: görünümü tazele. */
  refresh(): void {
    this.coins.sync(false);
    this.renderTop(false);
    this.home.refresh();
    this.refreshQuestDot();
  }

  /** Görevler sekmesindeki kırmızı nokta: toplanmayı bekleyen ödül var mı. */
  refreshQuestDot(): void {
    const dot = this.el.querySelector<HTMLElement>('.kh-nav__dot');
    if (dot) dot.classList.toggle('is-on', this.profile.questsReady() > 0);
  }

  finish(a: HomeAction): void {
    const r = this.resolve;
    if (!r) return;
    this.resolve = null;
    this.busy = true;
    r(a);
  }

  cosmetics(kind: Parameters<CosmeticsListener>[0], id: string): void {
    this.onCosmetics(kind, id);
    if (kind === 'char' || kind === 'frame') {
      this.renderTop(false, true);
      this.home.refresh();
    }
  }

  // ---- üst çubuk ----
  private renderTop(first: boolean, pulse = false): void {
    const p = this.profile.data;
    const c = charById(p.char ?? 'dursun');
    const sig = [p.name, p.level, p.xp, c.id, p.equipped.frame].join('|');
    if (!first && sig === this.sig) return;
    this.sig = sig;
    const top = q(this.el, '.kh-top');
    const k = clamp(p.xp / Math.max(1, this.profile.xpNext), 0, 1);
    const meHtml = `<button class="kh-top__me" data-act="me" aria-label="Profil">
        ${charAvatarHtml(c, p.equipped.frame, 'kh-top__ava')}${gemHtml(p.level)}
        <span class="kh-top__meta"><span class="kh-top__name">${esc(p.name)}</span>
          <span class="kh-xp kh-top__xp"><i class="kh-xp__fill" style="transform:scaleX(${k.toFixed(3)})"></i></span></span></button>`;
    if (first) {
      top.innerHTML = `${meHtml}${capsuleHtml(p.coins, true, 'kh-top__coins')}
        <button class="kh-iconbtn" data-act="settings" aria-label="Ayarlar">${I.gear}</button>`;
      this.coins = new CoinMeter(this.scope, q(top, '.kh-top__coins'), this.profile);
    } else {
      q(top, '.kh-top__me').outerHTML = meHtml;
      if (pulse) bump(q(top, '.kh-top__ava'), 1.18);
    }
  }

  // ---- sekmeler ----
  get currentTab(): Tab {
    return this.tab;
  }

  goto(tab: Tab, sub?: string): void {
    if (tab === this.tab) {
      this.pages.get(tab)?.show?.(sub);
      return;
    }
    const s = this.ctx.sounds;
    s.tap();
    haptic('light');
    const from = this.pages.get(this.tab)!;
    let to = this.pages.get(tab);
    if (!to) {
      to = tab === 'shop' ? new ShopPage(this) : tab === 'profile' ? new CollectionPage(this) : new QuestsPage(this);
      this.pages.set(tab, to);
      q(this.el, '.kh-pages').append(to.el);
    }
    const dir = Math.sign(TABS.indexOf(tab) - TABS.indexOf(this.tab));
    this.tab = tab;
    this.setNav(tab, true);
    from.hide?.();
    const fromEl = from.el, toEl = to.el;
    toEl.style.display = '';
    to.show?.(sub);
    if (ANIM) {
      cancelAnims(fromEl); // getAnimations() stil hesabını zorlar (sekme geçişinde takılma)
      const a = fromEl.animate([{transform: 'none', opacity: 1}, {transform: `translateX(${-dir * 22}%) scale(.97)`, opacity: 0}], {duration: 240, easing: EASE.in, fill: 'forwards'});
      a.onfinish = () => {
        if (this.tab !== tab) return;
        fromEl.style.display = 'none';
        a.cancel();
      };
      toEl.animate([{transform: `translateX(${dir * 34}%) scale(.98)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 60, easing: EASE.outQuart, fill: 'backwards'});
    } else fromEl.style.display = 'none';
  }

  private setNav(tab: Tab, animate: boolean): void {
    const i = TABS.indexOf(tab);
    const nav = q(this.el, '.kh-nav');
    const ind = q(nav, '.kh-nav__ind');
    ind.style.transform = `translateX(${i * 100}%)`;
    nav.querySelectorAll<HTMLElement>('.kh-nav__btn').forEach((b, k) => {
      b.classList.toggle('is-on', k === i);
      if (k === i && animate) play(q(b, '.kh-nav__ico'), [{transform: 'translateY(0) scale(1)'}, {transform: 'translateY(calc(var(--u) * -1.1)) scale(1.32) rotate(-8deg)', offset: 0.45}, {transform: 'translateY(calc(var(--u) * -.75)) scale(1.18)'}], {duration: 420, easing: EASE.out});
    });
  }

  private act(a: string, b: HTMLElement): void {
    if (this.busy) return;
    const s = this.ctx.sounds;
    switch (a) {
      case 'settings':
      case 'rules':
        s.tap();
        this.finish({type: a});
        return;
      case 'me':
        this.goto('profile');
        return;
      case 'shop': // jeton kapsülündeki +
        s.tap();
        coinSheet(this);
        return;
    }
    this.home.act(a, b);
  }

  /** Giriş: üst çubuk, alt menü ve zemin durağan (perde zaten açıyor); yalnız sayfa öğeleri sırayla gelir. */
  private enter(): void {
    this.home.enter();
  }

  /** Çıkış (Oyna): hafifçe büyüyüp kararır. */
  async leave(): Promise<void> {
    if (ANIM) await this.el.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(1.05)'}], {duration: 280, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
    this.destroy();
  }

  destroy(): void {
    this.unsub();
    this.pages.forEach(p => p.destroy());
    this.scope.dispose();
    this.el.remove();
  }
}

/** Ana ekran oturum belleği (ekran yeniden kurulsa da seçimler kalır). */
export interface HomeMemo {
  opp?: CharId;
  trio?: CharId[];
  /** Son elin sonucu: ana ekranda karakter buna göre karşılar (bir kez) */
  last?: {outcome: 'win' | 'lose' | 'draw'; streak: number; levelUp: boolean};
}

// =====================================================================================================
// Ana Sayfa — sakin, tek odak: karakter (nefes) · Çevrimiçi satırı · mod / rakip / bahis kartı · OYNA.
// Boşta yalnız iki küçük döngü (nefes, OYNA nabzı); dokunuşsuz birkaç saniye sonra platform/calm.ts onları da durdurur.
// =====================================================================================================
/** Karaktere dokununca söyledikleri (poz + kısa söz). */
const POKE: Record<CharId, [Pose, string][]> = {
  riza: [['gulumseme', 'Gel otur evlat, bir el atalım.'], ['dusunceli', 'Valeyi sona sakla, demedi deme.'], ['kahkaha', 'Haha! Bıyığımı burdum, masa hazır!'], ['zafer', 'Çayımız geldi. Hadi bakalım!'], ['pisti', 'Bu masada pişti kokusu var.'], ['saskin', 'Ne o, hâlâ oturmadın mı?']],
  cem: [['gulumseme', 'Hazırım. İhtimaller bizden yana.'], ['dusunceli', '52 kart, 4 vale… Hesap tamam.'], ['kahkaha', 'Haha! Algoritma bugün coşkulu.'], ['zafer', 'Seriye bağlayalım, hadi!'], ['pisti', 'Vale bende, pişti kapıda.'], ['saskin', 'Dur, kulaklık… Tamam, buradayım!']],
  dursun: [['gulumseme', 'Çaylar benden, oyun senden!'], ['zafer', 'Taze demledim, buyur!'], ['kahkaha', 'Hahaha! Bugün şanslı günümüz.'], ['dusunceli', 'Defterde senin hanen boş duruyor…'], ['pisti', 'Göz kırptım, kimseye söyleme.'], ['saskin', 'Aaa, daha masaya oturmadın mı?']],
  defne: [['gulumseme', 'Hazırsan başlayalım.'], ['dusunceli', 'Planım hazır.'], ['pisti', 'Sessiz olan kazanır.'], ['zafer', 'Bir el daha mı? Olur.'], ['kahkaha', 'Hah. Bu iyiydi.'], ['saskin', 'Beni mi bekliyorsun?']],
};
const TICKLE: Record<CharId, string> = {
  riza: 'Yeter be evlat, bıyığım ağrıdı!',
  cem: 'Hey! Ekranım çizilecek!',
  dursun: 'Yavaş! Çaylar dökülecek!',
  defne: 'Bir daha dokunursan… pişti yaparım.',
};

/** Kısa ad: "Rıza Amca" → "Rıza", "Kahveci Dursun" → "Dursun". */
export const shortName = (c: CharDef): string => c.name.replace(/^Kahveci\s+/, '').split(' ')[0];

/** Mod düğmesindeki küçük simge (durağan): 1'e 1 iki kişi, 4 kişi dört nokta, eşli iki renkli iki çift. */
function modeIcon(m: Mode): string {
  const dot = (x: number, y: number, c = 'currentColor') => `<circle cx="${x}" cy="${y}" r="3.1" fill="${c}"/>`;
  const body = m === '1v1'
    ? `${dot(12, 5.2)}${dot(12, 18.8)}<path d="M7.5 12h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="1.5 3"/>`
    : m === '4'
      ? `${dot(12, 4.6)}${dot(19.4, 12)}${dot(12, 19.4)}${dot(4.6, 12)}`
      : `${dot(12, 4.6, '#ff6b81')}${dot(12, 19.4, '#ff6b81')}${dot(4.6, 12, '#5aa8ff')}${dot(19.4, 12, '#5aa8ff')}`;
  return `<svg class="kh-mode__ico" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

/** Sandık süresi: kaba ve sakin ("2sa 14dk", "14 dk") — saniye saymaz, dakikada bir tazelenir. */
function chestLeft(sec: number): string {
  const m = Math.max(1, Math.ceil(sec / 60));
  const hh = Math.floor(m / 60);
  return hh ? `${hh}sa ${m % 60}dk` : `${m} dk`;
}

class HomePage implements Page {
  readonly el = h('div', 'kh-page kh-hp');
  private scope = new Scope();
  private pt: Portrait;
  private mode: Mode;
  private stake: number;
  private oppIdx = 0;
  private trio: CharId[] = [];
  private pokes: number[] = [];
  private sayT = 0;
  private nextPoke = -1;
  private lastPoke = -1;
  private visible = true;

  constructor(private shell: HomeView, private memo: HomeMemo) {
    const p = shell.profile.data;
    this.mode = p.lastMode ?? '1v1';
    this.stake = p.lastStake ?? 100;
    const me = this.me();
    this.el.innerHTML = `
      <section class="kh-hero3">
        <i class="kh-hero3__glow"></i>
        <div class="kh-hero3__fig"></div>
        <button class="kh-hero3__tap" data-act="poke" aria-label="Karakterine dokun"></button>
        <div class="kh-hero3__name"></div>
        <button class="kh-hw is-daily" data-act="daily" data-spring aria-label="Günlük ödül"><img src="${ASSETS.icon_gift}" alt=""><i class="kh-dot"></i></button>
        <button class="kh-hw is-chest" data-act="chest" data-spring aria-label="Bedava sandık"><img src="${ASSETS.icon_chest}" alt=""><span class="kh-hw__lbl"></span></button>
        <div class="kh-say kh-hero3__say" aria-live="polite"><div class="kh-say__t"></div></div>
      </section>
      <button class="kh-onl" data-act="online" data-spring><span class="kh-onl__ico">${I.globe}</span>
        <span class="kh-onl__txt"><b>Çevrimiçi</b><small>Rakipler · Arkadaşlar</small></span><span class="kh-onl__soon">Yakında</span>${I.chevR}</button>
      <section class="kh-setup">
        <div class="kh-seg" role="tablist" aria-label="Oyun modu"><i class="kh-seg__ind"></i>${(['1v1', '4', 'esli'] as Mode[]).map(m =>
          `<button class="kh-mode" role="tab" data-act="mode" data-m="${m}">${modeIcon(m)}<span>${MODE_INFO[m].name}</span></button>`).join('')}</div>
        <div class="kh-opp"></div>
        <div class="kh-stakes"></div>
      </section>
      <div class="kh-playwrap"><button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-play2" data-act="play">
        <span class="kh-play2__l1">${I.play}<span>Oyna</span></span><span class="kh-play2__l2"></span></button></div>`;
    this.pt = new Portrait(me, {pose: 'notr', cls: 'kh-hero3__pt', fade: true});
    q(this.el, '.kh-hero3__fig').append(this.pt.el);
    this.scope.add(() => this.pt.destroy());
    this.applyChar(me);
    if (!this.stakeOk(this.stake)) this.stake = STAKES[0].v;
    this.trio = memo.trio && this.valid(memo.trio) ? memo.trio : this.defaultTrio();
    this.setMode(this.mode, false);
    this.tickChest();
    this.refresh();
    this.bindSwipe();
    // dokunmadan hemen önce (pointerdown) sıradaki tepki pozunu çözmeye başla: tıkta hazır olsun
    this.scope.on(q(this.el, '.kh-hero3__tap'), 'pointerdown', () => {
      const list = POKE[this.me().id];
      let k = Math.floor(Math.random() * list.length);
      if (k === this.lastPoke) k = (k + 1) % list.length;
      this.nextPoke = k;
      this.pt.preload([list[k][0]]);
    });
    this.scope.add(() => clearTimeout(this.sayT));
  }

  private me(): CharDef {
    return charById(this.shell.profile.data.char ?? 'dursun');
  }
  private others(): CharDef[] {
    const me = this.me().id;
    return ROSTER.filter(c => c.id !== me);
  }
  private valid(t: CharId[]): boolean {
    const o = this.others().map(c => c.id);
    return t.length === 3 && t.every(id => o.includes(id));
  }
  private defaultTrio(): CharId[] {
    return this.others().map(c => c.id).slice(0, 3);
  }

  private applyChar(c: CharDef): void {
    this.el.style.setProperty('--c', c.color);
    q(this.el, '.kh-hero3__name').textContent = c.name;
  }

  /** Profil değişince (jeton, karakter, seviye). */
  refresh(): void {
    const p = this.shell.profile;
    const me = this.me();
    if (this.pt.id !== me.id) {
      this.pt.setChar(me, 'notr');
      this.applyChar(me);
      this.pt.pop();
      if (!this.valid(this.trio)) this.trio = this.defaultTrio();
      this.buildOpp(true);
    }
    const ready = p.dailyReady();
    const daily = q(this.el, '.kh-hw.is-daily');
    q(daily, '.kh-dot').style.display = ready ? '' : 'none';
    daily.classList.toggle('is-ready', ready);
    if (!this.stakeOk(this.stake)) this.stake = STAKES.filter(s => this.stakeOk(s.v)).pop()?.v ?? STAKES[0].v;
    this.buildStakes();
    this.tickChest(true);
  }

  /** Giriş: en çok 6 öğe, 340 ms altı, küçük gecikmelerle (yalnız transform/opaklık). */
  enter(): void {
    const g = (sel: string) => q(this.el, sel);
    const up = (el: Element, delay: number, dy = 16) =>
      play(el, [{transform: `translateY(${dy}px)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 300, delay, easing: EASE.outQuart, fill: 'backwards'});
    up(g('.kh-hero3'), 0, 22);
    this.el.querySelectorAll('.kh-hw').forEach((w, i) =>
      play(w, [{transform: 'scale(.5)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: 200 + i * 60, easing: EASE.spring, fill: 'backwards'}));
    up(g('.kh-onl'), 90);
    up(g('.kh-setup'), 140);
    up(g('.kh-play2'), 190);
    // selam: poz değiştirmeden, yalnız balon + küçük pop
    this.scope.timeout(() => this.poke(true), ANIM ? 650 : 0);
    // hazır ödül bir kez kıpırdar (döngü yok)
    this.scope.timeout(() => {
      const w = this.el.querySelector<HTMLElement>('.kh-hw.is-ready img');
      if (w) play(w, [{transform: 'none'}, {transform: 'rotate(-10deg) scale(1.1)', offset: 0.25}, {transform: 'rotate(8deg) scale(1.1)', offset: 0.5}, {transform: 'rotate(-4deg)', offset: 0.75}, {transform: 'none'}], {duration: 620, easing: 'ease-in-out'});
    }, ANIM ? 1400 : 0);
  }

  /** Balon (tek balon; yüzün üstüne/yanına yerleşir, birkaç saniye sonra söner). */
  private say(line: string, pose?: Pose): void {
    if (pose) this.pt.pose(pose, 2600);
    else this.pt.pop();
    const hero = q(this.el, '.kh-hero3');
    const say = q(this.el, '.kh-hero3__say');
    cancelAnims(say);
    say.style.visibility = 'hidden';
    const tw = typeText(this.scope, q(say, '.kh-say__t'), line, 44);
    const bounds = hero.getBoundingClientRect();
    if (!placeBubble(say, hero, faceRect(this.pt), bounds)) {
      tw.finish();
      return;
    }
    say.style.visibility = 'visible';
    play(say, [{transform: 'scale(.5)', opacity: 0}, {transform: 'scale(1.04)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 260, easing: EASE.out});
    clearTimeout(this.sayT);
    this.sayT = window.setTimeout(() => {
      if (!this.scope.alive) return;
      const a = say.animate([{opacity: 1}, {opacity: 0, transform: 'scale(.94)'}], {duration: 200, fill: 'forwards'});
      a.onfinish = () => {
        say.style.visibility = 'hidden';
        a.cancel();
      };
    }, ANIM ? 1600 + line.length * 50 : 60000);
  }

  show(): void {
    this.visible = true;
    this.pt.breathe(true);
    this.tickChest(true);
  }
  layout(): void {
    /* ölçüye bağlı yerleşim yok (vitrin kalktı) */
  }
  /** Başka sekmeye geçince nefes de durur (gizli sayfada çalışan WAAPI döngüsü boşuna kare ister). */
  hide(): void {
    this.visible = false;
    this.pt.breathe(false);
  }

  // ---------------------------------------------------------------- mod
  private setMode(m: Mode, animate: boolean): void {
    this.mode = m;
    const i = ['1v1', '4', 'esli'].indexOf(m);
    this.el.querySelectorAll<HTMLElement>('.kh-mode').forEach((b, k) => {
      b.classList.toggle('is-on', k === i);
      b.setAttribute('aria-selected', String(k === i));
    });
    q(this.el, '.kh-seg__ind').style.transform = `translateX(${i * 100}%)`;
    this.buildOpp(animate);
    this.buildStakes();
  }

  // ---------------------------------------------------------------- rakip(ler): tek satır
  private buildOpp(animate: boolean): void {
    const box = q(this.el, '.kh-opp');
    const others = this.others();
    box.className = `kh-opp is-${this.mode}`;
    if (this.mode === '1v1') {
      const prev = this.memo.opp && others.find(c => c.id === this.memo.opp) ? this.memo.opp : others[Math.floor(others.length / 2)].id;
      this.oppIdx = Math.max(0, others.findIndex(c => c.id === prev));
      box.innerHTML = `<span class="kh-opp__lbl">Rakip</span><button class="kh-opp__who" data-act="oppinfo"></button>
        <button class="kh-opp__arr" data-act="opp" data-d="-1" aria-label="Önceki rakip">${I.chevL}</button><button class="kh-opp__arr" data-act="opp" data-d="1" aria-label="Sonraki rakip">${I.chevR}</button>`;
      this.renderWho(animate ? 1 : 0);
    } else {
      box.innerHTML = this.groupHtml();
      if (animate) box.querySelectorAll('.kh-ava').forEach((a, k) => play(a, [{transform: 'scale(.4)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 280, delay: k * 40, easing: EASE.spring, fill: 'backwards'}));
    }
  }

  /** 1'e 1 rakip satırı: avatar + ad + zorluk yıldızları. d: kayış yönü (0 = animasyonsuz). */
  private renderWho(d: number): void {
    const who = this.el.querySelector<HTMLElement>('.kh-opp__who');
    if (!who) return;
    const c = this.others()[this.oppIdx];
    who.style.setProperty('--c', c.color);
    who.setAttribute('aria-label', `${c.name}, zorluk ${c.difficulty}`);
    // "Kahveci Dursun" → "Dursun": satır tek ve sakin kalsın (tam ad dokununca baloncukta)
    who.innerHTML = `${charAvatarHtml(c, 'standart', 'kh-opp__ava')}<span class="kh-opp__nm"><b>${esc(c.name.replace(/^Kahveci\s+/, ''))}</b>${starsHtml(c.difficulty)}</span>`;
    if (d) play(who, [{transform: `translateX(${d * 18}px)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 220, easing: EASE.outQuart});
  }

  private cycleOpp(d: number): void {
    const n = this.others().length;
    this.oppIdx = (this.oppIdx + d + n) % n;
    this.memo.opp = this.others()[this.oppIdx].id;
    this.shell.ctx.sounds.tap();
    haptic('light');
    this.renderWho(d);
  }

  /** Rakip satırında yatay kaydırma da rakibi değiştirir. */
  private bindSwipe(): void {
    const box = q(this.el, '.kh-opp');
    let x0 = 0, y0 = 0, id = -1;
    this.scope.on(box, 'pointerdown', e => {
      const p = e as PointerEvent;
      if (this.mode !== '1v1') return;
      id = p.pointerId;
      x0 = p.clientX;
      y0 = p.clientY;
    });
    const up = (e: Event) => {
      const p = e as PointerEvent;
      if (p.pointerId !== id) return;
      id = -1;
      const dx = p.clientX - x0, dy = p.clientY - y0;
      if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        // ardından gelen tık (bırakılan düğümde) ikinci kez işlemesin
        this.swiped = true;
        window.setTimeout(() => (this.swiped = false), 80);
        this.cycleOpp(dx < 0 ? 1 : -1);
      }
    };
    this.scope.on(window, 'pointerup', up);
    this.scope.on(window, 'pointercancel', () => (id = -1));
  }
  private swiped = false;

  /** 4 kişi / eşli satırı: etiket + oturma avatarları + karıştır. */
  private groupHtml(): string {
    const lbl = this.mode === '4' ? 'Masa' : 'Ortak';
    const aria = this.mode === '4' ? 'Karıştır' : 'Ortağını değiştir';
    return `<span class="kh-opp__lbl">${lbl}</span>${this.seatsHtml()}<button class="kh-opp__arr kh-shuf" data-act="shuffle" aria-label="${aria}">${I.shuffle}</button>`;
  }

  private seatsHtml(): string {
    if (this.mode === '4') {
      // koltuk sırası: [sağ, karşı, sol] → ekranda soldan sağa: sol, karşı, sağ
      return `<div class="kh-seats">${[2, 1, 0].map(k => {
        const c = charById(this.trio[k]);
        return `<span class="kh-seat">${charAvatarHtml(c, 'standart')}<b>${esc(shortName(c))}</b></span>`;
      }).join('')}</div>`;
    }
    const partner = charById(this.trio[1]);
    const r1 = charById(this.trio[0]), r2 = charById(this.trio[2]);
    return `<div class="kh-seats is-teams"><span class="kh-seat is-blue">${charAvatarHtml(partner, 'standart')}<b>${esc(shortName(partner))}</b></span>
      <span class="kh-vsl">VS</span><span class="kh-pair is-red">${charAvatarHtml(r1, 'standart')}${charAvatarHtml(r2, 'standart')}</span></div>`;
  }

  private shuffle(btn: HTMLElement): void {
    const s = this.shell.ctx.sounds;
    if (s.shuffle) s.shuffle();
    else s.whoosh();
    play(btn, [{transform: 'rotate(0)'}, {transform: 'rotate(-360deg)'}], {duration: 420, easing: EASE.out});
    const prev = this.trio.join();
    if (this.mode === 'esli') {
      // ortağı değiştir: üç rakip döner, karşı koltuğa (ortak) sıradaki gelir
      const [r, a, l] = this.trio;
      this.trio = [a, l, r];
    } else {
      let t = shuffled(this.trio);
      for (let k = 0; k < 4 && t.join() === prev; k++) t = shuffled(this.trio);
      this.trio = t;
    }
    this.memo.trio = this.trio;
    const box = q(this.el, '.kh-opp .kh-seats');
    box.outerHTML = this.seatsHtml();
    q(this.el, '.kh-opp .kh-seats').querySelectorAll('.kh-ava').forEach((a, k) =>
      play(a, [{transform: 'scale(.5) rotate(-20deg)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 280, delay: k * 40, easing: EASE.spring, fill: 'backwards'}));
    if (this.mode === 'esli') toast(this.shell.ctx, `Yeni ortağın: ${charById(this.trio[1]).name}`, I.friends);
  }

  // ---------------------------------------------------------------- bahis + OYNA'daki ödül satırı
  private stakeOk(v: number): boolean {
    const s = STAKES.find(x => x.v === v);
    const d = this.shell.profile.data;
    return !!s && d.level >= s.lvl && v <= Math.max(d.coins, STAKES[0].v);
  }

  private buildStakes(): void {
    const d = this.shell.profile.data;
    q(this.el, '.kh-stakes').innerHTML = STAKES.map(s => {
      const lockedLvl = d.level < s.lvl;
      const poor = !lockedLvl && !this.stakeOk(s.v);
      return `<button class="kh-chip${s.v === this.stake ? ' is-on' : ''}${lockedLvl || poor ? ' is-locked' : ''}" data-act="stake" data-v="${s.v}" aria-pressed="${s.v === this.stake}">
        ${lockedLvl ? I.lock : `<img class="kh-chip__ico" src="${ASSETS.icon_coin}" alt="">`}<span class="kh-num">${fmt(s.v)}</span>${lockedLvl ? `<span class="kh-tag">Sv. ${s.lvl}</span>` : ''}</button>`;
    }).join('');
    q(this.el, '.kh-play2__l2').innerHTML = `Kazanırsan <img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(payout(this.mode, this.stake))}</b>`;
  }

  // ---------------------------------------------------------------- dokunma
  /** Karaktere dokun: poz (anında + pop) + söz; hızlı ardışık dokunuşta gıdıklanır. Selamda poz değişmez. */
  private poke(greet = false): void {
    const me = this.me();
    const now = performance.now();
    this.pokes = this.pokes.filter(t => now - t < 2600);
    if (!greet) this.pokes.push(now);
    let pose: Pose | undefined, line: string;
    if (this.pokes.length >= 5) {
      this.pokes = [];
      pose = 'kizgin';
      line = TICKLE[me.id];
      haptic('warning');
      shake(q(this.el, '.kh-hero3__fig'), 0.6);
    } else if (greet && this.memo.last) {
      // maçtan dönüş: sonuca göre karşılar
      const {outcome, streak, levelUp} = this.memo.last;
      this.memo.last = undefined;
      if (levelUp) {
        pose = 'zafer';
        line = `Seviye ${this.shell.profile.data.level}! Yeni masalar açıldı.`;
      } else if (outcome === 'win') {
        pose = streak >= 3 ? 'kahkaha' : 'zafer';
        line = streak >= 2 ? `${streak} el üst üste! Seri sürsün.` : 'Helal olsun! Bir tane daha?';
      } else if (outcome === 'lose') {
        pose = 'uzgun';
        line = 'Olsun be… Rövanşı alırız!';
      } else {
        pose = 'saskin';
        line = 'Berabere! Kıl payı kaçtı.';
      }
    } else if (greet) {
      const name = this.shell.profile.data.name;
      const hr = new Date().getHours();
      const hi = hr < 6 ? 'Gece kuşu' : hr < 12 ? 'Günaydın' : hr < 18 ? 'Hoş geldin' : 'İyi akşamlar';
      line = `${hi}, ${name}!`;
    } else {
      const list = POKE[me.id];
      let k = this.nextPoke >= 0 ? this.nextPoke : Math.floor(Math.random() * list.length);
      if (k === this.lastPoke) k = (k + 1) % list.length;
      this.nextPoke = -1;
      this.lastPoke = k;
      [pose, line] = list[k];
      haptic('light');
    }
    if (!greet) this.shell.ctx.sounds.tap();
    this.say(line, pose);
  }

  // ---------------------------------------------------------------- sandık
  private chestT = 0;
  private tickChest(once = false): void {
    if (!once) this.scope.add(() => clearTimeout(this.chestT));
    clearTimeout(this.chestT);
    const p = this.shell.profile;
    const w = q(this.el, '.kh-hw.is-chest');
    const lbl = q(w, '.kh-hw__lbl');
    const ready = p.chestReady();
    w.classList.toggle('is-ready', ready);
    const left = (p.data.chestAt - Date.now()) / 1000;
    lbl.textContent = ready ? 'Aç!' : chestLeft(left);
    if (!this.scope.alive || ready) return;
    // dakika sınırında bir kez tazele (saniye saymaz: boşta kare yok)
    if (this.visible && ANIM) this.chestT = window.setTimeout(() => this.tickChest(true), (left % 60) * 1000 + 250);
  }

  private async openChest(w: HTMLElement): Promise<void> {
    const p = this.shell.profile;
    const s = this.shell.ctx.sounds;
    if (!p.chestReady()) {
      s.tap();
      shake(w, 0.7);
      const left = Math.max(0, p.data.chestAt - Date.now()) / 1000;
      const hh = Math.floor(left / 3600), mm = Math.ceil((left % 3600) / 60);
      toast(this.shell.ctx, `Sandık ${hh ? `${hh} sa ` : ''}${mm} dk sonra açılır`, I.lock);
      return;
    }
    const meter = this.shell.coins;
    meter.hold();
    const ico = q(w, 'img');
    // ön gerilim + patlama
    for (let k = 1; k <= 2; k++) {
      await play(ico, [{transform: 'none'}, {transform: `rotate(${-8 * k}deg) scale(${1 + k * 0.06})`}, {transform: `rotate(${8 * k}deg) scale(${1 + k * 0.08})`}, {transform: 'none'}], {duration: 200, easing: 'ease-in-out'}).finished.catch(() => undefined);
      s.tap();
    }
    const amount = p.openChest();
    if (s.fanfare) s.fanfare();
    else s.reward();
    haptic('success');
    const c = center(ico);
    this.shell.ctx.fx.burst(c, {coins: 8, confetti: 14, power: 0.7});
    bump(ico, 1.3);
    popText(this.shell.ctx, `+${fmt(amount)}`, {x: c.x, y: c.y - 20});
    const n = 8;
    let added = 0;
    await this.shell.ctx.fx.flyCoins(c, meter.target(), n, i => {
      s.coin(1);
      const add = i === n - 1 ? amount - added : Math.round(amount / n);
      added += add;
      meter.add(add);
    });
    meter.release();
    this.tickChest(true);
  }

  private async claimDaily(): Promise<void> {
    const p = this.shell.profile;
    const ctx = this.shell.ctx;
    if (!p.dailyReady()) {
      ctx.sounds.tap();
      toast(ctx, 'Bugünkü ödülünü aldın. Yarın yine gel!', I.check);
      return;
    }
    ctx.sounds.tap();
    const meter = this.shell.coins;
    meter.hold();
    const day = p.nextDailyDay();
    const got = await dailyModal(ctx, day, DAILY_REWARDS, {at: () => meter.target(), add: n => meter.add(n)});
    if (got > 0) p.claimDaily();
    meter.release();
    this.refresh();
  }

  // ---------------------------------------------------------------- eylemler
  act(a: string, b: HTMLElement): void {
    const ctx = this.shell.ctx;
    const s = ctx.sounds;
    switch (a) {
      case 'poke':
        this.poke();
        return;
      case 'mode': {
        const m = b.dataset.m as Mode;
        if (m === this.mode) return;
        s.tap();
        haptic('light');
        this.setMode(m, true);
        return;
      }
      case 'opp':
        if (!this.swiped) this.cycleOpp(Number(b.dataset.d) || 1);
        return;
      case 'oppinfo': {
        if (this.swiped) return;
        const c = this.others()[this.oppIdx];
        s.tap();
        bump(q(b, '.kh-ava'), 1.12);
        toast(ctx, `${c.name}: “${c.quote}”`, I.voice);
        return;
      }
      case 'shuffle':
        this.shuffle(b);
        return;
      case 'stake': {
        const v = Number(b.dataset.v);
        const st = STAKES.find(x => x.v === v)!;
        s.tap();
        if (this.shell.profile.data.level < st.lvl) {
          shake(b, 0.6);
          return toast(ctx, `Bu masa ${st.lvl}. seviyede açılır`);
        }
        if (!this.stakeOk(v)) {
          shake(b, 0.6);
          return toast(ctx, 'Bu masa için jetonun yetmiyor');
        }
        if (v === this.stake) return;
        this.stake = v;
        this.buildStakes();
        bump(q(this.el, `.kh-stakes [data-v="${v}"]`), 1.06);
        bump(q(this.el, '.kh-play2__l2 b'), 1.2);
        return;
      }
      case 'daily':
        this.claimDaily();
        return;
      case 'chest':
        this.openChest(b);
        return;
      case 'online':
        s.tap();
        onlineTeaser(this.shell);
        return;
      case 'play':
        this.play(b);
        return;
    }
  }

  private play(btn: HTMLElement): void {
    const ctx = this.shell.ctx;
    const p = this.shell.profile;
    if (p.data.coins < STAKES[0].v) {
      ctx.sounds.tap();
      bailout(this.shell);
      return;
    }
    if (p.data.coins < this.stake) {
      shake(btn, 0.8);
      toast(ctx, 'Bu bahis için jetonun yetmiyor, daha düşük bir masa seç');
      return;
    }
    ctx.sounds.tap();
    haptic('medium');
    p.data.lastMode = this.mode;
    p.data.lastStake = this.stake;
    p.save();
    const opponents: CharId[] = this.mode === '1v1' ? [this.others()[this.oppIdx].id] : this.trio.slice();
    this.pt.pop();
    this.shell.finish({type: 'play', mode: this.mode, stake: this.stake, opponents});
  }

  destroy(): void {
    this.scope.dispose();
    this.el.remove();
  }
}

// =====================================================================================================
// Görevler: günlük 3 görev (kolay · orta · zor) + hepsini bitirene Günün Sandığı. Gece yarısı yenilenir.
// Tamamlanan görevin "Topla" düğmesi parlar; ödül jetonları üst çubuktaki kapsüle uçar.
// =====================================================================================================
const TIER_NAME = ['Kolay', 'Orta', 'Zor'];
class QuestsPage implements Page {
  readonly el = h('div', 'kh-page kh-quests');
  private scope = new Scope();
  private timer = 0;

  constructor(private shell: Shell) {
    onAct(this.scope, this.el, (a, b) => this.act(a, b)); // içerik ilk show()'da kurulur
  }

  private render(): void {
    const p = this.shell.profile;
    const qs = p.dailyQuests();
    const done = qs.list.filter(x => x.claimed).length;
    const bonusReady = p.bonusReady();
    this.el.innerHTML = `<div class="kh-quests__in kh-scroll">
      <div class="kh-quests__hero"><i class="kh-quests__glow"></i><img src="${ASSETS.icon_star}" alt=""></div>
      <div class="kh-title kh-quests__title">${g3('Günlük Görevler')}</div>
      <p class="kh-quests__sub">Her gün üç yeni görev. Yenilenmesine <b class="kh-num kh-quests__left">${hms(secsToMidnight())}</b></p>
      <div class="kh-quests__list">${qs.list.map((st, i) => {
        const d = questDef(st.id), full = st.progress >= d.goal;
        const state = st.claimed ? 'is-claimed' : full ? 'is-ready' : '';
        return `<div class="kh-quest kh-card ${state} is-t${d.tier}" data-i="${i}">
          <span class="kh-quest__ico">${(I as Record<string, string>)[d.icon] ?? I.target}</span>
          <div class="kh-quest__body"><span class="kh-quest__tier">${TIER_NAME[d.tier]}</span><b>${esc(d.title)}</b><small>${esc(d.desc)}</small>
            <span class="kh-quest__bar"><i style="transform:scaleX(${(Math.min(1, st.progress / d.goal)).toFixed(3)})"></i><em>${fmt(st.progress)} / ${fmt(d.goal)}</em></span></div>
          ${st.claimed
            ? `<span class="kh-quest__done">${I.check}<small>Alındı</small></span>`
            : full
              ? `<button class="kh-btn kh-btn--5 kh-quest__claim" data-act="claim" data-id="${st.id}" data-spring><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(d.reward)}</b><small>Topla</small></button>`
              : `<span class="kh-quest__rw"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(d.reward)}</b></span>`}
        </div>`;
      }).join('')}
        <div class="kh-quest kh-card kh-quest--bonus${bonusReady ? ' is-ready' : qs.bonus ? ' is-claimed' : ''}">
          <span class="kh-quest__ico is-chest"><img src="${ASSETS.icon_chest}" alt=""></span>
          <div class="kh-quest__body"><span class="kh-quest__tier">Ödül</span><b>Günün Sandığı</b><small>Üç görevin ödülünü de topla</small>
            <span class="kh-quest__pips">${[0, 1, 2].map(k => `<i class="${k < done ? 'on' : ''}"></i>`).join('')}</span></div>
          ${qs.bonus
            ? `<span class="kh-quest__done">${I.check}<small>Alındı</small></span>`
            : bonusReady
              ? `<button class="kh-btn kh-btn--1 kh-quest__claim" data-act="bonus" data-spring><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(QUEST_BONUS)}</b><small>Aç</small></button>`
              : `<span class="kh-quest__rw"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(QUEST_BONUS)}</b></span>`}
        </div>
      </div>
      <p class="kh-quests__tip">${I.info}<span>Görev ilerlemesi her elin sonunda işlenir. Pişti ve vale piştiler sayılır!</span></p>
    </div>`;
  }

  private async act(a: string, b: HTMLElement): Promise<void> {
    if (a !== 'claim' && a !== 'bonus') return;
    const {ctx, profile, coins} = this.shell;
    (b as HTMLButtonElement).disabled = true;
    const from = center(b);
    coins.hold();
    const got = a === 'claim' ? profile.claimQuest(b.dataset.id as QuestId) : profile.claimQuestBonus();
    if (!got) {
      coins.release();
      return;
    }
    ctx.sounds.reward();
    haptic('success');
    ctx.fx.burst(from, {coins: a === 'bonus' ? 14 : 8, confetti: a === 'bonus' ? 30 : 14, power: a === 'bonus' ? 1 : 0.7});
    const card = b.closest('.kh-quest') as HTMLElement | null;
    if (card) play(card, [{transform: 'scale(1)'}, {transform: 'scale(1.05)'}, {transform: 'scale(1)'}], {duration: 320, easing: EASE.spring});
    const n = a === 'bonus' ? 12 : 8;
    let added = 0;
    await ctx.fx.flyCoins(from, coins.target(), n, i => {
      ctx.sounds.coin(1);
      const add = i === n - 1 ? got - added : Math.round(got / n);
      added += add;
      coins.add(add);
    });
    coins.release();
    if (!this.scope.alive) return;
    this.render();
    this.enter(false);
    this.shell.refreshQuestDot?.();
  }

  private enter(full: boolean): void {
    this.el.querySelectorAll('.kh-quest').forEach((x, i) =>
      play(x, [{transform: 'translateX(-30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: full ? 360 : 220, delay: (full ? 120 : 0) + i * 70, easing: EASE.spring, fill: 'backwards'}));
    this.el.querySelectorAll<HTMLElement>('.kh-quest__bar i').forEach((bar, i) => {
      const to = bar.style.transform;
      play(bar, [{transform: 'scaleX(0)'}, {transform: to}], {duration: 700, delay: 260 + i * 90, easing: EASE.out, fill: 'backwards'});
    });
    if (full) play(q(this.el, '.kh-quests__hero img'), [{transform: 'scale(.4) rotate(-30deg)'}, {transform: 'scale(1.1) rotate(6deg)', offset: 0.6}, {transform: 'none'}], {duration: 600, easing: EASE.out});
  }

  show(): void {
    this.render();
    this.enter(true);
    clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      const el = this.el.querySelector('.kh-quests__left');
      if (el) el.textContent = hms(secsToMidnight());
    }, 1000);
  }
  hide(): void {
    clearInterval(this.timer);
  }
  destroy(): void {
    clearInterval(this.timer);
    this.scope.dispose();
    this.el.remove();
  }
}

function secsToMidnight(): number {
  const n = new Date();
  const m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return Math.max(0, (m.getTime() - n.getTime()) / 1000);
}

// =====================================================================================================
// Küçük pencereler: jeton kazan, çevrimiçi/arkadaş tanıtımı, kasa boşaldı (Dursun'dan destek)
// =====================================================================================================
/** Uçan "+350" yazısı. */
export function popText(ctx: Ctx, text: string, at: {x: number; y: number}): void {
  const el = h('div', 'kh-poptxt', `<span class="kh-g3" data-t="${esc(text)}">${esc(text)}</span>`);
  el.style.left = at.x + 'px';
  el.style.top = at.y + 'px';
  ctx.layer.append(el);
  const a = play(el, [{transform: 'translate(-50%,-50%) scale(.4)', opacity: 0}, {transform: 'translate(-50%,-120%) scale(1.15)', opacity: 1, offset: 0.3}, {transform: 'translate(-50%,-260%) scale(1)', opacity: 0}], {duration: 1200, easing: EASE.out, fill: 'both'}, 0.3);
  if (ANIM) a.onfinish = () => el.remove();
}

function coinSheet(shell: HomeView): void {
  const p = shell.profile;
  const ready = p.dailyReady(), chest = p.chestReady();
  const m = openSheet(shell.ctx, {
    cls: 'kh-coinsheet',
    body: `<div class="kh-title kh-sheet__title">${g3('Jeton Kazan')}</div>
      <div class="kh-earn">
        <button class="kh-earn__row kh-card${ready ? ' is-hot' : ''}" data-act="daily"><img src="${ASSETS.icon_gift}" alt=""><span><b>Günlük Ödül</b><small>${ready ? 'Hazır! Hemen topla.' : 'Yarın yeniden gel.'}</small></span><em>${ready ? 'Topla' : I.check}</em></button>
        <button class="kh-earn__row kh-card${chest ? ' is-hot' : ''}" data-act="chest"><img src="${ASSETS.icon_chest}" alt=""><span><b>Bedava Sandık</b><small>${chest ? 'Açılmayı bekliyor!' : `${hms((p.data.chestAt - Date.now()) / 1000)} sonra`}</small></span><em>${chest ? 'Aç' : I.lock}</em></button>
        <div class="kh-earn__row kh-card is-info"><img src="${ASSETS.icon_trophy}" alt=""><span><b>Maç Kazan</b><small>Kazanan bahsin iki katını alır. 4 kişide pot kazanana!</small></span></div>
        <div class="kh-earn__row kh-card is-info"><img src="${ASSETS.icon_star}" alt=""><span><b>Seviye Atla</b><small>Her yeni seviyede jeton ödülü seni bekler.</small></span></div>
      </div>`,
  });
  onAct(m.scope, m.panel, async a => {
    if (a === 'daily' || a === 'chest') {
      await m.close();
      const w = q(shell.el, a === 'daily' ? '.kh-hw.is-daily' : '.kh-hw.is-chest');
      if (shell.currentTab !== 'home') shell.goto('home');
      window.setTimeout(() => w.click(), ANIM ? 250 : 0);
    }
  });
}

/**
 * Çevrimiçi tanıtımı (yakında): iki sekme — "Rakip Bul" (radar) ve "Arkadaşınla" (özel masa kodu + 3 adım).
 * Sekmeler aynı hücrede üst üste durur: pencere boyu sekme değişince zıplamaz. Döngü yok; radar birkaç kez nabız atıp durur.
 */
function onlineTeaser(shell: HomeView, tab: 'online' | 'friends' = 'online'): void {
  const me = charById(shell.profile.data.char ?? 'dursun');
  const others = ROSTER.filter(c => c.id !== me.id);
  const notified = store.get('notify.online', false);
  const code = 'KHV-' + String(1000 + ((shell.profile.data.name.length * 7919 + 4821) % 9000));
  const m: ModalHandle = openModal(shell.ctx, {
    cls: 'kh-teaser is-online',
    title: 'Çevrimiçi',
    onX: () => m.close(),
    body: `<div class="kh-tz__tabs" role="tablist"><i class="kh-tz__ind"></i>
        <button class="kh-tz__tab" role="tab" data-act="tab" data-t="online">${I.globe}<span>Rakip Bul</span></button>
        <button class="kh-tz__tab" role="tab" data-act="tab" data-t="friends">${I.friends}<span>Arkadaşınla</span></button></div>
      <div class="kh-tz__body">
        <div class="kh-tz__pane" data-p="online">
          <div class="kh-radar"><i class="kh-radar__ring"></i><i class="kh-radar__ring is-2"></i><i class="kh-radar__ping"></i>
            ${others.map((c, i) => `<span class="kh-radar__sat" style="--a:${i * 120 - 90}deg">${charAvatarHtml(c, 'standart')}</span>`).join('')}
            <div class="kh-radar__me">${charAvatarHtml(me, shell.profile.data.equipped.frame)}</div></div>
          <div class="kh-teaser__t">Gerçek rakipler yolda!</div>
          <p class="kh-teaser__s">Türkiye'nin dört bir yanından oyuncularla aynı masaya oturacak, sıralamada yükseleceksin.</p>
        </div>
        <div class="kh-tz__pane" data-p="friends">
          <div class="kh-ticket"><div class="kh-ticket__l"><small>Özel masa kodun</small><b class="kh-num">${code}</b></div><div class="kh-ticket__r">${I.friends}</div></div>
          <div class="kh-teaser__steps">
            <div><span>1</span>Masanı kur, kodu paylaş</div>
            <div><span>2</span>Arkadaşların koda katılsın</div>
            <div><span>3</span>Eşli ya da 4 kişi, sen seç!</div>
          </div>
          <p class="kh-teaser__s">Arkadaşlarınla özel masalar da çok yakında. Şimdilik ustalarla antrenman yap!</p>
        </div>
      </div>
      <button class="kh-btn ${notified ? 'kh-btn--5' : 'kh-btn--1'} kh-btn--lg kh-btn--block" data-act="notify">${I.bell}${notified ? 'Haber Vereceğiz' : 'Açılınca Haber Ver'}</button>`,
  });
  const ping = q(m.panel, '.kh-radar__ping');
  let pingA: Animation | null = null;
  const setTab = (t: 'online' | 'friends', animate: boolean) => {
    const i = t === 'online' ? 0 : 1;
    q(m.panel, '.kh-tz__ind').style.transform = `translateX(${i * 100}%)`;
    m.panel.querySelectorAll<HTMLElement>('.kh-tz__tab').forEach((b, k) => {
      b.classList.toggle('is-on', k === i);
      b.setAttribute('aria-selected', String(k === i));
    });
    m.panel.querySelectorAll<HTMLElement>('.kh-tz__pane').forEach(p => {
      const on = p.dataset.p === t;
      p.classList.toggle('is-on', on);
      if (on && animate) play(p, [{opacity: 0, transform: `translateX(${i ? 16 : -16}px)`}, {opacity: 1, transform: 'none'}], {duration: 220, easing: EASE.outQuart});
    });
    pingA?.cancel();
    pingA = null;
    if (t === 'online') {
      // radar: birkaç nabız, sonra durur (sonsuz döngü yok)
      pingA = play(ping, [{transform: 'scale(.55)', opacity: 0.9}, {transform: 'scale(1.9)', opacity: 0}], {duration: 1700, delay: 250, iterations: decorLoops() ? 4 : 1, easing: 'ease-out'}, 0.3);
    } else if (animate) {
      play(q(m.panel, '.kh-ticket'), [{transform: 'rotate(-6deg) scale(.7)', opacity: 0}, {transform: 'rotate(1.5deg) scale(1.03)', opacity: 1, offset: 0.7}, {transform: 'rotate(-1.5deg)', opacity: 1}], {duration: 340, easing: EASE.out, fill: 'backwards'});
    }
  };
  setTab(tab, false);
  m.scope.add(() => pingA?.cancel());
  onAct(m.scope, m.panel, (a, b) => {
    if (a === 'tab') {
      const t = b.dataset.t as 'online' | 'friends';
      if (b.classList.contains('is-on')) return;
      shell.ctx.sounds.tap();
      setTab(t, true);
      return;
    }
    if (a !== 'notify') return;
    shell.ctx.sounds.tap();
    store.set('notify.online', true);
    b.classList.replace('kh-btn--1', 'kh-btn--5');
    b.innerHTML = `${I.bell}Haber Vereceğiz`;
    bump(b, 1.05);
    toast(shell.ctx, 'Açıldığında ilk sen duyacaksın!', I.bell);
  });
}

/** Kasa boşaldı: Kahveci Dursun'dan destek jetonu (bir kez/oturum değil, her boşalışta). */
function bailout(shell: HomeView): void {
  const host = charById('dursun');
  const gift = 1000;
  const m: ModalHandle = openModal(shell.ctx, {
    cls: 'kh-bail',
    title: 'Kasa Boşaldı!',
    body: `<div class="kh-bail__fig"><img src="${host.poses.zafer}" alt=""></div>
      <div class="kh-say kh-bail__say is-up"><small>${esc(host.name)}</small>Üzülme evlat, olur böyle şeyler. Bu jetonlar benden — borç değil, hediye!</div>
      <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block" data-act="take"><img class="kh-chip__ico" src="${ASSETS.icon_coin}" alt="">+${fmt(gift)} Al</button>`,
  });
  onAct(m.scope, m.panel, async (a, b) => {
    if (a !== 'take') return;
    (b as HTMLButtonElement).disabled = true;
    const meter = shell.coins;
    meter.hold();
    shell.profile.addCoins(gift);
    shell.ctx.sounds.reward();
    const from = center(b);
    shell.ctx.fx.burst(from, {coins: 8, confetti: 10, power: 0.6});
    await m.close();
    let added = 0;
    const n = 8;
    await shell.ctx.fx.flyCoins(from, meter.target(), n, i => {
      shell.ctx.sounds.coin(1);
      const add = i === n - 1 ? gift - added : Math.round(gift / n);
      added += add;
      meter.add(add);
    });
    meter.release();
  });
}
