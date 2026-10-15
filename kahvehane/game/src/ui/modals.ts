// Pencereler: Mola (duraklat), Ayarlar, Nasıl Oynanır, Günlük Ödül.
import type {Settings} from './types';
import {ANIM, EASE, center, esc, fmt, play, q} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {onAct, openModal, type Ctx, type ModalHandle} from './parts';

// ---------------------------------------------------------------- Mola
export function pause(ctx: Ctx): Promise<'resume' | 'settings' | 'rules' | 'leave'> {
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
      <div class="kh-confirm__s">Bu el yarıda kalır, bahsin sana iade edilir.</div>
      <div class="kh-confirm__row">
        <button class="kh-btn kh-btn--2" data-act="back">Vazgeç</button>
        <button class="kh-btn kh-btn--3" data-act="sure">${I.exit}Kalk</button>
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
export function settings(ctx: Ctx, s: Settings, onChange: (s: Settings) => void, version: string): Promise<void> {
  return new Promise(res => {
    const cur: Settings = {...s};
    let m: ModalHandle;
    const done = () => {
      m.close();
      res();
    };
    const tog = (k: 'sfx' | 'voice' | 'music' | 'haptics', label: string, icon: string) =>
      `<button class="kh-set__row kh-card" data-act="toggle" data-k="${k}" aria-pressed="${cur[k]}"><span class="kh-set__ico">${icon}</span><span class="kh-set__lbl">${label}</span><span class="kh-toggle"></span></button>`;
    const qs: [Settings['quality'], string][] = [['auto', 'Otomatik'], ['low', 'Düşük'], ['mid', 'Orta'], ['high', 'Yüksek']];
    m = openModal(ctx, {
      cls: 'kh-settings',
      title: 'Ayarlar',
      onX: done,
      body: `<div class="kh-set__list">${tog('sfx', 'Ses efektleri', I.sfx)}${tog('voice', 'Konuşmalar', I.voice)}${tog('music', 'Müzik', I.music)}${tog('haptics', 'Titreşim', I.vibrate)}
        <div class="kh-set__q kh-card"><div class="kh-set__qh"><span class="kh-set__ico">${I.quality}</span><span class="kh-set__lbl">Grafik</span></div>
          <div class="kh-seg">${qs.map(([v, n]) => `<button data-act="quality" data-v="${v}" aria-pressed="${cur.quality === v}">${n}</button>`).join('')}</div></div></div>
        <div class="kh-set__foot"><button class="kh-btn kh-btn--1 kh-btn--lg kh-btn--block" data-act="ok">Tamam</button><span class="kh-set__ver">Kahvehane Pişti · Sürüm ${esc(version)}</span></div>`,
    });
    onAct(m.scope, m.panel, (a, b) => {
      ctx.sounds.tap();
      if (a === 'ok') return done();
      if (a === 'toggle') {
        const k = b.dataset.k as 'sfx' | 'voice' | 'music' | 'haptics';
        cur[k] = !cur[k];
        b.setAttribute('aria-pressed', String(cur[k]));
        onChange({...cur});
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
const RED = new Set(['♥', '♦']);
const mc = (r: string, s: string, cls = '', style = '') =>
  `<span class="kh-mc${RED.has(s) ? ' is-red' : ''} ${cls}" style="${style}"><span class="kh-mc__r">${r}<small>${s}</small></span><span class="kh-mc__s">${s}</span></span>`;
const back = (style = '') => `<span class="kh-mc is-back" style="${style}"></span>`;
const fan = (cards: string[]) =>
  `<span class="kh-pile">${cards.map((c, i) => c.replace('style="', `style="transform:rotate(${(i - (cards.length - 1) / 2) * 11}deg) translateX(${(i - (cards.length - 1) / 2) * 6}px);`)).join('')}</span>`;

export function rules(ctx: Ctx): Promise<void> {
  return new Promise(res => {
    let m: ModalHandle;
    const done = () => {
      m.close();
      res();
    };
    const arrow = '<span class="kh-step__arrow">➜</span>';
    const steps = [
      {art: `${fan([back(), back(), mc('7', '♦')])}${arrow}${mc('7', '♠', 'is-glow')}`, t: 'Aynısını at, topla', d: 'Ortadaki <b>üst kartın aynısını</b> atarsan yığının tamamı senin.'},
      {art: `${fan([mc('K', '♥'), mc('4', '♣'), mc('9', '♦')])}${arrow}${mc('J', '♣', 'is-glow')}`, t: 'Vale hepsini alır', d: '<b>Vale</b> atınca ortadaki bütün kartları toplarsın.'},
      {art: `${mc('5', '♥')}${arrow}${mc('5', '♣', 'is-glow')}<span class="kh-step__badge">+10</span>`, t: 'Pişti!', d: 'Tek kartın üstüne aynısı: <b>10 puan</b>. Vale üstüne vale: <b>20 puan</b>.'},
      {art: '', t: 'Puanlar', d: `<div class="kh-pts">${[['As', '1'], ['Vale', '1'], ['Sinek 2', '2'], ['Karo 10', '3'], ['En çok kart', '3'], ['Pişti', '10'], ['Vale pişti', '20'], ['Kazanan', 'en yüksek']]
        .map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`},
    ];
    m = openModal(ctx, {
      cls: 'kh-rules',
      title: 'Nasıl Oynanır',
      onX: done,
      body: `<div class="kh-steps">${steps
        .map((s, i) => `<div class="kh-step kh-card${s.art ? '' : ' is-wide'}">${s.art ? `<div class="kh-step__art">${s.art}</div>` : ''}<div><div class="kh-step__hd"><span class="kh-step__n">${i + 1}</span><span class="kh-step__t">${s.t}</span></div><div class="kh-step__d">${s.d}</div></div></div>`)
        .join('')}</div>
        <div class="kh-rules__foot"><span>${I.hand}Kartı parmağınla masaya fırlat ya da iki kez dokun.</span><button class="kh-btn kh-btn--1 kh-btn--lg kh-btn--block" data-act="ok">Anladım</button></div>`,
    });
    m.panel.querySelectorAll<HTMLElement>('.kh-step').forEach((s, i) =>
      play(s, [{transform: 'translateX(-20px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: 120 + i * 70, easing: EASE.out, fill: 'backwards'}));
    onAct(m.scope, m.panel, a => {
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
      btn.classList.replace('kh-btn--1', 'kh-btn--2');
      btn.innerHTML = 'Harika!';
      if (ANIM) play(btn, [{transform: 'scale(.9)'}, {transform: 'scale(1)'}], {duration: 260, easing: EASE.spring});
    });
  });
}
