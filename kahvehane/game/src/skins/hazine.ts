// Deste "Topkapı Hazinesi": dört renk mücevher destesi. Takım işaretleri pırlanta kesimli taşlar:
// ♥ yakut · ♦ topaz · ♣ zümrüt · ♠ safir (STIL_ARENA'nın dört rengi, mücevher tonunda).
//   · sayılar: n taşlı altın broş (taşlar halka hâlinde, ortada altın rozet içinde değer)
//   · As: pençe yuvalı dev taş, arkasında ışık patlaması
//   · Papaz: kadife başlıklı mücevherli taç · Kız: inci gerdanlık · Vale: Topkapı Hançeri (üç zümrüt, kabzasında saat)
//     (saray kartlarında asıl taş kartın takımından: aynı sanat, takıma göre taş)
//   · arka: kızıl kadife, altın telkâri kenar, ortada pırlanta rozet
// Her şey vektör + degrade; taşlar bir kez çizilip kopyalanır.
import {
  cardPath, clamp, corners, defineSkin, edge, glow, gold, grain, lin, loadFont, makeCanvas, mix, mulberry, rad, RankFont, rrPath, sparkle,
  suitPath, withSuit, type Ctx, type Job, type RGB, type Suit, css, due,
} from './kit';

const FONT = (px: number): string => `900 ${px}px "Playfair Display", "Times New Roman", Georgia, serif`;
const RF = new RankFont(FONT);
const PW = 360, PH = Math.round(PW / 0.7);

interface Gem {
  dark: RGB;
  mid: RGB;
  light: RGB;
  ink: string; // köşe yazısı rengi (fildişi üstünde okunur koyu ton)
}
export const GEM: Record<Suit, Gem> = {
  H: {dark: [86, 0, 22], mid: [214, 16, 58], light: [255, 150, 170], ink: '#b3092e'},
  D: {dark: [120, 44, 0], mid: [246, 140, 14], light: [255, 232, 140], ink: '#c45300'},
  C: {dark: [0, 58, 32], mid: [14, 168, 86], light: [150, 255, 196], ink: '#067a3f'},
  S: {dark: [4, 18, 92], mid: [36, 96, 236], light: [160, 206, 255], ink: '#1440b8'},
};
const DIAMOND: Gem = {dark: [96, 110, 150], mid: [214, 226, 248], light: [255, 255, 255], ink: '#333'};

interface Art {
  gem: Record<Suit, HTMLCanvasElement>;
  ivory: HTMLCanvasElement;
  velvet: HTMLCanvasElement;
  court: Record<number, HTMLCanvasElement>;
  burst: HTMLCanvasElement;
  back: HTMLCanvasElement;
  rosette: HTMLCanvasElement;
}

// ───────────────────────── pırlanta kesimli taş ─────────────────────────
const GS = 200;
/** Birim yol (path) içinde kesimli taş: iki kat yüzey (kite/star), tabla, iç ışık, parıltı; altın yuva kenarı. */
function cutGem(g: Ctx, path: Path2D, c: Gem, seed: number, bezel = true): void {
  const rnd = mulberry(seed);
  const L = -2.3; // ışık sol üstten
  const shade = (a: number, bias: number): string => {
    const k = clamp(0.32 + 0.42 * Math.max(0, Math.cos(a - L)) + bias + (rnd() - 0.5) * 0.12, 0, 1);
    return css(k < 0.5 ? mix(c.dark, c.mid, k * 2) : mix(c.mid, c.light, (k - 0.5) * 2));
  };
  const wedges = (n: number, off: number, bias: (i: number) => number): void => {
    for (let i = 0; i < n; i++) {
      const a0 = off + (i / n) * Math.PI * 2, a1 = off + ((i + 1) / n) * Math.PI * 2;
      g.fillStyle = shade((a0 + a1) / 2, bias(i));
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a0) * 2, Math.sin(a0) * 2);
      g.lineTo(Math.cos(a1) * 2, Math.sin(a1) * 2);
      g.closePath();
      g.fill();
    }
  };
  g.save();
  g.clip(path);
  // dış kat (kuşak yüzeyleri)
  wedges(16, 0, i => (i % 2 ? 0.1 : -0.12));
  // iç kat: yarım adım kaymış (yıldız yüzeyleri)
  g.save();
  g.scale(0.78, 0.78);
  g.clip(path);
  g.scale(1 / 0.78, 1 / 0.78);
  wedges(16, Math.PI / 16, i => (i % 2 ? -0.04 : 0.16));
  g.restore();
  // tabla
  g.save();
  g.scale(0.5, 0.5);
  g.fillStyle = lin(g, -0.5, -0.5, 0.5, 0.5, [
    [0, css(mix(c.mid, c.light, 0.75))],
    [0.45, css(c.mid)],
    [1, css(mix(c.dark, c.mid, 0.6))],
  ]);
  g.fill(path);
  g.lineWidth = 0.025;
  g.strokeStyle = css(c.light, 0.55);
  g.stroke(path);
  g.restore();
  // yüzey çizgileri: ince açık kenarlar
  g.lineWidth = 0.012;
  g.strokeStyle = css(c.light, 0.35);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 0.25, Math.sin(a) * 0.25);
    g.lineTo(Math.cos(a) * 1.2, Math.sin(a) * 1.2);
    g.stroke();
  }
  g.save();
  g.scale(0.78, 0.78);
  g.lineWidth = 0.016;
  g.stroke(path);
  g.restore();
  // iç ışık (kırılma): alt sağda sıcak parıltı
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = rad(g, 0.12, 0.18, 0, 0.42, [
    [0, css(c.light, 0.45)],
    [1, css(c.light, 0)],
  ]);
  g.fillRect(-1, -1, 2, 2);
  g.globalCompositeOperation = 'source-over';
  // parlak yansıma: sol üstte
  g.fillStyle = rad(g, -0.2, -0.22, 0, 0.26, [
    [0, 'rgba(255,255,255,0.85)'],
    [0.35, 'rgba(255,255,255,0.35)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  g.fillRect(-1, -1, 2, 2);
  g.restore();
  if (bezel) {
    g.lineJoin = 'round';
    g.lineWidth = 0.075;
    g.strokeStyle = '#3a2206';
    g.stroke(path);
    g.lineWidth = 0.048;
    g.strokeStyle = gold(g, -0.5, -0.55, 0.5, 0.55);
    g.stroke(path);
  }
  sparkle(g, -0.2, -0.24, 0.16, 'rgba(255,255,255,0.95)', 0.14);
}

function* paintGems(): Job<Record<Suit, HTMLCanvasElement>> {
  const out = {} as Record<Suit, HTMLCanvasElement>;
  for (const [i, s] of (['S', 'H', 'D', 'C'] as Suit[]).entries()) {
    const [c, g] = makeCanvas(GS, GS);
    const k = GS * 0.8;
    g.setTransform(k, 0, 0, k, GS / 2, GS / 2);
    cutGem(g, suitPath(s), GEM[s], 300 + i);
    out[s] = c;
    if (due()) yield;
  }
  return out;
}

// ───────────────────────── dokular ─────────────────────────
/** Fildişi panel: inci parlaklığı + kabartma kafes (çok soluk) */
function paintIvory(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  const rnd = mulberry(5);
  g.fillStyle = lin(g, 0, 0, PW, PH, [
    [0, '#fffdf6'],
    [0.5, '#f6efdf'],
    [1, '#ece0c6'],
  ]);
  g.fillRect(0, 0, PW, PH);
  // inci ışıltısı
  g.fillStyle = rad(g, PW * 0.35, PH * 0.3, 0, PH * 0.6, [
    [0, 'rgba(255,255,255,0.7)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  g.fillRect(0, 0, PW, PH);
  // kafes: çapraz ince çizgiler + kesişimlerde küçük dört yaprak
  g.strokeStyle = 'rgba(176,140,70,0.12)';
  g.lineWidth = 1;
  const s = 30;
  for (let x = -PH; x < PW + PH; x += s) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + PH, PH);
    g.moveTo(x, 0);
    g.lineTo(x - PH, PH);
    g.stroke();
  }
  g.fillStyle = 'rgba(176,140,70,0.14)';
  for (let y = 0; y < PH + s; y += s)
    for (let x = (y / s) % 2 ? s / 2 : 0; x < PW + s; x += s) {
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, r = i % 2 ? 1.2 : 3.4;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.fill();
    }
  grain(g, PW, PH, rnd, 0.035);
  // köşebent: dizinlerin olmadığı iki köşede (sağ üst, sol alt) altın kıvrım + küçük yakut
  const cornerPiece = (x: number, y: number, rot: number): void => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    scroll(g, -30, 8, 13, 0, -1);
    scroll(g, -8, 30, 13, Math.PI / 2, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-26, 4, -34, 30);
    g.quadraticCurveTo(-8, 22, 0, 0);
    g.fillStyle = gold(g, -34, 0, 0, 30);
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = '#3a2206';
    g.stroke();
    roundGem(g, -14, 14, 6, GEM.H, 61);
    g.restore();
  };
  const m = PW * (F + 0.045);
  cornerPiece(PW - m, m, 0);
  cornerPiece(m, PH - m, Math.PI);
  return c;
}

/** Kadife: koyu kızıl, geniş yumuşak parlama + ince hav dokusu */
export function paintVelvet(w: number, h: number, base: RGB, seed: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(w, h);
  const rnd = mulberry(seed);
  g.fillStyle = css(base);
  g.fillRect(0, 0, w, h);
  g.fillStyle = rad(g, w * 0.4, h * 0.35, 0, Math.max(w, h) * 0.75, [
    [0, css(mix(base, [255, 120, 140], 0.28))],
    [0.5, css(base, 0)],
    [1, 'rgba(0,0,0,0.45)'],
  ]);
  g.fillRect(0, 0, w, h);
  // hav: kısa açık/koyu lekeler
  for (let i = 0; i < w * h * 0.012; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,200,210,0.05)' : 'rgba(0,0,0,0.08)';
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1);
  }
  grain(g, w, h, rnd, 0.06);
  return c;
}

/** Işık patlaması (As arkası): ince altın ışınlar + yumuşak hale */
function paintBurst(): HTMLCanvasElement {
  const S = 300, C = S / 2;
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = rad(g, C, C, 0, C, [
    [0, 'rgba(255,236,170,0.85)'],
    [0.4, 'rgba(255,214,120,0.3)'],
    [1, 'rgba(255,214,120,0)'],
  ]);
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2, w = i % 2 ? 0.03 : 0.06, r = i % 2 ? C * 0.8 : C * 0.98;
    g.fillStyle = lin(g, C, C, C + Math.cos(a) * r, C + Math.sin(a) * r, [
      [0, 'rgba(255,240,190,0.9)'],
      [1, 'rgba(255,200,90,0)'],
    ]);
    g.beginPath();
    g.moveTo(C, C);
    g.lineTo(C + Math.cos(a - w) * r, C + Math.sin(a - w) * r);
    g.lineTo(C + Math.cos(a + w) * r, C + Math.sin(a + w) * r);
    g.closePath();
    g.fill();
  }
  return c;
}

/** Broş göbeği: altın rozet (sekiz yaprak + boncuk halkası) — değer üstüne yazılır */
function paintRosette(): HTMLCanvasElement {
  const S = 120, C = S / 2;
  const [c, g] = makeCanvas(S, S);
  g.translate(C, C);
  for (let i = 0; i < 8; i++) {
    g.save();
    g.rotate((i / 8) * Math.PI * 2);
    g.beginPath();
    g.rotate(Math.PI / 8);
    g.moveTo(0, -C * 0.3);
    g.quadraticCurveTo(C * 0.3, -C * 0.74, 0, -C * 0.98);
    g.quadraticCurveTo(-C * 0.3, -C * 0.74, 0, -C * 0.3);
    g.fillStyle = gold(g, -C * 0.3, -C, C * 0.3, 0);
    g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = '#3a2206';
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, C * 0.66, 0, Math.PI * 2);
  g.fillStyle = rad(g, -C * 0.2, -C * 0.25, 0, C * 0.7, [
    [0, '#fffdf4'],
    [1, '#eadcb8'],
  ]);
  g.fill();
  g.lineWidth = C * 0.09;
  g.strokeStyle = gold(g, -C, -C, C, C);
  g.stroke();
  g.lineWidth = 1.4;
  g.strokeStyle = '#3a2206';
  g.beginPath();
  g.arc(0, 0, C * 0.72, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    g.fillStyle = '#fff6d8';
    g.beginPath();
    g.arc(Math.cos(a) * C * 0.66, Math.sin(a) * C * 0.66, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ───────────────────────── saray kartları ─────────────────────────
const CW = 240, CH = 350, PAD = 16;
const ORX = CW / 2 - PAD, ORY = CH / 2 - PAD;
/** Takımın taşı saray kartında nereye konur (CW×CH tuval koordinatı, çap) */
const SLOT: Record<number, {x: number; y: number; d: number}> = {
  13: {x: CW / 2, y: CH * 0.565, d: 46},
  12: {x: CW / 2, y: CH * 0.69, d: 66},
  11: {x: CW / 2, y: CH * 0.17, d: 40},
};

export function pearl(g: Ctx, x: number, y: number, r: number): void {
  g.fillStyle = rad(g, x - r * 0.35, y - r * 0.4, 0, r * 1.2, [
    [0, '#ffffff'],
    [0.45, '#f1ece4'],
    [0.85, '#c8bcae'],
    [1, '#8f8172'],
  ]);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = Math.max(0.6, r * 0.12);
  g.strokeStyle = 'rgba(70,50,30,0.6)';
  g.stroke();
}
/** Küçük kesimli yuvarlak taş */
export function roundGem(g: Ctx, x: number, y: number, r: number, c: Gem, seed: number): void {
  const p = new Path2D();
  p.arc(0, 0, 0.5, 0, Math.PI * 2);
  g.save();
  g.translate(x, y);
  g.scale(r * 2, r * 2);
  cutGem(g, p, c, seed);
  g.restore();
}

function courtFrame(g: Ctx): void {
  const cx = CW / 2, cy = CH / 2;
  g.lineWidth = PAD * 0.6;
  g.strokeStyle = gold(g, 0, 0, CW, CH);
  g.beginPath();
  g.ellipse(cx, cy, ORX + PAD * 0.42, ORY + PAD * 0.42, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1.8;
  g.strokeStyle = '#2a1604';
  for (const d of [0.1, 0.74]) {
    g.beginPath();
    g.ellipse(cx, cy, ORX + PAD * d, ORY + PAD * d, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // altın kenarda dört renk küçük taşlar + inciler
  const cols: Suit[] = ['H', 'D', 'C', 'S'];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = cx + Math.cos(a) * (ORX + PAD * 0.42), y = cy + Math.sin(a) * (ORY + PAD * 0.42);
    if (i % 2) pearl(g, x, y, 2.6);
    else roundGem(g, x, y, 3.6, GEM[cols[(i / 2) % 4]], 40 + i);
  }
}

function* paintCourt(kind: 'K' | 'Q' | 'J'): Job<HTMLCanvasElement> {
  const [c, g] = makeCanvas(CW, CH);
  const cx = CW / 2, cy = CH / 2;
  const vel = paintVelvet(CW, CH, kind === 'K' ? [92, 8, 26] : kind === 'Q' ? [20, 26, 86] : [10, 54, 40], 60 + kind.charCodeAt(0));
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, ORX + 1, ORY + 1, 0, 0, Math.PI * 2);
  g.clip();
  g.drawImage(vel, 0, 0);
  vel.width = vel.height = 0;
  glow(g, cx, cy, ORX * 1.1, [255, 220, 150], 0.25, 1, 1.3);
  if (due()) yield;
  if (kind === 'K') drawCrown(g, cx, CH * 0.62, 150);
  else if (kind === 'Q') drawNecklace(g, cx, CH * 0.22);
  else drawDagger(g, cx);
  g.restore();
  if (due()) yield;
  courtFrame(g);
  return c;
}

/** Papaz: kadife başlıklı, kemerli, mücevherli büyük taç. by = bandın altı. */
function drawCrown(g: Ctx, cx: number, by: number, w: number): void {
  const bandH = w * 0.2, top = by - bandH;
  // kadife başlık (kubbe)
  g.beginPath();
  g.moveTo(cx - w * 0.44, top);
  g.bezierCurveTo(cx - w * 0.46, top - w * 0.62, cx + w * 0.46, top - w * 0.62, cx + w * 0.44, top);
  g.closePath();
  g.fillStyle = rad(g, cx - w * 0.12, top - w * 0.4, 0, w * 0.5, [
    [0, '#e0304a'],
    [0.6, '#8e0a22'],
    [1, '#4a0010'],
  ]);
  g.fill();
  // kemerler (altın) — kubbe üstünden
  const arch = (x0: number): void => {
    g.beginPath();
    g.moveTo(x0, top);
    g.bezierCurveTo(x0 * 0.5 + cx * 0.5 - (x0 - cx) * 0.1, top - w * 0.66, cx, top - w * 0.56, cx, top - w * 0.5);
    g.lineWidth = w * 0.06;
    g.strokeStyle = '#3a2206';
    g.stroke();
    g.lineWidth = w * 0.038;
    g.strokeStyle = gold(g, cx - w * 0.5, top - w * 0.6, cx + w * 0.5, top);
    g.stroke();
  };
  arch(cx - w * 0.44);
  arch(cx + w * 0.44);
  g.beginPath();
  g.moveTo(cx, top);
  g.lineTo(cx, top - w * 0.5);
  g.lineWidth = w * 0.06;
  g.strokeStyle = '#3a2206';
  g.stroke();
  g.lineWidth = w * 0.038;
  g.strokeStyle = gold(g, cx - w * 0.1, top - w * 0.6, cx + w * 0.1, top);
  g.stroke();
  // kemerlerde inciler
  for (let i = 1; i < 6; i++) pearl(g, cx, top - (w * 0.5 * i) / 6, w * 0.022);
  // tepe küresi
  g.beginPath();
  g.arc(cx, top - w * 0.58, w * 0.075, 0, Math.PI * 2);
  g.fillStyle = gold(g, cx - w * 0.08, top - w * 0.66, cx + w * 0.08, top - w * 0.5);
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = '#3a2206';
  g.stroke();
  roundGem(g, cx, top - w * 0.58, w * 0.04, GEM.S, 77);
  // taç dişleri (bant üstünde yonca uçlar)
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * w * 0.22;
    g.beginPath();
    g.moveTo(x - w * 0.07, top + 1);
    g.quadraticCurveTo(x - w * 0.08, top - w * 0.12, x, top - w * 0.2);
    g.quadraticCurveTo(x + w * 0.08, top - w * 0.12, x + w * 0.07, top + 1);
    g.closePath();
    g.fillStyle = gold(g, x - w * 0.08, top - w * 0.2, x + w * 0.08, top);
    g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = '#3a2206';
    g.stroke();
    if (i !== 2) roundGem(g, x, top - w * 0.085, w * 0.03, GEM[(['H', 'D', 'C', 'S'] as Suit[])[i % 4]], 90 + i);
  }
  // bant
  const band = rrPath(cx - w * 0.5, top, w, bandH, bandH * 0.3);
  g.fillStyle = gold(g, cx - w * 0.5, top, cx + w * 0.5, by);
  g.fill(band);
  g.fillStyle = lin(g, 0, top, 0, by, [
    [0, 'rgba(255,255,230,0.35)'],
    [0.5, 'rgba(0,0,0,0)'],
    [1, 'rgba(60,30,0,0.4)'],
  ]);
  g.fill(band);
  g.lineWidth = 2;
  g.strokeStyle = '#3a2206';
  g.stroke(band);
  for (let i = 0; i < 9; i++) {
    const x = cx - w * 0.44 + (i * w * 0.88) / 8;
    if (i === 4) continue; // ortada kartın taşı (yüz çiziminde)
    if (i % 2) pearl(g, x, top + bandH / 2, bandH * 0.18);
    else roundGem(g, x, top + bandH / 2, bandH * 0.26, GEM[(['H', 'C', 'D', 'S'] as Suit[])[(i / 2) % 4]], 120 + i);
  }
}

/** Kız: inci gerdanlık — iki sıra inci V biçiminde sarkar, altta büyük sarkaç (kartın taşı yüz çiziminde) */
function drawNecklace(g: Ctx, cx: number, y0: number): void {
  const pY = SLOT[12].y;
  for (let row = 0; row < 2; row++) {
    const sag = row ? 1.08 : 1;
    const n = row ? 26 : 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = Math.PI * (1 - t);
      const x = cx + Math.cos(a) * ORX * (0.86 - row * 0.12);
      const y = y0 + Math.sin(a) * (pY - y0 - 52) * sag * (0.95 + row * 0.08) + row * 6;
      if (row === 1 && i % 4 === 2) roundGem(g, x, y, 4.6, GEM[(['H', 'D', 'C', 'S'] as Suit[])[(i >> 2) % 4]], 200 + i);
      else pearl(g, x, y, row ? 4.4 : 5.4);
    }
  }
  // sarkaç askısı: altın kurdele + taç biçimli kap
  const yb = pY - SLOT[12].d / 2 - 10;
  g.beginPath();
  g.moveTo(cx - 14, yb - 22);
  g.quadraticCurveTo(cx, yb - 6, cx + 14, yb - 22);
  g.lineTo(cx + 8, yb + 2);
  g.lineTo(cx - 8, yb + 2);
  g.closePath();
  g.fillStyle = gold(g, cx - 14, yb - 22, cx + 14, yb);
  g.fill();
  g.lineWidth = 1.6;
  g.strokeStyle = '#3a2206';
  g.stroke();
  pearl(g, cx, yb - 26, 6);
  // sarkacın altında üç küçük inci damla
  for (const [dx, dy] of [[-16, 42], [0, 48], [16, 42]] as const) pearl(g, cx + dx, pY + dy, 4);
}

/** Vale: Topkapı Hançeri — altın kın, üç büyük zümrüt kabza, kabza ucunda (kartın taşı) ve saat kapağı. */
function drawDagger(g: Ctx, cx: number): void {
  const top = CH * 0.22, guard = CH * 0.42, tip = CH * 0.9;
  // kın (hafif kavisli)
  const sheath = new Path2D();
  sheath.moveTo(cx - 22, guard);
  sheath.bezierCurveTo(cx - 24, CH * 0.62, cx - 10, CH * 0.8, cx + 6, tip);
  sheath.bezierCurveTo(cx + 18, CH * 0.78, cx + 26, CH * 0.6, cx + 22, guard);
  sheath.closePath();
  g.fillStyle = gold(g, cx - 30, guard, cx + 30, tip);
  g.fill(sheath);
  g.fillStyle = lin(g, cx - 24, 0, cx + 24, 0, [
    [0, 'rgba(60,30,0,0.35)'],
    [0.35, 'rgba(255,255,230,0.25)'],
    [1, 'rgba(60,30,0,0.4)'],
  ]);
  g.fill(sheath);
  g.lineWidth = 2;
  g.strokeStyle = '#3a2206';
  g.stroke(sheath);
  // kın üstünde elmas dizisi + yaprak oyması
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const y = guard + 22 + t * (tip - guard - 60);
    const x = cx - 2 + t * 6;
    roundGem(g, x, y, i === 2 ? 9 : 5.5, i === 2 ? GEM.C : DIAMOND, 300 + i);
  }
  // kabza siperi
  const gp = rrPath(cx - 40, guard - 12, 80, 18, 9);
  g.fillStyle = gold(g, cx - 40, guard - 12, cx + 40, guard + 6);
  g.fill(gp);
  g.lineWidth = 2;
  g.strokeStyle = '#3a2206';
  g.stroke(gp);
  for (const dx of [-30, 30]) roundGem(g, cx + dx, guard - 3, 6, DIAMOND, 330 + dx);
  // kabza: üç büyük zümrüt (biri kartın taşı değil: hep zümrüt — hançerin imzası)
  const grip = rrPath(cx - 15, top + 18, 30, guard - top - 30, 12);
  g.fillStyle = gold(g, cx - 16, top, cx + 16, guard);
  g.fill(grip);
  g.lineWidth = 2;
  g.strokeStyle = '#3a2206';
  g.stroke(grip);
  for (let i = 0; i < 3; i++) roundGem(g, cx, top + 34 + i * ((guard - top - 52) / 2), 13, GEM.C, 340 + i);
  // kabza ucu: sekizgen yuva (taş yüz çiziminde)
  g.save();
  g.translate(cx, SLOT[11].y);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    g.lineTo(Math.cos(a) * 28, Math.sin(a) * 28);
  }
  g.closePath();
  g.fillStyle = gold(g, -28, -28, 28, 28);
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = '#3a2206';
  g.stroke();
  g.restore();
  // saat kapağı (kabza ucunun üstünde küçük kadran)
  g.beginPath();
  g.arc(cx, SLOT[11].y - 34, 9, 0, Math.PI * 2);
  g.fillStyle = '#fbf6e8';
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = gold(g, cx - 9, SLOT[11].y - 43, cx + 9, SLOT[11].y - 25);
  g.stroke();
  g.lineWidth = 1.2;
  g.strokeStyle = '#2a1a04';
  g.beginPath();
  g.moveTo(cx, SLOT[11].y - 34);
  g.lineTo(cx, SLOT[11].y - 40);
  g.moveTo(cx, SLOT[11].y - 34);
  g.lineTo(cx + 4, SLOT[11].y - 33);
  g.stroke();
}

// ───────────────────────── arka ─────────────────────────
/** Telkâri kıvrım: C kıvrımı + uç sarmal (altın) */
export function scroll(g: Ctx, x: number, y: number, s: number, rot: number, flip = 1): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s * flip, s);
  const p = new Path2D();
  p.moveTo(-1, 0);
  p.bezierCurveTo(-0.6, -0.9, 0.5, -0.9, 0.55, -0.15);
  p.bezierCurveTo(0.58, 0.25, 0.2, 0.32, 0.12, 0.05);
  p.bezierCurveTo(0.06, -0.12, 0.28, -0.22, 0.32, -0.06);
  g.lineCap = 'round';
  g.lineWidth = 0.2;
  g.strokeStyle = '#2a1604';
  g.stroke(p);
  g.lineWidth = 0.11;
  g.strokeStyle = gold(g, -1, -1, 1, 1);
  g.stroke(p);
  // yaprak
  g.beginPath();
  g.moveTo(-0.55, -0.42);
  g.quadraticCurveTo(-0.25, -0.95, 0.05, -0.8);
  g.quadraticCurveTo(-0.3, -0.55, -0.55, -0.42);
  g.fillStyle = gold(g, -0.6, -1, 0.1, -0.4);
  g.fill();
  g.restore();
}

function* paintBack(): Job<HTMLCanvasElement> {
  const W = PW, H = PH, cx = W / 2, cy = H / 2;
  const [c, g] = makeCanvas(W, H);
  const vel = paintVelvet(W, H, [104, 8, 30], 1453);
  g.drawImage(vel, 0, 0);
  vel.width = vel.height = 0;
  if (due()) yield;
  // altın telkâri bordür: iki çizgi arasında kıvrım dizisi
  const m = 26;
  g.lineWidth = 3;
  g.strokeStyle = gold(g, 0, 0, W, H);
  g.stroke(rrPath(m, m, W - 2 * m, H - 2 * m, 18));
  g.lineWidth = 1.6;
  g.stroke(rrPath(m + 22, m + 22, W - 2 * m - 44, H - 2 * m - 44, 10));
  const along = (x0: number, y0: number, x1: number, y1: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      scroll(g, x, y, 12, Math.atan2(y1 - y0, x1 - x0), i % 2 ? 1 : -1);
    }
  };
  const e = m + 11;
  along(e + 30, e, W - e - 30, e, 6);
  along(e + 30, H - e, W - e - 30, H - e, 6);
  along(e, e + 30, e, H - e - 30, 9);
  along(W - e, e + 30, W - e, H - e - 30, 9);
  if (due()) yield;
  // köşelerde dört renk taş
  const cs: Suit[] = ['H', 'D', 'C', 'S'];
  [[e, e], [W - e, e], [W - e, H - e], [e, H - e]].forEach(([x, y], i) => {
    glow(g, x, y, 22, [255, 210, 140], 0.35);
    roundGem(g, x, y, 11, GEM[cs[i]], 400 + i);
  });
  // orta rozet: altın yıldız + pırlanta
  glow(g, cx, cy, 170, [255, 190, 110], 0.42);
  g.save();
  g.translate(cx, cy);
  for (let i = 0; i < 16; i++) {
    g.save();
    g.rotate((i / 16) * Math.PI * 2);
    const L = i % 2 ? 96 : 134;
    g.beginPath();
    g.moveTo(0, -L);
    g.quadraticCurveTo(17, -L * 0.5, 0, -36);
    g.quadraticCurveTo(-17, -L * 0.5, 0, -L);
    g.fillStyle = gold(g, -17, -L, 17, -36);
    g.fill();
    g.lineWidth = 1.4;
    g.strokeStyle = '#2a1604';
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, 68, 0, Math.PI * 2);
  g.fillStyle = gold(g, -68, -68, 68, 68);
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = '#2a1604';
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pearl(g, Math.cos(a) * 59, Math.sin(a) * 59, 4.8);
  }
  g.restore();
  // büyük pırlanta (yuvarlak, 32 yüzey)
  const p = new Path2D();
  p.arc(0, 0, 0.5, 0, Math.PI * 2);
  g.save();
  g.translate(cx, cy);
  g.scale(98, 98);
  cutGem(g, p, DIAMOND, 999);
  g.restore();
  // pırlantada gökkuşağı ateşi
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.translate(cx, cy);
  for (const [a, col] of [[0.4, '#ff3a6a'], [1.6, '#3affc0'], [2.8, '#ffd23a'], [4, '#3a8aff'], [5.2, '#c03aff']] as const) {
    g.fillStyle = rad(g, Math.cos(a) * 24, Math.sin(a) * 24, 0, 26, [
      [0, col],
      [1, 'rgba(0,0,0,0)'],
    ]);
    g.fillRect(-49, -49, 98, 98);
  }
  g.restore();
  sparkle(g, cx - 18, cy - 20, 26);
  sparkle(g, cx + 30, cy + 26, 12);
  return c;
}

function* paintAll(): Job<Art> {
  const gem = yield* paintGems();
  const ivory = paintIvory();
  if (due()) yield;
  const velvet = paintVelvet(PW, PH, [74, 6, 22], 9);
  if (due()) yield;
  const burst = paintBurst();
  const rosette = paintRosette();
  if (due()) yield;
  const court: Record<number, HTMLCanvasElement> = {};
  court[13] = yield* paintCourt('K');
  court[12] = yield* paintCourt('Q');
  court[11] = yield* paintCourt('J');
  const back = yield* paintBack();
  RF.measure();
  return {gem, ivory, velvet, court, burst, back, rosette};
}

// ───────────────────────── kart çizimi ─────────────────────────
const F = 0.05; // kadife kenar
function drawGem(g: Ctx, a: Art, s: Suit, x: number, y: number, size: number): void {
  const d = size / 0.8;
  g.drawImage(a.gem[s], x - d / 2, y - d / 2, d, d);
}

function face(g: Ctx, w: number, h: number, s: Suit, r: number, a: Art): void {
  g.save();
  g.clip(cardPath(w, h));
  g.drawImage(a.velvet, 0, 0, w, h);
  const panel = rrPath(F * w, F * w, w - 2 * F * w, h - 2 * F * w, 0.05 * w);
  g.save();
  g.clip(panel);
  g.drawImage(a.ivory, 0, 0, w, h);
  g.restore();
  g.lineWidth = 0.022 * w;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(panel);
  g.lineWidth = Math.max(0.6, 0.005 * w);
  g.strokeStyle = 'rgba(176,130,40,0.7)';
  g.stroke(rrPath(F * w + 0.03 * w, F * w + 0.03 * w, w - 2 * F * w - 0.06 * w, h - 2 * F * w - 0.06 * w, 0.03 * w));
  const cx = w / 2, cy = h / 2 + 0.02 * w;
  if (r === 1) {
    const d = 0.86 * w;
    g.drawImage(a.burst, cx - d / 2, cy - d / 2, d, d);
    // pençe yuvası: dört altın tırnak
    const sz = 0.44 * w;
    for (let i = 0; i < 4; i++) {
      const an = -Math.PI / 4 + (i * Math.PI) / 2;
      const px = cx + Math.cos(an) * sz * 0.4, py = cy + Math.sin(an) * sz * 0.42;
      g.beginPath();
      g.ellipse(px, py, 0.03 * w, 0.045 * w, an + Math.PI / 2, 0, Math.PI * 2);
      g.fillStyle = gold(g, px - 0.04 * w, py - 0.04 * w, px + 0.04 * w, py + 0.04 * w);
      g.fill();
      g.lineWidth = 0.006 * w;
      g.strokeStyle = '#3a2206';
      g.stroke();
    }
    drawGem(g, a, s, cx, cy, sz);
    sparkle(g, cx + 0.2 * w, cy - 0.2 * w, 0.06 * w);
    sparkle(g, cx - 0.22 * w, cy + 0.17 * w, 0.04 * w);
  } else if (r >= 11) {
    const dw = 0.58 * w, dh = (dw * CH) / CW;
    const x0 = cx - dw / 2, y0 = cy - 0.02 * w - dh / 2;
    g.drawImage(a.court[r], x0, y0, dw, dh);
    const sl = SLOT[r], k = dw / CW;
    drawGem(g, a, s, x0 + sl.x * k, y0 + sl.y * k, sl.d * k);
  } else {
    // broş: n taş halka hâlinde, ortada altın rozet + değer
    const R = 0.205 * w;
    const sz = Math.min(0.135 * w, (0.9 * 2 * Math.PI * R) / r);
    const rd = 0.122 * w;
    g.drawImage(a.rosette, cx - rd, cy - rd, rd * 2, rd * 2);
    for (let i = 0; i < r; i++) {
      const an = -Math.PI / 2 + (i / r) * Math.PI * 2;
      drawGem(g, a, s, cx + Math.cos(an) * R, cy + Math.sin(an) * R, sz);
    }
    const capH = 0.085 * w;
    RF.draw(g, String(r), cx, cy - capH / 2, capH, 0.12 * w, GEM[s].ink);
  }
  corners(g, w, h, s, r, {
    font: RF,
    x: 0.215,
    top: 0.09,
    cap: 0.23,
    pip: 0.155,
    gap: 0.045,
    wide: 0.27,
    rank: (gg, t, x, top, cap, maxW, su) => RF.draw(gg, t, x, top, cap, maxW, GEM[su].ink),
    pipDraw: (gg, su, x, y, size) =>
      withSuit(gg, su, x, y, size, p => {
        gg.fillStyle = GEM[su].ink;
        gg.fill(p);
        gg.save();
        gg.clip(p);
        gg.fillStyle = 'rgba(255,255,255,0.35)';
        gg.beginPath();
        gg.ellipse(-0.18, -0.2, 0.22, 0.14, -0.6, 0, Math.PI * 2);
        gg.fill();
        gg.restore();
      }),
  });
  g.restore();
  edge(g, w, h, 'rgba(40,0,10,0.8)');
}

function back(g: Ctx, w: number, h: number, a: Art): void {
  g.save();
  const card = cardPath(w, h);
  g.clip(card);
  g.drawImage(a.back, 0, 0, w, h);
  g.lineWidth = 0.05 * w;
  g.strokeStyle = gold(g, 0, 0, w, h);
  g.stroke(card);
  g.lineWidth = 0.01 * w;
  g.strokeStyle = 'rgba(30,8,0,0.85)';
  g.stroke(cardPath(w, h, 0.025 * w));
  g.restore();
}

export const skin = defineSkin<Art>({
  id: 'hazine',
  name: 'Topkapı Hazinesi',
  desc: 'Yakut, topaz, zümrüt ve safir: her kart bir mücevher.',
  fonts: () => loadFont(() => import('@fontsource/playfair-display/900.css'), `900 100px "Playfair Display"`),
  paint: paintAll,
  face,
  back,
});
