// Logo için dönen takım kare dizilerini üretir: node scripts/render-logo.mjs
// Dev sunucusu (127.0.0.1:4321) açık olmalı. Çıktı: public/img/logo/<ad>.webp (yatay şerit)
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs';
const JOBS = JSON.parse(process.env.JOBS || 'null') ?? [
  // Kategori kartlarıyla aynı modeller ve sıra; her biri kendi ekseni etrafında simetri açısı kadar döner.
  // Uzun takımlar çapraz durur ve kesici kısma yakın çekilir (küçük logoda okunur olsun)
  { name: 'cnmg', q: 'kind=cnmg&n=30&period=180&bright&exp=1.45' },
  { name: 'groove', q: 'kind=groove&n=32&sway=0.42&bright&exp=1.2&pose=0.32,-0.55,-0.75&fa=x&fmin=-62&fill=0.95' },
  { name: 'thread', q: 'kind=thread&n=28&period=120&bright&exp=1.25' },
  { name: 'endmill', q: 'kind=endmill&n=20&period=90&bright&exp=1.15&pose=0,0.25,-0.78&fa=y&fmax=34&fill=1' },
  { name: 'drill', q: 'kind=drill&n=28&period=180&bright&exp=1.15&pose=0,0.35,-0.78&fa=y&fmax=36&fill=1' },
  { name: 'tap', q: 'kind=tap&n=32&period=360&bright&exp=1.15&pose=0,0.35,-0.78&fa=y&fmax=34&fill=1' },
  { name: 'bt40', q: 'kind=bt40&n=32&period=180&bright&exp=1.1&pose=0.3,0,-0.8&fill=0.96' },
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
    await sharp(buf).webp({ quality: +(process.env.Q || 76), alphaQuality: 82, effort: 6, smartSubsample: true }).toFile(`public/img/logo/${j.name}.webp`);
    console.log(j.name, (fs.statSync(`public/img/logo/${j.name}.webp`).size / 1024).toFixed(1) + ' KB');
  }
} finally {
  await browser.close();
  fs.rmSync('src/pages/lab', { recursive: true, force: true });
}
