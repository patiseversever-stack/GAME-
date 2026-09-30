// Masadaki perlerin (101) düzeni — karmaşa yaratmasın diye:
//  • perler sahiplerine göre kümelenir (üstteki rakip → yanlar → ben), sahibin rengi per altında ince şerit
//  • tüm perler alana sığan EN BÜYÜK taş boyutuyla, satır satır paketlenir (ikili arama)
//  • taşlar hafif örtüşür (şerit hissi), okey temsil ettiği yüzle gösterilir (çizim katmanı yapar)
// Saf fonksiyon: DOM yok → tests/meld-layout.test.mjs ile doğrulanır.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Gösterim sırası: üst (2) → sol/sağ (3,1) → ben (0)
export const OWNER_ORDER = [2, 3, 1, 0];

export function packMelds(melds, area, opts = {}) {
  const { maxTw = 40, minTw = 11, ratio = 1.36, overlap = 0.06 } = opts;
  const list = melds
    .slice()
    .sort((a, b) => OWNER_ORDER.indexOf(a.owner) - OWNER_ORDER.indexOf(b.owner) || idNum(a.id) - idNum(b.id));
  if (!list.length) return { tw: maxTw, th: Math.round(maxTw * ratio), items: [], rows: 0 };

  const tryFit = (tw) => {
    const th = Math.round(tw * ratio);
    const step = tw * (1 - overlap); // yan yana taşlar arası
    const tagH = Math.max(3, Math.round(tw * 0.14));
    const gapX = Math.max(5, Math.round(tw * 0.42));
    const gapY = Math.max(4, Math.round(tw * 0.22));
    const rowH = th + tagH + gapY;
    const items = [];
    let x = 0;
    let row = 0;
    let rows = 1;
    let prevOwner = null;
    for (const m of list) {
      const n = m.tiles.length;
      const w = tw + (n - 1) * step;
      // sahip değişiminde ekstra boşluk
      const extra = prevOwner !== null && prevOwner !== m.owner ? gapX * 0.8 : 0;
      if (x > 0 && x + extra + w > area.w + 0.5) {
        row++;
        rows++;
        x = 0;
      } else if (x > 0) x += extra;
      items.push({ meld: m, x, y: row * rowH, w, row });
      x += w + gapX;
      prevOwner = m.owner;
    }
    const totalH = rows * rowH - gapY;
    return { ok: totalH <= area.h + 0.5 && items.every((it) => it.w <= area.w + 0.5), tw, th, step, tagH, rowH, items, rows, totalH };
  };

  let lo = minTw;
  let hi = maxTw;
  let best = tryFit(lo);
  if (best.ok) {
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      const r = tryFit(mid);
      if (r.ok) {
        best = r;
        lo = mid;
      } else hi = mid;
    }
  } else {
    // çok sıkışık: taşları daha da örtüştür
    best = tryFit(minTw);
  }
  best = tryFit(Math.floor(best.tw * 2) / 2);
  const { tw, th, step, items, totalH, rowH } = best;
  // dikey ortalama (alan içinde üstten hizalı, biraz boşluk varsa ortala)
  const offY = Math.max(0, Math.min((area.h - totalH) / 2, area.h * 0.15));
  // yatay ortalama: her satırı kendi içinde ortala
  const rowsExtent = new Map();
  for (const it of items) rowsExtent.set(it.row, Math.max(rowsExtent.get(it.row) || 0, it.x + it.w));
  const out = items.map((it) => {
    const offX = (area.w - rowsExtent.get(it.row)) / 2;
    const x0 = area.x + offX + it.x;
    const y0 = area.y + offY + it.y;
    const tiles = it.meld.tiles.map((tile, i) => ({ t: tile.t, cx: x0 + tw / 2 + i * step, cy: y0 + th / 2 }));
    return {
      meldId: it.meld.id,
      owner: it.meld.owner,
      kind: it.meld.kind,
      rect: { x: x0, y: y0, w: it.w, h: th },
      tag: { x: x0, y: y0 + th + 2, w: it.w, h: best.tagH },
      tiles,
      ends: {
        low: { x: x0 - tw * 0.9, y: y0 - 4, w: tw * 0.9 + tw * 0.3, h: th + 8 },
        high: { x: x0 + it.w - tw * 0.3, y: y0 - 4, w: tw * 0.9 + tw * 0.3, h: th + 8 },
      },
    };
  });
  return { tw, th, step, items: out, rows: best.rows };
}

function idNum(id) {
  return Number(String(id).replace(/\D/g, '')) || 0;
}

// Bir noktanın hangi pere (ve hangi uca) denk geldiği
export function hitMeld(packed, x, y, slack = 8) {
  let best = null;
  for (const it of packed.items) {
    const r = it.rect;
    const inBody = x >= r.x - slack && x <= r.x + r.w + slack && y >= r.y - slack && y <= r.y + r.h + slack;
    if (!inBody) continue;
    const dx = Math.abs(x - (r.x + r.w / 2));
    if (!best || dx < best.dx) {
      const mid = r.x + r.w / 2;
      best = { meldId: it.meldId, end: x < mid ? 'low' : 'high', dx };
    }
  }
  return best;
}

export const _clamp = clamp;
