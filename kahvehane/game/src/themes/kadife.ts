// Kadife masalar.
//  • Kızıl Salon: kapitone (Chesterfield) kızıl kadife — elmas dilimli yastıklar, altın düğmeler, sıcak altın ışık;
//    yığının altında altın kordonla çevrili düz, sakin kadife pano.
//  • Zümrüt Kadife: derin zümrüt kadife üstünde kabartma (devore) şam deseni, eski kahvehane lambasının sıcak ışığı,
//    yığının çevresinde pirinç kakma halka.
// Kadife gölgelemesi piksel başına (düşük çözünürlükte, yumuşak) hesaplanır; altın/pirinç ayrıntılar tam çözünürlükte keskin çizilir.
import {clamp, cloud, grain, makeCanvas, mulberry, radial, resScale, smooth, spotOf, type Ctx, type RGB, type Rnd} from './paint';

interface Velvet {
  base: RGB; // ışık alan yüz
  deep: RGB; // kıvrım dibi
  sheen: RGB; // eğimde parlayan hav (kadifenin imzası)
  warm: RGB; // lamba ışığı rengi
}

/**
 * Kadife gölgelemesi: yükseklik alanı `hf` (0..1, eğimleriyle) → piksel rengi.
 * Kadife ters davranır: bakana dönük düz yüz koyu/doygun, eğimler açık (hav ışığı), kıvrım dipleri karanlık.
 */
function shadeVelvet(W: number, H: number, k: number, v: Velvet, hf: (x: number, y: number, out: Float32Array) => void, light: (x: number, y: number) => number): HTMLCanvasElement {
  const pw = Math.max(1, Math.round(W * k)), ph = Math.max(1, Math.round(H * k));
  const [c, g] = makeCanvas(pw, ph);
  const img = g.createImageData(pw, ph);
  const d = img.data;
  const o = new Float32Array(3); // [yükseklik 0..1, dh/dx, dh/dy] (CSS px başına, tutam derinliği dahil)
  const Lx = -0.32, Ly = -0.62, Lz = 0.71; // ışık: üstten, hafif soldan
  for (let py = 0; py < ph; py++) {
    const y = (py + 0.5) / k;
    for (let px = 0; px < pw; px++) {
      const x = (px + 0.5) / k;
      hf(x, y, o);
      const nx = -o[1], ny = -o[2];
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const Nx = nx * inv, Ny = ny * inv, Nz = inv;
      const diff = Math.max(0, Nx * Lx + Ny * Ly + Nz * Lz);
      const graze = 1 - Nz; // 0 düz, →1 dik eğim
      const sheen = Math.min(1, graze * 3.2) * (0.6 + 0.4 * diff);
      const ao = 0.35 + 0.65 * smooth(0, 0.42, o[0]); // kıvrım dibi gölgesi
      const lt = light(x, y);
      const t = clamp(0.55 * diff + 0.1, 0, 1);
      let r = v.deep[0] + (v.base[0] - v.deep[0]) * t;
      let gg = v.deep[1] + (v.base[1] - v.deep[1]) * t;
      let b = v.deep[2] + (v.base[2] - v.deep[2]) * t;
      r = (r + v.sheen[0] * sheen * 0.55) * ao * lt;
      gg = (gg + v.sheen[1] * sheen * 0.55) * ao * lt;
      b = (b + v.sheen[2] * sheen * 0.55) * ao * lt;
      const i = (py * pw + px) * 4;
      d[i] = r > 255 ? 255 : r;
      d[i + 1] = gg > 255 ? 255 : gg;
      d[i + 2] = b > 255 ? 255 : b;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Kadifenin "ezilmiş hav" lekeleri + ince hav greni (yumuşak katmanda). */
function pile(g: Ctx, W: number, H: number, rnd: Rnd, dark: RGB, light: RGB, amt: number): void {
  cloud(g, W, H, Math.max(W, H) * 0.11, rnd, dark, light, amt * 0.8, 'soft-light');
  cloud(g, W, H, Math.max(W, H) * 0.035, rnd, dark, light, amt * 0.5, 'soft-light');
  grain(g, W, H, rnd, 0.05, 128);
}

/** Altın düğme (kapitone): koyu yuva gölgesi + kubbe + parlak nokta. */
function goldButton(g: Ctx, x: number, y: number, r: number): void {
  radial(g, x, y + r * 0.25, 0, r * 2.6, [[0, 'rgba(20,0,4,.75)'], [0.45, 'rgba(20,0,4,.35)'], [1, 'rgba(20,0,4,0)']]);
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  gr.addColorStop(0, '#fff6cf');
  gr.addColorStop(0.28, '#f6cf63');
  gr.addColorStop(0.68, '#b67a1c');
  gr.addColorStop(1, '#5a3208');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = Math.max(0.5, r * 0.12);
  g.strokeStyle = 'rgba(60,24,0,.7)';
  g.stroke();
}

/** Bükülmüş altın kordon halkası (yığın panosunun kenarı). */
function cord(g: Ctx, x: number, y: number, R: number, w: number, dark: string): void {
  g.save();
  g.translate(x, y);
  // gölge
  g.beginPath();
  g.arc(0, w * 0.35, R, 0, Math.PI * 2);
  g.lineWidth = w * 1.5;
  g.strokeStyle = dark;
  g.stroke();
  // gövde: üstten ışık alan altın
  const lg = g.createLinearGradient(0, -R, 0, R);
  lg.addColorStop(0, '#ffe59a');
  lg.addColorStop(0.35, '#e7b44a');
  lg.addColorStop(0.7, '#b07a22');
  lg.addColorStop(1, '#7a4c12');
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.lineWidth = w;
  g.strokeStyle = lg;
  g.stroke();
  // burgu: eğik koyu çizgiler + her burgunun üstünde ince ışık
  const n = Math.round((Math.PI * 2 * R) / (w * 0.95));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const tx = -sa, ty = ca; // teğet
    const ix = R * ca, iy = R * sa;
    const ax = ix - ca * w * 0.5 - tx * w * 0.32, ay = iy - sa * w * 0.5 - ty * w * 0.32;
    const bx = ix + ca * w * 0.5 + tx * w * 0.32, by = iy + sa * w * 0.5 + ty * w * 0.32;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.lineWidth = w * 0.16;
    g.strokeStyle = 'rgba(70,36,4,.75)';
    g.stroke();
    g.beginPath();
    g.moveTo(ax + tx * w * 0.2, ay + ty * w * 0.2);
    g.lineTo(bx + tx * w * 0.2, by + ty * w * 0.2);
    g.lineWidth = w * 0.1;
    g.strokeStyle = 'rgba(255,240,190,.55)';
    g.stroke();
  }
  g.restore();
}

// ─────────────────────────────── Kızıl Salon ───────────────────────────────
export function paintKizil(w: number, h: number, dpr: number): HTMLCanvasElement {
  const W = w, H = h;
  const S = spotOf(W, H);
  const U = clamp(Math.sqrt((W * H) / (390 * 844)), 0.75, 2.4);
  const rnd = mulberry(0x41c1);
  const dx = 104 * U, dy = 74 * U; // elmas: genişlik dx, yükseklik 2·dy
  const depth = 21 * U; // tutam derinliği (px)
  const Rp = S.ringR * 1.7; // düz pano yarıçapı
  const Rt = Rp + S.ringR * 0.55; // tutamın tam derinliğe ulaştığı yer

  const hf = (x: number, y: number, o: Float32Array): void => {
    const ddx = x - S.px, ddy = y - S.py;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    const A = smooth(Rp + 6 * U, Rt, dist);
    if (A <= 0) {
      o[0] = 1;
      o[1] = 0;
      o[2] = 0;
      return;
    }
    const a = ddx / dx, b = ddy / dy;
    const p = a + b / 2, q = a - b / 2;
    const fp = p - Math.floor(p) - 0.5, fq = q - Math.floor(q) - 0.5;
    const cp = Math.cos(Math.PI * fp), cq = Math.cos(Math.PI * fq);
    const e = 0.42; // küçük üs: yastık üstü dolgun, kıvrımlar keskin
    const base = Math.max(1e-4, cp * cq);
    const hv = Math.pow(base, e);
    const k1 = e * Math.pow(base, e - 1);
    const dhp = k1 * -Math.PI * Math.sin(Math.PI * fp) * cq;
    const dhq = k1 * -Math.PI * Math.sin(Math.PI * fq) * cp;
    const hx = (dhp + dhq) / dx, hy = (dhp - dhq) / (2 * dy);
    o[0] = 1 - A + A * hv;
    o[1] = hx * depth * A;
    o[2] = hy * depth * A;
  };
  // sıcak altın tepe ışığı: yığında en parlak, kenarlara doğru loş
  const light = (x: number, y: number): number => {
    const ddx = (x - S.px) / (W * 0.95), ddy = (y - S.py * 0.92) / (H * 0.62);
    return 0.42 + 0.78 * Math.exp(-(ddx * ddx + ddy * ddy) * 1.6);
  };
  const vel: Velvet = {base: [150, 16, 36], deep: [34, 2, 10], sheen: [255, 92, 96], warm: [255, 190, 110]};
  const lowK = resScale(W, H, dpr, 1.25, 600_000); // piksel başına gölgeleme: yumuşak katman, sınırlı piksel
  const soft = shadeVelvet(W, H, lowK, vel, hf, light);
  {
    const sg = soft.getContext('2d')!;
    sg.setTransform(lowK, 0, 0, lowK, 0, 0);
    pile(sg, W, H, rnd, [40, 0, 10], [255, 120, 120], 0.5);
  }

  // keskin katman: kadifeyi tam çözünürlüğe yumuşakça büyüt, altın ayrıntıları üstüne çiz
  const k = resScale(W, H, dpr, 2.5);
  const [cv, g] = makeCanvas(W * k, H * k);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(soft, 0, 0, cv.width, cv.height);
  g.scale(k, k);
  // pano: düz kadifenin üstünde çok hafif dairesel hav parıltısı
  radial(g, S.px, S.py, Rp * 0.2, Rp, [[0, 'rgba(255,120,110,0)'], [0.7, 'rgba(255,120,110,.05)'], [1, 'rgba(255,120,110,0)']]);
  // düğmeler (pano dışındaki tutam noktalarında)
  const br = 5.4 * U;
  const span = Math.ceil(Math.max(W / dx, H / dy)) + 2;
  for (let p = -span; p <= span; p++) {
    for (let q = -span; q <= span; q++) {
      const x = S.px + (dx * (p + q)) / 2, y = S.py + dy * (p - q);
      if (x < -br * 3 || x > W + br * 3 || y < -br * 3 || y > H + br * 3) continue;
      if (Math.hypot(x - S.px, y - S.py) < Rt - S.ringR * 0.1) continue;
      goldButton(g, x, y, br);
    }
  }
  cord(g, S.px, S.py, Rp, 6.2 * U, 'rgba(30,0,6,.55)');
  // altın ışık: yığının üstünde sıcak parıltı, kenarlarda derin şarap karanlığı
  radial(g, S.px, S.py * 0.95, 0, Math.max(W, H) * 0.55, [[0, 'rgba(255,186,96,.14)'], [0.5, 'rgba(255,170,80,.05)'], [1, 'rgba(255,170,80,0)']], 1, 1.1);
  radial(g, S.px, S.py, Math.min(W, H) * 0.4, Math.max(W, H) * 0.78, [[0, 'rgba(20,0,6,0)'], [1, 'rgba(14,0,4,.5)']]);
  // el ve rakip eli altını hafifçe koyulaştır
  radial(g, W * 0.6, H * 0.9, 0, W * 0.62, [[0, 'rgba(20,0,6,.3)'], [1, 'rgba(20,0,6,0)']], 1.2, 0.55);
  return cv;
}

// ─────────────────────────────── Zümrüt Kadife ───────────────────────────────
/** Şam (damask) motifi: dikey eksene simetrik palmet — sivri madalyon, iç zambak, yanlarda C-kıvrımları, alt yapraklar. Birim: yükseklik 2 (−1..1). */
function damaskPath(): Path2D {
  const p = new Path2D();
  const half = (m: number): void => {
    // dış madalyon (sivri oval)
    p.moveTo(0, -1);
    p.bezierCurveTo(m * 0.18, -0.78, m * 0.5, -0.62, m * 0.46, -0.3);
    p.bezierCurveTo(m * 0.44, -0.05, m * 0.2, 0.08, m * 0.3, 0.32);
    p.bezierCurveTo(m * 0.38, 0.52, m * 0.18, 0.7, 0, 0.78);
    p.lineTo(0, 0.6);
    p.bezierCurveTo(m * 0.12, 0.52, m * 0.2, 0.4, m * 0.12, 0.26);
    p.bezierCurveTo(m * 0.02, 0.06, m * 0.3, -0.08, m * 0.3, -0.3);
    p.bezierCurveTo(m * 0.3, -0.52, m * 0.1, -0.66, 0, -0.78);
    p.closePath();
    // yan C-kıvrımı (dışa kıvrılan akantus)
    p.moveTo(m * 0.5, -0.02);
    p.bezierCurveTo(m * 0.82, -0.1, m * 0.96, 0.22, m * 0.78, 0.36);
    p.bezierCurveTo(m * 0.66, 0.46, m * 0.52, 0.36, m * 0.6, 0.26);
    p.bezierCurveTo(m * 0.7, 0.3, m * 0.8, 0.2, m * 0.72, 0.1);
    p.bezierCurveTo(m * 0.64, 0.02, m * 0.56, 0.06, m * 0.5, -0.02);
    p.closePath();
    // üst kıvrık yaprak
    p.moveTo(m * 0.36, -0.52);
    p.bezierCurveTo(m * 0.62, -0.7, m * 0.8, -0.56, m * 0.78, -0.4);
    p.bezierCurveTo(m * 0.66, -0.5, m * 0.52, -0.46, m * 0.4, -0.38);
    p.closePath();
    // alt yaprak
    p.moveTo(m * 0.06, 0.82);
    p.bezierCurveTo(m * 0.3, 0.8, m * 0.5, 0.9, m * 0.56, 1);
    p.bezierCurveTo(m * 0.36, 0.98, m * 0.16, 0.94, m * 0.06, 0.82);
    p.closePath();
  };
  half(1);
  half(-1);
  // iç zambak (üç yapraklı)
  p.moveTo(0, -0.5);
  p.bezierCurveTo(0.1, -0.36, 0.1, -0.16, 0, -0.02);
  p.bezierCurveTo(-0.1, -0.16, -0.1, -0.36, 0, -0.5);
  p.closePath();
  p.moveTo(0.02, -0.06);
  p.bezierCurveTo(0.18, -0.24, 0.24, -0.1, 0.18, 0.04);
  p.bezierCurveTo(0.12, 0.0, 0.06, 0.0, 0.02, -0.06);
  p.closePath();
  p.moveTo(-0.02, -0.06);
  p.bezierCurveTo(-0.18, -0.24, -0.24, -0.1, -0.18, 0.04);
  p.bezierCurveTo(-0.12, 0.0, -0.06, 0.0, -0.02, -0.06);
  p.closePath();
  // ara süs: küçük elmas
  p.moveTo(0, 0.14);
  p.lineTo(0.06, 0.24);
  p.lineTo(0, 0.34);
  p.lineTo(-0.06, 0.24);
  p.closePath();
  return p;
}

/** Dört yapraklı küçük ara süs (birim yarıçap). */
function quatrefoil(): Path2D {
  const p = new Path2D();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    p.moveTo(0, 0);
    p.bezierCurveTo(c * 0.5 - s * 0.42, s * 0.5 + c * 0.42, c * 1 - s * 0.2, s * 1 + c * 0.2, c * 1.05, s * 1.05);
    p.bezierCurveTo(c * 1 + s * 0.2, s * 1 - c * 0.2, c * 0.5 + s * 0.42, s * 0.5 - c * 0.42, 0, 0);
    p.closePath();
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    p.moveTo(Math.cos(a) * 0.62 + 0.12, Math.sin(a) * 0.62);
    p.arc(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.12, 0, Math.PI * 2);
  }
  return p;
}

export function paintZumrut(w: number, h: number, dpr: number): HTMLCanvasElement {
  const W = w, H = h;
  const S = spotOf(W, H);
  const U = clamp(Math.sqrt((W * H) / (390 * 844)), 0.75, 2.4);
  const rnd = mulberry(0x2e3d);
  // kadife zemin: düz (yükseklik alanı yok), yalnız ışık ve hav dokusu
  const light = (x: number, y: number): number => {
    const ddx = (x - S.px) / (W * 0.9), ddy = (y - S.py * 0.9) / (H * 0.6);
    return 0.5 + 0.72 * Math.exp(-(ddx * ddx + ddy * ddy) * 1.5);
  };
  const vel: Velvet = {base: [18, 110, 70], deep: [3, 30, 20], sheen: [120, 230, 170], warm: [255, 200, 120]};
  const lowK = resScale(W, H, dpr, 1, 500_000);
  // hafif dalgalı hav (kumaşın ağırlığıyla oluşan geniş kıvrımlar)
  const hf = (x: number, y: number, o: Float32Array): void => {
    const s = 0.012 / U;
    o[0] = 1;
    o[1] = 0.12 * Math.cos(x * s * 1.3 + Math.sin(y * s * 0.7) * 2.2);
    o[2] = 0.08 * Math.sin(y * s * 0.9 + x * s * 0.4);
  };
  const soft = shadeVelvet(W, H, lowK, vel, hf, light);
  {
    const sg = soft.getContext('2d')!;
    sg.setTransform(lowK, 0, 0, lowK, 0, 0);
    pile(sg, W, H, rnd, [0, 20, 10], [140, 255, 190], 0.42);
  }
  const k = resScale(W, H, dpr, 2.5);
  const [cv, g] = makeCanvas(W * k, H * k);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(soft, 0, 0, cv.width, cv.height);
  g.scale(k, k);

  // kabartma şam deseni: yarım kaydırmalı (half-drop) tekrar; kenarlarda belirgin, yığına doğru kaybolur
  const dw = 132 * U, dh = 176 * U; // tekrar aralığı
  const mh = Math.min(dw * 0.4, dh * 0.33); // motif yarı yüksekliği (komşularla arasında zemin kalır)
  const qf = quatrefoil();
  const dp = damaskPath();
  const [mc, mg] = makeCanvas(W * k, H * k);
  mg.scale(k, k);
  const cols = Math.ceil(W / dw) + 2, rows = Math.ceil(H / dh) + 2;
  const ox = S.px - Math.ceil(S.px / dw) * dw, oy = S.py - Math.ceil(S.py / dh) * dh - dh / 2;
  // kabartma: önce alt-sağ gölge, sonra üst-sol ışık, en üstte motifin koyu-doygun havı (devore)
  const layer = (col: string, a: number, sx2: number, sy2: number): void => {
    mg.fillStyle = col;
    mg.globalAlpha = a;
    for (let j = -1; j < rows; j++) {
      for (let i = -1; i < cols; i++) {
        for (const [hx, hy] of [[0, 0], [0.5, 0.5]]) {
          mg.save();
          mg.translate(ox + (i + hx) * dw + sx2, oy + (j + hy) * dh + sy2);
          mg.scale(mh, mh);
          mg.fill(dp);
          mg.restore();
        }
        // aralarda küçük dört yapraklı yıldız çiçek
        for (const [hx, hy] of [[0.5, 0], [0, 0.5]]) {
          mg.save();
          mg.translate(ox + (i + hx) * dw + sx2, oy + (j + hy) * dh + sy2);
          mg.scale(mh * 0.3, mh * 0.3);
          mg.fill(qf);
          mg.restore();
        }
      }
    }
  };
  layer('#011a0e', 0.55, 0.9 * U, 1.3 * U);
  layer('#a8f4cc', 0.2, -0.7 * U, -0.9 * U);
  layer('#06492c', 0.62, 0, 0);
  mg.globalAlpha = 1;
  // yığın çevresinde desen söner (sakin merkez)
  mg.globalCompositeOperation = 'destination-out';
  radial(mg, S.px, S.py, 0, S.ringR * 3.1, [[0, 'rgba(0,0,0,1)'], [0.55, 'rgba(0,0,0,.92)'], [1, 'rgba(0,0,0,0)']], 1, 1.05);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(mc, 0, 0);
  g.restore();

  // pirinç kakma halka (yığın panosu): ince çift hat + aralarda küçük pirinç çiviler
  const R = S.ringR * 1.62;
  g.save();
  g.translate(S.px, S.py);
  for (const [r, lw] of [[R, 2.4 * U], [R + 7 * U, 1.2 * U]]) {
    g.beginPath();
    g.arc(0, 1.2 * U, r, 0, Math.PI * 2);
    g.lineWidth = lw + 1.5 * U;
    g.strokeStyle = 'rgba(0,16,8,.55)';
    g.stroke();
    const lg = g.createLinearGradient(0, -r, 0, r);
    lg.addColorStop(0, '#f8e2a0');
    lg.addColorStop(0.45, '#cf9f48');
    lg.addColorStop(1, '#7c5418');
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.lineWidth = lw;
    g.strokeStyle = lg;
    g.stroke();
  }
  const nN = 40;
  for (let i = 0; i < nN; i++) {
    const a = (i / nN) * Math.PI * 2;
    const x = Math.cos(a) * (R + 3.6 * U), y = Math.sin(a) * (R + 3.6 * U);
    const rr = (i % 5 === 0 ? 1.9 : 1.1) * U;
    const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 0, x, y, rr);
    gr.addColorStop(0, '#fff3c4');
    gr.addColorStop(0.5, '#d6a64c');
    gr.addColorStop(1, '#6e4812');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // eski kahvehane lambası: yığının üstünde sıcak, kehribar ışık havuzu
  radial(g, S.px, S.py * 0.9, 0, Math.max(W, H) * 0.52, [[0, 'rgba(255,206,120,.2)'], [0.4, 'rgba(255,190,100,.08)'], [1, 'rgba(255,190,100,0)']], 1, 1.12);
  radial(g, S.px, S.py, Math.min(W, H) * 0.42, Math.max(W, H) * 0.78, [[0, 'rgba(0,14,8,0)'], [1, 'rgba(0,10,6,.5)']]);
  radial(g, W * 0.6, H * 0.9, 0, W * 0.62, [[0, 'rgba(0,14,8,.3)'], [1, 'rgba(0,14,8,0)']], 1.2, 0.55);
  return cv;
}
