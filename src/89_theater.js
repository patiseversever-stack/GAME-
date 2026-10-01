
/* =====================================================================
   GÖLGE TİYATROSU — mini oyun
   Kandil ışığında, perdenin önünde süzülen soyut bir cam-pirinç heykel.
   Heykeli çevir: doğru açıda parçaların gölgeleri birleşip bir canlıya
   dönüşür — sonra gölge heykelden kopar ve kendi hayatına başlar.
   Parçalar ışık doğrultusunda eğik prizmalardır: gölgeleri perdede tam
   olarak tasarlanan silüeti verir, başka her açıdan anlamsız görünür.
   ===================================================================== */
const stScene = new THREE.Scene();
stScene.background = new THREE.Color('#0b0604');
const stCam = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
const ST_WZ = -5;

/* ---------- 2B şekil yardımcıları ---------- */
const sEll = (cx, cy, rx, ry, rot = 0, n = 30) => { const p = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); } return p; };
const sBez = (p0, p1, p2, n = 14) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; o.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]); } return o; };
// çizgi boyunca kalınlığı değişen bant (kuyruk, hortum)
const sBand = (line, w0, w1) => {
  const L = [], R = [], n = line.length;
  for (let i = 0; i < n; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (n - 1)) / 2;
    L.push([line[i][0] - (dy / l) * w, line[i][1] + (dx / l) * w]); R.push([line[i][0] + (dy / l) * w, line[i][1] - (dx / l) * w]);
  }
  return L.concat(R.reverse());
};
function sInPoly(p, poly) { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; }

/* ---------- figürler: parçalar (perde koordinatları) + canlanma ----------
   her parça: { pts, holes?, pv: dönme noktası }  · anim(t, P, F): P[i] = {r,x,y,sx,sy}, F = {x,y,r,s,a} */
const ST_FIGS = [
  {
    key: 'kus', name: 'Kuş', line: 'Gölgesi bile özgürdü — kanatlarını açtı ve perdeden uçup gitti.', dur: 4.6,
    parts: [
      { pts: sEll(0, 0, 1.05, 0.36, 0.08) },
      { pts: sEll(1.02, 0.24, 0.32, 0.28) },
      { pts: [[1.3, 0.3], [1.66, 0.19], [1.31, 0.11]] },
      { pts: [[-0.86, 0.1], [-1.72, 0.48], [-1.52, 0.03], [-1.78, -0.36], [-0.86, -0.13]], pv: [-0.86, 0] },
      { pts: [[0.42, 0.18], [0.24, 0.85], [-0.12, 1.38], [-0.72, 1.72], [-0.52, 1.22], [-0.36, 0.72], [-0.24, 0.24]], pv: [0.1, 0.22] },
      { pts: [[0.32, 0.16], [0.52, 0.66], [0.5, 1.22], [0.22, 0.92], [0.06, 0.32]], pv: [0.2, 0.2] },
    ],
    anim(t, P, F) {
      const fl = t > 0.6 ? Math.sin((t - 0.6) * 11) : 0;
      P[4].r = fl * 0.95 - (t > 0.6 ? 0.25 : 0); P[5].r = fl * 0.7 - 0.1; P[3].r = Math.sin(t * 4) * 0.12;
      P[1].r = Math.sin(t * 2.2) * 0.06;
      const k = Math.max(0, t - 1.6); F.x = k * k * 1.6 + k * 0.6; F.y = Math.sin(t * 5.5) * 0.06 * (t > 0.6 ? 1 : 0) + k * 1.1; F.r = Math.min(0.28, k * 0.2); F.s = 1 - k * 0.08;
    },
  },
  {
    key: 'kedi', name: 'Kedi', line: 'Tembelce gerindi, kuyruğunu salladı… ve sahneden atladı.', dur: 4.8,
    parts: [
      { pts: sEll(-0.25, -0.5, 0.92, 0.62) },
      { pts: sEll(0.32, 0.1, 0.46, 0.62, -0.25) },
      { pts: sEll(0.58, 0.88, 0.42, 0.37), pv: [0.45, 0.55] },
      { pts: [[0.3, 1.1], [0.3, 1.58], [0.56, 1.22]], pv: [0.45, 0.55] },
      { pts: [[0.64, 1.24], [0.92, 1.6], [0.9, 1.08]], pv: [0.45, 0.55] },
      { pts: sBand(sBez([-1.0, -0.82], [-1.95, -0.6], [-1.55, 0.55], 18), 0.24, 0.12), pv: [-1.0, -0.82] },
      { pts: sEll(0.62, -1.06, 0.3, 0.12) },
    ],
    anim(t, P, F) {
      P[5].r = Math.sin(t * 3.2) * 0.32; P[2].r = P[3].r = P[4].r = Math.sin(t * 1.7) * 0.14;
      P[3].r += t > 1 && t < 1.25 ? 0.25 : 0;
      const k = Math.max(0, t - 2.4), j = Math.min(1, k / 0.8);
      F.x = k * 3.2; F.y = Math.sin(j * PI) * 1.3; F.r = k > 0 ? -Math.sin(j * PI) * 0.25 : 0;
      F.sy = k > 0 ? 1 : 1 + Math.sin(t * 2) * 0.03;
    },
  },
  {
    key: 'balina', name: 'Balina', line: 'Perdenin içinden geçen bir okyanus — fıskiyesiyle selam verdi.', dur: 5.2,
    parts: [
      { pts: sEll(0.45, 0, 1.28, 0.74) },
      { pts: [[-0.55, 0.52], [-1.72, 0.14], [-1.72, -0.12], [-0.55, -0.48]] },
      { pts: [[-1.62, 0.08], [-2.34, 0.62], [-2.08, 0.0], [-2.34, -0.52], [-1.62, -0.08]], pv: [-1.65, 0] },
      { pts: [[0.32, -0.45], [-0.26, -1.08], [0.02, -0.38]], pv: [0.2, -0.45] },
      { pts: [[0.95, 0.68], [0.82, 1.15], [0.6, 1.45], [0.95, 1.22], [1.08, 1.55], [1.12, 1.18], [1.42, 1.42], [1.2, 1.1], [1.06, 0.66]], pv: [1.0, 0.68] },
    ],
    anim(t, P, F) {
      P[2].r = Math.sin(t * 2.6) * 0.45; P[3].r = Math.sin(t * 2.6 + 1) * 0.2;
      const sp = clamp01((t - 0.8) / 0.4) * (1 - clamp01((t - 2.2) / 0.5)); P[4].sx = P[4].sy = Math.max(0.001, sp);
      F.y = Math.sin(t * 1.3) * 0.18; F.r = Math.sin(t * 1.3) * 0.05;
      const k = Math.max(0, t - 2.6); F.x = -k * k * 0.9 - k * 1.2;
    },
  },
  {
    key: 'tavsan', name: 'Tavşan', line: 'Kulakları seğirdi, burnu kıpırdadı — üç sekişte gözden kayboldu.', dur: 4.6,
    parts: [
      { pts: sEll(-0.2, -0.42, 0.88, 0.66) },
      { pts: sEll(0.58, 0.32, 0.43, 0.37) },
      { pts: sEll(0.36, 1.12, 0.14, 0.56, -0.28), pv: [0.42, 0.62] },
      { pts: sEll(0.66, 1.08, 0.13, 0.52, 0.18), pv: [0.62, 0.62] },
      { pts: sEll(-1.05, -0.22, 0.2, 0.2) },
      { pts: sEll(0.08, -1.0, 0.58, 0.13) },
      { pts: sEll(0.52, -0.82, 0.12, 0.26) },
    ],
    anim(t, P, F) {
      P[2].r = t > 0.7 && t < 1.0 ? 0.35 : Math.sin(t * 2) * 0.05; P[3].r = t > 1.2 && t < 1.45 ? -0.3 : Math.sin(t * 2.3) * 0.05;
      const k = Math.max(0, t - 2.0), hop = (k * 1.6) % 1;
      F.x = k * 2.2; F.y = k > 0 ? Math.sin(hop * PI) * 0.75 : 0; F.sy = k > 0 ? 1 + Math.sin(hop * PI) * 0.12 - (hop < 0.08 ? 0.15 : 0) : 1;
    },
  },
  {
    key: 'fil', name: 'Fil', line: 'Hortumunu kaldırdı, perdeyi selamladı — ağır ağır yürüyüp gitti.', dur: 5.4,
    parts: [
      { pts: sEll(-0.3, 0.05, 1.2, 0.8) },
      { pts: sEll(0.82, 0.3, 0.56, 0.56) },
      { pts: sEll(0.5, 0.3, 0.44, 0.58, 0.18), pv: [0.62, 0.55] },
      { pts: sBand(sBez([1.18, 0.1], [1.55, -0.4], [1.42, -1.0], 16), 0.36, 0.14), pv: [1.18, 0.1] },
      { pts: [[-1.18, -0.45], [-0.78, -0.45], [-0.8, -1.32], [-1.16, -1.32]], pv: [-0.97, -0.5] },
      { pts: [[0.12, -0.45], [0.52, -0.45], [0.5, -1.32], [0.14, -1.32]], pv: [0.32, -0.5] },
      { pts: [[-0.82, -0.4], [-0.5, -0.4], [-0.52, -1.22], [-0.8, -1.22]], pv: [-0.66, -0.45] },
      { pts: sBand([[-1.46, 0.25], [-1.62, -0.2], [-1.6, -0.55]], 0.08, 0.06), pv: [-1.46, 0.25] },
      { pts: [[1.12, -0.1], [1.56, -0.36], [1.14, -0.26]] },
    ],
    anim(t, P, F) {
      const up = clamp01(t / 1.1) * (1 - clamp01((t - 2.1) / 0.6));
      P[3].r = up * 1.25 + Math.sin(t * 3) * 0.06; P[2].r = Math.sin(t * 2.4) * 0.1; P[7].r = Math.sin(t * 3.5) * 0.25;
      const k = Math.max(0, t - 2.5), w = Math.sin(k * 5);
      P[4].r = w * 0.18; P[5].r = -w * 0.18; P[6].r = -w * 0.15;
      F.x = k * 1.25; F.y = Math.abs(Math.sin(k * 5)) * 0.05;
    },
  },
  {
    key: 'zifir', name: 'Zifir', line: 'Perdedeki gölge sana göz kırptı. Belki de baştan beri o’ydu.', dur: 5.0,
    parts: [
      { pts: sEll(0, 0.12, 1.0, 1.06, 0, 40), holes: [sEll(-0.34, 0.36, 0.13, 0.2, 0, 18), sEll(0.34, 0.36, 0.13, 0.2, 0, 18)] },
      { pts: sEll(-0.38, -0.97, 0.3, 0.14), pv: [-0.38, -0.9] },
      { pts: sEll(0.38, -0.97, 0.3, 0.14), pv: [0.38, -0.9] },
      { pts: [[-0.12, 1.12], [0.06, 1.5], [0.18, 1.12]], pv: [0.03, 1.15] },
      { pts: sEll(-0.34, 0.36, 0.15, 0.22, 0, 14), pv: [-0.34, 0.58], lid: true },
      { pts: sEll(0.34, 0.36, 0.15, 0.22, 0, 14), pv: [0.34, 0.58], lid: true },
    ],
    anim(t, P, F) {
      const blink = (t > 0.9 && t < 1.05) || (t > 2.2 && t < 2.32) ? 1 : 0, wink = t > 2.7 && t < 3.15 ? 1 : 0;
      P[4].sy = Math.max(0.001, blink); P[5].sy = Math.max(0.001, Math.max(blink, wink));
      P[3].r = Math.sin(t * 4) * 0.3;
      const b = Math.abs(Math.sin(t * 3.2)); F.y = b * 0.22 * (t < 3.3 ? 1 : 0); F.sy = 1 - (b < 0.15 ? 0.08 : 0);
      P[1].y = P[2].y = -F.y * 0.6;
      const k = Math.max(0, t - 3.4); F.y += k * k * 3.2; F.s = Math.max(0.05, 1 - k * 0.55); F.r = k * 2.2;
    },
  },
];

/* ---------- eğik prizma: perde silüetini ışık doğrultusunda uzatır ---------- */
function stPrism(L, C, WC, pts, holes, d0, d1) {
  const contour = pts.map(([x, y]) => new THREE.Vector2(x, y)), hv = (holes || []).map((h) => h.map(([x, y]) => new THREE.Vector2(x, y)));
  if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
  hv.forEach((h) => { if (!THREE.ShapeUtils.isClockWise(h)) h.reverse(); });
  const tris = THREE.ShapeUtils.triangulateShape(contour, hv), all = contour.concat(...hv);
  const W = (v, d) => { const s = (C.z + d - ST_WZ) / L.z; return [WC.x + v.x + L.x * s - C.x, WC.y + v.y + L.y * s - C.y, ST_WZ + L.z * s - C.z]; };
  const pos = [];
  for (const t of tris) { const a = all[t[0]], b = all[t[1]], c = all[t[2]]; pos.push(...W(a, d1), ...W(b, d1), ...W(c, d1), ...W(a, d0), ...W(c, d0), ...W(b, d0)); }
  const ring = (r) => { for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], A0 = W(a, d0), B0 = W(b, d0), A1 = W(a, d1), B1 = W(b, d1); pos.push(...A0, ...B0, ...B1, ...A0, ...B1, ...A1); } };
  ring(contour); hv.forEach(ring);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

/* ---------- sahne: perde, çerçeve, kadife perdeler, sahne tahtası ---------- */
function stParchment() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576; const x = c.getContext('2d'), rng = new RNG(77);
  const g = x.createRadialGradient(512, 300, 60, 512, 288, 620); g.addColorStop(0, '#f6e4be'); g.addColorStop(0.7, '#e7c995'); g.addColorStop(1, '#b98d5a');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 576);
  for (let i = 0; i < 2600; i++) { x.strokeStyle = `rgba(${rng.chance(0.5) ? '120,80,40' : '255,245,220'},${rng.range(0.03, 0.09)})`; x.lineWidth = rng.range(0.5, 1.6); const px = rng.range(0, 1024), py = rng.range(0, 576), a = rng.range(-0.4, 0.4), l = rng.range(4, 26); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  for (let i = 0; i < 26; i++) { const px = rng.range(0, 1024), py = rng.range(0, 576), r = rng.range(14, 60); const s = x.createRadialGradient(px, py, 0, px, py, r); s.addColorStop(0, 'rgba(150,100,50,0.08)'); s.addColorStop(1, 'rgba(150,100,50,0)'); x.fillStyle = s; x.fillRect(px - r, py - r, r * 2, r * 2); }
  // kenar süslemesi: lale ve rumi
  x.strokeStyle = 'rgba(120,60,30,0.55)'; x.lineWidth = 3; x.strokeRect(26, 22, 972, 532); x.lineWidth = 1.2; x.strokeRect(36, 32, 952, 512);
  const tulip = (cx, cy, s, rot) => { x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(s, s); x.fillStyle = 'rgba(150,45,40,0.5)'; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-10, -8, -9, -24, -4, -30); x.lineTo(0, -20); x.lineTo(4, -30); x.bezierCurveTo(9, -24, 10, -8, 0, 0); x.fill(); x.strokeStyle = 'rgba(60,90,60,0.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(3, 12, 0, 22); x.stroke(); x.restore(); };
  for (let i = 0; i < 18; i++) { tulip(70 + i * 52, 54, 0.7, 0); tulip(70 + i * 52, 522, 0.7, PI); }
  for (let i = 0; i < 9; i++) { tulip(56, 96 + i * 46, 0.6, -PI / 2); tulip(968, 96 + i * 46, 0.6, PI / 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function stPlanks() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'), rng = new RNG(5);
  for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(24, 40%, ${rng.range(14, 22)}%)`; x.fillRect(0, i * 32, 512, 32); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, i * 32, 512, 2); for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(255,220,180,${rng.range(0.02, 0.06)})`; x.fillRect(rng.range(0, 512), i * 32 + rng.range(3, 30), rng.range(20, 120), 1); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t;
}
const ST_COLS = ['#c8453a', '#e0a23a', '#2f8a94', '#7a4fa0', '#d8c6a0', '#3a62b0', '#c86a8a', '#5a9a5a'];

const Theater = {
  inited: false, active: false, idx: 0, q: new THREE.Quaternion(), w: new THREE.Vector2(), drag: null, solved: false, t: 0, revealT: -1, near: 0, hintT: 0, from: 'title',
  init() {
    if (this.inited) return; this.inited = true;
    this.hemi = new THREE.HemisphereLight(0xffd9a8, 0x2a160c, 0.42); stScene.add(this.hemi);
    this.light = new THREE.DirectionalLight(0xffc98a, 3.1); this.light.castShadow = true;
    Object.assign(this.light.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 70 }); this.light.shadow.camera.updateProjectionMatrix();
    this.light.shadow.mapSize.set(2048, 2048); this.light.shadow.bias = -0.0006; this.light.shadow.normalBias = 0.02;
    stScene.add(this.light, this.light.target);
    // perde
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(17, 9.5), new THREE.MeshStandardMaterial({ map: stParchment(), roughness: 0.95, metalness: 0 }));
    this.wall.position.set(-1, 3.6, ST_WZ); this.wall.receiveShadow = true; stScene.add(this.wall);
    // ceviz çerçeve ve altın şerit
    const wood = new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.6, metalness: 0.05 }), gold = new THREE.MeshStandardMaterial({ color: 0xd9a040, roughness: 0.3, metalness: 0.9 });
    const fr = [[-1, 8.55, 18.2, 0.6], [-1, -1.25, 18.2, 0.5]];
    for (const [x, y, w, h] of fr) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), wood); m.position.set(x, y, ST_WZ + 0.2); stScene.add(m); const g2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.55), gold); g2.position.set(x, y - h / 2 + 0.04, ST_WZ + 0.22); stScene.add(g2); }
    for (const x of [-9.85, 7.85]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10.3, 0.5), wood); m.position.set(x, 3.65, ST_WZ + 0.2); stScene.add(m); }
    // kadife perdeler
    const vel = new THREE.MeshPhysicalMaterial({ color: 0x7a1424, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color(0xff8a8a), sheenRoughness: 0.5, side: THREE.DoubleSide });
    const curtain = (w, h) => { const g = new THREE.PlaneGeometry(w, h, 36, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 5.2) * 0.16 + Math.sin(x * 11) * 0.04); } g.computeVertexNormals(); return g; };
    this.curL = new THREE.Mesh(curtain(3.2, 10), vel); this.curL.position.set(-9.0, 3.6, ST_WZ + 0.7); stScene.add(this.curL);
    this.curR = new THREE.Mesh(curtain(3.2, 10), vel); this.curR.position.set(7.0, 3.6, ST_WZ + 0.7); stScene.add(this.curR);
    const val = new THREE.Mesh(curtain(18.5, 1.3), vel); val.position.set(-1, 8.2, ST_WZ + 0.75); stScene.add(val);
    for (const c of [this.curL, this.curR]) c.castShadow = false;
    // sahne tahtası
    const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 14), new THREE.MeshStandardMaterial({ map: stPlanks(), roughness: 0.7 })); floor.position.set(-1, -1.0, 1.5); floor.receiveShadow = true; stScene.add(floor);
    // havadaki toz
    const dp = [], dc = [], dt = [], ds = [];
    for (let i = 0; i < 260; i++) { dp.push(rngF(-7, 5), rngF(-0.5, 8), rngF(-4.5, 6)); dc.push(1.0, 0.75, 0.45); dt.push(Math.random()); ds.push(0.03 + Math.random() * 0.04); }
    this.dust = glintPoints(dp, dc, dt, ds, 0, 0.6); stScene.add(this.dust);
    // heykel kökü, gölge-mürekkep grubu, hedef silüet hayaleti
    this.root = new THREE.Group(); stScene.add(this.root);
    this.ink = new THREE.Group(); stScene.add(this.ink);
    this.ghost = new THREE.Group(); stScene.add(this.ghost);
    this.buildDom();
  },
  layout() {
    const portrait = innerWidth / innerHeight < 0.9;
    this.L = portrait ? new THREE.Vector3(0.12, 0.52, 0.85).normalize() : new THREE.Vector3(0.55, 0.12, 0.83).normalize();
    this.C = portrait ? new THREE.Vector3(0.35, 4.35, 0) : new THREE.Vector3(1.0, 2.2, 0);
    this.WC = this.C.clone().addScaledVector(this.L, -(this.C.z - ST_WZ) / this.L.z);
    this.camP = portrait ? new THREE.Vector3(0.2, 3.3, 14.6) : new THREE.Vector3(0.4, 2.6, 10.6);
    this.camT = portrait ? new THREE.Vector3(0.0, 2.75, -2.2) : new THREE.Vector3(-0.9, 1.9, -2.2);
    this.portrait = portrait;
  },
  /* ----- bir perdeyi kur ----- */
  build(i, keepQ) {
    this.layout();
    for (const g of [this.root, this.ink, this.ghost]) { while (g.children.length) { const o = g.children.pop(); o.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material && !m.material.userData.keep) m.material.dispose(); }); } }
    const F = ST_FIGS[i], rng = new RNG(1000 + i * 97 + (keepQ ? 0 : (Math.random() * 1000) | 0)), L = this.L, C = this.C, WC = this.WC;
    this.fig = F; this.idx = i; this.solved = false; this.revealT = -1; this.near = 0; this.parts = []; this.cardShown = false; this.hintT = 0;
    this.root.position.copy(C); this.light.position.copy(C).addScaledVector(L, 30); this.light.target.position.copy(C).lerp(WC, 0.5);
    const brassM = () => new THREE.MeshStandardMaterial({ color: 0xc8954a, roughness: 0.3, metalness: 0.9 });
    const goldLine = () => new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.55 });
    const union = F.parts.filter((p) => !p.lid);
    const depths = union.map((_, k) => lerp(-1.25, 1.25, (k + 0.5) / union.length) + rng.range(-0.25, 0.25));
    for (let k = depths.length - 1; k > 0; k--) { const j = rng.int(0, k); [depths[k], depths[j]] = [depths[j], depths[k]]; }
    union.forEach((p, k) => {
      const th = rng.range(0.1, 0.26), d0 = depths[k] - th / 2, d1 = depths[k] + th / 2;
      const g = stPrism(L, C, WC, p.pts, p.holes, d0, d1);
      const col = new THREE.Color(ST_COLS[(k + i * 3) % ST_COLS.length]);
      const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.38, metalness: 0.08, clearcoat: 0.9, clearcoatRoughness: 0.18, emissive: col.clone().multiplyScalar(0.08), transparent: true, opacity: 1 });
      const pg = new THREE.Group(), m = new THREE.Mesh(g, mat); m.castShadow = true; pg.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), goldLine()); pg.add(e);
      // ışık doğrultusunda pirinç şiş: gölgesi bir noktaya düşer
      let anc = null; for (let q = 0; q < 60 && !anc; q++) { const cx = p.pts.reduce((a, v) => a + v[0], 0) / p.pts.length + rng.range(-0.15, 0.15), cy = p.pts.reduce((a, v) => a + v[1], 0) / p.pts.length + rng.range(-0.15, 0.15); if (sInPoly([cx, cy], p.pts) && !(p.holes || []).some((h) => sInPoly([cx, cy], h))) anc = [cx, cy]; }
      if (anc) {
        const len = (th + 0.55) / L.z, rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 6), brassM()); const s = (C.z + depths[k] - ST_WZ) / L.z;
        const mid = new THREE.Vector3(WC.x + anc[0] + L.x * s - C.x, WC.y + anc[1] + L.y * s - C.y, ST_WZ + L.z * s - C.z);
        for (const e2 of [-1, 1]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), brassM()); cap.position.copy(mid).addScaledVector(L, (e2 * len) / 2); cap.castShadow = true; pg.add(cap); }
        rod.position.copy(mid); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), L); rod.castShadow = true; pg.add(rod);
      }
      pg.userData = { ph: rng.range(0, TAU), amp: rng.range(0.12, 0.3), dir: new THREE.Vector3(rng.range(-1, 1), rng.range(-0.2, 1), rng.range(-1, 1)).normalize() };
      this.root.add(pg); this.parts.push(pg);
    });
    // süs parçaları: gölgeleri silüetin içine düşer
    const inside = (x, y) => union.some((p) => sInPoly([x, y], p.pts) && !(p.holes || []).some((h) => sInPoly([x, y], h)));
    const nDec = 3 + i * 2;
    for (let k = 0, tries = 0; k < nDec && tries < 400; tries++) {
      const cx = rng.range(-2, 2), cy = rng.range(-1.4, 1.6), r = rng.range(0.08, 0.2);
      let ok = inside(cx, cy); for (let a = 0; a < 10 && ok; a++) ok = inside(cx + Math.cos((a / 10) * TAU) * r * 1.2, cy + Math.sin((a / 10) * TAU) * r * 1.2);
      if (!ok) continue;
      const sides = rng.int(3, 6), poly = []; const r0 = rng.range(0, TAU); for (let s = 0; s < sides; s++) poly.push([cx + Math.cos(r0 + (s / sides) * TAU) * r, cy + Math.sin(r0 + (s / sides) * TAU) * r]);
      const d = rng.range(-1.6, 1.6), g = stPrism(L, C, WC, poly, null, d - 0.05, d + 0.05);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: rng.chance(0.5) ? 0xd9a040 : 0xf2e6d0, roughness: 0.3, metalness: rng.chance(0.5) ? 0.9 : 0.1, transparent: true }));
      m.castShadow = true; const pg = new THREE.Group(); pg.add(m); pg.userData = { ph: rng.range(0, TAU), amp: rng.range(0.1, 0.35), dir: new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize() };
      this.root.add(pg); this.parts.push(pg); k++;
    }
    // canlanacak mürekkep silüeti (perde üzerinde, başta gizli)
    this.inkMat = new THREE.MeshBasicMaterial({ color: 0x5a4430, transparent: true, opacity: 1, depthWrite: false });
    this.inkParts = [];
    this.ink.position.set(WC.x, WC.y, ST_WZ + 0.012); this.ink.visible = false;
    this.inkFig = new THREE.Group(); this.ink.add(this.inkFig);
    F.parts.forEach((p) => {
      const sh = new THREE.Shape(p.pts.map(([x, y]) => new THREE.Vector2(x, y)));
      for (const h of p.holes || []) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
      const pv = p.pv || [0, 0], pg = new THREE.Group(); pg.position.set(pv[0], pv[1], p.lid ? 0.002 : 0);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6), this.inkMat); m.position.set(-pv[0], -pv[1], 0); pg.add(m);
      if (p.lid) pg.scale.y = 0.001;
      this.inkFig.add(pg); this.inkParts.push({ pg, pv });
    });
    // hedef hayaleti (yaklaşınca belirir)
    this.ghostMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.ghost.position.set(WC.x, WC.y, ST_WZ + 0.02);
    for (const p of union) { const g = new THREE.BufferGeometry().setFromPoints(p.pts.map(([x, y]) => new THREE.Vector3(x, y, 0))); this.ghost.add(new THREE.LineLoop(g, this.ghostMat)); }
    // başlangıç yönelimi: anlamsız bir açı
    if (!keepQ) {
      const yaw = rng.sign() * rng.range(0.9, 2.3), pitch = rng.sign() * rng.range(0.35, 0.75), roll = rng.range(-0.4, 0.4);
      this.q.setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
      this.assembleT = 0;
    }
    this.w.set(0, 0);
    this.updateDom();
  },
  /* ----- arayüz ----- */
  buildDom() {
    const dots = $('#thDots'); dots.innerHTML = '';
    this.dots = ST_FIGS.map(() => { const d = document.createElement('i'); dots.appendChild(d); return d; });
  },
  updateDom() {
    const sv = Save.data.theater || [];
    this.dots.forEach((d, k) => { d.classList.toggle('on', k === this.idx); d.classList.toggle('ok', sv.includes(k)); });
    $('#thAct').textContent = `${['I', 'II', 'III', 'IV', 'V', 'VI'][this.idx]}. perde`;
    $('#theater').classList.remove('solved'); $('#thMsg').classList.add('on');
    $('#thMsg').innerHTML = this.idx === 0 ? 'Heykeli parmağınla <em>çevir</em>.<br>Doğru açıda gölge bir canlıya dönüşür.' : 'Gölgeyi <em>dinle</em> — ısındıkça perde parlar.';
  },
  open(from) {
    this.init(); this.from = from || 'title'; this.active = true;
    const sv = Save.data.theater || []; let i = 0; while (sv.includes(i) && i < ST_FIGS.length - 1) i++;
    this.build(i); audio.setChapter(8); this.t = 0; this.camIn = 0;
    G.state = 'theater'; UI.hideAll(); UI.hud(false); UI.show('theater');
    audio.whoosh(true, 1.0, 0.06); audio.theaterOpen();
  },
  close() {
    this.active = false; audio.theaterTone(0); audio.setChapter(G.lv ? G.lv.spec.ch : 0); UI.hide('theater');
    if (this.from === 'map') openMap();
    else { G.state = 'title'; G.stateT = 99; G.userSun = true; UI.show('title'); }
  },
  next() {
    if (this.idx >= ST_FIGS.length - 1) { this.close(); return; }
    audio.ui(); this.build(this.idx + 1); this.t = 0;
  },
  hint() { if (this.solved) return; this.hintT = 2.8; audio.sprite(1); },
  /* ----- dokunma: sanal küre döndürme ----- */
  down(e) { if (this.solved) return; this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; this.w.set(0, 0); $('#thMsg').classList.remove('on'); },
  move(e) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return;
    const now = performance.now(), dx = e.clientX - d.x, dy = e.clientY - d.y, dt = Math.max(8, now - d.t) / 1000; d.x = e.clientX; d.y = e.clientY; d.t = now;
    const k = 0.0085; this.rot(dx * k, dy * k);
    this.w.set(lerp(this.w.x, (dx * k) / dt, 0.4), lerp(this.w.y, (dy * k) / dt, 0.4));
    audio.theaterCreak(Math.min(1, Math.hypot(dx, dy) * 0.03));
  },
  up(e) { const d = this.drag; if (!d || e.pointerId !== d.id) return; this.drag = null; if (performance.now() - d.t > 80) this.w.set(0, 0); },
  rot(a, b) { const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), b); this.q.premultiply(qy).premultiply(qx).normalize(); },
  angle() { return 2 * Math.acos(Math.min(1, Math.abs(this.q.w))); },
  /* ----- kare ----- */
  update(dtR) {
    if (!this.active) return;
    this.t += dtR; const t = this.t;
    if (!this.drag && !this.solved) { this.rot(this.w.x * dtR, this.w.y * dtR); this.w.multiplyScalar(Math.exp(-dtR * 3.2)); }
    const ang = this.angle();
    // mıknatıs: yakınken kendiliğinden oturur
    if (!this.solved && ang < deg(11) && !this.drag) { this.q.slerp(new THREE.Quaternion(), 1 - Math.exp(-dtR * 7)); this.w.multiplyScalar(0.8); }
    if (!this.solved && this.angle() < deg(1.2)) this.solve();
    this.near = damp(this.near, this.solved ? 0 : clamp01(1 - ang / deg(70)), 5, dtR);
    audio.theaterTone(this.solved ? 0 : this.near);
    this.root.quaternion.copy(this.q);
    // parçalar ışık doğrultusunda nefes alır — gölge değişmez
    const Lloc = this.L;
    for (const pg of this.parts) {
      const u = pg.userData;
      if (this.revealT >= 0) {
        const k = Math.max(0, this.revealT - 0.75); pg.position.copy(Lloc).multiplyScalar(Math.sin(t * 0.8 + u.ph) * u.amp).addScaledVector(u.dir, k * k * 1.2);
        pg.rotation.set(k * u.ph * 0.4, k * u.amp * 2, 0); const op = clamp01(1 - (k - 0.8) / 1.6); pg.traverse((m) => { if (m.material && (m.isMesh || m.isLineSegments)) { m.material.transparent = true; m.material.opacity = m.isLineSegments ? op * 0.55 : op; } });
      } else {
        const asm = clamp01(this.assembleT / 1.2), e = 1 - Ease.outCubic(asm);
        pg.position.copy(Lloc).multiplyScalar(Math.sin(t * 0.8 + u.ph) * u.amp).addScaledVector(u.dir, e * 6);
        pg.rotation.set(e * u.ph, e * u.amp * 6, 0);
      }
    }
    this.assembleT = (this.assembleT || 0) + dtR;
    // hayalet çizgi
    this.hintT = Math.max(0, this.hintT - dtR);
    this.ghostMat.opacity = this.solved ? 0 : Math.max(smoothstep(0.62, 0.9, this.near) * 0.45, Math.min(1, this.hintT) * 0.6);
    // açılış
    if (this.revealT >= 0) this.reveal(dtR);
    // kandil titremesi
    this.light.intensity = 3.1 * (1 + Math.sin(t * 13) * 0.012 + Math.sin(t * 7.3) * 0.015);
    // kamera
    this.camIn = Math.min(1, (this.camIn || 0) + dtR / 2.2);
    const e = Ease.outCubic(this.camIn), P = this.camP.clone(), T = this.camT.clone();
    P.z += (1 - e) * 6; P.y += (1 - e) * 2; P.x += Math.sin(t * 0.17) * 0.25; P.y += Math.sin(t * 0.23) * 0.12;
    if (this.revealT >= 0) { const k = Ease.inOutCubic(clamp01(this.revealT / 2.4)); P.lerp(this.WC.clone().add(new THREE.Vector3(0.6, 0.5, 8.6)), k * 0.55); T.lerp(this.WC, k * 0.6); }
    const sh = G.trauma * G.trauma; P.x += Math.sin(t * 41) * sh * 0.15; P.y += Math.sin(t * 37) * sh * 0.12;
    stCam.position.copy(P); stCam.lookAt(T);
    this.curL.position.x = -9.0 + Math.sin(t * 0.5) * 0.04; this.curR.position.x = 7.0 + Math.sin(t * 0.47 + 1) * 0.04;
  },
  solve() {
    this.solved = true; this.q.identity(); this.root.quaternion.identity(); this.w.set(0, 0); this.drag = null;
    this.revealT = 0; this.inkSwap = false; $('#thMsg').classList.remove('on');
    audio.theaterSolve(); haptic([20, 40, 20]); G.flash = 0.35; G.flashCol.set(1.0, 0.8, 0.5); G.trauma = Math.max(G.trauma, 0.3);
    const sv = Save.data.theater || (Save.data.theater = []); if (!sv.includes(this.idx)) { sv.push(this.idx); Save.save(); }
  },
  reveal(dtR) {
    this.revealT += dtR; const r = this.revealT;
    // 0.55 sn: gölge mürekkebe dönüşür (gerçek gölge kapanır, canlı silüet belirir)
    if (r > 0.55 && !this.inkSwap) {
      this.inkSwap = true; this.ink.visible = true;
      for (const pg of this.parts) pg.traverse((m) => { if (m.isMesh) m.castShadow = false; });
      audio.theaterAlive(this.fig.key);
    }
    if (this.inkSwap) {
      const k = clamp01((r - 0.55) / 0.6); this.inkMat.color.setRGB(lerp(0.35, 0.05, k), lerp(0.27, 0.03, k), lerp(0.19, 0.05, k));
      const at = Math.max(0, r - 1.1), P = this.inkParts.map(() => ({ r: 0, x: 0, y: 0, sx: 1, sy: 1 })), F = { x: 0, y: 0, r: 0, s: 1, sy: 1, a: 1 };
      this.fig.anim(at, P, F);
      this.inkParts.forEach((ip, k2) => { const p = P[k2]; ip.pg.rotation.z = p.r; ip.pg.position.set(ip.pv[0] + p.x, ip.pv[1] + p.y, ip.pg.position.z); ip.pg.scale.set(p.sx, this.fig.parts[k2].lid ? p.sy : p.sy, 1); });
      this.inkFig.position.set(F.x, F.y, 0); this.inkFig.rotation.z = F.r; this.inkFig.scale.set(F.s, F.s * (F.sy || 1), 1);
      if (at > this.fig.dur && !this.cardShown) { this.cardShown = true; this.showCard(); }
    }
  },
  showCard() {
    $('#thName').textContent = this.fig.name; $('#thLine').textContent = this.fig.line;
    $('#thNext').textContent = this.idx >= ST_FIGS.length - 1 ? 'Perdeyi kapat' : 'Sonraki perde';
    $('#theater').classList.add('solved'); audio.star(2, true);
  },
  apply() {
    const pu = post.u;
    pu.uExposure.value = 1.0 + this.near * 0.08; pu.uBloomAdd.value = 0.45 + this.near * 0.25; pu.uRays.value = 0; pu.uSunVis.value = 0; pu.uNight.value = 0;
    pu.uDesat.value = 0; pu.uCA.value = 0; pu.uDanger.value = 0; pu.uHeat.value.z = 0; pu.uVignette.value = 0.75;
    pu.uLift.value.set(0.03, 0.015, 0.0); pu.uGamma.value.set(1, 1, 1); pu.uGain.value.set(1.05, 1.0, 0.92); pu.uSat.value = 1.08; pu.uContrast.value = 1.08;
    pu.uTilt.value = 0.35; pu.uTiltC.value = 0.5; pu.uTiltW.value = 0.32;
    mapPx.value = renderer.domElement.height / (2 * Math.tan(deg(stCam.fov / 2)));
    renderer.shadowMap.needsUpdate = true;
  },
  resize(w, h) { stCam.aspect = w / h; stCam.updateProjectionMatrix(); if (this.active) { const was = this.portrait; this.layout(); if (was !== this.portrait) this.build(this.idx, true); } },
};
const rngF = (a, b) => a + Math.random() * (b - a);
