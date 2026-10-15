// Açılış (logo + ilerleme + ipucu) ve karşılaşma girişi (sinematik "VS"): 1'e 1 (iki yarım), eşli (mavi takım – kırmızı takım),
// 4 kişi (dört eğik şerit sırayla çarparak gelir). Portreler roster'dan; insan oyuncu kendi karakteri ve çerçevesiyle.
import type {MatchSetup, SeatPlayer} from '../game/types';
import {ANIM, EASE, Scope, esc, fmt, h, play, q} from './dom';
import {ASSETS} from './assets';
import {arenaHtml, gemHtml, wordmarkHtml, type Ctx} from './parts';
import {g3} from './fx';
import {suitSvg, type SuitKey} from './icons';
import {haptic} from '../platform/bridge';

const TIPS = [
  'Vale ortadaki tüm kartları alır.',
  'Ortada tek kart varken aynısını atarsan pişti: 10 puan.',
  'Vale üstüne vale atarsan vale pişti: 20 puan!',
  'Karo 10 tam 3 puan eder, gözünü dört aç.',
  'Sinek 2, 2 puan getirir.',
  'En çok kartı toplayan 3 puan kapar.',
  'Kartına bir kez dokun ya da yukarı kaydır: masaya gider.',
  'Rakibin hangi kartları attığını aklında tut.',
  'Valeyi erken harcama; büyük yığına sakla.',
];

export function splash(ctx: Ctx): {progress(p: number): void; done(): Promise<void>} {
  const scope = new Scope();
  const el = h('div', 'kh-screen kh-splash');
  el.innerHTML = `${arenaHtml()}<div class="kh-splash__glow"></div>${wordmarkHtml('kh-splash__logo')}
    <div class="kh-progress"><i class="kh-progress__fill"></i></div>
    <div class="kh-splash__tip"><p><b>İpucu:</b> <span></span></p></div>`;
  ctx.layer.append(el);
  const fill = q(el, '.kh-progress__fill');
  const tipEl = q(el, '.kh-splash__tip');
  const tipTxt = q(tipEl, 'span');
  let tip = Math.floor(Math.random() * TIPS.length);
  tipTxt.textContent = TIPS[tip];
  const logo = q(el, '.kh-splash__logo');
  play(q(el, '.kh-splash__glow'), [{transform: 'scale(.6)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 1200, easing: EASE.out, fill: 'backwards'});
  // Logo SVG yazısı Lilita One ister: soğuk açılışta yedek yazı tipiyle görünmesin diye yazı tipini bekler (en çok 0.8 sn).
  const showLogo = () => {
    if (!scope.alive) return;
    logo.style.opacity = '';
    play(logo, [{transform: 'scale(.6) rotate(-4deg)', opacity: 0}, {transform: 'scale(1.06) rotate(1deg)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 720, easing: EASE.out, fill: 'backwards'});
  };
  const fonts = (document as Document & {fonts?: FontFaceSet}).fonts;
  if (ANIM && fonts?.check && !fonts.check("40px 'Lilita One'", 'PİŞTİ')) {
    logo.style.opacity = '0';
    Promise.race([fonts.load("40px 'Lilita One'", 'PİŞTİ KAHVEHANE').catch(() => undefined), scope.wait(800)]).then(showLogo);
  } else showLogo();
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

/** Oyuncu plakası (ad + alt yazı + seviye taşı). */
const plateHtml = (p: SeatPlayer, cls = ''): string =>
  `<div class="kh-vs__plate ${cls}">${gemHtml(p.level, p.human)}<div><div class="kh-vs__name">${esc(p.human ? p.name : p.char.name)}</div>
    <div class="kh-vs__sub">${p.human ? `${esc(p.char.name)}` : esc(p.char.title)}</div></div></div>`;

const bustHtml = (p: SeatPlayer, cls = ''): string =>
  `<img class="kh-vs__bust ${cls}" data-seat="${p.seat}" src="${p.char.poses[p.human ? 'gulumseme' : 'notr']}" alt="">`;

/**
 * Karşılaşma girişi. 1'e 1: rakip üst yarıda (kırmızı), sen alt yarıda (mavi); eşli: takımlar yarımlarda yan yana;
 * 4 kişi: dört eğik şerit (♥ ♦ ♣ ♠) sırayla iki yandan çarpar. Ortada "VS" damgası, sarsıntı, masa bahsi.
 */
export function versus(ctx: Ctx, setup: MatchSetup, stake: number): Promise<void> {
  const scope = new Scope();
  const mode = setup.mode;
  const by = (seat: number) => setup.players.find(p => p.seat === seat)!;
  const me = by(0);
  const el = h('div', `kh-screen kh-vs is-${mode}`);
  const sk = 'skewY(-9deg)';
  let body = '';
  if (mode === '4') {
    // yukarıdan aşağı: karşı (2), sol (3), sağ (1), sen (0)
    const order = [2, 3, 1, 0];
    const suits: SuitKey[] = ['h', 'd', 'c', 's'];
    body = order.map((seat, k) => `<div class="kh-vs__band is-${suits[k]}" style="--k:${k}"><span class="kh-vs__bsuit">${suitSvg(suits[k])}</span></div>`).join('') +
      order.map((seat, k) => {
        const p = by(seat);
        return `<div class="kh-vs__slot is-k${k} ${k % 2 ? 'is-l' : 'is-r'}${p.human ? ' is-me' : ''}" style="--k:${k}">${bustHtml(p)}${plateHtml(p)}</div>`;
      }).join('') + `<div class="kh-vs__seams">${[1, 2, 3].map(k => `<i style="--k:${k}"></i>`).join('')}</div>`;
  } else {
    const top = mode === '1v1' ? [by(1)] : [by(1), by(3)];
    const bot = mode === '1v1' ? [me] : [me, by(2)];
    const side = (list: SeatPlayer[], cls: string, team: string) => `<div class="kh-vs__side ${cls}${list.length > 1 ? ' is-duo' : ''}">
        ${list.map((p, i) => `<div class="kh-vs__who" style="--i:${i}">${bustHtml(p)}${list.length > 1 ? plateHtml(p, 'is-sm') : ''}</div>`).join('')}
        ${list.length > 1 ? `<div class="kh-vs__team">${team}</div>` : plateHtml(list[0])}
      </div>`;
    body = `<div class="kh-vs__half is-t"></div><div class="kh-vs__half is-b"></div><div class="kh-vs__seam"></div>
      ${side(top, 'is-opp', 'Kırmızı Takım')}${side(bot, 'is-me', 'Mavi Takım')}`;
  }
  el.innerHTML = `<div class="kh-vs__rays"></div>${body}
    <div class="kh-vs__mode">${mode === '1v1' ? "1'e 1" : mode === '4' ? '4 Kişi · Herkes Tek' : 'Eşli · 2’ye 2'}</div>
    <div class="kh-vs__emblem"><div class="kh-title">${g3('VS', 'is-white')}</div></div>
    <div class="kh-vs__stake"><span>Masa</span><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(stake)}</b></div>
    <div class="kh-vs__flash"></div>`;
  ctx.layer.append(el);
  const g = (s: string) => q(el, s);
  const s = ctx.sounds;
  const slam = () => (s.slam ? s.slam() : s.tap());
  const four = mode === '4';
  const tSlam = four ? 640 : 460;
  if (ANIM) {
    s.whoosh();
    scope.timeout(() => s.whoosh(), 150);
    if (four) scope.timeout(() => s.whoosh(), 330);
    scope.timeout(() => {
      slam();
      haptic('medium');
    }, tSlam + 10);
    scope.timeout(() => s.coin(1), tSlam + 220);
  }
  if (four) {
    el.querySelectorAll<HTMLElement>('.kh-vs__band').forEach((b, k) => {
      const from = k % 2 ? -120 : 120;
      play(b, [{transform: `translateX(${from}%) ${sk}`}, {transform: `translateX(${-from * 0.04}%) ${sk}`, offset: 0.75}, {transform: `translateX(0) ${sk}`}], {duration: 360, delay: k * 110, easing: EASE.out, fill: 'backwards'});
    });
    el.querySelectorAll<HTMLElement>('.kh-vs__slot').forEach((sl, k) => {
      const from = k % 2 ? -70 : 70;
      play(sl, [{transform: `translateX(${from}%)`, opacity: 0}, {transform: `translateX(${-from * 0.05}%)`, opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 420, delay: 80 + k * 110, easing: EASE.out, fill: 'backwards'});
    });
    el.querySelectorAll<HTMLElement>('.kh-vs__seams i').forEach((sm, k) =>
      play(sm, [{opacity: 0, transform: `${sk} scaleX(0)`}, {opacity: 1, transform: `${sk} scaleX(1)`}], {duration: 240, delay: 380 + k * 60, easing: EASE.out, fill: 'backwards'}));
  } else {
    play(g('.kh-vs__half.is-t'), [{transform: `translateY(-115%) ${sk}`}, {transform: `translateY(0) ${sk}`}], {duration: 320, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-vs__half.is-b'), [{transform: `translateY(115%) ${sk}`}, {transform: `translateY(0) ${sk}`}], {duration: 320, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-vs__seam'), [{opacity: 0, transform: `${sk} scaleX(0)`}, {opacity: 1, transform: `${sk} scaleX(1)`}], {duration: 260, delay: 260, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-vs__side.is-opp'), [{transform: 'translateY(-60%)', opacity: 0}, {transform: 'translateY(3%)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 440, delay: 110, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-vs__side.is-me'), [{transform: 'translateY(60%)', opacity: 0}, {transform: 'translateY(-3%)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}], {duration: 440, delay: 160, easing: EASE.out, fill: 'backwards'});
    // eşlide ikinci büst biraz geriden gelir
    el.querySelectorAll<HTMLElement>('.kh-vs__side.is-duo .kh-vs__who').forEach(w => {
      const i = Number(w.style.getPropertyValue('--i'));
      play(w, [{transform: `translateX(${i ? 40 : -40}%) scale(.85)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 200 + i * 120, easing: EASE.spring, fill: 'backwards'});
    });
  }
  play(g('.kh-vs__rays'), [{transform: 'rotate(-10deg) scale(.6)', opacity: 0}, {transform: 'rotate(4deg) scale(1)', opacity: 1, offset: 0.35}, {transform: 'rotate(22deg) scale(1.05)', opacity: 1}], {duration: 1800, delay: tSlam - 80, easing: 'linear', fill: 'both'});
  play(g('.kh-vs__emblem'), [{transform: 'scale(2.6) rotate(-24deg)', opacity: 0}, {transform: 'scale(.92) rotate(3deg)', opacity: 1, offset: 0.62}, {transform: 'scale(1) rotate(0)', opacity: 1}], {duration: 320, delay: tSlam, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'backwards'});
  play(g('.kh-vs__flash'), [{opacity: 0}, {opacity: 0.65, offset: 0.15}, {opacity: 0}], {duration: 360, delay: tSlam + 180, easing: 'ease-out', fill: 'backwards'}, 0);
  play(el, [{transform: 'none'}, {transform: 'translate(3px,-2px)'}, {transform: 'translate(-3px,2px)'}, {transform: 'translate(2px,1px)'}, {transform: 'none'}], {duration: 200, delay: tSlam + 200}, 1);
  play(g('.kh-vs__stake'), [{transform: 'translateX(30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: tSlam + 300, easing: EASE.spring, fill: 'backwards'});
  play(g('.kh-vs__mode'), [{transform: 'translateY(-20px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: tSlam + 120, easing: EASE.spring, fill: 'backwards'});
  // damga anında rakipler oyun yüzüne geçer (kısa)
  if (ANIM) scope.timeout(() => el.querySelectorAll<HTMLImageElement>('.kh-vs__bust').forEach(img => {
    const p = by(Number(img.dataset.seat));
    if (p && !p.human) img.src = p.char.poses.kizgin;
  }), tSlam + 40);
  return new Promise(res => {
    const end = async () => {
      if (ANIM) await el.animate([{opacity: 1}, {opacity: 0}], {duration: 330, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      scope.dispose();
      el.remove();
      res();
    };
    // Dondurulmuş modda (ekran görüntüsü) daha uzun kalır
    window.setTimeout(end, ANIM ? tSlam + (four ? 1150 : 900) : 4000);
  });
}
