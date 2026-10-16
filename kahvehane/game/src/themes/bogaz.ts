// Masa "Boğaz Gecesi" — yağlı boya (izlenimci, Van Gogh ailesi): gece Boğaz'ı, kalın kırık darbelerle.
// Üstte (rakibin arkasında) girdaplı gece göğü, sağ üstte ay ve haleli ışığı; ufukta Galata, yalılar ve ışıklı köprü.
// Masanın büyük bölümü koyu, sakin su: yatay darbeler; ay ışığı ve şehir ışıkları kırık altın/renkli darbelerle yansır
// ve yığına varmadan söner. Kartların durduğu yerler (src/themes/oil.ts tableCalm) değer/doygunluk olarak bastırılır.
import {due, runJob, type Job} from '../skins/kit';
import {bridge, galataTower, yalilar} from './scenes';
import {canvasWeave, idAt, lightDabs, makeIdMap, makeRefJ, Oil, paintLayer, tableCalm, type Ref} from './oil';
import {clamp, makeCanvas, mix, mulberry, radial, resScale, smooth, spotOf, type Ctx, type RGB} from './paint';

function* paint(w: number, h: number, dpr: number): Job<HTMLCanvasElement> {
  const k = resScale(w, h, dpr, 1.35, 900_000);
  const [cv, g] = makeCanvas(w * k, h * k);
  g.scale(k, k);
  const W = w, H = h;
  const S = spotOf(W, H);
  const U = clamp(Math.sqrt((W * H) / (390 * 844)), 0.75, 2.4);
  const rnd = mulberry(0xb05f0);
  const hz = H * 0.255; // ufuk
  const M = Math.min(W, H * 0.5);
  const moon = {x: W * 0.83, y: H * 0.075, r: M * 0.075};
  const calm = tableCalm(W, H);
  const tx = W * 0.16, th = H * 0.19, tby = hz + 2, tbw = th * 0.125;

  // ── referans eskiz (küçük tuval): gök, ay, siluetler, su, yansımalar ──
  const sketch = (r: Ctx): void => {
    const sky = r.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#0a1036');
    sky.addColorStop(0.55, '#1a2a78');
    sky.addColorStop(0.85, '#3a3c92');
    sky.addColorStop(1, '#6a4c8e');
    r.fillStyle = sky;
    r.fillRect(0, 0, W, hz + 2);
    // gökte açık mavi girdap kolları (Van Gogh)
    for (let i = 0; i < 5; i++) {
      const y = hz * (0.25 + i * 0.15), a = 0.22 + 0.1 * (i % 2);
      r.strokeStyle = `rgba(${i % 2 ? '130,170,235' : '96,140,220'},${a * 2})`;
      r.lineWidth = H * 0.016;
      r.beginPath();
      for (let x = -10; x <= W + 10; x += 6) r.lineTo(x, y + Math.sin(x * 0.02 + i) * H * 0.012);
      r.stroke();
    }
    // ay halesi + ay
    radial(r, moon.x, moon.y, 0, moon.r * 4.2, [[0, 'rgba(255,236,170,.95)'], [0.25, 'rgba(250,214,120,.55)'], [0.55, 'rgba(150,170,220,.25)'], [1, 'rgba(120,150,220,0)']]);
    r.fillStyle = '#fff5cf';
    r.beginPath();
    r.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
    r.fill();
    // yıldızlar
    for (const [x, y, s] of [[0.1, 0.06, 1], [0.27, 0.035, 0.7], [0.62, 0.05, 0.8], [0.4, 0.13, 0.6], [0.94, 0.17, 0.7], [0.07, 0.16, 0.6]] as const) {
      radial(r, W * x, H * y, 0, M * 0.04 * s, [[0, 'rgba(255,246,200,.95)'], [0.4, 'rgba(250,230,150,.4)'], [1, 'rgba(200,210,255,0)']]);
    }
    // şehir parıltısı ufukta
    radial(r, W * 0.25, hz, 0, W * 0.5, [[0, 'rgba(230,140,110,.35)'], [1, 'rgba(230,140,110,0)']], 1.4, 0.35);
    // su
    const sea = r.createLinearGradient(0, hz, 0, H);
    sea.addColorStop(0, '#24307a');
    sea.addColorStop(0.18, '#18205c');
    sea.addColorStop(0.55, '#0e1440');
    sea.addColorStop(1, '#070a24');
    r.fillStyle = sea;
    r.fillRect(0, hz, W, H - hz);
    const wr = mulberry(31);
    for (let y = hz + 4; y < H; y += H * 0.012) {
      const t = (y - hz) / (H - hz);
      const cols = ['58,74,160', '40,48,120', '70,58,140', '30,90,120', '50,66,150'];
      r.strokeStyle = `rgba(${cols[Math.floor(wr() * cols.length)]},${0.55 - t * 0.35})`;
      r.lineWidth = H * (0.004 + wr() * 0.005);
      r.beginPath();
      const ph = wr() * 6;
      for (let x = -10; x <= W + 10; x += 8) r.lineTo(x, y + Math.sin(x * 0.03 + ph) * H * 0.003);
      r.stroke();
    }
    // ay yansıması: kırık altın sütun (yığına varmadan söner)
    const rr = mulberry(77);
    for (let y = hz + 2; y < H * 0.55; y += 3) {
      const t = (y - hz) / (H * 0.55 - hz);
      const half = W * (0.035 + t * 0.06);
      for (let n = 0; n < 2; n++) {
        const x = moon.x + (rr() - 0.5) * half * 2;
        r.fillStyle = `rgba(255,${222 - t * 40},${150 - t * 50},${(0.75 - t * 0.7) * (0.4 + rr() * 0.6)})`;
        r.fillRect(x - half * 0.35, y, half * (0.3 + rr() * 0.6), 2.2);
      }
    }
    // şehir ışıklarının yansıması (sıcak, kısa)
    for (const [x0, len, col] of [[0.17, 0.12, '255,200,120'], [0.32, 0.07, '255,190,110'], [0.55, 0.06, '255,120,190'], [0.7, 0.06, '120,210,255']] as const) {
      for (let y = hz + 2; y < hz + H * len; y += 3) {
        const t = (y - hz) / (H * len);
        r.fillStyle = `rgba(${col},${(0.7 - t * 0.65) * (0.4 + rr() * 0.6)})`;
        r.fillRect(W * x0 + (rr() - 0.5) * W * 0.05, y, W * (0.01 + rr() * 0.03), 2);
      }
    }
    // ufuk siluetleri: uzak kıyı, köprü, yalılar, Galata
    yalilar(r, -10, W + 10, hz - H * 0.002, H * 0.016, '#2a2c6c', rr, 0.35);
    bridge(r, W * 0.42, W * 1.25, hz - H * 0.028, H * 0.075, '#1b1c52', true, rr);
    yalilar(r, -10, W * 0.5, hz + 1, H * 0.024, '#080a24', rr, 0.6);
    radial(r, W * 0.16, hz - H * 0.07, 0, H * 0.12, [[0, 'rgba(255,190,110,.35)'], [1, 'rgba(255,190,110,0)']]);
    galataTower(r, tx, tby, th);
  };
  const ref: Ref = yield* makeRefJ(W, H, 0.5, sketch, calm, [18, 24, 72], 0.42);
  if (due()) yield;

  // ── kule: kendi darbe yönü (gövdede dikey taş, külahta tepeye doğru) ──
  const ids = makeIdMap(W, H, 0.5, (r, id) => {
    const top = tby - th * 0.6, gy = top - th * 0.1;
    r.fillStyle = id(1);
    r.fillRect(tx - tbw * 1.12, gy, tbw * 2.24, tby - gy);
    r.fillStyle = id(2);
    r.beginPath();
    r.moveTo(tx - tbw * 1.1, gy + 1);
    r.lineTo(tx, gy - th * 0.3);
    r.lineTo(tx + tbw * 1.1, gy + 1);
    r.fill();
  });
  const sizeK = (x: number, y: number): number => (idAt(ids, x, y) ? 0.55 : 1);
  // ── akış alanı: gökte dalgalı yatay + ay çevresinde dönen; suda yatay dalgacık ──
  const field = (x: number, y: number): number => {
    const id = idAt(ids, x, y);
    if (id === 1) return -Math.PI / 2 + 0.08 * Math.sin(y * 0.4);
    if (id === 2) return Math.atan2(tby - th * 0.6 - th * 0.4 - y, tx - x) ;
    if (y > hz + 2) return 0.1 * Math.sin(x * 0.045 / U + y * 0.21 / U) + 0.04 * Math.sin(y * 0.6);
    let vx = 1, vy = 0.35 * Math.sin(x * 0.02 / U + y * 0.05 / U) + 0.2 * Math.sin(y * 0.09 / U - x * 0.01);
    const dx = x - moon.x, dy = y - moon.y, d2 = dx * dx + dy * dy, R = moon.r * 3.6;
    if (d2 < R * R * 4) {
      const d = Math.sqrt(d2) + 1e-3, kk = 3.4 * Math.exp(-d2 / (R * R));
      vx += (kk * -dy) / d;
      vy += (kk * dx) / d;
    }
    return Math.atan2(vy, vx);
  };
  // ilgi: gök, ufuk, yansıma sütunları (sakin bölgelerde ayrıntı yok)
  const interest = (x: number, y: number): number => {
    const q = calm(x, y);
    const sky = 1 - smooth(hz - 4, hz + H * 0.03, y);
    const col = Math.exp(-(((x - moon.x) / (W * 0.08)) ** 2)) * (1 - smooth(hz, H * 0.5, y));
    return clamp(Math.max(sky, col * 0.9) * (1 - q), 0, 1);
  };

  // ── boyama ──
  g.fillStyle = '#0c1238';
  g.fillRect(0, 0, W, H);
  yield* paintLayer(g, ref, rnd, W, H, {cell: 9 * U, len: [18 * U, 30 * U], width: [7 * U, 10 * U], field, edge: 0.25, jitter: 9, relief: 0.06, calm, sizeK});
  yield* paintLayer(g, ref, rnd, W, H, {cell: 5.6 * U, len: [12 * U, 22 * U], width: [3.8 * U, 5.6 * U], field, edge: 0.55, jitter: 20, relief: 0.17, bristle: 0.45, calm, sizeK,
    tint: (c, x, y, r) => (r() < 0.1 ? mix(c, y < hz ? [46, 120, 140] : [70, 60, 150], 0.35) : c)});
  yield* paintLayer(g, ref, rnd, W, H, {cell: 3.2 * U, len: [6 * U, 12 * U], width: [2 * U, 3 * U], field, edge: 0.8, jitter: 12, relief: 0.2, where: interest, calm, sizeK});

  // ── ışık dokunuşları: ay ve yıldızlar etrafında kalın teğet darbeler, pencereler, köprü ışıkları ──
  const dabs = new Oil();
  const ring = (cx: number, cy: number, r0: number, r1: number, cols: RGB[], n: number, lw: number): void => {
    for (let i = 0; i < n; i++) {
      const rr = r0 + (r1 - r0) * rnd(), a0 = rnd() * Math.PI * 2, da = (6 + rnd() * 8) * U / rr;
      const pts: number[] = [];
      for (let s = 0; s <= 4; s++) pts.push(cx + Math.cos(a0 + (da * s) / 4) * rr, cy + Math.sin(a0 + (da * s) / 4) * rr);
      dabs.add(pts, lw * (0.8 + rnd() * 0.5), cols[Math.floor(rnd() * cols.length)], 0.22);
    }
  };
  ring(moon.x, moon.y, moon.r * 0.05, moon.r * 0.5, [[255, 250, 225], [255, 244, 200]], 22, 2.6 * U);
  ring(moon.x, moon.y, moon.r * 0.4, moon.r * 0.95, [[255, 246, 210], [252, 232, 160], [255, 250, 230]], 46, 2.6 * U);
  ring(moon.x, moon.y, moon.r * 1.1, moon.r * 2.6, [[240, 206, 110], [230, 190, 96], [170, 186, 220], [210, 200, 150], [120, 150, 220], [250, 226, 150]], 150, 2.4 * U);
  dabs.flush(g);
  if (due()) yield;
  // ufuktaki pencere ve köprü ışıkları: referansın parlak noktalarından kalın küçük darbeler
  lightDabs(dabs, ref, rnd, 0, hz - H * 0.2, W, hz + H * 0.01, 150, 2.2 * U, calm);
  dabs.flush(g);
  if (due()) yield;
  for (const [x, y, s] of [[0.1, 0.06, 1], [0.27, 0.035, 0.7], [0.62, 0.05, 0.8], [0.4, 0.13, 0.6], [0.94, 0.17, 0.7], [0.07, 0.16, 0.6]] as const)
    ring(W * x, H * y, M * 0.004, M * 0.03 * s, [[255, 246, 200], [240, 214, 120], [200, 210, 240]], 10, 1.8 * U);
  // yansıma sütununda kalın kırık ışık darbeleri
  for (let i = 0; i < 70; i++) {
    const t = Math.pow(rnd(), 1.4), y = hz + 3 + t * (H * 0.24), x = moon.x + (rnd() - 0.5) * W * (0.05 + t * 0.12);
    const len = (5 + rnd() * 9) * U * (1 - t * 0.4);
    const c: RGB = mix([255, 236, 170], [200, 170, 120], t);
    dabs.add([x - len / 2, y, x, y + (rnd() - 0.5), x + len / 2, y], (1.6 + rnd() * 1.4) * U, mix(c, [30, 40, 90], calm(x, y) * 0.6), 0.25);
  }
  dabs.flush(g);
  if (due()) yield;

  // ── son: tuval dokusu, kenar karartması, yığın ve elin altı derinleşir ──
  canvasWeave(g, W, H, rnd, 0.1);
  radial(g, S.px, S.py, 0, S.ringR * 2.3, [[0, 'rgba(4,6,26,.42)'], [0.55, 'rgba(4,6,26,.24)'], [1, 'rgba(4,6,26,0)']]);
  const gb = g.createLinearGradient(0, H * 0.72, 0, H);
  gb.addColorStop(0, 'rgba(3,4,20,0)');
  gb.addColorStop(1, 'rgba(3,4,20,.5)');
  g.fillStyle = gb;
  g.fillRect(0, H * 0.72, W, H * 0.28);
  radial(g, W / 2, H / 2, Math.min(W, H) * 0.55, Math.max(W, H) * 0.8, [[0, 'rgba(2,3,16,0)'], [1, 'rgba(2,3,16,.42)']]);
  return cv;
}
export const paintBogaz = (w: number, h: number, dpr: number): Promise<HTMLCanvasElement> => runJob(paint(w, h, dpr));
