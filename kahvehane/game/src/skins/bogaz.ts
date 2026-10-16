// Deste "Boğaz Gecesi" — yağlı boya (Van Gogh ailesi; masa "Boğaz Gecesi" ile aynı fırça, src/themes/oil.ts).
// Düzen Yıldızlı Gece destesiyle aynı (src/skins/oilcard.ts): boyalı kenar şeridi + krem tuval + iri köşe dizinleri.
//   · kenar: gece göğü (girdaplı darbeler), sağ üst köşede ay; altta ışıklı kıyı ve su
//   · sayılar: takım işaretinin içinde küçük bir Boğaz tablosu — ♥♦ alacakaranlık (kızıl gök, batan güneş),
//     ♠♣ gece (lacivert gök, hilal, ışıklı pencereler); ufukta cami, Galata, yalılar; ortada iri krem değer
//   · As: dolunay madalyonu (haleli ay, suda yansıma), ortasında düz renkli takım işareti
//   · Papaz = ışıklı Galata Kulesi · Kız = Kız Kulesi ve dolunay · Vale = ışıklı Boğaz Köprüsü ve vapur
//   · arka: Boğaz gecesinin tamamı (ay, Galata, cami, köprü, Kız Kulesi, vapur, sudaki yakamoz)
import {bridge, crescent, galataTower, kizKulesi, mosque, vapur, yalilar} from '../themes/scenes';
import {canvasWeave, haloStrokes, idAt, lightDabs, makeIdMap, Oil, oilArt, pathStrokes, ringStrokes, type Ref} from '../themes/oil';
import {radial} from '../themes/paint';
import {ACE, CH, CW, drawBack, drawFace, ogeePts, clipSuit, paintCream, PH, polyPath, PW, SPR, stripMask, suitMask, type CardArt, type FaceStyle} from './oilcard';
import {defineSkin, due, loadFont, makeCanvas, mix, mulberry, RankFont, type Ctx, type Job, type RGB, type Rnd, type Suit} from './kit';

const FONT = (px: number): string => `900 ${px}px "Playfair Display", "Times New Roman", Georgia, serif`;
const RF = new RankFont(FONT);
const STYLE: FaceStyle = {font: RF, red: '#b3122e', ink: '#141a40', line: 'rgba(10,14,44,0.9)', aceSuit: 'solid', roundel: '#f6efdc'};

// ───────────────────────── eskiz parçaları ─────────────────────────
interface Disc {
  x: number;
  y: number;
  r: number;
}
/** Gece göğü: koyu lacivertten ufukta mora; üstünde açık mavi girdap kolları (darbeler bu renklerden doğar) */
function nightSky(r: Ctx, W: number, hz: number, seed: number, bands = 5): void {
  const sky = r.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#080c30');
  sky.addColorStop(0.5, '#16236c');
  sky.addColorStop(0.85, '#2e3a8e');
  sky.addColorStop(1, '#5a4790');
  r.fillStyle = sky;
  r.fillRect(0, 0, W, hz + 2);
  const rr = mulberry(seed);
  for (let i = 0; i < bands; i++) {
    const y = hz * (0.14 + (i / bands) * 0.72), ph = rr() * 6;
    r.strokeStyle = i % 2 ? 'rgba(124,166,236,.42)' : 'rgba(70,112,206,.5)';
    r.lineWidth = hz * 0.04;
    r.beginPath();
    for (let x = -10; x <= W + 10; x += 4) r.lineTo(x, y + Math.sin(x * (0.03 * 360) / W + ph) * hz * 0.035);
    r.stroke();
  }
}
function moonSketch(r: Ctx, m: Disc, halo = 4): void {
  radial(r, m.x, m.y, 0, m.r * halo, [[0, 'rgba(255,236,170,.95)'], [0.25, 'rgba(250,214,120,.55)'], [0.55, 'rgba(150,170,220,.25)'], [1, 'rgba(120,150,220,0)']]);
  r.fillStyle = '#fff5cf';
  r.beginPath();
  r.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  r.fill();
}
function starSketch(r: Ctx, x: number, y: number, R: number): void {
  radial(r, x, y, 0, R, [[0, 'rgba(255,246,200,.95)'], [0.4, 'rgba(250,230,150,.4)'], [1, 'rgba(200,210,255,0)']]);
}
type Refl = [number, number, string, number]; // x, yarı genişlik, renk "r,g,b", boy (H oranı)
/** Su: koyu lacivert, yatay dalgacıklar; ışıkların kırık yansıma sütunları */
function waterSketch(r: Ctx, W: number, H: number, hz: number, top: string, bot: string, refl: Refl[], seed: number): void {
  const sea = r.createLinearGradient(0, hz, 0, H);
  sea.addColorStop(0, top);
  sea.addColorStop(1, bot);
  r.fillStyle = sea;
  r.fillRect(0, hz, W, H - hz);
  const wr = mulberry(seed);
  const step = Math.max(2, (H - hz) * 0.03);
  for (let y = hz + 3; y < H; y += step) {
    const t = (y - hz) / (H - hz);
    r.strokeStyle = `rgba(${['70,90,180', '40,52,130', '80,64,150', '36,96,130'][Math.floor(wr() * 4)]},${0.5 - t * 0.3})`;
    r.lineWidth = step * (0.3 + wr() * 0.4);
    r.beginPath();
    const ph = wr() * 6;
    for (let x = -10; x <= W + 10; x += 6) r.lineTo(x, y + Math.sin(x * 0.05 + ph) * step * 0.2);
    r.stroke();
  }
  for (const [x0, hw, col, len] of refl) {
    const y1 = hz + (H - hz) * len;
    for (let y = hz + 1; y < y1; y += step * 0.45) {
      const t = (y - hz) / (y1 - hz);
      for (let n = 0; n < 2; n++) {
        const w = hw * (0.6 + t * 0.8);
        r.fillStyle = `rgba(${col},${(0.85 - t * 0.75) * (0.4 + wr() * 0.6)})`;
        r.fillRect(x0 + (wr() - 0.5) * w * 2 - w * 0.3, y, w * (0.3 + wr() * 0.6), step * 0.32);
      }
    }
  }
}
/** Gök akışı: dalgalı yatay + ışığın çevresinde dönen girdap */
function skyFlow(x: number, y: number, s: number, lights: Disc[]): number {
  let vx = 1, vy = 0.35 * Math.sin((x * 0.03) / s + (y * 0.06) / s) + 0.2 * Math.sin((y * 0.1) / s - (x * 0.015) / s);
  for (const m of lights) {
    const dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy, R = m.r * 2.8;
    if (d2 > R * R * 5) continue;
    const d = Math.sqrt(d2) + 1e-3, k = 3.4 * Math.exp(-d2 / (R * R));
    vx += (k * -dy) / d;
    vy += (k * dx) / d;
  }
  return Math.atan2(vy, vx);
}
const waterFlow = (x: number, y: number, s: number): number => 0.09 * Math.sin((x * 0.05) / s + (y * 0.2) / s);

/** Ay ve yıldızların üstüne kalın, açık teğet darbeler (impasto ışık) */
function moonDabs(oil: Oil, m: Disc, rnd: Rnd, s: number, haloK = 2.6, n = 1): void {
  const q = Math.max(0.5, m.r / (24 * s)); // darbe sayısı ayın boyuyla
  haloStrokes(oil, m.x, m.y, 0, m.r * 0.55, Math.round(12 * q), [[255, 250, 228], [255, 244, 204]], 2.6 * s, rnd, 5 * s, 0.14);
  haloStrokes(oil, m.x, m.y, m.r * 0.45, m.r * 0.95, Math.round(26 * q), [[255, 246, 212], [252, 234, 168], [255, 250, 232]], 2.6 * s, rnd, 8 * s);
  haloStrokes(oil, m.x, m.y, m.r * 1.15, m.r * haloK, Math.round(40 * n * q * (haloK - 1)), [[240, 206, 110], [230, 190, 96], [170, 186, 220], [210, 200, 150], [120, 150, 220], [250, 226, 150]], 2.4 * s, rnd, 10 * s);
}
function starDabs(oil: Oil, x: number, y: number, R: number, rnd: Rnd, s: number): void {
  haloStrokes(oil, x, y, 0, R * 0.42, 10, [[255, 250, 226], [255, 238, 170], [252, 226, 120]], 2.2 * s, rnd, 4 * s, 0.12);
  haloStrokes(oil, x, y, R * 0.4, R * 0.9, 12, [[240, 210, 110], [150, 180, 230], [250, 226, 140]], 1.8 * s, rnd, 7 * s);
}
function vignette(g: Ctx, W: number, H: number, a: number): void {
  radial(g, W / 2, H * 0.45, Math.min(W, H) * 0.35, Math.max(W, H) * 0.75, [[0, 'rgba(4,8,30,0)'], [1, `rgba(4,8,30,${a})`]]);
}

// ───────────────────────── kenar şeridi ─────────────────────────
function* paintFrame(): Job<HTMLCanvasElement> {
  const W = PW, H = PH, hz = H * 0.74;
  const moon: Disc = {x: W * 0.905, y: W * 0.06, r: W * 0.034};
  const stars: [number, number, number][] = [[0.55, 0.042 * (W / H), 0.05], [0.958, 0.3, 0.045], [0.042, 0.56, 0.045], [0.72, 0.04 * (W / H), 0.035]];
  const {cv, g, ref, rnd} = yield* oilArt({
    W,
    H,
    seed: 1453,
    mask: stripMask,
    under: false,
    sketch: r => {
      nightSky(r, W, hz, 3, 7);
      moonSketch(r, moon, 3.4);
      for (const [x, y, q] of stars) starSketch(r, W * x, H * y, W * q);
      waterSketch(r, W, H, hz, '#26327c', '#070a26', [[moon.x, W * 0.03, '255,226,160', 0.9], [W * 0.1, W * 0.02, '255,196,120', 0.5]], 9);
      yalilar(r, -10, W + 10, hz + 1, H * 0.03, '#080a26', mulberry(4), 0.75);
    },
    field: (x, y) => {
      if (y > hz) return waterFlow(x, y, 1);
      // kenara teğet: yan şeritlerde dikey, üstte yatay; ayın çevresinde girdap
      const side = Math.min(x, W - x) < Math.min(y, H - y);
      const base = side ? Math.PI / 2 + 0.4 * Math.sin(y * 0.05) : 0.35 * Math.sin(x * 0.04);
      const dx = x - moon.x, dy = y - moon.y, d2 = dx * dx + dy * dy, R = moon.r * 2.6;
      if (d2 < R * R * 4) {
        const t = Math.exp(-d2 / (R * R));
        return Math.atan2(Math.sin(base) * (1 - t) + (dx / Math.sqrt(d2 + 1)) * t, Math.cos(base) * (1 - t) - (dy / Math.sqrt(d2 + 1)) * t);
      }
      return base;
    },
    detail: (x, y) => (Math.abs(y - hz) < H * 0.03 ? 0.8 : 0),
  });
  const oil = new Oil();
  moonDabs(oil, moon, rnd, 1, 2.2, 1);
  for (const [x, y, q] of stars) starDabs(oil, W * x, H * y, W * q, rnd, 1);
  lightDabs(oil, ref, rnd, 0, hz - H * 0.05, W, hz + 2, 150, 2, (x, y) => 1 - stripMask(x, y));
  oil.flush(g);
  canvasWeave(g, W, H, rnd, 0.08);
  return cv;
}

// ───────────────────────── takım işaretleri ─────────────────────────
const HZ: Record<Suit, number> = {H: 0.26, D: 0.26, S: 0.27, C: 0.2};
function* paintSuit(s: Suit): Job<HTMLCanvasElement> {
  const k = SPR * 0.84, C = SPR / 2, hz = C + HZ[s] * k;
  const red = s === 'H' || s === 'D';
  const sun: Disc = {x: C + 0.15 * k, y: hz, r: 0.085 * k};
  const moon: Disc = {x: C + (s === 'C' ? 0.04 : 0) * k, y: C - (s === 'C' ? 0.33 : 0.31) * k, r: 0.075 * k};
  const sil = red ? '#3a0820' : '#03051a';
  const {cv} = yield* oilArt({
    W: SPR,
    H: SPR,
    seed: 70 + 'SHDC'.indexOf(s),
    k: 0.75,
    s: 0.9,
    under: false,
    mask: suitMask(s),
    sketch: r => {
      if (red) {
        const sky = r.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, '#6a0828');
        sky.addColorStop(0.35, '#a8102c');
        sky.addColorStop(0.62, '#d6263a');
        sky.addColorStop(0.86, '#f2643a');
        sky.addColorStop(1, '#ffae58');
        r.fillStyle = sky;
        r.fillRect(0, 0, SPR, hz + 2);
        for (let i = 0; i < 3; i++) {
          r.strokeStyle = i % 2 ? 'rgba(255,140,90,.35)' : 'rgba(150,10,50,.45)';
          r.lineWidth = SPR * 0.03;
          r.beginPath();
          for (let x = 0; x <= SPR; x += 4) r.lineTo(x, hz * (0.25 + i * 0.22) + Math.sin(x * 0.05 + i * 2) * SPR * 0.02);
          r.stroke();
        }
        radial(r, sun.x, sun.y, 0, sun.r * 4, [[0, 'rgba(255,236,170,.9)'], [0.4, 'rgba(255,170,90,.45)'], [1, 'rgba(255,120,80,0)']]);
        r.fillStyle = '#ffe9b0';
        r.beginPath();
        r.arc(sun.x, sun.y, sun.r, Math.PI, 0);
        r.fill();
        waterSketch(r, SPR, SPR, hz, '#8a1a30', '#2e0614', [[sun.x, SPR * 0.045, '255,214,130', 0.85]], 5);
      } else {
        const sky = r.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, '#04071e');
        sky.addColorStop(0.5, '#0c1652');
        sky.addColorStop(0.9, '#1e2c7a');
        sky.addColorStop(1, '#3a4690');
        r.fillStyle = sky;
        r.fillRect(0, 0, SPR, hz + 2);
        for (let i = 0; i < 3; i++) {
          r.strokeStyle = i % 2 ? 'rgba(90,130,220,.35)' : 'rgba(40,70,170,.45)';
          r.lineWidth = SPR * 0.03;
          r.beginPath();
          for (let x = 0; x <= SPR; x += 4) r.lineTo(x, hz * (0.3 + i * 0.22) + Math.sin(x * 0.05 + i * 2) * SPR * 0.02);
          r.stroke();
        }
        moonSketch(r, moon, 3);
        for (const [x, y] of [[-0.3, -0.05], [0.32, -0.12], [-0.22, 0.12], [0.3, 0.1]] as const) starSketch(r, C + x * k, C + y * k, k * 0.05);
        waterSketch(r, SPR, SPR, hz, '#14205e', '#02041a', [[C, SPR * 0.04, '240,236,200', 0.8], [C - 0.2 * k, SPR * 0.02, '255,200,120', 0.5]], 6);
      }
      const rr = mulberry(30 + 'SHDC'.indexOf(s));
      yalilar(r, 0, SPR, hz + 1, k * 0.06, sil, rr, red ? 0.2 : 0.7);
      mosque(r, C - 0.18 * k, hz + 1, k * 0.24, sil, red ? 0 : 0.7, rr);
      galataTower(r, C + 0.22 * k, hz + 2, k * 0.3, !red);
    },
    field: (x, y) => (y > hz + 1 ? waterFlow(x, y, 0.8) : skyFlow(x, y, 0.8, red ? [] : [moon])),
    detail: (x, y) => (y < hz + k * 0.06 && y > hz - k * 0.3 ? 0.9 : 0),
  });
  if (red) {
    // batan güneşin ışığı: kalın sıcak darbeler
    const g = cv.getContext('2d')!, oil = new Oil(), rnd = mulberry(88);
    g.save();
    g.beginPath();
    g.rect(0, 0, SPR, hz);
    g.clip();
    haloStrokes(oil, sun.x, sun.y, 0, sun.r * 0.9, 14, [[255, 242, 200], [255, 228, 160]], 2.4, rnd, 5, 0.12);
    haloStrokes(oil, sun.x, sun.y, sun.r * 1.1, sun.r * 2.4, 22, [[255, 196, 110], [250, 150, 80], [255, 214, 140]], 2.2, rnd, 9);
    oil.flush(g);
    g.restore();
    for (let i = 0; i < 14; i++) {
      const y = hz + 3 + rnd() * k * 0.18, x = sun.x + (rnd() - 0.5) * k * 0.14, len = 4 + rnd() * 6;
      oil.add([x - len / 2, y, x + len / 2, y], 1.6 + rnd(), mix([255, 220, 150], [255, 160, 100], rnd()), 0.25);
    }
    oil.flush(g);
  } else {
    const g = cv.getContext('2d')!, oil = new Oil(), rnd = mulberry(89);
    moonDabs(oil, moon, rnd, 0.8, 1.9, 1);
    oil.flush(g);
  }
  // işaretin kendisi: içine bu tablo boyanmış, altın kenarlı
  const spr = clipSuit(s, cv);
  cv.width = cv.height = 0;
  return spr;
}

// ───────────────────────── As: dolunay madalyonu ─────────────────────────
function* paintAce(): Job<HTMLCanvasElement> {
  const S = ACE, C = S / 2, R = S * 0.46, hz = S * 0.78;
  const moon: Disc = {x: C, y: C, r: S * 0.21};
  const {cv: art, rnd} = yield* oilArt({
    W: S,
    H: S,
    seed: 29,
    k: 0.6,
    s: 1.05,
    under: false,
    mask: (x, y) => (Math.hypot(x - C, y - C) < R + 4 ? 1 : 0),
    sketch: r => {
      nightSky(r, S, hz, 11, 5);
      radial(r, C, C, 0, R, [[0.3, 'rgba(250,214,120,.55)'], [0.62, 'rgba(120,150,220,.3)'], [1, 'rgba(120,150,220,0)']]);
      r.fillStyle = '#fff5d6';
      r.beginPath();
      r.arc(C, C, moon.r, 0, Math.PI * 2);
      r.fill();
      waterSketch(r, S, S, hz, '#26327c', '#0a0e36', [[C, S * 0.07, '255,236,180', 0.95]], 12);
      yalilar(r, 0, S * 0.3, hz + 1, S * 0.03, '#070920', mulberry(3), 0.7);
      yalilar(r, S * 0.72, S, hz + 1, S * 0.03, '#070920', mulberry(4), 0.7);
    },
    field: (x, y) => (y > hz ? waterFlow(x, y, 1) : skyFlow(x, y, 1, [{x: C, y: C, r: moon.r * 0.9}])),
    detail: (x, y) => (y > hz - S * 0.03 && y < hz + S * 0.08 ? 0.8 : 0),
  });
  const g = art.getContext('2d')!;
  const oil = new Oil();
  // ay yüzeyi: krem/gümüş kalın darbeler (ortadaki takım işaretinin zemini; sakin kalır)
  for (let i = 0; i < 4; i++) ringStrokes(oil, C, C, moon.r * (0.22 + i * 0.23), moon.r * (0.22 + i * 0.23), 7.5, [[255, 248, 226], [250, 240, 210], [244, 232, 196], [255, 252, 238]], rnd, 18, 0.1);
  // hale: iç içe sarı / krem / mavi bantlar (yalnız ufkun üstünde)
  const H1: RGB[][] = [[[250, 214, 92], [244, 188, 66]], [[232, 226, 168], [255, 236, 170]], [[70, 112, 182], [92, 134, 198]], [[160, 196, 196], [226, 198, 114]]];
  H1.forEach((cols, i) => {
    for (let j = 0; j < 2; j++) {
      const rr = moon.r * (1.08 + i * 0.18 + j * 0.08);
      ringStrokes(oil, C, C, rr, rr, 5.6, cols, rnd, 24);
    }
  });
  // hale halkaları suya taşmasın: yalnız ufkun üstüne
  g.save();
  g.beginPath();
  g.rect(0, 0, S, hz);
  g.clip();
  oil.flush(g);
  g.restore();
  const [c, cg] = makeCanvas(S, S);
  cg.save();
  cg.beginPath();
  cg.arc(C, C, R, 0, Math.PI * 2);
  cg.clip();
  cg.drawImage(art, 0, 0);
  cg.restore();
  art.width = art.height = 0;
  // madalyon kenarı: altın + lacivert boyalı halka
  const rim = new Oil();
  ringStrokes(rim, C, C, R + 1, R + 1, 5, [[20, 30, 90], [30, 50, 130]], rnd, 12);
  ringStrokes(rim, C, C, R + 5, R + 5, 4.4, [[242, 206, 74], [255, 236, 160], [214, 160, 48]], rnd, 12);
  rim.flush(cg);
  return c;
}

// ───────────────────────── saray kartları ─────────────────────────
const PAD = 15;
function* paintCourt(kind: 'K' | 'Q' | 'J'): Job<HTMLCanvasElement> {
  const W = CW, H = CH, hz = H * 0.8, s = 1.1;
  const inner = ogeePts(PAD, PAD, W - 2 * PAD, H - 2 * PAD);
  const innerP = polyPath(inner);
  const moon: Disc = kind === 'Q' ? {x: W * 0.5, y: H * 0.29, r: W * 0.15} : kind === 'K' ? {x: W * 0.76, y: H * 0.21, r: W * 0.075} : {x: W * 0.26, y: H * 0.2, r: W * 0.06};
  const tx = W * 0.47, th = H * 0.6, tbw = th * 0.125;
  const ids: Ref | null =
    kind === 'K'
      ? makeIdMap(W, H, 0.75, (r, id) => {
          const gy = hz + 2 - th * 0.7;
          r.fillStyle = id(1);
          r.fillRect(tx - tbw * 1.12, gy, tbw * 2.24, hz + 2 - gy);
          r.fillStyle = id(2);
          r.beginPath();
          r.moveTo(tx - tbw * 1.1, gy + 1);
          r.lineTo(tx, gy - th * 0.3);
          r.lineTo(tx + tbw * 1.1, gy + 1);
          r.fill();
        })
      : kind === 'J'
        ? makeIdMap(W, H, 0.75, (r, id) => {
            r.fillStyle = id(4);
            r.fillRect(W * 0.18, hz + H * 0.02, W * 0.64, H * 0.1);
          })
        : makeIdMap(W, H, 0.75, (r, id) => {
            r.fillStyle = id(3);
            r.fillRect(W * 0.3, hz - H * 0.36, W * 0.4, H * 0.4);
          });
  const {cv, g, ref, rnd} = yield* oilArt({
    W,
    H,
    seed: kind.charCodeAt(0) * 7,
    k: 0.75,
    s,
    under: false,
    mask: (x, y) => (x > PAD - 4 && x < W - PAD + 4 && y > PAD - 4 && y < H - PAD + 4 ? 1 : 0),
    sketch: r => {
      nightSky(r, W, hz, kind.charCodeAt(0), 4);
      const rr = mulberry(kind.charCodeAt(0));
      if (kind === 'K') {
        moonSketch(r, moon, 3.6);
        for (const [x, y] of [[0.22, 0.14], [0.36, 0.3], [0.86, 0.42], [0.16, 0.44]] as const) starSketch(r, W * x, H * y, W * 0.05);
        radial(r, tx, hz - th * 0.35, 0, W * 0.45, [[0, 'rgba(255,190,110,.4)'], [1, 'rgba(255,190,110,0)']]);
        waterSketch(r, W, H, hz, '#26327c', '#060a26', [[tx, W * 0.06, '255,200,120', 0.9], [moon.x, W * 0.04, '255,236,180', 0.8]], 21);
        yalilar(r, -4, W + 4, hz + 1, W * 0.07, '#070920', rr, 0.7);
        galataTower(r, tx, hz + 2, th, true);
      } else if (kind === 'Q') {
        moonSketch(r, moon, 2.6);
        for (const [x, y] of [[0.16, 0.12], [0.84, 0.14], [0.14, 0.5], [0.86, 0.52]] as const) starSketch(r, W * x, H * y, W * 0.045);
        waterSketch(r, W, H, hz, '#2a3480', '#060a26', [[moon.x, W * 0.12, '250,240,210', 1]], 22);
        yalilar(r, -4, W * 0.24, hz + 1, W * 0.05, '#0a0c2c', rr, 0.6);
        yalilar(r, W * 0.8, W + 4, hz + 1, W * 0.05, '#0a0c2c', rr, 0.6);
        kizKulesi(r, W * 0.5, hz + H * 0.035, H * 0.36, '#0a0b26', true);
      } else {
        crescent(r, moon.x, moon.y, moon.r);
        for (const [x, y] of [[0.5, 0.12], [0.78, 0.2], [0.86, 0.4]] as const) starSketch(r, W * x, H * y, W * 0.045);
        waterSketch(r, W, H, hz, '#2a2c80', '#060a26', [[W * 0.25, W * 0.04, '255,110,190', 0.8], [W * 0.72, W * 0.04, '110,210,255', 0.8], [W * 0.5, W * 0.05, '255,214,130', 0.9]], 23);
        yalilar(r, -4, W + 4, hz, W * 0.035, '#20225e', rr, 0.4);
        mosque(r, W * 0.76, hz, H * 0.12, '#181a50', 0.5, rr);
        bridge(r, -W * 0.22, W * 1.22, hz - H * 0.13, H * 0.42, '#121438', true, rr);
        vapur(r, W * 0.5, hz + H * 0.105, W * 0.56);
      }
    },
    field: (x, y) => {
      const id = ids ? idAt(ids, x, y) : 0;
      if (id === 1) return -Math.PI / 2 + 0.08 * Math.sin(y * 0.4);
      if (id === 2) return Math.atan2(hz + 2 - th - y, tx - x);
      if (id === 4) return 0.05 * Math.sin(x);
      if (y > hz + 1) return waterFlow(x, y, s);
      return skyFlow(x, y, s, [moon]);
    },
    sizeK: (x, y) => {
      const id = ids ? idAt(ids, x, y) : 0;
      return id === 1 || id === 2 ? 0.55 : id ? 0.6 : 1;
    },
    detail: (x, y) => (y > hz - H * 0.45 && y < hz + H * 0.12 && Math.abs(x - W / 2) < W * 0.3 ? 0.85 : 0),
  });
  // ışıklar
  const oil = new Oil();
  moonDabs(oil, moon, rnd, s, kind === 'Q' ? 1.7 : 2.4, 2);
  lightDabs(oil, ref, rnd, 0, hz - H * 0.62, W, hz + H * 0.02, 160, 2.2);
  for (let i = 0; i < 26; i++) {
    const t = Math.pow(rnd(), 1.3), y = hz + 3 + t * H * 0.17, x = (kind === 'J' ? W * 0.5 : moon.x) + (rnd() - 0.5) * W * (0.08 + t * 0.12);
    oil.add([x - 4, y, x + 4, y + (rnd() - 0.5)], 1.8 + rnd() * 1.2, mix([255, 236, 170], [200, 170, 120], t), 0.25);
  }
  oil.flush(g);
  canvasWeave(g, W, H, rnd, 0.08);
  vignette(g, W, H, 0.3);
  // kemere kırp + boyalı altın kemer çerçeve
  const [c, cg] = makeCanvas(W, H);
  cg.save();
  cg.clip(innerP);
  cg.drawImage(cv, 0, 0);
  cg.restore();
  cv.width = cv.height = 0;
  const fr = new Oil();
  const outer = ogeePts(PAD * 0.45, PAD * 0.45, W - PAD * 0.9, H - PAD * 0.9);
  pathStrokes(fr, outer, 5, [[150, 100, 26], [196, 140, 36]], rnd, 12, PAD * 0.18);
  pathStrokes(fr, ogeePts(PAD * 0.6, PAD * 0.6, W - PAD * 1.2, H - PAD * 1.2), 5, [[242, 206, 74], [255, 240, 170], [214, 160, 48]], rnd, 12);
  pathStrokes(fr, ogeePts(PAD * 0.85, PAD * 0.85, W - PAD * 1.7, H - PAD * 1.7), 4, [[30, 50, 130], [44, 80, 160], [22, 40, 108]], rnd, 10);
  fr.flush(cg);
  cg.lineJoin = 'round';
  cg.lineWidth = 2.2;
  cg.strokeStyle = '#10163e';
  cg.stroke(innerP);
  return c;
}

// ───────────────────────── arka yüz: Boğaz gecesi ─────────────────────────
function* paintBackArt(): Job<HTMLCanvasElement> {
  const W = PW, H = PH, hz = H * 0.6;
  const moon: Disc = {x: W * 0.74, y: H * 0.16, r: W * 0.066};
  const stars: [number, number, number][] = [[0.12, 0.07, 0.05], [0.3, 0.14, 0.035], [0.5, 0.05, 0.04], [0.92, 0.32, 0.04], [0.08, 0.3, 0.035], [0.55, 0.26, 0.03]];
  const tx = W * 0.17, th = H * 0.33, tbw = th * 0.125;
  const kx = W * 0.74, ks = H * 0.12;
  const ids = makeIdMap(W, H, 0.75, (r, id) => {
    const gy = hz + 3 - th * 0.7;
    r.fillStyle = id(1);
    r.fillRect(tx - tbw * 1.12, gy, tbw * 2.24, hz + 3 - gy);
    r.fillStyle = id(2);
    r.beginPath();
    r.moveTo(tx - tbw * 1.1, gy + 1);
    r.lineTo(tx, gy - th * 0.3);
    r.lineTo(tx + tbw * 1.1, gy + 1);
    r.fill();
    r.fillStyle = id(3);
    r.fillRect(kx - ks * 0.5, hz + H * 0.09 - ks, ks, ks);
    r.fillStyle = id(4);
    r.fillRect(W * 0.2, hz + H * 0.13, W * 0.32, H * 0.09);
    r.fillStyle = id(5);
    r.fillRect(W * 0.34, hz - H * 0.16, W * 0.2, H * 0.16);
  });
  const {cv, g, ref, rnd} = yield* oilArt({
    W,
    H,
    seed: 1923,
    k: 0.75,
    under: false,
    sketch: r => {
      nightSky(r, W, hz, 19, 6);
      moonSketch(r, moon, 4.2);
      for (const [x, y, q] of stars) starSketch(r, W * x, H * y, W * q);
      radial(r, W * 0.3, hz, 0, W * 0.5, [[0, 'rgba(230,140,110,.32)'], [1, 'rgba(230,140,110,0)']], 1.4, 0.35);
      waterSketch(r, W, H, hz, '#24307a', '#050820', [[moon.x, W * 0.06, '255,232,170', 0.95], [tx, W * 0.03, '255,196,120', 0.5], [W * 0.44, W * 0.03, '255,206,130', 0.4], [W * 0.66, W * 0.025, '255,110,190', 0.35], [W * 0.9, W * 0.025, '110,210,255', 0.35]], 31);
      const rr = mulberry(17);
      yalilar(r, -10, W + 10, hz - 1, H * 0.018, '#2a2c6c', rr, 0.35);
      bridge(r, W * 0.5, W * 1.3, hz - H * 0.03, H * 0.09, '#1b1c52', true, rr);
      mosque(r, W * 0.44, hz + 1, H * 0.15, '#0b0d2c', 0.6, rr);
      yalilar(r, -10, W * 0.34, hz + 2, H * 0.028, '#070920', rr, 0.6);
      radial(r, tx, hz - th * 0.4, 0, th * 0.5, [[0, 'rgba(255,190,110,.35)'], [1, 'rgba(255,190,110,0)']]);
      galataTower(r, tx, hz + 3, th, true);
      kizKulesi(r, kx, hz + H * 0.09, ks, '#0a0b26', true);
      vapur(r, W * 0.36, hz + H * 0.2, W * 0.28);
    },
    field: (x, y) => {
      const id = idAt(ids, x, y);
      if (id === 1) return -Math.PI / 2 + 0.08 * Math.sin(y * 0.4);
      if (id === 2) return Math.atan2(hz + 3 - th - y, tx - x);
      if (id === 3) return -Math.PI / 2;
      if (id === 4) return 0;
      if (id === 5) return -Math.PI / 2 + 0.3 * Math.sin(x * 0.3);
      if (y > hz + 1) return waterFlow(x, y, 1);
      return skyFlow(x, y, 1, [moon, ...stars.map(([a, b, q]) => ({x: W * a, y: H * b, r: W * q * 0.6}))]);
    },
    sizeK: (x, y) => (idAt(ids, x, y) ? 0.5 : 1),
    detail: (x, y) => {
      if (Math.abs(y - hz) < H * 0.06) return 0.9;
      if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 4) return 0.8;
      if (y > hz && Math.abs(x - moon.x) < W * 0.1) return 0.7;
      if (idAt(ids, x, y)) return 1;
      return 0;
    },
  });
  const oil = new Oil();
  moonDabs(oil, moon, rnd, 1, 2.8, 3);
  for (const [x, y, q] of stars) starDabs(oil, W * x, H * y, W * q, rnd, 1);
  lightDabs(oil, ref, rnd, 0, hz - H * 0.36, W, hz + H * 0.12, 160, 2.2);
  for (let i = 0; i < 60; i++) {
    const t = Math.pow(rnd(), 1.3), y = hz + 3 + t * H * 0.34, x = moon.x + (rnd() - 0.5) * W * (0.05 + t * 0.14);
    const len = (5 + rnd() * 8) * (1 - t * 0.4);
    oil.add([x - len / 2, y, x, y + (rnd() - 0.5), x + len / 2, y], 1.6 + rnd() * 1.4, mix([255, 236, 170], [200, 170, 120], t), 0.25);
  }
  oil.flush(g);
  if (due()) yield;
  canvasWeave(g, W, H, rnd, 0.09);
  vignette(g, W, H, 0.34);
  return cv;
}

function* paintAll(): Job<CardArt> {
  const T: [string, number][] = [];
  let t0 = performance.now();
  const lap = (n: string): void => {
    const t = performance.now();
    T.push([n, Math.round(t - t0)]);
    t0 = t;
  };
  const frame = yield* paintFrame();
  lap('frame');
  const cream = yield* paintCream(77, '#f7f2e4', '#e6dcc4', [
    [0.3, 0.26, 0.42, 'rgba(150,172,214,.2)'],
    [0.72, 0.74, 0.46, 'rgba(150,172,214,.16)'],
    [0.62, 0.3, 0.3, 'rgba(236,206,140,.14)'],
  ]);
  lap('cream');
  const suit = {} as Record<Suit, HTMLCanvasElement>;
  for (const s of ['S', 'H', 'D', 'C'] as Suit[]) suit[s] = yield* paintSuit(s);
  lap('suits');
  const ace = yield* paintAce();
  lap('ace');
  const court: Record<number, HTMLCanvasElement> = {};
  court[13] = yield* paintCourt('K');
  court[12] = yield* paintCourt('Q');
  court[11] = yield* paintCourt('J');
  lap('courts');
  const back = yield* paintBackArt();
  lap('back');
  console.warn('TIMING', JSON.stringify(T));
  RF.measure();
  return {frame, cream, suit, ace, court, back};
}

export const skin = defineSkin<CardArt>({
  id: 'bogaz',
  name: 'Boğaz Gecesi',
  desc: 'Galata, Kız Kulesi ve ışıklı köprü: İstanbul gecesi, yağlı boya.',
  fonts: () => loadFont(() => import('@fontsource/playfair-display/900.css'), `900 100px "Playfair Display"`),
  paint: paintAll,
  face: (g, w, h, s, r, a) => drawFace(g, w, h, s, r, a, STYLE),
  back: (g, w, h, a) => drawBack(g, w, h, a, 'rgba(255,226,150,0.85)'),
});
