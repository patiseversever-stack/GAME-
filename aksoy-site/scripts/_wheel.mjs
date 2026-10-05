import { chromium } from 'playwright-core';
const url = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => console.log(`[${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
console.log('classes', await page.evaluate(() => document.querySelector('[data-showcase]').className + ' | pre:' + !!document.querySelector('[data-preloader]') + ' | html:' + document.documentElement.className));
await page.mouse.move(700, 450);
for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(120); }
await page.waitForTimeout(2500);
console.log('scrollY', await page.evaluate(() => scrollY), 'hud', await page.evaluate(() => document.querySelector('[data-hud-n]')?.textContent));
await page.screenshot({ path: 'verify-out/wheel.png' });
await browser.close();
