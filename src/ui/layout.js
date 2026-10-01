// Yerleşim çözücü (LayoutEngine) — GERÇEK yeniden düzen, `scale()` ile küçültme değil.
//
// Girdi: görünüm alanı (px), güvenli alanlar, kök yazı boyutu, mod.
// Çıktı: tüm sahne öğeleri için mutlak dikdörtgenler (px) + ıstaka ızgarası + taş ölçekleri.
// Profiller: 'portrait' (dikey telefon/tablet) ve 'landscape' (yatay telefon/tablet/masaüstü).
// Sprite hareketi ve dokunma sınaması bu ölçülere dayanır (DOM sorgusu yok → layout thrash yok).
//
// Kısıtlar (tests/layout.test.mjs ile çok sayıda ekran boyutunda doğrulanır): hiçbir bölge görünüm/güvenli alan
// dışına taşmaz, hiçbir iki bölge üst üste binmez, ıstaka taşları asgari dokunma boyutunun altına inmez.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = Math.round;

export const RACK_SPEC = {
  okey: { tiles: 15, spare: 3 },
  okey101: { tiles: 22, spare: 5 },
};

const rect = (x, y, w, h) => ({ x: R(x), y: R(y), w: R(w), h: R(h) });
const fromCenter = (o) => ({ x: o.cx - o.w / 2, y: o.cy - o.h / 2, w: o.w, h: o.h });
const inflate = (r, l, t, rr, b) => ({ x: r.x - l, y: r.y - t, w: r.w + l + rr, h: r.h + t + b });

// Istaka yüksekliği (taş genişliğine göre): üst boşluk + satırlar (taş + raf) + alt boşluk
const frameH = (tw, rows) => R(tw * 0.3) + rows * (R(tw * 1.36) + R(tw * 0.26)) + R(tw * 0.32);
const rackGap = (tw) => Math.max(2, R(tw * 0.07));
const rackPadX = (tw) => Math.max(8, R(tw * 0.6)); // uç başlıklar (GLB ıstaka)
const rackWidth = (tw, cols) => cols * tw + (cols - 1) * rackGap(tw) + 2 * rackPadX(tw);

// Istaka ızgarası (dikey profil): (satır, sütun) adayları arasından, sığan en büyük taş genişliğini seçer.
function solveRack({ availW, maxH, minSlots, rowsOptions, capTw, minTw, maxCols }) {
  let best = null;
  for (const rows of rowsOptions) {
    for (let cols = Math.ceil(minSlots / rows); cols <= maxCols; cols++) {
      let tw = Math.min(availW / (cols + 0.07 * (cols - 1) + 1.2), capTw);
      if (frameH(tw, rows) > maxH) {
        let lo = 8;
        let hi = tw;
        for (let i = 0; i < 22; i++) {
          const mid = (lo + hi) / 2;
          if (frameH(mid, rows) > maxH) hi = mid;
          else lo = mid;
        }
        tw = lo;
      }
      tw = Math.floor(tw);
      if (tw < minTw) continue;
      const score = tw * 100 - rows * 3 - Math.abs(cols * rows - minSlots) * 0.2;
      if (!best || score > best.score) best = { rows, cols, tw, score };
    }
  }
  if (!best) {
    const rows = rowsOptions[rowsOptions.length - 1];
    const cols = Math.ceil(minSlots / rows);
    best = { rows, cols, tw: Math.max(18, Math.floor(availW / (cols + 0.07 * (cols - 1) + 1.2))) };
  }
  return best;
}

function buildRack(sol, at) {
  const { rows, cols, tw } = sol;
  const th = R(tw * 1.36);
  const gap = rackGap(tw);
  const padX = rackPadX(tw);
  const padTop = R(tw * 0.3);
  const pitch = th + R(tw * 0.26);
  const padBottom = R(tw * 0.32);
  const W = rackWidth(tw, cols);
  const H = padTop + rows * pitch + padBottom;
  const x = R(at.cx - W / 2);
  const y = R(at.bottom - H);
  return {
    rect: { x, y, w: W, h: H },
    rows,
    cols,
    slots: rows * cols,
    tw,
    th,
    gap,
    padX,
    padTop,
    pitch,
    ledge: R(tw * 0.26),
    slotRect(i) {
      const r = (i / cols) | 0;
      const c = i % cols;
      return { x: x + padX + c * (tw + gap), y: y + padTop + r * pitch, w: tw, h: th };
    },
    slotCenter(i) {
      const s = this.slotRect(i);
      return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
    },
    rowOf: (i) => (i / cols) | 0,
    // Nokta → en yakın slot (ızgara dışındaki noktalar kenara kıstırılır)
    slotAt(px, py) {
      const fx = (px - (x + padX) + gap / 2) / (tw + gap);
      const fy = (py - (y + padTop) + (pitch - th) / 2) / pitch;
      return clamp(Math.floor(fy), 0, rows - 1) * cols + clamp(Math.floor(fx), 0, cols - 1);
    },
    inside(px, py, m = 0) {
      return px >= x - m && px <= x + W + m && py >= y - m && py <= y + H + m;
    },
  };
}

// Gösterge plakası: [başlık] + iki taş (gösterge → okey). Dikeyde: başlık + taş + 2 kenar boşluğu.
function plateGeom(indW, capH) {
  const indH = R(indW * 1.36);
  const padX = 5;
  const gap = Math.max(20, R(indW * 0.7));
  return { indW, indH, capH, padX, gap, w: 2 * padX + 2 * indW + gap, h: capH + 4 + indH + 5 };
}

// ───────────────────────────── DİKEY ─────────────────────────────
function layoutPortrait(o) {
  const { w, h, safe, ui, mode } = o;
  const spec = RACK_SPEC[mode];
  const pad = w <= 340 ? 8 : w <= 430 ? 10 : 14;
  const maxW = Math.min(w, 780); // tablet: içerik genişliği sınırı
  const x0 = Math.max(safe.l, (w - maxW) / 2) + pad;
  const x1 = Math.min(w - safe.r, (w + maxW) / 2) - pad;
  const contentW = x1 - x0;
  const cx = (x0 + x1) / 2;

  let y = safe.t + 4;
  const hudH = R(ui * 2.6);
  const hud = rect(x0, y, contentW, hudH);
  y += hudH + 2;
  // skorlar artık koltuklarda (ayrı skor satırı yok → masaya daha çok yer)
  const scores = null;
  y += 4;
  const tableTop = y;

  const bottomPad = Math.max(safe.b, 8);
  const actionH = R(ui * 3.1);

  // masa için asgari yükseklik → ıstaka tavanı
  const capTw = h > 1000 ? 62 : 50;
  const pwGuess = 26;
  const minTableH = R(ui * 5) + 70 + R(pwGuess * 1.36 + ui * 1.3) + 14;
  const maxRackH = clamp(h - tableTop - bottomPad - actionH - 10 - minTableH, 100, Math.min(h * 0.3, 300));
  const sol = solveRack({
    availW: contentW,
    maxH: maxRackH,
    minSlots: spec.tiles + spec.spare,
    rowsOptions: mode === 'okey' ? (contentW >= 330 ? [2] : [2, 3]) : [2, 3, 4],
    capTw,
    minTw: mode === 'okey' ? 27 : 24,
    maxCols: mode === 'okey' ? 11 : 14,
  });
  const rack = buildRack(sol, { cx, bottom: h - bottomPad });
  const actionTop = rack.rect.y - actionH - 4;
  const action = rect(x0, actionTop, contentW, actionH);
  const table = rect(x0, tableTop, contentW, actionTop - tableTop - 6);

  // Masa içi ölçüler
  const pw = clamp(R(rack.tw * 0.8), 22, 46);
  const ph = R(pw * 1.36);
  const sideW = clamp(R(ui * 3.6), 46, 72);
  const topH = clamp(R(ui * 4.3), 50, 84);
  const rowCH = ph + R(ui * 1.3);
  const rowC = table.y + table.h - rowCH;
  const pileW = pw + 12;
  const pileH = rowCH;
  const pileSc = pw / rack.tw;

  const piles = [];
  piles[0] = { seat: 0, cx: table.x + table.w - pileW / 2 - 1, cy: rowC + pileH / 2, w: pileW, h: pileH, sc: pileSc };
  piles[3] = { seat: 3, cx: table.x + pileW / 2 + 1, cy: rowC + pileH / 2, w: pileW, h: pileH, sc: pileSc };
  const topRowH = Math.max(topH, pileH);
  piles[2] = { seat: 2, cx: table.x + pileW / 2 + 1, cy: table.y + pileH / 2, w: pileW, h: pileH, sc: pileSc };
  piles[1] = { seat: 1, cx: table.x + table.w - pileW / 2 - 1, cy: table.y + pileH / 2, w: pileW, h: pileH, sc: pileSc };

  // Deste + gösterge + okey kümesi (alt orta) — başparmak bölgesi
  const stockW = R(pw * 1.05);
  const indW = R(pw * 0.92);
  const gap = R(pw * 0.22);
  const capH = 11;
  const pg = plateGeom(indW, capH);
  const clusterW = stockW + gap + pg.w;
  const cxx = table.x + table.w / 2 - clusterW / 2;
  const cyRow = rowC + pileH / 2 - R(ui * 0.1);
  const stock = { cx: cxx + stockW / 2, cy: cyRow, w: stockW, h: R(stockW * 1.36), tw: stockW };
  const plate = { x: R(cxx + stockW + gap), y: R(cyRow - pg.h / 2), w: pg.w, h: pg.h, capH };
  const tileCy = plate.y + capH + 4 + pg.indH / 2;
  const indicator = { cx: plate.x + pg.padX + indW / 2, cy: tileCy, w: indW, h: pg.indH, tw: indW };
  const okeyMini = { cx: plate.x + pg.padX + indW + pg.gap + indW / 2, cy: tileCy, w: indW, h: pg.indH, tw: indW };

  // Koltuk panelleri: yan paneller köşe çöplükleri arasındaki bantta
  const bandTop = table.y + topRowH + 4;
  const bandBottom = rowC - 4;
  const bandH = Math.max(40, bandBottom - bandTop);
  const sideH = Math.min(clamp(R(ui * 6.6), 88, 140), bandH);
  const midY = (bandTop + bandBottom) / 2;
  const seats = [];
  seats[0] = { seat: 0 };
  seats[1] = { seat: 1, orient: 'v', panel: rect(table.x + table.w - sideW, midY - sideH / 2, sideW, sideH) };
  seats[3] = { seat: 3, orient: 'v', panel: rect(table.x, midY - sideH / 2, sideW, sideH) };
  const topPanelW = clamp(R(table.w - 2 * (pileW + 8)), 120, 300);
  seats[2] = { seat: 2, orient: 'h', panel: rect(cx - topPanelW / 2, table.y, topPanelW, topH) };

  const meldArea = rect(table.x + sideW + 4, bandTop, table.w - 2 * (sideW + 4), Math.max(30, bandBottom - bandTop));
  const drop = inflate(fromCenter(piles[0]), 26, 26, 6, 6);

  return { profile: 'portrait', hud, scores, table, action, rack, seats, piles, stock, plate, indicator, okeyMini, meldArea, drop, pw, ph, unit: { pad, sideW, topH } };
}

// ───────────────────────────── YATAY ─────────────────────────────
// Gerçek bir okey masası: dört oyuncu masanın dört kenarında, herkesin ıstakası kendi kenarının ortasında.
//   üst   : rakip ıstakası (merkezde, arkası bize dönük) + yanında isim plakası
//   sol/sağ: rakip ıstakaları kendi kenarlarında dikey, ortalı; isim plakaları ıstakanın iç yanında
//   köşeler: dört çöplük yuvası (sol-üst: üst oyuncu, sağ-üst: sağ oyuncu, sol-alt: soldaki oyuncu = yandan al, sağ-alt: benim)
//   merkez : deste + gösterge + okey (101'de üst sırada; per alanı merkezi kaplar)
//   alt    : benim ıstakam (GLB), hemen üstünde durum + eylem şeridi
function layoutLandscape(o) {
  const { w, h, safe, ui, mode } = o;
  const spec = RACK_SPEC[mode];
  const tight = h < 400;
  const m = tight ? 9 : 13; // 3B masa pervazının iç kenarı
  const X0 = safe.l + m;
  const X1 = w - safe.r - m;
  const cw = X1 - X0;
  const cx = (X0 + X1) / 2;
  const Y0 = safe.t + (tight ? 7 : 11);
  const hudH = tight ? 30 : 34;
  // HUD üst bantta bir flex satırı: köşelerde simgeler, ortası boş (rakip ıstakasının üstünden geçer)
  const hud = rect(X0, Y0, cw, hudH);
  const YB = h - (Math.max(R(safe.b * 0.45), 3) + (tight ? 5 : 8));
  const stripH = clamp(R(ui * (tight ? 1.95 : 2.15)), 30, 40);

  const maxRackH = Math.min(h * (h <= 420 ? 0.42 : h >= 700 ? 0.34 : 0.42 - (0.08 * (h - 420)) / 280), 330);
  const capTw = h > 700 ? 64 : 54;
  const minTw = 22;
  const topW = mode === 'okey' ? clamp(R(cw * 0.25), 140, 280) : clamp(R(cw * 0.19), 120, 220); // 101'de per alanı için daha dar
  const topH = Math.max(30, R(topW * 0.2) + 4);

  const dims = (tw) => {
    const pw = clamp(R(tw * 0.78), 22, 48);
    const pileW = pw + 10;
    const pileH = R(pw * 1.36) + 10;
    const stockW = R(pw * 1.08);
    const stockH = R(stockW * 1.36);
    const pg = plateGeom(R(pw * (tight ? 0.86 : 0.92)), tight ? 9 : 11);
    const clusterH = Math.max(stockH + 6, pg.h);
    return { pw, pileW, pileH, stockW, stockH, pg, clusterH };
  };

  let best = null;
  for (let tw = capTw; tw >= minTw; tw--) {
    const d = dims(tw);
    for (const rows of [2, 3]) {
      const fh = frameH(tw, rows);
      if (fh > maxRackH) continue;
      const minCols = Math.ceil((spec.tiles + spec.spare) / rows);
      if (rackWidth(tw, minCols) > cw) continue;
      const band = YB - fh - stripH - 3 - Y0;
      if (band < topH + 20 + 10 + d.clusterH + 10) continue;
      const score = tw - 2.5 * (rows - 2);
      if (!best || score > best.score) {
        const want = rows === 2 ? (mode === 'okey' ? 11 : 15) : minCols + 1;
        let cols = minCols;
        while (cols < want && rackWidth(tw, cols + 1) <= cw) cols++;
        best = { rows, cols, tw, score };
      }
    }
  }
  if (!best) best = { rows: 3, cols: Math.ceil((spec.tiles + spec.spare) / 3), tw: minTw };
  const rack = buildRack(best, { cx, bottom: YB });
  const tw = rack.tw;
  const d = dims(tw);
  const pileSc = d.pw / tw;

  const stripW = clamp(rack.rect.w, Math.min(cw, 540), cw);
  const action = rect(cx - stripW / 2, rack.rect.y - 3 - stripH, stripW, stripH);
  const bandBottom = action.y - 4;
  const bandTop = Y0;
  const table = rect(X0, Y0, cw, bandBottom - Y0);

  // yan istasyonlar: dikey ıstaka (kenarda, ortalı) + iç yanında plaka
  const sideTop = Y0 + hudH + 2;
  const sideAvail = bandBottom - sideTop - 6;
  const sideLen = clamp(R(sideAvail * 0.78), 70, 230);
  const sideW = clamp(R(sideLen * 0.2) + 4, 26, 60);
  const sideY = sideTop + (sideAvail - sideLen) / 2;
  const plW = clamp(R(Math.max(ui * 4, d.pw * 1.9)), 58, 92);
  const plH = clamp(R(plW * 0.95), 54, 88);
  const leftRack = rect(X0, sideY, sideW, sideLen);
  const rightRack = rect(X1 - sideW, sideY, sideW, sideLen);
  const leftPlate = rect(leftRack.x + leftRack.w + 8, sideY + (sideLen - plH) / 2, plW, plH);
  const rightPlate = rect(rightRack.x - 8 - plW, sideY + (sideLen - plH) / 2, plW, plH);
  // üst istasyon
  const topRack = rect(cx - topW / 2, Y0, topW, topH);
  // plaka ıstakanın ön yüzüne asılı (isim tabelası gibi): yan yana yer ayırmaz
  const topPlW = clamp(R(topW * 0.62), 100, 150);
  const topPlate = rect(cx - topPlW / 2, Y0 + topH - 8, topPlW, 28);
  const topBottom = topPlate.y + topPlate.h;

  // çöplük yuvaları: köşelerde, yan istasyonların iç tarafında
  const { pileW, pileH } = d;
  const xl = Math.max(leftPlate.x + leftPlate.w, leftRack.x + leftRack.w) + 14;
  const xr = Math.min(rightPlate.x, rightRack.x) - 14;
  const topSlotY = Y0 + 4 + pileH / 2;
  const botSlotY = bandBottom - 2 - pileH / 2;
  const piles = [];
  piles[2] = { seat: 2, cx: xl + pileW / 2, cy: topSlotY, w: pileW, h: pileH, sc: pileSc };
  piles[1] = { seat: 1, cx: xr - pileW / 2, cy: topSlotY, w: pileW, h: pileH, sc: pileSc };
  piles[3] = { seat: 3, cx: xl + pileW / 2, cy: botSlotY, w: pileW, h: pileH, sc: pileSc };
  piles[0] = { seat: 0, cx: xr - pileW / 2, cy: botSlotY, w: pileW, h: pileH, sc: pileSc };

  // merkez: deste + gösterge → okey
  const { stockW, stockH, pg, clusterH } = d;
  const clusterW = stockW + 12 + pg.w;
  const free0 = topBottom + 8; // üst istasyonun altı
  let cluster;
  let clusterRow = false; // küme üst satırda mı (per alanının üstünde yer tutar)
  if (mode === 'okey') {
    cluster = { x: cx - clusterW / 2, y: free0 + (bandBottom - free0 - clusterH) / 2 };
  } else {
    // 101: merkez per alanına kalsın → küme üst satırda, üst ıstakanın sağında/solunda boş bölmeye; sığmazsa altında ortalı
    const rightSeg = [topRack.x + topRack.w + 12, xr - pileW - 8];
    const leftSeg = [xl + pileW + 8, topRack.x - 12];
    if (rightSeg[1] - rightSeg[0] >= clusterW) cluster = { x: rightSeg[0] + (rightSeg[1] - rightSeg[0] - clusterW) / 2, y: Y0 + 2 };
    else if (leftSeg[1] - leftSeg[0] >= clusterW) cluster = { x: leftSeg[0] + (leftSeg[1] - leftSeg[0] - clusterW) / 2, y: Y0 + 2 };
    else {
      cluster = { x: cx - clusterW / 2, y: free0 };
      clusterRow = true;
    }
  }
  const stock = { cx: cluster.x + stockW / 2, cy: cluster.y + clusterH - 3 - stockH / 2, w: stockW, h: stockH, tw: stockW };
  const plate = { x: R(cluster.x + stockW + 12), y: R(cluster.y + clusterH - pg.h), w: pg.w, h: pg.h, capH: pg.capH };
  const tileCy = plate.y + pg.capH + 4 + pg.indH / 2;
  const indicator = { cx: plate.x + pg.padX + pg.indW / 2, cy: tileCy, w: pg.indW, h: pg.indH, tw: pg.indW };
  const okeyMini = { cx: plate.x + pg.padX + pg.indW + pg.gap + pg.indW / 2, cy: tileCy, w: pg.indW, h: pg.indH, tw: pg.indW };

  // per alanı (101): iki çöplük sütunu arası; üst satırın (ıstaka + küme) altı → bandın tabanı
  const topRowBottom = mode === 'okey' ? topBottom : clusterRow ? free0 + clusterH : Math.max(topBottom, Y0 + clusterH + 2);
  const mx0 = xl + pileW + 12;
  const mx1 = xr - pileW - 12;
  const my0 = topRowBottom + 6;
  const meldArea = rect(mx0, my0, mx1 - mx0, Math.max(20, bandBottom - my0));
  const drop = inflate(fromCenter(piles[0]), 30, 26, 8, 8);

  const seats = [];
  seats[0] = { seat: 0 };
  seats[1] = { seat: 1, orient: 'v', panel: rightPlate, rack: rightRack, anchor: { x: rightRack.x + rightRack.w / 2, y: rightRack.y + rightRack.h / 2 } };
  seats[2] = { seat: 2, orient: 'h', panel: topPlate, rack: topRack, anchor: { x: topRack.x + topRack.w / 2, y: topRack.y + topRack.h / 2 } };
  seats[3] = { seat: 3, orient: 'v', panel: leftPlate, rack: leftRack, anchor: { x: leftRack.x + leftRack.w / 2, y: leftRack.y + leftRack.h / 2 } };

  return {
    profile: 'landscape', hud, scores: null, table, action, rack, seats, piles, stock, plate, indicator, okeyMini, meldArea, drop,
    pw: d.pw, ph: R(d.pw * 1.36), edge: { t: Y0 - 7, l: X0 - 7, r: X1 + 7 },
    unit: { pad: m, topH, stripH, clusterH },
  };
}

// Dışa açılan ana işlev
export function computeLayout({ w, h, safe = { t: 0, r: 0, b: 0, l: 0 }, rem = 16, mode = 'okey' }) {
  const ui = clamp(rem, 13, 22);
  const landscape = w >= h * 1.08;
  const base = { w, h, safe, ui, mode };
  const L = landscape ? layoutLandscape(base) : layoutPortrait(base);
  L.w = w;
  L.h = h;
  L.safe = safe;
  L.ui = ui;
  L.mode = mode;
  L.sizeClass = Math.min(w, h) < 360 ? 'xs' : Math.min(w, h) < 440 ? 'sm' : Math.min(w, h) < 700 ? 'md' : 'lg';
  const rw = L.rack.tw;
  L.scale = {
    rack: 1,
    pile: L.pw / rw,
    stock: L.stock.tw / rw,
    indicator: L.indicator.tw / rw,
  };
  L.fromCenter = fromCenter;
  return L;
}

// Görünüm kutuları (çakışma testi / hata ayıklama)
export function regionsOf(L) {
  const r = {
    action: L.action,
    rack: L.rack.rect,
    stock: fromCenter(L.stock),
    plate: L.plate,
    pile0: fromCenter(L.piles[0]),
    pile1: fromCenter(L.piles[1]),
    pile2: fromCenter(L.piles[2]),
    pile3: fromCenter(L.piles[3]),
    seat1: L.seats[1].panel,
    seat2: L.seats[2].panel,
    seat3: L.seats[3].panel,
  };
  if (L.profile === 'landscape') {
    r.rack1 = L.seats[1].rack;
    r.rack2 = L.seats[2].rack;
    r.rack3 = L.seats[3].rack;
    // HUD yalnız köşelerde simge: iki köşe kutusu
    r.hudL = { x: L.hud.x, y: L.hud.y, w: 72, h: L.hud.h };
    r.hudR = { x: L.hud.x + L.hud.w - 110, y: L.hud.y, w: 110, h: L.hud.h };
  } else r.hud = L.hud;
  if (L.scores) r.scores = L.scores;
  return r;
}
