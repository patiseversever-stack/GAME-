// Gerçek maç akışı (geliştirme ve görsel denetim): oyunu başsız Chromium'da açar, baştan sona GERÇEK bir
// maç oynatır (insan oyuncu: il seçimlerini ve cevaplarını bu betik verir) ve gece odağının gerçek
// anlarını çeker. Oyun zamanı Playwright'ın sahte saatiyle ilerler: her adımda yalnızca oyun mantığı
// çalışır (çizim yok), görüntü yalnızca çekim anında çizilir. Böylece yavaş yazılım çiziciyle bile
// geçişler gerçek cihazdaki zamanlamayla görünür.
//
//   node tools/flow.mjs çıktı-dizini [--html=eski.html --ek=gece=2 --q=2 --w=412 --h=892 --dpr=1 --seed=7 --region=ege --mode=ffa3 --length=long --only=a,b --tam --seq]
//   (--tam: --only verilse de maç sonuna dek oynanır. y_<tip>, y_<tip>_cevap: yeni tipin ilk kartı ve cevap filmi;
//   sonda soru akışı: an:tip listesi)
//
// Çekimler:
//   a_baskent    insan başkentini seçerken (kamera tepeden, seçilebilir iller aydınlık)
//   a0_rozetler  başkentler yerleşince kalelerin üstünde SEN ve bot rozetleri (gündüz)
//   a_secim      insan il seçerken (gece, seçilebilir iller ışık adası)
//   b_bot        bot seçerken (seçenekleri aydınlık) ve b2_bot_secti (seçimi + boya dalgası)
//   c_saldiri    insan saldıracağı düşman ilini seçerken
//   d_duello     saldırı yürüyüşü (yalnızca saldıran ve hedef aydınlık), d2_kart_oncesi (soru kartından hemen önce),
//                d3_soru (soru kartı açıkken: etiketler ve harita kartın arkasında)
//   e_fetih      fetih: gecede boya dalgası
//   f_safak      fetihten sonra şafak, f2_gunduz gündüze dönmüş hali
//   m_harita_0..6  ilk harita sorusu: kamera geçişi (0–3), oturmuş kadraj (4), cevap açılışı (5–6)
//   s_savas_0..8   insanın ilk sahra saldırısı: cinema.attack başından sabit anlarda (S_AT ms) savaş filmi
//   s_cark         aynı saldırıda çark dönerken (sahne arkada), s_fetih_0..3 / s_savunma_0..2 sonucu
//   k_kusatma_0..8 ilk kuşatma (kim saldırırsa), k_kule_0..3 kule yıkılışı
//   w_cark_0..2  insanın ilk çark çevirişi: dokunmayı bekleyen çark (0), hızlı dönüş (1), sonuç kartı (2)
//   w_cark_3     "Fetih!" dilimi gelirse kategori seçimi (maçta çıkmazsa çekilmez)
//   gunduz       sade gündüz (maç başı)
// Çıktıda HATA satırı = sayfada hata. Maç sonuna kadar oynanır; "maç bitti" satırı başarı demektir.
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'flow-out';
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')).map(([k, ...v]) => [k, v.join('=')])); // --ek=gece=2: ilk = ayırır
const W = Number(opt.w || 412);
const H = Number(opt.h || 892);
const Q = opt.q ?? '2';
const DPR = Number(opt.dpr || 1);
const ONLY = opt.only ? new Set(opt.only.split(',')) : null;
const STEP = 1000 / 30; // oyun adımı (ms)
const S_AT = [400, 1300, 2200, 3100, 3900, 4600, 5300, 6100, 6900]; // savaş filmi çekim anları (ms, saldırı başından)
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
const url = 'file://' + resolve(opt.html || 'dist/FetihLigi.html') + `?debug&q=${Q}` + (opt.ek ? '&' + opt.ek : ''); // --html: başka bir derleme (kıyas için), --ek=gece=2: sayfa adresine ek
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__fl, null, { timeout: 240000 });
console.log(`hazır: ${((Date.now() - t0) / 1000).toFixed(1)} sn`);

// sahte saat: bundan sonra zaman yalnızca runFor ile ilerler
await page.clock.install();
await page.clock.pauseAt(Date.now() + 1000);

const cfg = { mode: opt.mode || 'ffa3', length: opt.length || 'quick', region: opt.region || 'ege', bot: 'er', seed: Number(opt.seed || 7), seq: 'seq' in opt, sat: S_AT };
await page.evaluate((cfg) => {
	// tekrarlanabilir akış: sayfanın Math.random'ı tohumdan (aynı tohum → aynı seçimler ve cevaplar)
	let rs = (cfg.seed * 2654435761) | 0;
	Math.random = () => {
		rs = (rs + 0x6d2b79f5) | 0;
		let t = Math.imul(rs ^ (rs >>> 15), 1 | rs);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const app = window.__fl.app;
	const ui = app.ui;
	app.stop();
	const W = (window.__flow = { want: [], log: [], done: false, err: null, picks: 0, attacks: 0, bots: 0, conq: 0, duel: 0, d3: 0, t: 0, seq: cfg.seq, siege: 0, tower: 0, def: 0, ySeen: {}, yRev: null, yeni: ['kusbakisi', 'ilavi', 'kimim', 'sive', 'halat', 'mancinik', 'yanlis', 'ikidogru', 'harfal', 'azbilinen', 'tufan', 'kayip', 'fitil', 'golge'] });
	// betiğin kendi seçimleri (insan oyuncunun il seçimi ve cevapları) ayrı tohumlu üreteçten: çizim tarafındaki
	// rastgelelik (parçacık, ordu) değişse de eski ve yeni derleme aynı maçı oynar (kıyas aynı anları gösterir)
	let rs2 = (cfg.seed * 40503 + 977) | 0;
	W.R = () => {
		rs2 = (rs2 + 0x6d2b79f5) | 0;
		let t = Math.imul(rs2 ^ (rs2 >>> 15), 1 | rs2);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const want = (name, ms) => setTimeout(() => W.want.push(name), ms);
	// oyun adımı: sahte saatte 30 kare/sn mantık (çizim yok)
	setInterval(() => {
		W.t += 1 / 30;
		app.frame(1 / 30, false);
	}, 1000 / 30);
	// --- insan: il seçimi (gece tam düşünce çek, sonra seç)
	const pick = ui.pickProvince;
	ui.pickProvince = function (m, options, text, sec) {
		const pr = pick.call(this, m, options, text, sec);
		const attack = /Saldır/i.test(text || '');
		const capital = m.phase === 'baskent';
		const k = capital ? 0 : attack ? W.attacks++ : W.picks++;
		const name = capital ? 'a_baskent' : attack ? (k === 0 ? 'c_saldiri' : null) : k === 0 ? 'a_secim' : null;
		if (name) want(name, 1500);
		// --seq: gece düşüşünün ara kareleri (geçişi denetlemek için)
		if (name === 'a_secim' && W.seq) for (const ms of [200, 450, 700, 950]) want('t_gecis_' + ms, ms);
		setTimeout(() => {
			// en çok komşusu olan seçeneği al (gerçek oyuncu gibi)
			const o = options[Math.floor(W.R() * options.length)];
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
		// savaş filmi: insanın ilk sahra saldırısı ve ilk kuşatma (kimin olursa)
		if (p.human && !isCap && !W.film) {
			W.film = 1;
			W.filmOn = true;
			cfg.sat.forEach((ms, k) => want('s_savas_' + k, ms));
		}
		if (isCap && !W.siege++) {
			W.siegeOn = true;
			cfg.sat.forEach((ms, k) => want('k_kusatma_' + k, ms));
		}
		return attack(p, d, target, isCap).then((r) => {
			if (W.filmOn) want('s_cark', 1800);
			return r;
		});
	};
	const tower = cin.towerDown.bind(cin);
	cin.towerDown = (p, d, i, left) => {
		if (W.siegeOn && !W.tower++) [300, 900, 1700, 2600].forEach((ms, k) => want('k_kule_' + k, ms));
		W.siegeOn = false;
		return tower(p, d, i, left);
	};
	const nobody = cin.nobody.bind(cin);
	cin.nobody = (i) => {
		W.filmOn = false;
		W.siegeOn = false;
		return nobody(i);
	};
	const defend = cin.defend.bind(cin);
	cin.defend = (d, i, o) => {
		if (W.filmOn) [300, 1100, 2000].forEach((ms, k) => want('s_savunma_' + k, ms));
		W.filmOn = false;
		W.siegeOn = false;
		return defend(d, i, o);
	};
	const intro = cin.introBadges?.bind(cin);
	if (intro)
		cin.introBadges = (pl) => {
			want('a0_rozetler', 900);
			return intro(pl);
		};
	const conquer = cin.conquer.bind(cin);
	cin.conquer = (p, i) => {
		if (W.filmOn) [300, 1000, 1800, 2700].forEach((ms, k) => want('s_fetih_' + k, ms));
		W.filmOn = false;
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
		// harita sorusu ("X nerede?"): kameranın geçişi, oturmuş kadraj ve cevap açılışı
		if (ctx?.T?.needsMap && ctx?.human && !W.mapSeen) {
			W.mapSeen = 1;
			[[0, 40], [1, 350], [2, 700], [3, 1100], [4, 2200], [5, 3500], [6, 4700]].forEach(([k, ms]) => want('m_harita_' + k, ms));
		}
		const pr = q.call(this, m, ctx);
		// v1.2 soru düzeni: soru akışı günlüğü (an:tip) ve yeni tiplerin ilk kartı (insan cevaplarken) ile cevap filmi
		const type = ctx?.q?.type;
		W.log.push(`${ctx?.phase || ''}:${type}${ctx?.human ? '' : '(izle)'}`);
		const yeni = W.yeni.includes(type);
		const first = yeni && ctx?.human && !W.ySeen[type];
		if (first) W.ySeen[type] = 1;
		const live = type === 'halat' || type === 'fitil';
		if (ctx?.human) {
			const gen = this._gen;
			const go = () => {
				const c = this.current;
				if (this._gen !== gen) return;
				// düello girişi sürerken kart henüz kurulmamış olabilir: kart açılana dek bekle
				if (!c || c.ctx !== ctx || !c.card.classList.contains('on')) return setTimeout(go, 200);
				if (ctx?.phase === 'duel' && ctx.attacker?.human && !W.d3++) want('d3_soru', 700);
				if (first) {
					want('y_' + type, live ? 6000 : 1800);
					W.yRev = type;
				}
				// canlı turda (Halat, Fitil) insan cevabı turun kendisi: kart kendi bitirir (betik basmaz)
				if (live) return;
				setTimeout(() => {
					if (this.current !== c || this._gen !== gen) return;
					const b = c.ctx.T.bot(c.ctx.v, 0.8, W.R);
					c.api.answer(b.value);
				}, first ? 2700 : 0); // ilk kart: önce çekim (1,8 sn), sonra cevap
			};
			setTimeout(go, first ? 1700 : 2600);
		}
		return pr;
	};
	// cevap filmi: yeni tipin ilk cevabı (film ortası)
	const rv = ui.reveal;
	ui.reveal = function (m, ctx) {
		const t = ctx?.q?.type;
		if (W.yRev && t === W.yRev) {
			want('y_' + t + '_cevap', t === 'tufan' ? 5200 : 1500);
			W.yRev = null;
		}
		return rv.call(this, m, ctx);
	};
	// --- çark: insanın ilk çevirişi (betik 0,7 sn sonra dokunur), "Fetih!" diliminde kategori seçimi
	const wheel = ui.wheel;
	ui.wheel = function (m, p) {
		if (p.human && !W.wheelSeen) {
			W.wheelSeen = 1;
			[[0, 300], [1, 1400], [2, 5500]].forEach(([k, ms]) => want('w_cark_' + k, ms));
		}
		return wheel.call(this, m, p);
	};
	const chooseCat = ui.chooseCategory;
	ui.chooseCategory = function (m, sec) {
		if (!W.catSeen) {
			W.catSeen = 1;
			want('w_cark_3', 400);
		}
		return chooseCat.call(this, m, sec);
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
	// sahte saat dururken çekim bazen bir kare bekleyip takılıyor (yazılım çizici): saati 16 ms'lik adımlarla dürt
	let ok = false;
	const shot = page.screenshot({ path: file, timeout: 180000 }).then(() => (ok = true));
	while (!ok) {
		await Promise.race([shot, page.waitForTimeout(2000)]);
		if (!ok) await page.clock.runFor(16);
	}
	const st = await page.evaluate(() => ({ ...window.__fl.app.stats(), q: window.__fl.app.ui.$.q.className, night: +window.__fl.app.G.uNight.value.x.toFixed(2), spot: window.__fl.app.G.uSpot.value.toArray().map((v) => +v.toFixed(2)).join('/'), t: +window.__flow.t.toFixed(1) }));
	shots.push(name);
	console.log(`${name}: oyun ${st.t} sn  gece=${st.night} havuz=${st.spot} kart=${st.q} çizim=${st.calls} üçgen=${st.tris} program=${st.programs}`);
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
		const fl = await page.evaluate(() => window.__flow.log);
		const yeni = fl.filter((x) => /:(kusbakisi|ilavi|kimim|sive|halat|mancinik|yanlis|ikidogru|harfal|azbilinen|tufan|kayip|fitil|golge)/.test(x)).length;
		console.log(`soru akışı (${fl.length} soru, ${yeni} yeni tip): ${fl.join(' ')}`);
		break;
	}
	if (ONLY && !('tam' in opt) && [...ONLY].every((k) => shots.some((n) => n[0] === k || n === k))) {
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
