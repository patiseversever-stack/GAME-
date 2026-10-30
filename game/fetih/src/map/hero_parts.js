// Kahraman maket parçaları (heroes.js kitiyle): gerçek oyuklu kemerli cepheler, kasnaklı kurşun kubbe, şerefeli
// minare, revak, klasik sütun ve saçak, mazgallı sur ve kuleler, kiremit çatı, Osmanlı konağı, kaya kütlesi,
// ağaçlar, bayrak, avlu. Ölçü yerel birim (yapının tabanı y = 0, ön yüz +z), ölçek yapıcıda verilir.

import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { H } from './heroes.js';

export { H };

export const COL = {
	LEAD: '#8a97a8',
	LEAD2: '#76869a',
	GOLD: '#f0c04a',
	GLASS: '#1d2a38',
	MARBLE: '#eee6d6',
	CREAM: '#e9dcc0',
	LIME: '#e6d9bd',
	SAND: '#d8c19a',
	ROOF: '#c25a3c',
	WOOD: '#7a4b2c',
	WHITE: '#f4f1ea',
	RED: '#e30a17',
	LEAF: ['#3d7f35', '#4a8f39', '#57983b', '#3a7432'],
	CYP: '#24502e',
	PINE: '#2a5a32',
	TRUNK: '#5d4130',
};

// ------------------------------------------------------------------ yardımcılar

/** Belirlenimci 3B değer gürültüsü (kaya, ağaç tacı). */
function h3(x, y, z) {
	let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647)) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vn3(x, y, z) {
	const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
	const fx = x - ix, fy = y - iy, fz = z - iz;
	const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
	const L = (a, b, t) => a + (b - a) * t;
	const c = (dx, dy, dz) => h3(ix + dx, iy + dy, iz + dz);
	return L(L(L(c(0, 0, 0), c(1, 0, 0), sx), L(c(0, 1, 0), c(1, 1, 0), sx), sy), L(L(c(0, 0, 1), c(1, 0, 1), sx), L(c(0, 1, 1), c(1, 1, 1), sx), sy), sz);
}

/** Açıklık çokgeni (XY, taban y0): rect, round (yarım daire), pointed (sivri, Osmanlı/Selçuklu), seg (basık). */
export function openingPts(kind, cx, y0, w, h, n = 6) {
	const pts = [];
	const r = w / 2;
	if (kind === 'rect') return [[cx - r, y0], [cx + r, y0], [cx + r, y0 + h], [cx - r, y0 + h]];
	pts.push([cx - r, y0], [cx + r, y0]);
	if (kind === 'round') {
		const hs = y0 + h - r;
		pts.push([cx + r, hs]);
		for (let i = 1; i < n * 2; i++) {
			const a = (i / (n * 2)) * Math.PI;
			pts.push([cx + Math.cos(a) * r, hs + Math.sin(a) * r]);
		}
		pts.push([cx - r, hs]);
	} else if (kind === 'pointed') {
		const R = w * 0.82;
		const rise = Math.sqrt(R * R - (R - r) * (R - r));
		const hs = y0 + h - rise;
		pts.push([cx + r, hs]);
		// sağ yay: merkez (cx + r - R, hs)
		const a0 = Math.acos((R - r) / R); // tepe açısı
		for (let i = 1; i < n; i++) {
			const a = (i / n) * a0;
			pts.push([cx + r - R + Math.cos(a) * R, hs + Math.sin(a) * R]);
		}
		pts.push([cx, hs + rise]);
		for (let i = n - 1; i >= 1; i--) {
			const a = (i / n) * a0;
			pts.push([cx - r + R - Math.cos(a) * R, hs + Math.sin(a) * R]);
		}
		pts.push([cx - r, hs]);
	} else {
		// basık kemer
		const rise = w * 0.18;
		const hs = y0 + h - rise;
		pts.push([cx + r, hs]);
		for (let i = 1; i < n; i++) {
			const t = i / n;
			pts.push([cx + r - t * w, hs + Math.sin(t * Math.PI) * rise]);
		}
		pts.push([cx - r, hs]);
	}
	return pts;
}
const toShape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const toPath = (pts) => new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x, y)));

/**
 * Cephe duvarı: genişlik w, yükseklik h, kalınlık t; holes: [{x, y, w, h, kind}] gerçek oyuk (kalınlıkta açılır,
 * pervaz yüzleri görünür). Arkasında koyu cam (WIN) içerde durur; isteğe bağlı taş çerçeve ve denizlik.
 * top: 'flat' ya da {kind:'round'|'pointed', ...} duvarın üst kenarı kemerli (taç kapı alınlığı).
 */
export function wall(k, { w, h, t = 0.03, x = 0, y = 0, z = 0, ry = 0, holes = [], mat = H.ASHLAR, col = COL.CREAM, glass = true, glassCol = COL.GLASS, glassMat = H.WIN, frame = 0, frameCol = null, sill = false, top = null, dark = false }) {
	let outer;
	if (top) outer = openingPts(top, 0, 0, w, h, 10);
	else outer = [[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]];
	const s = toShape(outer);
	for (const o of holes) s.holes.push(toPath(openingPts(o.kind || 'round', o.x, o.y, o.w, o.h)));
	k.mc(mat, col).slab(s, t, x, y, z, ry);
	k.push().move(x, y, z).rot(0, ry, 0);
	for (const o of holes) {
		const pts = openingPts(o.kind || 'round', o.x, o.y, o.w, o.h);
		if (glass) {
			const g = new THREE.ShapeGeometry(toShape(pts), 4);
			g.translate(0, 0, o.depth != null ? o.depth : -t * 0.15);
			k.mc(glassMat, dark ? '#0d1218' : glassCol).add(g);
		}
		if (frame > 0) {
			const f = toShape(openingPts(o.kind || 'round', o.x, o.y - frame * 0.5, o.w + frame * 2, o.h + frame * 1.5));
			f.holes.push(toPath(pts));
			k.mc(mat === H.MARBLE ? H.MARBLE : H.STONE, frameCol || col, 1.06).slab(f, t * 0.2 + 0.004, 0, 0, t / 2 + 0.002);
		}
		if (sill) k.mc(H.STONE, frameCol || col, 1.05).box(o.w + 0.01, 0.005, 0.012, o.x, o.y - 0.005, t / 2 + 0.004);
	}
	k.pop();
	return k;
}

/** Düz kutu duvar + pencere sıraları (çok pencereli uzun cephe; kalınlık içinde oyuk). */
export function facadeRow(k, { w, h, t = 0.03, x = 0, y = 0, z = 0, ry = 0, n = 5, rows = [[0.3, 0.4]], ww = 0.04, kind = 'round', mat = H.ASHLAR, col = COL.CREAM, frame = 0, sill = true, frameCol = null }) {
	const holes = [];
	for (const [fy, fh] of rows)
		for (let i = 0; i < n; i++) {
			const cx = -w / 2 + (w / n) * (i + 0.5);
			holes.push({ x: cx, y: h * fy, w: ww, h: h * fh, kind });
		}
	return wall(k, { w, h, t, x, y, z, ry, holes, mat, col, frame, sill, frameCol });
}

/** Dört cepheli kutu yapı: kat kat pencere sıraları gerçek oyuk. sides: [ön, sağ, arka, sol] pencere sayısı. */
export function block(k, { w, d, h, x = 0, y = 0, z = 0, ry = 0, t = 0.025, sides = [4, 3, 4, 3], rows = [[0.25, 0.45]], ww = 0.035, kind = 'round', mat = H.ASHLAR, col = COL.CREAM, frame = 0, roof = 'flat', roofCol = COL.LEAD, frameCol = null }) {
	k.push().move(x, y, z).rot(0, ry, 0);
	const faces = [
		[0, d / 2 - t / 2, 0, w],
		[w / 2 - t / 2, 0, Math.PI / 2, d - 2 * t],
		[0, -d / 2 + t / 2, Math.PI, w],
		[-w / 2 + t / 2, 0, -Math.PI / 2, d - 2 * t],
	];
	faces.forEach(([fx, fz, fr, fw], i) => {
		const n = sides[i] || 0;
		facadeRow(k, { w: fw, h, t, x: fx, z: fz, ry: fr, n, rows: n ? rows : [], ww, kind, mat, col, frame, frameCol });
	});
	// iç karanlık (oyuklardan bakınca boşluk görünmesin) ve tavan
	k.mc(H.STONE, '#2a2420').box(w - 2 * t - 0.002, h * 0.98, d - 2 * t - 0.002, 0, 0, 0);
	if (roof === 'flat') k.mc(H.LEAD, roofCol).flat().box(w + 0.01, 0.012, d + 0.01, 0, h, 0).soft();
	k.pop();
	return k;
}

/** Altın alem: çubuk, boğumlar, hilal. s ölçek (1 ≈ 0,1 birim boy). */
export function alem(k, x, y, z, s = 1, crescent = true) {
	k.mc(H.GOLD, COL.GOLD);
	k.cyl(0.0035 * s, 0.0045 * s, 0.07 * s, 6, x, y, z);
	k.sphere(0.012 * s, s > 0.6 ? 8 : 6, x, y + 0.018 * s, z);
	k.sphere(0.009 * s, 6, x, y + 0.042 * s, z);
	k.sphere(0.006 * s, 5, x, y + 0.06 * s, z);
	if (crescent) {
		// hilal: boynuzları yukarı bakan yay (boşluk tepede)
		const arc = Math.PI * 1.4;
		const g = new THREE.TorusGeometry(0.014 * s, 0.003 * s, 4, s > 0.6 ? 12 : 8, arc);
		g.rotateZ(Math.PI / 2 - (arc + Math.PI * 2) / 2);
		k.add(g, new THREE.Matrix4().makeTranslation(x, y + 0.084 * s, z));
	}
	return k;
}

/**
 * Kurşun kubbe: yarım küre (yassılık sy), kaburga dikişleri (ribs), dipte taş bilezik; isteğe bağlı kasnak
 * (pencereli, payandalı) ve alem.
 */
export function dome(k, { r, x = 0, y = 0, z = 0, sy = 1, ribs = 16, col = COL.LEAD, mat = H.LEAD, seg = 28, alemS = 0, ring = true, ringCol = COL.CREAM, drum = null }) {
	let y0 = y;
	if (drum) {
		drumPart(k, { r: r * 1.0, x, y, z, ...drum });
		y0 = y + drum.h;
	}
	if (ring) k.mc(H.ASHLAR, ringCol).flat().cyl(r * 1.04, r * 1.06, r * 0.08, Math.max(12, ribs), x, y0, z).soft();
	const yb = y0 + (ring ? r * 0.08 : 0);
	const n = k._n(seg);
	const g = new THREE.SphereGeometry(r, n, Math.max(4, Math.round(n / 3)), 0, Math.PI * 2, 0, Math.PI / 2);
	k.mc(mat, col).uvGeo(ribs, 8).add(g, new THREE.Matrix4().compose(new THREE.Vector3(x, yb, z), new THREE.Quaternion(), new THREE.Vector3(1, sy, 1)));
	k.uvBox();
	if (alemS) alem(k, x, yb + r * sy - 0.003, z, alemS);
	return yb + r * sy;
}

/** Kasnak: çokgen, her yüzde gerçek kemerli pencere, köşelerde payanda. */
export function drumPart(k, { r, h, x = 0, y = 0, z = 0, n = 16, ww = 0.5, wh = 0.62, col = COL.CREAM, mat = H.ASHLAR, buttress = true, kind = 'round' }) {
	const side = 2 * r * Math.sin(Math.PI / n);
	const t = r * 0.09;
	const ap = r * Math.cos(Math.PI / n);
	k.push().move(x, y, z);
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2;
		const sx = Math.sin(a) * (ap - t / 2);
		const sz = Math.cos(a) * (ap - t / 2);
		wall(k, { w: side * 1.02, h, t, x: sx, z: sz, ry: a, holes: [{ x: 0, y: h * 0.18, w: side * ww, h: h * wh, kind }], mat, col, dark: true });
		if (buttress) {
			const b = a + Math.PI / n;
			k.mc(mat, col, 0.97).flat().box(side * 0.18, h * 0.9, t * 1.6, Math.sin(b) * (r + t * 0.2), 0, Math.cos(b) * (r + t * 0.2), b).soft();
		}
	}
	k.mc(H.STONE, '#16120f').cyl(ap - t, ap - t, h, n, 0, 0, 0, true);
	k.pop();
}

/** Yarım kubbe (doğuya/batıya açılan): phi açılma yönü. */
export function semiDome(k, { r, x = 0, y = 0, z = 0, phi = 0, sy = 1, col = COL.LEAD, ribs = 8 }) {
	const n = k._n(20);
	const g = new THREE.SphereGeometry(r, n, Math.max(4, Math.round(n / 3)), phi, Math.PI, 0, Math.PI / 2);
	k.mc(H.LEAD, col).uvGeo(ribs, 8).add(g, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, sy, 1)));
	k.uvBox();
}

/** Mukarnas dişleri: halka boyunca aşağı sarkan küçük kademeli prizmalar (şerefe altı, taç kapı). */
export function muqarnasRing(k, { r, y, x = 0, z = 0, n = 16, d = 0.012, rows = 2, col = COL.CREAM, mat = H.STONE }) {
	k.mc(mat, col).flat();
	for (let j = 0; j < rows; j++) {
		const rr = r - j * d * 0.9;
		const m = n - j * 2;
		for (let i = 0; i < m; i++) {
			const a = ((i + j * 0.5) / m) * Math.PI * 2;
			const g = new THREE.ConeGeometry(d * 0.75, d * 1.3, 4, 1, true);
			g.rotateX(Math.PI);
			g.rotateY(Math.PI / 4 - a);
			k.add(g, new THREE.Matrix4().makeTranslation(x + Math.sin(a) * rr, y - j * d * 1.15 - d * 0.65, z + Math.cos(a) * rr));
		}
	}
	k.soft();
}

/**
 * Osmanlı minaresi: kare kürsü, pabuç, çokgen gövde, şerefe(ler) (mukarnaslı altlık, taş korkuluk), petek,
 * kurşun külah, alem. h toplam boy (yaklaşık), r gövde yarıçapı.
 */
export function minaret(k, x, z, { h, r = 0.022, y0 = 0, balconies = 1, col = COL.LIME, mat = H.ASHLAR, cap = COL.LEAD, sides = 12, base = true, capH = 0.22, alemS = 0.9 }) {
	let y = y0;
	if (base) {
		const bh = h * 0.07;
		k.mc(mat, col, 0.96).flat().box(r * 3.1, bh, r * 3.1, x, y, z);
		k.mc(H.STONE, col, 1.03).box(r * 3.3, r * 0.25, r * 3.3, x, y + bh, z);
		y += bh + r * 0.25;
		k.mc(mat, col).cyl(r * 1.15, r * 1.55, h * 0.05, 8, x, y, z);
		y += h * 0.05;
	}
	const body = h * (0.78 - capH) - (y - y0);
	const bodyTop = y + body;
	k.mc(mat, col).flat().uvBox().cyl(r * 0.92, r, body, sides, x, y, z).soft();
	const sc = r / 0.022;
	for (let b = 0; b < balconies; b++) {
		const by = bodyTop - body * 0.17 * (balconies - 1 - b);
		const rr = r * 0.93;
		// altlık: dışa açılan kademeler ve mukarnas dişleri
		k.mc(H.STONE, col, 0.98).flat().lathe([[rr, -0.03 * sc], [rr * 1.25, -0.019 * sc], [rr * 1.55, -0.009 * sc], [rr * 1.85, 0.0], [0, 0.0]], sides * 2, x, by, z).soft();
		muqarnasRing(k, { r: rr * 1.5, y: by - 0.004 * sc, x, z, n: sides * 2, d: r * 0.3, rows: k.seg < 1 ? 1 : 2, col, mat: H.STONE });
		// döşeme ve taş korkuluk (oyma)
		k.mc(H.STONE, col, 1.04).cyl(rr * 1.9, rr * 1.9, r * 0.12, sides * 2, x, by, z);
		k.mc(H.CARVE, col, 1.02).cyl(rr * 1.84, rr * 1.84, r * 0.75, sides * 2, x, by + r * 0.12, z, true);
		k.mc(H.STONE, col, 1.05).cyl(rr * 1.92, rr * 1.92, r * 0.1, sides * 2, x, by + r * 0.87, z);
	}
	// petek ve külah
	const py = bodyTop + r * 0.97;
	k.mc(mat, col, 1.02).flat().cyl(r * 0.8, r * 0.84, h * 0.07, sides, x, py, z).soft();
	const cy = py + h * 0.07;
	k.mc(H.STONE, col, 1.05).cyl(r * 0.92, r * 0.92, r * 0.12, sides, x, cy, z);
	k.mc(H.LEAD, cap).uvGeo(sides, 3).add(new THREE.ConeGeometry(r * 0.9, h * capH, k._n(sides * 2), 3, true).translate(0, (h * capH) / 2, 0), new THREE.Matrix4().makeTranslation(x, cy + r * 0.12, z));
	k.uvBox();
	alem(k, x, cy + r * 0.12 + h * capH - 0.004, z, alemS * (r / 0.022));
	return cy + h * capH;
}

/** Klasik sütun: kaide (torus kuşaklar), yivli gövde (hafif şişkin), başlık (korint/iyon), tabla. */
export function column(k, x, y, z, { h, r, order = 'corinthian', col = COL.MARBLE, mat = H.MARBLE, flutes = 20, broken = 0 }) {
	const bh = r * 0.9;
	k.mc(mat, col).soft();
	k.box(r * 2.6, r * 0.35, r * 2.6, x, y, z);
	k.lathe([[r * 1.3, 0], [r * 1.32, r * 0.18], [r * 1.12, r * 0.28], [r * 1.05, r * 0.38], [r * 1.18, r * 0.48], [r * 1.0, r * 0.55], [r * 0.98, bh - r * 0.35], [0, bh - r * 0.35]], 18, x, y + r * 0.35, z);
	const sh = h - bh - (order === 'none' ? 0 : r * 2.2);
	const shaft = sh * (1 - broken);
	const n = Math.max(12, k._n(flutes * 2));
	const g = new THREE.CylinderGeometry(r * 0.86, r, shaft, n, 4, true);
	const p = g.getAttribute('position');
	for (let i = 0; i < p.count; i++) {
		const a = Math.atan2(p.getZ(i), p.getX(i));
		const t = p.getY(i) / shaft + 0.5;
		const f = (1 - 0.06 * Math.max(0, Math.cos(a * flutes))) * (1 + 0.03 * Math.sin(t * Math.PI));
		p.setX(i, p.getX(i) * f);
		p.setZ(i, p.getZ(i) * f);
	}
	g.computeVertexNormals();
	k.mc(mat, col).add(g.translate(0, shaft / 2, 0), new THREE.Matrix4().makeTranslation(x, y + bh, z));
	if (broken > 0) {
		k.mc(mat, col, 0.95).flat().cyl(r * 0.88, r * 0.88, r * 0.12, 9, x, y + bh + shaft - r * 0.06, z).soft();
		return y + bh + shaft;
	}
	const cy = y + bh + shaft;
	if (order === 'corinthian') {
		k.mc(H.CARVE, col, 1.02).lathe([[r * 0.88, 0], [r * 0.95, r * 0.5], [r * 1.15, r * 1.1], [r * 1.45, r * 1.6], [0, r * 1.6]], 16, x, cy, z);
		// köşe sarmalları
		for (let i = 0; i < 4; i++) {
			const a = Math.PI / 4 + (i * Math.PI) / 2;
			k.mc(mat, col).sphere(r * 0.28, 6, x + Math.cos(a) * r * 1.35, cy + r * 1.35, z + Math.sin(a) * r * 1.35);
		}
		k.mc(mat, col, 1.03).flat().box(r * 3.0, r * 0.45, r * 3.0, x, cy + r * 1.6, z).soft();
		return cy + r * 2.05;
	}
	if (order === 'ionic') {
		k.mc(mat, col).cyl(r * 1.0, r * 0.9, r * 0.35, 16, x, cy, z);
		for (const s of [-1, 1]) {
			const v = new THREE.CylinderGeometry(r * 0.42, r * 0.42, r * 2.3, 12).rotateX(Math.PI / 2);
			k.mc(H.CARVE, col).add(v, new THREE.Matrix4().makeTranslation(x + s * r * 1.05, cy + r * 0.55, z));
		}
		k.mc(mat, col, 1.03).flat().box(r * 2.9, r * 0.35, r * 2.6, x, cy + r * 0.85, z).soft();
		return cy + r * 1.2;
	}
	if (order === 'doric') {
		k.mc(mat, col).lathe([[r * 0.88, 0], [r * 1.3, r * 0.45], [0, r * 0.45]], 16, x, cy, z);
		k.mc(mat, col, 1.03).flat().box(r * 2.7, r * 0.45, r * 2.7, x, cy + r * 0.45, z).soft();
		return cy + r * 0.9;
	}
	return cy;
}

/** Klasik saçak: arşitrav (üç kuşak), friz (oyma), korniş (dişli). x0→x1 boyunca, z önde. */
export function entablature(k, { x0, x1, y, z = 0, d = 0.06, h = 0.06, col = COL.MARBLE, ry = 0 }) {
	const w = x1 - x0;
	const cx = (x0 + x1) / 2;
	k.push().rot(0, ry, 0);
	k.flat();
	k.mc(H.MARBLE, col).box(w, h * 0.12, d, cx, y, z);
	k.mc(H.MARBLE, col, 1.02).box(w + 0.004, h * 0.13, d + 0.004, cx, y + h * 0.12, z);
	k.mc(H.MARBLE, col, 1.04).box(w + 0.008, h * 0.13, d + 0.008, cx, y + h * 0.25, z);
	k.mc(H.CARVE, col).box(w, h * 0.3, d, cx, y + h * 0.38, z);
	const nd = Math.floor(w / 0.012);
	k.mc(H.MARBLE, col, 1.03);
	for (let i = 0; i < nd; i++) k.box(0.006, h * 0.08, 0.008, x0 + (i + 0.5) * (w / nd), y + h * 0.68, z + d / 2 + 0.003);
	k.mc(H.MARBLE, col, 1.06).box(w + 0.03, h * 0.08, d + 0.03, cx, y + h * 0.76, z);
	k.mc(H.MARBLE, col, 1.0).box(w + 0.036, h * 0.16, d + 0.036, cx, y + h * 0.84, z);
	k.soft();
	k.pop();
	return y + h;
}

/** Üçgen alınlık: tabanda w genişlik, h yükseklik; tympanum oyma. */
export function pediment(k, { w, h, y, x = 0, z = 0, d = 0.06, col = COL.MARBLE, ry = 0 }) {
	const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
	k.flat();
	k.mc(H.CARVE, col).slab(s, d, x, y, z, ry);
	// eğimli korniş
	const L = Math.hypot(w / 2, h);
	const a = Math.atan2(h, w / 2);
	for (const sg of [-1, 1]) {
		k.push().move(x, y, z).rot(0, ry, 0).move((sg * w) / 4, h / 2, 0).rot(0, 0, -sg * a);
		k.mc(H.MARBLE, col, 1.05).box(L + 0.02, 0.012, d + 0.02, 0, -0.006, 0);
		k.pop();
	}
	k.mc(H.MARBLE, col, 1.05).box(w + 0.02, 0.008, d + 0.02, x, y, z, ry);
	k.soft();
}

/** Kemerli revak: x0→x1 arası n göz; mermer sütunlar, sivri kemerler, üstte küçük kubbeler (isteğe bağlı). */
export function arcade(k, { x0, x1, z = 0, y = 0, h = 0.12, n = 5, depth = 0.08, col = COL.CREAM, mat = H.ASHLAR, colCol = COL.MARBLE, domes = true, domeCol = COL.LEAD, kind = 'pointed', ry = 0, back = true, backCol = null }) {
	const w = x1 - x0;
	const bay = w / n;
	const cx = (x0 + x1) / 2;
	k.push().rot(0, ry, 0);
	const sp = h * 0.62; // kemer başlangıcı (sütun boyu)
	const holes = [];
	for (let i = 0; i < n; i++) holes.push({ x: -w / 2 + bay * (i + 0.5), y: -0.001, w: bay * 0.82, h: h * 0.86, kind });
	wall(k, { w: w + bay * 0.18, h, t: 0.014, x: cx, y, z: z + depth / 2, holes, mat, col, glass: false });
	for (let i = 0; i <= n; i++) {
		const xx = x0 + bay * i;
		if (i > 0 && i < n) {
			k.mc(H.MARBLE, colCol).cyl(bay * 0.07, bay * 0.075, sp, 10, xx, y, z + depth / 2);
			k.mc(H.CARVE, colCol).cyl(bay * 0.11, bay * 0.075, bay * 0.12, 8, xx, y + sp - bay * 0.12, z + depth / 2);
		}
	}
	if (back) k.mc(mat, backCol || col, 0.92).flat().box(w, h, 0.012, cx, y, z - depth / 2 + 0.006).soft();
	k.mc(H.STONE, '#3b322c').box(w, 0.004, depth, cx, y + 0.001, z);
	k.mc(mat, col, 1.03).flat().box(w + bay * 0.2, h * 0.12, depth + 0.02, cx, y + h, z).soft();
	if (domes) for (let i = 0; i < n; i++) dome(k, { r: Math.min(bay, depth) * 0.42, x: x0 + bay * (i + 0.5), y: y + h * 1.12, z, ribs: 8, seg: 14, alemS: 0.35, ring: true, col: domeCol });
	k.pop();
}

/** Kırma (dört yüzlü) kiremit çatı, saçak taşmalı: w × d taban, h yükseklik. Desen eğim boyunca. */
export function roofHip(k, { w, d, h, x = 0, y = 0, z = 0, ry = 0, col = COL.ROOF, over = 0.015, ridge = 0.3 }) {
	const W = w / 2 + over;
	const D = d / 2 + over;
	const rr = Math.max(0, W - D) * ridge * 2;
	const r = Math.min(rr, W * 0.9);
	const pos = [];
	const T = [-r / 2, h, 0];
	const T2 = [r / 2, h, 0];
	const A = [-W, 0, D], B = [W, 0, D], C = [W, 0, -D], Dd = [-W, 0, -D];
	const tri = (a, b, c) => pos.push(...a, ...b, ...c);
	tri(A, B, T2);
	tri(A, T2, T);
	tri(C, Dd, T);
	tri(C, T, T2);
	tri(B, C, T2);
	tri(Dd, A, T);
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	// eğim boyunca desen: her yüzde v = eğim uzaklığı, u = saçak boyunca
	k.mc(H.RTILE, col).flat();
	k.push().move(x, y, z).rot(0, ry, 0);
	k.add(g);
	k.pop();
	// kenar mahyaları
	k.soft();
	return y + h;
}

/** Beşik çatı (iki yüz) + alınlık duvarları. */
export function roofGable(k, { w, d, h, x = 0, y = 0, z = 0, ry = 0, col = COL.ROOF, over = 0.012, wallCol = null, wallMat = H.PLASTER }) {
	const W = w / 2 + over;
	const D = d / 2 + over;
	const pos = [-W, 0, D, W, 0, D, W, h, 0, -W, 0, D, W, h, 0, -W, h, 0, W, 0, -D, -W, 0, -D, -W, h, 0, W, 0, -D, -W, h, 0, W, h, 0];
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	k.push().move(x, y, z).rot(0, ry, 0);
	k.mc(H.RTILE, col).flat().add(g);
	if (wallCol) {
		const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h * 0.96)]);
		for (const sx of [-1, 1]) k.mc(wallMat, wallCol).slab(s, 0.01, (sx * w) / 2 - sx * 0.005, 0, 0, Math.PI / 2);
	}
	k.soft();
	k.pop();
}

/** Mazgal dişleri (x0,z0)→(x1,z1), y üstünde. */
export function crenel(k, x0, z0, x1, z1, y, { h = 0.03, w = 0.022, t = 0.025, gap = 0.016, col = COL.SAND, mat = H.ASHLAR } = {}) {
	const L = Math.hypot(x1 - x0, z1 - z0);
	const n = Math.max(1, Math.floor(L / (w + gap)));
	const ry = -Math.atan2(z1 - z0, x1 - x0);
	k.mc(mat, col).flat();
	for (let i = 0; i < n; i++) {
		const t0 = (i + 0.5) / n;
		k.box(w, h, t, x0 + (x1 - x0) * t0, y, z0 + (z1 - z0) * t0, ry);
	}
	k.soft();
}

/** Sur duvarı parçası: kalın duvar + yürüyüş yolu + mazgal + mazgal deliği. */
export function curtain(k, x0, z0, x1, z1, { h = 0.18, t = 0.05, y = 0, col = COL.SAND, mat = H.ASHLAR, slits = true, batter = 0 }) {
	const L = Math.hypot(x1 - x0, z1 - z0);
	const ry = -Math.atan2(z1 - z0, x1 - x0);
	const cx = (x0 + x1) / 2;
	const cz = (z0 + z1) / 2;
	k.mc(mat, col).flat();
	if (batter > 0) {
		// şevli taban
		const s = new THREE.Shape([new THREE.Vector2(-t / 2 - batter, 0), new THREE.Vector2(t / 2 + batter, 0), new THREE.Vector2(t / 2, h * 0.3), new THREE.Vector2(-t / 2, h * 0.3)]);
		const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
		g.deleteAttribute('uv');
		g.translate(0, 0, -L / 2);
		g.rotateY(Math.PI / 2);
		k.add(g, new THREE.Matrix4().compose(new THREE.Vector3(cx, y, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)));
	}
	k.box(L, h, t, cx, y, cz, ry);
	crenel(k, x0, z0, x1, z1, y + h, { col, mat, t: t * 0.4, h: h * 0.16, w: h * 0.12, gap: h * 0.08 });
	if (slits) {
		const n = Math.max(1, Math.floor(L / 0.07));
		const nx = Math.sin(-ry);
		const nzz = Math.cos(-ry);
		k.mc(H.WIN, '#120f0c');
		for (let i = 0; i < n; i++) {
			const tt = (i + 0.5) / n;
			for (const s of [1, -1]) k.box(0.006, h * 0.2, 0.004, x0 + (x1 - x0) * tt + (s * nx * t) / 2, y + h * 0.55, z0 + (z1 - z0) * tt + (s * nzz * t) / 2, ry);
		}
	}
	k.soft();
}

/** Yuvarlak burç: gövde, kuşak, mazgal halkası; isteğe bağlı külah. */
export function towerRound(k, x, z, { r = 0.06, h = 0.26, y = 0, col = COL.SAND, mat = H.ASHLAR, cap = null, capH = 0.1, merlons = true, slits = 3 }) {
	k.mc(mat, col).uvGeo(2 * Math.PI * r * 1.03, h).cyl(r, r * 1.06, h, 20, x, y, z).uvBox();
	k.mc(H.STONE, col, 1.04).cyl(r * 1.08, r * 1.04, h * 0.05, 20, x, y + h, z);
	if (merlons) {
		const n = Math.max(6, Math.round(r * 110));
		k.mc(mat, col).flat();
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2;
			k.box(r * 0.32, h * 0.12, r * 0.22, x + Math.cos(a) * r * 0.98, y + h * 1.05, z + Math.sin(a) * r * 0.98, -a + Math.PI / 2);
		}
		k.soft();
	}
	if (cap) k.mc(cap === COL.ROOF ? H.RTILE : H.LEAD, cap).uvGeo(12, 3).add(new THREE.ConeGeometry(r * 1.1, capH, k._n(20), 3, true).translate(0, capH / 2, 0), new THREE.Matrix4().makeTranslation(x, y + h * 1.05, z)).uvBox();
	k.mc(H.WIN, '#120f0c');
	for (let i = 0; i < slits; i++) {
		const a = (i / slits) * Math.PI * 2 + 0.4;
		k.box(0.007, h * 0.16, 0.004, x + Math.cos(a) * r * 1.04, y + h * 0.55, z + Math.sin(a) * r * 1.04, -a + Math.PI / 2);
	}
}

/** Kare burç. */
export function towerSquare(k, x, z, { w = 0.1, h = 0.26, y = 0, col = COL.SAND, mat = H.ASHLAR, ry = 0, cap = null, capH = 0.08, merlons = true, win = 1 }) {
	k.mc(mat, col).flat().box(w, h, w, x, y, z, ry);
	k.mc(H.STONE, col, 1.04).box(w * 1.08, h * 0.04, w * 1.08, x, y + h, z, ry);
	if (merlons) {
		const c = Math.cos(ry), s = Math.sin(ry);
		const P = (u, v) => [x + u * c + v * s, z - u * s + v * c];
		const hw = (w * 1.04) / 2;
		const corners = [P(-hw, hw), P(hw, hw), P(hw, -hw), P(-hw, -hw)];
		for (let i = 0; i < 4; i++) {
			const [ax, az] = corners[i];
			const [bx, bz] = corners[(i + 1) % 4];
			crenel(k, ax, az, bx, bz, y + h * 1.04, { h: h * 0.12, w: w * 0.16, t: w * 0.1, gap: w * 0.1, col, mat });
		}
	}
	if (cap) k.mc(H.RTILE, cap).flat().cone(w * 0.78, capH, 4, x, y + h * 1.04, z, ry + Math.PI / 4).soft();
	if (win)
		for (let i = 0; i < 4; i++) {
			const a = ry + (i * Math.PI) / 2;
			k.push().move(x, y, z).rot(0, a, 0);
			k.mc(H.WIN, '#120f0c').slab(toShape(openingPts('round', 0, 0, w * 0.16, h * 0.18)), 0.004, 0, h * 0.62, w / 2 + 0.001);
			k.pop();
		}
	k.soft();
}

/** Merdiven: n basamak, genişlik w, toplam yükseklik h ve derinlik d; +z'ye iner. */
export function stairs(k, { w, h, d, n = 6, x = 0, y = 0, z = 0, ry = 0, col = COL.MARBLE, mat = H.MARBLE }) {
	k.push().move(x, y, z).rot(0, ry, 0);
	k.flat();
	for (let i = 0; i < n; i++) k.mc(mat, col, i % 2 ? 1 : 0.97).box(w, (h * (n - i)) / n, d / n, 0, 0, -d / 2 + (d / n) * (i + 0.5));
	k.soft();
	k.pop();
}

/** Yuvarlak taçlı ağaç: gövde + 3–5 topak (yumuşak, pürüzlü; topaklar önbellekten). */
export function tree(k, x, z, s = 1, R = Math.random, y = 0, col = null) {
	k.mc(H.WOOD, COL.TRUNK).cyl(0.006 * s, 0.011 * s, 0.07 * s, 6, x, y, z);
	const c = col || COL.LEAF[Math.floor(R() * COL.LEAF.length)];
	const n = 3 + Math.floor(R() * 3);
	for (let i = 0; i < n; i++) {
		const a = R() * Math.PI * 2;
		const rr = i === 0 ? 0 : 0.025 * s;
		const r = 0.034 * s * (i === 0 ? 1.2 : 0.75 + R() * 0.3);
		const sd = Math.floor(R() * 6);
		_M.compose(_V.set(x + Math.cos(a) * rr, y + 0.085 * s + (i ? R() * 0.03 * s : 0.015 * s), z + Math.sin(a) * rr), _Q.identity(), _S.set(r, r, r));
		k.mc(H.LEAF, c, 0.85 + R() * 0.3).cached('blob' + sd, () => blob(1, sd * 37 + 5, 1), _M);
	}
}
const _M = new THREE.Matrix4();
const _V = new THREE.Vector3();
const _S = new THREE.Vector3();
const _Q = new THREE.Quaternion();

/** Pürüzlü yumuşak topak (ağaç tacı, çalı). */
export function blob(r, seed, detail = 1, amp = 0.28, sy = 1) {
	let g = new THREE.IcosahedronGeometry(1, detail);
	g.deleteAttribute('normal');
	g.deleteAttribute('uv');
	g = mergeVertices(g);
	const p = g.getAttribute('position');
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
		const f = 1 + amp * (vn3(x * 2.3 + seed, y * 2.3, z * 2.3) - 0.5) * 2;
		p.setXYZ(i, x * r * f, y * r * f * sy, z * r * f);
	}
	g.computeVertexNormals();
	return g;
}

/** Servi (gövdesi önbellekten, boyca ölçeklenir). */
export function cypress(k, x, z, s = 1, y = 0) {
	k.mc(H.WOOD, COL.TRUNK).cyl(0.005 * s, 0.007 * s, 0.03 * s, 5, x, y, z);
	const n = k._n(10);
	_M.compose(_V.set(x, y + 0.02 * s, z), _Q.identity(), _S.set(s, s, s));
	k.mc(H.LEAF, COL.CYP).cached('cyp' + n, () => {
		const g = new THREE.LatheGeometry([[0, 0], [0.022, 0.02], [0.028, 0.07], [0.025, 0.13], [0.017, 0.19], [0.006, 0.235], [0, 0.25]].map(([a, b]) => new THREE.Vector2(a, b)), n);
		g.deleteAttribute('normal');
		const m = mergeVertices(g);
		const p = m.getAttribute('position');
		for (let i = 0; i < p.count; i++) {
			const f = 1 + 0.18 * (vn3(p.getX(i) * 90, p.getY(i) * 60, p.getZ(i) * 90) - 0.5);
			p.setX(i, p.getX(i) * f);
			p.setZ(i, p.getZ(i) * f);
		}
		m.computeVertexNormals();
		return m;
	}, _M);
}

/** Çam: üç kat pürüzlü koni (önbellekten, dört çeşit). */
export function pine(k, x, z, s = 1, y = 0, R = Math.random) {
	k.mc(H.WOOD, COL.TRUNK).cyl(0.006 * s, 0.009 * s, 0.06 * s, 5, x, y, z);
	const sd = Math.floor(R() * 4);
	const n = k._n(9);
	[[0.065, 0.13, 0.04], [0.05, 0.12, 0.11], [0.034, 0.1, 0.18]].forEach(([r, h, yy], j) => {
		_M.compose(_V.set(x, y + (yy + h / 2) * s, z), _Q.setFromAxisAngle(_V2.set(0, 1, 0), sd * 1.3 + j), _S.set(s, s, s));
		k.mc(H.LEAF, COL.PINE, 0.9 + R() * 0.2).cached(`pine${n},${j},${sd}`, () => {
			let g = new THREE.ConeGeometry(r, h, n, 2);
			g.deleteAttribute('normal');
			g.deleteAttribute('uv');
			g = mergeVertices(g);
			const p = g.getAttribute('position');
			for (let i = 0; i < p.count; i++) {
				const f = 1 + 0.25 * (vn3(p.getX(i) * 140 + sd * 10, p.getY(i) * 140, p.getZ(i) * 140) - 0.5);
				p.setX(i, p.getX(i) * f);
				p.setZ(i, p.getZ(i) * f);
			}
			g.computeVertexNormals();
			return g;
		}, _M);
	});
}
const _V2 = new THREE.Vector3();

/** Kaya kütlesi: gürültüyle bozulmuş yumuşak küre (katmanlı kaya deseni). */
export function rockMass(k, { rx, ry, rz, x = 0, y = 0, z = 0, seed = 1, detail = 3, col = '#9a8b78', col2 = null, amp = 0.32, freq = 1.6, rot = 0, mat = H.ROCK, flatBottom = true }) {
	let g = new THREE.IcosahedronGeometry(1, Math.max(1, Math.round(detail * (k.seg < 1 ? 0.8 : 1))));
	g.deleteAttribute('normal');
	g.deleteAttribute('uv');
	g = mergeVertices(g);
	const p = g.getAttribute('position');
	for (let i = 0; i < p.count; i++) {
		let px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
		const n1 = vn3(px * freq + seed * 3.7, py * freq, pz * freq);
		const n2 = vn3(px * freq * 3.1, py * freq * 3.1 + seed, pz * freq * 3.1);
		const f = 1 + amp * ((n1 - 0.5) * 1.6 + (n2 - 0.5) * 0.5);
		px *= f;
		py *= f;
		pz *= f;
		if (flatBottom && py < -0.2) py = -0.2 + (py + 0.2) * 0.2;
		p.setXYZ(i, px * rx, py * ry, pz * rz);
	}
	g.computeVertexNormals();
	g.rotateY(rot);
	if (col2) k.grad(col, col2, y - ry * 0.3, y + ry);
	else k.color(col);
	k._mat = mat;
	k.add(g, new THREE.Matrix4().makeTranslation(x, y, z));
}

/**
 * Avlu zemini: yapının çevresine serilir (araziye oturur). İç kısım döşeme (PAVE), orta halka çimen/toprak, dış
 * halka arazi tonuna karışır ve kenarı toprağa gömülür. rz eliptiklik; ox/oz kaydırma.
 */
export function ground(k, r, { pave = '#cdbfa3', paveR = 0.62, mid = null, midMat = H.GRASS, rz = 1, ox = 0, oz = 0, jit = 0.04, rect = 0 } = {}) {
	const S = k.site;
	const hf = (x, z) => {
		const d = Math.hypot((x - S.x - ox * S.s) / (r * S.s), (z - S.z - oz * S.s) / (r * rz * S.s));
		const t = Math.min(1, Math.max(0, (d - 0.72) / 0.28));
		return S.y + (k.hf(x, z) - S.y) * t * t * (3 - 2 * t);
	};
	const seg = Math.max(24, Math.round(56 * k.seg));
	const ring = (r0, r1, y0, y1) => {
		const pos = [];
		const rad = (a, rr) => rr * (1 + jit * (Math.sin(a * 3 + 1.7) * 0.6 + Math.sin(a * 7 + 4.1) * 0.4));
		const sq = (a, rr) => {
			if (!rect) return [Math.cos(a) * rad(a, rr), Math.sin(a) * rad(a, rr) * rz];
			// yuvarlatılmış dikdörtgen (döşeli meydan)
			const c = Math.cos(a), s = Math.sin(a);
			const m = Math.pow(Math.pow(Math.abs(c), 6) + Math.pow(Math.abs(s), 6), 1 / 6);
			return [(c / m) * rr, (s / m) * rr * rz];
		};
		for (let i = 0; i < seg; i++) {
			const a0 = (i / seg) * Math.PI * 2;
			const a1 = ((i + 1) / seg) * Math.PI * 2;
			const [o0x, o0z] = sq(a0, r1);
			const [o1x, o1z] = sq(a1, r1);
			if (r0 <= 0) {
				pos.push(0, y0, 0, o1x, y1, o1z, o0x, y1, o0z);
				continue;
			}
			const [i0x, i0z] = sq(a0, r0);
			const [i1x, i1z] = sq(a1, r0);
			pos.push(i0x, y0, i0z, o1x, y1, o1z, o0x, y1, o0z, i0x, y0, i0z, i1x, y0, i1z, o1x, y1, o1z);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		return g;
	};
	k.push().move(ox, 0, oz);
	const pr = r * paveR;
	k.flat();
	// avlunun bütün halkaları grup 200 (heroes.js vGnd): haritadaki ekran boyu kahramanı haritadaki yalın kopyanın
	// avlusuna oturur (kendi avlusu çizilmez; kıyıda ya da harita kenarında havada disk kalmaz)
	k.group(200);
	k.mc(H.PAVE, pave);
	const nIn = 4;
	for (let i = 0; i < nIn; i++) k.drape(ring((pr * i) / nIn, (pr * (i + 1)) / nIn, 0.003, 0.003), hf, 0, k.tagAt);
	const t = k.tone;
	if (mid) k.mc(midMat, mid);
	else {
		k.raw(t.r * 1.05, t.g * 1.05, t.b * 1.02);
		k._mat = midMat;
	}
	k.drape(ring(pr, r * 0.78, 0.003, 0.002), hf, 0, k.tagAt);
	k.raw(t.r, t.g, t.b);
	k._mat = H.GRASS;
	k.drape(ring(r * 0.78, r * 0.9, 0.002, 0.0), hf, 0, k.tagAt);
	k.drape(ring(r * 0.9, r, 0.0, -0.03), hf, 0, k.tagAt);
	k.group(0);
	k.soft();
	k.pop();
}

/** Türk bayrağı: direk + dalgalanan bez (al zemin, ay yıldız iki yüzde); bez +x yönünde. */
export function flag(k, x, y, z, pole, w) {
	const h = w * (2 / 3);
	k.mc(H.METAL, '#d9dde2').cyl(0.0025, 0.004, pole, 8, x, y, z);
	k.mc(H.GOLD, COL.GOLD).sphere(0.006, 8, x, y + pole + 0.004, z);
	const top = y + pole - 0.003;
	k.push().move(x, top, z).rot(0, -(k.site?.ry || 0), 0);
	const cloth = (geo, col, dz) => {
		geo.translate(0, 0, dz);
		const g = geo.index ? geo.toNonIndexed() : geo;
		const p = g.getAttribute('position');
		const u = [];
		for (let i = 0; i < p.count; i++) u.push(Math.max(0, p.getX(i)) / w);
		const start = k.count;
		k.mc(H.FLAG, col).flat();
		k.add(g);
		for (let i = 0; i < u.length; i++) k.uvs[(start + i) * 2] = u[i];
		k.soft();
	};
	cloth(new THREE.PlaneGeometry(w, h, 12, 2).translate(w / 2, -h / 2, 0), COL.RED, 0);
	for (const s of [1, -1]) {
		const e = 0.0008 * s;
		const cx = 0.5 * h;
		const cy = -h / 2;
		const disc = (r, ox, col, dz) => {
			const g = new THREE.CircleGeometry(r, 20).translate(cx + ox, cy, 0);
			if (s < 0) g.rotateY(Math.PI).translate(2 * (cx + ox), 0, 0);
			cloth(g, col, dz);
		};
		disc(h * 0.25, 0, COL.WHITE, e);
		disc(h * 0.2, h * 0.0625, COL.RED, e * 2);
		const sh = new THREE.Shape();
		for (let i = 0; i < 10; i++) {
			const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
			const rr = i % 2 ? h * 0.05 : h * 0.125;
			if (i) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
			else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
		}
		const st = new THREE.ShapeGeometry(sh).rotateZ(Math.PI / 2).translate(cx + h * 0.35, cy, 0);
		if (s < 0) st.rotateY(Math.PI).translate(2 * (cx + h * 0.35), 0, 0);
		cloth(st, COL.WHITE, e * 3);
	}
	k.pop();
}

/** Osmanlı konağı: taş zemin kat, çıkmalı beyaz üst kat(lar), ahşap çatkı, pencere sıraları, kırma kiremit çatı. */
export function konak(k, { x, z, y: y0 = 0, ry = 0, w = 0.2, d = 0.16, floors = 2, s = 1, R = Math.random, plaster = COL.WHITE, stone = '#bfae90', roofCol = COL.ROOF, wood = '#6b4328' }) {
	k.push().move(x, y0, z).rot(0, ry, 0).scale(s);
	const gh = 0.07;
	k.mc(H.ASHLAR, stone).flat().box(w, gh, d, 0, 0, 0);
	k.mc(H.WOOD, wood).box(0.03, 0.05, 0.004, -w * 0.25, 0, d / 2 + 0.001);
	let y = gh;
	let W = w;
	let D = d;
	for (let f = 0; f < floors; f++) {
		const fh = 0.07;
		W += 0.02;
		D += 0.016;
		// çıkma altı payandaları
		k.mc(H.WOOD, wood);
		for (const dx of [-0.4, 0, 0.4]) k.box(0.006, 0.012, 0.012, dx * W, y - 0.012, D / 2 - 0.006);
		k.mc(H.PLASTER, plaster).box(W, fh, D, 0, y, 0);
		// pencereler: ön ve yan cephede sıra (kayıtlı, koyu cam)
		const nf = Math.max(2, Math.round(W / 0.045));
		for (let i = 0; i < nf; i++) {
			const cx = -W / 2 + (W / nf) * (i + 0.5);
			k.mc(H.WOOD, wood).box(0.026, 0.042, 0.003, cx, y + 0.014, D / 2 + 0.0005);
			k.mc(H.WIN, COL.GLASS).box(0.02, 0.036, 0.003, cx, y + 0.017, D / 2 + 0.0012);
			k.mc(H.WOOD, wood).box(0.0025, 0.036, 0.0035, cx, y + 0.017, D / 2 + 0.0014);
		}
		const ns = Math.max(1, Math.round(D / 0.05));
		for (let i = 0; i < ns; i++) {
			const cz = -D / 2 + (D / ns) * (i + 0.5);
			for (const sx of [-1, 1]) {
				k.mc(H.WOOD, wood).box(0.003, 0.042, 0.026, sx * (W / 2 + 0.0005), y + 0.014, cz);
				k.mc(H.WIN, COL.GLASS).box(0.003, 0.036, 0.02, sx * (W / 2 + 0.0012), y + 0.017, cz);
			}
		}
		// ahşap kuşak ve köşe dikmeleri
		k.mc(H.WOOD, wood).box(W + 0.002, 0.005, D + 0.002, 0, y, 0).box(W + 0.002, 0.004, D + 0.002, 0, y + fh - 0.004, 0);
		for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.005, fh, 0.005, (sx * W) / 2, y, (sz * D) / 2);
		y += fh;
	}
	k.soft();
	roofHip(k, { w: W, d: D, h: 0.06 + W * 0.15, y, col: roofCol, over: 0.022 });
	k.mc(H.BRICK, '#b9a58a').flat().box(0.016, 0.05, 0.016, W * 0.22, y + 0.02, -D * 0.15).soft();
	k.pop();
}

/** Taş ev (Mardin, Güneydoğu): kübik, düz damlı, kemerli pencereler ve revak, korkuluk. */
export function tasEv(k, { x, z, y = 0, ry = 0, w = 0.16, d = 0.12, h = 0.1, col = '#d9b98a', arches = 2, R = Math.random }) {
	k.push().move(x, y, z).rot(0, ry, 0);
	k.mc(H.ASHLAR, col).flat().box(w, h, d, 0, 0, 0);
	const holes = [];
	for (let i = 0; i < arches; i++) holes.push({ x: -w / 2 + (w / arches) * (i + 0.5), y: h * 0.25, w: (w / arches) * 0.45, h: h * 0.55, kind: R() < 0.5 ? 'pointed' : 'round' });
	wall(k, { w, h, t: 0.01, z: d / 2 + 0.004, holes, mat: H.ASHLAR, col, frame: 0.004, frameCol: '#e8d2a6' });
	k.mc(H.ASHLAR, col, 1.04).flat().box(w + 0.006, 0.012, d + 0.006, 0, h, 0);
	k.mc(H.WIN, '#2a1d14').box(0.022, 0.04, 0.003, w * 0.3, 0, -d / 2 - 0.001);
	k.soft();
	k.pop();
}
