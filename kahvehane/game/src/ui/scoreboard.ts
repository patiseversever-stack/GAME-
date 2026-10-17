// OYUN UZUNLUĞU arayüzü: "Kaça oynuyoruz?" seçimi (OYNA'ya basınca), ARA SKOR (çok elli maçta eller arası) ve YARIM KALAN MAÇ penceresi.
// Ara skor: el sonucu (bu elin puanı / cezası sayarak), maç toplamları (Pişti: hedefe ilerleme çubuğu · Blöf: el el ceza hücreleri),
// lider tacı, konuşan karakterin büstü + balon (konuşma yöneticisi Bubble ile yazar), büyük SONRAKİ EL (6 sn sonra kendiliğinden),
// "Masadan kalk" (onaylı; bahis yanar). Animasyonlar yalnız transform/opacity; boşta döngü yok (sayaç çubuğu tek seferlik geçiş).
import './scoreboard.css';
import type {Bubble} from '../audio/speech';
import type {InterimData, ResumeData} from './types';
import type {Game, MatchLength, Mode, SeatPlayer} from '../game/types';
import {matchTitle} from '../game/types';
import {prize} from '../game/setup';
import {LENGTHS, LENGTH_INFO, handsOf, isExtra, isLong, leaders, rankOf, ranking, seatsOfSide, sidesOf, targetOf, type SeriesState} from '../game/series';
import {ANIM, EASE, Scope, countUp, esc, fmt, h, play, q} from './dom';
import {ASSETS} from './assets';
import {I} from './icons';
import {GAME_ICON} from './gameicons';
import {charAvatarHtml, onAct, openModal, openSheet, type Ctx} from './parts';
import {g3} from './fx';
import {haptic} from '../platform/bridge';
import {shortName} from './lobby';

/** Ara skor ekranının uygulamaya verdiği yüzey. */
export interface InterimHandle {
  /** Konuşan karakterin balonu (sahnede büstün yanında) — konuşma yöneticisi yazar/kapatır. */
  readonly bubble: Bubble;
  /** SONRAKİ EL (dokunma ya da süre doldu) → 'next' · Masadan kalk onaylandı → 'leave'. Ekran kapanınca çözülür. */
  readonly done: Promise<'next' | 'leave'>;
}

/** Bir taraf (koltuk ya da eşli takım) satırı için hazır bilgiler. */
interface SideView {
  side: number;
  seats: SeatPlayer[];
  me: boolean;
  name: string;
  rank: number;
  lead: boolean;
  total: number;
  prev: number;
  hand: number;
  /** Bu eli aldı / bitirdi */
  took: boolean;
}

function sideViews(s: SeriesState, players: readonly SeatPlayer[]): SideView[] {
  const by = (seat: number) => players.find(p => p.seat === seat)!;
  const last = s.hands[s.hands.length - 1];
  const mine = sidesOf(s.mode)[0];
  const lead = new Set(leaders(s));
  const esli = s.mode === 'esli';
  return ranking(s).map(side => {
    const seats = seatsOfSide(s.mode, side).map(by);
    const me = side === mine;
    const hand = last ? last.pts[side] ?? 0 : 0;
    return {
      side, seats, me, rank: rankOf(s, side), lead: lead.has(side), total: s.totals[side] ?? 0, prev: (s.totals[side] ?? 0) - hand, hand,
      name: me ? (esli ? 'Takımın' : 'Sen') : esli ? 'Rakip' : shortName(seats[0].char),
      took: !!last && last.winner === side,
    };
  });
}

/** Bir tarafın satırı. live: ara skor (sayaçlar önceki değerden başlar) · değilse durağan (devam penceresi). */
function rowHtml(s: SeriesState, v: SideView, frame: string, live: boolean): string {
  const pisti = s.game === 'pisti';
  const avas = v.seats.map(p => charAvatarHtml(p.char, p.human ? frame : 'standart', 'kh-sb__ava')).join('');
  const color = v.seats.length === 1 && !v.me ? v.seats[0].char.color : '';
  const team = s.mode === 'esli' ? (v.me ? ' is-blue' : ' is-red') : v.me ? ' is-blue' : '';
  let meter: string;
  if (pisti && isLong(s.len)) {
    const k = (n: number) => Math.min(1, n / targetOf(s)).toFixed(3);
    meter = `<span class="kh-sb__bar"><i class="kh-sb__fill" data-k0="${k(v.prev)}" data-k1="${k(v.total)}" style="transform:scaleX(${live ? k(v.prev) : k(v.total)})"></i><i class="kh-sb__flag">${targetOf(s)}</i></span>`;
  } else {
    // Blöf: el el ceza hücreleri (oynanmayanlar boş); bu elin hücresi ara skorda belirir
    const n = Math.max(1, handsOf(s));
    meter = `<span class="kh-sb__cells" style="--n:${n}">${Array.from({length: n}, (_, i) => {
      const hd = s.hands[i];
      if (!hd) return '<i class="is-empty"></i>';
      const won = hd.winner === v.side;
      const now = i === s.hands.length - 1;
      return `<i class="${won ? 'is-won' : 'is-pen'}${now && live ? ' is-new' : ''}">${won ? I.check : hd.pts[v.side] ?? 0}</i>`;
    }).join('')}</span>`;
  }
  const delta = live
    ? pisti
      ? `<span class="kh-sb__delta is-gold${v.took ? ' is-top' : ''}">+<b class="kh-num" data-v="${v.hand}">0</b></span>`
      : v.took
        ? `<span class="kh-sb__delta is-done">Bitirdi</span>`
        : `<span class="kh-sb__delta is-bad">+<b class="kh-num" data-v="${v.hand}">0</b></span>`
    : '';
  return `<div class="kh-sb__row${v.me ? ' is-me' : ''}${v.lead ? ' is-lead' : ''}${team}"${color ? ` style="--c:${color}"` : ''} data-side="${v.side}">
    <span class="kh-sb__rank">${v.rank}</span>
    <span class="kh-sb__avas${v.seats.length > 1 ? ' is-duo' : ''}">${avas}${v.lead ? `<i class="kh-sb__crown">${I.crown}</i>` : ''}</span>
    <span class="kh-sb__mid"><span class="kh-sb__nm">${esc(v.name)}</span>${meter}</span>
    ${delta}
    <b class="kh-sb__tot kh-num" data-from="${v.prev}" data-v="${v.total}">${fmt(live ? v.prev : v.total)}</b>
  </div>`;
}

/** Onay metni: "Maçı bırakırsan masadaki 🪙 500 bahsi kaybedersin." */
const stakeLine = (stake: number): string =>
  stake > 0 ? `Maçı bırakırsan masadaki <span class="kh-confirm__stake"><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(stake)}</b></span> bahsi kaybedersin.` : 'Maçı bırakırsan bu maç kayıp sayılır.';

const title = (s: SeriesState) => `${matchTitle(s.game, s.mode)} · ${LENGTH_INFO[s.len].title}`;

// =====================================================================================================
// "Kaça oynuyoruz?" — OYNA'ya basınca alttan açılır. Seçeneğe dokunmak maçı hemen başlatır (onay yok); son seçim vurgulu.
// Kapat (X) / karartmaya dokunmak / aşağı kaydırmak → null (ana ekrana dönülür). Her seçenekte o uzunluğun ödülü.
// =====================================================================================================
const LEN_CAP: Record<MatchLength, string> = {
  tek: 'Hızlı tek el', '51': 'Kısa maç', '101': 'Klasik maç', '151': 'Uzun maç', '3': 'En az ceza kazanır', '5': 'En az ceza kazanır',
};
const capOf = (g: Game, l: MatchLength): string => (g === 'blof' && l === 'tek' ? 'İlk bitiren kazanır' : LEN_CAP[l]);

export function lengthSheet(ctx: Ctx, o: {game: Game; mode: Mode; stake: number; current: MatchLength}): Promise<MatchLength | null> {
  return new Promise(res => {
    const opts = LENGTHS[o.game];
    const cur = opts.includes(o.current) ? o.current : 'tek';
    let picked: MatchLength | null = null;
    const m = openSheet(ctx, {
      cls: `kh-lensheet is-${o.game}`,
      onClose: () => res(null),
      body: `<div class="kh-len">
        <div class="kh-title kh-len__t">${g3('Kaça oynuyoruz?')}</div>
        <div class="kh-len__sub">${GAME_ICON[o.game]}<span>${esc(matchTitle(o.game, o.mode))}</span><span class="kh-len__bet">Bahis <img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(o.stake)}</b></span></div>
        <div class="kh-len__grid is-n${opts.length}">${opts.map(l => {
          const info = LENGTH_INFO[l];
          const big = o.game === 'pisti' && l !== 'tek' ? `${info.label}<em>puan</em>` : info.label;
          return `<button class="kh-len__opt${l === cur ? ' is-on' : ''}" data-act="len" data-v="${l}" aria-pressed="${l === cur}" aria-label="${esc(info.title)}">
            ${info.mult > 1 ? `<i class="kh-len__mult">×${String(info.mult).replace('.', ',')}</i>` : ''}
            <span class="kh-len__big">${big}</span><small class="kh-len__cap">${capOf(o.game, l)}</small>
            <span class="kh-len__win"><small>Kazanırsan</small><span><img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(prize(o.mode, o.stake, info.mult))}</b></span></span>
          </button>`;
        }).join('')}</div>
      </div>`,
    });
    m.panel.querySelectorAll<HTMLElement>('.kh-len__opt').forEach((b, i) =>
      play(b, [{transform: 'translateY(18px) scale(.92)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, delay: 140 + i * 55, easing: EASE.spring, fill: 'backwards'}));
    onAct(m.scope, m.panel, async (a, b) => {
      if (a !== 'len' || picked) return;
      picked = b.dataset.v as MatchLength;
      ctx.sounds.tap();
      haptic('medium');
      m.panel.querySelectorAll('.kh-len__opt').forEach(x => {
        x.classList.toggle('is-on', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      await play(b, [{transform: 'scale(1)'}, {transform: 'scale(1.07)', offset: 0.45}, {transform: 'scale(1)'}], {duration: 240, easing: EASE.out}).finished.catch(() => undefined);
      void m.close();
      res(picked);
    });
  });
}

// =====================================================================================================
// Ara skor
// =====================================================================================================
export function interim(ctx: Ctx, d: InterimData): InterimHandle {
  const scope = new Scope();
  const s = d.series;
  const pisti = s.game === 'pisti';
  const views = sideViews(s, d.setup.players);
  const done = s.hands.length;
  const extra = isExtra(s);
  const by = (seat: number) => d.setup.players.find(p => p.seat === seat);
  const taker = views.find(v => v.took);
  const sub = !taker
    ? 'Bu el berabere'
    : taker.me
      ? pisti ? (s.mode === 'esli' ? 'Bu eli takımın aldı!' : 'Bu eli sen aldın!') : s.mode === 'esli' ? 'Takımın bitirdi!' : 'Bu eli sen bitirdin!'
      : `Bu eli ${esc(s.mode === 'esli' ? 'rakip takım' : taker.name)} ${pisti ? 'aldı' : 'bitirdi'}`;
  const nextSeat = s.next;
  const nextP = nextSeat >= 0 ? by(nextSeat) : undefined;
  const nextWho = nextP ? (nextP.human ? 'sen' : shortName(nextP.char)) : '';
  const note = pisti
    ? extra
      ? `${I.flame}<span>En yüksekte eşitlik: <b>kazanan çıkana dek</b> bir el daha</span>`
      : `${I.target}<span>Hedef <b>${targetOf(s)}</b> · sıradaki eli ${nextP?.human ? '<b>sen</b> dağıtıyorsun' : `<b>${esc(nextWho)}</b> dağıtıyor`}</span>`
    : `${I.target}<span><b>En az ceza</b> kazanır · sıradaki eli ${nextP?.human ? '<b>sen</b> açıyorsun' : nextP ? `<b>${esc(nextWho)}</b> açıyor` : 'kura belirler'}</span>`;
  const sp = d.speaker ? by(d.speaker.seat) : undefined;
  const handsTotal = handsOf(s);
  const pips = !pisti && handsTotal > 1
    ? `<div class="kh-sb__pips" aria-label="${done}/${handsTotal}">${Array.from({length: handsTotal}, (_, i) => `<i class="${i < done ? 'on' : ''}${i === done - 1 ? ' is-new' : ''}"></i>`).join('')}<b class="kh-num">${done}/${handsTotal}</b></div>`
    : '';
  const el = h('div', `kh-screen kh-ia is-${s.game} is-m${s.mode}${extra ? ' is-extra' : ''}`);
  el.innerHTML = `<div class="kh-ia__scrim"></div>
    <div class="kh-ia__col">
      <header class="kh-ia__head">
        <div class="kh-ia__kicker">${GAME_ICON[s.game]}<span>${esc(title(s))}</span></div>
        <div class="kh-title kh-ia__title">${g3(extra ? 'Uzatma!' : `${done}. El Bitti`, extra ? '' : 'is-white')}</div>
        <div class="kh-ia__sub">${sub}</div>
        ${pips}
      </header>
      <section class="kh-ia__stage${sp ? '' : ' is-empty'}">
        ${sp ? `<div class="kh-ia__bust"><img src="${sp.char.poses[d.speaker!.pose]}" alt=""><span class="kh-ia__tag">${esc(sp.char.name)}</span></div>` : ''}
        <div class="kh-say kh-ia__say" aria-live="polite"><small></small><span class="kh-ia__line"></span></div>
      </section>
      <section class="kh-panel kh-sb is-n${views.length}">${views.map(v => rowHtml(s, v, d.frame, true)).join('')}</section>
      <div class="kh-ia__note">${note}</div>
      <div class="kh-ia__btns">
        <button class="kh-btn kh-btn--1 kh-btn--xl kh-btn--block kh-ia__next" data-act="next">${I.play}<span>Sonraki El</span><small class="kh-ia__no">${done + 1}. El</small><i class="kh-ia__timer"><i></i></i></button>
        <button class="kh-ia__leave" data-act="leave">${I.exit}<span>Masadan kalk</span></button>
      </div>
    </div>`;
  ctx.layer.append(el);
  const g = (sel: string) => q(el, sel);
  const say = g('.kh-ia__say');
  say.style.visibility = 'hidden';

  // ---- giriş ----
  play(g('.kh-ia__scrim'), [{opacity: 0}, {opacity: 1}], {duration: 260, easing: 'ease-out', fill: 'backwards'});
  play(g('.kh-ia__kicker'), [{opacity: 0, transform: 'translateY(-8px)'}, {opacity: 1, transform: 'none'}], {duration: 280, delay: 40, fill: 'backwards'});
  play(g('.kh-ia__title'), [{transform: 'scale(1.5) rotate(-5deg)', opacity: 0}, {transform: 'scale(.96) rotate(-1deg)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 420, delay: 80, easing: EASE.out, fill: 'backwards'});
  play(g('.kh-ia__sub'), [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}], {duration: 260, delay: 260, fill: 'backwards'});
  const bust = el.querySelector('.kh-ia__bust');
  if (bust) play(bust, [{transform: 'translateY(40%) scale(.8)', opacity: 0}, {transform: 'translateY(-3%) scale(1.03)', opacity: 1, offset: 0.65}, {transform: 'none', opacity: 1}], {duration: 520, delay: 160, easing: EASE.out, fill: 'backwards'});
  const rows = Array.from(el.querySelectorAll<HTMLElement>('.kh-sb__row'));
  rows.forEach((r, i) => play(r, [{transform: 'translateX(-22px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 300, delay: 220 + i * 70, easing: EASE.out, fill: 'backwards'}));
  play(g('.kh-ia__note'), [{opacity: 0}, {opacity: 1}], {duration: 300, delay: 420, fill: 'backwards'});
  play(g('.kh-ia__btns'), [{transform: 'translateY(36px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 400, delay: 300, easing: EASE.spring, fill: 'backwards'});

  // ---- sayımlar: bu elin değeri 0 → N, sonra toplam önceki → yeni, çubuk ilerler; lider tacı iner ----
  const t0 = 520 + rows.length * 70;
  scope.timeout(() => {
    ctx.sounds.deal?.();
    rows.forEach(r => {
      const b = r.querySelector<HTMLElement>('.kh-sb__delta b[data-v]');
      if (b) void countUp(scope, b, 0, Number(b.dataset.v), 420);
      const cell = r.querySelector('.kh-sb__cells .is-new');
      if (cell) play(cell, [{transform: 'scale(.2)', opacity: 0}, {transform: 'scale(1.25)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 380, easing: EASE.out});
    });
    const pip = el.querySelector('.kh-sb__pips .is-new');
    if (pip) play(pip, [{transform: 'scale(.2)'}, {transform: 'scale(1.5)', offset: 0.6}, {transform: 'none'}], {duration: 420, easing: EASE.out});
  }, ANIM ? t0 : 0);
  const t1 = t0 + 480;
  scope.timeout(() => {
    rows.forEach(r => {
      const tot = q(r, '.kh-sb__tot');
      const from = Number(tot.dataset.from), to = Number(tot.dataset.v);
      if (to !== from) void countUp(scope, tot, from, to, 620);
      const fill = r.querySelector<HTMLElement>('.kh-sb__fill');
      if (fill) play(fill, [{transform: `scaleX(${fill.dataset.k0})`}, {transform: `scaleX(${fill.dataset.k1})`}], {duration: 720, easing: EASE.outQuart, fill: 'forwards'});
    });
    ctx.sounds.coin(2);
  }, ANIM ? t1 : 0);
  scope.timeout(() => {
    el.querySelectorAll<HTMLElement>('.kh-sb__row.is-lead .kh-sb__crown').forEach(c =>
      play(c, [{transform: 'translate(-50%, -60px) rotate(-30deg) scale(.5)', opacity: 0}, {transform: 'translate(-50%, 4px) rotate(6deg) scale(1.1)', opacity: 1, offset: 0.7}, {transform: 'translate(-50%, 0) rotate(-10deg)', opacity: 1}],
        {duration: 480, easing: EASE.out, fill: 'backwards'}));
    const me = el.querySelector('.kh-sb__row.is-me.is-lead');
    if (me) {
      ctx.sounds.slam?.();
      haptic('light');
    }
  }, ANIM ? t1 + 560 : 0);
  if (!ANIM) rows.forEach(r => {
    q(r, '.kh-sb__tot').textContent = fmt(Number(q(r, '.kh-sb__tot').dataset.v));
    r.querySelectorAll<HTMLElement>('.kh-sb__delta b[data-v]').forEach(b => (b.textContent = fmt(Number(b.dataset.v))));
  });

  // ---- konuşma balonu (sahnede, büstün yanında) ----
  let sayTok = 0;
  const bubble: Bubble = {
    show(text, _mood, ms) {
      if (!scope.alive) return;
      const tok = ++sayTok;
      q(say, 'small').textContent = sp ? sp.char.name : '';
      q(say, '.kh-ia__line').textContent = text;
      say.style.visibility = 'visible';
      play(say, [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.05)', opacity: 1, offset: 0.6}, {transform: 'none', opacity: 1}], {duration: 300, easing: EASE.out});
      scope.timeout(() => tok === sayTok && bubble.hide(), Math.max(1800, ms) + 2500); // güvenlik: yönetici kapatmazsa
    },
    hide() {
      if (!scope.alive || say.style.visibility === 'hidden') return;
      sayTok++;
      play(say, [{opacity: 1}, {opacity: 0, transform: 'scale(.94)'}], {duration: 180, fill: 'forwards'}).onfinish = () => {
        if (!scope.alive) return;
        say.style.visibility = 'hidden';
        say.getAnimations().forEach(a => a.cancel());
      };
    },
  };

  // ---- SONRAKİ EL: dokun ya da süre dolsun; "Masadan kalk" onaylı ----
  const timer = el.querySelector<HTMLElement>('.kh-ia__timer i');
  let tAuto = 0;
  let timerAnim: Animation | null = null;
  const arm = () => {
    if (!d.autoMs) return;
    const left = d.autoMs;
    if (timer) timerAnim = play(timer, [{transform: 'scaleX(1)'}, {transform: 'scaleX(0)'}], {duration: left, delay: 0, easing: 'linear', fill: 'forwards'});
    window.clearTimeout(tAuto);
    tAuto = window.setTimeout(() => finish('next'), left);
  };
  const disarm = () => {
    window.clearTimeout(tAuto);
    timerAnim?.cancel();
    timerAnim = null;
  };
  scope.add(disarm);
  let resolve!: (r: 'next' | 'leave') => void;
  const result = new Promise<'next' | 'leave'>(r => (resolve = r));
  let closing = false;
  const finish = async (r: 'next' | 'leave') => {
    if (closing) return;
    closing = true;
    disarm();
    el.style.pointerEvents = 'none';
    if (r === 'next') {
      ctx.sounds.whoosh();
      haptic('light');
    }
    if (ANIM) await el.animate([{opacity: 1}, {opacity: 0}], {duration: 220, easing: 'ease-in', fill: 'forwards'}).finished.catch(() => undefined);
    scope.dispose();
    el.remove();
    resolve(r);
  };
  arm();
  const btns = g('.kh-ia__btns');
  const btnsHtml = btns.innerHTML;
  onAct(scope, el, a => {
    if (closing) return;
    if (a === 'next') return void finish('next');
    ctx.sounds.tap();
    if (a === 'leave') {
      disarm();
      btns.innerHTML = `<div class="kh-confirm kh-ia__confirm">
        <div class="kh-confirm__t">Maçı bırakıyor musun?</div>
        <div class="kh-confirm__s">${stakeLine(d.stake)}</div>
        <div class="kh-confirm__row"><button class="kh-btn kh-btn--2" data-act="stay">Vazgeç</button><button class="kh-btn kh-btn--3" data-act="sure">${I.exit}Maçı Bırak</button></div></div>`;
      play(btns, [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 220, easing: EASE.out});
    } else if (a === 'stay') {
      btns.innerHTML = btnsHtml;
      arm();
    } else if (a === 'sure') void finish('leave');
  });
  return {bubble, done: result};
}

// =====================================================================================================
// Yarım kalan maç: "devam et?" (açılışta, ana ekranın üstünde)
// =====================================================================================================
export function resumePrompt(ctx: Ctx, d: ResumeData): Promise<'resume' | 'forfeit'> {
  return new Promise(res => {
    const s = d.series;
    const views = sideViews(s, d.players);
    const next = s.hands.length + 1;
    const pisti = s.game === 'pisti';
    const where = s.hands.length ? `${next}. elden devam` : 'İlk elden başlar';
    const list = `<div class="kh-resume__list">
        <button class="kh-btn kh-btn--1 kh-btn--lg kh-btn--block kh-shine" data-act="resume">${I.play}Devam Et</button>
        <button class="kh-btn kh-btn--4 kh-btn--block" data-act="drop">${I.exit}Maçı Bırak</button>
      </div>`;
    const confirm = `<div class="kh-confirm">
        <div class="kh-confirm__t">Maçı bırakıyor musun?</div>
        <div class="kh-confirm__s">${stakeLine(d.stake)}</div>
        <div class="kh-confirm__row"><button class="kh-btn kh-btn--2" data-act="back">Vazgeç</button><button class="kh-btn kh-btn--3" data-act="sure">${I.exit}Bırak</button></div></div>`;
    let m: ReturnType<typeof openModal>;
    let settled = false;
    const done = (r: 'resume' | 'forfeit') => {
      if (settled) return;
      settled = true;
      m.close();
      res(r);
    };
    m = openModal(ctx, {
      cls: 'kh-resume',
      title: 'Yarım Kalan Maç',
      body: `<div class="kh-resume__kicker">${GAME_ICON[s.game]}<span>${esc(title(s))}</span></div>
        <div class="kh-resume__sub"><span>${where}</span><span class="kh-resume__stake">Masada <img src="${ASSETS.icon_coin}" alt=""><b class="kh-num">${fmt(d.stake)}</b></span></div>
        ${s.hands.length ? `<section class="kh-sb is-static is-n${views.length}">${views.map(v => rowHtml(s, v, d.frame, false)).join('')}</section>` : ''}
        <p class="kh-resume__q">Kaldığın yerden devam edelim mi?${pisti ? '' : ' En az ceza kazanır.'}</p>
        <div class="kh-resume__body">${list}</div>`,
    });
    const body = q(m.panel, '.kh-resume__body');
    const swap = (html: string) => {
      body.innerHTML = html;
      play(body, [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 220, easing: EASE.out});
    };
    m.panel.querySelectorAll('.kh-sb__row').forEach((r, i) =>
      play(r, [{transform: 'translateX(-16px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 280, delay: 160 + i * 60, easing: EASE.out, fill: 'backwards'}));
    onAct(m.scope, m.panel, a => {
      ctx.sounds.tap();
      if (a === 'resume') done('resume');
      else if (a === 'drop') swap(confirm);
      else if (a === 'back') swap(list);
      else if (a === 'sure') done('forfeit');
    });
    if (d.auto) m.scope.timeout(() => done('resume'), 500);
  });
}
