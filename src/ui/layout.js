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
const frameH = (tw, rows) => R(tw * 0.3) + rows * (R(tw * 1.36) + R(tw * 0.26)) + R(tw * 0.12);
const rackGap = (tw) => Math.max(2, R(tw * 0.07));
const rackPadX = (tw) => Math.max(6, R(tw * 0.2));
const rackWidth = (tw, cols) => cols * tw + (cols - 1) * rackGap(tw) + 2 * rackPadX(tw);

// Istaka ızgarası (dikey profil): (satır, sütun) adayları arasından, sığan en büyük taş genişliğini seçer.
function solveRack({ availW, maxH, minSlots, rowsOptions, capTw, minTw, maxCols }) {
  let best = null;
  for (const rows of rowsOptions) {
    for (let cols = Math.ceil(minSlots / rows); cols <= maxCols; cols++) {
      let tw = Math.min(availW / (cols + 0.07 * (cols - 1)), capTw);
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
    best = { rows, cols, tw: Math.max(18, Math.floor(availW / (cols + 0.07 * (cols - 1)))) };
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
  const padBottom = R(tw * 0.12);
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
  const scoresH = R(ui * 2.1);
  const scores = rect(x0, y, contentW, scoresH);
  y += scoresH + 6;
  const tableTop = y;

  const bottomPad = Math.max(safe.b, 8);
  const actionH = R(ui * 3.1);

  // masa için asgari yükseklik → ıstaka tavanı
  const capTw = h > 1000 ? 62 : 50;
  const pwGuess = 26;
  const minTableH = R(ui * 5) + 70 + R(pwGuess * 1.36 + ui * 1.3) + 14;
  const maxRackH = clamp(h - tableTop - bottomPad - actionH - 10 - minTableH, 100, Math.min(h * 0.3, 300));
  const sol = solveRack({
    availW: contentW - 2 * Math.max(6, R(capTw * 0.2)),
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
// Düzen: geniş ıstaka altta (neredeyse tam genişlik). Hemen üstünde kontrol şeridi (durum + eylemler).
// Onun üstünde masa bandı:
//   üst satır  : [sol rakip]   [çöplük2][ üst rakip ][çöplük1]   [sağ rakip]
//   orta       :               (per alanı — 101'de açılan perler)
//   alt satır  : [çöplük3][deste][gösterge→okey]            …            [çöplük0 (benim)]
// Gerekçe: telefonda yatay oyunda yükseklik kıt, genişlik boldur; ıstaka genişliği kullanınca taşlar
// yükseklik sınırına kadar büyür (101'de bile klasikle aynı boyut), atma çöplüğü ıstakanın hemen üstünde
// olduğu için parmak ofsetiyle bile erişilir, başparmak köşelerinde (deste/çöplük) kalır.
function layoutLandscape(o) {
  const { w, h, safe, ui, mode } = o;
  const spec = RACK_SPEC[mode];
  const tight = h < 400;
  const rim = tight ? 4 : 7; // masa çerçevesi kalınlığı (CSS --rim ile aynı olmalı)
  const m = rim + 3;
  const X0 = safe.l + m;
  const X1 = w - safe.r - m;
  const cw = X1 - X0;
  const cx = (X0 + X1) / 2;
  const Y0 = safe.t + rim + 1;

  const hudH = clamp(R(ui * (tight ? 2.0 : 2.15)), 30, 42);
  const hud = rect(X0, Y0, cw, hudH);
  const TT = Y0 + hudH + 2; // masa bandının üstü
  const YB = h - (Math.max(R(safe.b * 0.45), 3) + 2); // ıstaka tabanı (ev çubuğu bölgesine hafif taşabilir: yalnız süs)
  const stripH = clamp(R(ui * (tight ? 1.95 : 2.15)), 30, 40);

  // Görünüm ölçeği: büyük ekranlarda paneller de büyür
  const maxRackH = Math.min(h * (h <= 420 ? 0.42 : h >= 700 ? 0.34 : 0.42 - (0.08 * (h - 420)) / 280), 330);
  const capTw = h > 700 ? 64 : 54;
  const minTw = 22;

  // tw'ye bağlı yan ölçüler
  const dims = (tw) => {
    const pw = clamp(R(tw * 0.78), 22, 48);
    const pw2 = clamp(R(pw * 0.78), 18, 38);
    const pileW = pw + 8;
    const pileH = R(pw * 1.36) + 8;
    const pileW2 = pw2 + 6;
    const pileH2 = R(pw2 * 1.36) + 6;
    const stockW = R(pw * 1.05);
    const stockH = R(stockW * 1.36);
    const pg = plateGeom(R(pw * (tight ? 0.86 : 0.92)), tight ? 9 : 11);
    const rowH = Math.max(pileH, stockH + 5, pg.h);
    const S = clamp(pw / 34, 0.8, 1.45);
    const sideW = clamp(R(Math.max(ui * 3.6, 58 * S)), 54, 104);
    const topH = clamp(R(Math.max(ui * 2.45, 40 * S)), 36, 62);
    const sideMin = R(58 * Math.min(S, 1));
    return { pw, pw2, pileW, pileH, pileW2, pileH2, stockW, stockH, pg, rowH, S, sideW, topH, sideMin };
  };

  // Istaka: en büyük taş; dikey bant ve yatay genişlik kısıtlarıyla
  let best = null;
  for (let tw = capTw; tw >= minTw; tw--) {
    const d = dims(tw);
    for (const rows of [2, 3]) {
      const fh = frameH(tw, rows);
      if (fh > maxRackH) continue;
      const minCols = Math.ceil((spec.tiles + spec.spare) / rows);
      if (rackWidth(tw, minCols) > cw) continue;
      const band = YB - fh - stripH - 3 - TT;
      if (band < Math.max(d.sideMin + 4 + d.rowH, d.topH + 4 + 46)) continue;
      const score = tw - 2.5 * (rows - 2);
      if (!best || score > best.score) {
        // bol genişlikte yedek sütunlar: daha rahat düzenleme
        const want = rows === 2 ? (mode === 'okey' ? 11 : 15) : minCols + 1;
        let cols = minCols;
        while (cols < want && rackWidth(tw, cols + 1) <= cw) cols++;
        best = { rows, cols, tw, score };
      }
    }
  }
  if (!best) {
    const tw = minTw;
    best = { rows: 3, cols: Math.ceil((spec.tiles + spec.spare) / 3), tw };
  }
  const rack = buildRack(best, { cx, bottom: YB });
  const tw = rack.tw;
  const d = dims(tw);
  const pileSc = d.pw / tw;
  const pile2Sc = d.pw2 / tw;

  // kontrol şeridi (durum + eylemler)
  const stripW = clamp(rack.rect.w, Math.min(cw, 540), cw);
  const action = rect(cx - stripW / 2, rack.rect.y - 3 - stripH, stripW, stripH);
  const bandBottom = action.y - 3;
  const table = rect(X0, TT, cw, bandBottom - TT);

  // alt satır: sol küme + sağ çöplük
  const { pileW, pileH, stockW, stockH, pg, rowH } = d;
  const rowTop = bandBottom - rowH;
  const piles = [];
  piles[3] = { seat: 3, cx: X0 + pileW / 2, cy: bandBottom - pileH / 2, w: pileW, h: pileH, sc: pileSc };
  piles[0] = { seat: 0, cx: X1 - pileW / 2, cy: bandBottom - pileH / 2, w: pileW, h: pileH, sc: pileSc };
  const stockX = X0 + pileW + 10;
  const stock = { cx: stockX + stockW / 2, cy: bandBottom - 5 - stockH / 2, w: stockW, h: stockH, tw: stockW };
  const plate = { x: R(stockX + stockW + 12), y: R(bandBottom - pg.h), w: pg.w, h: pg.h, capH: pg.capH };
  const tileCy = plate.y + pg.capH + 4 + pg.indH / 2;
  const indicator = { cx: plate.x + pg.padX + pg.indW / 2, cy: tileCy, w: pg.indW, h: pg.indH, tw: pg.indW };
  const okeyMini = { cx: plate.x + pg.padX + pg.indW + pg.gap + pg.indW / 2, cy: tileCy, w: pg.indW, h: pg.indH, tw: pg.indW };

  // üst satır: üst rakip (ortada) + iki yanında bilgi çöplükleri; yan rakipler köşelerde
  const topW = clamp(R(cw * 0.27), 150, 280);
  const seat2 = rect(cx - topW / 2, TT, topW, d.topH);
  piles[2] = { seat: 2, cx: seat2.x - 6 - d.pileW2 / 2, cy: TT + d.pileH2 / 2, w: d.pileW2, h: d.pileH2, sc: pile2Sc };
  piles[1] = { seat: 1, cx: seat2.x + seat2.w + 6 + d.pileW2 / 2, cy: TT + d.pileH2 / 2, w: d.pileW2, h: d.pileH2, sc: pile2Sc };

  const sideH = clamp(rowTop - 4 - TT, d.sideMin, R(d.sideW * 1.7));
  const seats = [];
  seats[0] = { seat: 0 };
  seats[3] = { seat: 3, orient: 'v', panel: rect(X0, TT, d.sideW, sideH) };
  seats[1] = { seat: 1, orient: 'v', panel: rect(X1 - d.sideW, TT, d.sideW, sideH) };
  seats[2] = { seat: 2, orient: 'h', panel: seat2 };

  // per alanı: sol kümenin sağı … benim çöplüğümün solu; üst satırın altı … bandın tabanı
  const mx0 = Math.max(plate.x + plate.w, X0 + d.sideW) + 8;
  const mx1 = Math.min(piles[0].cx - pileW / 2, X1 - d.sideW) - 8;
  const my0 = TT + Math.max(d.topH, d.pileH2) + 4;
  const meldArea = rect(mx0, my0, mx1 - mx0, Math.max(30, bandBottom - my0));
  const drop = inflate(fromCenter(piles[0]), 34, 24, 6, 6);

  return { profile: 'landscape', hud, scores: null, table, action, rack, seats, piles, stock, plate, indicator, okeyMini, meldArea, drop, pw: d.pw, ph: R(d.pw * 1.36), unit: { pad: m, sideW: d.sideW, topH: d.topH, rowH, stripH } };
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
    hud: L.hud,
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
  if (L.scores) r.scores = L.scores;
  return r;
}
