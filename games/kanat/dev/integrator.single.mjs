// Smoke test of dist/single/kanat.html over file:// (or any URL): boot → W1R1 → expert bot → landing → results.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const url = process.argv[2] ?? `file://${resolve('dist/single/kanat.html')}?test=1`;
const out = process.argv[3] ?? 'tests/out/int/single';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'], headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); if (m.type() === 'info') console.log(m.text()); });
page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const shot = async (name) => {
  await page.evaluate(() => { const g = window.__kanat; if (!g) return; g.app.loop.stop(); g.mode?.render(0, 1 / 60); if (!g.mode?.ownsRender) g.scene.render(1 / 60); });
  await page.screenshot({ path: `${out}-${name}.png`, timeout: 120000 });
  await page.evaluate(() => window.__kanat?.app.loop.start());
};
try {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.kanatBoot === 'ok' && window.__game, null, { timeout: 90000 });
  await page.evaluate(() => window.__game.ready());
  log('ready', JSON.stringify(await page.evaluate(() => window.__game.state())).slice(0, 200));
  await page.evaluate(() => window.__game.goto('career', 'w1r1'));
  await page.evaluate(() => window.__game.bot('expert'));
  let s;
  for (let i = 0; i < 40; i++) {
    s = await page.evaluate(() => window.__game.step(200));
    if (s.mode?.session === 'landed' || s.mode?.session === 'done') break;
  }
  log('flight', JSON.stringify(s.mode).slice(0, 400));
  await shot('flight-end');
  await page.waitForFunction(() => window.__game.state().ui === 'results', null, { timeout: 120000 });
  log('results', JSON.stringify(await page.evaluate(() => window.__game.state())).slice(0, 500));
  await shot('results');
  await page.evaluate(() => document.querySelector('.kn-res-retry')?.click());
  await new Promise((r) => setTimeout(r, 2500));
  log('after retry', JSON.stringify((await page.evaluate(() => window.__game.state())).mode).slice(0, 200));
} catch (e) {
  log('ERROR', e.message);
} finally {
  console.log(errs.slice(0, 20).join('\n'));
  await browser.close();
}
