// UÇUŞ ROTASI · HARİTA KATMANI (Mayın Tarlası da kullanır): oyunun iğne katmanında (ui.$.pins, en altta) tek bir SVG.
// Dünya noktaları her çizimin başında (scene.onBeforeRender: kamera matrisleri o karenin) ekrana izdüşer: uçuş yayları,
// uçak, gölgesi, bayraklar, mayınlar, patlamalar. Kamera kayarken, sarsılırken ya da parmakla döndürülürken çizim
// haritaya yapışık kalır (bir kare gecikme yok).
//
// Katmanda DOM yazısı YOK: rakamlar ve işaretler çizgi (path) olarak çizilir. Böylece ne arayüzün yazı rozetleriyle
// (dn-tag) ne de kartla yarışır: kart ve rozetler bu katmanın üstündedir. İl adları oyunun kendi 3B ad katmanından gelir
// (adlar(): kart açıkken listedeki iller; kapanınca eski durum geri konur).
//
// Uçuş yayı (yayNok): iki il tepesi arasında, uzunlukla orantılı yükselen ve gidiş yönünün soluna hafifçe bükülen 3B
// eğri. Yalnız yükseklik olsaydı kuzey-güney ayakları kameradan (güneyden bakış) düz çizgi görünürdü; yan bükülme her
// yönde kavis verir, gölge izi aynı eğrinin yerdeki izdüşümüdür (irtifa hissi).

import * as THREE from 'three';

export const NS = 'http://www.w3.org/2000/svg';

/** SVG öğesi: el('path', { d, class }, ebeveyn). */
export function el(tag, attrs = {}, parent = null) {
	const e = document.createElementNS(NS, tag);
	for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, String(attrs[k]));
	if (parent) parent.appendChild(e);
	return e;
}

const f1 = (x) => (Math.round(x * 10) / 10).toString();

// ---------------------------------------------------------------- çizgi rakamlar (yazı değil): 10 px boy, merkez (0, 0)
const DIG = {
	1: 'M-1.7 -2.5L0.5 -4.2V4.2',
	2: 'M-2.4 -2.3C-2.2 -4.5 2.5 -4.6 2.5 -1.8C2.5 0.4 -0.4 1.5 -2.5 4.2H2.7',
	3: 'M-2.4 -3.3C-1.1 -4.7 2.4 -4.5 2.3 -2.2C2.2 -0.5 0.6 -0.1 -0.5 -0.1C1.1 0 2.7 0.8 2.5 2.4C2.3 4.7 -1.3 4.9 -2.6 3.3',
	4: 'M1.3 4.2V-4.2L-2.7 1.7H2.9',
	5: 'M2.3 -4.2H-1.8L-2.2 -0.3C-0.6 -1.4 2.7 -1 2.7 1.6C2.7 4.7 -1.2 4.9 -2.6 3.3',
	6: 'M2.1 -3.7C0.5 -4.8 -2.6 -3.9 -2.6 0.6C-2.6 3.4 -1.4 4.4 0 4.4C1.6 4.4 2.6 3.2 2.6 1.6C2.6 -0.2 1.2 -1 0 -1C-1.4 -1 -2.4 0 -2.6 0.8',
	7: 'M-2.6 -4.2H2.7L-0.5 4.2',
	8: 'M0 -0.3C-2.6 -0.3 -2.6 -4.3 0 -4.3C2.6 -4.3 2.6 -0.3 0 -0.3C-2.9 -0.3 -2.9 4.4 0 4.4C2.9 4.4 2.9 -0.3 0 -0.3',
	9: 'M-2.1 3.7C-0.5 4.8 2.6 3.9 2.6 -0.6C2.6 -3.4 1.4 -4.4 0 -4.4C-1.6 -4.4 -2.6 -3.2 -2.6 -1.6C-2.6 0.2 -1.2 1 0 1C1.4 1 2.4 0 2.6 -0.8',
};
/** Rakam yolu (1..9). */
export const digit = (n) => DIG[n] || DIG[1];
export const CHECK = 'M-3.6 0.2L-1.2 2.7L3.8 -2.8';
export const CROSS = 'M-3 -3L3 3M3 -3L-3 3';

// ---------------------------------------------------------------- uçak (kuşbakışı, burun +x yönünde, ~31 px boy)
const HALF = [
	[15.5, 0],
	[14.2, -1.35],
	[11, -2.25],
	[3.6, -2.25],
	[-3.4, -12.6],
	[-6.9, -12.6],
	[-2.9, -2.25],
	[-9.4, -2.05],
	[-12.8, -6.8],
	[-15, -6.8],
	[-13.6, -1.6],
	[-15.4, -0.9],
	[-15.4, 0],
];
const mirror = (pts) => [...pts, ...pts.slice(1, -1).reverse().map(([x, y]) => [x, -y])];
export const PLANE = 'M' + mirror(HALF).map(([x, y]) => `${x} ${y}`).join('L') + 'Z';
/** Kuyruk ve kanat ucu boyası (oyuncu rengi). */
export const PLANE_TAIL = 'M-9.4 -2.05L-12.8 -6.8L-15 -6.8L-13.6 -1.6ZM-9.4 2.05L-12.8 6.8L-15 6.8L-13.6 1.6ZM-3.4 -12.6L-6.9 -12.6L-6.1 -10.6L-2.1 -10.6ZM-3.4 12.6L-6.9 12.6L-6.1 10.6L-2.1 10.6Z';

// ---------------------------------------------------------------- 3B uçuş yayı

/** İki uç ({ x, z, y }) arasındaki yayın t (0..1) noktası. out: { x, y, z, g } (g: yayın altındaki yer yüksekliği). */
export function yayNok(a, b, t, out = {}) {
	const dx = b.x - a.x;
	const dz = b.z - a.z;
	const d = Math.hypot(dx, dz) || 1;
	const k = 4 * t * (1 - t);
	const h = Math.min(11, 1.4 + d * 0.22) * k;
	const s = (Math.min(5, 0.5 + d * 0.1) * k) / d;
	out.x = a.x + dx * t + dz * s;
	out.z = a.z + dz * t - dx * s;
	out.g = a.y + (b.y - a.y) * t;
	out.y = out.g + h;
	return out;
}

/**
 * Harita katmanı: { svg, defs, P, on(fn) → bırak(), destroy() }. fn(P) her çizimde çağrılır (P.at / P.top ile izdüşüm).
 * cls: kök sınıfı (tipin kendi CSS kapsamı).
 */
export function katman(app, cls) {
	const host = app.ui.$.pins;
	const svg = el('svg', { class: `yn-k ${cls}`, 'aria-hidden': 'true' });
	svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none';
	host.insertBefore(svg, host.firstChild);
	const defs = el('defs', {}, svg);
	const b = app.board;
	const v = new THREE.Vector3();
	const s = { x: 0, y: 0, behind: false };
	const P = {
		/** Dünya noktası → katman (css px); y verilmezse kara yüksekliği. */
		at(x, z, y = null, out = {}) {
			v.set(x, y ?? b.heightAt(x, z), z);
			app.toScreen(v, s);
			out.x = s.x;
			out.y = s.y;
			out.behind = !!s.behind;
			return out;
		},
		/** İlin tepesi (merkez; yükselme dahil). */
		top(i, out = {}) {
			const p = b.provinces[i];
			return P.at(p.x, p.z, b.heightAt(p.x, p.z) + b.liftOf(i), out);
		},
		/** İlin 3B ad noktası (ad hapının ortası; yükselme dahil): işaretler bunun üstüne oturur, adı örtmez. */
		lab(i, out = {}) {
			b.labelAt(i, v);
			app.toScreen(v, s);
			out.x = s.x;
			out.y = s.y;
			out.behind = !!s.behind;
			return out;
		},
		/**
		 * Ad hapının ekrandaki gerçek yeri ve yarı boyu (css px): ad katmanının kaydırması (çakışan seçim adı kayar), ölçeği
		 * ve ekran kenarına kıstırması dahil (labels.js shader'ıyla aynı hesap). out: { x, y, hw, hh, behind }.
		 */
		ad(i, out = {}) {
			b.labelAt(i, v);
			app.toScreen(v, s);
			const L = b.labelLayer;
			const off = L?.off;
			const sc = off ? off[i * 3 + 2] || 1 : 1;
			const hh = ((17 + 4 * (L?.hi?.[i] ?? 1)) * sc) / 2;
			const hw = hh * (L?.size?.[i * 3] || 3);
			const W = app._rc?.width || app.ui?.el?.clientWidth || innerWidth;
			const H = app._rc?.height || app.ui?.el?.clientHeight || innerHeight;
			out.x = Math.min(W - hw - 6, Math.max(hw + 6, s.x + (off ? off[i * 3] : 0)));
			out.y = Math.min(H - hh - 6, Math.max(hh + 6, s.y - (off ? off[i * 3 + 1] : 0)));
			out.hw = hw;
			out.hh = hh;
			out.behind = !!s.behind;
			return out;
		},
		/** İlin tepesinin dünya noktası (yay ucu). */
		end(i, out = {}) {
			const p = b.provinces[i];
			out.x = p.x;
			out.z = p.z;
			out.y = b.heightAt(p.x, p.z) + b.liftOf(i) + 0.18;
			return out;
		},
		/** Yayın [t0, t1] dilimi: ekrandaki yol (d) ve isteğe bağlı gölge izi (yer). */
		yol(a, bb, t0 = 0, t1 = 1, n = 26, yer = false) {
			if (t1 <= t0) return '';
			let d = '';
			const o = {};
			const q = {};
			const k = Math.max(2, Math.ceil(n * (t1 - t0)));
			for (let j = 0; j <= k; j++) {
				const t = t0 + ((t1 - t0) * j) / k;
				yayNok(a, bb, t, o);
				P.at(o.x, o.z, yer ? o.g + 0.04 : o.y, q);
				if (q.behind) return d;
				d += (j ? 'L' : 'M') + f1(q.x) + ' ' + f1(q.y);
			}
			return d;
		},
	};
	const jobs = new Set();
	const scene = app.scene;
	let prev = null;
	const drive = () => {
		for (const f of jobs) {
			try {
				f(P);
			} catch (e) {
				console.error('harita katmanı', e);
				jobs.delete(f);
			}
		}
	};
	// kare sürücüsü (Tufan'ın deseni): yalnız kart açıkken; öncekini saklar, bırakırken geri koyar. Önceki bir katmanın
	// sürücüsü saklanmaz (galeride soru hızla değişince eski kartın temizliği yenisinin kurulumundan sonra gelebilir:
	// ölü bir sürücü geri konursa uygulama hiç dinlenmez)
	prev = Object.prototype.hasOwnProperty.call(scene, 'onBeforeRender') ? scene.onBeforeRender : null;
	if (prev?.__yn3) prev = null;
	drive.__yn3 = true;
	scene.onBeforeRender = drive;
	return {
		svg,
		defs,
		P,
		on(fn) {
			jobs.add(fn);
			return () => jobs.delete(fn);
		},
		destroy() {
			jobs.clear();
			if (scene.onBeforeRender === drive) {
				if (prev) scene.onBeforeRender = prev;
				else delete scene.onBeforeRender;
			}
			svg.remove();
		},
	};
}

/**
 * Kart açıkken listedeki illerin adları oyunun 3B ad katmanında (DOM yazısı değil; çakışan ad küçülür, kayar). Harita
 * sorusunda sinema adları susturur ("cevabı ele vermesin"); bu tiplerde adlar sorunun parçası. Dönen işlev ad katmanının
 * kipini eski haline koyar (susturma durumuna dokunmaz: soru bitince sinema kendisi açar).
 */
export function adlar(app, list, K = null) {
	const L = app.board?.labelLayer;
	if (!L?.show) return () => {};
	const saved = { mode: L.mode, base: L.base, forced: L.forced?.slice?.(), hiTo: L.hiTo?.slice?.() };
	L.suspend?.(false);
	L.show(list.slice());
	// K verilirse çakışma elemesi: ad katmanı liste kipinde çakışan adları yalnız biraz kaydırır; dar ekranda (320 px) sık
	// tarlada adlar üst üste biniyordu ("KIRIKKALE" ile "KIRŞEHİR"). Her çizimde ad noktaları izdüşer, büyük ilden küçüğe
	// çakışmayan alt küme seçilir, yalnız değişince katmana verilir (yaklaştırınca saklananlar geri gelir).
	if (K && L.size) {
		const b = app.board;
		const byArea = list.slice().sort((x, y) => (b.provinces[y].area || 0) - (b.provinces[x].area || 0));
		const o = {};
		let last = list.join();
		K.on((P) => {
			const keep = [];
			const box = [];
			for (const i of byArea) {
				P.lab(i, o);
				if (o.behind) continue;
				const w = 21 * (L.size[i * 3] || 3) * 0.94 + 4;
				const h = 20;
				const r = { l: o.x - w / 2, r: o.x + w / 2, t: o.y - h / 2, b: o.y + h / 2, a: w * h };
				// hafif değme serbest (katman adı biraz kaydırır); ancak küçük hapın üçte birinden çoğu örtülüyorsa elenir
				const heavy = (q) => Math.max(0, Math.min(r.r, q.r) - Math.max(r.l, q.l)) * Math.max(0, Math.min(r.b, q.b) - Math.max(r.t, q.t)) > 0.34 * Math.min(r.a, q.a);
				if (box.some(heavy)) continue;
				box.push(r);
				keep.push(i);
			}
			keep.sort((x, y) => x - y);
			const key = keep.join();
			if (key !== last) {
				last = key;
				L.show(keep);
			}
		});
	}
	return () => {
		if (saved.forced && L.forced) L.forced.set(saved.forced);
		if (saved.hiTo && L.hiTo) L.hiTo.set(saved.hiTo);
		L.mode = saved.mode;
		L.base = saved.base;
		L._dirty = true;
	};
}

/**
 * Kadraj (perspektif doğru): illerin bütün sınır noktaları ve isteğe bağlı dünya noktaları (yay tepeleri) kartın
 * altındaki boş dikdörtgene sığar. cam.fit kutuyu hedef derinlikte sığdırır; eğik bakışta yakın (güney) kenar daha geniş
 * görünür ve köşedeki il ekrandan taşıyordu. Burada kameranın son duruşu (camera.js _apply ile aynı yerleşim ve lens
 * kaydırması) ayrı bir kamerayla kurulur, noktalar izdüşer, uzaklık ve hedef birkaç adımda düzeltilir; sonra tek bir
 * yumuşak çekim. top: kartın örttüğü pay (0..1), alt: alttan boş bırakılan px (düğmeler), yan: yanlardan px.
 */
const _c = new THREE.PerspectiveCamera();
const _t = new THREE.Vector3();
const _p = new THREE.Vector3();
export function cerceve(app, list, { top = 0, alt = 64, yan = 10, pitch = 1.1, yaw = 0, dur = 0.9, arc = 4, yawRate = 0, decay = 0, ek = [] } = {}) {
	const b = app.board;
	const W = app._rc?.width || app.ui?.el?.clientWidth || innerWidth;
	const H = app._rc?.height || app.ui?.el?.clientHeight || innerHeight;
	const pts = [];
	for (const i of list) {
		const p = b.provinces[i];
		for (const r of p.rings)
			for (let k = 0; k < r.length; k += 4) {
				const x = r[k];
				const z = -r[k + 1];
				pts.push(x, b.heightAt(x, z) + 0.3, z);
			}
	}
	for (const q of ek) pts.push(q.x, q.y, q.z);
	const bb = app.boundsOf(list);
	_c.fov = app.camera.fov;
	_c.aspect = W / H;
	_c.near = app.camera.near;
	_c.far = app.camera.far;
	const lens = top / 2;
	if (lens) _c.setViewOffset(_c.aspect, 1, 0, -lens, _c.aspect, 1);
	else _c.clearViewOffset();
	_c.updateProjectionMatrix();
	_t.set((bb.x0 + bb.x1) / 2, 0, (bb.z0 + bb.z1) / 2);
	let dist = app.cam.fitDist(bb, pitch, 1.1, top);
	const R = { x0: yan, x1: W - yan, y0: top * H + 4, y1: H - alt };
	const tf = Math.tan((_c.fov * Math.PI) / 360);
	const sp = Math.max(0.3, Math.sin(pitch));
	for (let it = 0; it < 10; it++) {
		const cp = Math.cos(pitch);
		_c.position.set(_t.x - Math.sin(yaw) * cp * dist, Math.sin(pitch) * dist, _t.z + Math.cos(yaw) * cp * dist);
		_c.lookAt(_t);
		_c.updateMatrixWorld();
		let x0 = Infinity;
		let x1 = -Infinity;
		let y0 = Infinity;
		let y1 = -Infinity;
		for (let k = 0; k < pts.length; k += 3) {
			_p.set(pts[k], pts[k + 1], pts[k + 2]).project(_c);
			if (_p.z > 1) continue;
			const sx = (_p.x * 0.5 + 0.5) * W;
			const sy = (-_p.y * 0.5 + 0.5) * H;
			if (sx < x0) x0 = sx;
			if (sx > x1) x1 = sx;
			if (sy < y0) y0 = sy;
			if (sy > y1) y1 = sy;
		}
		if (!Number.isFinite(x0)) break;
		const s = Math.min((R.x1 - R.x0) / Math.max(1, x1 - x0), (R.y1 - R.y0) / Math.max(1, y1 - y0));
		const ex = (R.x0 + R.x1) / 2 - (x0 + x1) / 2;
		const ey = (R.y0 + R.y1) / 2 - (y0 + y1) / 2;
		const upp = (2 * dist * tf) / H; // hedef derinliğinde px başına dünya birimi
		_t.x -= ex * upp;
		_t.z -= (ey * upp) / sp;
		dist = Math.max(8, dist / Math.pow(s, 0.9));
		if (Math.abs(s - 1) < 0.008 && Math.abs(ex) < 1 && Math.abs(ey) < 1) break;
	}
	app.cam.shot(_t.x, _t.z, { dist, pitch, yaw, dur, arc, yawRate, decay, lens });
	return { x: _t.x, z: _t.z, dist };
}

/** Ekranda iki nokta arası açı (derece): uçağın burnu gidiş yönüne. */
export const aci = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

// ---------------------------------------------------------------- cevap damgası: sorunun yerinde
// Haritalı kartta arayüz damgayı ekranın altına (haritanın üstüne) basar. Bu iki tipte cevap haritanın kendisi (mayınlar,
// bayraklar, altın rota): damga kartın soru satırına oturur, alana sığacak kadar küçülür (--k), soru yazısı o an gizlenir
// (tam ekran kartların kuralı). Kapsam: kartın kendi tip sınıfı (.t-mayin, .t-rota).
export const DAMGA_CSS = /* css */ `
.fl-q.map.t-mayin.yn3-st .fl-qtext,.fl-q.map.t-rota.yn3-st .fl-qtext{visibility:hidden;min-height:58px}
@media (max-height:640px){.fl-q.map.t-mayin.yn3-st .fl-qtext,.fl-q.map.t-rota.yn3-st .fl-qtext{min-height:50px}}
.fl-q.map.t-mayin.yn3-st .fl-stamp.on,.fl-q.map.t-rota.yn3-st .fl-stamp.on{animation:yn3St .45s cubic-bezier(.3,1.7,.5,1) forwards}
@keyframes yn3St{0%{opacity:0;transform:translate(-50%,-50%) skewX(-8deg) scale(calc(var(--k,1) * 1.9))}60%{opacity:1;transform:translate(-50%,-50%) skewX(-8deg) scale(calc(var(--k,1) * .96))}100%{opacity:1;transform:translate(-50%,-50%) skewX(-8deg) scale(var(--k,1))}}
`;

/** Damganın yerini aç: soru yazısı gizlenir, satır damgaya yetecek kadar uzar. Kadraj ölçülmeden ÖNCE çağrılır. */
export function damgaYeri(el) {
	el.closest('.fl-q')?.classList.add('yn3-st');
}

/** Damgayı kartın soru satırına taşı (stampLater'dan sonra çağrılır). */
export function damga(el) {
	const card = el.closest('.fl-q');
	if (!card) return;
	let last = '';
	const place = () => {
		const s = card.querySelector('.fl-stamp');
		const box = card.querySelector('.fl-qtext');
		if (!card.isConnected || !s || !box || !s.textContent) return;
		card.classList.add('yn3-st');
		const cr = card.getBoundingClientRect();
		const r = box.getBoundingClientRect();
		s.style.setProperty('--k', '1');
		// doğal boy (dönüşümsüz); eğiklik (skewX −8°) payı
		const w0 = s.offsetWidth + s.offsetHeight * 0.15;
		const h0 = s.offsetHeight || 1;
		const k = Math.max(0.4, Math.min(1, (r.width - 6) / w0, (r.height + 2) / h0));
		const top = Math.round(r.top - cr.top + r.height / 2);
		const left = Math.round(r.left - cr.left + r.width / 2);
		const key = `${top}|${left}|${k.toFixed(2)}`;
		s.style.top = top + 'px';
		s.style.left = left + 'px';
		s.style.setProperty('--k', k.toFixed(3));
		if (key === last) return;
		last = key;
		// giriş devinimi yeni ölçekle baştan (yalnız yer ya da ölçek değiştiyse)
		s.classList.remove('on');
		void s.offsetWidth;
		s.classList.add('on');
	};
	setTimeout(place, 30);
	setTimeout(place, 700);
}

/** Tek satırlık yazı kutusuna sığsın: yarımşar piksel küçülür (en az min px); "…" ile kesilmez. */
export function sigdir(list, min = 9) {
	const run = () => {
		for (const e of list) {
			if (!e?.isConnected) continue;
			e.style.fontSize = '';
			let px = parseFloat(getComputedStyle(e).fontSize) || 14;
			while (px > min && e.scrollWidth > e.clientWidth + 0.5) e.style.fontSize = `${(px -= 0.5)}px`;
		}
	};
	run();
	requestAnimationFrame(run);
	document.fonts?.ready?.then(run);
	return run;
}
