// Kuşbakışı çekimleri: soru galerisini başsız Chromium'da açar, Kuşbakışı örneklerini sırayla GERÇEK akışla oynatır
// (düello sahnesi, kart, kamera yükselişi) ve kartın açılışından belli anlarda ekran görüntüsü alır. Oyun zamanı
// Playwright'ın sahte saatiyle ilerler (yavaş yazılım çizicide de kamera gerçek zamanlamada).
//
//   node tools/kusbakisi.mjs çıktı-dizini [--html=dist/SoruGalerisi.html] [--ids=dn-kb1,dn-kb7] [--at=0.6,8]
//                            [--w=412 --h=892] [--pick=1] [--map=1]
//
//   --ids   örnek kimlikleri (vars. hepsi); çekim adı: <kimlik>_<an>.png (an: kart açıldıktan sonra sn)
//   --pick  her örnekte bir şıkka dokunur ve cevap ekranını da çeker (<kimlik>_cevap.png)
//   --map   ek çekim: bütün harita (harita_tum.png) ve --ids yapılarının çevresi (harita_<kimlik>.png)
// Çıktıda HATA satırı = sayfada hata. Son satırda harita çizim çağrısı ve üçgen sayısı (app.stats()).
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || 'kb-out');
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')).map(([k, ...v]) => [k, v.join('=')]));
const W = Number(opt.w || 412);
const H = Number(opt.h || 892);
const AT = (opt.at || '0.6,8').split(',').map(Number);
mkdirSync(outDir, { recursive: true });

const exe =
	process.env.CHROMIUM ||
	['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium/chrome-linux64/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message + '\n' + (e.stack || '')));
page.on('console', (m) => {
	if (m.type() === 'error') errs.push('[console] ' + m.text());
});
const url = 'file://' + resolve(opt.html || 'dist/SoruGalerisi.html') + '#kusbakisi';
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__fl && document.querySelector('#g-next'), null, { timeout: 300000 });
console.log(`hazır: ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
await page.clock.install();
await page.clock.pauseAt(Date.now() + 1000);
await page.evaluate(() => {
	const app = window.__fl.app;
	app.stop();
	window.__kb = { t: 0 };
	setInterval(() => app.frame(1 / 30, false), 1000 / 30);
});
const run = (ms) => page.clock.runFor(ms);
const shot = async (name) => {
	await page.evaluate(() => {
		const app = window.__fl.app;
		app.ui.update();
		app.render();
	});
	await page.screenshot({ path: join(outDir, name + '.png') });
};
// galerinin listesindeki örnek kimlikleri: ‹ › ile gezilir (sayaç "k/n")
const count = async () => page.evaluate(() => parseInt(document.querySelector('.gal .nv b')?.textContent.split('/')[1]) || 0);
const n = await count();
const want = opt.ids ? new Set(opt.ids.split(',')) : null;
const cardOn = () => page.evaluate(() => !!document.querySelector('.fl-q.on'));
const qid = () => page.evaluate(() => window.__kbq || null);
// hangi örnekteyiz: galerinin çizdiği soru metni yerine örnek sırası
for (let k = 0; k < n; k++) {
	if (k > 0) {
		await page.click('#g-next');
		await run(50);
	}
	const id = await page.evaluate((k) => {
		// örnek kimliği galeri modülünde gizli: deneme örnek listesi sırasıyla aynı
		return 'k' + (k + 1);
	}, k);
	const key = `dn-kb${k + 1}`;
	if (want && !want.has(key) && !want.has(id)) continue;
	// kart açılana dek (düello girişi + kart) zamanı ilerlet
	let waited = 0;
	while (!(await cardOn()) && waited < 20000) {
		await run(100);
		waited += 100;
	}
	let tcur = 0;
	for (const at of AT) {
		await run(Math.max(0, at * 1000 - tcur));
		tcur = at * 1000;
		await shot(`${key}_${String(at).replace('.', '_')}`);
	}
	if (opt.pick) {
		await page.evaluate(() => document.querySelector('.fl-q.on .fl-opt')?.click());
		await run(3500);
		await shot(`${key}_cevap`);
	}
	console.log(key + ' tamam');
}
if (opt.map) {
	await page.evaluate(() => {
		const app = window.__fl.app;
		app.ui.reset();
		app.board.night?.(false, null, { hold: 0 });
		app.props.landmarks.fade(true);
		app.cam.fit(app.boundsOf(app.board.provinces.map((p) => p.index)), { pitch: 0.98, dur: 0.01 });
	});
	await run(1500);
	await shot('harita_tum');
}
const st = await page.evaluate(() => {
	const app = window.__fl.app;
	app.render();
	return app.stats();
});
console.log('stats ' + JSON.stringify(st));
for (const e of errs) console.log('HATA ' + e);
await browser.close();
