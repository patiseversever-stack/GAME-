// Scene — masa sahnesinin çekirdeği.
//  • DOM iskeleti (yüzey, ıstaka, sprite katmanı, HUD, eylem çubuğu)
//  • yerleşimin uygulanması (layout.js çıktısı → mutlak konumlar)
//  • "görüntü modeli" (disp): motor durumundan bağımsız, olaylar oynandıkça ilerler → animasyon ile durum ayrışabilir
//  • sprite hedefleri: her taşın nerede olması gerektiği tek yerden hesaplanır
//  • hit-test: yalnızca geometri (DOM sorgusu yok → layout thrash yok)

import { computeLayout } from './layout.js';
import { SpriteSystem, SPRING } from './sprites.js';
import { RackModel, classifyGroup } from './rack.js';
import { createTileEl, setTileFace, setFlip } from './tile-dom.js';
import { SeatView } from './seats.js';
import { packMeldsZoned, hitMeld } from './meld-layout.js';
import { icon } from './icons.js';
import { avatarSVG } from './avatars.js';
import { surfaceHTML } from './surface.js';
import { woodTexture } from './wood.js';
import { paintTable } from './table-art.js';
import { Stage3D, webglAvailable } from '../render3d/stage.js';
import { COLORS, isOkey, isFake } from '../game/tiles.js';
import { meldPoints } from '../game/melds.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GHOST0 = 1000;

const OWNER_COLOR = ['#d8b878', '#6fa6d8', '#7cc9ae', '#d98aa6'];

export class Scene {
  constructor(host, deps) {
    this.host = host;
    this.deps = deps;
    this.game = null;
    this.cfg = null;
    this.L = null;
    this.sys = null;
    this.rack = new RackModel(2, 10);
    this.disp = null;
    this.seats = [];
    this.selected = null;
    this.excluded = new Set();
    this.packed = null;
    this.ghostN = 0;
    this.disposers = [];
    this.badgeRects = [];
    this.layoffChips = [];
    this.newTile = null;
    this.hintTiles = new Set();
    this.dropHot = null;
    this._resizeRaf = 0;
    this.interactive = false;
  }

  // ───────────────────────────── kurulum ─────────────────────────────
  build() {
    const el = document.createElement('div');
    el.className = 'scene';
    el.tabIndex = 0;
    el.setAttribute('role', 'application');
    el.setAttribute('aria-label', 'Okey masası');
    el.innerHTML = `
      <div class="surface"><div class="surface__cam" style="position:absolute;inset:0"><canvas class="table-art"></canvas></div><div class="surface__focus"></div><div class="surface__rim"></div></div>
      <div class="gl-vignette"></div>
      <canvas class="fx-ambient" style="inset:0;z-index:5;pointer-events:none;width:100%;height:100%"></canvas>
      <div class="layer layer--table"></div>
      <div class="rack"></div>
      <div class="layer layer--sprites"></div>
      <div class="rack-lips"></div>
      <div class="brackets"></div>
      <div class="layer layer--chips" style="z-index:45"></div>
      <div class="hud">
        <button class="icon-btn" data-act="menu" aria-label="Menü">${icon('menu')}</button>
        <div class="hud__title"><b></b><small></small></div>
        <button class="icon-btn" data-act="help" aria-label="Nasıl oynanır">${icon('help')}</button>
        <button class="icon-btn" data-act="sound" aria-label="Ses"></button>
      </div>
      <div class="scorebar"></div>
      <div class="actionbar">
        <div class="me-plate"><i class="me-plate__av"></i><span class="me-plate__name">Sen</span><b class="me-plate__score num">0</b></div>
        <div class="status"><div class="status__main"></div><div class="status__sub"></div></div>
        <div class="actions"></div>
      </div>
      <div class="toasts"></div>
      <div class="coach" style="z-index:70"></div>
      <div class="sr-only" aria-live="polite" data-live></div>`;
    this.host.appendChild(el);
    this.root = el;
    const q = (s) => el.querySelector(s);
    this.els = {
      surface: q('.surface'),
      cam: q('.surface__cam'),
      art: q('.table-art'),
      focus: q('.surface__focus'),
      table: q('.layer--table'),
      rack: q('.rack'),
      sprites: q('.layer--sprites'),
      lips: q('.rack-lips'),
      brackets: q('.brackets'),
      chips: q('.layer--chips'),
      hud: q('.hud'),
      title: q('.hud__title'),
      scorebar: q('.scorebar'),
      actionbar: q('.actionbar'),
      status: q('.status'),
      statusMain: q('.status__main'),
      statusSub: q('.status__sub'),
      actions: q('.actions'),
      toasts: q('.toasts'),
      coach: q('.coach'),
      live: q('[data-live]'),
      canvas: q('.fx-ambient'),
      soundBtn: q('[data-act="sound"]'),
    };
    this.sys = new SpriteSystem(this.els.sprites);
    // 3B çizim: WebGL varsa taşlar ve ıstaka Three.js ile (yoksa DOM taşları olduğu gibi çalışır)
    if (webglAvailable() && this.deps.settings.get('quality') !== 'dom') {
      try {
        this.stage = new Stage3D(el, { quality: this.deps.settings.get('quality') });
        this.sys.stage = this.stage;
        this.host.classList.add('gl-on');
        this.stage.observe(this.els.sprites, this.els.table);
        this.stage.onRackChanged = () => this.L && this.sys.setSize(this.L.rack.tw, this.L.rack.th);
      } catch (e) {
        console.warn('WebGL başlatılamadı, DOM çizimine dönülüyor', e);
        this.stage = null;
      }
    }
    this.sys.onSlow = (avg) => this.deps.onSlow?.(avg);
    // tabanlar (çöplük, deste, etiketler)
    const t = this.els.table;
    this.pileEls = [0, 1, 2, 3].map((s) => {
      const p = document.createElement('div');
      p.className = 'pile';
      p.dataset.seat = String(s);
      p.innerHTML = '<span class="pile__label"></span><span class="pile__count num">0</span>';
      t.appendChild(p);
      return p;
    });
    // sayaç rozetleri 3B taşların üstünde kalsın diye ayrı katmanda (çöplük/deste dikdörtgenleriyle eş konumlu)
    this.badgeLayer = document.createElement('div');
    this.badgeLayer.className = 'layer layer--badges';
    el.appendChild(this.badgeLayer);
    this.pileOv = this.pileEls.map((pe) => {
      const ov = document.createElement('div');
      ov.className = 'badge-ov';
      const c = pe.querySelector('.pile__count');
      ov.appendChild(c);
      pe._count = c;
      this.badgeLayer.appendChild(ov);
      return ov;
    });
    this.stockEl = document.createElement('div');
    this.stockEl.className = 'stock';
    this.stockEl.innerHTML = '<span class="stock__count num">0</span>';
    t.appendChild(this.stockEl);
    this.stockOv = document.createElement('div');
    this.stockOv.className = 'badge-ov';
    this.stockCount = this.stockEl.querySelector('.stock__count');
    this.stockOv.appendChild(this.stockCount);
    this.badgeLayer.appendChild(this.stockOv);
    this.stockDeco = [];
    this.indPlate = document.createElement('div');
    this.indPlate.className = 'plate';
    this.indPlate.innerHTML = '<span class="plate__cap plate__cap--ind">Gösterge</span><span class="plate__cap plate__cap--okey">Okey</span><span class="plate__arrow"></span>';
    t.appendChild(this.indPlate);
    this.meldTags = document.createElement('div');
    this.meldTags.className = 'layer';
    this.meldTags.style.cssText = 'inset:0;pointer-events:none;z-index:12';
    t.appendChild(this.meldTags);
    return this;
  }

  // ───────────────────────────── oyun bağlama ─────────────────────────────
  setGame(game, cfg) {
    this.game = game;
    this.cfg = cfg;
    const s = game.state;
    this.mode = s.rules.mode;
    this.ctx = s.ctx;
    // koltuklar
    this.seats.forEach((x) => x?.destroy());
    this.seats = [];
    for (const seat of [1, 2, 3]) {
      const ro = cfg.roster[seat];
      this.seats[seat] = new SeatView(this.els.table, { seat, name: ro.name, avatar: ro.avatar, difficulty: ro.difficulty, orient: seat === 2 ? 'h' : 'v' });
      this.seats[seat].stage = this.stage;
    }
    this._buildScorebar();
    this.sys.clear();
    this.ghostN = 0;
    this.decoClear();
    this.excluded.clear();
    this.selected = null;
    this.layout(true);
  }

  _buildScorebar() {
    const sb = this.els.scorebar;
    sb.innerHTML = '';
    this.scoreEls = [];
    for (let seat = 0; seat < 4; seat++) {
      const ro = this.cfg.roster[seat];
      const d = document.createElement('div');
      d.className = 'score';
      d.dataset.seat = String(seat);
      d.innerHTML = `<span class="score__av">${avatarSVG(ro.avatar)}</span><span class="score__name">${seat === 0 ? 'Sen' : ro.name}</span><span class="score__val num">0</span>`;
      sb.appendChild(d);
      this.scoreEls[seat] = d;
    }
  }

  // ───────────────────────────── yerleşim ─────────────────────────────
  readSafe() {
    if (!this._probe) {
      const p = document.createElement('div');
      // tokens.css'teki --safe-* değişkenleri env(safe-area-inset-*) değerlerini taşır (testte geçersiz kılınabilir)
      p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:var(--safe-t,0px) var(--safe-r,0px) var(--safe-b,0px) var(--safe-l,0px)';
      document.body.appendChild(p);
      this._probe = p;
    }
    const cs = getComputedStyle(this._probe);
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }

  viewport() {
    const vv = window.visualViewport;
    const w = Math.round(this.host.clientWidth || vv?.width || innerWidth);
    const h = Math.round(this.host.clientHeight || vv?.height || innerHeight);
    return { w, h };
  }

  // Dikeyde skor çubuğu ayrı satır; yatayda HUD içinde (flex) — çakışma olmaz, metin ölçeğiyle kayar.
  _mountScorebar(L) {
    const sb = this.els.scorebar;
    const hud = this.els.hud;
    if (L.scores) {
      if (sb.parentNode === hud) this.root.insertBefore(sb, this.els.actionbar);
      const r = L.scores;
      sb.style.left = r.x + 'px';
      sb.style.top = r.y + 'px';
      sb.style.width = r.w + 'px';
      sb.style.height = r.h + 'px';
    } else {
      if (sb.parentNode !== hud) hud.insertBefore(sb, hud.querySelector('[data-act="help"]'));
      sb.style.left = sb.style.top = sb.style.width = sb.style.height = '';
    }
  }

  layout(force = false) {
    if (!this.game) return;
    const { w, h } = this.viewport();
    const safe = this.readSafe();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const key = `${w}x${h}|${safe.t},${safe.r},${safe.b},${safe.l}|${rem}|${this.mode}`;
    if (!force && key === this._layoutKey) return;
    this._layoutKey = key;
    const L = computeLayout({ w, h, safe, rem, mode: this.mode });
    this.L = L;
    const root = this.host;
    root.dataset.profile = L.profile;
    root.dataset.size = L.sizeClass;
    root.style.setProperty('--tw', L.rack.tw + 'px');
    root.style.setProperty('--th', L.rack.th + 'px');
    this.stage?.resize(L, window.devicePixelRatio || 1);
    this.sys.setSize(L.rack.tw, L.rack.th);

    const place = (el, r) => {
      el.style.left = r.x + 'px';
      el.style.top = r.y + 'px';
      el.style.width = r.w + 'px';
      el.style.height = r.h + 'px';
    };
    place(this.els.hud, L.hud);
    this.els.hud.style.setProperty('--hudh', L.hud.h + 'px');
    this._mountScorebar(L);
    const cs = getComputedStyle(this.host);
    paintTable(this.els.art, L, { dpr: window.devicePixelRatio || 1, felt: [cs.getPropertyValue('--felt-hi').trim() || '#2c5e52', cs.getPropertyValue('--felt-mid').trim() || '#173c34', cs.getPropertyValue('--felt-lo').trim() || '#0a1e1a'] });
    place(this.els.actionbar, L.action);
    this.els.actionbar.style.setProperty('--strip-h', L.action.h + 'px');
    // toast konumu: HUD/skor altı
    const tTop = L.profile === 'landscape' ? L.seats[2].panel.y + L.seats[2].panel.h + 8 : L.table.y + (L.seats[2].panel ? L.seats[2].panel.h : 50) + 8;
    this.els.toasts.style.top = tTop + 'px';
    // ıstaka
    const rr = L.rack.rect;
    place(this.els.rack, rr);
    this._buildRackDecor();
    // ızgara değişti → modeli yeniden akıt
    if (this.rack.rows !== L.rack.rows || this.rack.cols !== L.rack.cols) this.rack.reflow(L.rack.rows, L.rack.cols);
    // koltuklar
    for (const seat of [1, 2, 3]) this.seats[seat].place(L.seats[seat].panel, L.sizeClass);
    // çöplükler
    for (let s = 0; s < 4; s++) {
      const p = L.piles[s];
      place(this.pileEls[s], { x: p.cx - p.w / 2, y: p.cy - p.h / 2, w: p.w, h: p.h });
      place(this.pileOv[s], { x: p.cx - p.w / 2, y: p.cy - p.h / 2, w: p.w, h: p.h });
    }
    this.stage?.syncSlotStates(this.pileEls);
    this._placeStock();
    this._placePlates();
    if (this.disp) this.retarget(false);
    this._renderBrackets();
    this.deps.onLayout?.(L);
  }

  _buildRackDecor() {
    const L = this.L;
    const rack = L.rack;
    const rackEl = this.els.rack;
    this.host.style.setProperty('--wood', woodTexture());
    rackEl.innerHTML = '';
    this.els.lips.innerHTML = '';
    const tw = rack.tw;
    for (let r = 0; r < rack.rows; r++) {
      const s = rack.slotRect(r * rack.cols);
      // oyuk: taşların yaslandığı eğimli arka yüz
      const groove = document.createElement('div');
      groove.className = 'rack__groove';
      groove.style.top = s.y - Math.round(tw * 0.1) - rack.rect.y + 'px';
      groove.style.height = rack.th + Math.round(tw * 0.1) + 'px';
      rackEl.appendChild(groove);
      // ön dudak: taşların alt kenarını örten kalın yuvarlak çıta (sprite katmanının ÜSTÜNDE)
      const lip = document.createElement('i');
      const lipTop = s.y + rack.th - Math.round(tw * 0.1);
      lip.style.left = rack.rect.x + 2 + 'px';
      lip.style.width = rack.rect.w - 4 + 'px';
      lip.style.top = lipTop + 'px';
      lip.style.height = Math.max(7, Math.round(tw * 0.3)) + 'px';
      this.els.lips.appendChild(lip);
    }
    for (const side of ['left', 'right']) {
      const cap = document.createElement('i');
      cap.className = 'rack__cap rack__cap--' + side;
      rackEl.appendChild(cap);
    }
  }

  _placeStock() {
    const L = this.L;
    const s = L.stock;
    const el = this.stockEl;
    el.style.left = s.cx - s.w / 2 + 'px';
    el.style.top = s.cy - s.h / 2 + 'px';
    el.style.width = s.w + 'px';
    el.style.height = s.h + 'px';
    Object.assign(this.stockOv.style, { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height });
    // dekoratif kapalı taş yığını (3 kat)
    this.decoClear('stock');
    const sc = L.scale.stock;
    for (let i = 2; i >= 0; i--) {
      const d = this.decoTile(0, { x: s.cx - i * 1.4, y: s.cy - i * 1.8, sc, flip: 180, z: 11 + (2 - i), tag: 'stock' });
      this.stockDeco.push(d);
    }
  }

  _placePlates() {
    const L = this.L;
    const pl = L.plate;
    const ind = L.indicator;
    const ok = L.okeyMini;
    const el = this.indPlate;
    el.style.left = pl.x + 'px';
    el.style.top = pl.y + 'px';
    el.style.width = pl.w + 'px';
    el.style.height = pl.h + 'px';
    el.style.setProperty('--cap', pl.capH + 'px');
    // başlıklar kendi taşlarının üstünde; ok iki taşın arasında
    const indLeft = ind.cx - pl.x;
    const okLeft = ok.cx - pl.x;
    const capI = el.querySelector('.plate__cap--ind');
    const capO = el.querySelector('.plate__cap--okey');
    capI.style.left = indLeft + 'px';
    capO.style.left = okLeft + 'px';
    const arrow = el.querySelector('.plate__arrow');
    arrow.style.left = (indLeft + ind.w / 2 + okLeft - ok.w / 2) / 2 - 4 + 'px';
    arrow.style.top = ind.cy - pl.y - 3 + 'px';
    this.decoClear('ind');
    if (this.game) {
      const okTile = this._okeyDecoId();
      const d = this.decoTile(okTile, { x: ok.cx, y: ok.cy, sc: L.scale.indicator, flip: 0, z: 12, tag: 'ind' });
      d.style.opacity = this.okeyShown ? '1' : '0';
      this.indDeco = d;
    }
  }

  _okeyDecoId() {
    const c = this.ctx;
    return c.oc * 26 + (c.ov - 1) * 2; // okey yüzünün doğal taşı (gerçek okey) — yalnızca süs
  }

  // ───────────────────────────── dekoratif taşlar ─────────────────────────────
  decoTile(t, { x, y, sc = 1, flip = 0, z = 11, tag = 'deco' }) {
    const el = createTileEl(t, this.ctx);
    el.dataset.deco = tag;
    el.style.zIndex = String(z);
    el.style.transform = `translate3d(${x - this.L.rack.tw / 2}px,${y - this.L.rack.th / 2}px,0) scale(${sc})`;
    setFlip(el, flip);
    this.els.table.appendChild(el);
    if (this.stage) {
      el.classList.add('gl-proxy');
      this.stage.deco(el, { x, y, sc, flip, z });
    }
    return el;
  }
  decoClear(tag) {
    const sel = tag ? `.tile[data-deco="${tag}"]` : '.tile[data-deco]';
    this.els.table.querySelectorAll(sel).forEach((n) => n.remove());
    if (!tag || tag === 'stock') this.stockDeco = [];
    this.stage?.syncDecos();
  }

  // ───────────────────────────── görüntü modeli ─────────────────────────────
  // Motor durumundan görüntü modelini tamamen kopyala (animasyonsuz)
  syncAll({ rackTiles = null } = {}) {
    const g = this.game.state;
    this.ctx = g.ctx;
    this.disp = {
      piles: g.discards.map((d) => d.slice()),
      counts: g.hands.map((h) => h.length),
      stock: g.stock.length,
      melds: structuredClone(g.melds),
      opened: g.opened.slice(),
      scores: g.scores.slice(),
      turn: g.turn.seat,
      indicatorTile: g.ctx.indicator,
    };
    // benim elim → ıstaka
    const mine = g.hands[0];
    const cur = this.rack.tiles();
    const keep = cur.filter((t) => mine.includes(t));
    const add = mine.filter((t) => !keep.includes(t));
    if (rackTiles) {
      this.rack.slots.fill(null);
      rackTiles.forEach((t, i) => {
        if (t !== null) this.rack.slots[i] = t;
      });
    } else {
      for (const t of cur) if (!mine.includes(t)) this.rack.remove(t);
      for (const t of add) this.rack.addAuto(t);
    }
    this.okeyShown = true;
    if (this.indDeco) this.indDeco.style.opacity = '1';
    this.refreshChrome();
    this.retarget(false);
    this.onRackChanged();
  }

  refreshChrome() {
    const d = this.disp;
    const g = this.game.state;
    // başlık
    const t = this.els.title;
    if (this.mode === 'okey101') {
      t.querySelector('b').innerHTML = 'OKEY <em>101</em>';
      t.querySelector('small').textContent = `El ${g.round}/${g.rules.rounds}`;
    } else {
      t.querySelector('b').textContent = 'OKEY';
      t.querySelector('small').textContent = g.rules.matchType === 'single' ? 'Tek el' : `El ${g.round}`;
    }
    // skorlar
    for (let s = 0; s < 4; s++) {
      const el = this.scoreEls[s];
      const v = el.querySelector('.score__val');
      if (v.textContent !== String(d.scores[s])) {
        v.textContent = String(d.scores[s]);
        el.classList.remove('is-bump');
        void el.offsetWidth;
        el.classList.add('is-bump');
      }
      el.classList.toggle('is-turn', d.turn === s && g.status === 'playing');
    }
    // koltuklar (skor koltukta: bilgi kişinin yanında)
    for (const s of [1, 2, 3]) {
      const sv = this.seats[s];
      sv.setCount(d.counts[s]);
      sv.setScore?.(d.scores[s]);
      sv.setActive(d.turn === s && g.status === 'playing');
    }
    const mp = this.root.querySelector('.me-plate');
    if (mp) {
      if (!mp._init) {
        mp.querySelector('.me-plate__av').innerHTML = avatarSVG(this.cfg.roster[0].avatar);
        mp._init = true;
      }
      mp.querySelector('.me-plate__score').textContent = String(d.scores[0]);
      mp.classList.toggle('is-turn', d.turn === 0 && g.status === 'playing');
    }
    this.host.classList.toggle('is-myturn', d.turn === 0 && g.status === 'playing');
    this._turnLight(g.status === 'playing' ? d.turn : null);
    this.stage?.setTurn(g.status === 'playing' ? d.turn : null);
    // çöplük etiketleri/sayıları
    for (let s = 0; s < 4; s++) {
      this.pileEls[s]._count.textContent = String(d.piles[s].length);
      this.pileEls[s]._count.style.display = d.piles[s].length > 1 ? '' : 'none';
    }
    this.stockCount.textContent = String(d.stock);
    this.stockDeco.forEach((el, i) => (el.style.display = d.stock > (2 - i) * 3 || i === 2 ? (d.stock > 0 ? '' : 'none') : 'none'));
    this.stage?.syncDecos();
    this.stage?.setCounts(d.counts);
    this.refreshSoundIcon();
  }

  // Sıradaki oyuncuya doğru masanın ışığı kayar: yazı okumadan kimin oynadığı anlaşılır
  _turnLight(seat) {
    const f = this.els.focus;
    if (seat === null || seat === undefined || !this.L) {
      f.classList.remove('is-on');
      return;
    }
    const L = this.L;
    let x;
    let y;
    if (seat === 0) {
      x = L.rack.rect.x + L.rack.rect.w / 2;
      y = L.rack.rect.y + L.rack.rect.h * 0.3;
    } else {
      const p = L.seats[seat].panel;
      x = p.x + p.w / 2;
      y = p.y + p.h / 2;
    }
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    f.dataset.seat = String(seat);
    f.classList.add('is-on');
  }

  refreshSoundIcon() {
    const on = this.deps.settings.get('sfx');
    this.els.soundBtn.innerHTML = icon(on ? 'volumeOn' : 'volumeOff');
  }

  // ───────────────────────────── sprite hedefleri ─────────────────────────────
  ensure(t) {
    let s = this.sys.get(t);
    if (!s) {
      const el = createTileEl(t, this.ctx);
      s = this.sys.add(t, el);
      // başlangıç: deste konumu, yüzü kapalı
      const st = this.L.stock;
      s.x = s.tx = st.cx;
      s.y = s.ty = st.cy;
      s.sc = s.tsc = this.L.scale.stock;
      s.flip = s.tflip = 180;
      s.placed = true;
      this.sys._render(s, true);
    }
    return s;
  }

  ghost() {
    const id = GHOST0 + this.ghostN++;
    const el = createTileEl(0, this.ctx);
    el.dataset.ghost = '1';
    el.removeAttribute('aria-label');
    const s = this.sys.add(id, el);
    return { id, s };
  }
  dropSprite(id) {
    this.sys.remove(id);
  }

  jitter(t) {
    const h = (Math.imul(t + 7, 2654435761) >>> 0) / 4294967296;
    const h2 = (Math.imul(t + 91, 2246822519) >>> 0) / 4294967296;
    const h3 = (Math.imul(t + 513, 3266489917) >>> 0) / 4294967296;
    return { dx: (h - 0.5) * 6, dy: (h2 - 0.5) * 5, rot: (h3 - 0.5) * 16 };
  }

  pileTarget(seat, t, k) {
    const p = this.L.piles[seat];
    const j = this.jitter(t);
    // 3B'de taşın görünen merkezi yuvanın merkezine oturtulur; DOM'da kalınlık alta çizildiği için hafif yukarı
    const up = this.stage ? 0 : 5;
    // en üstteki taş yuvaya düzgün oturur; alttakiler hafif dağınık (deste derinliği görünsün)
    const m = k === 0 ? 0.3 : 0.8;
    return { x: p.cx + j.dx * m - k * 1.1, y: p.cy - up + j.dy * m - k * 1.4, rot: j.rot * m, sc: p.sc, flip: 0, h: 0, z: 14 - k };
  }

  // Bir taşın şu an nerede olması gerektiği (görüntü modeline göre)
  targetOf(t) {
    const L = this.L;
    const d = this.disp;
    if (this.reveal) {
      const r = this.reveal.map.get(t);
      if (r) return r;
    }
    const ri = this.rack.indexOf(t);
    if (ri >= 0) {
      const c = L.rack.slotCenter(ri);
      const sel = this.selected === t;
      return { x: c.x, y: c.y, rot: 0, sc: sel ? 1.05 : 1, flip: 0, h: sel ? 7 : 0, z: 20 + (sel ? 40 : 0) + ri };
    }
    for (let s = 0; s < 4; s++) {
      const arr = d.piles[s];
      const i = arr.lastIndexOf(t);
      if (i >= 0) {
        const k = arr.length - 1 - i;
        return this.pileTarget(s, t, Math.min(k, 4));
      }
    }
    if (t === d.indicatorTile) {
      const o = L.indicator;
      return { x: o.cx, y: o.cy, rot: 0, sc: L.scale.indicator, flip: 0, h: 0, z: 13 };
    }
    if (this.packed) {
      for (const it of this.packed.items) {
        const k = it.tiles.findIndex((x) => x.t === t);
        if (k >= 0) return { x: it.tiles[k].cx, y: it.tiles[k].cy, rot: 0, sc: this.packed.tw / L.rack.tw, flip: 0, h: 0, z: 15 + k };
      }
    }
    return null;
  }

  // Tüm sprite hedeflerini yeniden hesapla. animated=false → anında
  retarget(animated, opts = {}) {
    if (!this.disp) return;
    this._packMelds();
    // gerekli sprite'ları garantiye al: ıstaka, çöplük üst 5, gösterge, per taşları
    const need = new Set();
    for (const t of this.rack.tiles()) need.add(t);
    for (let s = 0; s < 4; s++) {
      const arr = this.disp.piles[s];
      for (let i = Math.max(0, arr.length - 5); i < arr.length; i++) need.add(arr[i]);
    }
    if (this.disp.indicatorTile !== null && this.disp.indicatorTile !== undefined) need.add(this.disp.indicatorTile);
    if (this.packed) for (const it of this.packed.items) for (const x of it.tiles) need.add(x.t);
    if (this.reveal) for (const t of this.reveal.map.keys()) need.add(t);
    for (const t of need) {
      if (!this.sys.get(t)) {
        this.ensure(t);
        const tg = this.targetOf(t);
        if (tg) this.sys.snap(t, tg);
        else this.sys.remove(t);
      }
    }
    for (const [id, s] of this.sys.sprites) {
      if (id >= GHOST0) continue;
      if (s.mode === 'flight' || s.mode === 'drag') continue;
      if (!need.has(id)) {
        this.sys.remove(id);
        continue;
      }
      const tg = this.targetOf(id);
      if (!tg) continue;
      this._applyFace(id, s);
      if (animated && s.placed) this.sys.to(id, tg, { spring: opts.spring || SPRING.settle, delay: opts.stagger ? opts.stagger(id) : 0 });
      else this.sys.snap(id, tg);
    }
    this._renderMeldTags();
  }

  _applyFace(t, s) {
    // masadaki okey temsil ettiği yüzü gösterir
    if (!isOkey(t, this.ctx)) return;
    let rep = null;
    if (this.packed) {
      for (const it of this.packed.items) {
        const m = this.disp.melds.find((x) => x.id === it.meldId);
        const e = m && m.tiles.find((x) => x.t === t);
        if (e) rep = { c: e.c, v: e.v };
      }
    }
    const key = rep ? `${rep.c}:${rep.v}` : '';
    if (s._repKey !== key) {
      s._repKey = key;
      setTileFace(s.el, t, this.ctx, rep);
    }
  }

  _packMelds() {
    const d = this.disp;
    if (!d || this.mode !== 'okey101' || !d.melds.length) {
      this.packed = null;
      return;
    }
    const L = this.L;
    const cap = L.profile === 'landscape' ? Math.min(L.rack.tw * 0.72, 44) : Math.min(L.rack.tw * 0.66, 40);
    this.packed = packMeldsZoned(d.melds, L.meldArea, { maxTw: cap, minTw: 11 });
  }

  _renderMeldTags() {
    const host = this.meldTags;
    host.innerHTML = '';
    if (!this.packed) {
      this.stage?.setZones([]);
      return;
    }
    // sahip bölgeleri: hafif zemin + etiket (avatar, isim, açılış puanı)
    this.stage?.setZones((this.packed.zones || []).map((z) => ({ rect: z.rect, color: OWNER_COLOR[z.owner] })));
    for (const z of this.packed.zones || []) {
      const mine = this.disp.melds.filter((m) => m.owner === z.owner);
      const pts = mine.filter((m) => m.kind !== 'pair').reduce((a, m) => a + meldPoints(m), 0);
      const pairs = mine.filter((m) => m.kind === 'pair').length;
      const ro = this.cfg.roster[z.owner];
      const el = document.createElement('div');
      el.className = 'mzone';
      el.dataset.owner = String(z.owner);
      el.style.cssText = `left:${z.rect.x}px;top:${z.rect.y}px;width:${z.rect.w}px;height:${z.rect.h}px;--oc:${OWNER_COLOR[z.owner]}`;
      el.innerHTML = `<span class="mzone__tag"><i>${avatarSVG(ro.avatar)}</i><b>${z.owner === 0 ? 'Sen' : ro.name}</b><em>${pairs && !pts ? pairs + ' çift' : pts + ' puan'}</em></span>`;
      host.appendChild(el);
    }
  }

  // ───────────────────────────── hit-test ─────────────────────────────
  hit(x, y, { forDrag = false } = {}) {
    const L = this.L;
    // köşeli ayraç rozetleri
    for (const b of this.badgeRects) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return { kind: 'badge', key: b.key };
    // per işleme çipleri
    for (const c of this.layoffChips) if (x >= c.x - 4 && x <= c.x + c.w + 4 && y >= c.y - 4 && y <= c.y + c.h + 4) return { kind: 'chip', meldId: c.meldId, end: c.end };
    // ıstaka
    const rr = L.rack.rect;
    if (x >= rr.x - 6 && x <= rr.x + rr.w + 6 && y >= rr.y - 14 && y <= rr.y + rr.h + 6) {
      const slot = L.rack.slotAt(x, y);
      const tile = this.rack.tileAt(slot);
      if (tile !== null) {
        // dokunma toleransı: slot kutusu + yatay yarım boşluk
        const sr = L.rack.slotRect(slot);
        if (x >= sr.x - L.rack.gap && x <= sr.x + sr.w + L.rack.gap && y >= sr.y - 12 && y <= sr.y + sr.h + 12) return { kind: 'rackTile', tile, slot };
      }
      return { kind: 'rackSlot', slot };
    }
    // deste
    const st = L.stock;
    if (Math.abs(x - st.cx) <= st.w / 2 + 12 && Math.abs(y - st.cy) <= st.h / 2 + 14) return { kind: 'stock' };
    // çöplükler
    for (let s = 0; s < 4; s++) {
      const p = L.piles[s];
      if (Math.abs(x - p.cx) <= p.w / 2 + (s === 0 || s === 3 ? 14 : 4) && Math.abs(y - p.cy) <= p.h / 2 + (s === 0 || s === 3 ? 14 : 4)) return s === 3 ? { kind: 'side' } : s === 0 ? { kind: 'myPile' } : { kind: 'pile', seat: s };
    }
    // masadaki perler
    if (this.packed) {
      const m = hitMeld(this.packed, x, y, 10);
      if (m) return { kind: 'meld', meldId: m.meldId, end: m.end };
      for (const z of this.packed.zones || []) if (x >= z.rect.x && x <= z.rect.x + z.rect.w && y >= z.rect.y && y <= z.rect.y + z.rect.h) return { kind: 'zone', owner: z.owner };
    }
    return null;
  }

  // ───────────────────────────── seçim / ipuçları ─────────────────────────────
  setSelected(t) {
    const prev = this.selected;
    this.selected = t;
    for (const id of [prev, t]) {
      if (id === null || id === undefined) continue;
      const s = this.sys.get(id);
      if (!s) continue;
      s.el.classList.toggle('is-selected', id === t);
      const tg = this.targetOf(id);
      if (tg) this.sys.to(id, tg, { spring: SPRING.snappy });
    }
    this.renderLayoffChips();
    this.deps.onSelect?.(t);
  }

  markNew(t) {
    if (this.newTile !== null) this.sys.get(this.newTile)?.el.classList.remove('is-new');
    this.newTile = t;
    const s = this.sys.get(t);
    if (s) {
      s.el.classList.remove('is-new');
      void s.el.offsetWidth;
      s.el.classList.add('is-new');
    }
  }

  setHints(tiles) {
    for (const t of this.hintTiles) this.sys.get(t)?.el.classList.remove('is-hint');
    this.hintTiles = new Set(tiles);
    for (const t of this.hintTiles) this.sys.get(t)?.el.classList.add('is-hint');
  }

  setDim(tiles) {
    const set = new Set(tiles);
    for (const t of this.rack.tiles()) this.sys.get(t)?.el.classList.toggle('is-dim', set.has(t));
  }

  // 101: seçili taşın işlenebileceği perlerin uçlarında "+" çipleri
  renderLayoffChips() {
    const host = this.els.chips;
    host.innerHTML = '';
    this.layoffChips = [];
    const t = this.selected;
    if (t === null || !this.packed || this.mode !== 'okey101') return;
    if (!this.deps.canLayoff?.()) return;
    const targets = this.game.layoffTargets(0, t);
    if (!targets.length) return;
    for (const tg of targets) {
      const it = this.packed.items.find((x) => x.meldId === tg.meldId);
      if (!it) continue;
      for (const end of tg.ends) {
        const size = clamp(Math.round(this.packed.tw * 0.9), 18, 30);
        const cx = end === 'low' ? it.rect.x - size * 0.55 : it.rect.x + it.rect.w + size * 0.55;
        const cy = it.rect.y + it.rect.h / 2;
        const chip = document.createElement('button');
        chip.className = 'chip-plus';
        chip.type = 'button';
        chip.setAttribute('aria-label', 'Pere işle');
        chip.style.cssText = `position:absolute;left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;pointer-events:none`;
        chip.innerHTML = icon('plus');
        host.appendChild(chip);
        this.layoffChips.push({ x: cx - size / 2, y: cy - size / 2, w: size, h: size, meldId: tg.meldId, end });
      }
    }
  }

  // ───────────────────────────── per köşeli ayraçları / açılış önizlemesi ─────────────────────────────
  groupKey(g) {
    return g.tiles.slice().sort((a, b) => a - b).join(',');
  }

  _renderBrackets() {
    const host = this.els.brackets;
    host.innerHTML = '';
    this.badgeRects = [];
    if (!this.game || !this.L || !this.settingsHints()) return;
    const L = this.L.rack;
    const wrap = this.game.wrapHigh;
    const is101 = this.mode === 'okey101';
    for (const g of this.rack.groups()) {
      const m = g.tiles.length >= 2 ? this._classifyOrdered(g.tiles, wrap) : null;
      if (!m) continue;
      if (m.kind === 'pair' && !is101) continue;
      const key = this.groupKey(g);
      const off = this.excluded.has(key);
      const a = L.slotRect(g.start);
      const b = L.slotRect(g.end);
      const x0 = a.x;
      const x1 = b.x + b.w;
      const y = a.y + L.th + Math.round(L.tw * 0.06);
      const line = document.createElement('div');
      line.className = 'bracket' + (off ? ' is-off' : '');
      line.style.cssText = `left:${x0}px;top:${y}px;width:${x1 - x0}px;height:${Math.max(2, Math.round(L.tw * 0.07))}px`;
      host.appendChild(line);
      // rozet
      const label = is101 ? (m.kind === 'pair' ? '2×' : String(meldPoints(m))) : '✓';
      const bw = Math.max(20, label.length * 8 + 10);
      const bx = (x0 + x1) / 2 - bw / 2;
      const by = a.y - 8;
      const badge = document.createElement('div');
      badge.className = 'badge-pts' + (off ? ' is-off' : '');
      badge.textContent = label;
      badge.style.cssText = `left:${bx}px;top:${by}px;min-width:${bw}px`;
      host.appendChild(badge);
      this.badgeRects.push({ key, x: bx - 4, y: by - 4, w: bw + 8, h: 22 });
    }
  }

  _classifyOrdered(tiles, wrap) {
    return classifyGroup(tiles, this.ctx, wrap);
  }

  settingsHints() {
    return this.deps.settings.get('meldHints') || this.mode === 'okey101';
  }

  // Istaka gruplarından 101 açılış özeti
  openingPreview() {
    if (!this.game || this.mode !== 'okey101') return null;
    const wrap = this.game.wrapHigh;
    const need = this.game.openingRequirement();
    const sets = [];
    const pairs = [];
    for (const g of this.rack.groups()) {
      const key = this.groupKey(g);
      if (this.excluded.has(key)) continue;
      const m = g.tiles.length >= 2 ? this._classifyOrdered(g.tiles, wrap) : null;
      if (!m) continue;
      if (m.kind === 'pair') pairs.push({ kind: 'pair', tiles: g.tiles.slice() });
      else sets.push({ kind: m.kind, tiles: g.tiles.slice(), points: meldPoints(m) });
    }
    const points = sets.reduce((a, x) => a + x.points, 0);
    return { need, sets, pairs, points, pairCount: pairs.length };
  }

  // ───────────────────────────── durum / eylem çubuğu / toast ─────────────────────────────
  setStatus(main, sub = '', mine = false) {
    this.els.statusMain.textContent = main;
    this.els.statusSub.textContent = sub;
    this.els.status.classList.toggle('is-mine', mine);
    this.els.live.textContent = `${main}. ${sub}`;
  }

  // actions: [{id, label, kind:'primary'|'ghost'|'', disabled, icon, badge}]
  setActions(list) {
    const host = this.els.actions;
    const sig = JSON.stringify(list);
    if (this._actSig === sig) return;
    this._actSig = sig;
    host.innerHTML = '';
    for (const a of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn' + (a.kind ? ' btn--' + a.kind : '') + ' btn--sm';
      b.dataset.act = a.id;
      b.disabled = !!a.disabled;
      b.innerHTML = (a.icon ? icon(a.icon, 'btn-ic') : '') + `<span>${a.label}</span>` + (a.badge ? `<em class="btn-badge">${a.badge}</em>` : '');
      host.appendChild(b);
    }
  }

  // Mesaj şeridi: tüm bildirimler eylem şeridindeki durum yazısının yerinde, sırayla akar — masadaki hiçbir şeyin
  // (plaka, deste, per, ıstaka) üstüne binmez. Yeni mesaj eskisini iter.
  toast(text, kind = '', ms = 2200) {
    const bar = this.els.actionbar;
    const st = this.els.status;
    if (!bar || !st) return null;
    let host = this.els.ticker;
    if (!host) {
      host = document.createElement('div');
      host.className = 'ticker';
      bar.appendChild(host);
      this.els.ticker = host;
    }
    host.style.left = st.offsetLeft + 'px';
    host.style.width = Math.max(120, st.offsetWidth) + 'px';
    for (const old of [...host.children]) {
      old.classList.add('is-out');
      setTimeout(() => old.remove(), 260);
    }
    const el = document.createElement('div');
    el.className = 'ticker__msg' + (kind ? ' is-' + kind : '');
    el.innerHTML = `<i></i><span></span>`;
    el.querySelector('span').textContent = text;
    host.appendChild(el);
    st.classList.add('is-hushed');
    clearTimeout(this._tickT);
    this._tickT = setTimeout(() => {
      el.classList.add('is-out');
      st.classList.remove('is-hushed');
      setTimeout(() => el.remove(), 280);
    }, ms);
    this.els.live.textContent = text;
    return el;
  }

  // Kontrollü odak (spot)
  focus(x, y, on = true) {
    const f = this.els.focus;
    if (x !== undefined) {
      f.style.left = x + 'px';
      f.style.top = y + 'px';
    }
    f.classList.toggle('is-on', on);
  }

  setCapabilities({ canDrawStock, canTakeSide, canDiscard, dropZone }) {
    this.stockEl.classList.toggle('is-ready', !!canDrawStock);
    this.pileEls[3].classList.toggle('is-take', !!canTakeSide);
    this.pileEls[3].querySelector('.pile__label').textContent = canTakeSide ? 'Yandan al' : '';
    this.pileEls[0].classList.toggle('is-drop', !!canDiscard);
    this.pileEls[0].querySelector('.pile__label').textContent = canDiscard ? (dropZone === 'finish' ? 'Bitir' : 'Buraya at') : '';
    this.pileEls[0].classList.toggle('is-finish', dropZone === 'finish');
  }

  setDropHot(v) {
    this.pileEls[0].classList.toggle('is-drop-hot', !!v);
  }

  // ───────────────────────────── etkileşim yardımcıları ─────────────────────────────
  onRackChanged() {
    this._renderBrackets();
    this.renderLayoffChips();
    this.deps.onRackChange?.();
  }

  toggleGroup(key) {
    if (this.excluded.has(key)) this.excluded.delete(key);
    else this.excluded.add(key);
    this.onRackChanged();
  }

  persistRack() {
    this.deps.onRackPersist?.();
  }

  hitMeldAt(x, y) {
    return this.packed ? hitMeld(this.packed, x, y, 14) : null;
  }

  highlightMeld(id) {
    if (this._hlMeld === id) return;
    this._hlMeld = id;
    this.meldTags.querySelector('.mhl')?.remove();
    const it = id !== null && id !== undefined ? this.packed?.items.find((x) => x.meldId === id) : null;
    if (!it) return;
    const el = document.createElement('div');
    el.className = 'mhl';
    el.style.cssText = `left:${it.rect.x - 5}px;top:${it.rect.y - 5}px;width:${it.rect.w + 10}px;height:${it.rect.h + 10}px`;
    this.meldTags.appendChild(el);
  }

  setDropZoneVisible(v) {
    // sürükleme sırasında atma bölgesini belirgin göster (is-drop zaten yetenekle açılır)
    this.pileEls[0].classList.toggle('is-dragging-zone', !!v);
  }

  pulsePile(seat, strong = false) {
    const el = this.pileEls[seat];
    el.classList.remove('is-pulse');
    void el.offsetWidth;
    el.classList.add('is-pulse');
    const p = this.L?.piles?.[seat];
    if (p) this.stage?.ping(p.cx, p.cy, { r: Math.max(p.w, p.h) * (strong ? 0.95 : 0.7), color: strong ? 'rgb(255,200,90)' : 'rgb(255,236,200)', dur: strong ? 900 : 620, s1: strong ? 2.1 : 1.5 });
  }

  // Desteden/yandan çekişte kaynak yuvada küçük halka
  pulseSource(x, y, r = 40) {
    this.stage?.ping(x, y, { r, color: 'rgb(190,225,255)', dur: 520, s0: 0.7, s1: 1.4, a: 0.7 });
  }

  _fxEl(cls, html, css = '') {
    const el = document.createElement('div');
    el.className = cls;
    el.innerHTML = html;
    if (css) el.style.cssText = css;
    this.els.coach.appendChild(el);
    return el;
  }

  // "SIRA SENDE" bildirimi: mesaj şeridinde altın, harf aralığı açılarak beliren yazı + ıstaka çerçevesinde ışık
  cue(text, sub = '') {
    const el = this.toast(text, 'cue', 1500);
    if (el && sub) el.insertAdjacentHTML('beforeend', `<small>${sub}</small>`);
  }

  // Mühür: ceza / bitiş / açılış gibi anların büyük damgası
  stamp(text, sub = '', kind = 'penalty', ms = 1700) {
    const L = this.L;
    if (!L) return;
    const cx = L.table.x + L.table.w / 2;
    const cy = L.table.y + L.table.h * 0.42;
    const el = this._fxEl(`stamp stamp--${kind}`, `<b>${text}</b>${sub ? `<small>${sub}</small>` : ''}`, `left:${cx}px;top:${cy}px`);
    setTimeout(() => el.classList.add('is-out'), ms);
    setTimeout(() => el.remove(), ms + 420);
  }

  // Ekranı kısa süre boyar (kırmızı = ceza, altın = bitiş)
  flash(kind = 'red', ms = 520) {
    const el = this._fxEl(`flash flash--${kind}`, '');
    el.animate?.([{ opacity: 0 }, { opacity: 1, offset: 0.16 }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
    setTimeout(() => el.remove(), ms + 40);
  }

  floatText(text, x, y, kind = 'warn') {
    const el = this._fxEl(`floaty floaty--${kind}`, text, `left:${x}px;top:${y}px`);
    setTimeout(() => el.remove(), 1500);
  }

  // 101: oyuncunun per bölgesi sahibinin renginde parlar
  flashZone(seat) {
    const z = (this.packed?.zones || []).find((x) => x.owner === seat);
    if (z && this.stage) this.stage.flashRect({ x: z.rect.x - 2, y: z.rect.y - 2, w: z.rect.w + 4, h: z.rect.h + 4 }, { color: OWNER_COLOR[seat], dur: 950, grow: 0.06 });
    else this.flashSeat(seat, 'rgb(150,230,190)');
  }

  // per bölgesi etiketindeki puan sıfırdan sayarak gelir
  countZone(owner) {
    const em = this.meldTags.querySelector(`.mzone[data-owner="${owner}"] .mzone__tag em`);
    if (!em) return;
    const m = em.textContent.match(/(\d+)\s*(.*)/);
    if (!m) return;
    const to = +m[1];
    const suffix = m[2];
    const t0 = performance.now();
    em.classList.add('is-counting');
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 800);
      em.textContent = `${Math.round(to * (1 - Math.pow(1 - k, 3)))} ${suffix}`;
      if (k < 1) requestAnimationFrame(step);
      else em.classList.remove('is-counting');
    };
    requestAnimationFrame(step);
  }

  // Bir oyuncunun istasyonu: sıcak/kırmızı çerçeve parlaması (ceza, açılış)
  flashSeat(seat, color = 'rgb(255,120,100)') {
    const r = this.stage?.glowRects?.[seat];
    if (r) this.stage.flashRect(r, { color, dur: 900, grow: 0.09 });
  }

  // Per merceği: bir oyuncunun masadaki perlerini okunur boyda gösterir (dokununca ya da açılış/işleme anında kendiliğinden)
  meldLens(owner, { auto = false, mark = [] } = {}) {
    const L = this.L;
    const d = this.disp;
    if (!L || !d) return;
    const mine = d.melds.filter((m) => m.owner === owner);
    this.closeLens(true);
    if (!mine.length) return;
    const ro = this.cfg.roster[owner];
    const pts = mine.filter((m) => m.kind !== 'pair').reduce((a, m) => a + meldPoints(m), 0);
    const pairs = mine.filter((m) => m.kind === 'pair').length;
    const total = mine.reduce((a, m) => a + m.tiles.length, 0);
    // sığacak en büyük taş: genişlik ve yükseklik bütçesine göre
    const W = Math.min(L.table.w * 0.86, 640);
    const H = L.table.h * 0.7 - 40;
    let tw = 34;
    for (; tw > 16; tw -= 2) {
      const gw = (n) => n * (tw + 2) + 8;
      let rows = 1;
      let x = 0;
      for (const m of mine) {
        const w = gw(m.tiles.length) + 8;
        if (x + w > W && x > 0) {
          rows++;
          x = 0;
        }
        x += w;
      }
      if (rows * (tw * 1.36 + 10) <= H) break;
    }
    const el = document.createElement('div');
    el.className = 'lens' + (auto ? ' is-auto' : '');
    el.style.setProperty('--tw', tw + 'px');
    el.style.setProperty('--oc', OWNER_COLOR[owner]);
    const cx = L.table.x + L.table.w / 2;
    el.style.left = cx + 'px';
    el.style.top = L.table.y + L.table.h * 0.5 + 'px';
    el.style.maxWidth = W + 24 + 'px';
    el.innerHTML = `<header><i>${avatarSVG(ro.avatar)}</i><b>${owner === 0 ? 'Sen' : ro.name}</b><em>${pairs && !pts ? pairs + ' çift' : pts + ' puan'}</em><span>${total} taş</span></header><div class="lens__melds"></div>`;
    const host = el.querySelector('.lens__melds');
    const marks = new Set(mark);
    for (const m of mine) {
      const g = document.createElement('div');
      g.className = 'lens__meld' + (m.kind === 'pair' ? ' is-pair' : '');
      for (const x of m.tiles) {
        const t = createTileEl(x.t, this.ctx, { inline: true });
        setTileFace(t, x.t, this.ctx, isOkey(x.t, this.ctx) ? { c: x.c, v: x.v } : null);
        if (marks.has(x.t)) t.classList.add('is-new');
        g.appendChild(t);
      }
      host.appendChild(g);
    }
    this.els.coach.appendChild(el);
    this._lens = el;
    if (auto) {
      this._lensT = setTimeout(() => this.closeLens(), 2300);
    } else {
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.closeLens();
      });
      this._lensAway = (e) => {
        if (!el.contains(e.target)) this.closeLens();
      };
      setTimeout(() => document.addEventListener('pointerdown', this._lensAway, true), 60);
    }
  }

  closeLens(now = false) {
    clearTimeout(this._lensT);
    if (this._lensAway) document.removeEventListener('pointerdown', this._lensAway, true);
    this._lensAway = null;
    const el = this._lens;
    this._lens = null;
    if (!el) return;
    if (now) return el.remove();
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 240);
  }

  showOkeyDeco() {
    this.okeyShown = true;
    const d = this.indDeco;
    if (d) {
      d.style.opacity = '1';
      this.stage?.syncDecos();
      d.animate?.([{ filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }], { duration: 900, easing: 'ease-out' });
      const ind = this.L?.indicator;
      if (ind) {
        this.stage?.ping(ind.cx, ind.cy, { r: Math.max(ind.w || 60, ind.h || 60) * 1.1, glow: true, dur: 1100, s0: 0.4, s1: 2.2, a: 0.9 });
        this.stage?.ping(ind.cx, ind.cy, { r: Math.max(ind.w || 60, ind.h || 60) * 0.9, color: 'rgb(255,210,120)', dur: 900, s0: 0.6, s1: 2.6, delay: 140 });
        this.stage?.lampFlash('gold', 0.55, 700);
      }
    }
  }

  banner(title, sub = '') {
    const host = this.els.coach;
    const el = document.createElement('div');
    el.className = 'banner';
    el.innerHTML = `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
    const L = this.L;
    el.style.top = L.table.y + L.table.h * 0.3 + 'px';
    host.appendChild(el);
    setTimeout(() => el.classList.add('is-out'), 1500);
    setTimeout(() => el.remove(), 1900);
  }

  clearReveal() {
    this.reveal = null;
    this.setRevealMode(false);
  }

  // el sonu vitrini: deste/gösterge masadan çekilir, kazananın eli koyu kadife tepside sergilenir
  setRevealMode(on) {
    this.root.classList.toggle('is-reveal', !!on);
    const hide = (el) => el && (el.style.visibility = on ? 'hidden' : '');
    for (const d of this.stockDeco || []) d.style.opacity = on ? '0' : '';
    if (this.indDeco) this.indDeco.style.opacity = on ? '0' : this.okeyShown ? '1' : '0';
    const ind = this.disp?.indicatorTile;
    const isp = ind !== null && ind !== undefined ? this.sys.get(ind) : null;
    if (isp && !(this.reveal && this.reveal.map.has(ind))) isp.el.style.display = on ? 'none' : '';
    hide(this.indPlate);
    hide(this.stockEl);
    hide(this.stockOv);
    if (!on) this.stage?.setTray(null);
    this.stage?.syncDecos();
  }

  destroy() {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.sys?.clear();
    this.stage?.destroy();
    this.root?.remove();
    this._probe?.remove();
  }
}
