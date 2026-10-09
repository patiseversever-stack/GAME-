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

/** '#rrggbb' + saydamlık → canvas rengi. */
function rgba(hex, a) {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** İki rengi karıştırır ('#rrggbb'). */
function mixHex(a, b, t) {
	const A = parseInt(a.slice(1), 16);
	const B = parseInt(b.slice(1), 16);
	const ch = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
	return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Uçları sivri yatay mercek (kovucuk, kağıt şerit, göz). */
function lensPath(g, x, y, len, th, bend = 0) {
	g.beginPath();
	g.moveTo(x - len / 2, y);
	g.quadraticCurveTo(x, y - th + bend, x + len / 2, y);
	g.quadraticCurveTo(x, y + th * 0.85 + bend, x - len / 2, y);
	g.closePath();
}

// ---------------------------------------------------------------------------------------------
// Ak kayın kabuğu: resimsi, büyük biçimler. Sıcak fildişi zemin, dalgalı yumuşak yatay kuşaklar,
// parlak soyulmuş kağıt şeritleri (altlarında ince gölge), seyrek ama belirgin koyu kovucuklar.
// Büyük koyu "gözler" dokuda değil, gövde geometrisinde tek tek yerleştirilir (tekrar etmesin).
// Döşenir: yatayda gövdenin çevresi boyunca, dikeyde yükseklik boyunca.
// ---------------------------------------------------------------------------------------------
export function barkTexture(size, aniso) {
	const W = size;
	const H = size;
	const [c, g] = canvas(W, H);
	const R = rng(7);
	const k = W / 512;

	g.fillStyle = '#ece5d8';
	g.fillRect(0, 0, W, H);

	// 1) dalgalı, yumuşak kenarlı yatay kuşaklar (tam genişlik: yatayda dikişsiz)
	const bandCols = ['#faf6ee', '#d9d5cf', '#f2e5d3', '#d4d1ce', '#f7f0e4', '#e7d8c4', '#e2ded8'];
	for (let i = 0; i < 16; i++) {
		const y = R() * H;
		const h = R.range(10, 54) * k;
		const col = R.pick(bandCols);
		const ph1 = R() * TAU;
		const ph2 = R() * TAU;
		const n1 = 1 + ((R() * 3) | 0);
		const n2 = 1 + ((R() * 3) | 0);
		const amp = R.range(2, 9) * k;
		const a = R.range(0.5, 0.95);
		for (const dy of [-H, 0, H]) {
			const y0 = y + dy;
			if (y0 + h + amp < 0 || y0 - h - amp > H) continue;
			const gr = g.createLinearGradient(0, y0 - h / 2 - amp, 0, y0 + h / 2 + amp);
			gr.addColorStop(0, rgba(col, 0));
			gr.addColorStop(0.3, rgba(col, a));
			gr.addColorStop(0.7, rgba(col, a));
			gr.addColorStop(1, rgba(col, 0));
			g.fillStyle = gr;
			g.beginPath();
			for (let x = 0; x <= W + 0.1; x += 8 * k) {
				const yy = y0 - h / 2 - amp + Math.sin((x / W) * TAU * n1 + ph1) * amp;
				if (x === 0) g.moveTo(x, yy);
				else g.lineTo(x, yy);
			}
			for (let x = W; x >= -0.1; x -= 8 * k) g.lineTo(x, y0 + h / 2 + amp + Math.sin((x / W) * TAU * n2 + ph2) * amp);
			g.closePath();
			g.fill();
		}
	}

	// 2) çok hafif dikey lif dokusu (yakında belli, uzakta kaybolur)
	g.globalAlpha = 0.035;
	g.strokeStyle = '#6d6058';
	g.lineWidth = 1.2 * k;
	for (let i = 0; i < 60; i++) {
		const x = R() * W;
		const y = R() * H;
		const len = R.range(30, 110) * k;
		wrapDraw(W, H, x, y, len, (xx, yy) => {
			g.beginPath();
			g.moveTo(xx, yy);
			g.quadraticCurveTo(xx + R.range(-3, 3) * k, yy + len * 0.5, xx + R.range(-2, 2) * k, yy + len);
			g.stroke();
		});
	}
	g.globalAlpha = 1;

	// 3) soyulmuş kağıt şeritleri: parlak, uzun; altında ince sıcak gölge, bazen kıvrık uç
	for (let i = 0; i < 18; i++) {
		const x = R() * W;
		const y = R() * H;
		const len = R.range(70, 230) * k;
		const th = R.range(5, 12) * k;
		const curl = false;
		wrapDraw(W, H, x, y, len, (xx, yy) => {
			g.fillStyle = rgba('#8d7a6c', 0.22);
			lensPath(g, xx + 3 * k, yy + th * 0.75, len * 0.92, th * 0.55);
			g.fill();
			g.fillStyle = rgba('#fdfbf6', 0.85);
			lensPath(g, xx, yy, len, th);
			g.fill();
			if (curl) {
				// kıvrılmış kağıt ucu: küçük sıcak iç kabuk + koyu kenar
				const cx = xx + len * 0.42;
				g.fillStyle = rgba('#d9a387', 0.8);
				g.beginPath();
				g.ellipse(cx, yy + th * 0.3, th * 1.1, th * 0.75, 0, 0, TAU);
				g.fill();
				g.fillStyle = rgba('#fffaf2', 0.95);
				g.beginPath();
				g.ellipse(cx - th * 0.3, yy - th * 0.2, th * 0.9, th * 0.55, -0.3, 0, TAU);
				g.fill();
			}
		});
	}

	// 4) iç kabuğun göründüğü birkaç sıcak yama
	for (let i = 0; i < 6; i++) {
		const x = R() * W;
		const y = R() * H;
		const len = R.range(26, 60) * k;
		const th = R.range(7, 13) * k;
		wrapDraw(W, H, x, y, len, (xx, yy) => {
			g.fillStyle = rgba(R() < 0.5 ? '#d8a086' : '#cf8f74', 0.7);
			lensPath(g, xx, yy, len, th);
			g.fill();
			g.strokeStyle = rgba('#fbf6ee', 0.9);
			g.lineWidth = 2 * k;
			g.stroke();
		});
	}

	// 5) kovucuklar (lentisel): sıralar halinde, az ama belirgin, uçları sivri koyu çizgiler
	const lentCols = ['#3a312d', '#463b36', '#54463f', '#2f2825'];
	for (let row = 0; row < 24; row++) {
		const y0 = R() * H;
		const n = 1 + ((R() * 3.2) | 0);
		let x = R() * W;
		for (let i = 0; i < n; i++) {
			const len = R.range(14, 64) * k;
			const th = R.range(2.6, 6) * k;
			const yy0 = y0 + R.range(-3, 3) * k;
			const col = R.pick(lentCols);
			const a = R.range(0.6, 0.88);
			const bend = R.range(-1.5, 1.5) * k;
			wrapDraw(W, H, x, yy0, len, (xx, yy) => {
				// açık alt dudak: kabuğun kabarıklığı
				g.fillStyle = rgba('#fbf7f0', 0.6);
				lensPath(g, xx, yy + th * 0.55, len * 0.9, th * 0.5);
				g.fill();
				g.fillStyle = rgba(col, a);
				lensPath(g, xx, yy, len, th, bend);
				g.fill();
			});
			x += len + R.range(10, 70) * k;
		}
	}

	// 6) küçük koyu elmas izler (dalların dokusunda da kayın kimliği kalsın)
	for (let i = 0; i < 3; i++) {
		const x = R() * W;
		const y = R() * H;
		const len = R.range(40, 70) * k;
		const th = len * R.range(0.32, 0.45);
		wrapDraw(W, H, x, y, len, (xx, yy) => {
			g.fillStyle = rgba('#2a2321', 0.88);
			lensPath(g, xx, yy, len, th * 2);
			g.fill();
			g.fillStyle = rgba('#6e5d54', 0.6);
			lensPath(g, xx, yy - th * 0.1, len * 0.45, th * 0.5);
			g.fill();
		});
	}

	return finishTex(c, { aniso });
}

// ---------------------------------------------------------------------------------------------
// Patika tahtaları: dört ayrı tahta deseni üst üste (her tahta geometride ayrı kutudur, kendi
// desenini seçer). u: tahtanın boyu (patikanın enine), v: tahtanın eni (yürüme yönü).
// Açık, sıcak sedir-bal tonları; uzun yumuşak damarlar, kenarda pah ışığı, uçlarda çivi.
// ---------------------------------------------------------------------------------------------
export function plankTexture(w, h, aniso) {
	const [c, g] = canvas(w, h);
	const R = rng(11);
	const k = w / 512;
	const N = 4;
	const bh = h / N;
	const woods = [
		['#e8c08a', '#d9a96f', '#c48d58'],
		['#efc994', '#deb07a', '#c9945f'],
		['#e2b47c', '#d3a067', '#bb8551'],
		['#ecc390', '#dcaa72', '#c79059'],
	];
	for (let b = 0; b < N; b++) {
		const y0 = b * bh;
		const [lt, md, dk] = woods[b];
		// enine yumuşak geçiş: orta açık, uçlar hafif koyu (yıpranma)
		const gx = g.createLinearGradient(0, 0, w, 0);
		gx.addColorStop(0, dk);
		gx.addColorStop(0.08, md);
		gx.addColorStop(0.35, lt);
		gx.addColorStop(0.65, md);
		gx.addColorStop(0.92, lt);
		gx.addColorStop(1, dk);
		g.fillStyle = gx;
		g.fillRect(0, y0, w, bh);
		// boyuna damarlar: uzun, yumuşak, az
		for (let l = 0; l < 7; l++) {
			const yy = y0 + R.range(0.15, 0.85) * bh;
			g.strokeStyle = rgba(R() < 0.6 ? '#9c6a3e' : '#f6dcb0', R.range(0.18, 0.34));
			g.lineWidth = R.range(1, 2.4) * k;
			g.beginPath();
			const ph = R() * TAU;
			const fr = R.range(1.5, 3.5);
			for (let x = 0; x <= w; x += 8 * k) {
				const off = Math.sin((x / w) * TAU * fr + ph) * bh * 0.06;
				if (x === 0) g.moveTo(x, yy + off);
				else g.lineTo(x, yy + off);
			}
			g.stroke();
		}
		// budak: damarların etrafından dolandığı koyu göz
		if (b % 2 === 0) {
			const kx = R.range(0.25, 0.75) * w;
			const ky = y0 + bh * R.range(0.35, 0.65);
			g.fillStyle = rgba('#8a5a33', 0.55);
			g.beginPath();
			g.ellipse(kx, ky, 11 * k, bh * 0.2, 0, 0, TAU);
			g.fill();
			g.fillStyle = rgba('#5c3a20', 0.7);
			g.beginPath();
			g.ellipse(kx, ky, 5 * k, bh * 0.1, 0, 0, TAU);
			g.fill();
		}
		// pah: üst kenarda ışık, alt kenarda koyu çizgi (tahta kenarı yuvarlatılmış gibi)
		const gy = g.createLinearGradient(0, y0, 0, y0 + bh);
		gy.addColorStop(0, 'rgba(255,240,210,0.55)');
		gy.addColorStop(0.1, 'rgba(255,240,210,0.0)');
		gy.addColorStop(0.86, 'rgba(70,40,20,0.0)');
		gy.addColorStop(1, 'rgba(70,40,20,0.5)');
		g.fillStyle = gy;
		g.fillRect(0, y0, w, bh);
		// çiviler: iki uçta ikişer
		for (const xx of [0.06, 0.94]) {
			for (const f of [0.32, 0.68]) {
				g.fillStyle = 'rgba(60,40,30,0.85)';
				g.beginPath();
				g.arc(xx * w, y0 + bh * f, 2.4 * k, 0, TAU);
				g.fill();
				g.fillStyle = 'rgba(255,235,200,0.5)';
				g.beginPath();
				g.arc(xx * w - 0.7 * k, y0 + bh * f - 0.7 * k, 0.9 * k, 0, TAU);
				g.fill();
			}
		}
	}
	return finishTex(c, { aniso, repeat: false });
}

// ---------------------------------------------------------------------------------------------
// Yaprak atlası (2×2): 0 kiraz çiçeği, 1 yaz yaprağı, 2 güz yaprağı, 3 kar topağı.
// Her hücre dolgun, resimsi bir öbek: içi dolu (kartlar üst üste binince delik/kumlanma olmasın),
// kenarı yaprak biçimli tırtıklı; üstü açık ve sıcak, altı koyu ve serin (yumuşak değer geçişi).
// Kartlar neredeyse dik durur (dönüş ±20°), bu yüzden ışık geçişi her kartta yukarıdan aşağıya.
// ---------------------------------------------------------------------------------------------
export function leafAtlas(size) {
	const [c, g] = canvas(size, size);
	const cell = size / 2;
	const R = rng(23);
	const k = cell / 256;

	// yaprak: sivri uçlu badem; bir yarısı biraz açık (orta damar ışığı)
	const leaf = (x, y, len, wid, ang, fill, light) => {
		g.save();
		g.translate(x, y);
		g.rotate(ang);
		g.fillStyle = fill;
		g.beginPath();
		g.moveTo(0, -len * 0.5);
		g.bezierCurveTo(wid * 0.75, -len * 0.3, wid * 0.62, len * 0.22, 0, len * 0.5);
		g.bezierCurveTo(-wid * 0.62, len * 0.22, -wid * 0.75, -len * 0.3, 0, -len * 0.5);
		g.fill();
		if (light) {
			g.fillStyle = light;
			g.beginPath();
			g.moveTo(0, -len * 0.46);
			g.bezierCurveTo(wid * 0.62, -len * 0.28, wid * 0.5, len * 0.2, 0, len * 0.44);
			g.closePath();
			g.fill();
		}
		g.restore();
	};

	// öbek yerleşimi: kenara yakın yapraklar dışa bakar (tırtıklı siluet), içtekiler serbest
	const clumpPts = (n, rad) => {
		const P = [];
		for (let i = 0; i < n; i++) {
			const a = R() * TAU;
			const rr = Math.pow(R(), 0.6) * rad;
			P.push({ a, rr, x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.9 });
		}
		// aşağıdan yukarı çiz: üstteki (açık) yapraklar en üstte kalsın
		P.sort((p, q) => q.y - p.y);
		return P;
	};
	// dikey değer: 0 üst, 1 alt
	const vy = (y, rad) => Math.min(1, Math.max(0, (y / rad) * 0.5 + 0.5));

	// içi dolu gölge çekirdeği (birkaç örtüşen daire)
	const core = (cx, cy, rad, top, bot) => {
		const gr = g.createLinearGradient(0, cy - rad, 0, cy + rad);
		gr.addColorStop(0, top);
		gr.addColorStop(1, bot);
		g.fillStyle = gr;
		for (let i = 0; i < 9; i++) {
			const a = (i / 9) * TAU + R() * 0.4;
			const d = i === 0 ? 0 : rad * R.range(0.25, 0.5);
			g.beginPath();
			g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, rad * R.range(0.42, 0.58), 0, TAU);
			g.fill();
		}
	};

	const leafyCell = (cx, cy, pal, n, lenR) => {
		const rad = cell * 0.36;
		core(cx, cy, rad * 0.78, pal.coreTop, pal.coreBot);
		for (const p of clumpPts(n, rad)) {
			const t = vy(p.y, rad);
			const edge = p.rr / rad;
			// kenardakiler dışa, içtekiler hafif aşağı sarkık
			const ang = edge > 0.55 ? p.a + Math.PI / 2 + R.range(-0.35, 0.35) : R.range(-0.9, 0.9) + Math.PI;
			const len = R.range(lenR[0], lenR[1]) * k;
			const col = pal.ramp(t, R());
			leaf(cx + p.x, cy + p.y, len, len * R.range(0.42, 0.52), ang, col, pal.hi(t));
		}
	};

	const ramp3 = (a, b, c2) => (t, r) => {
		const j = (r - 0.5) * 0.22;
		const tt = Math.min(1, Math.max(0, t + j));
		return tt < 0.5 ? mixHex(a, b, tt * 2) : mixHex(b, c2, (tt - 0.5) * 2);
	};

	// 0) kiraz çiçeği: beş taçyapraklı iri çiçekler; üstte neredeyse beyaz, altta gül-mor
	{
		const cx = cell * 0.5;
		const cy = cell * 0.5;
		const rad = cell * 0.36;
		core(cx, cy, rad * 0.8, '#f4c6d6', '#b9789c');
		// kenarda birkaç taze yaprak
		for (let i = 0; i < 12; i++) {
			const a = R() * TAU;
			const rr = rad * R.range(0.72, 0.95);
			const x = cx + Math.cos(a) * rr;
			const y = cy + Math.sin(a) * rr * 0.9;
			const t = vy(y - cy, rad);
			leaf(x, y, R.range(30, 42) * k, R.range(13, 17) * k, a + Math.PI / 2, mixHex('#a6cf6c', '#5e8f45', t), 'rgba(230,255,190,0.25)');
		}
		const flower = (x, y, r, t) => {
			const a0 = R() * TAU;
			const petal = mixHex('#fff4f8', '#ffc3d8', Math.min(1, t * 1.3));
			const petal2 = mixHex('#ffc3d8', '#d98aae', Math.max(0, t * 1.4 - 0.4));
			const col = t < 0.55 ? petal : petal2;
			const edge = mixHex('#ffd7e5', '#c06f98', t);
			for (let p = 0; p < 5; p++) {
				const a = a0 + (p / 5) * TAU;
				g.fillStyle = edge;
				g.beginPath();
				g.ellipse(x + Math.cos(a) * r * 0.56, y + Math.sin(a) * r * 0.56, r * 0.56, r * 0.42, a, 0, TAU);
				g.fill();
				g.fillStyle = col;
				g.beginPath();
				g.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.46, r * 0.34, a, 0, TAU);
				g.fill();
			}
			g.fillStyle = t < 0.5 ? '#f7d26a' : '#e2789f';
			g.beginPath();
			g.arc(x, y, r * 0.2, 0, TAU);
			g.fill();
		};
		for (const p of clumpPts(64, rad)) {
			const t = vy(p.y, rad);
			flower(cx + p.x, cy + p.y, R.range(17, 24) * k, Math.min(1, Math.max(0, t + R.range(-0.12, 0.12))));
		}
	}
	// 1) yaz: zümrüt; üstte sarımsı ışık, altta mavi-yeşil gölge
	leafyCell(cell * 1.5, cell * 0.5, {
		coreTop: '#4e8a3a',
		coreBot: '#1f4a30',
		ramp: ramp3('#b4dd6e', '#5fa344', '#2a6136'),
		hi: (t) => (t < 0.5 ? 'rgba(240,255,190,0.28)' : 'rgba(200,240,170,0.12)'),
	}, 84, [36, 50]);
	// 2) güz: altın sarısı, kehribar, birkaç kızıl
	leafyCell(cell * 0.5, cell * 1.5, {
		coreTop: '#e0a23a',
		coreBot: '#9a4a22',
		ramp: (t, r) => (r < 0.06 ? mixHex('#ea8a3e', '#b9512c', t) : ramp3('#ffe58a', '#f4b23c', '#c96a2a')(t, r)),
		hi: (t) => (t < 0.5 ? 'rgba(255,250,210,0.32)' : 'rgba(255,220,150,0.14)'),
	}, 80, [36, 50]);
	// 3) kar topağı: kabarık yuvarlak öbekler; üstü bembeyaz, altı lavanta-mavi
	{
		const cx = cell * 1.5;
		const cy = cell * 1.5;
		const rad = cell * 0.36;
		const P = clumpPts(34, rad * 0.85);
		for (const p of P) {
			const t = vy(p.y, rad);
			const r = R.range(26, 46) * k * (1 - 0.3 * (p.rr / rad));
			const x = cx + p.x;
			const y = cy + p.y;
			const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.45, r * 0.15, x, y, r);
			gr.addColorStop(0, mixHex('#ffffff', '#e6ecfb', t));
			gr.addColorStop(0.7, mixHex('#f3f6fe', '#c9d3f0', t));
			gr.addColorStop(1, mixHex('#d9e1f6', '#aab6e0', t));
			g.fillStyle = gr;
			g.beginPath();
			g.arc(x, y, r, 0, TAU);
			g.fill();
		}
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
