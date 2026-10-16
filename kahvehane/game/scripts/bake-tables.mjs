// Masa resimlerini pişirir: her boyalı masa için temanın GÜNCEL paint() çiziminden src/ui/tablepv/<id>.webp (satış küçük
// resmi: masanın imzası görünecek kırpım, src/ui/tablepv.ts TABLE_THUMB) ve <id>.full.webp (büyük sahne yer tutucusu).
// Kullanım: node scripts/bake-tables.mjs [masaId ...]   (kendi geçici Vite sunucusunu açar/kapatır)
// Ne zaman: yeni masa eklenince ya da bir masanın boyası (src/themes/*) değişince — yoksa market/koleksiyon karoları
// eski görünüşü gösterir. Kayıttan çıkan masaların resimleri silinir. Boyası olmayan masa (Mavi Arena) swatch kullanır.
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
  const q = only.length === 1 ? `?only=${encodeURIComponent(only[0])}` : '';
  await p.goto(`http://127.0.0.1:${port}/dev/tablebake.html${q}`);
  const out = await p.evaluate(() => window.__bake);
  const ids = await p.evaluate(() => window.__ids);
  const dir = path.join(root, 'src/ui/tablepv');
  fs.mkdirSync(dir, {recursive: true});
  let total = 0;
  for (const o of out) {
    if (only.length && !only.includes(o.id)) continue;
    const buf = Buffer.from(o.url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(dir, o.file), buf);
    total += buf.length;
    console.log(`✓ ${o.file.padEnd(20)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB${o.ms ? `  (çizim ${o.ms.toFixed(0)} ms)` : ''}`);
  }
  // kayıttan çıkarılmış (ya da boyası kaldırılmış) masaların resimleri pakette boşuna yer tutmasın
  for (const f of fs.readdirSync(dir))
    if (f.endsWith('.webp') && !ids.includes(f.replace(/(\.full)?\.webp$/, ''))) {
      fs.unlinkSync(path.join(dir, f));
      console.log(`− ${f} silindi (masa kayıtta yok)`);
    }
  console.log(`toplam ${(total / 1024).toFixed(0)} KB → ${path.relative(root, dir)}/`);
} finally {
  await b.close();
  await server.close();
}
