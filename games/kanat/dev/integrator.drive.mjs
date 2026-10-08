// Integrator driver (Node + playwright-core, SwiftShader): opens the game, runs a scripted scenario through
// window.__game and takes screenshots. FPS is meaningless here.
// Usage: node dev/integrator.drive.mjs <scenario> [baseUrl] [outDir]
//   scenarios: boot | ftue | career | menu | daily | free | suru | landscape
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const [scenario = 'boot', base = 'http://localhost:5173', outDir = 'tests/out/int'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const landscape = scenario === 'landscape';
const browser = await chromium.launch({ executablePath: CHROME, args: ARGS, headless: true });
const ctx = await browser.newContext({ viewport: landscape ? { width: 844, height: 390 } : { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const shot = async (name) => {
  // SwiftShader frames take 1–3 s: hold the loop, draw one frame synchronously, capture, resume
  await page.evaluate(() => {
    const g = window.__kanat;
    if (!g) return;
    g.app.loop.stop();
    g.mode?.render(0, 1 / 60);
    if (!g.mode || !g.mode.ownsRender) g.scene.render(1 / 60);
  });
  await page.screenshot({ path: `${outDir}/${name}.png`, timeout: 120000 });
  await page.evaluate(() => window.__kanat?.app.loop.start());
  log('shot', name);
};
const state = () => page.evaluate(() => window.__game.state());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const q = scenario === 'ftue' ? '?test=1&ftue=1' : '?test=1';
  await page.goto(`${base}/${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.kanatBoot === 'ok', null, { timeout: 60000 });
  await page.evaluate(() => window.__game.ready());
  log('ready');
  await sleep(1500);
  await shot(`${scenario}-00-ready`);
  log(JSON.stringify(await state()).slice(0, 600));
  if (scenario === 'ftue') {
    for (const t of [500, 1500, 2500, 3500]) {
      await sleep(t === 500 ? 0 : 1000);
      await shot(`ftue-film-${t}`);
    }
    await sleep(2500);
    await shot('ftue-atla');
    await page.mouse.click(195, 500);
    await sleep(1500);
    await shot('ftue-jump');
    await page.evaluate(() => window.__game.bot('expert'));
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.__game.step(300));
      await sleep(400);
      const s = await state();
      log(JSON.stringify(s.mode).slice(0, 300));
      await shot(`ftue-fly-${i}`);
      if (s.mode && (s.mode.session === 'landed' || s.mode.session === 'done')) break;
    }
    await sleep(3000);
    await shot('ftue-results');
    await sleep(5000);
    await shot('ftue-menu');
  } else if (scenario === 'career' || scenario === 'landscape') {
    await page.evaluate(() => window.__game.goto('career', 'w1r1'));
    await sleep(2000);
    await shot(`${scenario}-01-start`);
    await page.evaluate(() => window.__game.bot('expert'));
    for (let i = 0; i < 14; i++) {
      await page.evaluate(() => window.__game.step(240));
      await sleep(500);
      const s = await state();
      log(JSON.stringify(s.mode).slice(0, 260));
      if (i % 2 === 0) await shot(`${scenario}-fly-${i}`);
      if (s.mode && (s.mode.session === 'landed' || s.mode.session === 'done')) break;
    }
    await sleep(3500);
    await shot(`${scenario}-results`);
    log(JSON.stringify(await state()).slice(0, 900));
  } else if (scenario === 'menu') {
    await page.evaluate(() => window.__game.goto('menu'));
    await sleep(3000);
    await shot('menu');
  } else if (scenario === 'daily' || scenario === 'free') {
    await page.evaluate((m) => window.__game.goto(m), scenario);
    await sleep(2500);
    await shot(`${scenario}-start`);
    await page.evaluate(() => window.__game.bot('careful'));
    for (let i = 0; i < 14; i++) {
      await page.evaluate(() => window.__game.step(300));
      await sleep(400);
      const s = await state();
      log(JSON.stringify(s.mode).slice(0, 260));
      if (s.mode && (s.mode.session === 'landed' || s.mode.session === 'done')) break;
    }
    await sleep(3500);
    await shot(`${scenario}-results`);
  } else if (scenario === 'suru') {
    await page.evaluate(() => window.__game.goto('suru', 'practice'));
    await sleep(4000);
    await shot('suru-start');
    await page.evaluate(() => window.__game.step(60 * 60));
    await sleep(2000);
    await shot('suru-60s');
    log(JSON.stringify(await state()).slice(0, 400));
  }
} catch (err) {
  log('ERROR', err.message);
  await shot(`${scenario}-error`).catch(() => {});
} finally {
  const bad = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]') || l.startsWith('[warning]'));
  console.log('--- console (errors/warnings) ---');
  console.log(bad.slice(0, 40).join('\n'));
  console.log('--- last logs ---');
  console.log(logs.slice(-15).join('\n'));
  await browser.close();
}
