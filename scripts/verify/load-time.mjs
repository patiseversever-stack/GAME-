// Yükleme süresi ölçümü (screencast YOK): oyun dosyası + varyant. node load-time.mjs <dosya> <görünüm> [varyant]
// varyantlar: normal | lite (deviceMemory=2) | reduce (prefers-reduced-motion) | noloader (orijinal dosyada anlamsız)
import path from 'node:path';
import { launch, newPage, VIEWS, root } from './lib.mjs';
const [, , fileArg, viewName = 'land-mid', variant = 'normal', runs = '2'] = process.argv;
const view = VIEWS[viewName];
const file = 'file://' + path.resolve(fileArg);
const browser = await launch();
const res = [];
for (let i = 0; i < +runs; i++) {
  const { ctx, page } = await newPage(browser, view, 1);
  if (variant === 'lite') await page.addInitScript(() => Object.defineProperty(navigator, 'deviceMemory', { value: 2 }));
  if (variant === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.__m = {}; const orig = performance.mark.bind(performance); });
  await page.goto(file, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.game, null, { timeout: 170000, polling: 100 });
  const tGame = await page.evaluate(() => performance.now());
  await page.waitForFunction(() => !document.getElementById('gp-loader') && (!document.getElementById('loading') || document.getElementById('loading').hidden), null, { timeout: 170000, polling: 100 });
  const tGone = await page.evaluate(() => performance.now());
  const marks = await page.evaluate(() => Object.fromEntries(performance.getEntriesByType('mark').map(m => [m.name, Math.round(m.startTime)])));
  res.push({ tGame: Math.round(tGame), tGone: Math.round(tGone), marks });
  await ctx.close();
}
console.log(path.basename(fileArg), viewName, variant, JSON.stringify(res));
await browser.close();
