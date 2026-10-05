import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto('http://127.0.0.1:4401/?debug', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__S, null, { timeout: 90000 });
await page.waitForTimeout(2500);
const rows = [];
for (let i = 0; i < 46; i++) {
  await page.evaluate(() => window.scrollBy(0, 70));
  await page.waitForTimeout(140);
  rows.push(await page.evaluate(() => { const S = window.__S; return [scrollY, document.querySelector('[data-hud-n]').textContent, S.block.toFixed(2), S.plunge.toFixed(2), S.turns.toFixed(2), S.ry.toFixed(2)].join(' '); }));
}
console.log(rows.join('\n'));
await browser.close();
