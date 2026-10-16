// Sahne eskizleri (yağlı boya işleyicinin "referans" çizimleri): İstanbul ve Kapadokya parçaları.
// Masalar (src/themes/bogaz.ts, kapadokya.ts) ve desteler (src/skins/bogaz.ts, kapadokya.ts) aynı eskizlerden boyar.
// Bunlar son görüntü değildir: src/themes/oil.ts darbeleri bu eskizden renk ve biçim alır.
import {css, glow, lin, makeCanvas, mix, rad, rrPath, type Ctx, type RGB, type Rnd} from '../skins/kit';

const WIN: RGB = [255, 214, 120];

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

/**
 * Galata Kulesi (eskiz): gece projektörle aydınlanan kalın taş silindir gövde (taş sıraları, kemerli pencereler),
 * kemerli seyir galerisi, koyu konik külah ve alem. x = eksen, by = taban, h = toplam yükseklik.
 */
export function galataTower(r: Ctx, x: number, by: number, h: number, lit = true): void {
  const bodyH = h * 0.6, bw = h * 0.125; // gövde yarı genişliği (kalın)
  const top = by - bodyH;
  // gövde: soldan sıcak ışık, sağda gölge
  const gr = r.createLinearGradient(x - bw, 0, x + bw, 0);
  gr.addColorStop(0, lit ? '#f0c27e' : '#2a2a4a');
  gr.addColorStop(0.45, lit ? '#c8925e' : '#20203e');
  gr.addColorStop(1, lit ? '#6a4a52' : '#121228');
  r.fillStyle = gr;
  r.beginPath();
  r.moveTo(x - bw * 1.08, by);
  r.lineTo(x - bw, top);
  r.lineTo(x + bw, top);
  r.lineTo(x + bw * 1.08, by);
  r.closePath();
  r.fill();
  // taş sıraları
  r.strokeStyle = 'rgba(70,40,40,.35)';
  r.lineWidth = Math.max(0.6, h * 0.006);
  for (let y = top + bodyH * 0.08; y < by; y += bodyH * 0.07) {
    r.beginPath();
    r.moveTo(x - bw * 1.05, y);
    r.lineTo(x + bw * 1.05, y);
    r.stroke();
  }
  // kemerli pencereler (gövde ekseninde iki sütun)
  r.fillStyle = lit ? '#3a2430' : '#ffd890';
  for (let i = 0; i < 4; i++) {
    const wy = top + bodyH * (0.18 + i * 0.2);
    for (const dx of [-0.4, 0.25]) {
      const wx = x + dx * bw, ww = bw * 0.16, wh = bodyH * 0.07;
      r.beginPath();
      r.moveTo(wx - ww, wy + wh);
      r.lineTo(wx - ww, wy);
      r.arc(wx, wy, ww, Math.PI, 0);
      r.lineTo(wx + ww, wy + wh);
      r.fill();
    }
  }
  // seyir galerisi: biraz taşan çıkma + ışıklı kemerler
  const gH = h * 0.1, gy = top - gH;
  r.fillStyle = lit ? '#b98058' : '#1c1c38';
  r.fillRect(x - bw * 1.12, top - h * 0.012, bw * 2.24, h * 0.024);
  r.fillStyle = lit ? '#a8704e' : '#1c1c38';
  r.fillRect(x - bw * 0.98, gy, bw * 1.96, gH);
  r.fillStyle = '#fff0b8';
  for (let i = -3; i <= 3; i++) {
    const ax = x + i * bw * 0.27, aw = bw * 0.09;
    r.beginPath();
    r.moveTo(ax - aw, gy + gH * 0.85);
    r.lineTo(ax - aw, gy + gH * 0.35);
    r.arc(ax, gy + gH * 0.35, aw, Math.PI, 0);
    r.lineTo(ax + aw, gy + gH * 0.85);
    r.fill();
  }
  // konik külah (koyu kurşun) + aydınlık sol kenar + alem
  const cH = h * 0.3;
  r.fillStyle = '#1c1a30';
  r.beginPath();
  r.moveTo(x - bw * 1.05, gy);
  r.lineTo(x, gy - cH);
  r.lineTo(x + bw * 1.05, gy);
  r.closePath();
  r.fill();
  r.fillStyle = 'rgba(200,170,150,.7)';
  r.beginPath();
  r.moveTo(x - bw * 1.05, gy);
  r.lineTo(x, gy - cH);
  r.lineTo(x - bw * 0.35, gy);
  r.closePath();
  r.fill();
  r.strokeStyle = '#e8c070';
  r.lineWidth = Math.max(0.8, h * 0.01);
  r.beginPath();
  r.moveTo(x, gy - cH);
  r.lineTo(x, gy - cH - h * 0.05);
  r.stroke();
}

/** Birim yolu (path) dilimli balon zarfına çevirir: dilimler, küre gölgesi, parlak yansıma, ince kontur. */
export function envelope(g: Ctx, path: Path2D, cols: readonly string[], n = 7, ink = 'rgba(30,14,40,0.85)'): void {
  g.save();
  g.clip(path);
  // dilimler: kürenin meridyenleri (üstte ve altta birleşir)
  for (let i = 0; i < n; i++) {
    const u0 = -1 + (2 * i) / n, u1 = -1 + (2 * (i + 1)) / n;
    g.beginPath();
    const Y0 = -0.64, Y1 = 0.64, steps = 16;
    for (let k = 0; k <= steps; k++) {
      const y = Y0 + ((Y1 - Y0) * k) / steps;
      const hw = 0.56 * Math.sqrt(Math.max(0, 1 - (y / 0.64) ** 2));
      g.lineTo(u0 * hw, y);
    }
    for (let k = steps; k >= 0; k--) {
      const y = Y0 + ((Y1 - Y0) * k) / steps;
      const hw = 0.56 * Math.sqrt(Math.max(0, 1 - (y / 0.64) ** 2));
      g.lineTo(u1 * hw, y);
    }
    g.closePath();
    g.fillStyle = cols[i % cols.length];
    g.fill();
  }
  // dilim dikişleri
  g.strokeStyle = 'rgba(40,20,40,0.22)';
  g.lineWidth = 0.012;
  for (let i = 1; i < n; i++) {
    const u = -1 + (2 * i) / n;
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const y = -0.64 + (1.28 * k) / 16;
      g.lineTo(u * 0.56 * Math.sqrt(Math.max(0, 1 - (y / 0.64) ** 2)), y);
    }
    g.stroke();
  }
  // küre gölgesi + yansıma
  g.fillStyle = rad(g, -0.16, -0.22, 0.05, 0.75, [
    [0, 'rgba(255,255,255,0.42)'],
    [0.35, 'rgba(255,255,255,0.08)'],
    [0.7, 'rgba(40,10,40,0.12)'],
    [1, 'rgba(40,10,40,0.45)'],
  ]);
  g.fillRect(-1, -1, 2, 2);
  g.fillStyle = lin(g, -0.6, 0, 0.6, 0, [
    [0, 'rgba(255,220,180,0.12)'],
    [0.6, 'rgba(0,0,0,0)'],
    [1, 'rgba(30,0,40,0.28)'],
  ]);
  g.fillRect(-1, -1, 2, 2);
  g.restore();
  g.lineJoin = 'round';
  g.lineWidth = 0.035;
  g.strokeStyle = ink;
  g.stroke(path);
}

/** Halatlar + hasır sepet: (x0,x1) halat üst uçları (aynı y), sepet `by` altında. Birim koordinatlar. */
export function basket(g: Ctx, x0: number, x1: number, y: number, len: number, w: number): void {
  const bx = 0, top = y + len, bh = w * 0.62;
  g.strokeStyle = 'rgba(60,32,20,0.9)';
  g.lineWidth = 0.016;
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(bx - w * 0.46, top);
  g.moveTo(x1, y);
  g.lineTo(bx + w * 0.46, top);
  g.moveTo((x0 * 2 + x1) / 3, y);
  g.lineTo(bx - w * 0.16, top);
  g.moveTo((x0 + x1 * 2) / 3, y);
  g.lineTo(bx + w * 0.16, top);
  g.stroke();
  const p = new Path2D();
  p.moveTo(bx - w / 2, top);
  p.lineTo(bx + w / 2, top);
  p.lineTo(bx + w * 0.42, top + bh);
  p.lineTo(bx - w * 0.42, top + bh);
  p.closePath();
  g.fillStyle = lin(g, 0, top, 0, top + bh, [
    [0, '#c98a46'],
    [1, '#7a4a20'],
  ]);
  g.fill(p);
  g.save();
  g.clip(p);
  g.strokeStyle = 'rgba(70,36,10,0.55)';
  g.lineWidth = 0.012;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(bx - w / 2, top + (bh * i) / 4);
    g.lineTo(bx + w / 2, top + (bh * i) / 4);
    g.stroke();
  }
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(bx + (i * w) / 7, top);
    g.lineTo(bx + (i * w * 0.85) / 7, top + bh);
    g.stroke();
  }
  g.restore();
  g.fillStyle = '#5a3216';
  g.fill(rrPath(bx - w * 0.54, top - w * 0.06, w * 1.08, w * 0.13, w * 0.06));
  g.lineWidth = 0.02;
  g.strokeStyle = 'rgba(40,20,10,0.9)';
  g.stroke(p);
}

/** Klasik balon zarfı (birim yol): yuvarlak tepe, aşağı daralan gövde, ağız (etek) */
export function classicPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.62);
  p.bezierCurveTo(0.36, -0.62, 0.56, -0.38, 0.54, -0.1);
  p.bezierCurveTo(0.52, 0.16, 0.3, 0.32, 0.14, 0.46);
  p.lineTo(0.1, 0.56);
  p.lineTo(-0.1, 0.56);
  p.lineTo(-0.14, 0.46);
  p.bezierCurveTo(-0.3, 0.32, -0.52, 0.16, -0.54, -0.1);
  p.bezierCurveTo(-0.56, -0.38, -0.36, -0.62, 0, -0.62);
  p.closePath();
  return p;
}

export const BALLOON_SETS: string[][] = [
  ['#e8173f', '#ffd23a'],
  ['#2fa7e0', '#ffffff'],
  ['#7a3fc8', '#ffb43a'],
  ['#18b06a', '#fff1c8'],
  ['#ff6a1f', '#3a2a8c'],
  ['#ff4fa0', '#ffffff'],
  ['#ffd23a', '#e8173f', '#2fa7e0'],
];

let CLASSIC: Path2D | null = null;

/** Klasik balon (küçük, uzak): x,y zarf merkezi, r yarı boy, alpha uzaklık sisi */
export function smallBalloon(g: Ctx, x: number, y: number, r: number, cols: readonly string[], haze: number, hazeCol: RGB): void {
  CLASSIC ??= classicPath();
  g.save();
  g.translate(x, y);
  g.scale(r, r);
  basket(g, -0.1, 0.1, 0.56, 0.18, 0.22);
  envelope(g, CLASSIC, cols, 7, 'rgba(40,20,40,0.5)');
  if (haze > 0) {
    g.globalAlpha = haze;
    g.fillStyle = css(hazeCol);
    g.fill(CLASSIC);
    g.fillRect(-0.15, 0.56, 0.3, 0.32);
  }
  g.restore();
}

/** Arka sırt: ufukta yumuşak, gül rengi tepe çizgisi */
export function ridge(r: Ctx, by: number, h: number): void {
  const W = r.canvas.width / r.getTransform().a;
  r.fillStyle = '#c47a8a';
  r.beginPath();
  r.moveTo(-10, by + h);
  for (let x = -10; x <= W + 10; x += 6) r.lineTo(x, by - h * (0.5 + 0.5 * Math.sin(x * 0.02) * Math.sin(x * 0.007 + 1)));
  r.lineTo(W + 10, by + h);
  r.fill();
}

/** Peri bacası kümesi (eskiz): ince uzun koni, solu güneşe dönük açık şeftali, sağı gölgede leylak-kahve, koyu bazalt şapka */
export function fairy(r: Ctx, rnd: () => number, x0: number, x1: number, by: number, h: number, w: number, fade = 1, idCol?: string): void {
  r.save();
  r.globalAlpha = fade;
  let x = x0;
  while (x < x1) {
    const hh = h * (0.55 + rnd() * 0.45), ww = w * (0.75 + rnd() * 0.4), top = by - hh, neck = ww * 0.36;
    const body = new Path2D();
    body.moveTo(x - ww, by);
    body.bezierCurveTo(x - ww * 0.7, by - hh * 0.35, x - neck * 1.3, top + hh * 0.3, x - neck, top + ww * 0.1);
    body.lineTo(x + neck, top + ww * 0.1);
    body.bezierCurveTo(x + neck * 1.3, top + hh * 0.3, x + ww * 0.7, by - hh * 0.35, x + ww, by);
    body.closePath();
    if (idCol) {
      r.fillStyle = idCol;
      r.fill(body);
      r.beginPath();
      r.ellipse(x, top + ww * 0.12, neck * 1.75, ww * 0.3, 0, Math.PI, 0);
      r.fill();
      x += ww * (1.7 + rnd() * 1.1);
      continue;
    }
    const gr = r.createLinearGradient(x - ww, 0, x + ww, 0);
    gr.addColorStop(0, '#ffdcaa');
    gr.addColorStop(0.4, '#f4a874');
    gr.addColorStop(0.62, '#a8609a');
    gr.addColorStop(1, '#5a3a7e');
    r.fillStyle = gr;
    r.fill(body);
    r.fillStyle = '#3e2034';
    r.beginPath();
    r.ellipse(x, top + ww * 0.12, neck * 1.75, ww * 0.3, 0, Math.PI, 0);
    r.lineTo(x + neck * 1.75, top + ww * 0.2);
    r.lineTo(x - neck * 1.75, top + ww * 0.2);
    r.fill();
    // sağ kenarda koyu gölge çizgisi (biçim okunur kalsın)
    r.strokeStyle = 'rgba(60,24,50,.55)';
    r.lineWidth = ww * 0.12;
    r.beginPath();
    r.moveTo(x + neck * 0.9, top + ww * 0.25);
    r.bezierCurveTo(x + neck * 1.3, top + hh * 0.35, x + ww * 0.65, by - hh * 0.35, x + ww * 0.95, by);
    r.stroke();
    if (rnd() < 0.7) {
      r.fillStyle = '#4a2440';
      for (let k = 0; k < 2; k++) {
        r.beginPath();
        r.ellipse(x + (rnd() - 0.3) * ww * 0.6, by - hh * (0.2 + rnd() * 0.35), ww * 0.08, ww * 0.12, 0, 0, Math.PI * 2);
        r.fill();
      }
    }
    x += ww * (1.7 + rnd() * 1.1);
  }
  r.restore();
}
