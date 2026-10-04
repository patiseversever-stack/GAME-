// Ebru takımı: mermerlenmiş kâğıt kenarı, altın varak cetvel, mürekkep baskı.
import { MW, MH, TAU, rng, makeNoise, pixels, cache, once, pathShape, textShape, spacedShape, markPath, star8Path, pawPath, paintInk, metalPaint, drop, tine, wave, marble } from './paint.js';

/* ═════════════ 3 · EBRU ═════════════ */
const E = { indigo: '#22366c', rose: '#b55f66', ochre: '#cf9d45', cream: '#efe3c9', slate: '#5c6c7a', sage: '#7d987a', paper: '#f1e9d8' };
const ebruBack = () =>
  once('ebruBack', () => {
    const R = rng(2024),
      ops = [];
    const pal = [E.indigo, E.indigo, E.indigo, E.rose, E.rose, E.ochre, E.ochre, E.cream, E.cream, E.slate, E.sage];
    for (let k = 0; k < 95; k++) ops.push(drop(-40 + R() * (MW + 80), -40 + R() * (MH + 80), 22 + R() * 44, pal[(R() * pal.length) | 0]));
    for (let xg = -10, k = 0; xg < MW + 20; xg += 32, k++) ops.push(tine(xg, 0, k % 2 ? -Math.PI / 2 : Math.PI / 2, 44, 9));
    ops.push(wave(0, 12, 130));
    const cx = MW / 2,
      cy = MH * 0.5;
    [
      [106, E.indigo],
      [92, E.cream],
      [78, E.rose],
      [62, E.cream],
      [48, E.indigo],
      [34, E.ochre],
      [20, E.cream],
      [9, E.rose],
    ].forEach(([r, c]) => ops.push(drop(cx, cy, r, c)));
    ops.push(tine(cx, 0, -Math.PI / 2, 100, 12));
    ops.push(tine(cx - 50, 0, Math.PI / 2, 46, 8), tine(cx + 50, 0, Math.PI / 2, 46, 8));
    for (const [fx, fy] of [
      [MW * 0.24, MH * 0.17],
      [MW * 0.76, MH * 0.17],
      [MW * 0.24, MH * 0.84],
      [MW * 0.76, MH * 0.84],
    ]) {
      [
        [34, E.rose],
        [26, E.cream],
        [17, E.indigo],
        [8, E.ochre],
      ].forEach(([r, c]) => ops.push(drop(fx, fy, r, c)));
      ops.push(tine(fx, 0, -Math.PI / 2, 40, 6));
    }
    return marble(ops, E.cream, true);
  });
const ebruEdge = () =>
  once('ebruEdge', () => {
    const R = rng(77),
      ops = [];
    const pal = [E.indigo, E.indigo, E.indigo, E.rose, E.rose, E.ochre, E.ochre, E.cream, E.slate];
    for (let k = 0; k < 280; k++) ops.push(drop(-20 + R() * (MW + 40), -20 + R() * (MH + 40), 12 + R() * 18, pal[(R() * pal.length) | 0]));
    for (let xg = -6, k = 0; xg < MW + 12; xg += 15, k++) ops.push(tine(xg, 0, k % 2 ? -Math.PI / 2 : Math.PI / 2, 26, 5));
    for (let yg = -6, k = 0; yg < MH + 12; yg += 20, k++) ops.push(tine(0, yg, k % 2 ? Math.PI : 0, 16, 5));
    const m = MW * 0.088 + 8;
    return marble(ops, E.cream, true, (i, j) => i < m || j < m || i > MW - m || j > MH - m);
  });
const paperTex = () =>
  once('paper', () => {
    const n = makeNoise(81),
      R = rng(82);
    return pixels(MW, MH, (i, j, o) => {
      const g = n.fbm(i * 0.01, j * 0.01, 4),
        f = n.n2(i * 0.15, j * 0.9),
        fib = Math.max(0, n.n2(i * 0.05 + 3, j * 0.6) - 0.5) * 0.7;
      let L = 0.985 + g * 0.03 + f * 0.008 - fib * 0.06;
      if (R() < 0.0015) L -= 0.12;
      o[0] = 243 * L;
      o[1] = 234 * L;
      o[2] = 215 * L;
    });
  });
function cetvel(x, inset, rad, w) {
  metalPaint(
    x,
    (g) => {
      g.lineWidth = w;
      g.beginPath();
      g.roundRect(inset, inset, MW - 2 * inset, MH - 2 * inset, rad);
      g.stroke();
    },
    'gold',
    { leaf: 0.3 },
  );
  x.save();
  x.strokeStyle = 'rgba(25,20,18,0.85)';
  x.lineWidth = MW * 0.0032;
  for (const d of [-w / 2, w / 2]) {
    x.beginPath();
    x.roundRect(inset + d, inset + d, MW - 2 * (inset + d), MH - 2 * (inset + d), Math.max(2, rad - d));
    x.stroke();
  }
  x.restore();
}
export const EBRU = {
  async prepare() {
    cache.ebruEdgeC = cache.ebruEdgeC || (await ebruEdge());
  },
  ink: { red: '#a8222c', blue: '#22357a', black: '#1b1a1f', yellow: '#c4860f' },
  font: 'Abril Fatface',
  weight: 400,
  numSize: 0.66,
  numMaxW: 0.64,
  numY: 0.43,
  markY: 0.775,
  markS: 0.17,
  edge: ['#dbcdb0', '#c3b492', '#a39373'],
  gloss: 0.1,
  faceBase(x) {
    const m = MW * 0.088;
    x.drawImage(cache.ebruEdgeC, 0, 0);
    x.save();
    x.beginPath();
    x.roundRect(m, m, MW - 2 * m, MH - 2 * m, MW * 0.08);
    x.clip();
    x.drawImage(paperTex(), 0, 0);
    x.restore();
    cetvel(x, m, MW * 0.08, MW * 0.016);
    x.save();
    x.strokeStyle = 'rgba(25,20,18,0.55)';
    x.lineWidth = MW * 0.003;
    x.beginPath();
    x.roundRect(m + MW * 0.035, m + MW * 0.035, MW - 2 * m - MW * 0.07, MH - 2 * m - MW * 0.07, MW * 0.05);
    x.stroke();
    x.restore();
  },
  number(x, L, ink) {
    paintInk(x, textShape(L), ink);
  },
  mark(x, color, cx, cy, s, ink) {
    paintInk(
      x,
      pathShape((p) => markPath(p, color, cx, cy, s)),
      ink,
    );
    paintInk(
      x,
      pathShape((p) => markPath(p, color, cx, cy + (color === 'black' ? s * 0.1 : 0), s * 0.56)),
      E.paper,
      { bleed: 1 },
    );
    paintInk(
      x,
      pathShape((p) => markPath(p, color, cx, cy + (color === 'black' ? s * 0.13 : 0), s * 0.26)),
      ink,
      { bleed: 1 },
    );
  },
  okey(x) {
    const cx = MW / 2,
      cy = MH * 0.42,
      r = MW * 0.29;
    metalPaint(
      x,
      (g) => {
        star8Path(g, cx, cy, r);
        g.fill();
      },
      'gold',
      { leaf: 0.3, shadow: 'rgba(60,40,10,0.25)' },
    );
    x.save();
    x.strokeStyle = 'rgba(25,20,18,0.85)';
    x.lineWidth = MW * 0.004;
    star8Path(x, cx, cy, r);
    x.stroke();
    x.restore();
    paintInk(
      x,
      pathShape((p) => star8Path(p, cx, cy, r * 0.62, -Math.PI / 2 + Math.PI / 8)),
      '#22357a',
    );
    paintInk(
      x,
      pathShape((p) => {
        p.beginPath();
        p.arc(cx, cy, r * 0.17, 0, TAU);
      }),
      '#a8222c',
      { bleed: 1 },
    );
    paintInk(x, spacedShape('OKEY', `400 ${MW * 0.13}px "Abril Fatface"`, cx, MH * 0.83, MW * 0.02), '#22357a');
  },
  sahte(x) {
    const cx = MW / 2,
      cy = MH * 0.42,
      s = MW * 0.36;
    paintInk(
      x,
      pathShape((p) => pawPath(p, cx, cy, s)),
      '#22357a',
    );
    paintInk(x, spacedShape('SAHTE', `400 ${MW * 0.115}px "Abril Fatface"`, cx, MH * 0.83, MW * 0.016), '#a8222c');
  },
  async back(x) {
    cache.ebruBackC = cache.ebruBackC || (await ebruBack());
    x.drawImage(cache.ebruBackC, 0, 0);
    x.save();
    x.globalCompositeOperation = 'multiply';
    x.globalAlpha = 0.15;
    x.drawImage(paperTex(), 0, 0);
    x.restore();
    cetvel(x, MW * 0.058, MW * 0.12, MW * 0.014);
  },
};

/* oyun yüzleri: okey işareti, etiket ve sahte okey pençesi */
EBRU.okeyMark = function (x) {
  const cx = MW / 2,
    cy = MH * 0.135,
    r = MW * 0.08;
  metalPaint(
    x,
    (g) => {
      star8Path(g, cx, cy, r);
      g.fill();
    },
    'gold',
    { leaf: 0.3, shadow: 'rgba(60,40,10,0.25)' },
  );
  x.save();
  x.strokeStyle = 'rgba(25,20,18,0.85)';
  x.lineWidth = MW * 0.0035;
  star8Path(x, cx, cy, r);
  x.stroke();
  x.restore();
  paintInk(
    x,
    pathShape((p) => {
      p.beginPath();
      p.arc(cx, cy, r * 0.38, 0, TAU);
    }),
    '#a8222c',
    { bleed: 1 },
  );
  cetvel(x, MW * 0.088 + MW * 0.03, MW * 0.06, MW * 0.01);
};
EBRU.label = function (x, text, y, size, ink) {
  paintInk(x, spacedShape(text, `400 ${MW * size}px "Abril Fatface"`, MW / 2, y, MW * 0.018), ink);
};
EBRU.paw = function (x, cx, cy, s) {
  paintInk(
    x,
    pathShape((p) => pawPath(p, cx, cy, s)),
    '#22357a',
  );
};
EBRU.fakeLabelInk = '#a8222c';
