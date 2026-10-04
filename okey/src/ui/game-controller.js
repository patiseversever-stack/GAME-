// GameController — oyun döngüsünün orkestrası.
// Motor (Game) senkron ve kesindir; sunum (Scene/Choreo) asenkron oynar. Burada:
//  • insan niyetleri (intent) doğrulanıp motora uygulanır, olaylar koreografiye verilir
//  • bot sıraları doğal bir ritimle (düşünme → çekme → hamle → atma) oynanır
//  • durum/eylem çubuğu, yetenekler (yeteneğe göre çöplük/deste vurguları) güncellenir
//  • kayıt/devam, el sonu ve maç sonu akışı

import { Game, prevSeat } from '../game/game.js';
import { Bot, DIFFICULTIES } from '../game/bot/bot.js';
import { freshSeed, createRng, mixSeed } from '../util/rng.js';
import { ROSTER } from './avatars.js';
import { Scene } from './scene.js';
import { Choreo } from './choreo.js';
import { InputController } from './input.js';
import { Camera, Confetti, Dust } from './effects.js';
import { FINISH_LABEL } from '../game/scoring.js';
import { findBest } from '../game/solver.js';
import { meldPoints } from '../game/melds.js';
import { prefersReducedMotion } from '../meta/settings.js';
import { readJSON, writeJSON, removeKey } from '../meta/storage.js';
import { tileLabel, isOkey, isFake, colorOf, valueOf, COLOR_TR, COLORS } from '../game/tiles.js';

const SAVE_KEY = 'patisever.save.v1';
const SPEED = { slow: 0.75, normal: 1, fast: 1.8 };

export function hasSavedGame() {
  const s = readJSON(SAVE_KEY, null);
  return !!(s && s.v === 1 && s.state && s.state.status !== 'matchOver');
}
export function savedSummary() {
  const s = readJSON(SAVE_KEY, null);
  if (!s || !s.state) return null;
  const st = s.state;
  return { mode: st.rules.mode, round: st.round, rounds: st.rules.rounds, score: st.scores[0], difficulty: s.difficulty, when: s.when };
}
export function clearSavedGame() {
  removeKey(SAVE_KEY);
}

function makeRoster(seed, difficulty, settings) {
  const rng = createRng(mixSeed(seed, 11));
  const player = ROSTER.find((r) => r.id === settings.get('playerAvatar')) || ROSTER[0];
  const pool = rng.shuffle(ROSTER.filter((r) => r.id !== player.id));
  let diffs;
  if (difficulty === 'mixed') diffs = rng.shuffle(['casual', 'normal', 'expert']);
  else diffs = [difficulty, difficulty, difficulty];
  const roster = [{ name: settings.get('playerName') || 'Sen', avatar: player.id, difficulty: null }];
  for (let i = 0; i < 3; i++) roster.push({ name: pool[i].name, avatar: pool[i].id, difficulty: diffs[i], title: pool[i].title });
  return roster;
}

export class GameController {
  constructor({ host, settings, profile, audio, ui, onExit }) {
    this.host = host;
    this.settings = settings;
    this.profile = profile;
    this.audio = audio;
    this.ui = ui;
    this.onExit = onExit;
    this.token = 0;
    this.busy = true;
    this.game = null;
    this.scene = null;
    this.stats = { penalties0: 0 };
    this._sortMenu = null;
  }

  // ───────────────────────────── başlatma ─────────────────────────────
  async newGame(cfg) {
    const seed = cfg.seed ?? freshSeed();
    const rules = { ...cfg.rules, mode: cfg.mode };
    this.cfg = { ...cfg, seed };
    this.game = Game.create(rules, seed);
    this.roster = makeRoster(seed, cfg.difficulty, this.settings);
    this.matchStats = { penalties0: 0 };
    await this._mount({ intro: true });
  }

  async resume() {
    const s = readJSON(SAVE_KEY, null);
    if (!s) return false;
    const g = Game.restore(s.state);
    if (!g) return false;
    this.game = g;
    this.cfg = s.cfg;
    this.roster = s.roster;
    this.matchStats = s.matchStats || { penalties0: 0 };
    await this._mount({ intro: false, rack: s.rack });
    return true;
  }

  async _mount({ intro, rack = null }) {
    this.token++;
    const token = this.token;
    this.destroyScene();
    this.busy = true;
    const scene = new Scene(this.host, {
      settings: this.settings,
      audio: this.audio,
      onSelect: () => this.updateUI(),
      onRackChange: () => this.updateUI(),
      onRackPersist: () => this.save(),
      onSlow: (avg) => this.onSlowFrames(avg),
      canLayoff: () => this.caps().canLayoff,
    });
    scene.build();
    this.scene = scene;
    this.fx = {
      camera: Object.assign(new Camera(scene.els.cam, () => (scene.sys.reduced ? 'reduced' : 'full')), { extra: scene.stage ? [scene.stage.canvas] : [], enabled: () => this.settings.get('cinematic') !== false }),
      confetti: new Confetti(this._confettiCanvas()),
      dust: new Dust(scene.els.canvas),
    };
    this.applyMotion();
    scene.setGame(this.game, { roster: this.roster });
    // kaydedilmiş ıstaka düzeni
    if (rack && rack.slots) {
      try {
        scene.rack.rows = rack.rows;
        scene.rack.cols = rack.cols;
        scene.rack.slots = rack.slots.slice();
        scene.rack.reflow(scene.L.rack.rows, scene.L.rack.cols);
      } catch {
        scene.rack.clear();
      }
    }
    this.choreo = new Choreo(scene, this.audio, this.settings, this.fx);
    this.input = new InputController(scene, { caps: () => this.caps(), intent: (i) => this.intent(i), settings: this.settings });
    this._wire(token);
    this.audio.setMusicWanted(true);
    this.startAmbient();
    if (intro) {
      scene.els.actionbar.style.opacity = '0';
      this.skipIntro = this._skipHandler();
      scene.root.addEventListener('pointerdown', this.skipIntro, { capture: true });
      await this.choreo.intro();
      scene.root.removeEventListener('pointerdown', this.skipIntro, { capture: true });
      if (token !== this.token) return;
      this.choreo.resumeNormal();
      this.save();
    } else {
      scene.syncAll({ rackTiles: rack?.slots ? scene.rack.slots.slice() : null });
    }
    this.busy = false;
    this.stats.penalties0 = 0;
    this.coachStart();
    await this.advance();
  }

  _skipHandler() {
    return (e) => {
      if (!this.choreo) return;
      e.stopPropagation();
      this.choreo.skipAll();
    };
  }

  _confettiCanvas() {
    let c = this.host.querySelector('.fx-confetti');
    if (!c) {
      c = document.createElement('canvas');
      c.className = 'fx-confetti';
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:90';
      this.host.appendChild(c);
    }
    return c;
  }

  _wire(token) {
    const sc = this.scene;
    const onResize = () => {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        if (token !== this.token) return;
        this.choreo?.skipAll();
        this.choreo?.resumeNormal();
        sc.layout();
        this.updateUI();
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    sc.disposers.push(() => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    });
    const onVis = () => sc.sys.pause(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    sc.disposers.push(() => document.removeEventListener('visibilitychange', onVis));
    // HUD / eylem çubuğu düğmeleri
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      this.audio.unlock();
      this.audio.play('tap');
      this.action(b.dataset.act, b);
    };
    sc.root.addEventListener('click', onClick);
    sc.disposers.push(() => sc.root.removeEventListener('click', onClick));
    const unsub = this.settings.subscribe((k, v) => {
      if (k === 'sfx') sc.refreshSoundIcon();
      if (['motion', 'botSpeed', 'quality'].includes(k)) this.applyMotion();
      if (k === 'gyro') this.scene?.stage?.setGyro(!!v);
      if (k === 'quality') this.scene?.stage?.setQuality({ low: 3, medium: 2, high: 0, auto: 0 }[v] ?? 0);
      if (k === 'meldHints') sc.onRackChanged();
    });
    sc.disposers.push(unsub);
  }

  applyMotion() {
    const sys = this.scene.sys;
    sys.reduced = prefersReducedMotion(this.settings);
    sys.speed = SPEED[this.settings.get('botSpeed')] ?? 1;
    const q = this.settings.get('quality');
    const low = q === 'low' || (q === 'auto' && this.autoLow);
    this.host.dataset.quality = low ? 'low' : 'high';
    this.host.style.setProperty('--tilt', low || sys.reduced ? '0deg' : '5deg');
    this.startAmbient();
  }

  startAmbient() {
    const sys = this.scene.sys;
    const low = this.host.dataset.quality === 'low';
    if (!low && !sys.reduced) this.fx.dust.start(20);
    else this.fx.dust.stop();
  }

  onSlowFrames(avg) {
    if (this.settings.get('quality') !== 'auto') return;
    // Kendi sıramda kalite düşürme (gölge haritası, piksel oranı, gölgelendirici yeniden derleme) çekilen taşın
    // uçuşunu dondururdu: düşürme bir sonraki bot sırasına ertelenir.
    if (this.game?.state?.status === 'playing' && this.game.state.turn.seat === 0) {
      this._degradeLater = true;
      return;
    }
    // 3B kalite basamaklı düşer (yüksek → orta → düşük); DOM efektleri en sonda
    const st = this.scene?.stage;
    if (st && st.qLevel < 3) {
      // basamaklar arası en az 8 sn: bir kerelik takılma (ör. açılış animasyonu) netliği öldürmesin
      const now = performance.now();
      if (now - (this._lastDegrade || 0) < 8000) return;
      this._lastDegrade = now;
      st.setQuality(st.qLevel + 1);
      return;
    }
    if (this.autoLow) return;
    this.autoLow = true;
    this.applyMotion();
  }

  destroyScene() {
    if (this.scene) {
      this.fx?.dust.stop();
      this.fx?.confetti.clear();
      this.scene.destroy();
      this.scene = null;
    }
  }

  destroy() {
    this.token++;
    // bekleyen gecikmeli eylemler silinmiş sahneye karşı çalışmadan iptal edilir
    if (this.choreo) {
      for (const id of this.choreo.timers) clearTimeout(id);
      for (const id of this.choreo.laters?.keys() || []) clearTimeout(id);
      this.choreo.timers.clear();
      this.choreo.laters?.clear();
      this.choreo.waiters.clear();
    }
    this.destroyScene();
    this.audio.setMusicWanted(false);
    this.host.querySelector('.fx-confetti')?.remove();
  }

  // ───────────────────────────── yetenekler ve arayüz ─────────────────────────────
  get myTurn() {
    const s = this.game?.state;
    return !!(s && s.status === 'playing' && s.turn.seat === 0 && !this.busy);
  }

  caps() {
    const g = this.game;
    const none = { canDrawStock: false, canTakeSide: false, canDiscard: false, canLayoff: false, finishing: new Set(), myTurn: false };
    if (!g || !this.myTurn) return none;
    const s = g.state;
    const draw = s.turn.needsDraw;
    const is101 = g.is101;
    const opened = s.opened[0];
    const hand = s.hands[0];
    const sideUncommitted = is101 && s.turn.source === 'side' && !s.turn.sideCommitted;
    const finishing = new Set();
    if (!draw) {
      if (!is101) for (const t of g.finishingTiles(0)) finishing.add(t);
      else if (hand.length === 1 && opened !== 'none') finishing.add(hand[0]);
    }
    return {
      myTurn: true,
      canDrawStock: draw,
      canTakeSide: draw && g.sideTile(0) !== null,
      canDiscard: !draw && !sideUncommitted,
      canLayoff: !draw && is101 && opened !== 'none' && hand.length > 1,
      finishing,
      sideUncommitted,
    };
  }

  updateUI() {
    const sc = this.scene;
    const g = this.game;
    if (!sc || !g || !sc.disp) return;
    const s = g.state;
    const caps = this.caps();
    const c0 = this.roster[0];
    sc.setCapabilities({ canDrawStock: caps.canDrawStock, canTakeSide: caps.canTakeSide, canDiscard: caps.canDiscard, dropZone: caps.finishing.size ? 'finish' : 'discard' });
    // ıstakada yanıp sönme yok; ama yan taş zorunluysa bilgi ver
    const actions = [];
    const is101 = g.is101;
    if (s.status !== 'playing') {
      sc.setActions([]);
      return;
    }
    const turnSeat = s.turn.seat;
    if (turnSeat !== 0 || this.busy) {
      if (turnSeat !== 0) {
        const name = this.roster[turnSeat].name;
        sc.setStatus(`${name} oynuyor`, this.lastActionText || '', false);
      }
      actions.push({ id: 'sort', label: 'Diz', icon: 'sort', kind: 'ghost' });
      sc.setActions(actions);
      return;
    }
    const draw = s.turn.needsDraw;
    if (draw) {
      const side = g.sideTile(0) !== null;
      sc.setStatus('Sıra sende', side ? 'Ortadan çek ya da soldaki taşı al' : 'Ortadan taş çek', true);
    } else if (!is101) {
      if (caps.finishing.size) sc.setStatus('Bitirebilirsin!', 'Taşı “Bitir” alanına bırak ya da Bitir’e bas', true);
      else sc.setStatus('Bir taş at', 'Sürükle ya da seçip tekrar dokun', true);
    } else {
      const op = s.opened[0];
      if (caps.sideUncommitted) sc.setStatus('Yandan aldığın taşı kullan', 'Aç / pere işle — ya da geri bırak', true);
      else if (op === 'none') {
        const pv = sc.openingPreview();
        const need = pv.need;
        const best = Math.max(pv.points, 0);
        if (pv.pairCount >= need.pairs || pv.points >= need.sets) sc.setStatus(pv.pairCount >= need.pairs && pv.points < need.sets ? `Çift açabilirsin: ${pv.pairCount}/${need.pairs}` : `Açabilirsin: ${pv.points}/${need.sets}`, 'Aç’a bas ya da taşları düzenlemeye devam et', true);
        else sc.setStatus(`Açılış: ${best}/${need.sets}`, `Perleri boşlukla ayır · çift için ${pv.pairCount}/${need.pairs}`, true);
      } else sc.setStatus('Per işle ya da taş at', op === 'pairs' ? 'Çift açtın: çift indir, perlere taş işle' : 'Taşı seç, pere dokun · ya da sürükle', true);
    }
    actions.push({ id: 'sort', label: 'Diz', icon: 'sort', kind: 'ghost' });
    if (!is101 && !draw && caps.finishing.size) actions.push({ id: 'finish', label: 'Bitir', kind: 'primary' });
    if (!is101 && s.rules.mode === 'okey' && !s.firstActionTaken[0] && !s.shownIndicator[0]) {
      const ind = s.ctx.indicator;
      const twin = s.hands[0].some((t) => !isFake(t) && t !== ind && colorOf(t) === colorOf(ind) && valueOf(t) === valueOf(ind));
      if (twin) actions.push({ id: 'indicator', label: 'Göstergeyi göster', kind: '' });
    }
    if (is101 && !draw) {
      if (caps.sideUncommitted) actions.push({ id: 'return', label: 'Geri bırak', kind: '' });
      const op = s.opened[0];
      const pv = sc.openingPreview();
      if (op === 'none') {
        const ok = pv.points >= pv.need.sets || pv.pairCount >= pv.need.pairs;
        const useSets = pv.points >= pv.need.sets || pv.pairCount < pv.need.pairs;
        actions.push({ id: 'open', label: useSets ? `Aç ${pv.points}/${pv.need.sets}` : `Çift aç ${pv.pairCount}/${pv.need.pairs}`, kind: 'primary', disabled: !ok });
      } else if (op === 'sets' && pv.sets.length) actions.push({ id: 'meld', label: 'Per indir', kind: 'primary' });
      else if (op === 'pairs' && pv.pairs.length && s.opened.includes('pairs')) actions.push({ id: 'pairs', label: 'Çift indir', kind: 'primary' });
      if (op === 'sets' && s.opened.includes('pairs') && pv.pairs.length) actions.push({ id: 'pairs', label: 'Çift indir', kind: '' });
    }
    sc.setActions(actions);
  }

  // ───────────────────────────── düğme eylemleri ─────────────────────────────
  async action(id, el) {
    const sc = this.scene;
    switch (id) {
      case 'menu':
        this.ui.pauseMenu(this);
        break;
      case 'help':
        this.ui.howTo?.();
        break;
      case 'sound':
        this.settings.set('sfx', !this.settings.get('sfx'));
        sc.refreshSoundIcon();
        break;
      case 'sort':
        this.sortCycle();
        break;
      case 'hint':
        this.hint();
        break;
      case 'finish': {
        const caps = this.caps();
        const pick = sc.selected !== null && caps.finishing.has(sc.selected) ? sc.selected : [...caps.finishing].sort((a, b) => Number(isOkey(b, sc.ctx)) - Number(isOkey(a, sc.ctx)))[0];
        if (pick !== undefined) await this.intent({ type: 'finish', tile: pick });
        break;
      }
      case 'indicator': {
        const s = this.game.state;
        const ind = s.ctx.indicator;
        const twin = s.hands[0].find((t) => !isFake(t) && t !== ind && colorOf(t) === colorOf(ind) && valueOf(t) === valueOf(ind));
        if (twin !== undefined) await this.intent({ type: 'showIndicator', tile: twin });
        break;
      }
      case 'open':
        await this.intent({ type: 'open' });
        break;
      case 'meld':
        await this.intent({ type: 'meldMore' });
        break;
      case 'pairs':
        await this.intent({ type: 'layPairs' });
        break;
      case 'return':
        await this.intent({ type: 'returnSide' });
        break;
      default:
    }
  }

  openSortMenu(anchor) {
    this.closeSortMenu();
    const sc = this.scene;
    const menu = document.createElement('div');
    menu.className = 'popmenu';
    const items = [
      ['color', 'Renge göre'],
      ['number', 'Sayıya göre'],
      ['smart', 'Akıllı (perler)'],
      ['pairs', 'Çiftler'],
    ];
    menu.innerHTML = items.map(([k, l]) => `<button type="button" data-sort="${k}">${l}</button>`).join('');
    const r = anchor.getBoundingClientRect();
    menu.style.cssText = `position:absolute;z-index:75;right:${Math.max(8, innerWidth - r.right)}px;bottom:${innerHeight - r.top + 8}px`;
    sc.root.appendChild(menu);
    this._sortMenu = menu;
    const close = (e) => {
      if (e && menu.contains(e.target) && e.target.closest('[data-sort]')) {
        this.sort(e.target.closest('[data-sort]').dataset.sort);
      }
      this.closeSortMenu();
      document.removeEventListener('pointerdown', close, true);
    };
    setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
  }

  closeSortMenu() {
    this._sortMenu?.remove();
    this._sortMenu = null;
  }

  // "Diz": elin daha yakın olduğu dizilişi seçer — perler (çözücü) ya da çiftler. Dokunulmamış ıstakada
  // ikinci basış diğerine geçer; renk/sayı dizilişi uzun basma menüsünde kalır.
  sortCycle() {
    const sc = this.scene;
    const rules = this.game.state.rules;
    const ctx = sc.ctx;
    const tiles = sc.rack.tiles();
    const face = (t) => (isFake(t) ? { c: ctx.oc, v: ctx.ov } : { c: colorOf(t), v: valueOf(t) });
    const best = findBest(tiles, ctx, { wrapHigh: rules.mode === 'okey' ? true : !!rules.wrapHigh101, objective: rules.mode === 'okey101' ? 'points' : 'tiles' });
    const inMelds = best ? best.tiles : 0;
    let jokers = 0;
    const counts = new Map();
    for (const t of tiles) {
      if (isOkey(t, ctx)) {
        jokers++;
        continue;
      }
      const f = face(t);
      const k = f.c * 16 + f.v;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    let pairs = 0;
    let singles = 0;
    for (const n of counts.values()) {
      pairs += n >> 1;
      singles += n & 1;
    }
    pairs += Math.min(jokers, singles);
    const preferred = rules.mode === 'okey101' ? (pairs >= 5 && (!best || best.points < 101) ? 'pairs' : 'smart') : pairs * 2 > inMelds + 1 ? 'pairs' : 'smart';
    const mode = sc.rack.slots.join(',') === this._sortSig && this._sortMode ? (this._sortMode === 'smart' ? 'pairs' : 'smart') : preferred;
    this.sort(mode);
    this._sortMode = mode;
    this._sortSig = sc.rack.slots.join(',');
    sc.toast?.(mode === 'pairs' ? `${pairs} çift dizildi` : `Perler dizildi · ${inMelds} taş perde`, 'good', 1600);
  }

  sort(mode) {
    const sc = this.scene;
    const g = this.game;
    const slots = sc.rack.arrangement(mode, sc.ctx, g.state.rules);
    const before = sc.rack.slots.slice();
    sc.rack.apply(slots);
    sc.excluded.clear();
    sc.setHints([]);
    this.hintOn = false;
    // dalga: soldan sağa 14ms aralıkla
    const idx = new Map();
    slots.forEach((t, i) => t !== null && idx.set(t, i));
    sc.retarget(true, { spring: { k: 360, c: 29 }, stagger: (t) => (idx.get(t) ?? 0) * 12 });
    // yer değiştiren taşlar hafifçe kalkar, kayar ve yerine oturur (elle dizme hissi)
    if (!sc.sys.reduced) {
      slots.forEach((t, i) => {
        if (t === null || before[i] === t) return;
        const tg = sc.targetOf(t);
        if (!tg) return;
        const d = i * 12;
        sc.sys.to(t, { ...tg, h: 9, sc: 1.04 }, { spring: { k: 420, c: 30 }, delay: d });
        setTimeout(() => sc.sys.to(t, sc.targetOf(t) || tg, { spring: { k: 300, c: 24 } }), d + 190);
      });
    }
    this.audio.cascade('touch', 8, 0.035);
    setTimeout(() => this.audio.play('place'), 220);
    sc.onRackChanged();
    this.save();
    sc.toast({ color: 'Renge göre dizildi', number: 'Sayıya göre dizildi', smart: 'Perler bir araya getirildi', pairs: 'Çiftler yan yana' }[mode] + ' · tekrar bas: sonraki diziliş', '', 1500);
  }

  // Öneri: en iyi perleri vurgula; ikinci dokunuşta uygula (otomasyon oyuncuyu ele geçirmez)
  hint() {
    const sc = this.scene;
    const g = this.game;
    if (this.hintOn) {
      this.sort('smart');
      return;
    }
    const tiles = sc.rack.tiles();
    const res = findBest(tiles, sc.ctx, { wrapHigh: g.wrapHigh, objective: g.is101 ? 'points' : 'tiles' });
    if (!res || !res.groups.length) {
      sc.toast('Şimdilik per görünmüyor. Yeni taş bekle.', '', 1800);
      return;
    }
    const hint = new Set();
    for (const m of res.groups) for (const x of m.tiles) hint.add(x.t);
    sc.setHints(hint);
    this.hintOn = true;
    if (g.is101) {
      const need = g.openingRequirement();
      sc.toast(`${hint.size} taşla ${res.points} puanlık per var${g.state.opened[0] === 'none' ? ` (açılış ${need.sets})` : ''}`, '', 2600);
    } else sc.toast(`${hint.size} taş per oluşturabiliyor`, '', 2400);
    this.updateUI();
    clearTimeout(this._hintT);
    this._hintT = setTimeout(() => {
      if (this.hintOn) {
        this.hintOn = false;
        this.scene?.setHints([]);
        this.updateUI();
      }
    }, 9000);
  }

  // ───────────────────────────── insan niyetleri ─────────────────────────────
  // Geçersiz hamle geri bildirimi: ses + titreşim + taş sallanması/kırmızı parıltı + açıklayıcı uyarı
  reject(msg, tile, extra = {}) {
    const sc = this.scene;
    const s = this.game.state;
    this.audio.play('invalid');
    if (this.settings.get('haptics') !== false) navigator.vibrate?.([28, 40, 28]);
    if (msg) sc.toast(msg, 'warn', 2800);
    const marks = new Set();
    const t = tile ?? sc.selected;
    if (t !== null && t !== undefined) marks.add(t);
    // yandan alınan taş kullanılmadıysa: o taşı ve "Geri bırak"ı göster
    if (/Yandan/.test(msg || '') && s.turn.sideTile !== null && s.turn.sideTile !== undefined) {
      marks.add(s.turn.sideTile);
      const btn = sc.els.actions.querySelector('[data-act="return"]');
      btn?.classList.remove('is-nudge');
      void btn?.offsetWidth;
      btn?.classList.add('is-nudge');
    }
    if (extra.badGroup) for (const x of extra.badGroup.tiles || []) marks.add(x.t ?? x);
    for (const id of marks) {
      const sp = sc.sys.get(id);
      if (!sp) continue;
      sp.el.classList.remove('is-invalid');
      void sp.el.offsetWidth;
      sp.el.classList.add('is-invalid');
      setTimeout(() => sp.el.classList.remove('is-invalid'), 900);
    }
    const bar = sc.els.status;
    bar.classList.remove('is-shake');
    void bar.offsetWidth;
    bar.classList.add('is-shake');
  }

  async intent(i) {
    if (i.type === 'history') return this.ui.discardHistory?.(this, i.seat), true;
    if (i.type === 'inspectMeld') {
      const m = this.scene.disp?.melds.find((x) => x.id === i.meldId);
      if (m) this.scene.meldLens(m.owner);
      return true;
    }
    if (!this.myTurn) return false;
    const g = this.game;
    const s = g.state;
    const sc = this.scene;
    let action = null;
    switch (i.type) {
      case 'drawStock':
        if (!s.turn.needsDraw) {
          this.reject('Bu tur zaten taş aldın.');
          return false;
        }
        action = { type: 'DRAW_STOCK' };
        break;
      case 'takeSide':
        if (!s.turn.needsDraw) return false;
        if (g.sideTile(0) === null) {
          this.reject('Soldaki oyuncunun alınabilir taşı yok.');
          return false;
        }
        action = { type: 'TAKE_SIDE' };
        break;
      case 'discard':
      case 'finish': {
        if (s.turn.needsDraw) {
          this.reject('Önce bir taş çekmelisin.', i.tile);
          return false;
        }
        const last101 = g.is101 && s.hands[0].length === 1 && s.opened[0] !== 'none';
        action = { type: i.type === 'finish' || last101 ? 'FINISH' : 'DISCARD', tile: i.tile };
        break;
      }
      case 'showIndicator':
        action = { type: 'SHOW_INDICATOR', tile: i.tile };
        break;
      case 'open': {
        const pv = sc.openingPreview();
        if (!pv) return false;
        const useSets = pv.points >= pv.need.sets || pv.pairCount < pv.need.pairs;
        const groups = useSets ? pv.sets.map((x) => ({ kind: x.kind, tiles: x.tiles })) : pv.pairs;
        action = { type: 'OPEN', groups };
        break;
      }
      case 'meldMore': {
        const pv = sc.openingPreview();
        action = { type: 'OPEN', groups: pv.sets.map((x) => ({ kind: x.kind, tiles: x.tiles })) };
        break;
      }
      case 'layPairs': {
        const pv = sc.openingPreview();
        const first = pv.pairs[0];
        if (!first) return false;
        action = { type: 'LAY_PAIR', tiles: first.tiles };
        break;
      }
      case 'layoff':
        action = { type: 'LAYOFF', meldId: i.meldId, tile: i.tile, end: i.end };
        break;
      case 'returnSide':
        action = { type: 'RETURN_SIDE' };
        break;
      default:
        return false;
    }
    const res = g.apply(0, action);
    if (!res.ok) {
      if (res.events.length) await this.choreo.playEvents(res.events);
      this.reject(res.error, i.tile, res);
      return false;
    }
    this.busy = true;
    if (i.type !== 'history') {
      sc.setSelected(null);
      if (this.hintOn) {
        this.hintOn = false;
        sc.setHints([]);
      }
    }
    sc.excluded.clear();
    this.afterHumanEvents(res.events);
    const token = this.token;
    await this.choreo.playEvents(res.events);
    if (token !== this.token) return true;
    this.busy = false;
    // çoklu per indirme: çift/per işleme sonrası yeniden tur kontrolü
    this.save();
    await this.advance();
    return true;
  }

  afterHumanEvents(events) {
    for (const ev of events) {
      if (ev.type === 'penalty' && ev.seat === 0) this.matchStats.penalties0++;
      if (ev.type === 'open' && ev.seat === 0 && !ev.additional && this.game.is101) this.profile.record({ type: 'open101' });
      if (ev.type === 'indicator' && ev.seat === 0) this.profile.record({ type: 'indicator' });
      if (ev.type === 'draw' && ev.seat === 0) this.coachAfterDraw(ev.tile);
    }
  }

  // ───────────────────────────── tur akışı ─────────────────────────────
  async advance() {
    const token = this.token;
    for (let guard = 0; guard < 500; guard++) {
      if (token !== this.token || !this.game) return;
      const s = this.game.state;
      if (s.status !== 'playing') {
        await this.onRoundEnd();
        return;
      }
      if (s.turn.seat === 0) {
        this.enterHumanTurn();
        return;
      }
      if (this._degradeLater) {
        this._degradeLater = false;
        this.onSlowFrames(0);
      }
      await this.botTurn(s.turn.seat, token);
    }
  }

  enterHumanTurn() {
    const sc = this.scene;
    this.updateUI();
    sc._turnLight(0);
    if (this._cueTurn !== this.game.state.turn) {
      this._cueTurn = this.game.state.turn;
      sc.cue('SIRA SENDE', this.game.state.turn.needsDraw ? 'Taş çek' : '');
    }
    this.coachTurn();
  }

  botStatusFor(ev, name) {
    switch (ev.type) {
      case 'draw':
        return 'ortadan çekti';
      case 'take':
        return 'yandan aldı';
      case 'open':
        return ev.openKind === 'pairs' ? 'çift açtı' : ev.additional ? 'per indirdi' : `açtı · ${ev.points}`;
      case 'layoff':
        return 'taş işledi';
      case 'pair':
        return 'çift indirdi';
      case 'reclaim':
        return 'okeyi aldı';
      case 'return':
        return 'taşı geri bıraktı';
      default:
        return null;
    }
  }

  async botTurn(seat, token) {
    const sc = this.scene;
    const bot = this.bots?.[seat] || this.ensureBots()[seat];
    const sv = sc.seats[seat];
    this.busy = true;
    sc.disp.turn = seat;
    sc.refreshChrome();
    this.updateUI();
    sv.setStatus('', { thinking: true });
    const think = bot.thinkTime(1);
    let steps = 0;
    let drawn = null;
    while (token === this.token) {
      const view = this.game.view(seat);
      let action = bot.nextAction(view);
      if (!action) break;
      await this.choreo.sleep(this._botPause(action, steps, think, drawn));
      if (token !== this.token) return;
      let res = this.game.apply(seat, action);
      if (!res.ok) {
        this.botRejects = (this.botRejects || 0) + 1;
        action = bot.safeAction(this.game.view(seat));
        res = this.game.apply(seat, action);
        if (!res.ok) break;
      }
      for (const ev of res.events) {
        if ((ev.type === 'draw' || ev.type === 'take') && ev.seat === seat) drawn = ev.tile;
        const t = this.botStatusFor(ev);
        if (t) sv.setStatus(t, { good: ev.type === 'open' });
        if (ev.type === 'penalty' && ev.seat === 0) this.matchStats.penalties0++;
      }
      this.lastActionText = this.describeEvents(seat, res.events);
      await this.choreo.playEvents(res.events);
      if (token !== this.token) return;
      const s = this.game.state;
      if (s.status !== 'playing' || s.turn.seat !== seat) break;
      steps++;
      if (steps > 60) break;
    }
    if (token === this.token) {
      sv.setStatus('');
      this.busy = false;
    }
  }

  // İnsan temposu: kısa bakıp çeker; çektiği işe yaramıyorsa hemen geri atar, elden atacaksa düşünür;
  // açmadan ve bitirmeden önce bir an durur. think: botun zorluğuna göre bu sıra için düşünme süresi (ms).
  _botPause(action, steps, think, drawn) {
    if (steps === 0) return think * (action.type === 'TAKE_SIDE' ? 0.6 : 0.42);
    if (action.type === 'DISCARD') return think * (action.tile === drawn ? 0.32 : 0.78);
    if (action.type === 'FINISH' || action.type === 'OPEN') return think * 1.05;
    return 300 + 110 * Math.min(steps, 3);
  }

  ensureBots() {
    const seed = this.game.state.seed;
    this.bots = this.roster.map((r, i) => (i === 0 ? null : new Bot(i, r.difficulty, mixSeed(seed, i))));
    return this.bots;
  }

  describeEvents(seat, events) {
    const name = this.roster[seat].name;
    const last = events.filter((e) => ['draw', 'take', 'discard', 'finishDiscard', 'open', 'layoff', 'pair', 'reclaim', 'return'].includes(e.type)).pop();
    if (!last) return '';
    const m = {
      draw: 'ortadan çekti',
      take: 'yandan aldı',
      discard: `attı: ${tileLabel(last.tile, this.game.ctx)}`,
      finishDiscard: 'eli bitirdi',
      open: 'açtı',
      layoff: 'taş işledi',
      pair: 'çift indirdi',
      reclaim: 'okeyi aldı',
      return: 'taşı geri bıraktı',
    };
    return `${name} ${m[last.type]}`;
  }

  // ───────────────────────────── el sonu / maç sonu ─────────────────────────────
  async onRoundEnd() {
    const token = this.token;
    const sc = this.scene;
    const g = this.game;
    const res = g.state.result;
    this.busy = true;
    sc.setActions([]);
    sc.setCapabilities({});
    res.finishLabel = res.finish ? FINISH_LABEL[res.finish] : '';
    for (const s of [1, 2, 3]) {
      sc.seats[s].setActive(false);
      sc.seats[s].setStatus('');
    }
    sc.setStatus(res.winner === 0 ? 'Eli kazandın!' : res.winner === null ? 'El bitti' : `${this.roster[res.winner].name} bitirdi`, res.finishLabel, res.winner === 0);
    await this.choreo.finishSequence(res);
    if (token !== this.token) return;
    // ilerleme
    const won = res.winner === 0;
    const difficulty = this.cfg.difficulty === 'mixed' ? 'normal' : this.cfg.difficulty;
    const colorFinish = !!(g.state.rules.colorFinish && res.multiplier === 2 && won && !g.is101);
    const info = [this.profile.record({ type: 'round', mode: g.state.rules.mode, won, finish: res.finish, difficulty, colorFinish })];
    const matchOver = g.state.status === 'matchOver';
    let winnerSeat = null;
    if (matchOver) {
      const scores = g.state.scores;
      winnerSeat = g.is101 ? scores.indexOf(Math.min(...scores)) : scores.indexOf(Math.max(...scores));
      const mwon = winnerSeat === 0;
      info.push(this.profile.record({ type: 'match', mode: g.state.rules.mode, won: mwon, difficulty, clean: this.matchStats.penalties0 === 0 }));
      clearSavedGame();
    } else this.save();
    const merged = this.mergeInfo(info);
    await this.ui.roundResult({
      controller: this,
      game: g,
      roster: this.roster,
      result: res,
      xp: merged,
      matchOver,
      winnerSeat,
      onNext: async () => {
        if (matchOver) return;
        this.busy = true;
        this.scene.clearReveal();
        const r = g.apply(0, { type: 'NEXT_ROUND' });
        if (!r.ok) return;
        this.save();
        this.bots = null;
        await this._mountNextRound();
      },
      onAgain: () => this.ui.restart(this.cfg),
      onMenu: () => this.onExit?.(),
    });
  }

  mergeInfo(list) {
    const out = { xp: 0, from: list[0]?.from ?? this.profile.d.xp, parts: [], levelUps: [], achievements: [], goalsDone: [] };
    const parts = new Map();
    for (const x of list) {
      for (const [label, v] of x.parts || []) parts.set(label, (parts.get(label) || 0) + v);
      out.xp += x.xp;
      out.levelUps.push(...x.levelUps);
      out.achievements.push(...x.achievements);
      out.goalsDone.push(...x.goalsDone);
    }
    out.parts = [...parts];
    return out;
  }

  async _mountNextRound() {
    const token = ++this.token;
    const sc = this.scene;
    sc.clearReveal();
    this.fx.confetti.clear();
    sc.els.coach.innerHTML = '';
    sc.setGame(this.game, { roster: this.roster });
    sc.root.addEventListener('pointerdown', this.skipIntro, { capture: true });
    await this.choreo.intro();
    sc.root.removeEventListener('pointerdown', this.skipIntro, { capture: true });
    if (token !== this.token) return;
    this.choreo.resumeNormal();
    this.busy = false;
    this.stats.penalties0 = 0;
    await this.advance();
  }

  // ───────────────────────────── kayıt ─────────────────────────────
  save() {
    if (!this.game || !this.scene) return;
    const s = this.game.state;
    if (s.status === 'matchOver') return;
    writeJSON(SAVE_KEY, { v: 1, when: Date.now(), cfg: this.cfg, roster: this.roster, matchStats: this.matchStats, state: this.game.snapshot(), rack: this.scene.rack.serialize(), difficulty: this.cfg.difficulty });
  }

  // ───────────────────────────── bağlamsal öğretim (coach) ─────────────────────────────
  coachStart() {
    this.ui.coach?.attach?.(this);
    this.ui.coach?.notify?.('gameStart', this);
  }
  coachTurn() {
    this.ui.coach?.notify?.('turn', this);
  }
  coachAfterDraw(tile) {
    this.ui.coach?.notify?.('draw', this, tile);
  }
}
