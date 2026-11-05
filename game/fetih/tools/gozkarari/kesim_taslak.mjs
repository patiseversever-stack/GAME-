// Kullanım: node kesim_taslak.mjs <çıktı.html> <adlar.json> — 30 kesim taslağının boş çizimi (kullanıcı seçimi için)
// 30 kesim taslağı: köşeler + kenar profilleri (dışa +, içe −) → yoğun nokta → Chaikin yumuşatma → SVG yolu
import fs from 'fs';

const PI = Math.PI;
const sm = (x) => x * x * (3 - 2 * x);
// kenar profilleri (t: 0..1, dönen: dış normal yönünde px)
const flat = () => 0;
const bow = (a) => (t) => a * Math.sin(PI * t);
const wave = (a, n, ph = 0) => (t) => a * Math.sin(2 * PI * n * t + ph) * Math.sin(PI * t) ** 0.35;
const S = (a) => (t) => a * Math.sin(2 * PI * t);
// tümsek (a>0 çıkıntı, a<0 oyuk): c merkez, w yarı genişlik, p düzlük (0 sivri, 1 düz tepeli)
const bump = (c, w, a, p = 0.4) => (t) => {
	const d = Math.abs(t - c) / w;
	if (d >= 1) return 0;
	const k = d < p ? 1 : sm(1 - (d - p) / (1 - p));
	return a * k;
};
const add = (...fs) => (t) => fs.reduce((s, f) => s + f(t), 0);
let seed = 7;
const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const rough = (a, n) => {
	const k = Array.from({ length: n + 1 }, () => (R() - 0.5) * 2 * a);
	return (t) => {
		const x = t * n;
		const i = Math.min(n - 1, Math.floor(x));
		const f = sm(x - i);
		return (k[i] * (1 - f) + k[i + 1] * f) * Math.sin(PI * t) ** 0.3;
	};
};

function build(pts, prof, { corner = 2 } = {}) {
	const out = [];
	for (let i = 0; i < pts.length; i++) {
		const a = pts[i];
		const b = pts[(i + 1) % pts.length];
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const L = Math.hypot(dx, dy);
		const nx = dy / L;
		const ny = -dx / L;
		const f = prof[i] || flat;
		const n = Math.max(6, Math.round(L / 3));
		for (let j = 0; j < n; j++) {
			const t = j / n;
			const o = f(t);
			out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
		}
	}
	// Chaikin: köşeler hafif yumuşar (corner tur)
	let p = out;
	for (let r = 0; r < corner; r++) {
		const q = [];
		for (let i = 0; i < p.length; i++) {
			const A = p[i];
			const B = p[(i + 1) % p.length];
			q.push([A[0] * 0.75 + B[0] * 0.25, A[1] * 0.75 + B[1] * 0.25], [A[0] * 0.25 + B[0] * 0.75, A[1] * 0.25 + B[1] * 0.75]);
		}
		p = q;
	}
	return 'M' + p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
}

// kutu: 400×300, iç pay ~24 (çıkıntılar sığsın). Saat yönünde: sol üst, sağ üst, sağ alt, sol alt.
const B = [[24, 24], [376, 24], [376, 276], [24, 276]];
const T = [
	// 1 Bayrak (çizim 1): üst hafif kavis, iki yan eğik, alt yumuşak S
	['Bayrak', [[70, 34], [372, 26], [340, 272], [28, 262]], [bow(5), bow(-3), add(S(9), bow(3)), bow(2)]],
	// 2 Çapraz yontuk (çizim 2): sağ üst ve sol alt büyük kesik, kenarlar hafif eğri
	['Çapraz yontuk', [[26, 30], [280, 26], [372, 92], [374, 274], [118, 276], [30, 196]], [bow(3), bow(-2), bow(3), bow(2), bow(-2), bow(3)]],
	// 3 Kurabiye (çizim 3): her kenarda düzensiz loblar ve oyuklar
	['Kurabiye', [[44, 44], [356, 40], [360, 262], [40, 260]], [add(wave(13, 2.5, 0.4), rough(3, 5)), add(wave(12, 2, 1.3), rough(3, 4)), add(wave(13, 2.5, 2.2), rough(3, 5)), add(wave(12, 2, 0.2), rough(3, 4))]],
	['Yapboz tek', B, [bow(2), bump(0.5, 0.2, 28, 0.05), bow(2), bump(0.5, 0.2, -24, 0.05)]],
	['Yapboz çift', B, [bump(0.38, 0.15, 22, 0.05), bump(0.6, 0.18, 24, 0.05), bump(0.62, 0.15, -20, 0.05), bump(0.4, 0.18, -20, 0.05)]],
	['Rüzgâr', [[60, 26], [376, 26], [342, 276], [24, 276]], [bow(3), bow(-4), bow(2), S(10)]],
	['Dalgalı etek', [[28, 26], [372, 26], [362, 260], [38, 260]], [bow(2), bow(4), wave(11, 3, 0.9), bow(4)]],
	['Köşe ısırığı', [[24, 92], [24, 24].map((x) => x), [376, 24], [376, 276], [24, 276]].slice(0, 0).length ? B : [[86, 24], [376, 24], [376, 276], [24, 276], [24, 86]], [bow(2), bow(2), bow(2), bow(2), (t) => -30 * Math.sin(PI * t)]],
	['Çift ısırık', [[24, 24], [318, 24], [376, 82], [376, 276], [82, 276], [24, 218]], [bow(2), (t) => -24 * Math.sin(PI * t), bow(2), bow(2), (t) => -24 * Math.sin(PI * t), bow(2)]],
	['Basamak', [[24, 24], [300, 24], [300, 58], [340, 58], [340, 96], [376, 96], [376, 276], [100, 276], [100, 242], [62, 242], [62, 204], [24, 204]], []],
	['Bulut tepe', [[24, 40], [376, 40], [372, 276], [28, 276]], [add(bump(0.2, 0.17, 16, 0), bump(0.5, 0.19, 22, 0), bump(0.8, 0.17, 15, 0)), bow(3), bow(2), bow(3)]],
	['Köşe kıvrımı', [[24, 44], [376, 44], [376, 276], [24, 276]], [add(bow(2), bump(0.86, 0.16, 22, 0)), add(bump(0.12, 0.2, 20, 0), bow(-3)), bow(3), bow(2)]],
	['Yırtık yan', B, [bow(2), add(rough(8, 14), rough(3, 30)), bow(2), bow(2)]],
	['Kesik dalga', [[90, 26], [374, 26], [374, 268], [26, 268], [26, 90]], [bow(3), bow(3), wave(9, 2, 0), bow(3), bow(-3)]],
	['Çakıl taşı', [[70, 30], [300, 24], [372, 104], [358, 250], [210, 280], [44, 262], [28, 118]], [bow(6), bow(5), bow(7), bow(5), bow(6), bow(7), bow(5)]],
	['Kavisli trapez', [[64, 26], [336, 26], [376, 276], [24, 276]], [bow(-5), bow(9), bow(4), bow(9)]],
	['Yelken', [[24, 60], [300, 24], [376, 276], [24, 276]], [bow(16), bow(-10), bow(2), bow(2)]],
	['Çentik bilet', B, [bump(0.5, 0.1, -18, 0.15), bow(2), bump(0.5, 0.1, -18, 0.15), bow(2)]],
	['Yumuşak kalkan', [[26, 26], [374, 26], [374, 180], [214, 284], [26, 186]], [bow(4), bow(2), bow(16), bow(16), bow(2)]],
	['Dört yaprak', [[50, 50], [350, 50], [350, 250], [50, 250]], [add(bump(0.5, 0.45, 22, 0), bump(0.08, 0.08, -10, 0)), add(bump(0.5, 0.45, 22, 0)), add(bump(0.5, 0.45, 22, 0), bump(0.92, 0.08, -10, 0)), add(bump(0.5, 0.45, 22, 0))]],
	['Kayık kemer', [[24, 110], [150, 30], [376, 70], [376, 276], [24, 276]], [bow(12), bow(14), bow(2), bow(2), bow(2)]],
	['Bel', B, [bow(6), bump(0.5, 0.48, -20, 0), bow(6), bump(0.5, 0.48, -20, 0)]],
	['Kıvrık yaprak', B, [S(6), bow(3), S(-6), bow(3)], 1],
	['Ok ucu', [[24, 24], [340, 24], [384, 150], [340, 276], [24, 276]], [bow(2), bow(4), bow(4), bow(2), bow(-6)]],
	['İçe kavis', B, [bow(-12), bow(-10), bow(-12), bow(-10)]],
	['Şişkin', [[34, 34], [366, 34], [366, 266], [34, 266]], [bow(12), bow(10), bow(12), bow(10)]],
	['Burç', [[24, 52], [376, 52], [376, 276], [24, 276]], [add(bump(0.15, 0.08, 26, 0.6), bump(0.5, 0.08, 26, 0.6), bump(0.85, 0.08, 26, 0.6)), bow(2), bow(2), bow(2)]],
	['Sırt', [[24, 60], [376, 60], [376, 276], [24, 276]], [add(bump(0.3, 0.3, 34, 0), bump(0.72, 0.22, 22, 0)), bow(2), bow(3), bow(2)]],
	['Kurdele', [[24, 34], [376, 34], [376, 266], [24, 266]], [wave(10, 1.5, 0), bump(0.5, 0.18, -16, 0.2), wave(-10, 1.5, 0), bump(0.5, 0.18, -16, 0.2)]],
	['Karma', [[24, 24], [300, 24], [376, 96], [376, 276], [24, 276]], [bow(3), bow(-3), wave(8, 2, 0.5), bump(0.55, 0.14, -20, 0.3), bow(2)]],
];

let h = '<html><head><meta charset="utf-8"></head><body style="margin:0;background:radial-gradient(circle at 40% 30%,#3b3d3c,#121314);display:grid;grid-template-columns:repeat(5,250px);gap:26px 22px;padding:26px;font:800 17px sans-serif;color:#f2f2f2">';
T.forEach(([name, pts, prof, corner], i) => {
	seed = 101 + i * 37;
	const d = build(pts, prof, { corner: corner ?? 2 });
	h += `<div><svg viewBox="-10 -10 420 320" width="250" height="190"><path d="${d}" fill="rgba(255,255,255,.04)" stroke="#d23b3b" stroke-width="9" stroke-linejoin="round"/></svg><div>${i + 1}. ${name}</div></div>`;
});
fs.writeFileSync(process.argv[2], h + '</body></html>');
fs.writeFileSync(process.argv[3], JSON.stringify(T.map(([n], i) => n)));
