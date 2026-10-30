// Kahraman maket bakıcısı: oyunu başsız Chromium'da açar, istenen yapıların kahraman modelini kurar ve Kuşbakışı
// açılış kadrajına benzer yakın çekimler alır (gündüz, kart yok). Geliştirme sırasında görsel denetim içindir.
//
//   node tools/kahraman.mjs çıktı-dizini [--kinds=selimiye,galata] [--q=0] [--yalin] [--views=0,1,2] [--html=…]
//
//   --yalin  kahraman kurulmaz: haritadaki yalın maket aynı kadrajda (eski/yeni kıyası)
//   --views  0: Kuşbakışı açılışı (yakın, alçak), 1: üç çeyrek, 2: yüksek (yükselişin ortası)
// Çıktı: <yapı>_<görünüm>.png; konsolda üçgen sayısı ve kurulum süreleri. HATA satırı = sayfada hata.
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || 'kahraman-out');
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')).map(([k, ...v]) => [k, v.join('=')]));
mkdirSync(outDir, { recursive: true });
const W = Number(opt.w || 412);
const Hh = Number(opt.h || 892);
const exe =
	process.env.CHROMIUM ||
	['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium/chrome-linux64/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: W, height: Hh }, deviceScaleFactor: Number(opt.dpr || 1) });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message + '\n' + (e.stack || '')));
page.on('console', (m) => {
	if ((m.type() === 'error' || m.type() === 'warning') && !/KHR_parallel/.test(m.text())) errs.push('[console] ' + m.text());
});
await page.goto('file://' + resolve(opt.html || 'dist/FetihLigi.html') + `?debug&q=${opt.q ?? '0'}`);
await page.waitForFunction(() => window.__fl, null, { timeout: 300000 });
const kinds = opt.kinds ? opt.kinds.split(',') : await page.evaluate(() => window.__fl.app.props.landmarks.sites.map((s) => s.kind));
const views = (opt.views || '0').split(',').map(Number);
await page.evaluate(() => {
	const app = window.__fl.app;
	app.stop();
	app.ui.title(false);
	app.ui.el.style.display = 'none'; // arayüz yok: yalnız sahne
	app.board.night?.(false, null, { hold: 0 });
});
for (const kind of kinds) {
	const info = await page.evaluate(
		({ kind, yalin }) => {
			const app = window.__fl.app;
			const lm = app.props.landmarks;
			lm.heroOff?.();
			const s = lm.sites.find((x) => x.kind === kind);
			if (!s) return null;
			const t0 = performance.now();
			const h = yalin ? null : lm.hero?.(kind, null, true); lm.heroes?.finishAO?.();
			return { ms: Math.round(performance.now() - t0), stats: lm.heroes?.stats, x: s.x, y: s.y, z: s.z, r: s.r, hero: !!h };
		},
		{ kind, yalin: 'yalin' in opt },
	);
	if (!info) {
		console.log(kind + ': yok');
		continue;
	}
	console.log(`${kind}: ${info.hero ? `${info.stats?.tris} üçgen, kurulum ${info.stats?.build} ms (örtme dahil toplam ${info.ms} ms)` : 'yalın'}`);
	for (const v of views) {
		await page.evaluate(
			({ info, v }) => {
				const app = window.__fl.app;
				const c = app.cam;
				const V = [
					{ dist: 4.2 + info.r * 0.8, pitch: 0.3, yaw: 0.6, y: info.y + info.r * 0.45 },
					{ dist: 5.2 + info.r, pitch: 0.55, yaw: -0.7, y: info.y + info.r * 0.3 },
					{ dist: 12, pitch: 0.75, yaw: 1.0, y: info.y },
				][v];
				c.shot(info.x, info.z, { ...V, dur: 0.0001, arc: 0, distMin: 1, lens: 0.2 });
				c.target.set(info.x, V.y, info.z);
				c.dist = V.dist;
				c.pitch = V.pitch;
				c.yaw = V.yaw;
				for (let i = 0; i < 40; i++) app.frame(1 / 30, false);
				app.render();
			},
			{ info, v },
		);
		await page.screenshot({ path: join(outDir, `${kind}_${v}.png`) });
	}
}
const st = await page.evaluate(() => {
	const app = window.__fl.app;
	app.render();
	return app.stats();
});
console.log('stats ' + JSON.stringify(st));
for (const e of errs) console.log('HATA ' + e);
await browser.close();
