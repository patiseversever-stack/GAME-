// Taş takımlarının ortak çizim motoru: gürültü, renk, yol/şekil, sır (çini), mürekkep (ebru), empasto (yağlı boya),
// metal varak ve ebru mermerleme (damla/tarak/dalga ters eşleme).
/* eski Safari için roundRect */
if (!CanvasRenderingContext2D.prototype.roundRect)
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(Array.isArray(r) ? r[0] : r || 0, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };

export const idle = () => new Promise((r) => setTimeout(r, 0));
/* ═════════════ temel araçlar ═════════════ */
export const MW = 480,
  MH = 653;
export const TAU = Math.PI * 2;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeNoise(seed) {
  const R = rng(seed),
    perm = new Uint8Array(256),
    p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (R() * (i + 1)) | 0;
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const GX = [1, -1, 1, -1, 1, -1, 0, 0],
    GY = [1, 1, -1, -1, 0, 0, 1, -1];
  function n2(x, y) {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      X = xi & 255,
      Y = yi & 255;
    const xf = x - xi,
      yf = y - yi;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10),
      v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const aa = p[p[X] + Y] & 7,
      ab = p[p[X] + Y + 1] & 7,
      ba = p[p[X + 1] + Y] & 7,
      bb = p[p[X + 1] + Y + 1] & 7;
    const x1 = GX[aa] * xf + GY[aa] * yf,
      x2 = GX[ba] * (xf - 1) + GY[ba] * yf;
    const y1 = GX[ab] * xf + GY[ab] * (yf - 1),
      y2 = GX[bb] * (xf - 1) + GY[bb] * (yf - 1);
    const l1 = x1 + u * (x2 - x1),
      l2 = y1 + u * (y2 - y1);
    return l1 + v * (l2 - l1);
  }
  function fbm(x, y, oct = 4) {
    let s = 0,
      a = 0.5,
      f = 1;
    for (let i = 0; i < oct; i++) {
      s += a * n2(x * f, y * f);
      f *= 2.03;
      a *= 0.5;
    }
    return s;
  }
  return { n2, fbm };
}
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const hx = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const tone = (h, k, a = 1) => css(k >= 0 ? mixc(hx(h), [255, 255, 255], k) : mixc(hx(h), [0, 0, 0], -k), a);
export function mixInto(o, c, t) {
  t = clamp(t);
  o[0] += (c[0] - o[0]) * t;
  o[1] += (c[1] - o[1]) * t;
  o[2] += (c[2] - o[2]) * t;
}
export function ramp(stops) {
  const s = stops.map(([t, c]) => [t, hx(c)]);
  return (t, o) => {
    t = clamp(t);
    let i = 0;
    while (i < s.length - 2 && t > s[i + 1][0]) i++;
    const [t0, c0] = s[i],
      [t1, c1] = s[i + 1],
      u = clamp((t - t0) / (t1 - t0 || 1));
    o[0] = c0[0] + (c1[0] - c0[0]) * u;
    o[1] = c0[1] + (c1[1] - c0[1]) * u;
    o[2] = c0[2] + (c1[2] - c0[2]) * u;
    return o;
  };
}
export function hsl(h, s, l, o) {
  h = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
    p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  o[0] = f(h + 1 / 3) * 255;
  o[1] = f(h) * 255;
  o[2] = f(h - 1 / 3) * 255;
  return o;
}
export function canvas(w = MW, h = MH) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
export function pixels(w, h, fn) {
  const c = canvas(w, h),
    x = c.getContext('2d'),
    img = x.createImageData(w, h),
    d = img.data,
    o = [0, 0, 0, 255];
  let q = 0;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++, q += 4) {
      o[3] = 255;
      fn(i, j, o);
      d[q] = o[0];
      d[q + 1] = o[1];
      d[q + 2] = o[2];
      d[q + 3] = o[3];
    }
  x.putImageData(img, 0, 0);
  return c;
}
export const SCR = [];
export function scratch(i, b) {
  if (!SCR[i]) SCR[i] = canvas();
  const c = SCR[i],
    x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.shadowColor = 'rgba(0,0,0,0)';
  x.shadowBlur = 0;
  x.shadowOffsetX = 0;
  x.shadowOffsetY = 0;
  if (b) x.clearRect(b[0] - 2, b[1] - 2, b[2] + 4, b[3] + 4);
  else x.clearRect(0, 0, MW, MH);
  x.fillStyle = '#000';
  x.strokeStyle = '#000';
  x.lineJoin = 'round';
  x.lineCap = 'round';
  return [c, x];
}
export const MEAS = canvas(8, 8).getContext('2d');
export const cache = {};
export const once = (k, fn) => cache[k] || (cache[k] = fn());

export function poly(x, P, closed = true) {
  x.beginPath();
  x.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) x.lineTo(P[i][0], P[i][1]);
  if (closed) x.closePath();
}
export function offsetPts(P, d, closed = true) {
  const N = P.length;
  return P.map((p, i) => {
    const a = closed ? P[(i - 1 + N) % N] : P[Math.max(0, i - 1)],
      b = closed ? P[(i + 1) % N] : P[Math.min(N - 1, i + 1)];
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / L) * d, p[1] + (dx / L) * d];
  });
}
export function rrPoints(x0, y0, w, h, r, step = 5) {
  const pts = [];
  const seg = (ax, ay, bx, by) => {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]);
  };
  const arc = (cx, cy, a0, a1) => {
    const n = Math.max(2, Math.ceil((r * Math.abs(a1 - a0)) / step));
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  seg(x0 + r, y0, x0 + w - r, y0);
  arc(x0 + w - r, y0 + r, -Math.PI / 2, 0);
  seg(x0 + w, y0 + r, x0 + w, y0 + h - r);
  arc(x0 + w - r, y0 + h - r, 0, Math.PI / 2);
  seg(x0 + w - r, y0 + h, x0 + r, y0 + h);
  arc(x0 + r, y0 + h - r, Math.PI / 2, Math.PI);
  seg(x0, y0 + h - r, x0, y0 + r);
  arc(x0 + r, y0 + r, Math.PI, Math.PI * 1.5);
  return pts;
}
export function bez(P0, P1, P2, P3, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      m = 1 - t;
    out.push([m * m * m * P0[0] + 3 * m * m * t * P1[0] + 3 * m * t * t * P2[0] + t * t * t * P3[0], m * m * m * P0[1] + 3 * m * m * t * P1[1] + 3 * m * t * t * P2[1] + t * t * t * P3[1]]);
  }
  return out;
}

/* ── şekiller: shape(ctx, 'fill' | 'stroke') ── */
export const pathShape = (build) => (x, mode) => {
  build(x);
  if (mode === 'fill') x.fill();
  else x.stroke();
};
export const textShape = (L) => (x, mode) => {
  x.save();
  x.font = L.font;
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  x.translate(L.x, L.y);
  x.scale(L.sx, 1);
  if (mode === 'fill') x.fillText(L.text, 0, 0);
  else x.strokeText(L.text, 0, 0);
  x.restore();
};
export function spacedShape(text, font, cx, y, sp) {
  return (x, mode) => {
    x.save();
    x.font = font;
    x.textAlign = 'left';
    x.textBaseline = 'alphabetic';
    const ch = [...text],
      ws = ch.map((c) => x.measureText(c).width);
    let px = cx - (ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1)) / 2;
    ch.forEach((c, i) => {
      if (mode === 'fill') x.fillText(c, px, y);
      else x.strokeText(c, px, y);
      px += ws[i] + sp;
    });
    x.restore();
  };
}
export function markPath(x, color, cx, cy, s) {
  x.beginPath();
  if (color === 'red') x.arc(cx, cy, s * 0.5, 0, TAU);
  else if (color === 'blue') {
    const r = s * 0.62;
    x.moveTo(cx, cy - r);
    x.lineTo(cx + r, cy);
    x.lineTo(cx, cy + r);
    x.lineTo(cx - r, cy);
    x.closePath();
  } else if (color === 'black') {
    const w = s * 1.18,
      h = s * 1.02;
    x.moveTo(cx, cy - h * 0.56);
    x.lineTo(cx + w / 2, cy + h * 0.44);
    x.lineTo(cx - w / 2, cy + h * 0.44);
    x.closePath();
  } else {
    const a = s * 0.9;
    x.roundRect(cx - a / 2, cy - a / 2, a, a, a * 0.16);
  }
}
export function star5Path(x, cx, cy, r, inner = 0.42, rot = -Math.PI / 2) {
  x.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = rot + (k * Math.PI) / 5,
      rr = k % 2 ? r * inner : r;
    const px = cx + Math.cos(a) * rr,
      py = cy + Math.sin(a) * rr;
    k ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
}
export function star8Path(x, cx, cy, r, rot = -Math.PI / 2) {
  const ri = r * 0.7654;
  x.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = rot + (k * Math.PI) / 8,
      rr = k % 2 ? ri : r;
    const px = cx + Math.cos(a) * rr,
      py = cy + Math.sin(a) * rr;
    k ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
}
export function octPath(x, cx, cy, r, rot = -Math.PI / 2 + Math.PI / 8) {
  x.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = rot + (k * Math.PI) / 4;
    const px = cx + Math.cos(a) * r,
      py = cy + Math.sin(a) * r;
    k ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
}
export function pawPath(x, cx, cy, s) {
  x.beginPath();
  const w = s * 0.6,
    h = s * 0.5,
    y = cy + s * 0.2;
  x.moveTo(cx, y - h * 0.5);
  x.bezierCurveTo(cx + w * 0.36, y - h * 0.5, cx + w * 0.52, y + h * 0.02, cx + w * 0.49, y + h * 0.26);
  x.bezierCurveTo(cx + w * 0.46, y + h * 0.52, cx + w * 0.2, y + h * 0.56, cx, y + h * 0.42);
  x.bezierCurveTo(cx - w * 0.2, y + h * 0.56, cx - w * 0.46, y + h * 0.52, cx - w * 0.49, y + h * 0.26);
  x.bezierCurveTo(cx - w * 0.52, y + h * 0.02, cx - w * 0.36, y - h * 0.5, cx, y - h * 0.5);
  x.closePath();
  for (const [dx, dy, rx, ry, rot] of [
    [-0.39, -0.11, 0.12, 0.155, -0.4],
    [-0.14, -0.33, 0.125, 0.165, -0.12],
    [0.14, -0.33, 0.125, 0.165, 0.12],
    [0.39, -0.11, 0.12, 0.155, 0.4],
  ]) {
    x.moveTo(cx + dx * s + rx * s, cy + dy * s);
    x.ellipse(cx + dx * s, cy + dy * s, rx * s, ry * s, rot, 0, TAU);
  }
}
export function pawPads(cx, cy, s) {
  return [
    [0, 0.2, 0.2, 0.15],
    [-0.39, -0.11, 0.06, 0.08],
    [-0.14, -0.33, 0.065, 0.085],
    [0.14, -0.33, 0.065, 0.085],
    [0.39, -0.11, 0.06, 0.08],
  ].map(([dx, dy, rx, ry]) => [cx + dx * s, cy + dy * s, rx * s, ry * s]);
}
export function rosettePath(x, cx, cy, r, n = 5, rot = -Math.PI / 2) {
  x.beginPath();
  for (let k = 0; k < n; k++) {
    const a = rot + (k * TAU) / n,
      px = cx + Math.cos(a) * r * 0.56,
      py = cy + Math.sin(a) * r * 0.56;
    x.moveTo(px + r * 0.44, py);
    x.arc(px, py, r * 0.44, 0, TAU);
  }
}
export function leafPath(x, cx, cy, len, ang, wid = 0.36) {
  const c = Math.cos(ang),
    s = Math.sin(ang),
    P = (a, b) => [cx + a * c - b * s, cy + a * s + b * c];
  x.beginPath();
  x.moveTo(...P(-len, 0));
  x.quadraticCurveTo(...P(0, -len * wid * 1.7), ...P(len, 0));
  x.quadraticCurveTo(...P(0, len * wid * 1.7), ...P(-len, 0));
  x.closePath();
}
export function catPath(p, cx, by, h, f = 1) {
  const s = h / 100,
    P = (a, b) => [cx + a * s * f, by + b * s];
  p.moveTo(...P(-26, 0));
  p.bezierCurveTo(...P(-37, -30), ...P(-27, -60), ...P(-6, -66));
  p.bezierCurveTo(...P(6, -70), ...P(16, -60), ...P(17, -48));
  p.bezierCurveTo(...P(22, -30), ...P(20, -10), ...P(25, 0));
  p.closePath();
  const hc = P(4, -79);
  p.moveTo(hc[0] + 15 * s, hc[1]);
  p.arc(hc[0], hc[1], 15 * s, 0, TAU, f < 0);
  p.moveTo(...P(-9, -87));
  p.lineTo(...P(-7, -106));
  p.lineTo(...P(3, -93));
  p.closePath();
  p.moveTo(...P(8, -93));
  p.lineTo(...P(19, -105));
  p.lineTo(...P(18, -86));
  p.closePath();
}
export function catTail(cx, by, h, f = 1) {
  const s = h / 100,
    P = (a, b) => [cx + a * s * f, by + b * s],
    p = new Path2D();
  p.moveTo(...P(-20, -4));
  p.bezierCurveTo(...P(-48, -2), ...P(-62, -12), ...P(-57, -30));
  return p;
}
export function crackle(x, seed, color, count, step = 7) {
  const R = rng(seed);
  x.save();
  x.strokeStyle = color;
  x.lineWidth = 0.9;
  x.lineJoin = 'round';
  for (let k = 0; k < count; k++) {
    let px = R() * MW,
      py = R() * MH,
      a = R() * TAU;
    x.beginPath();
    x.moveTo(px, py);
    const n = (5 + R() * 12) | 0;
    for (let s = 0; s < n; s++) {
      a += (R() - 0.5) * 1.3;
      px += Math.cos(a) * step;
      py += Math.sin(a) * step;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  x.restore();
}
export function brush(x, pts, w, color, alpha, seed, closed = true) {
  const n = makeNoise(seed);
  const P = pts.map(([px, py], i) => [px + n.n2(i * 0.11, 1.7) * w * 0.2, py + n.n2(i * 0.11, 8.3) * w * 0.2]);
  x.save();
  x.lineJoin = 'round';
  x.lineCap = 'round';
  x.globalAlpha = alpha;
  x.strokeStyle = color;
  x.lineWidth = w;
  poly(x, P, closed);
  x.stroke();
  x.globalAlpha = alpha * 0.5;
  x.strokeStyle = tone(color, -0.35);
  x.lineWidth = w * 0.22;
  poly(x, offsetPts(P, w * 0.38, closed), closed);
  x.stroke();
  poly(x, offsetPts(P, -w * 0.38, closed), closed);
  x.stroke();
  x.globalAlpha = alpha * 0.3;
  x.strokeStyle = tone(color, 0.35);
  x.lineWidth = w * 0.18;
  poly(x, offsetPts(P, -w * 0.06, closed), closed);
  x.stroke();
  x.restore();
}
export function goldGrad(x) {
  const g = x.createLinearGradient(0, 0, MW, MH);
  [
    [0, '#6e4b14'],
    [0.16, '#c99a3c'],
    [0.3, '#f6e3a1'],
    [0.42, '#d7ac4a'],
    [0.56, '#8a6020'],
    [0.7, '#e2bd62'],
    [0.84, '#fff0b8'],
    [1, '#a77a2a'],
  ].forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}
export function brassGrad(x) {
  const g = x.createLinearGradient(0, 0, MW, MH);
  [
    [0, '#7a5a22'],
    [0.2, '#c9a24e'],
    [0.34, '#f1dc9a'],
    [0.5, '#b38a3a'],
    [0.68, '#e0c47c'],
    [0.85, '#8f6c2c'],
    [1, '#d8b866'],
  ].forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}

/* ── ortak dokular ── */
export const TEX = {};
export async function buildTextures() {
  if (TEX.dark) return;
  const n = makeNoise(99),
    m = makeNoise(7);
  TEX.dark = pixels(MW, MH, (i, j, o) => {
    const b = n.fbm(i * 0.018, j * 0.018, 4) * 0.5 + 0.5,
      g = m.n2(i * 0.45, j * 0.45) * 0.5 + 0.5;
    o[0] = o[1] = o[2] = 0;
    o[3] = 255 * clamp((b - 0.38) * 1.5 + g * 0.18);
  });
  await idle();
  TEX.light = pixels(MW, MH, (i, j, o) => {
    const b = m.fbm(i * 0.022 + 40, j * 0.022 + 40, 4) * 0.5 + 0.5;
    o[0] = o[1] = o[2] = 255;
    o[3] = 255 * clamp((b - 0.5) * 1.7);
  });
  const R = rng(4);
  TEX.grain = pixels(MW, MH, (i, j, o) => {
    const r = R();
    o[0] = o[1] = o[2] = r < 0.5 ? 0 : 255;
    o[3] = 255 * Math.abs(r - 0.5) * 0.45;
  });
  await idle();
  TEX.weave = pixels(MW, MH, (i, j, o) => {
    const w = Math.sin(i * 1.75) * 0.5 + Math.sin(j * 1.75) * 0.5,
      nn = n.n2(i * 0.6, j * 0.6);
    const v = 128 + w * 26 + nn * 22 + (R() - 0.5) * 18;
    o[0] = o[1] = o[2] = v;
  });
}

/* ── malzemeler: aynı şekli farklı tekniklerle boyar ── */
export const FULL = [0, 0, MW, MH];
export const around = (cx, cy, r) => {
  const x0 = Math.max(0, Math.floor(cx - r)),
    y0 = Math.max(0, Math.floor(cy - r));
  return [x0, y0, Math.min(MW, Math.ceil(cx + r)) - x0, Math.min(MH, Math.ceil(cy + r)) - y0];
};
export function sub(x, img, b) {
  if (b[2] > 0 && b[3] > 0) x.drawImage(img, b[0], b[1], b[2], b[3], b[0], b[1], b[2], b[3]);
}
export function paintGlaze(x, shape, ink, o = {}) {
  const b = o.bb || FULL;
  const [m, mx] = scratch(0, b);
  mx.fillStyle = ink;
  shape(mx, 'fill');
  mx.globalCompositeOperation = 'source-atop';
  mx.globalAlpha = o.mottle ?? 0.3;
  sub(mx, TEX.dark, b);
  mx.globalAlpha = 0.16;
  sub(mx, TEX.light, b);
  mx.globalAlpha = 0.55;
  mx.strokeStyle = tone(ink, -0.45);
  mx.lineWidth = o.pool ?? MW * 0.016;
  shape(mx, 'stroke');
  mx.globalAlpha = 1;
  mx.globalCompositeOperation = 'source-over';
  x.save();
  x.globalAlpha = 0.45;
  x.shadowColor = tone(ink, 0, 0.8);
  x.shadowBlur = o.bleed ?? MW * 0.01;
  sub(x, m, b);
  x.restore();
  sub(x, m, b);
  if (o.contourW !== 0) {
    x.save();
    x.strokeStyle = o.contour ?? 'rgba(22,26,36,0.85)';
    x.lineWidth = o.contourW ?? MW * 0.007;
    x.lineJoin = 'round';
    shape(x, 'stroke');
    x.restore();
  }
}
export function paintLacquer(x, shape, ink, o = {}) {
  x.save();
  x.fillStyle = 'rgba(70,45,10,0.26)';
  x.translate(MW * 0.005, MW * 0.007);
  shape(x, 'fill');
  x.restore();
  const [m, mx] = scratch(0);
  mx.fillStyle = ink;
  shape(mx, 'fill');
  mx.globalCompositeOperation = 'source-atop';
  const g = mx.createLinearGradient(0, MH * 0.2, 0, MH * 0.85);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  mx.fillStyle = g;
  mx.fillRect(0, 0, MW, MH);
  mx.globalAlpha = 0.07;
  mx.drawImage(TEX.dark, 0, 0);
  mx.globalAlpha = 1;
  mx.globalCompositeOperation = 'source-over';
  x.drawImage(m, 0, 0);
  if (o.rimW !== 0) {
    x.save();
    x.strokeStyle = goldGrad(x);
    x.lineWidth = o.rimW ?? MW * 0.006;
    x.lineJoin = 'round';
    shape(x, 'stroke');
    x.restore();
  }
}
export function paintInk(x, shape, ink, o = {}) {
  x.save();
  x.shadowColor = tone(ink, 0, 0.5);
  x.shadowBlur = o.bleed ?? MW * 0.006;
  x.fillStyle = tone(ink, 0, 0.5);
  shape(x, 'fill');
  x.restore();
  const [m, mx] = scratch(0);
  mx.fillStyle = ink;
  shape(mx, 'fill');
  mx.globalCompositeOperation = 'source-atop';
  mx.globalAlpha = 0.24;
  mx.drawImage(TEX.dark, 0, 0);
  mx.globalAlpha = 0.14;
  mx.drawImage(TEX.light, 0, 0);
  mx.globalAlpha = 0.22;
  mx.drawImage(TEX.grain, 0, 0);
  mx.globalAlpha = 0.35;
  mx.strokeStyle = tone(ink, -0.3);
  mx.lineWidth = MW * 0.006;
  shape(mx, 'stroke');
  mx.globalAlpha = 1;
  mx.globalCompositeOperation = 'source-over';
  x.drawImage(m, 0, 0);
}
export function paintImpasto(x, shape, ink, o = {}) {
  const R = rng(o.seed ?? 7),
    bb = o.bbox ?? [0, 0, MW, MH];
  const [mk, mkx] = scratch(1);
  shape(mkx, 'fill');
  mkx.lineWidth = MW * 0.006;
  shape(mkx, 'stroke');
  const [s, sx] = scratch(2);
  sx.drawImage(mk, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = ink;
  sx.fillRect(0, 0, MW, MH);
  sx.globalCompositeOperation = 'source-atop';
  const n = o.count ?? Math.round((bb[2] * bb[3]) / 230);
  for (let k = 0; k < n; k++) {
    const px = bb[0] + R() * bb[2],
      py = bb[1] + R() * bb[3];
    const a = o.angleFn ? o.angleFn(px, py) + (R() - 0.5) * 0.25 : (o.angle ?? 1.2) + (R() - 0.5) * 0.7;
    const len = MW * (0.024 + R() * 0.045) * (o.lenK ?? 1),
      w = MW * (0.01 + R() * 0.014) * (o.wK ?? 1);
    const base = o.colorFn ? o.colorFn(px, py, R) : ink,
      lt = (R() - 0.5) * 0.42;
    const ca = (Math.cos(a) * len) / 2,
      sa = (Math.sin(a) * len) / 2,
      bend = (R() - 0.5) * w * 1.6;
    const draw = (dx, dy) => {
      sx.beginPath();
      sx.moveTo(px - ca + dx, py - sa + dy);
      sx.quadraticCurveTo(px - Math.sin(a) * bend + dx, py + Math.cos(a) * bend + dy, px + ca + dx, py + sa + dy);
      sx.stroke();
    };
    sx.globalAlpha = 0.32;
    sx.strokeStyle = tone(base, -0.42);
    sx.lineWidth = w;
    draw(w * 0.12, w * 0.16);
    sx.globalAlpha = 0.92;
    sx.strokeStyle = tone(base, lt > 0 ? lt * 0.75 : lt * 0.85);
    sx.lineWidth = w * 0.9;
    draw(0, 0);
    sx.globalAlpha = 0.38;
    sx.strokeStyle = tone(base, 0.5);
    sx.lineWidth = Math.max(1, w * 0.24);
    draw(-w * 0.16, -w * 0.2);
  }
  sx.globalAlpha = 1;
  sx.globalCompositeOperation = 'source-over';
  const [sh, shx] = scratch(3);
  shx.drawImage(mk, 0, 0);
  shx.globalCompositeOperation = 'source-in';
  shx.fillStyle = '#34240f';
  shx.fillRect(0, 0, MW, MH);
  x.save();
  x.globalAlpha = 0.3;
  x.drawImage(sh, MW * 0.005, MW * 0.007);
  x.restore();
  x.drawImage(s, 0, 0);
  const [e, ex] = scratch(4);
  ex.drawImage(mk, 0, 0);
  ex.globalCompositeOperation = 'destination-out';
  ex.drawImage(mk, MW * 0.004, MW * 0.005);
  ex.globalCompositeOperation = 'source-in';
  ex.fillStyle = 'rgba(255,248,230,0.6)';
  ex.fillRect(0, 0, MW, MH);
  x.drawImage(e, 0, 0);
  const [d, dx] = scratch(3);
  dx.drawImage(mk, 0, 0);
  dx.globalCompositeOperation = 'destination-out';
  dx.drawImage(mk, -MW * 0.004, -MW * 0.005);
  dx.globalCompositeOperation = 'source-in';
  dx.fillStyle = 'rgba(25,14,4,0.42)';
  dx.fillRect(0, 0, MW, MH);
  x.drawImage(d, 0, 0);
}
export function paintInlay(x, shape, ink, o = {}) {
  const dep = o.depth ?? MW * 0.0075;
  x.save();
  x.strokeStyle = 'rgba(70,55,40,0.32)';
  x.lineWidth = MW * 0.005;
  shape(x, 'stroke');
  x.restore();
  const [mk, mkx] = scratch(1);
  shape(mkx, 'fill');
  const [m, mx] = scratch(0);
  mx.drawImage(mk, 0, 0);
  mx.globalCompositeOperation = 'source-in';
  mx.fillStyle = ink;
  mx.fillRect(0, 0, MW, MH);
  mx.globalCompositeOperation = 'source-atop';
  const g = mx.createLinearGradient(0, 0, MW * 0.4, MH);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.2)');
  mx.fillStyle = g;
  mx.fillRect(0, 0, MW, MH);
  mx.globalAlpha = 0.1;
  mx.drawImage(TEX.dark, 0, 0);
  const [a, ax] = scratch(2);
  ax.drawImage(mk, 0, 0);
  ax.globalCompositeOperation = 'destination-out';
  ax.drawImage(mk, dep, dep);
  mx.globalAlpha = 0.6;
  mx.drawImage(a, 0, 0);
  const [b, bx] = scratch(3);
  bx.drawImage(mk, 0, 0);
  bx.globalCompositeOperation = 'destination-out';
  bx.drawImage(mk, -dep, -dep);
  bx.globalCompositeOperation = 'source-in';
  bx.fillStyle = '#fff';
  bx.fillRect(0, 0, MW, MH);
  mx.globalAlpha = 0.4;
  mx.drawImage(b, 0, 0);
  mx.globalAlpha = 1;
  mx.globalCompositeOperation = 'source-over';
  x.drawImage(m, 0, 0);
}
export function metalPaint(x, draw, kind = 'gold', o = {}) {
  const [m, mx] = scratch(5);
  draw(mx);
  mx.globalCompositeOperation = 'source-in';
  mx.fillStyle = kind === 'brass' ? brassGrad(mx) : goldGrad(mx);
  mx.fillRect(0, 0, MW, MH);
  mx.globalCompositeOperation = 'source-atop';
  mx.globalAlpha = o.leaf ?? 0.22;
  mx.drawImage(TEX.light, 0, 0);
  mx.globalAlpha = (o.leaf ?? 0.22) * 0.7;
  mx.drawImage(TEX.dark, 0, 0);
  x.save();
  x.globalAlpha = o.alpha ?? 1;
  if (o.shadow) {
    x.shadowColor = o.shadow;
    x.shadowBlur = o.shadowBlur ?? MW * 0.006;
    x.shadowOffsetY = o.shadowY ?? MW * 0.003;
  }
  x.drawImage(m, 0, 0);
  x.restore();
}

/* ── ebru motoru: damla ve tarak işlemlerinin tersini her piksel için uygular ── */
export const drop = (x, y, r, c) => ({ t: 1, x, y, r2: r * r, c: hx(c) });
export const tine = (bx, by, ang, a, l) => {
  const mx = Math.cos(ang),
    my = Math.sin(ang);
  return { t: 2, bx, by, mx, my, nx: -my, ny: mx, a, l };
};
export const wave = (ang, amp, len, ph = 0) => {
  const mx = Math.cos(ang),
    my = Math.sin(ang);
  return { t: 3, mx, my, nx: -my, ny: mx, amp, k: TAU / len, ph };
};
export async function marble(ops, baseHex, aa = false, need = null) {
  const base = hx(baseHex),
    N = ops.length,
    out = canvas(),
    x = out.getContext('2d'),
    img = x.createImageData(MW, MH),
    d = img.data;
  const sample = (px, py) => {
    let col = base;
    for (let k = N - 1; k >= 0; k--) {
      const o = ops[k];
      if (o.t === 1) {
        const dx = px - o.x,
          dy = py - o.y,
          d2 = dx * dx + dy * dy;
        if (d2 < o.r2) {
          col = o.c;
          break;
        }
        const s = Math.sqrt(1 - o.r2 / d2);
        px = o.x + dx * s;
        py = o.y + dy * s;
      } else if (o.t === 2) {
        const dd = Math.abs((px - o.bx) * o.nx + (py - o.by) * o.ny),
          z = (o.a * o.l) / (dd + o.l);
        px -= z * o.mx;
        py -= z * o.my;
      } else {
        const z = o.amp * Math.sin((px * o.nx + py * o.ny) * o.k + o.ph);
        px -= z * o.mx;
        py -= z * o.my;
      }
    }
    return col;
  };
  const cols = new Array(MW * MH);
  let tY = performance.now();
  for (let j = 0, q = 0; j < MH; j++) {
    for (let i = 0; i < MW; i++, q++) cols[q] = need && !need(i, j) ? null : sample(i + 0.5, j + 0.5);
    if (performance.now() - tY > 30) {
      await idle();
      tY = performance.now();
    }
  }
  for (let j = 0, q = 0; j < MH; j++)
    for (let i = 0; i < MW; i++, q++) {
      if (i === 0 && performance.now() - tY > 30) {
        await idle();
        tY = performance.now();
      }
      const c = cols[q],
        o = q * 4;
      if (!c) {
        d[o + 3] = 0;
        continue;
      }
      let r = c[0],
        g = c[1],
        b = c[2];
      if (aa && ((i > 0 && cols[q - 1] && cols[q - 1] !== c) || (i < MW - 1 && cols[q + 1] && cols[q + 1] !== c) || (j > 0 && cols[q - MW] && cols[q - MW] !== c) || (j < MH - 1 && cols[q + MW] && cols[q + MW] !== c))) {
        for (const [ox, oy] of [
          [0.2, 0.2],
          [0.8, 0.2],
          [0.2, 0.8],
          [0.8, 0.8],
        ]) {
          const s = sample(i + ox, j + oy);
          r += s[0];
          g += s[1];
          b += s[2];
        }
        r /= 5;
        g /= 5;
        b /= 5;
      }
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = b;
      d[o + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  return out;
}
