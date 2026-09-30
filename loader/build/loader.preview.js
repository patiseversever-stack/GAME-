(() => {
  // loader/src/geometry.js
  var PW = 1800;
  var PH = 1160;
  var W = 5.4;
  var H = W * PH / PW;
  var UNIT = W / PW;
  var FOV = 32;
  var PITCH = 0.255;
  var clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  var mix = (a, b, t) => a + (b - a) * t;
  var heightAt = (x, z) => 0.034 + 9e-3 * Math.exp(-Math.pow(x / 0.035, 2)) + 28e-4 * Math.sin(x * 3.5 + z * 3) + 15e-4 * Math.sin(z * 13 + x * 7) + 0.018 * Math.pow(Math.abs(x) / (W / 2), 18) + 0.014 * Math.pow(Math.abs(z) / (H / 2), 20) + 0.063 * Math.exp(-Math.pow((x - W / 2) / 0.24, 2) - Math.pow((z - H / 2) / 0.24, 2)) + 0.032 * Math.exp(-Math.pow((x + W / 2) / 0.22, 2) - Math.pow((z + H / 2) / 0.24, 2));
  function layoutOf(w, h, coarse) {
    const compact = w > h && (h <= 600 || coarse);
    const edge = clamp(Math.round(h * 0.023), 6, 14), rail = h <= 340 ? 44 : 48;
    return { compact, edge, rail };
  }
  function overviewPose(sw, sh, coarse) {
    const L = layoutOf(sw, sh, coarse);
    let safe;
    if (L.compact) safe = { x: L.edge + L.rail + 8, y: L.edge, w: sw - 2 * (L.edge + L.rail + 8), h: sh - L.edge * 2 };
    else safe = { x: sw < 700 ? 12 : 42, y: sh < 550 ? 42 : 64, w: sw - (sw < 700 ? 24 : 84), h: sh - (sh < 550 ? 74 : 104) };
    safe.h = Math.max(75, safe.h);
    const tan = Math.tan(FOV * Math.PI / 360), aspect = sw / sh;
    const ww = PW * UNIT, hh = PH * UNIT * Math.cos(PITCH);
    const d = clamp(Math.max(ww / (2 * tan * aspect * safe.w / sw), hh / (2 * tan * safe.h / sh)) * 1.06, 0.88, 26);
    return { d, pitch: PITCH, ox: sw / 2 - (safe.x + safe.w / 2), oy: sh / 2 - (safe.y + safe.h / 2), safe };
  }
  function projector(sw, sh, pose, lift = 9e-3) {
    const c = Math.cos(pose.pitch), s = Math.sin(pose.pitch);
    const px = 0, py = pose.d * c, pz = pose.d * s;
    let zx = px, zy = py, zz = pz;
    const zl = Math.hypot(zx, zy, zz);
    zx /= zl;
    zy /= zl;
    zz /= zl;
    let xx = zz, xy = 0, xz = -zx;
    const xl = Math.hypot(xx, xy, xz);
    xx /= xl;
    xy /= xl;
    xz /= xl;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    const tan = Math.tan(FOV * Math.PI / 360), aspect = sw / sh;
    return (x, y) => {
      const wx = (x / PW - 0.5) * W, wz = (y / PH - 0.5) * H, wy = heightAt(wx, wz) + lift;
      const dx = wx - px, dy = wy - py, dz = wz - pz;
      const cx = dx * xx + dy * xy + dz * xz, cy = dx * yx + dy * yy + dz * yz, cz = dx * zx + dy * zy + dz * zz;
      const nx = cx / -cz / (tan * aspect), ny = cy / -cz / tan;
      return { x: (nx + 1) * sw / 2 - pose.ox, y: (1 - ny) * sh / 2 - pose.oy };
    };
  }
  function predictOverviewQuad(sw, sh, coarse) {
    const pose = overviewPose(sw, sh, coarse), project = projector(sw, sh, pose);
    return [[0, 0], [PW, 0], [PW, PH], [0, PH]].map(([x, y]) => project(x, y));
  }
  var centroid = (q) => ({ x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 });
  var scaleQuad = (q, k, about = centroid(q)) => q.map((p) => ({ x: about.x + (p.x - about.x) * k, y: about.y + (p.y - about.y) * k }));
  var moveQuad = (q, dx, dy) => q.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  var lerpQuad = (a, b, t) => a.map((p, i) => ({ x: mix(p.x, b[i].x, t), y: mix(p.y, b[i].y, t) }));
  var quadBounds = (q) => {
    const xs = q.map((p) => p.x), ys = q.map((p) => p.y);
    const l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
    return { l, r, t, b, w: r - l, h: b - t };
  };
  var transformQuad = (q, m) => q.map((p) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f }));
  function homography(w, h, q) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]];
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x2, y] = src[i], X = q[i].x, Y = q[i].y;
      A.push([x2, y, 1, 0, 0, 0, -x2 * X, -y * X]);
      b.push(X);
      A.push([0, 0, 0, x2, y, 1, -x2 * Y, -y * Y]);
      b.push(Y);
    }
    const n = 8;
    for (let i = 0; i < n; i++) {
      let p = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]];
      [b[i], b[p]] = [b[p], b[i]];
      for (let r = i + 1; r < n; r++) {
        const f2 = A[r][i] / A[i][i];
        for (let c2 = i; c2 < n; c2++) A[r][c2] -= f2 * A[i][c2];
        b[r] -= f2 * b[i];
      }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let c2 = i + 1; c2 < n; c2++) s -= A[i][c2] * x[c2];
      x[i] = s / A[i][i];
    }
    const [a, bb, c, d, e, f, g, hh] = x;
    const m = [a, d, 0, g, bb, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1];
    return "matrix3d(" + m.map((v) => +v.toFixed(7)).join(",") + ")";
  }
  function offsetQuad(q, m) {
    const c = centroid(q), out = [];
    const lines = [];
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      let nx = b.y - a.y, ny = a.x - b.x;
      const l = Math.hypot(nx, ny);
      nx /= l;
      ny /= l;
      if ((a.x - c.x) * nx + (a.y - c.y) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
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
  function roundedLoop(q, r, arcSteps = 6) {
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const p = q[(i + 3) % 4], c = q[i], n = q[(i + 1) % 4];
      const v1 = { x: p.x - c.x, y: p.y - c.y }, v2 = { x: n.x - c.x, y: n.y - c.y };
      const l1 = Math.hypot(v1.x, v1.y), l2 = Math.hypot(v2.x, v2.y);
      const rr = Math.min(r, l1 * 0.45, l2 * 0.45);
      const a = { x: c.x + v1.x / l1 * rr, y: c.y + v1.y / l1 * rr }, b = { x: c.x + v2.x / l2 * rr, y: c.y + v2.y / l2 * rr };
      for (let k = 0; k <= arcSteps; k++) {
        const t = k / arcSteps, u = 1 - t;
        pts.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
      }
    }
    let len = 0;
    const seg = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      seg.push(l);
      len += l;
    }
    return { pts, seg, len };
  }
  function pointOnLoop(loop, s) {
    s = (s % loop.len + loop.len) % loop.len;
    for (let i = 0; i < loop.pts.length; i++) {
      if (s <= loop.seg[i] || i === loop.pts.length - 1) {
        const a = loop.pts[i], b = loop.pts[(i + 1) % loop.pts.length], t = loop.seg[i] ? s / loop.seg[i] : 0;
        return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) };
      }
      s -= loop.seg[i];
    }
    return loop.pts[0];
  }

  // loader/src/data.generated.js
  var GAME = { "PW": 1800, "PH": 1160, "CELL": 72, "GX": 36, "GY": 106, "COLS": 24, "ROWS": 14 };
  var ZONES = [[0, 4, 3, 1, 1, 1], [0, 12, 3, 1, 1, 1], [0, 16, 2, 1, 1, 1], [0, 18, 2, 1, 1, 1], [0, 20, 1, 1, 1, 1], [0, 21, 1, 1, 1, 1], [0, 22, 2, 1, 1, 1], [1, 10, 1, 1, 1, 1], [1, 11, 1, 1, 1, 1], [1, 17, 1, 2, 1, 1], [2, 5, 1, 1, 1, 1], [2, 13, 1, 1, 1, 1], [3, 13, 1, 2, 1, 1], [4, 1, 1, 2, 1, 1], [4, 11, 1, 1, 1, 1], [4, 15, 1, 1, 1, 1], [4, 17, 1, 1, 1, 1], [4, 19, 1, 1, 1, 1], [5, 2, 2, 1, 1, 1], [5, 8, 1, 1, 1, 1], [6, 7, 1, 1, 1, 2], [6, 12, 1, 1, 1, 2], [7, 0, 1, 2, 1, 1], [7, 6, 1, 1, 1, 1], [8, 3, 1, 1, 1, 1], [8, 13, 1, 1, 1, 1], [8, 23, 1, 1, 1, 1], [9, 3, 1, 1, 1, 1], [9, 13, 1, 1, 1, 1], [9, 14, 1, 2, 1, 1], [10, 1, 1, 1, 1, 1], [10, 8, 1, 1, 1, 1], [10, 17, 1, 1, 1, 1], [11, 12, 1, 2, 1, 1], [12, 16, 1, 1, 1, 1], [13, 11, 1, 1, 1, 1], [13, 19, 1, 1, 1, 1], [0, 7, 4, 1, 0, 1], [0, 11, 1, 1, 0, 1], [0, 15, 1, 1, 0, 1], [1, 23, 1, 3, 0, 1], [2, 19, 1, 1, 0, 1], [4, 0, 1, 3, 0, 1], [4, 7, 3, 1, 0, 1], [4, 14, 1, 1, 0, 1], [4, 23, 1, 1, 0, 1], [5, 5, 3, 1, 0, 1], [5, 16, 1, 1, 0, 1], [5, 18, 1, 1, 0, 1], [6, 1, 1, 1, 0, 1], [6, 3, 1, 1, 0, 1], [6, 5, 2, 1, 0, 1], [7, 13, 2, 1, 0, 1], [7, 16, 1, 1, 0, 1], [7, 18, 1, 1, 0, 1], [8, 1, 1, 2, 0, 1], [8, 10, 1, 2, 0, 1], [9, 0, 1, 2, 0, 1], [9, 18, 1, 1, 0, 1], [10, 16, 1, 1, 0, 1], [11, 19, 1, 1, 0, 1], [12, 10, 2, 1, 0, 1], [12, 14, 1, 1, 0, 1], [13, 4, 4, 1, 0, 1], [13, 8, 3, 1, 0, 1]];
  var PHOTOS = [["portrait", 0, 0, 4, 4, "PORTRE"], ["compass", 5, 20, 4, 3, "PUSULA"], ["archive", 11, 0, 4, 3, "RIHTIM"]];
  var CELLS = [[1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 12], [1, 13], [1, 14], [1, 15], [1, 16], [1, 18], [1, 19], [1, 20], [1, 21], [1, 22], [2, 4], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 12], [2, 14], [2, 15], [2, 16], [2, 18], [2, 20], [2, 21], [2, 22], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 10], [3, 11], [3, 12], [3, 14], [3, 15], [3, 16], [3, 17], [3, 18], [3, 19], [3, 20], [3, 21], [3, 22], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 10], [4, 12], [4, 16], [4, 18], [4, 20], [4, 21], [4, 22], [5, 4], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13], [5, 14], [5, 15], [5, 17], [5, 19], [6, 2], [6, 4], [6, 8], [6, 9], [6, 10], [6, 11], [6, 13], [6, 14], [6, 15], [6, 16], [6, 17], [6, 18], [6, 19], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 7], [7, 8], [7, 9], [7, 10], [7, 11], [7, 12], [7, 15], [7, 17], [7, 19], [8, 2], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9], [8, 11], [8, 12], [8, 14], [8, 15], [8, 16], [8, 17], [8, 18], [8, 19], [8, 20], [8, 21], [8, 22], [9, 2], [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 9], [9, 11], [9, 12], [9, 15], [9, 16], [9, 17], [9, 19], [9, 20], [9, 21], [9, 22], [9, 23], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [10, 9], [10, 10], [10, 11], [10, 12], [10, 13], [10, 15], [10, 18], [10, 19], [10, 20], [10, 21], [10, 22], [10, 23], [11, 4], [11, 5], [11, 6], [11, 7], [11, 8], [11, 9], [11, 10], [11, 11], [11, 13], [11, 14], [11, 15], [11, 16], [11, 17], [11, 18], [11, 20], [11, 21], [11, 22], [11, 23], [12, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9], [12, 13], [12, 15], [12, 17], [12, 18], [12, 19], [12, 20], [12, 21], [12, 22], [12, 23], [13, 12], [13, 13], [13, 14], [13, 15], [13, 16], [13, 17], [13, 18], [13, 20], [13, 21], [13, 22], [13, 23]];
  var ARROWS = [[1, 3, 0], [7, 21, 1], [12, 3, 0], [8, 13, 0], [4, 15, 1], [0, 4, 1], [3, 3, 0], [6, 12, 0], [4, 17, 1], [4, 19, 1], [10, 17, 0], [9, 14, 0], [5, 8, 0], [1, 10, 1], [7, 20, 1], [12, 16, 0], [7, 22, 1], [8, 3, 0], [6, 7, 1], [7, 6, 0], [4, 11, 1], [6, 7, 0], [11, 3, 0], [13, 11, 0], [2, 5, 0], [9, 3, 0], [10, 1, 0], [11, 12, 0], [9, 13, 1], [7, 0, 0], [5, 2, 1], [0, 12, 1], [10, 8, 0], [6, 12, 1], [1, 11, 0], [4, 1, 0], [13, 19, 0], [0, 16, 1], [3, 13, 0], [8, 23, 1], [0, 18, 1], [1, 17, 0], [0, 20, 1], [0, 21, 1], [2, 13, 0], [0, 22, 1]];
  var LETTERS = [[1, 4, "P", "w1"], [1, 5, "O", "w1"], [1, 6, "R", "w1"], [1, 7, "T", "w1"], [1, 8, "R", "w1"], [1, 9, "E", "w1"], [2, 4, "A", "w6"], [3, 4, "R", "w6"], [4, 4, "Ş", "w6"], [5, 4, "Ö", "w6"], [6, 4, "M", "w6"], [7, 4, "E", "w6"], [8, 4, "N", "w6"], [3, 5, "Ö", "w7"], [3, 6, "N", "w7"], [3, 7, "E", "w7"], [3, 8, "S", "w7"], [3, 9, "A", "w7"], [3, 10, "N", "w7"], [3, 11, "S", "w7"], [2, 6, "D", "w25"], [2, 7, "E", "w25"], [2, 8, "S", "w25"], [2, 9, "T", "w25"], [2, 10, "A", "w25"], [2, 11, "N", "w25"]];

  // loader/src/art.js
  var { CELL, GX, GY, COLS, ROWS } = GAME;
  var SERIF = "Georgia,'Times New Roman','Noto Serif','DejaVu Serif',serif";
  var SANS = "Arial,Helvetica,'Liberation Sans',sans-serif";
  var INK = "#182e25";
  var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  var svgURL = (svg) => 'url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/"/g, "%22") + '")';
  function rng(seed) {
    let s = seed >>> 0;
    return () => (s = 1664525 * s + 1013904223 >>> 0) / 4294967296;
  }
  var NOISE = svgURL("<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42 0 0 0 0 .33 0 0 0 0 .2 0 0 0 .15 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>");
  var cellX = (c) => GX + c * CELL;
  var cellY = (r) => GY + r * CELL;
  function cellsLayer() {
    let d = "";
    for (const [r, c] of CELLS) d += `M${cellX(c)} ${cellY(r)}h${CELL}v${CELL}h-${CELL}z`;
    return `<svg class="gp-layer" viewBox="0 0 1800 1160" width="1800" height="1160"><path d="${d}" fill="#fff9e5" fill-opacity=".62"/></svg>`;
  }
  function zoneLayers(bands = 4) {
    const out = Array.from({ length: bands }, () => "");
    const r = rng(11);
    for (const [zr, zc, w, h, primary] of ZONES) {
      const x = cellX(zc), y = cellY(zr), W2 = w * CELL, H2 = h * CELL;
      const b = Math.min(bands - 1, Math.floor(zc / (COLS / bands)));
      let s = `<rect x="${x}" y="${y}" width="${W2}" height="${H2}" fill="${primary ? "#c3d0c0" : "#e3e5d6"}" stroke="#5d6f5e" stroke-width="2.4"/>`;
      const lines = primary ? W2 > CELL ? 3 : 2 : 1, pad = 9, innerW = W2 - pad * 2;
      for (let i = 0; i < lines; i++) {
        const bw = Math.max(22, innerW * (i === lines - 1 ? 0.5 + r() * 0.25 : 0.86 + r() * 0.14));
        const by = y + (primary ? 20 : 26) + i * (H2 > CELL ? 16 : 13) * (primary ? 1 : 1.2);
        s += `<rect x="${x + pad}" y="${by}" width="${bw.toFixed(1)}" height="7" rx="3.5" fill="${INK}" fill-opacity="${primary ? 0.34 : 0.22}"/>`;
      }
      out[b] += s;
    }
    let arrows = "";
    for (const [r0, c0, dir] of ARROWS) {
      arrows += dir === 0 ? `<text x="${cellX(c0) + CELL - 6}" y="${cellY(r0) + CELL * 0.62}" text-anchor="end" font-family="${SANS}" font-weight="700" font-size="24" fill="#2e4032">→</text>` : `<text x="${cellX(c0) + CELL * 0.5}" y="${cellY(r0) + CELL - 6}" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="24" fill="#2e4032">↓</text>`;
    }
    out[bands - 1] += arrows;
    return out.map((s) => `<svg class="gp-layer" viewBox="0 0 1800 1160" width="1800" height="1160">${s}</svg>`);
  }
  var PHOTO_CAP = { portrait: ["01", "Bir yüzün anlatısı"], compass: ["02", "Kuzeyi ararken"], archive: ["03", "Kıyıdaki hafıza"] };
  function photoBlocks() {
    return PHOTOS.map(([id, r, c, w, h]) => {
      const [n, cap] = PHOTO_CAP[id] || ["00", ""];
      return `<div class="gp-photo" data-photo="${id}" style="left:${cellX(c)}px;top:${cellY(r)}px;width:${w * CELL}px;height:${h * CELL}px"><i></i><canvas></canvas><b></b><s>${n}  /  FOTOĞRAFLI SORU</s><u>${esc(cap)}</u></div>`;
    }).join("");
  }
  function letterCells() {
    return LETTERS.map(([r, c, ch], i) => `<div class="gp-ltr" data-i="${i}" style="left:${cellX(c)}px;top:${cellY(r)}px">${esc(ch)}</div>`).join("");
  }
  function heroMarkup() {
    const [zA, zB, zC, zD] = zoneLayers(4);
    return `
<div class="gp-hero">
  <div class="gp-paper"></div>
  <div class="gp-t gp-title" data-k="title">Gece Postası</div>
  <div class="gp-t gp-kick" data-k="kick">BİR SAYFA. BİR DÜNYA.</div>
  <div class="gp-t gp-tag" data-k="tag">Şehirler, zamanlar ve fikirler arasında bir yolculuk.</div>
  <div class="gp-t gp-date" data-k="date">29 EYLÜL 2026  /  KÜLTÜR EKİ  /  03</div>
  <div class="gp-t gp-count" data-k="count">46 CEVAP   ·   TEK BİR BULMACA</div>
  <div class="gp-rule a" data-k="ruleA"></div><div class="gp-rule b" data-k="ruleB"></div>
  <div class="gp-gridbg" data-k="gridbg"></div>
  <div class="gp-layer" data-k="cells">${cellsLayer()}</div>
  <div class="gp-lines h" data-k="linesH"></div><div class="gp-lines v" data-k="linesV"></div>
  <div class="gp-layer" data-k="zoneA">${zA}</div><div class="gp-layer" data-k="zoneB">${zB}</div>
  <div class="gp-layer" data-k="zoneC">${zC}</div><div class="gp-layer" data-k="zoneD">${zD}</div>
  <div class="gp-frame" data-k="frame"></div>
  <div class="gp-layer" data-k="photos">${photoBlocks()}</div>
  <div class="gp-layer" data-k="letters">${letterCells()}</div>
  <div class="gp-fold" data-k="fold"></div>
  <div class="gp-layer" data-k="foot"><div class="gp-foot" style="left:36px;font:700 10px/1 ${SERIF};color:#455c48">GECE POSTASI</div><div class="gp-foot" style="left:0;width:1800px;text-align:center;font:12px/1 ${SERIF};color:#5e6b58">Bir harf, iki cevap. Kesişimlerde yeni bir yol açılır.</div><div class="gp-foot" style="right:36px;font:500 9px/1 ${SANS};color:#4c624b">OK BULMACASI   /   01</div></div>
  <div class="gp-tint" data-k="tint"></div>
  <div class="gp-layer" style="overflow:hidden;border-radius:6px;pointer-events:none"><div class="gp-shine" data-k="shine"></div></div>
</div>`;
  }
  var PAPER = "<defs><linearGradient id='pg' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff8e9'/><stop offset='.55' stop-color='#ece2ce'/><stop offset='1' stop-color='#e0d2b5'/></linearGradient><pattern id='ht' width='6' height='6' patternUnits='userSpaceOnUse'><circle cx='3' cy='3' r='1.7' fill='#182e25' fill-opacity='.62'/></pattern><linearGradient id='tone' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.05'/><stop offset='1' stop-color='#eee4cf' stop-opacity='.92'/></linearGradient></defs>";
  var bar = (x, y, w, o = 0.3, h = 7) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${INK}" fill-opacity="${o}"/>`;
  var rule = (x, y, w, t = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${t}" fill="#26352f"/>`;
  var txt = (t, x, y, size, o = {}) => `<text x="${x}" y="${y}" font-family="${o.sans ? SANS : SERIF}" font-weight="${o.w || 400}" font-size="${size}" ${o.i ? 'font-style="italic"' : ""} ${o.anchor ? `text-anchor="${o.anchor}"` : ""} fill="${o.fill || INK}" ${o.ls ? `letter-spacing="${o.ls}"` : ""}>${esc(t)}</text>`;
  function masthead(w, size = 34, date = true) {
    return txt("Gece Postası", 18, 18 + size * 0.8, size, { w: 700 }) + (date ? txt("29 EYLÜL 2026  /  KÜLTÜR EKİ", w - 18, 26, 9, { sans: 1, w: 500, anchor: "end", fill: "#50604e" }) : "") + rule(18, 26 + size, w - 36, 2) + rule(18, 32 + size, w - 36, 1);
  }
  function gridSheet(w, h, cols, rows, seed) {
    const r = rng(seed), top = 70, pad = 18, cs = Math.min((w - pad * 2) / cols, (h - top - 26) / rows), gx = (w - cs * cols) / 2, gy = top;
    let s = PAPER + `<rect width="${w}" height="${h}" fill="url(#pg)"/>` + masthead(w, 30);
    s += `<rect x="${gx}" y="${gy}" width="${cs * cols}" height="${cs * rows}" fill="#d8ddcf"/>`;
    const kind = [];
    for (let i = 0; i < rows; i++) {
      kind[i] = [];
      for (let j = 0; j < cols; j++) kind[i][j] = r() < 0.24 ? 1 : 0;
    }
    kind[0][0] = 1;
    const word = "PUSULA";
    let wr = 2 + Math.floor(r() * (rows - 3));
    for (let j = 0; j < cols; j++) for (let i = 0; i < rows; i++) {
      const x = gx + j * cs, y = gy + i * cs, clue = kind[i][j] && !(i === wr && j >= 1 && j <= word.length);
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}" fill="${clue ? "#c3d0c0" : "#f0f0e0"}" stroke="#5d6f5e" stroke-width="1.4"/>`;
      if (clue) {
        s += bar(x + 5, y + cs * 0.3, cs - 10, 0.34, Math.max(3, cs * 0.12)) + bar(x + 5, y + cs * 0.5, (cs - 10) * 0.6, 0.3, Math.max(3, cs * 0.12));
        s += txt(r() < 0.5 ? "→" : "↓", x + cs - 5, y + cs - 5, cs * 0.3, { sans: 1, w: 700, anchor: "end", fill: "#2e4032" });
      }
    }
    for (let k = 0; k < word.length; k++) s += txt(word[k], gx + (k + 1.5) * cs, gy + wr * cs + cs * 0.72, cs * 0.56, { w: 700, anchor: "middle" });
    s += `<rect x="${gx}" y="${gy}" width="${cs * cols}" height="${cs * rows}" fill="none" stroke="#344737" stroke-width="2.4"/>`;
    s += txt("OK BULMACASI   /   01", w - 18, h - 9, 8, { sans: 1, w: 500, anchor: "end", fill: "#4c624b" });
    return s;
  }
  function frontSheet(w, h, seed) {
    const r = rng(seed);
    let s = PAPER + `<rect width="${w}" height="${h}" fill="url(#pg)"/>` + masthead(w, 36);
    const top = 78, colW = (w - 36 - 16) / 3;
    s += bar(18, top, w * 0.62, 0.55, 14) + bar(18, top + 24, w * 0.4, 0.38, 9);
    const ph = h * 0.3;
    s += `<rect x="18" y="${top + 48}" width="${w - 36}" height="${ph}" fill="#b8bca8"/><rect x="18" y="${top + 48}" width="${w - 36}" height="${ph}" fill="url(#ht)"/><rect x="18" y="${top + 48}" width="${w - 36}" height="${ph}" fill="url(#tone)"/>`;
    s += bar(18, top + 48 + ph + 8, w * 0.34, 0.4, 6);
    const y0 = top + 48 + ph + 26;
    for (let c = 0; c < 3; c++) {
      const x = 18 + c * (colW + 8);
      for (let y = y0; y < h - 16; y += 10.5) s += bar(x, y, colW * (0.68 + r() * 0.32), 0.22, 4.6);
    }
    return s;
  }
  function photoSheet(w, h, seed) {
    const r = rng(seed);
    let s = PAPER + `<rect width="${w}" height="${h}" fill="url(#pg)"/>` + masthead(w, 28, false);
    const top = 66, ph = h * 0.5;
    s += `<rect x="16" y="${top}" width="${w - 32}" height="${ph}" fill="#9aa48f"/><rect x="16" y="${top}" width="${w - 32}" height="${ph}" fill="url(#ht)"/><rect x="16" y="${top}" width="${w - 32}" height="${ph}" fill="url(#tone)" opacity=".7"/>`;
    s += `<circle cx="${w * 0.42}" cy="${top + ph * 0.44}" r="${ph * 0.26}" fill="${INK}" fill-opacity=".38"/>`;
    s += `<rect x="16" y="${top + ph - 52}" width="${w - 32}" height="52" fill="#15211a" fill-opacity=".86"/>` + txt("01  /  FOTOĞRAFLI SORU", 28, top + ph - 32, 9, { sans: 1, w: 700, fill: "#e4d9bb" }) + txt("Bir yüzün anlatısı", 28, top + ph - 12, 17, { fill: "#fff8e5" });
    const y0 = top + ph + 18;
    s += bar(16, y0, w - 32, 0.34, 8) + bar(16, y0 + 16, (w - 32) * 0.7, 0.28, 8);
    const n = 6, cw = Math.min(34, (w - 32 - 26) / n);
    for (let i = 0; i < n; i++) s += `<rect x="${16 + i * cw}" y="${y0 + 40}" width="${cw}" height="${cw}" fill="#f0f0e0" stroke="#5d6f5e" stroke-width="1.4"/>`;
    s += txt("→", 16 + n * cw + 10, y0 + 40 + cw * 0.7, 20, { sans: 1, w: 700, fill: "#2e4032" });
    for (let y = y0 + 40 + cw + 16; y < h - 14; y += 10.5) s += bar(16, y, (w - 32) * (0.5 + r() * 0.5), 0.2, 4.6);
    return s;
  }
  function cluesSheet(w, h, seed) {
    const r = rng(seed);
    let s = PAPER + `<rect width="${w}" height="${h}" fill="url(#pg)"/>` + txt("SAYFA DİZİNİ", 20, 28, 11, { sans: 1, w: 700, fill: "#755533", ls: 2 }) + txt("Birbirine bağlı.", 20, 62, 28, { i: 1 }) + rule(20, 76, w - 40, 2);
    const colW = (w - 40 - 14) / 2;
    let k = 1;
    for (let c = 0; c < 2; c++) for (let y = 98, i = 0; y < h - 20; y += 26, i++) {
      const x = 20 + c * (colW + 14);
      s += txt(String(k++).padStart(2, "0"), x, y + 8, 11, { sans: 1, w: 700, fill: "#8b6532" }) + txt(r() < 0.5 ? "→" : "↓", x + 26, y + 8, 12, { sans: 1, w: 700, fill: "#2e4032" });
      s += bar(x + 44, y, (colW - 44) * (0.6 + r() * 0.4), 0.3, 6) + bar(x + 44, y + 11, (colW - 44) * (0.3 + r() * 0.4), 0.2, 5);
    }
    return s;
  }
  function sheetArt(kind, seed = 1) {
    const W2 = { grid: 560, front: 360, photo: 340, clues: 420 }[kind], H2 = { grid: 380, front: 500, photo: 470, clues: 340 }[kind];
    const body = kind === "grid" ? gridSheet(W2, H2, 12, 7, seed) : kind === "front" ? frontSheet(W2, H2, seed) : kind === "photo" ? photoSheet(W2, H2, seed) : cluesSheet(W2, H2, seed);
    return { w: W2, h: H2, bg: NOISE + "," + svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W2} ${H2}" width="${W2}" height="${H2}">${body}</svg>`) };
  }
  var ALPHABET = "ABCÇDEFGĞHIİJKLMNOÖPQRSŞTUÜVWXYZ".split("");
  var TR_SPECIAL = /* @__PURE__ */ new Set(["Ç", "Ğ", "İ", "Ö", "Ş", "Ü"]);

  // loader/src/index.js
  var T = { INTRO: 2300, OUTRO: 800, QUICK: 170, BELT_SPEED: 34, SHINE: 8200, PULSE: 9600 };
  var EASE = { out: "cubic-bezier(.16,1,.3,1)", inOut: "cubic-bezier(.65,0,.35,1)", soft: "cubic-bezier(.45,.05,.15,1)", stamp: "cubic-bezier(.2,.85,.3,1.15)", lin: "linear" };
  var bez = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      let t = x;
      for (let i = 0; i < 6; i++) {
        const e = X(t) - x, d = dX(t);
        if (Math.abs(e) < 1e-5 || !d) break;
        t -= e / d;
      }
      return Y(clamp(t, 0, 1));
    };
  };
  var easeMorph = bez(0.65, 0, 0.2, 1);
  var STAMP = [{ opacity: 0, transform: "translateY(-7px) scale(1.5)" }, { opacity: 1, transform: "translateY(1px) scale(.93)", offset: 0.46 }, { opacity: 1, transform: "translateY(0) scale(1.035)", offset: 0.72 }, { opacity: 1, transform: "none" }];
  var N1 = { w: 560, h: 361, cols: 8, rows: 8, cs: 34, gx: 22, gy: 68 };
  var N1_WORDS = [
    // [kelime, satır, sütun, yön]  (sütun 1 boyunca PAPİRÜS, satırlara dallanan PORTRE/PUSULA/RİTİM/SONAT)
    ["PAPİRÜS", 1, 1, "d"],
    ["PORTRE", 1, 1, "a"],
    ["PUSULA", 3, 1, "a"],
    ["RİTİM", 5, 1, "a"],
    ["SONAT", 7, 1, "a"]
  ];
  function n1Letters() {
    const seen = /* @__PURE__ */ new Map(), out = [];
    for (const [w, r, c, d] of N1_WORDS) [...w].forEach((ch, i) => {
      const rr = r + (d === "d" ? i : 0), cc = c + (d === "a" ? i : 0), k = rr + "," + cc;
      if (!seen.has(k)) {
        seen.set(k, 1);
        out.push([rr, cc, ch]);
      }
    });
    return out;
  }
  function n1Markup() {
    const { cs, gx, gy, cols, rows } = N1, gw = cols * cs, gh = rows * cs, letters = n1Letters(), has = new Set(letters.map((l) => l[0] + "," + l[1]));
    let blocks = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = gx + c * cs, y = gy + r * cs, k = r + "," + c;
      if (has.has(k)) {
        blocks += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="#f2f1e1"/>`;
        continue;
      }
      blocks += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="#c3d0c0"/>`;
      blocks += `<rect x="${x + 5}" y="${y + 11}" width="${cs - 10}" height="5" rx="2.5" fill="#182e25" fill-opacity=".32"/><rect x="${x + 5}" y="${y + 21}" width="${(cs - 10) * 0.6}" height="5" rx="2.5" fill="#182e25" fill-opacity=".26"/>`;
    }
    const colX = gx + gw + 26, colW = N1.w - colX - 22;
    let cols8 = "";
    const seed = [0.92, 0.7, 0.86, 0.58, 0.95, 0.74, 0.88, 0.5];
    for (let g = 0; g < 8; g++) {
      const x = colX + g % 2 * (colW / 2 + 5), y = gy + 100 + Math.floor(g / 2) * 46;
      let bars = "";
      for (let i = 0; i < 5; i++) bars += `<rect x="0" y="${i * 9}" width="${(colW / 2 - 5) * (i === 4 ? seed[g] * 0.6 : 0.78 + (i * 7 + g * 3) % 5 * 0.055)}" height="4.4" rx="2.2" fill="#182e25" fill-opacity=".27"/>`;
      cols8 += `<div class="gp-n1-g" data-k="n1col" style="left:${x}px;top:${y}px"><svg width="${colW / 2}" height="44" style="width:${colW / 2}px;height:44px">${bars}</svg></div>`;
    }
    const lt = letters.map(([r, c, ch], i) => `<div class="gp-n1-l" data-k="n1let" data-i="${i}" style="left:${gx + c * cs}px;top:${gy + r * cs}px">${ch}</div>`).join("");
    return `<div class="gp-n1" style="width:${N1.w}px;height:${N1.h}px">
  <div class="gp-n1-paper" data-k="n1paper"></div>
  <div class="gp-n1-t" data-k="n1title" style="left:22px;top:13px;font:700 34px/1 ${SERIF};color:#182e25;letter-spacing:-.3px">Gece Postası</div>
  <div class="gp-n1-t" data-k="n1date" style="right:22px;top:20px;font:500 9px/1 ${SANS};color:#50604e">29 EYLÜL 2026  /  KÜLTÜR EKİ</div>
  <div class="gp-n1-r" data-k="n1ruleA" style="left:22px;top:54px;width:${N1.w - 44}px;height:2px"></div><div class="gp-n1-r" data-k="n1ruleB" style="left:22px;top:59px;width:${N1.w - 44}px;height:1px"></div>
  <div class="gp-n1-gbg" data-k="n1gbg" style="left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px"></div>
  <svg class="gp-n1-blocks" data-k="n1blocks" width="${N1.w}" height="${N1.h}" style="width:${N1.w}px;height:${N1.h}px">${blocks}</svg>
  <div class="gp-n1-lat h" data-k="n1latH" style="left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${cs - 1.6}px,rgba(75,92,78,.85) ${cs - 1.6}px,rgba(75,92,78,.85) ${cs}px)"></div>
  <div class="gp-n1-lat v" data-k="n1latV" style="left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px;background-image:repeating-linear-gradient(to right,transparent 0,transparent ${cs - 1.6}px,rgba(75,92,78,.85) ${cs - 1.6}px,rgba(75,92,78,.85) ${cs}px)"></div>
  <div class="gp-n1-frame" data-k="n1frame" style="left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px"></div>
  <div class="gp-n1-ph" data-k="n1photo" style="left:${colX}px;top:${gy}px;width:${colW}px;height:78px"></div>
  <div class="gp-n1-bar" data-k="n1col" style="left:${colX}px;top:${gy + 86}px;width:${colW * 0.86}px;height:8px"></div>
  ${cols8}${lt}
</div>`;
  }
  var N1_CSS = `
.gp-n1{position:absolute;left:0;top:0;transform-origin:0 0;font-family:${SERIF}}
.gp-n1-paper{position:absolute;inset:0;border-radius:4px;background:${NOISE},linear-gradient(118deg,#fff8e9 0%,#f3eadb 34%,#ece2ce 62%,#e2d4b8 100%)}
.gp-n1-t{position:absolute;white-space:nowrap}.gp-n1-r{position:absolute;background:#26352f;transform-origin:0 50%}
.gp-n1-gbg{position:absolute;background:#d8ddcf;transform-origin:50% 0}.gp-n1-blocks{position:absolute;left:0;top:0}
.gp-n1-lat{position:absolute;background-repeat:no-repeat}.gp-n1-lat.h{transform-origin:0 50%}.gp-n1-lat.v{transform-origin:50% 0}
.gp-n1-frame{position:absolute;border:2.5px solid #344737;transform-origin:50% 50%}
.gp-n1-ph{position:absolute;background:radial-gradient(circle,rgba(24,46,37,.6) 34%,transparent 38%) 0 0/6px 6px,linear-gradient(150deg,#d6d5c0,#8f9a83);border:1.5px solid #344634}
.gp-n1-g{position:absolute;transform-origin:0 50%}.gp-n1-bar{position:absolute;border-radius:4px;background:rgba(24,46,37,.5);transform-origin:0 50%}
.gp-n1-l{position:absolute;width:34px;height:34px;display:grid;place-items:center;font:700 22px/1 ${SERIF};color:#182e25;text-shadow:0 0 1px rgba(24,46,37,.5)}
`;
  var cssInjected = false;
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const s = document.createElement("style");
    s.id = "gp-loader-n1";
    s.textContent = N1_CSS;
    document.head.appendChild(s);
  }
  function createLoader(root, opts = {}) {
    injectCSS();
    const seekMode = opts.mode === "seek";
    const doc = root.ownerDocument, win = doc.defaultView;
    const state = { phase: "boot", t0: 0, outroAt: 0, done: false, failed: false, quad: null, stage: "boot", lastMsg: 0, pendingMsg: null };
    const anims = { intro: [], loop: [], outro: [] };
    const q = (k, all) => all ? [...root.querySelectorAll(`[data-k="${k}"]`)] : root.querySelector(`[data-k="${k}"]`);
    let L = null, reduce = false, lite = false;
    const listeners = {};
    const emit = (n, d) => {
      (listeners[n] || []).forEach((f) => {
        try {
          f(d);
        } catch (e) {
          console.error(e);
        }
      });
      root.dispatchEvent(new CustomEvent("gp-loader:" + n, { detail: d }));
    };
    const settings = () => {
      var _a;
      try {
        return ((_a = JSON.parse(win.localStorage.getItem("gece-postasi-connected-v3") || "null")) == null ? void 0 : _a.settings) || {};
      } catch {
        return {};
      }
    };
    const viewport = () => {
      var _a;
      if (opts.size) return { w: opts.size.w, h: opts.size.h };
      return { w: Math.max(240, doc.documentElement.clientWidth || win.innerWidth), h: Math.round(((_a = win.visualViewport) == null ? void 0 : _a.height) || win.innerHeight) };
    };
    function buildDOM() {
      var _a;
      root.classList.add("gp");
      const st = opts.settings || settings();
      const theme = opts.theme || (st.theme === "day" ? "day" : "night");
      root.setAttribute("data-theme", theme);
      const msg = ((_a = root.querySelector("#load-message")) == null ? void 0 : _a.textContent) || "Bir sayfa. Bir dünya.";
      root.innerHTML = `
<div class="gp-ground"></div>
<div class="gp-back" data-k="back"><div class="gp-belt" data-k="belt"></div></div>
<div class="gp-cam" data-k="cam"><div class="gp-quad" data-k="quad">${heroMarkup()}</div></div>
<div class="gp-front" data-k="front"></div>
<div class="gp-ui" data-k="ui"><div class="gp-chipui" data-k="chip"><span class="gp-mono">GP</span><span class="gp-sep"></span><span class="gp-say"><b>BASKI HAZIRLANIYOR</b><p id="load-message">${msg}</p></span></div></div>
<div class="gp-sr" role="status" aria-live="polite" data-k="live">Baskı hazırlanıyor</div>`;
      root.setAttribute("role", "progressbar");
      root.setAttribute("aria-busy", "true");
      root.setAttribute("aria-label", "Gece Postası yükleniyor");
      root.removeAttribute("aria-valuenow");
    }
    function computeLayout() {
      var _a;
      const { w: vw, h: vh } = viewport(), land = vw > vh, coarse = opts.coarse ?? ((_a = win.matchMedia) == null ? void 0 : _a.call(win, "(pointer:coarse)").matches) ?? false;
      const pred = predictOverviewQuad(vw, vh, coarse), pb = quadBounds(pred), pc = centroid(pred);
      const chipH = 46;
      let k, cx, cy;
      if (land) {
        const padTop = 32, gap = 34, padBot = 10;
        k = Math.min(0.8, (vh - padTop - gap - chipH - padBot) / pb.h, vw * 0.7 / pb.w);
        cx = vw / 2;
        cy = padTop + pb.h * k / 2;
      } else {
        k = Math.min(0.96, (vw - 30) / pb.w);
        cx = vw / 2;
        cy = vh * 0.43;
      }
      const rest = moveQuad(scaleQuad(pred, k, pc), cx - pc.x, cy - pc.y), rb = quadBounds(rest);
      const chipTop = land ? Math.min(vh - chipH - 8, rb.b + 32) : rb.b + clamp(vh * 0.07, 44, 70);
      return { vw, vh, land, coarse, pred, rest, rb, cx, cy, hw: rb.w, hh: rb.h, chipTop, P: clamp(vh * 1.75, 520, 1800) };
    }
    function applyLayout() {
      L = computeLayout();
      const ui = q("chip");
      ui.style.top = L.chipTop + "px";
      const quad = q("quad");
      if (state.phase !== "outro") quad.style.transform = homography(PW, PH, L.rest);
      for (const k of ["back", "front"]) {
        const e = q(k);
        e.style.perspective = L.P + "px";
        e.style.perspectiveOrigin = `${L.cx}px ${L.cy}px`;
      }
    }
    function sheetSpecs() {
      const { hw, hh, cx, cy, land, vw, vh } = L;
      const A = land ? [
        ["m1", "photo", 3, 0.47, [-0.72, -0.34], -30, -6, 15, 3, 0.97, [-0.75 * hw - 80, 0], 1250, 900, "back"],
        ["m2", "clues", 5, 0.56, [0.74, 0.36], -50, 5, -13, 3, 0.96, [0.75 * hw + 80, 0], 1350, 900, "back"],
        ["f1", "front", 7, 0.34, [0.86, -0.56], -150, 9, -10, 4, 0.5, [0, -hh], 1500, 900, "back", "far"],
        ["f2", "grid", 9, 0.46, [-0.9, 0.55], -170, -10, 12, 4, 0.5, [0, hh], 1550, 900, "back", "far"]
      ] : [
        ["m1", "photo", 3, 0.55, [-0.42, -1.05], -30, -6, 10, 3, 0.97, [0, -hh * 2.4], 1250, 900, "back"],
        ["m2", "clues", 5, 0.7, [0.34, 1.12], -50, 5, -9, 3, 0.96, [0, hh * 2.4], 1350, 900, "back"],
        ["f1", "front", 7, 0.4, [0.62, -1.6], -150, 9, -8, 4, 0.5, [0, -hh * 2], 1500, 900, "back", "far"],
        ["f2", "grid", 9, 0.55, [-0.52, 1.75], -170, -10, 9, 4, 0.5, [0, hh * 2], 1550, 900, "back", "far"]
      ];
      return A.map(([id, kind, seed, wRel, [dx, dy], z, rz, ry, rx, op, [ox, oy], delay, dur, layer, cls]) => ({ id, kind, seed, w: wRel * hw, x: cx + dx * hw, y: cy + dy * hh, z, rz, ry, rx, op, ox, oy, delay, dur, layer, cls }));
    }
    const tf = (x, y, z, rx, ry, rz, s = 1) => `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`;
    function buildSheets() {
      q("back").querySelectorAll(".gp-sheet").forEach((e) => e.remove());
      q("front").innerHTML = "";
      const back = q("back"), front = q("front");
      L.sheets = [];
      if (lite) return;
      for (const s of sheetSpecs()) {
        const art = sheetArt(s.kind, s.seed), h = s.w * art.h / art.w;
        const el = doc.createElement("div");
        el.className = "gp-sheet" + (s.cls ? " " + s.cls : "");
        el.style.width = s.w + "px";
        el.style.height = h + "px";
        el.dataset.sheet = s.id;
        el.style.backgroundImage = art.bg;
        el.style.backgroundSize = "200px 200px,100% 100%";
        el.innerHTML = '<div class="gp-sheet-in"><div class="gp-gloss"></div></div>';
        back.appendChild(el);
        L.sheets.push({ ...s, el, h });
      }
      const w1 = L.hw * 1.03, k1 = w1 / N1.w, h1 = N1.h * k1;
      const n1 = doc.createElement("div");
      n1.className = "gp-sheet gp-sheet-n1";
      n1.style.width = w1 + "px";
      n1.style.height = h1 + "px";
      n1.dataset.sheet = "n1";
      n1.style.backgroundImage = "none";
      n1.style.background = "transparent";
      n1.style.boxShadow = "none";
      n1.innerHTML = n1Markup();
      n1.firstElementChild.style.transform = `scale(${k1})`;
      front.appendChild(n1);
      L.n1 = { el: n1, w: w1, h: h1, k: k1 };
      const a2 = sheetArt("front", 13), w2 = L.hw * (L.land ? 0.6 : 0.72), h2 = w2 * a2.h / a2.w;
      const n2 = doc.createElement("div");
      n2.className = "gp-sheet";
      n2.style.width = w2 + "px";
      n2.style.height = h2 + "px";
      n2.dataset.sheet = "n2";
      n2.style.backgroundImage = a2.bg;
      n2.style.backgroundSize = "200px 200px,100% 100%";
      n2.innerHTML = '<div class="gp-gloss" style="position:absolute;inset:0;border-radius:inherit;background:linear-gradient(105deg,rgba(255,255,255,.3),rgba(255,255,255,0) 38%,rgba(0,0,0,.09))"></div>';
      front.appendChild(n2);
      L.n2 = { el: n2, w: w2, h: h2 };
      for (const s of L.sheets) s.el.style.transform = tf(s.x - s.w / 2 + s.ox, s.y - s.h / 2 + s.oy, s.z, s.rx, s.ry, s.rz);
      n1.style.transform = tf(L.cx - w1 / 2, L.cy - h1 / 2, 50, 0, 0, 0);
      n2.style.transform = tf(-w2 * 2, L.cy - h2 / 2, 30, 0, 0, 0);
      n2.style.opacity = 0;
    }
    function buildBelt() {
      const belt = q("belt");
      belt.innerHTML = "";
      L.belt = null;
      if (reduce) return;
      const path = roundedLoop(offsetQuad(L.rest, 17), 16, 6), N = ALPHABET.length;
      L.belt = { path, N, period: path.len / T.BELT_SPEED * 1e3 };
      const frag = doc.createDocumentFragment();
      ALPHABET.forEach((ch, i) => {
        const c = doc.createElement("div");
        c.className = "gp-chip" + (TR_SPECIAL.has(ch) ? " tr" : "");
        c.textContent = ch;
        c.dataset.i = i;
        frag.appendChild(c);
      });
      belt.appendChild(frag);
    }
    const reg = (phase, el, frames, o = {}) => {
      if (!el) return null;
      const a = el.animate(frames, { duration: o.d, delay: o.t || 0, easing: o.e || "linear", fill: "both", iterations: o.n || 1 });
      a.pause();
      a.__phase = phase;
      anims[phase].push(a);
      return a;
    };
    const clearAnims = (phase) => {
      for (const a of anims[phase]) {
        try {
          a.cancel();
        } catch {
        }
      }
      anims[phase].length = 0;
    };
    function makeIntro() {
      clearAnims("intro");
      const R = (k, f, o) => q(k, false) && reg("intro", q(k), f, o), RA = (k, f, o, stagger = 0) => q(k, true).forEach((e, i) => reg("intro", e, f, { ...o, t: (o.t || 0) + i * stagger }));
      const o0 = [{ opacity: 0 }, { opacity: 1 }];
      R("n1paper", [{ transform: "scaleY(.012)", opacity: 0 }, { transform: "scaleY(.012)", opacity: 1, offset: 0.1 }, { transform: "scaleY(1)", opacity: 1 }], { d: 440, e: EASE.out });
      R("n1title", STAMP, { d: 400, t: 150, e: EASE.out });
      R("n1date", o0, { d: 300, t: 380 });
      R("n1ruleA", [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { d: 480, t: 140, e: EASE.out });
      R("n1ruleB", [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { d: 480, t: 200, e: EASE.out });
      R("n1gbg", [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { d: 480, t: 240, e: EASE.out });
      R("n1latH", [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { d: 600, t: 290, e: EASE.out });
      R("n1latV", [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { d: 600, t: 340, e: EASE.out });
      R("n1blocks", [{ opacity: 0 }, { opacity: 1 }], { d: 380, t: 620, e: EASE.soft });
      R("n1frame", [{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "none" }], { d: 420, t: 480, e: EASE.out });
      R("n1photo", o0, { d: 360, t: 520 });
      RA("n1col", [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { d: 330, t: 520, e: EASE.out }, 50);
      RA("n1let", STAMP, { d: 430, t: 820, e: EASE.stamp }, 34);
      reg("intro", q("cam"), [{ opacity: 0, transform: "scale(1.045)" }, { opacity: 1, transform: "scale(1.045)", offset: 0.3 }, { opacity: 1, transform: "scale(1)" }], { d: T.INTRO - 200, e: EASE.soft });
      q("cam").style.transformOrigin = `${L.cx}px ${L.cy}px`;
      RA("letters", o0, { d: 1 });
      if (L.n1) {
        const { w, h } = L.n1, x0 = L.cx - w / 2, y0 = L.cy - h / 2;
        reg("intro", L.n1.el, [
          { transform: tf(x0, y0, 50, 0, 0, 0), opacity: 1 },
          { transform: tf(x0, y0, 50, 0, 0, 0), opacity: 1, offset: 0.58 },
          { transform: tf(x0 - L.hw * 1.45 - w * 0.2, y0 - h * 0.05, 90, 4, 16, -5), opacity: 1 }
        ], { d: T.INTRO, e: EASE.inOut });
        const w2 = L.n2.w, h2 = L.n2.h;
        reg("intro", L.n2.el, [
          { transform: tf(L.cx - L.hw * 1.3 - w2, L.cy - h2 / 2 - L.hh * 0.04, 30, 3, -14, 4), opacity: 0, offset: 0 },
          { transform: tf(L.cx - L.hw * 1.3 - w2, L.cy - h2 / 2 - L.hh * 0.04, 30, 3, -14, 4), opacity: 1, offset: 0.5 },
          { transform: tf(L.cx + L.hw * 1.35, L.cy - h2 / 2 + L.hh * 0.05, 70, 3, -10, 6), opacity: 1 }
        ], { d: T.INTRO, e: EASE.inOut });
      }
      for (const s of L.sheets || []) {
        const rest = tf(s.x - s.w / 2, s.y - s.h / 2, s.z, s.rx, s.ry, s.rz), from = tf(s.x - s.w / 2 + s.ox, s.y - s.h / 2 + s.oy, s.z - 40, s.rx + 4, s.ry + (s.ry > 0 ? 10 : -10), s.rz + (s.rz > 0 ? 6 : -6));
        reg("intro", s.el, [{ transform: from, opacity: 0 }, { transform: rest, opacity: s.op }], { d: s.dur, t: s.delay, e: EASE.out });
      }
      reg("intro", q("belt"), o0, { d: 520, t: 1800, e: EASE.soft });
      reg("intro", q("chip"), [{ opacity: 0, transform: "translate(-50%,8px)" }, { opacity: 1, transform: "translate(-50%,0)" }], { d: 480, t: 240, e: EASE.out });
    }
    function makeLoop() {
      var _a;
      clearAnims("loop");
      const inf = (el, frames, o) => reg("loop", el, frames, { ...o, n: Infinity });
      if (L.belt) {
        const { path, N, period } = L.belt, M = 96, frames = [];
        for (let k = 0; k <= M; k++) {
          const p = pointOnLoop(path, path.len * k / M);
          frames.push({ transform: `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`, offset: k / M });
        }
        q("belt").querySelectorAll(".gp-chip").forEach((c, i) => inf(c, frames, { d: period, t: -period * i / N, e: "linear" }));
      }
      inf(q("shine"), [{ transform: "translateX(-780px) skewX(-9deg)", offset: 0, easing: EASE.soft }, { transform: "translateX(1900px) skewX(-9deg)", offset: 0.46 }, { transform: "translateX(1900px) skewX(-9deg)", offset: 1 }], { d: T.SHINE });
      (_a = q("letters", false)) == null ? void 0 : _a.querySelectorAll(".gp-ltr").forEach((e, i, all) => inf(e, [
        { transform: "scale(1)", offset: 0 },
        { transform: "scale(1.11)", offset: 0.025, easing: EASE.out },
        { transform: "scale(.985)", offset: 0.055 },
        { transform: "scale(1)", offset: 0.085 },
        { transform: "scale(1)", offset: 1 }
      ], { d: T.PULSE, t: -T.PULSE * i / all.length, e: "linear" }));
      (L.sheets || []).forEach((s, i) => {
        const a = s.cls === "far" ? 3 : 5, p = 7600 + i * 1700, inner = s.el.firstElementChild;
        inf(inner, [{ transform: "translateY(0) rotate(0deg)", offset: 0, easing: EASE.soft }, { transform: `translateY(${a}px) rotate(${i % 2 ? 0.5 : -0.5}deg)`, offset: 0.5, easing: EASE.soft }, { transform: "translateY(0) rotate(0deg)", offset: 1 }], { d: p, t: -p * (i * 0.21) });
      });
    }
    function playAll() {
      const base = doc.timeline.currentTime;
      const el = state.now ?? 0;
      for (const a of [...anims.intro, ...anims.loop]) {
        a.startTime = base - el;
      }
    }
    function seekPhase(phase, ms) {
      for (const a of anims[phase]) {
        a.pause();
        a.currentTime = ms;
      }
    }
    let rafId = 0;
    function readCamMatrix() {
      const cam = q("cam"), m = new win.DOMMatrix(win.getComputedStyle(cam).transform === "none" ? void 0 : win.getComputedStyle(cam).transform);
      const o = { x: L.cx, y: L.cy };
      const M = new win.DOMMatrix().translate(o.x, o.y).multiply(m).translate(-o.x, -o.y);
      return { a: M.a, b: M.b, c: M.c, d: M.d, e: M.e, f: M.f };
    }
    function startOutro(o = {}) {
      var _a;
      if (state.phase === "outro" || state.phase === "done") return;
      const quick = !!o.quick;
      state.phase = "outro";
      root.dataset.state = "outro";
      root.setAttribute("aria-busy", "false");
      (_a = performance.mark) == null ? void 0 : _a.call(performance, "gp-outro");
      const cam = q("cam"), quad = q("quad");
      let start = L.rest;
      try {
        if (anims.intro.length) start = transformQuad(L.rest, readCamMatrix());
      } catch {
      }
      const camOp = parseFloat(win.getComputedStyle(cam).opacity || "1");
      anims.intro.filter((a) => {
        var _a2;
        return ((_a2 = a.effect) == null ? void 0 : _a2.target) === cam;
      }).forEach((a) => a.cancel());
      cam.style.transform = "none";
      cam.style.opacity = "";
      state.start = start;
      state.camOp = isNaN(camOp) ? 1 : camOp;
      clearAnims("outro");
      const O = (el, frames, op) => reg("outro", el, frames, op);
      const dur = quick ? T.QUICK : T.OUTRO;
      if (quick) {
        O(root, [{ opacity: 1 }, { opacity: 0 }], { d: T.QUICK, e: "ease-out" });
      } else {
        O(cam, [{ opacity: state.camOp }, { opacity: 1, offset: 0.2 }, { opacity: 1 }], { d: dur });
        O(q("back"), [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.07)" }], { d: 470, e: EASE.soft });
        O(q("front"), [{ opacity: 1 }, { opacity: 0 }], { d: 260, e: "ease-out" });
        O(q("ui"), [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(10px)" }], { d: 280, e: "ease-out" });
        O(root.querySelector(".gp-ground"), [{ opacity: 1 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { d: 620, e: "ease-in-out" });
        O(q("tint"), [{ opacity: 0 }, { opacity: 1 }], { d: 520, t: 120, e: "ease-in" });
        O(quad, [{ opacity: 1 }, { opacity: 1, offset: 0.52 }, { opacity: 0 }], { d: dur, e: "linear" });
      }
      if (seekMode) {
        state.outroAt = 0;
        return;
      }
      for (const a of anims.outro) a.play();
      state.outroAt = performance.now();
      tick();
    }
    function liveQuad() {
      var _a, _b;
      let g = null;
      try {
        g = ((_a = opts.getQuad) == null ? void 0 : _a.call(opts)) || ((_b = state.quad) == null ? void 0 : _b.call(state));
      } catch {
      }
      return g && g.length === 4 && g.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) ? g : L.pred;
    }
    function applyOutro(t) {
      const quad = q("quad"), quick = root.dataset.quick === "1";
      if (!quick) {
        const p = easeMorph(clamp(t / (T.OUTRO * 0.82), 0, 1));
        quad.style.transform = homography(PW, PH, lerpQuad(state.start, liveQuad(), p));
      }
    }
    function tick() {
      if (state.phase !== "outro") return;
      const t = performance.now() - state.outroAt;
      applyOutro(t);
      if (t >= (root.dataset.quick === "1" ? T.QUICK : T.OUTRO) + 30) {
        finish();
        return;
      }
      rafId = win.requestAnimationFrame(tick);
    }
    function finish() {
      var _a, _b;
      if (state.done) return;
      state.done = true;
      state.phase = "done";
      root.dataset.state = "done";
      win.cancelAnimationFrame(rafId);
      api.destroy();
      (_a = performance.mark) == null ? void 0 : _a.call(performance, "gp-done");
      root.hidden = true;
      (_b = root.remove) == null ? void 0 : _b.call(root);
      emit("done", { at: performance.now() });
    }
    function init() {
      var _a, _b;
      const st = opts.settings || settings();
      reduce = opts.reduceMotion ?? (!!((_a = win.matchMedia) == null ? void 0 : _a.call(win, "(prefers-reduced-motion:reduce)").matches) || st.motion === false);
      lite = opts.lite ?? (!!(win.navigator.deviceMemory && win.navigator.deviceMemory <= 2) || reduce);
      buildDOM();
      applyLayout();
      buildSheets();
      buildBelt();
      root.dataset.state = "intro";
      state.phase = "intro";
      (_b = performance.mark) == null ? void 0 : _b.call(performance, "gp-start");
      if (reduce) {
        makeCalm();
      } else {
        makeIntro();
        makeLoop();
      }
      if (!seekMode) {
        state.now = 0;
        state.t0 = performance.now();
        playAll();
      }
      win.addEventListener("resize", onResize);
      win.addEventListener("orientationchange", onResize);
    }
    function makeCalm() {
      clearAnims("intro");
      clearAnims("loop");
      reg("intro", q("cam"), [{ opacity: 0 }, { opacity: 1 }], { d: 360, e: EASE.soft });
      reg("intro", q("chip"), [{ opacity: 0, transform: "translate(-50%,0)" }, { opacity: 1, transform: "translate(-50%,0)" }], { d: 360, e: EASE.soft });
      q("front").innerHTML = "";
      root.querySelectorAll(".gp-sheet").forEach((e) => e.remove());
      q("front", false) && (q("front").style.display = "none");
      q("back", false) && (q("back").style.display = "none");
      q("shine") && (q("shine").style.display = "none");
    }
    let resizeTimer = 0;
    function onResize() {
      if (state.phase === "outro" || state.phase === "done") return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const el = state.phase === "intro" || state.phase === "loop" ? performance.now() - state.t0 : 0;
        applyLayout();
        buildSheets();
        buildBelt();
        if (!reduce) {
          makeIntro();
          makeLoop();
        }
        state.now = el;
        if (!seekMode) playAll();
      }, 120);
    }
    const api = {
      get phase() {
        return state.phase;
      },
      get layout() {
        return L;
      },
      on(n, f) {
        (listeners[n] || (listeners[n] = [])).push(f);
        return api;
      },
      // Oyundan gelen GERÇEK olaylar ------------------------------------------------------------
      stage(name) {
        var _a;
        state.stage = name;
        root.dataset.stage = name;
        (_a = performance.mark) == null ? void 0 : _a.call(performance, "gp-stage-" + name);
        if (name === "build") api.message("Sayfa dizgiye giriyor");
        return api;
      },
      message(text) {
        const el = root.querySelector("#load-message");
        if (!el) return api;
        const live = q("live");
        if (live) live.textContent = text;
        const now = performance.now(), wait = Math.max(0, 480 - (now - state.lastMsg));
        clearTimeout(state.msgTimer);
        state.msgTimer = setTimeout(() => {
          el.textContent = text;
          state.lastMsg = performance.now();
        }, wait);
        return api;
      },
      asset(key, image) {
        const box = root.querySelector(`.gp-photo[data-photo="${key}"]`);
        if (!box || !image) return api;
        const cv = box.querySelector("canvas"), w = 240, h = Math.round(240 * box.offsetHeight / Math.max(1, box.offsetWidth)) || 240;
        try {
          cv.width = w;
          cv.height = h;
          const c = cv.getContext("2d"), r = Math.max(w / image.width, h / image.height), sw = w / r, sh = h / r;
          c.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, w, h);
          const a = cv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 720, easing: EASE.soft, fill: "forwards" });
          if (seekMode) a.finish();
        } catch {
        }
        return api;
      },
      // Sonraki kareye kadar bekle (yükleyici yeni durumu çizebilsin diye, ağır senkron iş öncesi)
      yield() {
        return new Promise((res) => {
          let d = false;
          const go = () => {
            if (!d) {
              d = true;
              res();
            }
          };
          win.requestAnimationFrame(() => win.requestAnimationFrame(go));
          setTimeout(go, 90);
        });
      },
      built() {
        return api;
      },
      // Oyun hazır: ilk kare çizilince çıkışı başlat. project(x,y) → ekran noktası (Posta.screenPoint); frames() → çizilen kare sayısı
      ready(o = {}) {
        var _a;
        if (state.phase === "outro" || state.phase === "done") return api;
        state.readyRequested = true;
        (_a = performance.mark) == null ? void 0 : _a.call(performance, "gp-ready-called");
        const project = o.project;
        if (project) state.quad = () => [[0, 0], [PW, 0], [PW, PH], [0, PH]].map(([x, y]) => project(x, y));
        const go = () => {
          if (state.phase === "outro" || state.phase === "done") return;
          api.stage("frame");
          const elapsed = performance.now() - state.t0;
          root.dataset.quick = elapsed < 140 || reduce ? "1" : "0";
          startOutro({ quick: root.dataset.quick === "1" });
        };
        if (!o.frames) {
          win.requestAnimationFrame(() => win.requestAnimationFrame(go));
          return api;
        }
        const f0 = o.frames(), t0 = performance.now();
        const poll = () => {
          if (performance.now() - t0 > (o.timeout ?? 4e3) || o.frames() > f0) {
            win.requestAnimationFrame(go);
            return;
          }
          win.requestAnimationFrame(poll);
        };
        win.requestAnimationFrame(poll);
        return api;
      },
      fail(err) {
        if (state.done) return api;
        state.failed = true;
        root.dataset.state = "error";
        root.setAttribute("aria-busy", "false");
        for (const a of anims.loop) {
          try {
            a.pause();
          } catch {
          }
        }
        const text = typeof err === "string" ? err : (err == null ? void 0 : err.message) || "Bilinmeyen hata";
        const el = root.querySelector("#load-message");
        if (el) el.textContent = "Görüntü başlatılamadı: " + text + ". WebGL destekli güncel bir tarayıcıda aç.";
        const chip = q("chip");
        if (chip && !chip.querySelector(".gp-retry")) {
          const b = doc.createElement("button");
          b.className = "gp-retry";
          b.type = "button";
          b.textContent = "Yeniden dene";
          b.onclick = () => win.location.reload();
          chip.appendChild(b);
        }
        api.stage("error");
        return api;
      },
      // Evreleri ayrı ayrı kontrol et (önizleme / Remotion) --------------------------------------------
      // seek({ t }) : tam akış zamanı (intro → loop → outro). Senaryo: readyAt (ms) ile erken bitiş simüle edilir.
      seek({ t, readyAt = null, loopMs = 0 }) {
        const INTRO = T.INTRO;
        const tLoopIntro = readyAt != null ? Math.min(t, readyAt) : t;
        const tIntro = Math.min(tLoopIntro, INTRO);
        if (state.phase === "outro" || state.phase === "done") return api;
        for (const a of anims.intro) {
          a.pause();
          a.currentTime = tIntro;
        }
        for (const a of anims.loop) {
          a.pause();
          a.currentTime = tLoopIntro;
        }
        return api;
      },
      // Çıkış evresini belirli bir ana sarar: t = çıkışın başlangıcından ms. from: çıkışın başladığı giriş/döngü zamanı.
      seekOutro({ t, from = T.INTRO + 2e3, quick = false, quad = null }) {
        if (quad) state.quad = () => quad;
        for (const a of anims.intro) {
          a.pause();
          a.currentTime = Math.min(from, T.INTRO);
        }
        for (const a of anims.loop) {
          a.pause();
          a.currentTime = from;
        }
        if (state.phase !== "outro") {
          root.dataset.quick = quick ? "1" : "0";
          startOutro({ quick });
        }
        for (const a of anims.outro) {
          a.pause();
          a.currentTime = t;
        }
        applyOutro(t);
        return api;
      },
      setQuad(getter) {
        state.quad = typeof getter === "function" ? getter : () => getter;
        return api;
      },
      playLoopOnly() {
        state.now = T.INTRO;
        playAll();
        return api;
      },
      estimateRasterMB(dpr = 3) {
        let px = 0;
        const add = (w, h) => {
          px += w * h * dpr * dpr;
        };
        add(L.vw, L.vh);
        add(L.rb.w, L.rb.h);
        (L.sheets || []).forEach((s) => add(s.w, s.h));
        if (L.n1) add(L.n1.w, L.n1.h);
        if (L.n2) add(L.n2.w, L.n2.h);
        add(L.belt ? 26 * 32 : 0, 1);
        return +(px * 4 / 1048576).toFixed(1);
      },
      destroy() {
        clearAnims("intro");
        clearAnims("loop");
        clearAnims("outro");
        win.removeEventListener("resize", onResize);
        win.removeEventListener("orientationchange", onResize);
        win.cancelAnimationFrame(rafId);
      }
    };
    init();
    return api;
  }

  // loader/src/entry-preview.js
  window.GPLoaderKit = { createLoader, T, predictOverviewQuad };
})();
