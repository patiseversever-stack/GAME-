// Ekran görüntüsü aracı (geliştirme için): test sayfasını başsız Chromium'da açar,
// istenen anları çizip PNG kaydeder.
//   node tools/shot.mjs views.json out-dir [--w=412 --h=892 --q=2]
// views.json: [{ "name": "bahar", "call": "debugView", "args": [{ "level": 0 }] }, ...]
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [viewsFile, outDir = 'verify-out'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const W = Number(opt.w || 412);
const H = Number(opt.h || 892);
const Q = opt.q ?? '2';
const views = JSON.parse(readFileSync(viewsFile, 'utf8'));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(opt.dpr || 1) });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const url = 'file://' + resolve('dist/UluKayin_Test.html') + `?debug&q=${Q}` + (opt.extra ? '&' + opt.extra : '');
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__uk, null, { timeout: 180000 });
console.log(`hazır: ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
for (const v of views) {
	const t1 = Date.now();
	if (v.eval) await page.evaluate(v.eval);
	if (v.call)
		await page.evaluate(([call, args]) => {
			const a = window.__uk.app;
			const fix = (x) => (x && x.__v3 ? new a.V3(...x.__v3) : x);
			a[call](...args.map(fix));
		}, [v.call, v.args || []]);
	await page.screenshot({ path: join(outDir, v.name + '.png') });
	const st = await page.evaluate(() => window.__uk.app.stats());
	console.log(`${v.name}: ${((Date.now() - t1) / 1000).toFixed(1)} sn  çizim=${st.calls} üçgen=${st.tris} program=${st.programs}`);
}
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
