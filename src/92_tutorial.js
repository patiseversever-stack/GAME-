
/* =====================================================================
   ÖĞRETİCİ — "Nasıl oynanır?": on bir adımlı, canlı SVG animasyonlu rehber.
   Animasyonlar oyunun gerçek kurallarını küçük bir 2B dioramada simüle
   eder: güneş yayda kayar, gölgeler döner, Zifir ışıkta erir.
   ===================================================================== */
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, a = {}, p = null) => { const e = document.createElementNS(SVGNS, tag); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const sa = (e, a) => { for (const k in a) e.setAttribute(k, a[k]); return e; };
const r2 = (v) => Math.round(v * 100) / 100;
const pulse = (c, a, b, fa = 0.4, fb = 0.4) => smoothstep(a, a + fa, c) * (1 - smoothstep(b - fb, b, c));
const mixHex = (h1, h2, k) => { const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16); const m = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, clamp01(k))); return `rgb(${m(16)},${m(8)},${m(0)})`; };

function tutDefs(svg, id) {
  const d = sv('defs', {}, svg);
  const grad = (tag, gid, attrs, stops) => { const g = sv(tag, Object.assign({ id: id + gid }, attrs), d); for (const [o, c, a = 1] of stops) sv('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g); };
  grad('radialGradient', 'bg', { cx: '50%', cy: '42%', r: '58%' }, [[0, '#8a6ad8', 0.34], [0.55, '#3a2a6a', 0.14], [1, '#140f24', 0]]);
  grad('linearGradient', 'top', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#f3e3ba'], [1, '#d2b583']]);
  grad('linearGradient', 'cliff', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#c29a72'], [0.5, '#8a6452'], [1, '#3a2840', 0]]);
  grad('linearGradient', 'brass', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#8a5a2a'], [0.5, '#f2c46d'], [1, '#8a5a2a']]);
  grad('radialGradient', 'sun', {}, [[0, '#fffbea'], [0.25, '#ffe7a6'], [0.5, '#ffb45a', 0.55], [1, '#ff8a3a', 0]]);
  grad('radialGradient', 'sun2', {}, [[0, '#f2fbff'], [0.28, '#c8ecff'], [0.52, '#7cc4ff', 0.5], [1, '#5aa8ff', 0]]);
  grad('radialGradient', 'rim', { cx: '42%', cy: '40%', r: '62%' }, [[0, '#1a1430'], [0.6, '#0b0814'], [0.88, '#2a1f5a'], [1, '#8b7cff']]);
  grad('linearGradient', 'wall', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#fffaf0'], [0.65, '#f1e8da'], [1, '#c9bcaa']]);
  grad('linearGradient', 'beam', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#fff1c8', 0.0], [0.35, '#ffe2a0', 0.75], [1, '#ffb050', 0.15]]);
  grad('radialGradient', 'portal', {}, [[0, '#34207a'], [0.62, '#140a30'], [0.86, '#7a5cff'], [1, '#c8b4ff', 0.2]]);
  grad('radialGradient', 'drop', { cx: '40%', cy: '35%', r: '70%' }, [[0, '#2a2050'], [0.7, '#0b0814'], [1, '#a090ff']]);
  grad('radialGradient', 'night', { cx: '50%', cy: '52%', r: '50%' }, [[0, '#15104a', 0.95], [0.72, '#120d3a', 0.85], [1, '#0d0a2a', 0]]);
  const fb = sv('filter', { id: id + 'blur', x: '-40%', y: '-40%', width: '180%', height: '180%' }, d); sv('feGaussianBlur', { stdDeviation: 2.2 }, fb);
  const fg = sv('filter', { id: id + 'glow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, d); sv('feGaussianBlur', { stdDeviation: 4, result: 'b' }, fg);
  const m = sv('feMerge', {}, fg); sv('feMergeNode', { in: 'b' }, m); sv('feMergeNode', { in: 'SourceGraphic' }, m);
  const cp = sv('clipPath', { id: id + 'clip' }, d); sv('ellipse', { cx: 200, cy: 256, rx: 158, ry: 62 }, cp);
  return d;
}
// gece/tutulma için genişleyen daire maskesi
function tutCircleClip(svg, id, name) { const d = svg.querySelector('defs'); const cp = sv('clipPath', { id: id + name }, d); return sv('circle', { cx: 0, cy: 0, r: 0 }, cp); }

/* ---------- küçük oyuncular ---------- */
class TPuffs {
  constructor(parent, n = 40) { this.p = []; for (let i = 0; i < n; i++) this.p.push({ c: sv('circle', { r: 0, opacity: 0 }, parent), life: 0 }); }
  spawn(x, y, o) {
    const q = this.p.find((p) => p.life <= 0); if (!q) return;
    Object.assign(q, { x, y, vx: o.vx || 0, vy: o.vy || 0, life: o.life || 1, ml: o.life || 1, r0: o.r0 ?? 3, r1: o.r1 ?? 8, a: o.a ?? 0.6, g: o.g || 0 });
    sa(q.c, { fill: o.fill || '#0c0916' });
  }
  burst(x, y, n, o) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = (o.sp || 40) * (0.4 + Math.random() * 0.8); this.spawn(x, y, Object.assign({}, o, { vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 - (o.up || 0) })); } }
  update(dt) {
    for (const q of this.p) {
      if (q.life <= 0) continue;
      q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      const k = 1 - Math.max(0, q.life) / q.ml;
      sa(q.c, { cx: r2(q.x), cy: r2(q.y), r: r2(lerp(q.r0, q.r1, k)), opacity: q.life <= 0 ? 0 : r2(q.a * Math.min(1, k * 6) * (1 - k)) });
    }
  }
}
class TZif {
  constructor(parent, id) {
    this.g = sv('g', {}, parent);
    this.ring = sv('ellipse', { cx: 0, cy: 2, rx: 22, ry: 8, fill: 'none', stroke: '#c8b8ff', 'stroke-width': 2.4, 'stroke-linecap': 'round', pathLength: 100, 'stroke-dasharray': '100 100', opacity: 0 }, this.g);
    sv('ellipse', { cx: 0, cy: 2, rx: 14, ry: 4.6, fill: 'rgba(8,4,18,.5)' }, this.g);
    this.feet = [-1, 1].map((sx) => sv('ellipse', { cx: sx * 6, cy: 0, rx: 4.4, ry: 2.6, fill: '#07050c' }, this.g));
    this.b = sv('g', {}, this.g);
    this.body = sv('ellipse', { cx: 0, cy: -14, rx: 15, ry: 14.5, fill: `url(#${id}rim)`, stroke: '#9d8cff', 'stroke-width': 1.3, 'stroke-opacity': 0.7 }, this.b);
    sv('ellipse', { cx: -5.5, cy: -22.5, rx: 4.2, ry: 2.3, fill: '#fff', opacity: 0.3 }, this.b);
    this.crack = sv('path', { d: 'M-9 -9 l4 -5 l3 3 l4 -7 M3 -5 l3 -4 l5 2 M-3 -20 l2 3', stroke: '#ffb050', 'stroke-width': 1.7, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, this.b);
    this.eyes = [-1, 1].map((sx) => { const e = sv('g', { transform: `translate(${sx * 5.6} -15)` }, this.b); const w = sv('ellipse', { rx: 3.6, ry: 4.6, fill: '#fffaf0' }, e); const p = sv('circle', { r: 1.9, fill: '#07050c' }, e); return { e, w, p, sx }; });
    this.ringA = 0; this.blink = 0;
  }
  set(x, y, o = {}) {
    const t = o.t || 0, s = o.scale || 1, burn = o.burn || 0, meter = o.meter ?? 1;
    let bob = o.jump || 0, sq = 1;
    if (o.walk) { const ph = (t * 2.3) % 1; bob += Math.sin(ph * PI) * 4.5; sq = 1 + Math.sin(ph * PI) * 0.07; this.feet.forEach((f, i) => sa(f, { cx: (i ? 6 : -6) + Math.sin((ph + i * 0.5) * TAU) * 2.5, cy: -Math.max(0, Math.sin((ph + i * 0.5) * TAU)) * 2 })); }
    else sq = 1 + Math.sin(t * 2.6) * 0.03;
    if (o.squash) sq *= 1 - o.squash;
    const shrink = lerp(0.7, 1, meter) * (o.size ?? 1);
    const sh = burn > 0.05 ? (Math.random() - 0.5) * 1.8 * burn : 0;
    sa(this.g, { transform: `translate(${r2(x)} ${r2(y)}) scale(${r2(s)})`, opacity: o.alpha ?? 1 });
    sa(this.b, { transform: `translate(${r2(sh)} ${r2(-bob)}) scale(${r2(shrink / Math.sqrt(sq))} ${r2(shrink * sq)})` });
    sa(this.crack, { opacity: r2(burn) });
    sa(this.body, { stroke: mixHex('#9d8cff', '#ff9a3c', burn) });
    this.blink -= 1 / 60; if (this.blink < -2.6 - Math.random() * 2) this.blink = 0.14;
    const sqz = this.blink > 0 ? 0.15 : burn > 0.1 ? 0.5 : o.happy ? 0.35 : 1;
    const lk = o.look || [0, 0];
    for (const e of this.eyes) { sa(e.w, { ry: r2(4.6 * sqz) }); sa(e.p, { cx: r2(lk[0] * 1.3), cy: r2(lk[1] * 1.2), r: burn > 0.1 ? 1.3 : 1.9, opacity: sqz < 0.4 ? 0 : 1 }); }
    this.ringA = damp(this.ringA, meter < 0.995 || burn > 0 ? 1 : 0, 6, 1 / 60);
    sa(this.ring, { opacity: r2(this.ringA), 'stroke-dasharray': `${r2(meter * 100)} 100`, stroke: meter < 0.35 ? '#ff8a3c' : burn > 0 ? '#ffcf8a' : '#c8b8ff' });
  }
}
class TFinger {
  constructor(parent) {
    this.g = sv('g', { opacity: 0 }, parent);
    this.trail = sv('path', { d: '', stroke: 'rgba(255,236,190,.35)', 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, this.g);
    this.halo = sv('circle', { r: 17, fill: 'rgba(255,255,255,.12)', stroke: 'rgba(255,248,230,.85)', 'stroke-width': 2 }, this.g);
    this.dot = sv('circle', { r: 6, fill: '#fff8e8' }, this.g);
    this.pts = [];
  }
  set(x, y, a = 1, pressed = 1) {
    this.pts.push([x, y]); if (this.pts.length > 14) this.pts.shift();
    sa(this.trail, { d: this.pts.length > 1 ? 'M' + this.pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join(' L') : '' });
    sa(this.halo, { cx: r2(x), cy: r2(y), r: r2(17 - pressed * 3) }); sa(this.dot, { cx: r2(x), cy: r2(y) });
    sa(this.g, { opacity: r2(a) });
  }
}

/* ---------- diorama: ada + yay + güneş + gerçek gölgeler ---------- */
class TDio {
  constructor(svg, id, o = {}) {
    this.svg = svg; this.id = id; this.objs = []; this.th = PI / 2; this.u = 0.5;
    const L = () => sv('g', {}, svg);
    this.lBg = L(); this.lArc = L(); this.lIsl = L(); this.lGround = L();
    this.lShadow = sv('g', { 'clip-path': `url(#${id}clip)` }, svg);
    this.lShadowIn = sv('g', { filter: `url(#${id}blur)` }, this.lShadow);
    this.lObj = L(); this.lAct = L(); this.lFx = L(); this.lTop = L();
    sv('ellipse', { cx: 200, cy: 190, rx: 220, ry: 180, fill: `url(#${id}bg)` }, this.lBg);
    sv('path', { d: 'M42 256 C 58 302, 118 338, 168 354 C 190 364, 212 364, 234 354 C 286 336, 342 302, 358 256 Z', fill: `url(#${id}cliff)` }, this.lIsl);
    for (let k = 0; k < 4; k++) sv('path', { d: `M${62 + k * 10} ${274 + k * 13} Q 200 ${302 + k * 20} ${338 - k * 10} ${274 + k * 13}`, stroke: 'rgba(255,230,200,.13)', 'stroke-width': 2, fill: 'none' }, this.lIsl);
    for (const [x, y, s] of [[150, 352, 1], [236, 344, 0.8], [196, 366, 0.7]]) sv('path', { d: `M${x - 8 * s} ${y} L${x} ${y + 26 * s} L${x + 8 * s} ${y} Z`, fill: '#4a3644' }, this.lIsl);
    sv('ellipse', { cx: 200, cy: 256, rx: 158, ry: 62, fill: `url(#${id}top)` }, this.lIsl);
    sv('ellipse', { cx: 200, cy: 256, rx: 158, ry: 62, fill: 'none', stroke: '#8fa252', 'stroke-width': 3.2, opacity: 0.85 }, this.lIsl);
    const rng = new RNG(o.seed || 7);
    for (let k = 0; k < 46; k++) { const a = rng.range(0, TAU), r = Math.sqrt(rng.next()) * 0.92; sv('circle', { cx: r2(200 + Math.cos(a) * r * 150), cy: r2(256 + Math.sin(a) * r * 58), r: rng.range(0.9, 1.7), fill: rng.pick(['#9fb05a', '#8a9a4a', '#e05a96', '#f2d24b']), opacity: 0.75 }, this.lIsl); }
    if (o.arc !== false) this.buildArc();
    this.sun = this.buildSun(this.lArc, 'sun', 1);
  }
  arcPos(u) { const th = lerp(0.9 * PI, 0.1 * PI, u); return [200 + 162 * Math.cos(th), 226 - 178 * Math.sin(th), th]; }
  buildArc() {
    let d = ''; for (let i = 0; i <= 48; i++) { const [x, y] = this.arcPos(i / 48); d += (i ? ' L' : 'M') + r2(x) + ' ' + r2(y); }
    sv('path', { d, stroke: '#5a3a1a', 'stroke-width': 6, fill: 'none', opacity: 0.5 }, this.lArc);
    sv('path', { d, stroke: `url(#${this.id}brass)`, 'stroke-width': 3.6, fill: 'none', 'stroke-linecap': 'round' }, this.lArc);
    this.ticks = [];
    for (let i = 0; i <= 12; i++) { const [x, y, th] = this.arcPos(i / 12); const nx = Math.cos(th), ny = -Math.sin(th), l = i % 3 ? 5 : 8; this.ticks.push(sv('line', { x1: r2(x - nx * l), y1: r2(y - ny * l), x2: r2(x + nx * l), y2: r2(y + ny * l), stroke: '#f2c46d', 'stroke-width': 1.6, opacity: 0.55 }, this.lArc)); }
    for (const u of [0, 1]) { const [x, y] = this.arcPos(u); sv('circle', { cx: r2(x), cy: r2(y), r: 4.5, fill: '#d09a4c' }, this.lArc); }
    this.tickHot = new Float32Array(13);
  }
  buildSun(layer, grad, s) {
    const g = sv('g', {}, layer);
    const halo = sv('circle', { r: 40 * s, fill: `url(#${this.id}${grad})` }, g);
    const rays = sv('g', { opacity: 0.8 }, g);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, l = i % 2 ? 20 : 28; sv('line', { x1: r2(Math.cos(a) * 12 * s), y1: r2(Math.sin(a) * 12 * s), x2: r2(Math.cos(a) * l * s), y2: r2(Math.sin(a) * l * s), stroke: grad === 'sun' ? '#ffe7a6' : '#cfeeff', 'stroke-width': 1.6 * s, 'stroke-linecap': 'round' }, rays); }
    const core = sv('circle', { r: 9.5 * s, fill: grad === 'sun' ? '#fffaf0' : '#f2fbff', filter: `url(#${this.id}glow)` }, g);
    return { g, rays, core, halo };
  }
  setSun(u, t, dt = 1 / 60) {
    const [x, y, th] = this.arcPos(u); this.u = u; this.th = th;
    sa(this.sun.g, { transform: `translate(${r2(x)} ${r2(y)})` }); sa(this.sun.rays, { transform: `rotate(${r2(t * 22)})` });
    if (this.ticks) {
      const ti = Math.round(u * 12); if (Math.abs(u * 12 - ti) < 0.18) this.tickHot[ti] = 1;
      for (let i = 0; i < 13; i++) { this.tickHot[i] = Math.max(0, this.tickHot[i] - dt * 2.2); sa(this.ticks[i], { opacity: r2(0.5 + this.tickHot[i] * 0.5), 'stroke-width': r2(1.6 + this.tickHot[i] * 1.6) }); }
    }
  }
  dir(th = this.th) { let dx = -Math.cos(th), dy = 0.42; const l = Math.hypot(dx, dy); return [dx / l, dy / l, Math.max(0.2, Math.sin(th))]; }
  add(kind, x, y, h, w = 20) {
    const o = { kind, x, y, h, w };
    o.sh = sv('line', { x1: x, y1: y, x2: x, y2: y, stroke: 'rgba(34,18,70,.62)', 'stroke-width': w, 'stroke-linecap': 'round' }, this.lShadowIn);
    const g = sv('g', {}, this.lObj); o.g = g;
    if (kind === 'house') {
      sv('rect', { x: x - w / 2, y: y - h, width: w, height: h, fill: `url(#${this.id}wall)` }, g);
      sv('rect', { x: x - w / 2 - 2, y: y - h - 3, width: w + 4, height: 5, fill: '#fffdf6' }, g);
      sv('rect', { x: x - w * 0.28, y: y - 17, width: 9, height: 17, rx: 1, fill: '#2b5fb8' }, g);
      sv('rect', { x: x + w * 0.08, y: y - h * 0.68, width: 9, height: 9, rx: 1, fill: '#3a6fd0' }, g);
      if (h > 50) sv('path', { d: `M${x - w * 0.3} ${y - h - 2} A ${w * 0.3} ${w * 0.3} 0 0 1 ${x + w * 0.3} ${y - h - 2} Z`, fill: '#2f6ed2' }, g);
    } else if (kind === 'cypress') {
      sv('rect', { x: x - 2, y: y - 8, width: 4, height: 8, fill: '#5a4532' }, g);
      sv('path', { d: `M${x} ${y - h} C ${x + w * 0.62} ${y - h * 0.62}, ${x + w * 0.6} ${y - 10}, ${x} ${y - 6} C ${x - w * 0.6} ${y - 10}, ${x - w * 0.62} ${y - h * 0.62}, ${x} ${y - h} Z`, fill: '#2c4f2a' }, g);
      sv('path', { d: `M${x} ${y - h} C ${x + w * 0.5} ${y - h * 0.6}, ${x + w * 0.45} ${y - 14}, ${x + 1} ${y - 8}`, stroke: '#4f7a3e', 'stroke-width': 2.4, fill: 'none', opacity: 0.8 }, g);
    } else if (kind === 'chimney') {
      sv('path', { d: `M${x - w / 2} ${y} L${x - w * 0.24} ${y - h} L${x + w * 0.24} ${y - h} L${x + w / 2} ${y} Z`, fill: '#e7c6a1' }, g);
      sv('path', { d: `M${x + w * 0.05} ${y} L${x + w * 0.2} ${y - h} L${x + w * 0.24} ${y - h} L${x + w / 2} ${y} Z`, fill: '#c9a37d' }, g);
      sv('ellipse', { cx: x, cy: y - h - 3, rx: w * 0.42, ry: 7, fill: '#5c4637' }, g);
    } else if (kind === 'olive') {
      sv('rect', { x: x - 2.5, y: y - h * 0.45, width: 5, height: h * 0.45, fill: '#6e5a46' }, g);
      for (const [dx, dy, r] of [[0, -h * 0.72, w * 0.55], [-w * 0.42, -h * 0.58, w * 0.4], [w * 0.42, -h * 0.6, w * 0.42]]) sv('circle', { cx: x + dx, cy: y + dy, r, fill: '#8c9c6c' }, g);
    } else if (kind === 'pillar') {
      sv('rect', { x: x - w / 2, y: y - h, width: w, height: h, fill: '#e9ddc4' }, g);
      sv('rect', { x: x + w * 0.1, y: y - h, width: w * 0.4, height: h, fill: '#cbbd9f' }, g);
      sv('ellipse', { cx: x, cy: y - h, rx: w / 2, ry: 4, fill: '#f6eedc' }, g);
    }
    this.objs.push(o);
    // derinlik sırası
    [...this.lObj.children].sort((a, b) => this.objs.find((q) => q.g === a).y - this.objs.find((q) => q.g === b).y).forEach((c) => this.lObj.appendChild(c));
    return o;
  }
  update() {
    const [dx, dy, el] = this.dir();
    for (const o of this.objs) { const L = o.h * (0.62 / el - 0.2); o.ex = o.x + dx * L; o.ey = o.y + dy * L; sa(o.sh, { x1: r2(o.x), y1: r2(o.y), x2: r2(o.ex), y2: r2(o.ey), 'stroke-width': o.w }); }
  }
  shaded(px, py, pad = 1) {
    for (const o of this.objs) {
      const vx = o.ex - o.x, vy = o.ey - o.y, l2 = vx * vx + vy * vy || 1;
      const k = clamp01(((px - o.x) * vx + (py - o.y) * vy) / l2), qx = o.x + vx * k - px, qy = o.y + vy * k - py;
      if (Math.hypot(qx, qy) < o.w * 0.5 + pad) return true;
    }
    return false;
  }
  // nesnelerden biri Zifir'i gölgelesin diye güneş nereye gitmeli?
  aimU(px, py, fallback) {
    let best = null, bd = 1e9;
    for (const o of this.objs) { if (o.y > py - 4) continue; const d = Math.hypot(px - o.x, py - o.y); if (d < bd) { bd = d; best = o; } }
    if (!best) return fallback;
    const c = clamp((-0.42 * (px - best.x)) / Math.max(4, py - best.y), -0.95, 0.95);
    return clamp((0.9 * PI - Math.acos(c)) / (0.8 * PI), 0, 1);
  }
}
function tutPath(pts) {
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  return {
    d: 'M' + pts.map((p) => p.join(' ')).join(' L'),
    at(s) { let d = clamp01(s) * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = clamp01(d / seg[i]); return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k), pts[i + 1][0] - pts[i][0]]; } d -= seg[i]; } return pts[pts.length - 1]; },
  };
}
function tutPathDraw(dio, path) {
  sv('path', { d: path.d, stroke: 'rgba(120,96,64,.35)', 'stroke-width': 17, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, dio.lGround);
  sv('path', { d: path.d, stroke: '#f3e7cc', 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, dio.lGround);
  sv('path', { d: path.d, stroke: 'rgba(160,130,90,.35)', 'stroke-width': 1.4, 'stroke-dasharray': '3 6', fill: 'none' }, dio.lGround);
}
function tutLabel(parent, x, y, text, o = {}) {
  const g = sv('g', { transform: `translate(${x} ${y})` }, parent);
  const w = o.w || text.length * 6.6 + 22;
  const bg = sv('rect', { x: -w / 2, y: -12, width: w, height: 24, rx: 12, fill: o.bg || 'rgba(18,13,34,.72)', stroke: o.stroke || 'rgba(255,240,220,.22)' }, g);
  const tx = sv('text', { x: 0, y: 4.2, 'text-anchor': 'middle', 'font-family': 'Manrope, system-ui, sans-serif', 'font-size': 10.5, 'font-weight': 800, 'letter-spacing': 1.6, fill: o.fill || '#fff4e2' }, g);
  tx.textContent = text;
  return { g, bg, tx };
}
function tutStar(parent, x, y, s) {
  const g = sv('g', { transform: `translate(${x} ${y}) scale(${s})` }, parent);
  const off = sv('path', { d: 'M0-26 6-7 26-6 10 5 16 25 0 13-16 25-10 5-26-6-6-7Z', fill: 'none', stroke: 'rgba(255,244,226,.35)', 'stroke-width': 1.6 }, g);
  const on = sv('path', { d: 'M0-26 6-7 26-6 10 5 16 25 0 13-16 25-10 5-26-6-6-7Z', fill: 'url(#starGrad)', opacity: 0 }, g);
  return { g, off, on };
}
function tutStars(parent, n) { const out = []; for (let i = 0; i < n; i++) out.push(sv('circle', { cx: 20 + Math.random() * 360, cy: 14 + Math.random() * 170, r: Math.random() * 1.3 + 0.5, fill: '#fff', opacity: 0 }, parent)); return out; }

/* ---------- sahneler ---------- */
const TUT_CARDS = [
  {
    k: 'Hikâye · 1', t: 'Zifir ile tanış', dur: 8,
    b: 'Zifir, saf gölgeden doğmuş küçük bir yaratık. Her adada <em>Gece Kapısı</em>na yürür — ama güneş ışığı onu <em>buharlaştırır</em>.',
    build(svg, id) {
      tutDefs(svg, id);
      sv('ellipse', { cx: 200, cy: 190, rx: 220, ry: 180, fill: `url(#${id}bg)` }, svg);
      sv('ellipse', { cx: 200, cy: 300, rx: 130, ry: 26, fill: 'rgba(255,240,220,.07)' }, svg);
      const gate = sv('g', { transform: 'translate(322 236)' }, svg);
      sv('circle', { r: 30, fill: `url(#${id}portal)` }, gate); sv('circle', { r: 33, fill: 'none', stroke: '#e9dcc4', 'stroke-width': 6 }, gate);
      sv('circle', { r: 33, fill: 'none', stroke: '#d9a54a', 'stroke-width': 1.5 }, gate);
      const gl = tutLabel(svg, 322, 290, 'GECE KAPISI', { w: 104 });
      const beam = sv('polygon', { points: '96,-30 176,-30 254,296 146,296', fill: `url(#${id}beam)`, opacity: 0 }, svg);
      const shade = sv('ellipse', { cx: -120, cy: 300, rx: 90, ry: 22, fill: 'rgba(30,16,64,.55)', filter: `url(#${id}blur)` }, svg);
      const smoke = new TPuffs(sv('g', {}, svg), 40);
      const z = new TZif(sv('g', {}, svg), id);
      const lab = tutLabel(svg, 200, 70, 'IŞIK YAKAR', { w: 100, fill: '#ffcf8a', stroke: 'rgba(255,170,80,.5)' }); sa(lab.g, { opacity: 0 });
      let m = 1;
      return (t, dt) => {
        const c = t % 7;
        const b = pulse(c, 1.5, 4.0, 0.5, 0.4);
        sa(beam, { opacity: r2(b * 0.95) });
        const sx = lerp(-120, 520, smoothstep(3.2, 4.8, c)); sa(shade, { cx: r2(sx) });
        const covered = Math.abs(sx - 200) < 90;
        const burn = covered ? 0 : b;
        m = burn > 0 ? Math.max(0.15, m - dt * 0.45) : Math.min(1, m + dt * 0.5);
        z.set(200, 300, { t, burn, meter: m, scale: 3.1, happy: c > 4.6 && c < 6.2, look: c > 4.6 ? [0.6, 0.2] : [-0.6, -0.7] });
        if (burn > 0.3 && Math.random() < dt * 22) smoke.spawn(200 + (Math.random() - 0.5) * 60, 230, { vy: -40 - Math.random() * 30, vx: (Math.random() - 0.5) * 20, r0: 6, r1: 20, life: 1.2, a: 0.55 });
        if (Math.random() < dt * 4 && burn < 0.1) smoke.spawn(200 + (Math.random() - 0.5) * 12, 214, { vy: -26, r0: 3, r1: 9, life: 1.4, a: 0.35 });
        smoke.update(dt);
        sa(lab.g, { opacity: r2(burn) });
        sa(gl.g, { opacity: r2(0.6 + Math.sin(t * 2) * 0.25) });
      };
    },
  },
  {
    k: 'Kontrol · 2', t: 'Güneşi sen çevir', dur: 8,
    b: 'Ekranın <em>herhangi bir yerinde</em> parmağını sağa sola kaydır. Güneş pirinç yay boyunca kayar, adadaki bütün gölgeler onunla birlikte döner.',
    build(svg, id) {
      tutDefs(svg, id);
      const dio = new TDio(svg, id, { seed: 3 });
      dio.add('house', 150, 252, 50, 36); dio.add('cypress', 248, 240, 70, 20); dio.add('olive', 214, 288, 40, 26);
      const f = new TFinger(dio.lTop);
      const arrows = sv('g', { opacity: 0.7 }, dio.lTop);
      sv('path', { d: 'M86 342 l-10 -6 v12 Z M314 342 l10 -6 v12 Z', fill: '#f2c46d' }, arrows);
      return (t, dt) => {
        const k = Math.sin(t * 0.95);
        dio.setSun(0.5 + 0.44 * k, t, dt); dio.update();
        f.set(200 + 112 * k, 342, smoothstep(0, 0.5, t), 1);
      };
    },
  },
  {
    k: 'Amaç · 3', t: 'Zifir’i gölgede tut', dur: 10,
    b: 'Zifir yolda <em>kendiliğinden</em> yürür. Işıkta etrafındaki mürekkep halkası erir; biterse buharlaşır. Gölgeye girince kendini toparlar.',
    build(svg, id) {
      tutDefs(svg, id);
      const dio = new TDio(svg, id, { seed: 11 });
      const path = tutPath([[92, 244], [130, 248], [176, 246], [214, 252], [250, 266], [292, 276], [318, 268]]);
      tutPathDraw(dio, path);
      dio.add('house', 128, 226, 58, 34); dio.add('cypress', 214, 228, 72, 20); dio.add('chimney', 292, 252, 60, 26); dio.add('olive', 172, 214, 40, 24);
      const z = new TZif(dio.lAct, id); const smoke = new TPuffs(dio.lFx, 30); const f = new TFinger(dio.lTop);
      const warn = tutLabel(dio.lTop, 200, 44, 'IŞIKTA! HALKA ERİYOR', { w: 170, fill: '#ffcf8a', stroke: 'rgba(255,170,80,.5)' }); sa(warn.g, { opacity: 0 });
      let u = 0.5, m = 1;
      return (t, dt) => {
        const c = t % 9.5, s = clamp01((c - 0.4) / 8);
        const [x, y, dxw] = path.at(s);
        let target = dio.aimU(x, y, u);
        const lag = c > 3.7 && c < 5.2;
        if (!lag) u = damp(u, target, 5, dt);
        dio.setSun(u, t, dt); dio.update();
        const lit = !dio.shaded(x, y - 3, 2) && c > 0.4 && c < 8.4;
        m = lit ? Math.max(0.12, m - dt * 0.5) : Math.min(1, m + dt * 0.45);
        z.set(x, y, { t, walk: c > 0.4 && c < 8.4, burn: lit ? 1 : 0, meter: m, look: [Math.sign(dxw) * 0.6, 0.2] });
        if (lit && Math.random() < dt * 18) smoke.spawn(x + (Math.random() - 0.5) * 10, y - 26, { vy: -30, vx: (Math.random() - 0.5) * 14, r0: 3, r1: 10, life: 1, a: 0.5 });
        smoke.update(dt);
        f.set(200 + (u - 0.5) * 240, 342, 0.9, 1);
        sa(warn.g, { opacity: r2(damp(+warn.g.getAttribute('opacity'), lit ? 1 : 0, 8, dt)) });
      };
    },
  },
  {
    k: 'Işık · 4', t: 'Gölgeleri oku', dur: 9,
    b: 'Gölge daima güneşin <em>tersine</em> düşer. Alçak güneş <em>uzun</em>, tepedeki güneş <em>kısa</em> gölge verir. Uzun gölgeler uzaktaki yolu da kapatabilir.',
    build(svg, id) {
      tutDefs(svg, id);
      const dio = new TDio(svg, id, { seed: 5 });
      const o = dio.add('chimney', 200, 240, 74, 26);
      const tape = sv('line', { stroke: '#f2c46d', 'stroke-width': 1.6, 'stroke-dasharray': '4 4', opacity: 0.9 }, dio.lFx);
      const tag = tutLabel(dio.lFx, 0, 0, '×1.0', { w: 52 });
      const longL = tutLabel(dio.lTop, 116, 342, 'UZUN GÖLGE', { w: 108 });
      const shortL = tutLabel(dio.lTop, 284, 342, 'KISA GÖLGE', { w: 108 });
      return (t, dt) => {
        const u = 0.5 + 0.47 * Math.sin(t * 0.75 - 1.2);
        dio.setSun(u, t, dt); dio.update();
        const [dx, dy, el] = dio.dir();
        const nx = -dy, ny = dx, off = 18;
        sa(tape, { x1: r2(o.x + nx * off), y1: r2(o.y + ny * off), x2: r2(o.ex + nx * off), y2: r2(o.ey + ny * off) });
        sa(tag.g, { transform: `translate(${r2(o.ex + nx * (off + 18))} ${r2(o.ey + ny * (off + 10))})` });
        tag.tx.textContent = '×' + (Math.hypot(o.ex - o.x, o.ey - o.y) / o.h).toFixed(1);
        const lo = smoothstep(0.7, 0.45, el), hi = smoothstep(0.82, 0.97, el);
        sa(longL.g, { opacity: r2(0.35 + lo * 0.65) }); sa(longL.bg, { fill: lo > 0.5 ? 'rgba(242,196,109,.28)' : 'rgba(18,13,34,.72)' });
        sa(shortL.g, { opacity: r2(0.35 + hi * 0.65) }); sa(shortL.bg, { fill: hi > 0.5 ? 'rgba(242,196,109,.28)' : 'rgba(18,13,34,.72)' });
      };
    },
  },
  {
    k: 'Toplanabilir · 5', t: 'Gece damlaları', dur: 9,
    b: 'Yoldaki damlalar Zifir yaklaşınca <em>uyanır</em>. Uyandıktan sonra ışıkta erirler — gölgede tut, üzerinden geçip topla.',
    build(svg, id) {
      tutDefs(svg, id);
      const dio = new TDio(svg, id, { seed: 9 });
      const path = tutPath([[78, 262], [322, 262]]); tutPathDraw(dio, path);
      dio.add('house', 116, 238, 54, 32); dio.add('cypress', 248, 236, 66, 20);
      dio.setSun(0.28, 0); dio.update();
      const xs = [140, 205, 272];
      const drops = xs.map((x) => {
        const g = sv('g', { transform: `translate(${x} 256)` }, dio.lAct);
        const shell = sv('path', { d: 'M0 -14 L8 -4 L0 6 L-8 -4 Z', fill: 'rgba(80,64,140,.4)', stroke: '#9d8cff', 'stroke-width': 1.2 }, g);
        const glow = sv('circle', { cx: 0, cy: -6, r: 13, fill: 'rgba(140,110,255,.25)', filter: `url(#${id}glow)`, opacity: 0 }, g);
        const drop = sv('path', { d: 'M0 -20 C 5 -11, 9 -6, 9 -1 A 9 9 0 0 1 -9 -1 C -9 -6, -5 -11, 0 -20 Z', fill: `url(#${id}drop)`, stroke: '#b9adff', 'stroke-width': 1.2, opacity: 0 }, g);
        return { x, g, shell, glow, drop, hp: 1, st: 0 };
      });
      const z = new TZif(dio.lAct, id); const fx = new TPuffs(dio.lFx, 50); const sp = new TPuffs(sv('g', { filter: `url(#${id}glow)` }, dio.lFx), 40);
      const cnt = tutLabel(dio.lTop, 330, 40, '✦ 0/3', { w: 74 });
      const note = tutLabel(dio.lTop, 205, 200, 'IŞIKTA ERİYOR', { w: 122, fill: '#ffcf8a' }); sa(note.g, { opacity: 0 });
      let m = 1, got = 0, lastC = 0;
      return (t, dt) => {
        const c = t % 9;
        if (c < lastC) { got = 0; for (const d of drops) { d.hp = 1; d.st = 0; } cnt.tx.textContent = '✦ 0/3'; }
        lastC = c;
        const s = clamp01((c - 0.5) / 7.2), [x, y] = path.at(s);
        dio.setSun(0.28, t, dt);
        const lit = !dio.shaded(x, y - 3, 1);
        m = lit && c > 0.5 && c < 7.7 ? Math.max(0.3, m - dt * 0.25) : Math.min(1, m + dt * 0.5);
        z.set(x, y + 4, { t, walk: c > 0.5 && c < 7.7, burn: lit && c < 7.7 ? 0.6 : 0, meter: m, look: [0.7, 0.1] });
        let noteA = 0;
        for (const d of drops) {
          if (d.st === 2) continue;
          const awake = d.x - x < 80;
          const dl = !dio.shaded(d.x, 256, 0);
          sa(d.shell, { opacity: r2(awake ? 0 : 0.9) }); sa(d.drop, { opacity: awake ? 1 : 0 }); sa(d.glow, { opacity: r2(awake ? 0.8 : 0.2) });
          if (awake && dl && d.st === 0) { d.hp -= dt / 1.4; noteA = 1; if (Math.random() < dt * 20) fx.spawn(d.x + (Math.random() - 0.5) * 8, 240, { vy: -36, r0: 3, r1: 9, life: 0.9, a: 0.5, fill: '#e8e2f0' }); }
          if (d.st === 0 && d.hp <= 0) { d.st = 2; sa(d.g, { opacity: 0 }); fx.burst(d.x, 246, 10, { fill: '#e8e2f0', r0: 3, r1: 10, life: 0.8, a: 0.5, sp: 30, up: 20 }); }
          if (d.st === 0 && Math.abs(d.x - x) < 6) { d.st = 2; got++; sa(d.g, { opacity: 0 }); cnt.tx.textContent = `✦ ${got}/3`; sp.burst(d.x, 248, 14, { fill: '#d8c8ff', r0: 2.5, r1: 0.5, life: 0.7, a: 1, sp: 70, up: 30 }); }
          const sc = lerp(0.5, 1, Math.max(0, d.hp)) * (1 + Math.sin(t * 5 + d.x) * 0.04);
          if (d.st === 0) sa(d.g, { opacity: 1, transform: `translate(${d.x} ${r2(256 + Math.sin(t * 2.4 + d.x) * 2)}) scale(${r2(sc)})` });
        }
        sa(note.g, { opacity: r2(noteA) });
        fx.update(dt); sp.update(dt);
      };
    },
  },
  {
    k: 'Yetenek · 6', t: 'Tutulma', dur: 9,
    b: 'Sağ alttaki <em>Tutulma</em> düğmesi güneşi 2 saniyeliğine karartır; Zifir güvendedir. Her toplanan damla düğmenin üçte birini yeniden doldurur.',
    build(svg, id) {
      tutDefs(svg, id);
      const dio = new TDio(svg, id, { seed: 13 });
      dio.add('cypress', 96, 236, 54, 16); dio.add('olive', 310, 252, 36, 22);
      const night = sv('ellipse', { cx: 200, cy: 200, rx: 280, ry: 250, fill: `url(#${id}night)`, opacity: 0 }, dio.lFx);
      const stars = tutStars(dio.lFx, 30);
      const moon = sv('circle', { r: 11, fill: '#0a0716', opacity: 0 }, dio.lArc);
      const corona = sv('circle', { r: 22, fill: 'none', stroke: '#e8dcff', 'stroke-width': 3, opacity: 0, filter: `url(#${id}glow)` }, dio.lArc);
      const z = new TZif(dio.lAct, id); const smoke = new TPuffs(dio.lFx, 30);
      const btn = sv('g', { transform: 'translate(338 330)' }, dio.lTop);
      sv('circle', { r: 24, fill: 'rgba(20,14,38,.85)', stroke: 'rgba(255,230,190,.3)' }, btn);
      const prog = sv('circle', { r: 26.5, fill: 'none', stroke: '#f2c46d', 'stroke-width': 3, pathLength: 100, 'stroke-dasharray': '100 100', transform: 'rotate(-90)', 'stroke-linecap': 'round' }, btn);
      sv('circle', { r: 11, fill: '#ffb347' }, btn); const bm = sv('circle', { cx: 4, cy: -1, r: 10, fill: '#120e1f' }, btn);
      const f = new TFinger(dio.lTop); const plus = tutLabel(dio.lTop, 338, 284, '+⅓', { w: 40, fill: '#f2c46d' }); sa(plus.g, { opacity: 0 });
      const lab = tutLabel(dio.lTop, 200, 44, 'KARANLIK: GÜVENDE', { w: 150 }); sa(lab.g, { opacity: 0 });
      let m = 1;
      return (t, dt) => {
        const c = t % 9;
        dio.setSun(0.5, t, dt); dio.update();
        const e = smoothstep(1.7, 2.0, c) * (1 - smoothstep(3.9, 4.4, c));
        const [sx, sy] = dio.arcPos(0.5);
        sa(moon, { cx: r2(sx + (1 - e) * 30), cy: r2(sy - (1 - e) * 8), opacity: r2(Math.min(1, e * 3)) });
        sa(corona, { cx: sx, cy: sy, opacity: r2(e), r: r2(20 + Math.sin(t * 6) * 1.5) });
        sa(dio.sun.halo, { opacity: r2(1 - e * 0.9) }); sa(dio.sun.rays, { opacity: r2(0.8 * (1 - e)) });
        sa(night, { opacity: r2(e * 0.72) });
        stars.forEach((s, i) => sa(s, { opacity: r2(e * (0.5 + 0.5 * Math.sin(t * 3 + i))) }));
        const x = 200 + Math.sin(t * 0.6) * 30, y = 268;
        const burn = c < 8.6 ? 1 - e : 0;
        m = burn > 0.5 ? Math.max(0.2, m - dt * 0.28) : Math.min(1, m + dt * 0.5);
        z.set(x, y, { t, walk: true, burn: burn * 0.8, meter: m, happy: e > 0.6, look: [0, -1] });
        if (burn > 0.5 && Math.random() < dt * 14) smoke.spawn(x, y - 26, { vy: -30, r0: 3, r1: 10, life: 1, a: 0.5 });
        smoke.update(dt);
        const fa = pulse(c, 1.0, 2.2, 0.3, 0.3), press = smoothstep(1.55, 1.7, c) * (1 - smoothstep(1.8, 2.0, c));
        f.set(338 + (1 - smoothstep(1.0, 1.5, c)) * 40, 330 + (1 - smoothstep(1.0, 1.5, c)) * 30, fa, press);
        const fill = c < 1.7 ? 1 : c < 4.8 ? 0 : c < 5.8 ? 0.34 : c < 6.8 ? 0.67 : 1;
        sa(prog, { 'stroke-dasharray': `${r2(fill * 100)} 100` });
        sa(btn, { transform: `translate(338 330) scale(${r2(1 - press * 0.12 + (fill >= 1 && c > 6.8 ? Math.sin(t * 6) * 0.03 : 0))})` });
        const pv = c > 4.8 && c < 7.2 ? 1 - ((c - 4.8) % 1) : 0; sa(plus.g, { opacity: r2(pv), transform: `translate(338 ${r2(290 - (1 - pv) * 14)})` });
        sa(bm, { opacity: fill >= 1 ? 1 : 0.6 });
        sa(lab.g, { opacity: r2(e) });
      };
    },
  },
  {
    k: 'Hedef · 7', t: 'Gece düşer, yıldızlar yanar', dur: 9.5,
    b: 'Kapıya varınca ada geceye bürünür. Her adada üç yıldız var: <em>kapıya ulaşmak</em>, <em>tüm damlaları toplamak</em> ve neredeyse hiç güneş görmeden — <em>lekesiz</em> — geçmek.',
    build(svg, id) {
      tutDefs(svg, id);
      const dio = new TDio(svg, id, { seed: 21 });
      const path = tutPath([[96, 262], [270, 262]]); tutPathDraw(dio, path);
      const gate = sv('g', { transform: 'translate(296 238)' }, dio.lObj);
      const gp = sv('ellipse', { rx: 16, ry: 21, fill: `url(#${id}portal)` }, gate); sv('ellipse', { rx: 18, ry: 23, fill: 'none', stroke: '#e9dcc4', 'stroke-width': 5 }, gate);
      const nclip = tutCircleClip(svg, id, 'nc');
      const night = sv('ellipse', { cx: 200, cy: 200, rx: 280, ry: 250, fill: `url(#${id}night)`, opacity: 0.8, 'clip-path': `url(#${id}nc)` }, dio.lFx);
      const rim = sv('circle', { cx: 296, cy: 240, r: 0, fill: 'none', stroke: '#b49aff', 'stroke-width': 3, opacity: 0, filter: `url(#${id}glow)` }, dio.lFx);
      const skyStars = tutStars(dio.lFx, 26);
      const z = new TZif(dio.lAct, id); const sp = new TPuffs(sv('g', { filter: `url(#${id}glow)` }, dio.lFx), 40);
      const S = [tutStar(dio.lTop, 120, 92, 0.85), tutStar(dio.lTop, 200, 74, 0.95), tutStar(dio.lTop, 280, 92, 0.85)];
      const L = [tutLabel(dio.lTop, 120, 136, 'KAPI', { w: 60 }), tutLabel(dio.lTop, 200, 122, 'DAMLALAR', { w: 92 }), tutLabel(dio.lTop, 280, 136, 'LEKESİZ', { w: 76 })];
      let flashed = false, lastC = 0;
      return (t, dt) => {
        const c = t % 9.5;
        if (c < lastC) flashed = false; lastC = c;
        const s = clamp01((c - 0.3) / 2.2), [x, y] = path.at(s);
        const jk = clamp01((c - 2.6) / 0.5);
        const sunU = lerp(0.42, 1, smoothstep(3.0, 5.0, c));
        dio.setSun(sunU, t, dt); dio.update(); sa(dio.sun.g, { opacity: r2(1 - smoothstep(4.0, 5.0, c)) });
        if (c < 2.6) z.set(x, y + 4, { t, walk: true, meter: 1, look: [0.8, 0] });
        else if (jk < 1) z.set(lerp(270, 296, jk), lerp(266, 252, jk), { t, jump: Math.sin(jk * PI) * 22, squash: c < 2.7 ? 0.2 : 0, size: 1 - jk * 0.7, happy: true });
        else z.set(296, 252, { alpha: 0 });
        if (jk >= 1 && !flashed) { flashed = true; sp.burst(296, 240, 26, { fill: '#d8c8ff', r0: 3, r1: 0.5, life: 0.9, a: 1, sp: 90 }); }
        const nk = smoothstep(3.1, 4.7, c);
        sa(nclip, { cx: 296, cy: 240, r: r2(nk * 360) }); sa(rim, { r: r2(nk * 360), opacity: r2(Math.sin(nk * PI) * 0.9) });
        sa(gp, { rx: r2(16 + pulse(c, 3.0, 3.6, 0.1, 0.4) * 6) });
        skyStars.forEach((st, i) => sa(st, { opacity: r2(nk * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7))) }));
        for (let i = 0; i < 3; i++) {
          const k = clamp01((c - 5.0 - i * 0.55) / 0.5), e = k <= 0 ? 0 : Ease.outBack(k, 2.4);
          sa(S[i].on, { opacity: r2(Math.min(1, k * 2)), transform: `scale(${r2(Math.max(0.01, e))}) rotate(${r2((1 - k) * -40)})` });
          sa(L[i].g, { opacity: r2(0.3 + Math.min(1, k * 2) * 0.7) });
          if (k > 0 && !S[i].fired) { S[i].fired = true; sp.burst([120, 200, 280][i], [92, 74, 92][i], 12, { fill: '#ffe2a0', r0: 2.5, r1: 0.4, life: 0.6, a: 1, sp: 60 }); audio.star(i, true); }
          if (k <= 0) S[i].fired = false;
        }
        sp.update(dt);
      };
    },
  },
  {
    k: 'Keşif · 8', t: 'Yeni dünyalar, yeni kurallar', dur: 11,
    b: 'Her takımyıldızı yeni bir kural getirir: <em>kayan bulutlar</em> ve değirmenler, gölgesi uzayan <em>balonlar</em>, ışık isteyen <em>kristal köprüler</em> ve aynı anda dönen <em>ikiz güneşler</em>.',
    build(svg, id) {
      tutDefs(svg, id);
      const d = svg.querySelector('defs');
      const tiles = [];
      const tile = (i, title) => {
        const x = (i % 2) * 196 + 6, y = Math.floor(i / 2) * 176 + 4;
        const cpid = id + 'tc' + i; const cp = sv('clipPath', { id: cpid }, d); sv('rect', { x: 0, y: 0, width: 190, height: 168, rx: 16 }, cp);
        const g = sv('g', { transform: `translate(${x} ${y})` }, svg);
        sv('rect', { x: 0, y: 0, width: 190, height: 168, rx: 16, fill: 'rgba(255,255,255,.045)', stroke: 'rgba(255,240,220,.16)' }, g);
        const inner = sv('g', { 'clip-path': `url(#${cpid})` }, g);
        const lab = sv('text', { x: 95, y: 156, 'text-anchor': 'middle', 'font-family': 'Manrope, system-ui, sans-serif', 'font-size': 10.5, 'font-weight': 800, 'letter-spacing': 1.4, fill: '#ffdf9e' }, g); lab.textContent = title;
        tiles.push(inner); return inner;
      };
      const ground = (g, cx = 95, cy = 112, rx = 76, ry = 24) => { sv('path', { d: `M${cx - rx} ${cy} Q ${cx} ${cy + ry * 2.6} ${cx + rx} ${cy} Z`, fill: '#8a6452' }, g); return sv('ellipse', { cx, cy, rx, ry, fill: `url(#${id}top)` }, g); };
      // a) bulutlar & değirmen
      const A = tile(0, 'BULUT & DEĞİRMEN'); ground(A);
      const aSh = sv('ellipse', { cx: 0, cy: 116, rx: 30, ry: 9, fill: 'rgba(34,18,70,.5)', filter: `url(#${id}blur)` }, A);
      const mill = sv('g', { transform: 'translate(150 100)' }, A); sv('path', { d: 'M-7 6 L-5 -22 L5 -22 L7 6 Z', fill: '#f1ece2' }, mill); sv('path', { d: 'M-6 -22 L0 -30 L6 -22 Z', fill: '#7a5b42' }, mill);
      const sails = sv('g', { transform: 'translate(0 -20)' }, mill); for (let k = 0; k < 4; k++) sv('rect', { x: -2, y: -20, width: 5, height: 18, fill: '#f4ecdc', stroke: '#6b4e38', 'stroke-width': 0.8, transform: `rotate(${k * 90})` }, sails);
      const zA = new TZif(A, id);
      const cloud = sv('g', {}, A); for (const [dx, dy, r] of [[0, 0, 15], [14, 3, 11], [-14, 3, 12], [4, -8, 10]]) sv('circle', { cx: dx, cy: dy, r, fill: '#fffaf2' }, cloud);
      // b) balonlar
      const B = tile(1, 'BALONLAR'); ground(B);
      const bSh = sv('ellipse', { cx: 95, cy: 114, rx: 14, ry: 5, fill: 'rgba(34,18,70,.5)', filter: `url(#${id}blur)` }, B);
      const bSun = sv('circle', { r: 7, fill: '#fff4d8', filter: `url(#${id}glow)` }, B);
      const balloon = sv('g', {}, B);
      for (let k = 0; k < 6; k++) sv('path', { d: `M0 -18 C ${-13 + k * 5.2} -16, ${-14 + k * 5.6} 4, ${-2 + k * 0.8} 10 L${-1 + k * 0.4} 10 Z`, fill: k % 2 ? '#e8463a' : '#ffd25a' }, balloon);
      sv('ellipse', { cx: 0, cy: -4, rx: 13, ry: 15, fill: 'none', stroke: 'rgba(0,0,0,.15)' }, balloon);
      sv('rect', { x: -3.5, y: 14, width: 7, height: 6, fill: '#7a5636' }, balloon); sv('path', { d: 'M-3 14 L-5 9 M3 14 L5 9', stroke: '#3a2a20', 'stroke-width': 0.8 }, balloon);
      // c) kristal köprü
      const C = tile(2, 'KRİSTAL KÖPRÜ');
      ground(C, 46, 112, 40, 18); ground(C, 146, 112, 40, 18);
      const cBeam = sv('polygon', { points: '150,-10 170,-10 40,92 28,92', fill: `url(#${id}beam)`, opacity: 0 }, C);
      const crystal = sv('polygon', { points: '34,104 30,84 36,72 42,84 38,104', fill: '#c8b8ff', stroke: '#fff', 'stroke-width': 0.6 }, C);
      const cGlow = sv('circle', { cx: 36, cy: 86, r: 12, fill: '#e2d4ff', filter: `url(#${id}glow)`, opacity: 0 }, C);
      const bridge = sv('rect', { x: 84, y: 107, width: 24, height: 9, rx: 2, fill: '#bfe0ff', opacity: 0.15, filter: `url(#${id}glow)` }, C);
      const cSun = sv('circle', { r: 7, fill: '#fff4d8', filter: `url(#${id}glow)` }, C);
      const zC = new TZif(C, id);
      // d) ikiz güneş
      const D = tile(3, 'İKİZ GÜNEŞ'); ground(D);
      const dSh1 = sv('line', { stroke: 'rgba(120,70,20,.45)', 'stroke-width': 12, 'stroke-linecap': 'round', filter: `url(#${id}blur)` }, D);
      const dSh2 = sv('line', { stroke: 'rgba(30,60,140,.45)', 'stroke-width': 12, 'stroke-linecap': 'round', filter: `url(#${id}blur)` }, D);
      sv('rect', { x: 89, y: 72, width: 12, height: 40, fill: '#2b2546' }, D); sv('rect', { x: 92, y: 80, width: 6, height: 2, fill: '#4fffe0' }, D); sv('rect', { x: 92, y: 92, width: 6, height: 2, fill: '#4fffe0' }, D);
      const s1 = sv('circle', { r: 7, fill: '#ffe7a6', filter: `url(#${id}glow)` }, D), s2 = sv('circle', { r: 6, fill: '#bfe6ff', filter: `url(#${id}glow)` }, D);
      const dTxt = sv('text', { x: 95, y: 18, 'text-anchor': 'middle', 'font-family': 'Manrope, system-ui, sans-serif', 'font-size': 9, 'font-weight': 700, fill: 'rgba(255,244,226,.7)' }, D); dTxt.textContent = 'gerçek gölge = kesişim';
      return (t, dt) => {
        // a
        const cx = ((t * 34) % 260) - 40; sa(cloud, { transform: `translate(${r2(cx)} 34)` }); sa(aSh, { cx: r2(cx + 20) });
        sa(sails, { transform: `translate(0 -20) rotate(${r2(t * 90)})` });
        const covered = Math.abs(cx + 20 - 70) < 26;
        zA.set(70, 116, { t, scale: 0.78, burn: covered ? 0 : 0.5, meter: covered ? 1 : 0.7, happy: covered });
        // b
        const su = 0.5 + 0.45 * Math.sin(t * 0.8), sxp = 20 + su * 150, syp = 66 - Math.sin(su * PI) * 48;
        sa(bSun, { cx: r2(sxp), cy: r2(syp) });
        const bx = 95 + Math.sin(t * 0.5) * 10, by = 46 + Math.sin(t * 1.3) * 3;
        sa(balloon, { transform: `translate(${r2(bx)} ${r2(by)})` });
        const el = Math.max(0.25, Math.sin(su * PI)), off = (95 - sxp) / el * 0.5;
        sa(bSh, { cx: r2(clamp(bx + off, 26, 164)), rx: r2(14 / el * 0.9) });
        // c
        const cu = 0.5 + 0.5 * Math.sin(t * 0.9); const lit = cu > 0.55;
        sa(cSun, { cx: r2(30 + cu * 140), cy: r2(30 - Math.sin(cu * PI) * 16) });
        sa(cBeam, { opacity: r2(lit ? 0.7 : 0) }); sa(cGlow, { opacity: lit ? 0.9 : 0 }); sa(crystal, { fill: lit ? '#fff6d8' : '#8a7ab8' });
        sa(bridge, { opacity: lit ? 0.95 : 0.12 });
        const cc = t % 6; const zx = cc < 2 ? lerp(40, 76, cc / 2) : lit ? lerp(76, 150, clamp01((cc - 2) / 2.5)) : 76;
        zC.set(zx, 112, { t, scale: 0.7, walk: cc < 2 || (lit && zx < 150), look: [1, 0] });
        // d
        const tu = 0.5 + 0.45 * Math.sin(t * 0.7);
        const p1 = [20 + tu * 150, 66 - Math.sin(tu * PI) * 44], p2 = [20 + (1 - tu) * 150, 70 - Math.sin(tu * PI) * 34];
        sa(s1, { cx: r2(p1[0]), cy: r2(p1[1]) }); sa(s2, { cx: r2(p2[0]), cy: r2(p2[1]) });
        const shl = (sx, k) => { const dx = 95 - sx, l = Math.hypot(dx, 18); return [95 + (dx / l) * 34 * k, 112 + (18 / l) * 12 * k]; };
        const e1 = shl(p1[0], 1.4), e2 = shl(p2[0], 1.2);
        sa(dSh1, { x1: 95, y1: 112, x2: r2(e1[0]), y2: r2(e1[1]) }); sa(dSh2, { x1: 95, y1: 112, x2: r2(e2[0]), y2: r2(e2[1]) });
      };
    },
  },
  {
    k: 'Aksiyon · 9', t: 'Dal, periler, patlama', dur: 11,
    b: 'Sol alttaki <em>Dal</em> Zifir’i bir anlığına mürekkebe gömer: ışık neredeyse işlemez, yaklaşan <em>ışık perilerini</em> yutar. <em>Güneş patlaması</em> çubuğu dolunca ışık iki kat yakar — önceden gölgeye gir.',
    build(svg, id) {
      tutDefs(svg, id);
      const dio = new TDio(svg, id, { seed: 17 });
      const cyp = dio.add('cypress', 140, 248, 64, 18); dio.add('olive', 304, 262, 34, 20);
      const ink = sv('ellipse', { rx: 0, ry: 0, fill: 'rgba(10,6,22,.78)' }, dio.lAct);
      const z = new TZif(dio.lAct, id), fx = new TPuffs(dio.lFx, 40), sp = new TPuffs(sv('g', { filter: `url(#${id}glow)` }, dio.lFx), 50);
      const wisp = sv('g', { filter: `url(#${id}glow)`, opacity: 0 }, dio.lFx); sv('circle', { r: 10, fill: '#ffb347', opacity: 0.5 }, wisp); sv('circle', { r: 4.6, fill: '#fff6d8' }, wisp);
      const btn = sv('g', { transform: 'translate(62 330)' }, dio.lTop);
      sv('circle', { r: 24, fill: 'rgba(44,30,86,.92)', stroke: 'rgba(200,185,255,.4)' }, btn);
      const prog = sv('circle', { r: 26.5, fill: 'none', stroke: '#b9adff', 'stroke-width': 3, pathLength: 100, 'stroke-dasharray': '100 100', transform: 'rotate(-90)', 'stroke-linecap': 'round' }, btn);
      sv('path', { d: 'M-13 10 C -7 9 -3 5 -1 -1', stroke: '#b9adff', 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round', opacity: 0.7 }, btn);
      sv('circle', { cx: 4, cy: -4, r: 8, fill: '#120e1f', stroke: '#c9bfff', 'stroke-width': 1.4 }, btn); sv('circle', { cx: 6, cy: -5.5, r: 1.8, fill: '#fff' }, btn);
      const bl = sv('text', { x: 0, y: 40, 'text-anchor': 'middle', 'font-family': 'Manrope, system-ui, sans-serif', 'font-size': 8.5, 'font-weight': 800, 'letter-spacing': 2.4, fill: 'rgba(255,244,226,.7)' }, btn); bl.textContent = 'DAL';
      const f = new TFinger(dio.lTop);
      const bar = sv('g', { transform: 'translate(200 40)', opacity: 0 }, dio.lTop);
      sv('rect', { x: -72, y: -4, width: 144, height: 8, rx: 4, fill: 'rgba(0,0,0,.35)', stroke: 'rgba(255,200,120,.4)' }, bar);
      const barFill = sv('rect', { x: -72, y: -4, width: 0, height: 8, rx: 4, fill: '#ff8a3a' }, bar);
      const barTxt = sv('text', { x: 0, y: 20, 'text-anchor': 'middle', 'font-family': 'Manrope, system-ui, sans-serif', 'font-size': 9, 'font-weight': 800, 'letter-spacing': 2, fill: '#ffd9a0' }, bar);
      const flash = sv('rect', { x: -20, y: -20, width: 440, height: 440, fill: '#ff9a40', opacity: 0 }, dio.lFx);
      const lab = tutLabel(dio.lTop, 200, 84, '+ ENERJİ', { w: 92, fill: '#d6ccff' }); sa(lab.g, { opacity: 0 });
      let eaten = false, lastC = 0, m = 1;
      return (t, dt) => {
        const c = t % 11; if (c < lastC) eaten = false; lastC = c;
        dio.setSun(0.26, t, dt); dio.update();
        const sx = (cyp.x + cyp.ex) / 2, sy = (cyp.y + cyp.ey) / 2 + 6;
        const wk = smoothstep(4.6, 5.8, c) * (1 - smoothstep(10.2, 10.9, c)), zx = lerp(238, sx, wk), zy = lerp(272, sy, wk);
        const dive = smoothstep(2.25, 2.4, c) * (1 - smoothstep(2.95, 3.15, c));
        const shaded = dio.shaded(zx, zy - 6, 2);
        const flareK = smoothstep(6.45, 6.6, c) * (1 - smoothstep(8.2, 8.6, c));
        const burn = shaded ? 0 : (dive > 0.5 ? 0.08 : 0.42) * (1 + flareK);
        m = burn > 0.2 ? Math.max(0.3, m - dt * 0.1) : Math.min(1, m + dt * 0.35);
        z.set(zx, zy, { t, walk: (wk > 0.01 && wk < 0.99) || c < 2.2, burn, meter: m, squash: dive * 0.72, happy: (eaten && c < 4.4) || (shaded && c > 6), look: c < 2.6 ? [1, -0.4] : [0, -1] });
        sa(ink, { cx: r2(zx), cy: r2(zy + 2), rx: r2(dive * 26), ry: r2(dive * 8) });
        const wa = clamp01((c - 0.7) / 1.9), wx = lerp(352, zx + 6, Ease.inCubic(wa)), wy = lerp(166, zy - 16, wa) + Math.sin(c * 9) * 6 * (1 - wa);
        const wv = c > 0.6 && c < 2.62;
        sa(wisp, { transform: `translate(${r2(wx)} ${r2(wy)}) scale(${r2(0.85 + Math.sin(t * 14) * 0.15)})`, opacity: wv ? 1 : 0 });
        if (wv && Math.random() < dt * 30) sp.spawn(wx, wy, { fill: '#ffcf7a', vx: (Math.random() - 0.5) * 20, vy: -10, r0: 2.2, r1: 0.3, life: 0.5, a: 0.9 });
        if (c > 2.62 && c < 4 && !eaten) { eaten = true; sp.burst(zx, zy - 14, 22, { fill: '#c9bfff', r0: 3, r1: 0.4, life: 0.8, a: 1, sp: 80 }); fx.burst(zx, zy, 12, { fill: '#0c0916', r0: 2, r1: 6, life: 0.6, a: 0.7, sp: 50, up: 30 }); }
        sa(lab.g, { opacity: r2(pulse(c, 2.65, 4.0, 0.15, 0.5)), transform: `translate(200 ${r2(84 - smoothstep(2.65, 4, c) * 10)})` });
        const fa = pulse(c, 1.6, 2.7, 0.3, 0.3), press = smoothstep(2.1, 2.25, c) * (1 - smoothstep(2.4, 2.6, c)), fm = 1 - smoothstep(1.6, 2.1, c);
        f.set(62 + fm * 50, 330 + fm * 30, fa, press);
        sa(prog, { 'stroke-dasharray': `${r2((c < 2.25 ? 1 : clamp01((c - 2.25) / 3)) * 100)} 100` }); sa(btn, { transform: `translate(62 330) scale(${r2(1 - press * 0.12)})` });
        const warn = smoothstep(4.9, 5.1, c) * (1 - smoothstep(8.4, 8.8, c));
        sa(bar, { opacity: r2(warn) });
        const fk = c < 6.5 ? clamp01((c - 5.0) / 1.5) : 1 - clamp01((c - 6.5) / 1.8);
        sa(barFill, { width: r2(144 * fk), fill: c < 6.5 ? '#ff8a3a' : '#ff4a2a' });
        barTxt.textContent = c < 6.5 ? 'GÜNEŞ PATLAMASI GELİYOR' : 'IŞIK ×2 · GÖLGEDE KAL';
        sa(flash, { opacity: r2(flareK * (0.14 + Math.sin(t * 20) * 0.03) + pulse(c, 6.45, 6.9, 0.05, 0.4) * 0.35) });
        sa(dio.sun.halo, { transform: `scale(${r2(1 + flareK * 0.9 + (c > 5 && c < 6.5 ? Math.sin(t * 16) * 0.08 : 0))})` });
        if (burn > 0.2 && Math.random() < dt * 12) fx.spawn(zx, zy - 26, { vy: -30, r0: 3, r1: 9, life: 0.9, a: 0.5 });
        fx.update(dt); sp.update(dt);
      };
    },
  },
  {
    k: 'Keşif · 10', t: 'Üç yeni dünya', dur: 11,
    b: '<em>Buz Diyarı</em>’nda sütunlar güneşte erir, <em>Ayna Sarayı</em>’nda yansıyan ışık gölge tanımaz, <em>Gök Saati</em>’nde dişliler döner ve dev sarkaç gölgeyi yol boyunca biçer.',
    build(svg, id) {
      tutDefs(svg, id);
      const d = svg.querySelector('defs');
      const tile = (i, title) => {
        const x = (i % 2) * 196 + 6, y = Math.floor(i / 2) * 176 + 4;
        const cpid = id + 'nc' + i; const cp = sv('clipPath', { id: cpid }, d); sv('rect', { x: 0, y: 0, width: 190, height: 168, rx: 16 }, cp);
        const g = sv('g', { transform: `translate(${x} ${y})` }, svg);
        sv('rect', { x: 0, y: 0, width: 190, height: 168, rx: 16, fill: 'rgba(255,255,255,.045)', stroke: 'rgba(255,240,220,.16)' }, g);
        const inner = sv('g', { 'clip-path': `url(#${cpid})` }, g);
        const lab = sv('text', { x: 95, y: 156, 'text-anchor': 'middle', 'font-family': 'Manrope, system-ui, sans-serif', 'font-size': 10.5, 'font-weight': 800, 'letter-spacing': 1.4, fill: '#ffdf9e' }, g); lab.textContent = title;
        return inner;
      };
      const ground = (g, col = `url(#${id}top)`, cx = 95, cy = 112, rx = 78, ry = 24) => { sv('path', { d: `M${cx - rx} ${cy} Q ${cx} ${cy + ry * 2.6} ${cx + rx} ${cy} Z`, fill: '#6a5a72' }, g); return sv('ellipse', { cx, cy, rx, ry, fill: col }, g); };
      const sunAt = (g) => sv('circle', { r: 7, fill: '#fff4d8', filter: `url(#${id}glow)` }, g);
      // a) eriyen buz
      const A = tile(0, 'ERİYEN BUZ'); ground(A, '#eef4fa');
      const aSun = sunAt(A); sa(aSun, { cx: 34, cy: 40 });
      const aSh = sv('line', { x1: 70, y1: 112, x2: 120, y2: 122, stroke: 'rgba(60,70,130,.45)', 'stroke-width': 14, 'stroke-linecap': 'round', filter: `url(#${id}blur)` }, A);
      const ice = sv('polygon', { fill: '#cfeeff', stroke: '#ffffff', 'stroke-width': 1, opacity: 0.95 }, A);
      const pud = sv('ellipse', { cx: 70, cy: 114, rx: 8, ry: 3, fill: '#8cc8ea', opacity: 0.8 }, A);
      const zA = new TZif(A, id); const drip = new TPuffs(A, 14);
      // b) ayna
      const B = tile(1, 'AYNA'); ground(B, '#efe2c8');
      const bSun = sunAt(B);
      const beam = sv('polygon', { fill: `url(#${id}beam)`, opacity: 0.85 }, B);
      const spot = sv('ellipse', { rx: 16, ry: 6, fill: '#ffe2a0', opacity: 0.85, filter: `url(#${id}glow)` }, B);
      const mir = sv('g', { transform: 'translate(150 102)' }, B);
      sv('rect', { x: -10, y: -34, width: 20, height: 28, rx: 2, fill: '#e8b04a' }, mir); sv('rect', { x: -7, y: -31, width: 14, height: 22, fill: '#e8f2ff' }, mir); sv('rect', { x: -1.5, y: -6, width: 3, height: 10, fill: '#8a6a3a' }, mir);
      const zB = new TZif(B, id);
      // c) dişli
      const C = tile(2, 'DÖNEN DİŞLİ'); ground(C, '#7c6c54');
      const cSun = sunAt(C); sa(cSun, { cx: 30, cy: 34 });
      const gearSh = sv('g', { filter: `url(#${id}blur)` }, C);
      const shs = [0, 1].map(() => sv('line', { stroke: 'rgba(20,10,40,.5)', 'stroke-width': 9, 'stroke-linecap': 'round' }, gearSh));
      const gear = sv('ellipse', { cx: 82, cy: 110, rx: 40, ry: 13, fill: '#c8954a', stroke: '#8a6a3a', 'stroke-width': 3, 'stroke-dasharray': '4 3' }, C);
      const towers = [0, 1].map(() => { const g = sv('g', {}, C); sv('rect', { x: -5, y: -34, width: 10, height: 34, fill: '#b08040' }, g); sv('circle', { cx: 0, cy: -37, r: 3.4, fill: '#ffd27a', filter: `url(#${id}glow)` }, g); return g; });
      const zC = new TZif(C, id);
      // d) sarkaç
      const D = tile(3, 'SARKAÇ'); ground(D, '#7c6c54');
      const dSun = sunAt(D); sa(dSun, { cx: 95, cy: 14 });
      const bobSh = sv('ellipse', { cy: 118, rx: 13, ry: 5, fill: 'rgba(20,10,40,.55)', filter: `url(#${id}blur)` }, D);
      sv('rect', { x: 30, y: 18, width: 5, height: 96, fill: '#b08040' }, D); sv('rect', { x: 155, y: 18, width: 5, height: 96, fill: '#b08040' }, D); sv('rect', { x: 26, y: 14, width: 138, height: 6, fill: '#c8954a' }, D);
      const pend = sv('g', { transform: 'translate(95 20)' }, D);
      sv('line', { x1: 0, y1: 0, x2: 0, y2: 70, stroke: '#c8954a', 'stroke-width': 2 }, pend); sv('circle', { cx: 0, cy: 76, r: 11, fill: '#e8b04a', stroke: '#fff2c8', 'stroke-width': 1 }, pend);
      const zD = new TZif(D, id);
      return (t, dt) => {
        // a: buz erir, gölge kısalır
        const ac = t % 7, melt = smoothstep(1, 6, ac), h = lerp(56, 18, melt);
        sa(ice, { points: `${62},112 ${78},112 ${r2(74 - melt * 2)},${r2(112 - h)} ${r2(68 + melt * 2)},${r2(112 - h * 0.92)}` });
        const shL = h * 1.05; sa(aSh, { x1: 70, y1: 112, x2: r2(70 + shL), y2: r2(112 + shL * 0.22) });
        sa(pud, { rx: r2(8 + melt * 14), ry: r2(3 + melt * 4) });
        if (Math.random() < dt * 6 * (melt > 0 && melt < 1 ? 1 : 0)) drip.spawn(70 + (Math.random() - 0.5) * 10, 112 - h * 0.6, { fill: '#9fd8ff', vy: 40, r0: 1.6, r1: 1, life: 0.5, a: 0.9 });
        drip.update(dt);
        const zaX = 118, inA = zaX < 70 + shL - 4;
        zA.set(zaX, 118, { t, scale: 0.72, burn: inA ? 0 : 0.5, meter: inA ? 1 : 0.7, happy: inA });
        // b: ayna ışını güneşle kayar
        const bu = 0.5 + 0.42 * Math.sin(t * 0.7), bsx = 18 + bu * 70, bsy = 50 - Math.sin(bu * PI) * 36;
        sa(bSun, { cx: r2(bsx), cy: r2(bsy) });
        const tx = 150 - (bsx - 30) * 1.1, tyy = 118;
        sa(beam, { points: `143,72 157,72 ${r2(tx + 12)},${tyy} ${r2(tx - 12)},${tyy}` }); sa(spot, { cx: r2(tx), cy: tyy });
        const zbx = 60 + Math.sin(t * 0.45) * 30, hitB = Math.abs(zbx - tx) < 16;
        zB.set(zbx, 120, { t, scale: 0.7, walk: true, burn: hitB ? 0.7 : 0, meter: hitB ? 0.6 : 1, look: [1, 0] });
        // c: dişli kuleleri döner, gölgeler saat gibi
        const ga = t * 0.9;
        sa(gear, { 'stroke-dashoffset': r2(-t * 18) });
        let zcShade = false;
        towers.forEach((g, k) => {
          const a = ga + k * PI, x = 82 + Math.cos(a) * 26, y = 110 + Math.sin(a) * 8;
          sa(g, { transform: `translate(${r2(x)} ${r2(y)})` });
          const ex = x + 46, ey = y + 12; sa(shs[k], { x1: r2(x), y1: r2(y), x2: r2(ex), y2: r2(ey) });
          const vx = ex - x, vy = ey - y, kk = clamp01(((140 - x) * vx + (120 - y) * vy) / (vx * vx + vy * vy)); if (Math.hypot(x + vx * kk - 140, y + vy * kk - 120) < 7) zcShade = true;
          // derinlik
          if (Math.sin(a) > 0) C.appendChild(g); else C.insertBefore(g, gear.nextSibling);
        });
        zC.set(140, 124, { t, scale: 0.7, burn: zcShade ? 0 : 0.45, meter: zcShade ? 1 : 0.75, happy: zcShade });
        // d: sarkaç yol boyunca salınır
        const pa = Math.sin(t * 1.7) * 0.6; sa(pend, { transform: `translate(95 20) rotate(${r2((-pa * 180) / PI)})` });
        const bx = 95 + Math.sin(pa) * 76; sa(bobSh, { cx: r2(bx) });
        const zdx = 95 + Math.sin(t * 0.5) * 50, inD = Math.abs(zdx - bx) < 13;
        zD.set(zdx, 120, { t, scale: 0.7, walk: true, burn: inD ? 0 : 0.35, meter: inD ? 1 : 0.8, happy: inD });
      };
    },
  },
  {
    k: 'Hazırsın · 11', t: 'Güneş senin elinde', dur: 9,
    b: '64 ada, sekiz takımyıldızı, <em>Sonsuz Gün</em>, her gün yenilenen <em>Günün Adası</em> ve perdede canlanan <em>Gölge Tiyatrosu</em> seni bekliyor. Bu rehbere ayarlardan istediğin zaman dönebilirsin.',
    build(svg, id) {
      tutDefs(svg, id);
      const dio = new TDio(svg, id, { seed: 31 });
      dio.add('cypress', 128, 238, 56, 16); dio.add('house', 274, 246, 46, 32);
      const lines = sv('g', {}, dio.lBg);
      const pts = [[70, 120], [120, 70], [180, 96], [230, 48], [300, 84], [340, 40]];
      const segs = []; for (let i = 0; i < pts.length - 1; i++) segs.push(sv('line', { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1], stroke: 'rgba(255,214,140,.7)', 'stroke-width': 1.2, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, lines));
      const nodes = pts.map((p) => sv('circle', { cx: p[0], cy: p[1], r: 0, fill: '#ffe2a0', filter: `url(#${id}glow)` }, lines));
      const z = new TZif(dio.lAct, id); const sp = new TPuffs(sv('g', { filter: `url(#${id}glow)` }, dio.lFx), 30);
      return (t, dt) => {
        const c = t % 9;
        dio.setSun(lerp(0.02, 0.36, Ease.outCubic(clamp01(c / 3))), t, dt); dio.update();
        const hop = Math.max(0, Math.sin(t * 4.2)) * 10;
        z.set(200, 268, { t, jump: hop, happy: true, scale: 1.5, squash: hop < 1 ? 0.12 : 0, look: [0, -1] });
        for (let i = 0; i < segs.length; i++) sa(segs[i], { 'stroke-dashoffset': r2(1 - clamp01((c - 0.8 - i * 0.45) / 0.45)) });
        nodes.forEach((n, i) => sa(n, { r: r2(clamp01((c - 0.6 - i * 0.45) / 0.3) * (2.6 + Math.sin(t * 3 + i) * 0.6)) }));
        if (Math.random() < dt * 10) sp.spawn(200 + (Math.random() - 0.5) * 220, 230 + Math.random() * 60, { vy: -14, r0: 1.6, r1: 0.4, life: 1.6, a: 0.9, fill: '#ffe9b0' });
        sp.update(dt);
      };
    },
  },
];

const TUT = {
  open: false, i: 0, t: 0, hold: false, from: null, upd: null, token: 0, down: null,
  el: null, segs: [],
  init() {
    this.el = $('#tutorial');
    const box = $('#tSegs');
    TUT_CARDS.forEach((c, i) => { const s = document.createElement('button'); s.className = 'seg tap'; s.setAttribute('aria-label', `Adım ${i + 1}`); s.innerHTML = '<i></i>'; s.addEventListener('click', (e) => { e.stopPropagation(); this.go(i); }); box.appendChild(s); this.segs.push(s); });
    $('#tSkip').addEventListener('click', (e) => { e.stopPropagation(); audio.ui(); this.close(false); });
    $('#tNext').addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
    $('#tPrev').addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
    const st = $('#tStage');
    st.addEventListener('pointerdown', (e) => { audio.unlock(); this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; this.holdTimer = setTimeout(() => { this.hold = true; this.el.classList.add('held'); }, 260); });
    const up = (e) => {
      clearTimeout(this.holdTimer);
      const d = this.down; this.down = null; const wasHold = this.hold; this.hold = false; this.el.classList.remove('held');
      if (!d || e.type === 'pointercancel') return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? this.next() : this.prev(); return; }
      if (wasHold || Math.hypot(dx, dy) > 12) return;
      const r = st.getBoundingClientRect();
      if (e.clientX - r.left < r.width * 0.3) this.prev(); else this.next();
    };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  },
  show(from) {
    if (!this.el) this.init();
    this.from = from; this.open = true; hideToast();
    for (const s of ['title', 'pause', 'settings']) UI.hide(s);
    this.el.classList.add('on');
    this.go(0, true);
  },
  close(play) {
    if (!this.open) return;
    this.open = false; this.upd = null; this.token++;
    Save.markSeen('tutorial');
    this.el.classList.remove('on');
    const tok = this.token; setTimeout(() => { if (!this.open && tok === this.token) { $('#tIllu').innerHTML = ''; } }, 600);
    if (play) { audio.ui(); startStory(Math.min(Save.data.unlocked, STORY_LEVELS - 1)); return; }
    if (this.from === 'pause') UI.show('pause');
    else if (this.from === 'settings') { refreshToggles(); UI.show('settings'); }
    else if (G.state === 'title') UI.show('title');
  },
  next() { if (this.i >= TUT_CARDS.length - 1) { this.close(true); return; } this.go(this.i + 1); },
  prev() { if (this.i > 0) this.go(this.i - 1); },
  go(n, first = false) {
    n = clamp(n, 0, TUT_CARDS.length - 1);
    const dir = n >= this.i ? 1 : -1;
    const card = TUT_CARDS[n], tok = ++this.token;
    if (!first) { audio.whoosh(dir > 0, 0.32, 0.035); audio.ui(); }
    this.i = n; this.t = 0;
    this.segs.forEach((s, k) => { s.style.setProperty('--p', k < n ? 1 : 0); s.classList.toggle('cur', k === n); });
    $('#tNext').textContent = n === TUT_CARDS.length - 1 ? 'Oyna' : 'İleri';
    $('#tPrev').style.visibility = n === 0 ? 'hidden' : 'visible';
    const stage = $('#tStage'); stage.style.setProperty('--dx', dir * 44 + 'px');
    stage.classList.remove('in'); stage.classList.add('out');
    setTimeout(() => {
      if (tok !== this.token) return;
      $('#tK').textContent = card.k; $('#tT').textContent = card.t; $('#tB').innerHTML = card.b;
      const ill = $('#tIllu'); ill.innerHTML = '';
      const svg = sv('svg', { viewBox: '0 0 400 360', preserveAspectRatio: 'xMidYMid meet' }, ill);
      try { this.upd = card.build(svg, 'tu' + n + '_' + tok + '_'); } catch (err) { console.error(err); this.upd = null; }
      if (this.upd) this.upd(0, 0);
      stage.classList.remove('out'); void stage.offsetWidth; stage.classList.add('in');
    }, first ? 0 : 230);
  },
  update(dt) {
    if (!this.open) return;
    if (!this.hold) this.t += dt;
    const card = TUT_CARDS[this.i];
    const p = clamp01(this.t / card.dur);
    this.segs[this.i] && this.segs[this.i].style.setProperty('--p', r2(p));
    if (this.upd && !this.hold) this.upd(this.t, Math.min(dt, 0.05));
    if (this.t >= card.dur && this.i < TUT_CARDS.length - 1) this.go(this.i + 1);
  },
  key(e) {
    if (e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); this.next(); }
    else if (e.code === 'ArrowLeft') this.prev();
    else if (e.code === 'Escape') this.close(false);
  },
};
