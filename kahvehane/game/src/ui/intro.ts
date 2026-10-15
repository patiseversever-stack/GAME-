// Açılış (logo + ilerleme + ipucu) ve karşılaşma girişi (1.6 sn sinematik "VS").
import type {Opponent, Profile} from './types';
import {ANIM, EASE, Scope, esc, fmt, h, play, q} from './dom';
import {ASSETS, isCutout} from './assets';
import {avatarHtml, type Ctx} from './parts';
import {g3} from './fx';

const TIPS = [
  'Vale ortadaki tüm kartları alır.',
  'Ortada tek kart varken aynısını atarsan pişti: 10 puan.',
  'Vale üstüne vale atarsan vale pişti: 20 puan!',
  'Karo 10 tam 3 puan eder, gözünü dört aç.',
  'Sinek 2, 2 puan getirir.',
  'En çok kartı toplayan 3 puan kapar.',
  'Kartı parmağınla masaya fırlatabilir ya da iki kez dokunabilirsin.',
  'Rakibin hangi kartları attığını aklında tut.',
  'Valeyi erken harcama; büyük yığına sakla.',
];

export function splash(ctx: Ctx): {progress(p: number): void; done(): Promise<void>} {
  const scope = new Scope();
  const el = h('div', 'kh-screen kh-splash');
  el.innerHTML = `<div class="kh-splash__glow"></div>${ASSETS.logo ? `<img class="kh-splash__logo" src="${ASSETS.logo}" alt="Kahvehane Pişti">` : `<div class="kh-title" style="font-size:calc(var(--u)*4)">${g3('Kahvehane Pişti')}</div>`}
    <div class="kh-progress"><i class="kh-progress__fill"></i></div>
    <div class="kh-splash__tip"><b>İpucu:</b> <span></span></div>`;
  ctx.layer.append(el);
  const fill = q(el, '.kh-progress__fill');
  const tipEl = q(el, '.kh-splash__tip');
  const tipTxt = q(tipEl, 'span');
  let tip = Math.floor(Math.random() * TIPS.length);
  tipTxt.textContent = TIPS[tip];
  const logo = el.children[1] as HTMLElement;
  play(q(el, '.kh-splash__glow'), [{transform: 'rotate(0deg) scale(.7)', opacity: 0}, {transform: 'rotate(8deg) scale(1)', opacity: 1}], {duration: 1400, easing: EASE.out, fill: 'backwards'});
  play(logo, [{transform: 'scale(.82)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 700, easing: EASE.spring, fill: 'backwards'});
  play(tipEl, [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 400, delay: 300, easing: EASE.out, fill: 'backwards'});
  const rotate = () => {
    scope.timeout(() => {
      const a = tipEl.animate([{opacity: 1}, {opacity: 0}], {duration: 220, fill: 'forwards'});
      a.onfinish = () => {
        tip = (tip + 1) % TIPS.length;
        tipTxt.textContent = TIPS[tip];
        a.cancel();
        play(tipEl, [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}], {duration: 260, easing: EASE.out});
      };
      rotate();
    }, 3200);
  };
  if (ANIM) rotate();
  let cur = 0;
  const progress = (p: number) => {
    cur = Math.max(cur, Math.min(1, p));
    fill.style.transform = `scaleX(${cur.toFixed(3)})`;
  };
  return {
    progress,
    async done() {
      progress(1);
      await scope.wait(420);
      if (ANIM) await el.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(1.03)'}], {duration: 380, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      scope.dispose();
      el.remove();
    },
  };
}

/** Karşılaşma girişi: oyuncu soldan, rakip sağdan kayar; "VS" damgası; bahis; 1.6 sn sonra çözülür. */
export function versus(ctx: Ctx, p: Profile, o: Opponent, stake: number): Promise<void> {
  const scope = new Scope();
  const el = h('div', 'kh-screen kh-vs');
  const cut = isCutout(o.portrait);
  el.innerHTML = `<div class="kh-vs__half is-t"></div><div class="kh-vs__half is-b"></div><div class="kh-vs__rays"></div><div class="kh-vs__seam"></div>
    <div class="kh-vs__side is-opp">
      ${cut ? `<img class="kh-vs__bust" src="${o.portrait}" alt="">` : `<div class="kh-vs__medal"><span class="kh-avatar"><img src="${o.portrait}" alt=""></span></div>`}
      <div class="kh-vs__plate"><div class="kh-vs__name">${esc(o.name)}</div><div class="kh-vs__sub">${esc(o.title)}</div></div>
    </div>
    <div class="kh-vs__side is-me">
      <div class="kh-vs__medal">${avatarHtml(p.name)}</div>
      <div class="kh-vs__plate"><div class="kh-vs__name">${esc(p.name)}</div><div class="kh-vs__sub">Seviye ${p.level}</div></div>
    </div>
    <div class="kh-vs__emblem"><div class="kh-title">${g3('VS')}</div></div>
    <div class="kh-vs__stake"><span>Masa</span><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(stake)}</b></div>
    <div class="kh-vs__flash"></div>`;
  ctx.layer.append(el);
  const g = (s: string) => q(el, s);
  const s = ctx.sounds;
  if (ANIM) {
    s.whoosh();
    scope.timeout(() => s.whoosh(), 150);
    scope.timeout(() => s.tap(), 470);
    scope.timeout(() => s.coin(1), 680);
  }
  const sk = 'skewY(-9deg)';
  play(g('.kh-vs__half.is-t'), [{transform: `translateY(-115%) ${sk}`}, {transform: `translateY(0) ${sk}`}], {duration: 320, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-vs__half.is-b'), [{transform: `translateY(115%) ${sk}`}, {transform: `translateY(0) ${sk}`}], {duration: 320, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-vs__seam'), [{opacity: 0, transform: `${sk} scaleX(0)`}, {opacity: 1, transform: `${sk} scaleX(1)`}], {duration: 260, delay: 260, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-vs__side.is-opp'), [{transform: 'translateY(-60%)', opacity: 0}, {transform: 'translateY(3%)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 440, delay: 110, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-vs__side.is-me'), [{transform: 'translateY(60%)', opacity: 0}, {transform: 'translateY(-3%)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 440, delay: 160, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-vs__rays'), [{transform: 'rotate(-10deg) scale(.6)', opacity: 0}, {transform: 'rotate(4deg) scale(1)', opacity: 1, offset: 0.35}, {transform: 'rotate(22deg) scale(1.05)', opacity: 1}], {duration: 1600, delay: 380, easing: 'linear', fill: 'both'});
  play(g('.kh-vs__emblem'), [{transform: 'scale(2.6) rotate(-24deg)', opacity: 0}, {transform: 'scale(.92) rotate(3deg)', opacity: 1, offset: 0.62}, {transform: 'scale(1) rotate(0)', opacity: 1}], {duration: 320, delay: 460, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'backwards'});
  play(g('.kh-vs__flash'), [{opacity: 0}, {opacity: 0.65, offset: 0.15}, {opacity: 0}], {duration: 360, delay: 640, easing: 'ease-out', fill: 'backwards'}, 0);
  play(el, [{transform: 'none'}, {transform: 'translate(3px,-2px)'}, {transform: 'translate(-3px,2px)'}, {transform: 'translate(2px,1px)'}, {transform: 'none'}], {duration: 200, delay: 660}, 1);
  play(g('.kh-vs__stake'), [{transform: 'translateX(30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: 760, easing: EASE.spring, fill: 'backwards'});
  return new Promise(res => {
    const end = async () => {
      if (ANIM) await el.animate([{opacity: 1}, {opacity: 0}], {duration: 330, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      scope.dispose();
      el.remove();
      res();
    };
    // Dondurulmuş modda (ekran görüntüsü) daha uzun kalır
    window.setTimeout(end, ANIM ? 1270 : 4000);
  });
}
