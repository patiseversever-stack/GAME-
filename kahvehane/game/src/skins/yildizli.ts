// Tarz 4 — "Yıldızlı Gece": Van Gogh'un "Yıldızlı Gece" (1889, kamu malı) tablosundan esinlenen koleksiyon destesi.
// Hiçbir görsel indirilmez: prepare() içinde, girdaplı bir akış alanı (flow field) boyunca binlerce kısa, kalın,
// kıvrık fırça darbesiyle kendi "tablolarımızı" BİR KEZ boyayıp saklarız; kart çizimi yalnızca bu tuvalleri kopyalar.
import {makeTick} from '../platform/sched';
import type {Skin, Suit} from './contract';

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
  g.lineJoin = 'bevel';
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
/** Kabartmalı (impasto) fırça darbesi: gövde + sol-üst kenarında ince, açık bir ışık sırtı. Opak boyalar (hızlı). */
function brush(g: Ctx, pts: number[], lw: number, c: RGB, relief = 1): void {
  if (pts.length < 4) return;
  const p = new Path2D();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = css(c);
  g.lineWidth = lw;
  g.stroke(p);
  if (relief > 0) {
    const q = Math.max(0.4, lw * 0.16);
    g.translate(-q, -q);
    g.strokeStyle = css(lighten(c, 0.2 * relief));
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
  bs?: number; // fırça ölçeği (yoksa w / 360)
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
  L += bk * (0.26 + 0.4 * (0.5 + 0.5 * Math.sin(x * 0.07 + y * 0.05)));
  for (const v of sc.vortices) {
    const dx = x - v.x, dy = y - v.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const R = v.r * 1.15;
    if (d < R) {
      const t = 1 - d / R;
      const ang = Math.atan2(dy, dx) * v.s;
      const sp = Math.sin((d / (v.r * 0.3)) * Math.PI * 2 - ang); // sarmal kollar
      L += t * (0.78 * (0.5 + 0.5 * sp) - 0.14);
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
  const s = sc.bs ?? sc.w / 360;
  for (const [px, py] of pts) {
    const len = (12 + rnd() * 14) * s;
    const lw = (3.6 + rnd() * 2.8) * s;
    brush(g, trace(f, px, py, len, 3.2 * s), lw, skyColor(sc, px, py, rnd));
  }
}

/** Yıldız ya da ay halesi: iç içe halkalar hâlinde kısa, teğet darbeler + parlak çekirdek. */
function paintHalo(g: Ctx, st: Star, rnd: Rnd, kind: 'star' | 'moon', scale = 1): void {
  const R = st.r;
  const core = R * (kind === 'moon' ? 0.5 : 0.3);
  const step = Math.max(2.6 * scale, R * 0.1);
  for (let rr = R; rr > core * 0.92; rr -= step * (0.8 + rnd() * 0.35)) {
    const t = (rr - core) / (R - core); // 0 iç, 1 dış
    let base: RGB;
    if (kind === 'moon') {
      base = t < 0.16 ? [232, 160, 50] : t < 0.42 ? [250, 214, 92] : t < 0.68 ? [244, 188, 66] : t < 0.86 ? [226, 198, 114] : [140, 162, 176];
    } else {
      base = t < 0.22 ? [250, 236, 150] : t < 0.42 ? [242, 204, 66] : t < 0.58 ? [232, 226, 168] : t < 0.72 ? [70, 112, 182] : t < 0.86 ? [160, 196, 196] : [92, 134, 198];
    }
    const segLen = (5 + rnd() * 5) * scale + R * 0.12;
    const n = Math.ceil((Math.PI * 2 * rr) / (segLen * 0.62));
    const off = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a0 = off + ((i + rnd() * 0.45) / n) * Math.PI * 2;
      const r1 = rr + (rnd() - 0.5) * step * 0.7;
      const da = segLen / r1;
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
    g.fillStyle = css([255, 238, 150]);
    g.fill();
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * 0.35 + rnd() * Math.PI * 1.25;
      const rr = core * (0.55 + rnd() * 0.4);
      brush(g, arcPts(st.x, st.y, rr, rr, a, a + 0.6, 4), core * 0.17, jit(rnd() < 0.5 ? [255, 246, 196] : [252, 226, 120], 8, rnd), 0.5);
    }
    // gölgeli kısım: sağ üste kaymış disk
    const sx = st.x + core * 0.4, sy = st.y - core * 0.24, sr = core * 0.8;
    g.fillStyle = css([214, 146, 52]);
    g.beginPath();
    g.arc(sx, sy, sr, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = sr * (0.3 + rnd() * 0.6);
      brush(g, arcPts(sx, sy, rr, rr, a, a + 0.9, 4), core * 0.15, jit(rnd() < 0.5 ? [226, 162, 62] : [200, 132, 50], 8, rnd), 0.4);
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
  const cell = 7.5 * s;
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
    brush(g, trace(f, px, py, (11 + rnd() * 12) * s, 3 * s), (3.4 + rnd() * 2.4) * s, jit(c, 10, rnd), 0.8);
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
  const cx = cy.x0 + cy.w0 * (0.45 * t + 0.22 * Math.sin(t * 7.5) + 0.06 * Math.sin(t * 21));
  const hw = cy.w0 * Math.pow(1 - t, 0.75) * (0.88 + 0.14 * Math.sin(t * 17)) + 1.2;
  const l = cx - hw * (1 + 0.3 * Math.pow(Math.abs(Math.sin(t * 26 + 1.3)), 3));
  const r = cx + hw * (1 + 0.3 * Math.pow(Math.abs(Math.sin(t * 24 + 4.1)), 3));
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
    return -Math.PI / 2 + lean + 0.7 * Math.sin(y * 0.06 + x * 0.05);
  };
  const N = Math.round(850 * s * s);
  for (let i = 0; i < N; i++) {
    const t = Math.pow(rnd(), 1.25);
    const y = cy.y0 - (cy.y0 - cy.y1) * t;
    const e = cypEdges(cy, y);
    if (!e) continue;
    const x = e[0] + (e[1] - e[0]) * (0.04 + rnd() * 0.92);
    const c = COLS[rnd() < 0.82 ? Math.floor(rnd() * 5) : 5 + Math.floor(rnd() * 3)];
    const len = (12 + rnd() * 16) * s * (1 - t * 0.5);
    brush(g, trace(f, x, y, len, 2 * s), (2.8 + rnd() * 2.8) * s * (1 - t * 0.45), jit(c, 9, rnd), 0.85);
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

async function paintScene(sc: Scene): Promise<HTMLCanvasElement> {
  const tick = makeTick();
  const [c, g] = makeCanvas(sc.w, sc.h);
  const rnd = mulberry(sc.seed);
  const s = sc.w / 360;
  paintSky(g, sc, rnd);
  await tick();
  for (const st of sc.stars) {
    paintHalo(g, st, rnd, 'star', s);
    await tick();
  }
  if (sc.moon) paintHalo(g, sc.moon, rnd, 'moon', s);
  await tick();
  // ışıltı: yıldızların ve ayın çevresine yumuşak, ekranla karışan sıcak ışık (servi ve tepeler önünde kalır)
  g.globalCompositeOperation = 'screen';
  for (const st of sc.moon ? [...sc.stars, sc.moon] : sc.stars) {
    const R = st.r * 1.8;
    const gl = g.createRadialGradient(st.x, st.y, st.r * 0.2, st.x, st.y, R);
    gl.addColorStop(0, 'rgba(255,236,160,0.42)');
    gl.addColorStop(0.45, 'rgba(255,214,110,0.16)');
    gl.addColorStop(1, 'rgba(255,214,110,0)');
    g.fillStyle = gl;
    g.fillRect(st.x - R, st.y - R, R * 2, R * 2);
  }
  g.globalCompositeOperation = 'source-over';
  if (sc.horizon) paintHills(g, sc, rnd);
  await tick();
  if (sc.village) paintVillage(g, sc, rnd);
  await tick();
  if (sc.cypress) paintCypress(g, sc.cypress, rnd, s);
  await tick();
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
    cell: 8,
  };
}

// Ön yüz çerçevesi: yalnız kenar şeridi görünür; yıldızlar şeridin içine, ay sağ üst köşeye.
function frameScene(): Scene {
  const W = PW, H = PH;
  const edge = W * 0.11;
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
    cell: 7,
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
    g.globalAlpha = 0.16;
    brush(g, [x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.6], 4 + rnd() * 4, c2, 0);
  }
  g.globalAlpha = 1;
  // "Yıldızlı Gece" nefesi: panelin ortasında çok soluk bir girdap (okunurluğu bozmayacak kadar hafif)
  const cx = PW / 2, cy = PH / 2, Rw = PW * 0.44;
  const fw: Field = (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2 + 0.28 + 0.25 * Math.sin(x * 0.03 - y * 0.02);
  g.globalAlpha = 0.15;
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2, d = Rw * Math.sqrt(rnd());
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 1.25;
    const sp = Math.sin((d / (Rw * 0.3)) * Math.PI * 2 - a);
    const col: RGB = sp > 0.1 ? [104, 146, 204] : sp > -0.6 ? [170, 194, 220] : [214, 192, 130];
    brush(g, trace(fw, x, y, 12 + rnd() * 12, 3), 4 + rnd() * 3, jit(col, 10, rnd), 0);
  }
  g.globalAlpha = 1;
  // minik yıldız serpintisi (köşe rozetlerinden uzakta)
  for (let n = 0, tries = 0; n < 9 && tries < 200; tries++) {
    const x = PW * (0.12 + rnd() * 0.76), y = PH * (0.08 + rnd() * 0.84);
    if ((x < PW * 0.42 && y < PH * 0.46) || (x > PW * 0.58 && y > PH * 0.54)) continue;
    g.globalAlpha = 0.55;
    tinyStar(g, x, y, 2 + rnd() * 1.6, rnd);
    g.globalAlpha = 1;
    n++;
  }
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
/** Büyük takım işaretinin içindeki değerin dikey yeri (birim şekil koordinatı). */
const SUIT_TY: Record<Suit, number> = {H: -0.07, C: -0.04, S: 0.02, D: 0};

/** Minik yıldız: soluk mavi hale + sarı-beyaz çekirdek. */
function tinyStar(g: Ctx, x: number, y: number, r: number, rnd: Rnd): void {
  g.fillStyle = 'rgba(120,160,220,0.32)';
  g.beginPath();
  g.arc(x, y, r * 2.2, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2;
    brush(g, arcPts(x, y, r * 1.45, r * 1.45, a, a + 1.1, 3), r * 0.6, jit([248, 220, 104], 10, rnd), 0);
  }
  g.fillStyle = css([255, 248, 210]);
  g.beginPath();
  g.arc(x, y, r * 0.8, 0, Math.PI * 2);
  g.fill();
}

/**
 * Büyük takım işareti, içi "Yıldızlı Gece" girdabıyla boyanmış (tek sefer çizilir, kopyalanır).
 * ♠♣: gece laciverti / neredeyse siyah sarmal + birkaç minik sarı yıldız. ♥♦: lal-zincifre sarmal + sıcak sarı ışıltı.
 * Birim şekil SPR·0.84 px'e oturur; ty: içteki değerin dikey yeri (birim), yıldızlar oradan uzak durur.
 */
const SPR = 200;
function paintSuit(path: Path2D, red: boolean, seed: number, ty: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(SPR, SPR);
  const rnd = mulberry(seed);
  const k = SPR * 0.84, C = SPR / 2;
  const base: RGB = red ? [194, 18, 46] : [14, 18, 36];
  g.setTransform(k, 0, 0, k, C, C);
  g.fillStyle = css(base);
  g.fill(path);
  g.save();
  g.clip(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // iç içe iki girdap (tablodaki büyük sarmal gibi)
  const vs: Vortex[] = [
    {x: C - SPR * 0.1, y: C - SPR * 0.08, r: SPR * 0.26, s: 1},
    {x: C + SPR * 0.15, y: C + SPR * 0.12, r: SPR * 0.19, s: -1},
  ];
  const f: Field = (x, y) => {
    let vx = 1, vy = 0.3 * Math.sin(x * 0.05 + y * 0.03);
    for (const v of vs) {
      const dx = x - v.x, dy = y - v.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      const q = 3 * Math.exp(-(d * d) / (v.r * v.r));
      vx += (q * -dy * v.s - q * 0.2 * dx) / d;
      vy += (q * dx * v.s - q * 0.2 * dy) / d;
    }
    return Math.atan2(vy, vx);
  };
  const band = (x: number, y: number): number => {
    let b = 0.5 + 0.5 * Math.sin(x * 0.06 + y * 0.035);
    for (const v of vs) {
      const dx = x - v.x, dy = y - v.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const R = v.r * 1.2;
      if (d < R) {
        const t = 1 - d / R;
        b = b * (1 - t) + t * (0.5 + 0.5 * Math.sin((d / (v.r * 0.32)) * Math.PI * 2 - Math.atan2(dy, dx) * v.s));
      }
    }
    return b;
  };
  const DARK: RGB[] = red ? [[178, 10, 38], [196, 20, 46], [166, 12, 44]] : [[10, 13, 26], [16, 21, 42], [12, 16, 34]];
  const LIGHT: RGB[] = red ? [[216, 42, 44], [228, 62, 48], [206, 30, 58]] : [[24, 38, 84], [32, 54, 114], [20, 44, 72]];
  const SPARK: RGB[] = red ? [[250, 196, 90], [240, 120, 60]] : [[76, 114, 186], [126, 162, 214]];
  for (let i = 0; i < 280; i++) {
    const x = SPR * (0.06 + rnd() * 0.88), y = SPR * (0.03 + rnd() * 0.94);
    const b = band(x, y) + (rnd() - 0.5) * 0.3;
    const col = b > (red ? 0.96 : 0.94) ? pick(SPARK, rnd) : b > 0.6 ? pick(LIGHT, rnd) : pick(DARK, rnd);
    brush(g, trace(f, x, y, 11 + rnd() * 12, 3), 4 + rnd() * 3, jit(col, 8, rnd), 0.9);
  }
  if (!red) {
    // birkaç minik sarı yıldız — değerin bulunduğu orta bölgeden uzakta, kenara taşmadan
    let n = 0;
    for (let tries = 0; tries < 300 && n < 5; tries++) {
      const ux = (rnd() - 0.5) * 0.84, uy = (rnd() - 0.5) * 0.9;
      if (Math.abs(ux) < 0.24 && Math.abs(uy - ty) < 0.2) continue;
      const px = C + ux * k, py = C + uy * k, m = 10;
      g.setTransform(k, 0, 0, k, C, C);
      const inside = g.isPointInPath(path, px - m, py) && g.isPointInPath(path, px + m, py) && g.isPointInPath(path, px, py - m) && g.isPointInPath(path, px, py + m);
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (!inside) continue;
      tinyStar(g, px, py, 2.6 + rnd() * 2.2, rnd);
      n++;
    }
  }
  g.restore();
  // net kenar
  g.setTransform(k, 0, 0, k, C, C);
  g.lineWidth = 2.2 / k;
  g.strokeStyle = css(darken(base, red ? 0.35 : 0.1));
  g.stroke(path);
  return c;
}

/** As: sarmal kollu, ışıl ışıl bir yıldız-girdap (gökada gibi): dışta lacivert kollar, içte altın ışık, ortada beyaz çekirdek. */
const ACE_S = 320, ACE_R = ACE_S * 0.46;
function paintAce(): HTMLCanvasElement {
  const S = ACE_S, C = S / 2, R = ACE_R;
  const [c, g] = makeCanvas(S, S);
  const rnd = mulberry(31);
  // 1) dört sarmal kol
  const ARM: RGB[] = [[170, 202, 222], [110, 154, 208], [60, 104, 184], [36, 70, 156], [22, 42, 116], [16, 30, 92]];
  const span = Math.PI * 1.3, dr = (R * 0.55) / span;
  for (let k = 0; k < 4; k++) {
    const phi = (k * Math.PI) / 2 + 0.3;
    for (let i = 0; i < 170; i++) {
      const t = Math.pow(rnd(), 0.85);
      const th0 = phi + t * span;
      const r0 = R * 0.45 + dr * t * span + (rnd() - 0.5) * 2 * (1 - t * 0.55) * 13;
      const da = (15 + rnd() * 14) / r0;
      const pts: number[] = [];
      for (let q = 0; q <= 4; q++) {
        const th = th0 + (da * q) / 4;
        const r = r0 + (dr * da * q) / 4;
        pts.push(C + Math.cos(th) * r, C + Math.sin(th) * r);
      }
      const ci = clamp(Math.floor(t * 4.2 + rnd() * 2), 0, ARM.length - 1);
      const col = rnd() < 0.08 ? TEAL : ARM[ci];
      brush(g, pts, (6.6 - t * 3) * (0.8 + rnd() * 0.4), jit(col, 12, rnd), 0.9);
    }
  }
  // 2) gövde: lacivert-kobalt girdap diski
  const f: Field = (x, y) => Math.atan2(y - C, x - C) + Math.PI / 2 + 0.3;
  for (let i = 0; i < 300; i++) {
    const a = rnd() * Math.PI * 2, d = R * (0.4 + rnd() * 0.24);
    const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
    const col = pick<RGB>([[30, 60, 150], [50, 92, 178], [92, 140, 204], [40, 110, 140]], rnd);
    brush(g, trace(f, x, y, 10 + rnd() * 10, 2.6), 4 + rnd() * 2.6, jit(col, 10, rnd), 0.8);
  }
  // 3) açık ışık halkası + altın iç ışık
  paintRing(g, C, C, R * 0.57, R * 0.57, 5, [234, 232, 182], rnd);
  const arm = (x: number, y: number): number => {
    const dx = x - C, dy = y - C;
    return 0.5 + 0.5 * Math.sin((Math.hypot(dx, dy) / (R * 0.2)) * Math.PI * 2 - Math.atan2(dy, dx));
  };
  const IN: RGB[] = [[240, 192, 52], [250, 218, 96], [254, 240, 166], [232, 166, 46]];
  for (let i = 0; i < 400; i++) {
    const a = rnd() * Math.PI * 2, d = R * Math.sqrt(rnd()) * 0.55;
    const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
    const b = arm(x, y);
    const col = d < R * 0.16 ? IN[2] : rnd() < 0.08 ? IN[3] : b > 0.5 ? IN[1] : IN[0];
    brush(g, trace(f, x, y, 9 + rnd() * 10, 2.4), 3.6 + rnd() * 2.6, jit(col, 10, rnd), 0.7);
  }
  const core = g.createRadialGradient(C, C, 0, C, C, R * 0.3);
  core.addColorStop(0, 'rgba(255,254,240,1)');
  core.addColorStop(0.55, 'rgba(255,248,210,0.75)');
  core.addColorStop(1, 'rgba(255,240,170,0)');
  g.fillStyle = core;
  g.fillRect(0, 0, S, S);
  // 4) kolların arasında minik yıldızlar
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.4, d = R * (0.78 + rnd() * 0.2);
    tinyStar(g, C + Math.cos(a) * d, C + Math.sin(a) * d, 3 + rnd() * 2, rnd);
  }
  return c;
}

/** Elips boyunca kısa teğet darbelerden bir halka. */
function paintRing(g: Ctx, cx: number, cy: number, rx: number, ry: number, lw: number, col: RGB, rnd: Rnd): void {
  const per = Math.PI * 2 * Math.sqrt((rx * rx + ry * ry) / 2);
  const n = Math.ceil(per / 9);
  const off = rnd() * 6;
  for (let i = 0; i < n; i++) {
    const a0 = off + ((i + rnd() * 0.5) / n) * Math.PI * 2;
    const r = (rnd() - 0.5) * 2;
    const da = 12 / Math.max(rx, ry) + rnd() * 0.05;
    brush(g, arcPts(cx, cy, rx + r, ry + r, a0, a0 + da, 4), lw * (0.85 + rnd() * 0.4), jit(col, 12, rnd), 0.7);
  }
}

// ───────────────────────── saray kartları: Yıldızlı Gece motifleri ─────────────────────────
// Papaz = taçlı hilal Ay, Kız = hotozlu büyük yıldız (Venüs), Vale = alev gibi servi (Pişti'de yığını alan kart: en gösterişlisi).
const CW = 240, CH = 350, PAD = 19; // saray tuvali ve girdaplı çerçeve kalınlığı
const ORX = CW / 2 - PAD, ORY = CH / 2 - PAD; // iç elips yarıçapları

function goldFill(g: Ctx, y0: number, y1: number): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff4c2');
  gr.addColorStop(0.35, '#f2c94e');
  gr.addColorStop(0.7, '#c98f22');
  gr.addColorStop(1, '#8a5a12');
  return gr;
}
function jewel(g: Ctx, x: number, y: number, r: number, col: string): void {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 1.4;
  g.strokeStyle = '#4a2c06';
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(x - r * 0.35, y - r * 0.35, r * 0.32, 0, Math.PI * 2);
  g.fill();
}

/** Altın taç: bant + beş diş, uçlarda inci, bantta mücevherler. by = bandın altı. */
function drawCrown(g: Ctx, cx: number, by: number, w: number, rnd: Rnd): void {
  const h = w * 0.62, bandH = w * 0.18, top = by - bandH;
  const tips = [-0.54, -0.27, 0, 0.27, 0.54].map((u, i) => [cx + u * w, top - h * [0.62, 0.74, 0.98, 0.74, 0.62][i]]);
  const vals = [-0.4, -0.13, 0.13, 0.4].map((u, i) => [cx + u * w, top - h * [0.2, 0.3, 0.3, 0.2][i]]);
  const p = new Path2D();
  p.moveTo(cx - w * 0.5, by);
  p.lineTo(cx - w * 0.5, top);
  for (let i = 0; i < 5; i++) {
    p.lineTo(tips[i][0], tips[i][1]);
    if (i < 4) p.lineTo(vals[i][0], vals[i][1]);
  }
  p.lineTo(cx + w * 0.5, top);
  p.lineTo(cx + w * 0.5, by);
  p.closePath();
  g.fillStyle = goldFill(g, top - h, by);
  g.fill(p);
  // boyalı ışıltı darbeleri
  g.save();
  g.clip(p);
  for (let i = 0; i < 26; i++) {
    const x = cx + (rnd() - 0.5) * w, y = by - rnd() * (h + bandH);
    brush(g, [x, y, x + 4 + rnd() * 6, y - 6 - rnd() * 8], 2 + rnd() * 2, rnd() < 0.5 ? [255, 236, 150] : [206, 150, 40], 0);
  }
  g.restore();
  g.lineWidth = 2.2;
  g.lineJoin = 'round';
  g.strokeStyle = '#4a2c06';
  g.stroke(p);
  // bant çizgisi
  g.beginPath();
  g.moveTo(cx - w * 0.5, top);
  g.lineTo(cx + w * 0.5, top);
  g.stroke();
  for (const [x, y] of tips) jewel(g, x, y, w * 0.055, '#fff4d0');
  jewel(g, cx, by - bandH / 2, w * 0.07, '#c4122f');
  jewel(g, cx - w * 0.3, by - bandH / 2, w * 0.05, '#2c5fd6');
  jewel(g, cx + w * 0.3, by - bandH / 2, w * 0.05, '#2c5fd6');
}

/** Altın hotoz (tiara): kemerli ince bant, ortada yükselen dişler, uçlarında inciler. by = bandın ortası (alt). */
function drawTiara(g: Ctx, cx: number, by: number, w: number): void {
  const arcH = w * 0.14, th = w * 0.075;
  const baseY = (u: number): number => by - arcH * (1 - u * u);
  const spikes = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map(u => ({u, h: w * (0.07 + 0.36 * Math.pow(1 - Math.abs(u), 1.6))}));
  const p = new Path2D();
  const X = (u: number): number => cx + u * w * 0.5;
  p.moveTo(X(-1), baseY(-1));
  for (let i = 0; i < spikes.length; i++) {
    const {u, h} = spikes[i];
    p.lineTo(X(u) - w * 0.035, baseY(u) - th * 0.6);
    p.lineTo(X(u), baseY(u) - th - h);
    p.lineTo(X(u) + w * 0.035, baseY(u) - th * 0.6);
  }
  p.lineTo(X(1), baseY(1));
  for (let u = 1; u >= -1; u -= 0.1) p.lineTo(X(u), baseY(u) + th * 0.4);
  p.closePath();
  g.fillStyle = goldFill(g, by - arcH - w * 0.5, by);
  g.fill(p);
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.strokeStyle = '#4a2c06';
  g.stroke(p);
  for (const {u, h} of spikes) jewel(g, X(u), baseY(u) - th - h, w * (Math.abs(u) < 0.01 ? 0.05 : 0.036), '#fffaf0');
  jewel(g, cx, baseY(0) - th * 0.2, w * 0.07, '#1f8fb0');
}

function courtScene(kind: 'K' | 'Q' | 'J'): Scene {
  const W = CW, H = CH;
  const inOval = (x: number, y: number): boolean => ((x - W / 2) / (ORX + 8)) ** 2 + ((y - H / 2) / (ORY + 8)) ** 2 < 1;
  const common = {w: W, h: H, cell: 9, bs: 1, mask: inOval};
  if (kind === 'K')
    return {
      ...common,
      seed: 1313,
      band: x => H * 0.3 + H * 0.05 * Math.sin((x / W) * Math.PI * 2),
      bandW: H * 0.07,
      vortices: [
        {x: W * 0.22, y: H * 0.3, r: W * 0.22, s: 1},
        {x: W * 0.82, y: H * 0.82, r: W * 0.2, s: -1},
      ],
      stars: [
        {x: W * 0.8, y: H * 0.2, r: W * 0.07},
        {x: W * 0.18, y: H * 0.7, r: W * 0.06},
        {x: W * 0.3, y: H * 0.92, r: W * 0.05},
      ],
      moon: {x: W * 0.5, y: H * 0.6, r: W * 0.34},
    };
  if (kind === 'Q')
    return {
      ...common,
      seed: 1212,
      band: x => H * 0.78 + H * 0.05 * Math.sin((x / W) * Math.PI * 2 + 1),
      bandW: H * 0.07,
      vortices: [
        {x: W * 0.78, y: H * 0.24, r: W * 0.2, s: -1},
        {x: W * 0.2, y: H * 0.86, r: W * 0.2, s: 1},
      ],
      stars: [
        {x: W * 0.5, y: H * 0.6, r: W * 0.37},
        {x: W * 0.2, y: H * 0.22, r: W * 0.06},
        {x: W * 0.82, y: H * 0.86, r: W * 0.06},
      ],
    };
  return {
    ...common,
    seed: 1111,
    band: x => H * 0.46 - H * 0.1 * (x / W),
    bandW: H * 0.1,
    vortices: [
      {x: W * 0.8, y: H * 0.5, r: W * 0.3, s: 1},
      {x: W * 0.2, y: H * 0.52, r: W * 0.2, s: -1},
    ],
    stars: [
      {x: W * 0.54, y: H * 0.15, r: W * 0.15}, // servinin ucu bu yıldızı deler
      {x: W * 0.84, y: H * 0.38, r: W * 0.075},
      {x: W * 0.82, y: H * 0.72, r: W * 0.07},
      {x: W * 0.16, y: H * 0.68, r: W * 0.065},
    ],
    moon: {x: W * 0.19, y: H * 0.32, r: W * 0.12},
    horizon: x => H * (0.86 - 0.04 * (x / W)) + H * 0.012 * Math.sin((x / W) * 8),
    cypress: {x0: W * 0.4, y0: H * 1.03, y1: H * 0.07, w0: W * 0.2},
  };
}

/** Saray kartı: elips içinde Yıldızlı Gece motifi + çevresinde yıldız halesi gibi girdaplı boyalı çerçeve. */
async function paintCourt(kind: 'K' | 'Q' | 'J', seed: number): Promise<HTMLCanvasElement> {
  const [c, g] = makeCanvas(CW, CH);
  const rnd = mulberry(seed);
  const cx = CW / 2, cy = CH / 2;
  const sky = await paintScene(courtScene(kind));
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, ORX + 2, ORY + 2, 0, 0, Math.PI * 2);
  g.clip();
  g.drawImage(sky, 0, 0);
  if (kind === 'K') drawCrown(g, cx, CH * 0.6 - CW * 0.34 * 0.5 + 6, CW * 0.46, rnd);
  else if (kind === 'Q') drawTiara(g, cx, CH * 0.6 - CW * 0.37 * 0.55, CW * 0.42);
  else {
    // servinin kenarına ay ışığı: sağ kenarda sıcak yeşil-altın parıltı darbeleri
    const cy2 = courtScene('J').cypress!;
    for (let i = 0; i < 60; i++) {
      const y = cy2.y0 - (cy2.y0 - cy2.y1) * (0.08 + rnd() * 0.8);
      const e = cypEdges(cy2, y)!;
      const x = e[1] - 3 - rnd() * 8;
      const col: RGB = pick([[70, 108, 58], [92, 128, 62], [58, 96, 70], [150, 150, 78]], rnd);
      brush(g, [x, y, x + 2 + rnd() * 3, y - 6 - rnd() * 8, x + rnd() * 3, y - 12 - rnd() * 10], 1.8 + rnd() * 1.6, jit(col, 10, rnd), 0.5);
    }
  }
  g.restore();
  // girdaplı çerçeve: elips halkalar boyunca teğet darbeler
  const RING: RGB[] =
    kind === 'J'
      ? [[250, 222, 120], [196, 140, 36], [255, 240, 170], [214, 160, 48], [150, 100, 26]]
      : [[242, 206, 74], [30, 56, 140], [150, 188, 214], [44, 80, 160], [22, 40, 108]];
  const nr = RING.length;
  for (let k = 0; k < nr; k++) {
    const ro = 1 + (k / (nr - 1)) * (PAD - 4);
    paintRing(g, cx, cy, ORX + ro, ORY + ro, 5, RING[k], rnd);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const ro = PAD * 0.5;
    paintHalo(g, {x: cx + Math.cos(a) * (ORX + ro), y: cy + Math.sin(a) * (ORY + ro), r: 11}, rnd, 'star', 0.5);
  }
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

async function doPrepare(): Promise<void> {
  try {
    await import('@fontsource/playfair-display/900.css');
    await document.fonts.load(`900 100px ${FONT}`, 'AJQK0123456789');
  } catch {
    /* yazı tipi yoksa yedek serif */
  }
  SUIT_PATH = {S: spadePath(), H: heartPath(), D: diamondPath(), C: clubPath()};
  // Tablolar bir kez boyanır (~400 ms); kart çizimi yalnızca bunları kopyalar. Adımlar arasında nefes: arayüz donmaz.
  const tick = makeTick(6);
  backArt = await paintScene(backScene());
  await tick();
  frameArt = await paintScene(frameScene());
  await tick();
  creamArt = paintCream();
  await tick();
  aceArt = paintAce();
  await tick();
  for (const [i, s] of (['S', 'H', 'D', 'C'] as Suit[]).entries()) {
    suitArt[s] = paintSuit(SUIT_PATH![s], isRed(s), 500 + i, SUIT_TY[s]);
    await tick();
  }
  courtArt[13] = await paintCourt('K', 713);
  await tick();
  courtArt[12] = await paintCourt('Q', 712);
  await tick();
  courtArt[11] = await paintCourt('J', 711);
  await tick();
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
    const d = 0.74 * w;
    g.drawImage(aceArt!, cx - d / 2, cy - d / 2, d, d);
    const sz = 0.26 * w;
    g.save();
    g.translate(cx, cy);
    g.scale(sz, sz);
    g.lineJoin = 'round';
    g.lineWidth = 0.15;
    const gg = g.createLinearGradient(-0.5, -0.55, 0.5, 0.55);
    gg.addColorStop(0, '#f7e3a0');
    gg.addColorStop(0.5, '#c8963a');
    gg.addColorStop(1, '#f3d27a');
    g.strokeStyle = gg;
    g.stroke(SUIT_PATH[suit]);
    g.lineWidth = 0.08;
    g.strokeStyle = '#fbf3dc';
    g.stroke(SUIT_PATH[suit]);
    g.restore();
    const sd = sz / 0.84; // sprite kutusu (birim şekil SPR·0.84 px'e oturur)
    g.drawImage(suitArt[suit]!, cx - sd / 2, cy - sd / 2, sd, sd);
  } else if (rank >= 11) {
    const art = courtArt[rank];
    const dw = 0.53 * w, dh = (dw * CH) / CW;
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
    const capH = 0.15 * w;
    drawRank(g, LABEL(rank), cx, cy + SUIT_TY[suit] * sz - capH / 2, capH, (suit === 'D' ? 0.2 : 0.24) * w, '#fbf3dc');
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
  // içte ince altın fileto (paspartu çizgisi)
  const fi = 0.06 * w;
  const fillet = new Path2D();
  roundRect(fillet, fi, fi, w - 2 * fi, h - 2 * fi, 0.08 * w - fi * 0.8);
  g.lineWidth = Math.max(0.6, 0.007 * w);
  g.strokeStyle = 'rgba(246,214,120,0.7)';
  g.stroke(fillet);
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
