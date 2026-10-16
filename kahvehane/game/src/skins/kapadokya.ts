// Deste "Kapadokya Şafağı": gün doğarken peri bacalarının üstünde süzülen sıcak hava balonları.
//   · sayılar: takım şeklinde balon (renkli dilimler, küre ışığı, halatlar, hasır sepet), zarfın ortasında değer rozeti
//   · As: doğan güneşin önünde dev takım balonu, çevresinde uzak balonlar
//   · saray kartları kaya kemerli pencerede: Papaz = taçlı mor-altın balon, Kız = lale desenli pembe balon,
//     Vale = dört renk dilimli balon (Pişti'nin güç kartı)
//   · arka: mor-pembe-turuncu şafak göğü, ufukta güneş, katman katman peri bacaları, onlarca balon
import {
  cardPath, clamp, corners, defineSkin, edge, glow, gold, grain, lin, loadFont, makeCanvas, mix, mulberry, rad, RankFont, rrPath, css, sparkle,
  suitPath, withSuit, due, isRed, type Ctx, type Job, type RGB, type Rnd, type Suit,
} from './kit';

const FONT = (px: number): string => `400 ${px}px "Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif`;
const RF = new RankFont(FONT);
const PW = 360, PH = Math.round(PW / 0.7);
const RED = '#d4143f', PLUM = '#2b1d5c';

/** Takım balonlarının dilim renkleri (ilk renk baskın) */
const GORE: Record<Suit, string[]> = {
  H: ['#e8173f', '#ffffff', '#e8173f', '#ffc93c'],
  D: ['#ff6a1f', '#ffd23a', '#e8173f', '#ffd23a'],
  S: ['#3a2a8c', '#2fc3c8', '#3a2a8c', '#f4eaff'],
  C: ['#21327a', '#3fd17a', '#21327a', '#ffffff'],
};

interface Art {
  border: HTMLCanvasElement;
  sky: HTMLCanvasElement;
  big: Record<Suit, HTMLCanvasElement>;
  sun: HTMLCanvasElement;
  court: Record<number, HTMLCanvasElement>;
  back: HTMLCanvasElement;
}

// ───────────────────────── balon ─────────────────────────
/** Birim yolu (path) dilimli balon zarfına çevirir: dilimler, küre gölgesi, parlak yansıma, ince kontur. */
function envelope(g: Ctx, path: Path2D, cols: readonly string[], n = 7, ink = 'rgba(30,14,40,0.85)'): void {
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
function basket(g: Ctx, x0: number, x1: number, y: number, len: number, w: number): void {
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
function classicPath(): Path2D {
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

/** Takım balonu: zarf = takım şekli, altta halatlar ve sepet. Birim uzayda çizer (merkez 0,0). */
function suitBalloon(g: Ctx, s: Suit): void {
  const p = suitPath(s);
  const y = s === 'H' ? 0.47 : s === 'D' ? 0.58 : 0.54;
  const [x0, x1] = s === 'H' || s === 'D' ? [-0.03, 0.03] : [-0.2, 0.2];
  basket(g, x0, x1, y - 0.01, 0.13, 0.24);
  envelope(g, p, GORE[s], s === 'D' ? 6 : 7);
}

// ───────────────────────── manzara ─────────────────────────
/** Peri bacaları sırası: taban `by`, en yüksek `h`, renk; ince uzun koniler, küçük koyu bazalt şapkalar, oyma pencereler */
export function chimneys(g: Ctx, x0: number, x1: number, by: number, h: number, col: RGB, cap: RGB, rnd: Rnd, holes = false): void {
  // yumuşak kaya tepeleri (tabanı doldurur)
  g.fillStyle = css(mix(col, [40, 10, 30], 0.08));
  g.beginPath();
  g.moveTo(x0, by + h);
  const ph = rnd() * 6;
  for (let x = x0; x <= x1 + 1; x += (x1 - x0) / 30) g.lineTo(x, by - h * (0.16 + 0.1 * Math.sin(x * (6 / (x1 - x0)) + ph) + 0.05 * Math.sin(x * (17 / (x1 - x0)))));
  g.lineTo(x1, by + h);
  g.closePath();
  g.fill();
  const cone = (x: number, hh: number, ww: number): void => {
    const top = by - hh, neck = ww * 0.22;
    const lean = (rnd() - 0.5) * ww * 0.3;
    const body = new Path2D();
    body.moveTo(x - ww, by);
    body.bezierCurveTo(x - ww * 0.55, by - hh * 0.25, x - neck * 1.6 + lean, top + hh * 0.35, x - neck + lean, top + ww * 0.12);
    body.lineTo(x + neck + lean, top + ww * 0.12);
    body.bezierCurveTo(x + neck * 1.6 + lean, top + hh * 0.35, x + ww * 0.55, by - hh * 0.25, x + ww, by);
    body.closePath();
    g.fillStyle = lin(g, x - ww, 0, x + ww, 0, [
      [0, css(mix(col, [255, 226, 200], 0.16))],
      [0.45, css(col)],
      [1, css(mix(col, [30, 6, 26], 0.22))],
    ]);
    g.fill(body);
    // dikey erozyon çizgileri
    g.strokeStyle = css(mix(col, [30, 6, 26], 0.3), 0.35);
    g.lineWidth = Math.max(0.6, ww * 0.04);
    for (let k = 0; k < 3; k++) {
      const u = (rnd() - 0.5) * 1.1;
      g.beginPath();
      g.moveTo(x + u * ww * 0.8, by);
      g.quadraticCurveTo(x + u * ww * 0.5 + lean * 0.5, by - hh * 0.5, x + u * neck + lean, top + hh * 0.2);
      g.stroke();
    }
    // şapka: koyu bazalt, hafif eğik
    g.save();
    g.translate(x + lean, top + ww * 0.1);
    g.rotate((rnd() - 0.5) * 0.3);
    g.fillStyle = css(cap);
    g.beginPath();
    g.moveTo(-neck * 2.2, ww * 0.04);
    g.quadraticCurveTo(-neck * 1.6, -ww * 0.34, 0, -ww * 0.42);
    g.quadraticCurveTo(neck * 1.6, -ww * 0.34, neck * 2.2, ww * 0.04);
    g.closePath();
    g.fill();
    g.restore();
    if (holes && rnd() < 0.75) {
      g.fillStyle = css(mix(col, [24, 6, 20], 0.6));
      for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) {
        const hy = by - hh * (0.15 + rnd() * 0.35), hx = x + (rnd() - 0.5) * ww * 0.7;
        g.beginPath();
        g.moveTo(hx - ww * 0.07, hy + ww * 0.12);
        g.lineTo(hx - ww * 0.07, hy);
        g.arc(hx, hy, ww * 0.07, Math.PI, 0);
        g.lineTo(hx + ww * 0.07, hy + ww * 0.12);
        g.closePath();
        g.fill();
      }
    }
  };
  let x = x0 + rnd() * h * 0.2;
  while (x < x1 + h * 0.2) {
    const hh = h * (0.5 + rnd() * 0.55), ww = hh * (0.17 + rnd() * 0.08);
    if (rnd() < 0.3) {
      // ikiz/üçüz baca kümesi
      cone(x - ww * 0.7, hh * 0.78, ww * 0.8);
      cone(x + ww * 0.7, hh * 0.9, ww * 0.85);
    }
    cone(x, hh, ww);
    x += ww * (1.4 + rnd() * 2.2);
  }
}

/** Şafak göğü (koyu, arka yüz ve saray pencereleri için) */
export function dawnSky(g: Ctx, w: number, h: number, horizon: number): void {
  g.fillStyle = lin(g, 0, 0, 0, horizon, [
    [0, '#3d2a7a'],
    [0.35, '#8a3f9a'],
    [0.62, '#e0577f'],
    [0.82, '#ff9a5a'],
    [1, '#ffd77a'],
  ]);
  g.fillRect(0, 0, w, h);
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

/** Sahne: şafak + güneş + uzak/orta/yakın peri bacaları + balonlar */
function* landscape(g: Ctx, w: number, h: number, seed: number, nBal: number, horizonK = 0.66): Job<void> {
  const rnd = mulberry(seed);
  const hz = h * horizonK;
  dawnSky(g, w, h, hz);
  // güneş
  const sx = w * 0.62, sy = hz - h * 0.045, sr = w * 0.15;
  glow(g, sx, sy, sr * 4, [255, 200, 120], 0.55);
  g.fillStyle = rad(g, sx, sy, 0, sr, [
    [0, '#fff8d8'],
    [0.7, '#ffe08a'],
    [1, '#ffb84a'],
  ]);
  g.beginPath();
  g.arc(sx, sy, sr, 0, Math.PI * 2);
  g.fill();
  // ince bulut şeritleri
  g.fillStyle = 'rgba(255,200,210,0.35)';
  for (let i = 0; i < 6; i++) {
    const y = hz * (0.25 + rnd() * 0.6), x = rnd() * w, L = w * (0.2 + rnd() * 0.4);
    g.beginPath();
    g.ellipse(x, y, L, h * 0.006 + rnd() * h * 0.006, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (due()) yield;
  // uzak balonlar (sisli)
  const bal: [number, number, number][] = [];
  for (let i = 0; i < nBal; i++) bal.push([rnd() * w, hz * (0.08 + rnd() * 0.75), (0.02 + Math.pow(rnd(), 2) * 0.06) * w]);
  bal.sort((a, b) => a[2] - b[2]);
  for (const [x, y, r] of bal) {
    const far = 1 - clamp((r / w - 0.02) / 0.06, 0, 1);
    smallBalloon(g, x, y, r, pick(BALLOON_SETS, rnd), far * 0.45, [240, 150, 160]);
    if (due()) yield;
  }
  // peri bacaları: uzak (soluk pembe), orta (gül), yakın (koyu kahve-mor)
  chimneys(g, -10, w + 10, hz + h * 0.02, h * 0.1, [222, 150, 150], [180, 110, 120], rnd);
  chimneys(g, -10, w + 10, hz + h * 0.12, h * 0.16, [176, 96, 104], [110, 56, 70], rnd, true);
  if (due()) yield;
  chimneys(g, -20, w + 20, h * 1.03, h * 0.22, [118, 58, 78], [56, 24, 44], rnd, true);
}
function pick<T>(a: readonly T[], rnd: Rnd): T {
  return a[Math.floor(rnd() * a.length) % a.length];
}

// ───────────────────────── boyamalar ─────────────────────────
const F = 0.052; // şafak kenar
function* paintBorder(): Job<HTMLCanvasElement> {
  const [c, g] = makeCanvas(PW, PH);
  dawnSky(g, PW, PH, PH);
  // kenarda minik balon silüetleri ve yıldızlar (şerit içinde)
  const rnd = mulberry(8);
  for (let i = 0; i < 22; i++) {
    const t = rnd();
    const side = i % 4;
    const x = side === 0 ? PW * F * 0.5 : side === 1 ? PW - PW * F * 0.5 : PW * (0.1 + t * 0.8);
    const y = side === 2 ? PW * F * 0.5 : side === 3 ? PH - PW * F * 0.5 : PH * (0.06 + t * 0.88);
    g.fillStyle = 'rgba(255,240,250,0.55)';
    g.beginPath();
    g.arc(x, y, 1 + rnd() * 1.4, 0, Math.PI * 2);
    g.fill();
  }
  if (due()) yield;
  return c;
}
/** Panel: açık şafak (pastel), altta çok soluk peri bacaları, güneş ışıltısı */
function* paintSky(): Job<HTMLCanvasElement> {
  const [c, g] = makeCanvas(PW, PH);
  const rnd = mulberry(21);
  g.fillStyle = lin(g, 0, 0, 0, PH, [
    [0, '#f7f0ff'],
    [0.5, '#fff1ea'],
    [1, '#ffe2d0'],
  ]);
  g.fillRect(0, 0, PW, PH);
  glow(g, PW * 0.5, PH * 0.48, PW * 0.6, [255, 220, 170], 0.45);
  // çok soluk uzak balonlar
  for (let i = 0; i < 5; i++) {
    const x = PW * (0.15 + rnd() * 0.7), y = PH * (0.12 + rnd() * 0.5);
    if (x < PW * 0.4 && y < PH * 0.42) continue;
    smallBalloon(g, x, y, PW * (0.02 + rnd() * 0.015), pick(BALLOON_SETS, rnd), 0.72, [252, 236, 236]);
  }
  if (due()) yield;
  g.globalAlpha = 0.5;
  chimneys(g, -10, PW + 10, PH * 0.93, PH * 0.1, [244, 206, 204], [232, 186, 190], rnd);
  g.globalAlpha = 1;
  grain(g, PW, PH, rnd, 0.03);
  return c;
}

const BS = 260;
function* paintBig(): Job<Record<Suit, HTMLCanvasElement>> {
  const out = {} as Record<Suit, HTMLCanvasElement>;
  for (const s of ['S', 'H', 'D', 'C'] as Suit[]) {
    const [c, g] = makeCanvas(BS, BS);
    const k = BS * 0.62;
    g.setTransform(k, 0, 0, k, BS / 2, BS * 0.4);
    suitBalloon(g, s);
    out[s] = c;
    if (due()) yield;
  }
  return out;
}
function paintSun(): HTMLCanvasElement {
  const S = 320, C = S / 2;
  const [c, g] = makeCanvas(S, S);
  glow(g, C, C, C, [255, 190, 110], 0.7);
  g.save();
  g.translate(C, C);
  for (let i = 0; i < 20; i++) {
    g.rotate(Math.PI / 10);
    g.fillStyle = lin(g, 0, 0, 0, -C * 0.95, [
      [0, 'rgba(255,230,150,0.7)'],
      [1, 'rgba(255,170,90,0)'],
    ]);
    g.beginPath();
    g.moveTo(-C * 0.06, 0);
    g.lineTo(0, -C * (i % 2 ? 0.75 : 0.95));
    g.lineTo(C * 0.06, 0);
    g.fill();
  }
  g.restore();
  g.fillStyle = rad(g, C, C, 0, C * 0.42, [
    [0, '#fffbe8'],
    [0.6, '#ffe28a'],
    [1, '#ffb347'],
  ]);
  g.beginPath();
  g.arc(C, C, C * 0.42, 0, Math.PI * 2);
  g.fill();
  return c;
}

const CW = 240, CH = 350, PAD = 18;
/** Kaya kemeri: dikdörtgen + yarım daire tepe */
function archPath(x: number, y: number, w: number, h: number): Path2D {
  const p = new Path2D();
  const r = w / 2;
  p.moveTo(x, y + h);
  p.lineTo(x, y + r);
  p.arc(x + r, y + r, r, Math.PI, 0);
  p.lineTo(x + w, y + h);
  p.closePath();
  return p;
}
function* paintCourt(kind: 'K' | 'Q' | 'J'): Job<HTMLCanvasElement> {
  const [c, g] = makeCanvas(CW, CH);
  const rnd = mulberry(kind.charCodeAt(0) * 7);
  const inner = archPath(PAD, PAD, CW - 2 * PAD, CH - 2 * PAD);
  g.save();
  g.clip(inner);
  yield* landscape(g, CW, CH, 600 + kind.charCodeAt(0), 7, 0.74);
  // kahraman balon
  const cols = kind === 'K' ? ['#4a2a9c', '#ffcf3a', '#4a2a9c', '#ffcf3a'] : kind === 'Q' ? ['#ff4f8a', '#fff4f8', '#ff4f8a', '#fff4f8'] : ['#e8173f', '#ffb400', '#16c45b', '#1f7bff'];
  CLASSIC ??= classicPath();
  const bx = CW / 2, by = CH * 0.37, br = CW * 0.47;
  g.save();
  g.translate(bx, by);
  g.scale(br, br);
  basket(g, -0.1, 0.1, 0.56, 0.2, 0.26);
  envelope(g, CLASSIC, cols, kind === 'J' ? 8 : 8);
  // süs: taç / lale / dört renk kuşak
  if (kind === 'K') {
    g.save();
    g.clip(CLASSIC);
    g.fillStyle = gold(g, -0.6, 0.05, 0.6, 0.2);
    g.fillRect(-0.7, 0.06, 1.4, 0.1);
    g.restore();
    // tepede küçük taç
    g.save();
    g.translate(0, -0.66);
    g.beginPath();
    g.moveTo(-0.16, 0.04);
    g.lineTo(-0.18, -0.12);
    g.lineTo(-0.08, -0.03);
    g.lineTo(0, -0.17);
    g.lineTo(0.08, -0.03);
    g.lineTo(0.18, -0.12);
    g.lineTo(0.16, 0.04);
    g.closePath();
    g.fillStyle = gold(g, -0.18, -0.17, 0.18, 0.04);
    g.fill();
    g.lineWidth = 0.02;
    g.strokeStyle = '#4a2a06';
    g.stroke();
    g.restore();
  } else if (kind === 'Q') {
    // zarfın ortasında beyaz rozet içinde lale
    g.beginPath();
    g.arc(0, -0.1, 0.2, 0, Math.PI * 2);
    g.fillStyle = '#fff8fb';
    g.fill();
    g.lineWidth = 0.025;
    g.strokeStyle = '#d0285e';
    g.stroke();
    g.fillStyle = '#e0144f';
    g.beginPath();
    g.moveTo(0, -0.02);
    g.bezierCurveTo(-0.12, -0.03, -0.13, -0.16, -0.09, -0.22);
    g.lineTo(-0.045, -0.15);
    g.lineTo(0, -0.24);
    g.lineTo(0.045, -0.15);
    g.lineTo(0.09, -0.22);
    g.bezierCurveTo(0.13, -0.16, 0.12, -0.03, 0, -0.02);
    g.fill();
    g.strokeStyle = '#1f9a4a';
    g.lineWidth = 0.02;
    g.beginPath();
    g.moveTo(0, -0.02);
    g.lineTo(0, 0.06);
    g.stroke();
  } else {
    // dört renk kuşak üstünde beyaz yıldız
    sparkle(g, 0, -0.12, 0.16, '#ffffff', 0.28);
  }
  g.restore();
  // ön planda iki küçük balon
  smallBalloon(g, CW * 0.2, CH * 0.62, CW * 0.06, pick(BALLOON_SETS, rnd), 0, [0, 0, 0]);
  smallBalloon(g, CW * 0.84, CH * 0.22, CW * 0.045, pick(BALLOON_SETS, rnd), 0.2, [240, 150, 160]);
  g.restore();
  if (due()) yield;
  // kaya çerçeve: tüf rengi, kabartma
  const outer = archPath(2, 2, CW - 4, CH - 4);
  g.save();
  const ring = new Path2D();
  ring.addPath(outer);
  ring.addPath(inner);
  g.clip(ring, 'evenodd');
  g.fillStyle = lin(g, 0, 0, CW, CH, [
    [0, '#f2c9a2'],
    [0.5, '#d9926e'],
    [1, '#a8604a'],
  ]);
  g.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,240,220,0.25)' : 'rgba(110,50,30,0.2)';
    g.beginPath();
    g.arc(rnd() * CW, rnd() * CH, 0.8 + rnd() * 2.4, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.lineWidth = 2.4;
  g.strokeStyle = '#5a2a1a';
  g.stroke(inner);
  g.lineWidth = 1.6;
  g.stroke(outer);
  g.lineWidth = 1.2;
  g.strokeStyle = 'rgba(255,240,220,0.6)';
  g.stroke(archPath(PAD - 4, PAD - 4, CW - 2 * PAD + 8, CH - 2 * PAD + 8));
  return c;
}

function* paintBack(): Job<HTMLCanvasElement> {
  const [c, g] = makeCanvas(PW, PH);
  yield* landscape(g, PW, PH, 1923, 16, 0.7);
  // ön planda iki büyük balon
  smallBalloon(g, PW * 0.32, PH * 0.3, PW * 0.2, ['#e8173f', '#ffd23a', '#e8173f', '#ffffff'], 0, [0, 0, 0]);
  if (due()) yield;
  smallBalloon(g, PW * 0.74, PH * 0.5, PW * 0.13, ['#1f7bff', '#ffffff', '#16c45b', '#ffffff'], 0, [0, 0, 0]);
  return c;
}

function* paintAll(): Job<Art> {
  const border = yield* paintBorder();
  const sky = yield* paintSky();
  const big = yield* paintBig();
  const sun = paintSun();
  if (due()) yield;
  const court: Record<number, HTMLCanvasElement> = {};
  court[13] = yield* paintCourt('K');
  court[12] = yield* paintCourt('Q');
  court[11] = yield* paintCourt('J');
  const back = yield* paintBack();
  RF.measure();
  return {border, sky, big, sun, court, back};
}

// ───────────────────────── kart çizimi ─────────────────────────
const ink = (s: Suit): string => (isRed(s) ? RED : PLUM);
const pipDraw = (g: Ctx, s: Suit, cx: number, cy: number, size: number): void =>
  withSuit(g, s, cx, cy, size, p => {
    g.fillStyle = ink(s);
    g.fill(p);
  });

function face(g: Ctx, w: number, h: number, s: Suit, r: number, a: Art): void {
  g.save();
  g.clip(cardPath(w, h));
  g.drawImage(a.border, 0, 0, w, h);
  const panel = rrPath(F * w, F * w, w - 2 * F * w, h - 2 * F * w, 0.055 * w);
  g.save();
  g.clip(panel);
  g.drawImage(a.sky, 0, 0, w, h);
  g.restore();
  g.lineWidth = 0.014 * w;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(panel);
  const cx = w / 2, cy = h / 2;
  const bw = 0.82 * w; // büyük balon sprite boyu
  if (r === 1) {
    const d = 0.92 * w;
    g.drawImage(a.sun, cx - d / 2, cy - d * 0.56, d, d);
    g.drawImage(a.big[s], cx - bw * 0.62, cy - bw * 0.5, bw * 1.24, bw * 1.24);
  } else if (r >= 11) {
    const dw = 0.58 * w, dh = (dw * CH) / CW;
    g.drawImage(a.court[r], cx - dw / 2, cy - dh / 2, dw, dh);
    for (const sy of [-1, 1]) {
      const ey = cy + sy * (dh / 2 - 0.01 * w);
      g.beginPath();
      g.arc(cx, ey, 0.058 * w, 0, Math.PI * 2);
      g.fillStyle = '#fff8f2';
      g.fill();
      g.lineWidth = 0.012 * w;
      g.strokeStyle = '#a8604a';
      g.stroke();
      pipDraw(g, s, cx, ey + 0.003 * w, 0.066 * w);
    }
  } else {
    const ty = cy - 0.06 * w;
    g.drawImage(a.big[s], cx - bw / 2, ty - bw * 0.4, bw, bw);
    // zarfın ortasında beyaz değer rozeti
    const k = bw * 0.62; // birim → px
    const rx = cx, ry = ty + (s === 'H' ? -0.06 : s === 'S' ? 0.04 : 0) * k;
    const rr = 0.105 * w;
    g.beginPath();
    g.arc(rx, ry, rr, 0, Math.PI * 2);
    g.fillStyle = rad(g, rx - rr * 0.3, ry - rr * 0.3, 0, rr * 1.2, [
      [0, '#ffffff'],
      [1, '#f3e6ee'],
    ]);
    g.fill();
    g.lineWidth = 0.012 * w;
    g.strokeStyle = 'rgba(40,20,40,0.85)';
    g.stroke();
    const capH = 0.105 * w;
    RF.draw(g, String(r), rx, ry - capH / 2, capH, 0.15 * w, ink(s));
  }
  corners(g, w, h, s, r, {
    font: RF,
    x: 0.2,
    top: 0.085,
    cap: 0.235,
    pip: 0.16,
    gap: 0.05,
    wide: 0.29,
    rank: (gg, t, x, top, cap, maxW, su) => RF.draw(gg, t, x, top, cap, maxW, ink(su), 'rgba(255,255,255,0.95)', cap * 0.12),
    pipDraw: (gg, su, x, y, size) =>
      withSuit(gg, su, x, y, size, p => {
        gg.lineJoin = 'round';
        gg.lineWidth = 0.14;
        gg.strokeStyle = 'rgba(255,255,255,0.95)';
        gg.stroke(p);
        gg.fillStyle = ink(su);
        gg.fill(p);
      }),
  });
  g.restore();
  edge(g, w, h, 'rgba(50,20,60,0.8)');
}

function back(g: Ctx, w: number, h: number, a: Art): void {
  g.save();
  const card = cardPath(w, h);
  g.clip(card);
  g.drawImage(a.back, 0, 0, w, h);
  g.lineWidth = 0.06 * w;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(card);
  g.lineWidth = 0.008 * w;
  g.strokeStyle = 'rgba(60,20,30,0.85)';
  g.stroke(cardPath(w, h, 0.03 * w));
  g.lineWidth = Math.max(0.6, 0.006 * w);
  g.strokeStyle = 'rgba(255,236,190,0.9)';
  g.stroke(cardPath(w, h, 0.055 * w));
  g.restore();
}

export const skin = defineSkin<Art>({
  id: 'kapadokya',
  name: 'Kapadokya Şafağı',
  desc: 'Gün doğarken peri bacalarının üstünde süzülen balonlar.',
  fonts: () => loadFont(() => import('@fontsource/lilita-one/400.css'), `400 100px "Lilita One"`),
  paint: paintAll,
  face,
  back,
});
