// Choreo — oyun olaylarını (engine events) sprite hareketlerine, seslere ve efektlere çevirir.
// Olaylar sırayla oynanır (await); `skipAll()` bekleyen her şeyi hemen bitirir (intro geç / hızlı ilerle).

import { extendMeld, reclaimJoker } from '../game/melds.js';
import { packMelds } from './meld-layout.js';
import { SPRING } from './sprites.js';
import { COLOR_TR } from '../game/tiles.js';
import { COLORS } from '../game/tiles.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

export class Choreo {
  constructor(scene, audio, settings, fx) {
    this.scene = scene;
    this.audio = audio;
    this.settings = settings;
    this.fx = fx; // { camera, confetti }
    this.timers = new Set();
    this.waiters = new Set();
    this.skipping = false;
  }

  get k() {
    if (this.scene.sys.reduced) return 0.35;
    return { slow: 1.3, normal: 1, fast: 0.62 }[this.settings.get('botSpeed')] ?? 1;
  }

  sleep(ms) {
    if (this.skipping) return Promise.resolve();
    return new Promise((res) => {
      const w = () => {
        this.waiters.delete(w);
        res();
      };
      const id = setTimeout(() => {
        this.timers.delete(id);
        w();
      }, ms * this.k);
      this.timers.add(id);
      this.waiters.add(w);
    });
  }

  // Gecikmeli adım: atlanırsa (skipAll) hemen çalışır — durum (ıstaka içeriği) hiçbir zaman eksik kalmaz
  later(fn, ms) {
    if (this.skipping || !ms) return fn();
    this.laters = this.laters || new Map();
    const id = setTimeout(() => {
      this.laters.delete(id);
      fn();
    }, ms);
    this.laters.set(id, fn);
  }

  skipAll() {
    this.skipping = true;
    if (this.laters) {
      const fns = [...this.laters.entries()];
      this.laters.clear();
      for (const [id, fn] of fns) {
        clearTimeout(id);
        fn();
      }
    }
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    for (const w of [...this.waiters]) w();
    this.scene.sys.snapAll();
  }
  resumeNormal() {
    this.skipping = false;
  }

  get sc() {
    return this.scene;
  }

  seatAnchor(seat) {
    const L = this.sc.L;
    if (seat === 0) return { x: L.rack.rect.x + L.rack.rect.w / 2, y: L.rack.rect.y + L.rack.rect.h / 2 };
    if (L.seats[seat].anchor) return L.seats[seat].anchor;
    const p = L.seats[seat].panel;
    return seat === 2 ? { x: p.x + p.w * 0.72, y: p.y + p.h * 0.62 } : { x: p.x + p.w / 2, y: p.y + p.h - 16 };
  }

  stockPos() {
    const s = this.sc.L.stock;
    return { x: s.cx, y: s.cy };
  }

  // ───────────────────────────── olay dağıtımı ─────────────────────────────
  async playEvents(events) {
    for (const ev of events) await this.playEvent(ev);
  }

  async playEvent(ev) {
    switch (ev.type) {
      case 'draw':
        return this.onDraw(ev);
      case 'take':
        return this.onTake(ev);
      case 'return':
        return this.onReturn(ev);
      case 'discard':
        return this.onDiscard(ev, false);
      case 'finishDiscard':
        return this.onDiscard(ev, true);
      case 'open':
        return this.onOpen(ev);
      case 'layoff':
        return this.onLayoff(ev);
      case 'pair':
        return this.onPair(ev);
      case 'reclaim':
        return this.onReclaim(ev);
      case 'indicator':
        return this.onIndicator(ev);
      case 'penalty':
        return this.onPenalty(ev);
      case 'turn':
        return this.onTurn(ev);
      default:
        return undefined;
    }
  }

  // ───────────────────────────── çekme / alma ─────────────────────────────
  async onDraw(ev) {
    const sc = this.sc;
    const d = sc.disp;
    d.stock = Math.max(0, d.stock - 1);
    if (ev.seat === 0) {
      const t = ev.tile;
      sc.rack.addAuto(t);
      d.counts[0]++;
      const sp = sc.ensure(t);
      sp.z = 140;
      const tg = sc.targetOf(t);
      this.audio.play('draw');
      const sk = sc.L.stock;
      if (sk) sc.pulseSource(sk.cx, sk.cy, Math.max(sk.w || 50, sk.h || 50) * 0.7);
      sc.sys.fly(t, tg, {
        dur: 400,
        arc: 30,
        bounce: 3.5,
        onLand: () => {
          this.audio.play('place');
          sc.markNew(t);
          sc.onRackChanged();
        },
      });
      sc.refreshChrome();
      await this.sleep(320);
    } else {
      const a = this.seatAnchor(ev.seat);
      this.audio.play('draw', { vol: 0.55 });
      await this.ghostFlight(this.stockPos(), a, {
        flip0: 180,
        flip1: 180,
        sc0: sc.L.scale.stock,
        sc1: 0.4,
        dur: 340,
        arc: 22,
        onLand: () => {
          d.counts[ev.seat]++;
          sc.seats[ev.seat].setCount(d.counts[ev.seat]);
          sc.seats[ev.seat].pop();
        },
      });
      sc.refreshChrome();
      await this.sleep(120);
    }
  }

  async ghostFlight(from, to, o) {
    const sc = this.sc;
    const { id, s } = sc.ghost();
    sc.sys.snap(id, { x: from.x, y: from.y, sc: o.sc0 ?? 0.6, flip: o.flip0 ?? 180, rot: 0, z: 130, h: 0 });
    s.placed = true;
    sc.sys.fly(id, { x: to.x, y: to.y, sc: o.sc1 ?? 0.4, flip: o.flip1 ?? 180, rot: rnd(-6, 6), z: 130, h: 0 }, {
      dur: o.dur ?? 340,
      arc: o.arc ?? 20,
      bounce: 0,
      delay: o.delay || 0,
      onLand: () => {
        o.onLand?.();
        sc.dropSprite(id);
      },
    });
    await this.sleep((o.dur ?? 340) * 0.6 + (o.delay || 0));
  }

  async onTake(ev) {
    const sc = this.sc;
    const d = sc.disp;
    const arr = d.piles[ev.from];
    const i = arr.lastIndexOf(ev.tile);
    if (i >= 0) arr.splice(i, 1);
    this.audio.play('draw', { vol: ev.seat === 0 ? 1 : 0.6 });
    const tp = sc.L.piles[ev.from];
    if (tp) sc.pulseSource(tp.cx, tp.cy, Math.max(tp.w, tp.h) * 0.6);
    if (ev.seat === 0) {
      const t = ev.tile;
      sc.rack.addAuto(t);
      d.counts[0]++;
      const sp = sc.ensure(t);
      sp.z = 140;
      const tg = sc.targetOf(t);
      sc.sys.fly(t, tg, {
        dur: 380,
        arc: 26,
        bounce: 3,
        onLand: () => {
          this.audio.play('place');
          sc.markNew(t);
          sc.onRackChanged();
        },
      });
      sc.retarget(true);
      sc.refreshChrome();
      await this.sleep(320);
    } else {
      const sp = sc.ensure(ev.tile);
      const a = this.seatAnchor(ev.seat);
      sp.z = 140;
      sc.sys.fly(ev.tile, { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: 0, h: 0, z: 140 }, {
        dur: 380,
        arc: 24,
        bounce: 0,
        onLand: () => {
          d.counts[ev.seat]++;
          sc.seats[ev.seat].setCount(d.counts[ev.seat]);
          sc.seats[ev.seat].pop();
          sc.dropSprite(ev.tile);
        },
      });
      sc.retarget(true);
      sc.refreshChrome();
      await this.sleep(300);
    }
  }

  async onReturn(ev) {
    const sc = this.sc;
    const d = sc.disp;
    const t = ev.tile;
    d.piles[ev.to].push(t);
    if (ev.seat === 0) {
      sc.rack.remove(t);
      d.counts[0]--;
      const tg = sc.targetOf(t);
      sc.sys.fly(t, tg, { dur: 340, arc: 22, bounce: 3, onLand: () => this.audio.play('place', { vol: 0.8 }) });
      sc.onRackChanged();
    } else {
      const sp = sc.ensure(t);
      const a = this.seatAnchor(ev.seat);
      sc.sys.snap(t, { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: 0, z: 140, h: 0 });
      d.counts[ev.seat]--;
      sc.sys.fly(t, sc.targetOf(t), { dur: 360, arc: 22, bounce: 3 });
    }
    sc.retarget(true);
    sc.refreshChrome();
    await this.sleep(260);
  }

  // ───────────────────────────── atma ─────────────────────────────
  async onDiscard(ev, finish) {
    const sc = this.sc;
    const d = sc.disp;
    const t = ev.tile;
    const seat = ev.seat;
    let dur = 420;
    if (seat === 0) {
      sc.rack.remove(t);
      d.counts[0]--;
      if (sc.selected === t) sc.selected = null;
      sc.dragLeft?.(t);
    } else {
      const sp = sc.ensure(t);
      const a = this.seatAnchor(seat);
      sc.sys.snap(t, { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: 0, z: 150, h: 0 });
      d.counts[seat]--;
      sc.seats[seat].setCount(d.counts[seat]);
    }
    d.piles[seat].push(t);
    const sp = sc.sys.get(t);
    sp.z = 160;
    const tg = sc.targetOf(t);
    tg.z = 160;
    const dist = Math.hypot(tg.x - sp.x, tg.y - sp.y);
    dur = clamp(240 + dist * 0.45, 300, 560);
    sc.sys.fly(t, { ...tg, h: 0 }, {
      dur,
      arc: clamp(dist * 0.16, 12, 52),
      bounce: finish ? 6 : 4.5,
      spin: rnd(-10, 10),
      onLand: () => {
        this.audio.play(finish ? 'finish' : 'discard', { vol: seat === 0 ? 1 : 0.85 });
        if (finish) this.fx.camera.play('punch');
        sc.retarget(true);
        sc.pulsePile(seat, finish);
        if (finish) sc.stage?.lampFlash('gold', 0.8, 700);
        sc.onRackChanged();
      },
    });
    sc.retarget(true);
    sc.refreshChrome();
    if (ev.penalized) {
      this.fx.camera.play('shake');
      sc.flash('red', 460);
    }
    await this.sleep(dur * 0.72);
  }

  // ───────────────────────────── 101: açma / işleme / çift / okey al ─────────────────────────────
  // Taşları perlerine uçur. Benim taşlarım önce ıstakadan kalkar (seçildiklerini gösterir), sonra per per akar;
  // her per tamamlanınca çerçevesi altın parlar ve tık sesi gelir.
  async _flyTilesToMelds(seat, tiles, baseDelay = 0, groups = null) {
    const sc = this.sc;
    const k = this.k;
    let lift = 0;
    if (seat === 0 && tiles.length > 1) {
      tiles.forEach((t, i) => {
        const sp = sc.sys.get(t);
        if (!sp) return;
        sc.sys.to(t, { x: sp.x, y: sp.y - sc.L.rack.th * 0.35, h: 12, sc: 1.06 }, { spring: SPRING.snappy, delay: i * 18 * k });
      });
      this.audio.cascade?.('touch', Math.min(tiles.length, 6), 0.03, { vol: 0.7 });
      lift = 260 + tiles.length * 18;
    }
    const gs = groups || [tiles];
    let t = baseDelay + lift;
    const step = gs.length > 1 ? 42 : 30;
    gs.forEach((grp, gi) => {
      grp.forEach((tile, i) => {
        let sp = sc.sys.get(tile);
        if (seat !== 0 || !sp) {
          sp = sc.ensure(tile);
          const a = this.seatAnchor(seat);
          sc.sys.snap(tile, { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: 0, z: 150, h: 0 });
          sp.placed = true;
        }
        sc._applyFace(tile, sp);
        const tg = sc.targetOf(tile);
        if (!tg) return;
        sp.z = 150 + i;
        sc.sys.fly(tile, { ...tg, z: tg.z }, { delay: (t + i * step) * k, dur: 400 * k, arc: 30, bounce: 2.5, spin: rnd(-8, 8) });
      });
      const land = t + (grp.length - 1) * step + 400;
      const it = sc.packed?.items.find((x) => x.tiles.some((y) => y.t === grp[0]));
      this.later(() => {
        this.audio.play('meld', { vol: 0.8 });
        if (it) sc.stage?.flashRect({ x: it.rect.x - 3, y: it.rect.y - 3, w: it.rect.w + 6, h: it.rect.h + 6 }, { color: 'rgb(255,214,120)', dur: 700, grow: 0.08 });
      }, land * k);
      t += grp.length * step + 90;
    });
    return t + 400;
  }

  async onOpen(ev) {
    const sc = this.sc;
    const d = sc.disp;
    const tiles = [];
    const groups = [];
    for (const m of ev.melds) {
      d.melds.push(structuredClone(m));
      groups.push(m.tiles.map((x) => x.t));
      for (const x of m.tiles) tiles.push(x.t);
    }
    if (ev.seat === 0) {
      for (const t of tiles) sc.rack.remove(t);
      d.counts[0] -= tiles.length;
    } else {
      d.counts[ev.seat] -= tiles.length;
      sc.seats[ev.seat].setCount(d.counts[ev.seat]);
    }
    d.opened[ev.seat] = ev.additional ? d.opened[ev.seat] : ev.openKind;
    sc._packMelds();
    this.audio.play('open');
    const name = ev.seat === 0 ? 'Sen' : sc.cfg.roster[ev.seat].name;
    if (!ev.additional) {
      sc.stage?.cine(0.45);
      sc.toast(`${name} ${ev.openKind === 'pairs' ? `${ev.count} çift` : `${ev.points} puanla`} açtı`, 'good', 2200);
    }
    const total = await this._flyTilesToMelds(ev.seat, tiles, 0, groups);
    sc.retarget(true);
    sc.refreshChrome();
    sc.onRackChanged();
    sc.seats[ev.seat]?.setStatus(ev.openKind === 'pairs' ? 'çift açtı' : ev.additional ? 'per indirdi' : `açtı · ${ev.points}`, { good: true });
    await this.sleep(total * 0.72);
    sc.flashZone(ev.seat);
    if (!ev.additional) {
      // açılış anı: bölge sahibinin renginde parlar, puan bölgenin üstünden yükselir, lamba bir an güçlenir
      this.fx.camera.play('punch');
      sc.stage?.lampFlash('gold', 0.45, 650);
      const z = (sc.packed?.zones || []).find((x) => x.owner === ev.seat);
      if (z) sc.floatText(ev.openKind === 'pairs' ? `${ev.count} ÇİFT` : `+${ev.points}`, z.rect.x + z.rect.w / 2, z.rect.y + z.rect.h * 0.45, 'good');
      sc.countZone?.(ev.seat);
      sc.stage?.cine(0);
      if (ev.seat !== 0) this.later(() => sc.meldLens(ev.seat, { auto: true, mark: tiles }), 380);
    }
    await this.sleep(320);
  }

  async onLayoff(ev) {
    const sc = this.sc;
    const d = sc.disp;
    const m = d.melds.find((x) => x.id === ev.meldId);
    const wrap = sc.game.wrapHigh;
    const r = extendMeld(m, ev.tile, sc.ctx, { wrapHigh: wrap, end: ev.end });
    if (r.ok) {
      m.tiles = r.meld.tiles;
      if (r.meld.start !== undefined) m.start = r.meld.start;
    }
    if (ev.seat === 0) {
      sc.rack.remove(ev.tile);
      d.counts[0]--;
    } else {
      d.counts[ev.seat]--;
      sc.seats[ev.seat].setCount(d.counts[ev.seat]);
    }
    sc._packMelds();
    this.audio.play('meld');
    const total = await this._flyTilesToMelds(ev.seat, [ev.tile]);
    sc.retarget(true);
    sc.refreshChrome();
    sc.onRackChanged();
    const tgt = sc.targetOf(ev.tile);
    if (tgt) sc.stage?.ping(tgt.x, tgt.y, { r: (sc.L.rack.tw || 40) * 1.1, color: 'rgb(150,230,190)', dur: 640, s0: 0.5, s1: 1.6, delay: total * 0.6 });
    await this.sleep(total * 0.7);
  }

  async onPair(ev) {
    const sc = this.sc;
    const d = sc.disp;
    d.melds.push(structuredClone(ev.meld));
    const tiles = ev.meld.tiles.map((x) => x.t);
    if (ev.seat === 0) {
      for (const t of tiles) sc.rack.remove(t);
      d.counts[0] -= tiles.length;
    } else {
      d.counts[ev.seat] -= tiles.length;
      sc.seats[ev.seat].setCount(d.counts[ev.seat]);
    }
    sc._packMelds();
    this.audio.play('meld');
    const total = await this._flyTilesToMelds(ev.seat, tiles);
    sc.retarget(true);
    sc.refreshChrome();
    sc.onRackChanged();
    sc.flashZone(ev.seat);
    await this.sleep(total * 0.7);
  }

  async onReclaim(ev) {
    const sc = this.sc;
    const d = sc.disp;
    const m = d.melds.find((x) => x.id === ev.meldId);
    const r = reclaimJoker(m, ev.joker, ev.replacement, sc.ctx);
    if (r.ok) m.tiles = r.meld.tiles;
    // okey artık oyuncunun elinde
    if (ev.seat === 0) {
      sc.rack.remove(ev.replacement);
      sc.rack.addAuto(ev.joker);
    } else {
      const a = this.seatAnchor(ev.seat);
      sc.sys.snap(ev.replacement, { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: 0, z: 150, h: 0 });
    }
    sc._packMelds();
    sc._applyFace(ev.joker, sc.sys.get(ev.joker) || sc.ensure(ev.joker));
    this.audio.play('okey');
    const repl = sc.sys.get(ev.replacement) || sc.ensure(ev.replacement);
    sc._applyFace(ev.replacement, repl);
    const tg = sc.targetOf(ev.replacement);
    if (tg) sc.sys.fly(ev.replacement, tg, { dur: 380, arc: 24, bounce: 2 });
    const jp = sc.sys.get(ev.joker);
    const jt = sc.targetOf(ev.joker);
    if (jp && jt) {
      jp.z = 160;
      sc.sys.fly(ev.joker, jt, { dur: 420, arc: 34, bounce: 3 });
    }
    sc.retarget(true);
    sc.refreshChrome();
    sc.onRackChanged();
    await this.sleep(420);
  }

  // ───────────────────────────── gösterge göstermek / ceza / sıra ─────────────────────────────
  async onIndicator(ev) {
    const sc = this.sc;
    this.audio.play('okey');
    const name = ev.seat === 0 ? 'Sen' : sc.cfg.roster[ev.seat].name;
    sc.toast(`${name} göstergeyi gösterdi · diğerlerinden −1`, 'good', 2200);
    if (ev.seat === 0) {
      const sp = sc.sys.get(ev.tile);
      const tg = sc.targetOf(ev.tile);
      if (sp && tg) sc.sys.fly(ev.tile, tg, { dur: 420, arc: 40, bounce: 4 });
    }
    sc.disp.scores = sc.game.state.scores.slice();
    sc.refreshChrome();
    await this.sleep(420);
  }

  async onPenalty(ev) {
    const sc = this.sc;
    const name = ev.seat === 0 ? 'Sen' : sc.cfg.roster[ev.seat].name;
    this.audio.play('penalty');
    sc.toast(`${name}: +${ev.points} ceza · ${ev.reason}`, 'warn', 2600);
    this.fx.camera.play('slam');
    sc.flash('red', 620);
    sc.stage?.lampFlash('red', 0.5, 640);
    sc.flashSeat(ev.seat, 'rgb(255,96,80)');
    sc.stamp(`CEZA +${ev.points}`, `${name} · ${ev.reason}`, 'penalty', 1900);
    const a = this.seatAnchor(ev.seat);
    sc.floatText(`+${ev.points}`, a.x, a.y, 'warn');
    sc.seats[ev.seat]?.hit?.();
    await this.sleep(520);
  }

  async onTurn(ev) {
    const sc = this.sc;
    sc.disp.turn = ev.seat;
    sc.refreshChrome();
    if (ev.seat === 0) {
      this.audio.play('myTurn');
      if (this.settings.get('haptics')) navigator.vibrate?.(14);
    }
    else this.audio.play('turn', { vol: 0.7 });
  }

  // ───────────────────────────── dağıtım intro'su ─────────────────────────────
  async intro() {
    const sc = this.sc;
    const g = sc.game.state;
    const L = sc.L;
    this.skipping = false;
    sc.disp = {
      piles: [[], [], [], []],
      counts: [0, 0, 0, 0],
      stock: g.stock.length + g.hands.reduce((a, h) => a + h.length, 0) + 1,
      melds: [],
      opened: g.opened.slice(),
      scores: g.scores.slice(),
      turn: g.turn.seat,
      indicatorTile: null,
    };
    sc.rack.clear();
    sc.sys.clear();
    sc.ghostN = 0;
    sc.refreshChrome();
    sc.setCapabilities({});
    for (const s of [1, 2, 3]) {
      sc.seats[s].setStatus('');
      sc.seats[s].setActive(false);
    }
    sc.setStatus('Masa kuruluyor…', `${sc.cfg.roster[g.starter]?.name ?? ''}`, false);
    sc.setActions([]);
    sc.els.actionbar.style.opacity = '0';
    this.fx.camera.play('intro');
    sc.root.classList.add('is-intro');

    // 1) yıkama: kapalı taşlar masanın ortasına saçılır, avuçla dairesel karıştırılır
    const st = this.stockPos();
    const k = this.k;
    const MA = L.meldArea;
    const cx = MA.x + MA.w / 2;
    const cy = MA.y + MA.h / 2;
    const R0 = Math.min(MA.w * 0.42, 200);
    const mine = g.hands[0].slice();
    const counts = g.hands.map((h) => h.length);
    const PACKS = g.rules.mode === 'okey101' ? 4 : 3; // kişi başı istif
    const order = [1, 2, 3, 0];
    const nStacks = PACKS * 4;
    const N = nStacks * 5;
    const ghosts = [];
    for (let i = 0; i < N; i++) {
      const { id, s } = sc.ghost();
      sc.sys.snap(id, { x: st.x + rnd(-3, 3), y: st.y + rnd(-3, 3), sc: L.scale.stock, flip: 180, rot: rnd(-6, 6), z: 100 + (i % 20), h: 0 });
      s.placed = true;
      ghosts.push({ id, a: (i / N) * Math.PI * 2 + rnd(-0.25, 0.25), r: R0 * (0.25 + Math.random() * 0.75) });
    }
    await this.sleep(100);
    this.audio.play('shuffle');
    const ell = (r) => Math.min(r * 0.52, MA.h * 0.44);
    ghosts.forEach((g2, i) => sc.sys.fly(g2.id, { x: cx + Math.cos(g2.a) * g2.r, y: cy + Math.sin(g2.a) * ell(g2.r), sc: L.scale.stock, flip: 180, rot: rnd(-90, 90), z: 100 + (i % 20), h: 0 }, { dur: 420 * k, delay: (i % 30) * 8 * k, arc: 18, bounce: 0 }));
    await this.sleep(520 * k);
    for (let step = 1; step <= 6; step++) {
      ghosts.forEach((g2, i) => {
        const ang = g2.a + step * 0.85 * (i % 2 ? 1 : -0.75);
        const rr = g2.r * (step % 2 ? 0.78 : 1.06);
        sc.sys.to(g2.id, { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * ell(rr), rot: rnd(-140, 140) }, { spring: SPRING.soft, delay: (i % 12) * 3 });
      });
      if (step % 3 === 0) this.audio.play('shuffle', { vol: 0.75 });
      await this.sleep(115 * k);
    }

    // 2) istifler: gerçek masadaki gibi beşer taşlık istifler iki sıra halinde dizilir
    const tw = L.rack.tw * L.scale.stock;
    const th = tw * 1.36;
    const perRow = Math.ceil(nStacks / 2);
    const gapX = Math.min(tw + 5, (MA.w - 16) / perRow);
    const vstep = Math.max(2.2, tw * 0.22);
    const rowY = [cy - th * 0.62, cy + th * 0.62];
    const stacks = [];
    for (let si = 0; si < nStacks; si++) {
      const row = si < perRow ? 0 : 1;
      const col = row ? si - perRow : si;
      const nInRow = row ? nStacks - perRow : perRow;
      stacks.push({ x: cx + (col - (nInRow - 1) / 2) * gapX, y: rowY[row] + 2 * vstep, ids: [] });
    }
    ghosts.forEach((g2, i) => {
      const si = i % nStacks;
      const l = (i / nStacks) | 0;
      const S = stacks[si];
      S.ids.push(g2.id);
      sc.sys.fly(g2.id, { x: S.x, y: S.y - l * vstep, sc: L.scale.stock, flip: 180, rot: 0, z: 100 + l * 4 + (si % 4), h: l * 6 }, { dur: 380 * k, delay: (si * 22 + l * 70) * k, arc: 14 + l * 3, bounce: 1.5 });
    });
    await this.sleep((380 + nStacks * 22 + 4 * 70) * k);
    this.audio.cascade?.('place', 5, 0.05, { vol: 0.7 });
    sc.disp.stock = g.stock.length + 1;
    sc.refreshChrome();
    await this.sleep(160 * k);

    // 3) dağıtma: istifler sırayla oyunculara kayar (rakiplere kapalı, bana ıstakaya)
    let t0 = 0;
    let next = 0;
    const dealt = [0, 0, 0, 0];
    for (let r = 0; r < PACKS; r++) {
      for (const seat of order) {
        const S = stacks[next++];
        if (!S) continue;
        const last = r === PACKS - 1;
        const take = last ? counts[seat] - dealt[seat] : Math.min(5, counts[seat] - dealt[seat]);
        const delay = t0 * k;
        const a = this.seatAnchor(seat);
        if (seat === 0) {
          // istif yerine gerçek taşlarım geçer (aynı yerde, kapalı), sonra ıstakaya akar
          for (let j = 0; j < take; j++) {
            const idx = dealt[0] + j;
            const t = mine[idx];
            if (t === undefined) continue;
            const l = Math.min(j, 4);
            this.later(() => {
              sc.rack.addAuto(t);
              const sp = sc.ensure(t);
              sc.sys.snap(t, { x: S.x, y: S.y - l * vstep, sc: L.scale.stock, flip: 180, rot: 0, z: 120 + l, h: l * 6 });
              sp.placed = true;
              sp.z = 140 + idx;
              if (j === 0) for (const gid of S.ids) sc.dropSprite(gid);
              const tg = { ...sc.targetOf(t), flip: 180 };
              sc.sys.fly(t, tg, { dur: 380 * k, arc: 34, bounce: 2.2, delay: j * 42 * k, onLand: () => { sc.disp.counts[0]++; } });
            }, delay);
          }
        } else {
          const ids = S.ids.slice();
          ids.forEach((gid, j) => {
            sc.sys.fly(gid, { x: a.x + rnd(-4, 4), y: a.y + rnd(-3, 3), sc: 0.42, flip: 180, rot: rnd(-10, 10), z: 110 + j, h: 0 }, {
              delay: delay + (4 - j) * 26 * k,
              dur: 400 * k,
              arc: 26,
              bounce: 0,
              onLand: () => {
                sc.dropSprite(gid);
                if (j === 0) {
                  sc.disp.counts[seat] = Math.min(counts[seat], sc.disp.counts[seat] + take);
                  sc.seats[seat].setCount(sc.disp.counts[seat]);
                  sc.seats[seat].pop?.();
                }
              },
            });
          });
        }
        setTimeout(() => this.audio.play('deal'), delay);
        dealt[seat] += take;
        t0 += 135;
      }
    }
    // kullanılmayan istifler (olursa) desteye döner
    for (; next < stacks.length; next++) for (const gid of stacks[next].ids) sc.dropSprite(gid);
    await this.sleep((t0 + 460) * k);
    sc.disp.stock = g.stock.length + 1;
    sc.refreshChrome();
    // benim taşlarım soldan sağa dalga halinde açılır
    const slotsNow = sc.rack.slots.slice();
    let w = 0;
    slotsNow.forEach((t) => {
      if (t === null) return;
      const tg = sc.targetOf(t);
      sc.sys.to(t, { ...tg, flip: 0, h: 10 }, { spring: SPRING.snappy, delay: w * 28 * k });
      setTimeout(() => sc.sys.to(t, tg, { spring: SPRING.settle }), (w * 28 + 160) * k);
      w++;
    });
    this.audio.cascade?.('touch', Math.min(w, 10), 0.03);
    await this.sleep((w * 28 + 360) * k);
    sc.onRackChanged();

    // 3) gösterge
    sc.disp.indicatorTile = null;
    const ind = g.ctx.indicator;
    const isp = sc.ensure(ind);
    sc.sys.snap(ind, { x: st.x, y: st.y, sc: L.scale.stock, flip: 180, rot: 0, z: 130, h: 0 });
    isp.placed = true;
    sc.disp.indicatorTile = ind;
    this.audio.play('okey');
    sc.sys.fly(ind, { x: L.indicator.cx, y: L.indicator.cy, sc: L.scale.indicator, flip: 0, rot: 0, z: 13, h: 0 }, { dur: 620, arc: 34, bounce: 2 });
    sc.disp.stock = g.stock.length;
    sc.refreshChrome();
    await this.sleep(620);
    sc.showOkeyDeco?.();
    const okeyName = `${COLOR_TR[COLORS[g.ctx.oc]]} ${g.ctx.ov}`;
    const indName = `${COLOR_TR[COLORS[(ind / 26) | 0]]} ${((ind % 26) >> 1) + 1}`;
    sc.toast(`Gösterge ${indName} → Okey ${okeyName}`, '', 2600);
    this.fx.camera.play('push');
    // okey elimde mi? parlat
    for (const t of mine) {
      if (t < 104 && Math.floor(t / 26) === g.ctx.oc && ((t % 26) >> 1) + 1 === g.ctx.ov) {
        const sp = sc.sys.get(t);
        if (sp) sp.el.animate?.([{ filter: 'brightness(1.4)' }, { filter: 'brightness(1)' }], { duration: 900 });
      }
    }
    await this.sleep(700);
    sc.root.classList.remove('is-intro');
    sc.els.actionbar.style.opacity = '';
    sc.syncAll({ rackTiles: sc.rack.slots.slice() });
  }

  // ───────────────────────────── el bitirme anı ─────────────────────────────
  async finishSequence(res) {
    const sc = this.sc;
    const L = sc.L;
    const w = res.winner;
    if (w === null) {
      this.audio.play('lose', { vol: 0.7 });
      sc.banner(res.reason === 'allPairs' ? 'Dört çift açıldı' : 'Deste bitti', res.reason === 'allPairs' ? 'El yenileniyor' : 'El beraberlikle sona erdi');
      await this.sleep(1300);
      return;
    }
    const name = w === 0 ? 'Sen' : sc.cfg.roster[w].name;
    sc.closeLens?.(true);
    sc.focus(L.table.x + L.table.w / 2, L.table.y + L.table.h / 2, true);
    sc.stage?.cine(1);
    this.fx.camera.play('slam');
    sc.stage?.lampFlash('gold', 0.9, 800);
    // kazanan elini masanın ortasında göster (klasik: per grupları)
    if (res.winningGroups && res.winningGroups.length) {
      await this.revealHand(res, w);
    }
    if (w === 0) {
      this.audio.play('win');
      const cx = L.table.x + L.table.w / 2;
      this.fx.confetti.burst(cx, L.table.y + L.table.h * 0.55, 70);
      setTimeout(() => this.fx.confetti.burst(cx - L.table.w * 0.25, L.table.y + L.table.h * 0.6, 34), 220);
      setTimeout(() => this.fx.confetti.burst(cx + L.table.w * 0.25, L.table.y + L.table.h * 0.6, 34), 380);
    } else this.audio.play('lose', { vol: 0.8 });
    if (w === 0) sc.flash('gold', 900);
    sc.stamp(w === 0 ? 'BİTTİ!' : `${name.toUpperCase()} BİTİRDİ`, res.finishLabel || '', w === 0 ? 'win' : 'lose', 2200);
    const wa = this.seatAnchor(w);
    sc.stage?.ping(wa.x, wa.y, { r: Math.max(L.rack.tw * 3, 90), glow: true, dur: 1200, s0: 0.4, s1: 2.6, a: 0.8 });
    await this.sleep(2000);
    sc.stage?.cine(0);
    sc._turnLight(null);
  }

  async revealHand(res, w) {
    const sc = this.sc;
    const L = sc.L;
    const melds = res.winningGroups.map((g, i) => ({ id: 'w' + i, owner: w, kind: g.kind, tiles: g.tiles }));
    // vitrin: masanın ortası (yatayda köşe çöplükleri arası, üst plaka ile eylem şeridi arası); deste ve gösterge çekilir
    let area = { x: L.table.x + 8, y: L.meldArea.y, w: L.table.w - 16, h: Math.max(60, L.meldArea.h) };
    if (L.profile === 'landscape') {
      const x0 = L.piles[3].cx + L.piles[3].w / 2 + 12;
      const x1 = L.piles[0].cx - L.piles[0].w / 2 - 12;
      const y0 = L.seats[2].panel.y + L.seats[2].panel.h + 10;
      const y1 = L.action.y - 10;
      area = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    sc.setRevealMode?.(true);
    const packed = packMelds(melds, area, { maxTw: Math.min(L.rack.tw * 1.05, 56), minTw: 12 });
    // vitrini alanın tam ortasına al
    if (packed.items.length) {
      let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
      for (const it of packed.items) {
        y0 = Math.min(y0, it.rect.y); y1 = Math.max(y1, it.rect.y + it.rect.h);
        x0 = Math.min(x0, it.rect.x); x1 = Math.max(x1, it.rect.x + it.rect.w);
      }
      const dy = area.y + (area.h - (y1 - y0)) / 2 - y0;
      const dx = area.x + (area.w - (x1 - x0)) / 2 - x0;
      for (const it of packed.items) {
        it.rect = { ...it.rect, x: it.rect.x + dx, y: it.rect.y + dy };
        for (const x of it.tiles) {
          x.cx += dx;
          x.cy += dy;
        }
      }
    }
    const map = new Map();
    const tiles = [];
    packed.items.forEach((it) => it.tiles.forEach((x, i) => {
      map.set(x.t, { x: x.cx, y: x.cy, sc: packed.tw / L.rack.tw, rot: 0, flip: 0, h: 0, z: 170 + i });
      tiles.push(x.t);
    }));
    sc.reveal = { map };
    if (packed.items.length) {
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const it of packed.items) {
        bx0 = Math.min(bx0, it.rect.x); by0 = Math.min(by0, it.rect.y);
        bx1 = Math.max(bx1, it.rect.x + it.rect.w); by1 = Math.max(by1, it.rect.y + it.rect.h);
      }
      sc.stage?.setTray({ x: bx0 - 16, y: by0 - 14, w: bx1 - bx0 + 32, h: by1 - by0 + 28 });
    }
    this.audio.cascade('deal', Math.min(tiles.length, 14), 0.045, { vol: 1.2 });
    tiles.forEach((t, i) => {
      let sp = sc.sys.get(t);
      if (!sp) {
        sp = sc.ensure(t);
        const a = this.seatAnchor(w);
        sc.sys.snap(t, { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: 0, z: 150, h: 0 });
      }
      sc.sys.fly(t, map.get(t), { delay: i * 34, dur: 420, arc: 30, bounce: 2.5 });
    });
    await this.sleep(tiles.length * 34 + 460);
    // perler tek tek altınla çerçevelenir (kazananın eli okunur, ritimli tık sesleri)
    for (const it of packed.items) {
      sc.stage?.flashRect({ x: it.rect.x - 4, y: it.rect.y - 4, w: it.rect.w + 8, h: it.rect.h + 8 }, { color: 'rgb(255,210,110)', dur: 900, grow: 0.1 });
      this.audio.play('meld', { vol: 0.9 });
      await this.sleep(150);
    }
  }
}
