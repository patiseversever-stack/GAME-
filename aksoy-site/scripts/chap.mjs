// Bir bölüme kaydırıp sekans boyunca belirli anlarda ekran görüntüsü alır.
// node scripts/chap.mjs <bölüm 0-5> <prefix> <w> <h> <ms1,ms2,...> [url]
import { chromium } from 'playwright-core';
const [k, prefix, w = '1440', h = '900', times = '1500,3000', url = 'http://127.0.0.1:4321/'] = process.argv.slice(2);
const mobile = +w < 800;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[${m.type()}]`, m.text()); });
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-showcase].is-live', { timeout: 90000 });
await page.waitForTimeout(2600);
await page.evaluate((kk) => {
  const el = document.querySelector('[data-showcase]');
  const top = el.getBoundingClientRect().top + scrollY;
  const len = el.offsetHeight - innerHeight;
  const raw = kk === 0 ? 0 : kk + 0.42;
  window.scrollTo(0, top + (len * raw) / 6);
}, +k);
const t0 = Date.now();
for (const t of times.split(',').map(Number)) {
  const wait = t - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `${prefix}-${t}.png` });
}
await browser.close();
