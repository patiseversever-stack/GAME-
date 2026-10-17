// Pişti vitrini: koltuğun yığınına / pişti kartlarına / ×N rozetine dokununca o koltuğun AÇIK pişti kartları sahne ortasında
// yelpaze olup yüzleri görünür (hangi kartlarla pişti yapıldığı yığında seçilemez). Yalnız yerel arayüz: oyun akışı sürer;
// yalnız herkese açık (yüzü açık) pişti kartları gösterilir, kapalı yakalanan kartlara dokunulmaz → çevrimiçinde de güvenli.
//
// Tam ekran karartma: vitrin katmanı HUD katmanında (.kh-ui) HUD'un üstünde durur; açılışta pişti kartları (aynı düğümler) bu katmana
// taşınır, kapanınca masaya geri döner → karartma masayı, elleri, rozetleri ve HUD düğmelerini kaplar, kartlar / başlık / etiketler üstünde parlak kalır.
//
// Performans (docs/PHASES.md "GPU karo belleği"): kart düğümleri YENİDEN kullanılır (masadaki pişti kartları uçar, geri döner);
// başlık / etiket / ipucu / karartma boşta kurulan sabit havuz (≤ 8 etiket); açılışta yeni düğüm doğmaz. Yalnız transform/opacity
// canlanır; karartma 128² doku tuvali (radyal gradyan pişirilmiş, bileşimci tam ekrana büyütür; blur / backdrop-filter / büyük gradyan öğesi yok),
// altın çerçeve kartın pişirilmiş gölge görselinin yerini alır (table.ts bakeRim). Açılış başına okuma yok, yazma toplu; kartlar eldeki boyda.
import type {Card, Pose, Table2D} from '../table2d/table';
import type {SeatPlayer} from '../game/types';
import {ctx2d, radial, texCanvas} from '../platform/tex';
import {whenIdle} from '../platform/sched';
import {closeRule, pistiTag, shouldHint, showCards, tapAction, vitrinFan, vitrinTags, VIT_MAX, type FanLayout, type VitClose, type VitEvent} from './pistiVitrinLogic';
import './pistiVitrin.css';

export interface VitrinDeps {
  table: Table2D;
  /** Hafif kart kayması sesi (mevcut ses; düşük seviyede çalınır) */
  slide: (intensity: number) => void;
  /** Koltuğun HUD rozet portresi (başlık için küçültülüp kopyalanır) */
  portrait?: (seat: number) => HTMLCanvasElement | null;
  /** Tek seferlik ipucu: profil ayarında görüldü mü / işaretle */
  hint?: {seen: () => boolean; mark: () => void};
  /** ?auto: ipucu gösterilmez */
  auto?: boolean;
  /** Sıra sende sayaç var mı (çevrimiçi): varsa sıra gelince vitrin hızla kapanır */
  timedTurn?: () => boolean;
}

interface Open {
  seat: number;
  cards: Card[];
  first: number;
  /** satırdaki toplam pişti (başlık) */
  total: number;
  t0: number;
  timer: number;
  fan: FanLayout;
}

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const STAGGER = 50;
const OPEN_MS = 460;
const HOLD_MS = 3300;
/** Karartma: kart kalkışıyla ~180 ms belirir; geri uçuşla ~150 ms (hızlı) / 200 ms (zarif) söner */
const DIM_IN = 180;
const DIM_OUT_FAST = 150;
const DIM_OUT = 200;

export class PistiVitrin {
  private players: readonly SeatPlayer[] = [];
  private cur: Open | null = null;
  private lastClose = {seat: -1, at: 0};
  private hintShown = false;
  private hintTimer = 0;
  private built = false;
  /** HUD'un üstündeki vitrin katmanı (yoksa masa kart katmanı): karartma + başlık + etiketler + açıkken kartlar */
  private layer!: HTMLElement;
  private dim!: HTMLCanvasElement;
  private dimAnim: Animation | null = null;
  private head!: HTMLElement;
  private pt!: HTMLCanvasElement;
  private ptg: CanvasRenderingContext2D | null = null;
  private nm!: HTMLElement;
  private cntN!: HTMLElement;
  private cntP!: HTMLElement;
  private tags: HTMLElement[] = [];
  private hintEl!: HTMLElement;
  private fade: Animation[] = [];

  constructor(private d: VitrinDeps) {
    const t = d.table;
    t.onStackTap = seat => this.tap(seat);
    t.onBusy = kind => this.event(kind);
    t.onPistiRow = (seat, n) => this.pistiRow(seat, n);
    t.onIdle = () => this.idle();
    void whenIdle(900).then(() => this.build());
  }

  /** Maç başı: başlıktaki isimler için oyuncular */
  begin(players: readonly SeatPlayer[]): void {
    this.players = players;
    // masa görünür olunca bir kez, görünmez ısınma: ilk açılışta katman / doku / gölgelendirici ilk kullanımı takılma yapmasın
    if (!this.warmed) window.setTimeout(() => void whenIdle(1500).then(() => this.warm()), 2600);
  }

  private warmed = false;
  private warmTries = 0;
  private warm(): void {
    if (this.warmed) return;
    if (this.cur || this.d.table.busy > 0) {
      // masa sahne oynatıyor (dağıtım): sakinleşince dene (en çok ~20 sn)
      if (++this.warmTries < 28) window.setTimeout(() => void whenIdle(800).then(() => this.warm()), 700);
      return;
    }
    this.build();
    this.warmed = true;
    const els: HTMLElement[] = [this.dim, this.head, this.tags[0], this.hintEl];
    this.layer.style.display = 'block';
    this.paintPortrait(0);
    // ısınma metni: "ş" / "★" gibi yazı tipinde olmayan harflerin yedek yazı tipi İLK vitrinde değil burada yüklensin
    this.nm.textContent = 'Pişti';
    this.cntN.textContent = '0';
    this.tags[0].textContent = 'VALE +20';
    for (const el of els) {
      el.style.display = el === this.head ? 'flex' : 'block';
      el.style.opacity = '0.01';
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        for (const el of els) {
          el.style.opacity = '';
          el.style.display = 'none';
        }
        this.layer.style.display = 'none';
      }),
    );
  }

  /** Maç sonu / masadan kalkış: açık vitrin anında kapanır, ipucu kalkar */
  end(): void {
    this.close('end');
    this.hideHint();
    this.players = [];
  }

  /** Dışarıdan bir olay: kural tablosuna göre kapanır (ya da açık kalır). */
  event(ev: VitEvent): void {
    if (!this.cur) return;
    this.closeCur(closeRule(ev, {timedTurn: this.d.timedTurn?.() ?? false}));
  }

  get isOpen(): boolean {
    return !!this.cur;
  }
  get openSeat(): number {
    return this.cur?.seat ?? -1;
  }

  /** Test / dış çağrı: koltuğun vitrinini aç (yalnız pişti kartı varsa). */
  show(seat: number): boolean {
    const t = this.d.table;
    if (!t.pistis[seat]?.length) return false;
    if (this.cur) this.closeCur('fast');
    this.open(seat);
    return true;
  }
  close(ev: VitEvent = 'tap'): void {
    this.event(ev);
  }

  // ───────── dokunma ─────────
  private tap(seat: number): void {
    const t = this.d.table;
    // aynı dokunuşun "kapat" ardından yeniden açmaması: pointerdown zaten kapattıysa yok say
    if (seat === this.lastClose.seat && performance.now() - this.lastClose.at < 450) return;
    const a = tapAction({pistis: t.pistis[seat]?.length ?? 0, busy: t.busy, stack: t.stacks[seat]?.length ?? 0, openSeat: this.openSeat, seat});
    if (a === 'open') this.open(seat);
    else if (a === 'swap') {
      this.closeCur('fast');
      this.open(seat);
    } else if (a === 'close') this.closeCur('fast');
    else if (a === 'bounce') t.nudge(seat);
    else if (t.busy > 0 && (t.pistis[seat]?.length ?? 0) > 0) {
      // masa bir sahne animasyonu oynatıyor (rakip attı / topladı): dokunuş unutulmaz, animasyon biter bitmez (en çok 1,6 sn) açılır
      this.pending = {seat, at: performance.now()};
    }
  }

  private pending: {seat: number; at: number} | null = null;
  private idle(): void {
    const p = this.pending;
    if (!p) return;
    // sahneler arası kısa boşluklarda (atış → toplama) açılmaz: masa 280 ms sakin kalırsa açılır
    window.setTimeout(() => {
      if (this.pending !== p) return;
      if (this.d.table.busy > 0) return; // yeni sahne başladı: sıradaki boşlukta tekrar denenir
      this.pending = null;
      if (this.cur || performance.now() - p.at > 2400 || !this.d.table.pistis[p.seat]?.length) return;
      this.open(p.seat);
    }, 280);
  }

  // ───────── kurulum (boşta, bir kez) ─────────
  private build(): void {
    if (this.built) return;
    this.built = true;
    const t = this.d.table;
    // vitrin katmanı: HUD katmanında (HUD'un üstü, bildirim katmanının altı); yoksa masa kart katmanında (yalnız masayı karartır)
    this.layer = document.createElement('div');
    this.layer.className = 'kh-vit__layer';
    this.layer.style.display = 'none';
    const host = document.querySelector<HTMLElement>('.kh-ui');
    if (host) host.append(this.layer);
    else {
      this.layer.style.zIndex = '790';
      t.mount(this.layer);
    }
    this.dim = texCanvas('kh-vit__dim', 128, 128);
    // yumuşak radyal koyu lacivert: yelpazenin arkası biraz açık (ışık hüzmesi), kenarlara doğru koyulaşır (%56 → %70); tuval tam ekrana büyür
    radial(this.dim, [[0, 'rgba(3, 6, 30, .56)'], [0.3, 'rgba(3, 6, 30, .59)'], [0.62, 'rgba(3, 6, 30, .64)'], [1, 'rgba(3, 6, 30, .7)']], false, true);
    this.dim.style.display = 'none';
    this.layer.append(this.dim);
    this.head = document.createElement('div');
    this.head.className = 'kh-vit__head';
    this.pt = texCanvas('kh-vit__pt', 88, 88);
    this.ptg = ctx2d(this.pt);
    this.nm = document.createElement('b');
    this.nm.className = 'kh-vit__nm';
    const cnt = document.createElement('span');
    cnt.className = 'kh-vit__cnt';
    this.cntN = document.createElement('b');
    this.cntP = document.createElement('b');
    cnt.append('★ ', this.cntN, ' Pişti · ', this.cntP);
    this.head.append(this.pt, this.nm, cnt);
    this.head.style.display = 'none';
    this.layer.append(this.head);
    for (let i = 0; i < VIT_MAX; i++) {
      const el = document.createElement('i');
      el.className = 'kh-vit__tag';
      el.style.display = 'none';
      this.layer.append(el);
      this.tags.push(el);
    }
    this.hintEl = document.createElement('div');
    this.hintEl.className = 'kh-vit__hint';
    this.hintEl.append('Dokun, ', Object.assign(document.createElement('b'), {textContent: 'piştileri'}), ' gör');
    this.hintEl.style.display = 'none';
    t.mount(this.hintEl);
  }

  /** Başlık portresi: HUD rozet tuvali yuvarlak kesilip küçültülerek tek tuvale çizilir (altın halka dahil); bir drawImage. */
  private paintPortrait(seat: number): void {
    const g = this.ptg;
    if (!g) return;
    const S = 88, c = S / 2, R = 40;
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#0f1755';
    g.beginPath();
    g.arc(c, c, R, 0, Math.PI * 2);
    g.fill();
    const src = this.d.portrait?.(seat) ?? null;
    if (src && src.width > 0) {
      g.save();
      g.beginPath();
      g.arc(c, c, R, 0, Math.PI * 2);
      g.clip();
      // rozetteki yerleşim: halka, 1,6 kat kutunun (0,5 ; 0,41) merkezli %62,5 genişliğinde dairesi
      const box = (R * 2) / 0.625;
      g.drawImage(src, c - box * 0.5, c - box * 0.411, box, box);
      g.restore();
    }
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, '#fff0a0');
    gr.addColorStop(0.5, '#ffc83a');
    gr.addColorStop(1, '#ff9f1a');
    g.lineWidth = 5;
    g.strokeStyle = gr;
    g.beginPath();
    g.arc(c, c, R + 1, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2.4;
    g.strokeStyle = '#0a1033';
    g.beginPath();
    g.arc(c, c, R + 4.3, 0, Math.PI * 2);
    g.stroke();
  }

  // ───────── açılış ─────────
  private open(seat: number): void {
    const t = this.d.table;
    this.build();
    this.hideHint();
    const row = t.pistis[seat];
    const {items, first} = showCards(row);
    const n = items.length;
    const L = t.L;
    const u = Math.min(22, Math.max(12, Math.min(L.W * 0.04, L.H * 0.02)));
    // deste hâlâ masadaysa ve yelpaze onunla aynı yükseklikteyse yelpaze desteye (ve sayı hapına) binmez: sağa kayar, gerekirse kartlar küçülür;
    // yelpazenin altı ipucu hapının üstünde kalır
    const box = {W: L.W, H: L.H, cw: L.cw, handS: L.hand.s, bottomMax: L.clear - 6};
    let fan = vitrinFan(n, box);
    const dk = L.deck;
    if (t.deck.length > 0 && fan.top - 8 < dk.y + (L.ch * dk.s) / 2 + u * 2.2 && fan.bottom + 6 > dk.y - (L.ch * dk.s) / 2 - 6) {
      fan = vitrinFan(n, {...box, left: dk.x + (L.cw * dk.s) / 2 + 12});
    }
    const o: Open = {seat, cards: items, first, total: row.length, t0: performance.now(), timer: 0, fan};
    this.cur = o;
    for (const a of this.fade) a.cancel();
    this.fade = [];
    t.vitMode(seat);
    this.d.slide(0.3);

    // tam ekran karartma (yalnız opaklık) + kartlar (aynı düğümler HUD üstü katmana taşınır; yalnız transform)
    this.layer.style.display = 'block';
    this.dim.style.display = 'block';
    this.dimIn();
    t.mirrorVars(this.layer);
    items.forEach((c, k) => {
      if (c.el.parentNode !== this.layer) this.layer.append(c.el);
      t.vitRim(c, true);
      void t.vitFly(c, fan.poses[k], {ms: OPEN_MS, delay: k * STAGGER, z: 800 + k, zEnd: 800 + k, lift: 0.16, ease: EASE});
    });

    // başlık: portre + isim + "N Pişti"
    const p = this.players[seat];
    this.nm.textContent = p ? p.name : `Koltuk ${seat + 1}`;
    this.cntN.textContent = String(o.total);
    this.cntP.textContent = String(row.reduce((a, c) => a + pistiTag(c.id).points, 0));
    this.paintPortrait(seat);
    this.head.style.display = 'flex';
    const hb = `translate3d(${fan.cx.toFixed(1)}px,${(fan.top - u * 3.9).toFixed(1)}px,0) translate(-50%,0)`;
    this.head.style.transform = hb;
    this.fade.push(this.head.animate([{opacity: 0, transform: hb + ' translateY(12px) scale(.94)'}, {opacity: 1, transform: hb}], {duration: 300, delay: 70, easing: EASE, fill: 'both'}));

    // etiketler: kart başına TEK; kartın açıkta kalan şeridinin altında, kartla birlikte dönerek (tek taban çizgisi), şeride sığar
    const plan = vitrinTags(fan, items.map(c => pistiTag(c.id).vale), u);
    plan.forEach((tg, k) => {
      const el = this.tags[k];
      el.textContent = tg.label;
      el.classList.toggle('is-vale', tg.vale);
      el.style.display = 'block';
      el.style.fontSize = `${tg.fs.toFixed(1)}px`;
      const tb = `translate3d(${tg.x.toFixed(1)}px,${tg.y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${tg.rot.toFixed(1)}deg)`;
      el.style.transform = tb;
      this.fade.push(el.animate([{opacity: 0, transform: tb + ' scale(.8)'}, {opacity: 1, transform: tb}], {duration: 240, delay: 280 + k * STAGGER, easing: EASE, fill: 'both'}));
    });
    for (let k = n; k < this.tags.length; k++) this.tags[k].style.display = 'none';

    o.timer = window.setTimeout(() => this.event('timer'), HOLD_MS + n * STAGGER);
    // dokunma + el kartı: her yeni dokunuş vitrini kapatır (olay yutulmaz: el kartı normal oynanır, düğmeler çalışır)
    setTimeout(() => {
      if (this.cur === o) window.addEventListener('pointerdown', this.anyDown, true);
    }, 0);
  }

  private anyDown = (): void => {
    this.closeCur(closeRule('tap', {timedTurn: false}));
  };

  // ───────── kapanış ─────────
  private closeCur(mode: VitClose): void {
    const o = this.cur;
    if (!o || mode === 'keep') return;
    this.cur = null;
    clearTimeout(o.timer);
    window.removeEventListener('pointerdown', this.anyDown, true);
    this.lastClose = {seat: o.seat, at: performance.now()};
    const t = this.d.table;
    for (const a of this.fade) a.cancel();
    this.fade = [];
    if (mode === 'instant') {
      this.finish(o, true);
      return;
    }
    const fast = mode === 'fast', n = o.cards.length;
    // açılış uçuşu sürerken kapanırsa kartlar bulundukları yerden döner (hedef konuma sıçramaz): tek okuma, yalnız bu nadir durumda
    if (performance.now() - o.t0 < (n - 1) * STAGGER + OPEN_MS + 30) {
      for (const c of o.cards) {
        const m = new DOMMatrixReadOnly(getComputedStyle(c.el).transform);
        const cw = t.L.cw, ch = t.L.ch;
        c.pose = {x: m.e + cw / 2, y: m.f + ch / 2, r: (Math.atan2(m.b, m.a) * 180) / Math.PI, s: Math.hypot(m.a, m.b)};
      }
    }
    const ms = fast ? 170 : 340;
    this.fadeOut(fast ? 140 : 220, fast ? DIM_OUT_FAST : DIM_OUT);
    const done = o.cards.map((c, k) => {
      const h = t.pistiHome(o.seat, o.first + k);
      return t.vitFly(c, h.pose, {ms, delay: fast ? 0 : (n - 1 - k) * 35, z: 800 + k, zEnd: h.z, lift: 0.05, ease: fast ? 'cubic-bezier(.4,0,.2,1)' : EASE});
    });
    if (!fast) this.d.slide(0.22);
    void Promise.all(done).then(() => this.finish(o, false));
  }

  private fadeOut(ms: number, dimMs: number): void {
    for (const el of [this.head, ...this.tags.filter(e => e.style.display !== 'none')]) this.fade.push(el.animate([{opacity: 1}, {opacity: 0}], {duration: ms, easing: 'ease-in', fill: 'both'}));
    this.dimOut(dimMs);
  }

  /**
   * Karartma tek animasyon, yalnız opaklık: açılışta ileri, kapanışta aynı animasyon GERİ oynar (playbackRate < 0) → açılış
   * sürerken kapanırsa bulunduğu opaklıktan söner (sıçrama yok), takasta (kapat + hemen aç) yeniden belirmeden kesintisiz sürer.
   */
  private dimIn(): void {
    const a = this.dimAnim;
    if (!a) {
      this.dimAnim = this.dim.animate([{opacity: 0}, {opacity: 1}], {duration: DIM_IN, easing: 'ease-out', fill: 'both'});
      return;
    }
    a.updatePlaybackRate(1);
    // tam açıkken (takas: kapat + hemen aç) geri sarılmaz, olduğu gibi kalır; yarıdaysa ya da tam sönmüşse oradan ileri oynar
    if (Number(a.currentTime ?? 0) < DIM_IN - 0.5) a.play();
  }
  private dimOut(ms: number): void {
    const a = this.dimAnim;
    if (!a) return;
    a.updatePlaybackRate(-DIM_IN / ms);
    a.play();
  }
  private dimOff(): void {
    this.dimAnim?.cancel();
    this.dimAnim = null;
    this.dim.style.display = 'none';
  }

  /** Kartlar yerine döndü (anlık kapanışta şimdi yerleştirilir): çerçeve kalkar, rozet geri gelir, vitrin düğümleri gizlenir. */
  private finish(o: Open, instant: boolean): void {
    const t = this.d.table;
    const reopened = this.cur?.cards;
    o.cards.forEach((c, k) => {
      if (reopened?.includes(c)) return; // aynı kart yeniden açıldı (takas): vitrinde kalır
      t.vitRim(c, false);
      if (instant) {
        const h = t.pistiHome(o.seat, o.first + k);
        t.vitSet(c, h.pose, h.z);
      }
      t.mount(c.el); // kart masaya (kendi katmanına) döner
    });
    if (this.cur) {
      t.vitMode(this.cur.seat); // takas: yeni koltuğun vitrini açık
      return;
    }
    t.vitMode(-1);
    for (const a of this.fade) a.cancel();
    this.fade = [];
    this.dimOff();
    this.head.style.display = 'none';
    for (const el of this.tags) el.style.display = 'none';
    this.layer.style.display = 'none';
  }

  // ───────── tek seferlik ipucu ─────────
  private pistiRow(seat: number, n: number): void {
    if (!shouldHint({n, seen: this.d.hint?.seen() ?? true, auto: !!this.d.auto, shownThisSession: this.hintShown})) return;
    this.hintShown = true;
    this.d.hint?.mark();
    window.clearTimeout(this.hintTimer);
    // kutlama sahnesi (pişti kahramanı) bitsin: sonra, yığının yanında sessizce belirir
    this.hintTimer = window.setTimeout(() => this.showHint(seat), 2300);
  }

  private showHint(seat: number): void {
    const t = this.d.table;
    if (this.cur || !t.pistis[seat]?.length) return;
    this.build();
    const L = t.L, g = L.seats[seat], st = g.stack, el = this.hintEl;
    const u = Math.min(22, Math.max(12, Math.min(L.W * 0.04, L.H * 0.02)));
    const hw = u * 6.6;
    // yığın + pişti kartlarının kapladığı kutu (kartların evinden)
    let x0 = st.x - (L.cw * st.s) / 2, x1 = st.x + (L.cw * st.s) / 2, y0 = st.y - (L.ch * st.s) / 2, y1 = st.y + (L.ch * st.s) / 2;
    t.pistis[seat].forEach((_, i) => {
      const p = t.pistiHome(seat, i).pose;
      x0 = Math.min(x0, p.x - (L.cw * p.s) / 2);
      x1 = Math.max(x1, p.x + (L.cw * p.s) / 2);
      y0 = Math.min(y0, p.y - (L.ch * p.s) / 2);
      y1 = Math.max(y1, p.y + (L.ch * p.s) / 2);
    });
    // ipucu masanın ortasına doğru, el / rozet / yelpazeyle çakışmayan tarafa: dikey sütun ve sağ rakip → solunda; sol rakip → sağında;
    // üst koltuk (4 kişi) → altında; ben → üstünde
    let x = st.x, y = y0 - u * 1.5;
    if (g.pv || (L.seats.length === 4 && seat === 1)) {
      x = x0 - 8 - hw;
      y = (y0 + y1) / 2;
    } else if (L.seats.length === 4 && seat === 3) {
      x = x1 + 8 + hw;
      y = (y0 + y1) / 2;
    } else if (st.y < L.H * 0.4) y = y1 + u * 1.5;
    x = Math.max(hw + 6, Math.min(L.W - hw - 6, x));
    const tb = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%)`;
    el.style.transform = tb;
    el.style.display = 'block';
    const a = el.animate([
      {opacity: 0, transform: tb + ' translateY(8px)'},
      {opacity: 1, transform: tb, offset: 0.12},
      {opacity: 1, transform: tb, offset: 0.85},
      {opacity: 0, transform: tb + ' translateY(-4px)'},
    ], {duration: 3400, easing: 'ease-out', fill: 'both'});
    a.finished.then(() => (el.style.display = 'none'), () => undefined);
  }

  private hideHint(): void {
    window.clearTimeout(this.hintTimer);
    if (!this.built) return;
    for (const a of this.hintEl.getAnimations()) a.cancel();
    this.hintEl.style.display = 'none';
  }
}

export type {Pose};
