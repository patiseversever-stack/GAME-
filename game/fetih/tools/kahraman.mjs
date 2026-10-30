// Kahraman maket bakıcısı: oyunu başsız Chromium'da açar, istenen yapıların kahraman modelini kurar ve Kuşbakışı
// açılış kadrajına benzer yakın çekimler alır (gündüz, kart yok). Geliştirme sırasında görsel denetim içindir.
//
//   node tools/kahraman.mjs çıktı-dizini [--kinds=selimiye,galata] [--q=0] [--yalin] [--views=0,1,2] [--html=…]
//
//   --yalin  kahraman kurulmaz: haritadaki yalın maket aynı kadrajda (eski/yeni kıyası)
//   --views  0: Kuşbakışı açılışı (oyunun kendi kadrajı: d_kusbakisi pickYaw ile aynı yön/eğim seçimi, komşu yapılar
//            gömülü), 1: üç çeyrek, 2: yüksek (yükselişin ortası), 3: çok yakın (ayrıntı denetimi)
//   --yaw=…  --lift=…  görünüm 0'ın yönünü ve ek eğimini elle ver (kadraj karşılaştırması)
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
			if (lm.lod) lm.lod.enabled = false; // yalın kıyasta ekran boyu kahramanı gelmesin
			lm.heroOff?.();
			const s = lm.sites.find((x) => x.kind === kind);
			if (!s) return null;
			const t0 = performance.now();
			const h = yalin ? null : lm.hero?.(kind, null, true); lm.heroes?.finishAO?.();
			return { kind, yalin, ms: Math.round(performance.now() - t0), stats: lm.heroes?.stats, x: s.x, y: s.y, z: s.z, r: s.r, hero: !!h };
		},
		{ kind, yalin: 'yalin' in opt },
	);
	if (info && opt.yaw != null) {
		info.yaw = Number(opt.yaw);
		info.lift = Number(opt.lift || 0);
	}
	if (!info) {
		console.log(kind + ': yok');
		continue;
	}
	console.log(`${kind}: ${info.hero ? `${info.stats?.tris} üçgen, kurulum ${info.stats?.build} ms (örtme dahil toplam ${info.ms} ms)` : 'yalın'}`);
	for (const v of views) {
		const fr = await page.evaluate(
			({ info, v }) => {
				const app = window.__fl.app;
				const c = app.cam;
				// görünüm 0: Kuşbakışı'nın kendi açılış kadrajı (d_kusbakisi.js pickYaw ile aynı seçim: yamaç ya da komşu
				// maket yapıyı örtmesin; tercih yapının ön yüzü)
				const s0 = app.props.landmarks.sites.find((x) => x.kind === info.kind);
				const near = 4.2 + info.r * 0.8;
				const y0 = info.y + info.r * 0.45;
				const plan = (u, yw, lift = 0) => ({ dist: near * Math.pow(64 / near, u), pitch: 0.3 + lift * (1 - u) * (1 - u) + (0.68 - lift * 0.4) * (1 - Math.pow(1 - u, 1.7)), yaw: yw + 0.9 * u, y: y0 + (info.y - y0) * Math.min(1, u * 1.5) });
				const pref = -(s0?.ry || 0) + 0.45;
				const bury = Math.max(1.6, info.r * 1.7);
				if (!info.yalin && app.props.landmarks.uHide) app.props.landmarks.uHide.value.z = bury;
				let yaw = pref;
				let lift0 = 0;
				let bestS = Infinity;
				const b = app.board;
				for (let n = 0; n < 48; n++) {
					const i = n % 16;
					const lift = [0, 0.16, 0.32][Math.floor(n / 16)];
					const yw = pref + (i < 8 ? i : i - 16) * (Math.PI / 8);
					let occ = 0;
					for (const [u, w] of [[0, 3], [0.1, 2], [0.22, 1]]) {
						const o = plan(u, yw, lift);
						const cp = Math.cos(o.pitch);
						const cx = info.x - Math.sin(o.yaw) * cp * o.dist;
						const cy = o.y + Math.sin(o.pitch) * o.dist;
						const cz = info.z + Math.cos(o.yaw) * cp * o.dist;
						for (let t = 0.16; t < 1.0; t += 0.06) {
							const x = info.x + (cx - info.x) * t;
							const y = info.y + info.r * 0.15 + (cy - info.y - info.r * 0.15) * t;
							const z = info.z + (cz - info.z) * t;
							if (Math.hypot(x - info.x, z - info.z) < info.r * 0.55) continue;
							if (b.heightAt && b.heightAt(x, z) + 0.12 > y) occ += w;
							for (const q of app.props.landmarks.sites) {
								if (q === s0 || (u < 0.16 && Math.hypot(q.x - info.x, q.z - info.z) < bury)) continue;
								if (Math.hypot(x - q.x, z - q.z) < q.r * 0.8 && y < q.y + (q.s || 1) * 0.75) occ += w * 0.7;
							}
						}
					}
					const d = Math.abs(Math.atan2(Math.sin(yw - pref), Math.cos(yw - pref)));
					if (occ + d * 0.9 + lift * 5 < bestS) {
						bestS = occ + d * 0.9 + lift * 5;
						yaw = yw;
						lift0 = lift;
					}
				}
				const V = [
					info.yaw != null ? { dist: near, pitch: 0.3 + (info.lift || 0), yaw: info.yaw, y: y0 } : { dist: near, pitch: 0.3 + lift0, yaw, y: y0 },
					{ dist: 5.2 + info.r, pitch: 0.55, yaw: -0.7, y: info.y + info.r * 0.3 },
					{ dist: 12, pitch: 0.75, yaw: 1.0, y: info.y },
					{ dist: 2.8, pitch: 0.16, yaw, y: info.y + 0.25 }, // 3: çok yakın (ayrıntı denetimi)
				][v];
				c.shot(info.x, info.z, { ...V, dur: 0.0001, arc: 0, distMin: 1, lens: 0.2 });
				c.target.set(info.x, V.y, info.z);
				c.dist = V.dist;
				c.pitch = V.pitch;
				c.yaw = V.yaw;
				for (let i = 0; i < 40; i++) app.frame(1 / 30, false);
				app.render();
				return { yaw: +yaw.toFixed(2), lift: lift0, occ: +bestS.toFixed(1) };
			},
			{ info, v },
		);
		if (v === 0) console.log('  kadraj ' + JSON.stringify(fr));
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
