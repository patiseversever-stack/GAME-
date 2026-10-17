// Pencereler: Mola (duraklat), Ayarlar, Nasıl Oynanır, Günlük Ödül.
import type {HandOption, Settings} from './types';
import {ANIM, EASE, center, esc, fmt, play, q} from './dom';
import {ASSETS} from './assets';
import {I, suitSvg, type SuitKey} from './icons';
import {GAME_ICON} from './gameicons';
import {CI, deckCardHtml, deckOr} from './deckpv';
import {onAct, openModal, type Ctx, type ModalHandle} from './parts';
import {GAMES, GAME_INFO, HAND_INFO, HAND_LAYOUTS, type Game, type HandLayout} from '../game/types';
import {handPreviewHtml} from './handchooser';
import {BLOF} from '../game/blofAdapter';
import './blofmeta.css';

// ---------------------------------------------------------------- Mola
/** leave: "Masadan Kalk" onayındaki açıklama ve düğme (verilmezse maç bırakma metni; uygulama bahsi yazar). */
export function pause(ctx: Ctx, leave?: {sub: string; btn?: string}): Promise<'resume' | 'settings' | 'rules' | 'leave'> {
  return new Promise(res => {
    let m: ModalHandle;
    const done = (r: 'resume' | 'settings' | 'rules' | 'leave') => {
      m.close();
      res(r);
    };
    const list = `<div class="kh-pause__list">
      <button class="kh-btn kh-btn--1 kh-btn--lg kh-btn--block" data-act="resume">${I.play}Devam</button>
      <button class="kh-btn kh-btn--2 kh-btn--block" data-act="settings">${I.gear}Ayarlar</button>
      <button class="kh-btn kh-btn--2 kh-btn--block" data-act="rules">${I.book}Nasıl Oynanır</button>
      <button class="kh-btn kh-btn--3 kh-btn--block" data-act="leave">${I.exit}Masadan Kalk</button>
    </div>`;
    const confirm = `<div class="kh-confirm">
      <div class="kh-confirm__t">Masadan kalkıyor musun?</div>
      <div class="kh-confirm__s">${leave?.sub ?? 'Maçı bırakırsan bahsi kaybedersin.'}</div>
      <div class="kh-confirm__row">
        <button class="kh-btn kh-btn--2" data-act="back">Vazgeç</button>
        <button class="kh-btn kh-btn--3" data-act="sure">${I.exit}${leave?.btn ?? 'Maçı Bırak'}</button>
      </div></div>`;
    m = openModal(ctx, {cls: 'kh-pause', title: 'Çay Molası', body: `<div class="kh-pause__body">${list}</div>`, onX: () => done('resume')});
    const body = q(m.panel, '.kh-pause__body');
    const swap = (html: string) => {
      body.innerHTML = html;
      play(body, [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 220, easing: EASE.out});
    };
    onAct(m.scope, m.panel, a => {
      ctx.sounds.tap();
      if (a === 'leave') swap(confirm);
      else if (a === 'back') swap(list);
      else if (a === 'sure') done('leave');
      else if (a === 'resume' || a === 'settings' || a === 'rules') done(a);
    });
  });
}

// ---------------------------------------------------------------- Ayarlar
/** Kapanınca çözülür; "Nasıl Oynanır" seçilirse 'rules' ile (çağıran kuralları açar). */
export function settings(ctx: Ctx, s: Settings, onChange: (s: Settings) => void, version: string, hand?: HandOption, deck = 'yildizli'): Promise<void | 'rules'> {
  return new Promise(res => {
    const cur: Settings = {...s};
    let m: ModalHandle;
    const done = (r?: 'rules') => {
      m.close();
      res(r);
    };
    const tog = (k: 'sfx' | 'voice' | 'music' | 'haptics', label: string, icon: string) =>
      `<button class="kh-set__row kh-card" data-act="toggle" data-k="${k}" aria-pressed="${cur[k]}"><span class="kh-set__ico">${icon}</span><span class="kh-set__lbl">${label}</span><span class="kh-toggle"></span></button>`;
    let saved = hand?.value;
    let curHand: HandLayout = saved ?? 'group';
    // Blöf el düzeni: Gruplu | Klasik, her seçenekte gerçek destenle küçük önizleme
    const handRow = hand
      ? `<div class="kh-set__q kh-card"><div class="kh-set__qh"><span class="kh-set__ico">${GAME_ICON.blof}</span><span class="kh-set__lbl">Blöf el düzeni</span></div>
          <div class="kh-seg is-hand">${HAND_LAYOUTS.map(l =>
            `<button data-act="hand" data-v="${l}" aria-pressed="${curHand === l}"><span class="kh-hthumb is-${l}">${handPreviewHtml(l, deck)}</span><span>${HAND_INFO[l].name}</span></button>`).join('')}</div>
          ${hand.live ? '' : '<small class="kh-set__cap">Yeni elde geçerli olur</small>'}</div>`
      : '';
    const qs: [Settings['quality'], string][] = [['auto', 'Otomatik'], ['low', 'Düşük'], ['mid', 'Orta'], ['high', 'Yüksek']];
    m = openModal(ctx, {
      cls: 'kh-settings',
      title: 'Ayarlar',
      onX: () => done(),
      body: `<div class="kh-set__list">${tog('sfx', 'Ses efektleri', I.sfx)}${tog('voice', 'Konuşmalar', I.voice)}${tog('music', 'Müzik', I.music)}${tog('haptics', 'Titreşim', I.vibrate)}
        <div class="kh-set__q kh-card"><div class="kh-set__qh"><span class="kh-set__ico">${I.quality}</span><span class="kh-set__lbl">Grafik</span></div>
          <div class="kh-seg is-q" style="--n:4">${qs.map(([v, n]) => `<button data-act="quality" data-v="${v}" aria-pressed="${cur.quality === v}">${n}</button>`).join('')}</div></div>
        ${handRow}
        <button class="kh-set__row kh-card kh-set__rules" data-act="rules"><span class="kh-set__ico">${I.book}</span><span class="kh-set__lbl">Nasıl Oynanır</span><span class="kh-set__go">${I.chevR}</span></button></div>
        <div class="kh-set__foot"><button class="kh-btn kh-btn--1 kh-btn--lg kh-btn--block" data-act="ok">Tamam</button><span class="kh-set__ver">Kahvehane Pişti · Sürüm ${esc(version)}</span></div>`,
    });
    onAct(m.scope, m.panel, (a, b) => {
      ctx.sounds.tap();
      if (a === 'ok') return done();
      if (a === 'rules') return done('rules');
      if (a === 'toggle') {
        const k = b.dataset.k as 'sfx' | 'voice' | 'music' | 'haptics';
        cur[k] = !cur[k];
        b.setAttribute('aria-pressed', String(cur[k]));
        onChange({...cur});
      } else if (a === 'hand') {
        const v = b.dataset.v as HandLayout;
        if (v === saved) return;
        saved = v;
        curHand = v;
        m.panel.querySelectorAll('[data-act=hand]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        hand?.onChange(v);
      } else if (a === 'quality') {
        const v = b.dataset.v as Settings['quality'];
        if (v === cur.quality) return;
        cur.quality = v;
        m.panel.querySelectorAll('[data-act=quality]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        onChange({...cur});
      }
    });
  });
}

// ---------------------------------------------------------------- Nasıl Oynanır
// Mini iskambil: dört renk takım (♥ kırmızı, ♦ sarı, ♣ yeşil, ♠ mavi), takımlar SVG (yazı tipinden bağımsız).
const SK: Record<string, SuitKey> = {'♥': 'h', '♦': 'd', '♣': 'c', '♠': 's'};
const mc = (r: string, s: string, cls = '', style = '') =>
  `<span class="kh-mc is-${SK[s]} ${cls}" style="${style}"><span class="kh-mc__r">${r}${suitSvg(SK[s])}</span><span class="kh-mc__s">${suitSvg(SK[s])}</span></span>`;
const fan = (cards: string[]) =>
  `<span class="kh-pile">${cards.map((c, i) => c.replace('style="', `style="transform:rotate(${(i - (cards.length - 1) / 2) * 11}deg) translateX(${(i - (cards.length - 1) / 2) * 6}px);`)).join('')}</span>`;

/** Adım listesi: art (varsa) + başlık + açıklama; art'sız adım tam genişlik. */
interface RuleStep {
  art: string;
  t: string;
  d: string;
}
const stepsHtml = (steps: RuleStep[]) =>
  steps
    .map((s, i) => `<div class="kh-step kh-card${s.art ? '' : ' is-wide'}">${s.art ? `<div class="kh-step__art">${s.art}</div>` : ''}<div><div class="kh-step__hd"><span class="kh-step__n">${i + 1}</span><span class="kh-step__t">${s.t}</span></div><div class="kh-step__d">${s.d}</div></div></div>`)
    .join('');

/** Blöf'te söylenen değer: "3 tane 7" balonu. */
const call = (n: string, r: string) => `<span class="kh-call"><b>${n}</b><i>tane</i><b>${r}</b></span>`;

/**
 * Nasıl Oynanır. Blöf motoru varsa iki sekme (Pişti | Blöf), yoksa yalnız Pişti sayfası (eskisi gibi).
 * game: ilk açılan sekme (oyun içinden açılınca o oyunun kuralları).
 */
export function rules(ctx: Ctx, game: Game = 'pisti', deck = 'yildizli'): Promise<void> {
  return new Promise(res => {
    // kapalı kart: masada kullanılan kuşanılmış destenin gerçek arka yüzü (pişmiş deste şeridinden dilim)
    const back = (style = '') => deckCardHtml(deckOr(deck), CI.back, 'kh-mcb', style);
    let m: ModalHandle;
    const done = () => {
      m.close();
      res();
    };
    const arrow = '<span class="kh-step__arrow">➜</span>';
    const pisti: RuleStep[] = [
      {art: `${fan([back(), back(), mc('7', '♦')])}${arrow}${mc('7', '♠', 'is-glow')}`, t: 'Aynısını at, topla', d: 'Ortadaki <b>üst kartın aynısını</b> atarsan yığının tamamı senin.'},
      {art: `${fan([mc('K', '♥'), mc('4', '♣'), mc('9', '♦')])}${arrow}${mc('J', '♣', 'is-glow')}`, t: 'Vale hepsini alır', d: '<b>Vale</b> atınca ortadaki bütün kartları toplarsın.'},
      {art: `${mc('5', '♥')}${arrow}${mc('5', '♣', 'is-glow')}<span class="kh-step__badge">+10</span>`, t: 'Pişti!', d: 'Tek kartın üstüne aynısı: <b>10 puan</b>. Vale üstüne vale: <b>20 puan</b>.'},
      {art: '', t: 'Puanlar', d: `<div class="kh-pts">${[['As', '1'], ['Vale', '1'], ['Sinek 2', '2'], ['Karo 10', '3'], ['En çok kart', '3'], ['Pişti', '10'], ['Vale pişti', '20'], ['Kazanan', 'en yüksek']]
        .map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`},
      {art: '', t: 'Uzun maç: 51 · 101 · 151', d: 'Eller art arda dağıtılır, puanlar toplanır; dağıtan her el sırayla değişir. Bir elin sonunda hedefi geçen olursa <b>en yüksek toplam</b> kazanır. En yüksekte eşitlik varsa <b>bir el daha</b> oynanır.'},
    ];
    const blof: RuleStep[] = [
      {art: `${fan([back(), back(), back()])}${arrow}${call('3', '7')}`, t: 'Söyle ve kapalı at', d: 'Turu açan bir <b>değer</b> söyler, <b>1–4 kartı kapalı</b> atar. Doğruyu söylemek şart değil!'},
      {art: `${fan([back(), back()])}${arrow}<span class="kh-call is-pass"><b>Pas</b></span>`, t: 'Aynısı ya da Pas', d: 'Sıradakiler <b>aynı değeri</b> söyleyip 1–4 kart atar ya da <b>Pas</b> der. Herkes pas derse yığın kalkar.'},
      {art: `${fan([back(), back(), back()])}${arrow}${mc('K', '♥', 'is-glow')}<span class="kh-step__badge is-red">BLÖF!</span>`, t: 'Blöf de, yakala', d: 'Her atıştan sonra <b>5 sn</b> içinde “Blöf!” de. <b>Yalansa</b> yığını atan, <b>doğruysa</b> sen alırsın.'},
      {art: `${mc('A', '♠', 'is-glow')}<span class="kh-step__crown">${I.crown}</span>`, t: 'İlk bitiren kazanır', d: 'Kartlarını <b>ilk bitiren</b> kazanır. Son karta da blöf denebilir! Eşlide takım birlikte kazanır.'},
      {art: '', t: 'Seri: 3 El · 5 El', d: 'Her elde bitiren <b>0</b>, diğerleri <b>elinde kalan kart kadar ceza</b> alır (eşlide kaybeden takımın iki oyuncusunun toplamı). Seri sonunda <b>en az ceza</b> kazanır; eşitlikte çok el kazanan. Sonraki eli en çok kartı kalan açar.'},
    ];
    const both = BLOF.available();
    let cur: Game = both ? game : 'pisti';
    const tabs = both
      ? `<div class="kh-gsw kh-rules__tabs" role="tablist" aria-label="Oyun" data-g="${cur}"><i class="kh-gsw__ind"></i>${GAMES.map(g =>
        `<button class="kh-gbtn" role="tab" data-act="tab" data-g="${g}">${GAME_ICON[g]}<span>${GAME_INFO[g].name}</span></button>`).join('')}</div>`
      : '';
    const foot = (g: Game) => (g === 'pisti' ? `${I.hand}Kartına bir kez dokun ya da yukarı kaydır.` : `${I.hand}Kartlarına dokunup seç, sonra “at”a bas.`);
    m = openModal(ctx, {
      cls: both ? 'kh-rules has-tabs' : 'kh-rules',
      title: 'Nasıl Oynanır',
      onX: done,
      body: `${tabs}<div class="kh-steps" data-p="pisti"${cur === 'pisti' ? '' : ' hidden'}>${stepsHtml(pisti)}</div>${both ? `<div class="kh-steps" data-p="blof"${cur === 'blof' ? '' : ' hidden'}>${stepsHtml(blof)}</div>` : ''}
        <div class="kh-rules__foot"><span>${foot(cur)}</span><button class="kh-btn kh-btn--1 kh-btn--lg kh-btn--block" data-act="ok">Anladım</button></div>`,
    });
    const enter = (box: Element) => box.querySelectorAll<HTMLElement>('.kh-step').forEach((s, i) =>
      play(s, [{transform: 'translateX(-20px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: 120 + i * 70, easing: EASE.out, fill: 'backwards'}));
    const mark = (animate: boolean) => {
      const sw = m.panel.querySelector<HTMLElement>('.kh-gsw');
      if (sw) {
        sw.dataset.g = cur;
        q(sw, '.kh-gsw__ind').style.transform = `translateX(${GAMES.indexOf(cur) * 100}%)`;
        sw.querySelectorAll<HTMLElement>('.kh-gbtn').forEach(b => {
          b.classList.toggle('is-on', b.dataset.g === cur);
          b.setAttribute('aria-selected', String(b.dataset.g === cur));
        });
      }
      m.panel.querySelectorAll<HTMLElement>('.kh-steps').forEach(p => {
        const on = p.dataset.p === cur;
        p.hidden = !on;
        if (on && animate) enter(p);
      });
      q(m.panel, '.kh-rules__foot span').innerHTML = foot(cur);
    };
    mark(false);
    enter(q(m.panel, `.kh-steps[data-p="${cur}"]`));
    onAct(m.scope, m.panel, (a, b) => {
      if (a === 'tab') {
        const g = b.dataset.g as Game;
        if (g === cur) return;
        ctx.sounds.tap();
        cur = g;
        mark(true);
        return;
      }
      if (a !== 'ok') return;
      ctx.sounds.tap();
      done();
    });
  });
}

// ---------------------------------------------------------------- Günlük Ödül
/**
 * day: bugün kaçıncı gün (1..7), rewards: 7 günün jetonları. "Topla" → patlama + jetonlar bakiyeye uçar.
 * coinTarget: varsa jetonların uçacağı nokta (lobideki bakiye) ve oraya artış uygulayan geri çağrı.
 */
export function daily(ctx: Ctx, day: number, rewards: number[], target?: {at(): {x: number; y: number}; add(n: number): void}): Promise<number> {
  return new Promise(res => {
    const d = Math.max(1, Math.min(7, day));
    const amount = rewards[d - 1] ?? 0;
    const next = rewards[d % 7] ?? rewards[0] ?? 0;
    let claimed = false;
    let m: ModalHandle;
    const done = () => {
      m.close();
      res(claimed ? amount : 0);
    };
    const tiles = rewards
      .slice(0, 7)
      .map((v, i) => {
        const n = i + 1, big = n === 7;
        const st = n < d ? ' is-claimed' : n === d ? ' is-today' : '';
        return `<div class="kh-day kh-card${big ? ' is-big' : ''}${st}" data-day="${n}">
          ${n === d ? '<span class="kh-tag">Bugün</span>' : ''}
          <span class="kh-day__n">${n}. Gün</span>
          <img class="kh-day__ico" src="${big ? ASSETS.icon_chest : ASSETS.icon_coin}" alt="">
          <b class="kh-day__v kh-num">${fmt(v)}</b>
          <i class="kh-day__check">${I.check}</i></div>`;
      })
      .join('');
    m = openModal(ctx, {
      cls: 'kh-daily',
      title: 'Günlük Ödül',
      onX: done,
      body: `<div class="kh-daily__sub">Her gün uğra, ödülün büyüsün.<br>7. gün sandık seni bekliyor!</div>
        <div class="kh-daily__row">${tiles}</div>
        <div class="kh-daily__foot"><button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-shine" data-act="claim">Topla</button><div class="kh-daily__next"></div></div>`,
    });
    m.panel.querySelectorAll<HTMLElement>('.kh-day').forEach((t, i) =>
      play(t, [{transform: 'translateY(18px) scale(.9)', opacity: 0}, {transform: t.classList.contains('is-today') ? 'translateY(calc(var(--u) * -.3))' : 'none', opacity: 1}], {duration: 340, delay: 120 + i * 50, easing: EASE.spring, fill: 'backwards'}));
    const today = q(m.panel, '.kh-day.is-today');
    onAct(m.scope, m.panel, async (a, b) => {
      if (a === 'ok') {
        ctx.sounds.tap();
        return done();
      }
      if (a !== 'claim' || claimed) return;
      claimed = true;
      (b as HTMLButtonElement).disabled = true;
      ctx.sounds.reward();
      play(today, [{transform: 'translateY(calc(var(--u) * -.3)) scale(1)'}, {transform: 'translateY(calc(var(--u) * -.6)) scale(1.14)'}, {transform: 'translateY(calc(var(--u) * -.3)) scale(1)'}], {duration: 420, easing: EASE.out});
      const c = center(q(today, '.kh-day__ico'));
      ctx.fx.flash(0.35, 260);
      ctx.fx.burst(c, {coins: 12, confetti: 18, power: 0.75});
      const check = q(today, '.kh-day__check');
      today.classList.add('is-claimed');
      play(check, [{transform: 'scale(0) rotate(-30deg)'}, {transform: 'scale(1.2) rotate(0)', offset: 0.7}, {transform: 'scale(1)'}], {duration: 380, delay: 200, easing: EASE.out, fill: 'backwards'});
      const nx = q(m.panel, '.kh-daily__next');
      nx.innerHTML = `Yarın gel: <b>+${fmt(next)} jeton</b>`;
      play(nx, [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}], {duration: 300, delay: 500, easing: EASE.out, fill: 'backwards'});
      if (target) {
        const to = target.at();
        let added = 0;
        const n = 8;
        await ctx.fx.flyCoins(c, to, n, i => {
          ctx.sounds.coin(1);
          const add = i === n - 1 ? amount - added : Math.round(amount / n);
          added += add;
          target.add(add);
        });
      } else ctx.sounds.coin(4);
      if (!m.scope.alive) return;
      const btn = b as HTMLButtonElement;
      btn.disabled = false;
      btn.dataset.act = 'ok';
      btn.classList.remove('kh-shine');
      btn.classList.replace('kh-btn--1', 'kh-btn--5');
      btn.innerHTML = 'Harika!';
      if (ANIM) play(btn, [{transform: 'scale(.9)'}, {transform: 'scale(1)'}], {duration: 260, easing: EASE.spring});
    });
  });
}
