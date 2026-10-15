// ANA EKRAN kabuğu: üst çubuk (avatar + seviye/XP, jeton kapsülü, kurallar, ayarlar), sayfalar (Ana Sayfa · Market ·
// Koleksiyon · Görevler) ve kayan göstergeli alt menü. Ana Sayfa: oyuncunun karakteri (nefes, göz kırpma, dokununca poz + söz),
// günlük ödül ve bedava sandık, ÇEVRİMİÇİ / ARKADAŞLA (yakında), TEK OYUNCU paneli (mod sekmeleri + canlı masa şeması,
// rakip seçimi, bahis), büyük OYNA. Market ve profil Profile üzerinden kendi içinde çözülür; uygulamaya yalnız maç/ayar/kural döner.
import './home.css';
import type {CosmeticsListener, HomeAction} from './types';
import type {Profile as GameProfile} from '../game/profile';
import {DAILY_REWARDS} from '../game/profile';
import {ROSTER, charById, type CharDef, type CharId, type Pose} from '../game/roster';
import {MODE_INFO, type Mode} from '../game/types';
import {ANIM, EASE, Scope, bump, center, clamp, countUp, esc, fmt, h, hms, play, q, shake, typewriter} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {Carousel, Portrait, arenaHtml, capsuleHtml, charAvatarHtml, gemHtml, onAct, openModal, openSheet, shuffled, starsHtml, toast, type Ctx, type ModalHandle} from './parts';
import {daily as dailyModal} from './modals';
import {ShopPage} from './shop';
import {CollectionPage} from './profile';
import {haptic, store} from '../platform/bridge';
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
          <button class="kh-nav__btn" data-tab="quests"><span class="kh-nav__ico"><img src="${ASSETS.icon_star}" alt=""></span><span class="kh-nav__lbl">Görevler</span><span class="kh-nav__soon">Yakında</span></button>
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
    });
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
      to = tab === 'shop' ? new ShopPage(this) : tab === 'profile' ? new CollectionPage(this) : new QuestsPage();
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
      fromEl.getAnimations().forEach(a => a.cancel());
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

  private enter(): void {
    const g = (sel: string) => q(this.el, sel);
    play(g('.kh-arena'), [{transform: 'scale(1.08)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 700, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-top'), [{transform: 'translateY(-30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, delay: 80, easing: EASE.spring, fill: 'backwards'});
    play(g('.kh-nav'), [{transform: 'translateY(60px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: 300, easing: EASE.spring, fill: 'backwards'});
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
// Ana Sayfa
// =====================================================================================================
/** Karakterin ana ekranda dokununca söyledikleri (poz + söz). */
const POKE: Record<CharId, [Pose, string][]> = {
  riza: [['gulumseme', 'Gel otur evlat, bir el atalım.'], ['dusunceli', 'Valeyi sona sakla, demedi deme.'], ['kahkaha', 'Haha! Bıyığımı burdum, masa hazır!'], ['zafer', 'Çayımız da geldi. Hadi bakalım!'], ['pisti', 'Şu valeyi görüyor musun? Pişti kokusu var.'], ['saskin', 'Ne o, hâlâ oturmadın mı?']],
  cem: [['gulumseme', 'Hazırım. İhtimaller bizden yana.'], ['dusunceli', '52 kart, 4 vale… Hesap tamam.'], ['kahkaha', 'Haha! Algoritma bugün coşkulu.'], ['zafer', 'Seriye bağlayalım, hadi!'], ['pisti', 'Vale bende, pişti kapıda.'], ['saskin', 'Dur, kulaklık… Tamam, buradayım!']],
  dursun: [['gulumseme', 'Çaylar benden, oyun senden!'], ['zafer', 'Taze demledim, buyur!'], ['kahkaha', 'Hahaha! Bugün şanslı günümüz.'], ['dusunceli', 'Defterde senin hanen boş duruyor…'], ['pisti', 'Göz kırptım ama kimseye söyleme.'], ['saskin', 'Aaa, daha masaya oturmadın mı?']],
  defne: [['gulumseme', 'Hazırsan başlayalım.'], ['dusunceli', 'Planım hazır.'], ['pisti', 'Sessiz olan kazanır.'], ['zafer', 'Bir el daha mı? Olur.'], ['kahkaha', 'Hah. Bu iyiydi.'], ['saskin', 'Beni mi bekliyorsun?']],
};
/** Ana ekranda uzun süre dokunulmazsa karakterin dürtmesi. */
const NUDGE: Record<CharId, string[]> = {
  riza: ['Hadi evlat, çay soğuyor!', 'Valeler seni bekliyor…'],
  cem: ['Bekleme modundayım… OYNA’ya bas!', 'Ping atıyorum: masa hazır!'],
  dursun: ['Masa boş kalmasın, gel otur!', 'Çaylar tazelendi, haberin olsun.'],
  defne: ['Sıra sende.', 'Bekliyorum.'],
};
const TICKLE: Record<CharId, string> = {
  riza: 'Yeter be evlat, bıyığım ağrıdı!',
  cem: 'Hey! Ekranım çizilecek!',
  dursun: 'Yavaş! Çaylar dökülecek!',
  defne: 'Bir daha dokunursan… pişti yaparım.',
};

const SEAT_NAME = ['Sen', 'Sağ', 'Karşı', 'Sol'];
const rndOf = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

/** Kısa ad: "Rıza Amca" → "Rıza", "Kahveci Dursun" → "Dursun". */
export const shortName = (c: CharDef): string => c.name.replace(/^Kahveci\s+/, '').split(' ')[0];

/** Mod sekmesindeki küçük yuvarlak masa şeması (üstten): koltuklar, ortada iki kart; sıra halkası koltuktan koltuğa geçer. */
function diagram(mode: Mode): string {
  const P = [[24, 43], [43, 24], [24, 5], [5, 24]]; // alt, sağ, üst, sol (saat yönünün tersine)
  const seats = mode === '1v1' ? [0, 2] : [0, 1, 2, 3];
  const col = (s: number) => (s === 0 ? '#ffd23f' : mode === 'esli' ? (s === 2 ? '#3d93ff' : '#ff4d66') : ['#ffd23f', '#ff4d66', '#16c45b', '#3d93ff'][s]);
  const link = mode === 'esli' ? '<path d="M24 11V37" stroke="#7fc0ff" stroke-width="2.4" stroke-dasharray="3 2.6" stroke-linecap="round"/>' : '';
  return `<svg class="kh-dg is-${mode}" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="15" fill="url(#khdgf)" stroke="#0a1033" stroke-width="2.6"/>
    <circle cx="24" cy="24" r="10.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.2"/>
    ${link}
    <rect x="18.5" y="19" width="6" height="8.6" rx="1.4" fill="#fff" stroke="#0a1033" stroke-width="1.2" transform="rotate(-12 21.5 23.3)"/>
    <rect x="23.5" y="19.4" width="6" height="8.6" rx="1.4" fill="#fff" stroke="#0a1033" stroke-width="1.2" transform="rotate(10 26.5 23.7)"/>
    <path d="M26.5 21.6c.9-1.3 2.6-.5 2.1.9-.3.9-2.1 2-2.1 2s-1.8-1.1-2.1-2c-.5-1.4 1.2-2.2 2.1-.9z" fill="#ff2e4d" transform="rotate(10 26.5 23.7)"/>
    ${seats.map(s => `<circle cx="${P[s][0]}" cy="${P[s][1]}" r="4.8" fill="${col(s)}" stroke="#0a1033" stroke-width="2.2"/>`).join('')}
    <circle class="kh-dg__turn" cx="0" cy="0" r="7.6" fill="none" stroke="#fff" stroke-width="2.2"/>
  </svg>`;
}

class HomePage implements Page {
  readonly el = h('div', 'kh-page kh-hp');
  private scope = new Scope();
  private pt: Portrait;
  private mode: Mode;
  private stake: number;
  private oppIdx = 0;
  private trio: CharId[] = [];
  private car: Carousel | null = null;
  private carScope: Scope | null = null;
  private pokes: number[] = [];
  private sayT = 0;
  private lastPoke = -1;
  private visible = true;

  constructor(private shell: HomeView, private memo: HomeMemo) {
    const p = shell.profile.data;
    this.mode = p.lastMode ?? '1v1';
    this.stake = p.lastStake ?? 100;
    const me = this.me();
    this.el.innerHTML = `
      <section class="kh-hero2">
        <i class="kh-hero2__glow"></i><i class="kh-rays kh-hero2__rays"></i>
        <div class="kh-hero2__fig"></div>
        <button class="kh-hero2__tap" data-act="poke" aria-label="Karakterine dokun"></button>
        <div class="kh-hero2__plate"><b></b><span></span></div>
        <div class="kh-say kh-hero2__say"><div class="kh-say__t"></div></div>
        <button class="kh-hw is-daily" data-act="daily" data-spring><span class="kh-hw__ico"><img src="${ASSETS.icon_gift}" alt=""></span><span class="kh-hw__lbl">Günlük</span><i class="kh-dot"></i></button>
        <button class="kh-hw is-chest" data-act="chest" data-spring><span class="kh-hw__ico"><img src="${ASSETS.icon_chest}" alt=""></span><span class="kh-hw__lbl kh-num">Sandık</span></button>
      </section>
      <div class="kh-online">
        <button class="kh-oc2 is-online" data-act="online" data-spring><span class="kh-oc2__ico">${I.globe}</span><span class="kh-oc2__txt"><b>Çevrimiçi</b><small>Gerçek rakipler</small></span><span class="kh-ribbon">Yakında</span></button>
        <button class="kh-oc2 is-friends" data-act="friends" data-spring><span class="kh-oc2__ico">${I.friends}</span><span class="kh-oc2__txt"><b>Arkadaşla</b><small>Özel masa kur</small></span><span class="kh-ribbon">Yakında</span></button>
      </div>
      <section class="kh-panel kh-solo">
        <div class="kh-solo__head"><span class="kh-label">Tek Oyuncu</span><span class="kh-solo__desc"></span>
          <button class="kh-solo__help" data-act="rules" data-spring aria-label="Nasıl oynanır">?</button></div>
        <div class="kh-modes"><i class="kh-modes__ind"></i>${(['1v1', '4', 'esli'] as Mode[]).map(m => `<button class="kh-mode" data-act="mode" data-m="${m}">${diagram(m)}<span>${MODE_INFO[m].name}</span></button>`).join('')}</div>
        <div class="kh-solo__opp"></div>
        <div class="kh-solo__stakes"></div>
      </section>
      <div class="kh-playwrap"><button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-shine kh-play2" data-act="play">${I.play}<span>Oyna</span></button></div>
      <svg width="0" height="0" style="position:absolute"><defs><radialGradient id="khdgf" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#4a66ff"/><stop offset="1" stop-color="#1d30b0"/></radialGradient></defs></svg>`;
    this.pt = new Portrait(me, {pose: 'notr', cls: 'kh-hero2__pt'});
    q(this.el, '.kh-hero2__fig').append(this.pt.el);
    this.scope.add(() => this.pt.destroy());
    this.applyChar(me);
    if (!this.stakeOk(this.stake)) this.stake = STAKES[0].v;
    this.trio = memo.trio && this.valid(memo.trio) ? memo.trio : this.defaultTrio();
    this.setMode(this.mode, false);
    this.tickChest();
    this.refresh();
    this.scope.add(() => {
      clearTimeout(this.sayT);
      clearTimeout(this.nudgeT);
    });
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
    q(this.el, '.kh-hero2__plate b').textContent = c.name;
    q(this.el, '.kh-hero2__plate span').textContent = c.title;
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
    const dot = q(this.el, '.kh-hw.is-daily .kh-dot');
    dot.style.display = p.dailyReady() ? '' : 'none';
    q(this.el, '.kh-hw.is-daily').classList.toggle('is-ready', p.dailyReady());
    if (!this.stakeOk(this.stake)) this.stake = STAKES.filter(s => this.stakeOk(s.v)).pop()?.v ?? STAKES[0].v;
    this.buildStakes();
    this.tickChest(true);
  }

  enter(): void {
    const g = (sel: string) => q(this.el, sel);
    play(g('.kh-hero2__fig'), [{transform: 'translateY(30%) scale(.86)', opacity: 0}, {transform: 'translateY(-3%) scale(1.02)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 620, delay: 120, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-hero2__glow'), [{transform: 'scale(.4)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 800, delay: 60, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-hero2__plate'), [{transform: 'translate(-50%, 20px) scale(.7)', opacity: 0}, {transform: 'translate(-50%, 0)', opacity: 1}], {duration: 420, delay: 380, easing: EASE.spring, fill: 'backwards'});
    this.el.querySelectorAll('.kh-hw').forEach((w, i) =>
      play(w, [{transform: `translateX(${i ? 60 : -60}px) scale(.6)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: 420 + i * 80, easing: EASE.spring, fill: 'backwards'}));
    this.el.querySelectorAll('.kh-oc2').forEach((w, i) =>
      play(w, [{transform: 'translateY(24px) scale(.9)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, delay: 220 + i * 70, easing: EASE.spring, fill: 'backwards'}));
    play(g('.kh-solo'), [{transform: 'translateY(40px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: 280, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-playwrap'), [{transform: 'scale(.6)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 520, delay: 380, easing: EASE.spring, fill: 'backwards'});
    // ilk kez: karakter selam verir; sonra uzun sessizlikte ara sıra dürter
    this.scope.timeout(() => this.poke(true), ANIM ? 900 : 0);
    this.scope.on(this.el, 'pointerdown', () => this.armNudge());
    this.armNudge();
  }

  private nudgeT = 0;
  private nudges = 0;
  private armNudge(): void {
    clearTimeout(this.nudgeT);
    if (!ANIM || this.nudges >= 3) return;
    this.nudgeT = window.setTimeout(() => {
      if (!this.scope.alive || !this.visible || !this.el.isConnected) return;
      const me = this.me();
      this.nudges++;
      this.pt.pose('dusunceli', 1400);
      this.scope.timeout(() => this.say(rndOf(NUDGE[me.id]), 'gulumseme'), 1200);
      this.armNudge();
    }, 16000 + Math.random() * 8000);
  }

  /** Balon + poz (dürtme, karşılama). */
  private say(line: string, pose: Pose): void {
    this.pt.pose(pose, 2600);
    this.pt.pop();
    const say = q(this.el, '.kh-hero2__say');
    say.style.visibility = 'visible';
    play(say, [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.05)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 320, easing: EASE.out, fill: 'both'});
    typewriter(this.scope, q(say, '.kh-say__t'), line, 46);
    clearTimeout(this.sayT);
    this.sayT = window.setTimeout(() => {
      if (!this.scope.alive) return;
      const a = play(say, [{opacity: 1}, {opacity: 0, transform: 'scale(.9)'}], {duration: 220, fill: 'forwards'});
      a.onfinish = () => {
        say.style.visibility = 'hidden';
        a.cancel();
      };
    }, ANIM ? 3000 : 60000);
  }

  show(): void {
    this.visible = true;
    this.tickChest(true);
    this.layout();
  }

  /** Ölçüye bağlı yerleşim (sayfa DOM'a eklendikten sonra). */
  layout(): void {
    this.car?.layout();
  }
  hide(): void {
    this.visible = false;
  }

  // ---------------------------------------------------------------- mod
  private setMode(m: Mode, animate: boolean): void {
    this.mode = m;
    const i = ['1v1', '4', 'esli'].indexOf(m);
    this.el.querySelectorAll<HTMLElement>('.kh-mode').forEach((b, k) => b.classList.toggle('is-on', k === i));
    q(this.el, '.kh-modes__ind').style.transform = `translateX(${i * 100}%)`;
    q(this.el, '.kh-solo__desc').textContent = MODE_INFO[m].desc;
    if (animate) {
      const b = this.el.querySelectorAll<HTMLElement>('.kh-mode')[i];
      play(q(b, '.kh-dg'), [{transform: 'scale(1)'}, {transform: 'scale(1.25) rotate(-6deg)', offset: 0.4}, {transform: 'scale(1)'}], {duration: 380, easing: EASE.out});
    }
    this.buildOpp(animate);
    this.buildStakes();
  }

  // ---------------------------------------------------------------- rakipler
  private buildOpp(animate: boolean): void {
    const box = q(this.el, '.kh-solo__opp');
    this.carScope?.dispose();
    this.carScope = null;
    this.car = null;
    const others = this.others();
    if (this.mode === '1v1') {
      const prev = this.memo.opp && others.find(c => c.id === this.memo.opp) ? this.memo.opp : others[Math.floor(others.length / 2)].id;
      this.oppIdx = Math.max(0, others.findIndex(c => c.id === prev));
      box.className = 'kh-solo__opp is-1v1';
      box.innerHTML = `<div class="kh-opps kh-car"></div>`;
      const host = q(box, '.kh-opps');
      const items = others.map((c, i) => {
        const it = h('div', 'kh-car__item kh-opc');
        it.dataset.i = String(i);
        it.style.setProperty('--c', c.color);
        it.innerHTML = `<div class="kh-opc__card"><i class="kh-opc__bg"></i><img class="kh-opc__img" src="${c.poses.notr}" alt="">
          <div class="kh-opc__plate"><b>${esc(c.name)}</b>${starsHtml(c.difficulty)}</div><span class="kh-opc__lvl">${gemHtml(BOT_LEVEL[c.id], false)}</span>
          <span class="kh-opc__check">${I.check}</span></div>`;
        host.append(it);
        return it;
      });
      this.carScope = new Scope();
      const sc = this.carScope;
      this.car = new Carousel(sc, host, items, {
        spacing: () => host.clientWidth * 0.34,
        shrink: 0.2,
        tilt: 0,
        drop: 0.06,
        sounds: this.shell.ctx.sounds,
        onChange: i => {
          this.oppIdx = i;
          this.memo.opp = others[i].id;
        },
        onSettle: i => {
          const img = items[i].querySelector<HTMLImageElement>('.kh-opc__img')!;
          img.src = others[i].poses.gulumseme;
          items.forEach((it, k) => k !== i && (it.querySelector<HTMLImageElement>('.kh-opc__img')!.src = others[k].poses.notr));
        },
      });
      sc.on(host, 'click', e => {
        const it = (e.target as Element).closest<HTMLElement>('.kh-opc');
        if (!it) return;
        const i = Number(it.dataset.i);
        if (i !== this.car!.index) this.car!.go(i);
        else {
          this.shell.ctx.sounds.tap();
          const c = others[i];
          bump(q(it, '.kh-opc__card'), 1.06);
          toast(this.shell.ctx, `${c.name}: “${c.quote}”`, I.voice);
        }
      });
      this.car.go(this.oppIdx, false);
      sc.on(window, 'resize', () => this.car?.layout());
      if (!host.clientWidth) requestAnimationFrame(() => this.car?.layout());
      if (animate) items.forEach((it, k) => play(q(it, '.kh-opc__card'), [{transform: 'translateY(30px) scale(.7)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: k * 60, easing: EASE.spring, fill: 'backwards'}));
    } else {
      box.className = `kh-solo__opp is-${this.mode}`;
      box.innerHTML = this.mode === '4' ? this.trioHtml() : this.teamsHtml();
      if (animate) box.querySelectorAll('.kh-ava').forEach((a, k) => play(a, [{transform: 'scale(.3) rotate(-20deg)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: k * 60, easing: EASE.spring, fill: 'backwards'}));
    }
  }

  private trioHtml(): string {
    // koltuk sırası: [sağ, karşı, sol] → ekranda soldan sağa: sol, karşı, sağ
    const order = [2, 1, 0];
    const seat = [1, 2, 3];
    return `<div class="kh-trio">${order.map(k => {
      const c = charById(this.trio[k]);
      return `<div class="kh-trio__seat"><span class="kh-trio__ava">${charAvatarHtml(c, 'standart')}${gemHtml(BOT_LEVEL[c.id], false)}</span><b>${esc(shortName(c))}</b><small>${SEAT_NAME[seat[k]]}</small></div>`;
    }).join('')}</div>
      <button class="kh-iconbtn kh-shuf" data-act="shuffle" aria-label="Karıştır">${I.shuffle}</button>`;
  }

  private teamsHtml(): string {
    const me = this.me();
    const p = this.shell.profile.data;
    const partner = charById(this.trio[1]);
    const r1 = charById(this.trio[0]), r2 = charById(this.trio[2]);
    return `<div class="kh-hteams">
        <div class="kh-hteam is-blue"><span class="kh-hteam__avas">${charAvatarHtml(me, p.equipped.frame)}${charAvatarHtml(partner, 'standart')}</span><b>Sen + ${esc(shortName(partner))}</b></div>
        <span class="kh-hteams__vs">VS</span>
        <div class="kh-hteam is-red"><span class="kh-hteam__avas">${charAvatarHtml(r1, 'standart')}${charAvatarHtml(r2, 'standart')}</span><b>${esc(shortName(r1))} + ${esc(shortName(r2))}</b></div>
      </div>
      <button class="kh-iconbtn kh-shuf" data-act="shuffle" aria-label="Ortağını değiştir">${I.shuffle}</button>`;
  }

  private shuffle(btn: HTMLElement): void {
    const s = this.shell.ctx.sounds;
    if (s.shuffle) s.shuffle();
    else s.whoosh();
    play(btn, [{transform: 'rotate(0)'}, {transform: 'rotate(-360deg) scale(1.15)', offset: 0.7}, {transform: 'rotate(-360deg)'}], {duration: 480, easing: EASE.out});
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
    const box = q(this.el, '.kh-solo__opp');
    const avas = Array.from(box.querySelectorAll<HTMLElement>('.kh-ava'));
    avas.forEach((a, k) => play(a, [{transform: 'none'}, {transform: 'rotateY(90deg) scale(.8)'}], {duration: 150, delay: k * 40, easing: EASE.in, fill: 'forwards'}));
    this.scope.timeout(() => {
      box.innerHTML = this.mode === '4' ? this.trioHtml() : this.teamsHtml();
      box.querySelectorAll('.kh-ava').forEach((a, k) => play(a, [{transform: 'rotateY(-90deg) scale(.8)'}, {transform: 'rotateY(10deg) scale(1.08)', offset: 0.6}, {transform: 'none'}], {duration: 360, delay: k * 50, easing: EASE.out, fill: 'backwards'}));
      if (this.mode === 'esli') {
        const p = charById(this.trio[1]);
        toast(this.shell.ctx, `Yeni ortağın: ${p.name}`, I.friends);
      }
    }, ANIM ? 200 + avas.length * 40 : 0);
  }

  // ---------------------------------------------------------------- bahis
  private stakeOk(v: number): boolean {
    const s = STAKES.find(x => x.v === v);
    const d = this.shell.profile.data;
    return !!s && d.level >= s.lvl && v <= Math.max(d.coins, STAKES[0].v);
  }

  private buildStakes(): void {
    const d = this.shell.profile.data;
    const box = q(this.el, '.kh-solo__stakes');
    box.innerHTML = `<div class="kh-stakes">${STAKES.map(s => {
      const lockedLvl = d.level < s.lvl;
      const poor = !lockedLvl && !this.stakeOk(s.v);
      return `<button class="kh-chip${s.v === this.stake ? ' is-on' : ''}${lockedLvl || poor ? ' is-locked' : ''}" data-act="stake" data-v="${s.v}">
        ${lockedLvl ? I.lock : `<img class="kh-chip__ico" src="${ASSETS.icon_coin}" alt="">`}<span class="kh-num">${fmt(s.v)}</span>${lockedLvl ? `<span class="kh-tag">Sv. ${s.lvl}</span>` : ''}</button>`;
    }).join('')}</div>
      <div class="kh-solo__win">${this.mode === 'esli' ? 'Kazanan takıma kişi başı' : this.mode === '4' ? 'Masadaki pot' : 'Kazanan alır'} <img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(payout(this.mode, this.stake))}</b></div>`;
  }

  // ---------------------------------------------------------------- dokunma
  /** Karaktere dokun: rastgele poz + söz; hızlı ardışık dokunuşta gıdıklanır. */
  private poke(greet = false): void {
    const me = this.me();
    const now = performance.now();
    this.pokes = this.pokes.filter(t => now - t < 2600);
    if (!greet) this.pokes.push(now);
    let pose: Pose, line: string;
    if (this.pokes.length >= 5) {
      this.pokes = [];
      pose = 'kizgin';
      line = TICKLE[me.id];
      haptic('warning');
      shake(q(this.el, '.kh-hero2__fig'), 0.8);
    } else if (greet && this.memo.last) {
      // maçtan dönüş: sonuca göre karşılar
      const {outcome, streak, levelUp} = this.memo.last;
      this.memo.last = undefined;
      if (levelUp) {
        pose = 'zafer';
        line = `Seviye ${this.shell.profile.data.level}! Yeni masalar seni bekliyor.`;
      } else if (outcome === 'win') {
        pose = streak >= 3 ? 'kahkaha' : 'zafer';
        line = streak >= 2 ? `${streak} el üst üste! Bu seri bozulmaz.` : 'Helal olsun! Bir tane daha?';
      } else if (outcome === 'lose') {
        pose = 'uzgun';
        line = 'Olsun be… Rövanşı alırız!';
        this.scope.timeout(() => this.pt.pose('gulumseme', 1600), ANIM ? 1500 : 0);
      } else {
        pose = 'saskin';
        line = 'Berabere! Kıl payı kaçtı.';
      }
    } else if (greet) {
      const name = this.shell.profile.data.name;
      const hr = new Date().getHours();
      const hi = hr < 6 ? 'Gece kuşu' : hr < 12 ? 'Günaydın' : hr < 18 ? 'Hoş geldin' : 'İyi akşamlar';
      pose = 'gulumseme';
      line = `${hi}, ${name}! Masalar hazır.`;
    } else {
      const list = POKE[me.id];
      let k = Math.floor(Math.random() * list.length);
      if (k === this.lastPoke) k = (k + 1) % list.length;
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
    lbl.textContent = ready ? 'Aç!' : hms((p.data.chestAt - Date.now()) / 1000);
    if (!this.scope.alive) return;
    if (this.visible && ANIM) this.chestT = window.setTimeout(() => this.tickChest(true), ready ? 5000 : 1000);
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
    const ico = q(w, '.kh-hw__ico');
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
    this.shell.ctx.fx.flash(0.4, 300);
    this.shell.ctx.fx.burst(c, {coins: 10, confetti: 16, power: 0.7});
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
        this.stake = v;
        this.buildStakes();
        bump(q(this.el, `.kh-stakes [data-v="${v}"]`), 1.08);
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
      case 'friends':
        s.tap();
        friendsTeaser(this.shell);
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
    this.pt.pose('zafer');
    this.shell.finish({type: 'play', mode: this.mode, stake: this.stake, opponents});
  }

  destroy(): void {
    this.carScope?.dispose();
    this.scope.dispose();
    this.el.remove();
  }
}

// =====================================================================================================
// Görevler (yakında)
// =====================================================================================================
class QuestsPage implements Page {
  readonly el = h('div', 'kh-page kh-quests');
  constructor() {
    const qs: [string, string, number, number, number][] = [
      ['Pişti Avcısı', '3 pişti yap', 1, 3, 300],
      ['Vale Ustası', 'Vale ile 5 yığın topla', 2, 5, 250],
      ['Eşli Kahraman', 'Eşli modda 2 el kazan', 0, 2, 500],
    ];
    this.el.innerHTML = `<div class="kh-quests__in kh-scroll">
      <div class="kh-quests__hero"><i class="kh-rays is-gold"></i><img src="${ASSETS.icon_star}" alt=""></div>
      <div class="kh-title kh-quests__title">${g3('Görevler')}</div>
      <p class="kh-quests__sub">Günlük görevler çok yakında! Pişti yap, vale topla, ödülleri kap.</p>
      <div class="kh-quests__list">${qs.map(([t, d, a, b, r]) => `<div class="kh-quest kh-card">
          <span class="kh-quest__ico">${I.target}</span>
          <div class="kh-quest__body"><b>${t}</b><small>${d}</small><span class="kh-quest__bar"><i style="transform:scaleX(${(a / b).toFixed(2)})"></i><em>${a}/${b}</em></span></div>
          <span class="kh-quest__rw">${`<img src="${ASSETS.icon_coin}" alt="">`}<b class="kh-num">${fmt(r)}</b></span></div>`).join('')}
        <div class="kh-quests__lock"><span class="kh-tag">Yakında</span></div>
      </div></div>`;
  }
  show(): void {
    this.el.querySelectorAll('.kh-quest').forEach((x, i) =>
      play(x, [{transform: 'translateX(-30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: 120 + i * 80, easing: EASE.spring, fill: 'backwards'}));
    play(q(this.el, '.kh-quests__hero img'), [{transform: 'scale(.4) rotate(-30deg)'}, {transform: 'scale(1.1) rotate(6deg)', offset: 0.6}, {transform: 'none'}], {duration: 600, easing: EASE.out});
  }
  destroy(): void {
    this.el.remove();
  }
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

function onlineTeaser(shell: HomeView): void {
  const me = charById(shell.profile.data.char ?? 'dursun');
  const others = ROSTER.filter(c => c.id !== me.id);
  const notified = store.get('notify.online', false);
  const m: ModalHandle = openModal(shell.ctx, {
    cls: 'kh-teaser is-online',
    title: 'Çevrimiçi',
    onX: () => m.close(),
    body: `<div class="kh-radar"><i class="kh-radar__ring"></i><i class="kh-radar__ring is-2"></i><i class="kh-radar__ring is-3"></i>
        <div class="kh-radar__orbit">${others.map((c, i) => `<span class="kh-radar__sat" style="--a:${i * 120}deg">${charAvatarHtml(c, 'standart')}</span>`).join('')}</div>
        <div class="kh-radar__me">${charAvatarHtml(me, shell.profile.data.equipped.frame)}</div></div>
      <div class="kh-teaser__t">Gerçek rakipler yolda!</div>
      <p class="kh-teaser__s">Yakında Türkiye'nin dört bir yanından oyuncularla aynı masaya oturacak, sıralamada yükseleceksin.</p>
      <button class="kh-btn ${notified ? 'kh-btn--5' : 'kh-btn--1'} kh-btn--lg kh-btn--block" data-act="notify">${I.bell}${notified ? 'Haber Vereceğiz' : 'Açılınca Haber Ver'}</button>`,
  });
  onAct(m.scope, m.panel, (a, b) => {
    if (a !== 'notify') return;
    shell.ctx.sounds.tap();
    store.set('notify.online', true);
    b.classList.replace('kh-btn--1', 'kh-btn--5');
    b.innerHTML = `${I.bell}Haber Vereceğiz`;
    bump(b, 1.05);
    toast(shell.ctx, 'Açıldığında ilk sen duyacaksın!', I.bell);
  });
}

function friendsTeaser(shell: HomeView): void {
  const code = 'KHV-' + String(1000 + ((shell.profile.data.name.length * 7919 + 4821) % 9000));
  const m: ModalHandle = openModal(shell.ctx, {
    cls: 'kh-teaser is-friends',
    title: 'Arkadaşla',
    onX: () => m.close(),
    body: `<div class="kh-ticket"><div class="kh-ticket__l"><small>Özel masa kodun</small><b class="kh-num">${code}</b></div><div class="kh-ticket__r">${I.friends}</div></div>
      <div class="kh-teaser__steps">
        <div><span>1</span>Masanı kur, kodu paylaş</div>
        <div><span>2</span>Arkadaşların koda katılsın</div>
        <div><span>3</span>Eşli ya da 4 kişi, sen seç!</div>
      </div>
      <p class="kh-teaser__s">Arkadaşlarınla özel masalar çok yakında. Şimdilik ustalarla antrenman yap!</p>
      <button class="kh-btn kh-btn--2 kh-btn--lg kh-btn--block" data-act="ok">Anladım</button>`,
  });
  onAct(m.scope, m.panel, a => {
    if (a !== 'ok') return;
    shell.ctx.sounds.tap();
    m.close();
  });
  play(q(m.panel, '.kh-ticket'), [{transform: 'rotate(-8deg) scale(.6)', opacity: 0}, {transform: 'rotate(2deg) scale(1.04)', opacity: 1, offset: 0.7}, {transform: 'rotate(-1.5deg)', opacity: 1}], {duration: 520, delay: 120, easing: EASE.out, fill: 'both'});
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
      <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-shine" data-act="take"><img class="kh-chip__ico" src="${ASSETS.icon_coin}" alt="">+${fmt(gift)} Al</button>`,
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
