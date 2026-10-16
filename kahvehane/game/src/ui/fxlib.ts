// Pişti efekt tarifleri — oyunda (src/ui/fx.ts) ve market önizlemesinde (src/ui/fxpreview.ts) AYNI kod oynar.
// Premium oyun anı kurgusu: hazırlık (ışık toplanır) → vuruş (parlak hâle + şok halkası + kısa ekran ışığı + mercek
// parlaması) → sürme (farklı boy/derinlik/hızda parçacıklar: yerçekimi + sürtünme eğrileri, dönüş, göz kırpma) →
// zarif sönüş. Arkadan öne: hâle → ışınlar → kahraman nesne → kıvılcımlar → ön parıltılar. Her efektin kendi renk
// tonu var (gökkuşağı konfeti yok). Görseller src/ui/fxsprites.ts'te bir kez çizilir; burada yalnız transform/opacity.
// Kurallar: ≤ ~2 s, efekt başına ≤ ~40 düğüm, `low` = yarı parçacık ve ikincil katman yok.
import type {HudSounds} from './types';

export interface Pt {
  x: number;
  y: number;
}
export interface Stage {
  W: number;
  H: number;
  /** kısa kenar (px): bütün ölçüler bunun yüzdesi */
  M: number;
  low: boolean;
  /** Görsel düğüm (havuzdan ya da taze). w: taban genişlik (px), h yoksa görselin oranı; front: PİŞTİ yazısının önünde */
  node(key: string, w: number, h?: number, front?: boolean): HTMLElement | null;
  run(n: HTMLElement, kf: Keyframe[], o: KeyframeAnimationOptions): void;
  /** tam sahne renkli ışık (yalnız opaklık) */
  flash(color: string, peak: number, ms: number, delay?: number): void;
  /** sahneyi karart (gece) */
  night(peak: number, ms: number, delay?: number): void;
  sfx(ms: number, fn: (s: HudSounds) => void): void;
}

const R = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
/** konum + dönüş + ölçek */
const tr = (x: number, y: number, rot = 0, sx = 1, sy = sx): string =>
  `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
const OUT = 'cubic-bezier(.2,.7,.3,1)';

// ───────────────────────── yapı taşları ─────────────────────────
/** Işık hâlesi: s0 → s1 (tepe) → s2, söner */
function glow(s: Stage, at: Pt, key: string, base: number, t: number, dur: number, s0: number, s1: number, s2: number, a = 1, peakAt = 0.16): void {
  const n = s.node(key, base);
  if (!n) return;
  s.run(n, [
    {transform: tr(at.x, at.y, 0, s0), opacity: 0},
    {transform: tr(at.x, at.y, 0, s1), opacity: a, offset: peakAt},
    {transform: tr(at.x, at.y, 0, (s1 + s2) / 2), opacity: a * 0.55, offset: peakAt + (1 - peakAt) * 0.4},
    {transform: tr(at.x, at.y, 0, s2), opacity: 0},
  ], {duration: dur, delay: t, easing: OUT});
}
/** Şok halkası: küçükten dışa açılır, incelir; squash < 1 masa üstünde perspektif */
function shock(s: Stage, at: Pt, key: string, base: number, t: number, dur: number, s1: number, squash = 1, a = 1): void {
  const n = s.node(key, base);
  if (!n) return;
  s.run(n, [
    {transform: tr(at.x, at.y, 0, 0.12, 0.12 * squash), opacity: a},
    {transform: tr(at.x, at.y, 0, s1 * 0.55, s1 * 0.55 * squash), opacity: a * 0.85, offset: 0.35},
    {transform: tr(at.x, at.y, 0, s1, s1 * squash), opacity: 0},
  ], {duration: dur, delay: t, easing: 'cubic-bezier(.1,.6,.3,1)'});
}
/** Anamorfik mercek parlaması */
function flare(s: Stage, at: Pt, key: string, w: number, t: number, dur: number, a = 1): void {
  const n = s.node(key, w);
  if (!n) return;
  s.run(n, [
    {transform: tr(at.x, at.y, 0, 0.15, 0.4), opacity: 0},
    {transform: tr(at.x, at.y, 0, 1.15, 1), opacity: a, offset: 0.14},
    {transform: tr(at.x, at.y, 0, 1.5, 0.6), opacity: 0},
  ], {duration: dur, delay: t, easing: OUT});
}
/** Dönen tanrı ışınları */
function rays(s: Stage, at: Pt, key: string, base: number, t: number, dur: number, rot = 40, a = 0.9, sc = 1): void {
  if (s.low) return;
  const n = s.node(key, base);
  if (!n) return;
  const r0 = R(0, 360);
  s.run(n, [
    {transform: tr(at.x, at.y, r0, 0.5 * sc), opacity: 0},
    {transform: tr(at.x, at.y, r0 + rot * 0.25, 1 * sc), opacity: a, offset: 0.22},
    {transform: tr(at.x, at.y, r0 + rot * 0.7, 1.08 * sc), opacity: a * 0.7, offset: 0.65},
    {transform: tr(at.x, at.y, r0 + rot, 1.15 * sc), opacity: 0},
  ], {duration: dur, delay: t, easing: 'linear'});
}
/** Yıldız parıltısı: belirir (45° döner), söner */
function twinkle(s: Stage, x: number, y: number, key: string, base: number, t: number, dur = 520, sc = 1, front = true): void {
  const n = s.node(key, base, undefined, front);
  if (!n) return;
  const r0 = R(-20, 20);
  s.run(n, [
    {transform: tr(x, y, r0, 0), opacity: 0},
    {transform: tr(x, y, r0 + 30, sc), opacity: 1, offset: 0.3},
    {transform: tr(x, y, r0 + 75, 0), opacity: 0},
  ], {duration: dur, delay: t, easing: 'ease-out'});
}
/** Hazırlık: parıltılar dışarıdan merkeze toplanır */
function gather(s: Stage, at: Pt, key: string, n: number, base: number, rad: number, t: number, dur: number): void {
  if (s.low) return;
  for (let i = 0; i < n; i++) {
    const nd = s.node(key, base, undefined, true);
    if (!nd) return;
    const a = (i / n) * Math.PI * 2 + R(-0.3, 0.3), d = rad * R(0.8, 1.1);
    const x0 = at.x + Math.cos(a) * d, y0 = at.y + Math.sin(a) * d;
    s.run(nd, [
      {transform: tr(x0, y0, 0, 0.3), opacity: 0},
      {transform: tr((x0 + at.x) / 2, (y0 + at.y) / 2, 40, 0.8), opacity: 1, offset: 0.5},
      {transform: tr(at.x, at.y, 90, 0.2), opacity: 0.6},
    ], {duration: dur, delay: t + i * 18, easing: 'cubic-bezier(.5,0,.8,.4)'});
  }
}
/** Önceden çizilmiş kıvılcım demeti: hızla açılır (ease-out), hafifçe sarkar ve söner */
function cluster(s: Stage, at: Pt, key: string, base: number, t: number, dur: number, s1: number, droop: number, rot = R(0, 360)): void {
  const n = s.node(key, base, undefined, true);
  if (!n) return;
  s.run(n, [
    {transform: tr(at.x, at.y, rot, 0.15), opacity: 0},
    {transform: tr(at.x, at.y, rot + 4, s1 * 0.55), opacity: 1, offset: 0.08},
    {transform: tr(at.x, at.y + droop * 0.2, rot + 8, s1 * 0.85), opacity: 1, offset: 0.25},
    {transform: tr(at.x, at.y + droop * 0.55, rot + 11, s1 * 0.97), opacity: 0.75, offset: 0.55},
    {transform: tr(at.x, at.y + droop, rot + 14, s1), opacity: 0},
  ], {duration: dur, delay: t, easing: 'cubic-bezier(.15,.75,.35,1)'});
}
interface SparkOpts {
  n: number;
  keys: readonly string[];
  /** taban uzunluk (px) */
  len: number;
  /** uçuş mesafesi (px; sürtünmeyle durduğu yer) */
  dist: [number, number];
  /** açı aralığı (radyan; -π/2 yukarı) */
  ang: [number, number];
  /** son düşüş hızı (px/s; yerçekimi = fall · drag), sürtünme (1/s) */
  fall: number;
  drag: number;
  dur: [number, number];
  t: number;
  /** başlangıç yayılımı (px) */
  r0?: number;
  /** hız yönüne dönsün (kıvılcım) mı, kendi ekseninde dönsün (yaprak, kırık) mü */
  align?: boolean;
  spin?: number;
  /** ölçek (başta, sonda) */
  sc?: [number, number];
  front?: boolean;
  stagger?: number;
  /** 3B çevirme (yaprak) */
  flip?: boolean;
}
/** Balistik parçacıklar: doğrusal sürtünme + yerçekimi, 7 karelik eğri */
function sparks(s: Stage, at: Pt, o: SparkOpts): void {
  const n = s.low ? Math.ceil(o.n / 2) : o.n;
  for (let i = 0; i < n; i++) {
    const key = o.keys[i % o.keys.length];
    const nd = s.node(key, o.len, undefined, o.front);
    if (!nd) return;
    const a = R(o.ang[0], o.ang[1]), k = o.drag * R(0.85, 1.15), v = R(o.dist[0], o.dist[1]) * k, g = o.fall * k;
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v, D = R(o.dur[0], o.dur[1]);
    const r0 = o.r0 ?? 0, ox = at.x + Math.cos(a) * r0, oy = at.y + Math.sin(a) * r0;
    const [s0, s1] = o.sc ?? [1.2, 0.3];
    const sz = R(0.75, 1.2), spin = (o.spin ?? 0) * R(-1, 1), flip = R(180, 540) * (Math.random() < 0.5 ? -1 : 1);
    const kf: Keyframe[] = [];
    for (const q of [0, 0.07, 0.18, 0.34, 0.54, 0.76, 1]) {
      const T = (q * D) / 1000, e = Math.exp(-k * T);
      const x = ox + (vx / k) * (1 - e);
      const y = oy + ((vy + g / k) / k) * (1 - e) - (g / k) * T;
      const cvx = vx * e, cvy = (vy + g / k) * e - g / k;
      const rot = o.align ? (Math.atan2(cvy, cvx) * 180) / Math.PI : spin * q;
      const sc = (s0 + (s1 - s0) * q) * sz;
      let t = o.align ? tr(x, y, rot, sc * (0.55 + 0.45 * Math.min(1, Math.hypot(cvx, cvy) / (v * 0.6))), sc) : tr(x, y, rot, sc);
      if (o.flip) t += ` rotateX(${(flip * q).toFixed(0)}deg) rotateY(${(flip * 0.6 * q).toFixed(0)}deg)`;
      kf.push({transform: t, opacity: q === 0 ? 0 : q < 0.6 ? 1 : q === 1 ? 0 : 0.8, offset: q});
    }
    kf[1].opacity = 1;
    s.run(nd, kf, {duration: D, delay: o.t + i * (o.stagger ?? 6), easing: 'linear'});
  }
}

// ───────────────────────── efektler ─────────────────────────
/** Zafer Işığı (ücretsiz): altın ışık toplanır, PİŞTİ'nin ardında patlar; dev yıldız parıltısı, ışınlar, mercek
 * parlaması, yerçekimiyle süzülen kıvılcımlar ve yükselen altın zerreler. */
function klasik(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100;
  gather(s, at, 'glint:gold', 6, 10 * m, 34 * m, 0, 210);
  glow(s, at, 'bloom:gold', 34 * m, 0, 380, 0.2, 1.1, 0.7, 1, 0.55);
  const T = 200;
  s.flash('rgba(255,228,160,1)', jack ? 0.5 : 0.4, 360, T);
  rays(s, at, 'rays:gold', 96 * m, T - 20, 1450, 34, 1);
  glow(s, at, 'bloom:gold', 60 * m, T, 1000, 0.4, 2.0, 2.5, 1, 0.14);
  glow(s, at, 'bloom:white', 30 * m, T, 480, 0.3, 1.6, 1.9);
  shock(s, at, 'ring:gold', 44 * m, T, 650, 2.6);
  if (jack) shock(s, at, 'ring:gold', 44 * m, T + 170, 720, 3.3, 1, 0.8);
  flare(s, at, 'flare:gold', 100 * m, T, 700);
  cluster(s, at, 'burst:gold', 56 * m, T, 1100, 1, 6 * m);
  // dev kırınım yıldızı
  const st = s.node('glint:white', 44 * m, undefined, true);
  if (st)
    s.run(st, [
      {transform: tr(at.x, at.y, 0, 0.1), opacity: 0},
      {transform: tr(at.x, at.y, 10, jack ? 1.5 : 1.25), opacity: 1, offset: 0.16},
      {transform: tr(at.x, at.y, 22, 0.9), opacity: 0.85, offset: 0.45},
      {transform: tr(at.x, at.y, 40, 0.1), opacity: 0},
    ], {duration: 760, delay: T - 10, easing: OUT});
  sparks(s, at, {n: jack ? 18 : 15, keys: ['spark:gold', 'spark:gold', 'spark:white'], len: 14 * m, dist: [22 * m, 50 * m], ang: [-Math.PI * 0.97, -Math.PI * 0.03], fall: 34 * m, drag: 2.4, dur: [900, 1300], t: T, r0: 4 * m, align: true, front: true, stagger: 4});
  const nt = s.low ? 3 : jack ? 6 : 5;
  for (let i = 0; i < nt; i++) {
    const a = R(-Math.PI * 0.95, -Math.PI * 0.05), d = R(16, 40) * m;
    twinkle(s, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.85, i % 2 ? 'glint:white' : 'glint:gold', 15 * m, T + 160 + i * 150, 600, R(0.8, 1.2));
  }
  if (!s.low)
    for (let i = 0; i < 5; i++) {
      const n = s.node('dust:gold', 4 * m);
      if (!n) break;
      const x = at.x + R(-26, 26) * m, y = at.y + R(-6, 10) * m, up = R(20, 34) * m, sw = R(-5, 5) * m;
      s.run(n, [
        {transform: tr(x, y, 0, 0.4), opacity: 0},
        {transform: tr(x + sw * 0.5, y - up * 0.35, 0, 1), opacity: 1, offset: 0.3},
        {transform: tr(x - sw * 0.4, y - up * 0.75, 0, 0.9), opacity: 0.8, offset: 0.7},
        {transform: tr(x + sw, y - up, 0, 0.4), opacity: 0},
      ], {duration: R(1200, 1500), delay: T + 220 + i * 60, easing: 'ease-out'});
    }
  s.sfx(T, x => x.bonus());
  s.sfx(T + 260, x => x.starChime(2));
}

/** Altın Yağmuru: tepeden altın ışık hüzmesi iner, sikkeler yağar, masaya düşüp seker; iniş parıltıları. */
function altin(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100, W = s.W;
  const count = Math.round((jack ? 28 : 20) * (s.low ? 0.55 : 1));
  const span = jack ? 1000 : 700;
  if (!s.low) {
    const sh = s.node('shaft', 44 * m);
    if (sh) {
      const hgt = (44 * m * 512) / 128;
      s.run(sh, [
        {transform: tr(at.x, at.y - hgt * 0.42, 0, 0.6, 1), opacity: 0},
        {transform: tr(at.x, at.y - hgt * 0.42, 0, 1, 1), opacity: 0.8, offset: 0.25},
        {transform: tr(at.x, at.y - hgt * 0.42, 0, 1.15, 1), opacity: 0.55, offset: 0.7},
        {transform: tr(at.x, at.y - hgt * 0.42, 0, 1.3, 1), opacity: 0},
      ], {duration: 1700, easing: 'ease-out'});
    }
  }
  const land0 = 560;
  glow(s, at, 'bloom:gold', 46 * m, land0, 1000, 0.3, 1.6, 2.1, 0.85, 0.2);
  shock(s, at, 'ring:gold', 40 * m, land0, 700, 2.6, 0.42);
  s.flash('rgba(255,220,140,1)', jack ? 0.3 : 0.22, 320, land0);
  const u = m * 3.6;
  for (let i = 0; i < count; i++) {
    const c = s.node('coin', u * 1.85, u * 1.85, true);
    if (!c) break;
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
    const lx = at.x + Math.cos(a) * rr * W * 0.36, ly = at.y + Math.sin(a) * rr * s.M * 0.14 + u * 0.3;
    const x0 = lx + R(-W * 0.1, W * 0.1), y0 = -u * R(2, 6);
    const fall = R(520, 700), dur = fall + 700, f = fall / dur;
    const bounce = u * R(1.2, 2.6), sp = R(2, 5) * 360 * (Math.random() < 0.5 ? -1 : 1), s0 = R(0.85, 1.25);
    const P = (x: number, y: number, ry: number, sc: number): string => `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotateY(${ry.toFixed(0)}deg) scale(${sc.toFixed(2)})`;
    const delay = (i / count) * span + R(0, 60);
    s.run(c, [
      {transform: P(x0, y0, 0, s0), opacity: 1, offset: 0},
      {transform: P(x0 + (lx - x0) * 0.5, y0 + (ly - y0) * 0.3, sp * 0.4, s0), opacity: 1, offset: f * 0.55},
      {transform: P(lx, ly, sp, s0), opacity: 1, offset: f},
      {transform: P(lx + R(-6, 6), ly - bounce, sp + 180, s0), opacity: 1, offset: f + (1 - f) * 0.18},
      {transform: P(lx, ly, sp + 360, s0 * 0.95), opacity: 1, offset: f + (1 - f) * 0.34},
      {transform: P(lx, ly - bounce * 0.22, sp + 360, s0 * 0.95), opacity: 1, offset: f + (1 - f) * 0.44},
      {transform: P(lx, ly, sp + 360, s0 * 0.93), opacity: 1, offset: f + (1 - f) * 0.54},
      {transform: P(lx, ly + u * 0.3, sp + 360, s0 * 0.5), opacity: 0, offset: 1},
    ], {duration: dur, delay, easing: 'linear'});
    if (i % 4 === 0 && !s.low) twinkle(s, lx + u * 0.3, ly - u * 0.5, i % 8 ? 'glint:white' : 'glint:gold', 9 * m, delay + fall + 120, 480);
  }
  s.sfx(0, x => x.coinRain(Math.min(24, Math.round(count * 0.7)), span / 1000 + 0.5));
}

/** Havai Fişek: altın, gül ve gümüş fişekler yükselir; kuyruklu yıldız gibi sarkan ışık izleri, çatırtı, duman. */
function havai(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100, W = s.W, H = s.H;
  const shells = jack ? 3 : 2;
  const per = jack ? 6 : 8;
  const pals = jack ? ['gold', 'rose', 'silver'] : pick([['gold', 'rose'], ['gold', 'silver'], ['rose', 'gold']]);
  const xs = shells === 3 ? [0.27, 0.73, 0.5] : [0.33, 0.67];
  for (let i = 0; i < shells; i++) {
    const pal = pals[i % pals.length];
    const t0 = i * (jack ? 220 : 280);
    const bx = W * xs[i] + R(-4, 4) * m, by = Math.max(H * 0.12, at.y - (shells === 3 && i === 2 ? 40 : R(18, 30)) * m);
    const sx = bx + R(-8, 8) * m, sy = Math.min(H + 4 * m, at.y + 50 * m);
    const rise = 460;
    const rk = s.node(`comet:${pal}`, 22 * m);
    if (rk) {
      const ang = (Math.atan2(by - sy, bx - sx) * 180) / Math.PI;
      s.run(rk, [
        {transform: tr(sx, sy, ang, 0.6, 0.8), opacity: 0},
        {transform: tr((sx + bx) / 2, (sy + by) / 2 + (sy - by) * 0.08, ang, 1.3, 0.9), opacity: 1, offset: 0.3},
        {transform: tr(bx, by, ang, 0.7, 0.8), opacity: 0.9, offset: 0.92},
        {transform: tr(bx, by, ang, 0.2, 0.5), opacity: 0},
      ], {duration: rise, delay: t0, easing: 'cubic-bezier(.25,.6,.4,1)'});
    }
    s.sfx(t0, x => x.fireworkLaunch());
    const tb = t0 + rise - 30;
    s.sfx(tb, x => x.fireworkBurst(jack ? 1 : 0.85));
    if (i === 0) s.flash('rgba(255,236,200,1)', 0.22, 300, tb);
    glow(s, {x: bx, y: by}, `bloom:${pal}`, 50 * m, tb, 750, 0.2, 1.5, 2, 1, 0.1);
    cluster(s, {x: bx, y: by}, `burst:${pal}`, 78 * m, tb, 1400, 1, 10 * m);
    // patlama: hız yönüne dönük ışık izleri, ağır ağır sarkar
    const n = s.low ? Math.ceil(per / 2) : per;
    const off = R(0, 6.28);
    for (let j = 0; j < n; j++) {
      const nd = s.node(`comet:${pal}`, 19 * m, undefined, true);
      if (!nd) break;
      const a = off + (j / n) * Math.PI * 2 + R(-0.1, 0.1), k = 2.7, v = R(30, 40) * m * k, g = 14 * m * k, D = R(1050, 1300);
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      const kf: Keyframe[] = [];
      for (const q of [0, 0.05, 0.14, 0.28, 0.48, 0.72, 1]) {
        const T = (q * D) / 1000, e = Math.exp(-k * T);
        const x = bx + (vx / k) * (1 - e), y = by + ((vy + g / k) / k) * (1 - e) - (g / k) * T;
        const cvx = vx * e, cvy = (vy + g / k) * e - g / k;
        const sp = Math.hypot(cvx, cvy) / v;
        kf.push({transform: tr(x, y, (Math.atan2(cvy, cvx) * 180) / Math.PI, 0.45 + 1.05 * Math.min(1, sp * 1.5), 1.1 - q * 0.5), opacity: q === 0 ? 0 : q < 0.55 ? 1 : q === 1 ? 0 : 0.7, offset: q});
      }
      kf[1].opacity = 1;
      s.run(nd, kf, {duration: D, delay: tb, easing: 'linear'});
    }
    // çatırtı + duman
    if (!s.low) {
      for (let j = 0; j < 2; j++) {
        const a = R(0, 6.28), d = R(16, 28) * m;
        twinkle(s, bx + Math.cos(a) * d, by + Math.sin(a) * d + 5 * m, 'glint:white', 10 * m, tb + 520 + j * 130, 400, R(0.8, 1.1));
      }
      const sm = s.node('smoke', 40 * m);
      if (sm)
        s.run(sm, [
          {transform: tr(bx, by, 0, 0.4), opacity: 0},
          {transform: tr(bx, by + 2 * m, 20, 1), opacity: 0.5, offset: 0.25},
          {transform: tr(bx, by + 8 * m, 40, 1.5), opacity: 0},
        ], {duration: 1500, delay: tb + 80, easing: 'ease-out'});
    }
  }
}

/** Yıldız Yağmuru: ışık geceye kısılır, uzun kuyruklu göktaşları yığına iner; ortada kırınım yıldızı patlar. */
function yildiz(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100, W = s.W, H = s.H;
  s.night(0.85, jack ? 2000 : 1750);
  const n = s.low ? 3 : jack ? 9 : 7;
  const ang = 128, rad = (ang * Math.PI) / 180;
  const L = 72 * m;
  for (let i = 0; i < n; i++) {
    const t = 60 + i * (jack ? 80 : 95) + R(0, 40);
    const tx = at.x + R(-26, 26) * m, ty = at.y + R(-24, 6) * m;
    const dist = Math.hypot(W, H) * 0.75;
    const x0 = tx - Math.cos(rad) * dist, y0 = ty - Math.sin(rad) * dist;
    const nd = s.node('meteor', L);
    if (nd) {
      const D = R(430, 520);
      s.run(nd, [
        {transform: tr(x0, y0, ang, 0.6, 1), opacity: 0},
        {transform: tr(x0 + (tx - x0) * 0.2, y0 + (ty - y0) * 0.2, ang, 1.1, 1), opacity: 1, offset: 0.15},
        {transform: tr(tx - Math.cos(rad) * L * 0.4, ty - Math.sin(rad) * L * 0.4, ang, 1.2, 1), opacity: 1, offset: 0.9},
        {transform: tr(tx, ty, ang, 0.2, 0.6), opacity: 0},
      ], {duration: D, delay: t, easing: 'cubic-bezier(.45,0,.9,.6)'});
      twinkle(s, tx, ty, 'glint:white', 14 * m, t + D * 0.88, 560, R(0.8, 1.15));
    }
    if (i % 2 === 0) s.sfx(t, x => x.shootingStar());
    s.sfx(t + 420, x => x.starChime(i));
  }
  const T = 60 + n * (jack ? 80 : 95) + 330;
  rays(s, at, 'rays:white', 90 * m, T - 40, 1100, 26, 0.8);
  glow(s, at, 'bloom:blue', 44 * m, T - 60, 1000, 0.3, 1.8, 2.3, 0.95);
  shock(s, at, 'ring:blue', 40 * m, T, 650, 2.6);
  // büyük kırınım yıldızı
  const st = s.node('glint:white', 30 * m, undefined, true);
  if (st)
    s.run(st, [
      {transform: tr(at.x, at.y, 0, 0), opacity: 0},
      {transform: tr(at.x, at.y, 15, jack ? 1.6 : 1.35), opacity: 1, offset: 0.22},
      {transform: tr(at.x, at.y, 30, jack ? 1.3 : 1.1), opacity: 0.9, offset: 0.55},
      {transform: tr(at.x, at.y, 50, 0.2), opacity: 0},
    ], {duration: 900, delay: T - 40, easing: OUT});
  // yıldız tozu
  const nd = s.low ? 4 : 9;
  for (let i = 0; i < nd; i++) {
    const a = R(0, 6.28), d = R(10, 36) * m;
    twinkle(s, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.8, i % 3 ? 'glint:blue' : 'glint:white', 9 * m, T + 60 + i * 70, 560, R(0.7, 1.15));
  }
  s.sfx(T, x => x.bonus());
}

/** Şimşek: ekran kararır, gökten yığına gerçek yıldırım iner (çekirdek + mavi parıltı), çakma, arklar, kıvılcım. */
function simsek(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100, W = s.W;
  s.night(0.9, 1500);
  const bolts: [string, number, number][] = [['bolt1', at.x, 70]];
  if (!s.low) bolts.push(['bolt2', at.x + (Math.random() < 0.5 ? -1 : 1) * W * R(0.22, 0.3), 300]);
  if (jack) bolts.push(['bolt2', at.x - (bolts[1] ? bolts[1][1] - at.x : W * 0.25), 480]);
  bolts.forEach(([key, x, t], i) => {
    const hgt = Math.max(30 * m, at.y + (i ? -6 : 4) * m);
    const w = hgt / 4;
    const nd = s.node(key, w, hgt);
    if (!nd) return;
    const y = hgt / 2 - 2 * m, flip = i === 1 ? -1 : 1;
    const tf = (o: number) => ({transform: tr(x, y, 0, flip, 1), opacity: o});
    s.run(nd, [tf(0), {...tf(1), offset: 0.04}, {...tf(0.15), offset: 0.12}, {...tf(1), offset: 0.2}, {...tf(0.85), offset: 0.38}, {...tf(0.25), offset: 0.5}, {...tf(0.7), offset: 0.56}, tf(0)],
      {duration: 700, delay: t, easing: 'linear'});
    s.sfx(t + 20, x2 => x2.fireworkBurst(i ? 0.8 : 1.3));
  });
  const T = 95;
  s.flash('rgba(210,230,255,1)', 0.55, 520, T);
  glow(s, at, 'bloom:blue', 46 * m, T, 900, 0.3, 1.9, 2.4);
  glow(s, at, 'bloom:white', 20 * m, T, 420, 0.3, 1.5, 1.7);
  shock(s, at, 'ring:blue', 40 * m, T + 20, 520, 2.6, 0.55);
  if (jack) shock(s, at, 'ring:blue', 40 * m, T + 300, 560, 2.9, 0.55, 0.8);
  flare(s, at, 'flare:blue', 80 * m, T, 520);
  // yığının çevresinde çakan arklar
  const na = s.low ? 2 : 4;
  for (let i = 0; i < na; i++) {
    const nd = s.node('arc', 22 * m, undefined, true);
    if (!nd) break;
    const rot = (i / na) * 360 + R(-30, 30), sc = R(0.8, 1.2);
    const tf = (o: number, k = 1) => ({transform: tr(at.x, at.y, rot, sc * k), opacity: o});
    s.run(nd, [tf(0, 0.6), {...tf(1), offset: 0.1}, {...tf(0.1), offset: 0.22}, {...tf(1, 1.1), offset: 0.34}, {...tf(0, 1.2), offset: 0.5}, {...tf(0.8, 1.25), offset: 0.62}, tf(0, 1.3)],
      {duration: 620, delay: T + 30 + i * 70, easing: 'linear'});
  }
  sparks(s, at, {n: jack ? 18 : 14, keys: ['spark:blue'], len: 11 * m, dist: [14 * m, 34 * m], ang: [-Math.PI * 0.98, -Math.PI * 0.02], fall: 55 * m, drag: 2.8, dur: [600, 900], t: T + 20, r0: 2 * m, align: true, front: true});
  for (let i = 0; i < (s.low ? 2 : 4); i++) {
    const a = R(0, 6.28), d = R(8, 22) * m;
    twinkle(s, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 'glint:blue', 10 * m, T + 200 + i * 120, 420);
  }
  s.sfx(T + 200, x => x.sweep());
}

/** Lale Rüzgârı: gül ışığında boyalı bir lale açar, yaprakları rüzgâr girdabında savrulup süzülür; altın polen. */
function lale(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100;
  glow(s, at, 'bloom:rose', 34 * m, 0, 420, 0.2, 1, 0.7, 0.9, 0.55);
  const T = 170;
  s.flash('rgba(255,205,220,1)', 0.25, 380, T);
  rays(s, at, 'rays:rose', 90 * m, T, 1500, -30, 0.8);
  glow(s, at, 'bloom:rose', 50 * m, T, 1100, 0.3, 2, 2.5, 1, 0.14);
  shock(s, at, 'ring:rose', 42 * m, T + 300, 700, 2.6);
  // açan lale: büyür ve döner, sonra yaprakları salıverip söner
  const RS = 38 * m;
  const ro = s.node('rosette', RS);
  const OPEN = T + 320;
  if (ro)
    s.run(ro, [
      {transform: tr(at.x, at.y, -40, 0.15), opacity: 0},
      {transform: tr(at.x, at.y, -6, 1.12), opacity: 1, offset: 0.4},
      {transform: tr(at.x, at.y, 0, 1), opacity: 1, offset: 0.62},
      {transform: tr(at.x, at.y, 12, 1.35), opacity: 0},
    ], {duration: 520, delay: T, easing: OUT});
  const n = s.low ? 9 : jack ? 20 : 16;
  const keys = ['petal1', 'petal3', 'petal2'];
  for (let i = 0; i < n; i++) {
    const nd = s.node(keys[i % 3], 9 * m, undefined, i % 2 === 0);
    if (!nd) break;
    const a0 = (i / n) * Math.PI * 2 + R(-0.2, 0.2), r0 = RS * 0.32, rMax = R(26, 46) * m, lift = R(8, 22) * m, drop = R(20, 36) * m;
    const D = R(1250, 1600), sc = R(0.75, 1.2), rz = R(-160, 160), fl = R(200, 460);
    const kf: Keyframe[] = [];
    for (const q of [0, 0.08, 0.2, 0.36, 0.55, 0.78, 1]) {
      const e = 1 - Math.pow(1 - Math.min(1, q * 1.3), 2.2);
      const th = a0 + 1.9 * e;
      const r = r0 + (rMax - r0) * e;
      const x = at.x + Math.cos(th) * r;
      const y = at.y + Math.sin(th) * r * 0.6 - lift * Math.sin(Math.PI * Math.min(1, q * 1.4)) + drop * q * q;
      const face = (Math.atan2(Math.sin(th), Math.cos(th)) * 180) / Math.PI + 90;
      kf.push({transform: `${tr(x, y, face + rz * q, sc * (q === 0 ? 0.7 : 1))} rotateX(${(fl * q).toFixed(0)}deg) rotateY(${(fl * 0.5 * q).toFixed(0)}deg)`, opacity: q === 0 ? 0 : q < 0.72 ? 1 : q === 1 ? 0 : 0.8, offset: q});
    }
    kf[1].opacity = 1;
    s.run(nd, kf, {duration: D, delay: OPEN - 40 + i * 10, easing: 'linear'});
  }
  for (let i = 0; i < (s.low ? 3 : 6); i++) {
    const a = R(0, 6.28), d = R(10, 34) * m;
    twinkle(s, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.7, 'glint:gold', 11 * m, OPEN + 60 + i * 140, 520);
  }
  if (!s.low)
    for (let i = 0; i < 5; i++) {
      const nd = s.node('dust:gold', 3.4 * m);
      if (!nd) break;
      const x = at.x + R(-18, 18) * m, y = at.y + R(-4, 6) * m, up = R(16, 28) * m;
      s.run(nd, [{transform: tr(x, y, 0, 0.4), opacity: 0}, {transform: tr(x + R(-3, 3) * m, y - up * 0.5, 0, 1), opacity: 1, offset: 0.35}, {transform: tr(x + R(-5, 5) * m, y - up, 0, 0.4), opacity: 0}],
        {duration: R(1100, 1400), delay: OPEN + 100 + i * 80, easing: 'ease-out'});
    }
  s.sfx(0, x => x.swoosh());
  s.sfx(T + 160, x => x.starChime(1));
  s.sfx(OPEN, x => x.sweep());
  s.sfx(OPEN + 260, x => x.starChime(4));
}

/** Nazar Boncuğu: cam nazar madalyonu belirir, parıldar; çatlayıp cam kırıklarına ve boncuklara saçılır. */
function nazar(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100;
  const S = 32 * m;
  glow(s, at, 'bloom:blue', 40 * m, 0, 900, 0.3, 1.4, 1.2, 0.85, 0.3);
  const eye = s.node('eye', S);
  const TS = jack ? 760 : 660;
  if (eye)
    s.run(eye, [
      {transform: tr(at.x, at.y, -30, 0.1), opacity: 0, offset: 0},
      {transform: tr(at.x, at.y, 6, 1.12), opacity: 1, offset: 180 / (TS + 160)},
      {transform: tr(at.x, at.y, -2, 0.97), opacity: 1, offset: 280 / (TS + 160)},
      {transform: tr(at.x, at.y, 0, 1), opacity: 1, offset: 380 / (TS + 160)},
      {transform: tr(at.x, at.y, 0, 1.06), opacity: 1, offset: TS / (TS + 160)},
      {transform: tr(at.x, at.y, 0, 1.3), opacity: 0, offset: 1},
    ], {duration: TS + 160, easing: 'ease-out'});
  // camın üstünde gezinen ışık
  twinkle(s, at.x - S * 0.22, at.y - S * 0.24, 'glint:white', 14 * m, 320, 520, 1.1);
  // kırılma: camın üstünde beyaz parlama, sonra parçalanır
  glow(s, at, 'bloom:white', 26 * m, TS - 90, 260, 0.6, 1.3, 1.6, 1, 0.6);
  s.flash('rgba(200,225,255,1)', 0.4, 320, TS);
  glow(s, at, 'bloom:white', 22 * m, TS, 420, 0.4, 1.6, 2);
  shock(s, at, 'ring:blue', 40 * m, TS, 650, 2.8);
  sparks(s, at, {n: jack ? 16 : 12, keys: ['shard1', 'shard2'], len: 10 * m, dist: [14 * m, 32 * m], ang: [-Math.PI, Math.PI], fall: 40 * m, drag: 2.6, dur: [900, 1250], t: TS, r0: S * 0.25, spin: 720, sc: [1, 0.7], front: true, stagger: 3});
  sparks(s, at, {n: jack ? 10 : 8, keys: ['bead'], len: 8 * m, dist: [12 * m, 26 * m], ang: [-Math.PI, Math.PI], fall: 46 * m, drag: 2.4, dur: [1000, 1300], t: TS + 20, r0: S * 0.3, spin: 360, sc: [1, 0.85], front: true, stagger: 4});
  for (let i = 0; i < (s.low ? 2 : 4); i++) {
    const a = R(0, 6.28), d = R(12, 30) * m;
    twinkle(s, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 'glint:white', 10 * m, TS + 160 + i * 110, 480);
  }
  s.sfx(0, x => x.swoosh());
  s.sfx(330, x => x.starChime(3));
  s.sfx(TS, x => x.fireworkBurst(0.6));
  s.sfx(TS + 120, x => x.starChime(6));
}

/** Taç Giyme: tepeden altın ışık iner, mücevherli taç yığına oturur (şok dalgası, toz), mücevherler parlar. */
function tac(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100;
  const cw = 46 * m, chh = (cw * 320) / 400;
  const cy = at.y - 7 * m;
  if (!s.low) {
    const sh = s.node('shaft', 46 * m);
    if (sh) {
      const hgt = (46 * m * 512) / 128;
      s.run(sh, [
        {transform: tr(at.x, cy - hgt * 0.4, 0, 0.5, 1), opacity: 0},
        {transform: tr(at.x, cy - hgt * 0.4, 0, 1, 1), opacity: 0.85, offset: 0.2},
        {transform: tr(at.x, cy - hgt * 0.4, 0, 1.1, 1), opacity: 0.55, offset: 0.65},
        {transform: tr(at.x, cy - hgt * 0.4, 0, 1.2, 1), opacity: 0},
      ], {duration: 1800, easing: 'ease-out'});
    }
  }
  gather(s, {x: at.x, y: cy}, 'glint:gold', 4, 8 * m, 28 * m, 0, 260);
  const T = 470; // oturma anı
  rays(s, {x: at.x, y: cy - chh * 0.1}, 'rays:gold', 86 * m, T - 40, 1500, 30, 0.9);
  glow(s, {x: at.x, y: cy}, 'bloom:gold', 50 * m, T - 30, 1100, 0.3, 1.7, 2.1, 0.95, 0.14);
  const D = 1850;
  const cr = s.node('crown', cw);
  if (cr) {
    const o = (ms: number): number => ms / D;
    s.run(cr, [
      {transform: tr(at.x, cy - 34 * m, -6, 1.35), opacity: 0, offset: 0},
      {transform: tr(at.x, cy - 26 * m, -4, 1.28), opacity: 1, offset: o(120)},
      {transform: tr(at.x, cy, 0, 1.02, 0.93), opacity: 1, offset: o(T), easing: 'cubic-bezier(.3,1.6,.5,1)'},
      {transform: tr(at.x, cy - 1.5 * m, 0, 1, 1.02), opacity: 1, offset: o(T + 110)},
      {transform: tr(at.x, cy, 0, 1, 1), opacity: 1, offset: o(T + 220)},
      {transform: tr(at.x, cy - 2 * m, 0, 1.02), opacity: 1, offset: o(1450)},
      {transform: tr(at.x, cy - 6 * m, 0, 1.06), opacity: 0, offset: 1},
    ], {duration: D, easing: 'cubic-bezier(.55,0,.85,.4)'});
  }
  s.flash('rgba(255,226,160,1)', jack ? 0.35 : 0.26, 320, T);
  shock(s, {x: at.x, y: cy + chh * 0.36}, 'ring:gold', 44 * m, T, 700, 2.6, 0.38);
  if (jack) shock(s, {x: at.x, y: cy + chh * 0.36}, 'ring:gold', 44 * m, T + 160, 760, 3.2, 0.38, 0.75);
  // toz bulutları: tabandan iki yana
  if (!s.low)
    for (let i = 0; i < 4; i++) {
      const sm = s.node('smoke', 22 * m);
      if (!sm) break;
      const dir = i % 2 ? 1 : -1, x = at.x + dir * R(4, 10) * m, y = cy + chh * 0.34;
      s.run(sm, [
        {transform: tr(x, y, 0, 0.3, 0.2), opacity: 0},
        {transform: tr(x + dir * 9 * m, y - 1 * m, dir * 20, 1, 0.6), opacity: 0.7, offset: 0.25},
        {transform: tr(x + dir * R(18, 26) * m, y - 3 * m, dir * 40, 1.6, 0.9), opacity: 0},
      ], {duration: R(900, 1150), delay: T + i * 30, easing: 'ease-out'});
    }
  sparks(s, {x: at.x, y: cy - chh * 0.2}, {n: jack ? 16 : 12, keys: ['spark:gold'], len: 12 * m, dist: [18 * m, 38 * m], ang: [-Math.PI * 0.92, -Math.PI * 0.08], fall: 30 * m, drag: 2.4, dur: [800, 1150], t: T, r0: 6 * m, align: true, front: true});
  // mücevher parıltıları (taç görselindeki taş konumları)
  const gems: [number, number, string][] = [[0, 0.24, 'glint:rose'], [-0.2, 0.22, 'glint:blue'], [0.2, 0.22, 'glint:blue'], [0, -0.2, 'glint:rose'], [-0.42, -0.26, 'glint:white'], [0.42, -0.26, 'glint:white']];
  gems.slice(0, s.low ? 3 : 6).forEach(([gx, gy, key], i) => twinkle(s, at.x + gx * cw, cy + gy * chh, key, 11 * m, T + 160 + i * 140, 520, R(0.9, 1.2)));
  s.sfx(0, x => x.swoosh());
  s.sfx(T, x => x.fireworkBurst(1.25));
  s.sfx(T + 140, x => x.bonus());
  s.sfx(T + 420, x => x.starChime(5));
}

/** Kozmik Girdap: mor-camgöbeği girdap diski döner, ışık izleri sarmal çizerek merkeze çekilir; çöker ve patlar. */
function girdap(s: Stage, at: Pt, jack: boolean): void {
  const m = s.M / 100;
  const TI = 900; // çöküş
  const disc = s.node('disc', 64 * m);
  if (disc)
    s.run(disc, [
      {transform: tr(at.x, at.y, 0, 1.4, 1.05), opacity: 0},
      {transform: tr(at.x, at.y, 160, 1.25, 0.92), opacity: 0.95, offset: 0.3},
      {transform: tr(at.x, at.y, 420, 0.9, 0.68), opacity: 1, offset: 0.75},
      {transform: tr(at.x, at.y, 600, 0.06, 0.05), opacity: 0},
    ], {duration: TI + 60, easing: 'cubic-bezier(.45,0,.75,.5)'});
  const n = s.low ? 7 : jack ? 14 : 12;
  const keys = ['spark:violet', 'spark:cyan', 'spark:violet', 'spark:gold'];
  const maxR = Math.max(s.W, s.H) * 0.48;
  for (let i = 0; i < n; i++) {
    const nd = s.node(keys[i % 4], 11 * m, undefined, true);
    if (!nd) break;
    const R0 = maxR * R(0.55, 1), a0 = R(0, Math.PI * 2), turns = Math.PI * 1.8;
    const pos = (e: number): [number, number] => {
      const r = R0 * Math.pow(1 - e, 1.5), th = a0 + turns * Math.pow(e, 0.75);
      return [at.x + Math.cos(th) * r, at.y + Math.sin(th) * r * 0.62];
    };
    const kf: Keyframe[] = [];
    for (const q of [0, 0.2, 0.4, 0.6, 0.8, 0.94, 1]) {
      const [x, y] = pos(q), [x2, y2] = pos(Math.min(1, q + 0.03));
      kf.push({transform: tr(x, y, (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI, 1.4 - q * 0.9, 1 - q * 0.4), opacity: q === 0 ? 0 : q === 1 ? 0 : 1, offset: q});
    }
    const D = R(620, 780);
    s.run(nd, kf, {duration: D, delay: TI - D - R(0, 60), easing: 'cubic-bezier(.4,0,.85,.55)'});
  }
  // patlama
  const T = TI;
  s.flash('rgba(225,200,255,1)', jack ? 0.45 : 0.35, 360, T);
  glow(s, at, 'bloom:violet', 56 * m, T, 1000, 0.2, 2.2, 2.8, 1, 0.12);
  glow(s, at, 'bloom:white', 30 * m, T, 520, 0.2, 1.7, 2.1);
  shock(s, at, 'ring:violet', 42 * m, T, 650, 2.9);
  if (jack) shock(s, at, 'ring:violet', 42 * m, T + 150, 700, 3.4, 0.7, 0.8);
  flare(s, at, 'flare:violet', 100 * m, T, 700);
  cluster(s, at, 'burst:violet', 70 * m, T, 1000, 1, 3 * m);
  if (!s.low) cluster(s, at, 'burst:cyan', 50 * m, T + 40, 900, 1, 2 * m);
  sparks(s, at, {n: jack ? 10 : 8, keys: ['spark:cyan', 'spark:gold', 'spark:violet'], len: 13 * m, dist: [22 * m, 44 * m], ang: [-Math.PI, Math.PI], fall: 6 * m, drag: 3, dur: [650, 950], t: T, r0: 2 * m, align: true, front: true, stagger: 2});
  for (let i = 0; i < (s.low ? 2 : 4); i++) {
    const a = R(0, 6.28), d = R(10, 28) * m;
    twinkle(s, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.7, 'glint:white', 10 * m, T + 160 + i * 100, 480);
  }
  s.sfx(0, x => x.swoosh());
  s.sfx(T, x => x.bonus());
  s.sfx(T + 80, x => x.fireworkBurst(1));
}

export const FX: Record<string, (s: Stage, at: Pt, jack: boolean) => void> = {klasik, altin, havai, yildiz, simsek, lale, nazar, tac, girdap};
/** Efektin toplam süresi (ms; önizleme döngüsü / temizlik için) */
export const FX_MS: Record<string, number> = {klasik: 1700, altin: 2100, havai: 1950, yildiz: 2000, simsek: 1500, lale: 1950, nazar: 2000, tac: 1900, girdap: 1800};
/** Donmuş küçük resim için en güzel an (ms) */
export const FX_STILL: Record<string, number> = {klasik: 420, altin: 1000, havai: 1060, yildiz: 1220, simsek: 300, lale: 470, nazar: 470, tac: 760, girdap: 620};
