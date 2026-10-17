// Hızlı sohbet penceresi: oyun içinde sohbet düğmesine dokununca alttan açılan küçük pencere. Oyuncunun KARAKTERİNE göre
// 3–4 kelimelik sözler (ai/quickTalk.ts → chatMenu; eşlide takım mesajları), iki sütun; "Rakipleri sustur" anahtarı; bekleme
// şeridi. Bir olaydan hemen sonra açılırsa uygun 3–4 söz başta ve altın kenarlı (hot) gelir; öğe sayısı değişmez.
// Performans: ilk açılışta BİR KEZ kurulur (14 düğme), sonra yalnız yazılar / görünürlük güncellenir; animasyonlar yalnız
// transform/opacity; kapalıyken hidden (boyanmaz). Dinleyiciler pencere ömrü boyunca tek (uygulama ömrü).
import './quickchat.css';
import type {QuickChatItem, QuickChatSheetPort} from './types';
import {ANIM, EASE, h, play, q} from './dom';
import {I, SUIT} from './icons';
import type {Ctx} from './parts';

const svg = (body: string, fill = false): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;

/** QUICK_CHAT simge anahtarları → küçük çizimler (emoji yok). */
const ICONS: Record<string, string> = {
  wave: svg('<path d="M8.5 12V6.2a1.4 1.4 0 0 1 2.8 0V11M11.3 10.5V4.8a1.4 1.4 0 0 1 2.8 0v5.9M14.1 10.7V6.4a1.4 1.4 0 0 1 2.8 0v7.1a6.4 6.4 0 0 1-6.4 6.4h-.4a5.8 5.8 0 0 1-4.6-2.3L3.6 14.6a1.4 1.4 0 0 1 2.1-1.9L8.5 15"/><path d="M19.5 3.5c1 .8 1.6 1.9 1.7 3.2M3.2 6.5c.2-1.3.9-2.4 1.9-3.1"/>'),
  handshake: svg('<path d="M2.5 9.5 6 6.5l3.5 1.5L12 6.5l3 1 3.5-1.5 3 3"/><path d="M2.5 9.5l4 5.5 2.2-.6 1.6 1.6 1.8-.4 1.6 1.4 1.8-.6 1.8 1 3.2-3.4-3-4.2-3.4 1.4-2.6-1.6"/>'),
  thumb: svg('<path d="M7.5 10.5V20H4.2a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1zM7.5 10.5l3.6-6.4a1.9 1.9 0 0 1 3.4 1.5l-.9 3.6h5a2 2 0 0 1 2 2.4l-1.3 6.6A2.3 2.3 0 0 1 17 20H7.5"/>'),
  star: svg('<path d="M12 2.8l2.75 5.75 6.3.8-4.62 4.38 1.17 6.27L12 16.95 6.4 20l1.17-6.27L2.95 9.35l6.3-.8z"/>', true),
  clover: svg('<circle cx="12" cy="7.2" r="3.6"/><circle cx="7.2" cy="12" r="3.6"/><circle cx="16.8" cy="12" r="3.6"/><circle cx="12" cy="16.8" r="3.6"/><path d="M12 12l4.5 9" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>', true),
  clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4.4l2.8 1.8M9.5 2.5h5M19 5.5l1.5 1.5"/>'),
  hourglass: svg('<path d="M6.5 3h11M6.5 21h11M7.5 3c0 4.5 4.5 6 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 6-4.5 9s4.5 4.5 4.5 9"/><path d="M9.5 18.5h5L12 16z" fill="currentColor"/>'),
  oops: svg('<circle cx="12" cy="12" r="8.6"/><path d="M7.6 9.2l2.2 1.3-2.2 1.3M16.4 9.2l-2.2 1.3 2.2 1.3M8.8 16.4c1.8-1.6 4.6-1.6 6.4 0"/>'),
  shock: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 6.8v6.4M12 16.6h.01" stroke-width="3"/>'),
  heart: svg(SUIT.h, true),
  tea: svg('<path d="M7 7.5h10l-1.4 4.3c-.5 1.6-.4 3.2.3 4.7l.4.9a2 2 0 0 1-1.8 2.9H9.5a2 2 0 0 1-1.8-2.9l.4-.9c.7-1.5.8-3.1.3-4.7z"/><path d="M5.5 21.5h13M9.5 4.6c0-1 .9-1 .9-2M13.5 4.6c0-1 .9-1 .9-2"/>'),
  swords: svg('<path d="M4 4l9.5 9.5M4 4v3.4M4 4h3.4M20 4l-9.5 9.5M20 4v3.4M20 4h-3.4M7 14.5l2.5 2.5-3 3-2.5-2.5zM17 14.5l-2.5 2.5 3 3 2.5-2.5z"/>'),
  eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>'),
  shield: svg('<path d="M12 2.8l7.5 3v5.6c0 4.6-3.2 8.3-7.5 9.8-4.3-1.5-7.5-5.2-7.5-9.8V5.8z"/><path d="M8.6 12.2l2.4 2.4 4.6-4.8"/>'),
  // eşli takım mesajları: iki kişi omuz omuza · özür (kalp üstünde el)
  team: svg('<circle cx="8.3" cy="7.6" r="3"/><circle cx="15.9" cy="7.6" r="3"/><path d="M2.8 19.5c.4-3.6 2.6-5.6 5.5-5.6 1.6 0 3 .6 3.9 1.8.9-1.2 2.3-1.8 3.9-1.8 2.9 0 5.1 2 5.5 5.6"/>'),
  sorry: svg('<path d="M12 20.5s-7.8-4.6-7.8-10.1A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.8 2.4c0 5.5-7.8 10.1-7.8 10.1z"/><path d="M9.3 13.2h5.4"/>'),
};
const MUTE_ICON = svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>');
const MAX_ITEMS = 16;

export class QuickChatSheet implements QuickChatSheetPort {
  private el: HTMLElement | null = null;
  private panel!: HTMLElement;
  private scrim!: HTMLElement;
  private items: HTMLButtonElement[] = [];
  private mute!: HTMLElement;
  private barFill!: HTMLElement;
  private sig = '';
  private open_ = false;
  private onPick: (id: string) => void = () => {};
  private onMute: (on: boolean) => void = () => {};
  private coolT = 0;
  private coolA: Animation | null = null;
  private outA: Animation | null = null;

  constructor(private ctx: Ctx) {}

  get isOpen(): boolean {
    return this.open_;
  }

  /** İlk açılışta kurulur (oyun başında hiç iş yok). */
  private build(): HTMLElement {
    const el = h('div', 'kh-qc');
    el.hidden = true;
    el.innerHTML = `<div class="kh-qc__scrim" data-act="x"></div>
      <div class="kh-qc__panel" role="dialog" aria-modal="true" aria-label="Hızlı sohbet">
        <header class="kh-qc__head"><span class="kh-qc__t">Hızlı Sohbet</span>
          <button class="kh-qc__mute" data-act="mute" aria-pressed="false"><span class="kh-qc__mico">${MUTE_ICON}</span><span class="kh-qc__ml">Rakipleri sustur</span><span class="kh-toggle"></span></button>
          <button class="kh-iconbtn kh-qc__x" data-act="x" aria-label="Kapat">${I.close}</button></header>
        <div class="kh-qc__bar"><i></i></div>
        <div class="kh-qc__grid"></div>
      </div>`;
    this.panel = q(el, '.kh-qc__panel');
    this.scrim = q(el, '.kh-qc__scrim');
    this.mute = q(el, '.kh-qc__mute');
    this.barFill = q(el, '.kh-qc__bar i');
    const grid = q(el, '.kh-qc__grid');
    for (let i = 0; i < MAX_ITEMS; i++) {
      const b = h('button', 'kh-qc__it');
      b.dataset.act = 'pick';
      b.innerHTML = '<i class="kh-qc__ico"></i><span class="kh-qc__l"></span>';
      b.hidden = true;
      grid.append(b);
      this.items.push(b);
    }
    el.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLElement>('[data-act]');
      if (!b || !this.open_) return;
      const a = b.dataset.act;
      if (a === 'x') {
        this.ctx.sounds.tap();
        this.close();
      } else if (a === 'mute') {
        const on = this.mute.getAttribute('aria-pressed') !== 'true';
        this.mute.setAttribute('aria-pressed', String(on));
        this.ctx.sounds.tap();
        this.onMute(on);
      } else if (a === 'pick') {
        if (el.classList.contains('is-cool')) {
          play(b, [{transform: 'translateX(0)'}, {transform: 'translateX(-4px)'}, {transform: 'translateX(4px)'}, {transform: 'translateX(0)'}], {duration: 220, easing: 'ease-out'});
          return;
        }
        const id = b.dataset.id;
        if (!id) return;
        this.ctx.sounds.tap();
        this.close();
        this.onPick(id);
      }
    });
    this.ctx.layer.append(el);
    return el;
  }

  open(o: {items: readonly QuickChatItem[]; muted: boolean; coolMs: number; onPick(id: string): void; onMute(on: boolean): void}): void {
    const el = (this.el ??= this.build());
    this.onPick = o.onPick;
    this.onMute = o.onMute;
    // yazılar yalnız menü değişince (karakter / oyun / öneri sırası) güncellenir; pencere kapalıyken (hidden) yazılır →
    // öğe sayısı aynı kaldıkça yerleşim kaymaz; simge yalnız değişince yeniden çizilir
    const sig = o.items.map(i => i.id + ':' + i.label + (i.hot ? '*' : '')).join('|');
    if (sig !== this.sig) {
      this.sig = sig;
      this.items.forEach((b, i) => {
        const it = o.items[i];
        b.hidden = !it;
        if (!it) return;
        b.dataset.id = it.id;
        b.classList.toggle('is-hot', !!it.hot);
        q(b, '.kh-qc__l').textContent = it.label;
        if (b.dataset.icon !== it.icon) {
          b.dataset.icon = it.icon;
          q(b, '.kh-qc__ico').innerHTML = ICONS[it.icon] ?? ICONS.star;
        }
      });
    }
    this.mute.setAttribute('aria-pressed', String(o.muted));
    this.outA?.cancel();
    this.outA = null;
    el.hidden = false;
    this.open_ = true;
    this.cool(o.coolMs);
    play(this.scrim, [{opacity: 0}, {opacity: 1}], {duration: 180, easing: 'ease-out'});
    play(this.panel, [{transform: 'translateY(100%)'}, {transform: 'translateY(-2%)', offset: 0.75}, {transform: 'none'}], {duration: 300, easing: EASE.out});
  }

  close(): void {
    const el = this.el;
    if (!el || !this.open_) return;
    this.open_ = false;
    if (!ANIM) {
      el.hidden = true;
      return;
    }
    play(this.scrim, [{opacity: 1}, {opacity: 0}], {duration: 160, easing: 'ease-in', fill: 'forwards'});
    const a = play(this.panel, [{transform: 'none'}, {transform: 'translateY(100%)'}], {duration: 180, easing: EASE.in, fill: 'forwards'});
    this.outA = a;
    a.onfinish = () => {
      if (this.outA !== a) return;
      this.outA = null;
      el.hidden = true;
      el.getAnimations({subtree: true}).forEach(x => x.cancel());
    };
  }

  cool(ms: number): void {
    const el = this.el;
    if (!el) return;
    clearTimeout(this.coolT);
    this.coolA?.cancel();
    this.coolA = null;
    el.classList.toggle('is-cool', ms > 0);
    if (ms <= 0) return;
    this.coolA = play(this.barFill, [{transform: 'scaleX(1)'}, {transform: 'scaleX(0)'}], {duration: ms, easing: 'linear', fill: 'forwards'}, 0.5);
    this.coolT = window.setTimeout(() => {
      el.classList.remove('is-cool');
      this.coolA?.cancel();
      this.coolA = null;
    }, ms);
  }
}
