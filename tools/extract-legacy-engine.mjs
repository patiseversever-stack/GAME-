// Orijinal `okey-oyunu.html` bundle'ından kural motorunu çıkarıp Node modülü (CJS) üretir.
// Amaç: yeni motoru orijinalle diferansiyel testten geçirmek (tests/parity.test.mjs).
// Kullanım: node tools/extract-legacy-engine.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'legacy/okey-oyunu.original.html'), 'utf8');
const i0 = html.indexOf('<script type="module">') + '<script type="module">'.length;
const js = html.slice(i0, html.indexOf('</script>', i0));
const start = js.indexOf('Ia=["red","blue","black","yellow"]');
const end = js.indexOf('const py={play:()=>{},sync:()=>{}}');
if (start < 0 || end < 0) throw new Error('Orijinal bundle içinde motor sınırları bulunamadı.');
const body = js.slice(start, end);
const out = `'use strict';
// ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: legacy/okey-oyunu.original.html (tools/extract-legacy-engine.mjs)
// Orijinal Patisever Okey kural motoru (minify edilmiş adlarla). Yalnızca paralellik testlerinde kullanılır.
const ${body}
module.exports = { TILES: br, tileInfo: An, repr: pe, isOkey: le, okeyOf: Kl, validateMeld: Ze, extend: Tr, canFinish: On, bestOpen: dy, newGame: gy, apply: k1, botView: x1, botDecide: M1, sources: ly, enumerateMelds: oy, validateState: V1, view: Tn };
`;
writeFileSync(join(root, 'tests/legacy/legacy-engine.cjs'), out);
console.log('tests/legacy/legacy-engine.cjs yazıldı (' + out.length + ' bayt)');
