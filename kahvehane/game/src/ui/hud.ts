// Ekran üstü arayüz (HTML): oyuncu panelleri, jeton, tepki kartları, PİŞTİ afişi, başlangıç/bitiş/ayarlar.
import './hud.css';
import type {Character, Mood} from '../ai/characters';
import type {GameResult} from '../core/types';

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const ICON_CARDS = `<svg class="ico" viewBox="0 0 24 24"><rect x="4" y="3" width="12" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="5" width="12" height="17" rx="2" fill="currentColor" opacity=".55"/></svg>`;
const ICON_STAR = `<svg class="ico" viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z" fill="#ffcf6b"/></svg>`;
const ICON_COIN = `<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e6b347" stroke="#8a5a14" stroke-width="1.5"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff0b8" stroke-width="1.4" opacity=".8"/><text x="12" y="16" text-anchor="middle" font-size="9" font-weight="900" fill="#6b420c">K</text></svg>`;

export interface SeatStat {
  cards: number;
  pisti: number;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  quality: 'auto' | 'low' | 'mid' | 'high';
}

export class Hud {
  readonly root = h('div', 'hud');
  private opp = h('div', 'panel opp');
  private me = h('div', 'panel me');
  private oppStats = h('div', 'pstats');
  private meStats = h('div', 'pstats');
  private coinsEl = h('span', 'coins');
  private react = h('div', 'react');
  private reactPic = h('div', 'pic');
  private bubble = h('div', 'bubble');
  private banner = h('div', 'banner');
  private hint = h('div', 'hint');
  private deck = h('div', 'deck-badge');
  private rotate = h('div', 'rotate', `<div><div class="phone"></div><div style="font-weight:800;font-size:20px">Telefonu yan çevir</div><div class="muted" style="margin-top:6px">Kahvehane yatay oynanır</div><button class="btn ghost" style="margin-top:18px">Yine de devam et</button></div>`);
  private reactTimer = 0;
  private coins = 0;
  onMenu: () => void = () => {};

  constructor(private char: Character) {
    this.root.append(h('div', 'vignette'));
    const av = h('div', 'avatar');
    av.style.backgroundImage = `url(${char.avatar})`;
    const oi = h('div');
    oi.append(h('div', 'pname', char.name), this.oppStats, h('div', 'think', 'düşünüyor…'));
    this.opp.append(av, oi);
    const mi = h('div');
    const top = h('div', 'pname', 'Sen ');
    top.append(this.coinsEl);
    mi.append(top, this.meStats);
    this.me.append(mi);
    this.react.append(this.reactPic, this.bubble);
    const menu = h('button', 'menu-btn', '☰');
    menu.addEventListener('click', () => this.onMenu());
    this.deck.style.display = 'none';
    this.root.append(this.opp, this.me, this.react, this.banner, this.hint, this.deck, menu);
    document.body.append(this.root, this.rotate);
    this.rotate.querySelector('button')!.addEventListener('click', () => this.rotate.classList.remove('show'));
    this.rotate.classList.add('show');
    this.setStats([{cards: 0, pisti: 0}, {cards: 0, pisti: 0}]);
  }

  setStats(st: SeatStat[]): void {
    const f = (s: SeatStat) => `<span>${ICON_CARDS} ${s.cards}</span><span>${ICON_STAR} ${s.pisti}</span>`;
    this.meStats.innerHTML = f(st[0]);
    this.oppStats.innerHTML = f(st[1]);
  }

  setCoins(n: number, animate = false): void {
    const from = this.coins;
    this.coins = n;
    if (!animate) {
      this.coinsEl.innerHTML = `${ICON_COIN} ${n.toLocaleString('tr-TR')}`;
      return;
    }
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 900);
      const v = Math.round(from + (n - from) * (1 - (1 - k) ** 3));
      this.coinsEl.innerHTML = `${ICON_COIN} ${v.toLocaleString('tr-TR')}`;
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  setTurn(seat: number | -1): void {
    this.opp.classList.toggle('turn', seat === 1);
    this.me.classList.toggle('turn', seat === 0);
  }

  setDeck(count: number, x: number, y: number): void {
    if (count <= 0) {
      this.deck.style.display = 'none';
      return;
    }
    this.deck.style.display = '';
    this.deck.textContent = String(count);
    this.deck.style.left = x + 'px';
    this.deck.style.top = y + 'px';
  }

  showHint(text: string | null): void {
    if (text) this.hint.textContent = text;
    this.hint.classList.toggle('on', !!text);
  }

  /** Rakip tepkisi: duygu kartı (varsa) + konuşma balonu. */
  say(text: string, mood?: Mood, ms = 2200): void {
    clearTimeout(this.reactTimer);
    if (mood) {
      this.reactPic.classList.remove('none');
      this.reactPic.style.backgroundImage = `url(${this.char.moods[mood]})`;
    } else this.reactPic.classList.add('none');
    this.bubble.textContent = text;
    this.react.classList.remove('on');
    void this.react.offsetWidth;
    this.react.classList.add('on');
    this.reactTimer = window.setTimeout(() => this.react.classList.remove('on'), ms);
  }

  showBanner(big: string, sub = '', small = false): void {
    this.banner.className = 'banner' + (small ? ' small' : '');
    this.banner.innerHTML = `<div class="big">${big}</div>${sub ? `<div class="sub">${sub}</div>` : ''}`;
    void this.banner.offsetWidth;
    this.banner.classList.add('on');
  }

  private overlay(inner: HTMLElement): HTMLElement {
    const o = h('div', 'overlay');
    o.append(inner);
    document.body.append(o);
    requestAnimationFrame(() => o.classList.add('on'));
    return o;
  }
  private close(o: HTMLElement): void {
    o.classList.remove('on');
    setTimeout(() => o.remove(), 360);
  }

  showStart(coins: number, bet: number): Promise<void> {
    const c = h('div', 'card-ui');
    c.innerHTML = `
      <div class="kicker">KAHVEHANE</div>
      <div class="title">Pişti</div>
      <div class="vs"><div class="avatar" style="background-image:url(${this.char.avatar})"></div>
        <div><div class="pname">${this.char.name}</div><div class="muted">${this.char.title} · seni bekliyor</div></div></div>
      <div class="muted">Masa: <b style="color:#ffd98a">${bet} jeton</b> · Kasan: <b style="color:#ffd98a">${coins.toLocaleString('tr-TR')}</b></div>
      <div class="row"><button class="btn" data-a="go">Masaya Otur</button><button class="btn ghost" data-a="rules">Nasıl oynanır?</button></div>
      <div class="rules" style="display:none">
        Ortadaki kartla <b>aynı değerde</b> kart atarsan ya da <b>Vale</b> atarsan ortadakilerin hepsini alırsın.<br>
        Ortada <b>tek kart</b> varken aynısını atarsan <b>PİŞTİ</b> olur: <b>10 puan</b>. Vale ile vale pişti: <b>20 puan</b>.<br>
        Her <b>As</b> ve <b>Vale</b> 1, <b>Sinek 2</b> 2, <b>Karo 10</b> 3 puan. En çok kartı alan <b>+3</b>.<br>
        Kartı <b>parmağınla masaya fırlat</b> ya da <b>iki kez dokun</b>.
      </div>`;
    const o = this.overlay(c);
    c.querySelector('[data-a=rules]')!.addEventListener('click', () => {
      const r = c.querySelector('.rules') as HTMLElement;
      r.style.display = r.style.display === 'none' ? '' : 'none';
    });
    return new Promise(res => c.querySelector('[data-a=go]')!.addEventListener('click', () => {
      this.close(o);
      res();
    }));
  }

  showEnd(res: GameResult, names: string[], delta: number, coins: number): Promise<'again'> {
    const [a, b] = res.sides;
    const win = res.winners.length === 1 ? res.winners[0] : -1;
    const title = win === 0 ? 'Kazandın!' : win === -1 ? 'Berabere' : `${names[1]} kazandı`;
    const rows: [string, (s: typeof a) => number | string][] = [
      ['Kart sayısı', s => s.cards], ['En çok kart', s => s.majority], ['As', s => s.aces], ['Vale', s => s.jacks],
      ['Sinek 2', s => s.club2], ['Karo 10', s => s.diamond10], ['Pişti', s => s.pisti],
    ];
    const c = h('div', 'card-ui');
    c.innerHTML = `
      <div class="kicker">EL BİTTİ</div>
      <div class="title" style="font-size:calc(var(--u)*2.4)">${title}</div>
      <table class="score"><tr><th></th><th>Sen</th><th>${names[1]}</th></tr>
        ${rows.map(([n, f]) => `<tr><td>${n}</td><td>${f(a)}</td><td>${f(b)}</td></tr>`).join('')}
        <tr class="total"><td>Toplam</td><td>${a.total}</td><td>${b.total}</td></tr></table>
      <div class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta} jeton</div>
      <div class="muted">Kasan: ${coins.toLocaleString('tr-TR')} jeton</div>
      <div class="row"><button class="btn" data-a="again">Bir El Daha</button></div>`;
    const o = this.overlay(c);
    return new Promise(r => c.querySelector('[data-a=again]')!.addEventListener('click', () => {
      this.close(o);
      r('again');
    }));
  }

  showSettings(s: Settings, apply: (s: Settings) => void, onNewGame: () => void): void {
    const c = h('div', 'card-ui');
    const seg = (key: 'sound' | 'haptics') => `<div class="seg" data-k="${key}"><button data-v="1" class="${s[key] ? 'on' : ''}">Açık</button><button data-v="0" class="${!s[key] ? 'on' : ''}">Kapalı</button></div>`;
    const qs: [Settings['quality'], string][] = [['auto', 'Oto'], ['low', 'Düşük'], ['mid', 'Orta'], ['high', 'Yüksek']];
    c.innerHTML = `<div class="kicker">AYARLAR</div>
      <div class="set-row"><span>Ses</span>${seg('sound')}</div>
      <div class="set-row"><span>Titreşim</span>${seg('haptics')}</div>
      <div class="set-row"><span>Grafik</span><div class="seg" data-k="quality">${qs.map(([v, n]) => `<button data-v="${v}" class="${s.quality === v ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="row"><button class="btn ghost" data-a="new">Yeni El</button><button class="btn" data-a="close">Devam</button></div>`;
    const o = this.overlay(c);
    c.querySelectorAll('.seg').forEach(g => g.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      const k = (g as HTMLElement).dataset.k as keyof Settings, v = b.dataset.v!;
      if (k === 'quality') s.quality = v as Settings['quality'];
      else s[k] = v === '1';
      apply(s);
    }));
    c.querySelector('[data-a=close]')!.addEventListener('click', () => this.close(o));
    c.querySelector('[data-a=new]')!.addEventListener('click', () => {
      this.close(o);
      onNewGame();
    });
  }
}
