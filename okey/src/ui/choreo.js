// Choreo — oyun olaylarını (engine events) sprite hareketlerine, seslere ve efektlere çevirir.
// Olaylar sırayla oynanır (await); `skipAll()` bekleyen her şeyi hemen bitirir (intro geç / hızlı ilerle).

import { extendMeld, reclaimJoker } from '../game/melds.js';
import { packMelds, OWNER_COLOR } from './meld-layout.js';
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
      if (sc._drawSlot >= 0) sc.rack.moveTo(t, sc._drawSlot); // sürükleyip bırakılan yuvaya doğrudan
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
      sc.retarget(true);
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
    sc.sys.fly(
      id,
      { x: to.x, y: to.y, sc: o.sc1 ?? 0.4, flip: o.flip1 ?? 180, rot: rnd(-6, 6), z: 130, h: 0 },
      {
        dur: o.dur ?? 340,
        arc: o.arc ?? 20,
        bounce: 0,
        delay: o.delay || 0,
        onLand: () => {
          o.onLand?.();
          sc.dropSprite(id);
        },
      },
    );
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
      if (sc._drawSlot >= 0) sc.rack.moveTo(t, sc._drawSlot);
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
      sc.sys.fly(
        ev.tile,
        { x: a.x, y: a.y, sc: 0.4, flip: 180, rot: 0, h: 0, z: 140 },
        {
          dur: 380,
          arc: 24,
          bounce: 0,
          onLand: () => {
            d.counts[ev.seat]++;
            sc.seats[ev.seat].setCount(d.counts[ev.seat]);
            sc.seats[ev.seat].pop();
            sc.dropSprite(ev.tile);
          },
        },
      );
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
    sc.sys.fly(
      t,
      { ...tg, h: 0 },
      {
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
      },
    );
    sc.retarget(true);
    sc.refreshChrome();
    if (ev.penalized) {
      this.fx.camera.play('shake');
      sc.flash('red', 460);
    }
    await this.sleep(dur * 0.72);
  }

  // ───────────────────────────── 101: açma / işleme / çift / okey al ─────────────────────────────
  // Açılış: masa (gerekirse 101 ızgarasına) yeniden kurulur, diğer taşlar yeni yerlerine süzülür; açılan perler
  // sırayla uçar. İlk açılışta per alanında kısa bir sinema: altın süpürme, sahibinin renginde çerçeve,
  // "SEN AÇTIN · 104 puan" başlığı ve masa kompozitinin hafif geri çekilmesi (HUD ve oyuncular sabit).
  async onOpen(event) {
    const scene = this.sc,
      display = scene.disp;
    const ids = [],
      groups = [],
      origins = new Map(),
      oldPositions = new Map();
    const pose = (sprite) => ({ x: sprite.x, y: sprite.y, sc: sprite.sc, rot: sprite.rot, flip: sprite.flip, h: sprite.h, z: sprite.z });
    for (const [id, sprite] of scene.sys.sprites) oldPositions.set(id, pose(sprite));
    const anchor = this.seatAnchor(event.seat);
    for (const meld of event.melds) {
      display.melds.push(structuredClone(meld));
      const group = meld.tiles.map((tile) => tile.t);
      groups.push(group);
      for (const id of group) {
        ids.push(id);
        const existing = scene.sys.get(id);
        origins.set(
          id,
          event.seat === 0 && existing
            ? pose(existing)
            : {
                x: anchor.x,
                y: anchor.y,
                sc: 0.4,
                rot: 0,
                flip: 180,
                h: 0,
                z: 180,
              },
        );
      }
    }
    if (event.seat === 0) {
      for (const id of ids) scene.rack.remove(id);
      if (ids.includes(scene.selected)) scene.selected = null;
    }
    display.counts[event.seat] -= ids.length;
    display.opened[event.seat] = event.additional ? display.opened[event.seat] : event.openKind;

    // The first opening expands the table. Pack against the new geometry before
    // constructing flight destinations, then preserve the source poses above.
    scene.closeLens?.(true);
    scene.layout(true);
    scene._packMelds();
    const opened = new Set(ids),
      reduced = scene.sys.reduced || this.skipping || this.settings.get('cinematic') === false;
    for (const [id, old] of oldPositions) {
      if (opened.has(id)) continue;
      const sprite = scene.sys.get(id),
        target = sprite && scene.targetOf(id);
      if (!target || sprite.mode === 'flight' || sprite.mode === 'drag') continue;
      if (reduced) scene.sys.snap(id, target);
      else {
        scene.sys.snap(id, old);
        scene.sys.to(id, target, { spring: SPRING.settle });
      }
    }
    for (const id of ids) {
      const sprite = scene.ensure(id);
      sprite.el.removeAttribute('data-meld');
      scene._applyFace(id, sprite);
      scene.sys.snap(id, origins.get(id));
    }
    scene.seats[event.seat]?.setCount(display.counts[event.seat]);
    scene.seats[event.seat]?.setStatus(event.openKind === 'pairs' ? 'Çift açtı' : event.additional ? 'Per indirdi' : 'Açtı · ' + event.points, { good: true });
    scene.refreshChrome();
    scene.onRackChanged();

    const owner = event.seat === 0 ? 'Sen' : scene.cfg.roster[event.seat].name;
    const value = event.openKind === 'pairs' ? event.count + ' çift' : event.points + ' puan';
    const area = scene.L.meldArea,
      effects = [],
      cameraAnimations = [],
      savedOrigins = [];
    let overlay = null;
    const full = !reduced && !event.additional;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      for (const animation of effects) animation?.cancel();
      for (const animation of cameraAnimations) animation?.cancel();
      for (const [element, origin] of savedOrigins) element.style.transformOrigin = origin;
      overlay?.remove();
      scene.stage?.cine(0);
    };
    scene.disposers.push(cleanup);
    // These promises retain the existing skipAll contract while keeping the
    // presentation's duration independent of the selected bot speed.
    const wait = (ms) => this.sleep(ms / Math.max(0.001, this.k));
    try {
      this.audio.play(event.additional ? 'meld' : 'open', { vol: event.additional ? 0.62 : 0.9 });
      scene.els.live.textContent = event.seat === 0 ? value + ' ile açtın.' : owner + ' ' + value + ' ile açtı.';
      if (!event.additional && area?.w > 0 && area?.h > 0) {
        overlay = document.createElement('div');
        overlay.className = 'open101-cinema' + (reduced ? ' is-reduced' : '');
        overlay.dataset.seat = String(event.seat);
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = 'left:' + area.x + 'px;top:' + area.y + 'px;width:' + area.w + 'px;height:' + area.h + 'px;--open-accent:' + OWNER_COLOR[event.seat];
        const glow = document.createElement('div');
        glow.className = 'open101-cinema__glow';
        const sweep = document.createElement('div');
        sweep.className = 'open101-cinema__sweep';
        const caption = document.createElement('div');
        caption.className = 'open101-cinema__caption';
        const title = document.createElement('b');
        title.textContent = event.seat === 0 ? 'SEN AÇTIN' : owner + ' AÇTI';
        const detail = document.createElement('span');
        detail.textContent = value;
        caption.append(title, detail);
        overlay.append(glow, sweep, caption);
        scene.root.appendChild(overlay);
        effects.push(
          overlay.animate?.([{ opacity: 0 }, { opacity: 1, offset: 0.13 }, { opacity: 1, offset: 0.68 }, { opacity: 0 }], {
            duration: reduced ? 280 : 1380,
            easing: 'linear',
            fill: 'both',
          }),
        );
        if (full) {
          scene.stage?.cine(0.22);
          scene.stage?.lampFlash('gold', 0.2, 1050);
          scene.stage?.flashRect({ x: area.x + 2, y: area.y + 2, w: Math.max(1, area.w - 4), h: Math.max(1, area.h - 4) }, { color: OWNER_COLOR[event.seat], dur: 1100, grow: 0.018, a: 0.28 });
          effects.push(
            sweep.animate?.(
              [
                { transform: 'translateX(-120%)', opacity: 0 },
                { opacity: 0.85, offset: 0.18 },
                { opacity: 0.65, offset: 0.64 },
                { transform: 'translateX(440%)', opacity: 0 },
              ],
              {
                duration: 1100,
                easing: 'cubic-bezier(.32,0,.18,1)',
                fill: 'both',
                delay: 80,
              },
            ),
          );
          effects.push(
            caption.animate?.(
              [
                { opacity: 0, transform: 'translateX(-50%) translateY(5px) scale(.96)' },
                { opacity: 1, transform: 'translateX(-50%) translateY(0) scale(1)', offset: 0.2 },
                { opacity: 1, offset: 0.57 },
                { opacity: 0, transform: 'translateX(-50%) translateY(-4px) scale(1)' },
              ],
              {
                duration: 1050,
                easing: 'cubic-bezier(.22,.7,.24,1)',
                fill: 'both',
              },
            ),
          );
          // A restrained dolly out moves the entire tabletop composite together.
          // HUD, avatars and chat stay still; hit geometry returns to identity
          // before the controller releases its busy lock.
          const candidates = [...new Set([scene.els.cam, scene.stage?.canvas, scene.els.table, scene.els.sprites, scene.els.rack, scene.els.lips, scene.els.brackets, scene.els.chips, scene.badgeLayer].filter(Boolean))];
          // The original currently uses siblings, but tolerate a future shared
          // camera wrapper: never transform a child a second time. A wrapper
          // containing player UI is not eligible for the tabletop dolly.
          const safe = candidates.filter((element) => !element.contains(scene.els.hud) && !element.querySelector('.seat,.me-plate,.toasts'));
          const elements = safe.filter((element) => !safe.some((parent) => parent !== element && parent.contains(element)));
          for (const element of elements) {
            if (!element.animate) continue;
            // wc.play animates the felt and GL canvas independently. Cancel an
            // unfinished camera transform before this synchronized composite,
            // while preserving each layer's underlying authored transform.
            for (const animation of element.getAnimations?.() || []) {
              if (animation.effect?.target === element && animation.effect.getKeyframes?.().some((frame) => frame.transform !== undefined)) animation.cancel();
            }
            const authored = getComputedStyle(element).transform;
            const base = authored && authored !== 'none' ? authored + ' ' : '';
            savedOrigins.push([element, element.style.transformOrigin]);
            element.style.transformOrigin = area.x + area.w / 2 - element.offsetLeft + 'px ' + (area.y + area.h / 2 - element.offsetTop) + 'px';
            cameraAnimations.push(
              element.animate(
                [
                  { transform: base + 'translateY(0) scale(1)' },
                  { transform: base + 'translateY(-1px) scale(.988)', offset: 0.3 },
                  { transform: base + 'translateY(-1px) scale(.988)', offset: 0.62 },
                  { transform: base + 'translateY(0) scale(1)' },
                ],
                {
                  duration: 1240,
                  easing: 'cubic-bezier(.33,0,.18,1)',
                  fill: 'none',
                },
              ),
            );
          }
        }
      }
      const duration = this._cinematicOpenTiles(event.seat, groups, origins, { reduced, additional: !!event.additional });
      if (this.skipping) scene.sys.snapAll();
      await wait(duration);
      if (!scene.root.isConnected) return;
      for (const id of ids) {
        const target = scene.targetOf(id);
        if (target) scene.sys.snap(id, target);
      }
      scene.retarget(!reduced);
      if (!this.skipping) {
        const zone = (scene.packed?.zones || []).find((zone) => zone.owner === event.seat);
        if (zone && full) scene.stage?.flashRect(zone.rect, { color: OWNER_COLOR[event.seat], dur: 520, grow: 0.014, a: 0.35 });
        const tag = scene.meldTags?.querySelector('.mzone[data-owner="' + event.seat + '"] .mzone__tag');
        if (tag) tag.animate?.([{ opacity: 0.55 }, { opacity: 1 }], { duration: reduced ? 90 : 280, easing: 'ease-out' });
      }
      if (full) await wait(Math.max(0, 1380 - duration));
    } finally {
      // No delayed lens or sticky camera transform survives an opening, a skip,
      // or leaving the game while the reveal is running.
      scene.disposers = scene.disposers.filter((dispose) => dispose !== cleanup);
      cleanup();
      if (scene.root.isConnected) {
        for (const id of ids) {
          const target = scene.targetOf(id);
          if (target && scene.sys.get(id)) scene.sys.snap(id, target);
        }
        scene.refreshChrome();
        scene.onRackChanged();
      }
    }
  }

  // Açılan perlerin uçuşu: her per önce alanın üstünde hafifçe büyük süzülür, sonra yerine oturur;
  // per tamamlanınca tık sesi ve altın parıltı. Dönen süre, sunumun bot hızından bağımsız uzunluğudur.
  _cinematicOpenTiles(seat, groups, origins, { reduced = false, additional = false } = {}) {
    const scene = this.sc,
      area = scene.L.meldArea;
    if (this.skipping) {
      for (const group of groups)
        for (const id of group) {
          const target = scene.targetOf(id);
          if (target) scene.sys.snap(id, target);
        }
      return 0;
    }
    const total = groups.length,
      spread = reduced ? 28 : additional ? 140 : 400;
    const travel = reduced ? 150 : additional ? 280 : 410;
    const settle = reduced ? 0 : 145,
      lead = reduced ? 0 : additional ? 35 : 115;
    let end = 0;
    groups.forEach((group, index) => {
      const groupDelay = lead + (total < 2 ? 0 : (index * spread) / (total - 1));
      let groupEnd = 0;
      group.forEach((id, tileIndex) => {
        const sprite = scene.sys.get(id),
          target = scene.targetOf(id);
        if (!sprite || !target) return;
        // targetOf may attach flat meld-face metadata used by the GL renderer.
        // It must only be applied after the source pose has been restored.
        sprite.z = 190 + index * 2 + tileIndex;
        const delay = groupDelay + (group.length < 2 ? 0 : (tileIndex * (reduced ? 12 : 52)) / (group.length - 1));
        const hover = { ...target, z: sprite.z, sc: target.sc * (reduced ? 1 : 1.035), h: 0, flip: 0, rot: 0 };
        if (area && !reduced) {
          const halfW = (scene.L.rack.tw * hover.sc) / 2,
            halfH = (scene.L.rack.th * hover.sc) / 2;
          hover.x = Math.max(area.x + halfW, Math.min(area.x + area.w - halfW, hover.x));
          hover.y = Math.max(area.y + halfH, Math.min(area.y + area.h - halfH, hover.y - 2));
        }
        scene.sys.fly(id, hover, {
          delay,
          dur: travel * scene.sys.speed,
          arc: reduced ? 0 : additional ? 14 : 24,
          bounce: 0,
          spin: 0,
          ease: 'inout',
          onLand: () => {
            if (this.skipping || !scene.root.isConnected || reduced) {
              if (scene.root.isConnected) scene.sys.snap(id, target);
            } else scene.sys.fly(id, target, { dur: settle * scene.sys.speed, arc: 0, bounce: 0, spin: 0, ease: 'inout' });
          },
        });
        groupEnd = Math.max(groupEnd, delay + travel + settle);
      });
      if (!reduced)
        this.later(() => {
          if (this.skipping || !scene.root.isConnected) return;
          this.audio.play('meld', { vol: additional ? 0.48 : 0.55 });
          const item = scene.packed?.items.find((item) => item.tiles.some((tile) => tile.t === group[0]));
          if (item) scene.stage?.flashRect(item.rect, { color: 'rgb(245,215,159)', dur: 420, grow: 0.012, a: 0.26 });
        }, groupEnd);
      end = Math.max(end, groupEnd);
    });
    return reduced ? 280 : Math.max(end + 30, additional ? 440 : 760);
  }

  // İşleme ve çift: aynı masa yerleşimi taş eklenmeden önce yeniden akar, yeni taş yerine uçar.
  async onLayoff(event) {
    const scene = this.sc,
      display = scene.disp;
    const captured = this._capture101Growth(event.seat, [event.tile]);
    const meld = display.melds.find((meld) => meld.id === event.meldId);
    const result = extendMeld(meld, event.tile, scene.ctx, { wrapHigh: scene.game.wrapHigh, end: event.end });
    if (result.ok) {
      meld.tiles = result.meld.tiles;
      if (result.meld.start !== undefined) meld.start = result.meld.start;
    }
    if (event.seat === 0) scene.rack.remove(event.tile);
    display.counts[event.seat]--;
    scene.seats[event.seat]?.setCount(display.counts[event.seat]);
    this.audio.play('meld');
    await this._play101Growth(event.seat, [event.tile], captured, { meldId: event.meldId });
  }

  async onPair(event) {
    const scene = this.sc,
      display = scene.disp;
    const ids = event.meld.tiles.map((tile) => tile.t);
    const captured = this._capture101Growth(event.seat, ids);
    display.melds.push(structuredClone(event.meld));
    if (event.seat === 0) for (const id of ids) scene.rack.remove(id);
    display.counts[event.seat] -= ids.length;
    scene.seats[event.seat]?.setCount(display.counts[event.seat]);
    this.audio.play('meld');
    await this._play101Growth(event.seat, ids, captured, { meldId: event.meld.id, pair: true });
  }

  _capture101Growth(seat, ids) {
    const scene = this.sc,
      old = new Map(),
      origins = new Map();
    const pose = (sprite) => ({ x: sprite.x, y: sprite.y, sc: sprite.sc, rot: sprite.rot, flip: sprite.flip, h: sprite.h, z: sprite.z });
    for (const [id, sprite] of scene.sys.sprites) old.set(id, { pose: pose(sprite), mode: sprite.mode });
    const anchor = this.seatAnchor(seat);
    for (const id of ids) {
      const sprite = scene.sys.get(id);
      origins.set(id, seat === 0 && sprite ? pose(sprite) : { x: anchor.x, y: anchor.y, sc: 0.4, rot: 0, flip: 180, h: 0, z: 180 });
    }
    return { old, origins };
  }

  async _play101Growth(seat, ids, captured, { meldId = null, pair = false } = {}) {
    const scene = this.sc,
      added = new Set(ids),
      settleIds = new Set();
    const reduced = scene.sys.reduced || this.skipping || this.settings.get('cinematic') === false;
    const speed = Math.max(0.001, scene.sys.speed);
    const spring = { k: SPRING.settle.k / (speed * speed), c: SPRING.settle.c / speed };
    let alive = true,
      cleaned = false;
    const finish = () => {
      if (cleaned) return;
      cleaned = true;
      alive = false;
      if (!scene.root.isConnected) return;
      // Snap exact final targets even when the layout grows on the last stone,
      // the user skips, or an inexpensive device misses an animation frame.
      for (const id of [...settleIds, ...ids]) {
        const sprite = scene.sys.get(id),
          target = sprite && scene.targetOf(id);
        if (target && sprite.mode !== 'drag') {
          if (added.has(id)) sprite.onLand = null;
          scene.sys.snap(id, target);
        }
      }
    };
    scene.disposers.push(finish);
    try {
      if (added.has(scene.selected)) {
        scene.sys.get(scene.selected)?.el.classList.remove('is-selected');
        scene.selected = null;
      }
      if (!scene._lens?.classList.contains('workbench101')) scene.closeLens?.(true);
      scene._packMelds();
      // This synchronizes owner cells and creates sprites for committed new
      // tiles. Restore their old poses in this same frame, before any paint.
      scene.retarget(false);
      for (const [id, previous] of captured.old) {
        if (added.has(id)) continue;
        const sprite = scene.sys.get(id),
          target = sprite && scene.targetOf(id);
        if (!target || previous.mode === 'drag') continue;
        scene._applyFace(id, sprite);
        if (previous.mode === 'flight' && sprite.fl) {
          // A draw's landing callback still has to run if its last few frames
          // overlap this event. Update its destination without canceling it.
          scene.sys._setTarget(sprite, target);
          Object.assign(sprite.fl, { x1: target.x, y1: target.y, sc1: target.sc, rot1: target.rot, flip1: target.flip, h1: target.h });
          continue;
        }
        settleIds.add(id);
        if (reduced) scene.sys.snap(id, target);
        else {
          scene.sys.snap(id, previous.pose);
          scene.sys.to(id, target, { spring });
        }
      }
      scene.refreshChrome();
      scene.onRackChanged();
      let landingSound = false;
      for (let index = 0; index < ids.length; index++) {
        const id = ids[index],
          sprite = scene.ensure(id),
          target = scene.targetOf(id);
        if (!target) continue;
        scene._applyFace(id, sprite);
        sprite.el.classList.remove('is-selected', 'is-dragging');
        scene.sys.snap(id, captured.origins.get(id));
        if (this.skipping) {
          scene.sys.snap(id, target);
          continue;
        }
        sprite.z = 190 + index;
        scene.sys.fly(
          id,
          { ...target, z: 190 + index },
          {
            delay: reduced ? 0 : index * 24,
            dur: (reduced ? 150 : pair ? 340 : 320) * speed,
            arc: reduced ? 0 : 14,
            bounce: 0,
            spin: 0,
            ease: 'inout',
            onLand: () => {
              if (!alive || this.skipping || !scene.root.isConnected) return;
              // targetOf attaches the printed-face role. Render its final pose
              // immediately so the last laid-off stone is never left behind.
              const current = scene.targetOf(id);
              if (current) scene.sys.snap(id, current);
              if (!landingSound) {
                landingSound = true;
                this.audio.play('place', { vol: 0.65 });
              }
              if (current) scene.stage?.ping(current.x, current.y, { r: Math.max(12, scene.packed?.tw || 24), color: 'rgb(150,230,190)', dur: 300, s0: 0.55, s1: 1.25, a: 0.35 });
            },
          },
        );
      }
      await this.sleep((this.skipping ? 0 : reduced ? 210 : pair ? 580 : 560) / Math.max(0.001, this.k));
      if (!alive || !scene.root.isConnected) return;
      const item = scene.packed?.items.find((item) => item.meldId === meldId);
      if (item && !this.skipping && !reduced) {
        // Wrapped runs expose row rectangles; do not tint their blank envelope
        // or a neighboring per while acknowledging a successful insertion.
        const rects = item.rows?.map((row) => row.rect || row) || [item.rect];
        for (const rect of rects) scene.stage?.flashRect(rect, { color: 'rgb(150,230,190)', dur: 320, grow: 0.01, a: 0.22 });
      }
      if (pair) scene.flashZone(seat);
    } finally {
      finish();
      scene.disposers = scene.disposers.filter((dispose) => dispose !== finish);
      if (scene.root.isConnected) {
        scene.refreshChrome();
        scene.onRackChanged();
      }
    }
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

  // 101 ızgarasında ceza sakin gösterilir (kamera sarsıntısı, kırmızı flaş ve damga yok; masa okunur kalır)
  async onPenalty(event) {
    const scene = this.sc,
      name = event.seat === 0 ? 'Sen' : scene.cfg.roster[event.seat].name;
    this.audio.play('penalty');
    scene.toast(name + ': +' + event.points + ' ceza · ' + event.reason, 'warn', 2600);
    scene.flashSeat(event.seat, 'rgb(255,96,80)');
    if (!scene.L.table101) {
      this.fx.camera.play('slam');
      scene.flash('red', 620);
      scene.stage?.lampFlash('red', 0.5, 640);
      scene.stamp('CEZA +' + event.points, name + ' · ' + event.reason, 'penalty', 1900);
    }
    const point = this.seatAnchor(event.seat);
    scene.floatText('+' + event.points, point.x, point.y, 'warn');
    scene.seats[event.seat]?.hit?.();
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
    // orta grup (deste · gösterge · okey) dağıtım bitene dek masada görünmez
    sc.okeyShown = false;
    sc.setClusterVisible?.(false);

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
            sc.sys.fly(
              gid,
              { x: a.x + rnd(-4, 4), y: a.y + rnd(-3, 3), sc: 0.42, flip: 180, rot: rnd(-10, 10), z: 110 + j, h: 0 },
              {
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
              },
            );
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
    sc.setClusterVisible?.(true, { animate: true });
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
