// Deste "Boğaz Gecesi": İstanbul'da ay ışığı. Gece mavisi kartlar, altın çizgiler.
//   · sayılar: takım işareti bir pencere — içinde İstanbul silueti: ♥♦ alacakaranlık (kızıl gök, batan güneş),
//     ♠♣ gece (lacivert gök, hilal, ışıklı pencereler) · ortada beyaz değer
//   · As: dev dolunay, ortasında takım silueti; altta suya düşen yansıma
//   · Papaz = Galata Kulesi · Kız = Kız Kulesi · Vale = Boğaz Köprüsü ve vapur (sivri kemerli altın pencerede)
//   · arka: Galata, köprü, Kız Kulesi, vapur, hilal ve suda altın yansımalar
import {
  cardPath, corners, defineSkin, edge, glow, gold, lin, loadFont, makeCanvas, mix, mulberry, rad, RankFont, rrPath, css, sparkle, SUIT_TY,
  suitOutline, suitPath, withSuit, due, isRed, type Ctx, type Job, type RGB, type Rnd, type Suit,
} from './kit';

const FONT = (px: number): string => `900 ${px}px "Playfair Display", "Times New Roman", Georgia, serif`;
const RF = new RankFont(FONT);
const PW = 360, PH = Math.round(PW / 0.7);
const CORAL = '#ff5470', SNOW = '#f2f5ff';
const WIN: RGB = [255, 214, 120];

interface Art {
  night: HTMLCanvasElement;
  win: Record<Suit, HTMLCanvasElement>;
  moon: HTMLCanvasElement;
  court: Record<number, HTMLCanvasElement>;
  back: HTMLCanvasElement;
}

// ───────────────────────── İstanbul siluet parçaları ─────────────────────────
/** Galata Kulesi: silindir gövde, pencereli seyir balkonu, konik külah. by = taban, s = yükseklik (külah dahil). */
export function galata(g: Ctx, x: number, by: number, s: number, body: string, lit: boolean): void {
  const w = s * 0.2, bodyH = s * 0.66, top = by - bodyH;
  g.fillStyle = body;
  // gövde (hafif genişleyen taban)
  g.beginPath();
  g.moveTo(x - w * 0.62, by);
  g.lineTo(x - w * 0.5, top);
  g.lineTo(x + w * 0.5, top);
  g.lineTo(x + w * 0.62, by);
  g.closePath();
  g.fill();
  // balkon bandı
  g.fillRect(x - w * 0.62, top - s * 0.015, w * 1.24, s * 0.03);
  const rh = s * 0.1;
  g.fillRect(x - w * 0.5, top - rh, w, rh);
  // külah
  g.beginPath();
  g.moveTo(x - w * 0.58, top - rh);
  g.quadraticCurveTo(x - w * 0.2, top - rh - s * 0.12, x, by - s);
  g.quadraticCurveTo(x + w * 0.2, top - rh - s * 0.12, x + w * 0.58, top - rh);
  g.closePath();
  g.fill();
  g.fillRect(x - s * 0.006, by - s * 1.05, s * 0.012, s * 0.06);
  if (lit) {
    // seyir katının kemerli pencereleri
    g.fillStyle = css(WIN);
    for (let i = -2; i <= 2; i++) {
      const wx = x + i * w * 0.19;
      g.beginPath();
      g.moveTo(wx - w * 0.055, top - rh * 0.15);
      g.lineTo(wx - w * 0.055, top - rh * 0.6);
      g.arc(wx, top - rh * 0.6, w * 0.055, Math.PI, 0);
      g.lineTo(wx + w * 0.055, top - rh * 0.15);
      g.fill();
    }
    // gövde pencereleri
    for (let k = 0; k < 4; k++) {
      const wy = top + bodyH * (0.18 + k * 0.2);
      for (const dx of [-0.2, 0.2]) {
        g.fillStyle = css(WIN, k % 2 ? 0.95 : 0.6);
        g.fillRect(x + dx * w - w * 0.04, wy, w * 0.08, bodyH * 0.07);
      }
    }
  }
}

/** Kız Kulesi: kayalık adacık + kare yapı + ince kule ve fener. by = su seviyesi, s = yükseklik. */
export function kizKulesi(g: Ctx, x: number, by: number, s: number, body: string, lit: boolean): void {
  g.fillStyle = body;
  // adacık
  g.beginPath();
  g.ellipse(x, by, s * 0.5, s * 0.06, 0, Math.PI, 0);
  g.fill();
  // ana yapı
  g.fillRect(x - s * 0.36, by - s * 0.3, s * 0.62, s * 0.3);
  g.fillRect(x - s * 0.4, by - s * 0.33, s * 0.7, s * 0.035);
  // yan küçük kubbe yerine kırma çatı
  g.beginPath();
  g.moveTo(x - s * 0.36, by - s * 0.33);
  g.lineTo(x - s * 0.22, by - s * 0.42);
  g.lineTo(x - s * 0.08, by - s * 0.33);
  g.fill();
  // kule
  const tw = s * 0.14;
  g.fillRect(x + s * 0.06, by - s * 0.78, tw, s * 0.46);
  g.fillRect(x + s * 0.06 - tw * 0.2, by - s * 0.8, tw * 1.4, s * 0.03);
  // fener odası + külah
  g.fillRect(x + s * 0.06 + tw * 0.1, by - s * 0.9, tw * 0.8, s * 0.1);
  g.beginPath();
  g.moveTo(x + s * 0.06 - tw * 0.05, by - s * 0.9);
  g.lineTo(x + s * 0.06 + tw * 0.5, by - s);
  g.lineTo(x + s * 0.06 + tw * 1.05, by - s * 0.9);
  g.fill();
  if (lit) {
    g.fillStyle = css(WIN);
    for (let i = 0; i < 4; i++) g.fillRect(x - s * 0.3 + i * s * 0.13, by - s * 0.22, s * 0.05, s * 0.08);
    g.fillRect(x + s * 0.06 + tw * 0.3, by - s * 0.66, tw * 0.4, s * 0.08);
    // fener ışığı
    g.fillStyle = 'rgba(255,240,180,1)';
    g.fillRect(x + s * 0.06 + tw * 0.25, by - s * 0.88, tw * 0.5, s * 0.06);
  }
}

/** Asma köprü: iki kule, ana kablo, askılar, tabliye; kablo boyunca renkli ışıklar. */
export function bridge(g: Ctx, x0: number, x1: number, deckY: number, towerH: number, body: string, lights: boolean, rnd: Rnd): void {
  const L = x1 - x0;
  const t0 = x0 + L * 0.2, t1 = x1 - L * 0.2;
  const topY = deckY - towerH;
  g.strokeStyle = body;
  g.fillStyle = body;
  // tabliye
  g.fillRect(x0, deckY, L, Math.max(1.5, towerH * 0.05));
  // kuleler (iki bacaklı)
  for (const tx of [t0, t1]) {
    const tw = towerH * 0.06;
    g.fillRect(tx - tw * 1.2, topY, tw * 0.7, towerH * 1.15);
    g.fillRect(tx + tw * 0.5, topY, tw * 0.7, towerH * 1.15);
    g.fillRect(tx - tw * 1.2, topY + towerH * 0.3, tw * 2.4, tw * 0.5);
    g.fillRect(tx - tw * 1.2, topY + towerH * 0.7, tw * 2.4, tw * 0.5);
  }
  // ana kablo (zincir eğrisi yaklaşığı)
  const cable = (xa: number, ya: number, xb: number, yb: number, sag: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push([xa + (xb - xa) * t, ya + (yb - ya) * t + sag * 4 * t * (1 - t)]);
    }
    return pts;
  };
  const main = cable(t0, topY, t1, topY, towerH * 0.85);
  const left = cable(x0, deckY - towerH * 0.05, t0, topY, -towerH * 0.1);
  const right = cable(t1, topY, x1, deckY - towerH * 0.05, -towerH * 0.1);
  g.lineWidth = Math.max(1, towerH * 0.03);
  for (const c of [main, left, right]) {
    g.beginPath();
    c.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  // askılar
  g.lineWidth = Math.max(0.5, towerH * 0.008);
  for (const c of [main, left, right])
    for (let i = 1; i < c.length - 1; i += 2) {
      g.beginPath();
      g.moveTo(c[i][0], c[i][1]);
      g.lineTo(c[i][0], deckY);
      g.stroke();
    }
  if (lights) {
    const cols = ['#ff5ab4', '#5ad2ff', '#ffd25a', '#a07aff', '#5aff9e'];
    let ci = Math.floor(rnd() * cols.length);
    for (const c of [main, left, right])
      for (const [x, y] of c) {
        g.fillStyle = cols[ci++ % cols.length];
        g.beginPath();
        g.arc(x, y, Math.max(1, towerH * 0.022), 0, Math.PI * 2);
        g.fill();
      }
    // tabliye ışıkları
    g.fillStyle = 'rgba(255,230,160,0.95)';
    for (let x = x0; x < x1; x += L / 40) g.fillRect(x, deckY - 0.5, Math.max(1, L / 160), Math.max(1, towerH * 0.025));
  }
}

/** Yalılar: suyun kıyısında ahşap evler, ışıklı pencereler. */
export function yalilar(g: Ctx, x0: number, x1: number, by: number, h: number, body: string, rnd: Rnd, lit = 0.6): void {
  let x = x0;
  while (x < x1) {
    const w = h * (0.6 + rnd() * 0.8), hh = h * (0.5 + rnd() * 0.5);
    g.fillStyle = body;
    g.fillRect(x, by - hh, w, hh);
    g.beginPath();
    g.moveTo(x - w * 0.05, by - hh);
    g.lineTo(x + w / 2, by - hh - h * 0.25);
    g.lineTo(x + w * 1.05, by - hh);
    g.fill();
    for (let wy = by - hh + h * 0.12; wy < by - h * 0.15; wy += h * 0.24)
      for (let wx = x + w * 0.15; wx < x + w * 0.85; wx += w * 0.24)
        if (rnd() < lit) {
          g.fillStyle = css(mix(WIN, [255, 255, 255], rnd() * 0.3), 0.75 + rnd() * 0.25);
          g.fillRect(wx, wy, w * 0.1, h * 0.1);
        }
    x += w + h * 0.04;
  }
}

/** Vapur: beyaz gövde, siyah bant, kamara pencereleri, bacası. x = merkez, y = su hattı, s = boy */
export function vapur(g: Ctx, x: number, y: number, s: number): void {
  const L = s, H = s * 0.18;
  g.fillStyle = '#f4f2ea';
  g.beginPath();
  g.moveTo(x - L * 0.5, y - H);
  g.lineTo(x + L * 0.5, y - H);
  g.lineTo(x + L * 0.44, y);
  g.lineTo(x - L * 0.44, y);
  g.closePath();
  g.fill();
  g.fillStyle = '#1a1e2c';
  g.fillRect(x - L * 0.47, y - H * 0.35, L * 0.94, H * 0.22);
  g.fillStyle = '#f4f2ea';
  g.fillRect(x - L * 0.32, y - H * 1.8, L * 0.64, H * 0.85);
  g.fillStyle = '#dcd8cc';
  g.fillRect(x - L * 0.36, y - H * 1.85, L * 0.72, H * 0.12);
  // baca
  g.fillStyle = '#f4f2ea';
  g.fillRect(x - L * 0.04, y - H * 2.9, L * 0.08, H * 1.1);
  g.fillStyle = '#1a1e2c';
  g.fillRect(x - L * 0.04, y - H * 2.9, L * 0.08, H * 0.28);
  g.fillStyle = '#d0202e';
  g.fillRect(x - L * 0.04, y - H * 2.55, L * 0.08, H * 0.14);
  // pencereler
  g.fillStyle = css(WIN);
  for (let i = 0; i < 9; i++) g.fillRect(x - L * 0.28 + i * L * 0.064, y - H * 1.55, L * 0.035, H * 0.38);
  for (let i = 0; i < 11; i++) g.fillRect(x - L * 0.4 + i * L * 0.075, y - H * 0.8, L * 0.03, H * 0.28);
}

/** Su: koyu degrade + ışık yansıması şeritleri (verilen x'lerde) */
export function water(g: Ctx, w: number, y0: number, y1: number, top: string, bot: string, glints: [number, string, number][], rnd: Rnd): void {
  g.fillStyle = lin(g, 0, y0, 0, y1, [
    [0, top],
    [1, bot],
  ]);
  g.fillRect(0, y0, w, y1 - y0);
  for (const [x, col, spread] of glints) {
    for (let y = y0 + 1; y < y1; y += 2 + rnd() * 2.5) {
      const t = (y - y0) / (y1 - y0);
      const len = spread * (0.3 + rnd() * 0.9) * (1 + t);
      g.fillStyle = col;
      g.globalAlpha = 0.25 + rnd() * 0.55 * (1 - t * 0.5);
      g.fillRect(x - len / 2 + (rnd() - 0.5) * spread * 0.6, y, len, 1 + rnd() * 1.2);
    }
  }
  g.globalAlpha = 1;
}

export function stars(g: Ctx, w: number, h: number, n: number, rnd: Rnd): void {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = 0.4 + Math.pow(rnd(), 3) * 1.6;
    g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.6})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    if (r > 1.5) sparkle(g, x, y, r * 3.2, 'rgba(255,255,255,0.6)', 0.18);
  }
}

/** Hilal: dolu disk + kaydırılmış gölge diskiyle kesilir (gökyüzü renginde değil, gerçek kesme) */
export function crescent(g: Ctx, x: number, y: number, r: number, col = '#fff3c8'): void {
  glow(g, x, y, r * 3.2, [255, 230, 160], 0.35);
  const [c, cg] = makeCanvas(r * 2 + 4, r * 2 + 4);
  const C = r + 2;
  cg.fillStyle = col;
  cg.beginPath();
  cg.arc(C, C, r, 0, Math.PI * 2);
  cg.fill();
  cg.globalCompositeOperation = 'destination-out';
  cg.beginPath();
  cg.arc(C + r * 0.42, C - r * 0.2, r * 0.86, 0, Math.PI * 2);
  cg.fill();
  g.drawImage(c, x - C, y - C);
}

// ───────────────────────── boyamalar ─────────────────────────
/** Kart yüzü zemini: gece mavisi, yıldızlar, hafif ay ışığı */
function paintNight(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  const rnd = mulberry(1453);
  g.fillStyle = lin(g, 0, 0, 0, PH, [
    [0, '#0a1036'],
    [0.55, '#142060'],
    [1, '#1c1c58'],
  ]);
  g.fillRect(0, 0, PW, PH);
  glow(g, PW * 0.5, PH * 0.45, PW * 0.75, [110, 140, 255], 0.22, 1, 1.3);
  stars(g, PW, PH, 70, rnd);
  // alt kenarda çok koyu, silik şehir silueti (köşe dizini önünde okunur kalsın diye soluk)
  const by = PH * 0.965;
  g.globalAlpha = 0.5;
  yalilar(g, -10, PW + 10, by, PW * 0.05, '#0c1238', rnd, 0.25);
  galata(g, PW * 0.6, by, PW * 0.24, '#0c1238', false);
  g.globalAlpha = 1;
  return c;
}

/** Takım penceresi: takım şeklinde kırpılmış küçük İstanbul manzarası + altın çerçeve. */
const WS = 240;
function* paintWindows(): Job<Record<Suit, HTMLCanvasElement>> {
  const out = {} as Record<Suit, HTMLCanvasElement>;
  for (const s of ['S', 'H', 'D', 'C'] as Suit[]) {
    const [c, g] = makeCanvas(WS, WS);
    const rnd = mulberry(70 + 'SHDC'.indexOf(s));
    const k = WS * 0.8, C = WS / 2;
    g.setTransform(k, 0, 0, k, C, C);
    const path = suitPath(s);
    g.save();
    g.clip(path);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const red = isRed(s);
    const hz = WS * 0.7;
    if (red) {
      g.fillStyle = lin(g, 0, WS * 0.1, 0, hz, [
        [0, '#7a0f3a'],
        [0.5, '#e0304a'],
        [0.85, '#ff8a4a'],
        [1, '#ffc46a'],
      ]);
      g.fillRect(0, 0, WS, WS);
      glow(g, WS * 0.62, hz, WS * 0.3, [255, 220, 140], 0.9);
      g.fillStyle = '#fff2c0';
      g.beginPath();
      g.arc(WS * 0.62, hz - 2, WS * 0.07, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = lin(g, 0, 0, 0, hz, [
        [0, '#060a26'],
        [0.6, '#16247a'],
        [1, '#3a4aa8'],
      ]);
      g.fillRect(0, 0, WS, WS);
      stars(g, WS, hz, 26, rnd);
      crescent(g, WS * 0.66, WS * 0.3, WS * 0.07);
    }
    const sil = red ? '#3a0a24' : '#04061c';
    water(g, WS, hz, WS, red ? '#7a1a3a' : '#0a1450', red ? '#2a0618' : '#02041a', red ? [[WS * 0.62, 'rgba(255,200,120,1)', WS * 0.12]] : [[WS * 0.66, 'rgba(255,240,190,1)', WS * 0.08]], rnd);
    yalilar(g, -4, WS + 4, hz, WS * 0.06, sil, rnd, red ? 0.25 : 0.55);
    galata(g, WS * (s === 'S' || s === 'D' ? 0.32 : 0.7), hz, WS * 0.42, sil, !red);
    if (s === 'C' || s === 'D') kizKulesi(g, WS * (s === 'C' ? 0.3 : 0.75), hz + WS * 0.03, WS * 0.14, sil, !red);
    g.restore();
    // iç gölge + cam parlaması
    g.setTransform(k, 0, 0, k, C, C);
    g.save();
    g.clip(path);
    g.fillStyle = rad(g, -0.18, -0.25, 0.02, 0.8, [
      [0, 'rgba(255,255,255,0.22)'],
      [0.4, 'rgba(255,255,255,0)'],
      [1, 'rgba(0,0,20,0.35)'],
    ]);
    g.fillRect(-1, -1, 2, 2);
    g.restore();
    const o = suitOutline(s);
    g.lineJoin = 'round';
    g.lineWidth = 0.075;
    g.strokeStyle = '#1a1004';
    g.stroke(o);
    g.lineWidth = 0.045;
    g.strokeStyle = gold(g, -0.5, -0.55, 0.5, 0.55);
    g.stroke(o);
    g.setTransform(1, 0, 0, 1, 0, 0);
    out[s] = c;
    if (due()) yield;
  }
  return out;
}

/** Dolunay (As): kraterli disk, ışık halesi */
function paintMoon(): HTMLCanvasElement {
  const S = 320, C = S / 2, R = S * 0.36;
  const [c, g] = makeCanvas(S, S);
  const rnd = mulberry(29);
  glow(g, C, C, C, [180, 200, 255], 0.5);
  g.fillStyle = rad(g, C - R * 0.3, C - R * 0.35, 0, R * 1.2, [
    [0, '#fffdf2'],
    [0.6, '#f0ecd8'],
    [1, '#c9c3ac'],
  ]);
  g.beginPath();
  g.arc(C, C, R, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.clip();
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, d = R * Math.sqrt(rnd()) * 0.9, r = R * (0.05 + rnd() * 0.14);
    g.fillStyle = `rgba(150,140,120,${0.12 + rnd() * 0.18})`;
    g.beginPath();
    g.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, r, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = rad(g, C + R * 0.5, C + R * 0.5, R * 0.3, R * 1.4, [
    [0, 'rgba(60,70,120,0)'],
    [1, 'rgba(60,70,120,0.35)'],
  ]);
  g.fillRect(0, 0, S, S);
  g.restore();
  return c;
}

const CW = 240, CH = 350, PAD = 14;
/** Sivri (Osmanlı) kemer */
function ogee(x: number, y: number, w: number, h: number): Path2D {
  const p = new Path2D();
  const r = w / 2;
  p.moveTo(x, y + h);
  p.lineTo(x, y + r * 1.1);
  p.bezierCurveTo(x, y + r * 0.35, x + r * 0.7, y + r * 0.2, x + r, y);
  p.bezierCurveTo(x + r * 1.3, y + r * 0.2, x + w, y + r * 0.35, x + w, y + r * 1.1);
  p.lineTo(x + w, y + h);
  p.closePath();
  return p;
}
function* paintCourt(kind: 'K' | 'Q' | 'J'): Job<HTMLCanvasElement> {
  const [c, g] = makeCanvas(CW, CH);
  const rnd = mulberry(kind.charCodeAt(0) * 3);
  const inner = ogee(PAD, PAD, CW - 2 * PAD, CH - 2 * PAD);
  g.save();
  g.clip(inner);
  const hz = CH * 0.74;
  g.fillStyle = lin(g, 0, 0, 0, hz, [
    [0, '#050822'],
    [0.6, '#14206a'],
    [1, kind === 'J' ? '#5a3a9a' : '#2c3c9a'],
  ]);
  g.fillRect(0, 0, CW, CH);
  stars(g, CW, hz, 40, rnd);
  const sil = '#03051a';
  if (kind === 'K') {
    crescent(g, CW * 0.74, CH * 0.2, CW * 0.075);
    water(g, CW, hz, CH, '#0c1650', '#02041a', [[CW * 0.5, 'rgba(255,214,120,1)', CW * 0.1]], rnd);
    yalilar(g, -4, CW + 4, hz, CW * 0.07, sil, rnd, 0.6);
    // kulenin arkasında ışık
    glow(g, CW * 0.5, hz - CH * 0.3, CW * 0.45, [255, 200, 110], 0.35);
    galata(g, CW * 0.5, hz + 2, CH * 0.62, sil, true);
  } else if (kind === 'Q') {
    // dolunay ve Kız Kulesi, suda uzun yansıma
    const mx = CW * 0.5, my = CH * 0.3;
    glow(g, mx, my, CW * 0.55, [200, 210, 255], 0.4);
    g.fillStyle = rad(g, mx - 10, my - 12, 0, CW * 0.2, [
      [0, '#fffdf2'],
      [1, '#d8d2bc'],
    ]);
    g.beginPath();
    g.arc(mx, my, CW * 0.17, 0, Math.PI * 2);
    g.fill();
    water(g, CW, hz, CH, '#101a5a', '#02041a', [[mx, 'rgba(240,240,255,1)', CW * 0.2]], rnd);
    yalilar(g, -4, CW * 0.22, hz, CW * 0.05, sil, rnd, 0.5);
    yalilar(g, CW * 0.84, CW + 4, hz, CW * 0.05, sil, rnd, 0.5);
    kizKulesi(g, CW * 0.48, hz + CH * 0.03, CH * 0.4, sil, true);
    // fener hüzmesi
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = lin(g, CW * 0.55, 0, CW, 0, [
      [0, 'rgba(255,240,180,0.35)'],
      [1, 'rgba(255,240,180,0)'],
    ]);
    const ly = hz + CH * 0.03 - CH * 0.4 * 0.85;
    g.beginPath();
    g.moveTo(CW * 0.55, ly);
    g.lineTo(CW, ly - CH * 0.08);
    g.lineTo(CW, ly + CH * 0.05);
    g.closePath();
    g.fill();
    g.restore();
  } else {
    // Boğaz Köprüsü renkli ışıklarla + altında vapur
    crescent(g, CW * 0.22, CH * 0.18, CW * 0.06);
    water(g, CW, hz, CH, '#1a1460', '#02041a', [[CW * 0.3, 'rgba(255,90,180,1)', CW * 0.1], [CW * 0.7, 'rgba(90,210,255,1)', CW * 0.1], [CW * 0.5, 'rgba(255,214,120,1)', CW * 0.1]], rnd);
    bridge(g, -CW * 0.15, CW * 1.15, hz - CH * 0.12, CH * 0.36, sil, true, rnd);
    yalilar(g, -4, CW + 4, hz, CW * 0.05, sil, rnd, 0.5);
    vapur(g, CW * 0.5, hz + CH * 0.1, CW * 0.6);
  }
  g.restore();
  if (due()) yield;
  // altın kemer çerçeve
  g.lineJoin = 'round';
  g.lineWidth = PAD * 0.9;
  g.strokeStyle = gold(g, 0, 0, CW, CH);
  g.stroke(ogee(PAD * 0.5, PAD * 0.5, CW - PAD, CH - PAD));
  g.lineWidth = 1.8;
  g.strokeStyle = '#1a1004';
  g.stroke(inner);
  g.stroke(ogee(1.5, 1.5, CW - 3, CH - 3));
  // kemer tepesinde küçük alem yerine yıldız
  sparkle(g, CW / 2, PAD * 0.45, 9, '#fff6d0', 0.25);
  return c;
}

function* paintBack(): Job<HTMLCanvasElement> {
  const [c, g] = makeCanvas(PW, PH);
  const rnd = mulberry(1923);
  const hz = PH * 0.68;
  g.fillStyle = lin(g, 0, 0, 0, hz, [
    [0, '#04071e'],
    [0.5, '#101a5c'],
    [0.85, '#3a3a9a'],
    [1, '#8a5aa8'],
  ]);
  g.fillRect(0, 0, PW, PH);
  stars(g, PW, hz * 0.9, 120, rnd);
  crescent(g, PW * 0.76, PH * 0.16, PW * 0.085);
  if (due()) yield;
  const sil = '#05071e';
  water(g, PW, hz, PH, '#1a1a6a', '#02041a', [[PW * 0.76, 'rgba(255,240,190,1)', PW * 0.12], [PW * 0.32, 'rgba(255,214,120,1)', PW * 0.08], [PW * 0.6, 'rgba(255,90,180,1)', PW * 0.06]], rnd);
  // uzak kıyı (soluk mor)
  yalilar(g, -10, PW + 10, hz - PH * 0.005, PW * 0.04, '#2a2a70', rnd, 0.35);
  bridge(g, PW * 0.38, PW * 1.3, hz - PH * 0.06, PH * 0.15, '#1a1a52', true, rnd);
  if (due()) yield;
  yalilar(g, -10, PW * 0.6, hz, PW * 0.06, sil, rnd, 0.6);
  galata(g, PW * 0.28, hz + 2, PH * 0.42, sil, true);
  kizKulesi(g, PW * 0.7, hz + PH * 0.05, PH * 0.14, sil, true);
  vapur(g, PW * 0.42, hz + PH * 0.19, PW * 0.4);
  // martılar
  g.strokeStyle = 'rgba(230,236,255,0.85)';
  g.lineWidth = 1.6;
  for (const [x, y, s] of [[0.5, 0.3, 9], [0.58, 0.26, 7], [0.44, 0.36, 6]] as const) {
    g.beginPath();
    g.moveTo(PW * x - s, PH * y);
    g.quadraticCurveTo(PW * x - s * 0.5, PH * y - s * 0.6, PW * x, PH * y);
    g.quadraticCurveTo(PW * x + s * 0.5, PH * y - s * 0.6, PW * x + s, PH * y);
    g.stroke();
  }
  return c;
}

function* paintAll(): Job<Art> {
  const night = paintNight();
  if (due()) yield;
  const win = yield* paintWindows();
  const moon = paintMoon();
  if (due()) yield;
  const court: Record<number, HTMLCanvasElement> = {};
  court[13] = yield* paintCourt('K');
  court[12] = yield* paintCourt('Q');
  court[11] = yield* paintCourt('J');
  const back = yield* paintBack();
  RF.measure();
  return {night, win, moon, court, back};
}

// ───────────────────────── kart çizimi ─────────────────────────
const ink = (s: Suit): string => (isRed(s) ? CORAL : SNOW);
const pipDraw = (g: Ctx, s: Suit, cx: number, cy: number, size: number): void =>
  withSuit(g, s, cx, cy, size, p => {
    g.fillStyle = ink(s);
    g.fill(p);
  });

function face(g: Ctx, w: number, h: number, s: Suit, r: number, a: Art): void {
  g.save();
  g.clip(cardPath(w, h));
  g.drawImage(a.night, 0, 0, w, h);
  // ince altın çerçeve (iki çizgi)
  const m = 0.04 * w;
  g.lineWidth = 0.012 * w;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(rrPath(m, m, w - 2 * m, h - 2 * m, 0.05 * w));
  g.lineWidth = Math.max(0.6, 0.004 * w);
  g.strokeStyle = 'rgba(240,200,110,0.6)';
  g.stroke(rrPath(m + 0.018 * w, m + 0.018 * w, w - 2 * m - 0.036 * w, h - 2 * m - 0.036 * w, 0.04 * w));
  const cx = w / 2, cy = h / 2;
  if (r === 1) {
    const d = 0.9 * w;
    g.drawImage(a.moon, cx - d / 2, cy - d / 2, d, d);
    withSuit(g, s, cx, cy, 0.3 * w, p => {
      g.fillStyle = isRed(s) ? '#c8102e' : '#0a1036';
      g.fill(p);
      g.lineWidth = 0.05;
      g.strokeStyle = gold(g, -0.5, -0.5, 0.5, 0.5);
      g.stroke(p);
    });
  } else if (r >= 11) {
    const dw = 0.58 * w, dh = (dw * CH) / CW;
    g.drawImage(a.court[r], cx - dw / 2, cy - dh / 2 + 0.01 * w, dw, dh);
    const ey = cy + dh / 2 + 0.005 * w;
    g.beginPath();
    g.arc(cx, ey, 0.055 * w, 0, Math.PI * 2);
    g.fillStyle = '#0a1036';
    g.fill();
    g.lineWidth = 0.012 * w;
    g.strokeStyle = gold(g, cx - 0.05 * w, ey - 0.05 * w, cx + 0.05 * w, ey + 0.05 * w);
    g.stroke();
    pipDraw(g, s, cx, ey + 0.002 * w, 0.062 * w);
  } else {
    const sz = 0.52 * w, d = sz / 0.8;
    g.drawImage(a.win[s], cx - d / 2, cy - d / 2, d, d);
    const capH = 0.15 * w;
    RF.draw(g, String(r), cx, cy + SUIT_TY[s] * sz - capH / 2 - 0.02 * w, capH, 0.25 * w, '#ffffff', 'rgba(6,8,30,0.9)', 0.035 * w);
  }
  corners(g, w, h, s, r, {
    font: RF,
    x: 0.2,
    top: 0.075,
    cap: 0.245,
    pip: 0.165,
    gap: 0.05,
    wide: 0.3,
    rank: (gg, t, x, top, cap, maxW, su) => RF.draw(gg, t, x, top, cap, maxW, ink(su), 'rgba(4,6,30,0.85)', cap * 0.1),
    pipDraw,
  });
  g.restore();
  edge(g, w, h, 'rgba(0,0,10,0.85)');
}

function back(g: Ctx, w: number, h: number, a: Art): void {
  g.save();
  const card = cardPath(w, h);
  g.clip(card);
  g.drawImage(a.back, 0, 0, w, h);
  g.lineWidth = 0.05 * w;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(card);
  g.lineWidth = 0.008 * w;
  g.strokeStyle = 'rgba(10,6,0,0.85)';
  g.stroke(cardPath(w, h, 0.025 * w));
  g.lineWidth = Math.max(0.6, 0.005 * w);
  g.strokeStyle = 'rgba(255,226,150,0.85)';
  g.stroke(cardPath(w, h, 0.048 * w));
  g.restore();
}

export const skin = defineSkin<Art>({
  id: 'bogaz',
  name: 'Boğaz Gecesi',
  desc: 'Galata, Kız Kulesi ve ışıklı köprü: İstanbul\'da ay ışığı.',
  fonts: () => loadFont(() => import('@fontsource/playfair-display/900.css'), `900 100px "Playfair Display"`),
  paint: paintAll,
  face,
  back,
});
