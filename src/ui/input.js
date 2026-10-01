// InputController — işaretçi (dokunma/fare/kalem) ve klavye.
// Tüm hit-test geometrik (Scene.hit); pointermove sırasında DOM sorgusu/layout okuma yok.
//
// Etkileşimler:
//  • ıstaka taşı: dokun → seç (2. dokunuş = at), sürükle → yeniden sırala / at / pere işle
//  • sürüklerken komşu taşlar yer açar (önizleme); bırakınca yerleşir (yay)
//  • boş slota dokun: seçili taşı oraya taşır
//  • deste / yandan al / çöplük / per / rozet dokunuşları
//  • çoklu dokunuşta sürükleme iptal; pointercancel güvenli

import { createTileEl, setFlip } from './tile-dom.js';
import { SPRING } from './sprites.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class InputController {
  constructor(scene, hooks) {
    this.sc = scene;
    this.h = hooks; // { caps(), intent(i)→Promise<boolean>, settings }
    this.p = null; // aktif işaretçi
    this.extra = new Set();
    this.enabled = true;
    this.hoverTile = null;
    this.previewSlots = null;
    this._bind();
  }

  _bind() {
    const el = this.sc.root;
    const on = (t, f, o) => {
      el.addEventListener(t, f, o);
      this.sc.disposers.push(() => el.removeEventListener(t, f, o));
    };
    on('pointerdown', (e) => this.down(e));
    on('pointermove', (e) => this.move(e));
    on('pointerup', (e) => this.up(e));
    on('pointercancel', (e) => this.cancel(e));
    on('lostpointercapture', (e) => {
      if (this.p && this.p.id === e.pointerId && this.p.dragging) this.cancel(e);
    });
    on('contextmenu', (e) => e.preventDefault());
    on('keydown', (e) => this.key(e));
    const blur = () => this.cancel();
    window.addEventListener('blur', blur);
    this.sc.disposers.push(() => window.removeEventListener('blur', blur));
    document.addEventListener('visibilitychange', blur);
    this.sc.disposers.push(() => document.removeEventListener('visibilitychange', blur));
  }

  get L() {
    return this.sc.L;
  }

  // ───────────────────────────── işaretçi ─────────────────────────────
  down(e) {
    if (!this.enabled) return;
    if (e.target.closest && e.target.closest('button, .btn, .icon-btn, a, input, select')) return;
    this.sc.deps.audio?.unlock?.();
    if (this.p) {
      // ikinci parmak: sürüklemeyi iptal et
      this.extra.add(e.pointerId);
      if (this.p.dragging) this.cancel();
      return;
    }
    const x = e.clientX;
    const y = e.clientY;
    const hit = this.sc.hit(x, y);
    if (!hit) return;
    this.p = { id: e.pointerId, type: e.pointerType, x0: x, y0: y, x, y, t0: performance.now(), hit, dragging: false, slot: -1, hot: null };
    if (hit.kind === 'stock' || hit.kind === 'side') {
      try {
        this.sc.root.setPointerCapture(e.pointerId);
      } catch {}
    }
    if (hit.kind === 'rackTile') {
      try {
        this.sc.root.setPointerCapture(e.pointerId);
      } catch {}
      const s = this.sc.sys.get(hit.tile);
      if (s && this.sc.selected !== hit.tile) this.sc.sys.to(hit.tile, { sc: 0.97, h: 2 }, { spring: SPRING.snappy });
      e.preventDefault();
    }
  }

  move(e) {
    if (!this.p || this.p.id !== e.pointerId) {
      if (!this.p && e.pointerType === 'mouse') this.hover(e.clientX, e.clientY);
      return;
    }
    const p = this.p;
    p.x = e.clientX;
    p.y = e.clientY;
    if (p.hit.kind === 'stock' || p.hit.kind === 'side') return this.drawDragMove(p);
    if (p.hit.kind !== 'rackTile') return;
    const thr = p.type === 'mouse' ? 4 : 7;
    if (!p.dragging) {
      if (Math.hypot(p.x - p.x0, p.y - p.y0) < thr) return;
      if (!this.startDrag()) return;
    }
    this.drag();
  }

  // Desteden / yandan sürükleyerek çekme: taşı ıstakada istediğin yuvaya bırak
  drawDragMove(p) {
    const caps = this.h.caps();
    const ok = p.hit.kind === 'stock' ? caps.canDrawStock : caps.canTakeSide;
    if (!ok) return;
    if (!p.drawDrag) {
      if (Math.hypot(p.x - p.x0, p.y - p.y0) < 10) return;
      p.drawDrag = true;
      const sc = this.sc;
      const t = p.hit.kind === 'side' ? sc.disp.piles[3].at(-1) : 0;
      const el = createTileEl(t ?? 0, sc.ctx);
      el.classList.add('is-dragging', 'drag-ghost');
      setFlip(el, p.hit.kind === 'stock' ? 180 : 0);
      el.style.zIndex = '400';
      sc.els.sprites.appendChild(el);
      p.ghostEl = el;
      sc.deps.audio?.play('select');
    }
    const L = this.L;
    const oy = this.offsetY(p);
    p.ghostEl.style.transform = `translate3d(${p.x - L.rack.tw / 2}px,${p.y + oy - L.rack.th / 2}px,0) scale(1.06) rotate(-3deg)`;
    if (this.sc.stage) {
      p.ghostEl.classList.add('gl-proxy');
      this.sc.stage.deco(p.ghostEl, { x: p.x, y: p.y + oy, sc: 1.06, rot: -3, flip: p.hit.kind === 'stock' ? 180 : 0, z: 120 });
    }
    const inRack = L.rack.inside(p.x, p.y + oy, 10);
    p.slot = inRack ? L.rack.slotAt(p.x, p.y + oy) : -1;
    this.sc.els.rack.classList.toggle('is-drop-target', inRack);
  }

  async drawDragEnd(p) {
    const sc = this.sc;
    p.ghostEl?.remove();
    sc.stage?.syncDecos();
    sc.els.rack.classList.remove('is-drop-target');
    if (p.slot < 0) return;
    const slot = p.slot;
    const before = new Set(sc.rack.tiles());
    const ok = await this.h.intent({ type: p.hit.kind === 'stock' ? 'drawStock' : 'takeSide' });
    if (!ok) return;
    const t = sc.rack.tiles().find((x) => !before.has(x));
    if (t === undefined) return;
    sc.rack.moveTo(t, slot);
    sc.retarget(true);
    sc.onRackChanged();
    sc.persistRack?.();
  }

  offsetY(p = this.p) {
    return p.type === 'mouse' ? -6 : -(this.L.rack.th * 0.62 + 10);
  }

  startDrag() {
    const p = this.p;
    const caps = this.h.caps();
    p.dragging = true;
    p.tile = p.hit.tile;
    const oy = this.offsetY(p);
    this.sc.dragTile = p.tile;
    const sp = this.sc.sys.get(p.tile);
    sp.el.classList.add('is-dragging');
    this.sc.sys.beginDrag(p.tile, p.x, p.y + oy);
    this.sc.deps.audio?.play('select');
    this.sc.setDropZoneVisible?.(true, caps);
    return true;
  }

  drag() {
    const p = this.p;
    const sc = this.sc;
    const L = this.L;
    const oy = this.offsetY(p);
    const tx = p.x;
    const ty = p.y + oy;
    sc.sys.dragTo(p.tile, tx, ty);
    const caps = this.h.caps();
    // 1) atma bölgesi
    // bölge: tile merkezi YA DA parmak atma alanındaysa (parmak ofseti yüzünden ikisinden biri yetmeli)
    const dr = L.drop;
    const inDrop = (x, y) => x >= dr.x && x <= dr.x + dr.w && y >= dr.y && y <= dr.y + dr.h;
    const hot = caps.canDiscard && (inDrop(tx, ty) || inDrop(p.x, p.y));
    if (hot !== !!p.hot) {
      sc.setDropHot(hot);
      p.hot = hot ? 'discard' : null;
    }
    // 2) perler (101)
    let meldHit = null;
    if (!hot && caps.canLayoff && sc.packed) {
      meldHit = sc.hitMeldAt(tx, ty);
      sc.highlightMeld?.(meldHit ? meldHit.meldId : null);
    }
    p.meld = meldHit;
    // 3) ıstaka: komşular yer açar
    const inRack = !hot && !meldHit && L.rack.inside(tx, ty, 10);
    if (inRack) {
      const slot = L.rack.slotAt(tx, ty);
      if (slot !== p.slot) {
        p.slot = slot;
        this.applyPreview(sc.rack.previewMove(p.tile, slot));
      }
    } else if (p.slot !== -1) {
      p.slot = -1;
      this.applyPreview(null);
    }
  }

  // Önizleme: diğer taşlar yeni slot merkezlerine yumuşakça kayar
  applyPreview(slots) {
    const sc = this.sc;
    const L = this.L;
    const cur = sc.rack.slots;
    const next = slots || cur;
    let moved = false;
    for (let i = 0; i < next.length; i++) {
      const t = next[i];
      if (t === null || t === this.p.tile) continue;
      const c = L.rack.slotCenter(i);
      const sp = sc.sys.get(t);
      if (!sp) continue;
      if (Math.abs(sp.tx - c.x) > 0.5 || Math.abs(sp.ty - c.y) > 0.5) {
        moved = true;
        sc.sys.to(t, { x: c.x, y: c.y, h: 0, sc: 1, rot: 0 }, { spring: SPRING.soft });
      }
    }
    this.previewSlots = slots;
    if (moved) sc.deps.audio?.play('touch');
  }

  up(e) {
    if (this.extra.has(e.pointerId)) {
      this.extra.delete(e.pointerId);
      return;
    }
    if (!this.p || this.p.id !== e.pointerId) return;
    const p = this.p;
    p.x = e.clientX;
    p.y = e.clientY;
    this.p = null;
    try {
      this.sc.root.releasePointerCapture(e.pointerId);
    } catch {}
    if (p.drawDrag) return this.drawDragEnd(p);
    if (p.dragging) return this.drop(p);
    const moved = Math.hypot(p.x - p.x0, p.y - p.y0);
    if (moved > 12) {
      this.releasePress(p);
      return;
    }
    this.tap(p);
  }

  releasePress(p) {
    if (p.hit.kind === 'rackTile') {
      const tg = this.sc.targetOf(p.hit.tile);
      if (tg) this.sc.sys.to(p.hit.tile, tg, { spring: SPRING.snappy });
    }
  }

  cancel() {
    const p = this.p;
    this.p = null;
    this.extra.clear();
    if (!p) return;
    if (p.dragging) this.endDragVisual(p, true);
    else this.releasePress(p);
  }

  endDragVisual(p, snapBack) {
    const sc = this.sc;
    const sp = sc.sys.get(p.tile);
    if (sp) sp.el.classList.remove('is-dragging');
    sc.dragTile = null;
    sc.setDropHot(false);
    sc.highlightMeld?.(null);
    sc.setDropZoneVisible?.(false);
    sc.sys.endDrag(p.tile);
    if (snapBack) {
      this.applyPreviewReset();
      const tg = sc.targetOf(p.tile);
      if (tg) sc.sys.to(p.tile, tg, { spring: SPRING.settle });
    }
  }

  applyPreviewReset() {
    const sc = this.sc;
    this.previewSlots = null;
    for (const t of sc.rack.tiles()) {
      const tg = sc.targetOf(t);
      if (tg) sc.sys.to(t, tg, { spring: SPRING.soft });
    }
  }

  async drop(p) {
    const sc = this.sc;
    const L = this.L;
    const caps = this.h.caps();
    const tile = p.tile;
    const tx = p.x;
    const ty = p.y + this.offsetY(p);
    const sp = sc.sys.get(tile);
    const hot = p.hot === 'discard';
    // atma / bitirme
    if (hot) {
      sp?.el.classList.remove('is-dragging');
      sc.dragTile = null;
      sc.setDropHot(false);
      sc.setDropZoneVisible?.(false);
      sc.highlightMeld?.(null);
      const ok = await this.h.intent({ type: caps.finishing?.has(tile) ? 'finish' : 'discard', tile, viaDrag: true });
      if (!ok) this.endDragVisual({ ...p, dragging: true }, true);
      return;
    }
    // pere işleme
    const m = p.meld && caps.canLayoff ? p.meld : null;
    if (m) {
      sp?.el.classList.remove('is-dragging');
      sc.dragTile = null;
      sc.setDropZoneVisible?.(false);
      sc.highlightMeld?.(null);
      const ok = await this.h.intent({ type: 'layoff', tile, meldId: m.meldId, end: m.end, viaDrag: true });
      if (!ok) this.endDragVisual({ ...p, dragging: true }, true);
      return;
    }
    // ıstakaya yeniden yerleştirme
    const inRack = L.rack.inside(tx, ty, 10);
    if (inRack) {
      const slot = L.rack.slotAt(tx, ty);
      const before = sc.rack.indexOf(tile);
      sc.rack.moveTo(tile, slot);
      this.previewSlots = null;
      this.endDragVisual(p, false);
      sc.retarget(true);
      if (before !== sc.rack.indexOf(tile)) {
        sc.deps.audio?.play('place');
        sc.onRackChanged();
        sc.persistRack?.();
      }
      return;
    }
    // masanın başka bir yeri: geri dön
    this.endDragVisual(p, true);
  }

  async tap(p) {
    const sc = this.sc;
    const caps = this.h.caps();
    const hit = p.hit;
    const audio = sc.deps.audio;
    switch (hit.kind) {
      case 'rackTile': {
        const t = hit.tile;
        if (sc.selected === t) {
          if (this.h.settings.get('tapToDiscard') && caps.canDiscard) {
            const ok = await this.h.intent({ type: caps.finishing?.has(t) ? 'finish' : 'discard', tile: t, viaTap: true });
            if (ok) return;
          }
          sc.setSelected(null);
          audio?.play('touch');
        } else {
          sc.setSelected(t);
          audio?.play('select');
        }
        break;
      }
      case 'rackSlot': {
        if (sc.selected !== null) {
          const t = sc.selected;
          sc.rack.moveTo(t, hit.slot);
          sc.setSelected(null);
          sc.retarget(true);
          audio?.play('place');
          sc.onRackChanged();
          sc.persistRack?.();
        } else this.releasePress(p);
        break;
      }
      case 'stock':
        await this.h.intent({ type: 'drawStock' });
        break;
      case 'side':
        await this.h.intent({ type: 'takeSide' });
        break;
      case 'myPile':
        if (sc.selected !== null && caps.canDiscard) {
          const t = sc.selected;
          await this.h.intent({ type: caps.finishing?.has(t) ? 'finish' : 'discard', tile: t, viaTap: true });
        } else await this.h.intent({ type: 'history', seat: 0 });
        break;
      case 'pile':
        await this.h.intent({ type: 'history', seat: hit.seat });
        break;
      case 'meld':
        if (sc.selected !== null && caps.canLayoff) await this.h.intent({ type: 'layoff', tile: sc.selected, meldId: hit.meldId, end: hit.end });
        else await this.h.intent({ type: 'inspectMeld', meldId: hit.meldId });
        break;
      case 'zone':
        if (sc.selected === null) {
          sc.meldLens(hit.owner);
          audio?.play('tap');
        }
        break;
      case 'chip':
        if (sc.selected !== null) await this.h.intent({ type: 'layoff', tile: sc.selected, meldId: hit.meldId, end: hit.end });
        break;
      case 'badge':
        sc.toggleGroup(hit.key);
        audio?.play('tap');
        break;
      default:
    }
  }

  // ───────────────────────────── masaüstü hover ─────────────────────────────
  hover(x, y) {
    const hit = this.sc.hit(x, y);
    const t = hit && hit.kind === 'rackTile' ? hit.tile : null;
    if (t === this.hoverTile) return;
    if (this.hoverTile !== null) this.sc.sys.get(this.hoverTile)?.el.classList.remove('is-hover');
    this.hoverTile = t;
    if (t !== null) this.sc.sys.get(t)?.el.classList.add('is-hover');
    this.sc.root.style.cursor = hit && ['rackTile', 'stock', 'side', 'pile', 'myPile', 'meld', 'chip', 'badge', 'zone'].includes(hit.kind) ? 'pointer' : '';
  }

  // ───────────────────────────── klavye ─────────────────────────────
  key(e) {
    if (!this.enabled) return;
    const sc = this.sc;
    const caps = this.h.caps();
    const tiles = sc.rack.tiles();
    const idx = sc.selected === null ? -1 : sc.rack.indexOf(sc.selected);
    const step = (dir) => {
      const slots = sc.rack.slots;
      let i = idx < 0 ? (dir > 0 ? -1 : slots.length) : idx;
      for (let k = 0; k < slots.length; k++) {
        i += dir;
        if (i < 0 || i >= slots.length) return;
        if (slots[i] !== null) {
          sc.setSelected(slots[i]);
          sc.deps.audio?.play('touch');
          return;
        }
      }
    };
    switch (e.key) {
      case 'ArrowRight':
        if (e.shiftKey && sc.selected !== null) {
          sc.rack.moveTo(sc.selected, Math.min(sc.rack.size - 1, idx + 1));
          sc.retarget(true);
          sc.onRackChanged();
        } else step(1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (e.shiftKey && sc.selected !== null) {
          sc.rack.moveTo(sc.selected, Math.max(0, idx - 1));
          sc.retarget(true);
          sc.onRackChanged();
        } else step(-1);
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'ArrowDown': {
        if (idx < 0 && tiles.length) {
          sc.setSelected(tiles[0]);
        } else if (idx >= 0) {
          const target = idx + (e.key === 'ArrowDown' ? 1 : -1) * sc.rack.cols;
          if (target >= 0 && target < sc.rack.size) {
            if (e.shiftKey) {
              sc.rack.moveTo(sc.selected, target);
              sc.retarget(true);
              sc.onRackChanged();
            } else if (sc.rack.tileAt(target) !== null) sc.setSelected(sc.rack.tileAt(target));
          }
        }
        e.preventDefault();
        break;
      }
      case 'Enter':
      case ' ':
        if (sc.selected !== null && caps.canDiscard) this.h.intent({ type: caps.finishing?.has(sc.selected) ? 'finish' : 'discard', tile: sc.selected });
        else if (sc.selected === null && tiles.length) sc.setSelected(tiles[0]);
        e.preventDefault();
        break;
      case 'Escape':
        sc.setSelected(null);
        break;
      case 'd':
      case 'D':
        this.h.intent({ type: 'drawStock' });
        break;
      case 's':
      case 'S':
        this.h.intent({ type: 'takeSide' });
        break;
      default:
    }
  }
}
