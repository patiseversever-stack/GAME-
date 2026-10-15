// Tarz 4 — "Yıldızlı Gece": Van Gogh'un "Yıldızlı Gece" (1889, kamu malı) tablosundan esinlenen koleksiyon destesi.
// Hiçbir görsel indirilmez: prepare() içinde, girdaplı bir akış alanı (flow field) boyunca binlerce kısa, kalın,
// kıvrık fırça darbesiyle kendi "tablolarımızı" BİR KEZ boyayıp saklarız; kart çizimi yalnızca bu tuvalleri kopyalar.
import type {Skin, Suit} from './contract';
import rizaUrl from '../../assets/riza_avatar.jpg?url';
import defneUrl from '../../assets/art/defne_avatar.jpg?url';
import cemUrl from '../../assets/art/cem_avatar.jpg?url';

type RGB = readonly [number, number, number];
type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;
type Field = (x: number, y: number) => number; // akış yönü (radyan)

const RED = '#c4122f', INK = '#15171c';
const FONT = '"Playfair Display", "Times New Roman", Georgia, serif';
const PW = 360, PH = Math.round(PW / 0.7); // tabloların çözünürlüğü (kart oranında)

// ───────────────────────── küçük yardımcılar ─────────────────────────
function mulberry(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lighten = (c: RGB, t: number): RGB => mix(c, [255, 250, 232], t);
const darken = (c: RGB, t: number): RGB => mix(c, [6, 8, 26], t);
/** Renk titremesi: parlaklık + kanal başına küçük sapma (elle karıştırılmış boya hissi). */
function jit(c: RGB, amt: number, rnd: Rnd): RGB {
  const k = (rnd() - 0.5) * 2 * amt;
  const q = amt * 0.45;
  return [clamp(c[0] + k + (rnd() - 0.5) * q, 0, 255), clamp(c[1] + k + (rnd() - 0.5) * q, 0, 255), clamp(c[2] + k + (rnd() - 0.5) * q, 0, 255)];
}
function pick<T>(arr: readonly T[], rnd: Rnd): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length];
}
function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  return [c, g];
}
function shuffle<T>(a: T[], rnd: Rnd): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// ───────────────────────── fırça ─────────────────────────
/** Kabartmalı (impasto) fırça darbesi: sağ-altta koyu gölge, gövde, sol-üstte açık kenar ışığı. */
function brush(g: Ctx, pts: number[], lw: number, c: RGB, relief = 1): void {
  if (pts.length < 4) return;
  const p = new Path2D();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  const o = Math.max(0.45, lw * 0.17);
  if (relief > 0) {
    g.translate(o, o);
    g.strokeStyle = css(darken(c, 0.4), 0.42 * relief);
    g.lineWidth = lw;
    g.stroke(p);
    g.translate(-o, -o);
  }
  g.strokeStyle = css(c);
  g.lineWidth = lw;
  g.stroke(p);
  if (relief > 0) {
    const q = o * 0.7;
    g.translate(-q, -q);
    g.strokeStyle = css(lighten(c, 0.38), 0.5 * relief);
    g.lineWidth = lw * 0.3;
    g.stroke(p);
    g.translate(q, q);
  }
}
/** Akış alanı boyunca kısa bir akım çizgisi izler. */
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
/** Elips/çember yayı üzerinde noktalar (halelerin halka darbeleri). */
function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return pts;
}

// ───────────────────────── palet ─────────────────────────
// Gece göğü rampası: koyu lacivertten (ultramarin) kobalta, açık maviye, sarımsı beyaza.
const SKY_RAMP: [number, RGB][] = [
  [0, [12, 22, 70]],
  [0.2, [24, 46, 124]],
  [0.4, [40, 80, 166]],
  [0.56, [70, 118, 194]],
  [0.7, [122, 164, 210]],
  [0.84, [184, 208, 220]],
  [1, [236, 234, 204]],
];
function ramp(t: number): RGB {
  t = clamp(t, 0, 1);
  for (let i = 1; i < SKY_RAMP.length; i++) {
    const [t1, c1] = SKY_RAMP[i];
    if (t <= t1) {
      const [t0, c0] = SKY_RAMP[i - 1];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return SKY_RAMP[SKY_RAMP.length - 1][1];
}
const TEAL: RGB = [52, 124, 136];
const YGREEN: RGB = [196, 206, 132];

// ───────────────────────── sahne ─────────────────────────
interface Vortex {
  x: number;
  y: number;
  r: number;
  s: number; // +1 saat yönü, -1 ters
}
interface Star {
  x: number;
  y: number;
  r: number; // hale yarıçapı
}
interface Cypress {
  x0: number; // taban merkezi
  y0: number; // taban (alt)
  y1: number; // tepe
  w0: number; // tabandaki yarı genişlik
}
interface Scene {
  w: number;
  h: number;
  seed: number;
  band: (x: number) => number; // Samanyolu dalgasının orta çizgisi
  bandW: number;
  vortices: Vortex[];
  stars: Star[];
  moon?: Star;
  horizon?: (x: number) => number; // tepelerin üst çizgisi (yoksa yalnız gök)
  cypress?: Cypress;
  village?: boolean;
  /** yalnız bu bölgeye boya (çerçeve tablosu için hız) */
  mask?: (x: number, y: number) => boolean;
  cell: number; // gök darbeleri arası ızgara
}

function skyField(sc: Scene): Field {
  const lights = sc.moon ? [...sc.stars, sc.moon] : sc.stars;
  return (x, y) => {
    const e = 2;
    const slope = (sc.band(x + e) - sc.band(x - e)) / (2 * e);
    const db = (y - sc.band(x)) / (sc.h * 0.32);
    let vx = 1;
    let vy = slope * Math.exp(-db * db) + 0.24 * Math.sin(x * 0.021 + y * 0.013) + 0.14 * Math.sin(y * 0.034 - x * 0.009);
    for (const v of sc.vortices) {
      const dx = x - v.x, dy = y - v.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      const k = 2.8 * Math.exp(-(d * d) / (v.r * v.r));
      vx += (k * (-dy * v.s) - k * 0.2 * dx) / d;
      vy += (k * (dx * v.s) - k * 0.2 * dy) / d;
    }
    for (const st of lights) {
      const dx = x - st.x, dy = y - st.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      const rr = st.r * 1.35;
      const k = 3.2 * Math.exp(-(d * d) / (rr * rr));
      vx += (k * -dy) / d;
      vy += (k * dx) / d;
    }
    return Math.atan2(vy, vx);
  };
}

function skyColor(sc: Scene, x: number, y: number, rnd: Rnd): RGB {
  let L = 0.3 + 0.1 * Math.sin(x * 0.043 + y * 0.027) + 0.06 * Math.sin(y * 0.11 - x * 0.05);
  if (sc.horizon) L += clamp((y / sc.h - 0.5) * 0.7, 0, 0.18); // ufka yakın gök biraz açılır
  const db = (y - sc.band(x)) / sc.bandW;
  const bk = Math.exp(-db * db);
  L += bk * (0.18 + 0.34 * (0.5 + 0.5 * Math.sin(x * 0.075 + y * 0.05)));
  for (const v of sc.vortices) {
    const dx = x - v.x, dy = y - v.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const R = v.r * 1.15;
    if (d < R) {
      const t = 1 - d / R;
      const ang = Math.atan2(dy, dx) * v.s;
      const sp = Math.sin((d / (v.r * 0.3)) * Math.PI * 2 - ang); // sarmal kollar
      L += t * (0.62 * (0.5 + 0.5 * sp) - 0.12);
    }
  }
  L += (rnd() - 0.5) * 0.24;
  let c = ramp(L);
  const r = rnd();
  if (r < 0.13) c = mix(c, TEAL, 0.5);
  else if (r < 0.18 && L > 0.55) c = mix(c, YGREEN, 0.55);
  return jit(c, 13, rnd);
}

function paintSky(g: Ctx, sc: Scene, rnd: Rnd): void {
  const bg = g.createLinearGradient(0, 0, 0, sc.h);
  bg.addColorStop(0, '#13246a');
  bg.addColorStop(0.6, '#24489a');
  bg.addColorStop(1, '#3a62a8');
  g.fillStyle = bg;
  g.fillRect(0, 0, sc.w, sc.h);
  const f = skyField(sc);
  const pts: [number, number][] = [];
  const cell = sc.cell;
  for (let y = -cell; y < sc.h + cell; y += cell) {
    for (let x = -cell * 2; x < sc.w + cell; x += cell) {
      const px = x + rnd() * cell, py = y + rnd() * cell;
      if (sc.mask && !sc.mask(px, py)) continue;
      if (sc.horizon && py > sc.horizon(px) + 8) continue;
      pts.push([px, py]);
    }
  }
  shuffle(pts, rnd);
  const s = sc.w / 360;
  for (const [px, py] of pts) {
    const len = (11 + rnd() * 13) * s;
    const lw = (3.3 + rnd() * 2.6) * s;
    brush(g, trace(f, px, py, len, 2.2 * s), lw, skyColor(sc, px, py, rnd));
  }
}

/** Yıldız ya da ay halesi: iç içe halkalar hâlinde kısa, teğet darbeler + parlak çekirdek. */
function paintHalo(g: Ctx, st: Star, rnd: Rnd, kind: 'star' | 'moon' | 'ace', scale = 1): void {
  const R = st.r;
  const core = R * (kind === 'moon' ? 0.5 : kind === 'ace' ? 0.42 : 0.3);
  const step = Math.max(2.2 * scale, R * 0.085);
  for (let rr = R; rr > core * 0.92; rr -= step * (0.8 + rnd() * 0.35)) {
    const t = (rr - core) / (R - core); // 0 iç, 1 dış
    let base: RGB;
    if (kind === 'moon') {
      base = t < 0.28 ? [252, 228, 120] : t < 0.5 ? [246, 200, 70] : t < 0.7 ? [234, 162, 48] : t < 0.86 ? [222, 196, 104] : [150, 168, 168];
    } else if (kind === 'ace') {
      base =
        t < 0.18 ? [252, 236, 150] : t < 0.36 ? [244, 206, 66] : t < 0.5 ? [236, 228, 160] : t < 0.62 ? [64, 104, 178] : t < 0.78 ? [150, 190, 206] : t < 0.9 ? [44, 82, 160] : [26, 48, 124];
    } else {
      base = t < 0.22 ? [250, 236, 150] : t < 0.42 ? [242, 204, 66] : t < 0.58 ? [232, 226, 168] : t < 0.72 ? [70, 112, 182] : t < 0.86 ? [160, 196, 196] : [92, 134, 198];
    }
    const segLen = (5 + rnd() * 5) * scale + R * 0.12;
    const n = Math.ceil((Math.PI * 2 * rr) / (segLen * 0.62));
    const off = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a0 = off + ((i + rnd() * 0.45) / n) * Math.PI * 2;
      const r1 = rr + (rnd() - 0.5) * step * 0.7;
      const da = (segLen / r1) * (rnd() < 0.5 ? 1 : 1);
      const lw = step * (0.95 + rnd() * 0.5);
      // dışa doğru hafif sarmal: yay boyunca yarıçap biraz değişir
      const r2 = r1 + (rnd() - 0.3) * step * 0.6;
      const pts: number[] = [];
      for (let k = 0; k <= 4; k++) {
        const a = a0 + (da * k) / 4;
        const rk = r1 + ((r2 - r1) * k) / 4;
        pts.push(st.x + Math.cos(a) * rk, st.y + Math.sin(a) * rk);
      }
      brush(g, pts, lw, jit(base, 12, rnd), 0.75);
    }
  }
  // çekirdek
  const cc: RGB = kind === 'moon' ? [250, 210, 84] : [253, 248, 214];
  g.fillStyle = css(cc);
  g.beginPath();
  g.arc(st.x, st.y, core, 0, Math.PI * 2);
  g.fill();
  if (kind === 'moon') {
    // hilal: parlak yay + gölgeli iç
    g.save();
    g.beginPath();
    g.arc(st.x, st.y, core * 0.98, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = css([226, 146, 38]);
    g.beginPath();
    g.arc(st.x + core * 0.42, st.y - core * 0.18, core * 0.86, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI * 0.2 + rnd() * Math.PI * 1.4 + Math.PI * 0.5;
      const rr = core * (0.62 + rnd() * 0.32);
      brush(g, arcPts(st.x, st.y, rr, rr, a, a + 0.5, 4), core * 0.16, jit([254, 236, 140], 10, rnd), 0.6);
    }
    g.restore();
  } else {
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = core * (0.25 + rnd() * 0.6);
      brush(g, arcPts(st.x, st.y, rr, rr, a, a + 1.2, 5), core * 0.22, jit(rnd() < 0.5 ? [255, 252, 232] : [250, 232, 140], 8, rnd), 0.5);
    }
  }
}

// ───────────────────────── tepeler, köy, servi ─────────────────────────
function paintHills(g: Ctx, sc: Scene, rnd: Rnd): void {
  const hz = sc.horizon!;
  const W = sc.w, H = sc.h, s = W / 360;
  g.fillStyle = '#1c2c62';
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) g.lineTo(x, hz(x));
  g.lineTo(W, H);
  g.closePath();
  g.fill();
  const ridge2 = (x: number): number => hz(x) + H * 0.07 + H * 0.02 * Math.sin(x * 0.03 + 2);
  const f: Field = (x, y) => {
    const e = 3;
    const r = y < ridge2(x) ? hz : ridge2;
    const sl = (r(x + e) - r(x - e)) / (2 * e);
    return Math.atan(sl) + 0.35 * Math.sin(x * 0.06 + y * 0.09);
  };
  const pts: [number, number][] = [];
  const cell = 6 * s;
  for (let y = H * 0.55; y < H + cell; y += cell)
    for (let x = -cell * 2; x < W + cell; x += cell) {
      const px = x + rnd() * cell, py = y + rnd() * cell;
      if (py > hz(px) - 1) pts.push([px, py]);
    }
  shuffle(pts, rnd);
  for (const [px, py] of pts) {
    const far = py < ridge2(px);
    const c: RGB = far
      ? pick<RGB>([[58, 88, 158], [44, 70, 138], [74, 108, 170], [38, 60, 118], [62, 112, 140]], rnd)
      : pick<RGB>([[28, 44, 96], [36, 58, 110], [30, 62, 82], [44, 82, 96], [22, 34, 74], [52, 92, 84]], rnd);
    brush(g, trace(f, px, py, (9 + rnd() * 10) * s, 2 * s), (3 + rnd() * 2.2) * s, jit(c, 10, rnd), 0.8);
  }
}

function paintVillage(g: Ctx, sc: Scene, rnd: Rnd): void {
  const W = sc.w, H = sc.h, s = W / 360;
  const hz = sc.horizon!;
  type House = {x: number; y: number; w: number; h: number; church?: boolean};
  const houses: House[] = [];
  for (let i = 0; i < 26; i++) {
    const x = W * (0.22 + rnd() * 0.8);
    const y = H * (0.84 + rnd() * 0.14);
    houses.push({x, y, w: (10 + rnd() * 9) * s, h: (7 + rnd() * 6) * s});
  }
  const cx = W * 0.6;
  houses.push({x: cx, y: H * 0.875, w: 13 * s, h: 18 * s, church: true});
  houses.sort((a, b) => a.y - b.y);
  // ağaç kümeleri (koyu yuvarlak darbeler)
  for (let i = 0; i < 14; i++) {
    const tx = W * (0.25 + rnd() * 0.75), ty = H * (0.82 + rnd() * 0.15);
    if (ty < hz(tx) + 6) continue;
    for (let k = 0; k < 7; k++) {
      const a = rnd() * Math.PI * 2, rr = (2 + rnd() * 5) * s;
      brush(g, arcPts(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr, 3 * s, 3 * s, a, a + 2, 4), 3 * s, jit(pick<RGB>([[26, 54, 46], [34, 70, 56], [20, 36, 40]], rnd), 8, rnd), 0.6);
    }
  }
  const outline = css([16, 22, 52]);
  for (const hs of houses) {
    const {x, y, w, h} = hs;
    if (hs.church) {
      // kilise gövdesi + sivri kule
      g.fillStyle = css([74, 96, 150]);
      g.fillRect(x - w / 2, y - h, w, h);
      g.beginPath();
      g.moveTo(x - 4 * s, y - h);
      g.lineTo(x, y - h - 40 * s);
      g.lineTo(x + 4 * s, y - h);
      g.closePath();
      g.fillStyle = css([40, 58, 108]);
      g.fill();
      g.strokeStyle = outline;
      g.lineWidth = 1.4 * s;
      g.stroke();
      g.strokeRect(x - w / 2, y - h, w, h);
      g.fillStyle = css([250, 210, 90]);
      g.fillRect(x - 1.6 * s, y - h * 0.6, 3.2 * s, 4.5 * s);
      continue;
    }
    const wall = pick<RGB>([[96, 118, 168], [118, 136, 172], [84, 104, 150], [136, 150, 170]], rnd);
    g.fillStyle = css(jit(wall, 10, rnd));
    g.fillRect(x - w / 2, y - h, w, h);
    for (let k = 0; k < 3; k++) {
      const yy = y - h * (0.2 + k * 0.3);
      brush(g, [x - w / 2 + 1, yy, x + w / 2 - 1, yy + (rnd() - 0.5) * 2], 2.4 * s, jit(wall, 16, rnd), 0.5);
    }
    // çatı
    const roof = pick<RGB>([[34, 44, 90], [62, 54, 84], [40, 62, 98], [96, 70, 64]], rnd);
    g.beginPath();
    g.moveTo(x - w / 2 - 1.5 * s, y - h);
    g.lineTo(x + (rnd() - 0.5) * w * 0.4, y - h - (4 + rnd() * 4) * s);
    g.lineTo(x + w / 2 + 1.5 * s, y - h);
    g.closePath();
    g.fillStyle = css(roof);
    g.fill();
    g.strokeStyle = outline;
    g.lineWidth = 1.1 * s;
    g.stroke();
    g.strokeRect(x - w / 2, y - h, w, h);
    // ışıklı pencereler
    const nWin = rnd() < 0.7 ? 1 + Math.floor(rnd() * 2) : 0;
    for (let k = 0; k < nWin; k++) {
      const wx = x - w / 2 + w * (0.22 + k * 0.42) + rnd() * 2 * s;
      const wy = y - h * 0.68;
      g.fillStyle = css(jit([250, 206, 70], 12, rnd));
      g.fillRect(wx, wy, 3 * s, 3.4 * s);
    }
  }
}

function cypEdges(cy: Cypress, y: number): [number, number, number] | null {
  let t = (cy.y0 - y) / (cy.y0 - cy.y1); // 0 taban, 1 tepe
  if (t < -1e-6 || t > 1 + 1e-6) return null;
  t = clamp(t, 0, 1);
  const cx = cy.x0 + cy.w0 * (0.4 * t + 0.16 * Math.sin(t * 7.5));
  const hw = cy.w0 * Math.pow(1 - t, 0.72) * (0.9 + 0.12 * Math.sin(t * 19)) + 1.2;
  const l = cx - hw * (1 + 0.2 * Math.sin(t * 23 + 1.3));
  const r = cx + hw * (1 + 0.2 * Math.sin(t * 21 + 4.1));
  return [l, r, cx];
}

/** Servi: koyu yeşil/siyah, alev gibi kıvrılan dikey darbelerle yükselen silüet. */
function paintCypress(g: Ctx, cy: Cypress, rnd: Rnd, s: number): void {
  // silüet dolgusu (boşluk kalmasın)
  g.fillStyle = css([14, 24, 20]);
  g.beginPath();
  const n = 80;
  for (let i = 0; i <= n; i++) {
    const y = cy.y0 - ((cy.y0 - cy.y1) * i) / n;
    const e = cypEdges(cy, y)!;
    if (i === 0) g.moveTo(e[0], y);
    else g.lineTo(e[0], y);
  }
  for (let i = n; i >= 0; i--) {
    const y = cy.y0 - ((cy.y0 - cy.y1) * i) / n;
    g.lineTo(cypEdges(cy, y)![1], y);
  }
  g.closePath();
  g.fill();
  const COLS: RGB[] = [
    [16, 30, 22],
    [24, 44, 30],
    [34, 60, 38],
    [12, 18, 16],
    [50, 42, 26],
    [30, 54, 56],
    [58, 88, 50],
    [40, 72, 44],
  ];
  const f: Field = (x, y) => {
    const e = cypEdges(cy, y);
    let lean = 0;
    if (e) lean = ((x - e[2]) / Math.max(4, (e[1] - e[0]) / 2)) * 0.45;
    return -Math.PI / 2 + lean + 0.55 * Math.sin(y * 0.075 + x * 0.05);
  };
  const N = Math.round(1300 * s * s);
  for (let i = 0; i < N; i++) {
    const t = Math.pow(rnd(), 1.25);
    const y = cy.y0 - (cy.y0 - cy.y1) * t;
    const e = cypEdges(cy, y);
    if (!e) continue;
    const x = e[0] + (e[1] - e[0]) * (0.04 + rnd() * 0.92);
    const c = COLS[rnd() < 0.82 ? Math.floor(rnd() * 5) : 5 + Math.floor(rnd() * 3)];
    const len = (10 + rnd() * 14) * s * (1 - t * 0.5);
    brush(g, trace(f, x, y, len, 2 * s), (2.6 + rnd() * 2.6) * s * (1 - t * 0.45), jit(c, 9, rnd), 0.85);
  }
  // kenarlarda alev dilleri: dışa ve yukarı kıvrılan darbeler
  for (let i = 0; i < Math.round(70 * s); i++) {
    const t = rnd() * 0.92;
    const y = cy.y0 - (cy.y0 - cy.y1) * t;
    const e = cypEdges(cy, y)!;
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side < 0 ? e[0] + 2 * s : e[1] - 2 * s;
    const pts = [x, y];
    let a = -Math.PI / 2 + side * (0.2 + rnd() * 0.3);
    let px = x, py = y;
    const L = (8 + rnd() * 12) * s * (1 - t * 0.4);
    for (let k = 0; k < 6; k++) {
      a += side * 0.12;
      px += Math.cos(a) * (L / 6);
      py += Math.sin(a) * (L / 6);
      pts.push(px, py);
    }
    brush(g, pts, (2 + rnd() * 1.8) * s, jit(COLS[Math.floor(rnd() * 4)], 8, rnd), 0.8);
  }
}

function vignette(g: Ctx, w: number, h: number, a: number): void {
  const v = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(4,8,30,0)');
  v.addColorStop(1, `rgba(4,8,30,${a})`);
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
}

function paintScene(sc: Scene): HTMLCanvasElement {
  const [c, g] = makeCanvas(sc.w, sc.h);
  const rnd = mulberry(sc.seed);
  const s = sc.w / 360;
  paintSky(g, sc, rnd);
  for (const st of sc.stars) paintHalo(g, st, rnd, 'star', s);
  if (sc.moon) paintHalo(g, sc.moon, rnd, 'moon', s);
  if (sc.horizon) paintHills(g, sc, rnd);
  if (sc.village) paintVillage(g, sc, rnd);
  if (sc.cypress) paintCypress(g, sc.cypress, rnd, s);
  vignette(g, sc.w, sc.h, 0.32);
  return c;
}

// Arka yüz: tablonun tamamı (girdaplı gök, ay, yıldızlar, servi, köy)
function backScene(): Scene {
  const W = PW, H = PH;
  return {
    w: W,
    h: H,
    seed: 1889,
    band: x => H * 0.4 + H * 0.06 * Math.sin((x / W) * Math.PI * 1.7 - 0.7),
    bandW: H * 0.075,
    vortices: [
      {x: W * 0.6, y: H * 0.405, r: W * 0.19, s: 1},
      {x: W * 0.34, y: H * 0.32, r: W * 0.12, s: -1},
      {x: W * 0.9, y: H * 0.5, r: W * 0.1, s: -1},
    ],
    stars: [
      {x: W * 0.45, y: H * 0.11, r: W * 0.085},
      {x: W * 0.7, y: H * 0.235, r: W * 0.05},
      {x: W * 0.93, y: H * 0.35, r: W * 0.065},
      {x: W * 0.42, y: H * 0.57, r: W * 0.06},
      {x: W * 0.8, y: H * 0.6, r: W * 0.07},
      {x: W * 0.12, y: H * 0.19, r: W * 0.05},
      {x: W * 0.07, y: H * 0.45, r: W * 0.05},
    ],
    moon: {x: W * 0.8, y: H * 0.115, r: W * 0.14},
    horizon: x => H * (0.755 - 0.07 * (x / W)) + H * 0.018 * Math.sin((x / W) * 9 + 1),
    cypress: {x0: W * 0.17, y0: H * 1.02, y1: H * 0.05, w0: W * 0.13},
    village: true,
    cell: 6.5,
  };
}

// Ön yüz çerçevesi: yalnız kenar şeridi görünür; yıldızlar şeridin içine, ay sağ üst köşeye.
function frameScene(): Scene {
  const W = PW, H = PH;
  const edge = W * 0.15;
  return {
    w: W,
    h: H,
    seed: 1890,
    band: x => H * 0.5 + H * 0.2 * Math.sin((x / W) * Math.PI * 2),
    bandW: H * 0.12,
    vortices: [
      {x: W * 0.62, y: 0, r: W * 0.16, s: 1},
      {x: W, y: H * 0.42, r: W * 0.16, s: -1},
      {x: 0, y: H * 0.58, r: W * 0.16, s: -1},
      {x: W * 0.38, y: H, r: W * 0.16, s: 1},
    ],
    stars: [
      {x: W * 0.6, y: W * 0.045, r: W * 0.06},
      {x: W * 0.955, y: H * 0.36, r: W * 0.06},
      {x: W * 0.045, y: H * 0.64, r: W * 0.06},
      {x: W * 0.4, y: H - W * 0.045, r: W * 0.06},
      {x: W * 0.045, y: H * 0.88, r: W * 0.045},
      {x: W * 0.955, y: H * 0.12, r: W * 0.045},
    ],
    moon: {x: W * 0.93, y: W * 0.07, r: W * 0.09},
    mask: (x, y) => x < edge || y < edge || x > W - edge || y > H - edge,
    cell: 6,
  };
}

// ───────────────────────── krem tuval ─────────────────────────
function paintCream(): HTMLCanvasElement {
  const [c, g] = makeCanvas(PW, PH);
  const rnd = mulberry(77);
  const r = g.createRadialGradient(PW / 2, PH / 2, PW * 0.15, PW / 2, PH / 2, PH * 0.62);
  r.addColorStop(0, '#f8f1dd');
  r.addColorStop(1, '#e9dbb8');
  g.fillStyle = r;
  g.fillRect(0, 0, PW, PH);
  // bezin dokusu: ince atkı/çözgü çizgileri
  g.globalAlpha = 0.05;
  g.fillStyle = '#6b5a3a';
  for (let y = 0; y < PH; y += 3) g.fillRect(0, y + rnd(), PW, 0.8);
  for (let x = 0; x < PW; x += 3) g.fillRect(x + rnd(), 0, 0.8, PH);
  g.globalAlpha = 1;
  // hafif krem fırça izleri
  for (let i = 0; i < 420; i++) {
    const x = rnd() * PW, y = rnd() * PH;
    const a = rnd() * Math.PI * 2;
    const len = 8 + rnd() * 14;
    const c2: RGB = rnd() < 0.5 ? [252, 248, 232] : [232, 218, 186];
    g.globalAlpha = 0.35;
    brush(g, [x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.6], 3 + rnd() * 3, c2, 0.4);
  }
  g.globalAlpha = 1;
  // benekler
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(120,96,60,0.07)' : 'rgba(255,255,255,0.12)';
    g.fillRect(rnd() * PW, rnd() * PH, 1, 1);
  }
  return c;
}

// ───────────────────────── takım şekilleri (birim kutu, merkez 0,0, genişlik ≈ 1) ─────────────────────────
function heartPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0.47);
  p.bezierCurveTo(-0.15, 0.33, -0.5, 0.13, -0.5, -0.15);
  p.bezierCurveTo(-0.5, -0.36, -0.355, -0.47, -0.235, -0.47);
  p.bezierCurveTo(-0.115, -0.47, -0.03, -0.395, 0, -0.29);
  p.bezierCurveTo(0.03, -0.395, 0.115, -0.47, 0.235, -0.47);
  p.bezierCurveTo(0.355, -0.47, 0.5, -0.36, 0.5, -0.15);
  p.bezierCurveTo(0.5, 0.13, 0.15, 0.33, 0, 0.47);
  p.closePath();
  return p;
}
function spadePath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.55);
  p.bezierCurveTo(0.13, -0.38, 0.5, -0.2, 0.5, 0.07);
  p.bezierCurveTo(0.5, 0.27, 0.37, 0.37, 0.235, 0.37);
  p.bezierCurveTo(0.15, 0.37, 0.085, 0.335, 0.05, 0.28);
  p.bezierCurveTo(0.06, 0.4, 0.12, 0.48, 0.21, 0.54);
  p.lineTo(-0.21, 0.54);
  p.bezierCurveTo(-0.12, 0.48, -0.06, 0.4, -0.05, 0.28);
  p.bezierCurveTo(-0.085, 0.335, -0.15, 0.37, -0.235, 0.37);
  p.bezierCurveTo(-0.37, 0.37, -0.5, 0.27, -0.5, 0.07);
  p.bezierCurveTo(-0.5, -0.2, -0.13, -0.38, 0, -0.55);
  p.closePath();
  return p;
}
function diamondPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -0.58);
  p.quadraticCurveTo(0.24, -0.3, 0.45, 0);
  p.quadraticCurveTo(0.24, 0.3, 0, 0.58);
  p.quadraticCurveTo(-0.24, 0.3, -0.45, 0);
  p.quadraticCurveTo(-0.24, -0.3, 0, -0.58);
  p.closePath();
  return p;
}
function clubPath(): Path2D {
  const p = new Path2D();
  const r = 0.245;
  const circ = (x: number, y: number): void => {
    p.moveTo(x + r, y);
    p.arc(x, y, r, 0, Math.PI * 2);
  };
  circ(0, -0.255);
  circ(-0.255, 0.075);
  circ(0.255, 0.075);
  p.moveTo(0, -0.255);
  p.lineTo(0.255, 0.075);
  p.lineTo(0, 0.16);
  p.lineTo(-0.255, 0.075);
  p.closePath();
  p.moveTo(0.06, 0.0);
  p.bezierCurveTo(0.055, 0.3, 0.11, 0.46, 0.21, 0.54);
  p.lineTo(-0.21, 0.54);
  p.bezierCurveTo(-0.11, 0.46, -0.055, 0.3, -0.06, 0.0);
  p.closePath();
  return p;
}
const isRed = (s: Suit): boolean => s === 'H' || s === 'D';

/** Fırça dokulu büyük takım işareti (tek sefer çizilir, kopyalanır). Birim kutu SPR px'e oturur. */
const SPR = 240;
function paintSuit(path: Path2D, red: boolean, seed: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(SPR, SPR);
  const rnd = mulberry(seed);
  const k = SPR * 0.84;
  g.translate(SPR / 2, SPR / 2);
  g.scale(k, k);
  const base: RGB = red ? [196, 18, 47] : [21, 23, 28];
  g.fillStyle = css(base);
  g.fill(path);
  g.save();
  g.clip(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const cols: RGB[] = red
    ? [[176, 10, 38], [206, 26, 52], [222, 52, 64], [160, 8, 40], [214, 40, 46], [236, 84, 80]]
    : [[14, 16, 22], [34, 38, 50], [26, 34, 64], [44, 48, 58], [18, 22, 34], [52, 66, 104]];
  const f: Field = (x, y) => {
    const dx = x - SPR / 2, dy = y - SPR * 0.46;
    return Math.atan2(dy, dx) + Math.PI / 2 + 0.35 + 0.4 * Math.sin(x * 0.04 - y * 0.03);
  };
  for (let i = 0; i < 520; i++) {
    const x = SPR * (0.06 + rnd() * 0.88), y = SPR * (0.04 + rnd() * 0.92);
    const ci = rnd() < 0.85 ? Math.floor(rnd() * 5) : 5;
    brush(g, trace(f, x, y, 10 + rnd() * 14, 2.4), 4 + rnd() * 3.5, jit(cols[ci], 8, rnd), 0.9);
  }
  g.restore();
  // net kenar
  g.lineWidth = 2.2 / k;
  g.strokeStyle = css(darken(base, red ? 0.35 : 0.2));
  g.stroke(path);
  return c;
}

/** As: krem tuval üzerinde girdaplı, parlak yıldız halesi (takımın arkasında). */
function paintAceHalo(): HTMLCanvasElement {
  const S = 300;
  const [c, g] = makeCanvas(S, S);
  const rnd = mulberry(31);
  // dış halka: gece mavisi girdap darbeleri
  const f: Field = (x, y) => Math.atan2(y - S / 2, x - S / 2) + Math.PI / 2 + 0.25;
  for (let i = 0; i < 900; i++) {
    const a = rnd() * Math.PI * 2, rr = S * (0.33 + Math.sqrt(rnd()) * 0.14);
    const x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr;
    brush(g, trace(f, x, y, 10 + rnd() * 12, 2.5), 4 + rnd() * 3, skyColor(ACE_SCENE, x, y, rnd), 0.8);
  }
  paintHalo(g, {x: S / 2, y: S / 2, r: S * 0.37}, rnd, 'ace', 1);
  return c;
}
const ACE_SCENE: Scene = {
  w: 300,
  h: 300,
  seed: 0,
  band: () => -999,
  bandW: 1,
  vortices: [{x: 150, y: 150, r: 150, s: 1}],
  stars: [],
  cell: 6,
};

// ───────────────────────── portreler ─────────────────────────
const CW = 240, CH = 356, PAD = 24; // saray kartı tuvali ve girdaplı çerçeve kalınlığı
const ORX = CW / 2 - PAD, ORY = CH / 2 - PAD; // portre elipsi yarıçapları

function grade(c: RGB): RGB {
  const l = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
  const L = l * 255;
  let o: RGB = [L + (c[0] - L) * 1.22, L + (c[1] - L) * 1.22, L + (c[2] - L) * 1.22];
  if (l < 0.42) o = mix(o, [30, 52, 116], (0.42 - l) * 0.85); // gölgeler laciverte kayar
  if (l > 0.62) o = mix(o, [255, 234, 160], (l - 0.62) * 0.55); // ışıklar sarıya
  return [clamp(o[0], 0, 255), clamp(o[1], 0, 255), clamp(o[2], 0, 255)];
}

/** Fotoğrafı, renklerinden örneklenen ve kenarlar boyunca akan fırça darbeleriyle yeniden boyar. */
function paintPortrait(img: HTMLImageElement, sx: number, seed: number): HTMLCanvasElement {
  const OW = ORX * 2, OH = ORY * 2;
  const cropW = (256 * OW) / OH;
  const SW = 64, SH = Math.round((64 * OH) / OW);
  const [, sg] = makeCanvas(SW, SH);
  sg.drawImage(img, sx, 0, cropW, 256, 0, 0, SW, SH);
  const px = sg.getImageData(0, 0, SW, SH).data;
  const lum = new Float32Array(SW * SH);
  for (let i = 0; i < SW * SH; i++) lum[i] = (0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2]) / 255;
  const L = (x: number, y: number): number => lum[clamp(y, 0, SH - 1) * SW + clamp(x, 0, SW - 1)];
  const cell = (x: number, y: number): [number, number] => [clamp(Math.floor((x / OW) * SW), 0, SW - 1), clamp(Math.floor((y / OH) * SH), 0, SH - 1)];
  const grad = (x: number, y: number): [number, number] => {
    const [i, j] = cell(x, y);
    const gx = L(i + 1, j - 1) + 2 * L(i + 1, j) + L(i + 1, j + 1) - L(i - 1, j - 1) - 2 * L(i - 1, j) - L(i - 1, j + 1);
    const gy = L(i - 1, j + 1) + 2 * L(i, j + 1) + L(i + 1, j + 1) - L(i - 1, j - 1) - 2 * L(i, j - 1) - L(i + 1, j - 1);
    return [gx, gy];
  };
  const color = (x: number, y: number): RGB => {
    const [i, j] = cell(x, y);
    const k = (j * SW + i) * 4;
    return grade([px[k], px[k + 1], px[k + 2]]);
  };
  const [c, g] = makeCanvas(OW, OH);
  g.filter = 'blur(2px)';
  g.drawImage(img, sx, 0, cropW, 256, 0, 0, OW, OH);
  g.filter = 'none';
  // alt boya da aynı renk düzeltmesini alsın
  const id = g.getImageData(0, 0, OW, OH);
  for (let i = 0; i < id.data.length; i += 4) {
    const o = grade([id.data[i], id.data[i + 1], id.data[i + 2]]);
    id.data[i] = o[0];
    id.data[i + 1] = o[1];
    id.data[i + 2] = o[2];
  }
  g.putImageData(id, 0, 0);
  const rnd = mulberry(seed);
  const layers: [number, number, number, number][] = [
    // kalınlık, uzunluk, adet, asgari eğim (ayrıntı katmanı yalnız kenarlarda)
    [6, 15, 650, 0],
    [3.8, 10, 1300, 0],
    [2.2, 6, 1500, 0.35],
  ];
  for (const [lw, len, n, minG] of layers) {
    for (let q = 0; q < n; q++) {
      let x = rnd() * OW, y = rnd() * OH;
      const [gx0, gy0] = grad(x, y);
      if (Math.hypot(gx0, gy0) < minG) continue;
      const col = jit(color(x, y), 9, rnd);
      const pts = [x, y];
      let prev = NaN;
      const steps = 4;
      for (let k = 0; k < steps; k++) {
        const [gx, gy] = grad(x, y);
        const m = Math.hypot(gx, gy);
        let a = m > 0.08 ? Math.atan2(gy, gx) + Math.PI / 2 : Math.sin(x * 0.05) + Math.cos(y * 0.04) * 1.5;
        if (!Number.isNaN(prev) && Math.cos(a - prev) < 0) a += Math.PI;
        prev = a;
        x += Math.cos(a) * (len / steps);
        y += Math.sin(a) * (len / steps);
        pts.push(x, y);
      }
      brush(g, pts, lw * (0.8 + rnd() * 0.4), col, 0.45);
    }
  }
  return c;
}

/** Saray kartı: elips portre + çevresinde yıldız halesi gibi girdaplı boyalı çerçeve. */
function paintCourt(portrait: HTMLCanvasElement | null, letter: string, seed: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(CW, CH);
  const rnd = mulberry(seed);
  const cx = CW / 2, cy = CH / 2;
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, ORX + 2, ORY + 2, 0, 0, Math.PI * 2);
  g.clip();
  if (portrait) g.drawImage(portrait, cx - ORX, cy - ORY);
  else {
    // yedek: gece göğü + büyük harf
    g.drawImage(frameArt!, 0, 0, PW, PH, 0, 0, CW, CH);
    g.fillStyle = '#f6eedb';
    g.font = `900 ${CH * 0.42}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letter, cx, cy);
  }
  g.restore();
  // girdaplı çerçeve: elips halkalar boyunca teğet darbeler
  const RING: RGB[] = [
    [242, 206, 74],
    [26, 46, 120],
    [52, 92, 176],
    [150, 188, 214],
    [246, 226, 136],
    [44, 80, 160],
    [22, 40, 108],
  ];
  const nr = RING.length;
  for (let k = 0; k < nr; k++) {
    const ro = 1 + (k / (nr - 1)) * (PAD - 4);
    const per = Math.PI * 2 * Math.sqrt(((ORX + ro) ** 2 + (ORY + ro) ** 2) / 2);
    const n = Math.ceil(per / 9);
    const off = rnd() * 6;
    for (let i = 0; i < n; i++) {
      const a0 = off + ((i + rnd() * 0.5) / n) * Math.PI * 2;
      const r = ro + (rnd() - 0.5) * 2;
      const pts = arcPts(cx, cy, ORX + r, ORY + r, a0, a0 + 0.1 + rnd() * 0.06, 4);
      brush(g, pts, 3.6 + rnd() * 1.6, jit(RING[k], 12, rnd), 0.7);
    }
  }
  // çerçevede küçük yıldızlar
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const ro = PAD * 0.5;
    paintHalo(g, {x: cx + Math.cos(a) * (ORX + ro), y: cy + Math.sin(a) * (ORY + ro), r: 11}, rnd, 'star', 0.5);
  }
  // portre kenarında ince lacivert + altın çizgi
  g.lineWidth = 2.4;
  g.strokeStyle = css([16, 24, 66]);
  g.beginPath();
  g.ellipse(cx, cy, ORX + 0.5, ORY + 0.5, 0, 0, Math.PI * 2);
  g.stroke();
  return c;
}

// ───────────────────────── önbellek ─────────────────────────
let backArt: HTMLCanvasElement | null = null;
let frameArt: HTMLCanvasElement | null = null;
let creamArt: HTMLCanvasElement | null = null;
let aceArt: HTMLCanvasElement | null = null;
let SUIT_PATH: Record<Suit, Path2D> | null = null;
const suitArt: Partial<Record<Suit, HTMLCanvasElement>> = {};
const courtArt: Record<number, HTMLCanvasElement> = {};
const glyph: Record<string, {l: number; r: number}> = {};
let capRef = 71; // 100 px yazıda büyük harf yüksekliği
let ready: Promise<void> | null = null;

const LABEL = (r: number): string => (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r));

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

async function doPrepare(): Promise<void> {
  try {
    await import('@fontsource/playfair-display/900.css');
    await document.fonts.load(`900 100px ${FONT}`, 'AJQK0123456789');
  } catch {
    /* yazı tipi yoksa yedek serif */
  }
  const [riza, defne, cem] = await Promise.all([loadImg(rizaUrl), loadImg(defneUrl), loadImg(cemUrl)]);
  SUIT_PATH = {S: spadePath(), H: heartPath(), D: diamondPath(), C: clubPath()};
  backArt = paintScene(backScene());
  frameArt = paintScene(frameScene());
  creamArt = paintCream();
  aceArt = paintAceHalo();
  (['S', 'H', 'D', 'C'] as Suit[]).forEach((s, i) => (suitArt[s] = paintSuit(SUIT_PATH![s], isRed(s), 500 + i)));
  const court: [number, HTMLImageElement | null, number][] = [
    [13, riza, 62],
    [12, defne, 60],
    [11, cem, 44],
  ];
  for (const [r, im, sx] of court) {
    let p: HTMLCanvasElement | null = null;
    try {
      if (im) p = paintPortrait(im, sx, 900 + r);
    } catch {
      p = null;
    }
    courtArt[r] = paintCourt(p, LABEL(r), 700 + r);
  }
  const [, mg] = makeCanvas(4, 4);
  mg.font = `900 100px ${FONT}`;
  capRef = mg.measureText('H').actualBoundingBoxAscent || 71;
  for (let r = 1; r <= 13; r++) {
    const t = LABEL(r);
    const m = mg.measureText(t);
    glyph[t] = {l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight};
  }
}

// ───────────────────────── kart çizimi ─────────────────────────
function roundRect(p: Path2D | Ctx, x: number, y: number, w: number, h: number, r: number): void {
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
}
function gold(g: Ctx, w: number, h: number): CanvasGradient {
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#f7e3a0');
  gr.addColorStop(0.25, '#c8963a');
  gr.addColorStop(0.5, '#fff1be');
  gr.addColorStop(0.75, '#a8781f');
  gr.addColorStop(1, '#ecc96c');
  return gr;
}

// Yerleşim (kart genişliği w birimiyle)
const F = 0.085; // boyalı çerçeve kalınlığı
const BX = 0.035, BW = 0.33, BH = 0.6; // köşe rozeti
const RCX = BX + BW / 2; // değer ekseni
const RTOP = 0.075; // değerin üstü
const CAP = 0.18 / 0.7; // değer büyük harf yüksekliği (kart yüksekliğinin %18'i)
const PIPW = 0.17;

function drawRank(g: Ctx, t: string, cx: number, top: number, capH: number, maxW: number, color: string): void {
  const fs = (capH * 100) / capRef;
  const m = glyph[t] ?? {l: 30, r: 30};
  const k = fs / 100;
  const inkW = (m.l + m.r) * k;
  const sx = Math.min(1, maxW / inkW);
  g.save();
  g.translate(cx, top + capH);
  g.scale(sx, 1);
  g.font = `900 ${fs}px ${FONT}`;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = color;
  g.fillText(t, ((m.l - m.r) / 2) * k, 0);
  g.restore();
}

function drawPip(g: Ctx, suit: Suit, cx: number, cy: number, size: number, color: string): void {
  g.save();
  g.translate(cx, cy);
  g.scale(size, size);
  g.fillStyle = color;
  g.fill(SUIT_PATH![suit]);
  g.restore();
}

function corners(g: Ctx, w: number, h: number, suit: Suit, rank: number): void {
  const col = isRed(suit) ? RED : INK;
  const t = LABEL(rank);
  for (let flip = 0; flip < 2; flip++) {
    g.save();
    if (flip) {
      g.translate(w, h);
      g.rotate(Math.PI);
    }
    drawRank(g, t, RCX * w, RTOP * w, CAP * w, (t.length > 1 ? 0.3 : 0.27) * w, col);
    const pipY = (RTOP + CAP + 0.045 + PIPW * 0.55) * w;
    drawPip(g, suit, RCX * w, pipY, PIPW * w, col);
    g.restore();
  }
}

/** Krem tuval paneli + köşe rozetleri (tek gövde), altın kenar çizgisiyle. */
function panelPath(w: number, h: number): Path2D {
  const p = new Path2D();
  roundRect(p, F * w, F * w, w - 2 * F * w, h - 2 * F * w, 0.05 * w);
  roundRect(p, BX * w, BX * w, BW * w, BH * w, 0.06 * w);
  roundRect(p, w - (BX + BW) * w, h - (BX + BH) * w, BW * w, BH * w, 0.06 * w);
  return p;
}

function drawFace(g: Ctx, w: number, h: number, suit: Suit, rank: number): void {
  if (!frameArt || !SUIT_PATH) return;
  g.save();
  const card = new Path2D();
  roundRect(card, 0, 0, w, h, 0.08 * w);
  g.clip(card);
  g.drawImage(frameArt, 0, 0, w, h);
  const panel = panelPath(w, h);
  g.lineJoin = 'round';
  g.lineWidth = 0.036 * w;
  g.strokeStyle = 'rgba(10,16,48,0.85)';
  g.stroke(panel);
  g.lineWidth = 0.022 * w;
  g.strokeStyle = gold(g, w, h);
  g.stroke(panel);
  g.save();
  g.clip(panel);
  g.drawImage(creamArt!, 0, 0, w, h);
  g.restore();

  const cx = w / 2, cy = h / 2;
  if (rank === 1) {
    const d = 0.62 * w;
    g.drawImage(aceArt!, cx - d / 2, cy - d / 2, d, d);
    const sz = 0.34 * w;
    g.save();
    g.translate(cx, cy);
    g.scale(sz, sz);
    g.lineWidth = 0.09;
    g.strokeStyle = '#fbf3dc';
    g.stroke(SUIT_PATH[suit]);
    g.restore();
    g.drawImage(suitArt[suit]!, cx - (sz * SPR) / (SPR * 0.84) / 2, cy - (sz * SPR) / (SPR * 0.84) / 2, sz / 0.84, sz / 0.84);
  } else if (rank >= 11) {
    const art = courtArt[rank];
    const dw = 0.5 * w, dh = (dw * CH) / CW;
    if (art) g.drawImage(art, cx - dw / 2, cy - dh / 2, dw, dh);
    // elipsin üstünde ve altında küçük takım rozetleri
    for (const sy of [-1, 1]) {
      const ey = cy + sy * (dh / 2 + 0.005 * w);
      g.beginPath();
      g.arc(cx, ey, 0.06 * w, 0, Math.PI * 2);
      g.fillStyle = '#f7efd9';
      g.fill();
      g.lineWidth = 0.014 * w;
      g.strokeStyle = gold(g, w, h);
      g.stroke();
      drawPip(g, suit, cx, ey + 0.003 * w, 0.07 * w, isRed(suit) ? RED : INK);
    }
  } else {
    const sz = 0.46 * w;
    const d = sz / 0.84;
    g.drawImage(suitArt[suit]!, cx - d / 2, cy - d / 2, d, d);
    const ty = suit === 'H' ? -0.07 : suit === 'C' ? -0.04 : suit === 'S' ? 0.02 : 0;
    const capH = 0.15 * w;
    const t = LABEL(rank);
    drawRank(g, t, cx, cy + ty * sz - capH / 2, capH, (suit === 'D' ? 0.2 : 0.24) * w, '#fbf3dc');
  }
  corners(g, w, h, suit, rank);
  g.restore();
  // dış kenarda ince koyu çizgi (masada kenar belli olsun)
  g.save();
  g.lineWidth = Math.max(1, 0.012 * w);
  g.strokeStyle = 'rgba(8,12,40,0.7)';
  const edge = new Path2D();
  roundRect(edge, g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, 0.08 * w - g.lineWidth / 2);
  g.stroke(edge);
  g.restore();
}

function drawBack(g: Ctx, w: number, h: number): void {
  if (!backArt) return;
  g.save();
  const card = new Path2D();
  roundRect(card, 0, 0, w, h, 0.08 * w);
  g.clip(card);
  g.drawImage(backArt, 0, 0, w, h);
  // altın çerçeve (tablo çerçevesi): dış altın bant + iç ince koyu çizgi
  const bw = 0.034 * w;
  g.lineWidth = bw * 2;
  g.strokeStyle = gold(g, w, h);
  g.stroke(card);
  const inner = new Path2D();
  roundRect(inner, bw, bw, w - 2 * bw, h - 2 * bw, 0.08 * w - bw);
  g.lineWidth = 0.012 * w;
  g.strokeStyle = 'rgba(20,14,4,0.75)';
  g.stroke(inner);
  g.restore();
}

export const skin: Skin = {
  id: 's4',
  name: 'Yıldızlı Gece',
  desc: "Van Gogh'un girdaplı gökyüzünden esinlenen, fırça darbeleriyle boyanmış koleksiyon destesi.",
  prepare(): Promise<void> {
    if (!ready) ready = doPrepare();
    return ready;
  },
  drawFace,
  drawBack,
};
