// Çıkış evresi: oyunun GERÇEK karesi arkada, yükleyici gerçek köşelere morph olur.
// node scripts/verify/outro-shots.mjs <görünüm> <bg.png> [from=4500] [t1,t2,...] [quick=0]
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, previewURL, VIEWS, root } from './lib.mjs';
const [, , viewName = 'land-mid', bg, from = '4500', times = '0,100,200,300,400,500,600,700,800', quick = '0'] = process.argv;
const view = VIEWS[viewName];
const fx = JSON.parse(fs.readFileSync(path.join(root, 'scripts/verify/fixtures/game-quads.json'), 'utf8'));
const quad = fx[viewName].quad;
const outDir = path.join(root, 'verify-out', viewName + '-outro'); fs.mkdirSync(outDir, { recursive: true });
const browser = await launch();
const { page } = await newPage(browser, view, 1);
await page.goto(previewURL({ mode: 'seek', w: view.w, h: view.h, coarse: view.coarse ? 1 : 0, bg: 'file://' + bg }));
await page.waitForFunction(() => window.__gp);
for (const t of times.split(',').map(Number)) {
  await page.evaluate(([t, from, quad, quick]) => window.__gp.seekOutro({ t, from: +from, quad, quick: quick === '1' }), [t, from, quad, quick]);
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(outDir, `t${String(t).padStart(5, '0')}.png`) });
}
await browser.close(); console.log('tamam', outDir);
