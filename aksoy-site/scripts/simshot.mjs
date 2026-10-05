// Kesme simülasyonunu seçilen işlemle (#tornalama, #frezeleme, #delme, #kilavuz) görüntüler.
// node scripts/simshot.mjs <işlem> <çıktı.png> [w] [h] [bekleme ms] [url]
import { chromium } from 'playwright-core';
const [op, out, w = '1440', h = '900', wait = '12000', url = 'http://127.0.0.1:4321/teknik-araclar/kesme-hizi-hesaplama'] = process.argv.slice(2);
const mobile = +w < 800;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DSF || (mobile ? 2 : 1)), isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text()); });
await page.goto(`${url}?gl#${op}`, { waitUntil: 'networkidle' });
const el = page.locator('[data-sim]');
await el.evaluate((n) => n.scrollIntoView({ block: 'center' }));
if (process.env.ISO) await page.locator(`[data-iso][value="${process.env.ISO}"]`).evaluate((n) => { n.checked = true; n.dispatchEvent(new Event('change', { bubbles: true })); });
await page.waitForTimeout(+wait);
if (process.env.ADV) { await page.evaluate((s) => window.__sim?.advance(s), +process.env.ADV); await page.waitForTimeout(1500); }
await el.screenshot({ path: out });
await browser.close();
