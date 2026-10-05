// Vitrin sonrası bölümlerin tam sayfa görüntüsü (vitrin hariç)
import { chromium } from 'playwright-core';
const [out, w = '1440', h = '900'] = process.argv.slice(2);
const mobile = +w < 800;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  document.querySelector('[data-showcase]').style.display = 'none';
  document.querySelectorAll('.reveal,.split-line').forEach((e) => e.classList.add('is-in'));
  document.querySelector('.site-header').style.position = 'absolute';
  const mb = document.querySelector('.mbar'); if (mb) mb.style.display = 'none';
});
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
