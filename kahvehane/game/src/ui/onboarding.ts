// İlk açılış hikâyesi: karanlık → kahvehane lambası yanar, arena aydınlanır → Kahveci Dursun karşılar (daktilo balon) →
// hediye kutusu kıpırdar, dokununca patlar, içinden dört karakter kartı fırlar → kaydırmalı hediye galerisi (momentum + oturma,
// paralaks, komşular görünür) → seçilen kart döner, konfeti, karakter zafer pozunda sözünü söyler → "Adın ne?" → hoş geldin.
// Hikâye kısmı "Geç" ile atlanır (doğrudan galeriye). Sonunda profile.completeOnboarding(karakter, ad).
import './onboarding.css';
import type {Profile as GameProfile} from '../game/profile';
import {ROSTER, type CharDef} from '../game/roster';
import {RARITY_INFO} from '../game/catalog';
import {ANIM, EASE, Scope, bump, center, countUp, esc, fmt, h, play, q, rnd, typewriter} from './dom';
import {ASSETS} from './assets';
import {I, suitSvg, type SuitKey} from './icons';
import {Carousel, Portrait, arenaHtml, rarityHtml, shuffled, stampWord, starsHtml, wordmarkHtml, type Ctx} from './parts';
import {g3} from './fx';
import {haptic} from '../platform/bridge';

const HOST = 'dursun';
const SUIT_OF: Record<string, SuitKey> = {riza: 'd', cem: 's', dursun: 'h', defne: 'c'};

/** Dursun'un karşılama replikleri ve pozları. */
const WELCOME: {t: string; pose: 'gulumseme' | 'zafer' | 'pisti' | 'kahkaha'}[] = [
  {t: 'Hoş geldin evlat! Ben Kahveci Dursun, bu kahvehane benim.', pose: 'gulumseme'},
  {t: 'Çaylar demlendi, masalar kuruldu. Bir tek sen eksiktin!', pose: 'zafer'},
  {t: 'İlk gününe özel sana küçük bir hediyemiz var…', pose: 'pisti'},
];

/** İsim önerileri (çipler; zar yeniden karıştırır). */
const NAMES = ['Pişti Kralı', 'Vale Avcısı', 'Çaycı Usta', 'Şanslı Kedi', 'Kara Vale', 'Masa Bekçisi', 'Karo Onlu', 'Sinek İkili', 'Kahve Falcısı',
  'Deste Ustası', 'Mahalle Yıldızı', 'Gece Kuşu', 'Bıyıklı Usta', 'Sessiz Fırtına', 'Çay Tiryakisi', 'Son El'];

/** Seçilen ada karakterin tepkisi. */
const NAME_REACT = ['Hah, yakıştı!', 'Bu isimle masada korkulur!', 'Oo, çok havalı!', 'Beğendim bunu!', 'Tam bir usta ismi!'];

/** Hikâye + seçim + ad. Çözülünce ekranı kaldıran fonksiyonu verir (perde kapandıktan sonra çağrılır). */
export function onboarding(ctx: Ctx, profile: GameProfile): Promise<() => void> {
  const scope = new Scope();
  const s = ctx.sounds;
  const fanfare = () => (s.fanfare ? s.fanfare() : s.reward());
  const el = h('div', 'kh-screen kh-ob');
  el.innerHTML = `${arenaHtml('kh-ob__arena')}
    <div class="kh-ob__lamp"><i class="kh-ob__pool"></i><i class="kh-ob__cone"></i>
      <svg class="kh-ob__shade" viewBox="0 0 120 150" aria-hidden="true">
        <path d="M60 0V58" stroke="#0a1033" stroke-width="5"/>
        <path d="M50 56h20l4 10H46z" fill="#ffb21a" stroke="#0a1033" stroke-width="4" stroke-linejoin="round"/>
        <path d="M24 106 Q60 52 96 106 Z" fill="url(#obsh)" stroke="#0a1033" stroke-width="5" stroke-linejoin="round"/>
        <ellipse cx="60" cy="106" rx="36" ry="7" fill="#fff6c8" stroke="#0a1033" stroke-width="4"/>
        <path d="M38 92 Q50 74 62 70" stroke="#fff" stroke-opacity=".55" stroke-width="4" fill="none" stroke-linecap="round"/>
        <defs><linearGradient id="obsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3dff86"/><stop offset=".55" stop-color="#16c45b"/><stop offset="1" stop-color="#087a35"/></linearGradient></defs>
      </svg></div>
    <div class="kh-ob__motes">${[0, 1, 2, 3, 4, 5].map(i => `<i class="kh-mote" style="left:${30 + ((i * 37) % 40)}%;top:${30 + ((i * 23) % 34)}%;width:${4 + (i % 3) * 2}px;height:${4 + (i % 3) * 2}px;animation-delay:${-i * 2.3}s"></i>`).join('')}</div>
    <div class="kh-ob__logo">${wordmarkHtml('', true)}</div>
    <div class="kh-ob__stage"></div>
    <div class="kh-ob__dark"></div>
    <button class="kh-ob__skip" data-act="skip">Geç ${I.chevR}</button>
    <div class="kh-ob__hint"><span>${I.hand}</span>Devam etmek için dokun</div>`;
  ctx.layer.append(el);
  const g = (sel: string) => q(el, sel);
  const stage = g('.kh-ob__stage');
  const hint = g('.kh-ob__hint');
  const skipBtn = g('.kh-ob__skip');

  // ---- dokunma / atlama yönetimi ----
  let skipped = false;
  let tapRes: (() => void) | null = null;
  const tapOr = (ms: number) =>
    new Promise<void>(res => {
      if (skipped) return res();
      tapRes = res;
      scope.timeout(() => {
        if (tapRes === res) tapRes = null;
        res();
      }, ANIM ? ms : 0);
    });
  const waitTap = () =>
    new Promise<void>(res => {
      if (skipped || !ANIM) return res();
      tapRes = res;
    });
  scope.on(el, 'click', e => {
    if ((e.target as Element).closest('[data-act=skip]')) {
      if (skipped) return;
      s.tap();
      skipped = true;
      const r = tapRes;
      tapRes = null;
      r?.();
      play(skipBtn, [{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'});
      skipBtn.style.pointerEvents = 'none';
      return;
    }
    if ((e.target as Element).closest('button, input, .kh-gal')) return;
    const r = tapRes;
    tapRes = null;
    r?.();
  });
  const showHint = (on: boolean) => {
    hint.classList.toggle('is-on', on);
  };

  const dispose = () => {
    scope.dispose();
    el.remove();
  };
  return (async () => {
    await story();
    const char = await gallery();
    const name = await askName(char);
    profile.completeOnboarding(char.id, name);
    await welcome(char, profile.data.name);
    return dispose;
  })();

  // =================================================================== 1-3: hikâye
  /** true: tamamı oynadı; false: atlandı */
  async function story(): Promise<boolean> {
    const dark = g('.kh-ob__dark');
    const logo = g('.kh-ob__logo');
    const lamp = g('.kh-ob__lamp');
    // 1) karanlık → lamba titreyerek yanar
    await scope.wait(450);
    if (skipped) return lightsInstant();
    s.tap();
    haptic('light');
    play(dark, [{opacity: 1}, {opacity: 0.35, offset: 0.1}, {opacity: 0.95, offset: 0.18}, {opacity: 0.2, offset: 0.3}, {opacity: 0.75, offset: 0.38}, {opacity: 0, offset: 0.6}, {opacity: 0}], {duration: 1300, easing: 'linear', fill: 'forwards'});
    play(lamp, [{transform: 'translateY(-40%)'}, {transform: 'translateY(4%)', offset: 0.6}, {transform: 'none'}], {duration: 900, easing: EASE.out, fill: 'backwards'});
    play(g('.kh-ob__arena'), [{opacity: 0, transform: 'scale(1.12)'}, {opacity: 1, transform: 'none'}], {duration: 1600, delay: 300, easing: EASE.out, fill: 'backwards'});
    scope.timeout(() => s.tap(), 260);
    await scope.wait(700);
    if (skipped) return lightsInstant();
    s.whoosh();
    logo.style.visibility = 'visible';
    play(logo, [{transform: 'translate(-50%,0) scale(.4) rotate(-8deg)', opacity: 0}, {transform: 'translate(-50%,0) scale(1.08) rotate(2deg)', opacity: 1, offset: 0.6}, {transform: 'translate(-50%,0)', opacity: 1}], {duration: 700, easing: EASE.out, fill: 'backwards'});
    await scope.wait(650);
    if (skipped) return lightsInstant();

    // 2) Dursun karşılar
    const host = ROSTER.find(c => c.id === HOST)!;
    const pt = new Portrait(host, {pose: 'gulumseme', cls: 'kh-ob__host'});
    stage.append(pt.el);
    const say = h('div', 'kh-say kh-ob__say', `<small>${esc(host.name)}</small><div class="kh-say__t"></div>`);
    stage.append(say);
    scope.add(() => pt.destroy());
    s.whoosh();
    play(pt.el, [{transform: 'translateY(70%)'}, {transform: 'translateY(-4%)', offset: 0.65}, {transform: 'none'}], {duration: 620, easing: EASE.out, fill: 'backwards'});
    await scope.wait(380);
    for (let i = 0; i < WELCOME.length && !skipped; i++) {
      const w = WELCOME[i];
      pt.pose(w.pose);
      pt.pop();
      say.style.visibility = 'visible';
      play(say, [{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1.05)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 340, easing: EASE.out});
      const tw = typewriter(scope, q(say, '.kh-say__t'), w.t, 40);
      showHint(true);
      // dokunma: önce yazıyı tamamlar, sonra ilerletir
      await Promise.race([tw.done, waitTap()]);
      if (tw.typing()) {
        tw.finish();
        await tapOr(2600);
      } else await tapOr(1300 + w.t.length * 30);
      s.tap();
    }
    showHint(false);
    if (skipped) return lightsInstant();

    // 3) hediye kutusu: Dursun köşeye çekilir (yeni küçük balonla), kutu düşer, kıpırdar
    pt.pose('kahkaha');
    play(pt.el, [{transform: 'none'}, {transform: 'translate(-30%, 22%) scale(.62)'}], {duration: 520, easing: EASE.inOut, fill: 'forwards'});
    play(say, [{transform: 'none', opacity: 1}, {transform: 'scale(.6)', opacity: 0}], {duration: 200, easing: EASE.in, fill: 'forwards'});
    const say2 = h('div', 'kh-say kh-ob__say2', `<div class="kh-say__t">Hadi, aç bakalım!</div>`);
    stage.append(say2);
    play(say2, [{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1.06)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 360, delay: 480, easing: EASE.out, fill: 'backwards'});
    play(logo, [{transform: 'translate(-50%,0)', opacity: 1}, {transform: 'translate(-50%,-30%) scale(.8)', opacity: 0}], {duration: 360, easing: EASE.in, fill: 'forwards'});
    const box = giftBox();
    stage.append(box);
    s.whoosh();
    await done(play(box, [{transform: 'translate(-50%, -160%) rotate(-12deg)'}, {transform: 'translate(-50%, 0) rotate(3deg)', offset: 0.55}, {transform: 'translate(-50%, -12%) rotate(-2deg)', offset: 0.72}, {transform: 'translate(-50%, 0) rotate(0)'}], {duration: 760, easing: EASE.in, fill: 'backwards'}));
    s.slam?.();
    haptic('medium');
    play(q(box, '.kh-gift__shadow'), [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.15)', opacity: 1, offset: 0.5}, {transform: 'none', opacity: 1}], {duration: 380, easing: EASE.out});
    play(q(box, '.kh-gift__body'), [{transform: 'scale(1.12, .84)'}, {transform: 'scale(.96, 1.05)', offset: 0.5}, {transform: 'none'}], {duration: 360, easing: EASE.out});
    box.classList.add('is-wiggle');
    const cta = h('div', 'kh-ob__cta', `${I.hand}<span>Hediyeni aç!</span>`);
    stage.append(cta);
    play(cta, [{transform: 'translate(-50%, 20px)', opacity: 0}, {transform: 'translate(-50%, 0)', opacity: 1}], {duration: 360, delay: 200, easing: EASE.spring, fill: 'backwards'});
    await waitTap();
    if (skipped) return lightsInstant();
    box.classList.remove('is-wiggle');
    play(cta, [{opacity: 1}, {opacity: 0}], {duration: 160, fill: 'forwards'});
    // ön gerilim: üç sarsıntı, giderek sertleşir
    const body = q(box, '.kh-gift__in');
    for (let k = 1; k <= 3; k++) {
      s.tap();
      haptic('light');
      await done(play(body, [{transform: 'none'}, {transform: `rotate(${-5 * k}deg) scale(${1 + k * 0.03})`}, {transform: `rotate(${5 * k}deg) scale(${1 + k * 0.04})`}, {transform: 'none'}], {duration: 210 - k * 20, easing: 'ease-in-out'}));
    }
    await done(play(body, [{transform: 'none'}, {transform: 'scale(1.18, .78)'}], {duration: 140, easing: EASE.in, fill: 'forwards'}));
    // PATLAMA
    fanfare();
    s.slam?.();
    haptic('heavy');
    ctx.fx.flash(0.9, 520);
    const c = center(q(box, '.kh-gift__body'));
    ctx.fx.burst({x: c.x, y: c.y - 20}, {coins: 10, confetti: 34, power: 1.1});
    play(body, [{transform: 'scale(1.18, .78)'}, {transform: 'scale(.92, 1.1)', offset: 0.4}, {transform: 'none'}], {duration: 420, easing: EASE.out, fill: 'forwards'});
    play(q(box, '.kh-gift__lid'), [{transform: 'none', opacity: 1}, {transform: 'translate(40%, -380%) rotate(48deg)', opacity: 1, offset: 0.7}, {transform: 'translate(60%, -520%) rotate(70deg)', opacity: 0}], {duration: 900, easing: EASE.out, fill: 'forwards'});
    const rays = q(box, '.kh-gift__rays');
    play(rays, [{transform: 'scale(0) rotate(0)', opacity: 0}, {transform: 'scale(1.1) rotate(40deg)', opacity: 1, offset: 0.35}, {transform: 'scale(1.3) rotate(120deg)', opacity: 0}], {duration: 1800, easing: 'ease-out', fill: 'forwards'});
    play(pt.el, [{transform: 'translate(-30%, 22%) scale(.62)'}, {transform: 'translate(-75%, 115%) scale(.62)'}], {duration: 420, delay: 120, easing: EASE.in, fill: 'forwards'});
    play(say2, [{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'});
    await scope.wait(260);
    return true;
  }

  /** Atlanınca: ışıklar anında yanar, hikâye öğeleri kalkar. */
  function lightsInstant(): false {
    showHint(false);
    const dark = g('.kh-ob__dark');
    dark.getAnimations().forEach(a => a.cancel());
    play(dark, [{opacity: Number(getComputedStyle(dark).opacity)}, {opacity: 0}], {duration: 300, fill: 'forwards'});
    g('.kh-ob__arena').getAnimations().forEach(a => a.finish());
    g('.kh-ob__logo').style.visibility = 'hidden';
    stage.querySelectorAll('.kh-pt, .kh-say, .kh-gift, .kh-ob__cta').forEach(n => n.remove());
    return false;
  }

  // =================================================================== 4-5: hediye galerisi
  function gallery(): Promise<CharDef> {
    skipBtn.style.display = 'none';
    const lampEl = g('.kh-ob__lamp');
    play(lampEl, [{transform: 'none', opacity: 1}, {transform: 'translateY(-30%)', opacity: 0}], {duration: 500, easing: EASE.in, fill: 'forwards'});
    const box = stage.querySelector<HTMLElement>('.kh-gift');
    const fromBox = box ? center(q(box, '.kh-gift__body')) : null;
    const gal = h('div', 'kh-gal');
    const chars = ROSTER.slice();
    // en tatlı başlangıç: ortada Dursun (ev sahibi), sağında/solunda diğerleri
    const start = Math.max(0, chars.findIndex(c => c.id === HOST));
    gal.innerHTML = `<header class="kh-gal__head"><div class="kh-title kh-gal__title">${g3('Hediyeni Seç!')}</div>
        <div class="kh-gal__sub">Dört usta, tek seçim. Seçtiğin karakter <b>senin</b> olur.</div></header>
      <div class="kh-gal__car kh-car"></div>
      <div class="kh-gal__dots">${chars.map((_, i) => `<i data-i="${i}"></i>`).join('')}<b class="kh-gal__dot"></b></div>
      <div class="kh-gal__foot">
        <div class="kh-gal__value"></div>
        <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-shine kh-gal__take" data-act="take">${I.gift}Ücretsiz Al</button>
      </div>`;
    el.append(gal);
    const car = q(gal, '.kh-gal__car');
    const pts: Portrait[] = [];
    const items = chars.map((c, i) => {
      const it = h('div', 'kh-car__item kh-gc');
      it.dataset.i = String(i);
      it.style.setProperty('--c', c.color);
      it.innerHTML = `<div class="kh-gc__in"><div class="kh-gc__card is-${c.rarity}">
          <i class="kh-gc__rays"></i><span class="kh-gc__suit">${suitSvg(SUIT_OF[c.id] ?? 'h')}</span>
          <div class="kh-gc__top">${rarityHtml(c.rarity)}<span class="kh-gc__price"><img src="${ASSETS.icon_coin}" alt=""><s class="kh-num">${fmt(c.price)}</s></span></div>
          <div class="kh-gc__fig"></div>
          <div class="kh-gc__body">
            <div class="kh-gc__name">${esc(c.name)}</div>
            <div class="kh-gc__title">${esc(c.title)} · ${c.age} yaş</div>
            <div class="kh-gc__tags"><span class="kh-gc__style">${I.sparkle}${esc(c.style)}</span><span class="kh-gc__diff">Zorluk ${starsHtml(c.difficulty)}</span></div>
            <p class="kh-gc__story">${esc(c.story)}</p>
            <div class="kh-gc__quote">${esc(c.quote)}</div>
          </div>
        </div><div class="kh-gc__free">Bedava!</div></div>`;
      const pt = new Portrait(c, {pose: 'notr'});
      q(it, '.kh-gc__fig').append(pt.el);
      pts.push(pt);
      scope.add(() => pt.destroy());
      car.append(it);
      return it;
    });
    const dotsInd = q(gal, '.kh-gal__dot');
    const value = q(gal, '.kh-gal__value');
    const setValue = (i: number) => {
      const c = chars[i];
      value.innerHTML = `<span style="color:${RARITY_INFO[c.rarity].color}">${RARITY_INFO[c.rarity].name}</span> · Değeri <img src="${ASSETS.icon_coin}" alt=""><s>${fmt(c.price)}</s> <b>Sana bedava</b>`;
      dotsInd.style.transform = `translateX(calc(${i} * var(--dot-step)))`;
      gal.querySelectorAll('.kh-gal__dots i').forEach((d, k) => d.classList.toggle('is-on', k === i));
    };
    const spacing = () => car.clientWidth * 0.7;
    const carousel = new Carousel(scope, car, items, {
      spacing,
      shrink: 0.16,
      tilt: 16,
      drop: 0.05,
      sounds: ctx.sounds,
      onChange: i => setValue(i),
      onSettle: i => {
        pts.forEach((p, k) => {
          p.smileIdle = k === i;
          if (k === i) {
            p.pose('gulumseme', 1300);
            p.pop();
          } else p.rest('notr');
        });
      },
      render: (it, d) => {
        // paralaks: portre karttan biraz daha hızlı kayar, ışık hüzmesi döner
        const fig = it.querySelector<HTMLElement>('.kh-gc__fig')!;
        fig.style.transform = `translateX(${(-d * 9).toFixed(1)}%)`;
      },
    });
    // kart yüksekliği alana göre
    const fit = () => {
      const hh = car.clientHeight;
      gal.style.setProperty('--gc-h', `${hh}px`);
      gal.style.setProperty('--gc-w', `${Math.min(car.clientWidth * 0.8, hh * 0.66)}px`);
      carousel.layout();
    };
    scope.on(window, 'resize', fit);
    scope.on(car, 'click', e => {
      const it = (e.target as Element).closest<HTMLElement>('.kh-gc');
      if (!it) return;
      const i = Number(it.dataset.i);
      if (i !== carousel.index) carousel.go(i);
    });
    fit();
    carousel.go(start, false);
    setValue(start);

    // ---- giriş: kartlar kutudan fırlar (ya da atlandıysa aşağıdan yükselir) ----
    play(q(gal, '.kh-gal__head'), [{transform: 'translateY(-30px) scale(.8)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: fromBox ? 520 : 100, easing: EASE.spring, fill: 'backwards'});
    play(q(gal, '.kh-gal__foot'), [{transform: 'translateY(60px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: fromBox ? 760 : 260, easing: EASE.spring, fill: 'backwards'});
    play(q(gal, '.kh-gal__dots'), [{opacity: 0}, {opacity: 1}], {duration: 300, delay: fromBox ? 800 : 300, fill: 'backwards'});
    items.forEach((it, i) => {
      const inner = q(it, '.kh-gc__in');
      if (fromBox) {
        const r = it.getBoundingClientRect();
        const dx = fromBox.x - (r.left + r.width / 2), dy = fromBox.y - (r.top + r.height / 2);
        const rot = (i - start) * 25;
        play(inner, [
          {transform: `translate(${dx}px,${dy}px) scale(.12) rotate(${rot}deg)`, opacity: 0},
          {transform: `translate(${dx * 0.5}px,${dy * 0.6 - 120}px) scale(.45) rotate(${-rot}deg)`, opacity: 1, offset: 0.45},
          {transform: 'none', opacity: 1},
        ], {duration: 720, delay: 60 + Math.abs(i - start) * 90, easing: EASE.out, fill: 'backwards'});
        scope.timeout(() => s.flip?.(), 120 + Math.abs(i - start) * 90);
      } else {
        play(inner, [{transform: 'translateY(40%) scale(.8)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 520, delay: 100 + Math.abs(i - start) * 80, easing: EASE.spring, fill: 'backwards'});
      }
    });
    if (box) {
      // kartlar fırlarken boş kutu küçülüp söner
      play(q(box, '.kh-gift__in'), [{transform: 'none', opacity: 1}, {transform: 'translateY(12%) scale(.7, .55)', opacity: 0}], {duration: 520, delay: 280, easing: EASE.in, fill: 'forwards'});
      play(q(box, '.kh-gift__shadow'), [{opacity: 1}, {opacity: 0}], {duration: 400, delay: 300, fill: 'forwards'});
      scope.timeout(() => box.remove(), 1600);
    }

    return new Promise<CharDef>(res => {
      const take = q(gal, '[data-act=take]') as HTMLButtonElement;
      scope.on(take, 'click', async () => {
        const i = carousel.index;
        if (take.disabled) return;
        take.disabled = true;
        car.style.pointerEvents = 'none';
        s.tap();
        await pick(items, pts, i);
        res(chars[i]);
      });
    });

    /** Seçim anı: diğerleri uçar, seçilen kart döner, konfeti, karakter sözünü söyler. */
    async function pick(items: HTMLElement[], pts: Portrait[], i: number): Promise<void> {
      const c = chars[i];
      const it = items[i];
      const inner = q(it, '.kh-gc__in');
      items.forEach((o, k) => {
        if (k === i) return;
        play(q(o, '.kh-gc__in'), [{transform: 'none', opacity: 1}, {transform: `translate(${k < i ? -40 : 40}%, 30%) rotate(${k < i ? -18 : 18}deg) scale(.7)`, opacity: 0}], {duration: 420, easing: EASE.in, fill: 'forwards'});
      });
      play(q(gal, '.kh-gal__dots'), [{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'});
      play(value, [{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'});
      const takeBtn = q(gal, '.kh-gal__take');
      play(takeBtn, [{transform: 'none', opacity: 1}, {transform: 'translateY(40px) scale(.9)', opacity: 0}], {duration: 260, easing: EASE.in, fill: 'forwards'});
      // döndür: yarıda poz değişir, kart altın kenarlı "kazanıldı" hâline geçer
      s.flip?.();
      await done(play(inner, [{transform: 'none'}, {transform: 'scale(1.08) rotateY(90deg)'}], {duration: 240, easing: EASE.in, fill: 'forwards'}));
      it.classList.add('is-won');
      pts[i].smileIdle = false;
      pts[i].rest('zafer');
      inner.getAnimations().forEach(a => a.cancel());
      fanfare();
      haptic('success');
      play(inner, [{transform: 'scale(1.08) rotateY(-90deg)'}, {transform: 'scale(1.04) rotateY(8deg)', offset: 0.6}, {transform: 'scale(1.02) rotateY(0)'}], {duration: 520, easing: EASE.out, fill: 'forwards'});
      const r = it.getBoundingClientRect();
      ctx.fx.flash(0.6, 420);
      ctx.fx.burst({x: r.left + r.width / 2, y: r.top + r.height * 0.3}, {coins: 0, confetti: 36, power: 1.05});
      scope.timeout(() => {
        ctx.fx.burst({x: r.left + 10, y: r.top + r.height * 0.5}, {coins: 4, confetti: 14, power: 0.8});
        ctx.fx.burst({x: r.right - 10, y: r.top + r.height * 0.5}, {coins: 4, confetti: 14, power: 0.8});
      }, 260);
      stampWord(ctx, 'Senin!', {x: innerWidth / 2, y: r.top + r.height * 0.42}, {size: 4.2, ms: 1500});
      q(gal, '.kh-gal__title').innerHTML = g3('Harika Seçim!');
      bump(q(gal, '.kh-gal__title'), 1.15);
      q(gal, '.kh-gal__sub').innerHTML = `<b>${esc(c.name)}</b> artık senin karakterin.`;
      await scope.wait(700);
      // karakter sözünü söyler
      const say = h('div', 'kh-say kh-gal__say', `<small>${esc(c.name)}</small><div class="kh-say__t"></div>`);
      gal.append(say);
      play(say, [{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(1.05)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 360, easing: EASE.out, fill: 'backwards'});
      const tw = typewriter(scope, q(say, '.kh-say__t'), c.quote, 36);
      const next = h('button', 'kh-btn kh-btn--5 kh-btn--xl kh-btn--block kh-gal__next', `Devam ${I.chevR}`);
      next.dataset.act = 'next';
      q(gal, '.kh-gal__foot').append(next);
      play(next, [{transform: 'translateY(50px) scale(.8)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: 500, easing: EASE.spring, fill: 'backwards'});
      await new Promise<void>(res => scope.on(next, 'click', () => {
        tw.finish();
        s.tap();
        res();
      }));
      // galeri kalkar
      play(gal, [{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(.96)'}], {duration: 280, easing: EASE.in, fill: 'forwards'});
      await scope.wait(280);
      gal.remove();
    }
  }

  // =================================================================== 6: ad
  function askName(c: CharDef): Promise<string> {
    const wrap = h('div', 'kh-name');
    let pool = shuffled(NAMES);
    const chips = () => pool.slice(0, 4).map(n => `<button class="kh-chip kh-name__chip" data-act="sug" data-n="${esc(n)}">${esc(n)}</button>`).join('');
    wrap.innerHTML = `<div class="kh-name__hero"><div class="kh-name__fig"></div></div>
      <div class="kh-say kh-name__say"><small>${esc(c.name)}</small><div class="kh-say__t"></div></div>
      <div class="kh-panel kh-name__panel">
        <div class="kh-title kh-name__title">${g3('Adın Ne?', 'is-white')}</div>
        <label class="kh-name__field"><span class="kh-name__ico">${I.pencil}</span>
          <input class="kh-name__input" type="text" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="Misafir" value="Misafir"></label>
        <div class="kh-name__sugs"><div class="kh-name__chips">${chips()}</div>
          <button class="kh-iconbtn kh-name__dice" data-act="dice" aria-label="Başka öneriler">${I.dice}</button></div>
        <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-shine" data-act="ok">Tamam</button>
      </div>`;
    el.append(wrap);
    const pt = new Portrait(c, {pose: 'gulumseme'});
    q(wrap, '.kh-name__fig').append(pt.el);
    scope.add(() => pt.destroy());
    const input = q<HTMLInputElement>(wrap, '.kh-name__input');
    const sayT = q(wrap, '.kh-say__t');
    play(q(wrap, '.kh-name__hero'), [{transform: 'translateY(-30%) scale(.7)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 520, easing: EASE.spring, fill: 'backwards'});
    play(q(wrap, '.kh-name__panel'), [{transform: 'translateY(40%)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 520, delay: 120, easing: EASE.spring, fill: 'backwards'});
    play(q(wrap, '.kh-name__say'), [{transform: 'scale(.3)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: 380, easing: EASE.spring, fill: 'backwards'});
    scope.timeout(() => typewriter(scope, sayT, 'Masada sana ne diyelim?', 40), 420);
    q(wrap, '.kh-name__chips').querySelectorAll('.kh-chip').forEach((ch, k) =>
      play(ch, [{transform: 'scale(.4)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: 500 + k * 60, easing: EASE.spring, fill: 'backwards'}));
    // yazarken düşünür, durunca gülümser
    let typingT = 0;
    scope.on(input, 'input', () => {
      if (pt.current !== 'dusunceli') pt.pose('dusunceli');
      clearTimeout(typingT);
      typingT = window.setTimeout(() => pt.alive && pt.rest('gulumseme'), 900);
    });
    scope.on(input, 'focus', () => input.select());
    scope.add(() => clearTimeout(typingT));
    return new Promise<string>(res => {
      const finish = () => {
        const v = input.value.trim().replace(/\s+/g, ' ').slice(0, 16) || 'Misafir';
        input.blur();
        s.tap();
        pt.pose('kahkaha');
        play(wrap, [{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-4%)'}], {duration: 300, delay: 160, easing: EASE.in, fill: 'forwards'});
        scope.timeout(() => {
          wrap.remove();
          res(v);
        }, ANIM ? 470 : 0);
      };
      scope.on(input, 'keydown', e => {
        if ((e as KeyboardEvent).key === 'Enter') finish();
      });
      scope.on(wrap, 'click', e => {
        const b = (e.target as Element).closest<HTMLElement>('[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'ok') return finish();
        if (a === 'sug') {
          s.tap();
          const n = b.dataset.n ?? '';
          // öneri harf harf yazılır, karakter güler
          input.value = '';
          let k = 0;
          const tick = () => {
            if (!scope.alive) return;
            input.value = n.slice(0, ++k);
            if (k < n.length) scope.timeout(tick, ANIM ? 28 : 0);
          };
          tick();
          bump(b, 1.1);
          pt.pose('kahkaha', 1400);
          pt.pop();
          sayT.textContent = rnd(NAME_REACT);
          bump(q(wrap, '.kh-name__say'), 1.06);
        } else if (a === 'dice') {
          if (s.shuffle) s.shuffle();
          else s.tap();
          pool = shuffled(NAMES);
          const box = q(wrap, '.kh-name__chips');
          box.innerHTML = chips();
          play(b, [{transform: 'rotate(0)'}, {transform: 'rotate(360deg) scale(1.1)'}], {duration: 420, easing: EASE.out});
          box.querySelectorAll('.kh-chip').forEach((ch, k) =>
            play(ch, [{transform: 'translateY(-14px) scale(.6)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: k * 50, easing: EASE.spring, fill: 'backwards'}));
        }
      });
    });
  }

  // =================================================================== 7: hoş geldin
  async function welcome(c: CharDef, name: string): Promise<void> {
    const w = h('div', 'kh-welc');
    w.innerHTML = `<i class="kh-rays is-gold kh-welc__rays"></i>
      <div class="kh-welc__fig"></div>
      <div class="kh-welc__text"><div class="kh-title kh-welc__l1">${g3('Kahvehaneye', 'is-white')}</div>
        <div class="kh-title kh-welc__l2">${g3('hoş geldin,', 'is-white')}</div>
        <div class="kh-title kh-welc__name">${g3(name + '!')}</div></div>
      <div class="kh-welc__gift"><span>Başlangıç hediyen</span><div class="kh-capsule kh-welc__cap"><img class="kh-capsule__ico" src="${ASSETS.icon_coin}" alt=""><b class="kh-capsule__val kh-num">0</b></div></div>
      <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-shine kh-welc__go" data-act="go">${I.play}Masaya Geç</button>`;
    el.append(w);
    const pt = new Portrait(c, {pose: 'zafer'});
    q(w, '.kh-welc__fig').append(pt.el);
    scope.add(() => pt.destroy());
    s.whoosh();
    play(q(w, '.kh-welc__rays'), [{transform: 'scale(.2)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 900, easing: EASE.out, fill: 'backwards'});
    play(q(w, '.kh-welc__fig'), [{transform: 'translateY(40%) scale(.8)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 600, easing: EASE.spring, fill: 'backwards'});
    ['.kh-welc__l1', '.kh-welc__l2', '.kh-welc__name'].forEach((sel, k) =>
      play(q(w, sel), [{transform: 'translateY(-60px) scale(1.6) rotate(-6deg)', opacity: 0}, {transform: 'scale(.94)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 460, delay: 300 + k * 220, easing: EASE.out, fill: 'backwards'}));
    scope.timeout(() => {
      s.slam?.();
      const r = q(w, '.kh-welc__name').getBoundingClientRect();
      ctx.fx.burst({x: r.left + r.width / 2, y: r.top + r.height / 2}, {coins: 0, confetti: 30, power: 0.95});
    }, 760);
    play(q(w, '.kh-welc__gift'), [{transform: 'translateY(30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, delay: 1000, easing: EASE.spring, fill: 'backwards'});
    play(q(w, '.kh-welc__go'), [{transform: 'translateY(60px) scale(.8)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 460, delay: 1300, easing: EASE.spring, fill: 'backwards'});
    scope.timeout(async () => {
      const cap = q(w, '.kh-welc__cap');
      const ico = center(q(cap, '.kh-capsule__ico'));
      ctx.fx.burst(ico, {coins: 8, confetti: 0, power: 0.6});
      s.coin(3);
      await countUp(scope, q(cap, '.kh-capsule__val'), 0, profile.data.coins, 900);
      bump(cap, 1.12);
    }, ANIM ? 1150 : 0);
    await new Promise<void>(res => scope.on(q(w, '[data-act=go]'), 'click', () => {
      s.tap();
      pt.pose('kahkaha');
      res();
    }));
  }
}

/** Animasyon bitince çözülür (iptalde de). */
function done(a: Animation): Promise<void> {
  if (!ANIM) return Promise.resolve();
  return a.finished.then(() => undefined, () => undefined);
}

/** Hediye kutusu (SVG gövde + ayrı kapak, iç ışık hüzmesi, gölge). */
function giftBox(): HTMLElement {
  const b = h('div', 'kh-gift');
  b.innerHTML = `<i class="kh-gift__shadow"></i><i class="kh-rays is-gold kh-gift__rays"></i>
    <div class="kh-gift__in">
      <svg class="kh-gift__body" viewBox="0 0 200 150" aria-hidden="true">
        <defs><linearGradient id="gfb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a8e"/><stop offset=".45" stop-color="#ff2e4d"/><stop offset="1" stop-color="#a8001e"/></linearGradient>
          <linearGradient id="gfr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb21a"/><stop offset=".45" stop-color="#fff27a"/><stop offset="1" stop-color="#e57a00"/></linearGradient></defs>
        <rect x="8" y="6" width="184" height="138" rx="16" fill="url(#gfb)" stroke="#0a1033" stroke-width="7"/>
        <rect x="84" y="6" width="32" height="138" fill="url(#gfr)" stroke="#0a1033" stroke-width="5"/>
        <path d="M20 22 Q60 14 80 18" stroke="#fff" stroke-opacity=".5" stroke-width="7" fill="none" stroke-linecap="round"/>
        <g fill="#fff" fill-opacity=".22"><path d="M40 70 l7 7-7 7-7-7z"/><path d="M150 96 l7 7-7 7-7-7z"/><circle cx="148" cy="44" r="6"/><circle cx="46" cy="118" r="5"/></g>
      </svg>
      <div class="kh-gift__lid"><svg viewBox="0 0 230 110" aria-hidden="true">
        <defs><linearGradient id="gfl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a9a"/><stop offset=".5" stop-color="#ff2e4d"/><stop offset="1" stop-color="#c40a2f"/></linearGradient>
          <linearGradient id="gfr2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#e57a00"/></linearGradient></defs>
        <path d="M115 52 C 82 6, 34 18, 58 46 C 70 60, 100 56, 115 52 Z" fill="url(#gfr2)" stroke="#0a1033" stroke-width="6" stroke-linejoin="round"/>
        <path d="M115 52 C 148 6, 196 18, 172 46 C 160 60, 130 56, 115 52 Z" fill="url(#gfr2)" stroke="#0a1033" stroke-width="6" stroke-linejoin="round"/>
        <rect x="6" y="50" width="218" height="54" rx="14" fill="url(#gfl)" stroke="#0a1033" stroke-width="7"/>
        <rect x="97" y="50" width="36" height="54" fill="url(#gfr2)" stroke="#0a1033" stroke-width="5"/>
        <circle cx="115" cy="50" r="14" fill="url(#gfr2)" stroke="#0a1033" stroke-width="6"/>
        <path d="M20 64 Q60 58 84 60" stroke="#fff" stroke-opacity=".55" stroke-width="6" fill="none" stroke-linecap="round"/>
      </svg></div>
    </div>
    <i class="kh-gift__spark is-a"></i><i class="kh-gift__spark is-b"></i><i class="kh-gift__spark is-c"></i>`;
  return b;
}

