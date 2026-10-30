// Kahraman maketler: antik yerler (Efes Celsus, Aspendos, Nemrut, Göbeklitepe, Truva Atı, Bergama Akropolü, Myra,
// Zeugma, Hattuşa Aslanlı Kapı, Amasya Kral Kaya Mezarları).

import * as THREE from 'three';
import { H, COL, wall, column, entablature, pediment, stairs, ground, tree, cypress, pine, rockMass, curtain, towerSquare, konak, blob, openingPts, flag } from './hero_parts.js';

const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

/** Basamaklı oturma sırası (tiyatro): yarıçap r0'dan r1'e n sıra, açı a0..a1, her sıra dh yükselir. */
function cavea(k, { r0, r1, n, a0, a1, dh, x = 0, y = 0, z = 0, col = '#d6c3a0', col2 = '#c9b591', aisles = 7 }) {
	const seg = k._n(Math.round(((a1 - a0) / Math.PI) * 28));
	for (let i = 0; i < n; i++) {
		const r = r0 + ((r1 - r0) * i) / n;
		const r2 = r0 + ((r1 - r0) * (i + 1)) / n;
		const g = new THREE.CylinderGeometry(r2, r2, dh * (i + 1), seg, 1, false, a0, a1 - a0);
		k.mc(H.ASHLAR, i % 2 ? col : col2).add(g.translate(0, (dh * (i + 1)) / 2, 0), new THREE.Matrix4().makeTranslation(x, y, z));
		// sıranın önündeki gölge çizgisi (oturak kenarı)
		void r;
	}
	// merdiven yolları (ışınsal)
	for (let j = 1; j < aisles; j++) {
		const a = a0 + ((a1 - a0) * j) / aisles;
		const rm = (r0 + r1) / 2;
		k.push().move(x + Math.sin(a) * rm, y, z + Math.cos(a) * rm).rot(0, a, 0);
		const L = r1 - r0;
		for (let s = 0; s < n * 2; s++) k.mc(H.STONE, '#b8a382').flat().box(0.012, (dh * (s + 1)) / 2 + 0.002, L / (n * 2), 0, 0, -L / 2 + (L / (n * 2)) * (s + 0.5)).soft();
		k.pop();
	}
}

/** Kaba heykel: ayakta ya da oturan insan figürü (mermer). */
function statue(k, x, y, z, s = 1, col = '#efe7d6', ry = 0) {
	k.push().move(x, y, z).rot(0, ry, 0).scale(s);
	k.mc(H.MARBLE, col).lathe([[0.012, 0], [0.014, 0.01], [0.011, 0.04], [0.009, 0.055], [0.006, 0.062], [0, 0.064]], 10);
	k.mc(H.MARBLE, col).sphere(0.006, 8, 0, 0.068, 0);
	k.pop();
}

/** Yuvarlatılmış kutu (taş baş, gövde): iç kutuya kenet + kenar yarıçapı. */
function roundBox(w, h, d, r, n = 4) {
	const g = new THREE.BoxGeometry(w, h, d, n, n, n);
	const p = g.getAttribute('position');
	const v = new THREE.Vector3();
	const c = new THREE.Vector3();
	const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
	for (let i = 0; i < p.count; i++) {
		v.fromBufferAttribute(p, i);
		c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
		v.sub(c).normalize().multiplyScalar(r).add(c);
		p.setXYZ(i, v.x, v.y, v.z);
	}
	g.computeVertexNormals();
	return g;
}

/**
 * Kommagene başı (Nemrut): yuvarlak hatlı taş baş, belirgin kaş kemeri, oyuk gözler, iri burun, bıyık ve kıvırcık
 * sakal (tanrılar), Kommagene başlığı (oymalı bant, yukarı sivrilen külah, ucu öne kıvrık, iki yanda sarkan
 * örtü kanatları). Aslan (yeleli) ve kartal (gagalı) başları.
 */
function nemrutHead(k, x, z, ry, s, kind, R) {
	k.push().move(x, 0, z).rot(0, ry, (R() - 0.5) * 0.1).scale(s);
	const C = '#d7c29c';
	const D = '#c4ae88';
	const E = '#3a2e22';
	const M = (px, py, pz, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
	if (kind === 'kartal') {
		k.mc(H.STONE, C).cached('kb2', () => roundBox(0.08, 0.09, 0.085, 0.032), M(0, 0.048, 0));
		k.mc(H.STONE, D).flat().add(new THREE.ConeGeometry(0.018, 0.06, 4).rotateX(Math.PI / 2 + 0.55).translate(0, 0.04, 0.065)).soft();
		k.mc(H.CARVE, D).cached('kt', () => blob(1, 7, 1, 0.25), M(0, 0.095, -0.01, 0.042, 0.02, 0.04));
		k.mc(H.WIN, E).sphere(0.007, 8, -0.026, 0.062, 0.036).sphere(0.007, 8, 0.026, 0.062, 0.036);
	} else if (kind === 'aslan') {
		k.mc(H.CARVE, D).cached('ay', () => blob(1, 9, 2, 0.32), M(0, 0.06, -0.012, 0.07, 0.066, 0.06));
		k.mc(H.STONE, C).cached('am', () => roundBox(0.06, 0.05, 0.05, 0.016), M(0, 0.045, 0.04));
		k.mc(H.STONE, D).flat().box(0.03, 0.016, 0.02, 0, 0.058, 0.064).soft();
		k.mc(H.WIN, E).box(0.04, 0.007, 0.004, 0, 0.03, 0.066).sphere(0.006, 8, -0.02, 0.075, 0.045).sphere(0.006, 8, 0.02, 0.075, 0.045);
	} else {
		// baş ve yüz
		k.mc(H.STONE, C).cached('hb2', () => roundBox(0.085, 0.1, 0.085, 0.03), M(0, 0.05, 0));
		k.mc(H.STONE, D).cached('hbr', () => roundBox(0.074, 0.014, 0.016, 0.006), M(0, 0.078, 0.039));
		k.mc(H.WIN, E).cached('eye', () => new THREE.SphereGeometry(1, 10, 6), M(-0.018, 0.067, 0.04, 0.011, 0.006, 0.004));
		k.mc(H.WIN, E).cached('eye', () => new THREE.SphereGeometry(1, 10, 6), M(0.018, 0.067, 0.04, 0.011, 0.006, 0.004));
		k.mc(H.STONE, C).flat().add(new THREE.ConeGeometry(0.011, 0.036, 3).rotateY(Math.PI).rotateX(-0.25).translate(0, 0.05, 0.047)).soft();
		k.mc(H.STONE, D).cached('mus', () => roundBox(0.036, 0.008, 0.01, 0.003), M(0, 0.033, 0.044));
		k.mc(H.WIN, E).box(0.02, 0.003, 0.004, 0, 0.026, 0.043);
		// sakal (tanrılar): kıvırcık, çenenin altından yanaklara
		if (kind === 'tanri') k.mc(H.CARVE, D).cached('sb2', () => blob(1, 13, 2, 0.22), M(0, 0.012, 0.028, 0.036, 0.032, 0.026));
		// Kommagene başlığı: oymalı bant, külah, öne kıvrık uç, yanlarda örtü kanatları
		k.mc(H.CARVE, D).cyl(0.047, 0.048, 0.02, 18, 0, 0.096, -0.002);
		for (const sx of [-1, 1]) k.mc(H.STONE, C).cached('lap', () => roundBox(0.014, 0.075, 0.06, 0.005), M(sx * 0.047, 0.06, -0.008));
		const g = new THREE.LatheGeometry([[0.046, 0], [0.043, 0.035], [0.035, 0.075], [0.024, 0.105], [0.012, 0.125], [0, 0.13]].map(([a, b]) => new THREE.Vector2(a, b)), k._n(18));
		k.mc(H.STONE, C).add(g, new THREE.Matrix4().makeTranslation(0, 0.114, -0.004));
		k.push().move(0, 0.236, 0.002).rot(1.0, 0, 0);
		k.mc(H.STONE, C).cone(0.013, 0.04, 10);
		k.pop();
	}
	k.pop();
}

/** Hitit aslanı: kapı taşından taşan ön gövde ve baş (açık ağız, yele). */
function lion(k, x, y, z, ry, s = 1) {
	k.push().move(x, y, z).rot(0, ry, 0).scale(s);
	const C = '#a59a84';
	k.mc(H.ROCK, C).cached('lg', () => blob(1, 21, 2, 0.12), new THREE.Matrix4().compose(new THREE.Vector3(0, 0.07, 0.02), new THREE.Quaternion(), new THREE.Vector3(0.045, 0.06, 0.06)));
	k.mc(H.ROCK, '#9a8f7a').cached('lm', () => blob(1, 33, 2, 0.4), new THREE.Matrix4().compose(new THREE.Vector3(0, 0.11, 0.045), new THREE.Quaternion(), new THREE.Vector3(0.045, 0.045, 0.04)));
	k.mc(H.ROCK, C).box(0.04, 0.035, 0.04, 0, 0.095, 0.075);
	k.mc(H.WIN, '#2a2118').box(0.026, 0.01, 0.006, 0, 0.1, 0.094);
	k.mc(H.ROCK, C).box(0.016, 0.07, 0.02, -0.022, 0, 0.06).box(0.016, 0.07, 0.02, 0.022, 0, 0.06);
	k.pop();
}

/** Likya kaya mezarı cephesi: ahşap çatkıyı taklit eden çerçeve, kiriş uçları, kapı; isteğe bağlı alınlık. */
function lycian(k, x, y, z, ry, w, h, pedi, col = '#d6c7a9') {
	k.push().move(x, y, z).rot(0, ry, 0);
	k.mc(H.ASHLAR, col).uvS(0.6).flat().box(w, h, 0.03, 0, 0, 0);
	k.mc(H.WIN, '#2b231c').box(w * 0.36, h * 0.42, 0.004, -w * 0.12, h * 0.08, 0.016);
	k.mc(H.STONE, col, 1.05);
	for (const sx of [-1, 1]) k.box(w * 0.08, h, 0.012, (sx * (w - w * 0.08)) / 2, 0, 0.018);
	k.box(w, h * 0.08, 0.014, 0, h * 0.62, 0.019).box(w * 1.08, h * 0.07, 0.03, 0, h, 0.01);
	for (let i = 0; i < 6; i++) k.mc(H.STONE, col, 0.95).cyl(0.006, 0.006, 0.02, 6, -w * 0.4 + (i * w * 0.8) / 5, h + h * 0.07, 0.03);
	if (pedi) pediment(k, { w: w * 1.1, h: h * 0.3, y: h + h * 0.07, d: 0.03, col });
	k.uvS(1).soft();
	k.pop();
}

export const ANTIK = {
	// ---------------------------------------------------------------- Efes, Celsus Kütüphanesi
	*celsus(k, R) {
		ground(k, 0.66, { pave: '#d9cfba', paveR: 0.82, rect: 1 });
		const Mb = '#efe6d3';
		const Mw = '#e2d4b8';
		// podyum ve dokuz basamaklı merdiven
		k.mc(H.MARBLE, Mw).flat().box(0.66, 0.05, 0.3, 0, 0, -0.04).soft();
		stairs(k, { w: 0.44, h: 0.05, d: 0.09, n: 9, z: 0.155, col: '#e9dfc9' });
		// arka duvar: alt katta üç kapı, üstte üç pencere (gerçek oyuk)
		wall(k, { w: 0.62, h: 0.52, t: 0.05, y: 0.05, z: -0.11, holes: [{ x: -0.15, y: 0.02, w: 0.07, h: 0.13, kind: 'round' }, { x: 0, y: 0.02, w: 0.09, h: 0.16, kind: 'round' }, { x: 0.15, y: 0.02, w: 0.07, h: 0.13, kind: 'round' }, { x: -0.15, y: 0.28, w: 0.06, h: 0.09, kind: 'rect' }, { x: 0, y: 0.28, w: 0.07, h: 0.1, kind: 'rect' }, { x: 0.15, y: 0.28, w: 0.06, h: 0.09, kind: 'rect' }], mat: H.MARBLE, col: '#e4d6ba', dark: true, frame: 0.006, frameCol: '#f3ebdb' });
		yield;
		// alt kat: çıkıntılı kaideler üstünde dört çift sütun; nişlerde dört erdem heykeli
		const pairs = [-0.21, -0.07, 0.07, 0.21];
		for (const x of pairs) {
			k.mc(H.MARBLE, Mw).flat().box(0.08, 0.05, 0.07, x, 0.05, 0.02).soft();
			for (const d of [-0.022, 0.022]) column(k, x + d, 0.1, 0.03, { h: 0.17, r: 0.011, order: 'corinthian', col: Mb });
			entablature(k, { x0: x - 0.045, x1: x + 0.045, y: 0.27, z: 0.02, d: 0.07, h: 0.04, col: Mb });
		}
		entablature(k, { x0: -0.3, x1: 0.3, y: 0.27, z: -0.06, d: 0.06, h: 0.04, col: Mw });
		for (const x of [-0.27, -0.14, 0.14, 0.27]) {
			wall(k, { w: 0.05, h: 0.1, t: 0.01, x, y: 0.1, z: -0.083, holes: [{ x: 0, y: 0.005, w: 0.032, h: 0.085, kind: 'round' }], mat: H.MARBLE, col: '#e8dcc3', glassCol: '#b9a98a', glassMat: H.MARBLE });
			statue(k, x, 0.105, -0.085, 1.15);
		}
		yield;
		// üst kat: kaydırılmış üç çift + iki yanda tek; ortada üçgen, yanlarda kemerli alınlık
		const up = [-0.27, -0.14, 0, 0.14, 0.27];
		for (let j = 0; j < up.length; j++) {
			const x = up[j];
			const edge = j === 0 || j === up.length - 1;
			k.mc(H.MARBLE, Mw).flat().box(edge ? 0.04 : 0.08, 0.025, 0.06, x, 0.31, 0.015).soft();
			for (const d of edge ? [0] : [-0.022, 0.022]) column(k, x + d, 0.335, 0.02, { h: 0.15, r: 0.0095, order: 'corinthian', col: Mb });
			if (!edge) {
				entablature(k, { x0: x - 0.045, x1: x + 0.045, y: 0.485, z: 0.015, d: 0.06, h: 0.035, col: Mb });
				if (j === 2) pediment(k, { w: 0.1, h: 0.045, x, y: 0.52, z: 0.015, d: 0.05, col: Mb });
				else {
					const s = new THREE.Shape(openingPts('round', 0, 0, 0.1, 0.05, 8).map(([a, b]) => new THREE.Vector2(a, b)));
					k.mc(H.CARVE, Mb).flat().slab(s, 0.05, x, 0.52, 0.015).soft();
				}
			}
		}
		yield;
		// Mermer Cadde: önden geçen döşeli yol, ayakta ve devrik sütunlar
		k.mc(H.PAVE, '#d8ceba').flat().box(1.1, 0.004, 0.14, 0, 0, 0.4).soft();
		for (const [x, h] of [[-0.46, 0.18], [-0.32, 0.12], [0.34, 0.2], [0.48, 0.1]]) column(k, x, 0, 0.5, { h, r: 0.014, order: 'none', col: COL.MARBLE, broken: 0.0 });
		k.push().move(0.15, 0.014, 0.5).rot(0, 0.3, Math.PI / 2);
		k.mc(H.MARBLE, COL.MARBLE).cyl(0.014, 0.014, 0.15, 14);
		k.pop();
		for (const [x, z] of [[-0.52, -0.12], [0.54, -0.16], [-0.44, -0.42], [0.46, -0.44]]) cypress(k, x, z, 1.1);
		for (const [x, z] of [[-0.6, 0.2], [0.6, 0.18]]) tree(k, x, z, 1, R);
	},

	// ---------------------------------------------------------------- Aspendos Tiyatrosu
	*aspendos(k, R) {
		ground(k, 0.72, { pave: '#c9b28c', paveR: 0.3 });
		const S = '#d9bd90';
		// oturma basamakları (cavea): yarım daire, sıra sıra, merdiven yolları; arkasında dolgu
		cavea(k, { r0: 0.17, r1: 0.5, n: 14, a0: Math.PI / 2, a1: Math.PI * 1.5, dh: 0.022, z: 0.02, col: '#dbc29a', col2: '#cfb48a', aisles: 9 });
		yield;
		// cavea'nın tepesinde kemerli galeri (yarım daire boyunca)
		const ng = k._n(30);
		for (let i = 0; i < ng; i++) {
			const a = Math.PI / 2 + ((i + 0.5) / ng) * Math.PI;
			const r = 0.5;
			wall(k, { w: (Math.PI * r) / ng + 0.002, h: 0.06, t: 0.012, x: Math.sin(a) * r, y: 0.31, z: 0.02 + Math.cos(a) * r, ry: a + Math.PI, holes: [{ x: 0, y: 0, w: ((Math.PI * r) / ng) * 0.6, h: 0.045, kind: 'round' }], col: S, glass: false });
		}
		k.mc(H.ASHLAR, '#c7ab80').flat().cyl(0.52, 0.53, 0.012, k._n(30), 0, 0.37, 0.02).soft();
		yield;
		// orkestra ve sahne, sahne binası (scaenae frons): iki kat nişler, ortada kral kapısı
		k.mc(H.PAVE, '#cdb184').cyl(0.17, 0.17, 0.004, 24, 0, 0, 0.02);
		k.mc(H.WOOD, '#8a6844').flat().box(0.72, 0.03, 0.06, 0, 0, 0.06).soft();
		const holes = [];
		for (const [x, w, h, y] of [[-0.24, 0.06, 0.1, 0.05], [-0.12, 0.06, 0.1, 0.05], [0, 0.08, 0.13, 0.03], [0.12, 0.06, 0.1, 0.05], [0.24, 0.06, 0.1, 0.05], [-0.24, 0.05, 0.08, 0.22], [-0.12, 0.05, 0.08, 0.22], [0, 0.05, 0.08, 0.22], [0.12, 0.05, 0.08, 0.22], [0.24, 0.05, 0.08, 0.22]]) holes.push({ x, y, w, h, kind: 'round' });
		wall(k, { w: 0.98, h: 0.42, t: 0.06, z: 0.12, holes, mat: H.ASHLAR, col: '#dbbf92', dark: true, frame: 0.005, frameCol: '#e6cfa6' });
		// arka (dış) cephe: üç sıra kemerli pencere
		const back = [];
		for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) back.push({ x: -0.4 + i * 0.1, y: 0.06 + r * 0.12, w: 0.03, h: 0.06, kind: 'round' });
		wall(k, { w: 1.0, h: 0.42, t: 0.03, z: 0.165, holes: back, mat: H.ASHLAR, col: '#d6b98c', dark: true });
		k.mc(H.ASHLAR, '#c8ac80').flat().box(1.04, 0.025, 0.1, 0, 0.42, 0.14).soft();
		for (const sx of [-1, 1]) k.mc(H.ASHLAR, S).flat().box(0.06, 0.42, 0.12, sx * 0.5, 0, 0.12).soft();
		yield;
		for (const [x, z] of [[-0.6, 0.35], [0.6, 0.35], [0.62, -0.2], [-0.62, -0.2]]) pine(k, x, z, 1.1, 0, R);
	},

	// ---------------------------------------------------------------- Nemrut Dağı
	*nemrut(k, R) {
		ground(k, 0.76, { pave: '#b9a98c', paveR: 0.5, jit: 0.08, mid: '#a89a80' });
		// zirvedeki yapay çakıl tepesi (tümülüs)
		const tum = new THREE.LatheGeometry([[0.6, -0.05], [0.52, 0.06], [0.4, 0.22], [0.25, 0.4], [0.1, 0.53], [0, 0.56]].map(([r, y]) => new THREE.Vector2(r, y)), k._n(40), 0, Math.PI * 2);
		tum.deleteAttribute('normal');
		const tm = tum.index ? tum : tum;
		k.grad('#a29580', '#cbbfa8', 0, 0.55);
		k._mat = H.DIRT;
		k.add(tm, new THREE.Matrix4().makeTranslation(0, 0, -0.32));
		yield;
		// doğu terası: taş platform; arkada tahtlarında oturan başsız heykeller
		k.mc(H.ASHLAR, '#bdab8c').flat().uvS(0.5).box(1.08, 0.05, 0.42, 0, -0.03, 0.26).uvS(1).soft();
		const S = '#d3bf98';
		const S2 = '#c3ad86';
		for (let i = 0; i < 5; i++) {
			const x = -0.36 + i * 0.18;
			k.mc(H.ASHLAR, '#b29d7b').uvS(0.5).flat().box(0.15, 0.09, 0.13, x, 0.02, 0.13).uvS(1);
			k.mc(H.ROCK, S2).box(0.12, 0.12, 0.09, x, 0.11, 0.12).box(0.14, 0.03, 0.1, x, 0.22, 0.12);
			k.mc(H.ROCK, S2).box(0.03, 0.08, 0.06, x - 0.05, 0.11, 0.19).box(0.03, 0.08, 0.06, x + 0.05, 0.11, 0.19).soft();
		}
		// başlar yere düşmüş: önde sıra sıra (aslan, tanrılar, kral, kartal)
		const kinds = ['aslan', 'tanri', 'kral', 'tanri', 'tanri', 'tanri', 'kartal'];
		for (let i = 0; i < 7; i++) {
			const x = -0.45 + i * 0.15;
			nemrutHead(k, x, 0.36 + (i % 2) * 0.05, (R() - 0.5) * 0.4, i === 0 || i === 6 ? 1.25 : 1.4, kinds[i], R);
			if (i % 2) yield;
		}
		for (let i = 0; i < 10; i++) k.mc(H.ROCK, '#b5a283').flat().box(0.04 + R() * 0.04, 0.025, 0.03 + R() * 0.03, (R() - 0.5) * 1.0, 0.0, 0.5 + R() * 0.12, R() * 3).soft();
	},

	// ---------------------------------------------------------------- Göbeklitepe
	*gobekli(k, R) {
		ground(k, 0.72, { pave: '#c4a47c', paveR: 0.7, mid: '#c9ad85', midMat: H.DIRT });
		// kazı çukuru, yuvarlak çevre duvarları, T biçimli dikilitaşlar (kabartmalı)
		k.mc(H.DIRT, '#b0906c').flat().cyl(0.52, 0.5, 0.012, 24, 0, -0.012, 0).soft();
		for (const [cx, cz, r, n] of [[-0.18, 0.05, 0.22, 10], [0.22, -0.08, 0.2, 9], [0.06, 0.32, 0.15, 7]]) {
			const g = new THREE.CylinderGeometry(r + 0.025, r + 0.03, 0.05, k._n(28), 1, true);
			k.mc(H.ASHLAR, '#a58663').uvS(0.7).add(g.translate(0, 0.025, 0), new THREE.Matrix4().makeTranslation(cx, 0, cz)).uvS(1);
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2 + 0.3;
				const x = cx + Math.cos(a) * r;
				const z = cz + Math.sin(a) * r;
				k.mc(H.CARVE, '#d8c19c').flat().box(0.032, 0.13, 0.018, x, 0.0, z, -a + Math.PI / 2).box(0.065, 0.032, 0.03, x, 0.13, z, -a + Math.PI / 2).soft();
			}
			// ortadaki iki büyük dikilitaş: kollar ve eller kabartması
			for (const dx of [-0.045, 0.045]) {
				k.mc(H.CARVE, '#e2cfac').flat().box(0.04, 0.22, 0.024, cx + dx, 0, cz).box(0.09, 0.05, 0.04, cx + dx, 0.22, cz);
				k.mc(H.STONE, '#cdb894').box(0.006, 0.08, 0.004, cx + dx - 0.013, 0.08, cz + 0.013).box(0.006, 0.08, 0.004, cx + dx + 0.013, 0.08, cz + 0.013).box(0.03, 0.006, 0.004, cx + dx, 0.08, cz + 0.013).soft();
			}
			yield;
		}
		// koruma çatısı: çelik dikmeler ve hafif dalgalı zar (yarı açık)
		k.mc(H.METAL, '#c9ccd0');
		for (const [x, z] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.48], [0.5, 0.48], [0, -0.36], [0, 0.52]]) k.cyl(0.006, 0.008, 0.44, 6, x, 0, z);
		const m = new THREE.PlaneGeometry(1.1, 0.92, 12, 10);
		const p = m.getAttribute('position');
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i);
			const y = p.getY(i);
			p.setZ(i, 0.03 * Math.sin(x * 9) * Math.cos(y * 7));
		}
		m.computeVertexNormals();
		m.rotateX(-Math.PI / 2);
		k.mc(H.CLOTH, '#eef0f0').add(m, new THREE.Matrix4().makeTranslation(0, 0.45, 0.08));
		// ziyaretçi yürüme yolu (ahşap iskele)
		k.mc(H.WOOD, '#8d6a48').flat().box(0.9, 0.006, 0.05, 0, 0.06, -0.38).soft();
		for (const [x, z] of [[-0.62, 0.5], [0.62, 0.52]]) tree(k, x, z, 0.9, R);
	},

	// ---------------------------------------------------------------- Truva Atı (Tevfikiye)
	*truva(k, R) {
		ground(k, 0.6, { pave: '#bdad8a', paveR: 0.55 });
		const W = '#a46f3d';
		const W2 = '#8a5c33';
		// taş kaide ve ahşap bacaklar
		k.mc(H.ASHLAR, '#b5a68a').flat().box(0.46, 0.04, 0.24, 0, 0, 0).soft();
		for (const x of [-0.15, 0.15]) for (const z of [-0.065, 0.065]) k.mc(H.WOOD, W2).flat().cyl(0.022, 0.03, 0.26, 6, x, 0.04, z).soft();
		// gövde: tahta kaplı fıçı, yanlarda pencereler, karından merdiven
		const body = new THREE.CylinderGeometry(0.12, 0.12, 0.42, k._n(16), 6, false);
		body.rotateZ(Math.PI / 2);
		body.scale(1, 1, 0.85);
		k.mc(H.WOOD, W).uvGeo(0.8, 0.42).add(body, new THREE.Matrix4().makeTranslation(0, 0.4, 0)).uvBox();
		k.mc(H.WOOD, W2).flat();
		for (const x of [-0.21, 0.21]) k.cyl(0.11, 0.11, 0.012, 16, x, 0.29, 0);
		k.soft();
		for (const sz of [-1, 1]) for (const x of [-0.1, 0.0, 0.1]) k.mc(H.WIN, '#2a1b10').box(0.045, 0.035, 0.004, x, 0.4, sz * 0.104);
		for (let i = 0; i < 7; i++) k.mc(H.WOOD, '#6b4528').flat().box(0.004, 0.004, 0.06, -0.03, 0.06 + i * 0.035, 0).soft();
		k.mc(H.WOOD, '#6b4528').box(0.006, 0.26, 0.006, -0.03, 0.04, -0.03).box(0.006, 0.26, 0.006, -0.03, 0.04, 0.03);
		yield;
		// boyun, baş, yele, kulaklar, kuyruk
		k.push().move(0.2, 0.47, 0).rot(0, 0, -0.6);
		k.mc(H.WOOD, W).flat().box(0.1, 0.22, 0.09, 0, 0, 0);
		for (let i = 0; i < 6; i++) k.mc(H.WOOD, W2).box(0.02, 0.025, 0.1, -0.05, 0.03 + i * 0.03, 0);
		k.pop();
		k.push().move(0.32, 0.64, 0).rot(0, 0, 0.3);
		k.mc(H.WOOD, W).flat().box(0.2, 0.08, 0.085, 0, 0, 0);
		k.mc(H.WIN, '#1d140c').box(0.02, 0.016, 0.088, 0.03, 0.045, 0);
		k.mc(H.WOOD, W2).box(0.025, 0.05, 0.02, -0.04, 0.08, 0.025).box(0.025, 0.05, 0.02, -0.04, 0.08, -0.025);
		k.soft();
		k.pop();
		k.push().move(-0.22, 0.42, 0).rot(0, 0, 0.5);
		k.mc(H.WOOD, W2).flat().box(0.03, 0.16, 0.03, 0, -0.16, 0).soft();
		k.pop();
		yield;
		// Truva surları (VI. katman kalıntısı) ve ağaçlar
		curtain(k, -0.55, -0.35, 0.1, -0.45, { h: 0.08, t: 0.06, col: '#b3a385', batter: 0.02, slits: false });
		towerSquare(k, 0.18, -0.44, { w: 0.12, h: 0.1, col: '#b3a385', merlons: false, win: 0 });
		for (const [x, z] of [[-0.45, 0.3], [0.48, 0.3], [0.52, -0.2]]) tree(k, x, z, 1.1, R);
	},

	// ---------------------------------------------------------------- Bergama Akropolü
	*bergama(k, R) {
		ground(k, 0.76, { pave: '#b6a585', paveR: 0.3, jit: 0.06 });
		// akropol tepesi: dik yamaç
		rockMass(k, { rx: 0.6, ry: 0.34, rz: 0.5, y: -0.05, z: -0.12, seed: 9, col: '#8f8270', col2: '#b4a68d', amp: 0.18, freq: 1.2 });
		yield;
		// dünyanın en dik antik tiyatrosu: yamaca oyulmuş dar ve yüksek oturma basamakları
		const n = 16;
		for (let i = 0; i < n; i++) {
			const r = 0.42 - i * 0.017;
			const g = new THREE.CylinderGeometry(r, r, 0.024, k._n(16), 1, false, Math.PI * 0.72, Math.PI * 0.56);
			k.mc(H.ASHLAR, i % 2 ? '#d1c3a6' : '#c3b496').add(g.translate(0.08, 0.012 + i * 0.024, 0.2 - i * 0.012));
		}
		// sahne terası (uzun teras yolu)
		k.mc(H.PAVE, '#cbbd9f').flat().box(0.7, 0.01, 0.07, 0.08, 0.0, 0.32).soft();
		yield;
		// tepede Trajan tapınağı: kemerli dolgu üstünde teras, korint sütunlar (bir kısmı ayakta)
		const ty = 0.3;
		wall(k, { w: 0.4, h: 0.1, t: 0.05, x: -0.12, y: ty - 0.1, z: -0.06, holes: [0, 1, 2, 3].map((i) => ({ x: -0.15 + i * 0.1, y: 0, w: 0.06, h: 0.08, kind: 'round' })), col: '#c8b894', dark: true });
		k.mc(H.MARBLE, '#e9e2d2').flat().box(0.42, 0.03, 0.3, -0.12, ty, -0.2).soft();
		k.mc(H.MARBLE, '#efe9dc').flat().box(0.24, 0.025, 0.16, -0.12, ty + 0.03, -0.2).soft();
		for (let i = 0; i < 6; i++) for (const z of [-0.13, -0.27]) column(k, -0.24 + i * 0.048, ty + 0.055, z, { h: 0.16, r: 0.008, order: 'corinthian', col: COL.MARBLE });
		for (const x of [-0.24, 0.0]) column(k, x, ty + 0.055, -0.2, { h: 0.16, r: 0.008, order: 'corinthian', col: COL.MARBLE });
		entablature(k, { x0: -0.26, x1: 0.0, y: ty + 0.215, z: -0.13, d: 0.03, h: 0.03, col: COL.MARBLE });
		pediment(k, { w: 0.06, h: 0.03, x: -0.24, y: ty + 0.245, z: -0.2, d: 0.03, col: COL.MARBLE, ry: Math.PI / 2 });
		yield;
		for (const [x, z] of [[-0.6, 0.4], [0.62, 0.36], [0.5, -0.5]]) pine(k, x, z, 1.1, 0, R);
		for (const [x, z] of [[0.4, 0.42], [-0.45, 0.48]]) tree(k, x, z, 1, R);
	},

	// ---------------------------------------------------------------- Myra (Demre): Likya kaya mezarları ve tiyatro
	*myra(k, R) {
		ground(k, 0.76, { pave: '#c6b796', paveR: 0.3 });
		rockMass(k, { rx: 0.62, ry: 0.55, rz: 0.22, y: 0.05, z: -0.42, seed: 31, col: '#9a8a74', col2: '#c9bb9f', amp: 0.16, freq: 1.3 });
		yield;
		// kayaya oyulmuş ev tipi mezar cepheleri (kademe kademe)
		const tombs = [[-0.36, 0.08, -0.25, 0.1, 0.09, false], [-0.22, 0.14, -0.23, 0.09, 0.08, true], [-0.08, 0.06, -0.22, 0.1, 0.1, false], [0.06, 0.18, -0.24, 0.1, 0.09, true], [0.2, 0.08, -0.23, 0.09, 0.08, false], [0.34, 0.16, -0.26, 0.09, 0.08, false], [-0.15, 0.28, -0.28, 0.1, 0.09, true], [0.12, 0.32, -0.3, 0.09, 0.08, false], [-0.32, 0.26, -0.3, 0.08, 0.08, false]];
		for (const [x, y, z, w, h, p] of tombs) lycian(k, x, y, z, 0, w, h, p);
		yield;
		// Roma tiyatrosu (önde)
		cavea(k, { r0: 0.1, r1: 0.34, n: 9, a0: Math.PI * 0.55, a1: Math.PI * 1.45, dh: 0.018, z: 0.38, col: '#d6c7a9', col2: '#cbbb9c', aisles: 6 });
		wall(k, { w: 0.44, h: 0.1, t: 0.03, z: 0.42, holes: [-0.12, 0, 0.12].map((x) => ({ x, y: 0, w: 0.05, h: 0.07, kind: 'round' })), col: '#cbbb9c', dark: true });
		for (const [x, z] of [[-0.6, 0.3], [0.6, 0.26], [0.55, 0.55]]) tree(k, x, z, 1, R, 0, '#5e8f3e');
	},

	// ---------------------------------------------------------------- Zeugma (Gaziantep)
	*zeugma(k, R) {
		ground(k, 0.72, { pave: '#c8b38e', paveR: 0.7, midMat: H.DIRT, mid: '#c3ab84' });
		// Fırat (Birecik Baraj Gölü) arkada
		k.mc(H.WATER, '#2f7a80').flat().box(1.5, 0.004, 0.3, 0, -0.014, -0.55).soft();
		// villanın odaları: alçak moloz duvarlar, odalarda mozaik zeminler
		const Wl = '#c2ab86';
		const rooms = [[0, 0.04, 0.34, 0.24], [-0.32, 0.06, 0.2, 0.2], [0.32, 0.06, 0.2, 0.2], [-0.2, 0.32, 0.22, 0.16], [0.2, 0.32, 0.22, 0.16]];
		for (const [x, z, w, d] of rooms) {
			k.mc(H.MOSAIC, '#d8c7a3').flat().box(w - 0.02, 0.006, d - 0.02, x, 0, z).soft();
			for (const [a, b, c, e] of [[x - w / 2, z - d / 2, x + w / 2, z - d / 2], [x - w / 2, z + d / 2, x + w / 2, z + d / 2], [x - w / 2, z - d / 2, x - w / 2, z + d / 2], [x + w / 2, z - d / 2, x + w / 2, z + d / 2]]) {
				const L = Math.hypot(c - a, e - b);
				k.mc(H.ASHLAR, Wl).uvS(1.6).flat().box(L + 0.016, 0.03 + R() * 0.02, 0.016, (a + c) / 2, 0, (b + e) / 2, -Math.atan2(e - b, c - a)).uvS(1).soft();
			}
		}
		yield;
		// peristil: kırmızı sıvalı alt gövdeli sütunlar
		for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.2], [0.14, 0.2], [-0.42, -0.1], [0.42, -0.1]]) {
			k.mc(H.PLASTER, '#a8462f').cyl(0.014, 0.016, 0.06, 12, x, 0, z);
			column(k, x, 0.06, z, { h: 0.12, r: 0.013, order: 'doric', col: '#e8dcc2', mat: H.PLASTER, flutes: 12 });
		}
		// koruma çatısı: dikmeler ve hafif çatı (yarısı)
		k.mc(H.METAL, '#bfc4c8');
		for (const [x, z] of [[-0.48, -0.16], [0.48, -0.16]]) k.cyl(0.006, 0.006, 0.3, 6, x, 0, z);
		k.mc(H.METAL, '#d7dadd').flat().box(1.0, 0.008, 0.16, 0, 0.3, -0.2).soft();
		for (const [x, z] of [[-0.6, 0.45], [0.6, 0.44], [-0.62, -0.25], [0.62, -0.28]]) tree(k, x, z, 1, R, 0, '#6d8f3e');
	},

	// ---------------------------------------------------------------- Hattuşa: Aslanlı Kapı
	*hattusa(k, R) {
		ground(k, 0.76, { pave: '#a49d82', paveR: 0.3, jit: 0.07 });
		// toprak sur seddi ve üstünde iri çokgen taşlı (kiklopik) duvar
		rockMass(k, { rx: 0.75, ry: 0.1, rz: 0.2, y: -0.02, z: -0.06, seed: 41, col: '#8e8572', col2: '#a59b84', amp: 0.12 });
		const S = '#9c927f';
		k.mc(H.ASHLAR, S).uvS(0.32).flat();
		for (const [a, b] of [[-0.7, -0.12], [0.12, 0.7]]) k.box(b - a, 0.14, 0.09, (a + b) / 2, 0.05, -0.06);
		// kapı kuleleri ve kapı: parabol kemerli geçit, iki yanında aslanlı söve taşları
		for (const sx of [-1, 1]) k.box(0.18, 0.2, 0.2, sx * 0.24, 0.05, -0.06);
		const holes = [{ x: 0, y: 0, w: 0.12, h: 0.2, kind: 'pointed' }];
		wall(k, { w: 0.3, h: 0.22, t: 0.12, y: 0.05, z: -0.06, holes, mat: H.ASHLAR, col: '#a69c88', glass: false });
		k.uvS(1).soft();
		yield;
		for (const sx of [-1, 1]) lion(k, sx * 0.085, 0.05, 0.01, 0, 1.1);
		// kapıya çıkan rampa ve taş döşeme
		k.mc(H.PAVE, '#a79e88').flat().box(0.16, 0.05, 0.3, 0, 0, 0.12).soft();
		for (const [x, z] of [[-0.6, 0.35], [0.6, 0.35], [0.5, 0.55]]) tree(k, x, z, 0.9, R, 0, '#7a8f45');
	},

	// ---------------------------------------------------------------- Amasya: Kral Kaya Mezarları ve Yalıboyu evleri
	*amasya(k, R) {
		ground(k, 0.78, { pave: '#a9a487', paveR: 0.3, jit: 0.05 });
		// Harşena Dağı: dik kaya yüzü, Pontus krallarının kayaya oyulmuş mezarları
		rockMass(k, { rx: 0.62, ry: 0.62, rz: 0.2, y: 0.05, z: -0.44, seed: 51, col: '#7f7262', col2: '#a39582', amp: 0.14, freq: 1.2 });
		for (const [x, y, w, h] of [[-0.3, 0.26, 0.11, 0.2], [-0.1, 0.34, 0.12, 0.22], [0.12, 0.3, 0.11, 0.2], [0.3, 0.22, 0.1, 0.18]]) {
			k.push().move(x, y, -0.26);
			k.mc(H.ROCK, '#8f8170').flat().box(w + 0.05, h + 0.05, 0.05, 0, -0.025, -0.02);
			k.mc(H.WIN, '#2a221c').box(w + 0.02, h + 0.02, 0.006, 0, -0.01, 0.006);
			k.mc(H.ASHLAR, '#b5a68c').uvS(0.5).box(w, h, 0.05, 0, 0, -0.01).uvS(1);
			k.mc(H.WIN, '#3a2f26').box(w * 0.3, h * 0.25, 0.004, 0, 0.0, 0.016);
			k.mc(H.ASHLAR, '#c0b298').cone(w * 0.7, h * 0.18, 4, 0, h, -0.01, Math.PI / 4).soft();
			k.pop();
		}
		// kayanın tepesinde Amasya Kalesi surları
		curtain(k, -0.35, -0.5, 0.3, -0.52, { h: 0.06, y: 0.55, t: 0.03, col: '#9b8e7a' });
		yield;
		// Yeşilırmak ve kıyıda Yalıboyu evleri (taş temel, çıkmalı ahşap üst kat)
		k.mc(H.WATER, '#3b7d78').flat().box(1.5, 0.004, 0.18, 0, -0.012, 0.22).soft();
		const C = ['#f1e6d0', '#e9c79a', '#f4ede0', '#d8a07a', '#e6d3a8'];
		for (let i = 0; i < 6; i++) konak(k, { x: -0.48 + i * 0.19, z: -0.04, ry: 0, w: 0.15, d: 0.13, floors: 2, s: 0.85, R, plaster: C[i % C.length], stone: '#a99778' });
		yield;
		// taş köprü
		wall(k, { w: 0.18, h: 0.07, t: 0.06, x: 0.38, y: -0.02, z: 0.22, ry: Math.PI / 2, holes: [{ x: 0, y: 0, w: 0.1, h: 0.06, kind: 'round' }], col: '#a59780', glass: false });
		for (const [x, z] of [[-0.6, 0.42], [0.6, 0.44], [0.0, 0.46]]) tree(k, x, z, 1, R);
	},
};
