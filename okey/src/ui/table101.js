// 101 masası (yatay): ilk el açılınca masa ızgaraya geçer — rakip ıstakaları üst/yanlara, çöplükler köşelere,
// deste/gösterge sol alta, kontroller sağ boşluğa; perler oyuncu başına bir hücrede ızgaraya dizilir.
// Aynı koordinatlar GL çizimi, taş uçuşları, dokunma ve sürükleme hedefleri için tek doğruluk kaynağıdır.
import { rect as box, rackWidth, buildRack, inflate, fromCenter } from './layout.js';

export function configure101Table(scene, L) {
  const active = scene.mode === 'okey101' && !!scene.disp?.melds?.length && L.profile === 'landscape';
  if (!active) {
    delete scene.host.dataset.table101;
    delete scene.host.dataset.stock101Compact;
    delete scene.host.dataset.controls101Narrow;
    if (scene._header101)
      for (const seat of [1, 3]) {
        if (scene.seats[seat]) scene.seats[seat].cfg.orient = 'v';
        scene.seats[seat]?.el.classList.remove('seat--h');
        scene.seats[seat]?.el.classList.add('seat--v');
      }
    scene._header101 = false;
    return L;
  }
  scene.host.dataset.table101 = '1';
  const { w, h, safe: s } = L;
  const left = s.l + 9,
    right = w - s.r - 9,
    top = s.t + 4,
    bottom = h - Math.max(s.b, 6) - 2;
  const small = h - s.t - s.b < 350;
  const pileTw = small ? 27 : 31,
    pileW = pileTw + 8,
    pileH = Math.round(pileTw * 1.36) + 8;
  const sideY = top + pileH + 10,
    sideRackH = Math.min(138, Math.max(90, h * 0.32));
  const leftRack = box(left, sideY - 8, 19, sideRackH),
    rightRack = box(right - 19, sideY - 8, 19, sideRackH);
  const upperRackW = Math.min(156, w * 0.18),
    upperRack = box((left + right - upperRackW) / 2, top - 2, upperRackW, 25);
  const headerW = 106;
  const panels = [null, box(right - 44 - headerW, top, headerW, 28), box(upperRack.x + upperRack.w + 8, top, headerW, 28), box(upperRack.x - headerW - 10, top, headerW, 28)];
  L.seats = [
    { seat: 0 },
    ...[1, 2, 3].map((seat) => {
      const rack = seat === 1 ? rightRack : seat === 2 ? upperRack : leftRack;
      const el = scene.seats[seat]?.el;
      if (scene.seats[seat]) scene.seats[seat].cfg.orient = 'h';
      el?.classList.remove('seat--v');
      el?.classList.add('seat--h');
      return { seat, orient: 'h', panel: panels[seat], rack, anchor: { x: rack.x + rack.w / 2, y: rack.y + rack.h / 2 } };
    }),
  ];
  scene._header101 = true;

  // Preserve the previously accepted own GLB size and screen center.
  const cols = Math.max(13, Math.min(15, L.rack.cols)),
    ownAvail = right - left - 174;
  let tw = Math.max(small ? 28 : 32, Math.min(L.rack.tw * 0.91, 39));
  while (rackWidth(tw, cols) > ownAvail && tw > 23) tw -= 0.5;
  tw = Math.floor(tw * 2) / 2;
  L.rack = buildRack({ rows: 2, cols, tw }, { cx: w / 2, bottom });

  const lowerY = sideY - 8 + sideRackH + 12 + pileH / 2;
  const leftPileX = s.l + 4 + pileW / 2,
    rightPileX = w - s.r - 4 - pileW / 2;
  L.piles = [
    { seat: 0, cx: rightPileX, cy: lowerY, w: pileW, h: pileH, sc: pileTw / tw },
    { seat: 1, cx: rightPileX, cy: top + pileH / 2, w: pileW, h: pileH, sc: pileTw / tw },
    { seat: 2, cx: leftPileX, cy: top + pileH / 2, w: pileW, h: pileH, sc: pileTw / tw },
    { seat: 3, cx: leftPileX, cy: lowerY, w: pileW, h: pileH, sc: pileTw / tw },
  ];
  L.drop = inflate(fromCenter(L.piles[0]), 20, 22, 6, 6);
  L.pw = pileTw;
  L.ph = Math.round(pileTw * 1.36);

  // Controls use the existing empty right gutter. Status remains in the header.
  const actionX = L.rack.rect.x + L.rack.rect.w + 7;
  let actionY = Math.max(L.rack.rect.y, lowerY + pileH / 2 + 6),
    actionRight = right;
  if (bottom - actionY < 96) {
    // Keep three possible control rows above a bottom system inset. The narrow
    // right gutter beside the rack also clears the neighboring discard tray.
    actionY = L.rack.rect.y;
    actionRight = Math.min(right, rightPileX - pileW / 2 - 6);
  }
  L.action = box(actionX, actionY, actionRight - actionX, Math.max(50, bottom - actionY));
  if (L.action.w < 96) scene.host.dataset.controls101Narrow = '1';
  else delete scene.host.dataset.controls101Narrow;
  const meX = s.l + 51,
    meY = top + 2,
    statusX = meX + 61;
  const statusW = Math.max(52, panels[3].x - statusX - 7);
  scene.host.style.setProperty('--grid-me-x', meX - actionX + 'px');
  scene.host.style.setProperty('--grid-me-y', meY - actionY + 'px');
  scene.host.style.setProperty('--grid-status-x', statusX - actionX + 'px');
  scene.host.style.setProperty('--grid-status-y', top - actionY + 'px');
  scene.host.style.setProperty('--grid-status-w', statusW + 'px');

  const areaLeft = s.l + pileW + 9,
    areaRight = w - s.r - pileW - 9;
  const areaTop = top + 32;
  L.meldArea = box(areaLeft, areaTop, areaRight - areaLeft, Math.max(80, L.rack.rect.y - 7 - areaTop));
  L.table = box(left, top, right - left, L.rack.rect.y - top - 4);
  L.table101 = true;
  L.gridSmall = small;

  let stockTw = small ? 29 : 33,
    indTw = small ? 24 : 27,
    gap = small ? 9 : 12,
    indGap = small ? 10 : 14,
    dockPad = 12;
  const dockX = s.l + 5,
    dockAvailable = L.rack.rect.x - dockX - 4;
  if (dockAvailable < dockPad * 2 + stockTw + gap + indTw * 2 + indGap) {
    dockPad = 6;
    stockTw = small ? 22 : 26;
    indTw = small ? 18 : 21;
    gap = small ? 8 : 9;
    indGap = small ? 10 : 11;
  }
  if (dockPad === 6) scene.host.dataset.stock101Compact = '1';
  else delete scene.host.dataset.stock101Compact;
  const stockH = Math.round(stockTw * 1.36),
    indH = Math.round(indTw * 1.36);
  const dockW = dockPad * 2 + stockTw + gap + indTw * 2 + indGap;
  const compactBottom = small && s.b > 0;
  const dockH = Math.ceil(stockTw * 0.42) + 6 + stockH + (dockPad === 6 ? 33 : compactBottom ? 20 : 26);
  const dockY = Math.min(bottom - dockH - (compactBottom ? 0 : 8), Math.max(lowerY + pileH / 2 + 13, L.rack.rect.y - 12));
  const tileBottom = dockY + Math.ceil(stockTw * 0.42) + 6 + stockH;
  L.stockDock = box(dockX, dockY, dockW, dockH);
  L.stock = { cx: dockX + dockPad + stockTw / 2, cy: tileBottom - stockH / 2, w: stockTw, h: stockH, tw: stockTw };
  const indX = dockX + dockPad + stockTw + gap;
  L.plate = { x: indX - 5, y: tileBottom - indH - 4, w: 10 + indTw * 2 + indGap, h: indH + (dockPad === 6 ? 36 : 23), capH: 10, compact: true };
  L.indicator = { cx: indX + indTw / 2, cy: tileBottom - indH / 2, w: indTw, h: indH, tw: indTw };
  L.okeyMini = { cx: indX + indTw + indGap + indTw / 2, cy: tileBottom - indH / 2, w: indTw, h: indH, tw: indTw };
  scene.host.style.setProperty('--ind-cap-x', L.indicator.cx - L.plate.x + 'px');
  L.scale = { rack: 1, pile: pileTw / tw, stock: stockTw / tw, indicator: indTw / tw };
  return L;
}

export function pack101Grid(melds, area, maxTw = 34, small = false) {
  const owners = [...new Set(melds.map((meld) => meld.owner))],
    count = owners.length;
  const gridGap = 10,
    tileGap = 1,
    groupGap = small ? 14 : 10,
    rowGap = small ? 6 : 8;
  const headerH = small ? 12 : 14,
    pad = 6,
    topPad = small ? 2 : 4,
    bottomPad = small ? 2 : 4;
  const cw = (area.w - gridGap) / 2,
    ch = (area.h - gridGap) / 2;
  const zones = owners.map((owner, index) => {
    let rect;
    if (count === 1) {
      const width = Math.min(area.w, Math.max(Math.min(360, area.w), area.w * 0.64));
      const height = Math.min(area.h, Math.max(116, area.h * 0.82));
      rect = box(area.x + (area.w - width) / 2, area.y + (area.h - height) / 2, width, height);
    } else if (count === 2) rect = box(area.x + index * (cw + gridGap), area.y, cw, area.h);
    else if (count === 3 && index === 2) rect = box(area.x + (area.w - cw) / 2, area.y + ch + gridGap, cw, ch);
    else rect = box(area.x + (index % 2) * (cw + gridGap), area.y + Math.floor(index / 2) * (ch + gridGap), cw, ch);
    return { owner, rect, index, headerH };
  });

  function fit(zone, tw) {
    const th = Math.round(tw * 1.36),
      usable = zone.rect.w - pad * 2;
    const bodyH = zone.rect.h - headerH - topPad - bottomPad;
    const capacity = Math.max(1, Math.floor((usable + tileGap) / (tw + tileGap)));
    const parts = [];
    melds
      .filter((meld) => meld.owner === zone.owner)
      .forEach((meld, order) => {
        const pieces = Math.ceil(meld.tiles.length / capacity);
        const size = Math.ceil(meld.tiles.length / pieces);
        for (let from = 0; from < meld.tiles.length; from += size) {
          const tiles = meld.tiles.slice(from, from + size);
          const width = tiles.length * tw + Math.max(0, tiles.length - 1) * tileGap;
          parts.push({ meld, order, from, tiles, width, weight: pieces > 1 ? usable : width });
        }
      });
    const maxRows = Math.floor((bodyH + rowGap) / (th + rowGap));
    if (maxRows < 1 || parts.some((part) => part.width > usable + 0.1)) return null;
    const sorted = parts.slice().sort((a, b) => b.weight - a.weight || a.order - b.order || a.from - b.from);
    const minimumRows = count === 1 && parts.length > 1 ? 2 : 1;
    for (let rowCount = minimumRows; rowCount <= maxRows; rowCount++) {
      if (sorted.reduce((sum, part) => sum + part.weight, 0) + Math.max(0, sorted.length - rowCount) * groupGap > usable * rowCount + 0.1) continue;
      const rows = Array.from({ length: rowCount }, () => ({ used: 0, parts: [] }));
      let budget = 18000;
      function place(index) {
        if (index === sorted.length) return rows.every((row) => row.parts.length > 0);
        if (--budget <= 0) return false;
        const part = sorted[index],
          seen = new Set();
        // Start with the least occupied row so short groups and pairs stay
        // balanced rather than filling one long strip above a single group.
        for (const row of rows.slice().sort((a, b) => a.used - b.used)) {
          if (seen.has(row.used)) continue;
          seen.add(row.used);
          const used = row.used + (row.parts.length ? groupGap : 0) + part.weight;
          if (used > usable + 0.1) continue;
          const previous = row.used;
          row.used = used;
          row.parts.push(part);
          if (place(index + 1)) return true;
          row.parts.pop();
          row.used = previous;
        }
        return false;
      }
      if (place(0)) {
        const packedRows = rows.filter((row) => row.parts.length);
        for (const row of packedRows) row.parts.sort((a, b) => a.order - b.order || a.from - b.from);
        packedRows.sort((a, b) => a.parts[0].order - b.parts[0].order || a.parts[0].from - b.parts[0].from);
        return { rows: packedRows, th, bodyH, usable };
      }
    }
    return null;
  }
  let tw = maxTw,
    fits;
  for (; tw >= 8; tw -= 0.5) {
    fits = zones.map((zone) => fit(zone, tw));
    if (fits.every(Boolean)) break;
  }
  if (!fits?.every(Boolean)) throw new Error('101 grid capacity exceeded.');
  const th = Math.round(tw * 1.36),
    step = tw + tileGap,
    items = [];
  zones.forEach((zone, index) => {
    const result = fits[index],
      byId = new Map();
    const totalHeight = result.rows.length * th + (result.rows.length - 1) * rowGap;
    let y = zone.rect.y + headerH + topPad + Math.max(0, (result.bodyH - totalHeight) / 2);
    for (const row of result.rows) {
      const totalWidth = row.parts.reduce((sum, part) => sum + part.width, 0) + (row.parts.length - 1) * groupGap;
      let x = zone.rect.x + pad + Math.max(0, (result.usable - totalWidth) / 2);
      for (const part of row.parts) {
        let item = byId.get(part.meld.id);
        if (!item) {
          item = { meldId: part.meld.id, owner: zone.owner, kind: part.meld.kind, tw, rows: [], tiles: [], ends: {} };
          byId.set(part.meld.id, item);
          items.push(item);
        }
        const rect = box(x, y, part.width, th);
        item.rows.push({ rect, from: part.from, count: part.tiles.length });
        part.tiles.forEach((tile, tileIndex) => item.tiles.push({ t: tile.t, cx: x + tw / 2 + tileIndex * step, cy: y + th / 2, index: part.from + tileIndex }));
        x += part.width + groupGap;
      }
      y += th + rowGap;
    }
    for (const item of byId.values()) {
      item.tiles.sort((a, b) => a.index - b.index);
      const xs = item.rows.map((row) => row.rect.x),
        ys = item.rows.map((row) => row.rect.y);
      item.rect = box(Math.min(...xs), Math.min(...ys), Math.max(...item.rows.map((row) => row.rect.x + row.rect.w)) - Math.min(...xs), Math.max(...item.rows.map((row) => row.rect.y + row.rect.h)) - Math.min(...ys));
      item.tag = box(item.rect.x, item.rect.y + item.rect.h, item.rect.w, 0);
      const first = item.tiles[0],
        last = item.tiles[item.tiles.length - 1];
      item.ends.low = box(first.cx - tw / 2, first.cy - th / 2, tw, th);
      item.ends.high = box(last.cx - tw / 2, last.cy - th / 2, tw, th);
    }
  });
  return { tw, th, step, tileGap, groupGap, rowGap, rows: count, order: owners, items, zones, rail: 0, grid: true, headerH };
}

export function hit101Grid(scene, x, y, forDrag = false) {
  const packed = scene.packed;
  if (!packed) return null;
  const selected = forDrag ? (scene.dragTile ?? scene.selected) : scene.selected;
  const targets = selected == null || !scene.deps.canLayoff?.() ? [] : scene.game.layoffTargets(0, selected);
  const legal = new Map(targets.map((target) => [target.meldId, target.ends]));
  let result = null,
    best = Infinity;
  for (const item of packed.items) {
    for (const row of item.rows || [{ rect: item.rect }]) {
      const rect = row.rect;
      if (x < rect.x - 2 || x > rect.x + rect.w + 2 || y < rect.y - 2 || y > rect.y + rect.h + 2) continue;
      const candidates = item.tiles.filter((tile) => tile.cy >= rect.y && tile.cy <= rect.y + rect.h);
      const distance = Math.min(...candidates.map((tile) => (tile.cx - x) ** 2 + (tile.cy - y) ** 2));
      if (distance >= best) continue;
      const first = item.tiles[0],
        last = item.tiles[item.tiles.length - 1];
      const ends = legal.get(item.meldId);
      let end = (x - first.cx) ** 2 + (y - first.cy) ** 2 <= (x - last.cx) ** 2 + (y - last.cy) ** 2 ? 'low' : 'high';
      if (ends?.length && !ends.includes(end)) end = ends[0];
      best = distance;
      result = { meldId: item.meldId, owner: item.owner, end };
    }
  }
  return result;
}
