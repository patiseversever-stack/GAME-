// Ekran görüntüsü aracı: node scripts/shot.mjs <url> <çıktı.png> [genişlik] [yükseklik] [kaydırma(px|%)] [bekleme ms]
import { chromium } from 'playwright-core';
const [url, out, w = '1440', h = '900', scroll = '0', wait = '2500', full = ''] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const mobile = +w < 800;
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
if (scroll !== '0') {
  await page.evaluate((s) => {
    const y = s.endsWith('%') ? (document.documentElement.scrollHeight - innerHeight) * parseFloat(s) / 100 : +s;
    window.scrollTo(0, y);
  }, scroll);
}
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: full === 'full' });
if (logs.length) console.log(logs.join('\n'));
await browser.close();
