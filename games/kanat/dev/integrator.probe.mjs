// Evaluate an expression in the running game (dev server) after boot: node dev/integrator.probe.mjs "<js expr>" [mode]
import { chromium } from 'playwright-core';
const expr = process.argv[2];
const mode = process.argv[3] ?? 'menu';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/?test=1', { waitUntil: 'load' });
await page.waitForFunction(() => document.documentElement.dataset.kanatBoot === 'ok' && window.__game, null, { timeout: 90000 });
await page.evaluate(() => window.__game.ready());
if (mode !== 'menu') await page.evaluate((m) => window.__game.goto(m, 'w1r1'), mode);
await new Promise((r) => setTimeout(r, 3000));
console.log(await page.evaluate(expr));
await browser.close();
