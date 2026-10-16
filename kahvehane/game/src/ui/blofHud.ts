// Blöf oyun içi arayüzü (masanın üstünde, HUD'un yanında): tur madalyonu, yığın/kenar sayaçları, rakip kart sayısı rozetleri,
// eylem çubuğu (Pas · "3 tane 7 at"), değer seçici, BLÖF düğmesi (5 sn dolan halka), "BLÖF!" çağrısı, YAKALANDI / DOĞRU ÇIKTI
// damgası ve öğretici (Rıza Amca). Konumlar BlofTable düzeninden gelir (yalnız transform yazılır).
// Animasyonlar yalnız transform/opacity; sonsuz döngü yok (boşta 0 kare).
import './blofHud.css';
import {ANIM, EASE, esc, h, play, q} from './dom';
import {g3} from './fx';
import {I} from './icons';
import type {BlofLayout} from '../table2d/blofTable';

export const RANK_GLYPH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RANK_NAME = ['', 'As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Vale', 'Kız', 'Papaz'];
/** "3 tane 7" */
export const claimText = (n: number, rank: number): string => `${n} tane ${RANK_NAME[rank] ?? '?'}`;

export interface BlofHudSounds {
  tap(): void;
  tick(i: number): void;
  slam(): void;
}

/** Eylem çubuğu: off (gizli) · wait (sıra başkasında; seçim varsa küçük bilgi) · open (turu sen açıyorsun) · follow (aynı değeri sürdür) */
export interface BarState {
  mode: 'off' | 'wait' | 'open' | 'follow';
  rank: number | null;
  sel: number;
  canPass: boolean;
}

const pos = (el: HTMLElement, x: number, y: number) => (el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`);

export class BlofHud {
  readonly el = h('div', 'bl-hud');
  onPlay: () => void = () => {};
  onPass: () => void = () => {};
  onRank: (rank: number) => void = () => {};
  onBlof: () => void = () => {};
  onLetGo: () => void = () => {};
  onClear: () => void = () => {};
  onSkipTutorial: () => void = () => {};
  private L: BlofLayout | null = null;
  private claim: HTMLElement;
  private claimIn: HTMLElement;
  private claimRank = 0;
  private last: HTMLElement;
  private pileChip: HTMLElement;
  private outChip: HTMLElement;
  private chips: HTMLElement[] = [];
  private counts: number[] = [];
  private bar: HTMLElement;
  private passBtn: HTMLButtonElement;
  private playBtn: HTMLButtonElement;
  private rankBtn: HTMLButtonElement;
  private selInfo: HTMLElement;
  private picker: HTMLElement;
  private pickBtns: HTMLButtonElement[] = [];
  private pickOpen = false;
  private blof: HTMLElement;
  private blofBtn: HTMLButtonElement;
  private letGo: HTMLButtonElement;
  private blofTok = 0;
  private stampEl: HTMLElement;
  private callEl: HTMLElement;
  private coachEl: HTMLElement;
  private pointEl: HTMLElement;
  private state: BarState = {mode: 'off', rank: null, sel: 0, canPass: false};
  private held: number[] = new Array(14).fill(0);
  private suggest = 0;

  constructor(parent: HTMLElement, private snd: BlofHudSounds | null = null) {
    this.el.innerHTML = `
      <div class="bl-claim"><div class="bl-claim__in"><span class="bl-claim__lbl">TUR</span><b class="bl-claim__g"></b><span class="bl-claim__nm"></span></div></div>
      <div class="bl-last"><span></span></div>
      <div class="bl-pilechip">${I.cards}<b class="kh-num">0</b></div>
      <div class="bl-outchip"><span>KENAR</span><b class="kh-num">0</b></div>
      <div class="bl-bar">
        <button class="kh-btn kh-btn--4 bl-pass">PAS</button>
        <button class="bl-rank" aria-label="Değeri değiştir"><b></b><i>▾</i></button>
        <button class="kh-btn kh-btn--1 bl-play"><span></span></button>
      </div>
      <div class="bl-sel"><span></span><button class="bl-sel__x" aria-label="Seçimi temizle">${I.close}</button></div>
      <div class="bl-pick"><div class="bl-pick__t">Hangi değeri söylüyorsun?</div><div class="bl-pick__g"></div></div>
      <div class="bl-blof"><div class="bl-blof__ring"><i class="bl-blof__h is-r"><b></b></i><i class="bl-blof__h is-l"><b></b></i></div>
        <button class="bl-blof__btn" aria-label="Blöf de">${g3('BLÖF!', 'is-white')}</button>
        <button class="bl-blof__go">Geç</button></div>
      <div class="bl-call"><div class="bl-call__in">${g3('BLÖF!', 'is-white')}</div></div>
      <div class="bl-stamp"><div class="bl-stamp__in"><i class="bl-stamp__glow"></i><div class="bl-stamp__w"></div><div class="bl-stamp__s"></div></div></div>
      <div class="bl-point">${I.hand}</div>
      <div class="bl-coach"><div class="bl-coach__face"><img alt="" draggable="false"></div><div class="bl-coach__body"><b class="bl-coach__name">Rıza Amca</b><p></p></div>
        <button class="bl-coach__skip">Atla</button></div>`;
    this.claim = q(this.el, '.bl-claim');
    this.claimIn = q(this.el, '.bl-claim__in');
    this.last = q(this.el, '.bl-last');
    this.pileChip = q(this.el, '.bl-pilechip');
    this.outChip = q(this.el, '.bl-outchip');
    this.bar = q(this.el, '.bl-bar');
    this.passBtn = q(this.el, '.bl-pass');
    this.playBtn = q(this.el, '.bl-play');
    this.rankBtn = q(this.el, '.bl-rank');
    this.selInfo = q(this.el, '.bl-sel');
    this.picker = q(this.el, '.bl-pick');
    this.blof = q(this.el, '.bl-blof');
    this.blofBtn = q(this.el, '.bl-blof__btn');
    this.letGo = q(this.el, '.bl-blof__go');
    this.stampEl = q(this.el, '.bl-stamp');
    this.callEl = q(this.el, '.bl-call');
    this.coachEl = q(this.el, '.bl-coach');
    this.pointEl = q(this.el, '.bl-point');
    const grid = q(this.el, '.bl-pick__g');
    for (let r = 1; r <= 13; r++) {
      const b = h('button', 'bl-pick__r', `<b>${RANK_GLYPH[r]}</b><span>${RANK_NAME[r].length > 2 ? esc(RANK_NAME[r]) : ''}</span><i class="kh-num"></i>`);
      b.dataset.r = String(r);
      b.addEventListener('click', () => this.pick(r));
      this.pickBtns.push(b);
      grid.append(b);
    }
    // tek dokunuş, hızlı tepki: pointerdown yerine click (kaydırarak seçimde yanlış basma olmasın) ama basma yaylı
    this.passBtn.addEventListener('click', () => {
      if (this.state.mode === 'follow' && this.state.canPass) this.onPass();
    });
    this.playBtn.addEventListener('click', () => {
      const s = this.state;
      if ((s.mode === 'open' || s.mode === 'follow') && s.sel > 0 && s.rank) this.onPlay();
      else if (s.mode === 'open' && !s.rank) this.openPicker(true);
      else if (s.sel === 0) this.nudge();
    });
    this.rankBtn.addEventListener('click', () => {
      this.snd?.tap();
      this.openPicker(true);
    });
    q(this.el, '.bl-sel__x').addEventListener('click', () => {
      this.snd?.tap();
      this.onClear();
    });
    this.blofBtn.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (this.blof.classList.contains('is-on')) this.onBlof();
    });
    this.letGo.addEventListener('click', () => {
      if (this.blof.classList.contains('is-on')) this.onLetGo();
    });
    q(this.el, '.bl-coach__skip').addEventListener('click', () => {
      this.snd?.tap();
      this.onSkipTutorial();
    });
    parent.append(this.el);
  }

  show(on: boolean): void {
    this.el.classList.toggle('is-on', on);
    if (!on) {
      this.closeBlof(false);
      this.coach(null);
      this.setBar({mode: 'off', rank: null, sel: 0, canPass: false});
    }
  }

  /** Yeni el: rozetler koltuk sayısına göre kurulur, sayaçlar sıfırlanır. */
  reset(seats: number, team?: number[]): void {
    for (const c of this.chips) c.remove();
    this.chips = [];
    this.counts = new Array(seats).fill(-1);
    for (let s = 0; s < seats; s++) {
      const c = h('div', 'bl-cnt' + (s === 0 ? ' is-me' : '') + (team && team[s] !== undefined && team[s] >= 0 ? ` team-${team[s] === team[0] ? 'a' : 'b'}` : ''), `<div class="bl-cnt__in">${I.cards}<b class="kh-num">0</b></div>`);
      this.chips.push(c);
      this.el.insertBefore(c, this.bar);
    }
    this.setClaim(null);
    this.setLast(null);
    this.setPile(0);
    this.setOut(0);
    this.coach(null);
    this.closeBlof(false);
    this.closePicker();
    this.setBar({mode: 'off', rank: null, sel: 0, canPass: false});
  }

  // ───────── yerleşim ─────────
  layout(L: BlofLayout): void {
    this.L = L;
    this.el.style.setProperty('--bl-u', L.u + 'px');
    pos(this.claim, L.claim.x, L.claim.y);
    this.claim.style.setProperty('--d', L.claim.d + 'px');
    pos(this.last, L.claim.x, L.claim.y + L.claim.d / 2 + L.u * 0.55);
    const pw = L.cw * L.pile.s, ph = L.ch * L.pile.s;
    pos(this.pileChip, L.pile.x, L.pile.y + ph * 0.5 + L.u * 0.55);
    pos(this.outChip, L.discard.x, L.discard.y + L.ch * L.discard.s * 0.5 + L.u * 0.75);
    void pw;
    for (let s = 1; s < this.chips.length; s++) {
      const p = L.seats[s]?.chip;
      if (p) pos(this.chips[s], p.x, p.y);
    }
    this.placeBar();
    pos(this.blof, L.blof.x, L.blof.y);
    this.blof.style.setProperty('--d', L.blof.d + 'px');
  }

  /** Çubuk elin üstünde; benim rozetim çubuğun solunda (HUD rozeti CSS değişkeniyle aynı satıra iner). */
  private placeBar(): void {
    const L = this.L;
    if (!L) return;
    const y = L.barY;
    this.bar.style.top = y + 'px';
    this.selInfo.style.top = y + 'px';
    this.picker.style.bottom = Math.max(0, L.H - y - Math.max(44, L.u * 3) / 2) + 'px';
    document.documentElement.style.setProperty('--bl-bar-y', y + 'px');
    const me = this.chips[0];
    if (me) pos(me, 0, 0);
  }

  relayoutBar(L: BlofLayout): void {
    this.L = L;
    this.placeBar();
  }

  // ───────── tur madalyonu / son atış / sayaçlar ─────────
  setClaim(rank: number | null): void {
    if (!rank) {
      if (this.claimRank) play(this.claimIn, [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(.6)', opacity: 0}], {duration: 220, easing: 'ease-in', fill: 'forwards'});
      this.claimRank = 0;
      this.claim.classList.remove('is-on');
      return;
    }
    const changed = rank !== this.claimRank;
    this.claimRank = rank;
    this.claim.classList.add('is-on');
    q(this.claim, '.bl-claim__g').innerHTML = g3(RANK_GLYPH[rank], 'is-white');
    q(this.claim, '.bl-claim__nm').textContent = RANK_NAME[rank].length > 2 ? RANK_NAME[rank].toLocaleUpperCase('tr-TR') : '';
    if (changed) {
      play(this.claimIn, [
        {transform: 'scale(1.9) rotate(-16deg)', opacity: 0},
        {transform: 'scale(.9) rotate(3deg)', opacity: 1, offset: 0.55},
        {transform: 'scale(1.05) rotate(-1deg)', opacity: 1, offset: 0.78},
        {transform: 'scale(1) rotate(0deg)', opacity: 1},
      ], {duration: 420, easing: EASE.out, fill: 'both'});
      this.snd?.slam();
    }
  }

  /** Son atış: "Cem · 3 kart" (madalyonun altında). */
  setLast(who: string | null, n = 0): void {
    if (!who) {
      this.last.classList.remove('is-on');
      return;
    }
    q(this.last, 'span').innerHTML = `${esc(who)} <b>${n}</b> kart`;
    this.last.classList.add('is-on');
    play(this.last.firstElementChild!, [{transform: 'translate(-50%,0) scale(.6)', opacity: 0}, {transform: 'translate(-50%,0) scale(1.08)', opacity: 1, offset: 0.6}, {transform: 'translate(-50%,0) scale(1)', opacity: 1}],
      {duration: 280, easing: EASE.out});
  }

  setPile(n: number): void {
    this.pileChip.classList.toggle('is-on', n > 0);
    const b = q(this.pileChip, 'b');
    if (b.textContent !== String(n)) {
      b.textContent = String(n);
      if (n > 0) play(b, [{transform: 'scale(1.5)'}, {transform: 'scale(1)'}], {duration: 240, easing: EASE.out});
    }
  }

  setOut(n: number): void {
    this.outChip.classList.toggle('is-on', n > 0);
    q(this.outChip, 'b').textContent = String(n);
  }

  /** Koltuğun kart sayısı (rakip rozeti büyük; 1–2 kart kalınca yanar). */
  setCount(seat: number, n: number, animate = true): void {
    const c = this.chips[seat];
    if (!c) return;
    const was = this.counts[seat];
    if (was === n) return;
    this.counts[seat] = n;
    q(c, 'b').textContent = String(n);
    c.classList.toggle('is-low', n > 0 && n <= 2);
    c.classList.toggle('is-zero', n === 0);
    c.classList.add('is-on');
    if (animate && was >= 0) {
      const up = n > was;
      play(c.firstElementChild!, [{transform: 'translate(-50%,-50%) scale(1)'}, {transform: `translate(-50%,-50%) scale(${up ? 1.35 : 1.18}) rotate(${up ? -6 : 0}deg)`, offset: 0.35}, {transform: 'translate(-50%,-50%) scale(1)'}],
        {duration: up ? 420 : 260, easing: EASE.out});
    }
  }

  // ───────── eylem çubuğu ─────────
  setBar(st: BarState): void {
    const prev = this.state;
    this.state = st;
    const on = st.mode === 'open' || st.mode === 'follow';
    const was = prev.mode === 'open' || prev.mode === 'follow';
    this.bar.classList.toggle('is-on', on);
    this.bar.classList.toggle('is-open', st.mode === 'open');
    if (on && !was) play(this.bar, [{transform: 'translateY(26px) scale(.92)', opacity: 0}, {transform: 'translateY(0) scale(1)', opacity: 1}], {duration: 320, easing: EASE.spring});
    this.passBtn.disabled = !(st.mode === 'follow' && st.canPass);
    this.passBtn.style.display = st.mode === 'follow' ? '' : 'none';
    this.rankBtn.style.display = st.mode === 'open' && st.rank ? '' : 'none';
    if (st.rank) q(this.rankBtn, 'b').innerHTML = g3(RANK_GLYPH[st.rank], 'is-white');
    const label = q(this.playBtn, 'span');
    const ready = on && st.sel > 0 && !!st.rank;
    this.playBtn.classList.toggle('is-idle', !ready);
    const text = !on ? '' : !st.rank ? 'Değer seç' : st.sel === 0 ? 'Kart seç' : `${claimText(st.sel, st.rank)} at`;
    if (label.textContent !== text) {
      label.textContent = text;
      if (ready && was) play(this.playBtn, [{transform: 'scale(1)'}, {transform: 'scale(1.06)', offset: 0.4}, {transform: 'scale(1)'}], {duration: 220, easing: EASE.out});
    }
    // sıra bende değilken seçim bilgisi
    const info = st.mode === 'wait' && st.sel > 0;
    this.selInfo.classList.toggle('is-on', info);
    if (info) q(this.selInfo, 'span').textContent = `${st.sel} kart seçili`;
    if (!on) this.closePicker();
    this.syncSuggest();
  }

  /** Seçimin değeri (hepsi aynıysa) seçicide öneri olarak parlar. */
  setSelectionRank(rank: number): void {
    this.suggest = rank;
    this.syncSuggest();
  }

  private syncSuggest(): void {
    this.pickBtns.forEach((b, i) => b.classList.toggle('is-sug', this.suggest === i + 1));
  }

  /** Değer seçici: eldeki değerler parlak (kaç tane olduğu köşede); olmayanlar sönük ama seçilebilir (blöf!). */
  setHeld(counts: number[]): void {
    this.held = counts.slice();
    this.pickBtns.forEach((b, i) => {
      const n = counts[i + 1] ?? 0;
      b.classList.toggle('is-held', n > 0);
      q(b, 'i').textContent = n > 0 ? '×' + n : '';
    });
  }

  openPicker(animate = true): void {
    if (this.pickOpen) return;
    this.pickOpen = true;
    this.picker.classList.add('is-on');
    this.bar.classList.add('is-picking');
    if (animate) {
      play(this.picker, [{transform: 'translateY(30px) scale(.94)', opacity: 0}, {transform: 'translateY(0) scale(1)', opacity: 1}], {duration: 300, easing: EASE.spring});
      this.pickBtns.forEach((b, i) => play(b, [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 240, delay: 30 + i * 14, easing: EASE.spring, fill: 'backwards'}));
    }
  }

  closePicker(): void {
    if (!this.pickOpen) return;
    this.pickOpen = false;
    this.picker.classList.remove('is-on');
    this.bar.classList.remove('is-picking');
  }

  get picking(): boolean {
    return this.pickOpen;
  }

  private pick(r: number): void {
    this.snd?.tap();
    const b = this.pickBtns[r - 1];
    play(b, [{transform: 'scale(1)'}, {transform: 'scale(1.18)', offset: 0.4}, {transform: 'scale(1)'}], {duration: 220, easing: EASE.out});
    this.closePicker();
    this.onRank(r);
  }

  /** Kart seçmeden basıldı: el hafifçe dürtülür (ipucu) */
  private nudge(): void {
    this.snd?.tap();
    play(this.playBtn, [{transform: 'none'}, {transform: 'translateX(-6px)'}, {transform: 'translateX(6px)'}, {transform: 'translateX(-3px)'}, {transform: 'none'}], {duration: 300, easing: 'ease-out'});
  }

  /** Çubuktaki ana düğmeyi salla (4'ten fazla kart). */
  shakePlay(): void {
    play(this.playBtn, [{transform: 'none'}, {transform: 'translateX(-7px) rotate(-1deg)'}, {transform: 'translateX(7px) rotate(1deg)'}, {transform: 'translateX(-4px)'}, {transform: 'none'}], {duration: 320, easing: 'ease-out'});
  }

  // ───────── BLÖF penceresi ─────────
  /** Kırmızı BLÖF düğmesi; halkası ms içinde dolar. letGo: "Geç" seçeneği. */
  openBlof(ms: number, o: {letGo?: boolean} = {}): void {
    const tok = ++this.blofTok;
    const el = this.blof;
    el.classList.add('is-on');
    this.letGo.style.display = o.letGo ? '' : 'none';
    const halves = Array.from(el.querySelectorAll<HTMLElement>('.bl-blof__h b'));
    halves.forEach(b => b.getAnimations().forEach(a => a.cancel()));
    play(el.querySelector('.bl-blof__btn')!, [{transform: 'scale(.2) rotate(-25deg)', opacity: 0}, {transform: 'scale(1.12) rotate(4deg)', opacity: 1, offset: 0.6}, {transform: 'scale(1) rotate(0deg)', opacity: 1}],
      {duration: 340, easing: EASE.out, fill: 'backwards'});
    play(el.querySelector('.bl-blof__ring')!, [{transform: 'scale(.5)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 300, easing: EASE.out, fill: 'backwards'});
    const half = ms / 2;
    play(halves[0], [{transform: 'rotate(0deg)'}, {transform: 'rotate(180deg)'}], {duration: half, easing: 'linear', fill: 'both'});
    play(halves[1], [{transform: 'rotate(0deg)'}, {transform: 'rotate(180deg)'}], {duration: half, delay: half, easing: 'linear', fill: 'both'});
    // nabız (sonlu): son 1.5 sn daha hızlı
    const btn = this.blofBtn;
    const beats = Math.max(1, Math.floor((ms - 1500) / 700));
    play(btn, [{transform: 'scale(1)'}, {transform: 'scale(1.06)', offset: 0.5}, {transform: 'scale(1)'}], {duration: 700, delay: 340, iterations: beats, easing: 'ease-in-out'});
    play(btn, [{transform: 'scale(1) rotate(0deg)'}, {transform: 'scale(1.08) rotate(-3deg)', offset: 0.25}, {transform: 'scale(1.08) rotate(3deg)', offset: 0.75}, {transform: 'scale(1) rotate(0deg)'}],
      {duration: 300, delay: ms - 1500, iterations: 5, easing: 'ease-in-out'});
    // son 3 saniyede tık
    for (let i = 3; i >= 1; i--) window.setTimeout(() => tok === this.blofTok && this.blof.classList.contains('is-on') && this.snd?.tick(12 - i * 3), ms - i * 1000);
  }

  /** Pencereyi kapat (basıldıysa düğme patlayarak, değilse sönerek). */
  closeBlof(pressed: boolean): void {
    this.blofTok++;
    const el = this.blof;
    if (!el.classList.contains('is-on')) return;
    const btn = this.blofBtn;
    const ring = el.querySelector<HTMLElement>('.bl-blof__ring')!;
    btn.getAnimations().forEach(a => a.cancel());
    const a = pressed
      ? play(btn, [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(1.35)', opacity: 1, offset: 0.4}, {transform: 'scale(1.6)', opacity: 0}], {duration: 300, easing: 'ease-out', fill: 'forwards'})
      : play(btn, [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(.6)', opacity: 0}], {duration: 200, easing: 'ease-in', fill: 'forwards'});
    play(ring, [{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'});
    const end = () => {
      el.classList.remove('is-on');
      btn.getAnimations().forEach(x => x.cancel());
      ring.getAnimations().forEach(x => x.cancel());
      el.querySelectorAll<HTMLElement>('.bl-blof__h b').forEach(b => b.getAnimations().forEach(x => x.cancel()));
    };
    if (ANIM) a.finished.then(end, end);
    else end();
  }

  get blofOpen(): boolean {
    return this.blof.classList.contains('is-on');
  }

  // ───────── blöf anı ─────────
  /** "BLÖF!" çağrısı: çizgi roman patlaması, çağıranın yanından yığına doğru fırlar. */
  call(from: {x: number; y: number}, to: {x: number; y: number}): Promise<void> {
    const el = this.callEl;
    el.style.display = 'block';
    const inn = el.firstElementChild as HTMLElement;
    const mx = from.x + (to.x - from.x) * 0.55, my = from.y + (to.y - from.y) * 0.55;
    const W = this.L?.W ?? innerWidth;
    const cx = Math.max(W * 0.2, Math.min(W * 0.8, mx));
    const p = (x: number, y: number) => `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    pos(el, 0, 0);
    const a = play(inn, [
      {transform: `${p(from.x, from.y)} translate(-50%,-50%) scale(.2) rotate(-30deg)`, opacity: 0},
      {transform: `${p(cx, my)} translate(-50%,-50%) scale(1.25) rotate(-8deg)`, opacity: 1, offset: 0.28},
      {transform: `${p(cx, my)} translate(-50%,-50%) scale(1) rotate(-6deg)`, opacity: 1, offset: 0.4},
      {transform: `${p(cx, my)} translate(-50%,-50%) scale(1.02) rotate(-6deg)`, opacity: 1, offset: 0.82},
      {transform: `${p(cx, my - 20)} translate(-50%,-50%) scale(1.1) rotate(-6deg)`, opacity: 0},
    ], {duration: 1050, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both'}, 0.4);
    return new Promise(res => {
      const end = () => {
        el.style.display = 'none';
        res();
      };
      if (ANIM) a.finished.then(end, end);
      else window.setTimeout(end, 0);
    });
  }

  /** YAKALANDI! (kırmızı) / DOĞRU ÇIKTI! (yeşil) damgası; alt satır kimin yığını aldığını söyler. */
  stamp(kind: 'caught' | 'truth', sub: string, y: number, ms = 1500): Promise<void> {
    const el = this.stampEl;
    el.className = 'bl-stamp is-on ' + (kind === 'caught' ? 'is-caught' : 'is-truth');
    el.style.top = y + 'px';
    q(el, '.bl-stamp__w').innerHTML = g3(kind === 'caught' ? 'YAKALANDI!' : 'DOĞRU ÇIKTI!', 'is-white');
    q(el, '.bl-stamp__s').textContent = sub;
    const inn = q(el, '.bl-stamp__in');
    const glow = q(el, '.bl-stamp__glow');
    const sub2 = q(el, '.bl-stamp__s');
    const a = play(inn, [
      {transform: 'scale(2.3) rotate(-14deg)', opacity: 0},
      {transform: 'scale(.92) rotate(-4deg)', opacity: 1, offset: 0.1},
      {transform: 'scale(1.04) rotate(-3deg)', opacity: 1, offset: 0.16},
      {transform: 'scale(1) rotate(-3deg)', opacity: 1, offset: 0.78},
      {transform: 'translateY(-30px) scale(1.04) rotate(-3deg)', opacity: 0},
    ], {duration: ms, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'}, 0.45);
    play(glow, [{transform: 'scale(.4)', opacity: 0}, {transform: 'scale(1.1)', opacity: 1, offset: 0.14}, {transform: 'scale(1)', opacity: 0.85, offset: 0.7}, {transform: 'scale(1.2)', opacity: 0}],
      {duration: ms, easing: 'ease-out', fill: 'both'}, 0.45);
    play(sub2, [{transform: 'translateY(10px)', opacity: 0}, {transform: 'translateY(10px)', opacity: 0, offset: 0.16}, {transform: 'translateY(0)', opacity: 1, offset: 0.26}, {transform: 'none', opacity: 1}],
      {duration: ms, easing: 'ease-out', fill: 'both'}, 0.45);
    return new Promise(res => {
      const end = () => {
        el.className = 'bl-stamp';
        res();
      };
      if (ANIM) a.finished.then(end, end);
      else window.setTimeout(() => res(), 0);
    });
  }

  // ───────── öğretici ─────────
  /**
   * Rıza Amca öğretir: balon panel (portre + metin + Atla) ve hedefi gösteren el.
   * target: işaret edilecek nokta (yoksa el gizli); at: panelin dikey konumu ('top' masanın üstü, 'mid' ortası).
   */
  coach(o: {text: string; face?: string; target?: {x: number; y: number} | null; at?: 'top' | 'mid'} | null): void {
    const el = this.coachEl;
    const pt = this.pointEl;
    if (!o) {
      el.classList.remove('is-on');
      pt.classList.remove('is-on');
      pt.getAnimations().forEach(a => a.cancel());
      return;
    }
    const was = el.classList.contains('is-on');
    el.classList.add('is-on');
    el.classList.toggle('is-mid', o.at === 'mid');
    if (o.face) q<HTMLImageElement>(el, 'img').src = o.face;
    const p = q(el, 'p');
    p.textContent = o.text;
    play(was ? p : el, was ? [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}] : [{transform: 'translateY(-20px) scale(.9)', opacity: 0}, {transform: 'none', opacity: 1}],
      {duration: was ? 220 : 340, easing: EASE.spring});
    pt.getAnimations().forEach(a => a.cancel());
    if (o.target) {
      pt.classList.add('is-on');
      const {x, y} = o.target;
      const base = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      // 8 vuruş (sonlu; boşta kare üretmesin)
      play(pt, [{transform: `${base} translate(0,0) rotate(-12deg)`}, {transform: `${base} translate(4px,12px) rotate(-12deg) scale(.92)`, offset: 0.5}, {transform: `${base} translate(0,0) rotate(-12deg)`}],
        {duration: 760, iterations: 8, easing: 'ease-in-out', fill: 'both'});
    } else pt.classList.remove('is-on');
  }

  // ───────── HUD noktaları ─────────
  /** Eylem çubuğundaki öğelerin ekran merkezi (öğretici eli için). */
  where(k: 'play' | 'pass' | 'blof' | 'picker' | 'rank'): {x: number; y: number} | null {
    const el = k === 'play' ? this.playBtn : k === 'pass' ? this.passBtn : k === 'blof' ? this.blofBtn : k === 'rank' ? this.rankBtn : this.picker;
    const r = el.getBoundingClientRect();
    if (!r.width) return null;
    return {x: r.left + r.width / 2, y: r.top + r.height / 2};
  }

  get heldCounts(): number[] {
    return this.held;
  }
}
