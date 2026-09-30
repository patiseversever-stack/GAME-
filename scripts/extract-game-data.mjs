// Oyunun kendi HTML'inden (game/*.html) yükleme ekranının ihtiyaç duyduğu GERÇEK bulmaca verisini çıkarır.
// Böylece yükleme sayfasındaki iskelet (ipucu kutuları, fotoğraf blokları, basılan harfler) oyundaki
// gerçek sayfa ile aynı hücrelerde durur; bulmaca değişirse `npm run extract` ile yeniden üretilir.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'game', 'Gece_Postasi_Yatay_Hafif.html');
const outPath = path.join(root, 'loader', 'src', 'data.generated.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const start = html.indexOf('const DATA=');
if (start < 0) throw new Error('DATA bulunamadı: oyun dosyası beklenen yapıda değil.');
// DATA tek satırlık bir JSON nesnesidir; dengeli süslü parantezle sonunu bul.
let depth = 0, end = -1, inStr = false, esc = false;
for (let i = start + 'const DATA='.length; i < html.length; i++) {
  const ch = html[i];
  if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
  if (ch === '"') { inStr = true; continue; }
  if (ch === '{') depth++;
  else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const DATA = JSON.parse(html.slice(start + 'const DATA='.length, end));

// Oyundaki sabitler (PaperPainter / Director ile aynı değerler).
const C = { PW: 1800, PH: 1160, CELL: 72, GX: 36, GY: 106, COLS: DATA.cols, ROWS: DATA.rows };

// Basılacak örnek kelimeler: sol üstte birbirine geçen gerçek cevaplar (bir harf, iki cevap).
const byId = new Map(DATA.words.map(w => [w.id, w]));
const cellsOf = w => Array.from(w.answer, (ch, i) => [w.r + (w.dir === 'd' ? i : 0), w.c + (w.dir === 'a' ? i : 0), ch]);
const seed = ['w1', 'w6', 'w7', 'w25']; // PORTRE, PARŞÖMEN, RÖNESANS, DESTAN
const seen = new Set();
const letters = [];
for (const id of seed) {
  const w = byId.get(id);
  for (const [r, c, ch] of cellsOf(w)) {
    const k = r + ',' + c;
    if (seen.has(k)) continue;
    seen.add(k);
    letters.push([r, c, ch, id]);
  }
}

// Oyunun gerçek yükleme metinleri ve fotoğraf adları.
const photos = DATA.photos.map(p => [p.id, p.r, p.c, p.w, p.h, p.answer]);
const zones = DATA.zones.map(z => [z.r, z.c, z.w, z.h, z.primary ? 1 : 0, z.ids.length]);
const arrows = DATA.words.map(w => [w.clueCell[0], w.clueCell[1], w.dir === 'a' ? 0 : 1]);
const cells = DATA.cells.map(c => [c.r, c.c]);
const answers = DATA.words.map(w => w.answer);

const banner = `// OTOMATİK ÜRETİLDİ — elle düzenleme. Kaynak: game/Gece_Postasi_Yatay_Hafif.html → DATA\n// Yeniden üretmek için: npm run extract\n`;
const body = `export const GAME = ${JSON.stringify(C)};
export const ZONES = ${JSON.stringify(zones)}; // [satır, sütun, genişlik, yükseklik, birincil, ipucu sayısı]
export const PHOTOS = ${JSON.stringify(photos)}; // [anahtar, satır, sütun, genişlik, yükseklik, cevap]
export const CELLS = ${JSON.stringify(cells)}; // cevap hücreleri [satır, sütun]
export const ARROWS = ${JSON.stringify(arrows)}; // [satır, sütun, yön 0=yatay 1=dikey]
export const LETTERS = ${JSON.stringify(letters)}; // basılacak harfler [satır, sütun, harf, kelime]
export const ANSWERS = ${JSON.stringify(answers)};
`;
fs.writeFileSync(outPath, banner + body);
console.log(`data.generated.js yazıldı: ${zones.length} bölge, ${photos.length} fotoğraf, ${cells.length} hücre, ${letters.length} basılacak harf (${fs.statSync(outPath).size} bayt)`);
console.log('harfler:', letters.map(l => l[2]).join(''));
