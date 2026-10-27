// Bölümler. Her bölüm bir mahalle: zincir dizileri, boşluklar, meydanlar, sokaklar.
// Dünya birimi: standart domino taşı 1 birim boyunda. Ada yaklaşık 68 × 68 birim.
//
// build(b, d): ChainBuilder (b) ve taşlar (d) ile zinciri kurar; dönen nesne:
//   { start: ilk taş, slots: [{i, name}], shots: [{seq, mode, ...}], total }

import * as THREE from 'three';

const C = (h) => new THREE.Color(h);

// kalp resmi (domino sanatı): 0 boş, 1 kalp
function heart(c, r, cols, rows) {
	const x = (c - (cols - 1) / 2) / (cols / 2.3);
	const y = (r - rows * 0.45) / (rows / 2.1);
	const yy = -y;
	const v = (x * x + yy * yy - 1) ** 3 - x * x * yy * yy * yy;
	return v < 0;
}

export const LEVELS = [
	{
		id: 'sahil-1',
		name: 'Sahil Kasabası',
		kicker: 'Mahalle 1',
		env: 'ogle',
		seed: 7,
		fountain: [-21, 19],
		plazas: [
			[-21, 19, 7.5],
			[-9, -17, 10.5],
		],
		streets: [
			[[-31, 4], [-20, 6], [-8, 3], [2, 4]],
			[[20, 28], [21, 14], [25, 0], [26, -12]],
			[[-30, -28], [-22, -30]],
			[[-2, 28], [-6, 24], [-14, 26]],
			[[24, -22], [28, -28]],
		],
		keepOut: [
			[15, -18, 6.5],
			[-9, -13, 7],
		],
		build(b, d) {
			const rainbow = { rainbow: true, period: 46, sat: 0.92, light: 0.52 };
			// başlangıç: çeşmenin çevresinde içten dışa sarmal
			const cx = -21;
			const cz = 19;
			const sp = [];
			// 2.5 tur, saat yönünün tersine; doğu ucunda kuzeye bakarak biter
			for (let a = 0; a <= Math.PI * 5 + 1e-3; a += 0.16) {
				const r = 2.6 + (a / (Math.PI * 2)) * 1.6;
				const ang = Math.PI + a;
				sp.push([cx + Math.cos(ang) * r, cz + Math.sin(ang) * r]);
			}
			const Sp = b.line(sp, { colors: { rainbow: true, period: 60, offset: 0.1, sat: 0.92, light: 0.54 }, roadW: 0 });
			const A = b.line(
				[
					[cx + 6.6, cz + 0.6],
					[-13.6, 21.4],
					[-10.5, 21.6],
					[-6.5, 19.8],
					[-1, 16.5],
					[5.5, 12],
					[8.6, 5],
					[8.2, -2.5],
				],
				{ colors: rainbow, from: Sp.last },
			);
			// iki kol: sol kol resim alanına, sağ kol dev basamaklara
			const L = b.line(
				[
					[7.9, -3.1],
					[6.6, -5.6],
					[3, -7.8],
					[-3.5, -8.4],
					[-7.8, -8.4],
					[-9.2, -9.7],
				],
				{ from: A.last, colors: { rainbow: true, period: 30, offset: 0.55, sat: 0.92, light: 0.52 } },
			);
			const Rr = b.line(
				[
					[8.5, -3.1],
					[10.2, -5.6],
					[13.4, -8.5],
					[14.8, -12.5],
				],
				{ from: A.last, colors: [0xffffff, 0xff4d6d], },
			);
			const cols = 31;
			const rows = 16;
			const F = b.field(
				-9.2,
				-10.4,
				Math.PI,
				cols,
				rows,
				(c, r) => [C(0xfff3e0), heart(c, r, cols, rows) ? C(0xff2e4d) : C(0x56c8ff)],
				{ from: L.last, size: 0.78 },
			);
			const S = b.stairs(14.9, -13.1, Math.PI, 8, 1.26, { from: Rr.last, colors: [0xffd23a, 0xff8a3a, 0xff4d6d, 0xb04dff, 0x3a8aff, 0x2fd0a0] });
			// boşluklar: oyuncu zincir gelmeden taşı yerine koymalı
			const slots = [
				{ i: A.idx[38], name: 'gap' },
				{ i: A.idx[39], name: 'gap' },
				{ i: A.idx[50], name: 'gap' },
				{ i: Rr.idx[6], name: 'gap' },
			];
			return {
				start: Sp.first,
				slots,
				shots: [
					{ at: F.first, mode: 'high', dist: 14, height: 22, side: 0.15 },
					{ at: S.first, mode: 'low', dist: 15, height: 7.5, side: 1.1 },
				],
				fieldIdx: F.idx,
			};
		},
	},
];
