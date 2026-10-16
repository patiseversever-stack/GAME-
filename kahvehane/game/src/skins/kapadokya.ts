// Deste "Kapadokya Şafağı" — yağlı boya (masa "Kapadokya Şafağı" ile aynı fırça, src/themes/oil.ts).
// Düzen Yıldızlı Gece destesiyle aynı (src/skins/oilcard.ts): boyalı kenar şeridi + krem tuval + iri köşe dizinleri.
//   · kenar: şafak göğü (koyu mavi → gül → altın), şeritte minik balonlar; altta peri bacaları ve vadi
//   · sayılar: takım şeklinde boyalı balon (dilimler boyunca meridyen darbeleri), altında halatlı hasır sepet
//   · As: doğan güneş madalyonu (haleli güneş, uzak balonlar, peri bacaları) + önünde takım balonu
//   · saray kartları kaya kemerli pencerede: Papaz = taçlı mor-altın balon, Kız = laleli gül balon,
//     Vale = dört renk balon (Pişti'nin güç kartı) — hepsi peri bacalarının üstünde, şafakta
//   · arka: Kapadokya şafağının tamamı (güneş, onlarca balon, peri bacaları, vadi)
import {basket, classicPath, envelope, fairy, ridge, smallBalloon} from '../themes/scenes';
import {canvasWeave, haloStrokes, idAt, lightDabs, makeIdMap, Oil, oilArt, pathStrokes, ringStrokes, type Ref} from '../themes/oil';
import {radial} from '../themes/paint';
import {ACE, archPts, CH, clipSuit, CW, drawBack, drawFace, paintCream, PH, polyPath, PW, SPR, stripMask, suitMask, type CardArt, type FaceStyle} from './oilcard';
import {crown, defineSkin, due, loadFont, makeCanvas, mix, mulberry, RankFont, suitPath, type Ctx, type Job, type RGB, type Rnd, type Suit} from './kit';

const FONT = (px: number): string => `400 ${px}px "Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif`;
const RF = new RankFont(FONT);
const STYLE: FaceStyle = {font: RF, red: '#c8143c', ink: '#2b1d5c', line: 'rgba(40,18,52,0.9)', aceSuit: 'sprite', roundel: '#fbf0e0'};

/** Takım balonlarının dilim renkleri (ilk renk baskın: takım rengi okunur kalsın) */
const GORE: Record<Suit, string[]> = {
  H: ['#d0103c', '#ee3c4e', '#d0103c', '#ffc23a'],
  D: ['#e3202e', '#ff7a2a', '#e3202e', '#ffd84a'],
  S: ['#2b1d5c', '#4b3496', '#2b1d5c', '#e8b03a'],
  C: ['#1c2456', '#2a7a6e', '#1c2456', '#e8b03a'],
};

interface Disc {
  x: number;
  y: number;
  r: number;
}
interface Bal {
  x: number;
  y: number;
  r: number;
  cols: string[];
}

// ───────────────────────── eskiz parçaları ─────────────────────────
/** Şafak göğü: koyu kobalttan güle, ufukta altına; yatay pembe-altın bulut şeritleri */
function dawnSky(r: Ctx, W: number, hz: number, seed: number, clouds = 6): void {
  const sky = r.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#24388e');
  sky.addColorStop(0.3, '#4a46a6');
  sky.addColorStop(0.58, '#b05c9c');
  sky.addColorStop(0.8, '#ff9472');
  sky.addColorStop(1, '#ffd47e');
  r.fillStyle = sky;
  r.fillRect(0, 0, W, hz + 2);
  const rr = mulberry(seed);
  for (let i = 0; i < clouds; i++) {
    const y = hz * (0.2 + rr() * 0.65), x = W * rr(), w = W * (0.25 + rr() * 0.4);
    const warm = y > hz * 0.5;
    radial(r, x, y, 0, w * 0.5, [[0, warm ? 'rgba(255,214,170,.45)' : 'rgba(210,150,200,.4)'], [1, 'rgba(255,200,170,0)']], 1, 0.16);
  }
}
function sunSketch(r: Ctx, s: Disc, halo = 4): void {
  radial(r, s.x, s.y, 0, s.r * halo, [[0, 'rgba(255,246,200,.95)'], [0.3, 'rgba(255,214,140,.6)'], [0.65, 'rgba(255,150,120,.25)'], [1, 'rgba(255,140,120,0)']]);
  r.fillStyle = '#fff3c4';
  r.beginPath();
  r.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  r.fill();
}
/** Vadi + peri bacaları (ufuk altında) */
function valley(r: Ctx, W: number, H: number, hz: number, seed: number, ch: number, cw: number): void {
  const v = r.createLinearGradient(0, hz, 0, H);
  v.addColorStop(0, '#b4687e');
  v.addColorStop(0.35, '#86486e');
  v.addColorStop(0.7, '#5c3260');
  v.addColorStop(1, '#2c1a36');
  r.fillStyle = v;
  r.fillRect(0, hz, W, H - hz);
  ridge(r, hz + 1, ch * 0.18);
  // derinlik: uzak sıra küçük ve soluk, orta sıra seyrek, ön sırada yalnız kenarlarda iri kümeler
  fairy(r, mulberry(seed), -cw, W + cw, hz + ch * 0.4, ch * 0.5, cw * 0.5, 0.55);
  fairy(r, mulberry(seed + 1), W * 0.06, W * 0.42, hz + ch * 0.75, ch * 0.75, cw * 0.75, 0.85);
  fairy(r, mulberry(seed + 4), W * 0.62, W * 0.94, hz + ch * 0.8, ch * 0.7, cw * 0.75, 0.85);
  fairy(r, mulberry(seed + 2), -cw * 0.6, W * 0.26, hz + ch * 1.25, ch * 1.15, cw * 1.1);
  fairy(r, mulberry(seed + 3), W * 0.78, W + cw, hz + ch * 1.3, ch * 1.05, cw * 1.05);
}
/** Balon (eskiz): klasik zarf, dilimler, sepet */
function balloon(r: Ctx, b: Bal, haze = 0, hazeCol: RGB = [255, 200, 180]): void {
  smallBalloon(r, b.x, b.y, b.r, b.cols, haze, hazeCol);
}
/** Balon zarfının meridyen yönü (birim zarf: yarı genişlik 0.56, yarı boy 0.64) */
function meridian(x: number, y: number, b: Disc): number {
  const u = (x - b.x) / b.r, v = Math.max(-0.6, Math.min(0.6, (y - b.y) / b.r));
  const q = 1 - (v * v) / 0.4096;
  return Math.atan2(1, (-u * (v / 0.4096)) / Math.max(0.12, q));
}
const skyFlow = (x: number, y: number, s: number, sun?: Disc): number => {
  let vx = 1, vy = 0.22 * Math.sin((x * 0.025) / s + (y * 0.05) / s) + 0.12 * Math.sin((y * 0.1) / s - (x * 0.02) / s);
  if (sun) {
    const dx = x - sun.x, dy = y - sun.y, d2 = dx * dx + dy * dy, R = sun.r * 2.6;
    if (d2 < R * R * 5) {
      const d = Math.sqrt(d2) + 1e-3, k = 2.6 * Math.exp(-d2 / (R * R));
      vx += (k * -dy) / d;
      vy += (k * dx) / d;
    }
  }
  return Math.atan2(vy, vx);
};
const valleyFlow = (x: number, y: number, s: number): number => 0.18 * Math.sin((x * 0.04) / s + (y * 0.09) / s);
/** Bölge kimlik haritası: 1..n balonlar, 200 peri bacası/kaya, 0 gök */
function regionIds(W: number, H: number, hz: number, bals: Bal[], k = 0.6): Ref {
  return makeIdMap(W, H, k, (r, id) => {
    bals.forEach((b, i) => {
      r.fillStyle = id(1 + i);
      r.beginPath();
      r.ellipse(b.x, b.y, b.r * 0.58, b.r * 0.66, 0, 0, Math.PI * 2);
      r.fill();
    });
    r.fillStyle = id(200);
    r.fillRect(0, hz - H * 0.02, W, H);
  });
}
function sunDabs(oil: Oil, s: Disc, rnd: Rnd, k: number, haloK = 2.4): void {
  const q = Math.max(0.6, s.r / (20 * k));
  haloStrokes(oil, s.x, s.y, 0, s.r * 0.95, Math.round(16 * q), [[255, 248, 214], [255, 238, 180], [255, 250, 230]], 3 * k, rnd, 7 * k, 0.12);
  // ışık: güneşten taşan, sıcak (altın → şeftali → gül) kısa darbeler; düzenli halka değil
  haloStrokes(oil, s.x, s.y, s.r * 1.05, s.r * 1.6, Math.round(20 * q), [[255, 226, 150], [255, 210, 130], [255, 236, 170]], 2.6 * k, rnd, 10 * k);
  haloStrokes(oil, s.x, s.y, s.r * 1.5, s.r * haloK, Math.round(26 * q), [[255, 180, 130], [255, 200, 150], [240, 150, 150], [255, 214, 160]], 2.4 * k, rnd, 12 * k);
}
function vignette(g: Ctx, W: number, H: number, a: number): void {
  radial(g, W / 2, H * 0.45, Math.min(W, H) * 0.35, Math.max(W, H) * 0.75, [[0, 'rgba(30,10,30,0)'], [1, `rgba(30,10,30,${a})`]]);
}

// ───────────────────────── kenar şeridi ─────────────────────────
function* paintFrame(): Job<HTMLCanvasElement> {
  const W = PW, H = PH, hz = H * 0.74;
  const sun: Disc = {x: W * 0.035, y: hz - H * 0.01, r: W * 0.04};
  const bals: Bal[] = [
    {x: W * 0.52, y: W * 0.04, r: W * 0.045, cols: ['#e8173f', '#ffd23a']},
    {x: W * 0.8, y: W * 0.042, r: W * 0.04, cols: ['#2fa7e0', '#ffffff']},
    {x: W * 0.957, y: H * 0.22, r: W * 0.042, cols: ['#7a3fc8', '#ffb43a']},
    {x: W * 0.957, y: H * 0.45, r: W * 0.036, cols: ['#18b06a', '#fff1c8']},
    {x: W * 0.043, y: H * 0.56, r: W * 0.04, cols: ['#ff6a1f', '#3a2a8c']},
  ];
  const ids = regionIds(W, H, hz, bals);
  const {cv, g, ref, rnd} = yield* oilArt({
    W,
    H,
    seed: 1985,
    s: 1.15,
    mask: stripMask,
    under: false,
    sketch: r => {
      dawnSky(r, W, hz, 5, 8);
      sunSketch(r, sun, 4);
      valley(r, W, H, hz, 40, H * 0.1, W * 0.045);
      for (const b of bals) balloon(r, b);
    },
    field: (x, y) => {
      const id = idAt(ids, x, y);
      if (id > 0 && id < 200 && bals[id - 1]) return meridian(x, y, bals[id - 1]);
      if (id === 200) return y < hz + H * 0.09 ? -Math.PI / 2 + 0.15 * Math.sin(x * 0.3) : valleyFlow(x, y, 1);
      const side = Math.min(x, W - x) < Math.min(y, H - y);
      return side ? Math.PI / 2 + 0.35 * Math.sin(y * 0.04) : skyFlow(x, y, 1, sun);
    },
    sizeK: (x, y) => {
      const id = idAt(ids, x, y);
      return id > 0 && id < 200 ? 0.38 : id === 200 && y < hz + H * 0.09 ? 0.6 : 1;
    },
    detail: (x, y) => (idAt(ids, x, y) % 200 > 0 || Math.abs(y - hz) < H * 0.05 ? 0.9 : 0),
  });
  const oil = new Oil();
  sunDabs(oil, sun, rnd, 1, 2.2);
  lightDabs(oil, ref, rnd, 0, hz - H * 0.02, W, hz + H * 0.08, 215, 2, x => (stripMask(x, hz) ? 0 : 1));
  oil.flush(g);
  canvasWeave(g, W, H, rnd, 0.08);
  return cv;
}

// ───────────────────────── takım balonları ─────────────────────────
function* paintSuit(s: Suit): Job<HTMLCanvasElement> {
  const k = SPR * 0.84, C = SPR / 2;
  const b: Disc = {x: C, y: C, r: k * 1.02};
  const {cv} = yield* oilArt({
    W: SPR,
    H: SPR,
    seed: 90 + 'SHDC'.indexOf(s),
    k: 0.75,
    s: 1,
    under: false,
    mask: suitMask(s),
    sketch: r => {
      r.fillStyle = GORE[s][0];
      r.fillRect(0, 0, SPR, SPR);
      r.save();
      r.translate(C, C);
      r.scale(k * 1.04, k * 1.04);
      envelope(r, suitPath(s), GORE[s], 8, 'rgba(0,0,0,0)');
      r.restore();
    },
    field: (x, y) => meridian(x, y, b),
    detail: (x, y) => (Math.abs(x - C) > k * 0.16 || Math.abs(y - C) > k * 0.2 ? 0.7 : 0),
  });
  // dilim dikişleri boyunca ince açık darbeler (balon kumaşının parıltısı)
  const g = cv.getContext('2d')!, oil = new Oil(), rnd = mulberry(7 + 'SHDC'.indexOf(s));
  for (let i = 0; i < 60; i++) {
    const u = (rnd() - 0.5) * 1.0, v = -0.5 + rnd() * 0.9;
    if (Math.abs(u) < 0.2 && Math.abs(v) < 0.22) continue;
    const x = C + u * k, y = C + v * k, a = meridian(x, y, b), len = 6 + rnd() * 8;
    if (rnd() < 0.5 && u > 0.1) continue;
    oil.add([x, y, x + Math.cos(a) * len, y + Math.sin(a) * len], 1.4 + rnd(), [255, 244, 220], 0.1);
  }
  g.globalAlpha = 0.35;
  oil.flush(g);
  g.globalAlpha = 1;
  const spr = clipSuit(s, cv, undefined, '#24102a');
  cv.width = cv.height = 0;
  return spr;
}

/** Takım balonunun altındaki halatlar + hasır sepet (küçük resim) */
function paintBasket(): HTMLCanvasElement {
  const Wb = 120, Hb = 104;
  const [c, g] = makeCanvas(Wb, Hb);
  g.translate(Wb / 2, 0);
  g.scale(Wb, Wb);
  basket(g, -0.12, 0.12, 0.0, 0.42, 0.34);
  // boyalı ışık: sepetin sol yüzünde birkaç sıcak darbe
  const oil = new Oil(), rnd = mulberry(5);
  for (let i = 0; i < 10; i++) {
    const x = -0.15 + rnd() * 0.16, y = 0.46 + rnd() * 0.16;
    oil.add([x, y, x + 0.05, y + (rnd() - 0.5) * 0.01], 0.02 + rnd() * 0.012, mix([226, 170, 100], [250, 210, 150], rnd()), 0.1);
  }
  oil.flush(g);
  return c;
}

// ───────────────────────── As: doğan güneş madalyonu ─────────────────────────
function* paintAce(): Job<HTMLCanvasElement> {
  const S = ACE, C = S / 2, R = S * 0.46, hz = S * 0.74;
  const sun: Disc = {x: C, y: C - S * 0.02, r: S * 0.17};
  const bals: Bal[] = [
    {x: S * 0.22, y: S * 0.3, r: S * 0.07, cols: ['#2fa7e0', '#ffffff']},
    {x: S * 0.8, y: S * 0.36, r: S * 0.06, cols: ['#18b06a', '#fff1c8']},
    {x: S * 0.66, y: S * 0.13, r: S * 0.045, cols: ['#ff6a1f', '#3a2a8c']},
  ];
  const ids = regionIds(S, S, hz, bals);
  const {cv: art, rnd} = yield* oilArt({
    W: S,
    H: S,
    seed: 31,
    k: 0.6,
    s: 1.05,
    under: false,
    mask: (x, y) => (Math.hypot(x - C, y - C) < R + 4 ? 1 : 0),
    sketch: r => {
      dawnSky(r, S, hz, 9, 5);
      sunSketch(r, sun, 2.6);
      valley(r, S, S, hz, 50, S * 0.16, S * 0.05);
      for (const b of bals) balloon(r, b, 0.12);
    },
    field: (x, y) => {
      const id = idAt(ids, x, y);
      if (id > 0 && id < 200 && bals[id - 1]) return meridian(x, y, bals[id - 1]);
      if (id === 200) return y < hz + S * 0.14 ? -Math.PI / 2 + 0.15 * Math.sin(x * 0.2) : valleyFlow(x, y, 1);
      return skyFlow(x, y, 1, sun);
    },
    sizeK: (x, y) => {
      const id = idAt(ids, x, y);
      return id > 0 && id < 200 ? 0.45 : id === 200 && y < hz + S * 0.14 ? 0.65 : 1;
    },
    detail: (x, y) => (idAt(ids, x, y) % 200 > 0 || (y > hz - S * 0.02 && y < hz + S * 0.14) ? 0.9 : 0),
  });
  const g = art.getContext('2d')!;
  const oil = new Oil();
  sunDabs(oil, sun, rnd, 1.1, 1.9);
  g.save();
  g.beginPath();
  g.rect(0, 0, S, hz + S * 0.02);
  g.clip();
  oil.flush(g);
  g.restore();
  canvasWeave(g, S, S, rnd, 0.08);
  const [c, cg] = makeCanvas(S, S);
  cg.save();
  cg.beginPath();
  cg.arc(C, C, R, 0, Math.PI * 2);
  cg.clip();
  cg.drawImage(art, 0, 0);
  cg.restore();
  art.width = art.height = 0;
  const rim = new Oil();
  ringStrokes(rim, C, C, R + 1, R + 1, 5, [[110, 50, 110], [140, 70, 130]], rnd, 12);
  ringStrokes(rim, C, C, R + 5, R + 5, 4.4, [[242, 206, 74], [255, 236, 160], [214, 160, 48]], rnd, 12);
  rim.flush(cg);
  return c;
}

// ───────────────────────── saray kartları ─────────────────────────
const PAD = 15;
const COURT: Record<'K' | 'Q' | 'J', {cols: string[]; sun: [number, number]}> = {
  K: {cols: ['#5a2a9a', '#f0b43a', '#5a2a9a', '#7a44c0'], sun: [0.22, 0.74]},
  Q: {cols: ['#e8507a', '#fff0e0', '#e8507a', '#ff9ab0'], sun: [0.78, 0.74]},
  J: {cols: ['#e8173f', '#2fa7e0', '#ffd23a', '#18b06a'], sun: [0.3, 0.75]},
};
function* paintCourt(kind: 'K' | 'Q' | 'J'): Job<HTMLCanvasElement> {
  const W = CW, H = CH, hz = H * 0.76, s = 1.2;
  const spec = COURT[kind];
  const inner = archPts(PAD, PAD, W - 2 * PAD, H - 2 * PAD);
  const innerP = polyPath(inner);
  const sun: Disc = {x: W * spec.sun[0], y: H * spec.sun[1] - H * 0.02, r: W * 0.075};
  const big: Bal = {x: W * 0.5, y: H * 0.4, r: W * 0.6, cols: spec.cols};
  const far: Bal[] =
    kind === 'K'
      ? [{x: W * 0.2, y: H * 0.17, r: W * 0.1, cols: ['#2fa7e0', '#ffffff']}, {x: W * 0.84, y: H * 0.62, r: W * 0.08, cols: ['#18b06a', '#fff1c8']}]
      : kind === 'Q'
        ? [{x: W * 0.82, y: H * 0.16, r: W * 0.1, cols: ['#ffd23a', '#e8173f']}, {x: W * 0.16, y: H * 0.6, r: W * 0.08, cols: ['#7a3fc8', '#ffb43a']}]
        : [{x: W * 0.18, y: H * 0.2, r: W * 0.09, cols: ['#ff6a1f', '#3a2a8c']}, {x: W * 0.84, y: H * 0.18, r: W * 0.1, cols: ['#ff4fa0', '#ffffff']}, {x: W * 0.8, y: H * 0.64, r: W * 0.07, cols: ['#2fa7e0', '#ffffff']}];
  const bals = [big, ...far];
  const emblemY = big.y + big.r * 0.02;
  const ids = makeIdMap(W, H, 0.75, (r, id) => {
    bals.forEach((b, i) => {
      r.fillStyle = id(1 + i);
      r.beginPath();
      r.ellipse(b.x, b.y, b.r * 0.58, b.r * 0.66, 0, 0, Math.PI * 2);
      r.fill();
    });
    r.fillStyle = id(100);
    r.beginPath();
    r.ellipse(big.x, emblemY, big.r * 0.17, big.r * 0.17, 0, 0, Math.PI * 2);
    r.fill();
    r.fillStyle = id(200);
    r.fillRect(0, hz - H * 0.02, W, H);
  });
  const {cv, g, ref, rnd} = yield* oilArt({
    W,
    H,
    seed: kind.charCodeAt(0) * 11,
    k: 0.75,
    s,
    under: false,
    mask: (x, y) => (x > PAD - 4 && x < W - PAD + 4 && y > PAD - 4 && y < H - PAD + 4 ? 1 : 0),
    sketch: r => {
      dawnSky(r, W, hz, kind.charCodeAt(0), 5);
      sunSketch(r, sun, 3.2);
      valley(r, W, H, hz, 60 + kind.charCodeAt(0), H * 0.13, W * 0.06);
      for (const b of far) balloon(r, b, 0.12);
      // büyük balon + sepet
      r.save();
      r.translate(big.x, big.y);
      r.scale(big.r, big.r);
      basket(r, -0.1, 0.1, 0.56, 0.2, 0.24);
      envelope(r, classicPath(), big.cols, 8, 'rgba(40,14,40,.6)');
      r.restore();
      // amblem: krem madalyon
      r.fillStyle = '#fbf0dc';
      r.beginPath();
      r.arc(big.x, emblemY, big.r * 0.15, 0, Math.PI * 2);
      r.fill();
      r.lineWidth = big.r * 0.02;
      r.strokeStyle = '#c99a3a';
      r.stroke();
      if (kind === 'K') crown(r, big.x, emblemY + big.r * 0.07, big.r * 0.17);
      else if (kind === 'Q') tulip(r, big.x, emblemY, big.r * 0.11);
      else star4(r, big.x, emblemY, big.r * 0.11);
    },
    field: (x, y) => {
      const id = idAt(ids, x, y);
      if (id === 100) return Math.atan2(y - emblemY, x - big.x) + Math.PI / 2;
      if (id > 0 && id < 100 && bals[id - 1]) return meridian(x, y, bals[id - 1]);
      if (id === 200) return y < hz + H * 0.13 ? -Math.PI / 2 + 0.15 * Math.sin(x * 0.2) : valleyFlow(x, y, s);
      return skyFlow(x, y, s, sun);
    },
    sizeK: (x, y) => {
      const id = idAt(ids, x, y);
      return id === 100 ? 0.25 : id === 1 ? 0.75 : id > 1 && id < 100 ? 0.4 : id === 200 && y < hz + H * 0.13 ? 0.6 : 1;
    },
    detail: (x, y) => {
      const id = idAt(ids, x, y);
      return id > 0 && id <= 100 ? 0.9 : id === 200 && y < hz + H * 0.14 ? 0.8 : 0;
    },
  });
  const oil = new Oil();
  sunDabs(oil, sun, rnd, s, 2.2);
  g.save();
  g.beginPath();
  g.rect(0, 0, W, hz);
  g.clip();
  oil.flush(g);
  g.restore();
  const hl = new Oil();
  lightDabs(hl, ref, rnd, 0, hz - H * 0.03, W, hz + H * 0.1, 215, 2.2);
  hl.flush(g);
  canvasWeave(g, W, H, rnd, 0.08);
  vignette(g, W, H, 0.22);
  // kemere kırp + boyalı altın / erik çerçeve
  const [c, cg] = makeCanvas(W, H);
  cg.save();
  cg.clip(innerP);
  cg.drawImage(cv, 0, 0);
  cg.restore();
  cv.width = cv.height = 0;
  const fr = new Oil();
  pathStrokes(fr, archPts(PAD * 0.45, PAD * 0.45, W - PAD * 0.9, H - PAD * 0.9), 5, [[150, 100, 26], [196, 140, 36]], rnd, 12, PAD * 0.18);
  pathStrokes(fr, archPts(PAD * 0.6, PAD * 0.6, W - PAD * 1.2, H - PAD * 1.2), 5, [[242, 206, 74], [255, 240, 170], [214, 160, 48]], rnd, 12);
  pathStrokes(fr, archPts(PAD * 0.85, PAD * 0.85, W - PAD * 1.7, H - PAD * 1.7), 4, [[110, 50, 110], [150, 70, 130], [90, 40, 100]], rnd, 10);
  fr.flush(cg);
  cg.lineJoin = 'round';
  cg.lineWidth = 2.2;
  cg.strokeStyle = '#3a1a3a';
  cg.stroke(innerP);
  return c;
}
/** Lale amblemi (eskiz) */
function tulip(r: Ctx, x: number, y: number, s: number): void {
  r.fillStyle = '#2e8a4a';
  r.fillRect(x - s * 0.06, y, s * 0.12, s * 0.9);
  r.beginPath();
  r.ellipse(x - s * 0.35, y + s * 0.55, s * 0.32, s * 0.12, -0.6, 0, Math.PI * 2);
  r.fill();
  r.fillStyle = '#d8183e';
  r.beginPath();
  r.moveTo(x, y + s * 0.15);
  r.bezierCurveTo(x - s * 0.7, y + s * 0.1, x - s * 0.6, y - s * 0.6, x - s * 0.35, y - s * 0.8);
  r.lineTo(x - s * 0.15, y - s * 0.35);
  r.lineTo(x, y - s * 0.85);
  r.lineTo(x + s * 0.15, y - s * 0.35);
  r.lineTo(x + s * 0.35, y - s * 0.8);
  r.bezierCurveTo(x + s * 0.6, y - s * 0.6, x + s * 0.7, y + s * 0.1, x, y + s * 0.15);
  r.fill();
}
/** Dört renkli yıldız (Vale amblemi) */
function star4(r: Ctx, x: number, y: number, s: number): void {
  const cols = ['#e8173f', '#2fa7e0', '#ffd23a', '#18b06a'];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    r.fillStyle = cols[i];
    r.beginPath();
    r.moveTo(x, y);
    r.lineTo(x + Math.cos(a - 0.4) * s * 0.4, y + Math.sin(a - 0.4) * s * 0.4);
    r.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
    r.lineTo(x + Math.cos(a + 0.4) * s * 0.4, y + Math.sin(a + 0.4) * s * 0.4);
    r.closePath();
    r.fill();
  }
}

// ───────────────────────── arka yüz: Kapadokya şafağı ─────────────────────────
function* paintBackArt(): Job<HTMLCanvasElement> {
  const W = PW, H = PH, hz = H * 0.62;
  const sun: Disc = {x: W * 0.3, y: hz - H * 0.025, r: W * 0.075};
  const bals: Bal[] = [
    {x: W * 0.63, y: H * 0.3, r: W * 0.3, cols: ['#e8173f', '#ffd23a', '#e8173f', '#ff8a2a']},
    {x: W * 0.22, y: H * 0.17, r: W * 0.15, cols: ['#2fa7e0', '#ffffff']},
    {x: W * 0.86, y: H * 0.1, r: W * 0.1, cols: ['#7a3fc8', '#ffb43a']},
    {x: W * 0.4, y: H * 0.08, r: W * 0.07, cols: ['#18b06a', '#fff1c8']},
    {x: W * 0.12, y: H * 0.42, r: W * 0.08, cols: ['#ff4fa0', '#ffffff']},
    {x: W * 0.88, y: H * 0.47, r: W * 0.065, cols: ['#ff6a1f', '#3a2a8c']},
    {x: W * 0.47, y: H * 0.5, r: W * 0.05, cols: ['#ffd23a', '#e8173f', '#2fa7e0']},
  ];
  const ids = regionIds(W, H, hz, bals, 0.75);
  const {cv, g, ref, rnd} = yield* oilArt({
    W,
    H,
    seed: 1977,
    k: 0.75,
    s: 1.1,
    under: false,
    sketch: r => {
      dawnSky(r, W, hz, 21, 9);
      sunSketch(r, sun, 4);
      valley(r, W, H, hz, 70, H * 0.17, W * 0.07);
      const order = bals.map((b, i) => [b, i] as const).sort((a, b) => a[0].r - b[0].r);
      for (const [b] of order) balloon(r, b, b.r < W * 0.1 ? 0.15 : 0);
    },
    field: (x, y) => {
      const id = idAt(ids, x, y);
      if (id > 0 && id < 200 && bals[id - 1]) return meridian(x, y, bals[id - 1]);
      if (id === 200) return y < hz + H * 0.17 ? -Math.PI / 2 + 0.15 * Math.sin(x * 0.2) : valleyFlow(x, y, 1);
      return skyFlow(x, y, 1, sun);
    },
    sizeK: (x, y) => {
      const id = idAt(ids, x, y);
      return id === 1 ? 0.8 : id > 1 && id < 200 ? 0.45 : id === 200 && y < hz + H * 0.17 ? 0.65 : 1;
    },
    detail: (x, y) => {
      const id = idAt(ids, x, y);
      return id > 0 && id < 200 ? 0.8 : id === 200 && y < hz + H * 0.2 ? 0.8 : Math.hypot(x - sun.x, y - sun.y) < sun.r * 3 ? 0.6 : 0;
    },
  });
  const oil = new Oil();
  sunDabs(oil, sun, rnd, 1, 2.6);
  g.save();
  g.beginPath();
  g.rect(0, 0, W, hz);
  g.clip();
  oil.flush(g);
  g.restore();
  const hl = new Oil();
  lightDabs(hl, ref, rnd, 0, hz - H * 0.02, W, hz + H * 0.18, 220, 2.2);
  hl.flush(g);
  if (due()) yield;
  canvasWeave(g, W, H, rnd, 0.09);
  vignette(g, W, H, 0.3);
  return cv;
}

function* paintAll(): Job<CardArt> {
  const frame = yield* paintFrame();
  const cream = yield* paintCream(78, '#fbf2e2', '#efdcc0', [
    [0.3, 0.26, 0.42, 'rgba(240,170,170,.16)'],
    [0.72, 0.74, 0.46, 'rgba(200,170,220,.16)'],
    [0.62, 0.32, 0.3, 'rgba(255,214,140,.16)'],
  ]);
  const suit = {} as Record<Suit, HTMLCanvasElement>;
  for (const s of ['S', 'H', 'D', 'C'] as Suit[]) suit[s] = yield* paintSuit(s);
  const hang = paintBasket();
  const ace = yield* paintAce();
  const court: Record<number, HTMLCanvasElement> = {};
  court[13] = yield* paintCourt('K');
  court[12] = yield* paintCourt('Q');
  court[11] = yield* paintCourt('J');
  const back = yield* paintBackArt();
  RF.measure();
  return {frame, cream, suit, ace, court, back, hang};
}

export const skin = defineSkin<CardArt>({
  id: 'kapadokya',
  name: 'Kapadokya Şafağı',
  desc: 'Her takım kendi balonunda: peri bacalarının üstünde gün doğuyor, yağlı boya.',
  fonts: () => loadFont(() => import('@fontsource/lilita-one/400.css'), `400 100px "Lilita One"`),
  paint: paintAll,
  face: (g, w, h, s, r, a) => drawFace(g, w, h, s, r, a, STYLE),
  back: (g, w, h, a) => drawBack(g, w, h, a, 'rgba(255,226,150,0.85)'),
});
