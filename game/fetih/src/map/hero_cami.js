// Kahraman maketler: camiler, külliyeler, medrese ve türbe (Selimiye, Sultanahmet, Bursa Ulu Camii, Mevlana;
// Divriği ve Çifte Minareli Medrese v1.1: hero_yeni2.js). Gerçek oranlar: kubbe çapı / minare boyu / avlu, kasnak pencereleri, payanda
// kuleleri, kademeli kubbe dizisi.

import * as THREE from 'three';
import { H, COL, wall, block, dome, drumPart, semiDome, minaret, arcade, ground, tree, cypress, alem, openingPts } from './hero_parts.js';

const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

/** Şadırvan: sekizgen havuz, kurşun saçaklı kubbe, mermer sütunlar. */
export function sadirvan(k, x, z, s = 1) {
	k.push().move(x, 0, z).scale(s);
	k.mc(H.MARBLE, COL.MARBLE).flat().cyl(0.055, 0.058, 0.012, 8, 0, 0, 0).soft();
	k.mc(H.WATER, '#3d8fa6').cyl(0.048, 0.048, 0.002, 8, 0, 0.012, 0);
	k.mc(H.MARBLE, COL.MARBLE).flat().cyl(0.03, 0.032, 0.03, 8, 0, 0, 0).soft();
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
		k.mc(H.MARBLE, COL.MARBLE).cyl(0.0035, 0.004, 0.05, 6, Math.cos(a) * 0.05, 0.012, Math.sin(a) * 0.05);
	}
	k.mc(H.LEAD, COL.LEAD).uvGeo(16, 2).add(new THREE.ConeGeometry(0.075, 0.025, k._n(16), 1, true).translate(0, 0.0125, 0), new THREE.Matrix4().makeTranslation(0, 0.062, 0)).uvBox();
	dome(k, { r: 0.04, y: 0.07, ribs: 12, seg: 16, alemS: 0.4, ring: false });
	k.pop();
}

/** Revaklı avlu: x0..x1, z0..z1 dikdörtgeninin ön ve yan kenarları (içe bakan), arkası caminin cephesi. */
export function court(k, { x0, x1, z0, z1, n = 7, ns = 4, h = 0.1, depth = 0.08, col, domeCol = COL.LEAD }) {
	const dd = depth / 2;
	k.mc(H.PAVE, '#ddd3bf').flat().box(x1 - x0, 0.004, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2).soft();
	arcade(k, { x0: -(x1 - dd), x1: -(x0 + dd), z: -(z1 - dd), n, h, depth, col, domeCol, ry: Math.PI });
	arcade(k, { x0: -(z1 - depth), x1: -z0, z: x0 + dd, n: ns, h, depth, col, domeCol, ry: Math.PI / 2 });
	arcade(k, { x0: z0, x1: z1 - depth, z: -(x1 - dd), n: ns, h, depth, col, domeCol, ry: -Math.PI / 2 });
}

/** Mihrap duvarı ve yan cepheler: Osmanlı cephesi (alt dikdörtgen + üst sivri kemerli pencereler, saçak). */
function hallWalls(k, { w, d, h, z = 0, col, sides = [5, 4, 5, 4], tiers = 2 }) {
	const rows = tiers === 3 ? [[0.08, 0.2], [0.4, 0.22], [0.72, 0.18]] : [[0.1, 0.28], [0.56, 0.3]];
	block(k, { w, d, h, z, sides, rows, ww: Math.min(0.036, w / 16), kind: 'pointed', col, mat: H.ASHLAR, frame: 0.005, roof: 'none' });
	// saçak kornişi ve dam
	k.mc(H.STONE, col, 1.05).flat().box(w + 0.02, 0.012, d + 0.02, 0, h, z).soft();
	k.mc(H.LEAD, COL.LEAD2).flat().box(w + 0.004, 0.008, d + 0.004, 0, h + 0.012, z).soft();
}

/** Yivli geometri (Mevlana kubbesi, tuğla minare): açıya göre yarıçap dalgası. */
export function flute(g, n, a, pos = false) {
	const p = g.getAttribute('position');
	for (let i = 0; i < p.count; i++) {
		const ang = Math.atan2(p.getZ(i), p.getX(i));
		const c = Math.cos(ang * n);
		const f = 1 + a * (pos ? Math.max(0, c) : c);
		p.setX(i, p.getX(i) * f);
		p.setZ(i, p.getZ(i) * f);
	}
	g.computeVertexNormals();
	return g;
}

export const CAMI = {
	// ---------------------------------------------------------------- Selimiye (Edirne)
	*selimiye(k, R) {
		ground(k, 0.86, { pave: '#d2c6ad', paveR: 0.82, rect: 1 });
		const W = '#ece2cc';
		const zc = -0.1;
		// ibadet alanı: 0,62 × 0,5; iki kat pencere
		hallWalls(k, { w: 0.62, d: 0.5, h: 0.2, z: zc, col: W, sides: [6, 5, 6, 5] });
		yield;
		// sekizgen kasnak tabanı, köşe yarım kubbeleri (eksedra)
		k.mc(H.ASHLAR, W).flat().cyl(0.29, 0.3, 0.08, 8, 0, 0.212, zc).soft();
		for (const [x, z] of [[-0.21, zc - 0.17], [0.21, zc - 0.17], [-0.21, zc + 0.17], [0.21, zc + 0.17]]) {
			k.mc(H.ASHLAR, W).flat().cyl(0.085, 0.09, 0.03, 12, x, 0.212, z).soft();
			dome(k, { r: 0.082, x, y: 0.24, z, sy: 0.55, ribs: 12, seg: 18, alemS: 0.5, ring: false });
		}
		// sekiz payanda kulesi (kubbeyi taşıyan ayakların dışa taşan uçları), kubbecikli
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
			const x = Math.cos(a) * 0.305;
			const z = zc + Math.sin(a) * 0.305;
			k.mc(H.ASHLAR, W).flat().cyl(0.03, 0.034, 0.2, 8, x, 0.21, z).soft();
			k.mc(H.STONE, W, 1.05).cyl(0.036, 0.036, 0.008, 8, x, 0.41, z);
			dome(k, { r: 0.03, x, y: 0.418, z, sy: 1.15, ribs: 8, seg: 12, alemS: 0.45, ring: false });
		}
		// kasnak: 24 pencere, payandalı
		drumPart(k, { r: 0.27, h: 0.07, x: 0, y: 0.29, z: zc, n: k.seg < 1 ? 18 : 24, ww: 0.42, wh: 0.6, col: W });
		dome(k, { r: 0.272, x: 0, y: 0.36, z: zc, sy: 0.58, ribs: 32, seg: 40, alemS: 1.0, ringCol: W });
		yield;
		// dört minare: üçer şerefe, ince ve çok yüksek (dünyanın en ince minareleri)
		for (const [x, z] of [[-0.335, zc - 0.27], [0.335, zc - 0.27], [-0.335, zc + 0.27], [0.335, zc + 0.27]]) {
			minaret(k, x, z, { h: 1.12, r: 0.021, balconies: 3, col: W, sides: 12, capH: 0.17 });
			yield;
		}
		// avlu (önde): üç yanı revak, kubbecikler, ortada şadırvan
		const z0 = zc + 0.25;
		const z1 = 0.64;
		court(k, { x0: -0.3, x1: 0.3, z0, z1, n: 7, ns: 4, h: 0.1, depth: 0.08, col: W });
		sadirvan(k, 0, (z0 + z1) / 2, 0.9);
		yield;
		// avlu ağaçları ve bahçe
		for (const [x, z] of [[-0.62, 0.0], [0.62, -0.05], [-0.56, -0.48], [0.58, -0.46], [-0.6, 0.42], [0.6, 0.45]]) tree(k, x, z, 1.25, R);
		for (const [x, z] of [[-0.45, 0.72], [0.45, 0.72], [-0.5, -0.62], [0.5, -0.62]]) cypress(k, x, z, 1.2);
	},

	// ---------------------------------------------------------------- Sultanahmet Camii (İstanbul)
	*sultanahmet(k, R) {
		ground(k, 0.88, { pave: '#d6ccb6', paveR: 0.84, rect: 1, oz: 0.1 });
		const W = '#e8dfcc';
		const zc = -0.16;
		const L = '#7f93ad'; // kurşun: hafif mavimsi (Mavi Cami)
		hallWalls(k, { w: 0.56, d: 0.54, h: 0.17, z: zc, col: W, sides: [6, 6, 6, 6], tiers: 3 });
		yield;
		// kademeli kubbe dizisi: köşe kubbeleri, eksedralar, dört yarım kubbe, merkez kubbe
		for (const sx of [-1, 1])
			for (const sz of [-1, 1]) {
				k.mc(H.ASHLAR, W).flat().cyl(0.07, 0.075, 0.03, 8, sx * 0.19, 0.17, zc + sz * 0.19).soft();
				dome(k, { r: 0.068, x: sx * 0.19, y: 0.2, z: zc + sz * 0.19, sy: 0.75, ribs: 12, seg: 18, alemS: 0.45, ring: false, col: L });
			}
		// phi: yarım kubbenin dışa baktığı yönün küre açısı (x = -cos φ, z = sin φ)
		const semi = [
			[0, -1, -Math.PI / 2],
			[0, 1, Math.PI / 2],
			[1, 0, Math.PI],
			[-1, 0, 0],
		];
		for (const [dx, dz, phi] of semi) {
			const cx = dx * 0.13;
			const cz = zc + dz * 0.13;
			k.mc(H.ASHLAR, W).flat().box(dx ? 0.07 : 0.27, 0.1, dz ? 0.07 : 0.27, cx, 0.17, cz).soft();
			// eksedralar (her yarım kubbenin dibinde iki küçük yarım kubbe)
			for (const o of [-1, 1]) {
				const ex = cx + (dz ? o * 0.085 : dx * 0.05);
				const ez = cz + (dx ? o * 0.085 : dz * 0.05);
				semiDome(k, { r: 0.045, x: ex, y: 0.27, z: ez, phi: phi - Math.PI / 2, sy: 0.9, col: L, ribs: 6 });
			}
			semiDome(k, { r: 0.13, x: cx * 0.5, y: 0.27, z: zc + (cz - zc) * 0.5, phi: phi - Math.PI / 2, sy: 0.85, col: L, ribs: 12 });
		}
		// dört fil ayağı kulesi (merkez kubbenin köşelerinde, kubbecikli)
		for (const sx of [-1, 1])
			for (const sz of [-1, 1]) {
				const x = sx * 0.135;
				const z = zc + sz * 0.135;
				k.mc(H.ASHLAR, W).flat().cyl(0.026, 0.03, 0.2, 8, x, 0.17, z).soft();
				dome(k, { r: 0.027, x, y: 0.37, z, sy: 1.2, ribs: 8, seg: 12, alemS: 0.45, ring: false, col: L });
			}
		drumPart(k, { r: 0.15, h: 0.05, y: 0.33, z: zc, n: k.seg < 1 ? 20 : 28, ww: 0.42, wh: 0.58, col: W });
		dome(k, { r: 0.152, y: 0.38, z: zc, sy: 0.82, ribs: 28, seg: 36, alemS: 0.85, col: L, ringCol: W });
		yield;
		// altı minare: dördü caminin köşelerinde (üç şerefe), ikisi avlunun dış köşelerinde (iki şerefe)
		for (const [x, z, b, h] of [[-0.31, zc - 0.3, 3, 0.98], [0.31, zc - 0.3, 3, 0.98], [-0.31, zc + 0.3, 3, 0.98], [0.31, zc + 0.3, 3, 0.98], [-0.31, 0.79, 2, 0.86], [0.31, 0.79, 2, 0.86]]) {
			minaret(k, x, z, { h, r: 0.02, balconies: b, col: W, sides: 16, capH: 0.2, cap: L });
			yield;
		}
		// avlu: üç yanı revak, ortada şadırvan, önde taç kapı
		const z0 = zc + 0.28;
		const z1 = 0.78;
		court(k, { x0: -0.28, x1: 0.28, z0, z1, n: 7, ns: 5, h: 0.09, depth: 0.075, col: W, domeCol: L });
		wall(k, { w: 0.11, h: 0.15, t: 0.05, x: 0, z: z1 - 0.01, holes: [{ x: 0, y: 0, w: 0.055, h: 0.11, kind: 'pointed' }], col: W, glass: false });
		dome(k, { r: 0.03, x: 0, y: 0.15, z: z1 - 0.01, ribs: 8, seg: 12, alemS: 0.35, ring: false, col: L });
		sadirvan(k, 0, (z0 + z1) / 2, 0.85);
		yield;
		for (const [x, z] of [[-0.66, 0.2], [0.66, 0.15], [-0.62, -0.5], [0.62, -0.52], [-0.58, 0.62], [0.6, 0.6], [0.0, -0.72]]) tree(k, x, z, 1.25, R);
		for (const [x, z] of [[-0.48, -0.66], [0.48, -0.66], [-0.47, 0.88], [0.47, 0.88]]) cypress(k, x, z, 1.15);
	},

	// ---------------------------------------------------------------- Bursa Ulu Camii
	*bursaulu(k, R) {
		ground(k, 0.78, { pave: '#cfc4ae', paveR: 0.8, rect: 1 });
		const S = '#d9d0bd';
		const w = 0.7;
		const d = 0.56;
		const zc = -0.04;
		// kesme taş duvarlar, iki kat sivri kemerli pencere
		block(k, { w, d, h: 0.17, z: zc, sides: [5, 4, 5, 4], rows: [[0.12, 0.28], [0.56, 0.3]], ww: 0.03, kind: 'pointed', col: S, frame: 0.004, roof: 'none' });
		k.mc(H.STONE, S, 1.05).flat().box(w + 0.016, 0.01, d + 0.016, 0, 0.17, zc).soft();
		yield;
		// 20 kubbe: 5 × 4 ızgara; sekizgen kasnaklı, şadırvanın üstündeki fenerli
		const cw = w / 5;
		const cd = d / 4;
		for (let i = 0; i < 5; i++)
			for (let j = 0; j < 4; j++) {
				const x = -w / 2 + cw * (i + 0.5);
				const z = zc - d / 2 + cd * (j + 0.5);
				k.mc(H.LEAD, COL.LEAD2).flat().box(cw, 0.012, cd, x, 0.178, z).soft();
				k.mc(H.ASHLAR, S).flat().cyl(cw * 0.42, cw * 0.46, 0.028, 8, x, 0.19, z).soft();
				const open = i === 2 && j === 1;
				const top = dome(k, { r: cw * 0.41, x, y: 0.218, z, sy: 0.8, ribs: 12, seg: 16, alemS: open ? 0 : 0.42, ring: false });
				if (open) {
					k.mc(H.ASHLAR, S).cyl(0.025, 0.025, 0.03, 8, x, top - 0.004, z);
					dome(k, { r: 0.026, x, y: top + 0.026, z, ribs: 8, seg: 12, alemS: 0.35, ring: false });
				}
			}
		yield;
		// iki minare (kuzey köşelerinde, tek şerefe)
		for (const sx of [-1, 1]) {
			minaret(k, sx * (w / 2 + 0.035), zc + d / 2 + 0.035, { h: 0.66, r: 0.022, balconies: 1, col: '#e3dccb', sides: 12, capH: 0.2 });
			yield;
		}
		// kuzey taç kapısı, şadırvan, ağaçlar
		wall(k, { w: 0.12, h: 0.15, t: 0.03, x: 0, z: zc + d / 2 + 0.012, holes: [{ x: 0, y: 0, w: 0.06, h: 0.11, kind: 'pointed' }], col: '#e7dfcc', dark: true, frame: 0.006 });
		sadirvan(k, 0.32, 0.44, 0.8);
		for (const [x, z] of [[-0.55, 0.4], [0.58, 0.05], [-0.58, -0.3], [0.55, -0.42], [-0.2, 0.55], [0.1, -0.6]]) tree(k, x, z, 1.3, R);
		cypress(k, -0.4, 0.55, 1.1);
	},

	// ---------------------------------------------------------------- Mevlana Müzesi (Konya)
	*mevlana(k, R) {
		ground(k, 0.66, { pave: '#d4c7ab', paveR: 0.8, rect: 1 });
		const Cr = '#ebe0c8';
		const GR = '#25a98a';
		// semahane ve mescit: kurşun kubbeli uzun yapı
		block(k, { w: 0.44, d: 0.3, h: 0.15, x: -0.12, z: -0.1, sides: [5, 0, 5, 3], rows: [[0.2, 0.42]], ww: 0.026, kind: 'pointed', col: Cr, frame: 0.004, roof: 'flat', roofCol: COL.LEAD2 });
		for (const x of [-0.26, -0.12, 0.02]) {
			k.mc(H.ASHLAR, Cr).flat().cyl(0.058, 0.062, 0.03, 8, x, 0.162, -0.1).soft();
			dome(k, { r: 0.058, x, y: 0.192, z: -0.1, sy: 0.85, ribs: 12, seg: 18, alemS: 0.4, ring: false });
		}
		yield;
		// Yeşil Kubbe (Kubbe-i Hadra): çini kaplı yivli silindir kasnak ve yivli külah
		const kx = 0.2;
		const kz = -0.08;
		k.mc(H.ASHLAR, Cr).flat().box(0.2, 0.15, 0.2, kx, 0, kz).soft();
		k.mc(H.ASHLAR, Cr).flat().cyl(0.12, 0.125, 0.05, 12, kx, 0.15, kz).soft();
		const cyl = flute(new THREE.CylinderGeometry(0.1, 0.105, 0.2, k._n(64), 3, true), 16, 0.06);
		k.mc(H.GLAZE, GR).add(cyl.translate(0, 0.1, 0), new THREE.Matrix4().makeTranslation(kx, 0.2, kz));
		k.mc(H.TILE, '#1d8f75').cyl(0.118, 0.118, 0.02, 32, kx, 0.4, kz);
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2;
			k.push().move(kx + Math.sin(a) * 0.108, 0.27, kz + Math.cos(a) * 0.108).rot(0, a, 0);
			k.mc(H.WIN, '#0f1a18').slab(shape(openingPts('pointed', 0, 0, 0.022, 0.06)), 0.006, 0, 0, 0);
			k.pop();
		}
		const cone = flute(new THREE.ConeGeometry(0.115, 0.36, k._n(64), 6, true), 16, 0.08);
		k.mc(H.GLAZE, '#2fb596').add(cone.translate(0, 0.18, 0), new THREE.Matrix4().makeTranslation(kx, 0.42, kz));
		alem(k, kx, 0.775, kz, 1.1);
		yield;
		// minare, şadırvan, derviş hücreleri (sıra kubbecikler)
		minaret(k, -0.36, 0.08, { h: 0.5, r: 0.018, balconies: 1, col: Cr, sides: 12, capH: 0.22, cap: '#2a9d8f' });
		sadirvan(k, 0.02, 0.24, 1.0);
		arcade(k, { x0: -0.4, x1: 0.4, z: -0.47, n: 8, h: 0.08, depth: 0.07, col: Cr, ry: Math.PI });
		yield;
		for (const [x, z] of [[-0.42, 0.28], [0.44, 0.26], [-0.2, 0.32], [0.26, 0.3], [-0.52, -0.2], [0.52, -0.3]]) cypress(k, x, z, 1.15);
		for (const [x, z] of [[-0.5, 0.44], [0.48, 0.46], [0.0, 0.52]]) tree(k, x, z, 1.1, R);
	},
};
