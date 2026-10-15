// Masa "Çini Salon": İznik çinisi döşeli zemin. Gece laciverdi sır üstünde kobalt, turkuaz, mercan kırmızısı ve krem kontur;
// her karo kendi içinde simetrik (dörtte bir rozetler köşelerde birleşip tam rozet olur, bademsi kafes karodan karoya akar).
// Yığının altında büyük bir şemse (madalyon): içi sakin, düz lacivert sır; kenarında lale ve saz yaprağı çelengi.
// Keskin desen olduğu için tam dpr ile çizilir (karo bir kez çizilip kopyalanır → hızlı).
import {clamp, cloud, makeCanvas, mulberry, radial, resScale, spotOf, type Ctx} from './paint';

const NAVY = '#0a1a4e', NAVY2 = '#12296f', COBALT = '#2453b8', COBALT2 = '#3a6fd6';
const TURQ = '#22a9a4', TURQ2 = '#5fd0c4', CORAL = '#d23f2e', CORAL2 = '#f06a4c', CREAM = '#f1e7cc', GREEN = '#2f8a5c';

// ───────── motif yolları (birim boy, yukarı bakar; çağıran ölçekler/döndürür) ─────────
/** Osmanlı lalesi: sivri orta yaprak + dışa kıvrılan iki yan yaprak. Taban (0,0), tepe (0,-1). */
function tulipPath(): Path2D {
  const p = new Path2D();
  // orta yaprak
  p.moveTo(0, 0.02);
  p.bezierCurveTo(-0.3, -0.18, -0.26, -0.72, 0, -1);
  p.bezierCurveTo(0.26, -0.72, 0.3, -0.18, 0, 0.02);
  // yan yapraklar (sivri uçları dışa kıvrık)
  p.moveTo(-0.05, 0.04);
  p.bezierCurveTo(-0.46, 0.02, -0.6, -0.4, -0.5, -0.86);
  p.bezierCurveTo(-0.4, -0.6, -0.26, -0.42, -0.1, -0.3);
  p.closePath();
  p.moveTo(0.05, 0.04);
  p.bezierCurveTo(0.46, 0.02, 0.6, -0.4, 0.5, -0.86);
  p.bezierCurveTo(0.4, -0.6, 0.26, -0.42, 0.1, -0.3);
  p.closePath();
  return p;
}
/** Saz yaprağı: uzun, hafif kıvrık, sivri uçlu hançer yaprak. Taban (0,0), uç (0,-1). */
function sazPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0);
  p.bezierCurveTo(-0.2, -0.22, -0.2, -0.62, 0.08, -1);
  p.bezierCurveTo(0.02, -0.66, 0.2, -0.3, 0, 0);
  return p;
}
function lobes(n: number, r: number, lr: number, rot = 0): Path2D {
  const p = new Path2D();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    p.moveTo(Math.cos(a) * r + lr, Math.sin(a) * r);
    p.arc(Math.cos(a) * r, Math.sin(a) * r, lr, 0, Math.PI * 2);
  }
  return p;
}
function circle(x: number, y: number, r: number): Path2D {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  return p;
}

/** Bir motifi yerleştirip çizer: dolgu + krem kontur. */
function draw(g: Ctx, path: Path2D, x: number, y: number, s: number, ang: number, fill: string | CanvasGradient, line: number, stroke = CREAM): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(s, s);
  g.fillStyle = fill;
  g.fill(path);
  if (line > 0) {
    g.lineWidth = line / s;
    g.strokeStyle = stroke;
    g.stroke(path);
  }
  g.restore();
}

/** Rozet (hatayi çiçeği): n loblu turkuaz taç, mercan göbek, krem halka. */
function rosette(g: Ctx, x: number, y: number, r: number, lw: number, n = 8): void {
  draw(g, lobes(n, r * 0.62, r * 0.36), x, y, 1, 0, TURQ, lw);
  draw(g, lobes(n, r * 0.4, r * 0.22, Math.PI / n), x, y, 1, 0, COBALT2, lw * 0.8);
  draw(g, circle(0, 0, r * 0.34), x, y, 1, 0, CORAL, lw);
  draw(g, circle(0, 0, r * 0.13), x, y, 1, 0, CREAM, 0);
}

/** Kıvrık dal (hatayi sarmalı): merkezden dışa açılan ince spiral + üstünde küçük yaprak tırnakları. */
function scroll(g: Ctx, x: number, y: number, r: number, a0: number, dir: number, lw: number): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  const n = 26;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + dir * t * Math.PI * 1.35;
    const rr = r * (0.25 + 0.75 * t);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  g.moveTo(pts[0][0], pts[0][1]);
  for (const [px, py] of pts) g.lineTo(px, py);
  g.lineWidth = lw;
  g.strokeStyle = COBALT2;
  g.stroke();
  // yaprak tırnakları
  g.fillStyle = TURQ;
  for (const i of [8, 15, 22]) {
    const [px, py] = pts[i];
    const [qx, qy] = pts[i + 1];
    const ang = Math.atan2(qy - py, qx - px) + dir * 0.9;
    g.save();
    g.translate(px, py);
    g.rotate(ang);
    g.beginPath();
    g.ellipse(r * 0.09, 0, r * 0.1, r * 0.035, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.restore();
}

/**
 * Tek karo (T×T CSS px, ölçek k): sır zemini, bademsi (ogival) kafes, kafes içinde lale–rozet–saz kompozisyonu,
 * kafes dışında (karo köşelerinde) dörtte bir hatayi rozetleri. Karolar yan yana gelince kafes kesintisiz akar.
 */
function paintTile(T: number, k: number, seed: number): HTMLCanvasElement {
  const px = Math.round(T * k);
  const [c, g] = makeCanvas(px, px);
  g.scale(px / T, px / T);
  const rnd = mulberry(seed);
  const lw = Math.max(0.7, T * 0.0105); // kontur kalınlığı
  const h = T / 2;
  // sır zemini: merkezde hafif açık lacivert
  const gr = g.createRadialGradient(h, h, 0, h, h, T * 0.72);
  gr.addColorStop(0, NAVY2);
  gr.addColorStop(1, NAVY);
  g.fillStyle = gr;
  g.fillRect(0, 0, T, T);

  // bademsi kafes: üst ve alt kenar ortasında sivrilen, yanlarda karo kenarına değen oval
  const ogee = new Path2D();
  const cx = h - h * 1.3;
  ogee.moveTo(h, 0);
  ogee.bezierCurveTo(cx, T * 0.3, cx, T * 0.7, h, T);
  ogee.bezierCurveTo(T - cx, T * 0.7, T - cx, T * 0.3, h, 0);
  ogee.closePath();
  // oval içi bir ton açık (kafesin içi "pano" gibi okunur)
  g.fillStyle = 'rgba(40,80,170,.22)';
  g.fill(ogee);

  // oval içinde kıvrık dallar (ince, yoğun el işi dokusu)
  g.save();
  g.clip(ogee);
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    scroll(g, h + sx * T * 0.13, h + sy * T * 0.2, T * 0.13, sy > 0 ? (sx > 0 ? 0 : Math.PI) : sx > 0 ? 0 : Math.PI, sx * sy, lw * 0.9);
  }
  g.restore();
  // köşelerde (kafes dışı) dörtte bir hatayi + çevresinde ince dal
  for (const [x, y] of [[0, 0], [T, 0], [0, T], [T, T]]) {
    rosette(g, x, y, T * 0.17, lw);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      draw(g, sazPath(), x + Math.cos(a) * T * 0.15, y + Math.sin(a) * T * 0.15, T * 0.1, a + Math.PI / 2 + 0.3, COBALT2, lw * 0.8);
    }
  }
  // kafes bandı: krem şerit + ortasında mercan hat
  g.lineWidth = lw * 4.6;
  g.strokeStyle = CREAM;
  g.stroke(ogee);
  g.lineWidth = lw * 2.2;
  g.strokeStyle = TURQ;
  g.stroke(ogee);
  g.lineWidth = lw * 0.8;
  g.strokeStyle = CREAM;
  g.stroke(ogee);
  // kafes düğümleri: üst/alt uçta ve yan değme noktalarında mercan tokalar (komşuyla tam olur)
  for (const [x, y] of [[h, 0], [h, T], [0, h], [T, h]]) {
    draw(g, circle(0, 0, T * 0.05), x, y, 1, 0, CORAL, lw);
    draw(g, circle(0, 0, T * 0.018), x, y, 1, 0, CREAM, 0);
  }

  // orta kompozisyon: rozet, uçlara bakan iki lale, yanlara yatan saz yaprakları
  const tp = tulipPath(), sp = sazPath();
  const tg = g.createLinearGradient(0, 0, 0, -1);
  tg.addColorStop(0, CORAL);
  tg.addColorStop(1, CORAL2);
  for (const dir of [-1, 1]) {
    // sap
    g.beginPath();
    g.moveTo(h, h + dir * T * 0.1);
    g.quadraticCurveTo(h + dir * T * 0.03, h + dir * T * 0.2, h, h + dir * T * 0.27);
    g.lineWidth = lw * 1.5;
    g.strokeStyle = GREEN;
    g.stroke();
    draw(g, tp, h, h + dir * T * 0.27, T * 0.15, dir < 0 ? 0 : Math.PI, tg, lw);
    // sapın iki yanında küçük yapraklar
    draw(g, sp, h, h + dir * T * 0.18, T * 0.09, (dir < 0 ? 0 : Math.PI) - 0.9, TURQ, lw * 0.8);
    draw(g, sp, h, h + dir * T * 0.18, T * 0.09, (dir < 0 ? 0 : Math.PI) + 0.9, TURQ, lw * 0.8);
  }
  for (const dir of [-1, 1]) {
    draw(g, sp, h + dir * T * 0.08, h, T * 0.2, dir * (Math.PI / 2) + 0.35 * dir, TURQ, lw);
    draw(g, sp, h + dir * T * 0.08, h, T * 0.15, dir * (Math.PI / 2) - 0.5 * dir, COBALT2, lw * 0.9);
  }
  rosette(g, h, h, T * 0.12, lw, 8);
  // krem nokta süsleri
  g.fillStyle = CREAM;
  for (const [x, y] of [[0.32, 0.36], [0.68, 0.36], [0.32, 0.64], [0.68, 0.64], [0.5, 0.08], [0.5, 0.92], [0.08, 0.5], [0.92, 0.5]]) {
    g.beginPath();
    g.arc(x * T + (x === 0.5 ? 0 : 0), y * T, T * 0.011, 0, Math.PI * 2);
    g.fill();
  }

  // el yapımı sır: karo başına ufak ton farkı + kenarda kabarık sır (açık üst-sol, koyu alt-sağ)
  g.fillStyle = rnd() < 0.5 ? `rgba(255,250,230,${(rnd() * 0.035).toFixed(3)})` : `rgba(0,6,30,${(rnd() * 0.06).toFixed(3)})`;
  g.fillRect(0, 0, T, T);
  const e = T * 0.035;
  let lg = g.createLinearGradient(0, 0, 0, e);
  lg.addColorStop(0, 'rgba(255,255,255,.16)');
  lg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, T, e);
  lg = g.createLinearGradient(0, 0, e, 0);
  lg.addColorStop(0, 'rgba(255,255,255,.12)');
  lg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, e, T);
  lg = g.createLinearGradient(0, T, 0, T - e);
  lg.addColorStop(0, 'rgba(0,0,20,.35)');
  lg.addColorStop(1, 'rgba(0,0,20,0)');
  g.fillStyle = lg;
  g.fillRect(0, T - e, T, e);
  lg = g.createLinearGradient(T, 0, T - e, 0);
  lg.addColorStop(0, 'rgba(0,0,20,.3)');
  lg.addColorStop(1, 'rgba(0,0,20,0)');
  g.fillStyle = lg;
  g.fillRect(T - e, 0, e, T);
  return c;
}

/** Dilimli (kemerli) daire yolu: n dilim, her dilim dışa şişen küçük bir yay. */
function scallop(R: number, n: number, depth: number): Path2D {
  const p = new Path2D();
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    const x0 = Math.cos(a0) * R, y0 = Math.sin(a0) * R;
    if (i === 0) p.moveTo(x0, y0);
    p.quadraticCurveTo(Math.cos(am) * (R + depth * 2), Math.sin(am) * (R + depth * 2), Math.cos(a1) * R, Math.sin(a1) * R);
  }
  p.closePath();
  return p;
}
/** Salbek (madalyon ucu): dilimli damla — mercan göbek, turkuaz taç, krem kontur. Taban (0,0), uç (0,-1). */
function pendantPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0);
  p.bezierCurveTo(-0.55, -0.05, -0.62, -0.55, -0.22, -0.72);
  p.quadraticCurveTo(-0.12, -0.88, 0, -1);
  p.quadraticCurveTo(0.12, -0.88, 0.22, -0.72);
  p.bezierCurveTo(0.62, -0.55, 0.55, -0.05, 0, 0);
  return p;
}

/** Şemse: yığının altındaki büyük madalyon. Dilimli kenar, lale–rozet–saz çelengi, üstte ve altta salbek; iç alan sakin düz lacivert sır. */
function medallion(g: Ctx, x: number, y: number, Rin: number, Rout: number, lw: number): void {
  const band = Rout - Rin, mid = (Rin + Rout) / 2;
  const nS = 36; // dilim sayısı
  g.save();
  g.translate(x, y);
  // salbekler (üst/alt): madalyonun altında kalır, yalnız uçları taşar
  const pp = pendantPath();
  for (const a of [0, Math.PI]) {
    g.save();
    g.rotate(a);
    g.translate(0, -Rout + band * 0.1);
    g.scale(band * 0.95, band * 0.95);
    g.fillStyle = 'rgba(4,10,36,.85)';
    g.save();
    g.scale(1.22, 1.16);
    g.fill(pp);
    g.restore();
    g.fillStyle = COBALT;
    g.fill(pp);
    g.lineWidth = (lw * 1.6) / (band * 0.95);
    g.strokeStyle = CREAM;
    g.stroke(pp);
    g.scale(0.62, 0.62);
    g.fillStyle = TURQ;
    g.fill(pp);
    g.scale(0.55, 0.55);
    g.fillStyle = CORAL;
    g.fill(pp);
    g.restore();
  }
  // dış koyu boşluk (zemin karolarından ayırır)
  const outer = scallop(Rout, nS, band * 0.07);
  g.save();
  g.scale((Rout + lw * 5) / Rout, (Rout + lw * 5) / Rout);
  g.fillStyle = 'rgba(4,10,36,.88)';
  g.fill(outer);
  g.restore();
  // bant zemini: kobalt, dilimli kenar krem
  const bg = g.createRadialGradient(0, 0, Rin, 0, 0, Rout);
  bg.addColorStop(0, '#173893');
  bg.addColorStop(1, '#0f2566');
  g.fillStyle = bg;
  g.fill(outer);
  g.lineWidth = lw * 2.2;
  g.strokeStyle = CREAM;
  g.stroke(outer);
  // dilim birleşimlerinde küçük turkuaz damlalar
  g.fillStyle = TURQ2;
  for (let i = 0; i < nS; i++) {
    const a = (i / nS) * Math.PI * 2;
    g.beginPath();
    g.arc(Math.cos(a) * (Rout - lw * 3), Math.sin(a) * (Rout - lw * 3), lw * 1.2, 0, Math.PI * 2);
    g.fill();
  }
  // çelengin omurgası: bant boyunca dalgalanan yeşil dal
  const n = 12;
  g.beginPath();
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * Math.PI * 2;
    const r = mid + band * 0.16 * Math.sin(a * n * 2 + Math.PI / 2);
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.lineWidth = lw * 1.5;
  g.strokeStyle = GREEN;
  g.stroke();
  const tp = tulipPath(), sp = sazPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2; // 0. lale tam tepede
    const out = a + Math.PI / 2; // dışa bakan yön
    const cx = Math.cos(a), cy = Math.sin(a);
    // lale (dışa bakar)
    const tg = g.createLinearGradient(0, 0, 0, -1);
    tg.addColorStop(0, CORAL);
    tg.addColorStop(1, CORAL2);
    draw(g, tp, cx * (mid - band * 0.2), cy * (mid - band * 0.2), band * 0.5, out, tg, lw);
    // laleler arasında: içe bakan küçük rozet + iki yana yatan saz yaprakları
    const b = a + Math.PI / n;
    const bx = Math.cos(b), by = Math.sin(b);
    rosette(g, bx * (mid - band * 0.02), by * (mid - band * 0.02), band * 0.26, lw * 0.8, 6);
    draw(g, sp, bx * (mid + band * 0.05), by * (mid + band * 0.05), band * 0.42, b + Math.PI / 2 + 1.25, TURQ, lw * 0.9);
    draw(g, sp, bx * (mid + band * 0.05), by * (mid + band * 0.05), band * 0.42, b + Math.PI / 2 - 1.25, COBALT2, lw * 0.9);
  }
  // iç kenar: krem + turkuaz boncuk dizisi
  g.beginPath();
  g.arc(0, 0, Rin, 0, Math.PI * 2);
  g.lineWidth = lw * 2.2;
  g.strokeStyle = CREAM;
  g.stroke();
  g.fillStyle = TURQ2;
  const nb = Math.round((Math.PI * 2 * Rin) / (lw * 7));
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2;
    g.beginPath();
    g.arc(Math.cos(a) * (Rin - lw * 3.4), Math.sin(a) * (Rin - lw * 3.4), lw * 1.15, 0, Math.PI * 2);
    g.fill();
  }
  // iç alan: düz lacivert sır, merkezde derin; çok ince ışınsal hatlar (sakin doku)
  const ri = Rin - lw * 5.5;
  const ig = g.createRadialGradient(0, 0, 0, 0, 0, ri);
  ig.addColorStop(0, '#081540');
  ig.addColorStop(0.7, '#0b1c52');
  ig.addColorStop(1, '#11296c');
  g.fillStyle = ig;
  g.beginPath();
  g.arc(0, 0, ri, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(130,170,255,.07)';
  g.lineWidth = lw * 0.9;
  g.beginPath();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    g.moveTo(Math.cos(a) * ri * 0.18, Math.sin(a) * ri * 0.18);
    g.lineTo(Math.cos(a) * ri * 0.97, Math.sin(a) * ri * 0.97);
  }
  g.stroke();
  g.restore();
}

export function paintCini(w: number, h: number, dpr: number): HTMLCanvasElement {
  const k = resScale(w, h, dpr, 3);
  const [cv, g] = makeCanvas(w * k, h * k);
  const W = w, H = h;
  const S = spotOf(W, H);
  const rnd = mulberry(0xc1a1);
  // karo boyu: dikey telefonda genişliğin ~1/3.6'sı; tuval pikselinde tam sayı (karolar arası kayma olmasın)
  const Tp = Math.max(48, Math.round(clamp(Math.min(W / 3.6, H / 6.5), 70, 150) * k));
  const T = Tp / k;
  const tile = paintTile(T, k, 7);
  // ızgara: bir karo köşesi yığın merkezinde (desen yığına göre simetrik)
  const ox = Math.round(S.px * k) % Tp - Tp, oy = Math.round(S.py * k) % Tp - Tp;
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (let y = oy; y < cv.height; y += Tp) {
    for (let x = ox; x < cv.width; x += Tp) {
      g.drawImage(tile, x, y);
      // karo başına küçük sır/ton farkı (el yapımı his)
      const v = rnd();
      g.fillStyle = v < 0.5 ? `rgba(255,248,225,${(v * 0.05).toFixed(3)})` : `rgba(0,4,24,${((v - 0.5) * 0.12).toFixed(3)})`;
      g.fillRect(x, y, Tp, Tp);
    }
  }
  // derz çizgileri
  g.fillStyle = 'rgba(3,8,30,.9)';
  const gw = Math.max(1, Math.round(1.4 * k));
  for (let x = ox; x < cv.width + Tp; x += Tp) g.fillRect(x - (gw >> 1), 0, gw, cv.height);
  for (let y = oy; y < cv.height + Tp; y += Tp) g.fillRect(0, y - (gw >> 1), cv.width, gw);
  g.scale(k, k);
  // sırın düzensizliği: geniş, çok hafif açık/koyu lekeler
  cloud(g, W, H, Math.max(W, H) * 0.09, rnd, [0, 6, 30], [200, 230, 255], 0.07);

  // desen zemin olarak bir ton geri çekilir (kartlar öne çıksın): lacivert perde, kenarlara doğru koyulaşır
  g.fillStyle = 'rgba(6,14,52,.34)';
  g.fillRect(0, 0, W, H);
  radial(g, S.px, S.py, 0, Math.max(W, H) * 0.75, [[0, 'rgba(4,10,40,0)'], [0.55, 'rgba(4,10,40,.12)'], [1, 'rgba(2,6,26,.55)']], 1, 1);
  // el ve rakip eli altını hafifçe koyulaştır
  radial(g, W * 0.6, H * 0.9, 0, W * 0.62, [[0, 'rgba(3,8,30,.38)'], [1, 'rgba(3,8,30,0)']], 1.2, 0.55);
  radial(g, W * 0.5, H * 0.235, 0, W * 0.42, [[0, 'rgba(3,8,30,.3)'], [1, 'rgba(3,8,30,0)']], 1.25, 0.6);

  // şemse
  const lw = Math.max(0.8, S.cw * 0.012);
  medallion(g, S.px, S.py, S.ringR * 1.26, S.ringR * 1.68, lw);
  // sır parıltısı: tavandaki lambanın yansıması (yumuşak, sol üstte)
  radial(g, W * 0.3, H * 0.2, 0, W * 0.7, [[0, 'rgba(190,230,255,.07)'], [1, 'rgba(190,230,255,0)']], 1, 1.3);
  return cv;
}
