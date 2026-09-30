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
        sc.pulsePile(seat);
        sc.onRackChanged();
      },
    });
    sc.retarget(true);
    sc.refreshChrome();
    if (ev.penalized) this.fx.camera.play('shake');
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
    if (!ev.additional) sc.toast(`${name} ${ev.openKind === 'pairs' ? `${ev.count} çift` : `${ev.points} puanla`} açtı`, 'good', 1800);
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
    this.fx.camera.play('shake');
    await this.sleep(260);
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

    // 1) karıştırma: merkezdeki kapalı taş kümesi
    const st = this.stockPos();
    const ghosts = [];
    for (let i = 0; i < 16; i++) {
      const { id, s } = sc.ghost();
      sc.sys.snap(id, { x: st.x + rnd(-4, 4), y: st.y + rnd(-4, 4), sc: L.scale.stock, flip: 180, rot: rnd(-8, 8), z: 100 + i, h: 0 });
      s.placed = true;
      ghosts.push(id);
    }
    await this.sleep(250);
    this.audio.play('shuffle');
    const cx = L.table.x + L.table.w / 2;
    const cy = L.meldArea.y + L.meldArea.h / 2;
    for (let round = 0; round < 6; round++) {
      ghosts.forEach((id, i) => {
        sc.sys.to(id, { x: (round % 2 ? st.x : cx) + rnd(-46, 46), y: (round % 2 ? st.y : cy) + rnd(-26, 26), rot: rnd(-50, 50), sc: L.scale.stock * 1.05 }, { spring: SPRING.soft, delay: i * 6 });
      });
      await this.sleep(150);
    }
    ghosts.forEach((id, i) => sc.sys.to(id, { x: st.x + rnd(-2, 2), y: st.y + rnd(-2, 2), rot: rnd(-6, 6), sc: L.scale.stock }, { spring: SPRING.settle, delay: i * 4 }));
    await this.sleep(300);
    ghosts.forEach((id) => sc.dropSprite(id));

    // 2) dağıtım: her adımda 4 koltuğa birer taş
    const per = g.hands[g.starter].length - 1 + 0; // başlayan +1 taşla başlar
    const mine = g.hands[0].slice();
    const counts = g.hands.map((h) => h.length);
    const steps = Math.max(...counts);
    const order = [1, 2, 3, 0];
    const k = this.k;
    let n = 0;
    for (let step = 0; step < steps; step++) {
      for (let oi = 0; oi < 4; oi++) {
        const seat = order[oi];
        if (step >= counts[seat]) continue;
        const delay = (step * 34 + oi * 8) * k;
        const a = this.seatAnchor(seat);
        if (seat === 0) {
          const t = mine[step];
          sc.rack.addAuto(t);
          const sp = sc.ensure(t);
          sp.z = 120 + step;
          const tg = sc.targetOf(t);
          sc.sys.fly(t, tg, {
            delay,
            dur: 380,
            arc: 26,
            bounce: 2,
            onLand: () => {
              sc.disp.counts[0]++;
            },
          });
        } else {
          const { id, s } = sc.ghost();
          sc.sys.snap(id, { x: st.x, y: st.y, sc: L.scale.stock, flip: 180, rot: 0, z: 110, h: 0 });
          s.placed = true;
          sc.sys.fly(id, { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: rnd(-6, 6), z: 110, h: 0 }, {
            delay,
            dur: 360,
            arc: 20,
            bounce: 0,
            onLand: () => {
              sc.disp.counts[seat]++;
              sc.seats[seat].setCount(sc.disp.counts[seat]);
              sc.dropSprite(id);
            },
          });
        }
        n++;
        if (n % 2 === 0) setTimeout(() => this.audio.play('deal'), delay);
      }
    }
    await this.sleep(steps * 34 + 560);
    sc.disp.stock = g.stock.length + 1;
    sc.refreshChrome();
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
    sc.banner(w === 0 ? 'Bitirdin!' : `${name} bitirdi`, res.finishLabel || '');
    await this.sleep(1600);
    sc.focus(undefined, undefined, false);
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
