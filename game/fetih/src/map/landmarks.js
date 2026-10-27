// Ünlü yapıların minyatürleri: her ilin simgesi gerçek yerinde, oyuncak maket ölçeğinde (abartılı
// büyük). Hepsi tek geometride birleşir: tek çizim + tek gölge çizimi. Her köşe ilinin kimliğini
// taşır: il yükselince yapı da kalkar, seçim kipinde ille birlikte söner. Kapadokya balonları süzülür.
//
// Konumlar boylam/enlem (gerçek yerler). Bir yapı il merkezine (kale ve yazı yeri) çok yakınsa
// merkezden uzağa itilir.

import * as THREE from 'three';
import { COMMON, SHADOW, LIGHT, FINISH, PROV } from '../gfx/shaderlib.js';
import { Kit, archShape, facadeShape } from '../gfx/kit.js';

const VS = /* glsl */ `
${COMMON}
${PROV}
attribute vec3 color;
attribute float tag;
attribute float anim;
uniform float uPLift, uPSel;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec2 vSel;
void main() {
	vec4 fx = provRow(tag, 3);
	vec3 p = position;
	p.y += fx.x * uPLift + fx.z * uPSel;
	// balon: süzülme (anim = balon kimliği)
	if (anim > 0.5) {
		float ph = anim * 7.31;
		p.y += sin(uTime * 0.7 + ph) * 0.12;
		p.x += sin(uTime * 0.31 + ph * 1.7) * 0.06;
	}
	vW = p;
	vN = normal;
	vC = color;
	vSel = vec2(fx.z, fx.w);
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FS = /* glsl */ `
#define SHADOW_TAPS __TAPS__
${COMMON}
${SHADOW}
${LIGHT}
${FINISH}
${PROV}
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying vec2 vSel;
void main() {
	vec3 N = normalize(vN);
	vec3 alb = vC;
	float gloss = 0.1;
	// su yüzeyi işareti (b > 1): parlak
	if (vC.b > 1.0) {
		alb = vec3(vC.r, vC.g, vC.b - 1.0);
		gloss = 0.9;
	}
	float sh = shadowAt(vW, N);
	vec3 V = normalize(cameraPosition - vW);
	vec3 c = shade(alb, N, V, 1.0, sh, gloss, 0.55);
	c = provDim(c, vSel.x, vSel.y);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;

const DEPTH_VS = /* glsl */ `
${PROV}
attribute float tag;
attribute float anim;
uniform float uPLift, uPSel;
uniform float uTime;
void main() {
	vec4 fx = provRow(tag, 3);
	vec3 p = position;
	p.y += fx.x * uPLift + fx.z * uPSel;
	if (anim > 0.5) p.y += sin(uTime * 0.7 + anim * 7.31) * 0.12;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const DEPTH_FS = /* glsl */ `void main(){ gl_FragColor = vec4(1.0); }`;

// renkler
const MARBLE = '#efe6d2';
const CREAM = '#f1e7cf';
const LEAD = '#7e8da0';
const LEAD2 = '#68788d';
const GOLD = '#f2c14e';
const DARK = '#3a2c25';
const ROOF = '#c8553a';
const WOOD = '#8c5a34';
const GRASS = '#6fa64a';
const ROCK = '#8f806e';

/** Kaide: yapının altında yamaca gömülen küçük toprak/taş tabla. */
function plinth(k, r, col = GRASS, h = 0.34) {
	r *= 0.82;
	k.color('#857563').cyl(r * 0.98, r * 1.1, h - 0.04, 9, 0, -h + 0.02);
	k.color(col).cyl(r, r, 0.045, 9, 0, -0.025);
}

/** Pürüzlü kaya kütlesi (sarsılmış ikosahedron). */
function rock(rx, ry, rz, seed) {
	const g = new THREE.IcosahedronGeometry(1, 1);
	const p = g.getAttribute('position');
	let s = seed * 7919 + 13;
	const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
	const seen = new Map();
	for (let i = 0; i < p.count; i++) {
		const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
		let j = seen.get(key);
		if (j == null) seen.set(key, (j = 0.82 + R() * 0.3));
		p.setXYZ(i, p.getX(i) * rx * j, p.getY(i) * ry * j, p.getZ(i) * rz * j);
	}
	return g;
}

function tri(w, h) {
	const t = new THREE.Shape();
	t.moveTo(-w / 2, 0);
	t.lineTo(w / 2, 0);
	t.lineTo(0, h);
	t.lineTo(-w / 2, 0);
	return t;
}

function minaret(k, x, z, h, r = 0.024, col = CREAM, balconies = 1) {
	k.color(col).cyl(r * 1.25, r * 1.4, 0.08, 6, x, 0, z);
	k.color(col).cyl(r * 0.85, r, h, 6, x, 0.07, z);
	for (let b = 0; b < balconies; b++) {
		const y = 0.07 + h * (0.62 + b * 0.14);
		k.color(col).cyl(r * 1.8, r * 1.2, 0.03, 6, x, y, z);
	}
	k.color(LEAD).cone(r * 1.15, h * 0.22, 6, x, 0.07 + h, z);
	k.color(GOLD).cyl(0.004, 0.004, 0.04, 3, x, 0.07 + h * 1.22, z);
}

// ------------------------------------------------------------------ yapılar (yerel: y = 0 zemin, ön yüz +z)

const B = {
	galata(k) {
		plinth(k, 0.24, '#a89f8e');
		k.color('#d4c3a3').cyl(0.135, 0.15, 0.62, 12);
		k.color('#bcaa8b').cyl(0.15, 0.15, 0.04, 12, 0, 0.2);
		k.color(DARK);
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2 + 0.3;
			k.box(0.03, 0.06, 0.02, Math.cos(a) * 0.137, 0.38, Math.sin(a) * 0.137, -a + Math.PI / 2);
		}
		// seyir balkonu
		k.color('#e5d8bd').cyl(0.18, 0.15, 0.04, 12, 0, 0.62);
		k.color('#cbbfa6').cyl(0.12, 0.12, 0.13, 12, 0, 0.66);
		k.color(DARK);
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2;
			k.box(0.03, 0.08, 0.02, Math.cos(a) * 0.122, 0.68, Math.sin(a) * 0.122, -a + Math.PI / 2);
		}
		k.color(LEAD2).cone(0.15, 0.34, 12, 0, 0.79);
		k.color(GOLD).cyl(0.005, 0.005, 0.07, 3, 0, 1.12).sphere(0.012, 4, 0, 1.19);
	},
	ayasofya(k) {
		plinth(k, 0.55, '#b3a790');
		const P = '#d99a73';
		k.color(P).box(0.66, 0.28, 0.6);
		k.color('#c98a66').box(0.7, 0.04, 0.64, 0, 0.27);
		// destek kuleleri
		for (const [x, z] of [[-0.28, -0.26], [0.28, -0.26], [-0.28, 0.26], [0.28, 0.26]]) k.color('#c98a66').box(0.1, 0.38, 0.1, x, 0, z);
		// ana kubbe ve kasnağı
		k.color(P).cyl(0.25, 0.26, 0.08, 16, 0, 0.29);
		k.color(DARK);
		for (let i = 0; i < 14; i++) {
			const a = (i / 14) * Math.PI * 2;
			k.box(0.025, 0.04, 0.02, Math.cos(a) * 0.255, 0.31, Math.sin(a) * 0.255, -a + Math.PI / 2);
		}
		k.color(LEAD).smooth(true).dome(0.25, 16, 0, 0.36, 0, 0.55).smooth(false);
		k.color(LEAD).smooth(true).dome(0.17, 12, 0, 0.27, 0.22, 0.5).dome(0.17, 12, 0, 0.27, -0.22, 0.5).smooth(false);
		k.color(GOLD).cyl(0.005, 0.005, 0.06, 3, 0, 0.5);
		// dört minare
		for (const [x, z] of [[-0.4, -0.36], [0.4, -0.36], [-0.4, 0.36], [0.4, 0.36]]) minaret(k, x, z, 0.62, 0.024, '#eadfca', 1);
	},
	anitkabir(k) {
		plinth(k, 0.62, '#c9c2b1', 0.3);
		const T = '#ece4d3';
		k.color('#dcd3c0').box(1.0, 0.08, 0.62);
		// merdiven
		for (let i = 0; i < 4; i++) k.color(T).box(0.5, 0.02, 0.05, 0, 0.0 + i * 0.02, 0.33 + (3 - i) * 0.035);
		k.color(T).box(0.66, 0.06, 0.4, 0, 0.08);
		// iç salon
		k.color('#d9cfbb').box(0.48, 0.26, 0.26, 0, 0.14);
		// kare sütunlar (çevre)
		const cols = [];
		for (let i = 0; i < 9; i++) cols.push([-0.3 + i * 0.075, 0.17], [-0.3 + i * 0.075, -0.17]);
		for (let i = 1; i < 4; i++) cols.push([-0.3, -0.17 + i * 0.085], [0.3, -0.17 + i * 0.085]);
		for (const [x, z] of cols) k.color(T).box(0.028, 0.26, 0.028, x, 0.14, z);
		k.color(T).box(0.68, 0.05, 0.42, 0, 0.4);
		k.color('#e4dccb').box(0.56, 0.04, 0.3, 0, 0.45);
		// aslanlı yol: iki sıra küçük heykel
		for (let i = 0; i < 6; i++) for (const x of [-0.42, 0.42]) k.color('#d6ccb8').box(0.035, 0.05, 0.05, x, 0.08, 0.28 - i * 0.1);
	},
	peri(k, R) {
		plinth(k, 0.6, '#d9c39b', 0.3);
		const cones = [[0, 0, 0.7], [0.22, 0.12, 0.5], [-0.24, 0.08, 0.56], [0.1, -0.24, 0.62], [-0.12, 0.27, 0.42], [0.32, -0.12, 0.45], [-0.35, -0.18, 0.5], [0.36, 0.3, 0.36]];
		for (const [x, z, h] of cones) {
			k.color(R() < 0.5 ? '#ecd5aa' : '#e2c597').cone(0.1 + h * 0.08, h, 7, x, 0, z, R() * 3);
			k.color('#8a6a52').cyl(0.03, 0.07, 0.07, 7, x, h * 0.9, z).cone(0.07, 0.05, 7, x, h * 0.9 + 0.07, z);
			k.color(DARK).box(0.025, 0.035, 0.02, x, h * 0.35, z + 0.09, 0);
		}
		// balonlar
		const cols = [['#ff5a4e', '#ffd23f'], ['#3f8cff', '#ffffff'], ['#ff9f1c', '#7a3cff'], ['#2ec4b6', '#ff5a8a']];
		[[0.1, 1.55, 0.25], [-0.5, 1.95, -0.1], [0.55, 1.3, -0.35], [-0.15, 2.3, -0.5]].forEach(([x, y, z], i) => {
			k.setAnim(1 + i * 0.37);
			const [a, b] = cols[i];
			// şeritli balon: dilim dilim iki renk
			for (let s = 0; s < 8; s++) {
				const g = new THREE.SphereGeometry(0.15, 2, 8, (s / 8) * Math.PI * 2, Math.PI / 4, 0, Math.PI * 0.82);
				g.scale(1, 1.2, 1);
				g.translate(x, y, z);
				k.color(s % 2 ? a : b).add(g);
			}
			k.color(WOOD).box(0.06, 0.05, 0.06, x, y - 0.27, z);
			k.color('#5b4636');
			for (const [dx, dz] of [[-0.025, -0.025], [0.025, -0.025], [-0.025, 0.025], [0.025, 0.025]]) k.box(0.004, 0.12, 0.004, x + dx, y - 0.22, z + dz);
			k.setAnim(0);
		});
	},
	nemrut(k) {
		plinth(k, 0.62, '#b8a78f', 0.32);
		// tümülüs (çakıl tepesi)
		k.color('#b4a691').cone(0.55, 0.5, 9, 0, 0, -0.18);
		// teras ve dev başlar
		k.color('#c9b694').box(0.95, 0.05, 0.3, 0, 0, 0.32);
		const heads = [-0.36, -0.18, 0, 0.18, 0.36];
		heads.forEach((x, i) => {
			const c = i % 2 ? '#d6c3a0' : '#cbb58f';
			// gövde kalıntısı (arkada oturan heykel, başsız)
			k.color('#bfa983').box(0.12, 0.2, 0.09, x, 0.05, 0.19);
			// yerdeki dev baş: yüz, burun, kaş; üstünde sivri külah
			k.color(c).box(0.1, 0.12, 0.09, x, 0.05, 0.38);
			k.color(c).box(0.11, 0.035, 0.1, x, 0.035, 0.38);
			k.color('#b9a27e').box(0.022, 0.035, 0.02, x, 0.1, 0.43);
			k.color('#7e6b52').box(0.07, 0.012, 0.01, x, 0.13, 0.428);
			k.color(c).cone(0.06, 0.13, 6, x, 0.17, 0.38);
		});
	},
	pamukkale(k) {
		plinth(k, 0.6, '#e9ece9', 0.36);
		// beyaz traverten basamaklar, üstlerinde turkuaz havuzlar (yamaç kameraya bakar)
		const W = '#f6f7f4';
		for (let i = 0; i < 6; i++) {
			const z = 0.36 - i * 0.12;
			const y = i * 0.07;
			const r = 0.42 - i * 0.035;
			const g = new THREE.CylinderGeometry(r, r * 1.03, 0.07 + y, 12, 1, false, -Math.PI / 2 - 1.0, 2.0);
			g.translate(0, (0.07 + y) / 2, 0);
			g.scale(1, 1, 0.45);
			g.translate(0, 0, z - 0.15);
			k.color(i % 2 ? W : '#eef1ef').add(g);
			const pool = new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.01, 12, 1, false, -Math.PI / 2 - 0.9, 1.8);
			pool.translate(0, 0.07 + y + 0.004, 0);
			pool.scale(1, 1, 0.4);
			pool.translate(0, 0, z - 0.155);
			k.raw(0.2, 0.75, 1.0 + 0.85).add(pool);
		}
		// arkada beyaz traverten yamacı ve tepede Hierapolis kalıntısı
		k.color('#eef0ec').add(rock(0.55, 0.42, 0.3, 4), new THREE.Matrix4().makeTranslation(0, 0.1, -0.45));
		for (let i = 0; i < 4; i++) k.color(MARBLE).cyl(0.016, 0.018, 0.12 + (i % 2) * 0.05, 5, -0.18 + i * 0.12, 0.42, -0.5);
	},
	sumela(k) {
		plinth(k, 0.5, '#5f7a4a', 0.32);
		// sarp kaya yüzü (ormanlı vadinin dik yamacı)
		k.color('#7a776b').add(rock(0.5, 1.2, 0.32, 3), new THREE.Matrix4().makeTranslation(0, 0.55, -0.2));
		k.color('#6c695e').add(rock(0.32, 0.8, 0.25, 9), new THREE.Matrix4().makeTranslation(0.3, 0.9, -0.25));
		k.color('#837f72').add(rock(0.3, 0.6, 0.25, 5), new THREE.Matrix4().makeTranslation(-0.35, 0.8, -0.15));
		k.color('#2f6a33').add(rock(0.3, 0.12, 0.25, 2), new THREE.Matrix4().makeTranslation(0.05, 1.55, -0.2));
		// kayaya yapışık manastır
		const y0 = 0.45;
		k.color(CREAM).box(0.5, 0.18, 0.12, 0, y0, 0.08).box(0.3, 0.12, 0.1, 0.05, y0 + 0.18, 0.07);
		k.color(ROOF).box(0.52, 0.03, 0.14, 0, y0 + 0.18, 0.08).box(0.32, 0.03, 0.12, 0.05, y0 + 0.3, 0.07);
		k.color(DARK);
		for (let i = 0; i < 6; i++) k.box(0.025, 0.05, 0.01, -0.2 + i * 0.08, y0 + 0.07, 0.145);
		for (let i = 0; i < 3; i++) k.box(0.025, 0.04, 0.01, -0.03 + i * 0.07, y0 + 0.22, 0.125);
		// çamlar
		for (const [x, z, s] of [[-0.35, 0.25, 1], [0.38, 0.22, 0.9], [0.2, 0.35, 0.8], [-0.1, 0.36, 0.7]]) {
			k.color('#1f5a2c').cone(0.09 * s, 0.25 * s, 6, x, 0.02, z).cone(0.07 * s, 0.2 * s, 6, x, 0.14 * s, z);
		}
	},
	uzungol(k) {
		plinth(k, 0.6, '#5d9447', 0.32);
		// göl
		k.raw(0.12, 0.55, 0.62 + 1.0).cyl(0.36, 0.36, 0.012, 14, 0.05, 0.02, -0.05);
		// cami ve minare
		k.color('#f3efe6').box(0.16, 0.12, 0.14, -0.28, 0.02, 0.3);
		k.color(LEAD).smooth(true).dome(0.07, 8, -0.28, 0.14, 0.3, 0.8).smooth(false);
		minaret(k, -0.16, 0.36, 0.32, 0.018, '#f3efe6', 1);
		// ahşap evler
		for (const [x, z] of [[0.34, 0.3], [0.42, 0.06], [-0.4, -0.1]]) {
			k.color(WOOD).box(0.12, 0.1, 0.1, x, 0.02, z);
			k.color(ROOF).cone(0.1, 0.07, 4, x, 0.12, z, Math.PI / 4);
		}
		for (const [x, z] of [[0.1, -0.38], [-0.15, -0.4], [0.35, -0.3], [-0.38, 0.12], [0.45, 0.4]]) k.color('#1e5a2b').cone(0.06, 0.2, 6, x, 0.02, z).cone(0.045, 0.15, 6, x, 0.12, z);
	},
	celsus(k) {
		plinth(k, 0.5, '#cdbf9f', 0.3);
		k.color('#e2d6bd').box(0.62, 0.05, 0.3);
		for (let i = 0; i < 3; i++) k.color('#e8dcc4').box(0.36, 0.02, 0.04, 0, 0.05 + i * 0.02, 0.17 + (2 - i) * 0.03);
		// cephe arka duvarı (kapılı)
		k.color('#e9dcc2').slab(facadeShape(0.56, 0.5, [[-0.15, 0.08, 0.14, 0.06], [0, 0.1, 0.17, 0.06], [0.15, 0.08, 0.14, 0.06]]), 0.06, 0, 0.05, -0.05);
		k.color(DARK).box(0.5, 0.17, 0.02, 0, 0.1, -0.08);
		// iki katlı sütunlar ve alınlıklar
		for (const fl of [0, 1]) {
			const y = 0.07 + fl * 0.22;
			for (let i = 0; i < 8; i++) {
				const x = -0.245 + i * 0.07;
				k.color(MARBLE).cyl(0.014, 0.016, 0.19, 6, x, y, 0.06);
			}
			for (let j = 0; j < 4; j++) {
				const x = -0.21 + j * 0.14;
				k.color('#f1e8d6').box(0.11, 0.025, 0.05, x, y + 0.19, 0.06);
				if (fl === 1) k.color('#f1e8d6').slab(tri(0.11, 0.045), 0.04, x, y + 0.215, 0.06);
			}
		}
		// dağınık sütun kalıntıları
		for (const [x, z, h] of [[-0.38, 0.22, 0.12], [0.36, 0.25, 0.2], [0.42, -0.1, 0.08], [-0.42, -0.18, 0.16]]) k.color(MARBLE).cyl(0.016, 0.018, h, 6, x, 0.05, z);
	},
	mevlana(k) {
		plinth(k, 0.45, '#b9ad94', 0.3);
		k.color(CREAM).box(0.62, 0.16, 0.34, 0, 0, -0.04);
		k.color(LEAD).smooth(true);
		for (const x of [-0.22, -0.08, 0.06]) k.dome(0.065, 8, x, 0.16, -0.06, 0.85);
		k.smooth(false);
		// yeşil kubbe (Kubbe-i Hadra): sekizgen kasnak + yivli külah
		const G = '#2fae8a';
		k.color(G).cyl(0.11, 0.12, 0.26, 8, 0.22, 0.16, -0.04);
		k.color('#259774').cyl(0.125, 0.125, 0.03, 8, 0.22, 0.42, -0.04);
		k.color(G).cone(0.115, 0.36, 16, 0.22, 0.45, -0.04);
		k.color(GOLD).cyl(0.005, 0.005, 0.08, 3, 0.22, 0.8, -0.04).sphere(0.013, 4, 0.22, 0.88, -0.04);
		minaret(k, -0.3, 0.12, 0.4, 0.02, CREAM, 1);
		// revak
		k.color(DARK);
		for (let i = 0; i < 6; i++) k.box(0.03, 0.07, 0.01, -0.25 + i * 0.09, 0.03, 0.135);
	},
	selimiye(k) {
		plinth(k, 0.6, '#b1a891', 0.32);
		const W = '#efe5cf';
		k.color(W).box(0.62, 0.22, 0.62);
		k.color('#e2d6bc').box(0.7, 0.05, 0.4, 0, 0, 0.42);
		// sekizgen kasnak ve dev kubbe
		k.color(W).cyl(0.3, 0.32, 0.1, 8, 0, 0.22);
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
			k.color(W).cyl(0.028, 0.032, 0.16, 6, Math.cos(a) * 0.32, 0.22, Math.sin(a) * 0.32);
			k.color(LEAD).cone(0.035, 0.07, 6, Math.cos(a) * 0.32, 0.38, Math.sin(a) * 0.32);
		}
		k.color(DARK);
		for (let i = 0; i < 16; i++) {
			const a = (i / 16) * Math.PI * 2;
			k.box(0.022, 0.05, 0.02, Math.cos(a) * 0.305, 0.245, Math.sin(a) * 0.305, -a + Math.PI / 2);
		}
		k.color(LEAD).smooth(true).dome(0.3, 18, 0, 0.32, 0, 0.62).smooth(false);
		k.color(GOLD).cyl(0.006, 0.006, 0.09, 3, 0, 0.5).sphere(0.015, 4, 0, 0.6);
		// dört ince uzun minare, üçer şerefe
		for (const [x, z] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) minaret(k, x, z, 0.95, 0.022, W, 3);
	},
	ishakpasa(k) {
		// kayalık yamaç üstünde saray
		k.color(ROCK).cyl(0.6, 0.75, 0.42, 9, 0, -0.38);
		k.color('#9b8a73').cyl(0.55, 0.6, 0.06, 9, 0, 0.0);
		const S = '#d9ab80';
		k.color(S).box(0.8, 0.2, 0.5, 0, 0.04, -0.02);
		k.merlons(-0.4, 0.23, 0.4, 0.23, 0.24, 0.05, 0.05, 0.04, 0.04);
		// yüksek taç kapı
		k.color('#e0b58b').box(0.2, 0.36, 0.08, -0.12, 0.04, 0.25);
		k.color('#6b4630').slab(archShape(0.09, 0.2), 0.02, -0.12, 0.06, 0.295);
		// köşe kuleleri
		for (const [x, z] of [[-0.4, 0.23], [0.4, 0.23], [0.4, -0.27], [-0.4, -0.27]]) k.color(S).cyl(0.06, 0.07, 0.3, 8, x, 0.04, z).cone(0.07, 0.08, 8, x, 0.34, z);
		// kubbe ve çizgili minare
		k.color(S).cyl(0.1, 0.11, 0.08, 10, 0.18, 0.24, -0.05);
		k.color('#c7956b').smooth(true).dome(0.1, 10, 0.18, 0.32, -0.05, 0.9).smooth(false);
		for (let i = 0; i < 6; i++) k.color(i % 2 ? '#b8553e' : '#f0dcc0').cyl(0.03, 0.032, 0.07, 6, 0.36, 0.24 + i * 0.07, 0.08);
		k.color('#f0dcc0').cyl(0.05, 0.035, 0.03, 6, 0.36, 0.66, 0.08);
		k.color(LEAD).cone(0.035, 0.1, 6, 0.36, 0.69, 0.08);
	},
	safranbolu(k, R) {
		plinth(k, 0.55, '#a8a28f', 0.32);
		const houses = [[-0.22, 0.12, 0.2], [0.18, 0.18, -0.3], [0.05, -0.22, 0.5], [-0.3, -0.25, -0.1], [0.36, -0.08, 0.2]];
		for (const [x, z, ry] of houses) {
			k.push().move(x, 0, z).rot(0, ry, 0);
			// taş zemin kat, çıkmalı beyaz üst kat
			k.color('#cdbfa5').box(0.18, 0.1, 0.16);
			k.color('#f6f1e4').box(0.22, 0.16, 0.2, 0, 0.1, 0.01);
			// ahşap dikmeler ve pencereler
			k.color('#5a3a24');
			for (const dx of [-0.105, 0, 0.105]) k.box(0.012, 0.16, 0.012, dx, 0.1, 0.112);
			k.box(0.22, 0.012, 0.012, 0, 0.1, 0.112).box(0.22, 0.012, 0.012, 0, 0.255, 0.112);
			k.color('#3c4a5a');
			for (const dx of [-0.055, 0.055]) k.box(0.04, 0.06, 0.01, dx, 0.16, 0.114);
			// kiremit çatı
			k.color(R() < 0.5 ? '#c4573b' : '#b84a33').cone(0.2, 0.12, 4, 0, 0.26, 0.01, Math.PI / 4);
			k.pop();
		}
		k.color('#2f6b35').ico(0.06, 0.0, 0.08, 0.36).ico(0.05, -0.42, 0.06, 0.1);
	},
	gobekli(k) {
		plinth(k, 0.55, '#c3a57f', 0.3);
		k.color('#b39472').cyl(0.5, 0.52, 0.03, 14, 0, 0.0);
		// dairesel çevre duvarları ve T biçimli dikilitaşlar
		for (const [cx, cz, r] of [[-0.18, 0.05, 0.22], [0.22, -0.08, 0.2], [0.05, 0.3, 0.15]]) {
			k.color('#a88b68').cyl(r + 0.03, r + 0.03, 0.06, 12, cx, 0.02, cz, true);
			const n = Math.round(r * 40);
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2;
				const x = cx + Math.cos(a) * r;
				const z = cz + Math.sin(a) * r;
				k.color('#d9c4a0').box(0.03, 0.14, 0.018, x, 0.02, z, -a).box(0.06, 0.03, 0.03, x, 0.16, z, -a);
			}
			// ortada iki büyük dikilitaş
			for (const dx of [-0.04, 0.04]) k.color('#e2cfac').box(0.04, 0.22, 0.022, cx + dx, 0.02, cz).box(0.085, 0.045, 0.04, cx + dx, 0.24, cz);
		}
	},
	truva(k) {
		plinth(k, 0.45, '#b9a986', 0.3);
		const W = '#a2703f';
		const W2 = '#8a5c33';
		// tekerlekli kaide
		k.color(W2).box(0.5, 0.05, 0.24, 0, 0.06);
		for (const x of [-0.18, 0.18]) for (const z of [-0.13, 0.13]) k.color('#5e3d22').add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10).rotateX(Math.PI / 2).translate(x, 0.06, z));
		// bacaklar, gövde, boyun, baş
		for (const x of [-0.15, 0.15]) for (const z of [-0.07, 0.07]) k.color(W).box(0.05, 0.24, 0.05, x, 0.11, z);
		k.color(W).box(0.44, 0.17, 0.2, 0, 0.33);
		for (let i = 0; i < 5; i++) k.color(W2).box(0.44, 0.008, 0.202, 0, 0.35 + i * 0.03);
		k.push().move(0.2, 0.45, 0).rot(0, 0, -0.55);
		k.color(W).box(0.1, 0.26, 0.11);
		k.pop();
		k.push().move(0.31, 0.64, 0).rot(0, 0, 0.25);
		k.color(W).box(0.2, 0.09, 0.1);
		k.color('#e8d7b3').box(0.02, 0.03, 0.11, 0.06, 0.03, 0);
		k.color(W2).box(0.04, 0.06, 0.03, -0.04, 0.09, 0.03).box(0.04, 0.06, 0.03, -0.04, 0.09, -0.03);
		k.pop();
		k.color('#6b4a2c').box(0.03, 0.18, 0.04, -0.24, 0.3, 0); // kuyruk
		k.color('#4a3220').box(0.1, 0.06, 0.01, -0.05, 0.36, 0.101); // kapak
	},
	aspendos(k) {
		plinth(k, 0.62, '#c7ad86', 0.3);
		const S = '#dcbf92';
		// yarım daire basamaklı oturma yeri (kameraya açılan)
		for (let i = 0; i < 6; i++) {
			const r = 0.5 - i * 0.065;
			const h = 0.32 - i * 0.05;
			const g = new THREE.CylinderGeometry(r, r, h, 16, 1, false, Math.PI / 2, Math.PI);
			g.translate(0, h / 2, 0);
			k.color(i % 2 ? S : '#d1b386').add(g);
		}
		k.color('#cdb084').cyl(0.17, 0.17, 0.01, 12, 0, 0.0);
		// sahne binası: kemerli yüksek cephe
		k.color('#d6b98c').slab(facadeShape(1.0, 0.42, [[-0.3, 0.06, 0.12, 0.08], [-0.15, 0.06, 0.12, 0.08], [0, 0.1, 0.16, 0.0], [0.15, 0.06, 0.12, 0.08], [0.3, 0.06, 0.12, 0.08], [-0.3, 0.05, 0.08, 0.26], [0.3, 0.05, 0.08, 0.26], [0, 0.05, 0.08, 0.28]]), 0.07, 0, 0, 0.02);
		k.color('#c4a77a').box(1.04, 0.03, 0.09, 0, 0.42, 0.02);
	},
	vankalesi(k) {
		// uzun kaya sırtı + surlar
		const g = new THREE.BoxGeometry(1.2, 0.36, 0.34, 6, 2, 2);
		const p = g.getAttribute('position');
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i);
			const y = p.getY(i);
			const t = 1 - Math.abs(x) / 0.6;
			p.setY(i, y > 0 ? y * (0.5 + 0.9 * t) + Math.sin(x * 9) * 0.03 : y);
			p.setZ(i, p.getZ(i) * (0.7 + 0.4 * t));
		}
		g.translate(0, 0.08, 0);
		k.color('#a08f77').add(g);
		k.color('#8f8069').cyl(0.7, 0.75, 0.3, 10, 0, -0.3);
		const S = '#c9b48f';
		const top = (x) => 0.08 + 0.18 * (0.5 + 0.9 * (1 - Math.abs(x) / 0.6));
		for (let i = 0; i < 7; i++) {
			const x = -0.48 + i * 0.16;
			k.color(S).box(0.15, 0.07, 0.06, x, top(x) - 0.01, 0.05);
			k.merlons(x - 0.07, 0.08, x + 0.07, 0.08, top(x) + 0.06, 0.03, 0.025, 0.02, 0.02);
		}
		for (const x of [-0.38, 0.0, 0.32]) k.color(S).cyl(0.05, 0.055, 0.14, 8, x, top(x) - 0.02, 0.05).merlonRing(0.05, top(x) + 0.12, 6, 0.03, 0.025, 0.02);
	},
	// --- ek yapılar
	kizkulesi(k) {
		k.color('#8a8170').ico(0.16, 0, -0.06, 0, 0.45);
		k.color('#f4efe4').box(0.16, 0.12, 0.12, -0.02, 0.0, 0);
		k.color('#f4efe4').cyl(0.05, 0.055, 0.26, 8, 0.05, 0.0, 0);
		k.color(LEAD2).cone(0.06, 0.12, 8, 0.05, 0.26, 0);
		k.color(LEAD).smooth(true).dome(0.045, 6, -0.05, 0.12, 0, 0.8).smooth(false);
		k.color(GOLD).cyl(0.004, 0.004, 0.04, 3, 0.05, 0.38, 0);
	},
	kopru(k) {
		// iki yakada pilon, aralarında tabliye ve ana kablo
		const L = 0.95;
		k.color('#d7dadf');
		for (const x of [-L / 2, L / 2]) {
			k.box(0.035, 0.5, 0.025, x, -0.05, -0.05).box(0.035, 0.5, 0.025, x, -0.05, 0.05).box(0.04, 0.03, 0.13, x, 0.38, 0);
		}
		k.color('#c9473a').box(L + 0.3, 0.025, 0.1, 0, 0.12, 0);
		k.color('#9aa3ad');
		const n = 12;
		for (const z of [-0.05, 0.05])
			for (let i = 0; i < n; i++) {
				const x0 = -L / 2 + (i / n) * L;
				const x1 = -L / 2 + ((i + 1) / n) * L;
				const f = (x) => 0.43 - 0.28 * (1 - ((2 * x) / L) ** 2);
				const y0 = f(x0);
				const y1 = f(x1);
				k.push().move((x0 + x1) / 2, (y0 + y1) / 2, z).rot(0, 0, Math.atan2(y1 - y0, x1 - x0));
				k.box(Math.hypot(x1 - x0, y1 - y0) + 0.004, 0.008, 0.008, 0, -0.004, 0);
				k.pop();
			}
	},
	kizkalesi(k) {
		k.color('#8b8373').ico(0.32, 0, -0.1, 0, 0.35);
		const S = '#d8c7a3';
		k.color(S).box(0.34, 0.16, 0.24, 0, 0.0, 0);
		k.merlons(-0.17, 0.12, 0.17, 0.12, 0.16, 0.03, 0.03, 0.02, 0.025).merlons(-0.17, -0.12, 0.17, -0.12, 0.16, 0.03, 0.03, 0.02, 0.025);
		for (const [x, z] of [[-0.17, 0.12], [0.17, 0.12], [0.17, -0.12], [-0.17, -0.12]]) k.color(S).cyl(0.04, 0.045, 0.22, 7, x, 0, z).merlonRing(0.04, 0.22, 5, 0.03, 0.025, 0.02);
		k.color(S).box(0.1, 0.28, 0.1, 0.05, 0, -0.03);
	},
	bodrum(k) {
		plinth(k, 0.45, '#9b9381', 0.3);
		const S = '#cdb894';
		k.color(S).box(0.5, 0.14, 0.4, 0, 0.0, 0);
		k.merlons(-0.25, 0.2, 0.25, 0.2, 0.14, 0.03, 0.035, 0.025, 0.03);
		for (const [x, z, h] of [[-0.12, -0.05, 0.36], [0.12, 0.02, 0.3], [0.2, -0.15, 0.26]]) {
			k.color(S).box(0.1, h, 0.1, x, 0.0, z);
			k.merlons(x - 0.05, z + 0.05, x + 0.05, z + 0.05, h, 0.03, 0.025, 0.02, 0.02);
		}
		k.color('#c8473f').box(0.004, 0.08, 0.004, -0.12, 0.36, -0.05);
		k.color('#c8473f').box(0.06, 0.035, 0.003, -0.09, 0.42, -0.05);
	},
	ciftemin(k) {
		plinth(k, 0.4, '#a99f8b', 0.3);
		const S = '#c7a27b';
		k.color('#d4b48d').box(0.56, 0.2, 0.36, 0, 0, -0.06);
		k.color('#dcbf98').box(0.24, 0.3, 0.06, 0, 0, 0.14);
		k.color('#5a3a26').slab(archShape(0.1, 0.18), 0.02, 0, 0.0, 0.175);
		k.color('#2a9d8f').box(0.25, 0.02, 0.065, 0, 0.26, 0.14);
		for (const x of [-0.1, 0.1]) {
			k.color(S).cyl(0.035, 0.04, 0.3, 10, x, 0.3, 0.14);
			k.color('#2a9d8f').cyl(0.036, 0.036, 0.03, 10, x, 0.45, 0.14);
			k.color(S).cyl(0.03, 0.035, 0.12, 10, x, 0.48, 0.14);
		}
		k.color(LEAD).smooth(true).dome(0.09, 8, 0, 0.2, -0.18, 1.1).smooth(false);
	},
	saatkulesi(k) {
		plinth(k, 0.3, '#c9bfa9', 0.28);
		const S = '#efe0c4';
		k.color('#d7c7a9').cyl(0.12, 0.14, 0.04, 8);
		k.color(S).cyl(0.07, 0.08, 0.22, 8, 0, 0.04);
		k.color('#d9b98e').cyl(0.085, 0.085, 0.025, 8, 0, 0.26);
		k.color(S).cyl(0.055, 0.065, 0.14, 8, 0, 0.285);
		k.color('#ffffff').cyl(0.058, 0.058, 0.05, 8, 0, 0.34);
		k.color(S).cyl(0.035, 0.05, 0.1, 8, 0, 0.425);
		k.color(LEAD).cone(0.04, 0.08, 8, 0, 0.525);
		k.color(GOLD).sphere(0.012, 4, 0, 0.61);
		// dört çeşme
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
			k.color(S).box(0.035, 0.06, 0.035, Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.12, -a);
		}
	},
};

// [yapı, boylam, enlem, ölçek, dönüş, il kimliği (plaka), merkezden en az uzaklık]
const SITES = [
	['galata', 28.93, 41.12, 1.75, 0, 34],
	['ayasofya', 28.78, 41.03, 1.68, 0.1, 34],
	['kizkulesi', 29.004, 41.021, 1.0, 0, 34, 0, 'sea'],
	['kopru', 29.036, 41.052, 1.4, 0.15, 34, 0, 'sea'],
	['anitkabir', 32.84, 39.93, 1.82, 0, 6],
	['peri', 34.83, 38.64, 1.75, 0, 50],
	['nemrut', 38.74, 37.98, 1.89, 0, 2],
	['pamukkale', 29.12, 37.92, 1.89, 0, 20],
	['sumela', 39.66, 40.69, 1.82, 0, 61],
	['uzungol', 40.29, 40.62, 1.68, 0, 61],
	['celsus', 27.34, 37.94, 1.89, 0, 35],
	['saatkulesi', 27.13, 38.42, 1.54, 0, 35],
	['mevlana', 32.5, 37.87, 1.89, 0, 42],
	['selimiye', 26.56, 41.68, 1.82, 0, 22],
	['ishakpasa', 44.13, 39.52, 1.89, 0, 4],
	['safranbolu', 32.69, 41.25, 1.75, 0, 78],
	['gobekli', 38.92, 37.22, 1.89, 0, 63],
	['truva', 26.24, 39.96, 1.89, -0.3, 17],
	['aspendos', 31.17, 36.94, 1.82, 0, 7],
	['vankalesi', 43.34, 38.5, 1.82, 0.2, 65],
	['kizkalesi', 34.15, 36.43, 1.54, 0, 33, 0, 'sea'],
	['bodrum', 27.43, 37.04, 1.61, 0, 48],
	['ciftemin', 41.28, 39.9, 1.82, 0, 25],
];

const lonlat = (board, lon, lat) => {
	const m = board.data.meta;
	const c = Math.cos((m.lat0 * Math.PI) / 180);
	return [(lon - m.lon0) * c * m.K, -(lat - m.lat0) * m.K];
};

export class Landmarks {
	constructor(G, tier, board) {
		const kit = new Kit();
		kit.seg = tier.id === 0 ? 0.7 : 1;
		let s = 7;
		const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		this.sites = [];
		for (const [kind, lon, lat, sc, ry, plate, , where] of SITES) {
			const p = board.byId.get(plate);
			if (!p) continue;
			let [x, z] = lonlat(board, lon, lat);
			// il merkezine (kale + yazı) çok yakınsa uzaklaştır
			if (where !== 'sea') {
				const minD = 1.9;
				const dx = x - p.x;
				const dz = z - p.z;
				const d = Math.hypot(dx, dz);
				if (d < minD) {
					const a = d > 1e-3 ? Math.atan2(dz, dx) : 0;
					let ok = false;
					for (let t = 0; t < 12 && !ok; t++) {
						const aa = a + (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.5;
						const nx = p.x + Math.cos(aa) * minD;
						const nz = p.z + Math.sin(aa) * minD;
						if (board.pick(nx, nz) === p.index) {
							x = nx;
							z = nz;
							ok = true;
						}
					}
				}
			}
			const y = where === 'sea' ? 0.0 : board.heightAt(x, z);
			kit.setTag(p.index);
			kit.push().move(x, y, z).rot(0, ry, 0).scale(sc);
			B[kind](kit, R);
			kit.pop();
			this.sites.push({ kind, index: p.index, x, y, z });
		}
		kit.setTag(0);
		const geo = kit.build();
		this.count = this.sites.length;
		this.triangles = kit.count / 3;
		const taps = String(tier.shadowTaps);
		const uniforms = { ...G, uState: { value: board.stateTex }, uSelOn: board.uSelOn, uPLift: { value: board.liftUnit }, uPSel: { value: board.selLiftUnit } };
		this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('__TAPS__', taps), uniforms, side: THREE.DoubleSide }));
		this.mesh.frustumCulled = false;
		this.mesh.matrixAutoUpdate = false;
		this.caster = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, uniforms, side: THREE.DoubleSide }));
		this.caster.frustumCulled = false;
		this.caster.matrixAutoUpdate = false;
	}
}
