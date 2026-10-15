// Masa "Yıldızlı Gece": Van Gogh'un girdaplı göğünden esinlenen boyalı zemin (kamu malı tablodan esin; görsel indirilmez).
// Bütün gök, yığının çevresinde dönen büyük bir girdaba akar: kartlar girdabın sakin, koyu GÖZÜNDE durur.
// Ay sağ üstte, haleli yıldızlar kenarlarda, solda servi, altta tepeler (elin arkasında koyu bir taban).
// Binlerce darbe renk kutularına toplanıp tek dolguyla çizilir (Strokes).
import {clamp, css, gridField, jit, makeCanvas, mix, mulberry, radial, resScale, smooth, spotOf, Strokes, type Ctx, type RGB, type Rnd} from './paint';

type Field = (x: number, y: number) => number;

interface Light {
  x: number;
  y: number;
  r: number;
}

// Gece göğü rampası: zemin olduğu için kart destesinden bir ton koyu (krem kartlar öne çıksın).
const RAMP: [number, RGB][] = [
  [0, [6, 12, 44]],
  [0.18, [14, 30, 94]],
  [0.36, [28, 58, 142]],
  [0.52, [52, 96, 180]],
  [0.68, [104, 150, 208]],
  [0.84, [178, 204, 218]],
  [1, [238, 232, 192]],
];
function ramp(t: number): RGB {
  t = clamp(t, 0, 1);
  for (let i = 1; i < RAMP.length; i++) {
    const [t1, c1] = RAMP[i];
    if (t <= t1) {
      const [t0, c0] = RAMP[i - 1];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return RAMP[RAMP.length - 1][1];
}
const TEAL: RGB = [44, 118, 134];
const YGREEN: RGB = [192, 202, 126];

function trace(f: Field, x: number, y: number, len: number, step: number): number[] {
  const pts = [x, y];
  const n = Math.max(2, Math.round(len / step));
  for (let i = 0; i < n; i++) {
    const a = f(x, y);
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push(x, y);
  }
  return pts;
}
function arcPts(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, n: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const r = r0 + ((r1 - r0) * i) / n;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

/** Yıldız ya da ay halesi: iç içe halkalarda kısa teğet darbeler + parlak çekirdek. */
function halo(g: Ctx, st: Light, rnd: Rnd, kind: 'star' | 'moon', u: number): void {
  const R = st.r;
  const core = R * (kind === 'moon' ? 0.48 : 0.3);
  const step = Math.max(2.2 * u, R * 0.11);
  // boyanın altından sızan yumuşak ışık
  radial(g, st.x, st.y, 0, R * 2.1, kind === 'moon'
    ? [[0, 'rgba(255,214,110,.6)'], [0.42, 'rgba(240,190,80,.2)'], [1, 'rgba(240,190,80,0)']]
    : [[0, 'rgba(255,246,190,.55)'], [0.45, 'rgba(220,220,160,.14)'], [1, 'rgba(200,210,160,0)']]);
  const b = new Strokes();
  for (let rr = R; rr > core * 0.92; rr -= step * (0.8 + rnd() * 0.35)) {
    const t = (rr - core) / (R - core); // 0 iç, 1 dış
    let base: RGB;
    if (kind === 'moon') base = t < 0.18 ? [236, 168, 56] : t < 0.44 ? [250, 214, 96] : t < 0.7 ? [240, 186, 70] : t < 0.88 ? [218, 196, 118] : [118, 146, 172];
    else base = t < 0.24 ? [250, 236, 156] : t < 0.44 ? [242, 204, 72] : t < 0.6 ? [230, 226, 172] : t < 0.76 ? [62, 104, 180] : t < 0.9 ? [150, 190, 198] : [70, 110, 188];
    const segLen = 5 * u + R * 0.16;
    const n = Math.ceil((Math.PI * 2 * rr) / (segLen * 0.62));
    const off = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a0 = off + ((i + rnd() * 0.45) / n) * Math.PI * 2;
      const r1 = rr + (rnd() - 0.5) * step * 0.7;
      const r2 = r1 + (rnd() - 0.3) * step * 0.6; // dışa doğru hafif sarmal
      b.add(arcPts(st.x, st.y, r1, r2, a0, a0 + segLen / r1, 4), step * (1.1 + rnd() * 0.55), jit(base, 12, rnd), 0.16);
    }
    b.flush(g); // halka halka: içteki halka dıştakinin üstüne biner
  }
  const cc: RGB = kind === 'moon' ? [250, 212, 90] : [253, 248, 216];
  g.fillStyle = css(cc);
  g.beginPath();
  g.arc(st.x, st.y, core, 0, Math.PI * 2);
  g.fill();
  if (kind === 'moon') {
    // hilal: açık yay + sağ üste kaymış gölgeli disk
    g.save();
    g.beginPath();
    g.arc(st.x, st.y, core * 0.98, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = css([255, 238, 156]);
    g.fill();
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * 0.35 + rnd() * Math.PI * 1.25;
      const rr = core * (0.55 + rnd() * 0.4);
      b.add(arcPts(st.x, st.y, rr, rr, a, a + 0.6, 4), core * 0.2, jit(rnd() < 0.5 ? [255, 246, 198] : [252, 226, 124], 8, rnd), 0.1);
    }
    b.flush(g);
    const sx = st.x + core * 0.42, sy = st.y - core * 0.26, sr = core * 0.8;
    g.fillStyle = css([210, 140, 50]);
    g.beginPath();
    g.arc(sx, sy, sr, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = sr * (0.3 + rnd() * 0.6);
      b.add(arcPts(sx, sy, rr, rr, a, a + 0.9, 4), core * 0.17, jit(rnd() < 0.5 ? [224, 158, 60] : [196, 128, 48], 8, rnd), 0.08);
    }
    b.flush(g);
    g.restore();
  } else {
    for (let i = 0; i < 12; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = core * (0.25 + rnd() * 0.6);
      b.add(arcPts(st.x, st.y, rr, rr, a, a + 1.2, 5), core * 0.28, jit(rnd() < 0.5 ? [255, 252, 234] : [250, 232, 144], 8, rnd), 0.1);
    }
    b.flush(g);
  }
}

export function paintGece(w: number, h: number, dpr: number): HTMLCanvasElement {
  const k = resScale(w, h, dpr, 1.35, 900_000); // yumuşak boya: CSS ile gerilir; tablette piksel sınırı
  const [cv, g] = makeCanvas(w * k, h * k);
  g.scale(k, k);
  const W = w, H = h;
  const S = spotOf(W, H);
  // fırça ölçeği alana göre: her ekranda yaklaşık aynı sayıda darbe (süre sabit kalır)
  const U = clamp(Math.sqrt((W * H) / (390 * 844)), 0.75, 2.4);
  const rnd = mulberry(0x5eed61);
  const f = 1 / U; // dalga frekansı da ölçekle
  const M = Math.min(W, H * 0.5); // yıldız ölçeği

  // ── sahne ──
  const moon: Light = {x: W * 0.83, y: Math.min(H * 0.12, W * 0.27), r: M * 0.14};
  const stars: Light[] = [
    [0.12, 0.165, 0.058], [0.33, 0.085, 0.034], [0.6, 0.06, 0.026], [0.075, 0.36, 0.04], [0.93, 0.385, 0.046],
    [0.27, 0.61, 0.034], [0.8, 0.58, 0.03], [0.94, 0.79, 0.042], [0.52, 0.735, 0.024], [0.4, 0.3, 0.02], [0.66, 0.31, 0.022],
  ].map(([x, y, r]) => ({x: W * x, y: H * y, r: M * r}));
  const lights = [...stars, moon];
  const R0 = S.ringR; // girdap ölçeği
  const band = (x: number): number => H * 0.29 + H * 0.035 * Math.sin((x / W) * Math.PI * 1.8 + 0.6);
  const band2 = (x: number): number => H * 0.665 - H * 0.03 * Math.sin((x / W) * Math.PI * 1.6 + 0.2);
  const horizon = (x: number): number => H * 0.905 + H * 0.022 * Math.sin((x / W) * Math.PI * 1.3 + 0.8) - H * 0.012 * Math.sin((x / W) * Math.PI * 4.1);
  const cyp = {x0: W * 0.055, y0: H * 1.02, y1: H * 0.575, w0: Math.min(W * 0.085, H * 0.04)};
  const vort = [
    {x: S.px, y: S.py, r: R0 * 3.1, s: 1, k: 2.6},
    {x: W * 0.2, y: H * 0.255, r: M * 0.14, s: -1, k: 1.8},
    {x: W * 0.78, y: H * 0.205, r: M * 0.12, s: 1, k: 1.6},
    {x: W * 0.72, y: H * 0.705, r: M * 0.13, s: -1, k: 1.6},
  ];

  const rawField: Field = (x, y) => {
    const e = 2;
    const sl = (band(x + e) - band(x - e)) / (2 * e);
    const sl2 = (band2(x + e) - band2(x - e)) / (2 * e);
    const db = (y - band(x)) / (H * 0.12), db2 = (y - band2(x)) / (H * 0.12);
    let vx = 1;
    let vy = sl * Math.exp(-db * db) + sl2 * Math.exp(-db2 * db2) + 0.24 * Math.sin((x * 0.021 + y * 0.013) * f) + 0.14 * Math.sin((y * 0.034 - x * 0.009) * f);
    for (const v of vort) {
      const dx = x - v.x, dy = y - v.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > v.r * v.r * 9) continue;
      const d = Math.sqrt(d2) + 1e-3;
      const kk = v.k * Math.exp(-d2 / (v.r * v.r));
      vx += (kk * (-dy * v.s) - kk * 0.12 * dx) / d;
      vy += (kk * (dx * v.s) - kk * 0.12 * dy) / d;
    }
    for (const st of lights) {
      const dx = x - st.x, dy = y - st.y;
      const rr = st.r * 1.5;
      const d2 = dx * dx + dy * dy;
      if (d2 > rr * rr * 9) continue;
      const d = Math.sqrt(d2) + 1e-3;
      const kk = 3 * Math.exp(-d2 / (rr * rr));
      vx += (kk * -dy) / d;
      vy += (kk * dx) / d;
    }
    return Math.atan2(vy, vx);
  };

  const field = gridField(rawField, W, H, 4.4 * U);

  const skyColor = (x: number, y: number, d: number): RGB => {
    let L = 0.26 + 0.08 * Math.sin((x * 0.043 + y * 0.027) * f) + 0.05 * Math.sin((y * 0.11 - x * 0.05) * f);
    const db = (y - band(x)) / (H * 0.045), db2 = (y - band2(x)) / (H * 0.04);
    L += Math.exp(-db * db) * (0.2 + 0.3 * (0.5 + 0.5 * Math.sin((x * 0.07 + y * 0.05) * f)));
    L += Math.exp(-db2 * db2) * (0.12 + 0.22 * (0.5 + 0.5 * Math.sin((x * 0.06 - y * 0.04) * f)));
    // küçük girdapların sarmal kolları
    for (let i = 1; i < vort.length; i++) {
      const v = vort[i];
      const dx = x - v.x, dy = y - v.y;
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < v.r * 1.2) {
        const t = 1 - dd / (v.r * 1.2);
        const sp = Math.sin((dd / (v.r * 0.32)) * Math.PI * 2 - Math.atan2(dy, dx) * v.s);
        L += t * (0.6 * (0.5 + 0.5 * sp) - 0.1);
      }
    }
    // büyük girdap: göz sakin ve koyu, kollar halkanın dışında parlar
    const dx = x - S.px, dy = (y - S.py) * 0.92;
    const arm = 0.5 + 0.5 * Math.sin(d * Math.PI * 1.55 - Math.atan2(dy, dx) * 2);
    const env = smooth(1.15, 1.9, d) * (1 - smooth(2.6, 3.6, d));
    L += env * (0.36 * arm - 0.04);
    L -= (1 - smooth(0.9, 1.7, d)) * 0.1;
    L += clamp((y / H - 0.78) * 1.2, 0, 0.1); // ufka yakın gök biraz açılır
    L += (rnd() - 0.5) * 0.2;
    let c = ramp(L);
    const r = rnd();
    if (r < 0.12) c = mix(c, TEAL, 0.45);
    else if (r < 0.16 && L > 0.5) c = mix(c, YGREEN, 0.5);
    return jit(c, 11, rnd);
  };

  // ── zemin ──
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1a56');
  bg.addColorStop(0.55, '#14296e');
  bg.addColorStop(1, '#1c3478');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // ── gök darbeleri (karıştırılmış ızgara noktalarından akım çizgileri) ──
  const cell = 7 * U;
  const pts: number[] = [];
  for (let y = -cell; y < H + cell; y += cell) {
    for (let x = -cell * 2; x < W + cell; x += cell) {
      const px = x + rnd() * cell, py = y + rnd() * cell;
      if (py > horizon(px) + 10) continue;
      pts.push(px, py);
    }
  }
  for (let i = pts.length / 2 - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const ax = pts[i * 2], ay = pts[i * 2 + 1];
    pts[i * 2] = pts[j * 2];
    pts[i * 2 + 1] = pts[j * 2 + 1];
    pts[j * 2] = ax;
    pts[j * 2 + 1] = ay;
  }
  const sky = new Strokes();
  for (let i = 0; i < pts.length; i += 2) {
    const px = pts[i], py = pts[i + 1];
    const dd = Math.hypot(px - S.px, (py - S.py) * 0.92) / R0;
    const eye = dd < 1.6; // gözde daha ince, daha uzun darbeler (sakin doku)
    sky.add(trace(field, px, py, (14 + rnd() * 16) * U * (eye ? 1.3 : 1), 4.2 * U), (4.4 + rnd() * 3.2) * U * (eye ? 0.8 : 1), skyColor(px, py, dd), rnd() < 0.3 ? 0 : eye ? 0.12 : 0.2);
  }
  sky.flush(g);

  // ── tepeler: elin arkasında koyu, sakin taban ──
  g.fillStyle = '#16244e';
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) g.lineTo(x, horizon(x));
  g.lineTo(W, H);
  g.fill();
  const hillF: Field = (x, y) => {
    const e = 3;
    return Math.atan((horizon(x + e) - horizon(x - e)) / (2 * e)) + 0.3 * Math.sin((x * 0.06 + y * 0.09) * f);
  };
  const hills = new Strokes();
  for (let y = H * 0.86; y < H + 6; y += 5.5 * U) {
    for (let x = -6; x < W + 6; x += 6.5 * U) {
      const px = x + rnd() * 6 * U, py = y + rnd() * 5 * U;
      if (py < horizon(px) + 2) continue;
      const t = clamp((py - horizon(px)) / (H * 0.08), 0, 1);
      const base: RGB = rnd() < 0.3 ? [34, 66, 74] : mix([44, 66, 130], [16, 26, 62], t);
      hills.add(trace(hillF, px, py, (10 + rnd() * 10) * U, 3 * U), (3.6 + rnd() * 2.2) * U, jit(base, 10, rnd), 0.12);
    }
  }
  hills.flush(g);

  // ── servi: alevsi koyu yeşil darbeler, sol kenardan yükselir ──
  const cypW = (y: number): number => {
    const t = clamp((cyp.y0 - y) / (cyp.y0 - cyp.y1), 0, 1);
    return cyp.w0 * Math.pow(1 - t, 0.75) * (0.9 + 0.12 * Math.sin(y * 0.09 * f));
  };
  const cypF: Field = (x, y) => -Math.PI / 2 + 0.45 * Math.sin((y * 0.045 + x * 0.12) * f) + (x - cyp.x0) * 0.004 * f;
  const tree = new Strokes();
  for (let i = 0; i < 1000; i++) {
    const y = cyp.y1 + (cyp.y0 - cyp.y1) * Math.pow(rnd(), 0.85);
    const ww = cypW(y);
    const x = cyp.x0 + (rnd() * 2 - 1) * ww;
    const edge = Math.abs(x - cyp.x0) / (ww + 1e-3);
    const base: RGB = rnd() < 0.18 ? [62, 92, 46] : rnd() < 0.5 ? [18, 38, 30] : edge > 0.6 ? [30, 62, 44] : [10, 22, 22];
    tree.add(trace(cypF, x, y, (12 + rnd() * 16) * U, 3.2 * U), (3.6 + rnd() * 3) * U, jit(base, 9, rnd), 0.12);
  }
  tree.flush(g);

  // ── ay ve yıldızlar ──
  for (const st of stars) halo(g, st, rnd, 'star', U);
  halo(g, moon, rnd, 'moon', U);

  // ── sakin göz: yığının altı derin ultramarine koyulaşır (krem kartlar öne çıksın) ──
  radial(g, S.px, S.py, 0, R0 * 2.3, [[0, 'rgba(6,14,62,.5)'], [0.45, 'rgba(6,14,62,.36)'], [0.75, 'rgba(6,14,62,.12)'], [1, 'rgba(6,14,62,0)']], 1, 1.02);
  // el ve rakip eli bölgesine hafif koyuluk (kartların altı okunur kalsın)
  radial(g, W * 0.6, H * 0.9, 0, W * 0.6, [[0, 'rgba(4,8,34,.32)'], [1, 'rgba(4,8,34,0)']], 1.2, 0.55);
  radial(g, W * 0.5, H * 0.235, 0, W * 0.42, [[0, 'rgba(4,8,34,.24)'], [1, 'rgba(4,8,34,0)']], 1.25, 0.6);
  return cv;
}
