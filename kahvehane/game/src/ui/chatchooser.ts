// Sohbet yoğunluğu: ilk açılışta çıkan tam ekran seçici ("Masada ne kadar sohbet olsun?") — Blöf el düzeni seçicisinin kardeşi.
//
// Üstte TEK büyük ortak sahne: kahvehane masası, arkasında üç karakter (gerçek portreler: Dursun · Rıza · Cem). Seçili seviyenin
// temposunda balonlar belirir — aynı olay (Rıza'nın piştisi) her seviyede olur, değişen yalnız etrafındaki laf:
//   Sakin: tek balon ("Pişti!") · Normal: bir iki tepki · Geveze: laf lafı açar, karşılıklı atışma, kahkaha.
// Altta üç seviye kutusu (yoğunluk göstergesi 1 · 2 · 3 balon), seçilenin açıklaması + örnek söz ve tek birincil düğme
// ("Normal olsun"). Kutuya dokunmak seçer ve o seviyenin ÖRNEĞİNİ dinletir (uygulamanın tek konuşma yöneticisi; ses kapalıysa
// yalnız balon); seçili kutuya yeniden dokunmak tekrar dinletir.
//
// Performans (düşük cihaz): hareket yalnız transform/opacity (WAAPI / CSS geçişi); sabit havuz (koltuk başına bir balon, bir
// atılan kart, bir parıltı) — döngüde DOM üretimi yok; yumuşak ışık küçük tuval dokusu (bileşimci büyütür); portreler ekran
// gösterilmeden önce çözülür (decode), poz değişimi önceden çözülmüş görselin anında yerine konmasıdır. Önizleme döngüsü
// zamanlayıcıyla çalışır (kare başına iş yok), düşük cihazda/azaltılmış harekette seçim başına tek tur; kapanınca her şey sökülür.
import './chatchooser.css';
import type {Bubble} from '../audio/speech';
import {CHAT_LEVELS, lineById, type ChatLevel} from '../ai/dialogue';
import {charById, type CharId, type Pose} from '../game/roster';
import type {ChatSamplePort} from './types';
import {ANIM, EASE, Scope, esc, h, play, q} from './dom';
import {I} from './icons';
import {CI, deckCardHtml, deckOr} from './deckpv';
import {arenaHtml, decorLoops, hideUnder, onAct, type Ctx} from './parts';
import {radial, texCanvas} from '../platform/tex';
import {haptic} from '../platform/bridge';

type Seat = 'l' | 'c' | 'r';
const SEATS: readonly Seat[] = ['l', 'c', 'r'];

/** Masadakiler: koltuk → karakter, dinlenme pozu, konuşma pozu (yalnız bu ikisi çözülür). */
const CAST: Record<Seat, {id: CharId; rest: Pose; talk: Pose}> = {
  l: {id: 'dursun', rest: 'gulumseme', talk: 'kahkaha'},
  c: {id: 'riza', rest: 'gulumseme', talk: 'pisti'},
  r: {id: 'cem', rest: 'gulumseme', talk: 'saskin'},
};

/** Seviye başına yazı: kutudaki kısa etiket, bir satır açıklama, karakterin ağzından örnek söz (oyundaki gerçek replik). */
const COPY: Record<ChatLevel, {name: string; tag: string; desc: string; quote: {id: string; fb: string; seat: Seat}}> = {
  sakin: {name: 'Sakin', tag: 'Büyük anlar', desc: 'Yalnız büyük anlarda: pişti, blöf, zafer.', quote: {id: 'riza_botPisti_7', fb: 'Ha ha haa! Pişti!', seat: 'c'}},
  normal: {name: 'Normal', tag: 'Tepki, takılma', desc: 'Güzel hamleye tepki, arada bir takılma.', quote: {id: 'banter_dursun_riza_steal_1a', fb: 'Amca, bunu da çayına say!', seat: 'l'}},
  geveze: {name: 'Geveze', tag: 'Tam kahvehane', desc: 'Laf lafı açar: atışma, kahkaha, muhabbet.', quote: {id: 'banter_riza_cem_steal_1c', fb: 'Veri değil evlat, tecrübe!', seat: 'c'}},
};

/** Önizleme sahnesinin bir anı: ne zaman (döngü başından ms), kim, hangi replik (kimlik + yedek yazı), ne kadar kalır. */
interface Beat {
  at: number;
  seat: Seat;
  id: string;
  fb: string;
  ms: number;
  /** konuşma pozuna geç (yoksa yalnız zıplama) */
  face?: boolean;
  /** Rıza'nın piştisi: kart masaya iner, parıltı */
  pisti?: boolean;
}

/** Döngü süresi (ms): üç seviyede aynı — fark yalnız yoğunlukta görünsün. */
const LOOP = 7600;
const PISTI: Beat = {at: 1500, seat: 'c', id: 'riza_botPisti_7', fb: 'Ha ha haa! Pişti!', ms: 2100, face: true, pisti: true};
const BEATS: Record<ChatLevel, readonly Beat[]> = {
  sakin: [PISTI],
  normal: [
    {...PISTI, ms: 1700},
    {at: 3500, seat: 'l', id: 'dursun_playerPisti_8', fb: 'Hoppala!', ms: 1500, face: true},
    {at: 5300, seat: 'r', id: 'cem_playerBigCapture_2', fb: 'Pff, şans.', ms: 1500},
  ],
  geveze: [
    {at: 250, seat: 'r', id: 'cem_myTurnIdle_5', fb: 'Hadi ama…', ms: 1000},
    {...PISTI, ms: 1250},
    {at: 2500, seat: 'r', id: 'cem_playerPisti_2', fb: 'Lag girdi, saymaz!', ms: 1250, face: true},
    {at: 3250, seat: 'l', id: 'dursun_botBigCapture_11', fb: 'Ha ha ha!', ms: 1250, face: true},
    {at: 4050, seat: 'c', id: 'riza_botThinking_3', fb: 'Heh heh…', ms: 1100},
    {at: 4750, seat: 'r', id: 'cem_playerPisti_3', fb: 'Ayıp ettin kanka!', ms: 1250},
    {at: 5550, seat: 'l', id: 'dursun_playerBigCapture_1', fb: 'Vay vay vay!', ms: 1150, face: true},
    {at: 6300, seat: 'r', id: 'cem_playerBigCapture_11', fb: 'Yok artık!', ms: 1000, face: true},
  ],
};

const lineText = (id: string, fb: string): string => lineById(id)?.text ?? fb;
const nameOf = (id: CharId): string => charById(id).name.replace(/^Kahveci\s+/, '').split(' ')[0];

/**
 * Yoğunluk göstergesi: soldan sağa büyüyen üç konuşma balonu; ilk `n` tanesi dolu (Sakin 1 · Normal 2 · Geveze 3).
 * Renk `currentColor` (dolu) ve aynı rengin soluk hâli (boş). Ayarlar satırında da kullanılır.
 */
export function chatMeterSvg(l: ChatLevel, cls = ''): string {
  const n = CHAT_LEVELS.indexOf(l) + 1;
  const b = (i: number, x: number, y: number, w: number, hh: number): string => {
    const r = hh * 0.42, t = x + w * 0.24;
    return `<g class="${i < n ? 'on' : 'off'}"><rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="${r}"/><path d="M${t} ${y + hh - 0.6}l${-w * 0.1} ${hh * 0.42}l${w * 0.34} ${-hh * 0.42}z"/></g>`;
  };
  return `<svg class="kh-ccm ${cls}" viewBox="0 0 40 24" aria-hidden="true">${b(0, 1, 12, 10, 7.2)}${b(1, 13, 7.5, 11.5, 9)}${b(2, 26.5, 2, 12.5, 11)}</svg>`;
}

/** İnce belli çay bardağı + tabak (sahne süsü, durağan SVG). */
const TEA = `<svg class="kh-cc__tea" viewBox="0 0 40 44" aria-hidden="true">
  <ellipse cx="20" cy="39" rx="18" ry="4.6" fill="#e9eeff" stroke="#0a1033" stroke-width="2"/><ellipse cx="20" cy="38.2" rx="11" ry="2.4" fill="#c6d0f5"/>
  <path d="M10.5 6.5h19c-.4 6-3.4 9.6-5 12.6 2.6 3.2 5 7 4.6 13.6-.2 3-4 4.8-9.1 4.8s-8.9-1.8-9.1-4.8c-.4-6.6 2-10.4 4.6-13.6-1.6-3-4.6-6.6-5-12.6z" fill="rgba(255,255,255,.35)" stroke="#0a1033" stroke-width="2" stroke-linejoin="round"/>
  <path d="M13 11h14c-.8 3.6-2.6 6-3.9 8.2 2.4 3 4.4 6.4 4 12.2-.2 2.2-3.2 3.4-7.1 3.4s-6.9-1.2-7.1-3.4c-.4-5.8 1.6-9.2 4-12.2C15.6 17 13.8 14.6 13 11z" fill="#c2401c"/>
  <path d="M13 11h14c-.3 1.3-.7 2.4-1.2 3.4H14.2c-.5-1-.9-2.1-1.2-3.4z" fill="#e8743a"/><path d="M14.6 9.4c.6 4 2.2 6.6 3.4 8.6" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

/** Koltuk: dinlenme/konuşma pozları (önceden çözülür), görünür tek <img>, balon (sabit havuz). */
interface SeatView {
  seat: Seat;
  bust: HTMLElement;
  pop: HTMLElement;
  img: HTMLImageElement;
  poses: Map<Pose, HTMLImageElement>;
  say: HTMLElement;
  sayT: HTMLElement;
  /** balonun gösterim sırası (eski bir gizleme yeni balonu söndürmesin) */
  tok: number;
  hideT: number;
  poseT: number;
}

/**
 * İlk açılışta sohbet seviyesi seçici. Seçimle çözülür (kaydetmek çağıranın işi). port: örnekleri tek konuşma yöneticisinden
 * dinletir (verilmezse yalnız önizleme). current: seçili başlayan seviye (varsayılan Normal). deck: masadaki kartların destesi.
 */
export async function chatChooser(ctx: Ctx, port?: ChatSamplePort, current: ChatLevel = 'normal', deck = ''): Promise<ChatLevel> {
  const scope = new Scope();
  const s = ctx.sounds;
  const d = deckOr(deck);
  let sel: ChatLevel = CHAT_LEVELS.includes(current) ? current : 'normal';
  const el = h('div', 'kh-screen kh-cc');
  el.dataset.l = sel;

  const tile = (l: ChatLevel) => `<button class="kh-cc__opt is-${l}" role="radio" aria-checked="${l === sel}" data-act="lv" data-l="${l}">
      ${l === 'normal' ? '<em class="kh-cc__rec">Önerilen</em>' : ''}
      ${chatMeterSvg(l, 'kh-cc__meter')}
      <b class="kh-cc__nm">${COPY[l].name}</b><small class="kh-cc__tag">${COPY[l].tag}</small>
      <i class="kh-cc__re" aria-hidden="true">${I.sfx}<span class="kh-cc__bars"><b></b><b></b><b></b></span></i>
    </button>`;
  const seatHtml = (st: Seat) => `<span class="kh-cc__seat is-${st}"><span class="kh-cc__bust"><span class="kh-cc__pop"></span></span></span>`;
  const sayHtml = (st: Seat) => `<span class="kh-cc__say is-${st}"><span class="kh-cc__sayt"></span></span>`;
  el.innerHTML = `${arenaHtml('kh-cc__bg')}
    <div class="kh-cc__col">
      <header class="kh-cc__head"><span class="kh-cc__kick">${I.voice}<span>Sohbet</span></span><h2 class="kh-cc__q">Masada ne kadar sohbet olsun?</h2></header>
      <div class="kh-cc__stage">
        <i class="kh-cc__wall"></i>
        ${SEATS.map(seatHtml).join('')}
        <span class="kh-cc__table"><i class="kh-cc__apron"></i>
          <span class="kh-cc__pile">${deckCardHtml(d, CI.ten, 'kh-cc__card is-base')}${deckCardHtml(d, CI.jack, 'kh-cc__card is-throw')}</span>
          <span class="kh-cc__cup is-l">${TEA}</span><span class="kh-cc__cup is-r">${TEA}</span>
        </span>
        ${SEATS.map(sayHtml).join('')}
      </div>
      <div class="kh-cc__lv" role="radiogroup" aria-label="Sohbet yoğunluğu">${CHAT_LEVELS.map(tile).join('')}</div>
      <div class="kh-cc__info" aria-live="polite"><span class="kh-cc__caret"><i></i></span><span class="kh-cc__infoin"><span class="kh-cc__desc"></span><span class="kh-cc__quote"></span></span></div>
      <button class="kh-btn kh-btn--1 kh-btn--lg kh-btn--block kh-cc__go" data-act="go">${I.check}<span class="kh-cc__gol"></span></button>
      <footer class="kh-cc__note">${I.gear}<span>Ayarlardan istediğin zaman değiştirebilirsin</span></footer>
    </div>`;
  const g = (sel_: string) => q(el, sel_);
  const stage = g('.kh-cc__stage');
  // ışık (seviyenin enerjisi): küçük tuval dokusu, bileşimci büyütür; seviye değişince yalnız opacity/transform geçişi
  const glow = texCanvas('kh-cc__glow', 96, 64);
  radial(glow, [[0, 'rgba(255,214,90,.55)'], [0.45, 'rgba(255,190,60,.22)'], [1, 'rgba(255,170,40,0)']]);
  g('.kh-cc__wall').after(glow);
  const flash = texCanvas('kh-cc__flash', 64);
  radial(flash, [[0, 'rgba(255,248,200,1)'], [0.3, 'rgba(255,214,80,.75)'], [1, 'rgba(255,190,40,0)']]);
  g('.kh-cc__pile').append(flash);
  const throwCard = g('.kh-cc__card.is-throw');

  // koltuklar: pozlar önceden çözülür (gösterim anında boş/yarım kare yok)
  const decodes: Promise<unknown>[] = [];
  const seats = {} as Record<Seat, SeatView>;
  for (const st of SEATS) {
    const c = charById(CAST[st].id);
    const poses = new Map<Pose, HTMLImageElement>();
    for (const p of [CAST[st].rest, CAST[st].talk]) {
      const im = new Image();
      im.className = 'kh-cc__img';
      im.alt = '';
      im.decoding = 'async';
      im.draggable = false;
      im.src = c.poses[p];
      decodes.push(im.decode().catch(() => undefined));
      poses.set(p, im);
    }
    const root = g(`.kh-cc__seat.is-${st}`);
    const pop = q(root, '.kh-cc__pop');
    const img = poses.get(CAST[st].rest)!;
    pop.append(img);
    const say = g(`.kh-cc__say.is-${st}`);
    seats[st] = {seat: st, bust: q(root, '.kh-cc__bust'), pop, img, poses, say, sayT: q(say, '.kh-cc__sayt'), tok: 0, hideT: 0, poseT: 0};
  }
  // en çok ~0,6 sn beklenir (ağ yavaşsa ekran yine açılır; görseller gelince yerine oturur)
  await Promise.race([Promise.all(decodes), new Promise(r => window.setTimeout(r, 600))]);

  const tiles = Array.from(el.querySelectorAll<HTMLButtonElement>('.kh-cc__opt'));
  const tileOf = (l: ChatLevel): HTMLButtonElement => tiles.find(t => t.dataset.l === l)!;

  // ---------- sahne: balon, poz, kart ----------
  let zTop = 0;
  const setPose = (v: SeatView, p: Pose): void => {
    const next = v.poses.get(p);
    if (!next || next === v.img) return;
    v.img.replaceWith(next);
    v.img = next;
  };
  const bob = (v: SeatView): void => {
    if (!ANIM) return;
    play(v.pop, [{transform: 'none'}, {transform: 'translateY(-3.5%) scale(1.035)', offset: 0.35}, {transform: 'scale(.995)', offset: 0.7}, {transform: 'none'}], {duration: 380, easing: EASE.out});
  };
  /** Balonu göster. ms > 0: o kadar sonra kendiliğinden söner (döngü); 0: hide çağrılana dek kalır (örnek). */
  const say = (v: SeatView, text: string, ms: number, face: boolean): void => {
    const tok = ++v.tok;
    window.clearTimeout(v.hideT);
    window.clearTimeout(v.poseT);
    v.sayT.textContent = text;
    v.say.classList.add('is-on');
    v.say.style.zIndex = String(10 + (++zTop % 50));
    play(v.say, [
      {opacity: 0, transform: 'translateY(14%) scale(.55)'},
      {opacity: 1, transform: 'translateY(-4%) scale(1.06)', offset: 0.55},
      {opacity: 1, transform: 'none'},
    ], {duration: 300, easing: EASE.out});
    if (face) setPose(v, CAST[v.seat].talk);
    bob(v);
    if (ms > 0) v.hideT = window.setTimeout(() => unsay(v, tok), ANIM ? ms : 0);
  };
  const unsay = (v: SeatView, tok = v.tok, fast = false): void => {
    if (tok !== v.tok || !v.say.classList.contains('is-on')) return;
    v.tok++;
    const t2 = v.tok;
    window.clearTimeout(v.hideT);
    // poz biraz gecikmeli döner (balon sönerken yüz hemen "kapanmasın")
    v.poseT = window.setTimeout(() => scope.alive && setPose(v, CAST[v.seat].rest), fast ? 0 : 260);
    if (!ANIM || fast) {
      v.say.classList.remove('is-on');
      return;
    }
    play(v.say, [{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(6%) scale(.88)'}], {duration: 180, easing: 'ease-in', fill: 'forwards'})
      .finished.then(() => {
        if (t2 === v.tok && scope.alive) {
          v.say.classList.remove('is-on');
          v.say.getAnimations().forEach(a => a.cancel());
        }
      }, () => undefined);
  };
  const hush = (): void => SEATS.forEach(st => unsay(seats[st], seats[st].tok, true));

  /** Pişti: J♥ masaya iner (yaylı), altın parıltı söner. Döngü sonunda kart kalkar (el toplandı). */
  const pisti = (): void => {
    throwCard.classList.add('is-on');
    play(throwCard, [
      {opacity: 0, transform: 'translate(-30%, -150%) rotate(-38deg) scale(1.3)'},
      {opacity: 1, transform: 'translate(-6%, -20%) rotate(2deg) scale(1.08)', offset: 0.55},
      {opacity: 1, transform: 'rotate(11deg)'},
    ], {duration: 380, easing: EASE.out, fill: 'forwards'});
    flash.classList.add('is-on');
    play(flash, [{opacity: 0, transform: 'scale(.3)'}, {opacity: 1, transform: 'scale(1)', offset: 0.25}, {opacity: 0, transform: 'scale(1.7)'}], {duration: 640, delay: 300, easing: 'ease-out', fill: 'both'})
      .finished.then(() => flash.classList.remove('is-on'), () => undefined);
  };
  const clearPile = (fade: boolean): void => {
    if (!throwCard.classList.contains('is-on')) return;
    if (!fade || !ANIM) {
      throwCard.getAnimations().forEach(a => a.cancel());
      throwCard.classList.remove('is-on');
      return;
    }
    play(throwCard, [{opacity: 1, transform: 'rotate(11deg)'}, {opacity: 0, transform: 'translateY(-30%) rotate(11deg) scale(.9)'}], {duration: 260, easing: 'ease-in', fill: 'forwards'})
      .finished.then(() => {
        throwCard.getAnimations().forEach(a => a.cancel());
        throwCard.classList.remove('is-on');
      }, () => undefined);
  };

  // ---------- önizleme döngüsü (zamanlayıcı; kare başına iş yok) ----------
  let timers: number[] = [];
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(() => scope.alive && fn(), ms));
  };
  const stopLoop = (): void => {
    timers.forEach(t => window.clearTimeout(t));
    timers = [];
  };
  const beat = (b: Beat): void => {
    if (b.pisti) pisti();
    later(() => say(seats[b.seat], lineText(b.id, b.fb), b.ms, !!b.face), b.pisti ? 260 : 0);
  };
  const runLoop = (l: ChatLevel, delay: number): void => {
    stopLoop();
    if (!ANIM) {
      // donmuş çekim: seviyenin temsilî karesi (koltuk başına son balon)
      const last = new Map<Seat, Beat>();
      BEATS[l].forEach(b => last.set(b.seat, b));
      if (BEATS[l].some(b => b.pisti)) pisti();
      last.forEach(b => say(seats[b.seat], lineText(b.id, b.fb), 0, !!b.face));
      return;
    }
    later(() => {
      for (const b of BEATS[l]) later(() => beat(b), b.at);
      later(() => clearPile(true), LOOP - 420);
      if (decorLoops()) later(() => runLoop(l, 0), LOOP);
    }, delay);
  };

  // ---------- örnek dinletme (tek konuşma yöneticisi) ----------
  let gen = 0;
  let resumeT = 0;
  let playingT = 0;
  const setPlaying = (on: boolean): void => {
    window.clearTimeout(playingT);
    tiles.forEach(t => t.classList.toggle('is-playing', on && t.dataset.l === sel));
  };
  const seatOf = (char: string): SeatView => seats[SEATS.find(st => CAST[st].id === char) ?? 'c'];
  const bubbleFor = (my: number) => (char: string): Bubble => {
    const v = seatOf(char);
    let mine = 0;
    return {
      show(text) {
        if (!scope.alive || my !== gen) return;
        window.clearTimeout(resumeT);
        stopLoop();
        clearPile(false);
        SEATS.forEach(st => st !== v.seat && unsay(seats[st]));
        say(v, text, 0, true);
        mine = v.tok;
        setPlaying(true);
      },
      hide() {
        if (!scope.alive || my !== gen || !mine) return;
        unsay(v, mine);
        mine = 0;
        window.clearTimeout(resumeT);
        // son satırdan sonra (yeni satır gelmezse) döngü sürer
        resumeT = window.setTimeout(() => {
          if (!scope.alive || my !== gen) return;
          setPlaying(false);
          runLoop(sel, 350);
        }, 900);
      },
    };
  };
  scope.add(() => {
    stopLoop();
    window.clearTimeout(resumeT);
    window.clearTimeout(playingT);
    SEATS.forEach(st => {
      window.clearTimeout(seats[st].hideT);
      window.clearTimeout(seats[st].poseT);
    });
    port?.stop();
  });

  // ---------- seçim ----------
  const desc = g('.kh-cc__desc'), quote = g('.kh-cc__quote'), goLabel = g('.kh-cc__gol');
  const info = (l: ChatLevel): void => {
    const c = COPY[l];
    desc.textContent = c.desc;
    quote.innerHTML = `<q>${esc(lineText(c.quote.id, c.quote.fb))}</q><small>${esc(nameOf(CAST[c.quote.seat].id))}</small>`;
    goLabel.textContent = `${c.name} olsun`;
    el.dataset.l = l;
    el.style.setProperty('--i', String(CHAT_LEVELS.indexOf(l)));
    tiles.forEach(t => {
      const on = t.dataset.l === l;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-checked', String(on));
      t.setAttribute('aria-label', on ? `${COPY[t.dataset.l as ChatLevel].name}: örneği yeniden dinle` : `${COPY[t.dataset.l as ChatLevel].name}: ${COPY[t.dataset.l as ChatLevel].desc}`);
    });
  };
  info(sel);
  port?.warm?.();

  const choose = (l: ChatLevel): void => {
    const changed = l !== sel;
    sel = l;
    gen++;
    window.clearTimeout(resumeT);
    port?.stop();
    stopLoop();
    hush();
    clearPile(false);
    if (changed) {
      info(l);
      if (ANIM) {
        play(g('.kh-cc__infoin'), [{opacity: 0, transform: 'translateY(5px)'}, {opacity: 1, transform: 'none'}], {duration: 220, easing: EASE.out});
        play(g('.kh-cc__go'), [{transform: 'scale(.97)'}, {transform: 'scale(1.025)', offset: 0.6}, {transform: 'none'}], {duration: 260, easing: EASE.out});
      }
    }
    if (ANIM) play(tileOf(l), [{transform: 'translateY(-4px) scale(.96)'}, {transform: 'translateY(-4px) scale(1.04)', offset: 0.5}, {transform: 'translateY(-4px)'}], {duration: 260, easing: EASE.out});
    if (port) {
      setPlaying(true);
      // örnek sesi gelmezse (ör. yükleniyor) önizleme yine başlar; ilk satır gelince durur
      playingT = window.setTimeout(() => setPlaying(false), 2600);
      // önce yedek döngü kurulur: örneğin ilk satırı gelince (aynı anda da gelebilir) döngüyü durdurur
      runLoop(l, 1500);
      port.play(l, bubbleFor(gen));
    } else runLoop(l, 250);
  };

  ctx.layer.append(el);
  // opak ekran: alttaki ekranlar çizilmez (GPU karo belleği); kapanış solmasından hemen önce geri gelir
  const unhide = hideUnder(el);
  scope.add(unhide);

  // giriş (≤ 560 ms): başlık iner, sahne açılır, karakterler oturur, kutular sırayla kalkar, düğme gelir
  play(g('.kh-cc__head'), [{transform: 'translateY(-26px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, easing: EASE.out, fill: 'backwards'});
  play(stage, [{transform: 'scale(.94)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 380, delay: 50, easing: EASE.outQuart, fill: 'backwards'});
  (['c', 'l', 'r'] as Seat[]).forEach((st, i) =>
    play(seats[st].bust, [{transform: 'translateY(16%) scale(.92)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 360, delay: 160 + i * 70, easing: EASE.spring, fill: 'backwards'}));
  tiles.forEach((t, i) => play(t, [{transform: 'translateY(22px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, delay: 180 + i * 60, easing: EASE.outQuart, fill: 'backwards'}));
  play(g('.kh-cc__info'), [{opacity: 0}, {opacity: 1}], {duration: 300, delay: 330, fill: 'backwards'});
  play(g('.kh-cc__go'), [{transform: 'translateY(24px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 340, delay: 380, easing: EASE.outQuart, fill: 'backwards'});
  play(g('.kh-cc__note'), [{opacity: 0}, {opacity: 1}], {duration: 300, delay: 460, fill: 'backwards'});
  runLoop(sel, 650);

  return new Promise(res => {
    let picked = false;
    onAct(scope, el, async (a, b) => {
      if (picked) return;
      if (a === 'lv') {
        const l = b.dataset.l as ChatLevel;
        if (!CHAT_LEVELS.includes(l)) return;
        s.tap();
        haptic('light');
        choose(l);
        return;
      }
      if (a !== 'go') return;
      picked = true;
      s.tap();
      haptic('medium');
      gen++;
      stopLoop();
      port?.stop();
      setPlaying(false);
      el.classList.add('is-done');
      unhide();
      if (ANIM) {
        tiles.filter(t => t.dataset.l !== sel).forEach(t => play(t, [{opacity: 1}, {opacity: 0.25}], {duration: 220, fill: 'forwards', easing: 'ease-out'}));
        play(tileOf(sel), [{transform: 'translateY(-4px)'}, {transform: 'translateY(-4px) scale(1.06)', offset: 0.45}, {transform: 'translateY(-4px)'}], {duration: 340, easing: EASE.out});
        await play(b, [{transform: 'scale(1)'}, {transform: 'scale(1.04)', offset: 0.45}, {transform: 'scale(1)'}], {duration: 340, easing: EASE.out}).finished.catch(() => undefined);
        await el.animate([{opacity: 1}, {opacity: 0}], {duration: 220, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
      }
      scope.dispose();
      el.getAnimations({subtree: true}).forEach(x => x.cancel());
      el.remove();
      res(sel);
    });
  });
}
