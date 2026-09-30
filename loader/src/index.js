// Gece Postası yükleme ekranı — çalışma zamanı.
//
// Üç evre ayrı ayrı kontrol edilir:  giriş (intro)  →  döngü (loop)  →  çıkış (outro)
//   • giriş : çizgilerden gazete sayfası kurulur, harfler basılır, sayfalar farklı derinliklerde kayıp merkezi sayfayı açar
//   • döngü : merkezi bulmaca etrafında dönen dizgi taşları, ışık süpürmesi, baskı nabzı (kesintisiz, dikişsiz)
//   • çıkış : merkezi sayfa oyunun GERÇEK ilk kadrajındaki kâğıt köşelerine morph olur, masa/sayfalar çözülür
// Animasyonlar yalnızca transform/opacity kullanır (Web Animations API, compositor'da çalışır) — oyun ana iş
// parçacığını 2-3 sn kilitlese bile akıcı kalır. Yüzde/sahte ilerleme yoktur; yalnızca gerçek olaylar (görsel çözüldü,
// sayfa kuruluyor, ilk kare çizildi) görünümü değiştirir.
import { PW, PH, clamp, mix, predictOverviewQuad, centroid, scaleQuad, moveQuad, lerpQuad, quadBounds, transformQuad, homography, offsetQuad, roundedLoop, pointOnLoop } from './geometry.js';
import { heroMarkup, sheetArt, svgURL, ALPHABET, TR_SPECIAL, SERIF, SANS, NOISE } from './art.js';
import { LETTERS } from './data.generated.js';

// ---- Süreler (ms) ----------------------------------------------------------------------------
export const T = { INTRO: 2300, OUTRO: 800, QUICK: 170, BELT_SPEED: 34 /* px/sn */, SHINE: 8200, PULSE: 9600 };
const EASE = { out: 'cubic-bezier(.16,1,.3,1)', inOut: 'cubic-bezier(.65,0,.35,1)', soft: 'cubic-bezier(.45,.05,.15,1)', stamp: 'cubic-bezier(.2,.85,.3,1.15)', lin: 'linear' };
const bez = (x1, y1, x2, y2) => { // JS tarafı için kübik Bézier (çıkış morph'u)
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => { let t = x; for (let i = 0; i < 6; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; } return Y(clamp(t, 0, 1)); };
};
const easeMorph = bez(.65, 0, .2, 1);

const STAMP = [{ opacity: 0, transform: 'translateY(-7px) scale(1.5)' }, { opacity: 1, transform: 'translateY(1px) scale(.93)', offset: .46 }, { opacity: 1, transform: 'translateY(0) scale(1.035)', offset: .72 }, { opacity: 1, transform: 'none' }];

// N1 (oluşan sayfa): 560x400 sanal birim. Mini bulmaca = oyundaki gerçek cevaplar (bir harf, iki cevap).
const N1 = { w: 560, h: 361, cols: 8, rows: 8, cs: 34, gx: 22, gy: 68 };
const N1_WORDS = [ // [kelime, satır, sütun, yön]  (sütun 1 boyunca PAPİRÜS, satırlara dallanan PORTRE/PUSULA/RİTİM/SONAT)
  ['PAPİRÜS', 1, 1, 'd'], ['PORTRE', 1, 1, 'a'], ['PUSULA', 3, 1, 'a'], ['RİTİM', 5, 1, 'a'], ['SONAT', 7, 1, 'a'],
];
function n1Letters() {
  const seen = new Map(), out = [];
  for (const [w, r, c, d] of N1_WORDS) [...w].forEach((ch, i) => { const rr = r + (d === 'd' ? i : 0), cc = c + (d === 'a' ? i : 0), k = rr + ',' + cc; if (!seen.has(k)) { seen.set(k, 1); out.push([rr, cc, ch]); } });
  return out;
}
function n1Markup() {
  const { cs, gx, gy, cols, rows } = N1, gw = cols * cs, gh = rows * cs, letters = n1Letters(), has = new Set(letters.map(l => l[0] + ',' + l[1]));
  let blocks = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = gx + c * cs, y = gy + r * cs, k = r + ',' + c;
    if (has.has(k)) { blocks += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="#f2f1e1"/>`; continue; }
    blocks += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="#c3d0c0"/>`;
    blocks += `<rect x="${x + 5}" y="${y + 11}" width="${cs - 10}" height="5" rx="2.5" fill="#182e25" fill-opacity=".32"/><rect x="${x + 5}" y="${y + 21}" width="${(cs - 10) * .6}" height="5" rx="2.5" fill="#182e25" fill-opacity=".26"/>`;
  }
  // haber sütunları: 8 grup (her grup soldan sağa yazılır)
  const colX = gx + gw + 26, colW = N1.w - colX - 22; let cols8 = '';
  const seed = [.92, .7, .86, .58, .95, .74, .88, .5];
  for (let g = 0; g < 8; g++) {
    const x = colX + (g % 2) * (colW / 2 + 5), y = gy + 100 + Math.floor(g / 2) * 46; let bars = '';
    for (let i = 0; i < 5; i++) bars += `<rect x="0" y="${i * 9}" width="${(colW / 2 - 5) * (i === 4 ? seed[g] * .6 : .78 + ((i * 7 + g * 3) % 5) * .055)}" height="4.4" rx="2.2" fill="#182e25" fill-opacity=".27"/>`;
    cols8 += `<div class="gp-n1-g" data-k="n1col" style="left:${x}px;top:${y}px"><svg width="${colW / 2}" height="44" style="width:${colW / 2}px;height:44px">${bars}</svg></div>`;
  }
  const lt = letters.map(([r, c, ch], i) => `<div class="gp-n1-l" data-k="n1let" data-i="${i}" style="left:${gx + c * cs}px;top:${gy + r * cs}px">${ch}</div>`).join('');
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
  <div class="gp-n1-bar" data-k="n1col" style="left:${colX}px;top:${gy + 86}px;width:${colW * .86}px;height:8px"></div>
  ${cols8}${lt}
</div>`;
}

const N1_CSS = `
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

let cssInjected = false;
function injectCSS() { if (cssInjected) return; cssInjected = true; const s = document.createElement('style'); s.id = 'gp-loader-n1'; s.textContent = N1_CSS; document.head.appendChild(s); }

// ---------------------------------------------------------------------------------------------
export function createLoader(root, opts = {}) {
  injectCSS();
  const seekMode = opts.mode === 'seek';
  const doc = root.ownerDocument, win = doc.defaultView;
  const state = { phase: 'boot', t0: 0, outroAt: 0, done: false, failed: false, quad: null, stage: 'boot', lastMsg: 0, pendingMsg: null };
  const anims = { intro: [], loop: [], outro: [] };
  const q = (k, all) => all ? [...root.querySelectorAll(`[data-k="${k}"]`)] : root.querySelector(`[data-k="${k}"]`);
  let L = null, reduce = false, lite = false;
  const listeners = {};
  const emit = (n, d) => { (listeners[n] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }); root.dispatchEvent(new CustomEvent('gp-loader:' + n, { detail: d })); };

  const settings = () => { try { return JSON.parse(win.localStorage.getItem('gece-postasi-connected-v3') || 'null')?.settings || {}; } catch { return {}; } };
  const viewport = () => {
    if (opts.size) return { w: opts.size.w, h: opts.size.h };
    return { w: Math.max(240, doc.documentElement.clientWidth || win.innerWidth), h: Math.round(win.visualViewport?.height || win.innerHeight) };
  };

  // ---- DOM --------------------------------------------------------------------------------
  function buildDOM() {
    root.classList.add('gp');
    const st = opts.settings || settings();
    const theme = opts.theme || (st.theme === 'day' ? 'day' : 'night');
    root.setAttribute('data-theme', theme);
    const msg = root.querySelector('#load-message')?.textContent || 'Bir sayfa. Bir dünya.';
    root.innerHTML = `
<div class="gp-ground"></div>
<div class="gp-back" data-k="back"><div class="gp-belt" data-k="belt"></div></div>
<div class="gp-cam" data-k="cam"><div class="gp-quad" data-k="quad">${heroMarkup()}</div></div>
<div class="gp-front" data-k="front"></div>
<div class="gp-ui" data-k="ui"><div class="gp-chipui" data-k="chip"><span class="gp-mono">GP</span><span class="gp-sep"></span><span class="gp-say"><b>BASKI HAZIRLANIYOR</b><p id="load-message">${msg}</p></span></div></div>
<div class="gp-sr" role="status" aria-live="polite" data-k="live">Baskı hazırlanıyor</div>`;
    root.setAttribute('role', 'progressbar'); root.setAttribute('aria-busy', 'true'); root.setAttribute('aria-label', 'Gece Postası yükleniyor');
    root.removeAttribute('aria-valuenow'); // belirsiz (sahte yüzde yok)
  }

  // ---- Yerleşim -----------------------------------------------------------------------------
  function computeLayout() {
    const { w: vw, h: vh } = viewport(), land = vw > vh, coarse = opts.coarse ?? win.matchMedia?.('(pointer:coarse)').matches ?? false;
    const pred = predictOverviewQuad(vw, vh, coarse), pb = quadBounds(pred), pc = centroid(pred);
    const chipH = 46;
    let k, cx, cy;
    if (land) {
      const padTop = 32, gap = 34, padBot = 10;
      k = Math.min(.8, (vh - padTop - gap - chipH - padBot) / pb.h, vw * .7 / pb.w);
      cx = vw / 2; cy = padTop + pb.h * k / 2;
    } else {
      k = Math.min(.96, (vw - 30) / pb.w);
      cx = vw / 2; cy = vh * .43;
    }
    const rest = moveQuad(scaleQuad(pred, k, pc), cx - pc.x, cy - pc.y), rb = quadBounds(rest);
    const chipTop = land ? Math.min(vh - chipH - 8, rb.b + 32) : rb.b + clamp(vh * .07, 44, 70);
    return { vw, vh, land, coarse, pred, rest, rb, cx, cy, hw: rb.w, hh: rb.h, chipTop, P: clamp(vh * 1.75, 520, 1800) };
  }

  function applyLayout() {
    L = computeLayout();
    const ui = q('chip'); ui.style.top = L.chipTop + 'px';
    const quad = q('quad'); if (state.phase !== 'outro') quad.style.transform = homography(PW, PH, L.rest);
    for (const k of ['back', 'front']) { const e = q(k); e.style.perspective = L.P + 'px'; e.style.perspectiveOrigin = `${L.cx}px ${L.cy}px`; }
  }

  // ---- Yüzen sayfalar ---------------------------------------------------------------------
  // Her sayfa: dış eleman (giriş animasyonu) > iç eleman (döngüde hafif süzülme). Konumlar hero merkezine göre.
  function sheetSpecs() {
    const { hw, hh, cx, cy, land, vw, vh } = L;
    // [ad, tür, tohum, genişlik(hw), dinlenme merkezi(dx,dy hw/hh birimleri), z, rotZ, rotY, rotX, opaklık, başlangıç ofseti(px), giriş gecikmesi, süre, katman]
    const A = land ? [
      ['m1', 'photo', 3, .47, [-.72, -.34], -30, -6, 15, 3, .97, [-.75 * hw - 80, 0], 1250, 900, 'back'],
      ['m2', 'clues', 5, .56, [.74, .36], -50, 5, -13, 3, .96, [.75 * hw + 80, 0], 1350, 900, 'back'],
      ['f1', 'front', 7, .34, [.86, -.56], -150, 9, -10, 4, .5, [0, -hh], 1500, 900, 'back', 'far'],
      ['f2', 'grid', 9, .46, [-.9, .55], -170, -10, 12, 4, .5, [0, hh], 1550, 900, 'back', 'far'],
    ] : [
      ['m1', 'photo', 3, .55, [-.42, -1.05], -30, -6, 10, 3, .97, [0, -hh * 2.4], 1250, 900, 'back'],
      ['m2', 'clues', 5, .7, [.34, 1.12], -50, 5, -9, 3, .96, [0, hh * 2.4], 1350, 900, 'back'],
      ['f1', 'front', 7, .4, [.62, -1.6], -150, 9, -8, 4, .5, [0, -hh * 2], 1500, 900, 'back', 'far'],
      ['f2', 'grid', 9, .55, [-.52, 1.75], -170, -10, 9, 4, .5, [0, hh * 2], 1550, 900, 'back', 'far'],
    ];
    return A.map(([id, kind, seed, wRel, [dx, dy], z, rz, ry, rx, op, [ox, oy], delay, dur, layer, cls]) => ({ id, kind, seed, w: wRel * hw, x: cx + dx * hw, y: cy + dy * hh, z, rz, ry, rx, op, ox, oy, delay, dur, layer, cls }));
  }

  const tf = (x, y, z, rx, ry, rz, s = 1) => `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`;

  function buildSheets() {
    q('back').querySelectorAll('.gp-sheet').forEach(e => e.remove());
    q('front').innerHTML = '';
    const back = q('back'), front = q('front');
    L.sheets = [];
    if (lite) return;
    for (const s of sheetSpecs()) {
      const art = sheetArt(s.kind, s.seed), h = s.w * art.h / art.w;
      const el = doc.createElement('div'); el.className = 'gp-sheet' + (s.cls ? ' ' + s.cls : ''); el.style.width = s.w + 'px'; el.style.height = h + 'px'; el.dataset.sheet = s.id;
      el.style.backgroundImage = art.bg; el.style.backgroundSize = '200px 200px,100% 100%';
      el.innerHTML = '<div class="gp-sheet-in"><div class="gp-gloss"></div></div>';
      back.appendChild(el); L.sheets.push({ ...s, el, h });
    }
    // Giriş sayfaları: N1 (oluşan sayfa, merkezde) ve N2 (ön sayfa, geçiş yapan)
    const w1 = L.hw * 1.03, k1 = w1 / N1.w, h1 = N1.h * k1;
    const n1 = doc.createElement('div'); n1.className = 'gp-sheet gp-sheet-n1'; n1.style.width = w1 + 'px'; n1.style.height = h1 + 'px'; n1.dataset.sheet = 'n1';
    n1.style.backgroundImage = 'none'; n1.style.background = 'transparent'; n1.style.boxShadow = 'none';
    n1.innerHTML = n1Markup(); n1.firstElementChild.style.transform = `scale(${k1})`; front.appendChild(n1);
    L.n1 = { el: n1, w: w1, h: h1, k: k1 };
    const a2 = sheetArt('front', 13), w2 = L.hw * (L.land ? .6 : .72), h2 = w2 * a2.h / a2.w;
    const n2 = doc.createElement('div'); n2.className = 'gp-sheet'; n2.style.width = w2 + 'px'; n2.style.height = h2 + 'px'; n2.dataset.sheet = 'n2';
    n2.style.backgroundImage = a2.bg; n2.style.backgroundSize = '200px 200px,100% 100%'; n2.innerHTML = '<div class="gp-gloss" style="position:absolute;inset:0;border-radius:inherit;background:linear-gradient(105deg,rgba(255,255,255,.3),rgba(255,255,255,0) 38%,rgba(0,0,0,.09))"></div>';
    front.appendChild(n2); L.n2 = { el: n2, w: w2, h: h2 };
    // başlangıç durumu (animasyon yoksa da doğru görünsün)
    for (const s of L.sheets) s.el.style.transform = tf(s.x - s.w / 2 + s.ox, s.y - s.h / 2 + s.oy, s.z, s.rx, s.ry, s.rz);
    n1.style.transform = tf(L.cx - w1 / 2, L.cy - h1 / 2, 50, 0, 0, 0);
    n2.style.transform = tf(-w2 * 2, L.cy - h2 / 2, 30, 0, 0, 0); n2.style.opacity = 0;
  }

  // ---- Harf bandı -------------------------------------------------------------------------------
  function buildBelt() {
    const belt = q('belt'); belt.innerHTML = '';
    L.belt = null;
    if (reduce) return;
    const path = roundedLoop(offsetQuad(L.rest, 17), 16, 6), N = ALPHABET.length;
    L.belt = { path, N, period: path.len / T.BELT_SPEED * 1000 };
    const frag = doc.createDocumentFragment();
    ALPHABET.forEach((ch, i) => { const c = doc.createElement('div'); c.className = 'gp-chip' + (TR_SPECIAL.has(ch) ? ' tr' : ''); c.textContent = ch; c.dataset.i = i; frag.appendChild(c); });
    belt.appendChild(frag);
  }

  // ---- Animasyon yardımcıları --------------------------------------------------------------------
  const reg = (phase, el, frames, o = {}) => {
    if (!el) return null;
    const a = el.animate(frames, { duration: o.d, delay: o.t || 0, easing: o.e || 'linear', fill: 'both', iterations: o.n || 1 });
    a.pause(); a.__phase = phase; anims[phase].push(a); return a;
  };
  const clearAnims = phase => { for (const a of anims[phase]) { try { a.cancel(); } catch { /* */ } } anims[phase].length = 0; };

  function makeIntro() {
    clearAnims('intro');
    const R = (k, f, o) => q(k, false) && reg('intro', q(k), f, o), RA = (k, f, o, stagger = 0) => q(k, true).forEach((e, i) => reg('intro', e, f, { ...o, t: (o.t || 0) + i * stagger }));
    const o0 = [{ opacity: 0 }, { opacity: 1 }];
    // --- N1: oluşan sayfa (çizgiler → başlık → sütunlar → bulmaca kareleri → harfler) ---
    R('n1paper', [{ transform: 'scaleY(.012)', opacity: 0 }, { transform: 'scaleY(.012)', opacity: 1, offset: .1 }, { transform: 'scaleY(1)', opacity: 1 }], { d: 440, e: EASE.out });
    R('n1title', STAMP, { d: 400, t: 150, e: EASE.out });
    R('n1date', o0, { d: 300, t: 380 });
    R('n1ruleA', [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { d: 480, t: 140, e: EASE.out });
    R('n1ruleB', [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { d: 480, t: 200, e: EASE.out });
    R('n1gbg', [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { d: 480, t: 240, e: EASE.out });
    R('n1latH', [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { d: 600, t: 290, e: EASE.out });
    R('n1latV', [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { d: 600, t: 340, e: EASE.out });
    R('n1blocks', [{ opacity: 0 }, { opacity: 1 }], { d: 380, t: 620, e: EASE.soft });
    R('n1frame', [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { d: 420, t: 480, e: EASE.out });
    R('n1photo', o0, { d: 360, t: 520 });
    RA('n1col', [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { d: 330, t: 520, e: EASE.out }, 50);
    RA('n1let', STAMP, { d: 430, t: 820, e: EASE.stamp }, 34);
    // --- Merkezi sayfa: N1'in altında hazırlanır, N1 çekilince açığa çıkar ---
    reg('intro', q('cam'), [{ opacity: 0, transform: 'scale(1.045)' }, { opacity: 1, transform: 'scale(1.045)', offset: .3 }, { opacity: 1, transform: 'scale(1)' }], { d: T.INTRO - 200, e: EASE.soft });
    // cam'in dönüşüm orijini: hero merkezi
    q('cam').style.transformOrigin = `${L.cx}px ${L.cy}px`;
    RA('letters', o0, { d: 1 }); // yer tutucu (harf nabzı döngüde)
    // Ön sayfalar: N1 sola, N2 sağa doğru kayıp merkezi sayfayı açar (kontrollü hızlanma / yavaşlama)
    if (L.n1) {
      const { w, h } = L.n1, x0 = L.cx - w / 2, y0 = L.cy - h / 2;
      reg('intro', L.n1.el, [
        { transform: tf(x0, y0, 50, 0, 0, 0), opacity: 1 }, { transform: tf(x0, y0, 50, 0, 0, 0), opacity: 1, offset: .58 },
        { transform: tf(x0 - L.hw * 1.45 - w * .2, y0 - h * .05, 90, 4, 16, -5), opacity: 1 },
      ], { d: T.INTRO, e: EASE.inOut });
      const w2 = L.n2.w, h2 = L.n2.h;
      reg('intro', L.n2.el, [
        { transform: tf(L.cx - L.hw * 1.3 - w2, L.cy - h2 / 2 - L.hh * .04, 30, 3, -14, 4), opacity: 0, offset: 0 },
        { transform: tf(L.cx - L.hw * 1.3 - w2, L.cy - h2 / 2 - L.hh * .04, 30, 3, -14, 4), opacity: 1, offset: .5 },
        { transform: tf(L.cx + L.hw * 1.35, L.cy - h2 / 2 + L.hh * .05, 70, 3, -10, 6), opacity: 1 },
      ], { d: T.INTRO, e: EASE.inOut });
    }
    // Arka sayfalar: kenarlardan süzülerek yerlerine oturur
    for (const s of L.sheets || []) {
      const rest = tf(s.x - s.w / 2, s.y - s.h / 2, s.z, s.rx, s.ry, s.rz), from = tf(s.x - s.w / 2 + s.ox, s.y - s.h / 2 + s.oy, s.z - 40, s.rx + 4, s.ry + (s.ry > 0 ? 10 : -10), s.rz + (s.rz > 0 ? 6 : -6));
      reg('intro', s.el, [{ transform: from, opacity: 0 }, { transform: rest, opacity: s.op }], { d: s.dur, t: s.delay, e: EASE.out });
    }
    // Harf bandı ve durum kartı
    reg('intro', q('belt'), o0, { d: 520, t: 1800, e: EASE.soft });
    reg('intro', q('chip'), [{ opacity: 0, transform: 'translate(-50%,8px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { d: 480, t: 240, e: EASE.out });
  }

  function makeLoop() {
    clearAnims('loop');
    const inf = (el, frames, o) => reg('loop', el, frames, { ...o, n: Infinity });
    // Harf bandı: 32 dizgi taşı sabit hızla kapalı yolda döner (tam tur = dikişsiz)
    if (L.belt) {
      const { path, N, period } = L.belt, M = 96, frames = [];
      for (let k = 0; k <= M; k++) { const p = pointOnLoop(path, path.len * k / M); frames.push({ transform: `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`, offset: k / M }); }
      q('belt').querySelectorAll('.gp-chip').forEach((c, i) => inf(c, frames, { d: period, t: -period * i / N, e: 'linear' }));
    }
    // Işık süpürmesi (kâğıt üzerinde yumuşak, dikiş noktasında sayfa dışında)
    inf(q('shine'), [{ transform: 'translateX(-780px) skewX(-9deg)', offset: 0, easing: EASE.soft }, { transform: 'translateX(1900px) skewX(-9deg)', offset: .46 }, { transform: 'translateX(1900px) skewX(-9deg)', offset: 1 }], { d: T.SHINE });
    // Baskı nabzı: basılı harfler sırayla hafifçe "tekrar basılır"
    q('letters', false)?.querySelectorAll('.gp-ltr').forEach((e, i, all) => inf(e, [
      { transform: 'scale(1)', offset: 0 }, { transform: 'scale(1.11)', offset: .025, easing: EASE.out }, { transform: 'scale(.985)', offset: .055 }, { transform: 'scale(1)', offset: .085 }, { transform: 'scale(1)', offset: 1 },
    ], { d: T.PULSE, t: -T.PULSE * i / all.length, e: 'linear' }));
    // Arka sayfalar: çok hafif süzülme (iç eleman)
    (L.sheets || []).forEach((s, i) => {
      const a = (s.cls === 'far' ? 3 : 5), p = 7600 + i * 1700, inner = s.el.firstElementChild;
      inf(inner, [{ transform: 'translateY(0) rotate(0deg)', offset: 0, easing: EASE.soft }, { transform: `translateY(${a}px) rotate(${i % 2 ? .5 : -.5}deg)`, offset: .5, easing: EASE.soft }, { transform: 'translateY(0) rotate(0deg)', offset: 1 }], { d: p, t: -p * (i * .21) });
    });
  }

  // ---- Zaman kontrolü ---------------------------------------------------------------------------
  function playAll() {
    const base = doc.timeline.currentTime;
    const el = state.now ?? 0;
    for (const a of [...anims.intro, ...anims.loop]) { a.startTime = base - el; }
  }
  function seekPhase(phase, ms) { for (const a of anims[phase]) { a.pause(); a.currentTime = ms; } }

  // ---- Çıkış --------------------------------------------------------------------------------------
  let rafId = 0;
  function readCamMatrix() {
    const cam = q('cam'), m = new win.DOMMatrix(win.getComputedStyle(cam).transform === 'none' ? undefined : win.getComputedStyle(cam).transform);
    // cam, transform-origin = hero merkezi; ekran uzayına çevir: T(o) * M * T(-o)
    const o = { x: L.cx, y: L.cy };
    const M = new win.DOMMatrix().translate(o.x, o.y).multiply(m).translate(-o.x, -o.y);
    return { a: M.a, b: M.b, c: M.c, d: M.d, e: M.e, f: M.f };
  }

  function startOutro(o = {}) {
    if (state.phase === 'outro' || state.phase === 'done') return;
    const quick = !!o.quick;
    state.phase = 'outro'; root.dataset.state = 'outro'; root.setAttribute('aria-busy', 'false'); performance.mark?.('gp-outro');
    const cam = q('cam'), quad = q('quad');
    // 1) mevcut (ara) sayfa dörtgenini yakala: cam dönüşümü uygulanmış dinlenme dörtgeni
    let start = L.rest;
    try { if (anims.intro.length) start = transformQuad(L.rest, readCamMatrix()); } catch { /* */ }
    const camOp = parseFloat(win.getComputedStyle(cam).opacity || '1');
    anims.intro.filter(a => a.effect?.target === cam).forEach(a => a.cancel());
    cam.style.transform = 'none'; cam.style.opacity = '';
    state.start = start; state.camOp = isNaN(camOp) ? 1 : camOp;
    // 2) çıkış animasyonları (compositor)
    clearAnims('outro');
    const O = (el, frames, op) => reg('outro', el, frames, op);
    const dur = quick ? T.QUICK : T.OUTRO;
    if (quick) {
      O(root, [{ opacity: 1 }, { opacity: 0 }], { d: T.QUICK, e: 'ease-out' });
    } else {
      O(cam, [{ opacity: state.camOp }, { opacity: 1, offset: .2 }, { opacity: 1 }], { d: dur });
      O(q('back'), [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.07)' }], { d: 470, e: EASE.soft });
      O(q('front'), [{ opacity: 1 }, { opacity: 0 }], { d: 260, e: 'ease-out' });
      O(q('ui'), [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(10px)' }], { d: 280, e: 'ease-out' });
      O(root.querySelector('.gp-ground'), [{ opacity: 1 }, { opacity: 1, offset: .25 }, { opacity: 0 }], { d: 620, e: 'ease-in-out' });
      O(q('tint'), [{ opacity: 0 }, { opacity: 1 }], { d: 520, t: 120, e: 'ease-in' });
      O(quad, [{ opacity: 1 }, { opacity: 1, offset: .52 }, { opacity: 0 }], { d: dur, e: 'linear' });
    }
    if (seekMode) { state.outroAt = 0; return; }
    for (const a of anims.outro) a.play();
    state.outroAt = performance.now();
    tick();
  }

  function liveQuad() { let g = null; try { g = opts.getQuad?.() || state.quad?.(); } catch { /* */ } return g && g.length === 4 && g.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)) ? g : L.pred; }

  function applyOutro(t) { // t: ms (çıkış başlangıcından)
    const quad = q('quad'), quick = root.dataset.quick === '1';
    if (!quick) {
      const p = easeMorph(clamp(t / (T.OUTRO * .82), 0, 1));
      quad.style.transform = homography(PW, PH, lerpQuad(state.start, liveQuad(), p));
    }
  }
  function tick() {
    if (state.phase !== 'outro') return;
    const t = performance.now() - state.outroAt;
    applyOutro(t);
    if (t >= (root.dataset.quick === '1' ? T.QUICK : T.OUTRO) + 30) { finish(); return; }
    rafId = win.requestAnimationFrame(tick);
  }
  function finish() {
    if (state.done) return;
    state.done = true; state.phase = 'done'; root.dataset.state = 'done';
    win.cancelAnimationFrame(rafId);
    api.destroy(); performance.mark?.('gp-done');
    root.hidden = true; root.remove?.();
    emit('done', { at: performance.now() });
  }

  // ---- Başlat ----------------------------------------------------------------------------------------
  function init() {
    const st = opts.settings || settings();
    reduce = opts.reduceMotion ?? (!!win.matchMedia?.('(prefers-reduced-motion:reduce)').matches || st.motion === false);
    lite = opts.lite ?? (!!(win.navigator.deviceMemory && win.navigator.deviceMemory <= 2) || reduce);
    buildDOM(); applyLayout(); buildSheets(); buildBelt();
    root.dataset.state = 'intro'; state.phase = 'intro'; performance.mark?.('gp-start');
    if (reduce) { makeCalm(); } else { makeIntro(); makeLoop(); }
    if (!seekMode) { state.now = 0; state.t0 = performance.now(); playAll(); }
    win.addEventListener('resize', onResize); win.addEventListener('orientationchange', onResize);
  }

  // Hareketi azalt: yalnızca nazik görünme; dönen/kayan öğe yok.
  function makeCalm() {
    clearAnims('intro'); clearAnims('loop');
    reg('intro', q('cam'), [{ opacity: 0 }, { opacity: 1 }], { d: 360, e: EASE.soft });
    reg('intro', q('chip'), [{ opacity: 0, transform: 'translate(-50%,0)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { d: 360, e: EASE.soft });
    q('front').innerHTML = '';
    root.querySelectorAll('.gp-sheet').forEach(e => e.remove());
    q('front', false) && (q('front').style.display = 'none');
    q('back', false) && (q('back').style.display = 'none');
    q('shine') && (q('shine').style.display = 'none');
  }

  let resizeTimer = 0;
  function onResize() {
    if (state.phase === 'outro' || state.phase === 'done') return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const el = state.phase === 'intro' || state.phase === 'loop' ? performance.now() - state.t0 : 0;
      applyLayout(); buildSheets(); buildBelt();
      if (!reduce) { makeIntro(); makeLoop(); }
      state.now = el; if (!seekMode) playAll();
    }, 120);
  }

  // ---- Genel API ---------------------------------------------------------------------------------------
  const api = {
    get phase() { return state.phase; }, get layout() { return L; },
    on(n, f) { (listeners[n] ||= []).push(f); return api; },

    // Oyundan gelen GERÇEK olaylar ------------------------------------------------------------
    stage(name) { state.stage = name; root.dataset.stage = name; performance.mark?.('gp-stage-' + name); if (name === 'build') api.message('Sayfa dizgiye giriyor'); return api; },
    message(text) {
      const el = root.querySelector('#load-message'); if (!el) return api;
      const live = q('live'); if (live) live.textContent = text;
      const now = performance.now(), wait = Math.max(0, 480 - (now - state.lastMsg));
      clearTimeout(state.msgTimer);
      state.msgTimer = setTimeout(() => { el.textContent = text; state.lastMsg = performance.now(); }, wait);
      return api;
    },
    asset(key, image) { // bir görsel gerçekten çözüldü → fotoğraf bloğunda "banyo" animasyonuyla belirir
      const box = root.querySelector(`.gp-photo[data-photo="${key}"]`); if (!box || !image) return api;
      const cv = box.querySelector('canvas'), w = 240, h = Math.round(240 * box.offsetHeight / Math.max(1, box.offsetWidth)) || 240;
      try {
        cv.width = w; cv.height = h; const c = cv.getContext('2d'), r = Math.max(w / image.width, h / image.height), sw = w / r, sh = h / r;
        c.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, w, h);
        const a = cv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 720, easing: EASE.soft, fill: 'forwards' }); if (seekMode) a.finish();
      } catch { /* */ }
      return api;
    },
    // Sonraki kareye kadar bekle (yükleyici yeni durumu çizebilsin diye, ağır senkron iş öncesi)
    yield() { return new Promise(res => { let d = false; const go = () => { if (!d) { d = true; res(); } }; win.requestAnimationFrame(() => win.requestAnimationFrame(go)); setTimeout(go, 90); }); },
    built() { return api; },

    // Oyun hazır: ilk kare çizilince çıkışı başlat. project(x,y) → ekran noktası (Posta.screenPoint); frames() → çizilen kare sayısı
    ready(o = {}) {
      if (state.phase === 'outro' || state.phase === 'done') return api;
      state.readyRequested = true; performance.mark?.('gp-ready-called');
      const project = o.project;
      if (project) state.quad = () => [[0, 0], [PW, 0], [PW, PH], [0, PH]].map(([x, y]) => project(x, y));
      const go = () => {
        if (state.phase === 'outro' || state.phase === 'done') return;
        api.stage('frame');
        const elapsed = performance.now() - state.t0;
        root.dataset.quick = (elapsed < 140 || reduce) ? '1' : '0';
        startOutro({ quick: root.dataset.quick === '1' });
      };
      if (!o.frames) { win.requestAnimationFrame(() => win.requestAnimationFrame(go)); return api; }
      const f0 = o.frames(), t0 = performance.now();
      const poll = () => { // ilk gerçek kare çizildi mi?
        if (performance.now() - t0 > (o.timeout ?? 4000) || o.frames() > f0) { win.requestAnimationFrame(go); return; }
        win.requestAnimationFrame(poll);
      };
      win.requestAnimationFrame(poll);
      return api;
    },

    fail(err) { // hata: döngü durur, mesaj kâğıt kartında görünür
      if (state.done) return api;
      state.failed = true; root.dataset.state = 'error'; root.setAttribute('aria-busy', 'false');
      for (const a of anims.loop) { try { a.pause(); } catch { /* */ } }
      const text = typeof err === 'string' ? err : (err?.message || 'Bilinmeyen hata');
      const el = root.querySelector('#load-message'); if (el) el.textContent = 'Görüntü başlatılamadı: ' + text + '. WebGL destekli güncel bir tarayıcıda aç.';
      const chip = q('chip'); if (chip && !chip.querySelector('.gp-retry')) { const b = doc.createElement('button'); b.className = 'gp-retry'; b.type = 'button'; b.textContent = 'Yeniden dene'; b.onclick = () => win.location.reload(); chip.appendChild(b); }
      api.stage('error'); return api;
    },

    // Evreleri ayrı ayrı kontrol et (önizleme / Remotion) --------------------------------------------
    // seek({ t }) : tam akış zamanı (intro → loop → outro). Senaryo: readyAt (ms) ile erken bitiş simüle edilir.
    seek({ t, readyAt = null, loopMs = 0 }) {
      const INTRO = T.INTRO;
      // 1) giriş + döngü zamanı
      const tLoopIntro = readyAt != null ? Math.min(t, readyAt) : t;
      const tIntro = Math.min(tLoopIntro, INTRO);
      if (state.phase === 'outro' || state.phase === 'done') return api; // seek modunda yeniden kurulum: aşağıda
      for (const a of anims.intro) { a.pause(); a.currentTime = tIntro; }
      for (const a of anims.loop) { a.pause(); a.currentTime = tLoopIntro; }
      return api;
    },
    // Çıkış evresini belirli bir ana sarar: t = çıkışın başlangıcından ms. from: çıkışın başladığı giriş/döngü zamanı.
    seekOutro({ t, from = T.INTRO + 2000, quick = false, quad = null }) {
      if (quad) state.quad = () => quad;
      // girişi/döngüyü 'from' anına getir
      for (const a of anims.intro) { a.pause(); a.currentTime = Math.min(from, T.INTRO); }
      for (const a of anims.loop) { a.pause(); a.currentTime = from; }
      if (state.phase !== 'outro') { root.dataset.quick = quick ? '1' : '0'; startOutro({ quick }); }
      for (const a of anims.outro) { a.pause(); a.currentTime = t; }
      applyOutro(t);
      return api;
    },
    setQuad(getter) { state.quad = typeof getter === 'function' ? getter : () => getter; return api; },
    playLoopOnly() { state.now = T.INTRO; playAll(); return api; },
    estimateRasterMB(dpr = 3) { // tahmini compositor bellek ayak izi (büyük katmanlar)
      let px = 0; const add = (w, h) => { px += w * h * dpr * dpr; };
      add(L.vw, L.vh); add(L.rb.w, L.rb.h); (L.sheets || []).forEach(s => add(s.w, s.h)); if (L.n1) add(L.n1.w, L.n1.h); if (L.n2) add(L.n2.w, L.n2.h); add(L.belt ? 26 * 32 : 0, 1);
      return +(px * 4 / 1048576).toFixed(1);
    },
    destroy() { clearAnims('intro'); clearAnims('loop'); clearAnims('outro'); win.removeEventListener('resize', onResize); win.removeEventListener('orientationchange', onResize); win.cancelAnimationFrame(rafId); },
  };

  init();
  return api;
}
