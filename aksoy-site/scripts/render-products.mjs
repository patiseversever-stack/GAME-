// Ürün görsellerini üretir: node scripts/render-products.mjs [anahtar1,anahtar2]
// Dev sunucusu (127.0.0.1:4321) açık olmalı. Çıktı: public/img/urun/<anahtar>.webp (1200 px) ve -s.webp (600 px)
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs';
const src = fs.readFileSync('src/scripts/three/catalog-models.ts', 'utf8');
const all = [...src.match(/RENDER_KEYS = \[([\s\S]*?)\] as const/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const only = process.argv[2] ? process.argv[2].split(',') : all;
fs.mkdirSync('src/pages/lab', { recursive: true });
fs.copyFileSync('scripts/lab/render.astro', 'src/pages/lab/render.astro');
fs.mkdirSync('public/img/urun', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
try {
  for (const key of only) {
    await page.goto(`http://127.0.0.1:4321/lab/render?key=${key}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__done, null, { timeout: 120000 });
    const data = await page.evaluate(() => window.__png);
    const buf = Buffer.from(data.split(',')[1], 'base64');
    const trimmed = sharp(buf);
    await trimmed.clone().webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(`public/img/urun/${key}.webp`);
    await trimmed.clone().resize({ width: 600 }).webp({ quality: 82, alphaQuality: 88, effort: 6 }).toFile(`public/img/urun/${key}-s.webp`);
    const kb = (fs.statSync(`public/img/urun/${key}.webp`).size / 1024).toFixed(0);
    console.log(key, kb + ' KB');
  }
} finally {
  await browser.close();
  fs.rmSync('src/pages/lab', { recursive: true, force: true });
}
