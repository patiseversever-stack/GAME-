// Vitrin kaydırma dizisi: her bölümün ortasında ekran görüntüsü alır.
// node scripts/seq.mjs <prefix> [w] [h]
import { chromium } from 'playwright-core';
const [prefix, w = '1440', h = '900'] = process.argv.slice(2);
const mobile = +w < 800;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()); });
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-showcase].is-live', { timeout: 60000 });
await page.waitForTimeout(2600);
const stops = [0, 0.27, 0.43, 0.6, 0.77, 0.95];
for (let i = 0; i < stops.length; i++) {
  await page.evaluate((p) => {
    const el = document.querySelector('[data-showcase]');
    const top = el.getBoundingClientRect().top + scrollY;
    const len = el.offsetHeight - innerHeight;
    window.scrollTo(0, top + len * p);
  }, (stops[i] * 6 - 0) / 6);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${prefix}-${i}.png` });
}
await browser.close();
