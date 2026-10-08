// Manual-control smoke test (keyboard + touch drag) on any build URL.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const url = process.argv[2] ?? `file://${resolve('dist/single/kanat.html')}?test=1`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: false })).newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => document.documentElement.dataset.kanatBoot === 'ok' && window.__game, null, { timeout: 90000 });
await page.evaluate(() => window.__game.ready());
await page.evaluate(() => window.__game.goto('career', 'w1r1'));
const st = () => page.evaluate(() => { const s = window.__kanat.mode.session.state; return { tick: s.tick, phase: s.phase, psi: +s.psi.toFixed(3), phi: +s.phi.toFixed(3), gamma: +s.gamma.toFixed(3) }; });
await new Promise((r) => setTimeout(r, 4000));
const a = await st();
await page.keyboard.down('ArrowRight');
await new Promise((r) => setTimeout(r, 6000));
const b = await st();
await page.keyboard.up('ArrowRight');
// touch-like drag with the mouse: press, move left, hold
await page.mouse.move(195, 600);
await page.mouse.down();
await page.mouse.move(120, 600, { steps: 5 });
await new Promise((r) => setTimeout(r, 6000));
const c = await st();
await page.mouse.up();
console.log('start', JSON.stringify(a), '\nafter ArrowRight', JSON.stringify(b), '\nafter drag-left', JSON.stringify(c));
await browser.close();
