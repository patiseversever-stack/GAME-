// Kart tarzı s2 — "Modern Beyaz": temiz, modern, minimal; klasik kırmızı (♥ ♦) / siyah (♠ ♣).
//   · yüz: bembeyaz, çok hafif soğuk degrade, kıl inceliğinde açık gri kenar
//   · köşe indeksi: dev Inter 900 değer + altında keskin geometrik takım işareti; sağ altta 180° kopya
//     (elde yelpaze açıldığında kartın yalnız sol ≈ %40'ı görünür → indeks iri ve sıkı)
//   · sayı kartları: ortada tek BÜYÜK takım işareti (pip ızgarası yok) — bir bakışta okunur
//   · as: dev takım işareti + ince halka
//   · papaz / kız / vale: takım renginde yuvarlak köşeli pano; içinde beyaz düz geometrik amblem
//     (taç / tiara / tüylü bere), harf monogramı ve ince aralıklı Türkçe ad
//   · arka yüz: koyu lacivert, ince çizgili geometrik desen, küçük altın "PİŞTİ" monogramı, ince beyaz kenar
// Bütün çizim "tasarım birimi" uzayında: kart genişliği 100, yüksekliği 100 / 0.7.
import '@fontsource/inter/900.css';
import type {Skin, Suit} from '../../src/skins/contract';

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient;

const UW = 100;
const UH = UW / 0.7; // 142.857
const CR = 8; // köşe yarıçapı (genişliğin %8'i)
const RED = '#e0192f';
const BLACK = '#111318';
const FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COURT_NAME: Record<number, string> = {11: 'VALE', 12: 'KIZ', 13: 'PAPAZ'};

const isRed = (s: Suit): boolean => s === 'H' || s === 'D';

// ───────────────────────── yardımcılar ─────────────────────────

/** Saat yönünde yuvarlak köşeli dikdörtgen alt yolu. */
function rrect(g: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Harf aralığı ayarlı metin; (x, y) = yatay hizaya göre nokta, taban çizgisi. Mürekkep genişliğini döndürür. */
function tracked(g: Ctx, text: string, x: number, y: number, track: number, align: 'left' | 'center' = 'center', sx = 1): number {
  const chars = [...text];
  const adv = chars.map(c => g.measureText(c).width);
  const total = adv.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  g.save();
  g.translate(x, y);
  g.scale(sx, 1);
  let cx = align === 'center' ? -total / 2 : 0;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  chars.forEach((c, i) => {
    g.fillText(c, cx, 0);
    cx += adv[i] + track;
  });
  g.restore();
  return total * sx;
}

// ───────────────────────── takım işaretleri ─────────────────────────
// Birim uzayda (kalp genişliği ≈ 1) çizilir; (cx, cy) görsel merkez, s ölçek.

/** Kalp gövdesi (fy = 1) ya da ters çevrilmiş maça gövdesi (fy = -1): iki daire + teğet kenarlar. */
function lobes(g: Ctx, cx: number, cy: number, s: number, fy: 1 | -1, cOff: number, tip: number, A: number, R: number, bulge: number): void {
  const X = (u: number): number => cx + u * s;
  const Y = (v: number): number => cy + v * s * fy;
  // sol dairenin dış teğet noktası (yerel uzay, uç aşağıda)
  const lcU = -A, lcV = cOff;
  const dx = -lcU, dy = tip - lcV;
  const d = Math.hypot(dx, dy);
  const ta = Math.atan2(dy, dx) + Math.acos(R / d);
  const tu = lcU + R * Math.cos(ta), tv = lcV + R * Math.sin(ta);
  const na = Math.atan2(-Math.sqrt(R * R - A * A), A); // çentik açısı (sol daire)
  // yan kenarı hafifçe dışa bombele
  const mu = tu / 2, mv = (tv + tip) / 2;
  const len = Math.hypot(tu, tv - tip);
  const nu = -(tv - tip) / len, nv = tu / len; // dış normal (sola)
  const k = nu < 0 ? 1 : -1;
  const qu = mu + nu * k * bulge, qv = mv + nv * k * bulge;
  const ccw = fy < 0;
  const ang = (a: number): number => (fy < 0 ? -a : a);
  g.beginPath();
  g.moveTo(X(0), Y(tip));
  g.quadraticCurveTo(X(qu), Y(qv), X(tu), Y(tv));
  g.arc(X(lcU), Y(lcV), R * s, ang(ta), ang(na), ccw);
  g.arc(X(A), Y(lcV), R * s, ang(Math.PI - na), ang(Math.PI - ta), ccw);
  g.quadraticCurveTo(X(-qu), Y(qv), X(0), Y(tip));
  g.closePath();
  g.fill();
}

/** Maça / sinek sapı: dar üstten geniş tabana içbükey açılır. */
function stem(g: Ctx, cx: number, cy: number, s: number, top: number, base: number, half: number): void {
  const X = (u: number): number => cx + u * s;
  const Y = (v: number): number => cy + v * s;
  g.beginPath();
  g.moveTo(X(-0.035), Y(top));
  g.lineTo(X(0.035), Y(top));
  g.quadraticCurveTo(X(0.045), Y(base - 0.09), X(half), Y(base));
  g.lineTo(X(-half), Y(base));
  g.quadraticCurveTo(X(-0.045), Y(base - 0.09), X(-0.035), Y(top));
  g.closePath();
  g.fill();
}

function drawSuit(g: Ctx, suit: Suit, cx: number, cy: number, s: number, fill: Fill): void {
  g.fillStyle = fill;
  if (suit === 'H') {
    lobes(g, cx, cy - 0.03 * s, s, 1, -0.17, 0.5, 0.25, 0.27, 0.045);
  } else if (suit === 'S') {
    lobes(g, cx, cy - 0.06 * s, s, -1, -0.2, 0.5, 0.25, 0.27, 0.05);
    stem(g, cx, cy, s, 0.1, 0.55, 0.19);
  } else if (suit === 'D') {
    const X = (u: number): number => cx + u * s;
    const Y = (v: number): number => cy + v * s;
    const hw = 0.43, hh = 0.56, c = 0.045;
    g.beginPath();
    g.moveTo(X(0), Y(-hh));
    g.quadraticCurveTo(X(hw / 2 - c), Y(-hh / 2 + c * 0.8), X(hw), Y(0));
    g.quadraticCurveTo(X(hw / 2 - c), Y(hh / 2 - c * 0.8), X(0), Y(hh));
    g.quadraticCurveTo(X(-hw / 2 + c), Y(hh / 2 - c * 0.8), X(-hw), Y(0));
    g.quadraticCurveTo(X(-hw / 2 + c), Y(-hh / 2 + c * 0.8), X(0), Y(-hh));
    g.closePath();
    g.fill();
  } else {
    const r = 0.245 * s;
    const oy = cy - 0.02 * s;
    const circ = (u: number, v: number, rr: number): void => {
      g.moveTo(cx + u * s + rr, oy + v * s);
      g.arc(cx + u * s, oy + v * s, rr, 0, Math.PI * 2);
    };
    g.beginPath();
    circ(0, -0.275, r);
    circ(-0.272, 0.075, r);
    circ(0.272, 0.075, r);
    circ(0, 0.03, 0.15 * s);
    g.fill();
    stem(g, cx, cy, s, 0.1, 0.56, 0.19);
  }
}

/** Büyük işaretler için hafif dikey degrade (düz renk algısı korunur, derinlik eklenir). */
function suitFill(g: Ctx, red: boolean, cy: number, s: number): CanvasGradient {
  const gr = g.createLinearGradient(0, cy - s * 0.55, 0, cy + s * 0.55);
  if (red) {
    gr.addColorStop(0, '#f02a40');
    gr.addColorStop(1, '#c90f26');
  } else {
    gr.addColorStop(0, '#2c3039');
    gr.addColorStop(1, '#08090c');
  }
  return gr;
}

// ───────────────────────── yüz ─────────────────────────

function faceBase(g: Ctx): void {
  g.beginPath();
  rrect(g, 0, 0, UW, UH, CR);
  const bg = g.createLinearGradient(0, 0, UW * 0.6, UH);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.55, '#fbfcfe');
  bg.addColorStop(1, '#eef2f8');
  g.fillStyle = bg;
  g.fill();
  // kıl inceliğinde kenar
  g.beginPath();
  rrect(g, 0.4, 0.4, UW - 0.8, UH - 0.8, CR - 0.4);
  g.strokeStyle = '#cdd3dd';
  g.lineWidth = 0.8;
  g.stroke();
}

/** Sol üst köşe indeksi: dev değer + altında takım işareti. */
function cornerIndex(g: Ctx, suit: Suit, rank: number, col: string): void {
  const label = RANKS[rank];
  const colX = 17; // indeks sütununun ortası
  const top = 7; // değerin üst çizgisi
  const maxW = 27;
  const FS = 37;
  g.font = `900 ${FS}px ${FONT}`;
  const capH = g.measureText('K').actualBoundingBoxAscent;
  const two = label.length > 1;
  // "10" biraz küçük punto + sıkı aralık; yine sığmazsa yatay sıkıştır
  const fs = two ? 34 : FS;
  g.font = `900 ${fs}px ${FONT}`;
  const track = two ? -0.08 * fs : 0;
  const w = [...label].reduce((a, c) => a + g.measureText(c).width, 0) + track * (label.length - 1);
  const sx = Math.min(1, maxW / w);
  const capF = g.measureText('K').actualBoundingBoxAscent;
  g.fillStyle = col;
  tracked(g, label, colX, top + capH - (capH - capF) / 2, track, 'center', sx);
  const ss = 15.5;
  drawSuit(g, suit, colX, top + capH + 6.5 + ss * 0.5, ss, col);
}

function drawIndices(g: Ctx, suit: Suit, rank: number, col: string): void {
  cornerIndex(g, suit, rank, col);
  g.save();
  g.translate(UW, UH);
  g.rotate(Math.PI);
  cornerIndex(g, suit, rank, col);
  g.restore();
}

function drawAce(g: Ctx, suit: Suit, red: boolean): void {
  const cx = UW / 2, cy = UH / 2;
  const s = suit === 'D' ? 50 : 54;
  drawSuit(g, suit, cx, cy, s, suitFill(g, red, cy, s));
}

// ── saray kartı amblemleri (takım renginde, düz geometrik); (0, 0) merkezli, genişlik ≈ 32, taban y ≈ 12 ──

const circ = (g: Ctx, x: number, y: number, r: number): void => {
  g.moveTo(x + r, y);
  g.arc(x, y, r, 0, Math.PI * 2);
};

/** Papaz: üç uçlu taç, toplu uçlar, mücevher oyukları, ayrık taban bandı. */
function crown(g: Ctx): void {
  g.beginPath();
  g.moveTo(-13.5, 6);
  g.lineTo(-15.5, -7.5);
  g.lineTo(-7.5, -0.5);
  g.lineTo(0, -11.5);
  g.lineTo(7.5, -0.5);
  g.lineTo(15.5, -7.5);
  g.lineTo(13.5, 6);
  g.closePath();
  // oyuklar (evenodd ile delik)
  g.moveTo(0, -2);
  g.lineTo(2.7, 1.4);
  g.lineTo(0, 4.8);
  g.lineTo(-2.7, 1.4);
  g.closePath();
  circ(g, -8.2, 2.4, 1.35);
  circ(g, 8.2, 2.4, 1.35);
  g.fill('evenodd');
  g.beginPath();
  circ(g, -15.5, -9.3, 2.3);
  circ(g, 0, -13.6, 2.5);
  circ(g, 15.5, -9.3, 2.3);
  g.fill();
  g.beginPath();
  rrect(g, -13.5, 8, 27, 4.2, 1.3);
  g.fill();
}

/** Kız: kemerli diadem; oyuklu bant, tepede damla taş, kenarda inciler. */
function tiara(g: Ctx): void {
  g.beginPath();
  g.moveTo(-16, 8);
  g.bezierCurveTo(-12, -0.5, -6, -5.5, 0, -6.5);
  g.bezierCurveTo(6, -5.5, 12, -0.5, 16, 8);
  g.quadraticCurveTo(0, 1.5, -16, 8);
  g.closePath();
  circ(g, 0, -1.6, 2.1);
  circ(g, -6.6, 1.2, 1.4);
  circ(g, 6.6, 1.2, 1.4);
  circ(g, -11.6, 4.2, 0.9);
  circ(g, 11.6, 4.2, 0.9);
  g.fill('evenodd');
  // ince taban bandı
  g.beginPath();
  g.moveTo(-16, 10.4);
  g.quadraticCurveTo(0, 3.9, 16, 10.4);
  g.lineTo(15.6, 12.4);
  g.quadraticCurveTo(0, 6.2, -15.6, 12.4);
  g.closePath();
  g.fill();
  // tepe damla taş
  g.beginPath();
  g.moveTo(0, -17);
  g.quadraticCurveTo(3.6, -12.2, 2.6, -9.6);
  g.quadraticCurveTo(0, -7.4, -2.6, -9.6);
  g.quadraticCurveTo(-3.6, -12.2, 0, -17);
  g.closePath();
  // üst kenar boyunca inciler
  for (const t of [0.2, 0.42, 0.62]) {
    for (const sgn of [-1, 1]) {
      // kübik kenarın yaklaşık noktası
      const u = 1 - t;
      const x = sgn * (u * u * u * 16 + 3 * u * u * t * 12 + 3 * u * t * t * 6);
      const y = u * u * u * 8 + 3 * u * u * t * -0.5 + 3 * u * t * t * -5.5 + t * t * t * -6.5;
      circ(g, x, y - 2.3, 1.15);
    }
  }
  g.fill();
}

/** Vale: tüylü yassı bere; tüy gövdenin arkasından yükselir, orta damarı oyuk. */
function beret(g: Ctx): void {
  // tüy (önce çizilir; tabanı gövdenin arkasında kalır)
  g.beginPath();
  g.moveTo(5.5, -3);
  g.bezierCurveTo(7.5, -11, 13.5, -16.5, 21.5, -19.5);
  g.bezierCurveTo(20, -12, 16, -5.5, 11, -1);
  g.closePath();
  g.moveTo(8.4, -5);
  g.bezierCurveTo(10.6, -10.6, 14.6, -14.6, 19.8, -17.6);
  g.bezierCurveTo(15.2, -13.8, 11.8, -9.6, 9.4, -4.4);
  g.closePath();
  g.fill('evenodd');
  // yassı, hafif eğik gövde + tepe düğmesi
  g.save();
  g.rotate(-0.1);
  g.beginPath();
  g.moveTo(-16.5, 4);
  g.bezierCurveTo(-18, -4.5, -9, -10, 0, -10);
  g.bezierCurveTo(9, -10, 16.5, -5.5, 15, 4);
  g.closePath();
  circ(g, -0.5, -11.6, 1.8);
  g.fill();
  g.restore();
  // bant
  g.beginPath();
  rrect(g, -13, 6.6, 26, 5.4, 2.6);
  g.fill();
}

/** Saray kartı: takım renginde amblem + altında harf madalyonu + ince aralıklı Türkçe ad. */
function drawCourt(g: Ctx, rank: number, red: boolean, col: string): void {
  const cx = UW / 2;
  const my = 79, mr = 19.5; // madalyon
  // amblem: madalyonun üstünde
  g.save();
  g.translate(cx, my - mr - 15.5);
  g.scale(0.9, 0.9);
  g.fillStyle = suitFill(g, red, 0, 30);
  if (rank === 13) crown(g);
  else if (rank === 12) tiara(g);
  else beret(g);
  g.restore();
  // madalyon
  g.beginPath();
  g.arc(cx, my, mr, 0, Math.PI * 2);
  g.fillStyle = suitFill(g, red, my, mr * 2);
  g.fill();
  g.beginPath();
  g.arc(cx, my, mr + 2.2, 0, Math.PI * 2);
  g.strokeStyle = red ? 'rgba(224,25,47,0.45)' : 'rgba(17,19,24,0.4)';
  g.lineWidth = 0.6;
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = `900 29px ${FONT}`;
  const capH = g.measureText('K').actualBoundingBoxAscent;
  tracked(g, RANKS[rank], cx, my + capH / 2, 0);
  // ad + iki yanında kıl çizgi
  g.font = `900 4.8px ${FONT}`;
  g.fillStyle = col;
  const ny = my + mr + 9.5;
  const tw = tracked(g, COURT_NAME[rank], cx + 0.6, ny, 1.2);
  g.fillRect(cx - tw / 2 - 7.5, ny - 2.1, 5, 0.5);
  g.fillRect(cx + tw / 2 + 2.5, ny - 2.1, 5, 0.5);
}

function drawFace(g: Ctx, w: number, h: number, suit: Suit, rank: number): void {
  g.save();
  g.scale(w / UW, h / UH);
  faceBase(g);
  const red = isRed(suit);
  const col = red ? RED : BLACK;
  if (rank === 1) drawAce(g, suit, red);
  else if (rank >= 11) drawCourt(g, rank, red, col);
  else {
    const s = 45;
    drawSuit(g, suit, UW / 2, UH / 2, s, suitFill(g, red, UH / 2, s));
  }
  drawIndices(g, suit, rank, col);
  g.restore();
}

// ───────────────────────── arka yüz ─────────────────────────

function drawBack(g: Ctx, w: number, h: number): void {
  g.save();
  g.scale(w / UW, h / UH);
  // beyaz ince kenar
  g.beginPath();
  rrect(g, 0, 0, UW, UH, CR);
  g.fillStyle = '#ffffff';
  g.fill();
  const m = 3.6;
  const ix = m, iy = m, iw = UW - 2 * m, ih = UH - 2 * m;
  g.beginPath();
  rrect(g, ix, iy, iw, ih, CR - m * 0.6);
  const bg = g.createRadialGradient(UW / 2, UH / 2, 4, UW / 2, UH / 2, UH * 0.62);
  bg.addColorStop(0, '#1a2668');
  bg.addColorStop(0.55, '#0d1440');
  bg.addColorStop(1, '#080c2b');
  g.fillStyle = bg;
  g.fill();
  g.save();
  g.clip();
  // ince çizgi kafes (merkeze doğru hafifçe parlar)
  const ln = g.createRadialGradient(UW / 2, UH / 2, 0, UW / 2, UH / 2, UH * 0.6);
  ln.addColorStop(0, 'rgba(150,175,255,0.30)');
  ln.addColorStop(1, 'rgba(150,175,255,0.10)');
  g.strokeStyle = ln;
  g.lineWidth = 0.35;
  g.beginPath();
  const step = 6;
  for (let k = -UH; k < UW + UH; k += step) {
    g.moveTo(k, 0);
    g.lineTo(k + UH, UH);
    g.moveTo(k, UH);
    g.lineTo(k + UH, 0);
  }
  g.stroke();
  g.restore();
  // iç altın kıl çerçeve
  g.beginPath();
  rrect(g, ix + 3.4, iy + 3.4, iw - 6.8, ih - 6.8, 3.5);
  g.strokeStyle = 'rgba(232,196,110,0.75)';
  g.lineWidth = 0.55;
  g.stroke();
  // monogram
  const cx = UW / 2, cy = UH / 2;
  const gold = g.createLinearGradient(0, cy - 16, 0, cy + 16);
  gold.addColorStop(0, '#fbe7a1');
  gold.addColorStop(0.5, '#e2b55a');
  gold.addColorStop(1, '#b8862c');
  g.beginPath();
  g.arc(cx, cy, 17.5, 0, Math.PI * 2);
  g.fillStyle = '#0d1440';
  g.fill();
  g.beginPath();
  g.arc(cx, cy, 16.6, 0, Math.PI * 2);
  g.strokeStyle = gold;
  g.lineWidth = 0.9;
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, 14.6, 0, Math.PI * 2);
  g.lineWidth = 0.3;
  g.stroke();
  // halka üstünde dört küçük elmas
  g.fillStyle = gold;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * 16.6, y = cy + Math.sin(a) * 16.6;
    g.beginPath();
    g.moveTo(x, y - 1.6);
    g.lineTo(x + 1.6, y);
    g.lineTo(x, y + 1.6);
    g.lineTo(x - 1.6, y);
    g.closePath();
    g.fill();
  }
  g.font = `900 6.6px ${FONT}`;
  tracked(g, 'PİŞTİ', cx, cy + 1.6, 0.9);
  // altında dört küçük takım işareti, üstünde kıl çizgi
  (['S', 'H', 'D', 'C'] as Suit[]).forEach((st, i) => drawSuit(g, st, cx + (i - 1.5) * 4.3, cy + 7.6, 2.7, gold));
  g.fillRect(cx - 4.5, cy - 8, 9, 0.45);
  g.restore();
}

export const skin: Skin = {
  id: 's2',
  name: 'Modern Beyaz',
  desc: 'Bembeyaz zemin, dev ve net köşe indeksleri, sade geometrik semboller.',
  async prepare(): Promise<void> {
    const f = document.fonts;
    if (!f) return;
    await Promise.race([
      f.load(`900 40px ${FONT}`, 'AKQJ0123456789 PİŞTİ PAPAZ KIZ VALE').catch(() => undefined),
      new Promise(r => setTimeout(r, 3000)),
    ]);
  },
  drawFace,
  drawBack,
};
