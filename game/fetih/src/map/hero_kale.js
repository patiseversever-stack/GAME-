// Kahraman maketler: kaleler, surlar ve saray (Van Kalesi, Kız Kalesi, Bodrum Kalesi, Alanya Kızıl Kule, Ankara
// Kalesi, İshak Paşa Sarayı, Ani Harabeleri). Diyarbakır Surları v1.1: hero_yeni2.js.

import * as THREE from 'three';
import { H, COL, wall, block, dome, minaret, ground, tree, cypress, flag, rockMass, curtain, crenel, towerRound, towerSquare, konak, openingPts, muqarnasRing } from './hero_parts.js';

const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

/** Palmiye: kavisli gövde (halkalı), yelpaze yapraklar. */
export function palm(k, x, z, s = 1, R = Math.random, y = 0) {
	const lean = (R() - 0.5) * 0.5;
	const pts = [];
	for (let i = 0; i <= 6; i++) {
		const t = i / 6;
		pts.push(new THREE.Vector3(x + Math.sin(lean) * t * t * 0.06 * s, y + t * 0.2 * s, z + Math.cos(lean) * t * t * 0.03 * s));
	}
	k.mc(H.WOOD, '#8a6a48').add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.006 * s, 5, false));
	const top = pts[6];
	const n = 9;
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2 + R();
		const leaf = new THREE.PlaneGeometry(0.075 * s, 0.018 * s, 4, 1);
		const p = leaf.getAttribute('position');
		for (let j = 0; j < p.count; j++) {
			const u = (p.getX(j) / (0.075 * s) + 0.5);
			p.setY(j, p.getY(j) * (1 - u * 0.7) - u * u * 0.03 * s);
			p.setX(j, p.getX(j) + 0.0375 * s);
		}
		leaf.computeVertexNormals();
		leaf.rotateX(-Math.PI / 2);
		leaf.rotateZ(0.35);
		leaf.rotateY(a);
		k.mc(H.LEAF, i % 2 ? '#3f8a3a' : '#4f9a3e').add(leaf, new THREE.Matrix4().makeTranslation(top.x, top.y, top.z));
	}
}

/** Kaya üstüne oturan çokgen sur halkası: noktalar (x, z), her köşede burç. */
function ring(k, pts, { h, y = 0, t = 0.035, col, towers = 'round', tr = 0.045, th = null, cap = null }) {
	for (let i = 0; i < pts.length; i++) {
		const [x0, z0, y0 = y] = pts[i];
		const [x1, z1] = pts[(i + 1) % pts.length];
		curtain(k, x0, z0, x1, z1, { h, y: y0, t, col });
	}
	for (const [x, z, y0 = y] of pts) {
		if (towers === 'round') towerRound(k, x, z, { r: tr, h: th || h * 1.3, y: y0, col, cap });
		else towerSquare(k, x, z, { w: tr * 1.8, h: th || h * 1.3, y: y0, col, cap, ry: Math.atan2(x, z) });
	}
}

export const KALE = {
	// ---------------------------------------------------------------- Van Kalesi (Van Kayalığı)
	*vankalesi(k, R) {
		ground(k, 0.72, { pave: '#a49579', paveR: 0.3, rz: 0.55, jit: 0.06 });
		// uzun dar kaya sırtı: katmanlı kireçtaşı
		rockMass(k, { rx: 0.62, ry: 0.2, rz: 0.17, y: 0.0, seed: 11, col: '#8a7b66', col2: '#b3a38a', amp: 0.24, freq: 1.4 });
		yield;
		// sırt boyunca mazgallı sur ve burçlar (Urartu temeli, Osmanlı onarımı)
		const crest = (x) => 0.13 + 0.07 * (1 - (x / 0.55) ** 2);
		const xs = [-0.48, -0.32, -0.16, 0.0, 0.16, 0.3, 0.44];
		for (let i = 0; i < xs.length - 1; i++) {
			const a = xs[i];
			const b = xs[i + 1];
			curtain(k, a, 0.05, b, 0.05, { h: 0.08, y: Math.min(crest(a), crest(b)) - 0.04, t: 0.03, col: '#c4b08c' });
		}
		for (const x of [-0.48, -0.16, 0.16, 0.44]) towerRound(k, x, 0.05, { r: 0.04, h: 0.12, y: crest(x) - 0.05, col: '#c4b08c' });
		towerSquare(k, 0.0, 0.03, { w: 0.08, h: 0.14, y: crest(0) - 0.05, col: '#c9b592' });
		flag(k, 0.0, crest(0) + 0.1, 0.03, 0.14, 0.08);
		// yamaçtaki taş merdiven ve Sardur burcu (dipte iri bloklar)
		for (let i = 0; i < 8; i++) k.mc(H.ASHLAR, '#b8a588').flat().box(0.04, 0.012, 0.02, -0.3 + i * 0.012, i * 0.02, 0.17 - i * 0.012).soft();
		k.mc(H.ASHLAR, '#a99677').uvS(0.5).flat().box(0.16, 0.06, 0.08, 0.5, 0, 0.12).soft();
		k.uvS(1);
		for (const [x, z] of [[-0.55, 0.32], [0.58, 0.3], [0.3, 0.38], [-0.25, 0.4]]) tree(k, x, z, 1, R);
	},

	// ---------------------------------------------------------------- Kız Kalesi (Mersin, deniz içinde)
	*kizkalesi(k, R) {
		rockMass(k, { rx: 0.4, ry: 0.09, rz: 0.3, y: -0.05, seed: 3, col: '#6e675b', col2: '#958c7c', amp: 0.2, freq: 2.0 });
		const S = '#d8c7a3';
		const pts = [[-0.27, 0.16], [-0.05, 0.25], [0.2, 0.2], [0.3, 0.0], [0.24, -0.19], [0.0, -0.25], [-0.24, -0.18], [-0.32, 0.0]];
		ring(k, pts, { h: 0.12, y: 0.02, t: 0.035, col: S, tr: 0.04, th: 0.16 });
		yield;
		// iç avlu döşemesi, ana burç (kapı kulesi), şapel kalıntısı
		k.mc(H.PAVE, '#cbbd9e').flat().cyl(0.26, 0.26, 0.004, 12, 0, 0.02, 0).soft();
		towerSquare(k, 0.05, -0.03, { w: 0.12, h: 0.3, y: 0.02, col: '#d2c09a' });
		block(k, { w: 0.14, d: 0.08, h: 0.08, x: -0.12, y: 0.02, z: 0.06, sides: [2, 1, 2, 1], rows: [[0.3, 0.45]], ww: 0.016, col: S, roof: 'none' });
		k.mc(H.WOOD, '#7b5a3f').flat().box(0.06, 0.008, 0.12, 0.3, -0.005, 0.2).soft();
		yield;
	},

	// ---------------------------------------------------------------- Bodrum Kalesi (St. Peter)
	*bodrum(k, R) {
		ground(k, 0.66, { pave: '#a59c87', paveR: 0.4, jit: 0.07 });
		rockMass(k, { rx: 0.52, ry: 0.09, rz: 0.4, y: -0.02, seed: 21, col: '#8c8270', col2: '#aaa08c', amp: 0.15 });
		const S = '#cdb894';
		ring(k, [[-0.4, 0.26, 0.05], [0.0, 0.33, 0.05], [0.38, 0.22, 0.05], [0.42, -0.12, 0.05], [0.1, -0.3, 0.05], [-0.36, -0.2, 0.05]], { h: 0.1, t: 0.035, col: S, towers: 'square', tr: 0.04, th: 0.13 });
		yield;
		// iç sur ve kuleler: Fransız (en yüksek), İtalyan, Alman, İngiliz kuleleri
		k.mc(H.PAVE, '#c9bb9c').flat().cyl(0.33, 0.33, 0.004, 10, 0, 0.07, 0).soft();
		towerSquare(k, -0.02, -0.04, { w: 0.13, h: 0.36, y: 0.07, col: '#d3bf99', win: 2 });
		towerSquare(k, 0.2, 0.06, { w: 0.1, h: 0.26, y: 0.07, col: '#cdb893' });
		towerSquare(k, -0.22, 0.08, { w: 0.09, h: 0.24, y: 0.07, col: '#c8b28d' });
		towerSquare(k, 0.24, -0.16, { w: 0.1, h: 0.22, y: 0.07, col: '#d0bb96' });
		curtain(k, -0.22, 0.08, 0.2, 0.06, { h: 0.09, y: 0.07, t: 0.03, col: S });
		flag(k, -0.02, 0.07 + 0.4, -0.04, 0.12, 0.07);
		yield;
		for (const [x, z] of [[-0.5, 0.35], [0.5, 0.38], [-0.55, -0.05], [0.55, -0.1], [0.3, 0.45]]) palm(k, x, z, 1.2, R);
		for (const [x, z] of [[-0.1, 0.2], [0.08, 0.18]]) cypress(k, x, z, 1, 0.07);
	},

	// ---------------------------------------------------------------- Alanya Kızıl Kule
	*kizilkule(k, R) {
		ground(k, 0.58, { pave: '#c4b394', paveR: 0.55 });
		const B = '#b5513a';
		// sekizgen taş kaide, tuğla gövde (beş kat), mazgal dişleri, ortada sarnıç kulesi
		k.mc(H.ASHLAR, '#b9a586').flat().uvS(0.8).cyl(0.205, 0.22, 0.08, 8, 0, 0, 0).uvS(1);
		k.mc(H.BRICK, B).cyl(0.185, 0.2, 0.33, 8, 0, 0.08, 0);
		for (const y of [0.16, 0.25, 0.33]) k.mc(H.BRICK, '#a44a35').cyl(0.2, 0.2, 0.008, 8, 0, y, 0);
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
			for (const [y, w, h] of [[0.12, 0.012, 0.03], [0.2, 0.014, 0.035], [0.28, 0.016, 0.04]]) {
				k.push().move(Math.sin(a) * 0.185, y, Math.cos(a) * 0.185).rot(0, a, 0);
				k.mc(H.WIN, '#1d1410').slab(shape(openingPts('pointed', 0, 0, w, h)), 0.01, 0, 0, 0);
				k.pop();
			}
		}
		const c8 = [];
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
			c8.push([Math.sin(a) * 0.19, Math.cos(a) * 0.19]);
		}
		for (let i = 0; i < 8; i++) crenel(k, c8[i][0], c8[i][1], c8[(i + 1) % 8][0], c8[(i + 1) % 8][1], 0.41, { h: 0.04, w: 0.03, t: 0.02, gap: 0.022, col: B, mat: H.BRICK });
		k.mc(H.BRICK, '#a84a34').soft().cyl(0.085, 0.09, 0.1, 8, 0, 0.41, 0);
		const c4 = [];
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
			c4.push([Math.sin(a) * 0.085, Math.cos(a) * 0.085]);
		}
		for (let i = 0; i < 8; i++) crenel(k, c4[i][0], c4[i][1], c4[(i + 1) % 8][0], c4[(i + 1) % 8][1], 0.51, { h: 0.03, w: 0.022, t: 0.016, gap: 0.016, col: B, mat: H.BRICK });
		flag(k, 0.0, 0.51, 0.0, 0.12, 0.07);
		yield;
		// kıyı suru yamaca tırmanır, tersane kemerleri
		curtain(k, -0.2, -0.05, -0.55, -0.3, { h: 0.1, y: 0, t: 0.03, col: '#bfa987' });
		towerSquare(k, -0.55, -0.3, { w: 0.07, h: 0.14, col: '#bfa987' });
		wall(k, { w: 0.4, h: 0.08, t: 0.06, x: 0.32, z: 0.3, ry: -0.4, holes: [0, 1, 2, 3, 4].map((i) => ({ x: -0.16 + i * 0.08, y: 0, w: 0.06, h: 0.07, kind: 'pointed' })), col: '#c3ae8b', dark: true });
		for (const [x, z] of [[-0.42, 0.25], [0.48, -0.15], [-0.3, 0.42]]) palm(k, x, z, 1.15, R);
	},

	// ---------------------------------------------------------------- Ankara Kalesi
	*ankarakalesi(k, R) {
		ground(k, 0.72, { pave: '#ab9d82', paveR: 0.35, jit: 0.06 });
		rockMass(k, { rx: 0.55, ry: 0.17, rz: 0.45, y: -0.02, seed: 5, col: '#857967', col2: '#a59884', amp: 0.18, freq: 1.3 });
		yield;
		const S = '#a99c86';
		// iç kale: beşgen burçlu sur halkası (Ankara Kalesi'nin "tırnaklı" burçları)
		const pts = [[-0.34, 0.22, 0.1], [0.0, 0.32, 0.1], [0.34, 0.18, 0.1], [0.38, -0.14, 0.1], [0.06, -0.32, 0.1], [-0.3, -0.24, 0.1], [-0.42, 0.0, 0.1]];
		for (let i = 0; i < pts.length; i++) {
			const [x0, z0, y0] = pts[i];
			const [x1, z1] = pts[(i + 1) % pts.length];
			curtain(k, x0, z0, x1, z1, { h: 0.12, y: y0, t: 0.035, col: S });
			// beşgen burç: dışa sivri
			const a = Math.atan2(x0, z0);
			k.push().move(x0, y0, z0).rot(0, a, 0);
			k.mc(H.ASHLAR, '#b0a38c').flat().prism([[-0.04, -0.03], [0.04, -0.03], [0.04, 0.03], [0, 0.07], [-0.04, 0.03]], 0.16).soft();
			k.pop();
			crenel(k, x0 - 0.03, z0, x0 + 0.03, z0, y0 + 0.16, { h: 0.025, w: 0.016, t: 0.014, gap: 0.012, col: S });
		}
		// Akkale: en yüksek burç, büyük bayrak
		towerSquare(k, 0.06, -0.12, { w: 0.11, h: 0.24, y: 0.1, col: '#bcae94' });
		flag(k, 0.06, 0.38, -0.12, 0.22, 0.14);
		yield;
		// kale içi Ankara evleri (beyaz badana, kiremit), Alaeddin Camii minaresi
		for (const [x, z, ry] of [[-0.18, 0.08, 0.2], [-0.05, 0.16, -0.3], [0.15, 0.1, 0.5], [-0.2, -0.1, -0.1], [0.22, -0.05, 0.1]]) konak(k, { x, z, y: 0.1, ry, w: 0.12, d: 0.1, floors: 1, s: 0.9, R, plaster: '#f0eadc', stone: '#b5a68a' });
		minaret(k, -0.08, -0.18, { y0: 0.1, h: 0.28, r: 0.014, balconies: 1, col: '#e6dccb', sides: 10, capH: 0.22 });
		for (const [x, z] of [[-0.55, 0.4], [0.55, 0.38], [0.6, -0.3]]) tree(k, x, z, 1, R);
	},

	// ---------------------------------------------------------------- İshak Paşa Sarayı (Doğubayazıt)
	*ishakpasa(k, R) {
		ground(k, 0.7, { pave: '#9b8a73', paveR: 0.35, jit: 0.08 });
		// kayalık yamaç ve teras
		rockMass(k, { rx: 0.62, ry: 0.14, rz: 0.48, y: -0.06, seed: 13, col: '#7d6e5d', col2: '#a69580', amp: 0.16 });
		rockMass(k, { rx: 0.4, ry: 0.32, rz: 0.2, x: 0.1, y: 0.0, z: -0.45, seed: 17, col: '#7a6c5b', col2: '#9f907b' });
		const S = '#d6a87c';
		const S2 = '#c99a70';
		k.mc(H.ASHLAR, '#b99572').flat().box(0.84, 0.06, 0.52, 0, 0.0, -0.02).soft();
		yield;
		// ana kütle: iki avlulu saray, mazgallı dış duvar, harem cephesinde kemerli pencereler
		const y0 = 0.06;
		block(k, { w: 0.78, d: 0.46, h: 0.16, y: y0, z: -0.02, sides: [8, 4, 8, 4], rows: [[0.35, 0.42]], ww: 0.024, kind: 'round', col: S, frame: 0.004, frameCol: '#e8c49c', roof: 'flat', roofCol: '#a88a6c' });
		crenel(k, -0.39, 0.21, 0.39, 0.21, y0 + 0.17, { h: 0.025, w: 0.02, t: 0.016, gap: 0.014, col: S });
		for (const [x, z] of [[-0.39, 0.21], [0.39, 0.21], [0.39, -0.25], [-0.39, -0.25]]) towerRound(k, x, z, { r: 0.05, h: 0.22, y: y0, col: S, cap: '#b98a64', capH: 0.06, merlons: false });
		yield;
		// taç kapı: yüksek çerçeve, mukarnaslı niş, yanlarda kabartma şeritleri
		const px = -0.12;
		const pz = 0.21 + 0.03;
		k.mc(H.CARVE, '#e0b58a').flat().box(0.2, 0.3, 0.06, px, y0, pz).soft();
		wall(k, { w: 0.15, h: 0.25, t: 0.02, x: px, y: y0, z: pz + 0.031, holes: [{ x: 0, y: 0, w: 0.1, h: 0.21, kind: 'pointed' }], mat: H.CARVE, col: '#e8c29a', glass: false });
		k.mc(H.WIN, '#2a1a10').slab(shape(openingPts('round', 0, 0, 0.06, 0.12)), 0.01, px, y0, pz - 0.02);
		muqarnasRing(k, { r: 0.035, x: px, y: y0 + 0.2, z: pz, n: 10, d: 0.011, rows: 3, col: '#e8c29a' });
		yield;
		// cami: kubbe ve kırmızı-beyaz kuşaklı minare; türbe (sekizgen, kabartmalı, piramit külah)
		k.mc(H.ASHLAR, S).flat().cyl(0.1, 0.105, 0.06, 12, 0.2, y0 + 0.16, -0.06).soft();
		dome(k, { r: 0.1, x: 0.2, y: y0 + 0.22, z: -0.06, sy: 0.9, ribs: 16, seg: 22, alemS: 0.5, ring: false, col: '#c4936a', mat: H.ASHLAR });
		const mx = 0.37;
		const mz = 0.06;
		k.mc(H.ASHLAR, S).flat().box(0.07, 0.1, 0.07, mx, y0 + 0.16, mz).soft();
		for (let i = 0; i < 7; i++) k.mc(H.ASHLAR, i % 2 ? '#b8553e' : '#f0dcc0').cyl(0.026, 0.028, 0.045, 12, mx, y0 + 0.26 + i * 0.045, mz);
		const ty = y0 + 0.26 + 7 * 0.045;
		k.mc(H.STONE, '#f0dcc0').cyl(0.045, 0.03, 0.022, 12, mx, ty, mz);
		k.mc(H.CARVE, '#f0dcc0').cyl(0.044, 0.044, 0.016, 12, mx, ty + 0.022, mz, true);
		k.mc(H.ASHLAR, '#f0dcc0').cyl(0.022, 0.024, 0.04, 12, mx, ty + 0.022, mz);
		k.mc(H.LEAD, COL.LEAD).uvGeo(12, 3).add(new THREE.ConeGeometry(0.026, 0.07, k._n(16), 2, true).translate(0, 0.035, 0), new THREE.Matrix4().makeTranslation(mx, ty + 0.062, mz)).uvBox();
		k.mc(H.CARVE, '#e2b88e').flat().cyl(0.06, 0.064, 0.12, 8, -0.3, y0 + 0.16, -0.12);
		k.mc(H.ASHLAR, '#c99c74').cone(0.068, 0.08, 8, -0.3, y0 + 0.28, -0.12, Math.PI / 8).soft();
		flag(k, -0.39, y0 + 0.28, 0.21, 0.12, 0.08);
	},

	// ---------------------------------------------------------------- Ani Harabeleri (Kars)
	*ani(k, R) {
		ground(k, 0.78, { pave: '#9a9a72', paveR: 0.2, jit: 0.08, mid: '#9aa06f' });
		const T = '#a8654c';
		const T2 = '#94573f';
		// Ani Katedrali: yüksek sağır kemerli dikdörtgen kilise, kademeli beşik çatılar (kubbesi yıkık)
		const cx = -0.12;
		const cz = -0.08;
		for (const [w, d, ry] of [[0.34, 0.22, 0], [0.22, 0.32, 0]]) {
			for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
				const along = sx ? d : w;
				const n = Math.round(along / 0.045);
				const holes = [];
				for (let i = 0; i < n; i++) holes.push({ x: -along / 2 + (along / n) * (i + 0.5), y: 0.02, w: (along / n) * 0.55, h: 0.17, kind: 'round' });
				wall(k, { w: along, h: 0.22, t: 0.02, x: cx + (sx * w) / 2, z: cz + (sz * d) / 2, ry: sx ? (sx > 0 ? Math.PI / 2 : -Math.PI / 2) : sz > 0 ? 0 : Math.PI, holes, mat: H.ASHLAR, col: T, glassCol: T2, glassMat: H.ASHLAR });
			}
		}
		k.mc(H.ASHLAR, T2).flat().box(0.3, 0.2, 0.2, cx, 0, cz).soft();
		k.mc(H.ASHLAR, '#8d5440').flat();
		const gable = (w, d, h, y, ry) => {
			const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]);
			const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
			g.deleteAttribute('uv');
			g.translate(0, 0, -w / 2);
			g.rotateY(Math.PI / 2 + ry);
			k.add(g, new THREE.Matrix4().makeTranslation(cx, y, cz));
		};
		gable(0.36, 0.24, 0.07, 0.22, 0);
		gable(0.34, 0.24, 0.07, 0.22, Math.PI / 2);
		// yıkık kasnak (kubbe çökmüş)
		k.mc(H.ASHLAR, T).cyl(0.07, 0.072, 0.05, 12, cx, 0.27, cz, true);
		k.soft();
		yield;
		// Menüçehr Camii: sekizgen minare (tuğla, kûfi süslemeli kuşak) ve taş gövde
		const mx = 0.32;
		const mz = 0.02;
		block(k, { w: 0.16, d: 0.14, h: 0.12, x: mx - 0.08, z: mz + 0.02, sides: [2, 1, 2, 1], rows: [[0.35, 0.4]], ww: 0.02, kind: 'pointed', col: '#9c7a5e', roof: 'flat', roofCol: '#7c6450' });
		k.mc(H.BRICK, '#a1704f').flat().cyl(0.032, 0.036, 0.36, 8, mx + 0.02, 0, mz - 0.04);
		k.mc(H.TILE, '#2a7f8a').cyl(0.037, 0.037, 0.03, 8, mx + 0.02, 0.24, mz - 0.04);
		k.mc(H.BRICK, '#8f6345').cyl(0.03, 0.033, 0.02, 8, mx + 0.02, 0.36, mz - 0.04).soft();
		// Abuğamrent kilisesi: çok köşeli gövde, konik çatı
		k.mc(H.ASHLAR, T).flat().cyl(0.06, 0.062, 0.12, 12, 0.18, 0, -0.36);
		k.mc(H.ASHLAR, T).cyl(0.04, 0.045, 0.05, 12, 0.18, 0.12, -0.36);
		k.mc(H.ASHLAR, T2).cone(0.05, 0.06, 12, 0.18, 0.17, -0.36).soft();
		yield;
		// Ani surları: çifte sur, yarım yuvarlak dev burçlar (önde)
		const zw = 0.45;
		for (let i = 0; i < 4; i++) {
			const x0 = -0.62 + i * 0.32;
			curtain(k, x0, zw, x0 + 0.32, zw, { h: 0.14, t: 0.04, col: '#9a6a52' });
		}
		for (const x of [-0.62, -0.3, 0.02, 0.34, 0.66]) towerRound(k, x, zw + 0.02, { r: 0.055, h: 0.17, col: '#94654d', slits: 2 });
		// dağınık yıkıntı taşları
		for (let i = 0; i < 18; i++) k.mc(H.ASHLAR, i % 2 ? T : '#8f7a62').flat().box(0.02 + R() * 0.03, 0.01 + R() * 0.02, 0.02 + R() * 0.03, (R() - 0.5) * 1.1, 0, (R() - 0.5) * 0.7, R() * 3).soft();
	},
};
