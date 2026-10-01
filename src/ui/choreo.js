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

  skipAll() {
    this.skipping = true;
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
  async _flyTilesToMelds(seat, tiles, baseDelay = 0) {
    const sc = this.sc;
    const order = tiles;
    order.forEach((t, i) => {
      let sp = sc.sys.get(t);
      if (seat !== 0) {
        sp = sc.ensure(t);
        const a = this.seatAnchor(seat);
        sc.sys.snap(t, { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: 0, z: 150, h: 0 });
      }
      sc._applyFace(t, sp);
      const tg = sc.targetOf(t);
      if (!tg) return;
      sp.z = 150 + i;
      sc.sys.fly(t, { ...tg, z: tg.z }, { delay: baseDelay + i * 28, dur: 380, arc: 26, bounce: 2.5, spin: rnd(-6, 6) });
    });
    return order.length * 28 + 380;
  }

  async onOpen(ev) {
    const sc = this.sc;
    const d = sc.disp;
    const tiles = [];
    for (const m of ev.melds) {
      d.melds.push(structuredClone(m));
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
    const total = await this._flyTilesToMelds(ev.seat, tiles);
    sc.retarget(true);
    sc.refreshChrome();
    sc.onRackChanged();
    const name = ev.seat === 0 ? 'Sen' : sc.cfg.roster[ev.seat].name;
    sc.seats[ev.seat]?.setStatus(ev.openKind === 'pairs' ? 'çift açtı' : ev.additional ? 'per indirdi' : `açtı · ${ev.points}`, { good: true });
    sc.flashZone(ev.seat);
    if (!ev.additional) {
      this.fx.camera.play('punch');
      sc.stage?.lampFlash('gold', 0.4, 600);
      sc.stamp(ev.openKind === 'pairs' ? `${ev.count} ÇİFT AÇTI` : `${ev.points} İLE AÇTI`, ev.seat === 0 ? 'Masaya per indirebilirsin' : name, 'open', 1500);
    }
    await this.sleep(total * 0.8);
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
    if (ev.seat === 0) this.audio.play('myTurn');
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

    // 1) yıkama: kapalı taşlar masanın ortasına saçılır, iki tur dairesel karışır, sonra deste olarak toplanır
    const st = this.stockPos();
    const k = this.k;
    const MA = L.meldArea;
    const cx = MA.x + MA.w / 2;
    const cy = MA.y + MA.h / 2;
    const R0 = Math.min(MA.w * 0.42, 190);
    const N = 28;
    const ghosts = [];
    for (let i = 0; i < N; i++) {
      const { id, s } = sc.ghost();
      sc.sys.snap(id, { x: st.x + rnd(-3, 3), y: st.y + rnd(-3, 3), sc: L.scale.stock, flip: 180, rot: rnd(-6, 6), z: 100 + i, h: 0 });
      s.placed = true;
      ghosts.push({ id, a: (i / N) * Math.PI * 2 + rnd(-0.2, 0.2), r: R0 * (0.35 + Math.random() * 0.65) });
    }
    await this.sleep(120);
    this.audio.play('shuffle');
    // saçılma
    ghosts.forEach((g2, i) => sc.sys.fly(g2.id, { x: cx + Math.cos(g2.a) * g2.r, y: cy + Math.sin(g2.a) * Math.min(g2.r * 0.55, MA.h * 0.42), sc: L.scale.stock, flip: 180, rot: rnd(-90, 90), z: 100 + i, h: 0 }, { dur: 420 * k, delay: i * 9 * k, arc: 16, bounce: 0 }));
    await this.sleep(560 * k);
    // dairesel yıkama (iki tur, avuç hareketi)
    for (let step = 1; step <= 6; step++) {
      ghosts.forEach((g2, i) => {
        const ang = g2.a + step * 0.9 * (i % 2 ? 1 : -0.7);
        const rr = g2.r * (step % 2 ? 0.8 : 1.05);
        sc.sys.to(g2.id, { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * Math.min(rr * 0.55, MA.h * 0.45), rot: rnd(-120, 120) }, { spring: SPRING.soft, delay: i * 3 });
      });
      if (step === 3) this.audio.play('shuffle', { vol: 0.8 });
      await this.sleep(120 * k);
    }
    // toplanma: deste yerine düzgün yığın
    ghosts.forEach((g2, i) => sc.sys.fly(g2.id, { x: st.x - (i % 4) * 0.8, y: st.y - (i % 4) * 1.2, sc: L.scale.stock, flip: 180, rot: 0, z: 100 + (i % 4), h: 0 }, { dur: 360 * k, delay: i * 7 * k, arc: 12, bounce: 1 }));
    await this.sleep((360 + N * 7) * k);
    this.audio.play('place', { vol: 0.8 });
    ghosts.forEach((g2) => sc.dropSprite(g2.id));

    // 2) dağıtma: gerçek masadaki gibi paketler halinde (rakiplere 3'erli deste, bana tek tek kapalı), sonra benim taşlarım dalga halinde açılır
    const mine = g.hands[0].slice();
    const counts = g.hands.map((h) => h.length);
    const order = [1, 2, 3, 0];
    const PACK = 3;
    const rounds = Math.ceil(Math.max(...counts) / PACK);
    let t0 = 0;
    const dealt = [0, 0, 0, 0];
    for (let r = 0; r < rounds; r++) {
      for (const seat of order) {
        const take = Math.min(PACK, counts[seat] - dealt[seat]);
        if (take <= 0) continue;
        const delay = t0 * k;
        const a = this.seatAnchor(seat);
        for (let j = 0; j < take; j++) {
          const idx = dealt[seat] + j;
          if (seat === 0) {
            const t = mine[idx];
            sc.rack.addAuto(t);
            const sp = sc.ensure(t);
            sp.z = 120 + idx;
            const tg = { ...sc.targetOf(t), flip: 180 };
            sc.sys.fly(t, tg, { delay: delay + j * 40 * k, dur: 360 * k, arc: 30, bounce: 2, onLand: () => { sc.disp.counts[0]++; } });
          } else {
            const { id, s: gs } = sc.ghost();
            sc.sys.snap(id, { x: st.x, y: st.y, sc: L.scale.stock, flip: 180, rot: 0, z: 110 + j, h: 0 });
            gs.placed = true;
            sc.sys.fly(id, { x: a.x + j * 3, y: a.y - j * 2, sc: 0.42, flip: 180, rot: rnd(-8, 8), z: 110 + j, h: 0 }, {
              delay: delay + j * 25 * k,
              dur: 340 * k,
              arc: 22,
              bounce: 0,
              onLand: () => {
                sc.disp.counts[seat]++;
                sc.seats[seat].setCount(sc.disp.counts[seat]);
                sc.seats[seat].pop?.();
                sc.dropSprite(id);
              },
            });
          }
        }
        setTimeout(() => this.audio.play('deal'), delay);
        dealt[seat] += take;
        t0 += 150;
      }
    }
    await this.sleep((t0 + 420) * k);
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
    const area = { x: L.table.x + 8, y: L.meldArea.y, w: L.table.w - 16, h: Math.max(60, L.meldArea.h) };
    const packed = packMelds(melds, area, { maxTw: Math.min(L.rack.tw * 0.85, 46), minTw: 12 });
    const map = new Map();
    const tiles = [];
    packed.items.forEach((it) => it.tiles.forEach((x, i) => {
      map.set(x.t, { x: x.cx, y: x.cy, sc: packed.tw / L.rack.tw, rot: 0, flip: 0, h: 0, z: 170 + i });
      tiles.push(x.t);
    }));
    sc.reveal = { map };
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
    await this.sleep(tiles.length * 34 + 520);
  }
}
