// Kahraman maketler v1.1: v1.0 denetiminde "zayıf / kısmen" kalanlar.
//
//   Çifte Minareli  taç kapılı zengin taş cephe (iç içe çerçeveler, mukarnas, hayat ağacı ve çift başlı kartal
//                   kabartmaları), portal kulelerinden yükselen yivli tuğla ve firuze çinili ikiz minare, avlulu
//                   iki katlı revaklar, arkada on iki köşeli Hatuniye Kümbeti
//   Divriği         uzun kesme taş gövde, payandalar; yoğun bitkisel kabartmalı dev Cennet Kapısı (taşan rozetler,
//                   palmetler, kıvrık dallar), Darüşşifa ve Şah kapıları, sekizgen piramit külah, yamaç
//   Diyarbakır      sarp kıyı sırtında kıvrılan uzun bazalt sur, yuvarlak ve çokgen burçlar, Hevsel bahçeleri,
//                   Dicle ve On Gözlü Köprü
//   Uzungöl         sarp, ormanlı dar vadide göl; kıyıda tek minareli beyaz cami, ahşap evler, ahşap köprü
//   Bergama         dik akropol tepesi (teraslı, kayalık), yamaca oyulmuş dik tiyatro, tepede Trajan tapınağı
//   Hattuşa         büyük Aslanlı Kapı: iri parabol kapı taşları, yeleli, ağzı açık aslan protomları, kiklopik sur
//   Göbeklitepe     dairesel çukurlar, kalın T dikilitaşlar (hayvan kabartmaları: tilki, yaban domuzu, turna)
//   Zeugma          Fırat'a inen yamaçta teraslı Roma villaları: renkli mozaik zeminler, freskli duvarlar, peristil

import * as THREE from 'three';
import { H, COL, wall, block, dome, minaret, ground, tree, cypress, pine, roofGable, openingPts, column, entablature, pediment, curtain, towerRound, muqarnasRing, arcade, blob, vn3 } from './hero_parts.js';
import { flute } from './hero_cami.js';
import { cavea } from './hero_antik.js';
import { hfield, sculpt, sm, fbm, mixc, gauss, M4 } from './hero_yeni.js';

const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const _c2 = new THREE.Color();

/** Kabartma pano: dikdörtgen içinde sık, küçük bitkisel kabarcıklar (yoğun Selçuklu taş oyması). */
function relief(k, { x, y, z, w, h, n = 18, col = '#cbb898', r = 0.008, R, ry = 0, seed = 1 }) {
	k.push().move(x, y, z).rot(0, ry, 0);
	for (let i = 0; i < n; i++) {
		const u = (i + 0.5) / n;
		const px = (vn3(i * 3.1, seed, 1) - 0.5) * w * 0.9;
		const py = u * h;
		const s = r * (0.7 + 0.6 * vn3(i, seed * 7, 3));
		k.mc(H.CARVE, col, 0.95 + 0.1 * R()).cached('rl' + (i % 4), () => blob(1, 11 + (i % 4) * 5, 1, 0.35), M4(px, py, 0, s, s, s * 0.6));
	}
	k.pop();
}

/** Rozet: yuvarlak disk, ışınsal yapraklar (kapı bezemesi). */
function rosette(k, x, y, z, r, col = '#d2bf9e', ry = 0) {
	k.push().move(x, y, z).rot(Math.PI / 2, 0, ry);
	k.mc(H.CARVE, col).cyl(r, r * 1.05, r * 0.35, 16, 0, 0, 0);
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		k.mc(H.CARVE, col, 0.92).sphere(r * 0.28, 6, Math.cos(a) * r * 0.62, r * 0.35, Math.sin(a) * r * 0.62);
	}
	k.mc(H.CARVE, col, 1.05).sphere(r * 0.32, 8, 0, r * 0.4, 0);
	k.pop();
}

/** Taç kapı: cepheden taşan blok, iç içe sivri kemerli çerçeveler, mukarnaslı niş, kapı boşluğu. */
function portal(k, { x = 0, y = 0, z, w, h, d = 0.05, col = '#d3b48c', col2 = '#c4a47e', frames = 4, ry = 0, door = 0.38 }) {
	k.push().move(x, y, z).rot(0, ry, 0);
	k.mc(H.ASHLAR, col).uvS(0.6).flat().box(w, h, d, 0, 0, -d / 2).uvS(1).soft();
	for (let i = 0; i < frames; i++) {
		const fw = w * (0.86 - i * 0.1);
		const fh = h * (0.9 - i * 0.07);
		wall(k, { w: fw + 0.012, h: fh + 0.006, t: 0.01, z: 0.004 - i * 0.008, holes: [{ x: 0, y: 0, w: fw, h: fh, kind: 'pointed' }], mat: H.CARVE, col: i % 2 ? col : col2, glass: false });
	}
	const nw = w * (0.86 - frames * 0.1);
	const nh = h * (0.9 - frames * 0.07);
	// niş: içeri gömülü, üstü mukarnas
	k.mc(H.STONE, '#5a4a3c').slab(shape(openingPts('pointed', 0, 0, nw, nh)), 0.004, 0, 0, -d + 0.006);
	muqarnasRing(k, { r: nw * 0.42, y: nh * 0.62, z: -d * 0.55, n: 10, d: nw * 0.08, rows: 3, col });
	k.mc(H.WIN, '#1d1510').slab(shape(openingPts('round', 0, 0, nw * door * 1.6, nh * 0.45)), 0.006, 0, 0, -d + 0.01);
	k.pop();
}

export const YENI2 = {
	// ---------------------------------------------------------------- Çifte Minareli Medrese (Erzurum)
	*ciftemin(k, R) {
		ground(k, 0.78, { pave: '#b8ab93', paveR: 0.7, rect: 1 });
		const S = '#cfae86';
		const S2 = '#c19f78';
		const zf = 0.22; // ön cephe
		const zb = -0.5;
		const W = 0.62;
		const Hh = 0.19;
		// dış duvarlar (kesme taş, küçük sivri pencereler), köşe payandaları
		wall(k, { w: W, h: Hh, t: 0.04, z: zf - 0.02, holes: [-0.24, -0.17, 0.17, 0.24].map((x) => ({ x, y: 0.09, w: 0.022, h: 0.045, kind: 'pointed' })), col: S, frame: 0.004, frameCol: '#dcc099' });
		wall(k, { w: W, h: Hh, t: 0.04, z: zb + 0.02, holes: [], col: S2 });
		for (const sx of [-1, 1]) {
			wall(k, { w: zf - zb, h: Hh, t: 0.04, x: sx * (W / 2 - 0.02), z: (zf + zb) / 2, ry: Math.PI / 2, holes: [-0.24, -0.08, 0.08, 0.24].map((x) => ({ x, y: 0.09, w: 0.022, h: 0.045, kind: 'pointed' })), col: S2 });
			k.mc(H.ASHLAR, S).flat().box(0.05, Hh + 0.012, 0.05, sx * (W / 2 - 0.005), 0, zf - 0.015).soft();
		}
		// oda sıraları üstünde düz dam, ortada açık avlu: iki katlı sivri kemerli revaklar
		for (const sx of [-1, 1]) k.mc(H.LEAD, '#8e8170').flat().box(0.14, 0.012, zf - zb, sx * 0.24, Hh, (zf + zb) / 2).soft();
		k.mc(H.LEAD, '#8e8170').flat().box(W, 0.012, 0.12, 0, Hh, zb + 0.06).soft();
		k.mc(H.PAVE, '#bdae94').flat().box(0.34, 0.004, 0.5, 0, 0.002, -0.14).soft();
		for (const sx of [-1, 1]) {
			arcade(k, { x0: -0.24, x1: 0.24, z: 0, y: 0, h: 0.09, n: 6, depth: 0.05, col: S, colCol: '#d8c0a0', domes: false, kind: 'pointed', ry: sx * Math.PI / 2, back: true, backCol: S2 });
			k.push().move(sx * 0.17, 0, -0.14).rot(0, sx * Math.PI / 2, 0);
			arcade(k, { x0: -0.24, x1: 0.24, z: 0, y: 0.095, h: 0.08, n: 6, depth: 0.05, col: S, colCol: '#d8c0a0', domes: false, kind: 'pointed', back: true, backCol: S2 });
			k.pop();
		}
		// arka eyvan: yüksek sivri kemerli açıklık
		wall(k, { w: 0.2, h: 0.22, t: 0.04, z: zb + 0.13, holes: [{ x: 0, y: 0, w: 0.12, h: 0.17, kind: 'pointed' }], col: S, dark: true });
		yield;
		// taç kapı: duvarı aşan yüksek blok, iç içe çerçeveler, mukarnas; iki yanında kabartma panoları
		const PW = 0.26;
		const PH = 0.32;
		portal(k, { z: zf + 0.05, w: PW, h: PH, d: 0.06, col: '#d6b78e', col2: '#c9a982', frames: 4 });
		for (const sx of [-1, 1]) {
			// hayat ağacı (gövde, dallar) ve üstte çift başlı kartal
			const x = sx * 0.075;
			const z = zf + 0.053;
			k.mc(H.CARVE, '#c8a77e').box(0.008, 0.11, 0.006, x, 0.06, z);
			for (let i = 0; i < 5; i++) k.mc(H.CARVE, '#cdb08a').cached('pal', () => blob(1, 19, 1, 0.3), M4(x + (i % 2 ? 0.012 : -0.012), 0.08 + i * 0.018, z, 0.012, 0.007, 0.004, 0, 0, (i % 2 ? -1 : 1) * 0.5));
			k.mc(H.CARVE, '#cdb08a').box(0.04, 0.012, 0.006, x, 0.19, z);
			for (const s2 of [-1, 1]) k.mc(H.CARVE, '#cdb08a').sphere(0.007, 6, x + s2 * 0.01, 0.208, z);
		}
		// ikiz minareler: portal kulelerinin üstünde kare kaide, yivli tuğla gövde, firuze çini zikzak ve kuşaklar
		for (const sx of [-1, 1]) {
			const x = sx * 0.105;
			const z = zf + 0.02;
			k.mc(H.ASHLAR, '#d1b18a').uvS(0.6).flat().box(0.075, PH + 0.02, 0.075, x, 0, z).uvS(1).soft();
			k.mc(H.CARVE, '#dcc19a').flat().box(0.08, 0.012, 0.08, x, PH + 0.02, z).soft();
			k.mc(H.ASHLAR, '#d1b18a').flat().cyl(0.03, 0.038, 0.035, 8, x, PH + 0.032, z).soft();
			const g = flute(new THREE.CylinderGeometry(0.024, 0.029, 0.3, k._n(48), 6, true), 16, 0.09, true);
			k.mc(H.BRICK, '#ab6040').add(g.translate(0, 0.15, 0), new THREE.Matrix4().makeTranslation(x, PH + 0.067, z));
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2;
				for (let j = 0; j < 3; j++) k.mc(H.GLAZE, '#2b9aa5').box(0.006, 0.035, 0.004, x + Math.sin(a + j * 0.25) * 0.0275, PH + 0.1 + j * 0.035, z + Math.cos(a + j * 0.25) * 0.0275, a + j * 0.25);
			}
			for (const y of [PH + 0.09, PH + 0.23]) k.mc(H.GLAZE, '#24849a').cyl(0.03, 0.03, 0.012, 24, x, y, z);
			k.mc(H.STONE, '#b9906a').lathe([[0.027, 0], [0.036, 0.012], [0.04, 0.02], [0, 0.02]], 16, x, PH + 0.36, z);
			k.mc(H.BRICK, '#9a573a').cyl(0.022, 0.024, 0.04, 16, x, PH + 0.38, z);
		}
		yield;
		// arkada Hatuniye Kümbeti: on iki köşeli gövde, kör kemerler, piramit külah
		const kx = 0;
		const kz = -0.66;
		k.mc(H.ASHLAR, S).flat().cyl(0.08, 0.085, 0.18, 12, kx, 0, kz).soft();
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			k.push().move(kx + Math.sin(a) * 0.081, 0.06, kz + Math.cos(a) * 0.081).rot(0, a, 0);
			k.mc(H.STONE, '#b8956f').slab(shape(openingPts('pointed', 0, 0, 0.024, 0.07)), 0.003, 0, 0, 0);
			k.pop();
		}
		k.mc(H.CARVE, '#d6b48a').cyl(0.083, 0.083, 0.018, 12, kx, 0.16, kz);
		k.mc(H.ASHLAR, '#b2916f').cone(0.088, 0.12, 12, kx, 0.18, kz).soft();
		for (const [x, z] of [[-0.6, 0.3], [0.6, 0.28], [-0.62, -0.3], [0.6, -0.36], [-0.4, 0.5], [0.42, 0.5]]) tree(k, x, z, 1, R);
	},

	// ---------------------------------------------------------------- Divriği Ulu Camii ve Darüşşifası (Sivas)
	*divrigi(k, R) {
		ground(k, 0.8, { pave: '#b5aa94', paveR: 0.62, rect: 1 });
		// arkada yamaç (Divriği kalesinin eteği)
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -0.82,
			z1: -0.28,
			cell: 0.03,
			mat: H.GRASS,
			h: (x, z) => 0.3 * sm(-0.3, -0.75, z) * sm(0.82, 0.6, Math.abs(x)) + 0.02 * (fbm(x * 5, 0, z * 5) - 0.5),
			col: (x, y) => mixc('#9a9a62', '#b7a77a', sm(0.0, 0.3, y)),
		});
		const S = '#b8a688';
		const S2 = '#a9977b';
		const zf = 0.16;
		const zb = -0.26;
		const W = 0.86;
		const Hh = 0.21;
		// gövde: kalın kesme taş duvarlar, payandalar, dar mazgal pencereler; düz dam
		wall(k, { w: W, h: Hh, t: 0.05, z: zf - 0.025, holes: [-0.36, -0.3, 0.3, 0.36].map((x) => ({ x, y: 0.11, w: 0.018, h: 0.05, kind: 'pointed' })), col: S });
		wall(k, { w: W, h: Hh, t: 0.05, z: zb + 0.025, holes: [], col: S2 });
		for (const sx of [-1, 1]) wall(k, { w: zf - zb, h: Hh, t: 0.05, x: sx * (W / 2 - 0.025), z: (zf + zb) / 2, ry: Math.PI / 2, holes: [{ x: -0.1, y: 0.11, w: 0.018, h: 0.05, kind: 'pointed' }, { x: 0.1, y: 0.11, w: 0.018, h: 0.05, kind: 'pointed' }], col: S2 });
		k.mc(H.STONE, '#2a2420').box(W - 0.1, Hh * 0.98, zf - zb - 0.1, 0, 0, (zf + zb) / 2);
		k.mc(H.LEAD, '#8b7d6b').flat().box(W + 0.01, 0.014, zf - zb + 0.01, 0, Hh, (zf + zb) / 2).soft();
		for (const x of [-0.34, -0.12, 0.34]) k.mc(H.ASHLAR, S).flat().box(0.035, Hh, 0.025, x, 0, zf + 0.012).soft();
		yield;
		// sekizgen piramit taş külah (mihrap önü) ve darüşşifanın tepe açıklıklı kubbesi
		k.mc(H.ASHLAR, S2).flat().cyl(0.095, 0.1, 0.06, 8, 0.2, Hh, -0.08);
		k.mc(H.ASHLAR, '#9d8b72').cone(0.106, 0.2, 8, 0.2, Hh + 0.06, -0.08, Math.PI / 8).soft();
		k.mc(H.ASHLAR, S2).flat().cyl(0.07, 0.075, 0.035, 8, -0.24, Hh, -0.06).soft();
		dome(k, { r: 0.07, x: -0.24, y: Hh + 0.035, z: -0.06, sy: 0.7, ribs: 12, seg: 16, ring: false, col: '#9a8c7a', mat: H.ASHLAR });
		// Cennet Kapısı (kuzey): cepheden taşan, duvarı aşan dev taç kapı; çevresinde yoğun bitkisel kabartma
		const PX = 0.1;
		const pz = zf + 0.07;
		const PW = 0.3;
		const PH = 0.36;
		portal(k, { x: PX, z: pz, w: PW, h: PH, d: 0.07, col: '#c8b696', col2: '#bba98a', frames: 3, door: 0.32 });
		// "barok" taşan bezeme: iki yanda dikey kabartma kuşakları, kemer boyunca palmet dizisi, iri rozetler
		for (const sx of [-1, 1]) relief(k, { x: PX + sx * 0.118, y: 0.02, z: pz + 0.012, w: 0.04, h: 0.28, n: 22, r: 0.013, R, seed: sx + 3 });
		for (let i = 0; i < 18; i++) {
			const a = (i / 17) * Math.PI;
			const rr = 0.1;
			const s = 0.011 + 0.004 * (i % 2);
			k.mc(H.CARVE, '#cfbd9d').cached('rl' + (i % 4), () => blob(1, 11 + (i % 4) * 5, 1, 0.35), M4(PX - Math.cos(a) * rr * 0.95, 0.15 + Math.sin(a) * rr * 1.3, pz + 0.018, s, s, s * 0.7));
		}
		for (const sx of [-1, 1]) rosette(k, PX + sx * 0.1, 0.27, pz + 0.014, 0.024);
		rosette(k, PX, 0.33, pz + 0.012, 0.018);
		// taç: üstte taşan kornişli silme
		k.mc(H.CARVE, '#c2b090').flat().box(PW + 0.03, 0.02, 0.09, PX, PH, pz - 0.03).soft();
		yield;
		// Darüşşifa kapısı (batı ön): geometrik yıldız panoları, mukarnaslı niş
		portal(k, { x: -0.24, z: zf + 0.045, w: 0.2, h: 0.27, d: 0.045, col: '#c4b192', col2: '#b5a385', frames: 3 });
		for (const sx of [-1, 1]) rosette(k, -0.24 + sx * 0.07, 0.2, zf + 0.05, 0.016, '#cbb898');
		// Şah Kapısı (batı yan): daha küçük, düz silmeli
		portal(k, { x: -W / 2 - 0.02, z: -0.04, w: 0.16, h: 0.22, d: 0.04, col: '#c0ad8e', col2: '#b2a083', frames: 2, ry: -Math.PI / 2 });
		// tek kısa minare (Selçuklu, sonradan): kare kaide, sekizgen gövde
		minaret(k, 0.4, -0.2, { y0: Hh, h: 0.26, r: 0.02, balconies: 1, col: '#b9a88e', sides: 8, capH: 0.16, cap: '#8f8170' });
		for (const [x, z] of [[-0.6, 0.38], [0.6, 0.36], [0.66, -0.1], [-0.66, -0.12]]) tree(k, x, z, 1, R);
		for (const [x, z] of [[-0.48, 0.48], [0.46, 0.5]]) cypress(k, x, z, 1.15);
	},

	// ---------------------------------------------------------------- Diyarbakır Surları ve On Gözlü Köprü
	*diyarbakir(k, R) {
		ground(k, 0.8, { pave: '#77705f', paveR: 0.25, jit: 0.06, mid: '#7f8a52' });
		// kent sırtı: sur sarp yamacın kenarında kıvrılır; yamaç Hevsel bahçelerine, oradan Dicle'ye iner
		const wz = (x) => -0.12 + 0.13 * Math.sin(x * 2.3 + 0.4) - 0.05 * x;
		const TOP = 0.2;
		const land = (x, z) => {
			const e = z - wz(x);
			const top = TOP + 0.01 * (fbm(x * 6, 0, z * 6) - 0.5);
			const slope = top * (1 - sm(0.0, 0.26, e)) + 0.035 * sm(0.05, 0.3, e) * (1 - sm(0.3, 0.42, e));
			return e < 0 ? top : slope;
		};
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -0.82,
			z1: 0.62,
			cell: 0.02,
			mat: H.ROCK,
			h: (x, z) => land(x, z),
			col: (x, y, z, ny) => {
				const e = z - wz(x);
				const n = fbm(x * 9, y * 9, z * 9);
				const rock = mixc('#4c4842', '#6e675c', n).clone();
				const garden = _c2.set(n > 0.5 ? '#5f8a3c' : '#73963f').clone();
				const city = new THREE.Color('#8d8270');
				return e < -0.03 ? city.lerp(rock, 0.3) : rock.lerp(garden, sm(0.75, 0.95, ny) * sm(0.0, 0.12, e));
			},
		});
		yield;
		// Dicle (önde) ve On Gözlü Köprü (çapraz, on sivri kemer, mahmuzlu ayaklar)
		const RZ = 0.44;
		k.mc(H.WATER, '#3f7f84').flat().box(1.64, 0.004, 0.2, 0, 0.012, RZ).soft();
		k.push().move(0.24, 0, RZ).rot(0, -0.35, 0);
		const nb = 10;
		const L = 0.8;
		const holes = [];
		for (let i = 0; i < nb; i++) holes.push({ x: -L / 2 + (L / nb) * (i + 0.5), y: 0, w: (L / nb) * 0.62, h: 0.055 + (i === 5 ? 0.012 : 0), kind: 'pointed' });
		wall(k, { w: L, h: 0.075, t: 0.05, y: 0.0, holes, mat: H.ASHLAR, col: '#58524a', glass: false });
		k.mc(H.PAVE, '#6d665b').flat().box(L, 0.004, 0.048, 0, 0.075, 0).soft();
		for (let i = 0; i <= nb; i++) for (const sz of [-1, 1]) k.mc(H.ASHLAR, '#4e4943').flat().cone(0.016, 0.045, 4, -L / 2 + (L / nb) * i, 0.0, sz * 0.026, Math.PI / 4).soft();
		k.pop();
		yield;
		// bazalt sur: kıvrılan perde duvar, aralıklı yuvarlak ve çokgen burçlar (Yedi Kardeş, Ulu Beden iri)
		const B = '#3d3936';
		const xs = [];
		for (let x = -0.74; x <= 0.75; x += 0.1) xs.push(x);
		for (let i = 0; i < xs.length - 1; i++) curtain(k, xs[i], wz(xs[i]) - 0.01, xs[i + 1], wz(xs[i + 1]) - 0.01, { h: 0.1, y: TOP - 0.02, t: 0.035, col: B, mat: H.ASHLAR, batter: 0.008 });
		for (let i = 0; i < xs.length; i += 2) {
			const x = xs[i];
			const big = i === 6 || i === 10;
			const z = wz(x) - 0.005;
			if (i % 4 === 0) towerRound(k, x, z, { r: big ? 0.065 : 0.045, h: big ? 0.16 : 0.13, y: TOP - 0.03, col: '#38342f', slits: 3 });
			else {
				k.mc(H.ASHLAR, '#38342f').flat().cyl(big ? 0.06 : 0.045, big ? 0.065 : 0.05, big ? 0.15 : 0.125, 8, x, TOP - 0.03, z).soft();
				k.mc(H.ASHLAR, '#423d38').flat().cyl(big ? 0.064 : 0.049, big ? 0.064 : 0.049, 0.02, 8, x, TOP - 0.03 + (big ? 0.15 : 0.125), z).soft();
			}
			if (big) k.mc(H.CARVE, '#6a6258').cyl(big ? 0.066 : 0.05, big ? 0.066 : 0.05, 0.016, 24, x, TOP + 0.07, z);
		}
		yield;
		// kent içi: bazalt evler ve Ulu Cami'nin kare minaresi
		for (let i = 0; i < 12; i++) {
			const x = -0.6 + R() * 1.2;
			const z = wz(x) - 0.12 - R() * 0.3;
			k.mc(H.ASHLAR, R() < 0.5 ? '#514b44' : '#5e574e').flat().box(0.07 + R() * 0.05, 0.05 + R() * 0.03, 0.07, x, TOP - 0.01, z).soft();
		}
		k.mc(H.ASHLAR, '#4a4540').flat().box(0.05, 0.22, 0.05, -0.1, TOP, wz(-0.1) - 0.3).soft();
		k.mc(H.ASHLAR, '#57514a').cone(0.04, 0.05, 4, -0.1, TOP + 0.22, wz(-0.1) - 0.3, Math.PI / 4).soft();
		// Hevsel bahçeleri: yamaçta ve kıyıda ağaç sıraları
		for (let i = 0; i < 18; i++) {
			const x = -0.7 + (i % 9) * 0.17 + (R() - 0.5) * 0.04;
			const z = wz(x) + 0.2 + Math.floor(i / 9) * 0.09 + (R() - 0.5) * 0.03;
			if (z > RZ - 0.12) continue;
			tree(k, x, z, 0.95, R, land(x, z) - 0.005, R() < 0.5 ? '#4f8a36' : '#5f9a3c');
		}
	},

	// ---------------------------------------------------------------- Uzungöl (Trabzon)
	*uzungol(k, R) {
		ground(k, 0.8, { pave: '#5f8a48', paveR: 0.2, mid: '#56824a' });
		// vadinin ağzı Kuşbakışı kamerasının girdiği yöne (haritada sırtın örtmediği yan) döner
		k.push().rot(0, -1.57, 0);
		// dar vadi: iki yanda ve arkada sarp, ormanlı yamaçlar; ortada uzun göl
		const lake = (x, z) => ((x + 0.04) / 0.2) ** 2 + ((z + 0.08) / 0.46) ** 2;
		const val = (x, z) => {
			const side = 0.34 * sm(0.2, 0.6, Math.abs(x + 0.05 * Math.sin(z * 3))) + 0.26 * sm(-0.32, -0.8, z);
			const edge = sm(0.84, 0.6, Math.abs(x)) * sm(-0.84, -0.62, z);
			return Math.max(0, side + 0.03 * (fbm(x * 5, 0, z * 5) - 0.5)) * edge;
		};
		const pines = [];
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -0.82,
			z1: 0.62,
			cell: 0.022,
			mat: H.GRASS,
			h: val,
			col: (x, y, z, ny) => {
				const n = fbm(x * 8, y * 8, z * 8);
				const forest = mixc('#28502e', '#3c6a36', n).clone();
				const meadow = _c2.set('#6e9c4a').clone();
				const rock = new THREE.Color('#77786f');
				return meadow.lerp(forest, sm(0.06, 0.16, y)).lerp(rock, sm(0.62, 0.4, ny) * 0.6);
			},
		});
		k.mc(H.WATER, '#4aa3a6').add(new THREE.CircleGeometry(1, k._n(40)).rotateX(-Math.PI / 2), M4(-0.04, 0.004, -0.08, 0.205, 1, 0.47));
		yield;
		// sarp yamaçlarda sık ladin ormanı (iri, koyu); tepelerde kayalık
		for (let i = 0; i < 70; i++) {
			const x = -0.78 + R() * 1.56;
			const z = -0.78 + R() * 1.3;
			const y = val(x, z);
			if (y < 0.05 || lake(x, z) < 1.3) continue;
			pine(k, x, z, 0.85 + R() * 0.45, y - 0.01, R);
			if (pines.length > 60) break;
			pines.push(1);
		}
		yield;
		// kıyıda beyaz cami (tek minare), ahşap evler, göle uzanan ahşap iskele
		const cx = 0.12;
		const cz = 0.36;
		block(k, { w: 0.14, d: 0.12, h: 0.09, x: cx, z: cz, sides: [3, 2, 3, 2], rows: [[0.25, 0.5]], ww: 0.018, kind: 'round', mat: H.PLASTER, col: '#f4f0e7', frame: 0.003, roof: 'flat' });
		dome(k, { r: 0.058, x: cx, y: 0.1, z: cz, sy: 0.85, ribs: 14, seg: 18, alemS: 0.45 });
		minaret(k, cx + 0.1, cz + 0.02, { h: 0.34, r: 0.013, balconies: 1, col: '#f4f0e7', mat: H.PLASTER, sides: 12, capH: 0.24 });
		for (const [x, z, ry] of [[-0.24, 0.36, 0.3], [0.32, 0.26, -0.4], [-0.3, 0.12, 0.6], [0.3, 0.08, -0.2], [-0.12, 0.48, 0]]) {
			k.push().move(x, val(x, z), z).rot(0, ry, 0);
			k.mc(H.ASHLAR, '#8f8878').flat().box(0.1, 0.035, 0.085, 0, 0, 0);
			k.mc(H.WOOD, '#83532f').box(0.11, 0.07, 0.095, 0, 0.035, 0);
			for (const dx of [-0.026, 0.026]) k.mc(H.WIN, COL.GLASS).box(0.018, 0.026, 0.003, dx, 0.055, 0.048);
			k.mc(H.WOOD, '#6a4428').box(0.11, 0.006, 0.02, 0, 0.035, 0.056);
			k.soft();
			roofGable(k, { w: 0.13, d: 0.11, h: 0.045, y: 0.105, col: '#7f858c' });
			k.pop();
		}
		k.mc(H.WOOD, '#7a5432').flat().box(0.03, 0.006, 0.16, 0.0, 0.006, 0.32).soft();
		k.pop();
	},

	// ---------------------------------------------------------------- Bergama Akropolü
	*bergama(k, R) {
		ground(k, 0.8, { pave: '#b6a585', paveR: 0.25, jit: 0.06 });
		// dik akropol tepesi: önde dik yamaç (tiyatro oyuğu), teraslar, tepede düzlük
		const hill = (x, z) => {
			const r = Math.hypot(x * 0.95, (z + 0.18) * 1.15);
			let y = 0.42 * (1 - sm(0.12, 0.72, r)) + 0.012 * (fbm(x * 7, 0, z * 7) - 0.5);
			// teraslar: kademeli düzlükler
			y = y - 0.012 * Math.sin(y * 70);
			// tiyatro oyuğu (güneybatı yamacı, önde)
			const tz = z - 0.22;
			const tr = Math.hypot(x - 0.06, tz);
			if (tz < 0.04 && tr < 0.44) y = Math.min(y, 0.02 + Math.max(0, tr - 0.1) * 0.75);
			return Math.max(0, y);
		};
		hfield(k, {
			x0: -0.82,
			x1: 0.82,
			z0: -0.82,
			z1: 0.62,
			cell: 0.02,
			mat: H.ROCK,
			h: hill,
			col: (x, y, z, ny) => mixc('#8b8170', '#b5a88e', fbm(x * 9, y * 12, z * 9)).lerp(_c2.set('#8e9a5c'), sm(0.82, 0.96, ny) * 0.5),
		});
		yield;
		// dünyanın en dik antik tiyatrosu: yamaca oyulmuş dar ve yüksek oturma basamakları
		cavea(k, { r0: 0.1, r1: 0.42, n: 18, a0: Math.PI * 0.7, a1: Math.PI * 1.3, dh: 0.0225, x: 0.06, z: 0.24, col: '#d4c6a8', col2: '#c4b597', aisles: 4 });
		k.mc(H.PAVE, '#cbbd9f').flat().box(0.7, 0.01, 0.07, 0.06, 0.0, 0.3).soft();
		yield;
		// tepede Trajan tapınağı: kemerli dolgu teras, beyaz mermer korint sütunlar, saçak ve alınlık parçası
		const ty = hill(-0.12, -0.24) + 0.005;
		wall(k, { w: 0.42, h: 0.08, t: 0.05, x: -0.12, y: ty - 0.08, z: -0.06, holes: [0, 1, 2, 3].map((i) => ({ x: -0.15 + i * 0.1, y: 0, w: 0.06, h: 0.065, kind: 'round' })), col: '#c8b894', dark: true });
		k.mc(H.MARBLE, '#e9e2d2').flat().box(0.44, 0.03, 0.3, -0.12, ty, -0.2).soft();
		k.mc(H.MARBLE, '#efe9dc').flat().box(0.24, 0.025, 0.16, -0.12, ty + 0.03, -0.2).soft();
		for (let i = 0; i < 6; i++) for (const z of [-0.13, -0.27]) column(k, -0.24 + i * 0.048, ty + 0.055, z, { h: 0.17, r: 0.0085, order: 'corinthian', col: COL.MARBLE });
		for (const x of [-0.24, 0.0]) column(k, x, ty + 0.055, -0.2, { h: 0.17, r: 0.0085, order: 'corinthian', col: COL.MARBLE });
		entablature(k, { x0: -0.26, x1: 0.0, y: ty + 0.225, z: -0.13, d: 0.03, h: 0.03, col: COL.MARBLE });
		pediment(k, { w: 0.06, h: 0.03, x: -0.24, y: ty + 0.255, z: -0.2, d: 0.03, col: COL.MARBLE, ry: Math.PI / 2 });
		// yamaçta sur kalıntıları ve Athena terası duvarı
		curtain(k, -0.5, -0.05, -0.3, 0.1, { h: 0.05, y: hill(-0.4, 0.02) - 0.02, t: 0.03, col: '#a99a80', slits: false });
		curtain(k, 0.32, -0.2, 0.5, -0.02, { h: 0.05, y: hill(0.4, -0.1) - 0.02, t: 0.03, col: '#a99a80', slits: false });
		for (const [x, z] of [[-0.6, 0.42], [0.62, 0.38], [0.55, -0.5], [-0.62, -0.4]]) pine(k, x, z, 1.05, hill(x, z) - 0.01, R);
		for (const [x, z] of [[0.42, 0.44], [-0.45, 0.48]]) tree(k, x, z, 1, R);
	},
};
