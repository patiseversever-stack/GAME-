// Sohbet yoğunluğu: ilk açılışta çıkan tam ekran seçici ("Masada ne kadar sohbet olsun?") — Blöf el düzeni seçicisinin
// kardeşi. Üç kart (Sakin · Normal (önerilen, seçili) · Geveze); her kartta küçük bir masa önizlemesi: üç karakter, balonlar o
// seviyenin sıklığında belirip kaybolur (yalnız transform/opacity, WAAPI; düşük cihazda tek tur). Karta dokunmak o seviyenin
// ÖRNEĞİNİ dinletir (var olan sesli replikler, uygulamanın tek konuşma yöneticisinden; ses kapalıysa yalnız yazı) ve kartı
// vurgular; "Seç" seçer ve devam eder. Kapanınca her şey sökülür (animasyonlar, zamanlayıcılar, dinleyiciler, konuşma).
import './chatchooser.css';
import type {Bubble} from '../audio/speech';
import {CHAT_LEVELS, CHAT_LEVEL_INFO, type ChatLevel} from '../ai/dialogue';
import {charById, type CharId} from '../game/roster';
import type {ChatSamplePort} from './types';
import {ANIM, EASE, Scope, esc, h, play, q} from './dom';
import {I} from './icons';
import {charAvatarHtml, decorLoops, onAct, type Ctx} from './parts';
import {shortName} from './lobby';
import {haptic} from '../platform/bridge';

type SeatPos = 't' | 'l' | 'r';
interface Pop {
  at: SeatPos;
  t0: number;
  t1: number;
  txt: string;
}
interface Scene {
  seats: Record<SeatPos, CharId>;
  pops: Pop[];
}

/** Önizleme döngüsü (ms) ve seviye başına sahne: kim nerede oturur, hangi balon ne zaman (döngü oranı). Balonlar asla üst üste binmez. */
const LOOP = 6400;
const SCENES: Record<ChatLevel, Scene> = {
  sakin: {seats: {t: 'riza', l: 'defne', r: 'dursun'}, pops: [{at: 't', t0: 0.2, t1: 0.46, txt: 'Pişti!'}]},
  normal: {
    seats: {t: 'dursun', l: 'riza', r: 'cem'},
    pops: [{at: 'l', t0: 0.06, t1: 0.24, txt: 'Hıh!'}, {at: 't', t0: 0.36, t1: 0.54, txt: 'Ho ho!'}, {at: 'r', t0: 0.66, t1: 0.84, txt: 'Kanka!'}],
  },
  geveze: {
    seats: {t: 'riza', l: 'cem', r: 'dursun'},
    pops: [
      {at: 't', t0: 0.02, t1: 0.14, txt: 'Pişti!'}, {at: 'l', t0: 0.17, t1: 0.29, txt: 'Of ya!'}, {at: 'r', t0: 0.32, t1: 0.44, txt: 'Ho ho!'},
      {at: 't', t0: 0.48, t1: 0.6, txt: 'Evlat!'}, {at: 'l', t0: 0.63, t1: 0.75, txt: 'GG!'}, {at: 'r', t0: 0.79, t1: 0.91, txt: 'Çay?'},
    ],
  },
};
const POSES = ['gulumseme', 'kirpma', 'kahkaha'] as const;

function sceneHtml(l: ChatLevel): string {
  const sc = SCENES[l];
  const seat = (at: SeatPos, i: number) => {
    const c = charById(sc.seats[at]);
    const pops = sc.pops.map((p, k) => (p.at === at ? `<i class="kh-cc__pop" data-k="${k}">${esc(p.txt)}</i>` : '')).join('');
    return `<span class="kh-cc__seat is-${at}" data-c="${c.id}">${charAvatarHtml(c, 'standart', 'kh-cc__ava', POSES[i % POSES.length])}${pops}<i class="kh-cc__live"><b></b><b></b><b></b></i></span>`;
  };
  return `<i class="kh-cc__felt"><i class="kh-cc__card is-1"></i><i class="kh-cc__card is-2"></i></i>${seat('t', 0)}${seat('l', 1)}${seat('r', 2)}`;
}

/** Bir kartın önizleme döngüsü (kapsama bağlı; dönen animasyonlar duraklatılabilsin diye listede). */
function demo(scope: Scope, card: HTMLElement, l: ChatLevel): Animation[] {
  const loop = decorLoops() ? Infinity : 1;
  const out: Animation[] = [];
  const opt: KeyframeAnimationOptions = {duration: LOOP, iterations: loop, easing: 'linear'};
  SCENES[l].pops.forEach((p, k) => {
    const el = card.querySelector<HTMLElement>(`.kh-cc__pop[data-k="${k}"]`);
    const ava = card.querySelector<HTMLElement>(`.kh-cc__seat.is-${p.at} .kh-cc__ava`);
    if (!el || !ava) return;
    const a = p.t0, b = p.t1;
    out.push(scope.track(play(el, [
      {opacity: 0, transform: 'scale(.4)', offset: 0},
      {opacity: 0, transform: 'scale(.4)', offset: a},
      {opacity: 1, transform: 'translateY(-8%) scale(1.06)', offset: a + 0.03},
      {opacity: 1, transform: 'scale(1)', offset: a + 0.05},
      {opacity: 1, transform: 'scale(1)', offset: b - 0.02},
      {opacity: 0, transform: 'scale(.85)', offset: b},
      {opacity: 0, transform: 'scale(.85)', offset: 1},
    ], opt, 0)));
    out.push(scope.track(play(ava, [
      {transform: 'none', offset: 0}, {transform: 'none', offset: a}, {transform: 'scale(1.13)', offset: a + 0.025}, {transform: 'none', offset: a + 0.06}, {transform: 'none', offset: 1},
    ], opt, 0)));
  });
  return out;
}

/**
 * İlk açılışta sohbet seviyesi seçici. Seçimle çözülür (kaydetmek çağıranın işi). port: örnekleri tek konuşma yöneticisinden
 * dinletir (verilmezse yalnız önizleme). current: vurgulu başlayan seviye (varsayılan Normal).
 */
export function chatChooser(ctx: Ctx, port?: ChatSamplePort, current: ChatLevel = 'normal'): Promise<ChatLevel> {
  const scope = new Scope();
  const s = ctx.sounds;
  const el = h('div', 'kh-screen kh-cc');
  const card = (l: ChatLevel) => {
    const info = CHAT_LEVEL_INFO[l];
    return `<div class="kh-cc__opt is-${l}${l === current ? ' is-on' : ''}" data-act="hear" data-l="${l}">
      <i class="kh-cc__bg"></i>
      <button class="kh-cc__pv kh-keep" data-act="hear" data-l="${l}" aria-label="${info.name}: örneği dinle">${sceneHtml(l)}</button>
      <span class="kh-cc__txt"><span class="kh-cc__nm"><b>${info.name}</b>${l === 'normal' ? '<em class="kh-cc__tag">Önerilen</em>' : ''}</span>
        <small class="kh-cc__desc">${esc(info.desc)}</small><span class="kh-cc__cap" aria-live="polite"></span></span>
      <span class="kh-cc__acts">
        <button class="kh-cc__hear" data-act="hear" data-l="${l}" aria-label="${info.name}: dinle">${I.sfx}<span>Dinle</span></button>
        <button class="kh-btn kh-btn--1 kh-cc__pick" data-act="pick" data-l="${l}" aria-label="${info.name} seç">${I.check}<span>Seç</span></button>
      </span>
    </div>`;
  };
  el.innerHTML = `<header class="kh-cc__head"><span class="kh-cc__kick">${I.voice}<span>Sohbet</span></span>
      <div class="kh-cc__q">Masada ne kadar sohbet olsun?</div><div class="kh-cc__sub">Karta dokun, nasıl konuştuklarını dinle</div></header>
    <div class="kh-cc__list">${CHAT_LEVELS.map(card).join('')}</div>
    <footer class="kh-cc__note">${I.gear}<span>Ayarlardan istediğin zaman değiştirebilirsin</span></footer>`;
  ctx.layer.append(el);
  const cards = Array.from(el.querySelectorAll<HTMLElement>('.kh-cc__opt'));
  const cardOf = (l: ChatLevel): HTMLElement => cards.find(c => c.dataset.l === l)!;

  // giriş: başlık iner, kartlar sırayla kayar (≤ 380 ms)
  play(q(el, '.kh-cc__head'), [{transform: 'translateY(-26px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, easing: EASE.out, fill: 'backwards'});
  cards.forEach((c, i) =>
    play(c, [{transform: 'translateX(18%)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 70 + i * 70, easing: EASE.outQuart, fill: 'backwards'}));
  play(q(el, '.kh-cc__note'), [{opacity: 0}, {opacity: 1}], {duration: 300, delay: 420, fill: 'backwards'});

  // önizleme döngüleri (seçici açıkken); örnek çalınırken o kartın döngüsü duraklar
  const loops = new Map<ChatLevel, Animation[]>();
  scope.timeout(() => CHAT_LEVELS.forEach(l => loops.set(l, demo(scope, cardOf(l), l))), ANIM ? 460 : 0);
  port?.warm?.();

  let live: ChatLevel | null = null;
  let resumeT = 0;
  const setLive = (l: ChatLevel | null): void => {
    if (live === l) return;
    if (live) {
      const c = cardOf(live);
      c.classList.remove('is-live');
      c.querySelectorAll('.kh-cc__seat.is-talk').forEach(x => x.classList.remove('is-talk'));
      loops.get(live)?.forEach(a => a.playState !== 'finished' && a.play());
    }
    live = l;
    if (l) {
      cardOf(l).classList.add('is-live');
      loops.get(l)?.forEach(a => a.pause());
    }
  };
  scope.add(() => window.clearTimeout(resumeT));
  /** Örnek satırının balonu: kartın altyazısı + konuşan koltuk (nokta nokta "konuşuyor" işareti, hafif sıçrama). */
  const bubbleFor = (l: ChatLevel) => (char: string): Bubble => {
    const c = cardOf(l);
    const seat = c.querySelector<HTMLElement>(`.kh-cc__seat[data-c="${char}"]`);
    const cap = q(c, '.kh-cc__cap');
    let mine = false;
    return {
      show(text) {
        if (!scope.alive) return;
        window.clearTimeout(resumeT);
        setLive(l);
        mine = true;
        c.querySelectorAll('.kh-cc__seat.is-talk').forEach(x => x.classList.remove('is-talk'));
        seat?.classList.add('is-talk');
        cap.innerHTML = `<b>${esc(shortName(charById(char)))}:</b> ${esc(text)}`;
        play(cap, [{opacity: 0, transform: 'translateY(4px)'}, {opacity: 1, transform: 'none'}], {duration: 200, easing: EASE.out});
        const ava = seat?.querySelector('.kh-cc__ava');
        if (ava && ANIM) ava.animate([{transform: 'none'}, {transform: 'scale(1.16)', offset: 0.4}, {transform: 'none'}], {duration: 380, easing: 'ease-out'});
      },
      hide() {
        if (!mine || !scope.alive) return;
        mine = false;
        seat?.classList.remove('is-talk');
        window.clearTimeout(resumeT);
        // son satırdan sonra (yeni satır gelmezse) altyazı söner, döngü sürer
        resumeT = window.setTimeout(() => {
          if (!scope.alive || live !== l) return;
          setLive(null);
        }, 700);
      },
    };
  };

  const focus = (l: ChatLevel): void => {
    cards.forEach(c => c.classList.toggle('is-on', c.dataset.l === l));
  };

  return new Promise(res => {
    let picked = false;
    onAct(scope, el, async (a, b) => {
      if (picked) return;
      const l = b.dataset.l as ChatLevel;
      if (!CHAT_LEVELS.includes(l)) return;
      if (a === 'hear') {
        s.tap();
        haptic('light');
        focus(l);
        if (port) port.play(l, bubbleFor(l));
        else play(cardOf(l), [{transform: 'scale(1)'}, {transform: 'scale(1.02)', offset: 0.45}, {transform: 'scale(1)'}], {duration: 260, easing: EASE.out});
        return;
      }
      if (a !== 'pick') return;
      picked = true;
      s.tap();
      haptic('medium');
      port?.stop();
      focus(l);
      el.classList.add('is-done');
      const chosen = cardOf(l);
      if (ANIM) {
        loops.forEach(list => list.forEach(x => x.cancel()));
        cards.filter(c => c !== chosen).forEach(c => play(c, [{opacity: 1}, {opacity: 0.25}], {duration: 220, fill: 'forwards', easing: 'ease-out'}));
        await play(chosen, [{transform: 'scale(1)'}, {transform: 'scale(1.03)', offset: 0.45}, {transform: 'scale(1)'}], {duration: 340, easing: EASE.out}).finished.catch(() => undefined);
        await el.animate([{opacity: 1}, {opacity: 0}], {duration: 220, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      }
      scope.dispose();
      el.remove();
      res(l);
    });
    // kapsam kapanırken (her yol) konuşma susar
    scope.add(() => port?.stop());
  });
}
