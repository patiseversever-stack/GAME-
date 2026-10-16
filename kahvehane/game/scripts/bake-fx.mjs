// Pişti efekti donmuş karelerini pişirir: her efekt için src/ui/fxpv/<id>.webp (saydam). Market ızgarası, set/koleksiyon
// karoları bunu gösterir; ürün penceresi ve "Dene" canlı efekti oynatır. Kullanım: node scripts/bake-fx.mjs [efektId ...]
// Ne zaman: yeni efekt eklenince ya da src/ui/fxpreview.ts'te bir efektin görünüşü değişince. Pişmemiş efekt yine çalışır
// (çalışma anında, boşta kurulur) ama ilk görünüşü pahalıdır.
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
  const p = await b.newPage({viewport: {width: 900, height: 900}, deviceScaleFactor: 1.6});
  p.on('pageerror', e => console.error('sayfa hatası:', e.message));
  await p.goto(`http://127.0.0.1:${port}/dev/fxbake.html`);
  const ids = await p.evaluate(() => window.__bake);
  const dir = path.join(root, 'src/ui/fxpv');
  fs.mkdirSync(dir, {recursive: true});
  let total = 0;
  for (const id of ids) {
    if (only.length && !only.includes(id)) continue;
    const png = await p.locator(`[data-bake="${id}"]`).screenshot({omitBackground: true});
    // PNG → WebP (tarayıcıda; saydamlık korunur)
    const webp = await p.evaluate(async b64 => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.78));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
      return btoa(s);
    }, png.toString('base64'));
    const out = Buffer.from(webp, 'base64');
    fs.writeFileSync(path.join(dir, `${id}.webp`), out);
    total += out.length;
    console.log(`✓ ${id.padEnd(10)} ${(out.length / 1024).toFixed(1).padStart(6)} KB`);
  }
  if (!only.length)
    for (const f of fs.readdirSync(dir))
      if (f.endsWith('.webp') && !ids.includes(f.slice(0, -5))) {
        fs.unlinkSync(path.join(dir, f));
        console.log(`− ${f} silindi (efekt katalogda yok)`);
      }
  console.log(`toplam ${(total / 1024).toFixed(0)} KB → src/ui/fxpv/`);
} finally {
  await b.close();
  await server.close();
}
