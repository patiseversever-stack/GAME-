// Kodla üretilen dokular. Hiç resim dosyası yok: hepsi açılışta bir kez çizilir.
// Döşenen dokular (kabuk, tahta) kenarlardan taşan şekilleri karşı kenara da çizerek dikişsiz olur.

import * as THREE from 'three';
import { rng, TAU } from '../core/math.js';

function canvas(w, h) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return [c, c.getContext('2d')];
}

/** Dikişsiz çizim: şekli gerekirse yatay/dikey karşı kenarda da tekrarlar. */
function wrapDraw(w, h, x, y, r, fn) {
	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			const xx = x + dx * w;
			const yy = y + dy * h;
			if (xx + r < 0 || xx - r > w || yy + r < 0 || yy - r > h) continue;
			fn(xx, yy);
		}
	}
}

function finishTex(c, { srgb = true, repeat = true, aniso = 1, mips = true } = {}) {
	const t = new THREE.CanvasTexture(c);
	if (srgb) t.colorSpace = THREE.SRGBColorSpace;
	if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = aniso;
	t.generateMipmaps = mips;
	t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
	t.needsUpdate = true;
	return t;
}

// ---------------------------------------------------------------------------------------------
// Ak kayın kabuğu: gümüşi beyaz zemin, yatay kovucuklar (lentisel), siyah elmas izler,
// soyulmuş kağıt katmanları ve altından görünen pembe-turuncu iç kabuk.
// ---------------------------------------------------------------------------------------------
export function barkTexture(size, aniso) {
	const W = size;
	const H = size;
	const [c, g] = canvas(W, H);
	const R = rng(7);
	const k = W / 512;

	const base = g.createLinearGradient(0, 0, W, 0);
	base.addColorStop(0, '#e8e3da');
	base.addColorStop(0.5, '#efebe3');
	base.addColorStop(1, '#e8e3da');
	g.fillStyle = base;
	g.fillRect(0, 0, W, H);

	// geniş, yumuşak ton dalgalanmaları
	const tones = ['#f6f3ed', '#ddd6cc', '#e9e1d6', '#efe2dc', '#e2e2e4', '#f2ede2'];
	for (let i = 0; i < 70; i++) {
		const x = R() * W;
		const y = R() * H;
		const rx = R.range(30, 120) * k;
		const ry = rx * R.range(0.12, 0.4);
		g.globalAlpha = R.range(0.18, 0.4);
		g.fillStyle = R.pick(tones);
		wrapDraw(W, H, x, y, rx, (xx, yy) => {
			g.beginPath();
			g.ellipse(xx, yy, rx, ry, 0, 0, TAU);
			g.fill();
		});
	}

	// ince dikey lif çizgileri
	g.globalAlpha = 0.06;
	g.strokeStyle = '#8c8076';
	g.lineWidth = 1 * k;
	for (let i = 0; i < 90; i++) {
		const x = R() * W;
		const y = R() * H;
		const len = R.range(20, 90) * k;
		wrapDraw(W, H, x, y, len, (xx, yy) => {
			g.beginPath();
			g.moveTo(xx, yy);
			g.lineTo(xx + R.range(-2, 2) * k, yy + len);
			g.stroke();
		});
	}

	// soyulmuş kağıt katmanları: açık renkli yatay şeritler, altta ince gölge
	for (let i = 0; i < 26; i++) {
		const x = R() * W;
		const y = R() * H;
		const w = R.range(40, 160) * k;
		const h = R.range(3, 9) * k;
		wrapDraw(W, H, x, y, w, (xx, yy) => {
			g.globalAlpha = 0.5;
			g.fillStyle = '#fbf9f4';
			g.beginPath();
			g.ellipse(xx, yy, w / 2, h / 2, 0, 0, TAU);
			g.fill();
			g.globalAlpha = 0.18;
			g.fillStyle = '#7d6e66';
			g.beginPath();
			g.ellipse(xx, yy + h * 0.55, w / 2.1, h / 4, 0, 0, TAU);
			g.fill();
		});
	}

	// soyulmuş yerlerden görünen sıcak iç kabuk
	for (let i = 0; i < 9; i++) {
		const x = R() * W;
		const y = R() * H;
		const w = R.range(18, 50) * k;
		const h = R.range(5, 12) * k;
		wrapDraw(W, H, x, y, w, (xx, yy) => {
			g.globalAlpha = 0.55;
			g.fillStyle = R() < 0.5 ? '#d39a7c' : '#c98468';
			g.beginPath();
			g.ellipse(xx, yy, w / 2, h / 2, 0, 0, TAU);
			g.fill();
			g.globalAlpha = 0.7;
			g.strokeStyle = '#f7f1e8';
			g.lineWidth = 1.5 * k;
			g.stroke();
		});
	}

	// yatay kovucuklar (lentisel): sıralar halinde koyu kısa çizgiler
	for (let row = 0; row < 34; row++) {
		const y0 = R() * H;
		const n = R.range(3, 9) | 0;
		let x = R() * W;
		for (let i = 0; i < n; i++) {
			const len = R.range(5, 34) * k;
			const th = R.range(1.2, 3.2) * k;
			const yy0 = y0 + R.range(-4, 4) * k;
			wrapDraw(W, H, x, yy0, len, (xx, yy) => {
				g.globalAlpha = R.range(0.55, 0.9);
				g.fillStyle = R() < 0.7 ? '#3b3330' : '#5a4a44';
				g.beginPath();
				g.ellipse(xx, yy, len / 2, th / 2, 0, 0, TAU);
				g.fill();
			});
			x += len + R.range(4, 30) * k;
		}
	}

	// siyah elmas izler (dal izleri): kenarları pürüzlü koyu yamalar
	for (let i = 0; i < 11; i++) {
		const x = R() * W;
		const y = R() * H;
		const w = R.range(18, 64) * k;
		const h = w * R.range(0.35, 0.8);
		wrapDraw(W, H, x, y, w, (xx, yy) => {
			g.globalAlpha = 0.85;
			g.fillStyle = '#1f1b1a';
			g.beginPath();
			const steps = 18;
			for (let s = 0; s <= steps; s++) {
				const a = (s / steps) * TAU;
				const rr = 1 + R.range(-0.25, 0.2);
				// elmas biçimi: yatayda sivri
				const ex = Math.cos(a) * w * 0.5 * rr;
				const ey = Math.sin(a) * h * 0.5 * rr * (0.55 + 0.45 * Math.abs(Math.cos(a)));
				if (s === 0) g.moveTo(xx + ex, yy + ey);
				else g.lineTo(xx + ex, yy + ey);
			}
			g.closePath();
			g.fill();
			g.globalAlpha = 0.25;
			g.strokeStyle = '#6e625c';
			g.lineWidth = 3 * k;
			g.stroke();
		});
	}

	g.globalAlpha = 1;
	return finishTex(c, { aniso });
}

// ---------------------------------------------------------------------------------------------
// Patika tahtaları: bal rengi tahtalar, damar çizgileri, aralarda koyu ek yerleri, çiviler.
// u: yürüme yönü (döşenir), v: patika genişliği.
// ---------------------------------------------------------------------------------------------
export function plankTexture(w, h, aniso) {
	const [c, g] = canvas(w, h);
	const R = rng(11);
	const k = w / 512;
	g.fillStyle = '#b07c50';
	g.fillRect(0, 0, w, h);
	const planks = 8;
	const pw = w / planks;
	const woods = ['#d6a473', '#c99563', '#deb07c', '#cc9a66', '#d3a06c', '#c08c5c'];
	for (let i = 0; i < planks; i++) {
		const x0 = i * pw;
		g.fillStyle = R.pick(woods);
		g.fillRect(x0 + 1.5 * k, 0, pw - 3 * k, h);
		// uçtan uca hafif ton geçişi
		const gr = g.createLinearGradient(0, 0, 0, h);
		gr.addColorStop(0, 'rgba(60,30,10,0.18)');
		gr.addColorStop(0.15, 'rgba(255,230,190,0.06)');
		gr.addColorStop(0.85, 'rgba(255,230,190,0.04)');
		gr.addColorStop(1, 'rgba(60,30,10,0.22)');
		g.fillStyle = gr;
		g.fillRect(x0, 0, pw, h);
		// damarlar: tahta boyunca (v yönünde) dalgalı ince çizgiler
		for (let l = 0; l < 9; l++) {
			const xx = x0 + R.range(4, pw - 4) * 1;
			g.globalAlpha = R.range(0.12, 0.3);
			g.strokeStyle = R() < 0.5 ? '#6e4426' : '#d9a875';
			g.lineWidth = R.range(0.8, 2) * k;
			g.beginPath();
			for (let y = 0; y <= h; y += 8 * k) {
				const off = Math.sin(y * 0.03 / k + l * 1.7 + i) * 2.2 * k;
				if (y === 0) g.moveTo(xx + off, y);
				else g.lineTo(xx + off, y);
			}
			g.stroke();
		}
		// budak
		if (R() < 0.45) {
			const kx = x0 + R.range(8, pw - 8);
			const ky = R.range(0.2, 0.8) * h;
			g.globalAlpha = 0.5;
			g.fillStyle = '#5c381e';
			g.beginPath();
			g.ellipse(kx, ky, 3 * k, 7 * k, 0, 0, TAU);
			g.fill();
		}
		// çiviler
		g.globalAlpha = 0.8;
		g.fillStyle = '#3a2a22';
		for (const yy of [h * 0.12, h * 0.88]) {
			g.beginPath();
			g.arc(x0 + pw * 0.5, yy, 2.2 * k, 0, TAU);
			g.fill();
		}
		g.globalAlpha = 1;
	}
	// tahta araları
	g.fillStyle = '#4a2e1c';
	for (let i = 0; i <= planks; i++) g.fillRect(i * pw - 1.6 * k, 0, 3.2 * k, h);
	// kenarlarda aşınma
	const edge = g.createLinearGradient(0, 0, 0, h);
	edge.addColorStop(0, 'rgba(40,20,8,0.35)');
	edge.addColorStop(0.06, 'rgba(40,20,8,0)');
	edge.addColorStop(0.94, 'rgba(40,20,8,0)');
	edge.addColorStop(1, 'rgba(40,20,8,0.35)');
	g.fillStyle = edge;
	g.fillRect(0, 0, w, h);
	return finishTex(c, { aniso });
}

// ---------------------------------------------------------------------------------------------
// Yaprak atlası (2×2): 0 kiraz çiçeği, 1 yaz yaprağı, 2 güz yaprağı, 3 kar topağı.
// Her hücre yuvarlak bir küme; merkezde yoğun, kenarda seyrek ki kartlar üst üste
// binince doğal, kabarık bir taç oluşsun.
// ---------------------------------------------------------------------------------------------
export function leafAtlas(size) {
	const [c, g] = canvas(size, size);
	const cell = size / 2;
	const R = rng(23);

	const leaf = (x, y, len, wid, ang, fill, vein) => {
		g.save();
		g.translate(x, y);
		g.rotate(ang);
		g.fillStyle = fill;
		g.beginPath();
		g.moveTo(0, -len * 0.5);
		g.quadraticCurveTo(wid, -len * 0.1, 0, len * 0.5);
		g.quadraticCurveTo(-wid, -len * 0.1, 0, -len * 0.5);
		g.fill();
		if (vein) {
			g.strokeStyle = vein;
			g.lineWidth = Math.max(0.6, wid * 0.08);
			g.beginPath();
			g.moveTo(0, -len * 0.42);
			g.lineTo(0, len * 0.42);
			g.stroke();
		}
		g.restore();
	};

	const scatter = (cx, cy, n, fn) => {
		for (let i = 0; i < n; i++) {
			const a = R() * TAU;
			const rr = Math.sqrt(R()) * cell * 0.4;
			const x = cx + Math.cos(a) * rr;
			const y = cy + Math.sin(a) * rr * 0.92;
			// küme üstü daha açık: yukarıdan ışık alan yapraklar
			const up = 1 - (y - (cy - cell * 0.4)) / (cell * 0.8);
			fn(x, y, up, rr / (cell * 0.4));
		}
	};
	const k = cell / 256;

	// 0) kiraz çiçekleri: beş taçyapraklı pembe-beyaz çiçekler + birkaç taze yaprak
	{
		const cx = cell * 0.5;
		const cy = cell * 0.5;
		scatter(cx, cy, 40, (x, y, up) => {
			leaf(x, y, R.range(20, 30) * k, R.range(7, 10) * k, R() * TAU, up > 0.5 ? '#9fc56a' : '#76a24e', null);
		});
		const pinks = ['#ffd3e2', '#ffc2d6', '#ffe6ee', '#f7a9c4', '#ffdbe6'];
		scatter(cx, cy, 120, (x, y, up) => {
			const r = R.range(8, 13) * k;
			const col = R.pick(pinks);
			const a0 = R() * TAU;
			g.fillStyle = col;
			for (let p = 0; p < 5; p++) {
				const a = a0 + (p / 5) * TAU;
				g.beginPath();
				g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.55, r * 0.38, a, 0, TAU);
				g.fill();
			}
			g.fillStyle = up > 0.5 ? '#fff3c8' : '#e88aa8';
			g.beginPath();
			g.arc(x, y, r * 0.22, 0, TAU);
			g.fill();
			// alt taraf gölgeli
			if (up < 0.4) {
				g.globalAlpha = 0.25;
				g.fillStyle = '#a0507a';
				g.beginPath();
				g.arc(x, y, r * 0.9, 0, TAU);
				g.fill();
				g.globalAlpha = 1;
			}
		});
	}
	// 1) yaz: zümrüt tonlarında yapraklar
	{
		const cx = cell * 1.5;
		const cy = cell * 0.5;
		const greens = ['#4f8f3a', '#5fa040', '#3f7a32', '#6db24a', '#477f35', '#7cbc54'];
		scatter(cx, cy, 190, (x, y, up) => {
			const col = up > 0.65 && R() < 0.6 ? '#8ccc5e' : R.pick(greens);
			leaf(x, y, R.range(22, 34) * k, R.range(8, 12) * k, R() * TAU, col, 'rgba(30,60,20,0.45)');
		});
	}
	// 2) güz: altın, turuncu, kızıl
	{
		const cx = cell * 0.5;
		const cy = cell * 1.5;
		const golds = ['#f2b233', '#f7c440', '#e8932c', '#f0a030', '#d9702a', '#c8512a', '#ffd65a'];
		scatter(cx, cy, 170, (x, y, up) => {
			const col = up > 0.6 && R() < 0.5 ? '#ffd86a' : R.pick(golds);
			leaf(x, y, R.range(22, 34) * k, R.range(9, 13) * k, R() * TAU, col, 'rgba(120,50,10,0.4)');
		});
	}
	// 3) kar topağı: yumuşak beyaz yuvarlaklar, altları mavi gölgeli
	{
		const cx = cell * 1.5;
		const cy = cell * 1.5;
		scatter(cx, cy, 70, (x, y, up) => {
			const r = R.range(12, 26) * k;
			const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
			gr.addColorStop(0, up > 0.4 ? '#ffffff' : '#eef2ff');
			gr.addColorStop(1, up > 0.4 ? '#d8e2f6' : '#b8c4e8');
			g.fillStyle = gr;
			g.beginPath();
			g.arc(x, y, r, 0, TAU);
			g.fill();
		});
	}
	return finishTex(c, { repeat: false });
}

/** Yumuşak yuvarlak parıltı (haleler, fenerler, damlalar). */
export function glowTexture(size = 128) {
	const [c, g] = canvas(size, size);
	const h = size / 2;
	const gr = g.createRadialGradient(h, h, 0, h, h, h);
	gr.addColorStop(0, 'rgba(255,255,255,1)');
	gr.addColorStop(0.18, 'rgba(255,255,255,0.55)');
	gr.addColorStop(0.45, 'rgba(255,255,255,0.14)');
	gr.addColorStop(1, 'rgba(255,255,255,0)');
	g.fillStyle = gr;
	g.fillRect(0, 0, size, size);
	return finishTex(c, { srgb: false, repeat: false });
}

/** Zifir'in altındaki mürekkep lekesi. */
export function inkTexture(size = 128) {
	const [c, g] = canvas(size, size);
	const h = size / 2;
	const R = rng(5);
	for (let i = 0; i < 22; i++) {
		const a = R() * TAU;
		const d = R() * size * 0.18;
		const r = size * R.range(0.12, 0.3);
		const x = h + Math.cos(a) * d;
		const y = h + Math.sin(a) * d;
		const gr = g.createRadialGradient(x, y, 0, x, y, r);
		gr.addColorStop(0, 'rgba(10,6,20,0.55)');
		gr.addColorStop(1, 'rgba(10,6,20,0)');
		g.fillStyle = gr;
		g.fillRect(0, 0, size, size);
	}
	return finishTex(c, { srgb: false, repeat: false });
}

/** Gece gökyüzü yıldızları: r parlaklık, g pırıltı evresi. */
export function starTexture(w = 1024, h = 512) {
	const [c, g] = canvas(w, h);
	g.fillStyle = '#000';
	g.fillRect(0, 0, w, h);
	const R = rng(99);
	for (let i = 0; i < 900; i++) {
		const x = R() * w;
		const y = R() * h;
		const b = Math.pow(R(), 3);
		const r = 0.5 + b * 1.6;
		g.fillStyle = `rgb(${(80 + b * 175) | 0},${(R() * 255) | 0},0)`;
		g.beginPath();
		g.arc(x, y, r, 0, TAU);
		g.fill();
	}
	return finishTex(c, { srgb: false });
}

/** Yumuşak bulut topağı (uzak bulut kartları). */
export function cloudTexture(size = 256) {
	const [c, g] = canvas(size, size);
	const R = rng(41);
	const h = size / 2;
	for (let i = 0; i < 46; i++) {
		const a = R() * TAU;
		const d = Math.pow(R(), 0.8) * size * 0.28;
		const x = h + Math.cos(a) * d * 1.3;
		const y = h + Math.sin(a) * d * 0.55 + size * 0.04;
		const r = size * R.range(0.08, 0.2);
		const gr = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
		// r: yoğunluk, g: üst tarafın aydınlığı
		// g kanalı: üst tarafın aydınlığı; yoğunluk alfa kanalında
		const top = Math.max(0, Math.min(1, 1 - (y - h * 0.6) / (size * 0.5)));
		const v = (top * 255) | 0;
		gr.addColorStop(0, `rgba(${v},${v},${v},0.5)`);
		gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
		g.fillStyle = gr;
		g.fillRect(0, 0, size, size);
	}
	return finishTex(c, { srgb: false, repeat: false });
}

/** Döşenebilir bulut gürültüsü (bulut denizi): birkaç oktav değer gürültüsü, piksel piksel bir kez. */
export function cloudNoise(size = 256) {
	const [c, g] = canvas(size, size);
	const img = g.createImageData(size, size);
	const R = rng(3);
	const oct = [8, 16, 32, 64];
	const grids = oct.map((n) => {
		const a = new Float32Array(n * n);
		for (let i = 0; i < a.length; i++) a[i] = R();
		return a;
	});
	const sample = (grid, n, x, y) => {
		const fx = x * n;
		const fy = y * n;
		const ix = Math.floor(fx);
		const iy = Math.floor(fy);
		const tx = fx - ix;
		const ty = fy - iy;
		const sx = tx * tx * (3 - 2 * tx);
		const sy = ty * ty * (3 - 2 * ty);
		const v = (i, j) => grid[((j % n + n) % n) * n + ((i % n + n) % n)];
		const a = v(ix, iy) + (v(ix + 1, iy) - v(ix, iy)) * sx;
		const b = v(ix, iy + 1) + (v(ix + 1, iy + 1) - v(ix, iy + 1)) * sx;
		return a + (b - a) * sy;
	};
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const u = x / size;
			const v = y / size;
			let f = 0;
			let amp = 0.55;
			let tot = 0;
			for (let o = 0; o < oct.length; o++) {
				f += sample(grids[o], oct[o], u, v) * amp;
				tot += amp;
				amp *= 0.5;
			}
			f /= tot;
			const d = sample(grids[1], oct[1], u + 0.37, v + 0.21);
			const i = (y * size + x) * 4;
			img.data[i] = f * 255;
			img.data[i + 1] = d * 255;
			img.data[i + 2] = 0;
			img.data[i + 3] = 255;
		}
	}
	g.putImageData(img, 0, 0);
	return finishTex(c, { srgb: false });
}

/** Parçacık atlası (2×2): taçyaprağı, yaprak, kar tanesi, ateş böceği parıltısı. */
export function particleAtlas(size = 128) {
	const [c, g] = canvas(size, size);
	const q = size / 2;
	const h = q / 2;
	// taçyaprağı
	g.fillStyle = '#ffd0e0';
	g.beginPath();
	g.ellipse(h, h, q * 0.32, q * 0.2, 0.4, 0, TAU);
	g.fill();
	g.fillStyle = '#ffeef4';
	g.beginPath();
	g.ellipse(h - q * 0.06, h - q * 0.03, q * 0.16, q * 0.08, 0.4, 0, TAU);
	g.fill();
	// yaprak
	g.save();
	g.translate(q + h, h);
	g.rotate(0.6);
	g.fillStyle = '#f0a43a';
	g.beginPath();
	g.moveTo(0, -q * 0.36);
	g.quadraticCurveTo(q * 0.22, 0, 0, q * 0.36);
	g.quadraticCurveTo(-q * 0.22, 0, 0, -q * 0.36);
	g.fill();
	g.strokeStyle = 'rgba(120,50,10,0.6)';
	g.lineWidth = 1.2;
	g.beginPath();
	g.moveTo(0, -q * 0.3);
	g.lineTo(0, q * 0.3);
	g.stroke();
	g.restore();
	// kar tanesi: yumuşak beyaz nokta
	let gr = g.createRadialGradient(h, q + h, 0, h, q + h, q * 0.3);
	gr.addColorStop(0, 'rgba(255,255,255,1)');
	gr.addColorStop(0.5, 'rgba(240,246,255,0.8)');
	gr.addColorStop(1, 'rgba(230,240,255,0)');
	g.fillStyle = gr;
	g.fillRect(0, q, q, q);
	// ateş böceği
	gr = g.createRadialGradient(q + h, q + h, 0, q + h, q + h, q * 0.48);
	gr.addColorStop(0, 'rgba(255,255,230,1)');
	gr.addColorStop(0.15, 'rgba(255,240,160,0.9)');
	gr.addColorStop(0.45, 'rgba(255,200,90,0.22)');
	gr.addColorStop(1, 'rgba(255,180,60,0)');
	g.fillStyle = gr;
	g.fillRect(q, q, q, q);
	return finishTex(c, { repeat: false });
}

/** Işık sütunu: boyuna yumuşak, enine çizgili. */
export function shaftTexture(w = 128, h = 256) {
	const [c, g] = canvas(w, h);
	const R = rng(17);
	for (let i = 0; i < 26; i++) {
		const x = R() * w;
		const ww = R.range(3, 14);
		const gr = g.createLinearGradient(x - ww, 0, x + ww, 0);
		const a = R.range(0.15, 0.5);
		gr.addColorStop(0, 'rgba(255,255,255,0)');
		gr.addColorStop(0.5, `rgba(255,255,255,${a})`);
		gr.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = gr;
		g.fillRect(x - ww, 0, ww * 2, h);
	}
	// uçlara doğru sönme
	g.globalCompositeOperation = 'destination-in';
	const fade = g.createLinearGradient(0, 0, 0, h);
	fade.addColorStop(0, 'rgba(0,0,0,0)');
	fade.addColorStop(0.25, 'rgba(0,0,0,1)');
	fade.addColorStop(0.7, 'rgba(0,0,0,0.6)');
	fade.addColorStop(1, 'rgba(0,0,0,0)');
	g.fillStyle = fade;
	g.fillRect(0, 0, w, h);
	const side = g.createLinearGradient(0, 0, w, 0);
	side.addColorStop(0, 'rgba(0,0,0,0)');
	side.addColorStop(0.2, 'rgba(0,0,0,1)');
	side.addColorStop(0.8, 'rgba(0,0,0,1)');
	side.addColorStop(1, 'rgba(0,0,0,0)');
	g.fillStyle = side;
	g.fillRect(0, 0, w, h);
	g.globalCompositeOperation = 'source-over';
	return finishTex(c, { srgb: false, repeat: false });
}

/** Ada toprağı / kayası için döşenebilir ton dokusu (gri-mor kaya, katmanlı). */
export function rockTexture(size, aniso) {
	const [c, g] = canvas(size, size);
	const R = rng(31);
	const k = size / 256;
	g.fillStyle = '#8f8496';
	g.fillRect(0, 0, size, size);
	const tones = ['#a093a6', '#7b7088', '#9a8c94', '#b0a2a8', '#857a92', '#6f6680'];
	for (let i = 0; i < 160; i++) {
		const x = R() * size;
		const y = R() * size;
		const rx = R.range(6, 40) * k;
		const ry = rx * R.range(0.2, 0.6);
		g.globalAlpha = R.range(0.2, 0.5);
		g.fillStyle = R.pick(tones);
		wrapDraw(size, size, x, y, rx, (xx, yy) => {
			g.beginPath();
			g.ellipse(xx, yy, rx, ry, 0, 0, TAU);
			g.fill();
		});
	}
	// katman çizgileri
	g.globalAlpha = 0.22;
	g.strokeStyle = '#4e4660';
	for (let i = 0; i < 14; i++) {
		const y = R() * size;
		g.lineWidth = R.range(1, 3) * k;
		g.beginPath();
		for (let x = 0; x <= size; x += 8 * k) {
			const yy = y + Math.sin(x * 0.05 / k + i) * 3 * k;
			if (x === 0) g.moveTo(x, yy);
			else g.lineTo(x, yy);
		}
		g.stroke();
	}
	g.globalAlpha = 1;
	return finishTex(c, { aniso });
}
