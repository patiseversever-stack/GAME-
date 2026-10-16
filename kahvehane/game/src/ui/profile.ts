// KOLEKSİYON / PROFİL: kart başlığı (çerçeveli avatar, ad düzenleme, seviye + XP), karakter ve çerçeve seçimi,
// istatistikler (genel + moda göre kazanma oranı), sahip olunan desteler/masalar/efektler (kuşan), koleksiyon ilerlemesi.
import './collection.css';
import {CATALOG, KIND_INFO, type ItemKind} from '../game/catalog';
import {ROSTER, charById} from '../game/roster';
import {MODE_INFO, type Mode} from '../game/types';
import {ANIM, EASE, Scope, bump, clamp, countUp, esc, fmt, h, play, q, shake} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {charAvatarHtml, gemHtml, onAct, rarityHtml, toast} from './parts';
import {fanHtml, frameJob, fxStillHtml, mountFxStill, tableSceneHtml} from './previews';
import {setPrice, shopSets} from './sets';
import {deckOr} from './deckpv';
import {haptic} from '../platform/bridge';
import {shortName, type Page, type Shell} from './lobby';

export class CollectionPage implements Page {
  readonly el = h('div', 'kh-page kh-coll');
  private scope = new Scope();
  private inner: HTMLElement;
  private editing = false;

  constructor(private shell: Shell) {
    this.el.innerHTML = `<div class="kh-coll__in kh-scroll"></div>`;
    this.inner = q(this.el, '.kh-coll__in');
    onAct(this.scope, this.el, (a, b) => this.act(a, b));
    let raf = 0;
    this.scope.on(this.inner, 'scroll', () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), this.fillRows()));
    }, {passive: true});
    this.scope.add(() => cancelAnimationFrame(raf));
    // içerik ilk show()'da kurulur
  }

  private queued = false;
  /** Karo kuşağı: yeniden kurulumda eski sıradaki işler boşa düşsün */
  private gen = 0;
  /** Henüz doldurulmamış koleksiyon satırları: ekrana ~1 boy yaklaşınca, kare başına bir satır */
  private rows: HTMLElement[] = [];
  private rowsReady = false;
  private rowQueued = false;
  private rowHtml: (row: HTMLElement) => void = () => undefined;
  private fillRows(): void {
    if (!this.rowsReady || this.rowQueued || !this.rows.length) return;
    this.rowQueued = true;
    frameJob(() => {
      this.rowQueued = false;
      const row = this.rows[0];
      if (!row || !row.isConnected) return void (this.rows = []);
      const view = this.inner.getBoundingClientRect();
      if (view.height && row.getBoundingClientRect().top > view.bottom + view.height * 0.9) return;
      this.rows.shift();
      this.rowHtml(row);
      this.fillRows();
    });
  }
  /** Son kurulumdaki profil durumu: aynıysa sekme dönüşünde sayfa yeniden kurulmaz. */
  private sig = '';

  show(): void {
    const need = !this.editing && (!this.sig || this.sig !== JSON.stringify(this.shell.profile.data));
    // içerik bir sonraki karede kurulur (sayfa geçişi 60 ms gecikmeli ve saydam başlar: görünmez); tıklama görevi bölünür
    if (need && ANIM) {
      if (this.queued) return;
      this.queued = true;
      frameJob(() => {
        this.queued = false;
        if (!this.scope.alive) return;
        this.render(470);
        this.enter();
      }, true);
      return;
    }
    if (need) this.render(0);
    this.enter();
  }

  /** Giriş: kart ve ilk bölümler yaylanır, sayaçlar sayar (yalnız ilk ekrandaki bölümler: her biri ayrı katman) */
  private enter(): void {
    const g = (s: string) => this.el.querySelector(s);
    const card = g('.kh-pcard');
    if (card) play(card, [{transform: 'translateY(-16px) scale(.96)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, easing: EASE.spring, fill: 'backwards'});
    this.el.querySelectorAll('.kh-coll__sec').forEach((s, i) =>
      i < 2 && play(s, [{transform: 'translateY(24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 80 + i * 70, easing: EASE.out, fill: 'backwards'}));
    // sayaçlar yeniden sayar
    this.el.querySelectorAll<HTMLElement>('.kh-stat b[data-v]').forEach(b => countUp(this.scope, b, 0, Number(b.dataset.v), 700, n => (b.dataset.pct ? `%${n}` : fmt(n))));
    this.el.querySelectorAll<HTMLElement>('.kh-mstat__bar i').forEach((b, i) =>
      play(b, [{transform: 'scaleX(0)'}, {transform: b.style.transform || 'scaleX(0)'}], {duration: 700, delay: 200 + i * 90, easing: EASE.out, fill: 'backwards'}));
  }

  private render(delay = 0): void {
    const p = this.shell.profile;
    const d = p.data;
    this.sig = JSON.stringify(d);
    const me = charById(d.char ?? 'dursun');
    const st = d.stats;
    const rate = st.played ? Math.round((st.won / st.played) * 100) : 0;
    const k = clamp(d.xp / Math.max(1, p.xpNext), 0, 1);
    const owned = CATALOG.filter(i => p.owns(i.kind, i.id)).length;
    const frames = CATALOG.filter(i => i.kind === 'frame');
    const sets = shopSets().map(x => ({s: x, done: !setPrice(x, (k, id) => p.owns(k, id)).missing.length}));
    const setsDone = sets.filter(x => x.done).length;
    const kinds: ItemKind[] = ['deck', 'table', 'fx'];
    this.inner.innerHTML = `
      <section class="kh-panel kh-pcard" style="--c:${me.color}">
        <i class="kh-pcard__glow"></i>
        <div class="kh-pcard__ava">${charAvatarHtml(me, d.equipped.frame, 'kh-pcard__img')}${gemHtml(d.level)}</div>
        <div class="kh-pcard__info">
          <div class="kh-pcard__namebox">
            <span class="kh-pcard__name">${esc(d.name)}</span>
            <input class="kh-pcard__input" type="text" maxlength="16" value="${esc(d.name)}" autocomplete="off" spellcheck="false" enterkeyhint="done">
            <button class="kh-iconbtn kh-pcard__edit" data-act="edit" aria-label="Adını değiştir">${I.pencil}</button>
          </div>
          <div class="kh-pcard__title">${esc(me.name)} · ${esc(me.title)}</div>
          <div class="kh-pcard__lvl"><span class="kh-xp kh-pcard__xp"><i class="kh-xp__fill" style="transform:scaleX(${k.toFixed(3)})"></i></span>
            <small><b>Sv. ${d.level}</b> · ${fmt(d.xp)} / ${fmt(p.xpNext)} XP</small></div>
        </div>
      </section>

      <section class="kh-coll__sec">
        <div class="kh-coll__hd"><span class="kh-label">Karakterin</span><small>Dokun, avatarın olsun</small></div>
        <div class="kh-pick">${ROSTER.map(c => {
          const own = p.owns('char', c.id), on = d.char === c.id;
          return `<button class="kh-pick__it${on ? ' is-on' : ''}${own ? '' : ' is-locked'}" data-act="char" data-id="${c.id}" data-spring>
            ${charAvatarHtml(c, on ? d.equipped.frame : 'standart', own ? '' : 'is-locked')}
            <b>${esc(shortName(c))}</b>${own ? '' : `<span class="kh-pick__price"><img src="${ASSETS.icon_coin}" alt="">${fmt(c.price)}</span>`}
            ${on ? `<span class="kh-pick__on">${I.check}</span>` : ''}</button>`;
        }).join('')}</div>
      </section>

      <section class="kh-coll__sec">
        <div class="kh-coll__hd"><span class="kh-label">Çerçeven</span><small>${frames.filter(f => p.owns('frame', f.id)).length}/${frames.length}</small></div>
        <div class="kh-pick is-frames"></div>
      </section>

      <section class="kh-coll__sec">
        <div class="kh-coll__hd"><span class="kh-label">İstatistikler</span>${st.streak >= 2 ? `<span class="kh-streak">${I.flame}${st.streak} seri</span>` : ''}</div>
        <div class="kh-stats">
          ${stat('Oynanan', st.played, I.cards)}${stat('Galibiyet', st.won, I.crown)}${stat('Kazanma', rate, I.star, true)}
          ${stat('Pişti', st.pisti, I.sparkle)}${stat('Vale Pişti', st.valePisti, I.swords)}${stat('En İyi Seri', st.bestStreak, I.flame)}
        </div>
        ${st.played === 0 ? `<div class="kh-empty">${I.cards}<span>Henüz el oynamadın. İlk zaferin seni bekliyor!</span></div>` : ''}
        <div class="kh-mstats"${st.played === 0 ? ' hidden' : ''}>${(['1v1', '4', 'esli'] as Mode[]).map(m => {
          const b = st.byMode[m];
          const r = b.played ? b.won / b.played : 0;
          return `<div class="kh-mstat"><span class="kh-mstat__n">${MODE_INFO[m].name}</span><span class="kh-mstat__bar"><i style="transform:scaleX(${r.toFixed(3)})"></i></span>
            <span class="kh-mstat__v"><b>${b.won}</b>/${b.played}</span></div>`;
        }).join('')}</div>
      </section>

      <section class="kh-coll__sec">
        <div class="kh-coll__hd"><span class="kh-label">Koleksiyon</span><small><b>${owned}</b>/${CATALOG.length} parça</small></div>
        <div class="kh-cprog"><i style="transform:scaleX(${(owned / CATALOG.length).toFixed(3)})"></i></div>
        ${sets.length ? `<button class="kh-csets" data-act="sets">${I.gift}<span><b>Setler</b> · ${setsDone}/${sets.length} tamam</span><span class="kh-csets__dots">${sets.map(x => `<i class="${x.done ? 'is-on' : ''}" style="--a:${x.s.a}"></i>`).join('')}</span>${I.chevR}</button>` : ''}
        ${kinds.map(kd => {
          const list = CATALOG.filter(i => i.kind === kd);
          const n = list.filter(i => p.owns(kd, i.id)).length;
          return `<div class="kh-ckind"><div class="kh-ckind__t"><span>${KIND_INFO[kd].plural}</span><span class="kh-ckind__bar"><i style="transform:scaleX(${(n / Math.max(1, list.length)).toFixed(3)})"></i></span><b>${n}/${list.length}</b></div>
          <div class="kh-ckind__row" data-kind="${kd}"></div></div>`;
        }).join('')}
      </section>
      <button class="kh-btn kh-btn--2 kh-btn--block kh-coll__shop" data-act="toshop">${I.bag}Markete Git</button>`;
    // çerçeve seçimi ve koleksiyon karoları sayfa açılışından SONRA, kare başına bir parça (açılış görevi küçük kalsın:
    // her çerçeve iki büyük SVG katmanı, ~30 karo + önizlemeler)
    const gen = ++this.gen;
    const pick = q(this.inner, '.kh-pick.is-frames');
    const frameHtml = (f: (typeof frames)[number]): string => {
      const own = p.owns('frame', f.id), on = d.equipped.frame === f.id;
      return `<button class="kh-pick__it${on ? ' is-on' : ''}${own ? '' : ' is-locked'}" data-act="frame" data-id="${f.id}" data-spring>
            ${charAvatarHtml(me, f.id, own ? '' : 'is-dim')}<b>${esc(f.name)}</b>${own ? '' : `<span class="kh-pick__lock">${I.lock}</span>`}
            ${on ? `<span class="kh-pick__on">${I.check}</span>` : ''}</button>`;
    };
    // sayfa giriş kayması sürerken ana iş parçacığı boş kalsın: çerçeveler kayma bitince, karolar ekrana yaklaştıkça.
    // Yerinde yeniden kurulumda (kuşanma, ad) görünen kısım aynı karede dolar: boş kare/yanıp sönme olmasın.
    const sync = delay === 0;
    if (sync) pick.innerHTML = frames.map(frameHtml).join('');
    else window.setTimeout(() => {
      if (gen !== this.gen) return;
      for (let i = 0; i < frames.length; i += 4)
        frameJob(() => gen === this.gen && pick.isConnected && pick.insertAdjacentHTML('beforeend', frames.slice(i, i + 4).map(frameHtml).join('')));
      this.rowsReady = true;
      this.fillRows();
    }, delay);
    this.rowsReady = sync;
    this.rows = Array.from(this.inner.querySelectorAll<HTMLElement>('.kh-ckind__row'));
    this.rowHtml = (row: HTMLElement): void => {
        const kd = row.dataset.kind as ItemKind;
        row.innerHTML = CATALOG.filter(i => i.kind === kd).map(it => {
          const own = p.owns(kd, it.id), on = d.equipped[kd as 'deck' | 'table' | 'fx'] === it.id;
          return `<button class="kh-ctile is-${it.rarity}${own ? '' : ' is-locked'}${on ? ' is-on' : ''}" data-act="${own ? 'use' : 'shop'}" data-k="${kd}" data-id="${it.id}" data-spring>
              <span class="kh-ctile__pv is-${kd}">${tilePv(kd, it.id, deckOr(d.equipped.deck))}</span>
              <span class="kh-ctile__n">${esc(it.name)}</span>
              ${on ? `<span class="kh-ctile__on">${I.check}</span>` : own ? '' : `<span class="kh-ctile__price"><img src="${ASSETS.icon_coin}" alt="">${fmt(it.price)}</span>`}
              ${rarityHtml(it.rarity, 'kh-ctile__rar')}</button>`;
        }).join('');
        // efekt kareleri görünür olunca, boşta (deste/masa önizlemeleri HTML'le hazır: pişmiş kartlar + swatch)
        row.querySelectorAll<HTMLElement>('[data-fx]').forEach(box => mountFxStill(box, box.dataset.fx!));
    };
    if (sync) {
      const view = this.inner.getBoundingClientRect();
      while (this.rows.length && this.rows[0].getBoundingClientRect().top < view.bottom) this.rowHtml(this.rows.shift()!);
      this.fillRows();
    }
    const input = q<HTMLInputElement>(this.inner, '.kh-pcard__input');
    this.scope.on(input, 'keydown', e => {
      if ((e as KeyboardEvent).key === 'Enter') this.saveName();
    });
    this.scope.on(input, 'blur', () => this.editing && this.saveName());
  }

  private saveName(): void {
    const input = q<HTMLInputElement>(this.inner, '.kh-pcard__input');
    const v = input.value.trim().replace(/\s+/g, ' ').slice(0, 16);
    this.editing = false;
    this.inner.querySelector('.kh-pcard')?.classList.remove('is-editing');
    if (v && v !== this.shell.profile.data.name) {
      this.shell.profile.data.name = v;
      this.shell.profile.save();
      this.shell.ctx.sounds.reward();
      toast(this.shell.ctx, `Merhaba ${v}!`, I.pencil);
    }
    this.render();
    bump(q(this.inner, '.kh-pcard__name'), 1.12);
  }

  private act(a: string, b: HTMLElement): void {
    const ctx = this.shell.ctx;
    const p = this.shell.profile;
    switch (a) {
      case 'edit': {
        ctx.sounds.tap();
        if (this.editing) return this.saveName();
        this.editing = true;
        const card = q(this.inner, '.kh-pcard');
        card.classList.add('is-editing');
        const input = q<HTMLInputElement>(card, '.kh-pcard__input');
        input.focus();
        input.select();
        q(card, '.kh-pcard__edit').innerHTML = I.check;
        return;
      }
      case 'char': {
        const id = b.dataset.id!;
        if (!p.owns('char', id)) {
          ctx.sounds.tap();
          shake(b, 0.6);
          toast(ctx, `${charById(id).name} markette seni bekliyor`, I.bag);
          this.shell.goto('shop', 'char');
          return;
        }
        if (p.data.char === id) return;
        ctx.sounds.reward();
        haptic('success');
        p.equip('char', id);
        this.shell.cosmetics('char', id);
        this.render();
        const it = this.inner.querySelector(`.kh-pick__it[data-id="${id}"] .kh-ava`);
        if (it) play(it, [{transform: 'scale(.6) rotate(-20deg)'}, {transform: 'scale(1.15) rotate(5deg)', offset: 0.6}, {transform: 'none'}], {duration: 460, easing: EASE.out});
        bump(q(this.inner, '.kh-pcard__img'), 1.15);
        toast(ctx, `Avatarın artık ${charById(id).name}!`, I.check);
        return;
      }
      case 'frame': {
        const id = b.dataset.id!;
        if (!p.owns('frame', id)) {
          ctx.sounds.tap();
          shake(b, 0.6);
          this.shell.goto('shop', 'frame');
          return;
        }
        if (p.data.equipped.frame === id) return;
        ctx.sounds.reward();
        haptic('light');
        p.equip('frame', id);
        this.shell.cosmetics('frame', id);
        this.render();
        bump(q(this.inner, '.kh-pcard__img'), 1.15);
        return;
      }
      case 'use': {
        const kd = b.dataset.k as ItemKind, id = b.dataset.id!;
        if (p.data.equipped[kd as 'deck' | 'table' | 'fx'] === id) return;
        ctx.sounds.reward();
        haptic('light');
        p.equip(kd, id);
        this.shell.cosmetics(kd, id);
        this.render();
        const t = this.inner.querySelector(`.kh-ctile[data-k="${kd}"][data-id="${id}"]`);
        if (t) bump(t, 1.08);
        toast(ctx, `${KIND_INFO[kd].name} kuşanıldı`, I.check);
        return;
      }
      case 'shop':
        this.shell.goto('shop', b.dataset.k);
        return;
      case 'toshop':
        this.shell.goto('shop');
        return;
      case 'sets':
        ctx.sounds.tap();
        this.shell.goto('shop', 'set');
        return;
    }
  }

  destroy(): void {
    this.scope.dispose();
    this.el.remove();
  }
}

/** Koleksiyon karosu önizlemesi: deste yelpazesi · masan (kuşanılı destenle) · efekt (masanın üstünde, sonradan kurulur). */
function tilePv(kd: ItemKind, id: string, deck: string): string {
  if (kd === 'deck') return fanHtml(id, 3);
  if (kd === 'table') return tableSceneHtml(id, {deck, size: 'tile'});
  if (kd === 'fx') return fxStillHtml(id, 'kh-ctile__fx');
  return '';
}

function stat(label: string, v: number, icon: string, pct = false): string {
  return `<div class="kh-stat kh-card"><span class="kh-stat__ico">${icon}</span><b class="kh-num" data-v="${v}"${pct ? ' data-pct="1"' : ''}>${pct ? `%${v}` : fmt(v)}</b><small>${label}</small></div>`;
}

