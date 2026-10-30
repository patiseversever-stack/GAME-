// Kahraman maketler: antik yerler (Efes Celsus, Aspendos; Bergama v1.1: hero_yeni2.js). Nemrut, Göbeklitepe, Truva Atı, Myra,
// Zeugma, Hattuşa ve Amasya v1.0'da hero_yeni.js'te yeniden yapıldı (tiyatro ve Likya mezarı parçaları buradan).

import * as THREE from 'three';
import { H, COL, wall, column, entablature, pediment, stairs, ground, tree, cypress, pine, openingPts } from './hero_parts.js';

const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

/** Basamaklı oturma sırası (tiyatro): yarıçap r0'dan r1'e n sıra, açı a0..a1, her sıra dh yükselir. */
export function cavea(k, { r0, r1, n, a0, a1, dh, x = 0, y = 0, z = 0, col = '#d6c3a0', col2 = '#c9b591', aisles = 7 }) {
	const seg = k._n(Math.max(8, Math.round(((a1 - a0) / Math.PI) * 30)));
	const M = new THREE.Matrix4().makeTranslation(x, y, z);
	const ring = (pts, c) => k.mc(H.ASHLAR, c).add(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg, a0, a1 - a0), M);
	k.flat();
	// her sıra: dik yüz (oturak önü) + basamak (oturak), dışa doğru yükselir; arkada destek duvarı
	for (let i = 0; i < n; i++) {
		const r = r0 + ((r1 - r0) * i) / n;
		const r2 = r0 + ((r1 - r0) * (i + 1)) / n;
		ring([[r, dh * i], [r, dh * (i + 1)]], i % 2 ? col2 : col);
		ring([[r, dh * (i + 1)], [r2, dh * (i + 1)]], i % 2 ? col : col2);
	}
	ring([[r1, dh * n], [r1 + 0.01, dh * n], [r1 + 0.01, 0]], col2);
	k.soft();
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

/** Likya kaya mezarı cephesi: ahşap çatkıyı taklit eden çerçeve, kiriş uçları, kapı; isteğe bağlı alınlık. */
export function lycian(k, x, y, z, ry, w, h, pedi, col = '#d6c7a9') {
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
		k.mc(H.ASHLAR, '#c7ab80').flat().add(new THREE.LatheGeometry([new THREE.Vector2(0.49, 0.372), new THREE.Vector2(0.535, 0.372)], k._n(30), Math.PI / 2, Math.PI), new THREE.Matrix4().makeTranslation(0, 0, 0.02)).soft();
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
};
