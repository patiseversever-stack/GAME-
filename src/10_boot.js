<script type="module">
/* =====================================================================
   GÜNDÖNÜMÜ — güneşi sen çevir, gölgeyi sen koru.
   Tek dosyalık mobil WebGL oyunu. Three.js (CDN) + özel post-process,
   prosedürel ada üretimi + DP tabanlı çözülebilirlik doğrulayıcısı,
   Web Audio ile prosedürel ses.
   ===================================================================== */

window.__gdStarted = true;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ---------- motoru yükle (CDN yedekli) ---------- */
const THREE_URLS = [
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js',
  'https://unpkg.com/three@0.170.0/build/three.module.min.js',
];
async function loadThree() {
  for (const u of THREE_URLS) {
    try { return await import(u); } catch (e) { console.warn('three yüklenemedi:', u, e && e.message); }
  }
  return null;
}
function hasWebGL2() {
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
}
$('#btnRetryLoad').addEventListener('click', () => location.reload());
const THREE = hasWebGL2() ? await loadThree() : null;
if (!THREE) {
  $('#loader').classList.add('err');
  if (!hasWebGL2()) $('#loader .lerr div').innerHTML = 'Bu cihaz WebGL 2 desteklemiyor.<br>Güncel bir tarayıcıyla tekrar dene.';
  throw new Error('THREE yok');
}

/* ---------- küçük matematik yardımcıları ---------- */
const PI = Math.PI, TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => clamp01((v - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const smoothstep = (a, b, v) => smooth(invLerp(a, b, v));
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const deg = (d) => (d * PI) / 180;
const Ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t) => -(Math.cos(PI * t) - 1) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * PI) / 3)) + 1),
};
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class RNG {
  constructor(seed) { this.r = mulberry32(seed >>> 0); }
  next() { return this.r(); }
  range(a, b) { return a + (b - a) * this.r(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.r() * arr.length) % arr.length]; }
  chance(p) { return this.r() < p; }
  sign() { return this.r() < 0.5 ? -1 : 1; }
  weighted(entries) { // [[val, w], ...]
    let tot = 0; for (const e of entries) tot += e[1];
    let x = this.r() * tot;
    for (const e of entries) { x -= e[1]; if (x <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  }
}
// değer gürültüsü (kanvas dokuları, kayalar)
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm2(x, y, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise2(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }
const hexToRgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

/* ---------- kayıt ---------- */
const SAVE_KEY = 'gundonumu.v1';
const Save = {
  data: null,
  defaults() {
    return { v: 1, levels: {}, unlocked: 0, endlessBest: 0, endlessBestIslands: 0, daily: { date: '', stars: 0 },
      settings: { sfx: true, music: true, haptics: true, quality: 'auto' }, seen: {}, skin: 0, fails: {}, finished: false, theater: [] };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    const def = this.defaults();
    this.data = d && d.v === 1 ? Object.assign(def, d, { settings: Object.assign(def.settings, d.settings || {}), seen: d.seen || {}, levels: d.levels || {} }) : def;
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* özel sekme vb. */ } },
  stars(i) { const l = this.data.levels[i]; return l ? l.stars.reduce((a, b) => a + (b ? 1 : 0), 0) : 0; },
  totalStars() { let t = 0; for (const k in this.data.levels) t += this.stars(+k); return t; },
  seen(key) { return !!this.data.seen[key]; },
  markSeen(key) { this.data.seen[key] = 1; this.save(); },
};
Save.load();
