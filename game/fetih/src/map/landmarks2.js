// Haritanın yalın maketleri, v0.9 ekleri (19 yapı): landmarks.js ile aynı tarz (oyuncak maket, birleşik geometri,
// köşe başına malzeme). Üçgen bütçesi: yapı başına kademe 0'da ~300–800 (haritanın q0 bütçesi ~150k korunur).
// Yakın çekimdeki yüksek ayrıntılı eşleri hero_*.js dosyalarında.
//
// Yapıcılar landmarks.js'in yardımcılarını parametre olarak alır (döngüsel içe aktarma yok): L = { M, grounds,
// minaret, windows, flag, tree, cypress, pine, rock, jitter, archShape, facadeShape, LEAD, LEAD2, GOLD, DARK, ROOF,
// WOOD, MARBLE, CREAM }.

import * as THREE from 'three';

export function extraSites(L) {
	const { M, grounds, minaret, windows, flag, tree, cypress, pine, rock, archShape, facadeShape, LEAD, GOLD, DARK, ROOF, WOOD, MARBLE } = L;
	const dome = (k, r, x, y, z, sy = 0.8, col = LEAD, seg = 10) => k.color(col).smooth(true).dome(r, seg, x, y, z, sy).smooth(false);
	return {
		// ------------------------------------------------------------ Sultanahmet: 6 minare, kademeli kubbeler
		sultanahmet(k, R) {
			grounds(k, 0.6, '#d3c8b0', { ring: 0.8 });
			const W = '#ebe2cf';
			const L2 = '#7f93ad';
			k.color(W).box(0.5, 0.15, 0.48, 0, -0.03, -0.08);
			windows(k, 5, -0.2, 0.2, 0.04, 0.161, 0.022, 0.045, 0, true);
			for (const [x, z] of [[-0.16, -0.24], [0.16, -0.24], [-0.16, 0.08], [0.16, 0.08]]) dome(k, 0.06, x, 0.12, z, 0.75, L2, 8);
			for (const [x, z] of [[0, -0.2], [0, 0.04], [-0.12, -0.08], [0.12, -0.08]]) dome(k, 0.09, x, 0.15, z, 0.7, L2, 10);
			k.color(W).cyl(0.13, 0.135, 0.06, 12, 0, 0.17, -0.08);
			dome(k, 0.13, 0, 0.23, -0.08, 0.8, L2, 14);
			k.color(GOLD).cyl(0.004, 0.004, 0.04, 3, 0, 0.33, -0.08);
			// avlu
			k.color('#e0d6c0').box(0.42, 0.06, 0.03, 0, 0, 0.42).box(0.03, 0.06, 0.28, -0.2, 0, 0.29).box(0.03, 0.06, 0.28, 0.2, 0, 0.29);
			for (const [x, z, h, b] of [[-0.27, -0.33, 0.6, 3], [0.27, -0.33, 0.6, 3], [-0.27, 0.17, 0.6, 3], [0.27, 0.17, 0.6, 3], [-0.24, 0.44, 0.5, 2], [0.24, 0.44, 0.5, 2]]) minaret(k, x, z, h, 0.017, W, b, L2);
		},
		// ------------------------------------------------------------ Dolmabahçe Sarayı: uzun beyaz cephe, orta kubbe
		dolmabahce(k, R) {
			grounds(k, 0.62, '#cfc7b4', { ring: 0.8, rz: 0.7 });
			const W = '#f2ede2';
			k.color(W).box(0.92, 0.14, 0.18, 0, 0, -0.02);
			windows(k, 12, -0.42, 0.42, 0.03, 0.071, 0.02, 0.035, 0, true);
			windows(k, 12, -0.42, 0.42, 0.085, 0.071, 0.02, 0.035, 0, true);
			k.color('#e6dfd0').box(0.94, 0.012, 0.2, 0, 0.14, -0.02);
			k.color(W).box(0.24, 0.2, 0.22, 0, 0, -0.03);
			windows(k, 4, -0.08, 0.08, 0.06, 0.081, 0.024, 0.06, 0, true);
			dome(k, 0.1, 0, 0.2, -0.03, 0.75, '#9aa6b5', 12);
			k.color(GOLD).cyl(0.004, 0.004, 0.04, 3, 0, 0.27, -0.03);
			// saat kulesi ve rıhtım
			k.color('#efe8d8').box(0.05, 0.22, 0.05, 0.36, 0, 0.26).box(0.06, 0.015, 0.06, 0.36, 0.22, 0.26);
			k.color('#fff').box(0.03, 0.03, 0.002, 0.36, 0.17, 0.286);
			k.color('#cfc7b4').box(1.0, 0.02, 0.08, 0, -0.01, 0.13);
			flag(k, -0.36, 0.14, -0.02, 0.12, 0.07);
			for (const [x, z] of [[-0.5, -0.2], [0.5, -0.22], [0.0, -0.3]]) tree(k, x, z, 1, R);
		},
		// ------------------------------------------------------------ Akdamar Kilisesi: adada kırmızı taş kilise
		akdamar(k, R) {
			k.grad('#8e8370', '#b3a68e', -0.12, 0.06).add(rock(0.5, 0.14, 0.36, 3), new THREE.Matrix4().makeTranslation(0, -0.05, 0));
			const S = '#c98f6e';
			k.color(S).box(0.26, 0.14, 0.18, 0, 0.04, 0).box(0.14, 0.14, 0.3, 0, 0.04, 0);
			for (const [x, z] of [[0.13, 0], [-0.13, 0], [0, 0.15], [0, -0.15]]) k.color(S).cyl(0.06, 0.06, 0.12, 8, x, 0.04, z);
			k.color(S).cyl(0.06, 0.065, 0.12, 12, 0, 0.18, 0);
			k.color('#a8705a').cone(0.075, 0.1, 12, 0, 0.3, 0);
			k.color(DARK);
			for (let i = 0; i < 4; i++) {
				const a = (i / 4) * Math.PI * 2;
				k.box(0.012, 0.04, 0.006, Math.sin(a) * 0.063, 0.22, Math.cos(a) * 0.063, a);
			}
			for (const [x, z] of [[-0.32, 0.12], [0.3, -0.14], [0.26, 0.16]]) tree(k, x, z, 0.9, R, 0.04);
		},
		// ------------------------------------------------------------ Ani Harabeleri: katedral, Menüçehr minaresi, surlar
		ani(k, R) {
			grounds(k, 0.62, '#a3a07c', { ring: 0.86, jit: 0.08 });
			const S = '#a3624a';
			k.color(S).box(0.3, 0.2, 0.22, -0.08, 0, -0.06);
			k.color('#8f5440').cone(0.14, 0.08, 4, -0.08, 0.2, -0.06, Math.PI / 4);
			k.color(DARK);
			for (let i = 0; i < 4; i++) k.slab(archShape(0.03, 0.08), 0.01, -0.2 + i * 0.08, 0.06, 0.05);
			k.color('#9a6a4c').cyl(0.035, 0.04, 0.34, 8, 0.24, 0, 0.1);
			k.color('#7d4f3a').cyl(0.045, 0.035, 0.02, 8, 0.24, 0.34, 0.1);
			k.color('#a0705a').box(0.7, 0.1, 0.05, 0, 0, 0.38);
			for (const x of [-0.3, 0, 0.3]) k.color('#986a52').cyl(0.06, 0.065, 0.14, 8, x, 0, 0.38);
		},
		// ------------------------------------------------------------ Hasankeyf: yalçın kayalar, El-Rızk minaresi, köprü ayakları
		hasankeyf(k, R) {
			grounds(k, 0.62, '#b9a789', { ring: 0.86, jit: 0.08 });
			k.grad('#8f7b62', '#c3ab88', 0, 0.42).add(rock(0.36, 0.42, 0.2, 5), new THREE.Matrix4().makeTranslation(-0.2, 0.1, -0.3));
			k.color(DARK);
			for (let i = 0; i < 6; i++) k.box(0.025, 0.03, 0.02, -0.38 + i * 0.07, 0.12 + (i % 3) * 0.08, -0.12);
			k.raw(0.15, 0.48, 0.55 + 1.0).box(0.9, 0.006, 0.18, 0, 0.0, 0.3);
			k.color('#b39a78').box(0.07, 0.2, 0.08, -0.18, 0, 0.3).box(0.07, 0.2, 0.08, 0.14, 0, 0.3);
			k.color('#c2a986').cyl(0.035, 0.042, 0.4, 10, 0.26, 0, -0.06);
			k.color('#b29a78').cyl(0.05, 0.035, 0.03, 10, 0.26, 0.4, -0.06);
			k.color('#d9c7a8').cyl(0.022, 0.022, 0.05, 8, 0.26, 0.43, -0.06);
			k.color('#2a8c8c').mat(M.TILE).cyl(0.07, 0.075, 0.12, 12, 0.05, 0, 0.0);
			dome(k, 0.072, 0.05, 0.12, 0.0, 0.9, '#3a9fa0', 10);
			k.mat(0);
		},
		// ------------------------------------------------------------ Mardin: yamaçta kademeli taş evler
		mardin(k, R) {
			grounds(k, 0.64, '#c6a77c', { ring: 0.86 });
			const S = ['#dcb98b', '#d2ad7e', '#e2c398'];
			for (let row = 0; row < 4; row++)
				for (let i = 0; i < 4 - (row > 2 ? 1 : 0); i++) {
					const x = -0.36 + i * 0.22 + (row % 2) * 0.1;
					const z = 0.3 - row * 0.17;
					const y = row * 0.07;
					k.color(S[(i + row) % 3]).box(0.17, 0.08 + y, 0.13, x, 0, z);
					k.color(DARK).slab(archShape(0.03, 0.05), 0.01, x - 0.03, y + 0.015, z + 0.066).slab(archShape(0.03, 0.05), 0.01, x + 0.04, y + 0.015, z + 0.066);
				}
			k.color('#d6b386').cyl(0.03, 0.035, 0.42, 8, 0.3, 0.2, -0.2);
			k.color('#c9a679').cyl(0.045, 0.03, 0.04, 8, 0.3, 0.62, -0.2);
			dome(k, 0.07, -0.1, 0.3, -0.22, 0.9, '#d8b588', 10);
		},
		// ------------------------------------------------------------ Harran: konik kümbet evler
		harran(k, R) {
			grounds(k, 0.6, '#d3b98e', { ring: 0.86 });
			const C = ['#d9be93', '#cfb185', '#e0c79e'];
			const cells = [[-0.3, 0.2], [-0.16, 0.22], [-0.02, 0.24], [-0.3, 0.06], [-0.16, 0.08], [0.18, 0.14], [0.32, 0.12], [0.18, 0.0], [0.32, -0.02], [-0.08, -0.1], [0.06, -0.12]];
			for (const [x, z] of cells) {
				const c = C[Math.floor(R() * 3)];
				k.color(c).box(0.13, 0.06, 0.13, x, 0, z);
				k.color(c).cone(0.075, 0.13, 8, x, 0.06, z);
				k.color(DARK).box(0.025, 0.035, 0.004, x, 0, z + 0.066);
			}
			k.color('#c4a57c').box(0.08, 0.36, 0.08, -0.3, 0, -0.3);
			k.color(DARK).box(0.02, 0.05, 0.004, -0.3, 0.25, -0.259);
		},
		// ------------------------------------------------------------ Hattuşa: Aslanlı Kapı ve sur
		hattusa(k, R) {
			grounds(k, 0.62, '#a7a07c', { ring: 0.86, jit: 0.08 });
			const S = '#9d927e';
			k.grad('#8e8572', '#aba08a', 0, 0.12).box(0.9, 0.12, 0.12, 0, 0, -0.04);
			for (const x of [-0.36, 0.36]) k.color(S).box(0.16, 0.2, 0.18, x, 0, -0.04);
			for (const sx of [-1, 1]) {
				k.color(S).box(0.08, 0.2, 0.16, sx * 0.1, 0, -0.04);
				k.color('#b3a78f').box(0.05, 0.08, 0.06, sx * 0.08, 0.04, 0.06).sphere(0.03, 6, sx * 0.08, 0.13, 0.08);
			}
			k.color(DARK).box(0.12, 0.17, 0.02, 0, 0, 0.02);
			k.color('#a39882').box(1.0, 0.04, 0.3, 0, -0.04, -0.2);
		},
		// ------------------------------------------------------------ Bursa Ulu Camii: 20 kubbe
		bursaulu(k, R) {
			grounds(k, 0.58, '#cfc4ae', { ring: 0.8 });
			const S = '#ddd5c2';
			k.color(S).box(0.6, 0.15, 0.48, 0, -0.02, 0);
			windows(k, 5, -0.24, 0.24, 0.03, 0.241, 0.022, 0.05, 0, true);
			for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) dome(k, 0.05, -0.24 + i * 0.12, 0.13, -0.18 + j * 0.12, 0.8, LEAD, 8);
			for (const sx of [-1, 1]) minaret(k, sx * 0.33, 0.27, 0.42, 0.018, '#e7e0cf', 1);
		},
		// ------------------------------------------------------------ Divriği: taş külahlı cami, taç kapı
		divrigi(k, R) {
			grounds(k, 0.58, '#b8ad98', { ring: 0.8 });
			const S = '#b6a48a';
			k.color(S).box(0.6, 0.16, 0.34, 0, 0, -0.06);
			k.color('#a69378').cyl(0.08, 0.085, 0.04, 8, 0.14, 0.16, -0.1).cone(0.09, 0.14, 8, 0.14, 0.2, -0.1);
			k.color('#c6b496').box(0.2, 0.26, 0.05, 0.06, 0, 0.12);
			k.color(DARK).slab(archShape(0.07, 0.15), 0.02, 0.06, 0.0, 0.14);
			minaret(k, 0.32, 0.04, 0.36, 0.018, '#b9a88e', 1, '#8f8170');
			for (const [x, z] of [[-0.42, 0.24], [0.44, 0.26]]) tree(k, x, z, 1, R);
		},
		// ------------------------------------------------------------ Amasya: kaya mezarları ve Yalıboyu evleri
		amasya(k, R) {
			grounds(k, 0.64, '#a7a383', { ring: 0.86, jit: 0.06 });
			k.grad('#7f7262', '#a39582', 0, 0.6).add(rock(0.5, 0.55, 0.18, 8), new THREE.Matrix4().makeTranslation(0, 0.12, -0.36));
			k.color('#5a4a3e');
			for (const [x, y] of [[-0.25, 0.32], [-0.05, 0.4], [0.18, 0.34]]) k.box(0.1, 0.16, 0.02, x, y, -0.18);
			k.color('#c3b49a');
			for (const [x, y] of [[-0.25, 0.32], [-0.05, 0.4], [0.18, 0.34]]) k.cone(0.07, 0.04, 4, x, y + 0.16, -0.17, Math.PI / 4);
			k.raw(0.2, 0.5, 0.48 + 1.0).box(0.9, 0.006, 0.16, 0, 0.0, 0.1);
			const C = ['#f1e6d0', '#e9c79a', '#f4ede0', '#d8a07a'];
			for (let i = 0; i < 5; i++) {
				const x = -0.36 + i * 0.18;
				k.color('#b5a184').box(0.14, 0.04, 0.1, x, 0, 0.3);
				k.color(C[i % 4]).box(0.15, 0.08, 0.11, x, 0.04, 0.3);
				k.color(ROOF).cone(0.12, 0.06, 4, x, 0.12, 0.3, Math.PI / 4);
			}
		},
		// ------------------------------------------------------------ Alanya Kızıl Kule: sekizgen tuğla kule
		kizilkule(k, R) {
			grounds(k, 0.5, '#bfae90', { ring: 0.8 });
			k.color('#b9a586').cyl(0.2, 0.22, 0.08, 8, 0, 0, 0);
			k.color('#b0533b').cyl(0.17, 0.19, 0.36, 8, 0, 0.08, 0);
			k.color('#9c4532').cyl(0.08, 0.09, 0.12, 8, 0, 0.44, 0);
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2;
				k.color('#a94d37').box(0.05, 0.04, 0.03, Math.cos(a) * 0.17, 0.44, Math.sin(a) * 0.17, -a + Math.PI / 2);
				k.color(DARK).box(0.015, 0.04, 0.004, Math.cos(a) * 0.185, 0.24, Math.sin(a) * 0.185, -a + Math.PI / 2);
			}
			flag(k, 0, 0.56, 0, 0.12, 0.07);
		},
		// ------------------------------------------------------------ Myra: Likya kaya mezarları ve tiyatro
		myra(k, R) {
			grounds(k, 0.62, '#c2b394', { ring: 0.86 });
			k.grad('#9a8a74', '#c4b69c', 0, 0.55).add(rock(0.5, 0.5, 0.2, 6), new THREE.Matrix4().makeTranslation(0, 0.1, -0.34));
			k.color('#d3c4a6');
			for (const [x, y] of [[-0.3, 0.12], [-0.15, 0.2], [0, 0.14], [0.15, 0.24], [0.3, 0.12], [-0.06, 0.32]]) {
				k.box(0.1, 0.09, 0.03, x, y, -0.16);
				k.color('#4a3c32').box(0.05, 0.05, 0.01, x, y + 0.015, -0.142);
				k.color('#d3c4a6');
			}
			for (let i = 0; i < 4; i++) {
				const r = 0.3 - i * 0.05;
				const g = new THREE.CylinderGeometry(r, r, 0.04 * (4 - i), 10, 1, false, Math.PI / 2, Math.PI);
				k.color(i % 2 ? '#d6c7a9' : '#cbbb9c').add(g.translate(0, 0.02 * (4 - i), 0.3));
			}
		},
		// ------------------------------------------------------------ Ahlat: mezar taşları ve kümbet
		ahlat(k, R) {
			grounds(k, 0.62, '#8f9a6a', { ring: 0.86, jit: 0.08 });
			const C = ['#8a7a68', '#9a8a76', '#7e7060'];
			for (let i = 0; i < 18; i++) {
				const x = -0.42 + (i % 6) * 0.15 + (R() - 0.5) * 0.05;
				const z = -0.1 + Math.floor(i / 6) * 0.17 + (R() - 0.5) * 0.04;
				const h = 0.12 + R() * 0.14;
				k.push().move(x, 0, z).rot((R() - 0.5) * 0.15, (R() - 0.5) * 0.3, (R() - 0.5) * 0.1);
				k.color(C[i % 3]).box(0.045, h, 0.015);
				k.pop();
			}
			k.color('#8d7c68').cyl(0.08, 0.085, 0.16, 12, 0.25, 0, -0.32);
			k.color('#7a6b5a').cone(0.09, 0.1, 12, 0.25, 0.16, -0.32);
		},
		// ------------------------------------------------------------ Zeugma: mozaikli villa, sütunlar, Fırat
		zeugma(k, R) {
			grounds(k, 0.6, '#c8b38e', { ring: 0.86 });
			k.raw(0.18, 0.52, 0.55 + 1.0).box(0.9, 0.006, 0.2, 0, 0.0, -0.36);
			k.color('#b98d5e').box(0.4, 0.008, 0.3, 0, 0, 0.05);
			k.color('#e4d3b0').box(0.24, 0.009, 0.16, 0, 0, 0.05);
			k.color('#a96a46').box(0.1, 0.01, 0.07, 0, 0, 0.05);
			k.color('#cdb995');
			for (const [x, z] of [[-0.2, -0.1], [0.2, -0.1], [-0.2, 0.2], [0.2, 0.2], [0, -0.1], [0, 0.2]]) k.cyl(0.014, 0.016, 0.16, 6, x, 0, z);
			k.color('#c2ab86').box(0.5, 0.05, 0.02, 0, 0, -0.14).box(0.02, 0.05, 0.38, -0.25, 0, 0.05);
		},
		// ------------------------------------------------------------ Bergama Akropolü: dik tiyatro, Trajan tapınağı
		bergama(k, R) {
			grounds(k, 0.64, '#b7a684', { ring: 0.86, jit: 0.06 });
			k.grad('#8f8270', '#b4a68d', 0, 0.4).add(rock(0.5, 0.4, 0.42, 9), new THREE.Matrix4().makeTranslation(0, 0.0, -0.1));
			for (let i = 0; i < 6; i++) {
				const r = 0.38 - i * 0.04;
				const g = new THREE.CylinderGeometry(r, r, 0.03, 10, 1, false, Math.PI * 0.62, Math.PI * 0.76);
				k.color(i % 2 ? '#d1c3a6' : '#c3b496').add(g.translate(0.05, 0.03 + i * 0.05, 0.12));
			}
			k.color(MARBLE).box(0.26, 0.03, 0.16, -0.06, 0.38, -0.18);
			for (let i = 0; i < 6; i++) k.color(MARBLE).cyl(0.012, 0.014, 0.13, 6, -0.17 + i * 0.044, 0.41, -0.11);
			k.color('#f2ece0').box(0.26, 0.02, 0.06, -0.06, 0.54, -0.11);
		},
		// ------------------------------------------------------------ Ankara Kalesi: tepede surlar ve evler
		ankarakalesi(k, R) {
			grounds(k, 0.62, '#b4a688', { ring: 0.86, jit: 0.06 });
			k.grad('#867a68', '#a69984', 0, 0.2).add(rock(0.45, 0.2, 0.36, 2), new THREE.Matrix4().makeTranslation(0, 0.0, -0.04));
			const S = '#a29680';
			for (let i = 0; i < 7; i++) {
				const a = (i / 7) * Math.PI * 2;
				const x = Math.cos(a) * 0.3;
				const z = Math.sin(a) * 0.24 - 0.04;
				k.color(S).cyl(0.04, 0.045, 0.22, 5, x, 0.06, z);
			}
			k.color(S).box(0.6, 0.12, 0.03, 0, 0.12, 0.2).box(0.03, 0.12, 0.4, -0.3, 0.12, -0.04).box(0.03, 0.12, 0.4, 0.3, 0.12, -0.04);
			for (const [x, z] of [[-0.1, 0], [0.08, -0.08], [0.0, 0.1]]) {
				k.color('#ece4d3').box(0.08, 0.06, 0.07, x, 0.16, z);
				k.color(ROOF).cone(0.07, 0.04, 4, x, 0.22, z, Math.PI / 4);
			}
			flag(k, 0.12, 0.2, -0.16, 0.18, 0.09);
		},
		// ------------------------------------------------------------ Çanakkale Şehitler Abidesi: dört ayak, kare tabla
		canakkale(k, R) {
			grounds(k, 0.6, '#c9c4b3', { ring: 0.8 });
			const S = '#d9d4c6';
			k.color('#c4beb0').box(0.5, 0.03, 0.5, 0, 0, 0).box(0.42, 0.02, 0.42, 0, 0.03, 0);
			for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.color(S).box(0.09, 0.42, 0.09, sx * 0.1, 0.05, sz * 0.1);
			k.color('#e5e0d3').box(0.36, 0.08, 0.36, 0, 0.47, 0);
			flag(k, -0.36, 0, 0.3, 0.5, 0.18);
			for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [0.42, 0.3]]) cypress(k, x, z, 1.1);
		},
		// ------------------------------------------------------------ Diyarbakır Surları ve On Gözlü Köprü
		diyarbakir(k, R) {
			grounds(k, 0.64, '#7d7a6e', { ring: 0.86 });
			const B = '#4a4744';
			k.color(B).box(0.8, 0.16, 0.06, 0, 0, -0.24);
			for (const x of [-0.36, -0.12, 0.12, 0.36]) {
				k.color('#3f3c3a').cyl(0.07, 0.075, 0.2, 10, x, 0, -0.22);
			}
			k.raw(0.15, 0.45, 0.5 + 1.0).box(0.9, 0.006, 0.14, 0, 0.0, 0.26);
			k.color('#8f8676').slab(facadeShape(0.8, 0.08, Array.from({ length: 10 }, (_, i) => [-0.36 + i * 0.08, 0.05, 0.06, 0])), 0.06, 0, 0, 0.26);
		},
	};
}

/** Yeni yapıların yerleri: [yapı, boylam, enlem, ölçek, dönüş, plaka, 0, yerleşim] (landmarks.js SITES biçimi). */
export const EXTRA_SITES = [
	['sultanahmet', 28.9768, 41.0054, 1.7, 0.05, 34, 0, 'shore'],
	['dolmabahce', 29.0005, 41.0391, 1.5, 0.6, 34, 0, 'shore'],
	['akdamar', 43.0436, 38.3406, 1.5, 0, 65, 0, 'lake'],
	['ani', 43.5725, 40.5075, 1.8, 0, 36],
	['hasankeyf', 41.415, 37.713, 1.8, 0, 72],
	['mardin', 40.735, 37.313, 1.8, 0, 47],
	['harran', 39.03, 36.865, 1.7, 0, 63],
	['hattusa', 34.615, 40.019, 1.8, 0, 19],
	['bursaulu', 29.0617, 40.184, 1.8, 0, 16],
	['divrigi', 38.116, 39.371, 1.75, 0, 58],
	['amasya', 35.832, 40.653, 1.8, 0, 5],
	['kizilkule', 31.997, 36.539, 1.6, 0, 7, 0, 'shore'],
	['myra', 29.985, 36.259, 1.7, 0, 7],
	['ahlat', 42.46, 38.755, 1.75, 0, 13],
	['zeugma', 37.864, 37.057, 1.7, 0, 27],
	['bergama', 27.184, 39.132, 1.8, 0, 35],
	['ankarakalesi', 32.864, 39.941, 1.75, 0, 6],
	['canakkale', 26.221, 40.048, 1.7, 0, 17],
	['diyarbakir', 40.23, 37.91, 1.8, 0, 21],
];
