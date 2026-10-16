// Tek dosya derlemesini (dist-tek/index.html) yayın sayfası biçimine çevirir:
// doctype/html/head/body etiketleri çıkarılır (yayın iskeleti ekler), başlık ve stiller en üste alınır.
import fs from 'fs';
import {isPacked, packVoice} from './voice-pack.mjs';
const [,, inp = 'dist-tek/index.html', out = 'dist-tek/kahvehane-pisti.html'] = process.argv;
let h = fs.readFileSync(inp, 'utf8');
// \b şart: yoksa <header> gibi etiketler de silinir (lobi üst barı kayboluyordu)
h = h.replace(/<!doctype html>/i, '').replace(/<\/?html\b[^>]*>/gi, '').replace(/<\/?head\b[^>]*>/gi, '').replace(/<\/?body\b[^>]*>/gi, '');
h = h.replace(/<meta name="viewport"[^>]*>/i, '').replace(/<meta charset="[^"]*">/i, '');
const title = (h.match(/<title>[\s\S]*?<\/title>/i) || ['<title>Kahvehane Pişti</title>'])[0];
h = h.replace(title, '');
const theme = `<style>:root{color-scheme:dark;background:#082a1d}html,body{background:#082a1d;color:#f4ead2;height:100%}</style>`;
fs.writeFileSync(out, `${title}\n${theme}\n${h.trim()}\n`);
console.log('yazıldı', out, (fs.statSync(out).size / 1048576).toFixed(2), 'MB');
// sesler pakete gömülmez: sayfa, yanındaki voice/ klasöründen okur (yoksa yalnız balon). Bkz. tools/voice/README.md §5.
// Yayın sunucusu sürüm başına ≤ 511 dosya (yayın başına 255), dosya başına ≤ 16 MB kabul eder → voice/ PAKETLİ olmalı.
const voice = out.replace(/[^/]*$/, '') + 'voice';
if (fs.existsSync('assets/voice/manifest.json') && !isPacked(voice)) packVoice('assets/voice', voice);
if (fs.existsSync(voice + '/manifest.json')) {
  const files = [];
  const walk = d => fs.readdirSync(d, {withFileTypes: true}).forEach(e => (e.isDirectory() ? walk(d + '/' + e.name) : files.push(d + '/' + e.name)));
  walk(voice);
  const sizes = files.map(f => fs.statSync(f).size);
  const total = sizes.reduce((a, b) => a + b, 0), big = Math.max(...sizes);
  console.log(`ses klasörü (sayfanın YANINDA yayınlanmalı): ${voice}/ — ${files.length} dosya, ${(total / 1048576).toFixed(1)} MB, en büyük ${(big / 1048576).toFixed(2)} MB`);
  if (files.length + 1 > 255 || big > 16 * 1048576) console.warn('UYARI: yayın sınırı aşıldı (≤ 255 dosya / yayın, ≤ 16 MB / dosya)');
}
