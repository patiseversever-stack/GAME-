// Bölüm tasarımları. Her bölüm patikanın bir parçasıdır (layout.js → LEVELS); burada o parçanın
// oynanış ayarları var: damlalar, rüzgâr ve sert rüzgârlar, güneşin yüksekliği, ipuçları.
//
//   drops: [u, yan]   u: bölüm içindeki konum (0 başlangıç, 1 son), yan: -1 gövde tarafı, +1 dış kenar
//   gust:  { every, dur, power, from }  sert rüzgâr: her `every` saniyede `dur` süren, gücü `power`
//   elev:  [başlangıç, bitiş] güneş yüksekliği (derece); bölüm ilerledikçe gün akar
//   sunStart: Zifir'e göre güneşin başlangıç açısı (π: tam arkada, gövdenin gölgesinde güvenli)
//   crystals: [u, yan, uzaklık, yükseklik] ışık kristalleri. Kristal, güneş tam arkadayken ışığı u
//             noktasına yansıtacak açıyla durur: oyuncu güneşi gövdenin arkasında tutarken ışını
//             Zifir'den uzak tutacak açıyı bulmalı. yan: +1 Zifir'in önünde, -1 arkasında.
//   locks:    [u] ışık kilitleri: yolu kapatan tomurcuk / buz. Güneş değince açılır.

import { LEVELS } from '../world/layout.js';

export const DESIGN = [
	{
		// Bahar I: öğretici. Taç gölgesinde başlar; güneşi gövdenin arkasına saklamayı öğretir.
		speed: 1.55,
		wind: 0.22,
		elev: [40, 34],
		sunStart: Math.PI * 0.55,
		burn: 0.7,
		drops: [
			[0.42, -0.2],
			[0.78, 0.3],
		],
		hints: ['drag', 'hide'],
	},
	{
		// Bahar II: ilk asma köprü; çiçekli dalın gölgesi ve damlaların ışıkta erimesi.
		speed: 1.6,
		wind: 0.28,
		elev: [34, 30],
		sunStart: Math.PI,
		drops: [
			[0.22, 0.4],
			[0.5, 0.0],
			[0.58, 0.45],
			[0.86, -0.3],
		],
		gust: { every: 11, dur: 2.2, power: 0.5, from: 6 },
		crystals: [[0.8, 1, 4.6, 3.2]],
		locks: [0.45],
		hints: ['drops', 'bridge', 'crystal'],
	},
	{
		// Yaz I: tepede güneş, kısa gölgeler; üstteki patika katının gölgesi işe yarar.
		speed: 1.65,
		wind: 0.25,
		elev: [62, 56],
		sunStart: Math.PI,
		drops: [
			[0.18, 0.5],
			[0.47, 0.2],
			[0.53, 0.5],
			[0.74, -0.4],
			[0.92, 0.35],
		],
		crystals: [
			[0.3, 1, 4.8, 3.3],
			[0.72, -1, 4.4, 3.0],
		],
		locks: [0.6],
		hints: ['ledge'],
	},
	{
		// Yaz II: kuş yuvası köprüsü, gövdeden en uzak nokta. Bekle'yi öğretir.
		speed: 1.65,
		wind: 0.3,
		elev: [56, 48],
		sunStart: Math.PI,
		drops: [
			[0.2, -0.3],
			[0.5, 0.3],
			[0.56, -0.2],
			[0.62, 0.45],
			[0.88, 0.3],
		],
		gust: { every: 9, dur: 2.4, power: 0.75, from: 5 },
		crystals: [
			[0.25, -1, 4.6, 3.2],
			[0.78, 1, 5.0, 3.4],
		],
		locks: [0.38],
		hints: ['wait'],
	},
	{
		// Güz I: alçak altın güneş, uzun gölgeler; sert rüzgâr yaprakları savurur.
		speed: 1.7,
		wind: 0.3,
		elev: [30, 24],
		sunStart: Math.PI,
		drops: [
			[0.16, 0.4],
			[0.36, -0.3],
			[0.55, 0.5],
			[0.72, 0.1],
			[0.9, -0.4],
		],
		gust: { every: 7.5, dur: 2.8, power: 1.15, from: 3 },
		crystals: [
			[0.35, 1, 4.6, 3.2],
			[0.68, -1, 4.8, 3.2],
		],
		locks: [0.5],
		hints: ['gust'],
	},
	{
		// Güz II: fırtına. Sık ve güçlü rüzgâr, köprüde yapraklara güvenmek zor.
		speed: 1.72,
		wind: 0.38,
		elev: [24, 18],
		sunStart: Math.PI,
		drops: [
			[0.2, 0.3],
			[0.42, 0.5],
			[0.5, -0.2],
			[0.57, 0.45],
			[0.8, -0.3],
			[0.93, 0.4],
		],
		gust: { every: 6, dur: 3.0, power: 1.55, from: 2.5 },
		crystals: [
			[0.22, 1, 4.6, 3.0],
			[0.55, -1, 5.0, 3.3],
			[0.85, 1, 4.4, 3.2],
		],
		locks: [0.32, 0.72],
	},
	{
		// Kış I: çıplak dallar, az yaprak; kar topaklarının küçük gölgeleri ve çok uzun gövde gölgesi.
		speed: 1.75,
		wind: 0.18,
		elev: [16, 11],
		sunStart: Math.PI,
		drops: [
			[0.2, 0.45],
			[0.4, -0.2],
			[0.55, 0.5],
			[0.7, 0.2],
			[0.9, 0.45],
		],
		gust: { every: 10, dur: 2.2, power: 0.6, from: 5 },
		crystals: [
			[0.3, -1, 4.6, 3.0],
			[0.6, 1, 4.8, 3.2],
			[0.88, -1, 4.4, 3.0],
		],
		locks: [0.45, 0.8],
	},
	{
		// Kış II: gün batımı. Kökler, kayalar ve çamlar adaya uzun gölgeler serer. Kök Kapısı.
		speed: 1.7,
		wind: 0.15,
		elev: [10, 4],
		sunStart: Math.PI,
		drops: [
			[0.15, 0.4],
			[0.35, -0.3],
			[0.52, 0.5],
			[0.68, 0.0],
			[0.84, 0.45],
		],
		crystals: [
			[0.28, 1, 4.6, 3.0],
			[0.62, -1, 4.8, 3.0],
		],
		locks: [0.5],
		hints: ['gate'],
		finale: true,
	},
];

export function levelInfo(i) {
	return { ...LEVELS[i], ...DESIGN[i], index: i };
}

export const LEVEL_COUNT = LEVELS.length;

/** Sert rüzgârın t anındaki gücü (yumuşak artıp azalır). */
export function gustAt(g, t) {
	if (!g || t < g.from) return 0;
	const p = (t - g.from) % g.every;
	if (p > g.dur) return 0;
	const k = Math.sin((p / g.dur) * Math.PI);
	return g.power * k * k;
}

/** Bir sonraki sert rüzgâra kalan süre (uyarı göstermek için). */
export function gustIn(g, t) {
	if (!g) return Infinity;
	if (t < g.from) return g.from - t;
	const p = (t - g.from) % g.every;
	return p > g.dur ? g.every - p : 0;
}

/** Bölümün patika üzerindeki başlangıç ve bitiş noktası (yay uzunluğu). */
export function levelSpan(curve, i) {
	const L = LEVELS[i];
	const s0 = curve.sAtTheta(L.from) + (i === 0 ? 1.2 : 0.5);
	const s1 = curve.sAtTheta(L.to) - (L.finale ? 0.4 : 0.5);
	return [s0, s1];
}
