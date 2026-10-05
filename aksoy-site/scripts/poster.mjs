// Vitrin poster görsellerini 3D sahneden üretir (şeffaf arka planlı WebP).
// node scripts/poster.mjs  → public/img/udrill-poster.webp ve udrill-poster-m.webp
import { chromium } from 'playwright-core';
import sharp from 'sharp';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, w, h, dpr] of [['udrill-poster', 1440, 900, 1], ['udrill-poster-m', 390, 844, 2]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
  await page.goto('http://127.0.0.1:4321/?poster&debug', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__posterReady, null, { timeout: 60000 });
  await page.evaluate(() => { window.__frame(); window.__frame(); });
  await page.waitForTimeout(400);
  const dataUrl = await page.evaluate(() => document.querySelector('[data-showcase-canvas]').toDataURL('image/png'));
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  await sharp(png).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(`public/img/${name}.webp`);
  console.log(name, (await sharp(`public/img/${name}.webp`).metadata()).size);
  await page.close();
}
await browser.close();
