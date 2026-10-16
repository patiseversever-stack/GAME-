// Masa "Kapadokya Şafağı" — yağlı boya: şafakta Kapadokya. Üst bölümde (rakibin arkasında) yumuşak sıcak gök ve
// boya lekesi gibi balonlar; ufukta ışığı yandan alan peri bacaları (çizilmez, boyanır: dikey darbeler); masanın
// kalanı vadi tabanı: sıcak gül-kahve tonlarında, düşük kontrastlı, sakin geniş darbeler (kartlar öne çıkar).
// Elin arkası en koyu (koyu erik). Kartların durduğu bölgeler src/themes/oil.ts tableCalm ile bastırılır.
import {smallBalloon} from '../skins/kapadokya';
import {due, runJob, type Job} from '../skins/kit';
import {canvasWeave, idAt, lightDabs, makeIdMap, makeRef, Oil, paintLayer, tableCalm, type Ref} from './oil';
import {clamp, makeCanvas, mix, mulberry, radial, resScale, smooth, spotOf, type Ctx} from './paint';

/** Arka sırt: ufukta yumuşak, gül rengi tepe çizgisi */
function ridge(r: Ctx, by: number, h: number): void {
  const W = r.canvas.width / r.getTransform().a;
  r.fillStyle = '#b8707a';
  r.beginPath();
  r.moveTo(-10, by + h);
  for (let x = -10; x <= W + 10; x += 6) r.lineTo(x, by - h * (0.5 + 0.5 * Math.sin(x * 0.02) * Math.sin(x * 0.007 + 1)));
  r.lineTo(W + 10, by + h);
  r.fill();
}
/** Peri bacası kümesi (eskiz): ince uzun koni, solu güneşe dönük açık şeftali, sağı gölgede leylak-kahve, koyu bazalt şapka */
function fairy(r: Ctx, rnd: () => number, x0: number, x1: number, by: number, h: number, w: number, fade = 1, idCol?: string): void {
  r.save();
  r.globalAlpha = fade;
  let x = x0;
  while (x < x1) {
    const hh = h * (0.55 + rnd() * 0.45), ww = w * (0.75 + rnd() * 0.4), top = by - hh, neck = ww * 0.36;
    const body = new Path2D();
    body.moveTo(x - ww, by);
    body.bezierCurveTo(x - ww * 0.7, by - hh * 0.35, x - neck * 1.3, top + hh * 0.3, x - neck, top + ww * 0.1);
    body.lineTo(x + neck, top + ww * 0.1);
    body.bezierCurveTo(x + neck * 1.3, top + hh * 0.3, x + ww * 0.7, by - hh * 0.35, x + ww, by);
    body.closePath();
    if (idCol) {
      r.fillStyle = idCol;
      r.fill(body);
      r.beginPath();
      r.ellipse(x, top + ww * 0.12, neck * 1.75, ww * 0.3, 0, Math.PI, 0);
      r.fill();
      x += ww * (1.7 + rnd() * 1.1);
      continue;
    }
    const gr = r.createLinearGradient(x - ww, 0, x + ww, 0);
    gr.addColorStop(0, '#ffd6a8');
    gr.addColorStop(0.42, '#e8a07e');
    gr.addColorStop(0.62, '#a8607a');
    gr.addColorStop(1, '#6a3a5a');
    r.fillStyle = gr;
    r.fill(body);
    r.fillStyle = '#3e2034';
    r.beginPath();
    r.ellipse(x, top + ww * 0.12, neck * 1.75, ww * 0.3, 0, Math.PI, 0);
    r.lineTo(x + neck * 1.75, top + ww * 0.2);
    r.lineTo(x - neck * 1.75, top + ww * 0.2);
    r.fill();
    // sağ kenarda koyu gölge çizgisi (biçim okunur kalsın)
    r.strokeStyle = 'rgba(60,24,50,.55)';
    r.lineWidth = ww * 0.12;
    r.beginPath();
    r.moveTo(x + neck * 0.9, top + ww * 0.25);
    r.bezierCurveTo(x + neck * 1.3, top + hh * 0.35, x + ww * 0.65, by - hh * 0.35, x + ww * 0.95, by);
    r.stroke();
    if (rnd() < 0.7) {
      r.fillStyle = '#4a2440';
      for (let k = 0; k < 2; k++) {
        r.beginPath();
        r.ellipse(x + (rnd() - 0.3) * ww * 0.6, by - hh * (0.2 + rnd() * 0.35), ww * 0.08, ww * 0.12, 0, 0, Math.PI * 2);
        r.fill();
      }
    }
    x += ww * (1.7 + rnd() * 1.1);
  }
  r.restore();
}

function* paint(w: number, h: number, dpr: number): Job<HTMLCanvasElement> {
  const k = resScale(w, h, dpr, 1.35, 900_000);
  const [cv, g] = makeCanvas(w * k, h * k);
  g.scale(k, k);
  const W = w, H = h;
  const S = spotOf(W, H);
  const U = clamp(Math.sqrt((W * H) / (390 * 844)), 0.75, 2.4);
  const rnd = mulberry(0xca7a);
  const hz = H * 0.29; // ufuk (peri bacalarının tabanı)
  const M = Math.min(W, H * 0.5);
  const sun = {x: W * 0.72, y: hz - H * 0.03, r: M * 0.06};
  const calm = tableCalm(W, H);
  const balloons: [number, number, number, string[]][] = [
    [0.13, 0.085, 0.085, ['#d8364a', '#f2c14e']],
    [0.86, 0.17, 0.06, ['#3a76c8', '#f4ead8']],
    [0.31, 0.04, 0.04, ['#7a3fa8', '#f0a43c']],
    [0.66, 0.035, 0.035, ['#2a9a6a', '#f2e6c0']],
    [0.95, 0.06, 0.03, ['#e86a2a', '#3a2a7a']],
    [0.05, 0.2, 0.03, ['#e04a7a', '#fff1e0']],
    [0.42, 0.155, 0.022, ['#c83a3a', '#f8d070']],
    [0.57, 0.2, 0.018, ['#3a6ac8', '#ffffff']],
    [0.76, 0.24, 0.016, ['#d8a020', '#7a2a5a']],
  ];

  // ── referans eskiz ──
  const sketch = (r: Ctx): void => {
    const sky = r.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#2e3478');
    sky.addColorStop(0.3, '#5a4a92');
    sky.addColorStop(0.58, '#b0648c');
    sky.addColorStop(0.82, '#ee9a74');
    sky.addColorStop(1, '#ffd08a');
    r.fillStyle = sky;
    r.fillRect(0, 0, W, hz + 4);
    // yumuşak bulut şeritleri (gülkurusu, şeftali)
    const cr = mulberry(12);
    for (let i = 0; i < 9; i++) {
      const y = hz * (0.18 + cr() * 0.72), x = cr() * W, L = W * (0.25 + cr() * 0.4);
      r.fillStyle = `rgba(${cr() < 0.5 ? '255,190,170' : '255,214,170'},${0.25 + cr() * 0.25})`;
      r.beginPath();
      r.ellipse(x, y, L, H * (0.006 + cr() * 0.008), 0, 0, Math.PI * 2);
      r.fill();
    }
    radial(r, sun.x, sun.y, 0, sun.r * 6, [[0, 'rgba(255,246,200,.95)'], [0.2, 'rgba(255,214,140,.6)'], [1, 'rgba(255,170,120,0)']]);
    r.fillStyle = '#fff4cc';
    r.beginPath();
    r.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
    r.fill();
    // balonlar (uzaktakiler sise karışır)
    for (const [x, y, s, cols] of balloons) smallBalloon(r, W * x, H * y, M * s * 1.6, cols, s < 0.03 ? 0.3 : 0, [236, 150, 160]);
    // vadi tabanı: sıcak gül-kahve → koyu erik
    const val = r.createLinearGradient(0, hz, 0, H);
    val.addColorStop(0, '#a4606a');
    val.addColorStop(0.12, '#7c4658');
    val.addColorStop(0.5, '#5a3248');
    val.addColorStop(1, '#2e1a2c');
    r.fillStyle = val;
    r.fillRect(0, hz, W, H - hz);
    // vadi: yumuşak tepe/tarla bantları (düşük kontrast)
    const vr = mulberry(5);
    for (let y = hz + H * 0.02; y < H; y += H * 0.022) {
      const t = (y - hz) / (H - hz);
      r.strokeStyle = `rgba(${vr() < 0.5 ? '150,90,96' : '110,66,84'},${0.45 - t * 0.3})`;
      r.lineWidth = H * (0.006 + vr() * 0.006);
      r.beginPath();
      const ph = vr() * 6, amp = H * (0.008 + vr() * 0.01);
      for (let x = -10; x <= W + 10; x += 8) r.lineTo(x, y + Math.sin(x * 0.015 + ph) * amp);
      r.stroke();
    }
    // peri bacaları: kenarlarda iri kümeler (köşe ilgisi), ortada alçak ve soluk; ışık soldan (şafak)
    ridge(r, hz + H * 0.012, H * 0.03);
    fairy(r, mulberry(91), -W * 0.02, W * 0.34, hz + H * 0.03, H * 0.15, W * 0.065);
    fairy(r, mulberry(92), W * 0.66, W * 1.02, hz + H * 0.03, H * 0.14, W * 0.065);
    fairy(r, vr, W * 0.3, W * 0.7, hz + H * 0.02, H * 0.05, W * 0.03, 0.55);
    // güneş ışığının vadiye düşen sıcak yansıması (ufka yakın, yığına varmadan söner)
    radial(r, sun.x, hz + H * 0.02, 0, W * 0.4, [[0, 'rgba(255,190,130,.35)'], [1, 'rgba(255,190,130,0)']], 1.6, 0.4);
  };
  const ref: Ref = makeRef(W, H, 0.5, sketch, calm, [70, 40, 62], 0.45);
  if (due()) yield;

  // ── nesne kimlikleri: balon (1..), peri bacası (200), gök (0), vadi (100) ──
  const ids = makeIdMap(W, H, 0.5, (r, id) => {
    r.fillStyle = id(100);
    r.fillRect(0, hz, W, H - hz);
    fairy(r, mulberry(91), -W * 0.02, W * 0.34, hz + H * 0.03, H * 0.15, W * 0.065, 1, id(200));
    fairy(r, mulberry(92), W * 0.66, W * 1.02, hz + H * 0.03, H * 0.14, W * 0.065, 1, id(200));
    balloons.forEach(([x, y, s2], i) => {
      const R = M * s2 * 1.6;
      r.fillStyle = id(1 + i);
      r.beginPath();
      r.ellipse(W * x, H * y - R * 0.06, R * 0.58, R * 0.66, 0, 0, Math.PI * 2);
      r.fill();
    });
  });
  // ── akış: gökte yatay (izlenimci), güneş çevresinde dönen; balonda meridyen; bacada dikey; vadide tepe eğrisi ──
  const field = (x: number, y: number): number => {
    const id = idAt(ids, x, y);
    if (id >= 1 && id <= balloons.length) {
      const [bx, by, bs] = balloons[id - 1], R = M * bs * 1.6;
      const u = (x - W * bx) / (R * 0.58), v = (y - H * by) / (R * 0.66);
      return Math.atan2(1, -u * v * 0.9); // üstte ve altta birleşen meridyenler
    }
    if (id === 200) return -Math.PI / 2 + 0.12 * Math.sin(x * 0.3);
    if (id === 100 || y > hz) return 0.12 * Math.sin(x * 0.015 / U + y * 0.03 / U);
    let vx = 1, vy = 0.18 * Math.sin(x * 0.018 / U + y * 0.04 / U);
    const dx = x - sun.x, dy = y - sun.y, d2 = dx * dx + dy * dy, R = sun.r * 3;
    if (d2 < R * R * 4) {
      const d = Math.sqrt(d2) + 1e-3, kk = 2.4 * Math.exp(-d2 / (R * R));
      vx += (kk * -dy) / d;
      vy += (kk * dx) / d;
    }
    return Math.atan2(vy, vx);
  };
  /** küçük nesnelerde kısa darbe */
  const sizeK = (x: number, y: number): number => {
    const id = idAt(ids, x, y);
    if (id >= 1 && id <= balloons.length) return clamp(balloons[id - 1][2] * 7, 0.3, 0.75);
    if (id === 200) return 0.7;
    return 1;
  };
  const interest = (x: number, y: number): number => clamp((1 - smooth(hz + H * 0.02, hz + H * 0.09, y)) * (1 - calm(x, y)), 0, 1);

  g.fillStyle = '#6a3c58';
  g.fillRect(0, 0, W, H);
  yield* paintLayer(g, ref, rnd, W, H, {cell: 9 * U, len: [18 * U, 30 * U], width: [7 * U, 10 * U], field, edge: 0.25, jitter: 9, relief: 0.06, calm, sizeK});
  yield* paintLayer(g, ref, rnd, W, H, {cell: 5.6 * U, len: [11 * U, 20 * U], width: [3.8 * U, 5.6 * U], field, edge: 0.45, jitter: 18, relief: 0.17, bristle: 0.45, calm, sizeK,
    tint: (c, x, y, r) => (r() < 0.08 ? mix(c, y < hz ? [255, 214, 190] : [150, 96, 120], 0.3) : c)});
  yield* paintLayer(g, ref, rnd, W, H, {cell: 3 * U, len: [5 * U, 10 * U], width: [1.8 * U, 2.8 * U], field, edge: 0.5, jitter: 12, relief: 0.22, where: interest, calm, sizeK});

  // ── ışık: güneş çevresi, balonların ışıklı yanları, bacaların güneşe bakan kenarları ──
  const dabs = new Oil();
  for (let i = 0; i < 26; i++) {
    const rr = sun.r * Math.sqrt(rnd()) * 0.9, a = rnd() * Math.PI * 2, x = sun.x + Math.cos(a) * rr, y = sun.y + Math.sin(a) * rr;
    dabs.add([x - 3 * U, y, x + 3 * U, y + (rnd() - 0.5) * U], (2.4 + rnd() * 1.4) * U, rnd() < 0.5 ? [255, 250, 226] : [255, 236, 180], 0.2);
  }
  lightDabs(dabs, ref, rnd, 0, 0, W, hz + H * 0.06, 205, 2.2 * U, calm);
  dabs.flush(g);
  if (due()) yield;

  canvasWeave(g, W, H, rnd, 0.1);
  radial(g, S.px, S.py, 0, S.ringR * 2.3, [[0, 'rgba(30,10,30,.38)'], [0.55, 'rgba(30,10,30,.2)'], [1, 'rgba(30,10,30,0)']]);
  const gb = g.createLinearGradient(0, H * 0.72, 0, H);
  gb.addColorStop(0, 'rgba(20,8,20,0)');
  gb.addColorStop(1, 'rgba(20,8,20,.5)');
  g.fillStyle = gb;
  g.fillRect(0, H * 0.72, W, H * 0.28);
  radial(g, W / 2, H / 2, Math.min(W, H) * 0.55, Math.max(W, H) * 0.8, [[0, 'rgba(16,6,20,0)'], [1, 'rgba(16,6,20,.4)']]);
  return cv;
}

export const paintKapadokya = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
