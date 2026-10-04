// İznik çini takımı: kobalt/turkuaz/mercan sır, lale-karanfil-sümbül, saz yaprağı ve çatlaklı sır.
import { MW, MH, TAU, rng, makeNoise, ramp, pixels, once, rrPoints, bez, pathShape, textShape, spacedShape, markPath, star8Path, pawPath, rosettePath, leafPath, crackle, brush, around, paintGlaze } from './paint.js';

/* ═════════════ 1 · İZNİK ÇİNİ ═════════════ */
export const C1 = { cobalt: '#1d3e93', turq: '#2f9c95', coral: '#c23a2c', stem: '#3f9c82', white: '#f4f0e6' };
const ciniGlaze = () =>
  once('ciniGlaze', () => {
    const n = makeNoise(11);
    return pixels(MW, MH, (i, j, o) => {
      const u = i / MW - 0.42,
        v = j / MH - 0.36,
        r = Math.sqrt(u * u + v * v);
      const g = n.fbm(i * 0.01, j * 0.01, 4),
        f = n.n2(i * 0.3, j * 0.3);
      const L = 0.99 - r * 0.1 + g * 0.03 + f * 0.006;
      o[0] = 247 * L;
      o[1] = 244 * L;
      o[2] = 236 * L + Math.max(0, g) * 14;
    });
  });
export function ciniTulip(x, cx, by, h, rot, fill = C1.coral) {
  const shape = pathShape((p) => {
    p.save();
    p.translate(cx, by);
    p.rotate(rot);
    p.scale(h, h);
    p.beginPath();
    p.moveTo(0, 0);
    p.bezierCurveTo(-0.3, -0.02, -0.46, -0.3, -0.36, -0.62);
    p.bezierCurveTo(-0.32, -0.76, -0.27, -0.86, -0.23, -0.99);
    p.bezierCurveTo(-0.18, -0.8, -0.12, -0.66, -0.07, -0.58);
    p.bezierCurveTo(-0.05, -0.8, -0.03, -0.93, 0, -1.07);
    p.bezierCurveTo(0.03, -0.93, 0.05, -0.8, 0.07, -0.58);
    p.bezierCurveTo(0.12, -0.66, 0.18, -0.8, 0.23, -0.99);
    p.bezierCurveTo(0.27, -0.86, 0.32, -0.76, 0.36, -0.62);
    p.bezierCurveTo(0.46, -0.3, 0.3, -0.02, 0, 0);
    p.closePath();
    p.restore();
  });
  x.save();
  x.strokeStyle = C1.white;
  x.lineWidth = Math.max(3, h * 0.07);
  x.lineJoin = 'round';
  shape(x, 'stroke');
  x.restore();
  paintGlaze(x, shape, fill, { contour: 'rgba(70,16,10,0.75)', contourW: Math.max(1.2, h * 0.018), pool: h * 0.07, bb: around(cx, by, h * 1.25) });
  x.save();
  x.translate(cx, by);
  x.rotate(rot);
  x.strokeStyle = 'rgba(252,246,234,0.78)';
  x.lineWidth = Math.max(1.2, h * 0.016);
  x.lineCap = 'round';
  for (const [ex, ey] of [
    [-0.2, -0.82],
    [0, -0.9],
    [0.2, -0.82],
  ]) {
    x.beginPath();
    x.moveTo(ex * 0.25 * h, -0.12 * h);
    x.quadraticCurveTo(ex * 0.85 * h, -0.5 * h, ex * h, ey * h);
    x.stroke();
  }
  x.restore();
}
export function ciniCarnation(x, cx, cy, s, rot) {
  const head = pathShape((p) => {
    p.save();
    p.translate(cx, cy);
    p.rotate(rot);
    p.beginPath();
    p.moveTo(-0.3 * s, 0.05 * s);
    const N = 11;
    for (let k = 0; k <= N; k++) {
      const a = Math.PI * (1.06 + (0.88 * k) / N),
        r = (k % 2 ? 0.74 : 1) * s;
      p.lineTo(Math.cos(a) * r, -0.12 * s + Math.sin(a) * r * 0.86);
    }
    p.lineTo(0.3 * s, 0.05 * s);
    p.closePath();
    p.restore();
  });
  const calyx = pathShape((p) => leafPath(p, cx + Math.sin(rot) * 0.34 * s, cy + Math.cos(rot) * 0.34 * s, 0.34 * s, rot + Math.PI / 2, 0.42));
  const bb = around(cx, cy, s * 1.3);
  paintGlaze(x, calyx, C1.turq, { contour: 'rgba(8,20,55,0.9)', contourW: 1.4, pool: 4, bb });
  x.save();
  x.strokeStyle = C1.white;
  x.lineWidth = s * 0.08;
  x.lineJoin = 'round';
  head(x, 'stroke');
  x.restore();
  paintGlaze(x, head, C1.coral, { contour: 'rgba(70,16,10,0.75)', contourW: 1.4, pool: s * 0.08, bb });
  x.save();
  x.translate(cx, cy);
  x.rotate(rot);
  x.strokeStyle = 'rgba(252,246,234,0.8)';
  x.lineWidth = Math.max(1.2, s * 0.03);
  x.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (1.18 + 0.16 * k);
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(Math.cos(a) * s * 0.78, -0.12 * s + Math.sin(a) * s * 0.66);
    x.stroke();
  }
  x.restore();
}
function ciniHyacinth(x, P0, P1, P2, P3, n, seed) {
  const sp = bez(P0, P1, P2, P3, 30);
  brush(x, sp, MW * 0.007, C1.stem, 0.95, seed, false);
  for (let i = 0; i < n; i++) {
    const t = 0.32 + (0.62 * i) / (n - 1),
      idx = Math.round(t * 30),
      p = sp[idx],
      q = sp[Math.min(30, idx + 1)];
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]),
      side = i % 2 ? 1 : -1;
    const bx = p[0] + Math.cos(a + (side * Math.PI) / 2) * 7,
      by = p[1] + Math.sin(a + (side * Math.PI) / 2) * 7;
    ciniTulip(x, bx, by, MW * 0.05, a + Math.PI / 2 + side * 1.05, i % 2 ? C1.coral : C1.white);
  }
  ciniTulip(x, sp[30][0], sp[30][1], MW * 0.055, Math.atan2(sp[30][1] - sp[28][1], sp[30][0] - sp[28][0]) + Math.PI / 2, C1.white);
}
export function sazPath(p, sp, wmax, side) {
  const N = sp.length - 1,
    L = [],
    Rr = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N,
      a = sp[Math.max(0, i - 1)],
      b = sp[Math.min(N, i + 1)];
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = Math.hypot(dx, dy) || 1,
      nx = (-dy / len) * side,
      ny = (dx / len) * side;
    const w = wmax * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02)), 0.8) * (1 - 0.3 * t);
    const tooth = i % 3 === 0 && t > 0.1 && t < 0.9 ? w * 0.38 : 0;
    L.push([sp[i][0] + nx * (w + tooth), sp[i][1] + ny * (w + tooth)]);
    Rr.push([sp[i][0] - nx * w * 0.62, sp[i][1] - ny * w * 0.62]);
  }
  p.beginPath();
  p.moveTo(L[0][0], L[0][1]);
  for (const q of L) p.lineTo(q[0], q[1]);
  for (let i = Rr.length - 1; i >= 0; i--) p.lineTo(Rr[i][0], Rr[i][1]);
  p.closePath();
}
export const CINI = {
  ink: { red: '#b8322a', blue: '#1f429a', black: '#26262c', yellow: '#cd8a17' },
  font: 'Yeseva One',
  weight: 400,
  numSize: 0.66,
  numMaxW: 0.66,
  numY: 0.43,
  markY: 0.775,
  markS: 0.17,
  edge: ['#dcd6c8', '#c6bfad', '#a8a08d'],
  gloss: 0.5,
  faceBase(x) {
    x.drawImage(ciniGlaze(), 0, 0);
    crackle(x, 17, 'rgba(110,98,78,0.08)', 70);
    const R = rng(5);
    for (let k = 0; k < 36; k++) {
      x.fillStyle = 'rgba(120,105,80,0.16)';
      x.beginPath();
      x.arc(R() * MW, R() * MH, 0.6 + R() * 1.1, 0, TAU);
      x.fill();
    }
    const o1 = MW * 0.07,
      o2 = MW * 0.118;
    brush(x, rrPoints(o1, o1, MW - 2 * o1, MH - 2 * o1, MW * 0.115, 6), MW * 0.026, C1.cobalt, 0.95, 31);
    brush(x, rrPoints(o2, o2, MW - 2 * o2, MH - 2 * o2, MW * 0.075, 6), MW * 0.008, C1.turq, 0.9, 32);
    const k = o2 + MW * 0.062;
    for (const [cx, cy] of [
      [k, k],
      [MW - k, k],
      [k, MH - k],
      [MW - k, MH - k],
    ]) {
      const bb = around(cx, cy, MW * 0.06);
      paintGlaze(
        x,
        pathShape((p) => rosettePath(p, cx, cy, MW * 0.034, 4, Math.PI / 4)),
        C1.turq,
        { pool: 2, contourW: MW * 0.004, bb },
      );
      paintGlaze(
        x,
        pathShape((p) => {
          p.beginPath();
          p.arc(cx, cy, MW * 0.011, 0, TAU);
        }),
        C1.coral,
        { pool: 1.5, contourW: MW * 0.003, bb },
      );
    }
  },
  number(x, L, ink) {
    paintGlaze(x, textShape(L), ink, { contourW: MW * 0.008 });
  },
  mark(x, color, cx, cy, s, ink) {
    paintGlaze(
      x,
      pathShape((p) => markPath(p, color, cx, cy, s)),
      ink,
      { pool: MW * 0.012, contourW: MW * 0.006 },
    );
  },
  okey(x) {
    const cx = MW / 2,
      cy = MH * 0.42,
      r = MW * 0.3;
    paintGlaze(
      x,
      pathShape((p) => star8Path(p, cx, cy, r)),
      C1.cobalt,
      { contourW: MW * 0.007 },
    );
    paintGlaze(
      x,
      pathShape((p) => star8Path(p, cx, cy, r * 0.62, -Math.PI / 2 + Math.PI / 8)),
      C1.turq,
      { contourW: MW * 0.005 },
    );
    paintGlaze(
      x,
      pathShape((p) => {
        p.beginPath();
        p.arc(cx, cy, r * 0.3, 0, TAU);
      }),
      C1.coral,
      { contourW: MW * 0.005 },
    );
    paintGlaze(
      x,
      pathShape((p) => rosettePath(p, cx, cy, r * 0.17, 5)),
      C1.white,
      { contourW: MW * 0.003, pool: 2 },
    );
    paintGlaze(x, spacedShape('OKEY', `400 ${MW * 0.12}px "Yeseva One"`, cx, MH * 0.82, MW * 0.02), C1.cobalt, { contourW: MW * 0.003, pool: 3 });
  },
  sahte(x) {
    const cx = MW / 2,
      cy = MH * 0.42;
    paintGlaze(
      x,
      pathShape((p) => {
        p.beginPath();
        p.arc(cx, cy, MW * 0.27, 0, TAU);
      }),
      '#e9e2cf',
      { contour: C1.cobalt, contourW: MW * 0.012, pool: 3, mottle: 0.15 },
    );
    paintGlaze(
      x,
      pathShape((p) => pawPath(p, cx, cy + MW * 0.005, MW * 0.34)),
      C1.turq,
      { contourW: MW * 0.006 },
    );
    paintGlaze(x, spacedShape('SAHTE', `400 ${MW * 0.11}px "Yeseva One"`, cx, MH * 0.82, MW * 0.016), '#1f6f69', { contourW: MW * 0.003, pool: 3 });
  },
  back(x) {
    const n = makeNoise(21),
      cob = ramp([
        [0, '#0e245e'],
        [0.42, '#19398a'],
        [0.72, '#2349a0'],
        [1, '#3762b8'],
      ]);
    x.drawImage(
      pixels(MW, MH, (i, j, o) => {
        const s = n.fbm(i * 0.005, j * 0.02, 5),
          m = n.fbm(i * 0.03 + 9, j * 0.03 + 3, 3);
        cob(0.5 + s * 0.6 + m * 0.22, o);
      }),
      0,
      0,
    );
    const b0 = MW * 0.04,
      b1 = MW * 0.15,
      bc = (b0 + b1) / 2,
      bw = b1 - b0;
    x.save();
    x.beginPath();
    x.roundRect(b0, b0, MW - 2 * b0, MH - 2 * b0, MW * 0.13);
    x.roundRect(b1, b1, MW - 2 * b1, MH - 2 * b1, MW * 0.05);
    x.clip('evenodd');
    x.drawImage(ciniGlaze(), 0, 0);
    const amp = bw * 0.2,
      cr = bw * 0.95;
    const sides = [
      [bc + cr, bc, MW - bc - cr, bc],
      [MW - bc, bc + cr, MW - bc, MH - bc - cr],
      [MW - bc - cr, MH - bc, bc + cr, MH - bc],
      [bc, MH - bc - cr, bc, bc + cr],
    ];
    sides.forEach(([x0, y0, x1, y1], si) => {
      const L = Math.hypot(x1 - x0, y1 - y0),
        ux = (x1 - x0) / L,
        uy = (y1 - y0) / L,
        nx = -uy,
        ny = ux;
      const k = Math.max(2, Math.round(L / (bw * 1.3))),
        lam = L / k,
        P = [];
      for (let t = 0; t <= L; t += 2) {
        const s = Math.sin((TAU * t) / lam) * amp;
        P.push([x0 + ux * t + nx * s, y0 + uy * t + ny * s]);
      }
      brush(x, P, bw * 0.085, C1.cobalt, 0.95, 70 + si, false);
      for (let m = 0; m < k; m++) {
        const tc = (m + 0.25) * lam,
          tt = (m + 0.75) * lam;
        const lx = x0 + ux * tc + nx * amp * 1.9,
          ly = y0 + uy * tc + ny * amp * 1.9;
        paintGlaze(
          x,
          pathShape((p) => leafPath(p, lx, ly, bw * 0.17, Math.atan2(uy, ux) + 0.5)),
          C1.turq,
          { pool: 2, contourW: 1.1, bb: around(lx, ly, bw * 0.3) },
        );
        const dx = x0 + ux * tt - nx * amp * 1.9,
          dy = y0 + uy * tt - ny * amp * 1.9;
        paintGlaze(
          x,
          pathShape((p) => {
            p.beginPath();
            p.arc(dx, dy, bw * 0.075, 0, TAU);
          }),
          C1.coral,
          { pool: 1.5, contourW: 1.1, bb: around(dx, dy, bw * 0.2) },
        );
      }
    });
    for (const [cx, cy] of [
      [bc, bc],
      [MW - bc, bc],
      [MW - bc, MH - bc],
      [bc, MH - bc],
    ]) {
      const bb = around(cx, cy, bw * 0.7);
      paintGlaze(
        x,
        pathShape((p) => rosettePath(p, cx, cy, bw * 0.44, 6)),
        C1.cobalt,
        { pool: 3, contourW: 1.3, bb },
      );
      paintGlaze(
        x,
        pathShape((p) => {
          p.beginPath();
          p.arc(cx, cy, bw * 0.13, 0, TAU);
        }),
        C1.coral,
        { pool: 1.5, contourW: 1.1, bb },
      );
    }
    x.restore();
    brush(x, rrPoints(b0 + 2, b0 + 2, MW - 2 * b0 - 4, MH - 2 * b0 - 4, MW * 0.125), MW * 0.009, C1.cobalt, 0.9, 41);
    brush(x, rrPoints(b1 - 2, b1 - 2, MW - 2 * b1 + 4, MH - 2 * b1 + 4, MW * 0.055), MW * 0.009, C1.cobalt, 0.9, 42);
    brush(x, rrPoints(b1 + 7, b1 + 7, MW - 2 * b1 - 14, MH - 2 * b1 - 14, MW * 0.04), MW * 0.004, C1.coral, 0.7, 43);

    const cx = MW / 2;
    brush(x, bez([cx, MH * 0.9], [cx - 14, MH * 0.75], [cx + 12, MH * 0.6], [cx, MH * 0.45]), MW * 0.014, C1.stem, 0.95, 51, false);
    for (const m of [-1, 1]) {
      const sp = bez([cx + m * 4, MH * 0.88], [cx + m * 160, MH * 0.82], [cx + m * 150, MH * 0.5], [cx + m * 86, MH * 0.36]);
      paintGlaze(
        x,
        pathShape((p) => sazPath(p, sp, MW * 0.058, m)),
        C1.turq,
        { contour: 'rgba(8,20,55,0.9)', contourW: MW * 0.004, pool: 6 },
      );
      brush(x, sp.slice(3, -3), MW * 0.004, '#eaf6f2', 0.85, 52 + m, false);
    }
    for (const m of [-1, 1]) ciniHyacinth(x, [cx + m * 3, MH * 0.87], [cx + m * 26, MH * 0.82], [cx + m * 52, MH * 0.76], [cx + m * 64, MH * 0.69], 5, 66 + m);
    for (const [yy, a] of [
      [MH * 0.6, 0.5],
      [MH * 0.74, 0.6],
    ])
      for (const m of [-1, 1])
        paintGlaze(
          x,
          pathShape((p) => leafPath(p, cx + m * 17, yy, 17, m * a + (m < 0 ? Math.PI : 0), 0.3)),
          C1.turq,
          { contour: 'rgba(8,20,55,0.9)', contourW: 1.1, pool: 2, bb: around(cx + m * 17, yy, 32) },
        );
    for (const m of [-1, 1]) {
      brush(x, bez([cx, MH * 0.66], [cx + m * 40, MH * 0.65], [cx + m * 66, MH * 0.61], [cx + m * 92, MH * 0.565]), MW * 0.01, C1.stem, 0.95, 60 + m, false);
      ciniCarnation(x, cx + m * 100, MH * 0.552, MW * 0.105, m * 0.6);
    }
    paintGlaze(
      x,
      pathShape((p) => leafPath(p, cx - 26, MH * 0.47, 28, -0.35, 0.3)),
      C1.turq,
      { contour: 'rgba(8,20,55,0.9)', contourW: 1.3, pool: 3, bb: around(cx - 26, MH * 0.47, 50) },
    );
    paintGlaze(
      x,
      pathShape((p) => leafPath(p, cx + 26, MH * 0.47, 28, 0.35, 0.3)),
      C1.turq,
      { contour: 'rgba(8,20,55,0.9)', contourW: 1.3, pool: 3, bb: around(cx + 26, MH * 0.47, 50) },
    );
    ciniTulip(x, cx, MH * 0.46, MW * 0.37, 0);
    for (const [px, py, r] of [
      [MW * 0.28, MH * 0.19, 17],
      [MW * 0.72, MH * 0.19, 17],
      [MW * 0.27, MH * 0.36, 11],
      [MW * 0.73, MH * 0.36, 11],
      [cx, MH * 0.895, 15],
    ]) {
      const bb = around(px, py, r * 1.8);
      paintGlaze(
        x,
        pathShape((p) => rosettePath(p, px, py, r, 5)),
        C1.white,
        { pool: 2, contour: 'rgba(8,20,55,0.8)', contourW: 1.1, bb },
      );
      paintGlaze(
        x,
        pathShape((p) => {
          p.beginPath();
          p.arc(px, py, r * 0.28, 0, TAU);
        }),
        C1.coral,
        { pool: 1.2, contourW: 0.9, bb },
      );
    }
    crackle(x, 23, 'rgba(255,255,255,0.05)', 60);
  },
};

/* oyun yüzleri: okey işareti, etiket ve sahte okey pençesi */
CINI.okeyMark = function (x) {
  const cx = MW / 2,
    cy = MH * 0.135,
    r = MW * 0.075,
    bb = around(cx, cy, r * 1.6);
  paintGlaze(
    x,
    pathShape((p) => star8Path(p, cx, cy, r)),
    C1.cobalt,
    { contourW: MW * 0.004, pool: 3, bb },
  );
  paintGlaze(
    x,
    pathShape((p) => {
      p.beginPath();
      p.arc(cx, cy, r * 0.36, 0, TAU);
    }),
    C1.coral,
    { contourW: MW * 0.003, pool: 2, bb },
  );
  const o = MW * 0.118;
  brush(x, rrPoints(o, o, MW - 2 * o, MH - 2 * o, MW * 0.075, 6), MW * 0.014, C1.coral, 0.9, 34);
};
CINI.label = function (x, text, y, size, ink) {
  paintGlaze(x, spacedShape(text, `400 ${MW * size}px "Yeseva One"`, MW / 2, y, MW * 0.018), ink, { contourW: MW * 0.003, pool: 3 });
};
CINI.paw = function (x, cx, cy, s) {
  paintGlaze(
    x,
    pathShape((p) => pawPath(p, cx, cy, s)),
    C1.turq,
    { contourW: MW * 0.006 },
  );
};
CINI.fakeLabelInk = '#1f6f69';
