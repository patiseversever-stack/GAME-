// Gece Postası — sayfa/kamera geometrisi.
// Yükleme ekranı, oyunun ilk "tam sayfa" karesinde kâğıdın ekranda tam olarak nerede duracağını
// oyun henüz yüklenmeden tahmin eder (oyundaki Director.frame + viewportLayout matematiğinin kopyası),
// böylece merkezi sayfa çıkışta gerçek sayfaya "uyumlu" bağlanır. Oyun hazır olunca gerçek köşeler
// (Posta.screenPoint) ile düzeltilir; bu modül yalnızca saf matematik içerir (DOM'a dokunmaz).

export const PW = 1800, PH = 1160;           // sayfa birimi (oyundaki PW/PH)
const W = 5.4, H = W * PH / PW, UNIT = W / PW; // 3B dünyadaki kâğıt boyutu
const FOV = 32, PITCH = 0.255;                // oyundaki kamera: dikey görüş açısı ve "tam sayfa" eğimi

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const mix = (a, b, t) => a + (b - a) * t;

// Oyundaki heightAt: kâğıt hafifçe dalgalı, köşeleri kıvrık.
const heightAt = (x, z) => .034 + .009 * Math.exp(-Math.pow(x / .035, 2)) + .0028 * Math.sin(x * 3.5 + z * 3) + .0015 * Math.sin(z * 13 + x * 7)
  + .018 * Math.pow(Math.abs(x) / (W / 2), 18) + .014 * Math.pow(Math.abs(z) / (H / 2), 20)
  + .063 * Math.exp(-Math.pow((x - W / 2) / .24, 2) - Math.pow((z - H / 2) / .24, 2))
  + .032 * Math.exp(-Math.pow((x + W / 2) / .22, 2) - Math.pow((z + H / 2) / .24, 2));

// Oyundaki viewportLayout (yalnızca "tam sayfa" kadrajı için gereken kısım).
function layoutOf(w, h, coarse) {
  const compact = w > h && (h <= 600 || coarse);
  const edge = clamp(Math.round(h * .023), 6, 14), rail = h <= 340 ? 44 : 48;
  return { compact, edge, rail };
}

// Oyundaki Director.frame(rect, 'overview') → kamera pozu.
export function overviewPose(sw, sh, coarse) {
  const L = layoutOf(sw, sh, coarse);
  let safe;
  if (L.compact) safe = { x: L.edge + L.rail + 8, y: L.edge, w: sw - 2 * (L.edge + L.rail + 8), h: sh - L.edge * 2 };
  else safe = { x: sw < 700 ? 12 : 42, y: sh < 550 ? 42 : 64, w: sw - (sw < 700 ? 24 : 84), h: sh - (sh < 550 ? 74 : 104) };
  safe.h = Math.max(75, safe.h);
  const tan = Math.tan(FOV * Math.PI / 360), aspect = sw / sh;
  const ww = PW * UNIT, hh = PH * UNIT * Math.cos(PITCH);
  const d = clamp(Math.max(ww / (2 * tan * aspect * safe.w / sw), hh / (2 * tan * safe.h / sh)) * 1.06, .88, 26);
  return { d, pitch: PITCH, ox: sw / 2 - (safe.x + safe.w / 2), oy: sh / 2 - (safe.y + safe.h / 2), safe };
}

// Pozdan ekran koordinatı: sayfa birimi (x,y) → piksel. Oyundaki PaperScene.project ile aynı (lift=.009).
export function projector(sw, sh, pose, lift = .009) {
  const c = Math.cos(pose.pitch), s = Math.sin(pose.pitch);
  const px = 0, py = pose.d * c, pz = pose.d * s;      // kamera konumu
  // lookAt(0,0,0), yukarı=(0,1,0) → kamera tabanı
  let zx = px, zy = py, zz = pz; const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
  let xx = zz, xy = 0, xz = -zx;                          // up × z, up=(0,1,0)
  const xl = Math.hypot(xx, xy, xz); xx /= xl; xy /= xl; xz /= xl;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx; // z × x
  const tan = Math.tan(FOV * Math.PI / 360), aspect = sw / sh;
  return (x, y) => {
    const wx = (x / PW - .5) * W, wz = (y / PH - .5) * H, wy = heightAt(wx, wz) + lift;
    const dx = wx - px, dy = wy - py, dz = wz - pz;
    const cx = dx * xx + dy * xy + dz * xz, cy = dx * yx + dy * yy + dz * yz, cz = dx * zx + dy * zy + dz * zz;
    const nx = (cx / -cz) / (tan * aspect), ny = (cy / -cz) / tan;
    return { x: (nx + 1) * sw / 2 - pose.ox, y: (1 - ny) * sh / 2 - pose.oy };
  };
}

// Oyunun "tam sayfa" kadrajında kâğıdın dört köşesi: [SolÜst, SağÜst, SağAlt, SolAlt] (piksel).
export function predictOverviewQuad(sw, sh, coarse) {
  const pose = overviewPose(sw, sh, coarse), project = projector(sw, sh, pose);
  return [[0, 0], [PW, 0], [PW, PH], [0, PH]].map(([x, y]) => project(x, y));
}

// ---- Dörtgen yardımcıları -------------------------------------------------------------------
export const centroid = q => ({ x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 });
export const scaleQuad = (q, k, about = centroid(q)) => q.map(p => ({ x: about.x + (p.x - about.x) * k, y: about.y + (p.y - about.y) * k }));
export const moveQuad = (q, dx, dy) => q.map(p => ({ x: p.x + dx, y: p.y + dy }));
export const lerpQuad = (a, b, t) => a.map((p, i) => ({ x: mix(p.x, b[i].x, t), y: mix(p.y, b[i].y, t) }));
export const quadBounds = q => { const xs = q.map(p => p.x), ys = q.map(p => p.y); const l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys); return { l, r, t, b, w: r - l, h: b - t }; };
// Bir 2B afin dönüşümü (a,b,c,d,e,f) dörtgene uygular.
export const transformQuad = (q, m) => q.map(p => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f }));

// ---- Homografi: birim dikdörtgen (0,0)-(w,h) → dörtgen --------------------------------------
// 8x8 doğrusal sistemi Gauss eliminasyonu ile çözer; CSS matrix3d döndürür (transform-origin: 0 0).
export function homography(w, h, q) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], X = q[i].x, Y = q[i].y;
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  const n = 8;
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  const [a, bb, c, d, e, f, g, hh] = x;
  // CSS matrix3d sütun-öncelikli:
  const m = [a, d, 0, g, bb, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1];
  return 'matrix3d(' + m.map(v => +v.toFixed(7)).join(',') + ')';
}

// ---- Yol: dörtgenin dışa kaydırılmış, köşeleri yuvarlatılmış çevresi (harf bandı için) -------
export function offsetQuad(q, m) {
  const c = centroid(q), out = [];
  const lines = [];
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    let nx = b.y - a.y, ny = a.x - b.x; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    // merkezden dışarı bakan yön
    if ((a.x - c.x) * nx + (a.y - c.y) * ny < 0) { nx = -nx; ny = -ny; }
    lines.push({ px: a.x + nx * m, py: a.y + ny * m, dx: b.x - a.x, dy: b.y - a.y });
  }
  for (let i = 0; i < 4; i++) {
    const p = lines[(i + 3) % 4], n = lines[i];
    const det = p.dx * n.dy - p.dy * n.dx;
    const t = ((n.px - p.px) * n.dy - (n.py - p.py) * n.dx) / det;
    out.push({ x: p.px + p.dx * t, y: p.py + p.dy * t });
  }
  return out;
}

// Köşeleri r yarıçaplı yayla yuvarlanmış kapalı yol; dönüş: { pts:[{x,y}], len } (kapalı, ilk nokta tekrarlanmaz)
export function roundedLoop(q, r, arcSteps = 6) {
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const p = q[(i + 3) % 4], c = q[i], n = q[(i + 1) % 4];
    const v1 = { x: p.x - c.x, y: p.y - c.y }, v2 = { x: n.x - c.x, y: n.y - c.y };
    const l1 = Math.hypot(v1.x, v1.y), l2 = Math.hypot(v2.x, v2.y);
    const rr = Math.min(r, l1 * .45, l2 * .45);
    const a = { x: c.x + v1.x / l1 * rr, y: c.y + v1.y / l1 * rr }, b = { x: c.x + v2.x / l2 * rr, y: c.y + v2.y / l2 * rr };
    for (let k = 0; k <= arcSteps; k++) { // ikinci dereceden Bézier yay (köşe kontrol noktası)
      const t = k / arcSteps, u = 1 - t;
      pts.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
    }
  }
  let len = 0; const seg = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = Math.hypot(b.x - a.x, b.y - a.y); seg.push(l); len += l; }
  return { pts, seg, len };
}

// Yolda s (0..len) konumundaki nokta.
export function pointOnLoop(loop, s) {
  s = ((s % loop.len) + loop.len) % loop.len;
  for (let i = 0; i < loop.pts.length; i++) {
    if (s <= loop.seg[i] || i === loop.pts.length - 1) {
      const a = loop.pts[i], b = loop.pts[(i + 1) % loop.pts.length], t = loop.seg[i] ? s / loop.seg[i] : 0;
      return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) };
    }
    s -= loop.seg[i];
  }
  return loop.pts[0];
}
