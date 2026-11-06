// ÇAKIŞMA DENETİMİ v2 (soru galerisi, bütün ekran):
//   node tools/denetim/cakisma.cjs <dist/SoruGalerisi.html> <tip,tip|cover> <GxY,GxY|hepsi> <çıktı_klasörü> [evre: soru,cevap] [paralel: 3]
// Her tip ve ekran boyunda soruyu galeride açar; "soru" evresinde (kart oturunca) ve "cevap" evresinde (cevaplanıp
// cevap filmi ve damga oturunca, animasyonlar sonuna sarılarak) bütün belgeyi ölçer:
//   örtülme : görünür her yazı satırının üstünde (boyama sırasıyla, elementsFromPoint) başka bir öğe var mı:
//             başka yazı → "yazı yazıya biniyor", rozet/düğme/damga → "X, Y yazısını örtüyor".
//             Ekranın %35'inden büyük katmanlar (perde, kart zemini) sayılmaz: onların altı zaten görünmez.
//   kesik   : yazı bir atasının taşma kırpmasıyla (overflow) ya da ekran kenarıyla kesiliyor mu (kaydırılmadan
//             görünmeyen içerik dahil)
//   düğme   : iki dokunulabilir öğe (button, .fl-opt, .gal-fab…) üst üste mi
//   taşma   : görünür bir öğe (kırpılmamış hali) ekranın yanından taşıyor mu
// Çıktı: her durum için satır + ekran görüntüsü (<tip>_<evre>_<G>x<Y>.png) + özet.json; sorun varsa çıkış kodu 1.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BOYLAR = ['320x568', '360x640', '375x667', '390x844', '412x915', '430x932', '768x1024', '1280x720'];
const COVER = ['ikidogru', 'yanlis', 'gozkarari', 'halat', 'mancinik'];
const argv = process.argv.slice(2);
const [html, typesA = 'cover', sizesA = 'hepsi', out = '.', evreA = 'soru,cevap', parA = '3'] = argv;
const types = typesA === 'cover' ? COVER : typesA.split(',');
const sizes = sizesA === 'hepsi' ? BOYLAR : sizesA.split(',');
const evreler = evreA.split(',');
fs.mkdirSync(out, { recursive: true });

async function answer(p, t) {
	const c = (sel, i = 0) => p.evaluate(([s, k]) => document.querySelectorAll(s)[k]?.click(), [sel, i]);
	if (t === 'yanlis') {
		const bad = await p.evaluate(() => window.__fl?.app?.match?.cur?.v?.bad ?? 1);
		await c('.fl-q.on .dn-yb-c', bad);
		await p.waitForTimeout(600);
		await p.evaluate((i) => (document.querySelector('.fl-q.on .fl-send:not([disabled])') || document.querySelectorAll('.fl-q.on .dn-yb-c')[i])?.click(), bad);
		await p.waitForTimeout(1500);
		await c('.fl-q.on .dn-yb-o .fl-opt');
	} else if (t === 'ikidogru') await c('.fl-q.on .dn-id-c', 1);
	else if (t === 'mancinik') await c('.fl-q.on .fl-send');
	else if (t === 'halat' || t === 'fitil') return; // sabit tur, kendiliğinden biter
	else if (t === 'harfal') {
		// kelimeyi klavyeden yaz, GÖNDER
		const w = await p.evaluate(() => window.__fl?.app?.match?.cur?.v?.word || '');
		for (const ch of w) {
			await p.evaluate((c) => [...document.querySelectorAll('.fl-q.on .fl-key')].find((k) => k.textContent.trim() === c)?.click(), ch);
			await p.waitForTimeout(80);
		}
		await c('.fl-q.on .fl-send');
	} else if (t === 'azbilinen') {
		await c('.fl-q.on .dn-ab-i');
		await p.waitForTimeout(300);
		await c('.fl-q.on .fl-send');
	}
	else {
		// her tip: kendi botunun (usta) cevabıyla, kartın kendi cevap yolundan (api.answer); yoksa ilk şık
		const done = await p.evaluate(() => {
			const c = window.__fl?.app?.ui?.current;
			const T = c?.ctx?.T;
			if (!T || !c.api?.answer) return false;
			try {
				c.api.answer(T.bot(c.ctx.v, 0.95, Math.random).value);
				return true;
			} catch {
				return false;
			}
		});
		if (!done) await p.evaluate(() => (document.querySelector('.fl-q.on .fl-opt') || document.querySelector('.fl-q.on .fl-send'))?.click());
	}
}

const measure = () => {
	const vw = innerWidth;
	const vh = innerHeight;
	// büyük katman eşiği oyun alanına göre: galerinin geniş görünümlerinde oyun bir telefon çerçevesinde (1280×720 → 325×704);
	// pencere alanıyla ölçülünce kart zemini hiç "büyük" sayılmıyor, opak kartın altındaki harita yazısı "örtülü" çıkıyordu
	const gr = document.querySelector('.fl-ui')?.getBoundingClientRect();
	const big = (gr && gr.width * gr.height > 0 ? gr.width * gr.height : vw * vh) * 0.35;
	const vis = (e) => (e.checkVisibility ? e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true);
	const ad = (e) => {
		if (!e || e.nodeType !== 1) return String(e);
		const c = String(e.className?.baseVal ?? e.className ?? '').trim().split(/\s+/)[0];
		return e.tagName.toLowerCase() + (c ? '.' + c : '');
	};
	const isect = (a, b) => ({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });
	const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
	const hit = (a, b, m = 2) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > m && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > m;
	const opq = (e) => {
		let o = 1;
		for (let x = e; x && x.nodeType === 1; x = x.parentElement) o *= +getComputedStyle(x).opacity;
		return o;
	};
	// görünür alan: atalardaki taşma kırpması ve ekran
	const clipOf = (e) => {
		let r = { left: 0, top: 0, right: vw, bottom: vh };
		for (let x = e.parentElement; x && x !== document.documentElement; x = x.parentElement) {
			const cs = getComputedStyle(x);
			if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.contain.includes('paint')) {
				const b = x.getBoundingClientRect();
				r = isect(r, { left: cs.overflowX === 'visible' ? -1e9 : b.left, right: cs.overflowX === 'visible' ? 1e9 : b.right, top: cs.overflowY === 'visible' ? -1e9 : b.top, bottom: cs.overflowY === 'visible' ? 1e9 : b.bottom });
			}
			if (cs.position === 'fixed') break;
		}
		return r;
	};
	const bad = [];
	const info = [];
	const say = (m) => bad.push(m);
	// 1) yazı satırları
	const lines = [];
	const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	for (let n = w.nextNode(); n; n = w.nextNode()) {
		const el = n.parentElement;
		if (!n.textContent.trim() || !el || el.closest('script,style,noscript') || !vis(el) || opq(el) < 0.12) continue;
		const r = document.createRange();
		r.selectNodeContents(n);
		for (const b of r.getClientRects()) if (b.width > 2 && b.height > 4) lines.push({ n, el, b, s: n.textContent.trim().slice(0, 26) });
	}
	// 2) kesik yazı (kırpma ya da ekran dışı)
	for (const L of lines) {
		const c = clipOf(L.el);
		const v = isect(L.b, c);
		const full = area(L.b);
		const seen = area(v);
		L.v = v;
		if (seen <= 0) continue; // tamamen gizli (kapalı panel, kaydırma dışında bir bütün satır): aşağıda ayrıca
		if (L.el.closest('[data-kaydir]')) continue; // bilinçli kayan liste (Az Bilinen'in uzun seçenek listesi): aşağıda bilgi olarak
		if (seen < full * 0.97 && (L.b.right - v.right > 1.5 || v.left - L.b.left > 1.5 || L.b.bottom - v.bottom > 2 || v.top - L.b.top > 2))
			say(`kesik yazı: "${L.s}" (${ad(L.el)}) ${Math.round(full - seen)}px² görünmüyor`);
	}
	// kaydırılmadan görünmeyen içerik (kaydırılabilir kaplar)
	for (const e of document.querySelectorAll('.fl-ui *, .gal-fab')) {
		const cs = getComputedStyle(e);
		if (!(cs.overflowY === 'auto' || cs.overflowY === 'scroll') || !vis(e)) continue;
		const d = e.scrollHeight - e.clientHeight;
		if (d > 2 && e.hasAttribute('data-kaydir')) info.push(`kayan liste: ${ad(e)} ${d}px (bilinçli; altı solar)`);
		else if (d > 2) say(`gizli içerik: ${ad(e)} ${d}px kaydırma istiyor`);
	}
	// 3) örtülme: boyama sırasıyla üstte kim var
	const st = document.createElement('style');
	st.textContent = '*,*::before,*::after{pointer-events:auto!important}';
	document.head.appendChild(st);
	const related = (a, b) => a === b || a.contains(b) || b.contains(a);
	const seenPair = new Set();
	for (const L of lines) {
		const v = L.v;
		if (!v || area(v) <= 0) continue;
		const y = (v.top + v.bottom) / 2;
		for (const fx of [0.12, 0.5, 0.88]) {
			const x = v.left + (v.right - v.left) * fx;
			if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
			const stack = document.elementsFromPoint(x, y);
			let top = null;
			let hidden = false;
			// büyük katman: zemini opaksa (renk ya da ekranı kaplamayan bir panelin degradesi) altındaki yazı görünmez, çakışma
			// da yoktur; saydam perde (vinyet, sinema karartması) yazıyı gizlemez
			const opaque = (e, b) => {
				const cs = getComputedStyle(e);
				const a = (cs.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1] || '0,0,0,0').split(',').map(Number);
				const alpha = a.length > 3 ? a[3] : 1;
				const panel = cs.backgroundImage.includes('gradient') && b.width * b.height < vw * vh * 0.9;
				return (alpha >= 0.85 || panel) && opq(e) >= 0.9;
			};
			const iL = stack.findIndex((e) => related(e, L.el));
			// yazı ile üstündeki her şey arasında opak bir panel varsa yazı zaten görünmüyor
			for (let j = 0; j < (iL < 0 ? stack.length : iL); j++) {
				const e = stack[j];
				const b = e.getBoundingClientRect();
				if (b.width * b.height >= big && !related(e, L.el) && opaque(e, b)) {
					hidden = true;
					break;
				}
			}
			for (const e of stack) {
				if (hidden) break;
				if (related(e, L.el)) break; // önce yazının kendisine (ya da atasına) ulaştık: üstünde yabancı yok
				const b = e.getBoundingClientRect();
				if (b.width * b.height >= big) continue;
				if (opq(e) < 0.12 || !vis(e)) continue;
				const cs = getComputedStyle(e);
				if (e.tagName === 'CANVAS') continue;
				// boş, saydam kutu (zemin yok, kenar yok, yazı yok, görsel yok) sayılmaz
				const own = [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
				const paints = own || cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 || e.tagName === 'IMG' || e instanceof SVGElement;
				if (!paints) continue;
				top = e;
				break;
			}
			if (hidden || !top) continue;
			const key = ad(top) + '|' + L.s;
			if (seenPair.has(key)) break;
			seenPair.add(key);
			const tx = lines.find((o) => o.el !== L.el && related(o.el, top) && o.v && x >= o.v.left && x <= o.v.right && y >= o.v.top && y <= o.v.bottom);
			say(tx ? `yazı yazıya biniyor: "${tx.s}" (${ad(tx.el)}) ↔ "${L.s}" (${ad(L.el)})` : `${ad(top)} yazıyı örtüyor: "${L.s}" (${ad(L.el)})`);
			break;
		}
	}
	st.remove();
	// 4) dokunulabilir öğeler üst üste
	const taps = [...document.querySelectorAll('button, .fl-opt, .gal-fab, .fl-pbtn, [role=button], .dn-id-c, .dn-yb-c')].filter((e) => vis(e) && opq(e) > 0.12);
	for (let i = 0; i < taps.length; i++)
		for (let j = i + 1; j < taps.length; j++) {
			const a = taps[i];
			const b = taps[j];
			if (related(a, b)) continue;
			const ra = isect(a.getBoundingClientRect(), clipOf(a));
			const rb = isect(b.getBoundingClientRect(), clipOf(b));
			if (!(area(ra) > 0 && area(rb) > 0 && hit(ra, rb, 3))) continue;
			// kesimli (clip-path) düğmede dokunma alanı kesimin kendisi: kesişimin noktalarında gerçekten ikisi birden mi dokunuluyor
			const ov = isect(ra, rb);
			let both = 0;
			let n = 0;
			for (const fx of [0.2, 0.5, 0.8])
				for (const fy of [0.2, 0.5, 0.8]) {
					const x = ov.left + (ov.right - ov.left) * fx;
					const y = ov.top + (ov.bottom - ov.top) * fy;
					const hitEl = document.elementFromPoint(x, y);
					n++;
					if (hitEl && (a.contains(hitEl) || b.contains(hitEl))) both += a.contains(hitEl) && b.contains(hitEl) ? 1 : 0;
				}
			// kesimli ya da eğik (transform) levhalar komşusuyla kutu köşesinde kesişir, şekilleri değil: kesişim küçükse sayılmaz
			const shaped = (e) => getComputedStyle(e).clipPath !== 'none' || getComputedStyle(e).transform !== 'none';
			const small = area(ov) < 0.2 * Math.min(area(ra), area(rb));
			const clipped = getComputedStyle(a).clipPath !== 'none' || getComputedStyle(b).clipPath !== 'none';
			if (!((clipped && !both) || ((shaped(a) || shaped(b)) && small))) say(`düğmeler üst üste: ${ad(a)} ↔ ${ad(b)}`);
		}
	// 4b) sözde öğe yazısı (::before/::after içeriği: "SN", etiketler): öğenin içeriği kutusundan ya da ekrandan taşıyor mu
	for (const e of document.querySelectorAll('.fl-ui *, .fl-q *')) {
		if (!vis(e) || opq(e) < 0.12) continue;
		const pc = [getComputedStyle(e, '::before').content, getComputedStyle(e, '::after').content].filter((c) => /^"[^"]+"$/.test(c));
		if (!pc.length) continue;
		const r = e.getBoundingClientRect();
		if (!r.width) continue;
		const cs = getComputedStyle(e);
		const over = cs.overflowX === 'visible' && e.scrollWidth > e.clientWidth + 1 && cs.display !== 'inline';
		// taşanı gizleyen kutuda (overflow ≠ visible) içerik kutunun dışına çıkamaz: kutunun kendisi ölçülür
		// scrollWidth öğenin kendi (yakınlaştırılmamış) biriminde; dikdörtgen yakınlaştırılmış: aynı birime çevrilir
		const zf = e.currentCSSZoom || 1;
		const right = r.left + Math.max(r.width, cs.display !== 'inline' && cs.overflowX === 'visible' ? e.scrollWidth * zf : 0);
		if (over || right > vw + 1) say(`sözde yazı taşıyor: ${ad(e)} ${pc.join(' ')} (${over ? 'kutusundan ' + (e.scrollWidth - e.clientWidth) + ' px' : 'ekrandan'})`);
	}
	// 5) yana taşma (kırpılmamış görünür öğe)
	for (const e of document.querySelectorAll('.fl-ui *')) {
		if (e instanceof SVGElement && e.tagName !== 'svg') continue;
		if (!vis(e) || opq(e) < 0.12) continue;
		const r = e.getBoundingClientRect();
		if (!r.width || !r.height) continue;
		const v = isect(r, clipOf(e));
		if (area(v) <= 0) continue;
		if (v.right > vw + 1 || v.left < -1) {
			say(`yana taşıyor: ${ad(e)} (${Math.round(v.left)}…${Math.round(v.right)} / ${vw})`);
			break;
		}
	}
	return { bad: [...new Set(bad)], info };
};

const hashOf = (spec) => '#' + encodeURIComponent(spec).replace(/%40/g, '@').replace(/%3A/g, ':');

/** spec'i aç: yeni sayfada (goto) ya da TEK kipinde açık sayfada adresi değiştirerek (harita yeniden kurulmaz). */
async function openSpec(p, spec, reuse) {
	const t = spec.split(/[:@]/)[0];
	const id = spec.includes('@') ? spec.split('@')[1] : '';
	if (!reuse) {
		await p.goto('file://' + path.resolve(html) + hashOf(spec), { timeout: 180000 });
		await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody > *'), null, { timeout: 400000, polling: 250 });
		if (t !== 'halat') await p.evaluate(() => document.getElementById('g-time')?.click());
		await p.waitForTimeout(1500);
	} else {
		const prev = await p.evaluate(() => document.querySelector('.fl-q')?.dataset.qid || '');
		await p.evaluate((h) => (location.hash = h), hashOf(spec));
		await p.waitForFunction(
			([t, id, prev]) => {
				const q = document.querySelector('.fl-q.on');
				return q && q.classList.contains('t-' + t) && (id ? q.dataset.qid === id : q.dataset.qid !== prev) && q.querySelector('.fl-qbody > *');
			},
			[t, id, prev],
			{ timeout: 180000, polling: 250 },
		);
	}
	await p.waitForFunction(() => { const q = document.querySelector('.fl-q.on'); return q && q.querySelector('.fl-qbody > *') && getComputedStyle(q).opacity === '1'; }, null, { timeout: 120000, polling: 250 });
	await p.waitForTimeout(1500);
}

async function one(b, spec, sz, page = null) {
	const t = spec.split(/[:@]/)[0];
	const [W, H] = sz.split('x').map(Number);
	const p = page || (await b.newPage({ viewport: { width: W, height: H } }));
	const errs = [];
	const onErr = (e) => errs.push(e.message);
	p.on('pageerror', onErr);
	const res = [];
	let broken = false;
	try {
		await openSpec(p, spec, !!page && page.__acik);
		if (evreler.includes('soru')) {
			await p.evaluate(() => document.getAnimations().forEach((a) => { try { if (a.effect?.getTiming().iterations !== Infinity) a.finish(); } catch {} }));
			await p.waitForTimeout(300);
			const { bad, info } = await p.evaluate(measure);
			await p.screenshot({ path: path.join(out, `${spec.replace(/[:@]/g, '_')}_soru_${W}x${H}.png`) });
			res.push({ t: spec, evre: 'soru', sz, bad, info, errs: [...errs] });
		}
		if (evreler.includes('cevap')) {
			await answer(p, t);
			// sabit turlu tipler (Fitil, Halat) yavaş ortamda soru evresi ölçülürken bitebilir: cevap ekranı görünmüşse ya da
			// tur sonu damgası duruyorsa o an ölçülür
			await p
				.waitForFunction(() => document.querySelector('.fl-q.rv') || document.querySelector('.fl-q.on .fl-stamp.on'), null, { timeout: 180000, polling: 250 })
				.catch((e) => {
					if (t !== 'fitil' && t !== 'halat') throw e;
				});
			await p.waitForTimeout(t === 'mancinik' ? 3500 : 1800);
			await p.evaluate(() => document.getAnimations().forEach((a) => { try { if (a.effect?.getTiming().iterations !== Infinity) a.finish(); } catch {} }));
			await p.waitForTimeout(400);
			const { bad, info } = await p.evaluate(measure);
			await p.screenshot({ path: path.join(out, `${spec.replace(/[:@]/g, '_')}_cevap_${W}x${H}.png`) });
			res.push({ t: spec, evre: 'cevap', sz, bad, info, errs: [...errs] });
		}
	} catch (e) {
		res.push({ t: spec, evre: 'hata', sz, bad: ['denetim çalışmadı: ' + e.message.split('\n')[0]], errs });
		broken = true;
	}
	p.off('pageerror', onErr);
	if (page && !broken) page.__acik = true;
	else await p.close();
	for (const r of res) {
		console.log(`${r.t} ${r.evre} ${r.sz}: ${r.bad.length ? r.bad.length + ' sorun' : 'temiz'}${r.errs.length ? ' · sayfa hatası: ' + r.errs[0] : ''}`);
		for (const x of r.bad) console.log('   - ' + x);
		for (const x of r.info || []) console.log('   · ' + x);
	}
	return res;
}

(async () => {
	const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
	const jobs = [];
	for (const sz of sizes) for (const t of types) jobs.push([t, sz]);
	const all = [];
	let k = 0;
	// TEK=1: her işçi her ekran boyunda tek sayfa açar, soruları adresle gezer (harita bir kez kurulur; çok daha hızlı)
	const TEK = !!process.env.TEK;
	const pages = new Map();
	const P = Math.max(1, +parA);
	const tekWorker = async (w) => {
		// ekran boyları işçilere paylaştırılır; her boy tek sayfada baştan sona
		for (let i = w; i < sizes.length; i += P) {
			const sz = sizes[i];
			const [W, H] = sz.split('x').map(Number);
			let page = null;
			for (const t of types) {
				if (!page || page.isClosed()) {
					page = await b.newPage({ viewport: { width: W, height: H } });
					page.__acik = false;
				}
				all.push(...(await one(b, t, sz, page)));
			}
			if (page && !page.isClosed()) await page.close();
		}
	};
	const worker = async (w) => {
		if (TEK) return tekWorker(w);
		while (k < jobs.length) {
			const [t, sz] = jobs[k++];
			let page = null;
			if (TEK) {
				const key = w + '|' + sz;
				page = pages.get(key);
				if (!page || page.isClosed()) {
					const [W, H] = sz.split('x').map(Number);
					page = await b.newPage({ viewport: { width: W, height: H } });
					page.__acik = false;
					pages.set(key, page);
				}
			}
			all.push(...(await one(b, t, sz, page)));
		}
	};
	await Promise.all(Array.from({ length: Math.max(1, +parA) }, (_, w) => worker(w)));
	await b.close();
	fs.writeFileSync(path.join(out, 'ozet.json'), JSON.stringify(all, null, 1));
	const n = all.reduce((s, r) => s + r.bad.length + r.errs.length, 0);
	console.log(`\nTOPLAM: ${all.length} durum, ${all.filter((r) => !r.bad.length && !r.errs.length).length} temiz, ${n} sorun`);
	process.exit(n ? 1 : 0);
})();
