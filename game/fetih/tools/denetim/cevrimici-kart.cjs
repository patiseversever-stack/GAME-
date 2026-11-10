// Çevrimiçi kart sınaması (galeri, tarayıcı): kart cevabı silinmiş görünümle (publicView) açılır, api.act/api.wait sunucu
// adımını taklit eder. Kullanım: NODE_PATH=... node tools/denetim/cevrimici-kart.cjs <SoruGalerisi.html> <balon|tunel|kelimeavi|kazi> <soru-kimliği>
const { chromium } = require('playwright');
(async () => {
	const [html, tip, id] = process.argv.slice(2);
	const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
	const p = await b.newPage({ viewport: { width: 390, height: 844 } });
	const errs = [];
	p.on('pageerror', (e) => errs.push(e.message));
	await p.goto('file://' + html + '#' + tip + '@' + id, { timeout: 180000 });
	await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody > *'), null, { timeout: 400000, polling: 250 });
	if (tip === 'kazi') {
		const no = await p.evaluate((id) => (window.__fl.app.ui.current.ctx.v.q.img), id);
		const pk = require('fs').readFileSync(require('path').join(__dirname, '../../sunucu-veri/yapi-karo/') + no + '.json', 'utf8');
		await p.evaluate((pk) => (window.__karo = JSON.parse(pk)), pk);
	}
	const yapiIstek = [];
	p.on('request', (r) => /yapi\/\d+\.webp/.test(r.url()) && yapiIstek.push(r.url()));
	// kartın mount'unu sar: cevapsız görünüm + sahte sunucu
	await p.evaluate(() => {
		const T = window.__fl.app.ui.current.ctx.T;
		if (T.__orig) return;
		T.__orig = T.mount;
		const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
		T.mount = function (el, full, api) {
			const pv = T.publicView(full);
			const W = window.__srv = { full, log: [], q: new Map() };
			const send = (k, d) => { W.log.push([k, d]); const l = W.q.get(k) || []; const f = l.shift(); if (f) f(d); else (W.q.set(k + '!', [...(W.q.get(k + '!') || []), d])); };
			const st = { p: [], g: [], got: new Set() };
			const sapi = Object.assign({}, api, {
				act(k, d) {
					setTimeout(() => {
						if (k === 'balon') { const b = full.b[d.k]; if (!b || st.p.includes(d.k)) return send('balon', { k: d.k, rejected: true }); st.p.push(d.k); send('balon', { k: d.k, ok: !!b.ok }); }
						if (k === 'yer') {
							if (d.k !== st.g.length) return send('yer', { k: d.k, rejected: true });
							st.g.push(d.g);
							const ys = [full.anchors[0].y, full.anchors[1].y, ...full.years.slice(0, d.k)].sort((a, b) => a - b);
							const want = ys.filter((x) => x < full.years[d.k]).length;
							send('yer', { k: d.k, g: want, ok: d.g === want, y: full.years[d.k] });
						}
						if (k === 'karo') {
							const P = window.__karo;
							const t = [];
							for (const x of d.c) if (!st.got.has('k' + x)) { st.got.add('k' + x); t.push([x, P.t[x] || null]); }
							send('karo', { t });
						}
						if (k === 'kelime') {
							const [r0, c0, r1, c1] = d.s;
							let i = -1;
							full.words.forEach((w, j) => { const [dr, dc] = DIRS[w.d]; const e = [w.r + dr * (w.len - 1), w.c + dc * (w.len - 1)]; if ((r0 === w.r && c0 === w.c && r1 === e[0] && c1 === e[1]) || (r1 === w.r && c1 === w.c && r0 === e[0] && c0 === e[1])) i = j; });
							if (i >= 0 && !st.got.has(i)) { st.got.add(i); send('kelime', { i, w: full.words[i].w }); } else send('kelime', { i: -1 });
						}
					}, 120); // ağ gecikmesi
				},
				wait(k, ms = 3000) {
					return new Promise((res) => {
						const pend = W.q.get(k + '!');
						if (pend && pend.length) return res(pend.shift());
						const l = W.q.get(k) || []; W.q.set(k, l);
						l.push(res);
						setTimeout(() => { const i = l.indexOf(res); if (i >= 0) { l.splice(i, 1); res(null); } }, ms);
					});
				},
			});
			return T.__orig.call(this, el, pv, sapi);
		};
	});
	await p.evaluate((h) => { location.hash = '#x'; location.hash = h; }, '#' + tip + '@' + id);
	await p.waitForTimeout(300);
	await p.evaluate(() => document.getElementById('g-again')?.click());
	await p.waitForFunction(() => window.__srv && document.querySelector('.fl-q.on .fl-qbody > *'), null, { timeout: 120000, polling: 200 });
	await p.waitForTimeout(3500);
	let out = {};
	if (tip === 'kelimeavi') {
		const full = await p.evaluate(() => window.__srv.full.words.map((w) => ({ r: w.r, c: w.c, d: w.d, len: w.len, w: w.w })));
		const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
		for (const w of full) {
			const [dr, dc] = DIRS[w.d];
			const pt = (r, c) => p.evaluate(([r, c]) => { const g = document.querySelector('.fl-q.on .ka-grid'); const b = g.getBoundingClientRect(); const n = window.__srv.full.n; const cs = b.width / n; return [b.left + (c + 0.5) * cs, b.top + (r + 0.5) * cs]; }, [r, c]);
			const [x0, y0] = await pt(w.r, w.c);
			const [x1, y1] = await pt(w.r + dr * (w.len - 1), w.c + dc * (w.len - 1));
			await p.mouse.move(x0, y0); await p.mouse.down();
			for (let k = 1; k <= 8; k++) await p.mouse.move(x0 + ((x1 - x0) * k) / 8, y0 + ((y1 - y0) * k) / 8);
			await p.mouse.up();
			await p.waitForTimeout(1600);
		}
		out = await p.evaluate(() => ({ bulunan: document.querySelectorAll('.fl-q.on .ka-clue.got').length, cevaplar: [...document.querySelectorAll('.fl-q.on .ka-clue.got .ka-ans')].map((e) => e.textContent), sunucu: window.__srv.log.map(([k, d]) => k + ':' + JSON.stringify(d)) }));
	}
	if (tip === 'tunel') {
		for (let k = 0; k < 3; k++) {
			await p.waitForTimeout(1200);
			const ok = await p.evaluate(() => { const g = [...document.querySelectorAll('.fl-q.on [data-g]')].filter((e) => e.offsetParent); if (!g.length) return false; g[0].click(); return g.length; });
			out['kart' + k] = ok;
			await p.waitForTimeout(2500);
		}
		out.pips = await p.evaluate(() => [...document.querySelectorAll('.fl-q.on .tn-pip i, .fl-q.on [class*="pip"] i')].map((e) => e.className).join(','));
		out.sunucu = await p.evaluate(() => window.__srv.log.map(([k, d]) => k + ':' + JSON.stringify(d)));
		out.cevap = await p.evaluate(() => !!document.querySelector('.fl-q.rv, .fl-q.on .over, .fl-q.on .yn-tn.over'));
	}
	if (tip === 'kazi') {
		const before = yapiIstek.length;
		const box = await p.evaluate(() => { const r = document.querySelector('.fl-q.on .yn-kz-fol').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
		await p.mouse.move(box[0] + box[2] * 0.3, box[1] + box[3] * 0.5); await p.mouse.down();
		for (let k = 1; k <= 12; k++) await p.mouse.move(box[0] + box[2] * (0.3 + 0.4 * k / 12), box[1] + box[3] * (0.5 + 0.1 * Math.sin(k)));
		await p.mouse.up();
		await p.waitForTimeout(1500);
		out = await p.evaluate(() => {
			const cv = document.querySelector('.fl-q.on canvas.yn-kz-yap');
			let dolu = 0;
			if (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) dolu++; }
			return { tuval: !!cv, img: !!document.querySelector('.fl-q.on img.yn-kz-yap'), boy: cv ? cv.width + 'x' + cv.height : null, doluPiksel: dolu, puan: document.querySelector('.fl-q.on .yn-kz-puan b')?.textContent, istenen: window.__srv.log.reduce((a, [k, d]) => a + (k === 'karo' ? d.t.length : 0), 0) };
		});
		out.gorselIstegi = yapiIstek.length - before;
	}
	if (tip === 'balon') {
		for (let k = 0; k < 4; k++) {
			await p.waitForTimeout(900);
			const pt = await p.evaluate(() => { const e = [...document.querySelectorAll('.fl-q.on .yn-bl-b')].find((x) => x.style.visibility !== 'hidden' && !x.classList.contains('pat') && !x.classList.contains('sondu') && x.getBoundingClientRect().top > 200 && x.getBoundingClientRect().bottom < innerHeight - 60); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height * 0.4]; });
			if (pt) await p.mouse.click(pt[0], pt[1]);
		}
		await p.waitForTimeout(800);
		out = await p.evaluate(() => ({ pat: document.querySelectorAll('.fl-q.on .yn-bl-b.pat').length, sondu: document.querySelectorAll('.fl-q.on .yn-bl-b.sondu').length, hud: document.querySelector('.fl-q.on .yn-bl-hud')?.textContent.replace(/\s+/g, ' ').trim(), sunucu: window.__srv.log.map(([k, d]) => k + ':' + JSON.stringify(d)) }));
	}
	console.log(tip, JSON.stringify(out, null, 1));
	if (errs.length) console.log('HATALAR', errs.slice(0, 5));
	await b.close();
})();
