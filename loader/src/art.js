// Gece Postası yükleme ekranı — çizimler (SVG/HTML dizgeleri). Hepsi koddur; görsel dosyası yoktur.
// Merkezi sayfa oyundaki kâğıtla aynı 1800x1160 sayfa koordinatlarında çizilir; yüzen sayfalar ise
// oyundaki bulmaca türlerinin (ok bulmaca ızgarası, fotoğraflı soru, ipucu dizini, ön sayfa) sadeleştirilmiş halidir.
import { GAME, ZONES, PHOTOS, CELLS, ARROWS, LETTERS } from './data.generated.js';

const { CELL, GX, GY, COLS, ROWS } = GAME;
export const SERIF = "Georgia,'Times New Roman','Noto Serif','DejaVu Serif',serif";
export const SANS = "Arial,Helvetica,'Liberation Sans',sans-serif";
const INK = '#182e25';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const svgURL = svg => 'url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/"/g, '%22') + '")';

// Basit deterministik rastgele (her yüklemede aynı sayfalar).
function rng(seed) { let s = seed >>> 0; return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296); }

// Kağıt lifi dokusu (küçük döşeme; bir kez rasterlenir).
export const NOISE = svgURL("<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42 0 0 0 0 .33 0 0 0 0 .2 0 0 0 .15 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>");

// ---------------------------------------------------------------------------------------------
// Merkezi sayfa parçaları
// ---------------------------------------------------------------------------------------------
const cellX = c => GX + c * CELL, cellY = r => GY + r * CELL;

// Cevap hücrelerinin açık zemini (tek path).
export function cellsLayer() {
  let d = '';
  for (const [r, c] of CELLS) d += `M${cellX(c)} ${cellY(r)}h${CELL}v${CELL}h-${CELL}z`;
  return `<svg class="gp-layer" viewBox="0 0 1800 1160" width="1800" height="1160"><path d="${d}" fill="#fff9e5" fill-opacity=".62"/></svg>`;
}

// İpucu bölgeleri: koyu adaçayı kutular + metin iskeleti çubukları + ok işaretleri.
// Dört sütun bandına ayrılır; bantlar sırayla belirir (her biri ayrı katman).
export function zoneLayers(bands = 4) {
  const out = Array.from({ length: bands }, () => '');
  const r = rng(11);
  for (const [zr, zc, w, h, primary] of ZONES) {
    const x = cellX(zc), y = cellY(zr), W = w * CELL, H = h * CELL;
    const b = Math.min(bands - 1, Math.floor(zc / (COLS / bands)));
    let s = `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${primary ? '#c3d0c0' : '#e3e5d6'}" stroke="#5d6f5e" stroke-width="2.4"/>`;
    const lines = primary ? (W > CELL ? 3 : 2) : 1, pad = 9, innerW = W - pad * 2;
    for (let i = 0; i < lines; i++) {
      const bw = Math.max(22, innerW * (i === lines - 1 ? .5 + r() * .25 : .86 + r() * .14));
      const by = y + (primary ? 20 : 26) + i * (H > CELL ? 16 : 13) * (primary ? 1 : 1.2);
      s += `<rect x="${x + pad}" y="${by}" width="${bw.toFixed(1)}" height="7" rx="3.5" fill="${INK}" fill-opacity="${primary ? .34 : .22}"/>`;
    }
    out[b] += s;
  }
  // Oklar (oyundaki → ve ↓ işaretleri)
  let arrows = '';
  for (const [r0, c0, dir] of ARROWS) {
    arrows += dir === 0
      ? `<text x="${cellX(c0) + CELL - 6}" y="${cellY(r0) + CELL * .62}" text-anchor="end" font-family="${SANS}" font-weight="700" font-size="24" fill="#2e4032">→</text>`
      : `<text x="${cellX(c0) + CELL * .5}" y="${cellY(r0) + CELL - 6}" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="24" fill="#2e4032">↓</text>`;
  }
  out[bands - 1] += arrows;
  return out.map(s => `<svg class="gp-layer" viewBox="0 0 1800 1160" width="1800" height="1160">${s}</svg>`);
}

const PHOTO_CAP = { portrait: ['01', 'Bir yüzün anlatısı'], compass: ['02', 'Kuzeyi ararken'], archive: ['03', 'Kıyıdaki hafıza'] };
export function photoBlocks() {
  return PHOTOS.map(([id, r, c, w, h]) => {
    const [n, cap] = PHOTO_CAP[id] || ['00', ''];
    return `<div class="gp-photo" data-photo="${id}" style="left:${cellX(c)}px;top:${cellY(r)}px;width:${w * CELL}px;height:${h * CELL}px"><i></i><canvas></canvas><b></b><s>${n}  /  FOTOĞRAFLI SORU</s><u>${esc(cap)}</u></div>`;
  }).join('');
}

// Basılacak harfler: oyundaki gerçek ilk cevaplar (PORTRE, PARŞÖMEN, RÖNESANS, DESTAN).
export function letterCells() {
  return LETTERS.map(([r, c, ch], i) => `<div class="gp-ltr" data-i="${i}" style="left:${cellX(c)}px;top:${cellY(r)}px">${esc(ch)}</div>`).join('');
}

export function heroMarkup() {
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

// ---------------------------------------------------------------------------------------------
// Yüzen sayfalar (oyundaki bulmaca türleri)
// ---------------------------------------------------------------------------------------------
const PAPER = "<defs><linearGradient id='pg' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff8e9'/><stop offset='.55' stop-color='#ece2ce'/><stop offset='1' stop-color='#e0d2b5'/></linearGradient><pattern id='ht' width='6' height='6' patternUnits='userSpaceOnUse'><circle cx='3' cy='3' r='1.7' fill='#182e25' fill-opacity='.62'/></pattern><linearGradient id='tone' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.05'/><stop offset='1' stop-color='#eee4cf' stop-opacity='.92'/></linearGradient></defs>";
const bar = (x, y, w, o = .3, h = 7) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${INK}" fill-opacity="${o}"/>`;
const rule = (x, y, w, t = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${t}" fill="#26352f"/>`;
const txt = (t, x, y, size, o = {}) => `<text x="${x}" y="${y}" font-family="${o.sans ? SANS : SERIF}" font-weight="${o.w || 400}" font-size="${size}" ${o.i ? 'font-style="italic"' : ''} ${o.anchor ? `text-anchor="${o.anchor}"` : ''} fill="${o.fill || INK}" ${o.ls ? `letter-spacing="${o.ls}"` : ''}>${esc(t)}</text>`;

function masthead(w, size = 34, date = true) {
  return txt('Gece Postası', 18, 18 + size * .8, size, { w: 700 }) + (date ? txt('29 EYLÜL 2026  /  KÜLTÜR EKİ', w - 18, 26, 9, { sans: 1, w: 500, anchor: 'end', fill: '#50604e' }) : '')
    + rule(18, 26 + size, w - 36, 2) + rule(18, 32 + size, w - 36, 1);
}

// Ok bulmacası ızgarası (İskandinav tipi): cevap hücreleri + ipucu kutuları + oklar + birkaç harf.
function gridSheet(w, h, cols, rows, seed) {
  const r = rng(seed), top = 70, pad = 18, cs = Math.min((w - pad * 2) / cols, (h - top - 26) / rows), gx = (w - cs * cols) / 2, gy = top;
  let s = PAPER + `<rect width="${w}" height="${h}" fill="url(#pg)"/>` + masthead(w, 30);
  s += `<rect x="${gx}" y="${gy}" width="${cs * cols}" height="${cs * rows}" fill="#d8ddcf"/>`;
  const kind = [];
  for (let i = 0; i < rows; i++) { kind[i] = []; for (let j = 0; j < cols; j++) kind[i][j] = r() < .24 ? 1 : 0; }
  kind[0][0] = 1;
  const word = 'PUSULA'; let wr = 2 + Math.floor(r() * (rows - 3));
  for (let j = 0; j < cols; j++) for (let i = 0; i < rows; i++) {
    const x = gx + j * cs, y = gy + i * cs, clue = kind[i][j] && !(i === wr && j >= 1 && j <= word.length);
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}" fill="${clue ? '#c3d0c0' : '#f0f0e0'}" stroke="#5d6f5e" stroke-width="1.4"/>`;
    if (clue) { s += bar(x + 5, y + cs * .3, cs - 10, .34, Math.max(3, cs * .12)) + bar(x + 5, y + cs * .5, (cs - 10) * .6, .3, Math.max(3, cs * .12)); s += txt(r() < .5 ? '→' : '↓', x + cs - 5, y + cs - 5, cs * .3, { sans: 1, w: 700, anchor: 'end', fill: '#2e4032' }); }
  }
  for (let k = 0; k < word.length; k++) s += txt(word[k], gx + (k + 1.5) * cs, gy + wr * cs + cs * .72, cs * .56, { w: 700, anchor: 'middle' });
  s += `<rect x="${gx}" y="${gy}" width="${cs * cols}" height="${cs * rows}" fill="none" stroke="#344737" stroke-width="2.4"/>`;
  s += txt('OK BULMACASI   /   01', w - 18, h - 9, 8, { sans: 1, w: 500, anchor: 'end', fill: '#4c624b' });
  return s;
}

// Ön sayfa: başlık, manşet çubukları, yarım ton fotoğraf, üç sütun.
function frontSheet(w, h, seed) {
  const r = rng(seed); let s = PAPER + `<rect width="${w}" height="${h}" fill="url(#pg)"/>` + masthead(w, 36);
  const top = 78, colW = (w - 36 - 16) / 3;
  s += bar(18, top, w * .62, .55, 14) + bar(18, top + 24, w * .4, .38, 9);
  const ph = h * .3; s += `<rect x="18" y="${top + 48}" width="${w - 36}" height="${ph}" fill="#b8bca8"/><rect x="18" y="${top + 48}" width="${w - 36}" height="${ph}" fill="url(#ht)"/><rect x="18" y="${top + 48}" width="${w - 36}" height="${ph}" fill="url(#tone)"/>`;
  s += bar(18, top + 48 + ph + 8, w * .34, .4, 6);
  const y0 = top + 48 + ph + 26;
  for (let c = 0; c < 3; c++) { const x = 18 + c * (colW + 8); for (let y = y0; y < h - 16; y += 10.5) s += bar(x, y, colW * (.68 + r() * .32), .22, 4.6); }
  return s;
}

// Fotoğraflı soru sayfası.
function photoSheet(w, h, seed) {
  const r = rng(seed); let s = PAPER + `<rect width="${w}" height="${h}" fill="url(#pg)"/>` + masthead(w, 28, false);
  const top = 66, ph = h * .5;
  s += `<rect x="16" y="${top}" width="${w - 32}" height="${ph}" fill="#9aa48f"/><rect x="16" y="${top}" width="${w - 32}" height="${ph}" fill="url(#ht)"/><rect x="16" y="${top}" width="${w - 32}" height="${ph}" fill="url(#tone)" opacity=".7"/>`;
  s += `<circle cx="${w * .42}" cy="${top + ph * .44}" r="${ph * .26}" fill="${INK}" fill-opacity=".38"/>`;
  s += `<rect x="16" y="${top + ph - 52}" width="${w - 32}" height="52" fill="#15211a" fill-opacity=".86"/>` + txt('01  /  FOTOĞRAFLI SORU', 28, top + ph - 32, 9, { sans: 1, w: 700, fill: '#e4d9bb' }) + txt('Bir yüzün anlatısı', 28, top + ph - 12, 17, { fill: '#fff8e5' });
  const y0 = top + ph + 18;
  s += bar(16, y0, w - 32, .34, 8) + bar(16, y0 + 16, (w - 32) * .7, .28, 8);
  const n = 6, cw = Math.min(34, (w - 32 - 26) / n); for (let i = 0; i < n; i++) s += `<rect x="${16 + i * cw}" y="${y0 + 40}" width="${cw}" height="${cw}" fill="#f0f0e0" stroke="#5d6f5e" stroke-width="1.4"/>`;
  s += txt('→', 16 + n * cw + 10, y0 + 40 + cw * .7, 20, { sans: 1, w: 700, fill: '#2e4032' });
  for (let y = y0 + 40 + cw + 16; y < h - 14; y += 10.5) s += bar(16, y, (w - 32) * (.5 + r() * .5), .2, 4.6);
  return s;
}

// İpucu dizini ("Sayfa dizini").
function cluesSheet(w, h, seed) {
  const r = rng(seed); let s = PAPER + `<rect width="${w}" height="${h}" fill="url(#pg)"/>` + txt('SAYFA DİZİNİ', 20, 28, 11, { sans: 1, w: 700, fill: '#755533', ls: 2 }) + txt('Birbirine bağlı.', 20, 62, 28, { i: 1 }) + rule(20, 76, w - 40, 2);
  const colW = (w - 40 - 14) / 2; let k = 1;
  for (let c = 0; c < 2; c++) for (let y = 98, i = 0; y < h - 20; y += 26, i++) {
    const x = 20 + c * (colW + 14);
    s += txt(String(k++).padStart(2, '0'), x, y + 8, 11, { sans: 1, w: 700, fill: '#8b6532' }) + txt(r() < .5 ? '→' : '↓', x + 26, y + 8, 12, { sans: 1, w: 700, fill: '#2e4032' });
    s += bar(x + 44, y, (colW - 44) * (.6 + r() * .4), .3, 6) + bar(x + 44, y + 11, (colW - 44) * (.3 + r() * .4), .2, 5);
  }
  return s;
}

// Sayfa türü → svg dizgesi (w,h piksel cinsinden sanal boyut; eleman CSS ile ölçeklenir).
export function sheetArt(kind, seed = 1) {
  const W = { grid: 560, front: 360, photo: 340, clues: 420 }[kind], H = { grid: 380, front: 500, photo: 470, clues: 340 }[kind];
  const body = kind === 'grid' ? gridSheet(W, H, 12, 7, seed) : kind === 'front' ? frontSheet(W, H, seed) : kind === 'photo' ? photoSheet(W, H, seed) : cluesSheet(W, H, seed);
  return { w: W, h: H, bg: NOISE + ',' + svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`) };
}

// Turkçe harf bandı: oyunun ekran klavyesindeki 32 harf, alfabe sırasında (Ç Ğ İ Ö Ş Ü vurgulu).
export const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPQRSŞTUÜVWXYZ'.split('');
export const TR_SPECIAL = new Set(['Ç', 'Ğ', 'İ', 'Ö', 'Ş', 'Ü']);
