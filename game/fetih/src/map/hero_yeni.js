// Kahraman maketler v1.0 (Kuşbakışı yakın çekimi, ikinci kuşak): v0.9'da "topak ve kutu yığını" okunan yapılar
// gerçek siluetleriyle yeniden. Yöntem: kaba kaya topakları (rockMass) yerine yükseklik alanı (hfield: yamaç,
// uçurum, teras, tümülüs; köşe başına renk) ve yontulmuş baş (sculpt: kürenin yüz hatlarıyla bozulması).
//
//   Pamukkale   yamaçtan sarkan kıvrımlı traverten havuzları (dalgalı dudak, damla saçak, turkuaz su), Hierapolis
//   Sümela      Karadağ'ın dik uçurumundaki kovuğa gömülü çok katlı krem cephe, ormanlı vadi, su kemeri
//   Nemrut      çakıl tümülüs, teras basamakları, tahtlı gövdeler; yüzlü, taçlı/külahlı dev başlar, kartal, aslan
//   Hasankeyf   Dicle kıyısında sarp kayalık, mağara evler, El Rızk minaresi, Zeynel Bey Türbesi, köprü ayakları
//   Mardin      ovaya bakan yamaçta teras teras bal rengi evler, Zinciriye kubbeleri, Ulu Cami minaresi, kale
//   Hattuşa     Aslanlı Kapı: dev çokgen taşlar, parabolik kemer, iki aslan protomu, toprak sur seddi
//   Zeugma      Fırat kıyısında yamaçtaki villalar: mozaikli odalar, kırmızı sıvalı peristil, gezi iskelesi
//   Truva       Tevfikiye'deki ahşap at: tahta kaplamalı gövde, pencereli karın, yeleli boyun, merdiven
//   Göbeklitepe kazı çukurunda dairesel kuru taş duvarlar, ışınsal T dikilitaşlar, ortada kollu iki büyük taş
//   Amasya, Myra kaya duvarı (rockWall) ve içine oyulmuş mezar cepheleri

import * as THREE from 'three';
import { H, COL, wall, block, dome, ground, tree, cypress, pine, roofGable, openingPts, column, entablature, curtain, towerRound, muqarnasRing, blob, vn3, alem, tasEv, konak } from './hero_parts.js';
import { cavea, lycian } from './hero_antik.js';

const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const sm = (a, b, x) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
const fbm = (x, y, z, o = 3) => {
	let s = 0;
	let a = 0.5;
	let f = 1;
	for (let i = 0; i < o; i++) {
		s += a * vn3(x * f, y * f, z * f);
		f *= 2.03;
		a *= 0.5;
	}
	return s / (1 - Math.pow(0.5, o));
};
/** İki sRGB rengin doğrusal karışımı (yeniden kullanılan nesne: hemen okunmalı). */
const mixc = (a, b, t) => _c.set(a).lerp(_c2.set(b), Math.min(1, Math.max(0, t)));

/**
 * Yükseklik alanı (yerel): x0..x1 × z0..z1, hücre boyu cell (kademe 0'da 1,35 katı). h(x, z) yükseklik; col(x, y,
 * z, ny, v, nx, nz) THREE.Color (doğrusal; mixc ile) köşe rengi; keep(x, z, y) false ise o hücre çizilmez (su: arazinin altında
 * kalan hücreler). Dönen: { h: ızgara yükseklikleri, nx, nz } (aynı ızgarada ikinci katman için).
 */
function hfield(k, { x0, x1, z0, z1, cell, h, col, mat = H.ROCK, keep = null, grid = null, M = null }) {
	const c = cell * (k.seg < 1 ? 1.4 : 1);
	const nx = Math.max(2, Math.round((x1 - x0) / c));
	const nz = Math.max(2, Math.round((z1 - z0) / c));
	const n = (nx + 1) * (nz + 1);
	const pos = new Float32Array(n * 3);
	const hs = grid ? grid.h : new Float32Array(n);
	for (let j = 0; j <= nz; j++)
		for (let i = 0; i <= nx; i++) {
			const v = j * (nx + 1) + i;
			const x = x0 + ((x1 - x0) * i) / nx;
			const z = z0 + ((z1 - z0) * j) / nz;
			const y = h(x, z, v, hs);
			pos[v * 3] = x;
			pos[v * 3 + 1] = y;
			pos[v * 3 + 2] = z;
			if (!grid) hs[v] = y;
		}
	const idx = [];
	for (let j = 0; j < nz; j++)
		for (let i = 0; i < nx; i++) {
			const a = j * (nx + 1) + i;
			const b = a + 1;
			const d = a + nx + 1;
			const e = d + 1;
			if (keep && !keep(a, b, d, e, pos)) continue;
			idx.push(a, d, b, b, d, e);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	const nr = g.getAttribute('normal').array;
	const cl = new Float32Array(n * 3);
	for (let v = 0; v < n; v++) {
		const r = col(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], nr[v * 3 + 1], v, nr[v * 3], nr[v * 3 + 2]);
		cl[v * 3] = r.r;
		cl[v * 3 + 1] = r.g;
		cl[v * 3 + 2] = r.b;
	}
	g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
	k._mat = mat;
	k.soft();
	k.add(g, M);
	return { h: hs, nx, nz };
}

/** Geometriyi köşe başına bir işlevle boz (yontma): f(v: Vector3 birim kürede) → yeni konum (yerinde). */
function sculpt(geo, f) {
	geo.deleteAttribute('normal');
	geo.deleteAttribute('uv');
	const g = mergeV(geo);
	const p = g.getAttribute('position');
	const v = new THREE.Vector3();
	for (let i = 0; i < p.count; i++) {
		v.fromBufferAttribute(p, i);
		f(v);
		p.setXYZ(i, v.x, v.y, v.z);
	}
	g.computeVertexNormals();
	return g;
}
/** Konumu aynı köşeleri birleştir (yumuşak normal için). */
function mergeV(g) {
	const p = g.getAttribute('position');
	const map = new Map();
	const idx = [];
	const out = [];
	const src = g.index ? g.index.array : null;
	const cnt = src ? src.length : p.count;
	for (let i = 0; i < cnt; i++) {
		const v = src ? src[i] : i;
		const key = `${Math.round(p.getX(v) * 1e4)},${Math.round(p.getY(v) * 1e4)},${Math.round(p.getZ(v) * 1e4)}`;
		let j = map.get(key);
		if (j === undefined) {
			j = out.length / 3;
			map.set(key, j);
			out.push(p.getX(v), p.getY(v), p.getZ(v));
		}
		idx.push(j);
	}
	const r = new THREE.BufferGeometry();
	r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
	r.setIndex(idx);
	g.dispose();
	return r;
}
const gauss = (d, w) => Math.exp(-(d * d) / (w * w));
const M4 = (x, y, z, sx = 1, sy = sx, sz = sx, ry = 0, rx = 0, rz = 0) =>
	new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

// ------------------------------------------------------------------ Pamukkale

/**
 * Traverten basamakları: yamaç boyunca N dudak (lip); her dudak kıvrımlı (yarım ay kabarcıklar: havuzların dışa
 * taşan kenarları), arkasında sığ havuz (turkuaz su), önünde aşağıdaki havuza sarkan damla saçaklı perde.
 */
function travertine(R, N) {
	const lips = [];
	let z = -0.36;
	let y = 0.44;
	for (let i = 0; i < N; i++) {
		const lobes = [];
		let x = -0.66 + R() * 0.08;
		while (x < 0.66) {
			const hw = 0.05 + R() * 0.11;
			lobes.push([x + hw, hw, 0.03 + R() * 0.05]);
			x += hw * 2 * (0.75 + R() * 0.3);
		}
		const dh = 0.036 + R() * 0.03;
		// bazı dudaklar yamacın yalnız bir bölümünde: basamaklar yan yana kayar (düz şerit olmasın)
		const part = i > 0 && i < N - 1 && R() < 0.4;
		const a = part ? (R() < 0.5 ? -0.7 : -0.1 + R() * 0.3) : -9;
		const b = part ? (a < -0.5 ? -0.15 + R() * 0.35 : 9) : 9;
		lips.push({ z, dh, lobes, ph: R() * 9, a, b });
		z += 0.07 + R() * 0.045;
	}
	return lips;
}
function lipZ(L, x) {
	if (x < L.a || x > L.b) return 9;
	let m = -1;
	for (const [c, hw, a] of L.lobes) {
		const u = (x - c) / hw;
		if (u > -1 && u < 1) m = Math.max(m, a * Math.sqrt(1 - u * u));
	}
	// dudak uçlarında basamak yavaşça söner (yan duvar sert kesilmesin)
	const e = Math.min(x - L.a, L.b - x);
	return L.z + Math.max(0, m) + 0.006 * Math.sin(x * 23 + L.ph) + (e < 0.06 ? (0.06 - e) * 1.5 : 0);
}

/**
 * Dikey kaya duvarı (uçurum): yerel x0..x1, yükseklik 0..y1; yüz z0'da öne bakar (+z). Dikey çatlaklar, yatay
 * katmanlar, tepede geriye kıvrılan sırt; niches: kayaya oyulmuş dikdörtgen/kemerli girintiler {x, y, w, h, d}
 * (mezar cepheleri bunların içine konur). Dönen D(u, v): yüzün o noktadaki z'si (yerleştirme için).
 */
function rockWall(k, { x0, x1, y1, z0, foot = 0.06, col = ['#7c7266', '#ab9f8c'], moss = '#6f7d4a', niches = [], cell = 0.016 }) {
	const D = (u, v) => {
		let d = z0 + 0.03 * (fbm(u * 6, v * 1.5, 13) - 0.5) + 0.016 * (vn3(u * 30, v * 3, 4) - 0.5) + 0.01 * Math.sin(v * 24 + u * 2);
		for (const n of niches) {
			const ex = Math.abs(u - n.x) / (n.w / 2);
			const top = n.arch ? n.y + n.h - (n.w / 2) * (1 - Math.sqrt(Math.max(0, 1 - Math.min(1, ex) ** 2))) : n.y + n.h;
			if (ex < 1 && v > n.y && v < top) d -= n.d * sm(1, 0.92, ex) * sm(n.y, n.y + 0.006, v) * sm(top, top - 0.006, v);
		}
		if (v < foot) d = Math.max(d, z0 + ((foot - v) / foot) * 0.12);
		const yt = y1 - 0.06 + 0.16 * (fbm(u * 2.6, 0, 17) - 0.5) - 0.1 * Math.abs(u);
		d -= 0.5 * sm(yt - 0.1, yt + 0.06, v) + 0.25 * sm(0.0, 0.14, Math.min(u - x0, x1 - u) < 0.14 ? 0.14 - Math.min(u - x0, x1 - u) : 0);
		return d;
	};
	k.push().rot(Math.PI / 2, 0, 0);
	hfield(k, {
		x0,
		x1,
		z0: -(y1 + 0.12),
		z1: 0,
		cell,
		mat: H.ROCK,
		h: (u, zz) => D(u, -zz),
		col: (u, d, zz, ny, v, nx, nz) => {
			const vv = -zz;
			const n = fbm(u * 8, vv * 3, 21);
			const c = mixc(col[0], col[1], n * 0.8 + 0.2 * vn3(u * 40, vv * 2, 5)).clone();
			return c.lerp(_c2.set(moss), sm(0.5, 0.85, Math.max(0, -nz)) * (0.3 + 0.5 * n));
		},
	});
	k.pop();
	return D;
}

export const YENI = {
	// ---------------------------------------------------------------- Amasya: Harşena uçurumu, Kral Kaya Mezarları
	*amasya(k, R) {
		ground(k, 0.8, { pave: '#a9a487', paveR: 0.3, jit: 0.05 });
		// Harşena Dağı'nın dik kaya yüzü: Pontus krallarının mezarları kayaya oyulmuş yüksek kemerli girintilerde
		const tombs = [[-0.36, 0.2, 0.13, 0.24], [-0.14, 0.26, 0.14, 0.27], [0.1, 0.24, 0.13, 0.25], [0.32, 0.18, 0.12, 0.22]];
		const D = rockWall(k, { x0: -0.82, x1: 0.82, y1: 0.78, z0: -0.3, niches: tombs.map(([x, y, w, h]) => ({ x, y, w: w + 0.05, h: h + 0.05, d: 0.09, arch: true })), col: ['#7a6f62', '#a99c87'] });
		for (const [x, y, w, h] of tombs) {
			// mezar odası cephesi: girintinin dibinde düz yüz, kapı, üstte üçgen alınlık izi
			const z = D(x, y + h / 2) - 0.0;
			k.mc(H.ASHLAR, '#b2a48a').uvS(0.45).flat().box(w, h, 0.05, x, y, z - 0.02).uvS(1);
			k.mc(H.WIN, '#2e251d').box(w * 0.28, h * 0.22, 0.006, x, y + h * 0.1, z + 0.006);
			k.mc(H.ASHLAR, '#bcae94').prism([[-w / 2, 0], [0, h * 0.18], [w / 2, 0]].map(([a, b]) => [a, -b]), 0.0, x, y + h, z).soft();
			// mezara inen basamaklar ve kayadaki tünel ağzı
			k.mc(H.ASHLAR, '#9f927c').flat().box(w * 0.5, 0.01, 0.06, x, y - 0.01, z + 0.03).soft();
		}
		// kayanın tepesinde Amasya Kalesi surları
		curtain(k, -0.5, -0.66, 0.4, -0.7, { h: 0.06, y: 0.72, t: 0.03, col: '#9b8e7a' });
		yield;
		// Yeşilırmak ve kıyıda Yalıboyu evleri (taş temel, çıkmalı ahşap üst kat, kırma çatı)
		k.mc(H.WATER, '#3b7d78').flat().box(1.64, 0.004, 0.2, 0, 0.004, 0.28).soft();
		const C = ['#f1e6d0', '#e9c79a', '#f4ede0', '#d8a07a', '#e6d3a8', '#c98d6c'];
		for (let i = 0; i < 7; i++) konak(k, { x: -0.54 + i * 0.18, z: 0.06 + (i % 2) * 0.02, ry: 0, w: 0.14, d: 0.12, floors: 2, s: 0.85, R, plaster: C[i % C.length], stone: '#a99778' });
		yield;
		// taş köprü ve ağaçlar
		wall(k, { w: 0.2, h: 0.07, t: 0.06, x: 0.62, y: 0.0, z: 0.28, ry: Math.PI / 2, holes: [{ x: 0, y: 0, w: 0.11, h: 0.06, kind: 'round' }], col: '#a59780', glass: false });
		for (const [x, z] of [[-0.66, 0.46], [0.5, 0.48], [0.0, 0.48], [-0.3, 0.5]]) tree(k, x, z, 1, R);
		for (let i = 0; i < 6; i++) tree(k, -0.7 + i * 0.28, -0.12, 0.8, R);
	},

	// ---------------------------------------------------------------- Myra (Demre): Likya kaya mezarları ve tiyatro
	*myra(k, R) {
		ground(k, 0.8, { pave: '#c6b796', paveR: 0.3 });
		// akropol kayalığının dik yüzü: ev tipi mezar cepheleri kayaya oyulmuş, kademe kademe
		const tombs = [[-0.42, 0.08, 0.12, 0.1, false], [-0.26, 0.14, 0.11, 0.1, true], [-0.1, 0.06, 0.13, 0.12, false], [0.06, 0.18, 0.12, 0.1, true], [0.22, 0.08, 0.11, 0.1, false], [0.38, 0.2, 0.1, 0.09, false], [-0.18, 0.3, 0.12, 0.1, true], [0.1, 0.34, 0.11, 0.09, false], [-0.38, 0.3, 0.1, 0.09, false], [0.32, 0.36, 0.1, 0.08, true], [-0.02, 0.46, 0.1, 0.08, false]];
		const D = rockWall(k, { x0: -0.82, x1: 0.82, y1: 0.66, z0: -0.3, foot: 0.04, niches: tombs.map(([x, y, w, h, p]) => ({ x, y: y - 0.01, w: w + 0.03, h: h + (p ? 0.05 : 0.03), d: 0.05 })), col: ['#9d8d74', '#cbbd9f'], moss: '#7e8a52' });
		for (const [x, y, , w, h, p] of tombs.map((t) => [t[0], t[1], 0, t[2], t[3], t[4]])) lycian(k, x, y, D(x, y + h / 2) + 0.01, 0, w, h, p);
		yield;
		// Roma tiyatrosu (önde): yamaca yaslanan oturma sıraları, sahne binası kalıntısı
		cavea(k, { r0: 0.1, r1: 0.34, n: 9, a0: Math.PI * 0.55, a1: Math.PI * 1.45, dh: 0.018, z: 0.36, col: '#d6c7a9', col2: '#cbbb9c', aisles: 6 });
		wall(k, { w: 0.44, h: 0.1, t: 0.03, z: 0.42, holes: [-0.12, 0, 0.12].map((x) => ({ x, y: 0, w: 0.05, h: 0.07, kind: 'round' })), col: '#cbbb9c', dark: true });
		for (const [x, z] of [[-0.6, 0.3], [0.6, 0.26], [0.55, 0.55], [-0.5, 0.06], [0.5, 0.04]]) tree(k, x, z, 1, R, 0, '#5e8f3e');
	},

	*pamukkale(k, R) {
		ground(k, 0.8, { pave: '#e9eeee', paveR: 0.45, mid: '#9fae74', midMat: H.GRASS });
		const N = k.seg < 1 ? 8 : 10;
		const lips = travertine(R, N);
				// travertenin yanları: yeşil-zeytin yamaç (aynı eğim, basamaksız), kenarda zemine iner
		const hill = (x, z) => {
			const t = sm(0.6, -0.42, z);
			return (0.012 + 0.49 * t * t * (3 - 2 * t) + 0.02 * (fbm(x * 3, 0, z * 3) - 0.5)) * sm(0.8, 0.5, Math.abs(x)) * sm(-0.8, -0.62, z);
		};
		const width = (z) => 0.5 + 0.08 * Math.sin(z * 6.0 + 1.0) + 0.06 * sm(-0.2, 0.5, z);
		const S = { tw: 0, cur: 0, rim: 0, pool: 0, lv: 0, ws: 0 };
		const Y0 = 0.5;
		const terr = (x, z) => {
			// geçilen dudaklar: yükseklik toplam düşüş; arkadaki en yakın dudak (perde) ve öndeki en yakın dudak (kenar)
			let drop = 0;
			let back = -9;
			let bdh = 0;
			let front = 9;
			let lv = 0;
			for (let i = 0; i < N; i++) {
				const L = lips[i];
				const zl = lipZ(L, x);
				if (zl < z) {
					drop += L.dh;
					lv++;
					if (zl > back) {
						back = zl;
						bdh = L.dh;
					}
				} else if (zl < front) front = zl;
			}
			const yShelf = Y0 - drop;
			const dFront = front - z;
			const dBack = z - back;
			// damla saçak: perde kenarı dikey oluklu (sarkıtlar), ızgaradan iri
			const fl = 0.006 * Math.sin(x * 52 + lv * 2.1) + 0.006 * (vn3(x * 22, lv, 0) - 0.5);
			const cw = 0.03;
			const db = dBack - fl;
			S.cur = 0;
			S.rim = 0;
			S.pool = 0;
			S.lv = lv;
			S.ws = yShelf + 0.004;
			if (bdh > 0 && db < cw) {
				// perde: üstte yuvarlanan dudak, altta havuza yayılan etek
				const t = Math.max(0, db / cw);
				const p = 1 - t * t * (1.6 - 0.6 * t);
				S.cur = 1 - t;
				return yShelf + bdh * p;
			}
			const rim = 0.012 * gauss(dFront, 0.014);
			const basin = 0.018 * sm(0.0, 0.035, dFront) * sm(cw, cw + 0.03, dBack);
			S.rim = gauss(dFront, 0.016);
			S.pool = sm(0.006, 0.03, dFront) * sm(cw, cw + 0.025, dBack);
			return yShelf + rim - basin;
		};
		const fieldH = (x, z) => {
			const hh = hill(x, z);
			const w = width(z) + 0.05 * (vn3(z * 9, 3, 1) - 0.5);
			let tw = sm(w + 0.05, w - 0.04, Math.abs(x)) * sm(0.56, 0.44, z);
			let y = hh;
			if (tw > 0.001) {
				const ty = terr(x, z);
				y = hh + (ty - hh) * tw;
			} else S.cur = S.rim = S.pool = S.lv = 0;
			if (z > 0.44) tw *= sm(0.6, 0.46, z);
			S.tw = tw;
			return y;
		};
		// köşe başına bilgi (renk ve su için)
		const info = [];
		const g = hfield(k, {
			x0: -0.8,
			x1: 0.8,
			z0: -0.8,
			z1: 0.64,
			cell: 0.013,
			mat: H.TRAV,
			h: (x, z, v) => {
				const y = fieldH(x, z);
				info[v] = [S.tw, S.cur, S.rim, S.pool, S.lv, S.ws];
				return y;
			},
			col: (x, y, z, ny, v) => {
				const [tw, cur, rim, pool] = info[v];
				const n = fbm(x * 14, y * 30, z * 14);
				// yamaç: kuru zeytin-yeşil çayır, kenarlarda kahve
				const grass = mixc('#8e9c62', '#b3b27a', n);
				// traverten: kalsit beyazı; perdelerde krem-bej yağmur izleri, havuz tabanında açık camgöbeği
				const wht = _c2.set('#f6fbff').clone();
				const cream = new THREE.Color('#ead9bd');
				const aq = new THREE.Color('#bfe7ea');
				const t = wht.lerp(cream, cur * (0.25 + 0.5 * vn3(x * 90, 0, 2)) + (1 - ny) * 0.12).lerp(aq, pool * 0.6);
				t.multiplyScalar(0.94 + 0.08 * rim);
				return grass.lerp(t, tw);
			},
		});
		yield;
		// su: aynı ızgarada; havuz düzeyi dudak tepesinin hemen altı, arazinin altında kalan hücreler çizilmez
		const W = new Float32Array(g.h.length);
		hfield(k, {
			x0: -0.8,
			x1: 0.8,
			z0: -0.8,
			z1: 0.64,
			cell: 0.013,
			mat: H.WATER,
			grid: g,
			h: (x, z, v, hs) => {
				// ıslak köşe: basamak havuzunun düzlemi (dudak ve perde onu örter); yamaç düşüyorsa kuru
				const [tw, , , , lv, ws] = info[v];
				const wet = tw > 0.75 && lv < N && (lv > 0 || (z > -0.6 && Math.abs(x + 0.1) < 0.2)) && hs[v] > ws - 0.026;
				W[v] = wet ? Math.max(0.0001, ws - hs[v]) : 0;
				return wet ? ws : hs[v] - 0.03;
			},
			keep: (a, b, d, e) => W[a] > 0 && W[b] > 0 && W[d] > 0 && W[e] > 0,
			col: (x, y, z, ny, v) => mixc('#a6e9ec', '#38bfd3', Math.min(1, W[v] / 0.018) * 0.85 + 0.15 * vn3(x * 20, 0, z * 20)),
		});
		yield;
		// Hierapolis: tepe düzlüğünde Frontinus caddesinin sütunları, yıkık bazilika duvarı, Antik Havuz
		const yt = Y0;
		for (let i = 0; i < 7; i++) {
			const x = -0.5 + i * 0.075;
			column(k, x, yt - 0.01, -0.62, { h: i % 3 === 1 ? 0.07 : 0.12 + (i % 2) * 0.025, r: 0.0105, order: i % 2 ? 'ionic' : 'corinthian', col: COL.MARBLE, broken: i % 3 === 1 ? 0.45 : 0 });
		}
		entablature(k, { x0: -0.53, x1: -0.3, y: yt + 0.12, z: -0.62, d: 0.03, h: 0.022, col: '#ece2cc' });
		wall(k, { w: 0.24, h: 0.11, t: 0.03, x: 0.36, y: yt - 0.01, z: -0.64, ry: -0.2, holes: [{ x: -0.06, y: 0, w: 0.05, h: 0.08, kind: 'round' }, { x: 0.05, y: 0, w: 0.05, h: 0.08, kind: 'round' }], col: '#d8cbb0', glass: false });
		// Antik Havuz (Kleopatra): devrik sütunlar suyun içinde
		k.mc(H.ASHLAR, '#d9cfbb').flat().cyl(0.11, 0.115, 0.02, 20, 0.12, yt - 0.016, -0.6).soft();
		k.mc(H.WATER, '#33c2d4').cyl(0.1, 0.1, 0.004, 20, 0.12, yt - 0.0, -0.6);
		for (const [x, z, a] of [[0.08, -0.62, 0.4], [0.16, -0.57, -0.8]]) {
			k.push().move(x, yt - 0.002, z).rot(0, a, Math.PI / 2);
			k.mc(H.MARBLE, '#efe8da').cyl(0.009, 0.009, 0.08, 10, 0, -0.04, 0);
			k.pop();
		}
		// zeytin, çam, servi: yamacın yanlarında
		for (const [x, z, s] of [[-0.66, 0.1, 1.0], [0.66, 0.04, 1.05], [-0.58, 0.38, 0.9], [0.6, 0.36, 0.95], [-0.62, -0.36, 1.0], [0.64, -0.4, 1.0], [0.42, -0.72, 0.9], [-0.7, 0.26, 0.8], [0.72, 0.2, 0.85], [-0.64, -0.12, 0.9], [0.62, -0.22, 0.95], [-0.5, -0.66, 0.9]]) tree(k, x, z, s, R, hill(x, z) - 0.005, R() < 0.5 ? '#6f8a3e' : '#5d7f3a');
		for (const [x, z] of [[-0.7, -0.12], [0.72, -0.18], [-0.34, -0.74]]) cypress(k, x, z, 1.1, hill(x, z) - 0.005);
	},

	// ---------------------------------------------------------------- Sümela: uçurumdaki kovuğa gömülü manastır
	*sumela(k, R) {
		ground(k, 0.8, { pave: '#4d6b3c', paveR: 0.3, mid: '#46663a' });
		// uçurum açık vadiye baksın: Sümela haritada dar bir vadide; Kuşbakışı kamerası sırtın örtmediği yandan (vadi
		// yönünden) girer, manastırın cephesi o yöne döner
		k.push().rot(0, -0.8, 0);
		// Karadağ'ın dik kaya duvarı: dikey yükseklik alanı (alan koordinatı u yatay, v yukarı; yükseklik öne doğru)
		const FOOT = 0.2; // uçurumun eteği (orman yamacı bunun altında öne doğru iner)
		const cave = (u, v) => {
			// kovuk: tabanı geniş, üstü kemer gibi daralan oyuk; manastır içine oturur
			const e = (u / 0.36) ** 2 + ((v - 0.3) / 0.5) ** 2 + 0.35 * (fbm(u * 5, v * 5, 7) - 0.5);
			return v > 0.27 ? sm(1.15, 0.75, e) : sm(0.24, 0.29, v) * sm(1.15, 0.75, e);
		};
		const D = (u, v) => {
			const strata = 0.035 * (fbm(u * 7, v * 1.6, 3) - 0.5) + 0.02 * (vn3(u * 26, v * 4, 9) - 0.5) + 0.012 * Math.sin(v * 21 + u * 3);
			let d = -0.3 + strata - 0.04 * Math.sin(u * 3.1);
			d -= 0.22 * cave(u, v);
			// orman yamacı (eteğe yığılmış moloz): öne ve aşağı iner
			if (v < FOOT) d = Math.max(d, -0.3 + ((FOOT - v) / FOOT) * 0.68 + 0.03 * (fbm(u * 5, v * 5, 1) - 0.5));
			// tepede kaya geriye kıvrılır (dağın sırtı), yanlarda vadi duvarı içe döner
			d -= 0.5 * sm(1.22, 1.45, v) + 0.34 * sm(0.42, 0.78, Math.abs(u) + 0.14 * (fbm(v * 4, u, 11) - 0.5)) + 0.06 * sm(0.7, 1.2, v);
			return d;
		};
		const slopeV = (z) => Math.max(0, ((0.38 - z) / 0.68) * FOOT);
		const mossK = [];
		k.push().rot(Math.PI / 2, 0, 0);
		hfield(k, {
			x0: -0.78,
			x1: 0.78,
			z0: -1.45,
			z1: 0,
			cell: 0.015,
			mat: H.ROCK,
			h: (u, zz, v) => {
				const vv = -zz;
				mossK[v] = vv < FOOT ? 1 - sm(FOOT - 0.04, FOOT + 0.02, vv) : 0;
				return D(u, vv);
			},
			col: (u, d, zz, ny, v, nx, nz) => {
				const vv = -zz;
				const up = Math.max(0, -nz); // dünyada yukarı bakan yüz (raf, kaya başı)
				const n = fbm(u * 9, vv * 3, 5);
				const streak = vn3(u * 40, vv * 2, 2);
				const rock = mixc('#55565a', '#8a8985', n * 0.8 + 0.2 * streak).multiplyScalar(cave(u, vv) > 0.5 ? 0.72 : 1).clone();
				const moss = new THREE.Color().set(n > 0.5 ? '#2f5129' : '#466b36');
				const forest = new THREE.Color('#33502c');
				return rock.lerp(moss, sm(0.45, 0.8, up) * (0.4 + 0.6 * n)).lerp(forest, mossK[v]);
			},
		});
		k.pop();
		yield;
		// manastır: kovuğun içinde dört katlı krem ana bina (1860'lar), sağda ve solda daha alçak bloklar; altında
		// kemerli taş istinat duvarı; kiremit damlar kaya tavanının altında
		const zb = -0.42;
		const C1 = '#efe6d2';
		const C2 = '#e6dcc4';
		k.mc(H.ASHLAR, '#a9a08e').uvS(0.7).flat().box(0.66, FOOT + 0.04, 0.2, 0.0, 0.04, zb + 0.02).uvS(1).soft();
		wall(k, { w: 0.6, h: 0.1, t: 0.02, y: FOOT - 0.02, z: zb + 0.13, holes: [-0.22, -0.11, 0, 0.11, 0.22].map((x) => ({ x, y: 0.01, w: 0.05, h: 0.07, kind: 'round' })), col: '#b3a993', dark: true });
		const yb = FOOT + 0.08;
		const bl = [
			// x, genişlik, kat, derinlik, z, renk
			[-0.02, 0.36, 4, 0.13, zb + 0.06, C1],
			[-0.27, 0.15, 3, 0.11, zb + 0.03, C2],
			[0.24, 0.16, 3, 0.11, zb + 0.04, C2],
		];
		for (const [x, w, fl, d, z, col] of bl) {
			const fh = 0.068;
			const h = fl * fh;
			const rows = [];
			for (let f = 0; f < fl; f++) rows.push([(f * fh + 0.018) / h, 0.036 / h]);
			block(k, { w, d, h, x, y: yb, z, sides: [Math.round(w / 0.036), 2, 0, 2], rows, ww: 0.017, kind: 'round', mat: H.PLASTER, col, frame: 0.003, frameCol: '#faf6ec', roof: 'none' });
			// kat kuşakları ve ahşap balkonlar
			for (let f = 1; f < fl; f++) k.mc(H.STONE, '#d9ceb6').flat().box(w + 0.006, 0.006, d + 0.006, x, yb + f * fh - 0.003, z).soft();
			if (fl === 4) for (const f of [1, 2]) k.mc(H.WOOD, '#6d4a2e').flat().box(w * 0.5, 0.004, 0.022, x, yb + f * fh, z + d / 2 + 0.011).box(w * 0.5, 0.016, 0.002, x, yb + f * fh + 0.004, z + d / 2 + 0.022).soft();
			roofGable(k, { w: w + 0.02, d: d + 0.02, h: 0.035, x, y: yb + h, z, col: '#b9533a' });
		}
		yield;
		// su kemeri: soldaki kayadan manastıra uzanan yüksek, dar kemerler
		const ax0 = -0.62;
		const ax1 = -0.36;
		const ay = yb + 0.05;
		const n = 4;
		for (let i = 0; i <= n; i++) {
			const x = ax0 + ((ax1 - ax0) * i) / n;
			k.mc(H.ASHLAR, '#b8ae98').uvS(0.8).flat().box(0.018, ay, 0.03, x, 0, zb + 0.08).uvS(1).soft();
		}
		wall(k, { w: ax1 - ax0 + 0.02, h: 0.07, t: 0.03, x: (ax0 + ax1) / 2, y: ay - 0.05, z: zb + 0.08, holes: Array.from({ length: n }, (_, i) => ({ x: -(ax1 - ax0) / 2 + ((i + 0.5) * (ax1 - ax0)) / n, y: 0, w: (ax1 - ax0) / n - 0.018, h: 0.045, kind: 'round' })), col: '#b8ae98', glass: false });
		// manastıra çıkan patika (yamaçta zikzak basamaklar)
		for (let i = 0; i < 12; i++) {
			const t = i / 11;
			const zz = 0.32 - t * 0.6;
			k.mc(H.PAVE, '#9b927f').flat().box(0.05, 0.01, 0.03, 0.34 - (i % 2) * 0.05 - t * 0.12, slopeV(zz), zz).soft();
		}
		yield;
		// orman: yamaçta sık ladin-göknar, kayanın tepesinde ve yanlarında
		for (let i = 0; i < 40; i++) {
			const x = -0.74 + R() * 1.48;
			const zz = -0.2 + R() * 0.6;
			// manastır cephesinin önü (kameranın baktığı koridor) açık kalır: orada yalnız alçak çalılık
			const open = Math.abs(x) < 0.36 && zz < 0.3;
			if (open && R() < 0.75) continue;
			pine(k, x, zz, open ? 0.55 + R() * 0.2 : 0.85 + R() * 0.45, slopeV(zz) - 0.01, R);
		}
		for (let i = 0; i < 12; i++) {
			const u = -0.7 + R() * 1.4;
			pine(k, u, D(u, 1.3) - 0.03 - R() * 0.12, 0.8 + R() * 0.4, 1.28 + R() * 0.05, R);
		}
		for (const sx of [-1, 1])
			for (let i = 0; i < 5; i++) {
				const v = 0.25 + i * 0.16;
				const u = sx * (0.6 + R() * 0.12);
				pine(k, u, D(u, v) + 0.03, 0.8 + R() * 0.3, v, R);
			}
		k.pop();
	},

	// ---------------------------------------------------------------- Nemrut Dağı: tümülüs, doğu terası, dev başlar
	*nemrut(k, R) {
		ground(k, 0.8, { pave: '#a49a88', paveR: 0.55, jit: 0.08, mid: '#958b78', midMat: H.DIRT });
		// zirvedeki yapay çakıl tepesi: içbükey yamaçlı, yuvarlak tepeli koni; ince çakıl dokusu
		const TC = -0.6;
		const tum = (x, z) => {
			const r = Math.hypot(x, (z - TC) * 1.05);
			const t = Math.max(0, 1 - r / 0.82);
			return 0.86 * Math.pow(t, 1.35) * (1 - 0.08 * Math.pow(t, 6)) + 0.006 * (fbm(x * 30, 1, z * 30) - 0.5) * sm(0.0, 0.1, t);
		};
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -1.4,
			z1: 0.2,
			cell: 0.016,
			mat: H.DIRT,
			h: (x, z) => tum(x, z),
			col: (x, y, z) => mixc('#8f8c86', '#c9c5bb', fbm(x * 40, y * 20, z * 40) * 0.7 + 0.3 * vn3(x * 120, 0, z * 120)).multiplyScalar(0.95 + 0.1 * sm(0.0, 0.5, y)),
		});
		yield;
		// doğu terası: taş döşeli düzlük, önde üç basamak; arkada beş dev oturan heykel (başları yerde)
		k.mc(H.PAVE, '#b7ab93').flat().uvS(0.45).box(1.14, 0.03, 0.62, 0, 0, 0.12).uvS(1);
		for (let i = 0; i < 3; i++) k.mc(H.ASHLAR, '#ab9f88').box(1.14 + i * 0.04, 0.012, 0.02, 0, 0.03 - (i + 1) * 0.01, 0.43 + i * 0.02);
		k.soft();
		const S1 = '#c9b994';
		const S2 = '#bba984';
		const bodyX = [-0.48, -0.24, 0, 0.24, 0.48];
		for (const x of bodyX) {
			// oturan dev heykel: üst üste kesme taş bloklar (derzler belli); kaide, taht, dizler, kucak, göğüs, omuzlar
			k.push().move(x, 0.03, -0.22).scale(1.15);
			k.mc(H.STONE, '#9f937c').flat();
			k.box(0.16, 0.05, 0.16, 0, 0, 0); // kaide
			k.box(0.15, 0.2, 0.06, 0, 0.05, -0.05); // taht sırtı
			k.mc(H.STONE, S1);
			k.box(0.06, 0.08, 0.05, -0.035, 0.05, 0.055).box(0.06, 0.08, 0.05, 0.035, 0.05, 0.055); // baldırlar
			k.box(0.13, 0.04, 0.11, 0, 0.13, 0.025); // kucak ve dizler
			k.box(0.115, 0.1, 0.07, 0, 0.17, -0.02); // gövde
			k.box(0.135, 0.045, 0.075, 0, 0.27, -0.02); // omuzlar
			k.mc(H.STONE, S2).box(0.032, 0.13, 0.05, -0.072, 0.15, 0.0).box(0.032, 0.13, 0.05, 0.072, 0.15, 0.0); // kollar
			k.box(0.032, 0.025, 0.06, -0.06, 0.15, 0.06).box(0.032, 0.025, 0.06, 0.06, 0.15, 0.06); // dizdeki eller
			k.box(0.05, 0.025, 0.05, 0, 0.315, -0.02); // boyun kütüğü
			k.uvS(1).soft();
			k.pop();
		}
		// iki uçta bekçi aslan ve kartal heykelleri (gövde)
		for (const sx of [-1, 1]) {
			const x = sx * 0.56;
			k.mc(H.ASHLAR, S2).uvS(0.45).flat().box(0.1, 0.06, 0.14, x, 0.03, -0.1).box(0.08, 0.12, 0.08, x, 0.09, -0.12).uvS(1).soft();
		}
		yield;
		// devrilmiş başlar: önde, yere dizili (aslan, kartal, Antiokhos, Kommagene, Zeus, Apollon, Herakles, kartal)
		const heads = [
			['kartal', -0.52, 0.12, 0.35],
			['tyche', -0.34, 0.3, 0.25],
			['kral', -0.15, 0.16, 0.1],
			['zeus', 0.05, 0.1, -0.05],
			['apollon', 0.24, 0.28, -0.2],
			['herakles', 0.42, 0.12, -0.3],
			['aslan', 0.58, 0.3, -0.45],
		];
		for (const [kind, x, z, ry] of heads) {
			nemrutHead(k, kind, x, 0.03, z, ry + (R() - 0.5) * 0.15, 0.105, R);
			yield;
		}
		// ateş sunağı (basamaklı) ve dikili kabartma stelleri; terasın dışında düşmüş taşlar
		for (let i = 0; i < 3; i++) k.mc(H.ASHLAR, '#b4a68c').flat().box(0.14 - i * 0.035, 0.025, 0.14 - i * 0.035, 0.62, 0.03 + i * 0.025, 0.28);
		for (let i = 0; i < 4; i++) {
			k.push().move(-0.66 + i * 0.012, 0.03, -0.02 + i * 0.1).rot(0, 1.3, 0);
			k.mc(H.CARVE, '#c3b393').box(0.08, 0.13, 0.02, 0, 0, 0);
			k.mc(H.ASHLAR, '#ab9d82').box(0.09, 0.02, 0.03, 0, 0, 0);
			k.pop();
		}
		for (let i = 0; i < 14; i++) k.mc(H.ROCK, '#b0a283').box(0.03 + R() * 0.04, 0.02 + R() * 0.02, 0.03 + R() * 0.03, (R() - 0.5) * 1.3, 0.0, 0.48 + R() * 0.2, R() * 3);
		k.soft();
	},

	// ---------------------------------------------------------------- Hasankeyf: Dicle, kale kayalığı, mağaralar
	*hasankeyf(k, R) {
		ground(k, 0.8, { pave: '#b9a585', paveR: 0.3, jit: 0.06, mid: '#9a9a62' });
		// karşı kıyıda sarp kale kayalığı (yatay katmanlı kireçtaşı), önünde dar kıyı, Dicle, beri kıyı
		const T = 0.56; // kayalığın tepesi
		const B = 0.05; // kıyı
		const W = 0.075; // uçurum yüzünün derinliği
		const zf = (x) => 0.0 + 0.07 * Math.sin(x * 4.2 + 0.6) + 0.05 * (fbm(x * 3, 2, 0) - 0.5) - 0.12 * sm(0.25, 0.6, x);
		const top = (x, z) => T - 0.12 * sm(0.15, 0.62, x) + 0.03 * (fbm(x * 6, 0, z * 6) - 0.5) - 0.2 * sm(-0.55, -0.8, x);
		const RV0 = 0.13;
		const RV1 = 0.44;
		const H0 = (x, z) => {
			const f = zf(x);
			if (z < f) {
				// uçurum: katman katman basamaklı yüz (yatay çıkıntılar), dikey yarıklar
				const t = sm(f - W, f, z + 0.012 * Math.sin(x * 37) * (fbm(x * 8, z * 8, 1) - 0.3));
				const tp = top(x, z);
				let y = tp + (B - tp) * t;
				const st = (y - B) / (tp - B);
				y += 0.016 * Math.sin(st * 26 + fbm(x * 4, 0, 1) * 3) * t * (1 - t) * 4;
				return y;
			}
			// kıyı ve nehir yatağı (beri kıyı önde)
			const bank = B + 0.02 * (fbm(x * 7, 3, z * 7) - 0.5);
			const bed = 0.0;
			return bank + (bed - bank) * sm(RV0, RV0 + 0.04, z) * sm(RV1, RV1 - 0.04, z);
		};
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -0.85,
			z1: 0.62,
			cell: 0.013,
			mat: H.ROCK,
			h: (x, z) => H0(x, z) * sm(0.82, 0.7, Math.abs(x)) + (Math.abs(x) > 0.7 ? 0 : 0),
			col: (x, y, z, ny) => {
				const n = fbm(x * 10, y * 25, z * 10);
				const rock = mixc('#9a8466', '#d6c4a0', n).lerp(_c2.set('#b98f72'), 0.35 * vn3(x * 14, y * 40, 3)).clone();
				const grass = new THREE.Color().set(n > 0.5 ? '#8c9256' : '#a9a46e');
				const silt = new THREE.Color('#9d8a69');
				// düz yerler (kayalık tepesi, kıyı) kuru çimen ve toprak; dik yüz kaya
				const flat = sm(0.75, 0.92, ny);
				const c = rock.lerp(y < 0.06 ? silt : grass, flat * (y < 0.06 ? 0.8 : 0.7));
				return c;
			},
		});
		yield;
		// Dicle: yeşil-bulanık su
		k.mc(H.WATER, '#4f8f86').flat().box(1.64, 0.004, RV1 - RV0 - 0.03, 0, 0.026, (RV0 + RV1) / 2).soft();
		// kayaya oyulmuş mağara evleri: uçurum yüzünde sıra sıra karanlık ağızlar, bazılarının önünde duvar
		let nc = 0;
		for (let row = 0; row < 4; row++)
			for (let i = 0; i < 9; i++) {
				const x = -0.6 + i * 0.13 + (R() - 0.5) * 0.06 + row * 0.03;
				const tp = top(x, zf(x) - W);
				const y = B + 0.05 + row * 0.085 + R() * 0.02;
				if (y > tp - 0.04 || R() < 0.2) continue;
				const st = 1 - (y - B) / (tp - B); // yüz boyunca konum (1 dip)
				const z = zf(x) - W + W * st + 0.008;
				const w = 0.03 + R() * 0.02;
				const h = 0.03 + R() * 0.02;
				k.push().move(x, y, z);
				k.mc(H.WIN, '#1c140e').slab(shape(openingPts(R() < 0.75 ? 'round' : 'rect', 0, 0, w, h)), 0.03, 0, 0, -0.012);
				if (R() < 0.3) k.mc(H.ASHLAR, '#b39c78').flat().box(w * 1.3, h * 0.45, 0.01, 0, 0, 0.02).soft();
				k.pop();
				if (++nc % 10 === 0) yield;
			}
		// tepede kale: kayalığın kenarı boyunca yıkık sur, Küçük Saray kalıntısı, Ulu Cami'nin kare minaresi
		const ex = [-0.5, -0.32, -0.14, 0.04, 0.2];
		for (let i = 0; i < ex.length - 1; i++) {
			const x0 = ex[i];
			const x1 = ex[i + 1] - 0.03;
			curtain(k, x0, zf(x0) - W - 0.02, x1, zf(x1) - W - 0.02, { h: 0.035 + R() * 0.03, y: top(x0, 0) - 0.01, t: 0.025, col: '#c2aa84', slits: false });
		}
		wall(k, { w: 0.2, h: 0.08, t: 0.025, x: -0.2, y: top(-0.2, -0.3) - 0.01, z: -0.3, holes: [-0.06, 0, 0.06].map((x) => ({ x, y: 0.0, w: 0.035, h: 0.06, kind: 'pointed' })), col: '#c8b08a', glass: false });
		k.mc(H.ASHLAR, '#c4ab85').flat().box(0.045, 0.16, 0.045, 0.02, top(0.02, -0.45) - 0.01, -0.45).soft();
		yield;
		// El Rızk Camii minaresi: kıyıda, silindir gövde, yazı kuşakları, mukarnaslı şerefe, leylek yuvası
		const mx = 0.38;
		const mz = zf(0.38) + 0.05;
		k.mc(H.ASHLAR, '#c2a986').flat().box(0.2, 0.05, 0.14, mx - 0.06, B, mz + 0.01).soft();
		wall(k, { w: 0.16, h: 0.05, t: 0.02, x: mx - 0.08, y: B + 0.05, z: mz + 0.07, holes: [{ x: -0.03, y: 0, w: 0.03, h: 0.04, kind: 'pointed' }, { x: 0.03, y: 0, w: 0.03, h: 0.04, kind: 'pointed' }], col: '#c2a986', glass: false });
		k.mc(H.ASHLAR, '#c8af8b').uvGeo(0.25, 0.42).cyl(0.03, 0.036, 0.36, 16, mx, B + 0.05, mz).uvBox();
		for (const y of [0.15, 0.25, 0.34]) k.mc(H.CARVE, '#d6bf99').cyl(0.038, 0.038, 0.016, 16, mx, B + y, mz);
		muqarnasRing(k, { r: 0.044, x: mx, y: B + 0.41, z: mz, n: 16, d: 0.009, rows: 2, col: '#cdb490' });
		k.mc(H.STONE, '#cdb490').cyl(0.05, 0.05, 0.007, 16, mx, B + 0.41, mz);
		k.mc(H.ASHLAR, '#d9c7a8').cyl(0.02, 0.022, 0.05, 12, mx, B + 0.417, mz);
		k.mc(H.WOOD, '#6b5a44').cyl(0.028, 0.02, 0.012, 10, mx, B + 0.467, mz);
		// Eski Köprü: nehirde iki dev ayak (sivri mahmuzlu), birinde kemer başlangıcı
		for (const [x, h] of [[-0.12, 0.25], [0.12, 0.29]]) {
			k.mc(H.ASHLAR, '#b8a07c').uvS(0.5).flat().box(0.09, h, 0.12, x, 0.0, (RV0 + RV1) / 2).uvS(1);
			k.mc(H.ASHLAR, '#b39b77').cone(0.07, 0.06, 4, x, h, (RV0 + RV1) / 2, Math.PI / 4);
			k.mc(H.ASHLAR, '#b8a07c').prism([[-0.045, 0.06], [0, 0.11], [0.045, 0.06]], h * 0.7, x, 0.0, (RV0 + RV1) / 2).soft();
		}
		k.push().move(0.12, 0.23, (RV0 + RV1) / 2);
		k.mc(H.ASHLAR, '#b39a76').add(new THREE.TorusGeometry(0.13, 0.03, 6, 12, Math.PI * 0.32).rotateZ(Math.PI * 0.52));
		k.pop();
		yield;
		// Zeynel Bey Türbesi: beri kıyıda, silindir tuğla gövde, firuze ve lacivert sırlı tuğla örgüsü, kubbe
		const tx = -0.36;
		const tz = 0.53;
		k.push().move(0, B - 0.01, 0);
		k.mc(H.BRICK, '#b5764e').cyl(0.075, 0.078, 0.15, 24, tx, 0, tz);
		// gövde baştan başa sırlı tuğla: firuze zemin, lacivert baklava kuşakları
		k.mc(H.GLAZE, '#33a6b2').cyl(0.0775, 0.0775, 0.105, 24, tx, 0.025, tz);
		for (const y of [0.045, 0.085]) k.mc(H.GLAZE, '#21508c').cyl(0.0779, 0.0779, 0.008, 24, tx, y, tz);
		k.mc(H.GLAZE, '#e9e1cf').cyl(0.0779, 0.0779, 0.006, 24, tx, 0.12, tz);
		k.mc(H.BRICK, '#a96f49').cyl(0.066, 0.074, 0.03, 24, tx, 0.15, tz);
		k.mc(H.BRICK, '#a86e48').add(new THREE.LatheGeometry([[0.066, 0], [0.062, 0.02], [0.05, 0.04], [0.03, 0.052], [0, 0.056]].map(([a, b]) => new THREE.Vector2(a, b)), k._n(20)), new THREE.Matrix4().makeTranslation(tx, 0.18, tz));
		k.push().move(tx, 0.02, tz + 0.077);
		k.mc(H.WIN, '#1b130d').slab(shape(openingPts('pointed', 0, 0, 0.03, 0.06)), 0.01, 0, 0, -0.004);
		k.pop();
		k.pop();
		// kavaklar ve meyve bahçeleri iki kıyıda
		for (const [x, z] of [[-0.62, 0.52], [-0.18, 0.55], [0.0, 0.58], [0.5, 0.5], [0.64, 0.1], [-0.66, 0.08], [0.55, 0.06]]) cypress(k, x, z, 1.15, B - 0.01);
		for (const [x, z] of [[-0.5, 0.56], [0.3, 0.56], [0.62, 0.55], [-0.48, 0.07]]) tree(k, x, z, 0.95, R, B - 0.01, '#6a8f3e');
	},
	// ---------------------------------------------------------------- Mardin: ovaya bakan yamaçta teras teras taş evler
	*mardin(k, R) {
		ground(k, 0.8, { pave: '#c9ab7c', paveR: 0.3, mid: '#c6ad80', midMat: H.DIRT });
		// yamaç: önde Mezopotamya ovasına iner, arkada kale kayalığı (dik kaya yüzü, düz tepe)
		const hill = (x, z) => {
			const y = 0.03 + Math.max(0, 0.56 - z) * 0.5 + 0.015 * (fbm(x * 5, 0, z * 5) - 0.5);
			const rock = 0.2 * sm(-0.36, -0.46, z + 0.04 * Math.sin(x * 7));
			return (y + rock) * sm(0.84, 0.62, Math.abs(x)) + 0.03 * (1 - sm(0.84, 0.62, Math.abs(x)));
		};
		hfield(k, {
			x0: -0.84,
			x1: 0.84,
			z0: -0.84,
			z1: 0.62,
			cell: 0.021,
			mat: H.ROCK,
			h: hill,
			col: (x, y, z, ny) => {
				const n = fbm(x * 9, y * 20, z * 9);
				const rock = mixc('#a88c66', '#cfb48a', n).clone();
				return rock.lerp(_c2.set(n > 0.5 ? '#b9a272' : '#a99a64'), sm(0.8, 0.95, ny) * 0.55);
			},
		});
		yield;
		// taş evler: yamaç boyunca sıra sıra; her sıranın düz damı üstteki sıranın avlusu/terası. Kemerli pencereler,
		// revaklı üst katlar, korkuluklu damlar; arkası yamaca gömülü
		const C = ['#e2bd88', '#d6af7c', '#e9c995', '#dcb582', '#ceaa7a', '#e6c28c'];
		let nh = 0;
		for (let r = 0; r < 7; r++) {
			const zr = 0.44 - r * 0.125;
			const wide = r < 2 ? 0.05 : 0;
			let x = -0.6 + R() * 0.05 - (r % 2) * 0.04;
			while (x < 0.6) {
				const w = 0.11 + wide + R() * 0.07;
				const d = 0.08 + R() * 0.03;
				const cx = x + w / 2;
				const z = zr + (R() - 0.5) * 0.03;
				// medrese ve cami alanını boş bırak
				if ((r === 3 && Math.abs(cx + 0.12) < 0.13) || (r === 4 && Math.abs(cx - 0.26) < 0.07)) {
					x += w + 0.02;
					continue;
				}
				const yb = hill(cx, z + d / 2) - 0.006;
				const back = hill(cx, z - d / 2);
				const h = Math.max(0.06 + R() * 0.04, back - yb + 0.035);
				tasEv(k, { x: cx, z, y: yb, w, d, h, col: C[Math.floor(R() * C.length)], arches: w > 0.11 ? 3 : 2, R });
				// ikinci kat: geri çekik, revaklı
				if (R() < 0.12) {
					const w2 = w * (0.55 + R() * 0.2);
					tasEv(k, { x: cx + (R() - 0.5) * (w - w2), z: z - d * 0.15, y: yb + h, w: w2, d: d * 0.6, h: 0.055, col: C[Math.floor(R() * C.length)], arches: 2, R });
				}
				x += w + 0.012 + R() * 0.03;
				if (++nh % 8 === 0) yield;
			}
		}
		// Zinciriye (Sultan İsa) Medresesi: yüksek taç kapı, iki yivli kubbe
		const mz = 0.44 - 3 * 0.125;
		const my = hill(-0.12, mz + 0.06) - 0.006;
		k.mc(H.ASHLAR, '#dcb886').flat().box(0.24, 0.11, 0.12, -0.12, my, mz).soft();
		k.push().move(-0.12, my, mz + 0.062);
		k.mc(H.ASHLAR, '#e6c491').flat().box(0.07, 0.15, 0.012, 0, 0, 0).soft();
		k.mc(H.WIN, '#2a1d14').slab(shape(openingPts('pointed', 0, 0, 0.04, 0.1)), 0.006, 0, 0.012, 0.004);
		k.mc(H.CARVE, '#ead0a2').slab(shape(openingPts('pointed', 0, 0, 0.055, 0.12)), 0.004, 0, 0.004, 0.0);
		k.pop();
		for (const dx of [-0.07, 0.07]) {
			const x = -0.12 + dx;
			k.mc(H.ASHLAR, '#d6b386').flat().cyl(0.042, 0.046, 0.025, 12, x, my + 0.11, mz - 0.01).soft();
			const g = new THREE.SphereGeometry(0.042, k._n(32), 8, 0, Math.PI * 2, 0, Math.PI / 2);
			const p = g.getAttribute('position');
			for (let i = 0; i < p.count; i++) {
				const a = Math.atan2(p.getZ(i), p.getX(i));
				const f = 1 + 0.08 * Math.cos(a * 16) * Math.sin(Math.acos(Math.min(1, p.getY(i) / 0.042)));
				p.setX(i, p.getX(i) * f);
				p.setZ(i, p.getZ(i) * f);
			}
			g.computeVertexNormals();
			k.mc(H.ASHLAR, '#e0be8c').add(g, M4(x, my + 0.135, mz - 0.01, 1, 1.35, 1));
		}
		yield;
		// Ulu Cami: tek, kalın, oymalı silindir minare (üstte yivli küçük kubbe)
		const ux = 0.26;
		const uz = 0.44 - 4 * 0.125;
		const uy = hill(ux, uz + 0.05) - 0.006;
		k.mc(H.ASHLAR, '#d8b483').flat().box(0.16, 0.08, 0.1, ux - 0.02, uy, uz).soft();
		k.mc(H.ASHLAR, '#e0bd8a').flat().box(0.05, 0.06, 0.05, ux + 0.04, uy + 0.08, uz).soft();
		k.mc(H.ASHLAR, '#e2c08d').uvGeo(0.25, 0.5).cyl(0.024, 0.027, 0.2, 16, ux + 0.04, uy + 0.14, uz).uvBox();
		for (const y of [0.2, 0.27, 0.33]) k.mc(H.CARVE, '#ecd2a4').cyl(0.029, 0.029, 0.014, 16, ux + 0.04, uy + y, uz);
		muqarnasRing(k, { r: 0.032, x: ux + 0.04, y: uy + 0.34, z: uz, n: 14, d: 0.007, rows: 2, col: '#e3c493' });
		k.mc(H.ASHLAR, '#e2c08d').cyl(0.016, 0.018, 0.04, 12, ux + 0.04, uy + 0.345, uz);
		k.mc(H.ASHLAR, '#e8c896').dome(0.019, 12, ux + 0.04, uy + 0.385, uz, 1.4);
		alem(k, ux + 0.04, uy + 0.41, uz, 0.25, false);
		// tepede Mardin Kalesi: kaya kenarı boyunca sur ve burçlar; iki beyaz radar kubbesi (şehrin silueti)
		const cz = -0.5;
		const cy = hill(0, -0.6) - 0.01;
		for (let i = 0; i < 4; i++) {
			const x0 = -0.5 + i * 0.25;
			curtain(k, x0, cz + 0.03 * Math.sin(i), x0 + 0.23, cz + 0.03 * Math.sin(i + 1), { h: 0.06, y: cy, t: 0.03, col: '#c4a57a' });
		}
		for (const x of [-0.5, -0.02, 0.48]) towerRound(k, x, cz, { r: 0.035, h: 0.09, y: cy, col: '#c09f74', slits: 2 });
		for (const [x, z, r] of [[-0.18, -0.66, 0.06], [0.14, -0.7, 0.05]]) {
			k.mc(H.METAL, '#d9dcdf').cyl(r * 0.5, r * 0.6, 0.04, 12, x, cy, z);
			k.mc(H.PLASTER, '#f4f5f6').sphere(r, 18, x, cy + 0.04 + r * 0.8, z);
		}
		for (const [x, z] of [[-0.68, 0.45], [0.68, 0.42], [-0.66, 0.15], [0.7, 0.1]]) tree(k, x, z, 1, R, hill(x, z) - 0.005, '#6d8f3e');
	},

	// ---------------------------------------------------------------- Hattuşa: Aslanlı Kapı
	*hattusa(k, R) {
		ground(k, 0.8, { pave: '#a8a083', paveR: 0.25, jit: 0.07, mid: '#9ea66a' });
		// toprak sur seddi (Hitit rampası): kapının iki yanında yükselen yeşil-sarı şev
		const ramp = (x, z) => 0.1 * sm(0.42, 0.05, Math.abs(z + 0.06)) * sm(0.82, 0.62, Math.abs(x)) * (1 - 0.85 * gauss(x, 0.1) * sm(-0.06, 0.2, z)) + 0.008 * (fbm(x * 6, 1, z * 6) - 0.5);
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -0.62,
			z1: 0.5,
			cell: 0.02,
			mat: H.GRASS,
			h: ramp,
			col: (x, y, z, ny) => mixc('#93975e', '#b9ae74', fbm(x * 8, y * 9, z * 8)).lerp(_c2.set('#9b8a6c'), sm(0.95, 0.8, ny) * 0.5),
		});
		yield;
		// kiklopik duvar: iri, düzensiz çokgen taşlar (eğik derzler), kapı kulelerinde daha iri
		const cyclo = (x0, x1, y0, h, z, t) => {
			let y = y0;
			while (y < y0 + h - 0.01) {
				const ch = 0.04 + R() * 0.035;
				let x = x0;
				while (x < x1 - 0.01) {
					const w = Math.min(x1 - x, 0.05 + R() * 0.07);
					const c = mixc('#9a9180', '#b9ae98', R()).getHexString();
					k.push().move(x + w / 2, y, z).rot(0, 0, (R() - 0.5) * 0.22);
					k.mc(H.ROCK, '#' + c).flat().box(w - 0.004, Math.min(ch, y0 + h - y) - 0.003, t * (0.92 + R() * 0.08), 0, 0, 0).soft();
					k.pop();
					x += w;
				}
				y += ch;
			}
		};
		const zw = -0.06;
		cyclo(-0.82, -0.36, 0.08, 0.16, zw, 0.1);
		cyclo(0.36, 0.82, 0.08, 0.16, zw, 0.1);
		yield;
		// kapı kuleleri (öne taşan kare burçlar, yıkık üst)
		for (const sx of [-1, 1]) {
			cyclo(sx > 0 ? 0.18 : -0.36, sx > 0 ? 0.36 : -0.18, 0.04, 0.26, zw + 0.03, 0.2);
			yield;
		}
		// kapı: iki dev monolit söve taşı, iç kenarları parabol kemer çizer (üst kısmı yıkık)
		for (const sx of [-1, 1]) {
			const pts = [];
			const n = 10;
			pts.push([sx * 0.19, 0], [sx * 0.19, 0.31]);
			for (let i = n; i >= 0; i--) {
				const y = (0.31 * i) / n;
				pts.push([sx * (0.072 - 0.05 * (y / 0.34) ** 2) + (i === n ? sx * 0.02 : 0), y]);
			}
			const pp = sx > 0 ? pts : pts.slice().reverse();
			k.mc(H.ASHLAR, '#b3a88f').uvS(0.25).flat().slab(shape(pp), 0.13, 0, 0.04, zw + 0.06).uvS(1).soft();
			lionProtome(k, sx * 0.13, 0.05, zw + 0.125, sx * 0.1, R);
		}
		// eşik ve kapıdan geçen yol
		k.mc(H.PAVE, '#a39a82').flat().box(0.15, 0.04, 0.14, 0, 0.0, zw + 0.03).soft();
		k.mc(H.DIRT, '#a18f6e').flat().box(0.14, 0.006, 0.5, 0, 0.0, 0.25).soft();
		for (const [x, z] of [[-0.62, 0.32], [0.64, 0.3], [0.5, -0.45], [-0.56, -0.42]]) tree(k, x, z, 0.85, R, ramp(x, z) - 0.005, '#7a8f45');
	},

	// ---------------------------------------------------------------- Zeugma: Fırat'a bakan yamaçta villalar
	*zeugma(k, R) {
		ground(k, 0.8, { pave: '#c7b28c', paveR: 0.3, mid: '#b9ad78', midMat: H.DIRT });
		// yamaç: arkada tepe, önde Birecik Baraj Gölü'ne (Fırat) iner; villalar teraslarda
		const slope = (x, z) => 0.02 + 0.32 * sm(0.35, -0.7, z) + 0.01 * (fbm(x * 6, 2, z * 6) - 0.5);
		const terr = (x, z) => {
			// iki teras düzlüğü (villa tabanları)
			const s = slope(x, z);
			const t1 = gauss(z - 0.02, 0.13) * sm(0.62, 0.45, Math.abs(x));
			const t2 = gauss(z + 0.32, 0.1) * sm(0.6, 0.4, Math.abs(x + 0.05));
			return s + (0.12 - s) * t1 * 0.95 + (0.24 - s) * t2 * 0.95;
		};
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -0.82,
			z1: 0.62,
			cell: 0.02,
			mat: H.DIRT,
			h: (x, z) => terr(x, z) * (z > 0.36 ? sm(0.6, 0.38, z) : 1),
			col: (x, y, z, ny) => mixc('#b59a72', '#d0b88f', fbm(x * 9, y * 9, z * 9)).lerp(_c2.set('#9fa267'), sm(0.15, 0.4, y) * 0.5 * fbm(x * 4, 0, z * 4)),
		});
		k.mc(H.WATER, '#2f8a96').flat().box(1.64, 0.004, 0.24, 0, 0.012, 0.5).soft();
		yield;
		// villalar: alçak moloz duvarlı odalar, zeminlerde renkli mozaik; peristil (kırmızı sıvalı sütun altları)
		const villa = (cx, cz, y, rooms) => {
			for (const [x, z, w, d] of rooms) {
				k.mc(H.MOSAIC, '#d8c7a3').flat().uvGeo(0.64, 0.4).box(w - 0.016, 0.006, d - 0.016, cx + x, y, cz + z).uvBox().soft();
				for (const [a, b, c, e] of [[-w / 2, -d / 2, w / 2, -d / 2], [-w / 2, d / 2, w / 2, d / 2], [-w / 2, -d / 2, -w / 2, d / 2], [w / 2, -d / 2, w / 2, d / 2]]) {
					const L = Math.hypot(c - a, e - b);
					k.mc(H.ASHLAR, '#c2ab86').uvS(1.4).flat().box(L + 0.014, 0.025 + R() * 0.035, 0.014, cx + x + (a + c) / 2, y, cz + z + (b + e) / 2, -Math.atan2(e - b, c - a)).uvS(1).soft();
				}
			}
		};
		villa(0, 0.02, 0.12, [[0, 0, 0.3, 0.2], [-0.25, -0.02, 0.18, 0.18], [0.24, 0.0, 0.17, 0.16], [-0.06, 0.15, 0.18, 0.1]]);
		villa(-0.05, -0.32, 0.24, [[0, 0, 0.26, 0.16], [0.22, 0, 0.16, 0.16], [-0.22, 0.0, 0.16, 0.14]]);
		for (const [x, z, y] of [[-0.11, -0.07, 0.12], [0.11, -0.07, 0.12], [-0.11, 0.1, 0.12], [0.11, 0.1, 0.12], [-0.13, -0.38, 0.24], [0.09, -0.38, 0.24]]) {
			k.mc(H.PLASTER, '#a8462f').cyl(0.012, 0.014, 0.055, 12, x, y, z);
			column(k, x, y + 0.055, z, { h: 0.11, r: 0.011, order: 'doric', col: '#e8dcc2', mat: H.PLASTER, flutes: 12 });
		}
		yield;
		// ahşap gezi yolu (mozaiklerin üstünden geçen iskele; koruma çatısı yok: yakın çekimde mozaikler görünsün)
		k.mc(H.WOOD, '#8d6a48').flat().box(0.86, 0.008, 0.04, 0, 0.14, 0.17).soft();
		for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) k.mc(H.WOOD, '#6d5034').box(0.006, 0.02, 0.04, x, 0.12, 0.17);
		for (const [x, z] of [[-0.66, 0.3], [0.66, 0.26], [-0.62, -0.5], [0.6, -0.55], [0.36, -0.62]]) tree(k, x, z, 1, R, terr(x, z) - 0.005, '#6d8f3e');
		for (const [x, z] of [[-0.7, 0.0], [0.7, -0.1]]) cypress(k, x, z, 1, terr(x, z) - 0.005);
	},

	// ---------------------------------------------------------------- Truva Atı (Tevfikiye): ahşap at
	*truva(k, R) {
		ground(k, 0.7, { pave: '#bdad8a', paveR: 0.55 });
		const W = '#9a6a42';
		const W2 = '#74502f';
		const plank = (geo, M, col = W) => k.mc(H.WOOD, col).flat().add(geo, M).soft();
		// taş kaide
		k.mc(H.ASHLAR, '#b5a68a').uvS(0.5).flat().box(0.5, 0.035, 0.26, 0, 0, 0).uvS(1).soft();
		// bacaklar: kalın, dizde hafif kırık dikmeler (tahta kaplama)
		for (const [x, z, a] of [[-0.15, -0.07, 0.08], [-0.15, 0.07, 0.08], [0.15, -0.07, -0.06], [0.15, 0.07, -0.06]]) {
			k.push().move(x, 0.035, z).rot(0, 0, a);
			plank(new THREE.BoxGeometry(0.05, 0.25, 0.05), M4(0, 0.125, 0), W2);
			k.mc(H.WOOD, '#5f3f22').flat().box(0.07, 0.02, 0.07, 0, 0, 0).soft();
			k.pop();
		}
		// gövde: köşeleri pahlı tahta sandık (göğüs önde kabarık), yanlarda tahta sıraları ve pencereler
		const body = sculpt(new THREE.BoxGeometry(1, 1, 1, 8, 4, 4), (v) => {
			const t = v.x + 0.5; // 0 kalça, 1 göğüs
			const ch = 1 + 0.18 * sm(0.6, 1.0, t) - 0.1 * sm(0.25, 0.0, t);
			v.y = v.y * 0.2 * ch - 0.03 * v.y * v.y;
			v.z *= 0.2 * (0.92 + 0.08 * ch);
			v.x *= 0.5;
			// pah: köşeler içe
			const c = Math.abs(v.y) / 0.1 + Math.abs(v.z) / 0.1;
			if (c > 1.6) {
				v.y *= 1.6 / c + (1 - 1.6 / c) * 0.6;
				v.z *= 1.6 / c + (1 - 1.6 / c) * 0.6;
			}
		});
		k.mc(H.WOOD, W).flat().add(body, M4(0, 0.4, 0)).soft();
		for (const x of [-0.18, -0.06, 0.06, 0.18]) k.mc(H.WOOD, W2).flat().box(0.008, 0.19, 0.204, x, 0.305, 0).soft();
		for (const sz of [-1, 1]) for (const x of [-0.12, 0.0, 0.12]) k.mc(H.WIN, '#2a1b10').box(0.05, 0.04, 0.006, x, 0.39, sz * 0.101);
		// merdiven: karından yere
		for (let i = 0; i < 8; i++) k.mc(H.WOOD, '#6b4528').flat().box(0.006, 0.006, 0.06, -0.03, 0.06 + i * 0.03, 0).soft();
		k.mc(H.WOOD, '#6b4528').box(0.008, 0.26, 0.008, -0.03, 0.035, -0.03).box(0.008, 0.26, 0.008, -0.03, 0.035, 0.03);
		yield;
		// boyun: göğüsten yukarı ve öne kalkan kalın, incelen tahta gövde; arkasında basamaklı yele
		const NA = 0.42; // boynun dikeyden öne eğimi
		k.push().move(0.19, 0.44, 0).rot(0, 0, -NA);
		k.mc(H.WOOD, W).flat().add(sculpt(new THREE.BoxGeometry(1, 1, 1, 2, 4, 2), (v) => {
			const t = v.y + 0.5;
			v.x *= 0.13 - 0.04 * t;
			v.z *= 0.12 - 0.035 * t;
			v.y = t * 0.27;
		})).soft();
		for (let i = 0; i < 7; i++) k.mc(H.WOOD, W2).flat().box(0.026, 0.03, 0.03, -0.065 + i * 0.004, 0.03 + i * 0.036, 0).soft();
		// baş: uzun, öne-aşağı eğik; kulaklar, göz, burun delikleri
		k.push().move(0.0, 0.27, 0).rot(0, 0, NA - 1.15);
		k.mc(H.WOOD, W).flat().add(sculpt(new THREE.BoxGeometry(1, 1, 1, 3, 2, 2), (v) => {
			const t = v.y + 0.5; // 0 alın, 1 burun
			v.x *= 0.1 - 0.025 * t;
			v.z *= 0.085 - 0.02 * t;
			v.y = t * 0.2 - 0.02;
		})).soft();
		k.mc(H.WIN, '#1d140c').box(0.012, 0.022, 0.09, 0.025, 0.03, 0).box(0.03, 0.01, 0.068, 0.0, 0.18, 0);
		for (const sz of [-1, 1]) k.mc(H.WOOD, W2).flat().cone(0.016, 0.05, 4, -0.03, -0.035, sz * 0.026, 0).soft();
		k.pop();
		k.pop();
		// kuyruk: arkadan sarkan tahta demet
		k.push().move(-0.25, 0.43, 0).rot(0, 0, 0.35);
		k.mc(H.WOOD, W2).flat().box(0.03, 0.2, 0.026, 0, -0.2, 0).soft();
		k.pop();
		yield;
		// Truva surları (VI. katman, eğimli taş duvar) ve ağaçlar
		curtain(k, -0.62, -0.38, 0.05, -0.48, { h: 0.08, t: 0.06, col: '#b3a385', batter: 0.02, slits: false });
		curtain(k, 0.1, -0.47, 0.6, -0.4, { h: 0.06, t: 0.05, col: '#ad9e80', batter: 0.02, slits: false });
		for (const [x, z] of [[-0.48, 0.3], [0.5, 0.3], [0.56, -0.2], [-0.56, -0.15]]) tree(k, x, z, 1.1, R);
	},

	// ---------------------------------------------------------------- Göbeklitepe: T dikilitaşlı dairesel yapılar
	*gobekli(k, R) {
		ground(k, 0.8, { pave: '#c4a47c', paveR: 0.5, mid: '#bfa47a', midMat: H.DIRT });
		// kazı alanı: tepenin içine inilmiş çukur, kenarda kazı şevleri
		const pit = (x, z) => 0.1 - 0.1 * sm(0.62, 0.48, Math.hypot(x * 0.95, z * 1.1)) + 0.008 * (fbm(x * 8, 0, z * 8) - 0.5) + 0.06 * sm(0.66, 0.82, Math.hypot(x, z));
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -0.82,
			z1: 0.82,
			cell: 0.022,
			mat: H.DIRT,
			h: (x, z) => pit(x, z) * sm(0.84, 0.74, Math.max(Math.abs(x), Math.abs(z))) + 0.0,
			col: (x, y, z) => mixc('#a98a66', '#c9ac84', fbm(x * 10, y * 30, z * 10)),
		});
		yield;
		// çevre duvarları: kuru taş örgü (yuvarlak/oval), içinde ışınsal T dikilitaşlar; ortada iki büyük dikilitaş
		const encl = [[-0.2, 0.0, 0.25, 8], [0.24, -0.12, 0.21, 7], [0.08, 0.34, 0.16, 5]];
		for (const [cx, cz, r, n] of encl) {
			const ns = k._n(30);
			for (let i = 0; i < ns; i++) {
				const a = (i / ns) * Math.PI * 2;
				const c = mixc('#9c8262', '#b89c78', R()).getHexString();
				k.push().move(cx + Math.cos(a) * (r + 0.025), 0, cz + Math.sin(a) * (r + 0.025)).rot(0, -a, 0);
				k.mc(H.ROCK, '#' + c).flat().box(0.03, 0.045 + R() * 0.02, (Math.PI * 2 * r) / ns + 0.006, 0, 0, 0).soft();
				k.pop();
			}
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2 + 0.3;
				tPillar(k, cx + Math.cos(a) * r, cz + Math.sin(a) * r, -a + Math.PI / 2, 0.9 + R() * 0.1, R);
			}
			for (const dx of [-0.055, 0.055]) tPillar(k, cx + dx, cz, 0.0, 1.7, R, true);
			yield;
		}
		// ziyaretçi gezi yolu: ahşap iskele, korkuluk
		for (let i = 0; i < 14; i++) {
			const a = Math.PI * (0.15 + i * 0.05);
			const x = Math.cos(a) * 0.6;
			const z = -Math.sin(a) * 0.6;
			k.push().move(x, 0.1, z).rot(0, a, 0);
			k.mc(H.WOOD, '#8d6a48').flat().box(0.05, 0.008, 0.1, 0, 0, 0).box(0.004, 0.035, 0.1, 0.024, 0.008, 0).soft();
			k.pop();
		}
		for (const [x, z] of [[-0.66, 0.5], [0.66, 0.52], [0.7, -0.3]]) tree(k, x, z, 0.85, R, 0.12, '#8a8f45');
	},
};

/** Göbeklitepe T dikilitaşı: gövde, başlık (T), yanlarda kol ve el kabartması (büyüklerde), hayvan kabartması. */
function tPillar(k, x, z, ry, s, R, big = false) {
	k.push().move(x, 0.0, z).rot(0, ry, (R() - 0.5) * 0.06).scale(s);
	const C = big ? '#e0cba3' : '#d6c09a';
	k.mc(H.CARVE, C).flat().box(0.026, 0.16, 0.05, 0, 0, 0).box(0.034, 0.04, 0.095, 0, 0.16, 0.012);
	if (big) {
		// kollar ve eller (iki yanda), kemer ve tilki postu
		for (const sx of [-1, 1]) {
			k.mc(H.STONE, '#cdb690').box(0.004, 0.08, 0.008, sx * 0.0145, 0.07, -0.006).box(0.004, 0.008, 0.03, sx * 0.0145, 0.07, 0.008);
		}
		k.mc(H.STONE, '#c4ad87').box(0.03, 0.008, 0.054, 0, 0.06, 0);
	} else {
		// hayvan kabartması (tilki, yaban domuzu, akbaba): yan yüzde küçük kabarık leke
		const a = Math.floor(R() * 3);
		k.mc(H.STONE, '#c8b28c').box(0.004, 0.028, 0.03, 0.0145, 0.08 + a * 0.012, 0.004);
	}
	k.soft();
	k.pop();
}

/** Hitit aslan protomu: kapı taşından taşan baş (yele, açık ağız) ve göğüs, ön ayaklar kabartma. */
function lionProtome(k, x, y, z, ry, R) {
	k.push().move(x, y, z).rot(0, ry, 0);
	const C = '#ada38c';
	// göğüs ve ön gövde
	k.mc(H.ROCK, C).cached('hl-gogus', () => sculpt(new THREE.SphereGeometry(1, 18, 14), (v) => {
		v.x *= 0.55;
		v.y *= 0.9;
		v.z = v.z * 0.6 - 0.2;
	}), M4(0, 0.07, 0, 0.07, 0.08, 0.08));
	// ön ayaklar (kabartma)
	for (const sx of [-1, 1]) k.mc(H.ROCK, '#a69c84').cyl(0.012, 0.014, 0.07, 8, sx * 0.022, 0.0, 0.012);
	// baş: yele yakası (yassı, pürüzlü halka), öne çıkan ağız-burun, açık ağız, kaş
	k.mc(H.CARVE, '#a39880').cached('hl-yele', () => sculpt(new THREE.SphereGeometry(1, 20, 14), (v) => {
		v.z *= 0.45;
		v.multiplyScalar(1 + 0.12 * Math.sin(Math.atan2(v.y, v.x) * 9));
	}), M4(0, 0.165, 0.025, 0.06, 0.06, 0.06));
	k.mc(H.ROCK, C).cached('hl-bas', () => sculpt(new THREE.SphereGeometry(1, 18, 14), (v) => {
		v.x *= 0.85;
		v.z = v.z * 0.9 + 0.5 * gauss(v.y + 0.3, 0.35) * sm(0.2, 0.8, v.z) * gauss(v.x, 0.55);
		v.z += 0.15 * gauss(v.y - 0.3, 0.12) * sm(0.2, 0.8, v.z);
	}), M4(0, 0.165, 0.05, 0.04, 0.042, 0.04));
	k.mc(H.WIN, '#2a2118').box(0.03, 0.012, 0.012, 0, 0.142, 0.085);
	k.pop();
}

/**
 * Nemrut başı (yontma): yüzü olan taş baş (kaş kemeri, oyuk göz, iri burun, dudaklar, çene; tanrılarda kıvırcık
 * sakal ve bıyık) + başlık: kral Antiokhos'un beş dişli Ermeni tacı, tanrıların öne kıvrık Frig külahı, Kommagene
 * Tykhe'sinin meyveli kalathos tacı; külahın iki yanından ense örtüsü sarkar. Aslan (yeleli) ve kartal (kanca
 * gagalı). s: baş yarıçapı (yerel birim). Yere oturur (boyun kesiti altta).
 */
function nemrutHead(k, kind, x, y, z, ry, s, R) {
	const STONE = '#d6c7a6';
	const CAP = '#cbbb98';
	const tilt = (R() - 0.5) * 0.12;
	k.push().move(x, y, z).rot(0, ry, tilt);
	if (kind === 'kartal') {
		k.mc(H.STONE, STONE).cached('nk-bas', () => sculpt(new THREE.SphereGeometry(1, 28, 20), (v) => {
			v.x *= 0.72;
			v.z *= 0.9;
			v.y = v.y * 0.95 + 0.06 * gauss(v.y - 0.6, 0.3) * (v.z < 0 ? 1 : 0.3);
			// tüy kabartması: arkaya doğru kat kat
			v.multiplyScalar(1 + 0.03 * Math.sin(v.y * 14 - v.z * 6) * sm(0.0, -0.5, v.z));
		}), M4(0, s * 1.05, -s * 0.1, s));
		// kanca gaga: kalın kökten öne ve aşağı kıvrılan koni
		k.mc(H.STONE, '#cdbd9a').cached('nk-gaga', () => sculpt(new THREE.ConeGeometry(0.42, 1.25, 14, 8), (v) => {
			const t = (v.y + 0.625) / 1.25; // 0 kök, 1 uç
			v.z += 0.55 * t * t;
			v.x *= 0.75;
		}), M4(0, s * 1.0, s * 1.15, s * 0.9, s * 0.9, s * 0.9, 0, Math.PI / 2 + 0.15));
		for (const sx of [-1, 1]) k.mc(H.CARVE, '#b9a886').cached('nk-goz', () => sculpt(new THREE.SphereGeometry(1, 10, 8), (v) => v.multiplyScalar(1)), M4(sx * s * 0.5, s * 1.3, s * 0.45, s * 0.13));
		k.mc(H.CARVE, CAP).cached('nk-boyun', () => blob(1, 3, 2, 0.25), M4(0, s * 0.35, -s * 0.2, s * 0.85, s * 0.45, s * 0.9));
		k.pop();
		return;
	}
	if (kind === 'aslan') {
		// yele: iri, kıvırcık topak; ağız burun çıkıntısı, kaş, kulak
		k.mc(H.CARVE, '#c8b791').cached('na-yele', () => blob(1, 19, 2, 0.22), M4(0, s * 1.15, -s * 0.2, s * 1.3, s * 1.25, s * 1.1));
		k.mc(H.STONE, STONE).cached('na-yuz', () => sculpt(new THREE.SphereGeometry(1, 26, 18), (v) => {
			v.x *= 0.8;
			v.z = v.z * 0.95 + 0.45 * gauss(v.y + 0.35, 0.35) * sm(0.2, 0.8, v.z) * gauss(v.x, 0.55); // burun-ağız
			v.z += 0.12 * gauss(v.y - 0.25, 0.12) * sm(0.2, 0.7, v.z); // kaş
			v.z -= 0.12 * gauss(v.y + 0.62, 0.06) * gauss(v.x, 0.4) * sm(0.3, 0.8, v.z); // ağız yarığı
		}), M4(0, s * 1.05, s * 0.32, s * 0.9));
		for (const sx of [-1, 1]) k.mc(H.STONE, STONE).sphere(s * 0.18, 8, sx * s * 0.62, s * 1.92, -s * 0.05);
		k.pop();
		return;
	}
	const beard = kind === 'zeus' || kind === 'herakles';
	const fem = kind === 'tyche';
	k.mc(H.STONE, STONE).cached('nb-' + (beard ? 'b' : fem ? 'f' : 'k'), () => sculpt(new THREE.SphereGeometry(1, 36, 28), (v) => {
		const fx = v.x;
		const fy = v.y;
		const front = sm(0.1, 0.55, v.z);
		v.x *= 0.82 * (fy < 0 ? 1 - 0.18 * -fy : 1);
		v.y *= 1.06;
		v.z *= 0.88;
		// yüz düzlemi: önü yassı (taş blok yontusu), hatlar bu düzlemden taşar
		if (v.z > 0.55) v.z = 0.55 + (v.z - 0.55) * 0.45;
		const ax = Math.abs(fx);
		let d = 0;
		d += 0.36 * gauss(fx, 0.1) * sm(0.3, 0.05, fy) * sm(-0.46, -0.3, fy) + 0.12 * gauss(fx, 0.09) * sm(0.32, 0.0, fy) * sm(-0.3, 0.1, fy); // burun ve burun kökü
		d += 0.1 * gauss(fx, 0.19) * gauss(fy + 0.36, 0.06); // burun kanatları
		d -= 0.2 * gauss(ax - 0.3, 0.12) * gauss(fy - 0.1, 0.1); // göz çukuru
		d += 0.12 * gauss(ax - 0.3, 0.075) * gauss(fy - 0.08, 0.04); // göz kapağı (badem)
		d += 0.14 * gauss(fy - 0.27, 0.06) * sm(0.6, 0.12, ax); // kaş kemeri
		d += 0.07 * gauss(ax - 0.44, 0.14) * gauss(fy + 0.12, 0.14); // elmacık
		d += 0.09 * gauss(fy + 0.52, 0.04) * gauss(fx, 0.2); // üst dudak
		d -= 0.09 * gauss(fy + 0.58, 0.018) * gauss(fx, 0.18); // ağız
		d += 0.07 * gauss(fy + 0.64, 0.035) * gauss(fx, 0.16); // alt dudak
		d += (fem ? 0.05 : 0.11) * gauss(fy + 0.82, 0.1) * gauss(fx, 0.25); // çene
		v.z += d * front;
		if (beard) {
			// sakal: çeneden yanaklara kıvırcık kütle, bıyık
			const b = sm(-0.4, -0.75, fy) * sm(-0.35, 0.3, v.z) * (1 - 0.6 * gauss(fx, 0.12) * gauss(fy + 0.56, 0.05));
			const curl = 0.04 * (vn3(fx * 9, fy * 9, v.z * 9) - 0.5) + 0.03 * Math.sin(fx * 30) * Math.sin(fy * 26);
			v.multiplyScalar(1 + (0.2 + curl) * b);
			v.y -= 0.18 * b * sm(0.0, 0.5, v.z + 0.2);
			v.z += 0.06 * gauss(fy + 0.44, 0.045) * sm(0.4, 0.08, ax) * front;
		}
		// boyun kesiti: alt düzlem
		if (v.y < -1.0) v.y = -1.0 + (v.y + 1.0) * 0.2;
	}), M4(0, s * 1.08, 0, s));
	// gözler: badem kapakların arasında oyma iris (hafif koyu taş; siyah boya değil)
	for (const sx of [-1, 1]) k.mc(H.CARVE, '#9c8a6a').cached('nb-iris', () => new THREE.SphereGeometry(1, 10, 8), M4(sx * s * 0.25, s * 1.08 + s * 0.11 * 1.06, s * 0.62, s * 0.085, s * 0.06, s * 0.05));
	// başlık
	const top = s * 1.9;
	k.mc(H.CARVE, CAP).cyl(s * 0.84, s * 0.86, s * 0.26, 24, 0, s * 1.55, -s * 0.06); // alın bandı (oymalı)
	// ense ve yan örtüleri (Pers tacının kanatları)
	if (!fem) k.mc(H.STONE, CAP).cached('nb-ort', () => sculpt(new THREE.CylinderGeometry(0.92, 1.0, 1.0, 22, 3, true, Math.PI * 0.42, Math.PI * 1.16), (v) => {
		v.z -= 0.1;
	}), M4(0, s * 1.15, -s * 0.05, s * 0.9, s * 0.95, s * 0.95));
	if (kind === 'kral') {
		// Ermeni tacı: yukarı hafif daralan yüksek külah, tepede beş diş
		k.mc(H.STONE, CAP).lathe([[s * 0.84, 0], [s * 0.8, s * 0.4], [s * 0.72, s * 0.8], [s * 0.66, s * 0.95], [0, s * 0.95]], 24, 0, s * 1.7, -s * 0.06);
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
			k.mc(H.CARVE, CAP).cone(s * 0.2, s * 0.34, 6, Math.cos(a) * s * 0.55, s * 2.64, Math.sin(a) * s * 0.55 - s * 0.06);
		}
		k.mc(H.CARVE, '#c2b08b').cyl(s * 0.75, s * 0.75, s * 0.12, 24, 0, s * 2.05, -s * 0.06);
	} else if (fem) {
		// Tykhe: kalathos (yukarı genişleyen sepet taç), üstünde meyve ve başak
		k.mc(H.CARVE, CAP).lathe([[s * 0.8, 0], [s * 0.86, s * 0.4], [s * 0.95, s * 0.62], [0, s * 0.62]], 24, 0, s * 1.68, -s * 0.06);
		for (let i = 0; i < 9; i++) {
			const a = (i / 9) * Math.PI * 2;
			k.mc(H.STONE, '#cfbf9c').sphere(s * 0.2, 8, Math.cos(a) * s * 0.55, s * 2.38, Math.sin(a) * s * 0.55 - s * 0.06);
		}
		// yanlarda örgülü saç
		for (const sx of [-1, 1]) k.mc(H.CARVE, CAP).cached('nb-sac', () => blob(1, 5, 1, 0.3), M4(sx * s * 0.72, s * 0.9, -s * 0.1, s * 0.28, s * 0.7, s * 0.4));
	} else {
		// Frig külahı: yüksek, ucu öne kıvrılan koni (Zeus-Oromasdes, Apollon-Mithras, Herakles-Artagnes)
		const h = kind === 'herakles' ? 1.05 : 1.3;
		k.mc(H.STONE, CAP).cached('nb-kulah' + h, () => sculpt(new THREE.CylinderGeometry(0.0, 0.84, h, 22, 10, false), (v) => {
			const t = Math.min(1, Math.max(0, (v.y + h / 2) / h)); // 0 dip, 1 uç
			const r = Math.hypot(v.x, v.z);
			const f = (0.84 * Math.pow(1 - t, 0.8)) / Math.max(1e-4, r) || 0;
			if (r > 1e-4) {
				v.x *= f;
				v.z *= f;
			}
			v.z += 0.75 * Math.pow(t, 2.2);
			v.y -= 0.18 * Math.pow(t, 3);
			v.y += h / 2;
		}), M4(0, s * 1.68, -s * 0.06, s));
	}
	k.pop();
}
