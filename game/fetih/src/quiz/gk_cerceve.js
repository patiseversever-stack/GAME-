// GÖZ KARARI KESİMLERİ: görsel düz dikdörtgen konmaz, çerçeve ya da bordür de yoktur; resmin kendisi 14 şablondan
// birinin biçimine kesilir (SVG clipPath, viewBox 0 0 400 300 = görselin 4:3 alanı). Kenarı yalnız şeklin kendisini
// izleyen yumuşak gölge ayırır (kart CSS'i). Köşeler yuvarlatılır, eğriler pürüzsüz (Catmull-Rom → Bézier); damla,
// yırtık ve bulut şekilleri soru kimliğiyle tohumlanır: her soru kendine özgü ama hep aynı şekle kesilir.
//
//   damla    organik akışkan leke            egik     köşeleri yumuşak eğik pano
//   kemer    Osmanlı sivri kemeri            yontuk   tek köşesi büyük yontulmuş levha
//   yumak    süper elips (yuvarlak kare)     dalga    üstü ve altı dalgalı kesim
//   yaprak   iki karşı köşesi büyük kavisli  bilet    yanları çentikli bilet
//   petek    köşeleri yumuşak altıgen        yirtik   yırtık kâğıt kenarı
//   bulut    iri kabarcıklı bulut            kalkan   kalkan
//   madalyon oval                            kesik    iki karşı köşesi çapraz kesik
// Tablolar (box: tablonun 4:3 karedeki asıl alanı) tablonun kendi boyuna oturan kemer, yumak, kesik ya da yaprak alır.

const W = 400;
const H = 300;
const M = 6; // gölge kutudan taşmasın diye küçük iç pay
const f1 = (x) => Math.round(x * 10) / 10;

function rand(seed) {
	let s = seed >>> 0 || 1;
	return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** Çokgen, her köşesi r yarıçapıyla yuvarlatılmış (r dizi olabilir: köşe başına). */
function roundPoly(pts, r) {
	const n = pts.length;
	let d = '';
	for (let i = 0; i < n; i++) {
		const p = pts[i];
		const a = pts[(i - 1 + n) % n];
		const b = pts[(i + 1) % n];
		const ra = Array.isArray(r) ? r[i] : r;
		const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
		const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
		const k = Math.min(ra, la / 2, lb / 2);
		const p1 = [p[0] + ((a[0] - p[0]) * k) / la, p[1] + ((a[1] - p[1]) * k) / la];
		const p2 = [p[0] + ((b[0] - p[0]) * k) / lb, p[1] + ((b[1] - p[1]) * k) / lb];
		d += `${i ? 'L' : 'M'}${f1(p1[0])} ${f1(p1[1])}Q${f1(p[0])} ${f1(p[1])} ${f1(p2[0])} ${f1(p2[1])}`;
	}
	return d + 'Z';
}

/** Kapalı pürüzsüz eğri (Catmull-Rom, gerginlik t). */
function smooth(pts, t = 1) {
	const n = pts.length;
	let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
	for (let i = 0; i < n; i++) {
		const p0 = pts[(i - 1 + n) % n];
		const p1 = pts[i];
		const p2 = pts[(i + 1) % n];
		const p3 = pts[(i + 2) % n];
		const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * t, p1[1] + ((p2[1] - p0[1]) / 6) * t];
		const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * t, p2[1] - ((p3[1] - p1[1]) / 6) * t];
		d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
	}
	return d + 'Z';
}

/** Kutunun çevresinde eşit aralıklı noktalar ve kenar yönü (saat yönünde, sol üstten). */
function around([x0, y0, x1, y1], step) {
	const out = [];
	const edge = (ax, ay, bx, by) => {
		const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
		for (let i = 0; i < n; i++) out.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, bx - ax, by - ay]);
	};
	edge(x0, y0, x1, y0);
	edge(x1, y0, x1, y1);
	edge(x1, y1, x0, y1);
	edge(x0, y1, x0, y0);
	return out;
}

/** Elips çevresinde n nokta; köşegen yönde biraz dışarı (görselin köşeleri boşa gitmesin). k(i, g): yarıçap çarpanı. */
function ring([a, t, b, u], n, ph, k) {
	const cx = (a + b) / 2;
	const cy = (t + u) / 2;
	const rx = (b - a) / 2;
	const ry = (u - t) / 2;
	const pts = [];
	for (let i = 0; i < n; i++) {
		const g = ph + (i / n) * Math.PI * 2;
		const sq = 1 + 0.15 * Math.abs(Math.sin(2 * g));
		const kk = k(i, g) * sq;
		pts.push([Math.min(b, Math.max(a, cx + Math.cos(g) * rx * kk)), Math.min(u, Math.max(t, cy + Math.sin(g) * ry * kk))]);
	}
	return pts;
}

// her şekil: (R: tohumlu rastgele, b: [x0, y0, x1, y1] kesim kutusu) → SVG yolu
const SHAPES = {
	// akışkan, organik leke: 9 nokta, yarıçapı tohumla dalgalanır
	damla: (R, box) => smooth(ring(box, 9, R() * Math.PI * 2, () => 0.8 + R() * 0.14), 1.05),
	egik: (R, [a, t, b, u]) => roundPoly([[a + 46, t], [b, t], [b - 46, u], [a, u]], 26),
	kemer: (R, [a, t, b, u]) => {
		const s = t + (u - t) * 0.33;
		const m = (a + b) / 2;
		return `M${a + 22} ${u}Q${a} ${u} ${a} ${u - 22}L${a} ${f1(s)}C${a} ${f1(t + (u - t) * 0.12)} ${f1(m - (b - a) * 0.22)} ${f1(t + (u - t) * 0.07)} ${f1(m)} ${t}C${f1(m + (b - a) * 0.22)} ${f1(t + (u - t) * 0.07)} ${b} ${f1(t + (u - t) * 0.12)} ${b} ${f1(s)}L${b} ${u - 22}Q${b} ${u} ${b - 22} ${u}Z`;
	},
	yontuk: (R, [a, t, b, u]) => {
		const c = 74;
		return roundPoly([[a, t], [b - c, t], [b, t + c], [b, u], [a + c * 0.45, u], [a, u - c * 0.45]], [22, 14, 14, 22, 10, 10]);
	},
	// süper elips |x|^n + |y|^n = 1, n = 4.2
	yumak: (R, [a, t, b, u]) => {
		const cx = (a + b) / 2;
		const cy = (t + u) / 2;
		const rx = (b - a) / 2;
		const ry = (u - t) / 2;
		const pts = [];
		for (let i = 0; i < 48; i++) {
			const g = (i / 48) * Math.PI * 2;
			const c = Math.cos(g);
			const s = Math.sin(g);
			pts.push([cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / 4.2) * rx, cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / 4.2) * ry]);
		}
		return smooth(pts);
	},
	dalga: (R, [a, t, b, u]) => {
		const amp = 11;
		const n = 3;
		const step = (b - a - 24) / n;
		const ph = R() < 0.5 ? 1 : -1;
		const X = (i) => a + 12 + step * i;
		let d = `M${a} ${t + amp + 10}Q${a} ${t + amp} ${a + 12} ${t + amp}`;
		for (let i = 0; i < n; i++) d += `C${f1(X(i) + step * 0.35)} ${f1(t + amp - ph * amp * 1.6)} ${f1(X(i + 1) - step * 0.35)} ${f1(t + amp + ph * amp * 1.6)} ${f1(X(i + 1))} ${t + amp}`;
		d += `Q${b} ${t + amp} ${b} ${t + amp + 10}L${b} ${u - amp - 10}Q${b} ${u - amp} ${b - 12} ${u - amp}`;
		for (let i = n; i > 0; i--) d += `C${f1(X(i) - step * 0.35)} ${f1(u - amp - ph * amp * 1.6)} ${f1(X(i - 1) + step * 0.35)} ${f1(u - amp + ph * amp * 1.6)} ${f1(X(i - 1))} ${u - amp}`;
		return d + `Q${a} ${u - amp} ${a} ${u - amp - 10}Z`;
	},
	yaprak: (R, [a, t, b, u]) => roundPoly([[a, t], [b, t], [b, u], [a, u]], R() < 0.5 ? [96, 16, 96, 16] : [16, 96, 16, 96]),
	bilet: (R, [a, t, b, u]) => {
		const r = 18;
		const n = 22;
		const my = (t + u) / 2;
		return `M${a + r} ${t}L${b - r} ${t}Q${b} ${t} ${b} ${t + r}L${b} ${my - n}A${n} ${n} 0 0 0 ${b} ${my + n}L${b} ${u - r}Q${b} ${u} ${b - r} ${u}L${a + r} ${u}Q${a} ${u} ${a} ${u - r}L${a} ${my + n}A${n} ${n} 0 0 0 ${a} ${my - n}L${a} ${t + r}Q${a} ${t} ${a + r} ${t}Z`;
	},
	petek: (R, [a, t, b, u]) => roundPoly([[a + 78, t], [b - 78, t], [b, (t + u) / 2], [b - 78, u], [a + 78, u], [a, (t + u) / 2]], 24),
	yirtik: (R, [a, t, b, u]) => {
		// yırtık kâğıt: sık ve düzensiz noktalar, aralarda ara sıra daha derin bir yırtık; gerginlik düşük (keskin lif)
		let deep = 0;
		const pts = around([a + 8, t + 8, b - 8, u - 8], 7).map(([x, y, dx, dy]) => {
			const L = Math.hypot(dx, dy) || 1;
			if (deep <= 0 && R() < 0.06) deep = 3 + Math.floor(R() * 3);
			const k = (R() - 0.5) * 6 + (deep-- > 0 ? 4 + R() * 3 : 0);
			return [x - (dy / L) * k, y + (dx / L) * k];
		});
		return smooth(pts, 0.35);
	},
	// iri kabarcıklar: 11 tepe, aralarında içe göçük
	bulut: (R, box) => smooth(ring(box, 22, R() * 0.6, (i) => (i % 2 ? 0.82 : 1)), 1.25),
	kalkan: (R, [a, t, b, u]) => {
		const m = (a + b) / 2;
		const s = t + (u - t) * 0.52;
		return `M${a + 20} ${t}L${b - 20} ${t}Q${b} ${t} ${b} ${t + 20}L${b} ${f1(s)}C${b} ${f1(s + (u - s) * 0.62)} ${f1(m + (b - a) * 0.26)} ${f1(u - 8)} ${m} ${u}C${f1(m - (b - a) * 0.26)} ${f1(u - 8)} ${a} ${f1(s + (u - s) * 0.62)} ${a} ${f1(s)}L${a} ${t + 20}Q${a} ${t} ${a + 20} ${t}Z`;
	},
	madalyon: (R, [a, t, b, u]) => {
		const rx = (b - a) / 2;
		const ry = (u - t) / 2;
		const cx = a + rx;
		return `M${cx} ${t}A${rx} ${ry} 0 1 1 ${cx} ${u}A${rx} ${ry} 0 1 1 ${cx} ${t}Z`;
	},
	kesik: (R, [a, t, b, u]) => {
		const c = 58;
		return R() < 0.5 ? roundPoly([[a + c, t], [b, t], [b, u - c], [b - c, u], [a, u], [a, t + c]], 14) : roundPoly([[a, t], [b - c, t], [b, t + c], [b, u], [a + c, u], [a, u - c]], 14);
	},
};

export const FRAMES = Object.keys(SHAPES);

/** Konu (KONULAR dizini) → kesim havuzu. */
const POOL = [
	['damla', 'bulut', 'madalyon', 'yumak'], // Hayvanlar
	['damla', 'dalga', 'yirtik', 'petek'], // Dinozor ve deniz canlıları
	['yontuk', 'bilet', 'kesik', 'yumak'], // İcatlar
	['madalyon', 'petek', 'damla'], // Uzay
	['petek', 'yontuk', 'kesik', 'bilet'], // Bilim aletleri
	['kemer', 'kalkan', 'yirtik', 'kesik'], // Genel tarih sahneleri
	['dalga', 'bulut', 'damla', 'yirtik'], // Doğa olayları
	['egik', 'petek', 'kesik', 'madalyon'], // Spor
	['kemer', 'yaprak', 'yumak', 'damla'], // El sanatları
	['kemer', 'yumak', 'kesik', 'yaprak'], // Tablolar (tablonun kendi boyunda)
	['bilet', 'yaprak', 'egik', 'yumak'], // Eşyalar ve aletler
	['kemer', 'yaprak', 'bulut', 'yumak'], // Eski ev eşyaları
	['egik', 'bilet', 'dalga', 'yontuk'], // Ulaşım araçları
	['kalkan', 'yaprak', 'kesik', 'egik'], // Meslekler
];

export function hashStr(s) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
}

/** Soruya düşen kesim adı. */
export function frameOf(q) {
	if (q.frame && SHAPES[q.frame]) return q.frame;
	const pool = POOL[q.konu] || FRAMES;
	return pool[hashStr(q.id || q.img || '') % pool.length];
}

/**
 * Kesimin yolu: { d, defs, over } (defs/over boş: çerçeve yok, yalnız kesim). k: benzersiz ek (sözleşme), seed: tohum.
 * box: [x0, y0, x1, y1] (0..1) görselin asıl alanı (dikey tablo 4:3 karede koyu dolgu şeritleriyle gelir).
 */
export function frameSVG(name, k, seed = 7, box = null) {
	const px = box ? [Math.max(M, box[0] * W + 2), Math.max(M, box[1] * H + 2), Math.min(W - M, box[2] * W - 2), Math.min(H - M, box[3] * H - 2)] : [M, M, W - M, H - M];
	const d = (SHAPES[name] || SHAPES.yumak)(rand(seed), px);
	return { d, defs: '', over: '' };
}
