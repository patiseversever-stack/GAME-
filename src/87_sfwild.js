/* =====================================================================
   GÖLGE FİGÜRLERİ — YABAN HAYATI (VII–XV. perdeler)
   ===================================================================== */
// dört ayaklı bacak: üst kemik + alt kemik; yürüyüş/tırıs/dörtnal
// legs: [[üst, alt, faz, arka mı]]; ph: döngü fazı (0..1 tur), amp: genlik
function sfGait(B, legs, ph, amp, o = {}) {
  const sw = o.swing || 0.32, kn = o.knee || 0.55, lift = o.lift || 6;
  for (const [u, l, off, hind] of legs) {
    const p = (ph + off) * TAU, s = Math.sin(p), up = Math.max(0, Math.cos(p));
    B[u].r += -s * sw * amp; B[l].r += (hind ? -1 : 1) * up * kn * amp; B[u].y += -up * lift * amp;
  }
}
// bacak şekli: merkez çizgi + genişlik profili (diz/dirsek kalınlığı) + toynak/pati
function sfLeg(pts, widths, foot) {
  const line = [], n = pts.length / 2;
  for (let i = 0; i < n - 1; i++) { const seg = sfCurve(pts[i * 2], pts[i * 2 + 1], lerp(pts[i * 2], pts[i * 2 + 2], 0.33), lerp(pts[i * 2 + 1], pts[i * 2 + 3], 0.33), lerp(pts[i * 2], pts[i * 2 + 2], 0.66), lerp(pts[i * 2 + 1], pts[i * 2 + 3], 0.66), pts[i * 2 + 2], pts[i * 2 + 3], 6); line.push(...(i ? seg.slice(2) : seg)); }
  const m = line.length / 2, out = [sfStroke(line, 1, 1, 1, 1, (s) => { const f = s * (widths.length - 1), i = Math.min(widths.length - 2, Math.floor(f)); return lerp(widths[i], widths[i + 1], f - i); })];
  if (foot) out.push(foot);
  return out;
}
// tüylü kuyruk: kalın gövde, yuvarlak uç
const sfBrush = (line, base, mid, tip) => sfStroke(line, 1, 1, 1, 1, (s) => lerp(base, tip, s) + (mid - lerp(base, tip, 0.5)) * Math.pow(Math.sin(PI * Math.min(1, s * 1.05)), 1.1));
// tüy dokusu: çokgen kenarına dışa doğru küçük tutam dişleri ekle (from..to: kenar oranı aralığı)
function sfFur(p, amp, step, from = 0, to = 1, seed = 1) {
  const n = p.length / 2, out = [], A = sfArea(p) > 0 ? 1 : -1; let acc = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, x0 = p[i * 2], y0 = p[i * 2 + 1], x1 = p[j * 2], y1 = p[j * 2 + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1, f = i / n;
    out.push(x0, y0);
    if (f < from || f > to) continue;
    acc += L; while (acc > step) { acc -= step; const u = 1 - acc / L; if (u < 0 || u > 1) continue; const a = amp * (0.6 + hash1(seed + k++) * 0.8); out.push(x0 + (x1 - x0) * u + (y1 - y0) / L * a * A * -1, y0 + (y1 - y0) * u - (x1 - x0) / L * a * A * -1); }
  }
  return out;
}
// tüylü kenar: kenarı ince örnekleyip testere dişi tutamlar (geriye yatık); ampF(x, y) bölgeye göre boy
function sfShag(p, ampF, step = 10, seed = 1) {
  const q = [], n0 = p.length / 2;
  for (let i = 0; i < n0; i++) { const j = (i + 1) % n0, x0 = p[i * 2], y0 = p[i * 2 + 1], x1 = p[j * 2], y1 = p[j * 2 + 1], m = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2)); for (let k = 0; k < m; k++) q.push(x0 + ((x1 - x0) * k) / m, y0 + ((y1 - y0) * k) / m); }
  const n = q.length / 2, A = sfArea(q) > 0 ? 1 : -1, o = []; let s = 0;
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n, tx = q[b * 2] - q[a * 2], ty = q[b * 2 + 1] - q[a * 2 + 1], l = Math.hypot(tx, ty) || 1, nx = (-A * ty) / l, ny = (A * tx) / l;
    if (i) s += Math.hypot(q[i * 2] - q[i * 2 - 2], q[i * 2 + 1] - q[i * 2 - 1]);
    const x = q[i * 2], y = q[i * 2 + 1], am = ampF(x, y, nx, ny);
    if (am <= 0.01) { o.push(x, y); continue; }
    const k = Math.floor(s / step), f = s / step - k, sw = tx > 0 ? 1 - f : f, h = am * (0.6 + hash1(seed + k) * 0.8) * Math.pow(sw, 1.7);
    o.push(x + nx * h, y + ny * h);
  }
  return o;
}
// zamanlı parçacık sıçraması (kar, su, toz): saf zaman fonksiyonu
function sfSplash(u, n, seed, x, y, o = {}) {
  const out = []; if (u <= 0) return out;
  const g = o.g ?? 600, sp = o.sp ?? 260, up = o.up ?? 380, r0 = o.r ?? 5, life = o.life ?? 1.2, dir = o.dir ?? 0;
  for (let i = 0; i < n; i++) {
    const t0 = hash1(seed + i) * (o.spread ?? 0.12), dt = u - t0; if (dt < 0 || dt > life) continue;
    const a = (hash1(seed + i + 31) - 0.5) * (o.cone ?? 2.2) + dir, v = (0.5 + hash1(seed + i + 77)) * sp;
    const px = x + Math.sin(a) * v * dt, py = y - (Math.cos(a) * up * (0.6 + hash1(seed + i + 9) * 0.6)) * dt + 0.5 * g * dt * dt;
    const r = r0 * (0.5 + hash1(seed + i + 13)) * (1 - smoothstep(life * 0.6, life, dt));
    if (r > 0.6) out.push(sfEllipse(px, py, r, r * 1.1, a, 8));
  }
  return out;
}

/* ---------- VII. Tilki — karda fare avı ---------- */
function sfSnow(k) {
  const o = [], t = k.t;
  for (let i = 0; i < 46; i++) {
    const sp = 38 + hash1(i + 5) * 40, y0 = -420 + hash1(i + 1) * 640, y = ((y0 + t * sp + 420) % 640) - 420, x = -420 + hash1(i + 9) * 840 + Math.sin(t * (0.6 + hash1(i) * 0.8) + i) * 18;
    const r = 2.6 + hash1(i + 3) * 3.6; o.push(sfEllipse(x, y, r, r, 0, 7));
  }
  return o;
}
function SF_FOX_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t;
  B.body.sy = 1 + Math.sin(t * 2.6) * 0.012 * (t < 2 ? 1 : 0);
  // dinle: baş eğer, kulaklar döner
  B.head.r = kf(t, [[0.4, 0], [0.7, 0.16, 'out'], [1.1, 0.16], [1.3, -0.06, 'out'], [1.6, 0.1], [2.0, 0.05]]);
  B.earF.r = ring(t, 0.5, -0.25, 3, 5) + ring(t, 1.25, 0.2, 3, 5); B.earB.r = ring(t, 0.9, -0.22, 3, 5);
  B.tail.r = Math.sin(t * 1.4) * 0.06 + kf(t, [[1.6, 0], [2.1, -0.35, 'out'], [2.3, -0.2]]);
  // çömel
  const cr = kf(t, [[1.6, 0], [2.15, 1, 'out'], [2.3, 1], [2.38, 0]]);
  B.fox.y = cr * 12; for (const l of ['lnf', 'lff']) B[l].sy = 1 - cr * 0.12; for (const l of ['lnh', 'lfh']) { B[l].r = cr * 0.25; B['k' + l.slice(1)].r = -cr * 0.35; }
  // sıçrayış: yay çizip burun üstü kara dalar
  const j0 = 2.3, j1 = 3.25;
  if (t > j0) {
    const u = clamp01((t - j0) / (j1 - j0)), e = u;
    B.fox.x = e * 40; B.fox.y = lerp(12, -52, u) - Math.sin(u * PI) * 290;
    B.fox.r = lerp(-0.6, 1.25, Ease.inOutSine(u));
    const st = smoothstep(0, 0.3, u); B.lnf.r = -0.9 * st; B.lff.r = -0.75 * st; B.knf.r = -0.3 * st; B.kff.r = -0.2 * st; B.lnh.r = 0.9 * st; B.lfh.r = 0.75 * st;
    B.tail.r = lerp(-0.3, 0.5, u);
  }
  // karda: arka bacaklar ve kuyruk dışarıda çırpınır
  if (t > j1) {
    const u = t - j1, out = kf(t, [[4.4, 0], [4.85, 1, 'io']]);
    B.fox.x = 40 - out * 10; B.fox.y = lerp(-52, 0, out) + Math.max(0, 1 - u * 5) * 8; B.fox.r = lerp(1.25, 0, out);
    const wig = (1 - out) * Math.min(1, u * 3);
    B.lnh.r = 0.6 * (1 - out) + Math.sin(u * 22) * 0.35 * wig; B.lfh.r = 0.5 * (1 - out) + Math.sin(u * 22 + 2) * 0.35 * wig;
    B.lnf.r = 1.25 * (1 - out); B.lff.r = 1.15 * (1 - out); B.knf.r = B.kff.r = 0.3 * (1 - out);
    B.tail.r = 0.5 * (1 - out) + Math.sin(u * 14) * 0.5 * wig;
    S.hide.mouse = t > 4.6 ? 0 : 1;
  }
  k.sp = t - j1;
  // ağzında fareyle tırıs
  if (t > 5.4) {
    const u = t - 5.4, e = smoothstep(0, 0.5, u);
    B.fox.x = 30 + u * 150 * e; sfGait(B, [['lnf', 'knf', 0, 0], ['lfh', 'kfh', 0, 1], ['lff', 'kff', 0.5, 0], ['lnh', 'knh', 0.5, 1]], u * 2.6, e, { swing: 0.42, knee: 0.7 });
    B.fox.y += -Math.abs(Math.sin(u * 2.6 * TAU)) * 6 * e; B.tail.r = Math.sin(u * 5) * 0.1 - 0.1; B.head.r = -0.05;
  }
}
const SF_FOX = (() => {
  const snow = 'M -320 176 C -300 152 -280 128 -240 122 C -170 112 -110 118 -60 120 C -20 122 20 114 60 116 C 110 118 150 124 210 122 C 270 120 320 134 350 176 Z';
  return {
    key: 'tilki', name: 'Tilki', line: 'Karın altındaki tıkırtıyı duydu, havalanıp burnunu kara gömdü — ve avıyla çıktı.', dur: 8.4, fitW: 4.6, fitH: 3.0,
    bones: {
      fox: [null, 0, 110, 60, 110], body: ['fox', -60, -10, 60, -20], head: ['body', 92, -30, 162, 14], earF: ['head', 120, -44, 128, -72], earB: ['head', 100, -44, 98, -70],
      tail: ['body', -106, -30, -248, 44],
      lnf: ['body', 70, 16, 72, 70], knf: ['lnf', 72, 70, 76, 116], lff: ['body', 48, 16, 50, 70], kff: ['lff', 50, 70, 54, 116],
      lnh: ['body', -96, 8, -106, 80], knh: ['lnh', -106, 80, -94, 116], lfh: ['body', -76, 8, -86, 80], kfh: ['lfh', -86, 80, -76, 116],
      mouse: ['head', 150, 22, 170, 30], world: [null, 0, 160, 10, 160],
    },
    k0: { t: 0, sp: 0 },
    layers: [
      { id: 'lff', bind: ['lff', 'kff'], soft: 10, pts: sfLeg([48, 12, 50, 70, 54, 113], [20, 11, 9], sfEllipse(60, 116, 10, 5)) },
      { id: 'lfh', bind: ['lfh', 'kfh'], soft: 10, pts: sfLeg([-76, 2, -86, 80, -76, 113], [32, 12, 9], sfEllipse(-68, 116, 10, 5)) },
      { id: 'tail', bind: ['tail'], pts: [sfFur(sfBrush(sfCurve(-106, -36, -150, -28, -200, 0, -252, 40, 26), 30, 70, 10), 3.2, 11, 0, 1, 7)] },
      { id: 'body', bind: ['body', 'head', 'earF', 'earB'], soft: 13, holeSub: [1],
        d: 'M 166 8 C 158 0 146 -10 136 -20 C 130 -26 128 -34 128 -40 L 136 -82 C 128 -72 120 -61 114 -52 L 104 -88 C 101 -74 97 -60 92 -48 C 76 -54 58 -62 38 -64 C 10 -62 -20 -56 -46 -60 C -70 -63 -96 -54 -110 -40 C -122 -26 -120 -4 -108 14 C -100 24 -86 26 -72 20 C -56 12 -40 8 -24 10 C 4 14 32 26 50 34 L 56 40 L 62 33 L 69 42 L 75 34 L 82 40 L 86 31 C 96 20 106 12 114 10 C 124 12 134 16 146 16 C 156 16 162 14 166 8 Z M 124 -30 C 128 -34 134 -34 138 -30 C 134 -26 128 -26 124 -30 Z' },
      { id: 'lnf', bind: ['lnf', 'knf'], soft: 10, pts: sfLeg([70, 10, 72, 70, 76, 113], [22, 11, 9], sfEllipse(83, 116, 11, 5)) },
      { id: 'lnh', bind: ['lnh', 'knh'], soft: 10, pts: sfLeg([-96, 0, -106, 80, -94, 113], [36, 13, 9], sfEllipse(-86, 116, 11, 5)) },
      { id: 'snow', bind: ['world'], d: snow },
      { id: 'mouse', prop: 1, bone: 'mouse', gen: () => [sfEllipse(160, 30, 13, 8, 0.4), sfStroke(sfCurve(150, 26, 140, 34, 134, 46, 128, 50, 6), 3, 1.5, 0, 1)] },
      { id: 'flakes', prop: 1, show: 1, gen: (k) => sfSnow(k) },
      { id: 'splash', prop: 1, show: 1, gen: (k) => sfSplash(k.sp, 36, 300, 205, 116, { up: 520, sp: 200, r: 6, cone: 2.2, life: 1.4 }) },
    ],
    perform: SF_FOX_PERFORM,
    events: [[0.5, 'listen'], [2.3, 'pounce'], [3.25, 'snowHit'], [4.5, 'pop'], [5.4, 'trot']],
  };
})();

SF_DEFS.push(SF_FOX);

/* ---------- VIII. Geyik — boynuz silkeleyen erkek geyik ---------- */
function sfAntler(dx, dy, sc) {
  const T = (x, y) => [dx + x * sc, dy + y * sc], C = (a, b, c, d, n = 14) => sfCurve(...T(...a), ...T(...b), ...T(...c), ...T(...d), n);
  return [
    sfStroke(C([98, -136], [62, -182], [60, -244], [96, -284], 24), 15 * sc, 6 * sc, 1, 1),
    sfStroke(C([92, -150], [110, -148], [124, -156], [136, -170], 10), 9 * sc, 3 * sc, 1, 1),
    sfStroke(C([84, -168], [102, -172], [116, -178], [128, -192], 10), 8 * sc, 3 * sc, 1, 1),
    sfStroke(C([70, -204], [88, -212], [102, -222], [112, -238], 10), 8 * sc, 3 * sc, 1, 1),
    sfStroke(C([84, -268], [78, -280], [72, -290], [64, -302], 8), 7 * sc, 2.5 * sc, 1, 1),
    sfStroke(C([94, -280], [102, -290], [108, -298], [114, -312], 8), 7 * sc, 2.5 * sc, 1, 1),
    sfStroke(C([90, -276], [94, -290], [96, -300], [96, -316], 8), 6 * sc, 2.5 * sc, 1, 1),
  ];
}
function SF_DEER_PERFORM(t, S) {
  const B = S.b;
  B.body.sy = 1 + Math.sin(t * 2.2) * 0.01;
  B.ear.r = ring(t, 0.5, -0.4, 4, 6) + ring(t, 2.4, -0.35, 4, 6) + kf(t, [[3.1, 0], [3.25, 0.3], [4.0, 0.3], [4.3, 0]]);
  B.tail.r = ring(t, 2.2, 0.5, 4, 5) + ring(t, 3.15, 0.7, 5, 4);
  // otla → irkil → silkele → böğür
  const graze = kf(t, [[0.9, 0], [1.6, 1, 'io'], [3.0, 1], [3.18, 0, 'snap']]);
  B.neck.r = graze * 1.15 + kf(t, [[4.5, 0], [4.9, -0.32, 'out'], [5.5, -0.3], [5.75, 0]]);
  B.head.r = graze * (0.35 + Math.sin(t * 9) * 0.04 * (t > 1.6 && t < 3 ? 1 : 0)) + kf(t, [[4.5, 0], [4.9, -0.45, 'out'], [5.5, -0.42], [5.75, 0]]);
  const sh = t > 3.85 && t < 4.5 ? Math.sin((t - 3.85) * 34) * (1 - (t - 3.85) / 0.65) : 0;
  B.head.r += sh * 0.16; B.neck.r += sh * 0.05;
  B.body.r = kf(t, [[3.0, 0], [3.2, -0.03], [3.8, -0.03], [4.0, 0]]);
  // sekerek kaçış
  if (t > 5.8) {
    const u = t - 5.8, hd = 0.62, n = Math.floor(u / hd), p = (u % hd) / hd, air = Math.sin(p * PI), e = smoothstep(0, 0.3, u);
    B.deer.x = (n + Ease.inOutSine(p)) * 210 * e; B.deer.y = -air * 95 * e;
    B.deer.r = lerp(-0.22, 0.16, p) * air * e;
    B.lnf.r = -0.7 * air * e; B.lff.r = -0.6 * air * e; B.knf.r = 1.4 * air * e; B.kff.r = 1.3 * air * e;
    B.lnh.r = 0.55 * air * e; B.lfh.r = 0.5 * air * e; B.knh.r = -0.3 * air * e; B.kfh.r = -0.3 * air * e;
    B.neck.r += -0.15 * air; B.tail.r += -0.6 * e;
  }
}
const SF_DEER = {
  key: 'geyik', name: 'Geyik', line: 'Otlarken bir çıtırtı duydu; boynuzlarını silkeleyip böğürdü — ve ormana sekti.', dur: 8.3, fitW: 3.6, fitH: 3.7,
  bones: {
    deer: [null, 0, 150, 60, 150], body: ['deer', -40, 0, 50, -20], neck: ['body', 50, -30, 90, -130], head: ['neck', 92, -128, 158, -100], ear: ['head', 88, -136, 62, -160],
    tail: ['body', -128, -24, -132, -6],
    lnf: ['body', 56, 20, 60, 92], knf: ['lnf', 60, 92, 64, 148], lff: ['body', 36, 20, 38, 92], kff: ['lff', 38, 92, 42, 148],
    lnh: ['body', -100, 8, -118, 100], knh: ['lnh', -118, 100, -108, 148], lfh: ['body', -80, 8, -100, 100], kfh: ['lfh', -100, 100, -90, 148],
  },
  layers: [
    { id: 'antF', bind: ['head'], pts: sfAntler(-20, 4, 0.92) },
    { id: 'lff', bind: ['lff', 'kff'], soft: 12, pts: sfLeg([36, 14, 38, 92, 42, 140], [22, 11, 8], sfEllipse(45, 146, 8, 5)) },
    { id: 'lfh', bind: ['lfh', 'kfh'], soft: 12, pts: sfLeg([-82, 0, -78, 50, -100, 100, -90, 140], [38, 20, 10, 8], sfEllipse(-87, 146, 8, 5)) },
    { id: 'tail', bind: ['tail'], pts: [sfLeaf(-124, -32, -138, -6, 13)] },
    { id: 'ear', bind: ['ear'], pts: [sfLeaf(90, -134, 58, -162, 24)] },
    { id: 'body', bind: ['body', 'neck', 'head'], soft: 20, holeSub: [1],
      d: 'M 158 -100 C 156 -106 150 -112 142 -116 C 126 -124 112 -132 102 -138 C 96 -140 88 -138 84 -132 C 76 -112 64 -82 48 -60 C 38 -48 24 -48 6 -46 C -30 -42 -60 -44 -96 -40 C -118 -38 -132 -22 -130 0 C -128 18 -118 30 -104 36 C -84 38 -60 30 -40 30 C -10 32 30 40 60 44 C 72 44 78 38 80 30 Q 88 24 84 14 Q 94 8 90 -4 Q 100 -12 96 -24 Q 106 -32 102 -44 C 106 -62 112 -80 118 -90 C 126 -94 138 -94 148 -94 C 152 -95 156 -97 158 -100 Z M 108 -122 C 112 -125 118 -125 121 -121 C 118 -118 112 -118 108 -122 Z' },
    { id: 'antN', bind: ['head'], pts: sfAntler(0, 0, 1) },
    { id: 'lnf', bind: ['lnf', 'knf'], soft: 12, pts: sfLeg([56, 14, 60, 92, 64, 140], [24, 12, 8], sfEllipse(67, 146, 9, 5)) },
    { id: 'lnh', bind: ['lnh', 'knh'], soft: 12, pts: sfLeg([-102, 0, -96, 50, -118, 100, -108, 140], [42, 22, 11, 8], sfEllipse(-105, 146, 9, 5)) },
  ],
  perform: SF_DEER_PERFORM,
  events: [[1.0, 'graze'], [3.15, 'alert'], [3.85, 'shake'], [4.6, 'bellow'], [5.8, 'bound']],
};
SF_DEFS.push(SF_DEER);

/* ---------- IX. Baykuş — gözleri parlayan puhu ---------- */
// önden kanat: omuzdan dışa, uçta ayrık birincil tüyler; side ±1
function sfOwlWing(side, k) {
  const open = clamp01(k.wo), a = k.wf, ca = Math.cos(a), sa = Math.sin(a), sx = side * 90, sy = -40;
  const P = (x, y) => [sx + (x * ca + y * sa) * side, sy + (-x * sa + y * ca)], span = lerp(30, 290, open), top = [], bot = [], n = 30;
  for (let i = 0; i <= n; i++) {
    const v = i / n, x = span * v, tp = -12 - 34 * Math.sin(v * PI * 0.85) * open;
    let ch = (120 * Math.pow(1 - v, 0.6) + 22) * lerp(0.5, 1, open);
    if (v < 0.66) ch += 9 * Math.abs(Math.sin(v * PI * 8)) * open;
    else ch *= 0.5 + 0.5 * Math.abs(Math.sin(((v - 0.66) / 0.34) * PI * 2.5));
    if (v > 0.95) ch *= (1 - v) / 0.05;
    top.push(P(x, tp)); bot.push(P(x, tp + Math.max(4, ch)));
  }
  const o = []; for (const q of top.concat(bot.reverse())) o.push(q[0], q[1]);
  return [o];
}
function SF_OWL_PERFORM(t, S) {
  const B = S.b, k = S.k;
  B.body.sy = 1 + Math.sin(t * 2.0) * 0.012;
  // gözler: parlar, kırpar
  k.gI = kf(t, [[0, 0.35], [0.6, 0.35], [1.1, 1.0], [5.6, 1.0], [6.2, 0.6]]) * (0.92 + Math.sin(t * 7) * 0.04);
  const bl = (c, w = 0.18) => (t > c && t < c + w ? Math.sin(((t - c) / w) * PI) : 0), lid = Math.max(bl(0.5), bl(3.0), bl(4.25));
  S.hide.lids = lid > 0.01 ? 0 : 1; B.lids.sy = Math.max(0.02, lid); k.gI *= 1 - lid * 0.9;
  // baş 180° döner ve geri gelir: gözler yana kayıp kaybolur
  const turn = kf(t, [[1.4, 0], [1.9, 1, 'io'], [2.5, 1], [2.95, 0, 'io']]);
  B.eyes.x = Math.sin(turn * PI * 0.5) * 70; B.eyes.sx = Math.max(0.02, Math.cos(turn * PI * 0.5));
  B.head.r = kf(t, [[3.3, 0], [3.5, 0.22, 'out'], [3.9, 0.22], [4.05, -0.18, 'snap'], [4.4, -0.18], [4.6, 0]]);
  // tüylerini kabartır, kanat açar, kalkar
  const puff = kf(t, [[4.7, 0], [4.95, 1, 'out'], [5.15, 0]]); B.body.sx = 1 + puff * 0.08; B.body.sy += puff * 0.05;
  k.wo = kf(t, [[5.1, 0], [5.45, 1, 'out']]); k.wf = 0;
  if (t > 5.45) {
    const u = t - 5.45, f = Math.sin(u * 4.2 * TAU); k.wf = f * 0.55 - 0.1;
    B.owl.y = -u * u * 110 - u * 60; B.owl.x = u * 30; B.owl.sx = B.owl.sy = 1 + u * 0.28; B.feet.y = -Math.min(1, u * 3) * 14;
  }
  B.branch.r = ring(t, 5.5, 0.03, 2.4, 2.2);
}
const SF_OWL = {
  key: 'baykus', name: 'Baykuş', line: 'Başını ardına çevirdi, gözleri karanlıkta iki kandil gibi yandı — sessizce süzüldü.', dur: 8.2, fitW: 3.4, fitH: 3.6, glowCol: [1.0, 0.78, 0.32],
  bones: { owl: [null, 0, 150, 0, 0], body: ['owl', 0, 120, 0, -40], head: ['body', 0, -30, 0, -150], eyes: ['head', 0, -92, 30, -92], lids: ['eyes', 0, -116, 0, -70], feet: ['owl', 0, 150, 0, 160], branch: [null, -230, 168, 240, 156] },
  k0: { gI: 0.35, wo: 0, wf: 0 },
  layers: [
    { id: 'wingL', bone: 'body', gen: (k) => (k.wo > 0.01 ? sfOwlWing(-1, k) : []) },
    { id: 'wingR', bone: 'body', gen: (k) => (k.wo > 0.01 ? sfOwlWing(1, k) : []) },
    { id: 'body', bind: ['body', 'head'], soft: 26, holeSub: [1, 2, 3, 4],
      d: 'M 0 -150 C 20 -150 44 -152 62 -160 L 86 -198 C 87 -172 89 -152 92 -130 C 102 -100 106 -60 104 -20 C 110 20 104 70 86 110 C 72 136 48 150 22 152 L 14 162 L 6 152 L -2 162 L -10 152 L -18 162 L -24 152 C -50 150 -72 136 -86 110 C -104 70 -110 20 -104 -20 C -106 -60 -102 -100 -92 -130 C -89 -152 -87 -172 -86 -198 L -62 -160 C -44 -152 -20 -150 0 -150 Z' +
        ' M -92 30 Q -80 70 -60 96 Q -82 72 -86 30 Z M -74 40 Q -64 80 -46 104 Q -66 80 -68 40 Z M 92 30 Q 80 70 60 96 Q 82 72 86 30 Z M 74 40 Q 64 80 46 104 Q 66 80 68 40 Z' },
    { id: 'face', hole: 1, bind: ['eyes'],
      d: 'M -38 -118 C -24 -118 -14 -106 -14 -92 C -14 -78 -24 -66 -38 -66 C -52 -66 -62 -78 -62 -92 C -62 -106 -52 -118 -38 -118 Z M 38 -118 C 52 -118 62 -106 62 -92 C 62 -78 52 -66 38 -66 C 24 -66 14 -78 14 -92 C 14 -106 24 -118 38 -118 Z' +
        ' M -80 -126 Q -86 -62 -12 -50 Q -78 -56 -74 -126 Z M 80 -126 Q 86 -62 12 -50 Q 78 -56 74 -126 Z M -6 -70 L 6 -70 L 0 -46 Z' },
    { id: 'pupils', bind: ['eyes'], pts: [sfEllipse(-34, -90, 11, 12), sfEllipse(34, -90, 11, 12)] },
    { id: 'lids', prop: 1, bind: ['lids'], pts: [sfEllipse(-38, -92, 28, 30), sfEllipse(38, -92, 28, 30)] },
    { id: 'feet', bind: ['feet'], pts: [sfStroke([-30, 146, -36, 158, -44, 164], 9, 5, 1, 1), sfStroke([-26, 148, -26, 162, -24, 168], 9, 5, 1, 1), sfStroke([-22, 146, -14, 158, -6, 164], 9, 5, 1, 1), sfStroke([22, 146, 14, 158, 6, 164], 9, 5, 1, 1), sfStroke([26, 148, 26, 162, 24, 168], 9, 5, 1, 1), sfStroke([30, 146, 36, 158, 44, 164], 9, 5, 1, 1)] },
    { id: 'branch', bind: ['branch'], pts: [sfStroke(sfCurve(-240, 172, -120, 160, 80, 170, 250, 152, 24), 22, 12, 1, 1), sfStroke(sfCurve(140, 162, 170, 140, 190, 128, 216, 118, 10), 9, 4, 0, 1), sfLeaf(216, 118, 262, 96, 30, 0), sfLeaf(196, 130, 222, 150, 24, 0), sfLeaf(-170, 166, -214, 196, 28, 0)] },
    { id: 'eyeGlow', glow: 1, show: 1, bind: ['eyes'], pts: [sfEllipse(-38, -92, 22, 24), sfEllipse(38, -92, 22, 24)] },
  ],
  perform: SF_OWL_PERFORM,
  events: [[0.5, 'blink'], [1.1, 'hoot'], [1.5, 'turn'], [3.4, 'tilt'], [4.7, 'puff'], [5.45, 'owlFly']],
};
SF_DEFS.push(SF_OWL);

/* ---------- X. Kartal ve Balık — iki heykel ---------- */
// alttan görünen kartal kanadı: kol + ayrık birincil "parmaklar"; spread 1 süzülüş, 0 katlı dalış
function sfEagleWing(side, k) {
  const sp = clamp01(k.spread), fl = k.flap || 0, sx = Math.cos(fl) * lerp(0.35, 1, sp), back = (1 - sp) * 1.15, c = Math.cos(back), s = Math.sin(back);
  const R = (x, y) => { const X = x * sx; return [side * (X * c + y * s), -X * s + y * c]; };
  const o = [], inner = [], n = 16;
  // ön kenar: omuzdan bileğe hafif ileri kavis; arka kenar: ikincil tüy dişleri
  for (let i = 0; i <= n; i++) { const v = i / n; inner.push(R(14 + 168 * v, -24 - 22 * Math.sin(v * PI * 0.8) - 6 * v)); }
  for (let i = n; i >= 0; i--) { const v = i / n; inner.push(R(14 + 160 * v, 58 - 30 * Math.pow(v, 1.6) + 8 * Math.abs(Math.sin(v * PI * 6.5)) * (1 - v * 0.6))); }
  const pi = []; for (const q of inner) pi.push(q[0], q[1]); o.push(pi);
  for (let f = 0; f < 7; f++) {
    const u = f / 6, bx = 170 + Math.sin(u * PI) * 8, by = -40 + u * 66, ang = lerp(-0.42, 0.5, u) * lerp(0.5, 1, sp), L = (96 - Math.pow(Math.abs(u - 0.3) * 2, 2) * 26) * lerp(0.55, 1, sp);
    const a = R(bx - 16, by), b = R(bx + Math.cos(ang) * L, by + Math.sin(ang) * L);
    o.push(sfLeaf(a[0], a[1], b[0], b[1], 18 - Math.abs(u - 0.4) * 6, 0, 12));
  }
  return o;
}
function sfFishD() { return 'M 70 0 C 60 -14 40 -22 14 -22 C -10 -22 -32 -14 -50 -4 L -72 -22 L -66 0 L -72 22 L -50 4 C -32 14 -10 22 14 22 C 40 22 60 14 70 0 Z M 10 -20 L 26 -36 L 34 -20 Z M 46 -4 C 48 -6 51 -6 52 -4 C 51 -2 48 -2 46 -4 Z'; }
function SF_EAGLE_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t;
  // kartal: dairesel süzülüş (yön = hareket teğeti)
  const E0 = [-30, -170];
  let ex = 0, ey = 0, er = 0; k.spread = 1; k.flap = 0;
  if (t < 2.7) {
    const a = smoothstep(0.3, 2.7, t) * TAU * 0.85, R = 80; ex = Math.sin(a) * R * 1.3; ey = (1 - Math.cos(a)) * R * 0.55; er = smoothstep(0.3, 0.8, t) * Math.atan2(Math.cos(a) * 1.3, Math.sin(a) * 0.55) * 0 + Math.sin(a) * 0.5;
    k.flap = Math.sin(t * 2.2) * 0.12;
  }
  // pike: kanatlar katlanır, baş aşağı dalar
  const dv = clamp01((t - 2.7) / 0.62), catchT = 3.32;
  if (t >= 2.7 && t < catchT) {
    const u = Ease.inCubic(dv); const sx0 = Math.sin(TAU * 0.85) * 80 * 1.3, sy0 = (1 - Math.cos(TAU * 0.85)) * 80 * 0.55;
    ex = lerp(sx0, 95, u); ey = lerp(sy0, 175, u); er = lerp(Math.sin(TAU * 0.85) * 0.5, PI * 0.92, Ease.outCubic(dv)); k.spread = lerp(1, 0.08, smoothstep(0, 0.35, dv));
  }
  // yakala ve kanat çırparak yüksel
  if (t >= catchT) {
    const u = t - catchT, flare = smoothstep(0, 0.25, u);
    k.spread = lerp(0.3, 1, flare); er = lerp(PI * 0.92, 0, smoothstep(0.1, 0.9, u)) + Math.sin(u * 3) * 0.05;
    k.flap = Math.sin(u * 3.4 * TAU) * 0.9 * smoothstep(0.15, 0.4, u);
    ex = 95 + u * 30 + Math.sin(u * 2) * 20; ey = 175 - u * u * 70 - u * 60 + Math.sin(u * 3.4 * TAU) * 6;
  }
  B.eagle.x = ex; B.eagle.y = ey; B.eagle.r = er;
  // balık: kavisle suya düşer, sonra yeniden sıçrar
  const F0 = [40, 40];
  if (t < 1.0) { const u = clamp01(t / 1.0); B.fish.x = u * 70; B.fish.y = u * u * 150; B.fish.r = u * 1.1; }
  else if (t < 2.55) { B.fish.y = 400; S.hide.fish = 1; }
  else if (t < catchT) { const u = (t - 2.55) / (catchT - 2.55); B.fish.x = lerp(20, 50, u); B.fish.y = lerp(150, 4, Ease.outCubic(u)); B.fish.r = lerp(-1.2, -0.3, u); }
  else {
    // pençelerde: kartalın kuyruk ucuna bağlı
    const ox = 0, oy = 70, c = Math.cos(er), s = Math.sin(er), tx = E0[0] + ex + ox * c - oy * s, ty = E0[1] + ey + ox * s + oy * c;
    B.fish.x = tx - F0[0]; B.fish.y = ty - F0[1]; B.fish.r = er + PI / 2 + Math.sin(t * 14) * 0.25;
  }
  k.sp1 = t - 0.95; k.sp2 = t - 2.55; k.sp3 = t - catchT;
}
const SF_EAGLE = {
  key: 'kartal', name: 'Kartal', line: 'Gökte daire çizdi, kanatlarını katlayıp ok gibi daldı — balığı havada kaptı.', dur: 7.0, fitW: 4.0, fitH: 3.6,
  groups: [['eagleBody', 'wingL', 'wingR'], ['fish', 'water']],
  bones: { eagle: [null, -30, -170, -30, -240], fish: [null, 40, 40, 110, 40], water: [null, 0, 180, 100, 180] },
  k0: { t: 0, spread: 1, flap: 0, sp1: -1, sp2: -1, sp3: -1 },
  layers: [
    { id: 'wingL', bone: 'eagle', gen: (k) => sfEagleWing(-1, k).map((p) => sfXf(p, -30, -170)) },
    { id: 'wingR', bone: 'eagle', gen: (k) => sfEagleWing(1, k).map((p) => sfXf(p, -30, -170)) },
    { id: 'eagleBody', bind: ['eagle'], xf: [-30, -170], d: 'M 0 -96 C 6 -96 10 -90 10 -84 C 12 -78 16 -72 18 -64 C 24 -50 26 -20 22 10 C 20 30 18 44 16 56 L 30 112 C 20 118 10 120 0 120 C -10 120 -20 118 -30 112 L -16 56 C -18 44 -20 30 -22 10 C -26 -20 -24 -50 -18 -64 C -16 -72 -12 -78 -10 -84 C -10 -90 -6 -96 0 -96 Z M 0 -96 L -4 -106 L 0 -112 L 4 -106 Z' },
    { id: 'fish', bind: ['fish'], xf: [40, 40], d: sfFishD(), holeSub: [2] },
    { id: 'water', bind: ['water'], d: 'M -260 150 C -230 140 -200 140 -170 150 C -140 160 -110 160 -80 150 C -50 140 -20 140 10 150 C 40 160 70 160 100 150 C 130 140 160 140 190 150 C 220 160 250 158 270 150 L 270 196 L -260 196 Z' },
    { id: 'spl', prop: 1, show: 1, gen: (k) => sfSplash(k.sp1, 18, 400, 110, 150, { up: 360, r: 5, life: 1.1 }).concat(sfSplash(k.sp2, 20, 500, 60, 150, { up: 420, r: 5, life: 1.1 })) },
  ],
  perform: SF_EAGLE_PERFORM,
  events: [[0.3, 'soar'], [0.95, 'splash'], [2.55, 'fishJump'], [2.7, 'stoop'], [3.32, 'catch']],
};
SF_DEFS.push(SF_EAGLE);

/* ---------- XI. At — şaha kalkan Arap atı ---------- */
// toynak: taç kenarı dar, ön duvar eğik, taban düz
const sfHoof = (x, y, w = 10) => [x - w * 0.55, y - 12, x + w * 0.35, y - 12, x + w * 1.05, y + 1, x + w * 0.95, y + 3, x - w * 0.85, y + 3, x - w * 0.8, y - 5];
// boyun tepesi (ense → yağrın) iki kübik; yele dipleri buradan örneklenir
const SF_CREST = [[110, -154, 92, -151, 70, -137, 54, -117], [54, -117, 42, -101, 30, -89, 12, -82]];
function sfCrestAt(u) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = SF_CREST[u < 0.5 ? 0 : 1], t = u < 0.5 ? u * 2 : u * 2 - 1, v = 1 - t;
  const x = v * v * v * x0 + 3 * v * v * t * x1 + 3 * v * t * t * x2 + t * t * t * x3, y = v * v * v * y0 + 3 * v * v * t * y1 + 3 * v * t * t * y2 + t * t * t * y3;
  const dx = 3 * v * v * (x1 - x0) + 6 * v * t * (x2 - x1) + 3 * t * t * (x3 - x2), dy = 3 * v * v * (y1 - y0) + 6 * v * t * (y2 - y1) + 3 * t * t * (y3 - y2), l = Math.hypot(dx, dy) || 1;
  return [x, y, dx / l, dy / l];
}
function sfMane(k) {
  // yele: tepe boyunca tırtıklı dolgun şerit + düzensiz tutamlar; hızda tutamlar uzayıp geriye akar
  const o = [], fl = k.flow || 0, t = k.t || 0, inn = [], out = [], m = 30;
  for (let j = 0; j <= m; j++) {
    const u = j / m, [cx, cy, tx, ty] = sfCrestAt(u), nx = -ty, ny = tx, h = (5 + Math.sin(u * PI) * 7) * (1 - u * 0.4) + Math.abs(Math.sin(u * PI * 11 + 0.6)) * 6 + Math.sin(t * 6 + u * 9) * 1.2, bk = (1 + Math.sin(u * PI * 11 + 0.6)) * 1.2 + fl * 10 * u;
    inn.push(cx - nx * 6, cy - ny * 6); out.push(cx + nx * h + tx * bk, cy + ny * h + ty * bk);
  }
  const band = out.slice(); for (let j = m; j >= 0; j--) band.push(inn[j * 2], inn[j * 2 + 1]); o.push(band);
  const n = 13;
  for (let i = 0; i < n; i++) {
    const u = 0.04 + (i / (n - 1)) * 0.9 + (hash1(i + 21) - 0.5) * 0.04, [cx, cy, tx, ty] = sfCrestAt(u), nx = -ty, ny = tx; // dış normal (yukarı-geri)
    const bx = cx + nx * 2, by = cy + ny * 2, L = (14 + Math.sin(u * PI) * 14 + hash1(i + 3) * 10) * (1 + fl * 1.1);
    const sw = Math.sin(t * 7 + i * 0.9) * (0.05 + fl * 0.16), back = clamp01(lerp(0.74, 0.92, fl) + (hash1(i) - 0.5) * 0.3 + sw);
    const dx = tx * back + nx * (1 - back), dy = ty * back + ny * (1 - back), dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
    const cu = 0.2 + sw + hash1(i + 7) * 0.3; // uca doğru kıvrım
    o.push(sfStroke(sfCurve(bx, by, bx + ux * L * 0.4, by + uy * L * 0.4, bx + (ux + tx * cu) * L * 0.72, by + (uy + ty * cu) * L * 0.72, bx + (ux + tx * cu * 1.4) * L, by + (uy + ty * cu * 1.4) * L + 3, 8), 14, 2.2, 1, 1));
  }
  // perçem: alnın önüne düşen tutam
  for (let i = 0; i < 3; i++) { const fs = Math.sin(t * 6 + i) * 0.1 * (0.3 + fl), L = 20 + i * 5; o.push(sfStroke(sfCurve(112 + i * 2, -152 + i, 118 + i * 3, -158 + i * 2, 124 + i * 4 + fs * 20, -152 + i * 3, 126 + i * 5 + fs * L, -140 + i * 4, 6), 8, 1.6, 1, 1)); }
  return o;
}
function sfHorseTail(k) {
  // kuyruk: sokum kavisle geriye kalkar; dolgun gövde, uçta dalgalı kıl saçağı
  const o = [], fl = k.flow || 0, t = k.t || 0, X = -136, Y = -62, sx = X - 26, sy = Y + 2 - fl * 4;
  o.push(sfStroke(sfCurve(X + 4, Y - 2, X - 10, Y - 10, X - 22, Y - 6 + fl * 4, X - 30, Y + 4 - fl * 4, 8), 20, 16, 1, 1));
  const cv = (sp, i) => {
    const w1 = Math.sin(t * 4.5 + i * 0.7) * (0.04 + fl * 0.12), w2 = Math.sin(t * 4.5 + i * 0.7 - 1.2) * (0.06 + fl * 0.18), L = 132 - Math.abs(sp) * 22 + hash1(i + 11) * 10;
    const a0 = lerp(2.75, 3.05, fl) + w1, a1 = lerp(1.8, 2.95, fl) + sp * lerp(0.2, 0.1, fl) + w2;
    return sfCurve(sx, sy, sx + Math.cos(a0) * L * 0.32, sy + Math.sin(a0) * L * 0.32, sx + Math.cos(a1) * L * 0.62 + Math.cos(a0) * 10, sy + Math.sin(a1) * L * 0.62, sx + Math.cos(a1) * L, sy + Math.sin(a1) * L, 16);
  };
  o.push(sfStroke(cv(0, 4).slice(0, 28), 1, 1, 1, 1, (s) => 16 + 18 * Math.sin(Math.min(1, s * 1.05) * PI * 0.72)));
  for (let i = 0; i < 13; i++) {
    const sp = (i - 6) / 6, c = cv(sp * 0.8, i), ph = hash1(i + 40) * TAU, wa = 2.5 + hash1(i + 50) * 2.5;
    for (let j = 0; j < c.length / 2; j++) { const s = j / (c.length / 2 - 1); c[j * 2] += Math.sin(s * 9 + ph + t * 5) * wa * s; }
    o.push(sfStroke(c.slice(14), 10 - Math.abs(sp) * 3, 1.6, 1, 1));
  }
  return o;
}
function SF_HORSE_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t; k.flow = 0;
  B.body.sy = 1 + Math.sin(t * 2.4) * 0.01;
  B.ear.r = ring(t, 0.5, -0.4, 4, 6) + kf(t, [[2.5, 0], [2.7, -0.5], [4.2, -0.5], [4.5, 0]]); B.earF.r = B.ear.r * 0.8;
  // baş savurma
  B.neck.r = kf(t, [[0.8, 0], [0.95, -0.25, 'out'], [1.15, 0.12], [1.35, 0]]);
  B.head.r = kf(t, [[0.8, 0], [0.95, 0.15, 'out'], [1.2, -0.08], [1.4, 0]]);
  // eşelenme: ön ayak toprağı kazır
  const paw = (c) => { const u = (t - c) / 0.45; return u > 0 && u < 1 ? Math.sin(u * PI) : 0; }, pw = paw(1.4) + paw(1.95);
  B.lnf.r = -0.75 * pw; B.knf.r = 1.3 * pw; k.d1 = t - 1.78; k.d2 = t - 2.33;
  // şaha kalk
  const rear = kf(t, [[2.6, 0], [3.1, 1, 'out'], [3.9, 1], [4.3, 0, 'in']]);
  B.horse.r = -0.72 * rear + ring(t, 4.3, 0.03, 4, 7);
  B.neck.r += -0.3 * rear; B.head.r += 0.3 * rear;
  const fla = Math.sin(t * 9) * rear; B.lnf.r += (-1.1 + fla * 0.4) * rear; B.knf.r += 1.5 * rear; B.lff.r = (-0.9 - fla * 0.4) * rear; B.kff.r = 1.4 * rear;
  B.lnh.r = 0.12 * rear; B.lfh.r = 0.18 * rear; B.knh.r = -0.1 * rear; B.kfh.r = -0.14 * rear;
  k.flow = rear * 0.5; k.d3 = t - 4.3;
  // dörtnala çıkış
  if (t > 4.7) {
    const u = t - 4.7, e = smoothstep(0, 0.6, u), ph = u * 2.3;
    B.horse.x = (u * 300 + u * u * 40) * e; B.horse.y = -Math.abs(Math.sin(ph * PI)) * 22 * e;
    B.body.r = Math.sin(ph * TAU) * 0.06 * e;
    B.lnh.r = B.lfh.r = B.knh.r = B.kfh.r = 0;
    sfGait(B, [['lnh', 'knh', 0, 1], ['lfh', 'kfh', 0.1, 1], ['lnf', 'knf', 0.55, 0], ['lff', 'kff', 0.65, 0]], ph, e, { swing: 0.62, knee: 1.1, lift: 10 });
    B.neck.r += -0.12 * e + Math.sin(ph * TAU) * 0.08; k.flow = Math.max(k.flow, e);
    k.d4 = u;
  } else k.d4 = -1;
}
const SF_HORSE = {
  key: 'at', name: 'At', line: 'Yelesini savurdu, şaha kalkıp kişnedi — rüzgârla yarışırcasına dörtnala gitti.', dur: 7.6, fitW: 3.9, fitH: 3.5,
  bones: {
    horse: [null, -115, 150, 60, 150], body: ['horse', -40, 0, 60, -20], neck: ['body', 52, -40, 110, -150], head: ['neck', 108, -140, 180, -70], ear: ['head', 112, -148, 108, -184], earF: ['head', 102, -148, 96, -178],
    tail: ['body', -136, -62, -160, 40],
    lnf: ['body', 58, 10, 60, 88], knf: ['lnf', 60, 88, 66, 146], lff: ['body', 36, 10, 38, 88], kff: ['lff', 38, 88, 44, 146],
    lnh: ['body', -100, 0, -124, 92], knh: ['lnh', -124, 92, -116, 146], lfh: ['body', -78, 0, -102, 92], kfh: ['lfh', -102, 92, -94, 146],
  },
  k0: { t: 0, flow: 0, d1: -1, d2: -1, d3: -1, d4: -1 },
  layers: [
    { id: 'earF', bind: ['earF'], pts: [sfLeaf(102, -146, 95, -178, 14)] },
    { id: 'lff', bind: ['lff', 'kff'], soft: 12, pts: sfLeg([36, 4, 36, 40, 38, 86, 38, 100, 39, 124, 44, 136], [32, 22, 16, 11, 11, 14, 10], sfHoof(46, 147)) },
    { id: 'lfh', bind: ['lfh', 'kfh'], soft: 12, pts: sfLeg([-78, -12, -76, 30, -90, 62, -102, 92, -98, 124, -92, 136], [56, 46, 22, 16, 11, 14, 10], sfHoof(-90, 147)) },
    { id: 'tail', bone: 'tail', gen: (k) => sfHorseTail(k) },
    { id: 'body', bind: ['body', 'neck', 'head'], soft: 20, holeSub: [1],
      d: 'M 168 -56 C 176 -54 182 -58 184 -64 C 186 -72 184 -78 180 -82 C 168 -94 154 -116 136 -140 C 128 -148 120 -154 110 -154 C 92 -151 70 -137 54 -117 C 42 -101 30 -89 12 -82 C -4 -76 -22 -72 -44 -72 C -66 -72 -84 -78 -102 -80 C -118 -81 -130 -74 -138 -62 C -146 -48 -146 -26 -140 -8 C -136 6 -128 22 -120 32 C -110 32 -86 26 -70 28 C -40 34 -6 40 24 38 C 40 37 54 34 60 30 C 72 22 80 10 84 -4 C 86 -12 86 -20 85 -26 C 84 -52 88 -86 98 -106 C 96 -96 100 -86 110 -82 C 122 -78 134 -74 144 -70 C 154 -64 162 -58 168 -56 Z' +
        ' M 121 -127 C 124 -131 130 -132 134 -129 C 131 -125 125 -124 121 -127 Z' },
    { id: 'ear', bind: ['ear'], pts: [sfLeaf(113, -146, 108, -184, 16)] },
    { id: 'mane', bone: 'neck', gen: (k) => sfMane(k) },
    { id: 'lnf', bind: ['lnf', 'knf'], soft: 12, pts: sfLeg([58, 4, 58, 40, 60, 86, 60, 100, 61, 124, 66, 136], [34, 24, 17, 12, 12, 15, 11], sfHoof(68, 147, 11)) },
    { id: 'lnh', bind: ['lnh', 'knh'], soft: 12, pts: sfLeg([-100, -12, -98, 30, -112, 62, -124, 92, -120, 124, -114, 136], [60, 52, 24, 18, 12, 15, 11], sfHoof(-112, 147, 11)) },
    { id: 'dust', prop: 1, show: 1, gen: (k) => sfSplash(k.d1, 8, 600, 96, 146, { up: 120, sp: 90, r: 7, g: 200, life: 0.9 }).concat(sfSplash(k.d2, 8, 620, 96, 146, { up: 120, sp: 90, r: 7, g: 200, life: 0.9 }), sfSplash(k.d3, 14, 640, 40, 148, { up: 140, sp: 140, r: 8, g: 220, life: 1.0 }), k.d4 > 0 ? sfSplash(k.d4 % 0.44, 5, 700 + Math.floor(k.d4 / 0.44), -110 + (k.d4 * 300 + k.d4 * k.d4 * 40), 148, { up: 90, sp: 60, r: 7, g: 200, life: 0.6, dir: -1.2, cone: 0.8 }) : []) },
  ],
  perform: SF_HORSE_PERFORM,
  events: [[0.8, 'snort'], [1.4, 'paw'], [1.95, 'paw'], [2.7, 'neigh'], [4.3, 'land'], [4.7, 'gallop']],
};
SF_DEFS.push(SF_HORSE);

/* ---------- XII. Ahtapot — sekiz kol, mürekkep ve jet ---------- */
// kol verisi (sağa bakan yerel çerçevede): [kökX, kökY, açı, boy, kalınlık, bükülme, kıvrım, frekans, faz, yön]
const SF_OCT_ARMS = [
  [26, 90, -0.35, 190, 29, 1.3, 1.2, 0.55, 0.0, 1], [16, 96, 0.7, 200, 32, -0.7, 1.1, 0.47, 1.7, 1], [8, 100, 1.1, 150, 32, -1.2, 0.75, 0.61, 3.1, 1], [2, 102, 1.5, 105, 28, -1.45, 1.4, 0.52, 4.4, 1],
  [24, 90, 0.2, 196, 29, 0.4, 1.4, 0.5, 5.2, -1], [14, 96, 0.8, 186, 32, -0.75, 0.8, 0.58, 0.9, -1], [8, 100, 1.2, 125, 32, -1.15, 1.6, 0.44, 2.4, -1], [2, 102, 1.52, 100, 28, -1.4, 1.0, 0.57, 3.8, -1],
];
const sfBump = (t, c, w) => (t > c && t < c + w ? Math.sin(((t - c) / w) * PI) : 0);
function sfOctArms(k) {
  const o = [], t = k.t, sp = k.spread, jt = k.jet;
  SF_OCT_ARMS.forEach(([rx, ry, a0, L, w0, bend, curl, f, ph, dir], i) => {
    const side = i % 4, lw = k.wv ? sfBump(t, 2.55 + (dir > 0 ? 7 - side : side) * 0.12, 0.6) : 0;
    let a = lerp(a0, -0.55 + side * 0.48, sp) - lw * 1.3, bd = lerp(bend, -0.55, sp) + lw * 0.4, cu = lerp(curl, 1.3, sp) + lw * 0.6;
    a = lerp(a, 1.42 + (side - 1.5) * 0.07, jt); bd = lerp(bd, 0, jt); cu = lerp(cu, 0.12, jt);
    const Ln = L * (1 + jt * 0.12), N = 30, ds = Ln / N, line = [rx * dir, ry], nrm = [];
    let x = rx, y = ry;
    for (let j = 1; j <= N; j++) {
      const s = j / N, cs = smoothstep(0.45, 1, s);
      const ang = a + bd * s - cu * cs * cs * 3.2 + k.amp * s * 0.85 * Math.sin(TAU * f * t - s * 7 + ph) + jt * 0.3 * s * Math.sin(TAU * 2.4 * t - s * 9 + ph);
      x += Math.cos(ang) * ds; y += Math.sin(ang) * ds; line.push(x * dir, y); nrm.push(ang);
    }
    const wf = (s) => lerp(w0, 2.4, Math.pow(s, 0.72)) * (1 - jt * 0.22);
    o.push(sfStroke(line, 1, 1, 0, 1, wf));
    // vantuzlar: kıvrım tarafında (iç kenar) küçük kabarcıklar
    for (let j = 5; j < N - 2; j += 2) {
      const s = j / N, an = nrm[j - 1], w = wf(s), r = Math.max(1.2, w * 0.2), nx = Math.sin(an), ny = -Math.cos(an), px = line[j * 2] + nx * dir * (w / 2 - r * 0.2), py = line[j * 2 + 1] + ny * (w / 2 - r * 0.2);
      o.push(sfEllipse(px, py, r, r, 0, 8));
    }
  });
  return o;
}
function sfKelp(k) {
  const o = [], t = k.t;
  [[-214, 1.0, 0.0], [-180, 0.7, 1.9], [214, 0.9, 3.3]].forEach(([bx, hs, ph]) => {
    const H = 190 * hs, N = 18, line = [bx, 166]; let x = bx, y = 166;
    for (let j = 1; j <= N; j++) {
      const s = j / N, a = -PI / 2 + Math.sin(t * 1.2 + ph) * 0.22 * s + Math.sin(s * 5 + t * 2 + ph) * 0.12 + ring(t, (k.jw || 99) + Math.abs(bx) / 600, 0.45 * s, 0.9, 1.4) * Math.sign(bx);
      x += Math.cos(a) * (H / N); y += Math.sin(a) * (H / N); line.push(x, y);
    }
    o.push(sfStroke(line, 9, 4, 1, 1));
    for (let j = 3; j < N; j += 2) {
      const sd = j % 4 === 1 ? 1 : -1, px = line[j * 2], py = line[j * 2 + 1], qa = -PI / 2 + sd * 0.9 + Math.sin(t * 1.6 + j + ph) * 0.15;
      o.push(sfLeaf(px, py, px + Math.cos(qa) * 34 * (1 - j / N * 0.5), py + Math.sin(qa) * 34 * (1 - j / N * 0.5), 12, 0, 12));
    }
  });
  return o;
}
function sfInk(u, x0, y0) {
  // mürekkep bulutu: hızla kabarır, duman gibi yükselir, sonra parça parça dağılır
  const o = []; if (u <= 0) return o;
  for (let i = 0; i < 28; i++) {
    const core = i < 7, t0 = hash1(i + 90) * (core ? 0.12 : 0.4), dt = u - t0; if (dt < 0) continue;
    const a = PI * 0.5 + (hash1(i + 91) - 0.5) * TAU * 0.95, v = core ? 30 + hash1(i + 92) * 50 : 70 + hash1(i + 92) * 160, d = (v * (1 - Math.exp(-dt * 2.0))) / 2.0;
    const R = (core ? 38 + hash1(i + 93) * 22 : 12 + hash1(i + 93) * 26) * smoothstep(0, 0.45, dt) * (1 + dt * 0.12) * (1 - smoothstep(1.8 + hash1(i + 94) * 1.1, 3.1 + hash1(i + 95) * 0.5, dt));
    if (R < 1.5) continue;
    const cx = x0 + Math.cos(a) * d + Math.sin(dt * 1.3 + i) * 10, cy = y0 + Math.sin(a) * d * 0.85 - dt * 26 - (core ? dt * 10 : 0), p = [];
    for (let q = 0; q < 18; q++) { const th = (q / 18) * TAU, rr = R * (1 + 0.13 * Math.sin(th * 3 + i + dt * 1.5) + 0.07 * Math.sin(th * 5 - i + dt)); p.push(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr * 0.92); }
    o.push(p);
  }
  return o;
}
// kabarcık: halka (dış daire + iç delik)
function sfBubbleRings(k, list, x0, y0) {
  const o = [];
  for (const [c, r, sd] of list) {
    const u = k.t - c; if (u < 0 || u > 2.6) continue;
    const x = x0 + Math.sin(u * 5 + sd) * 7 + u * 10, y = y0 - u * 120 - u * u * 20, rr = r * (1 + u * 0.12);
    const out = sfEllipse(x, y, rr, rr * 0.92, 0, 14), hl = sfEllipse(x - rr * 0.08, y - rr * 0.08, rr * 0.6, rr * 0.55, 0, 12); hl.hole = 1;
    o.push(out, hl);
  }
  return o;
}
function SF_OCT_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t;
  k.amp = smoothstep(0.3, 1.4, t) * (1 - smoothstep(4.4, 4.8, t)) * 0.75;
  k.wv = t > 2.5 && t < 3.6 ? 1 : 0;
  const br = Math.sin(t * 2.6) * smoothstep(0.2, 0.8, t); B.mantle.sx = 1 + br * 0.035; B.mantle.sy = 1 - br * 0.03;
  // yayılıp yükselir (şemsiye gösterisi)
  k.spread = kf(t, [[3.6, 0], [4.25, 1, 'out'], [4.6, 1], [4.85, 0.2, 'out']]);
  B.oct.y = -k.spread * 46; B.oct.r = Math.sin(t * 1.3) * 0.02;
  // mürekkep + jet
  const J = 4.62; k.ink = t - J; k.jw = J + 0.2;
  if (t > J) {
    const u = t - J, e = u * u * 380 + u * 180;
    k.jet = smoothstep(0, 0.28, u);
    B.oct.x = e * 0.45; B.oct.y = -k.spread * 46 - e; B.oct.r = smoothstep(0, 0.5, u) * 0.38;
    const pul = Math.max(0, Math.sin(u * 3.2 * TAU)); B.mantle.sx = 1 - pul * 0.16; B.mantle.sy = 1 + pul * 0.08;
  } else k.jet = 0;
}
const SF_OCTO = {
  key: 'ahtapot', name: 'Ahtapot', line: 'Sekiz kolu sekiz ayrı dalga gibi kıvrıldı; bir mürekkep bulutu bıraktı — ve yok oldu.', dur: 8.4, fitW: 4.6, fitH: 3.4,
  bones: { oct: [null, 0, 94, 0, -40], mantle: ['oct', 0, 20, -30, -120], world: [null, 0, 170, 100, 170] },
  k0: { t: 0, amp: 0, spread: 0, jet: 0, wv: 0, ink: -1, jw: 99 },
  layers: [
    { id: 'kelp', bone: 'world', gen: (k) => sfKelp(k) },
    { id: 'arms', bone: 'oct', gen: (k) => sfOctArms(k) },
    { id: 'body', bind: ['oct', 'mantle'], soft: 40, holeSub: [1],
      d: 'M -44 94 C -54 72 -60 54 -62 38 C -66 22 -78 4 -84 -20 C -96 -58 -80 -104 -38 -116 C 4 -128 44 -106 52 -72 C 58 -46 46 -26 42 -8 C 40 2 46 10 54 18 C 66 32 64 52 52 62 C 46 70 46 82 44 94 C 22 104 -22 104 -44 94 Z M 30 38 C 35 33 43 33 48 38 C 43 42 35 42 30 38 Z' },
    { id: 'siphon', bind: ['mantle'], pts: [sfStroke(sfCurve(-52, 40, -62, 44, -70, 52, -76, 62, 8), 15, 11, 1, 1)] },
    { id: 'floor', bind: ['world'], d: 'M -272 176 C -250 162 -226 154 -204 164 C -186 148 -156 146 -140 162 C -80 170 20 168 104 166 C 132 146 172 144 192 164 C 226 158 256 162 274 176 L 274 206 L -272 206 Z' },
    { id: 'bub', prop: 1, show: 1, gen: (k) => sfBubbleRings(k, [[0.9, 7, 0], [1.25, 5, 2], [1.6, 8, 4], [2.2, 6, 1], [3.1, 5, 3]], -78, 64) },
    { id: 'ink', prop: 1, show: 1, gen: (k) => sfInk(k.ink, -40, 30) },
  ],
  perform: SF_OCT_PERFORM,
  events: [[0.9, 'bubble'], [2.55, 'armWave'], [3.6, 'spread'], [4.62, 'ink'], [4.7, 'jet']],
};
SF_DEFS.push(SF_OCTO);

/* ---------- XIII. Deve Kervanı — iki heykel: binicili öncü deve + yük devesi ---------- */
const SF_CAMEL_D = 'M 214 -72 C 216 -64 214 -58 208 -56 C 204 -52 198 -50 192 -52 C 184 -54 176 -56 168 -54 C 162 -52 158 -48 156 -42 C 150 -24 140 -4 122 10 C 106 20 86 18 72 12 C 66 16 62 18 58 18 C 30 22 -20 22 -56 16 C -74 12 -86 6 -96 -4 C -106 -12 -110 -22 -106 -38 C -104 -46 -100 -54 -92 -60 C -80 -66 -68 -72 -58 -78 C -46 -88 -34 -122 -8 -128 C 14 -132 26 -112 32 -94 C 38 -82 48 -72 60 -66 C 78 -58 94 -44 108 -36 C 120 -32 128 -42 136 -58 C 140 -68 144 -78 150 -86 C 158 -94 172 -94 186 -90 C 198 -86 210 -82 214 -72 Z M 168 -80 C 171 -83 176 -83 178 -80 C 176 -77 171 -77 168 -80 Z';
// deve: kemikler + katmanlar; ox: yatay konum, sc: ölçek (ayaklar y=150'de kalır)
function sfCamel(pf, ox, sc, near) {
  const T = (x, y) => [ox + x * sc, 150 + (y - 150) * sc], X = (p) => sfXf(p, ox, 150 - 150 * sc, 0, sc), XS = (ps) => ps.map(X), n = (s) => pf + s;
  const bn = (par, px, py, tx, ty) => [par ? n(par) : null, ...T(px, py), ...T(tx, ty)];
  const bones = {
    [n('root')]: bn(null, -10, 150, 60, 150), [n('body')]: bn('root', -70, -20, 60, -30), [n('neck')]: bn('body', 60, -40, 150, -80), [n('head')]: bn('neck', 150, -76, 214, -66),
    [n('ear')]: bn('head', 154, -86, 148, -100), [n('tail')]: bn('body', -104, -36, -110, 30), [n('bell')]: bn('neck', 116, 12, 116, 40),
    [n('lnf')]: bn('body', 56, 4, 58, 88), [n('knf')]: bn('lnf', 58, 88, 62, 146), [n('lff')]: bn('body', 34, 4, 36, 88), [n('kff')]: bn('lff', 36, 88, 40, 146),
    [n('lnh')]: bn('body', -76, 0, -88, 92), [n('knh')]: bn('lnh', -88, 92, -80, 146), [n('lfh')]: bn('body', -56, 0, -68, 92), [n('kfh')]: bn('lfh', -68, 92, -60, 146),
  };
  const fl = (x, w) => sfEllipse(x, 147, w, 5);
  const layers = [
    { id: n('lff'), bind: [n('lff'), n('kff')], soft: 12, pts: XS(sfLeg([32, 0, 34, 36, 36, 84, 36, 96, 38, 134, 42, 143], [30, 20, 16, 10, 9, 11]).concat([fl(46, 12)])) },
    { id: n('lfh'), bind: [n('lfh'), n('kfh')], soft: 12, pts: XS(sfLeg([-56, -6, -54, 36, -68, 88, -66, 100, -64, 134, -60, 143], [44, 25, 14, 10, 9, 11]).concat([fl(-56, 12)])) },
    { id: n('tail'), bind: [n('tail')], pts: XS([sfStroke(sfCurve(-104, -36, -112, -20, -112, 0, -110, 22, 10), 7, 4, 1, 1), sfLeaf(-110, 16, -112, 40, 10)]) },
    { id: n('body'), bind: [n('body'), n('neck'), n('head')], soft: 22, holeSub: [1], xf: [ox, 150 - 150 * sc, 0, sc], d: SF_CAMEL_D },
    { id: n('ear'), bind: [n('ear')], pts: XS([sfLeaf(155, -86, 148, -101, 9)]) },
    { id: n('bell'), bind: [n('bell')], pts: XS([sfStroke([116, 10, 116, 30], 2.5, 2.5, 1, 1), [110, 40, 112, 30, 120, 30, 122, 40, 124, 44, 108, 44], sfEllipse(116, 46, 2.5, 2.5, 0, 8)]) },
    { id: n('lnf'), bind: [n('lnf'), n('knf')], soft: 12, pts: XS(sfLeg([54, 0, 56, 36, 58, 84, 58, 96, 60, 134, 64, 143], [32, 22, 17, 11, 10, 12]).concat([fl(68, 13)])) },
    { id: n('lnh'), bind: [n('lnh'), n('knh')], soft: 12, pts: XS(sfLeg([-76, -6, -74, 36, -88, 88, -86, 100, -84, 134, -80, 143], [48, 28, 15, 11, 10, 12]).concat([fl(-76, 13)])) },
  ];
  return { bones, layers, T, X, XS };
}
let SF_CARAVAN_BONES = null;
const SF_CAR_A = sfCamel('a', 150, 1), SF_CAR_B = sfCamel('b', -172, 0.84);
// yolculuk: zemin kayması (hızın integrali), saf zaman fonksiyonu
const sfCarV = (t) => 78 * smoothstep(0.9, 1.9, t) * (1 - smoothstep(4.8, 5.9, t));
function sfCarS(t) { let s = 0; const n = 120, h = Math.max(0, t) / n; for (let i = 0; i < n; i++) s += sfCarV((i + 0.5) * h) * h; return s; }
function sfDunes(k) {
  // zemin şeridi: kayan kum dalgacıkları
  const s = k.scroll || 0, top = [];
  for (let x = -300; x <= 400; x += 10) top.push(x, 152 - 3 * Math.sin((x + s) * 0.045) - 2.5 * Math.sin((x + s) * 0.017 + 1.3) - 6 * Math.max(0, Math.sin((x + s) * 0.006 + 2)) ** 3);
  top.push(400, 180, -300, 180);
  return [top];
}
function sfDesertProps(k) {
  // geçen taşlar, çalılar; sonunda vaha: hurma ağaçları
  const o = [], s = k.scroll || 0, t = k.t || 0;
  for (let i = 0; i < 9; i++) {
    const x = 420 + i * 150 + hash1(i + 60) * 60 - s; if (x < -320 || x > 430) continue;
    if (i % 3 === 1) { for (let b = 0; b < 5; b++) { const a = -PI / 2 + (b - 2) * 0.38; o.push(sfLeaf(x, 152, x + Math.cos(a) * 22, 152 + Math.sin(a) * 22, 5, 0, 8)); } }
    else o.push(sfEllipse(x, 152, 10 + hash1(i) * 10, 6 + hash1(i + 1) * 5, 0, 12));
  }
  // vaha: hurmalar ve çalı (kayma durduğunda yerlerine gelir)
  const S = sfCarS(9), palm = (bx, h, lean, ph) => {
    const x0 = bx - s + S - 0; if (x0 < -330 || x0 > 460) return;
    const tr = []; for (let j = 0; j <= 14; j++) { const u = j / 14; tr.push(x0 + Math.sin(u * 1.3) * lean * h, 152 - u * h); }
    o.push(sfStroke(tr, 14, 8, 0, 1));
    for (let j = 1; j < 14; j += 2) o.push(sfEllipse(tr[j * 2], tr[j * 2 + 1], 8, 3, 0, 8));
    const tx = tr[28], ty = tr[29];
    for (let f = 0; f < 7; f++) {
      const a = -PI + (f / 6) * PI + Math.sin(t * 1.5 + f + ph) * 0.05, L = 70 + Math.sin(f * 2.1) * 12, line = [];
      for (let j = 0; j <= 10; j++) { const u = j / 10, aa = a + u * u * (Math.cos(a) > 0 ? 0.9 : -0.9) * (a < -PI / 2 + 0.01 && a > -PI / 2 - 0.01 ? 0 : 1); line.push(tx + Math.cos(a) * L * u, ty + Math.sin(a) * L * u + u * u * 30); }
      o.push(sfFur(sfStroke(line, 10, 2, 1, 1), 4, 7, 0, 0.5, f * 9));
    }
  };
  palm(330, 220, 0.12, 0); palm(400, 170, -0.1, 2);
  const bx = 34 - s + S; if (bx > -330 && bx < 460) for (let b = 0; b < 7; b++) { const a = -PI / 2 + (b - 3) * 0.32; o.push(sfLeaf(bx, 154, bx + Math.cos(a) * 30, 154 + Math.sin(a) * 30, 7, 0, 8)); }
  return o;
}
function sfStars(k) {
  const o = [], t = k.t || 0;
  const st = [[-250, -230, 1], [-170, -262, 0.8], [-90, -236, 1.1], [-20, -266, 0.7], [60, -246, 0.9], [210, -262, 0.8], [-230, -160, 0.7], [-120, -190, 0.6], [370, -170, 0.7], [300, -150, 0.6]];
  st.forEach(([x, y, s], i) => { const tw = 0.75 + 0.25 * Math.sin(t * (2 + hash1(i) * 3) + i * 2); o.push(sfEllipse(x, y, 4.5 * s * tw, 4.5 * s * tw, 0, 8)); });
  // kılavuz yıldız: dört kollu parıltı
  const gx = 330, gy = -240, tw = 1 + 0.12 * Math.sin(t * 3.1), sp = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = (i % 4 === 0 ? 30 : i % 2 === 0 ? 7 : 5) * tw; sp.push(gx + Math.cos(a) * r, gy + Math.sin(a) * r); }
  o.push(sp);
  // kayan yıldız
  const u = t - 7.0;
  if (u > 0 && u < 0.7) { const x = -150 + u * 520, y = -280 + u * 150, dx = 520, dy = 150, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, L = 110 * Math.sin((u / 0.7) * PI); o.push([x, y, x - ux * L - uy * 3, y - uy * L + ux * 3, x - ux * L * 1.02, y - uy * L * 1.02, x - ux * L + uy * 3, y - uy * L - ux * 3]); o.push(sfEllipse(x, y, 5, 5, 0, 8)); }
  return o;
}
function SF_CARAVAN_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t;
  k.gI = kf(t, [[0, 0.45], [0.8, 1.0]]) * (0.94 + 0.06 * Math.sin(t * 9)) + (t > 7.0 && t < 7.7 ? 0.35 * Math.sin(((t - 7) / 0.7) * PI) : 0);
  const s = sfCarS(t), v = sfCarV(t) / 78; k.scroll = s;
  const ph = s / 92; // adım fazı zemine kilitli
  // öncü deve başını kaldırıp böğürür
  B.aneck.r = kf(t, [[0.5, 0], [0.8, -0.18, 'out'], [1.3, -0.12], [1.7, 0]]); B.ahead.r = kf(t, [[0.5, 0], [0.8, 0.2, 'out'], [1.3, 0.16], [1.7, 0]]);
  for (const [p, off] of [['a', 0], ['b', 0.35]]) {
    const q = ph + off, ws = Math.sin(q * TAU * 2);
    sfGait(B, [[p + 'lnf', p + 'knf', 0, 0], [p + 'lnh', p + 'knh', 0.02, 1], [p + 'lff', p + 'kff', 0.5, 0], [p + 'lfh', p + 'kfh', 0.52, 1]], q, v, { swing: 0.3, knee: 0.75, lift: 7 });
    B[p + 'body'].y = -Math.abs(Math.sin(q * TAU)) * 5 * v; B[p + 'body'].r = Math.sin(q * TAU) * 0.025 * v;
    B[p + 'neck'].r += Math.sin(q * TAU * 2 + 0.6) * 0.07 * v; B[p + 'head'].r += -Math.sin(q * TAU * 2 + 0.6) * 0.06 * v;
    B[p + 'bell'].r = Math.sin(q * TAU * 2 + 1.2) * 0.45 * v + ring(t, 5.9, 0.3, 1.2, 1.5); B[p + 'tail'].r = Math.sin(q * TAU * 2) * 0.12 * v + Math.sin(t * 1.7) * 0.05;
    B[p + 'ear'].r = ring(t, 0.6 + off * 2, -0.4, 3, 5);
  }
  // binici: sallanır, fener sarkaç gibi; atkının ucu uçuşur
  B.rider.y = -Math.abs(Math.sin(ph * TAU)) * 3 * v; B.rider.r = Math.sin(ph * TAU) * 0.03 * v;
  B.pole.r = kf(t, [[0.6, 0], [1.0, -0.12, 'out'], [1.6, 0]]);
  B.lamp.r = Math.sin(t * 2.6) * 0.18 * (0.3 + v) + ring(t, 5.9, 0.25, 0.9, 1.0);
  // vaha: öncü deve çöker, yük devesi çalıyı kemirir
  const k1 = kf(t, [[5.9, 0], [6.45, 1, 'io']]), k2 = kf(t, [[6.35, 0], [7.05, 1, 'io']]);
  if (k1 > 0) {
    B.abody.r += 0.36 * k1 * (1 - k2) + 0.03 * k2; B.abody.y += 84 * k2;
    B.alnf.r = -0.36 * k1 * (1 - k2) - 1.25 * k2; B.aknf.r = 1.6 * k1 + 1.3 * k2; B.alff.r = B.alnf.r; B.akff.r = B.aknf.r;
    B.alnh.r = -0.36 * k1 * (1 - k2) - 1.35 * k2; B.alfh.r = B.alnh.r; B.aknh.r = 2.55 * k2; B.akfh.r = 2.55 * k2;
    B.aneck.r += -0.3 * k1 * (1 - k2) - 0.1 * k2; B.rider.r += -0.25 * k1 * (1 - k2);
  }
  const nb = kf(t, [[5.85, 0], [6.4, 1, 'io']]);
  B.bneck.r += 0.62 * nb; B.bhead.r += 0.55 * nb + Math.sin(t * 9) * 0.04 * nb;
  k.wind = v * 0.25;
  // kervan ipi: öncünün eyerinden yük devesinin yularına
  [k.rax, k.ray] = sfBoneXf(SF_CARAVAN_BONES, B, 'abody', 150 - 40, -144); [k.rbx, k.rby] = sfBoneXf(SF_CARAVAN_BONES, B, 'bhead', -172 + 198 * 0.84, 150 + (-58 - 150) * 0.84);
}
const SF_CARAVAN = (() => {
  const A = SF_CAR_A, Bc = SF_CAR_B, T = A.T, XS = A.XS;
  const bones = Object.assign({}, A.bones, Bc.bones, {
    rider: ['abody', ...T(-6, -134), ...T(-6, -214)], pole: ['rider', ...T(26, -160), ...T(96, -214)], lamp: ['pole', ...T(96, -214), ...T(96, -180)],
    world: [null, 0, 160, 100, 160],
  });
  SF_CARAVAN_BONES = bones;
  const rider = [
    { id: 'saddle', bind: ['abody'], pts: XS([sfStroke(sfCurve(16, -118, 18, -130, 20, -140, 24, -150, 6), 7, 5, 1, 1), sfStroke(sfCurve(-32, -118, -36, -130, -38, -140, -42, -148, 6), 7, 5, 1, 1)]) },
    { id: 'tassel', bind: ['abody'], gen: (k) => { const o = [], v = Math.sin((k.t || 0) * 5); for (let i = 0; i < 4; i++) { const a = 0.9 + i * 0.22 + v * 0.12; o.push(sfStroke(sfCurve(24, -148, 24 + Math.cos(a) * 10, -148 + Math.sin(a) * 10, 24 + Math.cos(a) * 18, -148 + Math.sin(a) * 22, 24 + Math.cos(a) * 20 + v * 3, -148 + Math.sin(a) * 30, 6), 3, 2, 1, 1), sfEllipse(24 + Math.cos(a) * 20 + v * 3, -148 + Math.sin(a) * 30 + 3, 3, 4, 0, 8)); } return XS(o); }, bone: 'abody' },
    { id: 'rider', bind: ['rider'], xf: [150, 0, 0, 1], d: 'M -26 -134 C -30 -150 -28 -170 -22 -184 C -20 -190 -22 -196 -20 -202 C -18 -214 -6 -222 6 -216 C 12 -212 12 -206 10 -202 L 15 -197 L 10 -194 C 11 -190 9 -187 5 -185 C 11 -177 15 -161 15 -146 C 15 -140 13 -136 9 -134 Z' },
    { id: 'rlimbs', bind: ['rider'], pts: XS([...sfLeg([-6, -140, 16, -132, 18, -100], [18, 12, 10]), sfEllipse(23, -97, 8, 4), sfStroke(sfCurve(2, -176, 10, -168, 16, -162, 30, -162, 6), 10, 8, 1, 1)]) },
    { id: 'wrap', bone: 'rider', gen: (k) => { const t = k.t || 0, w = Math.sin(t * 5) * 0.12 + (k.wind || 0), line = []; for (let j = 0; j <= 12; j++) { const u = j / 12, a = lerp(1.95, 2.5, u * 0.6 + w) + Math.sin(u * 4 + t * 6) * 0.08 * u; line.push(j ? line[line.length - 2] + Math.cos(a) * 3.4 : 150 - 16, j ? line[line.length - 1] + Math.sin(a) * 3.4 : -204); } return [sfStroke(line, 12, 7, 1, 1)]; } },
    { id: 'pole', bind: ['pole'], pts: XS([sfStroke([18, -150, 98, -216], 4.5, 3.5, 1, 1)]) },
    { id: 'lamp', bind: ['lamp'], pts: XS([sfStroke([96, -214, 96, -198], 2, 2, 1, 1), [89, -196, 103, -196, 99, -202, 93, -202], [88, -196, 104, -196, 102, -178, 90, -178], [86, -178, 106, -178, 104, -174, 88, -174]]) },
    { id: 'lampGlow', glow: 1, show: 1, bind: ['lamp'], pts: XS([sfEllipse(96, -187, 15, 15, 0, 16)]) },
  ];
  const packs = { id: 'packs', bind: ['bbody'], pts: Bc.XS([sfEllipse(-6, -128, 34, 20, 0.05), sfStroke([-66, -136, 52, -152], 17, 15, 1, 1), sfEllipse(22, -170, 18, 16), sfStroke([22, -186, 22, -192], 6, 9, 1, 1), [-44, -150, -30, -150, -26, -168, -30, -186, -28, -194, -46, -194, -44, -186, -48, -168], sfStroke(sfCurve(-48, -170, -58, -168, -58, -156, -50, -152, 6), 3, 3, 1, 1)]) };
  const rope = { id: 'rope', prop: 1, show: 1, gen: (k) => { const ax = k.rax ?? 108, ay = k.ray ?? -146, bx = k.rbx ?? 0, by = k.rby ?? -26, line = []; for (let j = 0; j <= 14; j++) { const u = j / 14; line.push(lerp(bx, ax, u), lerp(by, ay, u) + Math.sin(u * PI) * 34); } return [sfStroke(line, 3, 3, 1, 1)]; } };
  return {
    key: 'kervan', name: 'Deve Kervanı', line: 'Kılavuz yıldızın altında kum dalgalarını aştılar; vahaya varınca deve diz çöktü.', dur: 8.6, fitW: 4.8, fitH: 3.5, glowCol: [1.0, 0.76, 0.42],
    groups: [['albf', 'alff', 'alfh', 'atail', 'abody', 'aear', 'abell', 'alnf', 'alnh', 'saddle', 'tassel', 'rider', 'rlimbs', 'wrap', 'pole', 'lamp'], ['blff', 'blfh', 'btail', 'bbody', 'bear', 'bbell', 'blnf', 'blnh', 'packs', 'dunes']],
    bones,
    k0: { t: 0, scroll: 0, gI: 0.45 },
    layers: [
      { id: 'stars', glow: 1, show: 1, gen: (k) => sfStars(k) },
      ...Bc.layers.slice(0, 4), packs, ...Bc.layers.slice(4),
      ...A.layers.slice(0, 4), ...rider.slice(0, 2), ...A.layers.slice(4), ...rider.slice(2),
      { id: 'dunes', bone: 'world', gen: (k) => sfDunes(k) },
      { id: 'desert', prop: 1, show: 1, gen: (k) => sfDesertProps(k) },
      rope,
    ],
    perform: SF_CARAVAN_PERFORM,
    events: [[0.6, 'camelGroan'], [1.0, 'bells'], [5.9, 'kneel'], [7.0, 'shootingStar']],
  };
})();
SF_DEFS.push(SF_CARAVAN);

/* ---------- XIV. Kurt ve Ay — kayalıkta uluyan kurt ---------- */
function sfPine(x0, y0, H, W) {
  const o = [sfStroke([x0, y0, x0, y0 - H], 14, 6, 0, 1)], n = 7;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), y = y0 - H * 0.2 - u * H * 0.78, w = W * (1 - u * 0.82), h = 34 + (1 - u) * 26, p = [x0, y - h];
    const teeth = 5 + Math.round((1 - u) * 4);
    for (let j = 0; j <= teeth; j++) { const v = j / teeth, x = x0 + w * (v * 2 - 1); p.push(x, y + (j % 2 ? 0 : 7) + Math.abs(v - 0.5) * 6); }
    o.push([p[0], p[1], ...p.slice(2).reverse().reduce((a, _, i, r) => (i % 2 ? a : a.concat([r[i + 1], r[i]])), [])]);
  }
  return o;
}
function sfMoon(k) {
  const x = k.mx, y = k.my, R = 66, o = [sfEllipse(x, y, R, R, 0, 40)];
  // denizler (kraterler) ışıkta delik
  for (const [cx, cy, r] of [[-18, -14, 15], [16, 10, 11], [-6, 26, 8], [24, -22, 7]]) { const h = sfEllipse(x + cx, y + cy, r, r * 0.9, 0.4, 14); h.hole = 1; o.push(h); }
  return o;
}
function SF_WOLF_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t;
  // ay doğar
  const mr = Ease.outCubic(clamp01((t - 0.2) / 2.0)); k.mx = lerp(268, 200, mr); k.my = lerp(70, -170, mr);
  k.cl = t - 6.4; // bulutlar
  k.gI = (0.2 + 0.8 * smoothstep(0.2, 1.6, t)) * (1 - 0.55 * smoothstep(6.8, 7.8, t));
  B.body.sy = 1 + Math.sin(t * 2.4) * 0.012;
  B.ear.r = ring(t, 0.6, -0.3, 3, 5) + kf(t, [[2.0, 0], [2.3, -0.25], [4.8, -0.25], [5.1, 0]]); B.earF.r = B.ear.r * 0.9;
  // başını aya çevirir, koklar
  let nk = kf(t, [[0.9, 0], [1.4, -0.22, 'out'], [1.9, -0.18]]), hd = Math.sin(Math.max(0, t - 1.4) * 16) * 0.025 * (t > 1.4 && t < 1.9 ? 1 : 0);
  // uluma ×2
  const h1 = kf(t, [[2.0, 0], [2.45, 1, 'out'], [3.4, 1], [3.65, 0.35, 'io'], [3.9, 0.35], [4.2, 1.1, 'out'], [4.75, 1.1], [5.0, 0, 'io']]);
  const jw = kf(t, [[2.2, 0], [2.5, 0.42, 'out'], [3.35, 0.38], [3.6, 0.04], [4.2, 0.04], [4.4, 0.46, 'out'], [4.7, 0.42], [4.95, 0]]) * (1 + Math.sin(t * 30) * 0.06);
  nk += -0.62 * h1; hd += -0.42 * h1; B.jaw.r = jw;
  B.body.r = -0.06 * h1; B.lnf.r = B.lff.r = 0.06 * h1; B.tail.r = 0.18 * h1 + Math.sin(t * 1.3) * 0.04;
  B.neck.r = nk; B.head.r = hd;
  // sıçrayıp kayadan iner, koşarak gider
  const cr = kf(t, [[5.0, 0], [5.4, 1, 'out'], [5.5, 0.6]]);
  B.wolf.y = cr * 14; B.lnh.r += cr * 0.3; B.lfh.r += cr * 0.3; B.knh.r -= cr * 0.4; B.kfh.r -= cr * 0.4; B.lnf.r += cr * 0.1;
  if (t > 5.5) {
    const u = t - 5.5, J = 0.62;
    if (u < J) {
      const v = u / J; B.wolf.x = v * 260; B.wolf.y = lerp(8, 150, v) - Math.sin(v * PI) * 150; B.wolf.r = lerp(-0.3, 0.25, v);
      const st = Math.sin(Math.min(1, v * 1.4) * PI * 0.5); B.lnf.r = -1.0 * st; B.lff.r = -0.85 * st; B.lnh.r = 0.9 * st; B.lfh.r = 0.8 * st; B.knf.r = 0.2 * st; B.neck.r = -0.1; B.head.r = 0; B.tail.r = -0.4;
    } else {
      const w = u - J, ph = w * 2.8;
      B.wolf.x = 260 + w * 420; B.wolf.y = 150 - Math.abs(Math.sin(ph * PI)) * 18; B.wolf.r = Math.sin(ph * TAU) * 0.05;
      B.lnf.r = B.lff.r = B.lnh.r = B.lfh.r = B.knf.r = B.kff.r = B.knh.r = B.kfh.r = 0;
      sfGait(B, [['lnh', 'knh', 0, 1], ['lfh', 'kfh', 0.08, 1], ['lnf', 'knf', 0.5, 0], ['lff', 'kff', 0.58, 0]], ph, 1, { swing: 0.6, knee: 1.0, lift: 8 });
      B.neck.r = -0.05 + Math.sin(ph * TAU) * 0.06; B.head.r = 0.08; B.tail.r = -0.55 + Math.sin(ph * TAU) * 0.1;
    }
  }
  B.tree.r = Math.sin(t * 1.1) * 0.012 + Math.sin(t * 2.9) * 0.005;
}
const SF_WOLF = (() => {
  const outline = sfFlat(sfParse('M 156 -118 C 156 -122 152 -125 146 -126 C 138 -128 130 -131 124 -136 C 118 -142 112 -148 102 -150 C 94 -152 84 -150 78 -146 C 68 -138 58 -124 46 -114 C 36 -106 24 -102 10 -100 C -20 -98 -54 -96 -82 -92 C -98 -90 -110 -84 -116 -72 C -120 -60 -118 -48 -108 -38 C -96 -28 -80 -32 -70 -40 C -54 -48 -30 -44 -6 -36 C 20 -28 48 -22 66 -26 C 80 -30 90 -44 96 -60 C 102 -76 108 -90 114 -98 C 118 -103 122 -106 126 -107 C 138 -109 148 -110 154 -112 C 157 -113 157 -116 156 -118 Z')).polys[0];
  // yele (boyun), göğüs, karın ve uyluk arkası daha tüylü; sırt hafif
  const body = sfShag(outline, (x, y) => (x > 118 ? 0 : Math.max(Math.hypot(x - 84, y + 104) < 52 ? 4.6 : 0, y > -52 && x < 70 && x > -80 ? 3 : 0, x < -100 ? 2.8 : 0, x < 110 && y < -90 ? 1.2 : 0, x > 70 && y > -100 ? 4 : 0)), 6.5, 3);
  const eye = sfFlat(sfParse('M 110 -133 C 114 -138 121 -139 125 -136 C 121 -132 115 -131 110 -133 Z')).polys[0];
  const ear = (x0, x1, h) => [x0, -144, lerp(x0, x1, 0.25) + 2, -162, (x0 + x1) / 2 + 4, -144 - h, lerp(x0, x1, 0.75) + 3, -160, x1, -142];
  return {
    key: 'kurt', name: 'Kurt ve Ay', line: 'Dolunay kayalığın ardından yükseldi; kurt başını kaldırıp iki kez uludu — ve geceye karıştı.', dur: 8.4, fitW: 4.4, fitH: 3.7, glowCol: [0.92, 0.9, 0.78],
    bones: {
      wolf: [null, -90, 60, 70, 60], body: ['wolf', -90, -60, 60, -70], neck: ['body', 50, -90, 100, -130], head: ['neck', 96, -126, 156, -116], jaw: ['head', 120, -108, 152, -108],
      ear: ['head', 98, -148, 104, -178], earF: ['head', 84, -146, 86, -174], tail: ['body', -112, -80, -152, 10],
      lnf: ['body', 66, -40, 62, -6], knf: ['lnf', 62, -6, 64, 56], lff: ['body', 46, -40, 42, -6], kff: ['lff', 42, -6, 44, 56],
      lnh: ['body', -90, -60, -76, -20], knh: ['lnh', -76, -20, -94, 56], lfh: ['body', -72, -60, -58, -20], kfh: ['lfh', -58, -20, -76, 56],
      tree: [null, -232, 230, -232, -130], rock: [null, 0, 200, 100, 200],
    },
    k0: { t: 0, mx: 268, my: 70, cl: -1, gI: 0.2 },
    layers: [
      { id: 'moon', glow: 1, back: 1, show: 1, gen: (k) => sfMoon(k) },
      { id: 'tree', bind: ['tree'], soft: 60, pts: sfPine(-232, 230, 330, 70) },
      { id: 'earF', bind: ['earF'], pts: [ear(76, 94, 34)] },
      { id: 'lff', bind: ['lff', 'kff'], soft: 10, pts: sfLeg([46, -44, 42, -6, 40, 40, 46, 54], [28, 17, 10, 10], sfEllipse(51, 57, 10, 4.5)) },
      { id: 'lfh', bind: ['lfh', 'kfh'], soft: 10, pts: sfLeg([-72, -64, -58, -20, -82, 24, -74, 52], [40, 27, 12, 10], sfEllipse(-68, 57, 10, 4.5)) },
      { id: 'tail', bind: ['tail'], pts: [sfShag(sfBrush(sfCurve(-108, -84, -136, -70, -152, -34, -154, 8, 26), 18, 38, 8), () => 3.6, 7, 11)] },
      { id: 'body', bind: ['body', 'neck', 'head'], soft: 18, pts: [body, eye], holeSub: [1] },
      { id: 'jaw', bind: ['jaw'], d: 'M 124 -108 C 134 -109 144 -110 152 -112 C 152 -107 148 -103 142 -102 C 134 -101 126 -102 120 -104 Z' },
      { id: 'ear', bind: ['ear'], pts: [ear(88, 108, 40)] },
      { id: 'lnf', bind: ['lnf', 'knf'], soft: 10, pts: sfLeg([66, -44, 62, -6, 60, 40, 66, 54], [30, 18, 11, 11], sfEllipse(71, 57, 11, 5)) },
      { id: 'lnh', bind: ['lnh', 'knh'], soft: 10, pts: sfLeg([-90, -64, -76, -20, -100, 24, -92, 52], [44, 30, 13, 11], sfEllipse(-86, 57, 11, 5)) },
      { id: 'rock', bind: ['rock'], d: 'M -206 236 C -204 200 -196 160 -184 132 C -178 118 -168 112 -160 104 L -150 96 C -146 88 -140 82 -130 78 L -118 66 C -80 62 -20 60 40 60 C 70 60 96 62 112 64 C 124 66 136 70 142 78 C 148 86 146 96 140 102 L 150 112 C 156 122 154 134 150 144 C 160 164 176 190 186 236 Z' },
      { id: 'grass', bind: ['rock'], pts: [[-128, 70, -122, 50, -118, 66, -112, 46, -108, 64, -100, 52, -98, 66], [118, 68, 124, 52, 128, 66, 134, 50, 136, 70]] },
      { id: 'clouds', prop: 1, show: 1, gen: (k) => { if (k.cl <= 0) return []; const o = []; for (let i = 0; i < 3; i++) { const x = 520 - k.cl * (120 + i * 26) - i * 140, y = -214 + i * 40; for (let j = 0; j < 7; j++) { const u = j / 6; o.push(sfEllipse(x + (u - 0.5) * 220, y - Math.sin(u * PI) * 12 + 6, 36 + Math.sin(j * 1.7 + i) * 8, 9 + Math.sin(u * PI) * 7, 0, 16)); } } return o; } },
    ],
    perform: SF_WOLF_PERFORM,
    events: [[0.3, 'moonRise'], [2.1, 'howl'], [4.2, 'howl2'], [4.9, 'answer'], [5.5, 'leap'], [6.1, 'run']],
  };
})();
SF_DEFS.push(SF_WOLF);

/* ---------- XV. Ejderha — final: kanatlar ayrı heykel, ateş ve duman ---------- */
// yarasa kanadı (yan görünüş): kol + parmaklar + oyuk zar kenarı; o: açıklık, fl: çırpma açısı
function sfDragonWing(k, rx, ry, sc, da) {
  // yan görünüş: üst kol öne-yukarı, ön kol geriye-yukarı (bilek en tepede), parmaklar geriye-aşağı yelpaze;
  // çırpma: kanat omuz çizgisi etrafında dikeyde katlanır (aşağı vuruşta gövdenin altına iner)
  const o = clamp01(k.wo), fy = k.wy ?? 1;
  const P = (x, y, a, L) => [x + Math.cos(a) * L * sc, y + Math.sin(a) * L * sc];
  const a1 = lerp(-1.0, -1.25, o) + da, E = P(rx, ry, a1, 84), a2 = lerp(-2.05, -2.5, o) + da, W = P(E[0], E[1], a2, 124);
  const tips = [];
  for (let j = 0; j < 4; j++) { const a = lerp(3.0, 3.3, o) - j * lerp(0.26, 0.4, o) + da * 0.5, L = [196, 170, 138, 104][j] * lerp(0.78, 1, o); tips.push(P(W[0], W[1], a, L)); }
  const att = [rx - 86 * sc, ry + 22 * sc], pts = [rx, ry, ...E, ...W];
  const scal = (A, Bp, dd) => { const mx = (A[0] + Bp[0]) / 2, my = (A[1] + Bp[1]) / 2, cx = lerp(mx, W[0], dd), cy = lerp(my, W[1], dd); for (let q = 1; q <= 8; q++) { const u = q / 8, v = 1 - u; pts.push(v * v * A[0] + 2 * v * u * cx + u * u * Bp[0], v * v * A[1] + 2 * v * u * cy + u * u * Bp[1]); } };
  pts.push(...tips[0]); for (let j = 0; j < 3; j++) scal(tips[j], tips[j + 1], 0.4); scal(tips[3], att, 0.34);
  const o2 = [pts, sfStroke([rx, ry, ...E], 18 * sc, 12 * sc, 1, 1), sfStroke([...E, ...W], 12 * sc, 8 * sc, 1, 1)];
  tips.forEach((tp) => o2.push(sfStroke([...W, ...tp], 6.5 * sc, 2.5 * sc, 1, 1)));
  const th = P(W[0], W[1], a2 + 0.9, 20); o2.push(sfStroke(sfCurve(W[0], W[1], th[0], th[1], th[0] + 5 * sc, th[1] - 6 * sc, th[0] + 12 * sc, th[1] - 4 * sc, 6), 7 * sc, 1.5 * sc, 1, 1));
  if (fy !== 1) for (const p of o2) for (let i = 1; i < p.length; i += 2) { p[i] = ry + (p[i] - ry) * fy; p[i - 1] = rx + (p[i - 1] - rx) * (0.85 + 0.15 * Math.abs(fy)); }
  return o2;
}
function sfDragonTail(k) {
  const t = k.t || 0, A = k.tw || 0, N = 30, L = 250, line = [-108, -4], nr = [];
  let x = -108, y = -4;
  for (let j = 1; j <= N; j++) {
    const s = j / N, ang = 2.45 + 0.3 * s + 1.5 * Math.pow(smoothstep(0.55, 1, s), 1.3) + A * s * Math.sin(TAU * 1.1 * t - s * 5) + (k.tl || 0) * s;
    x += Math.cos(ang) * (L / N); y += Math.sin(ang) * (L / N); line.push(x, y); nr.push(ang);
  }
  const wf = (s) => lerp(38, 7, Math.pow(s, 0.8)), o = [sfStroke(line, 1, 1, 0, 0, wf)];
  // sırt dikenleri (üst kenar) ve mızrak uçlu kuyruk
  for (let j = 2; j < N - 2; j += 3) { const s = j / N, a = nr[j - 1], w = wf(s) / 2, nx = Math.sin(a), ny = -Math.cos(a), bx = line[j * 2] - nx * w * 0.6, by = line[j * 2 + 1] - ny * w * 0.6, h = 14 * (1 - s * 0.6); o.push([bx - Math.cos(a) * 6, by - Math.sin(a) * 6, bx + Math.cos(a) * 7 - nx * 0, by + Math.sin(a) * 7, bx - nx * h + Math.cos(a) * 5, by - ny * h + Math.sin(a) * 5].map((v, i) => v)); }
  const a = nr[N - 1], ex = line[N * 2], ey = line[N * 2 + 1], c = Math.cos(a), s = Math.sin(a);
  const sp = [[2, 0], [-10, -15], [12, -11], [42, 0], [12, 11], [-10, 15]].map(([u, v]) => [ex + c * u - s * v, ey + s * u + c * v]);
  o.push([].concat(...sp));
  return o;
}
// alev: gölge dilleri (dış) + ışık çekirdeği (glow) — saf zaman parçacıkları
function sfFlames(k, glow) {
  const o = [], u = k.fu; if (u == null || u < 0) return o;
  const dx = Math.cos(k.fa), dy = Math.sin(k.fa), px = -dy, py = dx, len = 2.1;
  for (let i = 0; i < 90; i++) {
    const te = i * 0.026; if (te > len) break;
    const a = u - te; if (a < 0 || a > 0.8) continue;
    const d = 430 * a * (1 - a * 0.4), jit = Math.sin(i * 12.9 + a * 9) * a * 70, rise = a * a * 90;
    const cx = k.fx + dx * d + px * jit, cy = k.fy + dy * d + py * jit - rise, r = (8 + a * 84) * (1 - smoothstep(0.55, 0.8, a)) * (k.fk ?? 1);
    if (r < 2) continue;
    if (glow) { o.push(sfEllipse(cx, cy, r * 0.78, r * 0.7, 0, 12)); continue; }
    const p = [];
    for (let q = 0; q < 20; q++) { const th = (q / 20) * TAU, up = Math.max(0, -Math.sin(th)), rr = r * (1 + 0.22 * Math.sin(th * 5 + i * 2.1 + a * 26) + up * up * (0.55 + 0.35 * Math.sin(i + a * 30))); p.push(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr); }
    o.push(p);
  }
  if (glow && u < len + 0.1 && (k.fk ?? 1) > 0.5) o.push(sfEllipse(k.fx + dx * 16, k.fy + dy * 16, 30, 26, 0, 14));
  return o;
}
function sfSmokeD(k) {
  const o = [], t = k.t || 0;
  const puff = (t0, x0, y0, n, sd, sz, spread) => {
    for (let i = 0; i < n; i++) {
      const a = t - t0 - hash1(sd + i) * spread; if (a < 0 || a > 2.4) continue;
      const x = x0 + Math.sin(a * 2 + i) * 14 + a * 26 * (hash1(sd + i + 5) - 0.3), y = y0 - a * 70 - a * a * 10, r = sz * (0.4 + a * 0.7) * (1 - smoothstep(1.4, 2.4, a));
      if (r > 1.5) { const p = []; for (let q = 0; q < 14; q++) { const th = (q / 14) * TAU, rr = r * (1 + 0.15 * Math.sin(th * 3 + i + a * 3)); p.push(x + Math.cos(th) * rr, y + Math.sin(th) * rr * 0.85); } o.push(p); }
    }
  };
  if (k.nx != null) { puff(0.85, k.nx, k.ny, 5, 300, 10, 1.4); puff(5.6, k.mx2, k.my2, 9, 400, 22, 1.1); }
  puff(4.9, 300, 150, 10, 500, 16, 1.8); puff(5.1, 370, 128, 8, 520, 14, 1.6);
  return o;
}
function sfEmbers(k) {
  const o = [], t = k.t || 0;
  for (let i = 0; i < 26; i++) {
    const a = t - 4.0 - hash1(i + 700) * 2.2; if (a < 0 || a > 3) continue;
    const x = 120 + hash1(i + 701) * 300 + Math.sin(a * 3 + i) * 16, y = 140 - hash1(i + 702) * 120 - a * 60, r = 2.6 * (1 - a / 3) * (0.7 + 0.3 * Math.sin(t * 20 + i));
    if (r > 0.5) o.push(sfEllipse(x, y, r, r, 0, 6));
  }
  return o;
}
let SF_DRAGON_BONES = null;
function SF_DRAGON_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t;
  // gözler yanar
  const fire = t > 3.4 && t < 5.6 ? 1 : 0;
  k.gI = kf(t, [[0, 0.15], [0.4, 0.15], [1.2, 1]]) * (1 + fire * (0.25 + 0.25 * Math.sin(t * 37) * Math.sin(t * 23)));
  B.body.sy = 1 + Math.sin(t * 2.0) * 0.015 + kf(t, [[2.6, 0], [3.3, 0.05, 'io'], [3.5, 0]]);
  // kanat açılır, kuyruk kamçılanır
  k.wo = kf(t, [[1.5, 0.55], [2.5, 1, 'out']]); k.flap = 0; k.wy = 1; k.tw = 0.12 + 0.25 * smoothstep(1.5, 2.2, t);
  // nefes al (baş geri) → ateş (ileri-aşağı uzanır, çene açık) → kükre
  const inh = kf(t, [[2.6, 0], [3.3, 1, 'io'], [3.45, 0, 'snap']]), thr = kf(t, [[3.3, 0], [3.55, 1, 'out'], [5.3, 1], [5.6, 0, 'io']]), roar = kf(t, [[5.55, 0], [5.85, 1, 'out'], [6.3, 1], [6.5, 0]]);
  const sweep = Math.sin(clamp01((t - 3.5) / 1.9) * PI * 1.0) * 0.18 * thr;
  B.n1.r = -0.15 * inh + 0.18 * thr - 0.22 * roar; B.n2.r = -0.2 * inh + 0.22 * thr + sweep - 0.25 * roar; B.n3.r = -0.15 * inh + 0.12 * thr - 0.2 * roar;
  B.head.r = 0.1 * inh + 0.12 * thr + sweep * 0.5 - 0.35 * roar + Math.sin(t * 1.7) * 0.03;
  B.jaw.r = 0.12 * inh + 0.5 * thr * (0.9 + 0.1 * Math.sin(t * 25)) + 0.62 * roar;
  // havalanma
  let fly = 0;
  if (t > 6.3) {
    const u = t - 6.3; fly = u;
    k.wy = lerp(1, Math.cos(u * 2.3 * TAU) * 0.85 + 0.1, smoothstep(0, 0.25, u)); k.wo = 1;
    const lift = u < 1.0 ? smoothstep(0.3, 1.0, u) * 50 : 50 + (u - 1) * (u - 1) * 160 + (u - 1) * 110;
    B.drag.y = -lift + Math.sin(u * 2.3 * TAU + 1.2) * 10 * smoothstep(0.2, 0.5, u); B.drag.x = u > 1.0 ? (u - 1) * (u - 1) * 120 + (u - 1) * 90 : 0;
    B.drag.r = -0.12 * smoothstep(0.3, 1.2, u);
    const dang = smoothstep(0.4, 1.0, u); B.lnf.r = B.lff.r = 0.5 * dang; B.knf.r = B.kff.r = 0.6 * dang; B.lnh.r = B.lfh.r = 0.45 * dang; B.knh.r = B.kfh.r = 0.5 * dang;
    k.tl = 0.35 * dang; k.tw = 0.3;
    B.n1.r += -0.1 * dang; B.head.r += 0.1 * dang;
  }
  // ağız, burun ve ateş yönü (kemik zincirinden)
  const [mx, my] = sfBoneXf(SF_DRAGON_BONES, B, 'head', 208, -147), [ax, ay] = sfBoneXf(SF_DRAGON_BONES, B, 'head', 150, -147);
  k.fx = mx; k.fy = my; k.fk = 1 - smoothstep(5.15, 5.45, t); k.fa = Math.atan2(my - ay, mx - ax) + 0.22; k.fu = t - 3.45;
  [k.nx, k.ny] = sfBoneXf(SF_DRAGON_BONES, B, 'head', 204, -158); k.mx2 = mx; k.my2 = my;
}
const SF_DRAGON = (() => {
  const outline = sfFlat(sfParse('M 214 -150 C 212 -156 204 -160 194 -161 C 184 -162 176 -164 168 -170 C 162 -174 156 -178 148 -178 C 140 -178 132 -174 126 -166 C 118 -158 106 -150 98 -138 C 90 -126 88 -110 92 -96 C 96 -82 96 -68 86 -58 C 76 -50 58 -48 40 -50 C 10 -52 -30 -50 -64 -42 C -92 -36 -110 -24 -116 -6 C -118 8 -110 22 -96 30 C -70 40 -30 44 10 40 C 40 38 64 30 82 16 C 100 2 112 -16 116 -36 C 120 -52 124 -66 122 -80 C 120 -94 118 -110 124 -124 C 128 -134 134 -140 142 -144 C 160 -146 186 -146 206 -146 C 212 -146 215 -148 214 -150 Z')).polys[0];
  // sırt boyunca üçgen dikenler (enseden sağrıya)
  const body = sfShag(outline, (x, y, nx, ny) => (nx < 0.25 && ny < 0.3 && x < 130 && x > -112 && y < -40 ? (x > 100 ? 7 : 11) : 0), 14, 21);
  const eye = sfFlat(sfParse('M 160 -162 C 164 -166 170 -167 175 -164 C 170 -160 164 -159 160 -162 Z')).polys[0];
  const teeth = [164, 174, 184, 194, 202].map((x) => [x - 3, -147, x + 3, -147, x, -139]);
  const claws = (x, y) => [0, 1, 2].map((j) => sfStroke(sfCurve(x + j * 6, y - 2, x + j * 6 + 8, y - 2, x + j * 6 + 12, y + 1, x + j * 6 + 14, y + 6, 5), 5, 1.5, 1, 1));
  const bones = {
    drag: [null, -70, 80, 90, 80], body: ['drag', -60, 0, 60, 0], n1: ['body', 70, -40, 106, -70], n2: ['n1', 106, -70, 96, -120], n3: ['n2', 96, -120, 126, -160], head: ['n3', 128, -156, 214, -150], jaw: ['head', 146, -144, 206, -142],
    lnf: ['body', 76, 4, 84, 44], knf: ['lnf', 84, 44, 86, 78], lff: ['body', 58, 4, 66, 44], kff: ['lff', 66, 44, 68, 78],
    lnh: ['body', -80, 0, -54, 40], knh: ['lnh', -54, 40, -80, 76], lfh: ['body', -62, 0, -36, 40], kfh: ['lfh', -36, 40, -62, 76], rock: [null, 0, 200, 100, 200],
  };
  SF_DRAGON_BONES = bones;
  return {
    key: 'ejderha', name: 'Ejderha', line: 'Gözleri kor gibi yandı, kanatlarını açıp ateş püskürdü — alevler perdede dans ederken göğe yükseldi.', dur: 10.0, fitW: 4.4, fitH: 3.5, cxOff: 45,
    glowCol: [1.0, 0.55, 0.18],
    groups: [['lff', 'lfh', 'tail', 'body', 'horns', 'jaw', 'lnf', 'lnh', 'rock'], ['wingF', 'wingN']],
    bones,
    k0: { t: 0, wo: 0.55, wy: 1, flap: 0, tw: 0, tl: 0, gI: 0.15, fu: -1, fx: 0, fy: 0, fa: 0 },
    layers: [
      { id: 'wingF', bone: 'body', gen: (k) => sfDragonWing(k, 44, -60, 0.86, 0.22) },
      { id: 'lff', bind: ['lff', 'kff'], soft: 10, pts: sfLeg([58, -6, 66, 40, 64, 70, 72, 76], [36, 22, 14, 11]).concat(claws(70, 76)) },
      { id: 'lfh', bind: ['lfh', 'kfh'], soft: 12, pts: sfLeg([-62, -10, -34, 36, -64, 58, -48, 76], [62, 34, 17, 12]).concat(claws(-52, 76)) },
      { id: 'tail', bone: 'body', gen: (k) => sfDragonTail(k) },
      { id: 'body', bind: ['body', 'n1', 'n2', 'n3', 'head'], soft: 18, pts: [body, eye, ...teeth], holeSub: [1] },
      { id: 'horns', bind: ['head'], pts: [sfStroke(sfCurve(140, -176, 126, -194, 110, -206, 88, -214, 12), 14, 2, 0, 1), sfStroke(sfCurve(130, -170, 116, -180, 104, -186, 86, -188, 10), 10, 1.5, 0, 1), [128, -164, 108, -160, 126, -154], [180, -166, 186, -176, 188, -164]] },
      { id: 'jaw', bind: ['jaw'], pts: [sfFlat(sfParse('M 144 -146 C 160 -146 182 -146 204 -145 C 204 -140 198 -136 188 -134 C 172 -133 156 -134 142 -138 Z')).polys[0], ...[168, 180, 192].map((x) => [x - 3, -145, x, -152, x + 3, -145]), [152, -135, 146, -122, 160, -134]] },
      { id: 'lnf', bind: ['lnf', 'knf'], soft: 10, pts: sfLeg([76, -6, 84, 40, 82, 70, 90, 76], [40, 24, 16, 12]).concat(claws(88, 77)) },
      { id: 'lnh', bind: ['lnh', 'knh'], soft: 12, pts: sfLeg([-80, -10, -52, 36, -82, 58, -66, 76], [68, 36, 18, 13]).concat(claws(-70, 77)) },
      { id: 'wingN', bone: 'body', gen: (k) => sfDragonWing(k, 20, -50, 1, 0) },
      { id: 'rock', bind: ['rock'], d: 'M -240 236 C -236 196 -226 150 -214 120 L -204 104 C -196 92 -184 86 -170 84 L -150 78 C -90 76 -20 78 50 78 C 90 78 120 80 136 86 C 150 92 154 104 148 116 L 158 124 C 166 140 168 160 164 180 C 172 200 180 220 184 236 Z' },
      { id: 'eyeGlow', glow: 1, show: 1, bind: ['head'], pts: [sfEllipse(167, -157, 9, 7)] },
      { id: 'smoke', prop: 1, show: 1, gen: (k) => sfSmokeD(k) },
      { id: 'flame', prop: 1, show: 1, gen: (k) => sfFlames(k, false) },
      { id: 'fireGlow', glow: 1, show: 1, gen: (k) => sfFlames(k, true).concat(sfEmbers(k)) },
    ],
    perform: SF_DRAGON_PERFORM,
    events: [[0.4, 'eyeGlow'], [0.9, 'smoke'], [1.6, 'unfurl'], [2.6, 'inhale'], [3.45, 'fire'], [5.6, 'roar'], [6.4, 'wingBeat'], [6.85, 'wingBeat'], [7.3, 'takeoff'], [7.75, 'wingBeat']],
  };
})();
SF_DEFS.push(SF_DRAGON);

/* ---------- III. Tavşan (yeniden) — ayışığında karahindiba, nöbet ve aya sıçrayış ---------- */
// uzun, ucu yuvarlak kulak: dar taban, geniş orta, yuvarlak uç
function sfEar(x0, y0, x1, y1, W, n = 18) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, o = [];
  for (let side = 1; side >= -1; side -= 2) for (let k = 0; k <= n; k++) {
    if (side < 0 && (k === 0 || k === n)) continue;
    const s = side > 0 ? k / n : 1 - k / n, hw = (W / 2) * Math.pow(Math.sin(PI * (0.1 + 0.9 * s)), 0.38) * (1 + 0.15 * Math.sin(PI * s));
    o.push(x0 + ux * s * L + nx * hw * side, y0 + uy * s * L + ny * hw * side);
  }
  return o;
}
function sfMeadow(k) {
  const o = [], t = k.t || 0, gw = k.gw || 0;
  const top = []; for (let x = -250; x <= 300; x += 10) top.push(x, 131 - 5 * Math.sin((x + 40) * 0.012) - 2.5 * Math.sin(x * 0.05));
  top.push(300, 158, -250, 158); o.push(top);
  // çimen: rüzgârda ve sekişlerin esintisinde salınan bıçaklar
  for (let i = 0; i < 30; i++) {
    const x = -245 + i * 18.5 + hash1(i + 3) * 9, h = 12 + hash1(i + 7) * 20, w = Math.sin(t * 1.5 + i * 0.7) * 0.1 + gw * Math.sin(t * 9 + i) * 0.25 * Math.exp(-Math.abs(x - (k.gx || 0)) / 120), a = -PI / 2 + (hash1(i + 11) - 0.5) * 0.5 + w;
    o.push(sfStroke(sfCurve(x, 133, x + Math.cos(a) * h * 0.4, 133 + Math.sin(a) * h * 0.4, x + Math.cos(a + w) * h * 0.75, 133 + Math.sin(a + w) * h * 0.75, x + Math.cos(a + w * 2) * h, 133 + Math.sin(a + w * 2) * h, 5), 4.5, 1, 0, 1));
  }
  return o;
}
// karahindiba: tavşan yedikçe başı küçülür, sap kısalır
function sfDandelion(k) {
  const e = clamp01(k.eat || 0), t = k.t || 0, sway = Math.sin(t * 1.3) * 3, H = 62 * (1 - e * 0.45), bx = 140, o = [];
  const tx = bx - 6 + sway * (1 - e), ty = 132 - H;
  o.push(sfStroke(sfCurve(bx, 132, bx - 2, 132 - H * 0.4, tx + 2, ty + H * 0.3, tx, ty, 10), 4, 2.5, 0, 1));
  if (e < 0.95) { const r = 10 * (1 - e); o.push(sfShag(sfEllipse(tx, ty - r * 0.6, r, r * 0.85, 0, 16), () => 3.5 * (1 - e), 5, 9)); }
  for (const [a, L] of [[-2.6, 26], [-0.5, 24], [-2.2, 18]]) o.push(sfLeaf(bx, 131, bx + Math.cos(a) * L, 131 + Math.sin(a) * L, 7, 4, 10));
  return o;
}
// arka bacak: e > 0 itiş (bacak geriye gerilir, parmaklar en son ayrılır), e < 0 öne savrulma (inişte ön patilerin önüne)
function sfRabHind(B, e, far) {
  const [l, tb, f] = far ? ['lfh', 'tfh', 'ffh'] : ['lnh', 'tnh', 'fnh'], a = Math.max(0, e), b = Math.max(0, -e);
  B[l].r = 1.12 * a - 0.8 * b; B[tb].r = -1.24 * a + 0.16 * b; B[f].r = 2.87 * a + 0.78 * b;
}
function SF_RABBIT_PERFORM(t, S) {
  const B = S.b, k = S.k; k.t = t;
  B.body.sy = 1 + Math.sin(t * 3.1) * 0.012; // nefes
  // burun kıpırtısı (hep), kulak seğirmeleri
  const tw = Math.max(0, Math.sin(t * 38)) * (0.5 + 0.5 * Math.sin(t * 1.7)); B.nose.sx = B.nose.sy = 1 + tw * 0.35;
  B.earN0.r = ring(t, 0.9, -0.18, 3.5, 5) + ring(t, 2.05, -0.25, 3.5, 4); B.earF0.r = ring(t, 1.4, 0.16, 3.5, 5) + kf(t, [[2.1, 0], [2.3, -0.42, 'out'], [3.0, -0.42], [3.3, 0.1], [3.6, 0]]);
  // otlanma: baş eğilir, çiğner, karahindiba azalır
  const nib = kf(t, [[0.4, 0], [0.8, 1, 'io'], [1.9, 1], [2.05, 0, 'snap']]);
  B.body.r = 0.1 * nib; B.head.r = 0.62 * nib + Math.sin(t * 15) * 0.035 * nib; B.lnf.r = B.lff.r = -0.1 * nib;
  k.eat = smoothstep(0.85, 1.9, t);
  // irkilme ve şaha kalkış (nöbet): topuk üstünde doğrulur, ön patiler göğse
  const su = kf(t, [[2.25, 0], [2.6, 1, 'out'], [3.55, 1], [3.8, 0, 'in']]);
  B.rab.r = -0.95 * su; B.fnh.r = 0.95 * su; B.ffh.r = 0.95 * su; B.head.r += 0.72 * su + Math.sin(t * 2.2) * 0.06 * su;
  B.lnf.r += -0.35 * su; B.knf.r = 1.5 * su; B.lff.r += -0.3 * su; B.kff.r = 1.4 * su;
  B.tail.r = -0.3 * su + ring(t, 3.95, -0.4, 4, 6);
  // uyarı: arka ayak yere vurur
  const th = (c) => (t > c && t < c + 0.2 ? Math.sin(((t - c) / 0.2) * PI) : 0), thump = th(3.85) + th(4.05);
  B.fnh.r += -0.35 * thump; B.tnh.r += 0.15 * thump;
  // üç sekiş: ön patiler önce iner, arka ayaklar onların önüne gelir; sonuncusu aya
  const H = [[4.2, 0.62, 150, 52], [4.82, 0.62, 160, 58]];
  let x = 0, gx = -999;
  for (const [t0, T, D, h] of H) {
    if (t < t0) break;
    const p = clamp01((t - t0) / T), air = Math.sin(PI * clamp01((p - 0.04) / 0.72));
    if (p < 1) {
      const ext = kf(p, [[0, 0], [0.2, 1, 'out'], [0.42, 0.55], [0.66, -0.55], [0.86, -0.4], [1, 0]]), fr = kf(p, [[0, 0], [0.18, -1, 'out'], [0.5, -0.5], [0.66, 0.3], [0.86, 0.45], [1, 0]]);
      sfRabHind(B, ext, 0); sfRabHind(B, kf(p - 0.03, [[0, 0], [0.2, 1, 'out'], [0.42, 0.55], [0.66, -0.55], [0.86, -0.4], [1, 0]]), 1);
      B.lnf.r = 0.85 * fr; B.lff.r = 0.85 * kf(p + 0.04, [[0, 0], [0.18, -1, 'out'], [0.5, -0.5], [0.66, 0.3], [0.86, 0.45], [1, 0]]); B.knf.r = B.kff.r = 0.5 * Math.max(0, -fr) + 0.35 * Math.max(0, fr);
      B.body.r = kf(p, [[0, 0], [0.18, -0.1], [0.45, 0.04], [0.66, 0.2], [0.86, 0.04], [1, 0]]);
      B.rab.y = -air * h; B.earN0.r += -0.55 * air; B.earN1.r = -0.35 * air; B.earF0.r += -0.6 * air; B.earF1.r = -0.3 * air; B.tail.r += -0.5 * air;
      if (p > 0.66 && p < 0.9) gx = x + D;
    }
    x += D * Math.pow(clamp01((p - 0.02) / 0.86), 0.8) * (p < 0.88 ? 1 : 1);
    // zemin kısıtı: itişte parmaklar yerde kalır, gövde bacakla birlikte yükselir
    if (p > 0 && p < 1) {
      let low = -1e9;
      for (const [bn, px, py] of [['fnh', 6, 126], ['fnh', -88, 122], ['ffh', 18, 126], ['knf', 80, 126], ['kff', 66, 126]]) low = Math.max(low, sfBoneXf(SF_RABBIT.bones, B, bn, px, py)[1]);
      if (low > 128) B.rab.y -= low - 128;
    }
  }
  // son sıçrayış: aya doğru yükselip ışığa karışır (küçülerek uzaklaşır)
  if (t > 5.44) {
    const u = clamp01((t - 5.44) / 1.5), [px, py] = crPath(u, [[0, 0, 0], [0.3, 90, -150], [0.65, 150, -225], [1, 173, -256]]);
    x += px; B.rab.y = py; const sc = lerp(1, 0.04, Ease.inCubic(u)); B.rab.sx = B.rab.sy = sc;
    const st = Math.min(1, u * 4); sfRabHind(B, st, 0); sfRabHind(B, st * 0.9, 1); B.lnf.r = B.lff.r = -0.85 * st; B.knf.r = B.kff.r = 0.4 * st;
    B.body.r = -0.3 * st; B.earN0.r = -0.7 * st; B.earF0.r = -0.75 * st; B.earN1.r = B.earF1.r = -0.35 * st;
    if (u > 0.98) S.hide.rab = 1;
    if (u < 0.4) { B.rab.x = x; let low = -1e9; for (const [bn, qx, qy] of [['fnh', 6, 126], ['ffh', 18, 126], ['knf', 80, 126]]) low = Math.max(low, sfBoneXf(SF_RABBIT.bones, B, bn, qx, qy)[1]); if (low > 128) B.rab.y -= low - 128; }
  }
  B.rab.x = x; k.gx = gx; k.gw = gx > -999 ? 1 : 0;
  k.gI = 0.85 + 0.15 * smoothstep(5.4, 6.6, t) * (1 - smoothstep(7.0, 8.0, t)) + 0.04 * Math.sin(t * 1.3);
}
const SF_RABBIT = {
  key: 'tavsan', name: 'Tavşan', line: 'Karahindibayı kemirdi, doğrulup nöbet tuttu — ve bir sıçrayışta ayışığına karıştı.', dur: 8.0, fitW: 4.2, fitH: 3.4,
  glowCol: [0.95, 0.92, 0.8],
  bones: {
    rab: [null, -88, 126, 60, 126], body: ['rab', -60, 40, 40, 0], head: ['body', 58, -26, 124, -18], nose: ['head', 121, -20, 127, -19],
    earN0: ['head', 72, -52, 62, -104], earN1: ['earN0', 62, -104, 50, -158], earF0: ['head', 60, -50, 46, -100], earF1: ['earF0', 46, -100, 30, -150],
    tail: ['body', -114, 30, -128, 22],
    lnh: ['body', -70, 50, -36, 100], tnh: ['lnh', -36, 100, -88, 122], fnh: ['tnh', -88, 122, 6, 126],
    lfh: ['body', -58, 50, -24, 100], tfh: ['lfh', -24, 100, -76, 122], ffh: ['tfh', -76, 122, 18, 126],
    lnf: ['body', 62, 28, 66, 84], knf: ['lnf', 66, 84, 80, 126], lff: ['body', 48, 28, 52, 84], kff: ['lff', 52, 84, 66, 126],
    world: [null, 0, 140, 100, 140],
  },
  k0: { t: 0, eat: 0, gx: -999, gw: 0, gI: 0.85 },
  layers: [
    { id: 'moon', glow: 1, back: 1, show: 1, gen: () => { const o = [sfEllipse(395, -130, 70, 70, 0, 44)]; for (const [cx, cy, r] of [[-16, -12, 14], [18, 8, 10], [-4, 24, 7]]) { const h = sfEllipse(395 + cx, -130 + cy, r, r * 0.9, 0.4, 14); h.hole = 1; o.push(h); } return o; } },
    { id: 'ground', bone: 'world', gen: (k) => sfMeadow(k) },
    { id: 'flower', bone: 'world', gen: (k) => sfDandelion(k) },
    { id: 'earF', bind: ['earF0', 'earF1'], soft: 14, pts: [sfEar(62, -42, 30, -152, 30)] },
    { id: 'lff', bind: ['lff', 'kff'], soft: 10, pts: sfLeg([48, 24, 50, 60, 54, 100, 60, 120, 72, 126], [20, 13, 10, 9, 9], sfEllipse(70, 126, 10, 4.5)) },
    { id: 'lfh', bind: ['lfh', 'tfh', 'ffh'], soft: 9, pts: [...sfLeg([-26, 88, -76, 118], [36, 20]), ...sfLeg([-86, 121, -30, 124, 16, 125], [19, 14, 11])] },
    { id: 'tail', bind: ['tail'], pts: [sfShag(sfEllipse(-118, 26, 17, 16, 0, 22), () => 3.5, 6, 5)] },
    { id: 'body', bind: ['body', 'head', 'lnh'], soft: 18, holeSub: [1],
      d: 'M 124 -18 C 124 -10 118 -4 110 -2 C 104 2 98 4 92 6 C 86 14 80 24 76 34 C 72 50 68 66 60 80 C 46 94 20 98 -6 96 C -24 96 -40 106 -50 118 C -54 122 -56 126 -54 128 L -92 128 C -110 126 -120 112 -122 94 C -126 70 -124 46 -116 26 C -106 0 -84 -20 -56 -30 C -30 -40 0 -40 24 -34 C 40 -40 52 -50 66 -54 C 82 -60 100 -56 110 -44 C 118 -36 124 -28 124 -18 Z M 88 -37 C 92 -42 99 -42 103 -38 C 99 -34 92 -33 88 -37 Z' },
    { id: 'nose', bind: ['nose'], pts: [sfEllipse(124, -20, 5, 4)] },
    { id: 'earN', bind: ['earN0', 'earN1'], soft: 14, pts: [sfEar(76, -46, 50, -160, 33)] },
    { id: 'lnf', bind: ['lnf', 'knf'], soft: 10, pts: sfLeg([62, 22, 64, 60, 68, 100, 74, 120, 86, 126], [22, 14, 11, 10, 10], sfEllipse(84, 126, 11, 5)) },
    { id: 'lnh', bind: ['lnh', 'tnh', 'fnh'], soft: 9, pts: [...sfLeg([-38, 88, -88, 118], [40, 22]), ...sfLeg([-98, 121, -40, 124, 6, 125], [21, 15, 12])] },
    { id: 'whisk', bind: ['head'], pts: [sfStroke(sfCurve(118, -22, 132, -28, 146, -32, 158, -36, 6), 2.6, 1, 1, 0), sfStroke(sfCurve(118, -19, 134, -19, 146, -17, 160, -14, 6), 2.6, 1, 1, 0)] },
  ],
  perform: SF_RABBIT_PERFORM,
  events: [[0.6, 'nibble'], [2.05, 'alert'], [2.3, 'sitUp'], [3.85, 'thump'], [4.05, 'thump'], [4.2, 'hop'], [4.82, 'hop'], [5.44, 'leap']],
};
SF_DEFS[2] = SF_RABBIT;

/* ---------- IV. Balina: okyanus — gölge canlanınca perdenin altından deniz yükselir ---------- */
// Gerstner dalgaları: [dalga boyu, genlik, diklik, hız, faz] — tepeler sivri, çukurlar yumuşak, sola akar
const SF_SEA_W = [[360, 11, 0.62, 0.9, 0.0], [190, 6, 0.5, 1.25, 1.7], [96, 2.6, 0.4, 1.8, 4.1]];
function sfSeaPt(s, t, ys) {
  let X = s, Y = ys;
  for (const [L, A, Q, sp, ph] of SF_SEA_W) { const k = TAU / L, th = k * s + t * sp * 1.6 + ph, q = Q / (k * A * SF_SEA_W.length); X += q * A * Math.cos(th); Y -= A * Math.sin(th); }
  return [X, Y];
}
const sfSeaY = (x, t, ys) => sfSeaPt(x, t, ys)[1];
function sfSea(k) {
  const ys = k.sea, t = k.t; if (!(ys < 460)) return [];
  const o = [], band = [];
  for (let s = -900; s <= 900; s += 8) band.push(...sfSeaPt(s, t, ys));
  band.push(900, 900, -900, 900); o.push(band);
  // köpük: dalga tepelerinin hemen altında ışık sızdıran ince çizgiler
  const [L0, , , sp0, ph0] = SF_SEA_W[0], k0 = TAU / L0;
  for (let n = -4; n <= 4; n++) {
    const sc = (PI / 2 + TAU * n - t * sp0 * 1.6 - ph0) / k0; if (sc < -700 || sc > 700) continue;
    for (let j = 0; j < 3; j++) {
      const len = 26 + hash1(n * 7 + j + 40) * 30, off = (j - 1) * 22 + (hash1(n * 3 + j) - 0.5) * 10, d0 = 7 + j * 5, line = [];
      for (let q = 0; q <= 8; q++) { const s = sc + off - len / 2 + (len * q) / 8, [x, y] = sfSeaPt(s, t, ys); line.push(x, y + d0 + Math.abs(q - 4) * 0.8); }
      const h = sfStroke(line, 3.2 - j * 0.6, 1.4, 1, 1); h.hole = 1; o.push(h);
    }
    // tepeden savrulan serpinti
    for (let j = 0; j < 4; j++) { const c = (t * 0.9 + hash1(n * 5 + j)) % 1, s = sc - c * 40 - j * 6, [x, y] = sfSeaPt(sc, t, ys); if (c < 0.7) o.push(sfEllipse(x - c * 34 - j * 5, y - Math.sin(c * PI) * (10 + j * 4) - 3, 2.2 - c * 1.5, 2.2 - c * 1.5, 0, 6)); }
  }
  // dalış sonrası su altından ışıklı kabarcıklar (yalnızca suyun içinde: delik)
  for (const [bt, bx0, by0, sd] of [[k.bub2, k.rx, 360, 300], [k.bub3, 120, 300, 340]]) if (bt > 0) for (let i = 0; i < 22; i++) {
    const dt = bt - hash1(i + sd) * 1.6; if (dt < 0) continue;
    const x = bx0 + (hash1(i + sd + 1) - 0.5) * 140 + Math.sin(dt * 4 + i) * 7, y = by0 - dt * (90 + hash1(i + sd + 2) * 70), r = 2.5 + hash1(i + sd + 3) * 5;
    if (y > sfSeaY(x, t, ys) + r + 6) { const b = sfEllipse(x, y, r, r * 0.9, 0, 10); b.hole = 1; o.push(b); }
  }
  // dalışın köpük halkası
  for (const [rg, rxx] of [[k.ring, k.rx], [k.ring2, 110]]) if (rg > 0 && rg < 3) { const R = 30 + rg * 55, kr = { ring: rg, rx: rxx }; for (let j = 0; j < 7; j++) { const s = kr.rx - R + (j / 6) * R * 2, line = []; for (let q = 0; q <= 4; q++) { const ss = s + q * 6, [xx, yy] = sfSeaPt(ss, t, ys); line.push(xx, yy + 6 + Math.sin(j) * 2); } if (hash1(j + 77) < 0.75 * (1 - kr.ring / 3)) { const h = sfStroke(line, 2.6, 1.4, 1, 1); h.hole = 1; o.push(h); } } }
  return o;
}
// ufuktaki yelkenli: dalganın eğimine göre sallanır
function sfBoat(k) {
  const ys = k.sea, t = k.t; if (!(ys < 300)) return [];
  const bx = -420, y0 = sfSeaY(bx - 16, t, ys), y1 = sfSeaY(bx + 16, t, ys), a = Math.atan2(y1 - y0, 32) * 0.8, y = (y0 + y1) / 2 - 2;
  const P = (pts) => sfXf(pts, bx, y, a, 0.72);
  return [P([-34, -2, 36, -2, 26, 11, -24, 11]), P(sfStroke([0, -2, 0, -66], 3, 2.4, 0, 1)), P([3, -62, 3, -8, 34, -9]), P([-3, -58, -3, -8, -28, -8]), P([0, -66, 12, -62, 0, -59])];
}
function sfGulls(k) {
  const o = [], t = k.t;
  for (let i = 0; i < 2; i++) {
    const u = t - 1.4 - i * 0.6; if (u < 0) continue;
    const x = 520 - u * (88 + i * 14), y = -250 + i * 34 + Math.sin(u * 0.9 + i) * 14; if (x < -560) continue;
    const a = Math.sin(u * 7.5 + i * 2) * 0.6, s = 1 - i * 0.18;
    o.push(sfStroke([x - 24 * s, y - (6 + a * 14) * s, x - 11 * s, y - (2 - a * 4) * s, x, y + 2 * s, x + 11 * s, y - (2 - a * 4) * s, x + 24 * s, y - (6 + a * 14) * s], 4 * s, 2.6 * s, 1, 1));
  }
  return o;
}
// ay ve denizdeki yakamoz (ön ışık: koyu suyun üstünde parlar)
function sfMoonGlints(k) {
  const o = [], ys = k.sea, t = k.t; if (!(ys < 200)) return o;
  const mx = -300;
  for (let i = 0; i < 20; i++) {
    const d = i * 8.5, x = mx + (hash1(i + 500) - 0.5) * (24 + i * 8) + Math.sin(t * 0.7 + i) * 6, y = sfSeaY(x, t, ys) + 7 + d, w = (7 + hash1(i + 501) * 16) * (1 - d / 240), on = Math.sin(t * (4 + hash1(i) * 3) + i * 2.3);
    if (on > -0.1 && w > 2) o.push(sfEllipse(x, y, w * (0.6 + 0.4 * on), 2.1, 0, 10));
  }
  return o;
}
// balina okyanusta: yüzeye çık, fıskiye, derine in, sudan fırla (breach), sırtüstü çakıl, kuyruğunu dikip dal
function SF_WHALE_OCEAN(t, S) {
  const B = S.b, k = S.k; k.t = t;
  const sw = smoothstep(0.3, 1.2, t), w = t * 0.75 * TAU, br = t > 3.5 && t < 5.2 ? 0.3 : 1, amp = sw * br;
  B.body.r = Math.sin(w) * 0.02 * amp; B.tail1.r = Math.sin(w - 0.7) * 0.06 * amp; B.tail2.r = Math.sin(w - 1.4) * 0.12 * amp; B.fluke.r = Math.sin(w - 2.1) * 0.22 * amp; B.head.r = -Math.sin(w) * 0.015 * amp;
  k.sea = lerp(470, 40, Ease.inOutCubic(clamp01((t - 0.8) / 1.4))) + Math.sin(t * 0.5) * 3;
  k.gI = smoothstep(0.9, 2.4, t) * 0.95;
  // yörünge: x, y, dönüş (pozitif = baş aşağı)
  const X = kf(t, [[0, 0], [3.0, 10], [4.3, 70, 'out'], [5.1, 100], [6.0, 110], [7.4, 190], [8.2, 200]]);
  const Y = kf(t, [[0, 0], [1.2, 0], [2.3, -22, 'io'], [2.8, -22], [3.4, 240, 'in'], [3.55, 280], [4.3, -150, 'out'], [4.68, -100, 'in'], [5.0, 160, 'in'], [5.75, -16, 'out'], [6.0, -16], [6.6, 60, 'in'], [7.15, 210], [7.45, 250], [8.1, 640, 'in']]);
  const R = kf(t, [[0, 0], [2.8, 0], [3.4, 0.4, 'in'], [3.5, 0.4], [3.52, -1.12, 'hold'], [3.55, -1.12], [4.3, -0.95], [4.68, -0.45, 'io'], [5.0, 0.12, 'in'], [5.75, 0, 'out'], [6.0, 0], [6.6, 0.62, 'in'], [7.15, 1.34, 'out'], [7.6, 1.42]]);
  B.whale.x = X; B.whale.y = Y + Math.sin(w + 1.2) * 5 * sw * (t < 3.4 || (t > 5.8 && t < 6.0) ? 1 : 0); B.whale.r = R;
  // sıçrayışta yüzgeçler çırpınır; dalışta kuyruk kalkıp düzleşir
  B.fin.r = Math.sin(w * 0.7) * 0.08 * sw + (t > 3.6 && t < 5.1 ? Math.sin((t - 3.6) * 9) * 0.5 - 0.7 * Math.sin(clamp01((t - 3.6) / 1.5) * PI) : 0);
  const fl = kf(t, [[6.0, 0], [6.6, 1, 'io'], [7.2, 0.3], [7.6, 0]]);
  B.tail1.r += 0.18 * fl; B.tail2.r += 0.25 * fl; B.fluke.r += 0.3 * fl;
  k.sp = t - 2.45;
  // su olayları
  k.su = t - 1.95; k.be = t - 3.78; k.bc = t - 4.86; k.fe = t - 7.62; k.bub2 = t - 7.7; k.bub3 = t - 4.95; k.ring = t - 7.62; k.ring2 = t - 4.9;
  const [fx, fy] = sfBoneXf(SF_WHALE.bones, B, 'fluke', -330, -2); k.flx = fx; k.fly = fy; k.rx = fx;
  // sudan çıkan gövdeden akan su: baş ve sırt boyunca
  k.dr = []; if (t > 3.8 && t < 5.1) for (const [bn, px, py] of [['head', 230, 10], ['head', 160, -40], ['body', 60, -58], ['body', -40, -56]]) k.dr.push(sfBoneXf(SF_WHALE.bones, B, bn, px, py));
}
SF_WHALE.perform = SF_WHALE_OCEAN;
SF_WHALE.layers = SF_WHALE.layers.filter((L) => L.id !== 'bub');
Object.assign(SF_WHALE, { ext: 1, dur: 11.0, glowCol: [0.95, 0.92, 0.8], line: 'Perdenin içinden bir okyanus geçti — dalgaları yarıp göğe fırladı, kuyruğunu ay ışığına kaldırıp derinlere daldı.' });
SF_WHALE.k0 = Object.assign({}, SF_WHALE.k0, { t: 0, sea: 999, gI: 0, bub2: -1, bub3: -1, ring: -1, ring2: -1, rx: 160, flx: 0, fly: 0, su: -1, be: -1, bc: -1, fe: -1, dr: [] });
SF_WHALE.layers.push(
  { id: 'moon', glow: 1, back: 1, show: 1, gen: (k) => (k.sea < 400 ? [sfEllipse(-300, -215, 44, 44, 0, 36)] : []) },
  { id: 'sea', prop: 1, show: 1, gen: (k) => sfSea(k) },
  { id: 'boat', prop: 1, show: 1, gen: (k) => sfBoat(k) },
  { id: 'gulls', prop: 1, show: 1, gen: (k) => sfGulls(k) },
  { id: 'wspl', prop: 1, show: 1, gen: (k) => {
    if (!(k.sea < 300)) return [];
    const ys = k.sea, o = sfSplash(k.su, 22, 900, 236, ys + 2, { up: 380, sp: 170, r: 5, life: 1.1 }).concat(sfSplash(k.be, 40, 930, 150, ys + 2, { up: 640, sp: 230, r: 6.5, life: 1.5, spread: 0.3 }), sfSplash(k.bc, 60, 960, 90, ys + 2, { up: 820, sp: 360, r: 8, life: 1.8, spread: 0.2, cone: 2.6 }), sfSplash(k.fe, 30, 990, k.rx, ys + 2, { up: 520, sp: 220, r: 6, life: 1.3 }));
    // sudan çıkan gövdeden dökülen su
    if (k.dr) k.dr.forEach(([dx, dy], j) => { for (let i = 0; i < 6; i++) { const c = (k.t * 1.6 + hash1(i + j * 13 + 800)) % 1, x = dx + (hash1(i + j * 7 + 801) - 0.5) * 40, y = dy + 8 + c * c * 200; if (y < sfSeaY(x, k.t, ys) - 3) o.push(sfEllipse(x, y, 2.6, 4, 0, 7)); } });
    // kuyruk yüzgecinden süzülen damlalar
    if (k.fly < ys - 12) for (let i = 0; i < 16; i++) { const c = (k.t * 1.3 + hash1(i + 700)) % 1, x = k.flx + (hash1(i + 701) - 0.5) * 120, y = k.fly + 10 + c * c * 180; if (y < sfSeaY(x, k.t, ys) - 3) o.push(sfEllipse(x, y, 2.4, 3.6, 0, 7)); }
    return o;
  } },
  { id: 'glints', glow: 1, show: 1, gen: (k) => sfMoonGlints(k) },
);
SF_WHALE.events = [[0.4, 'whale'], [0.9, 'seaRise'], [1.95, 'surface'], [2.45, 'spout'], [3.0, 'gull'], [3.72, 'breach'], [4.86, 'crash'], [6.0, 'dive'], [7.62, 'flukeSplash'], [7.8, 'bubbles'], [8.8, 'gull']];
