// Paletler ve bölümler.
//
// Tekne koordinatı: x 0..1 (soldan sağa), y 0..A (aşağıdan yukarıya), A = 1.6.
// Boya numaraları: 0-5 sanat boyaları, 6 kara mürekkep (tehlike), 7 altın.
//
// prep: bölüm açılırken ebru ustasının tekneyi hazırlaması. Rastgele ama tohumlu damlalar
//   (battal ebru: her yeni damla eskileri iter, taş deseni çıkar), ardından isteğe bağlı
//   tarak çekişleri (gel-git, taraklı). Aynı tohum her cihazda aynı deseni verir.

export const A = 1.6;

export const PALETTES = {
	// Lale Devri: lâciverdin, kökboyası kırmızısı, safran, çam yeşili
	lale: {
		base: 0xf1e5cc,
		pal: [0x213f8f, 0xb0262f, 0xe3a531, 0x2b6a4b, 0xd97a8f, 0x2a9c98, 0x0b0912, 0xd8aa46],
		vein: 0.75,
		veinCol: 0xfffaf0,
		ghost: 0.45,
	},
	// Gece Mavisi: koyu zemin, ışıklı boyalar
	gece: {
		base: 0x141a3a,
		pal: [0x2fb6c4, 0xf07a5f, 0xf2c14e, 0x8ad0a0, 0xd9a3e0, 0x5d7cf0, 0x020206, 0xe7b955],
		vein: 0.5,
		veinCol: 0xfdf2da,
		ghost: 0.55,
	},
};

export const LEVELS = [
	{
		id: 'ilk-damla',
		name: 'İlk Damla',
		kicker: 'Lale Bahçesi · I',
		palette: 'lale',
		colors: [0, 1, 2, 3],
		prep: { seed: 11, stones: 120, colors: [0, 1, 2, 3], rMin: 0.04, rMax: 0.085, combs: [] },
		boat: [0.22, 0.2],
		harbor: [0.74, 1.36, 0.085],
		inks: [
			[0.42, 0.74, 0.085],
			[0.7, 0.98, 0.06],
		],
		leaves: [
			[0.3, 0.55],
			[0.58, 0.62],
			[0.4, 1.12],
		],
		par: 35,
	},
	{
		id: 'gel-git',
		name: 'Gel-Git',
		kicker: 'Lale Bahçesi · II',
		palette: 'lale',
		colors: [0, 2, 4, 5],
		prep: {
			seed: 23,
			stones: 120,
			colors: [0, 2, 4, 5],
			rMin: 0.04,
			rMax: 0.08,
			// [ox, oy, dx, dy, z, lambda, space]
			combs: [
				[0, 0, 0, 1, 0.09, 0.015, 0.11],
				[0, 0.055, 0, -1, 0.09, 0.015, 0.11],
			],
		},
		boat: [0.8, 0.16],
		harbor: [0.22, 1.42, 0.08],
		inks: [
			[0.55, 0.55, 0.07],
			[0.3, 0.92, 0.08],
			[0.72, 1.18, 0.065],
		],
		leaves: [
			[0.62, 0.32],
			[0.48, 0.86],
			[0.2, 1.15],
			[0.78, 0.8],
		],
		drip: { every: 7, r: 0.05 },
		par: 40,
	},
	{
		id: 'gece-mavisi',
		name: 'Gece Mavisi',
		kicker: 'Gece · I',
		palette: 'gece',
		colors: [0, 1, 2, 4],
		prep: { seed: 5, stones: 70, colors: [0, 1, 2, 3, 4, 5], rMin: 0.035, rMax: 0.08, combs: [[0, 0, 1, 0, 0.06, 0.012, 0.09]] },
		boat: [0.5, 0.14],
		harbor: [0.5, 1.44, 0.08],
		inks: [
			[0.3, 0.6, 0.07],
			[0.7, 0.6, 0.07],
			[0.5, 1.0, 0.09],
		],
		leaves: [
			[0.5, 0.42],
			[0.18, 0.95],
			[0.82, 0.95],
			[0.5, 1.25],
		],
		drip: { every: 6, r: 0.055 },
		par: 45,
	},
];
