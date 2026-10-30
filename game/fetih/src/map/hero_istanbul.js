// Kahraman maketler: İstanbul (Ayasofya, Galata Kulesi, Kız Kulesi, Boğaziçi Köprüsü, Dolmabahçe Sarayı).

import * as THREE from 'three';
import { H, COL, wall, block, dome, drumPart, semiDome, minaret, ground, tree, cypress, flag, rockMass, roofHip, openingPts, alem } from './hero_parts.js';
import { sadirvan } from './hero_cami.js';

const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

/** Renkli İstanbul evi: sıvalı gövde, pencere sıraları, kırma kiremit çatı. */
function ev(k, x, z, ry, col, R, { w = 0.11, d = 0.09, h = 0.12, y = 0 } = {}) {
	k.push().move(x, y, z).rot(0, ry, 0);
	block(k, { w, d, h, sides: [2, 1, 2, 1], rows: [[0.12, 0.3], [0.58, 0.3]], ww: 0.018, kind: 'rect', mat: H.PLASTER, col, frame: 0.003, frameCol: '#f3ece0', roof: 'none' });
	roofHip(k, { w, d, h: 0.045, y: h, col: R() < 0.5 ? '#bf5a3e' : '#b04c34', over: 0.012 });
	k.pop();
}

export const ISTANBUL = {
	// ---------------------------------------------------------------- Ayasofya
	*ayasofya(k, R) {
		ground(k, 0.8, { pave: '#cdbf9f', paveR: 0.8, rect: 1 });
		const P = '#dca17a';
		const P2 = '#c98d66';
		const PL = '#e7b28c';
		// gövde: doğu-batı uzun, kat kat kemerli pencere
		block(k, { w: 0.62, d: 0.48, h: 0.2, sides: [7, 4, 7, 4], rows: [[0.1, 0.26], [0.52, 0.28]], ww: 0.028, kind: 'round', mat: H.PLASTER, col: P, frame: 0.004, frameCol: PL, roof: 'flat', roofCol: COL.LEAD2 });
		yield;
		// kuzey ve güneyde dev kademeli payandalar (açıklıklı)
		for (const x of [-0.2, 0.2])
			for (const sz of [-1, 1]) {
				const z = sz * 0.27;
				k.mc(H.PLASTER, P2).flat().box(0.085, 0.31, 0.1, x, 0, z);
				k.mc(H.PLASTER, P).box(0.075, 0.04, 0.09, x, 0.31, z);
				k.mc(H.PLASTER, P2).box(0.065, 0.12, 0.06, x, 0, z + sz * 0.075);
				k.mc(H.PLASTER, P).box(0.07, 0.012, 0.065, x, 0.12, z + sz * 0.075).soft();
				k.push().move(x, 0.06, z + sz * 0.051).rot(0, sz > 0 ? 0 : Math.PI, 0);
				k.mc(H.WIN, '#2a1d16').slab(shape(openingPts('round', 0, 0, 0.035, 0.08)), 0.004, 0, 0, 0);
				k.pop();
			}
		// kubbenin kare kaidesi ve kuzey/güney kemer duvarları (timpan: sıra sıra pencere)
		k.mc(H.PLASTER, P).flat().box(0.4, 0.1, 0.4, 0, 0.2, 0).soft();
		for (const sz of [-1, 1]) {
			const holes = [];
			for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) holes.push({ x: -0.12 + i * 0.06, y: 0.02 + r * 0.055, w: 0.028, h: 0.042, kind: 'round' });
			wall(k, { w: 0.38, h: 0.15, t: 0.02, z: sz * 0.19, ry: sz > 0 ? 0 : Math.PI, y: 0.2, holes, mat: H.PLASTER, col: PL, top: 'round', frame: 0.003 });
		}
		yield;
		// doğu ve batı yarım kubbeleri, köşe eksedraları
		for (const sx of [-1, 1]) {
			k.mc(H.PLASTER, P).flat().box(0.14, 0.08, 0.34, sx * 0.24, 0.2, 0).soft();
			semiDome(k, { r: 0.16, x: sx * 0.17, y: 0.28, z: 0, phi: sx > 0 ? Math.PI / 2 : -Math.PI / 2, sy: 0.55, ribs: 12 });
			for (const sz of [-1, 1]) {
				k.mc(H.PLASTER, P).flat().cyl(0.06, 0.065, 0.05, 10, sx * 0.29, 0.2, sz * 0.09).soft();
				semiDome(k, { r: 0.058, x: sx * 0.29, y: 0.25, z: sz * 0.09, phi: sx > 0 ? Math.PI / 2 : -Math.PI / 2, sy: 0.7, ribs: 6 });
			}
		}
		// kasnak: 40 pencere, aralarında payanda kaburgaları; basık kurşun kubbe
		drumPart(k, { r: 0.18, h: 0.04, y: 0.3, n: k.seg < 1 ? 28 : 40, ww: 0.5, wh: 0.62, col: PL, mat: H.PLASTER });
		dome(k, { r: 0.185, y: 0.34, sy: 0.46, ribs: 40, seg: 44, alemS: 0.8, ringCol: PL });
		yield;
		// dört minare: güneydoğudaki kırmızı tuğla (Fatih), ötekiler beyaz taş
		minaret(k, 0.37, 0.31, { h: 0.6, r: 0.026, balconies: 1, col: '#b8674c', mat: H.BRICK, sides: 12, capH: 0.2 });
		minaret(k, 0.37, -0.31, { h: 0.66, r: 0.019, balconies: 1, col: '#ece4d4', sides: 12, capH: 0.2 });
		yield;
		minaret(k, -0.37, 0.31, { h: 0.72, r: 0.025, balconies: 2, col: '#ece4d4', sides: 12, capH: 0.18 });
		minaret(k, -0.37, -0.31, { h: 0.72, r: 0.025, balconies: 2, col: '#ece4d4', sides: 12, capH: 0.18 });
		yield;
		// avlu: türbe kubbeleri, I. Mahmud şadırvanı, ağaçlar
		for (const [x, z] of [[0.52, 0.12], [0.5, -0.1]]) {
			k.mc(H.ASHLAR, '#e9e1d0').flat().cyl(0.055, 0.058, 0.08, 8, x, 0, z).soft();
			dome(k, { r: 0.054, x, y: 0.08, z, sy: 0.85, ribs: 12, seg: 16, alemS: 0.4, ring: false });
		}
		sadirvan(k, -0.05, 0.45, 0.9);
		for (const [x, z] of [[-0.55, 0.1], [-0.5, -0.38], [0.15, 0.55], [-0.3, 0.55], [0.55, -0.4], [0.32, 0.6]]) tree(k, x, z, 1.15, R);
		cypress(k, -0.6, 0.38, 1.1);
		cypress(k, 0.6, 0.38, 1.1);
	},

	// ---------------------------------------------------------------- Galata Kulesi
	*galata(k, R) {
		ground(k, 0.55, { pave: '#b9ab92', paveR: 0.75 });
		// tepe mahallesi: renkli evler ve dar sokaklar
		const C = ['#e8b07a', '#d77258', '#f0d9a8', '#c99a6b', '#e8c290', '#b7c3a0', '#e3a07a'];
		const H0 = [[-0.27, 0.18, 0.3], [0.26, 0.2, -0.25], [0.27, -0.17, 0.4], [-0.25, -0.22, -0.3], [0.02, 0.33, 0.05], [-0.36, -0.02, 1.4], [0.37, 0.03, -1.5], [-0.12, -0.36, 0.2], [0.15, -0.36, -0.15]];
		H0.forEach(([x, z, ry], i) => ev(k, x, z, ry, C[i % C.length], R, { h: 0.1 + (i % 3) * 0.02 }));
		yield;
		// kule gövdesi: yontma taş, dipte koyu (eski taş), iki kat taş kuşak
		const S = '#c8b394';
		k.mc(H.ASHLAR, '#ad9a7c').uvGeo(2 * Math.PI * 0.15, 0.08).cyl(0.15, 0.155, 0.05, 32, 0, 0, 0);
		k.grad('#a8957a', '#d9c8a6', 0, 0.58);
		k._mat = H.ASHLAR;
		k.uvGeo(2 * Math.PI * 0.14, 0.53).add(new THREE.LatheGeometry([[0.145, 0], [0.14, 0.2], [0.136, 0.4], [0.133, 0.53]].map(([a, b]) => new THREE.Vector2(a, b)), k._n(36)), new THREE.Matrix4().makeTranslation(0, 0.05, 0));
		k.uvBox();
		for (const y of [0.19, 0.38]) k.mc(H.STONE, S, 1.06).cyl(0.142, 0.142, 0.01, 32, 0, y, 0);
		// pencere sıraları: kemerli, kalın duvarda oyuk görünümü (koyu cam + taş çerçeve)
		for (const [y, n, off] of [[0.09, 5, 0], [0.24, 6, 0.3], [0.43, 7, 0.1]])
			for (let i = 0; i < n; i++) {
				const a = off + (i / n) * Math.PI * 2;
				const r = 0.142 - y * 0.012;
				k.push().move(Math.sin(a) * r, y, Math.cos(a) * r).rot(0, a, 0);
				k.mc(H.STONE, '#e6d8bc').slab(shape(openingPts('round', 0, -0.004, 0.032, 0.058)), 0.006, 0, 0, 0);
				k.mc(H.WIN, COL.GLASS).slab(shape(openingPts('round', 0, 0, 0.022, 0.048)), 0.008, 0, 0, 0.001);
				k.pop();
			}
		yield;
		// seyir terası: konsollu korniş, çevre balkon, demir korkuluk
		const yT = 0.58;
		const nC = k._n(28);
		for (let i = 0; i < nC; i++) {
			const a = (i / nC) * Math.PI * 2;
			k.push().move(Math.sin(a) * 0.14, yT - 0.035, Math.cos(a) * 0.14).rot(0, a, 0);
			k.mc(H.STONE, '#e1d3b6').flat().box(0.012, 0.035, 0.03, 0, 0, 0.012).soft();
			k.pop();
		}
		k.mc(H.STONE, '#e3d6bb').cyl(0.175, 0.15, 0.025, 36, 0, yT - 0.01, 0);
		k.mc(H.STONE, '#d6c7a8').cyl(0.176, 0.176, 0.01, 36, 0, yT + 0.015, 0);
		k.mc(H.METAL, '#3a3a3c').cyl(0.172, 0.172, 0.003, 36, 0, yT + 0.048, 0, true);
		const nb = k._n(48);
		for (let i = 0; i < nb; i++) {
			const a = (i / nb) * Math.PI * 2;
			k.mc(H.METAL, '#3a3a3c').box(0.0025, 0.03, 0.0025, Math.sin(a) * 0.172, yT + 0.02, Math.cos(a) * 0.172);
		}
		// galeri katı: kemerli pencere halkası (gerçek oyuk), korniş, kurşun külah
		drumPart(k, { r: 0.118, h: 0.12, y: yT + 0.02, n: 12, ww: 0.55, wh: 0.72, col: '#d4c4a3', buttress: false });
		k.mc(H.STONE, '#e0d2b4').cyl(0.13, 0.12, 0.02, 32, 0, yT + 0.14, 0);
		k.mc(H.LEAD, COL.LEAD2).uvGeo(24, 6).add(new THREE.LatheGeometry([[0.132, 0], [0.124, 0.03], [0.1, 0.11], [0.068, 0.2], [0.034, 0.28], [0.006, 0.335], [0, 0.34]].map(([a, b]) => new THREE.Vector2(a, b)), k._n(36)), new THREE.Matrix4().makeTranslation(0, yT + 0.16, 0));
		k.uvBox();
		k.mc(H.GOLD, COL.GOLD).cyl(0.003, 0.004, 0.06, 6, 0, yT + 0.5, 0).sphere(0.01, 8, 0, yT + 0.56, 0);
		yield;
		tree(k, -0.42, 0.25, 1, R);
		tree(k, 0.42, -0.3, 1, R);
		cypress(k, 0.4, 0.3, 1);
	},

	// ---------------------------------------------------------------- Kız Kulesi (deniz içinde)
	*kizkulesi(k, R) {
		rockMass(k, { rx: 0.3, ry: 0.08, rz: 0.2, x: 0, y: -0.03, z: 0, seed: 7, col: '#6c665c', col2: '#948c7c', amp: 0.2, freq: 2.2 });
		// rıhtım ve taş platform
		k.mc(H.ASHLAR, '#b5ab98').flat().cyl(0.21, 0.23, 0.04, 12, 0, -0.02, 0).soft();
		k.mc(H.PAVE, '#cfc6b4').cyl(0.205, 0.205, 0.002, 24, 0, 0.02, 0);
		const W = '#f3eee4';
		// ana yapı: tek kat, kemerli pencereler, düz dam, köşede kubbecik
		block(k, { w: 0.2, d: 0.13, h: 0.09, x: -0.03, y: 0.02, sides: [3, 2, 3, 2], rows: [[0.2, 0.55]], ww: 0.02, kind: 'round', mat: H.PLASTER, col: W, frame: 0.003, frameCol: '#d8cfc0', roof: 'flat', roofCol: '#8d96a3' });
		dome(k, { r: 0.035, x: -0.1, y: 0.115, z: 0.0, sy: 0.85, ribs: 10, seg: 14, alemS: 0.35, ring: false });
		yield;
		// kule: kare gövde, üstte yuvarlak fener, kurşun külah, bayrak
		const tx = 0.07;
		block(k, { w: 0.08, d: 0.08, h: 0.2, x: tx, y: 0.02, sides: [1, 1, 1, 1], rows: [[0.35, 0.15], [0.7, 0.15]], ww: 0.018, kind: 'round', mat: H.PLASTER, col: W, frame: 0.003, frameCol: '#d8cfc0', roof: 'none' });
		k.mc(H.STONE, '#e4ddcf').box(0.09, 0.01, 0.09, tx, 0.22, 0);
		k.mc(H.METAL, '#3a3a3c').cyl(0.044, 0.044, 0.003, 16, tx, 0.255, 0, true);
		drumPart(k, { r: 0.03, h: 0.06, x: tx, y: 0.23, n: 8, ww: 0.55, wh: 0.7, col: W, mat: H.PLASTER, buttress: false });
		k.mc(H.LEAD, COL.LEAD2).uvGeo(12, 3).add(new THREE.ConeGeometry(0.038, 0.1, k._n(16), 3, true).translate(0, 0.05, 0), new THREE.Matrix4().makeTranslation(tx, 0.29, 0));
		k.uvBox();
		alem(k, tx, 0.385, 0, 0.45, false);
		flag(k, -0.14, 0.11, -0.04, 0.12, 0.07);
		// iskele
		k.mc(H.WOOD, '#7b5a3f').flat().box(0.05, 0.01, 0.1, -0.02, 0.0, 0.22).soft();
	},

	// ---------------------------------------------------------------- Boğaziçi (15 Temmuz Şehitler) Köprüsü
	*kopru(k, R) {
		const L = 0.95;
		const G = '#d4d9df';
		const yd = 0.12;
		// kuleler: iki ayak, üç kiriş (portal), tabanda ayak
		for (const x of [-L / 2, L / 2]) {
			for (const z of [-0.052, 0.052]) {
				k.mc(H.METAL, G).flat().add(new THREE.CylinderGeometry(0.009, 0.014, 0.56, 4, 1).rotateY(Math.PI / 4).scale(1.2, 1, 0.9).translate(0, 0.28, 0), new THREE.Matrix4().makeTranslation(x, -0.08, z));
			}
			for (const y of [0.1, 0.27, 0.44]) k.mc(H.METAL, G).box(0.022, 0.026, 0.11, x, y, 0);
			k.mc(H.ASHLAR, '#a49d92').box(0.06, 0.08, 0.14, x, -0.1, 0);
			k.soft();
		}
		yield;
		// tabliye: aerodinamik kutu kiriş, asfalt yol, şerit çizgisi, korkuluk
		const DL = L + 0.42;
		k.mc(H.METAL, '#b9bfc6').flat().box(DL, 0.014, 0.07, 0, yd, 0);
		k.mc(H.METAL, '#9aa1a9').box(DL, 0.006, 0.085, 0, yd + 0.014, 0);
		k.mc(H.STONE, '#3d4045').box(DL, 0.002, 0.07, 0, yd + 0.02, 0);
		k.mc(H.STONE, '#e8e2c8');
		for (let i = 0; i < 30; i++) k.box(0.02, 0.001, 0.002, -DL / 2 + (i + 0.5) * (DL / 30), yd + 0.0221, 0);
		k.mc(H.METAL, '#c7ccd2');
		for (const z of [-0.04, 0.04]) k.box(DL, 0.006, 0.002, 0, yd + 0.022, z);
		k.soft();
		// taşıyıcı ana kablolar (zincir eğrisi) ve eğik askılar (zikzak: Boğaziçi Köprüsü'nün imzası)
		const top = 0.47;
		const sag = (x) => top - 0.3 * (1 - ((2 * x) / L) ** 2);
		const seg = k._n(36);
		for (const z of [-0.052, 0.052]) {
			const pts = [];
			for (let i = 0; i <= seg; i++) {
				const x = -L / 2 + (i / seg) * L;
				pts.push(new THREE.Vector3(x, sag(x), z));
			}
			k.mc(H.METAL, '#aeb5bd').add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, 0.004, 5, false));
			// yan açıklıklar: kuleden ankraja
			for (const s of [-1, 1]) {
				const a = new THREE.Vector3((s * L) / 2, top, z);
				const b = new THREE.Vector3(s * (L / 2 + 0.24), yd + 0.02, z);
				k.add(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, 0.004, 5, false));
			}
			const nh = k._n(26);
			for (let i = 1; i < nh; i++) {
				const x0 = -L / 2 + (i / nh) * L;
				const dx = (i % 2 ? 1 : -1) * 0.018;
				const a = new THREE.Vector3(x0, sag(x0) - 0.002, z);
				const b = new THREE.Vector3(x0 + dx, yd + 0.016, z);
				k.mc(H.METAL, '#c9ced4').add(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, 0.0012, 3, false));
			}
		}
		yield;
		// kıyıdaki ankraj blokları ve yaklaşım ayakları
		for (const s of [-1, 1]) {
			k.mc(H.ASHLAR, '#9d968b').flat().box(0.08, 0.14, 0.12, s * (L / 2 + 0.25), -0.02, 0).soft();
			for (const dx of [0.08, 0.16]) k.mc(H.ASHLAR, '#a7a095').flat().box(0.03, yd + 0.02, 0.05, s * (L / 2 + dx), -0.02, 0).soft();
		}
	},

	// ---------------------------------------------------------------- Dolmabahçe Sarayı
	*dolmabahce(k, R) {
		ground(k, 0.72, { pave: '#d8d1c0', paveR: 0.86, rz: 0.62, rect: 1 });
		const W = '#f3eee4';
		const W2 = '#e6dfd0';
		const zc = -0.04;
		// uzun cephe: iki kat, kat başına 14 pencere, aralarında yarım sütunlar (pilastr)
		block(k, { w: 0.9, d: 0.17, h: 0.14, z: zc, sides: [14, 2, 14, 2], rows: [[0.1, 0.32], [0.56, 0.3]], ww: 0.022, kind: 'seg', mat: H.MARBLE, col: W, frame: 0.004, frameCol: '#ffffff', roof: 'flat', roofCol: '#9aa4b0' });
		k.mc(H.MARBLE, W2).flat();
		for (let i = 0; i <= 14; i++) {
			const x = -0.45 + (i / 14) * 0.9;
			k.box(0.008, 0.14, 0.008, x, 0, zc + 0.088);
		}
		k.box(0.92, 0.012, 0.19, 0, 0.14, zc).box(0.92, 0.008, 0.19, 0, 0.068, zc);
		// çatı korkuluğu (babalar)
		for (let i = 0; i < 46; i++) k.mc(H.MARBLE, W).box(0.004, 0.016, 0.004, -0.45 + (i + 0.5) * (0.9 / 46), 0.152, zc + 0.09);
		k.box(0.9, 0.004, 0.006, 0, 0.168, zc + 0.09);
		k.soft();
		yield;
		// Muayede Salonu: orta çıkıntı, yüksek kemerli pencereler, büyük kubbe
		block(k, { w: 0.26, d: 0.25, h: 0.21, z: zc - 0.01, sides: [4, 3, 4, 3], rows: [[0.12, 0.3], [0.55, 0.32]], ww: 0.03, kind: 'round', mat: H.MARBLE, col: W, frame: 0.005, frameCol: '#ffffff', roof: 'flat', roofCol: '#9aa4b0' });
		for (const x of [-0.11, -0.04, 0.04, 0.11]) k.mc(H.MARBLE, '#fbf8f2').cyl(0.008, 0.009, 0.19, 10, x, 0.0, zc + 0.13);
		k.mc(H.MARBLE, W2).flat().box(0.28, 0.02, 0.27, 0, 0.21, zc - 0.01).soft();
		k.mc(H.MARBLE, W).cyl(0.105, 0.11, 0.03, 24, 0, 0.23, zc - 0.01);
		dome(k, { r: 0.105, y: 0.26, z: zc - 0.01, sy: 0.72, ribs: 24, seg: 32, alemS: 0.6, col: '#a3aebb', ringCol: W });
		flag(k, 0.36, 0.17, zc, 0.12, 0.07);
		yield;
		// Saltanat kapısı ve deniz cephesi: mermer rıhtım, süslü demir parmaklık, kapılar
		const zq = 0.2;
		k.mc(H.MARBLE, '#ebe5d8').flat().box(1.1, 0.012, 0.08, 0, 0, zq).soft();
		k.mc(H.METAL, '#2f3338');
		for (let i = 0; i < 70; i++) k.box(0.002, 0.03, 0.002, -0.52 + (i / 69) * 1.04, 0.012, zq + 0.03);
		k.box(1.04, 0.003, 0.003, 0, 0.04, zq + 0.03);
		for (const x of [-0.36, 0, 0.36]) {
			wall(k, { w: 0.08, h: 0.09, t: 0.02, x, y: 0.012, z: zq + 0.03, holes: [{ x: 0, y: 0, w: 0.045, h: 0.07, kind: 'round' }], mat: H.MARBLE, col: '#fbf8f1', glass: false });
			k.mc(H.GOLD, COL.GOLD).box(0.03, 0.006, 0.004, x, 0.09, zq + 0.042);
		}
		// saat kulesi (dört katlı, kubbecikli)
		const cx = 0.5;
		const cz = 0.06;
		block(k, { w: 0.05, d: 0.05, h: 0.17, x: cx, z: cz, sides: [1, 1, 1, 1], rows: [[0.2, 0.2], [0.55, 0.2]], ww: 0.014, kind: 'round', mat: H.MARBLE, col: W, roof: 'none' });
		k.mc(H.MARBLE, W2).box(0.058, 0.008, 0.058, cx, 0.17, cz);
		k.mc(H.MARBLE, W).box(0.04, 0.04, 0.04, cx, 0.178, cz);
		for (let i = 0; i < 4; i++) {
			const a = (i * Math.PI) / 2;
			k.mc(H.MARBLE, '#ffffff').cyl(0.012, 0.012, 0.002, 16, cx + Math.sin(a) * 0.021, 0.198, cz + Math.cos(a) * 0.021);
		}
		dome(k, { r: 0.022, x: cx, y: 0.218, z: cz, ribs: 8, seg: 12, alemS: 0.3, ring: false, col: '#a3aebb' });
		yield;
		for (const [x, z] of [[-0.55, -0.25], [0.55, -0.26], [-0.3, -0.3], [0.25, -0.3], [-0.58, 0.05], [0.0, -0.32]]) tree(k, x, z, 1.15, R);
		for (const [x, z] of [[-0.45, 0.1], [0.45, 0.12]]) cypress(k, x, z, 1);
	},
};
