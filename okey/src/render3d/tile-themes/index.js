// Taş takımları — İznik Çini, Ebru, Yağlı Boya. Desenler kodla çizilir (paint.js + takım dosyaları),
// boyanan yüzler IndexedDB'de saklanır; DOM taşları blob URL, 3B taşlar CanvasTexture ile beslenir.
// <html data-tiles="..."> değişince (Ayarlar › Görünüm › Taşlar) tüm taşlar yerinde yenilenir.
import * as THREE from 'three';
import { idle, MW, MH, TAU, rng, canvas, MEAS, buildTextures } from './paint.js';
import { CINI } from './cini.js';
import { EBRU } from './ebru.js';
import { OIL } from './oil.js';
import { PT_FONTS } from './fonts.generated.js';
import { DB } from './store.js';

const LAB = { cini: '#1d3e93', ebru: '#22357a', yagli: '#203f9e' };
function numLayout(st, text, k = 1, ny = st.numY) {
  const f = (s) => `${st.weight} ${s}px "${st.font}"`;
  let size = st.numSize * MW * k;
  MEAS.font = f(size);
  const w0 = MEAS.measureText(text).width,
    maxW = st.numMaxW * MW * Math.max(k, 0.9);
  let sx = 1;
  if (w0 > maxW) {
    sx = Math.max(0.8, maxW / w0);
    if (w0 * sx > maxW) {
      size *= maxW / (w0 * sx);
      MEAS.font = f(size);
    }
  }
  const capH = MEAS.measureText('0').actualBoundingBoxAscent,
    w = MEAS.measureText(text).width * sx;
  return { text, font: f(size), size, sx, w, capH, x: MW / 2, y: ny * MH + capH / 2 };
}
function paintKey(st, th, key) {
  const c = canvas(),
    x = c.getContext('2d');
  x.drawImage(st.base, 0, 0);
  const [kind, color, ...rest] = key.split(':'),
    value = rest.join(':'),
    ink = st.ink[color] || st.ink.black;
  if (kind === 'n') {
    st.number(x, numLayout(st, value), ink);
    st.mark(x, color, MW / 2, st.markY * MH, st.markS * MW, ink);
  } else if (kind === 'o') {
    st.okeyMark(x);
    st.number(x, numLayout(st, value, 0.84, 0.41), ink);
    st.mark(x, color, MW / 2, MH * 0.66, st.markS * MW * 0.82, ink);
    st.label(x, 'OKEY', MH * 0.87, 0.1, LAB[th]);
  } else {
    st.paw(x, MW / 2, MH * 0.31, MW * 0.33);
    st.label(x, 'SAHTE', MH * 0.6, 0.1, st.fakeLabelInk);
    st.number(x, numLayout(st, value, 0.42, 0.79), ink);
  }
  return c;
}

/* ═════════════ motor: çizim kuyruğu, önbellek, DOM ve 3B bağlantısı ═════════════ */
const THEMES = { cini: CINI, ebru: EBRU, yagli: OIL };
const META = {
  cini: { body: 0xf3f0e7, back: 0x1d3e93 },
  ebru: { body: 0xefe5cf, back: 0x24396f },
  yagli: { body: 0xe9dcc2, back: 0x1c3f92 },
};
const VER = 'v2';
const OW = 320,
  OH = Math.round(320 * 1.36);
const ALL_NUMS = [];
for (const c of ['red', 'blue', 'black', 'yellow']) for (let v = 1; v <= 13; v++) ALL_NUMS.push(`n:${c}:${v}`);
const S = {}; // tema durumu
const state = (th) => S[th] || (S[th] = { storedP: null, started: false, base: null, back: null, faces: new Map(), want: [], wantSet: new Set(), pend: new Map(), texs: new Map(), running: false, stored: new Map() });
const cur = () => {
  const t = document.documentElement.dataset.tiles;
  return THEMES[t] ? t : '';
};
const renderers = new Set();
let menuTh = '';

function quickBack(th) {
  const c = canvas(OW, OH),
    x = c.getContext('2d'),
    R = rng(5);
  x.beginPath();
  x.roundRect(0, 0, OW, OH, OW * 0.16);
  x.clip();
  if (th === 'cini') {
    const g = x.createLinearGradient(0, 0, 0, OH);
    g.addColorStop(0, '#24479c');
    g.addColorStop(1, '#14306f');
    x.fillStyle = g;
    x.fillRect(0, 0, OW, OH);
    x.lineWidth = OW * 0.07;
    x.strokeStyle = '#f2eee3';
    x.beginPath();
    x.roundRect(OW * 0.075, OW * 0.075, OW * 0.85, OH - OW * 0.15, OW * 0.1);
    x.stroke();
    x.lineWidth = OW * 0.012;
    x.strokeStyle = '#c23a2c';
    x.beginPath();
    x.roundRect(OW * 0.15, OW * 0.15, OW * 0.7, OH - OW * 0.3, OW * 0.05);
    x.stroke();
    x.fillStyle = '#c23a2c';
    x.beginPath();
    x.ellipse(OW / 2, OH * 0.4, OW * 0.1, OW * 0.15, 0, 0, TAU);
    x.fill();
    x.strokeStyle = '#2f9c95';
    x.lineWidth = OW * 0.03;
    x.beginPath();
    x.moveTo(OW / 2, OH * 0.82);
    x.quadraticCurveTo(OW * 0.2, OH * 0.6, OW * 0.3, OH * 0.35);
    x.moveTo(OW / 2, OH * 0.82);
    x.quadraticCurveTo(OW * 0.8, OH * 0.6, OW * 0.7, OH * 0.35);
    x.stroke();
  } else if (th === 'ebru') {
    x.fillStyle = '#efe3c9';
    x.fillRect(0, 0, OW, OH);
    const pal = ['#22366c', '#22366c', '#b55f66', '#cf9d45', '#5c6c7a', '#efe3c9'];
    for (let k = 0; k < 70; k++) {
      x.fillStyle = pal[(R() * pal.length) | 0];
      x.beginPath();
      x.ellipse(R() * OW, R() * OH, 14 + R() * 34, 20 + R() * 46, R() * 3, 0, TAU);
      x.fill();
    }
    x.lineWidth = OW * 0.014;
    x.strokeStyle = '#c9a14a';
    x.beginPath();
    x.roundRect(OW * 0.06, OW * 0.06, OW * 0.88, OH - OW * 0.12, OW * 0.1);
    x.stroke();
  } else {
    const g = x.createLinearGradient(0, 0, 0, OH);
    g.addColorStop(0, '#0f2160');
    g.addColorStop(0.6, '#3566ad');
    g.addColorStop(0.64, '#162048');
    g.addColorStop(1, '#0d1d4a');
    x.fillStyle = g;
    x.fillRect(0, 0, OW, OH);
    x.fillStyle = '#f2c94c';
    x.beginPath();
    x.arc(OW * 0.74, OH * 0.16, OW * 0.07, 0, TAU);
    x.fill();
    x.fillStyle = '#0b1a10';
    x.beginPath();
    x.moveTo(OW * 0.06, OH);
    x.quadraticCurveTo(OW * 0.1, OH * 0.4, OW * 0.17, OH * 0.12);
    x.quadraticCurveTo(OW * 0.26, OH * 0.4, OW * 0.25, OH);
    x.fill();
  }
  return c;
}
function toOut(src, vivid) {
  const c = canvas(OW, OH),
    x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.beginPath();
  x.roundRect(0, 0, OW, OH, OW * 0.16);
  x.clip();
  if (vivid) x.filter = 'saturate(1.18) contrast(1.06)';
  x.drawImage(src, 0, 0, OW, OH);
  x.filter = 'none';
  return c;
}
async function toBlob(c) {
  let b = await new Promise((r) => c.toBlob(r, 'image/webp', 0.9));
  if (!b || b.type !== 'image/webp') b = await new Promise((r) => c.toBlob(r, 'image/png'));
  return b;
}
async function fromBlob(b) {
  try {
    const bmp = await createImageBitmap(b),
      c = canvas(OW, OH);
    c.getContext('2d').drawImage(bmp, 0, 0, OW, OH);
    bmp.close && bmp.close();
    return c;
  } catch {
    return null;
  }
}
async function produce(th, key, make) {
  const id = `${VER}|${th}|${key}`;
  const hit = await DB.get(id);
  if (hit) {
    const c = await fromBlob(hit);
    if (c) return { canvas: c, url: URL.createObjectURL(hit) };
  }
  const out = toOut(await make(), key === 'back');
  const blob = await toBlob(out);
  if (blob) DB.put(id, blob);
  return { canvas: out, url: blob ? URL.createObjectURL(blob) : out.toDataURL() };
}
let fontsP = null;
function loadFonts() {
  if (fontsP) return fontsP;
  const L = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  const X = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
  const list = [
    ['Yeseva One', '400', PT_FONTS.yeseva, L],
    ['Yeseva One', '400', PT_FONTS.yesevaX, X],
    ['Abril Fatface', '400', PT_FONTS.abril, L],
    ['Abril Fatface', '400', PT_FONTS.abrilX, X],
    ['Fraunces', '900', PT_FONTS.fraunces, L],
    ['Fraunces', '900', PT_FONTS.frauncesX, X],
  ];
  fontsP = Promise.all(
    list.map(async ([fam, w, src, range]) => {
      try {
        const f = new FontFace(fam, `url(${src})`, { weight: w, unicodeRange: range });
        document.fonts.add(f);
        await f.load();
      } catch (e) {}
    }),
  );
  return fontsP;
}
function invalidate() {
  for (const r of renderers) {
    try {
      r.invalidate && r.invalidate();
    } catch {}
  }
}
function applyBack() {
  const th = cur(),
    st = th && S[th],
    root = document.documentElement;
  const url = st && (st.back ? st.back.url : st.quickUrl);
  if (url) {
    root.style.setProperty('--pt-back', `url("${url}")`);
    root.classList.add('pt-back');
  } else {
    root.classList.remove('pt-back');
    root.style.removeProperty('--pt-back');
  }
}
function keyOf(el) {
  const d = el.dataset;
  if (!d.color) return '';
  if (d.fake) return `f:${d.color}:${d.value}`;
  const num = el._face && el._face.querySelector('.tile__num');
  return `${d.okey ? 'o' : 'n'}:${d.color}:${num ? num.textContent : d.value}`;
}
function decorate(el) {
  const face = el._face || el.querySelector('.tile__face');
  if (!face) return;
  el._face = face;
  const th = cur();
  if (!th) {
    if (el.classList.contains('pt-ready') || face.style.backgroundImage) {
      el.classList.remove('pt-ready');
      face.style.backgroundImage = '';
    }
    return;
  }
  const st = state(th),
    key = keyOf(el);
  if (!key) return;
  const done = st.faces.get(key);
  if (done && done.url) {
    face.style.backgroundImage = `url("${done.url}")`;
    el.classList.add('pt-ready');
    return;
  }
  el.classList.remove('pt-ready');
  face.style.backgroundImage = st.base ? `url("${st.base.url}")` : '';
  let set = st.pend.get(key);
  if (!set) st.pend.set(key, (set = new Set()));
  set.add(el);
  want(th, key, true);
}
function redecorateAll() {
  document.querySelectorAll('.tile').forEach((el) => {
    if (el._face || el.querySelector('.tile__face')) decorate(el);
  });
}
function want(th, key, urgent) {
  const st = state(th);
  if ((st.faces.get(key) || {}).url || st.wantSet.has(key)) return;
  st.wantSet.add(key);
  urgent ? st.want.unshift(key) : st.want.push(key);
  if (st.started) pump(th);
}
function publish(th, key, res) {
  const st = state(th),
    had = st.faces.get(key) || {};
  const r = { url: res.url || had.url, canvas: res.canvas || had.canvas };
  st.faces.set(key, r);
  if (r.url) {
    const set = st.pend.get(key);
    if (set && cur() === th)
      for (const el of set)
        if (el.isConnected && keyOf(el) === key) {
          el._face.style.backgroundImage = `url("${r.url}")`;
          el.classList.add('pt-ready');
        }
    st.pend.delete(key);
  }
  const t = st.texs.get(key);
  if (r.canvas && t && !t.ok) {
    const x = t.canvas.getContext('2d');
    x.clearRect(0, 0, OW, OH);
    x.drawImage(r.canvas, 0, 0, t.canvas.width, t.canvas.height);
    t.ok = true;
    t.tex.needsUpdate = true;
  }
  invalidate();
}
function store(th, key, out) {
  toBlob(out).then((b) => {
    if (!b) return;
    DB.put(`${VER}|${th}|${key}`, b);
    publish(th, key, { url: URL.createObjectURL(b) });
  });
}
function fromStore(th, key, blob) {
  publish(th, key, { url: URL.createObjectURL(blob) });
  fromBlob(blob).then((c) => c && publish(th, key, { canvas: c }));
}
async function pump(th) {
  const st = state(th);
  if (st.running) return;
  st.running = true;
  try {
    if (st.storedP) await st.storedP;
    while (st.want.length) {
      const t0 = performance.now();
      while (st.want.length && performance.now() - t0 < 28) {
        const key = st.want.shift();
        if (st.faces.has(key)) continue;
        const blob = st.stored.get(key);
        if (blob) {
          st.stored.delete(key);
          st.faces.set(key, {});
          fromStore(th, key, blob);
          continue;
        }
        await ready(th);
        try {
          const out = toOut(paintKey(THEMES[th], th, key));
          publish(th, key, { canvas: out });
          store(th, key, out);
        } catch (e) {
          console.warn('[taşlar] ' + key, e && e.message);
        }
      }
      await idle();
    }
  } finally {
    st.running = false;
  }
}
let texP = null;
function ready(th) {
  const T = THEMES[th];
  return (
    T.__p ||
    (T.__p = (async () => {
      await loadFonts();
      await (texP || (texP = buildTextures()));
      if (T.prepare) await T.prepare();
      T.base = canvas();
      T.faceBase(T.base.getContext('2d'));
    })())
  );
}
async function start(th) {
  const st = state(th);
  if (st.started) return;
  st.started = true;
  const T = THEMES[th];
  try {
    st.quick = quickBack(th);
    st.quickUrl = st.quick.toDataURL('image/png');
    if (cur() === th) applyBack();
  } catch {}
  try {
    loadFonts();
    st.storedP = DB.prefix(`${VER}|${th}|`).then((m) => {
      st.stored = m;
    });
    await st.storedP;
    st.base = await produce(th, 'base', async () => {
      await ready(th);
      return T.base;
    });
    if (cur() === th) redecorateAll();
    pump(th);
    st.back = await produce(th, 'back', async () => {
      await ready(th);
      const c = canvas();
      await T.back(c.getContext('2d'));
      return c;
    });
    publish(th, 'back', st.back);
    if (cur() === th) applyBack();
  } catch (e) {
    console.warn('[taşlar]', e);
  }
}
function onTheme() {
  const th = cur();
  applyBack();
  redecorateAll();
  if (th) {
    start(th);
    ALL_NUMS.forEach((k) => want(th, k, false));
  }
  invalidate();
}
new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tiles'] });

/* ═════════════ dış arayüz ═════════════ */
export const themed = () => !!cur();
export const currentTheme = cur;
export { decorate as decorateTile };

function texKey(s) {
  if (s.kind === 'back') return 'back';
  if (s.kind === 'fake') return `f:${s.color}:${s.value}`;
  return s.kind === 'okey' || s.rep ? `o:${s.color}:${s.value}` : `n:${s.color}:${s.value}`;
}
// 3B taş dokusu: hazırsa boyanmış yüz, değilse geçici olarak fildişi yüz (fallback) çizilir ve
// boyama bitince aynı doku yerinde güncellenir. forced: ayardan bağımsız takım (ana menü).
export function themedTexture(s, fallback, forced) {
  const th = forced || cur(),
    st = state(th);
  if (forced) start(th);
  const key = texKey(s);
  const have = st.texs.get(key);
  if (have) return have.tex;
  const c = canvas(OW, OH),
    x = c.getContext('2d'),
    res = key === 'back' ? st.back : st.faces.get(key);
  let ok = false;
  if (res && res.canvas) {
    x.drawImage(res.canvas, 0, 0);
    ok = true;
  } else if (key === 'back' && st.quick) x.drawImage(st.quick, 0, 0);
  else {
    try {
      x.drawImage(fallback(s).image, 0, 0, OW, OH);
    } catch {}
    if (key !== 'back') want(th, key, true);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  st.texs.set(key, { tex, canvas: c, ok });
  return tex;
}
// Önizleme (Çarşı, Ödüller): bir takımın sırt ('back') ya da yüz (ör. 'n:red:7') görseli, oyundakiyle aynı boyama
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
export async function themeTile(th, key) {
  if (!THEMES[th]) return null;
  start(th);
  const st = state(th);
  if (key !== 'back') want(th, key, true);
  for (let i = 0; i < 400; i++) {
    const r = key === 'back' ? st.back : st.faces.get(key);
    if (r && r.url) return r.url;
    await nap(100);
  }
  return key === 'back' ? st.quickUrl || null : null;
}
/* Ana menü ıstakası: her açılışta sıradaki takım, ayardan bağımsız */
export function menuTheme() {
  if (menuTh) return menuTh;
  const ids = Object.keys(THEMES);
  let i = Math.floor(Math.random() * ids.length);
  try {
    const v = localStorage.getItem('okey.menuTiles');
    i = v === null ? i : (+v + 1) % ids.length;
    localStorage.setItem('okey.menuTiles', String(i));
  } catch {}
  return (menuTh = ids[i]);
}
export const menuTexture = (s, fallback) => themedTexture(s, fallback, menuTheme());
export function menuBodyColor(def) {
  const m = META[menuTheme()];
  return m ? m.body : def;
}
/* 3B malzemeyi canlı yap: ton eşlemesiz; sırtlarda resim kendi ışığını da taşır */
export function vividMaterial(m, back = true) {
  try {
    m.toneMapped = false;
    if (back && m.emissive) {
      m.emissive.setHex(0xffffff);
      m.emissiveMap = m.map;
      m.emissiveIntensity = 0.9;
      m.color.setScalar(0.14);
      if ('envMapIntensity' in m) m.envMapIntensity = 0.04;
      if ('clearcoat' in m) m.clearcoat = 0.12;
      m.roughness = 0.85;
    }
    m.needsUpdate = true;
  } catch {}
  return m;
}
export function unvividMaterial(m) {
  try {
    m.toneMapped = true;
    if (m.emissive) {
      m.emissive.setHex(0);
      m.emissiveMap = null;
      m.emissiveIntensity = 1;
      m.color.setScalar(1);
    }
    if ('envMapIntensity' in m) m.envMapIntensity = 0.25;
    m.roughness = 0.62;
    m.needsUpdate = true;
  } catch {}
  return m;
}
// Sahne kaydı: tema değişince taş gövdesi/sırt rengi uyarlanır ve boyama bitince sahne yeniden çizilir.
export function registerRenderer(r) {
  renderers.add(r);
  const th = cur();
  if (r.__ptTh !== th) {
    r.__ptTh = th;
    try {
      if (!r.__ptDef) r.__ptDef = { body: r.bodyMat && r.bodyMat.color.getHex(), back: r.backMatBody && r.backMatBody.color.getHex() };
      const m = META[th];
      if (r.bodyMat) r.bodyMat.color.setHex(m ? m.body : r.__ptDef.body);
      if (r.backMatBody) {
        r.backMatBody.color.setHex(m ? m.back : r.__ptDef.back);
        r.backMatBody.toneMapped = !m;
        r.backMatBody.needsUpdate = true;
      }
    } catch {}
  }
  return th;
}
export const unregisterRenderer = (r) => renderers.delete(r);

if (cur()) onTheme();
