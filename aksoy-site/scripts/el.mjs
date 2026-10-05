// Bir öğeyi görünür alana kaydırıp yalnızca o öğenin ekran görüntüsünü alır.
// node scripts/el.mjs <seçici> <çıktı.png> [w] [h] [bekleme ms] [url]
import { chromium } from 'playwright-core';
const [sel, out, w = '1440', h = '900', wait = '2500', url = 'http://127.0.0.1:4321/'] = process.argv.slice(2);
const mobile = +w < 800;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DSF || (mobile ? 2 : 1)), isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('Canvas2D')) console.log(`[${m.type()}]`, m.text()); });
await page.addInitScript(() => { try { sessionStorage.setItem('aksoy-pre', '1'); } catch {} });
await page.goto(url, { waitUntil: 'networkidle' });
const el = page.locator(sel).first();
await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(+wait);
await el.screenshot({ path: out });
await browser.close();
