import { chromium } from 'playwright-core';
const [w = '1440', h = '900', out = 'verify-out/reel'] = process.argv.slice(2);
const mobile = +w < 800;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto('http://127.0.0.1:4401/?debug', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__S, null, { timeout: 90000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}-0.png` });
await page.click('[data-reel-next]');
const trace = [];
for (let i = 0; i < 16; i++) { await page.waitForTimeout(500); trace.push(await page.evaluate(() => `${Math.round(scrollY)} ${document.querySelector('[data-hud-n]').textContent} plunge=${window.__S.plunge.toFixed(2)}`)); }
console.log(trace.join('\n'));
await page.screenshot({ path: `${out}-1.png` });
await browser.close();
