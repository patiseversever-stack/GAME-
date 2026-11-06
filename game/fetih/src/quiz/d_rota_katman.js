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
	// kare sürücüsü (Tufan'ın deseni): yalnız kart açıkken; öncekini saklar, bırakırken geri koyar
	prev = Object.prototype.hasOwnProperty.call(scene, 'onBeforeRender') ? scene.onBeforeRender : null;
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
export function adlar(app, list) {
	const L = app.board?.labelLayer;
	if (!L?.show) return () => {};
	const saved = { mode: L.mode, base: L.base, forced: L.forced?.slice?.(), hiTo: L.hiTo?.slice?.() };
	L.suspend?.(false);
	L.show(list.slice());
	return () => {
		if (saved.forced && L.forced) L.forced.set(saved.forced);
		if (saved.hiTo && L.hiTo) L.hiTo.set(saved.hiTo);
		L.mode = saved.mode;
		L.base = saved.base;
		L._dirty = true;
	};
}

/** Ekranda iki nokta arası açı (derece): uçağın burnu gidiş yönüne. */
export const aci = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
