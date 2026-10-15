// Ana menü: profil + jeton, rakip vitrini (kaydırmalı), oyun türü, masa bahsi, OYNA, alt menü.
// Aynı lobi DOM'u, ayarlar/günlük ödül/kurallar dönüşlerinde yeniden kurulmadan güncellenir.
import type {LobbyAction, Opponent, Profile} from './types';
import {ANIM, EASE, Scope, center, countUp, esc, fmt, h, play, q} from './dom';
import {ASSETS, isCutout} from './assets';
import {I} from './icons';
import {avatarHtml, capsuleHtml, levelHtml, onAct, soon, toast, type Ctx} from './parts';

/** Masa bahisleri ve açıldıkları seviye. */
export const STAKES: {v: number; lvl: number}[] = [
  {v: 100, lvl: 1},
  {v: 500, lvl: 2},
  {v: 1000, lvl: 4},
  {v: 5000, lvl: 7},
];

const MODES: {id: string; label: string; locked: boolean}[] = [
  {id: '1v1', label: "1'e 1", locked: false},
  {id: '4', label: '4 Kişi', locked: true},
  {id: 'esli', label: 'Eşli', locked: true},
];

export class LobbyView {
  readonly el = h('div', 'kh-screen kh-lobby');
  private scope = new Scope();
  private resolve: ((a: LobbyAction) => void) | null = null;
  private sel = 0;
  private profile!: Profile;
  private opps: Opponent[] = [];
  private stake: number;
  private busy = false;
  private swipedAt = 0;

  constructor(private ctx: Ctx, p: Profile, opps: Opponent[], dailyReady: boolean, stake: number) {
    this.stake = stake;
    this.el.innerHTML = `<div class="kh-lobby__photo" style="background-image:url('${ASSETS.lobby_bg}')"></div><div class="kh-lobby__tint"></div>
      <div class="kh-lobby__grid">
        <header class="kh-topbar"></header>
        <section class="kh-hero"><div class="kh-hero__stage"></div>
          <button class="kh-iconbtn kh-hero__arrow is-l" data-act="prev" aria-label="Önceki rakip">${I.chevL}</button>
          <button class="kh-iconbtn kh-hero__arrow is-r" data-act="next" aria-label="Sonraki rakip">${I.chevR}</button>
        </section>
        <nav class="kh-dock">
          <button class="kh-dock__btn" data-act="daily"><img src="${ASSETS.icon_gift}" alt=""><span>Günlük Ödül</span><i class="kh-dot"></i></button>
          <button class="kh-dock__btn" data-act="quests"><img src="${ASSETS.icon_star}" alt=""><span>Görevler</span></button>
          <button class="kh-dock__btn" data-act="shop"><img src="${ASSETS.icon_chest}" alt=""><span>Mağaza</span></button>
          <button class="kh-dock__btn" data-act="profile"><img src="${ASSETS.icon_trophy}" alt=""><span>Profil</span></button>
        </nav>
        <section class="kh-playcol">
          ${ASSETS.logo ? `<img class="kh-logo" src="${ASSETS.logo}" alt="Kahvehane Pişti">` : ''}
          <div class="kh-panel kh-setup">
            <div class="kh-label">Oyun türü</div>
            <div class="kh-setup__modes">${MODES.map(m => `<button class="kh-chip${m.locked ? ' is-locked' : ' is-on'}" data-act="mode" data-id="${m.id}">${m.locked ? I.lock : ''}${m.label}${m.locked ? '<span class="kh-tag">Yakında</span>' : ''}</button>`).join('')}</div>
            <div class="kh-label">Masa bahsi</div>
            <div class="kh-setup__stakes"></div>
            <div class="kh-setup__win"></div>
            <button class="kh-btn kh-btn--1 kh-btn--xl kh-shine kh-play" data-act="play">Oyna</button>
          </div>
        </section>
        <div class="kh-lobby__corner">
          <button class="kh-iconbtn" data-act="rules" aria-label="Nasıl oynanır">${I.book}</button>
          <button class="kh-iconbtn" data-act="settings" aria-label="Ayarlar">${I.gear}</button>
        </div>
      </div>`;
    ctx.layer.append(this.el);
    onAct(this.scope, this.el, (a, b) => this.act(a, b));
    this.scope.on(q(this.el, '.kh-hero__stage'), 'click', e => {
      const c = (e.target as Element).closest<HTMLElement>('.kh-oc');
      if (!c || this.busy || performance.now() - this.swipedAt < 350) return;
      const i = Number(c.dataset.i);
      if (i !== this.sel) {
        this.ctx.sounds.tap();
        this.select(i);
      } else if (this.opps[i].locked) toast(this.ctx, `${this.opps[i].name} yakında masada!`);
    });
    this.swipe();
    this.update(p, opps, dailyReady);
    this.enter();
  }

  /** Lobiye dönüşte: verileri tazele (yeniden kurmadan). */
  update(p: Profile, opps: Opponent[], dailyReady: boolean): void {
    const prevCoins = this.profile?.coins;
    this.profile = p;
    const oppsChanged = opps.map(o => o.id + o.portrait).join() !== this.opps.map(o => o.id + o.portrait).join();
    this.opps = opps;
    q(this.el, '.kh-topbar').innerHTML = `
      <button class="kh-prof" data-act="profile">${avatarHtml(p.name)}
        <span class="kh-prof__meta"><span class="kh-prof__name">${esc(p.name)}</span>${levelHtml(p)}</span></button>
      ${capsuleHtml(prevCoins ?? p.coins, true)}`;
    if (prevCoins !== undefined && prevCoins !== p.coins) countUp(this.scope, q(this.el, '.kh-topbar .kh-capsule__val'), prevCoins, p.coins, 700);
    q(this.el, '.kh-dot').style.display = dailyReady ? '' : 'none';
    (q(this.el, '[data-act=daily]') as HTMLElement).dataset.ready = dailyReady ? '1' : '0';
    if (oppsChanged) {
      this.sel = Math.max(0, opps.findIndex(o => !o.locked));
      this.buildCards();
    }
    if (!this.stakeOk(this.stake)) this.stake = STAKES[0].v;
    this.buildStakes();
    this.layoutCards();
  }

  wait(): Promise<LobbyAction> {
    this.busy = false;
    return new Promise(res => (this.resolve = res));
  }

  /** Bakiye kapsülünün ekran merkezi (uçan jeton hedefi). */
  coinTarget(): {x: number; y: number} {
    return center(q(this.el, '.kh-topbar .kh-capsule__ico'));
  }
  /** Günlük ödül gibi dış kazançlar: her jeton varışında bakiyeyi artır. */
  bumpBy(n: number): void {
    const cap = q(this.el, '.kh-topbar .kh-capsule');
    this.profile = {...this.profile, coins: this.profile.coins + n};
    q(cap, '.kh-capsule__val').textContent = fmt(this.profile.coins);
    cap.classList.remove('is-bump');
    void cap.offsetWidth;
    cap.classList.add('is-bump');
  }

  private stakeOk(v: number): boolean {
    const s = STAKES.find(x => x.v === v);
    return !!s && this.profile.level >= s.lvl && (v <= this.profile.coins || v === STAKES[0].v);
  }

  private buildCards(): void {
    const stage = q(this.el, '.kh-hero__stage');
    stage.innerHTML = this.opps
      .map((o, i) => {
        const cut = isCutout(o.portrait);
        const dots = [1, 2, 3].map(d => `<i class="${d <= o.difficulty ? 'on' : ''}"></i>`).join('');
        return `<div class="kh-oc ${cut ? 'is-cutout' : 'is-photo'}${o.locked ? ' is-locked' : ''}" data-i="${i}">
          <div class="kh-oc__card"></div>
          <div class="kh-oc__fig"><img class="kh-oc__img" src="${o.portrait}" alt=""></div>
          <div class="kh-oc__plate"><div class="kh-oc__name">${esc(o.name)}</div><div class="kh-oc__title">${esc(o.title)}</div>
            <div class="kh-oc__diff"><span>Zorluk</span>${dots}</div></div>
          ${o.locked ? `<div class="kh-oc__lock"><span class="kh-lockdisc">${I.lock}</span><span class="kh-tag">Yakında</span></div>` : ''}
          <div class="kh-oc__veil"></div>
        </div>`;
      })
      .join('');
  }

  private layoutCards(): void {
    const cards = this.el.querySelectorAll<HTMLElement>('.kh-oc');
    cards.forEach((c, i) => {
      const d = i - this.sel, ad = Math.abs(d);
      c.style.transform = d === 0 ? 'translate3d(0,0,0)' : `translate3d(${d * 64}%,${ad * 3}%,0) scale(${ad === 1 ? 0.76 : 0.6})`;
      c.style.opacity = ad > 1 ? '0' : '1';
      c.style.zIndex = String(10 - ad);
      c.style.pointerEvents = ad > 1 ? 'none' : '';
      c.classList.toggle('is-side', d !== 0);
    });
    (q(this.el, '[data-act=prev]') as HTMLButtonElement).disabled = this.sel <= 0;
    (q(this.el, '[data-act=next]') as HTMLButtonElement).disabled = this.sel >= this.opps.length - 1;
    const o = this.opps[this.sel];
    const play = q(this.el, '.kh-play') as HTMLButtonElement;
    play.disabled = !o || !!o.locked;
    play.textContent = o?.locked ? 'Yakında' : 'Oyna';
  }

  private buildStakes(): void {
    const wrap = q(this.el, '.kh-setup__stakes');
    wrap.innerHTML = STAKES.map(s => {
      const lockedLvl = this.profile.level < s.lvl;
      const poor = !lockedLvl && !this.stakeOk(s.v);
      return `<button class="kh-chip${s.v === this.stake ? ' is-on' : ''}${lockedLvl || poor ? ' is-locked' : ''}" data-act="stake" data-v="${s.v}">
        ${lockedLvl ? I.lock : `<img class="kh-chip__ico" src="${ASSETS.icon_coin}" alt="">`}<span class="kh-num">${fmt(s.v)}</span>${lockedLvl ? `<span class="kh-tag">Sv. ${s.lvl}</span>` : ''}</button>`;
    }).join('');
    q(this.el, '.kh-setup__win').innerHTML = `Kazanan alır <img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(this.stake * 2)}</b>`;
  }

  private select(i: number): void {
    this.sel = Math.max(0, Math.min(this.opps.length - 1, i));
    this.layoutCards();
  }

  private swipe(): void {
    const hero = q(this.el, '.kh-hero');
    let x0 = 0, id = -1;
    this.scope.on(hero, 'pointerdown', e => {
      const p = e as PointerEvent;
      x0 = p.clientX;
      id = p.pointerId;
    });
    this.scope.on(hero, 'pointerup', e => {
      const p = e as PointerEvent;
      if (p.pointerId !== id) return;
      id = -1;
      const dx = p.clientX - x0;
      if (Math.abs(dx) > 40) {
        const n = this.sel + (dx < 0 ? 1 : -1);
        this.swipedAt = performance.now();
        if (n >= 0 && n < this.opps.length) {
          this.ctx.sounds.whoosh();
          this.select(n);
        }
      }
    });
  }

  private act(a: string, b: HTMLElement): void {
    if (this.busy) return;
    const s = this.ctx.sounds;
    switch (a) {
      case 'prev':
      case 'next':
        s.whoosh();
        this.select(this.sel + (a === 'next' ? 1 : -1));
        return;
      case 'mode':
        s.tap();
        if (b.classList.contains('is-locked')) toast(this.ctx, `${b.textContent?.replace('Yakında', '').trim()} modu çok yakında`);
        return;
      case 'stake': {
        const v = Number(b.dataset.v);
        const st = STAKES.find(x => x.v === v)!;
        s.tap();
        if (this.profile.level < st.lvl) return toast(this.ctx, `Bu masa ${st.lvl}. seviyede açılır`);
        if (!this.stakeOk(v)) return toast(this.ctx, 'Bu masa için jetonun yetmiyor');
        this.stake = v;
        this.buildStakes();
        play(q(this.el, `.kh-setup__stakes [data-v="${v}"]`), [{transform: 'scale(.92)'}, {transform: 'scale(1.05)'}, {transform: 'scale(1)'}], {duration: 260, easing: EASE.out});
        return;
      }
      case 'play': {
        const o = this.opps[this.sel];
        if (!o || o.locked) return;
        s.tap();
        this.finish({type: 'play', opponentId: o.id, stake: this.stake, mode: '1v1'});
        return;
      }
      case 'settings':
      case 'rules':
        s.tap();
        this.finish({type: a});
        return;
      case 'daily':
        s.tap();
        if (b.dataset.ready === '1') this.finish({type: 'daily'});
        else toast(this.ctx, 'Bugünkü ödülünü aldın. Yarın yine gel!', I.check);
        return;
      case 'quests':
        s.tap();
        soon(this.ctx, 'Görevler', ASSETS.icon_star, 'Günlük görevler ve ödülleri çok yakında burada.');
        return;
      case 'shop':
        s.tap();
        soon(this.ctx, 'Mağaza', ASSETS.icon_chest, 'Kart arkaları, çuhalar ve pişti hareketleri yakında.');
        return;
      case 'profile':
        s.tap();
        soon(this.ctx, 'Profil', ASSETS.icon_trophy, 'İstatistiklerin ve başarımların yakında burada.');
        return;
    }
  }

  private finish(a: LobbyAction): void {
    const r = this.resolve;
    if (!r) return;
    this.resolve = null;
    this.busy = true;
    r(a);
  }

  /** Lobi selected stake (bir sonraki açılışta hatırlanır). */
  get selectedStake(): number {
    return this.stake;
  }

  private enter(): void {
    const g = (s: string) => q(this.el, s);
    play(g('.kh-lobby__photo'), [{transform: 'scale(1.06)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 700, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-topbar'), [{transform: 'translateY(-24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 80, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-lobby__corner'), [{transform: 'translateY(-24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 120, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-hero__stage'), [{transform: 'translateY(24px) scale(.94)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: 140, easing: EASE.spring, fill: 'backwards'});
    play(g('.kh-playcol'), [{transform: 'translateX(28px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, delay: 190, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-dock'), [{transform: 'translateY(24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 240, easing: EASE.out, fill: 'backwards'});
    const logo = this.el.querySelector('.kh-logo');
    if (logo) play(logo, [{transform: 'scale(.6) rotate(-6deg)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 520, delay: 260, easing: EASE.spring, fill: 'backwards'});
  }

  /** Çıkış (Oyna'ya basınca): kararıp büyüyerek kaybolur. */
  async leave(): Promise<void> {
    if (ANIM) {
      const a = this.el.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(1.04)'}], {duration: 260, easing: 'ease-in', fill: 'forwards'});
      await a.finished.catch(() => undefined);
    }
    this.destroy();
  }

  destroy(): void {
    this.scope.dispose();
    this.el.remove();
  }
}
