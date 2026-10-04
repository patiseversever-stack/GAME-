// Yağlı boya takımı: keten tuval, fırça darbeli empasto, gece manzaralı sırt.
import { idle, MW, MH, TAU, rng, makeNoise, clamp, hx, css, mixc, tone, mixInto, ramp, canvas, pixels, once, pathShape, textShape, spacedShape, markPath, star5Path, pawPath, catPath, catTail, TEX, paintImpasto } from './paint.js';

/* ═════════════ 4 · YAĞLI BOYA ═════════════ */
let OILS = null;
const oilScene = () =>
  OILS ||
  (OILS = (() => {
    const H0 = MH * 0.64,
      RIDGE = MH * 0.905;
    const moon = { x: MW * 0.74, y: MH * 0.16, r: MW * 0.068 };
    const stars = [
      [0.2, 0.075, 0.024],
      [0.47, 0.07, 0.018],
      [0.56, 0.27, 0.016],
      [0.92, 0.33, 0.018],
      [0.36, 0.44, 0.013],
      [0.94, 0.06, 0.013],
      [0.68, 0.48, 0.012],
    ].map(([u, v, r]) => ({ x: u * MW, y: v * MH, r: r * MW }));
    const vort = [
      { x: MW * 0.42, y: MH * 0.3, s: 1, r: MW * 0.19 },
      { x: MW * 0.66, y: MH * 0.45, s: -0.8, r: MW * 0.13 },
    ];
    const psi = (px, py) => {
      let p = py * 0.045 + 5 * Math.sin(px * 0.011 + py * 0.004);
      for (const v of vort) {
        const dx = px - v.x,
          dy = py - v.y;
        p += v.s * 30 * Math.exp(-(dx * dx + dy * dy) / (v.r * v.r));
      }
      return p;
    };
    const city = new Path2D(),
      base = H0 + 4;
    {
      const R = rng(31);
      let xx = 112;
      while (xx < MW) {
        const w = 16 + R() * 26,
          h = 12 + R() * 22;
        city.rect(xx, base - h, w + 1, h + 2);
        city.moveTo(xx - 2, base - h);
        city.lineTo(xx + w / 2, base - h - 7 - R() * 6);
        city.lineTo(xx + w + 2, base - h);
        city.closePath();
        xx += w;
      }
    }
    const gx = 172;
    city.rect(gx - 15, base - 118, 30, 120);
    city.moveTo(gx - 19, base - 118);
    city.lineTo(gx, base - 160);
    city.lineTo(gx + 19, base - 118);
    city.closePath();
    city.rect(gx - 19, base - 102, 38, 8);
    const mq = 345,
      mb = base - 26;
    city.rect(mq - 68, mb, 136, 32);
    city.moveTo(mq + 44, mb);
    city.arc(mq, mb, 44, 0, Math.PI, true);
    city.closePath();
    city.rect(mq - 2, mb - 58, 4, 16);
    for (const m of [-1, 1]) {
      city.moveTo(mq + m * 46 + 22, mb + 10);
      city.arc(mq + m * 46, mb + 10, 22, 0, Math.PI, true);
      city.closePath();
      for (const [ox, top] of [
        [78, base - 150],
        [102, base - 116],
      ]) {
        const xm = mq + m * ox;
        city.rect(xm - 4, top, 8, base - top + 2);
        city.moveTo(xm - 5, top);
        city.lineTo(xm, top - 24);
        city.lineTo(xm + 5, top);
        city.closePath();
        city.rect(xm - 6, top + 22, 12, 3);
        city.rect(xm - 6, top + 54, 12, 3);
      }
    }
    const cypress = new Path2D();
    cypress.moveTo(28, MH + 2);
    cypress.bezierCurveTo(10, MH * 0.7, 44, MH * 0.4, 80, MH * 0.11);
    cypress.bezierCurveTo(98, MH * 0.32, 134, MH * 0.62, 120, MH + 2);
    cypress.closePath();
    const roof = new Path2D();
    roof.moveTo(150, MH + 2);
    roof.lineTo(232, RIDGE);
    roof.lineTo(MW + 2, RIDGE);
    roof.lineTo(MW + 2, MH + 2);
    roof.closePath();
    const catX = 372,
      catH = 74,
      cat = new Path2D();
    catPath(cat, catX, RIDGE + 2, catH, 1);
    const tail = catTail(catX, RIDGE + 2, catH, 1);
    const reg = canvas(),
      rx = reg.getContext('2d');
    rx.fillStyle = 'rgb(0,0,0)';
    rx.fillRect(0, 0, MW, MH);
    const id = (k) => `rgb(${k * 40},0,0)`;
    rx.fillStyle = id(3);
    rx.fillRect(0, H0, MW, MH);
    rx.fillStyle = id(1);
    rx.fill(city);
    rx.fillStyle = id(6);
    rx.beginPath();
    rx.arc(moon.x, moon.y, moon.r, 0, TAU);
    rx.fill();
    rx.fillStyle = id(2);
    rx.fill(cypress);
    rx.fillStyle = id(4);
    rx.fill(roof);
    rx.fillStyle = id(5);
    rx.fill(cat);
    rx.strokeStyle = id(5);
    rx.lineWidth = catH * 0.075;
    rx.lineCap = 'round';
    rx.stroke(tail);
    const rd = rx.getImageData(0, 0, MW, MH).data;
    const region = (px, py) => {
      const i = (clamp(py | 0, 0, MH - 1) * MW + clamp(px | 0, 0, MW - 1)) * 4;
      return Math.round(rd[i] / 40);
    };
    const n = makeNoise(303);
    const skyR = ramp([
      [0, '#0e1f5c'],
      [0.4, '#1c3f92'],
      [0.75, '#3566ad'],
      [1, '#6d97c6'],
    ]);
    const cypR = ramp([
      [0, '#07130d'],
      [0.5, '#102617'],
      [1, '#22422a'],
    ]);
    const waterR = ramp([
      [0, '#2a4c8e'],
      [0.35, '#183473'],
      [1, '#0c1c48'],
    ]);
    const C = (s) => hx(s);
    const cLight = C('#a8c8e6'),
      cTeal = C('#2b6f8e'),
      cHalo = C('#d8c37a'),
      cRing = [C('#f6d86a'), C('#fbeec0'), C('#e7c95c')],
      cCore = C('#fff6cf'),
      cStar = C('#f3d462'),
      cGlow = C('#c9d7a0');
    const cMoonA = C('#fff3b0'),
      cMoonB = C('#f2c040'),
      cMoonS = C('#d98f2a'),
      cCity1 = C('#141d44'),
      cCity2 = C('#2a2453'),
      cWin = C('#f0b44a'),
      cRefl = C('#f0c457'),
      cWinR = C('#d99a3e'),
      cRoof1 = C('#4b2a22'),
      cRoof2 = C('#76402c'),
      cRidge = C('#9a5638'),
      cCat = C('#0e0d13'),
      cWStreak = C('#3a63a8');
    function color(px, py, r, o) {
      if (r === 0) {
        skyR(py / H0, o);
        const b = Math.sin(psi(px, py) * 0.62);
        if (b > 0.45) mixInto(o, cLight, ((b - 0.45) / 0.55) * 0.75);
        else if (b < -0.7) mixInto(o, cTeal, ((-b - 0.7) / 0.3) * 0.5);
        const dm = Math.hypot(px - moon.x, py - moon.y);
        mixInto(o, cHalo, 0.5 * Math.exp(-((dm / (moon.r * 3.2)) ** 2)));
        [1.45, 1.95, 2.5].forEach((k, i) => mixInto(o, cRing[i], 0.85 * Math.exp(-(((dm - moon.r * k) / (moon.r * 0.16)) ** 2))));
        for (const s of stars) {
          const d = Math.hypot(px - s.x, py - s.y);
          if (d < s.r * 0.55) mixInto(o, cCore, 1);
          mixInto(o, cStar, 0.9 * Math.exp(-(((d - s.r) / (s.r * 0.3)) ** 2)));
          mixInto(o, cGlow, 0.35 * Math.exp(-((d / (s.r * 2.4)) ** 2)));
        }
      } else if (r === 6) {
        const d = Math.hypot(px - moon.x, py - moon.y) / moon.r;
        o[0] = cMoonA[0];
        o[1] = cMoonA[1];
        o[2] = cMoonA[2];
        mixInto(o, cMoonB, d * d);
        if (Math.hypot(px - (moon.x + moon.r * 0.45), py - (moon.y - moon.r * 0.25)) < moon.r * 0.8) mixInto(o, cMoonS, 0.55);
      } else if (r === 1) {
        o[0] = cCity1[0];
        o[1] = cCity1[1];
        o[2] = cCity1[2];
        mixInto(o, cCity2, n.fbm(px * 0.03, py * 0.03, 2) + 0.5);
        const cxw = Math.floor(px / 7),
          cyw = Math.floor(py / 9),
          h = Math.sin(cxw * 127.1 + cyw * 311.7) * 43758.5453;
        if (h - Math.floor(h) > 0.9 && py > base - 40) mixInto(o, cWin, 0.95);
      } else if (r === 2) {
        cypR(0.45 + 0.35 * Math.sin(py * 0.09 + n.n2(px * 0.05, py * 0.02) * 3) + n.n2(px * 0.1, py * 0.1) * 0.2, o);
      } else if (r === 3) {
        waterR((py - H0) / (MH - H0), o);
        if (Math.sin(py * 0.3 + px * 0.012) > 0.82) mixInto(o, cWStreak, 0.5);
        const wdt = 16 + (py - H0) * 0.22,
          dx = Math.abs(px - moon.x);
        if (dx < wdt && Math.sin(py * 0.42 + n.n2(px * 0.08, py * 0.05) * 3) > 0) mixInto(o, cRefl, (1 - dx / wdt) * 0.95);
        const cxw = Math.floor(px / 6),
          cyw = Math.floor(py / 5),
          h = Math.sin(cxw * 91.7 + cyw * 47.3) * 24634.6345;
        if (px > 112 && py < H0 + 70 && h - Math.floor(h) > 0.93) mixInto(o, cWinR, 0.8);
      } else if (r === 4) {
        o[0] = cRoof1[0];
        o[1] = cRoof1[1];
        o[2] = cRoof1[2];
        mixInto(o, cRoof2, 0.5 + 0.5 * Math.sin(py * 0.55 + Math.sin(px * 0.08) * 1.5));
        if (py < RIDGE + 7) mixInto(o, cRidge, 0.7);
      } else {
        o[0] = cCat[0];
        o[1] = cCat[1];
        o[2] = cCat[2];
      }
      return o;
    }
    function angle(px, py, r) {
      if (r === 0 || r === 6) {
        let vx = -(psi(px, py + 1) - psi(px, py - 1)),
          vy = psi(px + 1, py) - psi(px - 1, py);
        let L = Math.hypot(vx, vy) || 1;
        vx /= L;
        vy /= L;
        for (const c of [moon, ...stars]) {
          const dx = px - c.x,
            dy = py - c.y,
            d = Math.hypot(dx, dy) || 1,
            w = Math.exp(-((d / (c.r * 3.6)) ** 2));
          vx = vx * (1 - w) + (-dy / d) * w;
          vy = vy * (1 - w) + (dx / d) * w;
        }
        return Math.atan2(vy, vx);
      }
      if (r === 1) return Math.PI / 2 + n.n2(px * 0.1, py * 0.1) * 0.3;
      if (r === 2) return -Math.PI / 2 + 0.45 * Math.sin(py * 0.05 + px * 0.02);
      if (r === 3) return 0.08 * Math.sin(px * 0.05 + py * 0.2);
      if (r === 4) return -0.1 + 0.05 * Math.sin(px * 0.1);
      return Math.PI / 2;
    }
    return { region, color, angle, city, cypress, roof, cat, tail, catH, moon, stars, H0 };
  })());
function oilStroke(x, pts, w, c) {
  const tr = (dx, dy) => {
    x.beginPath();
    x.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0] + dx, pts[i][1] + dy);
    x.stroke();
  };
  x.strokeStyle = css(mixc(c, [0, 0, 0], 0.45), 0.3);
  x.lineWidth = w;
  tr(w * 0.1, w * 0.13);
  x.strokeStyle = css(c, 0.95);
  x.lineWidth = w * 0.9;
  tr(0, 0);
  x.strokeStyle = css(mixc(c, [255, 255, 255], 0.35), 0.36);
  x.lineWidth = Math.max(0.8, w * 0.27);
  tr(-w * 0.16, -w * 0.2);
}
const linenTex = () =>
  once('linen', () => {
    const n = makeNoise(611);
    return pixels(MW, MH, (i, j, o) => {
      const g = n.fbm(i * 0.01, j * 0.01, 3);
      const L = 0.97 + g * 0.03;
      o[0] = 239 * L;
      o[1] = 230 * L;
      o[2] = 212 * L;
    });
  });
export const OIL = {
  ink: { red: '#c22a26', blue: '#203f9e', black: '#1d1b1a', yellow: '#d48f0b' },
  font: 'Fraunces',
  weight: 900,
  numSize: 0.64,
  numMaxW: 0.66,
  numY: 0.43,
  markY: 0.775,
  markS: 0.17,
  edge: ['#c9ad84', '#b0926a', '#8f7350'],
  gloss: 0.22,
  faceBase(x) {
    x.drawImage(linenTex(), 0, 0);
    const R = rng(61),
      tones = ['#f4eddf', '#e8decb', '#f1e9d9', '#e3d7c1', '#f7f2e8', '#ebe2d0'];
    x.lineCap = 'round';
    for (let k = 0; k < 460; k++) {
      const px = R() * MW,
        py = R() * MH,
        a = -0.25 + (R() - 0.5) * 0.6,
        len = 40 + R() * 110,
        w = 10 + R() * 22,
        c = tones[(R() * tones.length) | 0];
      const ca = (Math.cos(a) * len) / 2,
        sa = (Math.sin(a) * len) / 2,
        bend = (R() - 0.5) * 16;
      const tr = (dx, dy) => {
        x.beginPath();
        x.moveTo(px - ca + dx, py - sa + dy);
        x.quadraticCurveTo(px - Math.sin(a) * bend + dx, py + Math.cos(a) * bend + dy, px + ca + dx, py + sa + dy);
        x.stroke();
      };
      x.strokeStyle = tone(c, -0.06, 0.09);
      x.lineWidth = w;
      tr(1.2, 1.6);
      x.strokeStyle = tone(c, 0, 0.24);
      x.lineWidth = w * 0.9;
      tr(0, 0);
      x.strokeStyle = tone(c, 0.5, 0.14);
      x.lineWidth = w * 0.2;
      tr(-w * 0.15, -w * 0.18);
    }
    x.save();
    x.globalCompositeOperation = 'overlay';
    x.globalAlpha = 0.38;
    x.drawImage(TEX.weave, 0, 0);
    x.restore();
    x.save();
    x.strokeStyle = 'rgba(90,70,40,0.18)';
    x.lineWidth = MW * 0.006;
    x.beginPath();
    x.roundRect(MW * 0.06, MW * 0.06, MW * 0.88, MH - MW * 0.12, MW * 0.11);
    x.stroke();
    x.restore();
  },
  number(x, L, ink) {
    const w = L.w,
      bb = [L.x - w / 2 - 12, L.y - L.capH - 12, w + 24, L.capH + 24];
    paintImpasto(x, textShape(L), ink, { bbox: bb, angle: 1.25, seed: L.text.length * 13 + L.text.charCodeAt(0) });
  },
  mark(x, color, cx, cy, s, ink) {
    paintImpasto(
      x,
      pathShape((p) => markPath(p, color, cx, cy, s)),
      ink,
      { bbox: [cx - s, cy - s, 2 * s, 2 * s], angle: 0.6, wK: 0.8, lenK: 0.7 },
    );
  },
  okey(x) {
    const cx = MW / 2,
      cy = MH * 0.42,
      R = MW * 0.27;
    const bands = ['#1b3486', '#203f9e', '#2a4fa8', '#1b3486', '#4f7fc4', '#7fa6d6'];
    paintImpasto(
      x,
      pathShape((p) => {
        p.beginPath();
        p.arc(cx, cy, R, 0, TAU);
      }),
      '#1f3f9a',
      {
        bbox: [cx - R, cy - R, 2 * R, 2 * R],
        count: 560,
        wK: 0.8,
        lenK: 1.3,
        angleFn: (px, py) => Math.atan2(py - cy, px - cx) + Math.PI / 2,
        colorFn: (px, py, Rr) => {
          const d = Math.hypot(px - cx, py - cy) / R;
          if (d < 0.46) return Rr() < 0.55 ? '#f6dd82' : '#fdf3d0';
          if (d < 0.58) return Rr() < 0.7 ? '#e9c55a' : '#8fb2dc';
          return bands[(Rr() * bands.length) | 0];
        },
      },
    );
    paintImpasto(
      x,
      pathShape((p) => star5Path(p, cx, cy, R * 0.5, 0.45)),
      '#eaa70c',
      { bbox: [cx - R * 0.55, cy - R * 0.55, R * 1.1, R * 1.1], angle: 0.9, count: 170, wK: 0.8 },
    );
    paintImpasto(x, spacedShape('OKEY', `900 ${MW * 0.13}px "Fraunces"`, cx, MH * 0.84, MW * 0.02), '#203f9e', { bbox: [MW * 0.15, MH * 0.73, MW * 0.7, MH * 0.13], angle: 1.3, wK: 0.7, lenK: 0.6 });
  },
  sahte(x) {
    const cx = MW / 2,
      cy = MH * 0.42,
      s = MW * 0.37;
    paintImpasto(
      x,
      pathShape((p) => pawPath(p, cx, cy, s)),
      '#2f6b5a',
      { bbox: [cx - s * 0.6, cy - s * 0.55, s * 1.2, s * 1.1], angle: 1.1 },
    );
    paintImpasto(x, spacedShape('SAHTE', `900 ${MW * 0.115}px "Fraunces"`, cx, MH * 0.84, MW * 0.016), '#2f6b5a', { bbox: [MW * 0.1, MH * 0.74, MW * 0.8, MH * 0.12], angle: 1.3, wK: 0.65, lenK: 0.6 });
  },
  async back(x) {
    const S = oilScene(),
      R = rng(9),
      o = [0, 0, 0];
    x.drawImage(
      pixels(MW, MH, (i, j, oo) => S.color(i, j, S.region(i, j), oo)),
      0,
      0,
    );
    x.lineCap = 'round';
    x.lineJoin = 'round';
    const spots = [[S.moon.x - S.moon.r * 3, S.moon.y - S.moon.r * 3, S.moon.r * 6, S.moon.r * 6], ...S.stars.map((s) => [s.x - s.r * 2.5, s.y - s.r * 2.5, s.r * 5, s.r * 5]), [100, S.H0 - 175, MW - 100, 190], [300, MH * 0.78, 130, 110]];
    const passes = [
      { n: 2300, len: [18, 42], w: [8, 13], step: 2.6 },
      { n: 3600, len: [10, 24], w: [5, 8], step: 2.2 },
      { n: 3000, len: [5, 13], w: [2.4, 4.4], step: 1.7, detail: true },
    ];
    let tY = performance.now();
    for (const ps of passes)
      for (let k = 0; k < ps.n; k++) {
        if ((k & 31) === 31 && performance.now() - tY > 30) {
          await idle();
          tY = performance.now();
        }
        let px, py;
        if (ps.detail && R() < 0.7) {
          const s = spots[(R() * spots.length) | 0];
          px = s[0] + R() * s[2];
          py = s[1] + R() * s[3];
        } else {
          px = R() * MW;
          py = R() * MH;
        }
        const r0 = S.region(px, py);
        S.color(px, py, r0, o);
        const j = (R() - 0.5) * 0.16,
          c = j > 0 ? mixc(o, [255, 255, 255], j) : mixc(o, [0, 0, 0], -j);
        const len = ps.len[0] + R() * (ps.len[1] - ps.len[0]),
          w = ps.w[0] + R() * (ps.w[1] - ps.w[0]);
        const pts = [[px, py]];
        let cx = px,
          cy = py;
        const dir = R() < 0.5 ? 1 : -1;
        for (let s = 0, n = Math.ceil(len / ps.step); s < n; s++) {
          const a = S.angle(cx, cy, r0);
          cx += Math.cos(a) * ps.step * dir;
          cy += Math.sin(a) * ps.step * dir;
          if (cx < 0 || cy < 0 || cx >= MW || cy >= MH || S.region(cx, cy) !== r0) break;
          pts.push([cx, cy]);
        }
        if (pts.length > 1) oilStroke(x, pts, w, c);
      }
    x.save();
    x.globalAlpha = 0.55;
    x.fillStyle = '#121a3d';
    x.fill(S.city);
    x.restore();
    for (let k = 0; k < 900; k++) {
      const px = 100 + R() * (MW - 100),
        py = S.H0 - 170 + R() * 175;
      if (S.region(px, py) !== 1) continue;
      S.color(px, py, 1, o);
      oilStroke(
        x,
        [
          [px, py],
          [px + (R() - 0.5), py + 3 + R() * 4],
        ],
        2 + R() * 1.6,
        o,
      );
    }
    x.save();
    x.fillStyle = '#0d0c12';
    x.fill(S.cat);
    x.strokeStyle = '#0d0c12';
    x.lineWidth = S.catH * 0.075;
    x.lineCap = 'round';
    x.stroke(S.tail);
    x.clip(S.cat);
    x.translate(-2.2, 2.2);
    x.strokeStyle = 'rgba(150,170,230,0.55)';
    x.lineWidth = 3;
    x.stroke(S.cat);
    x.restore();
    x.save();
    x.fillStyle = '#ffe7a0';
    x.shadowColor = 'rgba(255,214,110,0.9)';
    x.shadowBlur = 8;
    for (let k = 0; k < 40; k++) {
      const px = 112 + R() * (MW - 112),
        py = S.H0 - 40 + R() * 40;
      if (S.region(px, py) === 1 && R() < 0.5) {
        x.beginPath();
        x.ellipse(px, py, 1.8, 2.4, 0, 0, TAU);
        x.fill();
      }
    }
    x.restore();
    x.save();
    x.globalCompositeOperation = 'overlay';
    x.globalAlpha = 0.15;
    x.drawImage(TEX.weave, 0, 0);
    x.restore();
    x.save();
    x.strokeStyle = 'rgba(10,12,30,0.55)';
    x.lineWidth = MW * 0.012;
    x.beginPath();
    x.roundRect(MW * 0.006, MW * 0.006, MW * 0.988, MH - MW * 0.012, MW * 0.165);
    x.stroke();
    x.restore();
  },
};

/* oyun yüzleri: okey işareti, etiket ve sahte okey pençesi */
OIL.okeyMark = function (x) {
  const cx = MW / 2,
    cy = MH * 0.135,
    r = MW * 0.085;
  paintImpasto(
    x,
    pathShape((p) => star5Path(p, cx, cy, r, 0.46)),
    '#eaa70c',
    { bbox: [cx - r, cy - r, 2 * r, 2 * r], angle: 0.9, count: 70, wK: 0.7, lenK: 0.6 },
  );
  x.save();
  x.strokeStyle = 'rgba(226,167,15,0.55)';
  x.lineWidth = MW * 0.012;
  x.beginPath();
  x.roundRect(MW * 0.075, MW * 0.075, MW * 0.85, MH - MW * 0.15, MW * 0.1);
  x.stroke();
  x.restore();
};
OIL.label = function (x, text, y, size, ink) {
  paintImpasto(x, spacedShape(text, `900 ${MW * size}px "Fraunces"`, MW / 2, y, MW * 0.016), ink, { bbox: [MW * 0.08, y - MW * size, MW * 0.84, MW * size * 1.3], angle: 1.3, wK: 0.6, lenK: 0.55 });
};
OIL.paw = function (x, cx, cy, s) {
  paintImpasto(
    x,
    pathShape((p) => pawPath(p, cx, cy, s)),
    '#2f6b5a',
    { bbox: [cx - s * 0.6, cy - s * 0.55, s * 1.2, s * 1.1], angle: 1.1 },
  );
};
OIL.fakeLabelInk = '#2f6b5a';
