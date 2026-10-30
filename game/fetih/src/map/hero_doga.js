// Kahraman maketler: doğa ve kent dokusu, anıtlar (Kapadokya, Uzungöl, Safranbolu, Harran, Ahlat, Akdamar, Anıtkabir,
// İzmir Saat Kulesi, Çanakkale Şehitler Abidesi). Pamukkale, Sümela, Mardin ve Hasankeyf v1.0'da hero_yeni.js'te.

import * as THREE from 'three';
import { H, COL, block, dome, drumPart, minaret, ground, tree, cypress, pine, flag, rockMass, roofGable, konak, curtain, openingPts, alem, stairs, vn3 } from './hero_parts.js';
import { sadirvan } from './hero_cami.js';

const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

/** Sıcak hava balonu: dilimli zarf (iki renk), etek, sepet, ipler, ocak alevi; grup: süzülme (shader). */
function balloon(k, x, y, z, r, a, b, grp) {
	k.group(grp);
	const prof = [[0.24, -0.92], [0.5, -0.74], [0.78, -0.42], [0.95, -0.06], [0.98, 0.22], [0.88, 0.52], [0.66, 0.8], [0.36, 0.96], [0.0, 1.0]].map(([rr, yy]) => new THREE.Vector2(rr * r, yy * r * 1.12));
	const n = k.seg < 1 ? 12 : 16;
	for (let i = 0; i < n; i++) {
		const g = new THREE.LatheGeometry(prof, 3, (i / n) * Math.PI * 2, (Math.PI * 2) / n);
		k.mc(H.CLOTH, i % 2 ? a : b).add(g, new THREE.Matrix4().makeTranslation(x, y, z));
	}
	k.mc(H.CLOTH, b).add(new THREE.CylinderGeometry(0.24 * r, 0.2 * r, 0.16 * r, 12, 1, true), new THREE.Matrix4().makeTranslation(x, y - r * 1.12, z));
	const by = y - r * 1.12 - 0.42 * r;
	k.mc(H.WOOD, '#7a5230').box(0.2 * r, 0.16 * r, 0.2 * r, x, by, z);
	for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.mc(H.WOOD, '#5b4636').box(0.008, 0.3 * r, 0.008, x + dx * 0.09 * r, by + 0.14 * r, z + dz * 0.09 * r);
	k.mc(H.FLAME, '#ffb347').cone(0.05 * r, 0.16 * r, 5, x, by + 0.2 * r, z);
	k.group(0);
}

/** Peri bacası: geniş taban, incelen boyun, bazalt şapka; kayaya oyulmuş kapı ve pencereler. */
function chimney(k, x, z, h, r, cap, R) {
	const pts = [[r * 1.45, -0.04], [r * 1.25, 0.0], [r * 1.02, h * 0.16], [r * 0.82, h * 0.4], [r * 0.64, h * 0.62], [r * 0.5, h * 0.8], [r * 0.42, h * 0.9]];
	if (cap) pts.push([r * 0.38, h * 0.92], [0, h * 0.93]);
	else pts.push([r * 0.24, h * 0.98], [0, h * 1.03]);
	const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), k._n(16));
	g.deleteAttribute('normal');
	const m = (() => {
		const q = g.clone();
		const p = q.getAttribute('position');
		for (let i = 0; i < p.count; i++) {
			const f = 1 + 0.08 * (vn3(p.getX(i) * 30 + x * 9, p.getY(i) * 12, p.getZ(i) * 30) - 0.5);
			p.setX(i, p.getX(i) * f);
			p.setZ(i, p.getZ(i) * f);
		}
		q.computeVertexNormals();
		return q;
	})();
	g.dispose();
	k.grad('#cc9a79', '#f2e2c4', 0, h);
	k._mat = H.TRAV;
	k.add(m, new THREE.Matrix4().makeTranslation(x, 0, z));
	if (cap) {
		const c = new THREE.LatheGeometry([[0.0, -0.004], [r * 1.0, -0.004], [r * 1.3, 0.016], [r * 1.12, 0.04], [r * 0.62, 0.06], [0, 0.066]].map(([a, b]) => new THREE.Vector2(a, b)), k._n(14));
		k.mc(H.ROCK, R() < 0.5 ? '#8f7565' : '#7d6658').add(c, new THREE.Matrix4().makeTranslation(x, h * 0.92, z));
	}
	const nw = h > 0.4 ? 3 : 1;
	for (let i = 0; i < nw; i++) {
		const yy = h * (0.12 + i * 0.22);
		const rr = r * (1.05 - (yy / h) * 0.75);
		const a = (R() - 0.5) * 1.4;
		k.push().move(x + Math.sin(a) * rr, yy, z + Math.cos(a) * rr).rot(0, a, 0);
		k.mc(H.WIN, '#2b1d14').slab(shape(openingPts(i ? 'rect' : 'round', 0, 0, i ? 0.018 : 0.024, i ? 0.02 : 0.04)), 0.02, 0, 0, 0);
		k.pop();
	}
}

export const DOGA = {
	// ---------------------------------------------------------------- Kapadokya: peri bacaları, Uçhisar, balonlar
	*peri(k, R) {
		ground(k, 0.82, { pave: '#dcc29a', paveR: 0.5, jit: 0.08, mid: '#d2b68e', midMat: H.DIRT });
		// Güllüdere sırtları: pembe-krem katmanlı aşınmış tüf
		for (const [x, z, rx, ry, rz, s] of [[-0.05, -0.58, 0.45, 0.24, 0.15, 3], [0.45, -0.4, 0.28, 0.18, 0.13, 7], [-0.52, -0.22, 0.24, 0.15, 0.11, 11]]) rockMass(k, { rx, ry, rz, x, y: ry * 0.2, z, seed: s, col: '#c98e74', col2: '#f0dcbc', amp: 0.2, mat: H.TRAV });
		yield;
		// Uçhisar kayası: içi oyulmuş kale, pencereler, tepede bayrak
		const ux = -0.34;
		const uz = -0.36;
		rockMass(k, { rx: 0.18, ry: 0.34, rz: 0.17, x: ux, y: 0.28, z: uz, seed: 5, col: '#cfa483', col2: '#f0e1c3', amp: 0.16, mat: H.TRAV });
		for (let i = 0; i < 18; i++) {
			const y = 0.08 + (i % 9) * 0.06 + R() * 0.02;
			const rr = 0.18 - (y / 0.62) * 0.07;
			const a = -1.0 + (i / 18) * 2.0 + (R() - 0.5) * 0.2;
			k.push().move(ux + Math.sin(a) * rr, y, uz + Math.cos(a) * rr).rot(0, a, 0);
			k.mc(H.WIN, '#2b1d14').slab(shape(openingPts(i % 3 ? 'rect' : 'round', 0, 0, 0.02, 0.028)), 0.03, 0, 0, 0);
			k.pop();
		}
		flag(k, ux, 0.62, uz, 0.14, 0.08);
		yield;
		// peri bacaları (Paşabağ ve Göreme)
		const list = [[0.02, 0.02, 0.62, 0.075, 1], [0.2, 0.14, 0.46, 0.065, 1], [-0.16, 0.12, 0.52, 0.07, 1], [0.1, -0.2, 0.56, 0.07, 1], [-0.08, 0.32, 0.36, 0.06, 1], [0.34, -0.06, 0.42, 0.06, 1], [0.38, 0.28, 0.32, 0.055, 1], [-0.36, 0.18, 0.4, 0.06, 0], [0.22, 0.4, 0.28, 0.05, 0], [-0.22, -0.06, 0.34, 0.055, 0], [0.52, 0.1, 0.3, 0.05, 1], [-0.5, 0.36, 0.26, 0.05, 0]];
		for (const [x, z, h, r, cap] of list) chimney(k, x, z, h, r, !!cap, R);
		yield;
		// kayısı bahçeleri ve üzüm bağı sıraları
		for (let i = 0; i < 9; i++) {
			const a = R() * Math.PI * 2;
			const rr = 0.5 + R() * 0.2;
			tree(k, Math.cos(a) * rr, Math.sin(a) * rr * 0.9 + 0.08, 0.85, R);
		}
		for (let i = 0; i < 5; i++) k.mc(H.LEAF, '#6f8f3a').flat().box(0.2, 0.012, 0.012, 0.45, 0, 0.42 + i * 0.03).soft();
		// balonlar: gün doğumu gibi renk renk, farklı yüksekliklerde
		const cols = [['#e63946', '#f1c453'], ['#2a9df4', '#ffffff'], ['#ff7b00', '#7b2cbf'], ['#06d6a0', '#ef476f'], ['#ffd166', '#118ab2'], ['#f72585', '#4cc9f0'], ['#8ac926', '#ff595e']];
		const pos = [[0.14, 1.45, 0.3, 0.15], [-0.62, 1.9, -0.05, 0.14], [0.66, 1.25, -0.4, 0.13], [-0.2, 2.35, -0.6, 0.14], [0.62, 2.05, 0.42, 0.12], [-0.66, 1.05, 0.55, 0.11], [0.05, 2.75, -0.15, 0.12]];
		for (let i = 0; i < pos.length; i++) {
			const [x, y, z, r] = pos[i];
			balloon(k, x, y, z, r * 1.25, cols[i][0], cols[i][1], i + 1);
		}
	},

	// ---------------------------------------------------------------- Uzungöl
	*uzungol(k, R) {
		ground(k, 0.7, { pave: '#6a9a50', paveR: 0.2, mid: '#5d9447' });
		k.mc(H.WATER, '#2c7f8e').cyl(0.4, 0.4, 0.004, 40, 0.05, 0.001, -0.06);
		// kıyıdaki beyaz cami: kubbe, tek minare
		block(k, { w: 0.16, d: 0.14, h: 0.1, x: -0.28, z: 0.36, sides: [3, 2, 3, 2], rows: [[0.25, 0.5]], ww: 0.02, kind: 'round', mat: H.PLASTER, col: '#f4f0e7', frame: 0.003, roof: 'flat' });
		dome(k, { r: 0.065, x: -0.28, y: 0.11, z: 0.36, sy: 0.85, ribs: 14, seg: 18, alemS: 0.45 });
		minaret(k, -0.17, 0.42, { h: 0.34, r: 0.014, balconies: 1, col: '#f4f0e7', mat: H.PLASTER, sides: 12, capH: 0.24 });
		yield;
		// ahşap dağ evleri (Karadeniz yayla evi)
		for (const [x, z, ry] of [[0.38, 0.3, 0.2], [0.46, 0.06, -0.3], [-0.44, -0.12, 0.4], [0.2, 0.46, 0.0]]) {
			k.push().move(x, 0, z).rot(0, ry, 0);
			k.mc(H.ASHLAR, '#9a917e').flat().box(0.12, 0.04, 0.1, 0, 0, 0);
			k.mc(H.WOOD, '#8a5a34').box(0.13, 0.08, 0.11, 0, 0.04, 0);
			for (const dx of [-0.03, 0.03]) {
				k.mc(H.WIN, COL.GLASS).box(0.02, 0.03, 0.003, dx, 0.065, 0.056);
				k.mc(H.WOOD, '#5f3d22').box(0.026, 0.004, 0.004, dx, 0.064, 0.057);
			}
			k.soft();
			roofGable(k, { w: 0.15, d: 0.13, h: 0.05, y: 0.12, col: '#8b8f95' });
			k.pop();
		}
		yield;
		// çam ormanı ve dağ yamacı (arkada)
		rockMass(k, { rx: 0.6, ry: 0.32, rz: 0.2, y: 0, z: -0.6, seed: 61, col: '#4f6a3e', col2: '#6f8a56', mat: H.GRASS, amp: 0.2 });
		for (let i = 0; i < 18; i++) {
			const x = -0.6 + (i % 9) * 0.15 + (R() - 0.5) * 0.06;
			const z = -0.42 - Math.floor(i / 9) * 0.12 + (R() - 0.5) * 0.04;
			pine(k, x, z, 1 + R() * 0.3, 0.05 + Math.floor(i / 9) * 0.1, R);
		}
		for (const [x, z] of [[-0.5, 0.42], [0.55, 0.42], [-0.58, 0.18]]) pine(k, x, z, 1.1, 0, R);
	},

	// ---------------------------------------------------------------- Safranbolu evleri
	*safranbolu(k, R) {
		ground(k, 0.72, { pave: '#a8a089', paveR: 0.75 });
		// arnavut kaldırımlı yokuşta konaklar: taş zemin kat, çıkmalı beyaz üst katlar, ahşap çatkı, kiremit
		const houses = [[-0.26, 0.16, 0.2, 1, 2], [0.2, 0.22, -0.3, 1.05, 2], [0.06, -0.2, 0.5, 1, 2], [-0.34, -0.24, -0.1, 0.95, 1], [0.42, -0.06, 0.2, 0.95, 2], [-0.02, 0.42, 0.05, 0.85, 1], [-0.5, 0.0, 0.6, 0.85, 1], [0.32, -0.36, -0.2, 0.9, 1]];
		for (const [x, z, ry, s, f] of houses) {
			konak(k, { x, z, ry, s, floors: f, R, plaster: R() < 0.7 ? '#f7f2e6' : '#f1dfb8' });
			yield;
		}
		// Köprülü Mehmet Paşa Camii ve Cinci Han
		block(k, { w: 0.16, d: 0.14, h: 0.1, x: 0.45, z: 0.32, sides: [3, 2, 3, 2], rows: [[0.25, 0.5]], ww: 0.02, kind: 'pointed', col: '#efe6d2', frame: 0.003, roof: 'flat' });
		dome(k, { r: 0.068, x: 0.45, y: 0.11, z: 0.32, sy: 0.85, ribs: 14, seg: 18, alemS: 0.45 });
		minaret(k, 0.56, 0.42, { h: 0.34, r: 0.015, balconies: 1, col: '#efe6d2', sides: 12, capH: 0.22 });
		block(k, { w: 0.24, d: 0.2, h: 0.12, x: -0.12, z: -0.46, sides: [6, 4, 6, 4], rows: [[0.2, 0.3], [0.6, 0.28]], ww: 0.016, kind: 'round', col: '#c9b68f', roof: 'flat', roofCol: '#a85a40' });
		for (const [x, z] of [[-0.6, 0.3], [0.0, 0.1], [-0.56, -0.44], [0.6, -0.3]]) tree(k, x, z, 1.1, R);
	},

	// ---------------------------------------------------------------- Harran kümbet evleri
	*harran(k, R) {
		ground(k, 0.74, { pave: '#d2b78b', paveR: 0.75, midMat: H.DIRT, mid: '#ccb084' });
		// konik kerpiç kubbeli evler (bindirme kubbe): kare oda + sivri kubbe, kümeler halinde, avlu duvarları
		const C = ['#dcc199', '#d2b386', '#e3cba3'];
		const clusters = [[-0.3, 0.18], [0.1, 0.22], [-0.16, -0.12], [0.3, -0.08]];
		let n = 0;
		for (const [cx, cz] of clusters) {
			for (let i = 0; i < 2; i++)
				for (let j = 0; j < 2; j++) {
					const x = cx + i * 0.11;
					const z = cz + j * 0.11;
					const c = C[Math.floor(R() * 3)];
					k.mc(H.PLASTER, c).flat().box(0.1, 0.05, 0.1, x, 0, z).soft();
					const g = new THREE.LatheGeometry([[0.06, 0], [0.058, 0.03], [0.05, 0.07], [0.035, 0.105], [0.014, 0.13], [0.006, 0.138], [0, 0.14]].map(([a, b]) => new THREE.Vector2(a, b)), k._n(16));
					k.mc(H.PLASTER, c).add(g, new THREE.Matrix4().makeTranslation(x, 0.05, z));
					// bacası ve dar penceresi
					k.mc(H.WIN, '#2a1d12').box(0.024, 0.035, 0.004, x, 0.0, z + 0.051);
					k.mc(H.PLASTER, c, 0.95).cyl(0.006, 0.006, 0.012, 6, x, 0.19, z);
					if (++n % 4 === 0) yield;
				}
			curtain(k, cx - 0.07, cz + 0.19, cx + 0.19, cz + 0.19, { h: 0.04, t: 0.016, col: '#d4b98e', mat: H.PLASTER, slits: false });
		}
		// Harran Ulu Camii'nin kare minaresi (yıkık) ve kale kalıntısı
		k.mc(H.ASHLAR, '#c8a87e').flat().box(0.09, 0.42, 0.09, -0.42, 0, -0.38);
		for (let i = 0; i < 3; i++) {
			k.push().move(-0.42, 0.12 + i * 0.1, -0.334);
			k.mc(H.WIN, '#2a1d12').slab(shape(openingPts('pointed', 0, 0, 0.02, 0.05)), 0.004, 0, 0, 0);
			k.pop();
		}
		k.mc(H.ASHLAR, '#bf9e74').box(0.07, 0.05, 0.07, -0.42, 0.42, -0.38).soft();
		for (const [x, z] of [[0.55, 0.42], [-0.6, 0.35]]) tree(k, x, z, 0.9, R, 0, '#7d8f45');
	},

	// ---------------------------------------------------------------- Ahlat Selçuklu Meydan Mezarlığı
	*ahlat(k, R) {
		ground(k, 0.78, { pave: '#8f9a6a', paveR: 0.2, mid: '#8c9866', jit: 0.08 });
		// sıra sıra yüksek mezar taşları (oyma bezemeli, yosun tutmuş), eğik duranlar
		const C = ['#8a7a68', '#9a8a76', '#7e7060', '#a08c74'];
		let n = 0;
		for (let r = 0; r < 4; r++)
			for (let i = 0; i < 8; i++) {
				const x = -0.5 + i * 0.14 + (R() - 0.5) * 0.05;
				const z = -0.22 + r * 0.17 + (R() - 0.5) * 0.04;
				const h = 0.1 + R() * 0.16;
				k.push().move(x, 0, z).rot((R() - 0.5) * 0.2, (R() - 0.5) * 0.4, (R() - 0.5) * 0.12);
				const c = C[(i + r) % 4];
				k.mc(H.CARVE, c).flat().box(0.05, h, 0.016, 0, 0, 0);
				k.mc(H.ROCK, c, 0.95).box(0.056, 0.012, 0.022, 0, 0, 0);
				// yuvarlak tepe (sivri kemerli alın)
				k.mc(H.CARVE, c).slab(shape(openingPts('pointed', 0, 0, 0.05, 0.03)), 0.016, 0, h, 0);
				// yatay sanduka taşı
				if (R() < 0.4) k.mc(H.ASHLAR, '#8e8070').box(0.04, 0.025, 0.1, 0, 0, 0.065);
				k.soft();
				k.pop();
				if (++n % 8 === 0) yield;
			}
		// Ulu Kümbet: silindir gövde, kabartma kuşak, konik külah; arkada ikinci kümbet
		for (const [x, z, s] of [[0.32, -0.42, 1.2], [-0.4, -0.46, 0.9]]) {
			k.mc(H.ASHLAR, '#8d7c68').flat().cyl(0.07 * s, 0.074 * s, 0.14 * s, 12, x, 0, z).soft();
			k.mc(H.CARVE, '#9a8874').cyl(0.072 * s, 0.072 * s, 0.025 * s, 12, x, 0.11 * s, z);
			k.mc(H.ASHLAR, '#7a6b5a').cone(0.078 * s, 0.11 * s, 12, x, 0.14 * s, z);
			k.push().move(x, 0, z + 0.07 * s);
			k.mc(H.WIN, '#2a221c').slab(shape(openingPts('pointed', 0, 0, 0.024 * s, 0.05 * s)), 0.004, 0, 0.02, 0);
			k.pop();
		}
		for (const [x, z] of [[0.6, 0.4], [-0.62, 0.38]]) tree(k, x, z, 0.9, R, 0, '#6f8a45');
	},

	// ---------------------------------------------------------------- Akdamar Kilisesi (Van Gölü'nde ada)
	*akdamar(k, R) {
		rockMass(k, { rx: 0.5, ry: 0.13, rz: 0.36, y: -0.04, seed: 3, col: '#8e8370', col2: '#b3a68e', amp: 0.2, freq: 1.8 });
		k.mc(H.GRASS, '#8d9a62').flat().cyl(0.28, 0.3, 0.004, 14, 0, 0.06, 0.02).soft();
		const S = '#c98f6e';
		const S2 = '#b97c5c';
		const y = 0.06;
		// haç planlı kilise: dört kol, yarım yuvarlak apsisler, kabartma kuşağı
		for (const [w, d] of [[0.26, 0.14], [0.14, 0.3]]) k.mc(H.ASHLAR, S).uvS(1.2).flat().box(w, 0.13, d, 0, y, 0).soft();
		for (const [x, z] of [[0.13, 0], [-0.13, 0], [0, 0.15], [0, -0.15]]) k.mc(H.ASHLAR, S).cyl(0.058, 0.058, 0.12, 14, x, y, z, false);
		k.mc(H.CARVE, '#d6a382').cyl(0.073, 0.073, 0.02, 14, 0.13, y + 0.08, 0).cyl(0.073, 0.073, 0.02, 14, -0.13, y + 0.08, 0);
		k.mc(H.CARVE, '#d6a382').flat().box(0.27, 0.02, 0.15, 0, y + 0.09, 0).box(0.15, 0.02, 0.31, 0, y + 0.09, 0).soft();
		for (const [w, d, ry] of [[0.26, 0.14, 0], [0.3, 0.14, Math.PI / 2]]) roofGable(k, { w, d, h: 0.045, y: y + 0.13, ry, col: S2 });
		k.uvS(1);
		// ortada on altı yüzlü yüksek kasnak ve konik külah
		drumPart(k, { r: 0.058, h: 0.1, y: y + 0.13, n: 16, ww: 0.35, wh: 0.55, col: S, buttress: false });
		k.mc(H.ASHLAR, S2).flat().cone(0.068, 0.09, 16, 0, y + 0.23, 0).soft();
		k.mc(H.ASHLAR, '#c08768').flat().box(0.12, 0.08, 0.1, 0, y, -0.22).soft();
		yield;
		// badem ağaçları ve iskele
		for (const [x, z] of [[-0.3, 0.14], [0.3, -0.16], [0.26, 0.18], [-0.24, -0.18]]) tree(k, x, z, 0.85, R, 0.06, '#7fa05a');
		k.mc(H.WOOD, '#7b5a3f').flat().box(0.05, 0.008, 0.16, 0.2, 0.0, 0.34).soft();
	},

	// ---------------------------------------------------------------- Anıtkabir
	*anitkabir(k, R) {
		ground(k, 0.66, { pave: '#d8cdb6', paveR: 0.82, rz: 1.42, oz: 0.2, rect: 1 });
		const T = '#ebe2cf';
		const T2 = '#d9ccb2';
		const T3 = '#c9bca2';
		// Tören Meydanı: kilim desenli taş döşeme
		const KIL = ['#dcd0b8', '#b97c66', '#e8dfcc', '#8c7867'];
		const nx = 15;
		const nz = 9;
		const cw = 0.72 / nx;
		const cd = 0.44 / nz;
		for (let i = 0; i < nx; i++)
			for (let j = 0; j < nz; j++) {
				const v = (Math.abs(i - 7) + Math.abs(j - 4) * 1.2) | 0;
				const edge = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
				const col = edge ? KIL[3] : v % 3 === 0 ? KIL[1] : v % 3 === 1 ? KIL[2] : KIL[0];
				k.mc(H.PAVE, col).flat().box(cw * 0.97, 0.004, cd * 0.97, -0.36 + cw * (i + 0.5), 0, -0.1 + cd * (j + 0.5)).soft();
			}
		yield;
		// meydanı çevreleyen revaklar ve köşe kuleleri
		for (const s of [-1, 1]) {
			k.mc(H.ASHLAR, T2).flat().box(0.07, 0.07, 0.46, s * 0.415, 0, 0.12).box(0.3, 0.06, 0.06, s * 0.23, 0, 0.39).soft();
			k.mc(H.STONE, T).flat().box(0.08, 0.012, 0.47, s * 0.415, 0.07, 0.12).box(0.31, 0.012, 0.07, s * 0.23, 0.06, 0.39).soft();
			for (let i = 0; i < 8; i++) k.mc(H.ASHLAR, T).flat().box(0.012, 0.06, 0.012, s * 0.375, 0.008, -0.08 + i * 0.058).soft();
		}
		const tower = (x, z, h) => {
			k.mc(H.ASHLAR, T2).flat().box(0.085, h, 0.085, x, 0, z);
			k.mc(H.STONE, T).box(0.095, 0.014, 0.095, x, h, z);
			k.mc(H.STONE, T3).cone(0.068, 0.06, 4, x, h + 0.014, z, Math.PI / 4).soft();
			k.push().move(x, h * 0.45, z + 0.043);
			k.mc(H.WIN, '#2a241d').slab(shape(openingPts('rect', 0, 0, 0.02, 0.04)), 0.004, 0, 0, 0);
			k.pop();
		};
		tower(-0.42, -0.13, 0.15);
		tower(0.42, -0.13, 0.15);
		tower(-0.42, 0.39, 0.13);
		tower(0.42, 0.39, 0.13);
		// Aslanlı Yol: iki yanda 12'şer aslan (oturan, stilize), girişte Hürriyet ve İstiklal kuleleri
		k.mc(H.PAVE, '#cfc3aa').flat().box(0.1, 0.004, 0.42, 0, 0, 0.62).soft();
		for (let i = 0; i < 12; i++)
			for (const s of [-1, 1]) {
				const z = 0.44 + i * 0.033;
				const x = s * 0.072;
				k.mc(H.ASHLAR, T2).flat().box(0.026, 0.01, 0.022, x, 0, z);
				k.mc(H.STONE, '#e0d5bd').box(0.024, 0.016, 0.014, x, 0.01, z).box(0.012, 0.02, 0.014, x - s * 0.008, 0.022, z).soft();
			}
		tower(-0.13, 0.84, 0.16);
		tower(0.13, 0.84, 0.16);
		yield;
		// Şeref Holü: yüksek kaide, geniş merdiven, kare sütunlu çevre revak, düz dam, kademeli çatı katı
		const zc = -0.3;
		k.mc(H.ASHLAR, T2).flat().box(0.7, 0.16, 0.4, 0, -0.06, zc).soft();
		k.mc(H.STONE, T).flat().box(0.72, 0.012, 0.42, 0, 0.098, zc).soft();
		stairs(k, { w: 0.36, h: 0.11, d: 0.14, n: 11, z: zc + 0.27, col: '#e2d8c3', mat: H.ASHLAR });
		block(k, { w: 0.54, d: 0.27, h: 0.19, y: 0.1, z: zc, sides: [5, 2, 5, 2], rows: [[0.3, 0.5]], ww: 0.03, kind: 'rect', col: T3, roof: 'none' });
		const cols = [];
		for (let i = 0; i < 12; i++) cols.push([-0.31 + (i * 0.62) / 11, zc + 0.175], [-0.31 + (i * 0.62) / 11, zc - 0.175]);
		for (let i = 1; i < 5; i++) cols.push([-0.31, zc - 0.175 + i * 0.07], [0.31, zc - 0.175 + i * 0.07]);
		for (const [x, z] of cols) {
			k.mc(H.ASHLAR, T).flat().box(0.026, 0.18, 0.026, x, 0.11, z);
			k.mc(H.STONE, T2).box(0.032, 0.01, 0.032, x, 0.11, z).soft();
		}
		k.mc(H.ASHLAR, T).flat().box(0.68, 0.045, 0.39, 0, 0.29, zc);
		k.mc(H.STONE, '#f2ead9').box(0.7, 0.012, 0.41, 0, 0.335, zc);
		k.mc(H.GOLD, COL.GOLD).box(0.2, 0.012, 0.004, 0, 0.305, zc + 0.197);
		k.mc(H.ASHLAR, T2).box(0.56, 0.035, 0.29, 0, 0.347, zc);
		k.mc(H.ASHLAR, T).box(0.46, 0.03, 0.21, 0, 0.382, zc).soft();
		flag(k, -0.3, 0, 0.3, 0.72, 0.26);
		yield;
		// Barış Parkı
		for (let i = 0; i < 30; i++) {
			const a = (i / 30) * Math.PI * 2 + R() * 0.15;
			const rr = 0.56 + R() * 0.06;
			const x = Math.cos(a) * rr;
			const z = 0.2 + Math.sin(a) * rr * 1.38;
			if (Math.abs(x) < 0.2 && z > 0.4) continue;
			if (Math.abs(x) < 0.5 && z > -0.55 && z < 0.5) continue;
			if (i % 3 === 0) cypress(k, x, z, 1.15);
			else tree(k, x, z, 1.1, R);
		}
	},

	// ---------------------------------------------------------------- İzmir Saat Kulesi (Konak) ve Yalı Camii
	*saatkulesi(k, R) {
		ground(k, 0.6, { pave: '#cfc4ad', paveR: 0.85 });
		const S = '#efe0c4';
		const S2 = '#e2cfab';
		// sekizgen havuzlu kaide, dört çeşme
		k.mc(H.MARBLE, '#d7c7a9').flat().cyl(0.15, 0.16, 0.03, 8, 0, 0, 0).soft();
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
			const x = Math.cos(a) * 0.13;
			const z = Math.sin(a) * 0.13;
			k.mc(H.MARBLE, S).flat().box(0.04, 0.07, 0.04, x, 0.03, z, -a);
			k.mc(H.WATER, '#4aa3c0').cyl(0.03, 0.03, 0.004, 12, x, 0.03, z);
			dome(k, { r: 0.022, x, y: 0.1, z, ribs: 8, seg: 12, ring: false, col: '#c7b490', mat: H.MARBLE });
		}
		// dört katlı sekizgen gövde: her katta kemerli açıklık, sütunçeler, kornişler
		let y = 0.03;
		for (const [r, h] of [[0.075, 0.13], [0.064, 0.1], [0.056, 0.09], [0.048, 0.08]]) {
			drumPart(k, { r, h, y, n: 8, ww: 0.5, wh: 0.7, col: S, mat: H.MARBLE, buttress: false, kind: 'round' });
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
				k.mc(H.MARBLE, '#fbf4e4').cyl(0.004, 0.004, h * 0.9, 6, Math.sin(a) * r * 1.02, y, Math.cos(a) * r * 1.02);
			}
			k.mc(H.MARBLE, S2).flat().cyl(r * 1.15, r * 1.08, 0.012, 8, 0, y + h, 0).soft();
			y += h + 0.012;
		}
		// saat kadranları (dört yön) ve tepelik
		for (let i = 0; i < 4; i++) {
			const a = (i * Math.PI) / 2;
			k.push().move(Math.sin(a) * 0.056, 0.3, Math.cos(a) * 0.056).rot(0, a, 0);
			k.mc(H.MARBLE, '#ffffff').add(new THREE.CircleGeometry(0.026, 20));
			k.mc(H.METAL, '#1d1d1f').box(0.002, 0.018, 0.002, 0, 0, 0.002).box(0.012, 0.002, 0.002, 0.005, 0, 0.002);
			k.pop();
		}
		k.mc(H.MARBLE, S).cyl(0.03, 0.045, 0.05, 8, 0, y, 0);
		k.mc(H.LEAD, COL.LEAD).uvGeo(8, 3).add(new THREE.ConeGeometry(0.035, 0.07, k._n(16), 2, true).translate(0, 0.035, 0), new THREE.Matrix4().makeTranslation(0, y + 0.05, 0)).uvBox();
		alem(k, 0, y + 0.12, 0, 0.5);
		yield;
		// Yalı Camii: küçük sekizgen, çini kaplı cephe, kubbe
		const yx = 0.34;
		const yz = -0.16;
		k.mc(H.TILE, '#3a7fb0').flat().cyl(0.075, 0.075, 0.1, 8, yx, 0, yz).soft();
		k.mc(H.ASHLAR, '#ece0c6').cyl(0.08, 0.08, 0.02, 8, yx, 0.1, yz);
		dome(k, { r: 0.07, x: yx, y: 0.12, z: yz, sy: 0.8, ribs: 12, seg: 18, alemS: 0.35, ring: false });
		minaret(k, yx + 0.08, yz - 0.05, { h: 0.28, r: 0.012, balconies: 1, col: '#ece0c6', sides: 10, capH: 0.25 });
		for (const [x, z] of [[-0.42, 0.2], [-0.38, -0.3], [0.1, 0.42], [-0.15, 0.45]]) tree(k, x, z, 1, R, 0, '#5d9a40');
		for (const [x, z] of [[0.42, 0.3], [-0.5, 0.0]]) cypress(k, x, z, 1);
	},

	// ---------------------------------------------------------------- Çanakkale Şehitler Abidesi
	*canakkale(k, R) {
		ground(k, 0.66, { pave: '#cfcabb', paveR: 0.8, rect: 1 });
		const S = '#d9d4c6';
		// geniş kaide ve basamaklar
		k.mc(H.ASHLAR, '#c4beb0').uvS(0.6).flat().box(0.52, 0.03, 0.52, 0, 0, 0).box(0.44, 0.025, 0.44, 0, 0.03, 0).uvS(1).soft();
		for (const r of [0, 1, 2, 3]) stairs(k, { w: 0.24, h: 0.055, d: 0.1, n: 5, z: 0.31, ry: (r * Math.PI) / 2, col: '#d2ccbe', mat: H.ASHLAR });
		yield;
		// dört dev ayak (hafif incelen, yivli kenarlı) ve üstte kare tabla (41,7 m)
		for (const sx of [-1, 1])
			for (const sz of [-1, 1]) {
				const g = new THREE.BoxGeometry(0.09, 0.42, 0.09, 1, 4, 1);
				const p = g.getAttribute('position');
				for (let i = 0; i < p.count; i++) {
					const t = (p.getY(i) + 0.21) / 0.42;
					const f = 1 - 0.12 * t;
					p.setX(i, p.getX(i) * f);
					p.setZ(i, p.getZ(i) * f);
				}
				k.mc(H.ASHLAR, S).uvS(0.6).flat().add(g.translate(0, 0.21, 0), new THREE.Matrix4().makeTranslation(sx * 0.1, 0.055, sz * 0.1)).uvS(1).soft();
			}
		k.mc(H.ASHLAR, '#e5e0d3').uvS(0.6).flat().box(0.38, 0.03, 0.38, 0, 0.475, 0).box(0.34, 0.06, 0.34, 0, 0.505, 0).box(0.36, 0.012, 0.36, 0, 0.565, 0).uvS(1).soft();
		// kabartma levhalar ayakların iç yüzünde
		for (const sz of [-1, 1]) k.mc(H.CARVE, '#cfc8b7').box(0.1, 0.1, 0.006, 0, 0.2, sz * 0.058);
		// dev bayrak ve şehitlik servileri
		flag(k, -0.4, 0, 0.36, 0.55, 0.2);
		for (const [x, z] of [[-0.45, -0.38], [0.45, -0.38], [0.48, 0.36], [-0.52, 0.0], [0.52, 0.0]]) cypress(k, x, z, 1.25);
		for (let i = 0; i < 10; i++) k.mc(H.MARBLE, '#f2efe8').flat().box(0.012, 0.03, 0.006, -0.35 + i * 0.07, 0, -0.5).soft();
	},
};
