// Logo için dönen takım kare dizilerini üretir: node scripts/render-logo.mjs
// Dev sunucusu (127.0.0.1:4321) açık olmalı. Çıktı: public/img/logo/<ad>.webp (yatay şerit)
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs';
const JOBS = JSON.parse(process.env.JOBS || 'null') ?? [
  { name: 'insert', q: 'key=insert-C&n=30&period=180&rx=-0.9&rz=0.25&fill=1.18' },
  { name: 'mill', q: 'key=facemill-45&n=24&period=72&rx=-0.72&rz=0.15&exp=1.3&fill=1.02' },
  { name: 'collet', q: 'key=collet&n=16&period=45&rx=0.5&rz=-0.35&fill=1.02' },
];
const size = +(process.env.SIZE || 96);
fs.mkdirSync('src/pages/lab', { recursive: true });
fs.copyFileSync('scripts/lab/turntable.astro', 'src/pages/lab/turntable.astro');
fs.mkdirSync('public/img/logo', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
try {
  for (const j of JOBS) {
    await page.goto(`http://127.0.0.1:4321/lab/turntable?${j.q}&size=${size}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__done, null, { timeout: 600000 });
    const err = await page.evaluate(() => window.__err);
    if (err) { console.log(j.name, 'HATA', err); continue; }
    const buf = Buffer.from((await page.evaluate(() => window.__png)).split(',')[1], 'base64');
    if (process.env.PREVIEW) { fs.writeFileSync(`${process.env.PREVIEW}/${j.name}.png`, buf); console.log(j.name, 'önizleme'); continue; }
    await sharp(buf).webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(`public/img/logo/${j.name}.webp`);
    console.log(j.name, (fs.statSync(`public/img/logo/${j.name}.webp`).size / 1024).toFixed(1) + ' KB');
  }
} finally {
  await browser.close();
  fs.rmSync('src/pages/lab', { recursive: true, force: true });
}
