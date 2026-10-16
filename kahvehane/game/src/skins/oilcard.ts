// Yağlı boya desteler (Boğaz Gecesi, Kapadokya Şafağı) için ortak kart iskeleti — kullanıcının sevdiği "Yıldızlı
// Gece" destesinin düzeni: dış kenarda boyalı tablo şeridi, ortada krem tuval panel + iki köşe rozeti (iri, net
// dizinler), ortada boyalı takım işareti / As madalyonu / kemerli saray tablosu. Bütün resimler src/themes/oil.ts
// yağlı boya işleyicisiyle bir kez (dilimli) boyanır; kart çizimi yalnız kopyalar.
import {makeRef, maskOf, oilArt, paintLayer, type ArtOpts} from '../themes/oil';
import {
  cardPath, corners, edge, gold, makeCanvas, mulberry, rad, RankFont, roundRect, SUIT_TY, suitOutline, suitPath, withSuit,
  type Ctx, type Job, type Suit,
} from './kit';

export const PW = 360, PH = Math.round(PW / 0.7);
export const F = 0.085; // boyalı kenar şeridi (w oranı)
export const BX = 0.035, BW = 0.33, BH = 0.6; // köşe rozeti
export const CW = 240, CH = 350; // saray tablosu tuvali
export const SPR = 200; // takım işareti tuvali (birim şekil SPR·0.84 px)
export const ACE = 320; // As madalyonu tuvali

export interface CardArt {
  frame: HTMLCanvasElement;
  cream: HTMLCanvasElement;
  suit: Record<Suit, HTMLCanvasElement>;
  ace: HTMLCanvasElement;
  court: Record<number, HTMLCanvasElement>;
  back: HTMLCanvasElement;
  /** isteğe bağlı: takım işaretinin altında asılı küçük resim (Kapadokya: sepet) */
  hang?: HTMLCanvasElement;
}

export function panelPath(w: number, h: number): Path2D {
  const p = new Path2D();
  roundRect(p, F * w, F * w, w - 2 * F * w, h - 2 * F * w, 0.05 * w);
  roundRect(p, BX * w, BX * w, BW * w, BH * w, 0.06 * w);
  roundRect(p, w - (BX + BW) * w, h - (BX + BH) * w, BW * w, BH * w, 0.06 * w);
  return p;
}
/** Kenar şeridi maskesi (tasarım biriminde PW×PH): panelin dışı + biraz taşma */
export const stripMask = (x: number, y: number): number => {
  const m = (F + 0.025) * PW;
  return x < m || y < m || x > PW - m || y > PH - m ? 1 : 0;
};

// ───────────────────────── krem tuval ─────────────────────────
/** Krem tuval: çok düşük kontrastlı, geniş ve yumuşak yağlı boya darbeleri + desteye özgü hafif renk bulutları. */
export function* paintCream(seed: number, c0: string, c1: string, wisps: [number, number, number, string][]): Job<HTMLCanvasElement> {
  const sketch = (g: Ctx): void => {
    g.fillStyle = rad(g, PW / 2, PH / 2, PW * 0.15, PH * 0.62, [
      [0, c0],
      [1, c1],
    ]);
    g.fillRect(0, 0, PW, PH);
    for (const [x, y, r, col] of wisps) {
      g.fillStyle = rad(g, PW * x, PH * y, 0, PW * r, [
        [0, col],
        [1, 'rgba(0,0,0,0)'],
      ]);
      g.fillRect(0, 0, PW, PH);
    }
  };
  const [cv, g] = makeCanvas(PW, PH);
  sketch(g);
  const ref = makeRef(PW, PH, 0.2, sketch);
  const rnd = mulberry(seed);
  yield* paintLayer(g, ref, rnd, PW, PH, {
    cell: 11,
    len: [22, 36],
    width: [9, 13],
    field: (x, y) => 0.5 * Math.sin(x * 0.012 + y * 0.009) + 0.35 * Math.sin(y * 0.02 - x * 0.006),
    jitter: 5,
    relief: 0.025,
  });
  // bez dokusu
  g.globalAlpha = 0.04;
  g.fillStyle = '#6b5a3a';
  for (let y = 0; y < PH; y += 3) g.fillRect(0, y, PW, 0.8);
  for (let x = 0; x < PW; x += 3) g.fillRect(x, 0, 0.8, PH);
  g.globalAlpha = 1;
  return cv;
}

// ───────────────────────── boyalı takım işareti ─────────────────────────
/**
 * Takım şeklinin içine boyanmış küçük tablo. `sketch` piksel biriminde (SPR×SPR) çizer; birim şekil SPR·0.84
 * ölçeğinde merkeze oturur. Sonra şekle kırpılır, koyu + altın kenar çizilir.
 */
/** Takım şeklinin maskesi (SPR×SPR piksel; boyanacak bölge biraz taşar) */
export function suitMask(s: Suit): (x: number, y: number) => number {
  const k = SPR * 0.84, C = SPR / 2;
  return maskOf(SPR, SPR, g => {
    g.translate(C, C);
    g.scale(k * 1.04, k * 1.04);
    g.fill(suitPath(s));
  });
}
/** Boyalı tabloyu (SPR×SPR) takım şekline kırpar; hafif ışık + koyu ve altın kenar. */
export function clipSuit(s: Suit, art: HTMLCanvasElement, rim?: string, ink = '#140c04'): HTMLCanvasElement {
  const k = SPR * 0.84, C = SPR / 2;
  const path = suitPath(s);
  const [c, g] = makeCanvas(SPR, SPR);
  g.setTransform(k, 0, 0, k, C, C);
  g.save();
  g.clip(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(art, 0, 0);
  // boyanın üstüne vurmuş yumuşak ışık (sol üst) ve sağ altta gölge
  g.setTransform(k, 0, 0, k, C, C);
  g.fillStyle = rad(g, -0.2, -0.28, 0.02, 0.85, [
    [0, 'rgba(255,250,230,0.16)'],
    [0.45, 'rgba(255,250,230,0)'],
    [1, 'rgba(0,0,16,0.3)'],
  ]);
  g.fillRect(-1, -1, 2, 2);
  g.restore();
  const out = suitOutline(s);
  g.lineJoin = 'round';
  g.lineWidth = 0.06;
  g.strokeStyle = ink;
  g.stroke(out);
  g.lineWidth = 0.032;
  g.strokeStyle = rim ?? gold(g, -0.5, -0.55, 0.5, 0.55);
  g.stroke(out);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}
/** Takım şeklinin içine boyanmış küçük tablo (`sketch` piksel biriminde, SPR×SPR; birim şekil SPR·0.84). */
export function* suitSprite(s: Suit, o: Omit<ArtOpts, 'W' | 'H' | 'mask'>, rim?: string): Job<HTMLCanvasElement> {
  const {cv} = yield* oilArt({W: SPR, H: SPR, mask: suitMask(s), ...o});
  const c = clipSuit(s, cv, rim);
  cv.width = cv.height = 0;
  return c;
}

// ───────────────────────── kemerler ─────────────────────────
/** Sivri (Osmanlı) kemer: çoklu çizgi */
export function ogeePts(x: number, y: number, w: number, h: number): number[] {
  const r = w / 2, pts: number[] = [];
  const bez = (p0: number[], p1: number[], p2: number[], p3: number[]): void => {
    for (let i = 1; i <= 14; i++) {
      const t = i / 14, u = 1 - t;
      pts.push(u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]);
    }
  };
  pts.push(x, y + h);
  for (let i = 1; i <= 8; i++) pts.push(x, y + h - ((h - r * 1.1) * i) / 8);
  bez([x, y + r * 1.1], [x, y + r * 0.35], [x + r * 0.7, y + r * 0.2], [x + r, y]);
  bez([x + r, y], [x + r * 1.3, y + r * 0.2], [x + w, y + r * 0.35], [x + w, y + r * 1.1]);
  for (let i = 1; i <= 8; i++) pts.push(x + w, y + r * 1.1 + ((h - r * 1.1) * i) / 8);
  for (let i = 1; i < 8; i++) pts.push(x + w - (w * i) / 8, y + h);
  return pts;
}
/** Yuvarlak kemer (Kapadokya kaya oyması pencere) */
export function archPts(x: number, y: number, w: number, h: number): number[] {
  const r = w / 2, pts: number[] = [];
  pts.push(x, y + h);
  for (let i = 1; i <= 8; i++) pts.push(x, y + h - ((h - r) * i) / 8);
  for (let i = 1; i <= 24; i++) {
    const a = Math.PI + (Math.PI * i) / 24;
    pts.push(x + r + Math.cos(a) * r, y + r + Math.sin(a) * r);
  }
  for (let i = 1; i <= 8; i++) pts.push(x + w, y + r + ((h - r) * i) / 8);
  for (let i = 1; i < 8; i++) pts.push(x + w - (w * i) / 8, y + h);
  return pts;
}
export function polyPath(pts: number[]): Path2D {
  const p = new Path2D();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
  return p;
}

// ───────────────────────── kart yüzü ─────────────────────────
export interface FaceStyle {
  font: RankFont;
  red: string;
  ink: string;
  /** panel kenarı (koyu çizgi) */
  line: string;
  /** As: ortadaki işaret düz mürekkep mi (Boğaz: ayın üstünde), boyalı işaret mi (Kapadokya: balon) */
  aceSuit: 'solid' | 'sprite';
  /** saray rozetinin zemini */
  roundel: string;
}
const pipOf = (st: FaceStyle) => (g: Ctx, s: Suit, cx: number, cy: number, size: number): void =>
  withSuit(g, s, cx, cy, size, p => {
    g.fillStyle = s === 'H' || s === 'D' ? st.red : st.ink;
    g.fill(p);
  });

export function drawFace(g: Ctx, w: number, h: number, s: Suit, r: number, a: CardArt, st: FaceStyle): void {
  const red = s === 'H' || s === 'D';
  const pip = pipOf(st);
  g.save();
  g.clip(cardPath(w, h));
  g.drawImage(a.frame, 0, 0, w, h);
  const panel = panelPath(w, h);
  g.lineJoin = 'round';
  g.lineWidth = 0.036 * w;
  g.strokeStyle = st.line;
  g.stroke(panel);
  g.lineWidth = 0.02 * w;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(panel);
  g.save();
  g.clip(panel);
  g.drawImage(a.cream, 0, 0, w, h);
  g.restore();
  const cx = w / 2, cy = h / 2;
  const hang = (size: number, bottom: number): void => {
    if (!a.hang) return;
    const hw = size * 0.62, hh = (hw * a.hang.height) / a.hang.width;
    g.drawImage(a.hang, cx - hw / 2, cy + bottom, hw, hh);
  };
  if (r === 1) {
    const d = 0.74 * w;
    g.drawImage(a.ace, cx - d / 2, cy - d / 2, d, d);
    if (st.aceSuit === 'solid') {
      withSuit(g, s, cx, cy, 0.26 * w, p => {
        g.fillStyle = red ? st.red : st.ink;
        g.fill(p);
        g.lineWidth = 0.07;
        g.strokeStyle = '#fff6dc';
        g.stroke(p);
        g.lineWidth = 0.035;
        g.strokeStyle = gold(g, -0.5, -0.5, 0.5, 0.5);
        g.stroke(p);
      });
    } else {
      const sz = 0.3 * w, sd = sz / 0.84;
      hang(sz, sz * 0.5);
      g.drawImage(a.suit[s], cx - sd / 2, cy - sd / 2 - 0.03 * w, sd, sd);
    }
  } else if (r >= 11) {
    const dw = 0.56 * w, dh = (dw * CH) / CW;
    g.drawImage(a.court[r], cx - dw / 2, cy - dh / 2, dw, dh);
    const ey = cy + dh / 2 - 0.01 * w;
    g.beginPath();
    g.arc(cx, ey, 0.064 * w, 0, Math.PI * 2);
    g.fillStyle = st.roundel;
    g.fill();
    g.lineWidth = 0.014 * w;
    g.strokeStyle = gold(g, cx - 0.06 * w, ey - 0.06 * w, cx + 0.06 * w, ey + 0.06 * w);
    g.stroke();
    pip(g, s, cx, ey + 0.003 * w, 0.074 * w);
  } else {
    const sz = 0.46 * w, d = sz / 0.84;
    const oy = a.hang ? -0.04 * w : 0;
    hang(sz, oy + sz * 0.5);
    g.save();
    g.globalAlpha = 0.22;
    withSuit(g, s, cx + 0.012 * w, cy + oy + 0.018 * w, sz, p => {
      g.fillStyle = '#2a1e10';
      g.fill(p);
    });
    g.restore();
    g.drawImage(a.suit[s], cx - d / 2, cy + oy - d / 2, d, d);
    const capH = 0.15 * w;
    st.font.draw(g, String(r), cx, cy + oy + SUIT_TY[s] * sz - capH / 2, capH, (s === 'D' ? 0.21 : 0.25) * w, '#fff8e6', red ? '#3a0410' : '#04061a', 0.036 * w);
  }
  corners(g, w, h, s, r, {
    font: st.font,
    x: 0.2,
    top: 0.072,
    cap: 0.25,
    pip: 0.17,
    gap: 0.05,
    rank: (gg, t, x, top, cap, maxW, su) => st.font.draw(gg, t, x, top, cap, maxW, su === 'H' || su === 'D' ? st.red : st.ink),
    pipDraw: pip,
  });
  g.restore();
  edge(g, w, h, 'rgba(8,10,30,0.75)');
}

export function drawBack(g: Ctx, w: number, h: number, a: CardArt, inner: string): void {
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
  g.strokeStyle = inner;
  g.stroke(cardPath(w, h, 0.048 * w));
  g.restore();
}



