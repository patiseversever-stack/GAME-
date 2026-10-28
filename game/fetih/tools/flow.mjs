// Gerçek maç akışı (geliştirme ve görsel denetim): oyunu başsız Chromium'da açar, baştan sona GERÇEK bir
// maç oynatır (insan oyuncu: il seçimlerini ve cevaplarını bu betik verir) ve gece odağının gerçek
// anlarını çeker. Oyun zamanı Playwright'ın sahte saatiyle ilerler: her adımda yalnızca oyun mantığı
// çalışır (çizim yok), görüntü yalnızca çekim anında çizilir. Böylece yavaş yazılım çiziciyle bile
// geçişler gerçek cihazdaki zamanlamayla görünür.
//
//   node tools/flow.mjs çıktı-dizini [--q=2 --w=412 --h=892 --dpr=1 --seed=7 --region=ege --mode=ffa3 --only=a,b --seq]
//
// Çekimler:
//   a_secim      insan il seçerken (gece, seçilebilir iller ışık adası)
//   b_bot        bot seçerken (seçenekleri aydınlık) ve b2_bot_secti (seçimi + boya dalgası)
//   c_saldiri    insan saldıracağı düşman ilini seçerken
//   d_duello     saldırı yürüyüşü (yalnızca saldıran ve hedef aydınlık), d2_kart_oncesi (soru kartından hemen önce)
//   e_fetih      fetih: gecede boya dalgası
//   f_safak      fetihten sonra şafak, f2_gunduz gündüze dönmüş hali
//   gunduz       sade gündüz (maç başı)
// Çıktıda HATA satırı = sayfada hata. Maç sonuna kadar oynanır; "maç bitti" satırı başarı demektir.
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'flow-out';
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const W = Number(opt.w || 412);
const H = Number(opt.h || 892);
const Q = opt.q ?? '2';
const DPR = Number(opt.dpr || 1);
const ONLY = opt.only ? new Set(opt.only.split(',')) : null;
const STEP = 1000 / 30; // oyun adımı (ms)
mkdirSync(outDir, { recursive: true });

const exe =
	process.env.CHROMIUM ||
	['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium/chrome-linux64/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({
	executablePath: exe,
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
const url = 'file://' + resolve('dist/FetihLigi.html') + `?debug&q=${Q}`;
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__fl, null, { timeout: 240000 });
console.log(`hazır: ${((Date.now() - t0) / 1000).toFixed(1)} sn`);

// sahte saat: bundan sonra zaman yalnızca runFor ile ilerler
await page.clock.install();
await page.clock.pauseAt(Date.now() + 1000);

const cfg = { mode: opt.mode || 'ffa3', length: 'quick', region: opt.region || 'ege', bot: 'er', seed: Number(opt.seed || 7), seq: 'seq' in opt };
await page.evaluate((cfg) => {
	const app = window.__fl.app;
	const ui = app.ui;
	app.stop();
	const W = (window.__flow = { want: [], log: [], done: false, err: null, picks: 0, attacks: 0, bots: 0, conq: 0, duel: 0, t: 0, seq: cfg.seq });
	const want = (name, ms) => setTimeout(() => W.want.push(name), ms);
	// oyun adımı: sahte saatte 30 kare/sn mantık (çizim yok)
	setInterval(() => {
		W.t += 1 / 30;
		app.frame(1 / 30, false);
	}, 1000 / 30);
	// --- insan: il seçimi (gece tam düşünce çek, sonra seç)
	const pick = ui.pickProvince;
	ui.pickProvince = function (m, options, text) {
		const pr = pick.call(this, m, options, text);
		const attack = /Saldır/i.test(text || '');
		const k = attack ? W.attacks++ : W.picks++;
		const name = attack ? (k === 0 ? 'c_saldiri' : null) : k === 0 ? 'a_secim' : null;
		if (name) want(name, 1500);
		// --seq: gece düşüşünün ara kareleri (geçişi denetlemek için)
		if (name === 'a_secim' && W.seq) for (const ms of [200, 450, 700, 950]) want('t_gecis_' + ms, ms);
		setTimeout(() => {
			// en çok komşusu olan seçeneği al (gerçek oyuncu gibi)
			const o = options[Math.floor(Math.random() * options.length)];
			app.onTap?.(o);
		}, name ? 1700 : 1100);
		return pr;
	};
	// --- bot seçimi
	const bot = ui.botPick;
	ui.botPick = function (m, p, i) {
		const k = W.bots++;
		if (k === 3) {
			want('b_bot', 650);
			want('b2_bot_secti', 1400);
		}
		return bot.call(this, m, p, i);
	};
	// --- saldırı, fetih
	const cin = app.cinema;
	const attack = cin.attack.bind(cin);
	cin.attack = (p, d, target, isCap) => {
		if (p.human && !W.duel++) want('d_duello', 1250);
		return attack(p, d, target, isCap);
	};
	const conquer = cin.conquer.bind(cin);
	cin.conquer = (p, i) => {
		if (!W.conq++) {
			want('e_fetih', 450);
			want('f_safak', 1400 + 420);
			want('f2_gunduz', 1400 + 1120);
		}
		return conquer(p, i);
	};
	// --- soru: kart açılmadan hemen önce (düelloda) çek; insan cevabını ver
	// çark kapanınca, soru kartı (ve düello girişi) açılmadan hemen önce
	// (yalnızca bu betikte: kart 0.4 sn gecikir ki o an çekilebilsin)
	const q = ui.question;
	let d2 = false;
	ui.question = async function (m, ctx) {
		if (ctx?.phase === 'duel' && ctx.attacker?.human && !d2) {
			d2 = true;
			W.want.push('d2_kart_oncesi');
			await new Promise((r) => setTimeout(r, 400));
		}
		const pr = q.call(this, m, ctx);
		if (ctx?.human) {
			const gen = this._gen;
			const go = () => {
				const c = this.current;
				if (!c || this._gen !== gen) return;
				if (!c.card.classList.contains('on')) return setTimeout(go, 200);
				const b = c.ctx.T.bot(c.ctx.v, 0.8, Math.random);
				c.api.answer(b.value);
			};
			setTimeout(go, 2600);
		}
		return pr;
	};
	// --- çark (insan dokunur), fetih dilimi: kategori seç, bitiş ekranı
	const obs = new MutationObserver(() => {
		const wh = ui.$.wheel;
		if (wh.style.pointerEvents === 'auto') {
			const c = wh.querySelector('.fl-catpick [data-c]');
			if (c) setTimeout(() => c.click(), 600);
			else setTimeout(() => wh.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), 700);
		}
		const end = ui.$.end;
		if (!end.classList.contains('off') && !W.endSeen) {
			W.endSeen = true;
			setTimeout(() => (end.querySelector('[data-x="menu"]') || end.querySelector('[data-x]'))?.click(), 1500);
		}
	});
	obs.observe(ui.el, { subtree: true, attributes: true, attributeFilter: ['style', 'class'], childList: true });
	W.want.push('gunduz_once');
	app.startMatch(cfg).then(
		() => (W.done = true),
		(e) => {
			W.err = String(e && e.stack ? e.stack : e);
			W.done = true;
		},
	);
	// açılış uçuşundan sonra sade gündüz
	want('gunduz', 2600);
}, cfg);

const shots = [];
async function snap(name) {
	if (ONLY && !ONLY.has(name[0]) && !ONLY.has(name)) return;
	await page.evaluate(() => {
		const app = window.__fl.app;
		app.frame(0, false);
		app.ui.update();
		app.render();
	});
	await page.waitForTimeout(950); // CSS geçişleri (gerçek zamanlı) otursun
	await page.evaluate(() => {
		const app = window.__fl.app;
		app.ui.update();
		app.render();
	});
	const file = join(outDir, name + '.png');
	await page.screenshot({ path: file });
	const st = await page.evaluate(() => ({ ...window.__fl.app.stats(), q: window.__fl.app.ui.$.q.className, night: +window.__fl.app.G.uNight.value.x.toFixed(2), t: +window.__flow.t.toFixed(1) }));
	shots.push(name);
	console.log(`${name}: oyun ${st.t} sn  gece=${st.night} kart=${st.q} çizim=${st.calls} üçgen=${st.tris} program=${st.programs}`);
}

const wall = Date.now();
let last = 0;
for (let it = 0; it < 40000; it++) {
	await page.clock.runFor(STEP * 3);
	const s = await page.evaluate(() => {
		const W = window.__flow;
		const w = W.want.splice(0);
		return { want: w, done: W.done, err: W.err, t: W.t };
	});
	for (const n of s.want) if (n !== 'gunduz_once') await snap(n);
	if (s.err) {
		console.log('HATA: maç akışı: ' + s.err);
		break;
	}
	if (s.done) {
		console.log(`maç bitti: oyun ${s.t.toFixed(0)} sn, gerçek ${((Date.now() - wall) / 1000).toFixed(0)} sn`);
		break;
	}
	if (ONLY && [...ONLY].every((k) => shots.some((n) => n[0] === k || n === k))) {
		console.log('istenen çekimler alındı');
		break;
	}
	if (s.t - last > 60) {
		last = s.t;
		console.log(`… oyun ${s.t.toFixed(0)} sn`);
	}
}
// q=0 için ayrıca: python/montaj yok; yalnızca çıktı listesi
const errs = logs.filter((l) => /ERROR|pageerror|not valid|HATA|Uncaught/i.test(l));
if (errs.length) console.log('HATA:\n' + errs.slice(0, 20).join('\n'));
await browser.close();
