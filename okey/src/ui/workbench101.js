// 101 "rahat taş işleme" görünümü: masadaki bir oyuncunun perleri okunur boyda, uygun uçlarda "+" düğmeleriyle.
// Oyuncu açar (ızgara etiketine ya da pere dokunarak); gerçek ıstaka altta seçilebilir kalır.
// Scene.prototype'a eklenir (scene.js), merceğin (lens) yaşam döngüsünü paylaşır.
import { OWNER_COLOR } from './meld-layout.js';
import { avatarSVG } from './avatars.js';
import { createTileEl, setTileFace } from './tile-dom.js';
import { meldPoints } from '../game/melds.js';
import { isOkey } from '../game/tiles.js';

export const workbench101Methods = {
  open101Workbench(owner, { auto = false, mark = [] } = {}) {
    if (auto || !this.L?.table101 || this.mode !== 'okey101' || !this.disp?.melds.some((meld) => meld.owner === owner)) return;
    this.closeLens(true);
    const area = this.L.meldArea,
      panel = document.createElement('section'),
      player = this.cfg.roster[owner];
    panel.className = 'lens workbench101';
    panel._owner = owner;
    panel._marks = new Set(mark);
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', (owner === 0 ? 'Sen' : player.name) + ' — rahat taş işleme');
    panel.tabIndex = -1;
    panel.style.cssText = 'left:' + (area.x + 2) + 'px;top:' + (area.y + 2) + 'px;width:' + Math.max(1, area.w - 4) + 'px;height:' + Math.max(1, area.h - 4) + 'px;--oc:' + OWNER_COLOR[owner] + ';--tw:' + (this.L.gridSmall ? 30 : 34) + 'px';
    const header = document.createElement('header');
    header.className = 'workbench101__head';
    const avatar = document.createElement('i');
    avatar.innerHTML = avatarSVG(player.avatar);
    const name = document.createElement('b');
    name.textContent = owner === 0 ? 'Sen' : player.name;
    const value = document.createElement('em');
    value.className = 'workbench101__value';
    const close = document.createElement('button');
    close.className = 'workbench101__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Taş işleme görünümünü kapat');
    close.textContent = '×';
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      this.closeLens(true);
    });
    header.append(avatar, name, value, close);
    const hint = document.createElement('p');
    hint.className = 'workbench101__hint';
    hint.setAttribute('aria-live', 'polite');
    const body = document.createElement('div');
    body.className = 'workbench101__body';
    panel.append(header, hint, body);
    // Buttons and scrolling belong to this preview; the game's pointer handler
    // must not interpret a preview stone as a stone on the underlying table.
    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    panel.addEventListener('click', (event) => event.stopPropagation());
    panel.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeLens(true);
      }
    });
    this.els.coach.appendChild(panel);
    this._lens = panel;
    this._lensAway = (event) => {
      if (panel.contains(event.target)) return;
      // Our GL rack is drawn on the canvas, so DOM containment cannot identify
      // a rack tap. Use the same canonical rack bounds as the real input layer.
      const rack = this.L?.rack.rect,
        rootRect = this.root.getBoundingClientRect();
      const x = event.clientX - rootRect.left,
        y = event.clientY - rootRect.top;
      if (rack && x >= rack.x - 6 && x <= rack.x + rack.w + 6 && y >= rack.y - 14 && y <= rack.y + rack.h + 6) return;
      this.closeLens(true);
    };
    document.addEventListener('pointerdown', this._lensAway, true);
    if (!this._workbenchDisposer) {
      this._workbenchDisposer = () => this.closeLens(true);
      this.disposers.push(this._workbenchDisposer);
    }
    this.refresh101Workbench();
    panel.focus({ preventScroll: true });
    if (!this.sys.reduced)
      panel.animate?.(
        [
          { opacity: 0, translate: '0 3px' },
          { opacity: 1, translate: '0 0' },
        ],
        { duration: 180, easing: 'ease-out' },
      );
  },

  refresh101Workbench() {
    const panel = this._lens;
    if (!panel?.classList.contains('workbench101') || !panel.isConnected) return;
    if (!this.L?.table101) {
      this.closeLens(true);
      return;
    }
    const area = this.L.meldArea;
    panel.style.left = area.x + 2 + 'px';
    panel.style.top = area.y + 2 + 'px';
    panel.style.width = Math.max(1, area.w - 4) + 'px';
    panel.style.height = Math.max(1, area.h - 4) + 'px';
    panel.style.setProperty('--tw', (this.L.gridSmall ? 30 : 34) + 'px');
    const owner = panel._owner,
      controller = window.__okey?.ctl;
    const melds = this.disp?.melds.filter((meld) => meld.owner === owner) || [];
    if (!melds.length) {
      this.closeLens(true);
      return;
    }
    const selected = this.selected;
    const allowed = controller?.scene === this && !controller.busy && !this._workbenchPending && controller.caps().canLayoff && selected !== null && this.rack.indexOf(selected) >= 0;
    const targets = allowed ? this.game.layoffTargets(0, selected) : [];
    const legal = new Map(targets.map((target) => [target.meldId, target.ends]));
    const signature = JSON.stringify([
      selected,
      !!allowed,
      !!this._workbenchPending,
      [area.x, area.y, area.w, area.h, this.L.gridSmall],
      melds.map((meld) => [meld.id, meld.kind, meld.tiles.map((tile) => [tile.t, tile.c, tile.v])]),
      [...legal],
      [...(panel._marks || [])],
    ]);
    if (panel._signature === signature) return;
    panel._signature = signature;
    const body = panel.querySelector('.workbench101__body'),
      hint = panel.querySelector('.workbench101__hint');
    const scroll = body.scrollTop,
      previousSelection = panel._selected;
    panel._selected = selected;
    const points = melds.filter((meld) => meld.kind !== 'pair').reduce((sum, meld) => sum + meldPoints(meld), 0),
      pairs = melds.filter((meld) => meld.kind === 'pair').length;
    panel.querySelector('.workbench101__value').textContent = pairs && !points ? pairs + ' çift' : points + ' puan';
    panel.setAttribute('aria-busy', this._workbenchPending ? 'true' : 'false');
    const matching = melds.some((meld) => legal.has(meld.id));
    hint.textContent = this._workbenchPending
      ? 'Taşın işleniyor…'
      : selected === null
        ? 'Istakandan taş seç; uygun uçlara + ile işle.'
        : !allowed
          ? 'Taş işlemek için sıra sende olmalı ve taş çekmiş olmalısın.'
          : matching
            ? 'Uygun perin + düğmesine dokun.'
            : 'Seçtiğin taş bu oyuncunun perlerine işlenemiyor.';
    body.replaceChildren();
    const tw = this.L.gridSmall ? 30 : 34,
      contentWidth = Math.max(80, this.L.meldArea.w - 20);
    for (const meld of melds) {
      const ends = legal.get(meld.id) || [],
        group = document.createElement('article');
      group.className = 'workbench101__group' + (ends.length ? ' is-target' : '');
      group.dataset.meldId = String(meld.id);
      group.style.width = Math.min(contentWidth, Math.max(ends.length ? 156 : 108, meld.tiles.length * (tw + 3) - 3 + 16)) + 'px';
      const heading = document.createElement('div');
      heading.className = 'workbench101__group-head';
      const type = document.createElement('span');
      type.textContent = meld.kind === 'pair' ? 'Çift' : meld.kind === 'run' ? 'Seri' : 'Aynı sayı';
      heading.appendChild(type);
      for (const end of ends) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'workbench101__add';
        button.dataset.meldId = String(meld.id);
        button.dataset.end = end;
        button.setAttribute('aria-label', (end === 'low' ? 'Sol' : 'Sağ') + ' uca seçili taşı işle');
        button.innerHTML = '<b>+</b><small>' + (end === 'low' ? 'sol' : 'sağ') + '</small>';
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const ctl = window.__okey?.ctl,
            tile = this.selected;
          if (ctl?.scene !== this || ctl.busy || this._workbenchPending || tile === null || !ctl.caps().canLayoff || this.rack.indexOf(tile) < 0) return;
          const valid = this.game.layoffTargets(0, tile).some((target) => target.meldId === meld.id && target.ends.includes(end));
          if (!valid) {
            this.refresh101Workbench();
            return;
          }
          this._workbenchPending = true;
          this.refresh101Workbench();
          try {
            const accepted = await ctl.intent({ type: 'layoff', tile, meldId: meld.id, end });
            if (accepted && this._lens === panel) panel._marks = new Set([tile]);
          } finally {
            this._workbenchPending = false;
            if (window.__okey?.ctl?.scene === this) this.refresh101Workbench();
          }
        });
        heading.appendChild(button);
      }
      const tiles = document.createElement('div');
      tiles.className = 'workbench101__tiles';
      for (const tile of meld.tiles) {
        const element = createTileEl(tile.t, this.ctx, { inline: true });
        setTileFace(element, tile.t, this.ctx, isOkey(tile.t, this.ctx) ? { c: tile.c, v: tile.v } : null);
        element.classList.add('workbench101__tile');
        if (panel._marks?.has(tile.t)) element.classList.add('is-recent');
        tiles.appendChild(element);
      }
      group.append(heading, tiles);
      body.appendChild(group);
    }
    body.scrollTop = scroll;
    // Bring a newly selected stone's first legal per into view without moving
    // the table, rack, camera, or the player's previously chosen overview.
    const target = body.querySelector('.is-target');
    if (selected !== previousSelection && selected !== null && target) {
      const outer = body.getBoundingClientRect(),
        inner = target.getBoundingClientRect();
      const delta = inner.top < outer.top ? inner.top - outer.top : inner.bottom > outer.bottom ? Math.min(inner.top - outer.top, inner.bottom - outer.bottom) : 0;
      if (delta) body.scrollTo({ top: Math.max(0, body.scrollTop + delta), behavior: this.sys.reduced ? 'auto' : 'smooth' });
    }
  },
};
