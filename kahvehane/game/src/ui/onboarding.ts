// İlk açılış hikâyesi: karanlık → kahvehane lambası yanar, arena aydınlanır → Kahveci Dursun karşılar (daktilo balon) →
// hediye kutusu kıpırdar, dokununca patlar, içinden dört karakter kartı fırlar → kaydırmalı hediye galerisi (momentum + oturma,
// komşular görünür) → seçilen kart döner, konfeti, damga; kartın söz kutusunda karakterin sözü daktiloyla yazılır →
// "Adın ne?" → hoş geldin. Hikâye kısmı "Geç" ile atlanır (doğrudan galeriye). Sonunda profile.completeOnboarding(karakter, ad).
//
// Görsel kural: her karakter ekranda TEK görseldir (poz değişimi yok), yalnız hafif nefes alır. Balonlar yüze asla binmez:
// hikâyede logo → balon şeridi → karakter (yüz balonun altında, gövde ekran kenarında kesilir) dizilir.
// Performans: boşta en çok iki küçük döngü; dönen dev ışık hüzmesi yok (ışınlar bir kez SVG'ye pişirilir, durağan);
// hareket eden hiçbir şeyde filtre/maske yok; giriş animasyonları ≤ 8 öğe, kısa ve kademeli.
import './onboarding.css';
import type {Profile as GameProfile} from '../game/profile';
import {ROSTER, type CharDef} from '../game/roster';
import {RARITY_INFO} from '../game/catalog';
import {ANIM, EASE, Scope, bump, center, countUp, esc, fmt, h, play, q, rnd} from './dom';
import {ASSETS} from './assets';
import {I, suitSvg, type SuitKey} from './icons';
import {Carousel, Portrait, arenaHtml, decorLoops, faceRect, placeBubble, rarityHtml, shuffled, stampWord, starsHtml, typeText, wordmarkHtml, type Ctx} from './parts';
import {g3} from './fx';
import {haptic} from '../platform/bridge';

const HOST = 'dursun';
const SUIT_OF: Record<string, SuitKey> = {riza: 'd', cem: 's', dursun: 'h', defne: 'c'};

/** Dursun'un karşılama replikleri (tek görsel: gülümseme; satırlar arasında poz değişmez). */
const WELCOME = [
  'Hoş geldin evlat! Ben Kahveci Dursun, bu kahvehane benim.',
  'Çaylar demlendi, masalar kuruldu. Bir tek sen eksiktin!',
  'İlk gününe özel sana küçük bir hediyemiz var…',
];

/** İsim önerileri (çipler; zar yeniden karıştırır). */
const NAMES = ['Pişti Kralı', 'Vale Avcısı', 'Çaycı Usta', 'Şanslı Kedi', 'Kara Vale', 'Masa Bekçisi', 'Karo Onlu', 'Sinek İkili', 'Kahve Falcısı',
  'Deste Ustası', 'Mahalle Yıldızı', 'Gece Kuşu', 'Bıyıklı Usta', 'Sessiz Fırtına', 'Çay Tiryakisi', 'Son El'];

/** Ad ekranındaki ilk soru ve seçilen ada karakterin tepkisi (balon boyu en uzun satıra göre bir kez ayrılır). */
const NAME_ASK = 'Masada sana ne diyelim?';
const NAME_REACT = ['Hah, yakıştı!', 'Bu isimle masada korkulur!', 'Oo, çok havalı!', 'Beğendim bunu!', 'Tam bir usta ismi!'];

/**
 * Pişmiş ışık hüzmesi: kamalar SVG'de radyal degradeyle (merkez parlak → kenar saydam) boyanır. Maske gerekmez,
 * bir kez çizilir; arka plan resmi olarak durağan kullanılır (dönmez).
 */
function raysBg(rgb: string, n = 18, a = 0.5): string {
  const step = 360 / n, half = step * 0.32;
  const wedge = (k: number) => {
    const a0 = ((k * step - half) * Math.PI) / 180, a1 = ((k * step + half) * Math.PI) / 180;
    return `M50 50L${(50 + 70 * Math.cos(a0)).toFixed(2)} ${(50 + 70 * Math.sin(a0)).toFixed(2)}L${(50 + 70 * Math.cos(a1)).toFixed(2)} ${(50 + 70 * Math.sin(a1)).toFixed(2)}Z`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="rgb(${rgb})" stop-opacity="${a}"/><stop offset=".45" stop-color="rgb(${rgb})" stop-opacity="${(a * 0.45).toFixed(2)}"/><stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/></radialGradient></defs>
    <path fill="url(#g)" d="${Array.from({length: n}, (_, k) => wedge(k)).join('')}"/></svg>`;
  // tek tırnak: style="--rays:…" özniteliğinin içine güvenle yazılır (encodeURIComponent tek tırnağı kaçırmaz; SVG'de yok)
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}

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
        <ellipse cx="60" cy="112" rx="38" ry="8" fill="#02030f" fill-opacity=".3"/>
        <path d="M24 106 Q60 52 96 106 Z" fill="url(#obsh)" stroke="#0a1033" stroke-width="5" stroke-linejoin="round"/>
        <ellipse cx="60" cy="106" rx="36" ry="7" fill="#fff6c8" stroke="#0a1033" stroke-width="4"/>
        <path d="M38 92 Q50 74 62 70" stroke="#fff" stroke-opacity=".55" stroke-width="4" fill="none" stroke-linecap="round"/>
        <defs><linearGradient id="obsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3dff86"/><stop offset=".55" stop-color="#16c45b"/><stop offset="1" stop-color="#087a35"/></linearGradient></defs>
      </svg></div>
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
  // "dokun" ipucu: belirince birkaç kez nefes gibi yanıp söner, sonra durur (sonsuz döngü yok)
  let hintA: Animation | null = null;
  const showHint = (on: boolean) => {
    if (hint.classList.contains('is-on') === on) return;
    hint.classList.toggle('is-on', on);
    hintA?.cancel();
    hintA = on && decorLoops() ? play(hint, [{opacity: 1}, {opacity: 0.5}, {opacity: 1}], {duration: 1800, delay: 1400, iterations: 3, easing: 'ease-in-out'}, 0) : null;
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
    // 1) karanlık → lamba titreyerek yanar (zemin durağan; karanlık örtü kalkarken ortaya çıkar)
    await scope.wait(450);
    if (skipped) return lightsInstant();
    s.tap();
    haptic('light');
    play(dark, [{opacity: 1}, {opacity: 0.35, offset: 0.1}, {opacity: 0.95, offset: 0.18}, {opacity: 0.2, offset: 0.3}, {opacity: 0.75, offset: 0.38}, {opacity: 0, offset: 0.6}, {opacity: 0}], {duration: 1300, easing: 'linear', fill: 'forwards'});
    play(lamp, [{transform: 'translateY(-40%)'}, {transform: 'translateY(4%)', offset: 0.6}, {transform: 'none'}], {duration: 500, easing: EASE.out, fill: 'backwards'});
    scope.timeout(() => s.tap(), 260);
    await scope.wait(700);
    if (skipped) return lightsInstant();
    s.whoosh();
    logo.style.visibility = 'visible';
    play(logo, [{transform: 'translate(-50%,0) scale(.5)', opacity: 0}, {transform: 'translate(-50%,0) scale(1.05)', opacity: 1, offset: 0.65}, {transform: 'translate(-50%,0)', opacity: 1}], {duration: 340, easing: EASE.out, fill: 'backwards'});
    await scope.wait(500);
    if (skipped) return lightsInstant();

    // 2) Dursun karşılar: logo → balon şeridi → karakter (yüz balonun altında; gövde ekranın altında kesilir)
    const host = ROSTER.find(c => c.id === HOST)!;
    const pt = new Portrait(host, {pose: 'gulumseme', cls: 'kh-ob__host', fade: true});
    const say = h('div', 'kh-say kh-ob__say', `<small>${esc(host.name)}</small><div class="kh-say__t"></div>`);
    stage.append(say, pt.el);
    scope.add(() => pt.destroy());
    // balonun boyu en uzun repliğe göre bir kez ayrılır; karakter balonun hemen altından başlar
    let tw = typeText(scope, q(say, '.kh-say__t'), WELCOME[0], 40, WELCOME);
    tw.finish();
    layoutStory(say, pt.el);
    scope.on(window, 'resize', () => layoutStory(say, pt.el));
    s.whoosh();
    play(pt.el, [{transform: 'translateY(40%)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, easing: EASE.outQuart, fill: 'backwards'});
    await scope.wait(300);
    for (let i = 0; i < WELCOME.length && !skipped; i++) {
      const line = WELCOME[i];
      if (i === 0) {
        say.style.visibility = 'visible';
        play(say, [{transform: 'scale(.5)', opacity: 0}, {transform: 'scale(1.03)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 280, easing: EASE.out});
      } else pt.pop();
      tw = typeText(scope, q(say, '.kh-say__t'), line, 40, WELCOME);
      showHint(true);
      // dokunma: önce yazıyı tamamlar, sonra ilerletir
      await Promise.race([tw.done, waitTap()]);
      if (tw.typing()) {
        tw.finish();
        await tapOr(2600);
      } else await tapOr(1300 + line.length * 30);
      s.tap();
    }
    showHint(false);
    if (skipped) return lightsInstant();

    // 3) hediye kutusu: Dursun sol alt köşeye çekilir (aynı görsel, nefes durur), kutu düşer, kıpırdar
    pt.breathe(false);
    const corner = cornerMove(pt.el);
    play(pt.el, [{transform: 'none'}, {transform: corner}], {duration: 460, easing: EASE.inOut, fill: 'forwards'});
    play(say, [{transform: 'none', opacity: 1}, {transform: 'scale(.6)', opacity: 0}], {duration: 200, easing: EASE.in, fill: 'forwards'});
    play(logo, [{transform: 'translate(-50%,0)', opacity: 1}, {transform: 'translate(-50%,-30%) scale(.8)', opacity: 0}], {duration: 300, easing: EASE.in, fill: 'forwards'});
    const say2 = h('div', 'kh-say kh-ob__say2', `<div class="kh-say__t">Hadi, aç bakalım!</div>`);
    say2.style.visibility = 'hidden';
    stage.append(say2);
    scope.timeout(() => {
      if (placeBubble(say2, stage, faceRect(pt), stage.getBoundingClientRect(), {maxW: innerWidth * 0.6})) {
        say2.style.visibility = 'visible';
        play(say2, [{transform: 'scale(.5)', opacity: 0}, {transform: 'scale(1.04)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 280, easing: EASE.out});
      }
    }, ANIM ? 500 : 0);
    const box = giftBox();
    stage.append(box);
    s.whoosh();
    await done(play(box, [{transform: 'translate(-50%, -160%) rotate(-12deg)'}, {transform: 'translate(-50%, 0) rotate(3deg)', offset: 0.55}, {transform: 'translate(-50%, -12%) rotate(-2deg)', offset: 0.72}, {transform: 'translate(-50%, 0) rotate(0)'}], {duration: 700, easing: EASE.in, fill: 'backwards'}));
    s.slam?.();
    haptic('medium');
    play(q(box, '.kh-gift__shadow'), [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.15)', opacity: 1, offset: 0.5}, {transform: 'none', opacity: 1}], {duration: 340, easing: EASE.out});
    play(q(box, '.kh-gift__body'), [{transform: 'scale(1.12, .84)'}, {transform: 'scale(.96, 1.05)', offset: 0.5}, {transform: 'none'}], {duration: 340, easing: EASE.out});
    // bekleme döngüleri (kutu kıpırtısı, el işareti) WAAPI: tutamağı bizde, dokununca kesin iptal edilir
    const wiggle = play(q(box, '.kh-gift__in'), [
      {transform: 'none', offset: 0}, {transform: 'none', offset: 0.58}, {transform: 'rotate(-7deg) scale(1.03, .97)', offset: 0.64},
      {transform: 'rotate(6deg) scale(.98, 1.03)', offset: 0.71}, {transform: 'rotate(-4deg)', offset: 0.78}, {transform: 'rotate(2deg) translateY(-3%)', offset: 0.85},
      {transform: 'none', offset: 0.92}, {transform: 'none', offset: 1},
    ], {duration: 2100, delay: 400, iterations: decorLoops() ? Infinity : 2, easing: 'ease-in-out'}, 0);
    const cta = h('div', 'kh-ob__cta', `${I.hand}<span>Hediyeni aç!</span>`);
    stage.append(cta);
    play(cta, [{transform: 'translate(-50%, 20px)', opacity: 0}, {transform: 'translate(-50%, 0)', opacity: 1}], {duration: 320, delay: 160, easing: EASE.spring, fill: 'backwards'});
    const bob = play(q(cta, '.kh-i'), [{transform: 'none'}, {transform: 'translateY(-3px) scale(1.08)'}, {transform: 'none'}], {duration: 1000, iterations: decorLoops() ? Infinity : 2, easing: 'ease-in-out'}, 0);
    scope.add(() => {
      wiggle.cancel();
      bob.cancel();
    });
    await waitTap();
    wiggle.cancel();
    bob.cancel();
    if (skipped) return lightsInstant();
    play(cta, [{opacity: 1}, {opacity: 0}], {duration: 160, fill: 'forwards'}).onfinish = () => cta.remove();
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
    ctx.fx.flash(0.7, 460);
    const c = center(q(box, '.kh-gift__body'));
    ctx.fx.burst({x: c.x, y: c.y - 20}, {coins: 8, confetti: 28, power: 1.05});
    play(body, [{transform: 'scale(1.18, .78)'}, {transform: 'scale(.92, 1.1)', offset: 0.4}, {transform: 'none'}], {duration: 380, easing: EASE.out, fill: 'forwards'});
    play(q(box, '.kh-gift__lid'), [{transform: 'none', opacity: 1}, {transform: 'translate(40%, -380%) rotate(48deg)', opacity: 1, offset: 0.7}, {transform: 'translate(60%, -520%) rotate(70deg)', opacity: 0}], {duration: 800, easing: EASE.out, fill: 'forwards'});
    play(q(box, '.kh-gift__rays'), [{transform: 'scale(.2) rotate(0)', opacity: 0}, {transform: 'scale(1) rotate(25deg)', opacity: 1, offset: 0.3}, {transform: 'scale(1.15) rotate(60deg)', opacity: 0}], {duration: 1300, easing: 'ease-out', fill: 'forwards'});
    // Dursun sahneden iner ve kaldırılır (galeride alt kenarda başı görünmesin)
    play(pt.el, [{transform: corner, opacity: 1}, {transform: `${corner} translateY(110%)`, opacity: 0}], {duration: 380, delay: 100, easing: EASE.in, fill: 'forwards'}).onfinish = () => pt.destroy();
    play(say2, [{opacity: 1}, {opacity: 0}], {duration: 180, fill: 'forwards'}).onfinish = () => say2.remove();
    await scope.wait(260);
    return true;
  }

  /**
   * Hikâye yerleşimi: balon logonun altında (sabit genişlik, en uzun satıra göre ayrılmış boy), karakter balonun altından
   * başlar; kuyruk ucu en çok saç tepesine değer, yüze asla. Kısa ekranda logo küçülür (CSS) ve karakter aşağı kayar.
   */
  function layoutStory(say: HTMLElement, host: HTMLElement): void {
    const st = stage.getBoundingClientRect();
    const lr = g('.kh-ob__logo').getBoundingClientRect();
    say.style.top = `${Math.round(lr.bottom - st.top + 4)}px`;
    const sr = say.getBoundingClientRect();
    const w = host.getBoundingClientRect().width;
    // kuyruk 16 px; yüz kutusu görselin %7'sinden başlar → yüz kuyruğun ucunun altında kalır
    host.style.top = `${Math.round(sr.bottom - st.top + 18 - w * 0.07)}px`;
  }

  /** Köşeye çekilme: karakter sol alta küçülür; baş ve omuzlar görünür kalır. */
  function cornerMove(hostEl: HTMLElement): string {
    const r = hostEl.getBoundingClientRect();
    const k = Math.min(0.62, (innerHeight * 0.36) / r.height);
    const tw = r.width * k;
    const tx = -tw * 0.18 - r.left, ty = innerHeight - tw * 0.72 - r.top;
    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(3)})`;
  }

  /** Atlanınca: ışıklar anında yanar, hikâye öğeleri kalkar. */
  function lightsInstant(): false {
    showHint(false);
    const dark = g('.kh-ob__dark');
    dark.getAnimations().forEach(a => a.cancel());
    play(dark, [{opacity: Number(getComputedStyle(dark).opacity)}, {opacity: 0}], {duration: 300, fill: 'forwards'});
    g('.kh-ob__logo').style.visibility = 'hidden';
    stage.querySelectorAll('.kh-pt, .kh-say, .kh-gift, .kh-ob__cta').forEach(n => n.remove());
    return false;
  }

  // =================================================================== 4-5: hediye galerisi
  function gallery(): Promise<CharDef> {
    skipBtn.style.display = 'none';
    showHint(false);
    const lampEl = g('.kh-ob__lamp');
    play(lampEl, [{transform: 'none', opacity: 1}, {transform: 'translateY(-30%)', opacity: 0}], {duration: 400, easing: EASE.in, fill: 'forwards'});
    const box = stage.querySelector<HTMLElement>('.kh-gift');
    const fromBox = box ? center(q(box, '.kh-gift__body')) : null;
    const gal = h('div', 'kh-gal');
    const chars = ROSTER.slice();
    // en tatlı başlangıç: ortada Dursun (ev sahibi), sağında/solunda diğerleri
    const start = Math.max(0, chars.findIndex(c => c.id === HOST));
    const rays = raysBg('255, 255, 255', 16, 0.32);
    gal.innerHTML = `<header class="kh-gal__head"><div class="kh-title kh-gal__title">${g3('Hediyeni Seç!')}</div>
        <div class="kh-gal__sub">Dört usta, tek seçim. Seçtiğin karakter <b>senin</b> olur.</div></header>
      <div class="kh-gal__car kh-car"></div>
      <div class="kh-gal__dots">${chars.map((_, i) => `<i data-i="${i}"></i>`).join('')}<b class="kh-gal__dot"></b></div>
      <div class="kh-gal__foot">
        <div class="kh-gal__value"></div>
        <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-gal__take" data-act="take">${I.gift}Ücretsiz Al</button>
      </div>`;
    el.append(gal);
    const car = q(gal, '.kh-gal__car');
    const pts: Portrait[] = [];
    const items = chars.map((c, i) => {
      const it = h('div', 'kh-car__item kh-gc');
      it.dataset.i = String(i);
      it.style.setProperty('--c', c.color);
      it.innerHTML = `<div class="kh-gc__in"><div class="kh-gc__card is-${c.rarity}">
          <i class="kh-gc__rays" style="--rays:${rays}"></i><span class="kh-gc__suit">${suitSvg(SUIT_OF[c.id] ?? 'h')}</span>
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
      // tek, durağan poz (nötr); yalnız ortadaki kart nefes alır
      const pt = new Portrait(c, {pose: 'notr', breathe: false});
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
    const breatheOnly = (i: number) => pts.forEach((p, k) => p.breathe(k === i));
    // ---- tanıtım: kart oturunca (~250 ms) karakter kendini tanıtır (ses + söz kutusunda yazı); kaydırınca hemen susar.
    // Konuşma tek yöneticiden (ctx.talk); kaydırmayı hiç bekletmez (yalnız bir zamanlayıcı + iptal).
    let introT = 0;
    let introReady = false;
    let picked = false;
    const quoteOf = (i: number) => q(items[i], '.kh-gc__quote');
    const introBubble = (i: number) => ({
      show: (text: string) => {
        const el = quoteOf(i);
        el.textContent = text;
        el.classList.add('is-speaking');
      },
      hide: () => {
        if (picked || !scope.alive) return;
        const el = quoteOf(i);
        el.textContent = chars[i].quote;
        el.classList.remove('is-speaking');
      },
    });
    const hush = () => {
      clearTimeout(introT);
      introT = 0;
      ctx.talk?.stop();
    };
    const intro = (i: number, wait = 250) => {
      clearTimeout(introT);
      if (!introReady || picked || !ctx.talk) return;
      introT = scope.timeout(() => {
        introT = 0;
        if (!picked && carousel.index === i) ctx.talk?.say(chars[i].id, 'galleryIntro', introBubble(i));
      }, wait);
    };
    scope.add(() => ctx.talk?.stop());
    const spacing = () => car.clientWidth * 0.7;
    const carousel = new Carousel(scope, car, items, {
      spacing,
      shrink: 0.16,
      tilt: 16,
      drop: 0.05,
      sounds: ctx.sounds,
      onChange: i => {
        setValue(i);
        breatheOnly(-1);
        hush();
      },
      onSettle: i => {
        breatheOnly(i);
        intro(i);
      },
    });
    // kart ölçüsü alana göre. Portre kartın üstünden taşar: başlığa binmesin diye vitrin o kadar aşağıdan başlar.
    // Hikâye metni sığan satır kadar gösterilir (yarım satır kesilmez, sonda …).
    const baseTop = parseFloat(getComputedStyle(car).marginTop) || 0;
    const fit = () => {
      for (let k = 0; k < 3; k++) {
        const hh = car.clientHeight;
        const w = Math.min(car.clientWidth * 0.8, hh * 0.66);
        gal.style.setProperty('--gc-h', `${hh}px`);
        gal.style.setProperty('--gc-w', `${w}px`);
        // portre: kart genişliğinin %108'i kare, kartın %56'sına oturur; saç tepesi görselin ~%4'ünde
        const pop = 1.08 * (w - 7) * 0.96 - (0.08 + 0.56 * 0.92) * hh;
        const mt = Math.round(Math.max(baseTop, pop + 6));
        if (Math.abs((parseFloat(car.style.marginTop) || baseTop) - mt) < 2) break;
        car.style.marginTop = `${mt}px`;
      }
      carousel.layout();
      items.forEach(it => {
        const p = q(it, '.kh-gc__story');
        p.style.flexGrow = '1';
        p.style.webkitLineClamp = '40';
        const lh = parseFloat(getComputedStyle(p).lineHeight) || 12;
        const n = Math.floor((p.clientHeight + 2) / lh);
        // kutu kırpılan satır kadar kısalır: kalan satırlar boyanmaz
        p.style.flexGrow = '0';
        p.style.webkitLineClamp = String(Math.max(1, n));
        p.style.visibility = n < 1 ? 'hidden' : '';
      });
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

    // ---- giriş: kartlar kutudan fırlar (ya da atlandıysa aşağıdan yükselir); en çok 7 öğe, kademeli ----
    play(q(gal, '.kh-gal__head'), [{transform: 'translateY(-24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: fromBox ? 420 : 80, easing: EASE.outQuart, fill: 'backwards'});
    play(q(gal, '.kh-gal__foot'), [{transform: 'translateY(40px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: fromBox ? 560 : 200, easing: EASE.outQuart, fill: 'backwards'});
    play(q(gal, '.kh-gal__dots'), [{opacity: 0}, {opacity: 1}], {duration: 240, delay: fromBox ? 620 : 240, fill: 'backwards'});
    items.forEach((it, i) => {
      const inner = q(it, '.kh-gc__in');
      const dist = Math.abs(i - start);
      if (fromBox) {
        const r = it.getBoundingClientRect();
        const dx = fromBox.x - (r.left + r.width / 2), dy = fromBox.y - (r.top + r.height / 2);
        const rot = (i - start) * 25;
        play(inner, [
          {transform: `translate(${dx}px,${dy}px) scale(.12) rotate(${rot}deg)`, opacity: 0},
          {transform: `translate(${dx * 0.5}px,${dy * 0.6 - 100}px) scale(.45) rotate(${-rot}deg)`, opacity: 1, offset: 0.45},
          {transform: 'none', opacity: 1},
        ], {duration: 350, delay: 40 + dist * 60, easing: EASE.out, fill: 'backwards'});
        scope.timeout(() => s.flip?.(), 80 + dist * 60);
      } else {
        play(inner, [{transform: 'translateY(30%) scale(.86)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, delay: 60 + dist * 60, easing: EASE.outQuart, fill: 'backwards'});
      }
    });
    // ortadaki kart giriş bittikten sonra nefes almaya başlar (giriş sırasında döngü yok); ilk tanıtım da girişten sonra
    scope.timeout(() => {
      breatheOnly(carousel.index);
      introReady = true;
      intro(carousel.index, 200);
    }, ANIM ? (fromBox ? 700 : 500) : 0);
    if (box) {
      // kartlar fırlarken boş kutu küçülüp söner
      play(q(box, '.kh-gift__in'), [{transform: 'none', opacity: 1}, {transform: 'translateY(12%) scale(.7, .55)', opacity: 0}], {duration: 420, delay: 220, easing: EASE.in, fill: 'forwards'});
      play(q(box, '.kh-gift__shadow'), [{opacity: 1}, {opacity: 0}], {duration: 320, delay: 240, fill: 'forwards'});
      scope.timeout(() => box.remove(), 1400);
    }

    return new Promise<CharDef>(res => {
      const take = q(gal, '[data-act=take]') as HTMLButtonElement;
      scope.on(take, 'click', async () => {
        const i = carousel.index;
        if (take.disabled) return;
        take.disabled = true;
        hush();
        picked = true;
        car.style.pointerEvents = 'none';
        s.tap();
        await pick(items, pts, i);
        res(chars[i]);
      });
    });

    /**
     * Seçim anı: diğerleri uçar, seçilen kart döner (aynı görsel; poz değişmez), konfeti + damga. Ayrı balon yok:
     * kartın söz kutusu temizlenir ve karakterin sözü orada daktiloyla yeniden yazılır (kutu boyu sabit).
     */
    async function pick(items: HTMLElement[], pts: Portrait[], i: number): Promise<void> {
      const c = chars[i];
      const it = items[i];
      const inner = q(it, '.kh-gc__in');
      items.forEach((o, k) => {
        if (k === i) return;
        play(q(o, '.kh-gc__in'), [{transform: 'none', opacity: 1}, {transform: `translate(${k < i ? -40 : 40}%, 30%) rotate(${k < i ? -18 : 18}deg) scale(.7)`, opacity: 0}], {duration: 340, easing: EASE.in, fill: 'forwards'});
      });
      play(q(gal, '.kh-gal__dots'), [{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'});
      play(value, [{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'});
      const takeBtn = q(gal, '.kh-gal__take');
      play(takeBtn, [{transform: 'none', opacity: 1}, {transform: 'translateY(40px) scale(.9)', opacity: 0}], {duration: 240, easing: EASE.in, fill: 'forwards'});
      // döndür: yarıda kart altın kenarlı "kazanıldı" hâline geçer (görsel aynı kalır)
      pts[i].breathe(false);
      s.flip?.();
      await done(play(inner, [{transform: 'none'}, {transform: 'scale(1.06) rotateY(90deg)'}], {duration: 220, easing: EASE.in, fill: 'forwards'}));
      it.classList.add('is-won');
      inner.getAnimations().forEach(a => a.cancel());
      fanfare();
      haptic('success');
      play(inner, [{transform: 'scale(1.06) rotateY(-90deg)'}, {transform: 'scale(1.03) rotateY(8deg)', offset: 0.6}, {transform: 'scale(1.02) rotateY(0)'}], {duration: 420, easing: EASE.out, fill: 'forwards'});
      const r = it.getBoundingClientRect();
      ctx.fx.flash(0.45, 380);
      ctx.fx.burst({x: r.left + r.width / 2, y: r.top + r.height * 0.3}, {coins: 4, confetti: 30, power: 1});
      stampWord(ctx, 'Senin!', {x: innerWidth / 2, y: r.top + r.height * 0.36}, {size: 4.2, ms: 1400});
      const title = q(gal, '.kh-gal__title');
      title.innerHTML = g3('Harika Seçim!');
      bump(title, 1.1);
      q(gal, '.kh-gal__sub').innerHTML = `<b>${esc(c.name)}</b> artık senin karakterin.`;
      await scope.wait(620);
      pts[i].breathe(true);
      // söz kutusunda sözünü söyler (balon yok; yüze hiçbir şey binmez)
      const quote = q(it, '.kh-gc__quote');
      quote.classList.add('is-speaking');
      const tw = typeText(scope, quote, c.quote, 34);
      const next = h('button', 'kh-btn kh-btn--5 kh-btn--xl kh-btn--block kh-gal__next', `Devam ${I.chevR}`);
      next.dataset.act = 'next';
      q(gal, '.kh-gal__foot').append(next);
      play(next, [{transform: 'translateY(40px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: 380, easing: EASE.outQuart, fill: 'backwards'});
      await new Promise<void>(res => scope.on(next, 'click', () => {
        tw.finish();
        s.tap();
        res();
      }));
      // galeri kalkar
      play(gal, [{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(.97)'}], {duration: 260, easing: EASE.in, fill: 'forwards'});
      await scope.wait(260);
      pts.forEach(p => p.destroy());
      gal.remove();
    }
  }

  // =================================================================== 6: ad
  function askName(c: CharDef): Promise<string> {
    const wrap = h('div', 'kh-name');
    let pool = shuffled(NAMES);
    const chips = () => pool.slice(0, 4).map(n => `<button class="kh-chip kh-name__chip" data-act="sug" data-n="${esc(n)}">${esc(n)}</button>`).join('');
    wrap.innerHTML = `<div class="kh-name__hero"><div class="kh-name__fig"></div>
        <div class="kh-say kh-name__say"><div class="kh-say__t"></div></div></div>
      <div class="kh-panel kh-name__panel">
        <div class="kh-title kh-name__title">${g3('Adın Ne?', 'is-white')}</div>
        <label class="kh-name__field"><span class="kh-name__ico">${I.pencil}</span>
          <input class="kh-name__input" type="text" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="Misafir" value="Misafir"></label>
        <div class="kh-name__sugs"><div class="kh-name__chips">${chips()}</div>
          <button class="kh-iconbtn kh-name__dice" data-act="dice" aria-label="Başka öneriler">${I.dice}</button></div>
        <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block" data-act="ok">Tamam</button>
      </div>`;
    el.append(wrap);
    // tek görsel (gülümseme): yazarken/öneri seçerken poz değişmez, yalnız küçük bir "pop"
    const pt = new Portrait(c, {pose: 'gulumseme', fade: true});
    q(wrap, '.kh-name__fig').append(pt.el);
    scope.add(() => pt.destroy());
    const input = q<HTMLInputElement>(wrap, '.kh-name__input');
    const hero = q(wrap, '.kh-name__hero');
    const say = q(wrap, '.kh-name__say');
    const sayT = q(say, '.kh-say__t');
    const reserve = [NAME_ASK, ...NAME_REACT];
    typeText(scope, sayT, NAME_ASK, 40, reserve).finish();
    say.style.visibility = 'hidden';
    play(hero, [{transform: 'translateY(-12%)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, easing: EASE.outQuart, fill: 'backwards'});
    play(q(wrap, '.kh-name__panel'), [{transform: 'translateY(30%)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, delay: 80, easing: EASE.outQuart, fill: 'backwards'});
    q(wrap, '.kh-name__chips').querySelectorAll('.kh-chip').forEach((ch, k) =>
      play(ch, [{transform: 'scale(.6)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 260, delay: 260 + k * 50, easing: EASE.spring, fill: 'backwards'}));
    const placeSay = () => placeBubble(say, hero, faceRect(pt), hero.getBoundingClientRect(), {maxW: Math.min(hero.clientWidth * 0.66, 300)});
    scope.timeout(() => {
      if (!placeSay()) return;
      say.style.visibility = 'visible';
      play(say, [{transform: 'scale(.5)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 280, easing: EASE.spring, fill: 'backwards'});
      typeText(scope, sayT, NAME_ASK, 40, reserve);
    }, ANIM ? 380 : 0);
    scope.on(window, 'resize', () => placeSay());
    scope.on(input, 'focus', () => input.select());
    return new Promise<string>(res => {
      const finish = () => {
        const v = input.value.trim().replace(/\s+/g, ' ').slice(0, 16) || 'Misafir';
        input.blur();
        s.tap();
        pt.pop();
        play(wrap, [{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-4%)'}], {duration: 280, delay: 140, easing: EASE.in, fill: 'forwards'});
        scope.timeout(() => {
          pt.destroy();
          wrap.remove();
          res(v);
        }, ANIM ? 440 : 0);
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
          // öneri harf harf yazılır, karakter tepki verir (aynı görsel + pop)
          input.value = '';
          let k = 0;
          const tick = () => {
            if (!scope.alive) return;
            input.value = n.slice(0, ++k);
            if (k < n.length) scope.timeout(tick, ANIM ? 28 : 0);
          };
          tick();
          bump(b, 1.08);
          pt.pop();
          typeText(scope, sayT, rnd(NAME_REACT), 44, reserve);
        } else if (a === 'dice') {
          if (s.shuffle) s.shuffle();
          else s.tap();
          pool = shuffled(NAMES);
          const box = q(wrap, '.kh-name__chips');
          box.innerHTML = chips();
          play(b, [{transform: 'rotate(0)'}, {transform: 'rotate(360deg)'}], {duration: 380, easing: EASE.out});
          box.querySelectorAll('.kh-chip').forEach((ch, k) =>
            play(ch, [{transform: 'translateY(-10px) scale(.7)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 260, delay: k * 40, easing: EASE.spring, fill: 'backwards'}));
        }
      });
    });
  }

  // =================================================================== 7: hoş geldin
  async function welcome(c: CharDef, name: string): Promise<void> {
    const w = h('div', 'kh-welc');
    w.innerHTML = `<i class="kh-welc__rays" style="--rays:${raysBg('255, 222, 110', 22, 0.55)}"></i>
      <div class="kh-welc__fig"></div>
      <div class="kh-welc__text"><div class="kh-title kh-welc__l1">${g3('Kahvehaneye', 'is-white')}</div>
        <div class="kh-title kh-welc__l2">${g3('hoş geldin,', 'is-white')}</div>
        <div class="kh-title kh-welc__name">${g3(name + '!')}</div></div>
      <div class="kh-welc__gift"><span>Başlangıç hediyen</span><div class="kh-capsule kh-welc__cap"><img class="kh-capsule__ico" src="${ASSETS.icon_coin}" alt=""><b class="kh-capsule__val kh-num">0</b></div></div>
      <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-welc__go" data-act="go">${I.play}Masaya Geç</button>`;
    el.append(w);
    const pt = new Portrait(c, {pose: 'zafer', fade: true});
    q(w, '.kh-welc__fig').append(pt.el);
    scope.add(() => pt.destroy());
    s.whoosh();
    // giriş: 7 öğe, kademeli, her biri ≤ 340 ms
    play(q(w, '.kh-welc__rays'), [{opacity: 0}, {opacity: 1}], {duration: 340, easing: 'ease-out', fill: 'backwards'});
    play(q(w, '.kh-welc__fig'), [{transform: 'translateY(24%) scale(.9)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, easing: EASE.outQuart, fill: 'backwards'});
    ['.kh-welc__l1', '.kh-welc__l2', '.kh-welc__name'].forEach((sel, k) =>
      play(q(w, sel), [{transform: 'translateY(-30px) scale(1.3)', opacity: 0}, {transform: 'scale(.97)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 320, delay: 220 + k * 160, easing: EASE.out, fill: 'backwards'}));
    scope.timeout(() => {
      s.slam?.();
      const r = q(w, '.kh-welc__name').getBoundingClientRect();
      ctx.fx.burst({x: r.left + r.width / 2, y: r.top + r.height / 2}, {coins: 0, confetti: 26, power: 0.95});
    }, ANIM ? 640 : 0);
    play(q(w, '.kh-welc__gift'), [{transform: 'translateY(24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: 800, easing: EASE.outQuart, fill: 'backwards'});
    play(q(w, '.kh-welc__go'), [{transform: 'translateY(40px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: 1000, easing: EASE.outQuart, fill: 'backwards'});
    scope.timeout(async () => {
      const cap = q(w, '.kh-welc__cap');
      const ico = center(q(cap, '.kh-capsule__ico'));
      ctx.fx.burst(ico, {coins: 6, confetti: 0, power: 0.6});
      s.coin(3);
      await countUp(scope, q(cap, '.kh-capsule__val'), 0, profile.data.coins, 900);
      bump(cap, 1.1);
    }, ANIM ? 980 : 0);
    await new Promise<void>(res => scope.on(q(w, '[data-act=go]'), 'click', () => {
      s.tap();
      pt.pop();
      res();
    }));
  }
}

/** Animasyon bitince çözülür (iptalde de). */
function done(a: Animation): Promise<void> {
  if (!ANIM) return Promise.resolve();
  return a.finished.then(() => undefined, () => undefined);
}

/** Hediye kutusu (SVG gövde + gölgesi çizimde, ayrı kapak, pişmiş ışık patlaması, zemin gölgesi). Filtre/maske yok. */
function giftBox(): HTMLElement {
  const b = h('div', 'kh-gift');
  b.innerHTML = `<i class="kh-gift__shadow"></i><i class="kh-gift__rays" style="--rays:${raysBg('255, 226, 120', 14, 0.75)}"></i>
    <div class="kh-gift__in">
      <svg class="kh-gift__body" viewBox="0 0 200 150" aria-hidden="true">
        <defs><linearGradient id="gfb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a8e"/><stop offset=".45" stop-color="#ff2e4d"/><stop offset="1" stop-color="#a8001e"/></linearGradient>
          <linearGradient id="gfr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb21a"/><stop offset=".45" stop-color="#fff27a"/><stop offset="1" stop-color="#e57a00"/></linearGradient></defs>
        <rect x="8" y="14" width="184" height="138" rx="16" fill="#0a1033" fill-opacity=".45"/>
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
    </div>`;
  return b;
}
