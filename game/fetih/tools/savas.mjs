// Savaş filmi denetimi (geliştirme): oyunu başsız Chromium'da açar, istenen iki il arasında gerçek sinema
// kodunu (cinema.attack + sonuç anı) oynatır ve sabit anlarda ekran görüntüsü alır. Maç oynatmadan her
// ilde sahneyi (arazi, ağaç, kale, kıyı, küçük il) hızlıca görmek için. Zaman Playwright'ın sahte
// saatiyle ilerler (yavaş yazılım çiziciyle de gerçek zamanlama).
//
//   node tools/savas.mjs çıktı-dizini [--q=1 --w=412 --h=892 --dpr=1 --html=dist/FetihLigi.html]
//        [--cift=Aydın:Muğla,Bursa:Yalova:kale,…]   saldıran:hedef[:kale] (kale: hedef başkent, kuşatma)
//        [--sonuc=fetih|savunma|kimse]             sahra savaşının sonucu (kuşatmada kule yıkılır)
//        [--renk=0:1]                              saldıran:savunan oyuncu rengi (0 kırmızı, 1 mavi, 2 sarı, 3 mor)
//        [--an=300,1200,…] [--son=200,900,…]        saldırı ve sonuç içindeki çekim anları (ms)
//   node tools/savas.mjs çıktı-dizini --plan[=25] [--kale]  çizim yok: 81 ilin bütün komşu çiftlerinde sahne planı;
//                                                     sığan asker sayısına göre en kötü N çift ve plan süresi
//
// Çıktı: <çift>_a<k>.png (saldırı), <çift>_s<k>.png (sonuç); her çekimde çizim çağrısı ve üçgen sayısı.
// HATA satırı = sayfada hata.
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'savas-out';
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const W = Number(opt.w || 412);
const H = Number(opt.h || 892);
const Q = opt.q ?? '1';
const DPR = Number(opt.dpr || 1);
const PAIRS = (opt.cift || 'Aydın:Muğla').split(',').map((s) => s.split(':'));
const AT = (opt.an || '300,1100,1900,2700,3500,4300,5100,6000,6900').split(',').map(Number);
const END = (opt.son || '250,900,1600,2400,3300').split(',').map(Number);
const OUT = opt.sonuc || 'fetih';
const COL = (opt.renk || '0:1').split(':').map(Number);
mkdirSync(outDir, { recursive: true });

const exe =
	process.env.CHROMIUM ||
	['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium/chrome-linux64/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
await page.goto('file://' + resolve(opt.html || 'dist/FetihLigi.html') + `?debug&q=${Q}`);
await page.waitForFunction(() => window.__fl, null, { timeout: 240000 });
if (!('plan' in opt)) {
	await page.clock.install(); // --plan gerçek saatle ölçer
	await page.clock.pauseAt(Date.now() + 1000);
}
await page.evaluate(() => {
	const app = window.__fl.app;
	app.stop();
	window.__sv = { t: 0, busy: false, done: 0 };
	setInterval(() => app.frame(1 / 30, false), 1000 / 30);
});

async function snap(name) {
	await page.evaluate(() => {
		const app = window.__fl.app;
		app.frame(0, false);
		app.ui.update();
		app.render();
	});
	const file = join(outDir, name + '.png');
	await page.screenshot({ path: file });
	return page.evaluate(() => {
		const a = window.__fl.app;
		const s = a.stats();
		const bt = a.fx.battle;
		return { calls: s.calls, tris: s.tris, shadow: a.shadow.calls, programs: s.programs, units: bt.units.filter((u) => u.on).length };
	});
}

// --plan: çizim yok; bütün komşu il çiftlerinde sahne planı (sığan asker, yürüyüş) ve en kötüler
if ('plan' in opt) {
	const rep = await page.evaluate((kale) => {
		const app = window.__fl.app;
		const b = app.board;
		const rows = [];
		const t0 = performance.now();
		for (const T of b.provinces) {
			if (kale) {
				const k = app.castles[1];
				k.group.visible = true;
				k.place(b.topAt(T.index, new app.V3()));
			}
			for (const id of T.nb) {
				const S = b.byId.get(id);
				const pl = app.cinema.stagePlan(S.index, T.index, kale);
				const nA = pl.att.slots.length;
				const nD = pl.def.slots.length;
				rows.push({ s: S.name, t: T.name, nA, nD, L: pl.level, m: +pl.march.toFixed(2), amph: pl.amphib, mach: pl.machines.length, dbg: JSON.stringify(pl.dbg, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v)) });
			}
		}
		const ms = (performance.now() - t0) / rows.length;
		return { rows, ms };
	}, 'kale' in opt);
	const rows = rep.rows;
	rows.sort((a, b) => Math.min(a.nA, a.nD * 1.5) - Math.min(b.nA, b.nD * 1.5));
	console.log(`çift: ${rows.length}, plan başına ${rep.ms.toFixed(1)} ms`);
	for (const r of rows.slice(0, Number(opt.plan) || 25)) console.log(`${r.s} → ${r.t}: saldıran ${r.nA}, savunan ${r.nD}, düzey ${r.L}, yürüyüş ${r.m}${r.amph ? ' (çıkarma)' : ''}${'kale' in opt ? ` makine ${r.mach}` : ''} ${r.dbg}`);
	const avg = (k) => (rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(1);
	console.log(`ortalama: saldıran ${avg('nA')}, savunan ${avg('nD')}, yürüyüş ${avg('m')}`);
	await browser.close();
	process.exit(0);
}

for (const [sa, ta, kale] of PAIRS) {
	const tag = `${sa}_${ta}${kale ? '_kale' : ''}`.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9_ğüşöçı]/g, '');
	const ok = await page.evaluate(
		([sa, ta]) => {
			const app = window.__fl.app;
			const b = app.board;
			const find = (n) => b.provinces.find((p) => p.name === n || String(p.id) === n);
			const S = find(sa);
			const T = find(ta);
			if (!S || !T) return `il yok: ${sa} / ${ta}`;
			app.resetBoard();
			app.ui.title(false);
			return { S: S.index, T: T.index };
		},
		[sa, ta],
	);
	if (typeof ok === 'string') {
		console.log('HATA: ' + ok);
		continue;
	}
	await page.waitForTimeout(700); // başlık ekranının CSS geçişi (gerçek zaman) bitsin
	// sahne kurulumu ve saldırı (sinema promise'i sayfada bekler)
	await page.evaluate(
		([S, T, kale, OUT, COL]) => {
			const app = window.__fl.app;
			const b = app.board;
			const cin = app.cinema;
			const sv = window.__sv;
			const colors = app.playerColors;
			const P = (i, name, human) => ({ i, name, human, color: colors[i], css: '#' + colors[i].toString(16).padStart(6, '0'), capital: -1, alive: true, team: i, score: 0, look: null });
			const p = P(COL[0], 'Sen', true);
			const d = P(COL[1], 'Arda', false);
			const players = [];
			players[p.i] = p;
			players[d.i] = d;
			app.match = { players, map: b.provinces.map((q) => q.index), owner: (i) => b.provinces[i].owner, humanPlayer: p, phase: 'fetih', round: 3, standings: () => [p, d], neighbors: () => [], ally: () => false };
			b.setOwner(S, p.i, p.color);
			b.setOwner(T, d.i, d.color);
			for (const k of app.castles) k.group.visible = false;
			if (kale) {
				d.capital = T;
				const k = app.castles[d.i];
				k.repair();
				k.uniforms.uOwner.value.setHex(d.color);
				k.group.visible = true;
				k.place(b.topAt(T, new app.V3()));
			}
			app.lowFps = false;
			// başlangıç: maç bölgesi görünümü (saldırı seçiminden gelir gibi)
			app.cam.fit(app.boundsOf([S, T]), { pitch: 0.95, dur: 0.01 });
			sv.busy = true;
			sv.t0 = performance.now();
			cin.attack(p, d, T, !!kale).then(async () => {
				sv.t1 = performance.now();
				sv.phase = 'out';
				if (kale) {
					const left = app.castles[d.i].hit();
					await cin.towerDown(p, d, T, left);
				} else if (OUT === 'savunma') await cin.defend(d, T);
				else if (OUT === 'kimse') await cin.nobody(T);
				else {
					b.setOwner(T, p.i, p.color, b.provinces[T].x, b.provinces[T].z);
					await cin.conquer(p, T);
				}
				sv.t2 = performance.now();
				sv.busy = false;
			});
			sv.phase = 'att';
		},
		[ok.S, ok.T, !!kale, OUT, COL],
	);
	let t = 0;
	const step = 50;
	let k = 0;
	for (const at of AT) {
		while (t < at) {
			await page.clock.runFor(step);
			t += step;
		}
		const st = await snap(`${tag}_a${k++}`);
		console.log(`${tag} saldırı ${at} ms: çizim=${st.calls} gölge=${st.shadow} üçgen=${st.tris} program=${st.programs} birim=${st.units}`);
	}
	// saldırının bitmesini bekle, sonra sonuç anları
	for (let i = 0; i < 400; i++) {
		const ph = await page.evaluate(() => window.__sv.phase);
		if (ph === 'out') break;
		await page.clock.runFor(step);
	}
	const att = await page.evaluate(() => window.__sv.t1 - window.__sv.t0);
	console.log(`${tag} saldırı süresi: ${(att / 1000).toFixed(2)} sn`);
	t = 0;
	k = 0;
	for (const at of END) {
		while (t < at) {
			await page.clock.runFor(step);
			t += step;
		}
		const st = await snap(`${tag}_s${k++}`);
		console.log(`${tag} sonuç ${at} ms: çizim=${st.calls} gölge=${st.shadow} üçgen=${st.tris} program=${st.programs} birim=${st.units}`);
	}
	for (let i = 0; i < 400; i++) {
		if (!(await page.evaluate(() => window.__sv.busy))) break;
		await page.clock.runFor(step);
	}
	const out = await page.evaluate(() => window.__sv.t2 - window.__sv.t1);
	console.log(`${tag} sonuç süresi: ${(out / 1000).toFixed(2)} sn`);
	await page.clock.runFor(1500);
}
const errs = logs.filter((l) => /ERROR|pageerror|not valid|HATA|Uncaught/i.test(l));
if (errs.length) console.log('HATA:\n' + errs.slice(0, 20).join('\n'));
await browser.close();
