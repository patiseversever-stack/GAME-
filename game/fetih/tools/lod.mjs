// Ekran boyuna göre ayrıntı (herolod.js) denetimi: oyunu başsız Chromium'da açar, kamerayı bir yapıya yavaşça
// yaklaştırır (ve geri uzaklaştırır), kare kare görüntü alır; her karede kahraman yuvalarının geçiş değeri, çizim
// çağrısı ve üçgen sayısı yazılır. Kare süresi (yazılım çizici, göreli) de ölçülür.
//
//   node tools/lod.mjs çıktı-dizini [--html=dist/FetihLigi.html] [--site=selimiye] [--q=0] [--n=24] [--from=34 --to=7]
//                      [--every=1] [--off] [--night]
//   --off    LOD kapalı (eski davranış: hep yalın maket) — aynı kadrajlar
//   --night  gece odağında (bütün harita gecede, il aydınlık)
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || 'lod-out');
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')).map(([k, ...v]) => [k, v.join('=') || '1']));
mkdirSync(outDir, { recursive: true });
const exe = process.env.CHROMIUM || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: Number(opt.w || 412), height: Number(opt.h || 892) } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/KHR_parallel/.test(m.text()) && errs.push('[console] ' + m.text()));
await page.goto('file://' + resolve(opt.html || 'dist/FetihLigi.html') + `?debug&q=${opt.q ?? '0'}`);
await page.waitForFunction(() => window.__fl, null, { timeout: 300000 });
const site = opt.site || 'selimiye';
const N = Number(opt.n || 24);
const from = Number(opt.from || 34);
const to = Number(opt.to || 7);
await page.evaluate(
	({ site, off, night }) => {
		const app = window.__fl.app;
		app.stop();
		app.ui.title(false);
		app.ui.el.style.display = 'none';
		const lm = app.props.landmarks;
		if (lm.lod) lm.lod.enabled = !off;
		const s = lm.sites.find((x) => x.kind === site);
		const b = app.board;
		if (night) b.night(true, [b.pick(s.x, s.z)]);
		else b.night(false, null, { hold: 0 });
		window.__lod = { s };
	},
	{ site, off: 'off' in opt, night: 'night' in opt },
);
const rows = [];
for (let i = 0; i < N; i++) {
	// yaklaşma: logaritmik uzaklık, hafif dönüş (kamera hareketi sırasında geçiş)
	const u = i / (N - 1);
	const dist = from * Math.pow(to / from, u);
	const r = await page.evaluate(
		async ({ dist, u }) => {
			const app = window.__fl.app;
			const { s } = window.__lod;
			const c = app.cam;
			c.shot(s.x, s.z, { y: s.y, dist, pitch: 0.95 - 0.5 * u, yaw: 0.5 + 0.4 * u, dur: 0.0001, arc: 0, distMin: 1 });
			c.target.set(s.x, s.y, s.z);
			c.dist = dist;
			c.pitch = 0.95 - 0.5 * u;
			c.yaw = 0.5 + 0.4 * u;
			// 0,25 sn oyun zamanı (8 kare) + kurulum dilimleri için gerçek zamanlayıcılara fırsat
			for (let k = 0; k < 8; k++) {
				app.frame(1 / 30, false);
				await new Promise((res) => setTimeout(res, 0));
			}
			const t0 = performance.now();
			app.render();
			const ms = performance.now() - t0;
			const st = app.stats();
			const lod = app.props.landmarks.lod;
			return { dist: +dist.toFixed(1), ms: Math.round(ms), calls: st.calls, tris: st.tris, slots: lod ? lod.slots.map((x) => (x.site ? `${x.site.kind}:${x.fade.toFixed(2)}` : '-')).join(' ') : '' };
		},
		{ dist, u },
	);
	rows.push(r);
	console.log(`${String(i).padStart(2)} uzaklık ${r.dist}  çizim ${r.calls}  üçgen ${r.tris}  çizim süresi ${r.ms} ms  yuvalar ${r.slots}`);
	if (i % Number(opt.every || 1) === 0) await page.screenshot({ path: join(outDir, `k${String(i).padStart(2, '0')}.png`) });
}
for (const e of errs) console.log('HATA ' + e);
await browser.close();
