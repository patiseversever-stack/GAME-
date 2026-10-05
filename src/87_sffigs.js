/* =====================================================================
   GÖLGE FİGÜRLERİ — perdeler
   ===================================================================== */
const sfPolyOf = (d, tx = 0, ty = 0, rot = 0, sc = 1) => sfFlat(sfParse(d)).polys.map((p) => sfXf(p, tx, ty, rot, sc));

/* ---------- I. Bülbül — gül dalında ---------- */
// kanat: üstten görünüş (u: gövde boyunca geriye, v: açıklık) → yandan izdüşüm
function sfWing(k, sx, sy, ax, ay, len = 1) {
  const fold = clamp01(k.fold), sinp = Math.sin(k.flap), upx = -ay, upy = ax; // yukarı: gövde ekseninin sırtı
  const span = 158 * len * lerp(1, 0.22, fold), chord = 78 * len * lerp(1, 0.5, fold), sweep = lerp(0.18, 1.1, fold), open = 1 - fold;
  const lead = [], trail = [], n = 22;
  for (let i = 0; i <= n; i++) {
    const v = i / n, tip = Math.sqrt(Math.max(0, 1 - Math.pow(v, 5)));
    const ul = span * v * sweep * 0.5 - 10 * Math.sin(v * PI) * open;
    // ikincil tüyler: arka kenar dişleri; birincil tüyler: uçta ayrık parmaklar
    const sec = v < 0.62 ? 0.07 * Math.max(0, Math.sin(v * 14 * PI)) : 0, prim = v >= 0.62 ? 0.22 * Math.pow(Math.max(0, Math.sin((v - 0.62) * 5 / 0.38 * PI)), 0.6) : 0;
    const c = chord * ((1 - 0.5 * v) * tip + (sec - prim) * open) + 12 * v * open;
    lead.push([ul, span * v]); trail.push([ul + Math.max(4, c), span * v]);
  }
  const pts = lead.concat(trail.reverse()), o = [];
  for (const [u, v] of pts) { const h = v * sinp; o.push(sx + ax * u + upx * h, sy + ay * u + upy * h); }
  return [o];
}
function SF_BIRD_PERFORM(t, S) {
  const B = S.b, k = S.k, tk = 4.55, ft = t - tk;
  B.body.sy = 1 + Math.sin(t * 2.6) * 0.012 * (t < 4.3 ? 1 : 0);
  // baş: kesik kesik bakışlar, sonra şarkı
  B.head.r = kf(t, [[0.5, 0], [0.58, -0.12, 'snap'], [0.95, -0.12], [1.02, 0.07, 'snap'], [1.35, 0.07], [1.42, -0.04, 'snap'], [1.7, -0.04], [1.95, -0.26], [3.7, -0.22], [3.85, 0.05, 'snap'], [4.15, 0.05], [4.4, -0.1]]);
  B.tail.r = ring(t, 1.2, 0.24, 2.0, 3.2) + ring(t, 2.9, 0.16, 2.3, 3.6) + kf(t, [[4.0, 0], [4.35, 0.26], [4.62, -0.12], [5.4, -0.06]]);
  const song = t > 1.9 && t < 3.7 ? (t < 2.6 ? 0.25 + 0.25 * Math.max(0, Math.sin((t - 1.9) * 42)) : t < 3.0 ? 0.85 * win(t, 2.65, 2.95, 0.04, 0.04) : 0.3 + 0.3 * Math.max(0, Math.sin((t - 3.0) * 30))) : 0;
  S.m.sing = song; B.body.sx = 1 + song * 0.02; B.head.sy = 1 + song * 0.02;
  B.body.r = kf(t, [[1.8, 0], [2.2, -0.05], [3.6, -0.04], [4.2, 0.06], [4.45, 0.12], [4.75, 0.66, 'out']]);
  // çömel → havalan
  B.bird.y = kf(t, [[4.0, 0], [4.42, 7], [4.55, 7]]);
  B.legs.sy = kf(t, [[4.0, 1], [4.42, 0.86], [4.55, 0.86], [4.62, 1.05], [4.85, 0.35]]);
  B.legs.r = kf(t, [[4.6, 0], [4.85, 1.3]]);
  if (ft <= 0) { k.fold = kf(t, [[4.1, 1], [4.42, 0.8], [4.55, 0.55]]); k.flap = kf(t, [[4.1, -0.3], [4.42, 0.8], [4.55, 1.3]]); }
  else {
    // sekerek uçuş: çırpış patlamaları + kanat kapalı süzülme
    const cyc = ft < 0.5 ? 0 : (ft - 0.5) % 0.78, glide = ft > 0.5 && cyc > 0.5 ? smoothstep(0.5, 0.56, cyc) * (1 - smoothstep(0.72, 0.78, cyc)) : 0;
    const ph = ft * 7.2 * TAU, fl = Math.cos(ph);
    k.flap = lerp(lerp(1.3, 1.05 * fl, smoothstep(0, 0.08, ft)), 0.2, glide);
    k.fold = Math.max(lerp(0.55, 0, smoothstep(0, 0.07, ft)), 0.4 * Math.max(0, Math.sin(ph + 0.5)) * smoothstep(0.08, 0.2, ft), glide);
    // rota: sağa yukarı kalk, gülün üstünde dön, sola süzül ve çık
    const u = clamp01(ft / 3.1), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, uu = lerp(u, e, 0.55);
    const bx = (q) => { const w = 1 - q; return 3 * w * w * q * 300 + 3 * w * q * q * 300 + q * q * q * -640; };
    const by = (q) => { const w = 1 - q; return w * w * w * 7 + 3 * w * w * q * -150 + 3 * w * q * q * -330 + q * q * q * -250; };
    const x = bx(uu), y = by(uu) + Math.sin(ph) * 5 + glide * 10, dx = bx(uu + 0.01) - x, dy = by(uu + 0.01) - (y - Math.sin(ph) * 5 - glide * 10), dl = Math.hypot(dx, dy) || 1;
    B.bird.x = x; B.bird.y = y;
    const face = clamp(dx / (dl * 0.3), -1, 1);
    B.bird.sx = Math.sign(face || 1) * Math.max(0.08, Math.abs(face)); B.bird.sy = 1;
    B.bird.r = (face >= 0 ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx)) * 0.45 * smoothstep(0, 0.25, ft);
    B.body.r += glide * 0.08;
  }
  // dal ve gül: kuş kalkınca yaylanır
  B.stem.r = ring(t, tk + 0.02, 0.03, 2.3, 1.9);
  B.rose.r = ring(t, tk + 0.1, -0.09, 2.7, 2.2);
  B.leafA.r = ring(t, tk + 0.12, 0.12, 2.0, 2.0); B.leafB.r = ring(t, tk + 0.08, -0.1, 2.4, 2.4);
  // tüy: süzülerek düşer
  if (t > tk + 0.05) {
    const u = t - tk - 0.05; S.hide.feather = 0;
    B.feather.x = 8 + u * 18 + Math.sin(u * 2.7) * 38; B.feather.y = 30 + u * 40 - Math.abs(Math.cos(u * 2.7)) * 12; B.feather.r = Math.sin(u * 2.7 + 0.7) * 0.9 + 0.6;
  }
}
const SF_BIRD = (() => {
  // gül dalı merkez çizgisi; dikenler ve ayaklar bu çizgiye oturur
  const stemC = sfCurve(-250, 122, -120, 98, 60, 96, 204, 34, 40), stemAt = (x) => { let bi = 0; for (let i = 0; i < stemC.length; i += 2) if (Math.abs(stemC[i] - x) < Math.abs(stemC[bi] - x)) bi = i; return [stemC[bi], stemC[bi + 1], bi / 2]; };
  const stemW = (i) => lerp(15, 8, i / 40), fy = stemAt(10)[1] - stemW(stemAt(10)[2]) / 2 + 1, fy2 = stemAt(-6)[1] - stemW(stemAt(-6)[2]) / 2 + 1;
  const thorns = [[-205, 1], [-150, -1], [-75, 1], [-30, -1], [70, 1], [120, -1], [160, 1]].map(([x, s]) => {
    const [cx, cy, i] = stemAt(x), j = Math.min(39, i + 1), dx = stemC[j * 2] - stemC[(j - 1) * 2], dy = stemC[j * 2 + 1] - stemC[(j - 1) * 2 + 1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = uy * s, ny = -ux * s, w = stemW(i) / 2 - 1;
    return [cx + nx * w - ux * 6, cy + ny * w - uy * 6, cx + nx * w + ux * 5, cy + ny * w + uy * 5, cx + nx * (w + 5) - ux * 2, cy + ny * (w + 5) - uy * 2, cx + nx * (w + 10) - ux * 8, cy + ny * (w + 10) - uy * 8];
  });
  const [rx, ry] = [stemC[80], stemC[81]];
  return {
    key: 'bulbul', name: 'Bülbül', line: 'Gülüne bir şarkı söyledi… sonra gecenin içine uçup gitti.', dur: 8.2, fitW: 4.6, fitH: 3.3,
    bones: {
      stem: [null, -250, 122, rx, ry], rose: ['stem', rx, ry, rx + 20, ry - 70], leafA: ['stem', -118, 104, -150, 160], leafB: ['stem', 96, 80, 120, 34],
      bird: [null, 6, fy, 6, 40], legs: ['bird', 4, 30, 8, fy], body: ['bird', -20, 18, 48, -88], head: ['body', 50, -90, 128, -80], tail: ['body', -50, 8, -156, 48],
      feather: [null, -10, -40, -10, -10],
    },
    k0: { fold: 1, flap: -0.3 },
    layers: [
      { id: 'body', bind: ['body', 'head', 'tail'], soft: 11, holeSub: [1],
        d: 'M 104 -84 L 128 -80 C 121 -86 112 -92 103 -96 C 100 -108 90 -118 78 -118 C 66 -118 56 -110 50 -98 C 38 -80 18 -62 -4 -48 C -22 -36 -38 -24 -52 -14 C -84 4 -116 20 -146 32 C -156 36 -160 46 -156 56 C -152 62 -146 62 -140 58 C -112 50 -86 40 -62 30 C -54 36 -44 38 -30 37 C -4 42 28 40 52 18 C 72 2 86 -18 86 -40 C 86 -56 92 -68 100 -76 C 108 -79 118 -80 128 -79 Z M 84 -100 C 88 -100 90 -98 90 -95 C 90 -92 88 -90 85 -90 C 82 -90 80 -92 80 -95 C 80 -98 82 -100 84 -100 Z',
        m: { sing: 'M 102 -84 L 126 -96 C 120 -98 111 -98 103 -98 C 100 -108 90 -118 78 -118 C 66 -118 56 -110 50 -98 C 38 -80 18 -62 -4 -48 C -22 -36 -38 -24 -52 -14 C -84 4 -116 20 -146 32 C -156 36 -160 46 -156 56 C -152 62 -146 62 -140 58 C -112 50 -86 40 -62 30 C -54 36 -44 38 -30 37 C -4 42 28 40 52 18 C 72 2 86 -18 86 -40 C 86 -56 92 -68 100 -76 C 106 -77 114 -74 123 -68 Z M 84 -100 C 88 -100 90 -98 90 -95 C 90 -92 88 -90 85 -90 C 82 -90 80 -92 80 -95 C 80 -98 82 -100 84 -100 Z' } },
      { id: 'legs', bind: ['legs'], pts: [sfStroke([4, 26, 7, 50, 10, fy], 8, 5), sfStroke([10, fy, 20, fy - 1, 31, fy + 3], 5, 3.5), sfStroke([10, fy, 2, fy + 2, -5, fy + 6], 5, 3.5), sfStroke([-8, 28, -8, 52, -6, fy2], 7, 5), sfStroke([-6, fy2, 4, fy2, 14, fy2 + 4], 4.5, 3.5)] },
      { id: 'wing', gen: (k) => sfWing(k, 40, -78, -0.789, 0.614, 1.08), bone: 'body' },
      { id: 'stem', bind: ['stem'], pts: [sfStroke(stemC, 15, 8)].concat(thorns) },
      { id: 'leafA', bind: ['leafA'], pts: [sfStroke(sfCurve(-118, 104, -122, 122, -132, 140, -144, 150, 10), 5, 4, 0, 0), sfLeaf(-144, 150, -186, 196, 34, 9), sfLeaf(-138, 140, -104, 178, 28, 8), sfLeaf(-132, 132, -178, 138, 26, 8)] },
      { id: 'leafB', bind: ['leafB'], pts: [sfStroke(sfCurve(96, 86, 100, 70, 106, 56, 114, 44, 8), 5, 4, 0, 0), sfLeaf(114, 44, 146, 2, 30, 8), sfLeaf(108, 54, 76, 30, 24, 7)] },
      { id: 'rose', bind: ['rose'], pts: sfPolyOf('M -8 -10 C -22 -16 -30 -28 -30 -42 C -30 -50 -34 -56 -42 -60 C -34 -64 -26 -62 -22 -58 C -22 -66 -16 -72 -8 -74 C -4 -78 2 -80 6 -76 C 12 -74 18 -70 22 -64 C 28 -62 36 -64 42 -60 C 34 -56 30 -50 30 -42 C 30 -28 22 -16 8 -10 C 6 -4 -6 -4 -8 -10 Z M -6 -12 C -14 -13 -22 -11 -27 -4 C -29 -1 -28 1 -26 0 C -21 -5 -15 -7 -4 -8 Z M 6 -12 C 14 -13 22 -11 28 -5 C 30 -2 29 0 27 -1 C 22 -6 15 -7 4 -8 Z', rx, ry + 4, 0.38, 1.15) },
      { id: 'feather', prop: 1, bone: 'feather', gen: () => [sfLeaf(-10, -40, -10, 0, 11, 0, 14), sfStroke([-10, -2, -10, 9], 3, 2)] },
    ],
    perform: SF_BIRD_PERFORM,
    events: [[1.9, 'song'], [4.5, 'takeoff'], [4.62, 'flap']],
  };
})();

/* ---------- II. Kedi — kelebek ---------- */
const sfCatD = (j) => {
  const L = (a, b) => (a + (b - a) * j).toFixed(1);
  return `M 92 -92 L 108 ${L(-101, -112)} C 108 ${L(-106, -116)} 106 -112 104 -117 C 102 -128 98 -136 94 -142 L 84 -184 C 76 -170 68 -162 60 -158 C 54 -160 50 -161 46 -160 L 32 -180 C 26 -166 22 -150 22 -138 C 20 -122 16 -110 8 -100 C -4 -88 -20 -70 -34 -46 C -50 -20 -64 10 -74 40 C -84 74 -82 112 -64 132 C -54 141 -44 143 -30 143 L 40 143 C 48 143 50 136 42 132 C 32 128 30 116 38 104 C 46 94 58 94 64 102 L 66 136 C 66 141 70 143 76 143 L 102 143 C 108 143 108 136 102 134 C 92 132 90 126 90 116 L 90 40 C 92 10 97 -20 95 -46 C 94 -62 ${L(88, 78)} ${L(-74, -52)} ${L(88, 80)} ${L(-80, -54)} C ${L(91, 90)} ${L(-83, -52)} ${L(96, 104)} ${L(-87, -56)} ${L(100, 109)} ${L(-91, -66)} Z M 66 -125 C 70 -131 78 -131 83 -127 C 79 -121 71 -120 66 -125 Z`;
};
function sfButterfly(k) {
  const f = lerp(0.12, 1, clamp01(k.bf)), o = [];
  for (const [dx, sc] of [[3, 0.82], [0, 1]]) {
    o.push(sfXf(sfEllipse(8, -13, 8.5, 15, 0.55), dx, 0, 0, sc, sc * f), sfXf(sfEllipse(-3, -8, 6.5, 9.5, -0.35), dx, 0, 0, sc, sc * f));
  }
  o.push(sfEllipse(0, 0, 11, 3, 0.15), sfStroke([8, -2, 14, -10, 18, -14], 1.8, 1.2, 0, 0), sfStroke([9, -2, 17, -8, 22, -9], 1.8, 1.2, 0, 0));
  return o;
}
function SF_CAT_PERFORM(t, S) {
  const B = S.b, k = S.k;
  B.body.sy = 1 + Math.sin(t * 2.2) * 0.012; B.body.sx = 1 - Math.sin(t * 2.2) * 0.006;
  B.earF.r = ring(t, 0.6, -0.32, 4.5, 7) + ring(t, 5.15, -0.35, 4.5, 7) + kf(t, [[2.6, 0], [2.9, 0.12], [4.2, 0.12], [4.5, 0]]);
  B.earB.r = ring(t, 1.9, -0.28, 4.2, 7) + kf(t, [[2.6, 0], [2.9, 0.1], [4.2, 0.1], [4.5, 0]]);
  // kelebek yolu
  const bk = [[0.9, -420, -250], [1.6, -240, -300], [2.3, -60, -240], [2.9, 120, -210], [3.3, 158, -150], [3.55, 150, -142], [3.75, 190, -250], [4.3, 80, -330], [4.9, -60, -250], [5.3, -142, 6], [6.0, -144, 4], [6.4, -170, -120], [7.0, -330, -300], [7.6, -560, -420]];
  const [bx, by] = crPath(t, bk), sit = (t > 5.3 && t < 6.0) || (t > 3.3 && t < 3.55);
  S.hide.bfly = t < 0.9 || t > 7.6 ? 1 : 0;
  k.bf = sit ? 0.5 + 0.5 * Math.sin(t * 6) : 0.5 + 0.5 * Math.sin(t * 34);
  const tb = t > 5.3 && t < 6.0 ? ring(t, 5.95, 0.6, 3, 4) : 0;
  B.bfly.x = bx + (sit ? 0 : Math.sin(t * 9) * 8); B.bfly.y = by + (sit ? 0 : Math.cos(t * 13) * 10) - (t > 5.3 && t < 6.1 ? 0 : 0); B.bfly.r = sit ? -0.2 : Math.sin(t * 5) * 0.4 + tb;
  // baş: kelebeği izler; sonra kuyruğa bakmak için döner
  const [lx, ly] = crPath(t - 0.14, bk), aim = clamp(Math.atan2(ly - -124, lx - 75), -0.55, 0.22);
  const track = smoothstep(1.4, 1.9, t) * (1 - smoothstep(6.9, 7.4, t));
  B.head.r = track * aim + kf(t, [[7.5, 0], [7.8, -0.36, 'out'], [8.7, -0.36], [9.0, 0.06], [9.3, 0.26], [9.45, 0.2], [9.6, 0.28], [9.75, 0.2], [9.9, 0.28], [10.2, 0]]);
  S.m.yawn = kf(t, [[7.6, 0], [8.0, 1, 'out'], [8.5, 1], [8.8, 0, 'io']]);
  // pati: kelebeğe vuruş, sonra yalanma
  B.legF.r = kf(t, [[3.25, 0], [3.35, 0.12], [3.47, -1.95, 'snap'], [3.6, -1.7], [3.85, 0, 'io'], [9.0, 0], [9.25, -2.05, 'io'], [9.95, -1.95], [10.25, 0, 'io']]);
  B.pawF.r = kf(t, [[3.35, 0], [3.47, 0.75, 'snap'], [3.85, 0], [9.1, 0], [9.3, -1.5], [10.1, -1.5], [10.25, 0]]);
  B.legF.y = kf(t, [[9.0, 0], [9.25, -14], [10.1, -14], [10.25, 0]]);
  // kuyruk: tembel salınım → av heyecanı → üstüne konan kelebeği sallar
  const hunt = smoothstep(2.4, 2.9, t) * (1 - smoothstep(4.4, 5.0, t)), amp = 0.06 + hunt * 0.14, fr = 0.45 + hunt * 0.9;
  for (let i = 0; i < 5; i++) B['t' + i].r = wave(t, i, fr, amp * (0.5 + i * 0.25), 0.7) + (i === 4 ? ring(t, 5.95, 0.5, 2.6, 4) : 0) + (i >= 3 ? kf(t, [[5.0, 0], [5.3, -0.1], [5.9, -0.1], [6.0, 0.2], [6.6, 0]]) : 0);
  B.body.r = kf(t, [[3.2, 0], [3.45, -0.05, 'snap'], [3.9, 0], [9.1, 0], [9.4, 0.06], [10.2, 0]]);
}
const SF_CAT = (() => {
  const tc = sfCurve(-46, 118, -80, 146, -124, 142, -148, 108, 12).concat(sfCurve(-148, 108, -166, 78, -160, 44, -142, 24, 12).slice(2));
  return {
    key: 'kedi', name: 'Kedi', line: 'Kelebeği yakalayamadı… ama hiç umursamadı. Kediler hep böyledir.', dur: 10.6, fitW: 3.9, fitH: 3.5,
    bones: {
      cat: [null, 0, 143, 0, 0], body: ['cat', -14, 112, 26, -96], head: ['body', 30, -108, 112, -102], earF: ['head', 70, -152, 84, -184], earB: ['head', 38, -154, 32, -180],
      legF: ['body', 76, 30, 80, 100], pawF: ['legF', 80, 100, 94, 138],
      t0: ['body', -46, 118, -86, 142], t1: ['t0', -86, 142, -128, 138], t2: ['t1', -128, 138, -152, 104], t3: ['t2', -152, 104, -160, 62], t4: ['t3', -160, 62, -142, 24],
      bfly: [null, 0, 0, 10, 0],
    },
    k0: { bf: 0.5 },
    layers: [
      { id: 'tail', bind: ['t0', 't1', 't2', 't3', 't4'], soft: 14, pts: [sfStroke(tc, 26, 13)] },
      { id: 'body', bind: ['body', 'head', 'earF', 'earB'], soft: 15, holeSub: [1], d: sfCatD(0), m: { yawn: sfCatD(1) } },
      { id: 'whisk', bind: ['head'], pts: [sfStroke([102, -99, 124, -106, 148, -113], 4, 1.6, 1, 0), sfStroke([103, -97, 126, -98, 152, -98], 4, 1.6, 1, 0), sfStroke([102, -95, 124, -90, 146, -82], 4, 1.6, 1, 0)] },
      { id: 'legF', bind: ['legF', 'pawF'], soft: 12, pts: [sfStroke([74, 24, 78, 70, 82, 104, 86, 134], 28, 19), sfEllipse(94, 137, 13, 7.5)] },
      { id: 'bfly', prop: 1, bone: 'bfly', gen: (k) => sfButterfly(k) },
    ],
    perform: SF_CAT_PERFORM,
    events: [[1.0, 'bfly'], [3.45, 'swat'], [5.9, 'tail'], [7.6, 'yawn'], [9.3, 'lick']],
  };
})();

/* III. Tavşan: 87_sfwild.js (SF_RABBIT) */

/* ---------- IV. Balina — perdeden geçen okyanus ---------- */
function sfSpout(k) {
  const o = [], u = k.sp; if (u <= 0 || u > 2.6) return o;
  for (let i = 0; i < 64; i++) {
    const t0 = hash1(i) * 0.55, dt = u - t0; if (dt < 0) continue;
    const vx = (hash1(i + 50) - 0.5) * 150 + (hash1(i + 9) - 0.5) * 40, vy = -(330 + hash1(i + 90) * 230), g = 520;
    const x = 150 + vx * dt, y = -50 + vy * dt + 0.5 * g * dt * dt, r = (2.6 + hash1(i + 7) * 5.2) * (1 - smoothstep(1.0, 1.9, dt)) * smoothstep(0, 0.08, dt);
    if (r > 0.6 && y < 40) o.push(sfEllipse(x, y, r, r * (1 + Math.min(1.2, Math.abs(vy + g * dt) / 900)), Math.atan2(vy + g * dt, vx) - PI / 2, 8));
  }
  return o;
}
function sfBubbles(k) {
  const o = [], u = k.bub; if (u <= 0) return o;
  for (let i = 0; i < 16; i++) {
    const t0 = hash1(i + 3) * 1.4, dt = u - t0; if (dt < 0) continue;
    const r = 4 + hash1(i + 33) * 9, x = k.bx + (hash1(i + 11) - 0.5) * 70 + Math.sin(dt * 5 + i) * 8, y = k.by - dt * (120 + hash1(i + 70) * 90) - dt * dt * 20;
    if (y < k.by - 420) continue;
    const a = sfEllipse(x, y, r, r * 0.92, 0, 12), b = sfEllipse(x, y, r * 0.62, r * 0.55, 0, 10); b.hole = true; o.push(a, b);
  }
  return o;
}
function SF_WHALE_PERFORM(t, S) {
  const B = S.b, k = S.k, sw = smoothstep(0.3, 1.2, t), w = t * 0.75 * TAU;
  // yüzüş dalgası: kuyruğa doğru büyüyen gecikmeli salınım
  const amp = sw * (1 + smoothstep(4.6, 5.4, t) * 0.6);
  B.body.r = Math.sin(w) * 0.02 * amp; B.tail1.r = Math.sin(w - 0.7) * 0.06 * amp; B.tail2.r = Math.sin(w - 1.4) * 0.12 * amp; B.fluke.r = Math.sin(w - 2.1) * 0.22 * amp;
  B.head.r = -Math.sin(w) * 0.015 * amp;
  B.whale.y = Math.sin(w + 1.2) * 6 * amp + kf(t, [[1.4, 0], [2.4, -36], [3.6, -30], [4.4, -10]]);
  B.whale.r = kf(t, [[1.4, 0], [2.3, -0.07], [3.4, -0.04], [4.4, 0.02]]);
  // fıskiye
  k.sp = t - 2.45;
  // yüzgeç selamı
  B.fin.r = Math.sin(w * 0.7) * 0.08 * sw + kf(t, [[2.9, 0], [3.3, -1.25, 'out'], [3.6, -0.9], [3.9, -1.3], [4.3, 0, 'io']]);
  // dalış: baş aşağı, kuyruk yukarı — kuyruk yüzgeci dikilir, sonra kayıp gider
  const d = smoothstep(4.6, 6.4, t);
  if (t > 4.6) {
    const u = t - 4.6;
    B.whale.r += Ease.inOutSine(clamp01(u / 1.6)) * 0.95 + Math.max(0, u - 1.6) * 0.25;
    B.whale.x = u * 40 + u * u * 18; B.whale.y += u * u * 60 + u * 20;
    B.tail1.r += -0.28 * d; B.tail2.r += -0.36 * d; B.fluke.r += -0.5 * d;
    B.fin.r += -0.5 * d;
  }
  k.bub = t - 6.3; k.bx = 260; k.by = 330;
}
const SF_WHALE = {
  key: 'balina', name: 'Balina', line: 'Perdenin içinden bir okyanus geçti. Fıskiyesiyle selam verdi, derinlere daldı.', dur: 9.6, fitW: 4.7, fitH: 2.7,
  bones: {
    whale: [null, 0, 0, 100, 0], head: ['whale', 80, 0, 250, -6], body: ['whale', 80, 0, -60, 0], tail1: ['body', -60, -2, -170, -16], tail2: ['tail1', -170, -16, -258, -2], fluke: ['tail2', -258, -2, -372, -2],
    fin: ['body', 112, 38, 0, 160],
  },
  k0: { sp: 0, bub: 0, bx: 0, by: 0 },
  layers: [
    { id: 'body', bind: ['head', 'body', 'tail1', 'tail2', 'fluke'], soft: 20,
      d: 'M 264 12 C 266 0 258 -12 246 -20 Q 240 -28 232 -25 C 220 -32 208 -36 196 -39 Q 189 -46 181 -42 C 160 -48 140 -52 120 -54 C 70 -62 20 -64 -30 -60 C -70 -56 -96 -50 -114 -46 C -124 -48 -130 -54 -138 -64 C -142 -58 -146 -50 -156 -44 C -190 -32 -226 -18 -258 -10 C -276 -30 -318 -52 -374 -44 C -360 -30 -344 -12 -334 -4 L -328 2 C -342 10 -356 26 -370 40 C -318 40 -280 22 -258 6 C -220 18 -170 40 -110 56 C -50 72 30 86 110 88 C 170 86 218 64 248 40 C 262 30 266 22 264 12 Z M 172 -16 C 175 -16 177 -14 177 -12 C 177 -10 175 -8 172 -8 C 169 -8 167 -10 167 -12 C 167 -14 169 -16 172 -16 Z M 232 26 Q 190 52 120 64 Q 190 57.5 232 30.5 Z M 226 36 Q 184 62 118 74 Q 184 67.5 226 40.5 Z M 212 48 Q 170 70 112 82 Q 170 75.5 212 52.5 Z', holeSub: [1, 2, 3, 4] },
    { id: 'fin', bind: ['fin'], xf: [8, 22], d: 'M 124 30 Q 116 50 104 62 Q 98 76 84 88 Q 76 104 60 116 Q 50 132 32 144 C 20 154 6 166 -6 168 C -12 168 -12 162 -6 156 C 26 124 62 88 92 40 Z' },
    { id: 'spout', prop: 1, show: 1, bone: 'whale', gen: (k) => sfSpout(k) },
    { id: 'bub', prop: 1, show: 1, gen: (k) => sfBubbles(k) },
  ],
  perform: SF_WHALE_PERFORM,
  events: [[0.4, 'whale'], [2.45, 'spout'], [3.2, 'splash'], [4.7, 'dive'], [6.3, 'bubbles']],
};

/* ---------- V. Fil — ve yavrusu ---------- */
// bir katman/kemik kümesini önekle kopyala, ölçekle, taşı (yavru fil)
function sfClone(bones, layers, pre, sc, tx, ty, parentOf) {
  const B = {}, L = [];
  for (const [n, b] of Object.entries(bones)) B[pre + n] = [b[0] ? pre + b[0] : parentOf || null, tx + b[1] * sc, ty + b[2] * sc, tx + (b[3] ?? b[1]) * sc, ty + (b[4] ?? b[2]) * sc];
  for (const l of layers) {
    const c = Object.assign({}, l, { id: pre + l.id, prop: 1 });
    if (l.bind) c.bind = l.bind.map((n) => pre + n); if (l.bone) c.bone = pre + l.bone;
    if (l.pts) c.pts = l.pts.map((p) => sfXf(p, tx, ty, 0, sc));
    if (l.d) c.xf = [tx, ty, 0, sc];
    if (l.soft) c.soft = l.soft * sc;
    L.push(c);
  }
  return { B, L };
}
const sfLegShape = (x0, x1, top, bot, flare = 5) => `M ${x0} ${top} L ${x1} ${top} C ${x1 + 2} ${top + 60} ${x1} ${bot - 40} ${x1 + flare} ${bot - 4} C ${x1 + flare + 1} ${bot} ${x1 + flare - 2} ${bot} ${x1 + flare - 6} ${bot} L ${x0 - flare + 4} ${bot} C ${x0 - flare} ${bot} ${x0 - flare - 1} ${bot - 2} ${x0 - flare} ${bot - 6} C ${x0 + 2} ${bot - 40} ${x0} ${top + 60} ${x0} ${top} Z`;
const SF_EL_BONES = {
  ele: [null, 0, 150, 60, 150], body: ['ele', -10, -40, 120, -60], head: ['body', 120, -60, 196, -60], ear: ['head', 112, -112, 62, 36],
  tr0: ['head', 188, -64, 200, 0], tr1: ['tr0', 200, 0, 206, 58], tr2: ['tr1', 206, 58, 204, 108], tr3: ['tr2', 204, 108, 216, 142],
  lnf: ['body', 140, -6, 140, 76], knf: ['lnf', 140, 76, 144, 150], lff: ['body', 83, -6, 83, 76], kff: ['lff', 83, 76, 86, 150],
  lnh: ['body', -131, -6, -131, 76], knh: ['lnh', -131, 76, -134, 150], lfh: ['body', -75, -6, -75, 76], kfh: ['lfh', -75, 76, -78, 150],
  tail: ['body', -176, -40, -194, 40],
};
const SF_EL_LAYERS = [
  { id: 'lff', bind: ['lff', 'kff'], soft: 14, d: sfLegShape(64, 102, -10, 150) },
  { id: 'lfh', bind: ['lfh', 'kfh'], soft: 14, d: sfLegShape(-94, -56, -10, 150) },
  { id: 'tail', bind: ['tail'], pts: [sfStroke(sfCurve(-174, -44, -184, -20, -190, 10, -194, 36, 10), 9, 5), sfLeaf(-194, 30, -198, 58, 14, 0, 10)] },
  { id: 'body', bind: ['body', 'head'], soft: 26, holeSub: [1], d: 'M 196 -50 C 200 -80 192 -120 160 -140 C 140 -152 116 -150 100 -142 C 80 -150 40 -160 -10 -158 C -60 -156 -110 -140 -150 -110 C -170 -90 -180 -60 -178 -30 C -176 0 -166 30 -150 50 C -100 66 0 70 100 56 C 130 50 150 30 160 10 C 170 -6 180 -20 186 -24 C 192 -30 196 -40 196 -50 Z M 152 -102 C 156 -102 158 -99 158 -96 C 158 -93 156 -90 152 -90 C 148 -90 146 -93 146 -96 C 146 -99 148 -102 152 -102 Z' },
  { id: 'tusk', bind: ['head'], pts: [sfStroke(sfCurve(176, -20, 196, 4, 222, 6, 244, -14, 12), 15, 5, 1, 1)] },
  { id: 'trunk', bind: ['tr0', 'tr1', 'tr2', 'tr3'], soft: 18, pts: [sfStroke(sfCurve(190, -70, 208, -20, 210, 60, 204, 112, 18).concat(sfCurve(204, 112, 202, 130, 210, 142, 224, 138, 6).slice(2)), 50, 16, 1, 1)] },
  { id: 'ear', bind: ['ear'], d: 'M 120 -150 C 96 -172 50 -176 30 -134 C 14 -96 22 -36 44 20 C 56 52 74 82 92 80 C 106 78 108 58 110 36 C 114 -6 122 -56 130 -100 C 134 -124 132 -142 120 -150 Z' },
  { id: 'lnf', bind: ['lnf', 'knf'], soft: 14, d: sfLegShape(118, 162, -10, 150) },
  { id: 'lnh', bind: ['lnh', 'knh'], soft: 14, d: sfLegShape(-152, -110, -10, 150) },
];
const SF_BABY = sfClone(SF_EL_BONES, SF_EL_LAYERS, 'b_', 0.5, -330, 75);
// yürüyüş: yanal dizilim (arka-sol, ön-sol, arka-sağ, ön-sağ)
function sfElWalk(B, pre, ph, amp, k = 1) {
  const L = [['lnh', 'knh', 0], ['lnf', 'knf', 0.25], ['lfh', 'kfh', 0.5], ['lff', 'kff', 0.75]];
  for (const [l, kn, o] of L) {
    const p = (ph + o) * TAU, sw = Math.sin(p), lift = Math.max(0, Math.cos(p));
    B[pre + l].r += -sw * 0.24 * amp; B[pre + kn].r += lift * 0.42 * amp * (l.endsWith('h') ? -1 : 1) * k; B[pre + l].y += -lift * 5 * amp;
  }
  B[pre + 'body'].y += Math.sin(ph * 2 * TAU) * 3.5 * amp; B[pre + 'body'].r += Math.sin(ph * 2 * TAU + 0.6) * 0.012 * amp;
  B[pre + 'tr0'].r += Math.sin(ph * TAU) * 0.06 * amp; B[pre + 'tr2'].r += Math.sin(ph * TAU - 1) * 0.1 * amp;
}
function SF_EL_PERFORM(t, S) {
  const B = S.b;
  // kulak yelpazesi
  const flap = (t > 0.4 && t < 1.6) || (t > 4.6 && t < 5.4) ? Math.sin((t - 0.4) * 7) : Math.sin(t * 1.4) * 0.15;
  B.ear.sx = 1 - Math.abs(flap) * 0.32; B.ear.r = flap * 0.06;
  B.body.sy = 1 + Math.sin(t * 1.6) * 0.008;
  // hortumu kaldır, boru sesi
  const up = kf(t, [[1.0, 0], [1.7, 1, 'out'], [2.6, 1], [3.3, 0, 'io']]);
  B.tr0.r = -0.75 * up + Math.sin(t * 1.3) * 0.04; B.tr1.r = -0.95 * up + Math.sin(t * 1.3 - 0.8) * 0.06; B.tr2.r = -1.05 * up + Math.sin(t * 1.3 - 1.6) * 0.08; B.tr3.r = -1.2 * up;
  B.head.r = -0.14 * up + ring(t, 1.75, -0.04, 6, 6);
  B.tail.r = Math.sin(t * 2.1) * 0.12 + ring(t, 4.9, 0.4, 2.4, 3);
  // yavru: koşarak gelir, annenin kuyruğunu tutar
  const bi = t > 3.0; for (const l of SF_BABY.L) S.hide[l.id] = bi ? 0 : 1;
  if (bi) {
    const u = t - 3.0, arrive = 1.8, bx = u < arrive ? -260 + 260 * Ease.outCubic(u / arrive) : 0;
    B.b_ele.x = bx; sfElWalk(B, 'b_', u * 2.2, u < arrive ? 1.4 : 0.15, 1);
    B.b_ear.sx = 1 - Math.abs(Math.sin(u * 9)) * 0.25;
    const grab = smoothstep(arrive + 0.2, arrive + 0.9, u);
    B.b_tr0.r += -1.0 * grab; B.b_tr1.r += -0.7 * grab; B.b_tr2.r += -0.2 * grab; B.b_tr3.r += 0.6 * grab; B.b_head.r += -0.12 * grab;
  }
  // birlikte yürüyüp giderler
  if (t > 5.4) {
    const u = t - 5.4, sp = 96, ph = u * 0.8;
    const ease = smoothstep(0, 1.0, u), dist = u * sp - (1 - ease) * 30;
    B.ele.x = Math.max(0, dist); sfElWalk(B, '', ph, ease);
    if (bi) { B.b_ele.x += Math.max(0, dist); sfElWalk(B, 'b_', ph + 0.12, ease * 0.9); }
  }
}
const SF_ELE = {
  key: 'fil', name: 'Fil', line: 'Hortumunu kaldırıp seslendi. Yavrusu koşup kuyruğuna tutundu, birlikte yola koyuldular.', dur: 11.8, fitW: 3.9, fitH: 3.4,
  bones: Object.assign({}, SF_EL_BONES, SF_BABY.B),
  layers: SF_EL_LAYERS.concat(SF_BABY.L),
  perform: SF_EL_PERFORM,
  events: [[0.4, 'ear'], [1.7, 'trumpet'], [3.0, 'baby'], [4.4, 'babyCall'], [5.4, 'walk']],
};

/* ---------- VI. Zifir — perdenin sahibi ---------- */
function SF_ZIF_PERFORM(t, S) {
  const B = S.b, k = S.k;
  // göz kırpma (göz kapakları sadece kırparken görünür)
  const bl = (c, w = 0.16) => (t > c && t < c + w ? Math.sin(((t - c) / w) * PI) : 0);
  const lidL = Math.max(bl(0.7), bl(2.3), bl(3.9, 0.5) * 0), lidR = Math.max(bl(0.7), bl(2.3), kf(t, [[3.9, 0], [4.02, 1], [4.4, 1], [4.52, 0]]));
  S.hide.lidL = lidL > 0.01 ? 0 : 1; S.hide.lidR = lidR > 0.01 ? 0 : 1; B.lidL.sy = Math.max(0.02, lidL); B.lidR.sy = Math.max(0.02, lidR);
  // bakış
  B.pupil.x = kf(t, [[1.0, 0], [1.15, -10, 'snap'], [1.6, -10], [1.75, 10, 'snap'], [2.1, 10], [2.25, 0, 'snap'], [3.0, 0], [3.2, 0], [5.0, 0], [5.15, 2]]);
  B.pupil.y = kf(t, [[2.25, 0], [2.4, 4], [3.0, 4], [3.2, -2], [5.0, -2], [5.1, 6]]);
  // nefes + zıplamalar (ez-uzat)
  const hop = (c) => { const u = (t - c) / 0.5; return u > 0 && u < 1 ? Math.sin(u * PI) : 0; }, h = hop(2.55) + hop(3.1);
  const land = ring(t, 3.05, 0.12, 3.5, 7) + ring(t, 3.6, 0.14, 3.5, 7);
  B.zif.y = -h * 70; B.body.sy = 1 + Math.sin(t * 2.4) * 0.02 + h * 0.08 - land; B.body.sx = 1 - Math.sin(t * 2.4) * 0.012 - h * 0.05 + land * 0.7;
  B.footL.y = h * 10; B.footR.y = h * 10;
  B.tuft.r = Math.sin(t * 3) * 0.15 + ring(t, 3.05, 0.5, 2.5, 4) + ring(t, 3.6, 0.5, 2.5, 4);
  // dans: sağa sola salın
  B.zif.r = kf(t, [[4.6, 0], [4.8, -0.12], [5.0, 0.12], [5.2, -0.1], [5.4, 0.08], [5.6, 0]]);
  // final: çömel, kandile doğru sıçra — gölge büyür ve perdeyi yutar
  const cr = kf(t, [[5.8, 0], [6.25, 1, 'out'], [6.4, 1]]);
  B.body.sy -= cr * 0.18; B.body.sx += cr * 0.12; B.zif.y += cr * 10;
  if (t > 6.4) {
    const u = t - 6.4, g = Math.pow(u / 1.5, 2.2) * 12 + u * 0.6;
    B.zif.sx = B.zif.sy = 1 + g; B.zif.y += -u * 30; B.body.sy += Math.min(0.2, u * 0.4); B.body.sx -= Math.min(0.1, u * 0.2);
    k.blur = Math.min(1, u / 1.4);
    // gölge kandilin içinden geçti: ışık geri gelir
    if (u > 1.75) { for (const id of ['feet', 'body', 'tuft', 'pupils', 'lidL', 'lidR']) S.hide[id] = 1; k.blur = 0; }
  } else k.blur = 0;
}
const SF_ZIF = {
  key: 'zifir', name: 'Zifir', line: 'Perdedeki gölge sana göz kırptı… ve ışığa doğru atıldı. Belki de baştan beri o’ydu.', dur: 9.0, fitW: 2.9, fitH: 3.3,
  bones: {
    zif: [null, 0, 0, 0, -100], body: ['zif', 0, 110, 0, -120], pupil: ['body', 0, -16, 0, 0], lidL: ['body', -38, -52, -38, 10], lidR: ['body', 38, -52, 38, 10],
    footL: ['zif', -52, 124, -52, 140], footR: ['zif', 52, 124, 52, 140], tuft: ['body', 0, -116, 20, -152],
  },
  k0: { blur: 0 },
  layers: [
    { id: 'feet', bind: ['footL', 'footR'], soft: 30, pts: [sfEllipse(-54, 126, 36, 19, -0.08), sfEllipse(54, 126, 36, 19, 0.08)] },
    { id: 'body', bind: ['body'], holeSub: [1, 2], d: 'M 0 -122 C 70 -122 124 -72 124 -2 C 124 64 76 116 0 116 C -76 116 -124 64 -124 -2 C -124 -72 -70 -122 0 -122 Z M -38 -52 C -24 -52 -15 -38 -15 -18 C -15 2 -24 14 -38 14 C -52 14 -61 2 -61 -18 C -61 -38 -52 -52 -38 -52 Z M 38 -52 C 52 -52 61 -38 61 -18 C 61 2 52 14 38 14 C 24 14 15 2 15 -18 C 15 -38 24 -52 38 -52 Z' },
    { id: 'tuft', bind: ['tuft'], pts: [sfStroke(sfCurve(-2, -112, 2, -140, 18, -160, 30, -150, 12).concat(sfCurve(30, -150, 38, -142, 28, -134, 20, -140, 6).slice(2)), 12, 6, 0, 1)] },
    { id: 'pupils', bind: ['pupil'], pts: [sfEllipse(-33, -12, 12, 14), sfEllipse(43, -12, 12, 14)] },
    { id: 'lidL', prop: 1, bind: ['lidL'], pts: [sfEllipse(-38, -18, 26, 36)] },
    { id: 'lidR', prop: 1, bind: ['lidR'], pts: [sfEllipse(38, -18, 26, 36)] },
  ],
  perform: SF_ZIF_PERFORM,
  events: [[0.7, 'blink'], [2.55, 'hop'], [3.1, 'hop'], [3.95, 'wink'], [4.6, 'dance'], [6.4, 'leap']],
};

const SF_DEFS = [SF_BIRD, SF_CAT, null /* tavşan: 87_sfwild.js */, SF_WHALE, SF_ELE, SF_ZIF];
