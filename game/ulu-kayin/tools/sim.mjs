// Oynanış testi: her bölümü üç farklı "oyuncu" ile oynatır ve sonuçları yazar.
//   node tools/sim.mjs [bölümler: 0,1,2] [politikalar: smart,behind,none]
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

const levels = (process.argv[2] || '0,1,2,3,4,5,6,7').split(',').map(Number);
const policies = (process.argv[3] || 'smart,behind,none').split(',');
const browser = await chromium.launch({
	executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('file://' + resolve('dist/UluKayin_Test.html') + '?debug&q=0');
await page.waitForFunction(() => window.__uk, null, { timeout: 180000 });
for (const level of levels) {
	for (const policy of policies) {
		const r = await page.evaluate((o) => window.__uk.app.debugSim(o), { level, policy });
		console.log(JSON.stringify(r));
	}
}
if (errs.length) console.log('HATA:', errs.join('\n'));
await browser.close();
