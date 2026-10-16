// Deste vitrin şeritlerini pişirir: her deste için src/ui/deckpv/<id>.webp (arka + 5 yüz, src/ui/deckpv.ts düzeni).
// Kullanım: node scripts/bake-decks.mjs [desteId ...]   (kendi geçici Vite sunucusunu açar/kapatır)
// Ne zaman: yeni deste eklenince ya da bir kaplamanın çizimi değişince. Pişmemiş deste markette yine görünür
// (çalışma anında boşta çizilir) ama pişirmek ilk açılıştaki çizim maliyetini sıfırlar.
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.slice(2);
const server = await createServer({root, configFile: false, logLevel: 'error', server: {port: 0, host: '127.0.0.1', hmr: false}});
await server.listen();
const port = server.httpServer.address().port;
const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
try {
  const p = await b.newPage();
  p.on('pageerror', e => console.error('sayfa hatası:', e.message));
  await p.goto(`http://127.0.0.1:${port}/dev/deckbake.html`);
  const out = await p.evaluate(() => window.__bake);
  const dir = path.join(root, 'src/ui/deckpv');
  fs.mkdirSync(dir, {recursive: true});
  let total = 0;
  for (const o of out) {
    if (only.length && !only.includes(o.id)) continue;
    const buf = Buffer.from(o.url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(dir, `${o.id}.webp`), buf);
    total += buf.length;
    console.log(`✓ ${o.id.padEnd(12)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB  (hazırlık ${o.prepMs.toFixed(0)} ms, çizim ${o.drawMs.toFixed(0)} ms)`);
  }
  console.log(`toplam ${(total / 1024).toFixed(0)} KB → ${path.relative(root, dir)}/`);
} finally {
  await b.close();
  await server.close();
}
