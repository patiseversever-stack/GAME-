// MAÇ GEZGİNİ: oyunun kendisiyle (FetihLigi.html) baştan sona bir maç oynar; insan koltuğu kendiliğinden oynar (il seçer,
// çarkı çevirir, soruyu kendi botunun cevabıyla cevaplar, canlı turları kendi akışına bırakır). Maç boyunca her yeni
// ekranda (menü, il seçimi, çark, soru, cevap, sıralama, sonuç, maç sonu) bütün belge çakışma denetiminden geçer
// (cakisma.cjs ile aynı ölçüm) ve ekran görüntüsü alınır. Ayrıca sayfa hataları ve takılma (60 sn hiçbir şey değişmiyor).
//   node tools/denetim/mac_gezgini.cjs <FetihLigi.html> <çıktı> [GxY=390x844] [mod=1v1] [uzunluk=quick] [bölge=ege]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const [html, out, sz = '390x844', mode = '1v1', length = 'quick', region = 'ege'] = process.argv.slice(2);
const [W, H] = sz.split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
// cakisma.cjs'teki ölçüm işlevi (tek kaynak)
const src = fs.readFileSync(path.join(__dirname, 'cakisma.cjs'), 'utf8');
const i0 = src.indexOf('const measure = () => {');
const i1 = src.indexOf('\n};\n', i0);
const MEASURE = src.slice(i0 + 'const measure = '.length, i1 + 2);

(async () => {
	const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
	const p = await b.newPage({ viewport: { width: W, height: H } });
	const errs = [];
	p.on('pageerror', (e) => errs.push(e.message));
	p.on('console', (m) => m.type() === 'error' && errs.push('konsol: ' + m.text().slice(0, 200)));
	const T0 = Date.now();
	const log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(0).padStart(4) + 's', ...a);
	await p.goto('file://' + path.resolve(html), { timeout: 180000 });
	await p.waitForFunction(() => window.__fl?.app?.ui, null, { timeout: 300000, polling: 500 });
	await p.waitForTimeout(2500);
	const bul = [];
	const seen = new Map();
	const olc = async (key) => {
		const r = await Promise.race([p.evaluate(`(${MEASURE})()`), new Promise((_, rej) => setTimeout(() => rej(new Error('60 sn yanıt yok')), 60000))]).catch((e) => ({ bad: ['ölçüm hatası: ' + e.message.split('\n')[0]], info: [] }));
		const n = (seen.get(key) || 0) + 1;
		seen.set(key, n);
		const file = `${String(seen.size).padStart(2, '0')}_${key.replace(/[^a-z0-9ğüşıöç_-]/gi, '_')}.png`;
		const shot = async (f) => {
			try {
				await p.screenshot({ path: path.join(out, f), timeout: 60000 });
			} catch (e) {
				// görüntü alınamadı: sayfa donmuş mu (betik yanıt veriyor mu)?
				const ok = await Promise.race([p.evaluate(() => 1).then(() => true), new Promise((r) => setTimeout(() => r(false), 20000))]);
				log(`GÖRÜNTÜ YOK ${key}: ${ok ? 'sayfa yanıt veriyor (yük)' : 'SAYFA DONMUŞ'}`);
				if (!ok) bul.push({ key, bad: ['sayfa donmuş (betik 20 sn yanıt vermiyor)'] });
			}
		};
		if (n === 1) await shot(file);
		if (r.bad.length) {
			if (n > 1) await shot(file.replace('.png', `_${n}.png`));
			bul.push({ key, n, bad: r.bad });
			log(`SORUN ${key}: ` + r.bad.join(' | '));
		}
		return r;
	};
	await olc('menu');
	// maçı başlat ve insan koltuğunu kendiliğinden oynat (sayfa içinde, gerçek saat)
	await p.evaluate(
		([mode, length, region]) => {
			const app = window.__fl.app;
			const ui = app.ui;
			const orig = ui.pickProvince.bind(ui);
			ui.pickProvince = (m, options, text, sec) => {
				window.__pick = { options, at: performance.now() };
				return orig(m, options, text, sec);
			};
			const A = (window.__oto = { last: '', at: performance.now(), q: null });
			setInterval(() => {
				const now = performance.now();
				// il seçimi: 1,5 sn sonra rastgele seçenek
				if (window.__pick && ui._pickRes && now - window.__pick.at > 1500) {
					const o = window.__pick.options;
					window.__pick = null;
					ui._pickRes(o[Math.floor(Math.random() * o.length)]);
				}
				// çark: 1,5 sn sonra rastgele kategori
				const wh = document.querySelector('.fl-wheel.pick [data-c]');
				if (wh && !document.querySelector('.fl-wheel .chosen')) {
					A.wh ||= now;
					if (now - A.wh > 1500) {
						const all = document.querySelectorAll('.fl-wheel.pick [data-c]');
						all[Math.floor(Math.random() * all.length)].click();
						A.wh = 0;
					}
				} else A.wh = 0;
				// soru: insan cevaplayan koltuktaysa 2,5 sn sonra kendi botunun cevabı (canlı turlar kendi akar)
				const c = ui.current;
				const card = document.querySelector('.fl-q.on');
				if (c && card && !card.classList.contains('spec') && !card.classList.contains('rv') && c.api && !c.answered) {
					const id = card.dataset.qid;
					if (A.q !== id) {
						A.q = id;
						A.qa = now;
					}
					if (now - A.qa > 2500 && !A.done?.has(id) && !/^(halat|fitil)$/.test(c.ctx?.q?.type)) {
						(A.done ||= new Set()).add(id);
						try {
							c.api.answer(c.ctx.T.bot(c.ctx.v, 0.7, Math.random).value);
						} catch (e) {
							window.__otoErr = (window.__otoErr || '') + c.ctx?.q?.type + ': ' + e.message + '\n';
						}
					}
				}
				// maç sonu: menüye dönme ya da yeniden oynama düğmesine dokunulmaz (ölçüm sürer)
			}, 250);
			ui.startMatch({ mode, length, region, bot: 'er' });
		},
		[mode, length, region],
	);
	// ekran anahtarı: hangi katman açık (soru tipi ve evresiyle)
	const KEY = () => {
		const vis = (s) => {
			const e = document.querySelector(s);
			if (!e) return false;
			const r = e.getBoundingClientRect();
			const cs = getComputedStyle(e);
			return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.5 && !e.classList.contains('off');
		};
		const m = window.__fl.app.match;
		const q = document.querySelector('.fl-q.on');
		const parts = [];
		if (m?.over || vis('.fl-end:not(.off)')) parts.push('macsonu');
		if (vis('.fl-wheel.pick')) parts.push('cark');
		if (window.__pick) parts.push('ilsec');
		if (q) parts.push('soru-' + (q.className.match(/t-([a-z]+)/)?.[1] || '?') + (q.classList.contains('rv') ? '-cevap' : '') + (q.classList.contains('spec') ? '-izle' : ''));
		if (vis('.sr-h')) parts.push('sira');
		if (vis('.fl-banner[class*="t-"]')) parts.push('afis');
		if (vis('.fl-duel')) parts.push('vs');
		return (parts.join('+') || 'harita') + '|' + (m?.phase || '-');
	};
	let lastKey = '';
	let stableAt = 0;
	let measured = '';
	let sig = '';
	let sigAt = Date.now();
	let mi = 0;
	let donma = 0;
	for (;;) {
		await p.waitForTimeout(400);
		const st = await Promise.race([p.evaluate(`(() => { const k = (${KEY.toString()})(); const m = window.__fl.app.match; return { k, over: !!m?.over, s: [m?.phase, m?.round, m?.players?.map((x) => x.score + ':' + x.alive).join(','), document.querySelector('.fl-q.on')?.dataset.qid, document.body.innerText.length].join('/') }; })()`), new Promise((r) => setTimeout(() => r(null), 30000))]);
		if (!st) {
			log('DONMA: sayfa 30 sn yanıt vermedi, son ekran ' + lastKey);
			bul.push({ key: 'donma', bad: ['sayfa 30 sn yanıt vermedi: ' + lastKey] });
			if (++donma >= 3) break;
			continue;
		}
		if (st.k !== lastKey) {
			lastKey = st.k;
			stableAt = Date.now();
		} else if (Date.now() - stableAt > 700 && measured !== st.k) {
			measured = st.k;
			mi++;
			await olc(st.k.replace('|', '_'));
		}
		if (st.s !== sig) {
			sig = st.s;
			sigAt = Date.now();
		} else if (Date.now() - sigAt > 60000) {
			log('TAKILDI: 60 sn hiçbir şey değişmedi: ' + st.k);
			bul.push({ key: 'takilma', bad: ['60 sn ilerlemedi: ' + st.k] });
			await p.screenshot({ path: path.join(out, 'takilma.png') });
			break;
		}
		if (st.over && measured.startsWith('macsonu')) {
			await p.waitForTimeout(2500);
			await olc('macsonu_son');
			break;
		}
		if (Date.now() - T0 > 40 * 60000) {
			log('SÜRE: 40 dk doldu');
			break;
		}
	}
	const otoErr = await p.evaluate(() => window.__otoErr || '');
	if (otoErr) errs.push('otomatik oyuncu: ' + otoErr);
	const ozet = { sz, mode, length, region, sure: Math.round((Date.now() - T0) / 1000), ekran: mi, sorun: bul, hatalar: [...new Set(errs)] };
	fs.writeFileSync(path.join(out, 'ozet.json'), JSON.stringify(ozet, null, 1));
	log(`BİTTİ ${sz} ${mode}: ${mi} ekran, ${bul.length} sorunlu ölçüm, ${ozet.hatalar.length} sayfa hatası`);
	for (const e of ozet.hatalar) log('HATA ' + e);
	await b.close();
})();
