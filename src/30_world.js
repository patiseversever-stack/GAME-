
/* =====================================================================
   DÜNYA MODELİ — bölümler, paletler, güneş geometrisi, gölge testi
   (oyun mantığı burada saf matematikle çalışır; görsel gölgeler aynı
   geometriden üretildiği için ekranda görülen gölge = oyundaki gölge)
   ===================================================================== */
const CHAPTERS = [
  {
    key: 'ege', name: 'Ege Şafağı', roman: 'I', constellation: 'Zeytin Dalı',
    sub: 'Beyaz evler, selviler, zeytin ağaçları.', hint: 'Gölgeler hep güneşin tersine düşer.',
    tilt: 38, thMin: 16, features: {},
    pal: {
      skyLowZ: '#33427e', skyLowH: '#ffb08a', skyHighZ: '#3f7fd0', skyHighH: '#cfe5ff',
      belowLow: '#f2c9b8', belowHigh: '#e4eefa', seaDeep: '#9d8fb8', sunLow: '#ff9a52', sunHigh: '#fff1d8',
      hemiSky: '#9fb6ff', hemiGround: '#d8b48c',
      ground: '#d9c79a', groundVar: ['#cbb886', '#e3d3a6', '#bfb27c', '#a9a86a'], path: '#efe3c8', pathEdge: '#9a8460', pathStone: '#f7efdc',
      cliffTop: '#8a9a52', soil: '#9b7a55', bands: ['#c9a27a', '#b88d68', '#d8b48d', '#a87f5e', '#c49773'], rockDark: '#5e4a43',
      grass: ['#8fa250', '#a3b25c', '#7d9446', '#b5b866'], flowers: ['#e04a8f', '#f2d24b', '#ffffff', '#c23a6e'],
      grade: { lift: [0.02, 0.01, 0.04], gamma: [1, 1, 1], gain: [1.02, 1.0, 0.98], sat: 1.06, contrast: 1.04 },
    },
  },
  {
    key: 'ruzgar', name: 'Rüzgâr Adası', roman: 'II', constellation: 'Değirmen',
    sub: 'Değirmenler döner, bulutlar geçer.', hint: 'Bulutların gölgesi de senin.',
    tilt: 32, thMin: 15, features: { clouds: true, windmills: true },
    pal: {
      skyLowZ: '#2f5795', skyLowH: '#ffc89a', skyHighZ: '#3a8be0', skyHighH: '#d6f0ff',
      belowLow: '#f0d4c0', belowHigh: '#eaf5ff', seaDeep: '#8fa8c8', sunLow: '#ffa45c', sunHigh: '#fff6e2',
      hemiSky: '#a8c8ff', hemiGround: '#b8c08a',
      ground: '#9fb862', groundVar: ['#8eaa55', '#b0c56e', '#7e9b4a', '#c2c779'], path: '#e3d4ad', pathEdge: '#7e7048', pathStone: '#f0e6cc',
      cliffTop: '#6f9440', soil: '#8a6a48', bands: ['#b99872', '#a98762', '#c9a983', '#9a7a5a', '#bf9e78'], rockDark: '#4d4038',
      grass: ['#7fae46', '#93be52', '#6c9a3c', '#a8c75e'], flowers: ['#e8312f', '#ffffff', '#f7d046', '#d42a2a'],
      grade: { lift: [0.01, 0.02, 0.04], gamma: [1, 1, 1], gain: [1.0, 1.01, 1.0], sat: 1.08, contrast: 1.04 },
    },
  },
  {
    key: 'peri', name: 'Peri Bacaları', roman: 'III', constellation: 'Balon',
    sub: 'Gökyüzü sıcak hava balonlarıyla dolu.', hint: 'Yüksekteki gölge, alçalan güneşle uzar.',
    tilt: 26, thMin: 15, features: { balloons: true },
    pal: {
      skyLowZ: '#4a3d86', skyLowH: '#ff9459', skyHighZ: '#5d93d4', skyHighH: '#ffe0b0',
      belowLow: '#f5c2a0', belowHigh: '#f6e6d2', seaDeep: '#b08a8c', sunLow: '#ff8a40', sunHigh: '#ffeccc',
      hemiSky: '#b8b0ff', hemiGround: '#e0a878',
      ground: '#e2c39a', groundVar: ['#d6b088', '#ecd2ad', '#cf9f7a', '#e8c49b'], path: '#f3e1c2', pathEdge: '#a07650', pathStone: '#fbeedb',
      cliffTop: '#c6a47a', soil: '#c08a62', bands: ['#e7c29b', '#d9a77e', '#f0d2ae', '#c99673', '#e2b791'], rockDark: '#7a5545',
      grass: ['#a7a457', '#b9b06a', '#949146', '#c4b979'], flowers: ['#f08a3c', '#ffd067', '#ffffff', '#d9572d'],
      grade: { lift: [0.03, 0.01, 0.03], gamma: [1, 1, 1], gain: [1.04, 1.0, 0.95], sat: 1.05, contrast: 1.05 },
    },
  },
  {
    key: 'tuz', name: 'Tuz Gölü', roman: 'IV', constellation: 'Flamingo',
    sub: 'Kristaller ışık ister, Zifir gölge.', hint: 'Işık köprüleri yalnızca kristal aydınlıkken belirir.',
    tilt: 46, thMin: 14, features: { bridges: true }, light: { sun: 0.74, hemi: 0.8 },
    pal: {
      skyLowZ: '#5d5fa4', skyLowH: '#ffb4c6', skyHighZ: '#8ab0e6', skyHighH: '#fde4f0',
      belowLow: '#f6cfe0', belowHigh: '#f4f0fb', seaDeep: '#b3a3c9', sunLow: '#ff9f86', sunHigh: '#fff2f0',
      hemiSky: '#c4c4ff', hemiGround: '#f0c4d4',
      ground: '#ebe6ef', groundVar: ['#ddd5e3', '#f4f0f6', '#d6cbdf', '#efe4ec'], path: '#b9aecb', pathEdge: '#857898', pathStone: '#d6cde4',
      cliffTop: '#f2eef5', soil: '#d9c8d6', bands: ['#ead8e2', '#d8c2d2', '#f4e8ee', '#cbb3c7', '#e2cfda'], rockDark: '#8a7690',
      grass: ['#e7e3ef', '#f5f2f8', '#d9d2e6', '#ffffff'], flowers: ['#ff8fb8', '#ffffff', '#ffc2d6', '#e86a9a'],
      grade: { lift: [0.02, 0.01, 0.04], gamma: [1.04, 1.04, 1.02], gain: [0.98, 0.96, 1.0], sat: 1.1, contrast: 1.1 },
    },
  },
  {
    key: 'ikiz', name: 'İkiz Güneş', roman: 'V', constellation: 'İkizler',
    sub: 'İki güneş, tek bir gerçek gölge.', hint: 'Gerçek gölge, iki gölgenin kesiştiği yerdir.',
    tilt: 34, thMin: 18, tilt2: 52, thMin2: 24, features: { twin: true },
    pal: {
      skyLowZ: '#24164a', skyLowH: '#ff7b9e', skyHighZ: '#352a7c', skyHighH: '#80e2d2',
      belowLow: '#d99ac0', belowHigh: '#a6e4dc', seaDeep: '#6d5a9c', sunLow: '#ffae5c', sunHigh: '#ffe7c4',
      hemiSky: '#8e7cff', hemiGround: '#5fb0a0',
      ground: '#4f6f78', groundVar: ['#466570', '#5b7c84', '#3f5a68', '#6a8a8a'], path: '#90b8b0', pathEdge: '#2e4a52', pathStone: '#b8e0d4',
      cliffTop: '#3f8a84', soil: '#5a4a72', bands: ['#6a5a8a', '#58487a', '#7c6a9a', '#4a3c6a', '#705f92'], rockDark: '#2a2040',
      grass: ['#3fb4a4', '#5fd0b8', '#2f9a90', '#3a9c8c'], flowers: ['#ff7ad0', '#7affea', '#ffd27a', '#b48aff'],
      grade: { lift: [0.03, 0.01, 0.06], gamma: [1, 1, 1], gain: [1.0, 0.99, 1.03], sat: 1.08, contrast: 1.05 },
    },
  },
  {
    key: 'buz', name: 'Buz Diyarı', roman: 'VI', constellation: 'Kutup Yıldızı',
    sub: 'Kutup ışıkları altında eriyen buz sütunları.', hint: 'Buz güneşte erir; gölgesi kısalmadan kullan.',
    tilt: 50, thMin: 13, features: { melt: true }, light: { sun: 0.82, hemi: 0.95 },
    pal: {
      skyLowZ: '#1b2a5a', skyLowH: '#ff9fbe', skyHighZ: '#2f63b0', skyHighH: '#cdeaff',
      belowLow: '#e2d4ec', belowHigh: '#e6f2fb', seaDeep: '#8aa6c8', sunLow: '#ffb08a', sunHigh: '#f2f8ff',
      hemiSky: '#a8c8ff', hemiGround: '#d8e6f4',
      ground: '#eef4fa', groundVar: ['#e2ecf6', '#f8fbff', '#d6e3f0', '#e8f0f8'], path: '#bcd2e6', pathEdge: '#7f9cb8', pathStone: '#dcebf8',
      cliffTop: '#f6f9fd', soil: '#b6cbe0', bands: ['#bcd8ee', '#9cc4e4', '#d4e8f6', '#86b0d6', '#c4dcf0'], rockDark: '#3e4f6e',
      grass: ['#e8f2fc', '#ffffff', '#cfe4f6', '#bfe0ff'], flowers: ['#ffffff', '#bfe6ff', '#e0d4ff', '#ffffff'],
      grade: { lift: [0.01, 0.02, 0.05], gamma: [1, 1, 1], gain: [0.98, 1.0, 1.03], sat: 1.04, contrast: 1.06 },
    },
  },
  {
    key: 'ayna', name: 'Ayna Sarayı', roman: 'VII', constellation: 'Lale',
    sub: 'Çini avlular, altın çerçeveli aynalar.', hint: 'Yansıyan ışık gölge tanımaz, ışını Zifir’den uzak tut.',
    tilt: 36, thMin: 17, features: { mirrors: true },
    pal: {
      skyLowZ: '#26245e', skyLowH: '#ffaa7a', skyHighZ: '#2a64c4', skyHighH: '#d4eeff',
      belowLow: '#f0cdb8', belowHigh: '#e4effa', seaDeep: '#8e8cbc', sunLow: '#ffa25c', sunHigh: '#fff3dc',
      hemiSky: '#9ab8ff', hemiGround: '#e8c8a0',
      ground: '#efe2c8', groundVar: ['#e6d6b6', '#f6ecd6', '#dccaa8', '#f2e4c6'], path: '#f8f0dc', pathEdge: '#2a6fb8', pathStone: '#ffffff',
      cliffTop: '#2a8a96', soil: '#c08a62', bands: ['#e2c29a', '#2f7fae', '#f0d6b0', '#c94e3e', '#e8cfa6'], rockDark: '#3a2a3e',
      grass: ['#7aa04a', '#8cb456', '#6a9040', '#a2c060'], flowers: ['#d63a3a', '#2a6fd0', '#ffffff', '#f2c040'],
      grade: { lift: [0.02, 0.01, 0.03], gamma: [1, 1, 1], gain: [1.02, 1.0, 0.99], sat: 1.1, contrast: 1.05 },
    },
  },
  {
    key: 'saat', name: 'Gök Saati', roman: 'VIII', constellation: 'Sarkaç',
    sub: 'Dişliler döner, sarkaç gölgeyi biçer.', hint: 'Dönen gölgeler saat gibi geri gelir. Zamanlamayı iyi ayarla.',
    tilt: 32, thMin: 15, features: { gears: true, pendulum: true }, light: { sun: 0.95, hemi: 0.9 },
    pal: {
      skyLowZ: '#1a2846', skyLowH: '#ff9458', skyHighZ: '#26527e', skyHighH: '#bfe0e6',
      belowLow: '#d8b8a0', belowHigh: '#cfe0e2', seaDeep: '#5a6a7e', sunLow: '#ff9a52', sunHigh: '#fff0d4',
      hemiSky: '#8ab4d0', hemiGround: '#b08a5a',
      ground: '#7c6c54', groundVar: ['#6e5f4a', '#88785e', '#64573f', '#92825f'], path: '#e2c88e', pathEdge: '#4e3c28', pathStone: '#f0d89e',
      cliffTop: '#b08a4a', soil: '#5a4a3a', bands: ['#8a5a3a', '#4f7a72', '#a06a42', '#3f665e', '#94643e'], rockDark: '#24242a',
      grass: ['#a8905a', '#8c7a4c', '#7e8c6a', '#9a8650'], flowers: ['#ffd27a', '#7affea', '#ffb347', '#ffffff'],
      grade: { lift: [0.02, 0.015, 0.02], gamma: [1, 1, 1], gain: [1.03, 1.0, 0.96], sat: 1.06, contrast: 1.07 },
    },
  },
];
const SUN2_COLOR = '#9fd8ff';
const SKINS = [
  { name: 'Mürekkep', c: '#7a6cff' }, { name: 'Ege Mavisi', c: '#3d8bff' }, { name: 'Rüzgâr', c: '#6fffd2' },
  { name: 'Kor', c: '#ff7a3d' }, { name: 'Gül', c: '#ff6fb1' }, { name: 'Altın', c: '#ffd36b' },
  { name: 'Kutup', c: '#9ff0ff' }, { name: 'Lale', c: '#ff4f6a' }, { name: 'Pirinç', c: '#ffb347' },
];

/* ---------- güneş geometrisi ---------- */
// u ∈ [0,1]: 0 = sol ufuk, 1 = sağ ufuk. Yay kuzeye (kameradan uzağa) eğik.
function sunDirInto(u, tilt, thMin, o) {
  const th = lerp(PI - thMin, thMin, u), s = Math.sin(th);
  o.x = Math.cos(th); o.y = s * Math.cos(tilt); o.z = -s * Math.sin(tilt);
  return o;
}
function makeSunCfg(ch) {
  return { tilt: deg(ch.tilt), thMin: deg(ch.thMin), twin: !!ch.features.twin, tilt2: deg(ch.tilt2 || ch.tilt), thMin2: deg(ch.thMin2 || ch.thMin) };
}
// ikiz güneş: ikinci güneş aynalı yolda (1-u)
function sunDirs(u, cfg, o1, o2) {
  sunDirInto(u, cfg.tilt, cfg.thMin, o1);
  if (cfg.twin && o2) sunDirInto(1 - u, cfg.tilt2, cfg.thMin2, o2);
}
const elevationOf = (L) => Math.asin(clamp(L.y, -1, 1));

/* ---------- çarpıştırıcılar (gölge düşürenler) ---------- */
let COL_ID = 1;
function cFrustum(x, z, y0, y1, r0, r1) {
  const B = (r1 - r0) / Math.max(1e-6, y1 - y0), A = r0 - B * y0;
  const c = { k: 0, id: COL_ID++, x, z, y0, y1, r0, r1, A, B, bx: x, by: (y0 + y1) / 2, bz: z, br: 0 };
  c.br = Math.hypot(Math.max(r0, r1), (y1 - y0) / 2) + 0.01; return c;
}
function cSphere(x, y, z, r, sy = 1) { return { k: 1, id: COL_ID++, x, y, z, r, sy, bx: x, by: y, bz: z, br: r * Math.max(1, sy) + 0.01 }; }
function cBox(x, y, z, hx, hy, hz, yaw = 0) {
  return { k: 2, id: COL_ID++, x, y, z, hx, hy, hz, cy: Math.cos(yaw), sy: Math.sin(yaw), yaw, bx: x, by: y, bz: z, br: Math.hypot(hx, hy, hz) + 0.01 };
}
function cObb(hx, hy, hz) { // eksenleri ve konumu her karede güncellenir
  return { k: 3, id: COL_ID++, x: 0, y: 0, z: 0, ax: 1, ay: 0, az: 0, bx_: 0, by_: 1, bz_: 0, cx: 0, cy_: 0, cz: 1, hx, hy, hz, bx: 0, by: 0, bz: 0, br: Math.hypot(hx, hy, hz) + 0.01 };
}
function slab(px, py, pz, dx, dy, dz, hx, hy, hz) {
  let tmin = -1e9, tmax = 1e9, t1, t2, tt;
  if (Math.abs(dx) < 1e-9) { if (px < -hx || px > hx) return false; } else { t1 = (-hx - px) / dx; t2 = (hx - px) / dx; if (t1 > t2) { tt = t1; t1 = t2; t2 = tt; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return false; }
  if (Math.abs(dy) < 1e-9) { if (py < -hy || py > hy) return false; } else { t1 = (-hy - py) / dy; t2 = (hy - py) / dy; if (t1 > t2) { tt = t1; t1 = t2; t2 = tt; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return false; }
  if (Math.abs(dz) < 1e-9) { if (pz < -hz || pz > hz) return false; } else { t1 = (-hz - pz) / dz; t2 = (hz - pz) / dz; if (t1 > t2) { tt = t1; t1 = t2; t2 = tt; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return false; }
  return tmax > 1e-4;
}
function rayHit(c, ox, oy, oz, dx, dy, dz) {
  // sınır küresi ile hızlı eleme
  const vx = c.bx - ox, vy = c.by - oy, vz = c.bz - oz;
  const tc = vx * dx + vy * dy + vz * dz;
  if (tc < -c.br) return false;
  if (vx * vx + vy * vy + vz * vz - tc * tc > c.br * c.br) return false;
  switch (c.k) {
    case 0: { // dikey kesik koni
      const px = ox - c.x, pz = oz - c.z;
      const w0 = c.A + c.B * oy, wk = c.B * dy;
      const a = dx * dx + dz * dz - wk * wk, b = 2 * (px * dx + pz * dz - w0 * wk), cc = px * px + pz * pz - w0 * w0;
      if (Math.abs(a) > 1e-9) {
        const disc = b * b - 4 * a * cc;
        if (disc >= 0) {
          const sq = Math.sqrt(disc);
          for (let i = 0; i < 2; i++) {
            const k = (-b + (i ? sq : -sq)) / (2 * a);
            if (k > 1e-4) { const y = oy + k * dy; if (y >= c.y0 && y <= c.y1 && w0 + k * wk >= 0) return true; }
          }
        }
      } else if (Math.abs(b) > 1e-9) {
        const k = -cc / b; if (k > 1e-4) { const y = oy + k * dy; if (y >= c.y0 && y <= c.y1) return true; }
      }
      if (Math.abs(dy) > 1e-9) {
        let k = (c.y1 - oy) / dy; if (k > 1e-4) { const hx = px + k * dx, hz = pz + k * dz; if (hx * hx + hz * hz <= c.r1 * c.r1) return true; }
        k = (c.y0 - oy) / dy; if (k > 1e-4) { const hx = px + k * dx, hz = pz + k * dz; if (hx * hx + hz * hz <= c.r0 * c.r0) return true; }
      }
      return false;
    }
    case 1: { // elipsoid
      const isy = 1 / c.sy, px = ox - c.x, py = (oy - c.y) * isy, pz = oz - c.z, ey = dy * isy;
      const a = dx * dx + ey * ey + dz * dz, b = 2 * (px * dx + py * ey + pz * dz), cc = px * px + py * py + pz * pz - c.r * c.r;
      if (cc < 0) return true; if (b > 0) return false;
      return b * b - 4 * a * cc >= 0;
    }
    case 2: { // y ekseninde dönmüş kutu
      const wx = ox - c.x, wz = oz - c.z;
      const lx = c.cy * wx - c.sy * wz, lz = c.sy * wx + c.cy * wz;
      const ldx = c.cy * dx - c.sy * dz, ldz = c.sy * dx + c.cy * dz;
      return slab(lx, oy - c.y, lz, ldx, dy, ldz, c.hx, c.hy, c.hz);
    }
    case 3: { // genel yönlendirilmiş kutu (dönen kanatlar)
      const wx = ox - c.x, wy = oy - c.y, wz = oz - c.z;
      return slab(wx * c.ax + wy * c.ay + wz * c.az, wx * c.bx_ + wy * c.by_ + wz * c.bz_, wx * c.cx + wy * c.cy_ + wz * c.cz,
        dx * c.ax + dy * c.ay + dz * c.az, dx * c.bx_ + dy * c.by_ + dz * c.bz_, dx * c.cx + dy * c.cy_ + dz * c.cz, c.hx, c.hy, c.hz);
    }
  }
  return false;
}
function occluded(cols, x, y, z, L, skipId) {
  for (let i = 0, n = cols.length; i < n; i++) { const c = cols[i]; if (c.id !== skipId && rayHit(c, x, y, z, L.x, L.y, L.z)) return true; }
  return false;
}
// ikiz güneşte: herhangi biri görüyorsa aydınlık
function pointLit(cols, x, y, z, L1, L2, skipId = -1) {
  if (!occluded(cols, x, y, z, L1, skipId)) return true;
  if (L2 && !occluded(cols, x, y, z, L2, skipId)) return true;
  return false;
}
const ZIFIR_HALF = 0.26, ZIFIR_Y = 0.16;
function exposureAt(cols, x, z, nx, nz, L1, L2) {
  let lit = 0;
  for (let k = -1; k <= 1; k++) if (pointLit(cols, x + nx * ZIFIR_HALF * k, ZIFIR_Y, z + nz * ZIFIR_HALF * k, L1, L2)) lit++;
  return lit / 3;
}

/* ---------- hareketli gölge düşürenler ---------- */
const WRAP = 48;
const wrapX = (x) => ((((x + WRAP) % (2 * WRAP)) + 2 * WRAP) % (2 * WRAP)) - WRAP;
function moverPose(m, t, o) {
  if (m.kind === 'cloud') { o.x = wrapX(m.x0 + m.vx * t); o.y = m.y0 + Math.sin(t * 0.4 + m.ph) * 0.15; o.z = m.z0; }
  else if (m.kind === 'balloon') { o.x = wrapX(m.x0 + m.vx * t); o.y = m.y0 + Math.sin(t * m.w + m.ph) * m.amp; o.z = m.z0 + Math.sin(t * 0.13 + m.ph) * 0.6; }
  return o;
}
const _mp = { x: 0, y: 0, z: 0 };
const moverCols = (m) => m.cols || m.parts.map((p) => p.c);
function refreshFrustum(c) { c.B = (c.r1 - c.r0) / Math.max(1e-6, c.y1 - c.y0); c.A = c.r0 - c.B * c.y0; c.bx = c.x; c.bz = c.z; c.by = (c.y0 + c.y1) / 2; c.br = Math.hypot(Math.max(c.r0, c.r1), (c.y1 - c.y0) / 2) + 0.01; }
function moverUpdate(m, t) {
  if (m.kind === 'sails') {
    const ang = m.a0 + m.w * t;
    // kanat düzlemi: normal n (yatay), yukarı u, yan s
    for (let i = 0; i < m.cols.length; i++) {
      const a = ang + (i * TAU) / m.cols.length, ca = Math.cos(a), sn = Math.sin(a);
      const bx = m.sx * sn, by = ca, bz = m.sz * sn; // kanat yönü (yan*sin + yukarı*cos)
      const c = m.cols[i], off = m.len * 0.5 + 0.22;
      c.x = m.hx + bx * off; c.y = m.hy + by * off; c.z = m.hz + bz * off;
      c.ax = bx; c.ay = by; c.az = bz; // uzunluk ekseni
      c.cx = m.nx; c.cy_ = 0; c.cz = m.nz; // kalınlık ekseni (normal)
      c.bx_ = c.ay * c.cz - c.az * c.cy_; c.by_ = c.az * c.cx - c.ax * c.cz; c.bz_ = c.ax * c.cy_ - c.ay * c.cx; // genişlik
      c.bx = c.x; c.by = c.y; c.bz = c.z;
    }
  } else if (m.kind === 'melt') {
    // buz: zamanla erir, gölgesi kısalır
    const f = 1 - m.drop * smoothstep(m.t0, m.t1, t); m.f = f;
    for (let i = 0; i < m.cols.length; i++) { const c = m.cols[i], b = m.base[i]; c.y0 = b.y0 * f; c.y1 = b.y1 * f; c.r0 = b.r0 * (0.75 + 0.25 * f); c.r1 = b.r1 * (0.75 + 0.25 * f); refreshFrustum(c); }
  } else if (m.kind === 'orbit') {
    // dişli platform: üstündeki kuleler merkez etrafında döner
    const a = m.a0 + m.w * t; m.ang = a;
    for (const it of m.items) { const ph = it.phi + a; const c = it.c; c.x = m.cx + Math.cos(ph) * it.rho; c.z = m.cz + Math.sin(ph) * it.rho; c.bx = c.x; c.bz = c.z; }
  } else if (m.kind === 'pendulum') {
    const ang = m.amp * Math.sin(m.w * t + m.ph); m.ang = ang;
    const c = m.cols[0];
    c.x = m.px + Math.sin(ang) * m.L * m.dx; c.z = m.pz + Math.sin(ang) * m.L * m.dz; c.y = m.py - Math.cos(ang) * m.L;
    c.bx = c.x; c.by = c.y; c.bz = c.z;
  } else {
    moverPose(m, t, _mp);
    for (const p of m.parts) { const c = p.c; c.x = _mp.x + p.dx; c.y = _mp.y + p.dy; c.z = _mp.z + p.dz; c.bx = c.x; c.by = c.y; c.bz = c.z; }
  }
}
function updateMovers(level, t) { for (const m of level.movers) moverUpdate(m, t); }

/* ---------- aynalar: yansıyan ışık gölge tanımaz ----------
   Nokta P, aynanın yansıttığı ışığı alıyorsa P'den "sanal güneş" yönünde
   giden ışın ayna dikdörtgenine çarpar. */
function mirrorVDir(mr, L, o) {
  const dn = L.x * mr.nx + L.y * mr.ny + L.z * mr.nz;
  if (dn <= 0.03) return null;
  o.x = L.x - 2 * dn * mr.nx; o.y = L.y - 2 * dn * mr.ny; o.z = L.z - 2 * dn * mr.nz;
  return o;
}
function mirrorHit(mr, d, x, y, z) {
  const px = x - mr.x, py = y - mr.y, pz = z - mr.z, pn = px * mr.nx + py * mr.ny + pz * mr.nz;
  if (pn <= 0) return false;
  const dn = d.x * mr.nx + d.y * mr.ny + d.z * mr.nz; if (dn >= -1e-4) return false;
  const t = -pn / dn;
  const hx = px + d.x * t, hy = py + d.y * t, hz = pz + d.z * t;
  return Math.abs(hx * mr.ux + hy * mr.uy + hz * mr.uz) <= mr.hh && Math.abs(hx * mr.vx + hy * mr.vy + hz * mr.vz) <= mr.hw;
}
const _vd = { x: 0, y: 0, z: 0 };
function mirrorsLit(mirrors, x, y, z, L) {
  for (const mr of mirrors) { const d = mirrorVDir(mr, L, _vd); if (d && mirrorHit(mr, d, x, y, z)) return true; }
  return false;
}
// güneş patlaması: [uyarı, etkin, bitiş] pencereleri
const FLARE_MUL = 2.1;
function flareMul(lv, t) { if (!lv.flares) return 1; for (const f of lv.flares) if (t >= f.a && t <= f.e) return FLARE_MUL; return 1; }
function flarePhase(lv, t) { if (!lv.flares) return 0; for (const f of lv.flares) { if (t >= f.w && t < f.a) return 1; if (t >= f.a && t <= f.e) return 2; } return 0; }

/* ---------- yol örnekleme ---------- */
function pathAt(path, s, o) {
  const f = clamp(s / path.ds, 0, path.n - 1.0001), i = Math.floor(f), t = f - i;
  const x0 = path.x[i], z0 = path.z[i], x1 = path.x[i + 1], z1 = path.z[i + 1];
  o.x = x0 + (x1 - x0) * t; o.z = z0 + (z1 - z0) * t;
  let tx = x1 - x0, tz = z1 - z0; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  o.tx = tx; o.tz = tz; o.nx = -tz; o.nz = tx;
  return o;
}
function distToPath(path, x, z, sFrom = 0, sTo = 1e9) {
  let best = 1e9;
  const i0 = Math.max(0, Math.floor(sFrom / path.ds)), i1 = Math.min(path.n - 1, Math.ceil(sTo / path.ds));
  for (let i = i0; i <= i1; i++) { const dx = path.x[i] - x, dz = path.z[i] - z, d = dx * dx + dz * dz; if (d < best) best = d; }
  return Math.sqrt(best);
}
