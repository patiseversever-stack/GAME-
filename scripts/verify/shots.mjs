// Belirli zamanlarda (seek) kare alır: node scripts/verify/shots.mjs <görünüm> <t1,t2,...> [dpr]
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, previewURL, VIEWS, root } from './lib.mjs';
const [, , viewName = 'land-mid', times = '0,300,600,900,1200,1500,1800,2100,2300,4000', dpr = '1', extra = ''] = process.argv;
const view = VIEWS[viewName];
const outDir = path.join(root, 'verify-out', viewName); fs.mkdirSync(outDir, { recursive: true });
const browser = await launch();
const { ctx, page } = await newPage(browser, view, +dpr);
const q = { mode: 'seek', w: view.w, h: view.h, coarse: view.coarse ? 1 : 0 }; if (extra) Object.assign(q, Object.fromEntries(new URLSearchParams(extra)));
await page.goto(previewURL(q));
await page.waitForFunction(() => window.__gp);
for (const t of times.split(',').map(Number)) {
  await page.evaluate(t => window.__gp.seek({ t }), t);
  await page.waitForTimeout(60);
  const file = path.join(outDir, `t${String(t).padStart(5, '0')}.png`);
  await page.screenshot({ path: file });
  console.log('✓', file);
}
await browser.close();
